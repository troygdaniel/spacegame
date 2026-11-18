// smoke: the Settings screen: sound, keys with a mocked fetch, controls from the one table, content, reset; S V C P on the Title; the Pause row
// The Settings screen (src/settings.js, src/data_controls.js; card space-game-settings-screen) with a MOCKED fetch: nothing here ever calls
// Deepgram, OpenAI or Anthropic, so nothing is spent. Run: node tests/settings.mjs   (exit code 1 on any failure)
// Checks: the one table of keys (its shape, and that the H page and the Ship bay's list are built from it); S, V, C and P on the title;
// the Pause row; the sound section (volume, mute, ship voice, its voice); the keys section (paste, last four only, Test, Forget, a key in
// the wrong row, the provider, the model, the old single chat key moving to its slot, typing never reaching the game); the controls tabs;
// the content section; Reset and Forget all keys with a second press, from the title and from Pause; and that NOTHING is called except by
// the Test and Hear it buttons (every call is counted, and any host that is not one of the three fails the run).
// Runs one headless Chrome at a time (the Mac is shared).
import { chromePool, sleep } from './cdp.mjs';

// built at run time so the hygiene scan (tests/hygiene.mjs) never sees a key-shaped literal
const KEY_DG = 'TEST-KEY-NOT-REAL-ABCDEFGHIJKL', KEY_OA = 'sk-test-' + 'o'.repeat(28), KEY_AN = 'sk-ant-test-' + 'a'.repeat(28);
let failed = 0;
const pool = chromePool(); // every case shares one Chrome (one turn at the test lock), each starting on a clean profile (tests/cdp.mjs goto)
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

// a fetch that records every call and answers in the shape of whichever provider the URL names; any other host is recorded as stray
const MOCK = `(() => {
  const wav = new ArrayBuffer(44 + 1600), v = new DataView(wav), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + 1600, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, 1600, true);
  window.__calls = []; window.__stray = []; window.__log = [];
  window.fetch = (url, opts) => {
    const u = String(url), h = (opts && opts.headers) || {};
    __calls.push({ url: u, headers: h, body: opts && opts.body });
    if (/^https:\\/\\/api\\.deepgram\\.com\\//.test(u)) return Promise.resolve(new Response(wav.slice(0), { status: 200, headers: { 'content-type': 'audio/wav' } }));
    if (/^https:\\/\\/api\\.openai\\.com\\//.test(u)) return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Welcome to the Drift, pilot.' } }] }), { status: 200 }));
    if (/^https:\\/\\/api\\.anthropic\\.com\\//.test(u)) return Promise.resolve(new Response(JSON.stringify({ content: [{ type: 'text', text: 'Welcome to the Drift, pilot.' }] }), { status: 200 }));
    __stray.push(u); return Promise.resolve(new Response('{}', { status: 500 }));
  };
  ['log', 'warn', 'error', 'info', 'debug'].forEach(m => { const o = console[m]; console[m] = (...a) => { __log.push(a.join(' ')); o.apply(console, a); }; });
  return 1;
})()`;

const SE = "game.scene.getScene('Settings')";
const KEYS = { A: [65, 'KeyA', 'a'], D: [68, 'KeyD', 'd'], M: [77, 'KeyM', 'm'], P: [80, 'KeyP', 'p'], S: [83, 'KeyS', 's'], V: [86, 'KeyV', 'v'], C: [67, 'KeyC', 'c'], W: [87, 'KeyW', 'w'], E: [69, 'KeyE', 'e'], H: [72, 'KeyH', 'h'],
  ENTER: [13, 'Enter', 'Enter'], ESC: [27, 'Escape', 'Escape'], SPACE: [32, 'Space', ' '], UP: [38, 'ArrowUp', 'ArrowUp'], DOWN: [40, 'ArrowDown', 'ArrowDown'], LEFT: [37, 'ArrowLeft', 'ArrowLeft'], RIGHT: [39, 'ArrowRight', 'ArrowRight'] };
