// ---------- The Campaign's own ship pictures: the cruiser, the fighter and the escort (card space-game-campaign-look) ----------
// Troy: "less arcade and more like Battlestar Galactica": a boxy, utilitarian hull in muted grey and bronze, a long spine, a flight pod down each side with a lit bay, a big engine block with a dull glow,
// panel lines and a few running lights; no neon outline, no bright tint. Nothing here knows the game: it draws into a Phaser Graphics (a texture, made once by campShipTexture) and says where its parts are
// (CAMP_ART), so the scene can light the bays and the tests can check the turret mounts lie on the hull. The Long Haul's own Bastion (src/shipmodels.js) is not touched.
// Units: one unit is one px of the screen at the size the ship is drawn at (CAMP.size in src/campaign.js); x runs along the nose, y to the right, the origin is the middle of the hull. The picture is drawn
// k times larger (the scene scales it down to the length in CAMP.size), so it is smooth, not blocky. Light comes from above: the hull is lighter along its middle, darker at the edges, the same on both sides.
const CAMP_ART = {
  fighter: { k: 4, len: 22, pad: 2, half: 8, glow: [[8, 0.13], [5.5, 0.15]] },        // the wing's fighters: a dart with swept wings (the picture k times the units; the hull len long and half wide each side of the middle, over the wings); glow: [radius in units, alpha] of the faint pale disc under a friendly ship, so the wing is found against dark space and the moon (set the alphas to 0 for none)
  escort: { k: 4, len: 28, pad: 3, half: 9.5, glow: [[10, 0.13], [7, 0.15]] },       // the escorts: a small boxy gunship with two nacelles
  cruiser: {
    k: 2,
    len: 98,                                        // the hull's length in units: the picture of it is len * k px, and the scene scales it to CAMP.size.carrier.len
    pad: 6,                                         // units of margin round the hull in the picture, for the engine's glow
    half: 26,                                       // the hull's half-width, over the pods
    core: [[-34, -11], [34, -11], [43, -10], [49, -6.5], [49, 6.5], [43, 10], [34, 11], [-34, 11]], // the long middle of the hull and its blunt head
    engine: [-49, -13, -33, 13],                    // the engine block at the stern: x1, y1, x2, y2
    pod: [-34, 13, 18, 26],                         // a flight pod (the starboard one; the port one is its mirror): x1, y1, x2, y2; the pods are the hangars
    tower: [-20, -6, -8, 6],                        // the bridge tower on the spine
    launch: [18, 19.5],                             // the mouth of a pod's launch tube, in the front face of the pod: x, y of the starboard one (CAMP.bay.mouth is a little in front of it)
    land: [-34, 19.5],                              // the landing bay in the aft face: x, y of the starboard one
    bay: [2.2, 4.2]                                 // how deep and how wide (half) a bay opening is
  }
};
// the picture's size in px: the hull and its margin
function campArtSize(kind) { const a = CAMP_ART[kind], k = a.k; return [Math.round((a.len + 2 * a.pad) * k), Math.round((2 * a.half + 2 * a.pad) * k)]; }
// where a point of the hull is in the carrier's frame (x along the nose, y to the right), for the scene: the bays lie in the pods' faces, one on each side
function campArtBays(kind) {
  const a = CAMP_ART[kind]; return { launch: [[a.launch[0], -a.launch[1]], [a.launch[0], a.launch[1]]], land: [[a.land[0], -a.land[1]], [a.land[0], a.land[1]]], half: a.bay };
}

const CAMP_HULL = { // the colours: grey steel and bronze, all muted (no colour is bright; the only light is the windows, the bays and the engines, and those are warm and small)
  steel: [0x464a50, 0x5a5e65, 0x6e727a, 0x82868d, 0xa4a8af], dark: 0x1f2226, edge: 0x15171a,
  bronze: [0x4f4234, 0x6a5a45, 0x80694a, 0xa68a58],
  window: 0xffe0a0, glass: 0xb4d6d8, bay: 0xffcf7a, bayDim: 0x5a3f1e, engine: 0xb8641c, hot: 0xe9a867, red: 0xa8443c, green: 0x4d8f60
};

