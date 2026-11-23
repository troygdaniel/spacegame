// smoke: the Campaign's FIGHT PACE (card space-game-slower-fights; Troy, 22 Nov 2026: "slow the pace of the fights down so I can enjoy it"), in plain Node, no Chrome.
// A small ship flies and fires slower WHILE a foe is near it; away from every foe it flies as it did, so a trip, an approach and the missions' clocks are the same. The N panel's row Fight pace is the number.
//   A. the table and the row: CAMP.pace.fight 0.75 (a quarter slower), the distances it eases in over, the N row (group time, felt at once, its words), the number is the row's default
//   B. the rule: a foe inside the near distance is the whole of it, beyond the far one nothing of it, between them it eases; the share is on the speed, the acceleration, the turn and the gap between shots
//   C. travel is as it was: a ship with no foe near flies exactly the pace's own numbers (the escort that flies a long road is as quick as before); a pace NUMBER (the sims' and the tests') has no fight pace at all
//   D. the row is live: Fight pace 1 puts every ship back at the pace, 0.5 slows them further, and Backspace (reset) puts it back to 0.75
//   E. the guns: the gap between a small ship's shots is longer by the same share (the wing's, the aliens', the pirates', the rival's, the torpedo boats' tubes); the carrier, the towers and the mothership are not
//   F. the balance: the plain bot still wins 1.1, 2.1 and 3.3 at Normal with it on, a player who does nothing still does not win; Level 1's missions stay about five to six minutes
// Run: node tests/campfightpace.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { run as botRun, setPace, techsFor } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// a battle of level 2 with only the carrier in it, and a pair of ships far from it: ship A at the origin of the pair, the foe `d` px away; both at the far side of the world, so nothing else is near
g.run(`window.__pair = (pace, d, kinds) => { const C = campNew(2, [], { seed: 5, pace }); C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = {}; C.ships.forEach(u => { C.by[u.id] = u; });
  const x = C.carrier.x + 30000, y = C.carrier.y + 30000, a = campSpawn(C, kinds[0], x, y), b = campSpawn(C, kinds[1], x + d, y); C.ships.push(a, b); C.by[a.id] = a; C.by[b.id] = b; C.fightAt = 0; return { C, a, b }; };
  window.__look = (C) => { C.t += 300; campFightPace(C); };`);
const look = (pace, d, kinds, prop) => J(`(() => { const P = __pair(${JSON.stringify(pace)}, ${d}, ${JSON.stringify(kinds)}); __look(P.C); return [P.a.${prop}, P.a.base.${prop}, P.b.${prop}, P.b.base.${prop}, P.a.fp || 1, P.b.fp || 1]; })()`);

console.log('A. the table and the row');
check('CAMP.pace.fight is 0.75 (a quarter slower), eased in between 1,000 and 2,200 px, looked at every 200 ms', J('[CAMP.pace.fight, CAMP.pace.engage.join(), CAMP.pace.every]').join() === '0.75,1000,2200,200');
check('the pace itself is as it was: Normal 0.72, the scale 1 (the old Battle pace row is untouched)', J('[CAMP.pace.modes.find(m => m.id === "normal").mult, CAMP.pace.scale, CAMP.pace.start]').join() === '0.72,1,normal');
check('the N panel has the row Fight pace: group time, felt at once, on CAMP.pace.fight, from 0.3 to 1.5 by 0.05, its default 0.75, its words not a missing key', J('(() => { const r = campTuneRow("fightpace"); return [r.group, r.when, r.root, r.path, r.min, r.max, r.step, campTuneDefault("fightpace"), /^camp\\./.test(campTuneLabel(r))].join(); })()') === 'time,now,CAMP,pace.fight,0.3,1.5,0.05,0.75,false');
check('its words say what it is: "Fight pace", and 1 is as fast as travel', /Fight pace/.test(J('campTuneLabel(campTuneRow("fightpace"))')) && /travel/.test(J('campTuneLabel(campTuneRow("fightpace"))')));
check('the row sits beside Battle pace in the time group', J('campTuneRows("time").map(r => r.id).join()').startsWith('pace,fightpace,'));

