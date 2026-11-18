// smoke: overview: the list of what is around: the sort, the rows, range and closing, hostiles red, the keys and the target setter (plain Node, no Chrome)
// The Overview (card space-game-overview, src/overview.js): B shows a list of what is near the ship, nearest first, with range and whether it
// closes or opens; a click on a row, or W S and Enter, makes it the target. The sort and the rows are a pure function, and the scene side is
// run here against a stand-in scene (tests/nodegame.mjs): no Chrome.
// Run: node tests/overview.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame({ replace: { 'src/clickmove.js': '', 'src/assist_orbit.js': '' } }); // the overview alone; click to move is stood in for below
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// ---- the sort and the rows ----
g.run(`var __things = [
  { name: 'Halcyon Station', kind: 'station', x: 3000, y: 0, id: 'st' },
  { name: 'raider', kind: 'raider', x: 0, y: -800, vx: 0, vy: 200, hostile: true },
  { name: 'MULE', kind: 'escort', x: 500, y: 0, vx: 300, vy: 0, friend: true },
  { name: 'Kepler-4b', kind: 'planet', x: -6000, y: 0, id: 'pl' },
  { name: 'gunship', kind: 'gunship', x: 1200, y: 1600, vx: 0, vy: 0, hostile: true },
  { name: 'Perseus Gate', kind: 'gate', x: 0, y: 20000, id: 'g' } ];
  var __me = { x: 0, y: 0, vx: 100, vy: 0 };`);
const rows = J(`overviewRows(__things, __me).map(r => ({ name: r.name, label: r.label, range: Math.round(r.range), closing: Math.round(r.closing), trend: r.trend, hostile: r.hostile, friend: r.friend }))`);
check('nearest first', rows.map(r => r.name).join() === 'MULE,raider,gunship,Halcyon Station,Kepler-4b,Perseus Gate', rows.map(r => r.name + ' ' + r.range).join(', '));
check('the range is the distance to its centre', rows[0].range === 500 && rows[2].range === 2000 && rows[5].range === 20000);
check('flying at the station at 100 px/s: it closes at 100', rows[3].closing === 100 && rows[3].trend === 'closing');
check('flying away from the planet: it opens at 100', rows[4].closing === -100 && rows[4].trend === 'opening');
check('the escort ahead is faster than us: it opens at 200', rows[0].closing === -200 && rows[0].trend === 'opening');
check('a raider coming straight at us from the side closes at its own 200', rows[1].closing === 200 && rows[1].trend === 'closing');
check('the gate dead abeam neither closes nor opens', rows[5].closing === 0 && rows[5].trend === '');
check('hostiles and friends are marked, bodies are neither', rows[1].hostile && rows[2].hostile && rows[0].friend && !rows[3].hostile && !rows[3].friend);
check('each row has its kind in words', rows.map(r => r.label).join() === 'ESCORT,RAIDER,GUNSHIP,STATION,PLANET,GATE');
check('a cap on the rows keeps the nearest', J(`overviewRows(__things, __me, 3).map(r => r.name)`).join() === 'MULE,raider,gunship');
check('a row points back at the thing it came from', J(`overviewRows(__things, __me)[0].ref === __things[2]`));
check('under 5 px/s is neither closing nor opening', J(`overviewRows([{ name: 'a', kind: 'civ', x: 100, y: 0, vx: 96, vy: 0 }], __me)[0].trend`) === '');
check('two things at the same range sort by name, so the list does not jitter', J(`overviewRows([{ name: 'b', kind: 'civ', x: 100, y: 0 }, { name: 'a', kind: 'civ', x: -100, y: 0 }], { x: 0, y: 0 }).map(r => r.name)`).join() === 'a,b');
check('nothing around: no rows', J(`overviewRows([], __me).length`) === 0);

const line = J(`overviewLine(overviewRows(__things, __me)[3], false)`), tline = J(`overviewLine(overviewRows(__things, __me)[3], true)`), flat = J(`overviewLine(overviewRows(__things, __me)[5], false)`);
check('a row prints the name, the range in km and the rate with its arrow', /^ HALCYON STATION\s+300 km ▼\s+100$/.test(line), JSON.stringify(line));
check('the target has its mark', tline[0] === '▸' && tline.slice(1) === line.slice(1));
check('a steady range prints no rate', /2,000 km$/.test(flat), JSON.stringify(flat));
check('the rows line up: every line with a rate is as wide as the others', new Set(J(`overviewRows(__things, __me).filter(r => r.trend).map(r => overviewLine(r, false).length)`)).size === 1);
const cols = J(`overviewRows(__things, __me).map(r => overviewColor(r))`);
check('hostiles are red, the escort green, the station and the planet their own colours', cols[1] === '#ff4d6d' && cols[2] === '#ff4d6d' && cols[0] === '#6dff9c' && cols[3] === '#38e1ff' && cols[4] === '#ffb454' && cols[5] === '#9fb6c8', cols.join());

