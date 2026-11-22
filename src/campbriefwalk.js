// ---------- Campaign: the briefing's walk, the pure half (card space-game-briefing-map-walk; Troy, 22 Nov 2026: "the mission map should be used for each page of the briefing, zoomed as needed, with my own craft walking through the plan") ----------
// A mission that has a walk (src/data_briefwalk.js, or a `walk` of its own row) is briefed on the MAP on all three pages: the map takes most of the window, and the cruiser, its wing and the convoy walk the road from stop to stop. At each stop the map
// zooms to where it happens and one line of words says what happens. The pages are the old three (where and why, what to do, how); a page plays its stops one after the other by itself, and Enter or Right goes on to the next stop (or page). No Phaser here
// (tests/campbriefwalk.mjs runs it in Node); src/campbriefwalkdraw.js draws it.
//   campWalkData(level, i)         the walk of a mission: its row's `walk`, else the table's, else null (the mission has the three-screen briefing)
//   campWalkPlan(level, i)         the walk made ready: { road, steps: [{ n, page, key, text, at, with, marks, bounds, fit }], vars }; null when the mission has none or a stop is nowhere
//   campWalkWhere(spec, ctx)       a place of the data ({ road }, { place }, { spot }, { rival }, { x, y }) as a point of the world
//   campWalkNew(plan)              the state: { i, t, z, play, from, vfrom }
//   campWalkNow(plan, wk)          where the party, the other ships and the camera are now: { party, with, view, arrived, step, page }
//   campWalkGo(plan, wk, i)        go to stop i from where everything is now (a Left or an Enter in the middle of a walk goes on from where the ships are)
//   campWalkNav(plan, wk, code)    what a key does: { i, act } (act '' | 'launch' | 'close'): Enter or Right the next stop, Left the one before, Enter on the last or L launches, Esc closes
//   campWalkTick(plan, wk, dt)     time passes (dt s): the walk plays on by itself to the end of the page, and waits there for Enter
//   campWalkMarks(plan, wk)        the marks on the map now: each stop's marks from that stop on, the stop's own bright and the earlier ones dim
// The numbers are CAMPWALK; the words are camp.bf.<level>.<mission>.<key> and camp.bw.* in content/text/campwalk.md.
const CAMPWALK = {
  frame: { x: 62, y: 96, w: 1156, h: 404 },      // px: the map, on every page (the whole window but the heading above it, the words under it and the keys line)
  cap: { dots: 512, y: 522, size: 21 },          // px: the row of dots (one a stop, the page's stops joined) and the line of words of the stop (two lines at most), under the map
  strip: { y: 584, row: 32, cols: 4 },           // px: the small strip under the words (the story on page 1, the goals and the bonus on page 2, the keys and the readiness on page 3), its rows, and the columns of the keys  pad: 0.08,                                     // the share of the area left empty round it (campMapFit)
  pages: 3,                                      // where and why, what to do, how (CAMPBRIEF.screens)
  move: 2.4,                                     // s: the party flies from one stop to the next
  look: 1.3,                                     // s: the camera eases to the next stop's view
  dwell: { min: 3.2, perChar: 0.05 },            // s a stop's words are held once the party has arrived, before the next stop plays by itself: at least min, and perChar for each letter (reading time)
  zoom: { min: 0.5, max: 8 },                    // the hand zoom (+ - Backspace and the wheel): times the stop's own view, the briefing map's range
  form: { convoy: 30, wing: 17 },                // px on the screen, whatever the zoom: the convoy ahead of the cruiser, the wing round it (a diagram, not to the scale of the map)
  minSpan: 1800                                  // px of the world: a stop never zooms in closer than this from the top of the map to its foot
};

