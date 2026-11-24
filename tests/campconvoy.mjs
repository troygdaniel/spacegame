// smoke: the convoy orders: tuck in, hold here, run for it, carry on: the orders and who takes them, how the ships move, the cover of the cruiser's shield, the hull that blocks, the voice, the four rows of the convoy list (W opens it directly; it is a part of the fleet list, Q) and the words (plain Node, no Chrome)
// Card space-game-convoy-orders (src/campconvoy.js, CAMP.convoyOrders in src/campaign.js, the four rows of CAMP_PANELS' convoy list in src/data_controls.js).
// The keys are as cards one-list-keys and list-shortcuts left them (22 and 23 Nov 2026): Q opens the fleet list, which has a row for the convoy; W opens the convoy's own list directly, at any time; each convoy order is a
// row of that list (nothing cycles, nothing settles, no pages, no digits). The four rows are always in the W list (greyed, "no convoy", when there is no escorted ship); it is the Convoy row of the fleet list that is
// left out in a mission that has no convoy and no escorted ship (its `when: 'convoy'`).
//   A. the orders           B. how the ships move       C. the cover                  D. the hull that blocks
//   E. the voice and strip  F. the convoy list (W)      G. the words                  J. the scene's drawing       H. a battle with orders      I. determinism
// Run: node tests/campconvoy.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a test mission on Level 1 (this page's own copy of the table): at Ceres, where the cruiser starts. The test lays out the sky itself (__quiet clears the mission's own wave and convoys)
g.run(`
  CAMP.levels[1].missions.push({ id: 'co', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30],
    rocks: [{ at: [900, 700], n: 7, spread: 300 }], objectives: [{ type: 'hold', secs: 100000 }], bonus: [],
    convoys: [{ id: 't1', name: 'Transport', at: 2, from: 'ceres', to: 'vesta', speed: 52 }, { id: 'h2', name: 'Hauler 2', at: 4, from: 'ceres', to: 'vesta', speed: 60 }],
    waves: [], traffic: [{ id: 'mm', kind: 'miner', place: 'ceres', off: [260, 120], n: 2, name: 'Miner', home: 'ceres' }] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__new = opts => { window.C = campNew(1, [], Object.assign({ seed: 5, god: false, mission: __M }, opts || {})); C.arrivedAt = 0; return C; };
  window.__ev = [];
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; } };
  window.__quiet = () => { C.L.waves = []; C.waves = []; C.L.convoys = []; C.convoys = []; C.L.cues = []; C.L.traffic = []; C.ships.filter(u => u.team === 'neutral').forEach(u => { u.hp = 0; delete C.by[u.id]; }); C.ships = C.ships.filter(u => u.hp > 0); C.carrier.vx = C.carrier.vy = 0; __ev.length = 0; return C; }; // (the mission's own miners go too: the test lays out the sky)
  window.__spawn = (kind, dx, dy) => campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy);
  window.__hauler = (id, name, dx, dy, tox, toy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + tox, y: C.carrier.y + toy }; f.cname = name; f.named = true; f.lane = 0; return f; };
  window.__d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  window.__shotAt = (from, to, team, dmg) => { const a = Math.atan2(to.y - from.y, to.x - from.x); return campBullet(C, { x: from.x, y: from.y, id: 'raider-9' }, a, 700, dmg || 6, 3000, team || 'alien', 0); };
`);

