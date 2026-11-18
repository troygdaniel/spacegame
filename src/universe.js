// ---------- The universe: which star system the Space scene is built from (docs/UNIVERSE.md sections 4.1 and 8.1) ----------
// G.system is the id of the current system, a string so a save can name it. The systems themselves are data in
// src/data_systems.js. Scenes ask here for where things are instead of keeping coordinate tables of their own.
//   sysDef()           the current system object
//   sysBodies('belt')  every body of that type in the current system (no type: all of them)
//   sysBody('planet')  the first body of that type, or null
// An id this build does not know falls back to Halcyon, so an old or newer save never leaves the game without a world.

G.system = 'halcyon';

G.deep = null; // the pull-out in progress (src/pullout.js), or null; never saved. While it is set the "current system" is the empty deep space below
function sysDef(id) { if (!id && G.deep) return deepSystem(); return SYSTEMS[id || G.system] || SYSTEMS.halcyon; }
// The star is a real body (card space-game-real-solar-system): type 'star', at the centre the data gives (sys.star), in every list of bodies, so the
// nav panel lists it and cruise and the autopilot fly to it. It is made from sys.star here, once per system, not written into the bodies of the data
// (content/systems/*.md and src/data_systems.js keep their rows as they are). A landmark for now: no heat, no scooping.
//   sysStar(id)        the star body of a system, or null (deep space, a system with no star in its data)
//   sysOrbit(b, id)    where a body is round its star: { r: px from the star, a: rad, the angle from the star to the body } (a system with no star: round
//                      its middle). Bodies stand still for now; this is the orbit each is on, so motion can be switched on later from these two numbers
const SYS_STAR = { r: 900, name: ' Sun' }; // world px of a size 1 star (STAR_TYPES in src/art_world.js: M 0.8 to A 1.2); the name after the system's
const sysStarCache = new WeakMap();
function sysStar(id) {
  const def = sysDef(id), st = def && def.star;
  if (!st || !Number.isFinite(st.x) || !Number.isFinite(st.y)) return null;
  let c = sysStarCache.get(def);
  if (!c || c.x !== st.x || c.y !== st.y || c.star !== st.type) {
    const size = typeof STAR_TYPES !== 'undefined' && STAR_TYPES[st.type] ? STAR_TYPES[st.type].size : 1;
    c = { id: (def.id || 'system') + '-star', type: 'star', star: st.type, name: (def.name || 'The') + SYS_STAR.name, x: st.x, y: st.y, r: Math.round(SYS_STAR.r * size) };
    sysStarCache.set(def, c);
  }
  return c;
}
function sysCentre(id) { const def = sysDef(id), st = sysStar(id); return st ? { x: st.x, y: st.y } : { x: (def.size || 0) / 2, y: (def.size || 0) / 2 }; }
function sysOrbit(b, id) { const c = sysCentre(id); return { r: Math.hypot(b.x - c.x, b.y - c.y), a: Math.atan2(b.y - c.y, b.x - c.x) }; }
// where a body is on its orbit at a later angle (motion, when it is switched on): the same ring, turned by da rad
function sysOrbitAt(b, da, id) { const c = sysCentre(id), o = sysOrbit(b, id); return { x: c.x + Math.cos(o.a + da) * o.r, y: c.y + Math.sin(o.a + da) * o.r }; }
function sysBodies(type, id) { const st = sysStar(id), all = st ? [st].concat(sysDef(id).bodies) : sysDef(id).bodies.slice(); return type ? all.filter(b => b.type === type) : all; }
function sysBody(type, id) { return sysBodies(type, id)[0] || null; }

// the system that holds a station (by the station's id), or null: you always wake docked at G.lastDock, so this is where a death or a load puts G.system
function dockSystem(dockId) { return Object.keys(SYSTEMS).find(id => sysBodies('station', id).some(b => b.id === dockId)) || null; }
// deep space (docs/UNIVERSE.md 5.2): what a jump that is pulled out of the tunnel drops you into. An empty system definition with no bodies, no traffic and
// no timed pirates (max 0: the ambush is placed by hand, src/pullout.js); its danger is the higher of the two systems the jump joins
const DEEP = { size: 16000 }; // world px, square: far smaller than a star system, nothing in it to fly to
function deepSystem() {
  const dp = G.deep;
  return dp._sys || (dp._sys = { id: 'deep', name: 'Deep space', kind: 'deep', ly: null, size: DEEP.size, danger: dp.danger, traffic: 0, pirates: { max: 0, every: 60000 }, bodies: [] });
}

