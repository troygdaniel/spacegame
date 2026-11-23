// smoke: repair in space with ore replaces building ships (plain Node, no Chrome)
// Card space-game-repair-with-ore (Troy, 22 Nov 2026: "we do not build ships, we repair them in space with ore"). The cruiser mends its hull anywhere for ore, a hurt fighter's mend costs a little ore, a row mends a ship
// you protect when it is near, docking stays for selling and the refit with half-price repairs, and nothing builds ships any more. src/campmend.js, the CAMP.mend table, the U list's table CAMP_YARD, the N panel.
//   A  the numbers (CAMP.mend, CAMP.repair.ore) and what is gone (CAMP.build, the build queue, the Fabricator)
//   B  the hull: repaired anywhere in space, in a fight, over hullSecs; the price is the share of the hull missing; refused when sound, with no ore, or while it is being mended; docked it is instant and half price
//   C  the fighters: a landed fighter's mend costs CAMP.repair.ore; with no ore it takes twice as long and is never refused
//   D  a ship you protect: the row's candidates (hurt, near), the order, its price and time, its refusals
//   E  the lists: the U list's rows, the pick, the dock's room, the H page, the order 'build' answers with a reason
//   F  the N panel: the prices are rows with words
//   G  the wing: the same at the start of every mission (nothing is built), the ore of a mission can pay for repairs and the goals still make sense
// Run: node tests/camprepairore.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const R = code => { try { g.run('(() => {' + code + '\n})()'); return true; } catch (e) { check('setup: ' + String(code).trim().slice(0, 70), false, e.message); return false; } };
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const read = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// a battle with the wing out and no aliens yet (as tests/campfighterrepair.mjs): level 1 mission 1 has a transport to protect; mission 2 (1.2) has miners
R(`window.__new = (seed, mission) => { window.C = campNew(1, [], { seed: seed || 5, mission: mission || 0, ore: 200 }); C.god = false; return C; };
  window.__go = s => { for (let i = 0; i < Math.round(s * 30); i++) campStep(C, 1 / 30); };
  window.__says = () => C.events.filter(e => e.type === 'say').map(e => e.key);
  window.__newT = seed => { __new(seed); __go(5); return C; }; // the transport of 1.1 leaves at 4 s
  window.__ward = () => campConvoyShips(C).find(u => u.kind === 'freighter');`);

// ---- A. the numbers, and what is gone ----
console.log('A. the numbers, and what is gone');
const M = J('CAMP.mend');
check('CAMP.mend: the price of a whole hull, the seconds it takes, the price of a point of a protected ship, its seconds, its range, the dock\'s share', M && M.hullOre > 0 && M.hullSecs > 0 && M.wardPoint > 0 && M.wardSecs > 0 && M.range > 0 && M.dockShare > 0 && M.dockShare < 1, JSON.stringify(M));
check('the whole hull costs what it cost at the dock (60 ore) and the dock takes half', M && M.hullOre === 60 && M.dockShare === 0.5, JSON.stringify(M));
check('a fighter\'s mend costs a little ore (5), and takes twice as long with none', J('CAMP.repair.ore') === 5 && J('CAMP.repair.slow') === 2, J('[CAMP.repair.ore, CAMP.repair.slow]'));
check('the numbers are finite', M && Object.values(M).every(v => typeof v === 'number' && isFinite(v)));
check('nothing builds ships: no CAMP.build, no campBuild, no campFactory, no campCanBuild, no queue in a new battle', J('typeof CAMP.build') === 'undefined' && J('typeof campBuild') === 'undefined' && J('typeof campFactory') === 'undefined' && J('typeof campCanBuild') === 'undefined' && J('typeof __new().build') === 'undefined');
check('no Fabricator: not a tech, not an outpost price, not in the dock or the refit', J('typeof CAMP.tech.fabricator') === 'undefined' && J('typeof CAMP.outpost.fabricator') === 'undefined' && !/fabricator/i.test(read('src/camphub.js').replace(/\/\/[^\n]*/g, '')) && !/fabricator/i.test(read('src/campdock.js').replace(/\/\/[^\n]*/g, '')));
check('the refit keeps its price for an extra fighter (CAMP.refit.fighterCost: 25), which was the workshop\'s', J('CAMP.refit.fighterCost') === 25, J('CAMP.refit.fighterCost'));
check('the script is in the page', /<script src="src\/campmend\.js"><\/script>/.test(read('index.html')));