// ---------- A. the orders ----------
console.log('A. the orders');
{
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 400, 0, 5000, 0); window.__h = __hauler('h2', 'Hauler 2', 600, 100, 5000, 100); window.__m = __spawn('miner', 300, 200); window.__m2 = __spawn('miner', 300, 260);`);
  check('the escorted ships are the convoy ships and the neutral miners (campConvoyShips), nothing else', J('campConvoyShips(C).length') === 4 && J(`(() => { __spawn('fighter', 50, 50); __spawn('skiff', 900, 0); return campConvoyShips(C).length })()`) === 4);
  const r = J(`campOrder(C, 'convoy', 'tuck in', 'key')`);
  check('Tuck in is an order of the campaign: ok, the words say Convoy, every escorted ship is under it', r.ok === true && r.code === 'ctuck' && r.say === 'Convoy, tuck in under our shield.' && J(`campConvoyShips(C).every(u => u.cord === 'tuck')`), JSON.stringify(r));
  check('it is counted (C.orders.convoy) and tells the scene: a convoy event, stage order, with the verb and the number of ships', J('C.orders.convoy') === 1 && J(`C.events.some(e => e.type === 'convoy' && e.stage === 'order' && e.verb === 'tuck' && e.n === 4)`), J('JSON.stringify(C.events)'));
  check('campConvoyState says what all of them are under (tuck), and mixed when they differ', J('campConvoyState(C)') === 'tuck' && (g.run(`campOrder(C, 'convoy', 'hold here ' + 'hauler 2')`), J('campConvoyState(C)') === 'mixed'));
  g.run(`campOrder(C, 'convoy', 'carry on')`);
  check('Carry on cancels: no ship has an order, the state is carry', J(`campConvoyShips(C).every(u => !u.cord)`) && J('campConvoyState(C)') === 'carry');
  const one = J(`campOrder(C, 'convoy', 'run for it Hauler 2')`);
  check('an order may name a ship ("run for it Hauler 2"): only that one is under it, and the words name it', one.ok && one.say === 'Hauler 2, run for it. No cover.' && J(`__h.cord === 'run' && !__t.cord && !__m.cord`), JSON.stringify(one));
  g.run(`campOrder(C, 'convoy', 'carry on')`);
  const dry = J(`campCheck(C, 'convoy', 'hold here')`);
  check('campCheck answers the same and does nothing', dry.ok && dry.code === 'chold' && J(`campConvoyShips(C).every(u => !u.cord)`) && J('C.orders.convoy') === 5, JSON.stringify(dry)); // (five orders so far: tuck, hold, carry on, run, carry on)
  check('words with no order in them are refused with a question (cwhat)', J(`campOrder(C, 'convoy', 'sing a song').code`) === 'cwhat' && J(`campOrder(C, 'convoy', '').ok`) === false);
  g.run('__new(); __quiet()');
  const none = J(`campOrder(C, 'convoy', 'tuck in')`);
  check('with no escorted ship there is nothing to command: refused, cnone, "No escorted ships to command."', none.ok === false && none.code === 'cnone' && none.say === 'No escorted ships to command.', JSON.stringify(none));
  check('a lone neutral miner is named by its own name in the words, a pair is the Convoy', (() => { g.run(`window.__m = __spawn('miner', 300, 200); __m.cname = 'Miner 1'`); const a = J(`campOrder(C, 'convoy', 'hold here').say`); g.run(`__spawn('miner', 320, 220)`); return a === 'Miner 1, hold here.' && J(`campOrder(C, 'convoy', 'hold here').say`) === 'Convoy, hold here.'; })());
}

// ---------- B. how the ships move ----------
console.log('B. how the ships move');
{
  // a hauler far from the cruiser flies to it, then holds its road inside the bubble
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 1500, 0, 9000, 0); __t.vmax = 120; campOrder(C, 'convoy', 'tuck in')`);
  const d0 = J('__d(__t, C.carrier)');
  g.run('__run(4)');
  check('Tuck in: a transport 1,500 px from the cruiser flies to it (at its own speed)', J('__d(__t, C.carrier)') < d0 - 300 && J('__t.rot') > 3 || J('__d(__t, C.carrier)') < d0 - 300, J('[__d(__t, C.carrier), __t.rot]'));
  g.run('__run(14)');
  check('and once under the shield it stays inside the bubble (' + J('CAMP.convoyOrders.bubble') + ' px), though its road leads away', J('__d(__t, C.carrier)') <= J('CAMP.convoyOrders.bubble'), J('__d(__t, C.carrier)'));
  g.run('C.carrier.x += 0; __run(10)');
  check('a transport tucked in with the cruiser at rest makes no way along its road: it stops at the bubble\'s edge', J('Math.hypot(__t.vx, __t.vy)') < 1 && J('__d(__t, C.carrier)') <= J('CAMP.convoyOrders.bubble'));
  // the cruiser flies on: the transport goes along its road as far as the bubble lets it, no further
  g.run('C.carrier.vx = 400; C.carrier.x += 0; __run(1)');
  g.run(`C.carrier.vx = 0; window.__x0 = __t.x; window.__cx = C.carrier.x; C.carrier.x = __t.x + 90; __run(2)`);
  check('when the cruiser leads on along the road the transport follows at its own speed (it goes along its road while it stays inside)', J('__t.x') > J('__x0') + 50 && J('__d(__t, C.carrier)') <= J('CAMP.convoyOrders.bubble') + 130, J('[__t.x, __x0, __d(__t, C.carrier)]'));
  // hold: it brakes and stops
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 400, 0, 9000, 0); __t.vmax = 120; __run(1); campOrder(C, 'convoy', 'hold here')`);
  g.run('__run(0.4)');
  check('Hold here: it brakes (not at once: ' + J('CAMP.convoyOrders.accel') + ' px/s per s), so it is slowing but still moving after 0.4 s', J('Math.hypot(__t.vx, __t.vy)') > 20 && J('Math.hypot(__t.vx, __t.vy)') < 119, J('Math.hypot(__t.vx, __t.vy)'));
  g.run('__run(2)'); const hx = J('__t.x'); g.run('__run(5)');
  check('and stops: after 2 s it does not move at all in the 5 s that follow', J('Math.hypot(__t.vx, __t.vy)') === 0 && Math.abs(J('__t.x') - hx) < 1e-6, J('[__t.vx, __t.x, ' + hx + ']'));
  g.run(`campOrder(C, 'convoy', 'carry on'); __run(3)`);
  check('Carry on: it picks up and goes on its way again at its own speed', J('Math.hypot(__t.vx, __t.vy)') === 120 && J('__t.x') > hx + 100, J('[__t.vx, __t.x]'));
  // run
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 400, 0, 9000, 0); __t.vmax = 100; __run(1); campOrder(C, 'convoy', 'run for it'); __run(4)`);
  check('Run for it: it goes at ' + J('CAMP.convoyOrders.run') + ' times its own speed (after the pick-up)', Math.abs(J('Math.hypot(__t.vx, __t.vy)') - 100 * J('CAMP.convoyOrders.run')) < 1e-6, J('Math.hypot(__t.vx, __t.vy)'));
  g.run(`campOrder(C, 'convoy', 'carry on'); __run(3)`);
  check('and Carry on brings it back to its own speed', Math.abs(J('Math.hypot(__t.vx, __t.vy)') - 100) < 1e-6, J('Math.hypot(__t.vx, __t.vy)'));
  g.run(`C.L.objectives = [{ type: 'deliver', n: 1 }]; __t.x = __t.dest.x - 300; __run(3)`);
  check('a ship under Run for it still arrives and counts as delivered', J('C.delivered') === 1);
  // a held ship does not arrive
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 400, 0, 1000, 0); __t.x = __t.dest.x - 200; campOrder(C, 'convoy', 'hold here'); __run(8)`);
  check('a held ship never arrives however long it waits, and takes up again when released', J('C.delivered') === 0 && (g.run(`campOrder(C, 'convoy', 'carry on'); __run(8)`), J('C.delivered') === 1));
  // miners
  g.run('__new(); __quiet()');
  g.run(`window.__m = __spawn('miner', 500, 300); __m.home = { x: C.carrier.x + 2000, y: C.carrier.y, r: 40 }; __m.post = { x: __m.x, y: __m.y }; window.__m2 = __spawn('miner', 520, 320); __m2.slot = 1; __m2.home = __m.home; __m2.post = __m.post;`);
  g.run(`campOrder(C, 'convoy', 'tuck in'); __run(14)`);
  check('Tuck in: the neutral miners lie under the cruiser, each in a slot of its own (in the bubble)', J('__d(__m, C.carrier)') <= J('CAMP.convoyOrders.bubble') && J('__d(__m2, C.carrier)') <= J('CAMP.convoyOrders.bubble') && J('__d(__m, __m2)') > 20, J('[__d(__m, C.carrier), __d(__m2, C.carrier), __d(__m, __m2)]'));
  g.run(`campOrder(C, 'convoy', 'hold here'); __run(3)`); const mx = J('__m.x');
  g.run('__run(4)');
  check('Hold here: a miner stops where it is and does not work the rocks', Math.abs(J('__m.x') - mx) < 2 && J('__m.beam') === '', J('[__m.x, ' + mx + ']'));
  g.run(`campOrder(C, 'convoy', 'run for it'); __run(2)`);
  check('Run for it: a miner runs home at ' + J('CAMP.convoyOrders.run') + ' times its speed', J('__m.vmax') === J('__m.vmax0 * CAMP.convoyOrders.run') && J('__m.phase') === 'run');
  g.run(`campOrder(C, 'convoy', 'carry on')`);
  check('Carry on gives the miner its own speed back', J('__m.vmax') === J('__m.vmax0') && J('!__m.cord'));
}

// ---------- C. the cover ----------
console.log('C. the cover of the shield');
{
  g.run('__new(); __quiet(); C.input.fire = false');
  g.run(`window.__t = __hauler('t1', 'Transport', 80, 40, 9000, 0); __t.vmax = 0; campOrder(C, 'convoy', 'tuck in'); window.__f = __hauler('h2', 'Hauler 2', 90, -400, 9000, 0); __f.vmax = 0; window.__s0 = C.shield; window.__t0 = __t.hp;`);
  g.run('campHurt(C, __t, 30, "raider-9")');
  check('a hit on a tucked ship inside the bubble is a hit on the cruiser: the shield takes it, the ship is whole, a cover event says so', J('C.shield') === J('__s0') - 30 && J('__t.hp') === J('__t0') && J(`C.events.some(e => e.type === 'convoy' && e.stage === 'cover' && e.id === __t.id)`), J('[C.shield, __s0, __t.hp]'));
  g.run('campHurt(C, __t, 200, "raider-9")');
  check('then the cruiser\'s hull, when the shield is gone: the ship is still whole', J('C.shield') === 0 && J('C.carrier.hp') < J('C.carrier.maxHp') && J('__t.hp') === J('__t0'), J('[C.shield, C.carrier.hp]'));
  g.run('C.shield = 100; campOrder(C, "convoy", "carry on")');
  g.run('campHurt(C, __t, 30, "raider-9")');
  check('after Carry on the ship takes its own hits', J('__t.hp') === J('__t0') - 30 && J('C.shield') === 100);
  g.run('campOrder(C, "convoy", "tuck in"); __t.x = C.carrier.x + 400; __t.y = C.carrier.y; __t.vmax = 0; window.__t1 = __t.hp; campHurt(C, __t, 30, "raider-9")');
  check('a tucked ship that is outside the bubble has no cover', J('__t.hp') === J('__t1') - 30 && J('C.shield') === 100);
  g.run('campOrder(C, "convoy", "run for it"); __t.x = C.carrier.x + 60; __t.y = C.carrier.y; window.__t2 = __t.hp; campHurt(C, __t, 30, "raider-9")');
  check('a ship that Runs for it has no cover though it is beside the cruiser', J('__t.hp') === J('__t2') - 30 && J('C.shield') === 100);
  g.run('campOrder(C, "convoy", "hold here"); window.__t3 = __t.hp; campHurt(C, __t, 30, "raider-9")');
  check('and one that Holds has none', J('__t.hp') === J('__t3') - 30);
  // the cruiser's god mode: the damage goes nowhere, and still not to the ship
  g.run('campOrder(C, "convoy", "tuck in"); __t.x = C.carrier.x + 60; __t.y = C.carrier.y; C.god = true; window.__t4 = __t.hp; window.__s4 = C.shield; campHurt(C, __t, 30, "raider-9")');
  check('in god mode (a debug key) the cruiser takes it for nothing, and the ship is whole', J('__t.hp') === J('__t4') && J('C.shield') === J('__s4'));
  // a real shot
  g.run('__new(); __quiet(); C.input.fire = false');
  g.run(`window.__t = __hauler('t1', 'Transport', 100, 0, 9000, 0); __t.vmax = 0; window.__a = __spawn('skiff', 900, 0); __a.vmax = 0; __a.accel = 0; campOrder(C, 'convoy', 'tuck in'); window.__s0 = C.shield; window.__t0 = __t.hp;`);
  g.run(`window.__b = __shotAt(__a, __t); for (let i = 0; i < 60; i++) campBullets(C, 1 / 30)`);
  check('a pirate\'s shot at a tucked transport lands on the cruiser\'s shield (the shield is down, the transport whole)', J('C.shield') < J('__s0') && J('__t.hp') === J('__t0'), J('[C.shield, __s0, __t.hp]'));
  g.run('campOrder(C, "convoy", "carry on"); C.shield = 150; __s0 = 150');
  g.run(`window.__b = __shotAt(__a, __t); for (let i = 0; i < 60; i++) campBullets(C, 1 / 30)`);
  check('and the same shot at a ship that has no order hurts the ship', J('__t.hp') < J('__t0') && J('C.shield') === 150, J('[__t.hp, C.shield]'));
  // a torpedo: the hit and its blast
  g.run('__new(); __quiet(); C.input.fire = false');
  g.run(`window.__t = __hauler('t1', 'Transport', 100, 60, 9000, 0); __t.vmax = 0; window.__b = __spawn('tboat', 1000, 60); __b.vmax = 0; __b.accel = 0; __b.tubes = 1; __b.rot = Math.PI; campOrder(C, 'convoy', 'tuck in'); window.__s0 = C.shield; window.__t0 = __t.hp; window.__tp = campTorpedoLaunch(C, __b, __t); __b.tubes = 0; __ev.length = 0; __run(6)`);
  check('a torpedo that hits a tucked ship goes off on the shield: the cruiser takes its damage and the radio says the cruiser was hit', J('C.torpStat.hit') === 1 && J('C.shield') < J('__s0') && J('__t.hp') === J('__t0') && J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.torp.hit.us')`), J('[C.torpStat, C.shield, __t.hp]'));
}

