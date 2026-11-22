// ---------- Campaign: the map of the level (Tab; card space-game-campaign-map; Troy, 20 Nov 2026) ----------
// Troy plays the Campaign and had no map of the solar system in it. Tab opens one over the battle: the whole level to scale on one screen, where the places are,
// the convoys and where they head, the aliens and the mothership, the carrier and the ships it has launched, and in the later levels the star, the caches, the relic
// and the towers. THE BATTLE KEEPS GOING BEHIND IT (a real-time fight read as a map is the point; Esc or Tab closes it, Esc never pauses while it is open).
// This file is the PURE half: what is on the map and where it fits (no Phaser, no page), so tests/campmap.mjs runs it in Node. src/campmapdraw.js draws it with
// the sector map's own helpers (mapPlace puts the names, mapGridStep the grid, hudPanel the glass) and the scene (src/campaignscene.js) calls three functions.
//   campMapBounds(level)          the plain extent of a level's data: places, caches, relic ring, guards, tower rings, where waves come from, convoy ends -> { x0, y0, x1, y1 }
//                                 (data only, so the view does not zoom about while you read it; a ship that leaves it is drawn on the edge, like the radar's rim)
//   campMapFit(b, frame, pad)     the scale and centre that put the bounds in the frame: { s, cx, cy };   campMapPoint(fit, frame, x, y) -> { x, y } on the screen
//   campMapMarks(C)               everything on the map now, from the battle C: [{ type, x, y, ... }], the places first and the carrier last
//   campMapLegend(C, marks)       one row for each kind that is on the map now: [{ type, color, text }]
//   campDotColor(u)               the colour of a ship, for the map and the radar alike
// The key is Tab, the sector map's own: M is the mute key in every screen (src/meta.js), so it cannot also open a map.
const CAMPMAP = {
  key: 'Tab',                               // KeyboardEvent.code of the key that opens and closes the map (the key line and the pause card say "Tab": src/campaignscene.js, content/text/ui.md camp.ui.*)
  frame: { x: 100, y: 100, w: 790, h: 520 },// px: where the map is drawn on the screen (inside the glass panel of 1140 by 650 that src/campmapdraw.js draws)
  pad: 0.08,                                // the share of the level's width and height left empty round it
  crowdZ: 0.6,                              // under this zoom a place's name that cannot be put clear of the others is not drawn (the whole system: the inner planets are a few pixels apart)
  minExtent: 3000,                          // px of space: never zoom in closer than this across (a level with only one place in it)
  km: 10,                                   // px of space in a km (the ship computer's "the mothership is N km away" says px / 10)
  color: { star: 0xffe29a, earth: 0x4aa3ff, place: 0xb9a37a, cache: 0xffd37a, relic: 0x7fe9ff, alien: 0xff4d6d, mother: 0xff4dff, tower: 0xff9a3a, convoy: 0xffb454, carrier: 0xffffff, wing: 0x6dff9c, anomaly: 0xc58cff, scout: 0xb8f0ff, rock: 0x8c8c8c, pickup: 0xffd37a, pirate: 0xe8d24a, patrol: 0x5fd8c0, miner: 0xc9d4e8, torpedo: 0xffe08a }
};

