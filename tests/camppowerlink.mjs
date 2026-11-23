// smoke: the power list and the gauges are one picture: the gauges at the top right, the power list right under them, each pip row carrying its system's pip bar (the gauge's twin), the highlighted row framing its gauge (plain Node, no Chrome)
// Card space-game-power-presets (Troy, 22 Nov 2026: "pips move one at a time ... the sub-list opens right beside or under the top-right gauges, each row shows the same pip bar as its gauge, aligned or joined to it, both lighting together on Enter;
// the highlighted row highlights its gauge"). J K L and ; are as they were (one pip a press, balance); only the look of the power list and where the gauges are changed.
//   A. where: the gauges' block ends at the screen's right edge (8 px), the right-hand lists open right under it, the target display (the radar's old place) is at the bottom right, nothing at the top left
//   B. the power list's three pip rows: a bar of four boxes each, under the weapons gauge's bar (one column), as many lit as the system has pips, in the gauge's own colour; the balance and the emergency rows have none
//   C. both light together: the same animation: after Enter on a row the gauge's bar and the row's bar flash white on the same segment, and ease to the new pips together
//   D. the highlighted row frames its gauge (and a line runs from it to the list), the others and a closed list frame nothing; the scene hands the dial to the gauges' paint
// Run: node tests/camppowerlink.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`
  window.__all = []; toast = () => {};
  window.__mk = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, vis: true, log: [] };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => { tg.log.push([k].concat(a)); return px; }) });
    o.setText = v => { o.t = v; return px; }; o.setColor = () => px; o.setVisible = v => { o.vis = v; return px; }; o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.clear = () => { o.log.length = 0; return px; };
    __all.push(o); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), mode: 'play', time: { now: 0 }, add: { rectangle: (x, y) => __mk('rect', x, y), graphics: () => __mk('g'), text: (x, y, t) => __mk('text', x, y, t) },
      input: { on() {}, off() {} }, events: { once() {} } }; s.gaugeAnim = campGaugeAnimNew(s.camp.power.p); return s; };
  window.S = __scene(); campPanelsInstall(S);
  window.__open = () => { campPanelClose(S.pn); campPanelKey(S.pn, S.camp, 'KeyO', 0); };            // the power list, highlight on Shields
  window.__down = k => { for (let i = 0; i < k; i++) campPanelKey(S.pn, S.camp, 'ArrowDown', 0); };
  window.__now = 1000; window.__paint = (ms) => { campGaugeAnim(S.gaugeAnim, S.camp.power.p, ms); __now += 300; campPanelsPaint(S, __now); }; // (the words are live four times a second: a later now makes the view again)
  // the segments a list's graphics drew: [x, y, color, alpha] for every fill of a bar's segment size, in the order drawn
  window.__segs = log => { const out = []; let st = null; const B = CAMP.hud.bar; log.forEach(e => { if (e[0] === 'fillStyle') st = e; else if (e[0] === 'fillRect' && e[3] === B.w && e[4] === B.h) out.push([e[1], e[2], st ? st[1] : -1, st ? st[2] : -1]); }); return out; };
