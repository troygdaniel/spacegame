// ---------- Fleet: the ships you own, the one you fly, and what its numbers are (docs/UNIVERSE.md 6.3, 8.1, 8.4) ----------
// One record per owned ship. You fly G.fleet[G.active]; its hull, hold and parts are what G.hull, G.maxHull, G.ore and
// G.upgrades read and write, so no call site had to change. Only the Wren exists so far; the other five models are in
// src/data_ships.js and card u-d3 adds buying, parking and switching. A record:
//   { uid, model, name, at (a station id), hull, maxHull, fuel, ore, parts }
// Buying, selling, switching, renaming and transferring are at the bottom of this file (card u-d3).
// Numbers: shipStat('vmax') and friends give a model's number with the fitted parts applied. space.js, boost.js and
// shop.js read their speeds, thrust, turn rate and hull through it, so a different model flies differently.
// meta.js saves and loads the records (save v2).
const SHIPREC = {
  slots: ['engine', 'shields', 'weapons', 'tank', 'cargo'],            // section 7
  oldKeys: { armor: 'shields', rapid: 'weapons', booster: 'engine' },   // the v1 upgrade keys, tier for tier
  max: 6, name: 24, fuel: SHIP_MODELS.wren.tank, hull: SHIP_MODELS.wren.hull // fleet size, longest ship name, the Wren's tank and hull (data_ships.js)
};
const homeDock = () => sysBodies('station', 'halcyon')[0].id; // src/universe.js: where a new game, and a save we cannot place, wakes

function modelKnown(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(SHIP_MODELS, id); }
function shipModel(id) { return modelKnown(id) ? SHIP_MODELS[id] : SHIP_MODELS.wren; } // an id we do not know flies as the Wren

function newShip(model, at) {
  const m = shipModel(model);
  return {
    uid: 1, model: m.id, name: m.name, at: at || homeDock(),
    hull: m.hull, maxHull: m.hull, fuel: m.tank, ore: 0,
    parts: { engine: 0, shields: 0, weapons: 0, tank: 0, cargo: 0 }
  };
}
function activeShip() { return G.fleet[G.active] || G.fleet[0]; }

G.fleet = [newShip()]; G.active = 0;

// G.upgrades: the old three keys, answering from the parts (armor is shields, rapid is weapons, booster is engine)
function upgradesView(rec) {
  if (!rec._up) {
    const v = {};
    Object.keys(SHIPREC.oldKeys).forEach(old => Object.defineProperty(v, old, {
      enumerable: true, get: () => rec.parts[SHIPREC.oldKeys[old]], set: t => { rec.parts[SHIPREC.oldKeys[old]] = t; }
    }));
    Object.defineProperty(rec, '_up', { value: v }); // not enumerable, so it never reaches a save
  }
  return rec._up;
}
Object.defineProperties(G, {
  hull: { enumerable: true, configurable: true, get: () => activeShip().hull, set: v => { activeShip().hull = v; } },
  maxHull: { enumerable: true, configurable: true, get: () => activeShip().maxHull, set: v => { activeShip().maxHull = v; } },
  ore: { enumerable: true, configurable: true, get: () => activeShip().ore, set: v => { activeShip().ore = v; } },
  upgrades: {
    enumerable: true, configurable: true, get: () => upgradesView(activeShip()),
    set: u => { const v = upgradesView(activeShip()); Object.keys(v).forEach(k => { if (u && k in u) v[k] = u[k]; }); }
  }
});

// ---------- ship numbers ----------
// The names callers use (docs/UNIVERSE.md 8.1) against the field names in data_ships.js and content/ships/*.md.
const STAT_FIELD = { vmax: 'speed', hold: 'cargo' };
// What the fitted parts add today: the v1 upgrade tiers, tier for tier. Armor plating adds 20 hull a tier (the shop has always
// done that) and the booster raises the boost speed from 800 to 1000 to 1150. Card u-d1 replaces this with the five part slots
// of data_parts.js (section 7); until then a Wren with no parts has exactly the numbers the game always had.
const PART_ADD = {
  hull: rec => 20 * (rec.parts.shields | 0),
  boost: rec => [0, 200, 350, 350][Math.min(3, Math.max(0, rec.parts.engine | 0))]
};

// shipStat('vmax') is the active ship's top speed in px/s. Names: hull, vmax (or speed), boost, accel, turn, tank, fuelPerLy,
// range, hold (or cargo), guns, sensor, price. shipStat(name, rec) answers for another record. An unknown name is undefined.
function shipStat(name, rec) {
  rec = rec || activeShip();
  const f = STAT_FIELD[name] || name, v = shipModel(rec.model)[f];
  if (typeof v !== 'number') return undefined;
  return PART_ADD[f] ? v + PART_ADD[f](rec) : v;
}

// the highest tier of a part slot this hull can fit (data_ships.js)
function shipMaxTier(model, slot) { const t = shipModel(model).maxTier; return t && t[slot] !== undefined ? t[slot] : 3; }

