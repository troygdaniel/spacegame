// ---------- Campaign map: the drawing (card space-game-campaign-map; Troy, 20 Nov 2026) ----------
// The Phaser half of src/campmap.js, which says WHAT is on the map and where it fits. Three functions, called by the Campaign scene (src/campaignscene.js):
//   campMapInstall(s)  once, in create: Tab opens the map over the battle, or closes it       campMapPaint(s, time)   every frame while it is open       campMapClose(s)   Esc, or a card coming up
// It reuses the sector map's (src/map.js) own pieces rather than a drawing system of its own: mapPlace puts the names of the places where they touch nothing, mapGridStep
// chooses the grid, hudPanel and hudGlowPath are the glass panel and the glowing frame, and the colours are the radar's (campDotColor). The battle is NOT paused: the scene keeps
// stepping the sim and every key but Esc and Tab still does what it does, so the orders (1 to 5), the strip (I) and the voice (U) work from the map.
// Nothing here uses a Phaser feature the Campaign scene does not already use (no mask: a ship outside the frame is drawn on its edge, as the radar draws it on the rim).
const CAMPMAP_PANEL = { x: 70, y: 35, w: 1140, h: 650 }; // the glass panel: the sector map's own size and place (src/map.js)
const CAMPMAP_SIDE = { x: 925, y: 424, step: 24, rows: 8, destY: 166, listY: 192, listStep: 22, hintY: 398 }; // the column on the right: the objective, where you are flying, the list to pick from (card space-game-campaign-navigate), then the legend

const CAMPMAP_PINNED = ['carrier', 'mother', 'convoy']; // the marks that are drawn on the edge of the frame when they are past it and the map is zoomed in

function campMapToggle(s) { if (s.mp) campMapClose(s); else campMapOpen(s); }

// Tab is read on the window, not through the scene's keyboard: Long Haul's own Tab handler (installMap, src/map.js) calls preventDefault on every Tab, and Phaser's keyboard
// drops a key event that has been default-prevented. The listener is the scene's: made in create, taken off when the scene shuts down. target: the window (a test passes its own)
function campMapInstall(s, target) {
  const w = target || (typeof window !== 'undefined' ? window : null); if (!w || !w.addEventListener) return;
  const typing = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); // the command strip's box: Tab there is not the map
  const on = e => {
    if (!e || e.code !== CAMPMAP.key || e.repeat || typing(e.target)) return;
    if (s.mp) { campMapClose(s); return; }
    if (s.mode === 'play' && !s.leaving && !s.panel && !s.docked) campMapOpen(s); // only in the battle: not over the story, the pick, the pause, the end, or the dock's ready room (the scene is paused under it)
  };
  w.addEventListener('keydown', on);
  const off = () => { try { w.removeEventListener('keydown', on); } catch (e) { /* gone */ } };
  if (s.events && s.events.once) { s.events.once('shutdown', off); s.events.once('destroy', off); }
  return off;
}

function campMapClose(s) {
  if (!s || !s.mp) return;
  if (s.mp.onPointer && s.input && s.input.off) { try { s.input.off('pointerdown', s.mp.onPointer); } catch (e) { /* gone */ } }
  if (s.mp.onWheel && s.input && s.input.off) { try { s.input.off('wheel', s.mp.onWheel); } catch (e) { /* gone */ } }
  s.mp.objs.forEach(o => { try { o.destroy(); } catch (e) { /* already gone with the scene */ } });
  s.mp = null;
}