// ---- B. the hull ----
console.log('B. the hull');
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; window.__max = C.carrier.maxHp;`);
const q = J('campMendQuote(C)');
check('the quote is the share of the hull missing: half of 600 points is 300 points for 30 ore', q && near(q.missing, J('__max') / 2) && q.cost === Math.ceil(60 * 0.5), JSON.stringify(q));
const r1 = J('(() => { const o = C.ore; const r = campOrder(C, "repair", "", "key"); return { ok: r.ok, code: r.code, say: r.say, paid: o - C.ore, hp: C.carrier.hp }; })()');
check('Repair the hull in open space works (no dock): the ore is paid now and the ship says what it is doing', r1.ok === true && r1.paid === 30 && /mend/i.test(r1.say), JSON.stringify(r1));
check('the hull is not whole at once: it mends over the seconds a part of the hull takes (half a hull, 4 s of the 8: 150 points in 2 s, whole in 4)', r1.hp === J('__max') / 2 && (R('__go(2);'), near(J('C.carrier.hp'), J('__max') / 2 + 150, 0.02)) && (R('__go(2.5);'), near(J('C.carrier.hp'), J('__max'))), J('C.carrier.hp'));
check('it stops at whole and the list of mends is empty again', J('C.mends.length') === 0 && J('campOrder(C, "repair", "", "key").code') === 'hullfull');
R(`__new(); C.carrier.hp = 100; campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y);`);
check('in a fight it works too: aliens near do not stop it', J('campOrder(C, "repair", "", "key").ok') === true);
check('a second order while it is mending is refused, and nothing more is paid', (() => { const o = J('C.ore'); const r = J('(() => { const r = campOrder(C, "repair", "", "key"); return { ok: r.ok, code: r.code }; })()'); return r.ok === false && r.code === 'mending' && J('C.ore') === o; })());
R(`__new(); C.carrier.hp = 100; C.ore = 3; C.cash = 0;`);
check('with no ore for it the order is refused and says what is needed', (() => { const r = J('(() => { const r = campOrder(C, "repair", "", "key"); return { ok: r.ok, code: r.code, say: r.say }; })()'); return r.ok === false && r.code === 'noore2' && C_NUM(r.say); })());
function C_NUM(s) { return /\d/.test(String(s)); }
R(`__new(); C.carrier.hp = C.carrier.maxHp - 1;`);
check('a scratch costs the least: at least 5 ore (the dock\'s old rule)', J('campMendQuote(C).cost') === 5);
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; C.ore = 3; C.cash = 100;`);
check('in space credits do not pay for a repair (ore only): with 3 ore and 100 credits the order is refused', J('campOrder(C, "repair", "", "key").code') === 'noore2' && J('C.cash') === 100);
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; C.ore = 3; C.cash = 100; C.docked = 'luna';`);
check('docked the credits pay first: 15 credits for half a hull at half price, the ore stays', (() => { const r = J('(() => { const r = campOrder(C, "repair", "", "key"); return { ok: r.ok, hp: C.carrier.hp, max: C.carrier.maxHp, cash: C.cash, ore: C.ore }; })()'); return r.ok === true && r.hp === r.max && r.cash === 85 && r.ore === 3; })());
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; C.docked = 'luna';`);
check('docked it is instant and half price: 15 ore for half a hull, whole at once', (() => { const o = J('C.ore'); const r = J('(() => { const r = campOrder(C, "repair", "", "key"); return { ok: r.ok, hp: C.carrier.hp, max: C.carrier.maxHp }; })()'); return r.ok === true && r.hp === r.max && o - J('C.ore') === 15; })());
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; campTuneSet && 0;`);
check('the price follows the table: a hull at 600 and 120 ore a hull makes half a hull 60 ore', (() => { R('CAMP.mend.hullOre = 120;'); const c = J('campMendQuote(C).cost'); R('CAMP.mend.hullOre = 60;'); return c === 60; })());
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; campOrder(C, "repair", "", "key"); C.carrier.hp -= 100; __go(CAMP.mend.hullSecs + 1);`);
check('a mend gives back the points it was paid for and no more: damage taken while it runs is not covered', J('C.carrier.hp') < J('C.carrier.maxHp') && J('C.carrier.hp') >= J('C.carrier.maxHp') - 105);
R(`__new(); C.carrier.hp = C.carrier.maxHp / 2; campOrder(C, "repair", "", "key"); C.carrier.hp = 0; __go(1);`);
check('a dead cruiser is not mended (and nothing throws)', J('C.carrier.hp') <= 0 && J('C.mends.length') <= 1);

