// smoke: a pirate within 500 px of the fighter the player flies shoots at it, not at the hauler its wave names; a choice only (plain Node, no Chrome)
// Card space-game-b10-c15-tune-11 (BRIEF 10 chunk 15; Troy, 27 Nov 2026: yes). src/camppirates.js campPirateBait, asked first by campPirateTarget; the knob is CAMP.cockpit.baitR (500; 0 off).
//   A. the choice: a skiff of a wave that goes for the transport ('convoy:t1') picks the flown fighter inside 500 px and the transport outside it, and goes back to her when the fighter flies off
//   B. who and when: nobody flying, the knob at 0, a docked or dead fighter, a wing fighter that is not the flown one: it goes for the transport as it did; a torpedo boat is not asked
//   C. aim only: the fighter is shot at (it loses hull, and the transport none) with the knob on and not with it off, and the table has no hit point, damage, rate or speed for it
//   D. the sweep's rule 4: "hull lost median at least 15 percent in a fight" (and not shot down in more than half the runs), replacing "shot down in 5 to 50 percent of the runs"
// Run: node tests/campcockpitbait.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { cockpitVerdict, COCKPIT_RULE } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  CAMP.flags.cockpit = true;
  window.__mk = (fly) => { const C = window.C = campNew(1, [], { seed: 3, mission: 0 }); C.god = true; C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); for (let i = 0; i < 6 * 30; i++) campStep(C, 1 / 30); C.ships = C.ships.filter(u => u.team !== 'alien'); // the transport leaves 4 s after the arrival
    window.T = C.by['freighter-t1']; window.F = null;
    if (fly !== false) { const f = campWing(C).filter(u => u.pilot)[0]; f.x = T.x + 2500; f.y = T.y; f.vx = f.vy = 0; f.rot = Math.PI; campCockpitTake(C, f.id); window.F = f; }
    window.__pirate = (kind, dx, dy) => { const u = campSpawn(C, kind || 'skiff', F.x + dx, F.y + dy); u.goal = 'convoy:t1'; u.hold = false; u.hitBy = null; u.prey = null; return u; }; return C; };
