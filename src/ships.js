// ---------- Ships: every ship texture, and what a ship shows while it flies ----------
// Textures (shapes only, drawn once): the player ship with its upgrade tiers, pirates (raider, drone, gunship), the
// Reaver, the MULE freighter, civilians, police. Each canvas has a glow margin around the hull, so the physics
// circles in space.js / enemies.js / missions.js carry the matching offsets (SHIPS.pad below).
// Per frame (shipsFrame, called from feelFrame): engine flames and ribbon trails that scale with thrust, a shield
// flash when you are hit, smoke and sparks on any ship under half hull, a white hit flash (shipsHit).
//   boot.js   -> shipsTextures(scene)      draws every ship texture at boot
//   any scene -> shipRefresh(scene)        redraws 'ship' when the owned upgrade tiers changed (shop.js, scene create)
//   space.js  -> shipsInstall(s)           particle emitters and the drawing layer
//   feel.js   -> shipsFrame(s, time, dt)   flames, trails, shield, smoke, sparks
//   hits      -> shipsHit(s, obj, x, y)    white flash and sparks on the ship that was hit

const SHIPS = {
  sig: null,                 // the upgrade tiers the current 'ship' texture was drawn for
  pad: { ship: [6, 5], police: [6, 5], drone: [5, 5], raider: [5, 4], gunship: [6, 5], reaver: [8, 7], freighter: [6, 6], civilian: [6, 6] },
  // engine nozzles per texture: [along (px behind the centre), across, size]; the flame and trail come out of these
  nozzles: {
    ship: [[-14, 0, 1]], police: [[-14, 0, 1]], raider: [[-10, 0, 0.7]], drone: [[-15, 0, 0.8]],
    gunship: [[-21, -5.5, 0.8], [-21, 5.5, 0.8]], reaver: [[-45, -9, 1.2], [-45, 0, 1.4], [-45, 9, 1.2]],
    freighter: [[-30, -3.5, 0.8], [-30, 3.5, 0.8]], civilian: [[-29, -4, 0.6], [-29, 4, 0.6]]
  },
  flame: { ship: CYAN, police: 0x7fb8ff, raider: 0xff6b8a, drone: RED, gunship: 0xff8c3a, reaver: 0xff2a4a, freighter: AMBER, civilian: 0xdfefff },
  ribbonMs: 420, shieldMs: 320, flashMs: 70
};

// ---- drawing helpers (texture time) ----
function shPoly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function shFill(g, pts, color, a = 1) { g.fillStyle(color, a); shPoly(g, pts); g.fillPath(); }
// a neon edge: three soft strokes under one crisp one
function shNeon(g, pts, color, lw = 1.5, glow = 1) {
  [[lw + 8, 0.06], [lw + 5, 0.1], [lw + 2.5, 0.2]].forEach(([w, a]) => { g.lineStyle(w, color, a * glow); shPoly(g, pts); g.strokePath(); });
  g.lineStyle(lw, color, 1); shPoly(g, pts); g.strokePath();
}
// depth: the hull drawn again a few times, each shrunk toward the light and a step lighter
function shShade(g, pts, dark, light, cx, cy, steps = 4, lx = -1, ly = -1) {
  const d = Phaser.Display.Color.ValueToColor(dark), l = Phaser.Display.Color.ValueToColor(light);
  for (let i = 0; i <= steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(d, l, steps, i), k = 1 - i / (steps + 1) * 0.55;
    const p = pts.map(([x, y]) => [cx + (x - cx) * k + lx * i * 0.8, cy + (y - cy) * k + ly * i * 0.8]);
    shFill(g, p, Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
  }
}
function shHalo(g, x, y, color, r, a) { for (let i = 4; i >= 1; i--) { g.fillStyle(color, a); g.fillCircle(x, y, r * i / 4); } }
function shCockpit(g, x, y, r, color) {
  shHalo(g, x, y, color, r * 3.2, 0.07);
  g.fillStyle(0x02060d, 1); g.fillCircle(x, y, r + 1);
  g.fillStyle(color, 1); g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 0.95); g.fillCircle(x + r * 0.25, y - r * 0.25, r * 0.42);
}
// an engine nozzle on the tail: a dark can with the glowing exhaust inside, and a soft glow behind it
function shNozzle(g, x, y, w, h, color, hot = 0xfff1a8) {
  shHalo(g, x - w * 0.4, y, color, h * 1.4, 0.08);
  g.fillStyle(0x060a12, 1); g.fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
  g.fillStyle(color, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(hot, 1); g.fillRect(x - w / 2, y - h / 4, w * 0.6, h / 2);
}
function shLight(g, x, y, color, r = 1.8) { shHalo(g, x, y, color, r * 3, 0.1); g.fillStyle(color, 1); g.fillCircle(x, y, r); g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, r * 0.45); }
function shLine(g, x1, y1, x2, y2, color, a = 0.5, w = 1) { g.lineStyle(w, color, a); g.lineBetween(x1, y1, x2, y2); }
const shMirror = (pts, cy) => pts.map(([x, y]) => [x, 2 * cy - y]);

