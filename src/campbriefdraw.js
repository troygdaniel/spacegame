// ---------- Campaign: the big briefing, the drawing (cards space-game-campaign-briefing and space-game-briefing-walkthrough) ----------
// The Phaser half of src/campbrief.js, which says WHAT is on the screen. A modal glass over the ready room, in three screens to walk through (Enter or Right goes on, Left goes back, Enter on the last launches):
//   1 WHERE AND WHY   the system map, drawn with the Tab map's own pieces (campMapFit and campMapPoint for the scale, mapGridStep for the grid, campMapArcs for the rings round the star and campMapDotsIn for the belts as rocks, mapPlace for the
//                     names, hudPanel and hudGlowPath for the glass), the mission's place marked, your route from where you start with its distance and time, and the objective points; + - 0 and the wheel zoom it, M goes round the route,
//                     the mission area and the whole system; at the right the place, the route and the story line
//   2 WHAT TO DO      the goals as steps, each with a small picture made of the game's own sprites (campBriefPicture), then the bonus objectives with what they earn
//   3 HOW             the walkthrough, the keys this mission needs, the enemies and your readiness with its warnings
// Over the foot of a screen is the ship's own line when the mission has one (campBriefNote: mission 1.1 teaches the basics there). It opens at once when a mission is picked on the board, and the ship reads the first line of the
// walkthrough once (the voice's own settings rule: muted, off or no voice is silent).
//   campBriefOpen(s)         open the briefing of the mission the room's Launch would fly (campHubTarget): false when there is none
//   campBriefClose(s)        take it away
//   campBriefKey(s, code)    a key while it is open: Enter or Right the next screen, Left the one before, Enter on the last and L anywhere launch, Esc closes, + - 0 zoom the map (screen 1), M goes round its three views; every other key is the screen's (nothing under it moves)
//   campBriefIsOpen(s)       is it open
const CAMPBRIEF_COL = { where: { x: 806, w: 412 }, goals: { x: 62, w: 580 }, bonus: { x: 690, w: 528 }, how: { x: 62, w: 556 }, foes: { x: 660, w: 558 } }; // px: the text columns of the three screens (the map is CAMPBRIEF.frame, which ends at 778)
const CAMPBRIEF_ZOOM = ['camp.bf.zoomroute', 'camp.bf.zoomarea', 'camp.bf.zoomwhole']; // the words of the key line for the view M goes to: the route, the mission area, the whole system
const campBriefIsOpen = s => !!s && !!s.bf && s.bf.open === true;
// card space-game-keys6-enter (Troy, 24 Nov 2026): M fires a missile in a Campaign battle, so it does not mute there (mute is in Settings, reached from the pause card with S); meta.js asks
const campHoldsM = game => !!(game && game.scene && typeof game.scene.getScenes === 'function' && game.scene.getScenes(true).some(sc => sc.scene && sc.scene.key === 'Campaign'));
const campBriefHoldsM = game => !!(game && game.scene && typeof game.scene.getScenes === 'function' && game.scene.getScenes(true).some(campBriefIsOpen)); // meta.js: M mutes the sound everywhere, except while the briefing is up: there it zooms the map
const campBriefProj = (fit, F) => (x, y) => campMapPoint(fit, F, x, y);
const campBriefGone = list => { list.forEach(o => { try { o.destroy(); } catch (e) { /* gone with the scene */ } }); list.length = 0; };

