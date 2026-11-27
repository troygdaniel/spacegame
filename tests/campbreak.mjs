// smoke: a hostile fighter with the player's flown fighter on its tail inside 300 px turns hard across his nose for 0.7 s, then resumes, and cannot break again for 3 s; steering only (plain Node, no Chrome)
// Card space-game-chunk6-enemy-break (Troy, 26 Nov 2026; brief 8 proposal A, first behaviour only: no pair, no extend). src/campbreak.js; the numbers are CAMP.break.
//   A. the break: the flown fighter astern within 300 px with its nose on a skiff: the skiff heads at a right angle off the line, does not fire, for 0.7 s; then its own steering; a cool-down of 3 s
//   B. who and when: not out of range, not when the chaser is passing (nose off), not when it is ahead of the skiff; not a torpedo boat or a gunship or a brute; not the wing's fighter; not when nobody has the stick
//   C. steering only: no hit points, damage or speed changed; with nobody flying a fighter a battle is the same to the last digit with the break on or off (the cruiser bots do not change)
// Run: node tests/campbreak.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  CAMP.flags.cockpit = true;
  window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team === 'earth'); const f = campWing(C).filter(u => u.pilot)[0];
    f.x = 0; f.y = 0; f.rot = 0; f.vx = f.vy = 0; campCockpitTake(C, f.id); window.F = f; window.__kind = k => { const s = campSpawn(C, k, 150, 0); s.rot = 0; s.vx = s.vy = 0; s.team = 'alien'; s.hold = false; s.nextShot = 1e9; return s; }; return C; };
  window.__m = () => ({ move: 'circle', ang: 3.1, face: 3.1, fire: true });
`);

console.log('A. the break');
{
  g.run(`__mk(); window.S = __kind('skiff');`);
  const r = J('(() => { const m = campBreakSteer(C, S, __m()); return { ang: +m.ang.toFixed(3), face: +m.face.toFixed(3), fire: m.fire, breaks: C.breaks, until: S.tailBreak.until - C.t }; })()');
  check('the flown fighter 150 px astern with its nose on the skiff: the skiff breaks at once, heading at a right angle off the line (up or down the screen, not on along it), and does not fire', Math.abs(Math.abs(r.ang) - Math.PI / 2) < 0.01 && r.face === r.ang && r.fire === false && r.breaks === 1 && Math.abs(r.until - 700) < 1, JSON.stringify(r));
  g.run(`const dt = 1 / 30; for (let i = 0; i < 12; i++) { C.t += 1000 / 30; C.dt = dt; campBreakSteer(C, S, __m()); }`);
  check('it holds the break for 0.7 s and turns hard meanwhile (its nose is round to the side)', J('Math.abs(campWrap(S.rot)) > 0.5') && J('C.breaks') === 1);
  g.run(`for (let i = 0; i < 12; i++) { C.t += 1000 / 30; campBreakSteer(C, S, __m()); }`);
  const after = J('(() => { const m = campBreakSteer(C, S, __m()); return { ang: m.ang, fire: m.fire }; })()');
  check('after 0.7 s it steers as it did (its own m comes back untouched, firing again), and the cool-down of 3 s stops a second break at once', after.ang === 3.1 && after.fire === true && J('C.breaks') === 1);
  g.run(`for (let i = 0; i < 100; i++) { C.t += 1000 / 30; campBreakSteer(C, S, __m()); }`);
  check('and it can break again when the cool-down is over', J('(() => { C.t += 100; S.rot = 0; const m = campBreakSteer(C, S, __m()); return C.breaks; })()') === 2); // (its nose set straight again: the chaser is astern once more)
}

console.log('B. who and when');
{
  const brk = setup => { g.run(`__mk(); ${setup}`); return J('(() => { const m = campBreakSteer(C, S, __m()); return !!C.breaks && m.fire === false; })()'); };
  check('out of range (400 px): no break', brk(`window.S = __kind('skiff'); S.x = 400;`) === false);
  check('the chaser passing (its nose 1.2 rad off the skiff): no break', brk(`window.S = __kind('skiff'); F.rot = 1.2;`) === false);
  check('the flown fighter AHEAD of the skiff (not on its tail): no break', brk(`window.S = __kind('skiff'); S.rot = Math.PI;`) === false);
  check('a torpedo boat, a gunship, a brute and the cruiser never break', ['tboat', 'gunship', 'brute', 'carrier'].every(k => brk(`window.S = __kind('${k}');`) === false));
  check('the raider, the drone, the cutter and the skiff all do', ['raider', 'drone', 'cutter', 'skiff'].every(k => brk(`window.S = __kind('${k}');`) === true));
  check('a wing fighter on the skiff\'s tail does not make it break (the wing has its own dogfight moves): only the one the player flies', J(`(() => { __mk(); const S = __kind('skiff'), w = campWing(C).filter(u => u.pilot && u !== F)[0]; w.x = 0; w.y = 0; w.rot = 0; campCockpitGive(C, 'hand'); const m = campBreakSteer(C, S, __m()); return !!C.breaks; })()`) === false);
  check('with nobody flying a fighter nothing breaks', J(`(() => { __mk(); const S = __kind('skiff'); campCockpitGive(C, 'hand'); campBreakSteer(C, S, __m()); return !!C.breaks; })()`) === false);
  check('with the table off nothing breaks', J(`(() => { __mk(); const S = __kind('skiff'); CAMP.break.on = false; try { campBreakSteer(C, S, __m()); return !!C.breaks; } finally { CAMP.break.on = true; } })()`) === false);
}

console.log('C. steering only');
{
  check('no hit points, damage or speed are in the table: the break has range, cone, nose, turn, turnK, ms, cool, kinds and the pair, and nothing else', J('Object.keys(CAMP.break).sort().join()') === 'cone,cool,kinds,ms,nose,on,pair,range,turn,turnK'); // (and the pair of card space-game-chunk7-enemy-pair: its numbers are in CAMP.break.pair)
  const run = on => J(`(() => { CAMP.break.on = ${on}; const C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; campOrder(C, 'launch', '', 'key'); for (let i = 0; i < 30 * 70; i++) { C.input.thrust = i % 90 < 60 ? 1 : 0; campStep(C, 1 / 30); } CAMP.break.on = true; return { x: C.carrier.x, y: C.carrier.y, hp: C.carrier.hp, ships: C.ships.length, kills: C.kills, breaks: C.breaks | 0 }; })()`);
  const a = run(true), b = run(false);
  check('with nobody flying a fighter a battle of 70 s is the same to the last digit with the break on or off (the cruiser bots do not change), and nothing broke', JSON.stringify(a) === JSON.stringify(b) && a.breaks === 0, JSON.stringify([a, b]));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('BREAK FAIL (' + failed + ')'); process.exit(1); } else console.log('BREAK PASS');