// a place for a small label among others: the first of the candidate centres (a list of { x, y }) where a w by h box overlaps none of the boxes ({ x, y, w, h }: top left and size); null when every one is taken.
// The route label on the whole-system map used to sit on the middle of its line, on top of a belt's name (wrap-up hunt of level 3).
function campMapFreeSpot(cands, w, h, boxes) {
  return (cands || []).find(c => !(boxes || []).some(b => c.x - w / 2 < b.x + b.w && c.x + w / 2 > b.x && c.y - h / 2 < b.y + b.h && c.y + h / 2 > b.y)) || null;
}
// the centres to try for the route label of a line from a to b: the middle, then along the line either side of it, above and below it
function campMapRouteSpots(a, b, off) {
  off = off == null ? 11 : off; const out = [];
  [0.5, 0.38, 0.62, 0.26, 0.74, 0.14, 0.86].forEach(t => { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t; out.push({ x, y: y - off }, { x, y: y + off });  });
  return out;
}
// the colour of a ship (u: a ship of the battle): the radar and the map agree
function campDotColor(u) {
  const c = CAMPMAP.color;
  if (u.scout) return c.scout; // a scout out (card space-game-campaign-scouts): pale cyan, on the map and the radar alike
  if (u.faction === 'pirate') return c.pirate; // pirates are yellow, neutrals teal (a patrol) and pale (a miner): not the aliens' red, not your green (card space-game-l1-pirates-traffic)
  if (u.team === 'neutral') return u.kind === 'patrol' ? c.patrol : c.miner;
  return u.team === 'alien' ? (u.kind === 'mother' ? c.mother : u.kind === 'tower' ? c.tower : c.alien) : u.kind === 'freighter' ? c.convoy : u.kind === 'carrier' ? c.carrier : c.wing;
}

// a place that is far (the Sol card's bodies away from where the level was fitted) is still on the level's own map when the mission uses it: it starts there, happens there, or a convoy leaves it or flies to it (the rim run: the Lunar Base, Ceres, Earth)
const campMapUsed = (L, id) => id === L.start || id === L.place || (L.convoys || []).some(c => c.from === id || c.to === id);
function campMapBounds(level, whole, row) { // whole: the whole of the star's system (Z on the map), else the level's own area (far bodies are not in it); row: the mission's row (C.L), else the level's
  const L = row || CAMP.levels[level], pl = campPlaces(level), box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x, y, r) => { r = r || 0; box.x0 = Math.min(box.x0, x - r); box.y0 = Math.min(box.y0, y - r); box.x1 = Math.max(box.x1, x + r); box.y1 = Math.max(box.y1, y + r); };
  if (!L) return { x0: -CAMPMAP.minExtent / 2, y0: -CAMPMAP.minExtent / 2, x1: CAMPMAP.minExtent / 2, y1: CAMPMAP.minExtent / 2 };
  Object.keys(pl).forEach(id => { const p = pl[id]; if (!p.hidden && (whole || !p.far || campMapUsed(L, id))) add(p.x, p.y, p.r); });
  if (whole && typeof campWorldOf === 'function') { const w = campWorldOf(level); if (w) { const far = Math.max(0, ...w.rings, ...w.bands.map(b => b.r1)); add(w.star.x, w.star.y, far); } } // the rings and the belts round the star (src/campsol.js)
  const st = pl[L.start]; if (st) add(st.x + ((L.startAt || [])[0] || 0), st.y + ((L.startAt || [])[1] || 0), 0);
  if (L.place && pl[L.place]) add(pl[L.place].x, pl[L.place].y, (pl[L.place].r || 60) + 300); // where the mission happens, even when it is far
  (L.caches || []).forEach(c => add(c[0], c[1], 0));
  ((L.objectives || []).find(o => o.type === 'scan') || { points: [] }).points.forEach(p => add(p.at[0], p.at[1], p.r || 0)); // the points of a survey
  if (L.relic && pl[L.relic.place]) add(pl[L.relic.place].x, pl[L.relic.place].y, L.relic.radius);
  (L.guards || []).forEach(g => add(g.at[0], g.at[1], 0));
  (L.towers || []).forEach(t => { const p = pl[t.place]; if (p) add(p.x, p.y, t.r); });
  (L.waves || []).forEach(w => { if (w.from) add(w.from[0], w.from[1], 0); if (w.mother) add(w.mother[0], w.mother[1], 0); });
  (L.convoys || []).forEach(c => { const to = pl[c.to]; if (to) add(to.x, to.y, to.r); });
  if (L.route && typeof campRoutePoints === 'function') campRoutePoints(level, L).forEach(p => add(p.x, p.y, 0)); // the bend of a lane is on the map
  if (!isFinite(box.x0)) return { x0: -CAMPMAP.minExtent / 2, y0: -CAMPMAP.minExtent / 2, x1: CAMPMAP.minExtent / 2, y1: CAMPMAP.minExtent / 2 };
  const m = CAMPMAP.minExtent, cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  if (box.x1 - box.x0 < m) { box.x0 = cx - m / 2; box.x1 = cx + m / 2; }
  if (box.y1 - box.y0 < m) { box.y0 = cy - m / 2; box.y1 = cy + m / 2; }
  return box;
}

