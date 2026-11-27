// ---------- Campaign: a pick that is off the screen is peeked at (card space-game-pick-peek; Troy, 24 Nov 2026; it replaces card space-game-select-zooms-out of 23 Nov, whose zoom-out made ships smaller specks) ----------
// Troy: picking a target that is ALREADY on the screen moves nothing (no zoom, no pan: the square and the corner say what is held). Picking one that is OFF the screen gives a quick peek: the camera glides to it at a readable zoom, holds, and glides back to the
// cruiser by itself. The picks are campSelUnits(C) (src/camptarget.js): [ ] \ an enemy (C.tgt), a friendly ship or an outpost you protect (C.fsel), Q W one pilot (C.sel; All pilots, the default, is nobody in particular and peeks at nothing); a click on a ship is the same pick
// (src/campclick.js). ORCH's numbers, all three on the N panel (the `time` group) and in CAMP.peek (src/campaign.js): hold 1500 ms, glide 400 ms each way, zoom 0.8 at least.
//   a pick        a ship that is NEWLY picked (it was not among the picks the frame before): the one let go, a ship that dies and a pick that stays do not peek. With two new at once, the last of them (the hostile)
//   on screen     its middle is inside the screen less CAMP.peek.view at the view the camera has now (the zoom the player wants, the middle the camera has): nothing moves, the pick is just held
//   off screen    the peek: the camera lets go of the cruiser and glides to the ship (eased, by time) in `glide` ms, follows it for `hold` ms, glides back to the cruiser (where it is by then) in `glide` ms and follows it again. The ship is
//                 centred at the zoom the player has, or CAMP.peek.zoom when that is farther out (a readable ship: out would make it a speck); the zoom he had is given back when the way back begins, unless he zoomed by hand meanwhile
//   another pick  during a peek: one that is off the screen of the HOME view (the cruiser's, at the player's zoom) restarts the peek on it, from where the camera is, with the player's own zoom still the one to give back; one that is on that screen
//                 sends the camera home at once (it is seen there)
//   ends it       S (the zoom reset and the way back: campViewRecentre, src/campdrag.js; the reset's zoom is kept), a steering key pressed (a thrust key already held when the pick was made does not end it: the press does), the ship destroyed,
//                 a card, the map or a finished battle; a drag of the hand and F's follow take the view (the zoom is given back); a target sub-list open (s.pn.pick) has the zoom (the camera goes home)
//   not here      while a sub-list, F's follow, a drag or the map has the view a pick is not peeked at: it is seen there. F and S are as they were (src/campfocus.js)
// s.selPeek = { ids } the ships picked the last frame. s.peek = null or { id, pt: the place followed, post: an outpost (a place, fixed), phase: 'out' | 'hold' | 'back', t: ms in the phase, from: the middle of the view when the phase began, fly: a steering key was held,
// zoom: { was, set } | null }. The rules are plain functions (tests/campselzoom.mjs runs them in Node); the scene calls campSelPeek and campPeekFrame every frame (src/campaignscene.js).

