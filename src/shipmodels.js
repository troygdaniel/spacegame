// ---------- Player ship models: the six hulls of docs/UNIVERSE.md 6.1 and 6.2, drawn in code ----------
// wren (starter), kite (courier), ox (hauler), talon (fighter), pathfinder (explorer), bastion (heavy). Every texture faces right (+x),
// with a margin round the hull for the neon glow; the physics circle, the nozzles and the callout anchors are in texture pixels from the
// top left, so they carry over to any scale.
//
// The player's texture is always 'ship': shipRefresh() (src/ships.js) draws the ACTIVE model at its owned tiers into it, so space.js,
// the HUD, the title and the hangar need no change to show another hull. shipActiveModel() asks the fleet (src/fleet.js, card u-a3) when
// that exists and says 'wren' until then. shipPreviewTexture() makes a copy under its own key for a hangar card or a test sheet.
//
// Tiers (0 to 3) are drawn per ship: t.plating (the armor / shields slot), t.guns (weapons), t.engine (engine). When parts get their five
// slots (card u-d1) only shipTiers() below changes; the art keeps these three names.
//   SHIP_LOOK[id]  name, role  for the hangar and the Ship bay until src/data_ships.js (card u-a3) owns them
//                  w, h      texture size
//                  body      [radius, x, y] of the physics circle (space.js reads it)
//                  nozzles   function of the engine tier -> [[along, across, size], ...] from the centre (flames and trail, ships.js)
//                  flame     [idle colour, thrust colour]
//                  shield    radius of the hit bubble, px at scale 1
//                  anchors   where the callouts of the Ship bay (src/shipmode.js) point: armor, booster, rapid, hull
//                  fx        [engine glow, cockpit glow] along the ship, px at scale 1, for the hangar light (src/interior.js)
//                  draw      (g, t) -> the picture

const SHIP_HANGAR_W = 168; // how wide a ship looks on the hangar pad: the Wren at 3x

function shipTiers() { const u = G.upgrades || {}; return { plating: u.armor | 0, guns: u.rapid | 0, engine: u.booster | 0 }; } // armor, rapid, booster today
function shipActiveModel() {
  const id = typeof activeShip === 'function' ? (activeShip() || {}).model : 'wren';
  return SHIP_LOOK[id] ? id : 'wren';
}
const shipLook = id => SHIP_LOOK[id || shipActiveModel()];
// scale that makes a ship of this model as wide as `base` times the Wren's 56 px (3 on the hangar pad, 5 in the Ship bay)
const shipFitScale = (base, id) => base * 56 / shipLook(id).w;

// a gun barrel: dark sleeve, bright bar, a lit tip
function shBarrel(g, x, y, len, w = 2, tip = AMBER) {
  g.fillStyle(0x060a12, 1); g.fillRect(x - 1, y - w / 2 - 1, len + 2, w + 2);
  g.fillStyle(0xdfefff, 1); g.fillRect(x, y - w / 2, len, w); shLight(g, x + len, y, tip, 1.1);
}
// the same shape on both sides of the ship's centre line cy
const shBoth = (g, cy, pts, fn) => { fn(pts); fn(shMirror(pts, cy)); };

// ---------------------------------------------------------------- Wren: the starter dart (the original drawing)
function shWren(g, t) { shipDrawWren(g, t.plating, t.guns, t.engine); }

