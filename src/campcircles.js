// ---------- Campaign: a circle is a small polygon, not Phaser's arc (card perf-fights; Troy: "the big fights feel slow") ----------
// Phaser builds a Graphics' shapes into triangles again at EVERY render, and its circle (fillCircle, strokeCircle: an arc command) is cut into a path of hundreds of points whatever its size: a 3 px radar dot
// costs what a 300 px ring costs. In a fight the Campaign draws about sixty circles a frame (a dot for every ship on the radar, two for each of the eight turret mounts, the bays' glow, the turrets' reach) and
// they were most of the 2 MB a frame the scene allocated, which the collector then has to clear several times a second (docs/PERF-FIGHTS.md has the numbers). Here a circle of a Campaign scene is drawn as a regular
// polygon (a filled one as a fan of triangles, which Phaser batches as they are; an outline as a closed line) with as many corners as its size needs: ten for a dot, up to 96 for the largest ring, so that its edge is never more than half a pixel off a true circle at the size it is given.
// Nothing else changes: the same calls, the same colours and widths, the same place. Long Haul's scenes keep Phaser's own circles (it is not being changed).
//   campDisc(g, x, y, r)          a filled circle on any Graphics, the cheap way (the fill style is the Graphics' own: set it first); for new drawing (a health bar's end, a mark): call this, not fillCircle
//   campRing(g, x, y, r)          its outline, the cheap way (the line style is the Graphics' own): a squad's ring, a reach, a bracket
//   campCircleSides(r)            how many corners a circle of radius r gets: 10 to 96, about 3.3 times the square root of r (the edge then strays 0.45 px at most)
//   campCirclePoints(x, y, r)     the corners, [{ x, y }], in a list that is used again by the next call (read it at once: fillPoints and strokePoints do)
//   CAMPCIRCLES.scenes            the scenes whose Graphics draw circles this way
// ROUNDED RECTANGLES (card space-game-perf-after-keys): the same goes for fillRoundedRect and strokeRoundedRect. Phaser makes each one a path of arcs and triangulates it again at every render; the All pilots box (bottom left),
// which is on from the first frame now, cost 250 KB a frame of garbage and 0.2 ms for its frame alone. In a Campaign scene a rounded rectangle is a polygon of four quarter circles cut into a few corners each (the edge strays
// under a quarter of a pixel), filled as a fan of triangles and outlined as a closed line.
//   campRoundRectSides(r)         the corners of one quarter circle (the two ends included are counted once each): 3 to 8
//   campRoundRectPoints(x, y, w, h, r)   the polygon, [{ x, y }] in a list that is used again by the next call; the radius is held to half the shorter side
//   campRoundRect(g, x, y, w, h, r)      a filled rounded rectangle on any Graphics, the cheap way; campRoundRectLine(g, x, y, w, h, r) its outline
const CAMPCIRCLES = { min: 10, max: 96, k: 3.3, scenes: { Campaign: 1, CampHub: 1, CampWarp: 1 }, pool: [], out: [] };
const campCircleSides = r => Math.max(CAMPCIRCLES.min, Math.min(CAMPCIRCLES.max, Math.ceil(CAMPCIRCLES.k * Math.sqrt(Math.max(0, +r || 0)))));
function campCirclePoints(x, y, r) {
  const K = CAMPCIRCLES, n = campCircleSides(r), out = K.out; out.length = n;
  for (let i = 0; i < n; i++) { const p = K.pool[i] || (K.pool[i] = { x: 0, y: 0 }), a = Math.PI * 2 * i / n; p.x = x + Math.cos(a) * r; p.y = y + Math.sin(a) * r; out[i] = p; }
  return out;
}
// the two shapes, for anyone to call on any Graphics (a stand-in Graphics in a test too: only fillTriangle and strokePoints are asked of it)
function campDisc(g, x, y, r) { // a fan of triangles from the first corner: fillTriangle goes straight to the batch, with no path to build and nothing to triangulate
  if (!g || !(r > 0)) return g;
  const pts = campCirclePoints(x, y, r), a = pts[0];
  for (let i = 1; i < pts.length - 1; i++) g.fillTriangle(a.x, a.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  return g;
}
function campRing(g, x, y, r) { return g && r > 0 ? g.strokePoints(campCirclePoints(x, y, r), true, true) : g; } // one closed line through the corners
const CAMPROUND = { min: 3, max: 8, k: 1.25, pool: [], out: [] };
const campRoundRectSides = r => Math.max(CAMPROUND.min, Math.min(CAMPROUND.max, Math.ceil(CAMPROUND.k * Math.sqrt(Math.max(0, +r || 0)))));
function campRoundRectPoints(x, y, w, h, r) { // clockwise from the top edge's left end; a radius of 0 is the four corners of a plain rectangle
  const K = CAMPROUND, out = K.out, rr = Math.max(0, Math.min(+r || 0, Math.abs(w) / 2, Math.abs(h) / 2)), n = rr > 0 ? campRoundRectSides(rr) : 1;
  const cs = [[x + w - rr, y + rr, -Math.PI / 2], [x + w - rr, y + h - rr, 0], [x + rr, y + h - rr, Math.PI / 2], [x + rr, y + rr, Math.PI]]; // each corner's centre and where its quarter turn starts
  let k = 0; out.length = 0;
  for (let c = 0; c < 4; c++) for (let i = 0; i <= (rr > 0 ? n : 0); i++) {
    const p = K.pool[k] || (K.pool[k] = { x: 0, y: 0 }), a = cs[c][2] + (Math.PI / 2) * (n ? i / n : 0);
    p.x = cs[c][0] + Math.cos(a) * rr; p.y = cs[c][1] + Math.sin(a) * rr; out[k++] = p;
  }
  return out;
}
function campRoundRect(g, x, y, w, h, r) { // a fan of triangles from the first corner (the shape is convex)
  if (!g || !(w > 0) || !(h > 0)) return g;
  const pts = campRoundRectPoints(x, y, w, h, r), a = pts[0];
  for (let i = 1; i < pts.length - 1; i++) g.fillTriangle(a.x, a.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  return g;
}
function campRoundRectLine(g, x, y, w, h, r) { return g && w > 0 && h > 0 ? g.strokePoints(campRoundRectPoints(x, y, w, h, r), true, true) : g; }
(function () { // the two calls of Phaser's Graphics, for the Campaign's scenes only (a page with no Phaser, a test in plain Node, has nothing to change)
  const G = typeof Phaser === 'object' && Phaser && Phaser.GameObjects && Phaser.GameObjects.Graphics; if (!G || G.prototype.__campCircles) return;
  const P = G.prototype, fill0 = P.fillCircle, stroke0 = P.strokeCircle, mine = g => !!(g.scene && g.scene.sys && CAMPCIRCLES.scenes[g.scene.sys.settings.key]);
  P.fillCircle = function (x, y, r) { return mine(this) && r > 0 ? campDisc(this, x, y, r) : fill0.call(this, x, y, r); };
  P.strokeCircle = function (x, y, r) { return mine(this) && r > 0 ? campRing(this, x, y, r) : stroke0.call(this, x, y, r); };
  const rfill0 = P.fillRoundedRect, rstroke0 = P.strokeRoundedRect, plain = (w, h, r) => typeof r === 'number' && w > 0 && h > 0; // a radius that is an object (one per corner) or a rectangle with no size is Phaser's own
  P.fillRoundedRect = function (x, y, w, h, r) { return mine(this) && plain(w, h, r === undefined ? 20 : r) ? campRoundRect(this, x, y, w, h, r === undefined ? 20 : r) : rfill0.call(this, x, y, w, h, r); };
  P.strokeRoundedRect = function (x, y, w, h, r) { return mine(this) && plain(w, h, r === undefined ? 20 : r) ? campRoundRectLine(this, x, y, w, h, r === undefined ? 20 : r) : rstroke0.call(this, x, y, w, h, r); };
  P.__campCircles = true;
})();
