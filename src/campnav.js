// ---------- Campaign: navigate by the map (card space-game-campaign-navigate; Troy, 20 Nov 2026) ----------
// Troy wants to use the Tab map to get about: see the objective and how far it is, pick a place or the objective, and have the carrier fly there by itself. The pure half is here
// (no Phaser, no page; tests/campnav.mjs runs it in Node); src/campmapdraw.js draws the list and the marks and takes the keys and the clicks, src/campaignscene.js steers and draws the edge arrow.
//   campNavGoal(C)            what the level asks for next, as a thing on the map: the mothership (else the convoy to protect, else Earth), the cache to gather (else the relic), the nearest tower
//   campNavRows(C)            the one list: the goal, the places, the convoys, the caches and the relic, your ships: [{ id, kind, group, name, x, y, r, dist, ... }], by group then by distance
//   campNavFind(C, words)     what the words name: { row } or { code } ('unknown', 'nogoal', 'nomother', 'noconvoy', ...): "mars", "the relic", "the objective", "the mars convoy"
//   campNavCheck(C, arg)      the dry check the closed list asks before the ship computer says it will fly: { ok, say, row } or { ok: false, say }
//   campNavGo(C, row, fast)   fly there: C.nav = { on, id, kind, name, fast, ... }; fast is the map's Fast button, a burn at CAMP.nav.fast times the speed; campNavClear(C, why) ends it (why: key, clear, arrived, lost)
//   campNavDrive(C, dt)       once a tick, from campTick (src/campaign.js), while C.nav is on: it sets the carrier's input (turn, thrust, brake) by the Long Haul autopilot's rule
//   campNavEta(C, dist)       the flight time in seconds;   campNavPickAt(rows, project, px, py)   the row nearest a click on the map
//   campNavEdge(dx, dy, W, H, margin, keep) / campNavArrow(C, scroll, W, H)   where the arrow at the screen edge sits and which way it points, out of the HUD's way
//   campNavIntent(text)       the plain words ("fly to Mars", "go to the relic", "take me to the objective", "cancel the course", "fly fast to Mars", "burn to the relic") as { act: 'fleet_fly', arg } (a burn: arg begins "fast ")
//   campNavFly(C, row, fast, how)   the one door every trip goes through (the map, the words, the panel): regular speed always; Fast only with the wing aboard (card space-game-campaign-fast-board, below)
// The rule, the stop distances and every number are CAMP.nav in src/campaign.js. Steering is the player's: any steering key ends it (the scene calls campNavClear(C, 'key')); the orders go on.
const CAMPNAV = {
  groups: [['goal', 'GOAL'], ['places', 'PLACES'], ['routes', 'ROUTE'], ['convoys', 'CONVOYS'], ['traffic', 'TRAFFIC'], ['enemies', 'ENEMIES'], ['finds', 'CACHES AND RELIC'], ['ore', 'ORE AND ROCKS'], ['wing', 'YOUR SHIPS']], // the list's headings, in order (navpanelLines draws them); nearest first in each (card space-game-campaign-map-targets: every mark of the map is a row)
  color: { goal: 0xffd37a, select: 0x7fe9ff }
};
const campNavNorm = t => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, ' ').replace(/\s+/g, ' ').trim();
const campNavKm = d => hudFmt(Math.round(d / 10));

