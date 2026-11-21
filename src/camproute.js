// ---------- Campaign: the fork in an escort's road (card space-game-scout-route; Troy, 21 Nov 2026) ----------
// Troy found the escorts boring and the fights not his: he wants to direct the fleet. On an escort mission the road FORKS. A scout sent ahead finds what waits on each lane (an ambush on the short one, a quiet
// long one, sometimes a cache), and the player picks the lane on the Tab map, with the words, or from an order call. Unscouted, the ambush is a surprise. The pure half (no Phaser, no page; tests/camproute.mjs runs
// it in Node). The numbers are CAMP.route in src/campaign.js; the rest is mission DATA, so any escort mission, in any level, pirates or aliens, can have a fork:
//
//   route: { fork: 0.2, join: 0.8, wait: 45, pick: 'short', convoy: 't1',
//            lanes: [ { id: 'short', name: 'Short lane', bend: 0, hides: { waves: [<wave rows>], caches: [{ at: 0.5, off: 0, ore: 40 }] } },
//                     { id: 'long',  name: 'Long lane',  bend: -4000, hides: { ... } } ] }
//
//   fork, join   the shares (0 to 1) of the straight road, from the convoy's start to its place, where the lanes part and where they meet again
//   wait         seconds a convoy holds at the fork for the player's word (CAMP.route.wait when the row says nothing); then it takes `pick`, the first lane when the row says nothing
//   convoy       the convoy the lanes are measured on (the first of the mission when it says nothing); every convoy of the mission takes the lane picked (the haulers go as one)
//   lanes[]      bend: how far the lane's middle is off the straight road, in px (0: the road itself; the minus is the right-hand side of the way she flies); name: what the map and the radio call it
//   hides.waves  ordinary wave rows. They are laid into the mission's waves with the lane's id on them (w.lane) and come only to a convoy on that lane. `on: { lane: f }` is the share of the WHOLE road, so a lane wave
//                at f between fork and join happens in the lane, and a plain wave outside it comes on every lane. Torpedo boats, pirates and aliens: any ships a wave row can name.
//   hides.caches caches (at: the share of the lane, 0 to 1; off: px to the side of it; ore: what it holds) that lie on the lane: they are in C.caches from the start, and a scout may fetch them
//
// The convoy flies start -> fork (and holds there, as long as `wait`, while no lane is chosen) -> the lane's middle -> join -> its place. The share of the road (C.lane[id], what `on: { lane }` reads) climbs the same
// on every lane: the fork is at `fork` and the join at `join` however long the lane is, and the lane's own length is spread between them.
//
//   campRouteRow(row)               at campMissionRow: lays the lanes' hidden waves into row.waves (the lane's id on each; the route object itself is not changed)
//   campRouteGeoOf(level, L, cv)    the road as points: { a (start), b (place), len, fork, join, lanes: { id: { id, name, pts, len, mid, way: [{ x, y, t }] } }, order }  (pure: the Tab map, the briefing and the scout use it)
//   campRouteNew(C)                 at campNew: C.route = { lane: null, passed: false, known: {}, holdAt: null, wait, pick, geo, ... } (null when the mission has no route), and the lanes' caches in C.caches
//   campRouteConvoy(C, f, cv)       at the convoy's start: it is on the route (f.rt), the radio says the road forks (once)
//   campRouteFly(C, u, dt)          one tick of a convoy on the route: to the fork, the hold, the lane, the join, the place
//   campRoutePick(C, id, how)       the pick ('order' | 'auto' after the wait | 'panic' with an enemy within CAMP.route.panic px of the holding convoy): C.route.lane, an event { type: 'lane', lane, auto }         campRouteDo(C, arg, dry)  the order 'lane' (campOrder(C, 'lane', 'long'))
//   campRouteFind(C, words)         a lane by its id or its name: "long", "the short lane", a map row                        campRouteHolding(C)  null, or { lanes, left, convoy } while a convoy waits at the fork
//   campRouteHides(C, id)           what a lane hides now: { ships: { skiff: 3 }, aliens, pirates, caches }                  campRouteRead(C, u)   a scout that has reached a lane reads it (C.route.known[id], the radio)
//   campRouteRows(C)                the lanes as rows of the Tab map's list (campNavRows)                                    campRouteMarks(C)    the lanes as marks of the map (campMapMarks): { type: 'lane', id, pts, chosen, known }
//   campRouteWaveOk(C, w)           a wave of a lane is due only on that lane                                                campWaveCount(C)     { n, total }: the waves that came and the waves that can (the HUD's "wave 2 of 5")
//   campRouteAhead(C, f, px)        a point px ahead of a convoy on the road it will fly (a wave comes out of the dark there)

