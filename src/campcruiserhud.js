// ---------- The cruiser's status: SHIELD and HULL over the Q CRUISER corner (top left), ORE and MISSILES over the HOSTILES corner (top right) (cards space-game-layout-cruiser, space-game-ore-missiles-topright; Troy, 24 Nov 2026) ----------
// "Top left is what I command": the Q CRUISER corner. Its title row (the Q key-cap chip and CRUISER: the shared corner panel, src/campcorner.js) never leaves; the Q list opens under it and fades back to it (src/campanelsdraw.js).
// ABOVE the Q CRUISER title sit the cruiser's SHIELD bar and HULL bar (they were the round gauges at the top right). ABOVE the HOSTILES title, at the top right, a block of the same size and the same rows sits level with it (a mirror:
// card space-game-ore-missiles-topright): the ORE count (with the credits and the ships being mended, when there are some) and the MISSILES count (card space-game-missiles-cost-ore: it was bottom left, under FLEET; with how long the
// next one takes to build, or no ore when that is why none is) and the R key cap beside it, the same chip as the corners' (a rounded cyan cap with a dark bold letter, CAMP.corner.title.chipW by chipH).
// This file has its own numbers and its own words (camp.cruiser.*) and calls nothing in src/camphud.js, so the gauges can go without it. The corners' places are CAMP.corner.at.tl and .tr (src/campaign.js): the title row's top is there and the status
// block is drawn right above it, as wide as a corner panel (CAMP.corner.w), the two blocks level.
//   campCruiserStatus(C)       the numbers (pure): { shield: { frac, n, warn }, hull: { frac, n, warn }, ore: { n, cap, full, cash, mends }, missiles: { n, cap, state, secs, rack, cost } }  (missiles.state: campMissileState, src/campmissilebuild.js)
//   campCruiserOreLine(S)      the ore, left: "ORE  120/300";  campCruiserCashLine(S) the credits and the ships being mended, right: "CREDITS  40  +2" ('' for none)
//   campCruiserMissileKey()    the letter of the R chip beside the count (CAMP_KEYS.reload.k); the chip follows the end of the line's words (campCruiserChipX)
//   campCruiserChipX(Z, w)     where the chip's centre is: right of the line's words (w px wide) with a gap, never left of the geometry's own place (pure)
//   campCruiserMissileLine(S)  the missiles, left: "MISSILES  4/6", or "MISSILES  4/6 +2" with two on their way (R queues one a press: the queue and the one being built);  campCruiserMissileWhy(S) the state, right: "building 12 s", "no ore" or ''
//   campCruiserHudGeom()       the places (pure), in screen px: { x0, y0, x1, y1, plate, rows: [{ id, label, num, bar }], bottom, right: { x0, y0, x1, y1, plate, ore, cash, mis, misKey, misWhy, bottom } }  (the top left block: shield and hull; right: the top right block over HOSTILES; bottom: the title row's top)
//   campCruiserHudMake(sc, uiFontFn)   the texts, made once (keys crShieldL, crShieldN, crHullL, crHullN, crOre, crCash, crMis, crMisKey, crMisWhy, and the R chip's own Graphics crChipG: put them in the scene's HUD, so hiding the HUD hides them)
//   campCruiserHudPaint(g, H, C)       every frame: the two plates and the bars on the Graphics `g`, the words in the texts of H (the scene's HUD); the R chip is drawn again only when its letter changes
// The words are at depth 101, over the scene's HUD graphics (100: the plates and the bars): at 65 they were under the plates, which dimmed them, and under the R chip's rectangle, which hid its letter (a blank cyan square).
// Plain rectangles only: a rounded frame is triangulated again on every render (card space-game-perf-after-keys).
const CAMPCRUISERHUD = {
  pad: 8, label: 50, num: 36,          // px: the room inside the plate at each side, the words at the left of a bar and the number at its right
  row: 20, bar: 9, gap: 4, lines: 2,   // px: the step between lines (20: the R key cap, 18 high, fits a line of the right block; the left one has the same), a bar's height, and the room between the last line and the title row under it; lines: how many in each block (left: shield, hull; right: ore, missiles)
  low: 0.3,                            // a bar at or under this share turns red
  font: { line: 12, side: 11 }, charW: { caps: 0.62, low: 0.55 }, // px: the ore and missiles lines, and the credits and the state at their right; what a character takes of its font size, in capitals (a line: measured 129 px for 16 characters at 13) and in lower case (the state), for a text with no width of its own (a test's stand-in)
  chip: { x: 118, r: 4, gap: 8 },              // the R key-cap chip beside the missile count (Troy, 24 Nov 2026: "show the R chip beside the missile count"): its centre this far right of the line's left edge when no missile is on its way (after "MISSILES  12/12", before the state at the right), its corner radius, and the gap after the words when the queue makes them longer; its size and fill are the corner chips' (CAMP.corner.title.chipW and chipH, CAMP.corner.chip)
  color: { shield: 0x7fe9ff, hull: 0x6dff9c, warn: 0xff4d6d, off: 0x16293d, edge: 0x38e1ff, plate: 0x02060d },
  ink: { label: '#9fbdd1', num: '#ffffff', warn: '#ff4d6d', ore: '#ffd37a', full: '#ffb454', mis: '#ffb454', misWhy: '#9fe9ff', chip: '#02101c' },
  plateAlpha: 0.55, depth: 101         // the words (the scene's HUD graphics are at 100, the R chip's at 100.5, the lists at 160)
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
const campCruiserMissileLine = S => uiText('camp.cruiser.missiles') + '  ' + S.missiles.n + '/' + S.missiles.cap + (S.missiles.pending > 0 ? ' +' + S.missiles.pending : ''); // the missiles on their way follow the count (card space-game-missile-queue): MISSILES  3/6 +2 (the queue and the one being built)
const campCruiserMissileWhy = S => S.missiles.state === 'building' ? uiText('camp.cruiser.building', { s: S.missiles.secs }) : S.missiles.state === 'noore' ? uiText('camp.cruiser.noore') : ''; // what is going on with the rack: a build under way (the seconds), or no ore when that is why it is at zero
// the credits when there are some (what the outposts paid, and what the save brought: card space-game-credits-apart-from-ore) and +n for the ships being mended
const campCruiserCashLine = S => (S.ore.cash > 0 ? uiText('camp.cruiser.credits') + '  ' + S.ore.cash : '') + (S.ore.mends > 0 ? (S.ore.cash > 0 ? '  ' : '') + '+' + S.ore.mends : '');

// where the R chip's centre stands: after the words of the missiles line (they grow with the queue: "MISSILES  3/6 +2"), a few px off them, and never left of the place the geometry gives it (a line with no queue)
const campCruiserChipX = (Z, w) => Math.max(Z.right.misKey.x, Math.round(Z.right.mis.x + w + CAMPCRUISERHUD.chip.gap + CAMP.corner.title.chipW / 2));

// ---- the places (pure) ----
function campCruiserHudGeom() {
  const K = CAMPCRUISERHUD, T = CAMP.corner.at.tl, R = CAMP.corner.at.tr, w = CAMP.corner.w, h = K.lines * K.row, x0 = T.x, x1 = x0 + w, y0 = T.y - K.gap - h;
  const rows = ['shield', 'hull'].map((id, i) => {
    const y = y0 + i * K.row, by = y + Math.round((K.row - K.bar) / 2);
    return { id, label: { x: x0 + K.pad, y: y + K.row / 2 }, num: { x: x1 - K.pad, y: y + K.row / 2 }, bar: { x0: x0 + K.pad + K.label, y0: by, x1: x1 - K.pad - K.num, y1: by + K.bar } };
  });
  const rx0 = R.x, rx1 = rx0 + w, ry0 = R.y - K.gap - h, oy = ry0, my = ry0 + K.row; // the top right block: the same width, rows and gap over the HOSTILES row, level with the left one when the two corners are
  const right = { x0: rx0, y0: ry0, x1: rx1, y1: ry0 + h, plate: { x: rx0, y: ry0 - 4, w, h: h + 4 }, ore: { x: rx0 + K.pad, y: oy + K.row / 2 }, cash: { x: rx1 - K.pad, y: oy + K.row / 2 }, mis: { x: rx0 + K.pad, y: my + K.row / 2 }, misKey: { x: rx0 + K.pad + K.chip.x, y: my + K.row / 2 }, misWhy: { x: rx1 - K.pad, y: my + K.row / 2 }, bottom: R.y };
  return { x0, y0, x1, y1: y0 + h, plate: { x: x0, y: y0 - 4, w, h: h + 4 }, rows, bottom: T.y, right };
}

// ---- drawing ----
function campCruiserHudMake(sc, uiFontFn) {
  const K = CAMPCRUISERHUD, Z = campCruiserHudGeom(), mk = (p, size, color, ox) => sc.add.text(p.x, p.y, '', uiFontFn(size, color, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(ox, 0.5).setScrollFactor(0).setDepth(K.depth);
  const sh = Z.rows[0], hu = Z.rows[1];
  return {
    crShieldL: mk(sh.label, 11, K.ink.label, 0).setText(uiText('camp.cruiser.shield')), crShieldN: mk(sh.num, 12, K.ink.num, 1),
    crHullL: mk(hu.label, 11, K.ink.label, 0).setText(uiText('camp.cruiser.hull')), crHullN: mk(hu.num, 12, K.ink.num, 1),
    crOre: mk(Z.right.ore, K.font.line, K.ink.ore, 0), crCash: mk(Z.right.cash, K.font.side, K.ink.ore, 1),
    crMis: mk(Z.right.mis, K.font.line, K.ink.mis, 0), crMisWhy: mk(Z.right.misWhy, K.font.side, K.ink.misWhy, 1),
    crChipG: sc.add.graphics().setScrollFactor(0).setDepth(K.depth - 0.5), // the R key cap, drawn again only when its letter changes
    crMisKey: sc.add.text(Z.right.misKey.x, Z.right.misKey.y, '', uiFontFn(12, K.ink.chip, { fontStyle: 'bold' })).setOrigin(0.5).setScrollFactor(0).setDepth(K.depth) // the letter as the corner chips' (dark, bold, no stroke)
  };
}
function campCruiserHudPaint(g, H, C) {
  if (!g || !H || !H.crOre) return; // (a stand-in scene in a test has none)
  const K = CAMPCRUISERHUD, Z = campCruiserHudGeom(), S = campCruiserStatus(C), P = Z.plate, Q = Z.right.plate;
  const hideL = typeof campPageHudHides === 'function' && campPageHudHides('status'); // the page HUD has the shield and hull (card space-game-page-hud): the left plate, its bars and words are not drawn
  ['crShieldL', 'crShieldN', 'crHullL', 'crHullN'].forEach(k => { if (H[k] && typeof H[k].setVisible === 'function' && H[k].visible !== !hideL) H[k].setVisible(!hideL); });
  const hideR = typeof campPageHudHides === 'function' && campPageHudHides('stock'); // the page HUD has the ore and missiles (landing 2)
  ['crOre', 'crCash', 'crMis', 'crMisWhy', 'crMisKey', 'crChipG'].forEach(k => { if (H[k] && typeof H[k].setVisible === 'function' && H[k].visible !== !hideR) H[k].setVisible(!hideR); });
  g.fillStyle(K.color.plate, K.plateAlpha); if (!hideL) g.fillRect(P.x, P.y, P.w, P.h); if (!hideR) g.fillRect(Q.x, Q.y, Q.w, Q.h);
  if (!hideL) [['shield', K.color.shield, 'crShieldN'], ['hull', K.color.hull, 'crHullN']].forEach(([id, col, num], i) => {
    const b = Z.rows[i].bar, d = S[id], w = b.x1 - b.x0, color = d.warn ? K.color.warn : col;
    g.fillStyle(K.color.off, 0.9).fillRect(b.x0, b.y0, w, b.y1 - b.y0);
    g.fillStyle(color, 1).fillRect(b.x0, b.y0, Math.max(0, w * d.frac), b.y1 - b.y0);
    g.lineStyle(1, K.color.edge, 0.4).strokeRect(b.x0, b.y0, w, b.y1 - b.y0);
    H[num].setText(String(d.n)).setColor(d.warn ? K.ink.warn : K.ink.num);
  });
  H.crOre.setText(campCruiserOreLine(S)).setColor(S.ore.full ? K.ink.full : K.ink.ore);
  if (H.crCash) H.crCash.setText(campCruiserCashLine(S));
  if (H.crMis) H.crMis.setText(campCruiserMissileLine(S)).setColor(S.missiles.n > 0 ? K.ink.mis : K.ink.warn); // red at 0, as the old count was
  if (H.crMisKey) { // the R key cap: the same chip as the corners' (rounded, cyan, a dark bold letter), on a Graphics of its own that is drawn again only when the letter changes; no key for it, no chip and no letter
    const key = campCruiserMissileKey(), w = (H.crMis && H.crMis.width) || campCruiserMissileLine(S).length * K.charW.caps * K.font.line, c = { x: campCruiserChipX(Z, w), y: Z.right.misKey.y }; H.crMisKey.setText(key).setPosition(c.x, c.y); // (a stand-in text has no width: the estimate of K.charW)
    if (H.crChipG) { const k = key ? key + '@' + c.x + ',' + c.y : ''; if (H.crChipK !== k) { H.crChipK = k; const T = CAMP.corner.title; H.crChipG.clear(); if (key) H.crChipG.fillStyle(CAMP.corner.chip, 0.95).fillRoundedRect(c.x - T.chipW / 2, c.y - T.chipH / 2, T.chipW, T.chipH, K.chip.r); } }
  }
  if (H.crMisWhy) H.crMisWhy.setText(campCruiserMissileWhy(S)).setColor(S.missiles.state === 'noore' ? K.ink.warn : K.ink.misWhy);
}

// ---- the corner itself: the title row is the shared corner panel's (src/campcorner.js); its S chip is the zoom-reset key's (src/data_controls.js), which also opens the Q list; no selection and no details of its own: the list is the details (src/campanelsdraw.js) ----
campCornerAdd({ id: 'cruiser', at: 'tl', part: 'a', keys: ['zoomreset'], title: 'camp.corner.cruiser', selection: () => '', rows: () => [] });
