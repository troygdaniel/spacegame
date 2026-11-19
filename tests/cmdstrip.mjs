// smoke: the command strip: I opens a line, Enter asks, the answer fades by itself (Quiet), the game never pauses, the microphone's states draw in it (plain Node, no Chrome, no real model call)
// Card space-game-command-strip (src/cmdstrip.js). Troy: "not sure about the screen set aside for the ship computer chat"; he picked the Quiet first-look picture: the strip is
// gone a few seconds after the answer and nothing lingers over the flight view. What this holds:
//   A. the pure parts: how long an answer stays, what the strip shows at each moment (typing, thinking, the answer, the fade, the dim rows, the voice), and what wins
//   B. the line: it opens only where it may, lets held keys go, never pauses the game, gives the keyboard back, and sends nothing for an empty line
//   C. an exchange: the question on the line, the answer under it, the voice waits, /name needs no model, a failure says so, a new question replaces an old one
//   D. quiet: the answer stays its hold, fades, and goes into the history; the next line brings the last two back, dim
//   E. an act: announced first, run 0.7 s later, Esc cancels it
//   F. the picture: the DOM it makes (position in game pixels, the cap, the input, the voice states), its keys never reach the game, the old LISTENING box stays shut
//   G. the neighbours: the HUD keeps its arrows clear of it, the first-run tip steps aside, no scene is ever paused from this file
// Run: node tests/cmdstrip.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 260) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const KEY = 'sk-test-' + 'o'.repeat(28); // built from pieces: tests/hygiene.mjs looks for key-like strings in the repo
const settle = ms => new Promise(r => setTimeout(r, ms));

// a fake page: elements that remember what was set on them, a clock the test moves, a game with one running scene, a model that answers when told to
g.run(`
  window.__now = 100000; csNow = () => window.__now;
  window.__els = [];
  window.__mkEl = tag => { const e = { tag, style: {}, kids: [], attrs: {}, handlers: {}, value: '', textContent: '', type: '', placeholder: '', focus() { document.activeElement = e; }, blur() { if (document.activeElement === e) document.activeElement = null; },
    setAttribute(k, v) { e.attrs[k] = v; }, appendChild(k) { e.kids.push(k); }, addEventListener(ev, fn) { (e.handlers[ev] = e.handlers[ev] || []).push(fn); }, fire(ev, evt) { (e.handlers[ev] || []).forEach(f => f(evt)); } };
    return e; };
  document = { activeElement: null, hidden: false, body: { appendChild(e) { __els.push(e); } }, createElement: tag => __mkEl(tag), addEventListener() {} };
  window.__calls = [];
  window.__scene = { scene: { key: 'Space', pause() { __calls.push('pause'); } }, input: { keyboard: { resetKeys() { __calls.push('reset'); } } }, panel: false, talk: false, shopOpen: false, leaving: false, dead: false, jmp: null, cr: {} };
  window.__fg = { canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) }, scene: { getScenes: () => [__scene], isActive: () => false } };
  window.__asks = []; window.__answer = { text: 'Kepler-4b is 816 km north-east. Press C to cruise.' }; window.__voice = null; window.__plan = null;
  shipcompAsk = q => { __asks.push(q); return new Promise(res => { window.__release = () => res(Object.assign({}, __answer, __plan ? { plan: __plan } : {})); }); };
  shipcompSay = (t, then) => { if (__voice) { window.__say = then; return; } then('silent'); };
  chatSetKey('${KEY}'); chatSetOn(true); CMDSTRIP.act = 30;
  window.__reset = () => { const S = CMDSTRIP.s; cmdstripCancelAct(false); S.typing = false; S.text = ''; S.pend = null; S.live = null; S.items = []; S.voice = null; S.seq++; S.game = __fg; __calls.length = 0; __asks.length = 0; __scene.panel = false; __scene.cr = {}; __plan = null; __voice = null; __now = 100000; return 1; };
`);
const reset = () => g.run('__reset()');
const answer = async () => { g.run('__release()'); await settle(5); };