// the thing the level asks for next, or null
function campNavGoal(C) {
  try {
    const L = (C.L || CAMP.levels[C.level]), pl = campPlaces(C.level), c = C.carrier, near = list => list.slice().sort((a, b) => campDist(a, c) - campDist(b, c))[0] || null;
    const ship = (u, kind, name) => ({ id: kind === 'mother' ? 'mother' : kind + ':' + u.id, kind, name, x: u.x, y: u.y, r: u.r || 0, moving: u.vmax > 0, ref: u.id });
    const rt = typeof campRetreat === 'function' ? campRetreat(C) : null; if (rt && !rt.hot) return { id: 'place:' + rt.o.id, kind: 'place', name: rt.o.place, x: rt.o.x, y: rt.o.y, r: rt.o.r }; // low on hull with no ship left: the goal is the nearest outpost with its doors open (src/campoutpost.js); none open (hot) is no goal: the autopilot is not sent into the aliens
    if (C.L.place && C.arrivedAt == null && pl[C.L.place]) { const p = pl[C.L.place]; return { id: 'place:' + C.L.place, kind: 'place', name: String(p.name), x: p.x, y: p.y, r: p.r || 60 }; } // not there yet: the goal is the place of the mission
    const mineGoal = type => { // ore: the nearest rock that is still there (a mark the list has: flying to it puts the cruiser in the field); cashin: the market outpost, to sell the store
      if (type === 'ore') { const r = near((C.rocks || []).filter(q => q.hp > 0)); return r ? { id: 'rock:' + r.id, kind: 'rock', name: uiText('camp.nav.rock', { n: String(r.id).replace(/^rock-/, '') }), x: r.x, y: r.y, r: r.r || 0, ref: r.id } : null; }
      const w = campOutposts(C.level).find(x => x.market); return w ? { id: 'place:' + w.id, kind: 'place', name: w.name, x: w.x, y: w.y, r: w.r } : null;
    };
    if (L.objectives) { // a mission: the first objective not done yet (src/campaign.js campObjectives)
      const o = campObjectives(C).find(x => !x.done); if (!o) return null;
      if (o.type === 'scan') { const q = near(C.scan.map((p, i) => Object.assign({ i }, p)).filter(p => !p.got)); return q ? { id: 'scan:' + q.i, kind: 'scan', name: uiText('camp.nav.scan', { n: q.i + 1 }), x: q.x, y: q.y, r: 0 } : null; }
      if (o.type === 'caches') { const k = near(C.caches.map((q, i) => Object.assign({ i }, q)).filter(q => !q.got)); return k ? { id: 'cache:' + k.i, kind: 'cache', name: uiText('camp.nav.cache', { n: k.i + 1 }), x: k.x, y: k.y, r: 0 } : null; }
      if (o.type === 'relic') return C.relic ? { id: 'relic', kind: 'relic', name: uiText('camp.nav.relic'), x: C.relic.x, y: C.relic.y, r: 0 } : null;
      if (o.type === 'ore' || o.type === 'cashin') return mineGoal(o.type); // the rim run's 1.2 (card space-game-l1-mine-goal): the nearest rock while ore is short, the Works for the sale
      if (o.type === 'deliver') { const cv = near(campConvoys(C)); return cv ? ship(cv, 'convoy', uiText('camp.nav.convoy', { name: campConvoyName(cv) })) : null; }
      if (o.type === 'hold') return C.earth ? { id: 'place:base', kind: 'place', name: String(C.earth.name || ''), x: C.earth.x, y: C.earth.y, r: C.earth.r || 60 } : null;
      if (o.what === 'mother') { const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0); return m ? ship(m, 'mother', uiText('camp.nav.mother')) : null; }
      if (o.what === 'towers') { const t = near(C.ships.filter(u => u.kind === 'tower' && u.hp > 0)); return t ? ship(t, 'tower', uiText('camp.nav.tower')) : null; }
      if (o.what === 'guards') { const g = near(C.ships.filter(u => u.guard && u.hp > 0)); return g ? ship(g, 'guard', uiText('camp.nav.guard')) : null; }
      const a = near(campAliens(C)); if (a) return ship(a, 'alien', uiText(a.faction === 'pirate' ? 'camp.nav.pirate' : 'camp.nav.alien'));
      const next = campObjectives(C).find(x => !x.done && (x.type === 'ore' || x.type === 'cashin')); return next ? mineGoal(next.type) : null; // waiting for a raid with ore still to mine or sell: that is where to be
    }
    if (L.win === 'mother') {
      const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0); if (m) return ship(m, 'mother', uiText('camp.nav.mother'));
      const cv = near(campConvoys(C)); if (cv) return ship(cv, 'convoy', uiText('camp.nav.convoy', { name: campConvoyName(cv) }));
      return C.earth && pl.earth ? { id: 'place:earth', kind: 'place', name: pl.earth.name, x: pl.earth.x, y: pl.earth.y, r: pl.earth.r || 60 } : null;
    }
    if (L.win === 'relic') {
      if (C.cachesGot < L.relic.caches) {
        const k = near(C.caches.map((q, i) => Object.assign({ i }, q)).filter(q => !q.got)); if (k) return { id: 'cache:' + k.i, kind: 'cache', name: uiText('camp.nav.cache', { n: k.i + 1 }), x: k.x, y: k.y, r: 0 };
      }
      return C.relic ? { id: 'relic', kind: 'relic', name: uiText('camp.nav.relic'), x: C.relic.x, y: C.relic.y, r: 0 } : null;
    }
    if (L.win === 'towers') { const t = near(C.ships.filter(u => u.kind === 'tower' && u.hp > 0)); return t ? ship(t, 'tower', uiText('camp.nav.tower')) : null; }
  } catch (e) { /* no goal */ }
  return null;
}

