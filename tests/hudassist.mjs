// smoke: the flight assist's target panel on the HUD: when it shows, what it says, keys from the mode table, the help rows (plain Node, no Chrome)
// The target panel (card space-game-assist-hud, src/hud.js hudAssistModel / hudAssist) reads the flight assist's interface (src/assist.js
// assistState). What the panel says is a function with no drawing in it, so it is checked here in plain Node (tests/nodegame.mjs) on a stand-in
// scene, the same one tests/assist.mjs flies. The drawing is called once on a stand-in pen to see it runs and claims its place on the screen.
// Run: node tests/hudassist.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  toast = () => {}; sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __s = (() => {
    const body = { velocity: { x: 0, y: 0 }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const s = { add: __P, input: __P, events: __P, time: { now: 0 }, k: {}, cr: { target: null }, ship: { x: 1000, y: 1000, rotation: 0, body }, lockUntil: 0 };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s);
    return s;
  })();
  var __mule = { x: 1600, y: 1000, name: 'Freighter MULE', active: true, body: { velocity: { x: 0, y: 0 } } };
  // the drawing, on a pen and a text pool that accept anything: what it leaves behind is the zone it claims and the assist's own line switched off
  function __draw() { const h = { s: __s, g: __P, t: {}, seen: {}, zones: [], now: 0 }; hudAssist(h, __s); return { zones: h.zones, texts: Object.keys(h.seen), readout: ASSIST.readout }; }
`);

console.log('A. when the panel shows');
check('assist off: no panel', J(`hudAssistModel(__s)`) === null);
g.run(`assistOn(__s, true)`);
check('assist on, no target: no panel, and the assist keeps its own one-line readout', J(`hudAssistModel(__s)`) === null && J(`__draw()`).readout === true && J(`__draw()`).zones.length === 0);
g.run(`__s.cr.target = __mule`);
let m = J(`hudAssistModel(__s)`);
check('assist on, a nav target, no order yet: the panel names it, 60 km off, steady, NO ORDER', m && m.name === 'FREIGHTER MULE' && m.km === '60' && m.relLabel === 'STEADY' && m.rel === 0 && m.mode === '' && m.order === 'NO ORDER', JSON.stringify(m));
let d = J(`__draw()`);
check('drawn: it claims a zone under the radar and switches the assist\'s own line off', d.readout === false && d.zones.length === 1 && d.zones[0].y0 >= 250 && d.zones[0].x1 === J(`W`), JSON.stringify(d.zones));
g.run(`__s.cr.target = null`);
check('target gone: the panel goes and the one-line readout is back', J(`__draw()`).readout === true);

console.log('B. what it says about an order');
g.run(`__s.cr.target = __mule; assistSet('keep', __mule, 500)`);
m = J(`hudAssistModel(__s)`);
check('Keep at range 500 px: the order line says KEEP AT RANGE 50 KM and the mode is keep', m.mode === 'keep' && m.order === 'KEEP AT RANGE  50 KM', JSON.stringify(m));
g.run(`__s.ship.body.velocity.x = 120`);
m = J(`hudAssistModel(__s)`);
check('flying at it at 120: CLOSING 120', m.relLabel === 'CLOSING' && m.rel === 120, JSON.stringify(m));
g.run(`__mule.body.velocity.x = 200`);
m = J(`hudAssistModel(__s)`);
check('it runs at 200, you at 120: OPENING 80 (speed relative to the target, not your own)', m.relLabel === 'OPENING' && m.rel === 80, JSON.stringify(m));
g.run(`__mule.body.velocity.x = 119`);
check('within 3 of its speed: STEADY 0', J(`hudAssistModel(__s)`).relLabel === 'STEADY' && J(`hudAssistModel(__s)`).rel === 0);
g.run(`__s.as.cmd = { status: 'brake' }`);
check('the planner\'s word shows in capitals', J(`hudAssistModel(__s).status`) === 'BRAKE');
g.run(`__mule.name = 'A very long name for a ship that goes on and on'`);
check('a long name is cut to 22 letters', J(`hudAssistModel(__s).name.length`) === 22);
g.run(`__mule.name = 'Freighter MULE'`);

console.log('C. the keys come from the mode table');
const table = J(`Object.values(ASSIST_MODES).filter(x => x.cap).map(x => x.cap + ' ' + x.label)`);
m = J(`hudAssistModel(__s)`);
check('one key per mode of the table, in its order', JSON.stringify(m.keys.map(k => k.cap + ' ' + k.label)) === JSON.stringify(table) && table.length >= 2, table.join(' | '));
const before = J(`__draw()`);
g.run(`assistMode('hudtest-a', { label: 'Test order', key: 'NINE', cap: '9' }); assistMode('hudtest-b', { label: 'No key' })`);
m = J(`hudAssistModel(__s)`);
check('a mode another file adds gets its key with no change to the HUD; one without a key cap gets none', m.keys.length === table.length + 1 && m.keys[m.keys.length - 1].cap === '9' && m.keys[m.keys.length - 1].label === 'Test order', JSON.stringify(m.keys));
g.run(`assistMode('hudtest-c', { label: 'Third', key: 'EIGHT', cap: '8' })`);
const after = J(`__draw()`);
check('more keys than fit the rows: the panel grows by a row', after.zones[0].y1 > before.zones[0].y1 && after.texts.length > before.texts.length, before.zones[0].y1 + ' -> ' + after.zones[0].y1);
g.run(`['hudtest-a', 'hudtest-b', 'hudtest-c'].forEach(k => delete ASSIST_MODES[k])`);

console.log('D. the keys in the help');
const rows = J(`controlsGroup('flight').rows.map(r => r.k.join(' ') + '|' + r.t)`);
check('the flight table has Z (assist on or off) and 1-4 (the orders)', rows.some(r => r.startsWith('Z|Flight assist')) && rows.some(r => r.startsWith('1-4|Assist orders')));
check('the H page of Space has both lines, from the table', J(`HELP.Space.filter(l => /^Z   flight assist|^1-4   assist orders/.test(l)).length`) === 2 && J(`JSON.stringify(HELP.Space) === JSON.stringify(controlsHelp('Space'))`));
const ui = readFileSync(join(ROOT, 'content/text/ui.md'), 'utf8'), help = J(`controlsHelp('Space')`);
check('the shipped text has the same two lines (content/text/ui.md rows help.space.15 and 16)', ui.includes('| help.space.15 | ' + help[14] + ' |') && ui.includes('| help.space.16 | ' + help[15] + ' |'), help[15]);
check('Z is the key the assist listens to', J(`ASSIST.key`) === 'Z');
check('no errors', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nHUDASSIST FAIL (${failed} of ${n})` : `\nHUDASSIST PASS (${n})`);
process.exitCode = failed ? 1 : 0;
