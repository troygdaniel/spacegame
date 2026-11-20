// smoke: ship voice with a mocked fetch: no key means no call; nothing ever reaches Deepgram
// Ship voice (src/voice.js) with a MOCKED fetch: nothing here ever calls Deepgram, so nothing is spent. Run: node tests/voice.mjs
// Checks: no key = no call; the call goes to api.deepgram.com with the key only in the Authorization header; the cache stops a
// second call; lines never overlap and warnings queue; a rejected key switches the voice off; mute silences it; the key is not in
// the save file, the page text or the console; Settings opens from the title screen at the Deepgram key and saves it; a low hull in the real Space scene speaks.
// Runs one headless Chrome at a time (the Mac is shared).
import { chromePool, sleep } from './cdp.mjs';

const KEY = 'TEST-KEY-NOT-REAL-ABCDEFGHIJKL'; // plainly fake, and no digits, so tests/hygiene.mjs does not take it for a real key
let failed = 0;
const pool = chromePool(); // every case shares one Chrome (one turn at the test lock), each starting on a clean profile (tests/cdp.mjs goto)
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

// installed in the page: a fetch that records the call and answers with 0.1 s of silence as a WAV (decodeAudioData needs real audio)
const MOCK = `(() => {
  const wav = new ArrayBuffer(44 + 1600), v = new DataView(wav), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + 1600, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, 1600, true);
  window.__calls = []; window.__status = 200; window.__log = []; window.__delay = 0;
  window.fetch = (url, opts) => { __calls.push({ url: String(url), auth: opts && opts.headers && opts.headers.Authorization, body: opts && opts.body }); return new Promise(r => setTimeout(r, __delay)).then(() => new Response(__status === 200 ? wav.slice(0) : 'no', { status: __status })); };
  ['log', 'warn', 'error', 'info', 'debug'].forEach(m => { const o = console[m]; console[m] = (...a) => { __log.push(a.join(' ')); o.apply(console, a); }; });
  window.__active = 0; window.__max = 0; const orig = voicePlay;
  voicePlay = async (b, ...rest) => { __active++; __max = Math.max(__max, __active); try { await orig(b, ...rest); } finally { __active--; } };
  return 1;
})()`;
const idle = t => t.waitFor('VOICE.playing === false && VOICE.queue.length === 0', 15000, 'voice idle');