// the one list. Each row: id (place:<id>, convoy:<ship id>, cache:<n>, relic, wing, goal), kind, group, name, x, y, r, dist (from the carrier), moving
function campNavRows(C) {
  const pl = campPlaces(C.level), c = C.carrier, rows = [], add = r => { r.dist = Math.hypot(r.x - c.x, r.y - c.y); rows.push(r); return r; };
  const posts = C.level != null && CAMP.levels[C.level] && CAMP.levels[C.level].outposts || {}; // the friendly outposts of the level: a place in the list that is one says so (the map marks it with a station)
  Object.keys(pl).forEach(id => { const p = pl[id]; if (!p.hidden) add({ id: 'place:' + id, kind: 'place', group: 'places', name: String(p.name), x: p.x, y: p.y, r: p.r || 60, far: !!p.far, star: p.kind === 'star', outpost: !!posts[id], moon: !!p.moon }); });
  if (typeof campRouteRows === 'function') campRouteRows(C).forEach(r => add(r)); // the lanes of a fork in the road, to scout and to pick (src/camproute.js)
  campConvoys(C).forEach(u => add({ id: 'convoy:' + u.id, kind: 'convoy', group: 'convoys', name: uiText('camp.nav.convoy', { name: campConvoyName(u) }), x: u.x, y: u.y, r: u.r || 22, moving: true, ref: u.id }));
  C.ships.forEach(u => { if (u.hp > 0 && u.team === 'neutral') add({ id: 'neutral:' + u.id, kind: 'neutral', group: 'traffic', name: u.cname || campNavUnitName(u), x: u.x, y: u.y, r: u.r || 0, moving: true, ref: u.id }); }); // the neutral ships: the patrols and the other miners (src/camppirates.js)
  (C.scan || []).forEach((p, i) => { if (!p.got) add({ id: 'scan:' + i, kind: 'scan', group: 'finds', name: uiText('camp.nav.scan', { n: i + 1 }), x: p.x, y: p.y, r: 0 }); });
  C.caches.forEach((k, i) => { if (!k.got) add({ id: 'cache:' + i, kind: 'cache', group: 'finds', name: uiText('camp.nav.cache', { n: i + 1 }), x: k.x, y: k.y, r: 0 }); });
  if (C.relic) add({ id: 'relic', kind: 'relic', group: 'finds', name: uiText('camp.nav.relic'), x: C.relic.x, y: C.relic.y, r: 0 });
  if (typeof campAnomMarks === 'function') campAnomMarks(C).forEach(a => add({ id: 'anom:' + a.id, kind: 'anomaly', group: 'finds', name: a.name, x: a.x, y: a.y, r: 0 })); // an anomaly that is noticed: no name but 'Anomaly' until it is decloaked (src/campanomaly.js)
  const w = campWing(C); if (w.length) add({ id: 'wing', kind: 'wing', group: 'wing', name: uiText('camp.nav.wing', { n: w.length }), x: w.reduce((a, u) => a + u.x, 0) / w.length, y: w.reduce((a, u) => a + u.y, 0) / w.length, r: 0, moving: true });
  // every other mark of the map (card space-game-campaign-map-targets): your ships one by one, the aliens, the mothership and the towers, the ore lying about and the rocks. Each is a row, so a click on its mark sets it and the keys reach it too
  w.forEach(u => add({ id: 'ship:' + u.id, kind: 'ship', group: 'wing', name: campNavUnitName(u), x: u.x, y: u.y, r: u.r || 0, moving: true, ref: u.id }));
  campAliens(C).forEach(u => { const k = u.kind === 'mother' ? 'mother' : u.kind === 'tower' ? 'tower' : 'alien'; add({ id: k === 'mother' ? 'mother' : k + ':' + u.id, kind: k, group: 'enemies', name: k === 'mother' ? uiText('camp.nav.mother') : campNavUnitName(u), x: u.x, y: u.y, r: u.r || 0, moving: u.vmax > 0, ref: u.id }); });
  (C.pickups || []).forEach(p => add({ id: 'pickup:' + p.id, kind: 'pickup', group: 'ore', name: uiText(p.kind === 'wreck' ? 'camp.nav.wreck' : 'camp.nav.chunk'), x: p.x, y: p.y, r: 0, ref: p.id }));
  (C.rocks || []).forEach(r => { if (r.hp > 0) add({ id: 'rock:' + r.id, kind: 'rock', group: 'ore', name: uiText('camp.nav.rock', { n: String(r.id).replace(/^rock-/, '') }), x: r.x, y: r.y, r: r.r || 0, ref: r.id }); });
  const g = campNavGoal(C); if (g) { const row = add(Object.assign({}, g, { of: g.id, id: 'goal', group: 'goal', goal: true })); row.name = g.name; }
  const order = CAMPNAV.groups.map(x => x[0]);
  return rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.dist - b.dist);
}

