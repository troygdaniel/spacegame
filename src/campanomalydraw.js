// ---------- Campaign: the haze of the anomalies (card space-game-campaign-anomalies) ----------
// An anomaly is a patch of heat-haze in the game view: no shader, a layer of broken rings that ripple outward, a faint lens, and the stars behind it pulled and doubled, subtle, drawn from
// CAMP.anomaly.haze (1,500 px) away. Decloaked, it is the aliens' cache: a ring with crates and a dish. campAnomDraw draws into a Graphics the scene has cleared, in world coordinates; no Phaser class here,
// so tests/campanomaly.mjs can hold the numbers (how many marks, where, how strong) without a page: campAnomHaze(C, a, view) says what to draw, campAnomDraw draws it.
//   campAnomHaze(C, a, view)    null when it is not drawn (looted, too far, off the screen), else { strength 0..1, hold 0..1, shown }
//   campAnomDraw(g, C, view, now)   view: the camera's world view { x, y, width, height }; now: ms (the ripple's clock)
function campAnomHaze(C, a, view) {
  const K = CAMP.anomaly, c = C.carrier; if (!c || (a.state !== 'hidden' && a.state !== 'revealed')) return null;
  const d = campDist(c, a), reach = a.r * 1.6;
  if (a.state === 'hidden' && d > K.haze) return null;
  if (view && (a.x + reach < view.x || a.x - reach > view.x + view.width || a.y + reach < view.y || a.y - reach > view.y + view.height)) return null;
  return { strength: a.state === 'hidden' ? Math.max(0.35, 1 - d / K.haze * 0.65) : 1, hold: a.state === 'hidden' ? Math.min(1, a.hold / K.hold) : 0, shown: a.state === 'revealed' };
}

function campAnomDraw(g, C, view, now) {
  (C.anoms || []).forEach((a, n) => {
    const h = campAnomHaze(C, a, view); if (!h) return;
    const r = a.r, K = CAMP.anomaly;
    if (h.shown) { // the cache: a ring that turns, crates on it, a dish in the middle
      g.lineStyle(2, 0xffd37a, 0.55).strokeCircle(a.x, a.y, r * 0.8);
      for (let i = 0; i < 8; i++) { const ang = i / 8 * 2 * Math.PI + now / 9000; g.fillStyle(i % 2 ? 0x8a6a3a : 0xb28a46, 0.95).fillRect(a.x + Math.cos(ang) * r * 0.8 - 7, a.y + Math.sin(ang) * r * 0.8 - 7, 14, 14); }
      g.fillStyle(0x3a2a18, 0.95).fillCircle(a.x, a.y, 20); g.lineStyle(2, 0xffd37a, 0.9).strokeCircle(a.x, a.y, 20); g.fillStyle(0xffd37a, 0.9).fillCircle(a.x, a.y, 6);
      return;
    }
    const s = h.strength;
    g.fillStyle(0x9fb8ff, 0.05 * s).fillCircle(a.x, a.y, r * 0.95); // the lens: the stars behind it look a little brighter and nearer
    for (let k = 0; k < 3; k++) { const ph = (now / 2800 + k / 3 + n * 0.37) % 1; g.lineStyle(2, 0xcfe0ff, 0.26 * (1 - ph) * s).strokeCircle(a.x, a.y, r * (0.3 + 0.85 * ph)); } // ripples going outward
    for (let i = 0; i < 12; i++) { // the edge: broken arcs that shift about, the heat-haze
      const a0 = i / 12 * 2 * Math.PI + Math.sin(now / 900 + i) * 0.12, w = r * (0.78 + 0.08 * Math.sin(now / 500 + i * 1.9));
      g.lineStyle(1.5, 0xe6efff, 0.2 * s); g.beginPath(); g.arc(a.x, a.y, w, a0, a0 + 0.32); g.strokePath();
    }
    for (let i = 0; i < 26; i++) { // stars behind it pulled out and doubled: a dot, and the same dot thrown outward by the lens
      const ang = (i * 2.399 + n) % (2 * Math.PI), rad = r * 0.9 * Math.sqrt((i + 0.5) / 26), px = a.x + Math.cos(ang) * rad, py = a.y + Math.sin(ang) * rad, sh = 1 + 0.5 * Math.sin(now / 350 + i * 1.3), off = r * 0.1 * sh;
      g.fillStyle(0xffffff, 0.5 * s).fillRect(px - 1, py - 1, 2, 2); g.fillStyle(0xcfe0ff, 0.3 * s).fillRect(px + Math.cos(ang) * off - 1, py + Math.sin(ang) * off - 1, 2, 2);
    }
    if (h.hold > 0) { g.lineStyle(4, 0x7fe9ff, 0.9); g.beginPath(); g.arc(a.x, a.y, K.visit, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * h.hold); g.strokePath(); } // the visit: the ring that fills while the carrier holds there
  });
}
