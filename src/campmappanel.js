// ---------- The Tab map in the panel look (card space-game-b3-f-tab-map-build; Troy, 25 Nov 2026: "all yes" to the six questions of card space-game-b3-f-tab-map-layout; the mock is docs/tab-map-mock.html, layout A) ----------
// The map was the last full screen drawn as old glass (a cyan frame with a glow and amber brackets, lists in monospace text on the canvas). Now, while the page HUD is up (campPageHudOn, the same switch: ?pagehud=0 is the tests' way back), the MAP ITSELF is still
// drawn on the canvas (the marks, the rings and the belts, the lines, the fire: src/campmapdraw.js) inside a card, and what was text round it is page panels in a column beside the card, in the page HUD's look (src/camppagehud.css tokens, src/campmappanel.css):
//   the card       a canvas-drawn rounded panel with the map in a rounded dark box (campmapdraw.js); the header over it (Map · Level 1, the name, the zoom and the area) and the footer under it are page elements
//   the column     the GOAL panel (the flight HUD's own goal words: Goal, 0 / 1, a meter), the radio panel (the radio lines that came while the map is open: they no longer sit over the map), the SET panel (the place you have set or are flying to),
//                  the FLY TO list (the same rows and windowing as before, the chosen row in a lit tile, the goal row in gold; the group heading GOAL is dropped: the gold row says it) with its key chips, and the LEGEND (each swatch is the mark's own shape)
//   the buttons    Fly and Fast beside a place you have set, as pills with their key chips (they are at the mark, so they are page elements placed over the map: only the buttons and the list rows take a click, the rest of the root lets every click through to the canvas)
// This file has the PURE half (the numbers, campMapPanelModel: what the panels show for a state, the swatches) and the DOM half (campMapPanelOpen / Paint / Close). With no document (the node suites), or with the page HUD off, nothing here runs and the map is drawn as it was.
//   campMapPanelsOn(s)        are the panels up for this scene (a page, a canvas, the page HUD on)
//   campMapPanelModel(C, mp, I)  PURE: what each panel shows { head, zoom, area, goal, set, list, legend, foot } from the battle, the map's state and what the paint has worked out (I: rows, sel, win, setRow, setDist, legend, km, flat)
//   campMapSwatch(type, color, flat)  PURE: a legend row's swatch, { color, shapes } as the ship look's signal shapes (src/shiplookglyph.js) at 11 px, or a plain disc, a diamond or a ring for what is not a ship
//   campMapToast(s, msg, color, hold)  src/common.js toast() asks first while the map is open: the message is the radio panel's, kept in s.mapRadio (true), or not taken (false: the old box over the map)
// The words are camp.map.* in content/text/campmappanel.md (and the old ones); every chip is read from the key table (CAMP_KEYS, and the CAMPAIGN row of the map's X).
const CAMPMAPPANEL = {
  card: { x: 16, y: 16, w: 898, h: 688, r: 14 },    // game px (the canvas is 1280 by 720): the card, the map's own frame in it and the places of the header and the footer
  frame: { x: 40, y: 84, w: 850, h: 548 },          // the map's frame: where the marks are drawn (it was { x: 100, y: 100, w: 790, h: 520 } in the glass panel): campMapFrameOf(mp)
  head: { x: 40, y: 26, w: 850, h: 52 }, foot: { x: 40, y: 642, w: 850, h: 44 },
  col: { x: 930, y: 16, w: 334, h: 688 },           // the column of panels: the goal, the radio line, the place set, the list, the legend
  box: { r: 10 },                                   // the corner of the map's dark box
  face: 'system-ui, -apple-system, "Segoe UI", sans-serif', // the typeface of the names on the map: the page's own (no web font)
  names: '#a9b8d0', belt: '#8b99b3',                // the names of the places are pale (amber is for the ships you protect) and the belts' dimmer
  every: 100,                                       // ms between two paints of the panels (the page HUD's own rate)
  dock: 0xcfe6ff,                                   // the thin ring round a place you can dock at (the level's outposts): yours, pale blue; gold stays for the goal. It was a bright green square with a beacon
  glyph: 11,                                        // px: a swatch's sign length
  kinds: { carrier: 'carrier', wing: 'fighter', convoy: 'freighter', alien: 'skiff', pirate: 'skiff', tboat: 'tboat', patrol: 'patrol', miner: 'miner', mother: 'mother', rival: 'pirateleader', tower: 'tower' } // a legend row's ship kind, for its sign
};
const campMapPanelsOn = s => typeof document !== 'undefined' && !!s && !!s.game && !!s.game.canvas && typeof s.game.canvas.getBoundingClientRect === 'function' && typeof campPageHudOn === 'function' && campPageHudOn();

