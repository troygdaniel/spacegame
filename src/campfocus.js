// ---------- Campaign: the focus view (card space-game-focus-view; Troy, 22 Nov 2026) ----------
// Troy: zooming and dragging did not give what he wanted, which is to look around and see the battle from other places by picking a ship, hostile or friendly, and having it in the middle of the screen.
//   F (CAMP_KEYS.focus)   a KEY, not automatic: with something selected the camera glides to it in CAMPFOCUS.glide ms (by time, not by frame: the same half second at any frame rate), at the zoom it has (a long glide zooms out until the two ends are on the screen, and gives the zoom
//                         back when it has arrived), and FOLLOWS it until another focus, the way back, or a drag of the hand
//   what is focused       the SUBJECT, the first of: (1) the ship a target sub-list is on (src/camppick.js: a ship to escort, to guard, to help, a hostile to attack; the box of src/camptdisp.js shows the same one), (2) the leader of
//                         the squad whose ring shows (src/campwing.js campSquadsShown: its list is open or it was just ordered; with several squads in focus, the first with a ship out), (3) the picked hostile (C.tgt: A D S),
//                         (4) the cruiser. With nothing selected the key is the way back: the camera is on the cruiser
//   the way back          Backspace (the zoom reset, src/campzoom.js, which calls campViewRecentre) and F with nothing selected glide the camera back and let the cruiser be followed again; a ship that dies or leaves does the
//                         same by itself, and says so. A drag of the mouse (src/campdrag.js) breaks the follow: the hand has the view, and F picks it up again
//   what is on the screen while the view is elsewhere   a label of what is watched and the way back, and an arrow at the edge of the screen that points at the cruiser with how far it is
//   the rest              the arrows still fly the cruiser, Space and Enter fire, every list and order works: nothing here reads those keys, and a flying key does NOT bring the view back (the drag's does: he is looking at
//                         something here on purpose)
// The rules are plain functions (campFocusSubject, campFocusLeader, campFocusGlideZoom, campFocusEdge: tests/campfocus.mjs runs them in Node); campFocusPress, campFocusFrame, campFocusEnd and campFocusBreak drive the
// scene's camera, and campFocusPaint draws the label and the arrow. s.focus is null or { id, name, pt: the point the camera follows (the ship's place, kept up to date), from: where the middle of the view was, t: ms since the glide began, gliding, zoom: { was, set } | null }.
const CAMPFOCUS = {
  glide: 500,        // ms the camera takes to get there: the middle of the view moves by an eased share of the way to the ship's place of the moment (a ship that moves is caught), and follows it at the cruiser's own lerp (CAMPDRAG.follow) after
  fit: 0.8,          // share of the screen the two ends of a long glide may take before the view zooms out
  room: 240,         // world px added to the distance between the two ends: the ship's own size and a margin
  mark: { y: 96, depth: 103, ink: '#7fe9ff', back: '#0a3a4a' }, // the label: y px from the bottom of the screen (where the drag's RECENTRE mark is: never both), its depth, its colours
  edge: { pad: 40, arrow: 9, ink: 0x7fe9ff, label: '#7fe9ff' }  // the cruiser's arrow: px from the screen's edge, its size, its colours
};

// ---- what is focused ----
// the leader of a squad: its first ship out, by id (the ships of a squad keep their ids, so the leader is the same until it is lost)
function campFocusLeader(C, sq) {
  if (!C || !C.ships) return null;
  return C.ships.filter(u => u.team === 'earth' && u.hp > 0 && u.kind === 'fighter' && u.squad === sq).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] || null;
}
// the ship a sub-list is on, or the picked hostile: the box of src/camptdisp.js says the same (campTdispSubject, which comes first when it is there); the stand-in is the same rule for a page that has not got it
function campFocusSeen(C, P, now) {
  if (typeof campTdispSubject === 'function') return campTdispSubject(C, P, now);
  const it = P && typeof campPickShown === 'function' ? campPickShown(P, C, now) : null, u = it && it.what === 'ship' && C.by ? C.by[it.id] : null;
  if (u && u.hp > 0) return { u, side: u.team === 'alien' ? 'hostile' : 'friend' };
  const t = typeof campTgtNow === 'function' ? campTgtNow(C) : null;
  return t ? { u: t, side: 'hostile' } : null;
}
// the subject: { u, side: 'hostile' | 'friend', why: 'pick' | 'squad' | 'target' | 'cruiser' }; never null (the cruiser is the last one)
function campFocusSubject(C, P, now) {
  if (!C || !C.carrier) return null;
  const it = P && typeof campPickShown === 'function' ? campPickShown(P, C, now) : null, listed = !!(it && it.what === 'ship'); // a sub-list's candidate comes first: it is what the player is deciding on
  if (listed) { const s = campFocusSeen(C, P, now); if (s && s.u) return { u: s.u, side: s.side, why: 'pick' }; }
  const sq = P && typeof campSquadsShown === 'function' ? campSquadsShown(P, C, now) : [];
  for (let i = 0; i < sq.length; i++) { const u = campFocusLeader(C, sq[i]); if (u) return { u, side: 'friend', why: 'squad' }; }
  const s = campFocusSeen(C, P, now); if (s && s.u) return { u: s.u, side: s.side, why: s.side === 'hostile' ? 'target' : 'pick' };
  return { u: C.carrier, side: 'friend', why: 'cruiser' };
}
// its name as the lists and the box say it ("Raider 3", "Hauler 2", "the cruiser")
const campFocusName = (C, u) => !u ? '' : (C && u === C.carrier) ? uiText('camp.hud.focuscruiser') : typeof campTdispName === 'function' ? campTdispName(u) : typeof campNavUnitName === 'function' ? campNavUnitName(u) : String(u.id);
// the ship still there to be watched
const campFocusAlive = (C, id) => { const u = C && C.by ? C.by[id] : null; return u && u.hp > 0 && !u.gone ? u : null; };

