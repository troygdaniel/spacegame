// ---------- The pictures of the pirates and the neutral ships (card space-game-l1-pirates-traffic) ----------
// The same way as the cruiser, the fighter and the escort (src/campcruiser.js: campArtPen draws in units, the picture is k times larger, CAMP.size says how long the hull is drawn), but not the same look:
// the cruiser's clean grey and bronze is Earth's; a PIRATE is scavenged: rust-brown plates bolted on, a yellow ochre stripe and nothing straight for long; a PATROL is a clean pale hull with a teal stripe and a
// light bar (white and cyan); a MINER is an industrial hull with a cargo pod, a boom and orange hazard marks. None of them is red or green (the aliens' and yours), so the eye tells them apart in a crowd.
//   skiff    a thin dart with forward-swept stubs and one big engine     cutter   a wedge with welded plates and a pair of guns     brute    a blocky heavy gun with three barrels
//   patrol   a sleek police ship with two nacelles                       miner    a boxy hull, a pod and a mining boom
// campPirateArt(kind) -> the drawing function of that kind (or null); src/campcruiser.js campShipTexture asks it for a kind it does not know. CAMP_ART has a row for each (the picture's size and the glow).
Object.assign(CAMP_ART, {
  skiff:  { k: 4, len: 22, pad: 3, half: 7,  glow: [] },
  cutter: { k: 4, len: 26, pad: 2.5, half: 9.5, glow: [] },
  brute:  { k: 4, len: 38, pad: 3, half: 12, glow: [] },
  patrol: { k: 4, len: 30, pad: 3, half: 10, glow: [] },
  miner:  { k: 4, len: 32, pad: 3, half: 10, glow: [] }
});
const CAMP_PIRATE = { // the colours: rust and ochre for the pirates, pale steel and teal for the patrols, blue-grey and orange for the miners
  rust: [0x4a3828, 0x6c5236, 0x8e6c44, 0xb08a58, 0xd2ac70], ochre: 0xe8d24a, ochreDim: 0x9c8a2e, dark: 0x1a1612, edge: 0x100d0a, ember: 0xe28a3a, hot: 0xffd9a0,
  pale: [0x6a7480, 0x8a95a2, 0xaab4bf, 0xc9d2db, 0xe4eaf0], teal: 0x5fd8c0, tealDim: 0x2f8a7a, lightA: 0xffffff, lightB: 0x7fe9ff,
  ind: [0x4c5a6a, 0x66788c, 0x8497ab, 0xa3b4c6], orange: 0xe8873a, orangeDim: 0x9a5a28, glass: 0xb4d6d8
};

