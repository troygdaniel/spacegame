// smoke: a hostile fighter under half its hull, with the flown fighter within 900 px, runs straight away until it is 600 px from it, then turns and comes back in, once (plain Node, no Chrome)
// Card space-game-chunk8-enemy-extend (Troy, 26 Nov 2026; brief 8 proposal A, third behaviour; src/campbreak.js, the numbers are CAMP.break.extend). Steering only: no hit points, damage or speed.
//   A. the extend: a skiff at 7 of 16 hit points 300 px from the flown fighter heads away from it (straight along the line), does not fire, until 600 px; then its own steering; and not a second time
//   B. who and when: a healthy one (half hull or more), one with the flown fighter far (1,200 px), a gunship or a torpedo boat, nobody flying a fighter, the table off: none runs out
// Run: node tests/campextend.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  CAMP.flags.cockpit = true;
  window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team === 'earth'); const f = campWing(C).filter(u => u.pilot)[0];
    f.x = 0; f.y = 0; f.rot = 0; f.vx = f.vy = 0; campCockpitTake(C, f.id); window.F = f;
    window.__kind = (k, x, y, share) => { const s = campSpawn(C, k, x, y); s.rot = 3; s.vx = s.vy = 0; s.team = 'alien'; s.hold = false; s.nextShot = 1e9; s.hp = s.maxHp * (share == null ? 0.44 : share); return s; }; return C; };
  window.__m = () => ({ move: 'circle', ang: 3.1, face: 3.1, fire: true });
`);

console.log('A. the extend');
{
  g.run(`__mk(); window.S = __kind('skiff', 300, 0);`);
  const r = J('(() => { const m = campBreakSteer(C, S, __m()); return { ang: +m.ang.toFixed(3), face: +m.face.toFixed(3), fire: m.fire, extends: C.extends }; })()');
  check('a skiff at 7 of 16 hit points, 300 px from the flown fighter, runs straight away from it (the line from the fighter to it), nose where it flies, no shot', r.ang === 0 && r.face === 0 && r.fire === false && r.extends === 1, JSON.stringify(r));
  g.run(`S.x = 500;`);
  check('at 500 px it is still running out', J('(() => { const m = campBreakSteer(C, S, __m()); return m.fire === false && m.ang === 0; })()'));
  g.run(`S.x = 610;`);
  const back = J('(() => { const m = campBreakSteer(C, S, __m()); return { ang: m.ang, fire: m.fire }; })()');
  check('at 600 px it turns and comes back in: its own steering again (firing), without a wait', back.ang === 3.1 && back.fire === true, JSON.stringify(back));
  g.run(`S.x = 300; S.hp = 3;`);
  check('and it does not run out a second time, however hurt it is (a ship that has come back fights on)', J('(() => { const m = campBreakSteer(C, S, __m()); return m.ang === 3.1 && m.fire === true && C.extends === 1; })()'));
  g.run(`__mk(); window.S = __kind('skiff', 300, 0); campBreakSteer(C, S, __m()); C.t += 3600; S.x = 320;`);
  check('a fighter that cannot get away turns back after 3.5 s', J('(() => { const m = campBreakSteer(C, S, __m()); return m.ang === 3.1 && m.fire === true; })()'));
}

console.log('B. who and when');
{
  const runs = setup => { g.run(`__mk(); ${setup}`); return J('(() => { const m = campBreakSteer(C, S, __m()); return (C.extends | 0) === 1 && m.fire === false && m.ang === Math.atan2(S.y - F.y, S.x - F.x); })()'); };
  check('a healthy skiff (half its hull or more) does not run out', runs(`window.S = __kind('skiff', 300, 0, 0.5);`) === false && runs(`window.S = __kind('skiff', 300, 0, 1);`) === false);
  check('with the flown fighter far (1,200 px) it is not being fought and does not', runs(`window.S = __kind('skiff', 1200, 0);`) === false);
  check('the raider, the drone, the cutter and the skiff do; a gunship, a brute and a torpedo boat do not', ['raider', 'drone', 'cutter', 'skiff'].every(k => runs(`window.S = __kind('${k}', 300, 0);`) === true) && ['gunship', 'brute', 'tboat'].every(k => runs(`window.S = __kind('${k}', 300, 0);`) === false));
  check('it runs out whichever side of the fighter it is on: straight away from it', runs(`window.S = __kind('skiff', -200, 250);`) === true);
  check('nobody flying a fighter: none runs out', J(`(() => { __mk(); const S = __kind('skiff', 300, 0); campCockpitGive(C, 'hand'); campBreakSteer(C, S, __m()); return C.extends | 0; })()`) === 0);
  check('with the table off none does either', J(`(() => { __mk(); const S = __kind('skiff', 300, 0); CAMP.break.on = false; try { campBreakSteer(C, S, __m()); return C.extends | 0; } finally { CAMP.break.on = true; } })()`) === 0);
  check('steering only: the extend\'s table has below, near, out and ms, and nothing else', J('Object.keys(CAMP.break.extend).sort().join()') === 'below,ms,near,out');
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('EXTEND FAIL (' + failed + ')'); process.exit(1); } else console.log('EXTEND PASS');
