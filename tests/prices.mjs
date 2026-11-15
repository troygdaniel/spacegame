// smoke: dock prices count: ore, repair, the door fee, salvage, part prices and the pay of a system, read at each of the six docks (plain Node, no Chrome)
// The prices of the docks (card space-game-u-e4-dock-prices-count, docs/ECONOMY.md 9): src/data_systems.js gives every dock its own numbers and the game reads them where they are used:
//   the ore a dock pays (orePrice, src/asteroids.js), the hull point at its repair bay (repairPrice, src/station.js), the door fee taken on docking (dockFee), what a wreck pays in the
//   system (salvageMult, src/poi.js), the price of its parts (partPrice, src/data_parts.js) and the pay of a system on the calls paid there (callReward, src/missions.js). A dock that names
//   no ore or repair price is Halcyon's: ORE_PRICE and REPAIR_PRICE, which content/stations/halcyon-station.md can set. Plain Node (tests/nodegame.mjs): no scene is needed.
// Run: node tests/prices.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const SC = `(() => { const p = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : p, apply: () => p }); return p; })()`; // a scene that takes every call
const at = (station, system) => g.run(`(() => { G.system = '${system}'; G.lastDock = '${station}'; G.credits = 1000; G.ore = 0; G.mission = 'none'; G.missionId = null; G.missionProgress = 0; return 1; })()`);

// docs/ECONOMY.md 9 for the six docks: [station, system, ore, repair, partMult, fee, salvageMult, pay of the system]; null is "the dock says nothing", the fallback or 1
const DOCKS = [
  ['halcyon-station', 'halcyon', null, null, null, null, null, null],
  ['kestrel-outpost', 'kestrel', null, 0.5, 1.1, null, null, null],
  ['meridian-exchange', 'meridian', 26, 0.5, 0.9, null, null, 1.1],
  ['brass-smelter', 'brass', 30, 0.5, null, null, null, 1.15],
  ['ember-foundry', 'ember', 28, 0.5, null, null, null, 1.3],
  ['roost-dock', 'roost', null, 0.75, 1.25, 50, 2, 1.6]
];

console.log('the data: the numbers of ECONOMY.md 9, in the code rows and the files');
for (const [st, sys, ore, rep, pm, fee, salv, pay] of DOCKS) {
  const d = J(`(() => { const b = SYSTEMS.${sys}.bodies.find(b => b.id === '${st}'); return { ore: b.dock.ore ?? null, repair: b.dock.repair ?? null, partMult: b.dock.partMult ?? null, fee: b.dock.fee ?? null, salvageMult: b.dock.salvageMult ?? null, pay: SYSTEMS.${sys}.pay ?? null }; })()`);
  const f = J(`(() => { const w = worldFromFiles('${sys}'), b = w.bodies.find(b => b.id === '${st}'); return { ore: b.dock.ore ?? null, repair: b.dock.repair ?? null, partMult: b.dock.partMult ?? null, fee: b.dock.fee ?? null, salvageMult: b.dock.salvageMult ?? null, pay: w.pay ?? null }; })()`);
  const want = { ore, repair: rep, partMult: pm, fee, salvageMult: salv, pay };
  check(`${st}: ore ${ore ?? 'none'}, repair ${rep ?? 'none'}, parts x${pm ?? 1}, fee ${fee ?? 0}, salvage x${salv ?? 1}, pay x${pay ?? 1}`, JSON.stringify(d) === JSON.stringify(want), JSON.stringify(d));
  const same = st === 'halcyon-station' ? JSON.stringify(f) === JSON.stringify(Object.assign({}, d, { ore: 20, repair: 0.5 })) : JSON.stringify(f) === JSON.stringify(d); // Halcyon's file carries the two prices the code keeps as ORE_PRICE and REPAIR_PRICE
  check(`${st}: the files say the same` + (st === 'halcyon-station' ? ' (and its ore 20 and repair 0.5 are the constants)' : ''), same, JSON.stringify(f));
}
check('the Hollow and Lethe have no pay (they pay nothing: no dock)', J(`SYSTEMS.hollow.pay ?? null`) === null && J(`SYSTEMS.lethe.pay ?? null`) === null);

console.log('ore: what a dock pays, and what docking sells the hold for');
for (const [st, sys, ore] of DOCKS) {
  at(st, sys);
  const want = ore ?? 20;
  check(`${st}: an ore pays ${want}`, J(`orePrice()`) === want && J(`orePrice('${st}')`) === want);
  g.run(`G.ore = 7; sellOre(${SC})`);
  check(`${st}: seven ore sell for ${7 * want}`, J(`G.credits`) === 1000 + 7 * want && J(`G.ore`) === 0, String(J(`G.credits`)));
}
g.run(`ORE_PRICE = 22`); at('halcyon-station', 'halcyon');
check('the Halcyon file can still set Halcyon\'s ore price: ORE_PRICE 22 is what Halcyon and a dock with none pay, and Brass Reach keeps its own 30', J(`orePrice()`) === 22 && (at('kestrel-outpost', 'kestrel'), J(`orePrice()`) === 22) && (at('brass-smelter', 'brass'), J(`orePrice()`) === 30));
g.run(`ORE_PRICE = 20`);
at('meridian-exchange', 'meridian'); g.run(`G.fleet = [newShip('wren')]; G.fleet[0].ore = 5; G.active = 0`);
check('a ship sold at the Exchange is paid its ore at 26, not Halcyon\'s 20: 5 ore are 130', J(`fleetSellValue(G.fleet[0]).ore`) === 130, JSON.stringify(J(`fleetSellValue(G.fleet[0])`)));

