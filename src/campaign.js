// ---------- Campaign: Earth's fleet against the aliens (docs/CAMPAIGN.md, card space-game-campaign-mvp) ----------
// The whole mode in plain numbers, no Phaser: the tuning table, the ships, the waves, the five orders, win and lose, the tech pick and its save.
// src/campaignscene.js reads the keys, calls campStep(C, seconds) and draws what C says; tests/campaign.mjs flies whole battles of it in Node.
//   campNew(level, techs, opts)      a fresh game of one level: C. opts.seed makes the alien flying repeat exactly (tests); opts.god: the carrier cannot die;
//                                    opts.via: how the level was started ('menu', 'address', 'next', 'retry', 'skip', 'hub': Launch in the ready room, src/camphubscene.js): kept on C, and read by the play log
//   campStep(C, seconds)             the game moves on (cut into CAMP.step pieces); C.events gets what the scene should show, and the scene empties it
//   campOrder(C, name, arg, how)     one of the five orders: launch, attack, escort, guard, recall -> { ok, code, say }; how: 'key', 'strip', 'voice' or 'click' (the play log's)
//   campCheck(C, name, arg)          the same answer and nothing done (the ship computer checks, announces, then orders)
//   campIntent(text)                 plain words -> { act: 'fleet_attack', arg } or null (the ship computer calls it; src/shipcomputer.js)
//   campTechChoices(level)           the three techs offered after that level;  campPick(P, id): the pick, kept in P
//   campProgressLoad() / campProgressSave(P)   { level, techs } in localStorage under CAMP.store, apart from the Long Haul save
//   campStory(level, 'before' | 'after', revealed)  the plain lines of the story, from content/text/ui.md (keys camp.l<level>.<before|after>.<n>; after the ending has been seen, .r. lines where a level has them)
// C: { level, t (ms), ships, bullets, events, input, earth, bay, techs, carrier, result ('won' | 'lost' | null), why, delivered, lost, kills, ... }
// A ship: { id, kind, team ('earth' | 'alien'), x, y, vx, vy, rot, hp, maxHp, r, vmax, accel, turn, def, order }  (the alien ones are src/enemies.js PIRATES)
// The aliens fly with the game's own pirateSteer (circle, pass, break, run), so a fight here moves like a fight in Long Haul.
//
// ---------- THE TUNING TABLE: every number you will want to change is here, in this one table, one line each ----------
// Units: px, seconds for the times written in a level (at, early), milliseconds for a delay or a cooldown, px/s for a speed, rad/s for a turn.
const CAMP = {
  store: 'longhaul.campaign',              // the localStorage key of the campaign progress (the level reached and the techs picked)
  step: 1 / 30,                            // s: the longest step the sim takes at once (a longer frame is cut into steps)
  time: {                                  // the clock of the missions' scripts (card space-game-tuning-panel)
    waves: 1                               // times every `at` and `early` second of a wave row: 0.5 brings every timed wave in twice as soon, 2 holds each back twice as long (a wave that waits for a place or an event, `on`, is not timed)
  },
  flags: {                                 // THE SWITCHES (card space-game-tuning-panel; the tuning panel's ON and OFF rows, src/camptune.js): each is a whole system, and false takes it out as if it were not in the mission. Systems read them through campFlag
    distress: true,                        // the distress call of mission 1.1 (beat 2, src/campbeats.js): off, the pirates never fall on the miner and the miner gives no thanks
    tboats: true,                          // the enemy torpedo boats (src/camptorpedo.js): off, none is ever made
    rival: true,                           // the rival ship, the pirate leader (src/camprival.js): off, it never comes (and its bonus cannot be met)
    repair: true,                          // a hurt fighter flies home to be mended (src/camprepair.js): off, it fights on
    convoyorders: true,                    // Tuck in, Run for it, Hold here, Carry on (src/campconvoy.js): off, the escorted ships fly their own way and the Convoy part is not in the list
    autofire: false,                       // true: the turrets fire by themselves at what is in reach (Space is not needed); false: they fire only while Space is held
    laser: true,                           // the turrets' charge (CAMP.tank): off, a shot costs nothing and the tank is always full
    hints: true,                           // the first-minute hints and the beats' tips (src/campnudge.js, src/campbeats.js): off, none shows
    pagehud: true,                         // the page HUD (card space-game-page-hud, src/camppagehud.js): the flight HUD as page elements over the canvas, in the look of the agent board. ON for every player since card space-game-page-hud-default-on (Troy, 25 Nov 2026: "no need to switch back"): no row of the N panel, nothing remembered. The canvas HUD is still in the code, for the tests and a comparison only: the address ?pagehud=0 (or this flag set false by a test) draws it; undo point: the tag pagehud-default-before
    pagedigit: true,                       // the page HUD's rings (card space-game-page-hud-3; Troy, 25 Nov 2026: the DIGIT inside the ring, for the pilots and the ships you protect, and the name under the ring only while its list is open): true; false puts the initial inside the ring and "1 Wedge" under it (a row of the N panel)
    shiplook: true,                        // the new ship look, the flat cut (card space-game-ship-look-default-on; Troy played it on 25 Nov 2026: "no switch back"; the mock is docs/ship-look-mock.html, the table src/shiplook.js). ON for every player: no row of the N panel, nothing is remembered. ?shiplook=0 draws today's pictures (the tests' and the comparison's way, not shown to a player; the old drawing code stays for now)
    worldlook: true,                       // the new world look, direction 1, flat discs (card space-game-world-w1-backdrop, the first of its pieces; Troy approved it on 25 Nov 2026; the mock is docs/world-look-mock.html, the switch src/campworldlook.js): the backdrop (W1), then the planets, stations, mission objects and the shield hit as each piece lands. ON for every player: no row of the N panel, nothing is remembered. ?worldlook=0 draws today's world (the tests' and the comparison's way). The Campaign only: the Long Haul's pictures are never changed
    screens: false                         // the new screens around the flight (card space-game-screens-f-foundation; the mock is docs/screens-mock.html, the shared pieces src/screens.js, src/scrhost.js, src/screens.css). OFF for now: landing F changes no screen, and the pieces after it each draw one screen new only while this is on. Settings > CONTENT has the row (scrSet: kept in this browser), ?screens=1 or 0 in the address wins either way (the tests' way)
  },
  size: {                                  // how big your ships are: the one place for it (card space-game-campaign-look: another 30 percent smaller than the 140 x 100, 31 x 23 and 40 x 29 px they were drawn at). len: the drawn length in px (the scene scales the picture to it); hit: the hit circle's radius in px, about half of len over two, as it always was
    carrier: { len: 98, hit: 25 },         // it was 140 and 36
    fighter: { len: 22, hit: 6 },          // it was 31 and 8
    skiff: { len: 28, hit: 9 }, cutter: { len: 34, hit: 12 }, brute: { len: 46, hit: 17 }, // the pirates (card space-game-l1-pirates-traffic): about the hit circles of the raider, the drone and the gunship they fly like (10, 14, 19), a little smaller
    pirateleader: { len: 98, hit: 25 },    // a rival ship (card space-game-rival-duel): the cruiser's own size
    patrol: { len: 38, hit: 12 }, miner: { len: 36, hit: 14 },                         // the neutral ships
    tboat: { len: 44, hit: 16 }, lancer: { len: 44, hit: 16 }                          // the torpedo boats (card space-game-torpedo-boats): the pirates' and the aliens'
  },
  carrier: {
    hull: 600,                             // hit points of the flagship; zero and the level is lost
    speed: 210,                            // px/s, top speed: big, slow, heavy
    accel: 170,                            // px/s per s of thrust (W)
    turn: 1.1,                             // rad/s the nose turns (A, D)
    drag: 0.55,                            // velocity kept after one second with no thrust (0.55 is the Wren's)
    brakeDrag: 0.12,                       // the same with S held
    mounts: [[30, -7], [30, 7], [2, -20], [2, 20], [-6, -20], [-6, 20], [-22, -20], [-22, 20]], // the turrets (there is no other gun): where each sits, px from the carrier's centre in its own frame (x along the nose), spread along the hull; the number of turrets is the number of rows // the two at the front sat at x 10 until card space-game-ship-look-default-on: the flat-cut hull is only 11 px wide forward of x 5, so they are at x 2, back on the pods (the bots' 32-seed table of missions 1.1 to 1.3, old numbers against these, is in docs/CAMPAIGN-TUNING.md)
    pd: 4,                                 // hit points one turret shot takes off an alien
    pdDelay: 700,                          // ms between the shots of one turret (eight of them: 46 hit points a second in all): they fire only while Space is held, each at the nearest alien in its reach, and never on their own
    pdRange: 500,                          // px a turret reaches (to the edge of the alien it aims at: about three and a half carrier lengths)
    pdSpeed: 800,                          // px/s of a turret shot
    lead: 1,                               // how far ahead a turret aims: 1 is where its shot and the alien meet (the alien's speed, the shot's, the carrier's drift), 0 is where the alien is now
    stagger: 1,                            // 1: each turret fires on a slot of its own, offset from the next by pdDelay over the number of turrets, so the fire is continuous; 0: all eight on the same beat (a volley, as it was)
    jitter: 12,                            // ms: how far a turret's slot is moved at random (a stream of its own), so the rattle is not a metronome; keep it under half of pdDelay over the number of turrets (44 ms)
    shield: 150                            // points of shield: they take damage before the hull and mend by themselves, at a rate the shield pips set (CAMP.power.shields.regen; card space-game-shield-auto: the ore recharge is gone)
  },
  power: {                                 // ship systems (card space-game-campaign-systems; docs/CAMPAIGN.md "Ship systems"): power to weapons, shields and engines, like X-Wing
    on: false,                             // THE SWITCH (card space-game-power-removed; Troy, 23 Nov 2026: "he never uses it"): false: the pilot cannot move a pip (no list, no J K L, no words: 'power' and 'balance' are refused) and every system runs at the balanced start below, saved settings ignored; true: the old power management, as it was, for the tests and for a mod. The factors below are 1 at 2 pips, so the shield is 150 and mends 3 a second after 3 s unhit, the turrets and the missile launcher and the engines at the table's own numbers
    budget: 6, max: 4, start: [2, 2, 2],   // the pips to share, the most in one system, and the default: weapons, shields, engines. Every factor is 1 at 2 pips (the shield mends at its base rate there)
    weapons: { delay: [1.6, 1.3, 1, 0.8, 0.65],   // x the turrets' pdDelay, by pips 0 to 4
               reload: [1.6, 1.3, 1, 0.75, 0.55] }, // x the missile reload
    shields: { cap: [0.5, 0.75, 1, 1.25, 1.5],    // x the carrier's shield points
               regen: [0, 1.5, 3, 6, 10],         // points a second the shield mends by itself, by pips 0 to 4 (none at 0, slow at 2, fast at 4: 10 a second of its 225), once regenDelay ms have passed with no hit (card space-game-shield-auto)
               regenDelay: 3000 },                 // ms with no hit before the shield starts to mend
    engines: { speed: [0.75, 0.88, 1, 1.12, 1.25],  // x the top speed (the Fast burn's too: it is this times CAMP.nav.fast)
               accel: [0.7, 0.85, 1, 1.15, 1.3],    // x the thrust
               turn: [0.8, 0.9, 1, 1.1, 1.2],       // x how fast the nose turns
               blink: [1.5, 1.25, 1, 0.8, 0.6] },   // x the warp blink's recharge
    low: { shield: 0.3, rearm: 0.6, engines: 1 }           // the computer says so when the shield is under 30 percent of its cap (and again after it has been over 60), or when the engines are set to 1 pip or less
  },
  emergency: {                             // EMERGENCY SHIELDS (card space-game-keys2-cruiser; Troy, 23 Nov 2026): a row of the cruiser list (S) that fills the shield at once. ORCH's numbers, both on the N panel (the `ship` group)
    ore: 50,                               // the ore it costs, paid from the store as a mend is (src/campmend.js campEmergency)
    cooldown: 20000                        // ms before it can be given again, counted from the order
  },
  ore: {                                   // ore: asteroid rocks and the wrecks of dead aliens; spent on new ships and the hull's mend (docs/CAMPAIGN.md, Ore)
    start: 30,                             // ore in the store at the start of a level
    cap: 500,                              // most ore the carrier's store holds (200 until card space-game-ore-bay-bigger: Troy hit it; a rim field holds 400 and a market pays 3 cash an ore, so a full bay sells for 1,500)
    fullAt: 0.9,                           // the computer says "Ore bay full." once when the store fills, and again after it has been under this share of the cap
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
  mend: {                                  // repair in space with ore (card space-game-repair-with-ore, src/campmend.js; Troy, 22 Nov 2026: nothing builds ships any more, ore mends them)
    hullOre: 60,                           // ore for mending the whole hull from nothing (the dock's old price); a part costs its share
    min: 5,                                // the least a mend costs, a scratch included
    hullSecs: 8,                           // s a whole hull takes to mend (a part takes its share); the ore is paid when the order is given
    wardPoint: 0.1,                        // ore a hit point of a ship you protect (a transport, a hauler, a miner): half of a freighter's 200 is 10 ore
    wardSecs: 6,                           // s a whole hull of a ship you protect takes to mend
    range: 700,                            // px: the cruiser mends a ship you protect only when it is this near (a ship tucked in beside it always is)
    dockShare: 0.5                         // docked at an outpost the hull is mended at once for this share of the price
  },
  ranks: [                                 // the ranks (card space-game-campaign-ranks, src/campranks.js): the best scores of the missions flown, added up, are the points; a rank is held from `at` points; its extras are added to the bay. Card space-game-cut-escorts (Troy, 22 Nov 2026): the escort ship is gone, so a rank gives the same number of fighters in all that it gave in ships (fighters + escorts)
    { id: 'cadet', at: 0, fighters: 0 },           // the start: the wing of the bay, no more
    { id: 'ensign', at: 1000, fighters: 1 },        // one good mission (1,000 for the objectives)
    { id: 'lieutenant', at: 3500, fighters: 3 },    // about three missions at a good score (it was 2 fighters and 1 escort)
    { id: 'commander', at: 6500, fighters: 4 },     // about five (3 and 1)
    { id: 'captain', at: 10000, fighters: 6 },      // about seven: late in the second level (4 and 2)
    { id: 'commodore', at: 14000, fighters: 8 }     // the nine missions flown well (a mission is worth 1,000 to 1,900) (5 and 3)
  ],
  beamHum: {                               // the hum of a beam (card space-game-campaign-sounds): what src/audio.js beamHum is told
    rise: 2,                               // s of unbroken fire (Beam turrets tech, Space held, a turret on a target) until the hum has climbed all the way
    laserLevel: 0.8,                       // how loud the hum of a mining laser is (the same hum on any rock), against the beam turrets' 1
    alienLaser: 0                          // 1: a plain turret shot at an alien (a kind 'alien' beam in C.lasers) hums too, over its pew; 0: it keeps its pew only, and the hum is for rocks and the Beam turrets
  },
  missile: {                               // the missile launcher (F, or the order "missiles"): a homing missile for the mothership and the other big ships (card space-game-campaign-missiles)
    magazine: 6,                           // missiles you start with, and the full rack: the most R can queue is the empty slots of it
    max: 12,                               // the most the magazine can ever hold (C.missiles, a plain number: the ore code adds to it with campMissileAdd)
    reload: 10000,                         // ms a missile takes to BUILD (15000 until card space-game-missile-build-10s, Troy, 24 Nov 2026; the N panel's row Missile build time moves it; card space-game-missiles-cost-ore: the magazine no longer fills itself, src/campmissilebuild.js)
    cost: 20,                              // ore a missile costs to build, paid when its build starts (card space-game-missiles-cost-ore; Troy, 24 Nov 2026). The ship builds ONE by itself only at 0 missiles, each press of R queues one (card space-game-missile-queue); 0 makes them free again
    delay: 700,                            // ms between two launches (the launcher cycles)
    lock: 2400,                            // px: a big ship this close to the carrier can be locked (the mothership first, else the nearest tower or gunship)
    bigKinds: ['mother', 'tower', 'gunship', 'pirateleader'], // the ships that count as big: the missile aims at them, its fuze goes off on them, they take `big`
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
    fighters: 3,                           // fighters in the bay at the start: THREE PILOTS, one for each squad (card space-game-three-pilots, Troy, 23 Nov 2026; CAMP.pilots). It was eight fighters in three squads of 3, 3 and 2: the pilot of a squad is as strong as the squad was (CAMP.pilotStrength)
    startOut: true,                        // true: the pilots are out beside the cruiser when a mission begins (card space-game-keys-orders; Troy, 23 Nov 2026); false: they start in the bay and leave on an order, as before (the node suites about the bay, and the launch queue, set it)
    launchEvery: 600,                      // ms between ships leaving the bay once Launch is ordered
    mouth: [9, 20],                        // px from the carrier's centre (x along the nose, y to the side): where a launched ship appears, one side and then the other: just in front of the launch tube of a hangar pod (CAMP_ART.cruiser.launch) // (was (21, 19.5) until card space-game-ship-look-default-on: the flat-cut hull is narrow forward of x 5, so a launched ship appears 3 px in front of the pod's front face, level with the launch tube)
    dockAt: 63                             // px: a recalled ship this close to the carrier lands (and is whole again when next launched)
  },
  pilots: [                                // THE THREE PILOTS (card space-game-three-pilots; Troy, 23 Nov 2026: "one fighter replaces each squad: Wedge (red, the leader), Kara (green), Apollo (yellow)"; src/campwing.js campPilots). A pilot is one fighter that flies for a squad: its ship has u.pilot (the id here) and u.squad, and the squad's group ('red', 'green', 'yellow') is that one ship. The order is the order the squads fill
    { id: 'wedge', name: 'Wedge', squad: 'red', lead: true },   // the name alone is shown (card space-game-page-hud-2, Troy, 25 Nov 2026: no Red 1, Red 2, Red 3 anywhere; the squads keep their colours); a `call` field, if a pilot has one, is still shown before the name (src/camptarget.js campSelLabel)
    { id: 'kara', name: 'Kara', squad: 'green' },
    { id: 'apollo', name: 'Apollo', squad: 'yellow' }
  ],
  pilotStrength: 8,                        // the wing's strength at the start, in fighters' worth: Wedge 3, Kara 3 and Apollo 2, the sizes of the squads they replace. A pilot's hull and gun are a lone fighter's times its share (campPilotStrengths). What a rank, the bay2 tech or the Earth refit used to add as fighters is added to this, one at a time to the pilot who has the least (Wedge first on a tie), so the wing stays three ships
  route: {                                 // the fork in an escort's road (card space-game-scout-route; src/camproute.js, docs/CAMPAIGN.md "Scouting the route"). DORMANT since card space-game-cut-lane-fork (Troy, 22 Nov 2026: "remove picking a lane"): no mission row has a `route` now; a row that writes one still gets a fork
    wait: 45,                              // s a convoy holds at the fork for the player's word when the mission's route says nothing; then it takes the route's default lane
    reach: 70,                             // px: a convoy is at a waypoint (the fork, a lane's middle, the join) when it is this near it
    panic: 1400                            // px: a convoy holding at the fork does not sit still with an enemy this close: she takes the default lane at once
  },
  repair: {                                // a hurt fighter lands to be mended (card space-game-fighter-repair; src/camprepair.js, docs/CAMPAIGN.md "Repair"): the wing's fighters only, the enemy's never do
    kinds: ['fighter'],                    // who breaks off
    below: 0.25,                           // the share of its hull under which a fighter breaks off and flies home (card space-game-keys2-orders: a badly hurt pilot returns by itself; both numbers are on the N panel)
    within: 15,                            // s of flight (the way home over its top speed): a cruiser farther off than this and the fighter fights on
    time: 20,                              // s a landed fighter is mended, then it is whole again and goes out by itself (keys2-orders: there is no Launch and no recall)
    ore: 0,                                // ore a mend costs (card space-game-repair-with-ore made it 5; keys2-orders: a pilot's return is free, the tuning panel can put a price back); with none to pay it takes `slow` times as long only when a price is set
    slow: 2,                               // times as long a mend takes when there is no ore for it (never refused)
    sayEvery: 5                            // s between two radio lines of the same kind (four fighters hurt together are one call)
  },
  tdisp: {                                 // the target display, in the corner the radar had (card space-game-target-display; Troy, 22 Nov 2026: "the bottom right mini map can go away, to make way to show the target selected"; src/camptdisp.js, src/camptdispscene.js)
    right: 18,                             // px from the right edge of the screen to the box
    beside: 12,                            // px between an open list and a display's box when the box steps out of its way (right of a left list for the FLEET corner, left of a right list for the target box; card space-game-w-list-covers-friend-box)
    line: 26,                              // px: the order-key line at the foot of the target box ("E  Attack" for an enemy, "E  Guard" for a friendly, lit or grey; cards space-game-keys-panels, space-game-keys2-panels): it is this much taller than the who box
    bottom: 64,                            // px from the bottom edge to the box (the key line's strip is under it)
    w: 320, h: 200,                        // px: the box (its width is the corner panel's, CAMP.corner.w; the target corners' room), about the radar's height
    every: 250,                            // ms between two readings of the ship: the numbers and the words are live four times a second (a new ship is read at once)
    pic: 76,                               // px: the picture's frame; the ship is drawn to fit it
    bar: { w: 86, h: 8 },                  // px: the hull bar and the shield bar
    color: { hostile: 0xff4d6d, friend: 0x7fe9ff }, // the frame: a hostile's red (the target's bracket), the cyan of a ship of yours or a neutral you are picking
    ink: { hostile: '#ff9aae', friend: '#9fe9ff' },  // the name and the line of what it is doing
    depth: 64                              // the draw order: over the edge arrows (62), under the lists (160)
  },
  sayhold: { ms: 5000, queue: 3, keep: ['camp.say.distress', 'camp.say.miner.short', 'camp.say.miner.all', 'camp.say.miner.bait', 'camp.say.stray', 'camp.say.l13.turrets', 'camp.say.l13.behind'] }, // the radio lines that stay up (card space-game-price-line-held): the miner's call, the price of answering it, the stray ship's warning stay for ms, and the lines that come in that time wait (at most queue) instead of replacing them. src/campsayhold.js
  l13: { turretsWait: 3, gapFar: 1100, gapGrace: 4, gapAgain: 25 },   // mission 1.3's two radio lines (card space-game-13-radio-lines, src/camp13lines.js): s after the first raid comes that the radio says to hold the turrets key; px the last hauler may be behind the next one (the haulers leave 12 s apart at 62 px/s: 744 px) before the radio says so, s of it before the first warning, s between two warnings
  card: { lock: 400 },                     // ms: after a card closes (the story, the briefing, a result, the pause) the missile key and a click on a ship do nothing for this long, and so does the first part of a new battle: the Enter that closed the card is not also a missile (card space-game-enter-card-fires-missile; missiles cost ore now). campPanelHold, src/camppanel.js
  corner: {                                // the four corner panels (card space-game-layout-fleet; Troy, 24 Nov 2026: "four corners, each a small title that never leaves, starting with its keys as plain key-cap chips; the details under a title open when its keys are used and fade after a few seconds; the current selection is written beside the title and never fades"): top left Q CRUISER, bottom left Q W FLEET, top right [ ] HOSTILES, bottom right O P FRIENDLIES. src/campcorner.js (the rule and the registry), src/campcornerscene.js (the drawing)
    edge: 18,                              // px: THE margin: from the screen's left and right edges to the corners' frames (the right ones end this far from the right edge: at.tr.x and at.br.x are W - edge - w), and where the glyphs of the bottom left texts start (the key line, the MISSILES count, the radio: x = edge - ink); card space-game-layout-align, Troy, 24 Nov 2026: the left corners and the bottom key strip shared no left edge
    ink: 2,                                // px: a text with a 3 or 4 px stroke draws its first letter this far right of its x (half the stroke and the letter's side)
    w: 320,                                // px: a panel's width (its title row and its details): room for the FLEET line (Q All pilots  W Guard Transport) and for FRIENDLIES and a name beside it (card space-game-fleet-sentence; it was 260, and 200 before card space-game-layout-align)
    depth: 64,                             // the draw order: over the edge arrows (62), under the lists (160)
    show: 4000,                            // ms the details stay open at full strength after the corner's keys are used (or campCornerOpen is called), then they fade
    hit: 4000,                             // ms they stay open after the corner says it was hit (FLEET: a pilot's hull went down)
    fade: 600,                             // ms the details take to fade out
    title: { h: 26, chipW: 22, chipH: 18, chipGap: 3, pad: 8, gap: 8, chips: 1 }, // the title row: its height, a key-cap chip's size and the space between two, the space at the left, and between the chips, the title and the selection; chips: the chip column is this many chips wide in EVERY corner (one each since card space-game-keys4-titles: S, Q, [ and ]), so every title starts at the same x
    gap: 4, pad: 8,                        // px between the title row and its details, and inside the details' frame
    radio: 70,                             // px from the screen's bottom to the bottom edge of the pilots' radio line (src/campchatter.js chatterSpot): the bottom left is the radio line's and the key line's now, above the key line (card space-game-keys5-corners)
    split: 114,                            // px: the row at 78 is two corners side by side (card space-game-keys6-layout): Q CRUISER in the first `split` px of the frame, and W with the pilots in the rest (less `splitGap`)
    splitGap: 4,                           // px between the two halves of that row
    stack: 6,                              // px between a title row and the one under it in the same stack (the left: Q CRUISER then W FLEET; the right: ] HOSTILES then [ FRIENDLIES); at.bl.y and at.br.y are the first row's y + its height + this
    item: { bar: 46, text: 20, key: 26, pic: 80 },  // px: the height of a detail line by its kind: a name with a number and a bar, a line of text, a key chip and its word, a picture row (src/camptcornerscene.js: the ship's picture, its type and its distance)
    bar: { dy: 22, h: 9 },                 // px: a bar's top below its item's top, and its height
    chip: 0x7fe9ff,                        // the key-cap chips' fill (the friend's cyan, as the order key's)
    at: {                                  // where each corner's title row sits (x: its left edge; y: the edge of the row at the screen's edge side, the bottom edge for a bottom corner; dir: 1 the details open downward, -1 upward). Left and right are what you command and everything else
      tl: { x: 18, y: 78, dir: 1 },        // Q CRUISER (card space-game-layout-cruiser; the key was S until card space-game-keys5-qwe): under its status (the SHIELD and HULL bars, src/campcruiserhud.js: they end 4 px above this row), at the top of the screen; the S list opens under the row. 78 since card space-game-missiles-cost-ore (it was 62: the fourth line)
      bl: { x: 18, y: 110, dir: 1 },       // E FRIENDLIES (card space-game-keys6-layout; Troy, 24 Nov 2026: the left corner is the bars, then Q CRUISER and W with the pilots on ONE row, then E FRIENDLIES): the second row of the left stack, under the row at 78 (78 + 26 + stack 6). Its details open downward; while the Q list or W's details above it are open this row slides down by their height (src/campcornerscene.js) and back when they fade
      tr: { x: 942, y: 78, dir: 1 }       // ] HOSTILES: its title row level with Q CRUISER's (it was 88 px lower: card space-game-layout-align); x is W - edge - w, the left margin mirrored; over it the ORE and MISSILES block (src/campcruiserhud.js, card space-game-ore-missiles-topright), ending 4 px above this row
    }
  },
  mark: {                                  // the squares come and go (cards space-game-pilot-squares-fade; Troy, 24 Nov 2026: "have the reticle squares disappear from the pilots after a few seconds", and the same for the selected targets; src/camptarget.js campMarkNow, src/camptargetdraw.js): the squares on the pilots WHO is show when WHO is picked, an order is given or the mission begins; the square on the target held (the enemy's or the friend's) shows when it is picked, and an order shows both; then they go
    show: 3000,                            // ms (the game's own clock, so a pause does not eat it) a square stays at full strength after it was brought back
    fade: 600,                             // ms it then takes to fade out (the target stays held and the corners' rows stay)
    verbs: ['launch', 'attack', 'escort', 'guard', 'recall', 'mine']   // the counters of C.orders that are the pilots' orders and bring both squares back (a missile, a power change and the convoy's orders do not)
  },
  peek: {                                  // a pick that is off the screen glides the camera to it, holds, and glides back by itself (card space-game-pick-peek; Troy, 24 Nov 2026; src/campselzoom.js). All three are on the N panel (the `time` group)
    hold: 1500,                            // ms the camera stays on the picked ship once it is there
    glide: 400,                            // ms each way: out to the ship and back to the cruiser (eased, by time, so the same at any frame rate)
    zoom: 0.8,                             // the zoom a peek needs at least, so the ship is readable (a player already zoomed in farther keeps his); the zoom he had is given back after
    view: { left: 40, right: 40, top: 90, bottom: 80 } // px of the screen's edge a pick must be inside to count as ON the screen: clear of the edge, the status block above and the key line below
  },
  click: {                                 // the mouse on the flight view (card space-game-click-target; src/campclick.js)
    hit: 28                                // px on the SCREEN: the radius of the circle a click hits around a ship (a ship's own radius is never smaller), so it grows in the world as the view zooms out and a small far ship can be hit
  },
  target: {                                // the hostiles' key (card space-game-keys4-onekey; src/camptarget.js campTgtCycle)
    restart: 2000                          // ms (the game's own clock) with no press of ] or \ after which the next ] starts again from the nearest hostile; a press within it steps on to the next one
  },
  charge: {                                // the health bar on every ship you protect (cards space-game-protected-health and space-game-health-bar-quiet; Troy, 22 Nov 2026: bars on the transport, the haulers and the miners, a thin line until the ship is under attack; src/campcharge.js, src/campchargescene.js)
    amber: 0.6,                            // the hull share at or under which the bar turns from green to amber
    red: 0.3,                              // the hull share at or under which the bar turns red (a ship that is nearly lost)
    flash: 700,                            // ms a bar flashes white after its ship is hit (the hit's own tick; a ship tucked under the cruiser's shield takes the hit on the cruiser's, so its bar does not flash)
    color: { green: 0x6dff9c, amber: 0xffb454, red: 0xff4d6d }, // the bar's fill: the wing's mint green, the convoy's amber, the aliens' red (the map's own colours)
    loud: 4000,                            // ms the FULL bar (with its percentage) stays after the last hit: under attack and for this long after; with no hit, or this long after the last one, the bar is a thin line
    ease: 500,                             // ms the full bar then takes to shrink back to the thin line (a short ease, not a pop); a new hit makes it full again at once
    line: { h: 2, back: 0.3 },             // the THIN LINE (px on the screen, the same at every zoom): its height, and how faint the track is behind it that shows how much hull is gone (its length is the hull that is left, in the band's colour, no number)
    bar: { w: 38, h: 5, gap: 5, min: 14, back: 0.85 }, // px ON THE SCREEN, the same at every zoom: the full bar's width (the thin line's length too) and height, its distance over the ship's edge, the least the ship's half size counts for (a ship drawn at its minimum size, src/campzoom.js, is 10 px across), and how dark the frame behind the full bar is
    number: { font: 11, gap: 5, edge: 4 }, // the percentage at the right of the full bar: its size (px), its distance from the bar's end and the least it keeps from the screen's edge (card space-game-edge-percent-label-cut: it goes to the left of the bar when the right is cut off, and is not drawn at all when neither side fits or the ship is off the screen)
    mark: { w: 16, h: 3, gap: 5, line: 1 }, // px: the bar over a ship's mark on the Tab map (width, the full bar's height, distance over the mark; line: the thin line's height; no number on the map)
    list: { w: 46, h: 6 },                 // px: the bar at the right of a ship's row in an order's sub-list
    depth: 6                               // the flight view's draw order: over the ships (4 and 5), under the HUD
  },
  sensor: {                                // the carrier's sensors (card space-game-see-hostiles-earlier; Troy, 22 Nov 2026: "see hostiles earlier so I can send squads to meet them"; src/campsight.js)
    range: 9000,                           // px from the carrier: a hostile this near is SEEN: on the map, in the nav list and the target keys (A D S), in an edge arrow and in the radio's first call. 9000 is 21 s of the fastest raider's flight (430 px/s), 35 s of a drone's (260); a fighter that is out sees from its own circle too (`wing`)
    always: ['mother', 'tower'],           // the kinds that are always seen: the mothership and the towers are the mission's own marks, as they were before the sensors had a range
    group: 900,                            // px: hostiles this near each other are one group (one edge arrow, one radio call)
    delay: 2000,                           // ms from the first sight to the radio call: the wave's own line ("Wave 2 incoming.") is said first
    wing: 2600,                            // px: the sensor circle round each fighter that is out (the scouts' circle, now every fighter's: card space-game-cut-escorts): a hostile inside it is SEEN as one near the carrier is, and a cloaked anomaly inside it is noticed (src/campsight.js, src/campanomaly.js)
    idNear: 2600,                          // px: a fighter of yours this near a group, or the carrier itself this near it, tells what kind they are: the call names the kinds; with none near it says only how many
    mark: 6000,                            // ms a group that was just seen is marked: its edge arrow blinks
    arrows: 4,                             // the most edge arrows at once (the groups nearest the carrier first)
    friends: 2,                            // the most amber edge arrows at once for ships you protect that are in trouble and off the screen (the nearest first; card space-game-target-display: the radar is gone)
    sayEvery: 4                            // s between two calls (groups that come into sight in the same few seconds are one call)
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
    hold: 240,                             // px: the ring it circles an alien at (pirateSteer's hold)
    beside: 150                            // px: how far from its convoy a fighter on the Escort order keeps station (it was the escort ship's)
  },
  wing: {                                  // the wing's groups, verbs and targets (card space-game-campaign-wing-targets; src/campwing.js): campWingOrder(C, group, verb, target, how)
    groups: {                              // three built-in groups, as data (a list of kinds, or of ship ids): numbered groups drop in later as C.groups[id] = { name, ships: [ids] }
      fighters: { name: 'Fighters', kinds: ['fighter'] },
      all: { name: 'All ships', kinds: ['fighter'] },                // the same ships as Fighters now (card space-game-cut-escorts: there is no escort ship)
      red: { name: 'Wedge', kinds: ['fighter'], squad: 'red' },       // the fighters' three squads (card space-game-fighter-squads; Troy, 22 Nov 2026): a squad is the fighters whose u.squad is its id
      green: { name: 'Kara', kinds: ['fighter'], squad: 'green' },
      yellow: { name: 'Apollo', kinds: ['fighter'], squad: 'yellow' }
    },
    squads: ['red', 'green', 'yellow'],    // the squads in the order they fill: a fighter that leaves the bay joins the one with the fewest ships out (a tie goes to the first of these), so six are two and two and two and a seventh makes Red three; a ship lost or mended gives its place back
    squadColor: { red: 0xff5a4a, green: 0x3ee86a, yellow: 0xffd23a }, // a squad's colour: its dots on the map (src/campmapdraw.js), shown only for a squad in focus, and the picture of its fighter in the displays (src/camptdispscene.js); the ring it made in flight is gone (card space-game-friendly-display: the friend's square, src/camptargetdraw.js) (card space-game-squad-rings; the fighters themselves are all drawn alike): three hues apart, bright on the dark
    ringKeep: 8000,                        // ms: the mark (the friend's square on its fighters; it was a ring) of a squad stays on after an order was given from its list (the list closes), until another squad is in focus, X clears the target, or this long has passed (src/campwing.js campSquadsShown)
    verbs: {                               // kinds: what the verb takes as a target (enemy, friend, convoy, place, point, pickup, cache, anomaly, rock); group: who it addresses when none is named (today's orders); need: a target must be named
      attack: { kinds: ['enemy'], group: 'fighters' },
      escort: { kinds: ['friend', 'convoy'], group: 'fighters' },     // Escort the convoy: a SQUAD order (the fighters fly beside the convoy ship); there is no escort ship (card space-game-cut-escorts)
      guard: { kinds: ['place', 'point', 'friend', 'convoy', 'anomaly'], group: 'all' },     // an anomaly too: a squad that flies there is a ship in range of it, and the cloak shows (src/campanomaly.js)
      hold: { kinds: ['place', 'point'], group: 'all', need: true },                     // fly there and stay, firing at what comes into range
      fetch: { kinds: ['pickup', 'cache'], group: 'fighters' },                          // fly over it: a ship of yours takes ore and caches it touches
      mine: { kinds: ['rock', 'pickup'], group: 'all' },
      recall: { kinds: [], group: 'all' }
    },
    smart: { enemy: 'attack', friend: 'escort', convoy: 'escort', place: 'guard', point: 'guard', pickup: 'fetch', cache: 'fetch', anomaly: 'guard', rock: 'mine' }, // the verb a right-click does for a kind of target
    holdAt: 60                             // px: a ship ordered to hold at a point is there when it is this near it, and stops
  },
  dog: {                                   // DOGFIGHTS (card space-game-fighter-dogfights; src/campdogfight.js): how the fighters (the wing's, and the aliens' raiders) fly a duel, as the Vipers do: the engine pushes along the nose, so a ship turns to where it means to go, swoops past, breaks, comes round again, and flips to fire back at one on its tail
    kinds: ['fighter', 'raider'],          // who flies it (and the pirates whose base is the raider: the skiff): they fight one another this way; against a drone, a gunship, an escort, the mothership or Earth they keep the pirates' own circle and pass
    retro: 0.45, side: 0.35,               // the share of its accel a ship has backwards and sideways (the nose is where the big engine points): to brake or to turn it has to bring the nose round first
    drag: 0.62,                            // the share of its speed a dogfighter keeps after a second (the game's own is 0.5): it carries some of it round a turn and drifts through a flip
    snap: 1.7,                             // times the table's turn rate while the nose comes round for a break, a flip or a jink
    hold: 330,                             // px: the gun range a ship tries to keep to its target (it slows to this on the way in, and follows a target that runs)
    pass: 150,                             // px/s: the least closing speed it flies in at: it drives in for a pass, it does not stop at the gun range
    cone: 0.6,                             // rad: the nose stays on the lead point while the push it wants is within this of it; further round, the nose goes to the push
    near: 120,                             // px: this close it is past, and breaks away
    far: 1100,                             // px: farther than this it just flies in, burning
    lead: { fighter: 0.8, raider: 0.55 },  // how much of the lead (where the target will be when the shot gets there) the ship aims with: 1 is the exact lead, 0 aims where the target is
    breakOff: { angle: 1.9, time: [0.5, 0.9], to: 330 }, // the break after a pass: rad off the line to the target, how long (s), and how far (px) it must be before it comes round again
    flip: { off: 2.2, range: 420, time: [0.9, 1.5], every: 4.5 }, // the flip and burn: when the target is this far (rad) off the nose, i.e. behind, and within range px, the ship turns on the spot and brakes with the main engine, firing as it comes round; for time s, at most once in every s
    jink: { aspect: 0.32, range: 520, rate: { fighter: 2, raider: 0.8 }, time: [0.45, 0.85], every: { fighter: 1.2, raider: 2.5 } }, // a ship with an enemy's nose on it (within aspect rad, range px) throws itself aside: a chance of rate a second (the wing's pilots do it more than the aliens'), once in every s, for time s
    circle: { limit: 4.5, decay: 0.12, extend: [0.7, 1.1], every: 3 }, // NO CIRCLING (card space-game-fighter-flight): a fighter that has turned the line to its target round by this much (rad, one way) without a pass breaks off and EXTENDS: flies straight away from it for a time (s), then comes back in head-on; the turn it has made fades by decay of its size a second, and it extends at most once in every s
    pair: { range: 1500, keep: 2400, every: 600 } // the pairing: a fighter and a raider within range px of each other fight one on one, and the pair holds until a ship is lost or they are keep px apart; looked at every ms
  },
  flight: {                                // FLIGHTS (card space-game-fighter-flight; src/campflight.js): a squad guards or escorts in a loose formation beside and behind what it protects, not in a circle round it
    beside: 150,                           // px: how far from the edge of the thing (its radius is added) the leader of a squad flies
    anchors: [                             // where each squad's leader flies, in the protected thing's own frame (back: forward is +, so - is behind; side: right is +), as a share of that distance: red, green, yellow in the order of CAMP.wing.squads
      { back: -0.6, side: -1 },            // red: the port quarter, a little behind
      { back: -0.6, side: 1 },             // green: the starboard quarter
      { back: -1.8, side: 0 }              // yellow: astern
    ],
    gap: 60,                               // px between the ships of a flight: a wingman is this far behind and this far (times vee.side) out from the one before
    vee: { back: 0.9, side: 0.8 },         // the vee: a row of two wingmen, left and right, is gap * back behind its leader and gap * side out from him; the next pair a row farther
    reach: 700,                            // px: an alien this near what a flight guards is a threat the flight breaks off to meet (as it was)
    self: 450,                             // px: or one this near the ship itself (as it was)
    leash: 3000,                           // px: THE CHASE LEASH (card space-game-pilot-chase-leash; Troy, 24 Nov 2026: a pilot chased a pirate that had broken off 10 to 17 km from Ceres and left the miners open to the next raid). A pilot that is guarding, and is further than this from what it guards (the ship, place or point it guards, else the cruiser), breaks off a chase of any foe it picked by itself; a pilot that is attacking breaks off a chase of a RUNNER (a pirate that has broken off) the same way; an attack order on a foe that is still fighting, named or picked, is kept however far. 0 is no leash (it was none). The N panel has the row
    cover: { range: 520, aspect: 0.5 },    // a WINGMAN covers its leader: an alien within range px of the leader with its nose within aspect rad of the leader (it is shooting at him) is the wingman's foe, before the one it would have picked
    catchUp: 220,                          // px: farther than this from its slot a ship points where it is flying; nearer, its nose goes the way of what it flies beside
    rest: -Math.PI / 2                     // rad: the heading a flight takes beside a place or a point, which has no nose (north)
  },
  strafe: {                                // STRAFING RUNS (card space-game-fighter-flight; src/campflight.js campStrafe): how the wing's fighters fly at a ship that is no dogfighter (a drone, a gunship, a tower, a torpedo boat, the mothership): in on a lane beside it, firing, peel away, out wide, and in again; no ring round it
    miss: 130,                             // px: the lane passes this far (past the target's radius) beside the middle of it: a run past it, not a ram
    near: 70,                              // px (past the target's radius): this close it has passed, and peels away
    peel: [0.5, 0.8],                      // s: how long the peel lasts (the nose where it flies, off the line to the target by peelAngle), before the ship flies on out
    peelAngle: 1.0,                        // rad: the peel's angle off the line away from the target (it breaks to one side)
    wide: 560,                             // px (past the target's radius): out this far it turns and comes in again, on the other side of the line
    passed: 45,                            // px: it has passed the target when it is this much farther off than the closest it has been on the run, and it peels away (the lane goes by the target, it does not hang round it)
    inMax: 4,                              // s: a run in that has been in gun range this long without reaching the target breaks off anyway and comes in again (the clock does not run while it is still closing)
    burst: 0.5,                            // times the fighter's own delay between shots while it is on a run in: a pass is short, so the guns fire in a burst; set so that a flight deals about what the old circling dealt to a ship that fights back (a gunship: 925 a 40 s against 962; the mothership 4,003 against 4,248)
    burstBy: { drone: 0.46, tboat: 0.45 }   // the same for the kinds the old circling hurt more: a quick drone (the pirates' cutter is one) is hard to line up on a lane, and a torpedo boat dodges (the base kind of a pirate is looked up: CAMP.pirate.kinds)
  },
  convoy: {
    hp: 200,                               // hit points of a freighter
    speed: 120,                            // px/s: the same as the MULE of the escort call
    speedScale: 1                          // times the speed of every convoy a mission row makes (the transport's 54, the haulers' 62): the tuning panel's one number for them
  },
  convoyOrders: {                          // orders for the escorted ships (card space-game-convoy-orders; src/campconvoy.js; docs/CAMPAIGN.md "Convoy orders"): Tuck in, Hold here, Run for it, Carry on; the page CONVOY of the FLEET panel, the strip and the voice
    kinds: ['freighter', 'miner'],         // the ships that take them: the convoys (the transport, the haulers) and the neutral miners
    bubble: 120,                           // px: Tuck in. A ship this close to the cruiser is under its shield: a hit on it is a hit on the cruiser's shield instead (then its hull). It flies to the cruiser, and goes on along its road only while it stays inside
    run: 1.6,                              // times its own top speed: Run for it, full speed to its goal (a miner goes home), and no cover
    accel: 160,                            // px/s per s: how fast a ship under an order gains or loses speed (a held ship stops in a second or so); without an order a convoy ship goes at its speed at once, as ever
    slots: [[-46, -44], [-46, 44], [-84, -44], [-84, 44], [-122, 0], [-10, -58]] // px, in the cruiser's frame (x along its nose, y to its right): where the tucked miners lie under the shield (a convoy ship holds its road and only keeps inside the bubble)
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
    ship: { x: 0.36, y: 0.5, scale: 1.25, flame: 0.7 }, // the carrier's place across the screen; its picture's scale (the cruiser of campShipTexture is 196 px long at 1: 245 px on the screen); the size of each of its four flames
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
  tank: {                                  // the turrets' charge (card space-game-systems-gauges): every shot a turret fires, at an alien or a rock, spends `cost` of it; it mends by itself at refill[pips of the weapons] a second, so a starved weapon system runs dry and the turrets fire only as fast as it mends
    max: 100,                              // the most charge: a full tank is about nine seconds of all eight turrets at the default (they fire 11.4 shots a second)
    cost: 1,                               // charge a shot spends
    refill: [2, 5, 8, 11, 14],             // charge a second, by the weapons' pips 0 to 4 (a turret at 2 pips fires 11.4 shots a second, so the default tank runs down in about half a minute of steady fire and then the turrets fire at 8 a second)
    low: 0.2                               // the computer says so when the charge falls under this share of the tank (and again after it has been over twice this)
  },
  hud: {                                   // the HUD's places (src/camphud.js). The three round dials, the hull bar and the ore line at the top right are NOT drawn any more (card space-game-layout-hud, Troy, 24 Nov 2026: the cruiser's shield, hull and ore are written top left by src/campcruiserhud.js); their places below are what the power bars (CAMP.power.on, off in the game) still measure their bars by
    right: 8, y: 8, cell: 118, plain: 76,  // the dials' distance from the screen's right edge, their top, and the width of a cell (three of them) with the pips on (cell) or off (plain)
    r: 22, bar: { w: 10, h: 9, gap: 2 },   // the dial's radius and a power segment
    hullBar: { y: 78, h: 7 },              // the old hull bar under the shield dial: its top, relative to the cell's top, and its height (not drawn)
    ore: { y: 74 },                        // the old ore line's place (not drawn)
    text: { x: 640, y: 6, pitch: 18 },     // the lines of text at the TOP CENTRE, each centred on x (card space-game-layout-hud; they were a column at the top left): the wave, the goal, Earth's shield, the fighters being mended, the outpost hint: the first one's y, and the step to the next (a line that has nothing to say gives its place back). The mothership's name and bar and the rival's bars stand under the last of them
    plate: { w: 560, min: 40, pad: 4 },    // the dim plate under the column: its width (centred on text.x), its least height, and how far it reaches past the last line
    noWave: ['escort'],                    // the kinds of mission (C.L.kind) whose HUD has no WAVE n OF m line: in an escort the goal line says it all and a wave count tells nothing (card space-game-escort-no-wave-line; ORCH, 24 Nov 2026); the line gives its place back, so the goal stands first
    pageGap: 4,                            // px: with the page HUD on, the lines of the column that are still drawn (Earth's, the repair and the outpost line) start this far under its goal panel (card space-game-goal-panel-hides-text: the panel stood on the third line, which the wave and goal lines' empty places had pushed down to it)
    toastGap: 6                            // px: a toast starts this far under the last thing at the top centre (the column of lines, or the mothership's or the rival's bars under it), src/campaignscene.js toastTop; card space-game-toast-over-topcentre: the column ended at y 108 with Earth, repair and the outpost line showing, and a toast at 86 covered its last line
  },
  nav: {                                   // the carrier's autopilot, the map's list and picking, and the arrow at the screen edge (src/campnav.js); the rule is the Long Haul autopilot's (src/autopilot.js AUTO)
    stop: 100,                             // px: a place is flown to until the edge of it (its radius plus this) is this near
    stopShip: 450,                         // px: a ship (a convoy, the mothership, a tower) is flown to until it is this near: inside the main gun's reach
    stopPoint: 40,                         // px: a point (a cache, the relic ring, your wing) is flown to until it is this near
    stopEnemy: 400,                        // px: an alien ship (card space-game-campaign-map-targets) is followed to about turret range of it, and held there: not on top of it
    stopFriend: 130,                       // px: one of your own ships or a convoy is followed until it is alongside, this near
    stopRock: 200,                         // px: a rock is flown to until it is this near: inside the mining laser's reach (CAMP.laser.range 230) for the turrets
    leadMax: 8,                            // s: the most a moving target is led by (the carrier aims where it will be in this long at most, or in the time it takes to get there)
    stackSame: 6,                          // px: a second click this near the first is on the same stack of marks, and picks the next one in it (a second click on a lone mark flies there, as it did)
    arrive: 60,                            // px: this much past the stop distance still counts as arrived
    drop: 70,                              // px/s: under this speed, and arrived, the autopilot lets go
    floor: 40, brake: 1.2,                 // the speed limit is floor plus brake times the px left (the Long Haul autopilot's own rule), so it keeps moving to the end and brakes in time
    steer: 3,                              // turn input per radian off the line to the target (1 is full turn, so 3 is full beyond a third of a radian)
    align: 0.5,                            // rad: thrust only when the nose is within this of the line (the Long Haul autopilot's aligned)
    etaSlow: 1.1,                          // the flight time on the map is distance over the carrier's top speed times this (it speeds up and brakes)
    fast: 2.2,                             // the map's Fast button (card space-game-map-click-fly): the carrier's top speed and thrust, times this, while the autopilot flies it; steering takes it away. 462 px/s: above a fighter's 430 (and an escort's 300), so a ship of the wing cannot keep up on its own: a burn tows the wing (card space-game-burn-with-wing-out; it was "Fast needs the wing aboard")
    auto: { leg: 3000, near: 4000 },       // FLY TO THE GOAL BURNS BY ITSELF (card space-game-keys2-cruiser): the cruiser list's row burns when the leg is at least `leg` px and no hostile is within `near` px (the wing out or aboard), and drops to regular speed when one comes that near (src/campnav.js campNavAuto). ORCH's guesses
    tow: 1.3,                              // A BURN TAKES THE WING WITH IT (card space-game-burn-with-wing-out; a guess to tune): a ship of the wing towed by a burn may fly this times the cruiser's burn speed, to catch up with its slot; it falls in on the cruiser's formation (src/campaign.js campTowSet)
    farFrom: 8000,                         // px: a Fast trip longer than this (Earth to Mars is 4,100, Earth to Jupiter 40,000) burns at farFast instead of fast (card space-game-campaign-sol)
    farFast: 3.2,                          // times the carrier's speed on a far trip: 672 px/s, Long Haul's own cruise (8,000 px/s) at the Campaign's 1 to 12 scale, so Earth to Neptune (112,000 px) is about 3 minutes
    pick: 28,                              // px on the map around a mark that count as a click on it
    list: 9,                               // lines of the list on the map at once (a heading is a line)
    pill: { show: 8, hide: 36 },           // THE PAGE HUD'S EDGE PILLS (card space-game-edge-pills-position; Troy, 25 Nov 2026): a pill shows while its ship is off the screen, with this much play so it does not flicker at the edge: a ship within `show` px of the border, or beyond it, gets its pill; the pill goes when the ship is `hide` px inside (src/campedgespread.js campEdgeOffscreen); the canvas HUD's arrows keep `arrow` below
    arrow: {
      margin: 40, min: 600,                // the edge arrow: px in from the screen edge, and the distance in px under which there is none
      keep: [[0, 0, 360, 150], [908, 0, 1280, 150], [360, 0, 920, 152], [0, 656, 1220, 720], [0, 560, 440, 664]] // (the target corners, card space-game-layout-targets: O P FRIENDLIES, its title up from y 630 and its details above it, are inside the fifth one, where the radar was; the title row of [ ] HOSTILES is the sixth (its details open under it when the target held is a hostile: a label may sit on them for a few seconds, as on any list that opens); campTdispBox(false) in src/camptdispscene.js is the fifth's bottom part and the FLEET corner's room, campTdispBox(true), is inside the last) screen rectangles [x0, y0, x1, y1] it keeps out of: the gauges and the objective and autopilot lines (to 206), the radar, the message band, the key line, the panel tabs at the left (FLEET, SYSTEMS) and at the right (SHIP): tests/camplabels.mjs holds them to the tabs' own geometry
    }
  },
  alien: {
    hpScale: 1,                            // times the PIRATES hit points (src/enemies.js: raider 20, drone 30, gunship 80); a level or a mission row may bring its own `hpScale` and `dmgScale`, which multiply these (card space-game-wrapup-difficulty)
    damageScale: 1,                        // times the PIRATES shot damage (raider 6, drone 8, gunship 10 a shot, three shots)
    earthDamage: 0.25,                     // a shot that hits Earth takes this share of its damage off Earth's shield (a big planet takes a pounding)
    distract: 4000,                        // ms an alien you hit fights the ship that hit it instead of its goal
    pursuit: {                             // a chase can be broken by a burn (card space-game-campaign-pursuit, Troy 20 Nov 2026): every alien's top speed is under the burn's (raider 430, drone 260, gunship 150 against 462; the mothership 55 and the towers do not chase). The raider is only 32 under it, so the leash is short
      leashOf: 1.25,                       // the leash, as a share of the kind's firing range (raider 650 px, drone 810, gunship 975): an alien that has been on the carrier and is farther than this from it is out of touch. A kind that fires from a distance is not out of touch while it does
      loseAfter: 1500,                     // ms out of touch (beyond the leash) before it gives up the chase: a short time, so a burn that opens the distance loses it, and a wobble does not
      sayEvery: 8000                       // ms between two "Lost them." lines (one line for a pack that drops away together)
    }
  },
  pirate: {                                // the PIRATES of Level 1 (card space-game-l1-pirates-traffic; src/camppirates.js): human raiders. They are on the hostile side (team 'alien', so the turrets, the wing, the kill objectives, the map marks and the wrecks all treat them as foes) but u.faction is 'pirate', and nothing in the words calls them aliens
    kinds: {                               // the kinds a wave row's `ships` may name. base: the PIRATES row (src/enemies.js) whose way of flying and shooting it takes; hp and dmg replace its numbers (the size and the hit circle are CAMP.size); ore: what its wreck holds; color: its mark on the radar and the map (the picture is CAMP_LOOK's); name: its words are camp.nav.k.<kind>
      skiff:  { base: 'raider',  hp: 16, dmg: 5, ore: 6,  color: 0xe8d24a },   // fast and light: it goes for the haulers and the miners
      cutter: { base: 'drone',   hp: 36, dmg: 7, ore: 10, color: 0xe8d24a },   // the medium raider
      brute:  { base: 'gunship', hp: 90, dmg: 9, ore: 18, color: 0xe8b84a }    // a slow heavy gun, a three-shot spread
    },
    prey: { freighter: 0.5, miner: 0.55, fighter: 1.1, patrol: 1.3, carrier: 1.6 }, // what a pirate weighs when it picks what to attack: the distance to it times this, the least wins (so a hauler 1,000 px off is wanted over the cruiser 500 px off). A wave row's `prey` ('haulers', 'miners', 'carrier') keeps to that kind when one is there; `goal: 'convoy:h1'` wins over it
    breakHp: 0.35,                         // a pirate breaks off and runs when its hull falls under this share (a wave row's `breakAt` is its own)
    run: 1.15,                             // times its top speed, while it runs
    runMin: 2500,                          // ms a runner runs at least before it can be gone
    gone: 2600,                            // px from the nearest ship of yours (and of the neutrals) at which a runner is gone for good: taken out of the battle (not killed: it counts in C.piratesEscaped, and for a `kill` objective of its wave it is cleared)
    distract: 4000                         // ms a pirate you hit fights the ship that hit it (the aliens' own is CAMP.alien.distract)
  },
  traffic: {                               // the neutral ships (team 'neutral': not your wing, not at war with you; the pirates and the aliens are at war with them): the patrols and the other miners. A row of a level or mission `traffic` names one
    kinds: {
      patrol: { name: 'Patrol', hp: 120, speed: 320, accel: 400, turn: 2.2, color: 0x5fd8c0, range: 720, dmg: 5, shot: [650, 950], bullet: 520, help: 2600, r: 500 }, // armed: it ranges round its post (r px), shoots a pirate or an alien within range of it, and goes to a hauler or miner under fire within `help` px of its post
      miner:  { name: 'Miner', hp: 70, speed: 130, accel: 170, turn: 1.4, color: 0xc9d4e8, fear: 900, work: [9, 15], dock: [3, 6], r: 400 }                                          // unarmed: it works the nearest rocks of the mission (or the row's `field`), goes home to its place and docks, and goes out again; it runs home when a hostile comes within `fear` px
    }
  },
  rival: {                                 // RIVAL ships (card space-game-rival-duel; src/camprival.js): an enemy the cruiser's size, with a hull and a shield of its own, that duels the cruiser. A mission row's `rivals` names them (the hook: src/camprival.js)
    comeFrom: 2600,                        // px from the carrier a rival comes from when its row gives no place
    kinds: {
      pirateleader: { name: 'Pirate leader', base: 'gunship', hull: 1900, shield: 600, dmg: 9, ore: 60, color: 0xe8b84a, say: 'camp.say.rival.leader', // the first: the pirate leader at the end of mission 1.1 (a small, forgiving one; hull 1500 until card space-game-tune-after-strafing: the strafing runs took the wing's kill time from 57 s to 44 s, 1900 makes it 54 s). base: the PIRATES row its guns and aim come from; ore: its wreck
        move: { speed: 190, accel: 150, turn: 1 },       // a cruiser's way of flying: a little slower than the carrier's 210 at the default power, a ship that has to turn to point its side
        phase: {                                           // stalk (circles at `hold` px and shoots a little) -> charge (stops, turns its side on you; `charge` s of warning) -> fires the broadside -> down (shield off `down` s) -> ram or run -> stalk again
          hold: 340, first: 10, stalk: 5,                 // the range it keeps (inside the turrets' 500 px and inside the screen: at 620 it was off the edge); seconds before the first charge, and between a ram or a run and the next charge
          charge: 4, down: 6, back: 0.6,               // seconds of warning; seconds the shield is off (every hit goes to the hull, `exposed` times over); the share of the shield that comes back
          exposed: 1.3,                                  // every hit on the hull while its shield is down does this much more
          ram: { secs: 4.5, speed: 1.5, accel: 1.4, turn: 0.55, dmg: 32, push: 160 },    // it turns to ram at 1.5 times its speed but 0.55 of its turn: a carrier that moves off its line is missed; a hit is `dmg` to the shield then the hull, and shoves both ships
          run: { secs: 6, speed: 1.2, min: 3 },          // it flees at 1.2 times its speed for `secs` and comes back; for good (below `runHp` of its hull) it flees until it is `gone` px off (CAMP.pirate.gone) and is gone
          runHp: 0.3, ramFirst: true                     // under this share of its hull it runs for good (a row's `leaves: false` fights to the death); the first turn is a ram, then run and ram by turns
        },
        gun: { dmg: 5, delay: [900, 1400], speed: 520, range: 760, aim: 0.22 },                 // the small gun it shoots while it circles
        broadside: { shots: 6, dmg: 15, spread: 0.05, speed: 620, life: 1500, reach: 1000 }     // the heavy hit: six shots in a fan (90 in all, 108 before card space-game-fleet-command-tune; the carrier's shield at the default is 150), fired where the carrier is when the charge ends
      }
    }
  },
  torpedo: {                               // torpedo boats and their torpedoes (card space-game-torpedo-boats; src/camptorpedo.js; docs/CAMPAIGN.md "Torpedo boats"): a slow hull that ignores the fighters and runs at the convoy, the miners or the cruiser and launches a heavy torpedo at close range. A wave row names a boat in `ships`
    boats: {                               // the kinds a wave row's `ships` may name. faction: 'pirate' (the pirates' words, breaks off like a pirate) or 'alien'. hp, speed (px/s), accel, turn (rad/s): the hull and the flying; color: its mark on the radar and the map; ore: what its wreck holds; the picture is CAMP_ART's
      tboat:  { faction: 'pirate', name: 'Torpedo boat', hp: 60, speed: 150, accel: 130, turn: 1.4, color: 0xe8b84a, ore: 14, // the pirates' boat: a slow hull, the pirates' amber
                prey: { freighter: 0.5, miner: 0.6, carrier: 1.1 },        // what it goes for, by distance times weight, the least wins: the haulers and the miners before the cruiser; fighters and escorts are not in it (it flies past them)
                tube: { n: 2, reload: 9000, range: 640, windup: 1200, aim: 0.5 } }, // n torpedoes in all; reload ms between two; range px it fires from; windup ms it holds still to arm (kill it then and it fires nothing); aim rad the nose may be off its prey
      lancer: { faction: 'alien',  name: 'Lancer',       hp: 75, speed: 160, accel: 140, turn: 1.3, color: 0xff8c3a, ore: 16, // the aliens' boat: a little tougher and quicker, the gunship's orange
                prey: { freighter: 0.5, miner: 0.6, carrier: 1.1 },        // the same prey
                tube: { n: 2, reload: 8000, range: 700, windup: 1000, aim: 0.5 } } // a longer reach and a quicker tube
    },
    torp: {                                // the torpedo
      hp: 14,                              // hit points: a turret shot takes off 4 (so four shots), a missile or its blast kills it
      speed: 250, launch: 90, accel: 200,  // px/s top speed, px/s it leaves the tube at, px/s per s (slower than the carrier's burn, faster than a hauler)
      turn: 1.3,                           // rad/s it turns toward its prey (it can be dodged by a fast ship, not by a hauler)
      life: 8000,                          // ms of fuel: out of it the torpedo goes out with no bang (a 'fizzle' event)
      dmg: 70,                             // hit points the ship it hits loses (the cruiser's shield first; a hauler has 200, a miner 70, a fighter 36)
      blast: 90, splash: 0.4,              // px: every other ship of yours or the neutrals this close takes splash (0.4) of the damage
      fuze: 6, r: 8,                       // px: how far from a ship's edge it goes off, and its own hit circle (a shot or a missile that touches it hurts it)
      bias: 200,                           // px: the turrets shoot a torpedo before an alien that is nearer by up to this much
      lock: 1400                           // px: F flies at a torpedo this close to the carrier when there is no mothership in reach; a torpedo with no prey takes the nearest ship inside this
    },
    sayEvery: { arming: 10000, launch: 6000, down: 5000, hit: 3000 } // ms: the radio says each kind of line at most this often
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
    hp: 200,                               // hit points (a level may give its own). 160 until card space-game-tune-after-strafing: the wing's strafing runs (src/campflight.js) kill a tower in about two thirds of the time, so a quarter more hull brings the fighters' kill time back to what it was (7 fighters: 6 s, strafing 4 s, now 5 s)
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
    ship: 50,                              // points lost for each ship of the wing that was lost
    hauler: 100                            // points lost for each hauler or transport lost (a convoy ship: card space-game-l1-rim-missions; it is not a ship of the wing, and a mission can still be won with some of them lost)
  },
  mission: {                               // where a mission happens (docs/CAMPAIGN.md, Mission places)
    arrive: 3000                           // px: the cruiser within this of the mission's place has arrived; the mission's clock (waves, haulers, par, the hold) starts then, not before
  },
  moons: [                                 // moons and small worlds a level may show (its row says which, `moons: [ids]`): id; of: the place of the level it goes round; name; at: where from it, px (the real offsets of docs/SOL.md at the Campaign's scale would put a moon on its planet, so they are lengthened); kind, seed, r: the picture; outpost: the dock the debrief returns you to
    { id: 'luna', of: 'earth', name: 'Luna', at: [1500, -900], kind: 'rock', seed: 3, r: 45, outpost: 'Imbrium Dock' },
    { id: 'phobos', of: 'mars', name: 'Phobos', at: [1700, 600], kind: 'rock', seed: 14, r: 22, outpost: 'Arsia High' },
    { id: 'deimos', of: 'mars', name: 'Deimos', at: [-2500, -900], kind: 'rock', seed: 15, r: 18, outpost: 'Arsia High' },
    { id: 'io', of: 'jupiter', name: 'Io', at: [1700, 700], kind: 'lava', seed: 16, r: 40, outpost: 'Perrine Station' },
    { id: 'europa', of: 'jupiter', name: 'Europa', at: [-2300, 1500], kind: 'ice', seed: 17, r: 40, outpost: 'Perrine Station' },
    { id: 'ganymede', of: 'jupiter', name: 'Ganymede', at: [900, -2700], kind: 'ice', seed: 18, r: 55, outpost: 'Perrine Station' },
    { id: 'callisto', of: 'jupiter', name: 'Callisto', at: [-1200, -3300], kind: 'rock', seed: 19, r: 50, outpost: 'Perrine Station' },
    { id: 'titan', of: 'saturn', name: 'Titan', at: [2000, -1700], kind: 'lava', seed: 20, r: 50, outpost: 'Kraken Shore' },
    { id: 'enceladus', of: 'saturn', name: 'Enceladus', at: [-1800, 1200], kind: 'ice', seed: 22, r: 28, outpost: 'Kraken Shore' },
    { id: 'ran', of: 'home', name: 'Ran', at: [2800, 1200], kind: 'ice', seed: 81, r: 70, outpost: 'the picket' },
    { id: 'kolga', of: 'home', name: 'Kolga', at: [-2600, -1900], kind: 'rock', seed: 82, r: 60, outpost: 'the picket' },
    { id: 'tyr', of: 'home', name: 'Tyr', at: [1500, 3000], kind: 'ice', seed: 83, r: 45, outpost: 'the picket' }
  ],
  pace: {                                  // BATTLE PACE (card space-game-campaign-pace; Troy: the small ships' fights are good but a bit fast). A multiplier on the SMALL ships (fighters, escorts, raiders, drones, gunships): top speed, acceleration and turn rate; their shots by the share `shots` of it. Hull, damage, fire intervals and range stay, so the fight changes only in how fast the ships close. The carrier, the mothership, the towers, the haulers, the turrets, the missiles, the Fast burn, the warp and the map trip are not scaled. campNew(level, techs, { pace }) takes an id or a number; with none it is 1 (Brisk: the numbers as they were)
    modes: [                               // the settings, in the order the key cycles them: id, name, the multiplier
      { id: 'calm', name: 'Calm', mult: 0.6 },   // slow enough to read every pass of the fight
      { id: 'normal', name: 'Normal', mult: 0.72 }, // the default for a player
      { id: 'brisk', name: 'Brisk', mult: 0.85 } // the quickest a player can have it. Card space-game-command-slowtime (Troy, 21 Nov 2026: fights slower) took the three values down by 15 percent (they were 0.7, 0.85, 1); that stays, but the battle itself never slows for a list, the map or a call (card space-game-no-command-slowdown, Troy, 22 Nov 2026). A battle made with no pace, or with the number 1, is still the table's own numbers: the sim's pins, the bots with --pace 1 and the tests use that
    ],
    start: 'normal',                       // the setting until the player picks one
    scale: 1,                              // times the setting's multiplier (the tuning panel's one pace number: 1 is Normal as the table has it, 1.2 a fifth quicker)
    fight: 0.5,                            // FIGHT PACE (card space-game-slower-fights; Troy, 22 Nov 2026: "slow the pace of the fights down so I can enjoy it", then "a lot more": 0.75 became 0.5): the share of its pace a small ship flies and fires at WHILE IT IS IN A FIGHT (not a torpedo boat, a slow hull, nor a runner, a ship that has broken off and flees), a foe within `engage[0]` px of it (a gun's reach and a dogfight's turns): top speed, acceleration, turn rate and the gaps between its shots, all times this, so a duel plays out the same and lasts twice as long (1 / 0.5). Away from every foe (beyond `engage[1]`) it flies at the pace above, as it did, so a trip, an approach, a scout's road and the missions' beat clocks are the same as before; between the two distances the share eases in, so no ship snaps. The tuning panel's row Fight pace (N). Only a battle made with a pace MODE has it (the tests' and the sims' number paces are the table's own numbers: 1 here)
    engage: [900, 1700],                   // px: a foe nearer than the first puts the ship at the fight pace in full; one farther than the second, not at all. Narrow on purpose: a wave comes in at the pace it always did and slows only for the last of the way, so it arrives about when it did (a mission's clock for a relic's hold or a wave's first contact does not move); the raiders' guns reach 520 px, the dogfight pairs at 1,500
    every: 200,                            // ms between the looks at who is near (campFightPace)
    shots: 0.5                             // the power of the multiplier a shot's speed takes (0.5 is its square root: a shot does not outrun the eye, a hit still lands). There is no key and no setting for the pace any more (card space-game-two-hands-keys): the Campaign flies at CAMP.pace.start, and campNew's opts.pace still takes a mode for the tests, the bots and the sims
  },
  refit: {                                 // the Earth refit screen after level 1: one tech, and ore buys extra ships for the next level (nothing builds them in a battle: the refit is where ore buys a bigger wing)
    most: 3,                               // most extra fighters one refit buys
    fighterCost: 25                        // ore for an extra fighter (it was the workshop's price, CAMP.build.fighterCost, until card space-game-repair-with-ore)
  },
  anomaly: {                               // the cloaked enemy caches (card space-game-campaign-anomalies; src/campanomaly.js; the rows are CAMP.levels[n].anomalies)
    sense: 2400,                           // px: the carrier this near notices one: a mark on the map, 'Anomaly' in the nav list, one line from the ship (the lens tech doubles it)
    visit: 260,                            // px: the carrier this near, for `hold` seconds, decloaks it
    hold: 2,                               // seconds the carrier must stay within `visit` (it counts back down when the carrier leaves)
    stop: 160,                             // px: the autopilot flies to this near it (inside `visit`)
    haze: 1500,                            // px: the scene draws the shimmer from this far (the screen shows less; the map has the mark from `sense`)
    size: 220,                             // px: the radius of the haze and of the cache's ring (a row may have its own r)
    ring: 420,                             // px: the cloaked guards decloak on a ring this far round the cache and go for the carrier
    done: 600,                             // ms after the last guard has died before the reward comes (a beat)
    chunk: 25                              // ore a chunk of the reward holds (the ore reward is that many chunks lying on the cache, for any ship of yours to pick up)
  },
  outpost: {                               // friendly outposts (card space-game-campaign-outposts, src/campoutpost.js): an outpost buys the ore and sells the refit, and mends the hull at half price; a level lists its `outposts`
    range: 280,                            // px from the edge of an outpost within which the carrier can dock (the cruiser list's Dock row, "dock at Luna"): a place's own size is added
    clear: 900,                            // px: no alien within this of the carrier, or the outpost keeps its doors shut (docking stops the battle: it must not be a free breather in a fight)
    retreatHull: 0.35                      // below this share of the hull, with no ship of the wing left (in the bay, out, launching or being mended), the HUD says where to retreat
  },
  tech: {                                  // what each tech does; names and words are in content/text/ui.md (camp.tech.<id>.name, .text)
    shield: { after: 1, taken: 0.6 },      // after level 1: the carrier takes this share of the damage it is dealt (0.6 = 40 percent less)
    beam: { after: 1, damage: 2, reach: 1.5 }, // after level 1: the turrets fire beams: this many times the damage, this many times the reach, and a shot goes through everything it hits
    blink: { after: 1, dist: 1500, cooldown: 20000 }, // after level 1: the blink row hops the carrier this far ahead, ready again after this many ms
    plating: { after: 2, hull: 1.5 },      // after level 2: the carrier's hull times this
    bay2: { after: 2, fighters: 4 },       // after level 2: this many more fighters in the bay
    repair: { after: 2, rate: 4, reach: 220 }, // after level 2: hit points a second the carrier and the ships within this many px of it heal
    overdrive: { after: 'find', speed: 1.25 }, // looted from a cloaked cache (an anomaly), offered at the refit as one more choice: the carrier's top speed and thrust times this
    lens: { after: 'find', sense: 2 }      // looted from a cloaked cache: the carrier notices an anomaly this many times as far
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
    1: {                                                          // THE RIM RUN (card space-game-l1-rim-missions; Troy, 21 Nov 2026): the cruiser leaves the Lunar Base with a transport for Ceres on the rim, mines and defends there, and brings the haulers home. It was the belt
      moons: ['luna'],                                            // the moons the level shows (CAMP.moons): the Lunar Base is Luna, where the run starts
      docks: { ceres: 'Occator Works', earth: 'Earth Orbital', luna: 'Lunar Base' },  // the dock names of the level's own bodies (a mission's `dock`; card space-game-campaign-mission-places). The friendly outposts of the level (building and mending) are `outposts`, below
      name: 'The rim run', start: 'luna', startAt: [130, 30],     // the base the cruiser leaves, and its offset from it
      outposts: { luna: { name: 'Lunar Base' }, ceres: { name: 'Occator Works', market: { rate: 3 } }, earth: {} }, // the friendly outposts: a place of this level, and what it is called (else the place's own name); the map marks them with a station and the carrier docks within CAMP.outpost.range of one. Ceres is a market: docking there sells the store for 3 cash an ore (campSell), more than the ore is worth anywhere else
      world: { system: 'sol', fit: { place: 'ceres', pack: 'sol-ceres' } }, // all of Sol round it (src/campsol.js): Ceres on its own ring of the Sol pack, 29,000 px from the Sun, which is placed from that; Vesta and Pallas are the level's own (same names), Earth, Mars and the rest are far bodies; Luna is Earth's moon, 16,500 px from Ceres
      earth: false, startOre: 0, refit: true,                     // no Earth to lose here; the store is empty at the start of the level (30 for a level you start by itself); the level ends with the Earth refit screen
      places: {                                                   // Ceres, Vesta and Pallas (real; docs/SOL.md), with the belt between them (the distances are not true)
        ceres: { x: 0, y: 0, name: 'Ceres', kind: 'ice', seed: 31, r: 90, base: 'Occator Works' },  // the dwarf planet and the mining works at the rim
        vesta: { x: 2700, y: -1500, name: 'Vesta', kind: 'rock', seed: 41, r: 60 },                  // a large asteroid, north-east
        pallas: { x: -2400, y: 2000, name: 'Pallas', kind: 'rock', seed: 43, r: 60 }                 // another, south-west
      },
      rocks: [],                                                  // the missions have their own (the belt is at Ceres, 1.2)
      anomalies: [],                                              // none: no cloaked alien caches before first contact (1.3); the later levels have them
      missions: [                                                 // a mission is a row laid over this one: kind, objectives, bonus objectives (bonus), par (s), its own waves, convoys ... (docs/CAMPAIGN.md, Missions)
        { id: 'escort', kind: 'escort', par: 400, hpScale: 1, dmgScale: 1, place: 'luna', dock: 'ceres',  // 1.1 ESCORT in four beats (card space-game-l1-1-beats; docs/CAMPAIGN.md "Mission 1.1 in four beats"): from the Lunar Base one transport flies to Ceres, 16,500 px at 52 px/s; something happens about every minute and the player directs the fleet in each
          convoys: [{ id: 't1', name: 'Transport', say: 'camp.say.transport', at: 4, from: 'luna', to: 'ceres', speed: 54 }],  // the transport: when she leaves (s after arrival), from and to which place, her speed (54: the road is about 5 minutes; it was 52)
          objectives: [{ type: 'deliver', n: 1, word: 'transport' }],  // what the mission asks: the transport must arrive (the pirate leader is a bonus: kill it, or get her past)
          bonus: [{ id: 'swift', type: 'time', secs: 400 }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'miner', type: 'neutrals', n: 0 }, { id: 'leader', type: 'rival', what: 'leader' }, { id: 'torp', type: 'torpedoes', n: 0 }],  // the debrief follows the beats: the miner saved, the leader killed, no torpedo hit
          traffic: [{ id: 'patrol', kind: 'patrol', place: 'luna', off: [160, -120], n: 2, name: 'Patrol', escort: { convoy: 't1', until: 0.12, say: 'camp.say.patrolleave' } },  // BEAT 1: a patrol of two flies with her to the edge of safe space (12 percent of the road) and turns back
                    { id: 'dm', kind: 'miner', at: [415, 5630], n: 1, name: 'Miner', home: 'luna', stay: true, hp: 24, joins: 'distress' }],  // BEAT 2: a miner works off the road, 2,600 px west of it at 30 percent of it (an offset from Luna)
          cues: [{ name: 'distress', on: { lane: 0.31 } }],  // BEAT 2: at 28 percent of the road the pirates fall on the miner and the radio says so, one plain line: the player sends help with the ordinary keys, or does not (src/campbeats.js, src/campminer.js)
          waves: [{ on: { lane: 0.31 }, beat: 'distress', victim: 'dm', thanks: 40, harry: 0.4, from: [-437, 6155], ships: { skiff: 2 }, prey: 'miners', say: 'camp.say.distress' },  // BEAT 2: two skiffs come out of the dark by the miner (an offset from Luna); they go for miners
                  { on: { lane: 0.52 }, ahead: 2000, ships: { skiff: 4, tboat: 2 }, goal: 'convoy:t1', ambush: true, say: 'camp.say.rimambush' },  // BEAT 3: the ambush on the road behind the rocks: skiffs tie up the wing while two torpedo boats go for the transport (it was the short lane's: the road forked here until card space-game-cut-lane-fork, Troy 22 Nov 2026: "remove picking a lane")
                  { on: { lane: 0.34 }, ahead: 1700, ships: { tboat: 3, skiff: 2 }, goal: 'convoy:t1', say: 'camp.say.miner.bait' }],  // BEAT 2, THE PRICE (card l1-miner-choice; last in the row so the waves before it keep their numbers): ten seconds after the call three torpedo boats and two skiffs go for the transport. With the pilots at hand the boats are strafed before they fire; with all three away at the miner a torpedo gets through (docs/CAMPAIGN-TUNING.md "The miner's call")
          rivals: [{ id: 'leader', kind: 'pirateleader', on: { lane: 0.75 }, ahead: 3000, along: 't1', escorts: { skiff: 2 }, say: 'camp.say.rival.leader' }] },  // BEAT 4: the pirate leader (a rival ship: src/camprival.js) waits for her near Ceres: kill it, or get her past
        { id: 'mine', kind: 'defend', par: 300, hpScale: 2.0, dmgScale: 1.35, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30],  // 1.2 MINE AND DEFEND at Ceres: the ore is worth 3 cash at the Works but the rim is not safe: pirates go for the miners; the cruiser starts at Ceres
          rocks: [{ at: [900, 700], n: 10, spread: 330, hp: 200 }, { at: [-1100, -400], n: 10, spread: 330, hp: 200 }, { at: [300, -1600], n: 10, spread: 330, hp: 200 }, { at: [-2100, -1400], n: 10, spread: 330, hp: 200 }],  // FOUR rock fields, offsets from Ceres: 40 rocks (800 ore) of 200 hit points; the fourth is a little further out (2,520 px, to the north-west, away from every raid's side) and is card space-game-12-ore-enough (Troy, 24 Nov 2026: he could not finish: 30 rocks held 600 ore for a store goal of 450 held at once, and every missile (20 ore), Emergency shields (50) and hull repair (60) he paid for came out of it; 800 is 1.78 times the goal, was 1.33). It was three fields, 30 rocks (600 ore) of 200 hit points (the others' 100): the wing cuts one in 8 s, not 4 (card space-game-tune-l1-notes: with 20 rocks of 100 and a goal of 190 the goal was met in 36 s and the fields were empty by 110 s, with the first raid not due until 70 and the third at 270)
          objectives: [{ type: 'ore', n: 450 }, { type: 'kill', what: 'wave:4' }, { type: 'cashin', n: 160 }],  // fill the bay (450 of its 500; the store the cruiser carries in from 1.1 counts), beat the last raid (the fifth wave), sell at the Works (the doors are shut with a pirate near, so the fight comes first). The wing mines about 2 ore a second at the table's rock, so the goal takes most of the mission and the raids land while it works
          traffic: [{ id: 'm1', kind: 'miner', place: 'ceres', off: [260, 120], n: 2, name: 'Miner' }],  // two other mining ships work the rocks round Ceres and dock at the Works (src/camppirates.js); the pirates go for them (prey 'miners'), and the bonus below asks for none lost
          bonus: [{ id: 'sold', type: 'sold', n: 400 }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'miners', type: 'neutrals', n: 0 }, { id: 'swift', type: 'time', secs: 300 }],  // bonus objectives: each met earns CAMP.score.bonus. PAR AND SWIFT 300 s (card space-game-12-lose-no-miners, Troy, 24 Nov 2026; both were 380: a careful bot won at about 270 s, so the bonus was never at risk)
          lose: [{ type: 'nomore', kind: 'miner', why: 'miners' }],  // LOST when both miners are destroyed (card space-game-12-lose-no-miners; Troy, 24 Nov 2026: with no one to stop the pirates both died and the mission sat there with no win and no loss): when the last neutral ship of this kind falls, campNeutralLost (src/camppirates.js) ends the mission with the lose card's words camp.lose.miners. Only the two miner ships count: the pilots mine too
          waves: [  // FIVE BEATS, about a minute apart (card l1-pacing; Troy: "lots of flying, not much happens"): each is a question for the three squads. It was three raids at 70, 170 and 270 s with nothing alive for half the mission; the pirates' hulls in all are about what they were (docs/CAMPAIGN-TUNING.md "Missions 1.2 and 1.3 in beats")
            { at: 40, from: [4000, 2100], ships: { skiff: 3 }, prey: 'miners', say: 'camp.say.rim4' },  // 1 a probe from the east, at the east field: which squad stops mining?
            { at: 100, from: [-3700, 2500], ships: { skiff: 3, cutter: 1 }, prey: 'miners', say: 'camp.say.l1p.west' },  // 2 a raid from the south-west ...
            { at: 112, from: [3200, -3000], ships: { skiff: 2, cutter: 1 }, prey: 'miners', say: 'camp.say.l1p.second' },  // ... and twelve seconds on a second group from the north-east, the far side: the squads must be split (the pilots' "second group" call asks)
            { at: 175, from: [-700, 4300], ships: { tboat: 2, skiff: 2 }, prey: 'miners', say: 'camp.say.l1p.boats' },  // 3 torpedo boats for the miners: tuck the miners in under the shield, or send a squad at the boats before they fire
            { at: 240, early: 55, needClear: true, from: [3000, -3300], ships: { skiff: 3, cutter: 3, brute: 2 }, prey: 'miners', say: 'camp.say.rim6' }] },  // 4 the heavy raid, when the others are dead: the whole wing, hurt squads home to be mended first; then the Works opens its doors and the ore is sold
        { id: 'haulers', kind: 'escort', par: 380, hpScale: 2.9, dmgScale: 1.55, place: 'ceres', dock: 'earth', start: 'ceres', startAt: [130, 30],  // 1.3 HAULERS HOME: three ore haulers fly from Ceres toward Earth; pirates raid and break off; then FIRST CONTACT: a small alien scout force
          convoys: [{ id: 'h1', name: 'Hauler 1', say: 'camp.say.hauler', at: 4, from: 'ceres', to: 'earth', speed: 62 }, { id: 'h2', name: 'Hauler 2', say: 'camp.say.hauler', at: 16, from: 'ceres', to: 'earth', speed: 62 }, { id: 'h3', name: 'Hauler 3', say: 'camp.say.hauler', at: 28, from: 'ceres', to: 'earth', speed: 62 }],  // the haulers: when they leave (s after arrival), from and to which place. Twelve seconds apart, so the convoy is strung out along 1,500 px of road: the cruiser's shield cannot cover the first and the last at once, which is what the beats below are about
          objectives: [{ type: 'deliver', n: 1 }, { type: 'kill', what: 'wave:5' }],  // one hauler must get home (only all lost fails it; each lost hauler costs CAMP.score.hauler), and the aliens of first contact must be beaten
          bonus: [{ id: 'all', type: 'delivered' }, { id: 'hull', type: 'hull', pct: 60 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [  // SIX BEATS along the road, about 45 s apart (card l1-pacing): it was two raids and then a long quiet road. The pirates are about as many as they were; the aliens are the same eight
            { on: { lane: 0.08 }, ahead: 3200, ships: { skiff: 3 }, prey: 'haulers', breakOn: 'contact', say: 'camp.say.rim7' },  // 1 a probe at the lead hauler: one squad forward, or keep the wing close?
            { on: { lane: 0.24 }, ahead: 3400, ships: { tboat: 1, skiff: 2 }, prey: 'haulers', say: 'camp.say.l1p.haulboats' },  // 2 a torpedo boat on a strung-out convoy (one, not two: two cost a slow player a hauler more than the mission did before): tuck in (only the haulers near the cruiser are covered), hold the leader so they close up, or run for it
            { on: { lane: 0.40 }, along: 'h3', ahead: 2600, ships: { skiff: 3, cutter: 1 }, prey: 'haulers', breakOn: 'contact', say: 'camp.say.l1p.rear' },  // 3 a raid on the LAST hauler, the slow one at the back: a squad sent back to her, or the cruiser turned round
            { on: { lane: 0.56 }, ahead: 3200, ships: { skiff: 2, cutter: 2 }, prey: 'haulers', breakOn: 'contact', say: 'camp.say.rim8' },  // 4 they come once more at the front
            { on: { lane: 0.72 }, along: 'h3', ahead: 2400, ships: { skiff: 3 }, prey: 'haulers', breakOn: 'contact', say: 'camp.say.l1p.again' },  // 5 and once more at the back: they are still on the convoy when ...
            { on: { cue: 'contact' }, ahead: 2400, ships: { raider: 4, drone: 1, gunship: 1 }, goal: 'carrier', ambush: true, secret: true, say: 'camp.say.contact' }],  // 6 FIRST CONTACT: the pirates break off and run and an unknown force (six ships: 4 raiders, 1 drone, 1 gunship; it was eight, with 2 drones and 2 gunships, and the lead hauler was lost to it in most runs: card space-game-13-all-haulers-savable, docs/CAMPAIGN-TUNING.md; the drones and gunships are rows of the N panel) falls on a wing that has just fought: hurt squads home to be mended, or all in?
          cues: [{ name: 'contact', on: { lane: 0.82 } }] }  // first contact (it was 0.52: the road after it was a minute and a half of nothing): a haulers' lane share of 0.6 fires the cue (src/camppirates.js)
      ]
    },
    home: {                                                       // the Earth defence level: Earth's shield and the convoys. Not in the chain any more (Troy: they come out of level 1); kept as data, for the rules that need an Earth and for the tests
      world: { system: 'sol', fit: { place: 'earth', pack: 'sol-earth' }, star: [-17329, -2435] }, // the Sun (src/campsol.js): Earth on its ring of the Sol pack, Mars on the far side of Earth from the Sun (the level's own place, 4,100 px off), the other bodies where the pack puts them
      name: 'Home', start: 'luna', startAt: [130, 30],           // the base the carrier leaves, and its offset from it
      outposts: { earth: {}, luna: { name: 'Lunar base' }, mars: { name: 'Mars base' } }, // the friendly outposts (see level 1)
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
      docks: { 'proxima-w': 'Toliman Waypoint' },  // the dock of the level: a waypoint on Proxima w (a mission's `dock`)
      name: 'Alpha Centauri', start: 'arrival', startAt: [0, 0], earth: false,
      outposts: { proxima: { name: 'Proxima Gate' }, 'alpha-cen-b': { name: 'Alpha B relay' } }, // the friendly outposts: the gate at Proxima b, where the relic is, and a relay at Alpha Centauri B, far from the guards that sit round Proxima b (mission 2): while they live the gate's doors are shut, so the relay is the retreat (card space-game-outpost-hot-gate)
      world: { system: 'alpha-centauri', star: 'sun', fit: { place: 'proxima', pack: 'proxima-b' }, same: { proxima: 'proxima-b' } }, // the star is the place 'sun'; the pack's other bodies round it sit on their rings and angles, fitted to Proxima b
      warp: { dest: 'Alpha Centauri', ly: 4.4, star: 'sun' },  // the warp cinematic plays when this level starts (src/campwarp.js): where to, how far, and which of the places below is the star that resolves ahead
      places: {                                                 // the carrier warps in at arrival (not drawn); Proxima b holds the relic
        arrival: { x: -4800, y: 2400, name: 'Warp point', hidden: true },                           // where the carrier warps in, south-west of the relic (not drawn)
        sun: { x: -1800, y: -3600, name: 'Alpha Centauri', kind: 'lava', seed: 4371, r: 260 },       // the star of the level, drawn as a lava world, 260 px across its radius
        proxima: { x: 1200, y: 800, name: 'Proxima b', kind: 'rock', seed: 4244, r: 150 }           // the world with the relic on it
      },
      rocks: [{ at: [-3500, 1200], n: 5, spread: 260 }, { at: [-300, 2400], n: 5, spread: 260 }], // two asteroid fields on the way in
      anomalies: [                                              // the cloaked caches (src/campanomaly.js)
        { id: 'wreck', at: [-3300, -1100], hides: 'weapons', guards: { raider: 2, gunship: 1 }, reward: { ore: 80, missiles: 2 } },           // between the first two resource caches, off the Fast burn's line: the wreck of a warship, cloaked (it was at [-3600, -400], 293 px from where the burn to mission 1's place ends, so the cruiser decloaked it with the wing still in the bay: card space-game-night-hunt-l2-l3)
        { id: 'ghost', at: [3600, 2800], hides: 'tech', guards: { raider: 2, drone: 2, gunship: 1 }, reward: { ore: 100, turret: 0.15, tech: 'lens' } },      // south-east of the relic: a lab (it holds the Lens since level 1 lost its caches, card space-game-l1-rim-missions)
        { id: 'echo', at: [2800, -3300], hides: 'weapons', guards: { gunship: 2, drone: 3 }, reward: { ore: 120, missiles: 2, tech: 'overdrive' } } // north of Proxima: the best of them
      ],
      missions: [
        { id: 'resources', kind: 'recon', par: 100, hpScale: 1.5, dmgScale: 1.8, place: 'alpha-cen-b', dock: 'proxima-w',  // M1 at Alpha Centauri B's world (a trip of about 7 s by Fast)               // M1: gather two of the three resource caches, with the aliens that followed through the warp
          caches: [[-1500, 900], [800, 1600], [1600, -700]], rocks: [{ at: [-900, -1100], n: 5, spread: 260 }, { at: [1100, 600], n: 5, spread: 260 }], objectives: [{ type: 'caches', n: 2 }, { type: 'kill', what: 'wave:0' }],  // the resource caches
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'wreck' }, { id: 'swift', type: 'time', secs: 100 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 20, from: [-3000, 1200], ships: { raider: 4, drone: 3 }, goal: 'carrier', say: 'camp.say.l2wave1' }] },  // the waves: when, from where, how many of each kind
        { id: 'guards', kind: 'attack', par: 100, hpScale: 2, dmgScale: 2.4, place: 'proxima-d', dock: 'proxima-w',  // M2 at Proxima d (a trip of about 11 s by Fast): the relic's guards                  // M2: five guards wait round the relic until your ships come within reach
          guards: [{ kind: 'gunship', at: [900, -300] }, { kind: 'gunship', at: [-700, 500] }, { kind: 'gunship', at: [1100, 700] }, { kind: 'drone', at: [-300, -700] }, { kind: 'drone', at: [300, 900] }, { kind: 'drone', at: [-1000, -200] }, { kind: 'drone', at: [700, -900] }],  // the guards (kind, offset from Proxima d)
          objectives: [{ type: 'kill', what: 'guards' }], bonus: [{ id: 'find', type: 'anomaly', anomaly: 'ghost' }, { id: 'swift', type: 'time', secs: 100 }, { id: 'hull', type: 'hull', pct: 70 }, { id: 'clean', type: 'lost', n: 1 }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          waves: [{ at: 18, from: [2600, -2200], ships: { drone: 4, gunship: 3 }, goal: 'carrier', say: 'camp.say.l2wave2' }, { at: 40, from: [-2500, 2000], ships: { raider: 4, drone: 3 }, goal: 'carrier', say: 'camp.say.l2wave2b' }] },  // the waves: when, from where, how many of each kind
        { id: 'relic', kind: 'defend', par: 90, hpScale: 2.6, dmgScale: 3, win: 'relic', place: 'proxima', dock: 'proxima-w',  // M3 at Proxima b, the relic's world (the cruiser starts there)      // M3: hold the carrier on the relic's ring until it answers, with no alien near it
          start: 'proxima', startAt: [-600, 300], relic: { place: 'proxima', radius: 240, hold: 14, caches: 0, clear: 650 }, objectives: [{ type: 'relic' }],  // where the cruiser starts, and the relic
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'echo' }, { id: 'swift', type: 'time', secs: 90 }, { id: 'hull', type: 'hull', pct: 70 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 3, from: [2800, -2800], ships: { drone: 4, raider: 3 }, goal: 'carrier', say: 'camp.say.l2wave3' }, { at: 24, from: [-2500, 1800], ships: { gunship: 3, raider: 3 }, goal: 'carrier', say: 'camp.say.l2wave3' }, { at: 42, from: [2200, 2400], ships: { drone: 4, gunship: 2 }, goal: 'carrier', say: 'camp.say.l2wave3' }] }  // the waves: when, from where, how many of each kind
      ]
    },
    3: {                                                          // the alien home world: scan the approach, break the outer ring, break the inner ring
      moons: ['ran', 'kolga', 'tyr'],  // the home world's three moons (CAMP.moons): the missions go to Kolga, Ran and the world; the picket docks at Tyr
      name: 'The home world', start: 'arrival', startAt: [0, 0], earth: false,
      reveal: { star: 'Tau Ceti', name: 'The outpost', place: 'Alien outpost' }, // SPOILER: after the win the ending says this was an outpost and the data points to this star; once the ending has been seen (the saved flag revealed) a replay says the true names (campReveal)
      warp: { dest: 'Epsilon Eridani', ly: 9.3, star: { kind: 'lava', seed: 551 }, behind: { kind: 'lava', seed: 4371 }, companions: [], l1: 'camp.warp.l1b' }, // the warp cinematic (src/campwarp.js) from Alpha Centauri to Epsilon Eridani: the star ahead and the one behind as pictures (kind, seed) since neither is a place of this level, no companion stars, and its own first line
      // no outposts here: the alien home world is the only place, so nothing friendly to dock at: the hull is mended in space like anywhere (src/campmend.js)
      world: { system: 'epsilon-eridani', fit: { place: 'home', pack: 'epsilon-eridani-b' }, same: { home: 'epsilon-eridani-b' }, k: 3 }, // Epsilon Eridani's star and belts round the alien home world, which is the pack's Aegir; k: the rings are this many times the pack's (so the star is not on top of the towers)
      places: {
        arrival: { x: -7000, y: 3500, name: 'Warp point', hidden: true },                          // where the carrier warps in: 7,800 px from the world (not drawn)
        home: { x: 0, y: 0, name: 'Alien home world', kind: 'gas', seed: 77, r: 330 }              // the world, 330 px across its radius
      },
      rocks: [{ at: [-4500, 2200], n: 5, spread: 260 }, { at: [-2500, -500], n: 5, spread: 260 }], // two asteroid fields on the approach
      anomalies: [                                              // the cloaked caches (card space-game-campaign-anomalies; src/campanomaly.js): at [x, y] or place + off; r the haze; hides the words; guards come out when it is decloaked; reward once
        { id: 'nest', at: [-4200, -2800], hides: 'tech', guards: { raider: 3, gunship: 1 }, reward: { ore: 100, missiles: 2 } },   // west of the approach: a lab of theirs (no tech in the reward: nothing after the last level could offer it, so the find counts as score)
        { id: 'vault', at: [3200, 4200], hides: 'weapons', guards: { raider: 3, gunship: 2 }, reward: { ore: 120, turret: 0.2 } },              // south-east of the home world: a store of heavy guns
        { id: 'core', at: [-1800, 4300], hides: 'weapons', guards: { gunship: 3, drone: 3 }, reward: { ore: 150, missiles: 3 } }               // south, well outside the inner ring and out of the sense range of the missions' starts (card space-game-wrapup-hunt-l3: it was noticed at second 0): the last of them
      ],
      missions: [
        { id: 'approach', kind: 'recon', par: 120, hpScale: 2.2, dmgScale: 2.6, place: 'kolga', dock: 'tyr',  // M1 at Kolga, a moon of the alien home world (a trip of about 10 s by Fast)                // M1: three points on the way in; defenders come when the first is scanned
          objectives: [{ type: 'scan', points: [{ at: [-1500, 800], r: 420, secs: 7 }, { at: [100, 1400], r: 420, secs: 7 }, { at: [1500, -500], r: 420, secs: 7 }] }, { type: 'kill', what: 'wave:0' }],  // what the mission asks (scan points: where, how close, how many seconds), all of it
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'nest' }, { id: 'swift', type: 'time', secs: 120 }, { id: 'clean', type: 'lost', n: 0 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ on: { scanned: 1 }, from: [-2500, 1800], ships: { raider: 5, drone: 3 }, goal: 'carrier', say: 'camp.say.l3wave1' }] },  // the waves: when, from where, how many of each kind
        { id: 'outer', kind: 'attack', par: 120, hpScale: 2.4, dmgScale: 3, win: 'towers', place: 'ran', dock: 'tyr',  // M2 at Ran, the second moon (a trip of about 8 s by Fast): the four tougher towers round it;   // M2: the four outer towers (they are the tougher ones)
          start: 'home', startAt: [-3300, 1900], towers: [{ place: 'ran', r: 1100, n: 4, phase: 0.7, hp: 260 }], objectives: [{ type: 'kill', what: 'towers' }],  // where the cruiser starts, and the relic
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'vault' }, { id: 'swift', type: 'time', secs: 120 }, { id: 'hull', type: 'hull', pct: 60 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 25, from: [2800, -2800], ships: { drone: 4, gunship: 3 }, goal: 'carrier', say: 'camp.say.l3wave2' }] },  // the waves: when, from where, how many of each kind
        { id: 'inner', kind: 'attack', par: 150, hpScale: 2.4, dmgScale: 3, win: 'towers', place: 'home', dock: 'tyr',  // M3 at the alien world itself (the cruiser starts there): the eight inner towers, the last reserves;   // M3: the eight inner towers, with the last reserves
          start: 'home', startAt: [-2400, 1300], towers: [{ place: 'home', r: 1000, n: 8, phase: 0.2 }], objectives: [{ type: 'kill', what: 'towers' }],  // where the cruiser starts, and the relic
          bonus: [{ id: 'find', type: 'anomaly', anomaly: 'core' }, { id: 'swift', type: 'time', secs: 150 }, { id: 'hull', type: 'hull', pct: 50 }, { id: 'clean', type: 'lost', n: 2 }],  // bonus objectives: each met earns CAMP.score.bonus
          waves: [{ at: 20, from: [-2500, -3000], ships: { raider: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave3' }, { at: 75, early: 20, from: [2800, -2800], ships: { drone: 3, gunship: 2 }, goal: 'carrier', say: 'camp.say.l3wave2' }] }  // the waves: when, from where, how many of each kind
      ]
    }
  }
};
const campFlag = id => !!(CAMP.flags && CAMP.flags[id]); // a switch of CAMP.flags: is the system in the mission? (the tuning panel changes them live; the defaults are the table's)

