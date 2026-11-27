// smoke: in 1.2, taking the stick (C) sends the other two pilots to guard a miner each, the sentence line says so, a pilot order of the player's stops it, other missions are untouched (plain Node, no Chrome)
// Card space-game-b12-c10-12-pilots-guard-miners (Troy, 27 Nov 2026: yes; the cloud's BRIEF 12 chunk 10, docs/next-chunks.html). The rule is src/campminerpilots.js (campMinerPilots, called by campCockpitTake);
// the row of 1.2 says pilotsGuardMiners, the order is the game's own guard (campWingOrder), the words are the sentence line's (campOrderLineNow).
//   A. the take: Kara and Apollo guard Miner 1 and Miner 2, the pilot he flies (Wedge) is not sent, the price line is still said
//   B. the counters: C.orders.guard is as it was (the squares, the nudges and the line's check do not take it for his order); campPilotOrdersGiven is 0
//   C. the sentence line: "Kara  guard  Miner 1  ✓" then "Apollo  guard  Miner 2  ✓", each CAMP.orderLine.each ms, then it is gone
//   D. his orders first: an attack order given before the take, and the take leaves the pilots where they are; an order after the take replaces the guard
//   E. the other pilots: take another pilot and the other two are sent; one miner left, one pilot is sent; no miner, none; a miner lost sends the pilot back to the cruiser
//   F. 1.1 and 1.3 are untouched
//   G. the switch CAMP.flags.pilotsguard (false: as before; the bot table's before)
// Run: node tests/campminerpilots.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`window.__mk = (mi, sec) => { const C = window.C = campNew(1, [], { seed: 1, mission: mi }); C.arrivedAt = 0; while (C.t < (sec || 12) * 1000) campTick(C, 0.1); return C; };`);
const guards = () => J(`C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter').map(u => u.squad + ':' + (u.cockpit ? 'FLOWN' : u.order && u.order.type === 'guard' && u.order.at && u.order.at.id ? u.order.at.id : u.order ? u.order.type : '-'))`).join();

