// ---------- Ship voice (optional): the ship computer speaks key events through Deepgram Aura text-to-speech ----------
// OFF unless the player pastes their OWN Deepgram key (Pause > Ship voice, or V on the title screen). No key = the game is
// exactly as before and nothing is sent anywhere. The key lives only in this browser's localStorage, never in the save file,
// never in the repo, never logged or put in a message, and goes only to api.deepgram.com. See docs/VOICE.md.
// Events come from watching the game once a frame (voiceInstall, called from main.js), so the scenes have no voice code.
const VOICE_STORE = 'longhaul.voice.key', VOICE_FLAG = 'longhaul.voice.on';
const VOICE_URL = 'https://api.deepgram.com/v1/speak', VOICE_MODEL = 'aura-athena-en'; // athena: a calm female voice
const VOICE_LINES = {
  launch: 'Launch clear. All systems nominal.',
  hull: 'Warning. Hull integrity critical.',
  hostile: 'Hostile contacts detected. Weapons ready.',
  dock: 'Docking complete. Welcome to Halcyon Station.',
  land: 'Touchdown confirmed.',
  accept: {
    rescue: 'Rescue call accepted. Proceed to Kepler-4b.',
    escort: 'Escort contract accepted. Stay close to the MULE.',
    patrol: 'Patrol accepted. Five wanted pirates on the board.',
    bounty: 'Bounty accepted. The Reaver is south-west of Kepler-4b.'
  },
  failed: 'Mission failed.',
  lost: 'Ship lost. Insurance has been charged.',
  ending: 'Two thousand credits earned. Well flown, pilot.',
  test: 'Ship voice online.'
};
const VOICE = { key: '', on: true, bad: false, playing: false, queue: [], cache: new Map(), fails: 0, pauseUntil: 0, said: {}, calls: 0 };

// ---------- the key (localStorage is optional: every call is wrapped) ----------
function voiceLoad() {
  try { VOICE.key = (localStorage.getItem(VOICE_STORE) || '').trim(); VOICE.on = localStorage.getItem(VOICE_FLAG) !== '0'; } catch (e) { /* storage is optional */ }
  VOICE.bad = false;
}
function voiceSetKey(k) {
  VOICE.key = String(k || '').trim(); VOICE.bad = false; VOICE.fails = 0; VOICE.pauseUntil = 0;
  try { if (VOICE.key) localStorage.setItem(VOICE_STORE, VOICE.key); else localStorage.removeItem(VOICE_STORE); } catch (e) { /* storage is optional */ }
}
function voiceSetOn(on) { VOICE.on = !!on; try { localStorage.setItem(VOICE_FLAG, on ? '1' : '0'); } catch (e) { /* storage is optional */ } }
function voiceUsable() { return !!VOICE.key && VOICE.on && !VOICE.bad && !G.muted && G.volume > 0 && performance.now() >= VOICE.pauseUntil; }
function voiceStatus() { return !VOICE.key ? 'NO KEY' : VOICE.bad ? 'KEY REJECTED' : VOICE.on ? 'ON' : 'OFF'; }

