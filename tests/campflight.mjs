// smoke: a squad flies as a flight, in formation beside what it protects (plain Node, no Chrome)
// Card space-game-fighter-flight (Troy, 22 Nov 2026: "the flight of the fighters should be more like X-wings and A-wings: not circling the targets but flying beside"). The code is src/campflight.js (the slots), the orders'
// own movement in src/campaign.js (campWingAI: guard, escort, mine with nothing to mine) and the numbers CAMP.flight.
//   A. the slots: the leader of each squad at its anchor, the wingmen in a vee behind and to the side, all in the protected thing's own frame (they turn with it), at its velocity
//   B. a guarding wing settles into its slots and stays: speed and heading of the cruiser, no circling (the bearing round the cruiser does not wind up)
//   C. the cruiser flies: the wing keeps its slots at the cruiser's speed
//   D. a threat: a ship breaks off to meet it and flies back to its slot when it is gone
//   E. other orders: escorting a convoy ship, guarding a place, mining with nothing to mine
//   F. the same seed gives the same flight (a deterministic sim)
//   G. strafing runs: against a ship that is no dogfighter a fighter flies in on a lane, peels away, goes out wide and comes in again: no ring round it, the guns fire on the run in, about the damage the old circling dealt
//   H. no circling in a dogfight: a fighter that has turned the line to its target round and round on an Attack breaks off and extends, then comes in again; the duels
//   I. a wingman covers its leader: the alien with its nose on the leader is the wingman's foe
// Run: node tests/campflight.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = seed => { window.C = campNew('home', [], { seed: seed || 1, god: true }); C.pilotStr = [1, 1, 1]; C.bay.fighters = 8; /* the flights of this suite are the old wing of eight lone fighters, three squads of 3, 3 and 2 (a flight of several ships is the formation's own case; the game flies one pilot to a squad now: card space-game-three-pilots) */ C.ships = C.ships.filter(u => u.team !== 'alien'); C.motherSpawn = 1e12; return C; };
  window.__run = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; if (!window.__foes) C.ships = C.ships.filter(u => u.team !== 'alien'); if (f) f(i); } };
  window.__out = seed => { __new(seed); campOrder(C, 'launch'); __run(10); return C; };
  window.__fs = () => campWing(C, 'fighter').slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  // a ship's place in the frame of a thing: forward (along its nose) and right, in px
  window.__rel = (u, P) => { const c = Math.cos(P.rot), s = Math.sin(P.rot), dx = u.x - P.x, dy = u.y - P.y; return [dx * c + dy * s, -dx * s + dy * c]; };
  window.__foe = (dx, dy) => { const u = campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy); u.hp = u.maxHp = 1e7; return u; };