// ---- the glide ----
// the zoom for a glide from the middle of the view (cx, cy) to (tx, ty) at zoom z: z itself when both ends are inside CAMPFOCUS.fit of the screen, else the zoom at which they are (never in: only out)
function campFocusGlideZoom(cx, cy, tx, ty, z) {
  const K = CAMPFOCUS, w = Math.abs(tx - cx) + K.room, h = Math.abs(ty - cy) + K.room;
  const fit = Math.min(W * K.fit / w, H * K.fit / h);
  const want = Math.min(z, fit);
  return typeof camzoomClamp === 'function' ? camzoomClamp(want) : want;
}
// the middle of the view in the world: the camera's scroll is its top left at zoom 1, and the zoom is about the middle (src/campdrag.js reads it the same way)
const campFocusMid = cam => ({ x: cam.scrollX + W / 2, y: cam.scrollY + H / 2 });
// the zoom a glide took is given back, unless the player zoomed by hand meanwhile (what he set stays) or a target sub-list has the zoom (src/camppickdraw.js campPickZoom gives it back itself)
function campFocusZoomBack(s) {
  const f = s && s.focus, Z = f && f.zoom; if (!Z) return;
  if (typeof CAMZOOM !== 'undefined' && Math.abs(CAMZOOM.want - Z.set) < 1e-9) CAMZOOM.want = Z.was;
  f.zoom = null;
}
// F: the camera to the subject. '' when the key does nothing (no battle, the map, a card), 'start' when a glide began, 'same' when that ship is already watched, 'back' when the cruiser is the subject and the view
// came back from where it was, 'cruiser' when it was already there
function campFocusPress(s) {
  const C = s && s.camp, cam = s && s.cameras && s.cameras.main;
  if (!C || !C.carrier || !cam || s.mode !== 'play' || s.mp || s.leaving || C.result) return '';
  const now = (s.time && s.time.now) || 0, sub = campFocusSubject(C, s.pn, now), u = sub && sub.u;
  if (!u) return '';
  if (u === C.carrier) return campFocusReturn(s) ? 'back' : 'cruiser';
  if (s.focus && s.focus.id === u.id) return 'same';
  campFocusZoomBack(s); // another ship: the zoom of the last glide first
  const z = cam.zoom > 0 ? cam.zoom : 1, mid = campFocusMid(cam), want = typeof CAMZOOM !== 'undefined' ? CAMZOOM.want : z;
  const f = s.focus = { id: u.id, name: campFocusName(C, u), side: sub.side, why: sub.why, pt: { x: u.x, y: u.y }, from: { x: mid.x, y: mid.y }, t: 0, gliding: true, zoom: null };
  if (s.panned) { s.panned = false; s.dragFly = 0; if (s._cz) s._cz.anchor = null; } // the focus takes the view from the hand
  const gz = campFocusGlideZoom(mid.x, mid.y, u.x, u.y, want);
  if (gz < want - 1e-6 && !s.pickZoom && typeof CAMZOOM !== 'undefined') { f.zoom = { was: want, set: gz }; CAMZOOM.want = gz; } // a long way: out until both ends are seen, back when there
  cam.stopFollow(); // the glide is the camera's own (campFocusFrame), the follow starts when it has arrived
  return 'start';
}
// the camera back on the cruiser: true when there was a focus to end or the hand had the view
function campFocusReturn(s) {
  if (s && s.focus) { campFocusEnd(s, 'back'); return true; }
  return !!(s && s.panned && typeof campViewRecentre === 'function' && campViewRecentre(s));
}
// the focus ends and the camera follows the cruiser again (its own lerp eases the way back); why: 'back' (a key), 'lost' (the ship is gone), 'over' (the battle ended or a card came)
function campFocusEnd(s, why) {
  const f = s && s.focus; if (!f) return false;
  campFocusZoomBack(s); s.focus = null;
  const cam = s.cameras && s.cameras.main, sp = s.sp && s.camp && s.camp.carrier ? s.sp[s.camp.carrier.id] : null;
  if (cam && sp) cam.startFollow(sp, true, CAMPDRAG.follow, CAMPDRAG.follow);
  return true;
}
// a drag of the hand (campViewPan): the follow is let go and nothing is put back: the hand has the view, and F picks the ship up again
function campFocusBreak(s) {
  if (!s || !s.focus) return false;
  campFocusZoomBack(s); s.focus = null; return true;
}
// every frame (the scene's update), dt ms: the point the camera follows is kept on the ship; the glide ends when the camera is there; a ship that died or left, or the battle over, ends the focus
function campFocusFrame(s, dt) {
  const f = s && s.focus; if (!f) { campFocusPaint(s); return; }
  const C = s.camp, cam = s.cameras && s.cameras.main;
  if (!C || !cam || C.result || (s.mode !== 'play' && s.mode !== 'pause')) { campFocusEnd(s, 'over'); campFocusPaint(s); return; } // a card (the debrief, the end) takes the view back; the pause and the H page do not
  const u = campFocusAlive(C, f.id);
  if (!u) { // gone: the camera glides back to the cruiser, and the player is told
    const name = f.name; campFocusEnd(s, 'lost'); if (typeof toast === 'function') toast(s, uiText('camp.hud.focuslost', { name }), '#ffb454');
    campFocusPaint(s); return;
  }
  f.pt.x = u.x; f.pt.y = u.y;
  if (f.gliding) {
    f.t += Math.max(0, Math.min(dt || 0, 100)); const p = Math.min(1, f.t / CAMPFOCUS.glide), e = p * p * (3 - 2 * p); // eased in and out
    cam.scrollX = f.from.x + (u.x - f.from.x) * e - W / 2; cam.scrollY = f.from.y + (u.y - f.from.y) * e - H / 2;
    if (p >= 1) { f.gliding = false; cam.startFollow(f.pt, true, CAMPDRAG.follow, CAMPDRAG.follow); campFocusZoomBack(s); } // there: it follows, and the zoom comes back
  }
  campFocusPaint(s);
}

