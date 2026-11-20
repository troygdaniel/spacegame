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
  carrier: {
    hull: 600,                             // hit points of the flagship; zero and the level is lost
    speed: 210,                            // px/s, top speed: big, slow, heavy
    accel: 170,                            // px/s per s of thrust (W)
    turn: 1.1,                             // rad/s the nose turns (A, D)
    drag: 0.55,                            // velocity kept after one second with no thrust (0.55 is the Wren's)
    brakeDrag: 0.12,                       // the same with S held
    radius: 36,                            // px, the hit circle (it was 56: the carrier is drawn 35 percent smaller)
    mounts: [[42, -14], [42, 14], [12, -26], [12, 26], [-16, -30], [-16, 30], [-44, -24], [-44, 24]], // the turrets (there is no other gun): where each sits, px from the carrier's centre in its own frame (x along the nose), spread along the hull; the number of turrets is the number of rows
    pd: 4,                                 // hit points one turret shot takes off an alien
    pdDelay: 400,                          // ms between the shots of one turret (eight of them: 80 hit points a second in all): they fire only while Space is held, each at the nearest alien in its reach, and never on their own
    pdRange: 500,                          // px a turret reaches (to the edge of the alien it aims at: about three and a half carrier lengths)
    pdSpeed: 800                           // px/s of a turret shot
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
    dockAt: 90                             // px: a recalled ship this close to the carrier lands (and is whole again when next launched)
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
    radius: 8                              // px, the hit circle (it was 12)
  },
  escort: {
    hp: 90, speed: 300, accel: 360, turn: 2.6, damage: 6, delay: [350, 500], bullet: 650, range: 520, aim: 0.35, hold: 300, // as a fighter: tougher, slower, longer reach
    beside: 150,                           // px: how far from its convoy an escort keeps station
    radius: 10                             // px, the hit circle (it was 16)
  },
  convoy: {
    hp: 200,                               // hit points of a freighter
    speed: 120                             // px/s: the same as the MULE of the escort call
  },
  alien: {
    hpScale: 1,                            // times the PIRATES hit points (src/enemies.js: raider 20, drone 30, gunship 80)
    damageScale: 1,                        // times the PIRATES shot damage (raider 6, drone 8, gunship 10 a shot, three shots)
    earthDamage: 0.25,                     // a shot that hits Earth takes this share of its damage off Earth's shield (a big planet takes a pounding)
    distract: 4000                         // ms an alien you hit fights the ship that hit it instead of its goal
  },
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
    1: {
      name: 'Home', start: 'luna', startAt: [130, 30],           // the base the carrier leaves, and its offset from it
      win: 'mother',                                            // the level is won when the alien mothership is dead
      convoys: [                                                // at: seconds into the level the freighter leaves Earth; to: the place it flies to
        { id: 'mars', at: 10, to: 'mars' },
        { id: 'eros', at: 55, to: 'eros' }
      ],
      waves: [                                                  // at: seconds into the level; early: seconds after the wave before is dead, if sooner
        { at: 20, early: 8, from: [2800, 1700], ships: { raider: 4, drone: 2 }, goal: 'convoy:mars', say: 'camp.say.wave1' },
        { at: 80, early: 10, from: [-4200, 3800], ships: { drone: 3, gunship: 2 }, goal: 'earth', say: 'camp.say.wave2' },
        { at: 140, early: 12, needClear: true, from: [3200, -4000], ships: { raider: 2, gunship: 1 }, goal: 'earth', mother: [3500, -4400], say: 'camp.say.wave3' }
      ]
    },
    2: {                                                          // Alpha Centauri: warp in, gather resources, recover what the ancient race left on Proxima b
      name: 'Alpha Centauri', start: 'arrival', startAt: [0, 0], win: 'relic', earth: false,
      places: {                                                 // the carrier warps in at arrival (not drawn); Proxima b holds the relic
        arrival: { x: -4800, y: 2400, name: 'Warp point', hidden: true },                           // where the carrier warps in, south-west of the relic (not drawn)
        sun: { x: -1800, y: -3600, name: 'Alpha Centauri', kind: 'lava', seed: 4371, r: 260 },       // the star of the level, drawn as a lava world, 260 px across its radius
        proxima: { x: 1200, y: 800, name: 'Proxima b', kind: 'rock', seed: 4244, r: 150 }           // the world with the relic on it
      },
      caches: [[-2800, 2000], [-600, 3200], [200, -1800]],       // resource caches (px): collect this many (relic.caches) before the relic will answer
      relic: { place: 'proxima', radius: 240, hold: 8, caches: 2, clear: 650 }, // hold the carrier within radius of the relic for hold seconds, with no alien within clear px of it
      guards: [                                                 // the guards of the relic: they wait until your ships come within reach
        { kind: 'gunship', at: [1700, 400] }, { kind: 'gunship', at: [700, 1300] },                 // two gunships, north-east and south-west of the relic
        { kind: 'drone', at: [1500, 1300] }, { kind: 'drone', at: [500, 300] }, { kind: 'drone', at: [1900, 900] } // three drones round it
      ],
      convoys: [],
      waves: [
        { at: 25, early: 10, from: [-5600, 600], ships: { raider: 3, drone: 2 }, goal: 'carrier', say: 'camp.say.l2wave1' },
        { at: 75, early: 12, from: [4500, -2500], ships: { drone: 3, gunship: 1 }, goal: 'carrier', say: 'camp.say.l2wave2' }
      ]
    },
    3: {                                                          // the alien home world: break the defence rings
      name: 'The home world', start: 'arrival', startAt: [0, 0], win: 'towers', earth: false,
      places: {
        arrival: { x: -7000, y: 3500, name: 'Warp point', hidden: true },                          // where the carrier warps in: 7,800 px from the world (not drawn)
        home: { x: 0, y: 0, name: 'Alien home world', kind: 'gas', seed: 77, r: 330 }              // the world, 330 px across its radius
      },
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
function campNew(level, techs, opts) {
  const L = CAMP.levels[level]; if (!L) return null;
  opts = opts || {};
  const C = {
    level, via: opts.via || 'menu', t: 0, rng: campRng(opts.seed == null ? 1 : opts.seed), god: !!opts.god, nextId: 1, ships: [], by: {}, bullets: [], events: [],
    input: { turn: 0, thrust: 0, brake: false, fire: false, blink: false },
    techs: (techs || []).filter(t => CAMP.tech[t]),
    earth: L.earth === false ? null : { x: 0, y: 0, r: CAMP.earth.radius, shield: CAMP.earth.shield, max: CAMP.earth.shield }, caches: (L.caches || []).map(c => ({ x: c[0], y: c[1], got: false })), cachesGot: 0,
    relic: L.relic ? { x: campPlaces(level)[L.relic.place].x, y: campPlaces(level)[L.relic.place].y, hold: 0 } : null,
    bay: { fighters: CAMP.bay.fighters, escorts: CAMP.bay.escorts }, launchQ: [], nextLaunch: 0,
    waves: L.waves.map(() => ({ started: false, at: 0 })), convoys: L.convoys.map(() => ({ started: false })), delivered: 0, lost: 0, kills: 0, launched: 0, lostShips: 0,
    orders: { launch: 0, attack: 0, escort: 0, guard: 0, recall: 0 }, blinkAt: -1e9, motherSpawn: 0,
    result: null, why: ''
  };
  if (campHas(C, 'bay2')) C.bay.fighters += CAMP.tech.bay2.fighters;
  Object.assign(C, { missiles: CAMP.missile.magazine, rockets: [], rocketId: 0, nextRocket: 0, reloadAt: 0, gunAt: -1e9 }); C.orders.missiles = 0; // the launcher: the magazine (a plain number), the missiles in flight, its clocks
  const p = campPlaces(level)[L.start], c = campSpawn(C, 'carrier', p.x + L.startAt[0], p.y + L.startAt[1]);
  C.carrier = c; c.rot = 0;
  C.turrets = CAMP.carrier.mounts.map((m, i) => ({ x: 0, y: 0, aim: 0, target: '', at: i * CAMP.carrier.pdDelay / CAMP.carrier.mounts.length, shotAt: -1e9 })); campTurretPlace(C); // the turrets: where each is, which way it aims, at whom, when it may fire next and when it last did (the scene draws them)
  (L.towers || []).forEach(g => { // rings of towers round a place, facing outward
    const at = campPlaces(level)[g.place];
    for (let i = 0; i < g.n; i++) { const a = (g.phase || 0) + i / g.n * 2 * Math.PI, t = campSpawn(C, 'tower', at.x + Math.cos(a) * g.r, at.y + Math.sin(a) * g.r); t.rot = a; if (g.hp) t.hp = t.maxHp = g.hp; }
  });
  (L.guards || []).forEach(g => { const a = campSpawn(C, g.kind, g.at[0], g.at[1]); if (a) { a.hold = true; a.goal = 'carrier'; } });
  return C;
}

// one ship into the game. kind: carrier, fighter, escort, freighter, mother, or a PIRATES key (raider, drone, gunship)
function campSpawn(C, kind, x, y) {
  const u = { id: kind + '-' + (C.nextId++), kind, x, y, vx: 0, vy: 0, rot: 0, move: null, moveUntil: 0, ran: false, side: C.rng() < 0.5 ? -1 : 1, nextShot: 0, order: null, goal: '', distractedUntil: 0 };
  if (kind === 'carrier') {
    const k = CAMP.carrier; Object.assign(u, { team: 'earth', hp: k.hull * (campHas(C, 'plating') ? CAMP.tech.plating.hull : 1), r: k.radius, vmax: k.speed, accel: k.accel, turn: k.turn });
  } else if (kind === 'fighter' || kind === 'escort') {
    const k = CAMP[kind];
    Object.assign(u, { team: 'earth', hp: k.hp, r: k.radius, vmax: k.speed, accel: k.accel, turn: k.turn,
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
  if (u.kind === 'carrier') { if (campHas(C, 'shield')) dmg *= CAMP.tech.shield.taken; if (C.god) dmg = 0; }
  u.hp -= dmg; u.hurtAt = C.t;
  C.events.push({ type: 'hit', x: u.x, y: u.y, id: u.id });
  if (u.team === 'alien' && byId) { u.hitBy = byId; u.distractedUntil = C.t + CAMP.alien.distract; }
  if (u.hp <= 0) campKill(C, u);
}
function campKill(C, u) {
  u.hp = 0;
  C.events.push({ type: 'boom', x: u.x, y: u.y, big: u.kind === 'carrier' || u.kind === 'mother', id: u.id, kind: u.kind });
  if (u.team === 'alien') {
    C.kills++;
    if (u.kind === 'mother') campEnd(C, 'won', 'mother');
    else if (u.kind === 'tower' && CAMP.levels[C.level].win === 'towers' && !C.ships.some(s => s.kind === 'tower' && s.hp > 0)) campEnd(C, 'won', 'towers'); // the last tower of the level
  }
  else if (u.kind === 'carrier') campEnd(C, 'lost', 'carrier');
  else if (u.kind === 'freighter') { C.lost++; campSay(C, 'camp.say.convoylost', { name: campConvoyName(u) }); }
  else { C.lostShips++; }
}
function campEnd(C, result, why) { if (C.result) return; C.result = result; C.why = why; C.events.push({ type: 'end', result, why }); }
const campConvoyName = u => (CAMP.places[String(u.id).split('-')[1]] || {}).name || 'a';

// ---------- the five orders ----------
// the thing an order names: a convoy ('mars', 'the convoy'), a place ('earth', 'luna'), the carrier ('me', 'the carrier'), the mothership. null when nothing fits
function campFind(C, text) {
  const q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\b(the|a|an|to|at|for|by|with|around|near|beside|of|our|my)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  if (/\b(mothership|mother|boss|flagship|big one)\b/.test(q)) return { kind: 'mother' };
  if (/\b(carrier|me|us|ship|home)\b/.test(q) && !/\bconvoy\b/.test(q)) return { kind: 'carrier' };
  const cv = campConvoys(C);
  for (const u of cv) { const n = String(u.id).split('-')[1]; if (q.indexOf(n) >= 0 || q.indexOf(campConvoyName(u).toLowerCase()) >= 0) return { kind: 'convoy', id: u.id }; }
  if (/\b(convoy|convoys|freighter|freighters|cargo|supplies)\b/.test(q)) { const n = campNearest(cv, C.carrier); return n ? { kind: 'convoy', id: n.id } : null; }
  const pl = campPlaces(C.level);
  for (const id of Object.keys(pl)) if (!pl[id].hidden && (q.indexOf(id) >= 0 || q.indexOf(pl[id].name.toLowerCase()) >= 0)) return { kind: 'place', id };
  if (/\bmoon\b/.test(q)) return { kind: 'place', id: 'luna' };
  return null;
}
const campTarget = (C, t) => !t ? null : t.kind === 'mother' ? C.ships.find(u => u.kind === 'mother' && u.hp > 0) || null : t.kind === 'carrier' ? C.carrier : t.kind === 'convoy' ? C.by[t.id] : t.kind === 'place' ? campPlaces(C.level)[t.id] : null;
const campNo = code => ({ ok: false, code, say: uiText('camp.no.' + code) });
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
  return campNo('what');
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
  C.t += dt * 1000;
  campSchedule(C);
  campCarrier(C, dt);
  campLaunch(C);
  C.ships.forEach(u => { if (u.hp > 0 && u.kind !== 'carrier') campAI(C, u, dt); });
  campBullets(C, dt);
  campMissiles(C, dt);
  campCaches(C);
  campRelic(C, dt);
  campRepair(C, dt);
  campEarth(C, dt);
  C.ships = C.ships.filter(u => u.hp > 0 || (delete C.by[u.id], false)); // the dead leave the list (the scene was told by the boom event)
}

// convoys leave Earth and waves arrive, by the level's own clock
function campSchedule(C) {
  const L = CAMP.levels[C.level], sec = C.t / 1000;
  L.convoys.forEach((cv, i) => {
    if (C.convoys[i].started || sec < cv.at) return;
    C.convoys[i].started = true;
    const to = campPlaces(C.level)[cv.to], a = Math.atan2(to.y, to.x), f = campSpawn(C, 'freighter', Math.cos(a) * (C.earth.r + 50), Math.sin(a) * (C.earth.r + 50));
    f.id = 'freighter-' + cv.id; C.by[f.id] = f; f.dest = { x: to.x, y: to.y }; f.rot = a;
    campSay(C, 'camp.say.convoy', { name: to.name });
  });
  L.waves.forEach((w, i) => {
    const st = C.waves[i]; if (st.started) return;
    const prev = i > 0 ? C.waves[i - 1] : null, prevDead = !prev || (prev.started && !C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === i - 1));
    const due = sec >= w.at && (!w.needClear || prevDead);
    const early = w.early != null && prev && prev.started && prevDead && sec - prev.at >= w.early;
    if (!due && !early) return;
    st.started = true; st.at = sec;
    const goal = w.goal || 'earth';
    Object.keys(w.ships).forEach(kind => {
      for (let k = 0; k < w.ships[kind]; k++) { const a = campSpawn(C, kind, w.from[0] + campBetween(C, -300, 300), w.from[1] + campBetween(C, -300, 300)); if (a) { a.goal = goal; a.wave = i; a.rot = Math.atan2(-a.y, -a.x); } }
    });
    if (w.mother) { const m = campSpawn(C, 'mother', w.mother[0], w.mother[1]); m.goal = 'earth'; m.wave = i; m.rot = Math.atan2(-m.y, -m.x); }
    campSay(C, w.say, { n: i + 1 });
  });
}

// the carrier: your stick
function campCarrier(C, dt) {
  const c = C.carrier, k = CAMP.carrier, inp = C.input; if (c.hp <= 0) return;
  c.rot += (inp.turn || 0) * k.turn * dt;
  const th = Math.max(0, Math.min(1, inp.thrust || 0));
  c.vx += Math.cos(c.rot) * k.accel * th * dt; c.vy += Math.sin(c.rot) * k.accel * th * dt;
  const keep = Math.pow(inp.brake ? k.brakeDrag : k.drag, dt); c.vx *= keep; c.vy *= keep;
  const sp = Math.hypot(c.vx, c.vy); if (sp > k.speed) { c.vx *= k.speed / sp; c.vy *= k.speed / sp; }
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (inp.blink && campHas(C, 'blink') && C.t - C.blinkAt >= CAMP.tech.blink.cooldown) { C.blinkAt = C.t; c.x += Math.cos(c.rot) * CAMP.tech.blink.dist; c.y += Math.sin(c.rot) * CAMP.tech.blink.dist; C.events.push({ type: 'blink', x: c.x, y: c.y }); }
  inp.blink = false;
  campTurrets(C);
}
// the turrets: each one aims itself at the nearest alien in its reach (to the edge of it), always; it fires only while Space is held (C.input.fire), one shot every pdDelay ms
const campReach = C => CAMP.carrier.pdRange * (campHas(C, 'beam') ? CAMP.tech.beam.reach : 1); // px a turret reaches: the beam tech reaches further
function campTurretPlace(C) { // each turret's place in the world, from the carrier's place and nose
  const c = C.carrier, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  C.turrets.forEach((tu, i) => { const m = CAMP.carrier.mounts[i]; tu.x = c.x + cs * m[0] - sn * m[1]; tu.y = c.y + sn * m[0] + cs * m[1]; });
}
function campTurrets(C) {
  const c = C.carrier, k = CAMP.carrier, beam = campHas(C, 'beam'), reach = campReach(C), dmg = k.pd * (beam ? CAMP.tech.beam.damage : 1), al = campAliens(C);
  campTurretPlace(C);
  let fired = false;
  C.turrets.forEach(tu => {
    let best = null, bd = reach; al.forEach(u => { const d = campDist(u, tu) - u.r; if (d <= bd) { bd = d; best = u; } });
    tu.target = best ? best.id : ''; if (best) tu.aim = Math.atan2(best.y - tu.y, best.x - tu.x);
    if (best && C.input.fire && C.t >= tu.at) {
      tu.at = C.t + k.pdDelay; tu.shotAt = C.t; fired = true;
      campBullet(C, { x: tu.x, y: tu.y, vx: c.vx, vy: c.vy, id: c.id }, tu.aim, k.pdSpeed, dmg, (reach + 120) / k.pdSpeed * 1000, 'earth', 0, { pd: true, beam });
    }
  });
  if (fired && C.t - C.gunAt >= 150) { C.gunAt = C.t; C.events.push({ type: 'gun', x: c.x, y: c.y }); } // one sound for a volley, not one for each of the eight
}
function campBullet(C, from, rot, speed, dmg, lifeMs, team, ahead, extra) {
  const b = Object.assign({ x: from.x + Math.cos(rot) * (ahead || 0), y: from.y + Math.sin(rot) * (ahead || 0), vx: Math.cos(rot) * speed + (from.vx || 0) * 0.3, vy: Math.sin(rot) * speed + (from.vy || 0) * 0.3, dmg, life: lifeMs, team, from: from.id, rot }, extra || {});
  C.bullets.push(b); return b;
}

// the bay: Launch queues the ships, one leaves every launchEvery ms
function campLaunch(C) {
  if (!C.launchQ.length || C.t < C.nextLaunch || C.carrier.hp <= 0) return;
  C.nextLaunch = C.t + CAMP.bay.launchEvery;
  const kind = C.launchQ.shift(), c = C.carrier, side = (C.launched % 2 ? 1 : -1), a = c.rot + side * 1.2;
  const u = campSpawn(C, kind, c.x + Math.cos(a) * 70, c.y + Math.sin(a) * 70); C.launched++;
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
  const L = CAMP.levels[C.level], r = L.relic; if (!r || !C.relic || C.carrier.hp <= 0) return;
  const R = C.relic, ready = C.cachesGot >= r.caches, near = campDist(C.carrier, R) <= r.radius, clear = !campAliens(C).some(u => campDist(u, R) <= r.clear);
  if (ready && near && clear) {
    if (R.hold === 0) campSay(C, 'camp.say.relicon');
    R.hold += dt;
    if (R.hold >= r.hold) { R.hold = r.hold; campSay(C, 'camp.say.relicdone'); campEnd(C, 'won', 'relic'); }
  } else if (R.hold > 0) R.hold = Math.max(0, R.hold - dt * 2);
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
  if (!tgt) { const near = campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, def.engage * 0.7); if (near) tgt = near; }
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
      campBullet(C, u, u.rot, k.bullet, k.damage, 1400, 'earth', 14);
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
      if (campSegHit(px, py, b.x, b.y, u.x, u.y, u.r + 2)) { campHurt(C, u, b.dmg, b.from); if (!b.beam) { b.dead = true; return; } }
    }
    if (C.earth && b.team === 'alien' && campSegHit(px, py, b.x, b.y, C.earth.x, C.earth.y, C.earth.r)) { // Earth is hit (a level with no Earth has none to hit)
      b.dead = true; if (!C.god) C.earth.shield -= b.dmg * CAMP.alien.earthDamage; C.earth.hitAt = C.t; C.events.push({ type: 'earthhit', x: b.x, y: b.y }); // god mode (a debug key, src/campdebug.js): Earth's shield does not fall either
      if (C.earth.shield <= 0) { C.earth.shield = 0; campEnd(C, 'lost', 'earth'); }
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
function campProgressNew() { return { level: 1, techs: [] }; }
function campProgressLoad() {
  const P = campProgressNew();
  campTry(() => {
    const raw = JSON.parse(localStorage.getItem(CAMP.store) || 'null'); if (!raw || typeof raw !== 'object') return;
    if (Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= 9) P.level = raw.level;
    if (Array.isArray(raw.techs)) raw.techs.forEach(t => { if (CAMP.tech[t] && P.techs.indexOf(t) < 0) P.techs.push(t); });
  }, 0);
  return P;
}
function campProgressSave(P) { campTry(() => localStorage.setItem(CAMP.store, JSON.stringify({ level: P.level, techs: P.techs })), 0); }

// what the level asks of you, in the words of content/text/ui.md (camp.obj.<win>): the HUD shows it, the ship computer is told it
function campObjective(C) {
  const L = CAMP.levels[C.level], win = L.win;
  if (win === 'mother') return uiText('camp.obj.mother');
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
  const L = CAMP.levels[C.level], c = C.carrier, m = C.ships.find(u => u.kind === 'mother' && u.hp > 0);
  const out = campWing(C, 'fighter').length, esc = campWing(C, 'escort').length, al = campAliens(C).length, cv = campConvoys(C).map(u => campConvoyName(u));
  return 'Campaign level ' + C.level + ', ' + L.name + '. Goal: ' + campObjective(C) + ' Carrier hull ' + Math.round(c.hp) + ' of ' + Math.round(c.maxHp) + '.'
    + (C.earth ? ' Earth shield ' + Math.round(C.earth.shield / C.earth.max * 100) + ' percent.' : '') + ' In the bay: ' + C.bay.fighters + ' fighters, ' + C.bay.escorts + ' escorts. Out: '
    + out + ' fighters, ' + esc + ' escorts. Missiles in the magazine: ' + C.missiles + ' of ' + CAMP.missile.magazine + ' (F fires one at the mothership or the nearest big ship). Aliens alive: ' + al + '.' + (L.convoys.length ? ' Convoys flying: ' + cv.join(', ') + (cv.length ? '' : 'none') + '.' : '')
    + (L.win === 'mother' ? (m ? ' The alien mothership is ' + Math.round(campDist(m, c) / 10) + ' km away.' : ' The mothership has not come yet.') : '');
}