// ---------- speaking ----------
// One line at a time. A line that arrives while another plays is dropped, unless it is a warning (prio 1 or 2), which waits in a
// queue of two for up to 6 seconds. The same line cannot repeat within 8 seconds.
function voiceSay(text, prio = 0) {
  if (!voiceUsable()) return false;
  const now = performance.now();
  if (VOICE.said[text] && now - VOICE.said[text] < 8000) return false;
  VOICE.said[text] = now;
  if (VOICE.playing) {
    if (prio > 0) { VOICE.queue.push({ text, at: now, prio }); VOICE.queue.sort((a, b) => b.prio - a.prio); while (VOICE.queue.length > 2) VOICE.queue.pop(); return true; }
    return false;
  }
  voiceRun(text); return true;
}
async function voiceRun(text) {
  VOICE.playing = true;
  try { const buf = await voiceBuffer(text); if (buf && voiceUsable()) await voicePlay(buf); } catch (e) { /* the voice must never break the game */ }
  VOICE.playing = false;
  const now = performance.now(); let next = null;
  while (VOICE.queue.length && !next) { const q = VOICE.queue.shift(); if (now - q.at < 6000) next = q; }
  if (next && voiceUsable()) voiceRun(next.text);
}
// a line's audio: from the memory cache, or one call to Deepgram (the only network call in the game)
async function voiceBuffer(text) {
  if (VOICE.cache.has(text)) return VOICE.cache.get(text);
  if (!audioReady()) return null; // audio.js: the shared AudioContext
  VOICE.calls++;
  let res;
  try {
    res = await fetch(VOICE_URL + '?model=' + VOICE_MODEL + '&encoding=mp3', {
      method: 'POST', headers: { Authorization: 'Token ' + VOICE.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    });
  } catch (e) { voiceFailed(); return null; }
  if (res.status === 401 || res.status === 402 || res.status === 403) { voiceRejected(); return null; }
  if (!res.ok) { voiceFailed(); return null; }
  const buf = await AC.decodeAudioData(await res.arrayBuffer());
  VOICE.fails = 0; VOICE.cache.set(text, buf);
  if (VOICE.cache.size > 40) VOICE.cache.delete(VOICE.cache.keys().next().value);
  return buf;
}
function voicePlay(buf) { // through audio.js's master gain, so the volume and mute settings apply
  return new Promise(res => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    try { const src = AC.createBufferSource(); src.buffer = buf; src.connect(AUD.master || AC.destination); src.onended = fin; src.start(); } catch (e) { fin(); }
    setTimeout(fin, buf.duration * 1000 + 1500); // a suspended context never ends the line: do not wait forever
  });
}
function voiceFailed() { if (++VOICE.fails >= 3) { VOICE.fails = 0; VOICE.pauseUntil = performance.now() + 60000; } }
function voiceRejected() {
  const first = !VOICE.bad; VOICE.bad = true;
  const s = window.game && window.game.scene.getScenes(true).find(sc => GAMEPLAY.includes(sc.scene.key));
  if (first && s) toast(s, 'Ship voice: Deepgram rejected the key. Check it in Pause > Ship voice.', '#ff4d6d');
}
// the setup panel's Test button: speaks one line and says how it went (the player's own call, on their own key)
async function voiceTest() {
  if (!VOICE.key) return 'Paste a key first.';
  if (G.muted || G.volume <= 0) return 'Sound is muted. Turn it on first (M, or Volume in the pause menu).';
  VOICE.bad = false; VOICE.pauseUntil = 0;
  try {
    const buf = await voiceBuffer(VOICE_LINES.test);
    if (!buf) return VOICE.bad ? 'Deepgram rejected this key.' : 'Could not reach Deepgram.';
    await voicePlay(buf); return 'The voice works.';
  } catch (e) { return 'Could not play the voice.'; }
}