// ---------- small helpers ----------
function campPlaces(level) { // the places of a level: its own (and the far bodies the Sol card adds), plus the moons of CAMP.moons the level lists whose planet it has (added once each, whenever the planet is there), and the outpost names of the level's `outposts`; else the home system's
  const row = CAMP.levels[level], pl = (row && row.places) || CAMP.places, st = row && pl[row.start], want = (row && row.moons) || [];
  if (row && row.docks) Object.keys(row.docks).forEach(id => { if (pl[id]) pl[id].outpost = row.docks[id]; }); // the dock name of a body of the level (a string: the debrief says "Docked at ...")
  CAMP.moons.forEach(m => { const par = pl[m.of]; if (!par || pl[m.id] || want.indexOf(m.id) < 0) return; const x = Math.round(par.x + m.at[0]), y = Math.round(par.y + m.at[1]); pl[m.id] = { x, y, name: m.name, kind: m.kind, seed: m.seed, r: m.r, far: Math.hypot(x - (st ? st.x : 0), y - (st ? st.y : 0)) > 9000, moon: m.of, outpost: m.outpost }; });
  return pl;
}
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
  if (row.route && typeof campRouteRow === 'function') campRouteRow(row); // a fork in the road: the lanes' hidden waves join the row's waves, each with its lane's id (src/camproute.js)
  if (row.place && !campPlaces(level)[row.place]) { // the place is not there (a system pack is missing): the mission happens where the cruiser starts, and its haulers go between the first two places
    const pl = campPlaces(level), ids = Object.keys(pl).filter(id => !pl[id].hidden); row.place = ''; row.dock = '';
    row.convoys = row.convoys.map(c => pl[c.from] && pl[c.to] ? c : Object.assign({}, c, { from: ids[0], to: ids[1] || ids[0] }));
  }
  if (row.place) { // the mission happens at a place: the points of its rows (rocks, scan points, caches, guards, where the waves come from) are offsets from it, made absolute here (the level's own rows are not changed)
    const pl = campPlaces(level), p = pl[row.place], sh = a => [a[0] + p.x, a[1] + p.y];
    if (row.rocks) row.rocks = row.rocks.map(f => Object.assign({}, f, { at: sh(f.at) }));
    if (row.caches) row.caches = row.caches.map(sh);
    if (row.guards) row.guards = row.guards.map(g => Object.assign({}, g, { at: sh(g.at) }));
    if (row.traffic) row.traffic = row.traffic.map(t => Object.assign({}, t, t.at ? { at: sh(t.at) } : {}, Array.isArray(t.field) ? { field: sh(t.field) } : {})); // the neutral ships (src/camppirates.js): a row with `at` or `field` points is an offset from the mission's place; one with `place` + `off` is not
    row.waves = row.waves.map(w => Object.assign({}, w, w.from ? { from: sh(w.from) } : {}, w.mother ? { mother: sh(w.mother) } : {}));
    if (row.objectives) row.objectives = row.objectives.map(o => o.type === 'scan' ? Object.assign({}, o, { points: o.points.map(q => Object.assign({}, q, { at: sh(q.at) })) }) : o);
  }
  return row;
}
// seconds since the mission began in earnest: since the cruiser arrived at the mission's place (a mission with no place begins at once)
const campMissionClock = C => C.arrivedAt == null ? 0 : Math.max(0, (C.t - C.arrivedAt) / 1000);
const campMissionPlace = C => C.L.place ? campPlaces(C.level)[C.L.place] || null : null;
// true when the cruiser starts within CAMP.mission.arrive of the mission's place (or the mission has none): it has arrived at once, no trip
const campHere = (level, L) => { const pl = campPlaces(level), p = L.place && pl[L.place], st = pl[L.start]; return !p || !st || Math.hypot(p.x - (st.x + L.startAt[0]), p.y - (st.y + L.startAt[1])) <= CAMP.mission.arrive; };
// the way to a mission's place, from where the cruiser starts: { place (the row), name, dist (px), secs (by Fast, the map's own rule), km } or null when it starts there. For the briefing and the map; pure
// the km a place is away, as every number of distance in the Campaign reads it (src/campnav.js campNavKm: a tenth of the px, to the CENTRE of the place); the briefing, the objective line and the map all use this one
const campKmText = d => typeof campNavKm === 'function' ? campNavKm(d) : String(Math.round(d / 10));
function campTravel(level, i) {
  const L = campMissionRow(level, i), pl = campPlaces(level), p = L && L.place && pl[L.place], st = L && pl[L.start]; if (!p || !st) return null;
  const centre = Math.hypot(p.x - (st.x + L.startAt[0]), p.y - (st.y + L.startAt[1])), dist = centre - CAMP.mission.arrive; if (dist <= 0) return null;
  const burn = dist > CAMP.nav.farFrom ? CAMP.nav.farFast : CAMP.nav.fast;
  return { place: p, id: L.place, name: p.name, dist: Math.round(dist), km: campKmText(centre), secs: Math.round(dist / (CAMP.carrier.speed * burn) * CAMP.nav.etaSlow), outpost: L.outpost || p.outpost || '' };
}
// the multiplier of a pace setting: an id of CAMP.pace.modes or a number; anything else (none given) is 1, the numbers as the table has them
function campPaceMult(p) {
  if (typeof p === 'number' && p > 0 && isFinite(p)) return p;
  const m = CAMP.pace.modes.find(x => x.id === p); return m ? m.mult * CAMP.pace.scale : 1;
}
const campSmall = kind => kind === 'fighter' || !!PIRATES[kind] || !!CAMP.pirate.kinds[kind] || !!CAMP.torpedo.boats[kind] || !!CAMP.rival.kinds[kind]; // a small ship: the ones the pace scales (the fighters of the wing, the aliens that are not the mothership or a tower)
// the pace is put on a ship from the numbers it was made with (u.base), so it can change in play and come back to Brisk exactly; u.tow is a ship of the wing towed by a burn (src/campaign.js campTowSet): its top speed and push times it
function campPaceShip(C, u) {
  if (!u.base) return;
  const P = C.pace * (u.fp || 1), R = u.running ? CAMP.pirate.run : 1, b = u.base; u.vmax = b.vmax * P * R * (u.tow || 1); u.accel = b.accel * P * R * (u.tow || 1); u.turn = b.turn * P; // R: a runner flies faster (src/camppirates.js campPirateBreakOne) and keeps it; u.fp: the share of the pace the ship flies at now, 1 away from every foe, CAMP.pace.fight in a fight (campFightPace)
  u.def = P === 1 ? b.def : Object.assign({}, b.def, { speed: b.def.speed * P, max: b.def.max * P }); // pirateSteer reads the shape: its ring and its lean use the speed and the acceleration
}
// A BURN TAKES THE WING WITH IT (card space-game-burn-with-wing-out; src/campnav.js has the rule and campTowTop): once a tick for each ship of the wing, is it towed? u.tow is the factor on its top speed and push (CAMP.nav.tow
// times the cruiser's burn speed over the ship's own top speed, at the battle's pace); 1 when it is not. A ship with a hostile within CAMP.flight.self px is not.
const campTowTop = C => { const N = C.nav, c = C.carrier; return N && N.on && N.fast && c && c.hp > 0 ? CAMP.carrier.speed * campPowerFx(C).speed * (N.burn || CAMP.nav.fast) * (campHas(C, 'overdrive') ? CAMP.tech.overdrive.speed : 1) : 0; };
function campTowSet(C, u, aliens) {
  const top = campTowTop(C); let T = 1;
  if (top && u.base && !campNearest(aliens, u, CAMP.flight.self)) T = Math.max(1, top * CAMP.nav.tow / (u.base.vmax * C.pace * (u.fp || 1)));
  if (T !== (u.tow || 1)) { u.tow = T; campPaceShip(C, u); }
  return T > 1;
}
// a new pace for the battle, from now on and for the ships already out (the quick key)
function campPaceSet(C, p) {
  C.pace = campPaceMult(p); C.shot = Math.pow(C.pace, CAMP.pace.shots); C.fightOn = campPaceIsMode(p);
  C.ships.forEach(u => campPaceShip(C, u));
  return C.pace;
}
const campPaceIsMode = p => typeof p !== 'number' && !!CAMP.pace.modes.find(x => x.id === p); // a pace MODE (an id of CAMP.pace.modes) has the fight pace; a number, or none, is the table's own numbers
const campFightGap = (u, ms) => ms / (u.fp || 1); // the gap between a small ship's shots, in a fight: longer by the same share that the ship flies slower
// FIGHT PACE (card space-game-slower-fights): every CAMP.pace.every ms each small ship looks for the nearest foe (the aliens against anything that is not an alien, the wing against the aliens) and takes its share of the pace by how near it is
function campFightPace(C) {
  if (C.t < (C.fightAt || 0)) return; C.fightAt = C.t + CAMP.pace.every;
  const F = C.fightOn ? Math.max(0.05, +CAMP.pace.fight || 1) : 1, r0 = CAMP.pace.engage[0], r1 = Math.max(r0 + 1, CAMP.pace.engage[1]), ships = C.ships;
  for (let i = 0; i < ships.length; i++) {
    const u = ships[i]; if (!u.base || u.hp <= 0 || u.boat) continue; // a torpedo boat is a slow hull, not a dogfighter: at half its speed the turrets kill it before it can launch, so it flies and arms as it always did
    let fp = 1;
    if (F !== 1 && !u.running) { // a runner (a pirate that has broken off, src/camppirates.js) flees at its full run speed: slowed by the carrier at its heels, it could never get away
      let best = Infinity; const al = u.team === 'alien';
      for (let j = 0; j < ships.length; j++) { const o = ships[j]; if (o.hp <= 0 || (o.team === 'alien') === al || o.running) continue; const dx = o.x - u.x, dy = o.y - u.y, d2 = dx * dx + dy * dy; if (d2 < best) best = d2; } // a runner is not a foe to slow for: the wing chasing it must be quicker than it, as it was
      const t = best === Infinity ? 1 : Math.max(0, Math.min(1, (Math.sqrt(best) - r0) / (r1 - r0)));
      fp = F + (1 - F) * t;
    }
    if (Math.abs(fp - (u.fp || 1)) > 0.004) { u.fp = fp; campPaceShip(C, u); }
  }
}
function campNew(level, techs, opts) {
  opts = opts || {};
  const L = campMissionRow(level, opts.mission); if (!L) return null;
  const C = {
    level, mission: L.mission, L, flags: {}, arrivedAt: campHere(level, L) ? 0 : null, hpS: CAMP.alien.hpScale * (L.hpScale || 1), dmgS: CAMP.alien.damageScale * (L.dmgScale || 1), pace: campPaceMult(opts.pace), fightOn: campPaceIsMode(opts.pace), fightAt: 0, shot: Math.pow(campPaceMult(opts.pace), CAMP.pace.shots), via: opts.via || 'menu', t: 0, rng: campRng(opts.seed == null ? 1 : opts.seed), god: !!opts.god, nextId: 1, ships: [], by: {}, bullets: [], events: [],
    input: { turn: 0, thrust: 0, brake: false, fire: false, blink: false },
    techs: (techs || []).filter(t => CAMP.tech[t]),
    earth: L.defend ? campDefend(level, L.defend) : L.earth === false ? null : { x: 0, y: 0, r: CAMP.earth.radius, shield: CAMP.earth.shield, max: CAMP.earth.shield }, caches: (L.caches || []).map(c => ({ x: c[0], y: c[1], got: false })), cachesGot: 0,
    ore: Math.max(0, Math.min(CAMP.ore.cap, opts.ore != null ? opts.ore : (L.startOre != null ? L.startOre : CAMP.ore.start))), shield: CAMP.carrier.shield, pickups: [], mends: [],
    relic: L.relic ? { x: campPlaces(level)[L.relic.place].x, y: campPlaces(level)[L.relic.place].y, hold: 0 } : null,
    bay: { fighters: CAMP.bay.fighters }, launchQ: [], nextLaunch: 0, tgt: '', sel: 'all', fsel: '', repairs: [], // repairs: the fighters landed and being mended, { kind, until, order, stay } (src/camprepair.js)
    waves: L.waves.map(() => ({ started: false, at: 0 })), convoys: L.convoys.map(() => ({ started: false })), delivered: 0, lost: 0, kills: 0, launched: 0, lostShips: 0, lane: {}, cash: Math.max(0, Math.floor(+opts.credits || 0)), sold: 0, oreBest: 0,
    orders: { launch: 0, attack: 0, escort: 0, guard: 0, recall: 0, mine: 0, repair: 0, mendship: 0, power: 0, balance: 0, emergency: 0, convoy: 0 }, blinkAt: -1e9, motherSpawn: 0, // (the turrets have no clock of their own here: they fire by the carrier's own turret code)
    result: null, why: '', docked: '' // docked: the id of the outpost the carrier is docked at ('' in flight; src/campoutpost.js)
  };
  C.strength = CAMP.pilotStrength; // the wing's strength in fighters' worth: three ships whatever it is (card space-game-three-pilots); campPilotStrengths shares it out
  if (campHas(C, 'bay2')) C.strength += CAMP.tech.bay2.fighters;
  if (opts.bonus) { C.strength += Math.max(0, opts.bonus.fighters | 0); } // the extras bought at the Earth refit
  C.rank = Math.max(0, Math.min(CAMP.ranks.length - 1, opts.rank | 0)); // the rank of the pilot (src/campranks.js: from the scores of the missions flown): its extras make the three pilots stronger
  { const rk = CAMP.ranks[C.rank]; C.strength += rk.fighters; }
  C.pilotStr = campPilotStrengths(C.strength);
  Object.assign(C, { missiles: CAMP.missile.magazine, magazine: CAMP.missile.magazine, turretMul: 1, rockets: [], rocketId: 0, nextRocket: 0, reloadAt: 0, queued: 0 }); C.orders.missiles = 0; // the launcher: the magazine (a plain number), the missiles in flight, its clocks; reloadAt: when the missile being built is done (0: none), queued: the missiles R has queued that wait for their build to start (src/campmissilebuild.js)
  if (typeof campBeatsNew === 'function') campBeatsNew(C); // the beats of the mission (src/campbeats.js)
  C.route = null; if (typeof campRouteNew === 'function') campRouteNew(C); // a fork in the road (src/camproute.js): C.route, and the lanes' caches in C.caches
  Object.assign(C, { cues: {}, piratesEscaped: 0, neutralsLost: 0 }); // the named cues a script has fired (campCue), the pirates that broke off and got away, the neutral ships lost (src/camppirates.js)
  const p = campPlaces(level)[L.start], c = campSpawn(C, 'carrier', p.x + L.startAt[0], p.y + L.startAt[1]);
  C.carrier = c; c.rot = 0;
  C.power = campPowerNew(opts.power); C.shield = campShieldMax(C); // the ship's systems: the saved setting (or 2 / 2 / 2), and a full shield for its cap (150 at the default)
  C.scan = ((L.objectives || []).find(o => o.type === 'scan') || { points: [] }).points.map(q => ({ x: q.at[0], y: q.at[1], r: q.r || 260, secs: q.secs || 5, t: 0, got: false })); // recon: the points to scan
  C.turretRng = campRng((opts.seed == null ? 1 : opts.seed) * 4243 + 29); // the turrets' jitter has a stream of its own, so it never changes how a fight flies
  C.turrets = CAMP.carrier.mounts.map((m, i) => ({ x: 0, y: 0, aim: 0, target: '', slot: 0, at: 0, shotAt: -1e9 })); C.turrets.forEach((tu, i) => { tu.at = campTurretAt(C, i, 0); }); campTurretPlace(C); // the turrets: where each is, which way it aims, at whom, when it may fire next and when it last did (the scene draws them)
  C.charge = CAMP.tank.max; C.chargeLow = false; // the turrets' charge (campLaserStep, campLaserSpend), full at the start of a battle
  (L.towers || []).forEach(g => { // rings of towers round a place, facing outward
    const at = campPlaces(level)[g.place];
    for (let i = 0; i < g.n; i++) { const a = (g.phase || 0) + i / g.n * 2 * Math.PI, t = campSpawn(C, 'tower', at.x + Math.cos(a) * g.r, at.y + Math.sin(a) * g.r); t.rot = a; if (g.hp) t.hp = t.maxHp = g.hp; }
  });
  const rr = campRng((opts.seed == null ? 1 : opts.seed) * 7919 + 13); // the rocks have a stream of their own, so ore never changes how a fight flies
  C.rocks = []; C.lasers = []; C.laserNow = []; C.laserLog = {}; // C.lasers: the beams firing now, [{ from: the ship's id, to: the rock's or the alien's id, kind: 'rock' | 'alien', since: C.t when this beam began without a break }] (data for the beam hum, src/campaign.js campBeamState of card space-game-campaign-sounds)
  (L.rocks || []).forEach((f, fi) => { for (let i = 0; i < f.n; i++) { const a = rr() * 2 * Math.PI, d = Math.sqrt(rr()) * f.spread; C.rocks.push({ id: 'rock-' + (C.nextId++), x: f.at[0] + Math.cos(a) * d, y: f.at[1] + Math.sin(a) * d, hp: f.hp || CAMP.ore.rockHp, maxHp: f.hp || CAMP.ore.rockHp, r: CAMP.ore.rockR, ore: CAMP.ore.rock, cutAt: -1e9, field: fi }); } }); // asteroids: a laser cuts one, and it breaks into a chunk of ore (a field row may say `hp`: harder rock, so the same wing takes longer to cut it: card space-game-tune-l1-notes)
  (L.guards || []).forEach(g => { const a = campSpawn(C, g.kind, g.at[0], g.at[1]); if (a) { a.hold = true; a.guard = true; a.goal = 'carrier'; a.post = { x: g.at[0], y: g.at[1] }; } }); // guard: a kill objective 'guards' counts them; a guard's post: where it goes back to when it loses you
  if (typeof campTrafficNew === 'function') campTrafficNew(C); // the neutral ships of the level: patrols and other miners (src/camppirates.js)
  if (typeof campTorpedoNew === 'function') campTorpedoNew(C); // the torpedoes in flight and their counts (src/camptorpedo.js)
  campAnomNew(C, opts.found); // the cloaked caches of the level (src/campanomaly.js); what was looted in earlier flights stays looted, and its weapons are yours
  campStartOut(C); // the three pilots are out beside the cruiser from the first second (card space-game-keys-orders)
  return C;
}