// ---------- Jumping: arriving in another system (docs/UNIVERSE.md 2.3; card u-b4) ----------
// enterSystem(id, from) makes id the current system, marks it known, counts the jump and says where the ship appears: G.arrival is read once
// by the Space scene (src/space.js) and then cleared. The ship appears at the edge of the system that FACES the star it came from (jumping from the
// west puts you at the west edge), flying toward the middle at ARRIVE.speed, and the pirates are held off for ARRIVE.calm ms.
// from: the id of the system left (its galaxy position is where "facing" is taken from), or null for no origin: then the ship is where a launch puts it.
// Returns false, changing nothing, for an id this build has no system for.
const ARRIVE = { speed: 500, calm: 3000, margin: 500 }; // px/s toward the middle, ms without pirates, px kept between the entry point and the wall
G.arrival = null;
function arrivalPoint(id, from) { // { x, y, rot } for a ship entering system id from system `from`, or null
  const dest = SYSTEMS[id], origin = from && SYSTEMS[from];
  if (!dest || !origin || !origin.ly || !dest.ly) return null;
  let dx = origin.ly[0] - dest.ly[0], dy = origin.ly[1] - dest.ly[1];
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const half = dest.size / 2 - ARRIVE.margin, k = half / Math.max(Math.abs(dx), Math.abs(dy)); // out along the heading to the square's edge
  const x = dest.size / 2 + dx * k, y = dest.size / 2 + dy * k;
  return { x, y, rot: Math.atan2(dest.size / 2 - y, dest.size / 2 - x) };
}
function enterSystem(id, from) {
  if (!Object.prototype.hasOwnProperty.call(SYSTEMS, id)) return false;
  const at = arrivalPoint(id, from);
  G.system = id; if (!G.known.includes(id)) G.known.push(id); G.jumps = (G.jumps | 0) + 1;
  G.arrival = at ? Object.assign({ system: id, from: from || null }, at) : null;
  return true;
}

// ---------- The generator (docs/UNIVERSE.md 4.4; card u-e6) ----------
// makeSystem(seed, kind) builds one system of the section 4.1 shape from a number; makeGalaxy(seed, n) scatters n of them over the galaxy map. Same arguments,
// same result, every time and on every machine: only the seeded generator below is used, never Math.random. Nothing here runs at boot and nothing reads it yet:
// the systems it makes are NOT in SYSTEMS (land dark, 10.1 rule 2). generatedSystems() gives the eight the card proves it with; the card that opens them to
// the player adds them with Object.assign(SYSTEMS, generatedSystems()). "More is cheap" is a bigger n or another seed in GALAXY_GEN.
const GEN = {
  size: 36000,       // world px, as the authored systems
  margin: 1500,      // px kept between a body's edge and the world's wall
  gap: 2500,         // (these px are the old units: makeSystem lays a system out in them and sysScale spreads it out, so the real gaps are SYSTEM_SCALE times these)
                     // px of clear space between the edges of any two things (4.4 "minimum 2500 px between anything"), the star counts as a body of radius starClear
  starClear: 800,
  ringFrom: 4500, ringStep: 2800, // planets sit on loose rings round the star: ring i is about ringFrom + i * ringStep px out
  area: [80, 50],    // the galaxy map, light years
  edge: 2,           // ly kept between a star and the map's edge
  apart: 5,          // ly between any two stars
  range: 18,         // ly of the longest jump a ship has (the explorer); the galaxy is repaired so this ship can reach every star
  reach: 16.5,       // ly a star is pulled to when the repair moves it next to a reached one: under range, so rounding can never break the link
  perDanger: 12      // ly from Halcyon for each point of danger
};
const GALAXY_GEN = { seed: 41, n: 8 }; // the eight generated systems that make 16 in all with the authored eight; seed 41 was picked from the first 3000 for a mix of six kinds and five docks (tests/galaxy.mjs pins it)

