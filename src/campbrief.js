// ---------- Campaign: the big briefing (card space-game-campaign-briefing; Troy: "the briefing could come up automatically after selecting a mission, and it can take up more space: have the solar system map, the goals, a walk-through") ----------
// Picking a mission on the ready room's board (or a replay) opens its briefing at once, as a screen that takes most of the window: the system map at the left (the Tab map's own helpers: the rings round the star, the belts as
// rocks, the places and the outposts) with the mission's place marked, your route from where you start with its distance and its time on regular speed and on Fast, and the mission's objective points; at the right the
// mission's name and kind, the goals (the primary ones, then the bonus objectives with what they earn), a short walkthrough, the enemies to expect, and your readiness with a warning when something is off.
// This file is the PURE half (no Phaser, no page; tests/campbrief.mjs runs it in Node); src/campbriefdraw.js draws it and src/camphubscene.js opens it.
//   campBriefLayers(level, i)         what the mission has on the map, from its row of the mission table: { start, focus: { x, y, kind, label }, scan, convoys, caches, towers, relic, defend, places, outposts }
//   campBriefBounds(Y, zoom)          the area the map shows: 0 the route (the start, the place and the objective points), 1 the mission area (the place and its points), 2 the whole system with its rings
//   campBriefZoomNext(Y, zoom)        the view M goes to next: the next of the three whose area differs from this one (a mission at its place has no separate route view)
//   campBriefRoute(Y)                 { px, km, regular, fast, near }: from the start to the mission's place: km and the Fast flight are campTravel's (the HUD's own), the regular flight the map's rule (campNavEta)
//   campBriefWalk(level, i)           { steps: [text], data: bool }: the walkthrough from the content file (camp.bf.<level>.<mission>.w1 ...), or a plain fallback line when the mission has none
//   campBriefEnemies(level, i)        { list: [{ kind, n, text }], line }: what the mission's waves, guards and towers add up to, in words
//   campBriefReady(P, level, i)       { lines: [text], warnings: [text] }: the wing, the rank, the missiles, the ore, the power setting, the shield, and a warning for what is off (nothing can be: the whole wing is in the bay and the magazine and shield are full in the ready room; the power setting is a line, the saved one)
//   campBriefNav(screen, code)        { screen, act }: what a key does on one of the three screens (the pure half of campBriefKey): Enter or Right the next screen, Left the one before, Enter on the last one (or L anywhere) launches, Esc closes
//   campBriefView(Y, zoom, z, view, z0)  { base, fit }: the map's view: the area of zoom 0 1 2 fitted to the frame, then z (+ - 0 and the wheel, 0.5 to 8 times) about the mission's place, as the Tab map does (campMapView)
//   campBriefSteps(P, level, i)       { goals, bonus }: the goals as steps, each with its picture (campBriefPicture: parts drawn from the game's own sprites), then the bonus objectives with what they earn
//   campBriefKeys(level, i)           [{ id, k: [keys], text }]: the keys this mission needs, from its objectives and its bonus (the basics first)
//   campBriefStory(P, level, i)       [text]: the story line, why you are there: the level's own lines before its first mission, then the mission's two lines
//   campBriefNote(level, i, screen)   the ship's own line over one screen of a mission (camp.bf.<level>.<mission>.n<screen>), or '': mission 1.1 says the basics there, in the story's voice
// The briefing is three screens (card space-game-briefing-walkthrough; Troy, 20 Nov 2026: "zoom in and out, three screens to walk through, with pictures"): 1 WHERE AND WHY (the map and the story line), 2 WHAT TO DO (the goals as steps, each with a small
// picture, and the bonus), 3 HOW (the walkthrough, the keys this mission needs, the enemies and your readiness). Enter or Right goes on, Left goes back, Enter on the last one launches.
// The numbers are CAMPBRIEF. The words are camp.bf.* in content/text/campbrief.md; the walkthrough lines are fixed lines (the voice pack records them: the family camp.bf.<level>.<mission>.w<n>).
const CAMPBRIEF = {
  panel: { x: 40, y: 24, w: 1200, h: 672 },   // px: the glass over the ready room: most of the window
  head: { x: 62, y: 44, right: 1218 },        // px: the heading across the top: the mission at the left, its kind and par at the right
  tabs: { y: 72, step: 236 },                 // px: the three screens' names under the heading (the one you are on is lit), one every step
  frame: { x: 62, y: 96, w: 716, h: 528 },    // px: where the map is drawn (screen 1, left); it ends before the text column starts
  text: { top: 100 },                         // px: the first line of the text columns (campbriefdraw.js CAMPBRIEF_COL: their left edges and widths, for each screen)
  note: { y: 638, h: 36 },                    // px: the ship's own line over the foot of a screen (campBriefNote), over the keys line
  screens: 3,                                 // where and why, what to do, how
  zoom: { min: 0.5, max: 8 },                 // the map's zoom range: 1 is the area fitted to the frame (the Tab map's own range, src/campzoom.js CAMPZOOM.map)
  pad: 0.14,                                  // the share of the area's width and height left empty round the objects of the mission
  minExtent: 2600,                            // px of space: never zoom in closer than this across (a mission with its objects close together)
  near: 250,                                  // px: a mission with no place of its row whose first objective is this near where you start has no route to speak of (a mission with a place is near when campTravel says none: within CAMP.mission.arrive)
  walkMax: 6,                                 // the most steps read from the data for a mission
  keysMax: 8,                                 // the most keys listed on the third screen
  pic: { w: 132, h: 76, goal: 1.6, bonus: 1.1 } // px: the box the pictures are drawn in, and the scale a goal's and a bonus objective's picture are drawn at
};

