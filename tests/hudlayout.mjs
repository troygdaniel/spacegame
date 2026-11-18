// smoke: the right-hand column in space is one panel: the Overview list with the target's orders on its row; nothing overprints, in any state (plain Node, no Chrome)
// Card space-game-assist-overview-overlap. Troy's screenshots (17 Nov 2026): the assist's target panel was drawn in the same place as the
// Overview list and neither could be read. His decision: the orders live inside the list, like EVE. The target's row opens, under it are the
// range, the closing speed and the orders as buttons with their keys (the assist's modes, and Lock for a hostile); the separate panel under
// the radar is gone; with the Overview hidden one quiet line says the order in force.
// What is checked here, on the pure layout functions and on a stand-in scene:
//   no panel is drawn by src/hud.js any more, so there is no second rectangle to overprint the list
//   in every state (no target, the target on any row, 2 to 7 orders) every part of the Overview is inside its panel and no two parts overlap
//   the panel is on the screen and clear of the bottom strip
//   a click on a button gives the order to the one selected thing, the same button again ends it, Lock is for hostiles only
// Run: node tests/hudlayout.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const W = J('W'), H = J('H'), O = J('OVERVIEW');
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const RADAR_BOTTOM = 240, FOOT = H - 52; // the radar and its hostile line end above y 240 (hud.js); the "Tab map  H help" strip starts at H - 48 (map.js)
const KEYS = [{ id: 'approach', label: 'Approach', cap: '1' }, { id: 'keep', label: 'Keep at range', cap: '2' }, { id: 'orbit', label: 'Orbit', cap: '3' }, { id: 'match', label: 'Match speed', cap: '4' }, { id: 'x5', label: 'Fifth order', cap: '5' }, { id: 'x6', label: 'Sixth order', cap: '6' }];

console.log('the parts of the panel, in every state');
for (const nk of [2, 4, 6]) for (const ti of [-1, 0, 4, 9]) {
  const tag = `${nk} orders, ${ti < 0 ? 'no target' : 'target on row ' + (ti + 1)}`;
  const orders = J(`overviewOrders(${JSON.stringify(KEYS.slice(0, nk))}, { mode: 'keep', mine: true }, { cap: 'V', can: true, on: false })`);
  const L = J(`overviewLayout(10, ${ti}, overviewButtonLines(${JSON.stringify(orders)}))`), panel = { x: L.x, y: L.y, w: L.w, h: L.h };
  const btns = ti < 0 ? [] : J(`overviewButtons(${JSON.stringify(orders)}, ${JSON.stringify(L)})`);
  const parts = [{ t: 'head', x: L.x + 8, y: L.y + 5, w: 240, h: 14 }]
    .concat(L.rowY.map((y, i) => ({ t: 'row ' + (i + 1), x: L.x + 8, y, w: 240, h: 15 })))
    .concat(ti < 0 ? [] : [{ t: 'info', x: L.x + 12, y: L.blockY + 1, w: 230, h: 14 }])
    .concat(btns.map(b => ({ t: 'button ' + b.label, x: b.x, y: b.y, w: b.w, h: b.h })))
    .concat([{ t: 'foot', x: L.x + 8, y: L.footY, w: 240, h: 14 }]);
  const over = []; parts.forEach((a, i) => parts.slice(i + 1).forEach(b => { if (hit(a, b)) over.push(a.t + ' / ' + b.t); }));
  check(`${tag}: no two parts overlap`, over.length === 0, over.join(', '));
  check(`${tag}: every part is inside the panel`, parts.every(p => inside(p, panel)), parts.filter(p => !inside(p, panel)).map(p => p.t).join(', '));
  check(`${tag}: the panel is on the screen, under the radar, clear of the bottom strip`, panel.x >= 0 && panel.x + panel.w <= W && panel.y >= RADAR_BOTTOM && panel.y + panel.h <= FOOT, JSON.stringify(panel));
  if (ti >= 0) check(`${tag}: the block is right under the target's row and the next row is under the block`, L.blockY >= L.rowY[ti] + 15 && (ti === 9 || L.rowY[ti + 1] >= L.blockY + L.block - O.row) && btns.length === nk + 1 && btns.every(b => b.y + b.h <= (ti === 9 ? L.footY : L.rowY[ti + 1])), JSON.stringify({ blockY: L.blockY, next: L.rowY[ti + 1], btns: btns.map(b => [b.x, b.y, b.w]) }));
}
check('today\'s five buttons (four orders and Lock) take two lines; seven take three', J(`overviewButtonLines(overviewOrders(${JSON.stringify(KEYS.slice(0, 4))}, null, { cap: 'V', can: true }))`) === 2 && J(`overviewButtonLines(overviewOrders(${JSON.stringify(KEYS)}, null, { cap: 'V', can: true }))`) === 3);
check('no target: the panel is the size it always was', J('overviewLayout(10, -1).h') === O.row * (O.max + 2) + 14 && J('overviewLayout(10, -1).blockY') === -1);

