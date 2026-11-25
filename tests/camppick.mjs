// smoke: the target pick (card space-game-order-target-pick): an order that needs a target takes the one candidate at once or opens a sub-list of several (Mine ore: a rock field; Repair a ship we protect: a hurt ship) with the highlight shown in the flight view, and Esc goes back one step to where you came from
// Troy, 22 Nov 2026: "an order that needs a target auto-picks when there is one candidate, opens a sub-list when there are several, moving the highlight reveals the candidate in the flight view with a bracket and zoom-out if needed, Enter selects; same for what you escort, guard or mine; Esc goes back one step everywhere in the lists". The Attack, Escort and Guard kinds went with the all-squads list (card space-game-delete-off-lists).
// The model is src/camppick.js and src/camppanel.js; the drawing is src/camppickdraw.js (the bracket and the zoom) and src/campanelsdraw.js (the sub-list is a list). The list a sub-list opens from is the S list, a numbered one: its sub-list takes the digits and Esc.

//   A. the table: which rows pick, and of what; the candidates (who, in what order, what a row says) and the plan (direct, auto, list)
//   B. Mine ore: a rock field, one or several, none (ore lying about: as it always was)
//   C. Esc: back from the sub-list to its list; the list's key closes both; the target keys go on to be the target's
//   D. the view of the sub-list (heading, rows, the foot's words) and the candidates that come and go while it is open
//   E. the flight view: the bracket on the highlighted candidate, the zoom out to show it with the cruiser (never in), the zoom the player had given back, a zoom made by hand while it is open
//   F. the orders as they always were: a typed or spoken order, and the plain bot, do not meet the pick
//   G. the orders as they always were: a typed or spoken order, and the plain bot, do not meet the pick
// Run: node tests/camppick.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run("CAMP_PANELS.panels.find(p => p.id === 'cruiser').rows.find(r => r.id === 'fmine').pick = 'field'"); // card space-game-keys6-enter: the Mine row mines the nearest ore by itself now (no pick); the sub-list engine is still there for a row that asks for it, and this suite tests it through that row
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  // a mission with the wing out (8 ships), no hostile, the cruiser unhurt (god); mission 0 is 1.1 (the transport), 1 is 1.2 (three rock fields, two neutral miners), 2 is 1.3 (three haulers)
  window.__new = mission => { const C = campNew(1, [], { seed: 5, god: true, mission }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); campOrder(C, 'launch'); __run(C, 8); C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; return C; };
  window.__foe = (C, dx, dy, kind) => campSpawn(C, kind || 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__list = (P, C, id) => { campPanelClose(P); return campPanelKey(P, C, campPanelDef(id).code, 0); }; // a list by its own key
  window.__row = (P, C, rowId, now) => { const d = campPanelDef(campPanelOpen(P)), rows = campPanelList(C, d.id), i = rows.findIndex(r => r.id === rowId); if (d.numbers) return campPanelKey(P, C, 'Digit' + (i + 1), now || 0); P.at = 0; P.top = 0; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now || 0); return campPanelKey(P, C, 'Enter', now || 0); }; // the digit of the row (a numbered list), or Down to the row, Enter
  window.__orderOf = (C, kind) => C.ships.filter(u => u.team === 'earth' && u.kind === kind).map(u => u.order);
  window.__fighters = C => C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter');
