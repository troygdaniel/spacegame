// ---------- Station art: Halcyon Station and Kestrel Outpost ----------
// Drawn in code with canvas 2D gradients (still no image files, no libraries). Two entry points:
//   stationArt(scene)  Boot.create: draws the textures 'station', 'station-ring2', 'station-hub', 'station-shade',
//                      'station-beam', 'station-lane', 'station-chev', 'outpost' and the glow dots 'glow-c/a/r/g/w'
//   stationFx(scene)   Space.create, once this.station exists: the animated parts (counter-rotating ring and hub, blinking
//                      beacons, the docking lane, a sweeping beam, a fixed shadow side) and Kestrel Outpost
// Nothing here changes how docking works: the dock check in space.js still uses the station's centre and radius.

const SA_TAU = Math.PI * 2, SA_D2R = Math.PI / 180;
const SA_OUTPOST = { x: 2000, y: 5800 }; // clear of the belt, the wrecks, the planet and the dock lane

function saRng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

function saCanvas(scene, key, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

function saGlow(ctx, x, y, r, rgb, a) { // soft additive blob
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, SA_TAU); ctx.fill();
}

function saAnnulus(ctx, c, r0, r1) { ctx.beginPath(); ctx.arc(c, c, r1, 0, SA_TAU); ctx.arc(c, c, r0, 0, SA_TAU, true); ctx.closePath(); }

// ---- hub: a lit core, a ring of ports, a rotor. Drawn into 'station' and again, alone, into 'station-hub' (which spins) ----
function saHub(ctx, cx, cy) {
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
  g.addColorStop(0, '#1d6a9a'); g.addColorStop(0.3, '#0f3a5c'); g.addColorStop(0.8, '#081d33'); g.addColorStop(1, '#04111f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, SA_TAU); ctx.fill();
  ctx.strokeStyle = '#2f6f9c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 47, 0, SA_TAU); ctx.stroke();
  ctx.save(); ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 8; ctx.strokeStyle = 'rgba(56,225,255,0.95)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 50, 0, SA_TAU); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 12; i++) { // ports around the rim, warm and cool
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(i / 12 * SA_TAU);
    ctx.fillStyle = i % 2 ? '#ffd38a' : '#bff4ff'; ctx.fillRect(40, -2, 4, 4);
    ctx.restore();
  }
  ctx.save(); ctx.strokeStyle = 'rgba(255,180,84,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([7, 4]);
  ctx.beginPath(); ctx.arc(cx, cy, 31, 0, SA_TAU); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 4; i++) { // rotor blades
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(i / 4 * SA_TAU);
    ctx.fillStyle = 'rgba(56,225,255,0.30)'; ctx.strokeStyle = 'rgba(160,240,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(18, -5); ctx.lineTo(27, 0); ctx.lineTo(18, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  saGlow(ctx, cx, cy, 16, '56,225,255', 0.9);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, SA_TAU); ctx.fill();
}

// ---- one spoke, drawn along +x then rotated: a truss with cross braces, edge lights and a lit centre strip ----
function saSpoke(ctx, c, ang) {
  ctx.save(); ctx.translate(c, c); ctx.rotate(ang);
  const x0 = 44, x1 = 182, hw = 7;
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, '#0a1a2c'); g.addColorStop(0.3, '#255a82'); g.addColorStop(0.5, '#33769f'); g.addColorStop(0.7, '#1b4568'); g.addColorStop(1, '#07172a');
  ctx.fillStyle = g; ctx.fillRect(x0, -hw, x1 - x0, hw * 2);
  ctx.strokeStyle = 'rgba(120,200,235,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = x0; x < x1 - 14; x += 14) { ctx.moveTo(x, -hw); ctx.lineTo(x + 14, hw); ctx.moveTo(x, hw); ctx.lineTo(x + 14, -hw); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(56,225,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(x0, -hw); ctx.lineTo(x1, -hw); ctx.moveTo(x0, hw); ctx.lineTo(x1, hw); ctx.stroke();
  ctx.fillStyle = 'rgba(215,247,255,0.85)'; for (let x = x0 + 10; x < x1 - 6; x += 12) ctx.fillRect(x, -1, 4, 2);
  ctx.restore();
}

