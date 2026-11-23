// ---------- Campaign: the target's bracket on the screen (card space-game-two-hands-keys; Troy, 21 Nov 2026) ----------
// The Phaser half of src/camptarget.js. The hostile that [ ] or S picked has a clear bracket round it (four red corners, a slow pulse), and the friend A or D picked one in green (card space-game-bracket-select-orders), however far the view is zoomed out: a bracket never gets smaller than CAMPTGT.minScreen px on the screen.
// Its name, bars, distance and what it is doing are in the target display in the bottom right corner, and the friend's in the friend display in the bottom left one (src/camptdispscene.js). The square is campTgtCorners: the hostile, the friend picked and the fighters of a squad in focus (campaignscene.js squadMarks, in the friend's green; card space-game-friendly-display) are all drawn by it. campTgtPaint(s) is called each frame by the scene; a battle behind a card, the pause or the map shows no bracket.
const CAMPTGT = { color: 0xff6a5a, friend: 0x7dffa0, line: 2, minScreen: 34, pad: 10, arm: 0.42, depth: 8, pulse: 0.35 }; // the colour, the line's width on the SCREEN (px), the bracket's least size on the screen (px across), room round the ship (world px), how much of each side a corner covers, the depth, how far its alpha swings
const campTgtPulse = () => 1 - CAMPTGT.pulse * (0.5 - 0.5 * Math.cos((typeof performance !== 'undefined' ? performance.now() : 0) / 1000 * 4)); // the slow pulse: the alpha now (the same for every marker, so they breathe together)
function campTgtCorners(g, v, col, z, al) { // the square marker round a ship: four corners, as big as the ship and its room, never smaller on the screen than CAMPTGT.minScreen px. The hostile target, the friend and the fighters an order went to all use it (card space-game-friendly-display)
  const K = CAMPTGT, h = Math.max((v.r || 20) + K.pad, K.minScreen / 2 / z), a = h * K.arm;
  g.lineStyle(K.line / z, col, al);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = v.x + sx * h, y = v.y + sy * h; g.lineBetween(x, y, x - sx * a, y); g.lineBetween(x, y, x, y - sy * a); });
}
function campTgtPaint(s) {
  if (!s || !s.add || !s.camp) return;
  if (!s.tgtG || (s.tgtG.active === false && !s.tgtG.scene)) s.tgtG = s.add.graphics().setDepth(CAMPTGT.depth); // a scene that starts again (a retry, the next mission) destroys its layers: the old graphics is not active and has no scene, and a new one is made
  const g = s.tgtG; g.clear();
  const play = s.mode === 'play' && !s.mp, K = CAMPTGT, z = s.cameras && s.cameras.main && s.cameras.main.zoom > 0 ? s.cameras.main.zoom : 1, al = campTgtPulse();
  const pk = play && typeof campSelUnits === 'function' ? campSelUnits(s.camp) : null; // the enemy (red), the pilot picked and the friendly ship picked (green); All pilots has no one bracket
  [[pk && pk.hostile, K.color], [pk && pk.who, K.friend], [pk && pk.friendly, K.friend]].forEach(([v, col]) => { if (v) campTgtCorners(g, v, col, z, al); });
}