`);

console.log('A. the table, the candidates, the plan');
{
  const rows = J(`CAMP_PANELS.panels.flatMap(p => p.rows.filter(r => r.pick).map(r => p.id + ':' + r.id + ':' + r.pick))`);
  check('the rows that need a target say so in the table (`pick`): Mine ore is a field (a row of the cruiser list); Repair a ship we protect is a ward (card space-game-repair-with-ore); no other row picks (Attack, Escort and Guard went with the all-squads list)', ['yard:repairward:ward', 'cruiser:fmine:field'].every(x => rows.includes(x)) && rows.length === 2, rows.join(' '));
  g.run(`window.C1 = __new(1); window.P1 = campPanelNew();`);
  check('1.2 has three rock fields of ten rocks (a rock carries its field\'s number) and two neutral miners', J('campPickItems(C1, "field").length') === 3 && J('C1.rocks.every(r => r.field >= 0 && r.field <= 2)') && J('[0, 1, 2].every(f => C1.rocks.filter(r => r.field === f).length === 10)') && J('campConvoyShips(C1).filter(u => u.kind === "miner").length') === 2);
  const f = J('campPickItems(C1, "field")');
  check('a field is named by its number in the level ("Rock field 1"), has its rocks, how far it is, the rock the order is at (the nearest to the cruiser), and no hull; the nearest field to the cruiser is first', f.map(x => x.name).every(x => /^Rock field [123]$/.test(x)) && f.every(x => x.what === 'field' && x.n === 10 && x.hp === -1 && /^rock-/.test(x.rock) && x.r > 0 && /^[\d,.]+$/.test(String(x.km))) && J(`campPickItems(C1, 'field').map(i => campDist(i, C1.carrier)).every((d, i, a) => !i || a[i - 1] <= d)`) && J(`campPickItems(C1, 'field').every(i => C1.rocks.find(r => r.id === i.rock).field === +i.id.slice(6))`), JSON.stringify(f.map(x => [x.id, x.name, x.n, x.km])));
  check('the ships you protect, the candidates of the ward row, are the convoy ships and the miners (the repair row lists the hurt ones near the cruiser), and no hostile is a candidate of any kind', J('campPickEscorts(C1).length') >= 2 && J('campPickItems(C1, "ward").every(i => i.charge === true)') && J('["enemy", "escort", "guard"].every(k => campPickItems(C1, k).length === 0)'));
  check('the plan: many fields is a list, one is auto, none is direct (as the order always was)', (() => { g.run(`window.C1c = __new(1); window.MW = campKeyRow('fmine');`); const many = J(`campPickPlan(C1c, MW).how`); g.run(`C1c.rocks = C1c.rocks.filter(r => r.field === 1);`); const one = J(`campPickPlan(C1c, MW)`); g.run(`C1c.rocks = [];`); const none = J(`campPickPlan(C1c, MW).how`); return many === 'list' && one.how === 'auto' && one.item.what === 'field' && none === 'direct'; })());
}

console.log('B. Mine ore');
{
  g.run(`window.CF = __new(1); window.PF = campPanelNew(); __list(PF, CF, 'cruiser');`);
  const fields = J('campPickItems(CF, "field")');
  let r = J(`__row(PF, CF, 'fmine', 50)`);
  const campKeyF = c => J(`campPanelKey(PF, CF, '${c}', 60)`);
  check('Mine ore with three fields opens the sub-list of them: no order yet; the nearest field is first', !r.ran && r.open === 'cruiser' && J('PF.pick.kind') === 'field' && J('PF.pick.row') === 'fmine' && fields.length === 3 && J('campPickSync(CF, PF.pick).map(i => i.id).join()') === fields.map(i => i.id).join());
  r = campKeyF('Digit2');
  check('choosing the second field (its digit) sends the fighters mining at the nearest rock of THAT field (the order holds its id), and the lists close', r.ran && r.ok && r.row === 'fmine' && r.open === '' && J(`__fighters(CF).every(u => u.order.type === 'mine' && u.order.target === '${fields[1].rock}')`) && J(`CF.rocks.find(r => r.id === '${fields[1].rock}').field`) === +fields[1].id.slice(6) && J('CF.orders.mine') === 1, JSON.stringify(r));
  check('with ONE field left the order is given at once, at it; with none (the rocks are cut, ore lies about) it is as it always was: the wing mines what is lying about, no sub-list', (() => { g.run(`window.CG = __new(1); CG.rocks = CG.rocks.filter(r => r.field === 1); window.PG = campPanelNew(); __list(PG, CG, 'cruiser');`); const one = J(`__row(PG, CG, 'fmine', 70)`); const t = J(`campPickItems(CG, 'field')`)[0]; const okOne = one.ran && one.ok && J('PG.pick') === null && J(`__fighters(CG).every(u => u.order.type === 'mine' && u.order.target === '${t.rock}')`);
    g.run(`window.CH = __new(1); CH.rocks = []; CH.pickups.push({ id: 'chunk-1', kind: 'chunk', x: CH.carrier.x + 400, y: CH.carrier.y, ore: 20, born: 0 }); window.PH = campPanelNew(); __list(PH, CH, 'cruiser');`); const none = J(`__row(PH, CH, 'fmine', 80)`); return okOne && none.ran && none.ok && J('PH.pick') === null && J(`__fighters(CH).every(u => u.order.type === 'mine' && u.order.target === '')`); })());
  check('a field with no rock left is not a candidate (a cut field drops out), and a field is named by its number in the level, so the others keep their names', (() => { g.run(`window.CI = __new(1); const f0 = CI.rocks.filter(r => r.field === 0); f0.forEach(r => { r.hp = 0; }); `); const it = J(`campPickItems(CI, 'field').map(i => i.name).sort().join()`); return it === 'Rock field 2,Rock field 3'; })());
}

console.log('C. Esc goes back one step, to where you came from');
{
  g.run(`window.CE = __new(1); window.PE = campPanelNew();`);
  const key = (c, now = 0) => J(`campPanelKey(PE, CE, '${c}', ${now})`), open = () => J('PE.open'), pick = () => !!J('PE.pick');
  g.run(`__list(PE, CE, 'cruiser'); __row(PE, CE, 'fmine', 0);`);
  check('a target sub-list opened from the cruiser list (Q, Mine ore): Esc goes back to the cruiser list; the next Esc closes it; the one after is not the lists\' (the scene pauses)', (() => { const a = pick() && open() === 'cruiser'; const e1 = key('Escape'); const mid = !pick() && open() === 'cruiser' && e1.used; const e2 = key('Escape'); const closed = open() === '' && e2.used; const e3 = key('Escape'); return a && mid && closed && !e3.used; })());
  check('the list\'s own key (Q) closes both the sub-list and the list at once', (() => { g.run(`__list(PE, CE, 'cruiser'); __row(PE, CE, 'fmine', 0);`); const a = pick(); const k = key('KeyQ'); return a && k.used && !pick() && open() === ''; })());
  check('the target keys ] [ X go on to be the target\'s while the sub-list is open (the sub-list stays, no order is given)', (() => { g.run(`__list(PE, CE, 'cruiser'); __row(PE, CE, 'fmine', 0); window.__al = campSpawn(CE, 'raider', CE.carrier.x + 900, CE.carrier.y);`); const k = key('BracketRight'); const still = pick(); key('KeyX'); return k.used && still && J('CE.orders.mine | 0') === 0; })());
  check('every key but Esc that is the list\'s while a sub-list is open is the sub-list\'s: a digit past the candidates does nothing, and the arrows are not the list\'s (a numbered list leaves them to the ship)', (() => { const at = J('PE.pick.at'); const d = key('Digit9'); const u = key('ArrowDown'); return d.used && !d.ran && !u.used && J('PE.pick.at') === at; })());
}

console.log('D. the view of the sub-list, the candidates that come and go');
{
  g.run(`window.CV = __new(1); window.PV = campPanelNew(); __list(PV, CV, 'cruiser'); __row(PV, CV, 'fmine', 0);`);
  const V = () => J('campPanelView(PV, CV)');
  const v = V();
  check('the view is the sub-list over the list it came from: the heading says what is being picked, the key is the list\'s, the side its side, a row each with its digit (name, how far, the rocks), numbered, and the foot is the sub-list\'s digits', v.pick === true && v.id === 'cruiser' && v.key === 'Q' && v.side === 'left' && v.title === 'WHICH ROCKS TO MINE' && v.keys === 'camp.ui.candnums' && v.numbers === true && v.total === 3 && v.rows.length === 3 && v.at === -1 && v.rows.every((r, i) => r.ok && !r.more && r.key === '' && r.num === i + 1 && /^Rock field \d$/.test(r.label) && /rocks?  /.test(r.short)), JSON.stringify(v).slice(0, 400));
  check('the foot says the digits and Esc (read from the key table)', J(`uiText(campPanelView(PV, CV).keys, { last: 3 })`) === '1-3  give the order    Esc back', J(`uiText(campPanelView(PV, CV).keys, { last: 3 })`));
  check('a field cut away while the sub-list is open drops out of it (the others keep their names), and when all are gone the sub-list closes: the list it came from is the open one', (() => { const ids = J('campPickSync(CV, PV.pick).map(i => i.id)'); g.run(`CV.rocks.filter(r => r.field === ${+0}).forEach(r => { r.hp = 0; });`); const a = J('campPickSync(CV, PV.pick).map(i => i.id)'); g.run(`CV.rocks.forEach(r => { r.hp = 0; });`); const view = V(); return ids.length === 3 && a.length === 2 && view.pick === false && J('PV.pick') === null && view.id === 'cruiser'; })());
}

console.log('E. the flight view: the bracket and the zoom');
{
  g.run(`
    window.__s = (C, P) => { const o = (x = {}) => new Proxy(x, { get: (t, k) => (k in t ? t[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => { (t.log = t.log || []).push([k, ...a]); return o2(t); }) }); const o2 = t => new Proxy(t, { get: (tt, k) => (k in tt ? tt[k] : (...a) => { (tt.log = tt.log || []).push([k, ...a]); return o2(tt); }) });
      const s = { camp: C, pn: P, mode: 'play', mp: null, time: { now: 0 }, cameras: { main: { zoom: 0.335 } }, add: { graphics: () => { const g = { lines: 0, cleared: 0, setDepth() { return g; }, clear() { g.cleared++; g.lines = 0; return g; }, lineStyle() { return g; }, lineBetween() { g.lines++; return g; } }; return g; } } }; return s; };
    campZoomRange(true, 0.02); CAMZOOM.want = campZoomStart();
  `);
  g.run(`window.CZ = __new(1); window.PZ = campPanelNew(); window.SZ = __s(CZ, PZ);`);
  const want = () => J('CAMZOOM.want'), start = J('campZoomStart()');
  check('the zoom at which a candidate and the cruiser both fit: the candidate to the right has the room to the right of the middle (640 - 40 px of the screen), the one to the left what the list leaves (480 px from the edge: the list and the bracket round the candidate); a near one fits at a big zoom, a far one at a small one', (() => { const at = (dx, dy, r) => J(`campPickFit(CZ, { x: CZ.carrier.x + ${dx}, y: CZ.carrier.y + ${dy}, r: ${r} })`); const z1 = at(600, 100, 40), z2 = at(4800, 0, 60), z3 = at(-2600, 900, 40); return z1 > start && z2 < start && z2 > 0.1 && z3 < start && Math.abs(z2 - (1280 - 40 - 640) / (4800 + 60)) < 0.02; })());
  g.run(`__list(PZ, CZ, 'cruiser'); __row(PZ, CZ, 'fmine', 0); campPickPaint(SZ);`);
  check('with the sub-list open the highlighted candidate (the first field) gets a bracket (four corners: eight lines), and the view zooms out only as far as it must to show it with the cruiser, never in', (() => { const it = J('campPickShown(PZ, CZ, 0)'); const fit = J('campPickFit(CZ, campPickShown(PZ, CZ, 0))'); return !!it && it.what === 'field' && SZ_lines() === 8 && Math.abs(want() - Math.min(start, fit)) < 1e-6 && want() <= start; function SZ_lines() { return J('SZ.pickG.lines'); } })());
  check('a zoom the player makes while the list is open (the + and - keys: CAMZOOM.want) is the one that is given back, and the reveal never zooms in past it', (() => { g.run(`CAMZOOM.want = 0.2; campPickPaint(SZ);`); const kept = want() <= 0.2 + 1e-9; g.run(`campPanelClose(PZ); campPickPaint(SZ);`); return kept && Math.abs(want() - 0.2) < 1e-9; })());
  check('leaving the list by Esc, the list\'s key, the map or a card gives the zoom back and takes the bracket down', (() => { const back = (x, lines) => { g.run(`SZ.mp = null; SZ.mode = 'play'; CAMZOOM.want = campZoomStart(); campPanelClose(PZ); PZ.seen = null; campTgtClear(CZ); __list(PZ, CZ, 'cruiser'); __row(PZ, CZ, 'fmine', 0); campPickPaint(SZ);`); const on = J('SZ.pickG.lines') === 8; g.run(x); g.run('campPickPaint(SZ);'); return on && Math.abs(want() - J('campZoomStart()')) < 1e-9 && J('SZ.pickG.lines') === lines; };
    return back(`campPanelKey(PZ, CZ, 'Escape', 0); campPanelKey(PZ, CZ, 'Escape', 0)`, 0) && back(`campPanelKey(PZ, CZ, 'KeyQ', 0)`, 0) && back(`SZ.mp = {}`, 0) && back(`SZ.mode = 'won'`, 0) && (g.run(`SZ.mp = null; SZ.mode = 'play';`), true); })());
  check('after an order the bracket stays CAMP_PICK.seen ms on what it was given at (and does not move the view), then goes', (() => { g.run(`SZ.mp = null; SZ.mode = 'play'; campPanelClose(PZ); PZ.seen = null; campTgtClear(CZ); CAMZOOM.want = campZoomStart(); __list(PZ, CZ, 'cruiser'); __row(PZ, CZ, 'fmine', 5000); campPanelKey(PZ, CZ, 'Digit1', 5000); SZ.time.now = 5100; campPickPaint(SZ);`); const on = J('SZ.pickG.lines') === 8 && Math.abs(want() - J('campZoomStart()')) < 1e-9; g.run(`SZ.time.now = 5000 + CAMP_PICK.seen + 1; campPickPaint(SZ);`); return on && J('SZ.pickG.lines') === 0 && J('PZ.seen') === null; })());
  check('a rock field is bracketed by the whole of it (its radius), never less than the bracket\'s least size on the screen', (() => { g.run(`window.CY = __new(1); window.PY = campPanelNew(); window.SY = __s(CY, PY); __list(PY, CY, 'cruiser'); __row(PY, CY, 'fmine', 0); campPickPaint(SY);`); const f = J('campPickShown(PY, CY, 0)'); return f.what === 'field' && f.r > 150 && J('SY.pickG.lines') === 8; })());
}

console.log('F. the orders as they always were');
{
  check('a typed or spoken order never meets the pick: "red squad attack the raider" and the plain bot\'s Attack (campOrder) are given at once, with none of the state of the lists', (() => { g.run(`window.CX = __new(0); __foe(CX, 700, 0); __foe(CX, -900, 0); window.PX = campPanelNew();`); const r = J(`campOrder(CX, 'wing', 'red squad attack the raider', 'strip')`), q = J(`campOrder(CX, 'attack', '', 'bot')`); return r.ok && q.ok && J('PX.pick') === null && J('CX.orders.attack') >= 2; })());
  check('the game made no error', J('0') === 0 && g.errors.length === 0, JSON.stringify(g.errors).slice(0, 300));
}

console.log(failed ? `TARGET PICK FAIL (${failed} of ${n})` : `TARGET PICK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
