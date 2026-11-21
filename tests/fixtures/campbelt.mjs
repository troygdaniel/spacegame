// not in the smoke: the old Level 1, the asteroid belt (survey, haulers, the mothership), kept as a FIXTURE level numbered 11 (a number, so a test needs no quotes: campNew(11, ...), __mk(11, 0), the anomaly ids '11.veil')
// Card space-game-l1-rim-missions: Level 1 became the rim run (src/campaign.js CAMP.levels[1]). Many suites use the belt as a plain battle ground (Ceres with thirty-two rocks, cloaked caches, a convoy to
// Mars, waves from fixed places, a mothership): they call belt(g) after nodeGame() and then campNew(11, ...) as they called campNew(1, ...) before. It is the level as it was on main eec8146
// (tag level1-before-rim), unchanged. The game does not have it: only a test that installs it does.
export const BELT = String.raw`{                                                          // THE BELT (card space-game-campaign-belt): the cruiser is a mining ship working the asteroid belt at Ceres. Three missions (card space-game-campaign-missions): survey, haulers, the mothership
      moons: ['luna', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'enceladus'],  // the moons the level shows (CAMP.moons): the missions go to Mars's two and Europa, the rest are places to fly to
      docks: { ceres: 'Occator Works', earth: 'Earth Orbital' },  // the dock names of the level's own bodies (a mission's 'dock'; card space-game-campaign-mission-places). The friendly outposts of the level (building and mending) are 'outposts', below
      name: 'The belt', start: 'ceres', startAt: [130, 30],       // the works the cruiser leaves, and its offset from it
      outposts: { ceres: { name: 'Occator Works' }, vesta: { name: 'Vesta Depot' }, earth: {}, mars: { name: 'Mars base' } }, // the friendly outposts: a place of this level, and what it is called (else the place's own name); the map marks them with a station and the carrier docks within CAMP.outpost.range of one
      world: { system: 'sol', fit: { place: 'ceres', pack: 'sol-ceres' } }, // all of Sol round it (src/campsol.js): Ceres on its own ring of the Sol pack, 29,000 px from the Sun, which is placed from that; Vesta and Pallas are the level's own (same names), Earth, Mars and the rest are far bodies, and the main belt is the ring of rocks the cruiser is working in
      earth: false, startOre: 0, refit: true,                   // no Earth to lose here; the store is empty at the start of the level (30 for a level you start by itself); the level ends with the Earth refit screen
      places: {                                                 // Ceres, Vesta and Pallas (real; docs/SOL.md), with the belt between them (the distances are not true)
        ceres: { x: 0, y: 0, name: 'Ceres', kind: 'ice', seed: 31, r: 90, base: 'Occator Works' },  // the dwarf planet and the mining works the cruiser starts at
        vesta: { x: 2700, y: -1500, name: 'Vesta', kind: 'rock', seed: 41, r: 60 },                  // a large asteroid, north-east
        pallas: { x: -2400, y: 2000, name: 'Pallas', kind: 'rock', seed: 43, r: 60 }                 // another, south-west
      },
      rocks: [                                                  // the belt: n rocks of ore within spread px of at (each holds CAMP.ore.rock); thirty-two in all, 640 ore, more than the store holds
        { at: [900, 700], n: 7, spread: 300 }, { at: [-1100, -400], n: 7, spread: 300 }, { at: [2000, -900], n: 6, spread: 300 },  // one row of the list above: numbers as in its header
        { at: [-1800, 1500], n: 6, spread: 300 }, { at: [300, -1600], n: 6, spread: 300 }  // one row of the list above: numbers as in its header
      ],
      anomalies: [                                              // the cloaked caches (card space-game-campaign-anomalies; src/campanomaly.js): at [x, y] or place + off (the far ones round Mars and Jupiter's moons are a long Fast trip); r the haze; hides the words; guards come out when it is decloaked; reward once
        { id: 'veil', at: [-1900, -1700], hides: 'weapons', guards: { raider: 2 }, reward: { ore: 60, missiles: 2 } },                      // north-west of the survey's first field
        { id: 'lee', at: [-1000, 2800], hides: 'tech', guards: { raider: 2, gunship: 1 }, reward: { ore: 80, turret: 0.15 } },               // between Ceres and Pallas: a lab
        { id: 'shade', at: [4200, 300], hides: 'weapons', guards: { raider: 3, gunship: 1 }, reward: { ore: 100, missiles: 2, tech: 'overdrive' } }, // east of Vesta: the mothership's side of the belt
        { id: 'marsdust', place: 'mars', off: [-700, 600], hides: 'weapons', guards: { raider: 3, gunship: 1 }, reward: { ore: 120, missiles: 2 } },   // far: round Mars, 31,000 px away (a Fast trip of under a minute)
        { id: 'io', place: 'jupiter', off: [900, -700], hides: 'tech', guards: { raider: 4, gunship: 2 }, reward: { ore: 150, turret: 0.2, tech: 'lens' } } // far: Jupiter's moon Io, 23,000 px away
      ],
      missions: [                                               // a mission is a row laid over this one: kind, objectives, bonus objectives (bonus), par (s), its own waves, convoys ... (docs/CAMPAIGN.md, Missions)
        { id: 'survey', kind: 'recon', par: 150, hpScale: 1, dmgScale: 1, scouts: ['recon', 'fetch'], place: 'ceres', dock: 'ceres',  // M1 at Ceres, where the cruiser is (no travel); its points are offsets from Ceres                  // M1: scan three rock fields; the ambush hits when the second is scanned
          objectives: [{ type: 'scan', points: [{ at: [900, 700], r: 320, secs: 8 }, { at: [-1100, -400], r: 320, secs: 8 }, { at: [300, -1600], r: 320, secs: 8 }] }, { type: 'kill', what: 'wave:0' }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'veil' }, { id: 'swift', type: 'time', secs: 150 }, { id: 'clean', type: 'lost', n: 0 }, { id: 'ore', type: 'ore', n: 60 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ on: { scanned: 2 }, ambush: true, from: [3200, 1800], ships: { raider: 4, drone: 3 }, goal: 'carrier', say: 'camp.say.ambush', say2: 'camp.say.ambush2', say2At: 5 }] }, // the ambush: an alarm, out of the dark, two lines
        { id: 'haulers', kind: 'escort', par: 120, hpScale: 1, dmgScale: 1, scouts: ['escort', 'fetch'], place: 'mars', dock: 'phobos',  // M2 at Mars (a trip of about 46 s by Fast): three ore haulers fly from Deimos to Phobos; two must arrive; raiders go for them
          objectives: [{ type: 'deliver', n: 2 }],  // what the mission asks: two haulers must arrive
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'lee' }, { id: 'all', type: 'delivered' }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          convoys: [{ id: 'h1', name: 'Hauler 1', say: 'camp.say.hauler', at: 3, from: 'deimos', to: 'phobos' }, { id: 'h2', name: 'Hauler 2', say: 'camp.say.hauler', at: 18, from: 'deimos', to: 'phobos' }, { id: 'h3', name: 'Hauler 3', say: 'camp.say.hauler', at: 33, from: 'deimos', to: 'phobos' }],  // the haulers: when they leave (s after arrival), from and to which moon of Mars
          waves: [{ at: 10, from: [-1000, -350], ships: { raider: 7, drone: 3 }, goal: 'convoy:h1', say: 'camp.say.raid' }, { at: 26, from: [200, 100], ships: { raider: 7, drone: 3 }, goal: 'convoy:h2', say: 'camp.say.raid2' }, { at: 42, from: [-600, -250], ships: { raider: 6, drone: 4 }, goal: 'convoy:h3', say: 'camp.say.raid2' }],  // the waves: when (s after arrival), from where (offsets from Mars), how many of each kind
          rocks: [{ at: [-1500, 900], n: 6, spread: 300 }, { at: [1200, -900], n: 6, spread: 300 }] },  // two rock fields at Mars, offsets from it
        { id: 'mothership', kind: 'attack', par: 150, hpScale: 1.6, dmgScale: 1.8, scouts: ['recon', 'fetch'], win: 'mother', place: 'europa', dock: 'europa',  // M3 at Europa, a moon of Jupiter (a trip of about 37 s by Fast)   // M3: three waves, the last with the mothership
          objectives: [{ type: 'kill', what: 'mother' }],
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'shade' }, { id: 'swift', type: 'time', secs: 150 }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'clean', type: 'lost', n: 1 }],  // bonus objectives: each met earns CAMP.score.bonus
          rocks: [{ at: [1500, 1200], n: 6, spread: 300 }, { at: [-1700, -900], n: 6, spread: 300 }],  // two rock fields at Europa, offsets from it
          waves: [{ at: 5, from: [3200, 1800], ships: { raider: 4, drone: 3 }, goal: 'carrier', say: 'camp.say.ambush' }, { at: 40, early: 20, from: [-3400, -2600], ships: { drone: 4, gunship: 3 }, goal: 'carrier', say: 'camp.say.bwave2' },  // the waves: when, from where, how many of each kind
            { at: 80, early: 25, needClear: true, from: [2200, -2000], ships: { raider: 4, gunship: 2 }, goal: 'carrier', mother: [2000, -1800], say: 'camp.say.bwave3' }] }  // one row of the list above: numbers as in its header
      ]
    }`;
