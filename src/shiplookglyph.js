// ---------- The new ship look, the signal shapes (landing D of the ship look; card space-game-ship-look-d-glyphs; the mock is docs/ship-look-mock.html direction 4, its glyph function) ----------
// At the far zoom and on the Tab map a ship is a speck whatever is drawn, so it is one plain sign for its class: a chevron for a pilot and a patrol, a long arrow for the cruiser, a capsule for the ships you protect (with a dot for a miner),
// triangles for the pirates' small ships, a hexagon, a diamond (the pirate leader), a crescent (the raider), a disc (the drone), a ring and a dot (the gunship), and the two the scope report adds: a ring in a ring (the mothership) and a
// filled square (a tower). The id of a kind's sign is SLOOK.K[kind].g (src/shiplook.js); the colour is its side's.
// Everything is behind the switch (CAMP.flags.shiplook): with it off nothing here runs.
//   slookGlyphShapes(id, L)        PURE: a sign as a list of primitives at length L px, nose at +x, the middle at 0, 0: { t: 'poly', pts: [x0, y0, x1, y1, ...], dark }, { t: 'disc', x, y, r, dark }, { t: 'ring', x, y, r, w }
//   slookGlyphPaint(g, id, color, L, ox, oy, rot)   draws it into any Phaser Graphics with its middle at (ox, oy), turned by rot (the Tab map's marks are turned the way the ship flies); circles go through src/campcircles.js
//   slookGlyphTexture(scene, kind, side)   the texture of a kind's sign as a side, key look-g-<kind>-<side> (slookGlyphKey), the ship's own width and a height that holds the sign (slookGlyphSize), so the sprite's scale and its least-size width do not change, made once on first use
//   slookGlyphWant(z, was)         PURE: should a ship be drawn as its sign at this camera zoom: below SLOOK.glyph.under, and once it is, until the zoom comes back over SLOOK.glyph.over (a little hysteresis, so a zoom held at the edge does not flicker)
//   slookMapLen(kind)              the length of a kind's mark on the Tab map in px: 8 for the small ones up to 16 for the mothership;  slookMapType(type) the side a map mark's type is drawn as (the legend and the torpedoes)
//   slookGlyphMark(g, m, x, y)     one ship mark of the Tab map as its sign (m: a mark of campMapMarks with its kind), in its side's colour, turned the way it flies; false for a mark that is not a ship
const SLGLYPH = {
  dark: 0x0b1220,                                          // the dark of the signs that have a dark inner part (the mock's C.dark)
  halo: 0.16,                                              // a baked sign has a faint halo round it (the mock's shadow glow): its alpha; its radius is 0.58 of the length, kept inside the picture
  cap: 0.2,                                                // the width of a stroke of a sign (chevron, ring) as a share of the length, and its least (px) below
  least: 2,
  map: { base: 5, k: 0.1, min: 8, max: 16 },               // a Tab map mark's length: base plus k times the ship's length, between min and max
  types: { carrier: 'friend', wing: 'friend', convoy: 'protect', miner: 'protect', patrol: 'neutral', pirate: 'foe', tboat: 'foe', rival: 'foe', torpedo: 'foe', alien: 'alien', mother: 'alien', tower: 'alien' } // a map mark's type as a side (hostile pink, aliens violet, what you protect amber)
};
function slookGlyphSize(kind) { // the sign's picture: the ship's own width (the least-size rule of src/campzoom.js goes by it for the kinds with no size row, so a swap must not change it) and a height that holds the sign (a chevron or a bar is taller than a narrow ship)
  const [W, H] = slookSize(kind), L = slookBakeL(kind); let hy = 0;
  slookGlyphShapes(SLOOK.K[kind].g, L).forEach(x => { if (x.t === 'poly') { for (let i = 1; i < x.pts.length; i += 2) hy = Math.max(hy, Math.abs(x.pts[i])); } else hy = Math.max(hy, Math.abs(x.y) + x.r + (x.t === 'ring' ? x.w / 2 : 0)); });
  return [W, Math.max(H, 2 * Math.ceil(hy + 2))];
}
const slookGlyphKey = (kind, side) => 'look-g-' + kind + '-' + (side || slookKindSide(kind));
const slookGlyphWant = (z, was) => !(z > 0) ? !!was : was ? z < SLOOK.glyph.over : z < SLOOK.glyph.under;
const slookMapLen = kind => Math.max(SLGLYPH.map.min, Math.min(SLGLYPH.map.max, SLGLYPH.map.base + SLGLYPH.map.k * (typeof slookLen === 'function' ? slookLen(kind) : 30)));
const slookMapType = type => SLGLYPH.types[type] || 'neutral';
function slGlyphThick(ax, ay, bx, by, w) { // a line of width w as a quad (flat points)
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d * w / 2, ny = dx / d * w / 2;
  return [ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny];
}
function slGlyphRRect(x, y, w, h, r) { // a rounded rectangle as a polygon, clockwise from the top edge's left end (4 steps a corner): it can be turned, which Phaser's own cannot
  const out = [], q = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  q.forEach(([cx, cy, a0]) => { for (let i = 0; i <= 4; i++) { const a = a0 + i / 4 * Math.PI / 2; out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } });
  return out;
}
function slookGlyphShapes(id, L) {
  const P = (pts, dark) => ({ t: 'poly', pts: [].concat(...pts.map(q => [q[0] * L, q[1] * L])), dark: !!dark }), D = (x, y, r, dark) => ({ t: 'disc', x: x * L, y: y * L, r: r * L, dark: !!dark });
  const w = Math.max(SLGLYPH.least, L * SLGLYPH.cap), R = (x, y, r, ww) => ({ t: 'ring', x: x * L, y: y * L, r: r * L, w: ww });
  switch (id) {
    case 'chev': { const a = [-0.36 * L, 0.38 * L], b = [0.4 * L, 0], c = [-0.36 * L, -0.38 * L], r = w / 2; // a chevron: two thick arms with round ends and a round tip
      return [{ t: 'poly', pts: slGlyphThick(a[0], a[1], b[0], b[1], w) }, { t: 'poly', pts: slGlyphThick(b[0], b[1], c[0], c[1], w) }, { t: 'disc', x: a[0], y: a[1], r }, { t: 'disc', x: b[0], y: b[1], r }, { t: 'disc', x: c[0], y: c[1], r }]; }
    case 'bar': return [{ t: 'poly', pts: slGlyphRRect(-0.5 * L, -0.17 * L, 0.8 * L, 0.34 * L, 0.1 * L) }, P([[0.5, 0], [0.24, 0.24], [0.24, -0.24]])];       // a long arrow: a bar with a head
    case 'cap': return [{ t: 'poly', pts: slGlyphRRect(-0.5 * L, -0.24 * L, L, 0.48 * L, 0.24 * L) }];                                                      // a capsule
    case 'capdot': return [{ t: 'poly', pts: slGlyphRRect(-0.5 * L, -0.24 * L, L, 0.48 * L, 0.24 * L) }, D(0.2, 0, 0.1, true)];                              // a capsule with a dark dot
    case 'tri': return [P([[0.5, 0], [-0.42, 0.42], [-0.42, -0.42]])];
    case 'trinotch': return [P([[0.5, 0], [-0.45, 0.45], [-0.15, 0], [-0.45, -0.45]])];
    case 'tribar': return [P([[0.5, 0], [-0.2, 0.36], [-0.2, -0.36]]), P([[-0.5, -0.4], [-0.34, -0.4], [-0.34, 0.4], [-0.5, 0.4]])];                       // a triangle with a bar across its tail (a torpedo boat's tube)
    case 'hex': return [P([[0.5, 0], [0.22, 0.42], [-0.3, 0.42], [-0.5, 0], [-0.3, -0.42], [0.22, -0.42]])];
    case 'diamond': return [P([[0.5, 0], [0, 0.4], [-0.5, 0], [0, -0.4]]), P([[0.2, 0], [0, 0.16], [-0.2, 0], [0, -0.16]], true)];
    case 'cres': { const pts = []; // a crescent: the big arc of a circle of 0.44 (from -2.2 to 2.2 rad) and back along a smaller circle of 0.4 centred behind it (the mock's two arcs)
      for (let i = 0; i <= 16; i++) { const a = -2.2 + 4.4 * i / 16; pts.push(Math.cos(a) * 0.44 * L, Math.sin(a) * 0.44 * L); }
      for (let i = 0; i <= 12; i++) { const a = 1.5 - 3 * i / 12; pts.push(-0.3 * L + Math.cos(a) * 0.4 * L, Math.sin(a) * 0.4 * L); }
      return [{ t: 'poly', pts }]; }
    case 'disc': return [D(0, 0, 0.4)];
    case 'ringdot': return [R(0, 0, 0.38, Math.max(SLGLYPH.least, L * 0.13)), D(0, 0, 0.14)];
    case 'ringring': return [R(0, 0, 0.44, Math.max(SLGLYPH.least, L * 0.09)), R(0, 0, 0.22, Math.max(SLGLYPH.least, L * 0.09))];                         // a ring in a ring (the mothership)
    case 'square': return [{ t: 'poly', pts: slGlyphRRect(-0.34 * L, -0.34 * L, 0.68 * L, 0.68 * L, 0.06 * L) }];                                            // a filled square (a tower)
    default: return [D(0, 0, 0.4)];
  }
}
const SLGLYPH_PTS = []; // the corners of the shape being drawn, turned: one list, used again by the next (fillPoints reads it at once)
function slookGlyphPaint(g, id, color, L, ox, oy, rot) {
  const c = rot ? Math.cos(rot) : 1, s = rot ? Math.sin(rot) : 0, T = (x, y) => [ox + x * c - y * s, oy + x * s + y * c];
  slookGlyphShapes(id, L).forEach(sh => {
    if (sh.t === 'poly') {
      const n = sh.pts.length / 2; SLGLYPH_PTS.length = n;
      for (let i = 0; i < n; i++) { const q = T(sh.pts[2 * i], sh.pts[2 * i + 1]), o = SLGLYPH_PTS[i] || (SLGLYPH_PTS[i] = { x: 0, y: 0 }); o.x = q[0]; o.y = q[1]; }
      g.fillStyle(sh.dark ? SLGLYPH.dark : color, 1); g.fillPoints(SLGLYPH_PTS, true);
    } else if (sh.t === 'disc') { const q = T(sh.x, sh.y); g.fillStyle(sh.dark ? SLGLYPH.dark : color, 1); campDisc(g, q[0], q[1], sh.r); }
    else if (sh.t === 'ring') { const q = T(sh.x, sh.y); g.lineStyle(sh.w, color, 1); campRing(g, q[0], q[1], sh.r); }
  });
}
function slookGlyphTexture(scene, kind, side) { // a kind's sign as a side, painted once (the same picture size as the ship's, so the sprite keeps its scale), with the mock's faint glow round it
  if (!scene || !scene.textures || !scene.make || !SLOOK.K[kind]) return '';
  side = side || slookKindSide(kind); const key = slookGlyphKey(kind, side);
  if (scene.textures.exists(key)) return key;
  const [W, H] = slookGlyphSize(kind), L = slookBakeL(kind), col = slookInt(slookColor(side)), g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(col, SLGLYPH.halo); campDisc(g, W / 2, H / 2, Math.max(2, Math.min(0.58 * L, H / 2 - 1, W / 2 - 1)));
  slookGlyphPaint(g, SLOOK.K[kind].g, col, L, W / 2, H / 2, 0); g.generateTexture(key, W, H); g.destroy();
  return key;
}
function slookGlyphMark(g, m, x, y) { // a Tab map mark of a ship as its sign: the colour of its side (a fighter of a squad in focus keeps the squad's), turned the way it flies
  const k = m && SLOOK.K[m.kind]; if (!k) return false;
  const col = m.squad && typeof CAMP === 'object' && CAMP.wing && CAMP.wing.squadColor && CAMP.wing.squadColor[m.squad] ? CAMP.wing.squadColor[m.squad] : slookInt(slookColor(k.side));
  slookGlyphPaint(g, k.g, col, slookMapLen(m.kind), x, y, m.rot || 0);
  return true;
}