// the syllables of a star's name: an onset, sometimes a middle, an end
const GEN_SYL = {
  on: ['Ka', 'Vel', 'Or', 'Thal', 'Zen', 'Mir', 'Dra', 'Os', 'Ul', 'Cor', 'Bel', 'Syl', 'Tor', 'Quel', 'Ny', 'Ar', 'Fen', 'Hal', 'Jor', 'Lum', 'Pel', 'Ix', 'Ae', 'Sar'],
  mid: ['a', 'e', 'o', 'i', 'ar', 'en', 'or', 'il'],
  end: ['ris', 'von', 'thos', 'lan', 'mere', 'dor', 'nax', 'tia', 'vane', 'ron', 'sel', 'kai']
};
const GEN_ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const GEN_WRECKS = ['Ore hauler', 'Passenger liner', 'Patrol cutter', 'Mining tug', 'Survey ship', 'Cargo barge', 'Tanker', 'Yacht', 'Salvage tug', 'Courier', 'Freighter', 'Ferry', 'Gunship hulk', 'Drill ship'];

// What each kind makes. weight: its share of a galaxy (percent); planets [min, max] on rings, of the kinds listed; belts [min, max]; wrecks [min, max] (credits up to cr);
// beacon: a beacon too; ruin: a dead station to fly to; stars: the star types it takes; traffic 0 to 3; danger: { add, min, max } on top of the distance rule;
// station: { art, suffix, dock } or null; pirates: its own spawn table, or none so that it comes from the danger (src/enemies.js pirateTable).
// "lawless" is a mining system with no police: its kind in the output is still 'mining' (the galaxy map knows eight kinds), with lawless: true.
const GEN_KINDS = {
  wild: { weight: 25, kind: 'wild', planets: [1, 4], planetKinds: ['rock', 'ice', 'gas', 'ringed', 'lava'], belts: [0, 2], wrecks: [0, 1], cr: 220, beacon: true, stars: ['M', 'K', 'G'], traffic: 0,
    danger: { add: 1, min: 1, max: 4 }, station: null },
  mining: { weight: 20, kind: 'mining', planets: [1, 3], planetKinds: ['rock', 'lava', 'ice'], belts: [2, 3], wrecks: [1, 2], cr: 220, stars: ['K', 'G', 'A'], traffic: 1,
    danger: { add: 1, min: 1, max: 4 }, station: { art: 'foundry', suffix: 'Smelter', dock: { fuel: [6, 7], repair: 0.5, ore: [28, 30], yard: ['ox'], shop: 0, parts: { cargo: 3, tank: 3 } } } },
  outpost: { weight: 15, kind: 'outpost', planets: [1, 3], planetKinds: ['ringed', 'gas', 'rock', 'ice'], belts: [0, 1], wrecks: [0, 1], cr: 200, beacon: true, stars: ['K', 'G', 'F'], traffic: 1,
    danger: { add: 0, min: 1, max: 3 }, station: { art: 'outpost', suffix: 'Outpost', dock: { fuel: [7, 8], repair: 0.5, shop: 0, parts: { engine: 1, tank: 1 } } } },
  graveyard: { weight: 10, kind: 'graveyard', planets: [0, 1], planetKinds: ['rock'], belts: [0, 1], wrecks: [6, 10], cr: 400, ruin: true, stars: ['M'], traffic: 0,
    danger: { add: 1, min: 2, max: 4 }, station: null, pirates: { max: 8, every: 11000, weights: { drone: 0.8, raider: 0.15, gunship: 0.05 } } },
  trade: { weight: 10, kind: 'trade', planets: [2, 4], planetKinds: ['ice', 'gas', 'rock', 'ringed'], belts: [1, 1], wrecks: [0, 1], cr: 200, stars: ['F', 'G'], traffic: 3,
    danger: { add: 0, min: 1, max: 3 }, station: { art: 'hub', suffix: 'Exchange', dock: { fuel: [8, 10], repair: 0.5, ore: [24, 27], yard: ['wren', 'kite', 'ox'], shop: 0, parts: { shields: 2, weapons: 2, engine: 2, tank: 2, cargo: 2, aim: 2 } } } },
  nest: { weight: 10, kind: 'nest', planets: [1, 2], planetKinds: ['rock', 'lava'], belts: [1, 2], wrecks: [2, 3], cr: 300, stars: ['M', 'K'], traffic: 0,
    danger: { add: 2, min: 4, max: 5 }, station: { art: 'nest', suffix: 'Dock', dock: { fuel: [14, 16], repair: 0.5, yard: ['bastion'], shop: 0, parts: { shields: 3, weapons: 3, aim: 3 }, partMult: 1.25, fee: 50, salvageMult: 2 } } },
  lawless: { weight: 10, kind: 'mining', lawless: true, planets: [1, 2], planetKinds: ['rock', 'lava'], belts: [2, 3], wrecks: [1, 2], cr: 260, stars: ['K', 'A'], traffic: 0,
    danger: { add: 2, min: 3, max: 5 }, station: { art: 'foundry', suffix: 'Hold', dock: { fuel: [11, 13], repair: 0.5, ore: [30, 34], yard: ['talon'], shop: 0, parts: { weapons: 2, aim: 2 }, partMult: 1.15, fee: 30 } },
    pirates: { max: 9, every: 10000, weights: { raider: 0.6, drone: 0.2, gunship: 0.2 } } }
};
const GEN_PLANET_R = { rock: [200, 320], ice: [260, 400], gas: [420, 560], lava: [300, 440], ringed: [420, 560] }; // radius in world px, as the authored ones

