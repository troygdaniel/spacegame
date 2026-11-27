// smoke: the Campaign's BATTLE PACE (card space-game-campaign-pace; Troy, 20 Nov 2026), in plain Node, no Chrome.
// The small ships' fights were a bit fast: CAMP.pace scales the small ships' top speed, acceleration and turn, and their shots by its square root; nothing else.
//   A. the table: Calm 0.6, Normal 0.72, Brisk 0.85 (15 percent under the 0.7, 0.85 and 1 they were: card space-game-command-slowtime; the pace stays, the command time of that card is gone), the default, the shot power; there is no key
//   B. a battle with no pace, or with the number 1, is the table's own numbers, bit for bit (what the pins and the bots use); Brisk is no longer that: it is 0.85 of them
//   C. the scaling: the five small kinds by the multiplier, the shots by its square root, the carrier, mothership, towers, haulers, turrets and Fast not at all; a change in play and back is exact
//   D. the one pace: the Campaign scene makes every battle at Normal (CAMP.pace.start); there is no key for it (card one-list-keys), no setting, no Settings > Game, no campace.js (there is no command time either: card space-game-no-command-slowdown); campNew's opts.pace still takes a mode, for the tests, the bots and the sims
//   E. the balance: a plain bot wins every mission at Normal and Calm (levels 2 and 3 in about one to two minutes, the rim run of level 1 in four to seven), a player who does nothing never wins
// Run: node tests/camppace.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';
import { run as botRun, setPace, techsFor } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ---- A. the table
check('CAMP.pace: Calm 0.6, Normal 0.72, Brisk 0.85; the default is Normal; shots go by the square root; there is no key', J('CAMP.pace.modes.map(m => m.id + ":" + m.mult).join()') === 'calm:0.6,normal:0.72,brisk:0.85' && J('CAMP.pace.start') === 'normal' && J('CAMP.pace.shots') === 0.5 && J('"key" in CAMP.pace') === false);
check('campPaceMult: an id, a number, nothing (1) or nonsense (1)', J('[campPaceMult("calm"), campPaceMult("normal"), campPaceMult("brisk"), campPaceMult(0.5), campPaceMult(), campPaceMult("fast"), campPaceMult(-1), campPaceMult(NaN)]').join() === '0.6,0.72,0.85,0.5,1,1,1,1');

// ---- B. no pace is the table's numbers
g.run(`window.__sig = pace => {
  const out = [];
  for (const [lv, mi, seed] of [[1, 0, 3], [1, 1, 5], [2, 2, 7], [3, 1, 2]]) {
    const C = campNew(lv, [], Object.assign({ seed, mission: mi }, pace === undefined ? {} : { pace }));
    for (let i = 0; i < 30 * 70 && !C.result; i++) {
      const s = i / 30;
      if (i === 30) campOrder(C, 'launch');
      if (i > 300 && i % 150 === 0) campOrder(C, 'attack', '');
      C.input.thrust = 1; C.input.turn = Math.sin(s * 0.7) * 0.6; C.input.fire = true;
      campStep(C, 1 / 30); C.events.length = 0;
    }
    out.push(JSON.stringify(C.ships.map(u => [u.id, u.x, u.y, u.vx, u.vy, u.rot, u.hp])) + '|' + C.bullets.length + '|' + C.t + '|' + (C.result || '') + '|' + C.kills);
  }
  return out.join('\\n');
};`);
const sNone = J('__sig()'), sBrisk = J('__sig("brisk")'), sOne = J('__sig(1)'), sNormal = J('__sig("normal")');
check('four seeded battles of 70 s with no pace and with 1 are the same battles to the last digit (the sim with no pace is the sim as it was: the pins and the bots)', sNone === sOne && sNone.length > 2000);
check('and Brisk (0.85) and Normal (0.72) are different battles (the pace does something), each from the other', sBrisk !== sNone && sNormal !== sNone && sBrisk !== sNormal);
check('with no pace (1) the ships carry the table\'s own numbers: a fighter, a raider, a drone and a gunship; the shape pirateSteer reads is the pirates\' own row', J(`(() => { const C = campNew(11, [], { seed: 1, pace: 1 }); const ok = []; ['fighter'].forEach(k => { const u = campSpawn(C, k, 0, 0); ok.push(u.vmax === CAMP[k].speed && u.accel === CAMP[k].accel && u.turn === CAMP[k].turn); }); ['raider', 'drone', 'gunship'].forEach(k => { const u = campSpawn(C, k, 0, 0); ok.push(u.vmax === PIRATES[k].max && u.accel === PIRATES[k].speed && u.turn === PIRATES[k].turn * 60 && u.def === PIRATES[k]); }); return ok.every(Boolean) && C.pace === 1 && C.shot === 1; })()`));

