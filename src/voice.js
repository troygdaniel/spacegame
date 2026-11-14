// ---------- Ship voice (optional): the ship computer speaks key events through Deepgram Aura text-to-speech ----------
// OFF unless the player pastes their OWN Deepgram key (Settings > Keys, or V on the title screen). No key = the game is
// exactly as before and nothing is sent anywhere. The key lives only in this browser's localStorage, never in the save file,
// never in the repo, never logged or put in a message, and goes only to api.deepgram.com. See docs/VOICE.md.
// Events come from watching the game once a frame (voiceInstall, called from main.js), so the scenes have no voice code.
const VOICE_STORE = 'longhaul.voice.key', VOICE_FLAG = 'longhaul.voice.on', VOICE_PICK = 'longhaul.voice.model';
const VOICE_URL = 'https://api.deepgram.com/v1/speak', VOICE_MODEL = 'aura-athena-en'; // athena: a calm female voice, the ship computer's until you choose another
// the voices the ship computer can have (Settings > Sound): [Aura name, shown name, a few words]
const VOICE_CHOICES = [['aura-athena-en', 'ATHENA', 'calm, the default'], ['aura-asteria-en', 'ASTERIA', 'bright and clear'], ['aura-luna-en', 'LUNA', 'warm'], ['aura-orion-en', 'ORION', 'steady, male'], ['aura-helios-en', 'HELIOS', 'deep, male']];
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
// ---------- lines a content pack adds (content/voice/*.md, src/contentadd.js) ----------
// VOICE_ADDED: file id -> { event, lines, replace }. The ship says one of its built-in line and the added ones for that event at random, and never
// the one it said last for the event. A file with "replace: yes" drops the built-in line for its event. Events: docs/MODDING.md section 6.7.
const VOICE_ADDED = new Map(), VOICE_LAST = {};
function voiceLine(event, builtin) {
  let pool = [], replace = false;
  VOICE_ADDED.forEach(v => { if (v.event === event) { replace = replace || v.replace; v.lines.forEach(l => pool.push(l)); } });
  if (builtin && !replace) pool.unshift(builtin);
  if (!pool.length) return builtin || '';
  const fresh = pool.length > 1 ? pool.filter(l => l !== VOICE_LAST[event]) : pool;
  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  VOICE_LAST[event] = pick;
  try { return typeof contentFill === 'function' ? contentFill(pick) : pick; } catch (e) { return pick; } // a {placeholder} the game cannot fill stays as written
}
const VOICE = { key: '', on: true, voice: VOICE_MODEL, bad: false, playing: false, queue: [], cache: new Map(), fails: 0, pauseUntil: 0, said: {}, calls: 0 };

// ---------- the key (localStorage is optional: every call is wrapped) ----------
function voiceLoad() {
  try {
    VOICE.key = (localStorage.getItem(VOICE_STORE) || '').trim(); VOICE.on = localStorage.getItem(VOICE_FLAG) !== '0';
    const pick = localStorage.getItem(VOICE_PICK); VOICE.voice = VOICE_CHOICES.some(c => c[0] === pick) ? pick : VOICE_MODEL;
  } catch (e) { /* storage is optional */ }
  VOICE.bad = false;
}
// the ship computer's voice: one of VOICE_CHOICES; a new choice drops the cached lines, which were spoken in the old one
function voiceSetVoice(m) {
  if (!VOICE_CHOICES.some(c => c[0] === m)) return false;
  VOICE.voice = m; VOICE.cache.clear();
  try { localStorage.setItem(VOICE_PICK, m); } catch (e) { /* storage is optional */ }
  return true;
}
const voiceShip = () => VOICE.voice;
function voiceSetKey(k) {
  VOICE.key = String(k || '').trim(); VOICE.bad = false; VOICE.fails = 0; VOICE.pauseUntil = 0;
  try { if (VOICE.key) localStorage.setItem(VOICE_STORE, VOICE.key); else localStorage.removeItem(VOICE_STORE); } catch (e) { /* storage is optional */ }
}
function voiceSetOn(on) { VOICE.on = !!on; try { localStorage.setItem(VOICE_FLAG, on ? '1' : '0'); } catch (e) { /* storage is optional */ } }
function voiceUsable() { return !!VOICE.key && VOICE.on && !VOICE.bad && !G.muted && G.volume > 0 && performance.now() >= VOICE.pauseUntil; }
function voiceStatus() { return !VOICE.key ? 'NO KEY' : VOICE.bad ? 'KEY REJECTED' : VOICE.on ? 'ON' : 'OFF'; }

