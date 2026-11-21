// smoke: the Campaign's BATTLE PACE (card space-game-campaign-pace; Troy, 20 Nov 2026), in plain Node, no Chrome.
// The small ships' fights were a bit fast: CAMP.pace scales the small ships' top speed, acceleration and turn, and their shots by its square root; nothing else.
//   A. the table: Calm 0.7, Normal 0.85, Brisk 1, the default, the shot power, the quick key
//   B. Brisk is the numbers as they were, bit for bit: a battle with no pace, "brisk" and 1 is the same battle, and the ships carry the table's own numbers
//   C. the scaling: the five small kinds by the multiplier, the shots by its square root, the carrier, mothership, towers, haulers, turrets and Fast not at all; a change in play and back is exact
//   D. the setting: Normal until picked, kept in this browser apart from the save, the cycle, a bad value; the B key, the pause card, the H page, the controls table; Settings > Game
//   E. the balance: a plain bot wins every mission at Normal and Calm in about one to two minutes, a player who does nothing never wins
// Run: node tests/camppace.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { run as botRun, setPace, techsFor } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ---- A. the table
check('CAMP.pace: Calm 0.7, Normal 0.85, Brisk 1, in the order the key cycles them; the default is Normal; shots go by the square root; the key is B', J('CAMP.pace.modes.map(m => m.id + ":" + m.mult).join()') === 'calm:0.7,normal:0.85,brisk:1' && J('CAMP.pace.start') === 'normal' && J('CAMP.pace.shots') === 0.5 && J('CAMP.pace.key') === 'KeyB');
check('campPaceMult: an id, a number, nothing (1) or nonsense (1)', J('[campPaceMult("calm"), campPaceMult("normal"), campPaceMult("brisk"), campPaceMult(0.5), campPaceMult(), campPaceMult("fast"), campPaceMult(-1), campPaceMult(NaN)]').join() === '0.7,0.85,1,0.5,1,1,1,1');

// ---- B. Brisk is today's numbers
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
check('four seeded battles of 70 s with no pace, with "brisk" and with 1 are the same battles to the last digit (the sim at Brisk is the sim as it was)', sNone === sBrisk && sNone === sOne && sNone.length > 2000);
check('and Normal is a different battle (the pace does something)', sNormal !== sNone);
check('at Brisk the ships carry the table\'s own numbers: a fighter and an escort, a raider, a drone and a gunship; the shape pirateSteer reads is the pirates\' own row', J(`(() => { const C = campNew(1, [], { seed: 1, pace: "brisk" }); const ok = []; ['fighter', 'escort'].forEach(k => { const u = campSpawn(C, k, 0, 0); ok.push(u.vmax === CAMP[k].speed && u.accel === CAMP[k].accel && u.turn === CAMP[k].turn); }); ['raider', 'drone', 'gunship'].forEach(k => { const u = campSpawn(C, k, 0, 0); ok.push(u.vmax === PIRATES[k].max && u.accel === PIRATES[k].speed && u.turn === PIRATES[k].turn * 60 && u.def === PIRATES[k]); }); return ok.every(Boolean) && C.pace === 1 && C.shot === 1; })()`));

