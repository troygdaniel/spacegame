// ---------- Campaign: the worlds of Sol and of the other stars (card space-game-campaign-sol; Troy, 20 Nov 2026) ----------
// Level 1 had four places (Earth, Luna, Mars, Eros). Troy wants the whole of Sol in the Campaign, with the orbit rings round the Sun and the belt as a ring of rocks, like Long Haul's solar map, and the
// same for every level's star: the star in the middle, its rings, its planets. The data is Long Haul's own: the Sol pack (mods/sol, docs/SOL.md) is in the page as MODS whether or not the pack is switched on,
// and holds Sol, Alpha Centauri and Epsilon Eridani as bodies with an orbit (a ring round the star, in the file's units), an angle, a size and a look. This file is the PURE half (no Phaser, no page; tests/campsol.mjs
// runs it in Node): it places those bodies in a level's own coordinates, once, at load, and says where the rings and the belts are. src/campmap.js and src/campmapdraw.js draw the rings, the belts and the names on the
// Tab map, and the Campaign scene draws a far body when the carrier comes near it.
// A level opts in with ONE line of data, CAMP.levels[n].world (src/campaign.js):
//   { system: 'sol', fit: { place: 'earth', pack: 'sol-earth' }, star: [x, y] | 'place id' }
//   system  the pack's system file;  fit  one of the level's own places and the pack body it is: the rest are put round the star at their rings and angles, turned and scaled to agree with it
//   star    where the star is in the level's coordinates (a place of the level, or [x, y]); without it the star is placed so that the fit place sits on its ring at its own angle (k and turn adjust that)
//   same    { levelPlaceId: packBodyId }: the level's place IS that body, so the pack's is not added again (the level's own place stays as it is, where the level has put it)
//   k, turn the rings are k times the pack's (default 1); the whole is turned by `turn` degrees (default 0)
// A place the level already has (by id, or named in `same`) is never replaced; the others are added to the level's places with `far: true` when they are more than CAMP.world.farFrom from where the level starts.
//   campWorldInstall()        once, at the foot of this file: every level with a `world` gets its places and its L.worldData
//   campWorldOf(level)        L.worldData: { star: { id, x, y, r, type }, rings: [px], bands: [{ r0, r1, dots: [[x, y]] }], clusters: [{ x, y, r, dots }], k, turn, system } or null
//   campWorldKm(px)           px as the km the Campaign says (px / 10, as the ship computer says "the mothership is N km away")
const campWorldRng = seed => { let a = (seed | 0) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const campWorldHash = s => { let h = 7; String(s).split('').forEach(c => { h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; }); return h; };
const campWorldRad = deg => deg * Math.PI / 180;

function campWorldPack(system) { // the data of one system of the Sol pack, or null (no pack, no such system)
  try {
    const p = (typeof MODS !== 'undefined' && MODS && MODS.packs || []).find(q => q && q.name === 'sol');
    const e = p && (p.entries || []).find(x => x && x.type === 'system' && x.id === system);
    return e && e.data && Array.isArray(e.data.bodies) ? e.data : null;
  } catch (e) { return null; }
}

// where the pack's bodies go in a level's coordinates: { S: { x, y }, k, turn (rad), ringPx(b) } for the level's world line, or null
function campWorldFit(L) {
  const W_ = L && L.world, K = CAMP.world, sd = W_ && campWorldPack(W_.system), pl = L && (L.places || CAMP.places);
  if (!sd || !W_.fit) return null;
  const pk = sd.bodies.find(b => b.id === W_.fit.pack), at = pl && pl[W_.fit.place];
  if (!pk || !at || !(pk.orbit > 0)) return null;
  const ang = campWorldRad(pk.angle || 0), R = pk.orbit * K.scale;
  let S = null;
  if (Array.isArray(W_.star)) S = { x: W_.star[0], y: W_.star[1] };
  else if (typeof W_.star === 'string' && pl[W_.star]) S = { x: pl[W_.star].x, y: pl[W_.star].y };
  let k = W_.k || 1, turn = campWorldRad(W_.turn || 0);
  if (S) { k = Math.hypot(at.x - S.x, at.y - S.y) / R; turn = Math.atan2(at.y - S.y, at.x - S.x) - ang; } // the star is where the level says: scale and turn so the fit place sits at its own distance and direction
  else S = { x: at.x - Math.cos(ang + turn) * R * k, y: at.y - Math.sin(ang + turn) * R * k };
  return { S, k, turn, sd, K };
}

// the bodies the Campaign takes of a system: planets and asteroids that go round the star (not moons), and belts
const campWorldTakes = (b, K) => (b.type === 'planet' || b.type === 'belt') && !b.parent && K.skip.indexOf(b.id) < 0 && b.orbit > 0;

function campWorldBuild(L) {
  const F = campWorldFit(L); if (!F) return null;
  const { S, k, turn, sd, K } = F, pl = L.places || CAMP.places, W_ = L.world, same = W_.same || {}, taken = Object.keys(same).map(q => same[q]);
  const start = pl[L.start] || { x: 0, y: 0 };
  const sx = L.startAt ? start.x + (L.startAt[0] || 0) : start.x, sy = L.startAt ? start.y + (L.startAt[1] || 0) : start.y;
  const pos = b => { const a = campWorldRad(b.angle || 0) + turn, r = b.orbit * K.scale * k; return { x: S.x + Math.cos(a) * r, y: S.y + Math.sin(a) * r, ring: r }; };
  const data = { system: W_.system, S, k, turn, rings: [], bands: [], clusters: [], star: null, added: [] };
  const id = b => String(b.id).replace(/^sol-/, '');
  const planets = [], belts = [];
  sd.bodies.forEach(b => {
    if (!campWorldTakes(b, K) || taken.indexOf(b.id) >= 0) return;
    const pid = pl[id(b)] ? id(b) + '-w' : id(b);
    if (pl[id(b)] && (pl[id(b)].name === b.name)) return; // the level has this body already, by the same name: it stays as it is
    const q = pos(b);
    if (b.type === 'planet') planets.push({ pid, b, q }); else belts.push({ pid, b, q });
  });
  // the star: a place of its own when the level has none (Sol, Epsilon Eridani); the level's 'sun' when it names one
  const starType = sd.starType || 'G', size = typeof STAR_TYPES !== 'undefined' && STAR_TYPES[starType] ? STAR_TYPES[starType].size : 1;
  const starPlace = typeof W_.star === 'string' ? pl[W_.star] : null;
  if (starPlace) data.star = { id: W_.star, x: starPlace.x, y: starPlace.y, r: starPlace.r || 200, type: starType };
  else {
    const sid = W_.system === 'sol' ? 'sun' : 'star';
    if (!pl[sid]) pl[sid] = { x: Math.round(S.x), y: Math.round(S.y), name: W_.system === 'sol' ? 'Sun' : String(sd.name || 'The') + ' star', kind: 'star', star: starType, r: Math.round(900 * size * K.starR), far: true, world: true };
    data.star = { id: sid, x: pl[sid].x, y: pl[sid].y, r: pl[sid].r, type: starType };
  }
  planets.forEach(({ pid, b, q }) => {
    const far = Math.hypot(q.x - sx, q.y - sy) > K.farFrom;
    pl[pid] = { x: Math.round(q.x), y: Math.round(q.y), name: String(b.name), kind: b.kind || 'rock', seed: b.seed || 1, r: Math.max(20, Math.round((b.r || 100) * K.planetR)), far, world: true };
    data.added.push(pid);
  });
  // rings: the distance from the star of every body the level shows (not the star itself, not a moon within a few ring-widths of its planet's ring), one circle for bodies that share one
  const ringOf = p => Math.hypot(p.x - data.star.x, p.y - data.star.y);
  const dist = []; Object.keys(pl).forEach(q => { const p = pl[q]; if (p.hidden || q === data.star.id || p.kind === 'star') return; const r = ringOf(p); if (r > data.star.r * 1.2) dist.push(r); });
  dist.sort((a, c) => a - c).forEach(r => { const last = data.rings[data.rings.length - 1]; if (last === undefined || (r - last) / last > K.ringTol) data.rings.push(r); });
  // belts: the pack's belts on one ring (within bandJoin of each other) make one band of rocks; a belt on a planet's ring is a cluster of rocks round its place (the Trojan camps)
  const bandOf = [];
  belts.forEach(({ pid, b, q }) => {
    const onPlanet = planets.some(p => Math.abs(p.q.ring - q.ring) / q.ring < K.clusterTol) || Object.keys(pl).some(z => !pl[z].world && !pl[z].hidden && z !== data.star.id && pl[z].kind !== 'star' && Math.abs(ringOf(pl[z]) - q.ring) / q.ring < K.clusterTol);
    const half = (b.r || 800) * K.scale; // the belt's own half-width in the pack, at the Campaign's scale
    if (onPlanet) { data.clusters.push({ id: pid, name: String(b.name), x: q.x, y: q.y, r: half, rocks: b.rocks || 20 }); return; }
    const near = bandOf.find(z => Math.abs(z.ring - q.ring) / z.ring < K.bandJoin);
    if (near) { near.r0 = Math.min(near.r0, q.ring - half); near.r1 = Math.max(near.r1, q.ring + half); near.names.push(String(b.name)); near.ring = (near.r0 + near.r1) / 2; }
    else bandOf.push({ id: pid, ring: q.ring, r0: q.ring - half, r1: q.ring + half, names: [String(b.name)] });
  });
  data.bands = bandOf.map(z => { // the rocks: spread over the band, all the way round, the same every time (seeded by the band's id)
    const rnd = campWorldRng(campWorldHash(W_.system + z.id)), dots = [];
    for (let i = 0; i < K.dots; i++) { const a = rnd() * Math.PI * 2, r = z.r0 + rnd() * (z.r1 - z.r0); dots.push([Math.round(data.star.x + Math.cos(a) * r), Math.round(data.star.y + Math.sin(a) * r)]); }
    return { id: z.id, name: z.names.join(' + '), r0: Math.round(z.r0), r1: Math.round(z.r1), dots };
  });
  data.clusters = data.clusters.map(c => { const rnd = campWorldRng(campWorldHash(c.id)), dots = []; for (let i = 0; i < K.clusterDots; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * c.r; dots.push([Math.round(c.x + Math.cos(a) * r), Math.round(c.y + Math.sin(a) * r)]); } return { id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), r: Math.round(c.r), dots }; });
  data.rings = data.rings.map(r => Math.round(r));
  return data;
}

const campWorldOf = level => { const L = CAMP.levels[level]; return (L && L.worldData) || null; };
const campWorldKm = px => Math.round(px / 10);

function campWorldInstall() {
  Object.keys(CAMP.levels).forEach(n => {
    const L = CAMP.levels[n]; if (!L || !L.world || L.worldData) return;
    try { L.worldData = campWorldBuild(L) || undefined; } catch (e) { /* a level without its world is the level as it was */ }
  });
}
campWorldInstall();