// ---------- D. the hull that blocks ----------
console.log('D. the hull that blocks');
{
  g.run('__new(); __quiet(); C.input.fire = false; C.carrier.rot = 0');
  g.run(`window.__t = __hauler('t1', 'Transport', -300, 0, 9000, 0); __t.vmax = 0; window.__a = __spawn('skiff', 900, 0); __a.vmax = 0; __a.accel = 0; window.__s0 = C.shield; window.__t0 = __t.hp;`);
  g.run(`for (let k = 0; k < 6; k++) { __shotAt(__a, __t); } for (let i = 0; i < 90; i++) campBullets(C, 1 / 30)`);
  check('shots aimed at a transport behind the cruiser hit the cruiser first, all six (the shield takes them), and not one reaches the ship', J('C.shield') === J('__s0') - 6 * 6 && J('__t.hp') === J('__t0'), J('[C.shield, __s0, __t.hp]'));
  g.run('C.shield = 150; __s0 = 150');
  g.run(`window.__b = __spawn('tboat', 1000, 0); __b.vmax = 0; __b.accel = 0; __b.tubes = 1; __b.rot = Math.PI; window.__tp = campTorpedoLaunch(C, __b, __t); __b.tubes = 0; __run(8)`);
  check('and so does a torpedo aimed at it: the cruiser in the way takes it (the shield first), the transport is whole', J('C.torpStat.hit') === 1 && J('C.shield') < J('__s0') && J('__t.hp') === J('__t0'), J('[C.torpStat, C.shield, __t.hp]'));
  g.run('__new(); __quiet(); C.input.fire = false; C.carrier.rot = 0');
  g.run(`window.__t = __hauler('t1', 'Transport', -300, 220, 9000, 0); __t.vmax = 0; window.__a = __spawn('skiff', 900, 220); __a.vmax = 0; __a.accel = 0; window.__t0 = __t.hp;`);
  g.run(`__shotAt(__a, __t); for (let i = 0; i < 90; i++) campBullets(C, 1 / 30)`);
  check('with the cruiser out of the line (220 px to the side) the shot reaches the transport', J('__t.hp') < J('__t0'));
}