function campWalkData(level, i) {
  const n = typeof campMissions === 'function' ? campMissions(level).length : 0; if (!(i >= 0 && i < n)) return null;
  const L = campMissionRow(level, i), D = (L && L.walk) || (typeof CAMPWALKS === 'object' ? CAMPWALKS[level + '.' + (i + 1)] : null);
  return D && Array.isArray(D.steps) && D.steps.length ? D : null;
}
// the road: the straight way from the place the convoy leaves to the place it goes to (the shares the mission's rows use, `on: { lane: f }`, are shares of this)
function campWalkRoad(level, i, D) {
  const L = campMissionRow(level, i), pl = campPlaces(level), cvs = (L && L.convoys) || [], cv = cvs.find(c => c.id === D.convoy) || cvs[0], f = cv && pl[cv.from], t = cv && pl[cv.to];
  if (!f || !t) return null;
  const len = Math.hypot(t.x - f.x, t.y - f.y) || 1;
  return { cv, from: f, to: t, a: { x: f.x, y: f.y }, b: { x: t.x, y: t.y }, len, ux: (t.x - f.x) / len, uy: (t.y - f.y) / len };
}
function campWalkWhere(spec, ctx) {
  const s = spec || {}, R = ctx.road;
  if (s.road != null) { const k = Math.max(0, Math.min(1, +s.road)), d = +s.side || 0; return { x: R.a.x + (R.b.x - R.a.x) * k - R.uy * d, y: R.a.y + (R.b.y - R.a.y) * k + R.ux * d }; }
  if (s.place) { const p = ctx.pl[s.place]; return p ? { x: p.x, y: p.y } : null; }
  if (s.spot) { const t = (ctx.L.traffic || []).find(q => q.id === s.spot), p = t && t.place ? ctx.pl[t.place] : null; if (!t) return null; return t.at ? { x: t.at[0], y: t.at[1] } : p ? { x: p.x + (t.off ? t.off[0] : 0), y: p.y + (t.off ? t.off[1] : 0) } : null; }
  if (s.rival) { const r = (ctx.L.rivals || []).find(q => q.id === s.rival); if (!r) return null; return campWalkWhere({ road: ((r.on && r.on.lane != null ? +r.on.lane : 0.9) * R.len + (+r.ahead || 0)) / R.len }, ctx); } // where it waits: its share of the road, and `ahead` px farther on
  if (s.x != null && s.y != null) return { x: +s.x, y: +s.y };
  return null;
}
// the area a stop shows
function campWalkBounds(z, ctx, at) {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, add = (p, r) => { b.x0 = Math.min(b.x0, p.x - r); b.y0 = Math.min(b.y0, p.y - r); b.x1 = Math.max(b.x1, p.x + r); b.y1 = Math.max(b.y1, p.y + r); };
  if (z && z.fit) { const m = z.margin != null ? +z.margin : 800; z.fit.forEach(sp => { const p = campWalkWhere(sp, ctx); if (p) add(p, m); }); }
  else if (z && z.on) add(campWalkWhere(z.on, ctx) || at, (+z.span || 4000) / 2);
  else if (z && z !== 'road') add(at, 1500);
  else { add(ctx.road.a, 0); add(ctx.road.b, 0); } // 'road': the whole way
  if (!isFinite(b.x0)) add(at, 1500);
  const ex = CAMPWALK.minSpan, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  if (b.y1 - b.y0 < ex) { b.y0 = cy - ex / 2; b.y1 = cy + ex / 2; } if (b.x1 - b.x0 < ex) { b.x0 = cx - ex / 2; b.x1 = cx + ex / 2; }
  return b;
}
// the words a stop's line may name: the road's own numbers and the key table's keys
function campWalkVars(road) {
  const keys = typeof campBeatKeys === 'function' ? campBeatKeys() : {}, sp = +road.cv.speed > 0 ? +road.cv.speed : 54;
  return Object.assign({}, keys, { from: String(road.from.name), to: String(road.to.name), name: String(road.cv.name || ''), km: typeof campKmText === 'function' ? campKmText(road.len) : String(Math.round(road.len / 10)), mins: Math.max(1, Math.round(road.len / sp / 60)) });
}
function campWalkPlan(level, i) {
  const D = campWalkData(level, i); if (!D) return null;
  const road = campWalkRoad(level, i, D); if (!road) return null;
  const ctx = { L: campMissionRow(level, i), pl: campPlaces(level), road }, F = CAMPWALK.frame, vars = campWalkVars(road), steps = [];
  for (const st of D.steps) {
    const at = campWalkWhere(st.at, ctx), key = 'camp.bf.' + level + '.' + (i + 1) + '.' + st.key; if (!at || !Object.prototype.hasOwnProperty.call(UI_TEXT, key)) return null; // a stop that is nowhere, or has no words: no walk (the mission keeps the three-screen briefing)
    const page = Math.max(0, Math.min(CAMPWALK.pages - 1, st.page | 0)); if (steps.length && page < steps[steps.length - 1].page) return null; // the pages come in order
    const w = {}; Object.keys(st.with || {}).forEach(id => { const p = campWalkWhere(st.with[id], ctx); if (p) w[id] = p; });
    const marks = (st.marks || []).map(m => { const p = campWalkWhere(m.at, ctx); return p ? { step: steps.length, kind: String(m.kind), x: p.x, y: p.y, r: +m.r || 400, label: m.label || '' } : null; }).filter(Boolean), bounds = campWalkBounds(st.zoom, ctx, at);
    steps.push({ n: steps.length, page, key, text: uiText(key, vars), at, with: w, marks, bounds, fit: campMapFit(bounds, F, CAMPWALK.pad) });
  }
  return { level, i, road, vars, steps, pages: CAMPWALK.pages };
}

