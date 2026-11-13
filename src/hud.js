// ---------- HUD: one cockpit frame for Station, Space and Surface ----------
// Every scene calls hudTick(this) once per frame, last thing in update(). It builds its own graphics and text on first
// use (and again after a scene restart), so the scenes carry no HUD code of their own.
//   Space reads:   s.ship  s.station  s.planet  s.enemies, plus missionTarget(s) and missionDef() from missions.js
//   Surface reads: s.player  s.hp  s.col  s.pad  s.pod  s.crawlers
//   Station reads: s.spots
// Missions talk to it with hudBlip(s, x, y, color, r) (a radar dot for this frame) and hudMeter(s, name, frac, color)
// (a bar under the checklist for this frame). The checklist for each mission is in HUD_MISSIONS below; a mission with no
// row there still gets a panel, from its own title and line().

const HUD_BG = 0x07101c, HUD_OFF = 0x16293d, HUD_DIM = '#5b7a92', HUD_RANGE = { Space: 2400, Surface: 900 }; // radar range, world units
const HUD_GEAR = { armor: 'ARM', rapid: 'RPD', booster: 'BST' };                                       // gear abbreviations on the strip
const HUD_FRAME = { x: 20, y: 148, w: 296 };                                                               // checklist panel (Space, Surface)

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
    next: (s, key) => key === 'Station' ? 'Board your ship in the hangar' : key === 'Space' ? 'Stay close to the MULE' : 'Return to your ship'
  },
  patrol: {
    steps: ['Take the patrol call', 'Launch from the hangar', () => 'Destroy the wanted pirates  ' + G.missionProgress + '/' + (missionDef().count || 5)],
    cur: (s, key) => key === 'Station' ? 1 : 2,
    next: (s, key) => key === 'Station' ? 'Board your ship in the hangar' : key === 'Space' ? 'Hunt the amber-ringed pirates' : 'Return to your ship'
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
    t._hc = color;
  }
  h.seen[key] = true;
  if (t._hc !== color) { t._hc = color; t.setColor(color); }
  if (t.text !== str) t.setText(str);
  t.setOrigin(o.ox == null ? 0 : o.ox, o.oy == null ? 0.5 : o.oy).setPosition(Math.round(x), Math.round(y)).setAlpha(o.alpha == null ? 1 : o.alpha).setVisible(true);
  return t;
}

// a panel with two cut corners (top right, bottom left)
function hudPanel(g, x, y, w, ht, cut, alpha, edge) {
  const p = [[x, y], [x + w - cut, y], [x + w, y + cut], [x + w, y + ht], [x + cut, y + ht], [x, y + ht - cut]];
  g.fillStyle(HUD_BG, alpha); g.lineStyle(1, edge || CYAN, 0.55);
  g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath(); g.fillPath(); g.strokePath();
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
function hudFrame(g) {
  g.lineStyle(2, CYAN, 0.4);
  const c = (x, y, sx, sy) => {
    g.beginPath(); g.moveTo(x, y + sy * 60); g.lineTo(x, y + sy * 18); g.lineTo(x + sx * 18, y); g.lineTo(x + sx * 60, y); g.strokePath();
  };
  c(8, 8, 1, 1); c(W - 8, 8, -1, 1); c(8, H - 8, 1, -1); c(W - 8, H - 8, -1, -1);
  g.fillStyle(AMBER, 0.7);
  g.fillRect(6, 62, 4, 10); g.fillRect(W - 10, 62, 4, 10); g.fillRect(6, H - 72, 4, 10); g.fillRect(W - 10, H - 72, 4, 10);
}

// ---- a 270 degree gauge of 30 segments; tick (0..1) marks a threshold on the scale ----
function hudGauge(h, id, cx, cy, r, frac, color, big, small, tick) {
  const g = h.g, a0 = Math.PI * 0.75, span = Math.PI * 1.5, n = 30;
  frac = Phaser.Math.Clamp(frac, 0, 1);
  g.fillStyle(HUD_BG, 0.72); g.fillCircle(cx, cy, r + 11);
  g.lineStyle(1, CYAN, 0.35); g.strokeCircle(cx, cy, r + 11);
  for (let i = 0; i < n; i++) {
    const lit = (i + 0.5) / n <= frac;
    g.lineStyle(7, lit ? color : HUD_OFF, 1);
    g.beginPath(); g.arc(cx, cy, r, a0 + span * (i + 0.14) / n, a0 + span * (i + 0.86) / n, false); g.strokePath();
  }
  if (tick != null) {
    const a = a0 + span * tick;
    g.lineStyle(2, GREEN, 1); g.lineBetween(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7), cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9));
  }
  hudPut(h, id + 'n', cx, cy - 2, big, { size: 21, bold: true, color: hudCss(color), ox: 0.5 });
  hudPut(h, id + 'l', cx, cy + 27, small, { size: 10, color: HUD_DIM, ox: 0.5, spacing: 1 });
}