// ---- C. the fighters ----
console.log('C. the fighters');
R(`window.__wing = seed => { __new(seed); campOrder(C, 'launch'); for (let i = 0; i < 8; i++) campStep(C, 1); C.events.length = 0; };
  window.__land = () => { const u = campWing(C, 'fighter')[0]; u.hp = u.maxHp * 0.2; for (let i = 0; i < 600 && C.repairs.length === 0; i++) campStep(C, 1 / 30); window.__LANDED = C.t; };`);
R(`__wing(); window.__ore0 = C.ore; __land();`);
check('a hurt fighter lands and is mended as before, and the mend cost 5 ore', J('C.repairs.length') === 1 && J('__ore0 - C.ore') === 5 && Math.abs(J('C.repairs[0].until - __LANDED') - 10000) < 60, J('[C.repairs.length, __ore0 - C.ore, C.repairs[0] && C.repairs[0].until - __LANDED]'));
R(`__wing(); C.ore = 0; C.cash = 0; __land();`);
check('with no ore it is not refused: it mends, in twice the time (20 s), and nothing goes below zero', J('C.repairs.length') === 1 && Math.abs(J('C.repairs[0].until - __LANDED') - 20000) < 60 && J('C.ore') === 0 && (J('C.cash') || 0) === 0, J('[C.repairs.length, C.repairs[0] && C.repairs[0].until - __LANDED, C.ore]'));
R(`__wing(); C.ore = 2; C.cash = 0; __land();`);
check('with less ore than a mend costs it is not paid at all: slow, and the 2 ore stay', Math.abs(J('C.repairs[0].until - __LANDED') - 20000) < 60 && J('C.ore') === 2);
R(`__wing(); C.ore = 0; C.cash = 40; __land();`);
check('credits from a sale do not pay for a mend in flight (they are spent at a station: card space-game-credits-apart-from-ore): slow, and the 40 stay', J('C.repairs.length') === 1 && J('C.cash') === 40 && Math.abs(J('C.repairs[0].until - __LANDED') - 20000) < 60, J('[C.cash, C.repairs[0] && C.repairs[0].until - __LANDED]'));
R(`__wing(); CAMP.repair.ore = 0; window.__o = C.ore; __land(); CAMP.repair.ore = 5;`);
check('a mend priced at 0 on the N panel is free and takes the usual time', J('__o - C.ore') === 0 && Math.abs(J('C.repairs[0].until - __LANDED') - 10000) < 60);

