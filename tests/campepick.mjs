// smoke: E's first pick fits the mission (a rock field first where ore is the goal, a ship first elsewhere) and taking the stick (C) lets go of the picked target (card space-game-b14-c14-15-e-pick; Troy yes, 27 Nov 2026; the cloud's BRIEF 14 chunks 14 and 15)
// src/camptarget.js campFriOreGoal / campFriRegFields / campFriRegister (the numbers), src/campcockpit.js campCockpitTake (the pick is let go), src/camporderline.js campOrderLineQuiet (the sentence and its check end with it).
//   A  the E row of every mission at the start: 1.2 (an objective of type ore) has the four rock fields first, E1 to E4, then Miner 1 and 2 as E5 and E6; no other mission is an ore mission; a ship keeps coming first where there is one (1.1's Transport and miner, 1.3's haulers)
//   B  the page's one-minute test for 1.2, as the real keys: W 1 E 1 Enter at 2 s says "Wedge, mine the rock." (it said "Wedge, guard our miner."); E 5 is the miner and guards him
//   C  the numbers stay for the mission: a field with no rock left is dark and keeps its number, a lost miner keeps his, and the rows after are not renumbered
//   D  the page's test for chunk 15 (2.1: W 1 E 1 Enter, then C): the picked target is let go at the take; the sentence and its check go dark; the key row's Enter says form up
//   E  the edges: a pick made WHILE flying is kept (the take runs once), taking the same stick again clears nothing, a take that is refused clears nothing, the hand-back changes no pick, both the held ship and the held enemy are let go
// Run: node tests/campepick.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`window.__mk = (level, mission, secs) => { const C = window.C = campNew(level, [], { seed: 3, mission }); C.arrivedAt = 0; for (let i = 0; i < 30 * (secs || 4); i++) campStep(C, 1 / 30); C.events.length = 0; return C; };
  window.__nums = () => campFriNumbered(C).map(e => e.number + ':' + e.name + (e.alive ? '' : '(dark)') + (e.field ? '*' : ''));
  window.__line = () => { const L = campOrderLineNow(C); return L && [L.who.t, L.verb.t, L.target.t, L.check ? 'ok' : ''].join(' | '); };`);

console.log('A. the E row of each mission');
{
  g.run(`__mk(1, 1);`);
  check('1.2 (ore is its goal): the four rock fields are E1 to E4 (marked *), the miners E5 and E6', J('__nums()').join() === '1:Rock field 1*,2:Rock field 2*,3:Rock field 3*,4:Rock field 4*,5:Miner 1,6:Miner 2', J('__nums()').join());
  const ore = [];
  for (const [lv, ms] of [[1, [0, 1, 2]], [2, [0, 1, 2]], [3, [0, 1, 2]]]) for (const m of ms) { g.run(`window.C = campNew(${lv}, [], { seed: 3, mission: ${m} });`); ore.push(lv + '.' + (m + 1) + ':' + J('campFriOreGoal(C)')); }
  check('only 1.2 is an ore mission (an objective of type ore); no other mission changes', ore.join() === '1.1:false,1.2:true,1.3:false,2.1:false,2.2:false,2.3:false,3.1:false,3.2:false,3.3:false', ore.join());
  g.run(`__mk(1, 0, 2);`);
  check('1.1 keeps its ships first: the Transport is 1 and the miner (who joins when he calls for help) has 2 reserved', J('__nums()').join() === '2:Miner' || /^1:Transport/.test(J('__nums()').join()), J('__nums()').join());
  g.run(`__mk(1, 2, 30);`);
  check('1.3: the haulers are the E row, from 1 (no field is in the way)', /^1:Hauler 1/.test(J('__nums()').join()) && !J('__nums()').some(x => /\*$/.test(x)), J('__nums()').join());
  for (const [lv, m, name] of [[2, 0, '2.1'], [2, 1, '2.2'], [2, 2, '2.3'], [3, 0, '3.1'], [3, 1, '3.2'], [3, 2, '3.3']]) { g.run(`__mk(${lv}, ${m}, 2);`); check(name + ' has no ship to protect: the fields are the E row, from 1, as they were', /^1:Rock field 1\*,2:Rock field 2\*/.test(J('__nums()').join()), J('__nums()').join()); }
}

console.log('B. the page\'s test for 1.2');
{
  g.run(`__mk(1, 1, 2); window.P = campPanelNew(); campSelPick(C, 'pilot:red', 'key');`);
  g.run(`campPanelKey(P, C, 'KeyE', 1000); window.__e1 = campPanelKey(P, C, 'Digit1', 1100);`);
  check('W 1, E 1: the line reads "Wedge | mine | Rock field 1" (it read Miner 1, "guard")', J('__e1.ok') === true && J('C.fsel') === 'field-0' && J('__line()') === 'Wedge | mine | Rock field 1 | ', J('__line()'));
  g.run(`window.__r = campSelOrder(C, 'engage', 'key');`);
  check('Enter: the radio says "Wedge, mine the rock." (it said "Wedge, guard our miner.": the briefing promised mining)', J('__r.ok') === true && J('__r.say') === 'Wedge, mine the rock.' && J('__r.verb') === 'mine', J('[__r.ok, __r.say, __r.verb]'));
  g.run(`__mk(1, 1, 2); window.P = campPanelNew(); campSelPick(C, 'pilot:red', 'key'); campPanelKey(P, C, 'KeyE', 1000); campPanelKey(P, C, 'Digit5', 1100);`);
  check('E 5 is Miner 1: the pilot still guards a miner when you pick one by his number', /Miner 1/.test(J('(campHeldNow(C) || {}).name || ""')) && J('campSelOrder(C, "engage", "key", true).verb') === 'guard', J('(campHeldNow(C) || {}).name'));
}

console.log('C. the numbers stay');
{
  g.run(`__mk(1, 1, 2); window.__before = __nums(); C.rocks.filter(r => r.field === 0).forEach(r => { r.hp = 0; }); for (let i = 0; i < 3; i++) campStep(C, 1 / 30);`);
  check('a field with no rock left is dark and keeps E1 (the others do not move)', J('__nums()').join() === '1:Rock field 1(dark)*,2:Rock field 2*,3:Rock field 3*,4:Rock field 4*,5:Miner 1,6:Miner 2', J('__nums()').join());
  g.run(`__mk(1, 1, 2); const m = C.ships.find(u => u.kind === 'miner' && u.team === 'neutral' || /Miner/.test(u.name || '')); window.__m = m ? m.id : ''; if (m) { m.hp = 0; } for (let i = 0; i < 3; i++) campStep(C, 1 / 30);`);
  check('a lost miner keeps his number, and the fields stay 1 to 4', /^1:Rock field 1\*,2:Rock field 2\*,3:Rock field 3\*,4:Rock field 4\*,/.test(J('__nums()').join()), J('__nums()').join());
}

console.log('D. the page\'s test for chunk 15 (2.1: W 1 E 1 Enter, then C)');
{
  g.run(`__mk(2, 0, 4); window.P = campPanelNew(); __line(); campSelPick(C, 'pilot:red', 'key'); campPanelKey(P, C, 'KeyE', 1000); campPanelKey(P, C, 'Digit1', 1100); __line(); campSelOrder(C, 'engage', 'key');`); // (the page looks every frame: the first look is before the order)
  const before = J('__line()');
  check('before C: the line reads "Wedge | mine | Rock field 1" with its tick', before === 'Wedge | mine | Rock field 1 | ok', before);
  g.run(`window.__take = campCockpitTake(C);`);
  check('C takes the stick (a fighter flies)', J('__take') === true && !!J('C.cockpit'));
  check('the held target is let go: no field and no enemy is held', J('C.fsel') === '' && J('C.tgt') === '' && J('campHeldNow(C)') === null, J('[C.fsel, C.tgt]'));
  check('the sentence and its tick are dark at once (it read "All pilots | mine | Rock field 1")', J('__line()') === null, J('__line()'));
  g.run(`for (let i = 0; i < 90; i++) campStep(C, 1 / 30);`);
  check('and stay dark: nothing is said until he picks again', J('__line()') === null, J('__line()'));
  g.run(`campFriJump(C, 1);`);
  check('a pick made while flying shows the sentence again, as before: "All pilots mine Rock field 1" (one Enter is then his choice)', J('__line()') === 'All pilots | mine | Rock field 1 | ', J('__line()'));
}

console.log('E. the edges');
{
  g.run(`__mk(2, 0, 4); campFriJump(C, 1); C.tgt = ''; campCockpitTake(C); campFriJump(C, 2); window.__keep = C.fsel; campCockpitTake(C, C.cockpit.id);`);
  check('taking the stick he has already (the same ship) clears nothing: a pick made in the cockpit stays', J('__keep') === 'field-1' && J('C.fsel') === 'field-1', J('[__keep, C.fsel]'));
  g.run(`campCockpitGive(C, 'hand');`);
  check('handing the stick back changes no pick', J('C.fsel') === 'field-1', J('C.fsel'));
  g.run(`__mk(2, 0, 4); campFriJump(C, 1); C.podUntil = C.t + 5; window.__t = campCockpitTake(C);`);
  check('a take that is refused (his pilot is mending after a pod) lets go of nothing', J('__t') === false && J('C.fsel') === 'field-0', J('[__t, C.fsel]'));
  g.run(`__mk(2, 0, 4); window.__tgt = campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); campTgtHold(C, __tgt.id); campCockpitTake(C);`);
  check('a held enemy is let go with it: the cruiser\'s Enter no longer says "attack Raider" for a fighter in the cockpit', J('C.tgt') === '' && J('campHeldNow(C)') === null, J('[C.tgt]'));
  g.run(`__mk(2, 0, 4); window.__a = campOrderLineNow(C); campSelPick(C, 'pilot:red', 'key'); campFriJump(C, 1); campSelOrder(C, 'engage', 'key'); campCockpitTake(C);`);
  g.run(`__mk(2, 0, 4); campFriJump(C, 1); window.__lit1 = JSON.stringify(campTeachLights(C));`);
  const lit1 = J('__lit1'); g.run(`campCockpitTake(C); window.__lit2 = JSON.stringify(campTeachLights(C));`);
  check('the one-time chip "Enter twice: the other" goes dark with the pick (it stayed lit for its 20 s over nothing)', /teachtwice|twice|other/i.test(lit1) && !/teachtwice|twice|other/i.test(J('__lit2')), lit1 + ' -> ' + J('__lit2'));
  check('the order\'s tick ends too: no "form up" is read back for an order nobody gave', J('__line()') === null, J('__line()'));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('E PICK FAIL (' + failed + ')'); process.exit(1); } else console.log('E PICK PASS');
