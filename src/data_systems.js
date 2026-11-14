// ---------- Star systems as data (docs/UNIVERSE.md section 4.1) ----------
// One plain object per system. Everything with a place in it is a "body" in `bodies`; src/universe.js looks them up, and the
// scenes (space.js, asteroids.js, poi.js, stationart.js, traffic.js, map.js, missions.js) read their coordinates from there
// instead of keeping tables of their own.
//   body.type   station | planet | belt | poi | scenery | gate (a planet with kind and seed is made by planetTexture; a scenery with look by stationLookFx)
//   body.art    the texture key the body is drawn with (boot.js, stationart.js)
//   labelDy     where the name label sits, in pixels above (negative) or below the body
// Only Halcyon exists so far, with exactly the coordinates the game has always used, so nothing moves for the player.
// Later cards add the other systems here (b5), more body kinds (b6) and the generator (e6).

const SYSTEMS = {
  halcyon: {
    id: 'halcyon', name: 'Halcyon', kind: 'home',
    ly: [20, 22],                 // galaxy map position, light years (section 4.2)
    size: 36000,                  // world px, square (docs/UNIVERSE.md 2.2): the old 8000 px cluster stays in the north-west corner, the rest is far space
    danger: 1, traffic: 2,        // 0 to 5 and 0 to 3 (it has police, so traffic is 2 or more)
    pirates: { max: 8, every: 15000, weights: { raider: 0.25, drone: 0.35, gunship: 0.4 } }, // the spawn table (enemies.js pirateTable): what Halcyon has always done; other systems get one from their danger
    bodies: [
      { id: 'halcyon-station', type: 'station', art: 'station', name: 'Halcyon Station', x: 4000, y: 4000, labelDy: -260 },
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
  }
};
