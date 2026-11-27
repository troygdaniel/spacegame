// smoke: 2.2's reinforcements come out of the dark around the CRUISER, wherever the flown fighter is, and go for her (card space-game-b10-c2-22-reinforce-cruiser; BRIEF 10 chunk 2, docs/chunks.html) (plain Node, no Chrome)
// A wave row's `around: 'carrier'` with `ring: [dx, dy]` (src/campaign.js, the origin of a wave): the group comes out that far from the cruiser, not from a fixed point of the map; with the focus of chunk 16 (c9ac0210: called groups are not drawn off by a fighter) they head for her.
// Run: node tests/campreinforcecruiser.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.T = {}; T.make = () => { const C = campNew(2, ['shield'], { seed: 4, mission: 1 }); C.arrivedAt = 0; CAMP.flags.cockpit = true; const P = campMissionPlace(C); C.carrier.x = P.x + 200; C.carrier.y = P.y - 300; C.carrier.vx = 0; C.carrier.vy = 0; C.carrier.hp = 1e9; return C; };
  T.step = (C, secs) => { for (let i = 0; i < 30 * secs && !C.result; i++) { C.input.thrust = 0; C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); } };`);

const rows = J(`(() => { const C = T.make(); return C.L.waves.map(w => ({ on: w.on, around: w.around || null, d: w.ring ? Math.round(Math.hypot(w.ring[0], w.ring[1])) : null, ang: w.ring ? Math.atan2(w.ring[1], w.ring[0]) : null, focus: w.focus || null })); })()`);
check('2.2\'s three wave rows come out around the cruiser, 3,500 to 4,100 px from her (card space-game-22-farther-ring: they came out 1,700 px from her until Troy found 2.2 too short), and carry the focus', rows.length === 3 && rows.every(r => r.around === 'carrier' && r.d >= 3500 && r.d <= 4100 && r.focus === 'carrier'), JSON.stringify(rows));
check('the two reinforcement groups come from opposite sides of her (their bearings half a turn apart, within 0.1 rad)', Math.abs(Math.abs(rows[0].ang - rows[1].ang) - Math.PI) < 0.1, JSON.stringify(rows));

// the cruiser at one place, the fighter flown far away (3,500 px), four guards killed: the groups appear around HER
const a = J(`(() => { const C = T.make(); const car = C.carrier, f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); campCockpitTake(C, f.id); f.x = car.x + 3500; f.y = car.y + 2500; f.vx = 0; f.vy = 0; C.ships.forEach(u => { if (u.team === 'earth' && u !== car && u !== f) { u.x = -9000; u.y = -9000; u.hp = 1e9; } }); f.hp = f.maxHp = 1e9;
  C.ships.filter(u => u.guard).slice(0, 4).forEach(u => { u.hp = 0; }); C.cockpit.input.thrust = 0; campStep(C, 1 / 30); campStep(C, 1 / 30);
  const w = C.ships.filter(u => u.team === 'alien' && u.wave != null && (u.wave === 0 || u.wave === 1)); const dC = w.map(u => Math.round(campDist(u, car))), dF = w.map(u => Math.round(campDist(u, f)));
  return { n: w.length, started: C.waves.map(x => x.started ? 1 : 0).join(''), dCmin: Math.min(...dC), dCmax: Math.max(...dC), dFmin: Math.min(...dF) }; })()`);
check('the fighter flown 4,300 px from the cruiser, the fourth guard dies: both reinforcement groups (11 ships: card space-game-22-longer-more-ships) appear 3,400 to 4,200 px from the CRUISER, and farther than 2,000 px from the fighter', a.started.slice(0, 2) === '11' && a.n === 11 && a.dCmin >= 3400 && a.dCmax <= 4200 && a.dFmin > 2000, JSON.stringify(a));

const b = J(`(() => { const C = T.make(); const car = C.carrier, f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); campCockpitTake(C, f.id); C.ships.forEach(u => { if (u.team === 'earth' && u !== car && u !== f) { u.x = -9000; u.y = -9000; u.hp = 1e9; } }); f.hp = f.maxHp = 1e9;
  C.ships.filter(u => u.guard).slice(0, 4).forEach(u => { u.hp = 0; }); campStep(C, 1 / 30); campStep(C, 1 / 30);
  const w = C.ships.filter(u => u.team === 'alien' && u.wave != null && u.wave <= 1), d0 = w.map(u => campDist(u, car)); const mid = { x: (w[0].x + car.x) / 2, y: (w[0].y + car.y) / 2 };
  f.x = mid.x; f.y = mid.y; for (let i = 0; i < 30 * 4; i++) { f.x = mid.x; f.y = mid.y; f.vx = 0; f.vy = 0; C.cockpit.input.thrust = 0; campStep(C, 1 / 30); }
  const live = w.filter(u => u.hp > 0), d1 = live.map(u => campDist(u, car)); return { live: live.length, closer: live.filter((u, i) => campDist(u, car) < d0[w.indexOf(u)] - 100).length }; })()`);
check('with the fighter parked on the path of one group, the groups still close on the cruiser (they do not stop for it): most of the live ones are over 100 px nearer her after 4 s', b.live >= 4 && b.closer >= b.live - 1, JSON.stringify(b));

const c = J(`(() => { const C = T.make(); const car = C.carrier; C.ships.forEach(u => { if (u.team === 'earth' && u !== car) { u.x = -9000; u.y = -9000; u.hp = 1e9; } }); const gs = C.ships.filter(u => u.guard); gs.slice(0, 6).forEach(u => { u.hp = 0; }); campStep(C, 1 / 30); campStep(C, 1 / 30); const R = C.runner, u = R && R.id ? C.by[R.id] : null; for (let i = 0; i < 30 * 15 && !R.called; i++) campStep(C, 1 / 30); campStep(C, 1 / 30); const g3 = C.ships.filter(x => x.team === 'alien' && x.wave === 2); return { called: R.called, n: g3.length, d: g3.length ? Math.round(Math.min(...g3.map(x => campDist(x, car)))) : null, dmax: g3.length ? Math.round(Math.max(...g3.map(x => campDist(x, car)))) : null }; })()`);
check('the second group (called by the runner) also comes out around the cruiser: 3,300 to 4,200 px from her', c.called === true && c.n === 10 && c.d >= 3300 && c.dmax <= 4200, JSON.stringify(c));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP REINFORCE CRUISER OK (${n} checks)`);
process.exit(failed ? 1 : 0);