// one ship into the game. kind: carrier, fighter, freighter, mother, or a PIRATES key (raider, drone, gunship)
// a kind of ship a switch has taken out of the game (CAMP.flags): campSpawn makes none, and every caller already asks whether it got one
const campKindOff = kind => ((kind === 'tboat' || kind === 'lancer' || !!(CAMP.torpedo.boats && CAMP.torpedo.boats[kind])) && !campFlag('tboats')) || (!!(CAMP.rival.kinds && CAMP.rival.kinds[kind]) && !campFlag('rival'));
function campSpawn(C, kind, x, y) {
  if (campKindOff(kind)) return null;
  const u = { id: kind + '-' + (C.nextId++), kind, x, y, vx: 0, vy: 0, rot: 0, move: null, moveUntil: 0, ran: false, side: C.rng() < 0.5 ? -1 : 1, nextShot: 0, order: null, goal: '', distractedUntil: 0 };
  if (kind === 'carrier') {
    const k = CAMP.carrier; Object.assign(u, { team: 'earth', hp: k.hull * (campHas(C, 'plating') ? CAMP.tech.plating.hull : 1), r: CAMP.size.carrier.hit, vmax: k.speed, accel: k.accel, turn: k.turn });
  } else if (kind === 'fighter') {
    const k = CAMP.fighter;
    Object.assign(u, { team: 'earth', hp: k.hp, r: CAMP.size.fighter.hit, vmax: k.speed, accel: k.accel, turn: k.turn,
      def: { key: 'raider', hold: k.hold, speed: k.accel, max: k.speed, hp: k.hp } }); // the shape pirateSteer reads
  } else if (kind === 'freighter') {
    Object.assign(u, { team: 'earth', hp: CAMP.convoy.hp, r: 22, vmax: CAMP.convoy.speed, accel: 400, turn: 2 });
  } else if (kind === 'mother') {
    const k = CAMP.mother; Object.assign(u, { team: 'alien', hp: k.hp * C.hpS, r: k.radius, vmax: k.speed, accel: 200, turn: 0.5 });
  } else if (kind === 'tower') {
    const k = CAMP.tower; Object.assign(u, { team: 'alien', hp: k.hp * C.hpS, r: k.radius, vmax: 0, accel: 0, turn: k.turn, fixed: true });
  } else if (CAMP.rival.kinds[kind]) { campRivalMake(C, u, kind); // a rival ship (src/camprival.js): a pirate the cruiser's size, with a shield
  } else if (CAMP.pirate.kinds[kind]) { // a pirate: it flies and shoots like its base kind of PIRATES, with its own hull and damage; the hostile side, faction 'pirate'
    const k = CAMP.pirate.kinds[kind], d = Object.assign({}, PIRATES[k.base], { hp: k.hp, dmg: k.dmg, radar: k.color });
    Object.assign(u, { team: 'alien', faction: 'pirate', def: d, hp: k.hp * C.hpS, r: CAMP.size[kind].hit, vmax: d.max, accel: d.speed, turn: d.turn * 60 });
  } else if (CAMP.torpedo.boats[kind]) { // a torpedo boat: slow, no gun, a tube (src/camptorpedo.js); the hostile side, the pirates' or the aliens'
    const k = CAMP.torpedo.boats[kind];
    Object.assign(u, { team: 'alien', faction: k.faction, boat: true, def: { key: kind, speed: k.accel, max: k.speed, hp: k.hp }, hp: k.hp * C.hpS, r: CAMP.size[kind].hit, vmax: k.speed, accel: k.accel, turn: k.turn, tubes: k.tube.n, tubeAt: 0, arming: 0, tgt: '' });
  } else if (CAMP.traffic.kinds[kind]) { // a neutral ship: a patrol or a miner
    const k = CAMP.traffic.kinds[kind];
    Object.assign(u, { team: 'neutral', faction: 'neutral', hp: k.hp, r: CAMP.size[kind].hit, vmax: k.speed, accel: k.accel, turn: k.turn });
    Object.assign(u, { post: { x, y }, range: k.r, slot: 0, cname: k.name }); if (kind === 'miner') Object.assign(u, { home: { x, y, r: 0 }, field: null, phase: 'out', until: 0, beam: '', rockId: '' }); // a neutral made by hand stays where it was made (src/camppirates.js campTrafficNew gives a row's own post and home)
  } else if (PIRATES[kind]) {
    const d = PIRATES[kind];
    Object.assign(u, { team: 'alien', def: d, hp: d.hp * C.hpS, r: d.body[0], vmax: d.max, accel: d.speed, turn: d.turn * 60 }); // the table's turn is a Phaser step per frame at 60 a second
  } else return null;
  if (campSmall(kind)) { u.base = { vmax: u.vmax, accel: u.accel, turn: u.turn, def: u.def }; campPaceShip(C, u); } // the small ships fly at the battle's pace
  u.faction = u.faction || (u.team === 'alien' ? 'alien' : u.team); // who it belongs to: 'earth', 'alien', 'pirate' or 'neutral'
  if (u.faction === 'alien') C.alienSeen = true; // the first alien of the battle: from here the ship computer's summary counts them (before it, on the rim, it does not name them: card space-game-night-hunt-l1-rim)
  u.maxHp = u.hp; u.nextShot = C.t + 600 + C.rng() * 900;
  if (kind === 'fighter' && u.team === 'earth' && typeof campSquadNext === 'function') { u.squad = campSquadNext(C); campPilotSet(C, u); } // the wing's fighter joins a squad (src/campwing.js) and is its pilot: its name, its hull and its gun (card space-game-three-pilots)
  C.ships.push(u); C.by[u.id] = u;
  return u;
}
// the money of the dock: the cash (what ore sold at a market came to) and the ore in the store; a price is paid from the cash first, then the ore
// ORE AND CREDITS (card space-game-credits-apart-from-ore; Troy, 22 Nov 2026). ORE is what the cruiser carries: C.ore in a battle, P.ore in the save, CAMP.ore.cap at the most, spent anywhere (a repair in flight spends
// ore only: src/campmend.js). CREDITS are what an outpost pays for ore (campSell): C.cash in a battle, P.credits in the save, no cap, spent only at a station (docked, the ready room's refit, the Earth refit), where they
// are spent FIRST. It was one number: a sale's cash was saved as ore and cut to the store at the next load (sold 464 ore for 1,392, began the next mission with 500).
//   campFunds(C), campPay(C, cost)      a battle, at a station: the cash and the ore together; the cash first
//   campCarryOut(P, C)                  what goes on from a mission into the save: the ore left in the store and all the credits
//   campWealth(P), campSpend(P, cost)   the save, at a station (the ready room, the Earth refit): credits and ore together; credits first; false and nothing taken when both are short
//   campRefund(P, n)                    money given back at a station: ore while the store has room (ore is what a repair in flight can spend), the rest credits; nothing is cut
function campCarryOut(P, C) { P.ore = Math.max(0, Math.min(CAMP.ore.cap, Math.floor(C.ore))); P.credits = Math.max(0, Math.floor(C.cash || 0)); return P; }
const campWealth = P => Math.max(0, Math.floor(P.credits || 0)) + Math.max(0, P.ore | 0);
function campSpend(P, cost) { if (!(cost >= 0) || campWealth(P) < cost) return false; const c = Math.min(Math.max(0, Math.floor(P.credits || 0)), cost); P.credits = Math.max(0, Math.floor(P.credits || 0)) - c; P.ore = (P.ore | 0) - (cost - c); return true; }
function campRefund(P, n) { if (!(n > 0)) return P; n = Math.floor(n); const o = Math.min(n, Math.max(0, CAMP.ore.cap - (P.ore | 0))); P.ore = (P.ore | 0) + o; P.credits = Math.max(0, Math.floor(P.credits || 0)) + (n - o); return P; }
const campFunds = C => Math.floor(C.cash || 0) + Math.floor(C.ore);
function campPay(C, cost) { const c = Math.min(C.cash || 0, cost); C.cash = (C.cash || 0) - c; C.ore -= cost - c; }
const campAlive = C => C.ships.filter(u => u.hp > 0);
const campAliens = C => C.ships.filter(u => u.team === 'alien' && u.hp > 0);
const campWing = (C, kind) => C.ships.filter(u => u.team === 'earth' && u.hp > 0 && (kind ? u.kind === kind : u.kind === 'fighter'));
const campConvoys = C => C.ships.filter(u => u.kind === 'freighter' && u.hp > 0);
function campNearest(list, p, max) { let best = null, bd = max == null ? Infinity : max; list.forEach(u => { const d = campDist(u, p); if (d < bd) { bd = d; best = u; } }); return best; }

