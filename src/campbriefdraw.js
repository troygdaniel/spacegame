// ---------- Campaign: the big briefing, the drawing (card space-game-campaign-briefing) ----------
// The Phaser half of src/campbrief.js, which says WHAT is on the screen. A modal glass over the ready room: at the left the system map, drawn with the Tab map's own pieces (campMapFit and campMapPoint for the
// scale, mapGridStep for the grid, campMapArcs for the rings round the star and campMapDotsIn for the belts as rocks, mapPlace for the names, hudPanel and hudGlowPath for the glass), the mission's place marked, your
// route from where you start with its distance and time on regular and on Fast, and the objective points; at the right, in two columns, the mission and its goals and the walkthrough, then the route, the enemies and your
// readiness with its warnings. It opens at once when a mission is picked on the board, and the ship reads the first line of the walkthrough once (the voice's own settings rule: muted, off or no voice is silent).
//   campBriefOpen(s)         open the briefing of the mission the room's Launch would fly (campHubTarget): false when there is none
//   campBriefClose(s)        take it away
//   campBriefKey(s, code)    a key while it is open: Enter and L launch, Esc closes, Left and Right page the walkthrough, M zooms the map between the mission's area and the whole system; every other key is the screen's (nothing under it moves)
//   campBriefIsOpen(s)       is it open
const CAMPBRIEF_COL = { a: { x: 646, w: 336 }, b: { x: 1002, w: 216 } }; // px: the two text columns at the right of the map (the map is CAMPBRIEF.frame, which ends at 622)
const campBriefIsOpen = s => !!s && !!s.bf && s.bf.open === true;
const campBriefHoldsM = game => !!(game && game.scene && typeof game.scene.getScenes === 'function' && game.scene.getScenes(true).some(campBriefIsOpen)); // meta.js: M mutes the sound everywhere, except while the briefing is up: there it zooms the map
const campBriefProj = (fit, F) => (x, y) => campMapPoint(fit, F, x, y);

function campBriefOpen(s) {
  if (!s || !s.add || campBriefIsOpen(s)) return false;
  const t = campHubTarget(s.P, s.hub), Y = campBriefLayers(t.level, t.i); if (!Y) return false;
  const K = CAMPBRIEF, P = K.panel, objs = [], put = (o, d) => { o.setScrollFactor(0).setDepth(130 + (d || 0)); objs.push(o); return o; };
  const bf = s.bf = { open: true, objs, t, Y, whole: false, page: 0, walk: campBriefWalk(t.level, t.i), ready: campBriefReady(s.P, t.level, t.i), foes: campBriefEnemies(t.level, t.i), brief: campHubBrief(s.P, t.level, t.i), route: campBriefRoute(Y), map: [], text: [] };
  put(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.97).setInteractive(), 0); // a veil that takes the clicks
  hudPanel(put(s.add.graphics(), 1), P.x, P.y, P.w, P.h, 22, 0.98, s.accent ? parseInt(s.accent.slice(1), 16) : CYAN);
  bf.g = put(s.add.graphics(), 2);
  campBriefPaintMap(s);
  campBriefPaintText(s);
  const keys = put(s.add.text(P.x + P.w / 2, P.y + P.h - 20, uiText('camp.bf.keys') + '    ' + (bf.walk.steps.length > K.per ? uiText('camp.bf.keys2') + '    ' : '') + uiText('camp.bf.zoomwhole'), uiFont(13, '#bfe9ff')).setOrigin(0.5), 4); bf.keys = keys;
  if (typeof sfx === 'function') sfx('uiOpen');
  if (typeof shipcompSay === 'function' && bf.walk.data && bf.walk.steps[0]) { try { shipcompSay(bf.walk.steps[0]); } catch (e) { /* the voice never stops the screen */ } } // the ship reads the first step once; the voice's own settings (muted, off, no voice) decide if it is heard
  return true;
}
function campBriefClose(s) {
  if (!campBriefIsOpen(s)) return false;
  s.bf.objs.forEach(o => { try { o.destroy(); } catch (e) { /* gone with the scene */ } }); s.bf.map.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); s.bf.text.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } });
  s.bf = null; return true;
}

