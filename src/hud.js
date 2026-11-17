// ---------- HUD: one cockpit frame for Station, Space and Surface ----------
// Every scene calls hudTick(this) once per frame, last thing in update(). It builds its own graphics and text on first
// use (and again after a scene restart), so the scenes carry no HUD code of their own.
//   Space reads:   s.ship  s.station  s.planet  s.enemies, plus missionTarget(s) and missionDef() from missions.js
//   Surface reads: s.player  s.hp  s.col  s.pad  s.pod  s.crawlers
//   Station reads: s.spots
// Missions talk to it with hudBlip(s, x, y, color, r) (a radar dot for this frame) and hudMeter(s, name, frac, color)
// (a bar under the checklist for this frame). The checklist for each mission is in HUD_MISSIONS below; a mission with no
// row there still gets a panel, from its own title and line().
// The checklist opens for a few seconds whenever the mission or a step changes, then shrinks to one line so it does not sit
// on the scenery; T or a click on it pins it open or shut. World labels (label() in common.js registers them in s._wl) fade
// while a panel, the radar or a toast is on top of them.

// look: dark glass panels with a thin glowing edge, one type scale, one spacing step (8 px). Graphics cannot blur, so a "glow"
// is the same path drawn wide and faint, then thin and bright (hudGlowPath).
const HUD_BG = 0x07101c, HUD_OFF = 0x16293d, HUD_LINE = 0x3a566e, HUD_DIM = '#5b7a92', HUD_RANGE = { Space: 2400, Surface: 900 }; // radar range, world units
const TAU = Math.PI * 2;
const HT = { tag: 10, label: 11, body: 13, head: 15, num: 22 }; // type scale in px: tags and units, labels, lines of text, panel titles, gauge numbers
const HUD_PART_OFF = '#86a3b8'; // the strip's label of a part you do not own yet
const HUD_GEAR = { armor: 'ARM', rapid: 'RPD', booster: 'BST' };                                       // gear abbreviations on the strip
const HUD_FRAME = { x: 20, y: 148, w: 296 };                                                               // checklist panel (Space, Surface)
const HUDUI = { mode: 'auto', until: 0, base: null }; // checklist: auto (open until the timer runs out) | open | closed; shared by all scenes
const HUD_OPEN_MS = 6000;

// per mission id: the steps, which one is current, and the one-line "next" hint. A step can be a function (live text).
const HUD_MISSIONS = {
  rescue: {
    steps: ['Take the rescue call', 'Find the colonist', 'Escort them to your ship', 'Dock at Halcyon Station'],
    cur: (s, key) => G.mission === 'rescued' ? 3 : (key === 'Surface' && s.col && s.col.state === 'following') ? 2 : 1,
    next: (s, key, cur) => cur === 3 ? 'Dock at Halcyon Station (L)' : cur === 2 ? 'Lead them back to your ship'
      : key === 'Station' ? 'Board your ship in the hangar' : key === 'Space' ? 'Land on Kepler-4b (L)' : 'Walk east to the crashed pod'
  },
  escort: {
    steps: ['Take the escort call', 'Launch with the MULE', 'Escort the MULE to the gate'],
    cur: (s, key) => key === 'Station' ? 1 : 2,
    next: (s, key) => key === 'Station' ? 'Board your ship in the hangar' : key === 'Space' ? (s.mx && s.mx.spin > 0 ? 'Hold the gate: ' + Math.ceil(s.mx.spin / 1000) + ' s' : s.mx && s.mx.covered ? 'Covered: hold her ring to the gate' : 'Get inside the MULE\'s ring') : 'Return to your ship'
  },
  patrol: {
    steps: ['Take the patrol call', 'Launch from the hangar', () => 'Wanted pirates down  ' + G.missionProgress + '/' + (missionDef().count || 5)],
    cur: (s, key) => key === 'Station' ? 1 : 2,
    next: (s, key) => key === 'Station' ? 'Board your ship in the hangar' : key === 'Space' ? 'Hunt the amber-ringed pirates' : 'Return to your ship'
  },
  bounty: {
    steps: ['Take the bounty call', 'Launch from the hangar', () => 'Reaver hull  ' + Math.round(100 * Math.max(0, REAVER_HP - G.missionProgress) / REAVER_HP) + '%'],
    cur: (s, key) => key === 'Station' ? 1 : 2,
    next: (s, key) => key === 'Station' ? 'Board your ship in the hangar' : key === 'Space' ? (G.system === 'roost' ? 'Hunt it south-west of Reaver\'s Rock; break off when it flashes' : 'Jump to Reaver\'s Roost (G for the map)') : 'Return to your ship'
  }
};

// ---- what missions.js can call ----
function hudBlip(s, x, y, color, r) { (s._hb = s._hb || []).push([x, y, color, r || 3]); }
function hudMeter(s, name, frac, color) { s._hm = { name, frac, color }; }

// ---- small helpers ----
function hudFmt(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function hudCss(c) { return '#' + c.toString(16).padStart(6, '0'); }

// text from a pool: made the first time its key is used, updated only when the words or colour change, hidden when a frame skips it
function hudPut(h, key, x, y, str, o) {
  o = o || {};
  const color = o.color || '#9fe9ff';
  let t = h.t[key];
  if (!t) {
    const st = { fontFamily: 'monospace', fontSize: (o.size || 14) + 'px', fontStyle: o.bold ? 'bold' : 'normal', color };
    if (o.stroke) { st.stroke = '#02050c'; st.strokeThickness = 3; }
    if (o.spacing) st.letterSpacing = o.spacing;
    if (o.wrap) st.wordWrap = { width: o.wrap };
    t = h.t[key] = h.s.add.text(0, 0, '', st).setScrollFactor(0).setDepth(101);
    if (o.glow) t.setPadding(HUD_PAD);   // room for the glow, or the texture clips it; the origin below allows for it
    t._hc = color;
  }
  h.seen[key] = true;
  if (t._hc !== color) { t._hc = color; t.setColor(color); }
  if (o.glow && t._hg !== color) { t._hg = color; t.setShadow(0, 0, color, o.glow, false, true); }
  if (t.text !== str) t.setText(str);
  const ox = o.ox == null ? 0 : o.ox, oy = o.oy == null ? 0.5 : o.oy;
  if (o.glow) { // origin measured on the words, not on the padded texture
    const p = HUD_PAD, tw = Math.max(1, t.width - 2 * p), th = Math.max(1, t.height - 2 * p);
    t.setOrigin((p + ox * tw) / t.width, (p + oy * th) / t.height);
  } else t.setOrigin(ox, oy);
  t.setPosition(Math.round(x), Math.round(y)).setAlpha(o.alpha == null ? 1 : o.alpha).setVisible(true);
  return t;
}

const HUD_PAD = 8; // padding round glowing text

// Round shapes as short polylines. Phaser's own arc, strokeCircle and fillCircle step 0.01 rad (628 points for a circle, even
// for a 2 px blip); about 0.1 rad is not visible and costs a tenth. The HUD draws a few hundred of these a frame.
function hudArc(g, cx, cy, r, a0, a1) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.1)), st = (a1 - a0) / n;
  g.beginPath(); g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
  for (let i = 1; i <= n; i++) g.lineTo(cx + Math.cos(a0 + st * i) * r, cy + Math.sin(a0 + st * i) * r);
  g.strokePath();
}
function hudRing(g, cx, cy, r) {
  const n = Math.max(12, Math.min(64, Math.ceil(r * 0.6)));
  g.beginPath(); g.moveTo(cx + r, cy);
  for (let i = 1; i < n; i++) g.lineTo(cx + Math.cos(TAU * i / n) * r, cy + Math.sin(TAU * i / n) * r);
  g.closePath(); g.strokePath();
}
function hudDisc(g, cx, cy, r) {
  const n = Math.max(8, Math.min(48, Math.ceil(r * 1.2))), pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: cx + Math.cos(TAU * i / n) * r, y: cy + Math.sin(TAU * i / n) * r });
  g.fillPoints(pts, true);
}

// the credits coin: halo, rim, gold face, a ring on the face. k scales it (1 is the strip's); lit 0..1 brightens the halo
function hudCoin(g, cx, cy, k, lit) {
  g.fillStyle(GOLD, 0.2 + 0.25 * (lit || 0)); hudDisc(g, cx, cy, 12 * k);
  g.fillStyle(0xb8791a, 1); hudDisc(g, cx, cy, 9 * k);
  g.fillStyle(GOLD, 1); hudDisc(g, cx, cy, 7.5 * k);
  g.lineStyle(1.5, 0xfff1a8, 0.95); hudRing(g, cx, cy, 4.6 * k);
}

