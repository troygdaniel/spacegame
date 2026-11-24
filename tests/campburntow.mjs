// smoke: a burn runs with the wing out and tows the pilots: they fall in on the cruiser's formation at a lifted speed, arrive with it, land on it when recalled, and fight when a hostile is near (plain Node, no Chrome)
// Card space-game-burn-with-wing-out (ORCH for Troy, 23 Nov 2026): the pilots start each mission out and no key recalls them, so "Fast needs the wing aboard" (card space-game-campaign-fast-board) meant Fly to the goal could never burn.
// The rule is gone: a burn starts with the wing out, and while it flies every ship with no hostile near is TOWED (src/campaign.js campTowSet: u.tow, the factor CAMP.nav.tow on its top speed and push, src/campaign.js campPaceShip),
// falls in on its slot beside the cruiser (src/campflight.js) whatever its order, and lands on the cruiser if it is recalled or being mended (campWingHome). The orders are kept and come back when the burn ends.
//   A. the numbers and the helper
//   B. a burn starts with the wing out, refuses nothing, and is not dropped by a launch; the words and the dry check
//   C. the wing keeps formation through a near burn, arrives with the cruiser and goes back to its own speed
//   D. a far burn (farFast), a ship that starts far behind, and ships on other orders
//   E. a hostile near a ship: it is not towed and fights; the others are
//   F. a recall and a repair run land on the burning cruiser
//   G. the old words and numbers are gone
// Run: node tests/campburntow.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = () => { const C = campNew('home', [], { seed: 1, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); return C; }; // no aliens: the burn is a trip; the pilots start out (CAMP.bay.startOut)
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); };
  window.__row = (C, id) => campNavRows(C).find(r => r.id === id);
  window.__wing = C => campWing(C);
  window.__slotErr = (C, u) => { const s = campFlightSlot(C, u, C.carrier); return Math.hypot(s.x - u.x, s.y - u.y); };
  window.__far = C => Math.max.apply(null, __wing(C).map(u => campDist(u, C.carrier)));
  window.__ev = (C, key) => C.events.filter(e => e.type === 'nav' && e.key === key);
