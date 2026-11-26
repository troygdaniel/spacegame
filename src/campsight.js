// ---------- Campaign: seeing hostiles from afar (card space-game-see-hostiles-earlier; Troy, 22 Nov 2026) ----------
// Troy wants to see the hostiles early so he can send squads to meet them. The sim always knew where every hostile was; what the player saw of it was a dot on a small radar (gone since card space-game-target-display: the map, the edge arrows and the target display tell it now). This file is the rule of
// what is SEEN and how the player is told (pure, no Phaser: tests/campsight.mjs runs it in Node; the drawing is src/campsightscene.js). The numbers are CAMP.sensor (src/campaign.js; the range is a
// row of the N tuning panel, src/camptune.js).
//   SEEN: a hostile is seen when it is within CAMP.sensor.range of the carrier, or inside the sensor circle of a fighter that is out (CAMP.sensor.wing, campSensors below: the fighters see
//   further; card space-game-cut-escorts, where the scout-escorts' circles became every fighter's), or it is a kind that is always seen (the mothership and the towers, which are the mission's own marks). Everything the player can look at or pick goes through it: the radar and the
//   map's marks, the nav list's enemy rows and the target keys (A D S: src/camptarget.js), the edge arrows and the radio's first call. The AIs, the turrets and the bots' sim calls do NOT: a hostile
//   out of sight still flies and fires; it is only not on the screen's instruments. Range 0 sees nothing but the always-seen kinds.
//   campSeen(C, u)               is this ship seen (a ship of your own side always is)
//   campSightGroups(C, seenOnly) the hostiles that can come and go (not the always-seen kinds), in groups of CAMP.sensor.group px: [{ n, x, y, dist, ids, kinds: { kind: n }, at }] nearest first
//   campSightStep(C)             each tick: the hostiles that come into sight for the first time are called on the radio, after CAMP.sensor.delay ms, one line for a few seconds' worth
//   campSightLine(C, ids)        the call: { key: 'camp.say.sight', vars: { what, dir, km } } or null: how many, which way, how far; the kinds too when a fighter or the carrier is near enough to tell
//   campSightMarks(C)            the groups that came into sight in the last CAMP.sensor.mark ms: [{ x, y, age: 0..1 }] (the edge arrow blinks)
//   campSightArrows(C, scroll, W_, H_, zoom, page)   the edge arrows: a group that is off the screen (or under the HUD) gets one at the edge, pointing at it: [{ x, y, angle, tx, ty, n, dist, what, fresh }] (tx, ty: where the group is on the screen: the arrow turns to it when it is slid along the edge, src/campedgespread.js); `page` { was } (card space-game-edge-pills-position): the page HUD's pill instead of the canvas's arrow: the pill's own on-screen rule with a little play (campEdgeOffscreen; was: what showed last time) and no HUD rectangles, the point where the line from the screen's middle crosses the border
//   campSightDir(dx, dy)         'north', 'north-east' ... for a vector (up on the screen is north)
//   campSensors(C)              the sensor circles of the fighters that are out: [{ id, x, y, r: CAMP.sensor.wing }]
//   campSightFighter(C, x, y, r)  the first fighter of yours that is out within r px of a point, or null: what a cloaked anomaly asks of a ship that is not the cruiser (src/campanomaly.js)
const campSensors = C => C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked).map(u => ({ id: u.id, x: u.x, y: u.y, r: CAMP.sensor.wing }));
const campSightFighter = (C, x, y, r) => ((C && C.ships) || []).find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked && Math.hypot(x - u.x, y - u.y) <= r) || null;
const campSightAlways = u => (CAMP.sensor.always || []).indexOf(u.kind) >= 0;
function campSeen(C, u) {
  if (!C || !C.carrier || !u) return false;
  if (u.team !== 'alien') return true;
  if (campSightAlways(u)) return true;
  const K = CAMP.sensor, c = C.carrier;
  if (Math.hypot(u.x - c.x, u.y - c.y) <= K.range) return true;
  return campSensors(C).some(s => Math.hypot(u.x - s.x, u.y - s.y) <= s.r);
}
// the groups of the hostiles that are seen (seenOnly) or of all of them that can come and go: greedy, nearest the carrier first, a ship joins the first group whose first ship is within CAMP.sensor.group
function campSightGroups(C, seenOnly) {
  if (!C || !C.carrier) return [];
  const K = CAMP.sensor, c = campEye(C), S = C.sight, list = campAliens(C).filter(u => !campSightAlways(u) && (!seenOnly || campSeen(C, u)))
    .sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y) || (a.id < b.id ? -1 : 1)), gs = [];
  list.forEach(u => {
    let g = gs.find(q => Math.hypot(q.first.x - u.x, q.first.y - u.y) <= K.group);
    if (!g) { g = { first: u, ships: [] }; gs.push(g); }
    g.ships.push(u);
  });
  return gs.map(g => {
    const n = g.ships.length, x = g.ships.reduce((a, u) => a + u.x, 0) / n, y = g.ships.reduce((a, u) => a + u.y, 0) / n, kinds = {};
    g.ships.forEach(u => { kinds[u.kind] = (kinds[u.kind] || 0) + 1; });
    const at = S && S.seen ? Math.max.apply(null, g.ships.map(u => S.seen[u.id] != null ? S.seen[u.id] : -1e9)) : -1e9; // the newest first sight in it
    return { n, x, y, dist: Math.hypot(x - c.x, y - c.y), ids: g.ships.map(u => u.id), kinds, at };
  });
}
const CAMP_SIGHT_DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
function campSightDir(dx, dy) { // the screen's y runs down: up is north, right is east
  const a = Math.atan2(dy, dx), i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return uiText('camp.sight.dir.' + CAMP_SIGHT_DIRS[i]);
}
const campSightKindName = k => { const w = uiText('camp.nav.k.' + k); return w.indexOf('camp.nav.k.') === 0 ? k.charAt(0).toUpperCase() + k.slice(1) : w; };
// somebody close enough to tell what they are: the carrier itself or a fighter of yours, within CAMP.sensor.idNear of the group
const campSightKnown = (C, x, y) => !!C.carrier && (Math.hypot(x - C.carrier.x, y - C.carrier.y) <= CAMP.sensor.idNear || campWing(C, 'fighter').some(u => Math.hypot(u.x - x, u.y - y) <= CAMP.sensor.idNear));
// "6 hostiles", or with the kinds known "4 Skiffs, 2 Cutters": the words are content/text/campsight.md's
function campSightWhat(kinds, named) {
  const ks = Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a] || (a < b ? -1 : 1)), total = ks.reduce((a, k) => a + kinds[k], 0);
  if (!named) return uiText('camp.sight.hostile.' + (total === 1 ? 'one' : 'many'), { n: total });
  return ks.map(k => uiText('camp.sight.kind.' + (kinds[k] === 1 ? 'one' : 'many'), { n: kinds[k], kind: campSightKindName(k) })).join(', ');
}
function campSightLine(C, ids) {
  const c = campEye(C), us = ids.map(id => C.by[id]).filter(u => u && u.hp > 0 && u.team === 'alien');
  if (!us.length || !c) return null;
  const n = us.length, x = us.reduce((a, u) => a + u.x, 0) / n, y = us.reduce((a, u) => a + u.y, 0) / n, kinds = {};
  us.forEach(u => { kinds[u.kind] = (kinds[u.kind] || 0) + 1; });
  return { key: 'camp.say.sight', vars: { what: campSightWhat(kinds, campSightKnown(C, x, y)), dir: campSightDir(x - c.x, y - c.y), km: campNavKm(Math.hypot(x - c.x, y - c.y)) } };
}
function campSightStep(C) {
  if (!C || !C.carrier || C.result) return;
  const K = CAMP.sensor, S = C.sight || (C.sight = { seen: {}, pending: [], saidAt: -1e9, marks: [] });
  campAliens(C).forEach(u => {
    if (S.seen[u.id] != null || campSightAlways(u) || !campSeen(C, u)) return;
    S.seen[u.id] = C.t; // the first time it is in sight
    let p = S.pending.find(q => q.due > C.t && Math.hypot(q.x - u.x, q.y - u.y) <= K.group);
    if (!p) { p = { x: u.x, y: u.y, ids: [], due: C.t + K.delay }; S.pending.push(p); }
    p.ids.push(u.id);
  });
  if (!S.pending.length) return;
  const ripe = S.pending.filter(p => p.due <= C.t); if (!ripe.length) return;
  S.pending = S.pending.filter(p => p.due > C.t);
  ripe.forEach(p => {
    const live = p.ids.filter(id => C.by[id] && C.by[id].hp > 0); if (!live.length) return;
    if (C.t - S.saidAt < K.sayEvery * 1000) { S.pending.push({ x: p.x, y: p.y, ids: p.ids, due: S.saidAt + K.sayEvery * 1000 }); return; } // a call was just made: this one waits its turn
    const line = campSightLine(C, live); if (!line) return;
    S.saidAt = C.t; if (typeof campPageHudHides === 'function' && campPageHudHides('contact')) return; // the page HUD's hostiles panel says it (card space-game-page-hud-2, Troy, 25 Nov 2026): no radio sentence while it is on; the time between calls still runs
    campSay(C, line.key, line.vars);
  });
}
function campSightMarks(C) {
  const K = CAMP.sensor, S = C && C.sight; if (!S) return [];
  return campSightGroups(C, true).filter(g => C.t - g.at < K.mark).map(g => ({ x: g.x, y: g.y, age: Math.max(0, (C.t - g.at) / K.mark) }));
}
function campSightArrows(C, scroll, W_, H_, zoom, page) {
  if (!C || !C.carrier) return [];
  const K = CAMP.sensor, A = CAMP.nav.arrow, z = zoom > 0 ? zoom : 1, out = [];
  campSightGroups(C, true).forEach(g => {
    const sx = (g.x - scroll.x - W_ / 2) * z + W_ / 2, sy = (g.y - scroll.y - H_ / 2) * z + H_ / 2;
    if (page ? !campEdgeOffscreen(sx, sy, W_, H_, !!(page.was && page.was.hostiles)) : sx > A.margin && sx < W_ - A.margin && sy > A.margin && sy < H_ - A.margin && !(A.keep || []).some(r => sx >= r[0] && sx <= r[2] && sy >= r[1] && sy <= r[3])) return; // on the screen and clear of the HUD: it is seen as it is (page: the pill's rule, no HUD rectangles)
    const e = typeof campNavEdge === 'function' ? campNavEdge(sx - W_ / 2, sy - H_ / 2, W_, H_, A.margin, page ? null : A.keep) : null; if (!e) return; // page: the point where the line from the screen's middle to the group crosses the border, not walked round to a free spot
    out.push({ x: e.x, y: e.y, angle: e.angle, tx: sx, ty: sy, n: g.n, dist: g.dist, what: campSightWhat(g.kinds, campSightKnown(C, g.x, g.y)), fresh: C.t - g.at < K.mark });
  });
  return out.slice(0, K.arrows);
}

