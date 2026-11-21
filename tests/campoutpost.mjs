// smoke: the Campaign's friendly outposts (plain Node, no Chrome): where they are, docking, the build and repair rules, the Fabricator, the retreat line
// Card space-game-campaign-outposts (src/campoutpost.js; CAMP.outpost and the `outposts` of each level in src/campaign.js; the room's rows are src/campdock.js, tests/campdock.mjs).
//   A. the data: the outposts of each level, the table's numbers, the Fabricator as a tech
//   B. docking: in range, out of range, by name, with aliens near, twice, undocking; the event the scene hears
//   C. the rules: building refused undocked and allowed docked; the shield recharge, mining and every other order anywhere; the Fabricator lifts the build rule, not the repair rule
//   D. repair: docked only, for ore in proportion to the hull missing; full hull and too little ore say so
//   E. the retreat: low hull and no ship left says where to go and how long it takes on Fast; the goal and the list follow; said once; not when ships are left
//   F. the words: the strip (dock, repair), the panel's Dock row and the why-texts, every string
// Run: node tests/campoutpost.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`window.N = (lv, techs) => { window.C = campNew(lv, techs || [], { seed: 1 }); C.ships = C.ships.filter(u => u.team !== 'alien'); return C; }; window.__at = (x, y) => { C.carrier.x = x; C.carrier.y = y; C.carrier.vx = 0; C.carrier.vy = 0; };`);
const O = J('CAMP.outpost');

// ---- A. the data ----
check('the table of numbers is CAMP.outpost: range, clear, repairOre, retreatHull, fabricator', ['range', 'clear', 'repairOre', 'retreatHull', 'fabricator'].every(k => typeof O[k] === 'number') && O.retreatHull > 0 && O.retreatHull < 1 && O.fabricator < J('CAMP.ore.cap'));
const ids = lv => J(`campOutposts(${JSON.stringify(lv)}).map(o => o.id)`);
check('the Earth level has Earth, Luna and the Mars base; the belt has Ceres, Vesta, Earth and the Mars base; Alpha Centauri the gate at Proxima b; the home world none', ids('home').join() === 'earth,luna,mars' && ids(1).join() === 'ceres,vesta,earth,mars' && ids(2).join() === 'proxima' && ids(3).length === 0);
check('an outpost is a place of its level with its name and size: the Lunar base is Luna, 45 px, 238, -137; the gate at Proxima b is called Proxima Gate', (() => { const l = J(`campOutposts('home').find(o => o.id === 'luna')`), p = J(`campOutposts(2)[0]`); return l.name === 'Lunar base' && l.place === 'Luna' && l.x === 238 && l.y === -137 && l.r === 45 && l.range === O.range && p.name === 'Proxima Gate' && p.place === 'Proxima b'; })());
check('every outpost of every level is a place that exists and is not hidden (a hidden place is not one)', ['home', 1, 2, 3].every(lv => J(`Object.keys(CAMP.levels[${JSON.stringify(lv)}].outposts || {}).every(id => !!campPlaces(${JSON.stringify(lv)})[id] && !campPlaces(${JSON.stringify(lv)})[id].hidden)`)));
check('a level with no outposts table, or an unknown level, has none and nothing throws', J(`campOutposts('nowhere').length`) === 0 && J(`(() => { const L = CAMP.levels[3]; return campOutposts(3).length; })()`) === 0);
check('the Fabricator is a tech of the table that no level offers (after 0): the picks never list it, and it has its name and its words', J('CAMP.tech.fabricator.after') === 0 && [1, 2, 3].every(lv => !J(`campTechChoices(${lv})`).includes('fabricator')) && J(`uiText('camp.tech.fabricator.name')`) === 'Fabricator' && /anywhere/.test(J(`uiText('camp.tech.fabricator.text')`)));

