// not in the smoke: the economy probe (card space-game-u-f1-qa): what every station of the eight systems really charges and pays, as markdown
// Measures, through the game's own functions in a plain Node context (tests/nodegame.mjs, no browser), the numbers docs/UNIVERSE.md section 11
// and docs/ECONOMY.md section 9 talk about: fuel a unit and a full tank per ship at every pump, the repair bay's price, what an ore pays at
// the dock, every part's price and stock at every shop, the yards and their prices, the dock fee and salvage multiplier, the jumps the Wren
// can make and what their fuel costs, income per run, and the time to the first new ship. It also says which dock fields the code reads and
// which it does not yet (docs/UNIVERSE.md 11.1). Nothing is asserted. Run: node tests/econprobe.mjs   (a second; prints markdown)
import { nodeGame } from './nodegame.mjs';

const g = nodeGame();
const J = code => JSON.parse(g.run(`JSON.stringify(${code})`));
const row = (...c) => console.log('| ' + c.join(' | ') + ' |');
const head = (...c) => { row(...c); row(...c.map(() => '---')); };
const money = n => (n == null ? '-' : Number(n).toLocaleString('en-US'));
const r1 = x => Math.round(x * 10) / 10;

const SYS = J('Object.keys(SYSTEMS)');
const MODELS = J("Object.keys(SHIP_MODELS).filter(m => SHIP_MODELS[m].side === 'player')");
const SLOTS = J('SHIPREC.slots');
const rec = (model, tankTier = 0) => `({ model: ${JSON.stringify(model)}, parts: { engine: 0, shields: 0, weapons: 0, tank: ${tankTier}, cargo: 0 }, fuel: 0, hull: 1, ore: 0 })`;
const at = (sys, dock) => g.run(`G.system = ${JSON.stringify(sys)}; G.lastDock = ${JSON.stringify(dock)}; 0`);
const stations = SYS.flatMap(sys => J(`sysBodies('station', ${JSON.stringify(sys)})`).map(b => ({ sys, sysName: J(`SYSTEMS[${JSON.stringify(sys)}].name`), danger: J(`SYSTEMS[${JSON.stringify(sys)}].danger`), id: b.id, name: b.name, dock: b.dock || {} })));
const noStation = SYS.filter(sys => !stations.some(s => s.sys === sys));

console.log(`# Economy probe (tests/econprobe.mjs), ${new Date().toISOString().slice(0, 10)}\n`);
console.log(`Measured through the game's functions: ${stations.length} stations in ${SYS.length} systems; no station in ${noStation.map(s => J(`SYSTEMS[${JSON.stringify(s)}].name`)).join(' and ')}.\n`);

// ---- 1. the pump: fuel a unit and a full tank per ship ----
console.log('## 1. Fuel: a unit at each pump, and a full tank from empty (credits; the pump quote the game gives)\n');
head('Station', 'Fuel/unit', ...MODELS.map(m => `${J(`SHIP_MODELS.${m}.name`)} (${J(`SHIP_MODELS.${m}.tank`)} u)`));
for (const s of stations) {
  at(s.sys, s.id);
  const price = J(`fuelPrice(${JSON.stringify(s.id)})`);
  const tanks = MODELS.map(m => { if (price == null) return 'no pump'; const q = J(`(() => { const q = pumpQuote(${JSON.stringify(s.id)}, ${rec(m)}); return q ? q.full.cost : null; })()`); return money(q); });
  row(`${s.name} (${s.sysName})`, price == null ? 'no pump' : price, ...tanks);
}
console.log('\nThe data says the same: `dock.fuel` is read by `fuelPrice` (src/fuel.js). A TANK part grows the tank x1.25, x1.5, x2 (src/fleet.js shipStat), so the full tank grows with it.\n');

// ---- 2. repair, ore, fee, salvage: data against what the code charges ----
console.log('## 2. Repair, ore, dock fee, salvage: what the data says and what the game charges today\n');
const REPAIR = J('REPAIR_PRICE'), ORE = J('ORE_PRICE');
head('Station', 'repair (data)', 'repair charged', 'ore (data)', 'ore paid', 'fee (data)', 'fee charged', 'salvage x (data)', 'salvage paid');
for (const s of stations) {
  const d = s.dock;
  row(`${s.name} (${s.sysName})`, d.repair ?? '-', REPAIR + ' a point', d.ore ?? '-', ORE + ' an ore', d.fee ?? '-', 'none', d.salvageMult ?? '-', 'x1');
}
console.log(`\nThe code has one price of each: \`REPAIR_PRICE\` ${REPAIR} (src/station.js) and \`ORE_PRICE\` ${ORE} (src/asteroids.js sellOre), both Halcyon's, which only content/stations/halcyon-station.md can change (src/contenttables.js). \`dock.repair\`, \`dock.ore\`, \`dock.fee\` and \`dock.salvageMult\` are in the data for every station and read by nothing yet; a pay multiplier per system is in neither. That is the unbuilt half of card u-e4 (docs/ECONOMY.md 9 and 10).\n`);