const campRouteNorm = t => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(?:the|our|a|an|lane|lanes|route|routes|road|way|by|via|on|along|down|take|use|go|pick|choose)\b/g, ' ').replace(/\s+/g, ' ').trim();

function campRouteRow(row) {
  const R = row && row.route; if (!R || !Array.isArray(R.lanes)) return row;
  const extra = []; R.lanes.forEach(l => ((l.hides || {}).waves || []).forEach(w => extra.push(Object.assign({}, w, { lane: l.id }))));
  row.waves = (row.waves || []).concat(extra);
  return row;
}

// the point `d` px along a polyline, and the direction of the piece it is on
function campRouteAlong(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= L || i === pts.length - 1) { const k = L > 0 ? Math.max(0, Math.min(1, d / L)) : 0, ux = L > 0 ? (b.x - a.x) / L : 1, uy = L > 0 ? (b.y - a.y) / L : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ux, uy }; }
    d -= L;
  }
  return { x: pts[0].x, y: pts[0].y, ux: 1, uy: 0 };
}
const campRouteLen = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0);

// where a convoy of the mission begins (the same rule as campSchedule: a little outside the place it leaves) and the road from there
function campRouteStart(level, cv) {
  const pl = campPlaces(level), to = pl[cv.to], from = cv.from ? pl[cv.from] : null; if (!to) return null;
  const a = from ? Math.atan2(to.y - from.y, to.x - from.x) : Math.atan2(to.y, to.x), r = from ? (from.r || 60) + 50 : CAMP.earth.radius + 50;
  return { x: (from ? from.x : 0) + Math.cos(a) * r, y: (from ? from.y : 0) + Math.sin(a) * r, to: { x: to.x, y: to.y } };
}
function campRouteGeoOf(level, L, cv) {
  const R = L && L.route; if (!R || !Array.isArray(R.lanes) || !R.lanes.length) return null;
  cv = cv || (R.convoy && (L.convoys || []).find(c => c.id === R.convoy)) || (L.convoys || [])[0]; if (!cv) return null;
  const s = campRouteStart(level, cv); if (!s) return null;
  const a = { x: s.x, y: s.y }, b = s.to, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const fk = R.fork != null ? R.fork : 0.2, jn = R.join != null ? R.join : 0.8;
  const F = { x: a.x + ux * len * fk, y: a.y + uy * len * fk }, Jn = { x: a.x + ux * len * jn, y: a.y + uy * len * jn }, M = { x: (F.x + Jn.x) / 2, y: (F.y + Jn.y) / 2 };
  const geo = { a, b, len, fork: F, join: Jn, forkAt: fk, joinAt: jn, lanes: {}, order: [] };
  R.lanes.forEach(l => {
    const bend = +l.bend || 0, V = Math.abs(bend) < 1 ? null : { x: M.x + nx * bend, y: M.y + ny * bend }, pts = V ? [F, V, Jn] : [F, Jn], ll = campRouteLen(pts);
    const way = [], t0 = fk, span = jn - fk; let run = 0;
    for (let i = 1; i < pts.length; i++) { run += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); way.push({ x: pts[i].x, y: pts[i].y, t: t0 + span * (ll > 0 ? run / ll : 1) }); }
    geo.lanes[l.id] = { id: l.id, name: String(l.name || l.id), pts, len: ll, mid: V || M, way, normal: { x: nx, y: ny } };
    geo.order.push(l.id);
  });
  return geo;
}
const campRouteGeo = C => C && C.route ? C.route.geo : null;

