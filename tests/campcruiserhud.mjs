// smoke: the S CRUISER corner at the top left: the status over its title (SHIELD bar, HULL bar), the ORE and MISSILES block over HOSTILES at the top right, the corner's title row, and the S list opening under it with no heading and no counter (plain Node, no Chrome)
// Card space-game-layout-cruiser (ORCH for Troy, 24 Nov 2026: "top left is what I command": the S list becomes the S CRUISER corner, and above its title sit a shield bar, a hull bar and the ore count, moved from the
// round gauges and the ore line at the top right). The code is src/campcruiserhud.js (own numbers, own words camp.cruiser.*, nothing from src/camphud.js), hooked in src/campaignscene.js.
//   A. the numbers: shield and hull as a share of their top, red at or under the low mark, the ore line, and the credits and the ships being mended
//   B. the places: inside the screen, as wide as a corner panel, lines one under another, the corner's title row right under the last line; the top right block (card space-game-ore-missiles-topright: ORE and MISSILES over HOSTILES) is its mirror
//      (tests/campmissilecost.mjs has the missile line and the R chip)
//   C. the words: four keys in a words file and in the table, a voicepack rule, the script loaded once
//   D. the drawing on stand-ins: a plate, two bars of the right widths and colours, the texts say the numbers; plain rectangles only; nothing drawn by a scene with no texts
//   E. the scene: it makes the texts into its HUD and paints them every frame; nothing of src/camphud.js is called from the new file
//   F. the corner: registered at the top left with the S chip and CRUISER; the S list opens under its title row, has no heading and no 1 / 7 counter, keeps a caption while it picks a target
// Run: node tests/campcruiserhud.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = () => campNew('home', [], { seed: 1, god: true });
  window.__stand = () => { const calls = [], rec = k => (...a) => { calls.push([k].concat(a)); return gg; }, gg = { calls, fillStyle: rec('fillStyle'), fillRect: rec('fillRect'), lineStyle: rec('lineStyle'), strokeRect: rec('strokeRect'), fillRoundedRect: rec('fillRoundedRect'), strokeRoundedRect: rec('strokeRoundedRect') };
    const tx = () => { const t = { text: '', color: '', setText(v) { t.text = String(v); return t; }, setColor(c) { t.color = c; return t; } }; return t; };
    return { gg, H: { crShieldL: tx(), crShieldN: tx(), crHullL: tx(), crHullN: tx(), crOre: tx(), crCash: tx() } }; };
