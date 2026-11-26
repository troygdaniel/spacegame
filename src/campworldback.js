// ---------- The new world look, W1: the backdrop (card space-game-world-w1-backdrop; scope report on card space-game-world-look-scope, decisions 3 and 8; the mock is docs/world-look-mock.html, direction 1, its back() function) ----------
// Near black (#060a12), small WHITE stars, and two very large slate clouds at about a fifth of the strength of the painted nebula: no purple, no pink (they sit close to the colours of the aliens and of the hostile). The three star
// layers stay as they are (the near one and its parallax factors 0.2, 0.45 and 0.85, the least one breathing a little), only their colour is plain white: no tint, and no reading of the Long Haul's system (spaceBackdrop tints its layers with
// the star of whatever system the Long Haul last stood in: src/art_world.js).
// The Campaign only. The Long Haul keeps its backdrop: nothing in src/art_world.js is changed or asked; these are three new textures under their own keys (wlook-stars1 to wlook-stars3), painted ONCE, LAZILY, when the Campaign scene is first
// made (not at boot: the Long Haul's boot cost, tests/world.mjs, does not move), and put in place of spaceBackdrop's by campaignscene.js create() while campWorldOn() (src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0 for today's).
// spaceBackdropTick (src/art_world.js) moves these layers as it moves today's: it only reads s.bgLayers (tileSprites with a `par`) and s.bgLast.
//   campWorldBackdrop(s)           the Campaign scene's backdrop: the camera's colour, the three layers (depth -10, -9, -8; scroll factor 0 like today's), the least one breathing; paints the textures first if they are not there yet
//   campWorldBackTextures(s)       makes wlook-stars1 (2048 by 1024: the clouds and a few small stars), wlook-stars2 (512) and wlook-stars3 (1024: the bright stars, a few with a glint) once; returns their keys
//   campWorldCloudPlan()           PURE: the two clouds as [{ x, y, rx, ry }] in px of the tile, the strength and the colour (the mock's rgba(52,72,104,.20)): each is drawn at nine places (a tile either way) so the tile is seamless
const CAMPWORLDBACK = {
  bg: 0x060a12,                                   // the camera's colour: the mock's near black
  keys: ['wlook-stars1', 'wlook-stars2', 'wlook-stars3'],
  tile: [[2048, 1024], [512, 512], [1024, 1024]], // the textures' sizes: BACKDROP_WRAP (4096, src/art_world.js) is a multiple of all of them
  depth: [-10, -9, -8], par: [0.2, 0.45, 0.85],   // today's depths and parallax factors
  cloud: { rgb: [52, 72, 104], a: 0.2,            // the mock's slate at a fifth of the strength
    list: [[0.22, 0.3, 0.42, 0.46], [0.78, 0.72, 0.46, 0.47]] }, // each cloud: its middle as a share of the tile, its half width as a share of the tile's width and its half height as a share of the tile's height (under a half, so a cloud and the next tile's never touch)
  star: '255,255,255',                            // plain white
  stars: [{ n: 160, rMin: 0.45, rMax: 0.95, aMin: 0.25, aMax: 0.8, glint: 0, margin: 6 },      // layer 1: a few small stars in the clouds' tile (the mock's density: about 75 for a million px)
    { n: 80, rMin: 0.5, rMax: 1.5, aMin: 0.35, aMax: 0.95, glint: 0.04, margin: 22 },          // layer 2: as today's (80 stars on 512 px)
    { n: 26, rMin: 1.1, rMax: 2.6, aMin: 0.7, aMax: 1, glint: 0.55, margin: 44 }],             // layer 3: as today's (26 bright stars on 1024 px, a share with a glint)
  seed: 4711,                                     // the painters' seed (the Long Haul's too): the same sky every run
  breathe: { alpha: 0.78, ms: 3400 }              // the least layer's breathing: as today's
};
function campWorldCloudPlan(w, h) {
  const K = CAMPWORLDBACK.cloud, W_ = w || CAMPWORLDBACK.tile[0][0], H_ = h || CAMPWORLDBACK.tile[0][1];
  return { rgb: K.rgb.slice(), a: K.a, clouds: K.list.map(c => ({ x: c[0] * W_, y: c[1] * H_, rx: c[2] * W_, ry: c[3] * H_ })) };
}
function campWorldStars(ctx, rnd, w, h, K) { // soft white discs, a few with a four-point glint (the shape of src/art_world.js waStars, in plain white)
  const lerp = (a, b, t) => a + (b - a) * t, col = CAMPWORLDBACK.star;
  for (let i = 0; i < K.n; i++) {
    const x = K.margin + rnd() * (w - 2 * K.margin), y = K.margin + rnd() * (h - 2 * K.margin), r = lerp(K.rMin, K.rMax, rnd() * rnd()), a = lerp(K.aMin, K.aMax, rnd());
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.22, `rgba(${col},${a * 0.55})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    if (rnd() < K.glint) {
      const L = r * (7 + rnd() * 6);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const lg = ctx.createLinearGradient(x - dx * L, y - dy * L, x + dx * L, y + dy * L);
        lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.5, `rgba(${col},${a * 0.85})`); lg.addColorStop(1, `rgba(${col},0)`);
        ctx.strokeStyle = lg; ctx.lineWidth = Math.max(0.7, r * 0.4); ctx.beginPath(); ctx.moveTo(x - dx * L, y - dy * L); ctx.lineTo(x + dx * L, y + dy * L); ctx.stroke();
      }
    }
  }
}
function campWorldClouds(ctx, w, h) { // two soft slate ellipses (the mock's radial gradients, from the strength at the middle to nothing), each at nine places so the tile is seamless where it repeats
  const P = campWorldCloudPlan(w, h), rgb = P.rgb.join(',');
  P.clouds.forEach(c => {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const cx = c.x + ox * w, cy = c.y + oy * h; if (cx + c.rx < 0 || cx - c.rx > w || cy + c.ry < 0 || cy - c.ry > h) continue; // a copy wholly outside the tile paints nothing
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, c.ry / c.rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c.rx); g.addColorStop(0, `rgba(${rgb},${P.a})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(-c.rx, -c.rx, 2 * c.rx, 2 * c.rx); ctx.restore();
    }
  });
}
function campWorldBackTextures(s) { // the three tiles, made once for the game (a scene made again finds them)
  const K = CAMPWORLDBACK, tx = s && s.textures; if (!tx || typeof tx.createCanvas !== 'function') return K.keys.slice();
  const rnd = typeof waRng === 'function' ? waRng(K.seed) : Math.random; // waRng: the painters' seeded generator (src/art_world.js, read only)
  K.keys.forEach((key, i) => {
    if (tx.exists(key)) return;
    const [w, h] = K.tile[i], tex = tx.createCanvas(key, w, h), ctx = tex.getContext();
    if (i === 0) campWorldClouds(ctx, w, h);
    campWorldStars(ctx, rnd, w, h, K.stars[i]);
    tex.refresh();
  });
  return K.keys.slice();
}
function campWorldBackdrop(s) { // in place of spaceBackdrop(s, true) for the Campaign while the world look is on: no tint, no star of a Long Haul system
  const K = CAMPWORLDBACK, keys = campWorldBackTextures(s);
  s.cameras.main.setBackgroundColor(K.bg);
  s.bgLayers = keys.map((key, i) => { const t = s.add.tileSprite(0, 0, W, H, key).setOrigin(0).setScrollFactor(0).setDepth(K.depth[i]).setAlpha(1); t.par = K.par[i]; return t; }); // three full-screen layers: each one costs fill rate
  s.bgLast = null; // the camera's scroll at the last tick (spaceBackdropTick): the scene object is used again on the next launch, so it starts again here
  s.tweens.add({ targets: s.bgLayers[2], alpha: K.breathe.alpha, duration: K.breathe.ms, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); // the bright stars breathe a little
  return true;
}