// ---------------------------------------------------------------- Kite: a thin needle with swept fins, white and cyan, two long nozzles
function shKite(g, t) {
  const cy = 18, STEEL = 0x9fb8c8;
  const hull = [[56, 18], [46, 15.5], [34, 14], [22, 12], [10, 3], [8, 7], [11, 13], [8, 16], [8, 20], [11, 23], [8, 29], [10, 33], [22, 24], [34, 22], [46, 20.5]];
  shHalo(g, 30, 18, CYAN, 15, 0.025);
  if (t.guns) { // slim barrels along the fin tips, a second pair at tier 2, a glowing nose lance at 3
    [[6.5, 14, 14], [29.5, 14, 14]].forEach(([y, x, len]) => shBarrel(g, x, y, len, 1.8));
    if (t.guns >= 2) [[10, 22, 12], [26, 22, 12]].forEach(([y, x, len]) => shBarrel(g, x, y, len, 1.8));
    if (t.guns >= 3) { g.fillStyle(0xffffff, 0.9); g.fillRect(52, 17.4, 6, 1.2); shLight(g, 58, 18, AMBER, 1.4); }
  }
  shShade(g, hull, 0x16222e, 0x9fb8c8, 28, cy);
  shFill(g, [[52, 18], [40, 15.8], [22, 15.4], [12, 18], [22, 20.6], [40, 20.2]], 0xe8f4fb, 1);                    // the white fuselage
  shFill(g, [[50, 18], [24, 17.2], [14, 18], [24, 18.8]], CYAN, 0.9);                                              // its cyan stripe
  shLine(g, 14, 6, 30, 14, CYAN, 0.35); shLine(g, 14, 30, 30, 22, CYAN, 0.35);
  if (t.plating) { // plates along the fins' leading edges, root plates at tier 2, a glowing seam at 3
    const strip = [[34, 14], [22, 12], [24, 14.2], [34, 15.8]];
    shFill(g, strip, STEEL, 0.95); shFill(g, shMirror(strip, cy), STEEL, 0.95);
    if (t.plating >= 2) { const root = [[22, 14.6], [32, 15.6], [32, 17], [20, 16.6]]; shFill(g, root, 0xcfe0ee, 1); shFill(g, shMirror(root, cy), 0xcfe0ee, 1); shFill(g, [[56, 18], [48, 16.4], [48, 19.6]], STEEL, 1); }
    if (t.plating >= 3) { shLine(g, 12, 9, 33, 14.4, 0xffffff, 0.8, 1.2); shLine(g, 12, 27, 33, 21.6, 0xffffff, 0.8, 1.2); }
  }
  shNeon(g, hull, CYAN, t.plating ? 1.8 : 1.2);
  const cool = 0x9fe9ff;                                                                                           // exhaust runs white-blue, not amber
  if (t.engine >= 3) { shNozzle(g, 9, 14, 7, 3.6, cool); shNozzle(g, 9, 22, 7, 3.6, cool); shNozzle(g, 9, 18, 6, 3, cool); shHalo(g, 6, 18, cool, 10, 0.07); }
  else if (t.engine === 2) { shNozzle(g, 9, 14.5, 7, 3.6, cool); shNozzle(g, 9, 21.5, 7, 3.6, cool); shNozzle(g, 9, 18, 5, 2.6, cool); shHalo(g, 6, 18, cool, 9, 0.06); }
  else if (t.engine === 1) { shNozzle(g, 9, 14.5, 8, 4, cool); shNozzle(g, 9, 21.5, 8, 4, cool); shHalo(g, 6, 18, cool, 8, 0.06); }
  else { shNozzle(g, 9, 14.5, 7, 3.2, cool); shNozzle(g, 9, 21.5, 7, 3.2, cool); }
  shCockpit(g, 40, 18, 2.6, CYAN);
  shLight(g, 10, 3.5, cool, 1.2); shLight(g, 10, 32.5, cool, 1.2);
}