// ---- the textures ----
function shipsTextures(scene) {
  const mk = (key, w, h, fn) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const g = scene.make.graphics({ x: 0, y: 0, add: false }); fn(g); g.generateTexture(key, w, h); g.destroy();
  };
  SHIPS.sig = null; shipRefresh(scene);

  mk('police', 56, 40, g => { // Halcyon patrol: the fighter frame in blue and white, a light bar across the back
    const BL = 0x3a8dff, cy = 20;
    const hull = [[50, 20], [36, 12], [22, 9], [8, 5], [11, 13], [14, 16], [14, 24], [11, 27], [8, 35], [22, 31], [36, 28]];
    shShade(g, hull, 0x0b1830, 0x1e3f6e, 24, cy);
    shFill(g, [[46, 20], [30, 16.5], [16, 16.5], [14, 20], [16, 23.5], [30, 23.5]], 0xdfefff, 1);                 // white fuselage
    shFill(g, [[30, 11.5], [20, 10], [22, 13], [30, 14]], 0xdfefff, 0.9); shFill(g, shMirror([[30, 11.5], [20, 10], [22, 13], [30, 14]], cy), 0xdfefff, 0.9); // chevrons
    for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? 0xff4d6d : 0x7fb8ff, 1); g.fillRect(17 + i * 3, 12.5, 3, 2.5); g.fillRect(17 + i * 3, 25, 3, 2.5); } // light bars
    shNeon(g, hull, BL, 1.5);
    shLine(g, 16, 20, 44, 20, 0x9fd0ff, 0.5);
    shNozzle(g, 12, 20, 5, 7, 0x9fd0ff, 0xffffff);
    shCockpit(g, 32, 20, 3.2, BL);
    shLight(g, 9, 6, 0xff4d6d, 1.6); shLight(g, 9, 34, 0x7fb8ff, 1.6);
  });

  mk('raider', 40, 30, g => { // pirate raider: a thin dart with forward-swept fins, hot pink edge
    const PK = 0xff6b8a, cy = 15;
    const hull = [[37, 15], [26, 11.5], [8, 9], [13, 15], [8, 21], [26, 18.5]];
    const fin = [[16, 12], [9, 4], [20, 11]];
    shFill(g, fin, 0x3a0c18, 1); shFill(g, shMirror(fin, cy), 0x3a0c18, 1);
    shNeon(g, fin, PK, 1.2, 0.6); shNeon(g, shMirror(fin, cy), PK, 1.2, 0.6);
    shShade(g, hull, 0x2a0b14, 0x6a1e34, 20, cy, 3);
    shLine(g, 14, 15, 34, 15, 0xff9db3, 0.55);
    shNeon(g, hull, PK, 1.5);
    shNozzle(g, 11, 15, 4, 5, PK, 0xffd0dc);
    shCockpit(g, 25, 15, 2.3, PK);
  });

  mk('drone', 44, 44, g => { // pirate drone: a rewired survey rig, four rotor pads on a hex core and one red eye
    const c = 22;
    shHalo(g, c, c, RED, 20, 0.04);
    [[c, 6], [38, c], [c, 38], [6, c]].forEach(([x, y]) => {
      g.lineStyle(5, 0x2a0b14, 1); g.lineBetween(c, c, x, y); g.lineStyle(1.5, RED, 0.8); g.lineBetween(c, c, x, y);
      g.fillStyle(0x1a0810, 1); g.fillCircle(x, y, 4.5); g.lineStyle(1.5, RED, 1); g.strokeCircle(x, y, 4.5);
      g.lineStyle(1, RED, 0.45); g.strokeCircle(x, y, 2.2);
    });
    const hex = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; hex.push([c + Math.cos(a) * 10, c + Math.sin(a) * 10]); }
    shShade(g, hex, 0x2a0b14, 0x6a1a2c, c, c, 3);
    shNeon(g, hex, RED, 1.5);
    g.lineStyle(1, RED, 0.5); g.strokeCircle(c, c, 5.5);
    shLine(g, 12, 12, 32, 32, RED, 0.25); shLine(g, 32, 12, 12, 32, RED, 0.25);
    shCockpit(g, 27, c, 3.4, RED);
    shLight(g, c, 6, RED, 1.4); shLight(g, c, 38, RED, 1.4);
  });

  mk('gunship', 60, 50, g => { // pirate gunship: a wide riveted brick with two gun pods and heavy orange trim
    const OR = 0xff8c3a, cy = 25;
    const hull = [[56, 25], [44, 12], [16, 14], [9, 25], [16, 36], [44, 38]];
    shShade(g, hull, 0x2e1608, 0x6e3a16, 30, cy);
    const pod = [[18, 6], [42, 6], [44, 15], [18, 15]];
    [pod, shMirror(pod, cy)].forEach(p => { shFill(g, p, 0x1a0c04, 1); shShade(g, p, 0x3a1c0a, 0x7a4418, 30, p[0][1] < cy ? 10 : 40, 2); shNeon(g, p, OR, 1.2, 0.5); });
    [[24, 8.5], [32, 8.5], [24, 41.5], [32, 41.5]].forEach(([x, y]) => { g.fillStyle(0xffd0a0, 0.8); g.fillCircle(x, y, 1); }); // rivets
    g.fillStyle(0x060a12, 1); g.fillRect(42, 7, 12, 5); g.fillRect(42, 38, 12, 5); g.fillStyle(0xaaaaaa, 1); g.fillRect(43, 8, 10, 3); g.fillRect(43, 39, 10, 3); // barrels
    shLight(g, 54, 9.5, OR, 1.5); shLight(g, 54, 40.5, OR, 1.5);
    shFill(g, [[56, 25], [48, 19], [48, 31]], 0x8a4a1a, 1); // armoured nose
    shNeon(g, hull, OR, 2);
    shLine(g, 16, 20, 44, 20, OR, 0.3); shLine(g, 16, 30, 44, 30, OR, 0.3);
    shNozzle(g, 10, 19.5, 5, 5, OR); shNozzle(g, 10, 30.5, 5, 5, OR);
    shCockpit(g, 40, 25, 4.5, OR);
  });

  mk('reaver', 112, 90, g => { // the bounty boss: a long warship with prow blades, four turrets, three engines and a red eye
    const RR = 0xff2a4a, cy = 45;
    shHalo(g, 56, cy, RR, 44, 0.03);
    const hull = [[108, 45], [86, 20], [66, 12], [30, 17], [14, 31], [10, 45], [14, 59], [30, 73], [66, 78], [86, 70]];
    const blade = [[86, 20], [104, 31], [88, 36], [78, 24]];
    [blade, shMirror(blade, cy)].forEach(b => { shShade(g, b, 0x2a0a12, 0x6a1a2c, 90, b[0][1] < cy ? 28 : 62, 2); shNeon(g, b, RR, 1.5, 0.6); });
    shShade(g, hull, 0x1c0810, 0x4a1420, 56, cy, 5);
    const pods = [[36, 7], [60, 3], [36, 74], [60, 78]];
    pods.forEach(([x, y]) => {
      const p = [[x, y], [x + 20, y], [x + 22, y + 9], [x, y + 9]];
      shFill(g, p, 0x0e0408, 1); shShade(g, p, 0x3a0f1a, 0x7a2a3c, x + 10, y + 4.5, 2); shNeon(g, p, RR, 1, 0.5);
      g.fillStyle(0x060a12, 1); g.fillRect(x + 20, y + 2.5, 8, 4); g.fillStyle(0xbbbbbb, 1); g.fillRect(x + 21, y + 3.5, 7, 2);
      shLight(g, x + 4, y + 4.5, RR, 1.2);
    });
    shLine(g, 20, 45, 84, 45, RR, 0.35, 2); shLine(g, 30, 22, 80, 40, RR, 0.3); shLine(g, 30, 68, 80, 50, RR, 0.3);
    [[48, 30], [60, 26], [48, 60], [60, 64]].forEach(([x, y]) => { shFill(g, [[x, y], [x + 10, y - 2], [x + 12, y + 4], [x + 2, y + 6]], 0x5a1a28, 0.9); }); // armour plates
    g.lineStyle(1.5, 0x02060d, 0.8); g.lineBetween(40, 38, 52, 44); g.lineBetween(46, 52, 58, 48); // battle scars
    shNeon(g, hull, RR, 3);
    shNozzle(g, 15, 36, 6, 7, AMBER); shNozzle(g, 13, 45, 7, 9, AMBER); shNozzle(g, 15, 54, 6, 7, AMBER);
    shHalo(g, 78, 45, RR, 20, 0.08); shCockpit(g, 78, 45, 7.5, RR);
    g.fillStyle(0x02060d, 1); g.fillCircle(79.5, 45, 2.2); // the pupil
  });

  mk('freighter', 76, 40, g => { // the MULE: engine block, three cargo modules on a spine, a cab with a lit window
    const cy = 20;
    g.fillStyle(0x1a1408, 1); g.fillRect(16, 15, 50, 10); g.lineStyle(1, AMBER, 0.5); g.strokeRect(16.5, 15.5, 49, 9); // spine
    shShade(g, [[8, 12], [20, 12], [20, 28], [8, 28]], 0x1a1408, 0x4a3a16, 14, cy, 2);                                 // engine block
    shNeon(g, [[8, 12], [20, 12], [20, 28], [8, 28]], AMBER, 1.2, 0.5);
    [[22, 0x6b4a16], [36, 0x8a5a1a], [50, 0x6b4a16]].forEach(([x, col]) => {
      const box = [[x, 11], [x + 12, 11], [x + 12, 29], [x, 29]];
      shShade(g, box, 0x2a1c08, col, x + 6, cy, 3);
      g.fillStyle(0xffd37a, 0.85); g.fillRect(x + 1, 12, 10, 1.5); g.fillRect(x + 1, 26.5, 10, 1.5);                     // hazard stripes
      g.lineStyle(1.2, AMBER, 0.9); g.strokeRect(x, 11, 12, 18);
    });
    shShade(g, [[62, 13], [70, 15], [72, 20], [70, 25], [62, 27]], 0x2a2210, 0x6a5020, 66, cy, 2);                      // cab
    shNeon(g, [[62, 13], [70, 15], [72, 20], [70, 25], [62, 27]], AMBER, 1.5);
    g.fillStyle(CYAN, 1); g.fillRect(66, 17.5, 4, 5); g.fillStyle(0xffffff, 0.9); g.fillRect(68, 18, 1.5, 1.5);          // window
    shNozzle(g, 8, 16.5, 4, 5, AMBER); shNozzle(g, 8, 23.5, 4, 5, AMBER);
    shLight(g, 23, 10, GREEN, 1.2); shLight(g, 23, 30, 0xff4d6d, 1.2); shLight(g, 61, 12, 0xffffff, 1);
  });

  mk('civilian', 76, 40, g => { // a passenger liner, pale so each civilian's tint reads as a clear colour
    const cy = 20;
    const fin = [[12, 20], [4, 9], [20, 15]];
    shFill(g, fin, 0x9fb0c4, 1); shFill(g, shMirror(fin, cy), 0x9fb0c4, 1); g.lineStyle(1.2, 0xffffff, 0.8); shPoly(g, fin); g.strokePath(); shPoly(g, shMirror(fin, cy)); g.strokePath();
    g.fillStyle(0x8a9cb0, 1); g.fillRoundedRect(10, 11, 58, 18, 7);
    g.fillStyle(0xc4d0e0, 1); g.fillRoundedRect(11, 11, 56, 14, 7);
    g.fillStyle(0xe6eef8, 1); g.fillRoundedRect(14, 12, 48, 6, 3);                                                        // lit upper deck
    g.lineStyle(1.5, 0xffffff, 0.9); g.strokeRoundedRect(10, 11, 58, 18, 7);
    for (let i = 0; i < 8; i++) { g.fillStyle(0x1a2a40, 1); g.fillCircle(20 + i * 5.2, 21, 1.3); }                       // windows
    g.fillStyle(0x1a2a40, 1); g.fillRoundedRect(58, 14, 8, 12, 3); g.fillStyle(0x9fe9ff, 0.9); g.fillRect(60, 16, 4, 3);   // cockpit glass
    g.lineStyle(1, 0x6a7a90, 0.9); g.lineBetween(14, 25, 60, 25);
    shNozzle(g, 10, 16, 4, 4, 0xdfefff, 0xffffff); shNozzle(g, 10, 24, 4, 4, 0xdfefff, 0xffffff);
    shLight(g, 14, 10, GREEN, 1.1); shLight(g, 14, 30, 0xff4d6d, 1.1);
  });

  mk('smoke', 24, 24, g => { for (let i = 4; i >= 1; i--) { g.fillStyle(0xffffff, 0.22); g.fillCircle(12, 12, 3 * i); } });
}