// what a row is now (a moving thing moves): { x, y, r } or null when it is gone (a ship dead, a cache taken)
function campNavTarget(C, N) {
  const id = N.of || N.id, kind = N.kind;
  if (kind === 'place') { const p = campPlaces(C.level)[String(id).slice(6)]; return p ? { x: p.x, y: p.y, r: p.r || 60 } : null; }
  if (kind === 'lane') { const l = C.route && C.route.geo.lanes[String(id).slice(5)]; return l ? { x: l.mid.x, y: l.mid.y, r: 0 } : null; } // the middle of a lane (src/camproute.js)
  if (kind === 'cache') { const k = C.caches[+String(id).slice(6)]; return k && !k.got ? { x: k.x, y: k.y, r: 0 } : null; }
  if (kind === 'scan') { const k = C.scan[+String(id).slice(5)]; return k && !k.got ? { x: k.x, y: k.y, r: 0 } : null; }
  if (kind === 'relic') return C.relic ? { x: C.relic.x, y: C.relic.y, r: 0 } : null;
  if (kind === 'anomaly') { const a = (C.anoms || []).find(q => 'anom:' + q.id === id); return a && (a.state === 'hidden' || a.state === 'revealed') ? { x: a.x, y: a.y, r: 0 } : null; }
  if (kind === 'wing') { const w = campWing(C); return w.length ? { x: w.reduce((a, u) => a + u.x, 0) / w.length, y: w.reduce((a, u) => a + u.y, 0) / w.length, r: 0 } : null; }
  if (kind === 'pickup') { const p = (C.pickups || []).find(q => q.id === (N.ref || String(id).slice(7))); return p ? { x: p.x, y: p.y, r: 0 } : null; } // taken by a ship of yours (or gone: a wreck's ore fades)
  if (kind === 'rock') { const r = (C.rocks || []).find(q => q.id === (N.ref || String(id).slice(5))); return r && r.hp > 0 ? { x: r.x, y: r.y, r: r.r || 0 } : null; }
  const u = C.by[N.ref || String(id).replace(/^[a-z]+:/, '')] || C.ships.find(s => s.kind === kind && s.hp > 0 && (kind === 'mother' || s.id === N.ref));
  return u && u.hp > 0 ? { x: u.x, y: u.y, r: u.r || 0, vx: u.vx || 0, vy: u.vy || 0 } : null; // vx, vy: a ship's own velocity, which the autopilot leads (campNavLead)
}
const campNavStop = (kind, t) => (kind === 'place' ? (t.r || 0) + CAMP.nav.stop : kind === 'anomaly' ? CAMP.anomaly.stop : kind === 'mother' || kind === 'tower' ? CAMP.nav.stopShip : kind === 'alien' || kind === 'guard' ? CAMP.nav.stopEnemy : kind === 'convoy' || kind === 'ship' || kind === 'neutral' ? CAMP.nav.stopFriend : kind === 'rock' ? CAMP.nav.stopRock : CAMP.nav.stopPoint);
// 'Raider 3', 'Fighter 5', 'Tower 2': what a ship is, for the list and the line on the map (the kind's name is in content/text/campmaptargets.md)
function campNavUnitName(u) { const p = String(u.id).split('-'), k = uiText('camp.nav.k.' + (u.kind || p[0])); return (k.indexOf('camp.nav.k.') === 0 ? p[0].charAt(0).toUpperCase() + p[0].slice(1) : k) + (p[1] ? ' ' + p[1] : ''); }
// where to aim at a moving target: the point it will be at when the carrier gets there, at the speed it flies (a first guess of the time from the distance, refined twice), the lead capped at CAMP.nav.leadMax s.
// c: the carrier { x, y }, t: { x, y, vx, vy }, speed: px/s it can fly. A target that does not move (or is not a ship) is where it is.
function campNavLead(c, t, speed) {
  const vx = t.vx || 0, vy = t.vy || 0; if (!vx && !vy) return { x: t.x, y: t.y, t: 0 };
  let T = 0, x = t.x, y = t.y;
  for (let i = 0; i < 3; i++) { T = Math.min(CAMP.nav.leadMax, Math.hypot(x - c.x, y - c.y) / Math.max(40, speed)); x = t.x + vx * T; y = t.y + vy * T; }
  return { x, y, t: T };
}
// the burn of a Fast trip (the one place it is decided: campNavGo stores it, campCarrier and campNavDrive read it, campNavEta tells it on the map): CAMP.nav.fast times the speed, farFast times it past farFrom px; 1 for a regular trip
const campNavBurn = (dist, fast) => (!fast ? 1 : dist > CAMP.nav.farFrom ? CAMP.nav.farFast : CAMP.nav.fast);
const campNavEta = (C, dist, fast) => Math.round(dist / (CAMP.carrier.speed * campPowerFx(C).speed * campNavBurn(dist, fast)) * CAMP.nav.etaSlow); // fast: the map's Fast button
// the distance a trip to a row really flies (card space-game-night-hunt-l2-l3): the mission's own place, before the cruiser has reached it, is flown to the edge of its arrival circle (the mission begins there and the autopilot lets go: campMissions_tick), not to its middle;
// every other target is flown to where it is. The km a row says stay the distance to the middle (the HUD's own); the briefing's seconds (campTravel) already count to the edge, and the map's now do too
const campNavFlight = (C, row, d) => C && C.L && C.L.place && C.arrivedAt == null && row && (row.of || row.id) === 'place:' + C.L.place ? Math.max(0, d - CAMP.mission.arrive) : d;

function campNavGo(C, row, fast) {
  if (!C || !row || C.result) return null;
  fast = !!fast && !campNavOut(C); // a burn with a ship of the wing out cannot happen from anywhere: the small ships could not keep up
  const id = row.of || row.id, burn = campNavBurn(Math.hypot(row.x - C.carrier.x, row.y - C.carrier.y), fast);
  if (C.nav && C.nav.on && C.nav.id === id) Object.assign(C.nav, { fast: !!fast, burn }); // the same place again, mid-flight (Fly then Fast, or back): the trip is kept and only the speed changes (Troy, 20 Nov 2026)
  else C.nav = { on: true, id, of: id, kind: row.kind, name: row.name, ref: row.ref || '', moving: !!row.moving, x: row.x, y: row.y, since: C.t, fast: !!fast, burn }; // fast: the carrier burn
  C.events.push({ type: 'nav', key: fast ? 'camp.nav.gofast' : 'camp.nav.go', vars: { name: row.name } });
  return C.nav;
}
function campNavClear(C, why) {
  if (C && C.navWait) { C.navWait = null; C.fastAsk = null; } // steering, X or a regular trip gives up a burn that was waiting for the wing
  const N = C && C.nav; if (!N) return false;
  C.nav = null;
  const key = { key: 'camp.nav.off', clear: 'camp.nav.cleared', arrived: 'camp.nav.arrived', lost: 'camp.nav.lost' }[why];
  if (key) C.events.push({ type: 'nav', key, vars: { name: N.name } });
  return true;
}