// ---------- damage and deaths ----------
function campHurt(C, u, dmg, byId) {
  if (u.hp <= 0 || C.result) return;
  if (u.cord === 'tuck' && typeof campConvoyCover === 'function') { const c = campConvoyCover(C, u); if (c) u = c; } // a ship tucked in under the cruiser's shield: the hit is the cruiser's (src/campconvoy.js)
  if (u.kind === 'carrier') {
    if (campHas(C, 'shield')) dmg *= CAMP.tech.shield.taken; if (C.god) dmg = 0;
    if (C.shield > 0 && dmg > 0) { const take = Math.min(C.shield, dmg); C.shield -= take; dmg -= take; C.shieldHitAt = C.t; C.events.push({ type: 'shieldhit', x: u.x, y: u.y }); } // the shield first
  }
  if (u.rival) dmg = campRivalHurt(C, u, dmg); // a rival's shield takes the hit first, as the carrier's does; with it down every hit goes through, and harder (src/camprival.js)
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
    if (u.rival) campRivalDied(C, u);
    const ore = CAMP.ore.wreck[u.kind] || (CAMP.pirate.kinds[u.kind] || {}).ore || (CAMP.torpedo.boats[u.kind] || {}).ore || (CAMP.rival.kinds[u.kind] || {}).ore; if (ore) C.pickups.push({ id: 'wreck-' + (C.nextId++), kind: 'wreck', x: u.x, y: u.y, ore, born: C.t });
    if (u.kind === 'mother') campWin(C, 'mother');
    else if (u.kind === 'tower' && (C.L.win === 'towers' || C.L.objectives) && !C.ships.some(s => s.kind === 'tower' && s.hp > 0)) campWin(C, 'towers'); // the last tower of the level
  }
  else if (u.kind === 'carrier') campEnd(C, 'lost', 'carrier');
  else if (u.kind === 'freighter') { C.lost++; campSay(C, u.named ? 'camp.say.shiplost' : 'camp.say.convoylost', { name: campConvoyName(u) }); }
  else if (u.team === 'neutral') campNeutralLost(C, u); // a patrol or a miner: not one of your ships (src/camppirates.js)
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
  if (/\b(carrier|cruiser|me|us|ship|home)\b/.test(q) && !/\bconvoy\b/.test(q)) return { kind: 'carrier' };
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
function campOrder(C, name, arg, how) { return campDo(C, name, arg, false, how); }
function campCheck(C, name, arg) { return campDo(C, name, arg, true); }
function campDo(C, name, arg, dry, how) {
  if (!C || C.result) return campNo('over');
  if (name === 'emergency') return campEmergency(C, dry); // the shield filled at once for ore (src/campmend.js; card space-game-keys2-cruiser: it was a power setting that lasted ten seconds)
  if (name === 'power' || name === 'balance') return campPowerDo(C, name, arg, dry); // the ship's systems (below)
  if (arg === CAMP_TGT && (name === 'attack' || name === 'missiles')) return name === 'attack' ? campTgtAttack(C, how, dry) : campTgtMissile(C, dry); // the target A D S picked (src/camptarget.js): key 2 and Enter
  const t = campFind(C, arg), out = campWing(C);
  if (name === 'lane') return campRouteDo(C, arg, dry); // the pick at a fork in the road (src/camproute.js)
  if (name === 'convoy') return campConvoyOrder(C, arg, dry); // Tuck in, Hold here, Run for it, Carry on: the escorted ships (src/campconvoy.js)
  if (name === 'launch') {
    const n = C.bay.fighters - C.launchQ.length;
    if (n <= 0) return campNo(C.launchQ.length ? 'launching' : out.length ? 'baydry' : 'bay');
    if (dry) return campYes('launch');
    for (let i = 0; i < C.bay.fighters; i++) C.launchQ.push('fighter');
    C.bay.fighters = 0; C.orders.launch++; (C.repairs || []).forEach(r => { r.stay = false; }); // a fighter still being mended goes out too when it is whole
    return campYes('launch');
  }
  // Attack, Escort, Guard and Recall are the wing orders of src/campwing.js (campWingOrder) with no group and no target named: today's groups and today's answers
  if (name === 'attack') {
    if (!campWingReach(C, 'fighters')) return campNo(C.launchQ.length ? 'launching' : 'nofighters'); // the pilots in the bay take the order by launching (card space-game-keys-orders)
    if (t && t.kind === 'mother' && !campTarget(C, t)) return campNo('nomother');
    return campWingOrder(C, null, 'attack', t && t.kind === 'mother' ? 'mother' : null, how, dry);
  }
  if (name === 'escort') {
    if (!campWingReach(C, 'fighters')) return campNo(C.launchQ.length ? 'launching' : 'nofighters');
    if (!C.L.convoys.length) return campWingOrder(C, null, 'escort', null, how, dry); // no convoys in this level: Escort keeps the fighters close to the carrier
    const cv = t && t.kind === 'convoy' ? C.by[t.id] : t ? null : campNearest(campConvoys(C), C.carrier);
    if (!cv || cv.hp <= 0) return campNo('noconvoy');
    return campWingOrder(C, null, 'escort', cv.id, how, dry);
  }
  if (name === 'guard') return campWingOrder(C, null, 'guard', t && t.kind === 'place' ? 'place:' + t.id : t && t.kind === 'convoy' ? t.id : null, how, dry);
  if (name === 'recall') return campWingOrder(C, null, 'recall', null, how, dry);
  if (name === 'wing') return campWingText(C, arg, dry); // a group, a verb and a target in words: "fighters at the mothership", "all guard Ceres"
  if (name === 'reload') return campReloadDo(C, dry); // R: queue one missile to build, for ore (src/campmissilebuild.js)
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
    const ms = campMiners(C); if (!ms.length && campWingDocked(C, 'fighters').length) return campWingOrder(C, null, 'mine', null, how, dry); // the pilots in the bay go out to mine
    if (!ms.length) return campNo(C.launchQ.length ? 'launching' : 'nowing');
    if (!C.pickups.length && !C.rocks.some(r => r.hp > 0)) return campNo('noore');
    if (dry) return campYes('mine');
    ms.forEach(u => { u.order = { type: 'mine' }; u.move = null; });
    C.orders.mine++; return campYes('mine');
  }
  if (name === 'recharge') return campNo('shieldauto'); // the old pay-ore recharge (card space-game-shield-auto): the shield mends by itself now, and "recharge shields" says so
  if (name === 'build') return campNo('nobuild'); // nothing builds ships any more (card space-game-repair-with-ore): the strip and the voice still understand the word, and say what to do instead
  if (name === 'dock') return campDock(C, arg, dry); // src/campoutpost.js
  if (name === 'repair') return campMend(C, arg, dry); // the hull, anywhere (src/campmend.js)
  if (name === 'mendship') return campMendWard(C, arg, dry); // a ship you protect, when it is near
  return campNo('what');
}
// the ships that mine: the whole wing that is out. In the belt the fighters are the cruiser's mining drones; an attack order (key 2) turns them back to the fight
function campMiners(C) { return campWing(C, 'fighter'); }
// plain words as an order: { act: 'fleet_launch' | 'fleet_attack' | 'fleet_escort' | 'fleet_guard' | 'fleet_recall', arg } or null (the model reads it instead)
function campIntent(text) {
  const SC_FILLER = /^(?:(?:please|hey|ok|okay|computer|athena|can you|could you|would you|will you|i want to|i wanna|i need to|lets|let's|go ahead and|all|everyone)\s+)+/;
  let q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim().replace(SC_FILLER, '').replace(/\s+(please|now|right now|already)$/, '').trim();
  if (!q) return null;
  { // the convoy orders (card space-game-convoy-orders): "tuck in", "run for it", "carry on", and with a convoy word ("haulers hold", "hold the transport") hold: the plain "hold here" is not a convoy order. The words go to campConvoyOrder whole: it finds the verb and a ship's name
    const cw = /\b(?:convoys?|transport|haulers?|freighters?|cargo|miners?)\b/.test(q), wing = /\b(?:escort|attack|guard|mine|build|launch|recall|dock)\b/.test(q);
    if (/^(?:tuck|close up|snug up|take cover|get under (?:the |our )?(?:shield|cover))/.test(q) || (cw && !wing && /\btuck\b/.test(q))) return { act: 'fleet_convoy', arg: q };
    if (/^(?:run for it|make a run(?: for it)?)$/.test(q) || (cw && !wing && /\b(?:run for it|make a run|run|flee|full speed)\b/.test(q))) return { act: 'fleet_convoy', arg: q.indexOf('run') >= 0 || q.indexOf('flee') >= 0 || q.indexOf('full speed') >= 0 ? q : 'run for it' };
    if (/^(?:carry on|as you were|resume course|release the (?:convoy|haulers|transport))$/.test(q) || (cw && !wing && /\b(?:carry on|as you were|resume|release)\b/.test(q))) return { act: 'fleet_convoy', arg: q.indexOf('carry on') >= 0 ? q : 'carry on' };
    if (cw && !wing && (/^(?:convoys?|haulers?|transport|freighters?|miners?)\s+(?:hold|stop|halt|stay put|wait)\b/.test(q) || /^(?:hold|stop|halt)\s+(?:the |our )?(?:convoys?|haulers?|transport|freighters?|miners?)\b/.test(q))) return { act: 'fleet_convoy', arg: q };
  }
  { // a group named first, in words the old forms below would lose the group of: "all attack the mothership", "red squad guard the anomaly", "fighters hold at Ceres", "cancel the fighters" (src/campwing.js)
    const wp = typeof campWingParse === 'function' ? campWingParse(String(text).toLowerCase().replace(/^(?:(?:please|hey|ok|okay|computer|athena|can you|could you|would you|will you|go ahead and)\s+)+/, '')) : null;
    const same = wp && ((wp.group === 'fighters' && wp.verb === 'attack') || (wp.group === 'all' && (wp.verb === 'guard' || !wp.verb))); // the old forms mean the same: their own words and answers
    if (wp && (wp.verb || wp.target) && !same && !/^(?:launch|return|come|go|land|dock|retreat|fall|pull|stay|form|get them)\b/.test(wp.target) && !(wp.verb === '' && /^(?:cancel)$/.test(wp.target))) return { act: 'fleet_wing', arg: wp.verb === 'cancel' ? 'cancel ' + wp.group : (wp.group + ' ' + wp.verb + ' ' + wp.target).replace(/\s+/g, ' ').trim() };
  }
  q = q.replace(/^(?:the |our )?(?:fighters?|wing|squadron|ships)\s+(?=(?:attack|engage|guard|defend|protect|launch|recall|return|escort)\b)/, '');
  let m;
  if ((m = /^(?:(?:take|use|pick|choose|go|fly|run|send (?:her|it|them|the transport|the convoy|the haulers))\s+(?:by |along |down |via |on |through |over )?)?(?:the |our )?([a-z]+(?: [a-z]+)?)\s+(?:lane|route)$/.exec(q))) return { act: 'fleet_lane', arg: m[1] }; // "take the long lane", "go by the short lane", "long lane": the pick at a fork in the road (card space-game-scout-route)
  if (/^(?:reload|rearm|restock|rebuild|build|make)(?: (?:the|our|all|some|more|new))*(?: (?:missiles?|rockets?|rack|magazine|launcher|tubes?))?$/.test(q) && !/^(?:build|make|rebuild)$/.test(q)) return { act: 'fleet_reload', arg: '' }; // "reload", "reload missiles", "build more missiles": the rack is built up for ore (before the missiles line below: "reload missiles" fired one)
  if (/\b(?:missiles?|rockets?|torpedoe?s?)\b/.test(q)) return { act: 'fleet_missiles', arg: q.replace(/\b(?:fire|launch|shoot|send|loose|use|the|our|all|some|a|one|missiles?|rockets?|torpedoe?s?|with|at|on|to)\b/g, ' ').replace(/\s+/g, ' ').trim() }; // "fire missiles", "missiles at the mothership": before "launch", which is the bay
  if (/^(?:launch|scramble|deploy|open the bay|open the bay doors|bay doors|send out the (?:wing|fighters|ships|fleet)|launch the (?:wing|fighters|ships|fleet)|get them out)(?: now)?$/.test(q) || /^launch\b/.test(q)) return { act: 'fleet_launch', arg: '' };
  if ((m = /^(?:dock|land|put in|moor|berth)\s+(?:at|in|on|with|to)\s+(.+)$/.exec(q)) && !/^(?:the )?(?:carrier|cruiser|ship|base|bay)$/.test(m[1])) return { act: 'fleet_dock', arg: m[1].replace(/^(?:the |an? )/, '').replace(/^(?:outpost|station)$/, '') }; // "dock at Luna", "land at the lunar base", "dock at an outpost": the CARRIER docks at an outpost (card space-game-campaign-outposts); a bare "dock" or "land" is the wing's, below
  if ((m = /^retreat to (?!the (?:carrier|cruiser|ship)\b|base\b)(.+)$/.exec(q))) return { act: 'fleet_fly', arg: m[1] }; // "retreat to Luna": the carrier flies there by itself (the HUD's retreat line says the words); a bare "retreat" is the wing's
  if ((m = /^(?:recall|come home|come back|return(?: home| to the carrier| to base)?|land|dock|rtb|fall back|retreat|pull back|bring them (?:home|back))\b\s*(.*)$/.exec(q))) return { act: 'fleet_recall', arg: '' };
  // "power to shields" and "balance the power": typed words for a pip, only while the pips are on (CAMP.power.on; off in the game since card space-game-power-removed: they parse to nothing, so they are not an order the strip or the voice gives)
  if (CAMP.power.on && (m = /^(?:(?:more|extra|give) )?(?:power|energy)\s+(?:to|into|for|on)\s+(?:the |our )?([a-z]+)(?:\s+(?:from|out of|off)\s+(?:the |our )?([a-z]+))?$/.exec(q)) && campPowerSys(m[1]) >= 0) return { act: 'fleet_power', arg: CAMP_POWER_NAMES[campPowerSys(m[1])] + (m[2] && campPowerSys(m[2]) >= 0 ? ':' + CAMP_POWER_NAMES[campPowerSys(m[2])] : '') }; // "power to shields": a pip to it, from the system with the most or the one named
  if (CAMP.power.on && (/^(?:balance|reset|even out|equali[sz]e|level)\s+(?:the |our )?(?:power|systems|energy)$/.test(q) || /^(?:power|energy) balance$/.test(q))) return { act: 'fleet_balance', arg: '' };
  if (/^emergency\s+(?:shields?|power)$/.test(q) || /^(?:all )?power to shields? now$/.test(q)) return { act: 'fleet_emergency', arg: '' };
  if (/^(?:recharge|refill|restore|top up|repair|charge|power up)\b.*\bshields?\b/.test(q) || /^shields?\s+(?:up|back up|on)$/.test(q) || /^(?:recharge|refill)\b/.test(q)) return { act: 'fleet_recharge', arg: /earth|planet|home/.test(q) ? 'earth' : /carrier|\bship\b|\bme\b/.test(q) ? 'carrier' : '' };
  if (/^(?:repair|mend|fix|patch)\b.*\b(?:hull|ship|carrier|cruiser|damage)\b/.test(q) || /^(?:repair|mend|fix)$/.test(q)) return { act: 'fleet_repair', arg: '' }; // the hull, docked
  if ((m = /^(?:build|make|construct|produce|buy|order|get us|get me|add)\s+(?:me |us )?(.*)$/.exec(q)) && !/\b(?:shield|shields)\b/.test(q)) return { act: 'fleet_build', arg: m[1] };
  if (/\b(?:mine|mining|harvest|harvesting|gather ore|collect ore|collect the ore|scavenge|scavenging|salvage)\b/.test(q) && !/^(?:how|what|why|where)\b/.test(q)) return { act: 'fleet_mine', arg: '' };
  if ((m = /^(?:send|move|put|take|set)\s+(?:the |our )?(?:wing|fighters?|squadron)\s*(?:to|with|beside|for|on)?\s*(.*)$/.exec(q)) && /escort/.test(q)) return { act: 'fleet_escort', arg: m[1] };
  if ((m = /^(?:escort|cover|screen|protect|defend|guard|watch)\s+(?:the )?(.*(?:convoy|convoys|freighter|freighters|cargo|supplies).*)$/.exec(q))) return { act: 'fleet_escort', arg: m[1] };
  if ((m = /^(?:escort|cover)\s+(?:the )?(.+)$/.exec(q))) return { act: 'fleet_escort', arg: m[1] };
  if ((m = /^(?:guard|defend|protect|screen|cover|hold|form up on|stay with|stay near)\s*(.*)$/.exec(q))) return { act: 'fleet_guard', arg: m[1] };
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
  if (typeof campNavTick === 'function') campNavTick(C); // a burn that began by itself ends by itself when a hostile comes near (src/campnav.js)
  if (typeof campNavDrive === 'function') campNavDrive(C, dt); // the autopilot (src/campnav.js), when it is on, sets the carrier's input
  campPowerStep(C, dt); // the ship's systems: the emergency's end, the shield's cap and its mending, the low lines
  campLaserStep(C, dt); // the turrets' charge mends at the rate of the weapons' power
  campCarrier(C, dt);
  campLaunch(C);
  campRepairTick(C); // the fighters mended in the bay are whole again (src/camprepair.js)
  campDogPair(C); // the fighters and the raiders pair off, one on one (src/campdogfight.js)
  campFightPace(C); // a small ship near a foe flies and fires at the fight pace (card space-game-slower-fights)
  if (typeof campWingGuardStep === 'function') campWingGuardStep(C); // a squad guarding a ship that is lost or safe goes back to the cruiser, and says so (src/campwing.js)
  C.ships.forEach(u => { if (u.hp > 0 && u.kind !== 'carrier') campAI(C, u, dt); });
  campBullets(C, dt);
  if (typeof campTorpedoes === 'function') campTorpedoes(C, dt); // the torpedoes fly, hit and go off (src/camptorpedo.js)
  campBeam(C, dt);
  campMissiles(C, dt);
  campCaches(C);
  campAnomalies(C, dt);
  if (typeof campRivals === 'function') campRivals(C, dt); // the rival ships of the mission row (src/camprival.js)
  if (typeof campBeats === 'function') campBeats(C); // a saved miner's thanks (src/campbeats.js)
  if (typeof camp13Tick === 'function') camp13Tick(C); // mission 1.3's two radio lines: the turrets' key at the first raid, the last hauler falling behind (src/camp13lines.js)
  if (typeof campPirates === 'function') campPirates(C, dt); // the cues, the pirates that break off and run, and the ones that got away (src/camppirates.js)
  campRelic(C, dt);
  campRepair(C, dt);
  campEarth(C, dt);
  campPickups(C);
  campOreFull(C); // the store has filled: "Ore bay full.", once
  campMendTick(C, dt); // the hull and the ships you protect being mended (src/campmend.js)
  campLasers(C);
  campMissions_tick(C, dt);
  campWarn(C);
  if (typeof campSightStep === 'function') campSightStep(C); // the hostiles that come into sight for the first time are called on the radio (src/campsight.js)
  if (typeof campOutpostTick === 'function') campOutpostTick(C, dt); // the retreat line (src/campoutpost.js)
  if (typeof campFriRegister === 'function') campFriRegister(C); // every ship you protect has its number before the dead leave (card space-game-keys8-e-digit: a number is the ship's for the whole mission)
  C.ships = C.ships.filter(u => u.hp > 0 || (delete C.by[u.id], false)); // the dead leave the list (the scene was told by the boom event)
}

// convoys leave Earth and waves arrive, by the level's own clock
function campAhead(C, w) { // where a wave with `ahead` comes from: that far in front of a convoy along its road; a convoy gone (or none flying) and it comes from its own `from`, so a wave never spawns nowhere
  const f = w.along ? C.by['freighter-' + w.along] : campConvoys(C)[0];
  if (!f || f.hp <= 0 || !f.dest) return w.from ? { x: w.from[0], y: w.from[1] } : null;
  if (f.rt) { const q = campRouteAhead(C, f, w.ahead); if (q) return q; } // a convoy on a route: ahead along the road it will fly, round the fork and the bend of its lane
  const dx = f.dest.x - f.x, dy = f.dest.y - f.y, d = Math.hypot(dx, dy) || 1, k = Math.min(w.ahead, Math.max(0, d - 400)) / d;
  return { x: f.x + dx * k, y: f.y + dy * k };
}
function campSchedule(C) {
  if (C.arrivedAt == null) return; // nothing comes before the cruiser is at the mission's place
  const L = C.L, sec = campMissionClock(C);
  L.convoys.forEach((cv, i) => {
    if (C.convoys[i].started || sec < cv.at) return;
    C.convoys[i].started = true;
    const pl = campPlaces(C.level), to = pl[cv.to], from = cv.from ? pl[cv.from] : null;
    const a = from ? Math.atan2(to.y - from.y, to.x - from.x) : Math.atan2(to.y, to.x), sx = from ? from.x + Math.cos(a) * ((from.r || 60) + 50) : Math.cos(a) * (C.earth.r + 50), sy = from ? from.y + Math.sin(a) * ((from.r || 60) + 50) : Math.sin(a) * (C.earth.r + 50);
    const f = campSpawn(C, 'freighter', sx, sy); f.id = 'freighter-' + cv.id; C.by[f.id] = f; f.dest = { x: to.x, y: to.y }; f.rot = a; f.cname = cv.name || to.name; f.named = !!cv.name; // a convoy with a name of its own (Transport, Hauler 1) is a ship: its arrival and its loss read "Transport has arrived", not "The convoy has reached Transport" (the old lines name the place it flies to: Mars)
    f.cid = cv.id; f.from = { x: sx, y: sy }; f.lane = Math.hypot(to.x - sx, to.y - sy); f.vmax = (cv.speed || f.vmax) * CAMP.convoy.speedScale; // its own way: where it began and how long the road is (a wave can come by how far it has flown: on { lane }), and its own speed (a row's `speed`, else the table's)
    if (C.route) campRouteConvoy(C, f); // on a route the convoy flies the fork and the lane (src/camproute.js)
    campSay(C, cv.say || 'camp.say.convoy', { name: f.cname });
  });
  L.waves.forEach((w, i) => {
    const st = C.waves[i]; if (st.started) return;
    const prev = i > 0 ? C.waves[i - 1] : null, prevDead = !prev || (prev.started && !C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === i - 1));
    const T = CAMP.time.waves, due = (w.on ? campWaveOn(C, w.on) : sec >= w.at * T) && (!w.needClear || prevDead) && (!w.lane || campRouteWaveOk(C, w)); // a wave of a lane comes only to a convoy on that lane (src/camproute.js)
    const early = w.early != null && prev && prev.started && prevDead && sec - prev.at >= w.early * T && (!w.lane || campRouteWaveOk(C, w));
    if (!due && !early) return;
    st.started = true; st.at = sec;
    if (w.beat === 'distress' && !campFlag('distress')) return; // the distress call is switched off (the tuning panel): the wave is taken as passed and no pirate comes (src/campbeats.js)
    const goal = w.goal || 'earth', ahead = w.ahead != null ? campAhead(C, w) : null, org = ahead ? [ahead.x, ahead.y] : (w.from || [C.carrier.x + 2500, C.carrier.y]); // ahead: the wave comes out of the dark this many px in front of a convoy (its heading), the one named (along) or the first flying
    Object.keys(w.ships).forEach(kind => {
      for (let k = 0; k < w.ships[kind]; k++) { const a = campSpawn(C, kind, org[0] + campBetween(C, -300, 300), org[1] + campBetween(C, -300, 300)); if (a) { a.goal = goal; a.wave = i; a.rot = ahead ? Math.atan2(ahead.y - a.y, ahead.x - a.x) : Math.atan2(-a.y, -a.x); if (a.faction === 'pirate' || a.boat) { a.prey = w.prey || 'any'; if (w.breakAt != null && a.faction === 'pirate') a.breakAt = w.breakAt; } } }
    });
    if (w.mother) { const m = campSpawn(C, 'mother', w.mother[0], w.mother[1]); m.goal = 'earth'; m.wave = i; const hp = campMissionPlace(C) || { x: 0, y: 0 }; m.rot = Math.atan2(hp.y - m.y, hp.x - m.x); }
    if (w.ambush) C.events.push({ type: 'alarm' }); // the surprise: the scene sounds the alarm
    campSay(C, w.say, { n: i + 1 });
  });
  L.waves.forEach((w, i) => { const st = C.waves[i]; if (w.say2 && st.started && !st.said2 && sec - st.at >= (w.say2At || 5)) { st.said2 = true; campSay(C, w.say2, { n: i + 1 }); } }); // a second line, some seconds after the wave came
}

// ---------- the ship's systems: power to weapons, shields and engines (card space-game-campaign-systems; docs/CAMPAIGN.md "Ship systems") ----------
// C.power = { p: [w, s, e] (the pips in use now), base: [w, s, e] (the setting: what the player chose, what is saved), lowS, lowE }. (The emergency shields are not a power setting any more: campEmergency, src/campmend.js.)
// The pips are a budget of CAMP.power.budget (6), each system 0 to 4; the table CAMP.power says what a pip does, and at 2 / 2 / 2 every factor is 1: the numbers of before, to the bit.
//   campPowerFx(C)             the factors now: { delay, reload, cap, regen, speed, accel, turn, blink }     campShieldMax(C)  the shield's cap in points    campBlinkCooldown(C)  ms     campReload(C)  ms
//   campOrder(C, 'power', 'shields' | 'shields:weapons')   a pip to shields, from the system with the most or the one named;  'balance' is 2 / 2 / 2
//   campPowerStep(C, dt)       each tick: the shield held to its cap and mended by the shields' power, the low lines;      campPowerLoad() / campPowerSave(p)  the setting in this browser
const campPowerOk = a => Array.isArray(a) && a.length === 3 && a.every(v => Number.isInteger(v) && v >= 0 && v <= CAMP.power.max) && a[0] + a[1] + a[2] === CAMP.power.budget;
function campPowerNew(pips) { const p = CAMP.power.on && campPowerOk(pips) ? pips.slice() : CAMP.power.start.slice(); return { p, base: p.slice(), lowS: false, lowE: false }; }
function campPowerFx(C) {
  const K = CAMP.power, p = C && C.power && C.power.p ? C.power.p : K.start;
  return { delay: K.weapons.delay[p[0]], reload: K.weapons.reload[p[0]], cap: K.shields.cap[p[1]], regen: K.shields.regen[p[1]], speed: K.engines.speed[p[2]], accel: K.engines.accel[p[2]], turn: K.engines.turn[p[2]], blink: K.engines.blink[p[2]] };
}
const campShieldMax = C => CAMP.carrier.shield * campPowerFx(C).cap;
const campBlinkCooldown = C => CAMP.tech.blink.cooldown * campPowerFx(C).blink;
// B with no blink to make: '' when it goes, else the words (no technology yet, or the seconds left)
const campBlinkWhy = C => !campHas(C, 'blink') ? uiText('camp.say.noblink') : (C.t - C.blinkAt >= campBlinkCooldown(C) ? '' : uiText('camp.say.blinkwait', { s: Math.ceil((campBlinkCooldown(C) - (C.t - C.blinkAt)) / 1000) }));
const campReload = C => CAMP.missile.reload * campPowerFx(C).reload;
const campPowerSys = w => /^(?:weapons?|guns?|turrets?)$/.test(w) ? 0 : /^shields?$/.test(w) ? 1 : /^(?:engines?|thrusters?|drives?)$/.test(w) ? 2 : -1;
const CAMP_POWER_NAMES = ['weapons', 'shields', 'engines'];
function campPowerDo(C, name, arg, dry) {
  const P = C.power, K = CAMP.power;
  if (!K.on) return campNo('powerwhat'); // the pips are off (CAMP.power.on): nothing moves them. (The emergency shields are not a power setting any more: campEmergency, src/campmend.js, card space-game-keys2-cruiser)
  if (name === 'balance') { if (!dry) { P.base = K.start.slice(); P.p = K.start.slice(); C.orders.balance++; C.events.push({ type: 'power', p: P.p.slice() }); } return campYes('balance'); }
  const m = /^([a-z]+)(?::([a-z]+))?$/.exec(String(arg == null ? '' : arg).toLowerCase().trim()), to = m ? campPowerSys(m[1]) : -1, chosen = m && m[2] ? campPowerSys(m[2]) : -1;
  if (to < 0 || (m[2] && chosen < 0) || chosen === to) return campNo('powerwhat');
  if (P.p[to] >= K.max) return campNo('powermax');
  let from = chosen;
  if (from < 0) { for (let i = 0; i < 3; i++) if (i !== to && P.p[i] > 0 && (from < 0 || P.p[i] > P.p[from])) from = i; } // the system with the most (a tie: weapons, shields, engines)
  if (from < 0 || P.p[from] <= 0) return campNo('powernone');
  if (!dry) { P.p[from]--; P.p[to]++; P.base = P.p.slice(); C.orders.power++; C.events.push({ type: 'power', p: P.p.slice() }); }
  return campYes('power' + CAMP_POWER_NAMES[to]);
}
function campPowerStep(C, dt) {
  const P = C.power, K = CAMP.power; if (!P) return;
  const fx = campPowerFx(C), max = CAMP.carrier.shield * fx.cap;
  if (C.shield > max) C.shield = max; // a smaller cap takes the shield down to it; a bigger one does not fill it
  if (fx.regen > 0 && C.shield < max && C.t - (C.shieldHitAt === undefined ? -1e9 : C.shieldHitAt) >= K.shields.regenDelay) C.shield = Math.min(max, C.shield + fx.regen * dt);
  const f = max > 0 ? C.shield / max : 1;
  if (!P.lowS && f < K.low.shield) { P.lowS = true; campSay(C, 'camp.say.shieldlow'); } else if (P.lowS && f > K.low.rearm) P.lowS = false;
  if (!P.lowE && P.base[2] <= K.low.engines) { P.lowE = true; campSay(C, 'camp.say.enginelow'); } else if (P.lowE && P.base[2] > K.low.engines) P.lowE = false; // the setting, not an emergency's 1 pip
}
function campPowerLoad() { let p = CAMP.power.start.slice(); if (!CAMP.power.on) return p; campTry(() => { const raw = JSON.parse(localStorage.getItem(CAMP.store + '.power') || 'null'); if (campPowerOk(raw)) p = raw.slice(); }, 0); return p; }
function campPowerSave(p) { if (campPowerOk(p)) campTry(() => localStorage.setItem(CAMP.store + '.power', JSON.stringify(p)), 0); }
// The turrets' charge (card space-game-systems-gauges): C.charge, 0 to CAMP.tank.max. campLaserSpend(C) is a shot: true and the cost is paid, or false when there is not that much (C.dryAt is the clock of the last refusal).
// campLaserStep(C, dt) mends it at CAMP.tank.refill[the weapons' pips] a second and says so once when it falls low; campLaserFrac(C) is its share of the tank, campLaserRate(C) the charge a second it mends at now.
const campFiring = C => !!C.input.fire || campFlag('autofire'); // the turrets fire while Space is held, or always when the tuning panel's switch has them fire by themselves
const campLaserRate = C => CAMP.tank.refill[C && C.power && C.power.p ? C.power.p[0] : CAMP.power.start[0]];
const campLaserFrac = C => Math.max(0, Math.min(1, (C.charge === undefined ? CAMP.tank.max : C.charge) / CAMP.tank.max));
function campLaserSpend(C) {
  const k = CAMP.tank; if (C.charge === undefined) C.charge = k.max;
  if (!campFlag('laser')) { C.charge = k.max; return true; } // the charge is switched off (the tuning panel): a shot costs nothing and the tank is always full
  if (C.charge + 1e-9 < k.cost) { C.dryAt = C.t; return false; }
  C.charge = Math.max(0, C.charge - k.cost); return true;
}
// "Ore bay full." once when the store fills (card space-game-ore-bay-bigger); it can say it again after the store has been under CAMP.ore.fullAt of the cap
function campOreFull(C) {
  const k = CAMP.ore;
  if (!C.oreFull && C.ore >= k.cap - 1e-9) { C.oreFull = true; campSay(C, 'camp.say.orefull'); } else if (C.oreFull && C.ore < k.cap * k.fullAt) C.oreFull = false;
}
function campLaserStep(C, dt) {
  const k = CAMP.tank; if (C.charge === undefined) C.charge = k.max;
  if (!campFlag('laser')) { C.charge = k.max; C.chargeLow = false; return; }
  C.charge = Math.min(k.max, C.charge + campLaserRate(C) * dt);
  const f = C.charge / k.max;
  if (!C.chargeLow && f < k.low) { C.chargeLow = true; campSay(C, 'camp.say.lasersdry'); } else if (C.chargeLow && f > k.low * 2) C.chargeLow = false;
}

const campLane = (C, id) => id ? (C.lane[id] || 0) : Object.keys(C.lane).reduce((a, k) => Math.max(a, C.lane[k]), 0);
// when a wave that waits for an event starts: on { scanned: k } (k recon points scanned), { delivered: k } (k haulers arrived), { t: s } (s seconds in), { lane: f, convoy? } (a convoy has flown f of its road)
function campWaveOn(C, on) {
  if (on.scanned != null) return C.scan.filter(p => p.got).length >= on.scanned;
  if (on.delivered != null) return C.delivered >= on.delivered;
  if (on.t != null) return campMissionClock(C) >= on.t;
  if (on.lane != null) return campLane(C, on.convoy) >= on.lane; // the share (0 to 1) of its road a convoy has flown: the one named (on.convoy: its id), else the farthest of them; nothing while no convoy has left
  if (on.cue != null) return C.cues[on.cue] != null; // a named cue a script fired (campCue, src/camppirates.js)
  if (on.cleared != null) { const w = /^wave:(\d+)$/.exec(on.cleared); return !!w && !!C.waves[+w[1]] && C.waves[+w[1]].started && !C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === +w[1]); } // a wave is cleared: it came and none of it is left (a pirate that ran away is gone, not left)
  return false;
}