// ---- the scene side, on a stand-in scene ----
g.run(`
  var __toasts = [], __clicks = [];
  toast = (s, msg) => { __toasts.push(msg); };
  sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __bodies = [{ id: 'st', name: 'Halcyon Station', type: 'station', x: 2000, y: 0, r: 0 }, { id: 'pl', name: 'Kepler-4b', type: 'planet', x: 0, y: 5000, r: 300 }, { id: 'g', name: 'Perseus Gate', type: 'gate', x: -9000, y: 0, r: 0 }];
  cruiseKnown = s => __bodies.map(b => Object.assign({}, b));
  var __s = null;
  function __sprite(x, y, vx, vy, extra) { return Object.assign({ x, y, active: true, visible: true, body: { velocity: { x: vx, y: vy } } }, extra); }
  function __scene() {
    const body = { velocity: { x: 0, y: 0 }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const s = __s = { add: __P, input: { keyboard: __P, activePointer: { isDown: false } }, events: __P, time: { now: 1000 }, k: {}, cr: { target: null, navOpen: false }, ship: { x: 0, y: 0, rotation: 0, body }, lockUntil: 0, nextFire: 0 };
    const raider = __sprite(600, 0, -50, 0, { def: { key: 'raider' } }), boss = __sprite(0, 3000, 0, 0, { def: { key: 'gunship' }, boss: true }), dead = __sprite(10, 10, 0, 0, { def: { key: 'drone' }, active: false });
    s.enemies = { getChildren: () => [raider, boss, dead] };
    s.mx = { freighter: __sprite(-400, 0, 0, 0) };
    s.tr = { police: [{ img: { x: 1500, y: 0, active: true, visible: true, setPosition() {} } }], civ: [{ img: { x: 0, y: -2500, active: true, visible: true, setPosition() {} } }] };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s); s.as.k = {}; [ASSIST.key].concat(Object.values(ASSIST_MODES).map(m => m.key)).forEach(n => { s.as.k[n] = {}; });
    overviewSetup(s);
    s.ov.k = { B: {}, W: s.k.W, S: s.k.S, UP: s.k.UP, DOWN: s.k.DOWN, ENTER: {} }; // in the game the list's W and S are the flight keys' own objects
    ASSIST.on = false; __toasts = []; __clicks = [];
    return s;
  }
  function __frame(press) { if (press) __s.ov.k[press]._justDown = true; __s.time.now += 17; overviewFrame(__s, __s.time.now); }
`);
g.run(`__scene()`);
const things = J(`overviewThings(__s).map(t => ({ name: t.name, kind: t.kind, hostile: !!t.hostile, friend: !!t.friend, ship: t.ship }))`);
check('the scene gives raiders, the escort, police and freighters, and no places (those are the navigation panel\'s); a dead ship is left out', things.length === 5 && things.every(t => t.ship) && things.map(t => t.name).join() === 'raider,wanted gunship,MULE,police,freighter', things.map(t => t.name).join());
check('pirates are hostile, the escort a friend, police and freighters neither', things[0].hostile && things[1].hostile && things[2].friend && !things[3].hostile && !things[3].friend && !things[4].hostile);
check('a hand-moved ship gets its speed from where it was: the police cruiser moved 30 px in 100 ms = 300 px/s', J(`(() => { const img = __s.tr.police[0].img; overviewThings(__s); __s.time.now += 100; img.x += 30; const t = overviewThings(__s).find(t => t.name === 'police'); img.x -= 30; return Math.round(t.vx); })()`) === 300);

check('hidden at first: a frame draws nothing and takes no keys', J(`(() => { __s.k.W.isDown = true; __frame(); const r = [__s.ov.shown, __s.k.W.isDown]; __s.k.W.isDown = false; return r; })()`).join() === 'false,true');
g.run(`__frame('B')`);
let ov = J(`({ shown: __s.ov.shown, keys: __s.ov.keys, sel: __s.ov.sel, names: __s.ov.rows.map(r => r.name) })`);
check('B shows the list with the keys on it, nearest first', ov.shown && ov.keys && ov.sel === 0 && ov.names.join() === 'MULE,raider,police,freighter,wanted gunship', JSON.stringify(ov));
g.run(`__frame('S'); __frame('S')`);
check('S twice moves two rows down', J(`__s.ov.sel`) === 2);
g.run(`__frame('W')`);
check('W moves back up', J(`__s.ov.sel`) === 1 && J(`__s.ov.rows[__s.ov.sel].name`) === 'raider');
check('while the list has the keys a held W or S does not reach the flight code', J(`(() => { __s.k.W.isDown = true; __s.k.S.isDown = true; __s.k.A.isDown = true; __frame(); const r = [__s.k.W.isDown, __s.k.S.isDown, __s.k.A.isDown]; __s.k.A.isDown = false; return r; })()`).join() === 'false,false,true');
check('the ring stays on its row when the order of the list changes', J(`(() => { const e = __s.enemies.getChildren()[0]; e.x = 5000; /* now behind the gunship */ __s.ov.at = 0; __frame(); const r = [__s.ov.rows[__s.ov.sel].name, __s.ov.sel]; e.x = 600; __s.ov.at = 0; __frame(); return r.concat([__s.ov.sel]); })()`).join() === 'raider,4,1');
check('W at the top wraps to the last row', J(`(() => { __frame('W'); __frame('W'); return __s.ov.sel; })()`) === 4);