// ---- credits and gear strip, top centre ----
function hudStrip(h, now) {
  const g = h.g;
  if (G.credits !== h.cr) { if (G.credits > h.cr) h.flash = now + 700; h.cr = G.credits; }
  hudPanel(g, 440, 10, 400, 30, 8, 0.72);
  hudPut(h, 'crl', 458, 25, 'CR', { size: 11, color: HUD_DIM, spacing: 2 });
  hudPut(h, 'crv', 482, 25, hudFmt(G.credits), { size: 17, bold: true, color: now < h.flash ? '#ffffff' : '#ffb454' });
  UPGRADES.forEach((u, i) => {
    const gx = 612 + i * 74, tier = G.upgrades[u.key] | 0;
    hudPut(h, 'up' + i, gx, 25, HUD_GEAR[u.key] || u.key.slice(0, 3).toUpperCase(), { size: 11, color: HUD_DIM, spacing: 1 });
    for (let j = 0; j < 2; j++) {
      const x = gx + 30 + j * 13;
      if (tier > j) { g.fillStyle(CYAN, 1); g.fillRect(x, 21, 9, 9); } else { g.lineStyle(1, 0x3a566e, 1); g.strokeRect(x + 0.5, 21.5, 8, 8); }
    }
  });
}

// ---- the mission as the checklist wants it ----
function hudMission(s, key) {
  const m = missionDef(), st = G.mission;
  if (!m || st === 'none') return { kind: 'none', head: 'NO ACTIVE MISSION', next: 'Take a call at the MISSIONS terminal' };
  if (st === 'failed') return { kind: 'failed', head: 'MISSION FAILED', next: m.line('failed') };
  const row = HUD_MISSIONS[m.id];
  if (!row) return { kind: 'active', head: m.title, sub: m.where, reward: m.reward, next: m.line(st) };
  const cur = row.cur(s, key);
  return {
    kind: 'active', head: m.title, sub: m.where, reward: m.reward, cur, next: row.next(s, key, cur),
    steps: row.steps.map((t, i) => ({ text: typeof t === 'function' ? t() : t, state: i < cur ? 'done' : i === cur ? 'cur' : 'todo' }))
  };
}

