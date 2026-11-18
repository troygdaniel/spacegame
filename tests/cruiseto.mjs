// smoke: Cruise to: a far ship in the Overview gets it first on its row; it cruises there and hands over to the assist; near rows are unchanged (plain Node)
// Card space-game-overview-cruise-to (src/overview.js). Like Warp to in EVE: Approach on a ship far away crawled at local speed across a
// system that is now three times larger. A selected ship beyond OVERVIEW.far gets Cruise to (C) as its first order. It uses the cruise of
// src/cruise.js as it is (nothing there changes): the ship's place is the destination and follows the ship; when cruise drops out, the
// assist takes the order that was in force on that ship, or Keep at range.
// Checked here on the pure rules and on a stand-in scene with the real cruiseEngage / cruiseEnd / assistSet (no Chrome, no flight):
//   who gets the order (far ships only), where it stands (first), its key
//   starting it: the destination, the refusals of cruise passed on, the selection kept
//   the hand-over: arrived or contact ahead -> the chosen order; cancelled, interdicted or the ship gone -> nothing
//   C: Cruise to with a far ship selected (and cruise.js does not see the key that frame), plain cruise otherwise
// Run: node tests/cruiseto.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const KEYS = [{ id: 'approach', label: 'Approach', cap: '1' }, { id: 'keep', label: 'Keep at range', cap: '2' }, { id: 'orbit', label: 'Orbit', cap: '3' }, { id: 'match', label: 'Match speed', cap: '4' }];

console.log('who gets it');
{
  check('far is past where cruise will engage at all (its 900 px stop and 1200 px shortest leg), and past where a hostile locks it', J('OVERVIEW.far') > J('CRUISE.stop + CRUISE.minLeg') && J('OVERVIEW.far') > J('CRUISE.lockHostile'), J('OVERVIEW.far'));
  check('2,400 px is near, 2,600 px is far', J('overviewFar(2400)') === false && J('overviewFar(2600)') === true);
  const far = J(`overviewOrders(${JSON.stringify(KEYS)}, { mode: '', mine: false }, { cap: 'V', can: true, on: false }, { cap: 'C', on: false })`).map(o => o.cap + ' ' + o.label);
  const near = J(`overviewOrders(${JSON.stringify(KEYS)}, { mode: '', mine: false }, { cap: 'V', can: true, on: false }, null)`).map(o => o.cap + ' ' + o.label);
  check('a far ship: Cruise to is the first order, with the cruise key, and the others follow', far.join(' | ') === 'C Cruise to | 1 Approach | 2 Keep | 3 Orbit | 4 Match | V Lock', far.join(' | '));
  check('a near ship keeps exactly the orders it had', near.join(' | ') === '1 Approach | 2 Keep | 3 Orbit | 4 Match | V Lock');
  check('while it runs the button is lit', J(`overviewOrders([], null, null, { cap: 'C', on: true })`)[0].on === true);
  const lines = J(`overviewButtonLines(overviewOrders(${JSON.stringify(KEYS)}, null, { cap: 'V', can: true }, { cap: 'C' }))`);
  const L = J(`overviewLayout(10, 0, ${lines})`), btns = J(`overviewButtons(overviewOrders(${JSON.stringify(KEYS)}, null, { cap: 'V', can: true }, { cap: 'C' }), ${JSON.stringify(L)})`);
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const over = []; btns.forEach((a, i) => btns.slice(i + 1).forEach(b => { if (hit(a, b)) over.push(a.label + '/' + b.label); }));
  check('six buttons still fit the row\'s block: none overlap, all inside the panel, above the next row', over.length === 0 && btns.length === 6 && btns.every(b => b.x >= L.x && b.x + b.w <= L.x + L.w && b.y + b.h <= L.rowY[1]), JSON.stringify(btns.map(b => [b.label, b.x, b.y, b.w])));
  check('the hand-over rule: arrived or contact ahead with the ship alive -> the order; cancelled, interdicted, quiet, or the ship gone -> nothing',
    ['arrived', 'hostile'].every(w => J(`overviewCruiseEnds('${w}', true)`) === 'hand') && ['cut', 'interdict', 'quiet', ''].every(w => J(`overviewCruiseEnds('${w}', true)`) === 'drop') && J(`overviewCruiseEnds('arrived', false)`) === 'drop');
}