function campRouteNew(C) {
  const L = C.L, R = L && L.route; C.route = null;
  if (!R || !Array.isArray(R.lanes) || !R.lanes.length) return null;
  const geo = campRouteGeoOf(C.level, L); if (!geo) return null;
  C.route = { lane: null, passed: false, known: {}, holdAt: null, said: false, wait: R.wait != null ? R.wait : CAMP.route.wait, pick: R.lanes.some(l => l.id === R.pick) ? R.pick : R.lanes[0].id, geo };
  R.lanes.forEach(l => ((l.hides || {}).caches || []).forEach(k => { // a cache on the lane: where along it, and a little to the side
    const gl = geo.lanes[l.id], p = campRouteAlong(gl.pts, gl.len * (k.at != null ? k.at : 0.5)), off = k.off || 0;
    C.caches.push({ x: p.x + gl.normal.x * off, y: p.y + gl.normal.y * off, got: false, ore: k.ore | 0, lane: l.id });
  }));
  return C.route;
}

// a convoy of the mission leaves: it flies the route (every convoy of the mission does, on the lane that is picked)
function campRouteConvoy(C, f) {
  const R = C.route; if (!R) return;
  const cv = C.L.convoys.find(c => 'freighter-' + c.id === f.id) || C.L.convoys[0], geo = campRouteGeoOf(C.level, C.L, cv) || R.geo;
  f.rt = { geo: Object.assign({}, geo, { a: { x: f.x, y: f.y } }), i: 0 }; // she begins where she is: the road is measured from her own start
  if (!R.said) { R.said = true; campSay(C, 'camp.say.fork'); }
}
// the waypoints she is flying to: the fork; once a lane is chosen its middle (if it bends), the join and the place
function campRouteWays(C, u) {
  const R = C.route, g = u.rt.geo, ways = [{ x: g.fork.x, y: g.fork.y, t: g.forkAt }];
  if (R.lane && g.lanes[R.lane]) g.lanes[R.lane].way.forEach(p => ways.push(p));
  if (R.lane) ways.push({ x: u.dest.x, y: u.dest.y, t: 1 });
  return ways;
}
function campRouteFly(C, u, dt) {
  const R = C.route, g = u.rt.geo, ways = campRouteWays(C, u);
  let i = Math.min(u.rt.i, ways.length - 1), w = ways[i], d = campDist(u, w);
  const prev = i === 0 ? { x: g.a.x, y: g.a.y, t: 0 } : ways[i - 1], seg = Math.hypot(w.x - prev.x, w.y - prev.y) || 1;
  const last = !!R.lane && i === ways.length - 1;
  if (u.cid != null) C.lane[u.cid] = Math.max(C.lane[u.cid] || 0, Math.max(0, Math.min(1, prev.t + (w.t - prev.t) * (1 - (d - 90) / seg)))); // (the 90 px of the plain road's rule: she has "flown" it when she is within 90 px of the end, so a wave comes when it always came)
  if (campDist(u, u.dest) < 90) { // she is at her place (whatever the state of the fork: a ship put there arrives too)
    if (u.cid != null) C.lane[u.cid] = 1; C.delivered++; u.hp = 0; u.arrived = true; C.events.push({ type: 'arrive', x: u.x, y: u.y, id: u.id }); campSay(C, u.named ? 'camp.say.shiparrived' : 'camp.say.delivered', { name: campConvoyName(u) }); return; }
  if (!last && d <= Math.max(CAMP.route.reach, u.vmax * dt * 1.1)) { // at a waypoint
    if (i === 0 && !R.lane) { // the fork, and no lane chosen: she holds for the player's word, then takes the default lane
      u.vx = u.vy = 0;
      if (R.holdAt == null) { R.holdAt = C.t; C.events.push({ type: 'fork', id: u.id, x: u.x, y: u.y }); campSay(C, 'camp.say.forkhold', { name: campConvoyName(u) }); }
      if (C.ships.some(a => a.team === 'alien' && a.hp > 0 && !a.hold && campDist(a, u) < CAMP.route.panic)) campRoutePick(C, R.pick, 'panic'); // under fire she does not sit still
      else if (C.t - R.holdAt >= R.wait * 1000) campRoutePick(C, R.pick, 'auto');
      return;
    }
    if (i === 0) R.passed = true; // she leaves the fork on a lane: the pick is locked
    u.rt.i = i + 1; return;
  }
  const ang = Math.atan2(w.y - u.y, w.x - u.x);
  u.rot = ang; u.vx = Math.cos(ang) * u.vmax; u.vy = Math.sin(ang) * u.vmax; u.x += u.vx * dt; u.y += u.vy * dt;
}
// a point `px` ahead of a convoy on the road she will fly (the fork and the lane, when one is chosen: before that, the straight road to the fork and on)
function campRouteAhead(C, f, px) {
  const R = C.route; if (!R || !f.rt) return null;
  const ways = campRouteWays(C, f), pts = [{ x: f.x, y: f.y }]; for (let k = Math.min(f.rt.i, ways.length - 1); k < ways.length; k++) pts.push({ x: ways[k].x, y: ways[k].y });
  if (!R.lane) pts.push({ x: f.dest.x, y: f.dest.y }); // no lane yet: on past the fork along the straight road
  const total = campRouteLen(pts), d = Math.min(px, Math.max(0, total - 400)), p = campRouteAlong(pts, d);
  return { x: p.x, y: p.y };
}

