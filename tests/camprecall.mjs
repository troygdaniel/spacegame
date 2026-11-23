// smoke: Recall given while the bay is still emptying: the ships still in the launch queue go back aboard, and none comes out later with the old order (plain Node, no Chrome)
// Card space-game-recall-while-launching (found by 3-GEN): Launch queues every ship of the bay (C.launchQ) and one leaves every CAMP.bay.launchEvery ms. A Recall in between sent the ships that were out home and left the
// rest in the queue, which came out afterwards with the guard and escort orders of a launch; a burn that waits for the wing aboard (src/campnav.js) counted them and waited for ships never recalled. src/campwing.js
// campWingQueueBack is the rule: the ships of the recalled group still in the queue are put back in the bay.
//   A. the rule: Recall (everyone) with some out and some queued: the queue is empty, the bay has them back, nothing leaves later, every ship is aboard in the end
//   B. the groups: Fighters put the queued fighters back, one squad puts none back; a group of named ships puts none back
//   C. what stays as it was: nothing out yet (all in the queue) is still "launching"; the check (dry) does nothing; a recall with nothing queued changes no count; a second Launch after a Recall works
//   D. the burn: Fast pressed twice while the bay empties waits for the ships out only, and starts when they are aboard
//   E. the words: the same line as before; the order counts once
// Run: node tests/camprecall.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__run = (C, s) => { for (let i = 0; i < Math.round(s * 30) && !C.result; i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__mars = C => campNavRows(C).find(r => r.id === 'place:mars');
  // a battle with the wing launched and the bay still emptying after s seconds: 8 fighters in all
  window.__new = s => { window.C = __quiet(campNew('home', [], { seed: 1, god: true })); campOrder(C, 'launch'); __run(C, s); return C; };
  window.__total = () => C.bay.fighters + campWing(C).length + C.launchQ.length;
  window.__q = k => C.launchQ.filter(x => x === k).length;