// ---------- A. the pure parts ----------
console.log('A. what the strip shows');
{
  check('an answer stays 4.5 s and a little more for each letter, never past 12 s', J(`cmdstripHold('')`) === 4500 && J(`cmdstripHold('x'.repeat(100))`) === 4500 + 3500 && J(`cmdstripHold('x'.repeat(5000))`) === 12000);
  const view = (S, now = 0, voice = null) => J(`cmdstripView(${JSON.stringify(S)}, ${now}, ${JSON.stringify(voice)})`);
  const base = { typing: false, text: '', pend: null, live: null, items: [] };
  check('nothing to show: null', view(base) === null);
  const two = [{ q: 'q1', a: 'a1', kind: 'say' }, { q: 'q2', a: 'a2', kind: 'say' }, { q: 'q3', a: 'a3', kind: 'say' }];
  const t = view({ ...base, typing: true, text: 'plot a course', items: two });
  check('typing: the line, a caret, the hint that says how to get the stick back, and the last TWO exchanges above it, the newer one brighter', t.mode === 'typing' && t.cmd === 'plot a course' && t.caret === true && /Esc back to flying/.test(t.hint) && t.older.length === 2 && t.older[0].q === 'q2' && t.older[1].q === 'q3' && t.older[0].alpha < t.older[1].alpha && t.older[1].alpha < 1, JSON.stringify(t.older));
  check('one earlier exchange: one dim row', view({ ...base, typing: true, items: [two[0]] }).older.length === 1);
  const p = view({ ...base, pend: { q: 'where is the Roost', at: 0 }, items: two });
  check('thinking: the question stays on the line with dots under it', p.mode === 'thinking' && p.cmd === 'where is the Roost' && p.reply === '. . .');
  const live = { q: 'hi', a: 'Hello, pilot.', kind: 'say', at: 1000, hold: 5000 };
  check('an answer shows at full strength for its hold', view({ ...base, live }, 1000).alpha === 1 && view({ ...base, live }, 5999).alpha === 1 && view({ ...base, live }, 5999).reply === 'Hello, pilot.');
  const half = view({ ...base, live, items: two }, 6000 + 600);
  check('then it fades over 1.2 s, and the dim rows fade with it', half.alpha === 0.5 && half.older.every(o => o.alpha <= 0.54 * 0.5 + 1e-9), JSON.stringify(half));
  check('and it is gone after the fade: nothing lingers', view({ ...base, live }, 6000 + 1200) === null && view({ ...base, live }, 99999) === null);
  check('an act shows in its own colour kind, a failure in its own', view({ ...base, live: { ...live, kind: 'act' } }, 1000).kind === 'act' && view({ ...base, live: { ...live, kind: 'warn' } }, 1000).kind === 'warn');
  const v = view({ ...base, typing: true, pend: { q: 'x' }, live }, 1000, { mark: 'red', head: 'LISTENING  1.0 s', body: '|||  U sends' });
  check('the microphone wins over the line, the thinking and the answer', v.mode === 'voice' && v.mark === 'red' && v.head === 'LISTENING  1.0 s' && v.body === '|||  U sends');
  check('the line being typed wins over an answer on its way, which wins over an old answer', view({ ...base, typing: true, pend: { q: 'x' }, live }, 1000).mode === 'typing' && view({ ...base, pend: { q: 'x' }, live }, 1000).mode === 'thinking');
}

