// ---------- Campaign: Earth's fleet against the aliens (docs/CAMPAIGN.md, card space-game-campaign-mvp) ----------
// The whole mode in plain numbers, no Phaser: the tuning table, the ships, the waves, the five orders, win and lose, the tech pick and its save.
// src/campaignscene.js reads the keys, calls campStep(C, seconds) and draws what C says; tests/campaign.mjs flies whole battles of it in Node.
//   campNew(level, techs, opts)      a fresh game of one level: C. opts.seed makes the alien flying repeat exactly (tests); opts.god: the carrier cannot die;
//                                    opts.via: how the level was started ('menu', 'address', 'next', 'retry', 'skip'): kept on C, and read by the play log
//   campStep(C, seconds)             the game moves on (cut into CAMP.step pieces); C.events gets what the scene should show, and the scene empties it
//   campOrder(C, name, arg, how)     one of the five orders: launch, attack, escort, guard, recall -> { ok, code, say }; how: 'key', 'strip', 'voice' or 'click' (the play log's)
//   campCheck(C, name, arg)          the same answer and nothing done (the ship computer checks, announces, then orders)
//   campIntent(text)                 plain words -> { act: 'fleet_attack', arg } or null (the ship computer calls it; src/shipcomputer.js)
//   campTechChoices(level)           the three techs offered after that level;  campPick(P, id): the pick, kept in P
//   campProgressLoad() / campProgressSave(P)   { level, techs } in localStorage under CAMP.store, apart from the Long Haul save
//   campStory(level, 'before' | 'after')       the plain lines of the story, from content/text/ui.md (keys camp.l<level>.<before|after>.<n>)
// C: { level, t (ms), ships, bullets, events, input, earth, bay, techs, carrier, result ('won' | 'lost' | null), why, delivered, lost, kills, ... }
// A ship: { id, kind, team ('earth' | 'alien'), x, y, vx, vy, rot, hp, maxHp, r, vmax, accel, turn, def, order }  (the alien ones are src/enemies.js PIRATES)
// The aliens fly with the game's own pirateSteer (circle, pass, break, run), so a fight here moves like a fight in Long Haul.
//
// ---------- THE TUNING TABLE: every number you will want to change is here, in this one table, one line each ----------
// Units: px, seconds for the times written in a level (at, early), milliseconds for a delay or a cooldown, px/s for a speed, rad/s for a turn.
const CAMP = {
  store: 'longhaul.campaign',              // the localStorage key of the campaign progress (the level reached and the techs picked)
  step: 1 / 30,                            // s: the longest step the sim takes at once (a longer frame is cut into steps)
  size: {                                  // how big your ships are: the one place for it (card space-game-campaign-look: another 30 percent smaller than the 140 x 100, 31 x 23 and 40 x 29 px they were drawn at). len: the drawn length in px (the scene scales the picture to it); hit: the hit circle's radius in px, about half of len over two, as it always was
    carrier: { len: 98, hit: 25 },         // it was 140 and 36
    fighter: { len: 22, hit: 6 },          // it was 31 and 8
    escort: { len: 28, hit: 7 }            // it was 40 and 10
  },
  carrier: {
    hull: 600,                             // hit points of the flagship; zero and the level is lost
    speed: 210,                            // px/s, top speed: big, slow, heavy
    accel: 170,                            // px/s per s of thrust (W)
    turn: 1.1,                             // rad/s the nose turns (A, D)
    drag: 0.55,                            // velocity kept after one second with no thrust (0.55 is the Wren's)
    brakeDrag: 0.12,                       // the same with S held
    mounts: [[30, -7], [30, 7], [10, -20], [10, 20], [-6, -20], [-6, 20], [-22, -20], [-22, 20]], // the turrets (there is no other gun): where each sits, px from the carrier's centre in its own frame (x along the nose), spread along the hull; the number of turrets is the number of rows
    pd: 4,                                 // hit points one turret shot takes off an alien
    pdDelay: 700,                          // ms between the shots of one turret (eight of them: 46 hit points a second in all): they fire only while Space is held, each at the nearest alien in its reach, and never on their own
    pdRange: 500,                          // px a turret reaches (to the edge of the alien it aims at: about three and a half carrier lengths)
    pdSpeed: 800,                          // px/s of a turret shot
    lead: 1,                               // how far ahead a turret aims: 1 is where its shot and the alien meet (the alien's speed, the shot's, the carrier's drift), 0 is where the alien is now
    stagger: 1,                            // 1: each turret fires on a slot of its own, offset from the next by pdDelay over the number of turrets, so the fire is continuous; 0: all eight on the same beat (a volley, as it was)
    jitter: 12,                            // ms: how far a turret's slot is moved at random (a stream of its own), so the rattle is not a metronome; keep it under half of pdDelay over the number of turrets (44 ms)
    shield: 150                            // points of shield: they take damage before the hull, do not mend by themselves, and ore refills them (recharge, key 7)
  },
  ore: {                                   // ore: asteroid rocks and the wrecks of dead aliens; spent on shields and new ships (docs/CAMPAIGN.md, Ore)
    start: 30,                             // ore in the store at the start of a level
    cap: 200,                              // most ore the carrier's store holds
    rock: 20,                              // ore in one rock of an asteroid field: a mining laser cuts the rock and it breaks into a chunk of this much ore
    rockHp: 100,                           // hit points of a rock: a laser takes them off, the rock glows and cracks, and at zero it breaks
    rockR: 22,                             // px, a rock's size (its hit circle, and how far from its middle a beam lands)
    reach: 70,                             // px: any ship of yours this close to a piece of ore takes it
    wreck: { raider: 4, drone: 6, gunship: 12, tower: 20, mother: 40 }, // ore a dead alien leaves where it died (a kind not listed leaves none)
    wreckLife: 30000,                      // ms a wreck's ore lies there before it is gone
    danger: 500                            // px: a mining ship keeps away from ore that has an alien this close to it
  },
  laser: {                                 // the mining lasers: the wing's (the drones), and the turrets' (Space held beside a rock, with no alien in reach)
    dps: 5,                                // hit points a second one mining ship takes off the rock it works (a rock is cut in 100 / 5 = 20 s by one, 4 s by five)
    range: 230,                            // px a mining ship's laser reaches (to the edge of the rock)
    hold: 150,                             // px from the rock a mining ship keeps while it works
    turret: 0.35                           // the share of a turret shot's damage that cuts a rock (the turrets are the same lasers: they do less to rock than to an alien)
  },
  recharge: {
    carrier: 25,                           // ore for a full carrier shield (a part refill costs the same share of it, at least 5)
    earth: 40,                             // ore for one recharge of Earth's shield
    earthPoints: 200,                      // shield points that gives Earth
    earthReach: 900                        // px: the carrier must be this close to Earth to recharge Earth's shield
  },
  build: {
    fighterCost: 25,                       // ore for a new fighter
    fighterTime: 6,                        // s to build it (one ship at a time, into the bay)
    escortCost: 45,                        // ore for a new escort
    escortTime: 10,                        // s to build it
    maxFighters: 14,                       // most fighters in the bay and out together (and queued)
    maxEscorts: 6,                         // most escorts, the same way
    most: 5                                // most ships one order queues
  },
  beamHum: {                               // the hum of a beam (card space-game-campaign-sounds): what src/audio.js beamHum is told
    rise: 2,                               // s of unbroken fire (Beam turrets tech, Space held, a turret on a target) until the hum has climbed all the way
    laserLevel: 0.8,                       // how loud the hum of a mining laser is (the same hum on any rock), against the beam turrets' 1
    alienLaser: 0                          // 1: a plain turret shot at an alien (a kind 'alien' beam in C.lasers) hums too, over its pew; 0: it keeps its pew only, and the hum is for rocks and the Beam turrets
  },
  missile: {                               // the missile launcher (F, or the order "missiles"): a homing missile for the mothership and the other big ships (card space-game-campaign-missiles)
    magazine: 6,                           // missiles you start with, and how many the slow reload fills the magazine to
    max: 12,                               // the most the magazine can ever hold (C.missiles, a plain number: the ore code adds to it with campMissileAdd)
    reload: 15000,                         // ms until one missile is back in the magazine while it is below `magazine`
    delay: 700,                            // ms between two launches (the launcher cycles)
    lock: 2400,                            // px: a big ship this close to the carrier can be locked (the mothership first, else the nearest tower or gunship)
    bigKinds: ['mother', 'tower', 'gunship'], // the ships that count as big: the missile aims at them, its fuze goes off on them, they take `big`
    speed: 560,                            // px/s top speed
    launch: 120,                           // px/s it leaves the tube at
    accel: 800,                            // px/s per s: from there it gets up to speed
    turn: 3.4,                             // rad/s the missile turns toward its target
    life: 7000,                            // ms of fuel: out of it the missile dies with no bang
    fuze: 34,                              // px from the edge of a big ship at which the missile goes off
    blast: 80,                             // px: every alien this close to where it went off is hurt
    big: 100,                              // hit points a big ship loses (six missiles take 600 of the mothership's 700: the guns and the wing finish it)
    small: 10                              // hit points any other alien loses (a raider, a drone)
  },
  bay: {
    fighters: 6,                           // fighters in the bay at the start
    escorts: 2,                            // escorts in the bay at the start
    launchEvery: 600,                      // ms between ships leaving the bay once Launch is ordered
    mouth: [21, 19.5],                     // px from the carrier's centre (x along the nose, y to the side): where a launched ship appears, one side and then the other: just in front of the launch tube of a hangar pod (CAMP_ART.cruiser.launch)
    dockAt: 63                             // px: a recalled ship this close to the carrier lands (and is whole again when next launched)
  },
  fighter: {
    hp: 36,                                // hit points
    speed: 430,                            // px/s top speed
    accel: 520,                            // px/s per s
    turn: 4.2,                             // rad/s
    damage: 8,                             // hit points one shot takes off an alien
    delay: [450, 650],                     // ms between shots, from and to
    bullet: 700,                           // px/s of a shot
    range: 420,                            // px it shoots from
    aim: 0.3,                              // rad: how far off its target the nose may be and still fire
    hold: 240                              // px: the ring it circles an alien at (pirateSteer's hold)
  },
  escort: {
    hp: 90, speed: 300, accel: 360, turn: 2.6, damage: 6, delay: [350, 500], bullet: 650, range: 520, aim: 0.35, hold: 300, // as a fighter: tougher, slower, longer reach
    beside: 150                            // px: how far from its convoy an escort keeps station
  },
  convoy: {
    hp: 200,                               // hit points of a freighter
    speed: 120                             // px/s: the same as the MULE of the escort call
  },
  warp: {                                  // the warp cinematic at the start of a level that warps in (src/campwarp.js): times are seconds from its start, places are fractions of the screen, sizes are px
    total: 7.2,                            // s: the whole cinematic (6 to 8); any key skips it
    grace: 0.4,                            // s: a key in the first moments is ignored (the key that started the level may still be down)
    pull: [0, 2.2],                        // s: Earth and the Sun pull away behind the carrier and shrink
    stretch: [0.9, 3.0],                   // s: the stars stretch into streaks: the speed builds from nothing to full
    tunnel: [2.4, 5.7],                    // s: the bright tunnel (ribbons, gates, the light at the nose) comes up and runs at full speed
    flash: [5.3, 6.1],                     // s: the white flash that hides the change; it peaks halfway
    resolve: [5.8, 7.2],                   // s: the new star resolves ahead and the streaks slow to stars again
    skipFade: 0.4,                         // s: after a key the flash comes up and the cinematic ends in this long
    hold: 2.4, fade: 0.4,                  // s: a line of words stays this long, and fades in and out in this
    lines: [{ at: 0.5, key: 'camp.warp.l1' }, { at: 3.4, key: 'camp.warp.l2', hold: 1.9 }, { at: 5.9, key: 'camp.warp.l3', hold: 0.8 }], // s: when each line comes up and, when it is not the usual hold, how long it stays (one line at a time; the words are camp.warp.* in content/text/campwarp.md; the ship's voice says them too)
    cues: [{ at: 0.3, sfx: 'hyperCharge' }, { at: 2.5, sfx: 'hyperJump' }, { at: 5.6, sfx: 'hyperArrive' }], // s: the sounds of src/audio.js (the swell, the jump, the arrival), and when; the hum under them is Long Haul's own (src/hyperspace.js)
    ship: { x: 0.36, y: 0.5 },             // the carrier's place across the screen
    earth: { x: 0.22, y: 0.5, radius: 160, endX: -0.08, endScale: 0.04 }, // Earth behind the carrier: where it starts, its radius in px, where it ends, and its size then as a share of the start
    sun: { x: 0.1, y: 0.26, size: 150, endScale: 0.1 }, // the Sun far behind: its glow's size in px at the start, and as a share of that at the end
    star: { x: 0.8, y: 0.5, radius: 230, glow: 520 }, // the new star ahead once it has resolved: its disc's radius and its glow's size in px
    companions: [{ dx: -0.1, dy: -0.12, size: 70, color: 0xffa860 }, { dx: 0.09, dy: 0.2, size: 26, color: 0xff6a4a }], // Alpha Centauri B (orange, near) and Proxima (red, small, far) beside the star: offsets as fractions of the screen, glow size in px
    color: { tunnel: 0x9fe9ff, warm: 0xffe2a8, star: 0xffd98a, sun: 0xfff2c0, flash: 0xffffff }, // the tunnel's cool light, the warm light it ends in, Alpha Centauri A, the Sun, the flash
    shake: 0.0014,                         // the camera shake while the tunnel runs
    stars: 200, near: 24,                  // streaks across the screen, of which this many are long and close
    textY: 0.84                            // where the words sit, down the screen
  },
  world: {                                 // the worlds of Sol and of the other stars (src/campsol.js): the pack's bodies at the Campaign's scale, the rings round the star, the belts as rings of rocks
    scale: 0.25,                           // px of the Campaign per unit of a system file of the Sol pack: the game spreads a file's units 3 times (SYSTEM_SCALE) and the Campaign is 1 to 12 of that
    planetR: 0.55,                         // a body's radius in the Campaign: its radius in the pack times this (the Campaign's Earth, Mars, Luna and Eros are 0.5 to 0.8 of the pack's)
    starR: 0.55,                           // the star's radius: Long Haul's (900 px of a size 1 star, src/universe.js) times this
    farFrom: 9000,                         // px from where the level starts: a body this far is far (it is not in the level's own map view, the radar or the list of what to fight for)
    ringTol: 0.02,                         // bodies whose distances from the star differ by less than this share are on one ring
    bandJoin: 0.2,                         // belts of the pack whose rings differ by less than this share are one band of rocks (the main belt is three of them, 19 percent apart)
    clusterTol: 0.01,                      // a belt on the ring of a planet (the Trojan camps) is a cluster of rocks round its place, not a ring
    dots: 700,                             // rocks drawn in a band of the belt on the map
    clusterDots: 40,                       // rocks drawn in a cluster
    draw: 3600,                            // px: a far place is made in the world (a picture) only while the carrier is within this many px of its edge
    skip: ['sol-pluto']                    // pack bodies the Campaign does not take (the eight planets are the card's; Pluto is a dwarf)
  },
  nav: {                                   // the carrier's autopilot, the map's list and picking, and the arrow at the screen edge (src/campnav.js); the rule is the Long Haul autopilot's (src/autopilot.js AUTO)
    stop: 100,                             // px: a place is flown to until the edge of it (its radius plus this) is this near
    stopShip: 450,                         // px: a ship (a convoy, the mothership, a tower) is flown to until it is this near: inside the main gun's reach
    stopPoint: 40,                         // px: a point (a cache, the relic ring, your wing) is flown to until it is this near
    arrive: 60,                            // px: this much past the stop distance still counts as arrived
    drop: 70,                              // px/s: under this speed, and arrived, the autopilot lets go
    floor: 40, brake: 1.2,                 // the speed limit is floor plus brake times the px left (the Long Haul autopilot's own rule), so it keeps moving to the end and brakes in time
    steer: 3,                              // turn input per radian off the line to the target (1 is full turn, so 3 is full beyond a third of a radian)
    align: 0.5,                            // rad: thrust only when the nose is within this of the line (the Long Haul autopilot's aligned)
    etaSlow: 1.1,                          // the flight time on the map is distance over the carrier's top speed times this (it speeds up and brakes)
    fast: 2.2,                             // the map's Fast button (card space-game-map-click-fly): the carrier's top speed and thrust, times this, while the autopilot flies it; steering takes it away. 462 px/s: above a fighter's 430 (and an escort's 300), so a ship of the wing could not keep up: Fast needs the wing aboard (card space-game-campaign-fast-board)
    recallWait: 20,                        // s: after a second press of Fast with ships out, how long the wing has to get back aboard before the burn is given up (the ships still out are named)
    askFor: 8,                             // s: a first press of Fast with ships out is refused and remembered this long: a second press in that time recalls the wing and burns once the last ship is aboard
    farFrom: 8000,                         // px: a Fast trip longer than this (Earth to Mars is 4,100, Earth to Jupiter 40,000) burns at farFast instead of fast (card space-game-campaign-sol)
    farFast: 3.2,                          // times the carrier's speed on a far trip: 672 px/s, Long Haul's own cruise (8,000 px/s) at the Campaign's 1 to 12 scale, so Earth to Neptune (112,000 px) is about 3 minutes
    pick: 28,                              // px on the map around a mark that count as a click on it
    list: 9,                               // lines of the list on the map at once (a heading is a line)
    arrow: {
      margin: 40, min: 600,                // the edge arrow: px in from the screen edge, and the distance in px under which there is none
      keep: [[0, 0, 360, 176], [1056, 0, 1280, 226], [360, 0, 920, 152], [0, 656, 1020, 720]] // screen rectangles [x0, y0, x1, y1] it keeps out of: the gauges, the radar, the message band, the key line
    }
  },
  alien: {
    hpScale: 1,                            // times the PIRATES hit points (src/enemies.js: raider 20, drone 30, gunship 80)
    damageScale: 1,                        // times the PIRATES shot damage (raider 6, drone 8, gunship 10 a shot, three shots)
    earthDamage: 0.25,                     // a shot that hits Earth takes this share of its damage off Earth's shield (a big planet takes a pounding)
    distract: 4000,                        // ms an alien you hit fights the ship that hit it instead of its goal
    pursuit: {                             // a chase can be broken by a burn (card space-game-campaign-pursuit, Troy 20 Nov 2026): every alien's top speed is under the burn's (raider 430, drone 260, gunship 150 against 462; the mothership 55 and the towers do not chase). The raider is only 32 under it, so the leash is short
      leashOf: 1.25,                       // the leash, as a share of the kind's firing range (raider 650 px, drone 810, gunship 975): an alien that has been on the carrier and is farther than this from it is out of touch. A kind that fires from a distance is not out of touch while it does
      loseAfter: 1500,                     // ms out of touch (beyond the leash) before it gives up the chase: a short time, so a burn that opens the distance loses it, and a wobble does not
      sayEvery: 8000                       // ms between two "Lost them." lines (one line for a pack that drops away together)
    }
  },
  warn: [0.5, 0.25],                       // shares of Earth's shield and of the carrier's hull at which the ship's voice warns (each once, and again if it mends past the share and falls back)
  mother: {
    hp: 700,                               // hit points of the mothership (was 900)
    speed: 55,                             // px/s
    radius: 90,                            // px, the hit circle
    damage: 8,                             // per shot (was 12)
    shots: 3,                              // a spread of this many
    range: 1000,                           // px it shoots from
    delay: [1400, 2000],                   // ms between its volleys
    bullet: 380,                           // px/s of a shot
    holdAt: 1300,                          // px from Earth where it stops and stays (was 1600: out of reach of a carrier at the Moon)
    spawnEvery: 12000,                     // ms between the raiders it launches (was 8,000)
    spawnMax: 3                            // most raiders of its own alive at once (was 6)
  },
  earth: {
    shield: 600,                           // Earth's shield: zero and the level is lost (level 1 only: the later levels are far from home). It was 300: Troy lost level 1 twice at wave 3 with it running out
    radius: 160,                           // px, the planet's size (a shot inside it hits)
    regen: 3,                              // shield points a second Earth mends once it has not been hit for regenDelay ms (slow: a lull between waves mends it, a siege does not)
    regenDelay: 6000                       // ms without a hit before the shield starts to mend
  },
  tower: {                                 // an alien defence tower: a gun that does not move (level 3)
    hp: 160,                               // hit points (a level may give its own)
    radius: 26,                            // px, the hit circle
    damage: 10,                            // per shot
    delay: [1300, 1900],                   // ms between shots
    bullet: 440,                           // px/s of a shot
    range: 800,                            // px it shoots from
    turn: 3                                // rad/s the gun turns
  },
  cache: {
    radius: 160                            // px: any of your ships this close to a resource cache collects it (level 2)
  },
  score: {                                 // a mission's score (the debrief; the rank is the ranks card's): base for a win, the bonus objectives, a share of the hull left, speed against the par time, a loss for each ship lost
    base: 1000,                            // points for completing the objectives
    bonus: 250,                            // points for each bonus objective met
    hull: 300,                             // points for a whole hull (in proportion to the hull left at the end)
    par: 120,                              // s: finish under it and each second saved is worth speed points (a mission has its own par, `par`, else this)
    speed: 5,                              // points a second under the par
    ship: 50                               // points lost for each ship of the wing that was lost
  },
  refit: {                                 // the Earth refit screen after level 1: one tech, and ore buys extra ships for the next level (the costs are the workshop's, CAMP.build)
    most: 3                                // most extra fighters, and most extra escorts, one refit buys
  },
  tech: {                                  // what each tech does; names and words are in content/text/ui.md (camp.tech.<id>.name, .text)
    shield: { after: 1, taken: 0.6 },      // after level 1: the carrier takes this share of the damage it is dealt (0.6 = 40 percent less)
    beam: { after: 1, damage: 2, reach: 1.5 }, // after level 1: the turrets fire beams: this many times the damage, this many times the reach, and a shot goes through everything it hits
    blink: { after: 1, dist: 1500, cooldown: 20000 }, // after level 1: Q hops the carrier this far ahead, ready again after this many ms
    plating: { after: 2, hull: 1.5 },      // after level 2: the carrier's hull times this
    bay2: { after: 2, fighters: 4 },       // after level 2: this many more fighters in the bay
    repair: { after: 2, rate: 4, reach: 220 } // after level 2: hit points a second the carrier and the ships within this many px of it heal
  },
  // the places of the home system at 1 to 12 of the Sol pack's distances (docs/SOL.md; Earth to Mars 4,100 px), Earth at the origin, y grows downward, north is up
  places: {
    // name; kind and seed: the world drawn (src/art_world.js planetTexture: rock, ice, gas, lava, ringed); r: its size in px; base: a station is drawn beside it; tint: a colour the picture is multiplied by (Mars is rock, rust-coloured)
    earth: { x: 0, y: 0, name: 'Earth', kind: 'ice', seed: 7, r: 160 },                         // the origin: everything else is placed from Earth
    luna: { x: 238, y: -137, name: 'Luna', kind: 'rock', seed: 3, r: 45, base: 'Lunar base' },  // 275 px from Earth: the Lunar base, where the carrier starts (130 px east and 30 south of it, clear of the moon and the base ring: drawn 140 px long it lay across both at 90 px)
    mars: { x: 4064, y: 571, name: 'Mars', kind: 'rock', seed: 12, r: 110, tint: 0xe0825a },                   // 4,100 px from Earth
    eros: { x: -1705, y: -3206, name: 'Eros', kind: 'rock', seed: 21, r: 36 }                  // 3,630 px from Earth
  },
  // A level is data. Kinds the engine knows: win 'mother' (kill the mothership), 'relic' (collect the caches, then hold the carrier on the relic), 'towers' (break every tower);
  // places (else the table above), start (a place of its own, drawn or not) and startAt, convoys, waves (goal: 'earth', 'convoy:<id>' or 'carrier'), earth (false: no Earth),
  // guards (aliens that wait until you come close), towers (rings of them round a place), caches, relic, say (the words of the level, in content/text/ui.md)
  levels: {                                // the levels; a wave or a convoy is one line
    1: {                                                          // THE BELT (card space-game-campaign-belt): the cruiser is a mining ship working the asteroid belt at Ceres. Three missions (card space-game-campaign-missions): survey, haulers, the mothership
      name: 'The belt', start: 'ceres', startAt: [130, 30],       // the works the cruiser leaves, and its offset from it
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
      missions: [                                               // a mission is a row laid over this one: kind, objectives, bonus objectives (bonus), par (s), its own waves, convoys ... (docs/CAMPAIGN.md, Missions)
        { id: 'survey', kind: 'recon', par: 150,                  // M1: scan three rock fields; the ambush hits when the second is scanned
          objectives: [{ type: 'scan', points: [{ at: [900, 700], r: 320, secs: 8 }, { at: [-1100, -400], r: 320, secs: 8 }, { at: [300, -1600], r: 320, secs: 8 }] }, { type: 'kill', what: 'wave:0' }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          bonus: [{ id: 'swift', type: 'time', secs: 150 }, { id: 'clean', type: 'lost', n: 0 }, { id: 'ore', type: 'ore', n: 60 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ on: { scanned: 2 }, ambush: true, from: [3200, 1800], ships: { raider: 4, drone: 3 }, goal: 'carrier', say: 'camp.say.ambush', say2: 'camp.say.ambush2', say2At: 5 }] }, // the ambush: an alarm, out of the dark, two lines
        { id: 'haulers', kind: 'escort', par: 120,                // M2: three ore haulers fly from Vesta to Ceres; two must arrive; raiders go for them
          objectives: [{ type: 'deliver', n: 2 }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          bonus: [{ id: 'all', type: 'delivered' }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          convoys: [{ id: 'h1', name: 'Hauler 1', say: 'camp.say.hauler', at: 3, from: 'vesta', to: 'ceres' }, { id: 'h2', name: 'Hauler 2', say: 'camp.say.hauler', at: 18, from: 'vesta', to: 'ceres' }, { id: 'h3', name: 'Hauler 3', say: 'camp.say.hauler', at: 33, from: 'vesta', to: 'ceres' }],  // the haulers: when they leave, from and to which place
          waves: [{ at: 10, from: [1900, -1050], ships: { raider: 7, drone: 3 }, goal: 'convoy:h1', say: 'camp.say.raid' }, { at: 26, from: [1500, -800], ships: { raider: 7, drone: 3 }, goal: 'convoy:h2', say: 'camp.say.raid2' }, { at: 42, from: [1200, -650], ships: { raider: 6, drone: 4 }, goal: 'convoy:h3', say: 'camp.say.raid2' }] },  // the waves: when, from where, how many of each kind
        { id: 'mothership', kind: 'attack', par: 150, win: 'mother',   // M3: three waves, the last with the mothership
          objectives: [{ type: 'kill', what: 'mother' }],
          bonus: [{ id: 'swift', type: 'time', secs: 150 }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'clean', type: 'lost', n: 1 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 5, from: [3200, 1800], ships: { raider: 4, drone: 3 }, goal: 'carrier', say: 'camp.say.ambush' }, { at: 40, early: 20, from: [-3400, -2600], ships: { drone: 4, gunship: 3 }, goal: 'carrier', say: 'camp.say.bwave2' },  // the waves: when, from where, how many of each kind
            { at: 80, early: 25, needClear: true, from: [2200, -2000], ships: { raider: 4, gunship: 2 }, goal: 'carrier', mother: [2000, -1800], say: 'camp.say.bwave3' }] }  // one row of the list above: numbers as in its header
      ]
    },
    home: {                                                       // the Earth defence level: Earth's shield and the convoys. Not in the chain any more (Troy: they come out of level 1); kept as data, for the rules that need an Earth and for the tests
      world: { system: 'sol', fit: { place: 'earth', pack: 'sol-earth' }, star: [-17329, -2435] }, // the Sun (src/campsol.js): Earth on its ring of the Sol pack, Mars on the far side of Earth from the Sun (the level's own place, 4,100 px off), the other bodies where the pack puts them
      name: 'Home', start: 'luna', startAt: [130, 30],           // the base the carrier leaves, and its offset from it
      win: 'mother',                                            // the level is won when the alien mothership is dead
      rocks: [                                                  // asteroid fields: n rocks of ore within spread px of at (each holds CAMP.ore.rock); the same in every level
        { at: [-1400, 900], n: 5, spread: 260 }, { at: [1500, -2100], n: 5, spread: 260 }, { at: [2400, 1000], n: 5, spread: 260 }  // one row of the list above: numbers as in its header
      ],
      convoys: [                                                // at: seconds into the level the freighter leaves Earth; to: the place it flies to
        { id: 'mars', at: 10, to: 'mars' },  // one row of the list above: numbers as in its header
        { id: 'eros', at: 55, to: 'eros' }  // one row of the list above: numbers as in its header
      ],
      waves: [                                                  // at: seconds into the level; early: seconds after the wave before is dead, if sooner
        { at: 20, early: 8, from: [2800, 1700], ships: { raider: 4, drone: 2 }, goal: 'convoy:mars', say: 'camp.say.wave1' },  // one row of the list above: numbers as in its header
        { at: 80, early: 10, from: [-4200, 3800], ships: { drone: 3, gunship: 2 }, goal: 'earth', say: 'camp.say.wave2' },  // one row of the list above: numbers as in its header
        { at: 140, early: 12, needClear: true, from: [3200, -4000], ships: { raider: 2, gunship: 1 }, goal: 'earth', mother: [3500, -4400], say: 'camp.say.wave3' }  // one row of the list above: numbers as in its header
      ]
    },
    2: {                                                          // Alpha Centauri: warp in, gather resources, break the relic's guards, hold the relic until it answers
      name: 'Alpha Centauri', start: 'arrival', startAt: [0, 0], earth: false,
      world: { system: 'alpha-centauri', star: 'sun', fit: { place: 'proxima', pack: 'proxima-b' }, same: { proxima: 'proxima-b' } }, // the star is the place 'sun'; the pack's other bodies round it sit on their rings and angles, fitted to Proxima b
      warp: { dest: 'Alpha Centauri', ly: 4.4, star: 'sun' },  // the warp cinematic plays when this level starts (src/campwarp.js): where to, how far, and which of the places below is the star that resolves ahead
      places: {                                                 // the carrier warps in at arrival (not drawn); Proxima b holds the relic
        arrival: { x: -4800, y: 2400, name: 'Warp point', hidden: true },                           // where the carrier warps in, south-west of the relic (not drawn)
        sun: { x: -1800, y: -3600, name: 'Alpha Centauri', kind: 'lava', seed: 4371, r: 260 },       // the star of the level, drawn as a lava world, 260 px across its radius
        proxima: { x: 1200, y: 800, name: 'Proxima b', kind: 'rock', seed: 4244, r: 150 }           // the world with the relic on it
      },
      rocks: [{ at: [-3500, 1200], n: 5, spread: 260 }, { at: [-300, 2400], n: 5, spread: 260 }], // two asteroid fields on the way in
      missions: [
        { id: 'resources', kind: 'recon', par: 100,               // M1: gather two of the three resource caches, with the aliens that followed through the warp
          caches: [[-2800, 2000], [-600, 3200], [200, -1800]], objectives: [{ type: 'caches', n: 2 }, { type: 'kill', what: 'wave:0' }],  // the resource caches
          bonus: [{ id: 'swift', type: 'time', secs: 100 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 20, from: [-5600, 600], ships: { raider: 3, drone: 2 }, goal: 'carrier', say: 'camp.say.l2wave1' }] },  // the waves: when, from where, how many of each kind
        { id: 'guards', kind: 'attack', par: 100,                  // M2: five guards wait round the relic until your ships come within reach
          guards: [{ kind: 'gunship', at: [1700, 400] }, { kind: 'gunship', at: [700, 1300] }, { kind: 'gunship', at: [2000, 1200] }, { kind: 'drone', at: [1500, 1300] }, { kind: 'drone', at: [500, 300] }, { kind: 'drone', at: [1900, 900] }, { kind: 'drone', at: [900, 100] }],  // the guards (kind and place)
          objectives: [{ type: 'kill', what: 'guards' }], bonus: [{ id: 'swift', type: 'time', secs: 100 }, { id: 'hull', type: 'hull', pct: 70 }, { id: 'clean', type: 'lost', n: 1 }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          waves: [{ at: 18, from: [4500, -2500], ships: { drone: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l2wave2' }] },  // the waves: when, from where, how many of each kind
        { id: 'relic', kind: 'defend', par: 90, win: 'relic',      // M3: hold the carrier on the relic's ring until it answers, with no alien near it
          start: 'proxima', startAt: [-600, 300], relic: { place: 'proxima', radius: 240, hold: 14, caches: 0, clear: 650 }, objectives: [{ type: 'relic' }],  // where the cruiser starts, and the relic
          bonus: [{ id: 'swift', type: 'time', secs: 90 }, { id: 'hull', type: 'hull', pct: 70 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 6, from: [4000, -2000], ships: { drone: 3, raider: 2 }, goal: 'carrier', say: 'camp.say.l2wave2' }] }  // the waves: when, from where, how many of each kind
      ]
    },
    3: {                                                          // the alien home world: scan the approach, break the outer ring, break the inner ring
      name: 'The home world', start: 'arrival', startAt: [0, 0], earth: false,
      world: { system: 'epsilon-eridani', fit: { place: 'home', pack: 'epsilon-eridani-b' }, same: { home: 'epsilon-eridani-b' }, k: 3 }, // Epsilon Eridani's star and belts round the alien home world, which is the pack's Aegir; k: the rings are this many times the pack's (so the star is not on top of the towers)
      places: {
        arrival: { x: -7000, y: 3500, name: 'Warp point', hidden: true },                          // where the carrier warps in: 7,800 px from the world (not drawn)
        home: { x: 0, y: 0, name: 'Alien home world', kind: 'gas', seed: 77, r: 330 }              // the world, 330 px across its radius
      },
      rocks: [{ at: [-4500, 2200], n: 5, spread: 260 }, { at: [-2500, -500], n: 5, spread: 260 }], // two asteroid fields on the approach
      missions: [
        { id: 'approach', kind: 'recon', par: 120,                // M1: three points on the way in; defenders come when the first is scanned
          objectives: [{ type: 'scan', points: [{ at: [-4800, 2300], r: 420, secs: 7 }, { at: [-3300, 1000], r: 420, secs: 7 }, { at: [-2200, -100], r: 420, secs: 7 }] }, { type: 'kill', what: 'wave:0' }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          bonus: [{ id: 'swift', type: 'time', secs: 120 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ on: { scanned: 1 }, from: [-3500, 1800], ships: { raider: 4, drone: 2 }, goal: 'carrier', say: 'camp.say.l3wave1' }] },  // the waves: when, from where, how many of each kind
        { id: 'outer', kind: 'attack', par: 120, win: 'towers',   // M2: the four outer towers (they are the tougher ones)
          start: 'home', startAt: [-3300, 1900], towers: [{ place: 'home', r: 1500, n: 4, phase: 0.7, hp: 260 }], objectives: [{ type: 'kill', what: 'towers' }],  // where the cruiser starts, and the relic
          bonus: [{ id: 'swift', type: 'time', secs: 120 }, { id: 'hull', type: 'hull', pct: 60 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 25, from: [2800, -2800], ships: { drone: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave2' }] },  // the waves: when, from where, how many of each kind
        { id: 'inner', kind: 'attack', par: 150, win: 'towers',   // M3: the eight inner towers, with the last reserves
          start: 'home', startAt: [-2400, 1300], towers: [{ place: 'home', r: 1000, n: 8, phase: 0.2 }], objectives: [{ type: 'kill', what: 'towers' }],  // where the cruiser starts, and the relic
          bonus: [{ id: 'swift', type: 'time', secs: 150 }, { id: 'hull', type: 'hull', pct: 50 }, { id: 'clean', type: 'lost', n: 2 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 20, from: [-2500, -3000], ships: { raider: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave3' }, { at: 75, early: 20, from: [2800, -2800], ships: { drone: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave2' }] }  // the waves: when, from where, how many of each kind
      ]
    }
  }
};

// ---------- small helpers ----------
const campPlaces = level => (CAMP.levels[level] && CAMP.levels[level].places) || CAMP.places; // the places of a level: its own, else the home system's
const campTry = (fn, fallback) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (e) { return fallback; } };
function campRng(seed) { // mulberry32: the same seed gives the same flight
  let a = (seed | 0) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const campWrap = a => { a = a % (2 * Math.PI); return a > Math.PI ? a - 2 * Math.PI : a < -Math.PI ? a + 2 * Math.PI : a; };
const campRot = (rot, want, max) => { const d = campWrap(want - rot); return Math.abs(d) <= max ? want : rot + Math.sign(d) * max; };
const campDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const campBetween = (C, a, b) => a + C.rng() * (b - a);
const campHas = (C, tech) => C.techs.indexOf(tech) >= 0;
function campSegHit(px, py, qx, qy, cx, cy, r) { // does the step (p to q) of a shot touch the circle (c, r)?
  const dx = qx - px, dy = qy - py, l2 = dx * dx + dy * dy, t = l2 > 0 ? Math.max(0, Math.min(1, ((cx - px) * dx + (cy - py) * dy) / l2)) : 0;
  return Math.hypot(px + dx * t - cx, py + dy * t - cy) <= r;
}
const campSay = (C, key, vars) => C.events.push({ type: 'say', key, vars: vars || {} });

// ---------- a new game ----------
// A level is a run of missions (docs/CAMPAIGN.md, Missions). CAMP.levels[n].missions is a list of rows; a row names its kind (recon, escort, attack, defend, waves), its objectives and bonus
// objectives, its briefing words, and may lay its own data over the level's (waves, convoys, rocks, guards, towers, caches, relic, defend ...). campMissionRow gives the level row with mission i
// laid over it: this is what a battle reads (C.L). A level with no missions is one mission of its own (kind 'waves'), so the old rows still work.
function campMissions(level) { const L = CAMP.levels[level]; return !L ? [] : L.missions && L.missions.length ? L.missions : [{ id: 'level', kind: 'waves' }]; }
function campMissionRow(level, i) {
  const base = CAMP.levels[level]; if (!base) return null;
  const ms = campMissions(level), at = Math.max(0, Math.min(ms.length - 1, i | 0)), row = Object.assign({}, base, ms[at]);
  row.missions = ms.length; row.mission = at; row.mid = ms[at].id; row.kind = ms[at].kind || 'waves';
  row.waves = row.waves || []; row.convoys = row.convoys || []; // a mission with no waves or no haulers has none
  return row;
}
function campNew(level, techs, opts) {
  opts = opts || {};
  const L = campMissionRow(level, opts.mission); if (!L) return null;
  const C = {
    level, mission: L.mission, L, flags: {}, via: opts.via || 'menu', t: 0, rng: campRng(opts.seed == null ? 1 : opts.seed), god: !!opts.god, nextId: 1, ships: [], by: {}, bullets: [], events: [],
    input: { turn: 0, thrust: 0, brake: false, fire: false, blink: false },
    techs: (techs || []).filter(t => CAMP.tech[t]),
    earth: L.defend ? campDefend(level, L.defend) : L.earth === false ? null : { x: 0, y: 0, r: CAMP.earth.radius, shield: CAMP.earth.shield, max: CAMP.earth.shield }, caches: (L.caches || []).map(c => ({ x: c[0], y: c[1], got: false })), cachesGot: 0,
    ore: Math.max(0, Math.min(CAMP.ore.cap, opts.ore != null ? opts.ore : (L.startOre != null ? L.startOre : CAMP.ore.start))), shield: CAMP.carrier.shield, pickups: [], build: { queue: [] },
    relic: L.relic ? { x: campPlaces(level)[L.relic.place].x, y: campPlaces(level)[L.relic.place].y, hold: 0 } : null,
    bay: { fighters: CAMP.bay.fighters, escorts: CAMP.bay.escorts }, launchQ: [], nextLaunch: 0,
    waves: L.waves.map(() => ({ started: false, at: 0 })), convoys: L.convoys.map(() => ({ started: false })), delivered: 0, lost: 0, kills: 0, launched: 0, lostShips: 0,
    orders: { launch: 0, attack: 0, escort: 0, guard: 0, recall: 0, mine: 0, recharge: 0, build: 0 }, blinkAt: -1e9, motherSpawn: 0, // (the turrets have no clock of their own here: they fire by the carrier's own turret code)
    result: null, why: ''
  };
  if (campHas(C, 'bay2')) C.bay.fighters += CAMP.tech.bay2.fighters;
  if (opts.bonus) { C.bay.fighters += Math.max(0, opts.bonus.fighters | 0); C.bay.escorts += Math.max(0, opts.bonus.escorts | 0); } // the extras bought at the Earth refit
  Object.assign(C, { missiles: CAMP.missile.magazine, rockets: [], rocketId: 0, nextRocket: 0, reloadAt: 0 }); C.orders.missiles = 0; // the launcher: the magazine (a plain number), the missiles in flight, its clocks
  const p = campPlaces(level)[L.start], c = campSpawn(C, 'carrier', p.x + L.startAt[0], p.y + L.startAt[1]);
  C.carrier = c; c.rot = 0;
  C.scan = ((L.objectives || []).find(o => o.type === 'scan') || { points: [] }).points.map(q => ({ x: q.at[0], y: q.at[1], r: q.r || 260, secs: q.secs || 5, t: 0, got: false })); // recon: the points to scan
  C.turretRng = campRng((opts.seed == null ? 1 : opts.seed) * 4243 + 29); // the turrets' jitter has a stream of its own, so it never changes how a fight flies
  C.turrets = CAMP.carrier.mounts.map((m, i) => ({ x: 0, y: 0, aim: 0, target: '', slot: 0, at: 0, shotAt: -1e9 })); C.turrets.forEach((tu, i) => { tu.at = campTurretAt(C, i, 0); }); campTurretPlace(C); // the turrets: where each is, which way it aims, at whom, when it may fire next and when it last did (the scene draws them)
  (L.towers || []).forEach(g => { // rings of towers round a place, facing outward
    const at = campPlaces(level)[g.place];
    for (let i = 0; i < g.n; i++) { const a = (g.phase || 0) + i / g.n * 2 * Math.PI, t = campSpawn(C, 'tower', at.x + Math.cos(a) * g.r, at.y + Math.sin(a) * g.r); t.rot = a; if (g.hp) t.hp = t.maxHp = g.hp; }
  });
  const rr = campRng((opts.seed == null ? 1 : opts.seed) * 7919 + 13); // the rocks have a stream of their own, so ore never changes how a fight flies
  C.rocks = []; C.lasers = []; C.laserNow = []; C.laserLog = {}; // C.lasers: the beams firing now, [{ from: the ship's id, to: the rock's or the alien's id, kind: 'rock' | 'alien', since: C.t when this beam began without a break }] (data for the beam hum, src/campaign.js campBeamState of card space-game-campaign-sounds)
  (L.rocks || []).forEach(f => { for (let i = 0; i < f.n; i++) { const a = rr() * 2 * Math.PI, d = Math.sqrt(rr()) * f.spread; C.rocks.push({ id: 'rock-' + (C.nextId++), x: f.at[0] + Math.cos(a) * d, y: f.at[1] + Math.sin(a) * d, hp: CAMP.ore.rockHp, maxHp: CAMP.ore.rockHp, r: CAMP.ore.rockR, ore: CAMP.ore.rock, cutAt: -1e9 }); } }); // asteroids: a laser cuts one, and it breaks into a chunk of ore
  (L.guards || []).forEach(g => { const a = campSpawn(C, g.kind, g.at[0], g.at[1]); if (a) { a.hold = true; a.guard = true; a.goal = 'carrier'; a.post = { x: g.at[0], y: g.at[1] }; } }); // guard: a kill objective 'guards' counts them; a guard's post: where it goes back to when it loses you
  return C;
}

// one ship into the game. kind: carrier, fighter, escort, freighter, mother, or a PIRATES key (raider, drone, gunship)
function campSpawn(C, kind, x, y) {
  const u = { id: kind + '-' + (C.nextId++), kind, x, y, vx: 0, vy: 0, rot: 0, move: null, moveUntil: 0, ran: false, side: C.rng() < 0.5 ? -1 : 1, nextShot: 0, order: null, goal: '', distractedUntil: 0 };
  if (kind === 'carrier') {
    const k = CAMP.carrier; Object.assign(u, { team: 'earth', hp: k.hull * (campHas(C, 'plating') ? CAMP.tech.plating.hull : 1), r: CAMP.size.carrier.hit, vmax: k.speed, accel: k.accel, turn: k.turn });
  } else if (kind === 'fighter' || kind === 'escort') {
    const k = CAMP[kind];
    Object.assign(u, { team: 'earth', hp: k.hp, r: CAMP.size[kind].hit, vmax: k.speed, accel: k.accel, turn: k.turn,
      def: { key: kind === 'fighter' ? 'raider' : 'drone', hold: k.hold, speed: k.accel, max: k.speed, hp: k.hp } }); // the shape pirateSteer reads
  } else if (kind === 'freighter') {
    Object.assign(u, { team: 'earth', hp: CAMP.convoy.hp, r: 22, vmax: CAMP.convoy.speed, accel: 400, turn: 2 });
  } else if (kind === 'mother') {
    const k = CAMP.mother; Object.assign(u, { team: 'alien', hp: k.hp * CAMP.alien.hpScale, r: k.radius, vmax: k.speed, accel: 200, turn: 0.5 });
  } else if (kind === 'tower') {
    const k = CAMP.tower; Object.assign(u, { team: 'alien', hp: k.hp * CAMP.alien.hpScale, r: k.radius, vmax: 0, accel: 0, turn: k.turn, fixed: true });
  } else if (PIRATES[kind]) {
    const d = PIRATES[kind];
    Object.assign(u, { team: 'alien', def: d, hp: d.hp * CAMP.alien.hpScale, r: d.body[0], vmax: d.max, accel: d.speed, turn: d.turn * 60 }); // the table's turn is a Phaser step per frame at 60 a second
  } else return null;
  u.maxHp = u.hp; u.nextShot = C.t + 600 + C.rng() * 900;
  C.ships.push(u); C.by[u.id] = u;
  return u;
}
const campAlive = C => C.ships.filter(u => u.hp > 0);
const campAliens = C => C.ships.filter(u => u.team === 'alien' && u.hp > 0);
const campWing = (C, kind) => C.ships.filter(u => u.team === 'earth' && u.hp > 0 && (kind ? u.kind === kind : (u.kind === 'fighter' || u.kind === 'escort')));
const campConvoys = C => C.ships.filter(u => u.kind === 'freighter' && u.hp > 0);
function campNearest(list, p, max) { let best = null, bd = max == null ? Infinity : max; list.forEach(u => { const d = campDist(u, p); if (d < bd) { bd = d; best = u; } }); return best; }

// ---------- damage and deaths ----------
function campHurt(C, u, dmg, byId) {
  if (u.hp <= 0 || C.result) return;
  if (u.kind === 'carrier') {
    if (campHas(C, 'shield')) dmg *= CAMP.tech.shield.taken; if (C.god) dmg = 0;
    if (C.shield > 0 && dmg > 0) { const take = Math.min(C.shield, dmg); C.shield -= take; dmg -= take; C.events.push({ type: 'shieldhit', x: u.x, y: u.y }); } // the shield first
  }
  u.hp -= dmg; u.hurtAt = C.t;
  C.events.push({ type: 'hit', x: u.x, y: u.y, id: u.id, hull: dmg > 0 }); // hull: it got through to the hull (the carrier's shield takes the first of it)
  if (u.team === 'alien' && byId) { u.hitBy = byId; u.distractedUntil = C.t + CAMP.alien.distract; }
  if (u.hp <= 0) campKill(C, u);
}
function campKill(C, u) {
  u.hp = 0;
  C.events.push({ type: 'boom', x: u.x, y: u.y, big: u.kind === 'carrier' || u.kind === 'mother', id: u.id, kind: u.kind });
  if (u.team === 'alien') {
    C.kills++;
    const ore = CAMP.ore.wreck[u.kind]; if (ore) C.pickups.push({ id: 'wreck-' + (C.nextId++), kind: 'wreck', x: u.x, y: u.y, ore, born: C.t });
    if (u.kind === 'mother') campWin(C, 'mother');
    else if (u.kind === 'tower' && (C.L.win === 'towers' || C.L.objectives) && !C.ships.some(s => s.kind === 'tower' && s.hp > 0)) campWin(C, 'towers'); // the last tower of the level
  }
  else if (u.kind === 'carrier') campEnd(C, 'lost', 'carrier');
  else if (u.kind === 'freighter') { C.lost++; campSay(C, 'camp.say.convoylost', { name: campConvoyName(u) }); }
  else { C.lostShips++; }
}
// the win rules call this: a mission with objectives is won when ALL of them are met (campObjectives); the old rows with none are won at once by the rule that fired
function campWin(C, why) { if (C.L.objectives) { C.flags[why] = true; return; } campEnd(C, 'won', why); }
function campEnd(C, result, why) { if (C.result) return; C.result = result; C.why = why; if (result === 'won') C.score = campScore(C); C.events.push({ type: 'end', result, why, score: C.score || null }); }
const campConvoyName = u => u.cname || (CAMP.places[String(u.id).split('-')[1]] || {}).name || 'a';
// a defended place (a mission of kind defend): an Earth-like thing with a shield the aliens go for; the mission is won by holding it for hold seconds
function campDefend(level, d) { const p = campPlaces(level)[d.place]; return { x: p.x, y: p.y, r: d.r || p.r || 120, shield: d.shield, max: d.shield, name: d.name || p.name, loseWhy: 'base' }; }

// ---------- the five orders ----------
// the thing an order names: a convoy ('mars', 'the convoy'), a place ('earth', 'luna'), the carrier ('me', 'the carrier'), the mothership. null when nothing fits
function campFind(C, text) {
  const q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(the|a|an|to|at|for|by|with|around|near|beside|of|our|my)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  if (/\b(mothership|mother|boss|flagship|big one)\b/.test(q)) return { kind: 'mother' };
  if (/\b(carrier|me|us|ship|home)\b/.test(q) && !/\bconvoy\b/.test(q)) return { kind: 'carrier' };
  const cv = campConvoys(C);
  for (const u of cv) { const n = String(u.id).split('-')[1]; if (q.indexOf(n) >= 0 || q.indexOf(campConvoyName(u).toLowerCase()) >= 0) return { kind: 'convoy', id: u.id }; }
  if (/\b(convoy|convoys|freighter|freighters|cargo|supplies|hauler|haulers)\b/.test(q)) { const n = campNearest(cv, C.carrier); return n ? { kind: 'convoy', id: n.id } : null; }
  const pl = campPlaces(C.level);
  for (const id of Object.keys(pl)) if (!pl[id].hidden && (q.indexOf(id) >= 0 || q.indexOf(pl[id].name.toLowerCase()) >= 0)) return { kind: 'place', id };
  if (/\bmoon\b/.test(q)) return { kind: 'place', id: 'luna' };
  return null;
}
const campTarget = (C, t) => !t ? null : t.kind === 'mother' ? C.ships.find(u => u.kind === 'mother' && u.hp > 0) || null : t.kind === 'carrier' ? C.carrier : t.kind === 'convoy' ? C.by[t.id] : t.kind === 'place' ? campPlaces(C.level)[t.id] : null;
const campNo = (code, vars) => ({ ok: false, code, say: uiText('camp.no.' + code, vars) });
const campYes = (code, vars) => ({ ok: true, code, say: uiText('camp.say.' + code, vars) });

// campOrder is the one door every order goes through (the keys, the strip, the voice); how says which ('key', 'strip', 'voice', 'click'): the play log reads it
// from outside (src/playlog.js wraps this function by name), so nothing here uses it. campCheck answers an order with the same words and does nothing: the
// ship computer checks an order before it announces it, then runs it with campOrder.
function campOrder(C, name, arg, how) { return campDo(C, name, arg, false); }
function campCheck(C, name, arg) { return campDo(C, name, arg, true); }
function campDo(C, name, arg, dry) {
  if (!C || C.result) return campNo('over');
  const t = campFind(C, arg), out = campWing(C);
  if (name === 'launch') {
    const n = C.bay.fighters + C.bay.escorts - C.launchQ.length;
    if (n <= 0) return campNo(C.launchQ.length ? 'launching' : out.length ? 'baydry' : 'bay');
    if (dry) return campYes('launch');
    for (let i = 0; i < C.bay.fighters; i++) C.launchQ.push('fighter');
    for (let i = 0; i < C.bay.escorts; i++) C.launchQ.push('escort');
    C.bay.fighters = 0; C.bay.escorts = 0; C.orders.launch++;
    return campYes('launch');
  }
  if (name === 'attack') {
    const fs = campWing(C, 'fighter'); if (!fs.length) return campNo(C.launchQ.length ? 'launching' : 'nofighters');
    const mother = t && t.kind === 'mother' && campTarget(C, t);
    if (t && t.kind === 'mother' && !mother) return campNo('nomother');
    if (dry) return campYes(mother ? 'attackmother' : 'attack');
    fs.forEach(u => { u.order = { type: 'attack', target: mother ? mother.id : '' }; u.move = null; });
    C.orders.attack++; return campYes(mother ? 'attackmother' : 'attack');
  }
  if (name === 'escort') {
    const es = campWing(C, 'escort'); if (!es.length) return campNo(C.launchQ.length ? 'launching' : 'noescorts');
    if (!C.L.convoys.length) { // no convoys in this level: Escort keeps the escorts close to the carrier
      if (dry) return campYes('escortcarrier');
      es.forEach(u => { u.order = { type: 'guard', at: { kind: 'carrier' } }; u.move = null; }); C.orders.escort++; return campYes('escortcarrier');
    }
    const cv = t && t.kind === 'convoy' ? C.by[t.id] : t ? null : campNearest(campConvoys(C), C.carrier);
    if (!cv || cv.hp <= 0) return campNo('noconvoy');
    if (dry) return campYes('escort', { name: campConvoyName(cv) });
    es.forEach((u, i) => { u.order = { type: 'escort', target: cv.id, slot: i }; u.move = null; });
    C.orders.escort++; return campYes('escort', { name: campConvoyName(cv) });
  }
  if (name === 'guard') {
    if (!out.length) return campNo(C.launchQ.length ? 'launching' : 'nowing');
    if (dry) return campYes('guard');
    const at = t && (t.kind === 'place' || t.kind === 'convoy') ? t : { kind: 'carrier' };
    out.forEach(u => { u.order = { type: 'guard', at }; u.move = null; });
    C.orders.guard++; return campYes('guard');
  }
  if (name === 'recall') {
    if (!out.length) return campNo(C.launchQ.length ? 'launching' : 'nowing');
    if (dry) return campYes('recall');
    out.forEach(u => { u.order = { type: 'recall' }; u.move = null; });
    C.orders.recall++; return campYes('recall');
  }
  if (name === 'missiles') { // the launcher: the mothership if you name it (or if it is in reach), else the nearest big ship in reach
    if (C.missiles <= 0) return campNo('nomissiles');
    if (C.t < C.nextRocket) return campNo('missilewait');
    const named = t && t.kind === 'mother', mother = named && campTarget(C, t);
    if (named && !mother) return campNo('nomother');
    if (named && campDist(mother, C.carrier) > CAMP.missile.lock) return campNo('range');
    const tg = named ? mother : campMissileTarget(C); if (!tg) return campNo('nobig');
    if (dry) return campYes(tg.kind === 'mother' ? 'missilesmother' : 'missiles');
    campFire(C, tg); C.orders.missiles++; return campYes(tg.kind === 'mother' ? 'missilesmother' : 'missiles');
  }
  if (name === 'mine') {
    const ms = campMiners(C); if (!ms.length) return campNo(C.launchQ.length ? 'launching' : 'nowing');
    if (!C.pickups.length && !C.rocks.some(r => r.hp > 0)) return campNo('noore');
    if (dry) return campYes('mine');
    ms.forEach(u => { u.order = { type: 'mine' }; u.move = null; });
    C.orders.mine++; return campYes('mine');
  }
  if (name === 'recharge') return campRecharge(C, arg, dry);
  if (name === 'build') return campBuild(C, arg, dry);
  return campNo('what');
}
// the ships that mine: the whole wing that is out. In the belt the fighters are the cruiser's mining drones; an attack order (key 2) turns them back to the fight
function campMiners(C) { return campWing(C); }
// recharge: the carrier's shield (ore in proportion to what is missing), or Earth's (the carrier must be near it). arg: 'earth', 'carrier', or nothing (Earth when near it and under 90 percent, else the carrier)
function campRecharge(C, arg, dry) {
  const q = String(arg == null ? '' : arg).toLowerCase(), R = CAMP.recharge, c = C.carrier;
  const near = !!C.earth && campDist(c, C.earth) <= R.earthReach;
  let target = /earth|planet|home/.test(q) ? 'earth' : /carrier|ship|me\b/.test(q) ? 'carrier' : (near && C.earth.shield < C.earth.max * 0.9 ? 'earth' : 'carrier');
  if (target === 'earth') {
    if (!C.earth) return campNo('noearth');
    if (!near) return campNo('farearth');
    if (C.earth.shield >= C.earth.max) return campNo('earthfull');
    if (C.ore < R.earth) return campNo('noore2', { need: R.earth, have: Math.floor(C.ore) });
    if (dry) return campYes('rechargeearth');
    C.ore -= R.earth; C.earth.shield = Math.min(C.earth.max, C.earth.shield + R.earthPoints); C.orders.recharge++;
    C.events.push({ type: 'recharge', x: C.earth.x, y: C.earth.y, target: 'earth' });
    return campYes('rechargeearth');
  }
  const missing = CAMP.carrier.shield - C.shield; if (missing <= 0.5) return campNo('shieldfull');
  const cost = Math.max(5, Math.ceil(R.carrier * missing / CAMP.carrier.shield));
  if (C.ore < cost) return campNo('noore2', { need: cost, have: Math.floor(C.ore) });
  if (dry) return campYes('recharge');
  C.ore -= cost; C.shield = CAMP.carrier.shield; C.orders.recharge++;
  C.events.push({ type: 'recharge', x: c.x, y: c.y, target: 'carrier' });
  return campYes('recharge');
}
// build: queue new fighters or escorts (arg 'fighter', 'escort', with a count: 'escort 2'); one at a time, into the bay, ore paid now
function campBuild(C, arg, dry) {
  const q = String(arg == null ? '' : arg).toLowerCase(), B = CAMP.build, kind = /escort/.test(q) ? 'escort' : 'fighter';
  const words = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5 }, m = /(\d+)|\b(one|two|three|four|five)\b/.exec(q);
  const n = Math.max(1, Math.min(B.most, m ? (m[1] ? parseInt(m[1], 10) : words[m[2]]) : 1));
  const have = (kind === 'fighter' ? C.bay.fighters + campWing(C, 'fighter').length + C.launchQ.filter(k => k === 'fighter').length : C.bay.escorts + campWing(C, 'escort').length + C.launchQ.filter(k => k === 'escort').length)
    + C.build.queue.filter(b => b.kind === kind).length;
  if (have + n > (kind === 'fighter' ? B.maxFighters : B.maxEscorts)) return campNo('buildfull', { kind });
  const cost = n * (kind === 'fighter' ? B.fighterCost : B.escortCost);
  if (C.ore < cost) return campNo('noore2', { need: cost, have: Math.floor(C.ore) });
  if (dry) return campYes('build', { n, kind: n === 1 ? kind : kind + 's' });
  C.ore -= cost; for (let i = 0; i < n; i++) C.build.queue.push({ kind, left: kind === 'fighter' ? B.fighterTime : B.escortTime }); C.orders.build++;
  return campYes('build', { n, kind: n === 1 ? kind : kind + 's' });
}

// plain words as an order: { act: 'fleet_launch' | 'fleet_attack' | 'fleet_escort' | 'fleet_guard' | 'fleet_recall', arg } or null (the model reads it instead)
function campIntent(text) {
  const SC_FILLER = /^(?:(?:please|hey|ok|okay|computer|athena|can you|could you|would you|will you|i want to|i wanna|i need to|lets|let's|go ahead and|all|everyone)\s+)+/;
  let q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim().replace(SC_FILLER, '').replace(/\s+(please|now|right now|already)$/, '').trim();
  if (!q) return null;
  q = q.replace(/^(?:the |our )?(?:fighters?|wing|escorts?|squadron|ships)\s+(?=(?:attack|engage|guard|defend|protect|launch|recall|return|escort)\b)/, '');
  let m;
  if (/\b(?:missiles?|rockets?|torpedoe?s?)\b/.test(q)) return { act: 'fleet_missiles', arg: q.replace(/\b(?:fire|launch|shoot|send|loose|use|the|our|all|some|a|one|missiles?|rockets?|torpedoe?s?|with|at|on|to)\b/g, ' ').replace(/\s+/g, ' ').trim() }; // "fire missiles", "missiles at the mothership": before "launch", which is the bay
  if (/^(?:launch|scramble|deploy|open the bay|open the bay doors|bay doors|send out the (?:wing|fighters|ships|fleet)|launch the (?:wing|fighters|ships|fleet|escorts)|get them out)(?: now)?$/.test(q) || /^launch\b/.test(q)) return { act: 'fleet_launch', arg: '' };
  if ((m = /^(?:recall|come home|come back|return(?: home| to the carrier| to base)?|land|dock|rtb|fall back|retreat|pull back|bring them (?:home|back))\b\s*(.*)$/.exec(q))) return { act: 'fleet_recall', arg: '' };
  if (/^(?:recharge|refill|restore|top up|repair|charge|power up)\b.*\bshields?\b/.test(q) || /^shields?\s+(?:up|back up|on)$/.test(q) || /^(?:recharge|refill)\b/.test(q)) return { act: 'fleet_recharge', arg: /earth|planet|home/.test(q) ? 'earth' : /carrier|\bship\b|\bme\b/.test(q) ? 'carrier' : '' };
  if ((m = /^(?:build|make|construct|produce|buy|order|get us|get me|add)\s+(?:me |us )?(.*)$/.exec(q)) && !/\b(?:shield|shields)\b/.test(q)) return { act: 'fleet_build', arg: m[1] };
  if (/\b(?:mine|mining|harvest|harvesting|gather ore|collect ore|collect the ore|scavenge|scavenging|salvage)\b/.test(q) && !/^(?:how|what|why|where)\b/.test(q)) return { act: 'fleet_mine', arg: '' };
  if ((m = /^(?:send|move|put|take|set)\s+(?:the |our )?(?:escorts?|escort ships?|wing)\s*(?:to|with|beside|for|on)?\s*(.*)$/.exec(q)) && /escort/.test(q)) return { act: 'fleet_escort', arg: m[1] };
  if ((m = /^(?:the |our )?escorts?\s+(?:to|with|beside|for|on)\s+(.*)$/.exec(q))) return { act: 'fleet_escort', arg: m[1] }; // "escorts to the Mars convoy"
  if ((m = /^(?:escort|cover|screen|protect|defend|guard|watch)\s+(?:the )?(.*(?:convoy|convoys|freighter|freighters|cargo|supplies).*)$/.exec(q))) return { act: 'fleet_escort', arg: m[1] };
  if ((m = /^(?:escort|cover)\s+(?:the )?(.+)$/.exec(q))) return { act: 'fleet_escort', arg: m[1] };
  if ((m = /^(?:guard|defend|protect|screen|cover|hold|form up on|stay with|stay near|orbit)\s*(.*)$/.exec(q))) return { act: 'fleet_guard', arg: m[1] };
  if ((m = /^(?:attack|engage|fight|kill|destroy|go after|hit|strike|assault|charge|hunt)\s*(.*)$/.exec(q))) return { act: 'fleet_attack', arg: m[1] };
  return null;
}

// ---------- the step ----------
function campStep(C, sec) {
  if (!C || C.result) return;
  sec = Math.max(0, Math.min(sec, 1));
  while (sec > 1e-9 && !C.result) { const d = Math.min(sec, CAMP.step); campTick(C, d); sec -= d; }
}
function campTick(C, dt) {
  C.t += dt * 1000; C.dt = dt; C.laserNow.length = 0;
  campSchedule(C);
  if (typeof campNavWait === 'function') campNavWait(C); // a Fast trip waiting for the wing to come aboard (src/campnav.js)
  if (typeof campNavDrive === 'function') campNavDrive(C, dt); // the autopilot (src/campnav.js), when it is on, sets the carrier's input
  campCarrier(C, dt);
  campLaunch(C);
  C.ships.forEach(u => { if (u.hp > 0 && u.kind !== 'carrier') campAI(C, u, dt); });
  campBullets(C, dt);
  campBeam(C, dt);
  campMissiles(C, dt);
  campCaches(C);
  campRelic(C, dt);
  campRepair(C, dt);
  campEarth(C, dt);
  campPickups(C);
  campFactory(C, dt);
  campLasers(C);
  campMissions_tick(C, dt);
  campWarn(C);
  C.ships = C.ships.filter(u => u.hp > 0 || (delete C.by[u.id], false)); // the dead leave the list (the scene was told by the boom event)
}

// convoys leave Earth and waves arrive, by the level's own clock
function campSchedule(C) {
  const L = C.L, sec = C.t / 1000;
  L.convoys.forEach((cv, i) => {
    if (C.convoys[i].started || sec < cv.at) return;
    C.convoys[i].started = true;
    const pl = campPlaces(C.level), to = pl[cv.to], from = cv.from ? pl[cv.from] : null;
    const a = from ? Math.atan2(to.y - from.y, to.x - from.x) : Math.atan2(to.y, to.x), sx = from ? from.x + Math.cos(a) * ((from.r || 60) + 50) : Math.cos(a) * (C.earth.r + 50), sy = from ? from.y + Math.sin(a) * ((from.r || 60) + 50) : Math.sin(a) * (C.earth.r + 50);
    const f = campSpawn(C, 'freighter', sx, sy); f.id = 'freighter-' + cv.id; C.by[f.id] = f; f.dest = { x: to.x, y: to.y }; f.rot = a; f.cname = cv.name || to.name;
    campSay(C, cv.say || 'camp.say.convoy', { name: f.cname });
  });
  L.waves.forEach((w, i) => {
    const st = C.waves[i]; if (st.started) return;
    const prev = i > 0 ? C.waves[i - 1] : null, prevDead = !prev || (prev.started && !C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === i - 1));
    const due = (w.on ? campWaveOn(C, w.on) : sec >= w.at) && (!w.needClear || prevDead);
    const early = w.early != null && prev && prev.started && prevDead && sec - prev.at >= w.early;
    if (!due && !early) return;
    st.started = true; st.at = sec;
    const goal = w.goal || 'earth';
    Object.keys(w.ships).forEach(kind => {
      for (let k = 0; k < w.ships[kind]; k++) { const a = campSpawn(C, kind, w.from[0] + campBetween(C, -300, 300), w.from[1] + campBetween(C, -300, 300)); if (a) { a.goal = goal; a.wave = i; a.rot = Math.atan2(-a.y, -a.x); } }
    });
    if (w.mother) { const m = campSpawn(C, 'mother', w.mother[0], w.mother[1]); m.goal = 'earth'; m.wave = i; m.rot = Math.atan2(-m.y, -m.x); }
    if (w.ambush) C.events.push({ type: 'alarm' }); // the surprise: the scene sounds the alarm
    campSay(C, w.say, { n: i + 1 });
  });
  L.waves.forEach((w, i) => { const st = C.waves[i]; if (w.say2 && st.started && !st.said2 && sec - st.at >= (w.say2At || 5)) { st.said2 = true; campSay(C, w.say2, { n: i + 1 }); } }); // a second line, some seconds after the wave came
}

// when a wave that waits for an event starts: on { scanned: k } (k recon points scanned), { delivered: k } (k haulers arrived), { t: s } (s seconds in)
function campWaveOn(C, on) {
  if (on.scanned != null) return C.scan.filter(p => p.got).length >= on.scanned;
  if (on.delivered != null) return C.delivered >= on.delivered;
  if (on.t != null) return C.t / 1000 >= on.t;
  return false;
}

// the carrier: your stick
function campCarrier(C, dt) {
  const c = C.carrier, k = CAMP.carrier, inp = C.input; if (c.hp <= 0) return;
  c.rot += (inp.turn || 0) * k.turn * dt;
  const th = Math.max(0, Math.min(1, inp.thrust || 0));
  const f = C.nav && C.nav.on && C.nav.fast ? (C.nav.burn || CAMP.nav.fast) : 1; // the map's Fast: a burn, while the autopilot flies (campNavGo: N.burn, from campNavBurn)
  c.vx += Math.cos(c.rot) * k.accel * f * th * dt; c.vy += Math.sin(c.rot) * k.accel * f * th * dt;
  const keep = Math.pow(inp.brake ? k.brakeDrag : k.drag, dt); c.vx *= keep; c.vy *= keep;
  const sp = Math.hypot(c.vx, c.vy); if (sp > k.speed * f) { c.vx *= k.speed * f / sp; c.vy *= k.speed * f / sp; }
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (inp.blink && campHas(C, 'blink') && C.t - C.blinkAt >= CAMP.tech.blink.cooldown) { C.blinkAt = C.t; c.x += Math.cos(c.rot) * CAMP.tech.blink.dist; c.y += Math.sin(c.rot) * CAMP.tech.blink.dist; C.events.push({ type: 'blink', x: c.x, y: c.y }); }
  inp.blink = false;
  campTurrets(C);
}
// the turrets: each one aims itself at the nearest alien in its reach (to the edge of it), always; it fires only while Space is held (C.input.fire), one shot every pdDelay ms
// where to point so the shot and a moving alien meet (card space-game-campaign-turret-lead): in the frame of the shot, which keeps campDrift of the carrier's own speed, the alien
// is at p and moves at v; the shot, at speed s, reaches it at the time t where |p + v t| = s t (the smaller positive root). No such time, or one too far for the shot's flight: aim where it is.
function campLead(C, tu, u) {
  const k = CAMP.carrier, c = C.carrier, px = u.x - tu.x, py = u.y - tu.y, direct = Math.atan2(py, px);
  if (!k.lead) return direct;
  const vx = (u.vx || 0) - (c.vx || 0) * campDrift, vy = (u.vy || 0) - (c.vy || 0) * campDrift, s = k.pdSpeed;
  const a = vx * vx + vy * vy - s * s, b = 2 * (px * vx + py * vy), cc = px * px + py * py;
  let t = -1;
  if (Math.abs(a) < 1e-6) t = b < 0 ? -cc / b : -1;
  else { const d = b * b - 4 * a * cc; if (d >= 0) { const q = Math.sqrt(d), t1 = (-b - q) / (2 * a), t2 = (-b + q) / (2 * a), lo = Math.min(t1, t2), hi = Math.max(t1, t2); t = lo > 0 ? lo : hi; } }
  if (!(t > 0) || t * s > campReach(C) + u.r + 200) return direct; // it is gone before the shot gets there (a shot flies 300 px past the reach): aim where it is
  t *= k.lead; return Math.atan2(py + vy * t, px + vx * t);
}
const campReach = C => CAMP.carrier.pdRange * (campHas(C, 'beam') ? CAMP.tech.beam.reach : 1); // px a turret reaches: the beam tech reaches further
function campTurretPlace(C) { // each turret's place in the world, from the carrier's place and nose
  const c = C.carrier, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  C.turrets.forEach((tu, i) => { const m = CAMP.carrier.mounts[i]; tu.x = c.x + cs * m[0] - sn * m[1]; tu.y = c.y + sn * m[0] + cs * m[1]; });
}
// when turret i's slot comes: its own grid (a cycle is pdDelay; turret i is i/n of a cycle behind the first, if CAMP.carrier.stagger) and a little jitter from a stream of its own
function campTurretAt(C, i, slot) {
  const k = CAMP.carrier, d = k.pdDelay, ph = k.stagger ? i * d / k.mounts.length : 0;
  return ph + slot * d + (k.jitter ? (C.turretRng() * 2 - 1) * k.jitter : 0);
}
// A turret fires only at its own slot: when the slot comes it shoots if it has an alien in reach and Space is held, and goes on to the next slot either way (a slot it could not use is
// let go, so there is no catch-up burst when Space is pressed or an alien comes into reach). One shot per turret per cycle, whatever the stagger: the shots a second are the same.
function campTurrets(C) {
  const c = C.carrier, k = CAMP.carrier, beam = campHas(C, 'beam'), reach = campReach(C), dmg = k.pd * (beam ? CAMP.tech.beam.damage : 1), al = campAliens(C);
  campTurretPlace(C);
  C.turrets.forEach((tu, i) => {
    let best = null, bd = reach; al.forEach(u => { const d = campDist(u, tu) - u.r; if (d <= bd) { bd = d; best = u; } });
    tu.target = best ? best.id : ''; if (best) tu.aim = campLead(C, tu, best);
    let rock = null; // no alien in reach: the same lasers cut the nearest rock (docs/CAMPAIGN.md, Mining)
    if (!best) { let rd = reach; C.rocks.forEach(r => { const d = campDist(r, tu) - r.r; if (r.hp > 0 && d <= rd) { rd = d; rock = r; } }); if (rock) tu.aim = Math.atan2(rock.y - tu.y, rock.x - tu.x); }
    tu.rock = rock ? rock.id : '';
    if (C.t < tu.at) return;
    if (rock && C.input.fire) {
      tu.shotAt = C.t; campRockHit(C, rock, k.pd * k_laser_turret(C)); C.laserNow.push({ from: c.id, to: rock.id, kind: 'rock' }); C.events.push({ type: 'laser', src: 'turret', i, x: tu.x, y: tu.y, tx: rock.x - Math.cos(tu.aim) * rock.r * 0.6, ty: rock.y - Math.sin(tu.aim) * rock.r * 0.6, rock: rock.id }); // the beam of this turret lands on the rock's near side
    }
    if (best && C.input.fire) {
      tu.shotAt = C.t; C.laserNow.push({ from: c.id, to: best.id, kind: 'alien' }); C.events.push({ type: 'turret', i, x: tu.x, y: tu.y, aim: tu.aim, tx: best.x, ty: best.y }); // one event for each shot: the scene flashes this muzzle and blips
      campBullet(C, { x: tu.x, y: tu.y, vx: c.vx, vy: c.vy, id: c.id }, tu.aim, k.pdSpeed, dmg, (reach + 300) / k.pdSpeed * 1000, 'earth', 0, { pd: true, beam }); // a shot flies 300 px past the reach, so one led ahead of an alien at the edge still arrives
    }
    tu.slot++; tu.at = campTurretAt(C, i, tu.slot);
  });
}
// The beam hum (card space-game-campaign-sounds). C.beamT is how long the beam turrets have fired without a break, in seconds (to CAMP.beamHum.rise); campBeamState is what the scene tells
// the audio each frame: { kind: 'turrets' | 'laser' | '', level 0 to 1, rise 0 to 1 }.
// The mining lasers (the belt card) say they fire through C.lasers, a list the sim keeps: [{ from: the ship's id, to: the rock's or the alien's id, kind: 'rock' | 'alien',
// since: the battle's clock (ms) when this beam began without a break }], empty when none fires. One hum for the beams on rocks (and, if CAMP.beamHum.alienLaser asks, those on aliens: a plain turret shot is one).
function campBeam(C, dt) {
  const on = campHas(C, 'beam') && !!C.input.fire && C.carrier.hp > 0 && C.turrets.some(t => t.target);
  C.beamT = on ? Math.min(CAMP.beamHum.rise, (C.beamT || 0) + dt) : Math.max(0, (C.beamT || 0) - dt * 3);
}
function campBeamState(C) {
  const off = { kind: '', level: 0, rise: 0 }, k = CAMP.beamHum;
  if (!C || C.result || C.carrier.hp <= 0) return off;
  if (campHas(C, 'beam') && C.input.fire && C.turrets.some(t => t.target)) return { kind: 'turrets', level: 1, rise: Math.min(1, (C.beamT || 0) / k.rise) };
  const ls = (C.lasers || []).filter(l => l && Number.isFinite(l.since) && (l.kind !== 'alien' || k.alienLaser)); // a turret shot at an alien is a pulse with a pew of its own, unless alienLaser asks for the hum on it too
  return ls.length ? { kind: 'laser', level: k.laserLevel, rise: Math.min(1, Math.max(0, (C.t - Math.min(...ls.map(l => l.since))) / 1000 / k.rise)) } : off;
}
const k_laser_turret = C => CAMP.laser.turret * (campHas(C, 'beam') ? CAMP.tech.beam.damage : 1); // what a turret shot does to a rock (the beam tech cuts faster too)
const campDrift = 0.3; // a shot keeps this share of its shooter's own speed (campLead reads it too)
function campBullet(C, from, rot, speed, dmg, lifeMs, team, ahead, extra) {
  const b = Object.assign({ x: from.x + Math.cos(rot) * (ahead || 0), y: from.y + Math.sin(rot) * (ahead || 0), vx: Math.cos(rot) * speed + (from.vx || 0) * campDrift, vy: Math.sin(rot) * speed + (from.vy || 0) * campDrift, dmg, life: lifeMs, team, from: from.id, rot }, extra || {});
  C.bullets.push(b); return b;
}

// the bay: Launch queues the ships, one leaves every launchEvery ms
function campLaunch(C) {
  if (!C.launchQ.length || C.t < C.nextLaunch || C.carrier.hp <= 0) return;
  C.nextLaunch = C.t + CAMP.bay.launchEvery;
  const kind = C.launchQ.shift(), c = C.carrier, side = (C.launched % 2 ? 1 : -1), m = CAMP.bay.mouth, cs = Math.cos(c.rot), sn = Math.sin(c.rot); // out of the mouth of a hangar pod, one side and then the other
  const u = campSpawn(C, kind, c.x + cs * m[0] - sn * side * m[1], c.y + sn * m[0] + cs * side * m[1]); C.launched++;
  u.vx = c.vx + Math.cos(c.rot) * 140; u.vy = c.vy + Math.sin(c.rot) * 140; u.rot = c.rot;
  const cv = kind === 'escort' ? campNearest(campConvoys(C), c) : null;
  u.order = cv ? { type: 'escort', target: cv.id, slot: campWing(C, 'escort').length - 1 } : { type: 'guard', at: { kind: 'carrier' } };
  C.events.push({ type: 'launch', id: u.id, kind });
}

// resource caches (level 2): any ship of yours that comes close picks one up
function campCaches(C) {
  C.caches.forEach(k => {
    if (k.got) return;
    if (!C.ships.some(u => u.team === 'earth' && u.hp > 0 && Math.hypot(u.x - k.x, u.y - k.y) <= CAMP.cache.radius)) return;
    k.got = true; C.cachesGot++; C.events.push({ type: 'cache', x: k.x, y: k.y });
    campSay(C, 'camp.say.cache', { n: C.cachesGot, total: C.caches.length });
  });
}
// the relic (level 2): with enough caches collected, the carrier holds within its ring, with no alien near it, until it answers; leave or let an alien close and it loses ground twice as fast
function campRelic(C, dt) {
  const L = C.L, r = L.relic; if (!r || !C.relic || C.carrier.hp <= 0) return;
  const R = C.relic, ready = C.cachesGot >= r.caches, near = campDist(C.carrier, R) <= r.radius, clear = !campAliens(C).some(u => campDist(u, R) <= r.clear);
  if (ready && near && clear) {
    if (R.hold === 0) campSay(C, 'camp.say.relicon');
    R.hold += dt;
    if (R.hold >= r.hold) { R.hold = r.hold; campSay(C, 'camp.say.relicdone'); campWin(C, 'relic'); }
  } else if (R.hold > 0) R.hold = Math.max(0, R.hold - dt * 2);
}

// C.lasers from this tick's beams: a beam stays on the list for 250 ms after its last pulse (a turret fires every 0.7 s, eight of them: it reads as one beam), and its since is when it began
function campLasers(C) {
  C.laserNow.forEach(b => { const key = b.from + '>' + b.to, old = C.laserLog[key]; C.laserLog[key] = { from: b.from, to: b.to, kind: b.kind, since: old && C.t - old.last <= 250 ? old.since : C.t, last: C.t }; });
  C.lasers = Object.keys(C.laserLog).map(k => C.laserLog[k]).filter(b => C.t - b.last <= 250).map(b => ({ from: b.from, to: b.to, kind: b.kind, since: b.since }));
  Object.keys(C.laserLog).forEach(k => { if (C.t - C.laserLog[k].last > 1000) delete C.laserLog[k]; });
}
// a laser on a rock: it takes hit points off; at zero the rock breaks into a chunk of ore where it was (any ship of yours that flies over it takes it). by: who cut it (the scene draws the beam)
function campRockHit(C, rock, dmg) {
  if (rock.hp <= 0) return;
  rock.hp -= dmg; rock.cutAt = C.t;
  if (rock.hp <= 0) { rock.hp = 0; C.pickups.push({ id: 'chunk-' + (C.nextId++), kind: 'chunk', x: rock.x, y: rock.y, ore: rock.ore, born: C.t }); C.events.push({ type: 'rockbreak', x: rock.x, y: rock.y, id: rock.id }); C.rocksBroken = (C.rocksBroken | 0) + 1; }
}
// ore: a ship of yours that comes close takes it (unless the store is full); a wreck's ore goes after wreckLife
function campPickups(C) {
  const k = CAMP.ore, mine = C.ships.filter(u => u.team === 'earth' && u.hp > 0);
  C.rocks = C.rocks.filter(r => r.hp > 0); // a broken rock is gone (its chunk lies where it was)
  C.pickups = C.pickups.filter(p => {
    if (p.kind === 'wreck' && C.t - p.born > k.wreckLife) return false;
    if (C.ore >= k.cap) return true;
    const by = mine.find(u => Math.hypot(u.x - p.x, u.y - p.y) <= k.reach + u.r);
    if (!by) return true;
    const take = Math.min(p.ore, k.cap - C.ore); C.ore += take; C.events.push({ type: 'ore', x: p.x, y: p.y, n: take, id: p.id });
    return false;
  });
}
// the bay's workshop: the first ship of the queue is built (one at a time), then it is in the bay
function campFactory(C, dt) {
  const q = C.build.queue; if (!q.length || C.carrier.hp <= 0) return;
  q[0].left -= dt;
  if (q[0].left <= 0) { const b = q.shift(); C.bay[b.kind + 's']++; C.events.push({ type: 'built', kind: b.kind }); campSay(C, 'camp.say.built', { kind: b.kind }); }
}

// the ship's voice says when Earth's shield or the carrier's hull first falls to half and to a quarter: until now nothing but the bars said so, and a level was lost with no word before it
function campWarn(C) {
  if (C.result || !C.carrier || C.carrier.hp <= 0) return;
  const w = CAMP.warn, was = C.warned = C.warned || {};
  const check = (id, frac, keys) => {
    let at = -1;
    w.forEach((share, i) => { if (frac <= share) { if (!was[id + i]) { was[id + i] = true; at = i; } } else if (frac > share + 0.15) was[id + i] = false; }); // mended well past it: it may warn again
    if (at >= 0) campSay(C, keys[at]); // one line, the lowest share it has just fallen to (a big hit can cross both at once)
  };
  if (C.earth && C.earth.shield > 0) check('earth', C.earth.shield / C.earth.max, ['camp.say.earthhalf', 'camp.say.earthlow']);
  check('hull', C.carrier.hp / C.carrier.maxHp, ['camp.say.hullhalf', 'camp.say.hulllow']);
}
// Earth's shield mends slowly once it has been left alone for a while (level 1; a level with no Earth has none)
function campEarth(C, dt) {
  const e = C.earth, k = CAMP.earth; if (!e || !k.regen || e.shield <= 0 || e.shield >= e.max || C.t - (e.hitAt || 0) < k.regenDelay) return;
  e.shield = Math.min(e.max, e.shield + k.regen * dt);
}

// the repair field (a tech)
function campRepair(C, dt) {
  if (!campHas(C, 'repair') || C.carrier.hp <= 0) return;
  const t = CAMP.tech.repair;
  C.ships.forEach(u => { if (u.team === 'earth' && u.hp > 0 && u.hp < u.maxHp && campDist(u, C.carrier) <= t.reach) u.hp = Math.min(u.maxHp, u.hp + t.rate * dt); });
}

// ---------- the ships fly ----------
// pirateSteer (src/enemies.js) is written against Math.random; here it takes the game's own seeded numbers, so a seed repeats a fight exactly
function campSteer(C, u, def, dist, target, vx, vy) {
  const r = Math.random; Math.random = C.rng;
  try { return pirateSteer(u, def, dist, target, C.t, vx, vy); } finally { Math.random = r; }
}
// a ship's own push: accelerate along `ang`, drag as the game's ships have (half the speed in a second), turn the nose toward `face`
function campMove(u, ang, face, dt, thrust) {
  const a = thrust == null ? u.accel : u.accel * thrust;
  u.vx += Math.cos(ang) * a * dt; u.vy += Math.sin(ang) * a * dt;
  const keep = Math.pow(0.5, dt); u.vx *= keep; u.vy *= keep;
  const sp = Math.hypot(u.vx, u.vy); if (sp > u.vmax) { u.vx *= u.vmax / sp; u.vy *= u.vmax / sp; }
  u.rot = campRot(u.rot, face, u.turn * dt * (Math.abs(campWrap(face - ang)) < 0.05 ? 1 : 2));
  u.x += u.vx * dt; u.y += u.vy * dt;
}
// fly to a point and slow down on arrival (station keeping, orbits)
function campSeek(u, px, py, dt, face) {
  const dx = px - u.x, dy = py - u.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), want = Math.min(u.vmax, d * 1.6);
  const vx = Math.cos(ang) * want, vy = Math.sin(ang) * want, ex = vx - u.vx, ey = vy - u.vy;
  campMove(u, Math.atan2(ey, ex), face == null ? (d > 40 ? ang : u.rot) : face, dt, Math.min(1, Math.hypot(ex, ey) / 120));
}
function campAI(C, u, dt) {
  if (u.kind === 'tower') return campTowerAI(C, u, dt);
  if (u.kind === 'freighter') return campConvoyAI(C, u, dt);
  if (u.kind === 'mother') return campMotherAI(C, u, dt);
  if (u.team === 'alien') return campAlienAI(C, u, dt);
  return campWingAI(C, u, dt);
}
function campConvoyAI(C, u, dt) {
  const d = campDist(u, u.dest), ang = Math.atan2(u.dest.y - u.y, u.dest.x - u.x);
  if (d < 90) { C.delivered++; u.hp = 0; u.arrived = true; C.events.push({ type: 'arrive', x: u.x, y: u.y, id: u.id }); campSay(C, 'camp.say.delivered', { name: campConvoyName(u) }); return; }
  u.rot = ang; u.vx = Math.cos(ang) * u.vmax; u.vy = Math.sin(ang) * u.vmax; u.x += u.vx * dt; u.y += u.vy * dt;
}

// an alien: goes for its goal (Earth, or a convoy), turns on whatever hits it for a few seconds, else on the nearest ship of yours that comes close
function campTowerAI(C, u, dt) { // a gun on a post: turns on the nearest of your ships inside its range and fires
  const k = CAMP.tower, tgt = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, k.range); if (!tgt) return;
  const aim = Math.atan2(tgt.y - u.y, tgt.x - u.x); u.rot = campRot(u.rot, aim, k.turn * dt);
  if (C.t > u.nextShot && Math.abs(campWrap(aim - u.rot)) < 0.12) { u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]); campBullet(C, u, u.rot, k.bullet, k.damage * CAMP.alien.damageScale, 1900, 'alien', u.r); }
}
function campAlienAI(C, u, dt) {
  const def = u.def;
  if (u.hold) { // a guard: it waits where it is until one of your ships comes within reach, then it is an ordinary alien
    if (!campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, def.engage * 0.9)) { const keep = Math.pow(0.5, dt); u.vx *= keep; u.vy *= keep; u.x += u.vx * dt; u.y += u.vy * dt; return; }
    u.hold = false;
  }
  let tgt = null;
  if (u.hitBy && u.distractedUntil > C.t) { const h = C.by[u.hitBy]; if (h && h.hp > 0) tgt = h; }
  if (!tgt && u.goal && u.goal.indexOf('convoy:') === 0) { const f = C.by['freighter-' + u.goal.slice(7)]; if (f && f.hp > 0) tgt = f; }
  if (!tgt) { const near = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, def.engage * 0.7); if (near) { tgt = near; if (near !== C.carrier) u.lost = false; } } // one of your other ships in reach: it is on that ship (the carrier is the leash's: campPursuit)
  if (campPursuit(C, u, tgt)) { // it has lost you: it goes back to its post (a guard) or settles where it is and guards (the rest), and an Earth wave goes on to Earth
    if (!C.earth) { // no Earth here: a guard goes back to its post and holds there again; the rest come to rest where they are, out of it until the carrier comes within the leash again (campPursuit clears it)
      if (u.post && campDist(u, u.post) > 90) { campSeek(u, u.post.x, u.post.y, dt); return; }
      if (u.post) { u.hold = true; u.lost = false; return; }
      const keep = Math.pow(0.4, dt); u.vx *= keep; u.vy *= keep; u.x += u.vx * dt; u.y += u.vy * dt; return;
    }
    tgt = null; // Earth is its goal as it was
  }
  const isEarth = !tgt && !!C.earth; if (!tgt) tgt = C.earth || C.carrier; // nothing near and no Earth in this level: it comes for the carrier
  const dx = tgt.x - u.x, dy = tgt.y - u.y, dist = Math.hypot(dx, dy), target = Math.atan2(dy, dx), tv = isEarth ? { x: 0, y: 0 } : { x: tgt.vx || 0, y: tgt.vy || 0 };
  const m = campSteer(C, u, def, dist, target, u.vx - tv.x, u.vy - tv.y);
  campMove(u, m.ang, m.face, dt);
  if (m.fire && dist < def.range + (isEarth ? C.earth.r : 0) && C.t > u.nextShot && Math.abs(campWrap(target - u.rot)) < def.aim) {
    u.nextShot = C.t + campBetween(C, def.shot[0], def.shot[1]);
    const n = def.spread || 1;
    for (let i = 0; i < n; i++) campBullet(C, u, u.rot + (i - (n - 1) / 2) * 0.17, def.bullet, def.dmg * CAMP.alien.damageScale, 1800, 'alien', 14);
  }
}
// pursuit: an alien that was on the carrier (it targeted it within the leash) and has been beyond the leash for loseAfter ms has lost it. Returns true while it has. A burn does it (every top speed is under the burn's,
// and the aliens' are all over the carrier's regular speed, so at regular speed nothing is lost); an alien that has never been near (it is coming from afar) is not lost, it has nothing to lose.
function campPursuit(C, u, tgt) {
  const K = CAMP.alien.pursuit, car = C.carrier; if (!K || !car || car.hp <= 0 || (tgt && tgt !== car)) return false; // an alien fighting something else (a convoy, the ship that hit it, one of your ships in reach) is not chasing the carrier
  const d = campDist(u, car), onCar = tgt === car || (!tgt && !C.earth), leash = ((u.def && u.def.range) || 520) * K.leashOf; // with no Earth in the level an alien with nothing near comes for the carrier
  if (onCar && d <= leash) { u.seenAt = C.t; u.lost = false; return false; } // on the carrier and within the leash
  if (u.lost) return true;
  if (u.seenAt == null || d <= leash || C.t - u.seenAt < K.loseAfter) return false;
  u.lost = true; u.seenAt = null; u.lostN = (u.lostN || 0) + 1; // lostN: how many times it has lost you
  if (C.t - (C.lostSayAt == null ? -1e9 : C.lostSayAt) >= K.sayEvery) { C.lostSayAt = C.t; campSay(C, 'camp.say.lost'); }
  return true;
}
// the mothership: it comes in toward Earth, stops at holdAt, fires volleys at your ships, and launches raiders
function campMotherAI(C, u, dt) {
  const k = CAMP.mother, toE = Math.atan2(-u.y, -u.x), dE = Math.hypot(u.x, u.y);
  if (dE > k.holdAt) campMove(u, toE, toE, dt, 0.5); else { u.vx *= Math.pow(0.4, dt); u.vy *= Math.pow(0.4, dt); u.x += u.vx * dt; u.y += u.vy * dt; }
  const tgt = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, k.range);
  if (tgt && C.t > u.nextShot) {
    u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]);
    const aim = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    for (let i = 0; i < k.shots; i++) campBullet(C, u, aim + (i - (k.shots - 1) / 2) * 0.14, k.bullet, k.damage * CAMP.alien.damageScale, 2400, 'alien', u.r);
  } else if (!tgt && dE < k.holdAt + 400 && C.t > u.nextShot && Math.hypot(u.x, u.y) < k.holdAt + 400) { // nothing of yours near: it shells Earth
    u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]) * 1.5;
    for (let i = 0; i < k.shots; i++) campBullet(C, u, toE + (i - (k.shots - 1) / 2) * 0.1, k.bullet, k.damage * CAMP.alien.damageScale, 4000, 'alien', u.r);
  }
  if (C.t >= C.motherSpawn) {
    C.motherSpawn = C.t + k.spawnEvery;
    if (C.ships.filter(s => s.team === 'alien' && s.kind === 'raider' && s.fromMother && s.hp > 0).length < k.spawnMax) { const r = campSpawn(C, 'raider', u.x, u.y); if (r) { r.fromMother = true; r.goal = 'earth'; r.wave = u.wave; } }
  }
}

// a ship of yours, by its order (fighters and escorts)
function campWingAI(C, u, dt) {
  const k = CAMP[u.kind], c = C.carrier, o = u.order || { type: 'guard', at: { kind: 'carrier' } }, aliens = campAliens(C);
  let foe = null, home = null;
  if (o.type === 'recall') {
    if (campDist(u, c) < CAMP.bay.dockAt) { u.hp = 0; u.docked = true; C.bay[u.kind + 's']++; C.events.push({ type: 'dock', id: u.id }); return; }
    return campSeek(u, c.x, c.y, dt);
  }
  if (o.type === 'attack') {
    foe = o.target && C.by[o.target] && C.by[o.target].hp > 0 ? C.by[o.target] : campNearest(aliens, u);
    if (!foe) home = c; // nothing left to hit: back to the carrier's side
  } else if (o.type === 'escort') {
    const cv = C.by[o.target];
    if (!cv || cv.hp <= 0) { u.order = { type: 'guard', at: { kind: 'carrier' } }; return; }
    foe = campNearest(aliens, cv, 650); if (!foe) { const a = (o.slot || 0) * 2.4 + C.t / 4000; home = { x: cv.x + Math.cos(a) * k.beside, y: cv.y + Math.sin(a) * k.beside, vx: cv.vx, vy: cv.vy }; }
  } else if (o.type === 'mine') { // fight what comes within 320 px; else take a chunk or a wreck lying about, or cut the nearest rock (a laser from the ship); with none, circle the carrier and wait for more
    foe = campNearest(aliens, u, 320);
    const safe = r => !aliens.some(a => campDist(a, r) < CAMP.ore.danger), pk = campNearest(C.pickups.filter(safe), u), rk = campNearest(C.rocks.filter(r => r.hp > 0 && safe(r)), u);
    if (!foe) {
      if (pk && (!rk || campDist(pk, u) <= campDist(rk, u) + 150)) home = pk; // ore lying about first: fly over it
      else if (rk) { // a rock: go to the laser's hold distance from it and cut it
        const dx = u.x - rk.x, dy = u.y - rk.y, d = Math.hypot(dx, dy) || 1, L = CAMP.laser;
        home = { x: rk.x + dx / d * L.hold, y: rk.y + dy / d * L.hold, vx: 0, vy: 0 };
        if (d - rk.r <= L.range) { campRockHit(C, rk, L.dps * (C.dt || CAMP.step)); C.laserNow.push({ from: u.id, to: rk.id, kind: 'rock' }); u.rot = campRot(u.rot, Math.atan2(rk.y - u.y, rk.x - u.x), 0.4); C.events.push({ type: 'laser', src: 'drone', id: u.id, x: u.x, y: u.y, tx: rk.x + dx / d * rk.r * 0.6, ty: rk.y + dy / d * rk.r * 0.6, rock: rk.id }); }
      } else { const a = (parseInt(u.id.split('-')[1], 10) || 0) * 0.9 + C.t / 3500; home = { x: c.x + Math.cos(a) * 330, y: c.y + Math.sin(a) * 330, vx: c.vx || 0, vy: c.vy || 0 }; }
    }
  } else { // guard: a point (the carrier, a place, a convoy) is circled; an alien that comes within reach of it, or of this ship, is fought
    const at = o.at || { kind: 'carrier' }, p = at.kind === 'carrier' ? c : at.kind === 'place' ? campPlaces(C.level)[at.id] : C.by[at.id] || c;
    foe = campNearest(aliens, p, 700) || campNearest(aliens, u, 450);
    if (!foe) { const a = (u.id.length * 1.7 + (parseInt(u.id.split('-')[1], 10) || 0) * 0.9) + C.t / 3500; home = { x: p.x + Math.cos(a) * 330, y: p.y + Math.sin(a) * 330, vx: p.vx || 0, vy: p.vy || 0 }; }
  }
  if (foe) {
    const dx = foe.x - u.x, dy = foe.y - u.y, dist = Math.hypot(dx, dy), target = Math.atan2(dy, dx);
    const m = campSteer(C, u, u.def, dist, target, u.vx - (foe.vx || 0), u.vy - (foe.vy || 0));
    campMove(u, m.ang, m.face, dt);
    if (m.fire && dist < k.range + (foe.r || 0) && C.t > u.nextShot && Math.abs(campWrap(target - u.rot)) < k.aim) {
      u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]);
      campBullet(C, u, u.rot, k.bullet, k.damage, 1400, 'earth', 14); C.events.push({ type: 'wingshot', x: u.x, y: u.y, kind: u.kind, id: u.id }); // the wing's gun has a sound of its own (the scene scales it by the distance)
    }
    u.move = u.move || null;
  } else if (home) campSeek(u, home.x + (home.vx || 0) * 0.2, home.y + (home.vy || 0) * 0.2, dt);
}

