// smoke: the pilots start out beside the cruiser, an order given to a pilot in the bay launches it, there is no Launch (plain Node, no Chrome)
// Card space-game-keys-orders (Troy, 23 Nov 2026: "an order to a pilot in the bay launches them. There is no Launch key or row; pilots start each mission already out beside the cruiser").
// src/campaign.js (campNew: the start-out), src/campwing.js (campWingOrder: the docked pilots), src/camptarget.js (campSelOrder: the order keys), src/data_controls.js (the table: E G R, the Q list).
//   A. a mission begins with the three pilots out, one in each squad, guarding the cruiser: nothing is in the bay and nothing is launching; the Launch order has nothing to do
//   B. a pilot that was recalled and has landed is in the bay; an order to it launches it with that order (Attack, Guard, Escort, Mine), one pilot or all three; Recall to ships that are all home says so
//   C. a pilot being mended goes out with the order when it is whole
//   D. the keys: E acts on the picks (card space-game-keys2-orders made it the one order key: G and R are free now, there is no recall); T, W, U and I are free; a pilot in the bay can be picked with A and D and takes the order
//   E. S is the cruiser list (Mine, Dock, Repair hull, ...); the all-squads list is deleted (card space-game-delete-off-lists)
// Run: node tests/campkeysorders.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const sec = (name, fn) => { console.log(name); try { fn(); } catch (e) { check(name + ': ran without a throw', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  CAMP.levels[1].missions.push({ id: 'ko', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30], rocks: [], objectives: [{ type: 'hold', secs: 100000 }], bonus: [], convoys: [], waves: [], traffic: [] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__raider = (dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__new = () => { window.C = campNew(1, [], { seed: 5, god: false, mission: __M }); C.arrivedAt = 0; return C; };
  window.__out = () => campWing(C, 'fighter');
  window.__home = () => { campOrder(C, 'recall'); for (let i = 0; i < 40 && (__out().length || C.repairs.length); i++) __run(2); return C.bay.fighters; };