// ---- B. docking ----
g.run(`N('home');`);
check('the carrier starts at the Lunar base (133 px from Luna\'s middle): in range of it and of nothing else', (() => { const nr = J('campOutpostNear(C)'); return nr && nr.o.id === 'luna' && nr.d < O.range && nr.d > 0; })());
const ck = J(`campCheck(C, 'dock', '')`);
check('the dock order says it can (dry), changes nothing, and names the outpost: "Docking at Lunar base."', ck.ok && ck.say === 'Docking at Lunar base.' && J('C.docked') === '' && J('C.events.filter(e => e.type === "docked").length') === 0);
g.run(`C.carrier.vx = 50; C.carrier.vy = 20; C.input.thrust = 1; window.__r = campOrder(C, 'dock', '', 'key');`);
check('docking: the order is done, the carrier is held (no speed, no thrust), C.docked is the outpost, the scene is told with an event "docked" (the bay\'s own "dock" event is another thing)', J('__r.ok') === true && J('C.docked') === 'luna' && J('C.carrier.vx') === 0 && J('C.carrier.vy') === 0 && J('C.input.thrust') === 0 && J('C.events.filter(e => e.type === "docked" && e.id === "luna" && e.name === "Lunar base").length') === 1 && J('C.events.filter(e => e.type === "dock").length') === 0);
check('docked twice says so; undocking frees the carrier and tells the scene', J(`campOrder(C, 'dock', '').say`) === 'Already docked, pilot.' && J('campUndock(C)') === true && J('C.docked') === '' && J('C.events.some(e => e.type === "undocked")') && J('campUndock(C)') === false);
g.run(`__at(4000, 3000);`);
check('out of range: "No outpost in range. Mars base is ... km away." with the nearest by its edge, in km', (() => { const r = J(`campOrder(C, 'dock', '')`); return !r.ok && /^No outpost in range\. [A-Za-z ]+ is [\d,]+ km away\.$/.test(r.say) && J('C.docked') === ''; })(), J(`campOrder(C, 'dock', '').say`));
g.run(`__at(238 + 100, -137 + 150);`);
check('a named outpost: "dock at luna" and "dock at the lunar base" find it (in range), "dock at mars" from here is too far, "dock at narnia" is unknown', (() => { const a = J(`campCheck(C, 'dock', 'luna')`), b = J(`campCheck(C, 'dock', 'the lunar base')`), c = J(`campCheck(C, 'dock', 'mars')`), d = J(`campCheck(C, 'dock', 'narnia')`); return a.ok && b.ok && !c.ok && /Mars base is [\d,]+ km away/.test(c.say) && !d.ok && d.say === 'I know no outpost called narnia, pilot.'; })());
g.run(`C.ships.push({ id: 'a1', team: 'alien', kind: 'raider', x: C.carrier.x + CAMP.outpost.clear - 50, y: C.carrier.y, hp: 50, r: 10, vx: 0, vy: 0 });`);
check('aliens within CAMP.outpost.clear of the carrier keep the doors shut: "Aliens too close to dock at Lunar base, pilot." and nothing changes', (() => { const r = J(`campOrder(C, 'dock', '')`); return !r.ok && r.say === 'Aliens too close to dock at Lunar base, pilot.' && J('C.docked') === ''; })());
g.run(`C.ships = C.ships.filter(u => u.team !== 'alien'); C.ships.push({ id: 'a2', team: 'alien', kind: 'raider', x: C.carrier.x + CAMP.outpost.clear + 100, y: C.carrier.y, hp: 50, r: 10, vx: 0, vy: 0 });`);
check('an alien beyond that is no hindrance', J(`campCheck(C, 'dock', '').ok`) === true);
g.run(`N(3);`);
check('a level with no outposts: "There is no outpost in this system, pilot."', J(`campOrder(C, 'dock', '').say`) === 'There is no outpost in this system, pilot.');
g.run(`N(1); __at(campPlaces(1).ceres.x + 140, campPlaces(1).ceres.y + 30);`);
check('the belt: the cruiser starts at Occator Works (Ceres) and docks there', J(`campOutpostNear(C).o.name`) === 'Occator Works' && J(`campOrder(C, 'dock', '').say`) === 'Docking at Occator Works.' && J('C.docked') === 'ceres');
g.run(`N('home'); C.result = 'won';`);
check('a battle that is over cannot dock', J(`campOrder(C, 'dock', '').ok`) === false);