// ---------- E. the voice and the strip ----------
console.log('E. the voice and the strip');
{
  const act = t => J(`campIntent(${JSON.stringify(t)})`);
  check('"tuck in", "tuck in close", "please tuck in", "take cover" and "convoy tuck in" are the convoy order tuck', ['tuck in', 'Tuck in close', 'please tuck in', 'take cover', 'convoy tuck in'].every(t => (act(t) || {}).act === 'fleet_convoy'));
  check('"run for it", "make a run for it" and "transport run for it" are the order run', ['run for it', 'make a run for it', 'transport run for it'].every(t => (act(t) || {}).act === 'fleet_convoy'));
  check('"carry on", "as you were" and "haulers carry on" are the order carry on', ['carry on', 'as you were', 'haulers carry on'].every(t => (act(t) || {}).act === 'fleet_convoy'));
  check('hold is a convoy order only with a convoy word ("haulers hold", "hold the transport", "stop the convoy"); a plain "hold here" is a Guard (it was the wing\'s stance until card space-game-fighter-flight)', ['haulers hold', 'hold the transport', 'stop the convoy'].every(t => (act(t) || {}).act === 'fleet_convoy') && act('hold here').act === 'fleet_guard' && act('hold your position').act === 'fleet_guard');
  check('the old orders are as they were: "escort the convoy" escorts, "guard the haulers" guards, "attack" attacks, "mine" mines', act('escort the convoy').act === 'fleet_escort' && act('guard the haulers').act === 'fleet_guard' && act('attack').act === 'fleet_attack' && act('mine the rocks').act === 'fleet_mine');
  check('a ship by name goes through whole: "tuck in Hauler 2"', act('tuck in Hauler 2').arg === 'tuck in hauler 2');
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 400, 0, 5000, 0); __h = __hauler('h2', 'Hauler 2', 600, 100, 5000, 100);`);
  const sc = J(`(() => { const s = { camp: C, scene: { key: 'Campaign' } }; return typeof SC_ACTIONS !== 'undefined' ? Object.keys(SC_ACTIONS).includes('fleet_convoy') : (typeof scActions !== 'undefined' ? Object.keys(scActions).includes('fleet_convoy') : 'unknown'); })()`);
  check('the ship computer has the action fleet_convoy (and tells the LLM about it)', sc === true || /fleet_convoy:/.test(src('src/shipcomputer.js')) && /fleet_convoy <tuck in/.test(src('src/shipcomputer.js')), String(sc));
  const r = J(`campOrder(C, 'convoy', campIntent('run for it').arg, 'voice')`);
  check('the order the voice makes is the same order: the transport and the hauler run', r.ok && J(`campConvoyState(C)`) === 'run');
}

// ---------- F. the convoy list (W) ----------
console.log('F. the convoy list: no key opens it now (the fleet list that had its row is deleted)');
{
  // the convoy list is plain data: a test opens it with campPanelGo, then presses as a player would (Down to the row, Enter)
  g.run(`window.__open = (P, C, id) => { campPanelClose(P); campPanelGo(P, C, id); return true; };
    window.__pick = (P, C, rowId, now) => { const def = campKeyVia(rowId), i = def ? campPanelList(C, def.id).findIndex(r => r.id === rowId) : -1; if (i < 0 || !__open(P, C, def.id)) return null; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); };
    window.__CL = campPanelDef('convoy'); window.__cv = () => campPanelRows(C, 'convoy');`);
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 400, 0, 5000, 0); window.__P = campPanelNew();`);
  check('the convoy list is plain data at the left, with no key, no code and no parent ("CONVOY ORDERS"): no row of any list opens it and no key reaches it (the fleet list that had its Convoy row is deleted, card space-game-delete-off-lists)', J('[__CL.parent || "", __CL.side, __CL.key, __CL.code, __CL.title, __CL.tab].join()') === ',left,,,CONVOY ORDERS,' && J('CAMP_PANELS.panels.flatMap(p => p.rows).filter(r => r.open === "convoy").length') === 0 && J(`campKeyVar('convoykey')`) === '' && J(`CAMP_PANELS.panels.some(p => p.code && campPanelKey(campPanelNew(), C, p.code, 0).open === 'convoy')`) === false);
  const rows = J('__cv()');
  check('its four rows: Tuck in, Run for it, Hold here, Carry on (the heading says CONVOY ORDERS, so no row says "Convoy:" again); each the order "convoy" with its words, none with a `when` (the list always has them), a number or a key of its own, all of them possible with a convoy out', rows.map(r => r.label).join() === 'Tuck in,Run for it,Hold here,Carry on' && rows.every(r => r.ok && r.key === '' && r.more === false) && J('__CL.rows.map(r => r.order + ":" + r.id + ":" + r.arg + ":" + (r.when || "")).join()') === 'convoy:ctuck:tuck in:,convoy:crun:run for it:,convoy:chold:hold here:,convoy:ccarry:carry on:' && J('CAMP_PANELS.panels.flatMap(p => p.rows).filter(r => r.order === "convoy").length') === 4 && J('__CL.rows.every(r => !("n" in r) && !("k" in r) && !("code" in r) && !("key" in r) && !("cycle" in r))'), JSON.stringify(rows));
  check('the row ids are their own in the whole table (the convoy\'s "hold" is chold)', (() => { const ids = J('CAMP_PANELS.panels.flatMap(p => p.rows.map(r => r.id))'); return new Set(ids).size === ids.length && ids.includes('chold') && J('__CL.rows.length') === 4 && J(`campKeyVia('chold').id`) === 'convoy'; })());
  g.run(`campPanelClose(__P);`);
  const d1 = J(`campPanelKey(__P, C, 'Digit1', 20)`), cord0 = J('__t.cord || ""');
  const w1 = J(`(() => { __open(__P, C, 'convoy'); return campPanelView(__P, C); })()`);
  check('the list opened by data is at its top row; a digit does nothing (1 was the row\'s key once); the view is a list of its own (no key, no parent)', !d1.used && !d1.ran && cord0 === '' && J('__P.at') === 0 && w1.id === 'convoy' && w1.key === '' && w1.parent === '' && w1.side === 'left' && w1.total === 4 && w1.rows[0].id === 'ctuck', JSON.stringify(w1).slice(0, 300));
  const r1 = J(`__pick(__P, C, 'ctuck', 30)`);
  check('Enter on "Tuck in" (the top row) does the row: Tuck in, a fleet order, the list closes, the ship is under the order', r1.ran && r1.ok && r1.row === 'ctuck' && r1.fleet && r1.open === '' && J('__t.cord') === 'tuck' && J('campPanelOpen(__P)') === '', JSON.stringify(r1));
  check('the row of the order in force is marked "in force"; the others are not', (() => { const rs = J('__cv()'); return rs[0].id === 'ctuck' && rs[0].marked && rs[0].state === 'in force' && !rs[1].marked && !rs[2].marked && !rs[3].marked && rs[1].state === '1 ship' && rs[2].state === '1 ship'; })(), J('JSON.stringify(__cv())'));
  g.run(`window.__kr = campPanelKey(__P, C, 'KeyR', 40); window.__cordR = __t.cord; window.__openR = campPanelOpen(__P); window.__h = __pick(__P, C, 'chold', 50);`);
  check('nothing cycles: R is the missiles\' key now (card space-game-missiles-cost-ore: it opens no list and does not touch the convoy\'s order); the row "Hold here" gives Hold here the moment Enter is pressed (nothing settles), and the ship is under it', J('__kr.row') === 'sreload' && J('__openR') === '' && J('__cordR') === 'tuck' && J('__h.ran && __h.ok') && J('__h.row') === 'chold' && J('__t.cord') === 'hold' && J('campPanelOpen(__P)') === '');
  g.run(`window.__ords = C.orders.convoy | 0; __open(__P, C, 'convoy'); const i = campPanelList(C, 'convoy').findIndex(r => r.id === 'ccarry'); for (let k = 0; k < i; k++) campPanelKey(__P, C, 'ArrowDown', 2000 + k); window.__lit = campPanelList(C, 'convoy')[__P.at].id;`);
  check('moving the highlight down past Tuck in, Run for it and Hold here to Carry on gives NO order: the ship is still under Hold here and no order is counted; Enter there gives one order, Carry on, and the ship goes its own way', J('__lit') === 'ccarry' && J('__t.cord') === 'hold' && J('(C.orders.convoy | 0) === __ords') && J('campPanelConvoyName(C)') === 'Hold here' && (g.run(`window.__cc = campPanelKey(__P, C, 'Enter', 2300)`), J('__cc.ran && __cc.ok') && J('__cc.row') === 'ccarry' && !J('__t.cord') && J('(C.orders.convoy | 0) === __ords + 1') && J('campPanelConvoyName(C)') === 'Carry on'));
  g.run(`window.__tk = __pick(__P, C, 'ctuck', 5000); window.__rn = __pick(__P, C, 'crun', 5100);`);
  check('and any order can follow any other (they are rows, not a round): Tuck in again, then Run for it', J('__tk.ok') && J('__rn.ok') && J('__t.cord') === 'run' && J('__cv().filter(r => r.marked).map(r => r.id).join()') === 'crun' && J('campPanelConvoyName(C)') === 'Run for it');
  g.run('__new(); C.ships.filter(u => u.team === "neutral").forEach(u => { u.hp = 0; delete C.by[u.id]; }); C.ships = C.ships.filter(u => u.hp > 0);');
  const none = J('__cv()');
  check('in a mission with a convoy but no escorted ship out NOW the four rows stay, greyed, and say why ("no convoy"); Enter on one is refused in words and the list stays open', J('C.L.convoys.length') > 0 && J('campConvoyShips(C).length') === 0 && none.length === 4 && none.every(r => !r.ok && r.short === 'no convoy' && /no escorted ships/.test(r.state)) && (() => { const r = J(`__pick(campPanelNew(), C, 'ctuck', 0)`); return r.ran && !r.ok && r.say.length > 0 && r.open === 'convoy'; })(), JSON.stringify(none));
  g.run('__new(); __quiet()');
  check('in a mission that can never use them (no convoy in the level and no escorted ship alive) the list opened by data has the four rows greyed ("no convoy") and Enter is refused', J('C.L.convoys.length') === 0 && J('__cv().length') === 4 && J('__cv().every(r => !r.ok && r.short === "no convoy")') && (() => { g.run('window.__P2 = campPanelNew(); campPanelGo(__P2, C, "convoy")'); const r = J(`campPanelKey(__P2, C, 'Enter', 0)`), l = J(`campPanelKey(__P2, C, 'ArrowLeft', 0)`); return r.ran && !r.ok && r.open === 'convoy' && J('C.orders.convoy | 0') === 0 && l.open === 'convoy' && J('__P2.at') === 0; })());
  check('the keys page (H, Settings) has no line for the convoy list (no key opens it), nor for any other list than the cruiser\'s, and no key cycles the convoy order', (() => { const rows = J('campPanelKeyRows()'); return rows[0].k[0] === 'S' && !rows.some(x => /^Convoy|convoy order|next page|^All squads|^Fleet|^Ship orders/.test(x.t)); })(), J('campPanelKeyRows().map(r => r.k[0] + ":" + r.t).join("|")'));
  check('the lists\' key line is read from the table, not typed: a key hint is p.key and the list\'s word p.tab, for every list that has a key; only the cruiser list has one (S Cruiser)', J('CAMP_PANELS.panels.every(p => typeof p.key === "string" && p.key.length <= 1 && typeof p.tab === "string")') && J('CAMP_PANELS.panels.filter(p => !p.key).map(p => p.id).join()') === 'convoy,yard' && J('campPanelKeyLine()') === J('["left", "right"].map(s => CAMP_PANELS.panels.filter(p => p.side === s && p.key).map(p => p.key + " " + p.tab).join("  ")).join("    ")') && J('campPanelKeyLine()') === 'S Cruiser    ');
}