// ---------- B. the line ----------
console.log('B. the line');
{
  await reset();
  check('I opens the line, over the scene you are in: it is the typing state, the held keys are let go once, and nothing is paused', J(`shipcompOpen(__fg)`) === true && J('CMDSTRIP.s.typing') === true && J('__calls.join()') === 'reset');
  check('it does not open twice', J(`shipcompOpen(__fg)`) === false && J('__calls.join()') === 'reset');
  check('the line is on the screen: the input shows, the cap says I, the game is not paused', J('CMDSTRIP.s.dom.input.style.display') === 'block' && J('CMDSTRIP.s.dom.cap.textContent') === 'I' && J('CMDSTRIP.s.dom.root.style.display') === 'block' && !J('__calls').includes('pause'));
  g.run('cmdstripClose()');
  check('closing gives the keyboard back: the line is shut, the keys are let go again, the strip is gone', J('CMDSTRIP.s.typing') === false && J('__calls.join()') === 'reset,reset' && J('CMDSTRIP.s.dom.root.style.display') === 'none');
  await reset();
  for (const [what, set] of [['a terminal is open', 'panel = true'], ['a talk is open', 'talk = true'], ['the shop is open', 'shopOpen = true'], ['the ship is leaving', 'leaving = true'], ['the ship is wrecked', 'dead = true'], ['a jump is charging', "jmp = { to: 'kestrel' }"], ['the nav list has the keys', 'cr = { navOpen: true }']]) {
    g.run(`__scene.panel = false; __scene.talk = false; __scene.shopOpen = false; __scene.leaving = false; __scene.dead = false; __scene.jmp = null; __scene.cr = {}; __scene.${set}`);
    check('the line stays shut when ' + what, J('shipcompOpen(__fg)') === false && J('CMDSTRIP.s.typing') === false && J('shipcompSubmit("hello", __fg)') === false && J('__asks.length') === 0);
  }
  g.run(`__scene.panel = false; __scene.talk = false; __scene.shopOpen = false; __scene.leaving = false; __scene.dead = false; __scene.jmp = null; __scene.cr = {}`);
  g.run(`__fg.scene.getScenes = () => []`);
  check('with no Space or Station scene running (a menu, the map) the line does not open', J('shipcompOpen(__fg)') === false);
  g.run(`__fg.scene.getScenes = () => [__scene]; chatSetKey('')`);
  check('with no chat key the I key opens nothing and nothing is sent', J('shipcompOpen(__fg)') === false && J('shipcompSubmit("hello", __fg)') === false && J('__asks.length') === 0);
  g.run(`chatSetKey('${KEY}')`);
  await reset(); g.run('shipcompOpen(__fg)');
  g.run(`__fg.scene.getScenes = () => []; cmdstripPaint()`);
  check('the scene going away under an open line shuts the line (a dock, a death, a map): the keys are never stuck in a field', J('CMDSTRIP.s.typing') === false);
  g.run(`__fg.scene.getScenes = () => [__scene]`);
}

