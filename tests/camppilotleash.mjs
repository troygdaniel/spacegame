// smoke: a pilot that chases a runner breaks off past a leash from what it guards and comes back; a named foe that still fights is kept after (plain Node, no Chrome)
// Card space-game-pilot-chase-leash (Troy, 24 Nov 2026; found on space-game-12-keys-lose-miners: a pilot followed a pirate that had broken off 10 to 17 km from Ceres, and the next raid killed the miners).
// The rule is in campWingAI (src/campaign.js), the number CAMP.flight.leash (3,000 px; 0 is no leash), the N panel row `pilotleash`.
//   A. the number and its row
//   B. a pilot guarding the cruiser, a runner 3,500 px out: it breaks off and flies back; inside the leash it still gives chase; with the leash at 0 it follows (the old game)
//   C. an attack order: on a foe that still fights (named or picked) the pilot keeps after it, however far; on a runner it breaks off, the order is over (guard), and the pilot comes back
//   D. a pilot told to guard a ship (a miner) is measured from that ship, not from the cruiser
//   E. the wiring: only the pilots' AI has it (the cruiser is the player's to fly), no new radio line
// Run: node tests/camppilotleash.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
// a battle with the pilots out; the stage: the cruiser at the origin, a pilot at (px, 0), a pirate (a runner or not) at (fx, 0), no other alien; steps of the pilot's own AI
g.run(`window.__stage = (px, fx, running, order, leash) => { CAMP.flight.leash = leash == null ? 3000 : leash; const C = campNew(1, [], { seed: 1, mission: 1 }); campStep(C, 0.05);
  C.ships.filter(u => u.team === 'alien' || (u.team === 'neutral' && u.kind === 'patrol')).forEach(u => { u.hp = 0; }); const c = C.carrier; c.x = 0; c.y = 0; c.vx = 0; c.vy = 0;
  const ps = C.ships.filter(u => u.pilot && u.hp > 0); ps.slice(1).forEach(u => { u.x = 0; u.y = 200; u.hp = 0; }); const p = ps[0]; p.x = px; p.y = 0; p.vx = 0; p.vy = 0; p.rot = 0;
  const f = campSpawn(C, 'skiff', fx, 0); f.vx = 0; f.vy = 0; if (running) f.running = { since: C.t, why: 'hurt' }; f.hold = false; f.vmax = 0; f.vmax0 = 0; f.accel = 0;
  p.order = typeof order === 'function' ? order(C, p, f) : order || { type: 'guard', at: { kind: 'carrier' } }; C.stage = { p, f, c }; return C; };
  window.__go = (C, steps) => { const { p, f, c } = C.stage, d0 = [Math.hypot(p.x - c.x, p.y - c.y), Math.hypot(p.x - f.x, p.y - f.y)]; for (let i = 0; i < steps; i++) { f.x = C.stage.fx0 != null ? C.stage.fx0 : f.x; campWingAI(C, p, 1 / 30); } return { toCruiser: Math.round(Math.hypot(p.x - c.x, p.y - c.y) - d0[0]), toFoe: Math.round(Math.hypot(p.x - f.x, p.y - f.y) - d0[1]), order: p.order && p.order.type }; };`);

console.log('A. the number and its row');
{
  g.run('CAMP.flight.leash = 3000');
  const r = J('(() => { const w = campTuneRow("pilotleash"); return w && { root: w.root, path: w.path, d: campTuneDefault("pilotleash"), min: w.min, max: w.max, when: w.when, label: campTuneLabel(w) }; })()');
  check('CAMP.flight.leash is 3,000 px, and the N panel has its row (0 to 10,000, felt at once, with its words)', J('CAMP.flight.leash') === 3000 && r && r.path === 'flight.leash' && r.d === 3000 && r.min === 0 && r.max === 10000 && r.when === 'now' && !/^camp\./.test(r.label), JSON.stringify(r));
}

console.log('B. a pilot guarding the cruiser, after a runner');
{
  const out = J('(() => { const C = __stage(3500, 3800, true); return __go(C, 90); })()');
  check('a runner 300 px beyond a pilot that is 3,500 px from the cruiser: it breaks off and comes back (nearer the cruiser, farther from the foe)', out.toCruiser < -100 && out.toFoe > 100, JSON.stringify(out));
  const near = J('(() => { const C = __stage(2000, 2300, true); return __go(C, 90); })()');
  check('inside the leash (2,000 px out) it still gives chase: it flies out after the runner (farther from the cruiser)', near.toCruiser > 100, JSON.stringify(near));
  const old = J('(() => { const C = __stage(3500, 3800, true, null, 0); const r = __go(C, 90); CAMP.flight.leash = 3000; return r; })()');
  check('with the leash at 0 (no leash, the old game) it follows the runner out (farther from the cruiser)', old.toCruiser > 100, JSON.stringify(old));
}

