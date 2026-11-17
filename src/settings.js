// ---------- Settings: one screen for sound, keys, controls, content and reset (card space-game-settings-screen) ----------
// It replaces the ship-voice panel, the NPC-chat panel, the Pause menu's Controls page and the content panel of the title screen. Reached from
// the Title (S) and from Pause (the Settings row); V, C and P on the Title still work and open the matching section:
//   V -> Keys, at the Deepgram key      C -> Keys, at the chat keys      P -> Content (when there is something to show)
// Sections (the rail on the left; up and down, W and S, or a click):
//   SOUND     the volume, mute, the ship voice on or off and its voice (src/voice.js), with a Hear it button
//   KEYS      one row each for Deepgram (voices), OpenAI and Anthropic (NPC chat): paste, Save, Test, Forget. A saved key shows its last four
//             characters and nothing else. Below: NPC chat on or off, the provider, the model. Keys stay in this browser (localStorage), never
//             in the save, never in the game files; the cost note says so in plain words
//   CONTROLS  every key of the game, from the one table in src/data_controls.js, a tab for each group
//   FLIGHT    the flight feel: Classic or Heavy (src/handling.js), one row; kept in this browser, not in the save
//   CONTENT   which content pack is running and what it ignored (src/contentui.js builds the lines)
//   RESET     Reset game (erase the save and start again) and Forget all keys, each with a second press
// Nothing here calls a service by itself. Test and Hear it are the only buttons that do, and only when the player presses them, on the key they
// pressed it in; tests/settings.mjs mocks fetch and checks that nothing else is called.
// The text boxes are real HTML inputs laid over the canvas (paste works; the typing never reaches Phaser or the window's M and Esc hooks), as the
// old panels did it. Opened with settingsOpen(scene, section, focus) from the scene to come back to; closed with Esc.

