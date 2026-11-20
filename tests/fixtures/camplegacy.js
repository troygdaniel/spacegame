// The Campaign's levels 2 and 3 as whole-level rows, the way they were before the missions (card space-game-campaign-missions): kept for the tests that fly a whole level in one battle.
// A test runs this, then points a slot at one: CAMP.levels[2] = CAMP.levels.legacy2 (and CAMP.levels[1] = CAMP.levels.home for the Earth level).
CAMP.levels.legacy2 = {                                                          // Alpha Centauri: warp in, gather resources, recover what the ancient race left on Proxima b
      name: 'Alpha Centauri', start: 'arrival', startAt: [0, 0], win: 'relic', earth: false,
      world: { system: 'alpha-centauri', star: 'sun', fit: { place: 'proxima', pack: 'proxima-b' }, same: { proxima: 'proxima-b' } }, // the star is the place 'sun'; the pack's other bodies round it sit on their rings and angles, fitted to Proxima b
      warp: { dest: 'Alpha Centauri', ly: 4.4, star: 'sun' },  // the warp cinematic plays when this level starts (src/campwarp.js): where to, how far, and which of the places below is the star that resolves ahead
      places: {                                                 // the carrier warps in at arrival (not drawn); Proxima b holds the relic
        arrival: { x: -4800, y: 2400, name: 'Warp point', hidden: true },                           // where the carrier warps in, south-west of the relic (not drawn)
        sun: { x: -1800, y: -3600, name: 'Alpha Centauri', kind: 'lava', seed: 4371, r: 260 },       // the star of the level, drawn as a lava world, 260 px across its radius
        proxima: { x: 1200, y: 800, name: 'Proxima b', kind: 'rock', seed: 4244, r: 150 }           // the world with the relic on it
      },
      caches: [[-2800, 2000], [-600, 3200], [200, -1800]],       // resource caches (px): collect this many (relic.caches) before the relic will answer
      relic: { place: 'proxima', radius: 240, hold: 8, caches: 2, clear: 650 }, // hold the carrier within radius of the relic for hold seconds, with no alien within clear px of it
      rocks: [{ at: [-3500, 1200], n: 5, spread: 260 }, { at: [-300, 2400], n: 5, spread: 260 }], // two asteroid fields on the way in
      guards: [                                                 // the guards of the relic: they wait until your ships come within reach
        { kind: 'gunship', at: [1700, 400] }, { kind: 'gunship', at: [700, 1300] },                 // two gunships, north-east and south-west of the relic
        { kind: 'drone', at: [1500, 1300] }, { kind: 'drone', at: [500, 300] }, { kind: 'drone', at: [1900, 900] } // three drones round it
      ],
      convoys: [],
      waves: [
        { at: 25, early: 10, from: [-5600, 600], ships: { raider: 3, drone: 2 }, goal: 'carrier', say: 'camp.say.l2wave1' },
        { at: 75, early: 12, from: [4500, -2500], ships: { drone: 3, gunship: 1 }, goal: 'carrier', say: 'camp.say.l2wave2' }
      ]
    };
CAMP.levels.legacy3 = {                                                          // the alien home world: break the defence rings
      name: 'The home world', start: 'arrival', startAt: [0, 0], win: 'towers', earth: false,
      world: { system: 'epsilon-eridani', fit: { place: 'home', pack: 'epsilon-eridani-b' }, same: { home: 'epsilon-eridani-b' }, k: 3 }, // Epsilon Eridani's star and belts round the alien home world, which is the pack's Aegir; k: the rings are this many times the pack's (so the star is not on top of the towers)
      places: {
        arrival: { x: -7000, y: 3500, name: 'Warp point', hidden: true },                          // where the carrier warps in: 7,800 px from the world (not drawn)
        home: { x: 0, y: 0, name: 'Alien home world', kind: 'gas', seed: 77, r: 330 }              // the world, 330 px across its radius
      },
      rocks: [{ at: [-4500, 2200], n: 5, spread: 260 }, { at: [-2500, -500], n: 5, spread: 260 }], // two asteroid fields on the approach
      towers: [                                                 // rings of towers round the place: n towers at r px from it, hp each (omit for the table's)
        { place: 'home', r: 1000, n: 8, phase: 0.2 },                                             // the inner ring: 8 towers 1,000 px from the world
        { place: 'home', r: 1500, n: 4, phase: 0.7, hp: 260 }                                      // the outer ring: 4 tougher towers (260 hit points) 1,500 px out
      ],
      convoys: [],
      waves: [
        { at: 15, early: 8, from: [-3500, 1800], ships: { raider: 4, drone: 2 }, goal: 'carrier', say: 'camp.say.l3wave1' },
        { at: 70, early: 12, from: [2800, -2800], ships: { drone: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave2' },
        { at: 120, early: 14, from: [-2500, -3000], ships: { raider: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave3' }
      ]
    };