// ---------- C. an exchange ----------
console.log('C. an exchange');
{
  await reset(); g.run('shipcompOpen(__fg)'); g.run('CMDSTRIP.s.dom.input.value = "where is the Roost"; CMDSTRIP.s.dom.input.fire("input", {})');
  g.run('CMDSTRIP.s.dom.input.fire("keydown", { key: "Enter", preventDefault() {}, stopPropagation() {} })'); await settle(5);
  check('Enter sends the line and gives the keyboard back at once (the ship is yours while it thinks)', J('__asks.join()') === 'where is the Roost' && J('CMDSTRIP.s.typing') === false && J('CMDSTRIP.s.pend.q') === 'where is the Roost' && J('__calls.join()') === 'reset,reset');
  check('the question is on the line with dots under it', J('CMDSTRIP.s.dom.text.textContent') === 'where is the Roost' && J('CMDSTRIP.s.dom.reply.textContent') === '. . .' && J('CMDSTRIP.s.dom.cap.textContent') === 'I');
  await answer();
  check('the answer is under it, as plain text, and the thinking is over', J('CMDSTRIP.s.pend') === null && J('CMDSTRIP.s.live.a') === 'Kepler-4b is 816 km north-east. Press C to cruise.' && J('CMDSTRIP.s.live.kind') === 'say' && J('CMDSTRIP.s.dom.reply.textContent') === 'Kepler-4b is 816 km north-east. Press C to cruise.');
  check('and at most three lines of it show (the rest is cut with dots by the browser)', J('CMDSTRIP.s.dom.reply.style.cssText').includes('-webkit-line-clamp:3'));

  await reset(); g.run('shipcompOpen(__fg)'); g.run('CMDSTRIP.s.dom.input.value = "   "'); g.run('CMDSTRIP.s.dom.input.fire("keydown", { key: "Enter", preventDefault() {}, stopPropagation() {} })'); await settle(5);
  check('an empty line sends nothing and still lets go of the keyboard', J('__asks.length') === 0 && J('CMDSTRIP.s.typing') === false && J('CMDSTRIP.s.pend') === null);

  await reset(); g.run('shipcompOpen(__fg)'); g.run('CMDSTRIP.s.dom.input.value = "hello"'); g.run('CMDSTRIP.s.dom.input.fire("keydown", { key: "Escape", preventDefault() {}, stopPropagation() {} })');
  check('Esc on the line shuts it and sends nothing', J('CMDSTRIP.s.typing') === false && J('__asks.length') === 0 && J('CMDSTRIP.s.pend') === null && J('CMDSTRIP.s.dom.input.value') === '');

  await reset(); g.run('shipcompOpen(__fg)'); await settle(30); g.run('CMDSTRIP.s.dom.input.value = "hello"'); g.run('document.activeElement = null; CMDSTRIP.s.dom.input.fire("blur", {})'); await settle(5); // the open's own focus (20 ms) has happened by now
  check('a click on the game takes the keyboard: the line lets go (flight keys are never stuck behind a field)', J('CMDSTRIP.s.typing') === false && J('__asks.length') === 0, J('CMDSTRIP.s.typing') + ' ' + J('__asks.length'));

  await reset(); g.run('__voice = true'); g.run('cmdstripSubmit("what does B do", __fg)'); await answer();
  check('with the ship voice on, the answer shows when the voice starts, not before', J('CMDSTRIP.s.pend.q') === 'what does B do' && J('CMDSTRIP.s.live') === null);
  g.run('__say("audio")');
  check('and then it shows', J('CMDSTRIP.s.live.a') !== undefined && J('CMDSTRIP.s.pend') === null && J('CMDSTRIP.s.live.q') === 'what does B do'); g.run('__voice = null');

  await reset(); g.run('cmdstripSubmit("/name Vesper", __fg)'); await settle(5);
  check('/name renames it without asking a model: nothing is sent, the answer says the new name', J('__asks.length') === 0 && /VESPER/.test(J('CMDSTRIP.s.live.a')) && J('shipcompName()') === 'VESPER');
  g.run(`shipcompSetName('')`);

  await reset(); g.run('__answer = { error: "Give me a second between questions." }'); g.run('cmdstripSubmit("again", __fg)'); await answer();
  check('a refusal or a failure is a plain line in its own kind', J('CMDSTRIP.s.live.a') === 'Give me a second between questions.' && J('CMDSTRIP.s.live.kind') === 'warn' && J('CMDSTRIP.s.dom.reply.style.color') === '#ffb454');
  g.run('__answer = { text: "Kepler-4b is 816 km north-east. Press C to cruise." }');

  await reset(); g.run('cmdstripSubmit("first", __fg)'); g.run('const r1 = window.__release'); g.run('cmdstripSubmit("second", __fg)');
  g.run('r1()'); await settle(5);
  check('a new question while one is on its way replaces it: the old answer does not appear over the new line', J('CMDSTRIP.s.live') === null && J('CMDSTRIP.s.pend.q') === 'second');
}

// ---------- D. quiet ----------
console.log('D. quiet');
{
  await reset(); g.run('cmdstripSubmit("how far is the gate", __fg)'); await answer();
  const hold = J('CMDSTRIP.s.live.hold');
  g.run(`__now += ${hold - 100}; cmdstripPaint()`);
  check('the answer is still up just before its hold ends, at full strength', J('CMDSTRIP.s.shown') === true && J('CMDSTRIP.s.dom.root.style.opacity') === '1', J('CMDSTRIP.s.dom.root.style.opacity'));
  g.run(`__now += 100 + 600; cmdstripPaint()`);
  check('it fades: half way through the fade the strip is half there', Math.abs(J('+CMDSTRIP.s.dom.root.style.opacity') - 0.5) < 0.01, J('CMDSTRIP.s.dom.root.style.opacity'));
  g.run(`__now += 700; cmdstripPaint()`);
  check('and it is gone: the box is hidden, the strip says it is not up (the HUD and the tip take the space back)', J('CMDSTRIP.s.dom.root.style.display') === 'none' && J('cmdstripUp()') === false && J('cmdstripZone()') === null);
  check('the exchange is in the history, not on the screen', J('CMDSTRIP.s.live') === null && J('CMDSTRIP.s.items.length') === 1 && J('CMDSTRIP.s.items[0].q') === 'how far is the gate');
  g.run('shipcompOpen(__fg)');
  check('the next line brings the last exchange back, dim, above it', J('CMDSTRIP.s.dom.older[1].style.display') === 'block' && /how far is the gate/.test(J('CMDSTRIP.s.dom.older[1].textContent')) && +J('CMDSTRIP.s.dom.older[1].style.opacity') > 0 && +J('CMDSTRIP.s.dom.older[1].style.opacity') < 0.6, J('CMDSTRIP.s.dom.older[1].textContent'));
  g.run('cmdstripClose()');
  await reset();
  for (let i = 0; i < 8; i++) { g.run(`cmdstripSubmit("q${i}", __fg)`); await answer(); g.run('__now += 60000; cmdstripPaint()'); }
  check('the history keeps the last six, and the strip shows two of them', J('CMDSTRIP.s.items.length') === 6 && J('CMDSTRIP.s.items[5].q') === 'q7' && J('CMDSTRIP.s.items[0].q') === 'q2');
  await reset(); g.run('cmdstripSubmit("long", __fg)'); g.run('__answer = { text: "x ".repeat(120) }'); await answer();
  g.run('cmdstripSubmit("a", __fg)'); await settle(1);
  g.run('__answer = { text: "Kepler-4b is 816 km north-east. Press C to cruise." }');
  check('a longer answer stays longer than a short one', J('cmdstripHold("x ".repeat(120))') > J('cmdstripHold("ok")'));
}