// the autopilot of the carrier: the Long Haul autopilot's rule (src/autopilot.js): turn onto it, run up to a speed limit of floor + brake x the px left, brake above it, stop just outside
function campNavDrive(C, dt) {
  const N = C.nav; if (!N || !N.on || C.result) return;
  const c = C.carrier; if (!c || c.hp <= 0) { C.nav = null; return; }
  const t = campNavTarget(C, N); if (!t) { campNavClear(C, N.kind === 'cache' || N.kind === 'scan' || N.kind === 'pickup' ? 'arrived' : 'lost'); return; } // a cache or ore that has gone was gathered: that is arriving; a ship that is gone (dead) or a rock that broke is lost
  N.x = t.x; N.y = t.y;
  const K = CAMP.nav, maxSp = CAMP.carrier.speed * (typeof campPowerFx === 'function' ? campPowerFx(C).speed : 1) * (N.fast ? (N.burn || K.fast) : 1), tvx = t.vx || 0, tvy = t.vy || 0, flies = !!(tvx || tvy);
  const dx0 = t.x - c.x, dy0 = t.y - c.y, dist = Math.hypot(dx0, dy0), left = Math.max(0, dist - campNavStop(N.kind, t)), speed = Math.hypot(c.vx, c.vy);
  const aim = flies ? campNavLead(c, t, Math.max(speed, maxSp * 0.6)) : t, dx = aim.x - c.x, dy = aim.y - c.y; // a ship that flies is led: the carrier aims where it will be (card space-game-campaign-map-targets)
  const hold = !!(C.navWait && C.navWait.id === N.id); // a burn to this place is waiting for the wing: the trip is kept, but the carrier stops, because a ship cannot land on a carrier that is flying away (they hover just behind it)
  const near = !!N.moving && left <= 0; // at its stand-off range from a ship: the carrier matches its speed and keeps station, following until the trip is ended (a steering key, X, a new place, or the ship is gone)
  const diff = campWrap(Math.atan2(dy, dx) - c.rot), inp = C.input;
  const ux = dx0 / (dist || 1), uy = dy0 / (dist || 1), closing = (c.vx - tvx) * ux + (c.vy - tvy) * uy; // how fast it is closing on the target (a still target: the speed along the line)
  const limit = hold || near ? 0 : Math.min(maxSp, K.floor + K.brake * left); // the speed it may close at: the Long Haul autopilot's rule, in the target's frame
  inp.turn = hold ? 0 : Math.max(-1, Math.min(1, diff * K.steer));
  if (!flies) { // a place, a point or a ship that is not moving: as it always was, on the speed itself
    inp.thrust = !hold && !near && Math.abs(diff) < K.align && speed < limit ? 1 : 0;
    inp.brake = speed > limit + 5;
  } else if (near) { // alongside a ship that moves: close up if it draws away, ease off if it comes in, else coast with it
    inp.thrust = !hold && closing < -10 && Math.abs(diff) < K.align && speed < maxSp ? 1 : 0;
    inp.brake = hold || closing > 10;
  } else { // on the way to one: thrust until closing at the limit (a target that is faster than the carrier is chased at the carrier's top speed), brake when closing too fast
    inp.thrust = !hold && Math.abs(diff) < K.align && closing < limit && speed < maxSp ? 1 : 0;
    inp.brake = hold || closing > limit + 5;
  }
  if (!N.moving && left <= K.arrive && speed <= K.drop) campNavClear(C, 'arrived');
}

// every row under a click on the map, nearest the cursor first: the stack of marks there (card space-game-campaign-map-targets). A mark is under the click within CAMP.nav.pick px; a row that only repeats another
// (the goal's) is left out when the thing it repeats is there. The first is what a click sets; a second click on the same spot takes the next (campMapClick).
function campNavPickStack(rows, project, px, py) {
  const real = rows.filter(r => !r.goal || !rows.some(o => o !== r && !o.goal && o.x === r.x && o.y === r.y));
  return real.map((r, i) => { const p = project(r.x, r.y); return { r, i, d: Math.hypot(p.x - px, p.y - py) }; }).filter(o => o.d <= CAMP.nav.pick).sort((a, b) => a.d - b.d || a.i - b.i).map(o => o.r);
}