function campMapFit(b, frame, pad) {
  pad = pad == null ? CAMPMAP.pad : pad;
  const ex = (b.x1 - b.x0) * (1 + 2 * pad), ey = (b.y1 - b.y0) * (1 + 2 * pad);
  return { s: Math.min(frame.w / ex, frame.h / ey), cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 };
}
// the view at zoom z (1: the level fitted to the frame): the scale and centre to draw with. view is the last one and z0 the zoom it had; focus, a world point or null, is what is zoomed about, which stays where it was on the screen
// (null: the middle of the frame stays). Zoomed in, the view is held inside the fitted extent. Zoomed out past 1 it is the fitted centre, so zooming back in returns to the whole level; with `whole` (the whole system fitted
// to the frame, campMapFit of campMapBounds(level, true)) the centre moves from the level's to the system's as the zoom goes out, and at the zoom where the whole system just fits (campMapWholeZ) it is the system's own.
function campMapView(base, frame, z, view, z0, focus, whole) {
  const s = base.s * z; let cx = view.cx, cy = view.cy;
  if (focus && z0 > 0) { const k = z0 / z; cx = focus.x - (focus.x - cx) * k; cy = focus.y - (focus.y - cy) * k; }
  const vx = frame.w / 2 / s, vy = frame.h / 2 / s, bx = frame.w / 2 / base.s, by = frame.h / 2 / base.s;
  const w = whole && z < 1 ? campMapOutShare(base, whole, z) : 0, mx = base.cx + (whole ? (whole.cx - base.cx) * w : 0), my = base.cy + (whole ? (whole.cy - base.cy) * w : 0);
  const hold = (c, v, b, mid) => v >= b ? mid : Math.max(mid - (b - v), Math.min(mid + (b - v), c));
  return { s, cx: hold(cx, vx, bx, mx), cy: hold(cy, vy, by, my) };
}
// how far along the way out from the level (0) to the whole system (1) a zoom is: by the log of the zoom, so every step out moves the centre the same share of the way
function campMapOutShare(base, whole, z) {
  const zw = campMapWholeZ(base, whole); if (!(zw < 1) || !(z < 1)) return 0;
  return Math.max(0, Math.min(1, Math.log(z) / Math.log(zw)));
}
// the zoom at which the whole system just fits the frame (the level fitted is 1): under 1 for any system larger than the level's own area
const campMapWholeZ = (base, whole) => whole && whole.s > 0 && base && base.s > 0 ? whole.s / base.s : 1;
// the smallest zoom the map goes to: the one at which the whole system fits, but never less far out than `floor` (the old limit, 0.5: a level whose system is no larger than its own area still goes out that far)
const campMapZMin = (base, whole, floor) => Math.min(floor == null ? 1 : floor, campMapWholeZ(base, whole));
const campMapPoint = (fit, frame, x, y) => ({ x: frame.x + frame.w / 2 + (x - fit.cx) * fit.s, y: frame.y + frame.h / 2 + (y - fit.cy) * fit.s });

