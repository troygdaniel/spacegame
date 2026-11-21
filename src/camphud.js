// ---------- The Campaign's three gauges (card space-game-systems-gauges; Troy, 21 Nov 2026) ----------
// Top left of the Campaign HUD, in the look of Long Haul's dials (src/hud.js hudGauge): SHIELDS (the hull is a thin bar under it), SPEED and LASERS. Beside each dial is a bar of power segments, the pips of
// the system that feeds it (the shields' for SHIELDS, the engines' for SPEED, the weapons' for LASERS), lit as they are given and animated as power moves, like X-Wing. The bars replace the small W S E pips.
// The SYSTEMS panel (C) and the direct keys J K L (a pip to the shields, the engines, the weapons: the order of the dials, and each key is printed under its bar) change the same numbers. Where things are is the table CAMP.hud (src/campaign.js); this file is the numbers
// (campGauges), the places (campHudGeom, campHudFlow), the animation of the bars (campGaugeAnim) and the drawing. The pure part is tested in plain Node (tests/campgauges.mjs).
//   campGauges(C)            the three dials now: [{ id, key, label, frac, big, color, warn, tick, pips }]   (frac 0 to 1; big the number in the dial; tick 0 to 1 a mark on the dial; pips lit in its bar)
//   campHullBar(C)           the thin hull bar: { frac, n, label, color, warn }
//   campHudGeom()            where the dials, bars and the hull bar are, in screen px, from CAMP.hud: { cells: [{ cx, cy, R, dial, bar, key }], hull, bottom }
//   campHudFlow(items)       the lines of text under the gauges: [{ id, show, h }] -> { ys: { id: y }, bottom }; a line with nothing to say gives its place back
//   campGaugeAnim(A, pips, ms)   the bars' animation: the lit share of each bar eases to its pips, a flash runs when they change;  campGaugeAnimNew(pips) starts one
//   campPowerKey(C, code)    a direct key: J shields, K engines, L weapons (the dials' order), ; back to 2 / 2 / 2: the order the SYSTEMS panel's row gives; { used, ran, ok, say, sys }
const CAMP_GAUGE = {
  colors: { shields: 0x7fe9ff, speed: 0x6dff9c, lasers: 0xffb454 },   // the dial and its bar: the colours the W S E pips had (weapons amber, shields cyan, engines green)
  keys: { KeyJ: 'shields', KeyK: 'engines', KeyL: 'weapons', Semicolon: 'balance' }, // the direct keys, in the order of the dials (SHIELDS, SPEED, LASERS: the key is under each bar), and ; for the balance (card space-game-power-balance-key); free of every key the Campaign binds (src/data_controls.js)
  segs: 24,                                                           // segments round a dial (Long Haul's has 30)
  ease: 9, flash: 280,                                                // segments a second a bar fills at, and how long (ms) a segment that changed flashes
  off: 0x16293d, glass: 0x07101c, hull: { ok: 0x6dff9c, low: 0xff4d6d, edge: 0x38e1ff }
};

// ---- the numbers (pure) ----
function campGauges(C) {
  const c = C.carrier, P = C.power, K = CAMP.power, fx = campPowerFx(C), G = CAMP_GAUGE.colors;
  const smax = campShieldMax(C), sf = smax > 0 ? C.shield / smax : 0;
  const sp = Math.hypot(c.vx || 0, c.vy || 0), scale = CAMP.carrier.speed * Math.max.apply(null, K.engines.speed), top = CAMP.carrier.speed * fx.speed; // the dial runs to the top speed at the most engine power; the tick is the top speed at the power now
  const lf = campLaserFrac(C), emer = C.t < P.until;
  return [
    { id: 'shields', key: 'J', label: uiText('camp.gauge.shields'), frac: Math.max(0, Math.min(1, sf)), big: String(Math.max(0, Math.round(C.shield))), color: emer ? 0xffffff : G.shields, warn: sf < K.low.shield, tick: null, pips: P.p[1] },
    { id: 'speed', key: 'K', label: uiText('camp.gauge.speed'), frac: Math.max(0, Math.min(1, sp / scale)), big: String(Math.round(sp)), color: sp > top * 1.02 ? 0xffb454 : G.speed, warn: false, tick: top / scale, pips: P.p[2] },
    { id: 'lasers', key: 'L', label: uiText('camp.gauge.lasers'), frac: lf, big: String(Math.round(lf * 100)), color: G.lasers, warn: lf < CAMP.tank.low, tick: null, pips: P.p[0] }
  ];
}
function campHullBar(C) {
  const c = C.carrier, f = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
  return { frac: f, n: Math.max(0, Math.round(c.hp)), label: uiText('camp.gauge.hull'), color: f > 0.3 ? CAMP_GAUGE.hull.ok : CAMP_GAUGE.hull.low, warn: f <= 0.3 };
}