const campBriefPlace = (pl, id) => (id && pl[id] && !pl[id].hidden ? pl[id] : null);
function campBriefLayers(level, i) {
  const L = campMissionRow(level, i); if (!L || !(i >= 0 && i < campMissions(level).length)) return null; // (campMissionRow clamps a number past the last: the briefing is only of a mission that is there)
  const pl = campPlaces(level), st = pl[L.start] || { x: 0, y: 0 }, at = L.startAt || [0, 0], start = { x: st.x + (at[0] || 0), y: st.y + (at[1] || 0) };
  const scan = (((L.objectives || []).find(o => o.type === 'scan')) || { points: [] }).points.map((p, k) => ({ n: k + 1, x: p.at[0], y: p.at[1], r: p.r || 0 }));
  const convoys = []; (L.convoys || []).forEach(cv => { const f = campBriefPlace(pl, cv.from) || (L.earth === false ? null : { x: 0, y: 0, name: 'Earth' }), t = campBriefPlace(pl, cv.to); if (f && t && !convoys.some(c => c.from === cv.from && c.to === cv.to)) convoys.push({ from: cv.from, to: cv.to, a: { x: f.x, y: f.y }, b: { x: t.x, y: t.y }, name: String(cv.name || '') }); });
  const caches = (L.caches || []).map((c, k) => ({ n: k + 1, x: c[0], y: c[1] }));
  const towers = (L.towers || []).map(t => { const p = campBriefPlace(pl, t.place); return p ? { x: p.x, y: p.y, r: t.r || 0, n: t.n || 0 } : null; }).filter(Boolean);
  const rp = L.relic && campBriefPlace(pl, L.relic.place), relic = rp ? { x: rp.x, y: rp.y, r: L.relic.radius || 0 } : null;
  const guards = (L.guards || []).map(g => ({ kind: String(g.kind), x: g.at[0], y: g.at[1] }));
  const mw = (L.waves || []).find(w => w.mother), mother = mw ? { x: mw.mother[0], y: mw.mother[1] } : null; // where the mothership comes in (the mission is named for it)
  const dp = L.defend && campBriefPlace(pl, L.defend.place), defend = dp ? { x: dp.x, y: dp.y, r: L.defend.r || dp.r || 0, name: String(L.defend.name || dp.name) } : null;
  // the mission's place: the place the mission happens at (its row's `place`, the one the HUD's "Fly to <place>" names and campTravel measures: ONE place, ONE distance), else the first of what it asks you to go to
  const mp = campBriefPlace(pl, L.place), trip = typeof campTravel === 'function' ? campTravel(level, i) : null;
  let focus = { x: start.x, y: start.y, kind: 'start', label: '' };
  if (mp) focus = { x: mp.x, y: mp.y, kind: 'place', label: String(mp.name) };
  else if (scan.length) focus = { x: scan[0].x, y: scan[0].y, kind: 'scan', label: uiText('camp.nav.scan', { n: 1 }) };
  else if (convoys.length) focus = { x: convoys[0].a.x, y: convoys[0].a.y, kind: 'convoy', label: String((pl[convoys[0].from] || { name: 'Earth' }).name) };
  else if (relic) focus = { x: relic.x, y: relic.y, kind: 'relic', label: uiText('camp.bf.at.relic') };
  else if (towers.length) focus = { x: towers[0].x, y: towers[0].y, kind: 'tower', label: uiText('camp.bf.at.tower') };
  else if (defend) focus = { x: defend.x, y: defend.y, kind: 'defend', label: defend.name };
  else if (caches.length) { const c = caches.slice().sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y))[0]; focus = { x: c.x, y: c.y, kind: 'cache', label: uiText('camp.bf.at.cache') }; } // the pod nearest to you
  else if (guards.length) focus = { x: guards.reduce((a, g) => a + g.x, 0) / guards.length, y: guards.reduce((a, g) => a + g.y, 0) / guards.length, kind: 'guards', label: uiText('camp.bf.at.guards') }; // the middle of the guards
  else if (mother) focus = { x: mother.x, y: mother.y, kind: 'mother', label: uiText('camp.bf.at.mother') };
  const places = Object.keys(pl).filter(id => !pl[id].hidden).map(id => ({ id, x: pl[id].x, y: pl[id].y, r: pl[id].r || 60, name: String(pl[id].name), far: !!pl[id].far, star: pl[id].kind === 'star', outpost: !!(L.outposts && L.outposts[id]) }));
  return { level, i, start, focus, trip, scan, convoys, caches, towers, relic, defend, guards, mother, places, startPlace: L.start };
}