// ---- C. the scaling
const kinds = ['fighter', 'raider', 'drone', 'gunship'];
check('Calm: the four small kinds have 0.6 of the table\'s top speed, acceleration and turn, and their steering shape the same', J(`(() => { const C = campNew(11, [], { seed: 1, pace: "calm" }); return ${JSON.stringify(kinds)}.every(k => { const u = campSpawn(C, k, 0, 0), t = k === 'fighter' ? CAMP[k] : null, d = PIRATES[k]; const vmax = t ? t.speed : d.max, acc = t ? t.accel : d.speed, turn = t ? t.turn : d.turn * 60; return u.vmax === vmax * 0.6 && u.accel === acc * 0.6 && u.turn === turn * 0.6 && u.def.max === vmax * 0.6 && u.def.speed === acc * 0.6 && u.hp === (t ? t.hp * (u.str || 1) : d.hp * CAMP.alien.hpScale); }); })()`));
check('Normal: 0.72 of each, hull points the same as the table\'s (hull and damage are not touched)', J(`(() => { const C = campNew(11, [], { seed: 1, pace: "normal" }), B = campNew(11, [], { seed: 1, pace: 1 }); return ${JSON.stringify(kinds)}.every(k => { const u = campSpawn(C, k, 0, 0), v = campSpawn(B, k, 0, 0); return u.vmax === v.vmax * 0.72 && u.accel === v.accel * 0.72 && u.turn === v.turn * 0.72 && u.hp === v.hp && u.r === v.r; }); })()`));
check('not scaled at Calm: the carrier, the mothership, a tower, a hauler (all the table\'s numbers)', J(`(() => { const C = campNew(11, [], { seed: 1, pace: "calm" }), c = C.carrier, m = campSpawn(C, 'mother', 0, 0), t = campSpawn(C, 'tower', 0, 0), f = campSpawn(C, 'freighter', 0, 0); return c.vmax === CAMP.carrier.speed && c.accel === CAMP.carrier.accel && c.turn === CAMP.carrier.turn && m.vmax === CAMP.mother.speed && m.accel === 200 && m.turn === 0.5 && t.vmax === 0 && f.vmax === CAMP.convoy.speed && f.accel === 400 && !c.base && !m.base && !t.base && !f.base; })()`));
check('Fast, the trip and the warp do not read the pace: no pace in the autopilot or the warp files, and the carrier\'s Fast burn is the same at Calm as with no pace', !/\.pace\b|campPace/.test(src('src/campnav.js')) && !/\.pace\b|campPace/.test(src('src/campwarp.js')) && J(`(() => { const a = campNew(11, [], { seed: 1, pace: "calm" }), b = campNew(11, [], { seed: 1, pace: 1 }); campNavGo(a, campNavGoal(a), true); campNavGo(b, campNavGoal(b), true); for (let i = 0; i < 150; i++) { campStep(a, 1 / 30); campStep(b, 1 / 30); } return a.carrier.x === b.carrier.x && a.carrier.y === b.carrier.y && a.carrier.vx === b.carrier.vx && Math.hypot(a.carrier.x - 130, a.carrier.y - 30) > 300; })()`));
check('shots: the wing\'s and the small aliens\' fly at the square root of the pace (0.6 gives 0.7746) of the table\'s speed; the fire intervals and the damage are the same', J(`(() => { const C = campNew(11, [], { seed: 1, pace: "calm" }); const f = campSpawn(C, 'fighter', 0, 0); f.vx = f.vy = 0; f.rot = 0; f.nextShot = 0; C.t = 1000; const foe = { x: 300, y: 0, r: 10 }; const before = C.bullets.length; campWingFire(C, f, CAMP.fighter, foe, 300, 0, true); const b = C.bullets[before]; return !!b && Math.abs(Math.hypot(b.vx, b.vy) - CAMP.fighter.bullet * Math.sqrt(0.6)) < 1e-6 && b.dmg === CAMP.fighter.damage * f.str; })()`) || J('C.shot') === undefined);
check('a pace change in a running battle: the ships already out are rescaled from their own numbers and the table\'s own pace (1) puts them back exactly (not 0.72 times 1 over 0.72)', J(`(() => { const C = campNew(11, [], { seed: 1, pace: "normal" }); const us = ${JSON.stringify(kinds)}.map(k => campSpawn(C, k, 0, 0)); const was = us.map(u => [u.vmax, u.accel, u.turn]); campPaceSet(C, 'calm'); const calm = us.every((u, i) => u.vmax === was[i][0] / 0.72 * 0.6 || Math.abs(u.vmax - was[i][0] / 0.72 * 0.6) < 1e-9); campPaceSet(C, 1); const back = us.every((u, i) => u.vmax === (i < 1 ? CAMP[['fighter'][i]].speed : PIRATES[['raider', 'drone', 'gunship'][i - 1]].max) && u.def === u.base.def) && C.pace === 1 && C.shot === 1; const c2 = C.carrier.vmax === CAMP.carrier.speed; return calm && back && c2; })()`));

