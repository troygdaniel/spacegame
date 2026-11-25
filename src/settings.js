// ---------- Settings: one screen for sound, keys, controls, content and reset (card space-game-settings-screen) ----------
// It replaces the ship-voice panel, the NPC-chat panel, the Pause menu's Controls page and the content panel of the title screen. Reached from
// the Title (S) and from Pause (the Settings row); V, C and P on the Title still work and open the matching section:
//   V -> Keys, at the Deepgram key      C -> Keys, at the chat keys      P -> Content (when there is something to show)
// Sections (the rail on the left; up and down, W and S, or a click):
//   SOUND     the volume, mute, the ship voice on or off and its voice (src/voice.js), with a Hear it button
//   KEYS      one row each for Deepgram (voices), OpenAI and Anthropic (NPC chat): paste, Save, Test, Forget. A saved key shows its last four
//             characters and nothing else. Below: NPC chat on or off, the provider, the model. Keys stay in this browser (localStorage), never
//             in the save, never in the game files; the cost note says so in plain words
//   LISTEN    talk to the ship's computer (src/listen.js): the on/off switch, the key to hold, what is missing, the session's minutes of listening, a
//             Test microphone button (opens the microphone for an instant, sends nothing) and the one-line hint about `node tools/serve.mjs`
//   CONTROLS  every key of the game, from the one table in src/data_controls.js, a tab for each group
//   FLIGHT    the flight feel: Classic or Heavy (src/handling.js), one row; kept in this browser, not in the save
//   (the Campaign's battle pace had a GAME tab until card space-game-two-hands-keys: the Campaign flies at one fixed pace, Normal; there is no command time either: the battle never slows for a list, the map or a call)
//   CONTENT   which content pack is running and what it ignored (src/contentui.js builds the lines)
//   RESET     Reset game (erase the save and start again) and Forget all keys, each with a second press; and the PLAY LOG: ON or OFF, Download log, Forget log (src/playlog.js)
// Nothing here calls a service by itself. Test and Hear it are the only buttons that do, and only when the player presses them, on the key they
// pressed it in; tests/settings.mjs mocks fetch and checks that nothing else is called.
// The text boxes are real HTML inputs laid over the canvas (paste works; the typing never reaches Phaser or the window's M and Esc hooks), as the
// old panels did it. Opened with settingsOpen(scene, section, focus) from the scene to come back to; closed with Esc.

const SETTINGS = {
  w: 1120, h: 640, railW: 232,
  sections: [['sound', 'SOUND'], ['keys', 'KEYS'], ['listen', 'LISTEN'], ['controls', 'CONTROLS'], ['flight', 'FLIGHT'], ['content', 'CONTENT'], ['reset', 'RESET']],
  keys: { warnH: 78, top: 104, block: 96, linkDy: 64, bodyFoot: 44 }, // the Keys section: the note on top, the first field's centre, the height of a key's block, where its link row is, the footer under the body
  keyRows: [ // the three keys: where each is kept, what it is for, how to tell a wrong paste
    { id: 'deepgram', name: 'DEEPGRAM' }, // what each is for, its cost line and its address are content/text/ui.md's (keys.<id>.use, .cost, .url)
    { id: 'openai', name: 'OPENAI' },
    { id: 'anthropic', name: 'ANTHROPIC' }
  ],
  confirmMs: 4000,
  dim: 0.93 // the extra dim over the scene behind: with the panel's own 0.55 only a thirtieth of it is left (the title's key line sat half under the bottom edge)
};
// ---------- Controls: where the rows of a group sit (card space-game-settings-controls-overflow) ----------
// The body has room for eleven rows one under another (the first row's centre 106 px under the body's top, the last no lower than 474: the note
// "Left and right change the group." is at 500). FLIGHT has 22, so a group of more than eleven rows is set in columns of eleven, side by side, the
// text in the smaller size and wrapped to the column's width (two lines fit a row). The layout is a plain function so a Node test can measure it:
// tests/controlsfit.mjs checks that every group of the table, now and when a row is added, stays inside the body.
const SETTINGS_CONTROLS = { top: 106, last: 474, perCol: 11, pitchMax: 38, capGap: 5, textGap: 14, colGap: 16, size: 15, sizeCols: 13, ch: 0.6, capCh: 0.6 * 13, capMin: 24, capPad: 14, capH: 22, edge: 492 };
// the width of one key cap, as keyCap() (src/ui.js) makes it: its label at 13 px bold monospace plus 14 px, never under 24
const settingsCapW = k => Math.max(SETTINGS_CONTROLS.capMin, Math.ceil(String(k).length * SETTINGS_CONTROLS.capCh) + SETTINGS_CONTROLS.capPad);
// rows: the table's rows ({ k, t }); bw: the body's width. Returns { cols, pitch, size, items: [{ i, col, y, caps: [{ k, x, w }], x, wrap, lines, h }], fits, why }
// with every x from the body's left edge and every y from its top (the scene adds its bx and by)
function settingsControlsLayout(rows, bw) {
  const C = SETTINGS_CONTROLS, n = rows.length, cols = Math.max(1, Math.ceil(n / C.perCol)), per = Math.ceil(n / cols);
  const pitch = per > 1 ? Math.min(C.pitchMax, Math.floor((C.last - C.top) / (per - 1))) : C.pitchMax, size = cols > 1 ? C.sizeCols : C.size, ch = C.ch * size;
  const colW = bw / cols, items = []; let why = '';
  for (let c = 0; c < cols; c++) {
    const mine = rows.slice(c * per, (c + 1) * per), x0 = c * colW + 8;
    const caps = mine.map(r => { let x = x0; return r.k.map(k => { const w = settingsCapW(k), o = { k, x: x + w / 2, w }; x += w + C.capGap; return o; }); });
    const capsEnd = Math.max(...caps.map(cs => cs.length ? cs[cs.length - 1].x + cs[cs.length - 1].w / 2 : x0));
    const x = cols > 1 ? capsEnd + C.textGap : c * colW + 200, wrap = cols > 1 ? (c + 1) * colW - C.colGap - x : bw - 200 - 10; // one column: the old place for the words (200 px in)
    mine.forEach((r, j) => {
      const lines = Math.max(1, Math.ceil(String(r.t).length * ch / wrap)), h = Math.max(C.capH, lines * size * 1.2);
      items.push({ i: c * per + j, col: c, y: C.top + j * pitch, caps: caps[j], x, wrap, lines, h });
    });
  }
  const bad = items.find(it => it.lines > 2 || it.h > pitch - 2 || it.y + it.h / 2 > C.edge || it.caps.some(k => k.x + k.w / 2 > it.x - 4));
  if (bad) why = 'row ' + bad.i + ' (' + rows[bad.i].k.join(' ') + ') does not fit: ' + bad.lines + ' lines of ' + Math.round(bad.wrap) + ' px, row height ' + Math.round(bad.h) + ' of ' + pitch;
  return { cols, pitch, size, items, fits: !bad, why };
}
const settingsMask = k => (k ? '**** ' + String(k).slice(-4) : 'no key'); // a saved key is shown by its last four characters only

