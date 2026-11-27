// smoke: the bottom key row teaches: at 5 s into mission 1.1 the Q chip lights with "then 1: stay with her" at the left end of the row, and goes quiet once Q has been pressed (plain Node, no Chrome)
// Card space-game-chunk12-teach-q (Troy, 26 Nov 2026; brief 8 proposal E, decision 5, first chip only). src/campteach.js is the mechanism (CAMP_TEACH, campTeachChips); the next chips are one more row each.
//   A. the chip: not before 5 s, lit from 5 s in 1.1 only, at the left end of the row, its key the key table's, its words two or three; gone when the cruiser's list has been opened; gone after 120 s
//   B. the rest: the row is as it was before 5 s and in 1.2 and 1.3; the hints switch turns the row (and the chip) off; the sim remembers the lists opened; no letter is written in the file
// Run: node tests/campteach.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`window.__mk = (mi, sec) => { const C = window.C = campNew(1, [], { seed: 1, mission: mi || 0 }); C.arrivedAt = 0; C.t = (sec == null ? 6 : sec) * 1000; return C; };`);

console.log('A. the chip');
{
  g.run(`__mk(0, 4);`);
  check('not before 5 s: no teaching chip, and the row has its own chips', J('campTeachChips(C).length') === 0 && J('campPageHudFirst(C).items.every(i => !i.lit)'));
  g.run(`__mk(0, 5.5);`);
  const c = J('campTeachChips(C)');
  check('at 5.5 s in 1.1 one chip: the key table\'s key for the cruiser\'s list (Q), the word Cruiser, the note "then 1: stay with her", lit', c.length === 1 && c[0].key === J('campKeyOpens("cruiser")') && c[0].key === 'Q' && c[0].word === 'Cruiser' && c[0].note === 'then 1: stay with her' && c[0].lit === true, JSON.stringify(c));
  const row = J('campPageHudFirst(C).items.map(i => i.id + (i.lit ? "*" : ""))');
  check('it is the first chip of the row, lit, and the row\'s own chips follow it unchanged (fly, fire, boost, missile)', row[0] === 'q*' && row.slice(1, 5).join() === 'fly,fire,boost,missile', row.join());
  g.run(`campPanelGo({ open: null, at: 0, top: 0, pick: null, trail: [] }, C, 'cruiser');`);
  check('once Q has been pressed (the cruiser\'s list opened) it goes quiet: no chip, the row as it was', J('campTeachChips(C).length') === 0 && J('C.keysUsed.cruiser') === true && J('campPageHudFirst(C).items.every(i => !i.lit)'));
  g.run(`__mk(0, 5.5); campPanelGo({ open: null, at: 0, top: 0, pick: null, trail: [] }, C, 'fleet');`);
  check('opening another list (W) does not quiet it: only Q does', J('campTeachChips(C).length') === 1);
  g.run(`__mk(0, 121);`);
  check('it does not outlast its moment: gone after 120 s', J('campTeachChips(C).length') === 0);
}

console.log('B. the rest');
{
  check('mission 1.2 and 1.3 have none: it is for 1.1', [1, 2].every(m => { g.run(`__mk(${m}, 6);`); return J('campTeachChips(C).length') === 0; }));
  g.run(`__mk(0, 6);`);
  check('with the hints off the key row is gone, the chip with it', J('(() => { CAMP.flags.hints = false; try { return campPageHudFirst(C) === null; } finally { CAMP.flags.hints = true; } })()'));
  check('a mission that has ended shows none', J('(() => { C.result = "won"; try { return campTeachChips(C).length === 0; } finally { C.result = null; } })()'));
  const src = readFileSync(join(ROOT, 'src/campteach.js'), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
  check('no key is written in the file: no quoted capital letter (the cap is the key table\'s), and the words are content keys', !/'[A-Z]'/.test(src) && /camp\.corner\.chip\.teachq/.test(src));
  check('the two new words are in the table and the voice pack says they are shown, never said', J("uiText('camp.corner.chip.cruiser')") === 'Cruiser' && J("uiText('camp.corner.chip.teachq')") === 'then 1: stay with her' && J("VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.teachq') && r.why && !r.spoken)") === true);
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('TEACH FAIL (' + failed + ')'); process.exit(1); } else console.log('TEACH PASS');