console.log('the orders');
{
  const o = J(`overviewOrders(${JSON.stringify(KEYS.slice(0, 4))}, { mode: 'match', mine: true }, { cap: 'V', can: true, on: true })`);
  check('the assist\'s four orders with their keys, then Lock with its key', o.map(x => x.cap + ' ' + x.label).join(' | ') === '1 Approach | 2 Keep | 3 Orbit | 4 Match | V Lock');
  check('the order in force is lit, and so is Lock while the guns are locked on it', o.filter(x => x.on).map(x => x.id).join() === 'match,lock');
  check('an order about another target lights nothing here', J(`overviewOrders(${JSON.stringify(KEYS.slice(0, 4))}, { mode: 'match', mine: false }, null)`).every(x => !x.on));
  check('Lock is there but off for a thing that is not hostile; with no gun lock in the build there is no Lock', J(`overviewOrders([], null, { cap: 'V', can: false, on: false })`)[0].off === true && J(`overviewOrders(${JSON.stringify(KEYS.slice(0, 2))}, null, null)`).length === 2);
  const info = J(`overviewInfo({ range: 200, closing: 3.4, trend: '' }, { mode: 'match', mine: true, status: 'burn', label: 'Match speed' })`);
  check('the block\'s line: the range, the rate, and the planner\'s word', info.left === '20 KM   STEADY' && info.right === 'BURN', JSON.stringify(info));
  check('closing or opening is said with its number; no order on this target says NO ORDER', J(`overviewInfo({ range: 1450, closing: -42, trend: 'opening' }, { mine: false })`).left === '145 KM   OPENING 42' && J(`overviewInfo({ range: 1450, closing: -42, trend: 'opening' }, { mine: false })`).right === 'NO ORDER');
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => ({ id: i }));
  check('the target is always among the rows: further than the nearest ten, it takes the last place', J(`overviewWithTarget(${JSON.stringify(all)}, 10, r => r.id === 12).map(r => r.id)`).join() === '1,2,3,4,5,6,7,8,9,12' && J(`overviewWithTarget(${JSON.stringify(all)}, 10, r => r.id === 3).map(r => r.id)`).join() === '1,2,3,4,5,6,7,8,9,10');
}

