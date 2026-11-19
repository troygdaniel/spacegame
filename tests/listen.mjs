// smoke: talk to the ship's computer: hold a key, speak, the words are shown and handed on; a mocked microphone, recorder and fetch (plain Node, no Chrome, no real call)
// Card space-game-ship-computer-listens (src/listen.js). Troy wants to talk to the ship's computer. The rules this holds, each as checks below:
//   A. the key is U and no scene binds it; the help, the controls table, the text file and docs/VOICE.md say so
//   B. may a hold start: no Deepgram key, no chat key, switched off, a rejected key, the session limit, an insecure page, no recorder: a plain line each, nothing is recorded or sent
//   C. one hold, start to finish: the microphone is asked for (audio only), the red mark shows, the microphone is CLOSED when the key is let go (before anything is sent),
//      ONE request goes to api.deepgram.com with the key in the Authorization header and nowhere else, the audio is dropped after the call, the words are shown, and after the
//      pause they are handed to the ship's computer exactly as typed
//   D. Esc: cancels while listening, while the words wait, while Deepgram is hearing; an Esc with nothing to cancel is left alone; the key again says it again
//   E. the edges: a tap, a release before the microphone was ready, a repeat, Ctrl, a text field, no Space or Station scene, the longest hold, a silent microphone, the window losing focus
//   F. every failure has a plain line and never the key: denied, no device, busy, from a file, 401, 402, 429, 500, the network, a timeout, a bad reply, an empty transcript, a 400 retried
//   G. the session limit counts the held time and cuts a hold short
//   H. the real shipcompSubmit takes the words (the box opens over the game and asks), and says so when it cannot
//   I. Settings: the section, the status, the hint, Test microphone (records and sends nothing), the switch kept in this browser
// Run: node tests/listen.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 900) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const read = f => readFileSync(join(ROOT, f), 'utf8');
const KEY = 'dg-test-' + 'k'.repeat(30), CHATKEY = 'sk-test-' + 'o'.repeat(28); // built from pieces: tests/hygiene.mjs looks for key-like strings in the repo
const WORDS = 'how do I get to the Roost';

// ---- the mocks: nothing here records a sound or calls a service ----
g.run(`
  window.__t = 1000; performance.now = () => window.__t;
  window.__pd = 0; window.__sp = 0; window.__sfx = []; sfx = n => { __sfx.push(n); };
  window.__gum = []; window.__tracks = []; window.__deny = null; window.__gumHold = null; window.__recs = []; window.__audio = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  navigator = { mediaDevices: { getUserMedia: c => {
    __gum.push(JSON.stringify(c)); if (__deny) { if (__deny === 'NotAllowedError') window.__perm = 'denied'; return Promise.reject(Object.assign(new Error('no'), { name: __deny })); } // a refusal is also the browser's answer to the permission query
    const tr = { stopped: false, stop() { this.stopped = true; } }; __tracks.push(tr); const st = { getTracks: () => [tr] };
    return __gumHold ? __gumHold.then(() => st) : Promise.resolve(st);
  } } };
  class FakeRecorder {
    static isTypeSupported(m) { return m === 'audio/webm;codecs=opus'; }
    constructor(stream, opts) { this.stream = stream; this.mimeType = (opts && opts.mimeType) || ''; this.state = 'inactive'; __recs.push(this); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; const me = this; setTimeout(() => { if (me.ondataavailable && window.__audio) me.ondataavailable({ data: new Blob([window.__audio], { type: me.mimeType }) }); if (me.onstop) me.onstop(); }, 0); }
  }
  MediaRecorder = FakeRecorder;
  window.__perm = 'prompt'; window.__permOn = []; navigator.permissions = { query: async () => { const p = { state: __perm, onchange: null }; __permOn.push(p); return p; } };
  window.__calls = []; window.__status = 200; window.__statuses = []; window.__fail = null; window.__say = ${JSON.stringify(WORDS)}; window.__hold = null;
  window.fetch = (url, opts) => {
    __calls.push({ url: String(url), headers: (opts && opts.headers) || {}, body: opts && opts.body, method: opts && opts.method });
    if (__fail === 'hang') return new Promise((_, rej) => { opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
    if (__fail) return Promise.reject(Object.assign(new TypeError('Failed to fetch'), { name: __fail }));
    const st = __statuses.length ? __statuses.shift() : __status;
    const done = () => st === 'badjson' ? new Response('not json', { status: 200 }) : new Response(JSON.stringify(st === 200 ? { results: { channels: [{ alternatives: [{ transcript: __say }] }] } } : { err_msg: 'mock ' + st }), { status: st === 'badjson' ? 200 : st });
    return __hold ? __hold.then(done) : Promise.resolve(done());
  };
  window.__els = [];
  document = { activeElement: null, hidden: false, body: { appendChild(e) { __els.push(e); } },
    createElement() { return { style: {}, textContent: '', attrs: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(k) { this.kids.push(k); } }; }, addEventListener() {} };
  window.__subs = []; window.__subOk = true; window.__realSubmit = shipcompSubmit; shipcompSubmit = (t, gm) => { __subs.push(t); return __subOk; };
  window.__sc = { scene: { key: 'Space', pause() { __fg.calls.push('pause'); } }, panel: false, talk: false, shopOpen: false, leaving: false, dead: false, jmp: null, cr: {} };
  window.__fg = { calls: [], scene: { isActive: k => false, getScene: () => null, getScenes: () => [__sc], run: (k, d) => __fg.calls.push('run ' + k + ' ' + d.from) } };
  window.__nofg = { calls: [], scene: { isActive: k => false, getScene: () => null, getScenes: () => [], run: () => {} } };
  LISTEN.limit.grace = 40; LISTEN.limit.wait = 60; // a short pause and a short timeout, so the test does not wait
`);
const press = (over = '{}', game = '__fg') => g.run(`listenKeyDown(Object.assign({ code: 'KeyU', repeat: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault() { __pd++; }, stopPropagation() { __sp++; } }, ${over}), ${game})`);
const up = () => g.run(`listenKeyUp({ code: 'KeyU', preventDefault() { __pd++; } })`);
const send = () => press(); // U again while it listens: send now
const esc = () => g.run(`listenKeyDown({ code: 'Escape', repeat: false, preventDefault() { __pd++; }, stopPropagation() { __sp++; } }, __fg)`);
const view = () => g.run(`LISTEN.el ? LISTEN.el.head.textContent + ' | ' + LISTEN.el.body.textContent + ' | ' + LISTEN.el.root.style.display : ''`);
const state = () => g.run('LISTEN.s.state');
const tick = ms => g.run(`(__t += ${ms}, listenTick(), 1)`);
const calls = () => g.run('__calls.length');
const settle = async (ms = 20) => new Promise(r => setTimeout(r, ms));
const RING = () => J('LISTEN.limit.ring');
const ticks = (ms, level, step = 100) => { if (level !== undefined) g.run(`window.__level = ${level}`); for (let i = 0; i < ms / step; i++) g.run(`(__t += ${step}, listenTick(), 1)`); }; // a fake clock in small steps, so the level is read as it goes
async function ring() { press(); tick(RING()); await g.waitFor("LISTEN.s.state === 'listening'", 3000, 'listening'); } // press, wait for the ring to fill, and it listens
async function hold(ms = 2000) { await ring(); tick(ms); }
async function reset() { g.run(`(listenCancel(''), window.__perm = 'prompt', LISTEN.s.perm = '', __t += 10000, LISTEN.s.used = 0, LISTEN.s.lastSay = -1e9, LISTEN.on = true, LISTEN.limit.minutes = 10, LISTEN.limit.hold = 20000, __gum.length = 0, __tracks.length = 0, __recs.length = 0, __calls.length = 0, __subs.length = 0, __fail = null, __deny = null, __gumHold = null, __hold = null, __status = 200, __statuses.length = 0, __audio = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), __subOk = true, document.activeElement = null, AC = null, __say = ${JSON.stringify(WORDS)}, 1)`); await settle(5); }
const keys = () => g.run(`(voiceSetKey(${JSON.stringify(KEY)}), voiceSetOn(true), chatSetKey(${JSON.stringify(CHATKEY)}, 'openai'), chatSetOn(true), VOICE.bad = false, CHAT.bad = false, 1)`);
const allText = () => g.run(`JSON.stringify([LISTEN.line, LISTEN.s.line, LISTEN.el && LISTEN.el.head.textContent, LISTEN.el && LISTEN.el.body.textContent, listenStatus()])`);

