// ---------- The new ship look, the picked ring and the hull arc (landing B of the ship look; card space-game-ship-look-b-ring-arc; stub made by landing F) ----------
// Troy, 25 Nov 2026 (decisions 2 and 3 of the report on card space-game-ship-look-scope; the mock is docs/ship-look-mock.html, which is right where this file differs): the picked ship sits in a BRIGHT RING (the HUD's mark
// for a picked pilot: src/camppagehud.js) and the green corners and the red hostile bracket go; the hull is an ARC of a ring round a ship that is hurt or picked: green above 60 percent, amber to 30, pink under (slookArcColor),
// on a faint full ring, starting at twelve o'clock and running clockwise as far as the hull is full. The health line over the ships you protect goes (src/campchargescene.js); its percentage stays, for 4 s after a hit,
// beside the arc. Everything is behind slookOn() (CAMP.flags.shiplook, the N panel's row, ?shiplook=): with the switch off nothing here is called and nothing changes.
// The size is the table's (src/shiplook.js slookRingR and slookPickR, the mock's R = 0.66 L + 4 and the ring 4.5 outside it) with the ship's length L on the SCREEN, in px, so a ship has the same marks at every zoom; a ring never
// gets smaller than the bracket's least size (CAMPTGT.minScreen across) so a pilot seen from far away is still ringed. The ring and the arc are drawn as polygon circles (src/campcircles.js: Phaser's own arc is the slow path), on
// the target layer's Graphics (src/camptargetdraw.js campTgtPaint, one call each frame) for the picked ships and the hurt ships on the screen, and nothing for the others.
//   slookMarkLen(s, u)              a ship's length in WORLD px as it is drawn: its sprite's (the far view's least size is in it), else the table's play size, else twice its radius
//   slookMarkR(Ls)                  the arc's radius in screen px for a ship Ls px long on the screen: slookRingR, and not under the least size of the bracket less the ring's gap
//   slookHurt(u)                    does the unit get an arc when it is not picked: a ship of the look table, alive, with a hull under 1
//   slookArcPoints(x, y, r, frac)   the corners of an arc from twelve o'clock clockwise, a share frac of the turn, [{ x, y }] in a list that the next call uses again (read it at once)
//   slookMarksBegin(s)              the frame's start (campTgtPaint): a new count, so a ship's arc is drawn once however many marks name it
//   slookArcDraw(g, s, u, z)        one ship's track and arc on a Graphics (z: the camera's zoom); once a frame for a ship
//   slookPickMark(g, v, col, z, al, drawn, s)   the bright ring of a picked ship (and its arc, when nothing drew that yet this frame): what campTgtCorners drew; al is the strength the fade and the pulse give
//   slookArcsPaint(g, s, z)         the arcs of every hurt ship on the screen that has none yet this frame
//   slookHullColor(frac)            the arc's colour as a number (the percentage beside it has the same)
const SLOOKMARK = { pool: [], out: [], margin: 24 }; // the corner points used again, and how far off the screen a ship's mark is still drawn (px)
const slookHullColor = frac => slookInt(slookArcColor(frac));
function slookMarkLen(s, u) {
  const sp = s && s.sp && u ? s.sp[u.id] : null, k = u && typeof SLOOK === 'object' ? SLOOK.K[u.kind] : null;
  if (sp && sp.displayWidth > 0) return Math.max(sp.displayWidth, sp.displayHeight || 0);
  return k && k.px ? k.px : 2 * ((u && u.r) || 14);
}
const slookMarkR = Ls => Math.max(slookRingR(Ls, 1), (typeof CAMPTGT === 'object' ? CAMPTGT.minScreen : 34) / 2 - SLOOK.ring.gap); // screen px: the arc's radius; the picked ring is SLOOK.ring.gap outside it
const slookHull = u => Math.max(0, Math.min(1, u.hp / (u.maxHp || u.hp || 1)));
const slookHurt = u => !!u && u.hp > 0 && !u.gone && !!SLOOK.K[u.kind] && slookHull(u) < 1;
function slookArcPoints(x, y, r, frac) { // a closed turn is the same corners as campCirclePoints: the number of corners is the circle's, a share of it for the arc
  const K = SLOOKMARK, n = campCircleSides(r), m = Math.max(2, Math.ceil(n * Math.max(0, Math.min(1, frac)))), out = K.out; out.length = m + 1;
  for (let i = 0; i <= m; i++) { const p = K.pool[i] || (K.pool[i] = { x: 0, y: 0 }), a = -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, frac)) * i / m; p.x = x + Math.cos(a) * r; p.y = y + Math.sin(a) * r; out[i] = p; }
  return out;
}
function slookMarksBegin(s) { if (s) s.slookGen = (s.slookGen || 0) + 1; }
function slookArcDraw(g, s, u, z) {
  if (!g || !u) return false;
  const gen = s && s.slookGen || 0, seen = s && (s.slookArcs || (s.slookArcs = {})); if (seen && gen && seen[u.id] === gen) return false; if (seen) seen[u.id] = gen; // (once a frame: the ring of a picked ship and the hurt pass both name it)
  const A = SLOOK.arc, f = slookHull(u), R = slookMarkR(slookMarkLen(s, u) * z) / z, w = A.w / z;
  g.lineStyle(w, 0xffffff, 0.13); campRing(g, u.x, u.y, R); // the faint full ring behind the arc
  g.lineStyle(w, slookHullColor(f), 1);
  if (f >= 1) campRing(g, u.x, u.y, R); else if (f > 0) g.strokePoints(slookArcPoints(u.x, u.y, R, f), false, false);
  return true;
}
function slookPickMark(g, v, col, z, al, drawn, s) {
  if (!g || !v) return g;
  const R = slookMarkR(slookMarkLen(s, v) * z), r = (R + SLOOK.ring.gap) / z;
  slookArcDraw(g, s, v, z);
  g.lineStyle(SLOOK.ring.w / z, slookInt(SLOOK.ring.color), al > 0 ? Math.min(1, al) : 1); campRing(g, v.x, v.y, r); // the bright ring: the HUD's outline of a picked pilot
  return g;
}
function slookArcsPaint(g, s, z) {
  const C = s && s.camp, cam = s && s.cameras && s.cameras.main; if (!g || !C || !C.ships || !cam) return 0;
  const K = SLOOKMARK, sx0 = cam.scrollX || 0, sy0 = cam.scrollY || 0; let n = 0;
  C.ships.forEach(u => {
    if (!slookHurt(u)) return;
    const sx = (u.x - sx0 - W / 2) * z + W / 2, sy = (u.y - sy0 - H / 2) * z + H / 2, m = slookMarkR(slookMarkLen(s, u) * z) + K.margin;
    if (sx < -m || sx > W + m || sy < -m || sy > H + m) return; // off the screen: nothing is drawn for it
    if (slookArcDraw(g, s, u, z)) n++;
  });
  return n;
}
