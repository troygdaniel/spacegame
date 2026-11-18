// ---------- Talk to the ship's computer (card space-game-ship-computer-listens; Troy, 17 Nov 2026) ----------
// Hold U, say the question, let go: the words are shown on screen and, after a short pause in which Esc cancels them, handed to the ship's computer
// (src/shipcomputer.js) exactly as if they had been typed in its box. This reverses the 13 Nov decision "no speech to text, no push to talk" (docs/VOICE.md
// records the new one). What stays the same is the rule of the whole voice side: nothing happens unless the player's own key is in this browser.
//   hold U (in space or in a station)   the browser opens the microphone, a red LISTENING mark shows and a short sound plays; the microphone is open
//                                       ONLY while the key is held (tracks stopped the moment it is let go, or Esc, or the window loses focus)
//   let go                              a second sound; the sound goes in ONE request to Deepgram (POST /v1/listen, on the Deepgram key of Settings > Keys,
//                                       in the Authorization header and nowhere else); the audio is dropped when the call ends: never saved, never kept
//   the words                           shown for 1.5 s (Esc cancels; holding U again says it again), then shipcompSubmit(words) asks the ship's computer
// It needs BOTH keys, the Deepgram one to hear and a chat key (OpenAI or Anthropic) for the computer to answer: with either missing a plain line says where
// to add it and nothing is recorded. A tap (under a third of a second) sends nothing; a silent microphone is sent (a level meter that could be wrong must never be the reason nothing is heard) and the empty answer says "I heard silence". A session may listen
// LISTEN.limit.minutes minutes (the player's account, the player's cost: Settings > Listen says so); the count is kept in memory, so a reload starts it again.
// The browser asks for the microphone itself. Denied, no device, not a secure page and a game opened from a file each get a plain line. 127.0.0.1 is a
// secure context, so `node tools/serve.mjs` asks once; opened from a file the browser may ask every time or refuse (Settings > Listen says so).
// One request after the key is let go, not a stream: the words appear a moment after the release, not word by word. A live stream over a WebSocket is
// a later card; the interface below does not change for it.
//
// THE INTERFACE (Settings and the tests use these):
//   listenReady()          { ok, code, say }: may a hold start now; code off (a silent no), nokey, badkey, nochat, chatoff, chatbad, limit, insecure, nomic
//   listenStatus()         { ok, line, color }: the Settings > Listen status line
//   listenHint()           { text, warn }: the one-line hint about the microphone and `node tools/serve.mjs`
//   listenMicTest()        Promise<string>: opens the microphone for an instant and says how it went; sends nothing anywhere
//   listenUsedLine()       'This session: 1.4 of 10 minutes.'
//   listenSetOn(on)        the player's switch, kept in this browser
//   listenTranscribe(blob) Promise<{ text } | { error, code }>: the one call, never throws
//   listenHeld()           how many pieces of audio or microphone the game holds right now: 0 when idle (the test of "nothing is kept")
// A hold is a small state machine in LISTEN.s: idle, opening (the microphone is being asked for), listening, stopping, hearing, review (the words wait their
// pause). Every async step checks LISTEN.s.seq, so a cancel or a new hold makes the older one's answer fall on the floor.
const LISTEN = {
  code: 'KeyU', cap: 'U',                 // the key to hold: no scene binds it (tests/listen.mjs reads the sources to prove it); T is taken in both places
  on: true,                              // the player's switch (Settings > Listen), kept in this browser
  host: 'api.deepgram.com', url: 'https://api.deepgram.com/v1/listen', model: 'nova-3',
  mimes: ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'], // the recorder's formats, the first this browser can make (Deepgram reads all of them)
  limit: { minutes: 10, hold: 20000, tap: 350, grace: 1500, wait: 15000, chars: 240, terms: 30, quiet: 0.02, line: 4500 },
  store: { on: 'longhaul.listen.on' },
  say: {                                 // the plain lines; {key} is the key to hold
    nokey: 'Listening needs a Deepgram key: Settings > Keys.',
    badkey: 'Deepgram rejected the key: check it in Settings > Keys.',
    nochat: 'The ship\'s computer needs a chat key (OpenAI or Anthropic) to answer: Settings > Keys.',
    chatoff: 'NPC chat is switched off, and the ship\'s computer with it: Settings > Keys.',
    chatbad: 'The chat key was rejected, so the ship\'s computer cannot answer: Settings > Keys.',
    limit: 'That is this session\'s {minutes} minutes of listening. Type with I, or reload the game to start the count again.',
    insecure: 'The browser lets a page use the microphone only from a secure address. Run node tools/serve.mjs and open http://127.0.0.1:8787/ .',
    nomic: 'This browser cannot record from a microphone. Try a current Chrome, Edge or Firefox.',
    denied: 'The microphone is blocked for this page. Allow it (the icon beside the address), then hold {key} again.',
    nodevice: 'No microphone found. Plug one in or pick one in the browser\'s settings, then try again.',
    busy: 'The microphone would not start: another app may be using it.',
    failed: 'The microphone did not start. Try again.',
    norecord: 'The browser could not start recording. Try again.',
    ready: 'The microphone is ready. Hold {key}, speak, and let go.',
    tap: 'Hold {key} while you speak, and let go to send.',
    silent: 'I heard silence. Check the microphone the browser is using, then try again.',
    nothing: 'I did not catch anything. Hold {key}, speak, and let go.',
    cancelled: 'Cancelled.',
    nobox: 'I could not open the ship\'s computer here. Close what is open, then hold {key} again.',
    rejected: 'Deepgram rejected the key: check it in Settings > Keys.',
    credit: 'Deepgram says the account has no credit left.',
    slow: 'Deepgram was too slow to answer. Try again.',
    network: 'Could not reach Deepgram. Check the connection and try again.',
    rate: 'Deepgram says too many requests. Wait a moment and try again.',
    other: 'Deepgram could not hear that (error {n}). Try again.',
    badreply: 'Deepgram sent something I cannot read. Try again.'
  },
  s: { state: 'idle', held: false, seq: 0, stream: null, rec: null, chunks: [], blob: null, mime: '', t0: 0, used: 0, calls: 0, words: '', send: false, peak: 0, level: 0,
    meter: null, tick: 0, timer: 0, stopTimer: 0, line: null, lineTimer: 0, lastSay: -1e9, short: false, silent: false },
  el: null, game: null
};
const lsSay = (k, v) => String(LISTEN.say[k] || k).replace(/\{(\w+)\}/g, (all, n) => (n === 'key' ? LISTEN.cap : n === 'minutes' ? LISTEN.limit.minutes : v && v[n] !== undefined ? v[n] : all));
const lsClean = (t, max) => String(t == null ? '' : t).replace(typeof CHAT_BAD !== 'undefined' ? CHAT_BAD : /[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || LISTEN.limit.chars); // CHAT_BAD (src/chat.js): control and invisible characters
const lsNow = () => performance.now();
const lsTry = (fn, fallback) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (e) { return fallback; } };

