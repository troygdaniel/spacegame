// smoke: taking the stick of a pilot's fighter, L1 (plain Node, no Chrome): the switch and the key, who is taken, the Wren's flight numbers, the boost store, the hull ratio, the pilot's own guns, the cruiser while he is away, the exemptions, the hand-back and the death
// Card space-game-fly-fighter-l1 (Troy, 26 Nov 2026: "I love how the Long Haul ship flies": fly a pilot's fighter with the Wren's feel and leave the cruiser heavy; the scope report is on card space-game-fly-fighter-scope). src/campcockpit.js, the table CAMP.cockpit, behind CAMP.flags.cockpit.
//   A. the switch and the table: off by default, the C key is no key with it off, the numbers are the Wren's flight and the pilot's own guns, the address
//   B. who is taken: the W pick's pilot, else Red 1, else any fighter out; a second take hands the first back; none out is refused in words
//   C. the flight: thrust only while the key is down, the Wren's top speed, boost, turn, drag and brake; the boost store, its lock and its refill; the top speed falls after the boost
//   D. the hull: times hpK from where it is, back by the same ratio, taking and giving cannot heal or hurt, the slider is read at the take
//   E. the guns: the pilot's damage and rate, times damageK and rateK
//   F. the cruiser while he is away: its last order goes on, the keys of the fighter are not the cruiser's, its turrets fire by themselves (hostiles only) or not
//   G. the exemptions: no AI, no fight pace, no pairing, not in a flight's vee, not one of the pilots an order reaches
//   H. the hand-back: the key, the fighter's loss (the pilot is lost as always), the cruiser's loss and a win
//   I. orders and missiles keep working from the fighter
// Run: node tests/campcockpit.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
g.run(`{ 
  window.__mk = (flag) => { CAMP.flags.cockpit = flag !== false; const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.t = 1000; C.god = true; campStep(C, 2); C.ships.forEach(u => { if (u.team === 'alien' || u.team === 'neutral') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); window.__ev = {}; C.events.length = 0; return C; };
  window.__run = (secs, f) => { for (let i = 0; i < Math.round(secs * 60); i++) { if (f) f(i); campStep(C, 1 / 60); C.events.forEach(e => { const k = e.type + (e.stage ? ':' + e.stage : ''); __ev[k] = (__ev[k] || 0) + 1; }); C.events.length = 0; } };
  window.__fly = () => C.by[C.cockpit.id];
  window.__sp = u => Math.hypot(u.vx, u.vy);
  window.__still = u => { u.vx = 0; u.vy = 0; u.rot = 0; return u; };
  window.__dummy = (dx, dy, kind, base) => { const b = base || C.carrier, a = campSpawn(C, kind || 'raider', b.x + dx, b.y + dy); a.hp = 1e6; a.maxHp = 1e6; a.vmax = 0; a.accel = 0; a.nextShot = 1e12; window.__a = a; return a; };
  window.__alone = () => { const id = C.cockpit ? C.cockpit.id : ''; C.ships = C.ships.filter(u => u.kind !== 'fighter' || u.id === id); };
  window.__reset = () => { Object.assign(CAMP.cockpit, { hpK: 2, damageK: 1, rateK: 1, turrets: 'auto' }); };
 }`);

