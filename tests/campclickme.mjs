// smoke: click your own ship and click a rock field (card space-game-orders-click-me-and-rocks; Troy, 27 Nov 2026): left holds it as the target, so a picked pilot + click me + Enter = guard me, and a picked pilot + click a field + Enter = mine it; right-click does the pick and the order at once (plain Node, no Chrome)
// src/campclick.js (campClickHit, campClickPick, campClickAct), src/camptarget.js (campFriMe, campFriHoldMe, campFriHoldField; campSelOrder's guard target for "me"), the words in src/camporderline.js ("Wedge  guard  me"). The wiring (a press that does not move is a click, a drag pans) is src/campdrag.js, as before.
//   A  what is under a point: your own ship is "me" (the cruiser, or the fighter you fly; the fighter you fly is not a pilot to pick), a rock of a field is that field, a ship has the click before a rock, space is none; the hit circle grows as the view zooms out
//   B  a left click: me and a field are THE target held (the enemy let go, one target); a click on an enemy lets them go; a pilot is still WHO
//   C  Enter after the clicks: Wedge + me = guard me (the sentence line reads "Wedge  guard  me"; he comes to the cruiser, or to the fighter you fly); Kara + a field = mine it
//   D  a right click does the pick and the order at once: on me the pilots guard me, on a field they mine; on your own pilot it still only picks
// Run: node tests/campclickme.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));

g.run(`window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 1 }); C.arrivedAt = 0; for (let i = 0; i < 120; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); window.P = campPanelNew(); return C; };
  window.__ord = k => campWingShips(C, k).map(u => (u.order && u.order.type) + ':' + ((u.order && (u.order.target || (u.order.at && (u.order.at.id || u.order.at.kind)))) || '')).join();
  window.__rock = () => C.rocks.find(r => r.hp > 0 && r.field === 0);`);

console.log('A. what is under a point');
{
  g.run(`__mk();`);
  const me = J('campClickHit(C, C.carrier.x, C.carrier.y, 1)');
  check('the cruiser: "me" (id me, the cruiser unit), not a hostile, a friendly or a pilot', me && me.kind === 'me' && me.id === 'me' && me.unit.id === J('C.carrier.id'), JSON.stringify(me && [me.kind, me.id]));
  const rk = J('(() => { const r = __rock(); const h = campClickHit(C, r.x, r.y, 1); return h && { kind: h.kind, id: h.id, rock: h.rock.id }; })()');
  check('a rock of a field: that field (id field-0), and the rock it was', rk && rk.kind === 'field' && rk.id === 'field-0' && rk.rock === J('__rock().id'), JSON.stringify(rk));
  check('empty space: none', J('campClickHit(C, C.carrier.x + 5000, C.carrier.y - 5000, 1)') === null);
  check('the hit circle grows as the view zooms out: a point 40 px (screen) off a rock is a miss at zoom 1 and a hit at zoom 0.3', J('(() => { const r = __rock(); const off = 40 + (r.r || 0); return [campClickHit(C, r.x + off, r.y, 1) === null, campClickHit(C, r.x + off, r.y, 0.3) !== null]; })()').join() === 'true,true');
  g.run(`{ const f = campWingShips(C, 'red')[0]; window.__fw = f; f.x = C.carrier.x + 300; f.y = C.carrier.y; const r = __rock(); r.x = f.x; r.y = f.y; }`);
  check('a ship has the click before a rock: a pilot on top of a rock is the pilot', J('campClickHit(C, __fw.x, __fw.y, 1).kind') === 'pilot');
  g.run(`campCockpitTake(C, __fw.id);`);
  const fl = J('campClickHit(C, __fw.x, __fw.y, 1)');
  check('the fighter you fly is "me" (the eye), not a pilot to pick; the cruiser is then no one to click', fl && fl.kind === 'me' && fl.unit.id === J('__fw.id') && J('campClickHit(C, C.carrier.x, C.carrier.y, 1)') === null, JSON.stringify(fl && [fl.kind, fl.id]));
  g.run(`campCockpitGive(C, 'hand');`);
}

console.log('B. a left click');
{
  g.run(`__mk(); window.__foe = campSpawn(C, 'raider', C.carrier.x + 800, C.carrier.y); campTgtHold(C, __foe.id);`);
  g.run(`window.__r = campClickAct(P, C, campClickHit(C, C.carrier.x, C.carrier.y, 1), 'left', 1000);`);
  check('a left click on the cruiser holds "me" as the target and lets the enemy go (one target), and gives no order', J('__r.used') === true && J('C.fsel') === 'me' && J('C.tgt') === '' && J('__r.ran') === null && J('campHeldNow(C).name') === 'me' && J('campHeldNow(C).kind') === 'friendly');
  g.run(`window.__r = campClickAct(P, C, campClickHit(C, __rock().x, __rock().y, 1), 'left', 1100);`);
  check('a left click on a rock holds its field (Rock field 1) and lets "me" go', J('__r.used') === true && J('C.fsel') === 'field-0' && J('campHeldNow(C).name') === 'Rock field 1' && J('__r.ran') === null);
  g.run(`campClickAct(P, C, campClickHit(C, __foe.x, __foe.y, 1), 'left', 1200);`);
  check('a left click on an enemy holds the enemy and lets the field go', J('C.tgt') === J('__foe.id') && J('C.fsel') === '');
  g.run(`campClickAct(P, C, campClickHit(C, C.carrier.x, C.carrier.y, 1), 'left', 1300); window.__pw = campWingShips(C, 'green')[0]; campClickAct(P, C, campClickHit(C, __pw.x, __pw.y, 1), 'left', 1400);`);
  check('a left click on a pilot is still WHO (Kara) and leaves the target ("me") held', J('C.sel') === 'pilot:green' && J('C.fsel') === 'me');
}

