// ---------- Station interior (v2): one baked layer for floor, walls and fixed props, plus lights, signs and moving parts ----------
// station.js calls interiorBuild(this) once its collision walls exist, and interiorTick(this, time) every frame.
// Colliders stay where station.js and shop.js put them. This file only draws, and adds a few solid props of its own.
// Everything is shapes drawn with Graphics (no image files). Names here start with "in" / "IN_" so they cannot clash with other scripts.
const IN_PINK = 0xff4fd8, IN_WARM = 0xffd9a0, IN_STEEL = 0x1b2f4a;
const IN_NORTH = 48, IN_SOUTH = 48; // the north and south walls are drawn face-on and this thick (the colliders in station.js match)

const IN_LIGHTS = []; // big floor light pools: P.pool() records these instead of drawing them (stacked discs band visibly); interiorBuild turns them into soft sprites
function inRng(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
function inMix(a, b, t) { // colour between a and b
  const m = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
function inCss(c) { return '#' + c.toString(16).padStart(6, '0'); }

// drawing helpers around one Graphics
function inPen(g) {
  const P = {
    g,
    rect: (x, y, w, h, c, a = 1) => { g.fillStyle(c, a); g.fillRect(x, y, w, h); },
    rrect: (x, y, w, h, r, c, a = 1) => { g.fillStyle(c, a); g.fillRoundedRect(x, y, w, h, r); },
    line: (x1, y1, x2, y2, c, a = 1, lw = 1) => { g.lineStyle(lw, c, a); g.lineBetween(x1, y1, x2, y2); },
    dot: (x, y, r, c, a = 1) => { g.fillStyle(c, a); g.fillCircle(x, y, r); },
    oval: (x, y, w, h, c, a = 1) => { g.fillStyle(c, a); g.fillEllipse(x, y, w, h); },
    frame: (x, y, w, h, c, a = 1, lw = 1) => { g.lineStyle(lw, c, a); g.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw); },
    ring: (x, y, r, c, a = 1, lw = 1) => { g.lineStyle(lw, c, a); g.strokeCircle(x, y, r); },
    poly: (pts, c, a = 1) => { g.fillStyle(c, a); g.fillPoints(pts.map(p => ({ x: p[0], y: p[1] })), true); },
    // a soft patch of light: stacked translucent discs (n of them, each a little smaller), total strength about a
    pool: (x, y, rx, ry, c, a = 0.4, n = 24) => { if (rx >= 50 && P.big) { IN_LIGHTS.push([x, y, rx, ry, c, a]); return; } for (let i = 0; i < n; i++) { const f = 1 - i / n; g.fillStyle(c, a / n * 1.5); g.fillEllipse(x, y, rx * 2 * f, ry * 2 * f); } },
    // a neon outline: wide faint stroke, medium stroke, thin bright core
    neonFrame: (x, y, w, h, c) => { P.frame(x - 3, y - 3, w + 6, h + 6, c, 0.07, 6); P.frame(x - 1, y - 1, w + 2, h + 2, c, 0.2, 3); P.frame(x, y, w, h, c, 0.95, 1.5); },
    neonLine: (x1, y1, x2, y2, c) => { P.line(x1, y1, x2, y2, c, 0.08, 7); P.line(x1, y1, x2, y2, c, 0.25, 3.5); P.line(x1, y1, x2, y2, c, 0.95, 1.5); }
  };
  return P;
}
// a texture drawn with the 2D canvas API (smooth gradients, which stacked Graphics discs cannot give)
function inCanvas(s, key, w, h, fn) {
  if (s.textures.exists(key)) return;
  const t = s.textures.createCanvas(key, w, h); fn(t.getContext()); t.refresh();
}
function inTex(s, key, w, h, fn) {
  if (s.textures.exists(key)) return;
  const g = s.make.graphics({ x: 0, y: 0, add: false });
  fn(inPen(g), g); g.generateTexture(key, w, h); g.destroy();
}
// a disc clipped to a box, drawn one row at a time (the graphics API has no clip); colorAt(t) gets 0 at the top of the disc to 1 at the bottom
function inDisc(P, cx, cy, r, x0, y0, x1, y1, colorAt) {
  for (let y = y0; y < y1; y++) {
    const dy = y + 0.5 - cy; if (Math.abs(dy) >= r) continue;
    const hw = Math.sqrt(r * r - dy * dy), xa = Math.max(x0, cx - hw), xb = Math.min(x1, cx + hw);
    if (xb > xa) P.rect(xa, y, xb - xa, 1, colorAt((dy + r) / (2 * r)));
  }
}

// ---------- the baked layer (1280 x 720) ----------
function inDrawBase(P) {
  const R = inRng(7);
  const rect = P.rect, line = P.line;
  rect(0, 0, W, H, 0x05080f);

  // ===== main deck floor: steel plates with bevels, vents and a few glowing traces =====
  { const x0 = 20, y0 = 20, x1 = 860, y1 = 420, S = 60;
    rect(x0, y0, x1 - x0, y1 - y0, 0x060d18);
    for (let y = y0; y < y1; y += S) for (let x = x0; x < x1; x += S) {
      const w = Math.min(S, x1 - x), h = Math.min(S, y1 - y), j = Math.floor(R() * 8);
      rect(x + 1, y + 1, w - 2, h - 2, (((0x0b + j) << 16) | ((0x17 + j) << 8) | (0x29 + j)));
      line(x + 1, y + 1, x + w - 1, y + 1, 0x2c4a6c, 0.55); line(x + 1, y + 1, x + 1, y + h - 1, 0x2c4a6c, 0.4);   // lit top and left edges
      line(x + 1, y + h - 1, x + w - 1, y + h - 1, 0x000000, 0.45); line(x + w - 1, y + 1, x + w - 1, y + h - 1, 0x000000, 0.35);
      [[5, 5], [w - 6, 5], [5, h - 6], [w - 6, h - 6]].forEach(([dx, dy]) => P.dot(x + dx, y + dy, 1.3, 0x35566f, 0.9));
      const r = R();
      if (r < 0.1) { for (let i = 0; i < 6; i++) line(x + 12, y + 14 + i * 6, x + w - 12, y + 14 + i * 6, 0x02060c, 0.8, 2); P.frame(x + 10, y + 10, w - 20, h - 20, 0x36587a, 0.5); }
      else if (r < 0.18) { rect(x + 9, y + 9, w - 18, h - 18, 0x08121f, 0.8); P.frame(x + 9, y + 9, w - 18, h - 18, 0x24405c, 0.6); }
      else if (r < 0.21) { P.neonLine(x + 8, y + h / 2, x + w / 2, y + h / 2, CYAN); line(x + w / 2, y + h / 2, x + w / 2, y + h - 8, CYAN, 0.5, 1.5); P.dot(x + w / 2, y + h - 8, 2, CYAN, 0.9); }
    }
    // a path of guide strips from the hangar door to the doors and terminals, with chevrons
    const path = (pts) => { for (let i = 0; i < pts.length - 1; i++) { P.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], CYAN, 0.05, 14); P.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], CYAN, 0.2, 2); } };
    path([[850, 360], [460, 360], [460, 412]]); path([[640, 360], [640, 270]]); path([[200, 360], [200, 270]]); path([[460, 360], [200, 360]]);
    for (let x = 800; x > 230; x -= 64) { if (Math.abs(x - 460) < 30 || Math.abs(x - 640) < 30) continue; line(x, 352, x - 8, 360, CYAN, 0.35, 2); line(x - 8, 360, x, 368, CYAN, 0.35, 2); }
    // light pools: cool white on the middle of the deck, cyan at the mission desk, green at the repair bay
    P.pool(460, 250, 330, 120, 0x9fd8ff, 0.1); P.pool(200, 215, 130, 90, CYAN, 0.2); P.pool(640, 215, 130, 90, GREEN, 0.16);
    // floor painting around the two desks: a bay outline with corner ticks, and a standing mark in front
    const bay = (cx, cy, c) => { P.frame(cx - 80, cy - 44, 160, 112, c, 0.5, 2); [[-80, -44], [80, -44], [-80, 68], [80, 68]].forEach(([dx, dy]) => { P.dot(cx + dx, cy + dy, 3, c, 0.9); });
      for (let i = 0; i < 6; i++) line(cx - 52 + i * 21, cy + 44, cx - 40 + i * 21, cy + 36, c, 0.35, 3); };
    bay(200, 200, CYAN); bay(640, 200, GREEN);
  }

  // ===== bar floor: dark planks, a rug, spilled neon =====
  { const x0 = 20, y0 = 440, x1 = 860, y1 = 700;
    const woods = [0x2b170b, 0x331c0e, 0x3a2010, 0x281409, 0x30190c];
    for (let y = y0; y < y1; y += 13) {
      let px = x0 - Math.floor(R() * 60);
      while (px < x1) {
        const len = 90 + R() * 150, a = Math.max(px, x0), b = Math.min(px + len, x1);
        if (b > a) { rect(a, y, b - a, 13, woods[Math.floor(R() * woods.length)]); line(a, y, b, y, 0x6a3a18, 0.3); line(a, y + 12, b, y + 12, 0x000000, 0.5);
          for (let k = 0; k < 2; k++) line(a + 6 + R() * (b - a - 12), y + 3 + R() * 7, a + 12 + R() * (b - a - 12), y + 3 + R() * 7, 0x6a3a18, 0.1); }
        if (px + len < x1) line(px + len, y, px + len, y + 13, 0x000000, 0.7);
        px += len;
      }
    }
    // the rug under the lounge
    P.oval(646, 604, 330, 150, 0x000000, 0.4);
    P.oval(646, 600, 320, 140, 0x3a1030); P.oval(646, 600, 300, 124, 0x4b1840); P.oval(646, 600, 262, 96, 0x2a0c28);
    for (let i = 0; i < 3; i++) { P.g.lineStyle(2, i === 1 ? AMBER : IN_PINK, 0.55); P.g.strokeEllipse(646, 600, 290 - i * 36, 112 - i * 20); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; P.dot(646 + Math.cos(a) * 124, 600 + Math.sin(a) * 40, 2.2, AMBER, 0.6); }
    // warm lamp pools over the counter, the tables and the rug; magenta neon spill from the back wall
    P.pool(255, 625, 190, 70, AMBER, 0.2); P.pool(598, 498, 80, 60, AMBER, 0.22); P.pool(178, 478, 80, 60, AMBER, 0.2); P.pool(646, 600, 190, 80, IN_PINK, 0.12); P.pool(640, 680, 220, 40, IN_PINK, 0.16);
    // a dark rubber mat behind the counter, with a diamond pattern
    rect(30, 630, 390, 42, 0x0c0b10); for (let x = 30; x < 420; x += 14) { line(x, 630, x + 14, 672, 0x1b1a24, 0.7); line(x + 14, 630, x, 672, 0x1b1a24, 0.7); }
    P.frame(30, 630, 390, 42, 0x3a2a14, 0.9, 2);
  }

  // ===== hangar floor: poured slabs, oil, a landing pad, hazard stripes, a bay door on the right wall =====
  { const x0 = 880, y0 = 20, x1 = 1260, y1 = 700;
    rect(x0, y0, x1 - x0, y1 - y0, 0x07101b);
    for (let y = y0; y < y1; y += 90) for (let x = x0; x < x1; x += 95) {
      const w = Math.min(95, x1 - x), h = Math.min(90, y1 - y), j = Math.floor(R() * 6);
      rect(x + 1, y + 1, w - 2, h - 2, (((0x0a + j) << 16) | ((0x14 + j) << 8) | (0x21 + j)));
      line(x + 1, y + 1, x + w - 1, y + 1, 0x24405c, 0.5); line(x + 1, y + h - 1, x + w - 1, y + h - 1, 0x000000, 0.5); line(x + w - 1, y + 1, x + w - 1, y + h - 1, 0x000000, 0.4);
    }
    for (let i = 0; i < 14; i++) P.oval(x0 + R() * 380, y0 + R() * 680, 14 + R() * 40, 8 + R() * 22, 0x000000, 0.18 + R() * 0.12); // oil stains
    for (let i = 0; i < 8; i++) { const sx = x0 + 30 + R() * 320, sy = y0 + 30 + R() * 620; line(sx, sy, sx + 40 + R() * 60, sy + (R() - 0.5) * 20, 0x000000, 0.25, 3); } // skid marks
    // the landing pad: a big ring, an inner dashed ring, corner brackets, painted numerals
    P.pool(1090, 360, 190, 190, 0xbfe9ff, 0.2); P.pool(1090, 360, 120, 120, AMBER, 0.12);
    P.ring(1090, 360, 128, AMBER, 0.14, 12); P.ring(1090, 360, 128, AMBER, 0.9, 3); P.ring(1090, 360, 118, 0x000000, 0.5, 2);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; P.line(1090 + Math.cos(a) * 104, 360 + Math.sin(a) * 104, 1090 + Math.cos(a + 0.09) * 104, 360 + Math.sin(a + 0.09) * 104, CYAN, 0.7, 3); }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const cx = 1090 + sx * 150, cy = 360 + sy * 150; line(cx, cy, cx - sx * 26, cy, AMBER, 0.85, 3); line(cx, cy, cx, cy - sy * 26, AMBER, 0.85, 3); });
    line(900, 360, 1220, 360, AMBER, 0.08, 6); line(1090, 120, 1090, 600, AMBER, 0.08, 6);
    // hazard stripes: along the floor edge by the bay door, and in the doorway between the deck and the hangar
    for (let i = 0; i < 38; i += 8) { rect(1222 + i, 232, 4, 8, 0xe8b020, 0.9); rect(1222 + i, 480, 4, 8, 0xe8b020, 0.9); }
    rect(1210, 240, 50, 240, 0x0b1624, 0.9); line(1210, 240, 1210, 480, AMBER, 0.55, 2);
    for (let i = 0; i < 12; i++) { rect(1214, 246 + i * 20, 8, 10, i % 2 ? AMBER : 0x1d1608, 0.85); }
    P.pool(1236, 360, 40, 150, AMBER, 0.35);
  }

  // ===== hazard stripes in the doorway between deck and hangar =====
  { const bx = 858, by = 282, bw = 24, bh = 156; P.rect(bx, by, bw, bh, 0x120f06);
    for (let y = by - 24; y < by + bh; y += 24) P.poly([[bx, y], [bx + bw, y - 12], [bx + bw, y], [bx, y + 12]].map(p => [p[0], Phaser.Math.Clamp(p[1], by, by + bh)]), 0xe8b020, 0.85);
    P.frame(bx, by, bw, bh, 0xffd37a, 0.6, 2); }
}


