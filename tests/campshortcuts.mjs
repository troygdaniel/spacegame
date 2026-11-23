// smoke: the ship's shortcuts: O opens POWER (Shields first), I the AUTOPILOT, U DOCK AND REPAIR, whose rows come from a table (plain Node, no Chrome)
// Card space-game-ship-shortcuts-o-power (Troy, 22 Nov 2026: shields are the easiest thing to reach; the U list renamed and built from data, as prep for repairing ships in space later: NOT built).
//   A. the keys: O is the power list and I the autopilot (they were the other way round), U the dock; the ship list (P) has Power, Autopilot, Dock and repair in that order, the blink after them; O, Enter is a pip to the shields
//   B. the names: the U list is DOCK AND REPAIR (its row in P says Dock and repair); nothing says DOCK AND BUILD any more in the table, the words or the key line
//   C. the table: the rows of the U list ARE CAMP_YARD (id, label, help, when, cost, does): same ids, same orders, same `when` as before, nothing else changed; a row of the table changed (a stand-in for a Repair row) is the list's row,
//      and its cost words in the list read the table's `cost`
//   D. nothing else moved: the same eleven rows in the three lists, the same keys for J K L ; Q W E R T P U
// Run: node tests/campshortcuts.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`window.__camp = (level, seed) => campNew(level, [], { seed: seed || 1 }); window.C1 = __camp(1); window.C3 = __camp(3);`);

// ---- A. the keys ----
check('the power list is O and the autopilot I (the other way round before); the dock list is U; each with its own code', J(`['power', 'nav', 'yard'].map(id => campKeyList(id).key + ':' + campKeyList(id).code).join()`) === 'O:KeyO,I:KeyI,U:KeyU');
check('the ship list (P) has Power first, then Autopilot, then Dock and repair, and the blink after them', J(`campKeyList('ship').rows.map(r => r.id).join()`) === 'gpower,gnav,gyard,blink' && J(`campKeyList('ship').rows.map(r => r.label).join()`) === 'Power,Autopilot,Dock and repair,Warp blink ahead');
check('the lists stand in the table in the order of the keys, so the H page and the key line read O, I, U', J(`CAMP_PANELS.panels.filter(p => p.parent === 'ship').map(p => p.id).join()`) === 'power,nav,yard' && J(`campPanelKeyLine()`) === 'Q Fleet  W All  E Red  R Green  T Yellow    P Ship  O Power  I Autopilot  U Dock');
check('O opens the power list on Shields: one more pip; Enter adds a shield pip and the list stays open (O, Enter)', (() => { g.run(`window.PP = campPanelNew(); window.CP = __camp(1); window.k = (c, t) => campPanelKey(PP, CP, c, t);`); const o = J(`k('KeyO', 0)`), p0 = J('CP.power.p.join()'), r = J(`k('Enter', 1)`); return o.used && !o.ran && o.open === 'power' && J('PP.at') === 0 && r.ran && r.ok && r.row === 'shields' && J('CP.power.p[1]') === 3 && J('CP.power.p.join()') !== p0 && J('PP.open') === 'power'; })());
check('I opens the autopilot list on Fly to the goal, and I, Enter flies there (the keys of the two lists were swapped, their rows were not)', (() => { g.run(`window.PN = campPanelNew(); window.CN = __camp(1); window.kn = (c, t) => campPanelKey(PN, CN, c, t);`); const o = J(`kn('KeyI', 0)`), r = J(`kn('Enter', 1)`); return o.used && !o.ran && o.open === 'nav' && r.ran && r.row === 'goal'; })()); // (no goal in a level 1 battle at the start: the order is given and refused in words, which is the row's answer)
check('the hints follow the table: {powerkey} O, {navkey} I, {yardkey} U; the shields row is reached with {viaemergency} O; the pause card names them in the order of the ship list', J(`['powerkey', 'navkey', 'yardkey', 'viaemergency', 'viagoal', 'viadock'].map(campKeyVar).join()`) === 'O,I,U,O,I,U' && /\{powerkey\} power, \{navkey\} autopilot, \{yardkey\} dock/.test(J(`UI_TEXT['camp.ui.pausepanels']`)));