console.log('A. the switch and the table');
{
  check('off by default: CAMP.flags.cockpit is false in the table', J('CAMP.flags.cockpit') === false && J('campCockpitOn()') === false);
  g.run(`__mk(false);`);
  g.run(`CAMP.flags.cockpit = false; window.P = campPanelNew();`);
  check('with the switch off a take is refused and the key does nothing', J('campCockpitOn()') === false && J('campCockpitTake(C)') === false && J('C.cockpit') === null && J(`(() => { const r = campPanelKey(P, C, 'KeyC', 0); return [r.used, r.ran]; })()`).join() === 'false,false');
  g.run(`CAMP.flags.cockpit = true;`);
  check('the Wren\'s flight numbers: top speed 480, boost 800, thrust 720 (1500 boosting: 25/12), turn 3.6 rad/s, drag 0.55 and 0.12 braking, falls 900 px/s each second', J('(() => { const K = CAMP.cockpit; return [K.speed, K.boost, K.accel, K.boostAccel, K.turn, K.drag, K.brakeDrag, K.fall]; })()').map(x => +x.toFixed(4)).join() === '480,800,720,2.0833,3.6,0.55,0.12,900');
  check('the Wren\'s boost store: 100, 25 a second out, a second\'s pause, 17 a second back, locked until a quarter is back', J('JSON.stringify(CAMP.cockpit.store)') === JSON.stringify({ max: 100, drain: 25, pause: 1000, regen: 17, back: 0.25 }));
  check('the combat numbers: the guns three times the rate at half the damage (Troy, 26 Nov, after flying it: the fire rate was too slow), hpK 2 for the hull (double), the cruiser\'s turrets fire on their own while he is away', J('[CAMP.cockpit.damageK, CAMP.cockpit.rateK, CAMP.cockpit.hpK, CAMP.cockpit.turrets]').join() === '0.5,3,2,auto');
  check('every number of the table is finite', (function f(o) { return Object.values(o).every(v => typeof v === 'number' ? isFinite(v) : typeof v === 'object' ? f(v) : true); })(J('CAMP.cockpit')));
  check('C is the key (the table: one key, KeyC), and the H page lists it only while the switch is on', J('CAMP_KEYS.cockpit.k') === 'C' && J('CAMP_KEYS.cockpit.codes.join()') === 'KeyC' && J(`campKeysPage().some(gr => gr.rows.some(r => r.caps.join() === 'C'))`) === true && (g.run(`CAMP.flags.cockpit = false;`), J(`campKeysPage().some(gr => gr.rows.some(r => r.caps.join() === 'C'))`)) === false);
  g.run(`CAMP.flags.cockpit = true;`);
  check('the address ?cockpit=1 is on, ?cockpit=0 is off, none says nothing', J(`campCockpitAddrOn('?campaign=1&cockpit=1')`) === true && J(`campCockpitAddrOff('?cockpit=0')`) === true && J(`campCockpitAddrOn('?campaign=1')`) === false && J(`campCockpitAddrOff('?campaign=1')`) === false);
  check('the three words are the content table\'s (shown, never said): the chip words and the cruiser\'s tag (Cruiser (auto): card space-game-b7-hud-q-cockpit)', J(`uiText('camp.corner.chip.cockpit')`) === 'Cockpit' && J(`uiText('camp.corner.chip.cockpitback')`) === 'Hand back' && J(`uiText('camp.corner.cruiserauto')`) === 'Cruiser (auto)');
}

console.log('B. who is taken');
{
  g.run(`__mk(); window.P = campPanelNew();`);
  check('the start: three pilots out (Red, Green, Yellow), the W pick is All pilots', J(`C.ships.filter(u => u.kind === 'fighter').map(u => u.squad).join()`) === 'red,green,yellow' && J('campSelNow(C).kind') === 'all');
  check('nothing picked: Red 1 (Wedge) is taken, the camera\'s eye is that fighter, and the fighter is marked', J('campCockpitTake(C)') === true && J('C.cockpit.id') === 'fighter-5' && J('campEye(C).id') === 'fighter-5' && J('C.by[C.cockpit.id].cockpit') === true && J('C.carrier.cockpit') === null);
  g.run(`campCockpitGive(C, 'hand'); campSelPick(C, CAMP_SELPILOT + 'green');`);
  check('a pilot picked on W: that pilot\'s fighter (Kara, Green)', J('campCockpitTake(C)') === true && J(`C.by[C.cockpit.id].squad`) === 'green');
  check('a second take names another fighter: the first is handed back and the new one taken (one fighter at a time)', J(`campCockpitTake(C, 'fighter-7')`) === true && J('C.cockpit.id') === 'fighter-7' && J(`C.by['fighter-6'].cockpit`) === false && J(`C.by['fighter-7'].cockpit`) === true);
  check('a bad id is refused (a ship that is no fighter, one that is lost), and the stick stays where it was', J(`campCockpitTake(C, 'carrier-1')`) === false && J(`campCockpitTake(C, 'nobody')`) === false && J('C.cockpit.id') === 'fighter-7');
  g.run(`campCockpitGive(C, 'hand'); C.ships.filter(u => u.kind === 'fighter').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0);`);
  check('no pilot out: a take is refused, and the C key says so in words (the W pick\'s own refusal)', J('campCockpitTake(C)') === false && J(`(() => { const r = campPanelKey(P, C, 'KeyC', 0); return [r.used, r.ran, r.ok, r.say]; })()`).join() === 'true,true,false,' + J(`uiText('camp.no.nopilot')`));
}