// ---- the words ----
const CAMPNAV_FILL = /\b(?:the|a|an|to|at|for|of|our|my|nearest|closest|next|please|over|toward|towards|into|on)\b/g;
function campNavFind(C, text) {
  const q = campNavNorm(text).replace(CAMPNAV_FILL, ' ').replace(/\s+/g, ' ').trim(), rows = campNavRows(C), by = k => rows.find(r => r.id === k) || null;
  const first = kind => rows.filter(r => r.kind === kind && !r.goal)[0] || null; // the goal row repeats another row: it is never found by its kind
  if (!q) return { code: 'unknown' };
  if (/\b(?:objective|goal|mission|target|destination)\b/.test(q)) { const g = by('goal'); return g ? { row: g } : { code: 'nogoal' }; }
  if (/\b(?:mothership|mother|boss|big one|flagship)\b/.test(q)) { const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0); return m ? { row: { id: 'mother', kind: 'mother', name: uiText('camp.nav.mother'), x: m.x, y: m.y, r: m.r, moving: true, ref: m.id } } : { code: 'nomother' }; }
  if (/\brelic\b/.test(q)) { const r = by('relic'); return r ? { row: r } : { code: 'norelic' }; }
  if (C.route && /\b(?:lane|route)\b/.test(q)) { const l = campRouteFind(C, q), r = l && by('lane:' + l.id); if (r) return { row: r }; } // "the long lane": a lane of the fork (src/camproute.js)
  if (/\b(?:anomal(?:y|ies)|shimmer|odd (?:spot|reading|readings)|cloaked|alien cache)\b/.test(q)) { const r = first('anomaly'); return r ? { row: r } : { code: 'noanomaly' }; } // the nearest one that is noticed
  if (/\b(?:cache|caches|supplies|supply|resources?|pods?)\b/.test(q)) { const r = first('cache'); return r ? { row: r } : { code: 'nocache' }; }
  if (/\b(?:towers?|defences?|defenses?|turrets?)\b/.test(q)) {
    const t = C.ships.filter(u => u.kind === 'tower' && u.hp > 0).sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier))[0];
    return t ? { row: { id: 'tower:' + t.id, kind: 'tower', name: uiText('camp.nav.tower'), x: t.x, y: t.y, r: t.r, moving: false, ref: t.id } } : { code: 'notower' };
  }
  if (/\b(?:convoys?|freighters?|cargo)\b/.test(q)) {
    const cv = rows.filter(r => r.kind === 'convoy' && !r.goal); if (!cv.length) return { code: 'noconvoy' };
    return { row: cv.find(r => r.name.toLowerCase().split(' ').some(w => w.length > 2 && q.includes(w) && w !== 'convoy')) || cv[0] };
  }
  if (/\b(?:wing|fighters?|escorts?|ships|fleet|squadron)\b/.test(q)) { const r = by('wing'); return r ? { row: r } : { code: 'nowing' }; }
  const places = rows.filter(r => r.kind === 'place' && !r.goal), alias = { moon: 'luna', 'lunar base': 'luna', base: 'luna', star: 'sun', sun: 'sun' };
  const hit = places.find(p => q === p.name.toLowerCase() || q === p.id.slice(6)) || places.find(p => q.includes(p.name.toLowerCase()) || q.split(' ').includes(p.id.slice(6))) || places.find(p => alias[q] === p.id.slice(6) || Object.keys(alias).some(a => q.includes(a) && alias[a] === p.id.slice(6)));
  if (hit) return { row: hit };
  const here = places.filter(p => !p.far && !p.star && !p.moon); // the planets of the level itself (the far bodies of the system and the moons are named by their names)
  if (here.length === 1 && /\b(?:planet|world|home)\b/.test(q)) return { row: here[0] };
  return { code: 'unknown' };
}
const CAMPNAV_RE = [
  /^(?:fly|go|head|travel|navigate|proceed|steer|move|sail|run|set course|set a course|plot a course|course)(?: me| us| the carrier| the ship)?\s*(?:to|toward|towards|for|over to|on|into)\s+(.+)$/,
  /^(?:take|bring|carry) (?:me|us|the carrier|the ship) (?:to|toward|towards|over to|into)\s+(.+)$/,
  /^(?:autopilot|auto pilot|approach|visit)\s*(?:to|toward|towards)?\s+(.+)$/
];
const CAMPNAV_FILLER = /^(?:(?:please|hey|ok|okay|computer|ship|athena|can you|could you|would you|will you|i want to|i wanna|i need to|lets|let s|go ahead and)\s+)+/;
function campNavIntent(text) {
  const q = campNavNorm(text).replace(CAMPNAV_FILLER, '').replace(/\s+(please|now|right now|already)$/, '').trim();
  if (!q) return null;
  if (/^(?:cancel|stop|end|drop|abort|clear)(?: the)? (?:course|autopilot|auto pilot|navigation|destination)$|^(?:manual|manual control)$|^i (?:have|ve got|got) the (?:wheel|helm|controls?)$/.test(q)) return { act: 'fleet_fly', arg: 'stop' };
  if (/^(?:(?:fly|go|burn|boost|run)(?: me| us)? (?:fast|at full speed|at full burn)|(?:fast travel|full burn|burn|boost))$/.test(q)) return { act: 'fleet_fly', arg: 'fast the objective' }; // "fly fast", "burn": to the goal
  const fastWords = /\b(?:fast|burn|boost|full speed|full burn|quickly)\b/g, fast = fastWords.test(q); // "fly fast to Mars", "fly to Mars fast", "burn to the relic": the same words with the speed taken out, and a flag
  const plain = q.replace(/^(?:burn|boost)\b/, 'fly').replace(fastWords, ' ').replace(/\s+/g, ' ').trim();
  for (const re of CAMPNAV_RE) { const m = re.exec(plain); if (m && m[1].trim()) return { act: 'fleet_fly', arg: (fast ? 'fast ' : '') + m[1].trim() }; }
  return null;
}
// the dry check: what the ship computer says it will do, or why not. arg: the words after "fly to", or "stop"
function campNavCheck(C, arg) {
  if (!C || C.result) return { ok: false, say: uiText('camp.no.over') };
  const fm = /^\s*fast\s+(.*)$/i.exec(String(arg == null ? '' : arg)), fast = !!fm; if (fm) arg = fm[1]; // "fast <place>": a burn (the words "fly fast to Mars")
  if (campNavNorm(arg) === 'stop') return C.nav ? { ok: true, say: uiText('camp.nav.stopping'), stop: true } : { ok: false, say: uiText('camp.nav.no.nonav') };
  const f = campNavFind(C, arg);
  if (!f.row) return { ok: false, say: uiText('camp.nav.no.' + f.code) };
  const t = campNavTarget(C, f.row) || f.row, c = C.carrier, dist = Math.hypot(t.x - c.x, t.y - c.y);
  if (!f.row.moving && dist - campNavStop(f.row.kind, t) <= CAMP.nav.arrive) return { ok: false, say: uiText('camp.nav.there', { name: f.row.name }) };
  if (fast && campNavOut(C)) return { ok: true, say: campNavAskSay(C), row: f.row, fast: true }; // with a ship out the words are heard: the first time they are refused in words, the second time the wing is recalled
  return { ok: true, say: uiText('camp.nav.say', { name: f.row.name, km: campNavKm(dist) }), row: f.row, fast };
}
function campNavDo(C, r, how) { if (r.stop) campNavClear(C, 'clear'); else if (r.row) campNavFly(C, r.row, !!r.fast, how || 'strip'); }

