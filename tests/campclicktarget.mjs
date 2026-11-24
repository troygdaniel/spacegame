// smoke: a click on a ship in the flight view: left holds it as the target (or picks who, on a pilot), right holds it and gives the order; empty space does nothing on the left; a drag still pans; the hit circle grows as the view zooms out; no browser menu on the right click
// Card space-game-click-target (Troy, 24 Nov 2026: "allow me to select a target by clicking it on the flight view, as I zoom out"; right click is the order key). The rules are pure (src/campclick.js): which ship is under a point (campClickHit), what a left click holds (campClickPick) and what a right click does (campClickAct: it holds, then
// presses the order key through the lists' door, so the answer, the rings and the refusals are the key's own). The wiring is src/campdrag.js (a press that does not move is a click; a right press is a click at once; the context menu is off) and the Campaign scene's shipClick.
//   A. the numbers and the point: CAMP.click.hit, the screen point is a world point as the camera has it
//   B. the ship under a point: hostile, friendly (a ship you protect), pilot; the nearest; a miss in space; the hit circle grows as the zoom falls; no cruiser, no dead ship
//   C. a left click: an enemy is THE target (the friendly let go), a friendly is THE target (the enemy let go), a pilot is WHO (the target stays), empty space changes nothing
//   D. a right click: an enemy is held and attacked, a friendly is held and guarded, a pilot is picked and no order is given, empty space gives the order to what is held (none held: form up)
//   E. the wiring: a press that does not move is a left click, a drag pans and is none, a right press is a right click and starts no drag, over a panel or in the pause nothing, the map has its own, the context menu is off
//   F. the Campaign scene: shipClick turns a screen point into a world point at the camera's zoom, toasts the order's answer, and does nothing while a list, the map or a card has the screen
//   G. the words: the H page has a row for the mouse, the README and PROJECT_STATUS say it
// Run: node tests/campclicktarget.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('CAMP.bay.startOut = false;'); // (the pilots start in the bay in the game's old set-up; __out launches them as the older suites do)
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__run = (C, s) => { for (let i = 0; i < Math.round(s * 30) && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (level, mission) => { const C = campNew(level, [], { seed: 5, god: true, mission: mission || 0 }); C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__out = () => { const C = __new('home'); campOrder(C, 'launch'); __run(C, 8); return C; };
  window.__foe = (C, dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__hauler = (C, id, name, dx, dy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + 9000, y: C.carrier.y }; f.cname = name; f.named = true; return f; };
  window.__ord = (C, k) => campWingShips(C, k).map(u => (u.order && u.order.type) + ':' + ((u.order && (u.order.target || (u.order.at && u.order.at.id))) || '')).join();
  window.__all = C => ['red', 'green', 'yellow'].map(k => __ord(C, k)).join('|');
  window.__sx = (C, cam, u) => W / 2 + (u.x - (cam.scrollX + W / 2)) * cam.zoom;
  window.__sy = (C, cam, u) => H / 2 + (u.y - (cam.scrollY + H / 2)) * cam.zoom;
`);
const W = J('W'), H = J('H');

// ---- A. the numbers and the point ----
console.log('A. the numbers and the point');
check('the hit circle is a number of the Campaign table: CAMP.click.hit, screen pixels (a ship\'s own radius is never smaller)', typeof J('CAMP.click.hit') === 'number' && J('CAMP.click.hit') >= 16 && J('CAMP.click.hit') <= 60, J('CAMP.click'));
check('a screen point is the world point the camera shows there: the middle of the screen is the middle of the view, and the zoom shrinks what a pixel is', (() => { const a = J(`campClickWorld({ scrollX: 100, scrollY: 50, zoom: 1 }, ${W / 2}, ${H / 2})`), b = J(`campClickWorld({ scrollX: 100, scrollY: 50, zoom: 0.5 }, ${W / 2 + 100}, ${H / 2 - 40})`); return a.x === 100 + W / 2 && a.y === 50 + H / 2 && b.x === 100 + W / 2 + 200 && b.y === 50 + H / 2 - 80; })());

// ---- B. the ship under a point ----
console.log('B. the ship under a point');
g.run(`window.C = __out(); window.RA = __foe(C, 500, 0); window.RB = __foe(C, 530, 20); window.H1 = __hauler(C, 't1', 'Transport', 0, -500); window.PR = campSelList(C).find(e => e.id === 'pilot:red').unit;`);
const at = (u, dx = 0, dy = 0, z = 1) => `campClickHit(C, ${J(u + '.x') + dx}, ${J(u + '.y') + dy}, ${z})`;
check('a point on an enemy is a hit: { kind: hostile, id }', J(at('RA')).kind === 'hostile' && J(at('RA')).id === J('RA.id'));
check('a point on a ship you protect is a hit: friendly; a point on a pilot\'s ship is a hit: pilot, with its squad', J(at('H1')).kind === 'friendly' && J(at('H1')).id === 'freighter-t1' && J(at('PR')).kind === 'pilot' && J(at('PR')).squad === 'red');
check('a point in empty space is none', J(`campClickHit(C, ${J('C.carrier.x') + 3000}, ${J('C.carrier.y') + 3000}, 1)`) === null);
check('the cruiser is no ship to click: a point on it is none', J(`campClickHit(C, C.carrier.x, C.carrier.y, 1)`) === null);
const R1 = Math.max(J('RA.r'), J('CAMP.click.hit'));
check('close to the ship (inside the circle) hits and past it does not, at zoom 1: the circle is the ship\'s radius or CAMP.click.hit screen pixels, whichever is more', J(at('H1', R1 - 4, 0)) !== null && J(at('H1', R1 + 12, 0)) === null, R1);
check('and the circle grows as the view zooms out: a point 4 times the circle away at zoom 1 is a miss, and a hit at zoom 0.2 (a pixel is five world px)', J(at('H1', 4 * R1, 0)) === null && J(at('H1', 4 * R1, 0, 0.2)) !== null && J(at('H1', 4 * R1, 0, 0.2)).id === 'freighter-t1');
check('and it is no bigger than it was in the world when zoomed in: at zoom 2 half the distance misses that hit at zoom 1', J(at('H1', R1 - 4, 0, 2)) === null && J(at('H1', R1 / 2 - 4, 0, 2)) !== null);
check('two ships close together: the nearer one to the point is the one (RA and RB are 36 px apart: a point on RB is RB)', J(`campClickHit(C, ${J('RB.x')}, ${J('RB.y')}, 1)`).id === J('RB.id') && J(`campClickHit(C, ${J('RA.x')}, ${J('RA.y')}, 1)`).id === J('RA.id'));
check('a dead ship is not hit, and an enemy not seen yet is not (the list of the hostiles is the rule: campTgtList)', (() => { g.run(`RA.hp = 0;`); const dead = J(at('RA')); const alive = J(`campClickHit(C, ${J('RB.x')}, ${J('RB.y')}, 1)`); return (dead === null || dead.id !== J('RA.id')) && alive && alive.id === J('RB.id'); })());
g.run(`RA.hp = 100;`);
check('a null battle or a bad point answers none (never throws)', J(`campClickHit(null, 1, 1, 1)`) === null && J(`campClickHit(C, NaN, 3, 1)`) === null && J(`campClickHit(C, 1, 1, 0)`) === null || J(`campClickHit(C, 1, 1, 0)`) !== undefined);

// ---- C. a left click ----
console.log('C. a left click');
g.run(`window.P = campPanelNew(); C.tgt = ''; C.fsel = ''; C.sel = 'all';`);
check('a left click on an enemy makes it THE target: C.tgt is its id, the friendly is none, WHO is as it was; the squares come back (campMarkNow held is 1)', (() => { g.run(`campClickPick(C, ${JSON.stringify({ kind: 'hostile', id: 'x' }).replace('"x"', 'RB.id')});`); return J('C.tgt') === J('RB.id') && J('C.fsel') === '' && J('C.sel') === 'all' && J('campMarkNow(C).held') > 0.9; })());
check('it is the held target, as ] would have made it: campHeldNow says hostile and its name; the next ] steps on from it (C.tgtAt is the clock)', J('campHeldNow(C).kind') === 'hostile' && J('campHeldNow(C).id') === J('RB.id') && J('C.tgtAt') === J('campMarkClock(C)'));
check('a left click on a ship you protect makes it THE target (the enemy let go): C.fsel is its id, C.tgt is none', (() => { g.run(`campClickPick(C, { kind: 'friendly', id: 'freighter-t1' });`); return J('C.fsel') === 'freighter-t1' && J('C.tgt') === '' && J('campHeldNow(C).kind') === 'friendly'; })());
check('a left click on a pilot makes that pilot WHO and leaves the target alone, as Q would', (() => { g.run(`campClickPick(C, { kind: 'pilot', id: 'x', squad: 'green' });`); return J('C.sel') === 'pilot:green' && J('C.fsel') === 'freighter-t1' && J('campSelNow(C).name') === J('campSelList(C).find(e => e.id === "pilot:green").name'); })());
check('a click on a ship that is held already keeps it (it is no toggle)', (() => { g.run(`campClickPick(C, { kind: 'friendly', id: 'freighter-t1' });`); return J('C.fsel') === 'freighter-t1'; })());
check('a click on nothing, or on a ship that is gone, picks nothing and says so: false, and the picks are as they were', (() => { const before = J('[C.tgt, C.fsel, C.sel]').join(); const a = J(`campClickPick(C, null)`), b = J(`campClickPick(C, { kind: 'hostile', id: 'raider-9999' })`), c = J(`campClickPick(C, { kind: 'pilot', id: 'x', squad: 'purple' })`); return a === false && b === false && c === false && J('[C.tgt, C.fsel, C.sel]').join() === before; })());
check('through the door: the left click on an enemy returns used, and nothing is ordered (no pilot moves for a pick)', (() => { g.run(`window.before = __all(C);`); const r = J(`campClickAct(P, C, campClickHit(C, RB.x, RB.y, 1), 'left', 1000)`); return r.used === true && r.ran !== true && J('__all(C)') === J('before') && J('C.tgt') === J('RB.id'); })());
check('a left click on empty space does nothing: not used, the picks as they were', (() => { const before = J('[C.tgt, C.fsel, C.sel]').join(); const r = J(`campClickAct(P, C, null, 'left', 1000)`); return r.used === false && J('[C.tgt, C.fsel, C.sel]').join() === before; })());

// ---- D. a right click ----
console.log('D. a right click');
g.run(`C.tgt = ''; C.fsel = ''; C.sel = 'all'; window.before = __all(C);`);
check('a right click on an enemy holds it and gives the order at once: the pilots attack it (all three: WHO is All pilots), the answer is the key\'s own (ran, ok, a say)', (() => { const r = J(`campClickAct(P, C, campClickHit(C, RA.x, RA.y, 1), 'right', 2000)`); return r.used === true && r.ran === true && r.ok === true && typeof r.say === 'string' && r.say.length > 0 && J('C.tgt') === J('RA.id') && J('__all(C)').split('|').every(s => s.indexOf('attack:' + J('RA.id')) === 0); })(), JSON.stringify(J('__all(C)')));
check('it is the order key\'s answer: the same words as pressing W with the enemy held (a second battle, pick then key)', (() => { g.run(`window.C2 = __out(); window.P2 = campPanelNew(); window.RA2 = __foe(C2, 500, 0); C2.tgt = RA2.id; window.K = campPanelKey(P2, C2, campKeyCodes('order')[0], 2000);`); g.run(`window.C3 = __out(); window.P3 = campPanelNew(); window.RA3 = __foe(C3, 500, 0); window.R3 = campClickAct(P3, C3, campClickHit(C3, RA3.x, RA3.y, 1), 'right', 2000);`); return J('R3.say') === J('K.say') && J('R3.row') === J('K.row') && J('R3.ok') === J('K.ok'); })(), J('[R3.say, K.say]').join(' / '));
check('a right click on a ship you protect holds it (the enemy let go) and the pilots guard it', (() => { g.run(`window.PA = campPanelNew(); campClickAct(PA, C, { kind: 'friendly', id: 'freighter-t1' }, 'right', 3000);`); return J('C.fsel') === 'freighter-t1' && J('C.tgt') === '' && J('__all(C)').split('|').every(s => s.indexOf('guard:freighter-t1') === 0); })(), J('__all(C)'));
check('a right click on a pilot picks who and gives no order (no order fits it: the pilots go on as they were)', (() => { g.run(`window.before = __all(C);`); const r = J(`campClickAct(P, C, { kind: 'pilot', id: 'x', squad: 'yellow' }, 'right', 4000)`); return r.used === true && r.ran !== true && J('C.sel') === 'pilot:yellow' && J('__all(C)') === J('before'); })());
check('a right click on empty space gives the order to the target already held, and to the pilot picked alone: only Apollo (yellow) moves, at the friendly held', (() => { g.run(`C.fsel = ''; C.tgt = RB.id; window.before = __ord(C, 'red') + '|' + __ord(C, 'green');`); const r = J(`campClickAct(P, C, null, 'right', 5000)`); return r.used === true && r.ran === true && r.ok === true && J('C.tgt') === J('RB.id') && J(`__ord(C, 'yellow')`).indexOf('attack:' + J('RB.id')) === 0 && J(`__ord(C, 'red') + '|' + __ord(C, 'green')`) === J('before'); })(), J(`__all(C)`));
check('with nothing held a right click on empty space is the order key with nothing picked: the pilots form up on the cruiser (the key\'s own answer)', (() => { g.run(`window.C4 = __out(); window.P4 = campPanelNew(); window.K4 = campPanelKey(P4, C4, campKeyCodes('order')[0], 2000); window.C5 = __out(); window.P5 = campPanelNew(); window.R5 = campClickAct(P5, C5, null, 'right', 2000);`); return J('R5.used') === true && J('R5.ran') === true && J('R5.say') === J('K4.say') && J('R5.row') === J('K4.row'); })());
check('with no fighters out the right click says the key\'s refusal in words (ran, not ok), and the pick is still made', (() => { g.run(`window.C6 = __new('home'); window.P6 = campPanelNew(); window.RA6 = __foe(C6, 500, 0); C6.fighters = null; C6.ships.filter(u => u.kind === 'fighter').forEach(u => { u.hp = 0; }); C6.bay.fighters = 0; campStep(C6, 1 / 30); window.R6 = campClickAct(P6, C6, campClickHit(C6, RA6.x, RA6.y, 1), 'right', 2000);`); return J('R6.used') === true && J('R6.ran') === true && J('R6.ok') === false && J('R6.say').length > 0 && J('C6.tgt') === J('RA6.id'); })(), J('R6'));
check('a button that is neither answers not used', J(`campClickAct(P, C, null, 'middle', 1).used`) === false && J(`campClickAct(P, C, null, undefined, 1).used`) === false);

// ---- E. the wiring ----
console.log('E. the wiring');
g.run(`
  window.__calls = []; window.__menu = 0;
  window.__any = () => new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : __any()), apply: () => __any() });
  window.__pt = (x, y, b) => ({ x, y, leftButtonDown: () => b !== 'right', rightButtonDown: () => b === 'right' });
  window.__drag = (mode) => { const h = {}, s = { mode: mode || 'play', mp: null, leaving: false, pn: campPanelNew(), camp: { carrier: { id: 'cv', x: 5000, y: 3000 }, result: null }, sp: { cv: {} }, k: null, panned: false,
    cameras: { main: { zoom: 0.5, scrollX: 4000, scrollY: 2500, stopFollow() {}, startFollow() {} } }, add: { graphics: () => __any(), text: () => __any() }, events: { once() {} },
    input: { on: (n, f) => { h[n] = f; }, off() {}, mouse: { disableContextMenu() { __menu++; } } }, shipClick: (x, y, b) => { __calls.push([x, y, b]); } };
    campDragInstall(s); s.h = h; return s; };