// ---- part 1: the voice itself, on the title screen (no game events to interfere) ----
{
  const t = await pool.open('');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 20000, 'title');
    await t.ev(MOCK);
    check('no key: status says NO KEY', (await t.ev('voiceStatus()')) === 'NO KEY');
    check('no key: a line is refused', (await t.ev(`voiceSay(VOICE_LINES.launch, 1)`)) === false);
    check('no key: a character line is refused too', (await t.ev(`voiceSay('Welcome to the Drift.', 1, 'aura-luna-en')`)) === false);
    const none = await t.ev(`(() => { const r = []; const ok = voiceSayThen('Hello there.', 1, 'aura-luna-en', how => r.push(how)); return { ok, r }; })()`);
    check('no key: the reply text starts at once, with no voice to wait for', none.ok === false && JSON.stringify(none.r) === '["silent"]', JSON.stringify(none));
    await sleep(300);
    check('no key: no network call', (await t.ev('__calls.length')) === 0);

    await t.ev(`voiceSetKey('${KEY}')`);
    check('a key is accepted and shown as ON', (await t.ev('voiceStatus()')) === 'ON');
    check('a line is accepted with a key', (await t.ev(`voiceSay(VOICE_LINES.launch, 1)`)) === true);
    await t.waitFor('__calls.length === 1', 10000, 'first call');
    const c = await t.ev('__calls[0]');
    check('the call goes to api.deepgram.com/v1/speak', /^https:\/\/api\.deepgram\.com\/v1\/speak\?/.test(c.url), c.url);
    check('the model is the calm female voice', /model=aura-athena-en/.test(c.url));
    check('the key is only in the Authorization header', c.auth === 'Token ' + KEY && !c.url.includes(KEY) && !c.body.includes(KEY));
    check('the body is the line', JSON.parse(c.body).text === 'Launch clear.');
    await idle(t);
    await t.ev('(VOICE.said = {}, 1)');
    await t.ev(`voiceSay(VOICE_LINES.launch, 1)`); await idle(t);
    check('the same line again is a cache hit (still one call)', (await t.ev('__calls.length')) === 1 && (await t.ev('VOICE.cache.size')) === 1);

    // one at a time: a low-priority line while one plays is dropped; warnings queue, two at most, best first
    await t.ev('(VOICE.said = {}, 1)');
    const r = await t.ev(`[voiceSay('Line A', 0), voiceSay('Line B', 0), voiceSay('Line C', 1), voiceSay('Line D', 2), voiceSay('Line E', 1)]`);
    check('first starts, low-priority second is dropped, warnings queue', JSON.stringify(r) === '[true,false,true,true,true]', JSON.stringify(r));
    check('the queue holds two, most urgent first', (await t.ev('VOICE.queue.length')) === 2 && (await t.ev('VOICE.queue[0].text')) === 'Line D');
    await idle(t);
    check('lines never overlapped', (await t.ev('__max')) === 1, 'max at once ' + (await t.ev('__max')));
    check('A, then D, then one of C/E were spoken (3 more calls)', (await t.ev('__calls.length')) === 4, 'calls ' + (await t.ev('__calls.length')));

    // a character's voice (src/voice.js voiceSay with a model; docs/NPC-CHAT.md section 6)
    console.log('a character voice');
    await t.ev('(VOICE.said = {}, __calls.length = 0, 1)');
    check('a character reply is accepted', (await t.ev(`voiceSay('Welcome to the Drift.', 1, 'aura-luna-en')`)) === true);
    await t.waitFor('__calls.length === 1', 10000, 'character call');
    const cc = await t.ev('__calls[0]');
    check("the character's voice name reaches the Deepgram URL", /^https:\/\/api\.deepgram\.com\/v1\/speak\?model=aura-luna-en&encoding=mp3$/.test(cc.url), cc.url);
    check('the body is the reply and the key is only in the header', JSON.parse(cc.body).text === 'Welcome to the Drift.' && cc.auth === 'Token ' + KEY && !cc.url.includes(KEY));
    await idle(t);
    await t.ev('(VOICE.said = {}, 1)');
    await t.ev(`voiceSay('Welcome to the Drift.', 1, 'aura-luna-en')`); await idle(t);
    check('a character reply is not cached: the same words are a second call', (await t.ev('__calls.length')) === 2);
    check('the same words in another voice are not held back by the 8 s rule', (await t.ev(`voiceSay('Welcome to the Drift.', 1, 'aura-orion-en')`)) === true);
    await idle(t);
    check('that one went out with the other voice', /model=aura-orion-en/.test(await t.ev('__calls[2].url')));
    await t.ev(`voiceSay('Odd name.', 1, 'evil&x=1')`); await idle(t);
    const odd = await t.ev('__calls[3].url');
    check('a made-up voice name falls back to the ship voice and cannot add to the URL', /model=aura-athena-en&encoding=mp3$/.test(odd) && !/x=1/.test(odd), odd);
    // a character never talks over the ship computer: queued behind it, in order
    await t.ev('(VOICE.said = {}, __calls.length = 0, 1)');
    const both = await t.ev(`[voiceSay(VOICE_LINES.hull, 2), voiceSay('Sable speaks.', 1, 'aura-stella-en')]`);
    check('the ship warning plays, the character waits in the queue', JSON.stringify(both) === '[true,true]' && (await t.ev('VOICE.queue.length')) === 1, JSON.stringify(both));
    await idle(t);
    check('they were spoken in that order, each in its own voice', (await t.ev('__calls.length')) === 2 && /athena/.test(await t.ev('__calls[0].url')) && /stella/.test(await t.ev('__calls[1].url')));
    check('still never two at once', (await t.ev('__max')) === 1);
    // the text starts with the audio, or after 1.5 s
    await t.ev('(VOICE.said = {}, window.__how = [], 1)');
    await t.ev(`voiceSayThen('Ready when you are.', 1, 'aura-hera-en', how => __how.push(how))`);
    await t.waitFor('__how.length === 1', 8000, 'text start'); await idle(t);
    check('quick audio: the reply starts typing when the audio starts', (await t.ev('__how.join()')) === 'audio', await t.ev('__how.join()'));
    await t.ev('(VOICE.said = {}, __delay = 5000, window.__how = [], window.__t0 = performance.now(), 1)');
    await t.ev(`voiceSayThen('Slow line.', 1, 'aura-hera-en', how => __how.push(how, Math.round(performance.now() - __t0)))`);
    await t.waitFor('__how.length === 2', 8000, 'text start after the wait');
    const slow = await t.ev('__how');
    check('slow audio: the reply starts typing after about 1.5 s', slow[0] === 'timeout' && slow[1] >= 1300 && slow[1] <= 4000, JSON.stringify(slow));
    await idle(t);
    check('the late audio does not start it a second time', (await t.ev('__how.length')) === 2);
    await t.ev('(__delay = 0)');

    // mute and volume
    await t.ev('(VOICE.said = {}, G.muted = true, 1)');
    check('muted: refused', (await t.ev(`voiceSay('Muted line', 1)`)) === false);
    check('muted: a character reply starts at once, silent', (await t.ev(`(() => { const r = []; voiceSayThen('Muted reply', 1, 'aura-luna-en', how => r.push(how)); return r.join(); })()`)) === 'silent');
    await t.ev('(G.muted = false, G.volume = 0, 1)');
    check('volume 0: refused', (await t.ev(`voiceSay('Quiet line', 1)`)) === false);
    await t.ev('(G.volume = 1)');

    // a rejected key switches the voice off for good (until a new key)
    const before = await t.ev('__calls.length');
    await t.ev(`(__status = 401, VOICE.said = {}, voiceSay('Rejected line', 1))`);
    await t.waitFor('VOICE.bad === true', 10000, 'key rejected');
    check('401: voice switched off, status KEY REJECTED', (await t.ev('voiceStatus()')) === 'KEY REJECTED');
    await idle(t);
    check('after a rejection no more calls', (await t.ev(`voiceSay('Another', 1)`)) === false && (await t.ev('__calls.length')) === before + 1);
    await t.ev('(__status = 200)');

    // the key stays out of the save, the page text and the console
    await t.ev('saveGame(true)');
    check('the key is not in the save file', !(await t.ev(`localStorage.getItem(SAVE_KEY) || ''`)).includes(KEY));
    check('the key is not in the page text', !(await t.ev('document.body.innerText')).includes(KEY));
    check('the key never reached the console', !(await t.ev(`__log.join('\\n')`)).includes(KEY));
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 2: Settings opens from the title screen at the key (V), saves a key, closes with Esc ----
{
  const t = await pool.open('');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 20000, 'title');
    await t.ev(MOCK);
    await sleep(800); // the title has to be drawing before a player could press anything
    const frame = () => t.ev('game.loop.frame');
    const f0 = await frame();
    await t.press('V'); // the real key, as a player presses it (card space-game-bug-voice-panel-v-key-freezes); not a call to voiceOpenSetup()
    await t.waitFor("game.scene.isActive('Settings')", 8000, 'setup panel');
    check('the setup panel opens, the title waits below', (await t.ev("game.scene.isPaused('Title')")) === true);
    const f1 = await frame(); await sleep(600); const f2 = await frame();
    check('the game loop keeps running while the panel is open', f2 > f1 && f1 > f0 && (await t.ev('document.hidden')) === false, `frames ${f0} -> ${f1} -> ${f2}, hidden ${await t.ev('document.hidden')}`);
    check('there is a real text box over the canvas', (await t.ev("!!document.querySelector('input[type=password]')")) === true);
    check('the cost note is on screen', (await t.ev("game.scene.getScene('Settings').children.list.length > 0")) === true);
    await t.ev(`(() => { const s = game.scene.getScene('Settings'); s.inputs.deepgram.value = 'short'; s.saveKey('deepgram'); return 1; })()`);
    check('a too-short key is refused', (await t.ev('VOICE.key')) === '');
    await t.ev(`(() => { const s = game.scene.getScene('Settings'); s.inputs.deepgram.value = '${KEY}'; s.saveKey('deepgram'); return 1; })()`);
    check('a real-looking key is saved', (await t.ev('VOICE.key')) === KEY);
    check('the box is cleared after saving', (await t.ev(`game.scene.getScene('Settings').inputs.deepgram.value`)) === '');
    check('the test button makes one call, to Deepgram', await (async () => { await t.ev(`game.scene.getScene('Settings').testKey('deepgram')`); await t.waitFor('__calls.length === 1', 10000, 'test call'); return /api\.deepgram\.com/.test((await t.ev('__calls[0].url'))); })());
    await t.press('ESC'); // the first Esc leaves the key box (the V key put the cursor there), the second closes the screen
    await t.press('ESC');
    await t.waitFor("!game.scene.isActive('Settings')", 8000, 'setup closed');
    check('Esc closes it and the title comes back', (await t.ev("game.scene.isActive('Title')")) === true);
    check('the title runs again, not paused', (await t.ev("game.scene.isPaused('Title')")) === false);
    const f3 = await frame(); await sleep(500);
    check('the loop is still running after it closes', (await frame()) > f3);
    check('the text box is gone', (await t.ev("!document.querySelector('input[type=password]')")) === true);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 3: a real game event speaks: low hull in the Space scene ----
{
  const t = await pool.open('#space');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 20000, 'space');
    await t.ev(MOCK);
    await t.ev(`voiceSetKey('${KEY}')`);
    await sleep(600);
    await t.ev('(G.hull = 20)');
    await t.waitFor(`__calls.some(c => JSON.parse(c.body).text === VOICE_LINES.hull)`, 10000, 'hull warning spoken');
    check('hull under 30% speaks the warning', true);
    await t.ev('(VOICE.key = "")'); // stop any later line from this run touching the mock
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

await pool.close();
console.log(failed ? `VOICE FAIL (${failed})` : 'VOICE PASS');
process.exitCode = failed ? 1 : 0;