`);

console.log('A. the rule');
{
  g.run(`__new(1.5); window.__before = { out: campWing(C).length, q: C.launchQ.length, bay: C.bay.fighters };`);
  check('the set-up: the bay is still emptying (some ships out, some in the queue) and nothing is lost', J('__before.out') >= 2 && J('__before.q') >= 3 && J('__before.bay') === 0 && J('__total()') === 8, J('JSON.stringify(__before)'));
  g.run(`window.__r = campOrder(C, 'recall');`);
  check('Recall is accepted and says the old line ("Wing, return to the carrier.")', J('__r.ok') === true && J('__r.code') === 'recall' && J('__r.say') === 'Wing, return to the carrier.', J('__r.say'));
  check('the queue is empty at once and the bay has the ships back (the ones that were queued, no more, no less)', J('C.launchQ.length') === 0 && J('C.bay.fighters') === J('__before.q') && J('__r.queued') === J('__before.q'));
  check('the ships already out are recalled as before (their order is recall)', J('campWing(C).length') === J('__before.out') && J('campWing(C).every(u => u.order.type === "recall")'));
  g.run(`window.__launched = C.launched; __run(C, 20);`);
  check('nobody comes out afterwards (C.launched stays), and the whole wing is aboard in the end: 8 fighters in the bay, none out', J('C.launched') === J('__launched') && J('campWing(C).length') === 0 && J('C.bay.fighters') === 8 && J('C.launchQ.length') === 0, J('JSON.stringify([C.launched, C.bay, campWing(C).length])'));
  check('campNavOut counts nothing (a burn would not wait for a ship that is not out)', J('campNavOut(C)') === 0);
  g.run(`__new(1.5); campOrder(C, 'recall'); __run(C, 1); window.__late = campWing(C).filter(u => u.order.type !== 'recall' && !u.docked && u.hp > 0).length;`);
  check('before the fix the late launchers came out with the guard or escort order: now no ship of the wing has any order but recall', J('__late') === 0 && J('campWing(C).every(u => u.order.type === "recall")'));
}

console.log('B. the groups');
{
  g.run(`__new(1.5); window.__q0 = { f: __q('fighter') }; window.__bf = C.bay.fighters; window.__r = campWingOrder(C, 'fighters', 'recall', null, 'test');`);
  check('Fighters recall puts the queued fighters back: all three squads, the whole queue', J('__r.ok') === true && J('C.bay.fighters') === J('__bf + __q0.f') && J('__q("fighter")') === 0 && J('__r.queued') === J('__q0.f'), J('JSON.stringify([__q0, C.bay, C.launchQ])'));
  g.run(`__run(C, 6);`);
  check('the fighters do not come out again; nothing is lost', J('campWing(C, "fighter").every(u => u.order.type === "recall" || u.docked)') && J('__total()') === 8);
  g.run(`__new(1.5); window.__ql = C.launchQ.length; window.__r = campWingOrder(C, 'red', 'recall', null, 'test');`);
  check('Red recall (one squad) leaves the queue as it was: a squad has no ships in the queue, a fighter joins its squad when it leaves the bay', J('__r.ok') === true && J('C.launchQ.length') === J('__ql') && J('__r.queued') === 0);
  g.run(`__new(1.5); window.__id = campWing(C, 'fighter')[0].id; C.groups = { alpha: { name: 'Alpha', ships: [__id] } }; window.__q0 = C.launchQ.length; window.__r = campWingOrder(C, 'alpha', 'recall', null, 'test');`);
  check('a group of named ships recalls those ships and puts nothing back (the queue has no ids yet)', J('__r.ok') === true && J('__r.n') === 1 && J('C.launchQ.length') === J('__q0') && J('C.bay.fighters') === 0 && J('__r.queued') === 0);
}

console.log('C. what stays as it was');
{
  g.run(`window.C = __quiet(campNew('home', [], { seed: 1, god: true })); campOrder(C, 'launch'); window.__r = campOrder(C, 'recall');`);
  check('nothing out yet (all in the queue): "The wing is still launching.", the queue is untouched, no order is counted', J('__r.ok') === false && J('__r.code') === 'launching' && J('__r.say') === 'The wing is still launching.' && J('C.launchQ.length') === 8 && J('C.orders.recall') === 0);
  g.run(`__new(1.5); window.__q0 = C.launchQ.slice(); window.__bay = C.bay.fighters; window.__c = campCheck(C, 'recall', '');`);
  check('the check (the ship computer asks first) answers yes and does nothing: queue and bay are as they were, no order is counted', J('__c.ok') === true && J('JSON.stringify(C.launchQ)') === J('JSON.stringify(__q0)') && J('C.bay.fighters') === J('__bay') && J('C.orders.recall') === 0 && J('campWing(C).every(u => u.order.type !== "recall")'));
  g.run(`__new(8); window.__bay0 = JSON.stringify(C.bay); window.__r = campOrder(C, 'recall');`);
  check('a recall with nothing in the queue puts nothing back: the bay is as it was, the order counts once', J('__r.ok') === true && J('JSON.stringify(C.bay)') === J('__bay0') && J('__r.queued') === 0 && J('C.orders.recall') === 1);
  g.run(`__run(C, 20); window.__r2 = campOrder(C, 'launch'); __run(C, 8);`);
  check('after a recall that put ships back, Launch works again and the whole wing comes out', J('__r2.ok') === true && J('campWing(C).length') === 8 && J('C.launchQ.length') === 0 && J('C.bay.fighters') === 0, J('JSON.stringify([__r2, campWing(C).length, C.bay])'));
  g.run(`__new(1.5); campOrder(C, 'recall'); window.__again = campOrder(C, 'launch');`);
  check('Launch pressed again right after the Recall sends the ships that went back out again (they are in the bay, the queue is the bay)', J('__again.ok') === true && J('C.launchQ.length') > 0);
  g.run(`__new(1.5); window.__r = campOrder(C, 'recall'); window.__rep = (C.repairs || []).length;`);
  check('the fighters being mended aboard are not touched by it (no new repair, none lost)', J('__rep') === 0 && J('Array.isArray(C.repairs)'));
}

console.log('D. the burn');
{
  g.run(`__new(1.5); window.__nq = C.launchQ.length; window.__nout = campWing(C).length; campNavFly(C, __mars(C), true, 'key'); window.__r = campNavFly(C, __mars(C), true, 'key');`);
  check('the second press of Fast while the bay empties recalls the wing and waits for the ships OUT only (not for the ones that were still in the queue)', J('__r.ok') === true && J('__r.waiting') === true && J('C.navWait.n') === J('__nout') && J('__r.say') === 'Recalling... ' + J('__nout') + ' out.' && J('C.launchQ.length') === 0 && J('campNavOut(C)') === J('__nout'), J('JSON.stringify([__nout, __nq, C.navWait && C.navWait.n, __r.say])'));
  g.run(`for (let i = 0; i < 30 * 15 && C.navWait; i++) { campStep(C, 1 / 30); C.events.length = 0; }`);
  check('the ships land and the burn starts by itself with the whole wing aboard (8 fighters)', J('C.navWait') === null && J('C.nav && C.nav.fast') === true && J('campNavOut(C)') === 0 && J('C.bay.fighters') === 8, J('JSON.stringify([C.nav, C.bay])'));
}

console.log('E. the words');
{
  check('the rule is in the one place, the recall branch of campWingOrder (campDo, the strip, the voice and the nav all go through it); the nav counts the ships left after it', (() => { const s = src('src/campwing.js'), i = s.indexOf("if (verb === 'recall') {"), j = s.indexOf('return campWingDone', i); return i > 0 && j > i && s.slice(i, j).indexOf('campWingQueueBack(C, id)') > 0 && src('src/campnav.js').indexOf('const left = campNavOut(C)') > 0; })());
  check('"recall" said in words does the same: the queued ships go back', (() => { g.run(`__new(1.5); window.__q1 = C.launchQ.length;`); const r = J('campOrder(C, "wing", "all recall")'); return (r.ok === true) && J('C.launchQ.length') === 0 && J('C.bay.fighters') === J('__q1'); })());
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
