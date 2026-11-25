// smoke: the dock and repair list's rows come from a table (CAMP_YARD), and the cruiser list's Dock row is one of them (plain Node, no Chrome)
// Card space-game-ship-shortcuts-o-power (Troy, 22 Nov 2026: the U list renamed and built from data, as prep for repairing ships in space); the O, I, U and P lists it made are deleted (card space-game-delete-off-lists).
//   A. the lists as the game has them: Q the cruiser list (nine rows, the dock row the fourth), W the fleet pick (card space-game-keys5-qwe), the convoy list and the dock list with no key; none of P O I U is a list's key
//   B. the names: the dock list is DOCK AND REPAIR; nothing says DOCK AND BUILD any more in the table, the words or the key line
//   C. the table: the rows of the dock list and the cruiser's Dock row ARE CAMP_YARD (id, label, help, when, cost, does): same ids, same orders, same `when`; a row of the table changed (a stand-in for a Repair row) is the list's row, and its cost words in the list read the table's `cost`
//   D. nothing else moved: the rows of the lists, the same keys for J K L
// Run: node tests/campshortcuts.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`window.__camp = (level, seed) => campNew(level, [], { seed: seed || 1 }); window.C1 = __camp(1); window.C3 = __camp(3);`);

// ---- A. the keys ----
check('the lists as the game has them: the cruiser list has Q (and the ten rows, seven of them live, the dock row the fourth), the fleet pick has W, the friends pick has E, the convoy list and the dock list have no key, and no list has P, O, I or U', J(`campKeyList('cruiser').key`) === 'Q' && J(`campKeyList('cruiser').rows.map(r => r.id).join()`) === 'goal,target,fmine,dock,srepair,sreload,gdock,emergency,blink,formup' && J(`['convoy', 'yard'].map(id => campKeyList(id).key + '|' + campKeyList(id).code).join()`) === '|,|' && J(`CAMP_PANELS.panels.map(p => p.key).join('')`) === 'QWE' && J(`campPanelKeyLine()`) === 'Q Cruiser  W Fleet  E Friends    ');
check('the hints follow the table: {cruiserkey} Q, {yardkey} Q (the dock list is reached through the cruiser list\'s row), {viadock} Q, {viaemergency} Q; the old list keys say nothing', J(`['cruiserkey', 'yardkey', 'viadock', 'viaemergency', 'viagoal', 'fleetkey', 'shipkey', 'powerkey', 'navkey'].map(campKeyVar).join()`) === 'Q,Q,Q,Q,Q,W,,,');