// ---------- G. the words ----------
console.log('G. the words');
{
  const keys = ['camp.say.ctuck', 'camp.say.chold', 'camp.say.crun', 'camp.say.ccarry', 'camp.say.cwho', 'camp.no.cnone', 'camp.no.cwhat'];
  const md = src('content/text/campaign-convoy.md'), tab = src('src/contenttables.js');
  check('every line the code can say (' + keys.length + ') is in its own file, content/text/campaign-convoy.md, and is a default in the content tables', keys.every(k => md.includes('| ' + k + ' |') && tab.includes("'" + k + "'")));
  check('the lines are curt: 12 words at most, a full stop (but the name "Convoy")', keys.filter(k => k !== 'camp.say.cwho').every(k => { const t = J(`uiText('${k}', { who: 'Hauler 2' })`); return t.indexOf('camp.') < 0 && t.split(' ').length <= 12 && /[.?]$/.test(t); }));
  check('the code uses no other camp.say.c* key than these', (() => { const code = src('src/campconvoy.js'), found = [...code.matchAll(/'(camp\.(?:say|no)\.c[a-z]+)'/g)].map(m => m[1]); return found.every(k => keys.includes(k)); })());
  check('the file is registered in index.html after campaign.js', (() => { const h = src('index.html'), a = h.indexOf('src/campaign.js'), b = h.indexOf('src/campconvoy.js'); return a > 0 && b > a; })());
  check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
}