// ---- D. the one pace
g.run(`
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document; f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document; f.mp = null;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = f.makeCamp(); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.mode = 'play'; return f; };
  window.F = __fake(1); 0`);
check('the Campaign scene makes its battle at Normal (0.72: CAMP.pace.start), whatever was stored before: the fleet-command tune and every bot number are measured there', J('F.camp.pace') === 0.72 && J('campPaceMult(CAMP.pace.start)') === 0.72);
check('there is no P key for it: P picks a friendly now and opens no list (the power list has no key; O and P are the friendlies\'), no row of either list is a pace, and the pace does not move', (() => { g.run(`F.onKey({ code: 'KeyP' })`); const open = J('campPanelOpen(F.pn)'), p1 = J('F.camp.pace'); g.run(`F.onKey({ code: 'KeyP' })`); return p1 === 0.72 && open === '' && J('campPanelOpen(F.pn)') === '' && J('F.camp.pace') === 0.72 && J(`CAMP_PANELS.panels.every(p => p.rows.every(r => !/pace/i.test(r.id + ' ' + (r.order || '') + ' ' + r.label)))`) && J(`Object.keys(CAMP_KEYS).every(k => !/pace/i.test(k))`); })());
check('there is no setting for it: no campace.js, no campPaceNow, no Settings > Game tab, no pace text, no pace line on the pause card or the H page', !/campace/.test(src('index.html')) && J('typeof campPaceNow') === 'undefined' && J('typeof campPaceChoose') === 'undefined' && !J('SETTINGS.sections.some(s => s[0] === "game")') && !Object.keys(J('UI_TEXT')).some(k => /^camp\.pace\./.test(k) || k === 'camp.keys.pace') && !/campPace/.test(src('src/campkeys.js')) && !/campPace/.test(src('src/campaignscene.js').replace(/campPaceMult|campPaceSet|campPaceShip/g, '')));
check('campNew\'s opts.pace still takes a mode (the tests, the bots and the sims pass one): Calm gives 0.6', J(`campNew(11, [], { seed: 1, pace: 'calm' }).pace`) === 0.6);

