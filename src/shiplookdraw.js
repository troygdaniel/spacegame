// ---------- The new ship look, the ships (landing A of the ship look; card space-game-ship-look-a-ships; the table is src/shiplook.js, the mock docs/ship-look-mock.html direction 1, flat cut) ----------
// One clean outline a ship, filled with its side's colour, a darker facet inside, a thin dark rim; painted ONCE into a texture made in code (no image file), one texture for each kind and side (key look-<kind>-<side>,
// slookTexKey), shown as one sprite a ship as today. Only the picture changes: the scale is chosen so the hull is as long as it is drawn today (CAMP.size[kind].len, else SLOOKDRAW.len), so the hit circles, the ranges, the least
// sizes on the screen (CAMPZOOM.view, src/campzoom.js) and every rule of the fight stay as they are. The Campaign gets its own keys, so the Long Haul keeps its pictures (src/ships.js).
// Everything is behind the switch (slookOn(): CAMP.flags.shiplook, the N panel's row, ?shiplook=1 or 0): with it off nothing here runs and the sprites keep today's pictures.
//   slookSync(scene, u, sp)    called by src/campaignscene.js sync() for each ship after it is placed: gives the sprite the texture of its unit's side (or back today's picture when the switch went off) and the scale of it
//   slookTexture(scene, kind, side)   the texture key of a kind as a side, made on first use (a stand-in scene with no Phaser gets '' and nothing is made)
//   slookPaint(g, kind, side, L, ox, oy)   the drawing itself, into any Phaser Graphics: the outline filled, the rim, the facet; L px is the hull's length, (ox, oy) where the middle of the hull is
//   slookLen(kind), slookScale(kind)       the hull's drawn length in the world, and the sprite's base scale (that length over the baked one)
//   slookBays()                the cruiser's bay lights on the new hull, in the shape of campArtBays (src/campcruiser.js): where the launch tubes and the landing bays are
const SLOOKDRAW = {
  len: { raider: 30, drone: 34, gunship: 48, freighter: 64, mother: 250, tower: 77 }, // the hull's drawn length in the world (px) of the kinds with no CAMP.size row: today's picture of src/ships.js less its glow margin (raider 40 less 2 x 5, drone 44 less 2 x 5, gunship 60 less 2 x 6, freighter 76 less 2 x 6; the mothership is the Reaver's 112 less 2 x 8 times CAMP_LOOK's 2.6, a tower the gunship's 48 times 1.6)
  pad: { raider: 5, drone: 5, gunship: 6, freighter: 6, mother: 21, tower: 10 },       // the margin round that hull in the world (px): the same as today's, so the width the least-size rule goes by for these kinds (campZoomHull: the picture's drawn width) does not change
  padSized: 3,                                                                           // the margin for a kind with a size row (the rule goes by CAMP.size there): room for the rim
  bake: [[40, 4], [120, 2], [1e9, 1]],                                                  // [length up to, times it is baked at]: a small ship is baked 4 times its length so it stays sharp zoomed in, a big one once
  rim: { color: 0x050810, alpha: 0.9 },                                                  // the mock's rgba(5,8,14,.9)
  bays: { launch: [6, 20], land: [-29, 20.5], half: [2.2, 4.2] }                         // the cruiser's launch tube (the front face of a pod) and landing bay (its aft face) on the flat-cut hull: x along the nose, y to the side of the starboard one; half: how deep and how wide (half) an opening is, as today's
};
const slookLen = kind => { const t = typeof CAMP === 'object' && CAMP.size ? CAMP.size[kind] : null; return t && t.len > 0 ? t.len : (SLOOKDRAW.len[kind] || 30); };
const slookPadW = kind => SLOOKDRAW.pad[kind] !== undefined ? SLOOKDRAW.pad[kind] : SLOOKDRAW.padSized;
function slookBakeL(kind) { const w = slookLen(kind), r = SLOOKDRAW.bake.find(b => w <= b[0]); return Math.round(w * (r ? r[1] : 1)); } // the hull's length in the baked picture, px
const slookScale = kind => slookLen(kind) / slookBakeL(kind);                                                                     // the sprite's base scale: the hull is then as long as CAMP.size says
function slookSize(kind) { // the baked picture's size, px: the hull and its margin all round; the middle of the hull is the middle of the picture, so a sprite turns about the ship's own place
  const L = slookBakeL(kind), k = SLOOK.K[kind], pad = slookPadW(kind) * L / slookLen(kind), hy = Math.max(...k.p.map(q => Math.abs(q[1])));
  return [Math.ceil(L + 2 * pad), Math.ceil(2 * (hy * L + pad))];
}
function slookPath(g, flat, ox, oy) { g.beginPath(); for (let i = 0; i < flat.length; i += 2) { if (i) g.lineTo(ox + flat[i], oy + flat[i + 1]); else g.moveTo(ox + flat[i], oy + flat[i + 1]); } g.closePath(); }
function slookPaint(g, kind, side, L, ox, oy) { // the mock's direction 1 for one ship: the outline in the side's colour, the thin dark rim, the facet (the side's colour mixed toward the dark, white for a warhead)
  const k = SLOOK.K[kind]; if (!k) return;
  slookPath(g, slookPolygon(kind, L, 8), ox, oy);
  g.fillStyle(slookInt(slookColor(side)), 1); g.fillPath();
  g.lineStyle(Math.max(SLOOK.rim.least, L * SLOOK.rim.k), SLOOKDRAW.rim.color, SLOOKDRAW.rim.alpha); g.strokePath();
  slookPath(g, slookFacetPolygon(kind, L, 8), ox, oy);
  g.fillStyle(slookInt(slookFacet(side, !!k.hot)), 1); g.fillPath();
}
function slookTexture(scene, kind, side) { // the texture of a kind as a side, made once; returns its key ('' when the scene has no Phaser to draw with)
  if (!scene || !scene.textures || !scene.make || !SLOOK.K[kind]) return '';
  side = side || slookKindSide(kind); const key = slookTexKey(kind, side);
  if (scene.textures.exists(key)) return key;
  const [W, H] = slookSize(kind), g = scene.make.graphics({ x: 0, y: 0, add: false });
  slookPaint(g, kind, side, slookBakeL(kind), W / 2, H / 2); g.generateTexture(key, W, H); g.destroy();
  return key;
}
function slookProt(scene) { // the ids of the ships you protect (src/campconvoy.js campConvoyShips), worked out once for a state of the game, not for each ship
  const C = scene.camp, m = scene._slp;
  if (m && m.c === C && m.t === C.t && m.n === C.ships.length) return m.set;
  const list = typeof campConvoyShips === 'function' ? campConvoyShips(C) : [], set = new Set(list.map(u => u.id));
  scene._slp = { c: C, t: C.t, n: C.ships.length, set };
  return set;
}
function slookIsOn(scene) { // the switch, asked once a frame (every ship of a frame has the same answer; a stand-in scene with no game loop is asked each time)
  const f = scene.game && scene.game.loop && typeof scene.game.loop.frame === 'number' ? scene.game.loop.frame : -1;
  if (f < 0) return slookOn();
  if (scene._sloF !== f) { scene._sloF = f; scene._sloOn = slookOn(); }
  return scene._sloOn;
}
function slookSync(scene, u, sp) { // one ship's sprite, once a frame: the new picture of its side while the switch is on, today's when it is off (the N panel's row is felt at once)
  if (!slookIsOn(scene)) {
    if (sp._sl) { // it was on: back to today's picture, its tint and its scale
      const look = (typeof CAMP_LOOK === 'object' && (CAMP_LOOK[u.kind] || CAMP_LOOK.drone)) || { scale: 1 };
      sp._sl = ''; sp._ls = 0; sp.setTexture(scene.texOf(u.kind)); if (look.tint) sp.setTint(look.tint); else sp.clearTint(); sp.setScale(look.scale * (sp._k > 1 ? sp._k : 1));
    }
    return;
  }
  const key = slookTexture(scene, u.kind, slookSide(u, slookProt(scene).has(u.id)));
  if (!key || sp._sl === key) return;
  sp._sl = key; sp._ls = slookScale(u.kind); sp.setTexture(key); sp.clearTint(); sp.setScale(sp._ls * (sp._k > 1 ? sp._k : 1)); // (_k: how many times the far view draws it up, src/campzoom.js: the scene keeps it)
}
function slookBays() { const b = SLOOKDRAW.bays; return { launch: [[b.launch[0], -b.launch[1]], [b.launch[0], b.launch[1]]], land: [[b.land[0], -b.land[1]], [b.land[0], b.land[1]]], half: b.half }; }
