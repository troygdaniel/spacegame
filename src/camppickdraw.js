// ---------- Campaign: the target pick shown in the flight view (card space-game-order-target-pick; Troy, 22 Nov 2026) ----------
// The Phaser half of src/camppick.js. While a target sub-list is open, the candidate the highlight is on is REVEALED in the flight view: a clear bracket round it (cyan, the fleet lists' colour, and bigger and slower than the target's red
// bracket of src/camptargetdraw.js, so a candidate is not taken for the target), and when it is off the screen the view zooms out just far enough to show it with the cruiser. The camera follows the cruiser, so zooming out is the way to
// bring something far into view; it is never zoomed IN. Moving the highlight moves the reveal; leaving the list (an order, Esc, the list's key) puts the zoom back where the player had it (a zoom the player makes meanwhile, with + - or the
// wheel, is the one that is put back). After an order the bracket stays CAMP_PICK.seen ms on what it was given at. A battle behind a card, the pause or the map shows none, and gives the zoom back.
//   campPickPaint(s)   called every frame by the scene (src/campaignscene.js), after the target's bracket
const CAMPPICKDRAW = { color: 0x7fe9ff, line: 3, minScreen: 60, pad: 22, arm: 0.36, depth: 9, pulse: 0.3 }; // the colour, the line's width on the SCREEN (px), the bracket's least size on the screen (px across), room round the candidate (world px), how much of each side a corner covers, the depth, how far its alpha swings
// the zoom of the reveal: `it` is the highlighted candidate of an open sub-list, or null (the zoom goes back to what the player had)
function campPickZoom(s, it) {
  if (typeof CAMZOOM === 'undefined' || typeof camzoomClamp !== 'function') return;
  const Z = s.pickZoom;
  if (!it) { if (Z) { CAMZOOM.want = Z.was; s.pickZoom = null; } return; }
  if (!Z) s.pickZoom = { was: CAMZOOM.want, set: CAMZOOM.want };
  else if (Math.abs(CAMZOOM.want - Z.set) > 1e-9) Z.was = CAMZOOM.want; // the player zoomed by hand meanwhile: that is the zoom to give back
  const want = camzoomClamp(Math.min(s.pickZoom.was, campPickFit(s.camp, it))); // out when it does not fit, never in; the mission's farthest zoom is the limit (camzoomClamp)
  CAMZOOM.want = s.pickZoom.set = want;
}
function campPickPaint(s) {
  if (!s || !s.add || !s.camp || typeof campPickShown !== 'function') return;
  const K = CAMPPICKDRAW;
  if (!s.pickG || (s.pickG.active === false && !s.pickG.scene)) s.pickG = s.add.graphics().setDepth(K.depth); // a scene that starts again destroys its layers: the old graphics is not active and has no scene, and a new one is made
  const g = s.pickG; g.clear();
  const P = s.pn, now = (s.time && s.time.now) || 0, it = P && s.mode === 'play' && !s.mp ? campPickShown(P, s.camp, now) : null;
  campPickZoom(s, it && P.pick ? it : null); // only an open sub-list zooms; the bracket of an order just given does not move the view
  if (!it) return;
  const z = s.cameras && s.cameras.main && s.cameras.main.zoom > 0 ? s.cameras.main.zoom : 1;
  const h = Math.max((it.r || 20) + K.pad, K.minScreen / 2 / z), a = h * K.arm, t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000, al = 1 - K.pulse * (0.5 - 0.5 * Math.cos(t * 3));
  g.lineStyle(K.line / z, K.color, al);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = it.x + sx * h, y = it.y + sy * h; g.lineBetween(x, y, x - sx * a, y); g.lineBetween(x, y, x, y - sy * a); });
}