// ---------- J. the scene's drawing ----------
console.log('J. the bubble, the links and the flash (a stand-in scene)');
{
  g.run('__new(); __quiet()');
  g.run(`window.__t = __hauler('t1', 'Transport', 60, 30, 9000, 0); __t.vmax = 0; window.__far = __hauler('h2', 'Hauler 2', 900, 0, 9000, 0); __far.vmax = 0;
    window.__mk = () => { const live = new Set(), calls = []; const mkObj = () => { const o = new Proxy(function () {}, { get: (t, k) => k === 'destroy' ? () => { live.delete(o); } : (...a) => { calls.push(String(k)); return o; }, apply: () => o }); live.add(o); return o; };
      return { live, calls, camp: C, mode: 'play', hud: {}, add: { graphics: () => mkObj() } }; }; window.__sc = __mk();`);
  g.run('campConvoySync(__sc)');
  check('with nothing tucked in nothing is drawn but the layer is there (made in scene.hud)', J('!!__sc.hud.cv') && !J('__sc.calls.includes("strokeCircle")'));
  g.run(`campOrder(C, 'convoy', 'tuck in'); __sc.calls.length = 0; campConvoySync(__sc)`);
  check('with a ship tucked in the bubble is drawn (a fill, a ring) and a link to each ship', J('__sc.calls.includes("strokeCircle") && __sc.calls.includes("fillCircle")') && J('__sc.calls.filter(c => c === "lineBetween").length') >= 2, J('__sc.calls.join()'));
  g.run(`__sc.calls.length = 0; campHurt(C, __t, 10, 'raider-9'); campConvoyEvent(__sc, C.events.filter(e => e.type === 'convoy' && e.stage === 'cover')[0]); campConvoySync(__sc)`);
  check('a hit taken for a tucked ship flashes a line to the cruiser, which fades after ' + J('CAMP_CVLOOK.cover.ms') + ' ms', J('__sc.hud.cv.covers.length') === 1 && (g.run(`C.t += CAMP_CVLOOK.cover.ms + 10; campConvoySync(__sc)`), J('__sc.hud.cv.covers.length') === 0));
  g.run(`campOrder(C, 'convoy', 'hold here'); __sc.calls.length = 0; campConvoySync(__sc)`);
  check('Hold here puts the bubble away: nothing is tucked, nothing drawn', !J('__sc.calls.includes("strokeCircle")'));
  g.run(`campOrder(C, 'convoy', 'tuck in'); const old = __sc.hud.cv.g; __sc.hud = {}; campConvoySync(__sc); window.__renewed = __sc.hud.cv.g !== old;`);
  check('a scene that starts again (a new hud) makes its graphics anew', J('window.__renewed'));
  check('the scene calls them: campaignscene.js calls campConvoySync and campConvoyEvent, and the file is registered before the scene', (() => { const h = src('index.html'), sc = src('src/campaignscene.js'); return sc.includes('campConvoySync(this)') && sc.includes('campConvoyEvent(this, e)') && h.indexOf('src/campconvoyscene.js') > 0 && h.indexOf('src/campconvoyscene.js') < h.indexOf('src/campaignscene.js'); })());
}