// ---- the pick ----
function campRouteFind(C, arg) {
  const R = C && C.route; if (!R) return null;
  if (arg && typeof arg === 'object') { const id = arg.lane || String(arg.id || '').replace(/^lane:/, ''); return R.geo.lanes[id] || null; }
  const q = campRouteNorm(arg); if (!q) return null;
  const lanes = R.geo.order.map(id => R.geo.lanes[id]);
  return lanes.find(l => l.id === q || campRouteNorm(l.name) === q) || lanes.find(l => q.split(' ').includes(l.id) || campRouteNorm(l.name).split(' ').some(w => w.length > 2 && q.split(' ').includes(w))) || null;
}
function campRoutePick(C, id, how) {
  const R = C.route; if (!R || !R.geo.lanes[id]) return false;
  R.lane = id; C.events.push({ type: 'lane', lane: id, auto: how === 'auto' || how === 'panic', panic: how === 'panic' });
  if (how === 'auto' || how === 'panic') campSay(C, how === 'panic' ? 'camp.say.lanepanic' : 'camp.say.laneauto', { lane: R.geo.lanes[id].name.toLowerCase() });
  return true;
}
function campRouteDo(C, arg, dry) {
  const R = C.route; if (!R) return campNo('nolane');
  const lane = campRouteFind(C, arg); if (!lane) return campNo('lanewhat');
  if (R.passed) return campNo('lanelocked', { lane: R.lane && R.geo.lanes[R.lane] ? R.geo.lanes[R.lane].name.toLowerCase() : '' });
  if (!dry) { campRoutePick(C, lane.id, 'order'); C.orders.lane = (C.orders.lane | 0) + 1; }
  return campYes('lanepick', { lane: lane.name.toLowerCase() });
}
function campRouteHolding(C) {
  const R = C && C.route; if (!R || R.passed || R.lane || R.holdAt == null) return null;
  const cv = campConvoys(C)[0];
  return { lanes: R.geo.order.map(id => ({ id, name: R.geo.lanes[id].name, known: !!R.known[id] })), left: Math.max(0, R.wait - (C.t - R.holdAt) / 1000), convoy: cv ? cv.id : '' };
}
// a wave of a lane comes only to a convoy on that lane; before a lane is chosen the default one is the lane in question (what the HUD counts)
const campRouteLaneNow = C => C.route ? (C.route.lane || C.route.pick) : null;
function campRouteWaveOk(C, w) { return !w.lane || !C.route || (C.route.lane != null && C.route.lane === w.lane); }
function campWaveCount(C) {
  const waves = C.L.waves, mine = i => !waves[i].lane || !C.route || waves[i].lane === campRouteLaneNow(C);
  let n = 0, total = 0; waves.forEach((w, i) => { if (mine(i)) { total++; if (C.waves[i] && C.waves[i].started) n++; } });
  return { n, total };
}