`);

// ---- A. the numbers ----
{
  g.run(`window.C1 = __new(); C1.shield = campShieldMax(C1); C1.carrier.hp = C1.carrier.maxHp; C1.ore = 0; C1.cash = 0; C1.mends = [];`);
  const S = J('campCruiserStatus(C1)'), smax = J('campShieldMax(C1)'), hmax = J('C1.carrier.maxHp');
  check('a full shield and a full hull are 1 and say their numbers; neither is in warning', S.shield.frac === 1 && S.hull.frac === 1 && S.shield.n === Math.round(smax) && S.hull.n === Math.round(hmax) && !S.shield.warn && !S.hull.warn, JSON.stringify(S));
  g.run(`C1.shield = campShieldMax(C1) * 0.5; C1.carrier.hp = C1.carrier.maxHp * 0.25;`);
  const H = J('campCruiserStatus(C1)');
  check('half a shield is 0.5 and not in warning; a quarter of the hull is 0.25 and in warning (at or under 0.3)', Math.abs(H.shield.frac - 0.5) < 1e-9 && !H.shield.warn && Math.abs(H.hull.frac - 0.25) < 1e-9 && H.hull.warn, JSON.stringify(H));
  g.run(`C1.shield = campShieldMax(C1) * 0.3; C1.carrier.hp = C1.carrier.maxHp * 0.31;`);
  const E = J('campCruiserStatus(C1)');
  check('the mark is "at or under": 0.3 warns, 0.31 does not', E.shield.warn && !E.hull.warn, JSON.stringify(E));
  g.run(`C1.shield = -5; C1.carrier.hp = -3;`);
  const Z = J('campCruiserStatus(C1)');
  check('a shield or hull under zero reads 0, never a negative bar or number', Z.shield.frac === 0 && Z.hull.frac === 0 && Z.shield.n === 0 && Z.hull.n === 0, JSON.stringify(Z));
  g.run(`C1.ore = 87.9; C1.cash = 0; C1.mends = [];`);
  check('the ore line is the ore (whole) over the cap; with no credits and no mends the right side says nothing', J('campCruiserOreLine(campCruiserStatus(C1))') === 'ORE  87/' + J('CAMP.ore.cap') && J('campCruiserCashLine(campCruiserStatus(C1))') === '', J('campCruiserOreLine(campCruiserStatus(C1))'));
  g.run(`C1.cash = 40.6; C1.mends = [{}, {}];`);
  check('with credits and two ships being mended: the credits, then +2, on the right', J('campCruiserCashLine(campCruiserStatus(C1))') === 'CREDITS  40  +2', J('campCruiserCashLine(campCruiserStatus(C1))'));
  g.run(`C1.cash = 0; C1.mends = [{}];`);
  check('ships being mended with no credits: just +1', J('campCruiserCashLine(campCruiserStatus(C1))') === '+1');
  g.run(`C1.ore = CAMP.ore.cap;`);
  check('a full hold is marked full (the line turns amber)', J('campCruiserStatus(C1).ore.full') === true);
  g.run(`C1.ore = 10;`);
  check('a hold with room is not full', J('campCruiserStatus(C1).ore.full') === false);
}

// ---- B. the places ----
{
  const Z = J('campCruiserHudGeom()'), K = J('CAMPCRUISERHUD'), W = J('W'), T = J('CAMP.corner.at.tl'), cw = J('CAMP.corner.w'), Th = J('CAMP.corner.title.h');
  check('the block is in the top left corner, inside the screen, at the corner\'s left edge', Z.x0 === T.x && Z.y0 >= 0 && Z.x1 <= W / 2 && Z.y1 < 120, JSON.stringify(Z));
  check('it is as wide as a corner panel (its title row), so the corner is one column', Z.x1 - Z.x0 === cw, Z.x1 - Z.x0 + ' vs ' + cw);
  check('the shield line is above the hull line, each one line apart; the block has two lines (the ore and the missiles are at the top right now)', Z.rows[0].id === 'shield' && Z.rows[1].id === 'hull' && Z.rows[1].label.y - Z.rows[0].label.y === K.row && K.lines === 2 && Z.y1 - Z.y0 === 2 * K.row && Z.rows.length === 2);
  check('a bar is inside the plate, with room for its word at the left and its number at the right, and is at least 90 px long', Z.rows.every(r => r.bar.x0 >= Z.x0 + K.pad + K.label && r.bar.x1 <= Z.x1 - K.pad - K.num && r.bar.x1 - r.bar.x0 >= 90 && r.bar.y1 - r.bar.y0 === K.bar), JSON.stringify(Z.rows));
  check('the plate covers the two lines', Z.plate.x === Z.x0 && Z.plate.w === cw && Z.plate.y <= Z.rows[0].bar.y0 && Z.plate.y + Z.plate.h >= Z.rows[1].label.y + K.row / 2 - 1, JSON.stringify(Z.plate));
  check('the corner\'s title row starts right under the last line (the gap between): CAMP.corner.at.tl.y is the one number', Z.bottom === T.y && Z.y1 + K.gap === T.y && Z.bottom > Z.rows[1].label.y, Z.bottom + ' vs ' + T.y);
  const R = Z.right, Tr = J('CAMP.corner.at.tr'), colW = J('CAMP.hud.plate.w');
  check('the top right block is over the HOSTILES title row: at its left edge, as wide as a panel, inside the screen, ending the gap above it', R.x0 === Tr.x && R.x1 - R.x0 === cw && R.x1 <= W && R.y0 >= 0 && R.y1 + K.gap === Tr.y && R.bottom === Tr.y, JSON.stringify(R));
  check('it mirrors the top left block: the same height and the same lines, level with it (the two corners start at the same y)', R.y1 - R.y0 === Z.y1 - Z.y0 && R.y0 === Z.y0 && R.y1 === Z.y1 && R.plate.h === Z.plate.h && R.plate.y === Z.plate.y, JSON.stringify([R.plate, Z.plate]));
  check('the ore line is above the missiles line, each one line apart; the credits are on the ore line\'s right, the state on the missiles line\'s right', R.mis.y - R.ore.y === K.row && R.cash.y === R.ore.y && R.misWhy.y === R.mis.y && R.cash.x === R.x1 - K.pad && R.misWhy.x === R.x1 - K.pad && R.mis.x === R.ore.x, JSON.stringify(R));
  check('the plate covers the two lines', R.plate.x === R.x0 && R.plate.w === cw && R.plate.y <= R.ore.y - K.row / 2 && R.plate.y + R.plate.h >= R.mis.y + K.row / 2, JSON.stringify(R.plate));
  check('the top right block does not meet the top centre column (the plate of the wave and objective lines is W / 2 and 280 px either side)', R.x0 >= W / 2 + colW / 2 && Z.x1 <= W / 2 - colW / 2 + 100, JSON.stringify([R.x0, W / 2 + colW / 2, Z.x1, W / 2 - colW / 2]));
  check('the ore on the left and the credits on the right fit one line of the block without meeting (the longest: "ORE  300/300" and "CREDITS  9999  +9"; a capital takes K.charW.caps of its font size, measured in the picture: 129 px for 16 characters at 13)', (() => { const c = K.charW, l = 'ORE  300/300'.length * c.caps * K.font.line, r = 'CREDITS  9999  +9'.length * c.caps * K.font.side; return R.ore.x + l + 8 < R.cash.x - r; })(), JSON.stringify([R.ore, R.cash]));
  }

// ---- C. the words and the files ----
{
  const keys = ['camp.cruiser.shield', 'camp.cruiser.hull', 'camp.cruiser.ore', 'camp.cruiser.credits'], md = src('content/text/campaign-cruiser.md'), ct = src('src/contenttables.js'), vp = src('src/voicepack.js'), html = src('index.html');
  check('the four words are in the words file and in the table with the same text', keys.every(k => { const m = md.match(new RegExp('\\| ' + k.replace(/\./g, '\\.') + ' \\| (.+?) \\|')), t = ct.match(new RegExp("'" + k.replace(/\./g, '\\.') + "': '(.+?)'")); return m && t && m[1] === t[1]; }));
  check('they read SHIELD, HULL, ORE, CREDITS', J('[uiText("camp.cruiser.shield"), uiText("camp.cruiser.hull"), uiText("camp.cruiser.ore"), uiText("camp.cruiser.credits")]').join() === 'SHIELD,HULL,ORE,CREDITS');
  check('each key is in no other words file (no key was reused)', keys.every(k => (md.split('| ' + k + ' |').length === 2) && ['content/text/campaign-gauges.md', 'content/text/campaign.md', 'content/text/campaign-rim.md'].every(f => !src(f).includes('| ' + k + ' |'))));
  check('the voicepack says they are shown, not said', /camp\\\.cruiser\\\./.test(vp));
  check('index.html loads src/campcruiserhud.js once', html.split('src/campcruiserhud.js').length === 2);
}

// ---- D. the drawing on stand-ins ----
{
  g.run(`window.C2 = __new(); C2.shield = campShieldMax(C2) * 0.5; C2.carrier.hp = C2.carrier.maxHp; C2.ore = 55; C2.cash = 0; C2.mends = []; window.ST = __stand(); campCruiserHudPaint(ST.gg, ST.H, C2);`);
  const calls = J('ST.gg.calls'), H = J('ST.H'), Z = J('campCruiserHudGeom()'), K = J('CAMPCRUISERHUD');
  const rects = calls.filter(c => c[0] === 'fillRect');
  check('it draws the two plates (the top left one and the top right one) and, for each of the two bars, a back and a fill (six filled rectangles) and strokes both bars', rects.length === 6 && calls.filter(c => c[0] === 'strokeRect').length === 2 && rects[0][1] === Z.plate.x && rects[1][1] === Z.right.plate.x, rects.length);
  const sh = Z.rows[0].bar, w = sh.x1 - sh.x0;
  check('the shield fill is half the bar wide, from the bar\'s left', rects[3][1] === sh.x0 && Math.abs(rects[3][3] - w * 0.5) < 1e-6, JSON.stringify(rects));
  check('the hull is full: its fill is the whole bar', Math.abs(rects[5][3] - (Z.rows[1].bar.x1 - Z.rows[1].bar.x0)) < 1e-6, JSON.stringify(rects[5]));
  check('the texts say the numbers: shield, hull, and the ore line', H.crShieldN.text === String(Math.round(J('C2.shield'))) && H.crHullN.text === String(Math.round(J('C2.carrier.hp'))) && H.crOre.text === 'ORE  55/' + J('CAMP.ore.cap') && H.crCash.text === '', JSON.stringify(H));
  check('a bar in warning is drawn red and its number is red', (() => { g.run(`C2.carrier.hp = C2.carrier.maxHp * 0.1; ST = __stand(); campCruiserHudPaint(ST.gg, ST.H, C2);`); const cs = J('ST.gg.calls').filter(c => c[0] === 'fillStyle'); return cs.some(c => c[1] === K.color.warn) && J('ST.H.crHullN.color') === K.ink.warn && J('ST.H.crShieldN.color') === K.ink.num; })());
  check('no rounded frame is drawn by the plates and the bars (a rounded rectangle is triangulated again on every render); the one rounded shape is the R chip, on a Graphics of its own that is drawn again only when its letter changes', !J('ST.gg.calls').some(c => /Rounded/.test(c[0])) && (src('src/campcruiserhud.js').replace(/\/\/.*$/gm, '').match(/Rounded/g) || []).length === 1 && /H\.crChipK !== k/.test(src('src/campcruiserhud.js')));
  check('a scene with none of the texts draws nothing and does not throw', (() => { g.run(`ST = __stand(); campCruiserHudPaint(ST.gg, {}, C2); campCruiserHudPaint(ST.gg, null, C2);`); return J('ST.gg.calls').length === 0; })());
}

// ---- E. the scene and the old gauges ----
{
  const own = src('src/campcruiserhud.js').replace(/\/\/.*$/gm, ''), sc = src('src/campaignscene.js');
  check('the new file calls nothing of src/camphud.js (campHudGeom, campGauges, campHullBar, CAMP_GAUGE, hud.ore): the gauges can go without it', !/campHudGeom|campGauges|campHullBar|CAMP_GAUGE|CAMP\.hud\.ore|hud\.ore/.test(own));
  check('the scene makes the texts into its HUD (so a result card hides them) and paints them every frame', /Object\.assign\(this\.hud, campCruiserHudMake\(this, uiFont\)\)/.test(sc) && /campCruiserHudPaint\(g, this\.hud, C\)/.test(sc));
  check('the six texts are the HUD\'s own keys, none of the keys the HUD already has', (() => { const k = ['crShieldL', 'crShieldN', 'crHullL', 'crHullN', 'crOre', 'crCash']; return k.every(x => (sc.match(new RegExp('\\b' + x + '\\b', 'g')) || []).length === 0) && /crShieldL.*crShieldN.*crHullL.*crHullN.*crOre.*crCash/s.test(src('src/campcruiserhud.js')); })());
}
// ---- F. the corner and the S list under it ----
g.run(`
  window.__all = [];
  window.__mkobj = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, gone: false, color: '', width: 100, height: 20, visible: true };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : () => px) });
    o.setText = v => { o.t = v; return px; }; o.setColor = v => { o.color = v; return px; }; o.destroy = () => { o.gone = true; }; o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.setVisible = v => { o.visible = v; return px; };
    __all.push(px); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), time: { now: 0 }, add: { rectangle: (x, y) => __mkobj('rect', x, y), graphics: () => __mkobj('g'), text: (x, y, t) => __mkobj('text', x, y, t) },
    input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off() {} }, events: { once() {} } }; s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