function campBriefOpen(s) {
  if (typeof scrOn === 'function' && scrOn() && !(s && s.d && s.d.dock) && typeof scrBriefOpen === 'function') { const r = scrBriefOpen(s); if (r !== null) return r; } // the new look (src/scrbrief.js, src/scrbriefdraw.js): one page; null when there is no page to draw it on, and the three screens below open as ever
  if (!s || !s.add || campBriefIsOpen(s)) return false;
  const t = campHubTarget(s.P, s.hub), Y = campBriefLayers(t.level, t.i); if (!Y) return false;
  const K = CAMPBRIEF, P = K.panel, objs = [], put = (o, d) => { o.setScrollFactor(0).setDepth(130 + (d || 0)); objs.push(o); return o; }, v = campBriefView(Y, 0, 1);
  const bf = s.bf = { open: true, objs, t, Y, zoom: 0, z: 1, base: v.base, fit: v.fit, screen: 0, walk: campBriefWalk(t.level, t.i), ready: campBriefReady(s.P, t.level, t.i), foes: campBriefEnemies(t.level, t.i), brief: campHubBrief(s.P, t.level, t.i), route: campBriefRoute(Y), steps: campBriefSteps(s.P, t.level, t.i), keysFor: campBriefKeys(t.level, t.i), story: campBriefStory(s.P, t.level, t.i), map: [], text: [], pics: [], plan: null, wk: null };
  bf.plan = typeof campWalkPlan === 'function' ? campWalkPlan(t.level, t.i) : null; if (bf.plan) bf.wk = campWalkNew(bf.plan); // a mission with a walk (src/data_briefwalk.js) is briefed on the walking map on every page (src/campbriefwalkdraw.js); the others keep the three screens
  put(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.97).setInteractive(), 0); // a veil that takes the clicks
  hudPanel(put(s.add.graphics(), 1), P.x, P.y, P.w, P.h, 22, 0.98, s.accent ? parseInt(s.accent.slice(1), 16) : CYAN);
  bf.g = put(s.add.graphics(), 2); bf.mg = put(s.add.graphics(), 2); // g: the rule under the heading and the pictures, mg: the map (drawn again alone at a zoom)
  bf.keys = put(s.add.text(P.x + P.w / 2, P.y + P.h - 20, '', uiFont(13, '#bfe9ff')).setOrigin(0.5), 4);
  if (s.input && typeof s.input.on === 'function') { bf.onWheel = (p, over, dx, dy) => { if (bf.plan) campWalkZoomTo(s, camzoomWheel(bf.wk.z, dy, CAMPWALK.zoom.min, CAMPWALK.zoom.max)); else if (bf.screen === 0) campBriefZoomTo(s, camzoomWheel(bf.z, dy, K.zoom.min, K.zoom.max)); }; s.input.on('wheel', bf.onWheel); } // the wheel zooms the map while it is on the screen
  if (bf.plan) campWalkBuild(s); else campBriefPaint(s);
  if (typeof sfx === 'function') sfx('uiOpen');
  if (typeof shipcompSay === 'function' && bf.walk.data && bf.walk.steps[0]) { try { shipcompSay(bf.walk.steps[0]); } catch (e) { /* the voice never stops the screen */ } } // the ship reads the first step once; the voice's own settings (muted, off, no voice) decide if it is heard
  return true;
}
function campBriefClose(s) {
  if (!campBriefIsOpen(s)) return false;
  if (s.bf.one === true && typeof scrBriefDrop === 'function') scrBriefDrop(s); // the new look's panels
  if (s.bf.onWheel && s.input && typeof s.input.off === 'function') { try { s.input.off('wheel', s.bf.onWheel); } catch (e) { /* gone */ } }
  campBriefGone(s.bf.objs); campBriefGone(s.bf.map); campBriefGone(s.bf.text); campBriefGone(s.bf.pics);
  s.bf = null; return true;
}

// one screen, painted again whole: the heading and the names of the three screens, the screen's own page, the ship's line over its foot, the keys line
function campBriefPaint(s) {
  const bf = s.bf, K = CAMPBRIEF; campBriefGone(bf.map); campBriefGone(bf.text); campBriefGone(bf.pics); bf.g.clear(); bf.mg.clear();
  campBriefPaintHead(s);
  [campBriefPaintWhere, campBriefPaintWhat, campBriefPaintHow][bf.screen](s);
  const note = campBriefNote(bf.t.level, bf.t.i, bf.screen);
  if (note) { const t = campBriefOwn(s, s.add.text(K.head.x, K.note.y, uiText('camp.bf.ship') + '  ' + note, uiFont(15, '#8fe9ff', { wordWrap: { width: K.head.right - K.head.x } }))); t.setOrigin(0, 0); }
  campBriefPaintKeys(s);
}
const campBriefOwn = (s, o) => { o.setScrollFactor(0).setDepth(134); s.bf.text.push(o); return o; };
// the words of the keys line: what Enter does here, and on the first screen what + - 0 and M do
function campBriefKeysLine(bf) {
  if (bf.plan) return uiText(bf.wk.i >= bf.plan.steps.length - 1 ? 'camp.bf.keys.launch' : 'camp.bf.keys.next') + '    ' + uiText('camp.bf.keys.zoom'); // the walking map: Enter goes on a stop (or page) and launches at the last; + - Backspace zoom it on every page
  const last = bf.screen >= CAMPBRIEF.screens - 1;
  return uiText(last ? 'camp.bf.keys.launch' : 'camp.bf.keys.next') + (bf.screen === 0 ? '    ' + uiText('camp.bf.keys.zoom') + '    ' + uiText(CAMPBRIEF_ZOOM[campBriefZoomNext(bf.Y, bf.zoom)]) : '');
}
function campBriefPaintKeys(s) { if (s.bf.keys) s.bf.keys.setText(campBriefKeysLine(s.bf)); }
// the flow of a column of text: each paragraph under the one before; returns where the next starts
function campBriefFlow(s, col, y, text, size, color, o) { const t = campBriefOwn(s, s.add.text(col.x, y, text, uiFont(size, color, Object.assign({ wordWrap: { width: col.w } }, o || {})))); return y + t.height + 4; }