// ---- B. the names ----
check('the dock list is DOCK AND REPAIR and the cruiser list\'s own row that opens it says Dock and repair; no table, text or key line still says DOCK AND BUILD', J(`campKeyList('yard').title`) === 'DOCK AND REPAIR' && J(`campKeyRow('gdock').label`) === 'Dock and repair' && !/DOCK AND BUILD|Dock and build/i.test(src('src/data_controls.js').replace(/\/\/.*$/gm, '')) && !/Dock and build/i.test(src('README.md').replace(/`/g, '').replace(/dock and build/gi, 'x') + src('src/contenttables.js')));

// ---- C. the table ----
check('CAMP_YARD is the table: dock, repairhull, repairward, each with id, label, help, when, cost and does (card space-game-repair-with-ore swapped the Build rows for Repair rows)', J(`CAMP_YARD.map(r => r.id).join()`) === 'dock,repairhull,repairward' && J(`CAMP_YARD.every(r => r.id && r.label && r.help && 'when' in r && 'cost' in r && r.does && r.does.order)`));
check('the rows are the table\'s: the same ids and orders (the dock row is the cruiser list\'s), the dock only where there is an outpost (when: outpost), the ward row only where there are ships to protect (when: convoy), and the words', J(`campKeyList('cruiser').rows.concat(campKeyList('yard').rows).filter(r => ['dock', 'repairhull', 'repairward'].includes(r.id)).map(r => [r.id, r.order, r.arg || '', r.when || '', r.label].join('|')).join()`) === 'dock|dock||outpost|Dock at the outpost,repairhull|repair|||Repair the hull,repairward|mendship||convoy|Repair a ship we protect');
check('a level with outposts and a convoy has the dock row in the cruiser list and both repair rows in the dock list, a level with neither has the hull row alone (the dock row is for an outpost to dock at)', J(`campPanelList(C1, 'cruiser').some(r => r.id === 'dock')`) && /^repairhull(,repairward)?$/.test(J(`campPanelList(C1, 'yard').map(r => r.id).join()`)) && J(`campPanelList(C3, 'yard').map(r => r.id).join()`) === 'repairhull');
check('the repair rows say what they cost from the table\'s `cost`, live: the hull row "N ore, N s" and short "N ore" when it is hurt, "hull sound" when it is not; the ward row has the price of the nearest hurt ship, nothing when none; the dock row has none', (() => { g.run(`C3.ore = 200; C3.carrier.hp = C3.carrier.maxHp / 2;`); const hurt = J(`campPanelRows(C3, 'yard').find(x => x.id === 'repairhull')`); g.run(`C3.carrier.hp = C3.carrier.maxHp;`); const sound = J(`campPanelRows(C3, 'yard').find(x => x.id === 'repairhull')`); return J(`CAMP_YARD.map(r => r.cost).join()`) === ',hull,ward' && /^\d+ ore, \d+ s$/.test(hurt.state) && /^\d+ ore$/.test(hurt.short) && sound.ok === false && sound.state === 'the hull is sound'; })());
check('the table is the one place: change a row of it (a stand-in for another Repair row: other words, a cost kind) and campYardRows() hands the list that row, cost and all; the panel reads nothing else', (() => {
  g.run(`window.__yard0 = JSON.stringify(CAMP_YARD); CAMP_YARD.push({ id: 'repairx', label: 'Repair another', help: 'Repair another (costs ore)', when: '', cost: 'hull', does: { order: 'repair' } }); window.__rows = campYardRows();`);
  const ok = J('__rows.map(r => r.id).join()') === 'dock,repairhull,repairward,repairx' && J(`__rows[3].label`) === 'Repair another' && J(`__rows[3].cost`) === 'hull' && J(`campPanelCost(C3, __rows[3])`) !== '' && J(`campPanelCost(C3, __rows[0])`) === '';
  g.run(`CAMP_YARD.splice(0, CAMP_YARD.length, ...JSON.parse(__yard0));`); return ok && J(`campYardRows().map(r => r.id).join()`) === 'dock,repairhull,repairward';
})());
check('camppanel.js has no per-row case for the builds any more (the cost words come from the row\'s cost)', !/case 'buildf'|case 'builde'/.test(src('src/camppanel.js')));

// ---- D. nothing else moved ----
check('the lists have the rows they had after the five lists went (card space-game-delete-off-lists): 10 cruiser (Dock and repair, Reload and the blink are switched off: 7 live), 4 fleet pick, 9 friends pick, 4 convoy, 2 dock (repair the hull, repair a ship we protect); the direct keys J K L are as they were, and the semicolon\'s balance key is gone', J(`CAMP_PANELS.panels.map(p => p.rows.length).join()`) === '10,4,9,4,2' && J(`['shields', 'engines', 'weapons'].map(id => CAMP_KEYS[id].codes[0]).join()`) === 'KeyJ,KeyK,KeyL' && J(`'balance' in CAMP_KEYS`) === false && !J(`CAMP_PANELS.panels.some(p => p.rows.some(r => r.id === 'balance'))`));
check('the bots and the shot tool use the table (rows by id, lists by campKeyVia), not a letter: no KeyO or KeyI in tools/campaign-bot.mjs', !/Key[OI]\b/.test(src('tools/campaign-bot.mjs')));

console.log(failed ? `\nCAMP SHORTCUTS FAIL (${failed} of ${n})` : `\nCAMP SHORTCUTS PASS (${n} checks)`); process.exit(failed ? 1 : 0);