function campMapOpen(s) {
  if (s.mp || !s.camp) return;
  const C = s.camp, F = CAMPMAP.frame, P = CAMPMAP_PANEL, L = (C.L || CAMP.levels[C.level]);
  const base = campMapFit(campMapBounds(C.level, false), F);
  const mp = s.mp = { objs: [], whole: false, nameObjs: [], base, fit: Object.assign({}, base), z: 1, zWant: 1, namesZ: 1, tAt: null, userSel: false, leg: [] }; // base: the level fitted to the frame; fit: what is drawn and clicked through, the base at zoom z (src/campzoom.js, campMapView)
  mp.fire = campFireNew(); // the fight on the map (src/campmapfire.js): a pool of marks made once, per open map; the scene feeds it while the map is open
  const own = o => { o.setScrollFactor(0); mp.objs.push(o); return o; };
  own(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.84)).setDepth(150);
  hudPanel(own(s.add.graphics()).setDepth(151), P.x, P.y, P.w, P.h, 20, 0.97, CYAN);
  mp.g = own(s.add.graphics()).setDepth(152);
  own(s.add.text(F.x, 46, uiText('camp.map.title', { n: C.level, name: L.name }), uiFont(24, '#38e1ff', { letterSpacing: 2 }))).setDepth(154);
  own(s.add.text(F.x, 640, uiText('camp.map.footer'), uiFont(14, '#5b7a92'))).setDepth(154);
  mp.zoomText = own(s.add.text(F.x + F.w, 46, '', uiFont(14, '#7fe9ff'))).setOrigin(1, 0).setDepth(154); // the zoom level and its keys, in the corner (card space-game-campaign-zoom)
  mp.across = own(s.add.text(F.x + F.w, 640, '', uiFont(14, '#5b7a92'))).setOrigin(1, 0).setDepth(154); // the area or the whole system, how wide, and Z (the footer is on the left: 410 px, this 260)
  mp.obj = own(s.add.text(CAMPMAP_SIDE.x, F.y, '', uiFont(15, '#ffffff', { wordWrap: { width: 230 }, lineSpacing: 4 }))).setDepth(154);
  // pick and fly (card space-game-campaign-navigate): the list is the Long Haul nav panel's idea (src/navpanel.js: W S choose, Enter flies there, X clears) on the one list the map and the keys share
  mp.dest = own(s.add.text(CAMPMAP_SIDE.x, CAMPMAP_SIDE.destY, '', uiFont(14, '#7fe9ff', { wordWrap: { width: 250 } }))).setDepth(154);
  mp.list = []; for (let i = 0; i < CAMP.nav.list; i++) mp.list.push(own(s.add.text(CAMPMAP_SIDE.x, CAMPMAP_SIDE.listY + i * CAMPMAP_SIDE.listStep, '', uiFont(14, '#9fe9ff'))).setOrigin(0, 0.5).setDepth(154));
  own(s.add.text(CAMPMAP_SIDE.x, CAMPMAP_SIDE.hintY, uiText('camp.map.keys'), uiFont(13, '#5b7a92'))).setDepth(154);
  mp.goalText = own(s.add.text(0, 0, uiText('camp.map.goalmark'), uiFont(12, '#ffd37a'))).setOrigin(0.5).setDepth(154);
  mp.routeText = own(s.add.text(0, 0, '', uiFont(12, '#ffd37a'))).setOrigin(0.5).setDepth(154);
  mp.rows = []; mp.rowsAt = -1e9; mp.selId = ''; mp.setId = ''; mp.flewId = '';
  if (C.nav && C.nav.on) { mp.setId = mp.flewId = C.nav.of || C.nav.id; mp.selId = mp.setId; } // a trip is on when the map is opened: its place is set again, with the buttons (Fly or Fast marked ON), and chosen in the list
  mp.btnFly = own(s.add.text(0, 0, '', uiFont(13, '#ffffff', { backgroundColor: '#0a3a4a', padding: { x: 7, y: 3 } }))).setDepth(156).setVisible(false); // the two small buttons by a place you have set (card space-game-map-click-fly)
  mp.btnFast = own(s.add.text(0, 0, '', uiFont(13, '#ffffff', { backgroundColor: '#0a3a4a', padding: { x: 7, y: 3 } }))).setDepth(156).setVisible(false);
  mp.onPointer = p => campMapClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', mp.onPointer);
  mp.onWheel = (p, over, dx, dy) => campZoomMapWheel(mp, dy); // the wheel zooms the map while it is open (the scene holds the wheel back from the camera then: camzoomHold)
  if (s.input && s.input.on) s.input.on('wheel', mp.onWheel);
  for (let i = 0; i < CAMPMAP_SIDE.rows; i++) mp.leg.push(own(s.add.text(CAMPMAP_SIDE.x + 22, CAMPMAP_SIDE.y + i * CAMPMAP_SIDE.step, '', uiFont(14, '#9fe9ff', { wordWrap: { width: 235 } }))).setOrigin(0, 0.5).setDepth(154)); // a row is one line (27 letters at most, tests/campmap.mjs); the wrap is only a net
  campMapNames(s);
  campMapPaint(s, 0);
}

