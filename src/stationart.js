// ---------- Station art: Halcyon Station and Kestrel Outpost ----------
// Drawn in code with canvas 2D gradients (still no image files, no libraries). Two entry points:
//   stationArt(scene)  Boot.create: draws the textures 'station', 'station-ring2', 'station-hub', 'station-shade',
//                      'station-beam', 'station-lane', 'station-chev', 'outpost' and the glow dots 'glow-c/a/r/g/w'
//   stationFx(scene)   Space.create, once this.station exists: the animated parts (counter-rotating ring and hub, blinking
//                      beacons, the docking lane, a sweeping beam, a fixed shadow side) and Kestrel Outpost
// Nothing here changes how docking works: the dock check in space.js still uses the station's centre and radius.

const SA_TAU = Math.PI * 2, SA_D2R = Math.PI / 180;

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

// ======================================================================================================================
// Station looks for other star systems (Universe B6). Nothing calls these yet: the systems cards pick a look from a station's
// `art` field (docs/UNIVERSE.md 4.1). They are drawn on first use, not at boot.
//   stationLook(scene, art)                  the key 'sl-<art>' of the station's texture, drawn if it is not there yet
//   stationLookFx(scene, art, x, y, opts)    the station and its animated parts, added to a scene at (x, y); returns
//                                            { c: container, radius, bay: {x, y}, destroy() }
// art: 'hub' (trade hub, green and white), 'foundry' (smelter, rust and molten orange), 'nest' (pirate dock, red),
// 'derelict' (a dead ring station, dark). Like Halcyon, the docking bay is on the +x side, so the same lane art fits.
// The glow dots ('glow-c/a/r/g/w') come from stationArt() at boot; they are made here if a scene has not had that yet.
// ======================================================================================================================
const STATION_LOOKS = {
  hub:      { size: 520, radius: 250, accent: '#6dff9c', bay: { x: 205, y: 0 } },
  foundry:  { size: 500, radius: 235, accent: '#ffb454', bay: { x: 215, y: 0 } },
  nest:     { size: 480, radius: 225, accent: '#ff4d6d', bay: { x: 205, y: 0 } },
  derelict: { size: 460, radius: 210, accent: '#9aa7b3', bay: { x: 200, y: 0 } }
};

// a docking bay on the +x side of a look whose centre is (c, c): housing, a lit mouth, hazard stripes on both lips.
// hull: [dark, light] steel; edge: css colour of the outline; mouth: [bright, mid, dark]; glow: 'r,g,b' of the light spilling out
function saLookBay(ctx, c, xi, xo, hw, hull, edge, mouth, glow, o) {
  o = o || {}; // o.stripe: colour of the lip stripes, o.line: the bright line down the mouth
  ctx.save(); ctx.translate(c, c);
  saGlow(ctx, xo - 2, 0, hw * 1.8, glow, 0.3);
  ctx.beginPath(); ctx.moveTo(xi, -hw); ctx.lineTo(xo - 11, -hw); ctx.lineTo(xo, -hw + 7); ctx.lineTo(xo, hw - 7); ctx.lineTo(xo - 11, hw); ctx.lineTo(xi, hw); ctx.closePath();
  let g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, hull[0]); g.addColorStop(0.35, hull[1]); g.addColorStop(0.5, hull[1]); g.addColorStop(0.65, hull[1]); g.addColorStop(1, hull[0]);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
  const mh = hw * 0.46; // the mouth: a hot floor between dark walls
  ctx.beginPath(); ctx.moveTo(xi + 12, -mh); ctx.lineTo(xo, -mh - 2); ctx.lineTo(xo, mh + 2); ctx.lineTo(xi + 12, mh); ctx.closePath();
  g = ctx.createLinearGradient(xi + 12, 0, xo, 0); g.addColorStop(0, mouth[0]); g.addColorStop(0.5, mouth[1]); g.addColorStop(1, mouth[2]);
  ctx.fillStyle = g; ctx.fill(); ctx.fillStyle = o.line || 'rgba(255,255,255,0.85)'; ctx.fillRect(xi + 14, -1, xo - xi - 14, 2);
  [[-hw + 3, -mh - 4], [mh + 4, hw - 3]].forEach(([ya, yb]) => { // hazard stripes on both lips
    ctx.save(); ctx.beginPath(); ctx.rect(xi + 16, ya, xo - xi - 18, yb - ya); ctx.clip();
    ctx.fillStyle = '#120a05'; ctx.fillRect(xi + 16, ya, xo - xi - 18, yb - ya); ctx.strokeStyle = o.stripe || '#ffb454'; ctx.lineWidth = 2.4;
    for (let x = xi + 6; x < xo + 10; x += 6) { ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x + 6, ya); ctx.stroke(); }
    ctx.restore();
  });
  ctx.restore();
}