// zoom: 0 the route (where you start, the mission's place and its objective points: what you fly), 1 the mission area (the place and its points, without the start: what you fight at), 2 the whole system; true is 2 and false 0 (as before). A place a long way from the start makes 0 and 1 very different; a mission at its place makes them the same.
function campBriefBounds(Y, zoom) {
  zoom = zoom === true ? 2 : zoom | 0;
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, add = (x, y, r) => { r = r || 0; b.x0 = Math.min(b.x0, x - r); b.y0 = Math.min(b.y0, y - r); b.x1 = Math.max(b.x1, x + r); b.y1 = Math.max(b.y1, y + r); };
  if (zoom === 2 && typeof campMapBounds === 'function') return campMapBounds(Y.level, true);
  if (zoom !== 1) add(Y.start.x, Y.start.y, 0);
  add(Y.focus.x, Y.focus.y, 0);
  Y.scan.forEach(p => add(p.x, p.y, p.r)); Y.convoys.forEach(c => { add(c.a.x, c.a.y, 0); add(c.b.x, c.b.y, 0); }); Y.caches.forEach(c => add(c.x, c.y, 0));
  Y.guards.forEach(g => add(g.x, g.y, 0)); if (Y.mother) add(Y.mother.x, Y.mother.y, 0);
  Y.towers.forEach(t => add(t.x, t.y, t.r)); if (Y.relic) add(Y.relic.x, Y.relic.y, Y.relic.r); if (Y.defend) add(Y.defend.x, Y.defend.y, Y.defend.r);
  const ex = CAMPBRIEF.minExtent, w = b.x1 - b.x0, h = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  if (w < ex) { b.x0 = cx - ex / 2; b.x1 = cx + ex / 2; } if (h < ex) { b.y0 = cy - ex / 2; b.y1 = cy + ex / 2; }
  return b;
}
const campBriefSame = (a, b) => { const wa = a.x1 - a.x0, wb = b.x1 - b.x0, ha = a.y1 - a.y0, hb = b.y1 - b.y0, big = Math.max(wa, wb, ha, hb); return Math.max(wa, wb) / Math.min(wa, wb) < 1.15 && Math.max(ha, hb) / Math.min(ha, hb) < 1.15 && Math.hypot((a.x0 + a.x1 - b.x0 - b.x1) / 2, (a.y0 + a.y1 - b.y0 - b.y1) / 2) < 0.15 * big; }; // two views are the same when they are about the same size and in about the same place
function campBriefZoomNext(Y, zoom) { const cur = campBriefBounds(Y, zoom); for (let k = 1; k <= 3; k++) { const z = ((zoom === true ? 2 : zoom | 0) + k) % 3; if (!campBriefSame(campBriefBounds(Y, z), cur)) return z; } return zoom | 0; }
// the route from where you start to the mission's place: the trip campTravel (src/campaign.js) measures, which is also what the HUD's "Fly to <place>: N km" says (campKmText, to the centre of the place): the km and the flight on Fast are ITS numbers, the flight on regular speed is the map's own rule (campNavEta) over the same distance. A mission whose place is where you start (campTravel says none) has no route. A mission with no place of its row keeps the straight line to its first objective.
function campBriefRoute(Y) {
  const T = Y.trip, px = Math.hypot(Y.focus.x - Y.start.x, Y.focus.y - Y.start.y);
  if (T) return { px, km: T.km, near: false, regular: campNavEta(null, T.dist, false), fast: T.secs };
  if (Y.focus.kind === 'place') return { px, km: '0', near: true, regular: 0, fast: 0 };
  const near = px < CAMPBRIEF.near;
  return { px, km: typeof campKmText === 'function' ? campKmText(px) : String(Math.round(px / 10)), near, regular: near ? 0 : campNavEta(null, px, false), fast: near ? 0 : campNavEta(null, px, true) };
}

