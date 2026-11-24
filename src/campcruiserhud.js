// ---------- The S CRUISER corner's status, at the top left (card space-game-layout-cruiser; Troy, 24 Nov 2026) ----------
// "Top left is what I command": the S CRUISER corner. Its title row (the S key-cap chip and CRUISER: the shared corner panel, src/campcorner.js) never leaves; the S list opens under it and fades back to it (src/campanelsdraw.js).
// ABOVE the title sit the cruiser's status: a SHIELD bar, a HULL bar, the ORE count (with the credits and the ships being mended, when there are some) and the MISSILES count (card space-game-missiles-cost-ore: it was bottom left,
// under FLEET; with how long the next one takes to build, or no ore when that is why none is). They were the shield and hull of the round gauges and the ore line at the top right.
// This file has its own numbers and its own words (camp.cruiser.*) and calls nothing in src/camphud.js, so the gauges can go without it. The corner's place is CAMP.corner.at.tl (src/campaign.js): the title row's top is there and the status
// block is drawn right above it, as wide as a corner panel (CAMP.corner.w).
//   campCruiserStatus(C)       the numbers (pure): { shield: { frac, n, warn }, hull: { frac, n, warn }, ore: { n, cap, full, cash, mends }, missiles: { n, cap, state, secs, rack, cost } }  (missiles.state: campMissileState, src/campmissilebuild.js)
//   campCruiserOreLine(S)      the ore, left: "ORE  120/300";  campCruiserCashLine(S) the credits and the ships being mended, right: "CREDITS  40  +2" ('' for none)
//   campCruiserMissileKey()    the letter of the R chip beside the count (CAMP_KEYS.reload.k)
//   campCruiserMissileLine(S)  the missiles, left: "MISSILES  4/6";  campCruiserMissileWhy(S) the state, right: "building 12 s", "no ore" or ''
//   campCruiserHudGeom()       the places (pure), in screen px: { x0, y0, x1, y1, plate, rows: [{ id, label, num, bar }], ore, cash, mis, misKey, misWhy, bottom }  (bottom: the title row's top)
//   campCruiserHudMake(sc, uiFontFn)   the texts, made once (keys crShieldL, crShieldN, crHullL, crHullN, crOre, crCash, crMis, crMisKey, crMisWhy: put them in the scene's HUD, so hiding the HUD hides them)
//   campCruiserHudPaint(g, H, C)       every frame: the plate and the bars on the Graphics `g`, the words in the texts of H (the scene's HUD)
// Plain rectangles only: a rounded frame is triangulated again on every render (card space-game-perf-after-keys).
const CAMPCRUISERHUD = {
  pad: 8, label: 50, num: 36,          // px: the room inside the plate at each side, the words at the left of a bar and the number at its right
  row: 16, bar: 9, gap: 4, lines: 4,   // px: the step between lines, a bar's height, and the room between the last line and the title row under it; lines: how many (shield, hull, ore, missiles)
  low: 0.3,                            // a bar at or under this share turns red
  chip: { x: 118, w: 16, h: 12 },      // the R key-cap chip beside the missile count (Troy, 24 Nov 2026: "show the R chip beside the missile count"): its centre this far right of the line's left edge (after "MISSILES  12/12", before the state at the right), its size
  color: { shield: 0x7fe9ff, hull: 0x6dff9c, warn: 0xff4d6d, off: 0x16293d, edge: 0x38e1ff, plate: 0x02060d, chip: 0x7fe9ff },
  ink: { label: '#9fbdd1', num: '#ffffff', warn: '#ff4d6d', ore: '#ffd37a', full: '#ffb454', mis: '#ffb454', misWhy: '#9fe9ff', chip: '#02101c' },
  plateAlpha: 0.55, depth: 65          // (the corner panels are at CAMP.corner.depth 64: the status is over the edge arrows, under the lists)
};

// ---- the numbers (pure) ----
function campCruiserStatus(C) {
  const c = C.carrier, K = CAMPCRUISERHUD, smax = campShieldMax(C), sf = smax > 0 ? Math.max(0, Math.min(1, C.shield / smax)) : 0, hf = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
  return {
    shield: { frac: sf, n: Math.max(0, Math.round(C.shield)), warn: sf <= K.low },
    hull: { frac: hf, n: Math.max(0, Math.round(c.hp)), warn: hf <= K.low },
    ore: { n: Math.floor(C.ore), cap: CAMP.ore.cap, full: C.ore >= CAMP.ore.cap, cash: C.cash > 0 ? Math.floor(C.cash) : 0, mends: C.mends ? C.mends.length : 0 },
    missiles: campMissileState(C)
  };
}
const campCruiserOreLine = S => uiText('camp.cruiser.ore') + '  ' + S.ore.n + '/' + S.ore.cap;
const campCruiserMissileKey = () => (typeof CAMP_KEYS === 'object' && CAMP_KEYS.reload && CAMP_KEYS.reload.codes.length ? CAMP_KEYS.reload.k : ''); // the key that builds missiles (R), from the key table; '' when no key has it
const campCruiserMissileLine = S => uiText('camp.cruiser.missiles') + '  ' + S.missiles.n + '/' + S.missiles.cap;
const campCruiserMissileWhy = S => S.missiles.state === 'building' ? uiText('camp.cruiser.building', { s: S.missiles.secs }) : S.missiles.state === 'noore' ? uiText('camp.cruiser.noore') : ''; // what is going on with the rack: a build under way (the seconds), or no ore when that is why it is at zero
// the credits when there are some (what the outposts paid, and what the save brought: card space-game-credits-apart-from-ore) and +n for the ships being mended
const campCruiserCashLine = S => (S.ore.cash > 0 ? uiText('camp.cruiser.credits') + '  ' + S.ore.cash : '') + (S.ore.mends > 0 ? (S.ore.cash > 0 ? '  ' : '') + '+' + S.ore.mends : '');