// ---- the label and the arrow ----
// where the cruiser's arrow sits: the point of the screen's edge (inside pad px of it) on the line from the middle of the screen to the cruiser, and the angle it points at; null when the cruiser is on the screen
// (cx, cy: the middle of the view in the world, z: the zoom, (px, py): the cruiser)
function campFocusEdge(cx, cy, z, px, py, pad) {
  const dx = (px - cx) * z, dy = (py - cy) * z, hx = W / 2 - pad, hy = H / 2 - pad;
  if (Math.abs(dx) <= hx && Math.abs(dy) <= hy) return null;
  const k = Math.min(hx / (Math.abs(dx) || 1e-9), hy / (Math.abs(dy) || 1e-9));
  return { x: W / 2 + dx * k, y: H / 2 + dy * k, a: Math.atan2(dy, dx) };
}
function campFocusInstall(s) {
  const K = CAMPFOCUS;
  s.focus = null;
  const g = s.add.graphics().setScrollFactor(0).setDepth(K.mark.depth);
  const t = s.add.text(0, 0, '', uiFont(14, K.mark.ink, { backgroundColor: K.mark.back, padding: { x: 8, y: 3 } })).setScrollFactor(0).setDepth(K.mark.depth + 1).setOrigin(0.5).setVisible(false);
  const a = s.add.text(0, 0, '', uiFont(13, K.edge.label)).setScrollFactor(0).setDepth(K.mark.depth + 1).setOrigin(0.5).setVisible(false);
  s.focusMark = { g, t, a };
}
function campFocusPaint(s) {
  const M = s && s.focusMark; if (!M) return;
  const f = s.focus, on = !!f && !s.mp, K = CAMPFOCUS, C = s.camp, cam = s.cameras && s.cameras.main;
  M.g.clear(); M.t.setVisible(on); M.a.setVisible(false);
  if (!on || !C || !cam) return;
  campLabel(M.t, uiText('camp.hud.focuswatch', { name: f.name }));
  M.t.setPosition(W / 2, H - K.mark.y);
  const mid = campFocusMid(cam), z = cam.zoom > 0 ? cam.zoom : 1, c = C.carrier, e = c ? campFocusEdge(mid.x, mid.y, z, c.x, c.y, K.edge.pad) : null;
  if (!e) return; // the cruiser is on the screen: nothing to point at
  const r = K.edge.arrow, p = (da, m) => ({ x: e.x + Math.cos(e.a + da) * r * m, y: e.y + Math.sin(e.a + da) * r * m });
  M.g.fillStyle(K.edge.ink, 0.95); M.g.fillTriangle(p(0, 1.4).x, p(0, 1.4).y, p(2.5, 1).x, p(2.5, 1).y, p(-2.5, 1).x, p(-2.5, 1).y);
  campLabel(M.a, uiText('camp.hud.focuscruiserfar', { km: typeof campNavKm === 'function' ? campNavKm(campDist({ x: mid.x, y: mid.y }, c)) : Math.round(Math.hypot(c.x - mid.x, c.y - mid.y) / 100) }));
  M.a.setPosition(Math.max(M.a.width / 2 + 6, Math.min(W - M.a.width / 2 - 6, e.x - Math.cos(e.a) * (r * 2 + M.a.width / 2))), Math.max(14, Math.min(H - 14, e.y - Math.sin(e.a) * (r * 2 + 10)))).setVisible(true);
}