// ---- the words: the walkthrough is data ----
function campBriefWalk(level, i) {
  const steps = [];
  for (let k = 1; k <= CAMPBRIEF.walkMax; k++) { const key = 'camp.bf.' + level + '.' + (i + 1) + '.w' + k; if (!Object.prototype.hasOwnProperty.call(UI_TEXT, key)) break; steps.push(uiText(key, typeof campBeatKeys === 'function' ? campBeatKeys() : {})); } // (the keys of the panels and the map come from the key table: src/campbeats.js)
  return steps.length ? { steps, data: true } : { steps: [uiText('camp.bf.nowalk')], data: false };
}
const CAMPBRIEF_ORDER = ['skiff', 'cutter', 'brute', 'tboat', 'lancer', 'pirateleader', 'raider', 'drone', 'gunship', 'guard', 'tower', 'mother'];
function campBriefEnemies(level, i) {
  const L = campMissionRow(level, i), n = {}; if (!L) return { list: [], line: '' };
  let unknown = false; // a wave row with `secret: true` (1.3's first contact) is not listed: the briefing does not tell what the surprise is (card space-game-night-hunt-l1-rim)
  const lane0 = L.route && L.route.lanes && L.route.lanes.length ? (L.route.pick || L.route.lanes[0].id) : null; // a fork in the road: the briefing counts what the lane she takes unless told meets (the default), not both lanes' raids (card space-game-scout-route)
  (L.waves || []).forEach(w => { if (w.lane && lane0 && w.lane !== lane0) return; if (w.secret) { unknown = true; return; } Object.keys(w.ships || {}).forEach(k => { n[k] = (n[k] || 0) + w.ships[k]; }); if (w.mother) n.mother = (n.mother || 0) + 1; });
  (L.rivals || []).forEach(r => { n[r.kind] = (n[r.kind] || 0) + 1; Object.keys(r.escorts || {}).forEach(k => { n[k] = (n[k] || 0) + r.escorts[k]; }); }); // the rival ships of the row (the pirate leader of 1.1: src/camprival.js) and the pirates that come with it (its two skiffs: the briefing said 6 and 8 came)
  if ((L.guards || []).length) n.guard = (n.guard || 0) + L.guards.length;
  (L.towers || []).forEach(t => { n.tower = (n.tower || 0) + (t.n || 1); });
  const list = CAMPBRIEF_ORDER.concat(Object.keys(n).filter(k => CAMPBRIEF_ORDER.indexOf(k) < 0)).filter(k => n[k] > 0).map(k => ({ kind: k, n: n[k], text: uiText('camp.bf.enemy.' + k + (n[k] === 1 ? '.one' : '.many'), { n: n[k] }) }));
  return { list, unknown, line: list.length ? uiText(unknown ? 'camp.bf.expectunknown' : 'camp.bf.expect', { list: list.map(e => e.text).join(', ') }) : uiText(unknown ? 'camp.bf.unknownonly' : 'camp.bf.expectnone'), total: list.reduce((a, e) => a + (e.kind === 'mother' || e.kind === 'tower' ? 0 : e.n), 0) };
}