// ---- where a place's name may stand (card space-game-tab-map-labels-rings; Troy, 25 Nov 2026: "LUNA is under the cruiser icon, the green square cuts through CERES"): the names are put clear of the marks on top of the places ----
const CAMPMAPPANEL_OBST = { carrier: 12, mother: 12, rival: 10, wing: 8, convoy: 8, patrol: 8, miner: 8, pirate: 8, tboat: 8, alien: 8, tower: 8, torpedo: 6 }; // the radius (screen px) a ship's mark keeps clear: the cruiser's long arrow is the widest
function campMapObstacles(mp, marks) { // the circles { x, y, r } in the frame that a name keeps out of: every ship's mark, and the ring of the mission's place (at most 24 px: a big ring is not a wall)
  const F = campMapFrameOf(mp), out = [];
  (marks || []).forEach(m => {
    let r = CAMPMAPPANEL_OBST[m.type]; if (m.type === 'objective') r = Math.min(24, Math.max(17, (m.r || 0) * mp.fit.s + 5)); if (!r) return;
    const p = campMapPoint(mp.fit, F, m.x, m.y); if (p.x < F.x - r || p.x > F.x + F.w + r || p.y < F.y - r || p.y > F.y + F.h + r) return;
    out.push({ x: p.x, y: p.y, r });
  });
  return out;
}
function campMapNamesBad(boxes, marks) { // how much of the names (boxes { x, y, w, h }: centres, in the order they were placed) lies over an earlier name or a mark ({ x, y, r }; marks[i] is name i's own: twice as bad), as mapPlace (src/map.js) counts it
  const ov = (a, b) => Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) * Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));
  let bad = 0; boxes.forEach((b, i) => { for (let j = 0; j < i; j++) bad += ov(b, boxes[j]); (marks || []).forEach((q, j) => { bad += ov(b, { x: q.x, y: q.y, w: q.r * 2, h: q.r * 2 }) * (j === i ? 2 : 1); }); });
  return bad;
}

