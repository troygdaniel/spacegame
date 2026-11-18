// smoke: assist order lines: one assist line on screen at a time, ships named by type, the stick hint once (plain Node, no Chrome)
// Card space-game-assist-order-toasts (docs/PLAYTEST4.md bug 5): every order of the flight assist was a two-line toast, so a click on a
// ship, 2, then 1 stacked three of them over the top of the screen and over the ship just clicked. Now the assist has one line: a new
// one takes the place of the last (assistSay in src/assist.js), the "Any flight key takes the stick back" hint comes with the first order
// only, a click's "Target:" line is short, and a pirate ordered by key is named by its type as a clicked one is.
// The toast() here is a stand-in that keeps s.toasts as the game's does (common.js), so "how many are showing" can be counted.
// Run: node tests/assisttoasts.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  var __said = [];
  toast = (s, msg) => { __said.push(msg); const part = () => ({ active: true, destroy() { this.active = false; } }); const o = { t: part(), bg: part(), tab: part(), y: 96, h: 40, msg }; o.t.text = msg;
    s.toasts = (s.toasts || []).filter(q => q.t.active); if (s.toasts.length >= 3) { const old = s.toasts.shift(); old.t.destroy(); } s.toasts.push(o); };
  sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __s = null;
  function __ship(x, y, key) { return { x, y, active: true, def: key ? { key } : undefined, name: '', body: { velocity: { x: 0, y: 0 } } }; }
  function __scene() {
    const body = { velocity: { x: 0, y: 0 }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const list = [];
    const s = __s = { add: __P, events: __P, input: { on() {}, keyboard: __P, activePointer: { isDown: false } }, cameras: { main: { zoom: 1 } }, time: { now: 0 }, k: { SPACE: { isDown: false } }, nextFire: 0, toasts: [],
      cr: { target: null, navOpen: false }, ship: { x: 20000, y: 30000, rotation: 0, body }, lockUntil: 0, enemies: { list, getChildren: () => list }, mx: {} };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s);
    s.as.k = {}; [ASSIST.key].concat(Object.values(ASSIST_MODES).map(m => m.key)).forEach(n => { s.as.k[n] = {}; });
    if (typeof clickmoveSetup === 'function') clickmoveSetup(s);
    __said = []; ASSIST.on = true; ASSIST.hinted = false;
    return s;
  }
  function __showing() { return __s.toasts.filter(o => o.t.active).map(o => o.msg); }
  function __press(n) { __s.as.k[n]._justDown = true; __s.time.now += 16.67; if (typeof clickmoveFrame === 'function') clickmoveFrame(__s, __s.time.now); assistFrame(__s, __s.time.now, 16.67, '', ''); }
`);

check('assistSay is there', J(`typeof assistSay`) === 'function');

// ---- three orders in a row: one line showing ----
g.run(`__scene(); __s.enemies.list.push(__ship(20350, 29880, 'drone')); assistSet('keep', __s.enemies.list[0]); assistSet('approach', __s.enemies.list[0]); assistSet('orbit' in ASSIST_MODES ? 'orbit' : 'keep', __s.enemies.list[0]);`);
check('three orders in a row leave one assist line on screen, the last', J(`__showing().length`) === 1 && /^(Orbit|Keep at range): /.test(J(`__showing()`)[0]), JSON.stringify(J(`__showing()`)));
check('the stick hint comes with the first order only', J(`__said.filter(m => /takes the stick back/.test(m)).length`) === 1 && /takes the stick back/.test(J(`__said`)[0]), JSON.stringify(J(`__said`)));
check('a later order is one short line', J(`__said`).slice(1).every(m => m.length <= 44), JSON.stringify(J(`__said`).slice(1)));
check('a pirate ordered by key or by code is named by its type, as a clicked one is', J(`__said`).every(m => /the drone/.test(m)), JSON.stringify(J(`__said`)));

// ---- the mouse and the keys: click a ship, 2, 1 (the playtest's case) ----
if (J(`typeof clickmoveClick`) === 'function') {
  g.run(`__scene(); __s.enemies.list.push(__ship(20350, 29880, 'raider')); clickmoveClick(__s, 20350, 29880);`);
  check('a click on a ship says one short Target line', J(`__showing().length`) === 1 && J(`__showing()`)[0] === 'Target: the raider.', JSON.stringify(J(`__showing()`)));
  g.run(`__press('TWO'); __press('ONE');`);
  check('click, 2, 1: still one assist line, the Approach', J(`__showing().length`) === 1 && /^Approach: the raider/.test(J(`__showing()`)[0]), JSON.stringify(J(`__showing()`)));
  g.run(`__press('ONE');`);
  check('the same key again: "You have the stick." takes its place', J(`__showing().length`) === 1 && /You have the stick/.test(J(`__showing()`)[0]), JSON.stringify(J(`__showing()`)));
}

// ---- other toasts are not touched ----
g.run(`__scene(); toast(__s, 'Docking clearance granted.'); assistSet('keep', { x: 21000, y: 30000 }); toast(__s, 'Hull breach.'); assistSet('approach', { x: 21000, y: 30000 });`);
check("a toast that is not the assist line stays; only the last assist line goes", JSON.stringify(J(`__showing()`)) === JSON.stringify(['Docking clearance granted.', 'Hull breach.', 'Approach: the point.']), JSON.stringify(J(`__showing()`)));
g.run(`__scene(); assistSet('approach', { x: 21000, y: 30000, name: 'the buoy' }); assistOn(__s, false);`);
check('Z off replaces the order line', J(`__showing().length`) === 1 && /Flight assist off/.test(J(`__showing()`)[0]), JSON.stringify(J(`__showing()`)));
check('names: a named thing keeps its name, an unnamed ship is "the ship", a bare point "the point"', J(`[assistName({ name: 'Tern' }), assistName(__ship(0, 0)), assistName({ x: 1, y: 1 }), assistName(__ship(0, 0, 'gunship'))]`).join() === 'Tern,the ship,the point,the gunship');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `ASSIST TOASTS FAIL (${failed} of ${n})` : `ASSIST TOASTS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