// ---------- the events ----------
function voiceInstall(game) {
  voiceLoad();
  const L = VOICE_LINES, st = { hullLow: false, hostile: false, hostileAt: -1e9, mission: G.mission, credits: G.credits, dead: false, ending: !!G.endingSeen };
  const wire = () => game.scene.scenes.forEach(sc => {
    const k = sc.scene.key;
    if (k === 'Space') sc.events.on('create', () => { if (sc.from === 'station') voiceSay(L.launch, 1); });
    else if (k === 'Station') sc.events.on('create', () => { if (sc.arrive) voiceSay(L.dock, 1); });
    else if (k === 'Surface') sc.events.on('create', () => voiceSay(L.land, 0));
  });
  if (game.scene.scenes.length) wire(); else game.events.once('ready', wire);
  game.events.on(Phaser.Core.Events.POST_STEP, time => voicePoll(game, st, performance.now()));
}
function voicePoll(game, st, now) {
  const L = VOICE_LINES, sp = game.scene.getScene('Space'), st2 = game.scene.getScene('Station');
  const inSpace = !!(sp && sp.sys.isActive() && sp.ship && sp.enemies), atStation = !!(st2 && st2.sys.isActive());
  if (inSpace) {
    const f = G.hull / Math.max(1, G.maxHull);
    if (f < 0.3 && !st.hullLow) { st.hullLow = true; if (!sp.dead) voiceSay(L.hull, 2); } else if (f > 0.5) st.hullLow = false;
    let near = 1e9; sp.enemies.getChildren().forEach(e => { if (e.active) near = Math.min(near, Phaser.Math.Distance.Between(e.x, e.y, sp.ship.x, sp.ship.y)); });
    if (near < 750 && !st.hostile && now - st.hostileAt > 45000) { st.hostile = true; st.hostileAt = now; voiceSay(L.hostile, 1); } else if (near > 1300) st.hostile = false;
    if (sp.dead && !st.dead) voiceSay(L.lost, 2);
    st.dead = !!sp.dead;
  } else st.dead = false;
  const dc = G.credits - st.credits;
  if (dc >= 100) voiceSay(G.mission === 'none' && st.mission !== 'none' ? 'Mission complete. ' + Math.round(dc) + ' credits received.' : 'Payment received. ' + Math.round(dc) + ' credits.', 1);
  if (G.mission === 'accepted' && (st.mission === 'none' || st.mission === 'failed') && atStation && L.accept[G.missionId]) voiceSay(L.accept[G.missionId], 1);
  if (G.mission === 'failed' && st.mission !== 'failed' && st.mission !== 'none') voiceSay(L.failed, 1);
  if (G.endingSeen && !st.ending) voiceSay(L.ending, 1);
  st.mission = G.mission; st.credits = G.credits; st.ending = !!G.endingSeen;
}