// ---- C. the rules ----
g.run(`N('home'); C.ore = 200;`);
const nb = J(`campOrder(C, 'build', 'fighter')`);
check('undocked, building is refused with "Dock at an outpost to build." and costs nothing, even in range of an outpost, even with the ore', !nb.ok && nb.say === 'Dock at an outpost to build.' && nb.code === 'nodock' && J('C.ore') === 200 && J('C.build.queue.length') === 0);
check('the dry check says the same (the panel row and the strip ask it first), for a fighter and for an escort', J(`campCheck(C, 'build', 'fighter').code`) === 'nodock' && J(`campCheck(C, 'build', 'two escorts').code`) === 'nodock');
g.run(`C.docked = 'luna';`);
check('docked, it is allowed: 25 ore, one queued; the other rules of building (the bay\'s room, the ore) are as they were', J(`campOrder(C, 'build', 'fighter').ok`) === true && J('C.ore') === 175 && J('C.build.queue.length') === 1 && (g.run('C.ore = 5'), J(`campOrder(C, 'build', 'fighter').code`) === 'noore2'));
g.run(`N('home'); C.ore = 200; C.shield = 10; __at(3000, 3000);`);
check('the shield is recharged in the ship anywhere, with ore: far from every outpost, undocked, it works and costs ore', J(`campOrder(C, 'recharge', 'carrier').ok`) === true && J('C.shield') === J('CAMP.carrier.shield') && J('C.ore') < 200);
check('mining and the other orders do not ask for a dock: the check says "no ships out", not "dock"', J(`campCheck(C, 'mine', '').code`) !== 'nodock' && ['launch', 'attack', 'escort', 'guard', 'recall'].every(o => J(`campCheck(C, '${o}', '').code`) !== 'nodock'));
g.run(`N('home', ['fabricator']); C.ore = 200; __at(3000, 3000);`);
check('with the Fabricator the carrier builds anywhere, undocked and far from every outpost: the same ore, the same queue', J('campCanBuild(C)') === true && J(`campOrder(C, 'build', 'escort').ok`) === true && J('C.ore') === 155 && J('C.build.queue.length') === 1);
g.run(`N('home'); C.ore = 200;`);
check('without it the same carrier, docked or not: campCanBuild follows the dock only', J('campCanBuild(C)') === false && (g.run(`C.docked = 'earth'`), J('campCanBuild(C)') === true) && (g.run(`C.docked = ''`), J('campCanBuild(C)') === false));

// ---- D. repair ----
g.run(`N('home'); C.ore = 100; C.carrier.hp = C.carrier.maxHp * 0.6; window.__max = C.carrier.maxHp;`);
check('undocked, repairing is refused: "Dock at an outpost to repair." (the Fabricator does not lift it)', J(`campOrder(C, 'repair', '').say`) === 'Dock at an outpost to repair.' && J('C.carrier.hp') < J('__max') && (g.run(`C.techs.push('fabricator')`), J(`campOrder(C, 'repair', '').code`) === 'norepair'));
g.run(`C.techs = []; C.docked = 'luna'; window.__hp = C.carrier.hp;`);
const mc = J(`campCheck(C, 'repair', '')`);
check('docked, the dry check says what it would do and changes nothing', mc.ok && /^Hull mended: \d+ points for \d+ ore\.$/.test(mc.say) && J('C.carrier.hp') === J('__hp') && J('C.ore') === 100);
g.run(`window.__missing = C.carrier.maxHp - C.carrier.hp; window.__cost = Math.max(5, Math.ceil(CAMP.outpost.repairOre * __missing / C.carrier.maxHp)); window.__r = campOrder(C, 'repair', '');`);
check('docked, the hull is mended to full for ore in proportion to what was missing (repairOre for all of it, at least 5), and the scene is told', J('__r.ok') && J('C.carrier.hp') === J('C.carrier.maxHp') && J('C.ore') === 100 - J('__cost') && J('C.events.some(e => e.type === "mend")') && J('C.orders.repair') === 1);
check('a sound hull says so and costs nothing', J(`campOrder(C, 'repair', '').say`) === 'The hull is sound, pilot.' && J('C.ore') === 100 - J('__cost'));
g.run(`C.carrier.hp = C.carrier.maxHp * 0.3; C.ore = 3;`);
check('too little ore: "Not enough ore: N needed, 3 in the store." and the hull stays hurt', (() => { const r = J(`campOrder(C, 'repair', '')`); return !r.ok && /^Not enough ore: \d+ needed, 3 in the store\.$/.test(r.say) && J('C.carrier.hp') < J('C.carrier.maxHp'); })());
check('mending the whole hull from nothing costs CAMP.outpost.repairOre', (() => { g.run(`N('home'); C.docked = 'luna'; C.ore = 200; C.carrier.hp = 1;`); const r = J(`campCheck(C, 'repair', '')`); const m = /for (\d+) ore/.exec(r.say); return m && Math.abs(+m[1] - O.repairOre) <= 1; })());