console.log('C. the flight');
{
  g.run(`__mk(); campCockpitTake(C); __reset(); __still(__fly());`);
  check('no key down: the fighter does not move by itself (its own AI is not flying it)', (g.run(`__run(2)`), J('__sp(__fly())')) === 0 || J('__sp(__fly())') < 1e-9);
  g.run(`C.cockpit.input.thrust = 1; __run(3);`);
  check('thrust: the Wren\'s top speed, 480 px/s, and no more', near(J('__sp(__fly())'), 480, 0.5), J('__sp(__fly())'));
  g.run(`C.cockpit.input.boost = true; __run(1);`);
  check('Shift with thrust: the boost\'s top speed, 800 px/s, within a second; the store has paid 25 a second (75 left, one second of four)', near(J('__sp(__fly())'), 800, 1) && near(J('C.cockpit.boost.en'), 75, 1.2), J('[__sp(__fly()), C.cockpit.boost.en]'));
  g.run(`C.cockpit.input.boost = false; __run(0.1);`);
  const fall1 = J('C.cockpit.vmax');
  g.run(`__run(0.4);`);
  check('letting go: the top speed comes down at 900 px/s each second (a fade, not a wall), to 480', near(fall1, 800 - 90, 3) && near(J('C.cockpit.vmax'), 480, 0.5) && near(J('__sp(__fly())'), 480, 0.5), JSON.stringify([fall1, J('C.cockpit.vmax')]));
  g.run(`C.cockpit.boost.en = 100; C.cockpit.boost.until = 0; __ev = {}; C.cockpit.input.boost = true; __run(4.5);`);
  check('the store runs dry in four seconds from full: the boost locks with one dry event, the top speed falls back to 480 though Shift is held', J('C.cockpit.boost.locked') === true && J('C.cockpit.boost.on') === false && J('__ev["cockpit:dry"]') === 1 && near(J('C.cockpit.vmax'), 480, 0.5), J('[C.cockpit.boost.locked, __ev, C.cockpit.vmax]'));
  g.run(`C.cockpit.input.boost = false; C.cockpit.input.thrust = 0; __run(0.4);`);
  const e0 = J('C.cockpit.boost.en');
  check('the refill waits a second after the last of the boost: nothing back 0.9 seconds after it ran dry', e0 === 0 && J('C.cockpit.boost.en') === 0, JSON.stringify([e0, J('C.cockpit.boost.en')]));
  g.run(`__run(2.1);`);
  check('then 17 a second, and the lock lifts when a quarter (25) is back (1.5 seconds after the pause)', near(J('C.cockpit.boost.en'), 34, 3) && J('C.cockpit.boost.locked') === false, J('[C.cockpit.boost.en, C.cockpit.boost.locked]'));
  g.run(`__still(__fly()); C.cockpit.input.thrust = 0; C.cockpit.input.turn = 1; __run(1);`);
  check('turn: 3.6 rad/s the moment the key is down (the Wren\'s classic handling), the other way too', near(J('__fly().rot'), 3.6, 0.06) && (g.run(`C.cockpit.input.turn = -1; __run(1);`), near(J('__fly().rot'), 0, 0.06)), J('__fly().rot'));
  g.run(`C.cockpit.input.turn = 0; __fly().vx = 400; __fly().vy = 0; __fly().rot = 0; __run(1);`);
  const coast = J('__sp(__fly())');
  g.run(`__fly().vx = 400; __fly().vy = 0; C.cockpit.input.brake = true; __run(1);`);
  check('no thrust: it keeps 0.55 of its speed each second (400 to 220), and 0.12 with the brake held (400 to 48)', near(coast, 220, 2) && near(J('__sp(__fly())'), 48, 1.5), JSON.stringify([coast, J('__sp(__fly())')]));
  g.run(`C.cockpit.input.brake = false; __still(__fly()); C.cockpit.input.thrust = 1; C.cockpit.input.boost = false; __run(0.05);`);
  const a1 = J('__sp(__fly())');
  check('thrust is the Wren\'s 720 px/s each second from rest (about 36 in the first 50 ms, less the drag), and 1500 boosting', a1 > 33 && a1 < 36.5, a1);
}