// ---------- the switch (kept in this browser, like the voice's) ----------
function listenLoad() { try { LISTEN.on = localStorage.getItem(LISTEN.store.on) !== '0'; } catch (e) { /* storage is optional */ } }
function listenSetOn(on) { LISTEN.on = !!on; try { localStorage.setItem(LISTEN.store.on, on ? '1' : '0'); } catch (e) { /* storage is optional */ } if (!LISTEN.on) listenCancel(''); }

// ---------- what the browser has, and may a hold start ----------
const listenSecure = () => !(typeof window !== 'undefined' && window.isSecureContext === false);
const listenFromFile = () => lsTry(() => location.protocol === 'file:', false);
const listenHasMic = () => lsTry(() => !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder === 'function'), false);
const listenMs = () => Math.round(LISTEN.s.used);
const listenLeft = () => Math.max(0, LISTEN.limit.minutes * 60000 - LISTEN.s.used);
function listenReady() {
  const no = (code, say) => ({ ok: false, code, say: say ? lsSay(say) : '' });
  if (!LISTEN.on) return no('off', '');
  if (typeof VOICE === 'undefined' || !VOICE.key) return no('nokey', 'nokey');
  if (VOICE.bad) return no('badkey', 'badkey');
  if (typeof CHAT === 'undefined' || !CHAT.key) return no('nochat', 'nochat');
  if (!CHAT.on) return no('chatoff', 'chatoff');
  if (CHAT.bad) return no('chatbad', 'chatbad');
  if (listenLeft() <= 0) return no('limit', 'limit');
  if (!listenSecure() || !lsTry(() => navigator.mediaDevices, null)) return no('insecure', 'insecure'); // a page that is not a secure context has no mediaDevices at all
  if (!listenHasMic()) return no('nomic', 'nomic');
  return { ok: true, code: 'ok', say: '' };
}
function listenUsedLine() { return 'This session: ' + (LISTEN.s.used / 60000).toFixed(1) + ' of ' + LISTEN.limit.minutes + ' minutes of listening.'; }
function listenStatus() {
  const r = listenReady();
  if (r.ok) return { ok: true, line: 'Ready: hold ' + LISTEN.cap + ' in space or in a station, speak, and let go.', color: '#6dff9c' };
  if (r.code === 'off') return { ok: false, line: 'Listening is switched off.', color: '#8fb4c9' };
  return { ok: false, line: r.say, color: '#ffb454' };
}
// the hint under the switch: where the microphone is allowed to work, always shown, amber when this page is one where it may not
function listenHint() {
  const text = lsTry(() => uiText('listen.hint'), ''), plain = text && text !== 'listen.hint' ? text : 'Run node tools/serve.mjs and open http://127.0.0.1:8787/ : the browser then asks for the microphone once. From a file it may ask every time, or refuse.';
  return { text: plain, warn: !listenSecure() || listenFromFile() };
}