// the names of the places (and of the belts), put once for a view: they do not move, each on a free side of its mark. The area has the level's own places; Z adds the far ones (the whole system)
function campMapNames(s) {
  const mp = s.mp, C = s.camp, F = CAMPMAP.frame;
  mp.nameObjs.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); mp.nameObjs = [];
  const own = o => { o.setScrollFactor(0); mp.objs.push(o); mp.nameObjs.push(o); return o; };
  const inF = p => p.x >= F.x - 8 && p.x <= F.x + F.w + 8 && p.y >= F.y - 8 && p.y <= F.y + F.h + 8;
  const places = campMapMarks(C, mp.whole).filter(m => m.type === 'place' && (mp.z <= 1.01 || inF(campMapPoint(mp.fit, F, m.x, m.y)))), names = [], pts = [];
  const items = places.map(m => {
    const t = own(s.add.text(0, 0, m.name.toUpperCase(), uiFont(13, m.color === CAMPMAP.color.star ? '#ffe29a' : '#ffb454'))).setOrigin(0.5).setDepth(154), p = campMapPoint(mp.fit, F, m.x, m.y);
    names.push(t); pts.push(p); t.world = { x: m.x, y: m.y }; return { x: p.x, y: p.y, r: Math.max(5, m.r * mp.fit.s) + 4, w: t.width, h: t.height, side: 'below' };
  });
  const at = mapPlace(items, F); names.forEach((t, i) => { t.setPosition(at[i].x, at[i].y); t.off = { x: at[i].x - pts[i].x, y: at[i].y - pts[i].y }; }); // off: where the name sits from its mark, kept while the zoom eases
  const wd = typeof campWorldOf === 'function' ? campWorldOf(C.level) : null; // a belt is named where its ring is nearest the middle of the frame
  if (wd) wd.bands.forEach(b => {
    const mid = (b.r0 + b.r1) / 2, c = { x: F.x + F.w / 2, y: F.y + F.h / 2 }, st = campMapPoint(mp.fit, F, wd.star.x, wd.star.y), a = Math.atan2(c.y - st.y, c.x - st.x);
    const x = st.x + Math.cos(a) * mid * mp.fit.s, y = st.y + Math.sin(a) * mid * mp.fit.s;
    if (x > F.x + 30 && x < F.x + F.w - 30 && y > F.y + 10 && y < F.y + F.h - 10) own(s.add.text(x, y - 12, String(b.name.split(/,| \+/)[0]).toUpperCase(), uiFont(11, '#b9a37a'))).setOrigin(0.5).setDepth(154).band = true;
  });
}
// the names of the places follow their marks while the zoom eases (each keeps its place from its mark); the belts' names wait for it to arrive, and a place that has gone out of the frame is hidden
function campMapNamesMove(s) {
  const mp = s.mp, F = CAMPMAP.frame; if (!mp) return;
  mp.nameObjs.forEach(t => {
    if (!t.world) { t.setVisible(!t.band); return; }
    const p = campMapPoint(mp.fit, F, t.world.x, t.world.y), x = p.x + t.off.x, y = p.y + t.off.y;
    t.setPosition(x, y).setVisible(x >= F.x && x <= F.x + F.w && y >= F.y && y <= F.y + F.h);
  });
}
// Z: the whole system (every body and every ring, to scale) and back to the level's own area
function campMapWhole(s) {
  const mp = s.mp; if (!mp) return false;
  mp.whole = !mp.whole; mp.base = campMapFit(campMapBounds(s.camp.level, mp.whole), CAMPMAP.frame); mp.fit = Object.assign({}, mp.base); mp.z = mp.zWant = mp.namesZ = 1; campMapNames(s); mp.dirty = true; return true; // another extent: the zoom goes back to 1
}