// the carrier: your stick
function campCarrier(C, dt) {
  const c = C.carrier, k = CAMP.carrier, inp = C.input; if (c.hp <= 0) return;
  const fx = campPowerFx(C); // the engines' power: 1 at the default, so the numbers below are today's
  c.rot += (inp.turn || 0) * k.turn * fx.turn * dt;
  const th = Math.max(0, Math.min(1, inp.thrust || 0));
  const f = (C.nav && C.nav.on && C.nav.fast ? (C.nav.burn || CAMP.nav.fast) : 1) * (campHas(C, 'overdrive') ? CAMP.tech.overdrive.speed : 1); // the map's Fast: a burn, while the autopilot flies (campNavGo: N.burn, from campNavBurn)
  c.vx += Math.cos(c.rot) * k.accel * fx.accel * f * th * dt; c.vy += Math.sin(c.rot) * k.accel * fx.accel * f * th * dt;
  const keep = Math.pow(inp.brake ? k.brakeDrag : k.drag, dt); c.vx *= keep; c.vy *= keep;
  const top = k.speed * fx.speed * f, sp = Math.hypot(c.vx, c.vy); if (sp > top) { c.vx *= top / sp; c.vy *= top / sp; }
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (inp.blink && campHas(C, 'blink') && C.t - C.blinkAt >= campBlinkCooldown(C)) { C.blinkAt = C.t; c.x += Math.cos(c.rot) * CAMP.tech.blink.dist; c.y += Math.sin(c.rot) * CAMP.tech.blink.dist; C.events.push({ type: 'blink', x: c.x, y: c.y }); }
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
  const k = CAMP.carrier, tu = C.turrets && C.turrets[i];
  let base = k.stagger ? i * k.pdDelay / k.mounts.length : 0;                    // the first slot: this turret's place on the grid
  if (slot > 0 && tu && tu.base !== undefined) base = tu.base + k.pdDelay * campPowerFx(C).delay; // the next: one interval after the last, at the interval of NOW (the weapons' power): a change bends the grid, it does not jump it. At the default it is slot * pdDelay, to the bit
  if (tu) tu.base = base;
  return base + (k.jitter ? (C.turretRng() * 2 - 1) * k.jitter : 0);
}
// A turret fires only at its own slot: when the slot comes it shoots if it has an alien in reach and Space is held, and goes on to the next slot either way (a slot it could not use is
// let go, so there is no catch-up burst when Space is pressed or an alien comes into reach). One shot per turret per cycle, whatever the stagger: the shots a second are the same.
function campTurrets(C) {
  const c = C.carrier, k = CAMP.carrier, beam = campHas(C, 'beam'), reach = campReach(C), dmg = k.pd * (beam ? CAMP.tech.beam.damage : 1) * (C.turretMul || 1), al = campAliens(C); // turretMul: the heavier turret of a looted cache (src/campanomaly.js)
  campTurretPlace(C);
  C.turrets.forEach((tu, i) => {
    let best = null, bd = reach; al.forEach(u => { const d = campDist(u, tu) - u.r; if (d <= bd) { bd = d; best = u; } });
    if (C.torpedoes && C.torpedoes.length) { const tp = campTorpedoPick(C, tu, reach); if (tp && (!best || tp.d <= bd + CAMP.torpedo.torp.bias)) best = tp.t; } // a torpedo in reach is shot before an alien that is nearer by less than torp.bias (src/camptorpedo.js)
    tu.target = best ? best.id : ''; if (best) tu.aim = campLead(C, tu, best);
    let rock = null; // no alien in reach: the same lasers cut the nearest rock (docs/CAMPAIGN.md, Mining)
    if (!best) { let rd = reach; C.rocks.forEach(r => { const d = campDist(r, tu) - r.r; if (r.hp > 0 && d <= rd) { rd = d; rock = r; } }); if (rock) tu.aim = Math.atan2(rock.y - tu.y, rock.x - tu.x); }
    tu.rock = rock ? rock.id : '';
    if (C.t < tu.at) return;
    const go = !!(best || rock) && campFiring(C) && campLaserSpend(C); // a shot at something in reach spends charge; with none left the slot is let go, so the turrets fire as fast as the charge mends
    if (rock && go) {
      tu.shotAt = C.t; campRockHit(C, rock, k.pd * k_laser_turret(C)); C.laserNow.push({ from: c.id, to: rock.id, kind: 'rock' }); C.events.push({ type: 'laser', src: 'turret', i, x: tu.x, y: tu.y, tx: rock.x - Math.cos(tu.aim) * rock.r * 0.6, ty: rock.y - Math.sin(tu.aim) * rock.r * 0.6, rock: rock.id }); // the beam of this turret lands on the rock's near side
    }
    if (best && go) {
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
  const on = campHas(C, 'beam') && campFiring(C) && C.carrier.hp > 0 && C.turrets.some(t => t.target);
  C.beamT = on ? Math.min(CAMP.beamHum.rise, (C.beamT || 0) + dt) : Math.max(0, (C.beamT || 0) - dt * 3);
}
function campBeamState(C) {
  const off = { kind: '', level: 0, rise: 0 }, k = CAMP.beamHum;
  if (!C || C.result || C.carrier.hp <= 0) return off;
  if (campHas(C, 'beam') && campFiring(C) && C.turrets.some(t => t.target)) return { kind: 'turrets', level: 1, rise: Math.min(1, (C.beamT || 0) / k.rise) };
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
function campLaunch(C, again, order, squad) { // again: the kind of a fighter that was mended aboard (src/camprepair.js): it goes out at once, with the order it had and in the squad it was in
  if (!again && (!C.launchQ.length || C.t < C.nextLaunch || C.carrier.hp <= 0)) return;
  C.nextLaunch = C.t + CAMP.bay.launchEvery;
  const kind = again || C.launchQ.shift(), c = C.carrier, side = (C.launched % 2 ? 1 : -1), m = CAMP.bay.mouth, cs = Math.cos(c.rot), sn = Math.sin(c.rot); // out of the mouth of a hangar pod, one side and then the other
  const u = campSpawn(C, kind, c.x + cs * m[0] - sn * side * m[1], c.y + sn * m[0] + cs * side * m[1]); C.launched++;
  u.vx = c.vx + Math.cos(c.rot) * 140; u.vy = c.vy + Math.sin(c.rot) * 140; u.rot = c.rot;
  if (squad && kind === 'fighter') { u.squad = squad; campPilotSet(C, u); } // a pilot mended aboard flies again as itself, in its own squad
  u.order = order || { type: 'guard', at: { kind: 'carrier' } };
  C.events.push({ type: 'launch', id: u.id, kind });
  return u;
}
// THE PILOTS START OUT (card space-game-keys-orders; Troy, 23 Nov 2026: "pilots start each mission already out beside the cruiser"; there is no Launch key or row): the bay is emptied at the start of a mission, the three pilots leave it at once and guard the cruiser.
// A pilot that is recalled later lands and waits in the bay, and an order to it launches it (src/campwing.js campWingDocked). The Launch order itself (the strip, the voice) is still there for a bay that has ships.
function campStartOut(C) {
  if (!CAMP.bay.startOut) return; // the old start (the pilots in the bay): a test of the bay says so
  const n = C.bay.fighters; for (let i = 0; i < n; i++) campLaunch(C, 'fighter');
  C.bay.fighters = 0; C.nextLaunch = 0;
}

// resource caches (level 2): any ship of yours that comes close picks one up
function campCaches(C) {
  C.caches.forEach(k => {
    if (k.got || k.carried) return;
    if (!C.ships.some(u => u.team === 'earth' && u.hp > 0 && Math.hypot(u.x - k.x, u.y - k.y) <= CAMP.cache.radius)) return;
    k.got = true; C.cachesGot++; if (k.ore) C.ore = Math.min(CAMP.ore.cap, C.ore + k.ore); C.events.push({ type: 'cache', x: k.x, y: k.y }); // a cache on a lane holds ore (src/camproute.js)
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
  if (u.rival) return campRivalAI(C, u, dt); // a rival ship fights in phases (src/camprival.js)
  if (u.boat) return campTorpedoBoatAI(C, u, dt);
  if (u.faction === 'pirate') return campPirateAI(C, u, dt);
  if (u.team === 'neutral') return campTrafficAI(C, u, dt);
  if (u.team === 'alien') return campAlienAI(C, u, dt);
  return campWingAI(C, u, dt);
}
function campConvoyAI(C, u, dt) {
  if (u.rt) return campRouteFly(C, u, dt); // on a route (a fork in the road): src/camproute.js
  const d = campDist(u, u.dest), ang = Math.atan2(u.dest.y - u.y, u.dest.x - u.x);
  if (u.cid != null && u.lane > 0) C.lane[u.cid] = Math.max(C.lane[u.cid] || 0, Math.max(0, Math.min(1, 1 - (d - 90) / u.lane))); // how much of its road it has flown (the best it has done: the arrival removes the ship, the share stays)
  if (d < 90) { if (u.cid != null) C.lane[u.cid] = 1; C.delivered++; u.hp = 0; u.arrived = true; C.events.push({ type: 'arrive', x: u.x, y: u.y, id: u.id }); campSay(C, u.named ? 'camp.say.shiparrived' : 'camp.say.delivered', { name: campConvoyName(u) }); return; }
  if (u.cord && typeof campConvoyStep === 'function') return campConvoyStep(C, u, ang, dt); // under an order (Tuck in, Hold here, Run for it: src/campconvoy.js)
  u.rot = ang; u.vx = Math.cos(ang) * u.vmax; u.vy = Math.sin(ang) * u.vmax; u.x += u.vx * dt; u.y += u.vy * dt;
}

// an alien: goes for its goal (Earth, or a convoy), turns on whatever hits it for a few seconds, else on the nearest ship of yours that comes close
function campTowerAI(C, u, dt) { // a gun on a post: turns on the nearest of your ships inside its range and fires
  const k = CAMP.tower, tgt = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, k.range); if (!tgt) return;
  const aim = Math.atan2(tgt.y - u.y, tgt.x - u.x); u.rot = campRot(u.rot, aim, k.turn * dt);
  if (C.t > u.nextShot && Math.abs(campWrap(aim - u.rot)) < 0.12) { u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]); campBullet(C, u, u.rot, k.bullet, k.damage * C.dmgS, 1900, 'alien', u.r); }
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
  if (!tgt) { const near = campDogFoe(C, u, campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, def.engage * 0.7)); if (near) { tgt = near; if (near !== C.carrier) u.lost = false; } } // one of your other ships in reach: it is on that ship (the carrier is the leash's: campPursuit)
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
  const dog = !isEarth && campDogOn(C, u, tgt), m = dog ? campDogSteer(C, u, tgt, def.bullet * C.shot) : campSteer(C, u, def, dist, target, u.vx - tv.x, u.vy - tv.y); // a raider against a fighter is a dogfight (src/campdogfight.js)
  if (dog) campDogMove(C, u, m, dt); else campMove(u, m.ang, m.face, dt);
  if (m.fire && dist < def.range + (isEarth ? C.earth.r : 0) && C.t > u.nextShot && Math.abs(campWrap((dog ? m.aim : target) - u.rot)) < def.aim) {
    u.nextShot = C.t + campFightGap(u, campBetween(C, def.shot[0], def.shot[1]));
    const n = def.spread || 1;
    for (let i = 0; i < n; i++) campBullet(C, u, u.rot + (i - (n - 1) / 2) * 0.17, def.bullet * C.shot, def.dmg * C.dmgS, 1800, 'alien', 14);
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
  const k = CAMP.mother, home = campMissionPlace(C) || (C.earth ? C.earth : { x: 0, y: 0 }), toE = Math.atan2(home.y - u.y, home.x - u.x), dE = Math.hypot(u.x - home.x, u.y - home.y); // it comes in on the mission's place (Earth, else the origin)
  if (dE > k.holdAt) campMove(u, toE, toE, dt, 0.5); else { u.vx *= Math.pow(0.4, dt); u.vy *= Math.pow(0.4, dt); u.x += u.vx * dt; u.y += u.vy * dt; }
  const tgt = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, k.range);
  if (tgt && C.t > u.nextShot) {
    u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]);
    const aim = Math.atan2(tgt.y - u.y, tgt.x - u.x);
    for (let i = 0; i < k.shots; i++) campBullet(C, u, aim + (i - (k.shots - 1) / 2) * 0.14, k.bullet, k.damage * C.dmgS, 2400, 'alien', u.r);
  } else if (!tgt && dE < k.holdAt + 400 && C.t > u.nextShot && Math.hypot(u.x, u.y) < k.holdAt + 400) { // nothing of yours near: it shells Earth
    u.nextShot = C.t + campBetween(C, k.delay[0], k.delay[1]) * 1.5;
    for (let i = 0; i < k.shots; i++) campBullet(C, u, toE + (i - (k.shots - 1) / 2) * 0.1, k.bullet, k.damage * C.dmgS, 4000, 'alien', u.r);
  }
  if (C.t >= C.motherSpawn) {
    C.motherSpawn = C.t + k.spawnEvery;
    if (C.ships.filter(s => s.team === 'alien' && s.kind === 'raider' && s.fromMother && s.hp > 0).length < k.spawnMax) { const r = campSpawn(C, 'raider', u.x, u.y); if (r) { r.fromMother = true; r.goal = 'earth'; r.wave = u.wave; } }
  }
}