// a path stroked three times, wide and faint then thin and bright: the glow Graphics cannot blur. pts: [[x, y], ...]
function hudGlowPath(g, pts, color, a, closed, w) {
  w = w || 1.5;
  [[w * 4.5, 0.07], [w * 2.4, 0.17], [w, 1]].forEach(([lw, k]) => {
    g.lineStyle(lw, color, a * k); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (closed) g.closePath();
    g.strokePath();
  });
}

// a panel of dark glass with two cut corners (top right, bottom left): a glowing edge, an inner line, a sheen along the top
// that fades out, bright brackets on the two square corners, and a dot on each cut. edge is the accent colour.
function hudPanel(g, x, y, w, ht, cut, alpha, edge) {
  edge = edge || CYAN;
  const p = [[x, y], [x + w - cut, y], [x + w, y + cut], [x + w, y + ht], [x + cut, y + ht], [x, y + ht - cut]];
  g.fillStyle(HUD_BG, alpha); g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath(); g.fillPath();
  g.fillGradientStyle(edge, edge, edge, edge, 0.16, 0.16, 0, 0); // the sheen stops short of the top right cut and sits above the bottom left one
  g.fillRect(x + 1, y + 1, w - cut - 2, Math.min(ht * 0.5, 30));
  hudGlowPath(g, p, edge, 0.8, true, 1);
  const i = 4, q = [[x + i, y + i], [x + w - cut - 1, y + i], [x + w - i, y + cut + 1], [x + w - i, y + ht - i], [x + cut + 1, y + ht - i], [x + i, y + ht - cut - 1]];
  g.lineStyle(1, edge, 0.14); g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) g.lineTo(q[k][0], q[k][1]); g.closePath(); g.strokePath();
  const b = Math.min(14, ht / 2 - 2);
  g.lineStyle(2, edge, 1);
  g.beginPath(); g.moveTo(x, y + b); g.lineTo(x, y); g.lineTo(x + b, y); g.strokePath();
  g.beginPath(); g.moveTo(x + w, y + ht - b); g.lineTo(x + w, y + ht); g.lineTo(x + w - b, y + ht); g.strokePath();
  g.fillStyle(edge, 1); g.fillRect(x + w - cut - 1, y - 1, 3, 3); g.fillRect(x - 1, y + ht - cut - 1, 3, 3);
}

// a thin accent bar down the left of a panel, the colour of the state it shows
function hudSpine(g, x, y, ht, color, a) { g.fillStyle(color, a == null ? 0.9 : a); g.fillRect(x + 7, y + 10, 2, ht - 20); }

// a segmented bar: n cells, lit up to frac, each lit cell with a faint halo; the leading cell is the bright one and pulses
// when pulse is set. Used by the cargo hold, the freighter and boss meters, the mission progress.
function hudBar(g, x, y, w, ht, frac, color, n, pulse) {
  frac = Phaser.Math.Clamp(frac, 0, 1);
  const gap = 2, cw = (w - gap * (n - 1)) / n, lit = frac <= 0 ? 0 : Math.max(1, Math.round(frac * n)); // a sliver still lights one cell
  for (let i = 0; i < n; i++) {
    const cx = x + i * (cw + gap), on = i < lit, lead = on && i === lit - 1;
    if (on) {
      g.fillStyle(color, 0.16); g.fillRect(cx - 1.5, y - 1.5, cw + 3, ht + 3);
      g.fillStyle(color, lead && pulse != null ? pulse : 1); g.fillRect(cx, y, cw, ht);
      g.fillStyle(0xffffff, 0.22); g.fillRect(cx, y, cw, Math.max(1, Math.floor(ht / 3)));
    } else { g.fillStyle(HUD_OFF, 1); g.fillRect(cx, y, cw, ht); }
  }
}

function hudTri(g, x, y, a, size, color, alpha) {
  const p = (ang, r) => [x + Math.cos(a + ang) * r, y + Math.sin(a + ang) * r];
  const [x1, y1] = p(0, size), [x2, y2] = p(2.5, size * 0.85), [x3, y3] = p(-2.5, size * 0.85);
  g.fillStyle(color, alpha == null ? 1 : alpha); g.fillTriangle(x1, y1, x2, y2, x3, y3);
}
function hudDiamond(g, x, y, r, color) {
  g.fillStyle(color, 1); g.fillTriangle(x, y - r, x + r, y, x, y + r); g.fillTriangle(x, y - r, x - r, y, x, y + r);
}

// ---- the frame: cut corners in the four screen corners ----
function hudFrame(g, now) {
  const c = (x, y, sx, sy) => hudGlowPath(g, [[x, y + sy * 64], [x, y + sy * 20], [x + sx * 20, y], [x + sx * 64, y]], CYAN, 0.5, false, 1.5);
  c(8, 8, 1, 1); c(W - 8, 8, -1, 1); c(8, H - 8, 1, -1); c(W - 8, H - 8, -1, -1);
  // a second, shorter line inside each corner, and rails with ticks down the sides, like the canopy struts
  const d = (x, y, sx, sy) => { g.lineStyle(1, CYAN, 0.22); g.beginPath(); g.moveTo(x, y + sy * 34); g.lineTo(x, y + sy * 24); g.lineTo(x + sx * 24, y); g.lineTo(x + sx * 34, y); g.strokePath(); };
  d(15, 15, 1, 1); d(W - 15, 15, -1, 1); d(15, H - 15, 1, -1); d(W - 15, H - 15, -1, -1);
  g.lineStyle(1, CYAN, 0.12);
  g.lineBetween(8, 150, 8, H - 150); g.lineBetween(W - 8, 270, W - 8, H - 150);
  for (let y = 160; y < H - 150; y += 24) { g.lineBetween(8, y, y % 72 === 40 ? 16 : 12, y); if (y > 270) g.lineBetween(W - 8, y, y % 72 === 40 ? W - 16 : W - 12, y); }
  g.fillStyle(AMBER, 0.75);
  g.fillRect(6, 62, 4, 10); g.fillRect(W - 10, 62, 4, 10); g.fillRect(6, H - 72, 4, 10); g.fillRect(W - 10, H - 72, 4, 10);
}

// the shield, a ring just outside the hull gauge: lit for the points left, white for a moment after a hit, a red beat when it is down. sh is s.sh (space.js)
function hudShield(h, sh, cx, cy, r, now) {
  const g = h.g, a0 = Math.PI * 0.75, span = Math.PI * 1.5, frac = Phaser.Math.Clamp(sh.pts / sh.max, 0, 1), hit = Math.max(0, 1 - (now - sh.hitAt) / 260);
  const down = sh.pts <= 0, beat = down ? 0.35 + 0.35 * Math.sin(now / 140) : 1;
  g.lineStyle(3, down ? RED : HUD_OFF, down ? 0.6 * beat : 1); hudArc(g, cx, cy, r, a0, a0 + span);
  if (frac > 0.01) {
    g.lineStyle(8, 0x7fe9ff, 0.12 + 0.2 * hit); hudArc(g, cx, cy, r, a0, a0 + span * frac);
    g.lineStyle(3, hit > 0 ? 0xffffff : 0x7fe9ff, 1); hudArc(g, cx, cy, r, a0, a0 + span * frac);
  }
}