// a stand-in scene: the real cruise, assist and overview code; a ship at the origin in empty space, a MULE far off, a raider further
g.run(`
  var __toasts = []; toast = (s, m) => { __toasts.push(m); }; sfx = () => {}; startCruiseHum = () => {}; stopCruiseHum = () => {}; cruiseFlash = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __mule, __raider, __s;
  function __scene(muleAt, raiderAt) {
    const body = { speed: 0, velocity: { x: 0, y: 0 }, setVelocity(x, y) { body.velocity.x = x; body.velocity.y = y; return body; }, setDrag() { return body; }, setAcceleration() { return body; }, setMaxSpeed() { return body; } };
    __mule = { x: muleAt, y: 0, name: 'MULE', active: true, body: { velocity: { x: 30, y: 0 } } };
    __raider = { x: raiderAt === undefined ? 90000 : raiderAt, y: 0, active: true, def: { key: 'raider' }, body: { velocity: { x: 0, y: 0 } } };
    const s = __s = { add: __P, input: __P, events: __P, cameras: __P, time: { now: 1000 }, k: {}, lockUntil: 0, nextFire: 0, WS: 108000,
      cr: { target: null, active: false, k: { C: {} }, speed: 0 }, cm: { pick: null, nav: null }, ap: { on: false },
      enemies: { getChildren: () => [__raider] }, mx: { freighter: __mule }, ship: { x: 200000, y: 200000, rotation: 0, body } };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s); overviewSetup(s); ASSIST.on = false; __toasts = [];
    s.ov.k = { B: {}, C: {}, W: {}, S: {}, UP: {}, DOWN: {}, ENTER: {} };
    __mule.x += s.ship.x; __mule.y = s.ship.y; if (raiderAt !== undefined) { __raider.x = s.ship.x + raiderAt; __raider.y = s.ship.y; }
    return s;
  }
  function __arrive(why) { cruiseEnd(__s, why); overviewFrame(__s, __s.time.now += 16); }
`);

console.log('starting it');
{
  g.run(`__scene(20000); __s.cm.pick = __mule; __s.cr.target = { id: 'halcyon-station', name: 'Halcyon Station', x: 1, y: 1 }; __s.cm.nav = __s.cr.target;`);
  check('the MULE 2,000 km off is the selected ship, and it is far', J('overviewTarget(__s).ref === __mule') && J('overviewFar(Math.hypot(__mule.x - __s.ship.x, __mule.y - __s.ship.y))'));
  check('Cruise to: cruise engages, toward the MULE\'s own place, by its name; the assist comes on for the hand-over', J(`overviewOrder(__s, 'cruise')`) === true && J('__s.cr.active') === true && J('__s.cr.target.of === __mule') && J('__s.cr.target.x === __mule.x') && J('__s.cr.target.name') === 'MULE' && J('ASSIST.on') === true, J('__toasts'));
  check('the MULE stays the selected ship (click to move would drop it on a change of nav target it did not make)', J('__s.cm.nav === __s.cr.target') && J('overviewTarget(__s).ref === __mule'));
  g.run(`__mule.x += 500; __mule.y += 300; overviewFrame(__s, __s.time.now += 16);`);
  check('she moves: the destination moves with her', J('__s.cr.target.x === __mule.x && __s.cr.target.y === __mule.y'));
  g.run(`__arrive('arrived')`);
  check('cruise drops out: the assist takes Keep at range on the MULE (no order had been chosen)', J('__s.as.mode') === 'keep' && J('__s.as.target === __mule') && J('__s.ov.cruise') === null, J('__s.as.mode'));
  check('and the destination you had before is back', J('__s.cr.target.id') === 'halcyon-station' && J('__s.cm.nav === __s.cr.target'));

  g.run(`__scene(20000); __s.cm.pick = __mule; ASSIST.on = true; assistSet('match', __mule); overviewOrder(__s, 'cruise'); overviewFrame(__s, __s.time.now += 16); __arrive('arrived');`);
  check('with Match speed in force on her when you pressed it: the hand-over is Match speed', J('ASSIST_MODES.match ? __s.as.mode === "match" : true') && J('__s.as.target === __mule'), J('__s.as.mode'));
}

console.log('no hand-over');
{
  for (const why of ['cut', 'interdict']) {
    g.run(`__scene(20000); __s.cm.pick = __mule; overviewOrder(__s, 'cruise'); overviewFrame(__s, __s.time.now += 16); __arrive('${why}');`);
    check(`cruise ended by '${why}': no order is given, and Cruise to is over`, J('__s.as.mode') === '' && J('__s.ov.cruise') === null && J('__s.cr.target') === null);
  }
  g.run(`__scene(20000); __s.cm.pick = __mule; overviewOrder(__s, 'cruise'); overviewFrame(__s, __s.time.now += 16); __mule.active = false; __arrive('arrived');`);
  check('the ship is gone when you arrive: no order', J('__s.as.mode') === '' && J('__s.ov.cruise') === null);
  g.run(`__scene(20000); __s.cm.pick = __mule; overviewOrder(__s, 'cruise'); overviewFrame(__s, __s.time.now += 16);`);
  check('Cruise to again while it runs cancels the cruise, with no hand-over', J(`overviewOrder(__s, 'cruise')`) === true && J('__s.cr.active') === false && J('__s.ov.cruise') === null && (g.run(`overviewFrame(__s, __s.time.now += 16)`), J('__s.as.mode')) === '');
  g.run(`__scene(20000); __s.cm.pick = __mule; overviewOrder(__s, 'cruise'); __s.dead = true; overviewFrame(__s, __s.time.now += 16);`);
  check('the ship dies in cruise: Cruise to is dropped', J('__s.ov.cruise') === null);
}