function campSkiffDraw(g) { // a thin dart: needle nose, stubs swept forward, one big engine, an ochre stripe
  const A = CAMP_ART.skiff, k = A.k, [W, H] = campArtSize('skiff'), p = campArtPen(g, W / 2, H / 2, k), P = CAMP_PIRATE, R = P.rust;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, P.ochre, a));
  [1, -1].forEach(s => {
    const w = [[2, 1.4 * s], [6, 5.6 * s], [3.6, 6.4 * s], [-4, 3.2 * s], [-5, 1.6 * s]]; // a stub that sweeps forward, like a hook
    p.poly(w, R[1]); p.poly([[1.6, 1.8 * s], [5.2, 5 * s], [3.8, 5.6 * s], [-3, 3 * s]], R[2], 0.9); p.outline(w, P.edge, 0.7, 0.95);
    p.dot(5, 6 * s, 0.6, P.ochre, 0.95); // a lamp on the tip
  });
  const body = [[10, 0], [4, -1.5], [-6, -2.2], [-8, -1.4], [-8, 1.4], [-6, 2.2], [4, 1.5]];
  p.poly(body, R[2]); p.poly([[9, 0], [3.6, -0.8], [-6, -1.2], [-6, 1.2], [3.6, 0.8]], R[3], 0.9); p.outline(body, P.edge, 0.7, 0.95);
  p.rect(-3, -2.1, -0.4, 2.1, P.ochre, 0.9); p.rect(-3, -0.5, -0.4, 0.5, P.ochreDim, 0.9); // the stripe
  p.rect(-9.4, -1.9, -7.8, 1.9, P.dark); p.dot(-9.6, 0, 2.6, P.ember, 0.08); p.rect(-10.4, -1.2, -9, 1.2, P.ember, 0.95); p.rect(-10.4, -0.5, -9.6, 0.5, P.hot, 0.8); // one big engine
  p.dot(3.4, 0, 1.0, P.edge); p.dot(3.4, 0, 0.7, P.glass); // a small canopy
}
function campCutterDraw(g) { // a wedge with a welded plate on one side and a pair of guns
  const A = CAMP_ART.cutter, k = A.k, [W, H] = campArtSize('cutter'), p = campArtPen(g, W / 2, H / 2, k), P = CAMP_PIRATE, R = P.rust;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, P.ochre, a));
  [-1, 1].forEach(s => p.rect(7, 2.6 * s - 0.4, 14, 2.6 * s + 0.4, P.dark)); // the guns
  const hull = [[10, 0], [6, -3.4], [-4, -5.2], [-11, -4.2], [-11, 4.2], [-4, 5.2], [6, 3.4]];
  p.poly(hull, R[2]); p.poly([[9, 0], [5.4, -2.4], [-4, -3.8], [-10, -3.2], [-10, 3.2], [-4, 3.8], [5.4, 2.4]], R[3], 0.9); p.outline(hull, P.edge, 0.8, 0.95);
  const plate = [[2, 3.6], [-3, 7.2], [-9, 7.2], [-10, 4.4], [-4, 4.2]]; // a plate welded on the starboard side: the hull is not the same both sides
  p.poly(plate, R[1]); p.poly([[1.4, 4.2], [-3, 6.6], [-8.4, 6.6], [-9, 4.8]], R[2], 0.9); p.outline(plate, P.edge, 0.7, 0.95); p.dot(-3, 5.6, 0.45, P.edge); p.dot(-6, 5.8, 0.45, P.edge); // bolts
  p.poly([[5, -3.2], [2, -3.4], [-1, -5], [2, -7], [6, -5.4]], R[1], 0.95); p.outline([[5, -3.2], [2, -3.4], [-1, -5], [2, -7], [6, -5.4]], P.edge, 0.7, 0.95); // a salvaged wing on the other
  [3, -1].forEach(x => p.poly([[x + 2, -3], [x, -3], [x - 2, 0], [x, 3], [x + 2, 3], [x, 0]], P.ochre, 0.9)); // chevrons
  p.rect(-12.4, -3.4, -10.6, 3.4, P.dark); [-1.8, 1.8].forEach(y => { p.dot(-12.6, y, 2.1, P.ember, 0.08); p.rect(-13.4, y - 0.9, -12, y + 0.9, P.ember, 0.95); p.rect(-13.4, y - 0.35, -12.6, y + 0.35, P.hot, 0.8); });
  p.dot(5, 0, 1.5, P.edge); p.dot(5, 0, 1.1, P.glass);
}
function campBruteDraw(g) { // a blocky heavy gunship: three barrels at the nose, bolted plates, hazard stripes, an engine bank
  const A = CAMP_ART.brute, k = A.k, [W, H] = campArtSize('brute'), p = campArtPen(g, W / 2, H / 2, k), P = CAMP_PIRATE, R = P.rust;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, P.ochre, a));
  [-1, 0, 1].forEach(s => { p.rect(8, s * 3.4 - 0.7, 18.5, s * 3.4 + 0.7, P.dark); p.rect(16.5, s * 3.4 - 1.1, 18.5, s * 3.4 + 1.1, R[1]); }); // three barrels
  const hull = [[8, -7.4], [-14, -9.4], [-17, -7], [-17, 7], [-14, 9.4], [8, 7.4]];
  p.poly(hull, R[1]); p.rect(-13, -7.6, 7, 7.6, R[2]); p.rect(-11, -5.2, 6, 5.2, R[3], 0.9); p.outline(hull, P.edge, 0.9, 0.95);
  [-1, 1].forEach(s => { // a bolted armour plate each side, with a hazard stripe along the edge
    p.rect(-12, s > 0 ? 7.6 : -11.2, 4, s > 0 ? 11.2 : -7.6, R[1]); p.rect(-11, s > 0 ? 8.2 : -10.6, 3, s > 0 ? 10.6 : -8.2, R[2], 0.9);
    for (let x = -11; x < 3; x += 3) p.poly([[x, s > 0 ? 10.6 : -10.6], [x + 1.5, s > 0 ? 10.6 : -10.6], [x + 2.6, s > 0 ? 8.2 : -8.2], [x + 1.1, s > 0 ? 8.2 : -8.2]], P.ochre, 0.85);
    p.outline([[-12, s > 0 ? 7.6 : -11.2], [4, s > 0 ? 7.6 : -11.2], [4, s > 0 ? 11.2 : -7.6], [-12, s > 0 ? 11.2 : -7.6]], P.edge, 0.7, 0.95);
    [-9, -2].forEach(x => p.dot(x, s * 9.4, 0.5, P.edge));
  });
  p.line(-6, -7.6, -6, 7.6, P.edge, 0.55, 0.45); p.line(0, -7.6, 0, 7.6, P.edge, 0.55, 0.45);
  p.rect(-19, -7.2, -17, 7.2, P.dark); [-4.8, 0, 4.8].forEach(y => { p.dot(-19.2, y, 2.6, P.ember, 0.08); p.rect(-20.2, y - 1.3, -18.6, y + 1.3, P.ember, 0.95); p.rect(-20.2, y - 0.5, -19.4, y + 0.5, P.hot, 0.8); });
  p.dot(2, 0, 2, P.edge); p.dot(2, 0, 1.5, P.glass); // a bridge window
}
function campPatrolDraw(g) { // a clean police ship: pale hull, a teal stripe, a light bar and two nacelles
  const A = CAMP_ART.patrol, k = A.k, [W, H] = campArtSize('patrol'), p = campArtPen(g, W / 2, H / 2, k), P = CAMP_PIRATE, S = P.pale;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, P.teal, a));
  [1, -1].forEach(s => { const y1 = s > 0 ? 4.6 : -8.6, y2 = s > 0 ? 8.6 : -4.6, bx = [[-10, y1 + 0.8], [-9.2, y1], [5, y1], [6, y1 + 1.2], [6, y2 - 1.2], [5, y2], [-9.2, y2], [-10, y2 - 0.8]];
    p.poly(bx, S[1]); p.rect(-9, y1 + 0.8, 5, y2 - 0.8, S[2]); p.rect(-6, (y1 + y2) / 2 - 0.5, 4, (y1 + y2) / 2 + 0.5, P.teal, 0.9); p.outline(bx, P.edge, 0.7, 0.95); p.rect(-11.4, (y1 + y2) / 2 - 1.1, -10, (y1 + y2) / 2 + 1.1, P.dark); p.rect(-12.2, (y1 + y2) / 2 - 0.8, -11, (y1 + y2) / 2 + 0.8, P.teal, 0.95); });
  const hull = [[14, 0], [8, -3.4], [-9, -4.4], [-11, -3.4], [-11, 3.4], [-9, 4.4], [8, 3.4]];
  p.poly(hull, S[2]); p.poly([[13, 0], [7.6, -2.4], [-9, -3.2], [-10, -2.6], [-10, 2.6], [-9, 3.2], [7.6, 2.4]], S[3], 0.95); p.outline(hull, P.edge, 0.8, 0.95);
  p.rect(-8, -4.1, 7, -3.1, P.teal); p.rect(-8, 3.1, 7, 4.1, P.teal); p.line(-2, -4.4, -2, 4.4, P.edge, 0.55, 0.45);
  p.dot(4, 0, 1.6, P.edge); p.dot(4, 0, 1.2, P.glass); p.rect(-4.6, -1.4, -3.2, -0.2, P.lightA); p.rect(-4.6, 0.2, -3.2, 1.4, P.lightB); // the cockpit and the light bar (white and cyan: never red, red is the aliens')
  p.dot(-3.9, -0.8, 1.7, P.lightA, 0.12); p.dot(-3.9, 0.8, 1.7, P.lightB, 0.12);
}
function campMinerDraw(g) { // an industrial hauler: a boxy hull, a cargo pod, a mining boom with a lamp, orange hazard marks
  const A = CAMP_ART.miner, k = A.k, [W, H] = campArtSize('miner'), p = campArtPen(g, W / 2, H / 2, k), P = CAMP_PIRATE, I = P.ind;
  A.glow.forEach(([r, a]) => p.dot(0, 0, r, P.glass, a));
  p.rect(5, -0.7, 15, 0.7, I[1]); p.rect(14, -1.6, 15.6, 1.6, P.dark); p.dot(15.8, 0, 1.2, P.orange, 0.95); p.dot(15.8, 0, 3, P.orange, 0.1); // the boom and its lamp
  const pod = [[-2, 4.2], [-14, 4.2], [-14, 9.4], [-2, 9.4]]; p.poly(pod, I[0]); p.rect(-13, 5, -3, 8.6, I[1]); for (let x = -12; x < -3; x += 3) p.line(x, 4.4, x, 9.2, P.edge, 0.5, 0.4); p.outline(pod, P.edge, 0.8, 0.95); // the cargo pod
  const hull = [[8, -3.4], [-14, -4.4], [-14, 4.4], [8, 3.4]];
  p.poly(hull, I[1]); p.rect(-12, -3, 7, 3, I[2], 0.9); p.outline(hull, P.edge, 0.8, 0.95);
  p.poly([[8, -3.4], [4, -3.4], [3, -1], [3, 1], [4, 3.4], [8, 3.4], [10, 0]], I[3], 0.9); p.dot(6, 0, 1.4, P.edge); p.dot(6, 0, 1.0, P.glass);
  for (let x = -13; x < -3; x += 3) p.poly([[x, -4.4], [x + 1.5, -4.4], [x + 2.4, -3], [x + 0.9, -3]], P.orange, 0.85); // hazard marks
  p.rect(-15.4, -3.8, -13.8, 3.8, P.dark); [-1.8, 1.8].forEach(y => { p.dot(-15.6, y, 2, P.glass, 0.08); p.rect(-16.4, y - 0.9, -15, y + 0.9, P.glass, 0.9); });
}
function campPirateArt(kind) { return { skiff: campSkiffDraw, cutter: campCutterDraw, brute: campBruteDraw, patrol: campPatrolDraw, miner: campMinerDraw }[kind] || null; }