console.log('B. the rule');
{
  const fp = d => look('normal', d, ['raider', 'fighter'], 'vmax');
  const near0 = fp(500), mid = fp(1600), far = fp(3500), edgeIn = fp(1000), edgeOut = fp(2200);
  check('a foe within 1,000 px: both ships fly at 0.75 of the pace (0.72): top speed base x 0.72 x 0.75', near(near0[0], near0[1] * 0.72 * 0.75) && near(near0[2], near0[3] * 0.72 * 0.75) && near0[4] === 0.75 && near0[5] === 0.75, near0.join());
  check('a foe beyond 2,200 px: the pace as it was, base x 0.72, not slowed', near(far[0], far[1] * 0.72) && near(far[2], far[3] * 0.72) && far[4] === 1 && far[5] === 1, far.join());
  check('between them it eases (at 1,600 px, halfway: 0.875), so a ship never snaps from one to the other', near(mid[4], 0.875, 1e-9) && near(mid[0], mid[1] * 0.72 * 0.875), mid.join());
  check('the ends are exact (1,000 px is the whole of it, 2,200 px none)', edgeIn[4] === 0.75 && edgeOut[4] === 1);
  const acc = look('normal', 500, ['raider', 'fighter'], 'accel'), trn = look('normal', 500, ['raider', 'fighter'], 'turn');
  check('acceleration and turn rate take the same share', near(acc[0], acc[1] * 0.72 * 0.75) && near(acc[2], acc[3] * 0.72 * 0.75) && near(trn[0], trn[1] * 0.72 * 0.75) && near(trn[2], trn[3] * 0.72 * 0.75), acc.join() + ' / ' + trn.join());
  check('the shape pirateSteer reads (its speed and its max) follows, so the ring and the lean of a raider use the slower numbers', J('(() => { const P = __pair("normal", 500, ["raider", "fighter"]); __look(P.C); return [P.a.def.max / P.a.base.def.max, P.a.def.speed / P.a.base.def.speed]; })()').every(v => near(v, 0.72 * 0.75)));
  check('only foes count: two ships of one side close together are not in a fight (no foe within 3,000 px, both at the pace)', J('(() => { const P = __pair("normal", 100, ["fighter", "fighter"]); __look(P.C); return [P.a.fp || 1, P.b.fp || 1]; })()').join() === '1,1');
  check('the aliens\' foes are everything that is not an alien: a raider and a freighter close together is a fight for the raider', J('(() => { const P = __pair("normal", 300, ["raider", "freighter"]); __look(P.C); return [P.a.fp, P.b.fp === undefined]; })()').join() === '0.75,true');
  check('a ship with no pace base (the carrier, a freighter, a tower, the mothership) is never slowed', J('(() => { const P = __pair("normal", 300, ["tower", "fighter"]); P.C.ships.push(campSpawn(P.C, "mother", P.a.x + 200, P.a.y)); __look(P.C); const c = P.C.carrier; return [P.C.ships.filter(u => !u.base).every(u => u.fp === undefined), c.vmax === CAMP.carrier.speed, P.C.ships.find(u => u.kind === "mother").vmax]; })()').slice(0, 2).join() === 'true,true');
}

check('a runner (a pirate that has broken off) keeps its run speed (CAMP.pirate.run times), through every look: the fight pace does not hold it back', J('(() => { const P = __pair("normal", 500, ["skiff", "fighter"]); __look(P.C); campPirateBreakOne(P.C, P.a, "hurt"); const b = P.a.base, K = CAMP.pirate.run, ok1 = Math.abs(P.a.vmax - b.vmax * 0.72 * 0.75 * K) < 1e-9; P.b.x += 1500; P.C.t += 300; campFightPace(P.C); return [ok1, Math.abs(P.a.vmax - b.vmax * 0.72 * P.a.fp * K) < 1e-9, Math.abs(P.a.accel - b.accel * 0.72 * P.a.fp * K) < 1e-9, P.a.fp > 0.75, K > 1]; })()').join() === 'true,true,true,true,true');
console.log('C. travel is as it was');
check('a lone escort with no foe flies at the pace\'s numbers, after any number of looks: base x 0.72, fp 1', J('(() => { const C = campNew(2, [], { seed: 5, pace: "normal" }); C.ships = C.ships.filter(u => u.kind === "carrier"); const e = campSpawn(C, "escort", C.carrier.x + 30000, C.carrier.y); C.ships.push(e); for (let i = 0; i < 20; i++) { C.t += 250; campFightPace(C); } return [e.vmax / e.base.vmax, e.fp || 1]; })()').join() === '0.72,1');
check('the same trip, ten seconds on its way, is the same distance with the fight pace at 0.75 and at 1 (the escort\'s road is not longer)', J(`(() => { const trip = f => { CAMP.pace.fight = f; const C = campNew(2, [], { seed: 5, pace: 'normal' }); C.ships = C.ships.filter(u => u.kind === 'carrier'); const e = campSpawn(C, 'escort', C.carrier.x + 30000, C.carrier.y); C.ships.push(e); C.by[e.id] = e; e.order = { type: 'goto', at: { kind: 'point', x: e.x + 9000, y: e.y } }; const x0 = e.x; for (let i = 0; i < 300; i++) campStep(C, 1 / 30); return Math.round(e.x - x0); }; const a = trip(0.75), b = trip(1); CAMP.pace.fight = 0.75; return a === b; })()`) === true);
check('a pace NUMBER (1, or none: the table\'s own numbers, what the sims and the tests use) has no fight pace: fightOn is false and no ship gets a share', J('(() => { const r = []; [1, undefined, 0.5].forEach(p => { const P = __pair(p, 500, ["raider", "fighter"]); __look(P.C); r.push(P.C.fightOn + ":" + (P.a.fp === undefined) + ":" + (P.b.fp === undefined)); }); return r; })()').join() === 'false:true:true,false:true:true,false:true:true');
check('a pace MODE has it (Calm, Normal and Brisk all)', J('["calm", "normal", "brisk"].map(m => { const P = __pair(m, 500, ["raider", "fighter"]); __look(P.C); return P.C.fightOn + ":" + P.a.fp; })').join() === 'true:0.75,true:0.75,true:0.75');
check('campPaceSet changes the mode of a battle on and off (a number turns the fight pace off, a mode on)', J('(() => { const P = __pair("normal", 500, ["raider", "fighter"]); const C = P.C; campPaceSet(C, 1); const a = C.fightOn; campPaceSet(C, "brisk"); return [a, C.fightOn]; })()').join() === 'false,true');

