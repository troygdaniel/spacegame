// ---------- Taking and giving the stick, seen: the camera's glide, a ring on the fighter and a CRUISER AUTO tag (card space-game-b7-camera-lead-stick; Troy, 26 Nov 2026: decision 9 of the cloud's brief 7, tile "Taking the stick" of docs/pace-and-polish.html) ----------
// Today C changes the ship he flies in one frame and the camera finds the fighter by its own soft follow: nothing in the middle of the screen says "you fly Wedge now". With CAMP.flags.cockpit on, a take (or a hand-back, the same move the other way) is:
//   GLIDE   the camera goes from where it was to the ship he flies now in CAMPCAM.glide ms (0.4 s, eased in and out: the F key's glide, src/campfocus.js, is the model), and follows it from there; the view comes closer (the cockpit's 3 times, src/campfeel.js
//           campFeelCockpitK; it eases in about 0.6 s) or goes back out as it goes
//   RING    a pale-blue ring (his colour) shrinks from 60 px to 20 px onto the fighter he takes and fades as it lands; on a hand-back it opens from 20 px to 60 px round the fighter he leaves and fades
//   TAG     a small CRUISER AUTO pill under the cruiser while he is away (it flies its last order and its turrets fire by themselves, CAMP.cockpit.turrets), pinned inside the screen's edge when the cruiser is off it
// Pictures and the camera only: no rule, number or speed of the flight is read or written. Under reduced motion (prefers-reduced-motion: reduce) nothing here moves: the camera takes the fighter by the follow's own soft pan as it always did, the closer view
// is there at once and the ring does not shrink (it is drawn at its last size and fades). Pure functions on top (tests/campcockpitcam.mjs), the Phaser frame below. The scene calls campCamEye on an eye change (eyeSync) and campCamFrame once a frame.
const CAMPCAM = {
  glide: 400,                                     // ms: the camera's glide to the ship he flies now (0 is none: the follow's own pan)
  follow: 0.12,                                   // the follow's lerp once it has arrived (the scene's own, src/campaignscene.js)
  ring: { from: 60, to: 20, ms: 450, w: 1.5, a: 1, aOut: 0.8, fade: 0.65, color: 0x6fd6ff, depth: 7 }, // px on the screen at the start and at the end (a take shrinks from to to; a hand-back opens to to from), the ms it lives, its line width in px on the screen, its opacity (aOut on a hand-back), the share of its life after which it fades, his pale blue
  tag: { pad: 64, padY: 40, below: 18, fade: 300, a: 0.95, depth: 6.6, size: 11, color: '#9fd8ff', fill: 'rgba(14,22,36,0.9)' } // the pill: px of the screen's edge it stays inside (across, down), px under the cruiser's middle (and the cruiser's own half length on top), ms to come and go, its opacity, its size and colours
};

// ---- pure ----
const campCamEase = p => { p = p < 0 ? 0 : p > 1 ? 1 : +p || 0; return p * p * (3 - 2 * p); }; // eased in and out (campFocusFrame's)
// the camera's middle at t ms into a glide from `from` to `to` (the ship moves, so `to` is where it is now): { x, y, p, done }
function campCamGlideAt(from, to, t, ms) {
  const p = ms > 0 ? Math.max(0, Math.min(1, t / ms)) : 1, e = campCamEase(p);
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, p, done: p >= 1 };
}
// the ring at t ms: { r (px on the screen), a } or null when it is over; kind 'in' (a take: shrinking onto the fighter) or 'out' (a hand-back: opening round the one left); still: reduced motion, drawn at its last size
function campCamRingAt(kind, t, still) {
  const K = CAMPCAM.ring, p = t / K.ms; if (!(p >= 0 && p < 1)) return null;
  const fade = p <= K.fade ? 1 : 1 - (p - K.fade) / (1 - K.fade), e = campCamEase(p), a = (kind === 'out' ? K.aOut : K.a) * fade;
  const r = still ? (kind === 'out' ? K.from : K.to) : kind === 'out' ? K.to + (K.from - K.to) * e : K.from + (K.to - K.from) * e;
  return { r, a };
}
// the pill's place: the cruiser at (ox, oy) px from the middle of a w by h screen, the pill `drop` px under it, kept inside the edge by padX across and padY down; { x, y, clamped } from the middle
function campCamTagAt(ox, oy, w, h, drop, padX, padY) {
  const hx = Math.max(0, w / 2 - padX), hy = Math.max(0, h / 2 - padY), x = Math.max(-hx, Math.min(hx, ox)), y = Math.max(-hy, Math.min(hy, oy + drop));
  return { x, y, clamped: x !== ox || y !== oy + drop };
}
function campCamReduced() { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches === true; } catch (e) { return false; } }