// ---- 3. parts: price and stock per slot at each shop (the Wren; other ships multiply) ----
console.log('## 3. Parts: the Wren\'s price and the top tier sold at each shop (credits; `partPrice` x the station\'s `partMult`, to ten)\n');
head('Station', 'partMult', ...SLOTS.map(sl => J(`PARTS.${sl}.name`)));
for (const s of stations) {
  at(s.sys, s.id);
  const cells = SLOTS.map(sl => {
    const cap = J(`partStockCap(${JSON.stringify(sl)}, stationDock())`);
    if (!cap) return 'none';
    const prices = []; for (let t = 1; t <= cap; t++) prices.push(J(`partPrice(${JSON.stringify(sl)}, ${t}, 'wren', stationDock())`));
    return `to T${cap}: ${prices.join(' / ')}`;
  });
  row(`${s.name} (${s.sysName})`, s.dock.partMult ?? 1, ...cells);
}
console.log('\nOther ships pay the Wren price x their `partMult`: ' + MODELS.map(m => `${J(`SHIP_MODELS.${m}.name`)} x${J(`SHIP_MODELS.${m}.partMult`)}`).join(', ') + '. Stock: a station sells tier 2 of every slot unless its dock says `shop` (a cap for all) or `parts` (a cap per slot). Selling a part back gives 50%.\n');

// ---- 4. yards ----
console.log('## 4. Yards: the ships each station sells and their prices (no station multiplier exists: `SHIP_MODELS[m].price` everywhere)\n');
head('Station', 'Sells', 'Prices');
for (const s of stations) {
  const yard = J(`stationYard(${JSON.stringify(s.id)})`);
  row(`${s.name} (${s.sysName})`, yard.length ? yard.map(m => J(`SHIP_MODELS.${m}.name`)).join(', ') : 'none', yard.length ? yard.map(m => money(J(`SHIP_MODELS.${m}.price`))).join(', ') : '-');
}
console.log('\nA ship sells back for 60% of its price plus 50% of its parts plus the ore in its hold (src/fleet.js fleetSellValue). Moving a parked ship costs `FLEET.moveFee` ' + J('FLEET.moveFee') + ' + ' + J('FLEET.moveLy') + ' a light year.\n');

// ---- 5. jumps the Wren can make, and the fuel bill ----
console.log('## 5. Jumps: every hop a ship can make from a system with a pump, with its fuel (units) and the bill at the pump you leave from\n');
const dist = (a, b) => J(`distLy(${JSON.stringify(a)}, ${JSON.stringify(b)})`);
head('From', 'To', 'ly', ...MODELS.map(m => J(`SHIP_MODELS.${m}.name`) + ' (range ' + J(`SHIP_MODELS.${m}.range`) + ')'));
for (const a of SYS) for (const b of SYS) {
  if (a === b) continue;
  const ly = dist(a, b); if (ly == null || ly > 20) continue;
  const pump = stations.find(s => s.sys === a && s.dock.fuel > 0);
  const cells = MODELS.map(m => {
    const can = ly <= J(`SHIP_MODELS.${m}.range`) + 1e-9; if (!can) return 'out of range';
    const units = J(`jumpCost(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${rec(m)})`);
    return `${units} u` + (pump ? ` = ${Math.round(units * pump.dock.fuel)} cr` : ' (no pump here)');
  });
  row(J(`SYSTEMS[${JSON.stringify(a)}].name`), J(`SYSTEMS[${JSON.stringify(b)}].name`), r1(ly), ...cells);
}
console.log('\nRange is the ship\'s before engine tiers (+1, +2, +3 ly). A heavy ship out of fuel where there is no pump calls the fuel ranger: 10 units or the cheapest jump out, at three times the price (src/fuel.js rangerUnits).\n');

// ---- 6. income per run ----
console.log('## 6. Income per run: the built calls, a full hold, the wrecks of each system\n');
head('Source', 'Pays', 'Where', 'Note');
for (const m of J('MISSIONS.map(m => ({ id: m.id, title: m.title, reward: m.reward, where: m.where }))')) row(m.title, money(m.reward), m.where, 'the same in every system today (no pay multiplier is built)');
for (const m of MODELS) row(`A full hold in the ${J(`SHIP_MODELS.${m}.name`)} (${J(`SHIP_MODELS.${m}.cargo`)} ore)`, money(J(`SHIP_MODELS.${m}.cargo`) * ORE), 'any dock', `${ORE} an ore everywhere today; the data says 26 at Meridian, 30 at Brass Reach, 28 at Ember`);
for (const sys of SYS) {
  const pois = J(`sysBodies('poi', ${JSON.stringify(sys)}).map(p => ({ kind: p.kind, credits: p.credits || 0, hull: p.hull || 0 }))`);
  if (!pois.length) continue;
  const cr = pois.reduce((a, p) => a + p.credits, 0);
  row(`Wrecks and beacons in ${J(`SYSTEMS[${JSON.stringify(sys)}].name`)}`, money(cr), pois.length + (pois.length === 1 ? ' site' : ' sites'), pois.some(p => p.hull) ? 'one gives hull instead' : 'once each');
}

// ---- 7. time to the first new ship ----
console.log('\n## 7. Time to the first new ship\n');
const kite = J('SHIP_MODELS.kite.price'), rescue = J("MISSIONS.find(m => m.id === 'rescue').reward");
console.log(`The Kite costs ${money(kite)}; a rescue pays ${rescue}: ${Math.ceil(kite / rescue)} rescues, with fuel, repair and insurance on top. The simulator (\`node tools/economy-sim.mjs pacing\`, DATA from this checkout, 35% efficiency) puts the first upgrade at 9 minutes and the Kite at 36 minutes playing the four calls in turn, 29 minutes on the best loop; the full fleet at 5 hours. docs/UNIVERSE.md 11 asks for 10 to 14 rescue-sized runs, one evening. Mining with the Wren: a full hold is ${money(J('SHIP_MODELS.wren.cargo') * ORE)} a flight at today's ${ORE} an ore.\n`);
if (g.errors.length) console.log('\nconsole errors: ' + g.errors.join(' | '));