// ---------- the setup panel: paste the key, test it, switch the voice on or off ----------
// Opened from the pause menu (meta.js) and from V on the title screen. The key goes into a real HTML input (so paste works) laid over the canvas.
class VoiceSetup extends Phaser.Scene {
  constructor() { super('VoiceSetup'); }
  init(d) { this.from = (d && d.from) || 'Title'; this.closing = false; }
  create() {
    const cx = W / 2, cy = H / 2;
    this.ui = panel(this, { w: 780, h: 510, title: 'SHIP VOICE  -  OPTIONAL', dim: true, depth: 0 });
    const box = this.ui.box, add = o => { box.add(o); return o; };
    const txt = (x, y, s, size, color, o = {}) => add(this.add.text(x, y, s, uiFont(size, color, o.style)).setOrigin(o.ox || 0, o.oy || 0));
    txt(-360, -208, 'The ship computer speaks the key moments of a run in a calm voice: launch, hostiles, hull warnings, docking, missions and payments.', 16, '#cfefff', { style: { wordWrap: { width: 720 }, lineSpacing: 4 } });
    const g = add(this.add.graphics());
    g.fillStyle(0x2a1a06, 0.9); g.fillRect(-360, -142, 720, 112); g.lineStyle(2, AMBER, 1); g.strokeRect(-360, -142, 720, 112); g.fillStyle(AMBER, 1); g.fillRect(-360, -142, 5, 112);
    txt(-342, -134, 'THIS USES YOUR OWN DEEPGRAM ACCOUNT AND MAY COST YOU MONEY', 16, '#ffd37a', { style: { fontStyle: 'bold' } });
    txt(-342, -108, 'Each spoken line is sent to api.deepgram.com together with your key. Your key is kept in this browser only: never in the game files, never anywhere else. With no key the game stays silent, exactly as before.', 15, '#ffe9c0', { style: { wordWrap: { width: 690 }, lineSpacing: 4 } });
    txt(-360, -10, 'DEEPGRAM API KEY', 13, '#5b7a92');
    this.status = txt(0, 112, '', 16, '#9fe9ff', { ox: 0.5 });
    this.btns = [];
    const btn = (label, x, fn) => {
      const w = 176, bg = add(this.add.rectangle(x, 160, w, 40, 0x0a1b2c, 1).setStrokeStyle(2, CYAN, 0.9).setInteractive({ useHandCursor: true }));
      const t = txt(x, 160, label, 16, '#9fe9ff', { ox: 0.5, oy: 0.5 });
      bg.on('pointerover', () => bg.setFillStyle(0x10283d)); bg.on('pointerout', () => bg.setFillStyle(0x0a1b2c)); bg.on('pointerdown', fn);
      this.btns.push({ bg, t }); return t;
    };
    btn('Save key', -276, () => this.saveKey());
    btn('Test voice', -92, () => this.test());
    this.onoff = btn('', 92, () => { voiceSetOn(!VOICE.on); this.refresh(); });
    btn('Remove key', 276, () => { voiceSetKey(''); this.input.value = ''; this.refresh('Key removed from this browser.'); });
    this.ui.setHints([['Enter', 'Save key'], ['Esc', 'Back']]);

    // the real text box
    const el = this.el = document.createElement('input');
    el.type = 'password'; el.placeholder = 'paste your Deepgram key here'; el.autocomplete = 'off'; el.spellcheck = false; el.maxLength = 200;
    Object.assign(el.style, { position: 'fixed', zIndex: '20', boxSizing: 'border-box', background: '#04101c', color: '#ffd37a', border: '1px solid #ffb454', outline: 'none', fontFamily: 'monospace', padding: '0 10px' });
    ['keydown', 'keyup', 'keypress'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation())); // so Phaser and the M / Esc hooks do not see the typing
    el.addEventListener('keydown', e => { if (e.key === 'Enter') this.saveKey(); else if (e.key === 'Escape') this.close(); });
    document.body.appendChild(el);
    this.events.once('shutdown', () => this.dropInput());
    this.k = this.input.keyboard.addKeys('ESC');
    this.born = performance.now();
    this.refresh(VOICE.key ? 'A key is saved in this browser.' : 'No key yet: the game is silent.');
    setTimeout(() => { try { el.focus(); } catch (e) { /* focus is a nicety */ } }, 50);
  }
  refresh(msg) {
    this.ui.tagText.setText(voiceStatus());
    this.onoff.setText(VOICE.on ? 'Turn voice off' : 'Turn voice on');
    if (msg !== undefined) this.status.setText(msg).setColor('#9fe9ff');
  }
  saveKey() {
    const v = this.el.value.trim();
    if (!v) { this.refresh(VOICE.key ? 'The saved key is unchanged.' : 'Paste a key first.'); return; }
    if (v.length < 16 || /\s/.test(v)) { this.refresh('That does not look like a Deepgram key.'); return; }
    voiceSetKey(v); voiceSetOn(true); this.el.value = ''; this.refresh('Key saved in this browser. Press Test voice to hear it.');
  }
  async test() {
    this.status.setText('Asking the ship to speak...').setColor('#ffd37a');
    const r = await voiceTest();
    if (this.scene.isActive()) { this.refresh(r); this.status.setColor(/works/.test(r) ? '#6dff9c' : '#ff4d6d'); }
  }
  dropInput() { if (this.el) { this.el.remove(); this.el = null; } }
  close() {
    if (this.closing) return; this.closing = true; this.dropInput();
    const from = this.from, back = this.scene.get(from);
    if (back && back.k && back.k.ESC) Phaser.Input.Keyboard.JustDown(back.k.ESC); // clear the Esc that closed this, so the pause menu below does not take it too
    this.scene.stop(); this.scene.resume(from);
  }
  update() {
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.k.ESC) && performance.now() - this.born > 200) { this.close(); return; }
    if (!this.el) return;
    const r = this.game.canvas.getBoundingClientRect(), k = r.width / W, cx = W / 2, cy = H / 2; // the box follows the canvas when the window is resized
    Object.assign(this.el.style, { left: (r.left + (cx - 360) * k) + 'px', top: (r.top + (cy + 8) * k) + 'px', width: 720 * k + 'px', height: 40 * k + 'px', fontSize: 17 * k + 'px' });
  }
}

function voiceOpenSetup(scene) { // scene: the scene to pause and come back to (Pause or Title)
  if (scene.scene.manager.isActive('VoiceSetup')) return;
  scene.scene.pause(); scene.scene.launch('VoiceSetup', { from: scene.scene.key });
}