// ---- a 270 degree gauge of 30 segments; tick (0..1) marks a threshold on the scale ----
// A round plate with a glowing bezel and ten ticks, the segments with a halo under the lit ones and a bright leading cell,
// a scanner arc that circles the bezel, the number with a glow, and the label. warn turns the bezel red and makes it beat.
function hudGauge(h, id, cx, cy, r, frac, color, big, small, tick, warn) {
  const g = h.g, now = h.now, a0 = Math.PI * 0.75, span = Math.PI * 1.5, n = 30, R = r + 12;
  frac = Phaser.Math.Clamp(frac, 0, 1);
  const rim = warn ? RED : CYAN, beat = warn ? 0.55 + 0.45 * Math.sin(now / 130) : 1;
  g.fillStyle(HUD_BG, 0.78); hudDisc(g, cx, cy, R);
  g.fillStyle(color, 0.06); hudDisc(g, cx, cy, r - 8);                       // a faint glow of the state colour on the glass
  [[6.5, 0.07], [3.5, 0.17], [1.5, 0.8]].forEach(([lw, k]) => { g.lineStyle(lw, rim, k * beat); hudRing(g, cx, cy, R); });
  g.lineStyle(1, rim, 0.18); hudRing(g, cx, cy, r - 7);
  for (let i = 0; i <= 10; i++) {                                              // ticks outside the segments: long at 0, half and full
    const a = a0 + span * i / 10, long = i % 5 === 0, r0 = r + 5, r1 = r + (long ? 10 : 8);
    g.lineStyle(long ? 2 : 1, rim, long ? 0.85 : 0.4);
    g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  if (frac > 0.02) { g.lineStyle(12, color, 0.13); hudArc(g, cx, cy, r, a0, a0 + span * frac); }
  const lead = Math.min(n - 1, Math.max(0, Math.ceil(frac * n - 0.5) - 1));
  for (let i = 0; i < n; i++) {
    const lit = (i + 0.5) / n <= frac || (i === 0 && frac > 0.01);
    g.lineStyle(7, lit ? color : HUD_OFF, 1);
    hudArc(g, cx, cy, r, a0 + span * (i + 0.14) / n, a0 + span * (i + 0.86) / n);
    if (lit && i === lead) { g.lineStyle(3, 0xffffff, 0.45 + 0.4 * Math.sin(now / 160)); hudArc(g, cx, cy, r, a0 + span * (i + 0.14) / n, a0 + span * (i + 0.86) / n); }
  }
  if (tick != null) {
    const a = a0 + span * tick;
    g.lineStyle(2, GREEN, 1); g.lineBetween(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7), cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
    g.fillStyle(GREEN, 1); hudDisc(g, cx + Math.cos(a) * (r + 13), cy + Math.sin(a) * (r + 13), 1.8);
  }
  const sa = now / 1100 + cx;                                                  // the scanner: a short bright arc on the bezel, once round in seven seconds
  g.lineStyle(2, rim, 0.5 * beat); hudArc(g, cx, cy, R, sa, sa + 0.35);
  hudPut(h, id + 'n', cx, cy - 2, big, { size: HT.num, bold: true, color: hudCss(color), ox: 0.5, glow: 9 });
  hudPut(h, id + 'l', cx, cy + 27, small, { size: small.length > 6 ? 9 : HT.tag, color: warn ? '#ff4d6d' : HUD_DIM, ox: 0.5, spacing: 1 });
}

// ---- Space: the boost energy ring inside the speed gauge, and the dash dial beside it (state from boost.js) ----
function hudEnergy(h, s, now) {
  const g = h.g, cx = 186, cy = 80, r = 30, a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  const f = Phaser.Math.Clamp(s.en / s.enMax, 0, 1), low = s.boostLocked || f < 0.25;
  g.lineStyle(3, HUD_OFF, 1); hudArc(g, cx, cy, r, a0, a0 + span);
  if (f > 0.01) {
    const col = low ? AMBER : 0xe6f7ff, pulse = s.boostLocked ? 0.55 + 0.45 * Math.sin(now / 90) : 1;
    g.lineStyle(7, col, 0.14 * pulse); hudArc(g, cx, cy, r, a0, a0 + span * f); // halo
    g.lineStyle(3, col, pulse); hudArc(g, cx, cy, r, a0, a0 + span * f);
  }
  // a hot flare at the end of the ring while the boost is burning
  if (s.boosting && f > 0.02) { const a = a0 + span * f; g.fillStyle(0xffffff, 0.8); hudDisc(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.6); }
  // dash dial: fills as the cooldown runs, green and ringing when ready; a ring flies out the moment it is ready again
  const px = 268, py = 80, rd = 12, ready = now >= s.dashReady, prog = ready ? 1 : 1 - (s.dashReady - now) / s.dashCool;
  if (ready && h.dashWas === false) h.dashPing = now;
  h.dashWas = ready;
  g.fillStyle(HUD_BG, 0.78); hudDisc(g, px, py, rd + 8);
  [[6, 0.07], [3, 0.17], [1.3, 0.8]].forEach(([lw, k]) => { g.lineStyle(lw, ready ? GREEN : CYAN, k); hudRing(g, px, py, rd + 8); });
  g.lineStyle(4, HUD_OFF, 1); hudRing(g, px, py, rd);
  if (prog > 0.01) {
    g.lineStyle(8, ready ? GREEN : AMBER, 0.14); hudArc(g, px, py, rd, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
    g.lineStyle(4, ready ? GREEN : AMBER, 1); hudArc(g, px, py, rd, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
  }
  const ping = h.dashPing != null ? (now - h.dashPing) / 450 : 1;
  if (ping < 1) { g.lineStyle(2, GREEN, 0.8 * (1 - ping)); hudRing(g, px, py, rd + 8 + 12 * ping); }
  hudPut(h, 'dk', px, py + 1, 'Q E', { size: 9, bold: true, color: ready ? '#6dff9c' : HUD_DIM, ox: 0.5 });
  hudPut(h, 'dl', px, py + 29, 'DASH', { size: 9, color: HUD_DIM, ox: 0.5, spacing: 1 });
}

// ---- credits and gear strip, top centre ----
function hudStrip(h, now) {
  const g = h.g;
  // credits: a coin, the label CR and the figure in gold. The figure counts to the real value; a gain or a loss lights the strip
  // (gold or red, also set at once by enemies.js bountyPay in h.pulse) and floats +N or -N beside the figure
  if (G.credits !== h.cr) {
    const d = G.credits - h.cr;
    h.flash = now + 700; h.gain = { v: d, t: now }; h.cr = G.credits;
    h.pulse = now + 650; h.pulseCol = d > 0 ? GOLD : RED;
  }
  if (h.crShow == null) h.crShow = G.credits;
  h.crShow += (G.credits - h.crShow) * 0.14; if (Math.abs(G.credits - h.crShow) < 1) h.crShow = G.credits;
  const CRW = 408; // the money strip: 400 wide until the sixth part (the autotarget) needed 8 more; the ORE panel starts at 856
  hudPanel(g, 440, 10, CRW, 30, 8, 0.78, GOLD); // a gold edge: this is the one strip that is money
  const pulse = h.pulse > now ? (h.pulse - now) / 650 : 0, pc = h.pulseCol || GOLD;
  if (pulse > 0) { g.fillStyle(pc, 0.16 * pulse); g.fillRect(442, 12, CRW - 12, 26); g.lineStyle(2, pc, 0.9 * pulse); g.strokeRect(440, 10, CRW, 30); }
  hudSpine(g, 440, 10, 30, GOLD, 0.8);
  hudCoin(g, 463, 25, 1, pulse);
  hudPut(h, 'crl', 480, 25, 'CR', { size: 12, bold: true, color: GOLD_S, spacing: 1 });
  const loss = h.gain && h.gain.v < 0;
  const cv = hudPut(h, 'crv', 503, 25, hudFmt(h.crShow), { size: 21, bold: true, color: now < h.flash ? (loss ? '#ff4d6d' : '#ffffff') : GOLD_S, glow: 8 });
  const gain = h.gain && now - h.gain.t < 1300 ? h.gain : null;
  hudPut(h, 'crd', 503 + cv.width - 2 * HUD_PAD + 8, 25 - 8 * Math.min(1, (gain ? now - gain.t : 0) / 400), gain ? (gain.v > 0 ? '+' : '-') + hudFmt(Math.abs(gain.v)) : '',
    { size: 14, bold: true, color: gain && gain.v < 0 ? '#ff4d6d' : '#6dff9c', alpha: gain ? 1 - Math.pow((now - gain.t) / 1300, 2) : 0 });
  g.lineStyle(1, CYAN, 0.2); g.lineBetween(596, 17, 596, 33);
  PART_ORDER.forEach((slot, i) => { // the six parts: three letters and three chips each (src/data_parts.js); the autotarget's is red while it is switched off (R)
    const gx = 600 + i * 40, tier = partTier(slot), aimOff = slot === 'aim' && tier && G.aimOff;
    hudPut(h, 'up' + i, gx, 25, PARTS[slot].short, { size: HT.tag, bold: true, color: aimOff ? '#ff4d6d' : tier ? '#9fe9ff' : HUD_PART_OFF, spacing: 0 }); // bold, and a part you do not own is a readable grey-blue, not the dimmest tag colour (docs/CRITIC.md run 1, findings 7 and 20)
    for (let j = 0; j < 3; j++) { // a pip is a small slanted chip: lit ones have a halo
      const x = gx + 19 + j * 7, p = [[x + 2, 21], [x + 6, 21], [x + 4, 30], [x, 30]];
      if (tier > j) {
        g.fillStyle(CYAN, 0.2); g.fillRect(x - 1, 19, 9, 13);
        g.fillStyle(CYAN, 1); g.beginPath(); g.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.fillPath();
      } else { g.fillStyle(HUD_LINE, 0.6); g.beginPath(); g.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.fillPath(); } // an empty slot is a dim solid chip: the 1 px outline it used to be drew as hollow boxes in some frames and as dots in others, and read as missing letters
    }
  });
  // cargo hold: ten cells, amber as they fill, red and beating when it is full (asteroids.js)
  const cap = holdCap(), ore = G.ore | 0, full = ore >= cap;
  hudPanel(g, 856, 10, 134, 30, 8, 0.78, full ? RED : CYAN);
  hudPut(h, 'orl', 872, 25, 'ORE', { size: HT.label, color: full ? '#ff4d6d' : HUD_DIM, spacing: 2 });
  hudBar(g, 902, 19, 78, 12, ore / cap, full ? RED : AMBER, Math.min(cap, 24), full ? 0.55 + 0.45 * Math.sin(now / 120) : null); // one cell an ore, up to 24
  hudFuel(h, now);
}

// fuel chip, left of the credits: a segmented bar for the tank; amber under a quarter, red and beating under a tenth (src/fuel.js)
function hudFuel(h, now) {
  const g = h.g, f = fuelFrac(), st = fuelState(), crit = st === 'crit', low = st !== 'ok', col = crit ? RED : low ? AMBER : CYAN;
  hudPanel(g, 296, 10, 134, 30, 8, 0.78, col);
  hudPut(h, 'fuell', 312, 25, 'FUEL', { size: HT.label, color: crit ? '#ff4d6d' : low ? '#ffd37a' : HUD_DIM, spacing: 2 });
  hudBar(g, 346, 19, 74, 12, f, col, 10, crit ? 0.55 + 0.45 * Math.sin(now / 120) : null);
  // the warning (SFX.fuelLow): once when the tank falls into amber or red, and again every 20 s while it stays red; only in flight
  if (h.s && h.s.scene.key === 'Space') {
    const rank = crit ? 2 : low ? 1 : 0;
    if (rank > (h.fuelRank || 0) || (crit && now - (h.fuelAt || 0) > 20000)) { h.fuelAt = now; sfx('fuelLow'); }
    h.fuelRank = rank;
  }
}

// ---- the mission as the checklist wants it ----
function hudMission(s, key) {
  const m = missionDef(), st = G.mission;
  if (!m || st === 'none') return { kind: 'none', head: 'NO ACTIVE MISSION', next: 'Take a call at the MISSIONS terminal' };
  if (st === 'failed') return { kind: 'failed', head: 'MISSION FAILED', next: m.line('failed') };
  const row = HUD_MISSIONS[m.id];
  if (!row) return { kind: 'active', head: m.title, sub: m.where, reward: callReward(m), next: m.line(st) };
  const at = row.cur(s, key), cur = Math.min(at, row.steps.length - 1); // a content file may list fewer steps than the code counts
  return {
    kind: 'active', head: m.title, sub: m.where, reward: callReward(m), cur, next: row.next(s, key, at),
    steps: row.steps.map((t, i) => ({ text: typeof t === 'function' ? t() : t, state: i < cur ? 'done' : i === cur ? 'cur' : 'todo' }))
  };
}

// a small key cap
function hudKeycap(h, id, x, y, str) {
  h.g.lineStyle(1, 0x5b7a92, 1); h.g.strokeRoundedRect(x - 8, y - 8, 16, 16, 3);
  hudPut(h, id, x, y + 1, str, { size: 11, bold: true, color: '#9fe9ff', ox: 0.5 });
}

// a labelled bar: the freighter's hull, say
function hudMeterRow(h, x, y, w, meter) {
  const g = h.g, f = Phaser.Math.Clamp(meter.frac, 0, 1), low = f < 0.3;
  hudPut(h, 'tm', x, y, meter.name, { size: HT.label, color: HUD_DIM, spacing: 2 });
  const bx = x + 86, bw = w - 86;
  hudBar(g, bx, y - 5, bw, 10, f, meter.color, 20, low ? 0.5 + 0.5 * Math.sin(h.now / 110) : null); // the last cell beats when it is nearly gone
}

// ---- Space and Surface: the checklist panel under the gauges; returns its height ----
function hudTracker(h, m, meter, now, open) {
  const g = h.g, P = HUD_FRAME, px = P.x, py = P.y, steps = m.steps || [], bad = m.kind === 'failed', edge = bad ? RED : CYAN;
  if (!open) { // slim: the step you are on, and the key that opens it
    const cur = m.steps ? m.steps[m.cur].text : m.head, txt = cur.length > 29 ? cur.slice(0, 28) + '…' : cur;
    hudPanel(g, px, py, P.w, 30, 8, 0.78, edge);
    hudSpine(g, px, py, 30, bad ? RED : AMBER, 0.85);
    if (m.steps) { g.lineStyle(2, AMBER, 1); g.strokeRect(px + 20, py + 9, 12, 12); g.fillStyle(AMBER, 0.55 + 0.45 * Math.sin(now / 260)); g.fillRect(px + 23, py + 12, 6, 6); }
    else hudDiamond(g, px + 26, py + 15, 5, bad ? RED : CYAN);
    hudPut(h, 'tc', px + 44, py + 16, txt, { size: 12, color: bad ? '#ff4d6d' : m.kind === 'none' ? '#9fe9ff' : '#ffd37a' });
    hudKeycap(h, 'tk', px + P.w - 24, py + 15, 'T');
    if (meter) { hudPanel(g, px, py + 34, P.w, 22, 6, 0.78, AMBER); hudMeterRow(h, px + 14, py + 45, P.w - 28, meter); return meter ? 56 : 30; }
    return 30;
  }
  const nextLines = Math.max(1, Math.ceil(m.next.length * 7.3 / (P.w - 34)));
  const nextY = py + (m.steps ? 70 + steps.length * 22 + 4 : 56);
  const ht = (nextY - py) + nextLines * 15 + 10 + (meter ? 24 : 0);
  hudPanel(g, px, py, P.w, ht, 10, 0.78, edge);
  hudSpine(g, px, py, ht, bad ? RED : AMBER, 0.85);
  hudPut(h, 'tl', px + 20, py + 14, 'MISSION', { size: HT.label, color: HUD_DIM, spacing: 3 });
  hudPut(h, 'tk', px + 98, py + 14, 'T  hide', { size: HT.tag, color: HUD_DIM });
  if (m.reward) hudPut(h, 'tr', px + P.w - 14, py + 14, '+' + m.reward + ' cr', { size: 12, bold: true, color: '#ffb454', ox: 1, glow: 6 });
  hudPut(h, 'th', px + 20, py + 36, m.head, { size: HT.head, bold: true, color: bad ? '#ff4d6d' : m.kind === 'none' ? '#9fe9ff' : '#ffd37a', glow: 6 });
  if (m.sub) hudPut(h, 'tsub', px + P.w - 14, py + 37, m.sub, { size: HT.label, color: HUD_DIM, ox: 1 });
  if (m.steps) { // progress: one cell a step, the steps done so far lit green and the one you are on beating amber
    const n = steps.length, gap = 3, cw = (P.w - 34 - gap * (n - 1)) / n;
    steps.forEach((st, i) => {
      const x = px + 20 + i * (cw + gap), col = st.state === 'done' ? GREEN : st.state === 'cur' ? AMBER : HUD_OFF;
      if (st.state !== 'todo') { g.fillStyle(col, 0.16); g.fillRect(x - 1, py + 50, cw + 2, 7); }
      g.fillStyle(col, st.state === 'cur' ? 0.6 + 0.4 * Math.sin(now / 260) : 1); g.fillRect(x, py + 51, cw, 4);
    });
  }
  steps.forEach((st, i) => {
    const y = py + 74 + i * 22, bx = px + 20;
    if (i > 0) { g.lineStyle(1, st.state === 'todo' ? HUD_LINE : GREEN, st.state === 'todo' ? 0.7 : 0.55); g.lineBetween(bx + 6, y - 16, bx + 6, y - 7); } // the thread between steps
    if (st.state === 'done') {
      g.fillStyle(GREEN, 0.2); g.fillRect(bx - 2, y - 8, 16, 16);
      g.fillStyle(GREEN, 0.95); g.fillRect(bx, y - 6, 12, 12);
      g.lineStyle(2, HUD_BG, 1); g.beginPath(); g.moveTo(bx + 3, y); g.lineTo(bx + 5.5, y + 3); g.lineTo(bx + 9.5, y - 3); g.strokePath();
    } else if (st.state === 'cur') {
      const k = 0.55 + 0.45 * Math.sin(now / 260);
      g.fillStyle(AMBER, 0.12 + 0.12 * k); g.fillRect(bx - 4, y - 10, P.w - 30, 20); // the row you are on has a warm wash
      g.lineStyle(2, AMBER, 1); g.strokeRect(bx, y - 6, 12, 12);
      g.fillStyle(AMBER, k); g.fillRect(bx + 3, y - 3, 6, 6);
      const sl = (now / 1400) % 1, sx = bx + 24 + sl * (P.w - 70); // a bright dash runs along the foot of the row
      g.lineStyle(1, AMBER, 0.7 * Math.sin(sl * Math.PI)); g.lineBetween(sx, y + 9, Math.min(sx + 36, px + P.w - 14), y + 9);
    } else {
      g.lineStyle(1, HUD_LINE, 1); g.strokeRect(bx + 0.5, y - 5.5, 11, 11);
    }
    hudPut(h, 'ts' + i, bx + 24, y, st.text, { size: HT.body, color: st.state === 'done' ? '#58b57d' : st.state === 'cur' ? '#ffd37a' : HUD_DIM });
  });
  hudPut(h, 'tn', px + 20, nextY, m.next, { size: 12, color: bad ? '#ff9aa9' : '#9fe9ff', oy: 0, wrap: P.w - 34 });
  if (meter) hudMeterRow(h, px + 14, py + ht - 17, P.w - 28, meter);
  return ht;
}

// the checklist is a button: a click (or T) opens or shuts it; the click's shot is held back so opening it does not fire the guns
function hudToggle(h, s, byClick) {
  HUDUI.mode = h.open ? 'closed' : 'open';
  if (byClick) s.nextFire = Math.max(s.nextFire || 0, s.time.now + 300);
}
function hudHit(h, s, x, y, w, ht) {
  if (!h.hit || !h.hit.active) {
    h.hit = s.add.zone(x, y, w, ht).setOrigin(0).setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
    h.hit.on('pointerdown', () => hudToggle(h, s, true));
  }
  h.hit.setPosition(x, y);
  if (h.hit.width !== w || h.hit.height !== ht) h.hit.setSize(w, ht);
}

// ---- Station: one line under the strip (the checklist would sit on the terminals) ----
function hudCompact(h, m) {
  const g = h.g, bad = m.kind === 'failed';
  hudPanel(g, 420, 46, 440, 28, 8, 0.78, bad ? RED : CYAN);
  const tag = m.kind === 'active' && m.steps ? 'STEP ' + m.cur + '/' + (m.steps.length - 1) : bad ? 'FAILED' : 'MISSION';
  hudPut(h, 'cl', 436, 61, tag, { size: 11, color: HUD_DIM, spacing: 2 });
  hudDiamond(g, 505, 60, 4, bad ? RED : AMBER);
  hudPut(h, 'cn', 518, 61, m.next, { size: 13, color: bad ? '#ff9aa9' : '#ffd37a' });
  h.zones.push({ x0: 410, y0: 0, x1: 870, y1: 82 });
}

// ---- radar: rings, sweep, landmarks and what is near; it sits top right ----
function hudRadar(h, s, key, obj, now) {
  const g = h.g, R = 84, cx = W - 110, cy = 112, range = HUD_RANGE[key], sc = R / range;
  const me = key === 'Space' ? s.ship : s.player, ox = me.x, oy = me.y;
  // what is hostile and how close: the rim and the line under the radar turn red once something is near enough to attack
  const foes = key === 'Space' ? s.enemies.getChildren() : s.crawlers.getChildren(), engage = key === 'Space' ? 900 : 380, unit = key === 'Space' ? 'km' : 'm';
  let n = 0, near = Infinity;
  foes.forEach(e => { if (!e.active) return; const d = Math.hypot(e.x - ox, e.y - oy); if (d <= range) { n++; if (d < near) near = d; } });
  const hot = near < engage, rim = hot ? RED : CYAN, beat = hot ? 0.6 + 0.4 * Math.sin(now / 120) : 1;
  h.near = near; h.engage = engage; // hudWarn reads these
  // the plate, the rings (dashed), the cross hairs, and a bezel with a tick every 15 degrees and a marker at north
  g.fillStyle(HUD_BG, 0.8); hudDisc(g, cx, cy, R + 4);
  g.fillStyle(rim, 0.05); hudDisc(g, cx, cy, R);
  [[6.5, 0.07], [3.5, 0.17], [1.5, 0.85]].forEach(([lw, k]) => { g.lineStyle(lw, rim, k * beat); hudRing(g, cx, cy, R + 4); });
  [R / 3, R * 2 / 3].forEach(rr => { g.lineStyle(1, CYAN, 0.28); for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14; hudArc(g, cx, cy, rr, a, a + 0.1); } });
  g.lineStyle(1, CYAN, 0.14); g.lineBetween(cx - R, cy, cx + R, cy); g.lineBetween(cx, cy - R, cx, cy + R);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12, q = i % 6 === 0, r0 = R - (q ? 9 : 5);
    g.lineStyle(q ? 2 : 1, rim, q ? 0.9 : 0.4); g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  g.fillStyle(AMBER, 1); g.fillTriangle(cx, cy - R - 9, cx - 4, cy - R - 2, cx + 4, cy - R - 2);
  // the sweep: a wedge that fades behind a bright leading line; a ping ring leaves the centre every three seconds
  const sw = (now / 1500) % (Math.PI * 2);
  for (let i = 0; i < 18; i++) {
    const a0 = sw - (i + 1) * 0.06, a1 = sw - i * 0.06;
    g.fillStyle(rim, 0.24 * Math.pow(1 - i / 18, 1.6));
    g.fillTriangle(cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
  }
  g.lineStyle(2, rim, 0.85); g.lineBetween(cx, cy, cx + Math.cos(sw) * R, cy + Math.sin(sw) * R);
  const pg = (now % 3000) / 1500;
  if (pg < 1) { g.lineStyle(1, CYAN, 0.35 * (1 - pg)); hudRing(g, cx, cy, R * pg); }
  hudPut(h, 'rt', cx, cy + R + 32, n ? n + ' HOSTILE  ' + Math.round(near * 0.1) + ' ' + unit : 'CLEAR',
    { size: HT.label, bold: hot, color: hot ? '#ff4d6d' : n ? '#ffb454' : '#58b57d', ox: 0.5, spacing: 1, alpha: hot ? 0.7 + 0.3 * Math.sin(now / 120) : 1 });
  hudPut(h, 'rl', cx, cy + R + 16, 'RADAR  ' + (key === 'Space' ? (range / 10) + ' km' : (range / 10) + ' m'), { size: HT.label, color: HUD_DIM, ox: 0.5, spacing: 1 });

  const pt = (wx, wy, keep) => { // world point -> radar point; off the radar it is clamped to the rim when keep, else null
    let dx = (wx - ox) * sc, dy = (wy - oy) * sc;
    const d = Math.hypot(dx, dy), out = d > R - 4;
    if (out) { if (!keep) return null; dx *= (R - 4) / d; dy *= (R - 4) / d; }
    return { x: cx + dx, y: cy + dy, out, a: Math.atan2(dy, dx) };
  };
  const mark = (p, color, draw) => { if (p.out) hudTri(g, p.x, p.y, p.a, 5, color); else draw(p); };
  // a blip is brightest just after the sweep passes it and settles back to half; each has a halo
  const dot = (wx, wy, color, r) => {
    const p = pt(wx, wy, false); if (!p) return;
    const age = (((sw - p.a) % TAU) + TAU) % TAU / TAU, k = 0.55 + 0.45 * Math.pow(1 - age, 2);
    g.fillStyle(color, 0.22 * k); hudDisc(g, p.x, p.y, r * 2.4);
    g.fillStyle(color, k); hudDisc(g, p.x, p.y, r);
  };

  if (key === 'Space') {
    if (!s.station.nowhere) mark(pt(s.station.x, s.station.y, true), CYAN, p => hudDiamond(g, p.x, p.y, 5, CYAN));
    if (!s.planet.nowhere) mark(pt(s.planet.x, s.planet.y, true), AMBER, p => { g.fillStyle(AMBER, 1); hudDisc(g, p.x, p.y, 5); });
    s.enemies.getChildren().forEach(d => { if (d.active) dot(d.x, d.y, d.wanted ? AMBER : (d.def && d.def.radar) || RED, d.wanted ? 3 : d.def && d.def.key === 'gunship' ? 3 : 2.2); });
  } else {
    mark(pt(s.pad.x, s.pad.y, true), AMBER, p => hudDiamond(g, p.x, p.y, 5, AMBER));
    mark(pt(s.pod.x, s.pod.y, true), 0x8b95a1, p => { g.fillStyle(0x8b95a1, 1); g.fillRect(p.x - 3, p.y - 3, 6, 6); });
    s.crawlers.getChildren().forEach(c => { if (c.active) dot(c.x, c.y, RED, 2.2); });
    if (s.col && s.col.state !== 'dead' && s.col.s.active) dot(s.col.s.x, s.col.s.y, GREEN, 3);
  }
  (s._hb || []).forEach(b => dot(b[0], b[1], b[2], b[3]));
  if (obj) { // ring the objective; off the radar it is the arrow on the rim
    const p = pt(obj.x, obj.y, true);
    g.lineStyle(2, AMBER, 0.6 + 0.4 * Math.sin(now / 200));
    if (p.out) hudTri(g, p.x, p.y, p.a, 7, AMBER, 0.9); else hudRing(g, p.x, p.y, 8 + Math.sin(now / 200));
  }
  if (h.lock && h.lock.active) { // the locked target: four brackets round its blip (src/hud.js hudLock)
    const p = pt(h.lock.x, h.lock.y, false);
    if (p) {
      const k = 7 + 1.2 * Math.sin(now / 130), c = 3.5;
      g.lineStyle(1.5, h.lockColor, 1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([ax, ay]) => {
        g.beginPath(); g.moveTo(p.x + ax * k, p.y + ay * (k - c)); g.lineTo(p.x + ax * k, p.y + ay * k); g.lineTo(p.x + ax * (k - c), p.y + ay * k); g.strokePath();
      });
    }
  }
  g.lineStyle(1, 0xffffff, 0.45); g.lineBetween(cx, cy, cx + Math.cos(me.rotation) * R * 0.3, cy + Math.sin(me.rotation) * R * 0.3); // where you are pointing
  tri(g, cx, cy, me.rotation, 5, 0xffffff);
}

// ---- Space: the lock. The nearest hostile on screen is the target; it keeps the lock until it is gone, leaves the screen or
// another one is clearly closer (so it does not flicker between two at the same distance). Brackets close in on it, then a
// ring turns round it; a tag gives its type, range and hull. Other hostiles in view get four small ticks. ----
const HUD_LOCK_RANGE = 1500;
function hudLock(h, s, now) {
  const me = s.ship;
  const on = e => { const p = camzoomScreen(s, e.x, e.y), x = p.x, y = p.y; return x > 24 && x < W - 24 && y > 56 && y < H - 150; };
  let best = null, bd = Infinity, cur = h.lock && h.lock.active && on(h.lock) ? h.lock : null;
  h.view = [];
  s.enemies.getChildren().forEach(e => {
    if (!e.active || !on(e)) return;
    const d = Math.hypot(e.x - me.x, e.y - me.y);
    if (d > HUD_LOCK_RANGE) return;
    h.view.push(e);
    if (d < bd) { bd = d; best = e; }
  });
  if (cur && Math.hypot(cur.x - me.x, cur.y - me.y) > HUD_LOCK_RANGE) cur = null;
  let next = cur || best;
  if (cur && best && best !== cur && bd < 0.7 * Math.hypot(cur.x - me.x, cur.y - me.y)) next = best;
  if (next !== h.lock) h.lockSince = now; // a new target: the brackets close in again
  h.lock = next;
  if (next) h.lockColor = next.wanted ? AMBER : next.def && next.def.boss ? 0xff2a4a : RED;
}

function hudBrackets(g, x, y, half, k, color, a, w) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([ax, ay]) => {
    const bx = x + ax * half, by = y + ay * half;
    g.lineStyle(w * 3, color, a * 0.14); g.beginPath(); g.moveTo(bx, by - ay * k); g.lineTo(bx, by); g.lineTo(bx - ax * k, by); g.strokePath();
    g.lineStyle(w, color, a); g.beginPath(); g.moveTo(bx, by - ay * k); g.lineTo(bx, by); g.lineTo(bx - ax * k, by); g.strokePath();
  });
}

function hudTargets(h, s, now) {
  const g = h.g, me = s.ship, lock = h.lock;
  (h.view || []).forEach(e => { // the ones in view that are not the target: four small ticks
    if (e === lock) return;
    const p = camzoomScreen(s, e.x, e.y), x = p.x, y = p.y, half = Math.max(e.displayWidth, e.displayHeight) / 2 * camzoomZ(s) + 8; // src/camzoom.js: where it is on the screen at this zoom
    hudBrackets(g, x, y, half, 4, e.wanted ? AMBER : RED, 0.4, 1);
  });
  if (!lock) return; // its tag texts are not used this frame, so hudTick hides them
  const lp = camzoomScreen(s, lock.x, lock.y), x = lp.x, y = lp.y, c = h.lockColor, t = Phaser.Math.Clamp((now - h.lockSince) / 380, 0, 1);
  const half = Math.max(22, Math.max(lock.displayWidth, lock.displayHeight) / 2 * camzoomZ(s) + 12), open = Math.pow(1 - t, 2) * 70;
  hudBrackets(g, x, y, half + open, 10 + 6 * (1 - t), c, 0.45 + 0.55 * t, 2);
  if (t >= 1) { // locked: a dashed ring turns slowly round it
    const r = half + 7, spin = now / 900;
    g.lineStyle(1.5, c, 0.55);
    for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 2; hudArc(g, x, y, r, a, a + 0.9); }
    g.fillStyle(c, 0.9); hudDisc(g, x, y, 1.8);
  }
  const d = Math.round(Math.hypot(lock.x - me.x, lock.y - me.y) * 0.1), right = x < W - 230, tx = right ? x + half + 12 : x - half - 12, ox = right ? 0 : 1;
  const name = lock.wanted ? 'WANTED' : lock.def && lock.def.boss ? 'THE REAVER' : ((lock.def && lock.def.key) || 'hostile').toUpperCase();
  hudPut(h, 'lkn', tx, y - half + 2, t < 1 ? 'LOCKING' : name, { size: HT.label, bold: true, color: hudCss(c), ox, spacing: 1, stroke: true, alpha: t < 1 ? 0.6 + 0.4 * Math.sin(now / 50) : 1 });
  hudPut(h, 'lkd', tx, y - half + 17, d + ' km', { size: HT.label, color: '#9fe9ff', ox, stroke: true });
  if (lock.def && lock.def.hp) { // its hull: eight cells
    const bw = 64, bx = right ? tx : tx - bw, by = y - half + 28;
    hudBar(g, bx, by, bw, 5, lock.hp / lock.def.hp, c, 8, null);
  }
}

