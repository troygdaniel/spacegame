// ---------- Star systems as data (docs/UNIVERSE.md section 4.1) ----------
// One plain object per system. Everything with a place in it is a "body" in `bodies`; src/universe.js looks them up, and the
// scenes (space.js, asteroids.js, poi.js, stationart.js, traffic.js, map.js, missions.js) read their coordinates from there
// instead of keeping tables of their own.
//   body.type   station | planet | belt | poi | scenery | gate (a planet with kind and seed is made by planetTexture; a scenery with look by stationLookFx)
//   body.art    the texture key the body is drawn with (boot.js, stationart.js)
//   labelDy     where the name label sits, in pixels above (negative) or below the body
// Halcyon has exactly the coordinates the game has always used, so nothing moves for the player. The other seven (card u-b5) are authored below it.
// A later card adds the generator (e6): more systems, in the same shape.

const SYSTEMS = {
  halcyon: {
    id: 'halcyon', name: 'Halcyon', kind: 'home',
    ly: [20, 22],                 // galaxy map position, light years (section 4.2)
    size: 36000,                  // world px, square (docs/UNIVERSE.md 2.2): the old 8000 px cluster stays in the north-west corner, the rest is far space
    star: { type: 'G', x: 18000, y: 18000 }, // the sun, in the middle (content/systems/halcyon.md says the same): a body you can fly to (src/universe.js sysStar)
    danger: 1, traffic: 2,        // 0 to 5 and 0 to 3 (it has police, so traffic is 2 or more)
    pirates: { max: 8, every: 15000, weights: { raider: 0.25, drone: 0.35, gunship: 0.4 } }, // the spawn table (enemies.js pirateTable): what Halcyon has always done; other systems get one from their danger
    bodies: [
      { id: 'halcyon-station', type: 'station', art: 'station', name: 'Halcyon Station', x: 4000, y: 4000, labelDy: -260,
        dock: { fuel: 8, yard: ['kite'], missions: ['rescue', 'escort', 'patrol', 'bounty', 'courier-halcyon-kestrel', 'courier-halcyon-brass', 'haul-halcyon-brass', 'survey-hollow'] } }, // dock: what the station offers; fuel is the price of a unit at its pump (src/fuel.js), a station without it has no pump; yard is the ship models it sells (src/fleet.js), the Kite as before until card u-b5 authors the real yards
      { id: 'kepler-4b', type: 'planet', art: 'planet', name: 'Kepler-4b', x: 6200, y: 2000, r: 316, landable: true },
      { id: 'kepler-belt', type: 'belt', name: 'Kepler Belt', x: 5500, y: 1300, r: 700, rocks: 15 }, // north-west of Kepler-4b

      // salvage sites: you find one by flying within sensor range and press E beside it; each pays once per game
      { id: 'wreck-nw', type: 'poi', kind: 'wreck', x: 1400, y: 1300, name: 'Derelict freighter', credits: 120,
        note: 'Strongbox recovered.' },
      { id: 'wreck-w', type: 'poi', kind: 'wreck', x: 1000, y: 3300, name: 'Wrecked patrol cutter', hull: 40,
        note: 'A repair kit was still sealed.' },
      { id: 'wreck-se', type: 'poi', kind: 'wreck', x: 6900, y: 6500, name: 'Drifting survey rig', credits: 150,
        note: 'Sold the data core.' },
      { id: 'wreck-s', type: 'poi', kind: 'wreck', x: 3800, y: 7100, name: 'Cargo hulk', credits: 250, guard: 2,
        note: 'The pirates were guarding this.' },
      { id: 'beacon-e', type: 'poi', kind: 'beacon', x: 7300, y: 4200, name: 'Distress beacon', credits: 200, guard: 1,
        note: 'The crew is long gone. The vault code still works.' },

      // scenery you can fly to but not dock at; clear of the belt, the wrecks, the planet and the dock lane
      { id: 'kestrel-outpost', type: 'scenery', art: 'outpost', name: 'Kestrel Outpost', x: 2000, y: 5800, labelDy: -175 },

      // where the MULE is escorted to (src/missions.js)
      { id: 'perseus-gate', type: 'gate', name: 'Perseus gate', x: 1800, y: 6200, r: 110 },

      // far space: beyond the old 8000 px cluster, reached by cruise (src/cruise.js draws these with cruiseFarBodies).
      // kind + seed pick a planet from src/art_world.js planetTexture; r is the radius in world px; look is a station look from src/stationart.js
      { id: 'kepler-4c', type: 'planet', kind: 'rock', seed: 3, name: 'Kepler-4c', x: 17000, y: 4200, r: 210, landable: false },
      { id: 'slag-belt', type: 'belt', name: 'Slag Belt', x: 12500, y: 22000, r: 1100, rocks: 40 },
      { id: 'tern', type: 'planet', kind: 'gas', seed: 2, name: 'Tern', x: 27500, y: 25500, r: 440, landable: false },
      { id: 'tern-wreck', type: 'scenery', look: 'derelict', name: 'Dead station', x: 24400, y: 22800, labelDy: -240 }
    ]
  },
  // The other seven of docs/UNIVERSE.md 4.2 (card u-b5). They are the same data as content/systems/ and content/stations/ say (tests/systems.mjs pins the two
  // against each other field by field); what the files add is the words (description, welcome, services, bar), which the Station scene reads from them.
  //   star       { type, x, y }: type (M K G F A) picks the tint of the backdrop (src/art_world.js STAR_TYPES, spaceBackdrop); no sun is drawn in the sky
  //   pirates    this system's spawn table (src/enemies.js pirateTable); left out, it comes from the danger
  //   pay        a multiplier on what a call pays that is paid in this system (src/missions.js callPayMult; docs/ECONOMY.md 9); left out it is 1
  //   dock       what a station offers, and all of it is read (card u-e4): fuel (credits a unit, src/fuel.js), repair (credits a hull point, src/station.js repairPrice), ore (credits an
  //              ore, src/asteroids.js orePrice), yard (ships it sells, src/fleet.js), shop and parts (the slots it sells and to which tier) and partMult (the price of its parts,
  //              src/data_parts.js), fee (taken at the door when you dock, src/station.js dockFee), salvageMult (what a wreck pays in this system, src/poi.js), missions (its board).
  //              Halcyon's dock leaves repair and ore out: they are REPAIR_PRICE and ORE_PRICE, which content/stations/halcyon-station.md can set, and the fallback of a dock with none
  //   art        'station' is Halcyon's ring, 'outpost' a small frontier dock, 'hub' 'foundry' 'nest' 'derelict' the looks of src/stationart.js
  kestrel: {
    id: 'kestrel', name: 'Kestrel', kind: 'outpost', ly: [25.5, 19], size: 36000, danger: 1, traffic: 1, seed: 5191,
    star: { type: 'K', x: 18000, y: 18000 },
    bodies: [
      { id: 'kestrel-outpost', type: 'station', art: 'outpost', name: 'Kestrel Outpost', x: 9000, y: 21000, dock: { fuel: 7, repair: 0.5, missions: ['courier-kestrel-halcyon', 'courier-kestrel-meridian', 'haul-kestrel-meridian'], shop: 0, parts: { engine: 1, tank: 1 }, partMult: 1.1 } },
      { id: 'kestrel-giant', type: 'planet', kind: 'ringed', seed: 11, name: 'Kestrel Prime', x: 24500, y: 12500, r: 520, landable: false },
      { id: 'kestrel-2', type: 'planet', kind: 'rock', seed: 12, name: 'Kestrel II', x: 13000, y: 9500, r: 260, landable: false },
      { id: 'kestrel-belt', type: 'belt', name: 'Kestrel Belt', x: 22000, y: 25000, r: 800, rocks: 20 },
      { id: 'beacon-k', type: 'poi', kind: 'beacon', name: 'Drifting nav beacon', x: 30500, y: 8500, credits: 180 }
    ]
  },
  meridian: {
    id: 'meridian', name: 'Meridian', kind: 'trade', ly: [29, 24.5], size: 36000, danger: 1, traffic: 3, pay: 1.1, seed: 2210,
    star: { type: 'F', x: 18000, y: 18000 },
    bodies: [
      { id: 'meridian-exchange', type: 'station', art: 'hub', name: 'Meridian Exchange', x: 17000, y: 21000, dock: { fuel: 9, repair: 0.5, ore: 26, yard: ['wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion'], missions: ['courier-meridian-kestrel', 'courier-meridian-ember', 'courier-meridian-roost', 'haul-meridian-ember', 'salvage-lethe', 'survey-hollow'], shop: 0, parts: { shields: 3, weapons: 3, engine: 3, tank: 3, cargo: 3, aim: 3 }, partMult: 0.9 } },
      { id: 'meridian-2', type: 'planet', kind: 'ice', seed: 21, name: 'Meridian II', x: 8500, y: 26500, r: 300, landable: false },
      { id: 'meridian-4', type: 'planet', kind: 'gas', seed: 22, name: 'Meridian IV', x: 29500, y: 28500, r: 480, landable: false },
      { id: 'meridian-belt', type: 'belt', name: 'Meridian Belt', x: 10500, y: 8000, r: 700, rocks: 15 },
      { id: 'wreck-m', type: 'poi', kind: 'wreck', name: 'Wrecked cargo barge', x: 31000, y: 6500, credits: 200 }
    ]
  },
  brass: {
    id: 'brass', name: 'Brass Reach', kind: 'mining', ly: [14, 26.5], size: 36000, danger: 2, traffic: 1, pay: 1.15, seed: 7714,
    star: { type: 'K', x: 18000, y: 18000 },
    pirates: { max: 6, every: 13000, weights: { raider: 0.6, drone: 0.3, gunship: 0.1 } },
    bodies: [
      { id: 'brass-smelter', type: 'station', art: 'foundry', name: 'Brass Smelter', x: 9000, y: 21000, dock: { fuel: 6, repair: 0.5, ore: 30, yard: ['ox'], missions: ['courier-brass-halcyon', 'haul-brass-halcyon', 'salvage-lethe'], shop: 0, parts: { cargo: 3, tank: 3 } } },
      { id: 'brass-3', type: 'planet', kind: 'rock', seed: 31, name: 'Brass III', x: 24000, y: 9000, r: 300, landable: false },
      { id: 'brass-belt-a', type: 'belt', name: 'Brass Belt', x: 12500, y: 13500, r: 900, rocks: 40 },
      { id: 'brass-belt-b', type: 'belt', name: 'Cinder Belt', x: 26500, y: 21500, r: 800, rocks: 30 },
      { id: 'brass-veinfield', type: 'belt', name: 'Veinfield', x: 19000, y: 30500, r: 700, rocks: 25 },
      { id: 'wreck-b', type: 'poi', kind: 'wreck', name: 'Burnt-out ore tug', x: 30500, y: 30500, credits: 150 }
    ]
  },
  hollow: {
    id: 'hollow', name: 'The Hollow', kind: 'wild', ly: [13.5, 17.5], size: 36000, danger: 2, traffic: 0, seed: 3303,
    star: { type: 'M', x: 18000, y: 18000 },
    bodies: [
      { id: 'hollow-ice', type: 'planet', kind: 'ice', seed: 41, name: 'Hollow Ice', x: 21000, y: 16500, r: 380, landable: true },
      { id: 'hollow-belt', type: 'belt', name: 'Hollow Belt', x: 28500, y: 9500, r: 800, rocks: 18 },
      { id: 'beacon-h', type: 'poi', kind: 'beacon', name: 'Old survey beacon', x: 9500, y: 28000, credits: 120 }
    ]
  },
  lethe: {
    id: 'lethe', name: 'Lethe', kind: 'graveyard', ly: [7.5, 30], size: 36000, danger: 2, traffic: 0, seed: 9042,
    star: { type: 'M', x: 18000, y: 18000 },
    pirates: { max: 8, every: 11000, weights: { drone: 0.8, raider: 0.15, gunship: 0.05 } },
    bodies: [
      { id: 'lethe-dead', type: 'planet', kind: 'rock', seed: 51, name: 'Lethe', x: 18000, y: 24000, r: 250, landable: false },
      { id: 'lethe-wreck-1', type: 'poi', kind: 'wreck', name: 'Ore hauler', x: 28603, y: 21094, credits: 150 },
      { id: 'lethe-wreck-2', type: 'poi', kind: 'wreck', name: 'Passenger liner', x: 26681, y: 25879, credits: 100 },
      { id: 'lethe-wreck-3', type: 'poi', kind: 'wreck', name: 'Patrol cutter', x: 22669, y: 29020, credits: 220 },
      { id: 'lethe-wreck-4', type: 'poi', kind: 'wreck', name: 'Mining tug', x: 17891, y: 28656, credits: 260 },
      { id: 'lethe-wreck-5', type: 'poi', kind: 'wreck', name: 'Survey ship', x: 12527, y: 27849, credits: 150 },
      { id: 'lethe-wreck-6', type: 'poi', kind: 'wreck', name: 'Cargo barge', x: 7990, y: 24426, credits: 260 },
      { id: 'lethe-wreck-7', type: 'poi', kind: 'wreck', name: 'Troop carrier (the Widow)', x: 5733, y: 20424, credits: 800 },
      { id: 'lethe-wreck-8', type: 'poi', kind: 'wreck', name: 'Tanker', x: 7738, y: 13910, credits: 120 },
      { id: 'lethe-wreck-9', type: 'poi', kind: 'wreck', name: 'Yacht', x: 9298, y: 10355, credits: 220 },
      { id: 'lethe-wreck-10', type: 'poi', kind: 'wreck', name: 'Salvage tug', x: 13550, y: 7099, credits: 100 },
      { id: 'lethe-wreck-11', type: 'poi', kind: 'wreck', name: 'Courier', x: 19500, y: 6881, credits: 260 },
      { id: 'lethe-wreck-12', type: 'poi', kind: 'wreck', name: 'Freighter', x: 23729, y: 7178, credits: 180 },
      { id: 'lethe-wreck-13', type: 'poi', kind: 'wreck', name: 'Ferry', x: 27306, y: 11279, credits: 120 },
      { id: 'lethe-wreck-14', type: 'poi', kind: 'wreck', name: 'Gunship hulk', x: 29802, y: 15598, credits: 150 }
    ]
  },
  ember: {
    id: 'ember', name: 'Ember', kind: 'volcanic', ly: [34, 31], size: 36000, danger: 3, traffic: 1, pay: 1.3, seed: 6188,
    star: { type: 'A', x: 18000, y: 18000 },
    pirates: { max: 10, every: 9000, weights: { raider: 0.45, drone: 0.15, gunship: 0.4 } },
    bodies: [
      { id: 'ember-foundry', type: 'station', art: 'foundry', name: 'Ember Foundry', x: 22000, y: 15000, dock: { fuel: 6, repair: 0.5, ore: 28, yard: ['talon'], missions: ['courier-ember-meridian', 'haul-ember-meridian'], shop: 0, parts: { weapons: 3, aim: 3 } } },
      { id: 'ember-lava', type: 'planet', kind: 'lava', seed: 61, name: 'Ember', x: 10000, y: 23500, r: 420, landable: false },
      { id: 'ember-belt-a', type: 'belt', name: 'Slag Run', x: 28500, y: 26000, r: 900, rocks: 40 },
      { id: 'ember-belt-b', type: 'belt', name: 'Cinder Field', x: 14000, y: 8500, r: 800, rocks: 30 },
      { id: 'wreck-e', type: 'poi', kind: 'wreck', name: 'Melted drill ship', x: 31500, y: 8000, credits: 220 }
    ]
  },
  roost: {
    id: 'roost', name: 'Reaver\'s Roost', kind: 'nest', ly: [37, 15], size: 36000, danger: 5, traffic: 0, pay: 1.6, seed: 1313,
    star: { type: 'M', x: 18000, y: 18000 },
    bodies: [
      { id: 'roost-dock', type: 'station', art: 'nest', name: 'Roost Dock', x: 18000, y: 22000, dock: { fuel: 15, repair: 0.75, yard: ['bastion'], shop: 0, parts: { shields: 3, weapons: 3, aim: 3 }, partMult: 1.25, fee: 50, salvageMult: 2 } },
      { id: 'roost-rock', type: 'planet', kind: 'rock', seed: 71, name: 'Reaver\'s Rock', x: 8000, y: 8500, r: 280, landable: false },
      { id: 'roost-belt', type: 'belt', name: 'Roost Belt', x: 27500, y: 12000, r: 900, rocks: 35 },
      { id: 'wreck-r1', type: 'poi', kind: 'wreck', name: 'Raided freighter', x: 30500, y: 28500, credits: 300 },
      { id: 'wreck-r2', type: 'poi', kind: 'wreck', name: 'Stripped patrol cutter', x: 7500, y: 28500, credits: 250 }
    ]
  }
};