// ---- what a lane hides, and the scout that reads it ----
function campRouteHides(C, id) {
  const ships = {}; let pirates = 0, aliens = 0;
  C.L.waves.forEach(w => { if (w.lane !== id) return; Object.keys(w.ships || {}).forEach(k => { ships[k] = (ships[k] || 0) + w.ships[k]; if ((CAMP.pirate && CAMP.pirate.kinds && CAMP.pirate.kinds[k]) || k === 'tboat') pirates += w.ships[k]; else aliens += w.ships[k]; }); });
  return { ships, pirates, aliens, caches: C.caches.filter(k => k.lane === id && !k.got).length };
}
function campRouteText(h) {
  const parts = [], n = h.pirates + h.aliens;
  if (n > 0) parts.push(uiText(h.aliens === 0 ? 'camp.route.pirates' : h.pirates === 0 ? 'camp.route.aliens' : 'camp.route.ships', { n }));
  if (h.caches > 0) parts.push(uiText('camp.route.cache'));
  return parts.length ? parts.join(', ') : uiText('camp.route.quiet');
}
function campRouteRead(C, u) { // a scout that has stayed at a lane's middle reads it
  const s = u.scout, R = C.route; if (!s || !s.lane || !R || !R.geo.lanes[s.lane]) return false;
  const h = campRouteHides(C, s.lane); R.known[s.lane] = h; s.found = s.found || []; s.found.push(campRouteText(h));
  C.events.push({ type: 'laneread', lane: s.lane, n: s.n, ships: h.pirates + h.aliens, caches: h.caches });
  campSay(C, 'camp.say.lanefound', { n: s.n, name: R.geo.lanes[s.lane].name.toLowerCase(), what: campRouteText(h) });
  return true;
}

// ---- the Tab map and its list ----
function campRouteRows(C) {
  const R = C && C.route, c = C && C.carrier; if (!R || R.passed || !c) return [];
  return R.geo.order.map(id => { const l = R.geo.lanes[id]; return { id: 'lane:' + id, kind: 'lane', group: 'routes', name: l.name + (R.lane === id ? ' ' + uiText('camp.route.chosen') : ''), x: l.mid.x, y: l.mid.y, r: 0, lane: id, chosen: R.lane === id, known: !!R.known[id] }; });
}
function campRouteMarks(C) {
  const R = C && C.route; if (!R || R.passed) return [];
  return R.geo.order.map(id => ({ type: 'lane', id, pts: R.geo.lanes[id].pts.map(p => ({ x: p.x, y: p.y })), chosen: R.lane === id, known: !!R.known[id], name: R.geo.lanes[id].name, x: R.geo.lanes[id].mid.x, y: R.geo.lanes[id].mid.y }));
}
// the points a map must fit: the lanes' bends (campMapBounds)
function campRoutePoints(level, L) {
  const geo = campRouteGeoOf(level, L); if (!geo) return [];
  const out = [{ x: geo.fork.x, y: geo.fork.y }, { x: geo.join.x, y: geo.join.y }]; geo.order.forEach(id => out.push({ x: geo.lanes[id].mid.x, y: geo.lanes[id].mid.y })); return out;
}
