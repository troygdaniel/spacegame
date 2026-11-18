// ---------- Star systems as data (docs/UNIVERSE.md section 4.1) ----------
// One plain object per system. Everything with a place in it is a "body" in `bodies`; src/universe.js looks them up, and the
// scenes (space.js, asteroids.js, poi.js, stationart.js, traffic.js, map.js, missions.js) read their coordinates from there
// instead of keeping tables of their own.
//   body.type   station | planet | belt | poi | scenery | gate (a planet with kind and seed is made by planetTexture; a scenery with look by stationLookFx)
//   body.art    the texture key the body is drawn with (boot.js, stationart.js)
//   labelDy     where the name label sits, in pixels above (negative) or below the body
// The rows are no longer written here: they are built from the files in content/ (below). Until 17 Nov 2026 this file held the eight systems as code;
// tests/fixtures/systems-code-rows.json is those rows, and tests/systemsfromfiles.mjs holds what the files build to them.

// ---------- The systems come from the files (card space-game-systems-from-markdown) ----------
// content/systems/<id>.md is a system, content/stations/<id>.md a dock in it, content/poi/<id>.md the payout of a salvage site. tools/build-content.mjs
// checks them and writes the valid ones into content.generated.js as CONTENT.entries, which index.html loads BEFORE this file. sysRowFrom makes the
// row the game flies from those fields, and nothing else: change a number in a file, run the build, and the game has moved.
//   W            { system: { id: fields }, station: { id: fields }, poi: { id: fields } }: the validated fields of the files, by type
//   sysWorldOf(content)   W from a CONTENT object (its entries)
//   sysRowFrom(id, W)     one row in the shape the game reads, in the units the files are written in (sysScale spreads it); null when no file has that id
//   sysRowsFrom(content)  every system of the files: the shipped eight in their order (SYSTEM_ORDER), then any other by id
// A dock is the numbers of the station file under the names the code reads: fuel, repair, ore, yard, missions; parts as dock.shop and dock.parts the way
// src/data_parts.js reads them (a Parts table means the slots it lists to those tiers and no others), partMult, fee and salvageMult. The home dock's
// repair and ore are left out of its row: they are the constants REPAIR_PRICE and ORE_PRICE, which its file sets through src/contenttables.js.
// What a row has beyond the old code rows: description, the system's seed, and on a station body `about` (the words for the Station scene).
const SYSTEM_ORDER = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow', 'lethe', 'ember', 'roost']; // the order the lists show the shipped systems in; a new file comes after them
const SYS_BODY_KEYS = ['name', 'x', 'y', 'art', 'r', 'rocks', 'landable', 'kind', 'seed', 'look', 'labelDy', 'credits', 'hull', 'guard', 'note'];
const sysHas = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
function sysDockFrom(st) {
  const d = {};
  ['fuel', 'repair', 'ore'].forEach(k => { if (st[k] !== undefined) d[k] = st[k]; });
  if (Array.isArray(st.yard)) d.yard = st.yard.slice();
  if (Array.isArray(st.missions)) d.missions = st.missions.slice();
  if (Array.isArray(st.parts) && st.parts.length) { d.shop = 0; d.parts = {}; st.parts.forEach(r => { d.parts[r.slot] = r.tier; }); }
  ['partMult', 'fee', 'salvageMult'].forEach(k => { if (st[k] !== undefined) d[k] = st[k]; });
  return d;
}
// Where a body is (card space-game-orbit-fields-in-files). A row of the Bodies table gives x and y, or leaves them empty and gives its orbit:
// `orbit` units from the sun (the middle of the system when it has none), at `angle` degrees round it clockwise from north (0 north, 90 east,
// 180 south, 270 west: the minimap is north up, and y grows downward in the world). f: the system's own fields. The game only ever reads x and y:
// sysOrbit (src/universe.js) works the ring back out from them, so a body written either way is the same body. null: the row says neither.
function sysPlace(row, f) {
  if (row.x !== undefined && row.y !== undefined) return { x: row.x, y: row.y };
  if (row.orbit === undefined) return null;
  const star = !!f && f.starX !== undefined && f.starY !== undefined, cx = star ? f.starX : ((f && f.size) || 0) / 2, cy = star ? f.starY : ((f && f.size) || 0) / 2, a = (row.angle || 0) * Math.PI / 180;
  return { x: Math.round(cx + Math.sin(a) * row.orbit), y: Math.round(cy - Math.cos(a) * row.orbit) };
}
function sysBodyFrom(row, sysId, W, home) {
  const b = { id: row.id, type: row.type }, at = sysPlace(row, W && W.system && W.system[sysId]);
  SYS_BODY_KEYS.forEach(k => { const v = at && (k === 'x' || k === 'y') ? at[k] : row[k]; if (v !== undefined) b[k] = v; });
  if (row.type === 'poi' && sysHas(W.poi, row.id)) { // a site with its own file is paid from it; the row only says where
    const f = W.poi[row.id];
    ['name', 'credits', 'hull', 'guard'].forEach(k => { if (f[k] !== undefined) b[k] = f[k]; });
    if (f.description !== undefined) b.note = f.description;
  }
  if (row.type === 'station' && sysHas(W.station, row.id) && W.station[row.id].system === sysId) {
    const st = W.station[row.id];
    if (st.name !== undefined) b.name = st.name;
    b.dock = sysDockFrom(st);
    if (home) { delete b.dock.repair; delete b.dock.ore; } // the home dock's two prices are the game's constants
    const about = {};
    ['accent', 'welcome', 'services', 'bar', 'shop'].forEach(k => { if (st[k] !== undefined) about[k] = st[k]; });
    if (Object.keys(about).length) b.about = about;
  }
  return b;
}
function sysRowFrom(id, W, keepHomePrices) {
  if (!W || !sysHas(W.system, id)) return null;
  const f = W.system[id], def = { id, name: f.name, kind: f.kind };
  ['ly', 'size', 'danger', 'traffic', 'pay', 'seed'].forEach(k => { if (f[k] !== undefined) def[k] = f[k]; });
  if (f.starType !== undefined) { def.star = { type: f.starType }; if (f.starX !== undefined) def.star.x = f.starX; if (f.starY !== undefined) def.star.y = f.starY; }
  if (f.pirateMax !== undefined || f.pirateEvery !== undefined || (f.pirates && f.pirates.length)) {
    def.pirates = {};
    if (f.pirateMax !== undefined) def.pirates.max = f.pirateMax;
    if (f.pirateEvery !== undefined) def.pirates.every = f.pirateEvery;
    if (f.pirates && f.pirates.length) { def.pirates.weights = {}; f.pirates.forEach(r => { def.pirates.weights[r.kind] = r.weight; }); }
  }
  if (f.description !== undefined) def.description = f.description;
  def.bodies = (f.bodies || []).map(row => sysBodyFrom(row, id, W, f.kind === 'home' && !keepHomePrices));
  return def;
}
function sysWorldOf(content) {
  const W = { system: {}, station: {}, poi: {} };
  ((content && content.entries) || []).forEach(e => { if (e && sysHas(W, e.type) && typeof e.id === 'string' && e.data && typeof e.data === 'object') W[e.type][e.id] = e.data; });
  return W;
}
function sysRowsFrom(content) {
  const W = sysWorldOf(content), ids = Object.keys(W.system), out = {};
  SYSTEM_ORDER.filter(id => ids.includes(id)).concat(ids.filter(id => !SYSTEM_ORDER.includes(id)).sort()).forEach(id => { const r = sysRowFrom(id, W); if (r) out[id] = r; });
  return out;
}