// ---- Space: the target panel of the flight assist (src/assist.js; card space-game-assist-hud). Under the radar while the assist is on and
// there is a target: its name, the range, how fast you close on it, the order in force, and one key cap per command. The commands come from
// assistState().keys, so a mode another file adds (Orbit, Match speed) gets its key here by itself. ----
// what the panel says, with no drawing in it (tests/hudassist.mjs reads it in plain Node); null when there is nothing to show
function hudAssistModel(s) {
  if (typeof assistState !== 'function' || !s || !s.as || !s.ship) return null;
  const st = assistState(); if (!st.on) return null;
  let name = st.name, dist = st.dist, closing = st.closing;
  if (!st.mode) { // no order yet: the nav target the next order would take, measured as assistState measures its own
    const t = s.cr && s.cr.target; if (!t) return null;
    const tv = (t.body && t.body.velocity) || { x: t.vx || 0, y: t.vy || 0 }, b = s.ship.body.velocity, dx = t.x - s.ship.x, dy = t.y - s.ship.y;
    dist = Math.hypot(dx, dy) || 1e-6; closing = ((b.x - (tv.x || 0)) * dx + (b.y - (tv.y || 0)) * dy) / dist; name = assistName(t);
  }
  const rel = Math.abs(closing) < 3 ? 0 : Math.round(closing); // px/s, the unit of the SPEED gauge
  return {
    name: String(name).toUpperCase().slice(0, 22), km: hudFmt(dist / 10), rel: Math.abs(rel), relLabel: rel > 0 ? 'CLOSING' : rel < 0 ? 'OPENING' : 'STEADY',
    mode: st.mode, order: st.mode ? st.label.toUpperCase() + (st.range ? '  ' + hudFmt(st.range / 10) + ' KM' : '') : 'NO ORDER', status: (st.status || '').toUpperCase(),
    keys: st.keys.filter(k => k.cap)
  };
}
function hudAssist(h, s) {
  const m = hudAssistModel(s);
  if (typeof ASSIST !== 'undefined') ASSIST.readout = !m; // the panel says what the assist's own line says; with no target that line stays
  if (!m) return;
  const g = h.g, w = 248, x = W - w - 20, y = 262, rows = Math.ceil(m.keys.length / 2), ht = 120 + rows * 22, live = !!m.mode;
  hudPanel(g, x, y, w, ht, 12, 0.82, live ? CYAN : HUD_LINE); hudSpine(g, x, y, ht, live ? CYAN : HUD_LINE);
  hudPut(h, 'as0', x + 18, y + 16, 'TARGET', { size: HT.tag, color: HUD_DIM, spacing: 2 });
  hudPut(h, 'as1', x + w - 34, y + 16, 'ASSIST', { size: HT.tag, color: HUD_DIM, spacing: 2, ox: 1 }); hudKeycap(h, 'asz', x + w - 20, y + 16, 'Z');
  hudPut(h, 'as2', x + 18, y + 37, m.name, { size: HT.head, bold: true, color: '#e8f8ff' });
  const cell = (id, cx, label, num, unit, color) => {
    hudPut(h, id + 'l', cx, y + 58, label, { size: HT.tag, color: HUD_DIM, spacing: 2 });
    const t = hudPut(h, id + 'n', cx, y + 77, num, { size: HT.num, bold: true, color });
    if (unit) hudPut(h, id + 'u', cx + t.width + 5, y + 81, unit, { size: HT.tag, color: HUD_DIM });
  };
  cell('asr', x + 18, 'RANGE', m.km, 'KM', '#9fe9ff');
  cell('asc', x + w / 2 + 8, m.relLabel, String(m.rel), '', m.relLabel === 'OPENING' ? '#ffb454' : '#9fe9ff');
  g.lineStyle(1, HUD_LINE, 0.6); g.lineBetween(x + 16, y + 94, x + w - 12, y + 94);
  hudPut(h, 'aso', x + 18, y + 107, m.order, { size: HT.label, bold: live, color: live ? '#9fe9ff' : HUD_DIM, spacing: 1 });
  if (m.status) hudPut(h, 'ass', x + w - 14, y + 107, m.status, { size: HT.label, bold: true, color: m.status === 'BRAKE' || m.status === 'BACK OFF' ? '#ffb454' : '#6dff9c', ox: 1 });
  m.keys.forEach((k, i) => { // one cap per command, two to a row; the order in force is lit
    const cx = x + 26 + (i % 2) * (w / 2 - 14), cy = y + 128 + Math.floor(i / 2) * 22, on = k.id === m.mode;
    if (on) { g.fillStyle(CYAN, 0.28); g.fillRoundedRect(cx - 8, cy - 8, 16, 16, 3); }
    hudKeycap(h, 'ak' + i, cx, cy, k.cap);
    hudPut(h, 'al' + i, cx + 14, cy + 1, k.label, { size: HT.label, bold: on, color: on ? '#e8f8ff' : '#9fe9ff' });
  });
  h.zones.push({ x0: x - 8, y0: y - 6, x1: W, y1: y + ht + 8 });
}