// a ship of yours, by its order (the fighters)
function campWingAI(C, u, dt) {
  const k = CAMP[u.kind], c = C.carrier, o = u.order || { type: 'guard', at: { kind: 'carrier' } }, aliens = campAliens(C);
  let foe = null, home = null, anchor = c; // anchor: what the pilot guards (the leash is measured from it): the cruiser unless the guard order says another ship, a place or a point
  const towed = campTowSet(C, u, aliens); // a burn takes the wing with it (src/campnav.js has the rule): a ship with no hostile near is towed
  if (campRepairRun(C, u, dt)) return; // a fighter under 30 percent hull breaks off, flies home and lands to be mended, whatever its order (src/camprepair.js)
  if (o.type === 'recall') {
    if (campDist(u, c) < CAMP.bay.dockAt) { u.hp = 0; u.docked = true; C.bay.fighters++; C.events.push({ type: 'dock', id: u.id }); return; }
    return campWingHome(C, u, dt);
  }
  if (towed) { const s = campFlightSlot(C, u, c); return campStation(u, s, dt, campDist(u, s) > CAMP.flight.catchUp ? null : s.face); } // under a burn: in formation on the cruiser, at its speed, whatever the order (it is kept)
  if (o.type === 'attack') {
    foe = o.target && C.by[o.target] && C.by[o.target].hp > 0 ? C.by[o.target] : campFlightCover(C, u) || campDogFoe(C, u, campNearest(aliens, u)); // (a wingman covers its leader first: src/campflight.js) // a named alien is the order's; with none named, a fighter flies at its partner (src/campdogfight.js)
    if (!foe) home = c; // nothing left to hit: back to the carrier's side
  } else if (o.type === 'escort') {
    const cv = C.by[o.target];
    if (!cv || cv.hp <= 0) { u.order = { type: 'guard', at: { kind: 'carrier' } }; return; }
    foe = campNearest(aliens, cv, 650); if (!foe) home = campFlightSlot(C, u, cv); // beside the convoy ship, in the squad's formation (src/campflight.js), not round it
  } else if (o.type === 'hold') { // (src/campwing.js) fly to the point and stay there: brake, turn to what is in range and fire
    const hp = o.at || c; if (campDist(u, hp) > CAMP.wing.holdAt) return campSeek(u, hp.x, hp.y, dt);
    const fo = campNearest(aliens, u, k.range + 40), keep = Math.pow(0.04, dt); u.vx *= keep; u.vy *= keep; u.x += u.vx * dt; u.y += u.vy * dt;
    if (fo) { const face = Math.atan2(fo.y - u.y, fo.x - u.x); u.rot = campRot(u.rot, face, u.turn * dt * 2); campWingFire(C, u, k, fo, campDist(u, fo), face, true); }
    return;
  } else if (o.type === 'fetch') { // (src/campwing.js) fly over the ore or the cache (a ship of ours takes what it touches), fighting what comes within 320 px; when it is gone, back to guarding the carrier
    const ft = campWingLive(C, o.tg); if (!ft || (ft.kind === 'cache' && C.caches[+String(ft.id).slice(6)] && C.caches[+String(ft.id).slice(6)].got)) { u.order = { type: 'guard', at: { kind: 'carrier' } }; return; }
    foe = campNearest(aliens, u, 320); if (!foe) home = ft;
  } else if (o.type === 'mine') { // fight what comes within 320 px; else take a chunk or a wreck lying about, or cut the nearest rock (a laser from the ship); with none, wait beside the carrier in formation for more
    foe = campNearest(aliens, u, 320);
    const safe = r => !aliens.some(a => campDist(a, r) < CAMP.ore.danger), want = o.target ? C.rocks.find(r => r.id === o.target && r.hp > 0) || C.pickups.find(q => q.id === o.target) : null; // a rock or ore named by the order, while it is there
    const pk = want ? (C.pickups.indexOf(want) >= 0 ? want : null) : campNearest(C.pickups.filter(safe), u), rk = want ? (C.pickups.indexOf(want) >= 0 ? null : want) : campNearest(C.rocks.filter(r => r.hp > 0 && safe(r)), u);
    if (!foe) {
      if (pk && (!rk || campDist(pk, u) <= campDist(rk, u) + 150)) home = pk; // ore lying about first: fly over it
      else if (rk) { // a rock: go to the laser's hold distance from it and cut it
        const dx = u.x - rk.x, dy = u.y - rk.y, d = Math.hypot(dx, dy) || 1, L = CAMP.laser;
        home = { x: rk.x + dx / d * L.hold, y: rk.y + dy / d * L.hold, vx: 0, vy: 0 };
        if (d - rk.r <= L.range) { campRockHit(C, rk, L.dps * (u.str || 1) * (C.dt || CAMP.step)); C.laserNow.push({ from: u.id, to: rk.id, kind: 'rock' }); u.rot = campRot(u.rot, Math.atan2(rk.y - u.y, rk.x - u.x), 0.4); C.events.push({ type: 'laser', src: 'drone', id: u.id, x: u.x, y: u.y, tx: rk.x + dx / d * rk.r * 0.6, ty: rk.y + dy / d * rk.r * 0.6, rock: rk.id }); }
      } else home = campFlightSlot(C, u, c); // nothing to mine: beside the cruiser, in formation (it was a circle round it)
    }
  } else { // guard: a flight holds its slots beside a point (the carrier, a place, a convoy; src/campflight.js); an alien that comes within reach of it, or of this ship, is fought, and the flight flies back to its slots when it is gone
    const at = o.at || { kind: 'carrier' }, p = at.kind === 'carrier' ? c : at.kind === 'place' ? campPlaces(C.level)[at.id] : at.kind === 'point' ? at : at.kind === 'anomaly' ? (C.anoms || []).find(a => 'anom:' + a.id === at.id) || c : C.by[at.id] || c; // an anomaly: the squad flies to it (src/campanomaly.js)
    anchor = p;
    foe = campNearest(aliens, p, CAMP.flight.reach) || campNearest(aliens, u, CAMP.flight.self); if (foe) foe = campDogFoe(C, u, foe, 1000); foe = campFlightCover(C, u) || foe; // a wingman covers its leader first (src/campflight.js) // a partner within reach is the one it fights
    if (!foe) home = campFlightSlot(C, u, p); // no threat: hold the slot beside what is guarded, at its speed and heading (src/campflight.js); it was a circle round it
  }
  if (foe && CAMP.flight.leash > 0 && (o.type === 'guard' || (o.type === 'attack' && foe.running)) && campDist(u, anchor) > CAMP.flight.leash) { // THE LEASH (CAMP.flight.leash): too far from what it guards, after a runner (any order that attacks) or a foe a guarding pilot picked itself: break off and fly back to the place. A pilot ordered to attack keeps after any foe that is still fighting, named or picked, however far (it is sent at the pirates at a miner 3,000 px from the cruiser)
    foe = null; home = campFlightSlot(C, u, anchor);
    if (o.type === 'attack') u.order = { type: 'guard', at: { kind: 'carrier' } }; // the attack order was on a runner: it is over, or it would send the pilot out again the next frame
  }
  if (foe) {
    const dx = foe.x - u.x, dy = foe.y - u.y, dist = Math.hypot(dx, dy), target = Math.atan2(dy, dx);
    const dog = campDogOn(C, u, foe), m = dog ? campDogSteer(C, u, foe, k.bullet * C.shot) : campStrafe(C, u, foe, dist, target); // a duel is flown as a dogfight (src/campdogfight.js), a bigger ship is strafed in runs (src/campflight.js), neither goes round it
    if (dog) campDogMove(C, u, m, dt); else campMove(u, m.ang, m.face, dt, m.thrust);
    if (campWingFire(C, u, k, foe, dist, dog ? m.aim : target, m.fire) && m.burst) u.nextShot = C.t + (u.nextShot - C.t) * m.burst; // the guns fire in a burst on a run in
    u.move = u.move || null;
  } else if (home) { if (home.fly) campStation(u, home, dt, campDist(u, home) > CAMP.flight.catchUp ? null : home.face); else campSeek(u, home.x + (home.vx || 0) * 0.2, home.y + (home.vy || 0) * 0.2, dt); } // a slot of a flight is flown to at its own speed, the nose its way
}