function genRng(seed) { // mulberry32, the generator of src/art_world.js waRng; kept here so this file stands alone (the tests load it without the art)
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const genSlug = name => name.toLowerCase().replace(/[^a-z]/g, '');
function genName(rng) {
  const pick = a => a[Math.floor(rng() * a.length)];
  const a = pick(GEN_SYL.on), m = rng() < 0.45 ? pick(GEN_SYL.mid) : '', e = pick(GEN_SYL.end);
  return a + m + e;
}

// one system of the 4.1 shape: ly is null (makeGalaxy places it) and danger is the kind's lowest (makeGalaxy sets it from the distance); an unknown kind makes a wild one
function makeSystem(seed, kind) {
  const spec = GEN_KINDS[kind] || GEN_KINDS.wild, rng = genRng(seed);
  const rf = (a, b) => a + rng() * (b - a), ri = (a, b) => a + Math.floor(rng() * (b - a + 1)), pick = a => a[Math.floor(rng() * a.length)];
  const name = genName(rng), id = genSlug(name), S = GEN.size, c = S / 2;
  const sys = { id, name, kind: spec.kind, ly: null, size: S, danger: spec.danger.min, traffic: spec.traffic, seed: seed >>> 0 };
  if (spec.lawless) sys.lawless = true;
  sys.star = { type: pick(spec.stars), x: Math.round(c + rf(-1500, 1500)), y: Math.round(c + rf(-1500, 1500)) };
  if (spec.pirates) sys.pirates = { max: spec.pirates.max, every: spec.pirates.every, weights: Object.assign({}, spec.pirates.weights) };
  sys.bodies = [];
  const placed = [{ x: sys.star.x, y: sys.star.y, r: GEN.starClear }];
  // a free spot for a body of radius r, tried at most `tries` times from `sample()`; null when there is none (the body is then left out)
  const spot = (r, tries, sample) => {
    for (let i = 0; i < tries; i++) {
      const p = sample(), lo = GEN.margin + r, hi = S - GEN.margin - r;
      if (p.x < lo || p.x > hi || p.y < lo || p.y > hi) continue;
      if (placed.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= GEN.gap + r + q.r)) { const at = { x: Math.round(p.x), y: Math.round(p.y), r }; placed.push(at); return at; }
    }
    return null;
  };
  const anywhere = () => ({ x: rf(GEN.margin, S - GEN.margin), y: rf(GEN.margin, S - GEN.margin) });
  const ring = d => { const a = rf(0, Math.PI * 2); return { x: sys.star.x + Math.cos(a) * d, y: sys.star.y + Math.sin(a) * d }; };

  if (spec.station) { // the dock first, so that it always has room: 4000 to 12000 px from the star
    const at = spot(150, 400, () => ring(rf(4000, 12000)));
    if (at) {
      const dock = {};
      Object.keys(spec.station.dock).forEach(k => {
        const v = spec.station.dock[k];
        dock[k] = Array.isArray(v) && typeof v[0] === 'number' ? ri(v[0], v[1]) : (Array.isArray(v) ? v.slice() : (v && typeof v === 'object' ? Object.assign({}, v) : v));
      });
      sys.bodies.push({ id: id + '-dock', type: 'station', art: spec.station.art, name: name + ' ' + spec.station.suffix, x: at.x, y: at.y, dock });
    }
  }
  const planets = []; // the planets, each on its own ring; named I, II, III from the star outward
  for (let i = 0, n = ri(spec.planets[0], spec.planets[1]); i < n; i++) {
    const kd = pick(spec.planetKinds), r = Math.round(rf(GEN_PLANET_R[kd][0], GEN_PLANET_R[kd][1]));
    const at = spot(r, 60, () => ring(GEN.ringFrom + i * GEN.ringStep + rf(-600, 600)));
    if (at) planets.push({ type: 'planet', kind: kd, seed: ri(1, 9999), x: at.x, y: at.y, r, landable: false, _d: Math.hypot(at.x - sys.star.x, at.y - sys.star.y) });
  }
  planets.sort((p, q) => p._d - q._d).forEach((p, i) => { delete p._d; sys.bodies.push(Object.assign({ id: id + '-' + GEN_ROMAN[i].toLowerCase(), name: name + ' ' + GEN_ROMAN[i] }, p)); });
  for (let i = 0, n = ri(spec.belts[0], spec.belts[1]); i < n; i++) {
    const r = Math.round(rf(700, 1000)), at = spot(r, 60, anywhere);
    if (at) sys.bodies.push({ id: id + '-belt-' + (i + 1), type: 'belt', name: name + (i ? ' Belt ' + GEN_ROMAN[i] : ' Belt'), x: at.x, y: at.y, r, rocks: ri(15, 40) });
  }
  if (spec.ruin) { const at = spot(150, 60, anywhere); if (at) sys.bodies.push({ id: id + '-ruin', type: 'scenery', look: 'derelict', name: 'Dead station', x: at.x, y: at.y, labelDy: -240 }); }
  for (let i = 0, n = ri(spec.wrecks[0], spec.wrecks[1]); i < n; i++) {
    const at = spot(60, 60, anywhere);
    if (at) sys.bodies.push({ id: id + '-wreck-' + (i + 1), type: 'poi', kind: 'wreck', name: pick(GEN_WRECKS), x: at.x, y: at.y, credits: Math.round(ri(100, spec.cr) / 10) * 10 });
  }
  if (spec.beacon) { const at = spot(60, 60, anywhere); if (at) sys.bodies.push({ id: id + '-beacon', type: 'poi', kind: 'beacon', name: 'Old survey beacon', x: at.x, y: at.y, credits: Math.round(ri(120, 200) / 10) * 10 }); }
  return sysScale(sys); // laid out in the old units by the GEN numbers above, then spread out like every other system (src/data_systems.js SYSTEM_SCALE)
}