// shots fly and hit: a step of a shot is tested against the circle it crosses, so a fast shot cannot skip a small ship
function campBullets(C, dt) {
  const alive = C.ships.filter(u => u.hp > 0), el = alive.filter(u => u.team === 'earth'), al = alive.filter(u => u.team === 'alien');
  C.bullets.forEach(b => {
    if (b.dead) return;
    const px = b.x, py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt * 1000;
    if (b.life <= 0) { b.dead = true; return; }
    const targets = b.team === 'earth' ? al : el;
    for (const u of targets) {
      if (u.hp <= 0) continue;
      if (campSegHit(px, py, b.x, b.y, u.x, u.y, u.r + 2)) {
        if (b.beam) { b.hit = b.hit || {}; if (b.hit[u.id]) continue; b.hit[u.id] = true; } // a beam goes through every ship in its line, but hurts each one once (it hurt a big one every step it was inside: 21 times as much on the mothership)
        campHurt(C, u, b.dmg, b.from); if (!b.beam) { b.dead = true; return; }
      }
    }
    if (C.earth && b.team === 'alien' && campSegHit(px, py, b.x, b.y, C.earth.x, C.earth.y, C.earth.r)) { // Earth is hit (a level with no Earth has none to hit)
      b.dead = true; if (!C.god) C.earth.shield -= b.dmg * CAMP.alien.earthDamage; C.earth.hitAt = C.t; C.events.push({ type: 'earthhit', x: b.x, y: b.y }); // god mode (a debug key, src/campdebug.js): Earth's shield does not fall either
      if (C.earth.shield <= 0) { C.earth.shield = 0; if (C.earth.loseWhy === 'base') campEnd(C, 'lost', 'base'); else campEnd(C, 'lost', 'earth'); }
    }
  });
  C.bullets = C.bullets.filter(b => !b.dead);
}