// ---- B. the names ----
check('the U list is DOCK AND REPAIR and its row in the ship list says Dock and repair; no table, text or key line still says DOCK AND BUILD', J(`campKeyList('yard').title`) === 'DOCK AND REPAIR' && J(`campKeyRow('gyard').label`) === 'Dock and repair' && !/DOCK AND BUILD|Dock and build/i.test(src('src/data_controls.js').replace(/\/\/.*$/gm, '')) && !/Dock and build/i.test(src('README.md').replace(/`/g, '').replace(/dock and build/gi, 'x') + src('src/contenttables.js')));

// ---- C. the table ----
check('CAMP_YARD is the table: dock, buildf, each with id, label, help, when, cost and does', J(`CAMP_YARD.map(r => r.id).join()`) === 'dock,buildf' && J(`CAMP_YARD.every(r => r.id && r.label && r.help && 'when' in r && 'cost' in r && r.does && r.does.order)`));
check('the list\'s rows are the table\'s, as the list had them: the same ids and orders, buildf only aboard (when: aboard), its arg fighter (the escort row went with the escort ship), the words as before', J(`campKeyList('yard').rows.map(r => [r.id, r.order, r.arg || '', r.when || '', r.label].join('|')).join()`) === 'dock|dock|||Dock at the outpost,buildf|build|fighter|aboard|Build a fighter');
check('a level with outposts has the dock row only, a level without them has the build after it (the dock row mends the hull aboard)', J(`campPanelList(C1, 'yard').map(r => r.id).join()`) === 'dock' && J(`campPanelList(C3, 'yard').map(r => r.id).join()`) === 'dock,buildf');
check('the build rows say what they cost from the table\'s `cost` (25 ore a fighter), long and short; the dock row has none; a row that cannot be given now says why instead (needs 25 ore)', J(`CAMP_YARD.map(r => r.cost).join()`) === ',fighter' && J(`campPanelRows(C3, 'yard').slice(1, 2).map(x => x.state + '|' + x.short).join()`) === '25 ore, ' + J('CAMP.build.fighterTime') + ' s|25 ore' && J(`campPanelCost(CAMP_YARD.map(r => campYardRows().find(x => x.id === r.id))[1])`) === '25 ore, ' + J('CAMP.build.fighterTime') + ' s');
check('the table is the one place: change a row of it (a stand-in for a Repair row: other words, another cost kind) and campYardRows() hands the list that row, cost and all; the panel reads nothing else', (() => {
  g.run(`window.__yard0 = JSON.stringify(CAMP_YARD); CAMP_YARD.push({ id: 'repairx', label: 'Repair a ship', help: 'Repair a ship (costs ore)', when: 'aboard', cost: 'fighter', does: { order: 'build', arg: 'fighter' } }); window.__rows = campYardRows();`);
  const ok = J('__rows.map(r => r.id).join()') === 'dock,buildf,repairx' && J(`__rows[2].label`) === 'Repair a ship' && J(`__rows[2].cost`) === 'fighter' && J(`campPanelCost(__rows[2])`) === '25 ore, ' + J('CAMP.build.fighterTime') + ' s' && J(`campPanelCost(__rows[2], true)`) === '25 ore' && J(`campPanelCost(__rows[0])`) === '';
  g.run(`CAMP_YARD.splice(0, CAMP_YARD.length, ...JSON.parse(__yard0));`); return ok && J(`campYardRows().map(r => r.id).join()`) === 'dock,buildf';
})());
check('camppanel.js has no per-row case for the builds any more (the cost words come from the row\'s cost)', !/case 'buildf'|case 'builde'/.test(src('src/camppanel.js')));

// ---- D. nothing else moved ----
check('the lists have the rows they had (less the escort rows, card space-game-cut-escorts): 6 fleet, 4 convoy, 6 squads, 4+4+4 squads, 5 stance, 4 ship, 5 power, 4 autopilot, 2 dock; the direct keys J K L ; are as they were', J(`CAMP_PANELS.panels.map(p => p.rows.length).join()`) === '6,4,6,4,4,4,5,4,5,4,2' && J(`['shields', 'engines', 'weapons', 'balance'].map(id => CAMP_KEYS[id].codes[0]).join()`) === 'KeyJ,KeyK,KeyL,Semicolon');
check('the bots and the shot tool use the table (rows by id, lists by campKeyVia), not a letter: no KeyO or KeyI in tools/campaign-bot.mjs', !/Key[OI]\b/.test(src('tools/campaign-bot.mjs')));

console.log(failed ? `\nCAMP SHORTCUTS FAIL (${failed} of ${n})` : `\nCAMP SHORTCUTS PASS (${n} checks)`); process.exit(failed ? 1 : 0);