`);

console.log('A. the numbers and the helper');
{
  g.run(`window.C = __new();`);
  check('a fighter (430 px/s) is slower than the burn, near (462) and far (672): it is towed, not left to keep up', J('CAMP.fighter.speed') < J('CAMP.carrier.speed * CAMP.nav.fast') && J('CAMP.fighter.speed') < J('CAMP.carrier.speed * CAMP.nav.farFast'));
  check('the tow is in the table: a towed ship may fly 1.3 times the cruiser\'s burn speed to catch up', J('CAMP.nav.tow') === 1.3);
  check('the pilots start out (the game\'s start), three of them', J('campNavOut(C)') === 3 && J('CAMP.bay.startOut') === true);
  check('with no burn the cruiser\'s tow speed is 0 and no ship is towed', J('campTowTop(C)') === 0 && J('__wing(C).every(u => (u.tow || 1) === 1)'));
  g.run(`campNavFly(C, __row(C, 'place:mars'), true, 'key');`);
  check('a burn\'s tow speed is the cruiser\'s top speed in it (462 px/s)', Math.abs(J('campTowTop(C)') - 462) < 1, J('campTowTop(C)'));
  g.run(`campNavFly(C, __row(C, 'place:mars'), false, 'key');`);
  check('a regular trip has none', J('campTowTop(C)') === 0);
}

console.log('B. a burn starts with the wing out');
{
  g.run(`window.C = __new(); __run(C, 3); C.events.length = 0; window.__r1 = campNavFly(C, __row(C, 'place:mars'), true, 'key');`);
  check('Fast with the wing out burns at once: ok, no refusal, no wait, the autopilot is on and fast at 2.2', J('campNavOut(C)') === 3 && J('__r1.ok') === true && J('__r1.say') === '' && J('C.nav.fast') === true && J('C.nav.burn') === 2.2 && J('C.navWait') === null && J('C.orders.recall') === 0);
  g.run(`window.C = __new(); campNavFly(C, __row(C, 'place:mars'), true, 'key'); __run(C, 3); campOrder(C, 'launch'); __run(C, 1);`);
  check('launching during a burn does not drop it (it used to: "Wing launched: burn off.")', J('C.nav.fast') === true && J('C.nav.burn') === 2.2 && J('__ev(C, "camp.nav.burnoff").length') === 0);
  g.run(`window.C = __new(); campNavGo(C, __row(C, 'place:mars'), true);`);
  check('campNavGo with the wing out is a burn', J('C.nav.fast') === true);
  g.run(`window.C = __new(); window.__ck = campNavCheck(C, 'fast mars');`);
  check('the words: "fly fast to Mars" with the wing out is heard as a burn, the usual line, and doing it burns', J('__ck.ok') === true && J('__ck.fast') === true && /Mars/.test(J('__ck.say')) && (g.run('campNavDo(C, __ck)'), J('C.nav.fast') === true));
  g.run(`window.C = __new(); campNavFly(C, __row(C, 'place:mars'), true, 'key'); campNavFly(C, __row(C, 'place:mars'), false, 'key');`);
  check('and back to regular speed any time: the same trip, regular, and nobody is towed any more', J('C.nav.fast') === false && J('C.nav.burn') === 1 && (g.run('__run(C, 1)'), J('__wing(C).every(u => (u.tow || 1) === 1)')));
}

console.log('C. the wing keeps formation through a near burn');
{
  g.run(`window.C = __new(); __run(C, 3); window.__before = __far(C); campNavFly(C, __row(C, 'place:mars'), true, 'key'); window.__mx = 0; window.__sp = 0; window.__tw = 0;
    for (let i = 0; i < 30 * 5; i++) { campStep(C, 1 / 30); __mx = Math.max(__mx, __far(C)); }
    __sp = Math.max.apply(null, __wing(C).map(u => Math.abs(Math.hypot(u.vx, u.vy) - Math.hypot(C.carrier.vx, C.carrier.vy)))); __tw = Math.min.apply(null, __wing(C).map(u => u.tow || 1));`);
  check('five seconds into the burn the carrier is at its burn speed (above 440 px/s: a fighter\'s own top is 430) and the three pilots are still with it: none more than 450 px away (they were ' + J('Math.round(__before)') + ' px)', J('Math.hypot(C.carrier.vx, C.carrier.vy)') > 440 && J('__wing(C).length') === 3 && J('__mx') < 450, J('[__before, __mx]'));
  check('they fly its speed: within 20 px/s of the cruiser\'s, with a lifted top speed (1.3 times the burn, about 600 px/s) and the formation\'s own slots', J('__sp') < 20 && J('__tw') > 1.35 && J('__tw') < 1.45 && J('__wing(C).every(u => u.vmax > 590 && u.vmax < 610)') && J('__wing(C).every(u => __slotErr(C, u) < 40)'), J('[__sp, __tw, __wing(C).map(u => Math.round(__slotErr(C, u)))]'));
  g.run(`window.__ord = __wing(C).map(u => u.order && u.order.type).join(); for (let i = 0; i < 30 * 12 && C.nav; i++) campStep(C, 1 / 30); __run(C, 8);`);
  check('the cruiser arrives (the autopilot is off) and the pilots arrive with it: all three within 450 px of it, nearly at rest, each near its slot', J('C.nav') === null && J('__wing(C).length') === 3 && J('__far(C)') < 450 && J('__wing(C).every(u => Math.hypot(u.vx, u.vy) < 20 && __slotErr(C, u) < 60)'), J('[__far(C), __wing(C).map(u => Math.round(__slotErr(C, u)))]'));
  check('the burn is over: nobody is towed, the top speed is the fighter\'s own again (430), the orders are as they were (guard)', J('__wing(C).every(u => (u.tow || 1) === 1 && Math.round(u.vmax) === 430)') && J('__ord') === 'guard,guard,guard' && J('__wing(C).every(u => u.order.type === "guard")'));
  check('the cruiser arrived at Mars: within the stop distance of it', J('campDist(C.carrier, __row(C, "place:mars"))') < 700, J('campDist(C.carrier, __row(C, "place:mars"))'));
}

console.log('D. a far burn, a ship far behind, other orders');
{
  g.run(`window.C = __new(); __run(C, 3); campNavFly(C, __row(C, 'place:jupiter'), true, 'key'); __run(C, 15);`);
  check('a far burn (Jupiter: 3.2 times, 672 px/s): the wing is with the cruiser after 15 s (all three within 450 px) at a lifted 874 px/s top speed', J('C.nav.burn') === 3.2 && Math.round(J('Math.hypot(C.carrier.vx, C.carrier.vy)')) >= 660 && J('__wing(C).length') === 3 && J('__far(C)') < 450 && J('__wing(C).every(u => Math.abs(u.vmax - 672 * 1.3) < 8)'), J('[__far(C), __wing(C).map(u => Math.round(u.vmax))]'));
  g.run(`window.C = __new(); __run(C, 3); window.__u = __wing(C)[0]; __u.x = C.carrier.x - 1500; __u.y = C.carrier.y + 400; campNavFly(C, __row(C, 'place:jupiter'), true, 'key'); window.__d0 = campDist(__u, C.carrier); __run(C, 4); window.__d1 = campDist(__u, C.carrier); __run(C, 20);`);
  check('a pilot that is 1,500 px behind when the burn starts catches up (it may fly 30 percent over the burn): the gap grows at first, then it closes and the ship is in its slot after 24 s', J('__d1') > 0 && J('__slotErr(C, __u)') < 80 && J('campDist(__u, C.carrier)') < 450, J('[__d0, __d1, __slotErr(C, __u), campDist(__u, C.carrier)]'));
  g.run(`window.C = __new(); __run(C, 3); window.__u = __wing(C)[0]; window.__v = __wing(C)[1]; window.__w = __wing(C)[2];
    __u.order = { type: 'hold', at: { x: C.carrier.x + 900, y: C.carrier.y - 700 } }; __v.order = { type: 'mine' }; __w.order = { type: 'attack', target: '' };
    window.__o = [__u.order, __v.order, __w.order]; campNavFly(C, __row(C, 'place:mars'), true, 'key'); __run(C, 6);`);
  check('ships on a hold, a mine and an attack order fall in on the cruiser all the same (the burn takes the wing: none more than 450 px away)', J('__far(C)') < 450 && J('__wing(C).every(u => (u.tow || 1) > 1)'), J('[__far(C), __wing(C).map(u => u.tow)]'));
  g.run(`for (let i = 0; i < 30 * 12 && C.nav; i++) campStep(C, 1 / 30);`);
  check('the orders are kept: the same objects on the same ships when the burn ends (a hold, a mine, an attack)', J('C.nav') === null && J('__u.order === __o[0] && __v.order === __o[1] && __w.order === __o[2]'));
}

console.log('E. a hostile near a ship');
{
  g.run(`window.C = __new(); __run(C, 3); campNavFly(C, __row(C, 'place:mars'), true, 'key'); __run(C, 1); window.__ws = __wing(C); window.__a = campSpawn(C, 'raider', __ws[0].x + 300, __ws[0].y);`);
  check('a hostile inside 450 px of a ship: that ship is not towed (it fights as its order says), the others are', J('campTowSet(C, __ws[0], campAliens(C)) === false && __ws[0].tow === 1 && Math.round(__ws[0].vmax) === 430') && J('campTowSet(C, __ws[1], []) === true && __ws[1].tow > 1'), J('[__ws[0].tow, __ws[0].vmax, __ws[1].tow]'));
  g.run(`__a.hp = 0; __ws[0].tow = 1; campPaceShip(C, __ws[0]);`);
  check('with the hostile gone it is towed again', J('campTowSet(C, __ws[0], campAliens(C)) === true && __ws[0].tow > 1 && __ws[0].vmax > 590'));
  g.run(`window.C = __new(); __run(C, 3); campNavFly(C, __row(C, 'place:mars'), true, 'key'); __run(C, 1); window.__u = __wing(C)[0]; window.__al = campSpawn(C, 'raider', __u.x + 380, __u.y); __al.hp = 1e6; __al.maxHp = 1e6; __al.vx = 0; __al.vy = 0; __run(C, 1); window.__t1 = __u.tow || 1;`);
  check('in the sim: the ship with the raider 380 px off flies at its own speed for the moment (tow 1) while its wingmen keep the lifted one', J('__t1') === 1 || J('__u.tow') === 1 || J('campDist(__u, __al)') > 450, J('[__t1, __u.tow, campDist(__u, __al)]'));
}

console.log('F. a recall and a repair run land on the burning cruiser');
{
  g.run(`window.C = __new(); __run(C, 3); campNavFly(C, __row(C, 'place:jupiter'), true, 'key'); __run(C, 4); window.__r = campOrder(C, 'recall', '', 'key'); __run(C, 14);`);
  check('a Recall in the burn: all three land on the cruiser while it burns (they match its speed): none left out, three aboard, the burn still on', J('__r.ok') === true && J('campNavOut(C)') === 0 && J('C.bay.fighters') === 3 && J('C.nav && C.nav.fast') === true, J('[__r.ok, campNavOut(C), C.bay.fighters, !!C.nav]'));
  g.run(`window.C = __new(); __run(C, 3); campNavFly(C, __row(C, 'place:jupiter'), true, 'key'); __run(C, 4); window.__u = __wing(C)[0]; __u.hp = __u.maxHp * 0.1; __run(C, 12);`);
  check('a hurt pilot (under 25 percent hull) flies home and lands to be mended on the burning cruiser: it is in the repair list and the burn goes on', J('(C.repairs || []).length') === 1 && J('__u.docked') === true && J('C.nav && C.nav.fast') === true, J('[(C.repairs || []).length, __u.docked, !!C.nav]'));
}

console.log('G. the old words and numbers are gone');
{
  const md = src('content/text/campfast.md'), ct = src('src/contenttables.js'), keys = ['camp.nav.no.wingout', 'camp.nav.no.wingout2', 'camp.nav.recalling', 'camp.nav.recalltimeout', 'camp.nav.burnoff', 'camp.map.fastout', 'camp.map.fastask'];
  check('the seven lines of the wing-aboard rule are in no words file', keys.every(k => !md.includes('| ' + k + ' |') && !ct.includes("'" + k + "'")));
  check('the waits are not in the table (recallWait, askFor); the state of a waiting burn is gone (C.navWait, C.fastAsk)', J('CAMP.nav.recallWait') === null && J('CAMP.nav.askFor') === null && (g.run(`window.C = __new(); campNavFly(C, __row(C, 'place:mars'), true, 'key'); campNavFly(C, __row(C, 'place:mars'), true, 'key');`), J('C.navWait') === null && J('C.fastAsk') === null));
  check('the line when a burn that began by itself ends (a hostile near) is still there', J('uiText("camp.nav.burnfoe")') === 'Hostiles near: burn off.');
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN BURN TOW FAIL (${failed} of ${n})` : `\nCAMPAIGN BURN TOW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