// ---- E. the retreat ----
g.run(`N('home'); C.bay.fighters = 0; C.bay.escorts = 0; C.carrier.hp = C.carrier.maxHp * 0.2; __at(4800, -2000);`);
const rt = J('campRetreat(C)'), eta = J(`campNavEta(C, Math.hypot(campPlaces('home')[campRetreat(C).o.id].x - C.carrier.x, campPlaces('home')[campRetreat(C).o.id].y - C.carrier.y), true)`);
check('low hull and no ship left: the line is "Retreat to <the nearest outpost\'s place>: N s on Fast." with the flight the map says on Fast', rt && /^Retreat to [A-Za-z ]+: \d+ s on Fast\.$/.test(rt.line) && rt.secs === eta && !rt.near && rt.line.indexOf(rt.o.place) > 0, JSON.stringify(rt));
g.run(`__at(238 + 4500 * 0.867, -137 - 4500 * 0.499);`);
check('the nearest is the nearest by the edge of the place: from out beyond Luna it is Mars, from the far side of Earth it is Earth', J('campRetreat(C).o.id') === 'mars' && (g.run('__at(-4000, 100)'), J('campRetreat(C).o.id') === 'earth'));
g.run(`__at(238 + 4500, -137); C.carrier.hp = C.carrier.maxHp * 0.2;`);
check('"11 s on Fast" is what 4,500 px to a place says: the map\'s ETA at the burn (2.2x: 462 px/s, times 1.1; card space-game-campaign-fast-board)', J(`campNavEta(C, 4500, true)`) === 11);
check('the goal of the map and the HUD arrow is that outpost while it lasts; the list row of that place says outpost and is the goal row', (() => { const g1 = J('campNavGoal(C)'), rows = J('campNavRows(C)'); const goal = rows.find(r => r.goal), row = rows.find(r => r.id === 'place:' + J('campRetreat(C).o.id')); return g1 && g1.id === 'place:' + J('campRetreat(C).o.id') && goal && goal.of === g1.id && row && row.outpost === true; })());
g.run(`C.bay.fighters = 1;`);
check('a ship left in the bay (or out, launching or building) and there is no retreat: the line is for a carrier alone', J('campRetreat(C)') === null && (g.run('C.bay.fighters = 0; C.build.queue.push({ kind: "fighter", left: 6 })'), J('campRetreat(C)') === null) && (g.run('C.build.queue.length = 0; C.launchQ.push("fighter")'), J('campRetreat(C)') === null));
g.run(`C.launchQ.length = 0; C.carrier.hp = C.carrier.maxHp * 0.5;`);
check('a hull above CAMP.outpost.retreatHull is not low, alone or not', J('campRetreat(C)') === null && (g.run('C.carrier.hp = C.carrier.maxHp * (CAMP.outpost.retreatHull + 0.01)'), J('campRetreat(C)') === null) && (g.run('C.carrier.hp = C.carrier.maxHp * (CAMP.outpost.retreatHull - 0.01)'), J('campRetreat(C)') !== null));
g.run(`__at(238 + 100, -137 + 150);`);
check('in range of an outpost the line says to dock: "E 6  dock at <place>" (E opens the SHIP panel, 6 is its dock row); docked, there is none; a level with no outposts has none', (() => { const r = J('campRetreat(C)'); const a = r && r.near && r.line === `E 6  dock at ${r.o.place}`; g.run(`C.docked = 'luna'`); const b = J('campRetreat(C)') === null; g.run(`N(3); C.bay.fighters = 0; C.bay.escorts = 0; C.carrier.hp = 10;`); return a && b && J('campRetreat(C)') === null; })());
g.run(`N('home'); C.bay.fighters = 0; C.bay.escorts = 0; __at(3000, 3000); C.events.length = 0; C.carrier.hp = C.carrier.maxHp * 0.2; campOutpostTick(C, 0.03); campOutpostTick(C, 0.03); window.__s1 = C.events.filter(e => e.type === 'say' && /retreat/.test(e.key)).length;`);
check('the ship says it once when it begins ("Hull low, no ships. Retreat to ...")', J('__s1') === 1 && /^Hull low, no ships\. Retreat to [A-Za-z ]+: \d+ seconds on Fast\.$/.test(J(`uiText(C.events.find(e => e.type === 'say').key, C.events.find(e => e.type === 'say').vars)`)));
g.run(`C.carrier.hp = C.carrier.maxHp; campOutpostTick(C, 0.03); C.carrier.hp = C.carrier.maxHp * 0.1; campOutpostTick(C, 0.03);`);
check('and again only after it has cleared: mended, then hurt again is a new one (two lines in all)', J(`C.events.filter(e => e.type === 'say' && /retreat/.test(e.key)).length`) === 2);
g.run(`N('home'); C.bay.fighters = 0; C.bay.escorts = 0; C.carrier.hp = C.carrier.maxHp * 0.2; C.events.length = 0; campStep(C, 0.5);`);
check('the sim ticks it itself (campStep): the line is said without the scene', J(`C.events.some(e => e.type === 'say' && /retreat/.test(e.key))`));