console.log('C. Enter after the clicks');
{
  g.run(`__mk(); window.__pr = campWingShips(C, 'red')[0]; campClickAct(P, C, campClickHit(C, __pr.x, __pr.y, 1), 'left', 1000); campClickAct(P, C, campClickHit(C, C.carrier.x, C.carrier.y, 1), 'left', 1100);`);
  const L = J('campOrderLine(C)');
  check('click Wedge, click the cruiser: the line reads "Wedge  guard  me" (the verb guard, the target me, a friendly); the tip is on the cruiser', L && L.who.t === 'Wedge' && L.verb.t === 'guard' && L.target.t === 'me' && L.target.ghost === false && L.tip.id === J('C.carrier.id') && L.tip.text === 'Wedge will guard', JSON.stringify(L));
  g.run(`window.__e = campSelOrder(C, 'engage', 'key');`);
  check('Enter: Wedge guards the cruiser (the pilots\' own place to guard); the others are as they were', J('__e.ok') === true && J(`__ord('red')`).indexOf('guard') === 0 && J('__e.verb') === 'guard', J(`__ord('red')`));
  g.run(`__mk(); campWingShips(C, 'red').concat(campWingShips(C, 'green')).forEach(u => { u.order = { type: 'mine', target: '' }; }); campSelPick(C, 'pilot:red', 'key'); window.__f = campWingShips(C, 'green')[0]; campCockpitTake(C, __f.id); campClickAct(P, C, campClickHit(C, __f.x, __f.y, 1), 'left', 1000); window.__e = campSelOrder(C, 'engage', 'key');`);
  check('flying Kara: click her (me), pick Wedge, Enter: Wedge guards the FIGHTER (the order is at her, not at the cruiser)', J('__e.ok') === true && /guard:fighter-/.test(J(`__ord('red')`)) && J(`__ord('red')`).indexOf(J('__f.id')) > 0, J(`__ord('red')`));
  g.run(`__mk(); window.__pk = campWingShips(C, 'green')[0]; campClickAct(P, C, campClickHit(C, __pk.x, __pk.y, 1), 'left', 1000); campClickAct(P, C, campClickHit(C, __rock().x, __rock().y, 1), 'left', 1100); window.__fl = campPickFields(C).find(f => f.id === 'field-0');`);
  const L2 = J('campOrderLine(C)');
  check('click Kara, click a rock: the line reads "Kara  mine  Rock field 1"', L2 && L2.who.t === 'Kara' && L2.verb.t === 'mine' && L2.target.t === 'Rock field 1', JSON.stringify(L2));
  g.run(`campSelOrder(C, 'engage', 'key');`);
  check('Enter: Kara goes to mine the field\'s nearest rock', J(`__ord('green')`) === 'mine:' + J('__fl.rock'), J(`__ord('green')`));
}

console.log('D. a right click');
{
  g.run(`__mk(); window.__pr = campWingShips(C, 'red')[0]; campSelHold(C, 'red'); window.__r = campClickAct(P, C, campClickHit(C, C.carrier.x, C.carrier.y, 1), 'right', 2000);`);
  check('a right click on the cruiser with Wedge picked: "me" is held and the order is given at once: Wedge guards the cruiser (the key\'s own answer comes back)', J('__r.used') === true && J('__r.ran') === true && J('__r.ok') === true && J('C.fsel') === 'me' && J(`__ord('red')`).indexOf('guard') === 0, JSON.stringify(J('__r')));
  g.run(`__mk(); campSelHold(C, 'yellow'); window.__fl = campPickFields(C).find(f => f.id === 'field-1'); window.__rk = C.rocks.find(r => r.hp > 0 && r.field === 1); window.__r = campClickAct(P, C, campClickHit(C, __rk.x, __rk.y, 1), 'right', 2100);`);
  check('a right click on a rock of Rock field 2 with Apollo picked: the field is held and Apollo mines it at once', J('__r.used') === true && J('__r.ran') === true && J('C.fsel') === 'field-1' && J(`__ord('yellow')`) === 'mine:' + J('__fl.rock'), J(`__ord('yellow')`));
  g.run(`__mk(); window.__pw = campWingShips(C, 'green')[0]; window.__r = campClickAct(P, C, campClickHit(C, __pw.x, __pw.y, 1), 'right', 2200);`);
  check('a right click on your own PILOT still only picks him (no order fits your own ship)', J('__r.used') === true && J('__r.ran') === null && J('C.sel') === 'pilot:green');
  g.run(`__mk(); window.__r = campClickAct(P, C, null, 'right', 2300);`);
  check('a right click in empty space is Enter alone, as before (nothing held: form up on the cruiser)', J('__r.used') === false || J('__r.formup') === true || J('__r.ran') === true);
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('CLICK ME FAIL (' + failed + ')'); process.exit(1); } else console.log('CLICK ME PASS');