// ---- warnings: banners low in the middle, one per live problem, and a red pulse round the screen edge while the hull is
// critical. Some stay for as long as the problem does (hull, boost, colonist); some are an event and show for a few seconds
// (first contact, hold full). Each banner is a zone, so world labels fade under it. ----
function hudWarn(h, s, now, key, near, engage) {
  const g = h.g, list = [], space = key === 'Space', surf = key === 'Surface';
  const hullF = surf ? s.hp / 100 : G.hull / G.maxHull;
  if ((space || surf) && hullF <= 0.3) list.push({ id: 'hull', text: surf ? 'HEALTH CRITICAL' : 'HULL CRITICAL', sub: Math.max(0, Math.round(hullF * 100)) + '%  BREAK OFF', color: RED, crit: true });
  if (surf && s.col && s.col.state !== 'dead' && s.col.hp / 60 <= 0.3) list.push({ id: 'col', text: 'COLONIST IN DANGER', sub: Math.max(0, Math.round(s.col.hp)) + ' HP', color: AMBER, crit: true });
  if (space && now < (h.interdictUntil || 0)) list.push({ id: 'int', text: 'INTERDICTED', sub: 'PIRATES AHEAD', color: RED, crit: true }); // pulled out of cruise (src/cruise.js)
  if (space && s.boostLocked) list.push({ id: 'bst', text: 'BOOST EMPTY', sub: 'RECHARGING', color: AMBER });
  if (space && s.sh && s.sh.max > 0 && now - s.sh.down < 2500) list.push({ id: 'shd', text: 'SHIELDS DOWN', sub: 'THE HULL TAKES THE HITS', color: AMBER });
  const hot = near < engage; // first contact: a banner for 2.5 s when something comes into attack range
  if (hot && !h.hotWas) h.contact = now + 2500;
  h.hotWas = hot;
  if (now < (h.contact || 0)) list.push({ id: 'hos', text: 'HOSTILE CONTACT', sub: Math.round(near * 0.1) + (space ? ' KM' : ' M'), color: RED });
  const full = space && (G.ore | 0) >= holdCap();
  if (full && !h.fullWas) h.holdFull = now + 3000;
  h.fullWas = full;
  if (now < (h.holdFull || 0)) list.push({ id: 'ore', text: 'CARGO HOLD FULL', sub: 'SELL AT THE STATION', color: AMBER });

  if ((hullF <= 0.3 || now < (h.interdictUntil || 0)) && (space || surf)) { // the edge pulse: four strips that fade inward
    const a = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(now / 240)), d = 110;
    g.fillGradientStyle(RED, RED, RED, RED, a, a, 0, 0); g.fillRect(0, 0, W, d);
    g.fillGradientStyle(RED, RED, RED, RED, 0, 0, a, a); g.fillRect(0, H - d, W, d);
    g.fillGradientStyle(RED, RED, RED, RED, a, 0, a, 0); g.fillRect(0, 0, d, H);
    g.fillGradientStyle(RED, RED, RED, RED, 0, a, 0, a); g.fillRect(W - d, 0, d, H);
  }
  list.slice(0, 3).forEach((w, i) => { // three at most, so the stack never reaches the ship
    const bw = 280, bh = 34, x = W / 2 - bw / 2, y = H - 214 - i * 40, beat = w.crit ? 0.72 + 0.28 * Math.sin(now / 110) : 1;
    hudPanel(g, x, y, bw, bh, 10, 0.88, w.color);
    g.fillStyle(w.color, 0.1 + 0.08 * beat); g.fillRect(x + 12, y + 3, bw - 24, bh - 6);
    for (let k = 0; k < 3; k++) { // chevrons stream in toward the words from both sides
      const ph = ((now / 500) + k / 3) % 1, al = Math.sin(ph * Math.PI) * 0.9, cx = x + 16 + ph * 26, cy = y + bh / 2;
      g.fillStyle(w.color, al); g.fillTriangle(cx, cy - 6, cx + 6, cy, cx, cy + 6);
      g.fillTriangle(x + bw - (cx - x), cy - 6, x + bw - (cx - x) - 6, cy, x + bw - (cx - x), cy + 6);
    }
    hudPut(h, 'w' + i + 't', W / 2, y + 13, w.text, { size: HT.head, bold: true, color: hudCss(w.color), ox: 0.5, spacing: 2, glow: 8, alpha: beat });
    hudPut(h, 'w' + i + 's', W / 2, y + 27, w.sub, { size: HT.tag, color: '#9fe9ff', ox: 0.5, spacing: 2 });
    h.zones.push({ x0: x, y0: y, x1: x + bw, y1: y + bh });
  });
}

