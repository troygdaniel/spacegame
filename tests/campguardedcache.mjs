// smoke: 2.1's second cache has a guard group waiting at it from the start (card space-game-b10-c5-21-guarded-cache; BRIEF 10 chunk 5, docs/chunks.html: "the second cache is guarded from the start, so it cannot be scooped in passing") (plain Node, no Chrome)
// The mission row's `guards` (3 gunships, 3 raiders, 2 drones, round the second cache, [800, 1600] from the place): they wait (hold) until a ship of yours comes within reach, then fight as any alien. Two caches are still enough to win; the
// first cache taken still calls its group, the hunting party for a player who takes none is as it was (tests/camplevel2calls.mjs).
// Run: node tests/campguardedcache.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.T = {}; T.make = () => { const C = campNew(2, ['shield'], { seed: 4, mission: 0 }); C.arrivedAt = 0; return C; };
  T.park = C => { C.ships.forEach(u => { if (u.team === 'earth') { u.x = -9000; u.y = -9000; u.vx = 0; u.vy = 0; u.hp = Math.max(u.hp, 1e9); } }); };
  T.step = (C, secs) => { for (let i = 0; i < 30 * secs && !C.result; i++) { C.input.thrust = 0; C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); } };`);

const a = J(`(() => { const C = T.make(), gs = C.ships.filter(u => u.guard), k = C.caches[1], kinds = {}; gs.forEach(u => { kinds[u.kind] = (kinds[u.kind] || 0) + 1; }); return { n: gs.length, kinds, near: Math.round(Math.max(...gs.map(u => campDist(u, k)))), farFromOthers: Math.round(Math.min(...gs.map(u => Math.min(campDist(u, C.caches[0]), campDist(u, C.caches[2]))))), hold: gs.every(u => u.hold), caches: C.caches.length, need: C.L.objectives[0].n }; })()`);
check('the second cache has eight guards from the start (3 gunships, 3 raiders, 2 drones), every one within 450 px of it, waiting (hold)', a.n === 8 && a.kinds.gunship === 3 && a.kinds.raider === 3 && a.kinds.drone === 2 && a.near <= 450 && a.hold === true, JSON.stringify(a));
check('the other two caches are clear of them (over 1,500 px), and there are still three caches and two are enough', a.farFromOthers > 1500 && a.caches === 3 && a.need === 2, JSON.stringify(a));

const b = J(`(() => { const C = T.make(); T.park(C); const k = C.caches[1]; T.step(C, 20); const still = C.ships.filter(u => u.guard).every(u => u.hold && campDist(u, k) <= 460); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); f.x = k.x - 400; f.y = k.y; T.step(C, 1); return { still, awake: C.ships.filter(u => u.guard && !u.hold).length }; })()`);
check('twenty seconds with nobody near: they stay where they are; a ship of yours 400 px from the cache wakes them', b.still === true && b.awake >= 6, JSON.stringify(b));

const c = J(`(() => { const C = T.make(); T.park(C); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); const k0 = C.caches[0]; f.x = k0.x; f.y = k0.y; T.step(C, 0.4); return { got: C.cachesGot, started: C.waves[0].started, guardsAsleep: C.ships.filter(u => u.guard && u.hold).length }; })()`);
check('the first cache taken (it is 2,400 px from the guarded one) calls the group as before and does not wake the guards', c.got === 1 && c.started === true && c.guardsAsleep === 8, JSON.stringify(c));

const d = J(`(() => { const C = T.make(); T.park(C); C.carrier.x = -9000; C.carrier.y = -9000; T.step(C, 46); return { party: C.ships.filter(u => u.hunt != null && u.hp > 0).length, guards: C.ships.filter(u => u.guard && u.hp > 0).length }; })()`);
check('the hunting party for a player who takes no cache still comes at 45 s (5 ships), and the guards are all still there', d.party === 5 && d.guards === 8, JSON.stringify(d));

const e = J(`(() => { const C = T.make(); T.park(C); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); const take = k => { f.x = k.x; f.y = k.y; T.step(C, 0.3); f.x = -9000; f.y = -9000; T.step(C, 0.3); }; take(C.caches[0]); take(C.caches[2]); const got = C.cachesGot; campAliens(C).forEach(u => { if (u.wave != null) u.hp = 0; }); T.step(C, 0.5); return { got, end: C.result || null }; })()`);
check('two caches without the guarded one (the first and the third) still win once the called group is dead: the guards are not a condition of the win (a careful player can go round)', e.got === 2 && e.end === 'won', JSON.stringify(e));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP GUARDED CACHE OK (${n} checks)`);
process.exit(failed ? 1 : 0);