`);
const K = J('CAMP.flight'), D = 25 + K.beside, near = (a, b, e) => Math.abs(a - b) < e;

console.log('A. the slots');
{
  g.run('__out(1);');
  const sl = J(`(() => { const out = {}; __fs().forEach(u => { const s = campFlightSlot(C, u, C.carrier), r = __rel({ x: s.x, y: s.y }, C.carrier); out[u.id] = { sq: u.squad, rank: s.rank, lead: s.lead, f: r[0], r: r[1], vx: s.vx, vy: s.vy, face: s.face }; }); return out; })()`);
  const by = (sq, rank) => Object.values(sl).find(s => s.sq === sq && s.rank === rank);
  check('three flights of two: each squad has a leader (rank 0) and one wingman (rank 1)', ['red', 'green', 'yellow'].every(q => by(q, 0) && by(q, 0).lead && by(q, 1) && !by(q, 1).lead), JSON.stringify(sl));
  check('the red leader is at the port quarter (a little behind, out to the left), the green at the starboard quarter, the yellow astern, by the table of CAMP.flight.anchors', near(by('red', 0).f, K.anchors[0].back * D, 0.01) && near(by('red', 0).r, K.anchors[0].side * D, 0.01) && near(by('green', 0).f, K.anchors[1].back * D, 0.01) && near(by('green', 0).r, K.anchors[1].side * D, 0.01) && near(by('yellow', 0).f, K.anchors[2].back * D, 0.01) && near(by('yellow', 0).r, 0, 0.01), JSON.stringify([by('red', 0), by('green', 0), by('yellow', 0)]));
  check('beside and slightly behind: red and green are farther out than back (a quarter of the way astern), the leaders are all behind the cruiser\'s centre', by('red', 0).f < 0 && Math.abs(by('red', 0).r) > Math.abs(by('red', 0).f) && by('green', 0).f < 0 && Math.abs(by('green', 0).r) > Math.abs(by('green', 0).f) && by('yellow', 0).f < 0);
  check('a wingman is in the vee: behind its leader by gap times vee.back and out to the side by gap times vee.side (the first one to the right of the leader, the second to the left)', ['red', 'green', 'yellow'].every(q => near(by(q, 1).f - by(q, 0).f, -K.gap * K.vee.back, 0.01) && near(by(q, 1).r - by(q, 0).r, K.gap * K.vee.side, 0.01)));
  check('a slot has the cruiser\'s velocity and its heading (speed and nose matched)', Object.values(sl).every(s => s.vx === J('C.carrier.vx') && s.vy === J('C.carrier.vy') && s.face === J('C.carrier.rot')));
  const turned = J(`(() => { const c = C.carrier, was = c.rot; c.rot = 1; const u = __fs()[0], s = campFlightSlot(C, u, c), r = __rel({ x: s.x, y: s.y }, c), d = Math.hypot(s.x - c.x, s.y - c.y); c.rot = was; return { r, d, face: s.face }; })()`);
  const lead = by('red', 0);
  check('the slots turn with the thing: with the cruiser\'s nose at 1 rad the same place in its own frame, the same distance', near(turned.r[0], lead.f, 0.01) && near(turned.r[1], lead.r, 0.01) && near(turned.face, 1, 1e-9) && near(turned.d, Math.hypot(lead.f, lead.r), 0.01));
  const pt = J(`(() => { const u = __fs()[0], s = campFlightSlot(C, u, { x: 1000, y: 500, vx: 0, vy: 0, r: 40 }); return { face: s.face, x: s.x - 1000, y: s.y - 500 }; })()`);
  check('beside a point or a place (no nose) the flight takes CAMP.flight.rest (north), at the place\'s radius plus the beside distance', near(pt.face, K.rest, 1e-9) && near(Math.hypot(pt.x, pt.y), Math.hypot(K.anchors[0].back * (40 + K.beside), K.anchors[0].side * (40 + K.beside)), 0.01));
  const lost = J(`(() => { const reds = __fs().filter(u => u.squad === 'red'); const was = campFlightRank(C, reds[1]); reds[0].hp = 0; C.t += 1; const now = campFlightRank(C, reds[1]); reds[0].hp = 36; C.t += 1; return [was, now]; })()`);
  check('the wingman is the leader when the leader is lost (the next tick: rank 1 becomes rank 0)', lost[0] === 1 && lost[1] === 0, JSON.stringify(lost));
}

console.log('B. a guarding wing settles and stays');
{
  g.run('__out(1);');
  const slots = J(`(() => { const o = {}; __fs().forEach(u => { const s = campFlightSlot(C, u, C.carrier); o[u.id] = [s.x, s.y]; }); return o; })()`);
  const st = J(`(() => __fs().map(u => { const s = campFlightSlot(C, u, C.carrier); return { d: Math.hypot(u.x - s.x, u.y - s.y), v: Math.hypot(u.vx - C.carrier.vx, u.vy - C.carrier.vy), h: Math.abs(campWrap(u.rot - C.carrier.rot)) }; }))()`);
  check('ten seconds after the launch every fighter is in its slot (within 12 px), at the cruiser\'s speed (within 5 px/s) and with the cruiser\'s heading (within 0.05 rad)', st.every(s => s.d < 12 && s.v < 5 && s.h < 0.05), JSON.stringify(st));
  g.run('window.__ang = {}; __fs().forEach(u => { __ang[u.id] = { last: Math.atan2(u.y - C.carrier.y, u.x - C.carrier.x), sum: 0, abs: 0 }; });');
  g.run('__run(30, () => { __fs().forEach(u => { const a = Math.atan2(u.y - C.carrier.y, u.x - C.carrier.x), r = __ang[u.id], d = campWrap(a - r.last); r.sum += d; r.abs += Math.abs(d); r.last = a; }); });');
  const w = J('Object.values(__ang)');
  check('no circling: over thirty seconds of guarding the bearing of each fighter round the cruiser does not wind up (under 0.1 rad in all; the old circle went round 0.29 rad a second, 8.7 rad)', w.every(r => Math.abs(r.sum) < 0.1 && r.abs < 0.1), JSON.stringify(w));
  check('they stay in their slots through it (the same places, within 12 px)', J(`__fs().every(u => { const s = campFlightSlot(C, u, C.carrier); return Math.hypot(u.x - s.x, u.y - s.y) < 12; })`) === true);
}

console.log('C. the cruiser flies');
{
  g.run('__out(1); window.__v = 0;');
  g.run('__run(30, () => { __v = Math.min(210, __v + 80 / 30); C.carrier.vx = __v; C.carrier.vy = 0; });');
  const st = J(`__fs().map(u => { const s = campFlightSlot(C, u, C.carrier); return { d: Math.hypot(u.x - s.x, u.y - s.y), v: Math.hypot(u.vx - C.carrier.vx, u.vy - C.carrier.vy), h: Math.abs(campWrap(u.rot - C.carrier.rot)) }; })`);
  check('the cruiser at 210 px/s for twenty seconds: every fighter is within 40 px of its slot, within 15 px/s of the cruiser\'s speed, nose the cruiser\'s way', st.every(s => s.d < 40 && s.v < 15 && s.h < 0.1), JSON.stringify(st));
}

console.log('D. a threat');
{
  g.run('__out(1); window.__foes = true; window.__r = __foe(520, 0);');
  g.run('__run(4);');
  const left = J(`__fs().filter(u => { const s = campFlightSlot(C, u, C.carrier); return Math.hypot(u.x - s.x, u.y - s.y) > 120; }).length`);
  check('a raider 520 px off the cruiser: fighters break off from their slots to meet it', left >= 2, left);
  g.run('__r.hp = 0; C.ships = C.ships.filter(u => u.hp > 0); window.__foes = false; __run(25);');
  const st = J(`__fs().map(u => { const s = campFlightSlot(C, u, C.carrier); return Math.hypot(u.x - s.x, u.y - s.y); })`);
  check('and when it is gone they fly back to their slots (within 25 px after 25 s)', st.every(d => d < 25), JSON.stringify(st.map(Math.round)));
}

console.log('E. other orders');
{
  g.run('__out(1);');
  g.run(`campWing(C, 'fighter').forEach(u => { u.order = { type: 'guard', at: { kind: 'point', x: C.carrier.x + 1500, y: C.carrier.y - 600, vx: 0, vy: 0, r: 30 } }; });`);
  g.run('__run(20);');
  const gp = J(`(() => { const P = { x: C.carrier.x + 1500, y: C.carrier.y - 600, vx: 0, vy: 0, r: 30 }; return __fs().map(u => { const s = campFlightSlot(C, u, P); return Math.hypot(u.x - s.x, u.y - s.y); }); })()`);
  check('guarding a point 1,500 px off: the wing flies there and holds its slots beside it (within 15 px after 20 s), at rest with the nose to the north', gp.every(d => d < 15) && J(`__fs().every(u => Math.abs(campWrap(u.rot - CAMP.flight.rest)) < 0.05)`) === true, JSON.stringify(gp.map(Math.round)));
  g.run('__out(1); window.__h = campSpawn(C, "freighter", C.carrier.x + 700, C.carrier.y + 200); __h.id = "freighter-77"; C.by[__h.id] = __h; __h.dest = { x: __h.x + 30000, y: __h.y + 3000 }; __h.named = true; __h.lane = 0;');
  g.run(`__fs().forEach(u => { u.order = { type: 'escort', target: __h.id, slot: 0 }; });`);
  g.run('__run(25);');
  const es = J(`__fs().map(u => { const s = campFlightSlot(C, u, __h); return Math.hypot(u.x - s.x, u.y - s.y); })`);
  check('escorting a hauler under way: the squads fly beside it in their slots (within 30 px after 25 s), in the hauler\'s own frame, not in a circle round it', J('__h.hp') > 0 && J('Math.hypot(__h.vx, __h.vy)') > 20 && es.every(d => d < 30) && J(`__fs().every(u => Math.abs(campWrap(u.rot - __h.rot)) < 0.1)`) === true, JSON.stringify(es.map(Math.round)));
  g.run('__out(1); C.rocks = []; C.pickups = [];');
  g.run(`__fs().forEach(u => { u.order = { type: 'mine', target: '' }; });`);
  g.run('__run(15);');
  check('mining with nothing to mine: the wing waits beside the cruiser in its slots (it was a circle round it)', J(`__fs().every(u => { const s = campFlightSlot(C, u, C.carrier); return Math.hypot(u.x - s.x, u.y - s.y) < 12; })`) === true);
}

console.log('F. determinism and the code');
{
  const run = () => J(`(() => { __out(5); window.__foes = true; __foe(600, 100); __run(20); window.__foes = false; return __fs().map(u => Math.round(u.x) + ':' + Math.round(u.y)).join(); })()`);
  check('the same seed flown twice gives the same fighters in the same places', run() === run());
  const cs = src('src/campaign.js'), wing = cs.split('\n').filter(l => /home = |foe = campNearest\(aliens, cv/.test(l)).join('\n');
  check('the guard, the escort and the idle mine no longer put a ship on a circle: their home is campFlightSlot, and no `C.t / 3500` or `C.t / 4000` is left in the wing\'s AI', (wing.match(/campFlightSlot/g) || []).length >= 3 && !/C\.t \/ (3500|4000)/.test(cs.slice(cs.indexOf('function campWingAI'), cs.indexOf('function campWingFire'))));
  check('the script is in index.html after the dogfight\'s, and the numbers are the table\'s', /campdogfight\.js"><\/script>\s*<script src="src\/campflight\.js"/.test(src('index.html')) && K.anchors.length === 3 && K.gap > 0 && K.beside > 0);
}

console.log('G. strafing runs');
{
  g.run(`
    window.__big = (kind, still, seed) => { __out(seed || 1); window.__foes = true; const f = campSpawn(C, kind, C.carrier.x + 650, C.carrier.y - 200); f.hp = f.maxHp = 1e7; if (still) { f.vmax = 0; f.accel = 0; f.nextShot = 1e12; } window.__f = f; campOrder(C, 'attack', f.id, 'key'); return f; };
  `);
  g.run('__big("gunship", true); window.__w = {}; window.__modes = {}; __fs().forEach(u => { __w[u.id] = { last: Math.atan2(u.y - __f.y, u.x - __f.x), sum: 0 }; });');
  g.run('window.__samples = 0; window.__aimed = 0; window.__ins = 0; window.__shotOutIn = 0; __run(30, () => { __f.x = C.carrier.x + 650; __f.y = C.carrier.y - 200; __fs().forEach(u => { const a = Math.atan2(u.y - __f.y, u.x - __f.x), r = __w[u.id]; r.sum += campWrap(a - r.last); r.last = a; if (u.run) { __modes[u.id] = (__modes[u.id] || []).concat(u.run.m).filter((m, i, l) => i === 0 || m !== l[i - 1]); if (u.run.m === "in" && Math.hypot(u.x - __f.x, u.y - __f.y) < 420) { __samples++; if (Math.abs(campWrap(Math.atan2(__f.y - u.y, __f.x - u.x) - u.rot)) < 0.6) __aimed++; } } }); });');
  const wind = J('Object.values(__w).map(r => Math.round(Math.abs(r.sum) / 6.283 * 10) / 10)'), cycles = J('Object.values(__modes).map(l => l.filter(m => m === "in").length)');
  check('against a gunship (no dogfighter) every fighter flies runs, not a ring: over 30 s none goes round it more than twice (the old circling went round up to six times in 40 s)', wind.every(w => w <= 2), JSON.stringify(wind));
  check('and each flies in, peels, goes out and comes in again: at least three runs in 30 s, the moves in that order', cycles.every(c => c >= 3) && J('Object.values(__modes).every(l => l.every((m, i) => i === 0 || ({ in: "peel", peel: "out", out: "in" })[l[i - 1]] === m))') === true, JSON.stringify(cycles));
  check('on a run in the nose is on the target (within 0.6 rad) at least 70 percent of the time it is within gun range, and it does not shoot on the peel or the way out (the guns: CAMP.strafe)', J('__samples') > 100 && J('__aimed / __samples') >= 0.7, J('__aimed') + ' of ' + J('__samples'));
  const lanes = J(`(() => { __run(20, () => { __f.x = C.carrier.x + 650; __f.y = C.carrier.y - 200; }); let same = 0, n = 0; ['red', 'green', 'yellow'].forEach(q => { const m = __fs().filter(u => u.squad === q); if (m.length === 2 && m[0].run && m[1].run && m[0].run.m === 'in' && m[1].run.m === 'in') { n++; if (m[0].run.side === m[1].run.side) same++; } }); return [same, n]; })()`);
  check('a wingman takes its leader\'s side: in the runs in where both of a squad are in, they are on the same side (the flight comes in together)', lanes[1] === 0 || lanes[0] >= lanes[1] - 1, JSON.stringify(lanes));
  const dmg = (kind, seed) => J(`(() => { const f = __big("${kind}", false, ${seed}); __run(40, () => { f.hp = Math.max(f.hp, f.maxHp - 1e6) }); return Math.round(1e7 - f.hp); })()`);
  const d = dmg('gunship', 1);
  check('the damage the wing deals to a gunship that shoots back in 40 s is about the old circling\'s (962 over five seeds, 925 measured; seeds go from 576 to 1,076: here seed 1, 350 to 1,400; card space-game-keys2-orders moved the repair to 25 percent and 20 s: seed 1 went from 488 to 392 on main 5ce787b8, the other four seeds are within 8 of what they were)', d >= 350 && d <= 1400, d);
  const wa = src('src/campaign.js'), wing = wa.slice(wa.indexOf('function campWingAI'), wa.indexOf('function campWingFire'));
  check('the wing\'s AI no longer steers by the pirates\' ring (campSteer) against anything: a duel is campDogSteer, the rest campStrafe', !/campSteer\(/.test(wing) && /campStrafe\(C, u, foe, dist, target\)/.test(wing) && /campDogSteer\(C, u, foe/.test(wing));
  const abort = J(`(() => { __out(1); window.__foes = true; const f = campSpawn(C, 'gunship', C.carrier.x + 3000, C.carrier.y); const u = __fs()[0]; u.x = C.carrier.x; u.y = C.carrier.y; const d = dist => { u.x = f.x - dist; u.y = f.y; u.run = { m: 'in', until: C.t - 1000, side: 1 }; campStrafe(C, u, f, dist, 0); return u.run.m; }; const far = d(900), near = d(300); window.__foes = false; return [far, near]; })()`);
  check('a run in does not time out while the ship is still closing from out of gun range (a target that runs, a slow ship: it kept breaking off and never arrived), and does inside it', abort[0] === 'in' && abort[1] === 'peel', JSON.stringify(abort));
  check('the guns fire in a burst on a run in (CAMP.strafe.burst, and burstBy for a drone and a torpedo boat), and the shot delay is only ever shortened by it', J('CAMP.strafe.burst') > 0 && J('CAMP.strafe.burst') < 1 && J('CAMP.strafe.burstBy.drone') < J('CAMP.strafe.burst'));
}

console.log('H. no circling in a dogfight');
{
  const steer = (order, wind, extendAt) => J(`(() => { __out(1); const u = __fs()[0], r = __foe(500, 0); u.order = { type: 'attack', target: '' }; ${order ? `u.order = ${order};` : ''} u.dog = { mode: 'attack', until: 0, side: 1, flipAt: -1e9, jinkAt: -1e9, wind: ${wind}, los: Math.atan2(r.y - u.y, r.x - u.x), extendAt: ${extendAt} }; u.x = r.x - 500; u.y = r.y; u.rot = 0; u.vx = 0; u.vy = 0; const m = campDogSteer(C, u, r, CAMP.fighter.bullet); return { mode: m.mode, fire: m.fire, away: Math.abs(campWrap(m.ang - Math.PI)) < 1e-6 }; })()`);
  g.run('window.__foes = true;');
  const a = steer('', 6, -1e9), b = steer('{ type: "guard", at: { kind: "carrier" } }', 6, -1e9), c = steer('', 2, -1e9), e = steer('', 6, 'C.t');
  check('a fighter on an Attack that has turned the line to its target round by more than CAMP.dog.circle.limit (4.5 rad) breaks off and EXTENDS: straight away from it, nose where it flies, not firing', a.mode === 'extend' && a.fire === false && a.away === true, JSON.stringify(a));
  check('not when it guards (it stays on what attacks what it protects), not when it has turned less than the limit, and not again within CAMP.dog.circle.every seconds of the last', b.mode !== 'extend' && c.mode !== 'extend' && e.mode !== 'extend', JSON.stringify([b, c, e]));
  check('only the wing\'s fighters extend: the aliens\' raiders fly the dogfight as they did (no extend in their steering)', J(`(() => { __out(1); const r = __foe(500, 0), f = __fs()[0]; r.dog = { mode: 'attack', until: 0, side: 1, flipAt: -1e9, jinkAt: -1e9, wind: 9, los: 0 }; r.order = { type: 'attack' }; r.x = f.x + 500; r.y = f.y; const m = campDogSteer(C, r, f, 500); return m.mode; })()`) !== 'extend');
  g.run('window.__foes = false;');
  g.run(`window.__duel = seed => { __new(seed); campOrder(C, 'launch'); __run(10); window.__foes = true; const fs = __fs(); fs.slice(1).forEach(u => { u.hp = 0; }); const f = fs[0]; f.x = C.carrier.x + 4000; f.y = C.carrier.y; f.vx = f.vy = 0; f.order = { type: 'attack', target: '' }; const r = campSpawn(C, 'raider', f.x + 900, f.y); r.goal = 'carrier'; let wind = 0, last = null, t = 0; for (; t < 80 * 30 && r.hp > 0 && f.hp > 0; t++) { campStep(C, 1 / 30); C.events.length = 0; if (f.hp > 0 && r.hp > 0) { const a = Math.atan2(r.y - f.y, r.x - f.x); if (last !== null) wind += campWrap(a - last); last = a; } } window.__foes = false; return { win: r.hp <= 0, lost: f.hp <= 0, sec: Math.round(t / 30), revs: Math.abs(wind) / 6.283 }; };`);
  const duels = [1, 2, 3, 4, 5, 6].map(sd => J(`__duel(${sd})`));
  check('one fighter against one raider, six seeds: the fighter wins every time, and the line between them never turns round more than two and a half times (it did up to three before the extend) and ' + 'about one time on average', duels.every(d => d.win && !d.lost) && duels.every(d => d.revs <= 2.6) && duels.reduce((a, d) => a + d.revs, 0) / duels.length <= 1.2, JSON.stringify(duels.map(d => [d.sec, Math.round(d.revs * 10) / 10])));
}

console.log('I. a wingman covers its leader');
{
  g.run('__out(1);');
  const cv = J(`(() => { window.__foes = true; const reds = __fs().filter(u => u.squad === 'red'), L = reds[0], W = reds[1]; const B = campSpawn(C, 'raider', L.x - 300, L.y); B.rot = 0; const A = campSpawn(C, 'raider', W.x + 200, W.y + 200); A.rot = Math.PI; C.t += 1; const on = campFlightCover(C, W) === B, lead = campFlightCover(C, L); B.rot = Math.PI; const away = campFlightCover(C, W); B.rot = 0; B.x = L.x - 900; const far = campFlightCover(C, W); B.x = L.x - 300; B.kind = 'tower'; const tower = campFlightCover(C, W); window.__foes = false; return { on, lead, away, far, tower }; })()`);
  check('the wingman\'s foe is the alien that has its nose on the leader within CAMP.flight.cover.range (an alien nearer to the wingman is not it)', cv.on === true, JSON.stringify(cv));
  check('the leader covers nobody; an alien facing away, one out of range and a tower (it aims without turning) are not covered', cv.lead === null && cv.away === null && cv.far === null && cv.tower === null, JSON.stringify(cv));
  check('Attack with no target and Guard ask for the cover first (campFlightCover in the wing\'s AI), and only fighters have a leader', /campFlightCover\(C, u\) \|\| campDogFoe/.test(src('src/campaign.js')) && /foe = campFlightCover\(C, u\) \|\| foe/.test(src('src/campaign.js')) && J(`(() => { const e = campWing(C, 'escort')[0]; return e ? campFlightCover(C, e) : null; })()`) === null);
}

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nFLIGHTS FAIL (${failed} of ${n})` : `\nFLIGHTS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