// ---------- the microphone ----------
function listenMicError(e) {
  const n = String((e && e.name) || '');
  if (/^(NotAllowedError|PermissionDeniedError|SecurityError)$/.test(n)) return lsSay('denied') + (listenFromFile() ? ' ' + lsSay('insecure') : '');
  if (/^(NotFoundError|DevicesNotFoundError|OverconstrainedError)$/.test(n)) return lsSay('nodevice');
  if (/^(NotReadableError|TrackStartError|AbortError)$/.test(n)) return lsSay('busy');
  return lsSay('failed');
}
function listenStopStream(stream) { try { if (stream && stream.getTracks) stream.getTracks().forEach(t => { try { t.stop(); } catch (e) { /* already ended */ } }); } catch (e) { /* nothing to stop */ } }
const listenMime = () => lsTry(() => LISTEN.mimes.find(m => MediaRecorder.isTypeSupported(m)) || '', '');
// Settings > Listen: open the microphone for an instant (this is what makes the browser ask), close it, say how it went. Nothing is recorded or sent
async function listenMicTest() {
  if (!listenSecure()) return lsSay('insecure');
  if (!listenHasMic()) return lsSay('nomic');
  let stream = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return listenMicError(e); }
  listenStopStream(stream);
  return 'The microphone works. Hold ' + LISTEN.cap + ' in space or in a station, speak, and let go.';
}
// the loudest sample of a block of 8-bit time-domain samples (128 is silence), 0 to 1
function listenPeak(bytes) { let m = 0; for (let i = 0; i < bytes.length; i++) m = Math.max(m, Math.abs(bytes[i] - 128)); return m / 128; }
const listenMeter = (level, n = 8) => { const k = Math.max(0, Math.min(n, Math.round(Math.sqrt(Math.max(0, level)) * n * 1.2))); return '|'.repeat(k) + '.'.repeat(n - k); };