// ---------------------------------------------------------------- Ox: a boxy spine, three cargo pods, a big engine block, a cab to one side, amber hazard bands
function shOx(g, t) {
  const cy = 23, STEEL = 0x7fb2cc;
  shHalo(g, 39, 23, CYAN, 21, 0.02);
  g.fillStyle(0x0c1a28, 1); g.fillRect(24, 19, 48, 8); g.lineStyle(1, CYAN, 0.5); g.strokeRect(24.5, 19.5, 47, 7);        // the spine
  const eng = [[8, 10], [24, 10], [27, 14], [27, 32], [24, 36], [8, 36]];                                            // the engine block
  shShade(g, eng, 0x0e1c2a, 0x2a4a68, 16, cy, 3); shNeon(g, eng, CYAN, 1.4, 0.7);
  g.fillStyle(0xffffff, 0.12); g.fillRect(10, 14, 12, 2); g.fillRect(10, 30, 12, 2);
  [28, 41, 54].forEach((x, i) => { // three cargo pods across the spine
    const box = [[x + 1, 8], [x + 10, 8], [x + 11, 9], [x + 11, 37], [x + 10, 38], [x + 1, 38], [x, 37], [x, 9]];
    shShade(g, box, 0x14263a, 0x3a5e82, x + 5.5, cy, 3);
    g.fillStyle(AMBER, 0.92); g.fillRect(x + 1, 10, 9, 1.6); g.fillRect(x + 1, 34.4, 9, 1.6);                           // hazard bands
    g.fillStyle(0xffd37a, 0.5); g.fillRect(x + 4, 10, 1.5, 1.6); g.fillRect(x + 4, 34.4, 1.5, 1.6);
    shLine(g, x + 5.5, 13, x + 5.5, 33, CYAN, 0.25); shNeon(g, box, CYAN, 1, 0.35);
    if (t.plating) { g.fillStyle(STEEL, 0.9); g.fillRect(x, 20, 1.6, 6); g.fillRect(x + 9.4, 20, 1.6, 6); }          // side armour on every pod
    if (t.plating >= 2) { g.fillStyle(STEEL, 0.95); g.fillRect(x + 1, 8, 9, 1.6); g.fillRect(x + 1, 36.4, 9, 1.6); }  // and across the ends
    shLight(g, x + 5.5, 8.6, i === 0 ? GREEN : 0xffffff, 0.9);
  });
  const cab = [[67, 9], [73, 10], [76, 14], [73, 18], [67, 19]];                                                     // the cab, up on the port side
  shShade(g, cab, 0x14263a, 0x3a5e82, 71, 14, 2); shNeon(g, cab, CYAN, 1.3);
  g.fillStyle(CYAN, 1); g.fillRect(71, 11.5, 4, 5); g.fillStyle(0xffffff, 0.9); g.fillRect(73, 12, 1.5, 1.5);          // its window
  g.fillStyle(0x0a1622, 1); g.fillRect(67, 28, 8, 9); g.lineStyle(1, STEEL, 0.7); g.strokeRect(67.5, 28.5, 7, 8);       // a sensor box on the other side
  shLight(g, 71, 32, AMBER, 1);
  if (t.guns) { shBarrel(g, 70, 23, 7, 2.4); if (t.guns >= 2) { shBarrel(g, 70, 21.2, 6, 1.4); shBarrel(g, 70, 24.8, 6, 1.4); } }
  const AM = AMBER;
  if (t.engine >= 1) { shNozzle(g, 7, 17, 6, 8, AM); shNozzle(g, 7, 29, 6, 8, AM); shHalo(g, 3, 23, AM, 12, 0.06); }
  else { shNozzle(g, 7, 23, 6, 14, AM); shHalo(g, 3, 23, AM, 11, 0.05); }
  shLight(g, 27, 9, 0xff4d6d, 1); shLight(g, 27, 37, GREEN, 1);
}

