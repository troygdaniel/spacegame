// ---------- NPC chat (optional): the bar characters answer in free text through a model on the player's OWN key ----------
// OFF unless the player pastes their own OpenAI or Anthropic key (Pause > NPC chat, or C on the title screen). No key = the game
// is exactly as before and nothing is sent anywhere. The key lives only in this browser's localStorage, never in the save file,
// never in the repo, never logged or put in a message, and goes only to the API host it belongs to. Design: docs/NPC-CHAT.md.
// This file is the adapter and the setup panel (card space-game-npc-chat-adapter). The chat box in the bar, the prompt and the
// memory come with the next cards; they call chatComplete() and nothing else.
const CHAT_STORE = { key: 'longhaul.chat.key', on: 'longhaul.chat.on', provider: 'longhaul.chat.provider', model: 'longhaul.chat.model' };
const CHAT_PROVIDERS = { // one adapter, two providers (Troy, 2026-11-13: OpenAI first, Anthropic second)
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5-mini' },
  anthropic: { name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages', model: 'claude-haiku-5-5' }
};
const CHAT_TIMEOUT = 20000, CHAT_WAIT = 20000, CHAT_PAUSE = 60000; // one call's limit; the wait after a 429; the pause after three network failures
const CHAT = { key: '', on: true, provider: '', model: '', bad: false, fails: 0, pauseUntil: 0, waitUntil: 0, calls: 0 };

// ---------- the key and the settings (localStorage is optional: every call is wrapped) ----------
function chatStore(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage is optional */ } }
function chatLoad() {
  try {
    CHAT.key = (localStorage.getItem(CHAT_STORE.key) || '').trim(); CHAT.on = localStorage.getItem(CHAT_STORE.on) !== '0';
    CHAT.provider = localStorage.getItem(CHAT_STORE.provider) || ''; CHAT.model = (localStorage.getItem(CHAT_STORE.model) || '').trim();
  } catch (e) { /* storage is optional */ }
  if (!CHAT_PROVIDERS[CHAT.provider]) CHAT.provider = '';
  CHAT.bad = false;
}
function chatSetKey(k) {
  CHAT.key = String(k || '').trim(); CHAT.bad = false; CHAT.fails = 0; CHAT.pauseUntil = 0; CHAT.waitUntil = 0;
  chatStore(CHAT_STORE.key, CHAT.key);
}
function chatSetOn(on) { CHAT.on = !!on; try { localStorage.setItem(CHAT_STORE.on, on ? '1' : '0'); } catch (e) { /* storage is optional */ } }
function chatSetProvider(p) { CHAT.provider = CHAT_PROVIDERS[p] ? p : ''; CHAT.bad = false; chatStore(CHAT_STORE.provider, CHAT.provider); } // '' = pick from the key
function chatSetModel(m) { CHAT.model = String(m || '').trim().replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 60); chatStore(CHAT_STORE.model, CHAT.model); } // '' = the provider's default
function chatGuessProvider(k) { return /^sk-ant-/.test(k) ? 'anthropic' : 'openai'; }
function chatProvider() { return CHAT.provider || chatGuessProvider(CHAT.key); }
function chatModel() { return CHAT.model || CHAT_PROVIDERS[chatProvider()].model; }
function chatUsable() { const now = performance.now(); return !!CHAT.key && CHAT.on && !CHAT.bad && now >= CHAT.pauseUntil && now >= CHAT.waitUntil; }
function chatStatus() { return !CHAT.key ? 'NO KEY' : CHAT.bad ? 'KEY REJECTED' : CHAT.on ? 'ON' : 'OFF'; }