// the map, once and again at a zoom: the grid, the rings and the belts, the places, the objective points, the route, you
function campBriefPaintMap(s) {
  const bf = s.bf, Y = bf.Y, F = CAMPBRIEF.frame, g = bf.g; g.clear(); bf.map.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); bf.map = [];
  const fit = campMapFit(campBriefBounds(Y, bf.whole), F, bf.whole ? 0.06 : CAMPBRIEF.pad), X = (x, y) => campBriefProj(fit, F)(x, y), inF = p => p.x >= F.x && p.x <= F.x + F.w && p.y >= F.y && p.y <= F.y + F.h;
  const own = o => { o.setScrollFactor(0).setDepth(133); bf.map.push(o); return o; };
  g.fillStyle(0x03070f, 1); g.fillRect(F.x, F.y, F.w, F.h);
  const w0 = fit.cx - F.w / 2 / fit.s, w1 = fit.cx + F.w / 2 / fit.s, h0 = fit.cy - F.h / 2 / fit.s, h1 = fit.cy + F.h / 2 / fit.s, gs = mapGridStep(F.w / fit.s, 1e12);
  g.lineStyle(1, CYAN, 0.12);
  for (let w = Math.ceil(w0 / gs) * gs; w < w1; w += gs) { const a = X(w, 0).x; g.lineBetween(a, F.y, a, F.y + F.h); }
  for (let w = Math.ceil(h0 / gs) * gs; w < h1; w += gs) { const b = X(0, w).y; g.lineBetween(F.x, b, F.x + F.w, b); }
  // the rings round the star and the belts as rocks (src/campsol.js): the same as the Tab map
  const wd = typeof campWorldOf === 'function' ? campWorldOf(Y.level) : null;
  if (wd) {
    const sp = X(wd.star.x, wd.star.y), proj = (x, y) => X(x, y);
    g.lineStyle(1, 0x7fa8c8, 0.26);
    wd.rings.forEach(r => campMapArcs(sp.x, sp.y, r * fit.s, F).forEach(pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokePath(); }));
    g.fillStyle(0xb9a37a, 0.8); wd.bands.forEach(b => campMapDotsIn(b.dots, proj, F).forEach(p => g.fillRect(p.x - 0.5, p.y - 0.5, 1.7, 1.7)));
    wd.clusters.forEach(c => campMapDotsIn(c.dots, proj, F).forEach(p => g.fillRect(p.x - 0.5, p.y - 0.5, 1.7, 1.7)));
  }
  hudGlowPath(g, [[F.x, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.h], [F.x, F.y + F.h]], CYAN, 0.85, true, 1.25);
  // the places: a disc and a name (the names are put where they touch nothing: mapPlace); the outposts wear the Tab map's green frame
  const items = [], texts = [];
  Y.places.forEach(p => {
    const q = X(p.x, p.y); if (!inF(q)) return; const r = Math.max(p.star ? 7 : 4, p.r * fit.s);
    g.fillStyle(p.star ? 0xffe29a : 0xb9a37a, 0.85).fillCircle(q.x, q.y, r); g.lineStyle(1, p.star ? 0xffe29a : 0xb9a37a, 0.5).strokeCircle(q.x, q.y, r + 3);
    if (p.outpost) { const e = r + 8; g.lineStyle(2, 0x6dff9c, 0.95).strokeRect(q.x - e, q.y - e, e * 2, e * 2); }
    const t = own(s.add.text(0, 0, p.name.toUpperCase(), uiFont(11, p.star ? '#ffe29a' : '#ffb454'))).setOrigin(0.5).setDepth(134); texts.push(t); items.push({ x: q.x, y: q.y, r: r + 4, w: t.width, h: t.height });
  });
  if (items.length) { const at = mapPlace(items, F); texts.forEach((t, i) => t.setPosition(at[i].x, at[i].y)); }
  // the mission's own points
  const num = (p, label, color) => { if (!inF(p)) return; own(s.add.text(p.x, p.y - 12, label, uiFont(11, color))).setOrigin(0.5).setDepth(135); };
  g.lineStyle(2, 0x7fe9ff, 0.9); Y.scan.forEach(p => { const q = X(p.x, p.y), r = Math.max(7, p.r * fit.s); g.strokeCircle(q.x, q.y, r); g.fillStyle(0x7fe9ff, 0.15).fillCircle(q.x, q.y, r); num({ x: q.x, y: q.y - r + 2 }, String(p.n), '#7fe9ff'); });
  Y.convoys.forEach(c => { const a = X(c.a.x, c.a.y), b = X(c.b.x, c.b.y), d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    g.lineStyle(2, 0xffb454, 0.9); for (let k = 0; k < d - 8; k += 14) g.lineBetween(a.x + ux * k, a.y + uy * k, a.x + ux * Math.min(d - 8, k + 8), a.y + uy * Math.min(d - 8, k + 8));
    g.fillStyle(0xffb454, 0.95).fillTriangle(b.x, b.y, b.x - ux * 12 - uy * 6, b.y - uy * 12 + ux * 6, b.x - ux * 12 + uy * 6, b.y - uy * 12 - ux * 6); });
  Y.caches.forEach(c => { const q = X(c.x, c.y); g.fillStyle(0xffd37a, 0.95).fillPoints([{ x: q.x, y: q.y - 6 }, { x: q.x + 6, y: q.y }, { x: q.x, y: q.y + 6 }, { x: q.x - 6, y: q.y }], true); });
  Y.guards.forEach(gd => { const q = X(gd.x, gd.y); g.lineStyle(2, 0xff7aa8, 0.95).lineBetween(q.x - 4, q.y - 4, q.x + 4, q.y + 4).lineBetween(q.x - 4, q.y + 4, q.x + 4, q.y - 4); });
  if (Y.mother) { const q = X(Y.mother.x, Y.mother.y); g.fillStyle(0xff7aa8, 0.95).fillPoints([{ x: q.x, y: q.y - 9 }, { x: q.x + 9, y: q.y }, { x: q.x, y: q.y + 9 }, { x: q.x - 9, y: q.y }], true); }
  Y.towers.forEach(t => { const q = X(t.x, t.y); g.lineStyle(2, 0xff9a3a, 0.8).strokeCircle(q.x, q.y, Math.max(10, t.r * fit.s)); });
  if (Y.relic) { const q = X(Y.relic.x, Y.relic.y); g.lineStyle(2, 0x7fe9ff, 0.9).strokeCircle(q.x, q.y, Math.max(8, Y.relic.r * fit.s)); }
  if (Y.defend) { const q = X(Y.defend.x, Y.defend.y); g.lineStyle(2, 0x6dff9c, 0.8).strokeCircle(q.x, q.y, Math.max(10, Y.defend.r * fit.s)); }
  // the route: from where you start to the mission's place, with its distance and its time on regular speed and on Fast
  const a = X(Y.start.x, Y.start.y), b = X(Y.focus.x, Y.focus.y), R = bf.route;
  if (!R.near) {
    g.lineStyle(2, 0xffffff, 0.75); const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; for (let k = 0; k < d; k += 12) g.lineBetween(a.x + (b.x - a.x) * k / d, a.y + (b.y - a.y) * k / d, a.x + (b.x - a.x) * Math.min(d, k + 7) / d, a.y + (b.y - a.y) * Math.min(d, k + 7) / d);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if (!bf.whole && inF(mid)) own(s.add.text(mid.x, mid.y - 10, uiText('camp.bf.route', { km: R.km, regular: R.regular, fast: R.fast }), uiFont(11, '#ffffff', { backgroundColor: '#03070f', padding: { x: 3, y: 1 } }))).setOrigin(0.5).setDepth(136);
  }
  g.fillStyle(0xffffff, 1).fillCircle(a.x, a.y, 4); g.lineStyle(1, 0xffffff, 0.8).strokeCircle(a.x, a.y, 8); own(s.add.text(a.x, a.y + 16, uiText('camp.bf.you'), uiFont(11, '#ffffff'))).setOrigin(0.5).setDepth(136);
  g.lineStyle(3, AMBER, 1); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const x = b.x + sx * 14, y = b.y + sy * 14; g.beginPath(); g.moveTo(x, y - sy * 9); g.lineTo(x, y); g.lineTo(x - sx * 9, y); g.strokePath(); }); // the mission's place: the amber brackets of the sector map
  const below = b.y + 32 < F.y + F.h - 8; // the mission's label sits under its brackets (the place names are over their places), or over them at the bottom of the map
  own(s.add.text(b.x, below ? b.y + 30 : b.y - 28, uiText('camp.bf.mission') + (Y.focus.label ? '  ' + Y.focus.label.toUpperCase() : ''), uiFont(11, '#ffb454', { fontStyle: 'bold' }))).setOrigin(0.5).setDepth(136);
}