// the player ship: redrawn whenever the owned tiers change, so the plating, barrels and nozzles you bought show
function shipRefresh(scene) {
  const u = G.upgrades || {}, sig = [u.armor | 0, u.rapid | 0, u.booster | 0].join('');
  if (SHIPS.sig === sig && scene.textures.exists('ship')) return false;
  if (scene.textures.exists('ship')) scene.textures.remove('ship');
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  shipDraw(g, u.armor | 0, u.rapid | 0, u.booster | 0);
  g.generateTexture('ship', 56, 40); g.destroy();
  SHIPS.sig = sig;
  SHIPS.nozzles.ship = (u.booster | 0) >= 2 ? [[-14, -5.5, 0.9], [-14, 5.5, 0.9]] : [[-14, 0, (u.booster | 0) ? 1.3 : 1]];
  if (scene.shipImg && scene.shipImg.active) scene.shipImg.setTexture('ship');
  if (scene.ship && scene.ship.active) scene.ship.setTexture('ship');
  if (scene.in && scene.in.shipShadow && scene.in.shipShadow.active) scene.in.shipShadow.setTexture('ship'); // interior.js: the hangar shadow image shares the texture
  return true;
}
function shipDraw(g, armor, rapid, booster) {
  const cy = 20, STEEL = 0x7fb2cc;
  const hull = [[50, 20], [36, 12], [22, 9], [8, 5], [11, 13], [14, 16], [14, 24], [11, 27], [8, 35], [22, 31], [36, 28]];
  shHalo(g, 28, 20, CYAN, 16, 0.025);
  if (rapid) { // gun barrels under the wings: one pair, then a longer second pair
    [[10, 24, 16], [30, 24, 16]].forEach(([y, x, len]) => { g.fillStyle(0x060a12, 1); g.fillRect(x - 1, y - 1.5, len + 2, 3); g.fillStyle(0xdfefff, 1); g.fillRect(x, y - 1, len, 2); shLight(g, x + len, y, AMBER, 1.1); });
    if (rapid >= 2) [[13.5, 28, 18], [26.5, 28, 18]].forEach(([y, x, len]) => { g.fillStyle(0x060a12, 1); g.fillRect(x - 1, y - 1.5, len + 2, 3); g.fillStyle(0xdfefff, 1); g.fillRect(x, y - 1, len, 2); shLight(g, x + len, y, AMBER, 1.1); });
  }
  shShade(g, hull, 0x0b2236, 0x1f5a80, 26, cy);
  shFill(g, [[46, 20], [30, 16.5], [16, 16.5], [14, 20], [16, 23.5], [30, 23.5]], 0x2a7aa6, 1);                           // fuselage
  shFill(g, [[44, 20], [30, 18], [18, 18], [17, 20]], 0x3f9ac4, 0.9);                                                     // its lit side
  shLine(g, 12, 8, 30, 17, CYAN, 0.35); shLine(g, 12, 32, 30, 23, CYAN, 0.35);                                           // wing panel lines
  if (armor) { // plating strips along the leading edges; tier 2 adds root plates and a chin
    const strip = [[36, 12.5], [22, 9.5], [23.5, 12.5], [36, 14.5]];
    shFill(g, strip, STEEL, 0.95); shFill(g, shMirror(strip, cy), STEEL, 0.95);
    if (armor >= 2) {
      const root = [[20, 13], [28, 13.5], [30, 16.5], [19, 16]];
      shFill(g, root, 0x5a8aa6, 1); shFill(g, shMirror(root, cy), 0x5a8aa6, 1);
      g.lineStyle(1, STEEL, 0.9); shPoly(g, root); g.strokePath(); shPoly(g, shMirror(root, cy)); g.strokePath();
      shFill(g, [[47, 20], [40, 17.5], [40, 22.5]], STEEL, 1);
    }
  }
  shNeon(g, hull, CYAN, armor ? 2.2 : 1.5);
  shLine(g, 16, 20, 44, 20, 0x9fe9ff, 0.5);
  if (booster >= 2) { shNozzle(g, 12, 14.5, 5, 5, AMBER); shNozzle(g, 12, 25.5, 5, 5, AMBER); shHalo(g, 9, 20, AMBER, 9, 0.06); }
  else if (booster === 1) { shNozzle(g, 12, 20, 6, 9, AMBER); shHalo(g, 8, 20, AMBER, 9, 0.07); }
  else shNozzle(g, 12, 20, 5, 7, AMBER);
  shCockpit(g, 32, 20, 3.2, CYAN);
  shLight(g, 9, 6, AMBER, 1.6); shLight(g, 9, 34, AMBER, 1.6);
}