`);

console.log('A. where things are');
{
  const Z = J('campHudGeom()'), W = J('W'), K = J('CAMPPANELS_LOOK'), box = J('campTdispBox()'), H = J('CAMP.hud');
  check('the gauges\' block ends 8 px from the screen\'s right edge and starts right of the toast band (916): three cells in a row, in the order SHIELDS, SPEED, LASERS', Z.block.x1 === W - 8 && Z.block.x0 >= 916 && Z.cells.length === 3 && Z.cells[0].x0 < Z.cells[1].x0 && Z.cells[1].x0 < Z.cells[2].x0 && J('campGauges(campNew(1, [], { seed: 1 })).map(d => d.id).join()') === 'shields,speed,lasers', JSON.stringify([Z.block, W]));
  const G = J(`campPanelsGeometry(campPanelDef('power'), 5)`), Gs = J(`campPanelsGeometry(campPanelDef('ship'), 3)`);
  check('the power list (and the ship list) open right UNDER the gauges: their top is below the block\'s bottom and within 12 px of it, they end 4 px from the right edge, and the gauges are not covered', G.y >= Z.block.y1 + 2 && G.y - Z.block.y1 <= 12 && Gs.y === G.y && G.x + G.w === W - 4 && Z.cells.every(c => c.dial.y1 <= G.y && c.bar.y1 <= G.y), JSON.stringify([G, Z.block]));
  check('the target display is at the bottom right, below the lists; the top right under the lists holds nothing else (the toast, the lines of text and the rival\'s bars are at the middle and the left)', box.y > G.y + G.h && box.y + box.h < J('H') - 40 && box.x + box.w <= W, JSON.stringify([box, G.y + G.h]));
  check('the lines of text at the left start where the gauges used to end (CAMP.hud.text.y), the dim plate behind them starts there too: the top left is free', H.text.y === 96 && J('CAMP.hud.right') === 8 && src('src/campaignscene.js').indexOf('this.add.rectangle(0, CAMP.hud.text.y - 6') > 0 && !/CAMP\.hud\.x\b/.test(src('src/campaignscene.js') + src('src/camphud.js')));
}

{
  const Z = J('campHudGeom()'), W = J('W'), L = J('CAMPTUNE_LOOK'), R = J('CAMP_RIVAL_DRAW.hud');
  check('the TUNED mark (a tuned run\'s count) is left of the gauges, not on them: its right end is at least 4 px left of the block, and its 100 px of text clear the rival\'s bars (the middle of the top)', W - L.markX + 4 <= Z.block.x0 && W - L.markX - 100 > R.x + R.w && L.markY < Z.block.y1, JSON.stringify([W - L.markX, Z.block.x0, R]));
}

console.log('B. the power rows\' pip bars');
{
  g.run(`__open(); __down(0); __paint(5000);`);
  const Zc = J('campHudGeom().cells'), B = J('CAMP.hud.bar'), K = J('CAMPPANELS_LOOK'), Gp = J(`campPanelsGeometry(campPanelDef('power'), 5)`);
  const segs = J(`__segs(S.pnl.g.log)`), rows = [0, 1, 2, 3, 4].map(i => Gp.rowY ? 0 : 0);
  const rowY = J(`[0, 1, 2, 3, 4].map(i => campPanelsGeometry(campPanelDef('power'), 5).rowY(i))`);
  const inRow = (s, i) => s[1] >= rowY[i] && s[1] < rowY[i] + K.box.row;
  const colors = J('CAMP_GAUGE.colors'), off = J('CAMP_GAUGE.off');
  const lit = (i, c) => segs.filter(s => inRow(s, i) && s[2] === c && s[3] === 1).length, all = i => segs.filter(s => inRow(s, i) && (s[2] === off || s[2] === colors.shields || s[2] === colors.speed || s[2] === colors.lasers)).length;
  check('each of the three pip rows draws a bar of four boxes (CAMP.power.max) in a column under the weapons gauge\'s bar (its x), the balance and the emergency rows draw none', [0, 1, 2].every(i => segs.filter(s => inRow(s, i)).length >= 4 && segs.filter(s => inRow(s, i) && s[0] >= Zc[2].bar.x0 && s[0] < Zc[2].bar.x1).length >= 4) && segs.filter(s => inRow(s, 3) || inRow(s, 4)).length === 0 && B.w === 10 && J('CAMP.power.max') === 4, JSON.stringify(segs.slice(0, 6)));
  check('at 2 / 2 / 2 two boxes are lit in each, in the gauge\'s own colour: Shields cyan, Engines green, Weapons amber', lit(0, colors.shields) === 2 && lit(1, colors.speed) === 2 && lit(2, colors.lasers) === 2, JSON.stringify([lit(0, colors.shields), lit(1, colors.speed), lit(2, colors.lasers)]));
  g.run(`campPanelKey(S.pn, S.camp, 'ArrowDown', 0); campPanelKey(S.pn, S.camp, 'Enter', 0); __paint(5000);`); // Engines: one more pip (from the weapons: 1 / 2 / 3)
  const s2 = J(`__segs(S.pnl.g.log)`), lit2 = (i, c) => s2.filter(s => inRow(s, i) && s[2] === c && s[3] === 1).length;
  check('Enter on Engines gives one pip (1 / 2 / 3) and the list stays open on that row: the bars show it at once: Weapons 1, Shields 2, Engines 3', J('JSON.stringify(S.camp.power.p)') === '[1,2,3]' && J('campPanelOpen(S.pn)') === 'power' && lit2(2, colors.lasers) === 1 && lit2(0, colors.shields) === 2 && lit2(1, colors.speed) === 3, JSON.stringify([lit2(2, colors.lasers), lit2(0, colors.shields), lit2(1, colors.speed)]));
  const w = J('CAMP.power.max');
  check('a pip row at the most (4 pips) is greyed with its reason at the left of the bar, and the bar is full', (() => { g.run(`S.camp.power.p = [1, 1, 4]; S.camp.power.base = [1, 1, 4]; __paint(5000);`); const s3 = J(`__segs(S.pnl.g.log)`); const full = s3.filter(s => inRow(s, 1) && s[2] === colors.speed && s[3] === 1).length === w; const r = J('__all.filter(o => o.kind === "text" && o.vis).map(o => o.t)'); return full && r.indexOf('at full') >= 0 && J('campPanelRows(S.camp, "power")[1].ok') === false; })());
  g.run(`S.camp.power.p = [2, 2, 2]; S.camp.power.base = [2, 2, 2]; S.gaugeAnim = campGaugeAnimNew([2, 2, 2]); __paint(5000);`);
}

console.log('C. both light together');
{
  const colors = J('CAMP_GAUGE.colors');
  g.run(`campPanelClose(S.pn); __open(); __down(1); campPanelKey(S.pn, S.camp, 'Enter', 0);`); // Engines: 1 / 2 / 3, not yet eased
  const shown0 = J('JSON.stringify(S.gaugeAnim.shown)');
  g.run(`campGaugeAnim(S.gaugeAnim, S.camp.power.p, 16); campPanelsPaint(S, 1000);`);
  const flash = J('JSON.stringify(S.gaugeAnim.flash)');
  const rowSegs = J('__segs(S.pnl.g.log)'), gauge = J(`(() => { const g2 = __mk('g'); campGaugesPaint(g2, null, S.camp, S.gaugeAnim, 1000, -1); return __segs(g2.log || []); })()`);
  const white = list => list.filter(s => s[2] === 0xffffff).length;
  check('one animation drives both: a frame after the Enter the engines\' flash (and the weapons\', which gave the pip) is on, the shields\' is not and the bars have not finished easing (shown between the old and the new pips); the row\'s bar and the gauge\'s bar are drawn from the same numbers', JSON.parse(flash)[2] > 0.9 && JSON.parse(flash)[0] > 0.9 && JSON.parse(flash)[1] === 0 && JSON.parse(shown0)[2] === 2 && J('S.gaugeAnim.shown[2]') > 2 && J('S.gaugeAnim.shown[2]') < 3 && J('S.gaugeAnim.shown[0] > 1 && S.gaugeAnim.shown[0] < 2'), flash + ' ' + shown0);
  check('the flash is on the same segment in both: a white fill in the engines\' row bar and a white fill in the engines\' gauge bar (the segment that changed), none on the others\' rows', white(rowSegs.filter(s => s[1] >= J(`campPanelsGeometry(campPanelDef('power'), 5).rowY(1)`) && s[1] < J(`campPanelsGeometry(campPanelDef('power'), 5).rowY(2)`))) >= 1 && white(rowSegs.filter(s => s[1] < J(`campPanelsGeometry(campPanelDef('power'), 5).rowY(0)`) + 24)) === 0 && rowSegs.length >= 12, JSON.stringify([white(rowSegs), rowSegs.length, gauge.length]));
  g.run(`campGaugeAnim(S.gaugeAnim, S.camp.power.p, 5000);`);
  check('and they ease to the new pips together: after the easing the engines\' bar shows 3 in the row and the gauge alike (the same A.shown)', J('S.gaugeAnim.shown.join()') === '1,2,3' && J('S.camp.power.p.join()') === '1,2,3' && J('(() => { const g2 = __mk("g"); campGaugesPaint(g2, null, S.camp, S.gaugeAnim, 1000, -1); return __segs(g2.log).filter(s => s[2] === CAMP_GAUGE.colors.speed && s[3] === 1).length; })()') === 3);
  g.run(`campPanelClose(S.pn); S.camp.power.p = [2, 2, 2]; S.camp.power.base = [2, 2, 2]; S.gaugeAnim = campGaugeAnimNew([2, 2, 2]);`);
}

console.log('D. the highlighted row frames its gauge');
{
  const hi = () => J('campPanelPowerHi(S)');
  g.run(`campPanelClose(S.pn);`); const none = hi();
  g.run(`__open();`); const r0 = hi(); g.run(`__down(1);`); const r1 = hi(); g.run(`__down(1);`); const r2 = hi(); g.run(`__down(1);`); const r3 = hi(); g.run(`__down(1);`); const r4 = hi();
  check('the dial of the highlighted row: none with no list, Shields 0, Engines 1, Weapons 2 (the dials\' order), none on Balance and Emergency', none === -1 && r0 === 0 && r1 === 1 && r2 === 2 && r3 === -1 && r4 === -1, JSON.stringify([none, r0, r1, r2, r3, r4]));
  g.run(`campPanelClose(S.pn); campPanelKey(S.pn, S.camp, 'KeyP', 0);`); const ship = hi();
  g.run(`campPanelClose(S.pn); campPanelKey(S.pn, S.camp, 'KeyQ', 0);`); const fleet = hi();
  g.run(`__open(); S.mode = 'pause';`); const paused = hi(); g.run(`S.mode = 'play'; campPanelClose(S.pn);`);
  check('no other list names a dial (the ship list, the fleet list), and a paused game names none', ship === -1 && fleet === -1 && paused === -1, JSON.stringify([ship, fleet, paused]));
  const frame = h => J(`(() => { const g2 = __mk('g'); campGaugesPaint(g2, null, S.camp, S.gaugeAnim, 1000, ${h}); return { frames: g2.log.filter(e => e[0] === 'strokeRoundedRect').map(e => [e[1], e[2], e[3], e[4]]), lines: g2.log.filter(e => e[0] === 'lineBetween').map(e => e.slice(1)) }; })()`);
  const Z = J('campHudGeom()'), top = J('CAMPPANELS_LOOK.topRight'), f1 = frame(1), f0 = frame(-1), f2 = frame(2);
  check('hi = -1 draws no frame; hi = 1 draws one round the SPEED dial and its bar (inside its cell, from the dial\'s left to the bar\'s right) and a line from it down to the top of the list; hi = 2 the same round LASERS', f0.frames.length === 0 && f0.lines.filter(l => l[3] === top).length === 0 && f1.frames.length === 1 && f1.frames[0][0] >= Z.cells[1].x0 && f1.frames[0][0] + f1.frames[0][2] <= Z.cells[2].x0 && f1.frames[0][0] + f1.frames[0][2] >= Z.cells[1].bar.x1 && f1.lines.filter(l => l[3] === top).length === 1 && f1.lines.filter(l => l[3] === top)[0][0] === (Z.cells[1].bar.x0 + Z.cells[1].bar.x1) / 2 && f2.frames.length === 1 && f2.frames[0][0] >= Z.cells[2].x0, JSON.stringify([f1, f2]));
  const sc = src('src/campaignscene.js');
  check('the scene hands the highlighted row\'s dial to the gauges\' paint each frame', /campGaugesPaint\(g, this\.hud\.gauges, C, this\.gaugeAnim, nowMs, typeof campPanelPowerHi === 'function' \? campPanelPowerHi\(this\) : -1\)/.test(sc));
}

console.log('\nthe game made ' + (g.errors.length ? 'errors: ' + g.errors.join(' | ') : 'no errors'));
check('the game made no error', g.errors.length === 0);
console.log(failed ? `\nCAMPPOWERLINK FAIL (${failed} of ${n})` : `\nCAMPPOWERLINK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