// the things picked now: the one pilot (none for All pilots), the friendly ship or outpost, then the enemy (campSelUnits, src/camptarget.js), alive
function campSelPeekUnits(C) {
  if (!C || !C.carrier || typeof campSelUnits !== 'function') return [];
  const sel = campSelUnits(C), post = sel.friendlyPost ? { id: sel.friendlyPost.id, hp: 1, post: true, x: sel.friendlyPost.x, y: sel.friendlyPost.y, r: sel.friendlyPost.r } : null; // an outpost has no hull: it is a place to look at
  return [sel.who, sel.friendly, post, sel.hostile].filter(u => u && u.hp > 0 && !u.gone);
}
// the peek of a scene, or null: a stand-in scene in a test may answer any property with a stub, so only an object made here counts
const campPeekOf = s => { const p = s && s.peek; return p && typeof p === 'object' && typeof p.id === 'string' && p.pt ? p : null; };
// the middle of the view in the world: the camera's scroll is its top left at zoom 1, and the zoom is about the middle (src/campfocus.js campFocusMid reads it the same way)
const campPeekMid = cam => ({ x: camzoomSX(cam) + W / 2, y: camzoomSY(cam) + H / 2 });
// is the ship on the screen at a view: (mid) the middle of the view in the world, z the zoom; its middle inside the screen less CAMP.peek.view
function campPeekOnScreen(mid, z, u) {
  const V = CAMP.peek.view, sx = W / 2 + (u.x - mid.x) * z, sy = H / 2 + (u.y - mid.y) * z;
  return sx >= fillX0() + V.left && sx <= fillX1() - V.right && sy >= fillY0() + V.top && sy <= fillY1() - V.bottom;
}
// the zoom the player has: while a peek has its own on, the one he had before it (unless he has moved it since: then it is what he has now)
function campPeekBase(s) {
  const p = campPeekOf(s), Z = p && p.zoom;
  return Z && Math.abs(CAMZOOM.want - Z.set) < 1e-9 ? Z.was : CAMZOOM.want;
}
// the zoom a peek took is given back, unless the player zoomed by hand meanwhile (what he set stays)
function campPeekZoomBack(s) {
  const p = campPeekOf(s), Z = p && p.zoom; if (!Z) return;
  if (typeof CAMZOOM !== 'undefined' && Math.abs(CAMZOOM.want - Z.set) < 1e-9) CAMZOOM.want = Z.was;
  p.zoom = null;
}
// the peek begins (or begins again) on a ship: the camera lets go of the cruiser; the zoom goes to the readable one when the player's is farther out
function campPeekGo(s, u) {
  const cam = s.cameras.main, K = CAMP.peek, base = campPeekBase(s), set = camzoomClamp(Math.max(base, K.zoom));
  const fly = typeof campDragFlying === 'function' ? !!campDragFlying(s) : false; // a steering key held now is not a press: it does not end the peek
  s.peek = { id: u.id, pt: { x: u.x, y: u.y }, post: !!u.post, phase: 'out', t: 0, from: campPeekMid(cam), fly, zoom: set > base + 1e-9 ? { was: base, set } : null };
  if (s.peek.zoom) CAMZOOM.want = set; else CAMZOOM.want = base;
  if (typeof cam.stopFollow === 'function') cam.stopFollow(); // the glide is the camera's own (campPeekFrame)
}
// the way back begins now: from where the camera is, to the cruiser; the zoom the player had comes back
function campPeekBack(s) {
  const p = campPeekOf(s), cam = s && s.cameras && s.cameras.main; if (!p || !cam || p.phase === 'back') return false;
  campPeekZoomBack(s); p.phase = 'back'; p.t = 0; p.from = campPeekMid(cam); return true;
}
// the peek is over and the camera follows the cruiser again (its own lerp: CAMPDRAG.follow). keepZoom: the zoom is not given back (S has reset it). true when there was a peek
function campPeekEnd(s, keepZoom) {
  const p = campPeekOf(s); if (!p) return false;
  if (keepZoom) p.zoom = null; else campPeekZoomBack(s);
  s.peek = null;
  const cam = s.cameras && s.cameras.main, sp = campEyeSprite(s);
  if (cam && sp && typeof cam.startFollow === 'function') cam.startFollow(sp, true, typeof CAMPDRAG !== 'undefined' ? CAMPDRAG.follow : 0.12, typeof CAMPDRAG !== 'undefined' ? CAMPDRAG.follow : 0.12);
  return true;
}
// a drag of the hand or F's follow has the view: the peek lets go and the zoom comes back, the camera is theirs
function campPeekBreak(s) {
  const p = campPeekOf(s); if (!p) return false;
  campPeekZoomBack(s); s.peek = null; return true;
}

// after F's press broke a peek (campPeekBreak): when F did not take the camera (nothing to focus: the way back), the camera follows the cruiser again. true when it was put back
function campPeekHome(s) {
  if (!s || s.panned || (typeof campFocusOf === 'function' && campFocusOf(s))) return false;
  const cam = s.cameras && s.cameras.main, sp = campEyeSprite(s);
  if (!cam || !sp || typeof cam.startFollow !== 'function') return false;
  const f = typeof CAMPDRAG !== 'undefined' ? CAMPDRAG.follow : 0.12; cam.startFollow(sp, true, f, f); return true;
}