// ---------- the missile launcher (card space-game-campaign-missiles; the numbers are CAMP.missile) ----------
// C.missiles is the magazine: a plain number. The slow reload brings it back up to CAMP.missile.magazine, one every `reload` ms; campMissileAdd (the ore code) can fill it up to `max`.
// A missile goes for its target, turning at most `turn` rad/s; when the target is gone it takes the mothership or the nearest big ship in reach, else it flies on until its fuel is out.
// Its fuze goes off near a big ship (never a raider or a drone on the way), and every alien within `blast` is hurt: a big ship `big`, any other `small`.
const campBig = u => CAMP.missile.bigKinds.indexOf(u.kind) >= 0;
function campMissileTarget(C, from) { // the mothership if it is in reach, else the nearest big alien in reach (of `from`: the carrier unless a missile asks)
  const p = from || C.carrier, big = campAliens(C).filter(u => campBig(u) && campDist(u, p) <= CAMP.missile.lock);
  return big.find(u => u.kind === 'mother') || campNearest(big, p) || null;
}
function campFire(C, tg) { // one missile out of the tube: the magazine is a missile less, the launcher cycles
  const k = CAMP.missile, c = C.carrier;
  C.missiles--; C.nextRocket = C.t + k.delay; if (!C.reloadAt) C.reloadAt = C.t + k.reload;
  const m = { id: 'missile-' + (++C.rocketId), x: c.x + Math.cos(c.rot) * c.r, y: c.y + Math.sin(c.rot) * c.r, rot: c.rot, sp: k.launch, vx: 0, vy: 0, life: k.life, target: tg ? tg.id : '' };
  C.rockets.push(m); C.events.push({ type: 'missile', x: m.x, y: m.y, id: m.id });
  return m;
}
function campMissileAdd(C, n) { // the ore code: n more missiles into the magazine, up to `max`; how many went in
  const k = CAMP.missile, was = C.missiles; C.missiles = Math.max(0, Math.min(k.max, was + Math.floor(n || 0)));
  if (C.missiles >= k.magazine) C.reloadAt = 0; // a full magazine has nothing to reload
  return C.missiles - was;
}
function campMissiles(C, dt) {
  const k = CAMP.missile;
  if (C.missiles >= k.magazine) C.reloadAt = 0; // the reload clock runs only while the magazine is below its full
  else if (!C.reloadAt) C.reloadAt = C.t + k.reload;
  else if (C.t >= C.reloadAt) { C.missiles++; C.reloadAt = C.missiles >= k.magazine ? 0 : C.t + k.reload; }
  C.rockets.forEach(m => {
    if (m.dead) return;
    m.life -= dt * 1000;
    let tg = m.target ? C.by[m.target] : null;
    if (!tg || tg.hp <= 0) { tg = campMissileTarget(C, m); m.target = tg ? tg.id : ''; }
    if (tg) m.rot = campRot(m.rot, Math.atan2(tg.y - m.y, tg.x - m.x), k.turn * dt);
    m.sp = Math.min(k.speed, m.sp + k.accel * dt); m.vx = Math.cos(m.rot) * m.sp; m.vy = Math.sin(m.rot) * m.sp;
    const px = m.x, py = m.y; m.x += m.vx * dt; m.y += m.vy * dt;
    const hit = C.ships.find(u => u.team === 'alien' && u.hp > 0 && campBig(u) && campSegHit(px, py, m.x, m.y, u.x, u.y, u.r + k.fuze));
    if (hit) { // it goes off: everything near it is hurt, a big ship most
      m.dead = true; C.events.push({ type: 'mboom', x: m.x, y: m.y, r: k.blast });
      campAliens(C).forEach(u => { if (campDist(u, m) <= k.blast + u.r) campHurt(C, u, campBig(u) ? k.big : k.small, C.carrier.id); });
    } else if (m.life <= 0) { m.dead = true; C.events.push({ type: 'mfizzle', x: m.x, y: m.y, id: m.id }); }
  });
  C.rockets = C.rockets.filter(m => !m.dead);
}