// ---------- the one call ----------
// the game's own words help it hear its names (a star, a ship): Deepgram's keyterms, which need no training and cost nothing extra. A few dozen at most
function listenTerms() {
  const out = [];
  const add = t => { t = lsClean(t, 40).replace(/[^\w' -]/g, ''); if (t && t.length > 2 && !out.includes(t) && out.length < LISTEN.limit.terms) out.push(t); };
  lsTry(() => add(shipcompName()), 0);
  lsTry(() => Object.keys(SHIP_MODELS).forEach(k => add(SHIP_MODELS[k].name)), 0);
  lsTry(() => Object.keys(SYSTEMS).forEach(k => add(SYSTEMS[k].name || k)), 0);
  return out;
}
function listenUrl(terms) {
  return LISTEN.url + '?model=' + LISTEN.model + '&smart_format=true' + (terms ? listenTerms().map(t => '&keyterm=' + encodeURIComponent(t)).join('') : '');
}
// blob: the recording. Resolves { text } (cleaned, maybe empty) or { error, code }. The key goes in the Authorization header and nowhere else, and never
// into a line this returns. A 400 is tried once more without the keyterms (a server that does not know them); everything else is a plain line.
async function listenTranscribe(blob, terms = true) {
  if (typeof VOICE === 'undefined' || !VOICE.key) return { error: lsSay('nokey'), code: 'nokey' };
  const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (e) { /* done */ } }, LISTEN.limit.wait);
  let res;
  LISTEN.s.calls++;
  try {
    res = await fetch(listenUrl(terms), { method: 'POST', headers: { Authorization: 'Token ' + VOICE.key, 'Content-Type': String((blob && blob.type) || 'audio/webm').split(';')[0] }, body: blob, signal: ctl ? ctl.signal : undefined });
  } catch (e) {
    return e && e.name === 'AbortError' ? { error: lsSay('slow'), code: 'timeout' } : { error: lsSay('network'), code: 'network' };
  } finally { clearTimeout(timer); }
  if (res.status === 401 || res.status === 403) return { error: lsSay('rejected'), code: 'rejected' };
  if (res.status === 402) return { error: lsSay('credit'), code: 'credit' };
  if (res.status === 429) return { error: lsSay('rate'), code: 'rate' };
  if (res.status === 400 && terms) return listenTranscribe(blob, false);
  if (!res.ok) return { error: lsSay('other', { n: res.status }), code: 'error' };
  let j; try { j = await res.json(); } catch (e) { return { error: lsSay('badreply'), code: 'badreply' }; }
  const alt = j && j.results && j.results.channels && j.results.channels[0] && j.results.channels[0].alternatives && j.results.channels[0].alternatives[0];
  if (!alt || typeof alt.transcript !== 'string') return { error: lsSay('badreply'), code: 'badreply' };
  return { text: lsClean(alt.transcript) };
}

// ---------- what is on the screen ----------
// A pure view of the state: { mark, head, body } or null. mark is the colour of the dot: red while the microphone is open.
function listenView(now = lsNow()) {
  const S = LISTEN.s, L = S.line;
  if (S.state === 'opening') return { mark: 'amber', head: 'OPENING THE MICROPHONE', body: 'If the browser asks, choose Allow.' };
  if (S.state === 'listening') return { mark: 'red', head: 'LISTENING  ' + Math.max(0, (now - S.t0) / 1000).toFixed(1) + ' s', body: listenMeter(S.level) + '   let go to send   Esc cancels' };
  if (S.state === 'stopping' || S.state === 'hearing') return { mark: 'cyan', head: 'HEARING YOU', body: '' };
  if (S.state === 'review') return { mark: 'green', head: '"' + S.words + '"', body: 'Asking the ship\'s computer   Esc cancels   ' + LISTEN.cap + ' again to say it again' };
  if (L && now < L.until) return { mark: L.kind === 'warn' ? 'amber' : 'cyan', head: L.text, body: L.words ? '"' + L.words + '"' : '' };
  return null;
}
const LISTEN_CSS = { red: '#ff4d6d', amber: '#ffb454', cyan: '#9fe9ff', green: '#6dff9c' };
function listenDom() { // the mark is a plain HTML box over the canvas: it is the same in every scene and never touches Phaser
  if (LISTEN.el) return LISTEN.el;
  if (typeof document === 'undefined' || !document.body) return null;
  try {
    const mk = (css) => { const e = document.createElement('div'); e.style.cssText = css; return e; };
    const root = mk('position:fixed;z-index:60;pointer-events:none;display:none;min-width:260px;max-width:640px;padding:10px 18px;background:rgba(4,12,24,0.92);border:1px solid #38e1ff;border-radius:4px;'
      + 'font:600 16px ui-monospace,Menlo,Consolas,monospace;color:#cfefff;text-align:center;letter-spacing:1px');
    const head = mk('font-size:18px;margin-bottom:4px;word-wrap:break-word'), body = mk('font-size:12px;opacity:0.85;letter-spacing:0');
    root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite'); root.appendChild(head); root.appendChild(body); document.body.appendChild(root);
    LISTEN.el = { root, head, body };
  } catch (e) { LISTEN.el = null; }
  return LISTEN.el;
}
function listenPaint() {
  const v = listenView(), d = listenDom(); if (!d) return v;
  try {
    if (!v) { d.root.style.display = 'none'; return v; }
    const c = LISTEN_CSS[v.mark] || LISTEN_CSS.cyan, canvas = typeof window !== 'undefined' && window.game && window.game.canvas, r = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    d.head.textContent = (v.mark === 'red' ? '● ' : '') + v.head; d.body.textContent = v.body;
    Object.assign(d.root.style, { display: 'block', borderColor: c, color: v.mark === 'red' ? c : '#cfefff', left: r ? (r.left + r.width / 2) + 'px' : '50%', top: r ? (r.top + r.height * 0.1) + 'px' : '10%', transform: 'translateX(-50%)' });
    d.head.style.color = c; d.root.style.boxShadow = v.mark === 'red' ? '0 0 18px rgba(255,77,109,0.55)' : 'none';
  } catch (e) { /* the mark is a nicety: the hold works without it */ }
  return v;
}
// a plain line for a few seconds (a refusal, a hint, an error). words: the transcript to show under it, when there is one. Said once every few seconds per text
function listenLine(text, kind = 'warn', words = '') {
  const S = LISTEN.s, now = lsNow();
  S.line = { text, kind, words, until: now + LISTEN.limit.line };
  clearTimeout(S.lineTimer); S.lineTimer = setTimeout(() => { if (S.line && lsNow() >= S.line.until - 50) { S.line = null; listenPaint(); } }, LISTEN.limit.line + 100);
  listenPaint();
}
const listenSound = name => { try { if (typeof sfx === 'function') sfx(name); } catch (e) { /* sound is optional */ } };

// ---------- one hold ----------
function listenScene(game) { // the scene the computer can open over: the Space or Station scene that is running (a paused one, behind a menu, is not)
  if (!game || !game.scene || game.scene.isActive('ShipComputer')) return null;
  return game.scene.getScenes(true).find(sc => sc.scene.key === 'Space' || sc.scene.key === 'Station') || null;
}
// the same things that keep shipcompOpen from opening the box (src/shipcomputer.js), asked early so the player is not asked to speak into a box that will not open
const listenBlocked = s => !!(s.leaving || s.dead || s.panel || s.talk || s.shopOpen || s.jmp || (s.cr && s.cr.navOpen));
// the words waiting for their pause, the sending, a recording, the microphone: all of it, forgotten
function listenReset(keepLine) {
  const S = LISTEN.s;
  clearTimeout(S.timer); clearInterval(S.tick); clearTimeout(S.stopTimer);
  if (S.meter) { lsTry(() => S.meter.src.disconnect(), 0); S.meter = null; }
  listenStopStream(S.stream); S.stream = null; S.rec = null; S.chunks = []; S.blob = null;
  S.held = false; S.state = 'idle'; S.words = ''; S.send = false; S.short = false; S.silent = false; S.peak = 0; S.level = 0; S.tick = 0; S.timer = 0;
  if (!keepLine) { S.line = null; clearTimeout(S.lineTimer); }
}
function listenCancel(say = LISTEN.say.cancelled) {
  const S = LISTEN.s, was = S.state; S.seq++; // whatever is in flight now answers into the void
  if (was === 'listening') { S.used += Math.max(0, lsNow() - S.t0); listenSound('uiClose'); }
  const rec = S.rec; if (rec) { rec.ondataavailable = null; rec.onstop = null; lsTry(() => rec.stop(), 0); } // the recorder is told to stop; what it has is not wanted
  listenReset(false);
  if (say && was !== 'idle') listenLine(say, 'info'); else listenPaint();
}
function listenPress(game) {
  const S = LISTEN.s, scene = listenScene(game);
  if (S.held || S.state === 'opening' || S.state === 'listening' || S.state === 'stopping' || S.state === 'hearing') return false; // a hold is on, or its sound is on its way
  if (!LISTEN.on || !scene) return false;                                // not ours: in a menu, on the title, in the map the key is only a key
  const r = listenReady(), say = r.ok && listenBlocked(scene) ? { say: lsSay('nobox') } : r;
  if (say.say) { if (lsNow() - S.lastSay > 2000) { S.lastSay = lsNow(); listenLine(say.say, 'warn'); } return false; }
  if (!r.ok) return false;
  listenReset(true);                                                      // words that were waiting for their pause are replaced by this hold
  S.held = true; S.state = 'opening'; listenPaint();
  listenOpen(++S.seq);
  return true;
}
async function listenOpen(seq) {
  const S = LISTEN.s; let stream = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { if (seq === S.seq) { listenReset(false); listenLine(listenMicError(e), 'warn'); } return; }
  if (seq !== S.seq) { listenStopStream(stream); return; }                  // cancelled while the browser was asking
  if (!S.held) {                                                              // let go before it was ready (the first time the browser asks first): nothing was recorded
    listenStopStream(stream); listenReset(false); listenLine(lsSay('ready'), 'info'); return;
  }
  let rec = null; const mime = listenMime();
  try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e) { listenStopStream(stream); listenReset(false); listenLine(lsSay('norecord'), 'warn'); return; }
  S.stream = stream; S.rec = rec; S.chunks = []; S.mime = mime || rec.mimeType || ''; S.peak = 0; S.level = 0; S.silent = false;
  rec.ondataavailable = ev => { if (seq === S.seq && ev && ev.data && ev.data.size) S.chunks.push(ev.data); };
  rec.onstop = () => listenStopped(seq);
  try { rec.start(); } catch (e) { listenReset(false); listenLine(lsSay('norecord'), 'warn'); return; }
  // a level bar, and the proof that the microphone hears something: a node that only listens, nothing from it goes to the speakers
  lsTry(() => { if (typeof AC !== 'undefined' && AC && AC.createMediaStreamSource) { resumeAudio(); const src = AC.createMediaStreamSource(stream), an = AC.createAnalyser(); an.fftSize = 512; src.connect(an); S.meter = { src, an, buf: new Uint8Array(an.fftSize) }; } }, 0);
  S.t0 = lsNow(); S.state = 'listening'; listenSound('uiOpen');
  clearInterval(S.tick); S.tick = setInterval(listenTick, 100);
  listenPaint();
}
function listenSample() { const S = LISTEN.s; if (S.meter) lsTry(() => { S.meter.an.getByteTimeDomainData(S.meter.buf); S.level = listenPeak(S.meter.buf); S.peak = Math.max(S.peak, S.level); }, 0); }
function listenTick() { // every 100 ms while the key is held: the level, the seconds, and the longest hold
  const S = LISTEN.s; if (S.state !== 'listening') return;
  listenSample();
  if (lsNow() - S.t0 >= Math.min(LISTEN.limit.hold, listenLeft())) { listenRelease('cap'); return; }
  listenPaint();
}
// why: key (let go: send) or cap (held as long as it may be: send). A hold under LISTEN.limit.tap is a tap: nothing is sent
function listenRelease(why = 'key') {
  const S = LISTEN.s;
  if (S.state !== 'listening') { S.held = false; return; }                   // 'opening': listenOpen sees the key is up when the microphone is ready
  const ms = lsNow() - S.t0, rec = S.rec, seq = S.seq;
  listenSample();
  // a microphone the level meter heard nothing from: only used to say so when the transcript comes back empty (a suspended audio context reads as silence, so it is not believed then)
  S.silent = !!S.meter && lsTry(() => AC.state === 'running', false) && ms > 600 && S.peak < LISTEN.limit.quiet;
  S.held = false; S.used += ms; S.state = 'stopping'; clearInterval(S.tick); S.tick = 0;
  S.short = ms < LISTEN.limit.tap; S.send = why !== 'blur' && !S.short;
  listenSound('uiClose');
  if (S.meter) { lsTry(() => S.meter.src.disconnect(), 0); S.meter = null; }
  try { rec.stop(); } catch (e) { /* already stopped */ }
  listenStopStream(S.stream); S.stream = null;                                 // the microphone is closed from this moment, before anything is sent
  S.stopTimer = setTimeout(() => { if (seq === S.seq && S.state === 'stopping') listenStopped(seq); }, 1500); // a recorder that never says it stopped must not hang the hold
  listenPaint();
}
function listenStopped(seq) {
  const S = LISTEN.s; if (seq !== S.seq || S.state !== 'stopping') return;
  clearTimeout(S.stopTimer);
  const chunks = S.chunks, mime = S.mime, send = S.send, short = S.short, silent = S.silent;
  S.chunks = []; S.rec = null;
  if (!send) { listenReset(true); listenLine(short ? lsSay('tap') : lsSay('cancelled'), 'info'); return; }
  let blob = null; try { blob = new Blob(chunks, { type: mime || 'audio/webm' }); } catch (e) { blob = null; }
  chunks.length = 0;
  if (!blob || !blob.size) { listenReset(true); listenLine(lsSay('nothing'), 'warn'); return; }
  listenHear(blob, seq, silent);
}
async function listenHear(blob, seq, silent) {
  const S = LISTEN.s; S.state = 'hearing'; S.blob = blob; listenPaint();
  let r; try { r = await listenTranscribe(blob); } catch (e) { r = { error: lsSay('network'), code: 'network' }; }
  blob = null; if (seq === S.seq) S.blob = null;                              // the audio is dropped: it is not kept after the call, whatever the answer was
  if (seq !== S.seq) return;                                                  // cancelled while Deepgram was listening: the words are not wanted
  if (!r.text) { listenReset(true); listenLine(r.error || lsSay(silent ? 'silent' : 'nothing'), 'warn'); return; }
  S.words = r.text; S.state = 'review'; listenPaint();
  S.timer = setTimeout(() => listenGo(seq), LISTEN.limit.grace);              // the pause in which Esc cancels the words (or the key again says them again)
}
function listenGo(seq) {
  const S = LISTEN.s; if (seq !== S.seq || S.state !== 'review') return false;
  const words = S.words; listenReset(false);
  let ok = false; try { ok = !!shipcompSubmit(words, LISTEN.game || (typeof window !== 'undefined' ? window.game : undefined)); } catch (e) { ok = false; }
  if (ok) listenPaint(); else listenLine(lsSay('nobox'), 'warn', words);
  return ok;
}
// how many pieces of audio or microphone are held now: the proof that nothing is kept
function listenHeld() { const S = LISTEN.s; return S.chunks.length + (S.blob ? 1 : 0) + (S.stream ? 1 : 0) + (S.rec ? 1 : 0); }

