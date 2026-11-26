// smoke: the new screens' arrow keys only move the highlight; only Enter opens, buys or goes on (card space-game-ready-room-arrows-select; plain Node, no Chrome)
// Troy, 26 Nov 2026, on the ready room of the new screens: "do not use arrow keys to move forward; Enter only. Arrow keys select items on the screen." The rule for every new screen: an arrow (and its WASD twin) moves the highlight; Enter opens the
// highlighted item, buys, or goes on; Esc goes back. The glass screens (CAMP.flags.screens off) keep their keys as they were. The briefing's Left and Right walk the four moments, which is selecting, and stay.
//   A  the ready room: Left and Right go along the chip row (round the ends), Up goes to the card's Briefing, Down comes back to the chip that was lit; no arrow opens a row or acts
//   B  Enter opens the highlighted row; the refit: no arrow buys or closes it (Left was Back and Right was Buy), Enter buys, Esc closes; the rank: no arrow closes it
//   C  the mission pick: the four arrows only move round the grid (6-GEN's grid), none closes it or opens a briefing
//   D  the glass look is as it was: Right opens a row, Left closes an overlay, Right buys
//   E  the chips and the key table say it: Esc is Back on the refit and the rank, the roles' comments say the arrows only choose; the other new screens (title, cards, Settings, briefing) are surveyed
// Run: node tests/scrarrows.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
g.run(`
  window.__fresh = (screens) => { CAMP.flags.screens = !!screens; window.PR = campProgressNew(); window.HB = campHubNew(PR, {}); return PR; };
  window.__key = c => { const before = JSON.stringify(PR); const r = campHubKey(HB, PR, c, {}); return { used: r.used, moved: r.moved, action: r.action, row: HB.row, open: HB.open, chip: HB.chip == null ? null : HB.chip, same: JSON.stringify(PR) === before }; };
`);
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], WASD = ['KeyA', 'KeyD', 'KeyW', 'KeyS'];
const press = c => J(`__key(${JSON.stringify(c)})`);
const rows = J('CAMP_HUB.rows');

console.log('A. the ready room');
g.run(`__fresh(true);`);
check('the switch is on for this suite and the rows are the hub\'s: Missions, Refit, Rank and the card\'s Briefing (launch)', J('scrOn()') === true && rows.join() === 'board,refit,rank,launch');
let r = press('ArrowRight');
check('Right goes to the next chip along the row (Missions to Refit) and opens nothing; Right again, Rank; and once more it goes round the end to Missions', r.row === 1 && r.open === '' && r.action === '' && press('ArrowRight').row === 2 && press('ArrowRight').row === 0);
check('Left goes the other way and round the end (Missions to Rank to Refit to Missions); the keys of the other hand (A and D) do the same', press('ArrowLeft').row === 2 && press('ArrowLeft').row === 1 && press('ArrowLeft').row === 0 && press('KeyD').row === 1 && press('KeyA').row === 0);
g.run(`__fresh(true); HB.row = 1;`);
r = press('ArrowUp');
check('Up goes from a chip to the card\'s Briefing (the row after Rank in the table) and remembers the chip; opens nothing', r.row === 3 && r.chip === 1 && r.open === '' && r.action === '' && r.moved === true);
check('Left and Right on the card\'s Briefing change nothing (there is one item in its row) and Up stops there', press('ArrowLeft').row === 3 && press('ArrowRight').row === 3 && press('ArrowUp').row === 3 && press('ArrowLeft').moved === false);
r = press('ArrowDown');
check('Down comes back to the chip that was lit (Refit), and on a chip Down stops (nothing is below the row)', r.row === 1 && press('ArrowDown').row === 1 && press('ArrowDown').moved === false);
check('no arrow, from any highlighted item, ever opens a row, gives an action or changes the player\'s progress or purse: all four arrows and their WASD twins, from each of the four rows, twice over', (() => { let ok = true; for (let row = 0; row < 4; row++) for (const c of ARROWS.concat(WASD)) { g.run(`__fresh(true); HB.row = ${row};`); const a = press(c), b = press(c); ok = ok && a.open === '' && a.action === '' && a.same && b.open === '' && b.action === '' && b.same; } return ok; })());