// ---------- tech, story and the save ----------
function campTechChoices(level) { return Object.keys(CAMP.tech).filter(id => CAMP.tech[id].after === level); }
function campPick(P, id) {
  if (!CAMP.tech[id] || P.techs.indexOf(id) >= 0) return false;
  P.techs.push(id); return true;
}
function campStory(level, when) {
  const out = [];
  for (let n = 1; n <= 6; n++) { const key = 'camp.l' + level + '.' + when + '.' + n; if (Object.prototype.hasOwnProperty.call(UI_TEXT, key)) out.push(uiText(key)); }
  return out;
}
function campProgressNew() { return { level: 1, mission: 0, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }; } // level and mission: the next one to fly; ore: carried into the next level; bonus: the extra ships the Earth refit bought for it; results: { '<level>.<mission>': { score, bonuses: [ids], t, hull, lost, tries } }, one for each mission flown (the best score is kept)
const campResultKey = (level, i) => level + '.' + ((i | 0) + 1);
function campProgressLoad() {
  const P = campProgressNew();
  campTry(() => {
    const raw = JSON.parse(localStorage.getItem(CAMP.store) || 'null'); if (!raw || typeof raw !== 'object') return;
    if (Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= 9) P.level = raw.level;
    if (Number.isInteger(raw.mission) && raw.mission >= 0 && raw.mission < 9) P.mission = raw.mission;
    if (Array.isArray(raw.techs)) raw.techs.forEach(t => { if (CAMP.tech[t] && P.techs.indexOf(t) < 0) P.techs.push(t); });
    if (Number.isFinite(raw.ore)) P.ore = Math.max(0, Math.min(CAMP.ore.cap, Math.floor(raw.ore)));
    if (raw.bonus && typeof raw.bonus === 'object') { const b = x => Number.isInteger(x) ? Math.max(0, Math.min(CAMP.refit.most, x)) : 0; P.bonus = { fighters: b(raw.bonus.fighters), escorts: b(raw.bonus.escorts) }; }
    if (raw.results && typeof raw.results === 'object') Object.keys(raw.results).slice(0, 40).forEach(k => { const r = raw.results[k]; if (/^[1-9]\.[1-9]$/.test(k) && r && Number.isFinite(r.score)) P.results[k] = { score: Math.max(0, Math.min(99999, Math.floor(r.score))), bonuses: Array.isArray(r.bonuses) ? r.bonuses.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 24)) : [], t: Math.max(0, r.t | 0), hull: Math.max(0, r.hull | 0), lost: Math.max(0, r.lost | 0), tries: Math.max(1, Math.min(99, r.tries | 0 || 1)) }; });
  }, 0);
  if (P.mission >= campMissions(P.level).length) P.mission = 0;
  return P;
}
function campProgressSave(P) { campTry(() => localStorage.setItem(CAMP.store, JSON.stringify({ level: P.level, mission: P.mission | 0, techs: P.techs, ore: P.ore | 0, bonus: P.bonus, results: P.results || {} })), 0); }
// a mission won: its result is kept (the best score, how many tries), and the mission to fly next moves on. Answers { levelDone }: true when it was the last mission of its level (the caller goes to the level's story and refit, then the next level)
function campMissionDone(P, level, i, sc) {
  const k = campResultKey(level, i), old = P.results[k], res = { score: sc.score, bonuses: sc.bonuses.filter(b => b.ok).map(b => b.id), t: sc.t, hull: sc.hullLeft, lost: sc.shipsLost, tries: (old ? old.tries : 0) + 1 };
  if (old && old.score > res.score) { res.score = old.score; res.bonuses = old.bonuses; res.t = old.t; res.hull = old.hull; res.lost = old.lost; }
  P.results[k] = res;
  const last = i + 1 >= campMissions(level).length;
  if (!last) { P.level = level; P.mission = i + 1; } else P.mission = 0;
  return { levelDone: last };
}
// a mission tried and lost: the tries count (the mission is flown again; the level is not lost)
function campMissionTried(P, level, i) { const k = campResultKey(level, i); if (P.results[k]) P.results[k].tries++; }