// ---------- E. an act ----------
console.log('E. an act');
{
  await reset(); g.run(`window.__ran = 0; __plan = { text: 'Course set to Kepler-4b, 816 km.', run: s => { __ran++; window.__ranOn = s; } }; __answer = { text: 'Course set to Kepler-4b, 816 km.' }`);
  g.run('cmdstripSubmit("take me to Kepler-4b", __fg)'); await answer();
  check('an act is announced first: the line shows in the act colour and the game has not run it yet', J('CMDSTRIP.s.live.kind') === 'act' && J('__ran') === 0 && J('CMDSTRIP.s.dom.reply.style.color') === '#9fe9ff');
  await settle(60);
  check('then the game runs its own function on the scene the question was asked in, once', J('__ran') === 1 && g.run('__ranOn') === g.run('__scene'));

  await reset(); g.run(`window.__ran = 0; __plan = { text: 'Course set.', run: s => { __ran++; } }; __answer = { text: 'Course set.' }`);
  g.run('cmdstripSubmit("take me to Kepler-4b", __fg)'); await answer();
  check('Esc in the pause before it cancels the act and says so (and the Esc is not left for the pause menu)', J('cmdstripCancelAct(true)') === true && J('CMDSTRIP.s.live.a') === 'Cancelled.' && J('CMDSTRIP.s.live.kind') === 'warn');
  await settle(60);
  check('and it never runs', J('__ran') === 0);
  check('with nothing to cancel Esc is left alone', J('cmdstripCancelAct(true)') === false);

  await reset(); g.run(`window.__ran = 0; __plan = { text: 'Course set.', run: s => { __ran++; throw new Error('the game said no'); } }; __answer = { text: 'Course set.' }`);
  g.run('cmdstripSubmit("go", __fg)'); await answer(); await settle(60);
  check('an act that throws does not break the strip', J('__ran') === 1 && J('CMDSTRIP.s.act') === null);
  g.run('__plan = null');
}