// ---------- speaking ----------
// One line at a time, whoever says it. A line that arrives while another plays is dropped, unless it is a warning or a character's
// reply (prio 1 or 2), which waits in a queue of two for up to 6 seconds. The same words in the same voice cannot repeat within 8 seconds.
// model is an Aura voice name: the ship computer uses voiceShip(), each bar character has their own (the voice field of NPCS in
// shop.js, docs/NPC-CHAT.md section 2). onStart runs when the audio begins to play.
const VOICE_NAME = /^aura(-2)?-[a-z]{3,12}-en$/; // the name goes into a URL, so anything else falls back to the ship computer's voice
const voiceModelOf = m => (typeof m === 'string' && VOICE_NAME.test(m) ? m : voiceShip());
function voiceSay(text, prio = 0, model, onStart) {
  if (!voiceUsable()) return false;
  const line = { text, voice: voiceModelOf(model), onStart, prio, at: performance.now() }, id = line.voice + '|' + text;
  if (VOICE.said[id] && line.at - VOICE.said[id] < 8000) return false;
  VOICE.said[id] = line.at;
  if (VOICE.playing) {
    if (prio > 0) { VOICE.queue.push(line); VOICE.queue.sort((a, b) => b.prio - a.prio); while (VOICE.queue.length > 2) VOICE.queue.pop(); return true; }
    return false;
  }
  voiceRun(line); return true;
}
// For a caller that shows the words along with the voice (the NPC chat): start(how) runs once. 'audio' when the voice begins, 'timeout' after
// 1.5 s if it has not arrived yet, 'silent' at once when there will be no voice (no key, off, muted, refused), so text never waits for nothing.
function voiceSayThen(text, prio, model, start) {
  let done = false, timer = null;
  const go = how => { if (done) return; done = true; clearTimeout(timer); try { start(how); } catch (e) { /* the caller's trouble must not stop the voice */ } };
  if (!voiceSay(text, prio == null ? 1 : prio, model, () => go('audio'))) { go('silent'); return false; }
  timer = setTimeout(() => go('timeout'), 1500);
  return true;
}
async function voiceRun(line) {
  VOICE.playing = true;
  try { const buf = await voiceBuffer(line.text, line.voice); if (buf && voiceUsable()) await voicePlay(buf, line.onStart); } catch (e) { /* the voice must never break the game */ }
  VOICE.playing = false;
  const now = performance.now(); let next = null;
  while (VOICE.queue.length && !next) { const q = VOICE.queue.shift(); if (now - q.at < 6000) next = q; }
  if (next && voiceUsable()) voiceRun(next);
}
// a line's audio: from the memory cache, or one call to Deepgram (the only network call in the game). Only the ship computer's lines are
// cached: they repeat. A character's reply is free text and is spoken once.
async function voiceBuffer(text, voice = voiceShip()) {
  const keep = voice === voiceShip();
  if (keep && VOICE.cache.has(text)) return VOICE.cache.get(text);
  if (!audioReady()) return null; // audio.js: the shared AudioContext
  VOICE.calls++;
  let res;
  try {
    res = await fetch(VOICE_URL + '?model=' + encodeURIComponent(voice) + '&encoding=mp3', {
      method: 'POST', headers: { Authorization: 'Token ' + VOICE.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    });
  } catch (e) { voiceFailed(); return null; }
  if (res.status === 401 || res.status === 402 || res.status === 403) { voiceRejected(); return null; }
  if (!res.ok) { voiceFailed(); return null; }
  const buf = await AC.decodeAudioData(await res.arrayBuffer());
  VOICE.fails = 0;
  if (keep) { VOICE.cache.set(text, buf); if (VOICE.cache.size > 40) VOICE.cache.delete(VOICE.cache.keys().next().value); }
  return buf;
}
function voicePlay(buf, onStart) { // through audio.js's master gain, so the volume and mute settings apply
  return new Promise(res => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    try {
      const src = AC.createBufferSource(); src.buffer = buf; src.connect(AUD.master || AC.destination); src.onended = fin;
      if (onStart) { try { onStart(); } catch (e) { /* the caller's trouble must not stop the voice */ } }
      src.start();
    } catch (e) { fin(); }
    setTimeout(fin, buf.duration * 1000 + 1500); // a suspended context never ends the line: do not wait forever
  });
}
function voiceFailed() { if (++VOICE.fails >= 3) { VOICE.fails = 0; VOICE.pauseUntil = performance.now() + 60000; } }
function voiceRejected() {
  const first = !VOICE.bad; VOICE.bad = true;
  const s = window.game && window.game.scene.getScenes(true).find(sc => GAMEPLAY.includes(sc.scene.key));
  if (first && s) toast(s, 'Ship voice: Deepgram rejected the key. Check it in Pause > Settings > Keys.', '#ff4d6d');
}
// the Settings screen's Test and Hear it buttons: speak one line (in this voice, the ship's by default) and say how it went. The player's
// own call, on their own key, only when they press the button.
async function voiceTest(voice) {
  if (!VOICE.key) return 'Paste a key first.';
  if (G.muted || G.volume <= 0) return 'Sound is muted. Turn it on first (M, or Volume in Settings).';
  VOICE.bad = false; VOICE.pauseUntil = 0;
  try {
    const buf = await voiceBuffer(VOICE_LINES.test, voice || voiceShip());
    if (!buf) return VOICE.bad ? 'Deepgram rejected this key.' : 'Could not reach Deepgram.';
    await voicePlay(buf); return 'The voice works.';
  } catch (e) { return 'Could not play the voice.'; }
}