console.log('B. Enter opens; the refit and the rank');
g.run(`__fresh(true); HB.row = 0;`);
check('Enter on the highlighted chip opens it (Missions, then Esc and Refit, then Rank); Enter on the card\'s Briefing gives the briefing action (the room\'s own launch); the digits still pick a row', press('Enter').open === 'board' && (g.run(`HB.open = ''; HB.row = 1;`), press('Enter').open === 'refit') && (g.run(`HB.open = ''; HB.row = 2;`), press('Enter').open === 'rank') && (g.run(`HB.open = ''; HB.row = 3;`), press('Enter').action !== '') && (g.run(`HB.open = ''; HB.row = 0;`), press('Digit3').row === 2));
g.run(`__fresh(true); PR.credits = 5000; PR.ore = 5000; HB.row = 1; HB.open = 'refit';`);
const before = J('({ c: PR.credits, o: PR.ore, f: PR.bonus && PR.bonus.fighters, e: PR.extra })');
const rr = ARROWS.concat(WASD).map(c => press(c));
check('on the refit no arrow buys and none closes it: all eight keys leave the progress (credits, ore, the wing bought) as it was and the refit open (Left was Back and Right was Buy)', rr.every(x => x.open === 'refit' && x.action === '' && x.same) && JSON.stringify(J('({ c: PR.credits, o: PR.ore, f: PR.bonus && PR.bonus.fighters, e: PR.extra })')) === JSON.stringify(before));
r = press('Enter');
check('Enter on the refit buys (credits and ore go down, the wing grows) and Esc closes it', r.same === false && J('PR.credits') < 5000 + 1 && JSON.stringify(J('({ c: PR.credits, o: PR.ore, f: PR.bonus && PR.bonus.fighters, e: PR.extra })')) !== JSON.stringify(before) && press('Escape').open === '');
g.run(`__fresh(true); HB.row = 2; HB.open = 'rank';`);
check('on the rank no arrow closes it or does anything (nothing to choose); Esc closes it', ARROWS.concat(WASD).every(c => { const x = press(c); return x.open === 'rank' && x.action === '' && x.same; }) && press('Escape').open === '');

console.log('C. the mission pick');
g.run(`__fresh(true); HB.row = 0; HB.open = 'board';`);
check('the four arrows only move round the grid: none closes it (Left was Back), none opens a briefing (Right was Open), none gives an action; Esc closes it', ARROWS.concat(WASD).every(c => { const x = press(c); return x.open === 'board' && x.action === ''; }) && press('Escape').open === '');

console.log('D. the glass look is as it was');
g.run(`__fresh(false); HB.row = 0;`);
check('with the switch off Right opens the row, Left closes the overlay again, and in the refit Right buys', press('ArrowRight').open === 'board' && press('ArrowLeft').open === '' && (g.run(`PR.credits = 5000; PR.ore = 5000; HB.row = 1;`), press('ArrowRight').open === 'refit' && press('ArrowRight').same === false));
g.run(`__fresh(false); HB.row = 0;`);
check('and with the switch off Up and Down still go round all four rows (Down from Missions is Refit, from the Briefing row it goes round to Missions)', press('ArrowDown').row === 1 && (g.run(`HB.row = 3;`), press('ArrowDown').row === 0) && press('ArrowUp').row === 3);
g.run(`CAMP.flags.screens = false;`);

console.log('E. the chips, the key table and the other new screens');
const sh = code('src/scrhub.js');
check('the refit, the rank and the pick all say Esc Back (the close role: the pick\'s is 6-GEN\'s), not Left Back', !/scrKeyWordN\('left', uiText\('scr\.hub\.back'\)\)/.test(sh) && (sh.match(/scrKeyWordN\('close', uiText\('scr\.hub\.back'\)\)/g) || []).length === 3);
const dc = src('src/data_controls.js');
check('the key table says what the arrows are on the new screens: Left and Right are not Back and Do (their comments), Esc is the one Back; every entry is still held to the code (tests/screens.mjs)', /the arrows only choose/.test((dc.match(/ {2}left: \{[^\n]*\n/) || [''])[0]) && /opens or buys nothing/.test((dc.match(/ {2}right: \{[^\n]*\n/) || [''])[0]) && /close: \{ same: 'pause'/.test(dc));
const ch = code('src/camphub.js');
check('the rule is in campHubKey and nowhere else for the hub: one place asks the new screens (scrOn), the glass branches are the else of each line', /const sel = !dock && typeof scrOn === 'function' && scrOn\(\)/.test(ch) && /\(!sel && campHubLeft\(code\)\)/.test(ch) && /\(!sel && campHubRight\(code\)\)/.test(ch));
const ti = src('src/title.js'), st = src('src/settings.js'), cb = src('src/campbrief.js');
check('the survey of the other new screens: the title\'s arrows only step the highlight between its doors and Enter opens (TITLE_KEYS prev and next, enter); a card (won, lost, pause, the keys page) takes Enter, Esc and its letters and no arrow; Settings\' Up and Down choose a tab and its Left and Right change a value of the field (they go to no other screen); the one-page briefing\'s Left and Right walk its moments (6-GEN); the glass briefing\'s ArrowRight (campbrief.js) is today\'s three screens, which the one page replaces', /prev: \['ArrowUp', 'ArrowLeft'\], next: \['ArrowDown', 'ArrowRight'\]/.test(ti) && /enter: \['Enter', 'NumpadEnter'\]/.test(ti) && /code === 'ArrowUp' \|\| code === 'KeyW'\) this\.show\(/.test(st) && /ArrowRight/.test(cb) && !/Arrow/.test(code('src/scrcards.js')) && !/Arrow/.test(code('src/scrcardsdraw.js')));

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