console.log('C. an attack order');
{
  const named = J('(() => { const C = __stage(3500, 3800, false, (C, p, f) => ({ type: "attack", target: f.id })); return __go(C, 90); })()');
  check('a named foe that is still fighting (not running) is kept after, 3,500 px from the cruiser: it flies on out after it and the order stays an attack', named.toCruiser > 100 && named.order === 'attack', JSON.stringify(named));
  const run = J('(() => { const C = __stage(3500, 3800, true, (C, p, f) => ({ type: "attack", target: f.id })); return __go(C, 90); })()');
  check('the same order on a runner: it breaks off and comes back, and the order is over (guard), so it does not go out again', run.toCruiser < -100 && run.toFoe > 100 && run.order === 'guard', JSON.stringify(run));
  const picked = J('(() => { const C = __stage(3500, 3800, false, { type: "attack" }); return __go(C, 90); })()');
  check('an attack order with no named foe (the pilot picks the nearest) that is still fighting is kept too: the pilots sent at the pirates on a miner 3,000 px from the cruiser do not turn back', picked.toCruiser > 100 && picked.order === 'attack', JSON.stringify(picked));
  const pickedRun = J('(() => { const C = __stage(3500, 3800, true, { type: "attack" }); return __go(C, 90); })()');
  check('and an attack order with no named foe whose foe has broken off is on the leash: it breaks off and the order is over', pickedRun.toCruiser < -100 && pickedRun.order === 'guard', JSON.stringify(pickedRun));
  const noGuardLeash = J('(() => { const C = __stage(3500, 3800, false); return __go(C, 90); })()');
  check('a GUARD pilot after a foe that is still fighting, picked by itself, 3,500 px from what it guards: the leash brings it back (it is acting by itself)', noGuardLeash.toCruiser < -100, JSON.stringify(noGuardLeash));
}

console.log('D. a pilot told to guard a ship is measured from that ship');
{
  g.run('CAMP.flight.leash = 3000');
  const r = J(`(() => { const C = __stage(0, 100, true); const { p, f, c } = C.stage; f.x = 3300; const m = C.ships.find(u => u.team === 'neutral' && u.kind === 'miner' && u.hp > 0); if (!m) return 'no miner'; m.x = -3500; m.y = 0; p.x = 0; p.y = 0; p.order = { type: 'guard', at: { kind: 'ship', id: m.id } }; const d0 = Math.hypot(p.x - m.x, p.y - m.y); for (let i = 0; i < 90; i++) campWingAI(C, p, 1 / 30); return { fromMiner: Math.round(Math.hypot(p.x - m.x, p.y - m.y) - d0), toFoe: Math.round(Math.hypot(p.x - f.x, p.y - f.y) - 3300) }; })()`);
  check('a pilot 3,500 px from the miner it guards, 100 px from the cruiser, with a runner near: it does not chase it, it flies back to the miner', r && r !== 'no miner' && r.fromMiner < -100 && r.toFoe >= 0, JSON.stringify(r));
}

console.log('E. the wiring');
{
  const src = readFileSync(ROOT + '/src/campaign.js', 'utf8'), a = src.indexOf('function campWingAI('), b = src.indexOf('\nfunction ', a + 10);
  const ai = src.slice(a, b);
  check('the leash is in the pilots\' AI (campWingAI) only: guard and attack orders, from the guarded thing, no radio line', /CAMP\.flight\.leash/.test(ai) && /o\.type === 'guard' \|\| \(o\.type === 'attack' && foe\.running\)/.test(ai) && !/campSay/.test(ai.slice(ai.indexOf('THE LEASH'), ai.indexOf('THE LEASH') + 700)));
  check('the cruiser\'s own movement does not read it (the player flies it)', !/flight\.leash/.test(src.slice(src.indexOf('function campCarrierStep') >= 0 ? src.indexOf('function campCarrierStep') : 0, src.indexOf('function campCarrierStep') >= 0 ? src.indexOf('function campCarrierStep') + 4000 : 0)));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PILOT LEASH FAIL (${failed} of ${n})` : `PILOT LEASH PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