console.log('D. the hull');
{
  g.run(`__mk(); __reset();`);
  const before = J(`C.by['fighter-7'].hp + ',' + C.by['fighter-7'].maxHp`);
  g.run(`C.by['fighter-7'].hp = 50; campCockpitTake(C, 'fighter-7');`);
  check('taken: the hull is the pilot\'s times hpK (2), from where it is (50 of 72 becomes 100 of 144)', J(`C.by['fighter-7'].hp`) === 100 && J(`C.by['fighter-7'].maxHp`) === 144 && before === '72,72', before);
  g.run(`campHurt(C, C.by['fighter-7'], 30, 'x');`);
  check('hurt in the cockpit: it takes the hit off the doubled hull (70 of 144)', J(`C.by['fighter-7'].hp`) === 70);
  g.run(`campCockpitGive(C, 'hand');`);
  check('handed back: by the same ratio (35 of 72), so a half-hull fighter is half-hull still', J(`C.by['fighter-7'].hp`) === 35 && J(`C.by['fighter-7'].maxHp`) === 72 && J(`C.by['fighter-7'].cockpit`) === false);
  g.run(`campCockpitTake(C, 'fighter-6'); campCockpitGive(C, 'hand');`);
  check('take and give at once can neither heal nor hurt (108 of 108 stays 108 of 108)', J(`C.by['fighter-6'].hp`) === 108 && J(`C.by['fighter-6'].maxHp`) === 108);
  g.run(`CAMP.cockpit.hpK = 3; campCockpitTake(C, 'fighter-5'); CAMP.cockpit.hpK = 1;`);
  const k3 = J(`C.by['fighter-5'].hp`);
  g.run(`campCockpitGive(C, 'hand');`);
  check('the slider is read at the take (3 here: 324), and the ratio it was taken with is the one handed back by, even if the slider moved on', k3 === 324 && J(`C.by['fighter-5'].hp`) === 108, k3);
  g.run(`__reset();`);
}

console.log('E. the guns');
{
  g.run(`__mk(); campCockpitTake(C); __reset(); __still(__fly()); C.cockpit.input.fire = true; __run(5);`);
  const shots = J('__ev.wingshot');
  check('the pilot\'s own rate: one shot every mean delay (550 ms) the moment the key is down: ten in five seconds', shots === 10, shots);
  g.run(`{ const b = C.bullets.filter(x => x.from === C.cockpit.id).pop(); window.__b = b; }`);
  check('its shot is the pilot\'s: team earth, the damage 8 times the pilot\'s strength, from the fighter along its nose', J('__b.team') === 'earth' && near(J('__b.dmg'), 8 * (J('__fly().str') || 1), 1e-9) && near(J('Math.atan2(__b.vy, __b.vx)'), 0, 1e-9), J('[__b.team, __b.dmg]'));
  g.run(`__mk(); campCockpitTake(C); CAMP.cockpit.damageK = 2; CAMP.cockpit.rateK = 2; __still(__fly()); C.cockpit.input.fire = true; __run(5);`);
  check('damageK and rateK multiply them: twice the damage, twice the rate (19 shots in five seconds)', J('__ev.wingshot') === 19 && near(J('C.bullets.filter(x => x.from === C.cockpit.id).pop().dmg'), 16 * (J('__fly().str') || 1), 1e-9), J('__ev.wingshot'));
  g.run(`__reset(); __mk(); campCockpitTake(C); C.cockpit.input.fire = false; __run(2);`);
  check('no Space, no shot', (J('__ev.wingshot') || 0) === 0);
  g.run(`__mk(); CAMP.cockpit.turrets = 'off'; campCockpitTake(C); __alone(); __still(__fly()); __dummy(300, 0, 'raider', __fly()); C.cockpit.input.fire = true; __run(3); __reset();`);
  check('a shot at an alien in front of it hits: its hit points come down by the damage', J('__a.hp') < 1e6 && near((1e6 - J('__a.hp')) / (8 * (J('__fly().str') || 1)), Math.round((1e6 - J('__a.hp')) / (8 * (J('__fly().str') || 1))), 1e-6), J('__a.hp'));
}