const SETTINGS = {
  w: 1120, h: 640, railW: 232,
  sections: [['sound', 'SOUND'], ['keys', 'KEYS'], ['controls', 'CONTROLS'], ['flight', 'FLIGHT'], ['content', 'CONTENT'], ['reset', 'RESET']],
  keyRows: [ // the three keys: where each is kept, what it is for, how to tell a wrong paste
    { id: 'deepgram', name: 'DEEPGRAM', use: 'ship voice and bar voices' },
    { id: 'openai', name: 'OPENAI', use: 'NPC chat' },
    { id: 'anthropic', name: 'ANTHROPIC', use: 'NPC chat' }
  ],
  confirmMs: 4000
};
const settingsMask = k => (k ? '**** ' + String(k).slice(-4) : 'no key'); // a saved key is shown by its last four characters only

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
    this.ui = panel(this, { w, h, title: 'SETTINGS', dim: true, depth: 0 });
    this.box = this.ui.box;
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
    const g = this.rail; g.clear();
    this.railItems.forEach(it => {
      const on = it.id === this.section, y = it.y, x = it.x, w = SETTINGS.railW;
      if (on) { g.fillStyle(0x10283d, 0.95); g.fillRect(x, y - 24, w, 48); g.fillStyle(AMBER, 1); g.fillRect(x, y - 24, 4, 48); g.lineStyle(1, CYAN, 0.5); g.strokeRect(x, y - 24, w, 48); }
      it.t.setColor(on ? '#ffb454' : '#9fe9ff');
    });
    const keys = SETTINGS.keyRows.filter(r => this.keyOf(r.id)).length, n = typeof CONTENT_ERRORS !== 'undefined' ? CONTENT_ERRORS.length : 0, st = typeof CONTENT_STATE !== 'undefined' ? CONTENT_STATE : {};
    const status = { sound: G.muted ? 'MUTED' : Math.round(G.volume * 100) + '%', keys: keys + ' of 3', controls: '', flight: handlingNow().name.toUpperCase(), content: n ? n + (n === 1 ? ' PROBLEM' : ' PROBLEMS') : st.modded ? 'MODDED' : 'CORE PACK', reset: '' };
    this.railItems.forEach(it => it.st.setText(status[it.id]).setColor(it.id === 'content' && n ? '#ffb454' : '#5b7a92'));
  }
  keyOf(id) { return id === 'deepgram' ? VOICE.key : CHAT.keys[id] || ''; }

  show(id) {
    this.dropInputs(); this.armed = null;
    this.section = id; this.body.removeAll(true); this.slots = {};
    this['draw_' + id]();
    this.railDraw(); this.tagDraw();
    this.focusFirst();
  }
  tagDraw() {
    const tag = { sound: G.muted ? 'MUTED' : 'VOLUME ' + Math.round(G.volume * 100) + '%', keys: 'STAY IN THIS BROWSER', controls: controlsGroup(this.ctab).title, flight: 'FEEL ' + handlingNow().name.toUpperCase(), content: '', reset: 'AUTOSAVE ON' }[this.section];
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
  say(msg, color = '#9fe9ff') { if (this.slots.status) this.slots.status.setText(msg).setColor(color); }

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
    this.slots.mute = this.button(bx, by + 122, 160, '', () => this.toggleMute());
    this.txt(bx + 176, by + 122, 'M does the same, anywhere in the game', 13, '#5b7a92');
    this.line(by + 166);
    this.label(bx, by + 190, 'SHIP VOICE');
    this.txt(bx, by + 214, 'The ship computer speaks the key moments of a run: launch, hostiles, hull warnings, docking, missions and payments. The bar characters speak their lines in their own voices when NPC chat is on. It needs your own Deepgram key (Keys).', 13, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 4 } });
    this.slots.voiceOn = this.button(bx, by + 292, 190, '', () => { voiceSetOn(!VOICE.on); this.soundRefresh(); });
    this.slots.voiceStat = this.txt(bx + 208, by + 292, '', 14, '#9fe9ff');
    this.label(bx, by + 346, 'SHIP COMPUTER VOICE');
    this.button(bx, by + 376, 44, '<', () => this.stepVoice(-1), { size: 18 });
    this.slots.voiceName = this.txt(bx + 60, by + 376, '', 20, '#ffd37a', { style: { fontStyle: 'bold' } });
    this.slots.voiceDesc = this.txt(bx + 250, by + 376, '', 14, '#8fb4c9');
    this.button(bx + 520, by + 376, 44, '>', () => this.stepVoice(1), { size: 18 });
    this.button(bx + 590, by + 376, 150, 'Hear it', () => this.hearVoice(), { color: '#ffb454', edge: AMBER });
    this.slots.status = this.txt(bx, by + 430, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    this.txt(bx, by + 478, 'Hear it makes one call to Deepgram, on your key, when you press it. Nothing else here sends anything.', 12, '#5b7a92');
    this.soundRefresh();
  }
  soundRefresh() {
    const s = this.slots, bx = this.bx, by = this.by;
    if (!s.bar) return;
    s.bar.clear(); hudBar(s.bar, bx + 52, by + 29, 404, 18, G.muted ? 0 : G.volume, G.muted ? 0x5b7a92 : CYAN, 20);
    s.pct.setText(G.muted ? 'MUTED' : Math.round(G.volume * 100) + '%').setColor(G.muted ? '#ff4d6d' : '#ffd37a');
    s.mute.set(G.muted ? 'Sound: MUTED' : 'Sound: ON').color(G.muted ? '#ff4d6d' : '#6dff9c').mark(!G.muted);
    s.voiceOn.set(VOICE.on ? 'Ship voice: ON' : 'Ship voice: OFF').color(VOICE.on ? '#6dff9c' : '#8fb4c9').mark(VOICE.on);
    const st = voiceStatus();
    s.voiceStat.setText(st === 'NO KEY' ? 'No Deepgram key yet: the game is silent (add it under Keys).' : st === 'KEY REJECTED' ? 'Deepgram rejected the key (check it under Keys).' : st === 'ON' ? 'Speaking.' : 'Off.')
      .setColor(st === 'ON' ? '#6dff9c' : st === 'KEY REJECTED' ? '#ff4d6d' : '#8fb4c9');
    const c = VOICE_CHOICES.find(x => x[0] === VOICE.voice) || VOICE_CHOICES[0];
    s.voiceName.setText(c[1]); s.voiceDesc.setText(c[2]);
    this.railDraw(); this.tagDraw();
  }
  setVolume(v) { G.volume = Math.min(1, Math.max(0, Math.round(v * 10) / 10)); if (G.volume > 0 && G.muted) G.muted = false; saveGame(); beep(660, 0.08, 'triangle', 0.05); this.soundRefresh(); }
  adjustVolume(dir) { this.setVolume(G.volume + dir * 0.1); }
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
    const bx = this.bx, by = this.by, bw = this.bw;
    this.warn(bx, by, bw, 122, 'THESE USE YOUR OWN ACCOUNTS AND MAY COST YOU MONEY',
      'Each spoken line goes to Deepgram, and each line you type to a character goes to OpenAI or Anthropic, with your key. A key stays in this browser: never in the game files, never in the save, never anywhere else. What you type to a character is kept in this browser\'s save, so do not type anything private. With no keys the game works exactly as before.');
    SETTINGS.keyRows.forEach((r, i) => {
      const y = by + 154 + i * 58;
      this.txt(bx, y - 8, r.name, 15, '#cfefff', { style: { fontStyle: 'bold', letterSpacing: 1 } });
      this.txt(bx, y + 12, r.use, 11, '#5b7a92');
      this.slots['stat_' + r.id] = this.txt(bx + 148, y, '', 14, '#6b8296');
      this.slots['at_' + r.id] = { x: bx + 290, y: y - 17, w: 250, h: 34 };
      this.button(bx + 556, y, 70, 'Save', () => this.saveKey(r.id));
      this.button(bx + 632, y, 70, 'Test', () => this.testKey(r.id));
      this.button(bx + 708, y, 90, 'Forget', () => this.forgetKey(r.id), { color: '#ff8da0', edge: RED });
      this.inputs[r.id] = this.makeInput('password', 'paste your key here', 200, () => this.saveKey(r.id));
    });
    this.line(by + 154 + 3 * 58 - 10);
    const cy = by + 154 + 3 * 58 + 24;
    this.label(bx, cy, 'NPC CHAT');
    this.slots.chatOn = this.button(bx + 120, cy, 150, '', () => { chatSetOn(!CHAT.on); this.keysRefresh(); });
    this.label(bx + 300, cy, 'PROVIDER');
    this.slots.provs = [['', 'Auto'], ['openai', 'OpenAI'], ['anthropic', 'Anthropic']].map(([id, name], i) => {
      const b = this.button(bx + 390 + i * 110, cy, 104, name, () => { chatSetProvider(id); this.keysRefresh(); }); b.pid = id; return b;
    });
    const my = cy + 52;
    this.label(bx, my, 'MODEL  (blank = the provider\'s default)');
    this.slots.at_model = { x: bx + 290, y: my - 17, w: 300, h: 34 };
    this.inputs.model = this.makeInput('text', '', 60, () => this.saveModel());
    this.inputs.model.value = CHAT.model;
    this.inputs.model.addEventListener('change', () => this.saveModel());
    this.slots.counter = this.txt(bx + bw, my, '', 12, '#5b7a92', { ox: 1 });
    this.slots.status = this.txt(bx, my + 40, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 3 } });
    this.keysRefresh();
    this.say(!VOICE.key && !CHAT.keys.openai && !CHAT.keys.anthropic ? 'No keys yet: the game is silent and the characters keep their scripted lines.' : 'Keys are saved in this browser. Test asks the provider once, when you press it.');
  }
  keysRefresh() {
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

  // ---------- CONTROLS ----------
  draw_controls() {
    const bx = this.bx, by = this.by, bw = this.bw, n = CONTROLS.length, cw = bw / n;
    this.slots.tabs = CONTROLS.map((g, i) => this.button(bx + i * cw, by + 14, cw - 6, g.title, () => { this.ctab = g.id; this.show('controls'); }, { size: 12 }).mark(g.id === this.ctab));
    const g = controlsGroup(this.ctab);
    this.txt(bx, by + 66, g.scene ? 'WHAT THE KEYS DO IN THE ' + g.title + '  (the H page in the game shows the same)' : g.title, 11, '#5b7a92', { style: { letterSpacing: 2 } });
    g.rows.forEach((r, i) => {
      const y = by + 106 + i * 38; let x = bx + 8;
      r.k.forEach(k => { const cap = keyCap(this, k, AMBER); cap.setPosition(x + cap.kw / 2, y); this.body.add(cap); x += cap.kw + 5; });
      this.txt(bx + 200, y, r.t, 15, '#cfefff');
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
    const by = this.by;
    this.slots.contentEnd = contentBody(this, this.body, this.bx, by + 8, this.bw - 20);
  }

  // ---------- RESET ----------
  draw_reset() {
    const bx = this.bx, by = this.by, bw = this.bw;
    this.label(bx, by + 10, 'RESET GAME');
    this.txt(bx, by + 34, 'Erases your save: credits, ships, missions, the journal and everyone\'s memory of you. You start again at Halcyon Station with a Wren.\nYour keys, volume and voice choice are not part of the save and stay.', 14, '#cfefff', { oy: 0, style: { lineSpacing: 4 } });
    this.slots.reset = this.button(bx, by + 118, 250, 'Reset game', () => this.press('reset'), { color: '#ff8da0', edge: RED });
    this.line(by + 176);
    this.label(bx, by + 200, 'FORGET ALL KEYS');
    this.txt(bx, by + 224, 'Removes the Deepgram, OpenAI and Anthropic keys from this browser. The game goes back to silent ship and scripted characters.', 14, '#cfefff', { oy: 0, style: { wordWrap: { width: bw }, lineSpacing: 4 } });
    this.slots.forget = this.button(bx, by + 290, 250, 'Forget all keys', () => this.press('forget'), { color: '#ff8da0', edge: RED });
    this.slots.status = this.txt(bx, by + 350, '', 14, '#9fe9ff', { oy: 0, style: { wordWrap: { width: bw } } });
  }
  // a second press within four seconds confirms
  press(what) {
    const now = performance.now();
    if (this.armed && this.armed.what !== what) { this.armed = null; this.show('reset'); } // the other button was waiting: put it back
    const b = this.slots[what];
    if (!this.armed || this.armed.what !== what || now - this.armed.at > SETTINGS.confirmMs) {
      this.armed = { what, at: now }; this.say(what === 'reset' ? 'Press Reset game again to erase everything.' : 'Press Forget all keys again to remove them.', '#ff4d6d');
      b.set(what === 'reset' ? 'Press again to erase' : 'Press again').color('#ff4d6d').mark(true); return;
    }
    if (now - this.armed.at < 350) return; // a double tap is not a confirmation
    this.armed = null;
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
    this.slots.reset.set('Reset game').color('#ff8da0').mark(false); this.say('Game reset. Press any key on the title screen to start again.', '#6dff9c');
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
      else if (this.section === 'flight') this.stepFeel(1);
      else if (this.section === 'reset') this.press('reset');
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
}
