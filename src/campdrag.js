// ---------- Campaign: drag the view (card space-game-drag-view; Troy, 22 Nov 2026, from his play) ----------
// Troy: "drag the map around so the centre point can move". The flight camera followed the cruiser and the Tab map was fitted to the level, so the centre of either could not be moved.
//   press and drag   with the mouse (the left button) pans the flight view off the cruiser, and the Tab map. A press that does not move CAMPDRAG.move pixels is a click and does what a click did (the lists' rows, the
//                    map's marks and buttons): the map's click is read on the release now, so a drag that begins on a mark does not pick it. In the flight view a click is on a ship: the scene's shipClick (card
//                    space-game-click-target, src/campclick.js); a RIGHT press is a click at once, and the browser's menu on it is off
//   the flight view  the camera lets go of the cruiser and stays where the hand put it (the cruiser and the fight go on); the wheel zooms about the pointer while it is off (camzoomAnchorScroll, src/camzoom.js), the keys
//                    and the target lists' reveal zoom about the middle of the view, and give the zoom back as they did
//   the way back     a RECENTRE mark shows while the view is off (a small arrow on it points at the cruiser): a click on it, Backspace (the zoom reset: src/campzoom.js), a flying key held CAMPDRAG.fly ms (a tap does
//                    not take it: he is looking at something), and the battle ending, put the camera back on the cruiser, and it follows as it did (its own lerp eases the way back)
//   the map          the same drag pans it (campMapPan, src/campmap.js: the view is free inside the whole system's bounds while it is panned), with the same mark, and Backspace on the map recentres and resets the zoom
// A two-finger trackpad drag is a wheel event, which already zooms: it is not a drag here.
// The pointer rules are pure (campDragNew, Down, Move, Up and campDragCanStart) and so are the pan and the way back (campViewPan, campViewRecentre, campDragFlyTick); campDragInstall wires them to the scene's pointer
// and campDragFrame runs every frame. tests/campdrag.mjs (Node), tests/campdrag-boot.mjs (Chrome, not in the smoke).
const CAMPDRAG = {
  move: 6,          // px a pressed pointer must move before the press is a drag (under it, a click)
  fly: 350,         // ms a flying key is held before the view comes back to the cruiser (a tap does not)
  follow: 0.12,     // the camera's own lerp on the cruiser (the scene's: src/campaignscene.js create)
  mark: { y: 96, depth: 103, arrow: 7, ink: '#7fe9ff', back: '#0a3a4a' } // the RECENTRE mark: y px from the bottom of the screen (above the key line), its depth, the arrow's size, its colours
};

// ---- the press: a click or a drag ----
const campDragNew = () => ({ down: false, drag: false, x0: 0, y0: 0, x: 0, y: 0 });
function campDragDown(d, x, y) { d.down = true; d.drag = false; d.x0 = d.x = x; d.y0 = d.y = y; }
// a move of the pointer: null while the press is still a click (or when none is down), else { dx, dy }, how far the pointer has moved since the last (the first, since the press)
function campDragMove(d, x, y) {
  if (!d.down) return null;
  if (!d.drag) { if (Math.hypot(x - d.x0, y - d.y0) < CAMPDRAG.move) return null; d.drag = true; }
  const r = { dx: x - d.x, dy: y - d.y }; d.x = x; d.y = y; return r;
}
// the release: { drag, x, y } (x, y where it was pressed: that is the click), or null when no press was down
function campDragUp(d) {
  if (!d.down) return null;
  const r = { drag: d.drag, x: d.x0, y: d.y0 }; d.down = false; d.drag = false; return r;
}
// whether a press at (x, y) may begin a drag of the flight view: in the battle, over open space: not over a card, the pause, the page of keys, the tuning panel, the map (which has its own), or an open list
function campDragCanStart(s, x, y) {
  if (!s || s.mode !== 'play' || s.mp || s.leaving) return false;
  if (typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)) return false;
  if (typeof campTuneIsOpen === 'function' && campTuneIsOpen(s)) return false;
  if (typeof campPanelsOver === 'function' && campPanelsOver(s, x, y)) return false;
  return true;
}