// ---- the places (pure) ----
function campHudGeom() {
  const H = CAMP.hud, R = H.r + 9, M = CAMP.power.max, bw = M * H.bar.w + (M - 1) * H.bar.gap;
  const cells = [0, 1, 2].map(i => {
    const x0 = H.x + i * H.cell, cx = x0 + R, cy = H.y + R, bx = cx + R + 6, by = Math.round(cy - H.bar.h / 2);
    return { x0, cx, cy, R, dial: { x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R }, bar: { x0: bx, y0: by, x1: bx + bw, y1: by + H.bar.h }, key: { x: bx + bw / 2, y: by + H.bar.h + 9 } };
  });
  const hy = H.y + H.hullBar.y;
  return { cells, hull: { x0: cells[0].x0, y0: hy, x1: cells[0].bar.x1, y1: hy + H.hullBar.h }, balance: { x: cells[2].bar.x1, y: cells[2].key.y + 12 }, bottom: H.text.y }; // balance: where the word of the ; key stands (right-aligned, under the last bar's key)
}
// the lines of text under the gauges, top to bottom: each one that shows takes its pitch (and `h` more, a line with a bar under it), the others none
function campHudFlow(items) {
  const T = CAMP.hud.text, ys = {}; let y = T.y;
  (items || []).forEach(it => { if (!it || !it.show) return; ys[it.id] = y; y += T.pitch + (it.h || 0); });
  return { ys, bottom: y };
}

// ---- the bars' animation (pure): A.shown[i] is how much of bar i is lit now (it eases to the pips), A.flash[i] runs 1 to 0 after the pips changed ----
function campGaugeAnimNew(pips) { return { shown: pips.slice(), last: pips.slice(), flash: pips.map(() => 0) }; }
function campGaugeAnim(A, pips, ms) {
  const K = CAMP_GAUGE, step = K.ease * Math.max(0, ms) / 1000;
  pips.forEach((p, i) => {
    if (p !== A.last[i]) { A.last[i] = p; A.flash[i] = 1; }
    const d = p - A.shown[i]; A.shown[i] = Math.abs(d) <= step ? p : A.shown[i] + Math.sign(d) * step;
    A.flash[i] = Math.max(0, A.flash[i] - Math.max(0, ms) / K.flash);
  });
  return A;
}
// how much of segment i (0 to 1) is lit when `shown` segments are
const campBarSeg = (shown, i) => Math.max(0, Math.min(1, shown - i));

// ---- a direct key (J K L): the SYSTEMS panel's row, without opening the panel ----
function campPowerKey(C, code) {
  const sys = CAMP_GAUGE.keys[code]; if (!sys) return { used: false, ran: false, ok: false, say: '', sys: '' };
  const r = sys === 'balance' ? campOrder(C, 'balance', '', 'key') : campOrder(C, 'power', sys, 'key'); // ; is the panel's Balance row: 2 / 2 / 2 at once
  return { used: true, ran: true, ok: !!r.ok, say: r.say || '', sys };
}