const CAMPMAP_RANK = { lane: 0, place: 0, objective: 0, relic: 1, anomaly: 2, cache: 2, scan: 2, rock: 2, pickup: 2, tower: 3, convoy: 4, patrol: 4, miner: 4, pirate: 5, alien: 5, tboat: 5, wing: 6, rival: 7, mother: 7, torpedo: 7, carrier: 8 }; // drawn in this order: the carrier on top
function campMapMarks(C, whole) { // whole: the far places too (the whole system); else only the level's own area
  const L = (C.L || CAMP.levels[C.level]), pl = campPlaces(C.level), c = CAMPMAP.color, out = [];
  Object.keys(pl).forEach(id => { const p = pl[id]; if (p.hidden || (p.far && !whole && !campMapUsed(L, id))) return; out.push({ type: 'place', id, x: p.x, y: p.y, r: p.r || 60, name: String(p.name) + (p.base ? ' / ' + p.base : ''), color: p.kind === 'star' ? c.star : id === 'earth' ? c.earth : c.place, outpost: !!(L && L.outposts && L.outposts[id]) }); }); // outpost: a friendly station (the map draws a mark on it)
  (C.caches || []).forEach(k => { if (!k.got) out.push({ type: 'cache', x: k.x, y: k.y, color: c.cache }); });
  if (typeof campRouteMarks === 'function') campRouteMarks(C).forEach(m => out.push(m)); // the lanes of a fork in the road (src/camproute.js)
  if (L.place && pl[L.place]) out.push({ type: 'objective', x: pl[L.place].x, y: pl[L.place].y, r: (pl[L.place].r || 60) + 260, color: c.relic }); // the mission's place: a ring round it, the objective
  (C.scan || []).forEach(p => { if (!p.got) out.push({ type: 'scan', x: p.x, y: p.y, r: p.r, color: c.cache }); }); // the points to scan: gold diamonds like the caches
  (C.rocks || []).forEach(r => { if (r.hp > 0) out.push({ type: 'rock', id: r.id, x: r.x, y: r.y, color: c.rock }); }); // the asteroids a laser cuts, and the ore lying about (a wreck's, a broken rock's): small marks, clickable like the rest (card space-game-campaign-map-targets)
  (C.pickups || []).forEach(p => out.push({ type: 'pickup', id: p.id, x: p.x, y: p.y, color: c.pickup }));
  if (typeof campAnomMarks === 'function') campAnomMarks(C).forEach(a => out.push({ type: 'anomaly', id: 'anom:' + a.id, x: a.x, y: a.y, r: a.r, shown: a.shown, color: a.shown ? c.cache : c.anomaly })); // noticed: an unlabelled warped mark; decloaked: the cache (src/campanomaly.js)
  if (C.relic && L.relic) out.push({ type: 'relic', x: C.relic.x, y: C.relic.y, r: L.relic.radius, hold: L.relic.hold ? C.relic.hold / L.relic.hold : 0, color: c.relic });
  C.ships.forEach(u => {
    if (u.hp <= 0) return;
    const type = u.kind === 'carrier' ? 'carrier' : u.kind === 'freighter' ? 'convoy' : u.kind === 'mother' ? 'mother' : u.kind === 'tower' ? 'tower' : u.rival ? 'rival' : u.boat ? 'tboat' : u.faction === 'pirate' ? 'pirate' : u.team === 'alien' ? 'alien' : u.team === 'neutral' ? (u.kind === 'patrol' ? 'patrol' : 'miner') : 'wing';
    const m = { type, id: u.id, x: u.x, y: u.y, rot: u.rot, color: campDotColor(u) };
    if (type === 'wing' && u.squad) m.squad = u.squad; // a fighter's squad (card space-game-fighter-squads): the map draws its dot in the squad's colour (card space-game-squad-tint)
    if (type === 'convoy' && u.dest) m.to = { x: u.dest.x, y: u.dest.y };
    if (type === 'tboat') m.arming = u.arming > 0; // a torpedo boat (card space-game-torpedo-art): its own mark, with a ring while it arms
    out.push(m);
  });
  (C.torpedoes || []).forEach(t => { if (!t.dead) out.push({ type: 'torpedo', id: t.id, x: t.x, y: t.y, rot: t.rot, color: c.torpedo }); }); // a torpedo in flight: a bright mark, the one thing to look for
  return out.sort((a, b) => CAMPMAP_RANK[a.type] - CAMPMAP_RANK[b.type]);
}

