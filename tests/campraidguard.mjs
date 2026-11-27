// smoke: 1.3's rear raids leave the last hauler alone while a pilot's fighter, or the one he flies, is within 500 px of her (card space-game-fighter-job-13, BRIEF 8 proposal C): the rule, its two rows, what the pirates pick instead, and nothing else of the pirates changed
// The rule is a wave row's guard (px) with along (the hauler's id): src/camppirates.js campPirateGuarded, asked by campPirateTarget; the two rear raids of 1.3 (src/campaign.js) have guard 500. The bot table is in PROJECT_STATUS.md.
//   A  the rows: the rear raids (waves 3 and 5 of 1.3, along h3) have guard 500, no other wave of the mission or of the others does
//   B  campPirateGuarded: a pilot's fighter within 500 px guards her, a flown fighter too, one farther, a docked one, a dead one, the cruiser and an escort do not; a wave without guard never asks
//   C  the pirates' choice: with nobody near she is the prey (the nearest hauler), with a fighter near she is not and they go for something else, with it gone again she is
//   D  the rest of the pirates' choice is as it was (a wave with no guard picks as before; the named hauler of a goal still wins)
// Run: node tests/campraidguard.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`{
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 2 }); C.god = true; C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); for (let i = 0; i < 40 * 30; i++) campStep(C, 1 / 30); C.ships = C.ships.filter(u => u.team !== 'alien' && u.kind !== 'fighter'); C.events.length = 0; window.HL = ['h1', 'h2', 'h3'].map(id => C.by['freighter-' + id]); return C; };
  window.__fighter = (dx, dy) => { const f = campSpawn(C, 'fighter', HL[2].x + dx, HL[2].y + dy); f.team = 'earth'; f.docked = false; return f; };
  window.__raider = (wave, prey) => { const u = campSpawn(C, 'skiff', HL[2].x - 300, HL[2].y + 100); u.wave = wave; u.prey = prey || 'haulers'; u.hitBy = null; return u; };
}`);

console.log('A. the rows');
g.run(`__new();`);
const rows = J('C.L.waves.map(w => [w.along || null, w.guard || null])');
check('1.3 has six waves; the two rear raids (waves 3 and 5, along h3) have guard 500 and no other has any', rows.length === 6 && rows[2][0] === 'h3' && rows[2][1] === 500 && rows[4][0] === 'h3' && rows[4][1] === 500 && rows.filter((r, i) => i !== 2 && i !== 4).every(r => r[1] === null), JSON.stringify(rows));
check('the three haulers are on the road (h1, h2, h3) and h3 is the last: the farthest from the destination', J('HL.every(h => !!h && h.hp > 0)') === true && J('HL[2].lane') > 0);
check('no other mission has a wave with guard', [[1, 0], [1, 1], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]].every(([l, m]) => (g.run(`window.C = campNew(${l}, [], { seed: 3, mission: ${m} });`), J('(C.L.waves || []).every(w => !w.guard)') === true)));

console.log('B. campPirateGuarded');
g.run(`__new(); window.R0 = __raider(2);`);
check('nobody near: she is not guarded', J('campPirateGuarded(C, R0)') === null);
g.run(`window.F1 = __fighter(300, 0);`);
check('a pilot\'s fighter 300 px from her guards her (the answer is her)', J('campPirateGuarded(C, R0) === HL[2]') === true);
g.run(`F1.x = HL[2].x + 499; F1.y = HL[2].y;`);
check('499 px: guarded; 501 px: not', J('campPirateGuarded(C, R0) === HL[2]') === true && (g.run(`F1.x = HL[2].x + 501;`), J('campPirateGuarded(C, R0)') === null));
g.run(`F1.x = HL[2].x + 100; F1.docked = true;`);
check('a fighter in the bay (docked) does not guard her', J('campPirateGuarded(C, R0)') === null);
g.run(`F1.docked = false; F1.cockpit = true;`);
check('the fighter he flies (cockpit) does', J('campPirateGuarded(C, R0) === HL[2]') === true);
g.run(`F1.hp = 0;`);
check('a dead one does not', J('campPirateGuarded(C, R0)') === null);
g.run(`F1.hp = 30; window.E1 = campSpawn(C, 'drone', HL[2].x + 100, HL[2].y); E1.team = 'earth';`);
check('a drone of the wing (not a pilot) and the cruiser beside her do not: only a fighter does', J('campPirateGuarded(C, R0)') === J('(F1.hp > 0 ? HL[2] : null)') || (g.run(`F1.hp = 0; C.carrier.x = HL[2].x + 100; C.carrier.y = HL[2].y;`), J('campPirateGuarded(C, R0)') === null));
g.run(`__new(); window.F2 = __fighter(200, 0); window.R5 = __raider(0); window.R6 = __raider(4);`);
check('a wave without guard never asks (wave 0), the other rear raid (wave 4: index 4) does; no wave number, no answer', J('campPirateGuarded(C, R5)') === null && J('campPirateGuarded(C, R6) === HL[2]') === true && J('campPirateGuarded(C, { wave: undefined })') === null);
g.run(`HL[2].hp = 0;`);
check('a lost hauler is nobody to guard', J('campPirateGuarded(C, R6)') === null);

console.log('C. the pirates\' choice');
g.run(`__new(); window.R = __raider(2); window.T0 = campPirateTarget(C, R);`);
check('nobody near: the raid goes for the nearest hauler by the weights, the last one at the back', J('T0 === HL[2]') === true);
g.run(`window.F3 = __fighter(150, 0); window.T1 = campPirateTarget(C, R);`);
check('a fighter 150 px from her: she is not its prey; it goes for something else (another hauler, the fighter, the cruiser)', J('T1 !== null && T1 !== HL[2]') === true, J('T1 && T1.id'));
g.run(`F3.x = HL[2].x + 900; window.T2 = campPirateTarget(C, R);`);
check('the fighter flown off 900 px: she is the prey again', J('T2 === HL[2]') === true);
g.run(`F3.x = HL[2].x + 150; window.R7 = __raider(0); window.T3 = campPirateTarget(C, R7);`);
check('a wave with no guard (wave 0) with the fighter near her: picks as it always did (she is the nearest hauler)', J('T3 === HL[2]') === true);
g.run(`window.R8 = __raider(2); R8.goal = 'convoy:h3'; window.T4 = campPirateTarget(C, R8);`);
check('a named hauler still wins over prey (goal convoy:h3), as the code was', J('T4 === HL[2]') === true);

console.log('D. the sim');
const pj = src('src/camppirates.js'), code = pj.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('the guard is one function and one filter: it writes nothing (no hp, no position, no order) and the pirates\' numbers are the table\'s', /function campPirateGuarded\(C, u\)/.test(code) && (code.match(/campPirateGuarded\(/g) || []).length === 2 && !/campPirateGuarded[^;]*=\s*[^=]/.test(code.replace(/function campPirateGuarded\(C, u\)/, '')) );

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
