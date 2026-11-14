// NPC chat adapter (src/chat.js) with a MOCKED fetch: nothing here ever calls OpenAI or Anthropic, so nothing is spent. Run: node tests/chat.mjs
// Checks: no key = no call; an OpenAI-looking key goes to api.openai.com with the key only in the Authorization header and the
// chat-completions body shape; an Anthropic key goes to api.anthropic.com with x-api-key, the version and browser-access headers
// and the messages body shape; the reply text comes back clean; a 401 switches chat off and stops further calls; a 429 makes the
// adapter wait; three network failures pause it; the key is not in the save file, the page text or the console; the setup
// panel opens from the title screen, refuses a short key, saves a real-looking one, tests with one call, and closes with Esc.
// Runs one headless Chrome at a time (the Mac is shared).
import { launch, sleep } from './cdp.mjs';

// built at run time so the hygiene scan (tests/hygiene.mjs) never sees a key-shaped literal
const KEY_OPENAI = 'sk-test-' + 'o'.repeat(28), KEY_ANTHROPIC = 'sk-ant-test-' + 'a'.repeat(28);
let failed = 0;
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

// installed in the page: a fetch that records the call and answers in the shape of whichever provider the URL names
const MOCK = `(() => {
  window.__calls = []; window.__status = 200; window.__fail = false; window.__reply = 'Welcome to the Drift, pilot.'; window.__log = [];
  window.fetch = (url, opts) => {
    const h = (opts && opts.headers) || {};
    __calls.push({ url: String(url), headers: h, body: opts && opts.body });
    if (__fail) return Promise.reject(new TypeError('Failed to fetch'));
    const anth = /anthropic/.test(String(url));
    const body = __status === 200
      ? (anth ? { content: [{ type: 'text', text: __reply }] } : { choices: [{ message: { role: 'assistant', content: __reply } }] })
      : { error: { message: 'mock error ' + __status, type: 'mock' } };
    return Promise.resolve(new Response(JSON.stringify(body), { status: __status, headers: { 'content-type': 'application/json' } }));
  };
  ['log', 'warn', 'error', 'info', 'debug'].forEach(m => { const o = console[m]; console[m] = (...a) => { __log.push(a.join(' ')); o.apply(console, a); }; });
  return 1;
})()`;
const REQ = `{ system: 'You are JUNO.', messages: [{ role: 'user', content: 'Hello there.' }], maxTokens: 80 }`;
// chatComplete returns a promise; the DevTools helper does not await one, so the result is parked on the window
const call = async (t, req = REQ) => {
  await t.ev(`(window.__r = null, chatComplete(${req}).then(r => { window.__r = r; }), 1)`);
  await t.waitFor('__r !== null', 10000, 'chat reply');
  return t.ev('__r');
};