// ---- in flight ----
function shipsInstall(s) {
  s.fx.ships = s.add.graphics().setDepth(3.6).setBlendMode(Phaser.BlendModes.ADD); // flames, ribbons, shield: above the spark trail (3), under the ships (4+)
  s.smoke = s.add.particles(0, 0, 'smoke', {
    lifespan: 1100, speed: { min: 6, max: 28 }, scale: { start: 0.5, end: 1.9 }, alpha: { start: 0.42, end: 0 },
    tint: [0x8a93a0, 0x5c6670, 0x3a424c], rotate: { min: 0, max: 360 }, emitting: false
  }).setDepth(4.2);
  s.sparks = s.add.particles(0, 0, 'spark', {
    lifespan: { min: 160, max: 420 }, speed: { min: 90, max: 280 }, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 },
    tint: [0xffffff, 0xffd37a, AMBER], blendMode: 'ADD', emitting: false
  }).setDepth(6);
  s.shield = [];
}

// a ship was hit: white flash for a moment, sparks where the shot landed; your own ship also gets the shield flash
function shipsHit(s, o, x, y) {
  if (!o || !o.active) return;
  if (s.sparks) s.sparks.explode(o === s.ship ? 8 : 5, x === undefined ? o.x : x, y === undefined ? o.y : y);
  if (o.setTintFill && !o.civ) { o.setTintFill(0xffffff); o.flashUntil = s.time.now + SHIPS.flashMs; }
  if (o === s.ship && s.shield) s.shield.push({ a: x === undefined ? null : Phaser.Math.Angle.Between(o.x, o.y, x, y), t: s.time.now });
}