// one shot of a fighter, if it may fire, the gun is on the target and in range
function campWingFire(C, u, k, foe, dist, target, may) {
  if (!(may && dist < k.range + (foe.r || 0) && C.t > u.nextShot && Math.abs(campWrap(target - u.rot)) < k.aim)) return false;
  u.nextShot = C.t + campFightGap(u, campBetween(C, k.delay[0], k.delay[1]));
  campBullet(C, u, u.rot, k.bullet * C.shot, k.damage * (u.str || 1), 1400, 'earth', 14); C.events.push({ type: 'wingshot', x: u.x, y: u.y, kind: u.kind, id: u.id }); // the wing's gun has a sound of its own (the scene scales it by the distance)
  return true;
}

// home to the cruiser: the way to a point (a ship on its way to land), and under a burn, to the cruiser's own velocity too, so that it can land on it (src/campaign.js campTowSet)
function campWingHome(C, u, dt) { const c = C.carrier; return u.tow > 1 ? campStation(u, { x: c.x, y: c.y, vx: c.vx, vy: c.vy }, dt) : campSeek(u, c.x, c.y, dt); }
// fly to a place and take its velocity (the formation): the ship's wish is the place's own velocity plus the way to it
function campStation(u, p, dt, face) {
  const dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), want = Math.min(u.vmax, d * 1.6);
  const vx = (p.vx || 0) + Math.cos(ang) * want, vy = (p.vy || 0) + Math.sin(ang) * want, ex = vx - u.vx, ey = vy - u.vy;
  campMove(u, Math.atan2(ey, ex), face == null ? (d > 40 ? ang : u.rot) : face, dt, Math.min(1, Math.hypot(ex, ey) / 120));
}