// SYSTEMS: the table every scene reads, one row per system, made from the files when this script loads. The packs the player turns on are laid over it
// at Boot (src/contenttables.js worldSync): a pack may replace a system or add one. SYSTEMS_FROM says where the rows came from, for the tests.
// A shipped system the files do not give (its file has a mistake and was refused, or the build is of other content) is flown from the sealed copy,
// src/data_systems_core.js, so the game always has its home: SYSTEMS_KEPT names the ones that came from there, for the Title's problem list and the tests.
const SYSTEMS_FROM = typeof CONTENT !== 'undefined' && CONTENT && Array.isArray(CONTENT.entries) ? 'content' : 'nothing';
const SYSTEMS_KEPT = [];
const SYSTEMS = (() => {
  const files = sysRowsFrom(typeof CONTENT !== 'undefined' ? CONTENT : null), core = sysRowsFrom(typeof SYSTEMS_CORE !== 'undefined' ? SYSTEMS_CORE : null), out = {};
  SYSTEM_ORDER.forEach(id => { if (files[id]) out[id] = files[id]; else if (core[id]) { out[id] = core[id]; SYSTEMS_KEPT.push(id); } });
  Object.keys(files).forEach(id => { if (!out[id]) out[id] = files[id]; });
  return out;
})();
if (!SYSTEMS.halcyon) throw new Error('no star systems: content.generated.js (and src/data_systems_core.js) must load before src/data_systems.js: run node tools/build-content.mjs');

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