function campMapPaint(s, time) {
  const mp = s.mp; if (!mp) return;
  const F = CAMPMAP.frame, dt = mp.tAt == null ? 0 : Math.max(0, Math.min(100, time - mp.tAt)); mp.tAt = time;
  const moving = campMapZoomStep(mp, F, dt); // the zoom eases to where + - 0 or the wheel put it, and mp.fit is the view at that zoom: everything below and every click reads it
  if (moving) campMapNamesMove(s); else if (mp.z === mp.zWant && mp.namesZ !== mp.z) { campMapNames(s); mp.namesZ = mp.z; } // the names move with the marks while it eases, and are placed afresh (clear of one another) when it has arrived
  mp.zoomText.setText(uiText('camp.map.zoom', { pct: Math.round(mp.zWant * 100) }));
  const C = s.camp, f = mp.fit, g = mp.g, col = CAMPMAP.color;
  const X = x => F.x + F.w / 2 + (x - f.cx) * f.s, Y = y => F.y + F.h / 2 + (y - f.cy) * f.s;
  const pin = (x, y) => ({ x: Math.max(F.x + 5, Math.min(F.x + F.w - 5, x)), y: Math.max(F.y + 5, Math.min(F.y + F.h - 5, y)) }); // a ship past the edge sits on the edge
  g.clear();
  g.fillStyle(0x03070f, 1); g.fillRect(F.x, F.y, F.w, F.h);
  // the grid, from the sector map's own step; the frame glows and has the amber brackets of the sector map
  const w0 = f.cx - F.w / 2 / f.s, w1 = f.cx + F.w / 2 / f.s, h0 = f.cy - F.h / 2 / f.s, h1 = f.cy + F.h / 2 / f.s, gs = mapGridStep(F.w / f.s, 1e12);
  g.lineStyle(1, CYAN, 0.12);
  for (let w = Math.ceil(w0 / gs) * gs; w < w1; w += gs) g.lineBetween(X(w), F.y, X(w), F.y + F.h);
  for (let w = Math.ceil(h0 / gs) * gs; w < h1; w += gs) g.lineBetween(F.x, Y(w), F.x + F.w, Y(w));
  hudGlowPath(g, [[F.x, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.h], [F.x, F.y + F.h]], CYAN, 0.85, true, 1.25);
  g.lineStyle(3, AMBER, 1);
  [[0, 0, 1, 1], [F.w, 0, -1, 1], [0, F.h, 1, -1], [F.w, F.h, -1, -1]].forEach(([ox, oy, sx, sy]) => {
    const x = F.x + ox - sx * 6, y = F.y + oy - sy * 6;
    g.beginPath(); g.moveTo(x, y + sy * 20); g.lineTo(x, y); g.lineTo(x + sx * 20, y); g.strokePath();
  });
  mp.across.setText(uiText(mp.whole ? 'camp.map.whole' : 'camp.map.local', { km: hudFmt(Math.round(F.w / f.s / CAMPMAP.km / 10) * 10) }));
  mp.obj.setText(typeof campObjective === 'function' ? campObjective(C) : '');
  // the rings round the star and the belts as rings of rocks (src/campsol.js; card space-game-campaign-sol), under everything else, clipped to the frame
  const wd = typeof campWorldOf === 'function' ? campWorldOf(C.level) : null;
  if (wd) {
    const sp = { x: X(wd.star.x), y: Y(wd.star.y) }, proj = (x, y) => ({ x: X(x), y: Y(y) });
    g.lineStyle(1, 0x7fa8c8, 0.24);
    wd.rings.forEach(r => campMapArcs(sp.x, sp.y, r * f.s, F).forEach(pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.strokePath(); }));
    g.fillStyle(0xb9a37a, 0.8);
    wd.bands.forEach(b => campMapDotsIn(b.dots, proj, F).forEach(p => g.fillRect(p.x - 0.5, p.y - 0.5, 1.7, 1.7)));
    wd.clusters.forEach(c => campMapDotsIn(c.dots, proj, F).forEach(p => g.fillRect(p.x - 0.5, p.y - 0.5, 1.7, 1.7)));
  }
  // the marks, the places first and the carrier last (campMapMarks sorts them)
  const marks = campMapMarks(C, mp.whole);
  marks.forEach(m => {
    if (mp.z > 1.01 && !CAMPMAP_PINNED.includes(m.type) && (X(m.x) < F.x || X(m.x) > F.x + F.w || Y(m.y) < F.y || Y(m.y) > F.y + F.h)) return; // zoomed in, what is out of the frame is not drawn on its edge (that was for the whole level); the carrier, the mothership and the convoys still are
    const p = pin(X(m.x), Y(m.y));
    if (m.type === 'place') { const r = Math.max(m.color === col.star ? 7 : 5, m.r * f.s); g.fillStyle(m.color, 0.85).fillCircle(p.x, p.y, r); g.lineStyle(1, m.color, 0.5).strokeCircle(p.x, p.y, r + 4); if (m.outpost) { const q = r + 9; g.lineStyle(2, 0x6dff9c, 0.95).strokeRect(p.x - q, p.y - q, q * 2, q * 2); g.fillStyle(0x6dff9c, 0.95).fillRect(p.x - 2, p.y - q - 5, 4, 4); } } // a friendly outpost (the level's `outposts`) wears a green frame and a beacon: the dock
    else if (m.type === 'relic') {
      const r = Math.max(7, m.r * f.s); g.lineStyle(2, col.relic, 0.55).strokeCircle(p.x, p.y, r);
      if (m.hold > 0) { g.lineStyle(4, col.relic, 1); g.beginPath(); g.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, m.hold)); g.strokePath(); }
    } else if (m.type === 'anomaly') { // unlabelled and warped: broken rings that wobble, and a question mark; decloaked, the cache's ring and a gold diamond
      const w = Date.now() / 500;
      if (m.shown) { g.lineStyle(1.5, m.color, 0.7).strokeCircle(p.x, p.y, Math.max(7, m.r * f.s)); g.fillStyle(m.color, 1).fillPoints([{ x: p.x, y: p.y - 5 }, { x: p.x + 5, y: p.y }, { x: p.x, y: p.y + 5 }, { x: p.x - 5, y: p.y }], true); }
      else { for (let i = 0; i < 3; i++) { const a0 = w * (i % 2 ? -1 : 1) + i * 2.1; g.lineStyle(1.5, m.color, 0.35 + 0.25 * Math.sin(w + i)); g.beginPath(); g.arc(p.x, p.y, 8 + i * 3.5 + Math.sin(w * 1.3 + i) * 1.2, a0, a0 + 1.7); g.strokePath(); }
        g.lineStyle(1.8, m.color, 0.95); g.beginPath(); g.arc(p.x, p.y - 2.5, 2.6, Math.PI, 2.35 * Math.PI); g.lineTo(p.x, p.y + 1.2); g.strokePath(); g.fillStyle(m.color, 1).fillCircle(p.x, p.y + 4.2, 0.9); }
    } else if (m.type === 'cache' || m.type === 'scan') g.fillStyle(m.color, 1).fillPoints([{ x: p.x, y: p.y - 4 }, { x: p.x + 4, y: p.y }, { x: p.x, y: p.y + 4 }, { x: p.x - 4, y: p.y }], true);
    else if (m.type === 'rock') g.fillStyle(m.color, 0.9).fillRect(p.x - 1.5, p.y - 1.5, 3, 3); // a rock: a small grey square
    else if (m.type === 'pickup') g.fillStyle(m.color, 1).fillPoints([{ x: p.x, y: p.y - 2.5 }, { x: p.x + 2.5, y: p.y }, { x: p.x, y: p.y + 2.5 }, { x: p.x - 2.5, y: p.y }], true); // ore lying about: a small gold diamond
    else if (m.type === 'tower') g.fillStyle(m.color, 1).fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    else if (m.type === 'convoy') {
      if (m.to) { const q = pin(X(m.to.x), Y(m.to.y)); g.lineStyle(1, m.color, 0.55).lineBetween(p.x, p.y, q.x, q.y); } // a line to where it is heading
      g.fillStyle(m.color, 1).fillCircle(p.x, p.y, 3.5);
    } else if (m.type === 'alien') g.fillStyle(m.color, 1).fillCircle(p.x, p.y, 2.5);
    else if (m.type === 'wing') g.fillStyle(m.color, 1).fillCircle(p.x, p.y, 2);
    else if (m.type === 'mother') g.fillStyle(m.color, 1).fillPoints([{ x: p.x, y: p.y - 7 }, { x: p.x + 7, y: p.y }, { x: p.x, y: p.y + 7 }, { x: p.x - 7, y: p.y }], true);
    else if (m.type === 'carrier') {
      const a = m.rot || 0, tri = [{ x: p.x + Math.cos(a) * 9, y: p.y + Math.sin(a) * 9 }, { x: p.x + Math.cos(a + 2.5) * 6, y: p.y + Math.sin(a + 2.5) * 6 }, { x: p.x + Math.cos(a - 2.5) * 6, y: p.y + Math.sin(a - 2.5) * 6 }];
      g.fillStyle(m.color, 1).fillPoints(tri, true); g.lineStyle(1, CYAN, 1).strokePoints(tri, true);
    }
  });
  campFirePaint(mp.fire, C, g, F, f, performance.now()); // the fight over the marks: volleys, bullets, missiles, mining beams, rings and flashes (src/campmapfire.js), thin and cut to the frame
  // ---- navigate (card space-game-campaign-navigate): the goal pulses with a line from the carrier and its distance and flight time; the chosen row has a frame; the place you are flying to has a line ----
  if (time - mp.rowsAt >= 250 || mp.dirty) { mp.rows = campNavRows(C); mp.rowsAt = time; mp.dirty = false; } // the list is rebuilt four times a second: ships move
  let sel = mp.rows.findIndex(r => r.id === mp.selId); if (sel < 0) { sel = 0; mp.selId = mp.rows[0] ? mp.rows[0].id : ''; }
  const me = marks.find(m => m.type === 'carrier'), cp = me ? pin(X(me.x), Y(me.y)) : null, goal = mp.rows.find(r => r.goal), N = C.nav, pulse = 0.5 + 0.5 * Math.sin(time / 220), gc = CAMPNAV.color;
  const route = (r, color, alpha) => { const q = pin(X(r.x), Y(r.y)); if (cp) g.lineStyle(1.5, color, alpha).lineBetween(cp.x, cp.y, q.x, q.y); return q; };
  if (goal) {
    const q = route(goal, gc.goal, 0.55), d = cp ? Math.hypot(goal.x - C.carrier.x, goal.y - C.carrier.y) : 0;
    g.lineStyle(2, gc.goal, 0.5 + 0.5 * pulse).strokeCircle(q.x, q.y, 11 + 4 * pulse);
    mp.goalText.setVisible(true).setPosition(q.x, q.y - 22);
    mp.routeText.setVisible(!!cp).setText(uiText('camp.map.route', { km: campNavKm(d), s: campNavEta(C, d) })).setPosition(cp ? (cp.x + q.x) / 2 : 0, cp ? (cp.y + q.y) / 2 - 10 : 0);
  } else { mp.goalText.setVisible(false); mp.routeText.setVisible(false); }
  if (N) { route({ x: N.x, y: N.y }, gc.select, 0.85); mp.dest.setText(uiText('camp.map.dest', { name: N.name }) + '  ' + campNavKm(Math.hypot(N.x - C.carrier.x, N.y - C.carrier.y)) + ' km'); } else mp.dest.setText('');
  const chosen = mp.rows[sel]; if (chosen) { const q = pin(X(chosen.x), Y(chosen.y)); g.lineStyle(2, gc.select, 1).strokeRect(q.x - 9, q.y - 9, 18, 18); }
  // ---- set by a click (card space-game-map-click-fly): the place has a ring and a line from the carrier, its distance, and two small buttons beside it: Fly (regular speed) and Fast (a burn) ----
  if (mp.flewId && mp.setId === mp.flewId && !(N && N.on) && !C.navWait) { mp.setId = ''; mp.flewId = ''; } // the trip is over (arrived, cleared, a steering key): the place is no longer set
  const setRow = mp.setId ? mp.rows.find(r => r.id === mp.setId) : null; if (mp.setId && !setRow) mp.setId = '';
  if (setRow) { // the buttons stay live for the whole flight: the active one is marked, the target is kept and a press only changes the speed (Troy, 20 Nov 2026; card space-game-campaign-fast-board)
    const q = route(setRow, gc.select, 0.7), d = Math.hypot(setRow.x - C.carrier.x, setRow.y - C.carrier.y), eta = n => typeof cruiseEtaText === 'function' ? cruiseEtaText(n) : n + ' s';
    g.lineStyle(2, 0xffffff, 0.9).strokeCircle(q.x, q.y, 13 + 2 * pulse);
    const here = N && N.on && N.id === (setRow.of || setRow.id), waiting = !!(C.navWait && C.navWait.id === (setRow.of || setRow.id)), on = uiText('camp.map.on'), flyOn = here && !N.fast, fastOn = here && N.fast; // which one is going
    mp.btnFly.setText(uiText('camp.map.fly', { t: eta(campNavEta(C, d)) }) + (flyOn ? '  ' + on : '')).setBackgroundColor(flyOn ? '#1f7f95' : '#0a3a4a').setVisible(true);
    mp.btnFast.setText(waiting ? uiText('camp.nav.recalling', { n: C.navWait.n }) : campNavOut(C) ? uiText(C.fastAsk && C.t - C.fastAsk.at <= CAMP.nav.askFor * 1000 ? 'camp.map.fastask' : 'camp.map.fastout', { n: campNavOut(C) }) : uiText('camp.map.fast', { t: eta(campNavEta(C, d, true)) }) + (fastOn ? '  ' + on : '')).setBackgroundColor(fastOn ? '#1f7f95' : '#0a3a4a').setAlpha(campNavOut(C) ? 0.6 : 1).setVisible(true);
    const w = Math.max(mp.btnFly.width, mp.btnFast.width), h = mp.btnFly.height, right = q.x + 22 + w <= F.x + F.w - 4, bx = right ? q.x + 22 : Math.max(F.x + 4, q.x - 22 - w), by = Math.max(F.y + 4, Math.min(F.y + F.h - 2 * h - 8, q.y - h - 2)); // beside the mark, on the side with room, inside the frame
    mp.btnFly.setPosition(bx, by); mp.btnFast.setPosition(bx, by + h + 4);
    if (!N) mp.dest.setText(uiText('camp.map.set', { name: setRow.name }) + '  ' + campNavKm(d) + ' km');
  } else { mp.btnFly.setVisible(false); mp.btnFast.setVisible(false); }
  const win = navpanelLines(mp.rows, sel, CAMP.nav.list, CAMPNAV.groups); // the Long Haul nav panel's own windowing: headings, and the chosen row kept in view
  mp.list.forEach((t, k) => {
    const ln = win.lines[k]; t.rowId = '';
    if (!ln) { t.setVisible(false); return; }
    t.setVisible(true);
    if (ln.head) { t.setText('  ' + ln.head).setColor('#5b7a92'); return; }
    const r = ln.row; t.rowId = r.id;
    t.setText((ln.i === sel ? '> ' : '  ') + String(r.name).slice(0, 16).padEnd(16) + (campNavKm(r.dist) + ' km').padStart(9)).setColor(ln.i === sel ? '#ffffff' : r.goal ? '#ffd37a' : '#9fe9ff');
  });
  // the legend: what is on the map now
  const rows = campMapLegend(C, marks);
  mp.leg.forEach((t, i) => {
    const r = rows[i]; if (!r) { t.setVisible(false); return; }
    t.setVisible(true).setText(r.text); g.fillStyle(r.color, 1).fillCircle(CAMPMAP_SIDE.x + 6, t.y, 4);
  });
}

