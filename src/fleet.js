// ---------- Fleet: the ships you own, the one you fly, and what its numbers are (docs/UNIVERSE.md 6.3, 8.1, 8.4) ----------
// One record per owned ship. You fly G.fleet[G.active]; its hull, hold and parts are what G.hull, G.maxHull, G.ore and
// G.upgrades read and write, so no call site had to change. Only the Wren exists so far; the other five models are in
// src/data_ships.js and card u-d3 adds buying, parking and switching. A record:
//   { uid, model, name, at (a station id), hull, maxHull, fuel, ore, parts }
// Numbers: shipStat('vmax') and friends give a model's number with the fitted parts applied. space.js, boost.js and
// shop.js read their speeds, thrust, turn rate and hull through it, so a different model flies differently.
// meta.js saves and loads the records (save v2).
const SHIPREC = {
  slots: ['engine', 'shields', 'weapons', 'tank', 'cargo'],            // section 7
  oldKeys: { armor: 'shields', rapid: 'weapons', booster: 'engine' },   // the v1 upgrade keys, tier for tier
  max: 6, fuel: SHIP_MODELS.wren.tank, hull: SHIP_MODELS.wren.hull      // fleet size, the Wren's tank and hull (data_ships.js)
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
// What the fitted parts do to a model's number (src/data_parts.js has the tables): the engine multiplies the top speed and adds to the
// boost speed and the jump range, the tank multiplies the fuel tank, the cargo part adds to the hold. A ship with no parts has its
// model's numbers exactly, and the hull has no part at all: shields are points of their own (shieldMax), not extra hull.
const PART_ADD = {
  speed: (v, rec) => Math.round(v * partFx('engine', rec.parts.engine, 'speed')),
  boost: (v, rec) => v + partFx('engine', rec.parts.engine, 'boost'),
  range: (v, rec) => v + partFx('engine', rec.parts.engine, 'range'),
  tank: (v, rec) => Math.round(v * partFx('tank', rec.parts.tank, 'mul')),
  cargo: (v, rec) => v + partFx('cargo', rec.parts.cargo, 'add')
};
// numbers that come from the parts alone
const PART_STAT = {
  shieldMax: rec => partFx('shields', rec.parts.shields, 'pts'),         // points
  shieldRegen: rec => partFx('shields', rec.parts.shields, 'regen'),     // points a second while it recharges
  shieldDelay: rec => partFx('shields', rec.parts.shields, 'delay'),     // ms without a hit before it recharges
  fireDelay: rec => partFx('weapons', rec.parts.weapons, 'delay'),       // ms between shots
  damage: rec => partFx('weapons', rec.parts.weapons, 'damage'),         // one player shot
  boostTank: rec => partFx('engine', rec.parts.engine, 'tank'),          // the boost energy ring (src/boost.js)
  boostRegen: rec => partFx('engine', rec.parts.engine, 'regen')         // its refill a second
};

// shipStat('vmax') is the active ship's top speed in px/s. Names: hull, vmax (or speed), boost, accel, turn, tank, fuelPerLy,
// range, hold (or cargo), guns, sensor, price, and from the parts shieldMax, shieldRegen, shieldDelay, fireDelay, damage, boostTank,
// boostRegen. shipStat(name, rec) answers for another record. An unknown name is undefined.
function shipStat(name, rec) {
  rec = rec || activeShip();
  if (PART_STAT[name]) return PART_STAT[name](rec);
  const f = STAT_FIELD[name] || name, v = shipModel(rec.model)[f];
  if (typeof v !== 'number') return undefined;
  return PART_ADD[f] ? PART_ADD[f](v, rec) : v;
}
const holdCap = rec => shipStat('hold', rec);                                   // the cargo hold in ore units: asteroids.js, hud.js, the save
const partTier = (slot, rec) => ((rec || activeShip()).parts[slot] | 0);        // the tier fitted in a slot of the active ship

// the highest tier of a part slot this hull can fit (data_ships.js)
function shipMaxTier(model, slot) { const t = shipModel(model).maxTier; return t && t[slot] !== undefined ? t[slot] : 3; }

// Space and the hangar call this when they start: the hull cap comes from the model and its plating, and a hull above it is cut down.
function shipSync(rec) {
  rec = rec || activeShip();
  rec.maxHull = shipStat('hull', rec);
  rec.hull = Math.min(rec.hull, rec.maxHull);
}
