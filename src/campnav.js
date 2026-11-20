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
//   campNavIntent(text)       the plain words ("fly to Mars", "go to the relic", "take me to the objective", "cancel the course") as { act: 'fleet_fly', arg }
// The rule, the stop distances and every number are CAMP.nav in src/campaign.js. Steering is the player's: any steering key ends it (the scene calls campNavClear(C, 'key')); the orders go on.
const CAMPNAV = {
  groups: [['goal', 'GOAL'], ['places', 'PLACES'], ['convoys', 'CONVOYS'], ['finds', 'CACHES AND RELIC'], ['wing', 'YOUR SHIPS']], // the list's headings, in order (navpanelLines draws them)
  color: { goal: 0xffd37a, select: 0x7fe9ff }
};
const campNavNorm = t => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, ' ').replace(/\s+/g, ' ').trim();
const campNavKm = d => hudFmt(Math.round(d / 10));

// the thing the level asks for next, or null
function campNavGoal(C) {
  try {
    const L = CAMP.levels[C.level], pl = campPlaces(C.level), c = C.carrier, near = list => list.slice().sort((a, b) => campDist(a, c) - campDist(b, c))[0] || null;
    const ship = (u, kind, name) => ({ id: kind === 'mother' ? 'mother' : kind + ':' + u.id, kind, name, x: u.x, y: u.y, r: u.r || 0, moving: u.vmax > 0, ref: u.id });
    if (L.win === 'mother') {
      const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0); if (m) return ship(m, 'mother', uiText('camp.nav.mother'));
      const cv = near(campConvoys(C)); if (cv) return ship(cv, 'convoy', uiText('camp.nav.convoy', { name: campConvoyName(cv) }));
      return pl.earth ? { id: 'place:earth', kind: 'place', name: pl.earth.name, x: pl.earth.x, y: pl.earth.y, r: pl.earth.r || 60 } : null;
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
  Object.keys(pl).forEach(id => { const p = pl[id]; if (!p.hidden) add({ id: 'place:' + id, kind: 'place', group: 'places', name: String(p.name), x: p.x, y: p.y, r: p.r || 60 }); });
  campConvoys(C).forEach(u => add({ id: 'convoy:' + u.id, kind: 'convoy', group: 'convoys', name: uiText('camp.nav.convoy', { name: campConvoyName(u) }), x: u.x, y: u.y, r: u.r || 22, moving: true, ref: u.id }));
  C.caches.forEach((k, i) => { if (!k.got) add({ id: 'cache:' + i, kind: 'cache', group: 'finds', name: uiText('camp.nav.cache', { n: i + 1 }), x: k.x, y: k.y, r: 0 }); });
  if (C.relic) add({ id: 'relic', kind: 'relic', group: 'finds', name: uiText('camp.nav.relic'), x: C.relic.x, y: C.relic.y, r: 0 });
  const w = campWing(C); if (w.length) add({ id: 'wing', kind: 'wing', group: 'wing', name: uiText('camp.nav.wing', { n: w.length }), x: w.reduce((a, u) => a + u.x, 0) / w.length, y: w.reduce((a, u) => a + u.y, 0) / w.length, r: 0, moving: true });
  const g = campNavGoal(C); if (g) { const row = add(Object.assign({}, g, { of: g.id, id: 'goal', group: 'goal', goal: true })); row.name = g.name; }
  const order = CAMPNAV.groups.map(x => x[0]);
  return rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.dist - b.dist);
}

// what a row is now (a moving thing moves): { x, y, r } or null when it is gone (a ship dead, a cache taken)
function campNavTarget(C, N) {
  const id = N.of || N.id, kind = N.kind;
  if (kind === 'place') { const p = campPlaces(C.level)[String(id).slice(6)]; return p ? { x: p.x, y: p.y, r: p.r || 60 } : null; }
  if (kind === 'cache') { const k = C.caches[+String(id).slice(6)]; return k && !k.got ? { x: k.x, y: k.y, r: 0 } : null; }
  if (kind === 'relic') return C.relic ? { x: C.relic.x, y: C.relic.y, r: 0 } : null;
  if (kind === 'wing') { const w = campWing(C); return w.length ? { x: w.reduce((a, u) => a + u.x, 0) / w.length, y: w.reduce((a, u) => a + u.y, 0) / w.length, r: 0 } : null; }
  const u = C.by[N.ref || String(id).replace(/^[a-z]+:/, '')] || C.ships.find(s => s.kind === kind && s.hp > 0 && (kind === 'mother' || s.id === N.ref));
  return u && u.hp > 0 ? { x: u.x, y: u.y, r: u.r || 0 } : null;
}
const campNavStop = (kind, t) => (kind === 'place' ? (t.r || 0) + CAMP.nav.stop : kind === 'convoy' || kind === 'mother' || kind === 'tower' ? CAMP.nav.stopShip : CAMP.nav.stopPoint);
const campNavEta = (C, dist, fast) => Math.round(dist / (CAMP.carrier.speed * (fast ? CAMP.nav.fast : 1)) * CAMP.nav.etaSlow); // fast: the map's Fast button (a burn: CAMP.nav.fast times the speed)