`);
{
  const T = J('CAMP.corner.at.tl'), Th = J('CAMP.corner.title.h'), gap = J('CAMP.corner.gap'), B = J('CAMPPANELS_LOOK.box');
  const def = J('campCornerDef("cruiser")');
  check('the cruiser corner is registered once, at the top left, with CRUISER for its title', def && def.at === 'tl' && def.title === 'camp.corner.cruiser' && J('CAMP_CORNERS.filter(d => d.id === "cruiser").length') === 1 && J('uiText("camp.corner.cruiser")') === 'CRUISER', JSON.stringify(def));
  const N = J('campCornerNow(campNew("home", [], { seed: 1, god: true }), "cruiser")');
  check('its title row has the S chip (the zoom-reset key\'s cap from the key table), the title CRUISER, no selection and no details of its own', N && N.chips.join() === J('CAMP_KEYS.zoomreset.k') && N.chips.join() === 'S' && N.title === 'CRUISER' && N.selection === '' && N.items.length === 0, JSON.stringify(N));
  check('the S key opens the corner (campCornerKey) and the S list: the same key, the one table', J('CAMP_KEYS.zoomreset.codes.includes("KeyS")') && J('campPanelDef("cruiser").code') === 'KeyS' && J('campPanelDef("cruiser").corner') === 'tl');
  const G = J('campPanelsGeometry(campPanelDef("cruiser"), 5)');
  check('the S list opens right under the corner\'s title row (its gap), at the title row\'s left, with no heading', G.x === T.x && G.y === T.y + Th + gap && G.head.h === 0 && G.w === B.w, JSON.stringify(G));
  const G0 = J('(() => { const q = campPanelsGeometry(campPanelDef("cruiser"), 5); return { r0: q.rowY(0), list: q.list, y: q.y }; })()');
  check('rows start CAMPPANELS_LOOK.box.pad under the box\'s top; the box is as tall as its rows, pads and foot', G0.r0 === G0.y + B.pad && J('campPanelsGeometry(campPanelDef("cruiser"), 5).h') === B.pad + 5 * (B.row + B.gap) - B.gap + B.pad + B.foot, JSON.stringify(G0));
  const Gp = J('campPanelsGeometry(campPanelDef("cruiser"), 5, true)');
  check('while it picks a target the caption band comes back (PICK A TARGET), and the rows go down by it', Gp.head.h === B.capt && Gp.h === G.h + B.capt && Gp.y === G.y, JSON.stringify([G.h, Gp.h]));
  const Gr = J('campPanelsGeometry(campPanelDef("yard"), 5)'), Gf = J('campPanelsGeometry(campPanelDef("convoy"), 5)');
  check('the other lists keep their own places and headings (the dock list at the right under the top, the convoy list at the left edge)', Gr.head.h === B.head && Gf.head.h === B.head && Gf.y === J('CAMPPANELS_LOOK.top') && Gf.x === J('CAMPPANELS_LOOK.edge'), JSON.stringify([Gr.head, Gf.head]));
  g.run(`window.S = __scene(); campPanelsInstall(S); S.mode = 'play'; campPanelsPaint(S, 1000);`);
  check('with no key pressed the list is not drawn at all (the corner\'s title row is the corner panel\'s)', J('S.pnl.title.visible') === false && J('S.pnl.count.visible') === false && J('S.pnl.rows.every(r => !r.name.visible)'));
  g.run(`campPanelKey(S.pn, S.camp, 'KeyS', 1000); campPanelsPaint(S, 1000);`);
  check('S opens the list: its rows are drawn, with no heading text and no 1 / 7 counter', J('campPanelOpen(S.pn)') === 'cruiser' && J('S.pnl.rows.filter(r => r.name.visible).length') >= 3 && J('S.pnl.title.visible') === false && J('S.pnl.count.visible') === false, J('S.pnl.rows.filter(r => r.name.visible).map(r => r.name.t).join("|")'));
  const rows = J('S.pnl.rows.filter(r => r.name.visible).map(r => r.name.y)');
  check('the first row is drawn inside the box, under the title row', rows[0] > T.y + Th + gap && rows[0] < T.y + Th + gap + B.pad + B.row, JSON.stringify([rows[0], T.y + Th]));
  check('a click on a row of the list is still the list\'s (over, click)', J('campPanelsOver(S, ' + (T.x + 40) + ', ' + (Math.round(rows[0])) + ')') === true && J('campPanelsOver(S, ' + (T.x + 40) + ', ' + (T.y + 4) + ')') === false);
  const BX = J('campBoxDx(S, true)');
  check('the bottom left corner needs no step aside: the list ends well above it', BX === 0, BX);
  g.run(`S.pn.touch = 0; campPanelsPaint(S, 1000 + CAMP_PANELS.anim.idle + CAMP_PANELS.anim.out + 10);`);
  check('untouched, the list fades and closes: back to the title row alone', J('campPanelOpen(S.pn)') === '' && J('S.pnl.rows.every(r => !r.name.visible)'));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCRUISER STATUS HUD FAIL (${failed} of ${n})` : `\nCRUISER STATUS HUD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