const mk = t => async (k, hold = 90) => { // the harness's own key table is short, so this sends the key itself
  const [vk, code, key] = KEYS[k];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key }); await sleep(hold);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key }); await sleep(280);
};
const texts = (t, scene = 'Settings') => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('${scene}').children.list.forEach(walk); return out.join('|'); })()`);
const calls = t => t.ev('__calls.map(c => c.url).join(" ")');
const open = async (t, press, key, section) => { await press(key); await t.waitFor(`game.scene.isActive('Settings') && ${SE}.section === '${section}'`, 8000, 'settings ' + section); await sleep(400); };

// ---- part 1: the title screen ----
{
  const t = await pool.open('');
  const press = mk(t);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 20000, 'title');
    await t.ev(MOCK);
    await t.ev("(() => { try { localStorage.clear(); } catch (e) {} chatLoad(); voiceLoad(); G.muted = false; G.volume = 0.8; G.credits = 1234; return 1; })()"); // the credits are set before any key is saved: a payment is a thing the ship voice speaks about, and that is the game's call, not Settings'
    await sleep(800);

    console.log('A. the table of keys');
    const tb = await t.ev(`(() => ({ ids: CONTROLS.map(g => g.id), ok: CONTROLS.every(g => g.title && g.rows.length && g.rows.every(r => Array.isArray(r.k) && r.k.length && r.k.every(x => typeof x === 'string' && x) && typeof r.t === 'string' && r.t)),
      bay: BAY_CONTROLS.length, bayBack: JSON.stringify(BAY_CONTROLS) === JSON.stringify(controlsBay()), marked: CONTROLS.reduce((n, g) => n + g.rows.filter(r => r.bay).length, 0),
      help: ['Station', 'Ship', 'Space', 'Surface'].every(s => HELP[s].length && JSON.stringify(HELP[s]) === JSON.stringify(controlsHelp(s))), flight: HELP.Space.length }))()`);
    check('six groups with unique ids, every row has keys and words', tb.ids.length === 6 && new Set(tb.ids).size === 6 && tb.ok, tb.ids.join());
    check('the Ship bay list is the rows marked bay, twelve of them', tb.bay === 12 && tb.marked === 12 && tb.bayBack);
    check('the H page lines of every scene come from the table', tb.help);
    check('the table has the keys the game uses (a sample)', await t.ev(`['W', 'Shift', 'N', 'T', 'J', 'Tab', 'H', 'M', 'Esc', 'S', 'V', 'C', 'P'].every(k => CONTROLS.some(g => g.rows.some(r => r.k.includes(k))))`));

    console.log('B. S opens Settings from the title; nothing is called');
    check('the title has a Settings chip', (await texts(t, 'Title')).includes('SETTINGS'));
    await open(t, press, 'S', 'sound');
    check('Settings is up over the paused title (the game did not start)', await t.ev("game.scene.isPaused('Title') && !game.scene.isActive('Station')"));
    const s1 = await texts(t);
    ['SETTINGS', 'SOUND', 'KEYS', 'CONTROLS', 'CONTENT', 'RESET', 'MASTER VOLUME', 'SHIP VOICE', 'ATHENA'].forEach(w => check('shows ' + w, s1.includes(w)));
    check('the rail says the volume and that no key is saved', s1.includes('80%') && s1.includes('0 of 3'));
    { // the blind critic, picture 10: the title's letters ghosted through the panel
      const b = await t.ev(`(() => { const s = ${SE}, box = s.ui.box, i = box.list.indexOf(s.back); return JSON.stringify({ has: !!s.back, i, n: box.list.length, firstIsDim: box.list[0].type === 'Rectangle', dim: SETTINGS.dim }); })()`).then(JSON.parse);
      check('a solid back sits under the glass of the panel and over its dim, and the scene behind is dimmed almost out', b.has && b.i === 1 && b.firstIsDim && b.n > 4 && 1 - 0.45 * (1 - b.dim) >= 0.95, JSON.stringify(b));
    }
    await t.shot('settings-1-sound');

    console.log('C. sound: volume, mute, the ship voice and its voice');
    await press('RIGHT'); check('right raises the volume a notch', Math.abs(await t.ev('G.volume') - 0.9) < 0.001);
    await press('LEFT'); await press('LEFT'); check('left lowers it', Math.abs(await t.ev('G.volume') - 0.7) < 0.001);
    await press('ENTER'); check('Enter mutes', await t.ev('G.muted') === true && (await texts(t)).includes('Sound: MUTED'));
    await press('M'); check('M unmutes, and the screen follows', await t.ev('G.muted') === false && (await texts(t)).includes('Sound: ON'));
    await t.ev(`${SE}.stepVoice(1)`); check('the > button picks the next voice and remembers it', await t.ev('VOICE.voice') === 'aura-asteria-en' && await t.ev("localStorage.getItem('longhaul.voice.model')") === 'aura-asteria-en' && (await texts(t)).includes('ASTERIA'));
    await t.ev(`(${SE}.stepVoice(-1), ${SE}.stepVoice(-1), 1)`); check('and wraps round the list', await t.ev('VOICE.voice') === 'aura-helios-en');
    await t.ev(`${SE}.stepVoice(1)`);
    check('the status says no Deepgram key', (await texts(t)).includes('No Deepgram key yet'));
    { // the blind critic, picture 10: "Ship voice: ON" stood beside "the game is silent" with the sound on at 100%
      const v = await texts(t);
      check('with no key the voice button does not claim ON: it says it needs a key', await t.ev('VOICE.on') === true && v.includes('Ship voice: NEEDS KEY') && !v.includes('Ship voice: ON'));
      check('nothing says the game is silent while the sound is on', !/the game is silent/.test(String(v)) && /The sound effects play/.test(String(v)));
      const fit = await t.ev(`(() => { const s = ${SE}, v = s.slots.voiceStat; return JSON.stringify({ right: Math.round(v.x + v.width), edge: SETTINGS.w / 2 }); })()`).then(JSON.parse);
      check('the line beside the voice button ends inside the panel', fit.right <= fit.edge - 16, JSON.stringify(fit));
      await t.ev(`(voiceSetOn(false), ${SE}.soundRefresh(), 1)`); check('switched off it says OFF', (await texts(t)).includes('Ship voice: OFF'));
      await t.ev(`(voiceSetOn(true), ${SE}.soundRefresh(), 1)`);
    }
    check('so far no call at all', await t.ev('__calls.length') === 0);

    console.log('D. the other sections open with the keys of the rail');
    await press('DOWN'); check('Down goes to Keys', await t.ev(`${SE}.section`) === 'keys');
    check('three key boxes and the model box are on the screen, the Deepgram one has the focus', await t.ev("document.querySelectorAll('input').length") === 4 && await t.ev("document.activeElement === document.querySelectorAll('input')[0]"));
    const k1 = await texts(t);
    ['THESE USE YOUR OWN ACCOUNTS AND MAY COST YOU MONEY', 'DEEPGRAM', 'OPENAI', 'ANTHROPIC', 'no key', 'NPC CHAT', 'PROVIDER', 'Auto: OpenAI'].forEach(w => check('keys shows ' + w, k1.includes(w)));
    check('the note says the keys stay in this browser', k1.includes('stays in this browser'));
    await t.shot('settings-2-keys');
    await t.ev(`${SE}.show('sound')`);
    check('leaving the keys section takes the text boxes away', await t.ev("document.querySelectorAll('input').length") === 0);
    await press('ESC');
    await t.waitFor("!game.scene.isActive('Settings')", 8000, 'closed');
    check('Esc closes it and the title runs again', await t.ev("game.scene.isActive('Title') && !game.scene.isPaused('Title')"));

    console.log('E. V and C open the keys at the right box; P with nothing to show does nothing');
    await open(t, press, 'V', 'keys');
    check('V: the Deepgram box has the focus', await t.ev("document.activeElement === document.querySelectorAll('input')[0]"));
    await press('ESC'); check('Esc in a box only leaves the box', await t.ev("game.scene.isActive('Settings') && document.activeElement !== document.querySelectorAll('input')[0]"));
    await press('ESC'); await t.waitFor("!game.scene.isActive('Settings')", 8000, 'closed');
    await open(t, press, 'C', 'keys');
    check('C: the OpenAI box has the focus', await t.ev("document.activeElement === document.querySelectorAll('input')[1]"));
    await press('ESC'); await press('ESC'); await t.waitFor("!game.scene.isActive('Settings')", 8000, 'closed');
    // P opens Content only when there is something to show (a problem or a mod): the title is drawn again with one fake problem
    await t.ev("(() => { CONTENT_ERRORS.push({ level: 'error', path: 'content/parts/x.md', line: 3, message: 'a test problem', fix: 'ignored' }); game.scene.getScene('Title').scene.restart(); return 1; })()");
    await sleep(1500);
    check('the title shows the content chip for it', (await texts(t, 'Title')).includes('CONTENT: 1 PROBLEM'));
    await open(t, press, 'P', 'content');
    check('P: Settings opens at Content and lists the problem in plain words', (await texts(t)).includes('a test problem') && await t.ev("game.scene.isPaused('Title')"));
    await press('ESC'); await t.waitFor("!game.scene.isActive('Settings')", 8000, 'closed');
    await t.ev("(() => { CONTENT_ERRORS.pop(); game.scene.getScene('Title').scene.restart(); return 1; })()");
    await sleep(1500);

    console.log('F. keys: paste, last four, wrong rows, Test, Forget');
    await open(t, press, 'V', 'keys');
    const set = (id, v) => t.ev(`(() => { ${SE}.inputs.${id}.value = ${JSON.stringify(v)}; return 1; })()`);
    const save = id => t.ev(`${SE}.saveKey('${id}')`);
    const say = () => t.ev(`${SE}.slots.status.text`);
    await set('deepgram', 'short'); await save('deepgram');
    check('a too-short key is refused', await t.ev('VOICE.key') === '' && (await say()).includes('does not look like a Deepgram key'));
    await set('deepgram', KEY_DG); await save('deepgram');
    check('a real-looking Deepgram key is saved, the box cleared', await t.ev('VOICE.key') === KEY_DG && await t.ev(`${SE}.inputs.deepgram.value`) === '');
    const k2 = await texts(t);
    check('the row shows the last four and nothing more', k2.includes('**** IJKL') && !k2.includes(KEY_DG) && !k2.includes('ABCDEFGHIJ'));
    await set('openai', KEY_AN); await save('openai');
    check('an Anthropic key in the OpenAI row is refused, and says where it goes', CHATKEY(await t.ev('CHAT.keys.openai')) === '' && (await say()).includes('Anthropic row'));
    await set('anthropic', KEY_OA); await save('anthropic');
    check('an OpenAI key in the Anthropic row is refused', await t.ev('CHAT.keys.anthropic') === '' && (await say()).includes('sk-ant-'));
    await set('openai', KEY_OA); await save('openai');
    check('the OpenAI key is saved in its own slot', await t.ev('CHAT.keys.openai') === KEY_OA && await t.ev("localStorage.getItem('longhaul.chat.key.openai')") === KEY_OA && (await texts(t)).includes('**** oooo'));
    await set('anthropic', KEY_AN); await save('anthropic');
    check('the Anthropic key is saved in its own slot', await t.ev('CHAT.keys.anthropic') === KEY_AN && (await texts(t)).includes('**** aaaa'));
    check('Auto uses OpenAI while both are saved, and the rail counts 3 of 3', await t.ev('chatProvider()') === 'openai' && (await texts(t)).includes('3 of 3') && (await texts(t)).includes('Auto: OpenAI'));
    check('saving a key called nothing', await t.ev('__calls.length') === 0);
    await t.ev('chatSetProvider("anthropic")'); await t.ev(`${SE}.keysRefresh()`);
    check('choosing Anthropic makes its key the one in use', await t.ev('chatProvider() === "anthropic" && CHAT.key === ' + JSON.stringify(KEY_AN)));
    await t.ev('chatSetProvider("")'); await t.ev(`${SE}.keysRefresh()`);
    await t.shot('settings-3-keys-saved');

    await t.ev(`${SE}.testKey('deepgram')`); await t.waitFor('__calls.length === 1', 10000, 'deepgram call');
    const c1 = await t.ev('__calls[0]');
    check('Test in the Deepgram row makes one call, to Deepgram, the key in the header only', /^https:\/\/api\.deepgram\.com\/v1\/speak\?/.test(c1.url) && c1.headers.Authorization === 'Token ' + KEY_DG && !c1.url.includes(KEY_DG) && !c1.body.includes(KEY_DG));
    await t.waitFor(`/works|reach|play/.test(${SE}.slots.status.text)`, 10000, 'deepgram result');
    await t.ev(`${SE}.testKey('openai')`); await t.waitFor('__calls.length === 2', 10000, 'openai call');
    const c2 = await t.ev('__calls[1]');
    check('Test in the OpenAI row calls OpenAI with that key', /^https:\/\/api\.openai\.com\//.test(c2.url) && c2.headers.Authorization === 'Bearer ' + KEY_OA);
    await t.waitFor(`/^JUNO:/.test(${SE}.slots.status.text)`, 10000, 'juno');
    check('JUNO\'s hello is shown', /Welcome to the Drift/.test(await say()));
    await t.ev(`${SE}.testKey('anthropic')`); await t.waitFor('__calls.length === 3', 10000, 'anthropic call');
    const c3 = await t.ev('__calls[2]');
    check('Test in the Anthropic row calls Anthropic with that key, even though Auto points at OpenAI', /^https:\/\/api\.anthropic\.com\//.test(c3.url) && c3.headers['x-api-key'] === KEY_AN);
    await t.waitFor(`/^JUNO:/.test(${SE}.slots.status.text)`, 10000, 'juno 2');

    await t.ev(`(() => { ${SE}.inputs.model.value = 'test-model'; return ${SE}.saveModel(), 1; })()`);
    check('the model box saves the model name', await t.ev('CHAT.model') === 'test-model' && await t.ev("localStorage.getItem('longhaul.chat.model')") === 'test-model');
    await t.ev(`${SE}.forgetKey('openai')`);
    check('Forget removes that key from the browser, the others stay', await t.ev('CHAT.keys.openai') === '' && await t.ev("localStorage.getItem('longhaul.chat.key.openai')") === null && await t.ev('CHAT.keys.anthropic') === KEY_AN && await t.ev('VOICE.key') === KEY_DG);
    check('Auto now points at Anthropic, the one that has a key', await t.ev('chatProvider()') === 'anthropic');

    console.log('G. typing in a key box never reaches the game');
    await t.ev(`${SE}.inputs.deepgram.focus()`);
    await press('M'); await press('S'); await press('W'); await press('ENTER');
    check('M, S, W and Enter typed into a box do not mute, change section or save', await t.ev('G.muted') === false && await t.ev(`${SE}.section`) === 'keys' && await t.ev('VOICE.key') === KEY_DG);
    await t.ev(`${SE}.blurInputs()`);

    console.log('H. controls');
    await t.ev(`${SE}.show('controls')`); await sleep(300);
    const g0 = await texts(t);
    check('the first group lists its rows from the table', ['STATION', 'SHIP BAY', 'FLIGHT', 'SURFACE', 'TITLE', 'ANYWHERE', 'Use the terminal, repair bay or ship', 'Journal: who you have met'].every(w => g0.includes(w)));
    await press('RIGHT'); await press('RIGHT');
    const g2 = await texts(t);
    check('right moves two groups on: the flight keys show', g2.includes('Thrust') && g2.includes('Cruise there') && g2.includes('Places. Enter: set, then go'));
    check('every group row count on screen matches the table', await t.ev(`(() => { let ok = true; for (const g of CONTROLS) { ${SE}.ctab = g.id; ${SE}.show('controls'); const n = ${SE}.body.list.filter(o => o.type === 'Container').length; if (n < g.rows.length) ok = false; } return ok; })()`));
    await t.shot('settings-4-controls');

    console.log('H2. flight feel');
    await t.ev(`${SE}.show('flight')`); await sleep(300);
    const f0 = await texts(t);
    check('the Flight section shows the row and both feels', ['FLIGHT FEEL', 'Classic', 'Heavy', 'TURN BUILDS', 'TO TOP SPEED', 'at once'].every(w => f0.includes(w)));
    check('Classic is the feel on a fresh browser, and the rail says so', await t.ev('handlingNow().id') === 'classic' && f0.includes('CLASSIC'));
    await press('RIGHT');
    check('Right picks Heavy, kept in this browser and not in the save', await t.ev('handlingNow().id') === 'heavy' && await t.ev("localStorage.getItem(HANDLING_STORE)") === 'heavy' && await t.ev("!JSON.stringify(snapshot ? snapshot() : {}).includes('heavy')"));
    check('the rail and the tag say Heavy', (await texts(t)).includes('FEEL HEAVY'));
    await t.shot('settings-4b-flight');
    await press('ENTER');
    check('Enter switches back to Classic', await t.ev('handlingNow().id') === 'classic' && await t.ev("localStorage.getItem(HANDLING_STORE)") === 'classic');
    await t.ev(`${SE}.slots.feel[1].t && ${SE}.setFeel('heavy')`); check('setFeel, the handler behind each button, does the same', await t.ev('handlingNow().id') === 'heavy');
    await t.ev(`${SE}.setFeel('classic')`);

    console.log('I. content');
    await t.ev(`${SE}.show('content')`); await sleep(300);
    const c = await texts(t);
    check('the content section says which pack is running', c.includes('CONTENT PACK') && c.includes('the shipped core pack') && c.includes('No problems'));
    await t.ev("(() => { CONTENT_ERRORS.push({ level: 'error', path: 'content/parts/x.md', line: 3, message: 'a test problem', fix: 'ignored' }); return 1; })()");
    await t.ev(`${SE}.show('content')`); await sleep(300);
    check('a problem is listed in plain words', (await texts(t)).includes('a test problem'));
    await t.ev('CONTENT_ERRORS.pop()');

    console.log('J. reset and forget all keys, a second press each');
    await t.ev("(() => { saveGame(true); return 1; })()");
    await t.ev(`${SE}.show('reset')`); await sleep(300);
    await t.ev(`${SE}.press('forget')`);
    check('the first press only asks', (await texts(t)).includes('Press Forget all keys again') && await t.ev('VOICE.key') === KEY_DG);
    await t.ev(`${SE}.press('forget')`);
    check('a double tap does not confirm', await t.ev('VOICE.key') === KEY_DG);
    await sleep(450); await t.ev(`${SE}.press('forget')`);
    check('the second press forgets every key', await t.ev('VOICE.key') === "" && await t.ev("CHAT.keys.anthropic") === '' && await t.ev("localStorage.getItem('longhaul.voice.key')") === null);
    await t.ev(`${SE}.press('reset')`); await sleep(450); await t.ev(`${SE}.press('forget')`);
    check('pressing the other button disarms the first', await t.ev(`${SE}.armed && ${SE}.armed.what`) === 'forget');
    await sleep(450); await t.ev(`${SE}.press('reset')`); await sleep(450); await t.ev(`${SE}.press('reset')`);
    check('Reset game, pressed twice, erases the save', await t.ev('G.credits') === 0 && !(await t.ev("(localStorage.getItem(SAVE_KEY) || '').includes('\"credits\":1234')")));
    check('and the title screen stays', await t.ev("game.scene.isActive('Settings') && game.scene.isPaused('Title')"));
    check('the text boxes are gone from the reset section', await t.ev("document.querySelectorAll('input').length") === 0);

    console.log('K. nothing else was called');
    check('three calls in all, one per Test button, none to anywhere else', await t.ev('__calls.length') === 3 && (await t.ev('__stray.length')) === 0, await calls(t));
    check('no key reached the save, the page text or the console', await t.ev(`(() => { const all = [localStorage.getItem(SAVE_KEY) || '', document.body.innerText, __log.join('\\n')].join('\\n'); return ![${JSON.stringify(KEY_DG)}, ${JSON.stringify(KEY_OA)}, ${JSON.stringify(KEY_AN)}].some(k => all.includes(k)); })()`));
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 2: from Pause, in the station ----
{
  const t = await pool.open('#station');
  const press = mk(t);
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station');
    await t.ev(MOCK);
    await t.ev("(() => { try { localStorage.clear(); } catch (e) {} chatLoad(); voiceLoad(); G.endingSeen = true; G.credits = 777; G.mission = 'none'; return 1; })()");
    await sleep(600);

    console.log('L. the Pause menu');
    await press('ESC'); await t.waitFor("game.scene.isActive('Pause')", 8000, 'pause');
    await sleep(500);
    const rows = await t.ev("game.scene.getScene('Pause').rows.map(r => r.text.trim()).join(' | ')");
    check('Pause has Settings, and no Controls help, Ship voice or NPC chat rows', rows.includes('Settings') && !/Controls help|Ship voice|NPC chat/.test(rows), rows);
    check('Resume, Restart, Volume, Sound, Settings, Journal, New game, in that order', ['Resume', 'Restart from station', 'Volume', 'Sound', 'Settings', 'Journal', 'New game'].every((w, i, a) => i === 0 || rows.indexOf(w) > rows.indexOf(a[i - 1])), rows);
    await t.ev("(() => { game.scene.getScene('Pause').sel = 4; return 1; })()"); await sleep(250);
    await press('ENTER'); await t.waitFor("game.scene.isActive('Settings')", 8000, 'settings from pause');
    check('Enter on Settings opens it over the paused menu', await t.ev("game.scene.isPaused('Pause') && game.scene.isPaused('Station')"));
    await sleep(400);
    await press('ESC'); await t.waitFor("!game.scene.isActive('Settings')", 8000, 'closed');
    await sleep(400);
    check('Esc goes back to the Pause menu, not into the game', await t.ev("game.scene.isActive('Pause') && game.scene.isPaused('Station')"));

    console.log('M. Reset from Pause starts a new game at the station');
    await t.ev("(() => { settingsOpen(game.scene.getScene('Pause'), 'reset'); return 1; })()");
    await t.waitFor(`game.scene.isActive('Settings') && ${SE}.section === 'reset'`, 8000, 'reset section'); await sleep(500);
    await t.ev(`${SE}.press('reset')`); await sleep(450); await t.ev(`${SE}.press('reset')`);
    await t.waitFor("!game.scene.isActive('Settings') && !game.scene.isActive('Pause') && game.scene.isActive('Station')", 10000, 'new game');
    check('credits are back to 0 and the station is running again, nothing paused', await t.ev('G.credits') === 0 && await t.ev("!game.scene.isPaused('Station')"));
    check('this part called nothing either', await t.ev('__calls.length') === 0 && await t.ev('__stray.length') === 0);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

// ---- part 3: the old single chat key moves to its slot ----
{
  const t = await pool.open('');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 20000, 'title');
    console.log('N. migration');
    await t.ev(`(() => { localStorage.clear(); localStorage.setItem('longhaul.chat.key', ${JSON.stringify(KEY_AN)}); chatLoad(); return 1; })()`);
    check('an old key that looks like Anthropic lands in the Anthropic slot, and the old copy is gone', await t.ev('CHAT.keys.anthropic') === KEY_AN && await t.ev('CHAT.keys.openai') === '' && await t.ev("localStorage.getItem('longhaul.chat.key')") === null && await t.ev("localStorage.getItem('longhaul.chat.key.anthropic')") === KEY_AN);
    check('Auto picks Anthropic, the provider that has a key', await t.ev('chatProvider()') === 'anthropic' && await t.ev('CHAT.key') === KEY_AN);
    await t.ev(`(() => { localStorage.clear(); localStorage.setItem('longhaul.chat.key', ${JSON.stringify(KEY_OA)}); chatLoad(); return 1; })()`);
    check('an old OpenAI key lands in the OpenAI slot', await t.ev('CHAT.keys.openai') === KEY_OA && await t.ev('chatProvider()') === 'openai');
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling when Chrome exits on a busy Mac */ } }
}

function CHATKEY(v) { return v; }
await pool.close();
console.log(failed ? `SETTINGS FAIL (${failed})` : 'SETTINGS PASS');
process.exit(failed ? 1 : 0);