function shipsFrame(s, time, dt) {
  const g = s.fx && s.fx.ships; if (!g) return;
  g.clear();
  const ship = s.ship;
  if (ship && ship.visible && ship.body && !s.dead) {
    const th = Math.min(1, ship.body.acceleration.length() / 1500);
    shipsOne(s, g, ship, 'ship', th, G.hull / G.maxHull, time, dt, s.boosting ? 0x9fe9ff : (th > 0.6 ? 0x9fe9ff : AMBER), s.boosting ? 1.5 : 1);
    shipsShield(s, g, ship, time);
  }
  if (s.enemies) s.enemies.getChildren().forEach(e => {
    if (!e.active || !e.body) return;
    const def = e.def || PIRATES.drone, key = def.tex || 'drone';
    const th = Math.min(1, e.body.acceleration.length() / (def.speed || 300) + (e.charging ? 0.6 : 0));
    shipsOne(s, g, e, key, th, e.hp / def.hp, time, dt, SHIPS.flame[key] || RED, 1);
  });
  if (s.mx && s.mx.freighter && s.mx.freighter.active) {
    const f = s.mx.freighter;
    shipsOne(s, g, f, 'freighter', Math.min(1, f.body.speed / 130), f.hp / f.maxHp, time, dt, AMBER, 1);
  }
  if (s.tr) {
    s.tr.police.forEach(p => shipsOne(s, g, p.img, 'police', shipsSpeed(p.img, dt, 360), 1, time, dt, 0x7fb8ff, 1));
    s.tr.civ.forEach(c => { if (c.img.alpha > 0.2) shipsOne(s, g, c.img, 'civilian', shipsSpeed(c.img, dt, 150), 1, time, dt, 0xdfefff, 0.8); });
  }
}
// thrust for a ship moved by hand (no body): how fast it went since the last frame, against its top speed
function shipsSpeed(o, dt, top) {
  const v = o.lastX === undefined || dt <= 0 ? 0 : Math.hypot(o.x - o.lastX, o.y - o.lastY) / dt * 1000;
  o.lastX = o.x; o.lastY = o.y;
  return Math.min(1, v / top);
}