// ---- the objective: where to go, and how far ----
function hudObjective(s, key, mission) { // mission: leave out the nav target (the radar arrow stays on the mission)
  if (key === 'Space') {
    const t = (!mission && s.cr && s.cr.target) || missionTarget(s); if (!t) return null; // a system with no station has nothing to point at
    const big = t.name === 'Halcyon Station' || t.name === 'Kepler-4b';
    return { x: t.x, y: t.y, name: t.name.toUpperCase(), from: s.ship, unit: 'km', k: 0.1, hw: big ? 46 : 28, hh: big ? 46 : 28 };
  }
  if (key === 'Surface') {
    const c = s.col, wait = c && c.state === 'waiting', t = wait ? s.pod : s.pad;
    return { x: t.x, y: t.y, name: wait ? 'CRASHED POD' : 'YOUR SHIP', from: s.player, unit: 'm', k: 0.1, hw: 44, hh: 44 };
  }
  const want = G.mission === 'accepted' || G.mission === 'rescued' ? 'ship' : 'missions';
  const sp = s.spots.find(p => p.key === want);
  return sp ? { x: sp.x, y: sp.y, name: want === 'ship' ? 'YOUR SHIP' : 'MISSIONS', from: s.player, unit: 'm', k: 0.1, hw: want === 'ship' ? 70 : 62, hh: want === 'ship' ? 50 : 34, below: want === 'missions' } : null;
}

