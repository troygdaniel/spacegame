// ---------- Campaign: mission objects, ore and the beams in the world look (card space-game-world-w4-objects; piece W4 of the world look; Troy approved it on 25 Nov 2026; the mock is docs/world-look-mock.html, direction 1, its obj() function) ----------
// With the world look on (campWorldOn, src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0 for today's) the things of a mission are drawn in the HUD's own language: GOLD is the goal, a DASHED ring is a thing not yet done, a SOLID arc is
// progress. Gold appears in the world only on a goal (the HUD's gold: the mock's #e9b872); white is for what is not a goal; the player's pale blue and mint are the player's own.
//   a cache (level 2): a gold diamond in a thin gold ring (a baked picture, `wlook-cache`);   a cloaked cache and an anomaly: a white dashed ring and an empty diamond, shown from the same range and with the same fade as the haze they replace (campAnomHaze),
//   the visit's arc filling in white (it is not a goal); once found it is a cache: gold, as the mock says (Troy's call, 25 Nov);   the relic: a gold hexagon, a dim ring at the game's radius (240) and the hold as a gold arc filling it;
//   a scan point (level 3): a dashed gold ring at the game's radius with a solid gold arc for the part scanned (t over secs): new, the world drew nothing for it before;   ore: three small pale shards (a baked picture, `wlook-ore`);
//   the mining laser: one thin pale-blue line (the player's #6fd6ff) with a white dot where it lands;   the turret beam at an alien: one thin line in MINT (the player's fire, #7df0c0): the one beam function is split in two (Troy's call, 25 Nov).
// Only pictures change: no radius, range, time or rule is touched (the rings are drawn at the radii the rules already have). The Campaign only: the Long Haul's painters (src/art_world.js: `ore`, `asteroid`; src/boot.js: `pod`) are never changed or
// asked; these are new textures under their own keys (wlook-cache, wlook-ore) painted once, lazily, and Graphics drawn on the Campaign's own objects. Line widths are in px ON THE SCREEN (kept as the view zooms, in world px of width / zoom, at most wMax).
//   campWorldCacheTexture(sc), campWorldOreTexture(sc)      the keys of the two baked pictures, made once;   campWorldCacheImage(scene, k) / campWorldOreImage(scene, o)   the sprite for a cache / a piece of ore, or null while the look is off
//   campWorldRelicDraw(g, R, L, zoom)     the relic and its hold on a cleared Graphics;   campWorldScans(C)   PURE: the scan points still to do as [{ x, y, r, frac }];   campWorldScanSync(scene)   the scan rings, each frame
//   campWorldAnomDraw(g, C, view, now, zoom)   the anomalies and the found caches, instead of campAnomDraw;   campWorldBeamDraw(g, b, zoom)   one beam { x, y, tx, ty, mine } as a thin line and a dot
//   campWorldPicKey(scene, look)     the picture key of a briefing's `pod` or `ore` while the look is on, '' else
const CAMPWOBJ = {
  gold: 0xe9b872, white: 0xe6edf7, relicDark: 0x8a6a3c, ore: '#b8c0cc', pale: 0x6fd6ff, mint: 0x7df0c0, dot: 0xffffff, // the mock's C table: gold, the white of what is not a goal, the relic's darker facet, the shards, the player's blue and fire
  hex: [[1, 0], [0.5, 0.87], [-0.5, 0.87], [-1, 0], [-0.5, -0.87], [0.5, -0.87]], hexIn: [[0.45, 0], [0.22, 0.4], [-0.22, 0.4], [-0.45, 0], [-0.22, -0.4], [0.22, -0.4]], dia: [[1, 0], [0, 1], [-1, 0], [0, -1]], // the mock's hexagon, its facet and its diamond (shares of a radius)
  cache: { size: 40, ring: 17, w: 2, dia: 8 },                    // the baked cache: its picture's side, the ring's radius and thickness, the diamond's radius (px in the world: the old pod was 18 px drawn 1.8 times, 32)
  oreTex: { size: 32, k: 2, shards: [[-5, 2, 0.4], [4, -3, 1.3], [2, 5, 2.2]], w: 6, h: 2.4 }, // the baked ore: the mock's three shards (x, y, turn) at k times the mock's size, each w by h of it
  found: { ring: 26, dia: 12 },                                   // a found cache's ring and diamond (px in the world)
  cloaked: { ring: 26, dia: 11, dashes: 16, fill: 0.5, alpha: 0.55 }, // an anomaly's marker: the mock's cloaked cache: a white dashed ring and an empty diamond, at its strength (campAnomHaze) times alpha
  relic: { hex: 26, w: 2.4, hold: 3.5, dim: 0.14 },              // the relic's hexagon radius (world px), the dim ring's and the hold arc's thickness (screen px) and the dim ring's alpha
  scan: { dashes: 28, fill: 0.54, w: 1.6, arc: 3 },               // a scan ring: 28 dashes of 0.54 of their share (the mock's 7 and 6), 1.6 px on the screen, the progress arc 3
  line: { cache: 1.6, visit: 3.5, beam: 1.4, dot: 2.2, wMax: 16 }, // screen px: the thin rings, the visit's arc, a beam's line and the dot where it lands; wMax: the most a line is in world px as the view zooms out
  alpha: { gold: 0.95, beam: 0.8 }
};
const campWorldZoom = scene => scene && scene.cameras && scene.cameras.main && scene.cameras.main.zoom > 0 ? scene.cameras.main.zoom : 1; // the camera's zoom (a stand-in scene of a test has none: 1)
const campWorldLineW = (px, zoom, max) => Math.min(max > 0 ? max : CAMPWOBJ.line.wMax, px / (zoom > 0 ? zoom : 1)); // a width on the screen as world px for the Graphics (the camera zooms what it draws)
function campWorldArcPoints(x, y, r, a0, a1) { // an arc as corners: about 3.3 times the square root of the radius for a whole turn (src/campcircles.js's way), at least two segments
  const turn = Math.abs(a1 - a0) / (2 * Math.PI), n = Math.max(2, Math.ceil((typeof campCircleSides === 'function' ? campCircleSides(r) : 3.3 * Math.sqrt(Math.max(1, r))) * turn)), out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }); }
  return out;
}
function campWorldDash(g, x, y, r, n, fill, w, color, alpha) { // a dashed ring: n dashes of `fill` of their share, round the circle, as short polylines
  g.lineStyle(w, color, alpha); const step = 2 * Math.PI / n;
  for (let i = 0; i < n; i++) g.strokePoints(campWorldArcPoints(x, y, r, i * step, i * step + step * fill), false, false);
}
function campWorldPoly(shape, x, y, r) { return shape.map(q => ({ x: x + q[0] * r, y: y + q[1] * r })); }
// ---- the baked pictures (2D canvas, made once, lazily) ----
function campWorldCachePaint(ctx, S) { // a gold diamond in a thin gold ring (the mock's cache)
  const K = CAMPWOBJ.cache, c = S / 2, hex = '#' + CAMPWOBJ.gold.toString(16);
  ctx.strokeStyle = hex; ctx.lineWidth = K.w; ctx.beginPath(); ctx.arc(c, c, K.ring, 0, 7); ctx.stroke();
  ctx.fillStyle = hex; ctx.beginPath(); CAMPWOBJ.dia.forEach((q, i) => ctx[i ? 'lineTo' : 'moveTo'](c + q[0] * K.dia, c + q[1] * K.dia)); ctx.closePath(); ctx.fill();
}
function campWorldOrePaint(ctx, S) { // three small pale shards (the mock's ore)
  const K = CAMPWOBJ.oreTex, c = S / 2; ctx.fillStyle = CAMPWOBJ.ore;
  K.shards.forEach(o => { ctx.save(); ctx.translate(c + o[0] * K.k, c + o[1] * K.k); ctx.rotate(o[2]); ctx.fillRect(-K.w / 2 * K.k, -K.h / 2 * K.k, K.w * K.k, K.h * K.k); ctx.restore(); });
}
function campWorldTexture(sc, key, size, paint) { // a canvas texture made once for the game (a scene made again finds it)
  const tx = sc && sc.textures; if (!tx || typeof tx.createCanvas !== 'function') return '';
  if (!tx.exists(key)) { const t = tx.createCanvas(key, size, size); paint(t.getContext(), size); t.refresh(); }
  return key;
}
const campWorldCacheTexture = sc => campWorldTexture(sc, 'wlook-cache', CAMPWOBJ.cache.size, campWorldCachePaint);
const campWorldOreTexture = sc => campWorldTexture(sc, 'wlook-ore', CAMPWOBJ.oreTex.size, campWorldOrePaint);
function campWorldCacheImage(scene, k) { // the sprite of a cache of level 2 in place of the gold-tinted pod, or null (today's) while the look is off
  if (typeof campWorldOn !== 'function' || !campWorldOn()) return null;
  const key = campWorldCacheTexture(scene); return key ? scene.add.image(k.x, k.y, key).setDepth(3) : null;
}
function campWorldOreImage(scene, o) { // the sprite of a piece of ore (a chunk, a wreck's) in place of the amber glow, or null while the look is off
  if (typeof campWorldOn !== 'function' || !campWorldOn()) return null;
  const key = campWorldOreTexture(scene); return key ? scene.add.image(o.x, o.y, key).setDepth(3) : null;
}
const campWorldPicKey = (scene, look) => typeof campWorldOn === 'function' && campWorldOn() ? (look === 'pod' ? campWorldCacheTexture(scene) : look === 'ore' ? campWorldOreTexture(scene) : '') : '';
// ---- Graphics ----
function campWorldRelicDraw(g, R, L, zoom) { // the relic: a dim ring at the game's radius, the hold as a gold arc filling it, a gold hexagon with a darker one inside it
  const K = CAMPWOBJ.relic, rad = L.relic.radius, top = -Math.PI / 2;
  g.lineStyle(campWorldLineW(K.w, zoom), 0xffffff, K.dim); g.strokePoints(campWorldArcPoints(R.x, R.y, rad, 0, 2 * Math.PI), true, true);
  if (R.hold > 0) { g.lineStyle(campWorldLineW(K.hold, zoom), CAMPWOBJ.gold, CAMPWOBJ.alpha.gold); g.strokePoints(campWorldArcPoints(R.x, R.y, rad, top, top + 2 * Math.PI * Math.min(1, R.hold / L.relic.hold)), false, false); }
  g.fillStyle(CAMPWOBJ.gold, CAMPWOBJ.alpha.gold); g.fillPoints(campWorldPoly(CAMPWOBJ.hex, R.x, R.y, K.hex), true);
  g.fillStyle(CAMPWOBJ.relicDark, 1); g.fillPoints(campWorldPoly(CAMPWOBJ.hexIn, R.x, R.y, K.hex), true);
}
function campWorldScans(C) { // the scan points not done yet, with how much of each is scanned (t over secs): a finished point is the goal panel's count, not a ring
  return ((C && C.scan) || []).filter(p => !p.got).map(p => ({ x: p.x, y: p.y, r: p.r, frac: p.secs > 0 ? Math.max(0, Math.min(1, p.t / p.secs)) : 0 }));
}
function campWorldScanDraw(g, scans, zoom) { // a dashed gold ring and, for the part scanned, a solid gold arc over it
  const K = CAMPWOBJ.scan;
  scans.forEach(s => {
    campWorldDash(g, s.x, s.y, s.r, K.dashes, K.fill, campWorldLineW(K.w, zoom), CAMPWOBJ.gold, CAMPWOBJ.alpha.gold);
    if (s.frac > 0) { g.lineStyle(campWorldLineW(K.arc, zoom), CAMPWOBJ.gold, CAMPWOBJ.alpha.gold); g.strokePoints(campWorldArcPoints(s.x, s.y, s.r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * s.frac), false, false); }
  });
}
function campWorldScanSync(scene) { // the scan rings of the level (3 mission 1): one Graphics made once, cleared each frame, drawn only when there is a point to scan
  const C = scene && scene.camp; if (!C || !C.scan || !C.scan.length || typeof campWorldOn !== 'function' || !campWorldOn()) { if (scene && scene.scanG) scene.scanG.clear(); return; }
  if (!scene.scanG) scene.scanG = scene.add.graphics().setDepth(2);
  scene.scanG.clear(); campWorldScanDraw(scene.scanG, campWorldScans(C), campWorldZoom(scene));
}
function campWorldAnomDraw(g, C, view, now, zoom) { // instead of campAnomDraw: an anomaly is a cloaked cache (a white dashed ring and an empty diamond), a found one is a cache (gold); the visit's arc fills in white
  const K = CAMPWOBJ, A = CAMP.anomaly;
  (C.anoms || []).forEach(a => {
    const h = campAnomHaze(C, a, view); if (!h) return; // the same range, the same fade, the same view as the haze
    if (h.shown) { // found: a cache
      g.lineStyle(campWorldLineW(K.line.cache, zoom), K.gold, K.alpha.gold); g.strokePoints(campWorldArcPoints(a.x, a.y, K.found.ring, 0, 2 * Math.PI), true, true);
      g.fillStyle(K.gold, K.alpha.gold); g.fillPoints(campWorldPoly(K.dia, a.x, a.y, K.found.dia), true);
      return;
    }
    const s = h.strength, w = campWorldLineW(K.line.cache, zoom);
    campWorldDash(g, a.x, a.y, K.cloaked.ring, K.cloaked.dashes, K.cloaked.fill, w, K.white, K.cloaked.alpha * s);
    g.lineStyle(w, K.white, K.cloaked.alpha * s); g.strokePoints(campWorldPoly(K.dia, a.x, a.y, K.cloaked.dia), true, true); // an empty diamond
    if (h.hold > 0) { g.lineStyle(campWorldLineW(K.line.visit, zoom), K.white, 0.9); g.strokePoints(campWorldArcPoints(a.x, a.y, A.visit, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * h.hold), false, false); } // the visit: the ring that fills while the carrier holds there (white: it is not a goal)
  });
}
function campWorldBeamDraw(g, b, zoom) { // one thin line and a dot where it lands: the mining laser in the player's pale blue with a white dot, a turret's beam at an alien in the player's fire, mint
  const K = CAMPWOBJ, col = b.mine ? K.pale : K.mint;
  g.lineStyle(campWorldLineW(K.line.beam, zoom), col, K.alpha.beam); g.lineBetween(b.x, b.y, b.tx, b.ty);
  g.fillStyle(b.mine ? K.dot : col, 1); g.fillCircle(b.tx, b.ty, campWorldLineW(K.line.dot, zoom, 10));
}