// ---- C. the scaling
const kinds = ['fighter', 'escort', 'raider', 'drone', 'gunship'];
check('Calm: the five small kinds have 0.7 of the table\'s top speed, acceleration and turn, and their steering shape the same', J(`(() => { const C = campNew(1, [], { seed: 1, pace: "calm" }); return ${JSON.stringify(kinds)}.every(k => { const u = campSpawn(C, k, 0, 0), t = k === 'fighter' || k === 'escort' ? CAMP[k] : null, d = PIRATES[k]; const vmax = t ? t.speed : d.max, acc = t ? t.accel : d.speed, turn = t ? t.turn : d.turn * 60; return u.vmax === vmax * 0.7 && u.accel === acc * 0.7 && u.turn === turn * 0.7 && u.def.max === vmax * 0.7 && u.def.speed === acc * 0.7 && u.hp === (t ? t.hp : d.hp * CAMP.alien.hpScale); }); })()`));
check('Normal: 0.85 of each, hull points the same as at Brisk (hull and damage are not touched)', J(`(() => { const C = campNew(1, [], { seed: 1, pace: "normal" }), B = campNew(1, [], { seed: 1, pace: "brisk" }); return ${JSON.stringify(kinds)}.every(k => { const u = campSpawn(C, k, 0, 0), v = campSpawn(B, k, 0, 0); return u.vmax === v.vmax * 0.85 && u.accel === v.accel * 0.85 && u.turn === v.turn * 0.85 && u.hp === v.hp && u.r === v.r; }); })()`));
check('not scaled at Calm: the carrier, the mothership, a tower, a hauler (all the table\'s numbers)', J(`(() => { const C = campNew(1, [], { seed: 1, pace: "calm" }), c = C.carrier, m = campSpawn(C, 'mother', 0, 0), t = campSpawn(C, 'tower', 0, 0), f = campSpawn(C, 'freighter', 0, 0); return c.vmax === CAMP.carrier.speed && c.accel === CAMP.carrier.accel && c.turn === CAMP.carrier.turn && m.vmax === CAMP.mother.speed && m.accel === 200 && m.turn === 0.5 && t.vmax === 0 && f.vmax === CAMP.convoy.speed && f.accel === 400 && !c.base && !m.base && !t.base && !f.base; })()`));
check('Fast, the trip and the warp do not read the pace: no pace in the autopilot or the warp files, and the carrier\'s Fast burn is the same at Calm as at Brisk', !/\.pace\b|campPace/.test(src('src/campnav.js')) && !/\.pace\b|campPace/.test(src('src/campwarp.js')) && J(`(() => { const a = campNew(1, [], { seed: 1, pace: "calm" }), b = campNew(1, [], { seed: 1, pace: "brisk" }); campNavGo(a, campNavGoal(a), true); campNavGo(b, campNavGoal(b), true); for (let i = 0; i < 150; i++) { campStep(a, 1 / 30); campStep(b, 1 / 30); } return a.carrier.x === b.carrier.x && a.carrier.y === b.carrier.y && a.carrier.vx === b.carrier.vx && Math.hypot(a.carrier.x - 130, a.carrier.y - 30) > 300; })()`));
check('shots: the wing\'s and the small aliens\' fly at the square root of the pace (0.7 gives 0.8367) of the table\'s speed; the fire intervals and the damage are the same', J(`(() => { const C = campNew(1, [], { seed: 1, pace: "calm" }); const f = campSpawn(C, 'fighter', 0, 0); f.vx = f.vy = 0; f.rot = 0; f.nextShot = 0; C.t = 1000; const foe = { x: 300, y: 0, r: 10 }; const before = C.bullets.length; campWingFire(C, f, CAMP.fighter, foe, 300, 0, true); const b = C.bullets[before]; return !!b && Math.abs(Math.hypot(b.vx, b.vy) - CAMP.fighter.bullet * Math.sqrt(0.7)) < 1e-6 && b.dmg === CAMP.fighter.damage; })()`) || J('C.shot') === undefined);
check('a pace change in a running battle: the ships already out are rescaled from their own numbers and Brisk puts them back exactly (not 0.85 times 1 over 0.85)', J(`(() => { const C = campNew(1, [], { seed: 1, pace: "normal" }); const us = ${JSON.stringify(kinds)}.map(k => campSpawn(C, k, 0, 0)); const was = us.map(u => [u.vmax, u.accel, u.turn]); campPaceSet(C, 'calm'); const calm = us.every((u, i) => u.vmax === was[i][0] / 0.85 * 0.7 || Math.abs(u.vmax - was[i][0] / 0.85 * 0.7) < 1e-9); campPaceSet(C, 'brisk'); const back = us.every((u, i) => u.vmax === (i < 2 ? CAMP[['fighter', 'escort'][i]].speed : PIRATES[['raider', 'drone', 'gunship'][i - 2]].max) && u.def === u.base.def) && C.pace === 1 && C.shot === 1; const c2 = C.carrier.vmax === CAMP.carrier.speed; return calm && back && c2; })()`));