// ---------- the events ----------
function voiceInstall(game) {
  voiceLoad();
  const L = VOICE_LINES, st = { hullLow: false, fuelLow: false, hostile: false, hostileAt: -1e9, mission: G.mission, credits: G.credits, dead: false, ending: !!G.endingSeen };
  const wire = () => game.scene.scenes.forEach(sc => {
    const k = sc.scene.key;
    if (k === 'Space') sc.events.on('create', () => { if (sc.from === 'station') voiceSay(voiceLine('launch-clear', L.launch), 1); });
    else if (k === 'Station') sc.events.on('create', () => { if (sc.arrive) voiceSay(voiceLine('docked', L.dock), 1); });
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
    if (f < 0.3 && !st.hullLow) { st.hullLow = true; if (!sp.dead) voiceSay(voiceLine('hull-low', L.hull), 2); } else if (f > 0.5) st.hullLow = false;
    let near = 1e9; sp.enemies.getChildren().forEach(e => { if (e.active) near = Math.min(near, Phaser.Math.Distance.Between(e.x, e.y, sp.ship.x, sp.ship.y)); });
    if (near < 750 && !st.hostile && now - st.hostileAt > 45000) { st.hostile = true; st.hostileAt = now; voiceSay(voiceLine('pirates-detected', L.hostile), 1); } else if (near > 1300) st.hostile = false;
    if (sp.dead && !st.dead) voiceSay(L.lost, 2);
    const fs = typeof fuelState === 'function' ? fuelState() : 'ok'; // src/fuel.js
    if (fs !== 'ok' && !st.fuelLow) { st.fuelLow = true; voiceSay(voiceLine('fuel-low', 'Warning. Fuel reserves low.'), 1); } else if (fs === 'ok' && fuelFrac() > 0.4) st.fuelLow = false;
    st.dead = !!sp.dead;
  } else st.dead = false;
  const dc = G.credits - st.credits;
  if (dc >= 100) voiceSay(voiceLine('credits-earned', G.mission === 'none' && st.mission !== 'none' ? 'Mission complete. ' + Math.round(dc) + ' credits received.' : 'Payment received. ' + Math.round(dc) + ' credits.'), 1);
  if (G.mission === 'accepted' && (st.mission === 'none' || st.mission === 'failed') && atStation && (L.accept[G.missionId] || missionDef())) voiceSay(voiceLine('mission-accepted', L.accept[G.missionId] || 'Call accepted: ' + missionDef().title + '.'), 1);
  if (G.mission === 'failed' && st.mission !== 'failed' && st.mission !== 'none') voiceSay(L.failed, 1);
  if (G.endingSeen && !st.ending) voiceSay(L.ending, 1);
  st.mission = G.mission; st.credits = G.credits; st.ending = !!G.endingSeen;
}

// The setup screen is Settings (src/settings.js): V on the title and the old Pause row open it at the Deepgram key.
function voiceOpenSetup(scene) { settingsOpen(scene, 'keys', 'deepgram'); } // scene: the scene to pause and come back to (Pause or Title)
