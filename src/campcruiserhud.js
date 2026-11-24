// ---------- The cruiser's status at the top left (card space-game-layout-cruiser; Troy, 24 Nov 2026) ----------
// "Top left is what I command": the S CRUISER corner. ABOVE its title sit the cruiser's status: a SHIELD bar, a HULL bar and the ORE count (with the credits and the ships being mended, when there are some).
// They were the shield and hull of the round gauges and the ore line at the top right; this file has its own numbers and its own words (camp.cruiser.*) and calls nothing in src/camphud.js, so the gauges can go without it.
// The corner's title and its rows (S) are the shared corner panel's (card space-game-layout-fleet); campCruiserHudGeom().bottom is where that title starts.
//   campCruiserStatus(C)       the numbers (pure): { shield: { frac, n, warn }, hull: { frac, n, warn }, ore: { n, cap, full, cash, mends } }
//   campCruiserOreLine(S)      the ore line's words for that status: "ORE  120/300   CREDITS  40  +2"
//   campCruiserHudGeom()       the places (pure), in screen px: { x0, y0, x1, y1, plate, rows: [{ id, label, num, bar }], ore, bottom }
//   campCruiserHudMake(sc, uiFontFn)   the texts, made once (keys crShieldL, crShieldN, crHullL, crHullN, crOre: put them in the scene's HUD, so hiding the HUD hides them)
//   campCruiserHudPaint(g, H, C)       every frame: the plate and the bars on the Graphics `g`, the words in the texts of H (the scene's HUD)
// Plain rectangles only: a rounded frame is triangulated again on every render (card space-game-perf-after-keys).
const CAMPCRUISERHUD = {
  x: 24, y: 8, w: 360,                 // the status block's left, its top and its width: as wide as the S list's box (CAMPPANELS_LOOK.box.w), so the corner is one column
  pad: 8, label: 64, num: 44,          // px: the room inside the plate at each side, the words at the left of a bar and the number at its right
  row: 16, bar: 9, gap: 6,             // px: the step between lines, a bar's height, and the room between the ore line and the title that follows
  low: 0.3,                            // a bar at or under this share turns red
  color: { shield: 0x7fe9ff, hull: 0x6dff9c, warn: 0xff4d6d, off: 0x16293d, edge: 0x38e1ff, plate: 0x02060d },
  ink: { label: '#9fbdd1', num: '#ffffff', warn: '#ff4d6d', ore: '#ffd37a', full: '#ffb454' },
  plateAlpha: 0.55, depth: 101
};

// ---- the numbers (pure) ----
function campCruiserStatus(C) {
  const c = C.carrier, K = CAMPCRUISERHUD, smax = campShieldMax(C), sf = smax > 0 ? Math.max(0, Math.min(1, C.shield / smax)) : 0, hf = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
  return {
    shield: { frac: sf, n: Math.max(0, Math.round(C.shield)), warn: sf <= K.low },
    hull: { frac: hf, n: Math.max(0, Math.round(c.hp)), warn: hf <= K.low },
    ore: { n: Math.floor(C.ore), cap: CAMP.ore.cap, full: C.ore >= CAMP.ore.cap, cash: C.cash > 0 ? Math.floor(C.cash) : 0, mends: C.mends ? C.mends.length : 0 }
  };
}
// the ore, the credits when there are some (what the outposts paid, and what the save brought: card space-game-credits-apart-from-ore) and +n for the ships being mended
function campCruiserOreLine(S) {
  const o = S.ore;
  return uiText('camp.cruiser.ore') + '  ' + o.n + '/' + o.cap + (o.cash > 0 ? '   ' + uiText('camp.cruiser.credits') + '  ' + o.cash : '') + (o.mends > 0 ? '  +' + o.mends : '');
}

// ---- the places (pure) ----
function campCruiserHudGeom() {
  const K = CAMPCRUISERHUD, x0 = K.x, x1 = K.x + K.w;
  const rows = ['shield', 'hull'].map((id, i) => {
    const y = K.y + i * K.row, by = y + Math.round((K.row - K.bar) / 2);
    return { id, label: { x: x0 + K.pad, y: y + K.row / 2 }, num: { x: x1 - K.pad, y: y + K.row / 2 }, bar: { x0: x0 + K.pad + K.label, y0: by, x1: x1 - K.pad - K.num, y1: by + K.bar } };
  });
  const oy = K.y + 2 * K.row;
  return { x0, y0: K.y, x1, y1: oy + K.row, plate: { x: x0, y: K.y - 4, w: K.w, h: 2 * K.row + K.row + 4 }, rows, ore: { x: x0 + K.pad, y: oy + K.row / 2 }, bottom: oy + K.row + K.gap };
}

// ---- drawing ----
function campCruiserHudMake(sc, uiFontFn) {
  const K = CAMPCRUISERHUD, Z = campCruiserHudGeom(), mk = (p, size, color, ox) => sc.add.text(p.x, p.y, '', uiFontFn(size, color, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(ox, 0.5).setScrollFactor(0).setDepth(K.depth);
  const sh = Z.rows[0], hu = Z.rows[1];
  return {
    crShieldL: mk(sh.label, 11, K.ink.label, 0).setText(uiText('camp.cruiser.shield')), crShieldN: mk(sh.num, 12, K.ink.num, 1),
    crHullL: mk(hu.label, 11, K.ink.label, 0).setText(uiText('camp.cruiser.hull')), crHullN: mk(hu.num, 12, K.ink.num, 1),
    crOre: mk(Z.ore, 13, K.ink.ore, 0)
  };
}
function campCruiserHudPaint(g, H, C) {
  if (!g || !H || !H.crOre) return; // (a stand-in scene in a test has none)
  const K = CAMPCRUISERHUD, Z = campCruiserHudGeom(), S = campCruiserStatus(C), P = Z.plate;
  g.fillStyle(K.color.plate, K.plateAlpha).fillRect(P.x, P.y, P.w, P.h);
  [['shield', K.color.shield, 'crShieldN'], ['hull', K.color.hull, 'crHullN']].forEach(([id, col, num], i) => {
    const b = Z.rows[i].bar, d = S[id], w = b.x1 - b.x0, color = d.warn ? K.color.warn : col;
    g.fillStyle(K.color.off, 0.9).fillRect(b.x0, b.y0, w, b.y1 - b.y0);
    g.fillStyle(color, 1).fillRect(b.x0, b.y0, Math.max(0, w * d.frac), b.y1 - b.y0);
    g.lineStyle(1, K.color.edge, 0.4).strokeRect(b.x0, b.y0, w, b.y1 - b.y0);
    H[num].setText(String(d.n)).setColor(d.warn ? K.ink.warn : K.ink.num);
  });
  H.crOre.setText(campCruiserOreLine(S)).setColor(S.ore.full ? K.ink.full : K.ink.ore);
}