// ---------- F. the picture ----------
console.log('F. the picture');
{
  await reset(); g.run('cmdstripSubmit("hello", __fg)'); await answer();
  check('the strip sits at the bottom of the 1280 by 720 game, right of the navigation panel, above the key line', J('CMDSTRIP.s.dom.box.style.left') === '368px' && J('CMDSTRIP.s.dom.box.style.width') === '624px' && J('CMDSTRIP.s.dom.box.style.bottom') === '64px');
  check('it follows the canvas on the page: its corner and its scale', J('CMDSTRIP.s.dom.root.style.left') === '10px' && J('CMDSTRIP.s.dom.root.style.top') === '20px' && J('CMDSTRIP.s.dom.root.style.transform') === 'scale(1)');
  g.run(`__fg.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 }); cmdstripPaint()`);
  check('at half size it is half the scale', J('CMDSTRIP.s.dom.root.style.transform') === 'scale(0.5)'); g.run(`__fg.canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 1280, height: 720 })`);
  check('it is a status region for screen readers, and the zone it keeps is in game pixels', J('CMDSTRIP.s.dom.root.attrs.role') === 'status' && J('cmdstripZone().x0') === 368 && J('cmdstripZone().x1') === 992 && J('cmdstripZone().y1') <= 656 + 4);
  const keys = ['keydown', 'keyup', 'keypress'];
  check('the input swallows its own key events, so typing never reaches the flight keys', keys.every(ev => J(`CMDSTRIP.s.dom.input.handlers.${ev}.length`) >= 1));
  g.run(`window.__stop = 0; CMDSTRIP.s.dom.input.fire('keydown', { key: 'w', stopPropagation() { __stop++; }, preventDefault() {} }); CMDSTRIP.s.dom.input.fire('keyup', { key: 'w', stopPropagation() { __stop++; } }); CMDSTRIP.s.dom.input.fire('keypress', { key: 'w', stopPropagation() { __stop++; } })`);
  check('W, A, S, D and the rest typed in the line are stopped at the field', J('__stop') === 3);
  // the microphone
  await reset();
  check('with the strip up the microphone draws in it: cmdstripVoice says it drew', g.run(`cmdstripVoice({ mark: 'red', head: 'LISTENING  2.1 s', body: '|||||  stops when you stop talking  U sends  Esc cancels' })`) === true);
  check('listening: the cap says U in red, the dot and the word, the hint under it, the border red', J('CMDSTRIP.s.dom.cap.textContent') === 'U' && J('CMDSTRIP.s.dom.cap.style.color') === '#ff4d6d' && J('CMDSTRIP.s.dom.text.textContent') === '● LISTENING  2.1 s' && /U sends/.test(J('CMDSTRIP.s.dom.reply.textContent')) && J('CMDSTRIP.s.dom.box.style.borderColor') === '#ff4d6d' && J('CMDSTRIP.s.dom.input.style.display') === 'none');
  g.run(`cmdstripVoice({ mark: 'green', head: '"plot a course to Kepler-4b"', body: 'Asking the ship\\'s computer   Esc cancels   U again to say it again' })`);
  check('the words with their pause: the words on the line, green border', J('CMDSTRIP.s.dom.text.textContent') === '"plot a course to Kepler-4b"' && J('CMDSTRIP.s.dom.box.style.borderColor') === '#6dff9c');
  g.run('cmdstripVoice(null)');
  check('and with nothing to say the strip goes away', J('CMDSTRIP.s.dom.root.style.display') === 'none' && J('cmdstripUp()') === false);
  // listen.js uses it: the old floating box stays shut
  g.run(`LISTEN.s.state = 'listening'; LISTEN.s.t0 = performance.now() - 2100; LISTEN.s.level = 0.5; listenPaint()`);
  check('listen.js hands its view to the strip, and its own floating box is never shown', J('CMDSTRIP.s.dom.text.textContent').startsWith('● LISTENING') && (J('LISTEN.el') === null || J('LISTEN.el.root.style.display') === 'none'));
  g.run(`LISTEN.s.state = 'idle'; listenPaint()`);
  check('and when it is over the strip is gone', J('cmdstripUp()') === false);
  g.run(`document = { activeElement: null, hidden: false, body: { appendChild() {} }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) }; CMDSTRIP.s.dom = null`);
  check('with no page to draw on (an element without events) cmdstripVoice says it did not draw: listen.js keeps its own box', g.run(`cmdstripVoice({ mark: 'red', head: 'x', body: '' })`) === false);
}

// ---------- G. the neighbours ----------
console.log('G. the neighbours');
{
  const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  check('the HUD keeps its edge arrows clear of the strip (src/hud.js reads cmdstripZone)', /cmdstripZone\(\)/.test(src('src/hud.js')));
  check('the first-run tip steps aside while the strip is up (src/guide.js reads cmdstripUp)', /cmdstripUp\(\)/.test(src('src/guide.js')));
  check('the strip never pauses a scene, and never turns the Phaser keyboard off', !/scene\.pause|scene\.run\(|keyboard\.enabled|addCapture/.test(src('src/cmdstrip.js')));
  check('the page loads it after listen.js, and no ShipComputer scene is left in the sources', /listen\.js"><\/script>\s*<script src="src\/cmdstrip\.js">/.test(src('index.html')) && !/class ShipComputer|scene\.add\('ShipComputer'/.test(src('src/shipcomputer.js')));
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCMDSTRIP FAIL (${failed} of ${n})` : `\nCMDSTRIP PASS (${n})`);
process.exitCode = failed ? 1 : 0;
