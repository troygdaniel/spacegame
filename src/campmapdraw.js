// ---------- Campaign map: the drawing (card space-game-campaign-map; Troy, 20 Nov 2026) ----------
// The Phaser half of src/campmap.js, which says WHAT is on the map and where it fits. Three functions, called by the Campaign scene (src/campaignscene.js):
//   campMapInstall(s)  once, in create: Tab opens the map over the battle, or closes it       campMapPaint(s, time)   every frame while it is open       campMapClose(s)   Esc, or a card coming up
// It reuses the sector map's (src/map.js) own pieces rather than a drawing system of its own: mapPlace puts the names of the places where they touch nothing, mapGridStep
// chooses the grid, hudPanel and hudGlowPath are the glass panel and the glowing frame, and the colours are the radar's (campDotColor). The battle is NOT paused: the scene keeps
// stepping the sim and every key but Esc and Tab still does what it does, so the orders (1 to 5), the strip (I) and the voice (U) work from the map.
// Nothing here uses a Phaser feature the Campaign scene does not already use (no mask: a ship outside the frame is drawn on its edge, as the radar draws it on the rim).
const CAMPMAP_PANEL = { x: 70, y: 35, w: 1140, h: 650 }; // the glass panel: the sector map's own size and place (src/map.js)
const CAMPMAP_SIDE = { x: 925, y: 424, step: 24, rows: 8, destY: 166, listY: 192, listStep: 22, hintY: 398 }; // the column on the right: the objective, where you are flying, the list to pick from (card space-game-campaign-navigate), then the legend

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
  if (s.mp.onPointer && s.input && s.input.off) { try { s.input.off('pointerdown', s.mp.onPointer); } catch (e) { /* gone */ } }
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
  // pick and fly (card space-game-campaign-navigate): the list is the Long Haul nav panel's idea (src/navpanel.js: W S choose, Enter flies there, X clears) on the one list the map and the keys share
  mp.dest = own(s.add.text(CAMPMAP_SIDE.x, CAMPMAP_SIDE.destY, '', uiFont(14, '#7fe9ff', { wordWrap: { width: 250 } }))).setDepth(154);
  mp.list = []; for (let i = 0; i < CAMP.nav.list; i++) mp.list.push(own(s.add.text(CAMPMAP_SIDE.x, CAMPMAP_SIDE.listY + i * CAMPMAP_SIDE.listStep, '', uiFont(14, '#9fe9ff'))).setOrigin(0, 0.5).setDepth(154));
  own(s.add.text(CAMPMAP_SIDE.x, CAMPMAP_SIDE.hintY, uiText('camp.map.keys'), uiFont(13, '#5b7a92'))).setDepth(154);
  mp.goalText = own(s.add.text(0, 0, uiText('camp.map.goalmark'), uiFont(12, '#ffd37a'))).setOrigin(0.5).setDepth(154);
  mp.routeText = own(s.add.text(0, 0, '', uiFont(12, '#ffd37a'))).setOrigin(0.5).setDepth(154);
  mp.rows = []; mp.rowsAt = -1e9; mp.selId = '';
  mp.onPointer = p => campMapClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', mp.onPointer);
  for (let i = 0; i < CAMPMAP_SIDE.rows; i++) mp.leg.push(own(s.add.text(CAMPMAP_SIDE.x + 22, CAMPMAP_SIDE.y + i * CAMPMAP_SIDE.step, '', uiFont(14, '#9fe9ff', { wordWrap: { width: 235 } }))).setOrigin(0, 0.5).setDepth(154)); // a row is one line (27 letters at most, tests/campmap.mjs); the wrap is only a net
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
// fly there: the same for a key, a click and the words (src/campnav.js campNavGo). A place you are already at says so and does nothing.
function campMapFly(s, row) {
  const C = s.camp; if (!C || !row || C.result) return false;
  const t = campNavTarget(C, row) || row, d = Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y);
  if (!row.moving && d - campNavStop(row.kind, t) <= CAMP.nav.arrive) { toast(s, uiText('camp.nav.there', { name: row.name }), '#ffd37a'); return false; }
  campNavGo(C, row); if (s.mp) s.mp.dirty = true; return true;
}
// a key while the map is open: W S and the arrows choose (flying keys are the list's while it is open, as in the Long Haul nav panel), A D and the side arrows go to the next or the last group,
// Enter flies there, X clears the destination. true when the key was the map's.
function campMapKey(s, code) {
  const mp = s.mp; if (!mp) return false;
  const rows = mp.rows, at = Math.max(0, rows.findIndex(r => r.id === mp.selId));
  const set = i => { if (rows.length) mp.selId = rows[((i % rows.length) + rows.length) % rows.length].id; return true; };
  if (code === 'KeyW' || code === 'ArrowUp') return set(at - 1);
  if (code === 'KeyS' || code === 'ArrowDown') return set(at + 1);
  if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') {
    const groups = rows.map(r => r.group).filter((g, i, a) => a.indexOf(g) === i); if (!groups.length) return true;
    const gi = groups.indexOf(rows[at] ? rows[at].group : ''), next = groups[(gi + (code === 'KeyD' || code === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length];
    return set(rows.findIndex(r => r.group === next));
  }
  if (code === 'Enter' || code === 'NumpadEnter') { if (rows[at]) campMapFly(s, rows[at]); return true; }
  if (code === 'KeyX') { if (s.camp && s.camp.nav) { campNavClear(s.camp, 'clear'); mp.dirty = true; } return true; }
  return false;
}
// a click: on a line of the list, or on a mark of the map. true when it picked something.
function campMapClick(s, px, py) {
  const mp = s.mp; if (!mp) return false;
  const F = CAMPMAP.frame, hit = mp.list.find(t => t.rowId && px >= t.x && px <= t.x + 260 && Math.abs(py - t.y) <= 11);
  let row = hit ? mp.rows.find(r => r.id === hit.rowId) : null;
  if (!row && px >= F.x && px <= F.x + F.w && py >= F.y && py <= F.y + F.h) row = campNavPickAt(mp.rows, (x, y) => campMapPoint(mp.fit, F, x, y), px, py);
  if (!row) return false;
  mp.selId = row.id; campMapFly(s, row); return true;
}
