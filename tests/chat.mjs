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
    await t.ev(`(chatSetKey(''), chatSetKey('${KEY_ANTHROPIC}'), 1)`); // one key at a time here: the OpenAI one goes first, so Auto would still pick it
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
    await t.waitFor("game.scene.isActive('Settings')", 8000, 'setup panel');
    const SE = "game.scene.getScene('Settings')";
    check('Settings opens at the keys, the title waits below', (await t.ev("game.scene.isPaused('Title')")) === true && (await t.ev(`${SE}.section`)) === 'keys');
    check('there are real boxes for the three keys and the model', (await t.ev("document.querySelectorAll('input[type=password]').length === 3 && document.querySelectorAll('input').length === 4")) === true);
    const text = await t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SE}.children.list.forEach(walk); return out.join(' | '); })()`);
    check('the cost warning and the privacy line are on screen', /MAY COST YOU MONEY/.test(text) && /do not type anything private/.test(text));
    check('the rail says no key is saved', /0 of 3/.test(text));
    await t.ev(`(() => { const s = ${SE}; s.inputs.openai.value = 'short'; s.saveKey('openai'); return 1; })()`);
    check('a too-short key is refused', (await t.ev('CHAT.key')) === '');
    await t.ev(`(() => { const s = ${SE}; s.inputs.openai.value = '${KEY_OPENAI}'; s.inputs.model.value = 'test-model'; s.saveKey('openai'); return 1; })()`);
    check('a real-looking key is saved and the model with it', (await t.ev('CHAT.key')) === KEY_OPENAI && (await t.ev('CHAT.model')) === 'test-model');
    check('the key box is cleared after saving', (await t.ev(`${SE}.inputs.openai.value`)) === '');
    await t.shot('chat-setup'); // tests/out/chat-setup.png: the keys with one saved
    const text2 = await t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SE}.children.list.forEach(walk); return out.join(' | '); })()`);
    check('the row shows the last four only, and the provider button says Auto: OpenAI', /\*\*\*\* oooo/.test(text2) && !text2.includes(KEY_OPENAI) && /Auto: OpenAI/.test(text2));
    await t.ev(`${SE}.testKey('openai')`);
    await t.waitFor('__calls.length === 1', 10000, 'test call');
    const c = await t.ev('__calls[0]');
    check('Test makes one call, to OpenAI, with the typed model', /api\.openai\.com/.test(c.url) && JSON.parse(c.body).model === 'test-model');
    await t.waitFor(`/^JUNO:/.test(${SE}.slots.status.text)`, 8000, 'JUNO line shown');
    check('JUNO\'s hello is shown', /Welcome to the Drift/.test(await t.ev(`${SE}.slots.status.text`)));
    check('the counter shows 1 call', /1 call this session$/.test(await t.ev(`${SE}.slots.counter.text`)));
    await t.ev(`(chatSetProvider('anthropic'), ${SE}.keysRefresh(), 1)`);
    check('the provider buttons show the override', (await t.ev(`${SE}.slots.provs.map(b => b.on).join()`)) === 'false,false,true');
    await t.press('ESC'); // the first Esc leaves the key box (the C key put the cursor there), the second closes the screen
    await t.press('ESC');
    await t.waitFor("!game.scene.isActive('Settings')", 8000, 'setup closed');
    check('Esc closes it and the title comes back', (await t.ev("game.scene.isActive('Title')")) === true);
    check('the text boxes are gone', (await t.ev("document.querySelectorAll('input').length")) === 0);
    check('the key is not in the page text', !(await t.ev('document.body.innerText')).includes(KEY_OPENAI));
    await t.ev(`(chatSetKey(''), chatSetProvider(''), chatSetModel(''), 1)`); // leave the throwaway profile clean
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 3: the pause menu has the Settings row and opens it from the station ----
{
  const t = await launch('#station');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await t.ev(MOCK);
    await t.ev(`openPause(game)`);
    await t.waitFor("game.scene.isActive('Pause')", 8000, 'pause menu');
    const rows = await t.ev(`game.scene.getScene('Pause').rows.map(r => r.text.trim()).join(' | ')`);
    check('the pause menu lists Settings before New game (the Journal row may sit between them)', /Settings[^|]*\| (Journal[^|]*\| )?New game/.test(rows), rows);
    await t.ev(`(() => { const p = game.scene.getScene('Pause'); p.sel = PAUSE_ROWS.indexOf('settings'); p.activate(p.sel); return 1; })()`);
    await t.waitFor("game.scene.isActive('Settings')", 8000, 'settings from pause');
    check('the Settings row opens Settings over the pause menu', (await t.ev("game.scene.isPaused('Pause')")) === true);
    await t.ev(`game.scene.getScene('Settings').close()`);
    await t.waitFor("game.scene.isActive('Pause') && !game.scene.isActive('Settings')", 8000, 'back to pause');
    check('closing it returns to the pause menu', true);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 4: the chat box in the bar (card space-game-npc-chat-bar) ----
{
  const t = await launch('#station');
  const ST = "game.scene.getScene('Station')";
  const keyT = async () => { // T is not in cdp.mjs's key table
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 84, nativeVirtualKeyCode: 84, code: 'KeyT', key: 't' });
    await sleep(60);
    await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 84, nativeVirtualKeyCode: 84, code: 'KeyT', key: 't' });
  };
  const elKey = async key => t.ev(`(() => { const el = document.querySelector('input'); if (!el) return 0; el.dispatchEvent(new KeyboardEvent('keydown', { key: '${key}', bubbles: true })); return 1; })()`);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await t.ev(MOCK);
    await t.ev(`(chatSetKey(''), chatSetProvider(''), chatSetModel(''), 1)`);
    // stand at the bar in front of JUNO (she is behind the counter)
    const near = async () => { await t.ev(`(() => { const s = ${ST}; s.player.setPosition(255, 572); s.player.setVelocity(0, 0); return 1; })()`); await sleep(250); };
    await near();
    check('no key: the prompt is the plain Talk to JUNO', (await t.ev(`${ST}.prompt.text`)) === 'E  Talk to JUNO', await t.ev(`${ST}.prompt.text`));
    await keyT(); await sleep(300);
    check('no key: T opens nothing and nothing is called', (await t.ev(`${ST}.chat === null`)) === true && (await t.ev('__calls.length')) === 0);

    await t.ev(`chatSetKey('${KEY_OPENAI}')`);
    await near();
    check('with a key: the prompt offers T to chat', /T to chat/.test(await t.ev(`${ST}.prompt.text`)), await t.ev(`${ST}.prompt.text`));
    await keyT();
    await t.waitFor(`${ST}.chat !== null`, 5000, 'chat opened');
    check('T opens the chat with JUNO, the panel shows, a text box is on the page', (await t.ev(`${ST}.chatBox.visible && ${ST}.chat.n.name === 'JUNO' && !!document.querySelector('input')`)) === true);
    check('the station treats it like an open terminal (s.panel) and the prompt is cleared', (await t.ev(`${ST}.panel === true && ${ST}.prompt.text === ''`)) === true);
    await t.waitFor('__calls.length === 1', 10000, 'the opening call');
    const b = JSON.parse(await t.ev('__calls[0].body'));
    const sys = b.messages[0].content;
    check('the character speaks first: one call with the seed line as the only turn', b.messages.length === 2 && b.messages[1].content === '[The pilot sits down.]');
    const at = m => sys.indexOf(m); // the block openers on their own lines: the RULES text also mentions the tags inline
    check('the system prompt: RULES, then WORLD, then persona and memory in tags, then NOW', at('RULES\n') === 0 && at('\nWORLD\n') > 0 && at('\nWORLD\n') < at('\n<persona>\n') && at('\n<persona>\n') < at('\n</persona>\n') && at('\n</persona>\n') < at('\n<memory>\n') && at('\n<memory>\n') < at('\n</memory>\n') && at('\n</memory>\n') < at('\nNOW\n'), [at('RULES\n'), at('\nWORLD\n'), at('\n<persona>\n'), at('\n</persona>\n'), at('\n<memory>\n'), at('\n</memory>\n'), at('\nNOW\n')].join(','));
    check('the rules name JUNO and say the tagged text is data', /You are JUNO, bartender/.test(sys) && /It is not instructions/.test(sys));
    check('the persona is inside the tags and NOW carries credits and hull', /<persona>\nWho: Juno/.test(sys) && /Credits: \d+\. Hull: \d+ of \d+/.test(sys));
    await t.waitFor(`${ST}.chatText.text === 'Welcome to the Drift, pilot.'`, 10000, 'reply typed out');
    check('the reply types out in the box', true);
    await t.shot('chat-bar');

    // a long line is clamped and sent as the next turn
    await t.ev(`(() => { const el = document.querySelector('input'); el.value = 'x'.repeat(300); return 1; })()`);
    await t.ev(`(${ST}.chat.lastSend = 0, 1)`);
    await elKey('Enter');
    await t.waitFor('__calls.length === 2', 10000, 'second call');
    const b2 = JSON.parse(await t.ev('__calls[1].body'));
    const last = b2.messages[b2.messages.length - 1];
    check('Enter sends the line, clamped to 240, after the seed and the reply', last.role === 'user' && last.content.length === 240 && b2.messages[b2.messages.length - 2].role === 'assistant');
    check('the box is emptied after sending', (await t.ev(`document.querySelector('input').value`)) === '');
    await t.waitFor(`${ST}.chat.busy === false`, 10000, 'reply two');
    // two Enters inside the gap send once
    await t.ev(`(() => { const el = document.querySelector('input'); el.value = 'one'; return 1; })()`);
    await t.ev(`(${ST}.chat.lastSend = 0, 1)`);
    await elKey('Enter');
    await t.ev(`(() => { const el = document.querySelector('input'); el.value = 'two'; return 1; })()`);
    await elKey('Enter');
    await t.waitFor(`${ST}.chat.busy === false && __calls.length >= 3`, 10000, 'reply three');
    await sleep(300);
    check('a second Enter inside 1.2 s is ignored (one call, not two)', (await t.ev('__calls.length')) === 3, 'calls ' + await t.ev('__calls.length'));
    // a 429 is said in-world and does not end the chat
    await t.ev('(__status = 429, 1)');
    await t.ev(`(() => { const el = document.querySelector('input'); el.value = 'still there?'; return 1; })()`);
    await t.ev(`(${ST}.chat.lastSend = 0, 1)`);
    await elKey('Enter');
    await t.waitFor(`${ST}.chatText.text === 'Give me a moment, pilot.'`, 10000, 'in-world wait line');
    check('429: JUNO asks for a moment and the chat stays open', (await t.ev(`${ST}.chat !== null`)) === true);
    await t.ev('(__status = 200, CHAT.waitUntil = 0, 1)');
    // walking away ends it; the text box goes
    await t.ev(`(() => { const s = ${ST}; s.player.setPosition(255, 420); return 1; })()`);
    await t.waitFor(`${ST}.chat === null`, 10000, 'closed by walking away');
    check('walking away closes the chat, hides the panel, removes the box, frees the station', (await t.ev(`!${ST}.chatBox.visible && !document.querySelector('input') && ${ST}.panel === false`)) === true);
    // Esc in the box ends it too
    await near(); await t.ev(`chatOpen(${ST}, 0)`); // the T path is proven above; open directly so a slow frame cannot drop the key
    await t.waitFor(`${ST}.chat !== null`, 10000, 'chat reopened');
    await elKey('Escape');
    await t.waitFor(`${ST}.chat === null`, 10000, 'closed by Esc');
    check('Esc in the box closes the chat and the pause menu does not open', (await t.ev("!game.scene.isActive('Pause')")) === true);
    // a rejected key closes the chat with the toast
    await near(); await t.ev('(__status = 401, 1)'); await t.ev(`chatOpen(${ST}, 0)`);
    await t.waitFor(`${ST}.chat === null && CHAT.bad === true`, 10000, 'closed by a rejected key');
    check('a rejected key ends the chat and switches it off', true);
    await t.ev('(__status = 200, 1)');
    const page = await t.ev('document.body.innerText'), log = await t.ev(`__log.join('\\n')`);
    check('the key is not in the page text or the console', !page.includes(KEY_OPENAI) && !log.includes(KEY_OPENAI));
    await t.ev(`(chatSetKey(''), 1)`);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.log('  FAIL bar: ' + e.message); failed++; }
  finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 5: memory (card space-game-npc-chat-memory) ----
{
  const t = await launch('#station');
  const ST = "game.scene.getScene('Station')";
  const elKey = async key => t.ev(`(() => { const el = document.querySelector('input'); if (!el) return 0; el.dispatchEvent(new KeyboardEvent('keydown', { key: '${key}', bubbles: true })); return 1; })()`);
  const near = async () => { await t.ev(`(() => { const s = ${ST}; s.player.setPosition(255, 572); s.player.setVelocity(0, 0); return 1; })()`); await sleep(250); };
  const say = async (line) => { // one line from the player, wait for the reply
    const before = await t.ev('__calls.length');
    await t.ev(`(() => { const el = document.querySelector('input'); el.value = ${JSON.stringify(line)}; return 1; })()`);
    await t.ev(`(${ST}.chat.lastSend = 0, 1)`);
    await elKey('Enter');
    await t.waitFor(`__calls.length === ${before + 1} && ${ST}.chat && ${ST}.chat.busy === false`, 15000, 'reply to ' + line.slice(0, 20));
  };
  const talk = async (reply) => { // a whole conversation: open, one line, close; the summary answers with reply
    await near(); await t.ev(`(__reply = 'Welcome back.', 1)`); await t.ev(`chatOpen(${ST}, 0)`);
    await t.waitFor(`${ST}.chat !== null && ${ST}.chat.busy === false && ${ST}.chat.replies === 1`, 15000, 'opened');
    await say('Just passing through.');
    const before = await t.ev('__calls.length');
    await t.ev(`(__reply = ${JSON.stringify(reply)}, 1)`);
    await elKey('Escape');
    await t.waitFor(`__calls.length === ${before + 1}`, 15000, 'summary call');
    await sleep(400);
  };
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await t.ev(MOCK);
    await t.ev(`(chatSetKey(''), chatSetProvider(''), chatSetModel(''), chatReset(), 1)`);
    // offline: an E talk counts a meeting and files the line, with no call
    await t.ev(`talkTo(${ST}, 0)`);
    const off = await t.ev('JSON.stringify(G.chat)');
    check('no key: an E talk counts a meeting and files the line as a fact, no call', /"juno":\{"met":1,"chats":0/.test(off) && /"fact":"JUNO: /.test(off) && (await t.ev('__calls.length')) === 0, off);
    await t.ev(`(hideTalk(${ST}), talkTo(${ST}, 0), hideTalk(${ST}), talkTo(${ST}, 0), 1)`); // E again while a line types is a skip, not a meeting
    check('two more talks: met 3, each different line filed once', (await t.ev('G.chat.npcs.juno.met')) === 3 && (await t.ev('G.chat.journal.length')) >= 2);
    await t.ev(`(hideTalk(${ST}), 1)`);

    // a conversation: the player gives a name; the summary updates the notes
    await t.ev(`chatSetKey('${KEY_OPENAI}')`);
    await near(); await t.ev(`chatOpen(${ST}, 0)`);
    await t.waitFor(`${ST}.chat !== null && ${ST}.chat.busy === false && ${ST}.chat.replies === 1`, 15000, 'opened');
    const sysFirst = JSON.parse(await t.ev('__calls[0].body')).messages[0].content;
    check('before any chat the memory block says you have not talked, with the E talks counted as visits', /you have not talked before\. You have talked 0 times/.test(sysFirst) && /Time in the bar: 3 visits before/.test(sysFirst));
    await say('My name is Troy and I fly careful.');
    const summaryReply = { npcNotes: 'Careful pilot named Troy; polite, asks about prices.', playerNotes: 'Name Troy. Flies carefully.', name: 'Troy', mood: 'warm', journal: ['The repair bay charges half a credit a point.', 'y'.repeat(200)], last: 'Come back alive, Troy.' };
    const nBefore = await t.ev('__calls.length');
    await t.ev(`(__reply = ${JSON.stringify(JSON.stringify(summaryReply))}, 1)`);
    await elKey('Escape');
    await t.waitFor(`__calls.length === ${nBefore + 1}`, 15000, 'the summary call');
    const sb = JSON.parse(await t.ev(`__calls[${nBefore}].body`));
    check('closing sends one summary call: JSON-only rules, old notes in a memory block, the conversation as data', /Return JSON only/.test(sb.messages[0].content) && /<memory>/.test(sb.messages[0].content) && /PILOT: My name is Troy/.test(sb.messages[1].content) && sb.max_completion_tokens === 300);
    await t.waitFor(`G.chat.npcs.juno.notes === 'Careful pilot named Troy; polite, asks about prices.'`, 10000, 'notes applied');
    const mem = await t.ev('JSON.stringify(G.chat)');
    check('the summary fills the notes, the name, the mood and the last line', /"name":"Troy"/.test(mem) && /"notes":"Name Troy\. Flies carefully\."/.test(mem) && /"mood":"warm"/.test(mem) && /"last":"Come back alive, Troy\."/.test(mem), mem);
    check('met and chats count the conversation', (await t.ev('G.chat.npcs.juno.met')) === 4 && (await t.ev('G.chat.npcs.juno.chats')) === 1);
    check('two journal facts from the summary, the long one clamped to 120', (await t.ev(`G.chat.journal.some(j => j.fact === 'The repair bay charges half a credit a point.' && j.npc === 'juno')`)) === true && (await t.ev(`G.chat.journal.some(j => j.fact.length === 120)`)) === true);

    // the next chat carries the memory in its prompt
    await near(); await t.ev(`(__reply = 'Troy. Good to see you.', 1)`); await t.ev(`chatOpen(${ST}, 0)`);
    await t.waitFor(`${ST}.chat !== null && ${ST}.chat.busy === false`, 15000, 'reopened');
    const sysNext = JSON.parse(await t.ev(`__calls[${nBefore + 1}].body`)).messages[0].content;
    check('the next prompt carries the notes, the name, the mood and the last line', /Your notes on them: Careful pilot named Troy/.test(sysNext) && /Name: Troy\./.test(sysNext) && /You feel warm about them/.test(sysNext) && /Last time you said: Come back alive, Troy\./.test(sysNext) && /You have talked 1 time\./.test(sysNext));
    await say('Still careful.');
    const n2 = await t.ev('__calls.length');
    await t.ev(`(__reply = 'not json at all {', 1)`); await elKey('Escape');
    await t.waitFor(`__calls.length === ${n2 + 1}`, 15000, 'summary two'); await sleep(400);
    check('broken JSON keeps the old notes', (await t.ev('G.chat.npcs.juno.notes')) === 'Careful pilot named Troy; polite, asks about prices.' && (await t.ev('G.chat.npcs.juno.chats')) === 2);
    await talk(JSON.stringify({ npcNotes: 'x'.repeat(500), mood: 'ecstatic', journal: ['a', 'b', 'c'], name: 'Troy<script>' }));
    const m3 = await t.ev('JSON.stringify(G.chat.npcs.juno)');
    check('a wild summary is clamped: notes 240, mood refused, two facts at most, name at most 40', (await t.ev('G.chat.npcs.juno.notes.length')) === 240 && /"mood":"warm"/.test(m3) && (await t.ev(`G.chat.journal.filter(j => ['a','b','c'].includes(j.fact)).length`)) === 2 && (await t.ev('G.chat.player.name.length')) <= 40, m3);

    // the save: the memory goes in, the key does not; load brings it back; new game clears it
    // the save file is made and applied with the same functions saveGame and loadGame use (the wild summary above left notes of 240 x and the odd name)
    const save = await t.ev('JSON.stringify(snapshot())');
    check('the save holds the chat memory and not the key', /"chat":\{"v":1/.test(save) && /"name":"Troy<script>"/.test(save) && /"notes":"x{240}"/.test(save) && !save.includes(KEY_OPENAI), save.slice(save.indexOf('"chat"'), save.indexOf('"chat"') + 120));
    await t.ev('(G.chat = chatMemoryEmpty(), 1)');
    await t.ev(`(applySave(${JSON.stringify(save)}), 1)`.replace(/^\(applySave\("/, '(applySave(JSON.parse("').replace(/"\), 1\)$/, '")), 1)'));
    check('applySave restores it, cleaned', (await t.ev('G.chat.player.name')) === 'Troy<script>' && (await t.ev('G.chat.npcs.juno.chats')) === 3 && (await t.ev('G.chat.npcs.juno.notes.length')) === 240);
    await t.ev(`(() => { const s = snapshot(); s.chat.npcs.juno.mood = 'furious'; s.chat.npcs.juno.notes = 'z'.repeat(900); s.chat.journal = Array.from({ length: 90 }, (_, i) => ({ t: i, npc: 'juno', fact: 'f' + i })); applySave(s); return 1; })()`);
    check('a hand-edited save is clamped on the way in: mood neutral, notes 400, journal 40', (await t.ev('G.chat.npcs.juno.mood')) === 'neutral' && (await t.ev('G.chat.npcs.juno.notes.length')) === 400 && (await t.ev('G.chat.journal.length')) === 40);
    await t.ev('newGameState()');
    check('new game clears the memory', (await t.ev('JSON.stringify(G.chat)')) === JSON.stringify({ v: 1, player: { name: '', notes: '' }, npcs: {}, journal: [] }));
    const page = await t.ev('document.body.innerText'), log = await t.ev(`__log.join('\\n')`);
    check('the key is not in the page text or the console', !page.includes(KEY_OPENAI) && !log.includes(KEY_OPENAI));
    await t.ev(`(chatSetKey(''), 1)`);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.log('  FAIL memory: ' + e.message); failed++; }
  finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 6: a voice per character (card space-game-npc-chat-voice): the reply starts typing with the audio ----
{
  const t = await launch('#station');
  const ST = "game.scene.getScene('Station')";
  const KEY_VOICE = 'TEST-KEY-NOT-REAL-' + 'ABCDEFGHIJ';
  // Deepgram answers 0.1 s of silence (after __dgDelay ms); the chat provider calls still go to the mock above
  const DG = `(() => {
    const wav = new ArrayBuffer(44 + 1600), v = new DataView(wav), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + 1600, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, 1600, true);
    const base = window.fetch; window.__dg = []; window.__dgDelay = 0;
    window.fetch = (url, opts) => /deepgram/.test(String(url))
      ? (__dg.push({ url: String(url), auth: opts.headers.Authorization, body: opts.body }), new Promise(r => setTimeout(r, __dgDelay)).then(() => new Response(wav.slice(0))))
      : base(url, opts);
    return 1;
  })()`;
  const elKey = async key => t.ev(`(() => { const el = document.querySelector('input'); if (!el) return 0; el.dispatchEvent(new KeyboardEvent('keydown', { key: '${key}', bubbles: true })); return 1; })()`);
  const stand = async (x, y) => { await t.ev(`(() => { const s = ${ST}; s.player.setPosition(${x}, ${y}); s.player.setVelocity(0, 0); return 1; })()`); await sleep(250); };
  const send = async line => {
    await t.ev(`(() => { const el = document.querySelector('input'); el.value = ${JSON.stringify(line)}; return 1; })()`);
    await t.ev(`(${ST}.chat.lastSend = 0, window.__t0 = performance.now(), 1)`);
    await elKey('Enter');
  };
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await t.ev(MOCK); await t.ev(DG);
    await t.ev(`(chatSetKey('${KEY_OPENAI}'), chatSetProvider(''), chatSetModel(''), voiceSetKey('${KEY_VOICE}'), voiceSetOn(true), G.muted = false, G.volume = 1, 1)`);
    check('with both keys the voice is usable', (await t.ev('voiceUsable()')) === true);

    console.log('fast audio');
    await stand(255, 572); await t.ev(`chatOpen(${ST}, 0)`);
    await t.waitFor(`${ST}.chatText.text === 'Welcome to the Drift, pilot.'`, 15000, 'reply typed with the audio');
    check('JUNO\'s reply went to Deepgram once, in her voice', (await t.ev('__dg.length')) === 1 && /^https:\/\/api\.deepgram\.com\/v1\/speak\?model=aura-luna-en&encoding=mp3$/.test(await t.ev('__dg[0].url')), await t.ev('__dg[0].url'));
    check('what was spoken is the reply, the key only in the header', JSON.parse(await t.ev('__dg[0].body')).text === 'Welcome to the Drift, pilot.' && (await t.ev('__dg[0].auth')) === 'Token ' + KEY_VOICE && !(await t.ev('__dg[0].url')).includes(KEY_VOICE));
    check('the chat provider was called once and nothing but the reply went to Deepgram', (await t.ev('__calls.length')) === 1);
    await t.waitFor(`${ST}.chat.busy === false`, 10000, 'box open again');

    console.log('slow audio');
    await t.ev(`(__reply = 'Slow one.', __dgDelay = 5000, 1)`);
    await send('Anything new?');
    await t.waitFor('__calls.length === 2', 10000, 'second chat call'); await sleep(500);
    check('while the audio is on its way the box is locked and the dots go on', (await t.ev(`${ST}.chat.busy === true && document.querySelector('input').disabled === true && /^[. ]*$/.test(${ST}.chatText.text)`)) === true, await t.ev(`${ST}.chatText.text`));
    await t.waitFor(`${ST}.chatText.text.length > 0 && !/^[. ]*$/.test(${ST}.chatText.text)`, 10000, 'text starts without the audio');
    const waited = Math.round(await t.ev('performance.now() - __t0'));
    check('the reply starts typing after about 1.5 s, not 5', waited >= 1300 && waited <= 4500, waited + ' ms');
    await t.waitFor(`${ST}.chat.busy === false`, 10000, 'box open again');
    check('the box opens once the text is on screen', (await t.ev(`document.querySelector('input').disabled`)) === false);

    console.log('no voice key');
    await t.ev(`(voiceSetKey(''), __reply = 'No voice.', __dgDelay = 0, 1)`);
    const dgBefore = await t.ev('__dg.length');
    await send('And now?');
    await t.waitFor(`${ST}.chatText.text === 'No voice.'`, 10000, 'text-only reply');
    const quick = Math.round(await t.ev('performance.now() - __t0'));
    check('without a voice key the reply types at once and nothing goes to Deepgram', quick < 1300 && (await t.ev('__dg.length')) === dgBefore, quick + ' ms');

    console.log('another character');
    await t.ev(`chatClose(${ST}, true)`);
    await t.waitFor('VOICE.playing === false && VOICE.queue.length === 0', 20000, 'the slow line to finish'); // else DEX waits in the queue behind it (which is right, but a test cannot read the call yet)
    await t.ev(`(voiceSetKey('${KEY_VOICE}'), __reply = 'Measured.', 1)`);
    const before = await t.ev('__dg.length');
    await stand(140, 520); await t.ev(`chatOpen(${ST}, 2)`);
    await t.waitFor(`${ST}.chatText.text === 'Measured.'`, 15000, 'DEX reply');
    await t.waitFor(`__dg.length === ${before + 1}`, 10000, 'DEX audio call');
    check("DEX speaks in his own voice (his Aura name reaches the URL)", (await t.ev('__dg.length')) === before + 1 && new RegExp('model=' + (await t.ev('NPCS[2].voice')) + '&').test(await t.ev(`__dg[${before}].url`)), await t.ev(`__dg[${before}].url`));
    check('the voice name is not the ship computer\'s', !/aura-athena-en/.test(await t.ev(`__dg[${before}].url`)) || (await t.ev('NPCS[2].voice')) === 'aura-athena-en');
    check('the voice key is not in the page text or the console', !(await t.ev('document.body.innerText')).includes(KEY_VOICE) && !(await t.ev(`__log.join('\\n')`)).includes(KEY_VOICE));
    await t.ev(`(chatSetKey(''), voiceSetKey(''), 1)`);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.log('  FAIL voice: ' + e.message); failed++; }
  finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

console.log(failed ? `CHAT FAIL (${failed})` : 'CHAT PASS');
process.exitCode = failed ? 1 : 0;