// a pen that draws in units: the origin is the middle of the hull, k px to the unit
function campArtPen(g, ox, oy, k) {
  const X = x => ox + x * k, Y = y => oy + y * k, P = pts => pts.map(([x, y]) => [X(x), Y(y)]);
  const poly = (pts, color, a = 1) => { const p = P(pts); g.fillStyle(color, a); g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); g.fillPath(); };
  const outline = (pts, color, w = 1, a = 1) => { const p = P(pts); g.lineStyle(w * k, color, a); g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); g.strokePath(); };
  const rect = (x1, y1, x2, y2, color, a = 1) => { g.fillStyle(color, a); g.fillRect(X(x1), Y(y1), (x2 - x1) * k, (y2 - y1) * k); };
  const line = (x1, y1, x2, y2, color, a = 1, w = 0.6) => { g.lineStyle(w * k, color, a); g.lineBetween(X(x1), Y(y1), X(x2), Y(y2)); };
  const dot = (x, y, r, color, a = 1) => { g.fillStyle(color, a); g.fillCircle(X(x), Y(y), r * k); };
  return { poly, outline, rect, line, dot };
}

// a box of the hull, shaded: darker at the edges and lighter along the middle (a plate with a raised centre), with its seam lines; the box is x1, y1, x2, y2
function campArtPlate(p, x1, y1, x2, y2, tone, cham = 1.2) {
  const bx = [[x1 + cham, y1], [x2 - cham, y1], [x2, y1 + cham], [x2, y2 - cham], [x2 - cham, y2], [x1 + cham, y2], [x1, y2 - cham], [x1, y1 + cham]];
  p.poly(bx, tone[0]); p.rect(x1 + 0.8, y1 + 0.8, x2 - 0.8, y2 - 0.8, tone[1]);
  const mid = (y1 + y2) / 2, h = (y2 - y1) / 4; p.rect(x1 + 1.4, mid - h, x2 - 1.4, mid + h, tone[2], 0.9);
  p.outline(bx, CAMP_HULL.edge, 0.7, 0.9);
}