// the heading across the top and the three screens' names under it (the one you are on is lit)
function campBriefPaintHead(s) {
  const bf = s.bf, B = bf.brief, K = CAMPBRIEF, Hd = K.head, rp = bf.t.replay === true && bf.t.skipped !== true; // a mission done is a replay; one skipped is briefed as a mission
  campBriefOwn(s, s.add.text(Hd.x, Hd.y, uiText(rp ? 'camp.bf.head.replay' : 'camp.bf.head', { n: B.n, title: B.title }), uiFont(19, rp ? '#6dff9c' : '#38e1ff', { fontStyle: 'bold' }))).setOrigin(0, 0.5); // "Mission 1", not "Mission 1/3": which of how many is the board's business
  campBriefOwn(s, s.add.text(Hd.right, Hd.y, uiText('camp.hub.brief.kind', { kind: B.kindText, par: B.par }), uiFont(13, '#8fb4c9'))).setOrigin(1, 0.5);
  CAMPBRIEF_SCREEN.forEach((name, k) => campBriefOwn(s, s.add.text(Hd.x + k * K.tabs.step, K.tabs.y, (k + 1) + '  ' + uiText('camp.bf.scr.' + name), uiFont(13, k === bf.screen ? '#ffd37a' : '#5f8299', k === bf.screen ? { fontStyle: 'bold' } : {}))).setOrigin(0, 0.5));
  bf.g.lineStyle(1, CYAN, 0.25); bf.g.lineBetween(Hd.x, K.tabs.y + 12, Hd.right, K.tabs.y + 12);
}

// ---------- screen 1: where and why ----------
function campBriefPaintWhere(s) {
  campBriefPaintMap(s);
  const bf = s.bf, A = CAMPBRIEF_COL.where, R = bf.route; let y = CAMPBRIEF.text.top;
  y = campBriefFlow(s, A, y, uiText('camp.bf.where'), 14, '#38e1ff');
  y = campBriefFlow(s, A, y, (bf.Y.focus.label || bf.brief.title).toUpperCase(), 20, '#ffb454', { fontStyle: 'bold' });
  y = campBriefFlow(s, A, y, R.near ? uiText('camp.bf.routenear') : uiText('camp.bf.route', { km: R.km, regular: R.regular, fast: R.fast }), 14, '#ffffff') + 14;
  y = campBriefFlow(s, A, y, uiText('camp.bf.why'), 14, '#38e1ff');
  bf.story.forEach(l => { y = campBriefFlow(s, A, y, l, 16, '#e8f6ff'); });
}