function campNavGo(C, row, fast) {
  if (!C || !row || C.result) return null;
  const id = row.of || row.id;
  C.nav = { on: true, id, of: id, kind: row.kind, name: row.name, ref: row.ref || '', moving: !!row.moving, x: row.x, y: row.y, since: C.t, fast: !!fast }; // fast: the carrier burns at CAMP.nav.fast times its speed while this runs (campCarrier)
  C.events.push({ type: 'nav', key: fast ? 'camp.nav.gofast' : 'camp.nav.go', vars: { name: row.name } });
  return C.nav;
}
function campNavClear(C, why) {
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
  const t = campNavTarget(C, N); if (!t) { campNavClear(C, N.kind === 'cache' ? 'arrived' : 'lost'); return; } // a cache that has gone was gathered: that is arriving
  N.x = t.x; N.y = t.y;
  const K = CAMP.nav, dx = t.x - c.x, dy = t.y - c.y, dist = Math.hypot(dx, dy), left = Math.max(0, dist - campNavStop(N.kind, t)), speed = Math.hypot(c.vx, c.vy);
  const diff = campWrap(Math.atan2(dy, dx) - c.rot), limit = Math.min(CAMP.carrier.speed * (N.fast ? K.fast : 1), K.floor + K.brake * left), inp = C.input;
  inp.turn = Math.max(-1, Math.min(1, diff * K.steer));
  inp.thrust = Math.abs(diff) < K.align && speed < limit ? 1 : 0;
  inp.brake = speed > limit + 5;
  if (!N.moving && left <= K.arrive && speed <= K.drop) campNavClear(C, 'arrived');
}

// the row nearest a click on the map: project(x, y) -> { x, y } on the screen; px, py the click
function campNavPickAt(rows, project, px, py) {
  let best = null, bd = CAMP.nav.pick;
  rows.forEach(r => { const p = project(r.x, r.y), d = Math.hypot(p.x - px, p.y - py); if (d <= bd) { bd = d; best = r; } });
  return best;
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
  if (places.length === 1 && /\b(?:planet|world|home)\b/.test(q)) return { row: places[0] };
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
  for (const re of CAMPNAV_RE) { const m = re.exec(q); if (m && m[1].trim()) return { act: 'fleet_fly', arg: m[1].trim() }; }
  return null;
}
// the dry check: what the ship computer says it will do, or why not. arg: the words after "fly to", or "stop"
function campNavCheck(C, arg) {
  if (!C || C.result) return { ok: false, say: uiText('camp.no.over') };
  if (campNavNorm(arg) === 'stop') return C.nav ? { ok: true, say: uiText('camp.nav.stopping'), stop: true } : { ok: false, say: uiText('camp.nav.no.nonav') };
  const f = campNavFind(C, arg);
  if (!f.row) return { ok: false, say: uiText('camp.nav.no.' + f.code) };
  const t = campNavTarget(C, f.row) || f.row, c = C.carrier, dist = Math.hypot(t.x - c.x, t.y - c.y);
  if (!f.row.moving && dist - campNavStop(f.row.kind, t) <= CAMP.nav.arrive) return { ok: false, say: uiText('camp.nav.there', { name: f.row.name }) };
  return { ok: true, say: uiText('camp.nav.say', { name: f.row.name, km: campNavKm(dist) }), row: f.row };
}
function campNavDo(C, r) { if (r.stop) campNavClear(C, 'clear'); else if (r.row) campNavGo(C, r.row); }

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
// the arrow at the goal: scroll { x, y }: the camera's top left in the world. null when the goal is on the screen, near, or there is none. { x, y, angle, dist, name }
function campNavArrow(C, scroll, W_, H_) {
  const g = campNavGoal(C); if (!g || !C.carrier) return null;
  const A = CAMP.nav.arrow, c = C.carrier, dist = Math.hypot(g.x - c.x, g.y - c.y); if (dist < A.min) return null;
  const sx = g.x - scroll.x, sy = g.y - scroll.y;
  if (sx > A.margin && sx < W_ - A.margin && sy > A.margin && sy < H_ - A.margin && !(A.keep || []).some(r => sx >= r[0] && sx <= r[2] && sy >= r[1] && sy <= r[3])) return null; // on the screen and clear of the HUD: seen
  const e = campNavEdge(sx - W_ / 2, sy - H_ / 2, W_, H_, A.margin, A.keep); if (!e) return null;
  return { x: e.x, y: e.y, angle: e.angle, dist, name: g.name };
}