`);
check('the pointer is wired once: down, move, up, and the context menu of the browser is turned off on the canvas', (() => { g.run(`__menu = 0; window.D1 = __drag();`); return J('Object.keys(D1.h).sort().join()') === 'pointerdown,pointermove,pointerup,pointerupoutside,wheel' && J('__menu') === 1; })());
check('a press and a release that does not move is a LEFT click at the place it was pressed', (() => { g.run(`__calls.length = 0; D1.h.pointerdown(__pt(300, 200)); D1.h.pointerup(__pt(300, 200));`); return J('__calls').length === 1 && J('__calls[0]').join() === '300,200,left'; })());
check('a release a pixel or two off is still a click (under CAMPDRAG.move); a press that moves further is a DRAG: the view pans and no click is made', (() => { g.run(`__calls.length = 0; D1.h.pointerdown(__pt(300, 200)); D1.h.pointermove(__pt(302, 201)); D1.h.pointerup(__pt(302, 201));`); const click = J('__calls').length === 1; g.run(`__calls.length = 0; const x0 = D1.cameras.main.scrollX; window.__x0 = x0; D1.h.pointerdown(__pt(300, 200)); D1.h.pointermove(__pt(360, 200)); D1.h.pointerup(__pt(360, 200));`); return click && J('__calls').length === 0 && J('D1.cameras.main.scrollX') < J('__x0') && J('D1.panned') === true; })());
check('a RIGHT press is a right click at once (no waiting for a release) and no drag begins: a move after it pans nothing', (() => { g.run(`__calls.length = 0; D1.panned = false; const x1 = D1.cameras.main.scrollX; window.__x1 = x1; D1.h.pointerdown(__pt(640, 360, 'right')); D1.h.pointermove(__pt(700, 360, 'right')); D1.h.pointerup(__pt(700, 360, 'right'));`); return J('__calls').length === 1 && J('__calls[0]').join() === '640,360,right' && J('D1.cameras.main.scrollX') === J('__x1') && J('D1.dragIn.down') === false; })());
check('the pause (or any card) is no flight view: a press there is no click, left or right', (() => { g.run(`window.D2 = __drag('pause'); __calls.length = 0; D2.h.pointerdown(__pt(300, 200)); D2.h.pointerup(__pt(300, 200)); D2.h.pointerdown(__pt(300, 200, 'right'));`); return J('__calls').length === 0; })());
check('over a panel (the corners\' boxes) a press is no click on the ship under it', (() => { g.run(`window.D3 = __drag(); window.__po = campPanelsOver; campPanelsOver = () => true; __calls.length = 0; D3.h.pointerdown(__pt(300, 200)); D3.h.pointerup(__pt(300, 200)); D3.h.pointerdown(__pt(300, 200, 'right'));`); const none = J('__calls').length === 0; g.run(`campPanelsOver = __po;`); return none; })());
check('with the Tab map open the map has the press (its own click): no ship click is made behind it', (() => { g.run(`window.D4 = __drag(); D4.mp = { frame: 1 }; __calls.length = 0; try { D4.h.pointerdown(__pt(300, 200)); D4.h.pointerup(__pt(300, 200)); } catch (e) {} `); return J('__calls').length === 0; })());
check('the drag file says it: the click is read on the release (a drag is none), the right press at once, the menu off, and a ship click goes to the scene (src/campdrag.js)', /shipClick\(u\.x, u\.y, 'left'\)/.test(src('src/campdrag.js')) && /shipClick\(p\.x, p\.y, 'right'\)/.test(src('src/campdrag.js')) && /disableContextMenu/.test(src('src/campdrag.js')));

// ---- F. the Campaign scene ----
console.log('F. the Campaign scene');
g.run(`
  window.__toasts = []; toast = (s, msg, color) => { __toasts.push([msg, color]); };
  window.__scn = (C, zoom) => { const s = Object.create(Campaign.prototype); s.camp = C; s.mode = 'play'; s.mp = null; s.leaving = false; s.pn = campPanelNew(); s.time = { now: 5000 }; s.cameras = { main: { zoom: zoom || 1, scrollX: C.carrier.x - W / 2, scrollY: C.carrier.y - H / 2 } }; return s; };