// text from outside the game (the provider's error or reply): control characters out, length capped.
// chatPlain also hides anything that looks like a key or token, so a provider's message can never echo one.
const CHAT_BAD = new RegExp('[' + [[0, 8], [11, 12], [14, 31], [127, 159], [0x200B, 0x200F], [0x2028, 0x2029], [0x202A, 0x202E], [0x2060, 0x2064], [0x2066, 0x2069], [0xFEFF, 0xFEFF]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g'); // built from code points so no editor can mangle the characters
function chatPlain(s, max = 160) { return s ? String(s).replace(CHAT_BAD, '').replace(/[A-Za-z0-9_-]{24,}/g, '...').slice(0, max) : ''; }
function chatPlainReply(s) { return s ? String(s).replace(CHAT_BAD, '').replace(/\s+/g, ' ').trim().slice(0, 400) : ''; }

// ---------- the one call ----------
// chatComplete({ system, messages: [{ role: 'user' | 'assistant', content }], maxTokens }) -> { text } or { error, code }
// Never throws. codes: nokey, off, rejected, paused, busy, timeout, network, model, http, empty. The error is a plain-words line
// the caller may show; it never holds the key.
async function chatComplete(req) {
  const now = performance.now();
  if (!CHAT.key) return { error: 'No chat key. Paste one in Pause > NPC chat.', code: 'nokey' };
  if (!CHAT.on) return { error: 'NPC chat is off.', code: 'off' };
  if (CHAT.bad) return { error: 'The key was rejected. Check it in Pause > NPC chat.', code: 'rejected' };
  if (now < CHAT.pauseUntil) return { error: 'Could not reach the provider. Trying again in a minute.', code: 'paused' };
  if (now < CHAT.waitUntil) return { error: 'The provider asked us to wait a moment.', code: 'busy' };
  const p = chatProvider(), def = CHAT_PROVIDERS[p], model = chatModel(), max = Math.max(16, (req && req.maxTokens) | 0 || 120);
  const system = String((req && req.system) || '');
  const messages = ((req && req.messages) || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));
  let headers, body;
  if (p === 'anthropic') { // the browser-access header is what the Anthropic API needs before it answers a page at all
    headers = { 'content-type': 'application/json', 'x-api-key': CHAT.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    body = { model, system, messages, max_tokens: max };
  } else { // max_completion_tokens is the field every current OpenAI model accepts (max_tokens is refused by the reasoning models)
    headers = { 'content-type': 'application/json', Authorization: 'Bearer ' + CHAT.key };
    body = { model, messages: [{ role: 'system', content: system }].concat(messages), max_completion_tokens: max };
  }
  CHAT.calls++;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), CHAT_TIMEOUT) : null;
  let res;
  try { res = await fetch(def.url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined }); }
  catch (e) { if (timer) clearTimeout(timer); return chatFailed(e && e.name === 'AbortError' ? 'timeout' : 'network'); }
  if (timer) clearTimeout(timer);
  if (res.status === 401 || res.status === 403) { chatRejected(); return { error: 'The key was rejected by ' + def.name + '. Check it in Pause > NPC chat.', code: 'rejected' }; }
  if (res.status === 429) { CHAT.waitUntil = performance.now() + CHAT_WAIT; return { error: def.name + ' asked us to wait (rate limit or no credit left). Try again in 20 seconds.', code: 'busy' }; }
  let j = null;
  try { j = await res.json(); } catch (e) { j = null; }
  if (!res.ok) {
    const modelErr = res.status === 404 || res.status === 400, msg = chatPlain(j && j.error && (j.error.message || j.error.type));
    return { error: def.name + ' said no (' + res.status + ')' + (msg ? ': ' + msg : '') + (modelErr ? '. Check the model name in Pause > NPC chat.' : '.'), code: modelErr ? 'model' : 'http' };
  }
  CHAT.fails = 0;
  const raw = p === 'anthropic'
    ? (j && Array.isArray(j.content) && (j.content.find(c => c && c.type === 'text') || {}).text)
    : (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
  const text = chatPlainReply(raw);
  if (!text) return { error: 'The model sent nothing back. Try another model name in Pause > NPC chat.', code: 'empty' };
  return { text };
}
function chatFailed(code) {
  if (++CHAT.fails >= 3) { CHAT.fails = 0; CHAT.pauseUntil = performance.now() + CHAT_PAUSE; }
  return { error: code === 'timeout' ? 'The provider took too long to answer.' : 'Could not reach the provider.', code };
}
function chatRejected() {
  const first = !CHAT.bad; CHAT.bad = true;
  const s = window.game && window.game.scene.getScenes(true).find(sc => GAMEPLAY.includes(sc.scene.key));
  if (first && s) toast(s, 'NPC chat: the key was rejected. Check it in Pause > NPC chat.', '#ff4d6d');
}
// the setup panel's Test button: one real call on the player's own key; JUNO says hello
async function chatTest() {
  if (!CHAT.key) return 'Paste a key first.';
  CHAT.bad = false; CHAT.fails = 0; CHAT.pauseUntil = 0; CHAT.waitUntil = 0;
  const r = await chatComplete({
    system: 'You are JUNO, the bartender of the Drift, the bar on Halcyon Station in a small 2D space game. A pilot has just sat down. Greet them in one short sentence, in plain words, in character. No markdown.',
    messages: [{ role: 'user', content: '[The pilot sits down.]' }], maxTokens: 120
  });
  return r.text ? 'JUNO: "' + r.text + '"' : r.error;
}