// the space of the map: the glass, the grid, the rings round the star and the belts as rocks (src/campsol.js), as the Tab map draws them; the briefing's map (here) and its walking map (src/campbriefwalkdraw.js) both start with it
function campBriefMapSpace(g, fit, F, level) {
  const X = (x, y) => campBriefProj(fit, F)(x, y);
  g.fillStyle(0x03070f, 1); g.fillRect(F.x, F.y, F.w, F.h);
  const w0 = fit.cx - F.w / 2 / fit.s, w1 = fit.cx + F.w / 2 / fit.s, h0 = fit.cy - F.h / 2 / fit.s, h1 = fit.cy + F.h / 2 / fit.s, gs = mapGridStep(F.w / fit.s, 1e12);
  g.lineStyle(1, CYAN, 0.12);
  for (let w = Math.ceil(w0 / gs) * gs; w < w1; w += gs) { const a = X(w, 0).x; g.lineBetween(a, F.y, a, F.y + F.h); }
  for (let w = Math.ceil(h0 / gs) * gs; w < h1; w += gs) { const b = X(0, w).y; g.lineBetween(F.x, b, F.x + F.w, b); }
  // the rings round the star and the belts as rocks (src/campsol.js): the same as the Tab map
  const wd = typeof campWorldOf === 'function' ? campWorldOf(level) : null;
  if (wd) {
    const sp = X(wd.star.x, wd.star.y), proj = (x, y) => X(x, y);
    g.lineStyle(1, 0x7fa8c8, 0.26);
    wd.rings.forEach(r => campMapArcs(sp.x, sp.y, r * fit.s, F).forEach(pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokePath(); }));
    g.fillStyle(0xb9a37a, 0.8); wd.bands.forEach(b => campMapDotsIn(b.dots, proj, F).forEach(p => g.fillRect(p.x - 0.5, p.y - 0.5, 1.7, 1.7)));
    wd.clusters.forEach(c => campMapDotsIn(c.dots, proj, F).forEach(p => g.fillRect(p.x - 0.5, p.y - 0.5, 1.7, 1.7)));
  }
}
// the map, once and again at a zoom: the grid, the rings and the belts, the places, the objective points, the route, you
function campBriefPaintMap(s) {
  const bf = s.bf, Y = bf.Y, F = bf.frame || CAMPBRIEF.frame, g = bf.mg; g.clear(); campBriefGone(bf.map);
  const fit = bf.fit, X = (x, y) => campBriefProj(fit, F)(x, y), inF = p => p.x >= F.x && p.x <= F.x + F.w && p.y >= F.y && p.y <= F.y + F.h;
  const own = o => { o.setScrollFactor(0).setDepth(133); bf.map.push(o); return o; };
  // nothing is drawn outside the glass (card space-game-night-hunt-l2-l3: zoomed in, the route's dashes ran over the keys line and the YOU label hung under the panel): a circle is stroked as the arcs that are inside the frame, a line is cut to it, a point is drawn only inside it
  const ring = (q, r) => campMapArcs(q.x, q.y, r, F).forEach(pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokePath(); }), whole = (q, r) => q.x - r >= F.x && q.x + r <= F.x + F.w && q.y - r >= F.y && q.y + r <= F.y + F.h;
  const one = bf.one === true, FF = one && typeof CAMPMAPPANEL === 'object' ? { fontFamily: CAMPMAPPANEL.face } : {}; // the one page's map has the Tab map's panel look (card space-game-screens-batch-fixes): the page's typeface, a thin frame, thin rings for the docks and the goal
  campBriefMapSpace(g, fit, F, Y.level);
  if (one) g.lineStyle(1, 0x8caad2, 0.4).strokeRoundedRect(F.x + 0.5, F.y + 0.5, F.w - 1, F.h - 1, 14); else hudGlowPath(g, [[F.x, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.h], [F.x, F.y + F.h]], CYAN, 0.85, true, 1.25);
  // the places: a disc and a name (the names are put where they touch nothing: mapPlace); the outposts wear the Tab map's green frame
  const items = [], texts = [];
  const a = X(Y.start.x, Y.start.y), b = X(Y.focus.x, Y.focus.y), R = bf.route; // the start and the mission's place: their labels are placed first, the names of the places go round them
  const label = (txt, color, anchor, r, bold) => { const t = own(s.add.text(0, 0, txt, uiFont(11, color, Object.assign({}, FF, bold ? { fontStyle: 'bold' } : {})))).setOrigin(0.5).setDepth(136); texts.push(t); items.push({ x: anchor.x, y: anchor.y, r, w: t.width, h: t.height, side: 'below' }); return t; };
  const mark = Y.focus.label ? Y.focus.label.toUpperCase() : ''; // the name the mission mark carries
  label(uiText('camp.bf.mission') + (mark ? '  ' + mark : ''), '#ffb454', b, 16, true);
  if (inF(a)) label(uiText('camp.bf.you'), '#ffffff', a, 9, false);
  Y.places.forEach(p => {
    const q = X(p.x, p.y); if (!inF(q)) return; const r = Math.max(p.star ? 7 : 4, p.r * fit.s);
    g.fillStyle(p.star ? 0xffe29a : 0xb9a37a, 0.85).fillCircle(q.x, q.y, r); g.lineStyle(1, p.star ? 0xffe29a : 0xb9a37a, 0.5).strokeCircle(q.x, q.y, r + 3);
    if (p.outpost) { if (one) g.lineStyle(1.4, CAMPMAPPANEL.dock, 0.95).strokeCircle(q.x, q.y, r + 7); else { const e = r + 8; g.lineStyle(2, 0x6dff9c, 0.95).strokeRect(q.x - e, q.y - e, e * 2, e * 2); } } // a dock: the thin pale ring of the Tab map, not the green square
    if (mark && p.name.toUpperCase() === mark && Math.hypot(q.x - b.x, q.y - b.y) < 40) return; // the mission mark already names this place ("MISSION  KOLGA"): its own label under it would name it twice (card space-game-night-cosmetics, finding D)
    const t = own(s.add.text(0, 0, p.name.toUpperCase(), uiFont(11, p.star ? '#ffe29a' : '#ffb454', FF))).setOrigin(0.5).setDepth(134); texts.push(t); items.push({ x: q.x, y: q.y, r: r + 4, w: t.width, h: t.height });
  });
  if (one) (bf.moments || []).forEach(m => { const q = X(m.at.x, m.at.y); items.push({ x: q.x, y: q.y, r: 13, w: 0, h: 0 }); }); // the numbered moments are marks the names keep clear of (after the names: their places are the names')
  if (items.length) { const at = mapPlace(items, F); texts.forEach((t, i) => t.setPosition(at[i].x, at[i].y)); }
  // the mission's own points
  const num = (p, label, color) => { if (!inF(p)) return; own(s.add.text(p.x, p.y - 12, label, uiFont(11, color, FF))).setOrigin(0.5).setDepth(135); };
  g.lineStyle(2, 0x7fe9ff, 0.9); Y.scan.forEach(p => { const q = X(p.x, p.y), r = Math.max(7, p.r * fit.s); ring(q, r); if (whole(q, r)) g.fillStyle(0x7fe9ff, 0.15).fillCircle(q.x, q.y, r); num({ x: q.x, y: q.y - r + 2 }, String(p.n), '#7fe9ff'); });
  Y.convoys.forEach(c => { const a = X(c.a.x, c.a.y), b = X(c.b.x, c.b.y), d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    g.lineStyle(2, 0xffb454, 0.9); for (let k = 0; k < d - 8; k += 14) { const q = campMapClip(a.x + ux * k, a.y + uy * k, a.x + ux * Math.min(d - 8, k + 8), a.y + uy * Math.min(d - 8, k + 8), F); if (q) g.lineBetween(q[0], q[1], q[2], q[3]); }
    if (inF(b)) g.fillStyle(0xffb454, 0.95).fillTriangle(b.x, b.y, b.x - ux * 12 - uy * 6, b.y - uy * 12 + ux * 6, b.x - ux * 12 + uy * 6, b.y - uy * 12 - ux * 6); });
  Y.caches.forEach(c => { const q = X(c.x, c.y); if (!inF(q)) return; g.fillStyle(0xffd37a, 0.95).fillPoints([{ x: q.x, y: q.y - 6 }, { x: q.x + 6, y: q.y }, { x: q.x, y: q.y + 6 }, { x: q.x - 6, y: q.y }], true); });
  Y.guards.forEach(gd => { const q = X(gd.x, gd.y); if (!inF(q)) return; g.lineStyle(2, 0xff7aa8, 0.95).lineBetween(q.x - 4, q.y - 4, q.x + 4, q.y + 4).lineBetween(q.x - 4, q.y + 4, q.x + 4, q.y - 4); });
  if (Y.mother) { const q = X(Y.mother.x, Y.mother.y); if (inF(q)) g.fillStyle(0xff7aa8, 0.95).fillPoints([{ x: q.x, y: q.y - 9 }, { x: q.x + 9, y: q.y }, { x: q.x, y: q.y + 9 }, { x: q.x - 9, y: q.y }], true); }
  Y.towers.forEach(t => { const q = X(t.x, t.y); g.lineStyle(2, 0xff9a3a, 0.8); ring(q, Math.max(10, t.r * fit.s)); });
  if (Y.relic) { const q = X(Y.relic.x, Y.relic.y); g.lineStyle(2, 0x7fe9ff, 0.9); ring(q, Math.max(8, Y.relic.r * fit.s)); }
  if (Y.defend) { const q = X(Y.defend.x, Y.defend.y); g.lineStyle(2, 0x6dff9c, 0.8); ring(q, Math.max(10, Y.defend.r * fit.s)); }
  // the route: from where you start to the mission's place (its distance and time are in the column at the right), cut to the glass
  if (!R.near) {
    g.lineStyle(2, 0xffffff, 0.75); const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    for (let k = 0; k < d; k += 12) { const q = campMapClip(a.x + (b.x - a.x) * k / d, a.y + (b.y - a.y) * k / d, a.x + (b.x - a.x) * Math.min(d, k + 7) / d, a.y + (b.y - a.y) * Math.min(d, k + 7) / d, F); if (q) g.lineBetween(q[0], q[1], q[2], q[3]); }
  }
  if (inF(a)) { g.fillStyle(0xffffff, 1).fillCircle(a.x, a.y, 4); g.lineStyle(1, 0xffffff, 0.8).strokeCircle(a.x, a.y, 8); } // you: the dot and ring (the label YOU is placed with the others, above)
  if (one) g.lineStyle(1.6, 0xe9b872, 1).strokeCircle(b.x, b.y, 15); else { g.lineStyle(3, AMBER, 1); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const x = b.x + sx * 14, y = b.y + sy * 14; g.beginPath(); g.moveTo(x, y - sy * 9); g.lineTo(x, y); g.lineTo(x - sx * 9, y); g.strokePath(); }); } // the mission's place: the amber brackets of the sector map (the one page: a thin gold ring, as the Tab map marks its goal)
  if (bf.one === true && typeof scrBriefMapExtras === 'function') scrBriefMapExtras(s, X, F, own); // the new look: the four numbered moments on the map
  own(s.add.text(F.x + F.w - 8, F.y + 8, uiText('camp.map.zoom', { pct: Math.round(bf.z * 100) }), uiFont(12, one ? '#8794ab' : '#7fe9ff', FF))).setOrigin(1, 0).setDepth(137); // the zoom and its keys, in the corner, as the Tab map says them
}
// the zoom moves: the map is drawn again at the new view (about the mission's place); the key line and the other screens are not touched
function campBriefZoomTo(s, z) {
  const bf = s.bf; if (!campBriefIsOpen(s) || bf.screen !== 0) return false;
  const v = campBriefView(bf.Y, bf.zoom, z, bf.fit, bf.z, bf.frame); if (v.z === bf.z) return false;
  bf.z = v.z; bf.fit = v.fit; campBriefPaintMap(s); return true;
}
// M: the next of the three views (the route, the mission's area, the whole system); the zoom goes back to 1
function campBriefZoomView(s) {
  const bf = s.bf; bf.zoom = campBriefZoomNext(bf.Y, bf.zoom); const v = campBriefView(bf.Y, bf.zoom, 1, undefined, undefined, bf.frame); bf.base = v.base; bf.fit = v.fit; bf.z = 1;
  campBriefPaintMap(s); campBriefPaintKeys(s);
}