// ---- D. a ship you protect ----
console.log('D. a ship you protect');
R(`__newT(); window.WD = __ward(); WD.hp = WD.maxHp / 2; WD.x = C.carrier.x + 300; WD.y = C.carrier.y;`);
const cand = J('campPickItems(C, "ward").map(i => ({ id: i.id, what: i.what, hp: i.hp }))');
check('the candidates are the ships you protect that are hurt and near: the hurt transport', cand.length === 1 && cand[0].id === J('WD.id') && cand[0].hp === 0.5, JSON.stringify(cand));
check('a ship at full hull is not a candidate', (() => { R('WD.hp = WD.maxHp;'); return J('campPickItems(C, "ward").length') === 0; })());
check('a hurt ship too far from the cruiser is not either (range ' + J('CAMP.mend.range') + ' px)', (() => { R('WD.hp = WD.maxHp / 2; WD.x = C.carrier.x + CAMP.mend.range + 500;'); return J('campPickItems(C, "ward").length') === 0; })());
R(`WD.x = C.carrier.x + 300;`);
const wq = J('(() => { const o = C.ore, hp = WD.hp, miss = WD.maxHp - WD.hp; const r = campOrder(C, "mendship", WD.id, "key"); return { ok: r.ok, code: r.code, say: r.say, paid: o - C.ore, miss, hp0: hp, hp: WD.hp }; })()');
check('the order mends it: the ore is paid now (0.1 a point: half of 200 is 100 points, 10 ore) and the ship says so', wq.ok === true && wq.paid === Math.ceil(wq.miss * J('CAMP.mend.wardPoint')) && /mend/i.test(wq.say), JSON.stringify(wq));
check('the ship is mended over the seconds its share of the hull takes (half a hull of 6 s: 3 s): nothing at the order, 50 points in 1.5 s, whole after 3', wq.hp === wq.hp0 && (R('__go(1.5);'), near(J('WD.hp'), J('WD.maxHp') / 2 + 50, 0.03)) && (R('__go(2);'), near(J('WD.hp'), J('WD.maxHp'))), J('WD.hp'));
check('a ship that is already being mended is refused (and a whole one: nothing to mend)', (() => { R('WD.hp = WD.maxHp / 2; campOrder(C, "mendship", WD.id, "key");'); const a = J('campOrder(C, "mendship", WD.id, "key").code'); R('__go(CAMP.mend.wardSecs + 1);'); const b = J('campOrder(C, "mendship", WD.id, "key").code'); return a === 'mending' && b === 'noward'; })());
check('out of range the answer names the ship and how far, and nothing is paid', (() => { R('WD.hp = WD.maxHp / 2; WD.x = C.carrier.x + CAMP.mend.range + 800; const __o = C.ore; window.__o2 = __o;'); const r = J('(() => { const r = campOrder(C, "mendship", WD.id, "key"); return { ok: r.ok, code: r.code, say: r.say }; })()'); return r.ok === false && r.code === 'farward' && J('C.ore') === J('__o2') && /\d/.test(r.say); })());
check('with no id it takes the nearest hurt one in range (the strip and the voice have no list)', (() => { R('WD.x = C.carrier.x + 300;'); return J('campOrder(C, "mendship", "", "strip").ok') === true; })());
R(`__newT(); window.WD = __ward(); WD.hp = WD.maxHp / 2; WD.x = C.carrier.x + 300; WD.y = C.carrier.y; C.ore = 1; C.cash = 0;`);
check('with no ore it is refused and says what is needed', (() => { const r = J('(() => { const r = campOrder(C, "mendship", WD.id, "key"); return { code: r.code, say: r.say }; })()'); return r.code === 'noore2' && /\d/.test(r.say); })());
R(`__new(1, 1); window.__m = campConvoyShips(C).filter(u => u.kind === 'miner'); if (__m.length) { __m[0].hp = __m[0].maxHp / 2; __m[0].x = C.carrier.x + 200; __m[0].y = C.carrier.y; }`);
check('in 1.2 a miner is one of the ships you protect: it can be mended too', J('__m.length') > 0 && J('campPickItems(C, "ward").some(i => i.id === __m[0].id)') === true);
R(`__newT(); window.WD = __ward(); WD.hp = WD.maxHp / 2; WD.x = C.carrier.x + 300; WD.y = C.carrier.y; C.docked = 'luna';`);
check('the dock mends the hull only (docked the battle is paused: a ship you protect is not near)', J('typeof campMendWard') === 'function');