// the map's own keys, from the table: Up and Down and Enter and the zoom keys are CAMP_KEYS'; the X that clears a trip is the CAMPAIGN row of the map's group (THE MAP); Tab and Esc close it
function campMapKeyCaps() {
  const K = CAMP_KEYS, rows = typeof controlsGroup === 'function' && controlsGroup('campaign') ? controlsGroup('campaign').rows : [], clear = rows.find(r => r.sub === 'THE MAP' && /clears/i.test(r.t));
  return { up: K.up.k, down: K.down.k, fly: K.pick.k, clear: clear && clear.k && clear.k[0] ? clear.k[0] : 'X', zoomout: K.zoomout.k, zoomin: K.zoomin.k, zoomreset: K.zoomreset.k, map: K.map.k, close: K.pause.k };
}
const campMapHex = n => '#' + ('000000' + ((+n || 0) >>> 0).toString(16)).slice(-6);
function campMapSwatch(type, color, flat) { // a legend row's swatch: the ship look's own sign for a ship (the colour of its side), a diamond for the caches, a ring for the relic and the anomalies, a disc for the rest (the squads)
  const P = CAMPMAPPANEL, hex = campMapHex(color), D = (x, y, r) => ({ t: 'disc', x, y, r, dark: false });
  if (flat && typeof slookGlyphShapes === 'function' && typeof SLOOK === 'object' && SLOOK && SLOOK.K && typeof slookColor === 'function' && typeof slookMapType === 'function') {
    const kind = P.kinds[type];
    if (kind && SLOOK.K[kind]) return { color: slookColor(slookMapType(type)), shapes: slookGlyphShapes(SLOOK.K[kind].g, P.glyph) };
    if (type === 'torpedo') return { color: slookColor(slookMapType('torpedo')), shapes: [{ t: 'poly', pts: [5.5, 0, 0, 4.4, -5.5, 0, 0, -4.4], dark: false }] };
  }
  if (type === 'cache') return { color: hex, shapes: [{ t: 'poly', pts: [0, -5, 5, 0, 0, 5, -5, 0], dark: false }] };
  if (type === 'outpost') return { color: hex, shapes: [{ t: 'ring', x: 0, y: 0, r: 4.8, w: 1.4 }] }; // a dock: the thin ring round a place you can dock at
  if (type === 'relic' || type === 'anomaly') return { color: hex, shapes: [{ t: 'ring', x: 0, y: 0, r: 4.2, w: 1.8 }] };
  return { color: hex, shapes: [D(0, 0, 4.4)] };
}
function campMapSwatchSvg(sw) { // the swatch as markup (our own numbers only: no word of the game goes in)
  const f = x => Math.round(x * 100) / 100, col = sw.color;
  const p = sw.shapes.map(x => x.t === 'poly' ? '<polygon points="' + x.pts.map((v, i) => f(v) + (i % 2 ? ' ' : ',')).join('').trim() + '" fill="' + (x.dark ? '#0b1220' : col) + '"/>'
    : x.t === 'ring' ? '<circle cx="' + f(x.x) + '" cy="' + f(x.y) + '" r="' + f(x.r) + '" fill="none" stroke="' + col + '" stroke-width="' + f(x.w) + '"/>' : '<circle cx="' + f(x.x) + '" cy="' + f(x.y) + '" r="' + f(x.r) + '" fill="' + (x.dark ? '#0b1220' : col) + '"/>').join('');
  return '<svg viewBox="-8 -8 16 16" width="16" height="16">' + p + '</svg>';
}

// what each panel shows for a state. I: { rows, sel, win (navpanelLines), setRow, setDist (px), legend (campMapLegend rows), km (the frame's width in km, as text), flat (the new ship look) }
function campMapPanelModel(C, mp, I) {
  I = I || {}; const L = C.L || CAMP.levels[C.level] || {}, K = campMapKeyCaps(), win = I.win || { lines: [] };
  const goalHead = ((typeof CAMPNAV === 'object' && CAMPNAV.groups ? CAMPNAV.groups : []).find(g => g[0] === 'goal') || [0, null])[1]; // the list's first heading says GOAL where the panel above says it already: the gold row says it, so the heading goes
  const g = typeof campPageHudGoal === 'function' ? campPageHudGoal(C) : null, N = C.nav && C.nav.name ? C.nav : null, set = N ? { lab: uiText('camp.map.flyinglab'), name: String(N.name), dist: Math.hypot(N.x - C.carrier.x, N.y - C.carrier.y) } : I.setRow ? { lab: uiText('camp.map.setlab'), name: String(I.setRow.name), dist: I.setDist || 0 } : null;
  return {
    head: { lab: uiText('camp.map.head', { n: C.level }), name: String(L.name || '') },
    zoom: { pct: Math.round((mp.zWant || 1) * 100) + '%', out: K.zoomout, in: K.zoomin, reset: K.zoomreset, w: uiText('camp.map.zoomw'), rw: uiText('camp.map.resetw') },
    area: uiText(mp.whole ? 'camp.map.syspill' : 'camp.map.areapill', { km: I.km == null ? '' : I.km }),
    goal: g ? { lab: uiText('camp.map.goalpanel'), name: g.label, value: g.value || '', frac: g.frac, tone: g.tone } : null,
    set: set ? { lab: set.lab, name: set.name, km: typeof campNavKm === 'function' ? campNavKm(set.dist) + ' km' : '', key: K.clear } : null,
    list: { title: uiText('camp.map.flyto'), lines: win.lines.filter(l => !(l.head && l.head === goalHead)).map(l => l.head ? { head: l.head } : { id: l.row.id, name: String(l.row.name), km: (typeof campNavKm === 'function' ? campNavKm(l.row.dist) : '') + ' km', on: l.i === I.sel, goal: !!l.row.goal }),
      keys: [{ k: [K.up, K.down], w: uiText('camp.map.kchoose') }, { k: [K.fly], w: uiText('camp.map.kfly') }, { k: [K.clear], w: uiText('camp.map.kclear') }] },
    legend: (I.legend || []).concat(I.docks > 0 ? [{ type: 'outpost', color: CAMPMAPPANEL.dock, text: uiText('camp.map.dock', { n: I.docks }) }] : []).map(r => ({ type: r.type, text: r.text, sw: campMapSwatchSvg(campMapSwatch(r.type, r.color, !!I.flat)) })), // a place you can dock at has a thin ring on the map, so the legend says it (a row only while there is one)
    foot: { keys: [K.map, K.close], w: uiText('camp.map.closew'), live: uiText('camp.map.live') }
  };
}