// the words at the right: the mission, the goals, the walkthrough (column A); the route, the enemies, the readiness and its warnings (column B)
function campBriefPaintText(s) {
  const bf = s.bf, B = bf.brief, A = CAMPBRIEF_COL.a, C = CAMPBRIEF_COL.b, top = CAMPBRIEF.text.top, own = o => { o.setScrollFactor(0).setDepth(134); bf.text.push(o); return o; };
  const flow = (col, y, text, size, color, o) => { const t = own(s.add.text(col.x, y, text, uiFont(size, color, Object.assign({ wordWrap: { width: col.w } }, o || {})))); return y + t.height + 4; };
  let y = top; const rp = bf.t.replay === true, Hd = CAMPBRIEF.head;
  own(s.add.text(Hd.x, Hd.y, uiText(rp ? 'camp.hub.replay.head' : 'camp.hub.brief.head', { n: B.n, of: B.of, title: B.title }), uiFont(19, rp ? '#6dff9c' : '#38e1ff', { fontStyle: 'bold' }))).setOrigin(0, 0.5); // the heading runs across the top, over the map and the columns
  own(s.add.text(Hd.right, Hd.y, uiText('camp.hub.brief.kind', { kind: B.kindText, par: B.par }), uiFont(13, '#8fb4c9'))).setOrigin(1, 0.5);
  B.lines.forEach(l => { y = flow(A, y, l, 14, '#e8f6ff'); }); y += 6;
  y = flow(A, y, uiText('camp.bf.goals'), 14, '#38e1ff');
  B.objectives.slice(0, 4).forEach(o => { y = flow(A, y, '- ' + o, 14, '#e8f6ff'); });
  y += 4; y = flow(A, y, uiText('camp.ui.bonushead'), 14, '#ffd37a');
  B.bonus.slice(0, 5).forEach(b => { y = flow(A, y, '+' + b.points + '  ' + b.text, 14, '#ffd37a'); }); y += 6;
  const pg = campBriefPage(bf.walk.steps, bf.page); bf.page = pg.page;
  y = flow(A, y, pg.pages > 1 ? uiText('camp.bf.walkpage', { p: pg.page + 1, pp: pg.pages }) : uiText('camp.bf.walk'), 14, '#38e1ff');
  pg.items.forEach((t, k) => { y = flow(A, y, (pg.page * CAMPBRIEF.per + k + 1) + '. ' + t, 14, '#cfefff'); });
  let z = top; const R = bf.route;
  z = flow(C, z, R.near ? uiText('camp.bf.routenear') : uiText('camp.bf.route', { km: R.km, regular: R.regular, fast: R.fast }), 14, '#ffffff') + 8;
  z = flow(C, z, uiText('camp.bf.enemies'), 14, '#ff9ec0'); z = flow(C, z, bf.foes.line, 14, '#ffd3e1') + 8;
  z = flow(C, z, uiText('camp.bf.readiness'), 14, '#38e1ff'); bf.ready.lines.forEach(l => { z = flow(C, z, l, 14, '#e8f6ff'); }); z += 6;
  bf.ready.warnings.forEach(w => { z = flow(C, z, '! ' + w, 14, '#ffb454'); });
}
// the walkthrough is paged: only its text is made again
function campBriefRepaintText(s) { s.bf.text.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); s.bf.text = []; campBriefPaintText(s); }