// ---- D. the setting, the key, the screens
check('with nothing stored the setting is Normal (the new default), and the Campaign is made at its multiplier', J('campPaceNow().id') === 'normal' && J('campNew(1, [], { seed: 1, pace: campPaceNow().id }).pace') === 0.85);
g.run(`campPaceChoose('calm')`);
check('choosing keeps it in this browser under its own key, apart from the save; a reload (a second game on the same storage) has it; Reset game does not clear it', store.get('longhaul.campaign.pace') === 'calm' && (() => { const g2 = nodeGame({ store }); const id = JSON.parse(g2.run('JSON.stringify(campPaceLoad())')); g2.run('clearSave()'); return id === 'calm' && store.get('longhaul.campaign.pace') === 'calm'; })());
check('Step cycles Calm, Normal, Brisk and round again, both ways; a garbage value in the storage is Normal', J(`(() => { const o = []; campPaceChoose('calm'); for (let i = 0; i < 4; i++) o.push(campPaceStep(1).id); for (let i = 0; i < 3; i++) o.push(campPaceStep(-1).id); return o.join(); })()`) === 'normal,brisk,calm,normal,calm,brisk,normal' && (store.set('longhaul.campaign.pace', 'warp9'), J('campPaceLoad()') === 'normal') && (g.run(`campPaceChoose('normal')`), true));
check('the line for the pause card and the H page is "Pace: Normal"', J('campPaceLine()') === 'Pace: Normal');
// the scene, on the stand-in of tests/campaign.mjs: B cycles in play, the pause card has the line, the battle was made at the setting
g.run(`
  var __toasts = []; toast = (s, msg) => { __toasts.push(msg); };
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document; f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document; f.hud = { shield: document, ore: document, hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document };
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = f.makeCamp(); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.mode = 'play'; return f; };
`);
g.run(`campPaceChoose('normal'); window.F = __fake(1); 0`);
check('the Campaign scene makes its battle at the player\'s setting', J('F.camp.pace') === 0.85);
g.run(`__toasts.length = 0; F.onKey({ code: 'KeyB' })`);
check('B in play goes to Brisk (the next of Normal), says "Pace: Brisk.", and the running battle takes it', J('campPaceNow().id') === 'brisk' && J('F.camp.pace') === 1 && J('__toasts.pop()') === 'Pace: Brisk.');
g.run(`F.onKey({ code: 'KeyB' }); F.onKey({ code: 'KeyB' })`);
check('B again: Calm, then Normal; the stored setting follows', J('campPaceNow().id') === 'normal' && store.get('longhaul.campaign.pace') === 'normal' && J('F.camp.pace') === 0.85);
g.run(`F.mode = 'pause'; F.onKey({ code: 'KeyB' })`);
check('B does nothing outside the battle (on a card)', J('campPaceNow().id') === 'normal');
g.run(`window.__card = null; F.showCard = (t, lines, ok, h) => { window.__card = { t, lines, ok, h }; }; F.showPause()`);
check('the pause card says "Pace: Normal" and the key that changes it', J('__card.lines.some(l => /^Pace: Normal +B changes the battle pace\\.$/.test(l))'));
check('the controls table lists B (with M: the row has both), so the H page and tests/controlshelp.mjs know the key', J(`controlsGroup('campaign').rows.some(r => r.k.includes('B') && /battle pace/i.test(r.t))`) && J('campKeysPage().some(g => g.rows.some(r => r.caps.includes("B")))'));
check('the H page draws the setting at the foot of the page', /campPaceNow\(\)/.test(src('src/campkeys.js')) && /camp\.keys\.pace/.test(src('src/campkeys.js')));
check('Settings has a GAME section with the three settings, Left, Right and Enter step it, its rail status and tag name the pace', J(`SETTINGS.sections.some(s => s[0] === 'game')`) && /draw_game\(\)/.test(src('src/settings.js')) && /stepPace\(d\)/.test(src('src/settings.js')) && /game: campPaceNow\(\)\.name\.toUpperCase\(\)/.test(src('src/settings.js')) && /game: 'PACE '/.test(src('src/settings.js')));
check('the words are in content/text/ (the file mirrors the table): the line, the toast, the key, the three notes', ['camp.pace.line', 'camp.pace.toast', 'camp.pace.key', 'camp.pace.note.calm', 'camp.pace.note.normal', 'camp.pace.note.brisk', 'camp.keys.pace'].every(k => src('content/text/campaign-pace.md').includes('| ' + k + ' |')));