// the ships you protect that are in trouble and off the screen (card space-game-target-display: the radar showed every ship of the convoy, and it is gone): one that is under attack (the full health bar, src/campcharge.js: hit in the
// last CAMP.charge.loud ms) or nearly lost (the bar's red band) gets an arrow at the edge too, nearest the cruiser first, at most CAMP.sensor.friends; { x, y, angle, tx, ty, dist, what: its name, pct, friend: true, fresh: just hit, id, kind, hot: under attack or nearly lost }.
// While the page HUD is on the canvas draws NONE (cards space-game-page-hud-miner-edge-label and space-game-page-hud-friend-edge-pill, Troy, 25 Nov 2026): every ship you protect that is off the screen has its pill at the edge of the page instead (src/camppagehud.js campPageHudFriendEdges), which asks for ALL of them with `all` (not only the ones in trouble, no cap here; `hot` says which are); with the page HUD off every ship in trouble has its arrow as before.
function campSightFriends(C, scroll, W_, H_, zoom, all, page) {
  if (!C || !C.carrier || typeof campChargeBars !== 'function') return [];
  const K = CAMP.sensor, A = CAMP.nav.arrow, z = zoom > 0 ? zoom : 1, out = [], ring = typeof campPageHudHides === 'function' && campPageHudHides('friendlies'); // ring: the page HUD is on and has the ships you protect as rings in its left panel and pills at the edge
  if (ring && !all) return [];
  campChargeBars(C).filter(b => all || b.loud > 0 || b.band === 'red').sort((a, b) => campDist(a, campEye(C)) - campDist(b, campEye(C))).forEach(b => {
    const sx = (b.x - scroll.x - W_ / 2) * z + W_ / 2, sy = (b.y - scroll.y - H_ / 2) * z + H_ / 2;
    if (page ? !campEdgeOffscreen(sx, sy, W_, H_, !!(page.was && page.was[b.id])) : sx > A.margin && sx < W_ - A.margin && sy > A.margin && sy < H_ - A.margin && !(A.keep || []).some(r => sx >= r[0] && sx <= r[2] && sy >= r[1] && sy <= r[3])) return; // on the screen and clear of the HUD: it is seen as it is (page: the pill's rule, no HUD rectangles)
    const e = typeof campNavEdge === 'function' ? campNavEdge(sx - W_ / 2, sy - H_ / 2, W_, H_, A.margin, page ? null : A.keep) : null; if (!e) return;
    out.push({ x: e.x, y: e.y, angle: e.angle, tx: sx, ty: sy, dist: campDist(b, campEye(C)), what: campTdispName(C.by[b.id]), pct: b.pct, friend: true, fresh: b.hit > 0, id: b.id, kind: b.kind, hot: b.loud > 0 || b.band === 'red' });
  });
  return all ? out : out.slice(0, K.friends);
}