// ---------------------------------------------------------------- Talon: a wide delta, two forward gun pods, graphite with amber
function shTalon(g, t) {
  const cy = 22, STEEL = 0x7fb2cc, AM = 0xffa040;
  const hull = [[56, 22], [44, 15], [30, 9], [14, 2], [10, 4], [16, 14], [8, 18], [8, 26], [16, 30], [10, 40], [14, 42], [30, 35], [44, 29]];
  shHalo(g, 30, 22, CYAN, 18, 0.025);
  shShade(g, hull, 0x14161c, 0x4a505c, 28, cy);
  shFill(g, [[50, 22], [34, 17], [20, 19], [16, 22], [20, 25], [34, 27]], 0x24282f, 1);                               // fuselage
  shFill(g, [[48, 22], [36, 19], [24, 20.5], [20, 22]], 0x5a606c, 0.9);                                             // its lit side
  shBoth(g, cy, [[34, 10.2], [30, 9], [16, 3], [18, 6.4], [30, 12]], p => shFill(g, p, AM, 0.95));                    // amber strips on the leading edges
  shLine(g, 14, 12, 30, 16, 0xffffff, 0.18); shLine(g, 14, 32, 30, 28, 0xffffff, 0.18);
  const pod = [[28, 6.5], [42, 7], [44, 11], [28, 12.5]];                                                          // the two gun pods
  [pod, shMirror(pod, cy)].forEach(p => { shFill(g, p, 0x101218, 1); shShade(g, p, 0x1c1f26, 0x5a606c, 36, p[0][1] < cy ? 9.6 : 34.4, 2); shNeon(g, p, AM, 1.2, 0.85); });
  [9.6, 34.4].forEach(y => {
    shBarrel(g, 44, y, t.guns >= 1 ? 11 : 8, 2.4, AM);
    if (t.guns >= 2) { shBarrel(g, 44, y + (y < cy ? 2.6 : -2.6), 9, 1.4, AM); }
  });
  if (t.guns >= 2) shBarrel(g, 52, 22, 7, 2.2, AM);                                                                  // a nose gun at tier 2
  if (t.guns >= 3) { g.fillStyle(0xffffff, 0.85); g.fillRect(54, 21.4, 6, 1.2); }
  if (t.plating) {
    const strip = [[44, 15.6], [30, 9.8], [31.5, 13], [44, 17.6]];
    shFill(g, strip, STEEL, 0.95); shFill(g, shMirror(strip, cy), STEEL, 0.95);
    if (t.plating >= 2) { const root = [[22, 17], [30, 16.4], [32, 19.6], [20, 19.4]]; shFill(g, root, 0x5a8aa6, 1); shFill(g, shMirror(root, cy), 0x5a8aa6, 1); shFill(g, [[57, 22], [50, 19.6], [50, 24.4]], STEEL, 1); }
    if (t.plating >= 3) { shLine(g, 16, 4, 44, 16, 0xffffff, 0.7, 1.2); shLine(g, 16, 40, 44, 28, 0xffffff, 0.7, 1.2); }
  }
  shNeon(g, hull, CYAN, t.plating ? 2 : 1.5);
  shLine(g, 18, 22, 48, 22, 0x9fe9ff, 0.4);
  if (t.engine >= 2) { shNozzle(g, 9, 17.5, 5, 5, AM); shNozzle(g, 9, 26.5, 5, 5, AM); shNozzle(g, 9, 22, 5, 3.4, AM); shHalo(g, 6, 22, AM, 11, 0.07); }
  else if (t.engine === 1) { shNozzle(g, 9, 18, 6, 6.4, AM); shNozzle(g, 9, 26, 6, 6.4, AM); shHalo(g, 6, 22, AM, 10, 0.06); }
  else { shNozzle(g, 9, 19, 5, 5, AM); shNozzle(g, 9, 25, 5, 5, AM); }
  shCockpit(g, 38, 22, 3.4, CYAN);
  shLight(g, 10, 4.5, AM, 1.4); shLight(g, 10, 39.5, AM, 1.4);
}