// shots fly and hit: a step of a shot is tested against the circle it crosses, so a fast shot cannot skip a small ship
function campBullets(C, dt) {
  const alive = C.ships.filter(u => u.hp > 0), el = alive.filter(u => u.team === 'earth' || u.team === 'neutral'), al = alive.filter(u => u.team === 'alien'); // el: what the hostile side's shots can hit (yours and the neutrals); a neutral's own shots, like yours, hit the hostile side
  C.bullets.forEach(b => {
    if (b.dead) return;
    const px = b.x, py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt * 1000;
    if (b.life <= 0) { b.dead = true; return; }
    const targets = b.team === 'earth' || b.team === 'neutral' ? al : el;
    for (const u of targets) {
      if (u.hp <= 0) continue;
      if (campSegHit(px, py, b.x, b.y, u.x, u.y, u.r + 2)) {
        if (b.beam) { b.hit = b.hit || {}; if (b.hit[u.id]) continue; b.hit[u.id] = true; } // a beam goes through every ship in its line, but hurts each one once (it hurt a big one every step it was inside: 21 times as much on the mothership)
        campHurt(C, u, b.dmg, b.from); if (!b.beam) { b.dead = true; return; }
      }
    }
    if (C.torpedoes && C.torpedoes.length && (b.team === 'earth' || b.team === 'neutral') && campTorpedoShot(C, b, px, py)) return; // a torpedo in the way (src/camptorpedo.js)
    if (C.earth && b.team === 'alien' && campSegHit(px, py, b.x, b.y, C.earth.x, C.earth.y, C.earth.r)) { // Earth is hit (a level with no Earth has none to hit)
      b.dead = true; if (!C.god) C.earth.shield -= b.dmg * CAMP.alien.earthDamage; C.earth.hitAt = C.t; C.events.push({ type: 'earthhit', x: b.x, y: b.y }); // god mode (a debug key, src/campdebug.js): Earth's shield does not fall either
      if (C.earth.shield <= 0) { C.earth.shield = 0; if (C.earth.loseWhy === 'base') campEnd(C, 'lost', 'base'); else campEnd(C, 'lost', 'earth'); }
    }
  });
  C.bullets = C.bullets.filter(b => !b.dead);
}

// ---------- the missile launcher (card space-game-campaign-missiles; the numbers are CAMP.missile) ----------
// C.missiles is the magazine: a plain number. It does NOT fill itself: a missile is built for CAMP.missile.cost ore, by itself at 0 and one more for each press of R (src/campmissilebuild.js); campMissileAdd (the loot) can fill it up to `max`.
// A missile goes for its target, turning at most `turn` rad/s; when the target is gone it takes the mothership or the nearest big ship in reach, else it flies on until its fuel is out.
// Its fuze goes off near a big ship (never a raider or a drone on the way) OR near the ship it was fired at, whatever its size (card space-game-missiles-miss: a missile fired at a raider or a skiff flew through it and never went off: 0 hits in 10), and every alien within `blast` is hurt: a big ship `big`, any other `small`.
const campBig = u => CAMP.missile.bigKinds.indexOf(u.kind) >= 0;
function campMissileTarget(C, from) { // the mothership if it is in reach, else the nearest big alien in reach (of `from`: the carrier unless a missile asks)
  const p = from || C.carrier, big = campAliens(C).filter(u => campBig(u) && campDist(u, p) <= CAMP.missile.lock);
  return big.find(u => u.kind === 'mother') || (typeof campTorpedoLock === 'function' && campTorpedoLock(C, p)) || campNearest(big, p) || null; // a torpedo inside torp.lock goes before the nearest big ship (src/camptorpedo.js)
}
function campFire(C, tg) { // one missile out of the tube: the magazine is a missile less, the launcher cycles
  const k = CAMP.missile, c = C.carrier;
  C.missiles--; C.nextRocket = C.t + k.delay; // (the magazine does not fill itself any more: at 0 the ship builds one for ore, R builds the rack; src/campmissilebuild.js)
  const m = { id: 'missile-' + (++C.rocketId), x: c.x + Math.cos(c.rot) * c.r, y: c.y + Math.sin(c.rot) * c.r, rot: c.rot, sp: k.launch, vx: 0, vy: 0, life: k.life, target: tg ? tg.id : '' };
  C.rockets.push(m); C.events.push({ type: 'missile', x: m.x, y: m.y, id: m.id });
  return m;
}
function campMissileAdd(C, n) { // the ore code: n more missiles into the magazine, up to `max`; how many went in
  const k = CAMP.missile, was = C.missiles; C.missiles = Math.max(0, Math.min(k.max, was + Math.floor(n || 0)));
  return C.missiles - was; // (a build already paid for goes on and lands in the rack: campMissileStep)
}
function campMissiles(C, dt) {
  const k = CAMP.missile;
  campMissileStep(C); // the build and the rack: a missile costs ore, and the magazine does not fill itself (card space-game-missiles-cost-ore; src/campmissilebuild.js)
  C.rockets.forEach(m => {
    if (m.dead) return;
    m.life -= dt * 1000;
    let tg = m.target ? C.by[m.target] : null;
    if (!tg || tg.hp <= 0) { tg = campMissileTarget(C, m); m.target = tg ? tg.id : ''; }
    if (tg) m.rot = campRot(m.rot, Math.atan2(tg.y - m.y, tg.x - m.x), k.turn * dt);
    m.sp = Math.min(k.speed, m.sp + k.accel * dt); m.vx = Math.cos(m.rot) * m.sp; m.vy = Math.sin(m.rot) * m.sp;
    const px = m.x, py = m.y; m.x += m.vx * dt; m.y += m.vy * dt;
    const hit = C.ships.find(u => u.team === 'alien' && u.hp > 0 && (campBig(u) || u.id === m.target) && campSegHit(px, py, m.x, m.y, u.x, u.y, u.r + k.fuze)) || (C.torpedoes && C.torpedoes.length ? campTorpedoFuze(C, px, py, m) : null); // a torpedo sets the fuze off too
    if (hit) { // it goes off: everything near it is hurt, a big ship most
      m.dead = true; C.events.push({ type: 'mboom', x: m.x, y: m.y, r: k.blast });
      campAliens(C).forEach(u => { if (campDist(u, m) <= k.blast + u.r) campHurt(C, u, campBig(u) ? k.big : k.small, C.carrier.id); });
      if (C.torpedoes && C.torpedoes.length) campTorpedoBlast(C, m, k.blast, k.big); // a torpedo in the blast is gone
    } else if (m.life <= 0) { m.dead = true; C.events.push({ type: 'mfizzle', x: m.x, y: m.y, id: m.id }); }
  });
  C.rockets = C.rockets.filter(m => !m.dead);
}

// ---------- tech, story and the save ----------
function campTechChoices(level, P) { return Object.keys(CAMP.tech).filter(id => CAMP.tech[id].after === level && (id !== 'blink' || (typeof CAMP_BLINK === 'undefined' || CAMP_BLINK.on))).concat(P ? campAnomTechs(P.found, P.techs) : []); } // the level's own, then the items looted from the cloaked caches that are not picked yet (src/campanomaly.js)
function campPick(P, id) {
  if (!CAMP.tech[id] || P.techs.indexOf(id) >= 0) return false;
  P.techs.push(id); return true;
}
// the story lines of a level, before or after it. revealed: the ending has been seen (the saved flag), so a level that has lines of its own for it (camp.lN.when.r.n) says those instead
function campStory(level, when, revealed) {
  const out = [], has = k => Object.prototype.hasOwnProperty.call(UI_TEXT, k), base = 'camp.l' + level + '.' + when + '.', pre = revealed && has(base + 'r.1') ? base + 'r.' : base;
  for (let n = 1; n <= 6; n++) if (has(pre + n)) out.push(uiText(pre + n));
  return out;
}
// SPOILER (card space-game-campaign-outpost-reveal): level 3 is an outpost, not their home world, and the player finds out only after winning. campReveal(true) gives the level and its place their
// true names (CAMP.levels[3].reveal), campReveal(false) the old ones; the scene calls it from the saved flag when it starts and when the ending shows. Nothing before the flag says outpost.
function campReveal(on) {
  const L = CAMP.levels[3], R = L && L.reveal; if (!R || !L.places || !L.places.home) return false;
  if (!R.was) R.was = { name: L.name, place: L.places.home.name };
  L.name = on ? R.name : R.was.name; L.places.home.name = on ? R.place : R.was.place;
  return !!on;
}
// the ending's lines (content/text/campaign-reveal.md): this is not their home, the war is not over, the star the data points to
function campEnding() {
  const R = (CAMP.levels[3] && CAMP.levels[3].reveal) || {};
  return [uiText('camp.end.1'), uiText('camp.end.2'), uiText('camp.end.3', { star: R.star || '' })];
}
function campProgressNew() { return { level: 1, mission: 0, levelDone: 0, techs: [], found: [], ore: 0, credits: 0, bonus: { fighters: 0 }, results: {}, revealed: false }; } // level and mission: the next one to fly; ore: carried into the next level; bonus: the extra ships the Earth refit bought for it; results: { '<level>.<mission>': { score, bonuses: [ids], t, hull, lost, tries } }, one for each mission flown (the best score is kept)
const campResultKey = (level, i) => level + '.' + ((i | 0) + 1);
function campProgressLoad() {
  const P = campProgressNew();
  campTry(() => {
    const raw = JSON.parse(localStorage.getItem(CAMP.store) || 'null'); if (!raw || typeof raw !== 'object') return;
    if (Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= 9) P.level = raw.level;
    if (Number.isInteger(raw.mission) && raw.mission >= 0 && raw.mission < 9) P.mission = raw.mission;
    if (Number.isInteger(raw.levelDone) && raw.levelDone >= 0 && raw.levelDone < 9) P.levelDone = raw.levelDone; // the level whose last mission is won and whose story and pick are not done yet (a tab closed at the pick)
    if (Array.isArray(raw.techs)) raw.techs.forEach(t => { if (CAMP.tech[t] && P.techs.indexOf(t) < 0) P.techs.push(t); });
    if (Array.isArray(raw.found)) raw.found.slice(0, 99).forEach(k => { if (typeof k === 'string' && /^[1-9]\.[a-z0-9]{1,16}$/.test(k) && P.found.indexOf(k) < 0) P.found.push(k); }); // the cloaked caches looted: '<level>.<id>'
    if (Number.isFinite(raw.credits) && raw.credits > 0) P.credits = Math.floor(raw.credits); // credits: what the outposts paid for ore, no cap (card space-game-credits-apart-from-ore)
    if (Number.isFinite(raw.ore)) { const ore = Math.max(0, Math.floor(raw.ore)); P.ore = Math.min(CAMP.ore.cap, ore); P.credits += ore - P.ore; } // the store holds CAMP.ore.cap; what an OLD save has over it was the cash of a sale (saved as ore, and cut here until this card): it becomes credits, nothing is lost
    P.revealed = raw.revealed === true; // the ending has been seen (SPOILER: campReveal)
    if (raw.bonus && typeof raw.bonus === 'object') { const b = x => Number.isInteger(x) ? Math.max(0, Math.min(CAMP.refit.most, x)) : 0; P.bonus = { fighters: Math.min(CAMP.refit.most, b(raw.bonus.fighters) + b(raw.bonus.escorts)) }; } // an escort bought before card space-game-cut-escorts is a fighter now
    if (raw.results && typeof raw.results === 'object') Object.keys(raw.results).slice(0, 40).forEach(k => { const r = raw.results[k]; if (/^[1-9]\.[1-9]$/.test(k) && r && Number.isFinite(r.score)) P.results[k] = { score: Math.max(0, Math.min(99999, Math.floor(r.score))), bonuses: Array.isArray(r.bonuses) ? r.bonuses.filter(x => typeof x === 'string').slice(0, 6).map(x => x.slice(0, 24)) : [], t: Math.max(0, r.t | 0), hull: Math.max(0, r.hull | 0), lost: Math.max(0, r.lost | 0), tries: Math.max(1, Math.min(99, r.tries | 0 || 1)), replays: Math.max(0, Math.min(999, r.replays | 0)) }; if (Number.isInteger(r.rank) && r.rank >= 0 && r.rank < 12) P.results[k].rank = r.rank; }); // replays: how many times it was flown again (card space-game-campaign-replay); rank: the rank the best run gave, an index (the ranks card)
  }, 0);
  if (P.mission >= campMissions(P.level).length) P.mission = 0;
  return P;
}
function campProgressSave(P) { campTry(() => localStorage.setItem(CAMP.store, JSON.stringify({ level: P.level, mission: P.mission | 0, levelDone: P.levelDone | 0, techs: P.techs, found: P.found || [], ore: P.ore | 0, credits: Math.max(0, Math.floor(P.credits || 0)), bonus: P.bonus, results: P.results || {}, revealed: P.revealed === undefined ? campProgressLoad().revealed : P.revealed === true })), 0); } // revealed: the ending has been seen (SPOILER: campReveal)
// a mission won: its result is kept (the best score, how many tries), and the mission to fly next moves on. Answers { levelDone }: true when it was the last mission of its level (the caller goes to the level's story and refit, then the next level)
function campMissionDone(P, level, i, sc) {
  const k = campResultKey(level, i), old = P.results[k], res = { score: sc.score, bonuses: sc.bonuses.filter(b => b.ok).map(b => b.id), t: sc.t, hull: sc.hullLeft, lost: sc.shipsLost, tries: (old ? old.tries : 0) + 1 };
  if (old && old.score > res.score) { res.score = old.score; res.bonuses = old.bonuses; res.t = old.t; res.hull = old.hull; res.lost = old.lost; if (old.rank != null) res.rank = old.rank; }
  if (old && old.replays) res.replays = old.replays;
  P.results[k] = res; if (res.rank == null && typeof campRank === 'function') res.rank = campRank(P).i; // the rank this mission's best run gave (the ranks card: the points are the sum of the best scores)
  const last = i + 1 >= campMissions(level).length;
  if (!last) { P.level = level; P.mission = i + 1; } else { P.mission = 0; P.levelDone = level; } // the level's last mission: the next launch shows its story and the pick (until the scene's next() moves the level on)
  return { levelDone: last };
}
// a mission flown AGAIN (card space-game-campaign-replay; Troy: "it would be nice to be able to replay the missions completed"). The result keeps the BEST of the runs, the bonus objectives found are every one any run met,
// and the progress does not move: the level and the mission to fly next stay where they are, the story is not told again. The ranks' points are the sum of the best scores, so a replay raises them only by what it beat the old
// best by. Answers { old: the best before, now: this run's score, best, improved, found: bonus ids new to the mission }.
function campReplayDone(P, level, i, sc) {
  const k = campResultKey(level, i), old = P.results[k], oldBest = old ? old.score : 0, met = sc.bonuses.filter(b => b.ok).map(b => b.id), had = old ? old.bonuses : [];
  const order = (campMissionRow(level, i).bonus || []).map(b => b.id), all = had.concat(met.filter(x => had.indexOf(x) < 0)), bonuses = order.filter(id => all.indexOf(id) >= 0).concat(all.filter(id => order.indexOf(id) < 0)).slice(0, 6);
  const improved = !old || sc.score > old.score, res = improved ? { score: sc.score, bonuses, t: sc.t, hull: sc.hullLeft, lost: sc.shipsLost, tries: old ? old.tries : 1, replays: (old ? old.replays | 0 : 0) + 1 }
    : { score: old.score, bonuses, t: old.t, hull: old.hull, lost: old.lost, tries: old.tries, replays: (old.replays | 0) + 1 };
  if (old && old.rank != null && !improved) res.rank = old.rank;
  P.results[k] = res; if (improved && typeof campRank === 'function') res.rank = campRank(P).i;
  return { old: oldBest, now: sc.score, best: res.score, improved: !!old && improved, first: !old, found: met.filter(x => had.indexOf(x) < 0) };
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
      else if (/^rival:/.test(o.what)) got = campRivalDone(C, o.what.slice(6)) ? 1 : 0; // the rival is dead or has got away (src/camprival.js)
      else if (/^wave:/.test(o.what)) { const w = parseInt(o.what.slice(5), 10); got = C.waves[w] && C.waves[w].started && !C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === w) ? 1 : 0; }
    } else if (o.type === 'hold') { need = o.secs; got = Math.min(o.secs, Math.floor(campMissionClock(C))); }
    else if (o.type === 'ore') { need = o.n; got = Math.min(o.n, Math.floor(C.oreBest)); } // the store held this much at some time (selling it afterwards does not undo it)
    else if (o.type === 'cashin') { need = o.n || 1; got = Math.min(need, Math.floor(C.sold)); } // this much ore sold at a market outpost (campSell)
    else if (o.type === 'relic') got = C.flags.relic ? 1 : 0;
    else if (o.type === 'caches') { need = o.n; got = Math.min(o.n, C.cachesGot); }
    else if (o.type === 'clear') got = C.waves.length && C.waves.every(w => w.started) && !campAliens(C).length ? 1 : 0;
    return { i, type: o.type, what: o.what, word: o.word, got, need, done: got >= need };
  });
}
// every tick: the recon points fill up while a ship of yours is near them; a mission whose objectives are all met is won; one that can no longer be met is lost (haulers)
function campMissions_tick(C, dt) {
  if (C.result) return;
  if (C.ore > C.oreBest) C.oreBest = C.ore;
  if (C.arrivedAt == null) { const p = campMissionPlace(C); if (!p || Math.hypot(C.carrier.x - p.x, C.carrier.y - p.y) <= CAMP.mission.arrive) { C.arrivedAt = C.t; if (C.nav && p && C.nav.id === 'place:' + C.L.place && typeof campNavClear === 'function') campNavClear(C, 'mission'); C.events.push({ type: 'arrived', place: p ? p.name : '' }); campSay(C, 'camp.say.arrived', { name: p ? p.name : '' }); } return; } // the mission begins when the cruiser is there (the autopilot lets go without a line of its own: the ship's "Arrived at X." says it once)
  if (!C.L.objectives) return;
  const mine = C.ships.filter(u => u.team === 'earth' && u.hp > 0 && u.kind !== 'freighter');
  C.scan.forEach(p => {
    if (p.got) return;
    if (!mine.some(u => Math.hypot(u.x - p.x, u.y - p.y) <= p.r)) return;
    p.t += dt;
    if (p.t >= p.secs) { p.got = true; C.events.push({ type: 'scanned', x: p.x, y: p.y, n: C.scan.filter(q => q.got).length, of: C.scan.length }); campSay(C, 'camp.say.scanned', { n: C.scan.filter(q => q.got).length, of: C.scan.length }); }
  });
  if (C.guardsStart == null) C.guardsStart = C.ships.some(u => u.guard);
  const st = campObjectives(C);
  st.forEach(o => { if (o.type === 'deliver' && C.delivered + campConvoys(C).length + C.L.convoys.filter((cv, i) => !C.convoys[i].started).length < o.need) campEnd(C, 'lost', 'convoy'); }); // too many haulers lost
  if (!C.result && st.length && st.every(o => o.done)) campEnd(C, 'won', C.L.win || (st[st.length - 1].what || st[st.length - 1].type));
}
// the bonus objectives of a mission row (`bonus`): { id, type: 'time' (secs) | 'lost' (n: at most this many ships lost) | 'hull' (pct: at least) | 'ore' (n) | 'sold' (n: at least this much ore sold at a market) | 'delivered' (all of the haulers), text }
function campBonuses(C) {
  return (C.L.bonus || []).map(b => {
    let ok = false;
    if (b.type === 'time') ok = campMissionClock(C) <= b.secs; else if (b.type === 'lost') ok = C.lostShips <= b.n; else if (b.type === 'hull') ok = C.carrier.hp >= C.carrier.maxHp * b.pct / 100;
    else if (b.type === 'ore') ok = C.ore >= b.n; else if (b.type === 'sold') ok = C.sold >= b.n; else if (b.type === 'anomaly') ok = campAnomFound(C, b.anomaly); else if (b.type === 'delivered') ok = C.delivered >= C.L.convoys.length; else if (b.type === 'neutrals') ok = C.neutralsLost <= (b.n | 0); else if (b.type === 'torpedoes') ok = ((C.torpStat || {}).hit | 0) <= (b.n | 0); else if (b.type === 'rival') ok = !!C.rivalEnd && C.rivalEnd[b.what] === 'dead'; // the rival is destroyed, not only chased off (src/camprival.js)
    return { id: b.id, type: b.type, text: b.text, secs: b.secs, n: b.n, pct: b.pct, anomaly: b.anomaly, ok, points: ok ? CAMP.score.bonus : 0 };
  });
}
// the score of a won mission: { score, base, bonuses, hull, speed, lost, t, hullLeft, shipsLost }
function campScore(C) {
  const K = CAMP.score, bonuses = campBonuses(C), t = Math.round(campMissionClock(C)), par = C.L.par || K.par, hullShare = C.carrier.hp / C.carrier.maxHp;
  const hull = Math.round(K.hull * Math.max(0, hullShare)), speed = Math.max(0, par - t) * K.speed, lost = C.lostShips * K.ship, haulerLost = C.lost * K.hauler, bonus = bonuses.reduce((a, b) => a + b.points, 0);
  return { score: Math.max(0, K.base + bonus + hull + speed - lost - haulerLost), base: K.base, bonuses, bonus, hull, speed, lost, haulerLost, haulersLost: C.lost, t, hullLeft: Math.round(C.carrier.hp), shipsLost: C.lostShips };
}

// the key of an objective's words: its type, then what is killed (a kill) or an optional word for what is delivered (a deliver row says `word: 'transport'` when it is one ship and not haulers: card space-game-hunt-l1-fleet)
const campObjKey = (o, flying) => 'camp.o.' + o.type + (o.type === 'kill' ? '.' + String(o.what).replace(/:.*/, '') : o.type === 'deliver' && o.word ? '.' + o.word : '') + (o.type === 'deliver' && !o.word && flying > (o.need != null ? o.need : o.n) ? '.of' : ''); // flying: how many haulers the mission sends; more than it needs and the goal says both ("0 of 3, need 1": card space-game-b3-d-panel-cap-pill-goal; how the goal is written, not the rule)
// what the level asks of you, in the words of content/text/ui.md (camp.obj.<win>): the HUD shows it, the ship computer is told it
function campObjective(C) {
  const L = C.L, win = L.win;
  if (L.place && C.arrivedAt == null) { const p = campMissionPlace(C); return uiText('camp.o.travel', { name: p ? p.name : '', km: p ? campKmText(Math.hypot(C.carrier.x - p.x, C.carrier.y - p.y)) : '0' }); } // the trip first
  if (L.objectives) { // a mission: the first objective that is not done yet
    const o = campObjectives(C).find(x => !x.done); if (!o) return uiText('camp.o.done');
    if (o.type === 'deliver' && C.delivered >= o.need) return uiText('camp.o.deliverleft', { n: C.delivered, left: campConvoys(C).length + C.L.convoys.filter((cv, k) => !C.convoys[k].started).length }); // the haulers needed are home but the mission waits for the rest of them: say so (it read "0 of 1" with two haulers home; card space-game-night-hunt-l1-rim)
    return uiText(campObjKey(o, C.L.convoys.length), { got: o.got, need: o.need, total: C.L.convoys.length, secs: o.need });
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
  const out = campWing(C, 'fighter').length, al = campAliens(C).filter(u => u.faction !== 'pirate').length, pi = campAliens(C).length - al, cv = campConvoys(C).map(u => campConvoyName(u));
  return 'Campaign level ' + C.level + ', ' + L.name + '. Goal: ' + campObjective(C) + ' Cruiser hull ' + Math.round(c.hp) + ' of ' + Math.round(c.maxHp) + ', shield ' + Math.round(C.shield) + ' of ' + CAMP.carrier.shield + '. Ore in the store: ' + Math.floor(C.ore) + ' of ' + CAMP.ore.cap + (C.mends.length ? ', mending ' + C.mends.length + ' ship' + (C.mends.length === 1 ? '' : 's') : '') + '.'
    + (C.earth ? ' Earth shield ' + Math.round(C.earth.shield / C.earth.max * 100) + ' percent.' : '') + ' In the bay: ' + C.bay.fighters + ' fighters' + (campRepairing(C) ? ', ' + campRepairing(C) + ' being mended' : '') + '. Out: '
    + out + ' fighters. Missiles in the magazine: ' + C.missiles + ' of ' + C.magazine + ' (' + campKeyVar('keymissile') + ' fires one at the target, or with none picked at ' + (L.win === 'mother' || m ? 'the mothership or ' : '') + 'the nearest big ship).' + (al || C.alienSeen ? ' Aliens alive: ' + al + '.' : '') + (pi ? ' Pirates alive: ' + pi + '.' : '') + campAnomLine(C) + (L.convoys.length ? ' Convoys flying: ' + cv.join(', ') + (cv.length ? '' : 'none') + '.' : '')
    + (L.win === 'mother' ? (m ? ' The alien mothership is ' + Math.round(campDist(m, c) / 10) + ' km away.' : ' The mothership has not come yet.') : '');
}