// ---- the scene's side ----
const campCamState = s => s.camX || (s.camX = { glide: null, ring: null, g: null, tag: null, tagA: 0 }); // the glide, the ring, its Graphics, the pill's text and its opacity (made when first wanted)
// the camera is on a new ship (eyeSync): e the ship now, sp its sprite, was the id of the one before. true when this took the camera (a glide began, or the follow was started here); false when the scene must start the follow itself
function campCamEye(s, e, sp, was) {
  const cam = s && s.cameras && s.cameras.main, C = s && s.camp; if (!cam || !C || !e || !sp || typeof cam.stopFollow !== 'function' || typeof cam.startFollow !== 'function') return false;
  if (typeof campCockpitOn === 'function' && !campCockpitOn()) return false;
  const X = campCamState(s), taking = !!C.cockpit && e !== C.carrier, red = campCamReduced(), prev = was && C.by ? C.by[was] : null, ringed = taking ? e : prev && prev.hp > 0 && prev !== C.carrier ? prev : null;
  if (s.panned) { s.panned = false; s.dragFly = 0; if (s._cz) s._cz.anchor = null; } // the hand's drag and a focus on another ship have the view: the ship he flies takes it back, as a take always did
  if (typeof campFocusOf === 'function' && campFocusOf(s) && typeof campFocusBreak === 'function') campFocusBreak(s);
  X.ring = ringed ? { kind: taking ? 'in' : 'out', t: 0, id: ringed.id, x: ringed.x, y: ringed.y, still: red } : null;
  if (red || !(CAMPCAM.glide > 0)) { X.glide = null; cam.startFollow(sp, true, CAMPCAM.follow, CAMPCAM.follow); return true; }
  const mid = typeof campFocusMid === 'function' ? campFocusMid(cam) : { x: (cam.scrollX || 0) + W / 2, y: (cam.scrollY || 0) + H / 2 };
  cam.stopFollow(); X.glide = { id: e.id, from: { x: mid.x, y: mid.y }, t: 0 }; // (the glide is the camera's own, as the F key's is: the follow starts when it has arrived)
  return true;
}
// once a frame in play, dt ms: the glide's step, the ring, the pill
function campCamFrame(s, dt) {
  const cam = s && s.cameras && s.cameras.main, C = s && s.camp; if (!cam || !C || !C.carrier) return;
  const X = campCamState(s), d = Math.max(0, Math.min(+dt || 0, 100)), z = cam.zoom > 0 ? cam.zoom : 1;
  const G = X.glide;
  if (G) {
    const u = C.by ? C.by[G.id] : null, sp = u && s.sp ? s.sp[u.id] : null;
    if (!u || u.hp <= 0 || !sp || s.panned || (typeof campFocusOf === 'function' && campFocusOf(s))) { X.glide = null; if (sp && !s.panned && !(typeof campFocusOf === 'function' && campFocusOf(s))) cam.startFollow(sp, true, CAMPCAM.follow, CAMPCAM.follow); } // the ship is gone (eyeSync names the next), or the hand or a focus has the view
    else {
      G.t += d; const at = campCamGlideAt(G.from, u, G.t, CAMPCAM.glide); cam.scrollX = camzoomPutX(at.x - W / 2); cam.scrollY = camzoomPutY(at.y - H / 2);
      if (at.done) { X.glide = null; cam.startFollow(sp, true, CAMPCAM.follow, CAMPCAM.follow); }
    }
  }
  campCamPaint(s, X, C, cam, z, d);
}
function campCamPaint(s, X, C, cam, z, d) {
  const K = CAMPCAM, map = !!s.mp;
  const R = X.ring; // the ring
  if (R) {
    R.t += d; const u = C.by ? C.by[R.id] : null; if (u && u.hp > 0) { R.x = u.x; R.y = u.y; }
    const r = campCamRingAt(R.kind, R.t, R.still);
    if (!r) { X.ring = null; if (X.g) X.g.clear(); }
    else if (s.add) { const g = X.g || (X.g = s.add.graphics().setDepth(K.ring.depth)); g.clear(); g.setVisible(!map); g.lineStyle(K.ring.w / z, K.ring.color, r.a); g.strokeCircle(R.x, R.y, r.r / z); }
  }
  const want = !!C.cockpit && (typeof campCockpitOn !== 'function' || campCockpitOn()) && C.carrier.hp > 0 && !map && s.mode === 'play'; // the pill
  X.tagA = Math.max(0, Math.min(1, X.tagA + (want ? 1 : -1) * d / K.tag.fade));
  if (X.tagA > 0 && s.add && !map) {
    const T = K.tag, tag = X.tag || (X.tag = s.add.text(0, 0, uiText('camp.hud.cruiserauto'), { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: T.size + 'px', fontStyle: '600', color: T.color, backgroundColor: T.fill, padding: { x: 7, y: 3 }, resolution: 2 }).setOrigin(0.5).setDepth(T.depth));
    const mid = typeof campFocusMid === 'function' ? campFocusMid(cam) : { x: (cam.scrollX || 0) + W / 2, y: (cam.scrollY || 0) + H / 2 }, c = C.carrier, sp = s.sp ? s.sp[c.id] : null;
    const half = (sp && sp.displayWidth > 0 ? sp.displayWidth : 44) * 0.3 * z, at = campCamTagAt((c.x - mid.x) * z, (c.y - mid.y) * z, cam.width || W, cam.height || H, half + T.below, T.pad, T.padY);
    tag.setPosition(mid.x + at.x / z, mid.y + at.y / z).setScale(1 / z).setAlpha(T.a * campCamEase(X.tagA)).setVisible(true);
  } else if (X.tag) X.tag.setVisible(false);
}