// ---------------------------------------------------------------- Pathfinder: a round hull, a sensor dish on the back, long fuel tanks alongside, pale green
function shPathfinder(g, t) {
  const cy = 24, GR = 0x7fffd0, STEEL = 0x9fc8c0;
  shHalo(g, 32, 24, GR, 22, 0.02);
  const tank = [[16, 3], [44, 3], [48, 6], [44, 9], [16, 9], [12, 6]];
  [tank, shMirror(tank, cy)].forEach((p, k) => {
    const ty = k ? 42 : 6;
    g.fillStyle(0x16282a, 1); g.fillRect(20, k ? 33 : 9, 4, 6); g.fillRect(36, k ? 33 : 9, 4, 6);                      // struts to the hull
    shShade(g, p, 0x16282a, 0x6aa09a, 30, ty, 2); shNeon(g, p, GR, 1, 0.45);
    [22, 30, 38].forEach(x => shLine(g, x, ty - 3, x, ty + 3, 0x1a3a3a, 0.8, 1));
    shLight(g, 46.5, ty, GR, 1.1);
  });
  const hull = [[56, 24], [52, 17], [44, 12], [30, 10], [16, 12], [10, 18], [8, 24], [10, 30], [16, 36], [30, 38], [44, 36], [52, 31]];
  shShade(g, hull, 0x10222a, 0x3a7a78, 32, cy, 4);
  if (t.plating) {
    const plate = [[44, 12.6], [30, 10.6], [18, 12.6], [30, 14], [44, 14.4]];
    shFill(g, plate, STEEL, 0.9); shFill(g, shMirror(plate, cy), STEEL, 0.9);
    if (t.plating >= 2) { shFill(g, [[56, 24], [50, 21], [50, 27]], STEEL, 1); const side = [[14, 14], [22, 12.6], [22, 15], [13, 17]]; shFill(g, side, STEEL, 0.9); shFill(g, shMirror(side, cy), STEEL, 0.9); }
    if (t.plating >= 3) { shLine(g, 18, 12.6, 44, 12.6, 0xffffff, 0.7, 1.2); shLine(g, 18, 35.4, 44, 35.4, 0xffffff, 0.7, 1.2); }
  }
  shNeon(g, hull, GR, t.plating ? 1.8 : 1.4);
  // the sensor dish: a bowl with rings and four struts to a feed horn
  g.fillStyle(0x0a1618, 1); g.fillCircle(22, 24, 9);
  g.lineStyle(1.4, GR, 0.95); g.strokeCircle(22, 24, 8); g.lineStyle(1, GR, 0.6); g.strokeCircle(22, 24, 5); g.lineStyle(1, GR, 0.45); g.strokeCircle(22, 24, 2.6);
  [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + 0.4; shLine(g, 22, 24, 22 + Math.cos(a) * 8, 24 + Math.sin(a) * 8, GR, 0.5); });
  g.fillStyle(0xffffff, 0.95); g.fillCircle(22, 24, 1.4); shHalo(g, 22, 24, GR, 8, 0.05);
  if (t.guns) { [6, 42].forEach(y => shBarrel(g, 48, y, 8, 1.8, GR)); if (t.guns >= 2) [6, 42].forEach(y => shBarrel(g, 46, y + (y < cy ? 2.4 : -2.4), 6, 1.2, GR)); if (t.guns >= 3) shBarrel(g, 56, 24, 6, 1.8, GR); }
  if (t.engine >= 2) { shNozzle(g, 9, 19, 5, 5, GR); shNozzle(g, 9, 29, 5, 5, GR); shNozzle(g, 9, 24, 5, 3.2, GR); shHalo(g, 6, 24, GR, 11, 0.07); }
  else if (t.engine === 1) { shNozzle(g, 9, 19.5, 6, 6, GR); shNozzle(g, 9, 28.5, 6, 6, GR); shHalo(g, 6, 24, GR, 10, 0.06); }
  else { shNozzle(g, 9, 20, 5, 5, GR); shNozzle(g, 9, 28, 5, 5, GR); }
  shCockpit(g, 44, 24, 4, GR);
}