// a key while the briefing is open: it takes every one (the room under it does not move)
function campBriefKey(s, code) {
  if (!campBriefIsOpen(s)) return false;
  const bf = s.bf;
  if (code === 'Escape') { campBriefClose(s); return true; }
  if (code === 'Enter' || code === 'NumpadEnter' || code === 'KeyL') { campBriefClose(s); if (typeof s.launch === 'function') s.launch(); return true; }
  if (code === 'ArrowLeft' || code === 'ArrowRight') { const pg = campBriefPage(bf.walk.steps, bf.page + (code === 'ArrowRight' ? 1 : -1)); if (pg.page !== bf.page) { bf.page = pg.page; campBriefRepaintText(s); if (typeof sfx === 'function') sfx('tick'); } return true; }
  if (code === 'KeyM') { bf.whole = !bf.whole; campBriefPaintMap(s); if (bf.keys) bf.keys.setText(uiText('camp.bf.keys') + '    ' + (bf.walk.steps.length > CAMPBRIEF.per ? uiText('camp.bf.keys2') + '    ' : '') + uiText(bf.whole ? 'camp.bf.zoomarea' : 'camp.bf.zoomwhole')); if (typeof sfx === 'function') sfx('tick'); return true; }
  return true;
}
// the voice pack: the first step of a mission's walkthrough is read once when the briefing opens, so it is a line of the ship's, recorded once (tools/voicepack.mjs reads this at run time; the other steps are for the eyes)
if (typeof voicePackSource === 'function' && typeof vpKeys === 'function') voicePackSource({ id: 'campaign.walk', voice: 'ship', keys: () => vpKeys(/^camp\.bf\.\d+\.\d+\.w1$/) });