// ---- F. the difficulty curve (card space-game-wrapup-difficulty): per-mission hull and damage scales of the aliens, rising through each level; no row, no change
check('a mission row may bring hpScale and dmgScale (times the table\'s alien scales); a row with none is as it was (the Earth level "home" has none), so C.hpS and C.dmgS are the table\'s', J(`(() => { const a = campNew('home', [], { seed: 1 }); return a.hpS === CAMP.alien.hpScale && a.dmgS === CAMP.alien.damageScale; })()`) && J(`(() => { const C = campNew(11, [], { seed: 1, mission: 2 }), r = campMissionRow(11, 2); const u = campSpawn(C, 'raider', 0, 0); return C.hpS === CAMP.alien.hpScale * r.hpScale && C.dmgS === CAMP.alien.damageScale * r.dmgScale && u.hp === PIRATES.raider.hp * C.hpS; })()`));
check('the curve: in every level the scales never fall from the first mission to the third, the third is a real fight (both above 1.5); the first mission of the belt is the gentlest (1). How hard level 3 is comes from its eight towers, not from its scales: docs/WRAPUP-DIFFICULTY.md', [1, 2, 3].every(n => J(`(() => { const r = [0, 1, 2].map(i => campMissionRow(${n}, i)); return r[0].hpScale <= r[1].hpScale && r[1].hpScale <= r[2].hpScale && r[0].dmgScale <= r[1].dmgScale && r[1].dmgScale <= r[2].dmgScale && r[2].hpScale >= 1.5 && r[2].dmgScale >= 1.5; })()`)) && J(`campMissionRow(1, 0).hpScale === 1 && campMissionRow(1, 0).dmgScale === 1`));

// ---- E. the balance (the plain bot, tools/campaign-bot.mjs): every mission still won (levels 2 and 3 in about one to two minutes, the rim run of level 1 in four to seven), a player who does nothing never wins
const plan = [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]];
// re-pinned by card space-game-cruiser-quicker-handling (26 Nov 2026, Troy: "land as is"): at Calm (0.6, the tests' pace: no player has it) the plain bot now wins mission 2.3, the relic, in 16 s on two of three seeds (it was 106 to 118 s): the cruiser reaches the relic and holds it for 14 s before the first wave is close, so the floor for that one mission at that one pace is 12 s, not 25. At Normal, the pace a player gets, it is 72 s against 102 (docs/CAMPAIGN-TUNING.md).
// re-pinned again by card space-game-23-waves-on-entry (26 Nov 2026): 2.3's waves come on the hold (entering, 10 s held, the third right behind the second: card space-game-23-two-sides) and hold the ring, so the 16 s win is gone at every pace; its floor is now 60 s, above the other missions' 25 (three fights and a 20 s hold cannot take less).
// the time band is read on the runs that are won (card space-game-b7-level1, 26 Nov 2026: the two raids of 1.2 arrive together and one of its three seeds is lost to the miners now, at 198 s; on 32 seeds at Normal the plain bot wins 94 percent of 1.2 before and after, docs/CAMPAIGN-TUNING.md): at least two of three are still won
for (const pace of ['normal', 'calm']) {
  setPace(pace);
  const res = plan.map(([l, m]) => ({ l, m, rs: [1, 2, 3].map(sd => botRun(l, sd, 'plain', 'steady', techsFor(l), 420, m)) }));
  check(`${pace}: the plain bot wins every one of the nine missions on at least two of three seeds, each in 25 seconds to 4 minutes (the rim run's level 1, which is a long road and a long mine, in 4 to 7 minutes: card space-game-l1-rim-tune) (the aim for levels 2 and 3 is about one to two minutes, and a mission with a trip counts it)`, res.every(x => x.rs.filter(r => r.result === 'won').length >= 2 && x.rs.filter(r => r.result === 'won').every(r => x.l === 1 ? (r.t >= 240 && r.t <= 420) : (r.t >= (x.l === 2 && x.m === 2 ? 60 : 25) && r.t <= 240))), JSON.stringify(res.map(x => x.l + '.' + (x.m + 1) + ' ' + x.rs.map(r => r.result[0] + r.t).join(' '))));
  const idle = plan.map(([l, m]) => botRun(l, 1, 'idle', 'steady', techsFor(l), l === 1 ? 420 : 200, m)); // level 1's roads take five minutes: the idle player is given the time to be beaten on them
  check(`${pace}: a player who does nothing never wins a mission`, idle.every(r => r.result !== 'won'), JSON.stringify(idle.map(r => r.result)));
}
setPace('brisk');
console.log(failed ? `\nCAMPAIGN PACE FAIL (${failed} of ${n})` : `\nCAMPAIGN PACE PASS (${n})`);
process.exitCode = failed ? 1 : 0;