// ---- drawing: a Phaser Graphics `g` and the scene's texts (made once by campGaugesMake, written by campGaugesPaint) ----
function campHudArc(g, cx, cy, r, a0, a1) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.1)), st = (a1 - a0) / n;
  g.beginPath(); g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
  for (let i = 1; i <= n; i++) g.lineTo(cx + Math.cos(a0 + st * i) * r, cy + Math.sin(a0 + st * i) * r);
  g.strokePath();
}
function campHudDisc(g, cx, cy, r) {
  const n = Math.max(8, Math.min(40, Math.ceil(r * 1.2))), pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: cx + Math.cos(Math.PI * 2 * i / n) * r, y: cy + Math.sin(Math.PI * 2 * i / n) * r });
  g.fillPoints(pts, true);
}
function campHudRing(g, cx, cy, r) { campHudArc(g, cx, cy, r, 0, Math.PI * 2); }
// one dial, the look of hudGauge at the size of CAMP.hud.r: a glass plate with a glowing bezel and ticks, segments with a halo under the lit ones and a bright leading cell, a mark for a threshold, a scanner arc
function campDialDraw(g, cell, d, now) {
  const K = CAMP_GAUGE, cx = cell.cx, cy = cell.cy, R = cell.R, r = R - 9, a0 = Math.PI * 0.75, span = Math.PI * 1.5, n = K.segs, frac = Math.max(0, Math.min(1, d.frac));
  const rim = d.warn ? 0xff4d6d : 0x38e1ff, beat = d.warn ? 0.55 + 0.45 * Math.sin(now / 130) : 1;
  g.fillStyle(K.glass, 0.78); campHudDisc(g, cx, cy, R);
  g.fillStyle(d.color, 0.06); campHudDisc(g, cx, cy, r - 5);
  [[5, 0.07], [3, 0.17], [1.3, 0.8]].forEach(([lw, k]) => { g.lineStyle(lw, rim, k * beat); campHudRing(g, cx, cy, R); });
  for (let i = 0; i <= 10; i++) { // ticks outside the segments: long at 0, half and full
    const a = a0 + span * i / 10, long = i % 5 === 0, r0 = r + 4, r1 = r + (long ? 7 : 5.5);
    g.lineStyle(long ? 2 : 1, rim, long ? 0.85 : 0.4); g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  if (frac > 0.02) { g.lineStyle(9, d.color, 0.13); campHudArc(g, cx, cy, r, a0, a0 + span * frac); }
  const lead = Math.min(n - 1, Math.max(0, Math.ceil(frac * n - 0.5) - 1));
  for (let i = 0; i < n; i++) {
    const lit = (i + 0.5) / n <= frac || (i === 0 && frac > 0.01), s0 = a0 + span * (i + 0.14) / n, s1 = a0 + span * (i + 0.86) / n;
    g.lineStyle(5, lit ? d.color : K.off, 1); campHudArc(g, cx, cy, r, s0, s1);
    if (lit && i === lead) { g.lineStyle(2, 0xffffff, 0.45 + 0.4 * Math.sin(now / 160)); campHudArc(g, cx, cy, r, s0, s1); }
  }
  if (d.tick != null) { // a mark where a threshold is (the top speed at the engines' power now): green, a dot out on the bezel
    const a = a0 + span * Math.max(0, Math.min(1, d.tick));
    g.lineStyle(2, 0x6dff9c, 1); g.lineBetween(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8));
    g.fillStyle(0x6dff9c, 1); campHudDisc(g, cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10), 1.5);
  }
  const sa = now / 1100 + cx; g.lineStyle(1.5, rim, 0.5 * beat); campHudArc(g, cx, cy, R, sa, sa + 0.4); // the scanner: a short bright arc, once round in seven seconds
}
// the bar of power segments beside a dial: `shown` of them lit (a fraction fades in), a white flash on the ones that just changed
function campBarDraw(g, cell, shown, flash, color) {
  const H = CAMP.hud, b = cell.bar, M = CAMP.power.max;
  for (let i = 0; i < M; i++) {
    const x = b.x0 + i * (H.bar.w + H.bar.gap), a = campBarSeg(shown, i);
    g.fillStyle(CAMP_GAUGE.off, 0.9).fillRect(x, b.y0, H.bar.w, H.bar.h);
    if (a > 0) g.fillStyle(color, 0.3 + 0.7 * a).fillRect(x, b.y0, H.bar.w, H.bar.h);
    if (flash > 0 && a > 0 && a < 1 + 1e-9) g.fillStyle(0xffffff, 0.55 * flash).fillRect(x, b.y0, H.bar.w, H.bar.h);
  }
  g.lineStyle(1, 0x38e1ff, 0.35).strokeRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, H.bar.h + 4);
}
// the three texts of each dial (the number in it, its word under the number) and the key under its bar, and the hull's words; made once, hidden with the rest of the HUD (hudShow)
function campGaugesMake(sc, uiFontFn) {
  const Z = campHudGeom(), mk = (x, y, size, color, ox) => sc.add.text(x, y, '', uiFontFn(size, color, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(ox == null ? 0.5 : ox, 0.5).setScrollFactor(0).setDepth(101);
  return { n: Z.cells.map(c => mk(c.cx, c.cy - 3, 13, '#ffffff')), l: Z.cells.map(c => mk(c.cx, c.cy + 10, 8, '#9fbdd1')), k: Z.cells.map(c => mk(c.key.x, c.key.y, 9, '#9fbdd1')), hull: mk(Z.hull.x0, Z.hull.y0 - 7, 9, '#9fe9ff', 0), hullN: mk(Z.hull.x1, Z.hull.y0 - 7, 9, '#9fe9ff', 1), bal: mk(Z.balance.x, Z.balance.y, 9, '#9fbdd1', 1) };
}
function campGaugesVisible(T, on) { if (!T) return; ['n', 'l', 'k'].forEach(k => (T[k] || []).forEach(t => t && t.setVisible && t.setVisible(on))); ['hull', 'hullN', 'bal'].forEach(k => T[k] && T[k].setVisible && T[k].setVisible(on)); }
// every frame: the dials, the bars, the hull bar, and the words on them
function campGaugesPaint(g, T, C, A, now) {
  const Z = campHudGeom(), D = campGauges(C), HB = campHullBar(C), emer = C.t < C.power.until;
  const order = [1, 2, 0]; // the pips of the shields, the engines, the weapons: the order of the dials
  Z.cells.forEach((cell, i) => {
    const d = D[i]; campDialDraw(g, cell, d, now);
    campBarDraw(g, cell, A.shown[order[i]], A.flash[order[i]], i === 0 && emer ? 0xffffff : d.color);
    if (T && T.n) { T.n[i].setText(d.big).setColor(d.warn ? '#ff4d6d' : '#ffffff'); T.l[i].setText(d.label); T.k[i].setText(d.key); }
  });
  const h = Z.hull, w = h.x1 - h.x0;
  g.fillStyle(CAMP_GAUGE.off, 0.9).fillRect(h.x0, h.y0, w, h.y1 - h.y0);
  g.fillStyle(HB.color, 1).fillRect(h.x0, h.y0, Math.max(0, w * HB.frac), h.y1 - h.y0);
  g.lineStyle(1, CAMP_GAUGE.hull.edge, 0.4).strokeRect(h.x0, h.y0, w, h.y1 - h.y0);
  if (T && T.bal) T.bal.setText(';  ' + uiText('camp.gauge.even')); // the key of the balance, and its word, under the last bar's key
  if (T && T.hull) { T.hull.setText(HB.label).setColor(HB.warn ? '#ff4d6d' : '#9fe9ff'); T.hullN.setText(String(HB.n)).setColor(HB.warn ? '#ff4d6d' : '#9fe9ff'); }
}