// ---- the outer ring: banded steel, 32 plates, two rows of windows, two glowing rims ----
function saRing(ctx, c, rng) {
  const R0 = 176, R1 = 202;
  const g = ctx.createRadialGradient(c, c, R0, c, c, R1);
  g.addColorStop(0, '#0d2238'); g.addColorStop(0.22, '#1f4a6c'); g.addColorStop(0.5, '#2f6a92'); g.addColorStop(0.78, '#1a4262'); g.addColorStop(1, '#091a2c');
  ctx.fillStyle = g; saAnnulus(ctx, c, R0, R1); ctx.fill();
  const N = 32;
  for (let i = 0; i < N; i++) { // plate tone varies, seams between plates
    const a0 = i / N * SA_TAU, a1 = (i + 1) / N * SA_TAU, v = rng();
    ctx.fillStyle = v < 0.5 ? `rgba(255,255,255,${(v * 0.12).toFixed(3)})` : `rgba(0,6,14,${((v - 0.5) * 0.4).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(c, c, R1, a0, a1); ctx.arc(c, c, R0, a1, a0, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(3,10,20,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(c + Math.cos(a0) * R0, c + Math.sin(a0) * R0); ctx.lineTo(c + Math.cos(a0) * R1, c + Math.sin(a0) * R1); ctx.stroke();
    ctx.fillStyle = 'rgba(190,230,250,0.5)'; // rivets at each seam
    ctx.fillRect(c + Math.cos(a0 + 0.02) * 181 - 0.7, c + Math.sin(a0 + 0.02) * 181 - 0.7, 1.4, 1.4);
    ctx.fillRect(c + Math.cos(a0 + 0.02) * 197 - 0.7, c + Math.sin(a0 + 0.02) * 197 - 0.7, 1.4, 1.4);
  }
  ctx.save(); ctx.strokeStyle = 'rgba(255,180,84,0.38)'; ctx.lineWidth = 1.4; ctx.setLineDash([9, 7]);
  ctx.beginPath(); ctx.arc(c, c, 189, 0, SA_TAU); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 7; ctx.strokeStyle = 'rgba(56,225,255,0.95)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(c, c, R1 + 0.5, 0, SA_TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(c, c, R0 - 0.5, 0, SA_TAU); ctx.stroke(); ctx.restore();
  // windows: two rows, about half of them lit, a bloom pass for the lit ones
  const lit = [];
  [[183, 1.4], [196, 1.4]].forEach(([r, step]) => {
    for (let a = 0; a < 360; a += step) {
      if (r > 190 && (a < 9 || a > 351)) continue; // room for the bay housing
      const v = rng(), ang = a * SA_D2R;
      ctx.save(); ctx.translate(c + Math.cos(ang) * r, c + Math.sin(ang) * r); ctx.rotate(ang + Math.PI / 2);
      if (v < 0.42) ctx.fillStyle = 'rgba(5,14,26,0.85)';
      else if (v < 0.8) { ctx.fillStyle = '#ffd38a'; lit.push([c + Math.cos(ang) * r, c + Math.sin(ang) * r, 255, 200, 120]); }
      else { ctx.fillStyle = '#bff4ff'; lit.push([c + Math.cos(ang) * r, c + Math.sin(ang) * r, 150, 235, 255]); }
      ctx.fillRect(-1.6, -1.2, 3.2, 2.4); ctx.restore();
    }
  });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  lit.forEach(([x, y, r, gg, b]) => { ctx.fillStyle = `rgba(${r},${gg},${b},0.10)`; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, SA_TAU); ctx.fill(); });
  ctx.restore();
}

// ---- eight habitat pods that bulge out of the ring (they break up the round silhouette) ----
function saPod(ctx, c, deg) {
  ctx.save(); ctx.translate(c, c); ctx.rotate(deg * SA_D2R);
  const x0 = 198, x1 = 213, hl = 17;
  ctx.beginPath(); ctx.moveTo(x0, -hl); ctx.lineTo(x1 - 3, -hl); ctx.quadraticCurveTo(x1, -hl, x1, -hl + 3); ctx.lineTo(x1, hl - 3);
  ctx.quadraticCurveTo(x1, hl, x1 - 3, hl); ctx.lineTo(x0, hl); ctx.closePath();
  const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#0d2540'); g.addColorStop(0.5, '#2c668d'); g.addColorStop(1, '#16405f');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(56,225,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
  for (let j = -2; j <= 2; j++) { ctx.fillStyle = j % 2 ? '#ffd38a' : '#bff4ff'; ctx.fillRect(203, j * 6 - 1.5, 5, 3); }
  ctx.restore();
}

// ---- the docking bay on the east side: a housing, a lit mouth, hazard stripes, guide lights ----
function saBay(ctx, c) {
  ctx.save(); ctx.translate(c, c);
  saGlow(ctx, 214, 0, 44, '255,180,84', 0.30);
  ctx.beginPath(); ctx.moveTo(184, -28); ctx.lineTo(204, -28); ctx.lineTo(215, -21); ctx.lineTo(215, 21); ctx.lineTo(204, 28); ctx.lineTo(184, 28); ctx.closePath();
  const g = ctx.createLinearGradient(0, -28, 0, 28);
  g.addColorStop(0, '#091a2c'); g.addColorStop(0.35, '#2b6389'); g.addColorStop(0.5, '#3a7aa3'); g.addColorStop(0.65, '#2b6389'); g.addColorStop(1, '#091a2c');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(56,225,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
  // mouth: a hot amber floor with dark walls
  ctx.beginPath(); ctx.moveTo(196, -13); ctx.lineTo(215, -15); ctx.lineTo(215, 15); ctx.lineTo(196, 13); ctx.closePath();
  const m = ctx.createLinearGradient(196, 0, 215, 0); m.addColorStop(0, '#fff1a8'); m.addColorStop(0.5, '#ffc062'); m.addColorStop(1, '#b8601c');
  ctx.fillStyle = m; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(198, -1, 17, 2);
  ctx.strokeStyle = 'rgba(70,30,4,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(196, -13); ctx.lineTo(215, -15); ctx.moveTo(196, 13); ctx.lineTo(215, 15); ctx.stroke();
  // hazard stripes on both lips
  [[-21, -16], [16, 21]].forEach(([ya, yb]) => {
    ctx.save(); ctx.beginPath(); ctx.rect(199, ya, 15, yb - ya); ctx.clip();
    ctx.fillStyle = '#150d04'; ctx.fillRect(199, ya, 15, yb - ya);
    ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 2.6;
    for (let x = 190; x < 226; x += 6) { ctx.beginPath(); ctx.moveTo(x, ya + 6); ctx.lineTo(x + 6, ya); ctx.stroke(); }
    ctx.restore();
  });
  // housing details: panel lines, two lit slots
  ctx.strokeStyle = 'rgba(3,10,20,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(190, -27); ctx.lineTo(190, 27); ctx.moveTo(196, -27); ctx.lineTo(196, -14); ctx.moveTo(196, 14); ctx.lineTo(196, 27); ctx.stroke();
  ctx.fillStyle = '#bff4ff'; ctx.fillRect(187, -24, 6, 2); ctx.fillRect(187, 22, 6, 2);
  ctx.restore();
}

function saStationLights() { // blinking lights in station-local coordinates (origin = hub centre, +x out through the bay)
  const L = [];
  for (let i = 0; i < 8; i++) { const a = (22.5 + 45 * i) * SA_D2R; L.push({ x: Math.cos(a) * 213, y: Math.sin(a) * 213, col: 'a', kind: 'pulse', period: 2100 + i * 170, phase: i * 0.8, s: 0.5 }); }
  [90, 180, 270].forEach((deg, i) => { const a = deg * SA_D2R; L.push({ x: Math.cos(a) * 205, y: Math.sin(a) * 205, col: 'w', kind: 'strobe', period: 1700, phase: i * 560, s: 0.7 }); });
  L.push({ x: Math.cos(-21 * SA_D2R) * 204, y: Math.sin(-21 * SA_D2R) * 204, col: 'g', kind: 'blink', period: 1200, phase: 0, s: 0.6 });
  L.push({ x: Math.cos(21 * SA_D2R) * 204, y: Math.sin(21 * SA_D2R) * 204, col: 'r', kind: 'blink', period: 1200, phase: 0, s: 0.6 });
  L.push({ x: 214, y: -18, col: 'a', kind: 'pulse', period: 900, phase: 0, s: 0.75 });
  L.push({ x: 214, y: 18, col: 'a', kind: 'pulse', period: 900, phase: 3.14, s: 0.75 });
  L.push({ x: 208, y: 0, col: 'a', kind: 'steady', period: 1, phase: 0, s: 1.5, a: 0.5 });
  return L;
}

function saDrawStation(scene) {
  const S = 440, c = 220, rng = saRng(7);
  const { tex, ctx } = saCanvas(scene, 'station', S, S);
  const g = ctx.createRadialGradient(c, c, 150, c, c, 218); // faint glow around the whole rim
  g.addColorStop(0, 'rgba(56,225,255,0)'); g.addColorStop(0.62, 'rgba(56,225,255,0.10)'); g.addColorStop(1, 'rgba(56,225,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(90,170,210,0.28)'; ctx.lineWidth = 2; // diagonal tension cables
  for (let i = 0; i < 4; i++) {
    const a = (45 + 90 * i) * SA_D2R; ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 48, c + Math.sin(a) * 48); ctx.lineTo(c + Math.cos(a) * 178, c + Math.sin(a) * 178); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) saSpoke(ctx, c, i * Math.PI / 2);
  saRing(ctx, c, rng);
  for (let i = 0; i < 8; i++) saPod(ctx, c, 22.5 + 45 * i);
  saBay(ctx, c);
  saHub(ctx, c, c);
  tex.refresh();
}

// ---- the middle ring (spins against the hull) ----
function saDrawRing2(scene) {
  const S = 260, c = 130, rng = saRng(21);
  const { tex, ctx } = saCanvas(scene, 'station-ring2', S, S);
  const R0 = 107, R1 = 123;
  const g = ctx.createRadialGradient(c, c, R0, c, c, R1);
  g.addColorStop(0, '#0b1f35'); g.addColorStop(0.4, '#245a82'); g.addColorStop(0.7, '#2d6890'); g.addColorStop(1, '#091a2c');
  ctx.fillStyle = g; saAnnulus(ctx, c, R0, R1); ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * SA_TAU;
    ctx.strokeStyle = 'rgba(3,10,20,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * R0, c + Math.sin(a) * R0); ctx.lineTo(c + Math.cos(a) * R1, c + Math.sin(a) * R1); ctx.stroke();
    const m = a + SA_TAU / 24; // a lit block in the middle of each plate
    ctx.save(); ctx.translate(c + Math.cos(m) * 115, c + Math.sin(m) * 115); ctx.rotate(m + Math.PI / 2);
    ctx.fillStyle = i % 3 === 0 ? '#ffd38a' : '#bff4ff'; ctx.fillRect(-4, -1.5, 8, 3); ctx.restore();
  }
  ctx.save(); ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 6; ctx.strokeStyle = 'rgba(56,225,255,0.95)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(c, c, R1 + 0.5, 0, SA_TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(c, c, R0 - 0.5, 0, SA_TAU); ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(255,180,84,0.9)'; // one amber marker so you can see it turn
  ctx.fillRect(c + R1 - 3, c - 3, 8, 6);
  void rng; tex.refresh();
}

function saDrawHubTex(scene) {
  const { tex, ctx } = saCanvas(scene, 'station-hub', 120, 120);
  saHub(ctx, 60, 60); tex.refresh();
}

// ---- a fixed shadow side and a soft highlight: the station spins, the light does not (sun is up and to the left) ----
function saDrawShade(scene) {
  const S = 460, c = 230;
  const { tex, ctx } = saCanvas(scene, 'station-shade', S, S);
  ctx.save(); saAnnulus(ctx, c, 170, 216); ctx.clip(); // only the ring and its pods
  let g = ctx.createLinearGradient(c - 150, c - 150, c + 150, c + 150);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.42, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,4,12,0.66)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  g = ctx.createLinearGradient(c - 150, c - 150, c + 20, c + 20);
  g.addColorStop(0, 'rgba(170,235,255,0.20)'); g.addColorStop(0.6, 'rgba(170,235,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; // keep the bay bright
  const h = ctx.createRadialGradient(c + 208, c, 0, c + 208, c, 40); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = h; ctx.fillRect(c + 160, c - 50, 100, 100); ctx.restore();
  tex.refresh();
}

function saDrawSmall(scene) {
  [['c', '56,225,255'], ['a', '255,180,84'], ['r', '255,77,109'], ['g', '109,255,156'], ['w', '200,235,255']].forEach(([k, rgb]) => {
    const { tex, ctx } = saCanvas(scene, 'glow-' + k, 48, 48);
    const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.14, `rgba(${rgb},1)`); g.addColorStop(0.42, `rgba(${rgb},0.35)`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 48, 48); tex.refresh();
  });
  { // the sweeping beam: a thin cone that fades with distance
    const { tex, ctx } = saCanvas(scene, 'station-beam', 280, 64);
    const g = ctx.createLinearGradient(0, 0, 280, 0); g.addColorStop(0, 'rgba(150,240,255,0.8)'); g.addColorStop(1, 'rgba(150,240,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 30.5); ctx.lineTo(280, 17); ctx.lineTo(280, 47); ctx.lineTo(0, 33.5); ctx.closePath(); ctx.fill(); tex.refresh();
  }
  { // the docking corridor: a faint trapezoid that widens away from the bay
    const { tex, ctx } = saCanvas(scene, 'station-lane', 520, 170);
    const g = ctx.createLinearGradient(0, 0, 520, 0); g.addColorStop(0, 'rgba(56,225,255,0.26)'); g.addColorStop(1, 'rgba(56,225,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 85 - 20); ctx.lineTo(520, 85 - 78); ctx.lineTo(520, 85 + 78); ctx.lineTo(0, 85 + 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(56,225,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(0, 85 - 20); ctx.lineTo(520, 85 - 78); ctx.moveTo(0, 85 + 20); ctx.lineTo(520, 85 + 78); ctx.stroke(); tex.refresh();
  }
  { // a chevron pointing back at the station
    const { tex, ctx } = saCanvas(scene, 'station-chev', 28, 32);
    ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 8; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(8, 16); ctx.lineTo(20, 26); ctx.stroke(); tex.refresh();
  }
}

// ---- Kestrel Outpost: a hexagonal core, solar wings, a dish and spurs ----
function saDrawOutpost(scene) {
  const S = 300, c = 150;
  const { tex, ctx } = saCanvas(scene, 'outpost', S, S);
  saGlow(ctx, c, c, 140, '109,255,156', 0.10);
  ctx.fillStyle = '#16384f'; ctx.fillRect(18, c - 3, 264, 6); ctx.strokeStyle = 'rgba(56,225,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(18, c - 3, 264, 6);
  const panel = (x, y) => { // one solar panel with a cell grid
    const g = ctx.createLinearGradient(0, y, 0, y + 70); g.addColorStop(0, '#0b2d4f'); g.addColorStop(0.5, '#1e72b0'); g.addColorStop(1, '#0b2d4f');
    ctx.fillStyle = g; ctx.fillRect(x, y, 30, 70);
    ctx.strokeStyle = 'rgba(160,225,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 3; i++) { ctx.moveTo(x + i * 10, y); ctx.lineTo(x + i * 10, y + 70); }
    for (let j = 1; j < 5; j++) { ctx.moveTo(x, y + j * 14); ctx.lineTo(x + 30, y + j * 14); }
    ctx.stroke(); ctx.strokeStyle = 'rgba(190,240,255,0.9)'; ctx.lineWidth = 1.3; ctx.strokeRect(x, y, 30, 70);
  };
  for (let k = 0; k < 3; k++) { panel(14 + k * 34, c - 35); panel(300 - 14 - 30 - k * 34, c - 35); }
  for (let i = 0; i < 4; i++) { // docking spurs
    ctx.save(); ctx.translate(c, c); ctx.rotate((45 + 90 * i) * SA_D2R);
    ctx.fillStyle = '#1d4a6c'; ctx.fillRect(30, -5, 22, 10); ctx.strokeStyle = 'rgba(56,225,255,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(30, -5, 22, 10);
    ctx.fillStyle = '#ffd38a'; ctx.fillRect(48, -2, 3, 4); ctx.restore();
  }
  ctx.strokeStyle = '#2f6f9c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c, c - 34); ctx.lineTo(c, c - 56); ctx.stroke(); // dish
  ctx.fillStyle = '#1d4a6c'; ctx.beginPath(); ctx.arc(c, c - 62, 8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(190,240,255,0.9)'; ctx.stroke();
  ctx.beginPath(); // the hexagonal core
  for (let i = 0; i < 6; i++) { const a = (i * 60 + 30) * SA_D2R; ctx.lineTo(c + Math.cos(a) * 36, c + Math.sin(a) * 36); }
  ctx.closePath();
  const hg = ctx.createRadialGradient(c - 10, c - 10, 2, c, c, 40); hg.addColorStop(0, '#3a86b0'); hg.addColorStop(0.6, '#173f5e'); hg.addColorStop(1, '#091d31');
  ctx.fillStyle = hg; ctx.fill();
  ctx.save(); ctx.shadowColor = '#6dff9c'; ctx.shadowBlur = 8; ctx.strokeStyle = 'rgba(109,255,156,0.95)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(190,240,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c, c, 23, 0, SA_TAU); ctx.stroke();
  for (let i = 0; i < 6; i++) { const a = (i * 60) * SA_D2R; ctx.fillStyle = i % 2 ? '#ffd38a' : '#bff4ff'; ctx.fillRect(c + Math.cos(a) * 29 - 2, c + Math.sin(a) * 29 - 1.5, 4, 3); }
  saGlow(ctx, c, c, 14, '109,255,156', 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c, c, 3.5, 0, SA_TAU); ctx.fill();
  tex.refresh();
}

function stationArt(scene) {
  saDrawSmall(scene); saDrawStation(scene); saDrawRing2(scene); saDrawHubTex(scene); saDrawShade(scene); saDrawOutpost(scene);
}

// ---------- the animated parts, added to the Space scene ----------
function stationFx(s) {
  const st = s.station;
  if (!st || !s.textures.exists('station-hub')) return;
  const ADD = Phaser.BlendModes.ADD;
  const ring2 = s.add.image(st.x, st.y, 'station-ring2').setDepth(1);
  const hub = s.add.image(st.x, st.y, 'station-hub').setDepth(1.1);
  const beam = s.add.image(st.x, st.y, 'station-beam').setOrigin(0, 0.5).setBlendMode(ADD).setAlpha(0.35).setDepth(1.2);
  s.add.image(st.x, st.y, 'station-shade').setDepth(1.4);
  const local = s.add.container(st.x, st.y).setDepth(1.5); // spins with the station; +x runs out through the bay
  const glow = (col, x, y, sc) => { const im = s.add.image(x, y, 'glow-' + col).setBlendMode(ADD).setScale(sc); local.add(im); return im; };
  // docking lane: corridor, ten pairs of rail lights, seven chevrons; a pulse of light runs in toward the bay
  const lane = s.add.image(222, 0, 'station-lane').setOrigin(0, 0.5).setBlendMode(ADD).setAlpha(0.45); local.add(lane);
  const rails = [], chevs = [];
  for (let k = 0; k < 10; k++) {
    const x = 246 + k * 48, hw = 24 + k * 5.6, first = k === 0, last = k === 9;
    rails.push({ k, a: glow(first ? 'a' : last ? 'g' : 'c', x, -hw, 0.55), b: glow(first ? 'a' : last ? 'r' : 'c', x, hw, 0.55) });
  }
  for (let j = 0; j < 7; j++) { const im = s.add.image(272 + j * 58, 0, 'station-chev').setBlendMode(ADD).setScale(0.85); local.add(im); chevs.push(im); }
  const lights = saStationLights().map(L => ({ L, im: glow(L.col, L.x, L.y, L.s) }));

  // Kestrel Outpost: small, quiet, no docking services; just somewhere else to look at
  const op = s.add.container(SA_OUTPOST.x, SA_OUTPOST.y).setDepth(1);
  op.add(s.add.image(0, 0, 'outpost'));
  const opLights = [[-132, 0, 'r'], [132, 0, 'g'], [0, -70, 'a'], [34, 34, 'c'], [-34, -34, 'c']].map(([x, y, col], i) => {
    const im = s.add.image(x, y, 'glow-' + col).setBlendMode(ADD).setScale(0.55); op.add(im); return { im, i };
  });
  label(s, SA_OUTPOST.x, SA_OUTPOST.y - 175, 'KESTREL OUTPOST', '#6dff9c', 16);

  const fx = time => {
    if (!st.active) return;
    local.rotation = st.rotation;
    ring2.rotation = time * 0.00016; hub.rotation = -time * 0.00025; beam.rotation = time * 0.0006;
    lights.forEach(({ L, im }) => {
      let a;
      if (L.kind === 'pulse') a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time / L.period * SA_TAU + L.phase));
      else if (L.kind === 'strobe') { const p = (time + L.phase) % L.period; a = (p < 70 || (p > 150 && p < 220)) ? 1 : 0.04; }
      else if (L.kind === 'blink') a = ((time + L.phase) % L.period) < 520 ? 1 : 0.12;
      else a = L.a || 0.8;
      im.setAlpha(a);
    });
    const ph = time / 130; // the lane pulse: ten steps, running from the far end in toward the bay
    rails.forEach(r => { const d = (((ph - (9 - r.k)) % 10) + 10) % 10, a = 0.3 + 0.7 * Math.max(0, 1 - d / 2.2); r.a.setAlpha(a); r.b.setAlpha(a); });
    chevs.forEach((im, j) => { const d = (((ph * 0.7 - (6 - j)) % 7) + 7) % 7; im.setAlpha(0.18 + 0.82 * Math.max(0, 1 - d / 1.8)); });
    op.rotation = time * 0.000026;
    opLights.forEach(({ im, i }) => im.setAlpha(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time / 900 + i * 1.7))));
  };
  s.events.on('update', fx);
  s.events.once('shutdown', () => s.events.off('update', fx));
}