// ---------- the setup panel: paste the key, pick the provider and model, test it, switch the chat on or off ----------
// Opened from the pause menu (meta.js) and from C on the title screen. The key and the model name go into real HTML inputs
// (so paste works) laid over the canvas, the way the ship-voice panel does it.
class ChatSetup extends Phaser.Scene {
  constructor() { super('ChatSetup'); }
  init(d) { this.from = (d && d.from) || 'Title'; this.closing = false; }
  create() {
    this.ui = panel(this, { w: 780, h: 580, title: 'NPC CHAT  -  OPTIONAL', dim: true, depth: 0 });
    const box = this.ui.box, add = o => { box.add(o); return o; };
    const txt = (x, y, s, size, color, o = {}) => add(this.add.text(x, y, s, uiFont(size, color, o.style)).setOrigin(o.ox || 0, o.oy || 0));
    txt(-360, -270, 'Talk with the people in the Drift bar in your own words. Each character answers in character through a model on your own OpenAI or Anthropic account, and remembers you.', 16, '#cfefff', { style: { wordWrap: { width: 720 }, lineSpacing: 4 } });
    const g = add(this.add.graphics());
    g.fillStyle(0x2a1a06, 0.9); g.fillRect(-360, -208, 720, 126); g.lineStyle(2, AMBER, 1); g.strokeRect(-360, -208, 720, 126); g.fillStyle(AMBER, 1); g.fillRect(-360, -208, 5, 126);
    txt(-342, -200, 'THIS USES YOUR OWN OPENAI OR ANTHROPIC ACCOUNT AND MAY COST YOU MONEY', 16, '#ffd37a', { style: { fontStyle: 'bold' } });
    txt(-342, -174, 'Every line you send goes to that provider with your key; an evening of talking costs cents. Your key is kept in this browser only: never in the game files, never anywhere else. What you type is kept in this browser\'s save, so do not type anything private. With no key the characters keep their scripted lines, exactly as before.', 15, '#ffe9c0', { style: { wordWrap: { width: 690 }, lineSpacing: 4 } });
    txt(-360, -66, 'API KEY  (OpenAI or Anthropic)', 13, '#5b7a92');
    txt(-360, 12, 'PROVIDER', 13, '#5b7a92'); txt(-150, 12, 'MODEL  (blank = the default)', 13, '#5b7a92');
    this.status = txt(0, 122, '', 16, '#9fe9ff', { ox: 0.5, style: { wordWrap: { width: 700 }, align: 'center' } });
    this.counter = txt(-360, 228, '', 13, '#5b7a92');
    this.btns = [];
    const btn = (label, x, y, fn) => {
      const w = 176, bg = add(this.add.rectangle(x, y, w, 40, 0x0a1b2c, 1).setStrokeStyle(2, CYAN, 0.9).setInteractive({ useHandCursor: true }));
      const t = txt(x, y, label, 16, '#9fe9ff', { ox: 0.5, oy: 0.5 });
      bg.on('pointerover', () => bg.setFillStyle(0x10283d)); bg.on('pointerout', () => bg.setFillStyle(0x0a1b2c)); bg.on('pointerdown', fn);
      this.btns.push({ bg, t }); return t;
    };
    this.prov = btn('', -272, 50, () => { const order = ['', 'openai', 'anthropic']; chatSetProvider(order[(order.indexOf(CHAT.provider) + 1) % order.length]); this.refresh(); });
    btn('Save key', -276, 176, () => this.saveKey());
    btn('Test chat', -92, 176, () => this.test());
    this.onoff = btn('', 92, 176, () => { chatSetOn(!CHAT.on); this.refresh(); });
    btn('Remove key', 276, 176, () => { chatSetKey(''); this.el.value = ''; this.refresh('Key removed from this browser.'); });
    this.ui.setHints([['Enter', 'Save'], ['Esc', 'Back']]);

    // two real text boxes: the key (hidden as you type) and the model name
    this.el = this.makeInput('password', 'paste your OpenAI or Anthropic key here', 200, () => this.saveKey());
    this.elModel = this.makeInput('text', '', 60, () => this.saveModel());
    this.elModel.value = CHAT.model;
    this.elModel.addEventListener('change', () => this.saveModel());
    this.events.once('shutdown', () => this.dropInput());
    this.k = this.input.keyboard.addKeys('ESC');
    this.born = performance.now();
    this.refresh(CHAT.key ? 'A key is saved in this browser.' : 'No key yet: the characters keep their scripted lines.');
    setTimeout(() => { try { if (this.el) this.el.focus(); } catch (e) { /* focus is a nicety */ } }, 50);
  }
  makeInput(type, placeholder, maxLength, onEnter) {
    const el = document.createElement('input');
    el.type = type; el.placeholder = placeholder; el.autocomplete = 'off'; el.spellcheck = false; el.maxLength = maxLength;
    Object.assign(el.style, { position: 'fixed', zIndex: '20', boxSizing: 'border-box', background: '#04101c', color: '#ffd37a', border: '1px solid #ffb454', outline: 'none', fontFamily: 'monospace', padding: '0 10px' });
    ['keydown', 'keyup', 'keypress'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation())); // so Phaser and the M / Esc hooks do not see the typing
    el.addEventListener('keydown', e => { if (e.key === 'Enter') onEnter(); else if (e.key === 'Escape') this.close(); });
    document.body.appendChild(el);
    return el;
  }
  refresh(msg) {
    const p = chatProvider();
    this.ui.tagText.setText(chatStatus());
    this.prov.setText(CHAT.provider ? CHAT_PROVIDERS[p].name : 'Auto: ' + CHAT_PROVIDERS[p].name);
    this.onoff.setText(CHAT.on ? 'Turn chat off' : 'Turn chat on');
    if (this.elModel) this.elModel.placeholder = CHAT_PROVIDERS[p].model;
    this.counter.setText(CHAT.calls + (CHAT.calls === 1 ? ' call' : ' calls') + ' this session');
    if (msg !== undefined) this.status.setText(msg).setColor('#9fe9ff');
  }
  saveKey() {
    const v = this.el.value.trim();
    this.saveModel();
    if (!v) { this.refresh(CHAT.key ? 'The saved key is unchanged.' : 'Paste a key first.'); return; }
    if (v.length < 16 || /\s/.test(v)) { this.refresh('That does not look like an API key.'); return; }
    chatSetKey(v); chatSetOn(true); this.el.value = '';
    this.refresh('Key saved in this browser (' + CHAT_PROVIDERS[chatProvider()].name + '). Press Test chat to hear from JUNO.');
  }
  saveModel() { if (this.elModel) { chatSetModel(this.elModel.value); this.elModel.value = CHAT.model; } }
  async test() {
    this.saveModel();
    this.status.setText('Asking JUNO to say hello...').setColor('#ffd37a');
    const r = await chatTest();
    if (this.scene.isActive()) { this.refresh(r); this.status.setColor(/^JUNO:/.test(r) ? '#6dff9c' : '#ff4d6d'); }
  }
  dropInput() { [this.el, this.elModel].forEach(el => { if (el) el.remove(); }); this.el = null; this.elModel = null; }
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
    const r = this.game.canvas.getBoundingClientRect(), k = r.width / W, cx = W / 2, cy = H / 2; // the boxes follow the canvas when the window is resized
    const place = (el, x, y, w) => Object.assign(el.style, { left: (r.left + (cx + x) * k) + 'px', top: (r.top + (cy + y) * k) + 'px', width: w * k + 'px', height: 40 * k + 'px', fontSize: 17 * k + 'px' });
    place(this.el, -360, -50, 720); place(this.elModel, -150, 30, 510);
  }
}

function chatOpenSetup(scene) { // scene: the scene to pause and come back to (Pause or Title)
  if (scene.scene.manager.isActive('ChatSetup')) return;
  scene.scene.pause(); scene.scene.launch('ChatSetup', { from: scene.scene.key });
}