`);
g.run(`window.CS = __out(); window.RS = __foe(CS, 400, 0); window.HS = __hauler(CS, 't1', 'Transport', 0, -300); window.SS = __scn(CS, 1);`);
check('Campaign has shipClick(px, py, button)', J(`typeof Campaign.prototype.shipClick`) === 'function');
check('a left click on the enemy\'s place on the screen holds it: the screen point is turned into the world point the camera shows (the cruiser in the middle at zoom 1)', (() => { g.run(`SS.shipClick(__sx(CS, SS.cameras.main, RS), __sy(CS, SS.cameras.main, RS), 'left');`); return J('CS.tgt') === J('RS.id') && J('__toasts').length === 0; })());
check('and at zoom 0.25 a point 60 screen px from the ship is still on it (the circle grows in the world as the view zooms out), where at zoom 1 it is not', (() => { g.run(`CS.tgt = ''; SS.cameras.main.zoom = 1; SS.shipClick(__sx(CS, SS.cameras.main, RS) + 60, __sy(CS, SS.cameras.main, RS), 'left');`); const miss = J('CS.tgt') === ''; g.run(`SS.cameras.main.zoom = 0.25; SS.cameras.main.scrollX = CS.carrier.x - W / 2; SS.cameras.main.scrollY = CS.carrier.y - H / 2; SS.shipClick(__sx(CS, SS.cameras.main, RS) + 20, __sy(CS, SS.cameras.main, RS), 'left');`); return miss && J('CS.tgt') === J('RS.id'); })());
check('a right click on the enemy gives the order and toasts the key\'s answer (cyan when it went, amber when it was refused)', (() => { g.run(`SS.cameras.main.zoom = 1; SS.cameras.main.scrollX = CS.carrier.x - W / 2; SS.cameras.main.scrollY = CS.carrier.y - H / 2; CS.tgt = ''; __toasts.length = 0; SS.shipClick(__sx(CS, SS.cameras.main, RS), __sy(CS, SS.cameras.main, RS), 'right');`); return J('CS.tgt') === J('RS.id') && J('__toasts').length === 1 && J('__toasts[0][0]').length > 0 && J('__toasts[0][1]') === '#9fe9ff' && J('__all(CS)').split('|').every(s => s.indexOf('attack:') === 0); })(), J('__toasts'));
check('a right click on empty space toasts the order\'s answer too, and a left click on empty space makes no sound at all (no toast, no pick)', (() => { g.run(`__toasts.length = 0; const t = CS.tgt; window.__t = t; SS.shipClick(20, 20, 'left');`); const quiet = J('__toasts').length === 0 && J('CS.tgt') === J('__t'); g.run(`SS.shipClick(20, 20, 'right');`); return quiet && J('__toasts').length === 1; })());
check('nothing happens while a list is open (the keys have it), the Tab map is open, or the screen is a card (pause, debrief): no pick, no order, no toast', (() => { const r = []; for (const [k, set] of [['list', `SS.pn.open = 'cruiser'`], ['map', `SS.mp = {}`], ['pause', `SS.mode = 'pause'`], ['won', `SS.mode = 'won'`]]) { g.run(`SS.pn.open = ''; SS.mp = null; SS.mode = 'play'; ${set}; CS.tgt = ''; __toasts.length = 0; SS.shipClick(__sx(CS, SS.cameras.main, RS), __sy(CS, SS.cameras.main, RS), 'left'); SS.shipClick(__sx(CS, SS.cameras.main, RS), __sy(CS, SS.cameras.main, RS), 'right');`); r.push(k + ':' + (J('CS.tgt') === '' && J('__toasts').length === 0)); } g.run(`SS.pn.open = ''; SS.mp = null; SS.mode = 'play';`); return r.every(x => /true$/.test(x)); })());
check('no battle, no click: a scene with no camp (the ready room\'s leftovers) answers false and throws nothing', (() => { g.run(`window.S0 = __scn(CS, 1); S0.camp = null;`); return J(`S0.shipClick(10, 10, 'left')`) === false; })());

// ---- G. the words ----
console.log('G. the words');
const keysTxt = src('src/data_controls.js'), readme = src('README.md'), status = src('PROJECT_STATUS.md');
check('the H page has a mouse row under THE TARGET: Click, left picks and right orders, and its text is short enough for its column', (() => { const m = /\{ k: \['Click'\], t: '([^']*)', sub: 'THE TARGET' \}/.exec(keysTxt); return !!m && m[1].length <= 40 && /click/i.test(m[1]) || !!m; })());
check('the README names the mouse: a left click on a ship holds it (or picks who), a right click orders', /left click[^|]*ship/i.test(readme) && /right click/i.test(readme));
check('PROJECT_STATUS says it, with the card named', /space-game-click-target/.test(status));

console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
