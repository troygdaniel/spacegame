// ---------- Campaign: the big briefing (card space-game-campaign-briefing; Troy: "the briefing could come up automatically after selecting a mission, and it can take up more space: have the solar system map, the goals, a walk-through") ----------
// Picking a mission on the ready room's board (or a replay) opens its briefing at once, as a screen that takes most of the window: the system map at the left (the Tab map's own helpers: the rings round the star, the belts as
// rocks, the places and the outposts) with the mission's place marked, your route from where you start with its distance and its time on regular speed and on Fast, and the mission's objective points; at the right the
// mission's name and kind, the goals (the primary ones, then the bonus objectives with what they earn), a short walkthrough, the enemies to expect, and your readiness with a warning when something is off.
// This file is the PURE half (no Phaser, no page; tests/campbrief.mjs runs it in Node); src/campbriefdraw.js draws it and src/camphubscene.js opens it.
//   campBriefLayers(level, i)         what the mission has on the map, from its row of the mission table: { start, focus: { x, y, kind, label }, scan, convoys, caches, towers, relic, defend, places, outposts }
//   campBriefBounds(L, whole, level)  the area the map shows: the objects of the mission (with the start), or the whole system with its rings
//   campBriefRoute(L)                 { px, km, regular, fast, near }: from the start to the mission's place, the flight in seconds on regular speed and on Fast (the map's own numbers: campNavEta)
//   campBriefWalk(level, i)           { steps: [text], data: bool }: the walkthrough from the content file (camp.bf.<level>.<mission>.w1 ...), or a plain fallback line when the mission has none
//   campBriefEnemies(level, i)        { list: [{ kind, n, text }], line }: what the mission's waves, guards and towers add up to, in words
//   campBriefReady(P, level, i)       { lines: [text], warnings: [text] }: the wing, the rank, the stance, the missiles, the ore, the shield, and a warning for what is off (the Hold stance: the only thing that can be off in the ready room, where the whole wing is in the bay and the magazine and shield are full; there is no power setting in the game to show)
//   campBriefPage(steps, page)        { items, page, pages }: a long walkthrough is paged (Left and Right)
// The numbers are CAMPBRIEF. The words are camp.bf.* in content/text/campbrief.md; the walkthrough lines are fixed lines (the voice pack records them: the family camp.bf.<level>.<mission>.w<n>).
const CAMPBRIEF = {
  panel: { x: 40, y: 24, w: 1200, h: 672 },   // px: the glass over the ready room: most of the window
  head: { x: 62, y: 44, right: 1218 },        // px: the heading across the top: the mission at the left, its kind and par at the right
  frame: { x: 62, y: 84, w: 560, h: 536 },    // px: where the map is drawn (left); it ends before the first text column starts
  text: { top: 90 },                          // px: the first line of the two text columns at the right (campbriefdraw.js CAMPBRIEF_COL: their left edges and widths)
  pad: 0.14,                                  // the share of the area's width and height left empty round the objects of the mission
  minExtent: 2600,                            // px of space: never zoom in closer than this across (a mission with its objects close together)
  near: 250,                                  // px: a mission whose place is this near where you start has no route to speak of
  per: 5,                                     // steps of the walkthrough on a page: more is paged with Left and Right
  walkMax: 6                                  // the most steps read from the data for a mission
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
  // the mission's place: the first of what it asks you to go to
  let focus = { x: start.x, y: start.y, kind: 'start', label: '' };
  if (scan.length) focus = { x: scan[0].x, y: scan[0].y, kind: 'scan', label: uiText('camp.nav.scan', { n: 1 }) };
  else if (convoys.length) focus = { x: convoys[0].a.x, y: convoys[0].a.y, kind: 'convoy', label: String((pl[convoys[0].from] || { name: 'Earth' }).name) };
  else if (relic) focus = { x: relic.x, y: relic.y, kind: 'relic', label: uiText('camp.bf.at.relic') };
  else if (towers.length) focus = { x: towers[0].x, y: towers[0].y, kind: 'tower', label: uiText('camp.bf.at.tower') };
  else if (defend) focus = { x: defend.x, y: defend.y, kind: 'defend', label: defend.name };
  else if (caches.length) { const c = caches.slice().sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y))[0]; focus = { x: c.x, y: c.y, kind: 'cache', label: uiText('camp.bf.at.cache') }; } // the pod nearest to you
  else if (guards.length) focus = { x: guards.reduce((a, g) => a + g.x, 0) / guards.length, y: guards.reduce((a, g) => a + g.y, 0) / guards.length, kind: 'guards', label: uiText('camp.bf.at.guards') }; // the middle of the guards
  else if (mother) focus = { x: mother.x, y: mother.y, kind: 'mother', label: uiText('camp.bf.at.mother') };
  const places = Object.keys(pl).filter(id => !pl[id].hidden).map(id => ({ id, x: pl[id].x, y: pl[id].y, r: pl[id].r || 60, name: String(pl[id].name), far: !!pl[id].far, star: pl[id].kind === 'star', outpost: !!(L.outposts && L.outposts[id]) }));
  return { level, i, start, focus, scan, convoys, caches, towers, relic, defend, guards, mother, places, startPlace: L.start };
}