// ---------------------------------------------------------------- Bastion: a wide armoured wedge, two turrets and a nose gun, four nozzles, grey with a red band
function shBastion(g, t) {
  const cy = 32, RD = 0xff4d6d, STEEL = 0x7f8c9a;
  const hull = [[84, 32], [70, 21], [50, 13], [22, 9], [10, 13], [6, 22], [6, 42], [10, 51], [22, 55], [50, 51], [70, 43]];
  shHalo(g, 45, 32, CYAN, 30, 0.02);
  shShade(g, hull, 0x14181e, 0x505a66, 42, cy, 5);
  shFill(g, [[80, 32], [68, 23], [54, 17], [54, 47], [68, 41]], 0x2a303a, 1);                                  // the armoured nose
  shFill(g, [[78, 32], [68, 25.5], [56, 20], [58, 32], [56, 44], [68, 38.5]], 0x3c4450, 0.9);
  shLine(g, 22, 12, 52, 16, 0xffffff, 0.12); shLine(g, 22, 52, 52, 48, 0xffffff, 0.12);
  const band = [[32, 9.6], [40, 11.4], [40, 52.6], [32, 54.4]];                                                     // the red band across the beam
  shFill(g, band, 0xb02a3a, 1); shLine(g, 32, 9.6, 32, 54.4, RD, 0.95, 1.4); shLine(g, 40, 11.4, 40, 52.6, RD, 0.95, 1.4);
  [[36, 14], [36, 20], [36, 44], [36, 50]].forEach(([x, y]) => { g.fillStyle(0xffd0d0, 0.55); g.fillCircle(x, y, 0.9); });
  if (t.plating) { // extra plates over the shoulders; tier 2 a second layer; tier 3 a bright seam
    const sh = [[56, 15.6], [30, 10.4], [28, 13.4], [54, 19.4]];
    shFill(g, sh, STEEL, 0.95); shFill(g, shMirror(sh, cy), STEEL, 0.95);
    if (t.plating >= 2) { const l2 = [[26, 10.2], [14, 13.4], [12, 17], [26, 13.6]]; shFill(g, l2, 0x667684, 1); shFill(g, shMirror(l2, cy), 0x667684, 1); shFill(g, [[84, 32], [76, 28.6], [76, 35.4]], STEEL, 1); }
    if (t.plating >= 3) { shLine(g, 12, 13, 52, 15.4, 0xffffff, 0.7, 1.2); shLine(g, 12, 51, 52, 48.6, 0xffffff, 0.7, 1.2); }
  }
  // two turrets and a nose cannon; the guns slot makes the barrels longer, then doubles them, then lights them
  [16, 48].forEach(y => {
    g.fillStyle(0x0a0e14, 1); g.fillCircle(56, y, 6.5); g.fillStyle(0x4a5460, 1); g.fillCircle(56, y, 5.4); g.fillStyle(0x6a7684, 1); g.fillCircle(55, y - 1, 2.4);
    shBarrel(g, 59, y, t.guns >= 1 ? 19 : 14, 3, AMBER);
    if (t.guns >= 2) { shBarrel(g, 59, y + (y < cy ? 3.6 : -3.6), 15, 1.6, AMBER); }
  });
  shBarrel(g, 78, 32, t.guns >= 1 ? 8 : 5, 3, AMBER);
  if (t.guns >= 3) { [16, 48].forEach(y => { shHalo(g, 78, y, AMBER, 5, 0.1); }); }
  shNeon(g, hull, CYAN, t.plating ? 2.2 : 1.8);
  shLine(g, 18, 32, 52, 32, 0x9fe9ff, 0.35);
  const ys = [17, 26, 38, 47];                                                                                      // four nozzles; each tier makes them bigger and hotter
  ys.forEach((y, i) => shNozzle(g, 9, y, 5 + Math.min(t.engine, 2), (i === 1 || i === 2) ? 6 + t.engine : 5 + t.engine * 0.6, RD));
  if (t.engine >= 1) shHalo(g, 5, 32, RD, 14, 0.06);
  shCockpit(g, 66, 32, 3.2, CYAN);
  g.fillStyle(CYAN, 0.9); g.fillRect(60, 31, 4, 2);
  shLight(g, 12, 10, AMBER, 1.5); shLight(g, 12, 54, AMBER, 1.5);
}

