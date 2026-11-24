// ---------- Campaign: the target's bracket on the screen (card space-game-two-hands-keys; Troy, 21 Nov 2026) ----------
// The Phaser half of src/camptarget.js. The hostile that [ ] or S picked has a clear bracket round it (four red corners, a slow pulse), and the friend A or D picked one in green (card space-game-bracket-select-orders), however far the view is zoomed out: a bracket never gets smaller than CAMPTGT.minScreen px on the screen.
// The squares on the pilots WHO is and on the target held come and go (card space-game-pilot-squares-fade): campMarkNow (src/camptarget.js) gives each its strength, full for 3 s after a pick or an order and then a fade; the target stays held and its box stays.
// Its name, bars, distance and what it is doing are in the target display in the bottom right corner, and the friend's in the friend display in the bottom left one (src/camptdispscene.js). The square is campTgtCorners: the hostile, the friend picked and the fighters of a squad in focus (campaignscene.js squadMarks, in the friend's green; card space-game-friendly-display) are all drawn by it. campTgtPaint(s) is called each frame by the scene; a battle behind a card, the pause or the map shows no bracket.
const CAMPTGT = { color: 0xff6a5a, friend: 0x7dffa0, line: 2, minScreen: 34, pad: 10, arm: 0.42, depth: 8, pulse: 0.35 }; // the colour, the line's width on the SCREEN (px), the bracket's least size on the screen (px across), room round the ship (world px), how much of each side a corner covers, the depth, how far its alpha swings
const campTgtPulse = () => 1 - CAMPTGT.pulse * (0.5 - 0.5 * Math.cos((typeof performance !== 'undefined' ? performance.now() : 0) / 1000 * 4)); // the slow pulse: the alpha now (the same for every marker, so they breathe together)
function campTgtCorners(g, v, col, z, al, drawn) { // the square marker round a ship: four corners, as big as the ship and its room, never smaller on the screen than CAMPTGT.minScreen px. The hostile target, the friend and the fighters an order went to all use it (card space-game-friendly-display). drawn: how long the ship is DRAWN in the world, when the far view holds it up to its least size (campTgtDrawn; card space-game-ships-bigger): the square clears the bigger picture; none (or a ship drawn at its own size) leaves the square as it always was
  // Each arm is a thin filled rectangle (K.line px on the screen across, the length of the arm), not a line: the arms run along the screen's axes, so the picture is the line's, butt ends and all, and a rectangle goes to the batch
  // as it is where Phaser makes a path of every line and builds it again at every render. With All pilots the default, three squares are on from the first frame (card space-game-perf-after-keys: 24 lines, 65 KB of garbage a frame).
  const K = CAMPTGT, h = Math.max((v.r || 20) + K.pad, K.minScreen / 2 / z, drawn > 0 ? drawn / 2 + K.pad : 0), a = h * K.arm, w = K.line / z, hw = w / 2;
  g.fillStyle(col, al);
  for (let i = 0; i < 4; i++) { // the corners in the order they were always drawn: top left, top right, bottom right, bottom left
    const sx = i === 0 || i === 3 ? -1 : 1, sy = i < 2 ? -1 : 1, x = v.x + sx * h, y = v.y + sy * h;
    g.fillRect(sx < 0 ? x : x - a, y - hw, a, w); // the arm along the top or bottom edge, from the corner inwards
    g.fillRect(x - hw, sy < 0 ? y : y - a, w, a); // the arm along the side
  }
}
// how long a ship's picture is in the world when the far view holds it up (its sprite's scale _k over 1: src/campaignscene.js sync, src/campzoom.js campZoomShipScale), else 0: the square round it then is the one it always was
const campTgtDrawn = (s, v) => { const sp = s && s.sp && v ? s.sp[v.id] : null; return sp && sp._k > 1 && sp.displayWidth > 0 ? Math.max(sp.displayWidth, sp.displayHeight || 0) : 0; };
function campTgtPaint(s) {
  if (!s || !s.add || !s.camp) return;
  if (!s.tgtG || (s.tgtG.active === false && !s.tgtG.scene)) s.tgtG = s.add.graphics().setDepth(CAMPTGT.depth); // a scene that starts again (a retry, the next mission) destroys its layers: the old graphics is not active and has no scene, and a new one is made
  const g = s.tgtG; g.clear();
  const play = s.mode === 'play' && !s.mp, K = CAMPTGT, z = s.cameras && s.cameras.main && s.cameras.main.zoom > 0 ? s.cameras.main.zoom : 1, al = campTgtPulse();
  const pk = play && typeof campSelUnits === 'function' ? campSelUnits(s.camp) : null; // the enemy (red) and the friendly ship picked (green), and WHO (green): the pilot picked, or all three pilots when All pilots is picked (card space-game-keys2-panels)
  const who = pk ? (pk.who ? [pk.who] : (pk.whoShips || [])) : [];
  const mk = pk && typeof campMarkNow === 'function' ? campMarkNow(s.camp) : { who: 1, held: 1 }; // the squares come and go (card space-game-pilot-squares-fade): CAMP.mark.show ms after a pick or an order, then a fade; the target stays held and its box stays
  [[pk && pk.hostile, K.color, al * mk.held], [pk && pk.friendly, K.friend, al * mk.held]].concat(who.map(u => [u, K.friend, al * mk.who])).forEach(([v, col, a]) => { if (v && v.hp > 0 && a > 0) campTgtCorners(g, v, col, z, a, campTgtDrawn(s, v)); });
}