console.log('A. the take');
{
  g.run(`__mk(1); window.__took = campCockpitTake(C);`);
  check('1.2 is the row that says pilotsGuardMiners, and the stick is taken (Wedge, the red squad)', J('!!C.L.pilotsGuardMiners') === true && J('__took') === true && J('C.by[C.cockpit.id].squad') === 'red');
  check('Kara (green) guards Miner 1 and Apollo (yellow) Miner 2; Wedge flies', guards() === 'red:FLOWN,green:miner-42,yellow:miner-43', guards());
  check('the miners are the two neutral miners, named Miner 1 and Miner 2', J(`C.ships.filter(u => u.kind === 'miner').map(u => u.id + '=' + u.cname).join()`) === 'miner-42=Miner 1,miner-43=Miner 2');
  check('the first take says the price line, once (the miners lose a guard while you fly)', J(`C.events.filter(e => e.type === 'cockpit' && e.stage === 'take').map(e => e.price).join()`) === 'camp.price.stick');
}
console.log('B. the counters');
{
  check('C.orders.guard is 0 and the pilots\' orders given are 0: the take is not an order of his', J('C.orders.guard') === 0 && J('campPilotOrdersGiven(C)') === 0 && J('campMarkOrders(C)') === 0, J('JSON.stringify(C.orders)'));
}
console.log('C. the sentence line');
{
  const L = () => J(`(() => { const L = campOrderLineNow(C); return L ? [L.who.t, L.verb.t, L.target.t, L.check, L.a].join('|') : null; })()`);
  check('at the take: "Kara  guard  Miner 1" with the check', L() === 'Kara|guard|Miner 1|true|1', L());
  g.run(`C.t += CAMP.orderLine.each + 100;`);
  check('the next one after CAMP.orderLine.each ms: "Apollo  guard  Miner 2"', L() === 'Apollo|guard|Miner 2|true|1', L());
  g.run(`C.t += CAMP.orderLine.each;`);
  check('and then the line is gone (nothing is picked, nothing was given by him)', L() === null, L());
  check('CAMP.orderLine.each is a number in the table', J('typeof CAMP.orderLine.each') === 'number' && J('CAMP.orderLine.each') > 500);
}
console.log('D. his orders first');
{
  g.run(`__mk(1); campWingOrder(C, 'all', 'attack', null, 'key', false); window.__x = campCockpitTake(C);`);
  check('an attack order of his, then the take: the pilots are where they were (nobody sent to a miner), and there is no note', J('__x') === true && !/miner-/.test(guards()) && J('C.minerPilotsNote') === null && J('campPilotOrdersGiven(C)') === 1, guards());
  g.run(`__mk(1); campWingOrder(C, 'green', 'escort', null, 'key', false); window.__x = campCockpitTake(C);`);
  check('an escort order to one pilot is his say too: the take sends nobody', !/miner-/.test(guards()), guards());
  g.run(`__mk(1); campCockpitTake(C); campWingOrder(C, 'green', 'attack', null, 'key', false);`);
  check('an order of his after the take replaces the guard (and counts as his)', /green:attack|green:(?!miner-)/.test(guards()) && J('campPilotOrdersGiven(C)') === 1, guards());
  g.run(`__mk(1); campCockpitTake(C); campCockpitGive(C, 'hand'); campCockpitTake(C);`);
  check('taking again with no order of his sends them again (the same miners)', guards() === 'red:FLOWN,green:miner-42,yellow:miner-43' && J('campPilotOrdersGiven(C)') === 0, guards());
}
console.log('E. the others');
{
  g.run(`__mk(1); campCockpitTake(C, 'fighter-45');`);
  check('taking Kara\'s fighter sends the other two: Wedge to Miner 1, Apollo to Miner 2', guards() === 'red:miner-42,green:FLOWN,yellow:miner-43', guards());
  g.run(`__mk(1); const m = C.by['miner-43']; m.hp = 0; campCockpitTake(C);`);
  check('one miner left: one pilot goes (Kara to Miner 1), the other stays with the cruiser', guards() === 'red:FLOWN,green:miner-42,yellow:guard' && J(`C.by['fighter-46'].order.at.kind`) === 'carrier', guards());
  g.run(`__mk(1); C.by['miner-42'].hp = 0; C.by['miner-43'].hp = 0; campCockpitTake(C);`);
  check('no miner alive: nobody is sent, no note', !/miner-/.test(guards()) && J('C.minerPilotsNote') === null, guards());
  g.run(`__mk(1); campCockpitTake(C); C.by['miner-42'].hp = 0; for (let i = 0; i < 5; i++) campTick(C, 0.1);`);
  check('a miner lost: the pilot who guarded it goes back to the cruiser (the guard order\'s own end), the other still guards Miner 2', J(`C.by['fighter-45'].order.at.kind`) === 'carrier' && J(`C.by['fighter-46'].order.at.id`) === 'miner-43', J(`JSON.stringify([C.by['fighter-45'].order, C.by['fighter-46'].order])`));
  g.run(`__mk(1); C.by['fighter-45'].hp = 0; campCockpitTake(C);`);
  check('a pilot lost: only the one that is left is sent (Apollo to Miner 1)', guards().indexOf('yellow:miner-42') >= 0, guards());
}
console.log('F. other missions');
{
  g.run(`__mk(0); campCockpitTake(C);`);
  check('1.1: the take sends nobody and leaves no note', !/miner-/.test(guards()) && J('C.minerPilotsNote') === null && J('!!C.L.pilotsGuardMiners') === false, guards());
  g.run(`__mk(2); campCockpitTake(C);`);
  check('1.3: the same', !/miner-/.test(guards()) && J('C.minerPilotsNote') === null && J('!!C.L.pilotsGuardMiners') === false, guards());
}
console.log('G. the switch');
{
  g.run(`__mk(1); CAMP.flags.pilotsguard = false; campCockpitTake(C);`);
  check('CAMP.flags.pilotsguard is true in the table; false, the take sends nobody (the bot table\'s before: --set flags.pilotsguard=0)', !/miner-/.test(guards()) && J('C.minerPilotsNote') === null, guards());
  g.run(`CAMP.flags.pilotsguard = true; __mk(1); campCockpitTake(C);`);
  check('and true again, it sends them', /green:miner-42/.test(guards()), guards());
}
check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('MINER PILOTS FAIL (' + failed + ')'); process.exit(1); } else console.log('MINER PILOTS PASS');