// ---- readiness: what you fly it with, and what is off ----
function campBriefReady(P, level, i) {
  const wing = typeof campRankWing === 'function' ? campRankWing(P) : { fighters: CAMP.pilotStrength + ((P.bonus || {}).fighters | 0) };
  const rank = typeof campRank === 'function' ? campRank(P).name : '';
  const missiles = CAMP.missile.magazine, ore = P.ore | 0; // (a mission starts with the full magazine, a full shield and the whole wing in the bay: the ready room has no ship out, so none of that is ever a warning here)
  const lines = [uiText('camp.bf.ready.bay', { f: wing.fighters })];
  if (rank) lines.push(uiText('camp.bf.ready.rank', { name: rank }));
  const pw = typeof campPowerLoad === 'function' ? campPowerLoad() : CAMP.power.start.slice(), cap = Math.round(CAMP.carrier.shield * CAMP.power.shields.cap[pw[1]]); // the ship's systems (card space-game-campaign-systems): the setting saved in this browser is what the battle starts with, and the shield's cap follows the shields' pips
  lines.push(uiText('camp.bf.ready.stock', { missiles, ore }), uiText('camp.bf.ready.power', { w: pw[0], s: pw[1], e: pw[2] }), uiText('camp.bf.ready.shield', { cap }));
  const warnings = [];
  return { lines, warnings, wing, rank, power: pw, shield: cap };
}

// ---- the three screens ----
const CAMPBRIEF_SCREEN = ['where', 'what', 'how']; // the words of the screens' names: camp.bf.scr.<name>
// a key on a screen: the screen after it and what it asks for ('launch', 'close' or nothing). Enter and Right go on, Left goes back, Enter on the last screen launches, L launches from any (the ready room's own key for it), Esc closes; Right on the last screen does nothing (a stray key never launches)
function campBriefNav(screen, code) {
  const last = CAMPBRIEF.screens - 1, at = Math.max(0, Math.min(last, screen | 0));
  if (code === 'Escape') return { screen: at, act: 'close' };
  if (code === 'KeyL') return { screen: at, act: 'launch' };
  if (code === 'Enter' || code === 'NumpadEnter') return at >= last ? { screen: at, act: 'launch' } : { screen: at + 1, act: '' };
  if (code === 'ArrowRight') return { screen: Math.min(last, at + 1), act: '' };
  if (code === 'ArrowLeft') return { screen: Math.max(0, at - 1), act: '' };
  return { screen: at, act: '' };
}

// ---- the map's zoom: + - 0 and the wheel, about the mission's place ----
// the view of the preset (0 route, 1 area, 2 whole system) at zoom z, from the last view (view, at zoom z0): the Tab map's own rule (src/campmap.js campMapView): what is zoomed about (the mission's place) stays where it is on the screen, zoomed in the view is held inside the area, zoomed out it is the area's centre
function campBriefView(Y, zoom, z, view, z0) {
  const F = CAMPBRIEF.frame, zz = zoom === true ? 2 : zoom | 0, base = campMapFit(campBriefBounds(Y, zz), F, zz === 2 ? 0.06 : CAMPBRIEF.pad), zn = Math.max(CAMPBRIEF.zoom.min, Math.min(CAMPBRIEF.zoom.max, +z || 1));
  return { base, z: zn, fit: campMapView(base, F, zn, view || base, z0 > 0 ? z0 : 1, Y.focus) };
}