// ---------- walls: thin slabs between rooms, and thick face-on walls along the top and bottom ----------
function inDrawWalls(P) {
  const R = inRng(11), rect = P.rect, line = P.line;
  const BOT = [CYAN, AMBER, GREEN, IN_PINK];
  const shade = (x, y, w, h, vertical, dir) => { // soft shadow a wall casts on the floor beside it
    for (let i = 0; i < 10; i++) { const a = 0.32 * (1 - i / 10); if (vertical) rect(dir > 0 ? x + w + i : x - 1 - i, y, 1, h, 0x000000, a); else rect(x, dir > 0 ? y + h + i : y - 1 - i, w, 1, 0x000000, a); }
  };
  // a thin slab seen from above: lit edges, a dark groove down the middle, seams
  const slab = (x, y, w, h, accent) => {
    rect(x, y, w, h, 0x172b44);
    if (w >= h) { rect(x, y + h / 2 - 1, w, 2, 0x0b1828); line(x, y + 1, x + w, y + 1, 0x4a789e, 0.85); line(x, y + h - 1, x + w, y + h - 1, 0x050b14, 0.9); for (let sx = x + 40; sx < x + w - 10; sx += 80) line(sx, y, sx, y + h, 0x050b14, 0.55); line(x, y + 1, x + w, y + 1, accent, 0.12, 5); }
    else { rect(x + w / 2 - 1, y, 2, h, 0x0b1828); line(x + 1, y, x + 1, y + h, 0x4a789e, 0.85); line(x + w - 1, y, x + w - 1, y + h, 0x050b14, 0.9); for (let sy = y + 40; sy < y + h - 10; sy += 80) line(x, sy, x + w, sy, 0x050b14, 0.55); line(x + 1, y, x + 1, y + h, accent, 0.12, 5); }
  };
  // a thick wall seen face-on. trimAtBottom: the trim band touches the floor at the bottom edge (north walls); false = at the top (south walls)
  const face = (x, y, w, h, trimAtBottom) => {
    rect(x, y, w, h, 0x0e1b2e);
    const ty = trimAtBottom ? y + h - 13 : y, py = trimAtBottom ? y : y + 13, ph = h - 13;
    for (let sx = x; sx < x + w; sx += 70) {
      const pw = Math.min(68, x + w - sx - 1), j = Math.floor(R() * 5);
      rect(sx + 1, py + 1, pw, ph - 2, (((0x15 + j) << 16) | ((0x27 + j) << 8) | (0x41 + j)));
      line(sx + 1, py + 1, sx + pw, py + 1, 0x35567a, 0.7); line(sx + 1, py + ph - 1, sx + pw, py + ph - 1, 0x000000, 0.5);
      [[4, 4], [pw - 3, 4], [4, ph - 5], [pw - 3, ph - 5]].forEach(([dx, dy]) => P.dot(sx + dx, py + dy, 1.2, 0x3a5c7a, 0.8));
    }
    rect(x, ty, w, 13, 0x08111e); line(x, trimAtBottom ? ty : ty + 12, x + w, trimAtBottom ? ty : ty + 12, CYAN, 0.55, 1.5);
    line(x, trimAtBottom ? ty : ty + 12, x + w, trimAtBottom ? ty : ty + 12, CYAN, 0.1, 6);
    for (let sx = x + 12; sx < x + w - 6; sx += 36) { const c = BOT[Math.floor(R() * BOT.length)]; P.dot(sx, ty + 6.5, 1.8, c, 0.9); P.dot(sx, ty + 6.5, 4, c, 0.12); }
    shade(x, y, w, h, false, trimAtBottom ? 1 : -1);
  };
  const stars = (x, y, w, h, n) => { for (let i = 0; i < n; i++) rect(x + 2 + R() * (w - 4), y + 1 + R() * (h - 2), R() < 0.15 ? 2 : 1, R() < 0.15 ? 2 : 1, 0xffffff, 0.35 + R() * 0.6); };
  // a viewport onto space: dark glass, nebula, stars, the red planet's limb, mullions, glints
  const window_ = (x, y, w, h, planet) => {
    rect(x - 6, y - 6, w + 12, h + 12, 0x060d17); P.frame(x - 6, y - 6, w + 12, h + 12, 0x3a5c7a, 0.9, 2);
    rect(x, y, w, h, 0x03050c);
    for (let i = 0; i < 6; i++) P.oval(x + w * (0.2 + i * 0.12), y + h * 0.5, w * 0.5, h * 1.4, i % 2 ? 0x2a1a5a : 0x14305a, 0.07);
    stars(x, y, w, h, Math.floor(w / 5));
    if (planet) inDisc(P, x + w * planet[0], y + h * planet[1] + planet[2], planet[2], x, y, x + w, y + h, t => inMix(0xffd9a0, 0x6a2a20, Math.min(1, t * 3.2)));
    for (let mx = x + 65; mx < x + w - 20; mx += 65) { rect(mx - 2, y, 4, h, 0x0b1626); line(mx - 2, y, mx - 2, y + h, 0x3a5c7a, 0.5); }
    P.g.lineStyle(7, 0xffffff, 0.04); P.g.lineBetween(x + w * 0.18, y + h, x + w * 0.3, y); P.g.lineBetween(x + w * 0.62, y + h, x + w * 0.74, y);
    P.neonFrame(x - 6, y - 6, w + 12, h + 12, CYAN);
  };
  // lockers: tall doors with vents, handles, number plates
  const lockers = (x, y, n, w, h, c) => { for (let i = 0; i < n; i++) { const lx = x + i * (w + 2);
    rect(lx, y, w, h, 0x182c46); P.frame(lx, y, w, h, 0x3d6288, 0.8, 1); for (let k = 0; k < 4; k++) line(lx + 6, y + 6 + k * 3, lx + w - 6, y + 6 + k * 3, 0x050b14, 0.9, 1);
    rect(lx + w - 7, y + h / 2, 2, 8, 0xbcd8ee, 0.8); rect(lx + w / 2 - 6, y + h - 9, 12, 5, 0x050b14); rect(lx + w / 2 - 4, y + h - 8, 8, 3, c, 0.85); } };

  // thin walls
  slab(0, 0, 20, H, CYAN); slab(W - 20, 0, 20, H, CYAN);             // left and right
  slab(860, IN_NORTH, 20, 280 - IN_NORTH, CYAN); slab(860, 440, 20, 260 - (IN_SOUTH - 20), AMBER); // hangar wall, with a gap for the door
  slab(20, 420, 380, 20, AMBER); slab(520, 420, 340, 20, AMBER);     // deck / bar divider with a gap
  shade(20, 420, 380, 20, false, -1); shade(520, 420, 340, 20, false, -1); shade(860, IN_NORTH, 20, 232, true, -1); shade(880, IN_NORTH, 1, 232, true, 1); shade(860, 440, 20, 232, true, -1);
  // the bar side of the divider glows amber like a lintel
  rect(20, 440, 380, 3, AMBER, 0.55); rect(520, 440, 340, 3, AMBER, 0.55); for (let i = 0; i < 6; i++) { rect(20, 443 + i * 2, 380, 2, AMBER, 0.12 - i * 0.02); rect(520, 443 + i * 2, 340, 2, AMBER, 0.12 - i * 0.02); }
  // thick walls
  face(0, 0, W, IN_NORTH, true); face(0, H - IN_SOUTH, W, IN_SOUTH, false);
  // the doorway into the bar: two posts and an arch
  [[392, 8], [520, 8]].forEach(([x, w]) => { rect(x, 414, w, 30, 0x1d3550); rect(x + 1, 414, 2, 30, 0xffd37a, 0.9); rect(x + w - 3, 414, 2, 30, AMBER, 0.9); P.pool(x + w / 2, 440, 26, 20, AMBER, 0.35); });
  P.neonLine(392, 412, 528, 412, AMBER);

  // north wall, main deck: pipes at the left, a big window, lockers on the right
  [[26, CYAN], [38, AMBER], [50, GREEN]].forEach(([x, c]) => { rect(x, 0, 7, 36, 0x0b1626); line(x + 1, 0, x + 1, 36, c, 0.5, 1); for (let y = 6; y < 36; y += 10) rect(x - 1, y, 9, 2, 0x3a5c7a, 0.8); });
  window_(140, 9, 260, 26, [0.7, 0.5, 118]);
  lockers(700, 4, 5, 32, 30, CYAN);
  // north wall, hangar: parts shelves, a window onto the planet, a cable gantry
  window_(1010, 9, 220, 26, [0.28, 0.6, 130]);
  for (let i = 0; i < 4; i++) { const bx = 890 + i * 28; rect(bx, 6, 24, 28, 0x182c46); P.frame(bx, 6, 24, 28, 0x3d6288, 0.8, 1); rect(bx + 3, 10, 18, 8, [0x4a3414, 0x143a4a, 0x14402a, 0x4a1a34][i], 1); rect(bx + 3, 21, 18, 8, [0x143a4a, 0x4a3414, 0x4a1a34, 0x14402a][i], 1); }
  // south wall, bar: the back bar. a mirror, two shelves of bottles, a menu board, a clock, a vending machine
  { const x = 60, w = 380, y = H - IN_SOUTH;
    rect(x, y + 16, w, 26, 0x1a2a3a); rect(x, y + 16, w, 26, 0x2a4a5a, 0.35); P.frame(x, y + 16, w, 26, 0xb07a30, 0.9, 2);
    for (let i = 0; i < 9; i++) line(x + 20 + i * 44, y + 42, x + 50 + i * 44, y + 16, 0xffffff, 0.05, 6);
    const shelf = (sy) => { rect(x - 4, sy, w + 8, 3, 0x7a4a1c); rect(x - 4, sy + 3, w + 8, 2, 0x000000, 0.6);
      for (let bx = x + 6; bx < x + w - 8; bx += 11 + Math.floor(R() * 12)) { const bh = 8 + Math.floor(R() * 6), c = [AMBER, CYAN, GREEN, IN_PINK, 0xff7a3a][Math.floor(R() * 5)];
        rect(bx, sy - bh, 5, bh, 0x0a1620, 0.95); rect(bx + 1, sy - bh * 0.7, 3, bh * 0.7 - 1, c, 0.6); rect(bx + 1, sy - bh - 3, 3, 3, 0x0a1620, 0.95); rect(bx + 1, sy - bh + 1, 1, bh - 3, 0xffffff, 0.3); P.dot(bx + 2.5, sy - bh / 2, 7, c, 0.05); } };
    shelf(y + 28); shelf(y + 41);
    rect(x - 4, y + 13, w + 8, 3, 0x7a4a1c);
  }
  rect(470, H - IN_SOUTH + 14, 220, 28, 0x05080f); P.neonFrame(470, H - IN_SOUTH + 14, 220, 28, AMBER);                  // the menu board
  for (let i = 0; i < 4; i++) { rect(480, H - IN_SOUTH + 20 + i * 6, 40 + R() * 70, 2, AMBER, 0.55); rect(600, H - IN_SOUTH + 20 + i * 6, 30 + R() * 50, 2, CYAN, 0.45); }
  P.dot(712, H - IN_SOUTH + 26, 11, 0x05080f); P.ring(712, H - IN_SOUTH + 26, 11, AMBER, 0.9, 2); line(712, H - IN_SOUTH + 26, 712, H - IN_SOUTH + 19, 0xffd37a, 1, 1.5); line(712, H - IN_SOUTH + 26, 718, H - IN_SOUTH + 29, 0xffd37a, 1, 1.5); // clock
  lockers(760, H - IN_SOUTH + 8, 3, 30, 36, GREEN);
  // south wall, hangar: a gantry rail, hazard stripes, toolboxes, big warning plates
  rect(880, H - IN_SOUTH + 14, 380, 4, 0x2a4a6a); line(880, H - IN_SOUTH + 15, 1260, H - IN_SOUTH + 15, CYAN, 0.35, 1);
  for (let x = 884; x < 1256; x += 30) { rect(x, H - IN_SOUTH + 14, 14, 4, 0xe8b020, 0.85); }
  lockers(900, H - IN_SOUTH + 22, 4, 26, 24, AMBER); lockers(1150, H - IN_SOUTH + 22, 4, 26, 24, CYAN);
  [[1030, 'FUEL'], [1090, 'POWER'], [1150, 'AIR']].forEach(([x]) => { /* plates drawn as text in interiorBuild */ });
}

