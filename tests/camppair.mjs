// smoke: when a hostile fighter breaks off the flown fighter's nose, the nearest other hostile fighter comes round behind the chaser, then goes on as it was (plain Node, no Chrome)
// Card space-game-chunk7-enemy-pair (Troy, 26 Nov 2026; brief 8 proposal A, second behaviour; built on the break of card space-game-chunk6-enemy-break, src/campbreak.js; the numbers are CAMP.break.pair).
//   A. the pair: a second skiff 300 px from the one that breaks is sent round: it flies to a point 220 px dead astern of the flown fighter, does not fire, and is back to its own steering within 2.5 s or when it is there
//   B. who: only a hostile fighter within 500 px, not one that is breaking itself or was sent round lately (4 s), not a gunship or a torpedo boat; none when nobody flies a fighter; nothing changes with the table off
// Run: node tests/camppair.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  CAMP.flags.cockpit = true;
  window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team === 'earth'); const f = campWing(C).filter(u => u.pilot)[0];
    f.x = 0; f.y = 0; f.rot = 0; f.vx = f.vy = 0; campCockpitTake(C, f.id); window.F = f;
    window.__kind = (k, x, y) => { const s = campSpawn(C, k, x, y); s.rot = 0; s.vx = s.vy = 0; s.team = 'alien'; s.hold = false; s.nextShot = 1e9; return s; };
    window.S = __kind('skiff', 150, 0); return C; };
  window.__m = () => ({ move: 'circle', ang: 3.1, face: 3.1, fire: true });
`);

console.log('A. the pair');
{
  g.run(`__mk(); window.P = __kind('raider', 150, 300); campBreakSteer(C, S, __m());`);
  check('the skiff breaks and its partner, a raider 300 px off, is sent round: one break, one flank', J('C.breaks') === 1 && J('C.flanks') === 1 && J('!!P.flank && P.flank.f === F.id'));
  const m = J('(() => { const m = campBreakSteer(C, P, __m()); const a = Math.atan2(0 - P.y, -220 - P.x); return { fire: m.fire, ang: +m.ang.toFixed(3), want: +a.toFixed(3) }; })()');
  check('the partner heads for the point 220 px dead astern of the chaser (the chaser\'s six o\'clock) and does not fire', m.fire === false && Math.abs(m.ang - m.want) < 0.01, JSON.stringify(m));
  g.run(`P.x = -200; P.y = 20;`);
  const near = J('(() => { const m = campBreakSteer(C, P, __m()); return { ang: m.ang, fire: m.fire, until: P.flank.until <= C.t }; })()');
  check('within 140 px of the point it has come round: it goes on as it was (its own steering back, firing again)', near.ang === 3.1 && near.fire === true && near.until === true, JSON.stringify(near));
  g.run(`__mk(); window.P = __kind('raider', 150, 300); campBreakSteer(C, S, __m()); C.t += 2600;`);
  check('and it gives up after 2.5 s even if it never got there', J('(() => { const m = campBreakSteer(C, P, __m()); return m.ang === 3.1 && m.fire === true; })()'));
}

console.log('B. who');
{
  const flank = setup => { g.run(`__mk(); ${setup}; campBreakSteer(C, S, __m());`); return J('C.flanks | 0'); };
  check('no partner near (700 px away): none is sent round, the skiff still breaks', flank(`window.P = __kind('raider', 150, 700)`) === 0 && J('C.breaks') === 1);
  check('a gunship, a torpedo boat and a brute are no partners', ['gunship', 'tboat', 'brute'].every(k => flank(`window.P = __kind('${k}', 150, 300)`) === 0));
  check('a partner that is breaking itself is not sent round', flank(`window.P = __kind('raider', 150, 300); P.tailBreak = { until: C.t + 500, cool: C.t + 3500, h: 1 }`) === 0);
  check('a partner sent round a moment ago is not sent again within 4 s of the end', flank(`window.P = __kind('raider', 150, 300); P.flank = { until: C.t - 100, cool: C.t + 3900, f: F.id }`) === 0);
  check('the nearest of two is the one: a raider 200 px off beats a drone 400 px off', (() => { g.run(`__mk(); window.P = __kind('raider', 150, 200); window.Q = __kind('drone', 150, 400); campBreakSteer(C, S, __m());`); return J('!!P.flank && !Q.flank'); })());
  check('nobody flying a fighter: nothing breaks and nobody comes round', J(`(() => { __mk(); const P = __kind('raider', 150, 300); campCockpitGive(C, 'hand'); campBreakSteer(C, S, __m()); return (C.breaks | 0) + (C.flanks | 0); })()`) === 0);
  check('with the table off nothing does either', J(`(() => { __mk(); const P = __kind('raider', 150, 300); CAMP.break.on = false; try { campBreakSteer(C, S, __m()); return (C.breaks | 0) + (C.flanks | 0); } finally { CAMP.break.on = true; } })()`) === 0);
  check('steering only: the pair\'s table has range, ms, behind, reach and cool, and nothing else', J('Object.keys(CAMP.break.pair).sort().join()') === 'behind,cool,ms,range,reach');
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('PAIR FAIL (' + failed + ')'); process.exit(1); } else console.log('PAIR PASS');