console.log('F. the cruiser while he is away');
{
  g.run(`{ __mk(); campCockpitTake(C); __reset(); const c0 = [C.carrier.x, C.carrier.y]; window.__c0 = c0; campNavGo(C, campNavRows(C).find(r => r.id === 'place:earth'), false); C.cockpit.input.turn = 1; C.cockpit.input.thrust = 1; C.cockpit.input.brake = true; __run(3); }`);
  check('the autopilot goes on flying the cruiser (its last order): it has moved toward Earth while the fighter\'s keys (turn, thrust, brake) were its own', J('Math.hypot(C.carrier.x - __c0[0], C.carrier.y - __c0[1])') > 100 && J('C.nav && C.nav.on') === true, J('Math.hypot(C.carrier.x - __c0[0], C.carrier.y - __c0[1])'));
  g.run(`__mk(); campCockpitTake(C); C.input.thrust = 0; C.input.turn = 0; C.carrier.vx = 100; C.carrier.vy = 0; C.cockpit.input.thrust = 1; __run(3);`);
  check('no order: the cruiser coasts to a stop on its own drag (the fighter\'s thrust is not its thrust)', J('Math.hypot(C.carrier.vx, C.carrier.vy)') < 100 * Math.pow(0.55, 3) + 1, J('Math.hypot(C.carrier.vx, C.carrier.vy)'));
  g.run(`__mk(); campCockpitTake(C); __alone(); __still(__fly()); __fly().x = C.carrier.x + 4000; __dummy(250, 0); __run(3);`);
  check('turrets auto: an alien in reach is shot by the cruiser\'s turrets with nobody holding Space (C.input.fire is false)', J('C.input.fire') === false && J('__a.hp') < 1e6, J('__a.hp'));
  g.run(`__mk(); CAMP.cockpit.turrets = 'off'; campCockpitTake(C); __alone(); __still(__fly()); __fly().x = C.carrier.x + 4000; __dummy(250, 0); __run(3); __reset();`);
  check('turrets off: they do not (Space is the fighter\'s gun then)', J('__a.hp') === 1e6, J('__a.hp'));
  g.run(`__reset(); __mk(); campCockpitTake(C); C.rocks.push({ id: 'rock-x', x: C.carrier.x + 200, y: C.carrier.y, r: 30, hp: 100, maxHp: 100, ore: 5 }); __run(3);`);
  check('the automatic turrets shoot hostiles only: a rock in reach is left alone (mining is Space\'s)', J(`C.rocks.find(r => r.id === 'rock-x').hp`) === 100);
  g.run(`__mk(); campCockpitTake(C); campCockpitGive(C, 'hand'); C.ships = C.ships.filter(u => u.kind !== 'fighter'); C.input.fire = false; __dummy(250, 0); __run(2);`);
  check('handed back, the turrets are as they always were: nobody holds Space, nothing fires', J('__a.hp') === 1e6);
}

console.log('G. the exemptions');
{
  g.run(`{ __mk(); __reset(); const f = C.by['fighter-6']; f.order = { type: 'guard', at: { kind: 'carrier' } }; }`);
  const moved = J(`(() => { const f = C.by['fighter-6'], x = f.x, y = f.y; __run(3); return Math.hypot(f.x - x, f.y - y); })()`);
  g.run(`campCockpitTake(C, 'fighter-6'); __still(C.by['fighter-6']);`);
  const stayed = J(`(() => { const f = C.by['fighter-6']; f.x = 0; f.y = 0; __run(3); return Math.hypot(f.x, f.y); })()`);
  check('its own AI does not fly it: the same fighter that keeps its station when it is the wing\'s (it moves), sits still with no key down in the cockpit', moved > 5 && stayed < 1e-9, JSON.stringify([moved, stayed]));
  g.run(`__mk(); campCockpitTake(C, 'fighter-5'); __still(C.by['fighter-5']); __dummy(200, 0, 'raider', C.by['fighter-5']); __run(2);`);
  check('no pairing: a raider near it is not matched to it, and it is not matched to the raider (the duel is the pilot\'s AI\'s)', J(`C.by['fighter-5'].mate || null`) === null);
  g.run(`__mk(); campCockpitTake(C, 'fighter-5'); __still(C.by['fighter-5']); __dummy(200, 0, 'raider', C.by['fighter-5']); C.fightOn = true; CAMP.pace.fight = 0.5; __run(1);`);
  check('no fight pace: the other fighters near a foe are slowed by it (fp under 1), the one he flies is not', J(`C.by['fighter-5'].fp === undefined || C.by['fighter-5'].fp === 1`) === true && J(`C.by['fighter-6'].fp === undefined || C.by['fighter-6'].fp <= 1`) === true);
  g.run(`CAMP.pace.fight = 1; __mk(); campCockpitTake(C, 'fighter-5');`);
  check('not one of the pilots: Wedge is not a stop of the W pick while he flies it (the others are), and an order to the fighters does not reach it', J(`campSelList(C).filter(e => e.kind === 'pilot').map(e => e.squad).join()`) === 'green,yellow' && J(`campWingShips(C, 'fighters').map(u => u.id).join()`) === 'fighter-6,fighter-7');
  check('not in a flight\'s vee: the flight of its squad does not count it (its slot is not held for it)', J(`campFlightMembers(C, C.by['fighter-6']).map(u => u.id).join()`) === 'fighter-6' && J(`campFlightMembers(C, C.by['fighter-5']).map(u => u.id).join()`) === '');
  g.run(`campCockpitGive(C, 'hand');`);
  check('handed back, it is the wing\'s again: a stop of the pick, a member of its flight, a ship an order reaches', J(`campSelList(C).filter(e => e.kind === 'pilot').map(e => e.squad).join()`) === 'red,green,yellow' && J(`campWingShips(C, 'fighters').length`) === 3);
}