console.log('repair: a point of hull at each bay');
for (const [st, sys, , rep] of DOCKS) {
  at(st, sys);
  const want = rep ?? 0.5;
  check(`${st}: ${want} a point`, J(`repairPrice()`) === want && J(`repairPrice('${st}')`) === want);
}
g.run(`REPAIR_PRICE = 0.6`); at('halcyon-station', 'halcyon');
check('the Halcyon file can still set Halcyon\'s: REPAIR_PRICE 0.6 is Halcyon\'s, while Kestrel (0.5) and the Roost (0.75) keep their own', J(`repairPrice()`) === 0.6 && (at('kestrel-outpost', 'kestrel'), J(`repairPrice()`) === 0.5) && (at('roost-dock', 'roost'), J(`repairPrice()`) === 0.75));
g.run(`REPAIR_PRICE = 0.5`);
at('roost-dock', 'roost');
check('mending 40 points costs 20 at a normal bay and 30 at the Roost', Math.ceil(40 * 0.5) === 20 && Math.ceil(40 * J(`repairPrice()`)) === 30);

console.log('the door fee');
for (const [st, sys, , , , fee] of DOCKS) {
  at(st, sys);
  g.run(`dockFee(${SC})`);
  check(`${st}: ${fee ? 'takes ' + fee : 'takes nothing'} on docking`, J(`G.credits`) === 1000 - (fee || 0), String(J(`G.credits`)));
}
at('roost-dock', 'roost'); g.run(`G.credits = 30; dockFee(${SC})`);
check('a pilot with 30 cr pays 30, not 50, and is not locked out', J(`G.credits`) === 0);
at('roost-dock', 'roost'); g.run(`G.credits = 0; dockFee(${SC})`);
check('and one with nothing pays nothing', J(`G.credits`) === 0);

console.log('salvage: what a wreck pays in the system');
for (const [st, sys, , , , , salv] of DOCKS) {
  at(st, sys);
  g.run(`poiSalvage(${SC}, { id: 'test-wreck', credits: 250, name: 'Wreck', note: 'x' }, { spr: ${SC}, label: ${SC}, ring: null }, ${SC})`);
  const want = Math.round(250 * (salv || 1));
  check(`${sys}: a 250 cr wreck pays ${want}`, J(`G.credits`) === 1000 + want, String(J(`G.credits`)));
}
for (const sys of ['hollow', 'lethe']) {
  at('halcyon-station', sys);
  g.run(`poiSalvage(${SC}, { id: 'test-wreck-' + G.system, credits: 250, name: 'Wreck', note: 'x' }, { spr: ${SC}, label: ${SC}, ring: null }, ${SC})`);
  check(`${sys}: no dock, so x1: 250`, J(`G.credits`) === 1250, String(J(`G.credits`)));
}

console.log('parts: the price at each dock');
for (const [st, sys, , , pm] of DOCKS) {
  at(st, sys);
  const base = J(`PARTS.engine.prices[0]`), want = Math.round(base * (pm || 1) / 10) * 10;
  check(`${st}: an engine part, tier 1, is ${want} (list ${base} x ${pm ?? 1})`, J(`partPrice('engine', 1, 'wren')`) === want, String(J(`partPrice('engine', 1, 'wren')`)));
}

console.log('pay: what a call pays where it is paid');
const rew = id => J(`callReward(MISSIONS.find(m => m.id === '${id}'))`);
check('Halcyon\'s four calls pay what they always did: 500, 400, 600 and the bounty 1200 (the Roost\'s 1.6 does not touch it: Halcyon pays the bounty)', [rew('rescue'), rew('escort'), rew('patrol'), rew('bounty')].join() === '500,400,600,1200');
check('a courier to Kestrel pays 764 (pay x1.00), to Brass Reach 1006 (x1.15), to Ember from Meridian 1219 (x1.30), to the Roost 2109 (x1.60), to the Exchange from Kestrel 866 (x1.10)', [rew('courier-halcyon-kestrel'), rew('courier-halcyon-brass'), rew('courier-meridian-ember'), rew('courier-meridian-roost'), rew('courier-kestrel-meridian')].join() === '764,1006,1219,2109,866', [rew('courier-halcyon-kestrel'), rew('courier-halcyon-brass'), rew('courier-meridian-ember'), rew('courier-meridian-roost'), rew('courier-kestrel-meridian')].join());
check('the salvage at Lethe and the survey at the Hollow have no dock to pay more: 700 and 600', rew('salvage-lethe') === 700 && rew('survey-hollow') === 600);
// and it is what is paid: a patrol completed, a courier delivered at Ember, a rescue paid on docking
g.run(`(() => { G.system = 'halcyon'; G.lastDock = 'halcyon-station'; G.credits = 0; pickMission('patrol'); G.mission = 'accepted'; completeMission(${SC}, 'done'); return 1; })()`);
check('completing the patrol pays 600', J(`G.credits`) === 600);
g.run(`(() => { G.system = 'meridian'; G.lastDock = 'meridian-exchange'; G.credits = 0; pickMission('courier-meridian-ember'); G.mission = 'accepted'; missionAccepted(); G.system = 'ember'; G.lastDock = 'ember-foundry'; missionDock(${SC}); return 1; })()`);
check('a courier delivered at Ember pays 1219', J(`G.credits`) === 1219 && J(`G.mission`) === 'none', String(J(`G.credits`)));
check('the board and the HUD show the same number the dock pays', (() => { g.run(`pickMission('courier-halcyon-brass'); G.mission = 'accepted'`); return J(`hudMission(${SC}, 'Space').reward`) === 1006; })());

check('no console errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
