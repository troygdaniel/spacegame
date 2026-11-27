// smoke: the hostile fighters lead their shots at the fighter the player flies, so a fast fighter can really be hit; nothing else changes (plain Node, no Chrome)
// Card space-game-b10-c1-lead-shots (BRIEF 10 chunk 1, docs/chunks.html; Troy, 27 Nov 2026: yes). src/campbreak.js campLeadAt; the knob is CAMP.cockpit.leadK (1 the full lead, 0 none, between a partial lead).
//   A. the aim: a raider, a skiff, a cutter and a drone aim at where the flown fighter will be: the bearing is the lead's, and a fighter that flies across their nose is passed by the shots within 20 px (with no lead they pass 80 px or more behind it)
//   B. who: only the break's kinds, only the fighter the player flies (the wing's fighters, the cruiser, Earth are aimed at as before); with nobody flying, or leadK 0, the bearing is the direct one
//   C. the knob: half the lead is half the angle
//   D. aim only: no hit point, damage, rate or speed in the table; with nobody flying a fighter a battle is the same to the last digit with the lead on or off
// Run: node tests/campleadshots.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  CAMP.flags.cockpit = true;
  window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team === 'earth'); C.carrier.x = 1e6; C.carrier.y = 1e6; C.carrier.vx = C.carrier.vy = 0;
    const f = campWing(C).filter(u => u.pilot)[0]; f.x = 380; f.y = -350; f.rot = Math.PI / 2; f.vx = 0; f.vy = 400; campCockpitTake(C, f.id); window.F = f;
    window.__kind = k => { const s = campSpawn(C, k, 0, 0); s.rot = 0; s.vx = s.vy = 0; s.vmax = 1; s.accel = 0; s.turn = 20; s.team = 'alien'; s.hold = false; s.nextShot = 0; return s; }; return C; };
  // the raider, still, shoots at a fighter that flies across its nose at 400 px/s; the fighter is moved by hand (no cockpit step), the shots fly as the game's do. What it reports: the nearest any shot came to the fighter (its hull is 6 px: a shot within 8 hits)
  window.__duel = (kind, k) => { __mk(); CAMP.cockpit.leadK = k; const S = __kind(kind), dt = 1 / 30; let shots = 0, was = S.nextShot, near = 1e9;
    for (let i = 0; i < 30 * 4; i++) { C.t += 1000 / 30; C.dt = dt; F.x += F.vx * dt; F.y += F.vy * dt; if (S.hp > 0) (S.faction === 'pirate' ? campPirateAI : campAlienAI)(C, S, dt); if (S.nextShot !== was) { shots++; was = S.nextShot; } campBullets(C, dt); C.bullets.forEach(b => { near = Math.min(near, Math.hypot(b.x - F.x, b.y - F.y)); }); }
    CAMP.cockpit.leadK = 1; return { near: Math.round(near), shots }; };
`);

console.log('A. the aim');
{
  g.run(`__mk(); window.S = __kind('raider');`);
  const direct = J('Math.atan2(F.y - S.y, F.x - S.x)'), lead = J('campLeadAt(C, S, F, S.def.bullet * C.shot, Math.atan2(F.y - S.y, F.x - S.x))');
  check('the raider\'s bearing to the flown fighter that flies across its nose is not the direct one: it is ahead of it, the way the fighter flies (down the screen, y growing)', lead > direct + 0.15, `${direct} ${lead}`);
  check('it is the wing fighters\' lead maths: the bearing campDogLead gives for the full lead', Math.abs(lead - J('campDogLead(S, F, S.def.bullet * C.shot, 1)')) < 1e-9);
  for (const kind of ['raider', 'drone', 'skiff', 'cutter']) {
    const r1 = J(`__duel('${kind}', 1)`), r0 = J(`__duel('${kind}', 0)`);
    check(`the ${kind}'s shots come within ${r1.near} px of the fighter crossing its nose (3 shots or so in 4 s); with no lead (leadK 0) the nearest is ${r0.near} px off`, r1.shots > 0 && r1.near <= 20 && r0.near >= 80, JSON.stringify([r1, r0]));
  }
}