console.log('on a scene: one selected thing, and the buttons give it orders');
{
  g.run(`
    var __toasts = []; toast = (s, m) => { __toasts.push(m); }; sfx = () => {};
    var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
    var __gun = { x: 300, y: 0, name: 'gunship', active: true, def: { key: 'gunship' }, body: { velocity: { x: 40, y: 0 } } };
    var __mule = { x: 0, y: 400, name: 'MULE', active: true, body: { velocity: { x: 0, y: 0 } } };
    var __s = { add: __P, input: __P, events: __P, cameras: __P, time: { now: 1000 }, k: {}, cr: { target: null }, cm: { pick: null }, lockUntil: 0, nextFire: 0,
      enemies: { getChildren: () => [__gun] }, ship: { x: 0, y: 0, rotation: 0, body: { velocity: { x: 0, y: 0 } } } };
    ASSIST.keys.forEach(n => { __s.k[n] = { isDown: false }; });
    assistSetup(__s); gunlockSetup(__s); GUNLOCK.g = null; GUNLOCK.read = null; ASSIST.on = false;
    function __draw() { const h = { s: __s, g: __P, t: {}, seen: {}, zones: [], now: 0 }; hudAssist(h, __s); return { zones: h.zones.length, texts: Object.keys(h.seen).length, readout: ASSIST.readout }; }
  `);
  check('nothing selected: no target, and an order does nothing', J('overviewTarget(__s)') === null && J(`overviewOrder(__s, 'keep')`) === false);
  g.run(`__s.cr.target = { id: 'halcyon-station', name: 'Halcyon Station', type: 'station', x: 900, y: 0 }`);
  check('a nav body is the selected thing', J('overviewTarget(__s).ship') === false && J('overviewTarget(__s).ref.id') === 'halcyon-station');
  check('Keep on it, with the assist off: the assist comes on and the order is about the body', J(`overviewOrder(__s, 'keep')`) === true && J('ASSIST.on') === true && J('__s.as.mode') === 'keep' && J('__s.as.target.id') === 'halcyon-station' && J('overviewOrderState(__s).mine') === true);
  check('Lock on a station: nothing (it is for hostiles)', J(`overviewOrder(__s, 'lock')`) === false && J('gunlockTarget()') === null);
  check('the same button again ends the order', J(`overviewOrder(__s, 'keep')`) === true && J('__s.as.mode') === '');
  g.run(`__s.cm.pick = __gun`);
  check('a picked ship comes before the nav body: one selected thing', J('overviewTarget(__s).ship') === true && J('overviewTarget(__s).ref.name') === 'gunship');
  const mode = J('ASSIST_MODES.match ? "match" : "keep"');
  check(`${mode} on the gunship: the order is about the ship`, J(`overviewOrder(__s, '${mode}')`) === true && J('__s.as.mode') === mode && J('__s.as.target === __gun') === true && J('overviewOrderState(__s).mine') === true);
  check('another order replaces it, it does not end it', J(`overviewOrder(__s, 'approach')`) === true && J('__s.as.mode') === 'approach');
  check('Lock on the gunship: the gun lock takes it; Lock again drops it', J(`overviewOrder(__s, 'lock')`) === true && J('gunlockTarget() === __gun') === true && J(`overviewOrder(__s, 'lock')`) === true && J('gunlockTarget()') === null);
  g.run(`__s.cm.pick = __mule; assistSet('keep', __mule)`);
  check('the MULE is not hostile: its Lock does nothing', J(`overviewOrder(__s, 'lock')`) === false && J('gunlockTarget()') === null);
  check('the lock key takes the selected ship first when it is hostile', (() => { g.run(`__s.cm.pick = __gun; GUNLOCK.k = { _justDown: true }; gunlockFrame(__s, __s.time.now)`); return J('gunlockTarget() === __gun'); })() === true);
  check('an unknown order is refused', J(`overviewOrder(__s, 'nope')`) === false);

  console.log('no second panel');
  g.run(`__s.ov = null`);
  let d = J('__draw()');
  check('an order in force, the Overview hidden: hud.js draws nothing and claims no zone; the assist\'s one quiet line is on', d.zones === 0 && d.texts === 0 && d.readout === true, JSON.stringify(d));
  g.run(`__s.ov = { shown: true }`); d = J('__draw()');
  check('the Overview up: still nothing drawn by hud.js, and the quiet line is off (the list says it)', d.zones === 0 && d.texts === 0 && d.readout === false, JSON.stringify(d));
  check('hudAssistRect is gone: there is no second rectangle', J('typeof hudAssistRect') === 'undefined');
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