// ---------- fixed props, baked into the same layer ----------
function inDrawProps(P) {
  const R = inRng(23), rect = P.rect, line = P.line;
  const drop = (x, y, w, h, a = 0.4) => P.rrect(x + 4, y + 6, w, h, 4, 0x000000, a); // cast shadow, down and right
  const crate = (x, y, w = 40, h = 40, c = 0x4a3414) => {
    drop(x, y, w, h); rect(x, y, w, h, c); rect(x + 2, y + 2, w - 4, h - 4, inMix(c, 0xffffff, 0.1));
    P.frame(x + 5, y + 5, w - 10, h - 10, inMix(c, 0xffffff, 0.3), 0.8, 1);
    line(x + 3, y + 3, x + w - 3, y + h - 3, inMix(c, 0x000000, 0.4), 0.7, 2); line(x + w - 3, y + 3, x + 3, y + h - 3, inMix(c, 0x000000, 0.4), 0.7, 2);
    [[4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5]].forEach(([dx, dy]) => P.dot(x + dx, y + dy, 1.6, 0xd8c090, 0.9));
    rect(x + w / 2 - 6, y + h / 2 - 3, 12, 6, 0x120d05); rect(x + w / 2 - 4, y + h / 2 - 1.5, 8, 3, AMBER, 0.9);
    line(x, y + 1, x + w, y + 1, 0xffd37a, 0.55, 1); P.frame(x, y, w, h, AMBER, 0.75, 1.5);
  };
  const kiosk = (cx, cy, c) => { const x = cx - 50, y = cy - 22;
    drop(x, y, 100, 44, 0.45); rect(x, y, 100, 44, 0x0c1829); rect(x + 2, y + 2, 96, 30, 0x142a45); line(x, y, x + 100, y, 0x6a9ac0, 0.85, 1);
    rect(x + 8, y + 5, 84, 21, 0x02070d); P.frame(x + 8, y + 5, 84, 21, c, 0.9, 1.5); P.frame(x + 6, y + 3, 88, 25, c, 0.18, 3);
    for (let i = 0; i < 9; i++) rect(x + 9 + i * 9, y + 28, 7, 3, i % 3 === 0 ? c : 0x2a4a6a, i % 3 === 0 ? 0.7 : 0.9);
    rect(x, y + 33, 100, 11, 0x08121f); line(x, y + 33, x + 100, y + 33, 0x000000, 0.7, 1);
    [[8, c], [15, AMBER], [22, GREEN]].forEach(([dx, cc]) => { P.dot(x + dx, y + 39, 1.8, cc, 0.95); P.dot(x + dx, y + 39, 4, cc, 0.12); });
    for (let i = 0; i < 5; i++) line(x + 72 + i * 4, y + 36, x + 72 + i * 4, y + 42, 0x2a4a6a, 0.9, 1.5);
    P.frame(x, y, 100, 44, c, 0.55, 1.5);
  };
  kiosk(200, 200, CYAN); kiosk(640, 200, GREEN); kiosk(1000, 170 - 22 + 22 - 0, AMBER); // the shop kiosk sits at (950..1050, 148..192) = centre (1000, 170)
  // crates on the main deck (positions match the collider boxes in station.js)
  crate(480, 80); crate(520, 80); crate(740, 300);
  // a stack of boxes by the repair bay and loose cables across the deck
  P.g.lineStyle(3, 0x0a1220, 1); P.g.beginPath(); P.g.moveTo(690, 200); P.g.lineTo(760, 200); P.g.lineTo(790, 240); P.g.lineTo(790, 290); P.g.strokePath();
  P.g.lineStyle(1, GREEN, 0.4); P.g.beginPath(); P.g.moveTo(690, 199); P.g.lineTo(760, 199); P.g.lineTo(790, 239); P.g.lineTo(790, 289); P.g.strokePath();

  // ===== the bar =====
  // counter: a long dark-wood top with a bright lip, an underlit front, bottles, taps, a till
  { const x = 90, y = 596, w = 330, h = 26;
    P.rrect(x + 4, y + 8, w, h + 6, 6, 0x000000, 0.45);
    P.rrect(x, y, w, h, 5, 0x3d2010); P.rrect(x + 2, y + 2, w - 4, h - 7, 4, 0x56301a);
    line(x + 4, y + 3, x + w - 4, y + 3, 0xd69a58, 0.55, 1); line(x, y + h - 4, x + w, y + h - 4, 0x120a05, 0.8, 2);
    rect(x + 6, y + h - 2, w - 12, 3, AMBER, 0.95); P.pool(x + w / 2, y + h + 10, w * 0.52, 16, AMBER, 0.25);
    for (let i = 0; i < 6; i++) { const bx = x + 28 + i * 46, c = [AMBER, CYAN, GREEN, IN_PINK][i % 4]; P.dot(bx + 1, y + 11, 4.5, 0x08101a, 1); P.dot(bx, y + 10, 4, c, 0.95); P.dot(bx - 1, y + 9, 1.3, 0xffffff, 0.8); P.dot(bx, y + 10, 8, c, 0.1); }
    [x + 292, x + 302, x + 312].forEach((tx, i) => { rect(tx, y + 6, 5, 11, 0xcfd8e0, 0.9); rect(tx + 1, y + 4, 3, 3, [AMBER, CYAN, GREEN][i], 0.95); });
    rect(x + 6, y + 6, 24, 14, 0x0a121c); rect(x + 8, y + 8, 20, 8, 0x0a3a24); P.frame(x + 6, y + 6, 24, 14, GREEN, 0.8, 1);
    for (let i = 0; i < 4; i++) rect(x + 56 + i * 5, y + 6, 3, 3, 0xdfe8f0, 0.6);
  }
  // stools: leather cushions on chrome rings
  for (let i = 0; i < 5; i++) { const x = 130 + i * 70, y = 570;
    P.dot(x + 3, y + 5, 10, 0x000000, 0.4); P.dot(x, y, 10, 0x9a8a60, 1); P.dot(x, y, 8, 0x0e0a0a, 1); P.dot(x, y, 7, 0x6a1a2a, 1); P.dot(x - 2, y - 2, 3.5, 0xa84458, 0.6); P.ring(x, y, 7, 0x3a0a14, 0.8, 1); }
  // a stool in the east corner for SABLE, facing the door (shop.js NPCS)
  { const x = 790, y = 600;
    P.dot(x + 3, y + 5, 11, 0x000000, 0.4); P.dot(x, y, 11, 0x9a8a60, 1); P.dot(x, y, 9, 0x0e0a0a, 1); P.dot(x, y, 8, 0x3a2a5a, 1); P.dot(x - 2, y - 2, 3.5, 0x8a6ad0, 0.6); P.ring(x, y, 8, 0x1a0a3a, 0.8, 1); }
  // round tables with a glowing rim, a hologram candle, drinks
  [[598, 498], [178, 478]].forEach(([tx, ty]) => { const cx = tx + 22, cy = ty + 22;
    P.dot(cx + 4, cy + 6, 25, 0x000000, 0.42); P.dot(cx, cy, 25, 0x2e1608, 1); P.dot(cx, cy, 23, 0x4a2814, 1); P.dot(cx - 3, cy - 3, 14, 0x5e3620, 0.5); P.ring(cx, cy, 25, AMBER, 0.95, 2); P.ring(cx, cy, 28, AMBER, 0.12, 5);
    P.dot(cx, cy, 5, 0x05121c, 1); P.dot(cx, cy, 3, CYAN, 0.95); P.dot(cx, cy, 10, CYAN, 0.1);
    [[-12, 8], [11, -9], [9, 12]].forEach(([dx, dy], i) => { P.dot(cx + dx, cy + dy, 4, 0x0a1620, 1); P.ring(cx + dx, cy + dy, 4, [AMBER, CYAN, IN_PINK][i], 0.95, 1.3); });
    // two low stools tucked at the sides
    [[-33, 0], [33, 0]].forEach(([dx, dy]) => { P.dot(cx + dx + 2, cy + dy + 3, 9, 0x000000, 0.35); P.dot(cx + dx, cy + dy, 9, 0x6a1a2a, 1); P.ring(cx + dx, cy + dy, 9, 0x9a8a60, 0.9, 1.5); });
  });
  // a jukebox against the divider, east end of the bar
  { const x = 790, y = 444, w = 52, h = 26;
    drop(x, y, w, h); rect(x, y, w, h, 0x1a0e2a); rect(x + 2, y + 2, w - 4, h - 6, 0x2a1448); line(x, y + 1, x + w, y + 1, 0xd8a0ff, 0.6, 1);
    P.frame(x - 1, y - 1, w + 2, h + 2, IN_PINK, 0.9, 1.5); P.frame(x - 3, y - 3, w + 6, h + 6, IN_PINK, 0.12, 4);
    rect(x + 5, y + 5, w - 10, 11, 0x05030c); rect(x + 5, y + h - 8, w - 10, 3, CYAN, 0.7); P.pool(x + w / 2, y + h + 10, 50, 20, IN_PINK, 0.3);
  }
  // potted plants: bio-lamps. (the leaves are separate sprites so they can sway)
  [[44, 462], [836, 650], [832, 560]].forEach(([x, y]) => { P.dot(x + 3, y + 5, 15, 0x000000, 0.4); P.dot(x, y, 14, 0x1a1208, 1); P.ring(x, y, 14, 0x6a4a28, 0.9, 2); P.dot(x, y, 11, 0x24160a, 1); });

  // ===== the hangar =====
  // cargo containers stacked in the corner, a fuel pylon by the ship pad, a workbench, and a crate pile in the south corner
  const container = (x, y, w, h, c) => { drop(x, y, w, h); rect(x, y, w, h, inMix(c, 0x000000, 0.35)); rect(x + 2, y + 2, w - 4, h - 4, c);
    for (let rx = x + 8; rx < x + w - 4; rx += 8) line(rx, y + 2, rx, y + h - 2, inMix(c, 0x000000, 0.45), 0.7, 2);
    line(x, y + 1, x + w, y + 1, inMix(c, 0xffffff, 0.5), 0.7, 1); rect(x + 4, y + h / 2 - 3, 10, 6, 0xffffff, 0.8); rect(x + w - 14, y + h / 2 - 3, 10, 6, AMBER, 0.9); P.frame(x, y, w, h, inMix(c, 0xffffff, 0.35), 0.8, 1.5); };
  container(1170, 56, 84, 40, 0x1f5a8a); container(1170, 100, 84, 40, 0x8a3a1f); container(1180, 144, 70, 34, 0x2a7a4a);
  { const x = 1000, y = 580; P.dot(x + 4, y + 7, 22, 0x000000, 0.4); P.dot(x, y, 22, 0x1a2a3a, 1); P.ring(x, y, 22, 0xe8b020, 0.9, 3); P.dot(x, y, 17, 0x0c1622, 1); P.dot(x, y, 13, 0x164a2c, 1); P.dot(x - 3, y - 3, 5, 0x6dffa8, 0.5); P.ring(x, y, 17, CYAN, 0.6, 1); P.dot(x, y, 30, GREEN, 0.05); }
  // fuel hose: from the pylon across the floor to the ship
  P.g.lineStyle(5, 0x05090f, 1); P.g.beginPath(); P.g.moveTo(1018, 568); P.g.lineTo(1050, 520); P.g.lineTo(1056, 450); P.g.lineTo(1070, 392); P.g.strokePath();
  P.g.lineStyle(2, 0x2a6a4a, 1); P.g.beginPath(); P.g.moveTo(1018, 568); P.g.lineTo(1050, 520); P.g.lineTo(1056, 450); P.g.lineTo(1070, 392); P.g.strokePath();
  { const x = 898, y = 636, w = 70, h = 28; drop(x, y, w, h); rect(x, y, w, h, 0x2a2014); rect(x + 2, y + 2, w - 4, h - 6, 0x3e2e1a); line(x, y + 1, x + w, y + 1, 0xd8b070, 0.5, 1); P.frame(x, y, w, h, AMBER, 0.7, 1.5);
    rect(x + 8, y + 7, 12, 3, 0xcfd8e0, 0.9); rect(x + 26, y + 6, 4, 10, CYAN, 0.8); rect(x + 38, y + 8, 14, 6, 0xe8b020, 0.9); P.dot(x + 60, y + 11, 4, 0xc0c8d0, 0.9); }
  crate(1190, 600, 34, 34, 0x3a4a5a); crate(1226, 604, 34, 34, 0x4a3a2a); crate(1208, 566, 34, 34, 0x2a3a4a);
  // the hangar's glowing bay-door frame (the door itself is drawn in the floor stage; this is the lit surround)
  P.neonLine(1260, 236, 1260, 484, AMBER);
}