// ---- F. the difficulty curve (card space-game-wrapup-difficulty): per-mission hull and damage scales of the aliens, rising through each level; no row, no change
check('a mission row may bring hpScale and dmgScale (times the table\'s alien scales); a row with none is as it was (the Earth level "home" has none), so C.hpS and C.dmgS are the table\'s', J(`(() => { const a = campNew('home', [], { seed: 1 }); return a.hpS === CAMP.alien.hpScale && a.dmgS === CAMP.alien.damageScale; })()`) && J(`(() => { const C = campNew(1, [], { seed: 1, mission: 2 }), r = campMissionRow(1, 2); const u = campSpawn(C, 'raider', 0, 0); return C.hpS === CAMP.alien.hpScale * r.hpScale && C.dmgS === CAMP.alien.damageScale * r.dmgScale && u.hp === PIRATES.raider.hp * C.hpS; })()`));
check('the curve: in every level the scales never fall from the first mission to the third, the third is a real fight (both above 1.5); the first mission of the belt is the gentlest (1). How hard level 3 is comes from its eight towers, not from its scales: docs/WRAPUP-DIFFICULTY.md', [1, 2, 3].every(n => J(`(() => { const r = [0, 1, 2].map(i => campMissionRow(${n}, i)); return r[0].hpScale <= r[1].hpScale && r[1].hpScale <= r[2].hpScale && r[0].dmgScale <= r[1].dmgScale && r[1].dmgScale <= r[2].dmgScale && r[2].hpScale >= 1.5 && r[2].dmgScale >= 1.5; })()`)) && J(`campMissionRow(1, 0).hpScale === 1 && campMissionRow(1, 0).dmgScale === 1`));

// ---- E. the balance (the plain bot, tools/campaign-bot.mjs): every mission still won in about one to two minutes, a player who does nothing never wins
const plan = [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]];
for (const pace of ['normal', 'calm']) {
  setPace(pace);
  const res = plan.map(([l, m]) => ({ l, m, rs: [1, 2, 3].map(sd => botRun(l, sd, 'plain', 'steady', techsFor(l), 300, m)) }));
  check(`${pace}: the plain bot wins every one of the nine missions on all of three seeds, each in 25 seconds to 3 minutes (the aim is about one to two)`, res.every(x => x.rs.every(r => r.result === 'won' && r.t >= 25 && r.t <= 180)), JSON.stringify(res.map(x => x.l + '.' + (x.m + 1) + ' ' + x.rs.map(r => r.result[0] + r.t).join(' '))));
  const idle = plan.map(([l, m]) => botRun(l, 1, 'idle', 'steady', techsFor(l), 200, m));
  check(`${pace}: a player who does nothing never wins a mission`, idle.every(r => r.result !== 'won'), JSON.stringify(idle.map(r => r.result)));
}
setPace('brisk');
console.log(failed ? `\nCAMPAIGN PACE FAIL (${failed} of ${n})` : `\nCAMPAIGN PACE PASS (${n})`);
process.exitCode = failed ? 1 : 0;