`);

console.log('A. the choice');
{
  g.run(`__mk(); window.S = __pirate('skiff', 400, 0);`);
  check('the table: baitR is 500', J('CAMP.cockpit.baitR') === 500);
  check('a skiff of a wave that goes for the transport, with the flown fighter 400 px away, picks the fighter', J('campPirateTarget(C, S).id === F.id'));
  g.run(`S.x = F.x + 600; S.y = F.y;`);
  check('600 px away, it picks the transport', J(`campPirateTarget(C, S).id`) === 'freighter-t1');
  g.run(`S.x = F.x + 499; S.y = F.y;`);
  check('499 px: the fighter; 500 px: the transport (inside, not at, the radius)', J('campPirateTarget(C, S).id === F.id') && (g.run(`S.x = F.x + 500;`), J('campPirateTarget(C, S).id') === 'freighter-t1'));
  g.run(`S.x = F.x + 300; S.y = F.y;`); const near = J('campPirateTarget(C, S).id === F.id'); g.run(`F.x -= 1000;`);
  check('the choice is made again every tick: the fighter flies off and it goes back to the transport', near && J('campPirateTarget(C, S).id') === 'freighter-t1');
  g.run(`__mk(); window.S = __pirate('cutter', 300, 100); window.B = __pirate('brute', -300, 0);`);
  check('a cutter and a brute (the other pirate kinds) pick the fighter too', J('campPirateTarget(C, S).id === F.id && campPirateTarget(C, B).id === F.id'));
}

console.log('B. who and when');
{
  g.run(`__mk(false); window.S = campSpawn(C, 'skiff', T.x + 300, T.y); S.goal = 'convoy:t1'; S.hold = false; S.hitBy = null; S.prey = null;`);
  check('nobody flying a fighter: it goes for the transport as it did', J('campPirateTarget(C, S).id') === 'freighter-t1');
  g.run(`__mk(); window.S = __pirate('skiff', 300, 0); CAMP.cockpit.baitR = 0;`);
  check('baitR 0: it goes for the transport whatever is near', J('campPirateTarget(C, S).id') === 'freighter-t1'); g.run(`CAMP.cockpit.baitR = 500;`);
  g.run(`__mk(); window.S = __pirate('skiff', 300, 0); F.docked = true;`);
  check('a docked flown fighter is not bait', J('campPirateTarget(C, S).id') === 'freighter-t1');
  g.run(`__mk(); window.S = __pirate('skiff', 300, 0); F.hp = 0;`);
  check('a dead one is not either', J('campPirateTarget(C, S).id') === 'freighter-t1');
  g.run(`__mk(); window.S = __pirate('skiff', 300, 0); const w = campWing(C).filter(u => u.pilot && u.id !== F.id)[0]; w.x = S.x + 100; w.y = S.y; F.x = S.x + 2000;`);
  check('a wing fighter near it that is not the flown one is not bait: only the fighter the player flies', J('campPirateTarget(C, S).id') === 'freighter-t1');
  g.run(`__mk(); window.S = __pirate('tboat', 300, 0); S.boat = true;`);
  check('a torpedo boat is not asked: campPirateBait gives nothing for it', J('campPirateBait(C, S)') === null);
  g.run(`__mk(); window.S = __pirate('skiff', 300, 0); S.hitBy = F.id; S.distractedUntil = C.t + 5000;`);
  check('the fighter near wins over a ship that hit it: it is the target either way', J('campPirateTarget(C, S).id === F.id'));
}

console.log('C. aim only');
{
  const duel = (bait) => { g.run(`__mk(); CAMP.cockpit.baitR = ${bait}; window.S = __pirate('skiff', 420, 0); S.vx = S.vy = 0; window.__r = { hp0: F.hp, t0: T.hp }; for (let i = 0; i < 30 * 8; i++) { C.t += 1000 / 30; C.dt = 1 / 30; campPirateAI(C, S, 1 / 30); campBullets(C, 1 / 30); F.vx = F.vy = 0; } window.__r.hp = F.hp; window.__r.thp = T.hp; window.__r.shots = C.bullets.length;`); const r = J('window.__r'); g.run(`CAMP.cockpit.baitR = 500;`); return r; };
  const on = duel(500), off = duel(0);
  check('with the bait on the skiff shoots at the fighter 420 px away: it loses hull', on.hp < on.hp0, JSON.stringify(on));
  check('with it off the skiff, 2,500 px from the transport and with the fighter beside it, does not hit the fighter in the same 8 s (it flies off for the transport)', off.hp === off.hp0 && on.hp < on.hp0, JSON.stringify([on, off]));
  const K = J('Object.keys(CAMP.cockpit)');
  check('no hit point, damage, rate or speed of a pirate came with it: the pirates\' table rows are the numbers they had (skiff hp 16, dmg 5; cutter 36, 7; brute 90, 9)', J('CAMP.pirate.kinds.skiff.hp') === 16 && J('CAMP.pirate.kinds.skiff.dmg') === 5 && J('CAMP.pirate.kinds.cutter.hp') === 36 && J('CAMP.pirate.kinds.cutter.dmg') === 7 && J('CAMP.pirate.kinds.brute.hp') === 90 && J('CAMP.pirate.kinds.brute.dmg') === 9 && K.indexOf('baitR') >= 0 && K.indexOf('hpK') >= 0 && J('CAMP.cockpit.hpK') === 2);
}

console.log('D. the sweep\'s rule 4');
{
  const S = (won, tWin, taken) => ({ won, tWin, taken }), plain = S(100, 100, 100), F = (kills, cockKills, cockHurt, shotRuns) => Object.assign(S(100, 100, 100), { kills, cockKills, cockHurt, shotRuns });
  const fplain = F(12, null, null, null);
  check('rule 4: in a fight, a median of 15 percent of a hull lost passes, 14 fails', cockpitVerdict(fplain, F(12, 6, 15, 0), plain).hurt === 'pass' && cockpitVerdict(fplain, F(12, 6, 14, 0), plain).hurt === 'FAIL');
  check('rule 4: never shot down is no longer a failure (0 percent shot down, 20 percent of a hull lost passes)', cockpitVerdict(fplain, F(12, 6, 20, 0), plain).hurt === 'pass');
  check('rule 4: shot down in more than half the runs (shredded) still fails, whatever the hull lost: 50 percent passes, 51 fails', cockpitVerdict(fplain, F(12, 6, 90, 50), plain).hurt === 'pass' && cockpitVerdict(fplain, F(12, 6, 90, 51), plain).hurt === 'FAIL');
  check('rule 4 judges only a fight: plain with under 5 kills gives n/a', cockpitVerdict(F(4, null, null, null), F(4, 0, 0, 0), plain).hurt === 'n/a');
  check('the numbers: hurtMin 15, shotMax 50, a fight is 5 kills, a quarter of plain\'s kills; shotMin is gone', COCKPIT_RULE.hurtMin === 15 && COCKPIT_RULE.shotMax === 50 && COCKPIT_RULE.minFight === 5 && COCKPIT_RULE.killsShare === 0.25 && COCKPIT_RULE.shotMin === undefined);
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