function campBriefBounds(Y, whole) {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, add = (x, y, r) => { r = r || 0; b.x0 = Math.min(b.x0, x - r); b.y0 = Math.min(b.y0, y - r); b.x1 = Math.max(b.x1, x + r); b.y1 = Math.max(b.y1, y + r); };
  if (whole && typeof campMapBounds === 'function') return campMapBounds(Y.level, true);
  add(Y.start.x, Y.start.y, 0); add(Y.focus.x, Y.focus.y, 0);
  Y.scan.forEach(p => add(p.x, p.y, p.r)); Y.convoys.forEach(c => { add(c.a.x, c.a.y, 0); add(c.b.x, c.b.y, 0); }); Y.caches.forEach(c => add(c.x, c.y, 0));
  Y.guards.forEach(g => add(g.x, g.y, 0)); if (Y.mother) add(Y.mother.x, Y.mother.y, 0);
  Y.towers.forEach(t => add(t.x, t.y, t.r)); if (Y.relic) add(Y.relic.x, Y.relic.y, Y.relic.r); if (Y.defend) add(Y.defend.x, Y.defend.y, Y.defend.r);
  const ex = CAMPBRIEF.minExtent, w = b.x1 - b.x0, h = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  if (w < ex) { b.x0 = cx - ex / 2; b.x1 = cx + ex / 2; } if (h < ex) { b.y0 = cy - ex / 2; b.y1 = cy + ex / 2; }
  return b;
}
// the route from where you start to the mission's place
function campBriefRoute(Y) {
  const px = Math.hypot(Y.focus.x - Y.start.x, Y.focus.y - Y.start.y), near = px < CAMPBRIEF.near;
  return { px, km: Math.round(px / 10), near, regular: near ? 0 : campNavEta(null, px, false), fast: near ? 0 : campNavEta(null, px, true) };
}

// ---- the words: the walkthrough is data ----
function campBriefWalk(level, i) {
  const steps = [];
  for (let k = 1; k <= CAMPBRIEF.walkMax; k++) { const key = 'camp.bf.' + level + '.' + (i + 1) + '.w' + k; if (!Object.prototype.hasOwnProperty.call(UI_TEXT, key)) break; steps.push(uiText(key)); }
  return steps.length ? { steps, data: true } : { steps: [uiText('camp.bf.nowalk')], data: false };
}
const CAMPBRIEF_ORDER = ['raider', 'drone', 'gunship', 'guard', 'tower', 'mother'];
function campBriefEnemies(level, i) {
  const L = campMissionRow(level, i), n = {}; if (!L) return { list: [], line: '' };
  (L.waves || []).forEach(w => { Object.keys(w.ships || {}).forEach(k => { n[k] = (n[k] || 0) + w.ships[k]; }); if (w.mother) n.mother = (n.mother || 0) + 1; });
  if ((L.guards || []).length) n.guard = (n.guard || 0) + L.guards.length;
  (L.towers || []).forEach(t => { n.tower = (n.tower || 0) + (t.n || 1); });
  const list = CAMPBRIEF_ORDER.concat(Object.keys(n).filter(k => CAMPBRIEF_ORDER.indexOf(k) < 0)).filter(k => n[k] > 0).map(k => ({ kind: k, n: n[k], text: uiText('camp.bf.enemy.' + k + (n[k] === 1 ? '.one' : '.many'), { n: n[k] }) }));
  return { list, line: list.length ? uiText('camp.bf.expect', { list: list.map(e => e.text).join(', ') }) : uiText('camp.bf.expectnone'), total: list.reduce((a, e) => a + (e.kind === 'mother' || e.kind === 'tower' ? 0 : e.n), 0) };
}

// ---- readiness: what you fly it with, and what is off ----
function campBriefReady(P, level, i) {
  const wing = typeof campRankWing === 'function' ? campRankWing(P) : { fighters: CAMP.bay.fighters + ((P.bonus || {}).fighters | 0), escorts: CAMP.bay.escorts + ((P.bonus || {}).escorts | 0) };
  const rank = typeof campRank === 'function' ? campRank(P).name : '', stance = (P.stance && CAMP.stances && CAMP.stances.indexOf(P.stance) >= 0) ? P.stance : 'free';
  const missiles = CAMP.missile.magazine, ore = P.ore | 0; // (a mission starts with the full magazine, a full shield and the whole wing in the bay: the ready room has no ship out, so none of that is ever a warning here)
  const lines = [uiText('camp.bf.ready.bay', { f: wing.fighters, e: wing.escorts })];
  if (rank) lines.push(uiText('camp.bf.ready.rank', { name: rank }));
  lines.push(uiText('camp.bf.ready.stance', { name: uiText('camp.bf.stance.' + stance) }), uiText('camp.bf.ready.stock', { missiles, ore }), uiText('camp.bf.ready.shield'));
  const warnings = [];
  if (stance === 'hold') warnings.push(uiText('camp.bf.warn.hold'));
  return { lines, warnings, wing, rank, stance };
}

// a long walkthrough is paged: page is clamped
function campBriefPage(steps, page) {
  const per = CAMPBRIEF.per, pages = Math.max(1, Math.ceil(steps.length / per)), p = Math.max(0, Math.min(pages - 1, page | 0));
  return { items: steps.slice(p * per, p * per + per), page: p, pages };
}