// ---- the radio panel (card space-game-b3-c-radio-panel is the flight's; this is the map's, the same look): src/common.js toast() asks first ----
function campMapToast(s, msg, color, hold) {
  if (!s || !s.mp || s.mp.dom !== true || typeof toastPlan !== 'function' || typeof TOAST !== 'object') return false;
  const T0 = TOAST, now = s.time && typeof s.time.now === 'number' ? s.time.now : 0, old = s.mapRadio, prev = old && now < old.until + T0.fade ? old : null, plan = toastPlan(prev, msg, now); // a message that comes soon after one that said something else shares the panel with it: two lines at most
  s.mapRadio = { msg: String(msg), last: String(msg), at: now, until: now + Math.max(T0.hold, hold | 0), lines: plan.lines, color: color || '#ffd37a' };
  return true;
}

// a radio box of the canvas that was up when the map opened (the old box would stay over the map until its time ran out): its line moves into the radio panel and the box goes
function campMapPanelTakeToasts(s) {
  const up = (s && s.toasts || []).filter(o => o && o.t && o.t.active); if (!up.length) return false;
  const o = up[up.length - 1], color = o.t && o.t.style && o.t.style.color ? o.t.style.color : '#ffd37a';
  campMapToast(s, o.msg, color, 0); up.forEach(x => { try { x.t.destroy(); x.bg.destroy(); x.tab.destroy(); } catch (e) { /* gone with the scene */ } }); s.toasts = [];
  return true;
}
// ---- the page elements ----
const campMapPanelSet = (el, prop, v) => {
  if (prop !== 'html') return campPageHudSet(el, prop, v);
  if (!el) return false; const m = el._ph || (el._ph = {}); if (m.html === v) return false; m.html = v; el.innerHTML = v; return true;
};
function campMapPanelBuild(doc, s) {
  const E = (tag, cls, parent) => campPageHudEl(doc, tag, cls, parent), P = CAMPMAPPANEL, put = (el, r) => { el.style.left = (r.x / 12.8) + '%'; el.style.top = (r.y / 7.2) + '%'; el.style.width = (r.w / 12.8) + '%'; el.style.height = (r.h / 7.2) + '%'; return el; };
  const root = E('div', 'ph-root mp-root', null); root.setAttribute('aria-hidden', 'true'); // a picture of the game: nothing here takes focus or a key
  const R = { doc, root, s, at: -1e9, rows: [], leg: [], sig: '', lsig: '' };
  const chipRow = (parent, n) => { const out = []; for (let i = 0; i < n; i++) out.push(E('span', 'ph-k', parent)); return out; };
  R.head = put(E('div', 'mp-head', root), P.head);
  const hl = E('div', 'mp-hl', R.head); R.lab = E('span', 'ph-lab', hl); R.title = E('div', 'mp-title', hl);
  const hr = E('div', 'mp-hr', R.head); R.zpct = E('span', 'mp-pill', hr);
  const zk = E('span', 'mp-kk', hr); R.zout = E('span', 'ph-k', zk); R.zin = E('span', 'ph-k', zk); R.zw = E('span', 'mp-sm', zk);
  const zr = E('span', 'mp-kk', hr); R.zres = E('span', 'ph-k', zr); R.zrw = E('span', 'mp-sm', zr); R.area = E('span', 'mp-pill', hr);
  R.foot = put(E('div', 'mp-foot', root), P.foot);
  const fk = E('span', 'mp-kk', R.foot); R.fchips = chipRow(fk, 2); R.fw = E('span', 'mp-sm', fk); R.live = E('span', 'mp-pill', R.foot);
  R.col = put(E('div', 'mp-col', root), P.col);
  const goal = E('div', 'ph-p mp-pn', R.col), g1 = E('div', 'ph-row ph-between', goal), g2 = E('div', 'ph-row', goal); R.goal = { el: goal, lab: E('span', 'ph-lab mp-gold', g1), value: E('b', '', g1), name: E('span', 'mp-sm', g2), meter: E('div', 'ph-meter', g2) }; R.goal.fill = E('i', 'ph-fill', R.goal.meter);
  const radio = E('div', 'ph-p mp-pn mp-radio', R.col); R.radio = { el: radio, line: E('div', 'mp-rad', radio) };
  const set = E('div', 'ph-p mp-pn', R.col), s1 = E('div', 'ph-row ph-between', set), s2 = E('div', 'ph-row ph-between', set); R.set = { el: set, lab: E('span', 'ph-lab', s1), keys: E('span', 'mp-kk', s1), name: E('span', 'mp-big', s2), km: E('span', 'mp-sm', s2) }; R.set.key = E('span', 'ph-k', R.set.keys); R.set.kw = E('span', 'mp-sm', R.set.keys);
  const list = E('div', 'ph-p mp-pn mp-list', R.col); R.list = { el: list, title: E('span', 'ph-lab', list), body: E('div', 'mp-rows', list), keys: E('div', 'ph-row ph-between mp-keys', list) };
  const legend = E('div', 'ph-p mp-pn mp-leg', R.col); R.legend = { el: legend };
  R.btns = {}; [['fly', 'camp.map.pillfly'], ['fast', 'camp.map.pillfast']].forEach(([id, key]) => {
    const el = E('div', 'mp-btn act', root), w = E('span', '', el), t = E('i', '', el), k = E('span', 'ph-k', el);
    el.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); }); // a press never takes focus from the game
    el.addEventListener('click', ev => { const S = R.s, mp = S && S.mp; if (!mp) return; const row = mp.rows.find(r => r.id === mp.setId); if (row) campMapFly(S, row, id === 'fast'); if (ev.stopPropagation) ev.stopPropagation(); });
    R.btns[id] = { el, w, t, k, key };
  });
  const take = E('div', 'mp-btn act', root), tw = E('span', '', take); take.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); }); take.addEventListener('click', () => { const S = R.s, mp = S && S.mp; const row = mp && mp.rows.find(r => r.id === mp.setId); if (row) campMapTake(S, row); }); R.btns.take = { el: take, w: tw };
  root.addEventListener('wheel', ev => { const S = R.s; if (S && S.mp && typeof campZoomMapWheel === 'function') { campZoomMapWheel(S.mp, ev.deltaY); if (ev.preventDefault) ev.preventDefault(); } }, { passive: false }); // the wheel over a row zooms the map as it does over the map (the canvas does not see it there)
  return R;
}
function campMapPanelOpen(s) {
  if (!s || !s.mp || typeof document === 'undefined') return null;
  if (s.mpPanel) campMapPanelClose(s);
  const R = s.mpPanel = campMapPanelBuild(document, s); document.body.appendChild(R.root); return R;
}
function campMapPanelClose(s) {
  const R = s && s.mpPanel; if (R && R.root && R.root.parentNode) R.root.parentNode.removeChild(R.root);
  if (s) { s.mpPanel = null; s.mapRadio = null; }
}
const campMapPanelFit = (R, canvas) => { // the root over the canvas rectangle, at the page HUD's font size
  const r = canvas.getBoundingClientRect(), set = campPageHudSet, fs = r.width * (typeof CAMP_PAGEHUD === 'object' ? CAMP_PAGEHUD.em : 0.0112);
  set(R.root, 'display', ''); set(R.root, 'left', Math.round(r.left) + 'px'); set(R.root, 'top', Math.round(r.top) + 'px'); set(R.root, 'width', Math.round(r.width) + 'px'); set(R.root, 'height', Math.round(r.height) + 'px'); set(R.root, 'fontSize', Math.round(fs * 100) / 100 + 'px');
  return r.width / 1280; // k: screen px for a game px
};
const campMapPanelDue = (s, now) => { const R = s && s.mpPanel; return !!R && (!!R.force || now - R.at >= CAMPMAPPANEL.every || now < R.at); }; // is it time to work out the model again (the paint itself is cheap: it only fades the radio line)
function campMapPanelPaint(s, M, now) {
  const R = s && s.mpPanel, canvas = s && s.game && s.game.canvas; if (!R || !canvas) return false;
  const k = campMapPanelFit(R, canvas), set = campMapPanelSet, doc = R.doc, E = (tag, cls, parent) => campPageHudEl(doc, tag, cls, parent);
  // the radio panel fades on the scene's clock (it is cheap and it must not step 10 a second)
  const T = s.mapRadio, T0 = typeof TOAST === 'object' ? TOAST : { fade: 600 }, left = T ? T.until + T0.fade - (s.time && typeof s.time.now === 'number' ? s.time.now : now) : 0, a = left > 0 ? Math.min(1, left / T0.fade) : 0;
  set(R.radio.el, 'display', a > 0 ? '' : 'none'); if (a > 0) { set(R.radio.line, 'text', T.lines.join('\n')); set(R.radio.line, '--rc', T.color); set(R.radio.line, 'opacity', String(Math.round(a * 100) / 100)); }
  if (now - R.at < CAMPMAPPANEL.every && now >= R.at && !R.force) return true; // the rest 10 a second at most
  R.at = now; R.force = false; if (!M) return true;
  set(R.lab, 'text', M.head.lab); set(R.title, 'text', M.head.name);
  set(R.zpct, 'text', M.zoom.pct); set(R.zout, 'text', M.zoom.out); set(R.zin, 'text', M.zoom.in); set(R.zw, 'text', M.zoom.w); set(R.zres, 'text', M.zoom.reset); set(R.zrw, 'text', M.zoom.rw); set(R.area, 'text', M.area);
  M.foot.keys.forEach((c, i) => set(R.fchips[i], 'text', c)); set(R.fw, 'text', M.foot.w); set(R.live, 'text', M.foot.live);
  const G = R.goal; set(G.el, 'display', M.goal ? '' : 'none');
  if (M.goal) { set(G.lab, 'text', M.goal.lab); set(G.value, 'text', M.goal.value); set(G.name, 'text', M.goal.name); set(G.meter, 'display', M.goal.frac === null ? 'none' : ''); set(G.fill, 'width', M.goal.frac === null ? '0%' : Math.round(M.goal.frac * 1000) / 10 + '%'); set(G.fill, 'cls', 'ph-fill ph-' + M.goal.tone); }
  const S = R.set; set(S.el, 'display', M.set ? '' : 'none');
  if (M.set) { set(S.lab, 'text', M.set.lab); set(S.key, 'text', M.set.key); set(S.kw, 'text', M.list.keys[2].w); set(S.name, 'text', M.set.name); set(S.km, 'text', M.set.km); }
  // the list: the rows are made again when the lines change shape (a heading, an id); the distances and the chosen row are written in place
  const L = R.list, sig = M.list.lines.map(l => l.head ? 'h:' + l.head : 'r:' + l.id).join('|');
  set(L.title, 'text', M.list.title);
  if (sig !== R.sig) {
    R.sig = sig; while (L.body.firstChild) L.body.removeChild(L.body.firstChild); R.rows = [];
    M.list.lines.forEach(l => {
      if (l.head) { R.rows.push({ head: E('div', 'ph-lab mp-head2', L.body) }); return; }
      const el = E('div', 'mp-tile act', L.body), n = E('span', '', el), d = E('span', 'mp-km', el), id = l.id;
      el.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); });
      el.addEventListener('click', ev => { const S2 = R.s; if (S2 && S2.mp && typeof campMapRowClick === 'function') campMapRowClick(S2, id); if (ev.stopPropagation) ev.stopPropagation(); });
      R.rows.push({ el, n, d });
    });
  }
  M.list.lines.forEach((l, i) => { const r = R.rows[i]; if (!r) return; if (l.head) { set(r.head, 'text', l.head); return; } set(r.n, 'text', l.name); set(r.d, 'text', l.km); set(r.el, 'cls', 'mp-tile act' + (l.on ? ' on' : '') + (l.goal ? ' goal' : '')); });
  const ksig = M.list.keys.map(x => x.k.join('/') + x.w).join('|');
  if (R.ksig !== ksig) { R.ksig = ksig; while (L.keys.firstChild) L.keys.removeChild(L.keys.firstChild); M.list.keys.forEach(x => { const g = E('span', 'mp-kk', L.keys); x.k.forEach(c => { const chip = E('span', 'ph-k', g); chip.textContent = c; }); const w = E('span', 'mp-sm', g); w.textContent = x.w; }); }
  const lsig = M.legend.map(x => x.type + x.text + x.sw).join('|'), LG = R.legend;
  set(LG.el, 'display', M.legend.length ? '' : 'none');
  if (lsig !== R.lsig) { R.lsig = lsig; while (LG.el.firstChild) LG.el.removeChild(LG.el.firstChild); M.legend.forEach(x => { const row = E('div', 'mp-lr', LG.el), sw = E('span', 'mp-sw', row); sw.innerHTML = x.sw; const t = E('span', '', row); t.textContent = x.text; }); }
  return k > 0;
}
// the two buttons by a place you have set (campmapdraw.js places them each frame: they follow the mark while the zoom eases): the pill's words and chips, its size in game px, then its place
function campMapPanelButtons(s, B) { // B: { fly: { t, on }, fast: { t, on }, take: { text, on } } or null (no place set): the size of the widest, { w, h } in game px
  const R = s && s.mpPanel; if (!R) return { w: 0, h: 0 }; const set = campMapPanelSet, K = campMapKeyCaps(); let w = 0, h = 0;
  ['fly', 'fast', 'take'].forEach(id => {
    const b = R.btns[id], d = B && B[id]; set(b.el, 'display', d ? '' : 'none'); if (!d) return;
    if (id === 'take') set(b.w, 'text', d.text); else { set(b.w, 'text', uiText(b.key)); set(b.t, 'text', d.t); set(b.k, 'text', id === 'fast' ? 'Shift ' + K.fly : K.fly); } // (the modifier is the table's Enter row: "Shift+Enter: fast")
    set(b.el, 'cls', 'mp-btn act' + (d.on ? ' on' : ''));
  });
  const k = R.root.getBoundingClientRect().width / 1280;
  ['fly', 'fast', 'take'].forEach(id => { const b = R.btns[id]; if (B && B[id] && k > 0) { w = Math.max(w, b.el.offsetWidth / k); h = Math.max(h, b.el.offsetHeight / k); } });
  return { w, h };
}
function campMapPanelPlace(s, x, y, h, take) { // the pills one under another at (x, y) in game px
  const R = s && s.mpPanel; if (!R) return; const set = campPageHudSet, k = R.root.getBoundingClientRect().width / 1280;
  [['fly', 0], ['fast', 1], ['take', 2]].forEach(([id, n]) => { const el = R.btns[id].el; set(el, 'left', Math.round(x * k) + 'px'); set(el, 'top', Math.round((y + n * (h + 4)) * k) + 'px'); });
}
function campMapPanelBoxes(s) { // the visible buttons as boxes in game px (the route label keeps clear of them)
  const R = s && s.mpPanel; if (!R) return []; const k = R.root.getBoundingClientRect().width / 1280; if (!(k > 0)) return [];
  return ['fly', 'fast', 'take'].map(id => R.btns[id].el).filter(el => el.style.display !== 'none' && el.offsetWidth > 0).map(el => ({ x: (parseFloat(el.style.left) || 0) / k, y: (parseFloat(el.style.top) || 0) / k, w: el.offsetWidth / k, h: el.offsetHeight / k }));
}