// ---- Space and Surface: the checklist panel under the gauges ----
function hudTracker(h, m, meter, now) {
  const g = h.g, P = HUD_FRAME, px = P.x, py = P.y, steps = m.steps || [];
  const nextLines = Math.max(1, Math.ceil(m.next.length * 7.3 / (P.w - 28)));
  const nextY = py + (m.steps ? 62 + steps.length * 22 + 4 : 56);
  const ht = (nextY - py) + nextLines * 15 + 10 + (meter ? 24 : 0);
  hudPanel(g, px, py, P.w, ht, 10, 0.72, m.kind === 'failed' ? RED : CYAN);
  const bad = m.kind === 'failed';
  hudPut(h, 'tl', px + 14, py + 14, 'MISSION', { size: 11, color: HUD_DIM, spacing: 3 });
  if (m.reward) hudPut(h, 'tr', px + P.w - 14, py + 14, '+' + m.reward + ' cr', { size: 12, bold: true, color: '#ffb454', ox: 1 });
  hudPut(h, 'th', px + 14, py + 36, m.head, { size: 15, bold: true, color: bad ? '#ff4d6d' : m.kind === 'none' ? '#9fe9ff' : '#ffd37a' });
  if (m.sub) hudPut(h, 'tsub', px + P.w - 14, py + 37, m.sub, { size: 11, color: HUD_DIM, ox: 1 });
  steps.forEach((st, i) => {
    const y = py + 66 + i * 22, bx = px + 14;
    if (st.state === 'done') {
      g.fillStyle(GREEN, 0.9); g.fillRect(bx, y - 6, 12, 12);
      g.lineStyle(2, HUD_BG, 1); g.beginPath(); g.moveTo(bx + 3, y); g.lineTo(bx + 5.5, y + 3); g.lineTo(bx + 9.5, y - 3); g.strokePath();
    } else if (st.state === 'cur') {
      g.lineStyle(2, AMBER, 1); g.strokeRect(bx, y - 6, 12, 12);
      g.fillStyle(AMBER, 0.55 + 0.45 * Math.sin(now / 260)); g.fillRect(bx + 3, y - 3, 6, 6);
    } else {
      g.lineStyle(1, 0x3a566e, 1); g.strokeRect(bx + 0.5, y - 5.5, 11, 11);
    }
    hudPut(h, 'ts' + i, bx + 24, y, st.text, { size: 13, color: st.state === 'done' ? '#58b57d' : st.state === 'cur' ? '#ffd37a' : HUD_DIM });
  });
  hudPut(h, 'tn', px + 14, nextY, m.next, { size: 12, color: bad ? '#ff9aa9' : '#9fe9ff', oy: 0, wrap: P.w - 28 });
  if (meter) {
    const y = py + ht - 17;
    hudPut(h, 'tm', px + 14, y, meter.name, { size: 11, color: HUD_DIM, spacing: 2 });
    const bx = px + 100, bw = P.w - 114;
    g.fillStyle(HUD_OFF, 1); g.fillRect(bx, y - 4, bw, 8);
    g.fillStyle(meter.color, 1); g.fillRect(bx, y - 4, bw * Phaser.Math.Clamp(meter.frac, 0, 1), 8);
    g.lineStyle(1, meter.color, 0.7); g.strokeRect(bx, y - 4, bw, 8);
  }
  h.zones.push({ x0: 0, y0: 0, x1: px + P.w + 20, y1: py + ht + 12 });
}

// ---- Station: one line under the strip (the checklist would sit on the terminals) ----
function hudCompact(h, m) {
  const g = h.g, bad = m.kind === 'failed';
  hudPanel(g, 420, 46, 440, 28, 8, 0.72, bad ? RED : CYAN);
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
  g.fillStyle(HUD_BG, 0.72); g.fillCircle(cx, cy, R + 4);
  g.lineStyle(1, CYAN, 0.25); g.strokeCircle(cx, cy, R / 3); g.strokeCircle(cx, cy, R * 2 / 3);
  g.lineStyle(1, CYAN, 0.14); g.lineBetween(cx - R, cy, cx + R, cy); g.lineBetween(cx, cy - R, cx, cy + R);
  const sw = (now / 1500) % (Math.PI * 2);
  for (let i = 0; i < 9; i++) {
    g.lineStyle(2, CYAN, 0.2 * (1 - i / 9));
    g.lineBetween(cx, cy, cx + Math.cos(sw - i * 0.07) * R, cy + Math.sin(sw - i * 0.07) * R);
  }
  g.lineStyle(2, CYAN, 0.7); g.strokeCircle(cx, cy, R);
  hudPut(h, 'rl', cx, cy + R + 16, 'RADAR  ' + (key === 'Space' ? (range / 10) + ' km' : (range / 10) + ' m'), { size: 11, color: HUD_DIM, ox: 0.5, spacing: 1 });

  const pt = (wx, wy, keep) => { // world point -> radar point; off the radar it is clamped to the rim when keep, else null
    let dx = (wx - ox) * sc, dy = (wy - oy) * sc;
    const d = Math.hypot(dx, dy), out = d > R - 4;
    if (out) { if (!keep) return null; dx *= (R - 4) / d; dy *= (R - 4) / d; }
    return { x: cx + dx, y: cy + dy, out, a: Math.atan2(dy, dx) };
  };
  const mark = (p, color, draw) => { if (p.out) hudTri(g, p.x, p.y, p.a, 5, color); else draw(p); };
  const dot = (wx, wy, color, r) => { const p = pt(wx, wy, false); if (p) { g.fillStyle(color, 1); g.fillCircle(p.x, p.y, r); } };

  if (key === 'Space') {
    mark(pt(s.station.x, s.station.y, true), CYAN, p => hudDiamond(g, p.x, p.y, 5, CYAN));
    mark(pt(s.planet.x, s.planet.y, true), AMBER, p => { g.fillStyle(AMBER, 1); g.fillCircle(p.x, p.y, 5); });
    s.enemies.getChildren().forEach(d => { if (d.active) dot(d.x, d.y, d.wanted ? AMBER : RED, d.wanted ? 3 : 2.2); });
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
    if (p.out) hudTri(g, p.x, p.y, p.a, 7, AMBER, 0.9); else g.strokeCircle(p.x, p.y, 8 + Math.sin(now / 200));
  }
  tri(g, cx, cy, me.rotation, 5, 0xffffff);
}