console.log('D. the row is live');
check('Fight pace 1 puts the ships back at the pace at the next look; 0.5 slows them further; reset puts 0.75 back', J(`(() => { const P = __pair('normal', 500, ['raider', 'fighter']); const C = P.C, v = () => { C.t += 300; campFightPace(C); return Math.round(P.a.vmax / P.a.base.vmax * 1000) / 1000; }; const a = v(); campTuneSet('fightpace', 1); const b = v(); campTuneSet('fightpace', 0.5); const c = v(); campTuneReset('fightpace'); const d = v(); campTuneResetAll(); return [a, b, c, d]; })()`).join() === '0.54,0.72,0.36,0.54');
check('the number is read live (no copy in the battle): a battle made before the change feels it, and the defaults never move', J('[CAMP.pace.fight, campTuneCount()]').join() === '0.75,0');

console.log('E. the guns');
check('campFightGap: the gap between shots is longer by 1 / share (1,000 ms at 0.75 is 1,333); a ship with no share has the gap as it was', near(J('campFightGap({ fp: 0.75 }, 1000)'), 1333.3333333, 1e-3) && J('campFightGap({}, 1000)') === 1000 && J('campFightGap({ fp: 1 }, 700)') === 700);
{
  const code = ['src/campaign.js', 'src/camppirates.js', 'src/camprival.js', 'src/camptorpedo.js'].map(src).join('\n');
  check('every small ship\'s gun reads it: the aliens\', the wing\'s, the pirates\', the rival\'s and the torpedo boats\' tubes', (code.match(/campFightGap\(u, /g) || []).length >= 5, (code.match(/campFightGap\(u, /g) || []).length);
  check('the carrier\'s turrets, the towers and the mothership do not (their gaps have no campFightGap)', !/campFightGap\(u, campBetween\(C, k\.delay\[0\], k\.delay\[1\]\)\);? ?campBullet\(C, u, u\.rot, k\.bullet, k\.damage \* C\.dmgS, 1900/.test(code) && !/campMotherAI[\s\S]{0,700}campFightGap/.test(code));
  check('a fighter near a raider waits longer between shots than one far from every foe (the same seed): its next shot is later by 1 / 0.75', J(`(() => { const gap = d => { const P = __pair('normal', d, ['raider', 'fighter']); __look(P.C); const f = P.b, a = P.a, ang = Math.atan2(a.y - f.y, a.x - f.x); f.rot = ang; f.nextShot = 0; const t0 = P.C.t; const fired = campWingFire(P.C, f, CAMP.fighter, a, 100, ang, true); return [fired, f.nextShot - t0]; }; const n = gap(500), f = gap(5000); return [n[0], f[0], Math.round(n[1] / f[1] * 1000) / 1000]; })()`).join() === 'true,true,1.333');
}

console.log('F. the balance (the plain bot, niced runs: few seeds)');
setPace('normal');
const lvlTechs = lv => techsFor(lv, null);
for (const [lv, ms, tmin, tmax] of [[1, 0, 280, 360], [2, 0, 20, 130], [3, 2, 40, 140]]) {
  const rs = [1, 2, 3].map(seed => botRun(lv, seed, 'plain', 'steady', lvlTechs(lv), 420, ms));
  const won = rs.filter(r => r.result === 'won'), ts = won.map(r => r.t).sort((a, b) => a - b), med = ts[Math.floor((ts.length - 1) / 2)];
  check(`the plain bot wins ${lv}.${ms + 1} at Normal in ${tmin} to ${tmax} s (3 seeds)`, won.length >= 2 && med >= tmin && med <= tmax, rs.map(r => r.result + ':' + r.t).join(' '));
}
{
  const idle = botRun(1, 1, 'idle', 'steady', lvlTechs(1), 420, 0), idle2 = botRun(2, 1, 'idle', 'steady', lvlTechs(2), 420, 2);
  check('a player who does nothing does not win (1.1 is lost, 2.3 is lost)', idle.result !== 'won' && idle2.result !== 'won', idle.result + ' ' + idle2.result);
}

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nAll ${n} checks passed.`);
process.exit(failed ? 1 : 0);