// ---------- Getting a key (card space-game-key-links) ----------
// Under each key's field: what it is for, that it is your own account and may cost money, a Get a key link to the provider's key page, the same address as
// text with Copy (a link out of a canvas can be blocked when the game is opened from a file), and the three steps. The words and the addresses are
// content/text/ui.md's (keys.<id>.use, .cost, .url, keys.steps), so a provider moving its page is a text edit and a reseal; nothing here names one.
// Nothing about the player is sent: the link is only the address, opened with noopener and noreferrer, and no key is ever read to make a line, a link
// or what Copy puts on the clipboard. The address is checked before it is offered: a text file (a pack) that points it anywhere but a plain https
// address with a real host name leaves the text on screen and no link.
function settingsKeyUrl(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 200 || /[\s\\<>"'`]/.test(raw) || !/^https:\/\//.test(raw)) return '';
  let u; try { u = new URL(raw); } catch (e) { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash) return '';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(u.hostname) || /^[0-9.]+$/.test(u.hostname)) return ''; // a name with a dot: no localhost, no bare number
  return u.href;
}
function settingsKeyInfo(id) {
  const row = SETTINGS.keyRows.find(r => r.id === id); if (!row) return null;
  const line = f => { const k = 'keys.' + id + '.' + f, v = uiText(k); return v === k ? '' : String(v); }, raw = line('url'), url = settingsKeyUrl(raw), steps = uiText('keys.steps');
  return { id, name: row.name, use: line('use'), cost: line('cost'), steps: steps === 'keys.steps' ? '' : String(steps), url: url || raw, urlOk: !!url };
}
// open the provider's key page in a new tab; open is window.open unless a test gives one. { ok, say }: say is the line to show
function settingsOpenKey(id, open) {
  const i = settingsKeyInfo(id);
  if (!i || !i.urlOk) return { ok: false, say: 'There is no address to open for this key. Look for the provider\'s key page.' };
  open = open || (typeof window !== 'undefined' && typeof window.open === 'function' ? window.open.bind(window) : null);
  if (!open) return { ok: false, say: 'This page cannot open a link. Copy the address and paste it into your browser.' };
  try { open(i.url, '_blank', 'noopener,noreferrer'); } catch (e) { return { ok: false, say: 'The link could not open. Copy the address and paste it into your browser.' }; }
  return { ok: true, url: i.url, say: 'Opening ' + new URL(i.url).hostname + ' in a new tab. If nothing opens, press Copy and paste the address into your browser.' };
}
// put the address (and only that) on the clipboard; nav is navigator unless a test gives one. Never throws
async function settingsCopyKey(id, nav) {
  const i = settingsKeyInfo(id);
  if (!i || !i.urlOk) return { ok: false, say: 'There is no address to copy.' };
  nav = nav || (typeof navigator !== 'undefined' ? navigator : null);
  try { if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') { await nav.clipboard.writeText(i.url); return { ok: true, say: 'Address copied: ' + i.url }; } } catch (e) { /* refused: the same answer as no clipboard */ }
  return { ok: false, say: 'Copy did not work here. The address is on the screen: ' + i.url };
}
// where everything in the Keys section sits, in px down the body: three blocks (the field, what it is for, the cost, the link row), then the chat rows
function settingsKeysLayout() {
  const K = SETTINGS.keys, rows = SETTINGS.keyRows.map((r, i) => { const y = K.top + i * K.block; return { id: r.id, y, use: y + 26, cost: y + 44, link: y + K.linkDy }; });
  const line = rows[rows.length - 1].link + 21, chat = line + 28, model = chat + 44, status = model + 34, bottom = status + 38;
  return { rows, line, chat, model, status, bottom, bodyH: SETTINGS.h - 58 - K.bodyFoot - 8 };
}

class Settings extends Phaser.Scene {
  constructor() { super('Settings'); }
  init(d) {
    this.from = (d && d.from) || 'Title'; this.closing = false; this.born = performance.now();
    this.section = SETTINGS.sections.some(s => s[0] === (d && d.section)) ? d.section : 'sound';
    this.focusKey = (d && d.focus) || ''; this.armed = null; this.ctab = (this.ctab && controlsGroup(this.ctab)) ? this.ctab : 'station';
    this.inputs = {}; this.slots = {};
  }

  create() {
    const { w, h } = SETTINGS;
    if (typeof scrOn === 'function' && scrOn() && typeof scrSetCreate === 'function' && scrSetCreate(this)) return; // the new look of the screens (src/scrsettings.js, card space-game-screens-e-keys-settings): the same scene, the same keys and the same actions, drawn as panels of the page
    this.ui = panel(this, { w, h, title: 'SETTINGS', dim: true, depth: 0 });
    this.box = this.ui.box;
    // nothing of the scene behind reads through (the blind critic, picture 10: LONG HAUL and PRESS ANY KEY of the title ghosted through the
    // glass, and the title's key line sat half under the bottom edge). A second, darker dim over the whole screen, and a solid back in the
    // panel's own shape (its glass is 97% and the title's letters glow white)
    const back = this.add.graphics(), cut = 16, x0 = -w / 2, y0 = -h / 2;
    back.fillStyle(0x02050c, SETTINGS.dim); back.fillRect(-W, -H, W * 2, H * 2);
    back.fillStyle(HUD_BG, 1); back.beginPath(); back.moveTo(x0, y0); back.lineTo(x0 + w - cut, y0); back.lineTo(x0 + w, y0 + cut); back.lineTo(x0 + w, y0 + h); back.lineTo(x0 + cut, y0 + h); back.lineTo(x0, y0 + h - cut); back.closePath(); back.fillPath();
    this.box.addAt(back, 1); this.back = back; // above the panel's own dim (which takes the clicks), under its glass
    this.bx = -w / 2 + SETTINGS.railW + 24; this.by = -h / 2 + 58; this.bw = w / 2 - 24 - this.bx; // the body: where a section draws
    this.rail = this.add.graphics(); this.box.add(this.rail);
    this.railItems = SETTINGS.sections.map(([id, name], i) => {
      const y = this.by + 14 + i * 58, x = -w / 2 + 16;
      const t = this.add.text(x + 22, y, name, uiFont(16, '#9fe9ff', { fontStyle: 'bold', letterSpacing: 2 })).setOrigin(0, 0.5);
      const st = this.add.text(x + SETTINGS.railW - 16, y, '', uiFont(12, '#5b7a92')).setOrigin(1, 0.5);
      const z = this.add.rectangle(x + SETTINGS.railW / 2, y, SETTINGS.railW, 50, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => this.show(id));
      this.box.add([t, st, z]); return { id, t, st, y, x };
    });
    this.body = this.add.container(0, 0); this.box.add(this.body);
    this.ui.setHints([['↑↓', 'Section'], ['Enter', 'Press the main button'], ['Esc', 'Back']]);
    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.input.on('pointerdown', () => { this.blurInputs(); });
    this.events.once('shutdown', () => this.dropInputs());
    this.show(this.section);
  }

  // ---- the rail ----
  railDraw() {
    if (this.scr) return; // (the new look's tabs are its model's: src/scrsettings.js)
    const g = this.rail; g.clear();
    this.railItems.forEach(it => {
      const on = it.id === this.section, y = it.y, x = it.x, w = SETTINGS.railW;
      if (on) { g.fillStyle(0x10283d, 0.95); g.fillRect(x, y - 24, w, 48); g.fillStyle(AMBER, 1); g.fillRect(x, y - 24, 4, 48); g.lineStyle(1, CYAN, 0.5); g.strokeRect(x, y - 24, w, 48); }
      it.t.setColor(on ? '#ffb454' : '#9fe9ff');
    });
    const keys = SETTINGS.keyRows.filter(r => this.keyOf(r.id)).length, n = typeof CONTENT_ERRORS !== 'undefined' ? CONTENT_ERRORS.length : 0, st = typeof CONTENT_STATE !== 'undefined' ? CONTENT_STATE : {};
    const status = { sound: G.muted ? 'MUTED' : Math.round(G.volume * 100) + '%', keys: keys + ' of 3', listen: !LISTEN.on ? 'OFF' : listenReady().ok ? 'ON' : 'NEEDS KEYS', controls: '', flight: handlingNow().name.toUpperCase(), content: n ? n + (n === 1 ? ' PROBLEM' : ' PROBLEMS') : st.modded ? 'MODDED' : 'CORE PACK', reset: '' };
    this.railItems.forEach(it => it.st.setText(status[it.id]).setColor(it.id === 'content' && n ? '#ffb454' : '#5b7a92'));
  }
  keyOf(id) { return id === 'deepgram' ? VOICE.key : CHAT.keys[id] || ''; }

  show(id) {
    if (this.scr) return scrSetShow(this, id);
    this.dropInputs(); this.armed = null;
    this.section = id; this.body.removeAll(true); this.slots = {};
    this['draw_' + id]();
    this.railDraw(); this.tagDraw();
    this.focusFirst();
  }
  tagDraw() {
    if (this.scr) return;
    const tag = { sound: G.muted ? 'MUTED' : 'VOLUME ' + Math.round(G.volume * 100) + '%', keys: 'STAY IN THIS BROWSER', listen: 'HOLD ' + LISTEN.cap + ' TO TALK', controls: controlsGroup(this.ctab).title, flight: 'FEEL ' + handlingNow().name.toUpperCase(), content: '', reset: 'AUTOSAVE ON' }[this.section];
    this.ui.tagText.setText(tag || '');
  }

  // ---- small widgets, all drawn into the body ----
  txt(x, y, str, size, color, o = {}) {
    const t = this.add.text(x, y, str, uiFont(size, color, o.style)).setOrigin(o.ox || 0, o.oy === undefined ? 0.5 : o.oy);
    this.body.add(t); return t;
  }
  label(x, y, str) { return this.txt(x, y, str, 11, '#5b7a92', { style: { letterSpacing: 2 } }); }
  // a glass button; fn runs on a click. Returns { set(label), color(css), g, t }
  button(x, y, w, label, fn, o = {}) {
    const h = o.h || 34, g = this.add.graphics(), t = this.add.text(x + w / 2, y, label, uiFont(o.size || 14, o.color || '#9fe9ff', { fontStyle: 'bold' })).setOrigin(0.5);
    const b = { g, t, on: !!o.on, edge: o.edge || CYAN };
    b.draw = hover => {
      g.clear(); hudPanel(g, x, y - h / 2, w, h, 6, b.on ? 1 : 0.92, b.edge);
      if (b.on) { g.fillStyle(b.edge, 0.22); g.fillRect(x + 3, y - h / 2 + 3, w - 8, h - 6); }
      if (hover) { g.fillStyle(0xffffff, 0.06); g.fillRect(x + 3, y - h / 2 + 3, w - 8, h - 6); }
    };
    b.draw(false);
    const z = this.add.rectangle(x + w / 2, y, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => b.draw(true)); z.on('pointerout', () => b.draw(false)); z.on('pointerdown', () => { if (fn) fn(); });
    b.set = s => { t.setText(s); return b; }; b.color = c => { t.setColor(c); return b; };
    b.mark = on => { b.on = !!on; b.draw(false); return b; };
    this.body.add([g, t, z]); return b;
  }
  // the amber cost note, as the old panels had it
  warn(x, y, w, h, head, text) {
    const g = this.add.graphics(); this.body.add(g);
    g.fillStyle(0x2a1a06, 0.9); g.fillRect(x, y, w, h); g.lineStyle(2, AMBER, 1); g.strokeRect(x, y, w, h); g.fillStyle(AMBER, 1); g.fillRect(x, y, 5, h);
    this.txt(x + 18, y + 14, head, 14, '#ffd37a', { oy: 0, style: { fontStyle: 'bold' } });
    this.txt(x + 18, y + 36, text, 13, '#ffe9c0', { oy: 0, style: { wordWrap: { width: w - 36 }, lineSpacing: 3 } });
  }
  line(y) { const g = this.add.graphics(); g.lineStyle(1, CYAN, 0.3); g.lineBetween(this.bx, y, this.bx + this.bw, y); this.body.add(g); }
  say(msg, color = '#9fe9ff') { if (this.scr) return scrSetSay(this, msg, color); if (this.slots.status) this.slots.status.setText(msg).setColor(color); }

  // ---------- SOUND ----------
  draw_sound() {
    const bx = this.bx, by = this.by, bw = this.bw;
    this.label(bx, by + 10, 'MASTER VOLUME');
    const g = this.add.graphics(); this.body.add(g); this.slots.bar = g;
    this.slots.pct = this.txt(bx + bw, by + 38, '', 22, '#ffd37a', { ox: 1, style: { fontStyle: 'bold' } });
    this.button(bx, by + 38, 44, '-', () => this.adjustVolume(-1), { size: 20 });
    this.button(bx + 468, by + 38, 44, '+', () => this.adjustVolume(1), { size: 20 });
    const zone = this.add.rectangle(bx + 52 + 202, by + 38, 404, 30, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', p => this.setVolume(Phaser.Math.Clamp((p.x - (W / 2 + bx + 52)) / 404, 0, 1))); // p.x is in game pixels, whatever the window size
    this.body.add(zone);
    this.label(bx, by + 92, 'SOUND');
    this.slots.mute = this.button(bx, by + 122, 150, '', () => this.toggleMute());
    // the music (src/music.js): its own switch and volume, in tenths; then the effects volume (src/audio.js FX): every game sound but the voice and the music.
    // A press on either plays its own sound at the new level (two bells; a click)
    this.label(bx + 190, by + 92, 'MUSIC');
    this.slots.musicOn = this.button(bx + 190, by + 122, 110, '', () => { musicSetOn(!MUSIC.on); musicPreview(); this.soundRefresh(); });
    this.button(bx + 308, by + 122, 32, '-', () => this.adjustMusic(-1), { size: 18 });
    this.slots.musicPct = this.txt(bx + 372, by + 122, '', 16, '#ffd37a', { ox: 0.5, style: { fontStyle: 'bold' } });
    this.button(bx + 404, by + 122, 32, '+', () => this.adjustMusic(1), { size: 18 });
    this.label(bx + 476, by + 92, 'EFFECTS');
    this.button(bx + 476, by + 122, 32, '-', () => this.adjustFx(-1), { size: 18 });
    this.slots.fxPct = this.txt(bx + 540, by + 122, '', 16, '#ffd37a', { ox: 0.5, style: { fontStyle: 'bold' } });
    this.button(bx + 572, by + 122, 32, '+', () => this.adjustFx(1), { size: 18 });
    this.label(bx + 640, by + 92, 'CHATTER'); // the wing's radio in the Campaign (src/campchatter.js, card space-game-campaign-chatter): On, Quiet (the default), Off
    CHATTER_MODES.forEach(([id, name], i) => { this.slots['chatter_' + id] = this.button(bx + 640 + i * 64, by + 122, 60, name[0] + name.slice(1).toLowerCase(), () => { chatterSetMode(id); this.soundRefresh(); this.say(uiText('chatter.mode.' + id)); }); });
    this.txt(bx, by + 146, uiText('music.use'), 12, '#5b7a92', { oy: 0, style: { wordWrap: { width: bw } } }); // two lines under the row, above the rule
    const Y = 24; // the rows from here down sit this much lower than before the music row
    this.line(by + 166 + Y);
    this.label(bx, by + 190 + Y, 'SHIP VOICE');
    this.txt(bx, by + 214 + Y, 'The ship computer speaks the key moments of a run (launch, hostiles, hull warnings, docking, missions, payments) and its answers to you. The bar characters speak in their own voices when NPC chat is on. It needs your own Deepgram key (Keys).', 13, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 4 } });
    this.slots.voiceOn = this.button(bx, by + 292 + Y, 216, '', () => { voiceSetOn(!VOICE.on); this.soundRefresh(); });
    this.slots.voiceStat = this.txt(bx + 234, by + 292 + Y, '', 14, '#9fe9ff', { style: { wordWrap: { width: bw - 234 }, lineSpacing: 3 } }); // two lines when it is long: it ran off the panel
    this.label(bx, by + 346 + Y, 'SHIP COMPUTER VOICE');
    this.button(bx, by + 376 + Y, 44, '<', () => this.stepVoice(-1), { size: 18 });
    this.slots.voiceName = this.txt(bx + 60, by + 376 + Y, '', 20, '#ffd37a', { style: { fontStyle: 'bold' } });
    this.slots.voiceDesc = this.txt(bx + 160, by + 376 + Y, '', 14, '#8fb4c9');
    this.button(bx + 312, by + 376 + Y, 44, '>', () => this.stepVoice(1), { size: 18 });
    this.button(bx + 366, by + 376 + Y, 150, 'Hear it', () => this.hearVoice(), { color: '#ffb454', edge: AMBER });
    // Spoken replies (card space-game-voice-shorter): how much of the computer's answer is said aloud: Short (the first sentence or two), Full, Off. The strip shows all of it.
    this.label(bx + 548, by + 346 + Y, 'SPOKEN REPLIES');
    VOICE_SPOKEN_MODES.forEach(([id, name], i) => { this.slots['spoken_' + id] = this.button(bx + 548 + i * 84, by + 376 + Y, 78, name[0] + name.slice(1).toLowerCase(), () => { voiceSetSpoken(id); this.soundRefresh(); }); });
    this.slots.status = this.txt(bx, by + 430 + Y, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    this.slots.spokenNote = this.txt(bx, by + 458 + Y, uiText('spoken.use'), 12, '#8fb4c9', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    this.txt(bx, by + 496 + Y, 'Hear it makes one call to Deepgram, on your key, when you press it. Nothing else here sends anything.', 12, '#5b7a92');
    this.soundRefresh();
  }
  soundRefresh() {
    if (this.scr) { scrSetPaint(this); return; }
    const s = this.slots, bx = this.bx, by = this.by;
    if (!s.bar) return;
    s.bar.clear(); hudBar(s.bar, bx + 52, by + 29, 404, 18, G.muted ? 0 : G.volume, G.muted ? 0x5b7a92 : CYAN, 20);
    s.pct.setText(G.muted ? 'MUTED' : Math.round(G.volume * 100) + '%').setColor(G.muted ? '#ff4d6d' : '#ffd37a');
    s.mute.set(G.muted ? 'Sound: MUTED' : 'Sound: ON').color(G.muted ? '#ff4d6d' : '#6dff9c').mark(!G.muted);
    s.musicOn.set(MUSIC.on ? 'Music: ON' : 'Music: OFF').color(MUSIC.on ? '#6dff9c' : '#8fb4c9').mark(MUSIC.on);
    s.musicPct.setText(MUSIC.on ? Math.round(MUSIC.vol * 100) + '%' : 'OFF').setColor(MUSIC.on ? '#ffd37a' : '#5b7a92');
    s.fxPct.setText(Math.round(FX.vol * 100) + '%').setColor(FX.vol > 0 ? '#ffd37a' : '#5b7a92');
    const st = voiceStatus();
    // the button says what the player will hear, not only the switch: on with no key (or a rejected one) is not ON, it is waiting for a key
    const waits = VOICE.on && st !== 'ON';
    s.voiceOn.set(!VOICE.on ? 'Ship voice: OFF' : waits ? 'Ship voice: NEEDS KEY' : 'Ship voice: ON').color(!VOICE.on ? '#8fb4c9' : waits ? '#ffb454' : '#6dff9c').mark(VOICE.on && !waits);
    s.voiceStat.setText(st === 'NO KEY' ? 'No Deepgram key yet: the ship does not speak until you add one under Keys. The sound effects play.' : st === 'KEY REJECTED' ? 'Deepgram rejected the key (check it under Keys).' : st === 'ON' ? 'Speaking.' : 'Off.')
      .setColor(st === 'ON' ? '#6dff9c' : st === 'KEY REJECTED' ? '#ff4d6d' : '#8fb4c9');
    const c = VOICE_CHOICES.find(x => x[0] === VOICE.voice) || VOICE_CHOICES[0];
    s.voiceName.setText(c[1]); s.voiceDesc.setText(c[2]);
    VOICE_SPOKEN_MODES.forEach(([id, name]) => { const on = VOICE.spoken === id; s['spoken_' + id].set(name[0] + name.slice(1).toLowerCase()).color(on ? '#6dff9c' : '#8fb4c9').mark(on); });
    CHATTER_MODES.forEach(([id, name]) => { const on = chatterMode() === id; s['chatter_' + id].set(name[0] + name.slice(1).toLowerCase()).color(on ? '#6dff9c' : '#8fb4c9').mark(on); });
    s.spokenNote.setText(uiText('spoken.use') + '  ' + uiText('spoken.' + VOICE.spoken).replace(/^./, c0 => c0.toUpperCase()) + '.');
    this.railDraw(); this.tagDraw();
  }
  setVolume(v) { G.volume = Math.min(1, Math.max(0, Math.round(v * 10) / 10)); if (G.volume > 0 && G.muted) G.muted = false; saveGame(); beep(660, 0.08, 'triangle', 0.05); this.soundRefresh(); }
  adjustVolume(dir) { this.setVolume(G.volume + dir * 0.1); }
  adjustMusic(dir) { musicSetVol(MUSIC.vol + dir * 0.1); musicPreview(); this.soundRefresh(); }
  adjustFx(dir) { fxSetVol(FX.vol + dir * 0.1); beep(660, 0.08, 'triangle', 0.05); this.soundRefresh(); }
  toggleMute() { G.muted = !G.muted; saveGame(); if (!G.muted) beep(660, 0.08, 'triangle', 0.05); this.soundRefresh(); }
  stepVoice(d) {
    const i = Math.max(0, VOICE_CHOICES.findIndex(x => x[0] === VOICE.voice));
    voiceSetVoice(VOICE_CHOICES[(i + d + VOICE_CHOICES.length) % VOICE_CHOICES.length][0]); this.say(''); this.soundRefresh();
  }
  async hearVoice() { // the one call this section makes, on the key and in the voice shown, when the player presses the button
    this.say('Asking the ship to speak...', '#ffd37a');
    const r = await voiceTest(VOICE.voice);
    if (this.scene.isActive() && this.section === 'sound') { this.say(r, /works/.test(r) ? '#6dff9c' : '#ff4d6d'); this.soundRefresh(); }
  }

  // ---------- KEYS ----------
  draw_keys() {
    const bx = this.bx, by = this.by, bw = this.bw, L = settingsKeysLayout(), shown = s => (s.length > 42 ? s.slice(0, 39) + '...' : s);
    this.warn(bx, by, bw, SETTINGS.keys.warnH, 'THESE USE YOUR OWN ACCOUNTS AND MAY COST YOU MONEY',
      'A key stays in this browser: never in the game files or the save. What you type to a character is kept in this browser\'s save, so keep it private. With no keys the game works as before.');
    SETTINGS.keyRows.forEach((r, i) => {
      const row = L.rows[i], y = by + row.y, info = settingsKeyInfo(r.id), ly = by + row.link;
      this.txt(bx, y - 8, r.name, 15, '#cfefff', { style: { fontStyle: 'bold', letterSpacing: 1 } });
      this.slots['stat_' + r.id] = this.txt(bx + 148, y, '', 14, '#6b8296');
      this.slots['at_' + r.id] = { x: bx + 290, y: y - 17, w: 250, h: 34 };
      this.button(bx + 556, y, 70, 'Save', () => this.saveKey(r.id));
      this.button(bx + 632, y, 70, 'Test', () => this.testKey(r.id));
      this.button(bx + 708, y, 90, 'Clear', () => this.forgetKey(r.id), { color: '#ff8da0', edge: RED });
      this.inputs[r.id] = this.makeInput('password', 'paste your key here', 200, () => this.saveKey(r.id));
      // what it is for, that it is your own account, and where to get one (the words and the address are content/text/ui.md's)
      this.txt(bx, by + row.use, info.use, 12, '#8fb4c9');
      this.txt(bx, by + row.cost, info.cost, 12, '#ffd37a');
      if (info.urlOk) {
        this.button(bx, ly, 118, 'Get a key', () => { const o = settingsOpenKey(r.id); this.say(o.say, o.ok ? '#9fe9ff' : '#ff4d6d'); }, { size: 13, h: 24 });
        this.txt(bx + 132, ly, shown(info.url), 12, '#cfefff');
        this.button(bx + 440, ly, 70, 'Copy', () => { settingsCopyKey(r.id).then(c => { if (this.scene.isActive() && this.section === 'keys') this.say(c.say, c.ok ? '#6dff9c' : '#ffb454'); }); }, { size: 13, h: 24 });
        this.txt(bx + 526, ly, info.steps, 12, '#8fb4c9', { style: { wordWrap: { width: bw - 526 } } });
      } else this.txt(bx, ly, info.url ? shown(info.url) + '  (not a plain https address: no link is offered)' : 'No key page address is set for this key.', 12, '#ff8da0');
    });
    this.line(by + L.line);
    const cy = by + L.chat;
    this.label(bx, cy, 'NPC CHAT');
    this.slots.chatOn = this.button(bx + 120, cy, 150, '', () => { chatSetOn(!CHAT.on); this.keysRefresh(); });
    this.label(bx + 300, cy, 'PROVIDER');
    this.slots.provs = [['', 'Auto'], ['openai', 'OpenAI'], ['anthropic', 'Anthropic']].map(([id, name], i) => {
      const b = this.button(bx + 390 + i * 110, cy, 104, name, () => { chatSetProvider(id); this.keysRefresh(); }); b.pid = id; return b;
    });
    const my = by + L.model;
    this.label(bx, my, 'MODEL  (blank = the provider\'s default)');
    this.slots.at_model = { x: bx + 290, y: my - 17, w: 300, h: 34 };
    this.inputs.model = this.makeInput('text', '', 60, () => this.saveModel());
    this.inputs.model.value = CHAT.model;
    this.inputs.model.addEventListener('change', () => this.saveModel());
    this.slots.counter = this.txt(bx + bw, my, '', 12, '#5b7a92', { ox: 1 });
    this.slots.status = this.txt(bx, by + L.status, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    this.keysRefresh();
    this.say(!VOICE.key && !CHAT.keys.openai && !CHAT.keys.anthropic ? 'No keys yet: the ship does not speak and the characters keep their scripted lines. The sound effects play.' : 'Keys are saved in this browser. Test asks the provider once, when you press it.');
  }
  keysRefresh() {
    if (this.scr) { scrSetPaint(this); return; }
    const s = this.slots; if (!s.chatOn) return;
    SETTINGS.keyRows.forEach(r => {
      const k = this.keyOf(r.id), bad = r.id === 'deepgram' ? VOICE.bad : CHAT.bad && chatProvider() === r.id && !!k;
      s['stat_' + r.id].setText(k ? settingsMask(k) + (bad ? '  rejected' : '') : 'no key').setColor(bad ? '#ff4d6d' : k ? '#6dff9c' : '#6b8296');
      this.inputs[r.id].placeholder = k ? 'paste to replace' : 'paste your key here';
    });
    s.chatOn.set(CHAT.on ? 'Chat: ON' : 'Chat: OFF').color(CHAT.on ? '#6dff9c' : '#8fb4c9').mark(CHAT.on);
    s.provs.forEach(b => { b.mark(b.pid === CHAT.provider); if (b.pid === '') b.set(CHAT.provider ? 'Auto' : 'Auto: ' + CHAT_PROVIDERS[chatProvider()].name); });
    this.inputs.model.placeholder = CHAT_PROVIDERS[chatProvider()].model;
    s.counter.setText('NPC chat: ' + CHAT.calls + (CHAT.calls === 1 ? ' call' : ' calls') + ' this session');
    this.railDraw();
  }
  makeInput(type, placeholder, max, onEnter) {
    const el = chatMakeInput(type, placeholder, max, onEnter, () => el.blur()); // Esc in a box leaves the box; a second Esc leaves the screen
    el.style.display = 'none'; // update() shows it where it belongs, so it never flashes in the corner
    return el;
  }
  saveModel() { const el = this.inputs.model; if (el) { chatSetModel(el.value); el.value = CHAT.model; this.keysRefresh(); } }
  saveKey(id) {
    const el = this.inputs[id], v = el ? el.value.trim() : '';
    if (id !== 'deepgram') this.saveModel();
    if (!v && this.scr && this.keyOf(id)) return this.forgetKey(id); // the new look folds Clear into Save: Save with nothing typed removes the saved key (the pill says Clear then)
    if (!v) return this.say(this.keyOf(id) ? 'The saved key is unchanged.' : 'Paste a key first.');
    if (v.length < 16 || /\s/.test(v)) return this.say('That does not look like ' + (id === 'deepgram' ? 'a Deepgram' : 'an API') + ' key.', '#ff4d6d');
    if (id === 'openai' && /^sk-ant-/.test(v)) return this.say('That looks like an Anthropic key. Paste it in the Anthropic row.', '#ff4d6d');
    if (id === 'anthropic' && !/^sk-ant-/.test(v)) return this.say('An Anthropic key starts with sk-ant-. Check the key, or paste an OpenAI key in the OpenAI row.', '#ff4d6d');
    if (id === 'deepgram') { voiceSetKey(v); voiceSetOn(true); } else { chatSetKey(v, id); chatSetOn(true); }
    el.value = ''; this.keysRefresh();
    this.say('Key saved in this browser (' + settingsMask(v) + '). Press Test to try it.', '#6dff9c');
  }
  async testKey(id) { // one real call on the key in this row, when the button is pressed
    if (id !== 'deepgram') this.saveModel();
    if (!this.keyOf(id)) return this.say('Paste a key first.');
    this.say('Asking ' + SETTINGS.keyRows.find(r => r.id === id).name.toLowerCase() + '...', '#ffd37a');
    const r = id === 'deepgram' ? await voiceTest() : await chatTest(id);
    if (this.scene.isActive() && this.section === 'keys') { this.keysRefresh(); this.say(r, /works|^JUNO:/.test(r) ? '#6dff9c' : '#ff4d6d'); }
  }
  forgetKey(id) {
    if (id === 'deepgram') voiceSetKey(''); else chatSetKey('', id);
    if (this.inputs[id]) this.inputs[id].value = '';
    this.keysRefresh(); this.say('Key removed from this browser.');
  }

  // ---------- LISTEN ----------
  // Talk to the ship's computer (src/listen.js): the words are content/text/ui.md's (listen.use, .cost, .hint). The only button here that touches the
  // microphone is Test microphone, and it opens it for an instant and sends nothing; nothing in this section calls Deepgram
  draw_listen() {
    const bx = this.bx, by = this.by, bw = this.bw;
    this.warn(bx, by, bw, SETTINGS.keys.warnH, 'THIS USES YOUR OWN DEEPGRAM ACCOUNT AND MAY COST YOU MONEY', uiText('listen.cost', { key: LISTEN.cap, minutes: LISTEN.limit.minutes }));
    this.label(bx, by + 112, 'HOLD TO TALK');
    const cap = keyCap(this, LISTEN.cap, AMBER); cap.setPosition(bx + 8 + cap.kw / 2, by + 146); this.body.add(cap);
    this.txt(bx + 24 + cap.kw, by + 146, 'in space or in a station: hold until the ring is full, then speak', 15, '#cfefff');
    this.txt(bx, by + 184, uiText('listen.use', { key: LISTEN.cap, minutes: LISTEN.limit.minutes }), 13, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 4 } });
    this.slots.listenOn = this.button(bx, by + 252, 216, '', () => { listenSetOn(!LISTEN.on); this.listenRefresh(); });
    this.slots.listenStat = this.txt(bx + 234, by + 252, '', 14, '#9fe9ff', { style: { wordWrap: { width: bw - 234 }, lineSpacing: 3 } });
    this.line(by + 298);
    this.label(bx, by + 320, 'MICROPHONE');
    this.button(bx, by + 354, 216, 'Test microphone', () => this.testMic(), { color: '#ffb454', edge: AMBER });
    this.txt(bx + 234, by + 354, 'Opens it for an instant so the browser can ask. Records nothing, sends nothing.', 13, '#8fb4c9', { style: { wordWrap: { width: bw - 234 } } });
    this.slots.listenUsed = this.txt(bx, by + 402, '', 13, '#8fb4c9');
    this.slots.listenBar = this.add.graphics(); this.body.add(this.slots.listenBar);
    this.slots.status = this.txt(bx, by + 434, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    this.slots.listenHint = this.txt(bx, by + 486, '', 12, '#5b7a92', { style: { wordWrap: { width: bw } } });
    this.listenRefresh();
  }
  listenRefresh() {
    if (this.scr) { scrSetPaint(this); return; }
    const s = this.slots; if (!s.listenOn) return;
    const st = listenStatus(), h = listenHint();
    s.listenOn.set(LISTEN.on ? 'Listening: ON' : 'Listening: OFF').color(LISTEN.on ? '#6dff9c' : '#8fb4c9').mark(LISTEN.on);
    s.listenStat.setText(st.line).setColor(st.color);
    s.listenUsed.setText(listenUsedLine());
    s.listenBar.clear(); hudBar(s.listenBar, this.bx + 330, this.by + 393, 300, 14, Math.min(1, LISTEN.s.used / (LISTEN.limit.minutes * 60000)), CYAN, 20);
    s.listenHint.setText(h.text).setColor(h.warn ? '#ffb454' : '#5b7a92');
    this.railDraw();
  }
  async testMic() { // opens the microphone for an instant, to let the browser ask; nothing is recorded or sent
    this.say('Opening the microphone...', '#ffd37a');
    const r = await listenMicTest();
    if (this.scene.isActive() && this.section === 'listen') { this.say(r, /works/.test(r) ? '#6dff9c' : '#ff4d6d'); this.listenRefresh(); }
  }

  // ---------- CONTROLS ----------
  draw_controls() {
    const bx = this.bx, by = this.by, bw = this.bw, n = CONTROLS.length, cw = bw / n;
    this.slots.tabs = CONTROLS.map((g, i) => this.button(bx + i * cw, by + 14, cw - 6, g.title, () => { this.ctab = g.id; this.show('controls'); }, { size: 12 }).mark(g.id === this.ctab));
    const g = controlsGroup(this.ctab);
    this.txt(bx, by + 66, g.scene ? 'WHAT THE KEYS DO IN THE ' + g.title + '  (the H page in the game shows the same)' : g.title, 11, '#5b7a92', { style: { letterSpacing: 2 } });
    const L = settingsControlsLayout(g.rows, bw); // a long group (FLIGHT has 22) is in columns, so every row is on the panel
    L.items.forEach(it => {
      const r = g.rows[it.i], y = by + it.y;
      r.k.forEach((k, j) => { const cap = keyCap(this, k, AMBER); cap.setPosition(bx + it.caps[j].x, y); this.body.add(cap); });
      this.txt(bx + it.x, y, r.t, L.size, '#cfefff', { style: { wordWrap: { width: it.wrap }, lineSpacing: 0 } });
    });
    this.txt(bx, by + 500, 'Left and right change the group.', 12, '#5b7a92');
  }

  // ---------- FLIGHT ----------
  // one row: which set of handling numbers the ship flies with (src/handling.js). Left, right or Enter switch it; it takes hold at once
  draw_flight() {
    const bx = this.bx, by = this.by, bw = this.bw, ids = Object.keys(HANDLING), now = handlingNow();
    this.label(bx, by + 10, 'FLIGHT FEEL');
    this.slots.feel = ids.map((id, i) => this.button(bx + i * 176, by + 44, 168, HANDLING[id].name, () => this.setFeel(id), { size: 16 }).mark(id === now.id));
    this.txt(bx + ids.length * 176 + 12, by + 44, now.note, 14, '#cfefff', { style: { wordWrap: { width: bw - ids.length * 176 - 12 }, lineSpacing: 3 } });
    this.line(by + 88);
    // the two feels side by side, as bars: how long each takes, on the ship you fly
    const acc = shipStat('accel'), vmax = shipStat('vmax'), g = this.add.graphics(); this.body.add(g);
    const rows = [['TURN BUILDS', h => h.turnUp / 1000, 1], ['TURN EASES OFF', h => h.turnDown / 1000, 1], ['THRUST RAMPS', h => h.thrustUp / 1000, 1], ['TO TOP SPEED', h => handlingTimeTo(h, acc, vmax), 3], ['COASTS TO A STOP', h => handlingCoast(h, vmax), 15]];
    ids.forEach((id, c) => this.txt(bx + 200 + c * 300, by + 116, HANDLING[id].name.toUpperCase(), 12, id === now.id ? '#ffb454' : '#5b7a92', { style: { letterSpacing: 2, fontStyle: 'bold' } }));
    rows.forEach(([name, f, max], i) => {
      const y = by + 152 + i * 40; this.label(bx, y, name);
      ids.forEach((id, c) => {
        const v = f(HANDLING[id]), x = bx + 200 + c * 300;
        hudBar(g, x, y - 8, 200, 16, Math.min(1, v / max), id === now.id ? AMBER : 0x5b7a92, 20);
        this.txt(x + 212, y, v ? v.toFixed(1) + ' s' : 'at once', 13, id === now.id ? '#ffd37a' : '#8fb4c9');
      });
    });
    this.txt(bx, by + 372, 'Top speed, boost, dash and the autopilot are the same in both. The choice stays in this browser and takes hold at once.', 12, '#5b7a92', { oy: 0, style: { wordWrap: { width: bw } } });
  }
  setFeel(id) { handlingSet(id); beep(660, 0.08, 'triangle', 0.05); if (this.section === 'flight') this.show('flight'); }
  stepFeel(d) { const ids = Object.keys(HANDLING); this.setFeel(ids[(ids.indexOf(handlingNow().id) + d + ids.length) % ids.length]); }

  // ---------- CONTENT ----------
  draw_content() {
    const by = this.by, bx = this.bx, on = scrOn();
    // the new screens (card space-game-screens-f-foundation): the switch is here so Troy can flip it from any scene (the N panel is flight-only); Enter does it too
    this.label(bx, by + 4, uiText('scr.set.row').toUpperCase());
    this.slots.scrOn = this.button(bx, by + 42, 220, uiText(on ? 'scr.set.on' : 'scr.set.off'), () => this.screensToggle(), { on, edge: on ? GREEN : CYAN, size: 13 });
    this.txt(bx + 236, by + 32, uiText('scr.set.hint'), 12, '#5b7a92', { oy: 0, style: { wordWrap: { width: this.bw - 270 }, lineSpacing: 3 } });
    this.slots.status = this.txt(bx, by + 64, '', 13, '#9fe9ff', { oy: 0, style: { wordWrap: { width: this.bw } } });
    this.slots.contentEnd = contentBody(this, this.body, this.bx, by + 84, this.bw - 20);
  }
  screensToggle() {
    const on = scrSet(!scrOn());
    if (this.scr) { this.say(uiText(on ? 'scr.set.said.on' : 'scr.set.said.off'), on ? '#6dff9c' : '#ffd37a'); return scrSetPaint(this, true); }
    this.slots.scrOn.set(uiText(on ? 'scr.set.on' : 'scr.set.off')).mark(on); this.slots.scrOn.edge = on ? GREEN : CYAN; this.slots.scrOn.draw(false);
    this.say(uiText(on ? 'scr.set.said.on' : 'scr.set.said.off'), on ? '#6dff9c' : '#ffd37a');
  }

  // ---------- RESET ----------
  draw_reset() {
    const bx = this.bx, by = this.by, bw = this.bw;
    this.label(bx, by + 10, 'RESET GAME');
    this.txt(bx, by + 34, 'Erases your save: credits, ships, missions, the journal and everyone\'s memory of you. You start again at Halcyon Station with a Wren.\nYour keys, volume and voice choice are not part of the save and stay.', 14, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 4 } }); // wrapped: the first line ran out past the panel's right edge (first look)
    this.slots.reset = this.button(bx, by + 118, 250, 'Reset game', () => this.press('reset'), { color: '#ff8da0', edge: RED });
    this.line(by + 176);
    this.label(bx, by + 200, 'FORGET ALL KEYS');
    this.txt(bx, by + 224, 'Removes the Deepgram, OpenAI and Anthropic keys from this browser. The game goes back to silent ship and scripted characters.', 14, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 4 } });
    this.slots.forget = this.button(bx, by + 290, 250, 'Forget all keys', () => this.press('forget'), { color: '#ff8da0', edge: RED });
    // the play log (card space-game-playlog): a plain record of how the game is played, kept on this computer so it can be talked through; ON by default
    this.line(by + 330);
    this.label(bx, by + 346, 'PLAY LOG');
    this.txt(bx, by + 368, 'A plain record of how you play, kept on this computer so it can be talked through with you: which screens, how long, deals, deaths, what went wrong. No word you type or say is in it, no key, and nothing leaves this computer.', 13, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    const on = playlogOn();
    this.slots.plOn = this.button(bx, by + 446, 170, on ? 'Play log: ON' : 'Play log: OFF', () => this.playlogToggle(), { on, edge: on ? GREEN : CYAN, size: 13 });
    this.slots.plDown = this.button(bx + 182, by + 446, 160, 'Download log', () => this.playlogGet(), { size: 13 });
    this.slots.plforget = this.button(bx + 354, by + 446, 160, 'Forget log', () => this.press('plforget'), { color: '#ff8da0', edge: RED, size: 13 });
    this.slots.status = this.txt(bx, by + 478, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw } } });
  }
  playlogToggle() {
    const on = playlogSet(!playlogOn());
    if (this.scr) { this.say(on ? 'Play log ON.' : 'Play log OFF: nothing more is recorded.', on ? '#6dff9c' : '#ffd37a'); return scrSetPaint(this, true); }
    this.slots.plOn.set(on ? 'Play log: ON' : 'Play log: OFF').mark(on); this.slots.plOn.edge = on ? GREEN : CYAN; this.slots.plOn.draw(false);
    this.say(on ? 'Play log ON.' : 'Play log OFF: nothing more is recorded.', on ? '#6dff9c' : '#ffd37a');
  }
  playlogGet() {
    const r = playlogDownload();
    this.say(r.ok ? 'Saved ' + r.name + ' (' + Math.max(1, Math.round(r.bytes / 1024)) + ' KB) to your downloads.' : 'There is nothing in the log to download yet.', r.ok ? '#6dff9c' : '#ffd37a');
  }
  // a second press within four seconds confirms
  press(what) {
    if (this.scr) return scrSetPress(this, what);
    const now = performance.now();
    if (this.armed && this.armed.what !== what) { this.armed = null; this.show('reset'); } // the other button was waiting: put it back
    const b = this.slots[what];
    if (!this.armed || this.armed.what !== what || now - this.armed.at > SETTINGS.confirmMs) {
      this.armed = { what, at: now }; this.say(what === 'reset' ? 'Press Reset game again to erase everything.' : what === 'plforget' ? 'Press Forget log again to erase the log kept in this browser.' : 'Press Forget all keys again to remove them.', '#ff4d6d');
      b.set(what === 'reset' ? 'Press again to erase' : 'Press again').color('#ff4d6d').mark(true); return;
    }
    if (now - this.armed.at < 350) return; // a double tap is not a confirmation
    this.armed = null;
    if (what === 'plforget') {
      const ok = playlogForget();
      b.set('Forget log').color('#ff8da0').mark(false); return this.say(ok ? 'Play log forgotten. (A copy that the dev server kept stays in its own folder.)' : 'The play log could not be cleared.', ok ? '#6dff9c' : '#ff4d6d');
    }
    if (what === 'forget') {
      voiceSetKey(''); chatSetKey('');
      b.set('Forget all keys').color('#ff8da0').mark(false); return this.say('All keys removed from this browser.', '#6dff9c');
    }
    this.resetGame();
  }
  resetGame() {
    clearSave(); newGameState(); saveGame(true);
    const pause = this.from === 'Pause' ? this.scene.get('Pause') : null;
    if (pause) { this.closing = true; this.dropInputs(); this.scene.stop(); pause.toStation(); return; } // the run in front of the pause menu is gone: back to the station, new game
    if (this.slots.reset) this.slots.reset.set('Reset game').color('#ff8da0').mark(false);
    this.say('Game reset. Press Enter on the title screen to start again.', '#6dff9c');
  }

  // ---------- keys, inputs, closing ----------
  focusFirst() {
    if (this.section !== 'keys') return;
    const id = this.focusKey === 'chat' ? (CHAT.keys.anthropic && !CHAT.keys.openai ? 'anthropic' : 'openai') : this.focusKey || 'deepgram', el = this.inputs[id];
    this.focusKey = '';
    setTimeout(() => { try { if (el && el.isConnected) el.focus(); } catch (e) { /* focus is a nicety */ } }, 50);
  }
  blurInputs() { Object.keys(this.inputs).forEach(k => { try { if (document.activeElement === this.inputs[k]) this.inputs[k].blur(); } catch (e) { /* ignore */ } }); }
  dropInputs() { Object.keys(this.inputs || {}).forEach(k => { if (this.inputs[k]) this.inputs[k].remove(); }); this.inputs = {}; }
  onKey(e) {
    if (e.repeat || this.closing || performance.now() - this.born < 200) return;
    const code = e.code, secs = SETTINGS.sections.map(s => s[0]), i = secs.indexOf(this.section);
    if (code === 'Escape') { if (this.armed) { this.armed = null; this.show(this.section); } else this.close(); }
    else if (code === 'ArrowUp' || code === 'KeyW') this.show(secs[(i + secs.length - 1) % secs.length]);
    else if (code === 'ArrowDown' || code === 'KeyS') this.show(secs[(i + 1) % secs.length]);
    else if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowRight' || code === 'KeyD') {
      const d = code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1;
      if (this.section === 'sound') this.adjustVolume(d);
      else if (this.section === 'flight') this.stepFeel(d);
      else if (this.section === 'controls') { const ids = CONTROLS.map(g => g.id); this.ctab = ids[(ids.indexOf(this.ctab) + d + ids.length) % ids.length]; this.show('controls'); }
    } else if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') {
      if (this.section === 'sound') this.toggleMute();
      else if (this.section === 'keys') { const el = this.inputs.deepgram; if (el) el.focus(); }
      else if (this.section === 'listen') { listenSetOn(!LISTEN.on); this.listenRefresh(); }
      else if (this.section === 'flight') this.stepFeel(1);
      else if (this.section === 'reset') this.press('reset');
      else if (this.section === 'content') this.screensToggle();
    }
  }
  close() {
    if (this.closing) return; this.closing = true; sfx('uiClose'); this.saveModel(); this.dropInputs();
    const from = this.from, back = this.scene.get(from);
    if (back && back.k && back.k.ESC) Phaser.Input.Keyboard.JustDown(back.k.ESC); // clear the Esc that closed this, so the pause menu below does not take it too
    this.scene.stop(); this.scene.resume(from);
  }
  update() {
    if (!this.inputs) return;
    if (this.scr) return scrSetUpdate(this); // the new look: the inputs over their placeholders, the page when the state moved
    const r = this.game.canvas.getBoundingClientRect(), k = r.width / W, cx = W / 2, cy = H / 2; // the boxes follow the canvas when the window is resized
    const keys = this.section === 'keys';
    Object.keys(this.inputs).forEach(id => {
      const el = this.inputs[id], at = this.slots['at_' + id]; if (!el || !at) return;
      el.style.display = keys ? '' : 'none';
      Object.assign(el.style, { left: (r.left + (cx + at.x) * k) + 'px', top: (r.top + (cy + at.y) * k) + 'px', width: at.w * k + 'px', height: at.h * k + 'px', fontSize: 15 * k + 'px' });
    });
    if (this.armed && performance.now() - this.armed.at > SETTINGS.confirmMs) { this.armed = null; this.show(this.section); } // a confirmation nobody gave runs out
    const sig = G.muted + ':' + G.volume; // M works here too (meta.js): the screen follows
    if (sig !== this.sig) { this.sig = sig; if (this.section === 'sound') this.soundRefresh(); else { this.railDraw(); this.tagDraw(); } }
  }
}

// scene: the scene to pause and come back to (Pause or Title). section: sound, keys, controls, content or reset. focus: deepgram or chat (Keys only).
function settingsOpen(scene, section, focus) {
  if (scene.scene.manager.isActive('Settings')) return;
  sfx('uiOpen'); scene.scene.pause(); scene.scene.launch('Settings', { from: scene.scene.key, section: section || 'sound', focus: focus || '' });
  if (typeof scene.scene.bringToTop === 'function') scene.scene.bringToTop('Settings'); // Settings is listed before the Campaign (src/main.js), so it was drawn UNDER a paused Campaign: nothing showed and mute could not be reached from the pause card (card space-game-pause-settings-under)
}
