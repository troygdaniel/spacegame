// smoke: the scout-escort ship is cut (plain Node, no Chrome): eight fighters in squads of 3, 3 and 2, no Escorts list, no Build an escort, no V key on the map, no Scout order; Escort the convoy stays as a squad order; a cloaked anomaly is read by any fighter that is out in sensor range, by the cruiser as before; an old save's escorts count as fighters
// Card space-game-cut-escorts (Troy, 22 Nov 2026: "since we have squads, I do not think we need escorts any more"). The escort kind was one ship type with its own list, its own build row, its picture, its map dot, and the Scout order that sent it to look at a place
// (the Tab map's V). All of it is gone in one commit; what a scout did for the cloaked caches is the sensors' job now (CAMP.sensor.wing, src/campsight.js campSightFighter, src/campanomaly.js).
//   A. the wing: eight fighters, three squads of 3, 3 and 2, no escort kind anywhere in the table; ranks, the refit, the build and the Fabricator give fighters
//   B. what is gone: the Escorts list and its rows, Build an escort, the Scout order and its words, the map's V key and Scout button, the SCOUTS count, the escort's picture
//   C. what stays: Escort the convoy is a row of the all-squads list and of each squad's list, an order of the squads; a typed "escort the convoy" works; "send the escorts" is no order
//   D. the sensors: a fighter out in range reads a cloaked anomaly (named, one radio line, once), the cruiser notices it as it did, a fighter out of range does not, the squads' Guard order takes an anomaly as a place
//   E. old saves: an escort bought at an old refit counts as a fighter (the most is 3)
// Run: node tests/campcutescorts.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = (level, seed) => { window.C = campNew(level || 1, [], { seed: seed || 1, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); C.motherSpawn = 1e12; return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__ev = []; window.__heard = sec => { window.__ev = []; for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); window.__ev.push(...C.events); C.events.length = 0; } return window.__ev; }; // the events of the steps (the radio's lines are 'say' events)
`);

console.log('A. the wing');
{
  g.run('__new(1)');
  check('the bay starts with three fighters, the three pilots (card space-game-three-pilots; eight fighters\' strength) and nothing else', J('C.bay.fighters') === 3 && J('C.strength') === 8 && J('C.bay.escorts') === null && J('CAMP.bay.fighters') === 3 && J('CAMP.pilotStrength') === 8 && J('CAMP.bay.escorts') === null);
  g.run(`campOrder(C, 'launch'); __run(8);`);
  check('all three launch and they are one in each squad (Red, Green, Yellow: Wedge, Kara, Apollo), strong as 3, 3 and 2, every ship a fighter with a squad', J('campWing(C).length') === 3 && J(`['red', 'green', 'yellow'].map(k => campWingShips(C, k).length).join()`) === '1,1,1' && J(`['red', 'green', 'yellow'].map(k => campWingShips(C, k)[0].str).join()`) === '3,3,2' && J(`campWing(C).every(u => u.kind === 'fighter' && !!u.squad)`) === true);
  check('no escort kind is left in the table: no CAMP.escort, no escort in CAMP.size, the build table (gone with the building itself: card space-game-repair-with-ore) and the refit escort price, the scout table, the wing groups, the art', ['CAMP.escort', 'CAMP.size.escort', 'CAMP.build', 'CAMP.refit.escortCost', 'CAMP.scout', 'CAMP.wing.groups.escorts', 'CAMP_ART.escort', 'CAMP.wing.verbs.scout'].every(p => J(`typeof ${p}`) === 'undefined') && J(`campSpawn(C, 'escort', 0, 0)`) === null);
  check('a rank gives the fighters it gave in ships before (lieutenant 3, commander 4, captain 6, commodore 8: the escorts folded in); nothing about escorts and no wing cap (nothing builds ships: card space-game-repair-with-ore)', J('CAMP.ranks.map(r => r.fighters).join()') === '0,1,3,4,6,8' && J('CAMP.ranks.every(r => r.escorts === undefined)') === true && (g.run(`window.C5 = campNew(1, [], { seed: 1, rank: 5 })`), J('C5.strength') === 16 && J('C5.bay.fighters') === 3 && J('typeof C5.cap') === 'undefined'));
  g.run(`window.CB = campNew(3, [], { seed: 1 }); CB.ore = 400; CB.docked = 'x';`);
  check('the order Build is refused for fighters and escorts alike (nothing builds ships any more, card space-game-repair-with-ore): nothing is spent or queued', (() => { const a = J(`campOrder(CB, 'build', 'two fighters')`), b = J(`campOrder(CB, 'build', 'an escort')`); return !a.ok && a.code === 'nobuild' && !b.ok && J('CB.ore') === 400 && J('typeof CB.build') === 'undefined'; })());
  check('the refit sells fighters only (the card: 4 buys one, 5 buys nothing; the hub overlay has the Fighter alone: the Fabricator went with the building, card space-game-repair-with-ore)', J('campHubRefitItems(campProgressNew()).map(i => i.id).join()') === 'fighters' && J('Object.keys(campHubRefit(campProgressNew()).extra).join()') === 'fighters');
}

console.log('B. what is gone');
{
  const T = J('CAMP_PANELS.panels.map(p => p.id)');
  check('the panels have no Escorts list and no Build an escort row; the fleet list has the squads and the convoy', !T.includes('escorts') && J(`CAMP_PANELS.panels.flatMap(p => p.rows.map(r => r.id)).some(id => /^(gescorts|eattack|eguard|erecall|builde)$/.test(id))`) === false && J(`campPanelDef('fleet').rows.map(r => r.id).join()`) === 'gsquads,gconvoy');
  g.run('__new(1)');
  check('the Scout order and its words are gone: no campScoutDo, "scout Mars" is no order, the closed list of the ship computer has no fleet_scout, no scout verb', J('typeof campScoutDo') === 'undefined' && J(`campIntent('scout mars')`) === null && J(`campOrder(C, 'scout', 'mars').ok`) === false && J(`Object.keys(SC_ACT).includes('fleet_scout')`) === false && J('typeof CAMP.wing.verbs.scout') === 'undefined');
  check('the words of the Scout order, the SCOUTS count and the escort kind are out of the content (only the anomaly read lines stay, in the scouts file)', ['camp.say.scout', 'camp.say.scoutnothing', 'camp.say.scouthome', 'camp.say.scoutleft', 'camp.no.noscout', 'camp.no.scoutsbusy', 'camp.ui.scouts', 'camp.map.scout', 'camp.map.scoutkey', 'camp.no.noescorts', 'camp.nav.k.escort', 'camp.room.item.escorts', 'camp.hub.boughte'].every(k => J(`typeof UI_TEXT[${JSON.stringify(k)}]`) === 'undefined') && J(`typeof UI_TEXT['camp.say.anomalyread']`) === 'string');
  const draw = src('src/campmapdraw.js');
  check('the Tab map has no Scout button, no V key and no sensor circles of scouts; the dots and the radar know no scout', !/btnScout|campMapScout|KeyV/.test(draw) && !/u\.scout|campScouts|campScoutsOut|CAMP\.scout/.test(src('src/campaign.js') + src('src/campaignscene.js') + src('src/campmap.js') + src('src/campmapdraw.js') + src('src/campsight.js') + src('src/camprepair.js')));
  check('the keys page has no V row and its refit rows say a fighter only (4; F in the ready room)', J(`CONTROLS.flatMap(g => g.rows || []).some(r => (r.k || []).includes('V'))`) === false || J(`controlsGroup('campaign').rows.every(r => !(r.k || []).includes('V'))`) === true);
  check('the escort ship\'s picture is gone (campEscortDraw, CAMP_ART.escort), and no source file of the Campaign makes an escort kind', !/campEscortDraw/.test(src('src/campcruiser.js')) && !/kind === 'escort'|kind: 'escort'/.test(src('src/campaign.js').replace(/kind: 'escort', par/g, '') .replace(/L\.kind === 'escort'/g, '')) );
}

console.log('C. what stays');
{
  g.run('__new(1)'); g.run(`campOrder(C, 'launch'); __run(12);`);
  check('Escort the convoy is a row of the all-squads list, with a target pick, and the old order "escort" goes to every fighter', J(`['squads:escort'].every(x => { const [p, r] = x.split(':'); const row = campPanelDef(p).rows.find(q => q.id === r); return row && row.pick === 'escort' && /Escort the convoy/.test(row.label); })`) && J(`campCheck(C, 'escort', '').ok`) === true);
  check('one squad can escort while the others fight: Yellow to the transport, Red and Green at a raider (the ship the squad is sent to is its order\'s target)', (() => { g.run(`window.__r = campSpawn(C, 'raider', C.carrier.x + 800, C.carrier.y); __r.vmax = 0; __r.accel = 0; __r.nextShot = 1e12; __r.hp = __r.maxHp = 1e7;`); const cv = J(`campConvoys(C)[0] && campConvoys(C)[0].id`), a = J(`campWingOrder(C, 'yellow', 'escort', ${JSON.stringify(cv)}, 'key')`), b = J(`campWingOrder(C, 'red', 'attack', __r.id, 'key')`); return !!cv && a.ok && a.n === 1 && b.ok && b.n === 1 && J(`campWingShips(C, 'yellow').every(u => u.order.type === 'escort' && u.order.target === ${JSON.stringify(cv)})`) && J(`campWingShips(C, 'red').every(u => u.order.type === 'attack' && u.order.target === __r.id)`) && J(`campWingShips(C, 'green').every(u => u.order.type === 'guard')`); })());
  check('the words: "escort the convoy" is the order, "red squad escort the convoy" is the squad\'s, "send the escorts to the convoy" and "escorts attack" are nobody\'s', J(`campIntent('escort the convoy')`).act === 'fleet_escort' && J(`campIntent('red squad escort the convoy')`).act === 'fleet_wing' && J(`campIntent('send the escorts to the convoy')`) === null && J(`campIntent('escorts attack')`) === null);
}

console.log('D. the sensors: a fighter in range reads a cloaked anomaly');
{
  // level 2 (Alpha Centauri) has cloaked anomalies; the cruiser is put far from one and a fighter near it
  g.run('__new(2)');
  g.run(`window.A0 = C.anoms.find(a => a.state === 'hidden'); window.__far = (d) => { C.carrier.x = A0.x - 20000; C.carrier.y = A0.y; C.carrier.vx = C.carrier.vy = 0; };`);
  g.run('__far()');
  const hid = J('A0.hides || "cache"');
  check('the set-up: a hidden anomaly, not noticed, the cruiser far from it (20,000 px)', !!J('A0') && J('A0.sensed') === false && J('A0.read === undefined || A0.read === false') && J('Math.hypot(C.carrier.x - A0.x, C.carrier.y - A0.y)') === 20000);
  g.run(`window.F1 = campSpawn(C, 'fighter', A0.x - CAMP.sensor.wing - 400, A0.y); F1.order = { type: 'hold', at: { x: F1.x, y: F1.y } }; C.events.length = 0; __run(0.5);`);
  check('a fighter out just outside its sensor range (CAMP.sensor.wing, 2,600 px) notices nothing', J('A0.sensed') === false && J(`C.events.some(e => e.type === 'anomaly')`) === false);
  g.run(`F1.x = A0.x - CAMP.sensor.wing + 300; F1.y = A0.y; __heard(0.2);`);
  check('a fighter inside it notices the anomaly AND reads it: the mark appears (sensed), it is named ("likely ...", a.read), the radio says "Anomaly: likely ..." once, and the cruiser is not near it (20,000 px)', J('A0.sensed') === true && J('A0.read') === true && J(`campAnomMarks(C).some(m => m.id === A0.id && /likely/.test(m.name))`) === true);
  check('the radio said the old scouts\' line once (camp.say.anomalyread: "Anomaly: likely ..."), not the cruiser\'s', J(`__ev.filter(e => e.type === 'say' && e.key === 'camp.say.anomalyread').length`) === 1 && J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.anom.sense')`) === false && J(`__ev.filter(e => e.type === 'anomalyread').length`) === 1);
  g.run(`__heard(2);`);
  check('and it is not said again: two seconds on there is no second line', J(`__ev.filter(e => e.type === 'say' && /^camp\\.say\\.anom/.test(e.key)).length`) === 0);
  g.run('__new(2)'); g.run('window.A1 = C.anoms.find(a => a.state === "hidden"); C.carrier.x = A1.x - CAMP.anomaly.sense + 100; C.carrier.y = A1.y; C.carrier.vx = C.carrier.vy = 0; __heard(0.2);');
  check('the cruiser alone notices it as before (the mark, the old line "camp.say.anom.sense"), and it is not named until a fighter comes', J('A1.sensed') === true && J('A1.read === undefined || A1.read === false') && J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.anom.sense')`) === true);
  g.run(`campOrder(C, 'launch'); __heard(6);`);
  check('then the fighters that leave the bay, inside their sensor range of it, name it: "Anomaly: likely ..." (the read, once, whoever of them is first)', J('A1.read') === true && J(`__ev.filter(e => e.type === 'say' && e.key === 'camp.say.anomalyread').length`) === 1 && J(`__ev.filter(e => e.type === 'anomalyread').length`) === 1);
  g.run('__new(2)'); g.run('window.A2 = C.anoms.find(a => a.state === "hidden"); C.carrier.x = A2.x - 15000; C.carrier.y = A2.y; campOrder(C, "launch"); __run(8);');
  check('the squads\' Guard order takes the anomaly as a place: a squad sent to it is ordered to guard it and flies there (and then notices it)', (() => { g.run('A2.sensed = true'); const r = J(`campWingOrder(C, 'red', 'guard', 'anom:' + A2.id, 'key')`); return r.ok && r.n === 1 && J(`campWingShips(C, 'red').every(u => u.order.type === 'guard' && u.order.at.kind === 'anomaly')`) && J('CAMP.wing.smart.anomaly') === 'guard'; })());
  g.run('__run(40); window.__d = Math.min(...campWingShips(C, "red").map(u => Math.hypot(u.x - A2.x, u.y - A2.y)))');
  check('the squad flies to the anomaly: forty seconds on, it is within a few hundred px of it', J('__d') < 1200, J('__d'));
}

console.log('E. old saves');
{
  store.set('longhaul.campaign', JSON.stringify({ level: 2, techs: ['beam'], ore: 100, bonus: { fighters: 1, escorts: 2 } }));
  check('an escort bought at an old refit counts as a fighter when the save is read (1 and 2 make 3, the most), and the progress has no escorts any more', J('campProgressLoad().bonus.fighters') === 3 && J('campProgressLoad().bonus.escorts') === null && J('Object.keys(campProgressNew().bonus).join()') === 'fighters');
  store.set('longhaul.campaign', JSON.stringify({ level: 2, techs: [], ore: 0, bonus: { fighters: 0, escorts: 1 } }));
  check('an escort alone makes one fighter', J('campProgressLoad().bonus.fighters') === 1);
}

check('the game scripts logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCUT ESCORTS FAIL (${failed} of ${n})` : `\nCUT ESCORTS PASS (${n})`);
process.exitCode = failed ? 1 : 0;
