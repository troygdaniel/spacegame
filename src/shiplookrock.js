// ---------- The new ship look, the rocks (card space-game-b3-e-flat-rocks; Troy approved the cloud brief of 28 Nov 2026, part 3 item 9: "rocks are drawn flat cut: one polygon and one darker facet, in a neutral grey, painted once into the sheet") ----------
// The rocks of the Campaign's asteroid fields (and the briefing's picture of a rock) are drawn in the same flat cut as the ships (src/shiplook.js, src/shiplookdraw.js): ONE straight-edged polygon in a neutral grey, a thin dark rim, and ONE
// darker facet on the side away from the light, with none of the gradient, craters, speckle and glowing ore veins of the boulder the Long Haul draws (src/art_world.js waAsteroid, which the Long Haul keeps: the Campaign gets its own
// keys, look-rock-0 to look-rock-2, like the ships' look-<kind>-<side>). Painted ONCE into a texture made in code (no image file), 64 by 64 like the boulders it replaces, so the scale a rock is drawn at (its radius times 2.4 over 64), its hit circle, its ore and the
// effect of its breaking are exactly as they were: only the picture changes. The three variants are the three the Campaign already picked by a rock's id.
// Behind the same switch as the ships (slookOn(): on for everyone since card space-game-ship-look-default-on; ?shiplook=0 is the tests' and the comparison's way back): with it off nothing here runs and the old boulders are drawn.
//   slookRockPoints(i)         PURE: the outline of variant i (0 to 2) as [[x, y], ...] in the 64 by 64 picture, clockwise, from a seeded generator (no Math.random: the same rock every run)
//   slookRockFacet(i)          PURE: the darker facet: the corners of the outline that face away from the light (the lower right), joined by a straight cut: [[x, y], ...], each of them a corner of the outline
//   slookRockColors()          PURE: { fill, facet } as '#rrggbb': a neutral grey (#7b8591) and the darker facet (#4a525d), the world look mock's rock colours, so a rock is not mistaken for a neutral ship (SLOOK.C.neutral is a blue-grey)
//   slookRockTexture(scene, i) the texture key of variant i, made on first use ('' when the scene has no Phaser to draw with)
//   slookRockKey(scene, id)    the texture key for the rock or pickup whose id is 'rock-<n>' while the look is on, '' when it is off (the caller keeps the old boulder's key then): variant n mod 3
const SLOOKROCK = {
  n: 3,                          // the variants: the Campaign picks one by the rock's number
  size: 64,                      // the picture's side, px (the boulders' too)
  sides: 9,                      // corners of the outline
  r: 24, jitter: 0.18,           // the middle radius (px) and how far a corner may stray from it (a share of it): 20 to 28 px, the boulders' own spread
  seed: 515,                     // the generator's seed (the boulders' too, plus 7 for each variant)
  light: Math.PI / 4,            // the direction the facet faces, as an angle on the screen (y runs down): the lower right, the boulders' light came from the upper left
  span: 1.5,                     // how far (rad) from that direction a corner may be and still belong to the facet: about 86 degrees either side (a cap of the rock a fifth to a third of its area)
  fill: '#7b8591', facet: '#4a525d', // the grey and the darker facet: the world look mock's own rock and rockD (docs/world-look-mock.html, its C table; the first pick was the neutral blue-grey #9fb3c8 toward the dark, and the mock's grey is the same family without the blue): a neutral grey, not a ship's colour, so a rock is not taken for a neutral ship
  rim: { k: 0.03, least: 1 }     // the dark rim's width: a share of the picture's side, and its least (px); its colour is the ships' (SLOOK.rim)
};
function slookRockRng(seed) { // a small seeded generator (mulberry32): the same list of numbers for the same seed
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function slookRockPoints(i) {
  const K = SLOOKROCK, rnd = slookRockRng(K.seed + 7 * (((i | 0) % K.n + K.n) % K.n)), c = K.size / 2, off = rnd() * Math.PI * 2, out = [];
  for (let k = 0; k < K.sides; k++) {
    const a = off + (k + (rnd() - 0.5) * 0.5) / K.sides * Math.PI * 2, r = K.r * (1 + (rnd() * 2 - 1) * K.jitter);
    out.push([Math.round((c + Math.cos(a) * r) * 100) / 100, Math.round((c + Math.sin(a) * r) * 100) / 100]);
  }
  return out;
}
function slookRockFacet(i) {
  const K = SLOOKROCK, P = slookRockPoints(i), c = K.size / 2, turn = a => Math.abs(Math.atan2(Math.sin(a - K.light), Math.cos(a - K.light)));
  const near = P.map((p, k) => ({ k, d: turn(Math.atan2(p[1] - c, p[0] - c)) })).filter(q => q.d <= K.span).map(q => q.k);
  // at least three corners (the nearest three when fewer face the light's far side), in the outline's own order
  const pick = near.length >= 3 ? near : P.map((p, k) => ({ k, d: turn(Math.atan2(p[1] - c, p[0] - c)) })).sort((a, b) => a.d - b.d).slice(0, 3).map(q => q.k).sort((a, b) => a - b);
  return pick.map(k => P[k].slice());
}
function slookRockColors() { return { fill: SLOOKROCK.fill, facet: SLOOKROCK.facet }; }
function slookRockTexture(scene, i) {
  if (!scene || !scene.textures || !scene.make) return '';
  const K = SLOOKROCK, n = ((i | 0) % K.n + K.n) % K.n, key = 'look-rock-' + n;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false }), col = slookRockColors(), path = pts => { g.beginPath(); pts.forEach((p, j) => { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); };
  path(slookRockPoints(n)); g.fillStyle(slookInt(col.fill), 1); g.fillPath();
  g.lineStyle(Math.max(K.rim.least, K.size * K.rim.k), 0x050810, 0.9); g.strokePath(); // the ships' rim (SLOOK.rim: rgba(5,8,14,.9))
  path(slookRockFacet(n)); g.fillStyle(slookInt(col.facet), 1); g.fillPath();
  g.generateTexture(key, K.size, K.size); g.destroy();
  return key;
}
function slookRockKey(scene, id) { // the key for 'rock-<n>' while the look is on; '' when it is off (the old boulder: the caller's own key)
  if (typeof slookOn !== 'function' || !slookOn()) return '';
  const n = parseInt(String(id).split('-')[1], 10);
  return slookRockTexture(scene, n >= 0 ? n % SLOOKROCK.n : 0);
}