// ---- the places (pure) ----
function campCruiserHudGeom() {
  const K = CAMPCRUISERHUD, T = CAMP.corner.at.tl, w = CAMP.corner.w, x0 = T.x, x1 = x0 + w, y0 = T.y - K.gap - K.lines * K.row;
  const rows = ['shield', 'hull'].map((id, i) => {
    const y = y0 + i * K.row, by = y + Math.round((K.row - K.bar) / 2);
    return { id, label: { x: x0 + K.pad, y: y + K.row / 2 }, num: { x: x1 - K.pad, y: y + K.row / 2 }, bar: { x0: x0 + K.pad + K.label, y0: by, x1: x1 - K.pad - K.num, y1: by + K.bar } };
  });
  const oy = y0 + 2 * K.row, my = y0 + 3 * K.row;
  return { x0, y0, x1, y1: y0 + K.lines * K.row, plate: { x: x0, y: y0 - 4, w, h: K.lines * K.row + 4 }, rows, ore: { x: x0 + K.pad, y: oy + K.row / 2 }, cash: { x: x1 - K.pad, y: oy + K.row / 2 }, mis: { x: x0 + K.pad, y: my + K.row / 2 }, misKey: { x: x0 + K.pad + K.chip.x, y: my + K.row / 2 }, misWhy: { x: x1 - K.pad, y: my + K.row / 2 }, bottom: T.y };
}

// ---- drawing ----
function campCruiserHudMake(sc, uiFontFn) {
  const K = CAMPCRUISERHUD, Z = campCruiserHudGeom(), mk = (p, size, color, ox) => sc.add.text(p.x, p.y, '', uiFontFn(size, color, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(ox, 0.5).setScrollFactor(0).setDepth(K.depth);
  const sh = Z.rows[0], hu = Z.rows[1];
  return {
    crShieldL: mk(sh.label, 11, K.ink.label, 0).setText(uiText('camp.cruiser.shield')), crShieldN: mk(sh.num, 12, K.ink.num, 1),
    crHullL: mk(hu.label, 11, K.ink.label, 0).setText(uiText('camp.cruiser.hull')), crHullN: mk(hu.num, 12, K.ink.num, 1),
    crOre: mk(Z.ore, 13, K.ink.ore, 0), crCash: mk(Z.cash, 12, K.ink.ore, 1),
    crMis: mk(Z.mis, 13, K.ink.mis, 0), crMisKey: mk(Z.misKey, 11, K.ink.chip, 0.5), crMisWhy: mk(Z.misWhy, 12, K.ink.misWhy, 1)
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
  if (H.crCash) H.crCash.setText(campCruiserCashLine(S));
  if (H.crMis) H.crMis.setText(campCruiserMissileLine(S)).setColor(S.missiles.n > 0 ? K.ink.mis : K.ink.warn); // red at 0, as the old count was
  if (H.crMisKey) { const key = campCruiserMissileKey(), c = Z.misKey; H.crMisKey.setText(key); if (key) g.fillStyle(K.color.chip, 1).fillRect(c.x - K.chip.w / 2, c.y - K.chip.h / 2, K.chip.w, K.chip.h); } // the R key cap: a plain rectangle and its letter (a stand-in scene has no text for it: nothing is drawn)
  if (H.crMisWhy) H.crMisWhy.setText(campCruiserMissileWhy(S)).setColor(S.missiles.state === 'noore' ? K.ink.warn : K.ink.misWhy);
}

// ---- the corner itself: the title row is the shared corner panel's (src/campcorner.js); its S chip is the zoom-reset key's (src/data_controls.js), which also opens the S list; no selection and no details of its own: the list is the details (src/campanelsdraw.js) ----
campCornerAdd({ id: 'cruiser', at: 'tl', keys: ['zoomreset'], title: 'camp.corner.cruiser', selection: () => '', rows: () => [] });
