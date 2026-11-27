// smoke: the fighter jobs of level 2 (cards space-game-fighter-job-21, -22, -23; BRIEF 8 proposal C): in 2.1 a fighter collects a cache while the cruiser stays where it is (plain Node, no Chrome)
// 2.1: a cache is taken by ANY ship of yours that comes within CAMP.cache.radius (campCaches), and the wing's Fetch order (campWing: fetch, kinds pickup and cache) sends a pilot to one, so the player chooses who goes where:
// the cruiser to one cache, a fighter to the far one. The first cache taken calls the group to the nearest cache still to take (tests/camplevel2calls.mjs). This suite pins that the fighter alone can do both caches and win.
// Run: node tests/campfighterjobs.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`window.T = {}; T.make = (mi, seed) => { const C = campNew(2, ['shield'], { seed, mission: mi }); C.arrivedAt = C.arrivedAt == null ? 0 : C.arrivedAt; return C; };
  T.step = (C, secs) => { for (let i = 0; i < 30 * secs && !C.result; i++) { C.input.thrust = 0; C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); } };`);

// ---- 2.1: a pilot sent to a cache takes it while the cruiser sits ----
const w = J(`(() => { const C = T.make(0, 4); const car = C.carrier, x0 = Math.round(car.x), y0 = Math.round(car.y); campOrder(C, 'launch'); T.step(C, 2);
  const far = C.caches.map((k, i) => ({ i, d: campDist(k, car) })).sort((a, b) => b.d - a.d)[0], r = campWingOrder(C, 'fighters', 'fetch', 'cache:' + far.i, 'key');
  T.step(C, 40); return { ok: r.ok, got: C.cachesGot, taken: C.caches[far.i].got, farKm: Math.round(far.d), cruiserMoved: Math.round(Math.hypot(car.x - x0, car.y - y0)) }; })()`);
check('a pilot ordered to Fetch the farthest cache takes it, and the cruiser did not move', w.ok && w.taken === true && w.got >= 1 && w.cruiserMoved < 50, JSON.stringify(w));

// ---- the stick: the fighter he flies takes a cache by flying over it ----
const f = J(`(() => { const C = T.make(0, 4); CAMP.flags.cockpit = true; campOrder(C, 'launch'); T.step(C, 2); const fi = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, fi.id);
  const k = C.caches[0]; fi.x = k.x - 400; fi.y = k.y; fi.rot = 0; const S = C.cockpit; for (let i = 0; i < 30 * 10 && !k.got; i++) { S.input.thrust = 1; S.input.turn = 0; S.input.fire = false; campStep(C, 1 / 30); } return { got: C.cachesGot, taken: k.got }; })()`);
check('the fighter he flies takes a cache by flying over it', f.taken === true && f.got === 1, JSON.stringify(f));

// ---- both caches by fighters alone, then the group dead: the mission is won ----
const all = J(`(() => { const C = T.make(0, 6); campOrder(C, 'launch'); T.step(C, 2); const x0 = C.carrier.x, y0 = C.carrier.y; C.carrier.hp = 1e6;
  campWingOrder(C, 'fighters', 'fetch', 'cache:0', 'key'); T.step(C, 40); campWingOrder(C, 'fighters', 'fetch', 'cache:1', 'key'); T.step(C, 40);
  const a = { got: C.cachesGot, aliens: campAliens(C).length, result: C.result || null }; campAliens(C).forEach(u => { u.hp = 0; }); T.step(C, 1);
  return { a, end: C.result || null, why: C.why || null, cruiserMoved: Math.round(Math.hypot(C.carrier.x - x0, C.carrier.y - y0)) }; })()`);
check('two caches by the pilots alone call the group; with it dead the mission is won, the cruiser never having left its place', all.a.got >= 2 && all.end === 'won' && all.cruiserMoved < 50, JSON.stringify(all));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP FIGHTER JOBS OK (${n} checks)`);
process.exit(failed ? 1 : 0);