// Space and the hangar call this when they start: the hull cap comes from the model and its plating, and a hull above it is cut down.
function shipSync(rec) {
  rec = rec || activeShip();
  rec.maxHull = shipStat('hull', rec);
  rec.hull = Math.min(rec.hull, rec.maxHull);
}

// ---------- the fleet: buy, sell, switch, rename, transfer (docs/UNIVERSE.md 6.3; card u-d3) ----------
// Every call works at the station you are docked at (G.lastDock) and answers { ok: true, ... } or { ok: false, why, msg }: why is a
// short code the hangar terminal (card u-d4) can switch on, msg a line it can show as it is. Nothing here draws anything.
//   full     the hangar already holds six ships         model    not a ship model            yard     this yard does not sell it
//   credits  msg says how many are missing              gone     no ship with that uid       there    it is parked at another station
//   active   it is the ship you fly                     name     the name is empty           station  not a station
//   same     it is already at that station
// Try it from the console: fleetList(), fleetBuy('kite'), fleetSwitch(1), fleetSell(2), fleetRename(1, 'Old Faithful'), fleetTransfer(2, 'some-station')
const FLEET = {
  sell: 0.6, sellParts: 0.5,   // selling pays this much of the model's base price plus this much of what is fitted (section 6.3)
  moveFee: 100, moveLy: 25,    // a transfer costs 100 cr plus 25 cr per light year between the two stations' systems
  yardFallback: ['kite'],      // what a station sells when its data has no dock object yet (card u-b5 authors the real yards; only Halcyon exists now)
  // what a part costs on the Wren, tier by tier (section 7); the model's partMult scales it. Card u-d1's data_parts.js replaces this table
  partPrice: { engine: [350, 550, 1100], shields: [300, 500, 1000], weapons: [400, 600, 1200], tank: [250, 450, 900], cargo: [250, 450, 900] }
};
const fleetNo = (why, msg) => ({ ok: false, why, msg });

// the ship you fly is wherever you are docked; call this before reading or moving any record's place
function fleetSync() { activeShip().at = G.lastDock; }
const fleetIndex = uid => G.fleet.findIndex(r => r.uid === Number(uid));
const fleetShip = uid => G.fleet[fleetIndex(uid)] || null;
function fleetAt(station) { fleetSync(); return G.fleet.filter(r => r.at === (station || G.lastDock)); } // the ships parked at a station (the one you fly counts where you are)
function fleetNextUid() { return 1 + Math.max(0, ...G.fleet.map(r => r.uid)); } // the highest uid is reused once that ship is sold: nothing keeps a uid past the ship

// where a station is: its body and the id of its system, or null
function fleetStation(id) {
  for (const sid of Object.keys(SYSTEMS)) { const body = sysBodies('station', sid).find(b => b.id === id); if (body) return { body, system: sid }; }
  return null;
}
const fleetStationName = id => (fleetStation(id) || { body: { name: String(id) } }).body.name;

// the models a station sells (dock.yard in its data); never the free starter, never an id we do not know
function stationYard(id) {
  const st = fleetStation(id); if (!st) return [];
  const list = st.body.dock ? st.body.dock.yard : FLEET.yardFallback;
  return (Array.isArray(list) ? list : []).filter(m => modelKnown(m) && SHIP_MODELS[m].price > 0);
}

// ---------- prices ----------
// what tier 1 to 3 of a slot cost this model; fleetPartsValue is everything fitted, every tier up to the one in the slot
function fleetPartPrice(slot, tier, model) { const row = FLEET.partPrice[slot], p = row && row[tier - 1]; return p ? Math.round(p * shipModel(model).partMult) : 0; }
function fleetPartsValue(rec) {
  let sum = 0;
  SHIPREC.slots.forEach(slot => { for (let t = 1; t <= (rec.parts[slot] | 0); t++) sum += fleetPartPrice(slot, t, rec.model); });
  return sum;
}
// what a ship fetches: 60% of the base price, 50% of the fitted parts, and the ore in its hold at the dock price
function fleetSellValue(rec) {
  const ship = Math.floor(FLEET.sell * shipModel(rec.model).price), parts = Math.floor(FLEET.sellParts * fleetPartsValue(rec)), ore = (rec.ore | 0) * ORE_PRICE;
  return { ship, parts, ore, total: ship + parts + ore };
}
// light years between two stations' systems, or null when one is not a station
function fleetLy(a, b) {
  const A = fleetStation(a), B = fleetStation(b); if (!A || !B) return null;
  const p = SYSTEMS[A.system].ly || [0, 0], q = SYSTEMS[B.system].ly || [0, 0];
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}
function fleetTransferCost(from, to) { const ly = fleetLy(from, to); return ly === null ? null : FLEET.moveFee + Math.round(FLEET.moveLy * ly); }