// the legend: a row for each kind of thing on the map now, in the order a player looks for them
function campMapLegend(C, marks) {
  marks = marks || campMapMarks(C);
  const n = t => marks.filter(m => m.type === t).length, c = CAMPMAP.color;
  const rows = [['carrier', c.carrier, 0], ['wing', c.wing, 1], ['convoy', c.convoy, 1], ['alien', c.alien, 1], ['pirate', c.pirate, 1], ['tboat', c.pirate, 1], ['torpedo', c.torpedo, 1], ['patrol', c.patrol, 1], ['miner', c.miner, 1], ['mother', c.mother, 0], ['rival', c.pirate, 0], ['tower', c.tower, 1], ['cache', c.cache, 1], ['anomaly', c.anomaly, 1], ['relic', c.relic, 0]];
  const out = rows.filter(r => n(r[0]) > 0).map(r => ({ type: r[0], color: r[1], text: uiText('camp.map.' + r[0], { n: n(r[0]) }) })), at = out.findIndex(r => r.type === 'wing');
  const sq = CAMP.wing.squads.filter(k => marks.some(m => m.squad === k)).map(k => ({ type: k, color: CAMP.wing.squadColor[k], text: uiText('camp.map.' + k, { n: marks.filter(m => m.squad === k).length }) })); // the squads that have ships out, under the wing's row (their ring on the map)
  if (at >= 0) out.splice(at + 1, 0, ...sq); else out.push(...sq);
  return out;
}

// ---- the rings and the rocks (card space-game-campaign-sol): what is drawn of a circle and of a belt inside the frame, with no drawing in it ----
// campMapArcs(cx, cy, r, frame): the pieces of the circle (centre and radius in screen px) that lie inside the frame, as polylines of [x, y]; none when the circle does not cross it. Each step of the circle is clipped to
// the frame, so a piece reaches the edge of it however long the steps are (a ring of 20,000 px has steps of 60).
function campMapArcs(cx, cy, r, F) {
  if (!(r > 0.5)) return [];
  const nx = Math.max(F.x, Math.min(cx, F.x + F.w)), ny = Math.max(F.y, Math.min(cy, F.y + F.h));
  const near = Math.hypot(cx - nx, cy - ny), far = Math.max(Math.hypot(cx - F.x, cy - F.y), Math.hypot(cx - F.x - F.w, cy - F.y), Math.hypot(cx - F.x, cy - F.y - F.h), Math.hypot(cx - F.x - F.w, cy - F.y - F.h));
  if (r < near || r > far) return [];
  const n = Math.max(48, Math.min(2000, Math.ceil(r / 6))), out = []; let run = [], px = cx + r, py = cy;
  for (let i = 1; i <= n; i++) {
    const a = i / n * 2 * Math.PI, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, c = campMapClip(px, py, x, y, F); // Liang-Barsky: the part of the step inside the frame
    if (c) { if (!run.length) run.push([c[0], c[1]]); run.push([c[2], c[3]]); if (c[5] < 1) { if (run.length > 1) out.push(run); run = []; } } else { if (run.length > 1) out.push(run); run = []; }
    px = x; py = y;
  }
  if (run.length > 1) out.push(run);
  return out;
}
// the part of the segment (x0, y0)-(x1, y1) inside the frame: [x0', y0', x1', y1', t0, t1] (t: where along the segment, 0 to 1), or null
function campMapClip(x0, y0, x1, y1, F) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  const edge = (p, q) => { if (p === 0) return q >= 0; const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
  if (!edge(-dx, x0 - F.x) || !edge(dx, F.x + F.w - x0) || !edge(-dy, y0 - F.y) || !edge(dy, F.y + F.h - y0)) return null;
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy, t0, t1];
}
// the rocks of a belt that are in the frame, as screen points; project(x, y) -> { x, y }
function campMapDotsIn(dots, project, F) {
  const out = [];
  for (let i = 0; i < dots.length; i++) { const p = project(dots[i][0], dots[i][1]); if (p.x >= F.x && p.x <= F.x + F.w && p.y >= F.y && p.y <= F.y + F.h) out.push(p); }
  return out;
}