// the cruiser: texture size campArtSize('cruiser'), the hull's middle at the middle of the picture
function campCruiserDraw(g) {
  const A = CAMP_ART.cruiser, k = A.k, [W, H] = campArtSize('cruiser'), p = campArtPen(g, W / 2, H / 2, k), C = CAMP_HULL, S = C.steel, B = C.bronze;
  const both = fn => { fn(1); fn(-1); }, my = (v, s) => v * s; // the same on both sides of the spine
  const [px1, py1, px2, py2] = A.pod, [ex1, ey1, ex2, ey2] = A.engine, [tx1, ty1, tx2, ty2] = A.tower;
  // the struts that hold each pod to the spine, under everything
  both(s => { [-26, -4, 12].forEach(x => { p.rect(x - 2, Math.min(my(11, s), my(py1, s)) - 0.4, x + 2, Math.max(my(11, s), my(py1, s)) + 0.4, C.dark); }); });
  // the flight pods: bronze-grey boxes with a bronze deck stripe along the outer edge, panel lines across, and a bay opening in the front and the back of each
  both(s => {
    const y1 = Math.min(my(py1, s), my(py2, s)), y2 = Math.max(my(py1, s), my(py2, s));
    campArtPlate(p, px1, y1, px2, y2, [B[0], B[1], B[2]]);
    p.rect(px1 + 2, my(py2, s) - s * 2.6, px2 - 2, my(py2, s) - s * 1.4, B[3], 0.55); // the deck stripe on the outer edge
    for (let x = px1 + 6; x < px2 - 3; x += 7.4) p.line(x, y1 + 1.4, x, y2 - 1.4, C.edge, 0.55, 0.5);
    for (let x = px1 + 5; x < px2 - 4; x += 3.7) p.rect(x, my(py2, s) - s * 5.2, x + 1.7, my(py2, s) - s * 4.2, C.dark, 0.75); // a row of ports along the outer edge
    p.line(px1 + 2, my(py1, s) + s * 3.2, px2 - 2, my(py1, s) + s * 3.2, C.edge, 0.5, 0.5);
    [[A.launch, 1], [A.land, -1]].forEach(([at, dir]) => { // a bay opening: a dark slot in the face with a dim warm light in it (the scene lights it on launch and recall)
      const x = at[0], yc = my(at[1], s), d = A.bay[0], hw = A.bay[1];
      p.rect(x - (dir > 0 ? d : 0) - 0.6, yc - hw - 0.6, x + (dir > 0 ? 0 : d) + 0.6, yc + hw + 0.6, C.edge);
      p.rect(x - (dir > 0 ? d : 0), yc - hw, x + (dir > 0 ? 0 : d), yc + hw, C.bayDim);
      p.rect(x - (dir > 0 ? d : 0), yc - hw * 0.45, x + (dir > 0 ? 0 : d), yc + hw * 0.45, C.bay, 0.45);
    });
  });
  // the engine block at the stern: a dark box with a lighter top, vents, and four nozzles with a dull glow
  campArtPlate(p, ex1, ey1, ex2, ey2, [S[0], S[1], S[2]], 1.6);
  for (let y = ey1 + 3; y < ey2 - 2; y += 3.6) p.line(ex2 - 6.5, y, ex2 - 1.5, y, C.edge, 0.5, 0.45);
  [-9, -3, 3, 9].forEach(y => {
    p.dot(ex1 - 0.5, y, 5.4, C.engine, 0.05); p.dot(ex1 - 0.5, y, 3.8, C.engine, 0.08);
    p.rect(ex1 - 0.2, y - 2.3, ex1 + 3.2, y + 2.3, C.edge); p.rect(ex1 + 0.3, y - 1.7, ex1 + 3.2, y + 1.7, B[1]);
    p.rect(ex1 - 0.1, y - 1.5, ex1 + 1.2, y + 1.5, C.engine, 0.9); p.rect(ex1 - 0.1, y - 0.7, ex1 + 0.5, y + 0.7, C.hot, 0.75);
  });
  // the long middle: panel plates end to end, a bronze edge, and the spine along the centre line
  p.poly(A.core, S[1]); p.outline(A.core, C.edge, 0.8, 0.95);
  const plates = [[-34, -22], [-22, -10], [-10, 3], [3, 16], [16, 28], [28, 36]];
  plates.forEach(([a, b], i) => { p.rect(a + 0.5, -10, b - 0.5, 10, i % 2 ? S[1] : S[2], 0.9); p.line(a, -10.5, a, 10.5, C.edge, 0.55, 0.5); });
  p.poly([[34, -10.4], [43, -9.4], [48, -6.2], [48, 6.2], [43, 9.4], [34, 10.4]], S[2], 0.95); p.line(41, -9.6, 41, 9.6, C.edge, 0.5, 0.5); p.line(45.5, -7.6, 45.5, 7.6, C.edge, 0.45, 0.5);
  both(s => { p.rect(-33, my(10.2, s) - 0.5, 34, my(10.2, s) + 0.5, B[2], 0.85); }); // a bronze edge strip on each side of the middle
  p.rect(-30, -2.4, 42, 2.4, S[0], 0.95); p.line(-30, -2.4, 42, -2.4, S[3], 0.5, 0.5); p.line(-30, 2.4, 42, 2.4, C.edge, 0.7, 0.5); // the spine
  for (let x = -26; x < 40; x += 6.5) p.rect(x, -1.2, x + 2.4, 1.2, S[3], 0.55);
  // the bridge tower: a raised, stepped block aft of the middle. It throws a shadow on the hull; its lower deck is steel, the upper deck is smaller with a bronze roof; windows are lit along the front of each, and a mast with a cross-bar stands behind it
  p.rect(tx1 + 1.2, ty1 + 1.6, tx2 + 1.8, ty2 + 1.8, C.edge, 0.4);
  campArtPlate(p, tx1, ty1, tx2, ty2, [S[0], S[1], S[2]], 1.4);
  campArtPlate(p, tx1 + 2.2, ty1 + 2, tx2 - 2.6, ty2 - 2, [B[0], B[1], B[2]], 0.9);
  for (let y = ty1 + 1.4; y < ty2 - 1; y += 1.9) p.rect(tx2 - 1.7, y, tx2 - 0.5, y + 0.9, C.window, 0.9);
  p.rect(tx2 - 3.6, ty1 + 2.8, tx2 - 2.8, ty2 - 2.8, C.window, 0.8);
  p.line(tx1 + 3, 0, tx1 - 3, 0, S[3], 0.9, 0.5); p.line(tx1 - 1.5, -2.2, tx1 - 1.5, 2.2, S[3], 0.9, 0.5);
  // the pods' ends against the spine, and the greebles: a couple of dishes, an antenna array
  p.dot(24, 0, 2.2, C.edge); p.dot(24, 0, 1.6, S[3], 0.95); p.dot(24, 0, 0.6, S[0]);
  p.rect(10, -7, 18, -5.2, S[3], 0.6); p.rect(10, 5.2, 18, 7, S[3], 0.6); p.rect(-6, -8, 0, -6.6, B[3], 0.6); p.rect(-6, 6.6, 0, 8, B[3], 0.6);
  p.rect(1, -9.4, 12, -8.6, S[3], 0.75); p.rect(20, 7.6, 27, 8.6, B[3], 0.7); p.rect(34.5, -10, 36.5, 10, B[1], 0.9); // a sensor boom on the port side only, a bronze plate across the head: the two sides are not copies
  // running lights: one at each pod's front corner (port red, starboard green), a white one on the tower
  p.dot(px2 - 1, -py2 + 1.4, 0.9, C.red, 0.9); p.dot(px2 - 1, py2 - 1.4, 0.9, C.green, 0.9); p.dot((tx1 + tx2) / 2, 0, 0.7, 0xffffff, 0.8);
}

