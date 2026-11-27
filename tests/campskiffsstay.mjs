// smoke: 1.1's first two skiffs (the probe) do not break off and run until the fighter the player flies has hit one of them (card space-game-b12-c4-11-skiffs-stay; BRIEF 12 chunk 4; Troy, 27 Nov 2026: yes) (plain Node, no Chrome)
// The probe is the wave row of 1.1 at 12 percent of the road: two skiffs for the transport. A skiff runs when its hull falls under CAMP.pirate.breakHp, and the cruiser's turrets and the wing
// do that to both of them before the player's fighter has crossed the 700 px to them ("A pirate is running" about six seconds after the stick is taken). The row's `stayUntilHit` holds the
// run back: campHurt sets C.waves[i].flownHit when the flown fighter hits one of the wave's ships, and campPirateStays (src/camppirates.js) lets the pirates run from then on.
// Only the probe has the field: every other wave of 1.1 to 1.3 runs when hurt, as it did.
// Run: node tests/campskiffsstay.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`
  window.__new = () => { window.C = campNew(1, [], { seed: 5, god: true, mission: 0 }); return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__probe = () => { __new(); for (let i = 0; i < 30 * 120 && !C.waves[3].started; i++) { campStep(C, 1 / 30); C.events.length = 0; } return C.ships.filter(u => u.faction === 'pirate' && u.wave === 3 && u.hp > 0); };
  window.__still = u => { u.vmax = 0; u.accel = 0; u.nextShot = 1e12; return u; };
`);

console.log('A. which rows hold their pirates');
{
  const rows = J(`CAMP.levels[1].missions.map((m, mi) => (m.waves || []).map((w, wi) => ({ m: mi + 1, w: wi, stay: !!w.stayUntilHit, skiffs: (w.ships || {}).skiff | 0, lane: w.on && w.on.lane })))`);
  const flagged = rows.flat().filter(r => r.stay);
  check('exactly one wave row of Level 1 has stayUntilHit: 1.1\'s probe (lane 0.12, two skiffs)', flagged.length === 1 && flagged[0].m === 1 && flagged[0].lane === 0.12 && flagged[0].skiffs === 2, JSON.stringify(flagged));
  check('it is the last row of 1.1 (the waves before it keep their numbers: card space-game-b7-level1)', rows[0].length === 4 && rows[0][3].stay);
  check('no other mission of Levels 2 and 3 has the field', J(`[2, 3].every(l => CAMP.levels[l].missions.every(m => (m.waves || []).every(w => !w.stayUntilHit)) && (CAMP.levels[l].waves || []).every(w => !w.stayUntilHit))`));
}

console.log('B. the probe stays until the flown fighter has hit one of them');
{
  const ids = J(`__probe().map(u => u.id)`);
  check('the probe is two skiffs of wave 3', ids.length === 2, JSON.stringify(ids));
  const a = J(`(() => { const [p, q] = C.ships.filter(u => u.faction === 'pirate' && u.wave === 3 && u.hp > 0); __still(p); __still(q); p.hp = p.maxHp * 0.2; q.hp = q.maxHp * 0.2; campHurt(C, p, 0, 'carrier-1'); campHurt(C, q, 0, 'fighter-1'); __run(0.3); return { p: !!p.running, q: !!q.running, flown: !!C.waves[3].flownHit, say: C.runSayAt == null } })()`);
  check('both hurt under the break line by the turrets and the wing: neither runs', !a.p && !a.q && !a.flown, JSON.stringify(a));
  check('and no "A pirate is running" is said', a.say);
  const b = J(`(() => { const [p, q] = C.ships.filter(u => u.faction === 'pirate' && u.wave === 3 && u.hp > 0); C.cockpit = { id: 'fighter-9' }; campHurt(C, p, 0, 'fighter-9'); const flown = !!C.waves[3].flownHit; __run(0.3); return { flown, p: !!p.running, q: !!q.running, why: p.running && p.running.why } })()`);
  check('one hit by the fighter the player flies sets the wave\'s flag', b.flown, JSON.stringify(b));
  check('then both run, for a hurt hull, as every pirate does', b.p && b.q && b.why === 'hurt', JSON.stringify(b));
}

console.log('C. only the flown fighter counts, and only on this wave');
{
  g.run('__probe()');
  const c = J(`(() => { C.cockpit = { id: 'fighter-9' }; const [p, q] = C.ships.filter(u => u.faction === 'pirate' && u.wave === 3 && u.hp > 0); __still(p); __still(q); campHurt(C, p, 0, 'fighter-3'); campHurt(C, p, 0, 'carrier-1'); const wing = !!C.waves[3].flownHit; C.cockpit = null; campHurt(C, p, 0, 'fighter-9'); const none = !!C.waves[3].flownHit; return { wing, none } })()`);
  check('a hit by a wing fighter or the turrets does not count; nor does one with no fighter flown', !c.wing && !c.none, JSON.stringify(c));
  const d = J(`(() => { C.cockpit = { id: 'fighter-9' }; const o = campSpawn(C, 'skiff', C.carrier.x + 900, C.carrier.y); o.wave = 0; __still(o); campHurt(C, o, 0, 'fighter-9'); return { other: !!C.waves[0].flownHit, probe: !!C.waves[3].flownHit } })()`);
  check('a hit on another wave\'s ship sets that wave\'s flag, not the probe\'s', d.other && !d.probe, JSON.stringify(d));
}

console.log('D. a wave without the field runs when hurt, as before');
{
  g.run('__new()');
  const e = J(`(() => { const o = campSpawn(C, 'skiff', C.carrier.x + 900, C.carrier.y); o.wave = 0; __still(o); o.hp = o.maxHp * 0.2; __run(0.3); return { running: !!o.running, why: o.running && o.running.why } })()`);
  check('a skiff of wave 0 (the miner\'s call: no stayUntilHit) under the break line turns to run', e.running && e.why === 'hurt', JSON.stringify(e));
}

console.log('E. the probe still comes at 12 percent of the road with two skiffs, and is silent');
{
  const w = J(`(() => { const r = CAMP.levels[1].missions[0].waves[3]; return { lane: r.on.lane, ahead: r.ahead, skiff: r.ships.skiff, say: r.say || null, goal: r.goal } })()`);
  check('lane 0.12, 900 px ahead, two skiffs, goal the transport, no voiced line', w.lane === 0.12 && w.ahead === 900 && w.skiff === 2 && w.goal === 'convoy:t1' && w.say === null, JSON.stringify(w));
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