// ---------- textures ----------
function interiorTextures(s) {
  inTex(s, 'in-base', W, H, P => { P.big = true; inDrawBase(P); inDrawWalls(P); inDrawProps(P); P.big = false; });
  inCanvas(s, 'in-glow', 128, 128, (ctx) => { const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128); });
  inTex(s, 'in-shadow', 48, 24, P => { for (let i = 0; i < 8; i++) P.oval(24, 12, 44 * (1 - i / 8), 20 * (1 - i / 8), 0x000000, 0.1); });
  inCanvas(s, 'in-vig', W, H, (ctx) => { ctx.translate(W / 2, H / 2); ctx.scale(1, 0.62); const gr = ctx.createRadialGradient(0, 0, 330, 0, 0, 800); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,6,0.22)'); gr.addColorStop(1, 'rgba(0,0,6,0.78)'); ctx.fillStyle = gr; ctx.fillRect(-W, -H * 2, W * 2, H * 4); });
  inTex(s, 'in-beam', 160, 40, P => { for (let i = 0; i < 12; i++) P.poly([[0, 20], [160, 20 - 18 * (1 - i / 12)], [160, 20 + 18 * (1 - i / 12)]], 0xffffff, 0.04); });
  inTex(s, 'in-leaves', 44, 44, P => { // a bushy plant seen from above: layered leaves with glowing tips
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = 17;
      P.g.fillStyle(i % 2 ? 0x14683a : 0x1b8a4a, 1); P.g.fillEllipse(22 + Math.cos(a) * 9, 22 + Math.sin(a) * 9, 20, 9); P.g.fillStyle(0x000000, 0); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; P.dot(22 + Math.cos(a) * 16, 22 + Math.sin(a) * 16, 2.2, 0x9fffe0, 0.95); P.dot(22 + Math.cos(a) * 16, 22 + Math.sin(a) * 16, 5, GREEN, 0.18); }
    P.dot(22, 22, 5, 0x2aa85a, 1); P.dot(21, 21, 2, 0xc8ffd8, 0.8);
  });
  inTex(s, 'in-drone', 22, 22, P => { P.dot(11, 11, 9, 0x0e1c2e, 1); P.ring(11, 11, 9, CYAN, 0.95, 1.5); P.rect(3, 9, 16, 4, 0x1b3350); P.dot(16, 11, 3, CYAN, 1); P.dot(16, 11, 6, CYAN, 0.2); P.dot(4, 11, 2, AMBER, 0.9); });
  // hologram figures: wireframes in the terminal colour
  inTex(s, 'in-holo-planet', 60, 60, P => { const g = P.g; P.dot(30, 30, 24, CYAN, 0.1); g.lineStyle(1.5, CYAN, 0.95); g.strokeCircle(30, 30, 22);
    [10, 17].forEach(ry => { g.strokeEllipse(30, 30, 44, ry * 2); g.strokeEllipse(30, 30, ry * 2, 44); }); g.lineBetween(8, 30, 52, 30); g.lineBetween(30, 8, 30, 52); P.dot(48, 16, 3, 0xffffff, 0.95); });
  inTex(s, 'in-holo-hull', 60, 60, P => { const g = P.g; g.lineStyle(2, GREEN, 0.95); g.beginPath(); g.moveTo(30, 6); g.lineTo(52, 14); g.lineTo(52, 32); g.lineTo(30, 54); g.lineTo(8, 32); g.lineTo(8, 14); g.closePath(); g.strokePath();
    g.lineStyle(1, GREEN, 0.6); g.beginPath(); g.moveTo(30, 14); g.lineTo(44, 19); g.lineTo(44, 30); g.lineTo(30, 44); g.lineTo(16, 30); g.lineTo(16, 19); g.closePath(); g.strokePath();
    g.lineStyle(3, GREEN, 1); g.lineBetween(30, 22, 30, 36); g.lineBetween(23, 29, 37, 29); P.dot(30, 30, 24, GREEN, 0.08); });
  inTex(s, 'in-holo-ship', 80, 60, P => { const g = P.g; g.lineStyle(1.5, AMBER, 0.95); g.beginPath(); g.moveTo(74, 30); g.lineTo(8, 6); g.lineTo(26, 30); g.lineTo(8, 54); g.closePath(); g.strokePath();
    g.lineStyle(1, AMBER, 0.6); g.lineBetween(26, 30, 74, 30); g.lineBetween(26, 30, 60, 22); g.lineBetween(26, 30, 60, 38); P.dot(40, 30, 4, AMBER, 0.9); P.dot(40, 30, 28, AMBER, 0.07); });
  // people, seen from above, facing right: shoulders, head, hands. wide 0/1 are the two stride poses (a boot forward on one side, then the other)
  const person = (key, o) => [0, 1].forEach(stride => inTex(s, key + stride, 32, 32, P0 => {
    const K = 1.23, cx = 13, cy = 13, g = P0.g;
    const P = { oval: (x, y, w, h, c, a) => P0.oval(x * K, y * K, w * K, h * K, c, a), dot: (x, y, r, c, a) => P0.dot(x * K, y * K, r * K, c, a), rect: (x, y, w, h, c, a) => P0.rect(x * K, y * K, w * K, h * K, c, a),
      rrect: (x, y, w, h, r, c, a) => P0.rrect(x * K, y * K, w * K, h * K, r * K, c, a), line: (x1, y1, x2, y2, c, a, lw) => P0.line(x1 * K, y1 * K, x2 * K, y2 * K, c, a, (lw || 1) * K), frame: (x, y, w, h, c, a, lw) => P0.frame(x * K, y * K, w * K, h * K, c, a, (lw || 1) * K) };
    P.oval(cx + 1, cy + 3, 20, 24, 0x000000, 0.18);
    const fy = stride ? 4 : -4;                                    // boots
    P.oval(cx + 5, cy - 5 + fy, 8, 5, 0x0a1018, 1); P.oval(cx + 5, cy + 5 - fy, 8, 5, 0x0a1018, 1);
    if (o.pack) { P.rrect(cx - 11, cy - 6, 8, 12, 2, o.pack, 1); P.frame(cx - 11, cy - 6, 8, 12, o.edge, 0.7, 1); }
    P.oval(cx, cy, 11, 21, o.coat, 1); g.lineStyle(1.5 * K, o.edge, 0.95); g.strokeEllipse(cx * K, cy * K, 11 * K, 21 * K);      // shoulders in the coat colour, neon edge
    if (o.apron) { P.rrect(cx + 1, cy - 6, 5, 12, 2, o.apron, 0.95); }
    P.dot(cx + 1, cy - 8, 2.6, o.coat, 1); P.dot(cx + 1, cy + 8, 2.6, o.coat, 1);                                // arms
    P.dot(cx + 5, cy - 8 + (stride ? 1 : -1), 2, o.skin, 1); P.dot(cx + 5, cy + 8 + (stride ? -1 : 1), 2, o.skin, 1); // hands
    if (o.bun) P.dot(cx - 5, cy, 3, o.hair, 1);
    P.dot(cx + 1, cy, 5.5, o.hair, 1); P.dot(cx + 3, cy, 4, o.skin, 1);                                       // head: hair, then face toward +x
    if (o.cap) { P.rect(cx + 2, cy - 4.5, 7, 9, o.cap, 1); P.rect(cx + 7, cy - 4, 3, 8, inMix(o.cap, 0xffffff, 0.3), 1); }
    if (o.visor) { P.rect(cx + 5, cy - 3.5, 3, 7, o.visor, 0.95); P.dot(cx + 6, cy, 5, o.visor, 0.2); }
    if (o.goggles) { P.dot(cx + 6, cy - 2.2, 1.7, o.goggles, 1); P.dot(cx + 6, cy + 2.2, 1.7, o.goggles, 1); P.line(cx + 6, cy - 2, cx + 6, cy + 2, o.goggles, 0.8, 1); }
  }));
  person('in-pilot', { coat: 0x1a3a58, edge: CYAN, hair: 0x20150e, skin: 0xd8a47a, visor: CYAN, pack: 0x12263a });
  person('in-juno', { coat: 0x4a2a10, edge: AMBER, hair: 0x2a1408, skin: 0xb07850, apron: 0xe8d8b0, bun: true });
  person('in-tamsin', { coat: 0x5a1a28, edge: RED, hair: 0x2a1010, skin: 0xe0b090, cap: 0x2a0c14 });
  person('in-dex', { coat: 0x14402a, edge: GREEN, hair: 0x103018, skin: 0xc8946a, goggles: 0xbfffd8, pack: 0x0e2a1c });
  person('in-moss', { coat: 0x2c4654, edge: CYAN, hair: 0x8a8a94, skin: 0x9a6a48, cap: 0x182630, pack: 0x14222c });          // the mechanic: steel-blue overalls, a cap, a tool roll on the back
  person('in-sable', { coat: 0x241a32, edge: 0xc08cff, hair: 0xdcdcec, skin: 0xb89080, visor: 0xc08cff });                // the bounty hunter: a dark long coat, silver hair, a violet lens
  person('in-ida', { coat: 0x6a3a58, edge: IN_PINK, hair: 0x3a2418, skin: 0xe8c0a0, pack: 0x3a2030 });                    // the colonist: a rose survey jacket and a small pack
  [[0x3a3a5a, 0x9fb4ff, 0x2a2a30, 0xe0b898], [0x5a4a2a, 0xffd37a, 0x6a4a2a, 0xb88860], [0x3a4a4a, 0x9fffe8, 0x1a1a1a, 0xd8a47a]].forEach(([coat, edge, hair, skin], i) => person('in-civ' + i, { coat, edge, hair, skin, bun: i === 1, pack: i === 0 ? 0x22223a : 0 }));
}