// ---- the flight view ----
// pan by a drag of dx, dy screen pixels: the world follows the hand, so the camera moves the other way, by the pixels over the zoom
function campViewPan(s, dx, dy) {
  const cam = s.cameras.main, z = cam.zoom > 0 ? cam.zoom : 1;
  if (typeof campFocusBreak === 'function') campFocusBreak(s); // the hand has the view: a focus (src/campfocus.js) is let go, and F picks it up again
  if (!s.panned) { cam.stopFollow(); s.panned = true; }
  cam.scrollX -= dx / z; cam.scrollY -= dy / z;
  if (s._cz) s._cz.anchor = null; // the hand has the view: a zoom's anchor is the wheel's, made after
  return true;
}
// the camera back on the cruiser (it eases there by its own lerp); false when the view was not off
function campViewRecentre(s) {
  if (typeof campFocusEnd === 'function' && campFocusEnd(s, 'back')) return true; // Backspace and the mark also end a focus (src/campfocus.js): the camera follows the cruiser again
  if (!s || !s.panned) return false;
  s.panned = false; s.dragFly = 0; if (s._cz) s._cz.anchor = null;
  const cam = s.cameras && s.cameras.main, sp = s.sp && s.camp && s.camp.carrier ? s.sp[s.camp.carrier.id] : null;
  if (cam && sp) cam.startFollow(sp, true, CAMPDRAG.follow, CAMPDRAG.follow);
  return true;
}
// the wheel at (px, py) while the view is off: the zoom keeps the world point under the pointer where it is (camzoomFrame puts the scroll back as the zoom eases)
function campViewAnchor(s, px, py) {
  if (!s || !s.panned || !s._cz) return false;
  const cam = s.cameras.main, z = cam.zoom > 0 ? cam.zoom : 1;
  s._cz.anchor = { wx: cam.scrollX + W / 2 + (px - W / 2) / z, wy: cam.scrollY + H / 2 + (py - H / 2) / z, sx: px, sy: py };
  return true;
}
// a flying key held: after CAMPDRAG.fly ms the view comes back. true when it did. Not held, or not off: the count starts again
function campDragFlyTick(s, dt, flying) {
  if (!s || !s.panned || !flying) { if (s) s.dragFly = 0; return false; }
  s.dragFly = (s.dragFly || 0) + dt;
  if (s.dragFly < CAMPDRAG.fly) return false;
  return campViewRecentre(s);
}
// the arrows are the wheel: not while a list or a call has them, the map is open, or a word is being typed
function campDragFlying(s) {
  const k = s && s.k; if (!k || s.mp || s.mode !== 'play') return false;
  if (s.pn && typeof campPanelOpen === 'function' && campPanelOpen(s.pn)) return false;
  if (typeof document !== 'undefined' && document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return false;
  return [k.UP, k.DOWN, k.LEFT, k.RIGHT].some(x => x && x.isDown);
}
// every frame (the scene's update): the battle over, or a card on the screen, takes the view back; a flying key held does; the mark is drawn
function campDragFrame(s, dt, flying) {
  if (!s || !s.cameras) return;
  if (s.panned && (s.mode !== 'play' || (s.camp && s.camp.result))) campViewRecentre(s);
  else campDragFlyTick(s, dt, flying);
  campDragMarkPaint(s);
}

// ---- the mark ----
// RECENTRE and the key (from the table), with a small arrow that points at the cruiser: on the screen while the flight view is off. A click on it brings the view back
function campDragMarkPaint(s) {
  const M = s.dragMark; if (!M) return;
  const on = !!s.panned && s.mode === 'play' && !s.mp;
  M.on = on; M.t.setVisible(on); M.g.clear(); if (!on) return;
  const K = CAMPDRAG.mark, cam = s.cameras.main, c = s.camp && s.camp.carrier, text = uiText('camp.hud.recentre');
  if (M.shown !== text) { M.t.setText(text); M.shown = text; }
  M.t.setPosition(W / 2 + K.arrow * 2, H - K.y);
  if (!c) return;
  const vx = cam.scrollX + W / 2, vy = cam.scrollY + H / 2, a = Math.atan2(c.y - vy, c.x - vx), r = K.arrow, ax = M.t.x - M.t.width / 2 - r * 2, ay = M.t.y;
  const p = (da, m) => ({ x: ax + Math.cos(a + da) * r * m, y: ay + Math.sin(a + da) * r * m });
  M.g.fillStyle(0x7fe9ff, 0.95); M.g.fillTriangle(p(0, 1.3).x, p(0, 1.3).y, p(2.5, 1).x, p(2.5, 1).y, p(-2.5, 1).x, p(-2.5, 1).y);
}
const campDragMarkHit = (M, px, py) => !!M && M.on && Math.abs(px - M.t.x) <= M.t.width / 2 + 24 && Math.abs(py - M.t.y) <= M.t.height / 2 + 6;

// ---- the scene ----
function campDragInstall(s) {
  const K = CAMPDRAG.mark;
  s.dragIn = campDragNew(); s.panned = false; s.dragFly = 0;
  const g = s.add.graphics().setScrollFactor(0).setDepth(K.depth);
  const t = s.add.text(0, 0, '', uiFont(14, K.ink, { backgroundColor: K.back, padding: { x: 8, y: 3 } })).setScrollFactor(0).setDepth(K.depth + 1).setOrigin(0.5).setVisible(false);
  s.dragMark = { g, t, on: false, shown: '' };
  const ok = p => typeof p.leftButtonDown === 'function' ? p.leftButtonDown() : true; // the left button (a right press or a wheel press is not a drag)
  const shipClick = (x, y, b) => { if (!s.mp && typeof s.shipClick === 'function') s.shipClick(x, y, b); }; // card space-game-click-target: the scene's (src/campaignscene.js shipClick), in the flight view only (the map has its own clicks)
  if (s.input && s.input.mouse && typeof s.input.mouse.disableContextMenu === 'function') s.input.mouse.disableContextMenu(); // the browser's menu on a right click is off on the canvas: the right click is the order
  const down = p => {
    if (!ok(p)) { if (typeof p.rightButtonDown === 'function' && p.rightButtonDown() && !s.mp && campDragCanStart(s, p.x, p.y)) shipClick(p.x, p.y, 'right'); return; } // a right press is a click at once (it has no drag); a wheel press is nothing
    if (s.mp) { campDragMapDown(s, p); return; }
    if (campDragMarkHit(s.dragMark, p.x, p.y)) { campViewRecentre(s); return; }
    if (campDragCanStart(s, p.x, p.y)) campDragDown(s.dragIn, p.x, p.y);
  };
  const move = p => {
    const r = campDragMove(s.dragIn, p.x, p.y); if (!r) return;
    if (s.mp) campDragMapMove(s, r); else campViewPan(s, r.dx, r.dy);
  };
  const up = () => {
    const u = campDragUp(s.dragIn); if (!u) return;
    if (s.mp) campDragMapUp(s, u); else if (!u.drag) shipClick(u.x, u.y, 'left'); // a press that did not move is a click on a ship (or on space: nothing)
  };
  const wheel = p => { if (s.panned && !s.mp && typeof camzoomCanWheel === 'function' && camzoomCanWheel(s)) campViewAnchor(s, p.x, p.y); };
  s.input.on('pointerdown', down); s.input.on('pointermove', move); s.input.on('pointerup', up); s.input.on('pointerupoutside', up); s.input.on('wheel', wheel);
  const off = () => { try { ['pointerdown', 'pointermove', 'pointerup', 'pointerupoutside', 'wheel'].forEach((n, i) => s.input.off(n, [down, move, up, up, wheel][i])); } catch (e) { /* gone */ } };
  if (s.events && s.events.once) { s.events.once('shutdown', off); s.events.once('destroy', off); }
}
// the map: a press on the frame waits for the release (a click then, as it was; a drag pans); a press anywhere else (the list at the side, the buttons) is a click at once, as before
function campDragMapDown(s, p) {
  const mp = s.mp, F = CAMPMAP.frame;
  if (mp.recentre && mp.recentre.visible && p.x >= mp.recentre.x && p.x <= mp.recentre.x + mp.recentre.width && p.y >= mp.recentre.y && p.y <= mp.recentre.y + mp.recentre.height) { campMapRecentre(mp, F); mp.namesZ = -1; return; }
  if (p.x >= F.x && p.x <= F.x + F.w && p.y >= F.y && p.y <= F.y + F.h) campDragDown(s.dragIn, p.x, p.y); else campMapClick(s, p.x, p.y);
}
function campDragMapMove(s, r) {
  const mp = s.mp; if (!mp) return;
  campMapPan(mp, CAMPMAP.frame, r.dx, r.dy); mp.dragging = true;
}
function campDragMapUp(s, u) {
  const mp = s.mp; if (!mp) return;
  if (u.drag) { mp.dragging = false; mp.namesZ = -1; } else campMapClick(s, u.x, u.y); // the names are put afresh clear of one another when the hand lets go
}
