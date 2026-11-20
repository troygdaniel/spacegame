// ---------- Campaign map: the drawing (card space-game-campaign-map; Troy, 20 Nov 2026) ----------
// The Phaser half of src/campmap.js, which says WHAT is on the map and where it fits. Three functions, called by the Campaign scene (src/campaignscene.js):
//   campMapInstall(s)  once, in create: Tab opens the map over the battle, or closes it       campMapPaint(s, time)   every frame while it is open       campMapClose(s)   Esc, or a card coming up
// It reuses the sector map's (src/map.js) own pieces rather than a drawing system of its own: mapPlace puts the names of the places where they touch nothing, mapGridStep
// chooses the grid, hudPanel and hudGlowPath are the glass panel and the glowing frame, and the colours are the radar's (campDotColor). The battle is NOT paused: the scene keeps
// stepping the sim and every key but Esc and Tab still does what it does, so the orders (1 to 5), the strip (I) and the voice (U) work from the map.
// Nothing here uses a Phaser feature the Campaign scene does not already use (no mask: a ship outside the frame is drawn on its edge, as the radar draws it on the rim).
const CAMPMAP_PANEL = { x: 70, y: 35, w: 1140, h: 650 }; // the glass panel: the sector map's own size and place (src/map.js)
const CAMPMAP_SIDE = { x: 925, y: 170, step: 28, rows: 8 }; // the column on the right: the objective above, the legend below

function campMapToggle(s) { if (s.mp) campMapClose(s); else campMapOpen(s); }

// Tab is read on the window, not through the scene's keyboard: Long Haul's own Tab handler (installMap, src/map.js) calls preventDefault on every Tab, and Phaser's keyboard
// drops a key event that has been default-prevented. The listener is the scene's: made in create, taken off when the scene shuts down. target: the window (a test passes its own)
function campMapInstall(s, target) {
  const w = target || (typeof window !== 'undefined' ? window : null); if (!w || !w.addEventListener) return;
  const typing = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); // the command strip's box: Tab there is not the map
  const on = e => {
    if (!e || e.code !== CAMPMAP.key || e.repeat || typing(e.target)) return;
    if (s.mp) { campMapClose(s); return; }
    if (s.mode === 'play' && !s.leaving && !s.panel) campMapOpen(s); // only in the battle: not over the story, the pick, the pause or the end
  };
  w.addEventListener('keydown', on);
  const off = () => { try { w.removeEventListener('keydown', on); } catch (e) { /* gone */ } };
  if (s.events && s.events.once) { s.events.once('shutdown', off); s.events.once('destroy', off); }
  return off;
}

function campMapClose(s) {
  if (!s || !s.mp) return;
  s.mp.objs.forEach(o => { try { o.destroy(); } catch (e) { /* already gone with the scene */ } });
  s.mp = null;
}

function campMapOpen(s) {
  if (s.mp || !s.camp) return;
  const C = s.camp, F = CAMPMAP.frame, P = CAMPMAP_PANEL, L = CAMP.levels[C.level];
  const mp = s.mp = { objs: [], fit: campMapFit(campMapBounds(C.level), F), leg: [] };
  const own = o => { o.setScrollFactor(0); mp.objs.push(o); return o; };
  own(s.add.rectangle(W / 2, H / 2, W, H, 0x02050c, 0.84)).setDepth(150);
  hudPanel(own(s.add.graphics()).setDepth(151), P.x, P.y, P.w, P.h, 20, 0.97, CYAN);
  mp.g = own(s.add.graphics()).setDepth(152);
  own(s.add.text(F.x, 46, uiText('camp.map.title', { n: C.level, name: L.name }), uiFont(24, '#38e1ff', { letterSpacing: 2 }))).setDepth(154);
  own(s.add.text(F.x, 640, uiText('camp.map.footer'), uiFont(14, '#5b7a92'))).setDepth(154);
  mp.across = own(s.add.text(F.x + F.w, 640, '', uiFont(14, '#5b7a92'))).setOrigin(1, 0).setDepth(154);
  mp.obj = own(s.add.text(CAMPMAP_SIDE.x, F.y, '', uiFont(15, '#ffffff', { wordWrap: { width: 230 }, lineSpacing: 4 }))).setDepth(154);
  for (let i = 0; i < CAMPMAP_SIDE.rows; i++) mp.leg.push(own(s.add.text(CAMPMAP_SIDE.x + 22, CAMPMAP_SIDE.y + i * CAMPMAP_SIDE.step, '', uiFont(14, '#9fe9ff'))).setOrigin(0, 0.5).setDepth(154));
  // the names of the places: they do not move, so they are put once, each on a free side of its mark
  const places = campMapMarks(C).filter(m => m.type === 'place'), names = [];
  const items = places.map(m => {
    const t = own(s.add.text(0, 0, m.name.toUpperCase(), uiFont(13, '#ffb454'))).setOrigin(0.5).setDepth(154), p = campMapPoint(mp.fit, F, m.x, m.y);
    names.push(t); return { x: p.x, y: p.y, r: Math.max(5, m.r * mp.fit.s) + 4, w: t.width, h: t.height, side: 'below' };
  });
  const at = mapPlace(items, F); names.forEach((t, i) => t.setPosition(at[i].x, at[i].y));
  campMapPaint(s, 0);
}

function campMapPaint(s, time) {
  const mp = s.mp; if (!mp) return;
  const C = s.camp, F = CAMPMAP.frame, f = mp.fit, g = mp.g, col = CAMPMAP.color;
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
  mp.across.setText(uiText('camp.map.across', { km: hudFmt(Math.round(F.w / f.s / CAMPMAP.km / 10) * 10) }));
  mp.obj.setText(typeof campObjective === 'function' ? campObjective(C) : '');
  // the marks, the places first and the carrier last (campMapMarks sorts them)
  const marks = campMapMarks(C);
  marks.forEach(m => {
    const p = pin(X(m.x), Y(m.y));
    if (m.type === 'place') { const r = Math.max(5, m.r * f.s); g.fillStyle(m.color, 0.85).fillCircle(p.x, p.y, r); g.lineStyle(1, m.color, 0.5).strokeCircle(p.x, p.y, r + 4); }
    else if (m.type === 'relic') {
      const r = Math.max(7, m.r * f.s); g.lineStyle(2, col.relic, 0.55).strokeCircle(p.x, p.y, r);
      if (m.hold > 0) { g.lineStyle(4, col.relic, 1); g.beginPath(); g.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, m.hold)); g.strokePath(); }
    } else if (m.type === 'cache') g.fillStyle(m.color, 1).fillPoints([{ x: p.x, y: p.y - 4 }, { x: p.x + 4, y: p.y }, { x: p.x, y: p.y + 4 }, { x: p.x - 4, y: p.y }], true);
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
  // the legend: what is on the map now
  const rows = campMapLegend(C, marks);
  mp.leg.forEach((t, i) => {
    const r = rows[i]; if (!r) { t.setVisible(false); return; }
    t.setVisible(true).setText(r.text); g.fillStyle(r.color, 1).fillCircle(CAMPMAP_SIDE.x + 6, t.y, 4);
  });
}