// ---------- keys, once for the whole game ----------
// The listeners are on the window, in the capture phase: they see Esc before Phaser does (an Esc that cancels the words must not also open the pause menu)
function listenTyping() { const el = typeof document !== 'undefined' ? document.activeElement : null; return !!(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(String(el.tagName)) || el.isContentEditable === true)); }
function listenKeyDown(e, game) {
  const S = LISTEN.s;
  if (e.code === 'Escape') {
    if (S.state === 'idle') return;
    e.preventDefault(); e.stopPropagation(); listenCancel(); return;
  }
  if (e.code !== LISTEN.code || e.ctrlKey || e.metaKey || e.altKey || listenTyping()) return;
  if (e.repeat) { if (S.held) e.preventDefault(); return; }
  if (!LISTEN.on || !listenScene(game)) return;
  e.preventDefault(); listenPress(game);
}
function listenKeyUp(e) { if (e.code === LISTEN.code && LISTEN.s.held) { e.preventDefault(); listenRelease('key'); } }
function listenInstall(game) {
  LISTEN.game = game; listenLoad();
  window.addEventListener('keydown', e => listenKeyDown(e, game), true);
  window.addEventListener('keyup', listenKeyUp, true);
  window.addEventListener('blur', () => { if (LISTEN.s.state === 'listening' || LISTEN.s.state === 'opening') listenCancel(); });
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.hidden && (LISTEN.s.state === 'listening' || LISTEN.s.state === 'opening')) listenCancel(); });
}
if (typeof window !== 'undefined' && window.game && window.game.scene && typeof window.game.scene.add === 'function') listenInstall(window.game);