// a place is never a target here (card space-game-one-way-to-target)
g.run(`__frame('S')`); // wraps to MULE
check('a place handed to the target setter is refused and the nav target is not touched', J(`(() => { const r = overviewPick(__s, { ref: { id: 'st', name: 'Halcyon Station', type: 'station', x: 2000, y: 0 } }); return [r, __s.cr.target, ASSIST.on]; })()`).join() === ',,false');
g.run(`__s.ov.keys = false`);
check('with the keys back, W reaches the flight code again', J(`(() => { __s.k.W.isDown = true; __frame(); const r = __s.k.W.isDown; __s.k.W.isDown = false; return r; })()`) === true);
g.run(`__frame('B')`);
check('B on a list that is up without the keys takes them again', J(`__s.ov.shown && __s.ov.keys`) === true);
g.run(`__frame('B')`);
check('B again hides it', J(`__s.ov.shown`) === false && J(`__s.ov.keys`) === false);

// the target setter: a ship, with no click to move in the build
g.run(`__frame('B'); __s.ov.sel = 1; __s.ov.selRef = null;`);
check('a ship with no click to move: the assist comes on and Approach is ordered on it', J(`(() => { const kind = overviewPick(__s, __s.ov.rows[1]); return [kind, ASSIST.on, __s.as.mode, __s.as.target === __s.enemies.getChildren()[0]]; })()`).join() === 'ship,true,approach,true', JSON.stringify(J(`__toasts`).slice(-2)));
check('the ship under the order is the marked row, and only it', J(`__s.ov.rows.map(r => overviewIsTarget(__s, r))`).join() === 'false,true,false,false,false');
check('an order that is flying moves onto the next ship picked, in its own mode', J(`(() => { assistSet('keep', __s.enemies.getChildren()[0], 400); overviewPick(__s, __s.ov.rows[0]); return [__s.as.mode, __s.as.target === __s.mx.freighter]; })()`).join() === 'keep,true');
// with click to move: the same pick a click on the ship makes
g.run(`assistSet(''); ASSIST.on = false; __s.cm = { pick: null }; clickmoveClick = (s, x, y) => { __clicks.push([x, y, ASSIST.on]); s.cm.pick = s.enemies.getChildren()[0]; return 'ship'; };`);
check('with click to move: picking a ship is a click on that ship, with the assist switched on first', J(`(() => { const kind = overviewPick(__s, __s.ov.rows[1]); return [kind, __clicks.length, __clicks[0][0], __clicks[0][1], __clicks[0][2], __s.as.mode]; })()`).join() === 'ship,1,600,0,true,');
check('the picked ship is the marked row, and only it', J(`__s.ov.rows.map(r => overviewIsTarget(__s, r))`).join() === 'false,true,false,false,false');
check('a ship that is gone is not picked', J(`(() => { const e = __s.enemies.getChildren()[0]; e.active = false; const r = overviewPick(__s, __s.ov.rows[1]); e.active = true; return r; })()`) === '');
check('dead or docking: nothing is picked', J(`(() => { __s.dead = true; const r = overviewPick(__s, __s.ov.rows[3]); __s.dead = false; return r; })()`) === '');

// the nav list and the guns
check('the nav list open: it has the keyboard, the overview lets go of the keys and B does nothing', J(`(() => { __s.ov.keys = true; __s.cr.navOpen = true; __s.k.W.isDown = true; __frame('B'); const r = [__s.ov.keys, __s.ov.shown, __s.k.W.isDown]; __s.cr.navOpen = false; __s.k.W.isDown = false; __s.ov.k.B._justDown = false; return r; })()`).join() === 'false,true,true');
check('a press on the panel keeps the guns quiet while the button is down, and no longer', J(`(() => { __s.ov.press = true; __s.input.activePointer.isDown = true; __s.nextFire = 0; __frame(); const held = __s.nextFire > __s.time.now; __s.input.activePointer.isDown = false; __frame(); return [held, __s.ov.press]; })()`).join() === 'true,false');
check('the list is capped at ten rows', J(`(() => { const more = []; for (let i = 0; i < 12; i++) more.push(__sprite(100 + i, 0, 0, 0, { def: { key: 'drone' } })); const old = __s.enemies; __s.enemies = { getChildren: () => more }; __s.ov.at = 0; __frame(); const n = __s.ov.rows.length; __s.enemies = old; return n; })()`) === 10);

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `OVERVIEW FAIL (${failed} of ${n})` : `OVERVIEW PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
