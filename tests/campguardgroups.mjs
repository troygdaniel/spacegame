// smoke: 2.2's seven guards stand in two groups about 1,500 px apart, both a flight from where the cruiser arrives, so one pass cannot kill them all (card space-game-b10-c6-22-two-guard-groups; BRIEF 10 chunk 6, docs/chunks.html) (plain Node, no Chrome)
// The mission row's `guards` (positions only; the same seven guards, no hit-point change). The fourth-guard call, the runner (six dead) and the guard patrol count the guards of both groups, since they read the one list (src/campaign.js campWaveOn guardsDead, campRunner, campHunt).
// Run: node tests/campguardgroups.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.T = {}; T.make = () => { const C = campNew(2, ['shield'], { seed: 4, mission: 1 }); C.arrivedAt = 0; const P = campMissionPlace(C); C.carrier.x = P.x; C.carrier.y = P.y; C.carrier.vx = 0; C.carrier.vy = 0; return C; };
  T.park = C => { C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'carrier') { u.x = -9000; u.y = -9000; u.vx = 0; u.vy = 0; u.hp = Math.max(u.hp, 1e9); } }); C.carrier.hp = 1e9; };
  T.step = (C, secs) => { for (let i = 0; i < 30 * secs && !C.result; i++) { C.input.thrust = 0; C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); } };
  T.groups = C => { const P = campMissionPlace(C), gs = C.ships.filter(u => u.guard), cl = a => ({ x: a.reduce((s, u) => s + u.x, 0) / a.length, y: a.reduce((s, u) => s + u.y, 0) / a.length }); const A = gs.filter(u => u.y > P.y), B = gs.filter(u => u.y <= P.y); return { A, B, ca: cl(A), cb: cl(B), P }; };`);

const a = J(`(() => { const C = T.make(), G = T.groups(C), gs = C.ships.filter(u => u.guard), kinds = {}; gs.forEach(u => { kinds[u.kind] = (kinds[u.kind] || 0) + 1; }); const sp = (arr, c) => Math.round(Math.max(...arr.map(u => Math.hypot(u.x - c.x, u.y - c.y)))); return { n: gs.length, kinds, A: G.A.length, B: G.B.length, apart: Math.round(Math.hypot(G.ca.x - G.cb.x, G.ca.y - G.cb.y)), spreadA: sp(G.A, G.ca), spreadB: sp(G.B, G.cb), fromA: Math.round(Math.hypot(G.ca.x - G.P.x, G.ca.y - G.P.y)), fromB: Math.round(Math.hypot(G.cb.x - G.P.x, G.cb.y - G.P.y)), nearestToPlace: Math.round(Math.min(...gs.map(u => Math.hypot(u.x - G.P.x, u.y - G.P.y)))) }; })()`);
check('the same seven guards (3 gunships, 4 drones) in two groups of four and three', a.n === 7 && a.kinds.gunship === 3 && a.kinds.drone === 4 && a.A === 4 && a.B === 3, JSON.stringify(a));
check('the groups\' centres are 1,400 to 1,650 px apart, each group within 400 px of its own centre (two clusters on the Tab map)', a.apart >= 1400 && a.apart <= 1650 && a.spreadA <= 400 && a.spreadB <= 400, JSON.stringify(a));
check('each group is over 1,200 px from where the cruiser arrives (the nearest guard of either is 950 px or more): neither is on top of the arrival', a.fromA >= 1200 && a.fromB >= 1200 && a.nearestToPlace >= 950, JSON.stringify(a));

const b = J(`(() => { const C = T.make(); T.park(C); T.step(C, 10); const asleep = C.ships.filter(u => u.guard && u.hold).length; const G = T.groups(C); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); f.x = G.ca.x - 450; f.y = G.ca.y; T.step(C, 1); const awakeA = G.A.filter(u => !u.hold).length, awakeB = G.B.filter(u => !u.hold).length; return { asleep, awakeA, awakeB }; })()`);
check('the cruiser at the place for 10 s wakes none of them; a ship of yours 450 px from the first group wakes that group (at least three of its four) and not the second', b.asleep === 7 && b.awakeA >= 3 && b.awakeB === 0, JSON.stringify(b));

const c = J(`(() => { const C = T.make(); T.park(C); const G = T.groups(C); const kill = (arr, k) => arr.filter(u => u.hp > 0).slice(0, k).forEach(u => { u.hp = 0; }); kill(G.A, 2); kill(G.B, 2); T.step(C, 0.3); const four = C.waves.map(w => w.started ? 1 : 0).join(''); const live = C.ships.filter(u => u.guard && u.hp > 0).length; return { four, live, mid: !!C.runner && !!C.runner.id }; })()`);
check('two dead in each group make four dead: the reinforcements are called (the fourth guard of the whole, not of one group); the runner has not been chosen', c.four.slice(0, 2) === '11' && c.live === 3 && c.mid === false, JSON.stringify(c));

const d = J(`(() => { const C = T.make(); T.park(C); const G = T.groups(C); G.A.forEach(u => { u.hp = 0; }); G.B.slice(0, 2).forEach(u => { u.hp = 0; }); T.step(C, 0.3); const R = C.runner, u = R && R.id ? C.by[R.id] : null; return { dead: 6, runner: !!u && u.runner === true, fromB: !!u && G.B.indexOf(u) >= 0 }; })()`);
check('six dead across both groups: the last guard (the one left in the second group) is the runner', d.runner === true && d.fromB === true, JSON.stringify(d));

const e = J(`(() => { const C = T.make(); T.park(C); C.carrier.x = -9000; C.carrier.y = -9000; const G = T.groups(C); T.step(C, 41); const patrol = C.ships.filter(u => u.hunt != null && u.hp > 0).length; return { patrol, guards: C.ships.filter(u => u.guard && u.hp > 0).length }; })()`);
check('no guard dead for 40 s (the cruiser far away): the patrol comes (3 ships) and all seven guards are still there', e.patrol === 3 && e.guards === 7, JSON.stringify(e));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP GUARD GROUPS OK (${n} checks)`);
process.exit(failed ? 1 : 0);