// ---- Fast needs the wing aboard (card space-game-campaign-fast-board; Troy, 20 Nov 2026) ----
// The small ships must not be able to go as fast as the carrier burns (CAMP.nav.fast is above a fighter's top speed), so a burn starts only with every ship aboard. With a ship out, the first press of Fast
// (the map's button, Shift+Enter, "fly fast", Shift and the objective's row) is refused in words; a second press within CAMP.nav.askFor s recalls the wing and burns by itself as soon as the last ship is
// aboard; if a ship cannot get back within CAMP.nav.recallWait s the burn is given up and the ships still out are named. Regular speed is allowed with the wing out (they keep up). A burn that is on when a ship is
// launched drops to regular speed. C.fastAsk and C.navWait are the state; campNavWait (once a tick, from campTick) runs the wait.
const campNavOut = C => campWing(C).length + C.launchQ.length; // ships out of the bay, and those about to leave it
const campNavAskSay = C => uiText(C.fastAsk && C.t - C.fastAsk.at <= CAMP.nav.askFor * 1000 ? 'camp.nav.no.wingout2' : 'camp.nav.no.wingout');
function campNavShipName(u) { const p = String(u.id).split('-'); return p[0] + ' ' + (p[1] || ''); }
// the trip: regular always; fast only with the wing aboard. how: 'key', 'click' or 'strip' (the play log's). -> { ok, say, waiting }
function campNavFly(C, row, fast, how) {
  if (!C || !row || C.result) return { ok: false, say: uiText('camp.no.over') };
  if (!fast) { C.navWait = null; C.fastAsk = null; campNavGo(C, row, false); return { ok: true, say: '' }; } // regular: a trip to a new place, or the speed of this one back to regular
  const out = campNavOut(C);
  if (!out) { C.navWait = null; C.fastAsk = null; campNavGo(C, row, true); return { ok: true, say: '' }; }
  const asked = C.fastAsk && C.t - C.fastAsk.at <= CAMP.nav.askFor * 1000;
  if (!asked) { C.fastAsk = { at: C.t }; const say = uiText('camp.nav.no.wingout'); C.events.push({ type: 'nav', key: 'camp.nav.no.wingout', vars: {} }); return { ok: false, say, refused: true }; }
  if (C.launchQ.length && !campWing(C).length) return { ok: false, say: uiText('camp.no.launching') }; // nobody out yet to recall: they are still leaving the bay
  const r = campOrder(C, 'recall', '', how || 'key'); // the same order as the fifth of the FLEET panel: the wing flies home and lands
  if (!r.ok) return r;
  const id = row.of || row.id;
  if (C.nav && C.nav.id !== id) campNavClear(C, ''); // a trip to somewhere else is given up; a regular trip to this place is kept, but the carrier stops while the wing comes home (campNavDrive), and the burn takes it over
  C.fastAsk = null; C.navWait = { id, row: Object.assign({}, row), since: C.t, until: C.t + CAMP.nav.recallWait * 1000, n: out, shown: out };
  C.events.push({ type: 'nav', key: 'camp.nav.recalling', vars: { n: out } });
  return { ok: true, say: uiText('camp.nav.recalling', { n: out }), waiting: true };
}
// once a tick: a burn waiting for the wing starts when the last ship is aboard, and is given up (naming who is still out) after CAMP.nav.recallWait s; a burn under way with a ship launched drops to regular
function campNavWait(C) {
  if (!C) return;
  const W = C.navWait;
  if (C.nav && C.nav.fast && campNavOut(C) > 0) { C.nav.fast = false; C.nav.burn = 1; C.events.push({ type: 'nav', key: 'camp.nav.burnoff', vars: {} }); }
  if (!W) return;
  if (C.result) { C.navWait = null; return; }
  const out = campNavOut(C); W.n = out;
  if (!out) { const row = campNavRows(C).find(r => r.id === W.id) || W.row; C.navWait = null; campNavGo(C, row, true); return; }
  if (C.t >= W.until) {
    const names = campWing(C).sort((a, b) => campDist(b, C.carrier) - campDist(a, C.carrier)).map(campNavShipName), shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '');
    C.navWait = null; C.events.push({ type: 'nav', key: 'camp.nav.recalltimeout', vars: { names: shown || 'none' } }); return;
  }
  if (out !== W.shown) { W.shown = out; C.events.push({ type: 'nav', key: 'camp.nav.recalling', vars: { n: out } }); } // each ship that lands is counted off
}