// ---------- H. a battle with orders (the plain bot, with and without) ----------
console.log('H. the bot that uses the orders');
{
  const bot = await import('../tools/campaign-bot.mjs');
  const idx = 2, seeds = [1, 2, 3, 4], res = {}; // mission 1.3: three haulers home, raided on the way
  ['plain', 'tuck'].forEach(b => { res[b] = seeds.map(sd => bot.run(1, sd, b, 'steady', bot.techsFor(1), 420, idx)); });
  check('the plain bot and the bot that tucks the convoy in both win 1.3 in every one of 4 seeds', ['plain', 'tuck'].every(b => res[b].every(r => r.result === 'won')), JSON.stringify([res.plain.map(r => r.result), res.tuck.map(r => r.result)]));
  check('the tuck bot used the order (convoy orders are counted)', res.tuck.every(r => (r.orders.convoy | 0) >= 1) && res.plain.every(r => (r.orders.convoy | 0) === 0), JSON.stringify([res.tuck.map(r => r.orders.convoy), res.plain.map(r => r.orders.convoy)]));
  const lost = b => res[b].reduce((a, r) => a + (r.convoyLost | 0), 0);
  check('and it loses no more haulers than the plain bot does (the cover costs the cruiser hull, not the convoy)', lost('tuck') <= lost('plain'), lost('plain') + ' vs ' + lost('tuck'));
}

// ---------- I. determinism ----------
console.log('I. the same seed flies the same');
{
  const run = () => { g.run('__new({ seed: 7 }); __spawn("skiff", 900, 0); __spawn("skiff", 950, 80); campOrder(C, "convoy", "tuck in")'); g.run('__run(40)'); return J(`JSON.stringify({ s: Math.round(C.shield), h: Math.round(C.carrier.hp), f: C.ships.filter(u => u.kind === 'freighter').map(u => [Math.round(u.x), Math.round(u.y), Math.round(u.hp)]) })`); };
  const a = run(), b = run();
  check('two runs of one seed with the same order are the same, to the pixel', a === b, a + ' | ' + b);
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