// ---------- screen 2: what to do ----------
// a sprite of a picture: the game's own texture of that kind, at k times the size it has in the battle
function campBriefSprite(s, look, F) { // F: the new ship look's state for this picture (src/shiplookpic.js; card space-game-ship-look-e-panel-brief): with the switch on a ship is the flat-cut one of its usual side, the same texture the flight view has, with no tint
  if ((look === 'pod' || look === 'ore') && typeof campWorldPicKey === 'function' && campWorldPicKey(s, look)) return { key: campWorldPicKey(s, look), scale: 1, tint: 0 }; // the world look: the gold diamond in its ring, three pale shards (src/campworldobjects.js)
  if (look === 'pod' || look === 'rock' || look === 'ore') return { key: look === 'rock' ? (typeof slookRockKey === 'function' && slookRockKey(s, 'rock-0')) || 'asteroid' : look, scale: 1, tint: 0 }; // a rock: the flat-cut one while the look is on (src/shiplookrock.js, card space-game-b3-e-flat-rocks), else the boulder
  const L = typeof CAMP_LOOK !== 'undefined' ? CAMP_LOOK[look] : null; if (!L) return null;
  const np = typeof slookPic === 'function' ? slookPic(s, look, null, F) : null; if (np) return { key: np.key, scale: np.scale, tint: 0, np: true };
  const key = L.art ? campShipTexture(s, L.art) : L.tex; return { key, scale: L.scale, tint: L.tint || 0 };
}
// the parts of a picture at (cx, cy) in a box scaled by sc: the shapes into the glass's graphics, the sprites as images over them
function campBriefDrawPic(s, parts, cx, cy, sc) {
  const bf = s.bf, g = bf.g, T = (p, a) => a === 'x' ? cx + p.x * sc : cy + p.y * sc, F = typeof slookFrame === 'function' && s.camp ? slookFrame(s) : null; // F: the switch asked once for the picture, not for each ship in it
  parts.forEach(p => {
    const x = T(p, 'x'), y = T(p, 'y');
    if (p.look) {
      const sp = campBriefSprite(s, p.look, F); if (!sp || (s.textures && s.textures.exists && !s.textures.exists(sp.key))) return;
      const im = s.add.image(x, y, sp.key); im.setScale(sp.scale * p.k * sc).setRotation(p.rot).setScrollFactor(0).setDepth(135); if (!sp.np && (p.tint || sp.tint)) im.setTint(p.tint || sp.tint); bf.pics.push(im);
    } else if (p.ring) {
      if (p.fill) g.fillStyle(p.color, p.a).fillCircle(x, y, p.r * sc);
      else if (p.dash) { g.lineStyle(1.5, p.color, p.a); for (let a = 0; a < 6.283; a += 0.5) { g.beginPath(); g.arc(x, y, p.r * sc, a, a + 0.28); g.strokePath(); } } // a dashed ring, in arcs
      else g.lineStyle(2, p.color, p.a).strokeCircle(x, y, p.r * sc);
    } else if (p.disc) g.fillStyle(p.color, 0.85).fillCircle(x, y, p.r * sc);
    else if (p.line) g.lineStyle(p.w || 2, p.color, 0.9).lineBetween(cx + p.x0 * sc, cy + p.y0 * sc, cx + p.x1 * sc, cy + p.y1 * sc);
    else if (p.arrow) { const x0 = cx + p.x0 * sc, y0 = cy + p.y0 * sc, x1 = cx + p.x1 * sc, y1 = cy + p.y1 * sc, d = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / d, uy = (y1 - y0) / d; g.lineStyle(2, p.color, 0.95).lineBetween(x0, y0, x1, y1); g.fillStyle(p.color, 0.95).fillTriangle(x1, y1, x1 - ux * 9 * sc - uy * 5 * sc, y1 - uy * 9 * sc + ux * 5 * sc, x1 - ux * 9 * sc + uy * 5 * sc, y1 - uy * 9 * sc - ux * 5 * sc); }
    else if (p.reticle) { const r = p.r * sc; g.lineStyle(2, 0xff7aa8, 0.95).strokeCircle(x, y, r); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => g.lineBetween(x + dx * (r - 4 * sc), y + dy * (r - 4 * sc), x + dx * (r + 6 * sc), y + dy * (r + 6 * sc))); }
    else if (p.clock) { const r = p.r * sc; g.lineStyle(2, 0xffd37a, 0.95).strokeCircle(x, y, r); g.lineBetween(x, y, x, y - r * 0.7); g.lineBetween(x, y, x + r * 0.5, y + r * 0.2); g.fillStyle(0xffd37a, 1).fillCircle(x, y, 2); }
    else if (p.bar) { const w = p.w * sc, h = p.h * sc, bx = cx + p.x * sc, by = cy + p.y * sc; g.lineStyle(1, 0x8fb4c9, 0.9).strokeRect(bx, by, w, h); g.fillStyle(p.color, 0.85).fillRect(bx + 1, by + 1, (w - 2) * p.f, h - 2); }
  });
}
function campBriefPaintWhat(s) {
  const bf = s.bf, St = bf.steps, G = CAMPBRIEF_COL.goals, Bn = CAMPBRIEF_COL.bonus, K = CAMPBRIEF.pic, g = bf.g, top = CAMPBRIEF.text.top;
  const frames = [], box = (x, y, w, h) => { g.fillStyle(0x03070f, 1).fillRect(x, y, w, h); frames.push([x, y, w, h]); }; // the frames of the pictures are drawn after the pictures (a frame drawn first lost its bottom edge once a ring was drawn after it)
  const gw = Math.round(K.w * K.goal), gh = Math.round(K.h * K.goal), bw = Math.round(K.w * K.bonus), bh = Math.round(K.h * K.bonus);
  campBriefFlow(s, G, top, uiText('camp.bf.goals'), 14, '#38e1ff'); campBriefFlow(s, Bn, top, uiText('camp.ui.bonushead'), 14, '#ffd37a');
  St.goals.forEach((st, k) => {
    const y = top + 32 + k * (gh + 22);
    box(G.x, y, gw, gh); campBriefDrawPic(s, st.parts, G.x + gw / 2, y + gh / 2, K.goal);
    campBriefOwn(s, s.add.text(G.x + 10, y + 6, String(st.n), uiFont(18, '#ffd37a', { fontStyle: 'bold' })));
    campBriefFlow(s, { x: G.x + gw + 22, w: G.w - gw - 22 }, y + gh / 2 - 16, st.text, 20, '#e8f6ff');
  });
  St.bonus.forEach((st, k) => {
    const y = top + 32 + k * (bh + 14);
    box(Bn.x, y, bw, bh); campBriefDrawPic(s, st.parts, Bn.x + bw / 2, y + bh / 2, K.bonus);
    campBriefFlow(s, { x: Bn.x + bw + 16, w: Bn.w - bw - 16 }, y + bh / 2 - 10, '+' + st.points + '  ' + st.text, 15, '#ffd37a');
  });
  g.lineStyle(1, CYAN, 0.45); frames.forEach(f => g.strokeRect(f[0] + 0.5, f[1] + 0.5, f[2] - 1, f[3] - 1));
}