// ---------------------------------------------------------------- the table
const SHIP_LOOK = {
  wren: {
    name: 'Wren', role: 'STARTER SHIP', w: 56, h: 40, body: [12, 16, 8], flame: [AMBER, 0x9fe9ff], shield: 27, cockpit: [32, 20],
    nozzles: t => t.engine >= 2 ? [[-14, -5.5, 0.9], [-14, 5.5, 0.9]] : [[-14, 0, t.engine ? 1.3 : 1]],
    anchors: { armor: [22, 9], booster: [8, 20], rapid: [40, 10], hull: [34, 25] }, fx: [-8.67, 2], draw: shWren
  },
  kite: {
    name: 'Kite', role: 'FAST COURIER', w: 60, h: 36, body: [10, 20, 8], flame: [0x9fe9ff, 0xffffff], shield: 25, cockpit: [40, 18],
    nozzles: t => t.engine >= 2 ? [[-21, -3.5, 0.8], [-21, 3.5, 0.8], [-21, 0, 0.7]] : [[-21, -3.5, t.engine ? 0.85 : 0.7], [-21, 3.5, t.engine ? 0.85 : 0.7]],
    anchors: { armor: [28, 13.2], booster: [9, 14.5], rapid: [20, 6.5], hull: [38, 19] }, fx: [-13, 8], draw: shKite
  },
  ox: {
    name: 'Ox', role: 'CARGO HAULER', w: 78, h: 46, body: [17, 22, 6], flame: [AMBER, 0xffd37a], shield: 38, cockpit: [71, 14],
    nozzles: t => t.engine >= 1 ? [[-32, -6, 1.15], [-32, 6, 1.15]] : [[-32, 0, 1.6]],
    anchors: { armor: [47, 8], booster: [7, 23], rapid: [76, 23], hull: [42, 23] }, fx: [-20, 28], draw: shOx
  },
  talon: {
    name: 'Talon', role: 'FIGHTER', w: 60, h: 44, body: [13, 17, 9], flame: [0xffa040, 0xfff1a8], shield: 28, cockpit: [38, 22],
    nozzles: t => t.engine >= 2 ? [[-21, -4.5, 0.8], [-21, 4.5, 0.8], [-21, 0, 0.7]] : [[-21, -3, t.engine ? 1 : 0.8], [-21, 3, t.engine ? 1 : 0.8]],
    anchors: { armor: [37, 12.5], booster: [9, 19], rapid: [52, 9.6], hull: [30, 25] }, fx: [-13, 6], draw: shTalon
  },
  pathfinder: {
    name: 'Pathfinder', role: 'EXPLORER', w: 64, h: 48, body: [14, 18, 10], flame: [0x7fffd0, 0xffffff], shield: 32, cockpit: [44, 24],
    nozzles: t => t.engine >= 2 ? [[-23, -5, 0.8], [-23, 5, 0.8], [-23, 0, 0.7]] : [[-23, -4, t.engine ? 0.95 : 0.8], [-23, 4, t.engine ? 0.95 : 0.8]],
    anchors: { armor: [37, 12.4], booster: [9, 20], rapid: [54, 6], hull: [36, 30] }, fx: [-14, 10], draw: shPathfinder
  },
  bastion: {
    name: 'Bastion', role: 'HEAVY SHIP', w: 90, h: 64, body: [20, 25, 12], flame: [0xff4d6d, 0xffb0a0], shield: 46, cockpit: [66, 32],
    nozzles: t => [[-36, -15, 0.9 + t.engine * 0.1], [-36, -6, 1 + t.engine * 0.12], [-36, 6, 1 + t.engine * 0.12], [-36, 15, 0.9 + t.engine * 0.1]],
    anchors: { armor: [48, 16], booster: [9, 26], rapid: [66, 16], hull: [40, 38] }, fx: [-22, 21], draw: shBastion
  }
};
const SHIP_MODEL_IDS = Object.keys(SHIP_LOOK);

// draw a model at these tiers (a Graphics, the texture is made by the caller)
function shipDrawModel(g, model, tiers) {
  const L = SHIP_LOOK[model] || SHIP_LOOK.wren, t = tiers || {};
  L.draw(g, { plating: t.plating | 0, guns: t.guns | 0, engine: t.engine | 0 });
}
// a texture of a model under its own key, made once (a hangar card or a test sheet); returns the key
function shipPreviewTexture(scene, model, tiers) {
  const t = tiers || {}, key = 'shipview-' + model + '-' + [t.plating | 0, t.guns | 0, t.engine | 0].join('');
  if (scene.textures.exists(key)) return key;
  const L = SHIP_LOOK[model] || SHIP_LOOK.wren, g = scene.make.graphics({ x: 0, y: 0, add: false });
  shipDrawModel(g, model, t); g.generateTexture(key, L.w, L.h); g.destroy();
  return key;
}