// one ship this frame: its flames and ribbon from each nozzle, damage smoke and sparks, the end of a hit flash
function shipsOne(s, g, o, key, th, frac, time, dt, color, boost) {
  const r = o.rotation, sc = o.scaleX || 1, c = Math.cos(r), n = Math.sin(r);
  const noz = SHIPS.nozzles[key] || SHIPS.nozzles.drone;
  if (o.flashUntil && time > o.flashUntil) { o.clearTint(); o.flashUntil = 0; }
  o.ribs = o.ribs || noz.map(() => []);
  noz.forEach(([dx, dy, size], i) => {
    const x = o.x + (c * dx - n * dy) * sc, y = o.y + (n * dx + c * dy) * sc;
    // ribbon: the last 420 ms of nozzle positions, fading and thinning toward the tail
    const rib = o.ribs[i] || (o.ribs[i] = []);
    if (th > 0.05 || (o.body && o.body.speed > 60)) rib.push({ x, y, t: time, w: (2 + 4 * th) * size * sc * boost });
    while (rib.length && time - rib[0].t > SHIPS.ribbonMs) rib.shift();
    for (let j = 1; j < rib.length; j++) {
      const k = 1 - (time - rib[j].t) / SHIPS.ribbonMs;
      g.lineStyle(rib[j].w * k, color, 0.55 * k);
      g.lineBetween(rib[j - 1].x, rib[j - 1].y, rib[j].x, rib[j].y);
    }
    if (th > 0.02) shipsFlame(g, x, y, r, th, size * sc, color, boost);
  });
  // damage: smoke under 60% hull from the tail, sparks and a hull flicker under 30%
  if (frac < 0.6 && s.smoke) {
    const heavy = frac < 0.3, rate = (heavy ? 0.5 : 0.12) * Math.min(1, dt / 16.67);
    if (Math.random() < rate) {
      const [dx, dy] = noz[Math.floor(Math.random() * noz.length)];
      s.smoke.emitParticleAt(o.x + (c * dx * 0.7 - n * dy) * sc, o.y + (n * dx * 0.7 + c * dy) * sc, 1);
    }
    if (heavy && Math.random() < 0.05 * Math.min(1, dt / 16.67) && s.sparks) s.sparks.explode(3, o.x + Phaser.Math.Between(-8, 8) * sc, o.y + Phaser.Math.Between(-8, 8) * sc);
    if (heavy && !o.flashUntil && o.setAlpha) o.setAlpha(Math.random() < 0.08 ? 0.55 : 1);
  }
}