// ---------- missions: objectives, bonus objectives, score ----------
// Objectives are data (a mission row's `objectives`): { type: 'scan', points: [{ at, r, secs }] } (any ship of yours within r of each point for secs, in all), { type: 'deliver', n } (n haulers reach their place),
// { type: 'kill', what: 'mother' | 'towers' | 'guards' | 'wave:<i>' }, { type: 'hold', secs } (the defended place stands that long), { type: 'relic' } (the relic ring held), { type: 'caches', n }, { type: 'clear' }
// (every wave has come and no alien is alive). All met: the mission is won. campObjectives(C) is each one's state; a mission with none is won by the old rule (docs/CAMPAIGN.md, Missions).
function campObjectives(C) {
  return (C.L.objectives || []).map((o, i) => {
    let got = 0, need = 1;
    if (o.type === 'scan') { need = C.scan.length; got = C.scan.filter(p => p.got).length; }
    else if (o.type === 'deliver') { need = o.n; got = C.delivered >= o.n && !campConvoys(C).length && C.L.convoys.every((cv, k) => C.convoys[k].started) ? o.n : Math.min(C.delivered, o.n - 1); } // done when n have arrived and no hauler is still flying or waiting to leave (so a bonus for delivering them all can be earned)
    else if (o.type === 'kill') {
      if (o.what === 'mother') got = C.flags.mother ? 1 : 0;
      else if (o.what === 'towers') got = C.flags.towers ? 1 : 0;
      else if (o.what === 'guards') got = C.guardsStart && !C.ships.some(u => u.guard && u.hp > 0) ? 1 : 0;
      else if (/^wave:/.test(o.what)) { const w = parseInt(o.what.slice(5), 10); got = C.waves[w] && C.waves[w].started && !C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === w) ? 1 : 0; }
    } else if (o.type === 'hold') { need = o.secs; got = Math.min(o.secs, Math.floor(C.t / 1000)); }
    else if (o.type === 'relic') got = C.flags.relic ? 1 : 0;
    else if (o.type === 'caches') { need = o.n; got = Math.min(o.n, C.cachesGot); }
    else if (o.type === 'clear') got = C.waves.length && C.waves.every(w => w.started) && !campAliens(C).length ? 1 : 0;
    return { i, type: o.type, what: o.what, got, need, done: got >= need };
  });
}
// every tick: the recon points fill up while a ship of yours is near them; a mission whose objectives are all met is won; one that can no longer be met is lost (haulers)
function campMissions_tick(C, dt) {
  if (C.result || !C.L.objectives) return;
  const mine = C.ships.filter(u => u.team === 'earth' && u.hp > 0 && u.kind !== 'freighter');
  C.scan.forEach(p => { if (p.got) return; if (mine.some(u => Math.hypot(u.x - p.x, u.y - p.y) <= p.r)) { p.t += dt; if (p.t >= p.secs) { p.got = true; C.events.push({ type: 'scanned', x: p.x, y: p.y, n: C.scan.filter(q => q.got).length, of: C.scan.length }); campSay(C, 'camp.say.scanned', { n: C.scan.filter(q => q.got).length, of: C.scan.length }); } } });
  if (C.guardsStart == null) C.guardsStart = C.ships.some(u => u.guard);
  const st = campObjectives(C);
  st.forEach(o => { if (o.type === 'deliver' && C.delivered + campConvoys(C).length + C.L.convoys.filter((cv, i) => !C.convoys[i].started).length < o.need) campEnd(C, 'lost', 'convoy'); }); // too many haulers lost
  if (!C.result && st.length && st.every(o => o.done)) campEnd(C, 'won', C.L.win || (st[st.length - 1].what || st[st.length - 1].type));
}
// the bonus objectives of a mission row (`bonus`): { id, type: 'time' (secs) | 'lost' (n: at most this many ships lost) | 'hull' (pct: at least) | 'ore' (n) | 'delivered' (all of the haulers), text }
function campBonuses(C) {
  return (C.L.bonus || []).map(b => {
    let ok = false;
    if (b.type === 'time') ok = C.t / 1000 <= b.secs; else if (b.type === 'lost') ok = C.lostShips <= b.n; else if (b.type === 'hull') ok = C.carrier.hp >= C.carrier.maxHp * b.pct / 100;
    else if (b.type === 'ore') ok = C.ore >= b.n; else if (b.type === 'delivered') ok = C.delivered >= C.L.convoys.length;
    return { id: b.id, type: b.type, text: b.text, secs: b.secs, n: b.n, pct: b.pct, ok, points: ok ? CAMP.score.bonus : 0 };
  });
}
// the score of a won mission: { score, base, bonuses, hull, speed, lost, t, hullLeft, shipsLost }
function campScore(C) {
  const K = CAMP.score, bonuses = campBonuses(C), t = Math.round(C.t / 1000), par = C.L.par || K.par, hullShare = C.carrier.hp / C.carrier.maxHp;
  const hull = Math.round(K.hull * Math.max(0, hullShare)), speed = Math.max(0, par - t) * K.speed, lost = C.lostShips * K.ship, bonus = bonuses.reduce((a, b) => a + b.points, 0);
  return { score: Math.max(0, K.base + bonus + hull + speed - lost), base: K.base, bonuses, bonus, hull, speed, lost, t, hullLeft: Math.round(C.carrier.hp), shipsLost: C.lostShips };
}

