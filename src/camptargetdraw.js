// ---------- Campaign: the target's bracket on the screen (card space-game-two-hands-keys; Troy, 21 Nov 2026) ----------
// The Phaser half of src/camptarget.js. The ship that A, D or S picked has a clear bracket round it (four red corners, a slow pulse), however far the view is zoomed out: the bracket never gets smaller than CAMPTGT.minScreen px on the screen.
// Its name and distance are on the target's line under the radar (src/campanelsdraw.js). campTgtPaint(s) is called each frame by the scene; a battle behind a card, the pause or the map shows no bracket.
const CAMPTGT = { color: 0xff6a5a, line: 2, minScreen: 34, pad: 10, arm: 0.42, depth: 8, pulse: 0.35 }; // the colour, the line's width on the SCREEN (px), the bracket's least size on the screen (px across), room round the ship (world px), how much of each side a corner covers, the depth, how far its alpha swings
function campTgtPaint(s) {
  if (!s || !s.add || !s.camp) return;
  if (!s.tgtG) s.tgtG = s.add.graphics().setDepth(CAMPTGT.depth);
  const g = s.tgtG; g.clear();
  const u = s.mode === 'play' && !s.mp && typeof campTgtNow === 'function' ? campTgtNow(s.camp) : null; if (!u) return;
  const K = CAMPTGT, z = s.cameras && s.cameras.main && s.cameras.main.zoom > 0 ? s.cameras.main.zoom : 1;
  const h = Math.max((u.r || 20) + K.pad, K.minScreen / 2 / z), a = h * K.arm, t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000, al = 1 - K.pulse * (0.5 - 0.5 * Math.cos(t * 4));
  g.lineStyle(K.line / z, K.color, al);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = u.x + sx * h, y = u.y + sy * h; g.lineBetween(x, y, x - sx * a, y); g.lineBetween(x, y, x, y - sy * a); });
}