// a layered flame: soft outer glow, the coloured plume, a white core; longer and brighter with thrust, always flickering
function shipsFlame(g, x, y, r, th, size, color, boost = 1) {
  const flick = 0.85 + Math.random() * 0.3, len = (14 + 40 * th) * size * flick * boost, wid = (3 + 4 * th) * size;
  const c = Math.cos(r), n = Math.sin(r), tx = x - c * len, ty = y - n * len;
  const side = (d) => [x - n * d, y + c * d];
  const [ax, ay] = side(wid * 1.6), [bx, by] = side(-wid * 1.6);
  g.fillStyle(color, 0.16); g.fillTriangle(ax, ay, bx, by, x - c * len * 1.25, y - n * len * 1.25);
  const [cx, cy] = side(wid), [dx, dy] = side(-wid);
  g.fillStyle(color, 0.8); g.fillTriangle(cx, cy, dx, dy, tx, ty);
  const [ex, ey] = side(wid * 0.45), [fx, fy] = side(-wid * 0.45);
  g.fillStyle(0xffffff, 0.9); g.fillTriangle(ex, ey, fx, fy, x - c * len * 0.55, y - n * len * 0.55);
  g.fillStyle(0xffffff, 0.5); g.fillCircle(x, y, wid * 0.7);
}

// the shield: a hex bubble that lights up when you are hit, brightest on the side the shot came from
function shipsShield(s, g, ship, time) {
  s.shield = s.shield.filter(h => time - h.t < SHIPS.shieldMs);
  if (!s.shield.length) return;
  const R = 27 * (ship.scaleX || 1), pts = [];
  for (let i = 0; i < 6; i++) { const a = ship.rotation + i / 6 * Math.PI * 2; pts.push([ship.x + Math.cos(a) * R, ship.y + Math.sin(a) * R]); }
  s.shield.forEach(h => {
    const k = 1 - (time - h.t) / SHIPS.shieldMs;
    g.fillStyle(CYAN, 0.1 * k); shPoly(g, pts); g.fillPath();
    g.lineStyle(2, 0x9fe9ff, 0.55 * k); shPoly(g, pts); g.strokePath();
    if (h.a !== null) { g.lineStyle(4, 0xffffff, 0.9 * k); g.beginPath(); g.arc(ship.x, ship.y, R, h.a - 0.55, h.a + 0.55); g.strokePath(); }
  });
}
