// ---------- Ship parts: six slots, tiers 1 to 3 (docs/UNIVERSE.md section 7) ----------
// A ship has six slots and every slot holds a tier 0 (nothing fitted) to 3 part. The ship record keeps the tiers in rec.parts
// (src/fleet.js): { shields, weapons, engine, tank, cargo }. This file is only data and the small functions that read it:
//   PART_ORDER   the slots in shop order: 1 to 6 on the keys (1 to 3 are the old armor, rapid fire and booster, so the keys did not move)
//   PARTS[slot]  name, short (the three letters on the HUD), what each tier is called, a line for each tier, the prices of tiers 1 to 3
//                for a Wren (a ship scales them by its partMult in data_ships.js, a station by its dock.partMult) and the numbers
//                each tier brings, an array indexed by tier 0 to 3
// What the numbers do, and where:
//   shields   points that take hits before the hull, and how fast and how soon after the last hit they come back   (space.js hurt, hud.js)
//   weapons   ms between shots, and the damage of one shot                                                          (space.js)
//   engine    top speed (a multiplier), the boost top speed (added), the boost tank and its refill, jump range (added, ly)   (fleet.js, boost.js)
//   tank      the fuel tank (a multiplier)                                                                          (fleet.js)
//   cargo     the hold (added, ore units)                                                                           (fleet.js, asteroids.js)
//   aim       how far the guns look for a raider to turn to, and whether they lead it                              (src/autotarget.js)
// shipStat() in src/fleet.js applies them. The prices are the old shop's for the three old parts (tiers 1 and 2), and the plan's for the rest.
//
// What a station sells: its dock row in data_systems.js may carry shop (the highest tier it sells, 2 if it says nothing: Halcyon sells
// tiers 1 and 2 like the shop always did), parts (a cap per slot that overrides shop, for example { weapons: 3 }) and partMult (a price
// multiplier, 1.25 at the pirate nest). What a ship can fit is data_ships.js maxTier.

const PART_ORDER = ['shields', 'weapons', 'engine', 'tank', 'cargo', 'aim'];
const PARTS = {
  shields: {
    key: 'shields', name: 'SHIELDS', short: 'SHD', prices: [300, 500, 1000],
    tiers: ['LIGHT SHIELD', 'MEDIUM SHIELD', 'HEAVY SHIELD'],
    descs: ['25 shield points', '50 points, recharges sooner', '85 points, fastest recharge'],
    brief: ['25 shield points', '50 shield points', '85 shield points'], // short forms for tight places (the Ship bay)
    pts: [0, 25, 50, 85], regen: [0, 6, 8, 11], delay: [0, 4000, 3500, 3000] // points, points a second once it recharges, ms without a hit before it does
  },
  weapons: {
    key: 'weapons', name: 'RAPID FIRE', short: 'WPN', prices: [400, 600, 1200],
    tiers: ['RAPID FIRE', 'RAPID FIRE II', 'RAPID FIRE III'],
    descs: ['faster guns', 'even faster guns', 'fastest guns, harder hits'],
    brief: ['a shot every 100 ms', 'a shot every 70 ms', '50 ms, hits for 20'],
    delay: [160, 100, 70, 50], damage: [15, 15, 15, 20]
  },
  engine: {
    key: 'engine', name: 'ENGINE', short: 'ENG', prices: [350, 550, 1100],
    tiers: ['BOOSTED', 'TWIN NOZZLES', 'RACING DRIVE'],
    descs: ['+8% speed, +1 ly jump, longer boost', '+16% speed, +2 ly jump', '+25% speed, +3 ly jump'],
    brief: ['+8% speed, +1 ly', '+16% speed, +2 ly', '+25% speed, +3 ly'],
    speed: [1, 1.08, 1.16, 1.25], boost: [0, 200, 350, 500], tank: [100, 130, 165, 200], regen: [17, 24, 32, 40], range: [0, 1, 2, 3]
  },
  tank: {
    key: 'tank', name: 'FUEL TANK', short: 'TNK', prices: [250, 450, 900],
    tiers: ['EXTRA TANK', 'LONG-RANGE TANK', 'DOUBLE TANK'],
    descs: ['fuel capacity x1.25', 'fuel capacity x1.5', 'fuel capacity x2'],
    brief: ['fuel tank x1.25', 'fuel tank x1.5', 'fuel tank x2'],
    mul: [1, 1.25, 1.5, 2]
  },
  cargo: {
    key: 'cargo', name: 'CARGO HOLD', short: 'CRG', prices: [250, 450, 900],
    tiers: ['EXTRA HOLD', 'BIG HOLD', 'FREIGHT HOLD'],
    descs: ['hold +4 ore', 'hold +8 ore', 'hold +14 ore'],
    brief: ['hold +4 ore', 'hold +8 ore', 'hold +14 ore'],
    add: [0, 4, 8, 14]
  },
  aim: {   // the sixth part (card space-game-cannon-autotarget): the guns turn to the nearest raider in range; tiers 2 and 3 lead a moving one
    key: 'aim', name: 'AUTOTARGET', short: 'AIM', prices: [500, 800, 1400],
    tiers: ['AUTOTARGET', 'AUTOTARGET II', 'AUTOTARGET III'],
    descs: ['guns aim at the nearest raider in 450', 'range 650, and it leads a moving target', 'range 850, leads, the surest aim'],
    brief: ['aims in 450', 'aims in 650, leads', 'aims in 850, leads'],
    range: [0, 450, 650, 850], lead: [0, 0, 1, 1]   // px from the ship, and whether the shot is aimed ahead of a moving target (1) or at it (0)
  }
};
const PART_TIER_NAME = ['', '', ' II', ' III']; // shop cards: SHIELDS, SHIELDS II, SHIELDS III

const clampTier = t => Math.min(3, Math.max(0, t | 0));
// one number of one slot at a tier (0 to 3): partFx('shields', 2, 'pts') is 50
function partFx(slot, tier, field) { return PARTS[slot][field][clampTier(tier)]; }

// the dock row of a station: where it is, what it sells. The Halcyon of today has no dock fields: it sells tiers 1 and 2 at list price.
function stationDock(id) {
  const st = typeof sysBodies === 'function' ? sysBodies('station', G.system).find(b => b.id === (id || G.lastDock)) : null;
  return (st && st.dock) || {};
}
// the highest tier of this slot that the station sells
function partStockCap(slot, dock) {
  dock = dock || stationDock();
  const own = dock.parts && dock.parts[slot] !== undefined ? dock.parts[slot] : dock.shop;
  return Math.min(3, Math.max(0, Number.isFinite(own) ? own | 0 : 2));
}
// what tier `tier` (1 to 3) of this slot costs on this ship at this station, rounded to ten credits
function partPrice(slot, tier, model, dock) {
  const base = PARTS[slot].prices[clampTier(tier) - 1], m = typeof shipModel === 'function' ? shipModel(model) : { partMult: 1 };
  return Math.round(base * (m.partMult || 1) * ((dock || stationDock()).partMult || 1) / 10) * 10;
}