// ---------- The scale of a system (card space-game-system-distances) ----------
// Troy, 17 Nov 2026: places are too close together. Everything above, and every file in content/systems, is written in the old units; SYSTEM_SCALE spreads it
// out. sysScale(def) multiplies where things ARE (the world's size, the star, each body's x and y) and leaves how BIG they are alone (a planet's or a belt's r,
// a gate's ring, labelDy), so flying by hand near a station, the fight and the dock are as they were and only the space between places grows.
// It is applied once to each row: here to SYSTEMS, in worldFromFiles (src/contenttables.js) to a system read from the files, and in makeSystem (src/universe.js)
// to a generated one. So every position the game reads is already scaled, and a test that pins a position multiplies the authored number by SYSTEM_SCALE.
// sysAt(n) is that sum for a number written in the old units (a distance from the data, a spot beside a body).
const SYSTEM_SCALE = 3;
const sysAt = n => Math.round(n * SYSTEM_SCALE);
function sysScale(def) {
  if (!def || def.scaled) return def;
  if (typeof def.size === 'number') def.size = sysAt(def.size);
  if (def.star) { if (typeof def.star.x === 'number') def.star.x = sysAt(def.star.x); if (typeof def.star.y === 'number') def.star.y = sysAt(def.star.y); }
  (def.bodies || []).forEach(b => { if (typeof b.x === 'number') b.x = sysAt(b.x); if (typeof b.y === 'number') b.y = sysAt(b.y); });
  Object.defineProperty(def, 'scaled', { value: SYSTEM_SCALE, enumerable: false }); // not a field of the row: the files have no such key
  return def;
}
Object.keys(SYSTEMS).forEach(id => sysScale(SYSTEMS[id]));