// how lit the bays are, 0 to 1, for the scene to draw over the picture: the launch tubes (the front of the pods) while ships are leaving and for CAMP_BAY.fade ms after the last, the landing bays (the back of the pods) while
// any ship of the wing is coming home and for as long after one has landed. at: { launch, land }, the battle clock (C.t) of the last launch and the last landing. The picture itself has the bays dimly lit all the time.
const CAMP_BAY = { fade: 700, slot: 0.9, halo: [[6, 0.07], [4, 0.15]], color: 0xffcf7a, core: 0xfff2d0 }; // fade: ms a bay takes to go dark; slot: how solid the lit slot is; halo: [radius px, alpha] of its glow (added); the slot's colour and the hot middle of it
function campBayLight(C, at) {
  const fade = dt => dt <= 0 ? 1 : Math.max(0, 1 - dt / CAMP_BAY.fade);
  if (!C.carrier || C.carrier.hp <= 0) return { launch: 0, land: 0 };
  const coming = C.ships.some(u => u.team === 'earth' && u.hp > 0 && u.order && u.order.type === 'recall');
  return { launch: C.launchQ.length ? 1 : fade(C.t - at.launch), land: coming ? 1 : fade(C.t - at.land) };
}

// the fighter (card space-game-fighter-dogfights; Troy: look like the Vipers of Battlestar Galactica, but ours): a long needle of a nose, a narrow blade of a body with a pale canopy behind the nose, two
// short fins forward and two long swept wings reaching back to the tail, a gun in front of each wing, and three engines in a row at the stern (one in the middle, one out on each side). An original drawing:
// the proportions and the three engines are what say "Viper" at 22 px; nothing of the show's ship is copied. The pale canopy and the two pale wing-tip lights are what say "ours" in a crowd of red aliens.
function campFighterDraw(g) {
  const A = CAMP_ART.fighter, k = A.k, [W, H] = campArtSize('fighter'), p = campArtPen(g, W / 2, H / 2, k), C = CAMP_HULL, S = C.steel, B = C.bronze;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, C.glass, a)); // the faint pale disc under it
  const wing = [[1.2, -2.1], [-5.6, -7.8], [-9.6, -7.8], [-8.8, -2.9]], canard = [[5.2, -1.1], [3.2, -3.9], [1.9, -3.9], [2.6, -1.5]], body = [[11, 0], [6.2, -0.8], [2, -1.5], [-3, -2.4], [-9.6, -3], [-9.6, 3], [-3, 2.4], [2, 1.5], [6.2, 0.8]];
  [1, -1].forEach(s => {
    const w = wing.map(([x, y]) => [x, y * s]), c = canard.map(([x, y]) => [x, y * s]);
    p.poly(w, S[2]); p.poly([[0.6, -2.3 * s], [-5.4, -7.0 * s], [-8.9, -7.0 * s], [-8.2, -3.1 * s]], S[3]); p.outline(w, C.edge, 0.7, 0.95);
    p.poly(c, S[1]); p.outline(c, C.edge, 0.6, 0.9);
    p.rect(-9.5, s > 0 ? 6.2 : -7.8, -6.4, s > 0 ? 7.8 : -6.2, B[2], 0.9); // the bronze tip of the wing
    p.rect(1.4, 4.3 * s - 0.35, 5.4, 4.3 * s + 0.35, C.dark); // a gun in front of the wing
    p.dot(-7.6, 7.3 * s, 2.3, C.glass, 0.1); p.dot(-7.6, 7.3 * s, 0.7, C.glass, 0.95); // a pale light on each wing tip: in a crowd it is what finds the wing
  });
  p.poly(body, S[3]); p.poly([[10.2, 0], [6.4, -0.45], [-8.4, -1.1], [-8.4, 1.1], [6.4, 0.45]], S[4], 0.8); p.outline(body, C.edge, 0.7, 0.95);
  p.line(-3.4, -2.4, -3.4, 2.4, C.edge, 0.55, 0.45);
  p.poly([[4.9, 0], [2.7, -0.95], [0.3, -0.95], [0.3, 0.95], [2.7, 0.95]], C.edge); p.poly([[4.3, 0], [2.6, -0.6], [0.8, -0.6], [0.8, 0.6], [2.6, 0.6]], C.glass); p.dot(1.6, -0.25, 0.28, 0xffffff, 0.8); // the canopy: a long drop of glass
  p.rect(-10.6, -2.7, -9.4, 2.7, C.dark);
  [[0, 1.05], [-4.7, 0.85], [4.7, 0.85]].forEach(([y, h]) => { p.dot(-10.8, y, 1.9, C.engine, 0.07); p.rect(-11, y - h, -9.7, y + h, C.engine, 0.95); p.rect(-11, y - h * 0.4, -10.4, y + h * 0.4, C.hot, 0.8); }); // the three engines
}
// the escort: a small boxy gunship, a nacelle each side with a bronze stripe, a short nose, a lit window, the engines at the back
function campEscortDraw(g) {
  const A = CAMP_ART.escort, k = A.k, [W, H] = campArtSize('escort'), p = campArtPen(g, W / 2, H / 2, k), C = CAMP_HULL, S = C.steel, B = C.bronze;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, C.glass, a)); // the faint pale disc under it
  [1, -1].forEach(s => { // the nacelles: boxes along the sides, joined by a strut
    const y1 = s > 0 ? 5.6 : -9.4, y2 = s > 0 ? 9.4 : -5.6, bx = [[-12, y1 + 0.8], [-11.2, y1], [3.2, y1], [4, y1 + 0.8], [4, y2 - 0.8], [3.2, y2], [-11.2, y2], [-12, y2 - 0.8]];
    p.rect(-6, s > 0 ? 4 : -6, -2, s > 0 ? 6 : -4, C.dark); p.poly(bx, B[0]); p.rect(-11, y1 + 0.8, 3, y2 - 0.8, B[1]); p.rect(-10, (y1 + y2) / 2 - 1, 2.4, (y1 + y2) / 2 + 1, B[2], 0.9); p.outline(bx, C.edge, 0.7, 0.95);
    p.rect(3.2, (y1 + y2) / 2 - 1, 4, (y1 + y2) / 2 + 1, C.bay, 0.55); // a lit slot in the front of each nacelle
  });
  const hull = [[-13, -4.2], [8, -4.2], [14, -2.2], [14, 2.2], [8, 4.2], [-13, 4.2]];
  p.poly(hull, S[3]); p.rect(-12, -2.4, 9, 2.4, S[4], 0.9); p.poly([[8, -4], [13.4, -2.1], [13.4, 2.1], [8, 4]], S[4], 0.95); p.outline(hull, C.edge, 0.75, 0.95);
  [-1, 1].forEach(s => { p.dot(4, 8.6 * s, 2.2, C.glass, 0.1); p.dot(4, 8.6 * s, 0.7, C.glass, 0.95); }); // a pale light at the front of each nacelle
  p.line(-4, -4.2, -4, 4.2, C.edge, 0.55, 0.45); p.line(3, -4.2, 3, 4.2, C.edge, 0.55, 0.45);
  p.rect(-13.8, -3.6, -12, 3.6, C.dark); [-1.9, 1.9].forEach(y => { p.dot(-14, y, 2.2, C.engine, 0.07); p.rect(-14.5, y - 1, -13.2, y + 1, C.engine, 0.95); p.rect(-14.5, y - 0.4, -13.8, y + 0.4, C.hot, 0.8); });
  for (let y = -1.6; y <= 1.7; y += 1.6) p.rect(8.2, y - 0.4, 9.8, y + 0.4, C.window, 0.85); // the lit window
  p.dot(-1, 0, 1.1, C.edge); p.dot(-1, 0, 0.8, S[3]); // a turret on the back
}
// what the scene needs of a picture: its width (the hull's length in the picture's px), its height over the wings or pods, and the scale that makes the hull as long as CAMP.size says (kind: a row of CAMP.size)
function campArtLook(kind, art) { const a = CAMP_ART[art], w = a.len * a.k; return { art, w, h: 2 * a.half * a.k, scale: CAMP.size[kind].len / w }; }

// the texture of a ship of the Campaign's own, made once; returns its key
function campShipTexture(scene, kind) {
  const key = 'camp-' + kind;
  if (scene.textures.exists(key)) return key;
  const [W, H] = campArtSize(kind), g = scene.make.graphics({ x: 0, y: 0, add: false });
  const draw = ({ cruiser: campCruiserDraw, fighter: campFighterDraw, escort: campEscortDraw })[kind] || (typeof campPirateArt === 'function' ? campPirateArt(kind) : null); // the pirates' and the neutrals' pictures: src/camppirateart.js
  draw(g); g.generateTexture(key, W, H); g.destroy();
  return key;
}