// ---- the objective: where to go, and how far ----
function hudObjective(s, key) {
  if (key === 'Space') {
    const t = missionTarget(s), big = t.name === 'Halcyon Station' || t.name === 'Kepler-4b';
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
    if (p.x <= z.x0 || p.x >= z.x1 || p.y <= z.y0 || p.y >= z.y1) return;
    if (p.side === 'T') p.x = z.x0 <= 24 ? z.x1 + 28 : z.x1 >= W - 24 ? z.x0 - 28 : (p.x - z.x0 < z.x1 - p.x ? z.x0 - 28 : z.x1 + 28);
    else if (p.side === 'L' || p.side === 'R') p.y = z.y1 + 28;
  });
  return p;
}

function hudMarker(h, s, o, now) {
  const g = h.g, cam = s.cameras.main, sx = o.x - cam.scrollX, sy = o.y - cam.scrollY;
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
    const y0 = o.below ? sy + o.hh + 14 : sy - o.hh - 24; // a terminal already has its own label above it
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

// ---- once per frame ----
function hudTick(s) {
  let h = s._hud;
  if (!h || !h.g.active) h = s._hud = { s, g: s.add.graphics().setScrollFactor(0).setDepth(100), t: {}, seen: {}, zones: [], cr: G.credits, flash: 0 };
  const g = h.g, key = s.scene.key, now = s.time.now, space = key === 'Space', surf = key === 'Surface';
  g.clear(); h.seen = {}; h.zones = [];
  hudFrame(g);

  // gauges, top left
  const hullFrac = surf ? s.hp / 100 : G.hull / G.maxHull;
  hudGauge(h, 'g1', 70, 80, 40, hullFrac, hullFrac > 0.5 ? CYAN : hullFrac > 0.3 ? AMBER : RED, String(Math.max(0, Math.round(surf ? s.hp : G.hull))), surf ? 'HEALTH' : 'HULL');
  if (space) {
    const spd = s.ship.body.speed, top = boostMax();
    hudGauge(h, 'g2', 186, 80, 40, spd / top, spd > 480 ? AMBER : CYAN, String(Math.round(spd)), 'SPEED', 150 / top);
  }
  hudStrip(h, now);

  const m = hudMission(s, key);
  let meter = s._hm || null;
  if (surf && s.col && s.col.state === 'following') meter = { name: 'COLONIST', frac: s.col.hp / 60, color: AMBER };
  if (key === 'Station') { hudCompact(h, m); h.zones.push({ x0: 0, y0: 0, x1: 240, y1: 140 }); } else hudTracker(h, m, meter, now);

  const obj = hudObjective(s, key);
  if (space || surf) { h.zones.push({ x0: W - 230, y0: 0, x1: W, y1: 236 }); hudRadar(h, s, key, obj, now); }
  h.zones.push({ x0: 430, y0: 0, x1: 850, y1: 50 });
  if (obj) hudMarker(h, s, obj, now);

  s._hb = []; s._hm = null;
  Object.keys(h.t).forEach(k => { if (!h.seen[k]) h.t[k].setVisible(false); });
}