// ---------- names ----------
function fleetCleanName(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, SHIPREC.name); }
function fleetUniqueName(base) { // a second Kite is "Kite 2", a third "Kite 3"
  const have = new Set(G.fleet.map(r => r.name));
  for (let n = 1; ; n++) { const t = n === 1 ? base : base.slice(0, SHIPREC.name - String(n).length - 1) + ' ' + n; if (!have.has(t)) return t; }
}

// ---------- the five things you can do at a hangar ----------
// Buy a ship from this station's yard. The new one is rebuilt full (hull, tank), empty of ore and bare of parts, and parked here; the old
// one is not touched and stays parked here. By default you fly the new one (fly = false leaves you in the ship you had).
function fleetBuy(model, fly) {
  fleetSync();
  if (!modelKnown(model)) return fleetNo('model', 'No such ship.');
  const m = SHIP_MODELS[model];
  if (!stationYard(G.lastDock).includes(model)) return fleetNo('yard', 'This yard does not sell the ' + m.name + '.');
  if (G.fleet.length >= SHIPREC.max) return fleetNo('full', 'The hangar holds ' + SHIPREC.max + ' ships. Sell one first.');
  if (G.credits < m.price) return fleetNo('credits', 'Need ' + (m.price - G.credits) + ' more credits for the ' + m.name + '.');
  G.credits -= m.price;
  const rec = newShip(model, G.lastDock); rec.uid = fleetNextUid(); rec.name = fleetUniqueName(m.name);
  G.fleet.push(rec);
  if (fly !== false) { G.active = G.fleet.length - 1; shipSync(rec); }
  return { ok: true, ship: rec, price: m.price, flying: G.fleet[G.active] === rec };
}

// Fly another ship parked at this station. The one you were flying stays parked here with its own hull, fuel, ore and parts;
// cargo never moves between ships, and the mission and the credits stay with you.
function fleetSwitch(uid) {
  fleetSync();
  const i = fleetIndex(uid); if (i < 0) return fleetNo('gone', 'No such ship.');
  const rec = G.fleet[i];
  if (i === G.active) return fleetNo('active', rec.name + ' is the ship you fly.');
  if (rec.at !== G.lastDock) return fleetNo('there', rec.name + ' is parked at ' + fleetStationName(rec.at) + '.');
  G.active = i; shipSync(rec);
  return { ok: true, ship: rec };
}

// Sell a ship parked here for fleetSellValue(). The one you fly cannot be sold (switch first), so you always have a ship.
function fleetSell(uid) {
  fleetSync();
  const i = fleetIndex(uid); if (i < 0) return fleetNo('gone', 'No such ship.');
  const rec = G.fleet[i];
  if (i === G.active) return fleetNo('active', 'You are flying ' + rec.name + '. Switch to another ship to sell it.');
  if (rec.at !== G.lastDock) return fleetNo('there', rec.name + ' is parked at ' + fleetStationName(rec.at) + '.');
  const value = fleetSellValue(rec);
  G.credits += value.total;
  G.fleet.splice(i, 1);
  if (i < G.active) G.active--; // the ship you fly keeps its place in the list
  return { ok: true, ship: rec, value, got: value.total };
}

// Rename any of your ships, wherever it is parked. At most 24 characters, no control characters, never empty.
function fleetRename(uid, name) {
  const rec = fleetShip(uid); if (!rec) return fleetNo('gone', 'No such ship.');
  const n = fleetCleanName(name); if (!n) return fleetNo('name', 'A ship needs a name.');
  rec.name = n;
  return { ok: true, ship: rec, name: n };
}

// Pay to have a ship you are not flying waiting at a station (default: this one). It arrives at once: it is there when you next dock.
function fleetTransfer(uid, to) {
  fleetSync(); to = to || G.lastDock;
  const i = fleetIndex(uid); if (i < 0) return fleetNo('gone', 'No such ship.');
  const rec = G.fleet[i];
  if (i === G.active) return fleetNo('active', rec.name + ' is the ship you fly.');
  if (!fleetStation(to)) return fleetNo('station', 'No such station.');
  if (rec.at === to) return fleetNo('same', rec.name + ' is already at ' + fleetStationName(to) + '.');
  const ly = fleetLy(rec.at, to), cost = fleetTransferCost(rec.at, to);
  if (cost === null) return fleetNo('station', rec.name + ' is parked somewhere we cannot reach.'); // its station is not in any system we know
  if (G.credits < cost) return fleetNo('credits', 'Need ' + (cost - G.credits) + ' more credits to move ' + rec.name + '.');
  G.credits -= cost; rec.at = to;
  return { ok: true, ship: rec, cost, ly };
}

// the console view
function fleetList() {
  fleetSync();
  const rows = G.fleet.map((r, i) => ({ uid: r.uid, flying: i === G.active ? '*' : '', name: r.name, model: r.model, at: r.at, hull: Math.round(r.hull) + '/' + Math.round(r.maxHull), fuel: Math.round(r.fuel * 10) / 10, ore: r.ore, parts: SHIPREC.slots.map(s => r.parts[s]).join('') }));
  if (typeof console !== 'undefined' && console.table) console.table(rows);
  return rows;
}
