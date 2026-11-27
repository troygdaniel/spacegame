// smoke: 3.3's fighter job (card space-game-fighter-job-33; BRIEF 8 proposal C): the fighter the player flies cuts a tower down three times as fast (CAMP.cockpit.towerK), so it can clear the towers on one side and the cruiser comes in through the gap (plain Node, no Chrome)
// Before it one flown fighter needed about 22 s of fire for one 3.3 tower (480 hit points) while the tower killed its 72 hull in 3 hits: it could never clear two. With the factor 3 it needs about 7 s. Only the flown fighter's shots against a TOWER: its shots against anything else, the wing pilots' shots and the cruiser's are as they were.
// Run: node tests/campfightergap.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`window.T = {}; T.make = () => { const C = campNew(3, [], { seed: 3, mission: 2 }); C.arrivedAt = 0; CAMP.flags.cockpit = true; C.waves.forEach(w => { w.started = true; }); const car = C.carrier; car.hp = 1e9; car.x = -9000; car.y = -9000;
    C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'fighter' && u !== car) u.hp = 0; }); const tw = C.ships.filter(u => u.kind === 'tower'); C.__tw = tw; const fs = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter'); fs.forEach((u, i) => { u.x = tw[0].x + 6000; u.y = tw[0].y + 6000 + i * 400; u.hp = 1e9; u.vx = 0; u.vy = 0; }); C.__f = fs[0]; C.__g = fs[1]; return C; };
  T.shootAt = (C, shooter, target, ms) => { const f = shooter, dmgOf = u => u.hp; const hp0 = target.hp; f.x = target.x - 300; f.y = target.y; f.vx = 0; f.vy = 0; for (let i = 0; i < 30 * ms; i++) { f.x = target.x - 300; f.y = target.y; f.vx = 0; f.vy = 0; f.rot = 0; if (C.cockpit && C.cockpit.id === f.id) { C.cockpit.input.fire = true; C.cockpit.input.thrust = 0; C.cockpit.input.brake = true; } campStep(C, 1 / 30); } return hp0 - target.hp; };`);

check('the number is in the table: CAMP.cockpit.towerK is 3', J('CAMP.cockpit.towerK') === 3);

// one shot of 10 points put on the target by hand (a bullet of the shooter's, point blank), so the numbers are exact
g.run(`T.hit = (C, shooter, target) => { target.hp = target.maxHp = 1e6; C.bullets.length = 0; shooter.x = target.x - 4; shooter.y = target.y; shooter.vx = 0; shooter.vy = 0; campBullet(C, shooter, 0, 200, 10, 1000, 'earth', 0); const hp0 = target.hp; campBullets(C, 1 / 30); return hp0 - target.hp; };`);
const a = J(`(() => { const C = T.make(); const T0 = C.__tw[0]; campCockpitTake(C, C.__f.id); const flown = T.hit(C, C.__f, T0), wing = T.hit(C, C.__g, T0); CAMP.cockpit.towerK = 1; const flown1 = T.hit(C, C.__f, T0); CAMP.cockpit.towerK = 3; return { flown, wing, flown1 }; })()`);
check('a shot of the fighter flown deals three times its damage to a tower (30 for 10), a wing pilot\'s shot the plain 10, and at towerK 1 the flown one the plain 10', a.flown === 30 && a.wing === 10 && a.flown1 === 10, JSON.stringify(a));
const c = J(`(() => { const C = T.make(); campCockpitTake(C, C.__f.id); const r = campSpawn(C, 'raider', C.__tw[0].x + 5000, C.__tw[0].y + 5000); r.hold = true; return { raider: T.hit(C, C.__f, r), wingRaider: T.hit(C, C.__g, r) }; })()`);
check('against a ship that is no tower the factor does nothing: the flown fighter\'s shot deals 10 to a raider, as a wing pilot\'s does', c.raider === 10 && c.wingRaider === 10, JSON.stringify(c));
const d = J(`(() => { const C = T.make(); const T0 = C.__tw[0]; T0.hp = T0.maxHp = 480; campCockpitTake(C, C.__f.id); const sh = CAMP.cockpit.damageK * CAMP.fighter.damage * CAMP.cockpit.towerK; return { perShot: +sh.toFixed(1), shotsForATower: Math.ceil(480 / sh), seconds: +(Math.ceil(480 / sh) * (CAMP.fighter.delay[0] + CAMP.fighter.delay[1]) / 2 / CAMP.cockpit.rateK / 1000).toFixed(1) }; })()`);
check('so one 3.3 tower (480 hit points) takes the fighter flown about 7 s of fire (5 to 9 s), not the 22 it took', d.seconds >= 5 && d.seconds <= 9, JSON.stringify(d));

// ---- the gap: two dead towers on one side make that side cheaper for the cruiser ----
const gap = J(`(() => { const C = T.make(); const tw = C.__tw, home = campPlaces(3).home, ring = tw.map(t => ({ t, a: Math.atan2(t.y - home.y, t.x - home.x) })); const side = ring[0].a - 0.3, near = ring.slice().sort((p, q) => Math.abs(Math.atan2(Math.sin(p.a - side), Math.cos(p.a - side))) - Math.abs(Math.atan2(Math.sin(q.a - side), Math.cos(q.a - side)))); const pt = { x: home.x + Math.cos(side + 0.3) * 1000, y: home.y + Math.sin(side + 0.3) * 1000 };
  const inRange = () => tw.filter(t => t.hp > 0 && campDist(t, pt) <= CAMP.tower.range).length; const before = inRange(); near.slice(0, 2).forEach(p => { p.t.hp = 0; }); const after = inRange(); return { towers: tw.length, before, after }; })()`);
check('3.3 has eight towers in a ring; a cruiser at the ring\'s edge is under the guns of more of them than it is once the two towers nearest are dead (the gap)', gap.towers === 8 && gap.before >= 3 && gap.after < gap.before, JSON.stringify(gap));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP FIGHTER GAP OK (${n} checks)`);
process.exit(failed ? 1 : 0);