// ---- what to do: the goals as steps, each with a picture ----
// A picture is a list of parts in a box of CAMPBRIEF.pic.w by .h round (0, 0): { look, x, y, k, rot, tint } a sprite of the game (look: a CAMP_LOOK name, or 'pod', 'rock', 'ore'; k times the size it has in the battle), { ring, x, y, r, color, a, dash, fill }, { disc }, { line }, { arrow }, { reticle }, { clock }, { bar }.
// The sprites are the game's own, so a picture is always of what is in the mission: the wing in a ring, the haulers on their lane, the mothership in the reticle, the cruiser mining.
const CAMPBRIEF_COL_PIC = { cyan: 0x38e1ff, amber: 0xffb454, green: 0x6dff9c, red: 0xff7aa8, gold: 0xffd37a, white: 0xffffff, rock: 0xb9a37a, violet: 0xc9a0ff };
const CAMPBRIEF_LOOKS = ['carrier', 'fighter', 'freighter', 'raider', 'drone', 'gunship', 'mother', 'tower', 'pod', 'rock', 'ore', 'skiff', 'cutter'];
const campBriefPicture = (() => {
  const C = CAMPBRIEF_COL_PIC, img = (look, x, y, k, rot, tint) => ({ look, x, y, k, rot: rot || 0, tint: tint || 0 }), ring = (x, y, r, color, a, dash, fill) => ({ ring: true, x, y, r, color, a: a == null ? 0.9 : a, dash: !!dash, fill: !!fill }), ret = (x, y, r) => ({ reticle: true, x, y, r }), arrow = (x0, y0, x1, y1, color) => ({ arrow: true, x0, y0, x1, y1, color });
  const T = {
    'scan': [ring(0, 0, 31, C.cyan, 0.9), ring(0, 0, 31, C.cyan, 0.14, false, true), ring(0, 0, 19, C.cyan, 0.4, true), img('fighter', 2, 3, 1.0, -0.5)],
    'kill.wave': [img('raider', -24, -12, 0.8, 0.3), img('raider', -22, 18, 0.8, -0.2), img('drone', 22, -10, 0.7, 0), ret(22, -10, 17)],
    'kill.wave.pirate': [img('skiff', -24, -12, 1.0, 0.3), img('skiff', -22, 18, 1.0, -0.2), img('cutter', 22, -10, 0.9, 0), ret(22, -10, 17)], // the rim's raids: pirates, brown and ochre, never the aliens' red
    'kill.guards': [img('gunship', -22, 2, 0.7, 0.1), img('drone', 14, -17, 0.6, 0), img('drone', 18, 17, 0.6, 0), ret(-22, 2, 22)],
    'kill.mother': [img('mother', 0, 0, 0.2, 0, 0xc9a0ff), ret(0, 0, 33)],
    'kill.towers': [img('tower', -32, 8, 0.36, 0.5), img('tower', 0, -10, 0.36, 1.2), img('tower', 32, 8, 0.36, 2.4), ret(0, -10, 19)],
    'deliver': [img('freighter', -34, -14, 0.5, 0), img('freighter', -34, 14, 0.5, 0), arrow(-8, 0, 28, 0, C.amber), { disc: true, x: 48, y: 0, r: 13, color: C.rock }],
    'caches': [img('pod', -32, -6, 1.8, 0), img('pod', 2, 14, 1.8, 0), img('pod', 30, -12, 1.8, 0), img('fighter', -8, -18, 0.9, 0.4)],
    'relic': [ring(0, 0, 32, C.cyan, 0.9), { disc: true, x: 0, y: 0, r: 7, color: C.cyan }, img('carrier', -13, 12, 0.38, -0.5)],
    'hold': [ring(0, 0, 32, C.green, 0.9), img('carrier', 0, 0, 0.4, 0.2)],
    'clear': [ring(0, 0, 33, C.green, 0.5, true), img('carrier', 0, 0, 0.36, 0.3), img('raider', -42, -20, 0.7, 0.6), img('raider', -42, 20, 0.7, -0.6)],
    'clear.pirate': [ring(0, 0, 33, C.green, 0.5, true), img('carrier', 0, 0, 0.36, 0.3), img('skiff', -42, -20, 0.9, 0.6), img('skiff', -42, 20, 0.9, -0.6)],
    // the bonus objectives
    'b.time': [{ clock: true, x: 0, y: 0, r: 27 }],
    'b.lost': [ring(0, 0, 33, C.green, 0.16, false, true), ring(0, 0, 33, C.green, 0.8, true), img('fighter', -14, 3, 1.1, 0), img('fighter', 15, -3, 1.0, 0)],
    'b.ore': [img('rock', 24, -8, 0.7, 0.5), img('carrier', -26, 12, 0.4, -0.45), { line: true, x0: -8, y0: 4, x1: 17, y1: -5, color: C.cyan, w: 2 }, img('ore', 6, 18, 1.2, 0)],
    'b.hull': [img('carrier', 0, -8, 0.5, 0), { bar: true, x: -30, y: 18, w: 60, h: 8, f: 0.7, color: C.green }],
    'b.delivered': [img('freighter', -40, -17, 0.4, 0), img('freighter', -40, 0, 0.4, 0), img('freighter', -40, 17, 0.4, 0), arrow(-18, 0, 20, 0, C.amber), { disc: true, x: 40, y: 0, r: 11, color: C.rock }],
    'ore': [img('rock', 24, -8, 0.7, 0.5), img('carrier', -26, 12, 0.4, -0.45), { line: true, x0: -8, y0: 4, x1: 17, y1: -5, color: C.cyan, w: 2 }, img('ore', 6, 18, 1.2, 0)],
    'cashin': [img('ore', -34, 0, 1.4, 0), arrow(-12, 0, 24, 0, C.amber), { disc: true, x: 44, y: 0, r: 12, color: C.rock }],
    'b.sold': [img('ore', -34, 0, 1.2, 0), arrow(-12, 0, 24, 0, C.amber), { disc: true, x: 44, y: 0, r: 10, color: C.rock }],
    'b.neutrals': [ring(0, 0, 33, C.green, 0.16, false, true), ring(0, 0, 33, C.green, 0.8, true), img('freighter', 0, 0, 0.5, 0)],
    'b.anomaly': [img('pod', 0, 0, 2, 0), ring(0, 0, 24, C.violet, 0.9, true)]
  };
  const fallback = [ring(0, 0, 24, C.cyan, 0.7), { disc: true, x: 0, y: 0, r: 4, color: C.cyan }];
  return key => T[key] || fallback;
})();
const campBriefHasPicture = key => !!(campBriefPicture(key) && campBriefPicture(key) !== campBriefPicture('?'));
// the goals of a mission as steps and its bonus, each with the picture's key and parts: the words are the HUD's own (campHubBrief, camp.o.* and camp.b.*)
function campBriefSteps(P, level, i) {
  const B = campHubBrief(P, level, i); if (!B) return { goals: [], bonus: [] };
  const L = campMissionRow(level, i), waves = ((L && L.waves) || []).filter(w => !w.secret), pirates = waves.length > 0 && waves.every(w => Object.keys(w.ships || {}).every(k => typeof CAMP === 'object' && ((CAMP.pirate && CAMP.pirate.kinds && CAMP.pirate.kinds[k]) || (CAMP.torpedo && CAMP.torpedo.boats && CAMP.torpedo.boats[k] && CAMP.torpedo.boats[k].faction === 'pirate')))); // a mission whose raids are all pirates draws pirates (the rim run), not the aliens' ships; a pirate torpedo boat is a pirate too (with one in its waves 1.2 and 1.3 drew the aliens' raiders: card l1-pacing)
  const goals = B.objectives.map((text, k) => { const kind = B.kinds[k], pic = pirates && (kind === 'kill.wave' || kind === 'clear') ? kind + '.pirate' : kind; return { n: k + 1, kind, text, pic, parts: campBriefPicture(pic) }; });
  const bonus = B.bonus.map(b => { const kind = 'b.' + b.type; return { kind, points: b.points, text: b.text, pic: kind, parts: campBriefPicture(kind) }; });
  return { goals, bonus };
}

