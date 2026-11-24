// ---------- The Campaign's gauge numbers and places (card space-game-systems-gauges, Troy, 21 Nov 2026) ----------
// NOT DRAWN ANY MORE (card space-game-layout-hud, Troy, 24 Nov 2026): the three round gauges (shields, speed, lasers), the hull bar and the ore line at the top right are gone from the screen, and so are the drawing of them, their texts and the
// picture cache (src/campgaugecache.js). The cruiser's shield, hull and ore are written at the top left by src/campcruiserhud.js (card space-game-layout-cruiser), which has its own numbers. What is kept here is the part the rest of the game still reads, behind the
// power switch (CAMP.power.on, off in the game since card space-game-power-removed): the numbers (campGauges, campHullBar), the places (campHudGeom: the third dial's bar, campHudFlow: the lines of text), the bars' animation and one bar's drawing
// (no list row draws them now: the power list is deleted, card space-game-delete-off-lists) and the direct keys J K L (campPowerKey). Where things are is the table CAMP.hud (src/campaign.js). The pure part is tested in plain Node (tests/campgauges.mjs).
//   campGauges(C)            the three dials' numbers: [{ id, key, label, frac, big, color, warn, tick, pips }]   (frac 0 to 1; big the number in the dial; tick 0 to 1 a mark on the dial; pips lit in its bar)
//   campHullBar(C)           the hull's numbers: { frac, n, label, color, warn }
//   campHudGeom()            the places of the dials, bars and the hull bar, in screen px, from CAMP.hud: { cells: [{ cx, cy, R, dial, bar, key }], hull, bottom, ore: { x, y }, block: { x0, y0, x1, y1 } } (the power list's rows take the bar's size from it)
//   campHudFlow(items)       the lines of text at the top centre: [{ id, show, h }] -> { ys: { id: y }, bottom }; a line with nothing to say gives its place back
//   campGaugeAnim(A, pips, ms)   the bars' animation: the lit share of each bar eases to its pips, a flash runs when they change;  campGaugeAnimNew(pips) starts one;  campBarDraw draws one bar (the power list's rows)
//   campPowerKey(C, code)    a direct key: J shields, K engines, L weapons (the dials' order): the same orders the strip gives; { used, ran, ok, say, sys }
// the code -> system of the keys of the SHIP panel's power rows (J K L in the table today)
function campPowerKeys() { const k = {}; ['shields', 'engines', 'weapons'].forEach(id => CAMP_KEYS[id].codes.forEach(c => { k[c] = CAMP_KEYS[id].sys; })); return k; } // (no keys while the pips are off: CAMP.power.on)
const CAMP_DIAL_PIPS = [1, 2, 0]; // the pips of the shields, the engines, the weapons (indexes into C.power.p, which is weapons, shields, engines): what dial 0, 1 and 2 show, left to right
const CAMP_GAUGE = {
  colors: { shields: 0x7fe9ff, speed: 0x6dff9c, lasers: 0xffb454 },   // the dial and its bar: the colours the W S E pips had (weapons amber, shields cyan, engines green)
  keys: campPowerKeys(), // the direct keys (CAMP_KEYS in src/data_controls.js), the dials' order // the direct keys, in the order of the dials (SHIELDS, SPEED, LASERS: the key is under each bar); the semicolon's balance key is gone (card space-game-keys-select); free of every key the Campaign binds (src/data_controls.js)
  ease: 9, flash: 280,                                                // segments a second a bar fills at, and how long (ms) a segment that changed flashes
  off: 0x16293d, hull: { ok: 0x6dff9c, low: 0xff4d6d }
};

// ---- the numbers (pure) ----
function campGauges(C) {
  const c = C.carrier, P = C.power, K = CAMP.power, fx = campPowerFx(C), G = CAMP_GAUGE.colors;
  const smax = campShieldMax(C), sf = smax > 0 ? C.shield / smax : 0;
  const sp = Math.hypot(c.vx || 0, c.vy || 0), scale = CAMP.carrier.speed * Math.max.apply(null, K.engines.speed), top = CAMP.carrier.speed * fx.speed; // the dial runs to the top speed at the most engine power; the tick is the top speed at the power now
  const lf = campLaserFrac(C);
  return [
    { id: 'shields', key: campKeyVar('keyshields'), label: uiText('camp.gauge.shields'), frac: Math.max(0, Math.min(1, sf)), big: String(Math.max(0, Math.round(C.shield))), color: G.shields, warn: sf < K.low.shield, tick: null, pips: P.p[1] },
    { id: 'speed', key: campKeyVar('keyengines'), label: uiText('camp.gauge.speed'), frac: Math.max(0, Math.min(1, sp / scale)), big: String(Math.round(sp)), color: sp > top * 1.02 ? 0xffb454 : G.speed, warn: false, tick: top / scale, pips: P.p[2] },
    { id: 'lasers', key: campKeyVar('keyweapons'), label: uiText('camp.gauge.lasers'), frac: lf, big: String(Math.round(lf * 100)), color: G.lasers, warn: lf < CAMP.tank.low, tick: null, pips: P.p[0] }
  ];
}
function campHullBar(C) {
  const c = C.carrier, f = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
  return { frac: f, n: Math.max(0, Math.round(c.hp)), label: uiText('camp.gauge.hull'), color: f > 0.3 ? CAMP_GAUGE.hull.ok : CAMP_GAUGE.hull.low, warn: f <= 0.3 };
}

// ---- the places (pure) ----
function campHudGeom() {
  const H = CAMP.hud, R = H.r + 9, M = CAMP.power.max, bw = M * H.bar.w + (M - 1) * H.bar.gap, Wd = typeof W === 'number' ? W : 1280, cw = CAMP.power.on ? H.cell : H.plain, gx = Wd - H.right - 3 * cw; // the block of three cells ends H.right px from the screen's right edge; a cell is the dial and its bar, or the dial alone while the pips are off (card space-game-power-removed)
  const cells = [0, 1, 2].map(i => {
    const x0 = gx + i * cw, cx = x0 + R, cy = H.y + R, bx = cx + R + 6, by = Math.round(cy - H.bar.h / 2);
    return { x0, cx, cy, R, dial: { x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R }, bar: { x0: bx, y0: by, x1: bx + bw, y1: by + H.bar.h }, key: { x: bx + bw / 2, y: by + H.bar.h + 9 } };
  });
  const hy = H.y + H.hullBar.y;
  return { cells, hull: { x0: cells[0].x0, y0: hy, x1: CAMP.power.on ? cells[0].bar.x1 : cells[0].x0 + 2 * R, y1: hy + H.hullBar.h }, bottom: H.text.y, ore: { x: gx + 3 * cw, y: H.ore.y }, block: { x0: gx, y0: H.y, x1: gx + 3 * cw, y1: H.y + H.hullBar.y + H.hullBar.h + 6 } }; // (the hull bar is under the shield dial: as wide as the dial and its bar, or the dial alone)
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

// ---- a direct key (J K L): the ship's power (src/camppanel.js does the same through campPanelKey) ----
function campPowerKey(C, code) {
  const sys = CAMP_GAUGE.keys[code]; if (!sys) return { used: false, ran: false, ok: false, say: '', sys: '' };
  const r = campOrder(C, 'power', sys, 'key');
  return { used: true, ran: true, ok: !!r.ok, say: r.say || '', sys };
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
