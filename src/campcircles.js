// ---------- Campaign: a circle is a small polygon, not Phaser's arc (card perf-fights; Troy: "the big fights feel slow") ----------
// Phaser builds a Graphics' shapes into triangles again at EVERY render, and its circle (fillCircle, strokeCircle: an arc command) is cut into a path of hundreds of points whatever its size: a 3 px radar dot
// costs what a 300 px ring costs. In a fight the Campaign draws about sixty circles a frame (a dot for every ship on the radar, two for each of the eight turret mounts, the bays' glow, the turrets' reach) and
// they were most of the 2 MB a frame the scene allocated, which the collector then has to clear several times a second (docs/PERF-FIGHTS.md has the numbers). Here a circle of a Campaign scene is drawn as a regular
// polygon (a filled one as a fan of triangles, which Phaser batches as they are; an outline as a closed line) with as many corners as its size needs: ten for a dot, up to 96 for the largest ring, so that its edge is never more than half a pixel off a true circle at the size it is given.
// Nothing else changes: the same calls, the same colours and widths, the same place. Long Haul's scenes keep Phaser's own circles (it is not being changed).
//   campCircleSides(r)            how many corners a circle of radius r gets: 10 to 96, about 3.3 times the square root of r (the edge then strays 0.45 px at most)
//   campCirclePoints(x, y, r)     the corners, [{ x, y }], in a list that is used again by the next call (read it at once: fillPoints and strokePoints do)
//   CAMPCIRCLES.scenes            the scenes whose Graphics draw circles this way
const CAMPCIRCLES = { min: 10, max: 96, k: 3.3, scenes: { Campaign: 1, CampHub: 1, CampWarp: 1 }, pool: [], out: [] };
const campCircleSides = r => Math.max(CAMPCIRCLES.min, Math.min(CAMPCIRCLES.max, Math.ceil(CAMPCIRCLES.k * Math.sqrt(Math.max(0, +r || 0)))));
function campCirclePoints(x, y, r) {
  const K = CAMPCIRCLES, n = campCircleSides(r), out = K.out; out.length = n;
  for (let i = 0; i < n; i++) { const p = K.pool[i] || (K.pool[i] = { x: 0, y: 0 }), a = Math.PI * 2 * i / n; p.x = x + Math.cos(a) * r; p.y = y + Math.sin(a) * r; out[i] = p; }
  return out;
}
(function () { // the two calls of Phaser's Graphics, for the Campaign's scenes only (a page with no Phaser, a test in plain Node, has nothing to change)
  const G = typeof Phaser === 'object' && Phaser && Phaser.GameObjects && Phaser.GameObjects.Graphics; if (!G || G.prototype.__campCircles) return;
  const P = G.prototype, fill0 = P.fillCircle, stroke0 = P.strokeCircle, mine = g => !!(g.scene && g.scene.sys && CAMPCIRCLES.scenes[g.scene.sys.settings.key]);
  P.fillCircle = function (x, y, r) { // a fan of triangles from the first corner: fillTriangle goes straight to the batch, with no path to build and nothing to triangulate
    if (!mine(this) || !(r > 0)) return fill0.call(this, x, y, r);
    const pts = campCirclePoints(x, y, r), a = pts[0];
    for (let i = 1; i < pts.length - 1; i++) this.fillTriangle(a.x, a.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    return this;
  };
  P.strokeCircle = function (x, y, r) { return mine(this) && r > 0 ? this.strokePoints(campCirclePoints(x, y, r), true, true) : stroke0.call(this, x, y, r); };
  P.__campCircles = true;
})();