// ---------- the scene: lights, signs, hologram terminals, animated bits, people ----------
const inHash = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

function interiorBuild(s) {
  interiorTextures(s);
  const I = s.in = { screens: [], walkers: [], shadows: [], arm: null, armSpark: null, eq: null, drone: null, shipFx: [], door: null, last: 0 };
  const ADD = Phaser.BlendModes.ADD;
  s.add.image(0, 0, 'in-base').setOrigin(0).setDepth(-50);
  IN_LIGHTS.forEach(([x, y, rx, ry, c, a]) => s.add.image(x, y, 'in-glow').setTint(c).setBlendMode(ADD).setAlpha(Math.min(1, a * 2.2)).setDisplaySize(rx * 2.1, ry * 2.1).setDepth(-49));
  s.walls.forEach(w => { if (w instanceof Phaser.GameObjects.Rectangle) w.setVisible(false); }); // the plain collision boxes: the art replaces them
  const solid = (x, y, w, h) => { const r = s.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setVisible(false); s.physics.add.existing(r, true); s.walls.push(r); return r; };
  const glow = (x, y, r, c, a, o = {}) => {
    const im = s.add.image(x, y, 'in-glow').setTint(c).setBlendMode(ADD).setAlpha(a).setScale((o.sx || 1) * r / 64, (o.sy || 1) * r / 64).setDepth(o.depth || 2.5);
    if (o.pulse) s.tweens.add({ targets: im, alpha: a * 0.55, duration: o.pulse, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * o.pulse });
    return im;
  };
  const shadow = (x, y, w = 1, a = 0.55) => { const im = s.add.image(x + 2, y + 6, 'in-shadow').setScale(w).setAlpha(a).setDepth(3.5); I.shadows.push(im); return im; };

  // solid props (the baked art in inDrawProps sits exactly on these boxes)
  [[1170, 56, 84, 40], [1170, 100, 84, 40], [1180, 144, 70, 34], [978, 558, 44, 44], [898, 636, 70, 28], [1190, 600, 34, 34], [1226, 604, 34, 34], [1208, 566, 34, 34], [790, 444, 52, 26]].forEach(a => solid(...a));
  [[44, 462], [836, 650], [832, 560]].forEach(([x, y]) => solid(x - 13, y - 13, 26, 26));

  // light: window shafts, pools that breathe, lamps
  const shaft = (x0, x1, y1, dx, a) => { const g = s.add.graphics().setDepth(2).setBlendMode(ADD); g.fillStyle(0x9fd8ff, a); g.fillPoints([{ x: x0, y: IN_NORTH }, { x: x1, y: IN_NORTH }, { x: x1 + dx + 30, y: y1 }, { x: x0 + dx - 10, y: y1 }], true); return g; };
  shaft(150, 190, 330, 60, 0.05); shaft(230, 290, 340, 80, 0.045); shaft(320, 395, 320, 70, 0.04);
  [[460, 250, 260, 0x9fd8ff, 0.08], [255, 640, 150, AMBER, 0.12], [620, 560, 200, IN_PINK, 0.07], [1090, 360, 210, 0xbfe9ff, 0.1]].forEach(([x, y, r, c, a]) => glow(x, y, r, c, a, { pulse: 2600 + Math.random() * 1500 }));
  [[200, 150, CYAN], [640, 150, GREEN], [1000, 118, AMBER]].forEach(([x, y, c]) => glow(x, y + 20, 70, c, 0.22, { pulse: 1800 }));

  // neon signs
  const neon = (x, y, text, color, size, o = {}) => {
    const css = inCss(color), w = text.length * size * 0.62;
    const halo = glow(x, y, 64, color, o.a || 0.5, { sx: w / 64 * 0.9 + 0.5, sy: size / 36 + 0.4, depth: 3.2 });
    const t = s.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size + 'px', fontStyle: 'bold', color: inCss(inMix(color, 0xffffff, 0.8)) })
      .setOrigin(0.5).setPadding(12).setDepth(4).setStroke(css, 3).setShadow(0, 0, css, 14, true, true);
    s.tweens.add({ targets: [t, halo], alpha: 0.45, duration: 60, yoyo: true, repeat: -1, repeatDelay: 1800 + Math.random() * 3200, hold: 40 });
    return t;
  };
  neon(460, 394, 'THE DRIFT  BAR', AMBER, 18);
  neon(460, 464, 'THE DRIFT', IN_PINK, 22, { a: 0.55 });
  neon(944, 66, 'HANGAR 1', AMBER, 14, { a: 0.35 });
  const bayText = s.add.text(1090, 478, 'BAY 01', { fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#ffb454' }).setOrigin(0.5).setAlpha(0.45).setDepth(-45);

  // hologram terminals: a wireframe that turns above each desk, with a light cone
  const holo = (x, y, key, c) => {
    const g = s.add.graphics().setDepth(2.4).setBlendMode(ADD); g.fillStyle(c, 0.07); g.fillPoints([{ x: x - 30, y: y + 28 }, { x: x + 30, y: y + 28 }, { x: x + 46, y: y + 56 }, { x: x - 46, y: y + 56 }], true);
    const im = s.add.image(x, y, key).setBlendMode(ADD).setDepth(6).setAlpha(0.9);
    s.tweens.add({ targets: im, scaleX: 0.2, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: im, y: y - 5, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    s.tweens.add({ targets: im, alpha: 0.55, duration: 130, yoyo: true, repeat: -1, repeatDelay: 2200 + Math.random() * 2000 });
  };
  holo(200, 150, 'in-holo-planet', CYAN); holo(640, 150, 'in-holo-hull', GREEN); holo(1000, 120, 'in-holo-ship', AMBER);

  // terminal screens (the dark wells in the baked kiosks)
  [[150, 178, CYAN, 'missions'], [590, 178, GREEN, 'repair'], [950, 148, AMBER, 'shop']].forEach(([x, y, c, kind]) => I.screens.push({ g: s.add.graphics().setDepth(2.2), x: x + 8, y: y + 5, w: 84, h: 21, c, kind, last: -1 }));
  I.eq = s.add.graphics().setDepth(2.2); // the jukebox's meter

  // a repair arm that works over the bay, and sparks at its tip
  I.arm = s.add.graphics().setDepth(7);
  I.armSpark = s.add.particles(0, 0, 'spark', { lifespan: 380, speed: { min: 30, max: 120 }, angle: { min: 0, max: 360 }, scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xfff1a8, GREEN, 0xffffff], blendMode: 'ADD', emitting: false }).setDepth(7);

  // hangar: beacons turning above the bay door, steam from vents, a drone that patrols the pad
  [[1240, 236, AMBER], [1240, 484, AMBER], [900, 664, RED]].forEach(([x, y, c], i) => {
    const b = s.add.image(x, y, 'in-beam').setOrigin(0, 0.5).setTint(c).setBlendMode(ADD).setAlpha(0.34).setDepth(7).setScale(0.8);
    s.tweens.add({ targets: b, rotation: Math.PI * 2, duration: 2400 + i * 300, repeat: -1 });
    s.add.circle(x, y, 3, c, 1).setDepth(7); glow(x, y, 26, c, 0.5, { depth: 7, pulse: 600 });
  });
  [[1040, 664], [1110, 664]].forEach(([x, y]) => { s.add.rectangle(x, y + 6, 40, 14, 0x04080f, 1).setDepth(-45).setStrokeStyle(1, 0x3a5c7a);
    for (let i = 0; i < 4; i++) s.add.rectangle(x, y + 1 + i * 3.5, 34, 1.5, 0x1d3550, 1).setDepth(-44);
    s.add.particles(x, y, 'spark', { lifespan: 1500, speed: { min: 14, max: 36 }, angle: { min: 250, max: 290 }, scale: { start: 0.9, end: 3.4 }, alpha: { start: 0.2, end: 0 }, tint: 0xbfe9ff, blendMode: ADD, frequency: 700, quantity: 3 }).setDepth(7); });
  I.drone = s.add.image(1090, 360, 'in-drone').setDepth(6); I.droneShadow = s.add.image(1090, 360, 'in-shadow').setScale(0.5).setAlpha(0.5).setDepth(3.5); I.droneGlow = glow(1090, 360, 34, CYAN, 0.35, { depth: 5.9 });
  // the bay door: a shutter that rolls up when you launch
  I.door = s.add.graphics({ x: 1240, y: 244 }).setDepth(2.6); I.door.fillStyle(0x0b1624, 1); I.door.fillRect(0, 0, 20, 232); I.door.lineStyle(1, 0x3a5c7a, 1);
  for (let y = 6; y < 232; y += 10) I.door.lineBetween(0, y, 20, y); I.door.fillStyle(AMBER, 0.9); I.door.fillRect(0, 0, 20, 4); I.door.fillRect(0, 228, 20, 4);

  // the ship: a shadow, engine and cockpit glow. station.js owns the sprite (s.shipImg) and feelLaunch moves it.
  if (s.shipImg) {
    s.shipImg.setDepth(2.8);
    I.shipShadow = s.add.image(0, 0, 'in-shadow').setAlpha(0.7).setScale(3.4 * shipFitScale(3) / 3, 3.6 * shipFitScale(3) / 3).setDepth(2.7); // a soft oval, not a copy of the 'ship' texture: shipRefresh (ships.js) rebuilds that texture when you buy an upgrade and a copy would break
    I.shipFx = [glow(0, 0, 40, AMBER, 0.5, { depth: 2.9, pulse: 900 }), glow(0, 0, 26, CYAN, 0.35, { depth: 2.9, pulse: 1400 })];
  }

  // plants sway; the bar has a few people
  [[44, 462], [836, 650], [832, 560]].forEach(([x, y], i) => { const l = s.add.image(x, y, 'in-leaves').setDepth(3.6).setScale(1.15); s.tweens.add({ targets: l, rotation: 0.1, scale: 1.2, duration: 2400 + i * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
  const seated = [['in-civ0', 587, 520, 0], ['in-civ1', 233, 500, Math.PI], ['in-civ2', 340, 570, Math.PI / 2]];
  seated.forEach(([key, x, y, rot], i) => { const p = s.add.image(x, y, key + '0').setRotation(rot).setDepth(4); shadow(x, y, 0.6, 0.5); solid(x - 10, y - 10, 20, 20);
    s.tweens.add({ targets: p, scale: 1.05, duration: 1700 + i * 330, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
  // Juno's shaker
  { const sh = s.add.rectangle(264, 640, 4, 11, 0xcfd8e0).setDepth(4.5).setStrokeStyle(1, 0xffffff, 0.6);
    s.time.addEvent({ delay: 3800, loop: true, callback: () => s.tweens.add({ targets: sh, angle: 28, x: 268, duration: 90, yoyo: true, repeat: 7 }) });
    s.add.rectangle(246, 640, 5, 8, 0xe8b020, 0.9).setDepth(4.5); }

  // wanderers in the bar
  for (let i = 0; i < 2; i++) {
    const key = 'in-civ' + (i === 0 ? 1 : 2), sp = s.add.image(Phaser.Math.Between(460, 780), Phaser.Math.Between(570, 680), key + '0').setDepth(4);
    const sh = shadow(sp.x, sp.y, 0.6, 0.5), w = { sp, key, sh };
    const wander = () => { const tx = Phaser.Math.Between(450, 790), ty = Phaser.Math.Between(560, 680); sp.rotation = Math.atan2(ty - sp.y, tx - sp.x);
      s.tweens.add({ targets: sp, x: tx, y: ty, duration: Phaser.Math.Between(3500, 7000), onComplete: () => s.time.delayedCall(Phaser.Math.Between(400, 2500), wander) }); };
    wander(); I.walkers.push(w);
  }

  // dust in the air
  s.add.particles(0, 0, 'spark', { x: { min: 30, max: 1250 }, y: { min: 60, max: 690 }, lifespan: 7000, speedX: { min: -5, max: 5 }, speedY: { min: -9, max: -2 }, scale: { start: 0.3, end: 0.15 }, alpha: { start: 0.3, end: 0 }, tint: [0x9fe9ff, IN_WARM], blendMode: ADD, frequency: 260 }).setDepth(8);
  // the edges of the screen fall into shadow
  s.add.image(0, 0, 'in-vig').setOrigin(0).setDepth(60);
}

// a ship ready to launch: the bay door rolls up (called from the ship's E action in station.js)
function interiorLaunch(s) {
  if (!s.in || !s.in.door) return;
  s.tweens.add({ targets: s.in.door, scaleY: 0.01, duration: 380, ease: 'Cubic.easeIn' });
}

// once per frame
function interiorTick(s, time) {
  const I = s.in; if (!I) return;
  const f = Math.floor(time / 140), moving = s.player.body && s.player.body.speed > 20;
  // walking: the two stride poses swap while you move
  s.player.setTexture('in-pilot' + (moving ? f % 2 : 0));
  I.walkers.forEach(w => { w.sp.setTexture(w.key + (f % 2)); w.sh.setPosition(w.sp.x + 2, w.sp.y + 6); });
  if (!I.pshadow) { I.pshadow = s.add.image(0, 0, 'in-shadow').setAlpha(0.6).setDepth(3.5); I.plight = s.add.image(0, 0, 'in-glow').setTint(0xbfe9ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.14).setScale(1.1).setDepth(2.4); }
  I.pshadow.setPosition(s.player.x + 2, s.player.y + 6); I.plight.setPosition(s.player.x, s.player.y);
  if (s.shipImg && I.shipShadow) {
    const x = s.shipImg.x, y = s.shipImg.y; I.shipShadow.setPosition(x + 10, y + 14);
    const L = shipLook(), k = s.shipImg.scaleX; // src/shipmodels.js: where this hull's engine and cockpit are
    I.shipFx[0].setPosition(x + L.fx[0] * k, y); I.shipFx[1].setPosition(x + L.fx[1] * k, y);
  }
  // the drone circles the pad
  { const a = time / 2600; I.drone.setPosition(1090 + Math.cos(a) * 150, 360 + Math.sin(a) * 105).setRotation(a + Math.PI / 2); I.droneShadow.setPosition(I.drone.x + 2, I.drone.y + 8); I.droneGlow.setPosition(I.drone.x, I.drone.y); }
  // terminal screens, about seven frames a second
  if (f !== I.last) {
    I.last = f;
    I.screens.forEach(o => {
      const g = o.g; g.clear();
      if (o.kind === 'missions') { for (let r = 0; r < 4; r++) { const wv = 18 + inHash(r * 7 + Math.floor(f / 9)) * 44, y = o.y + 3 + r * 5; g.fillStyle(o.c, r === (Math.floor(f / 7) % 4) ? 0.95 : 0.4); g.fillRect(o.x + 4, y, wv, 3); g.fillStyle(AMBER, 0.6); g.fillRect(o.x + o.w - 20, y, 14, 3); } }
      else if (o.kind === 'repair') { const hf = Phaser.Math.Clamp(G.hull / G.maxHull, 0, 1); g.fillStyle(0x0a2a1a, 1); g.fillRect(o.x + 4, o.y + 3, o.w - 8, 5); g.fillStyle(hf < 0.4 ? RED : o.c, 0.95); g.fillRect(o.x + 4, o.y + 3, (o.w - 8) * hf, 5);
        g.lineStyle(1, o.c, 0.9); g.beginPath(); for (let i = 0; i <= 20; i++) { const px = o.x + 4 + i * 4, py = o.y + 15 + Math.sin(i * 0.9 + f * 0.6) * 3 * (i % 5 === 2 ? 2 : 1); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.strokePath(); }
      else { PART_ORDER.forEach((slot, k) => { const t = partTier(slot); for (let p = 0; p < 3; p++) { g.fillStyle(p < t ? o.c : 0x3a2a0c, p < t ? 0.95 : 1); g.fillRect(o.x + 5 + k * 16 + p * 4, o.y + 4, 3, 5); } g.fillStyle(o.c, 0.35 + 0.3 * Math.sin(f * 0.5 + k)); g.fillRect(o.x + 5 + k * 16, o.y + 13, 12, 4); }); }
    });
    const e = I.eq; e.clear(); for (let i = 0; i < 9; i++) { const h = 2 + inHash(i * 3 + f) * 8; e.fillStyle(i % 3 ? IN_PINK : CYAN, 0.95); e.fillRect(795 + i * 5, 460 - h, 3, h); }
  }
  // the repair arm: base on the right of the bay, reaching over the kiosk
  { const g = I.arm, t = time / 1000, bx = 698, by = 186;
    const a1 = Math.PI * 1.1 + 0.3 * Math.sin(t * 1.3), a2 = a1 - 0.9 + 0.8 * Math.sin(t * 2.1 + 1);
    const jx = bx + Math.cos(a1) * 36, jy = by + Math.sin(a1) * 36, tx = jx + Math.cos(a2) * 32, ty = jy + Math.sin(a2) * 32;
    g.clear(); g.lineStyle(7, 0x05090f, 1); g.lineBetween(bx, by, jx, jy); g.lineBetween(jx, jy, tx, ty);
    g.lineStyle(4, 0x2a4a6a, 1); g.lineBetween(bx, by, jx, jy); g.lineBetween(jx, jy, tx, ty); g.lineStyle(1, 0x7ab8e8, 0.8); g.lineBetween(bx, by - 1, jx, jy - 1);
    g.fillStyle(0x0a1626, 1); g.fillCircle(bx, by, 7); g.lineStyle(2, GREEN, 0.9); g.strokeCircle(bx, by, 7); g.fillStyle(GREEN, 1); g.fillCircle(jx, jy, 3); g.fillStyle(0xffffff, 1); g.fillCircle(tx, ty, 2.5);
    g.fillStyle(GREEN, 0.25); g.fillCircle(tx, ty, 8);
    if (time - (I.sparkAt || 0) > 1700) { I.sparkAt = time + Phaser.Math.Between(0, 900); I.armSpark.emitParticleAt(tx, ty, 8); } }
}