export const BELT_ID = 11;
// belt(g): the old Level 1 as the fixture level 11 (and its words as camp.m.11.*, camp.bf.11.*, camp.l11.*), beside the real levels: a plain arena for a suite that needs Ceres, rocks, caches, a convoy to Mars, a mothership.
// belt(g, 1): the old Level 1 AS level 1, in place of the rim run, with its old words: for a suite of the machinery of the scenes (the hub, the briefing, the replay, the voice) that was written when level 1 was the belt
//             and pins its nine missions' text and numbers. It tests the machinery, not the rim run's data (tests/camprim.mjs does that).
export function belt(g, as = 11) {
  const words = as === 1 ? BELT_WORDS : Object.fromEntries(Object.entries(BELT_WORDS).map(([k, v]) => [k.replace('camp.m.1.', 'camp.m.11.').replace('camp.bf.1.', 'camp.bf.11.').replace('camp.l1.', 'camp.l11.'), v]));
  g.run('CAMP.levels[' + as + '] = (' + BELT + '); campWorldInstall(); Object.assign(UI_TEXT, ' + JSON.stringify(words) + '); CAMP_HUB.stations[11] = CAMP_HUB.stations[1];');
  return g;
}
// the words of the old Level 1 under the number 11 (camp.m.11.*, camp.bf.11.*, camp.l11.*: the titles, the briefing lines, the story), so a scene suite that flew level 1 can fly level 11 and read what it read
export const BELT_WORDS = {
 "camp.l1.before.3": "Quiet shift. Fill the store.",
 "camp.l1.after.3": "Earth recalls the cruiser for a refit.",
 "camp.m.1.1.title": "Belt survey",
 "camp.m.1.1.b1": "Scan three rock fields.",
 "camp.m.1.1.b2": "Expect company.",
 "camp.m.1.2.title": "Ore haulers",
 "camp.m.1.2.b1": "Escort the haulers from Deimos to Phobos.",
 "camp.m.1.2.b2": "Two must arrive.",
 "camp.m.1.3.title": "The mothership",
 "camp.m.1.3.b1": "Destroy the alien mothership.",
 "camp.m.1.3.b2": "Three waves first.",
 "camp.bf.1.1.w1": "Fly to each of the 3 marked rings on the map.",
 "camp.bf.1.1.w2": "Any ship of yours inside a ring scans it: 8 seconds.",
 "camp.bf.1.1.w3": "Aliens answer your scans. Keep the wing close.",
 "camp.bf.1.1.w4": "Finish by destroying every alien that comes.",
 "camp.bf.1.1.n1": "Welcome aboard, Commander. The three rings to scan are on the map: Tab opens it in flight.",
 "camp.bf.1.1.n2": "Any ship of ours inside a ring scans it. Raiders will answer, so keep the wing close and shoot what comes.",
 "camp.bf.1.1.n3": "W A S D fly the cruiser. Hold Space to fire the turrets. Q opens the fleet panel: 1 launches the wing. Tab opens the map.",
 "camp.bf.1.2.w1": "3 haulers leave Vesta for Ceres, 15 seconds apart.",
 "camp.bf.1.2.w2": "2 must reach Ceres. All 3 earns a bonus.",
 "camp.bf.1.2.w3": "3 waves of raiders come in from the east.",
 "camp.bf.1.2.w4": "Fly along the lane and kill raiders before they close.",
 "camp.bf.1.3.w1": "3 waves come, at 5, 40 and 80 seconds.",
 "camp.bf.1.3.w2": "The mothership arrives with the last wave.",
 "camp.bf.1.3.w3": "Destroy the mothership to win. Missiles (F) help.",
 "camp.l1.before.1": "Ceres belt. The cruiser is mining.",
 "camp.l1.before.2": "Fly over ore, or send the drones: SHIP panel, Mine ore.",
 "camp.l1.after.1": "Mothership destroyed. The belt is clear.",
 "camp.l1.after.2": "Their wreck holds alien technology."
};