`);

sec('A. the pilots start out', () => {
  g.run('__new()');
  check('three fighters are out at once, one in each squad (red, green, yellow: Wedge, Kara, Apollo), beside the cruiser', J(`__out().map(u => u.squad + ':' + campPilotName(u)).sort().join()`) === 'green:Kara,red:Wedge,yellow:Apollo' && J(`__out().every(u => campDist(u, C.carrier) < 90)`));
  check('nothing is in the bay and nothing is launching', J('C.bay.fighters') === 0 && J('C.launchQ.length') === 0);
  check('they guard the cruiser, and they are fighters of the wing (campWing counts them)', J(`__out().every(u => u.order && u.order.type === 'guard' && u.order.at.kind === 'carrier')`) && J(`campWing(C).length`) === 3);
  g.run('__run(5)');
  check('after five seconds they are still three, still out (nothing sends them home)', J('__out().length') === 3 && J('C.bay.fighters') === 0);
  const r = J(`campOrder(C, 'launch')`);
  check('the Launch order has nothing to do: the bay is empty (no key and no row has it any more)', r.ok === false && r.code === 'baydry', JSON.stringify(r));
  check('there is no Launch row in any list: the all-squads list that had it is deleted (card space-game-delete-off-lists)', J(`campKeyVia('launch')`) === null && J(`campKeyRow('launch')`) === null);
});

sec('B. an order launches a pilot in the bay', () => {
  g.run('__new(); __home(); window.__r1 = __raider(900, 300); window.__r2 = __raider(-700, 500);');
  check('all three flew home, landed and are in the bay', J('C.bay.fighters') === 3 && J('__out().length') === 0, J('C.bay.fighters') + ' in the bay, ' + J('__out().length') + ' out');
  const none = J(`campSelOrder(C, 'engage', 'key', true)`);
  check('a dry E with every pilot home says it can be given (the pilots in the bay take it by launching) and launches nothing', none.ok === true && none.formup === true && J('__out().length') === 0 && J('C.bay.fighters') === 3, JSON.stringify(none));
  g.run('C.tgt = __r1.id; C.sel = "";');
  const dry = J(`campWingOrder(C, 'green', 'attack', __r1.id, 'key', true)`);
  check('the dry run says the attack can be given (a pilot in the bay takes it) and launches nothing', dry.ok === true && J('__out().length') === 0 && J('C.bay.fighters') === 3, JSON.stringify(dry));
  const o = J(`campWingOrder(C, 'green', 'attack', __r1.id, 'key')`);
  check('Kara, in the bay, attacks the picked hostile: she is out at once with that order, Wedge and Apollo stay in the bay', o.ok === true && J(`__out().map(u => campPilotName(u)).join()`) === 'Kara' && J(`__out()[0].order.type === 'attack' && __out()[0].order.target === __r1.id`) && J('C.bay.fighters') === 2, JSON.stringify(o));
  g.run('C.sel = "all";');
  const o2 = J(`campSelOrder(C, 'guard', 'key')`);
  check('all pilots: Guard (nothing friendly picked: the cruiser) launches the two still in the bay and Kara guards too', o2.ok === true && J('__out().length') === 3 && J('C.bay.fighters') === 0 && J(`__out().every(u => u.order.type === 'guard' && u.order.at.kind === 'carrier')`), JSON.stringify(o2));
  g.run('__home();');
  g.run('C.sel = "all"; C.tgt = __r2.id;');
  const o3 = J(`campSelOrder(C, 'attack', 'key')`);
  check('all pilots in the bay attack together: three launch, all at the hostile, one in each squad', o3.ok === true && J(`__out().map(u => u.squad).sort().join()`) === 'green,red,yellow' && J(`__out().every(u => u.order.type === 'attack' && u.order.target === __r2.id)`) && J('C.bay.fighters') === 0, JSON.stringify(o3));
  g.run('__home(); C.sel = "pilot:yellow";');
  const o4 = J(`campWingOrder(C, 'yellow', 'mine', null, 'key')`);
  check('an order by a squad word goes the same way: Mine launches Apollo (rocks or ore about) or says there is nothing to mine, and never launches for nothing', (o4.ok && J(`__out().length`) === 1 && J(`__out()[0].squad`) === 'yellow') || (!o4.ok && J('__out().length') === 0 && J('C.bay.fighters') === 3), JSON.stringify(o4));
});

sec('C. a pilot being mended', () => {
  g.run('__new(); window.__r1 = __raider(900, 300); C.tgt = __r1.id; C.sel = ""; __out().find(x => x.squad === "red").hp = 1; for (let i = 0; i < 60 && !C.repairs.length; i++) __run(0.5);');
  const state = J(`({ repairs: C.repairs.length, out: __out().map(u => u.squad).sort().join(), bay: C.bay.fighters })`);
  check('Wedge, hurt, flew home and is being mended (the other two are out)', state.repairs === 1 && state.out === 'green,yellow', JSON.stringify(state));
  const o = J(`campWingOrder(C, 'red', 'attack', __r1.id, 'key')`);
  check('an order to Wedge while he is mended is taken (he goes out with it when he is whole)', o.ok === true && J(`C.repairs[0].order && C.repairs[0].order.type === 'attack' && C.repairs[0].stay === false`), JSON.stringify(o));
});

sec('D. E is the order key; G and R are free', () => {
  g.run('__new(); window.__r1 = __raider(900, 300); window.__t = (() => { const f = campSpawn(C, "freighter", C.carrier.x + 500, C.carrier.y); f.id = "freighter-t1"; C.by[f.id] = f; f.dest = { x: C.carrier.x + 9000, y: C.carrier.y }; f.cname = "Transport"; f.named = true; return f; })(); window.PP = campPanelNew(); window.__k = c => campPanelKey(PP, C, c, 0);');
  check('the table: Enter is the order key (card space-game-keys6-enter: it was E); G and R are on no order key, and C is the cockpit key (card space-game-fly-fighter-l1: no order is on it); and no key of the Campaign table is T, U or I (and no other key is Enter but the list pick)', J(`CAMP_KEYS.order.k`) === 'Enter' && J(`!CAMP_KEYS.recall && !campKeyIs('guard', 'KeyG') && !campKeyIs('order', 'KeyR') && !campKeyIs('order', 'KeyC')`) === true && J(`Object.keys(CAMP_KEYS).every(id => !CAMP_KEYS[id].codes.some(c => ['KeyT', 'KeyU', 'KeyI'].indexOf(c) >= 0 || (c === 'Enter' && id !== 'order' && id !== 'pick')))`) && J(`campKeyIs('order', 'Enter')`) && J(`CAMP_PANELS.panels.every(p => ['KeyT', 'Enter', 'KeyU', 'KeyI'].indexOf(p.code) < 0)`));
  g.run('C.tgt = __r1.id; C.sel = "all"; C.fsel = "";');
  const e = J(`__k('Enter')`);
  check('W: all three pilots attack the picked enemy', e.used && e.ran && e.ok && J(`__out().length === 3 && __out().every(u => u.order.type === 'attack' && u.order.target === __r1.id)`), JSON.stringify(e));
  g.run('C.tgt = "";');
  const gd = J(`__k('Enter')`);
  check('W with nothing picked: all three form up on the cruiser', gd.used && gd.ran && gd.ok && J(`__out().every(u => u.order.type === 'guard' && u.order.at.kind === 'carrier')`), JSON.stringify(gd));
  g.run('C.fsel = __t.id;');
  const gf = J(`__k('Enter')`);
  check('W with a friendly picked (the transport): the pilots guard it', gf.used && gf.ran && gf.ok && J(`__out().every(u => u.order.type === 'guard' && u.order.at.id === __t.id)`), JSON.stringify(gf));
  const rc = J(`__k('KeyR')`), gk = J(`__k('KeyG')`);
  g.run('__run(1)');
  check('G is free and R builds missiles (a full rack: refused in words): no order is given to the pilots, they stay out guarding the transport', rc.used && rc.ran && rc.row === 'sreload' && !gk.used && !gk.ran && J(`__out().length === 3 && __out().every(u => u.order.type === 'guard' && u.order.at.id === __t.id)`), JSON.stringify([rc, gk]));
  const old = ['KeyT', 'KeyU', 'KeyI'].map(c => J(`(() => { const r = __k('${c}'); return r.used || r.ran || !!campPanelOpen(PP); })()`));
  check('T, U and I do nothing now: no order, no list', old.every(x => x === false), JSON.stringify(old));
  g.run('__home();');
  check('with all three in the bay A and D still stop at each pilot (All pilots, Wedge, Kara, Apollo): a pilot in the bay can be picked', J(`campSelList(C).map(x => x.name).join()`) === 'All pilots,Wedge,Kara,Apollo', J(`campSelList(C).map(x => x.name).join()`));
  g.run('C.sel = "pilot:green"; C.tgt = __r1.id; __k("Escape");');
  const k2 = J(`__k('Enter')`);
  check('Kara picked, in the bay, W: she launches and attacks alone; Wedge and Apollo stay in the bay', k2.ok && J(`__out().map(u => campPilotName(u)).join()`) === 'Kara' && J(`__out()[0].order.target === __r1.id`) && J('C.bay.fighters') === 2, JSON.stringify(k2));
});

sec('E. S is the cruiser list; the W list is off', () => {
  g.run('__new(); window.PP = campPanelNew(); window.__k = c => campPanelKey(PP, C, c, 0); C.rocks.push({ id: "rock-t", x: C.carrier.x + 600, y: C.carrier.y, hp: 100, maxHp: 100, r: 30, ore: 5, cutAt: -1e9, field: 0 });');
  const q = J(`__k('KeyQ')`);
  check('S opens the cruiser list, with six rows (card space-game-keys2-cruiser): the two autopilot rows, Mine ore, Dock at the outpost, Repair hull (card space-game-keys3-repair: Dock and repair is switched off), Emergency shields, Form up on me (card space-game-keys7-trim: Reload missiles and the warp blink are off the list)', q.used && J('campPanelOpen(PP)') === 'cruiser' && J(`campPanelList(C, 'cruiser').map(r => r.label).join()`) === 'Fly to the goal,Fly to the target,Mine ore,Dock at the outpost,Repair hull,Emergency shields,Form up on me', JSON.stringify(q) + J(`campPanelList(C, 'cruiser').map(r => r.label).join()`));
  const rp = J(`__k("Digit5")`);
  check('The digit 5 on Repair hull (the fifth row; card space-game-s-list-numbers) with the hull whole is refused in words ("the hull is sound") and the list stays open on it: no dock list opens (the dock list has no way in)', rp.ran && !rp.ok && rp.row === 'srepair' && J('campPanelOpen(PP)') === 'cruiser' && J('PP.at') === 4 && !J(`campPanelList(C, 'cruiser').some(r => r.id === 'gdock')`), JSON.stringify(rp));
  g.run('__k("Escape"); __k("KeyS"); __k("KeyS");');
  check('S again closes the list', J('campPanelOpen(PP)') === '');
  const m = J(`(() => { __k('KeyQ'); const r = __k('Digit3'); return { r, open: campPanelOpen(PP), pick: !!PP.pick }; })()`);
  check('The digit 3 on Mine ore with a field of rocks to pick sends the pilots to mine it (one field: at once)', (m.r.ran && m.r.ok && J(`__out().every(u => u.order.type === 'mine')`)) || (m.pick && !m.r.ran), JSON.stringify(m));
  g.run('PP = campPanelNew();');
  const w = J(`__k('Enter')`), u = J(`__k('KeyU')`);
  check('U opens nothing, and W opens no list: it is the order key (the key is used and an order is tried, in words), no list opens', w.used && w.ran && !u.used && J('campPanelOpen(PP)') === '', JSON.stringify([w, u]));
  check('the key line names Q Cruiser and W Fleet alone (the power and autopilot lists have no key now: O and P are free), and not U', /Q Cruiser  W Fleet/.test(J('campPanelKeyLine()')) && !/\bP Power|\bO Autopilot/.test(J('campPanelKeyLine()')) && !/\bU \w/.test(J('campPanelKeyLine()')), J('campPanelKeyLine()'));
  check('the dock list is reached from the cruiser list on paper: its way in is Q, then its row (a hint reads it from the table; the row is switched off, so no key goes there)', J(`campKeyOpens('yard')`) === 'Q' && J(`campKeyPath('yard')`) === 'Q, Dock and repair' && J(`campKeyOpens('squads')`) === '', J(`campKeyPath('yard')`));
  check('S is the cruiser list, Mine ore is one of its rows, and W, U and Q open no list', J(`(() => { PP = campPanelNew(); __k('KeyQ'); return campPanelOpen(PP); })()`) === 'cruiser' && J(`campKeyVia('fmine').id`) === 'cruiser' && J(`(() => { const out = ['Enter', 'KeyU', 'KeyB'].map(c => { PP = campPanelNew(); __k(c); return campPanelOpen(PP); }); return out.join(); })()`) === ',,');
});

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nAll ${n} checks passed.`);
process.exit(failed ? 1 : 0);