// a truss along +x from x0 to x1, half-width hw: braces, edge lines, a lit centre strip (like Halcyon's spokes)
function saLookTruss(ctx, x0, x1, hw, dark, light, edge, strip) {
  const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, dark); g.addColorStop(0.4, light); g.addColorStop(0.5, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.fillRect(x0, -hw, x1 - x0, hw * 2);
  ctx.strokeStyle = 'rgba(150,210,235,0.28)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = x0; x < x1 - 12; x += 12) { ctx.moveTo(x, -hw); ctx.lineTo(x + 12, hw); ctx.moveTo(x, hw); ctx.lineTo(x + 12, -hw); }
  ctx.stroke(); ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, -hw); ctx.lineTo(x1, -hw); ctx.moveTo(x0, hw); ctx.lineTo(x1, hw); ctx.stroke();
  if (strip) { ctx.fillStyle = strip; for (let x = x0 + 8; x < x1 - 4; x += 12) ctx.fillRect(x, -1, 4, 2); }
}

// ---- hub: a trade exchange. Eight cargo arms with container pods round a market dome; a market wheel turns on top ----
function saDrawHubLook(scene) {
  const S = 520, c = 260, rng = saRng(31), GREEN = 'rgba(109,255,156,0.95)';
  const { tex, ctx } = saCanvas(scene, 'sl-hub', S, S);
  let g = ctx.createRadialGradient(c, c, 110, c, c, 258);
  g.addColorStop(0, 'rgba(109,255,156,0)'); g.addColorStop(0.62, 'rgba(109,255,156,0.09)'); g.addColorStop(1, 'rgba(109,255,156,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) { // arms; arm 0 points east and carries the bay
    ctx.save(); ctx.translate(c, c); ctx.rotate(i * Math.PI / 4);
    if (i === 0) { saLookTruss(ctx, 80, 160, 9, '#08202c', '#1f5a6e', GREEN, '#d9fff0'); }
    else {
      saLookTruss(ctx, 80, 176, 8, '#08202c', '#1f5a6e', GREEN, '#d9fff0');
      const x0 = 172, x1 = 224, hh = 22; // a container pod at the tip
      ctx.beginPath(); ctx.moveTo(x0, -hh); ctx.lineTo(x1 - 6, -hh); ctx.quadraticCurveTo(x1, -hh, x1, -hh + 6); ctx.lineTo(x1, hh - 6); ctx.quadraticCurveTo(x1, hh, x1 - 6, hh); ctx.lineTo(x0, hh); ctx.closePath();
      g = ctx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, '#0a2230'); g.addColorStop(0.5, '#2f7186'); g.addColorStop(1, '#0a2230');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = GREEN; ctx.lineWidth = 1.3; ctx.stroke();
      const cols = ['#6dff9c', '#ffd38a', '#e8fff4', '#7fe3ff'];
      for (let a = 0; a < 3; a++) for (let b = -2; b <= 2; b++) { ctx.fillStyle = rng() < 0.2 ? 'rgba(5,14,26,0.85)' : cols[Math.floor(rng() * cols.length)]; ctx.fillRect(x0 + 6 + a * 14, b * 7 - 2.5, 9, 5); }
    }
    ctx.restore();
  }
  saLookBay(ctx, c, 156, 214, 24, ['#06222e', '#2a6f86', ''], GREEN, ['#ecfff4', '#8dffb8', '#1d7a4c'], '109,255,156');
  // the middle ring: an octagon of dark plates with neon edges and lit windows
  const oct = r => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (22.5 + 45 * i) * SA_D2R; ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } ctx.closePath(); };
  oct(128); g = ctx.createRadialGradient(c, c, 90, c, c, 130); g.addColorStop(0, '#0a2431'); g.addColorStop(0.6, '#236078'); g.addColorStop(1, '#0a2431');
  ctx.fillStyle = g; ctx.fill(); oct(106); ctx.fillStyle = '#06161f'; ctx.fill();
  ctx.save(); ctx.shadowColor = '#6dff9c'; ctx.shadowBlur = 8; ctx.strokeStyle = GREEN; ctx.lineWidth = 2; oct(128); ctx.stroke(); oct(106); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 64; i++) { // windows round the ring
    const a = i / 64 * SA_TAU, v = rng(), r = 117;
    ctx.save(); ctx.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = v < 0.35 ? 'rgba(5,14,26,0.85)' : v < 0.75 ? '#ffd38a' : '#d9fff0'; ctx.fillRect(-1.8, -1.2, 3.6, 2.4); ctx.restore();
  }
  // the market dome: a lit floor of rings and stalls under the turning wheel
  g = ctx.createRadialGradient(c, c, 0, c, c, 104); g.addColorStop(0, '#2b8a8a'); g.addColorStop(0.5, '#124a5c'); g.addColorStop(1, '#06202c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, 104, 0, SA_TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(109,255,156,0.55)'; ctx.lineWidth = 1.2;
  [92, 76, 60].forEach(r => { oct(r); ctx.stroke(); });
  ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * SA_TAU; ctx.moveTo(c + Math.cos(a) * 40, c + Math.sin(a) * 40); ctx.lineTo(c + Math.cos(a) * 100, c + Math.sin(a) * 100); } ctx.stroke();
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * SA_TAU, r = 68 + (i % 2) * 14; ctx.fillStyle = i % 3 ? '#ffd38a' : '#d9fff0'; ctx.fillRect(c + Math.cos(a) * r - 3, c + Math.sin(a) * r - 2, 6, 4); }
  saGlow(ctx, c, c, 40, '109,255,156', 0.5);
  tex.refresh();
  { // the market wheel: 24 cargo boxes on a ring, drawn alone so it can turn
    const { tex: wt, ctx: w } = saCanvas(scene, 'sl-hub-wheel', 260, 260), k = 130;
    w.fillStyle = '#071a24'; w.beginPath(); w.arc(k, k, 100, 0, SA_TAU); w.arc(k, k, 56, 0, SA_TAU, true); w.fill('evenodd');
    const cols = ['#6dff9c', '#ffd38a', '#e8fff4', '#7fe3ff', '#ff9c6b'];
    for (let i = 0; i < 24; i++) {
      w.save(); w.translate(k, k); w.rotate(i / 24 * SA_TAU); const col = cols[(i * 7 + (i >> 2)) % cols.length];
      w.fillStyle = col; w.globalAlpha = 0.9; w.fillRect(66, -7, 24, 14); w.globalAlpha = 1; w.strokeStyle = 'rgba(2,10,16,0.85)'; w.lineWidth = 1.5; w.strokeRect(66, -7, 24, 14);
      w.fillStyle = 'rgba(255,255,255,0.7)'; w.fillRect(69, -5, 8, 2); w.restore();
    }
    w.save(); w.shadowColor = '#6dff9c'; w.shadowBlur = 7; w.strokeStyle = GREEN; w.lineWidth = 1.6; w.beginPath(); w.arc(k, k, 98, 0, SA_TAU); w.stroke(); w.beginPath(); w.arc(k, k, 58, 0, SA_TAU); w.stroke(); w.restore();
    for (let i = 0; i < 4; i++) { w.save(); w.translate(k, k); w.rotate(i * Math.PI / 2 + Math.PI / 4); w.fillStyle = 'rgba(109,255,156,0.5)'; w.fillRect(14, -2, 44, 4); w.restore(); }
    saGlow(w, k, k, 22, '255,255,255', 0.8); wt.refresh();
  }
}