// n new systems over the galaxy map, kept clear of the systems in `fixed` (default: the authored ones): kinds by the shares of GEN_KINDS, at least GEN.apart ly from every
// other star, danger up by one for each GEN.perDanger ly from Halcyon, names and ids that no other system has, and the graph repaired so that a ship with GEN.range ly of
// jump reaches every star. Returns an array of systems (fewer than n only if the map has no room left).
function makeGalaxy(seed, n, fixed) {
  fixed = fixed || SYSTEMS;
  const rng = genRng(seed), W = GEN.area[0], H = GEN.area[1], E = GEN.edge;
  const stars = Object.keys(fixed).map(k => fixed[k]).filter(s => s.ly), base = stars.length; // every star on the map; the generated ones are appended, so they are stars[base..]
  const origin = (fixed.halcyon && fixed.halcyon.ly) || [20, 22];
  const dist = (a, b) => Math.hypot(a.ly[0] - b.ly[0], a.ly[1] - b.ly[1]);
  const r1 = v => Math.round(v * 10) / 10;
  const free = (p, except) => p[0] >= E && p[0] <= W - E && p[1] >= E && p[1] <= H - E && stars.every(s => s === except || Math.hypot(s.ly[0] - p[0], s.ly[1] - p[1]) >= GEN.apart);
  const used = new Set();
  stars.forEach(s => { used.add(String(s.id)); used.add(genSlug(String(s.name))); });
  Object.keys(fixed).forEach(k => used.add(k));
  const order = Object.keys(GEN_KINDS), sum = order.reduce((t, k) => t + GEN_KINDS[k].weight, 0);
  const pickKind = () => { let x = rng() * sum; for (const k of order) { x -= GEN_KINDS[k].weight; if (x < 0) return k; } return order[order.length - 1]; };

  for (let i = 0; i < n; i++) { // scatter
    let ly = null;
    for (let t = 0; t < 300 && !ly; t++) { const p = [r1(E + rng() * (W - 2 * E)), r1(E + rng() * (H - 2 * E))]; if (free(p)) ly = p; }
    if (!ly) break;
    const kind = pickKind();
    let s = (rng() * 1e9) >>> 0, sys = makeSystem(s, kind);
    for (let t = 0; used.has(sys.id) && t < 200; t++) { s = (s + 7919) >>> 0; sys = makeSystem(s, kind); } // a name another system has: the next seed
    used.add(sys.id);
    sys.ly = ly; stars.push(sys);
  }
  const made = stars.slice(base);

  const reached = () => { // the stars a ship with GEN.range reaches from Halcyon
    const seen = new Set(), todo = [stars.find(s => s.id === 'halcyon') || stars[0]];
    seen.add(todo[0]);
    while (todo.length) { const a = todo.pop(); stars.forEach(b => { if (!seen.has(b) && dist(a, b) <= GEN.range) { seen.add(b); todo.push(b); } }); }
    return seen;
  };
  for (let guard = 0; guard < 400; guard++) { // repair: the unreached star nearest to a reached one moves next to it
    const seen = reached(), lost = made.filter(s => !seen.has(s));
    if (!lost.length) break;
    const pairs = [];
    lost.forEach(b => seen.forEach(a => pairs.push({ a, b, d: dist(a, b) })));
    pairs.sort((p, q) => p.d - q.d);
    let moved = false;
    for (const { a, b } of pairs) {
      const ang = Math.atan2(b.ly[1] - a.ly[1], b.ly[0] - a.ly[0]);
      for (const rad of [GEN.reach, 15, 13, 11, 9, 7, 5.5]) {
        for (let k = 0; k < 24 && !moved; k++) { // the straight line first, then fanning out to either side
          const turn = (k & 1 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12), p = [r1(a.ly[0] + Math.cos(ang + turn) * rad), r1(a.ly[1] + Math.sin(ang + turn) * rad)];
          if (free(p, b)) { b.ly = p; moved = true; }
        }
        if (moved) break;
      }
      if (moved) break;
    }
    if (!moved) break; // no room anywhere: leave it to the caller's check
  }
  made.forEach(s => { // danger from the distance to Halcyon, then the kind's own limits
    const spec = GEN_KINDS[s.lawless ? 'lawless' : s.kind] || GEN_KINDS.wild, d = Math.hypot(s.ly[0] - origin[0], s.ly[1] - origin[1]);
    s.danger = Math.max(spec.danger.min, Math.min(spec.danger.max, 1 + Math.floor(d / GEN.perDanger) + spec.danger.add));
  });
  return made;
}

// the eight systems this card generates (GALAXY_GEN), as { id: system } like SYSTEMS; made on first use and kept, so nothing runs at boot
let GEN_CACHE = null;
function generatedSystems() {
  if (!GEN_CACHE) { GEN_CACHE = {}; makeGalaxy(GALAXY_GEN.seed, GALAXY_GEN.n).forEach(s => { GEN_CACHE[s.id] = s; }); }
  return GEN_CACHE;
}