g.run(`N('home');`);
check('the map and the list know the outposts: marks and list rows carry outpost: true for the level\'s outposts and for no other place', (() => { const marks = J(`campMapMarks(C, true).filter(m => m.type === 'place')`), rows = J(`campNavRows(C).filter(r => r.group === 'places')`); return marks.filter(m => m.outpost).map(m => m.id).sort().join() === 'earth,luna,mars' && marks.some(m => !m.outpost) && rows.filter(r => r.outpost).map(r => r.id.slice(6)).sort().join() === 'earth,luna,mars' && rows.some(r => !r.outpost); })());
check('and in the belt the whole system shows four stations: Ceres, Vesta, Earth and Mars (the far ones only in the whole view)', J(`(() => { const C1 = campNew(1, [], { seed: 1 }); return campMapMarks(C1, true).filter(m => m.outpost).map(m => m.id).sort().join() + '|' + campMapMarks(C1, false).filter(m => m.outpost).map(m => m.id).sort().join(); })()`) === 'ceres,earth,mars,vesta|ceres,vesta');

// ---- F. the words ----
check('"dock at Luna", "land at the lunar base", "put in at Mars", "dock at an outpost" are Dock with the place in the words (the carrier docks); a bare "dock", "land" and "retreat" are still the wing\'s Recall; "retreat to Luna" flies there; "repair the hull", "mend the ship", "fix the damage" are Repair; "repair the shields" is still Recharge', (() => { const I = t => J(`campIntent(${JSON.stringify(t)})`); return I('dock at an outpost').act === 'fleet_dock' && I('dock at an outpost').arg === '' && I('dock').act === 'fleet_recall' && I('land').act === 'fleet_recall' && I('retreat').act === 'fleet_recall' && I('retreat to Luna').act === 'fleet_fly' && I('retreat to Luna').arg === 'luna' && I('land at the base').act === 'fleet_recall' && I('dock at Luna').arg === 'luna' && I('land at the lunar base').act === 'fleet_dock' && /lunar base/.test(I('land at the lunar base').arg) && I('put in at Mars').act === 'fleet_dock' && I('repair the hull').act === 'fleet_repair' && I('mend the ship').act === 'fleet_repair' && I('fix the damage').act === 'fleet_repair' && I('repair the shields').act === 'fleet_recharge' && I('build two fighters').act === 'fleet_build'; })());
check('the strip\'s closed list has fleet_dock and fleet_repair, and the model is told of them', J(`typeof SC_ACTS === 'object' ? Object.keys(SC_ACTS).includes('fleet_dock') && Object.keys(SC_ACTS).includes('fleet_repair') : true`) && /fleet_dock/.test(src('src/shipcomputer.js')) && /fleet_repair/.test(src('src/shipcomputer.js')));
check('the SHIP panel has a sixth row, Dock (an order), and every refusal of this card has its few words under a row', J(`CAMP_PANELS.panels[1].rows[5].id`) === 'dock' && J(`CAMP_PANELS.panels[1].rows[5].order`) === 'dock' && ['nodock', 'norepair', 'docked', 'noposts', 'whichpost', 'farpost', 'hotdock', 'hullfull'].every(c => J(`typeof CAMP_PANELS.why['${c}']`) === 'string') && J('CAMP_PANELS.why.nodock') === 'Dock at an outpost to build.');
g.run(`N('home');`);
check('the panel rows: with the carrier at the Lunar base Dock says "dock at Lunar base", Build a fighter says "Dock at an outpost to build."; docked, Build says its cost and Dock says "already docked"', (() => { const rows = () => J(`campPanelRows(C, 'ship')`); const a = rows(); g.run(`C.docked = 'luna'`); const b = rows(); return a[5].ok && a[5].state === 'dock at Lunar base' && !a[2].ok && a[2].state === 'Dock at an outpost to build.' && b[2].ok === (J('C.ore') >= 25) && !b[5].ok && b[5].state === 'already docked'; })());
const md = src('content/text/campoutpost.md'), keys = ['camp.no.nodock', 'camp.no.norepair', 'camp.no.docked', 'camp.no.noposts', 'camp.no.whichpost', 'camp.no.farpost', 'camp.no.hotdock', 'camp.no.hullfull', 'camp.say.dock', 'camp.say.repair', 'camp.say.undock', 'camp.say.retreat', 'camp.say.retreatnear', 'camp.hud.retreat', 'camp.hud.dockhint', 'camp.tech.fabricator.name', 'camp.tech.fabricator.text'];
check('every word of this card is in its own content file (ui.md is full) and in the defaults, and none reads as its own key', keys.every(k => md.indexOf('| ' + k + ' |') >= 0 && !/^camp\./.test(J(`uiText(${JSON.stringify(k)}, { name: 'X', km: 1, pts: 1, ore: 1, s: 1 })`))));
const sc = src('src/campoutpost.js').replace(/\/\/.*$/gm, '');
check('src/campoutpost.js is the pure half: nothing of Phaser, the page, the clock or Math.random', !/\b(Phaser|document|window|localStorage|setTimeout|Math\.random|performance|Date)\b/.test(sc));
check('it is loaded once, after campaign.js and campnav.js', (() => { const h = src('index.html'); return (h.match(/src\/campoutpost\.js/g) || []).length === 1 && h.indexOf('src/campaign.js') < h.indexOf('src/campoutpost.js') && h.indexOf('src/campnav.js') < h.indexOf('src/campoutpost.js'); })());
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN OUTPOST FAIL (${failed} of ${n})` : `CAMPAIGN OUTPOST PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