// ---- foundry: a smelter. A furnace dome, two stacks, an ore hopper with a conveyor, a crane, heavy plating, a bay ----
function saDrawFoundryLook(scene) {
  const S = 500, c = 250, rng = saRng(47);
  const { tex, ctx } = saCanvas(scene, 'sl-foundry', S, S);
  saGlow(ctx, c - 30, c, 220, '255,110,40', 0.16);
  // girders out to the north and south docking spurs
  [-1, 1].forEach(sy => {
    ctx.save(); ctx.translate(c, c); ctx.rotate(sy * Math.PI / 2); saLookTruss(ctx, 60, 190, 8, '#1c1410', '#5a4636', 'rgba(255,180,84,0.8)', '#ffd38a');
    ctx.fillStyle = '#3a2c20'; ctx.fillRect(186, -16, 22, 32); ctx.strokeStyle = 'rgba(255,180,84,0.9)'; ctx.lineWidth = 1.3; ctx.strokeRect(186, -16, 22, 32);
    ctx.fillStyle = '#ffb454'; ctx.fillRect(203, -5, 4, 10); ctx.restore();
  });
  // the main hull: a wide rounded slab of rust-brown plating
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); };
  rr(c - 170, c - 92, 340, 184, 26);
  let g = ctx.createLinearGradient(0, c - 92, 0, c + 92); g.addColorStop(0, '#1b1411'); g.addColorStop(0.25, '#5b4636'); g.addColorStop(0.5, '#6e5640'); g.addColorStop(0.75, '#4b3a2d'); g.addColorStop(1, '#17100d');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,170,80,0.85)'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.save(); rr(c - 170, c - 92, 340, 184, 26); ctx.clip();
  for (let i = 0; i < 70; i++) { // plates: lighter and darker patches, scorch marks
    const x = c - 170 + rng() * 340, y = c - 92 + rng() * 184, w = 14 + rng() * 40, h = 10 + rng() * 26, v = rng();
    ctx.fillStyle = v < 0.5 ? `rgba(255,220,180,${(0.03 + v * 0.1).toFixed(3)})` : `rgba(0,0,0,${(0.1 + (v - 0.5) * 0.3).toFixed(3)})`; ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = 'rgba(8,4,2,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let x = c - 140; x < c + 170; x += 46) { ctx.moveTo(x, c - 92); ctx.lineTo(x, c + 92); }
  for (let y = c - 60; y < c + 92; y += 60) { ctx.moveTo(c - 170, y); ctx.lineTo(c + 170, y); }
  ctx.stroke(); ctx.fillStyle = 'rgba(255,220,180,0.5)';
  for (let x = c - 140; x < c + 170; x += 46) for (let y = c - 84; y < c + 92; y += 24) ctx.fillRect(x + 2, y, 1.6, 1.6);
  ctx.restore();
  // the ore hopper at the west end: a lit grid with a heap of ore and a conveyor to the furnace
  ctx.fillStyle = '#120d0a'; ctx.fillRect(c - 160, c - 58, 74, 116); ctx.strokeStyle = 'rgba(255,180,84,0.8)'; ctx.lineWidth = 1.2; ctx.strokeRect(c - 160, c - 58, 74, 116);
  for (let i = 0; i < 90; i++) { const x = c - 156 + rng() * 66, y = c - 54 + rng() * 108, v = rng(); ctx.fillStyle = v < 0.2 ? '#ffb454' : v < 0.6 ? '#7a5638' : '#4a3626'; ctx.fillRect(x, y, 2 + rng() * 4, 2 + rng() * 3); }
  ctx.save(); ctx.strokeStyle = 'rgba(255,200,120,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(c - 86, c); ctx.lineTo(c - 44, c); ctx.stroke(); ctx.restore();
  // pipes from the stacks to the dome, with highlights
  [[-1], [1]].forEach(([sy]) => {
    ctx.strokeStyle = '#2a1f18'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(c + 30, c + sy * 70); ctx.lineTo(c + 30, c + sy * 30); ctx.lineTo(c - 6, c + sy * 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,180,110,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  });
  // the furnace dome: steel rim, a molten pool, vents
  g = ctx.createRadialGradient(c - 40, c, 0, c - 40, c, 70); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.25, '#ffc040'); g.addColorStop(0.6, '#e0541c'); g.addColorStop(0.9, '#5a1a0c'); g.addColorStop(1, '#2a0e08');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c - 40, c, 66, 0, SA_TAU); ctx.fill();
  ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(c - 40, c, 70, 0, SA_TAU); ctx.stroke();
  ctx.save(); ctx.shadowColor = '#ff8a3a'; ctx.shadowBlur = 12; ctx.strokeStyle = 'rgba(255,170,90,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(c - 40, c, 74.5, 0, SA_TAU); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 16; i++) { const a = i / 16 * SA_TAU; ctx.fillStyle = i % 2 ? '#ffd38a' : '#ff7a30'; ctx.fillRect(c - 40 + Math.cos(a) * 70 - 2, c + Math.sin(a) * 70 - 2, 4, 4); }
  ctx.strokeStyle = 'rgba(255,230,160,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.26, r = 22 + (i % 2) * 14; ctx.moveTo(c - 40 + Math.cos(a) * 8, c + Math.sin(a) * 8); ctx.lineTo(c - 40 + Math.cos(a + 0.5) * r, c + Math.sin(a + 0.5) * r); } ctx.stroke();
  // two stacks seen from above: dark throats in orange-lit steel
  [-70, 70].forEach(y => {
    const sx = c + 30, sy = c + y;
    g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 30); g.addColorStop(0, '#0a0504'); g.addColorStop(0.6, '#1c110c'); g.addColorStop(0.85, '#6a4a34'); g.addColorStop(1, '#2a1c14');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, SA_TAU); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ff8a3a'; ctx.shadowBlur = 9; ctx.strokeStyle = 'rgba(255,170,90,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 27, 0, SA_TAU); ctx.stroke(); ctx.restore();
    saGlow(ctx, sx, sy, 17, '255,120,50', 0.55);
  });
  saLookBay(ctx, c, 172, 232, 24, ['#14100c', '#6a5240', ''], 'rgba(255,180,84,0.9)', ['#fff1a8', '#ffc062', '#b8601c'], '255,150,60');
  tex.refresh();
  { // the crane: a long arm on a pivot, turned slowly over the hopper
    const { tex: ct, ctx: w } = saCanvas(scene, 'sl-foundry-crane', 210, 40);
    w.save(); w.translate(0, 20); saLookTruss(w, 10, 200, 5, '#1c1410', '#6a5240', 'rgba(255,180,84,0.85)', '#ffd38a'); w.restore();
    w.fillStyle = '#3a2c20'; w.beginPath(); w.arc(16, 20, 11, 0, SA_TAU); w.fill(); w.strokeStyle = 'rgba(255,180,84,0.9)'; w.lineWidth = 1.4; w.stroke();
    w.fillStyle = '#ffb454'; w.fillRect(194, 14, 8, 12); saGlow(w, 16, 20, 9, '255,180,84', 0.7); ct.refresh();
  }
}