// the pick of a ship: 'screen' when it is on the screen (nothing moves), 'peek' when a peek began or began again on it, 'home' when a peek was on and the ship is on the home screen (the camera goes home at once)
function campPeekPick(s, u) {
  const C = s.camp, cam = s.cameras.main, p = campPeekOf(s);
  const home = p ? { mid: { x: campEye(C).x, y: campEye(C).y }, z: campPeekBase(s) } : { mid: campPeekMid(cam), z: CAMZOOM.want > 0 ? CAMZOOM.want : (cam.zoom > 0 ? cam.zoom : 1) };
  if (campPeekOnScreen(home.mid, home.z, u)) return p && campPeekBack(s) ? 'home' : 'screen';
  campPeekGo(s, u); return 'peek';
}
// every frame (the scene's update): the ships picked now are compared with the frame before; a new one is picked: peek at it if it is off the screen. '' when nothing was picked or the view is another's
function campSelPeek(s) {
  if (!s || !s.camp || !s.cameras || !s.cameras.main || typeof CAMZOOM === 'undefined' || typeof camzoomClamp !== 'function' || typeof CAMP === 'undefined' || !CAMP.peek) return '';
  const C = s.camp;
  if (!C.carrier || s.mode !== 'play' || s.leaving || C.result) return '';
  const units = campSelPeekUnits(C), ids = units.map(u => u.id), M = s.selPeek && typeof s.selPeek === 'object' && Array.isArray(s.selPeek.ids) ? s.selPeek : null;
  const fresh = units.filter(u => !M || M.ids.indexOf(u.id) < 0);
  s.selPeek = { ids };
  if (!fresh.length) return '';
  if (s.mp || (s.pn && s.pn.pick) || s.panned || (typeof campFocusOf === 'function' && campFocusOf(s))) return ''; // the map, a target sub-list, a drag and F's follow have the view: the pick is seen there
  return campPeekPick(s, fresh[fresh.length - 1]);
}
// every frame (the scene's update), dt ms: the glide out, the hold and the glide back, by time. true while a peek is on
function campPeekFrame(s, dt) {
  const p = campPeekOf(s); if (!p) return false;
  const C = s.camp, cam = s.cameras && s.cameras.main, K = CAMP.peek;
  if (!C || !C.carrier || !cam) { s.peek = null; return false; }
  if (C.result || s.mp || s.leaving || (s.mode !== 'play' && s.mode !== 'pause') || (s.pn && s.pn.pick)) { campPeekEnd(s); return false; } // a card, the map or a target sub-list: the camera goes home (the sub-list's zoom is the player's own)
  if (s.panned || (typeof campFocusOf === 'function' && campFocusOf(s))) { campPeekBreak(s); return false; } // the hand and F's follow have the view
  if (s.mode === 'pause') return true; // frozen with the battle
  const fly = typeof campDragFlying === 'function' ? !!campDragFlying(s) : false;
  if (fly && !p.fly) campPeekBack(s); // a steering key pressed: the view comes home (one held since before the pick does not end it)
  p.fly = fly;
  if (p.phase !== 'back') { // the ship picked: still there, and where
    const u = p.post ? p : (C.by && C.by[p.id]);
    if (!u || (!p.post && (u.hp <= 0 || u.gone))) campPeekBack(s); else if (!p.post) { p.pt.x = u.x; p.pt.y = u.y; }
  }
  const dtc = Math.max(0, Math.min(dt || 0, 100)), glide = Math.max(1, K.glide), ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const put = (a, b, e) => { cam.scrollX = camzoomPutX(a.x + (b.x - a.x) * e - W / 2); cam.scrollY = camzoomPutY(a.y + (b.y - a.y) * e - H / 2); }; // the middle of the view at the eased share of the way from a to b (b is where the ship is of the moment: a ship that moves is caught)
  if (p.phase === 'out') {
    p.t += dtc; put(p.from, p.pt, ease(p.t / glide));
    if (p.t >= glide) { p.phase = 'hold'; p.t = 0; }
  } else if (p.phase === 'hold') {
    put(p.pt, p.pt, 1); p.t += dtc;
    if (p.t >= K.hold) campPeekBack(s);
  } else {
    p.t += dtc; put(p.from, { x: campEye(C).x, y: campEye(C).y }, ease(p.t / glide));
    if (p.t >= glide) { campPeekEnd(s); return false; }
  }
  return true;
}