// where the arrow sits when the target is off screen: on the screen edge, kept out of the corner panels
function hudEdge(h, sx, sy) {
  const cx = W / 2, cy = H / 2, dx = sx === cx && sy === cy ? 1 : sx - cx, dy = sy - cy, L = 44, R = W - 44, T = 44, B = H - 148; // the bottom stays clear of the tips and the prompt
  const tx = dx > 0 ? (R - cx) / dx : dx < 0 ? (L - cx) / dx : Infinity, ty = dy > 0 ? (B - cy) / dy : dy < 0 ? (T - cy) / dy : Infinity;
  const t = Math.min(tx, ty), p = { x: cx + dx * t, y: cy + dy * t };
  p.side = tx <= ty ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'B' : 'T');
  h.zones.forEach(z => {
    const m = 28, up = p.side === 'T' ? 56 : m; // an arrow on the top edge has its words below it
    if (p.x <= z.x0 - m || p.x >= z.x1 + m || p.y <= z.y0 - up || p.y >= z.y1 + m) return;
    if (p.side === 'T') p.x = z.x0 <= 24 ? z.x1 + 28 : z.x1 >= W - 24 ? z.x0 - 28 : (p.x - z.x0 < z.x1 - p.x ? z.x0 - 28 : z.x1 + 28);
    else if (p.side === 'L' || p.side === 'R') p.y = z.y1 + 28;
  });
  return p;
}