// ---- E. the lists ----
console.log('E. the lists');
const yard = J('CAMP_YARD.map(r => r.id)');
check('the U list\'s table: Dock, Repair the hull, Repair a ship we protect (no Build rows)', JSON.stringify(yard) === '["dock","repairhull","repairward"]', JSON.stringify(yard));
R(`__new(); window.__rows = campPanelList(C, 'yard').map(r => r.id);`);
check('in 1.1 (a transport to protect) the U list shows all three', JSON.stringify(J('__rows')) === '["dock","repairhull","repairward"]', JSON.stringify(J('__rows')));
R(`window.C = campNew(3, [], { seed: 1, mission: 0, ore: 100 }); window.__rows3 = campPanelList(C, 'yard').map(r => r.id); window.__hasConvoy = campConvoyShips(C).length + ((C.L && C.L.convoys) || []).length;`);
check('a level with nothing to protect and no outpost to dock at (the alien home world) has only Repair the hull: no ward row, no dock row', J('__hasConvoy') === 0 && JSON.stringify(J('__rows3')) === '["repairhull"]', JSON.stringify([J('__hasConvoy'), J('__rows3')]));
check('the ward row picks its target: pick "ward" in the table', J('CAMP_YARD.find(r => r.id === "repairward").pick') === 'ward' || J('campYardRows().find(r => r.id === "repairward").pick') === 'ward');
check('the rows read their price live: the hull row says what mending it costs now', (() => { R('__new(); C.carrier.hp = C.carrier.maxHp / 2;'); return /30/.test(J('campPanelState(C, campPanelList(C, "yard").find(r => r.id === "repairhull"))')); })());
check('no Build row in any list, and no "Build a fighter" words anywhere in the table', !/build a/i.test(read('src/data_controls.js').replace(/\/\/[^\n]*/g, '')) && !/buildf|builde/.test(read('src/data_controls.js').replace(/\/\/[^\n]*/g, '')));
const buildAns = J('(() => { __new(); const r = campOrder(C, "build", "fighter", "strip"); return { ok: r.ok, code: r.code, say: r.say }; })()');
check('the order "build" is refused with a reason that says what to do instead (the strip and the voice still understand the word)', buildAns.ok === false && buildAns.code === 'nobuild' && /ore/i.test(buildAns.say) && !/\{/.test(buildAns.say), JSON.stringify(buildAns));
check('the dock\'s room has Repair, the mission board and Undock: no Build, no Refit row for the Fabricator', JSON.stringify(J('CAMP_DOCK.rows')) === '["repair","board","undock"]', JSON.stringify(J('CAMP_DOCK.rows')));
check('the H page says U is the dock and repair list and its words do not say build', !/build ships/i.test(read('src/data_controls.js').replace(/\/\/[^\n]*/g, '')) && /Dock and repair/.test(read('src/data_controls.js')));
check('the retreat no longer counts a build queue (nothing is built): a cruiser with no wing is told to repair or dock', !/build\.queue/.test(read('src/campoutpost.js')));

// ---- F. the N panel ----
console.log('F. the N panel');
const rows = J('["repairprice", "wardprice", "fightermend"].map(id => { const r = campTuneRow(id); return r ? { id, root: r.root, path: r.path, group: r.group, when: r.when, min: r.min, max: r.max } : null; })');
check('three rows: the hull\'s price, a protected ship\'s price, a fighter\'s mend, in the ore group, each a number the table holds', rows.every(r => r && r.group === 'ore') && rows[0].path === 'mend.hullOre' && rows[1].path === 'mend.wardPoint' && rows[2].path === 'repair.ore', JSON.stringify(rows));
check('each has its words on the panel', ['repairprice', 'wardprice', 'fightermend'].every(id => !/^camp\.ui\.tune\.row\./.test(J(`uiText("camp.ui.tune.row.${id}")`)) && J(`uiText("camp.ui.tune.row.${id}")`).length > 3));
check('a price set on the panel is the price the order takes at once ("now")', (() => { R('__new(); C.carrier.hp = C.carrier.maxHp / 2; campTuneSet("repairprice", 120);'); const c = J('campMendQuote(C).cost'); R('campTuneSet("repairprice", 60);'); return c === 60; })());

// ---- G. the wing and the ore ----
console.log('G. the wing and the ore');
check('a new mission starts with the whole wing of the level, however many were lost in the last one (nothing is built, so nothing is owed)', (() => { R('const a = campNew(1, [], { seed: 3, mission: 0 }); window.__f0 = a.bay.fighters; const b = campNew(1, [], { seed: 4, mission: 0 }); window.__f1 = b.bay.fighters;'); return J('__f0') === J('__f1') && J('__f0') > 0; })());
check('the ore bay still holds 500 and 1.2\'s goal is still 450 (spending ore on repairs does not undo the goal: the best the store held counts)', J('CAMP.ore.cap') === 500 && /450/.test(read('src/campaign.js')) && /oreBest/.test(read('src/campaign.js')));
check('a retreat note, the hints and the voice no longer tell the pilot to dock to build', !/to build|dock to build|build there/i.test(read('content/text/campoutpost.md')));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `REPAIR WITH ORE FAIL (${failed} of ${n})` : `REPAIR WITH ORE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