// ---- how: the keys this mission needs ----
// The basics are for every mission, in the order they are used; what the mission's goals and bonus ask for is added. An order of a list (launch, attack, escort, mine; dock, emergency shields) shows the key that opens its list, Q or P, and says which list and which row (src/data_controls.js CAMP_PANELS: tests/campbrief.mjs checks they are there).
const CAMPBRIEF_KEYS = {
  get fly() { return [CAMP_KEYS.fly.k]; }, get fire() { return [CAMP_KEYS.fire.k]; }, get map() { return [CAMP_KEYS.map.k]; }, get zoom() { return [CAMP_KEYS.zoomout.k, CAMP_KEYS.zoomin.k]; }, // the keys of the table (CAMP_KEYS in src/data_controls.js), read when asked
  get missile() { return [CAMP_KEYS.missile.k]; },
  get attack() { return [CAMP_KEYS.attack.k]; }, get escort() { return [CAMP_KEYS.guard.k]; }, get mine() { return campKeyCaps(campKeyVia('fmine').id); }, // an order of a list: the key of the list it is in (Q, or a part's own: E fighters, R escorts), read from the key table when asked (a remap is one change there)
  get dock() { return campKeyCaps(campKeyVia('dock').id); }, get shield() { return campKeyCaps(campKeyVia('emergency').id); } // U dock and repair; the power list's key (none now: card space-game-keys2-select, so the line is left out)
};
function campBriefKeys(level, i) {
  const L = campMissionRow(level, i); if (!L) return [];
  const ids = ['fly', 'fire', 'map'], add = id => { if (ids.indexOf(id) < 0) ids.push(id); };
  const kinds = (L.objectives || []).map(o => o.type + (o.type === 'kill' ? '.' + String(o.what).replace(/:.*/, '') : '')), bonus = (L.bonus || []).map(b => b.type);
  if (kinds.some(k => /^kill|^clear|^relic|^hold/.test(k)) || (L.waves || []).length) add('attack');
  if (kinds.indexOf('deliver') >= 0 || (L.convoys || []).length) add('escort');
  if (kinds.some(k => k === 'kill.mother' || k === 'kill.towers' || k === 'kill.guards')) add('missile');
  if (bonus.indexOf('ore') >= 0 || kinds.indexOf('ore') >= 0) add('mine'); // the rim run's mining mission asks for ore as its goal (card space-game-night-hunt-l2-l3: its keys box did not list the mine row, and a pilot who never sends the wing to mine cannot win it)
  if (kinds.indexOf('cashin') >= 0) add('dock'); // and the ore is sold at the Works: docked
  if (bonus.indexOf('hull') >= 0) add('shield');
  return ids.filter(id => CAMPBRIEF_KEYS[id].length).slice(0, CAMPBRIEF.keysMax - 1).concat('zoom').map(id => // a row with no key to show is left out (the power list has none since card space-game-keys2-select: its Emergency shields line)
     ({ id, k: CAMPBRIEF_KEYS[id], text: uiText('camp.bf.key.' + id) }));
}

// ---- where and why: the story line ----
// the level's own lines (they are told once, before its first mission, so they are the "why" of that one) and then the mission's two lines (campHubBrief)
function campBriefStory(P, level, i) {
  const B = campHubBrief(P, level, i); if (!B) return [];
  const lead = i === 0 && typeof campStory === 'function' ? campStory(level, 'before', !!(P && P.revealed)) : [];
  return lead.concat(B.lines);
}
// the ship's line over a screen of a mission (screen 0 to 2): fixed lines of the content file, or '' (mission 1.1 has them: the basics, in the story's voice)
function campBriefNote(level, i, screen) {
  const key = 'camp.bf.' + level + '.' + (i + 1) + '.n' + ((screen | 0) + 1);
  return Object.prototype.hasOwnProperty.call(UI_TEXT, key) ? uiText(key, typeof campBeatKeys === 'function' ? campBeatKeys() : {}) : '';
}