// ---- picking (card space-game-campaign-navigate): the keys and the clicks of the open map ----
// fly there: the same for a key, a click and the words (src/campnav.js campNavGo). fast: the Fast button, Shift+Enter (a burn at CAMP.nav.fast times the speed); the words and Enter fly at regular speed.
// A place you are already at says so and does nothing.
function campMapFly(s, row, fast) {
  const C = s.camp; if (!C || !row || C.result) return false;
  const t = campNavTarget(C, row) || row, d = Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y);
  if (!row.moving && d - campNavStop(row.kind, t) <= CAMP.nav.arrive) { toast(s, uiText('camp.nav.there', { name: row.name }), '#ffd37a'); return false; }
  const r = campNavFly(C, row, fast, 'click'); // regular speed, or Fast with the wing aboard; with a ship out the first press is refused (an event says so) and the second recalls the wing and burns (src/campnav.js)
  if (s.mp) { s.mp.dirty = true; if (r.ok) { s.mp.setId = s.mp.flewId = row.id; } } return !!r.ok; // the place stays set, with its buttons, while the trip lasts
}
// a key while the map is open: W S and the arrows choose (flying keys are the list's while it is open, as in the Long Haul nav panel), A D and the side arrows go to the next or the last group,
// Enter flies there, X clears the destination. true when the key was the map's.
function campMapKey(s, code, shift) {
  const mp = s.mp; if (!mp) return false;
  const rows = mp.rows, at = Math.max(0, rows.findIndex(r => r.id === mp.selId));
  const set = i => { if (rows.length) { mp.selId = rows[((i % rows.length) + rows.length) % rows.length].id; mp.userSel = true; } return true; }; // a choice in the list is what the zoom is about (campMapFocus)
  if (code === 'KeyW' || code === 'ArrowUp') return set(at - 1);
  if (code === 'KeyS' || code === 'ArrowDown') return set(at + 1);
  if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') {
    const groups = rows.map(r => r.group).filter((g, i, a) => a.indexOf(g) === i); if (!groups.length) return true;
    const gi = groups.indexOf(rows[at] ? rows[at].group : ''), next = groups[(gi + (code === 'KeyD' || code === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length];
    return set(rows.findIndex(r => r.group === next));
  }
  if (code === 'Enter' || code === 'NumpadEnter') { if (rows[at]) campMapFly(s, rows[at], !!shift); return true; } // Enter: regular speed; Shift+Enter: fast
  if (code === 'KeyZ') return campMapWhole(s);
  if (code === 'KeyX') { if (s.camp && (s.camp.nav || s.camp.navWait)) { campNavClear(s.camp, 'clear'); mp.dirty = true; } if (mp.flewId && mp.setId === mp.flewId) { mp.setId = ''; mp.flewId = ''; } return true; }
  return false;
}
// a click: on one of the two buttons by a place you have set (Fly, Fast), on a line of the list, or on a mark of the map. A place is SET by the first click (ring, line, distance, the two buttons)
// and flown to at regular speed by a second click on it (card space-game-map-click-fly: a click used to fly at once). true when it picked something.
function campMapClick(s, px, py) {
  const mp = s.mp; if (!mp) return false;
  const onBtn = t => !!t && t.visible && px >= t.x && px <= t.x + t.width && py >= t.y && py <= t.y + t.height;
  if (onBtn(mp.btnFly) || onBtn(mp.btnFast)) { const set = mp.rows.find(r => r.id === mp.setId); if (set) campMapFly(s, set, onBtn(mp.btnFast)); return true; }
  const F = CAMPMAP.frame, hit = mp.list.find(t => t.rowId && px >= t.x && px <= t.x + 260 && Math.abs(py - t.y) <= 11);
  let row = hit ? mp.rows.find(r => r.id === hit.rowId) : null;
  const inF = r => { const q = campMapPoint(mp.fit, F, r.x, r.y); return q.x >= F.x && q.x <= F.x + F.w && q.y >= F.y && q.y <= F.y + F.h; };
  let cycled = false;
  if (!row && px >= F.x && px <= F.x + F.w && py >= F.y && py <= F.y + F.h) { // a mark of the map: every row has one (ships, enemies, ore, rocks, places); the first click sets the nearest, the next on the same spot takes the next of the stack
    const stack = campNavPickStack(mp.rows.filter(inF), (x, y) => campMapPoint(mp.fit, F, x, y), px, py), at = stack.findIndex(r => r.id === mp.setId), same = !!mp.lastClick && Math.hypot(px - mp.lastClick.x, py - mp.lastClick.y) <= CAMP.nav.stackSame;
    if (stack.length > 1 && at >= 0 && same) { row = stack[(at + 1) % stack.length]; cycled = true; } else row = stack[0] || null;
  }
  mp.lastClick = row && !hit ? { x: px, y: py } : null;
  if (!row) return false;
  mp.selId = row.id; mp.userSel = true;
  if (mp.setId === row.id && !cycled) campMapFly(s, row, false); else { mp.setId = row.id; mp.dirty = true; } // a second click on the same lone mark: regular speed; on a stack it takes the next one
  return true;
}