// ---- the walk through time ----
const campWalkEase = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const campWalkLerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
function campWalkNew(plan) { const s = plan.steps[0]; return { i: 0, t: 0, z: 1, play: true, from: { party: { x: s.at.x, y: s.at.y }, with: Object.assign({}, s.with) }, vfrom: { s: s.fit.s, cx: s.fit.cx, cy: s.fit.cy } }; }
// where the party, the other ships and the camera are at this moment of this stop (the hand zoom is not in the view: campWalkShown has it)
function campWalkNow(plan, wk) {
  const st = plan.steps[wk.i], km = campWalkEase(wk.t / CAMPWALK.move), kv = campWalkEase(wk.t / CAMPWALK.look), also = {};
  Object.keys(Object.assign({}, wk.from.with, st.with)).forEach(id => { const a = wk.from.with[id] || st.with[id], b = st.with[id] || a; also[id] = campWalkLerp(a, b, km); }); // a ship the stop says nothing of stays where it was
  const v0 = wk.vfrom, f = st.fit;
  return { party: campWalkLerp(wk.from.party, st.at, km), with: also, view: { s: Math.exp(Math.log(v0.s) + (Math.log(f.s) - Math.log(v0.s)) * kv), cx: v0.cx + (f.cx - v0.cx) * kv, cy: v0.cy + (f.cy - v0.cy) * kv }, arrived: wk.t >= CAMPWALK.move, step: st, page: st.page };
}
// the view the player sees: the camera's view times the hand zoom, about the middle of the map
const campWalkShown = (plan, wk) => { const n = campWalkNow(plan, wk); return Object.assign({}, n, { view: { s: n.view.s * wk.z, cx: n.view.cx, cy: n.view.cy } }); };
function campWalkGo(plan, wk, i) {
  i = Math.max(0, Math.min(plan.steps.length - 1, i | 0)); if (i === wk.i) return false;
  const n = campWalkNow(plan, wk);
  wk.from = { party: n.party, with: n.with }; wk.vfrom = { s: n.view.s * wk.z, cx: n.view.cx, cy: n.view.cy }; wk.i = i; wk.t = 0; wk.z = 1; // the next stop is walked to from where the ships are, seen from where the camera is
  return true;
}
// a key: Enter or Right the next stop (Enter on the last launches; Right on the last does nothing, a stray key never launches), Left the one before, L launches from any, Esc closes
function campWalkNav(plan, wk, code) {
  const last = plan.steps.length - 1;
  if (code === 'Escape') return { i: wk.i, act: 'close' };
  if (code === 'KeyL') return { i: wk.i, act: 'launch' };
  if (code === 'Enter' || code === 'NumpadEnter') return wk.i >= last ? { i: wk.i, act: 'launch' } : { i: wk.i + 1, act: '' };
  if (code === 'ArrowRight') return { i: Math.min(last, wk.i + 1), act: '' };
  if (code === 'ArrowLeft') return { i: Math.max(0, wk.i - 1), act: '' };
  return { i: wk.i, act: '' };
}
// time: the walk plays on by itself, stop to stop, to the end of the page; the last stop of a page waits for Enter. It waits while the player has zoomed by hand (they are looking), and goes on when the zoom is back at 1.
function campWalkTick(plan, wk, dt) {
  wk.t += Math.max(0, Math.min(0.1, dt || 0));
  const st = plan.steps[wk.i], nx = plan.steps[wk.i + 1]; if (!wk.play || wk.z !== 1 || !nx || nx.page !== st.page) return false;
  if (wk.t < CAMPWALK.move + Math.max(CAMPWALK.dwell.min, CAMPWALK.dwell.perChar * st.text.length)) return false;
  return campWalkGo(plan, wk, wk.i + 1);
}
// the marks on the map now: a stop's marks are on from that stop (the stop's own bright, the earlier ones dim)
const campWalkMarks = (plan, wk) => plan.steps.slice(0, wk.i + 1).flatMap(s => s.marks.map(m => Object.assign({ now: s.n === wk.i }, m)));