console.log('what cruise refuses, Cruise to refuses');
{
  g.run(`__scene(20000, 1000); __s.cm.pick = __mule; __s.cr.target = { id: 'x', name: 'X', x: 5, y: 5 }; __s.cm.nav = __s.cr.target;`);
  check('a hostile within 1,500 px: cruise is locked, it says so, nothing is left half set', J(`overviewOrder(__s, 'cruise')`) === false && J('__s.cr.active') === false && J('__s.ov.cruise') === null && J('__s.cr.target.id') === 'x' && J('__toasts.some(m => /Hostiles near/.test(m))'), J('__toasts'));
  g.run(`__scene(20000); __s.cm.pick = null;`);
  check('nothing selected: nothing happens', J(`overviewOrder(__s, 'cruise')`) === false && J('__s.cr.active') === false);
  g.run(`__scene(20000); __s.cr.target = { id: 'halcyon-station', name: 'Halcyon Station', x: 1, y: 1 };`);
  check('a place is not a ship: no Cruise to from here (the navigation panel has cruise for places)', J(`overviewOrder(__s, 'cruise')`) === false && J('__s.cr.active') === false);
}

console.log('the C key');
{
  g.run(`__scene(20000); __s.cm.pick = __mule; __s.ov.k.C._justDown = true; __s.cr.k.C._justDown = true; overviewFrame(__s, __s.time.now += 16);`);
  check('C with a far ship selected: Cruise to that ship, and the cruise code does not see the key this frame', J('__s.cr.active') === true && J('__s.cr.target.of === __mule') && J('__s.cr.k.C._justDown') === false);
  g.run(`__s.ov.k.C._justDown = true; __s.cr.k.C._justDown = true; overviewFrame(__s, __s.time.now += 16);`);
  check('C again: it cancels', J('__s.cr.active') === false && J('__s.ov.cruise') === null && J('__s.cr.k.C._justDown') === false);
  g.run(`__scene(1500); __s.cm.pick = __mule; __s.ov.k.C._justDown = true; __s.cr.k.C._justDown = true; overviewFrame(__s, __s.time.now += 16);`);
  check('C with a near ship selected: the key is left for plain cruise (to the nav target)', J('__s.cr.k.C._justDown') === true && J('__s.ov.cruise') === null && J('__s.cr.active') === false);
  g.run(`__scene(20000); __s.ov.k.C._justDown = true; __s.cr.k.C._justDown = true; overviewFrame(__s, __s.time.now += 16);`);
  check('C with no ship selected: left for plain cruise too', J('__s.cr.k.C._justDown') === true && J('__s.ov.cruise') === null);
  g.run(`__scene(20000); __s.cm.pick = __mule; __s.cr.navOpen = true; __s.ov.k.C._justDown = true; overviewFrame(__s, __s.time.now += 16);`);
  check('the navigation panel open: the Overview does not take the key', J('__s.ov.cruise') === null);
  g.run(`__scene(20000); __s.cm.pick = __mule; overviewShow(__s, false); __s.ov.k.C._justDown = true; overviewFrame(__s, __s.time.now += 16); __arrive('arrived');`);
  check('it all works with the Overview hidden: the key starts it and the hand-over still happens', J('__s.as.mode') === 'keep' && J('__s.as.target === __mule'));
}

console.log('a far hostile shows its range, so you can decide');
{
  g.run(`__scene(20000, 60000);`);
  const rows = J(`overviewRows(overviewThings(__s), { x: __s.ship.x, y: __s.ship.y, vx: 0, vy: 0 }, 0).map(r => ({ name: r.name, hostile: r.hostile, km: Math.round(r.range / 10), line: overviewLine(r, false) }))`);
  check('the raider 6,000 km away is in the list, marked hostile, with its range', rows.some(r => r.hostile && r.km === 6000 && /6,000 km/.test(r.line)), JSON.stringify(rows));
  check('nearest first: the MULE at 2,000 km is above it', rows[0].name === 'MULE' && rows[0].km === 2000);
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