console.log('A. the key, and where it is written down');
{
  check('the key to hold is U', J('LISTEN.code') === 'KeyU' && J('LISTEN.cap') === 'U');
  const src = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js') && f !== 'listen.js');
  const hits = src.filter(f => { const t = read('src/' + f); return /'KeyU'|addKeys?\('(?:[A-Z,]*,)?U(?:,[A-Z,]*)?'\)|addKey\('U'|keydown-U\b|e\.key === 'u'/i.test(t) && !/^\s*\/\//.test(t); });
  check('no other file binds U: nothing else can answer the key', hits.length === 0, hits.join(' '));
  const t = J(`CONTROLS.flatMap(g => g.rows.filter(r => r.k.includes('U')).map(r => g.id + ': ' + r.t))`);
  check('the controls table names it in the station (the H page) and ANYWHERE (Settings > Controls)', t.some(x => /^station: Hold to talk/.test(x)) && t.some(x => /^any: Hold/.test(x)), t.join(' | '));
  check('the station H page has the line, from the table', J(`controlsHelp('Station')`).includes('U   hold to talk to the ship\'s computer') && /help\.station\.11 \| U   hold to talk to the ship's computer/.test(read('content/text/ui.md')));
  check('the text file has the three Settings lines, and the game reads them as content', ['listen.use', 'listen.cost', 'listen.hint'].every(k => new RegExp('\\| ' + k.replace('.', '\\.') + ' \\|').test(read('content/text/ui.md')) && J(`uiText('${k}', { key: 'U', minutes: 10 })`) !== k));
  check('{key} and {minutes} are filled in', /Hold U in space/.test(J(`uiText('listen.use', { key: LISTEN.cap, minutes: LISTEN.limit.minutes })`)) && /10 minutes/.test(J(`uiText('listen.cost', { key: LISTEN.cap, minutes: LISTEN.limit.minutes })`)));
  const doc = read('docs/VOICE.md');
  check('docs/VOICE.md records the decision with its date, that it reverses 13 Nov, and the rules', /Decision \(Troy, 2026-11-17\)/.test(doc) && /Reversed on 2026-11-17/.test(doc) && /Hold \*\*U\*\*/.test(doc) && /Nothing is recorded or kept/.test(doc));
  const html = read('index.html');
  check('index.html loads src/listen.js after src/shipcomputer.js, with its own script tag', html.indexOf('src/listen.js') > html.indexOf('src/shipcomputer.js') && html.split('src/listen.js').length === 2);
  const lsrc = read('src/listen.js'), keyLines = lsrc.split('\n').filter(l => /VOICE\.key/.test(l) && !/^\s*\/\//.test(l));
  check('the Deepgram key is read in only two ways: a check that it exists, and the Authorization header', keyLines.every(l => /!VOICE\.key/.test(l) || /Authorization: 'Token ' \+ VOICE\.key/.test(l)), keyLines.join(' || ').slice(0, 300));
  check('the only things listen.js stores in this browser are the switch and the two flags that the browser has asked for the microphone before, and that the early question was asked (no sound, no words)', (lsrc.match(/localStorage\.(setItem|getItem|removeItem)\(([^,)]+)/g) || []).every(m => /LISTEN\.store\.(on|asked|nagged)/.test(m)), (lsrc.match(/localStorage\.\w+\([^,)]+/g) || []).join(' '));
}

console.log('B. may a hold start');
await reset();
{
  check('no Deepgram key: a plain line that says where, nothing recorded, nothing sent', (press(), true) && g.run('listenReady().code') === 'nokey' && /Deepgram key: Settings > Keys/.test(await view()) && J('__gum.length') === 0 && await calls() === 0, await view());
  g.run(`voiceSetKey(${JSON.stringify(KEY)})`); g.run('__t += 5000');
  press();
  check('a Deepgram key and no chat key: it says the computer needs a chat key (OpenAI or Anthropic)', g.run('listenReady().code') === 'nochat' && /chat key \(OpenAI or Anthropic\)/.test(await view()) && J('__gum.length') === 0, await view());
  keys(); g.run('__t += 5000');
  check('with both keys it may start', J('listenReady()').ok === true);
  g.run('LISTEN.on = false; listenPaint()'); const pd0 = J('__pd'); press();
  check('switched off: a silent no (no line, no microphone), and the key is left for the browser', J('listenReady().code') === 'off' && J('listenReady().say') === '' && J('__gum.length') === 0 && J('__pd') === pd0 && J('LISTEN.el.root.style.display') === 'none', await view());
  g.run('LISTEN.on = true; VOICE.bad = true'); check('a rejected Deepgram key: its own line', J('listenReady().code') === 'badkey' && /rejected the key/.test(J('listenReady().say')));
  g.run('VOICE.bad = false; CHAT.bad = true'); check('a rejected chat key: its own line', J('listenReady().code') === 'chatbad' && /chat key was rejected/.test(J('listenReady().say')));
  g.run('CHAT.bad = false; CHAT.on = false'); check('chat switched off: it says the computer is off with it', J('listenReady().code') === 'chatoff' && /switched off/.test(J('listenReady().say'))); g.run('CHAT.on = true');
  g.run('LISTEN.s.used = LISTEN.limit.minutes * 60000'); check('the session limit: a plain line with the minutes', J('listenReady().code') === 'limit' && /10 minutes of listening/.test(J('listenReady().say'))); g.run('LISTEN.s.used = 0');
  g.run('window.isSecureContext = false'); check('an insecure page: it names node tools/serve.mjs and 127.0.0.1', J('listenReady().code') === 'insecure' && /node tools\/serve\.mjs/.test(J('listenReady().say')) && /127\.0\.0\.1/.test(J('listenReady().say'))); g.run('window.isSecureContext = true');
  g.run('window.__md = navigator.mediaDevices; navigator.mediaDevices = undefined'); check('no mediaDevices at all is the same line (that is what a page that is not secure looks like)', J('listenReady().code') === 'insecure'); g.run('navigator.mediaDevices = __md');
  g.run('window.__mr = MediaRecorder; MediaRecorder = undefined'); check('a browser with no recorder: its own line', J('listenReady().code') === 'nomic'); g.run('MediaRecorder = __mr');
  check('so far the microphone was not asked for and nothing was sent', J('__gum.length') === 0 && await calls() === 0);
}

console.log('C. one press, start to finish');
await reset(); keys();
{
  g.run('__hold = new Promise(r => { window.__go = r; })'); // Deepgram answers when the test says
  press(); const pd = J('__pd');
  check('the key press is taken (the browser does not also get it), and the ring starts: the microphone is NOT asked for yet', pd >= 1 && J('LISTEN.s.state') === 'ring' && J('__gum.length') === 0 && J('listenCapView().fill') === 0 && J('listenCapView().label') === 'hold', J('LISTEN.s.state'));
  check('the first time, a plain line says the browser will ask for the microphone (before it does)', /ask to use the microphone: choose Allow/.test(await view()) && J('LISTEN.s.asked') === false, await view());
  tick(300); check('half way round the ring after half of it', Math.abs(J('listenCapView().fill') - 0.5) < 0.01 && J('LISTEN.s.state') === 'ring' && J('__gum.length') === 0, J('listenCapView().fill'));
  check('the key cap shows the ring filling, in amber, with a conic gradient, over the canvas', /conic-gradient\(#ffb454 180deg/.test(J('LISTEN.capEl.root.style.background')) && J('LISTEN.capEl.root.style.display') === 'block' && J('LISTEN.capEl.key.textContent') === 'U', J('LISTEN.capEl.root.style.background'));
  tick(300); check('the ring is full: now the microphone is asked for, and the box says to allow it', J('LISTEN.s.state') === 'opening' && /ALLOW THE MICROPHONE/.test(await view()), await view());
  await g.waitFor("LISTEN.s.state === 'listening'", 3000, 'listening');
  check('the browser has asked once: remembered in this browser, so the next time it is not explained', J('LISTEN.s.asked') === true && g.store.get('longhaul.listen.asked') === '1');
  check('the microphone was asked for: audio only, no video', J('__gum.length') === 1 && /"audio"/.test(J('__gum[0]')) && !/video/.test(J('__gum[0]')), J('__gum[0]'));
  check('the recorder is made on that stream in the first format the browser has, and runs', J('__recs.length') === 1 && J('__recs[0].mimeType') === 'audio/webm;codecs=opus' && J('__recs[0].state') === 'recording');
  check('a sound at the start', J('__sfx').includes('uiOpen'));
  let v = await view();
  check('the red LISTENING mark is up (a dot, the word, the seconds, how to send and cancel)', /^\u25CF LISTENING  0\.0 s \| .*stops when you stop talking.*U sends.*Esc cancels \| block$/.test(v) && J('LISTEN.el.head.style.color') === '#ff4d6d' && J('listenView().mark') === 'red', v);
  check('the mark is a status region, drawn over the canvas', J('LISTEN.el.root.attrs.role') === 'status' && J('LISTEN.el.root.attrs[\'aria-live\']') === 'polite');
  tick(2000); v = await view(); check('two seconds later it says so', /LISTENING  2\.0 s/.test(v), v);
  check('the microphone is open now (a track running), and the cap is a solid red ring', J('__tracks[0].stopped') === false && J('listenCapView().color') === '#ff4d6d' && J('listenCapView().fill') === 1 && J('LISTEN.capEl.root.style.background') === '#ff4d6d');
  up(); check('letting the key go now changes nothing: it listens by itself, hands free', J('LISTEN.s.state') === 'listening' && J('__tracks[0].stopped') === false);
  send();
  check('U again: the microphone is CLOSED at once (the track stopped), before any request', J('__tracks[0].stopped') === true && await calls() === 0 && J('__recs[0].state') === 'inactive');
  check('a sound at the end', J('__sfx').includes('uiClose'));
  await g.waitFor('__calls.length === 1', 3000, 'the one request');
  const url = new URL(J('__calls[0].url')), c0 = g.run('__calls[0]'), body = c0.body;
  check('ONE request, and it is held here while Deepgram is "hearing"; the mic is still closed', await calls() === 1 && J('LISTEN.s.state') === 'hearing' && J('__tracks[0].stopped') === true && /HEARING YOU/.test(await view()));
  check('it goes to https://api.deepgram.com/v1/listen, POST', url.protocol === 'https:' && url.hostname === 'api.deepgram.com' && url.pathname === '/v1/listen' && c0.method === 'POST', c0.url.slice(0, 90));
  check('the query: the model, smart format, and the game\'s own names as keyterms (the ship\'s computer, a ship, a star)', url.searchParams.get('model') === 'nova-3' && url.searchParams.get('smart_format') === 'true' && url.searchParams.getAll('keyterm').includes('Halcyon') && url.searchParams.getAll('keyterm').includes('Wren') && url.searchParams.getAll('keyterm').length <= 30, url.searchParams.getAll('keyterm').slice(0, 6).join(','));
  check('the headers are the key and the container type (audio/webm, without the codec note), nothing else', JSON.stringify(Object.keys(c0.headers).sort()) === '["Authorization","Content-Type"]' && c0.headers.Authorization === 'Token ' + KEY && c0.headers['Content-Type'] === 'audio/webm', JSON.stringify(Object.keys(c0.headers)));
  check('the key is in the Authorization header and nowhere else: not in the address, not in the body type', !c0.url.includes(KEY) && !String(body.type).includes(KEY));
  const bytes = new Uint8Array(await body.arrayBuffer());
  check('the body is the recording, as it was made', body.size === 8 && bytes.join() === '1,2,3,4,5,6,7,8', bytes.join());
  check('while the call is out the audio is held (one blob), and nothing else', J('listenHeld()') === 1);
  g.run('__go()'); await g.waitFor("LISTEN.s.state === 'review'", 3000, 'review');
  check('the call is over: the audio is DROPPED (nothing held: no blob, no chunk, no stream, no recorder)', J('listenHeld()') === 0 && J('LISTEN.s.blob') === null && J('LISTEN.s.chunks.length') === 0 && J('LISTEN.s.stream') === null && J('LISTEN.s.rec') === null);
  v = await view();
  check('the words are SHOWN before anything is done with them, and the pause says how to stop them', v.startsWith('"' + WORDS + '" |') && /Esc cancels/.test(v) && /U again to say it again/.test(v) && J('__subs.length') === 0, v);
  await g.waitFor('__subs.length === 1', 2000, 'handed on');
  check('after the pause the words go to the ship\'s computer, as they were said, once', J('__subs.length') === 1 && J('__subs[0]') === WORDS && J('LISTEN.s.state') === 'idle');
  check('the mark is gone, and nothing is held', J('LISTEN.el.root.style.display') === 'none' && J('listenHeld()') === 0);
  check('exactly one call in all, and it went to api.deepgram.com', await calls() === 1 && J('__calls.every(c => c.url.startsWith("https://api.deepgram.com/v1/listen?"))'));
  const store = JSON.stringify([...g.store.entries()]);
  check('nothing of the sound was kept in this browser (only the keys and flags that were set)', !/audio|blob|webm|transcript/i.test(store) && !store.includes(WORDS), store.slice(0, 200));
  check('the key is in no line the player sees and in no console error', !(await allText()).includes(KEY) && !g.errors.join(' ').includes(KEY) && g.errors.length === 0, g.errors.join(' '));
  check('the time held was counted (2 s)', J('LISTEN.s.used') === 2000 && /0\.0 of 10 minutes/.test(J('listenUsedLine()')) === true);
}

console.log('D. Esc, and U again');
await reset(); keys();
{
  await hold(); send(); await g.waitFor("LISTEN.s.state === 'review'", 3000, 'review');
  const sp0 = J('__sp'); esc();
  check('Esc while the words wait cancels them, and is taken (the pause menu does not also open)', J('__sp') === sp0 + 1 && J('LISTEN.s.state') === 'idle' && /^Cancelled\. \|/.test(await view()), await view());
  await settle(120);
  check('and they never reach the ship\'s computer', J('__subs.length') === 0 && J('listenHeld()') === 0);
  const sp1 = J('__sp'); g.run('LISTEN.s.line = null; listenPaint()'); esc();
  check('Esc with nothing to cancel is left alone (not taken)', J('__sp') === sp1);

  await reset(); await hold(); const c0 = await calls(); esc();
  check('Esc while it listens: the microphone closes, nothing is sent, the time still counts', J('__tracks[__tracks.length - 1].stopped') === true && J('LISTEN.s.state') === 'idle' && J('LISTEN.s.held') === false && J('LISTEN.s.used') === 2000, J('LISTEN.s.used'));
  up(); await settle(20);
  check('and the key coming up afterwards starts nothing', await calls() === c0 && J('__recs[__recs.length - 1].state') === 'inactive');

  await reset(); g.run('__hold = new Promise(r => { window.__go = r; })');
  await hold(); send(); await g.waitFor('__calls.length === 1', 3000, 'sent'); esc();
  check('Esc while Deepgram is hearing: it lets go of the answer', J('LISTEN.s.state') === 'idle' && J('listenHeld()') === 0);
  g.run('__go()'); await settle(100);
  check('the words that come back are not used', J('__subs.length') === 0 && J('LISTEN.s.state') === 'idle');

  await reset(); g.run('LISTEN.limit.grace = 400; __say = "first words"');
  await hold(); send(); await g.waitFor("LISTEN.s.state === 'review'", 3000, 'review 1');
  g.run('__say = "second words"; __t += 3000');
  await ring(); tick(1500); send(); await g.waitFor("LISTEN.s.state === 'review'", 3000, 'review 2');
  g.run('LISTEN.limit.grace = 40'); await g.waitFor('__subs.length >= 1', 2000, 'handed on'); await settle(500);
  check('a new press while the words wait says them again: the first words are dropped, the second go, once', J('__subs.length') === 1 && J('__subs[0]') === 'second words', J('JSON.stringify(__subs)'));
}

console.log('E. the edges');
await reset(); keys();
{
  press(); tick(200); up();
  check('a tap (let go before the ring is full): the microphone was never asked for, nothing is sent, and the one line says to hold until the ring is full', J('__gum.length') === 0 && await calls() === 0 && J('LISTEN.s.state') === 'idle' && /Hold U until the ring is full, then speak/.test(await view()) && J('listenCapView().idle') === true, await view());
  check('and the key coming up is taken, the ring is empty again', J('__pd') >= 1 && J('listenCapView().fill') === 0);
  press(); tick(RING() - 1); check('one millisecond short of full is still a tap', J('LISTEN.s.state') === 'ring' && J('__gum.length') === 0); up(); await settle(10);

  await reset(); g.run('__gumHold = new Promise(r => { window.__ready = r; })'); const recs0 = J('__recs.length');
  press(); tick(RING()); up(); await settle(10);
  check('the ring is full and the key is let go while the browser is still asking: it waits for the answer (the question must not lose the press)', J('LISTEN.s.state') === 'opening' && J('__recs.length') === recs0);
  g.run('__ready()'); await g.waitFor("LISTEN.s.state === 'listening'", 3000, 'listening after the prompt');
  check('the microphone arrives and it listens by itself, with the key up', J('__recs.length') === recs0 + 1 && J('LISTEN.s.held') === false && J('__tracks[__tracks.length - 1].stopped') === false); esc(); g.run('__gumHold = null');

  await reset(); const gum0 = J('__gum.length');
  press(`{ repeat: true }`); press(`{ ctrlKey: true }`); press(`{ metaKey: true }`); press(`{ altKey: true }`);
  g.run(`document.activeElement = { tagName: 'INPUT' }`); press(); g.run(`document.activeElement = { tagName: 'TEXTAREA' }`); press(); g.run(`document.activeElement = { tagName: 'DIV', isContentEditable: true }`); press(); g.run('document.activeElement = null');
  check('a repeat, Ctrl, Cmd, Alt, and a text field (an input, a text area, an editable box) do nothing', J('__gum.length') === gum0 && J('LISTEN.s.state') === 'idle');
  press(`{}`, '__nofg'); press(`{}`, 'null');
  check('with no Space or Station scene running (a menu, the title, the map) the key is only a key', J('__gum.length') === gum0 && J('LISTEN.s.state') === 'idle');
  g.run('__sc.panel = true'); press();
  check('a panel in the way: the line is given before anyone speaks into a line that would not open', J('__gum.length') === gum0 && /could not open the ship's computer here/.test(await view()), await view()); g.run('__sc.panel = false');

  await reset(); g.run('LISTEN.limit.hold = 3000');
  await hold(3100); await g.waitFor('__calls.length === 1', 3000, 'the longest listen');
  check('the longest listen ends by itself and sends', J('LISTEN.s.state') !== 'listening' && J('__tracks[__tracks.length - 1].stopped') === true && await calls() === 1);
  await settle(100);

  await reset(); g.run(`AC = { state: 'running', createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createAnalyser: () => ({ fftSize: 0, getByteTimeDomainData(b) { b.fill(window.__level); } }) }; window.__level = 128; __say = ''; resumeAudio = () => {}`);
  await hold(1500); send(); await g.waitFor("LISTEN.s.state === 'idle' && LISTEN.s.line", 3000, 'silent');
  check('a microphone the meter heard nothing from is still sent (a meter that is wrong must not stop the player), and the empty answer says "I heard silence"', await calls() === 1 && /heard silence/.test(await view()) && J('listenHeld()') === 0, await view());
  await reset(); g.run(`AC = { state: 'running', createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createAnalyser: () => ({ fftSize: 0, getByteTimeDomainData(b) { b.fill(window.__level); } }) }; window.__level = 200`);
  await hold(1500); check('while it listens, the level shows on the mark and makes the cap glow', /\|{2,}/.test(await view()) && /0 0 \d+px/.test(J('LISTEN.capEl.root.style.boxShadow')), await view()); send(); await g.waitFor('__calls.length === 1', 3000, 'loud');
  check('a microphone that heard something is sent', await calls() === 1); await settle(100);
  await reset(); g.run(`AC = { state: 'suspended', createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createAnalyser: () => ({ fftSize: 0, getByteTimeDomainData(b) { b.fill(128); } }) }; __say = ''`);
  await hold(1500); send(); await g.waitFor("LISTEN.s.state === 'idle' && LISTEN.s.line", 3000, 'suspended');
  check('a suspended audio context reads as silence and is not believed: the empty answer is the ordinary "did not catch anything"', await calls() === 1 && /did not catch anything/.test(await view()), await view()); await settle(100);
  check('the level bar and the peak are what they should be', J('listenPeak([128, 128, 128])') === 0 && J('listenPeak([128, 192, 64])') === 0.5 && J('listenMeter(0).length') === 8 && J('listenMeter(1)') === '||||||||' && J('listenMeter(0)') === '........');

  await reset(); g.run(`window.__h = []; window.addEventListener = (t, f, c) => __h.push([t, f, c]); document.addEventListener = (t, f) => __h.push(['doc-' + t, f]); LISTEN.game = null; listenInstall(__fg); 1`);
  check('install: keydown in the capture phase (it sees Esc before Phaser), keyup, blur and a hidden page', J('__h.filter(h => h[0] === "keydown" && h[2] === true).length') === 1 && J('__h.some(h => h[0] === "keyup")') && J('__h.some(h => h[0] === "blur")') && J('__h.some(h => h[0] === "doc-visibilitychange")'));
  await ring(); g.run('__h.find(h => h[0] === "blur")[1]()');
  check('the window losing focus while it listens: the microphone closes and nothing is sent', J('__tracks[__tracks.length - 1].stopped') === true && J('LISTEN.s.state') === 'idle' && J('LISTEN.s.held') === false && await calls() === 0);
  g.run('__t += 5000; __gumHold = new Promise(r => { window.__ready = r; })'); press(); tick(RING()); await settle(10); g.run('__h.find(h => h[0] === "blur")[1]()');
  check('the window losing focus while the browser asks for the microphone does NOT drop the press: that question takes the focus, and the first press was lost to it', J('LISTEN.s.state') === 'opening'); g.run('__ready(); __gumHold = null'); await g.waitFor("LISTEN.s.state === 'listening'", 3000, 'after the question'); esc();
  g.run('__t += 5000'); press(); g.run('__h.find(h => h[0] === "blur")[1]()');
  check('the window losing focus while the ring fills drops the ring (the key-up would never come), quietly', J('LISTEN.s.state') === 'idle' && J('__gum.length') >= 1);
  g.run('__t += 5000; document.hidden = true'); await ring(); g.run('__h.find(h => h[0] === "doc-visibilitychange")[1]()'); g.run('document.hidden = false');
  check('a page that goes to the background ends a listen the same way', J('LISTEN.s.state') === 'idle' && J('__tracks[__tracks.length - 1].stopped') === true);
}

console.log('F. every failure has a plain line, and never the key');
await reset(); keys();
{
  const fail = async (what, setup, re, extra = '') => {
    await reset(); g.run(setup); g.run('__t += 100');
    press(); tick(RING()); await g.waitFor("LISTEN.s.state !== 'opening'", 3000, 'opened');
    if (J('LISTEN.s.state') === 'listening') { tick(1500); send(); await g.waitFor("LISTEN.s.state === 'idle' && LISTEN.s.line", 4000, what); }
    const v = await view();
    check(what + ': ' + String(re).slice(1, 40), re.test(v) && !v.includes(KEY) && J('listenHeld()') === 0 && J('LISTEN.s.state') === 'idle' && J('LISTEN.s.held') === false && (!J('__tracks.length') || J('__tracks.every(t => t.stopped)')) && !(await allText()).includes(KEY), v + ' ' + extra);
  };
  await fail('the microphone is blocked', `__deny = 'NotAllowedError'`, /blocked for this page\. Allow it .*hold U again/);
  await fail('the browser says security', `__deny = 'SecurityError'`, /blocked for this page/);
  await fail('no microphone', `__deny = 'NotFoundError'`, /No microphone found/);
  await fail('the microphone is busy', `__deny = 'NotReadableError'`, /another app/);
  await fail('something else', `__deny = 'WeirdError'`, /did not start/);
  await fail('blocked on a game opened from a file: it also says to use the server', `__deny = 'NotAllowedError'; location = { protocol: 'file:' }`, /blocked for this page.*node tools\/serve\.mjs/);
  g.run(`location = { protocol: 'http:' }`);
  await fail('Deepgram rejects the key (401)', `__status = 401`, /rejected the key: check it in Settings > Keys/);
  await fail('and so does 403', `__status = 403`, /rejected the key/);
  await fail('no credit (402)', `__status = 402`, /no credit left/);
  await fail('too many requests (429)', `__status = 429`, /too many requests/);
  await fail('a server error (500)', `__status = 500`, /error 500/);
  await fail('the network is down', `__fail = 'TypeError'`, /Could not reach Deepgram/);
  await fail('Deepgram does not answer in time', `__fail = 'hang'`, /too slow to answer/);
  await fail('a reply that is not JSON', `__statuses = ['badjson']`, /cannot read/);
  await fail('a transcript that is empty', `__say = '   '`, /did not catch anything/);
  await fail('a recording with no sound in it', `__audio = null`, /did not catch anything/);
  await reset(); g.run('__statuses = [400, 200]; __t += 100'); await hold(); send(); await g.waitFor("LISTEN.s.state === 'review'", 4000, 'retry');
  check('a 400 is tried once more without the keyterms, and then it works', await calls() === 2 && /keyterm=/.test(J('__calls[0].url')) && !/keyterm/.test(J('__calls[1].url')) && J('LISTEN.s.words') === WORDS, J('__calls.map(c => c.url.length)')); await settle(100);
  const lines = J('Object.values(LISTEN.say)');
  check('no plain line of the module can hold a key or a secret', lines.every(l => !/sk-|Token |dg-/.test(l)) && lines.every(l => l.length < 160), lines.filter(l => l.length >= 160).join(' | '));
}

console.log('G. the session limit');
await reset(); keys();
{
  g.run('LISTEN.limit.minutes = 0.05'); // 3 seconds in all
  await hold(2000); send(); await g.waitFor("LISTEN.s.state === 'review'", 4000, 'first'); await settle(100);
  check('a two second listen counts two seconds', J('LISTEN.s.used') === 2000 && /0\.0 of 0 minutes|0\.0 of 0\.05 minutes/.test(J('listenUsedLine()')));
  g.run('__t += 5000'); await ring(); tick(1500);
  check('the next listen is cut at what is left (one second), and sends what it has', J('LISTEN.s.state') !== 'listening' && J('LISTEN.s.used') >= 3000, J('LISTEN.s.used')); await g.waitFor('__calls.length === 2', 3000, 'second call'); await settle(100);
  g.run('__t += 5000; __subs.length = 0'); const gum = J('__gum.length'); press();
  check('after that: a plain line, no microphone', J('__gum.length') === gum && /minutes of listening/.test(await view()) && J('listenStatus().ok') === false, await view());
  check('the line says how to go on: type with I, or reload', /Type with I/.test(J('listenReady().say')) && /reload/.test(J('listenReady().say')));
  g.run('LISTEN.limit.minutes = 10');
}

console.log('H. the real ship\'s computer takes the words (the command strip, src/cmdstrip.js)');
await reset(); keys();
{
  g.run(`shipcompSubmit = __realSubmit; window.__realAsk = shipcompAsk; window.__realSay = shipcompSay; shipcompAsk = async () => ({ text: 'Mock answer.' }); shipcompSay = (t, then) => then('silent'); __fg.calls.length = 0; LISTEN.game = __fg; CMDSTRIP.s.pend = null; CMDSTRIP.s.live = null; SHIPCOMP.limit.gap = 0`);
  await hold(); send(); await g.waitFor("LISTEN.s.state === 'review'", 3000, 'review'); await g.waitFor("CMDSTRIP.s.live || CMDSTRIP.s.pend", 2000, 'asked');
  check('the transcript is submitted as if typed: the strip holds the question and the game is not paused', J('(CMDSTRIP.s.live || CMDSTRIP.s.pend).q') === WORDS && !J('__fg.calls').includes('pause'), J('__fg.calls.join()'));
  check('the mark is gone and nothing is held', J('listenHeld()') === 0 && J('LISTEN.el.root.style.display') === 'none');
  g.run('CMDSTRIP.s.pend = null; CMDSTRIP.s.live = null; __fg.calls.length = 0; __t += 5000'); await settle(10);
  g.run(`shipcompSubmit = (t, gm) => { __subs.push(t); return false; }`);
  await hold(); send(); await g.waitFor("LISTEN.s.line && /could not open/.test(LISTEN.s.line.text)", 3000, 'refused');
  check('when the strip cannot open the words stay on screen with the plain line', /could not open the ship's computer here/.test(await view()) && (await view()).includes('"' + WORDS + '"'), await view());
  g.run('shipcompSubmit = (t, gm) => { __subs.push(t); return __subOk; }; shipcompAsk = __realAsk; shipcompSay = __realSay');
}

console.log('I. Settings');
await reset(); keys();
{
  check('the section is on the rail, after Keys', J('SETTINGS.sections.map(s => s[0]).join()') === 'sound,keys,listen,controls,flight,content,reset');
  check('it has a drawing, a refresh and the microphone test', J('typeof Settings.prototype.draw_listen') === 'function' && J('typeof Settings.prototype.listenRefresh') === 'function' && J('typeof Settings.prototype.testMic') === 'function');
  const st = J('listenStatus()'); check('with both keys the status says how to use it', st.ok && /hold U in space or in a station/.test(st.line), st.line);
  g.run('voiceSetKey("")'); check('without the Deepgram key the status says where to add it', /Deepgram key: Settings > Keys/.test(J('listenStatus().line')) && J('listenStatus().ok') === false); keys();
  g.run('LISTEN.on = false'); check('switched off, it says so', /switched off/.test(J('listenStatus().line'))); g.run('LISTEN.on = true');
  check('the Deepgram key row says it also hears you, and its cost line says listening too', /hears you when you hold U/.test(J(`settingsKeyInfo('deepgram').use`)) && /speaking and listening/.test(J(`settingsKeyInfo('deepgram').cost`)));
  check('and still fits on the one line it has (under 118 characters)', J(`settingsKeyInfo('deepgram').use.length`) <= 118 && J(`settingsKeyInfo('deepgram').cost.length`) <= 118);
  const h = J('listenHint()'); check('the one-line hint names node tools/serve.mjs and 127.0.0.1, and is calm on a secure page', /node tools\/serve\.mjs/.test(h.text) && /127\.0\.0\.1/.test(h.text) && h.warn === false, h.text);
  g.run(`location = { protocol: 'file:' }`); check('opened from a file the hint turns amber', J('listenHint().warn') === true); g.run(`location = { protocol: 'http:' }`);
  g.run('window.isSecureContext = false'); check('and on a page that is not secure', J('listenHint().warn') === true); g.run('window.isSecureContext = true');

  const gum = J('__gum.length'), recs = J('__recs.length');
  const ok = await g.run('listenMicTest()');
  check('Test microphone opens the microphone and closes it again; it records nothing and sends nothing', /microphone works/.test(ok) && J('__gum.length') === gum + 1 && J('__tracks[__tracks.length - 1].stopped') === true && J('__recs.length') === recs && await calls() === 0, ok);
  g.run(`__deny = 'NotAllowedError'`); const bad = await g.run('listenMicTest()'); g.run('__deny = null');
  check('and tells the player when it is blocked', /blocked for this page/.test(bad), bad);
  g.run('window.isSecureContext = false'); const ins = await g.run('listenMicTest()'); g.run('window.isSecureContext = true');
  check('or the page is not secure', /secure address/.test(ins), ins);

  // the screen itself, drawn by Settings' own methods on a stand-in scene that records what it is asked to show (no Phaser here): it must draw without an error
  g.run(`
    window.__NOOP = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : __NOOP), apply: () => __NOOP });
    window.__rec = { txts: [], buttons: [], rail: {}, say: '' };
    window.__mk = () => { const f = { bx: -304, by: -262, bw: 840, slots: {}, body: __NOOP, add: __NOOP, section: 'listen', born: 0, closing: false, scene: { isActive: () => true },
      txt(x, y, str) { __rec.txts.push(String(str)); const o = { setText(t) { __rec.txts.push(String(t)); return o; }, setColor() { return o; } }; return o; },
      label(x, y, str) { __rec.txts.push(String(str)); }, warn(x, y, w, h, head, text) { __rec.txts.push(head, text); }, line() {},
      button(x, y, w, label, fn) { const b = { label, fn, on: false, set(t) { b.label = t; return b; }, color() { return b; }, mark(on) { b.on = on; return b; } }; __rec.buttons.push(b); return b; },
      railDraw() {}, say(m) { __rec.say = m; } };
      f.listenRefresh = Settings.prototype.listenRefresh; f.testMic = Settings.prototype.testMic; return f; };
  `);
  g.run(`(() => { __rec.txts.length = 0; __rec.buttons.length = 0; window.__f = __mk(); Settings.prototype.draw_listen.call(__f); return 1; })()`);
  const shown = J('__rec.txts').join(' | '), labels = J('__rec.buttons.map(b => b.label)');
  check('the section draws without an error and shows the cost note first, the key, what it does, the minutes and the hint', /THIS USES YOUR OWN DEEPGRAM ACCOUNT AND MAY COST YOU MONEY/.test(shown) && /may cost you money/.test(shown) && /HOLD TO TALK/.test(shown) && /Hold U in space or in a station until the ring around it is full, then speak/.test(shown) && /This session: 0\.0 of 10 minutes/.test(shown) && /node tools\/serve\.mjs/.test(shown) && /Ready: hold U/.test(shown), shown.slice(0, 300));
  check('with a switch that says Listening: ON and a Test microphone button', labels.includes('Listening: ON') && labels.includes('Test microphone'), labels.join(', '));
  g.run(`__rec.buttons.find(b => b.label === 'Listening: ON').fn()`);
  check('pressing the switch turns listening off, and the button and the status follow', J('LISTEN.on') === false && J('__rec.buttons[0].label') === 'Listening: OFF' && /switched off/.test(J('__rec.txts[__rec.txts.length - 1]') + J('__rec.txts.join()')));
  g.run(`Settings.prototype.onKey.call(Object.assign(__f, { section: 'listen', closing: false, born: 0 }), { code: 'Enter', repeat: false })`);
  check('Enter in the section does the same: back on', J('LISTEN.on') === true && J('__rec.buttons[0].label') === 'Listening: ON');
  g.run(`(() => { const f = Object.assign(__mk(), { rail: __NOOP, keyOf: id => '', railItems: [{ id: 'listen', t: __NOOP, st: { setText(t) { __rec.rail.listen = t; return __NOOP; } } }] }); Settings.prototype.railDraw.call(f); return 1; })()`);
  check('the rail says ON when it can work', J('__rec.rail.listen') === 'ON');
  g.run('voiceSetKey(""); Settings.prototype.railDraw.call(Object.assign(__mk(), { rail: __NOOP, keyOf: id => "", railItems: [{ id: "listen", t: __NOOP, st: { setText(t) { __rec.rail.listen = t; return __NOOP; } } }] }))');
  check('NEEDS KEYS when a key is missing, and OFF when switched off', J('__rec.rail.listen') === 'NEEDS KEYS'); keys();
  g.run('LISTEN.on = false; Settings.prototype.railDraw.call(Object.assign(__mk(), { rail: __NOOP, keyOf: id => "", railItems: [{ id: "listen", t: __NOOP, st: { setText(t) { __rec.rail.listen = t; return __NOOP; } } }] })); LISTEN.on = true');
  check('and OFF when switched off', J('__rec.rail.listen') === 'OFF');
  await g.run(`__f.testMic()`); await settle(10);
  check('the Test microphone button says how it went, in the screen\'s own line', /microphone works/.test(J('__rec.say')) && J('__tracks[__tracks.length - 1].stopped') === true && await calls() === 0, J('__rec.say'));

  g.run('listenSetOn(false)'); check('the switch is kept in this browser', g.store.get('longhaul.listen.on') === '0' && J('LISTEN.on') === false);
  g.run('LISTEN.on = true; listenLoad()'); check('a reload reads it back (off stays off)', J('LISTEN.on') === false);
  g.run('listenSetOn(true); LISTEN.on = false; listenLoad()'); check('and on stays on', J('LISTEN.on') === true && g.store.get('longhaul.listen.on') === '1');
  await hold(); g.run('listenSetOn(false)');
  check('switching it off during a hold ends the hold and closes the microphone', J('LISTEN.s.state') === 'idle' && J('__tracks[__tracks.length - 1].stopped') === true); g.run('listenSetOn(true)');
}

// ---- J. the play log (cards space-game-voice-empty and space-game-voice-ring): each press says how it went, never the words ----
console.log('J. the play log sees every press: counts and times, never the words');
{
  await reset(); keys();
  g.run(`window.__pl = []; playlogWrap({ ev: (n, d) => { if (n === 'listen') __pl.push(Object.assign({}, d)); }, count() {}, dealt() {} }, window)`);
  const steps = () => J('__pl').map(e => e.step + (e.step === 'end' ? ':' + e.why : '')).join(' ');
  g.run(`__say = ${JSON.stringify(WORDS)}; __subs.length = 0; __subOk = true`);
  await hold(2000); send();
  await g.waitFor(`__subs.length === 1`, 3000, 'the words reach the computer');
  const pl = J('__pl');
  check('a press that worked: start, ring full, microphone open, stop, clip, heard, sent, in that order', steps() === 'start ring open stop clip heard end:sent', steps());
  check('it says the ring filled, how long the microphone took, how long it listened (2 s) and why it stopped, the clip size, and how many characters came back', pl[1].done === true && pl[2].ok === true && pl[2].ms >= 0 && pl[3].held === 2 && pl[3].why === 'again' && pl[3].short === false && pl[4].bytes === 8 && pl[5].chars === WORDS.length, JSON.stringify(pl));
  check('and the words themselves are nowhere in it', !JSON.stringify(pl).includes('Roost') && !JSON.stringify(pl).includes('how do I'));
  await reset(); keys(); g.run(`__pl.length = 0; __say = ''; __subs.length = 0`);
  await hold(1500); send();
  await g.waitFor(`__pl.some(e => e.step === 'end')`, 3000, 'the end of the empty press');
  check('a press that heard nothing: heard with 0 characters, and it ends with the line shown (nothing)', steps() === 'start ring open stop clip end:nothing heard' && J('__pl')[6].chars === 0, steps()); // the plain line is written inside the step, so its end comes just before the step's own line
  await reset(); keys(); g.run(`__pl.length = 0; __say = ${JSON.stringify(WORDS)}`);
  press(); tick(200); up();
  await g.waitFor(`__pl.some(e => e.step === 'ring')`, 3000, 'the end of the tap');
  check('a tap: the ring did not fill (done false, held 0.2 s), no microphone, no clip, it ends as tap', steps() === 'start end:tap ring' && J('__pl')[2].done === false && J('__pl')[2].held === 0.2, steps() + ' ' + JSON.stringify(J('__pl')[2]));
  await reset(); keys(); g.run(`__pl.length = 0; __deny = 'NotAllowedError'`);
  press(); tick(RING()); await g.waitFor(`__pl.some(e => e.step === 'end')`, 3000, 'the refusal'); await settle(10);
  check('a blocked microphone: the ring fills, the microphone fails, it ends as denied', steps() === 'start ring end:denied open' && J('__pl')[3].ok === false, steps()); g.run(`__deny = null`);
  await reset(); keys(); g.run(`__pl.length = 0; voiceSetKey('')`);
  press(); await settle(20);
  check('no Deepgram key: no ring starts, and the one line shown is logged as nokey', steps() === 'end:nokey', steps()); keys();
}

// ---- K. it stops when you stop talking (card space-game-voice-ring) ----
console.log('K. it listens until you stop talking');
{
  const AC_ON = `AC = { state: 'running', createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createAnalyser: () => ({ fftSize: 0, getByteTimeDomainData(b) { b.fill(window.__level); } }) }; window.__level = 128; resumeAudio = () => {}; __say = ${JSON.stringify(WORDS)}`;
  const LOUD = 200, QUIET = 128;
  await reset(); keys(); g.run(AC_ON);
  await ring(); ticks(1000, LOUD);
  check('while words are coming it keeps listening (a second of speech)', J('LISTEN.s.state') === 'listening' && J('LISTEN.s.talk') >= 900, J('LISTEN.s.talk'));
  ticks(1000, QUIET);
  check('a second of quiet after words is not enough', J('LISTEN.s.state') === 'listening');
  ticks(300, QUIET);
  check('1.2 s of quiet after words ends it by itself: the microphone closes and the sound is sent', J('LISTEN.s.state') !== 'listening' && J('__tracks[__tracks.length - 1].stopped') === true, J('LISTEN.s.state'));
  await g.waitFor('__calls.length === 1', 3000, 'sent on silence'); await g.waitFor("LISTEN.s.state === 'idle'", 4000, 'handed on'); await settle(50);
  check('and the words go to the computer, once', J('__subs.length') >= 1 && J('__subs[__subs.length - 1]') === WORDS);

  await reset(); keys(); g.run(AC_ON);
  await ring(); ticks(300, QUIET); ticks(200, LOUD); ticks(3000, QUIET);
  check('a short noise (0.2 s) is not words: quiet after it does not end the listen', J('LISTEN.s.state') === 'listening' && J('LISTEN.s.talk') < 300, J('LISTEN.s.talk'));
  ticks(3000, QUIET);
  check('but nothing said for 6 s ends it, and what it has is sent (the empty answer then says so)', J('LISTEN.s.state') !== 'listening' && J('__tracks[__tracks.length - 1].stopped') === true);
  await g.waitFor("LISTEN.s.state === 'idle'", 4000, 'after the lead'); await settle(50);

  await reset(); keys(); g.run(AC_ON); g.run(`window.__level = 200`);
  await ring(); ticks(4000, LOUD);
  check('talking without a pause keeps it listening', J('LISTEN.s.state') === 'listening');
  g.run('AC.state = "suspended"'); ticks(8000, QUIET);
  check('a suspended audio context reads as silence and is not believed: nothing is ended on it, only U, Esc or the longest listen end it', J('LISTEN.s.state') === 'listening'); esc();

  await reset(); keys(); g.run(`AC = undefined`); await ring(); ticks(12000, 128);
  check('with no level meter at all nothing ends it by itself before the longest listen (20 s)', J('LISTEN.s.state') === 'listening'); ticks(9000, 128);
  check('and the longest listen does end it', J('LISTEN.s.state') !== 'listening'); await settle(50); await reset();
  check('the numbers are the ones the card names: ring 0.6 s, 1.2 s of quiet, 20 s at most', J('LISTEN.limit.ring') === 600 && J('LISTEN.limit.silence') === 1200 && J('LISTEN.limit.hold') === 20000);

  await reset(); keys(); g.run(AC_ON); g.run(`window.__sc.panel = false`);
  g.run('__t += 5000'); press();
  check('the cap is on the screen while the keys are in and the scene is Space', J('LISTEN.capEl.root.style.display') === 'block'); up(); await settle(10);
  g.run(`__fg.scene.getScenes = () => []; listenCapPaint()`);
  check('and gone when no Space or Station scene runs (a menu, the title)', J('LISTEN.capEl.root.style.display') === 'none'); g.run(`__fg.scene.getScenes = () => [__sc]`);
  g.run(`voiceSetKey(''); listenCapPaint()`);
  check('and with no Deepgram key there is no cap at all: the game is as before', J('LISTEN.capEl.root.style.display') === 'none'); keys();
}

// ---- L. the microphone asked early, at the first launch (card space-game-mic-early) ----
console.log('L. the microphone is asked at the launch from a station, once');
{
  g.run(`LISTEN.limit.note = 30; LISTEN.limit.early = 120`);
  const fresh = async (perm = 'prompt') => { await reset(); keys(); g.run(`LISTEN.s.nagged = false; LISTEN.s.asked = false; LISTEN.s.perm = ''; LISTEN.s.early = ''; LISTEN.s.earlyWhy = ''; window.__perm = ${JSON.stringify(perm)}; window.__proceeded = 0; __gum.length = 0; __tracks.length = 0; __recs.length = 0; __calls.length = 0; __gumHold = null; __deny = null; try { localStorage.removeItem(LISTEN.store.asked); localStorage.removeItem(LISTEN.store.nagged); } catch (e) {}`); };
  const early = () => g.run(`listenEarly(__fg, () => { __proceeded++; })`);
  await fresh(); g.run('__gumHold = new Promise(r => { window.__ready = r; })');
  check('the first launch with the browser still to ask: it takes over (true), the launch must wait', early() === true && J('__proceeded') === 0);
  await g.waitFor("LISTEN.s.line", 2000, 'the note');
  check('the one-line plain note comes first, before anything is asked', /Voice: the browser will ask to use your microphone\. Choose Allow on every visit\./.test(await view()) && J('__gum.length') === 0, await view());
  await g.waitFor('__gum.length === 1', 2000, 'asked');
  check('then the microphone is asked for, once: audio only, no video', J('__gum.length') === 1 && /"audio"/.test(J('__gum[0]')) && !/video/.test(J('__gum[0]')));
  check('while the browser question is up the launch is held, and a second try is swallowed without a second question', J('__proceeded') === 0 && g.run(`listenEarly(__fg, () => { __proceeded += 100; })`) === true && J('__gum.length') === 1);
  g.run('__ready()'); await g.waitFor('__proceeded >= 1', 2000, 'the launch goes on');
  await settle(20);
  check('answered: the launch goes on, once, and only then', J('__proceeded') === 1);
  check('the tracks were stopped at once, nothing was recorded, nothing was sent', J('__tracks.every(t => t.stopped)') && J('__recs.length') === 0 && await calls() === 0 && J('listenHeld()') === 0);
  check('it remembers it asked (never again) and that it was allowed, in this browser, and the note is gone', J('LISTEN.s.nagged') === true && J('LISTEN.s.asked') === true && J('LISTEN.s.perm') === 'granted' && g.store.get('longhaul.listen.nagged') === '1' && g.store.get('longhaul.listen.asked') === '1' && J('LISTEN.s.line') === null);
  check('and the first press of U afterwards needs no explaining: no first-time line', J('listenView()') === null || !/ask to use/.test((J('listenView()') || {}).body || ''));
  check('a second launch asks nothing', early() === false && J('__gum.length') === 1);

  await fresh('granted');
  check('the browser says granted already: no question, no note, the launch is released at once', early() === true); await g.waitFor('__proceeded === 1', 2000, 'released');
  check('and nothing was asked of the player', J('__gum.length') === 0 && J('LISTEN.s.asked') === true && J('LISTEN.s.earlyWhy') === 'granted');

  await fresh('denied');
  check('the browser says blocked already: no question, the launch goes on, and listening says it is blocked', early() === true); await g.waitFor('__proceeded === 1', 2000, 'released');
  check('nothing was asked, and it did not set the nag flag', J('__gum.length') === 0 && J('LISTEN.s.earlyWhy') === 'blocked');
  check('the status line, a press and the key cap all say blocked, plainly', /microphone is blocked for this page/.test(J('listenStatus().line')) && J('listenReady().code') === 'blocked' && J('listenCapView().label') === 'blocked');
  g.run('__t += 5000'); const gumB = J('__gum.length'); press();
  check('a press of U says so at once: no ring, no question', /microphone is blocked/.test(await view()) && J('LISTEN.s.state') === 'idle' && J('__gum.length') === gumB, await view());

  await fresh(); g.run(`voiceSetKey('')`);
  check('no Deepgram key (voice is off): nothing to ask, the launch is not held', early() === false && J('__gum.length') === 0); keys();
  g.run(`LISTEN.on = false`); check('and with listening switched off', early() === false); g.run(`LISTEN.on = true`);

  await fresh(); g.run(`__deny = 'NotAllowedError'`);
  early(); await g.waitFor('__proceeded === 1', 3000, 'declined'); await settle(20);
  check('he declines: the launch goes on, it is said once that the microphone is blocked, and the nag flag is set', J('__gum.length') === 1 && /microphone is blocked for this page/.test(await view()) && J('LISTEN.s.nagged') === true && J('LISTEN.s.perm') === 'denied' && J('LISTEN.s.earlyWhy') === 'declined', await view());
  check('and it never asks again', early() === false && J('__gum.length') === 1);
  g.run(`window.__perm = 'granted'; __permOn[__permOn.length - 1].state = 'granted'; __permOn[__permOn.length - 1].onchange()`);
  check('if he allows it later in the browser, the page hears it and voice works again, no reload', J('LISTEN.s.perm') === 'granted' && J('listenReady().ok') === true);

  await fresh(); g.run(`__gumHold = new Promise(r => { window.__ready = r; })`);
  early(); await g.waitFor('__proceeded === 1', 3000, 'slow');
  check('a question nobody answers must not hold the launch for ever: it goes on after the limit', J('__proceeded') === 1 && J('LISTEN.s.earlyWhy') === 'slow');
  g.run('__ready()'); await settle(30);
  check('and an answer that comes after that is closed at once', J('__tracks.every(t => t.stopped)') && J('__recs.length') === 0);

  // the launch itself (src/shipmode.js): the first launch waits, a launch with nothing to ask goes straight on
  await fresh(); g.run(`__gumHold = new Promise(r => { window.__ready = r; }); window.__bay = () => ({ leaving: false, ignoreUntil: 0, view: { kind: 'fleet', rec: activeShip() }, game: __fg, sys: { isActive: () => true }, runs: 0, closed: false,
    hangarClose() { this.closed = true; }, launch() { this.runs++; return ShipBay.prototype.launch.call(this); }, cameras: { main: { shake() {} } }, shipImg: { setRotation() {}, x: 0, scale: 1 }, bob: { stop() {} }, tweens: { add() {} }, fadeSet: [], flames: [], K: 1 }); window.__b = __bay(); __b.launch()`);
  check('the first launch from a station is held while the browser asks: the bay door has not started, flight has not begun', J('__b.closed') === false && J('__b.leaving') === false && J('__b.runs') === 1);
  await g.waitFor('__gum.length === 1', 2000, 'asked at the launch'); g.run('__ready()'); await g.waitFor('__b.runs === 2', 3000, 'launched after the answer');
  check('answered: the same launch goes on by itself, once, and it is the launch that starts (the door, the thrusters)', J('__b.closed') === true && J('__b.leaving') === true && J('__b.micAsked') === true && J('__b.runs') === 2);
  await fresh('granted'); g.run(`window.__b = __bay(); __b.launch()`); await g.waitFor('__b.runs === 2', 3000, 'launched');
  check('nothing to ask (granted already): the launch is only held for the permission check and then goes on', J('__b.closed') === true && J('__gum.length') === 0);
  await fresh(); g.run(`voiceSetKey(''); window.__b = __bay(); __b.launch()`);
  check('no keys: the launch is not held at all, it starts in the same breath', J('__b.closed') === true && J('__b.runs') === 1 && J('__gum.length') === 0); keys();
  await fresh(); g.run(`__gumHold = new Promise(r => { window.__ready = r; }); window.__b = __bay(); __b.launch()`); await g.waitFor('__gum.length === 1', 2000, 'asked'); g.run('__b.sys.isActive = () => false; __ready()'); await settle(60);
  check('if the player left the bay while the browser asked, the launch does not start from a scene that is gone', J('__b.runs') === 1 && J('__b.closed') === false);

  // the log
  await fresh(); keys(); g.run(`__pl.length = 0`); // the logger stand-in of section J is still wired to the game's functions
  early(); await g.waitFor('__proceeded === 1', 3000, 'logged'); await settle(20);
  check('the play log says the microphone was asked early, how long the launch waited and what came of it (allowed)', J('__pl').some(e => e.step === 'early' && e.why === 'allowed' && e.ms >= 0), JSON.stringify(J('__pl')));
  g.run(`LISTEN.limit.note = 1600; LISTEN.limit.early = 30000`);
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nLISTEN FAIL (${failed} of ${n})` : `\nLISTEN PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