// ---------- screen 3: how ----------
function campBriefPaintHow(s) {
  const bf = s.bf, A = CAMPBRIEF_COL.how, C = CAMPBRIEF_COL.foes, g = bf.g; let y = CAMPBRIEF.text.top, z = y;
  y = campBriefFlow(s, A, y, uiText('camp.bf.walk'), 14, '#38e1ff');
  bf.walk.steps.forEach((t, k) => { y = campBriefFlow(s, A, y, (k + 1) + '. ' + t, 15, '#cfefff'); }); y += 12;
  y = campBriefFlow(s, A, y, uiText('camp.bf.keyshead'), 14, '#38e1ff'); y += 4;
  bf.keysFor.forEach(row => { // a key is a cap (a dark tile with its letters) and a line of what it does
    const w = Math.max(34, row.k.join(' ').length * 9 + 14);
    g.fillStyle(0x0a1c2e, 1).fillRoundedRect(A.x, y - 2, w, 24, 5); g.lineStyle(1, CYAN, 0.7).strokeRoundedRect(A.x, y - 2, w, 24, 5);
    campBriefOwn(s, s.add.text(A.x + w / 2, y + 10, row.k.join(' '), uiFont(13, '#ffffff', { fontStyle: 'bold' }))).setOrigin(0.5);
    campBriefOwn(s, s.add.text(A.x + 96, y + 2, row.text, uiFont(14, '#e8f6ff', { wordWrap: { width: A.w - 96 } })));
    y += 30;
  });
  z = campBriefFlow(s, C, z, uiText('camp.bf.enemies'), 14, '#ff9ec0'); z = campBriefFlow(s, C, z, bf.foes.line, 15, '#ffd3e1') + 14;
  z = campBriefFlow(s, C, z, uiText('camp.bf.readiness'), 14, '#38e1ff'); bf.ready.lines.forEach(l => { z = campBriefFlow(s, C, z, l, 15, '#e8f6ff'); }); z += 6;
  bf.ready.warnings.forEach(w => { z = campBriefFlow(s, C, z, '! ' + w, 15, '#ffb454'); });
}

