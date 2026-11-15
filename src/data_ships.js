// ---------- Ship models: the six hulls you can fly (docs/UNIVERSE.md section 6.1) ----------
// One row per model, all numbers for a ship with no parts fitted. src/fleet.js reads them through shipStat(); the parts you
// fit change them there. The field names are the ones content/ships/*.md uses (src/content.js), so a markdown file can
// override a row by id: speed is the top speed in px/s, boost the top speed while boosting, accel the thrust in px/s2, turn a
// multiplier on the base turn rate, tank the fuel units, fuelPerLy the fuel one light year costs, range the jump range in ly,
// cargo the hold (ore units), guns the hardpoints, sensor a multiplier on radar and find range, price in credits (0: the
// starter). The Wren is today's ship, so every number equals what space.js and boost.js used before this file existed.
//   art        the texture key: the Wren is 'ship' (ships.js draws it); the other five are drawn by card u-d2
//   maxTier    the highest tier of each part slot the hull can fit (section 7: a courier cannot fit tier 3 weapons,
//              a hauler can fit tier 3 cargo); a first guess that card u-d1 balances
//   partMult   the price of this ship's parts against the Wren's (section 7)
const SHIP_MODELS = {
  wren: {
    id: 'wren', name: 'Wren', role: 'starter, balanced', side: 'player', art: 'ship',
    hull: 100, speed: 480, boost: 800, accel: 720, turn: 1.0, tank: 40, fuelPerLy: 1.0, range: 8, cargo: 10, guns: 1, sensor: 1.0, price: 0,
    partMult: 1, maxTier: { engine: 3, shields: 3, weapons: 3, tank: 3, cargo: 3, aim: 3 }
  },
  kite: {
    id: 'kite', name: 'Kite', role: 'fast courier', side: 'player', art: 'kite',
    hull: 70, speed: 580, boost: 950, accel: 900, turn: 1.25, tank: 30, fuelPerLy: 0.6, range: 14, cargo: 4, guns: 1, sensor: 1.0, price: 4500,
    partMult: 0.8, maxTier: { engine: 3, shields: 2, weapons: 2, tank: 2, cargo: 1, aim: 2 }
  },
  ox: {
    id: 'ox', name: 'Ox', role: 'cargo hauler', side: 'player', art: 'ox',
    hull: 170, speed: 360, boost: 560, accel: 520, turn: 0.6, tank: 70, fuelPerLy: 1.6, range: 8, cargo: 40, guns: 1, sensor: 1.0, price: 6500,
    partMult: 1.2, maxTier: { engine: 2, shields: 3, weapons: 2, tank: 3, cargo: 3, aim: 2 }
  },
  talon: {
    id: 'talon', name: 'Talon', role: 'fighter', side: 'player', art: 'talon',
    hull: 130, speed: 520, boost: 880, accel: 880, turn: 1.35, tank: 28, fuelPerLy: 1.2, range: 9, cargo: 3, guns: 2, sensor: 1.0, price: 8500,
    partMult: 1.1, maxTier: { engine: 3, shields: 3, weapons: 3, tank: 2, cargo: 1, aim: 3 }
  },
  pathfinder: {
    id: 'pathfinder', name: 'Pathfinder', role: 'explorer', side: 'player', art: 'pathfinder',
    hull: 90, speed: 440, boost: 700, accel: 700, turn: 1.0, tank: 90, fuelPerLy: 0.7, range: 18, cargo: 8, guns: 1, sensor: 1.6, price: 11000,
    partMult: 1.1, maxTier: { engine: 3, shields: 2, weapons: 2, tank: 3, cargo: 2, aim: 2 }
  },
  bastion: {
    id: 'bastion', name: 'Bastion', role: 'heavy', side: 'player', art: 'bastion',
    hull: 320, speed: 300, boost: 480, accel: 480, turn: 0.5, tank: 60, fuelPerLy: 2.0, range: 7, cargo: 20, guns: 3, sensor: 1.0, price: 24000,
    partMult: 1.8, maxTier: { engine: 2, shields: 3, weapons: 3, tank: 3, cargo: 3, aim: 3 }
  }
};