function hudMarker(h, s, o, now) {
  const g = h.g, sp = camzoomScreen(s, o.x, o.y), sx = sp.x, sy = sp.y; // src/camzoom.js
  const pulse = 0.7 + 0.3 * Math.sin(now / 260);
  const dist = Math.round(Phaser.Math.Distance.Between(o.from.x, o.from.y, o.x, o.y) * o.k) + ' ' + o.unit;
  const name = { size: 13, bold: true, color: '#ffd37a', stroke: true }, far = { size: 12, color: '#9fe9ff', stroke: true };
  // on screen and clear of the panels: brackets round it, the words above (or below). Hidden behind a panel or in the
  // tips band at the bottom, it gets the edge arrow instead.
  const m = 12, covered = h.zones.some(z => sx > z.x0 - m && sx < z.x1 + m && sy > z.y0 - m && sy < z.y1 + m) || sy > H - 148;
  if (!covered && sx > o.hw + 12 && sx < W - o.hw - 12 && sy > o.hh + 12 && sy < H - o.hh - 12) {
    const k = 12;
    g.lineStyle(3, AMBER, pulse);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([ax, ay]) => {
      const x = sx + ax * o.hw, y = sy + ay * o.hh;
      g.beginPath(); g.moveTo(x, y - ay * k); g.lineTo(x, y); g.lineTo(x - ax * k, y); g.strokePath();
    });
    let y0 = o.below ? sy + o.hh + 14 : sy - o.hh - 24; // a terminal already has its own label above it
    const pz = h.pz, tw = Math.max(o.name.length * 7.8, dist.length * 7.2) / 2 + 6; // the floating key cap prompt (ui.js) owns the space above you
    if (pz && sx + tw > pz.x0 && sx - tw < pz.x1 && y0 + 24 > pz.y0 && y0 - 9 < pz.y1) y0 = o.below ? sy - o.hh - 24 : sy + o.hh + 14;
    hudPut(h, 'on', sx, y0, o.name, Object.assign({ ox: 0.5 }, name));
    hudPut(h, 'od', sx, y0 + 15, dist, Object.assign({ ox: 0.5 }, far));
    return;
  }
  const p = hudEdge(h, sx, sy), a = Math.atan2(sy - H / 2, sx - W / 2);
  hudTri(g, p.x, p.y, a, 14, AMBER, pulse);
  const L = p.side === 'L', R = p.side === 'R', T = p.side === 'T';
  const tx = L ? p.x + 22 : R ? p.x - 22 : p.x, ox = L ? 0 : R ? 1 : 0.5;
  const ny = L || R ? p.y - 8 : T ? p.y + 26 : p.y - 38, dy = L || R ? p.y + 8 : T ? p.y + 42 : p.y - 22;
  hudPut(h, 'on', tx, ny, o.name, Object.assign({ ox }, name));
  hudPut(h, 'od', tx, dy, dist, Object.assign({ ox }, far));
}

// world labels (the ones label() made) fade while a panel, the radar or a toast sits on top of them
function hudFade(h, s) {
  if (!s._wl) return;
  const m = 6;
  s._wl = s._wl.filter(t => t.active);
  s._wl.forEach(t => {
    const kz = camzoomZ(s), w = t.displayWidth * kz / 2, hh = t.displayHeight * kz / 2, p = camzoomScreen(s, t.x, t.y), x = p.x, y = p.y;
    const hit = h.zones.some(z => x + w > z.x0 - m && x - w < z.x1 + m && y + hh > z.y0 - m && y - hh < z.y1 + m);
    t.alpha += ((hit ? 0.1 : 1) - t.alpha) * 0.25;
  });
}

// ---- once per frame ----
function hudTick(s) {
  let h = s._hud;
  if (!h || !h.g.active) h = s._hud = { s, g: s.add.graphics().setScrollFactor(0).setDepth(100), t: {}, seen: {}, zones: [], cr: G.credits, flash: 0, open: true, box: new Phaser.Geom.Rectangle() };
  const g = h.g, key = s.scene.key, now = s.time.now, space = key === 'Space', surf = key === 'Surface';
  g.clear(); h.seen = {}; h.zones = []; h.now = now;
  hudFrame(g, now);

  // gauges, top left: hull (health on foot), then speed in space or the colonist on foot
  const hullFrac = surf ? s.hp / 100 : G.hull / G.maxHull;
  hudGauge(h, 'g1', 70, 80, 40, hullFrac, hullFrac > 0.5 ? CYAN : hullFrac > 0.3 ? AMBER : RED, String(Math.max(0, Math.round(surf ? s.hp : G.hull))), surf ? 'HEALTH' : 'HULL', null, hullFrac <= 0.3);
  if (space && s.sh && s.sh.max > 0) hudShield(h, s.sh, 70, 80, 59, now); // the shield: a thin ring round the hull gauge (the parts, src/data_parts.js)
  if (space) {
    const spd = s.ship.body.speed, top = boostMax();
    if (s.cruising) hudGauge(h, 'g2', 186, 80, 40, Math.min(1, spd / CRUISE.top), CYAN, hudFmt(spd / 10), 'KM/S', null); // cruise: the speed in km/s (src/cruise.js)
    else hudGauge(h, 'g2', 186, 80, 40, spd / top, spd > shipStat('vmax') ? AMBER : CYAN, String(Math.round(spd)), s.boostLocked ? 'NO BOOST' : 'SPEED', 150 / top);
    if (s.enMax) hudEnergy(h, s, now);
  }
  if (surf && s.col && s.col.state !== 'dead') {
    const f = s.col.hp / 60;
    hudGauge(h, 'g2', 186, 80, 40, f, f > 0.3 ? AMBER : RED, String(Math.max(0, Math.round(s.col.hp))), 'COLONIST');
  }
  hudStrip(h, now);

  const m = hudMission(s, key);
  if (key === 'Station') {
    hudCompact(h, m); h.zones.push({ x0: 0, y0: 0, x1: 122, y1: 132 });
  } else {
    // open for a few seconds after the mission changes or a step ticks over, then slim; T or a click pins it
    const base = G.mission + '|' + G.missionId + '|' + m.kind, step = m.cur == null ? -1 : m.cur;
    if (base !== HUDUI.base || (h.step !== undefined && step !== h.step)) {
      HUDUI.base = base; HUDUI.until = now + HUD_OPEN_MS; if (HUDUI.mode === 'closed') HUDUI.mode = 'auto';
    }
    h.step = step;
    if (!h.keyT) h.keyT = s.input.keyboard.addKey('T');
    h.open = HUDUI.mode === 'open' || (HUDUI.mode === 'auto' && now < HUDUI.until);
    if (Phaser.Input.Keyboard.JustDown(h.keyT)) { hudToggle(h, s, false); h.open = HUDUI.mode === 'open'; }
    const ht = hudTracker(h, m, s._hm || null, now, h.open);
    hudHit(h, s, HUD_FRAME.x, HUD_FRAME.y, HUD_FRAME.w, ht);
    h.zones.push({ x0: 0, y0: 0, x1: HUD_FRAME.x + HUD_FRAME.w + 20, y1: HUD_FRAME.y + ht + 12 });
  }

  const obj = hudObjective(s, key);
  if (space) hudLock(h, s, now); // before the radar, which brackets the target's blip too
  if (space || surf) {
    h.zones.push({ x0: W - 230, y0: 0, x1: W, y1: 250 }); hudRadar(h, s, key, space ? hudObjective(s, key, true) : obj, now);
    if (space && s.cruising) { g.fillStyle(HUD_BG, 0.72); hudDisc(g, W - 110, 112, 88); } // cruise: nothing local matters, the radar dims
  }
  if (space) hudTargets(h, s, now);
  if (space) hudAssist(h, s);
  if (space || surf) hudWarn(h, s, now, key, h.near, h.engage);
  h.zones.push({ x0: 430, y0: 0, x1: 850, y1: 50 });
  // toasts (depth 299 and up) are zones too, for as long as they are up
  s.children.list.forEach(o => {
    if (o.depth < 299 || !o.visible || o.alpha < 0.05 || (o.type !== 'Text' && o.type !== 'Rectangle')) return;
    const b = o.getBounds(h.box); h.zones.push({ x0: b.x, y0: b.y, x1: b.right, y1: b.bottom });
  });
  const pr = s.prompt && s.prompt.box && s.prompt.box.visible ? s.prompt : null; // the floating key cap prompt (ui.js)
  h.pz = pr ? { x0: pr.box.x - pr.pw / 2 - 6, y0: pr.box.y - 22, x1: pr.box.x + pr.pw / 2 + 6, y1: pr.box.y + 22 } : null;
  if (h.pz) h.zones.push(h.pz);
  hudFade(h, s);
  if (obj) hudMarker(h, s, obj, now);

  s._hb = []; s._hm = null;
  Object.keys(h.t).forEach(k => { if (!h.seen[k]) h.t[k].setVisible(false); });
}