// a key while the briefing is open: it takes every one (the room under it does not move)
function campBriefKey(s, code, repeat) {
  if (!campBriefIsOpen(s)) return false;
  const bf = s.bf, K = CAMPBRIEF, zk = typeof campZoomKey === 'function' ? campZoomKey(code) : null;
  if (bf.one === true && typeof scrBriefKey === 'function') return scrBriefKey(s, code, repeat); // the new look's one page
  if (bf.plan) return campWalkKey(s, code, repeat); // the walking map has its own stops (campbriefwalkdraw.js): the same keys, on stops
  if (zk) { if (bf.screen === 0) campBriefZoomTo(s, zk.reset ? 1 : camzoomKey(bf.z, zk.dir, !!repeat, K.zoom.min, K.zoom.max)); return true; } // + - 0: the map's zoom (the same keys as the Tab map's, src/campzoom.js)
  if (repeat) return true; // a held key repeats only for the zoom
  const nav = campBriefNav(bf.screen, code);
  if (nav.act === 'close') { campBriefClose(s); return true; }
  if (nav.act === 'launch') { campBriefClose(s); if (typeof s.launch === 'function') s.launch(); return true; }
  if (nav.screen !== bf.screen) { bf.screen = nav.screen; campBriefPaint(s); if (typeof sfx === 'function') sfx('tick'); return true; }
  if (code === 'KeyM' && bf.screen === 0) { campBriefZoomView(s); if (typeof sfx === 'function') sfx('tick'); }
  return true;
}
// the voice pack: the first step of a mission's walkthrough is read once when the briefing opens, so camp.bf.<level>.<mission>.w1 is a spoken line of the ship's, recorded once: it is the family 'campaign.walk' of VOICEPACK_FAMILIES (src/voicepack.js), and the other steps are silent there (for the eyes)