// ---- nest: a pirate dock cut into an asteroid. Jagged rock, welded plates, spikes, turrets, red lights, a mouth full of teeth ----
function saDrawNestLook(scene) {
  const S = 480, c = 240, rng = saRng(61);
  const { tex, ctx } = saCanvas(scene, 'sl-nest', S, S);
  saGlow(ctx, c, c, 236, '255,60,60', 0.12);
  // the rock outline: a ragged circle from a few sine waves and per-point noise, with the east side kept open for the bay
  const pts = [], N = 72, ph = [rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < N; i++) {
    const a = i / N * SA_TAU, r = 150 + 16 * Math.sin(a * 3 + ph[0]) + 10 * Math.sin(a * 5 + ph[1]) + 7 * Math.sin(a * 9 + ph[2]) + (rng() - 0.5) * 12;
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  // spikes: steel spines poking out of the rock (not at the bay)
  [[-2.2, 38], [-1.3, 44], [-0.55, 30], [0.75, 34], [1.5, 46], [2.3, 36], [3.0, 30]].forEach(([a, len]) => {
    const r0 = 150, x0 = c + Math.cos(a) * r0, y0 = c + Math.sin(a) * r0;
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a); ctx.fillStyle = '#2a2326'; ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(len, 0); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,80,80,0.9)'; ctx.fillRect(len - 9, -1, 6, 2); ctx.restore();
  });
  path(); let g = ctx.createRadialGradient(c - 40, c - 40, 20, c, c, 180); g.addColorStop(0, '#4a3e3c'); g.addColorStop(0.6, '#2e2626'); g.addColorStop(1, '#171212');
  ctx.fillStyle = g; ctx.fill(); ctx.save(); path(); ctx.clip();
  for (let i = 0; i < 160; i++) { const x = c - 170 + rng() * 340, y = c - 170 + rng() * 340, r = 2 + rng() * 14, v = rng(); ctx.fillStyle = v < 0.5 ? `rgba(255,200,180,${(0.02 + v * 0.07).toFixed(3)})` : `rgba(0,0,0,${(0.1 + (v - 0.5) * 0.3).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, SA_TAU); ctx.fill(); }
  // welded plates: dull steel slabs, rust, red stripes, rivets
  for (let i = 0; i < 16; i++) {
    const a = rng() * SA_TAU, d = 30 + rng() * 105, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, w = 26 + rng() * 44, h = 18 + rng() * 30;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rng() * 3);
    ctx.fillStyle = rng() < 0.3 ? '#5a2a26' : rng() < 0.6 ? '#4b4750' : '#38343a'; ctx.fillRect(-w / 2, -h / 2, w, h);
    if (rng() < 0.4) { ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); ctx.strokeStyle = 'rgba(255,60,60,0.85)'; ctx.lineWidth = 3; for (let k = -w; k < w; k += 9) { ctx.beginPath(); ctx.moveTo(k, h / 2); ctx.lineTo(k + 9, -h / 2); ctx.stroke(); } ctx.restore(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 1.2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => ctx.fillRect(sx * (w / 2 - 3) - 0.8, sy * (h / 2 - 3) - 0.8, 1.6, 1.6));
    ctx.restore();
  }
  // the emblem: a red ring cut by a blade, painted on the biggest slab
  ctx.save(); ctx.translate(c - 30, c - 4); ctx.rotate(-0.4); ctx.strokeStyle = 'rgba(255,60,70,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 30, 0, SA_TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(255,60,70,0.95)'; ctx.beginPath(); ctx.moveTo(-44, 5); ctx.lineTo(44, -9); ctx.lineTo(40, -2); ctx.lineTo(-40, 12); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.save(); ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(255,80,80,0.75)'; ctx.lineWidth = 2; path(); ctx.stroke(); ctx.restore();
  // masts and floodlight gantries
  [[-90, -118, -110, -178], [60, -130, 84, -190], [-40, 128, -58, 184]].forEach(([x0, y0, x1, y1]) => {
    ctx.strokeStyle = '#3a3036'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c + x0, c + y0); ctx.lineTo(c + x1, c + y1); ctx.stroke();
    ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(c + x1, c + y1, 2.6, 0, SA_TAU); ctx.fill();
  });
  // turret mounts (the guns themselves are separate images that turn)
  [[-26, -104], [76, 70], [-84, 82]].forEach(([x, y]) => {
    g = ctx.createRadialGradient(c + x, c + y, 2, c + x, c + y, 15); g.addColorStop(0, '#6a5a5e'); g.addColorStop(1, '#241c20');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c + x, c + y, 15, 0, SA_TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,80,80,0.85)'; ctx.lineWidth = 1.4; ctx.stroke();
  });
  // the mouth: a bay with a hard red glow
  saLookBay(ctx, c, 140, 205, 26, ['#120c0e', '#4a3c42', ''], '#ff4d6d', ['#ffe0d0', '#ff6a50', '#8a1818'], '255,70,60', { stripe: '#ff4d6d' });
  // teeth: two rows of steel fangs round the lips
  ctx.fillStyle = '#6a6068'; ctx.strokeStyle = '#120c0e'; ctx.lineWidth = 1;
  [-1, 1].forEach(sy => { for (let k = 0; k < 5; k++) { const x = 170 + k * 7 + c; ctx.beginPath(); ctx.moveTo(x, c + sy * 28); ctx.lineTo(x + 3.5, c + sy * 40); ctx.lineTo(x + 7, c + sy * 28); ctx.closePath(); ctx.fill(); ctx.stroke(); } });
  tex.refresh();
  { // a gun: a short barrel on a hub, turned toward you
    const { tex: gt, ctx: w } = saCanvas(scene, 'sl-nest-gun', 56, 24);
    w.fillStyle = '#4a3e44'; w.fillRect(10, 8, 40, 8); w.strokeStyle = 'rgba(255,80,80,0.9)'; w.lineWidth = 1.2; w.strokeRect(10, 8, 40, 8);
    w.fillStyle = '#ff5a4a'; w.fillRect(46, 10, 5, 4); w.fillStyle = '#2a2024'; w.beginPath(); w.arc(12, 12, 8, 0, SA_TAU); w.fill(); w.stroke(); gt.refresh();
  }
}

// ---- derelict: a dead ring station. Torn spokes, a ring with chunks missing, dark windows, scorch marks, a dark bay ----
function saDrawDerelictLook(scene) {
  const S = 460, c = 230, rng = saRng(83);
  const { tex, ctx } = saCanvas(scene, 'sl-derelict', S, S);
  const R0 = 146, R1 = 170, N = 32, gone = i => (i >= 4 && i <= 9) || (i >= 21 && i <= 24); // two chunks of the ring are missing
  // spokes: one whole, two snapped part way, one gone but its stump
  [[0, 176], [Math.PI / 2, 92], [Math.PI, 126], [-Math.PI / 2, 52]].forEach(([ang, len]) => {
    ctx.save(); ctx.translate(c, c); ctx.rotate(ang);
    saLookTruss(ctx, 40, len, 6, '#0b0e12', '#3a4654', 'rgba(130,150,170,0.5)', null);
    ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.moveTo(len, -6); ctx.lineTo(len + 5, -2); ctx.lineTo(len + 2, 2); ctx.lineTo(len + 6, 6); ctx.lineTo(len, 6); ctx.closePath(); ctx.fill(); // the torn end
    ctx.restore();
  });
  for (let i = 0; i < N; i++) { // the ring, plate by plate
    if (gone(i)) continue;
    const a0 = i / N * SA_TAU, a1 = (i + 1) / N * SA_TAU, v = rng();
    ctx.beginPath(); ctx.arc(c, c, R1, a0, a1); ctx.arc(c, c, R0, a1, a0, true); ctx.closePath();
    ctx.fillStyle = v < 0.3 ? '#242c36' : v < 0.7 ? '#2f3a46' : '#3a4654'; ctx.fill();
    ctx.strokeStyle = 'rgba(2,4,8,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
    for (let k = 0; k < 4; k++) { const aa = a0 + (k + 0.5) / 4 * (a1 - a0), r = k % 2 ? 153 : 163; ctx.fillStyle = rng() < 0.06 ? '#ffb454' : 'rgba(4,8,14,0.9)'; ctx.fillRect(c + Math.cos(aa) * r - 1.4, c + Math.sin(aa) * r - 1, 2.8, 2); } // windows: nearly all dark
    if (i === 3 || i === 10 || i === 20 || i === 25) { // the plate next to a break is blackened and torn
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(180,90,40,0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); const e = (i === 3 || i === 20) ? a1 : a0; ctx.moveTo(c + Math.cos(e) * R0, c + Math.sin(e) * R0); ctx.lineTo(c + Math.cos(e) * R1, c + Math.sin(e) * R1); ctx.stroke();
    }
  }
  ctx.save(); ctx.strokeStyle = 'rgba(120,140,160,0.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); // the ring's cold edge lines, only where it still exists
  for (let i = 0; i < N; i++) if (!gone(i)) { ctx.beginPath(); ctx.arc(c, c, R1 + 0.5, i / N * SA_TAU, (i + 1) / N * SA_TAU); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 40; i++) { // scorch streaks and rust running off the ring
    const a = rng() * SA_TAU, r = R0 + rng() * 24; if (gone(Math.floor(a / SA_TAU * N))) continue;
    ctx.strokeStyle = rng() < 0.5 ? 'rgba(0,0,0,0.45)' : 'rgba(150,80,40,0.25)'; ctx.lineWidth = 1 + rng() * 2; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r); ctx.lineTo(c + Math.cos(a + 0.06 * (rng() - 0.5)) * (r - 10 - rng() * 22), c + Math.sin(a) * (r - 10 - rng() * 22)); ctx.stroke();
  }
  saLookBay(ctx, c, 136, 192, 22, ['#06080b', '#222c36', ''], 'rgba(110,130,150,0.7)', ['#2a1a18', '#1a0f0e', '#0a0505'], '120,30,20', { stripe: '#4a4234', line: 'rgba(110,50,40,0.5)' }); // a dark bay, its glow nearly out
  // the hub: dull steel with a breach
  const hg = ctx.createRadialGradient(c - 8, c - 8, 2, c, c, 46); hg.addColorStop(0, '#46566a'); hg.addColorStop(0.6, '#1f2a36'); hg.addColorStop(1, '#0a0e14');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(c, c, 44, 0, SA_TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,140,160,0.6)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#020305'; ctx.beginPath(); ctx.moveTo(c + 4, c - 20); ctx.lineTo(c + 22, c - 6); ctx.lineTo(c + 12, c + 4); ctx.lineTo(c + 18, c + 20); ctx.lineTo(c - 2, c + 8); ctx.lineTo(c + 2, c - 4); ctx.closePath(); ctx.fill(); // the breach
  ctx.strokeStyle = 'rgba(190,100,50,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c - 30, c - 12); ctx.lineTo(c - 8, c - 2); ctx.lineTo(c - 14, c + 14); ctx.stroke(); // cracks
  tex.refresh();
  { // three chunks of wreckage that drift round it
    for (let k = 0; k < 3; k++) {
      const { tex: dt, ctx: w } = saCanvas(scene, 'sl-derelict-debris-' + k, 48, 36), r2 = saRng(200 + k);
      w.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * SA_TAU, r = 10 + r2() * 11; w.lineTo(24 + Math.cos(a) * r * 1.3, 18 + Math.sin(a) * r * 0.9); } w.closePath();
      w.fillStyle = ['#2f3a46', '#3a4654', '#242c36'][k]; w.fill(); w.strokeStyle = 'rgba(130,150,170,0.55)'; w.lineWidth = 1.2; w.stroke();
      w.strokeStyle = 'rgba(0,0,0,0.6)'; w.beginPath(); w.moveTo(12, 14); w.lineTo(34, 22); w.stroke(); dt.refresh();
    }
  }
}

// ---- the animated parts of each look: each returns the function that runs every frame (time in ms) ----
const SA_LOOK_FX = {
  hub(s, c, glow) {
    const wheel = s.add.image(0, 0, 'sl-hub-wheel'); c.add(wheel);
    const core = glow('g', 0, 0, 2.8);
    const tips = [1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return glow('g', Math.cos(a) * 230, Math.sin(a) * 230, 0.6); });
    const bay = [glow('g', 212, -26, 0.6), glow('r', 212, 26, 0.6), glow('a', 190, 0, 1.1)];
    const shuttle = [glow('w', 0, 0, 0.4), glow('c', 0, 0, 0.3), glow('c', 0, 0, 0.22)];
    return time => {
      wheel.rotation = -time * 0.0003;
      core.setAlpha(0.2 + 0.14 * (0.5 + 0.5 * Math.sin(time / 700)));
      tips.forEach((im, i) => { const d = (((time / 170 - i) % 7) + 7) % 7; im.setAlpha(0.2 + 0.8 * Math.max(0, 1 - d / 2.2)); }); // a green chase round the pods
      bay[0].setAlpha(((time % 1200) < 520) ? 1 : 0.15); bay[1].setAlpha(((time % 1200) < 520) ? 1 : 0.15);
      bay[2].setAlpha(0.35 + 0.3 * (0.5 + 0.5 * Math.sin(time / 260)));
      shuttle.forEach((im, i) => { const a = time / 2300 - i * 0.07; im.setPosition(Math.cos(a) * 246, Math.sin(a) * 246).setAlpha(1 - i * 0.35); }); // a freighter circling the hub
    };
  },
  foundry(s, c, glow) {
    const crane = s.add.image(-123, 0, 'sl-foundry-crane').setOrigin(16 / 210, 0.5).setScale(0.62); c.add(crane);
    const furnace = glow('a', -40, 0, 3.8), hot = glow('w', -40, 0, 1.3);
    const stacks = [glow('a', 30, -70, 1.4), glow('a', 30, 70, 1.4)];
    const beacons = [[-165, -88], [165, -88], [-165, 88], [165, 88]].map(([x, y], i) => ({ im: glow('a', x, y, 0.6), i }));
    const bay = [glow('a', 224, -22, 0.6), glow('a', 224, 22, 0.6)];
    const puffs = []; // smoke from the two stacks: grey discs that grow and fade as they rise toward the camera
    for (let k = 0; k < 12; k++) { const im = s.add.image(0, 0, 'glow-w').setTint(0xa09088).setAlpha(0); c.add(im); puffs.push({ im, y: k % 2 ? 70 : -70, off: Math.floor(k / 2) / 6 }); }
    return time => {
      crane.rotation = 0.75 * Math.sin(time / 3600);
      const fl = 0.34 + 0.14 * Math.sin(time / 210) + 0.09 * Math.sin(time / 97 + 1);
      furnace.setAlpha(fl); hot.setAlpha(0.08 + 0.3 * fl);
      stacks.forEach((im, i) => im.setAlpha(0.35 + 0.3 * Math.sin(time / 330 + i * 2.1) * Math.sin(time / 710 + i)));
      beacons.forEach(({ im, i }) => im.setAlpha(((time + (i % 2) * 600) % 1200) < 450 ? 1 : 0.1));
      bay.forEach((im, i) => im.setAlpha(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time / 280 + i * 3.14))));
      puffs.forEach(p => {
        const q = ((time / 2800 + p.off) % 1);
        p.im.setPosition(30 + q * 22, p.y - q * 16).setScale(0.3 + 1.1 * q).setAlpha(0.5 * (1 - q) * Math.min(1, q / 0.12));
      });
    };
  }
};
SA_LOOK_FX.nest = (s, c, glow) => {
  const guns = [[-26, -104], [76, 70], [-84, 82]].map(([x, y], i) => { const im = s.add.image(x, y, 'sl-nest-gun').setOrigin(12 / 56, 0.5); c.add(im); return { im, i }; });
  const beam = s.add.image(-26, -104, 'station-beam').setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setTint(0xff3b3b); c.add(beam);
  const strobes = [[-110, -178], [84, -190], [-58, 184], [150, -80], [150, 80], [-150, 10]].map(([x, y], i) => ({ im: glow('r', x, y, 0.65), i }));
  const flood = [glow('a', 180, -34, 1.2), glow('a', 180, 34, 1.2)];
  const bay = [glow('r', 212, -22, 0.6), glow('r', 212, 22, 0.6), glow('r', 190, 0, 1.4)];
  return time => {
    beam.rotation = time * 0.0009; // a red searchlight sweeping
    guns.forEach(({ im, i }) => { im.rotation = 0.7 * Math.sin(time / (2300 + i * 700) + i * 2) + (i === 0 ? -1.9 : i === 1 ? 0.5 : 2.4); }); // the guns look about
    strobes.forEach(({ im, i }) => { const p = (time + i * 370) % 1500; im.setAlpha(p < 80 || (p > 160 && p < 230) ? 1 : 0.05); });
    flood.forEach((im, i) => im.setAlpha(0.25 + 0.3 * Math.abs(Math.sin(time / 90 + i * 2) * Math.sin(time / 310 + i)))); // flickering floodlights
    bay[0].setAlpha(((time % 900) < 450) ? 1 : 0.1); bay[1].setAlpha(((time % 900) < 450) ? 0.1 : 1);
    bay[2].setAlpha(0.3 + 0.25 * Math.sin(time / 200));
  };
};
SA_LOOK_FX.derelict = (s, c, glow) => {
  const lights = [[160, 40], [-150, -60], [30, 158], [-20, -166]].map(([x, y], i) => ({ im: glow('r', x, y, 0.5), i })); // emergency lights that mostly do not work
  const sparks = [[142, -52], [-136, 76], [10, 96]].map(([x, y], i) => ({ im: glow('w', x, y, 0.55), i, per: 3100 + i * 1300 }));
  const debris = [0, 1, 2, 0, 1].map((k, i) => { const im = s.add.image(0, 0, 'sl-derelict-debris-' + k).setAlpha(0.9).setScale(0.8); c.add(im); return { im, i, r: 215 + i * 17, sp: (i % 2 ? -1 : 1) * (0.00006 + i * 0.000015) }; });
  return time => {
    c.rotation = time * 0.00003; // the wreck tumbles very slowly
    lights.forEach(({ im, i }) => { const v = Math.sin(time / 137 + i * 2.2) * Math.sin(time / 53 + i * 5.1) * Math.sin(time / 911 + i); im.setAlpha(v > 0.55 ? 0.9 : 0.04); });
    sparks.forEach(({ im, per, i }) => { const p = (time + i * 777) % per; im.setAlpha(p < 60 ? 1 : p < 140 && p > 90 ? 0.6 : 0); });
    debris.forEach(({ im, i, r, sp }) => { const a = time * sp + i * 1.3; im.setPosition(Math.cos(a) * r, Math.sin(a) * r).setRotation(time * 0.0002 * (i + 1)); });
  };
};
const SA_LOOK_DRAW = { hub: saDrawHubLook, foundry: saDrawFoundryLook, nest: saDrawNestLook, derelict: saDrawDerelictLook };

function stationLook(scene, art) {
  if (!STATION_LOOKS[art]) art = 'hub';
  if (!scene.textures.exists('sl-' + art)) SA_LOOK_DRAW[art](scene);
  return 'sl-' + art;
}

function stationLookFx(s, art, x, y, opts) {
  opts = opts || {};
  if (!STATION_LOOKS[art]) art = 'hub';
  if (!s.textures.exists('glow-a')) saDrawSmall(s);
  const key = stationLook(s, art), look = STATION_LOOKS[art], ADD = Phaser.BlendModes.ADD;
  const c = s.add.container(x, y).setDepth(opts.depth !== undefined ? opts.depth : 1);
  c.add(s.add.image(0, 0, key));
  const glow = (col, gx, gy, sc) => { const im = s.add.image(gx, gy, 'glow-' + col).setBlendMode(ADD).setScale(sc); c.add(im); return im; };
  const step = SA_LOOK_FX[art](s, c, glow);
  const fx = time => { if (c.active) step(time); };
  s.events.on('update', fx);
  const off = () => s.events.off('update', fx);
  s.events.once('shutdown', off);
  c.once('destroy', off); // destroying the container by hand (or the scene doing it) takes the hook away too
  return { c, radius: look.radius, bay: look.bay, accent: look.accent, destroy() { c.destroy(); } };
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

  // Kestrel Outpost: small, quiet, no docking services; just somewhere else to look at (scenery bodies in the system data)
  const ops = sysBodies('scenery').filter(b => b.art === 'outpost').map(def => { // src/universe.js
    const op = s.add.container(def.x, def.y).setDepth(1);
    op.add(s.add.image(0, 0, def.art));
    const lights = [[-132, 0, 'r'], [132, 0, 'g'], [0, -70, 'a'], [34, 34, 'c'], [-34, -34, 'c']].map(([x, y, col], i) => {
      const im = s.add.image(x, y, 'glow-' + col).setBlendMode(ADD).setScale(0.55); op.add(im); return { im, i };
    });
    label(s, def.x, def.y + def.labelDy, def.name.toUpperCase(), '#6dff9c', 16);
    return { op, lights };
  });

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
    ops.forEach(({ op, lights }) => {
      op.rotation = time * 0.000026;
      lights.forEach(({ im, i }) => im.setAlpha(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time / 900 + i * 1.7))));
    });
  };
  s.events.on('update', fx);
  s.events.once('shutdown', () => s.events.off('update', fx));
}
