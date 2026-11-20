// smoke: the Campaign's beam tech hurts each ship once per turret shot (twice a plain shot, as its text says), and still goes through a line of ships (plain Node, no Chrome)
// Card space-game-night-gameplay (docs/night/gameplay.md, finding "the beam hits a ship every step"). A beam shot went through ships and hurt one again on every step of the game it spent
// inside the ship's circle: on a 90 px mothership about 7 times (56 for a shot meant to do 8), on a tower or a gunship 2 to 3 times, on a raider once or twice.
// Run: node tests/campgameplay-beam.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// the carrier holds fire for 2 s at still targets east of it (kinds at distances), then 3 s more so every shot has landed. Back: { shots, took: [hit points each target lost] }.
// The targets cannot move or shoot and have hit points to spare; the carrier's own battle is empty.
g.run(`window.__fire = (techs, targets) => {
  const C = campNew(1, techs, { seed: 1 }); C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = { [C.carrier.id]: C.carrier };
  const c = C.carrier; c.x = 0; c.y = 0; c.rot = 0; c.vx = 0; c.vy = 0; C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(cv => { cv.started = true; }); C.motherSpawn = 1e12;
  const ts = targets.map(([k, d, dy]) => { const t = campSpawn(C, k, d, dy || 0); t.hold = true; t.hp = t.maxHp = 100000; t.vmax = 0; t.accel = 0; t.nextShot = 1e12; t.fixed = true; t.home = [d, dy || 0]; return t; });
  const b0 = campBullet; let shots = 0; campBullet = function (C, from, rot, speed, dmg, life, team, ahead, extra) { if (team === 'earth' && extra && extra.pd) shots++; return b0.apply(null, arguments); };
  for (let i = 0; i < 150; i++) { C.input.fire = i < 60; ts.forEach(t => { t.x = t.home[0]; t.y = t.home[1]; t.vx = 0; t.vy = 0; t.nextShot = 1e12; }); campStep(C, 1 / 30); }
  campBullet = b0; return { shots, took: ts.map(t => Math.round((100000 - t.hp) * 100) / 100) };
};`);

console.log('the beam: one shot, one hit on each ship');
for (const kind of ['raider', 'drone', 'gunship', 'mother', 'tower']) {
  const plain = J(`__fire([], [['${kind}', 300]])`), beam = J(`__fire(['beam'], [['${kind}', 300]])`);
  check('without the beam every turret shot takes 4 off a ' + kind, plain.shots > 20 && Math.abs(plain.took[0] / plain.shots - 4) < 0.01, plain.shots + ' shots, ' + plain.took[0]);
  check('with the beam every turret shot takes 8 off a ' + kind + ' (twice a plain shot, once)', beam.shots > 20 && Math.abs(beam.took[0] / beam.shots - 8) < 0.01, beam.shots + ' shots, ' + beam.took[0]);
}
const line = J(`__fire(['beam'], [['raider', 250], ['drone', 330], ['mother', 450]])`);
check('the beam still goes through a line of ships: the ones behind the first are hurt too', line.took[0] > 0 && line.took[1] > 0 && line.took[2] > 0, JSON.stringify(line.took));
check('a plain shot stops at the first ship: nothing behind it is hurt', J(`__fire([], [['raider', 250], ['mother', 450]])`).took[1] === 0);
const far = [J(`__fire([], [['mother', 650]])`).took[0], J(`__fire(['beam'], [['mother', 650]])`).took[0]];
check('the beam still reaches further than a turret: a mothership 650 px out is out of reach of a plain turret and inside the beam\'s', far[0] === 0 && far[1] > 0, JSON.stringify(far));
check('the numbers in the table did not change: a turret shot 4, the beam twice, 1.5 times the reach', J('CAMP.carrier.pd') === 4 && J('CAMP.tech.beam.damage') === 2 && J('CAMP.tech.beam.reach') === 1.5);
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