// ---- the arrow at the screen edge ----
// dx, dy: where the target is from the middle of the screen (the carrier). Returns { x, y, angle }: on the border of the screen inset by margin, on the line from the middle to the target,
// slid along the border out of any keep rectangle, and turned to point at the target from where it ended up; null when the target is at the middle.
function campNavEdge(dx, dy, W_, H_, m, keep) {
  if (!dx && !dy) return null;
  const cx = W_ / 2, cy = H_ / 2, hw = cx - m, hh = cy - m, k = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  let x = cx + dx * k, y = cy + dy * k;
  const inKeep = (px, py) => (keep || []).some(r => px >= r[0] && px <= r[2] && py >= r[1] && py <= r[3]);
  if (inKeep(x, y)) { // walk round the border, either way, to the nearest free spot
    const w = 2 * hw, h = 2 * hh, per = 2 * (w + h), at = t => { t = ((t % per) + per) % per; return t < w ? [m + t, m] : t < w + h ? [m + w, m + t - w] : t < 2 * w + h ? [m + w - (t - w - h), m + h] : [m, m + h - (t - 2 * w - h)]; };
    let t0 = 0; { const u = x - m, v = y - m; t0 = Math.abs(v) < 1e-6 ? u : Math.abs(u - w) < 1e-6 ? w + v : Math.abs(v - h) < 1e-6 ? w + h + (w - u) : 2 * w + h + (h - v); }
    for (let d = 8; d <= per / 2; d += 8) for (const sgn of [1, -1]) { const p = at(t0 + sgn * d); if (!inKeep(p[0], p[1])) { x = p[0]; y = p[1]; d = per; break; } }
  }
  return { x, y, angle: Math.atan2(cy + dy - y, cx + dx - x) };
}
// where a label of w by h px, centred on (x, y), sits so that it stays on the screen and out of the keep rectangles (the HUD's gauges, the radar, the message band, the key line: CAMP.nav.arrow.keep):
// it is pushed out of each one it overlaps by the shortest way, then back inside the screen; { x, y } (wrap-up hunt of level 3: the arrow's label ran into the radar's rim)
function campNavLabelAt(x, y, w, h, keep, W_, H_) {
  const hw = w / 2, hh = h / 2, ox = Math.max(hw + 4, Math.min(W_ - hw - 4, x)), oy = Math.max(hh + 4, Math.min(H_ - hh - 4, y)), K = keep || [];
  const hits = (cx, cy) => K.some(r => cx + hw > r[0] && cx - hw < r[2] && cy + hh > r[1] && cy - hh < r[3]);
  const onScreen = (cx, cy) => cx - hw >= 4 && cx + hw <= W_ - 4 && cy - hh >= 4 && cy + hh <= H_ - 4;
  const cands = [{ x: ox, y: oy }];
  K.forEach(r => { cands.push({ x: r[0] - hw - 6, y: oy }, { x: r[2] + hw + 6, y: oy }, { x: ox, y: r[1] - hh - 6 }, { x: ox, y: r[3] + hh + 6 }); });
  const best = cands.filter(c => onScreen(c.x, c.y) && !hits(c.x, c.y)).sort((a, b) => Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy))[0];
  return best ? { x: best.x, y: best.y } : { x: ox, y: oy }; // the nearest place that is on the screen and out of every rectangle; none (a screen full of them): where it was put
}
// the arrow at the goal: scroll { x, y }: the camera's top left in the world. null when the goal is on the screen, near, or there is none. { x, y, angle, dist, name }
function campNavArrow(C, scroll, W_, H_, zoom) { // zoom: the camera's (1 when it has none): a point is (its offset from the middle of the view) times the zoom from the middle of the screen
  const g = campNavGoal(C); if (!g || !C.carrier) return null;
  const A = CAMP.nav.arrow, c = C.carrier, dist = Math.hypot(g.x - c.x, g.y - c.y); if (dist < A.min) return null;
  const z = zoom > 0 ? zoom : 1, sx = (g.x - scroll.x - W_ / 2) * z + W_ / 2, sy = (g.y - scroll.y - H_ / 2) * z + H_ / 2;
  if (sx > A.margin && sx < W_ - A.margin && sy > A.margin && sy < H_ - A.margin && !(A.keep || []).some(r => sx >= r[0] && sx <= r[2] && sy >= r[1] && sy <= r[3])) return null; // on the screen and clear of the HUD: seen
  const e = campNavEdge(sx - W_ / 2, sy - H_ / 2, W_, H_, A.margin, A.keep); if (!e) return null;
  return { x: e.x, y: e.y, angle: e.angle, dist, name: g.name };
}
