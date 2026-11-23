// smoke: the pilots start out beside the cruiser, an order given to a pilot in the bay launches it, there is no Launch (plain Node, no Chrome)
// Card space-game-keys-orders (Troy, 23 Nov 2026: "an order to a pilot in the bay launches them. There is no Launch key or row; pilots start each mission already out beside the cruiser").
// src/campaign.js (campNew: the start-out), src/campwing.js (campWingOrder: the docked pilots), src/camptarget.js (campSelOrder: the order keys), src/data_controls.js (the table: E G R, the Q list).
//   A. a mission begins with the three pilots out, one in each squad, guarding the cruiser: nothing is in the bay and nothing is launching; the Launch order has nothing to do
//   B. a pilot that was recalled and has landed is in the bay; an order to it launches it with that order (Attack, Guard, Escort, Mine), one pilot or all three; Recall to ships that are all home says so
//   C. a pilot being mended goes out with the order when it is whole
// Run: node tests/campkeysorders.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const sec = (name, fn) => { console.log(name); try { fn(); } catch (e) { check(name + ': ran without a throw', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); } };
const g = nodeGame();
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
  check('the table has no Launch row (no key and no row)', J(`campKeyRow('launch')`) === null);
});

sec('B. an order launches a pilot in the bay', () => {
  g.run('__new(); __home(); window.__r1 = __raider(900, 300); window.__r2 = __raider(-700, 500);');
  check('all three flew home, landed and are in the bay', J('C.bay.fighters') === 3 && J('__out().length') === 0, J('C.bay.fighters') + ' in the bay, ' + J('__out().length') + ' out');
  const none = J(`campSelOrder(C, 'recall', 'key')`);
  check('Recall with every pilot home says no fighters are out, and does not launch them', none.ok === false && /no fighters/i.test(none.say) && J('__out().length') === 0, JSON.stringify(none));
  g.run('C.tgt = __r1.id; C.sel = "pilot:green";');
  const dry = J(`campSelOrder(C, 'attack', 'key', true)`);
  check('the dry run says the attack can be given (a pilot in the bay takes it) and launches nothing', dry.ok === true && J('__out().length') === 0 && J('C.bay.fighters') === 3, JSON.stringify(dry));
  const o = J(`campSelOrder(C, 'attack', 'key')`);
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
  g.run('__new(); window.__r1 = __raider(900, 300); C.tgt = __r1.id; C.sel = "pilot:red"; __out().find(x => x.squad === "red").hp = 1; __run(60);');
  const state = J(`({ repairs: C.repairs.length, out: __out().map(u => u.squad).sort().join(), bay: C.bay.fighters })`);
  check('Wedge, hurt, flew home and is being mended (the other two are out)', state.repairs === 1 && state.out === 'green,yellow', JSON.stringify(state));
  const o = J(`campSelOrder(C, 'attack', 'key')`);
  check('an order to Wedge while he is mended is taken (he goes out with it when he is whole)', o.ok === true && J(`C.repairs[0].order && C.repairs[0].order.type === 'attack' && C.repairs[0].stay === false`), JSON.stringify(o));
});

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nAll ${n} checks passed.`);
process.exit(failed ? 1 : 0);