// what the level asks of you, in the words of content/text/ui.md (camp.obj.<win>): the HUD shows it, the ship computer is told it
function campObjective(C) {
  const L = C.L, win = L.win;
  if (L.objectives) { // a mission: the first objective that is not done yet
    const o = campObjectives(C).find(x => !x.done); if (!o) return uiText('camp.o.done');
    const key = 'camp.o.' + o.type + (o.type === 'kill' ? '.' + String(o.what).replace(/:.*/, '') : '');
    return uiText(key, { got: o.got, need: o.need, secs: o.need });
  }
  if (win === 'mother') return uiText(C.ships.some(u => u.kind === 'mother' && u.hp > 0) ? 'camp.obj.mother' : 'camp.obj.motherwait'); // the mothership comes with the last wave: until then the goal is to hold
  if (win === 'towers') return uiText('camp.obj.towers', { n: C.ships.filter(u => u.kind === 'tower' && u.hp > 0).length });
  if (win === 'relic') {
    if (C.cachesGot < L.relic.caches) return uiText('camp.obj.caches', { n: C.cachesGot, need: L.relic.caches });
    return uiText('camp.obj.relic', { pct: Math.round(C.relic.hold / L.relic.hold * 100) });
  }
  return '';
}

// what the ship computer is told about a battle in progress (STATE in src/shipcomputer.js)
function campSummary(C) {
  if (!C) return 'Campaign: not in a battle.';
  const L = C.L, c = C.carrier, m = C.ships.find(u => u.kind === 'mother' && u.hp > 0);
  const out = campWing(C, 'fighter').length, esc = campWing(C, 'escort').length, al = campAliens(C).length, cv = campConvoys(C).map(u => campConvoyName(u));
  return 'Campaign level ' + C.level + ', ' + L.name + '. Goal: ' + campObjective(C) + ' Carrier hull ' + Math.round(c.hp) + ' of ' + Math.round(c.maxHp) + ', shield ' + Math.round(C.shield) + ' of ' + CAMP.carrier.shield + '. Ore in the store: ' + Math.floor(C.ore) + ' of ' + CAMP.ore.cap + (C.build.queue.length ? ', building ' + C.build.queue.length + ' ship' + (C.build.queue.length === 1 ? '' : 's') : '') + '.'
    + (C.earth ? ' Earth shield ' + Math.round(C.earth.shield / C.earth.max * 100) + ' percent.' : '') + ' In the bay: ' + C.bay.fighters + ' fighters, ' + C.bay.escorts + ' escorts. Out: '
    + out + ' fighters, ' + esc + ' escorts. Missiles in the magazine: ' + C.missiles + ' of ' + CAMP.missile.magazine + ' (F fires one at the mothership or the nearest big ship). Aliens alive: ' + al + '.' + (L.convoys.length ? ' Convoys flying: ' + cv.join(', ') + (cv.length ? '' : 'none') + '.' : '')
    + (L.win === 'mother' ? (m ? ' The alien mothership is ' + Math.round(campDist(m, c) / 10) + ' km away.' : ' The mothership has not come yet.') : '');
}