// ---- part 1: the adapter itself, on the title screen ----
{
  const t = await launch('');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 20000, 'title');
    await t.ev(MOCK);
    await t.ev(`(chatSetKey(''), chatSetProvider(''), chatSetModel(''), 1)`); // a clean slate whatever this profile held
    check('no key: status says NO KEY', (await t.ev('chatStatus()')) === 'NO KEY');
    check('no key: chatUsable is false', (await t.ev('chatUsable()')) === false);
    const r0 = await call(t);
    check('no key: the call is refused with code nokey', r0 && r0.code === 'nokey' && !r0.text, JSON.stringify(r0));
    await sleep(200);
    check('no key: no network call', (await t.ev('__calls.length')) === 0);

    // OpenAI first
    await t.ev(`chatSetKey('${KEY_OPENAI}')`);
    check('an sk- key picks OpenAI and shows ON', (await t.ev('chatProvider()')) === 'openai' && (await t.ev('chatStatus()')) === 'ON');
    check('the default model is the OpenAI default', (await t.ev('chatModel()')) === (await t.ev('CHAT_PROVIDERS.openai.model')));
    const r1 = await call(t);
    check('OpenAI: the reply text comes back', r1 && r1.text === 'Welcome to the Drift, pilot.', JSON.stringify(r1));
    const c1 = await t.ev('__calls[0]');
    check('OpenAI: the call goes to api.openai.com/v1/chat/completions', c1.url === 'https://api.openai.com/v1/chat/completions', c1.url);
    check('OpenAI: the key is only in the Authorization header', c1.headers.Authorization === 'Bearer ' + KEY_OPENAI && !c1.url.includes(KEY_OPENAI) && !c1.body.includes(KEY_OPENAI));
    const b1 = JSON.parse(c1.body);
    check('OpenAI: system message first, then the turns, with max_completion_tokens', b1.messages[0].role === 'system' && b1.messages[0].content === 'You are JUNO.' && b1.messages[1].role === 'user' && b1.max_completion_tokens === 80 && b1.model === (await t.ev('CHAT_PROVIDERS.openai.model')), c1.body);
    check('the call counter counts it', (await t.ev('CHAT.calls')) === 1);

    // Anthropic second
    await t.ev(`chatSetKey('${KEY_ANTHROPIC}')`);
    check('an sk-ant- key picks Anthropic', (await t.ev('chatProvider()')) === 'anthropic');
    const r2 = await call(t);
    check('Anthropic: the reply text comes back', r2 && r2.text === 'Welcome to the Drift, pilot.', JSON.stringify(r2));
    const c2 = await t.ev('__calls[1]');
    check('Anthropic: the call goes to api.anthropic.com/v1/messages', c2.url === 'https://api.anthropic.com/v1/messages', c2.url);
    check('Anthropic: x-api-key, version and browser-access headers, key nowhere else', c2.headers['x-api-key'] === KEY_ANTHROPIC && c2.headers['anthropic-version'] === '2023-06-01' && c2.headers['anthropic-dangerous-direct-browser-access'] === 'true' && !c2.url.includes(KEY_ANTHROPIC) && !c2.body.includes(KEY_ANTHROPIC));
    const b2 = JSON.parse(c2.body);
    check('Anthropic: system is its own field, messages are the turns, max_tokens', b2.system === 'You are JUNO.' && b2.messages.length === 1 && b2.messages[0].role === 'user' && b2.max_tokens === 80 && b2.model === (await t.ev('CHAT_PROVIDERS.anthropic.model')), c2.body);

    // the provider override and the model field
    await t.ev(`(chatSetProvider('openai'), chatSetModel('my-model_1'), 1)`);
    check('the override wins over the key prefix, and the model name is kept', (await t.ev('chatProvider()')) === 'openai' && (await t.ev('chatModel()')) === 'my-model_1');
    await t.ev(`(chatSetModel('bad name! <x>'), 1)`);
    check('a model name is cleaned to safe characters', (await t.ev('CHAT.model')) === 'badnamex', await t.ev('CHAT.model'));
    await t.ev(`(chatSetProvider(''), chatSetModel(''), 1)`);

    // a reply is cleaned and capped
    await t.ev(`(__reply = '  Hello\\u0000 there,\\n\\n pilot.  ' + 'x'.repeat(500), 1)`);
    const r3 = await call(t);
    check('a reply loses control characters and extra whitespace and is capped at 400', r3.text.startsWith('Hello there, pilot. x') && r3.text.length === 400 && !r3.text.includes('\u0000'), String(r3.text).slice(0, 40));
    await t.ev(`(__reply = 'Welcome to the Drift, pilot.', 1)`);

    // a model error names the problem, never the key
    await t.ev('(__status = 404, 1)');
    const r4 = await call(t);
    check('404: code model, plain-words error that says to check the model name', r4.code === 'model' && /model name/.test(r4.error) && !r4.error.includes(KEY_ANTHROPIC), JSON.stringify(r4));
    await t.ev('(__status = 200, 1)');

    // 429: wait 20 s, no second call meanwhile
    await t.ev('(__status = 429, 1)');
    const n429 = await t.ev('__calls.length');
    const r5 = await call(t);
    check('429: code busy, chat waits', r5.code === 'busy' && (await t.ev('chatUsable()')) === false, JSON.stringify(r5));
    await t.ev('(__status = 200, 1)');
    const r6 = await call(t);
    check('while waiting: refused without a network call', r6.code === 'busy' && (await t.ev('__calls.length')) === n429 + 1);
    await t.ev('(CHAT.waitUntil = 0, 1)');

    // three network failures pause chat for a minute
    await t.ev('(__fail = true, 1)');
    for (let i = 0; i < 3; i++) await call(t);
    check('three network failures: paused', (await t.ev('CHAT.pauseUntil > performance.now()')) === true);
    await t.ev('(__fail = false, 1)');
    const r7 = await call(t);
    check('while paused: refused with code paused', r7.code === 'paused', JSON.stringify(r7));
    await t.ev('(CHAT.pauseUntil = 0, 1)');

    // a rejected key switches chat off for good (until a new key)
    await t.ev('(__status = 401, 1)');
    const before = await t.ev('__calls.length');
    const r8 = await call(t);
    check('401: code rejected, status KEY REJECTED', r8.code === 'rejected' && (await t.ev('chatStatus()')) === 'KEY REJECTED', JSON.stringify(r8));
    await t.ev('(__status = 200, 1)');
    const r9 = await call(t);
    check('after a rejection no more calls', r9.code === 'rejected' && (await t.ev('__calls.length')) === before + 1);
    await t.ev(`chatSetKey('${KEY_OPENAI}')`);
    check('a new key clears the rejection', (await t.ev('chatStatus()')) === 'ON');

    // the key stays out of the save, the page text and the console
    await t.ev('saveGame(true)');
    const save = (await t.ev(`localStorage.getItem(SAVE_KEY) || ''`));
    check('the key is not in the save file', !save.includes(KEY_OPENAI) && !save.includes(KEY_ANTHROPIC));
    const page = await t.ev('document.body.innerText');
    check('the key is not in the page text', !page.includes(KEY_OPENAI) && !page.includes(KEY_ANTHROPIC));
    const log = await t.ev(`__log.join('\\n')`);
    check('the key never reached the console', !log.includes(KEY_OPENAI) && !log.includes(KEY_ANTHROPIC));
    await t.ev(`(chatSetKey(''), 1)`);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 2: the setup panel opens from the title screen (C), saves a key, tests it, closes with Esc ----
{
  const t = await launch('');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 20000, 'title');
    await t.ev(MOCK);
    await t.ev(`(chatSetKey(''), chatSetProvider(''), chatSetModel(''), 1)`);
    await t.ev(`chatOpenSetup(game.scene.getScene('Title'))`);
    await t.waitFor("game.scene.isActive('ChatSetup')", 8000, 'setup panel');
    check('the setup panel opens, the title waits below', (await t.ev("game.scene.isPaused('Title')")) === true);
    check('there is a real password box for the key and a text box for the model', (await t.ev("!!document.querySelector('input[type=password]') && document.querySelectorAll('input').length === 2")) === true);
    const text = await t.ev(`game.scene.getScene('ChatSetup').ui.box.list.filter(o => o.text).map(o => o.text).join(' | ')`); // the texts sit inside the panel's container
    check('the cost warning and the privacy line are on screen', /MAY COST YOU MONEY/.test(text) && /do not type anything private/.test(text));
    check('the status tag reads NO KEY', (await t.ev(`game.scene.getScene('ChatSetup').ui.tagText.text`)) === 'NO KEY');
    await t.ev(`(() => { const s = game.scene.getScene('ChatSetup'); s.el.value = 'short'; s.saveKey(); return 1; })()`);
    check('a too-short key is refused', (await t.ev('CHAT.key')) === '');
    await t.ev(`(() => { const s = game.scene.getScene('ChatSetup'); s.el.value = '${KEY_OPENAI}'; s.elModel.value = 'test-model'; s.saveKey(); return 1; })()`);
    check('a real-looking key is saved and the model with it', (await t.ev('CHAT.key')) === KEY_OPENAI && (await t.ev('CHAT.model')) === 'test-model');
    check('the key box is cleared after saving', (await t.ev(`game.scene.getScene('ChatSetup').el.value`)) === '');
    await t.shot('chat-setup'); // tests/out/chat-setup.png: the panel with a key saved
    check('the status tag reads ON and the provider button says Auto: OpenAI', (await t.ev(`game.scene.getScene('ChatSetup').ui.tagText.text`)) === 'ON' && (await t.ev(`game.scene.getScene('ChatSetup').prov.text`)) === 'Auto: OpenAI');
    await t.ev(`game.scene.getScene('ChatSetup').test()`);
    await t.waitFor('__calls.length === 1', 10000, 'test call');
    const c = await t.ev('__calls[0]');
    check('Test chat makes one call, to OpenAI, with the typed model', /api\.openai\.com/.test(c.url) && JSON.parse(c.body).model === 'test-model');
    await t.waitFor(`/^JUNO:/.test(game.scene.getScene('ChatSetup').status.text)`, 8000, 'JUNO line shown');
    check('JUNO\'s hello is shown', /Welcome to the Drift/.test(await t.ev(`game.scene.getScene('ChatSetup').status.text`)));
    check('the counter shows 1 call', /^1 call this session$/.test(await t.ev(`game.scene.getScene('ChatSetup').counter.text`)));
    await t.ev(`(chatSetProvider('anthropic'), game.scene.getScene('ChatSetup').refresh(), 1)`);
    check('the provider button shows the override', (await t.ev(`game.scene.getScene('ChatSetup').prov.text`)) === 'Anthropic');
    await t.press('ESC');
    await t.waitFor("!game.scene.isActive('ChatSetup')", 8000, 'setup closed');
    check('Esc closes it and the title comes back', (await t.ev("game.scene.isActive('Title')")) === true);
    check('the text boxes are gone', (await t.ev("document.querySelectorAll('input').length")) === 0);
    check('the key is not in the page text', !(await t.ev('document.body.innerText')).includes(KEY_OPENAI));
    await t.ev(`(chatSetKey(''), chatSetProvider(''), chatSetModel(''), 1)`); // leave the throwaway profile clean
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 3: the pause menu has the row and opens the panel from the station ----
{
  const t = await launch('#station');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await t.ev(MOCK);
    await t.ev(`openPause(game)`);
    await t.waitFor("game.scene.isActive('Pause')", 8000, 'pause menu');
    const rows = await t.ev(`game.scene.getScene('Pause').rows.map(r => r.text.trim()).join(' | ')`);
    check('the pause menu lists NPC chat before New game', /NPC chat\s+NO KEY \| New game/.test(rows), rows);
    await t.ev(`(() => { const p = game.scene.getScene('Pause'); p.sel = 6; p.activate(6); return 1; })()`);
    await t.waitFor("game.scene.isActive('ChatSetup')", 8000, 'setup from pause');
    check('the NPC chat row opens the setup panel over the pause menu', (await t.ev("game.scene.isPaused('Pause')")) === true);
    await t.ev(`game.scene.getScene('ChatSetup').close()`);
    await t.waitFor("game.scene.isActive('Pause') && !game.scene.isActive('ChatSetup')", 8000, 'back to pause');
    check('closing it returns to the pause menu', true);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

console.log(failed ? `CHAT FAIL (${failed})` : 'CHAT PASS');
process.exitCode = failed ? 1 : 0;