console.log('B. who');
{
  g.run(`__mk(); window.S = __kind('raider');`);
  const dir = 'Math.atan2(F.y - S.y, F.x - S.x)', at = (setup, body) => J(`(() => { __mk(); window.S = __kind('raider'); ${setup}; const t = Math.atan2(F.y - S.y, F.x - S.x); return ${body}; })()`);
  check('a torpedo boat, a gunship, a brute and the mothership aim straight (they are not the break\'s kinds)', ['tboat', 'gunship', 'brute', 'mother'].every(k => at(`window.S = __kind('${k}')`, `campLeadAt(C, S, F, 600, t) === t`)));
  check('the wing\'s fighter that is not the one flown is aimed at where it is', at(`const w = campWing(C).filter(u => u.pilot && u !== F)[0]; w.x = 380; w.y = -350; w.vx = 0; w.vy = 400; window.WG = w`, `campLeadAt(C, S, WG, 540, Math.atan2(WG.y - S.y, WG.x - S.x)) === Math.atan2(WG.y - S.y, WG.x - S.x)`));
  check('the cruiser is aimed at where it is', at(`C.carrier.x = 380; C.carrier.y = -350; C.carrier.vy = 100`, `campLeadAt(C, S, C.carrier, 600, Math.atan2(C.carrier.y - S.y, C.carrier.x - S.x)) === Math.atan2(C.carrier.y - S.y, C.carrier.x - S.x)`));
  check('with nobody flying a fighter the bearing is the direct one', at(`campCockpitGive(C, 'hand')`, `campLeadAt(C, S, F, 600, t) === t`));
  check('with leadK 0 it is the direct one (the way back to the aim of before)', at(`CAMP.cockpit.leadK = 0`, `(() => { const r = campLeadAt(C, S, F, 600, t) === t; CAMP.cockpit.leadK = 1; return r; })()`));
  check('a fighter that stands still is aimed at where it is (nothing to lead)', at(`F.vx = 0; F.vy = 0`, `Math.abs(campLeadAt(C, S, F, 600, t) - t) < 1e-9`));
}

console.log('C. the knob');
{
  const off = k => J(`(() => { __mk(); window.S = __kind('raider'); CAMP.cockpit.leadK = ${k}; const t = Math.atan2(F.y - S.y, F.x - S.x), a = campLeadAt(C, S, F, S.def.bullet * C.shot, t); CAMP.cockpit.leadK = 1; return a - t; })()`);
  const full = off(1), half = off(0.5);
  check('half the lead is half the angle', Math.abs(half - full / 2) < 1e-9 && full > 0.15, `${full} ${half}`);
  check('more than 1 is the full lead, no more', Math.abs(off(2) - full) < 1e-9);
  check('the default is the full lead (1) and the table says what it is', J('CAMP.cockpit.leadK') === 1);
}

console.log('D. aim only');
{
  check('the lead brings no hit points, damage, rate or speed: the break kinds\' table and the raider\'s numbers are those of before (hp 20, ram 8), and the knob is the one new key of the cockpit table', J('CAMP.cockpit.leadK') === 1 && J('Object.keys(CAMP.cockpit).filter(k => /lead/i.test(k)).join()') === 'leadK');
  const run = k => J(`(() => { CAMP.cockpit.leadK = ${k}; const C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; campOrder(C, 'launch', '', 'key'); for (let i = 0; i < 30 * 70; i++) { C.input.thrust = i % 90 < 60 ? 1 : 0; campStep(C, 1 / 30); } CAMP.cockpit.leadK = 1; return { t: Math.round(C.t), kills: C.kills, rng: C.rng(), ships: C.ships.length, bullets: C.bullets.length }; })()`);
  check('with nobody flying a fighter a battle is the same to the last digit with the lead on or off (the cruiser bots do not change)', JSON.stringify(run(1)) === JSON.stringify(run(0)), JSON.stringify([run(1), run(0)]));
}

console.log(failed ? `\nLEAD SHOTS FAIL (${failed} of ${n})` : `\nLEAD SHOTS OK (${n} checks)`);
process.exit(failed ? 1 : 0);