console.log('H. the hand-back');
{
  g.run(`__mk(); window.P = campPanelNew();`);
  check('the C key takes the stick (a pilot picked or Red 1), and a second press hands it back', J(`(() => { const a = campPanelKey(P, C, 'KeyC', 0), t = !!C.cockpit, b = campPanelKey(P, C, 'KeyC', 1000); return [a.used, a.ran, a.ok, t, b.ran, !!C.cockpit]; })()`).join() === 'true,true,true,true,true,false');
  g.run(`{ campCockpitTake(C, 'fighter-6'); const u = C.by['fighter-6']; u.hp = 0; campKill(C, u); const lost0 = C.lostShips; window.__lost0 = lost0; __run(0.1); }`);
  check('his fighter is lost: the pilot is lost as always (a ship lost, the boom), the stick is handed back by itself, the eye is the cruiser again', J('C.cockpit') === null && J('campEye(C).id') === 'carrier-1' && J('__ev["cockpit:give"]') >= 1 && J('C.lostShips') >= 1, J('[C.cockpit, __ev]'));
  g.run(`__mk(); campCockpitTake(C); campEnd(C, 'lost', 'carrier');`);
  check('the mission ends (lost): the cockpit is cleared at once, whatever the reason', J('C.cockpit') === null && J(`C.ships.some(u => u.cockpit)`) === false);
  g.run(`__mk(); campCockpitTake(C); campEnd(C, 'won', 'mother');`);
  check('and on a win: cleared, the fighter is not marked, the hull is the pilot\'s own again', J('C.cockpit') === null && J(`C.by['fighter-5'].hp`) === 108 && J(`C.by['fighter-5'].cockpit`) === false);
}

console.log('I. orders and missiles from the fighter');
{
  g.run(`{ __mk(); campCockpitTake(C); const a = campSpawn(C, 'gunship', C.carrier.x + 600, C.carrier.y); a.vmax = 0; a.accel = 0; a.nextShot = 1e12; window.__a = a; C.missiles = 3; const r = campOrder(C, 'missiles', '', 'key'); window.__r = r; }`);
  check('Z (the missile order) fires the cruiser\'s tube at a big ship in its range while he flies: a rocket leaves the cruiser, the magazine is one less', J('__r.ok') === true && J('C.rockets.length') === 1 && J('C.missiles') === 2 && near(J('C.rockets[0].x'), J('C.carrier.x'), 60), J('__r'));
  g.run(`campSelPick(C, CAMP_SELPILOT + 'green'); __run(0.1);`);
  check('W still picks a pilot, with the stick held (Wedge is not a stop, so W cannot name him)', J(`campSelNow(C).squad`) === 'green' && J('C.cockpit.id') === 'fighter-5');
  g.run(`campCockpitGive(C, 'hand'); __run(1);`);
  check('the whole run is deterministic: the same level, seed and keys give the same fighter place twice', (() => { const run = () => { g.run(`__mk(); campCockpitTake(C); C.cockpit.input.thrust = 1; C.cockpit.input.turn = 0.5; C.cockpit.input.boost = true; C.cockpit.input.fire = true; __run(4);`); return J('[Math.round(__fly().x * 1000), Math.round(__fly().y * 1000), __ev.wingshot]').join(); }; return run() === run(); })());
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
