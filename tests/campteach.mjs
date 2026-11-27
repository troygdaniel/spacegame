// smoke: the bottom key row teaches: at 5 s into mission 1.1 the Q chip lights with "then 1: stay with her" at the left end of the row, and goes quiet once Q has been pressed (plain Node, no Chrome)
// Card space-game-chunk12-teach-q (Troy, 26 Nov 2026; brief 8 proposal E, decision 5, first chip only). src/campteach.js is the mechanism (CAMP_TEACH, campTeachChips); the next chips are one more row each.
//   A. the chip: not before 5 s, lit from 5 s in 1.1 only, at the left end of the row, its key the key table's, its words two or three; gone when the cruiser's list has been opened; gone after 120 s
//   C. (card space-game-chunk13-teach-space-c) Space and C at the first hostiles: the row's own chips lit where they stand with a note, quiet once used, 45 s, C only with the cockpit switch on
//   D. (card space-game-chunk14-teach-e-enter) E and Enter at the 1.1 miner's call: E added lit "then 2: the miner", Enter lit "send a pilot" once it reads Guard (the miner picked), quiet once the friends' list is opened / an order is given, 90 s, gone when the call is over
//   B. the rest: the row is as it was before 5 s and in 1.2 and 1.3; the hints switch turns the row (and the chip) off; the sim remembers the lists opened; no letter is written in the file
// Run: node tests/campteach.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`window.__mk = (mi, sec) => { const C = window.C = campNew(1, [], { seed: 1, mission: mi || 0 }); C.arrivedAt = 0; C.t = (sec == null ? 6 : sec) * 1000; return C; };`);

console.log('A. the chip');
{
  g.run(`__mk(0, 4);`);
  check('not before 5 s: no teaching chip, and the row has its own chips', J('campTeachChips(C).length') === 0 && J('campPageHudFirst(C).items.every(i => !i.lit)'));
  g.run(`__mk(0, 5.5);`);
  const c = J('campTeachChips(C)');
  check('at 5.5 s in 1.1 one chip: the key table\'s key for the cruiser\'s list (Q), the word Cruiser, the note "then 1: stay with her", lit', c.length === 1 && c[0].key === J('campKeyOpens("cruiser")') && c[0].key === 'Q' && c[0].word === 'Cruiser' && c[0].note === 'then 1: stay with her' && c[0].lit === true, JSON.stringify(c));
  const row = J('campPageHudFirst(C).items.map(i => i.id + (i.lit ? "*" : ""))');
  check('it is the first chip of the row, lit, and the row\'s own chips follow it unchanged (fly, fire, boost, missile)', row[0] === 'q*' && row.slice(1, 5).join() === 'fly,fire,boost,missile', row.join());
  g.run(`campPanelGo({ open: null, at: 0, top: 0, pick: null, trail: [] }, C, 'cruiser');`);
  check('once Q has been pressed (the cruiser\'s list opened) it goes quiet: no chip, the row as it was', J('campTeachChips(C).length') === 0 && J('C.keysUsed.cruiser') === true && J('campPageHudFirst(C).items.every(i => !i.lit)'));
  g.run(`__mk(0, 5.5); campPanelGo({ open: null, at: 0, top: 0, pick: null, trail: [] }, C, 'fleet');`);
  check('opening another list (W) does not quiet it: only Q does', J('campTeachChips(C).length') === 1);
  g.run(`__mk(0, 121);`);
  check('it does not outlast its moment: gone after 120 s', J('campTeachChips(C).length') === 0);
}

console.log('B. the rest');
{
  check('mission 1.2 and 1.3 have none: it is for 1.1', [1, 2].every(m => { g.run(`__mk(${m}, 6);`); return J('campTeachChips(C).length') === 0; }));
  g.run(`__mk(0, 6);`);
  check('with the hints off the key row is gone, the chip with it', J('(() => { CAMP.flags.hints = false; try { return campPageHudFirst(C) === null; } finally { CAMP.flags.hints = true; } })()'));
  check('a mission that has ended shows none', J('(() => { C.result = "won"; try { return campTeachChips(C).length === 0; } finally { C.result = null; } })()'));
  const src = readFileSync(join(ROOT, 'src/campteach.js'), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
  check('no key is written in the file: no quoted capital letter (the cap is the key table\'s), and the words are content keys', !/'[A-Z]'/.test(src) && /camp\.corner\.chip\.teachq/.test(src));
  check('the two new words are in the table and the voice pack says they are shown, never said', J("uiText('camp.corner.chip.cruiser')") === 'Cruiser' && J("uiText('camp.corner.chip.teachq')") === 'then 1: stay with her' && J("VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.teachq') && r.why && !r.spoken)") === true);
}

console.log('C. Space and C at the first hostiles (card space-game-chunk13-teach-space-c)');
{
  g.run(`window.__host = () => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; C.t = 10000; C.ships = C.ships.filter(u => u.team === 'earth'); window.__a = campSpawn(C, 'skiff', C.carrier.x + 700, C.carrier.y); __a.team = 'alien'; __a.hold = true; return C; };`);
  g.run(`__mk(1, 6);`);
  check('with no hostile in sight nothing is lit: the row\'s own chips, none with a note', J('Object.keys(campTeachLights(C)).length') === 0 && J('campPageHudFirst(C).items.every(i => !i.lit && !i.note)'));
  g.run(`__host(); CAMP.flags.cockpit = true;`);
  const seen = J('campSightGroups(C, true).length') > 0;
  const L = J('campTeachLights(C)');
  check('at the first hostile seen Space is lit "hold to fire" and C "take a fighter" (the cockpit switch on)', seen && L.fire === 'hold to fire' && L.cockpit === 'take a fighter', JSON.stringify([seen, L]));
  const row = J('campPageHudFirst(C).items.filter(i => i.lit && i.id !== "q").map(i => i.id + ":" + i.key + ":" + i.note)');
  check('they are lit WHERE THEY STAND in the row (the Space chip and the C chip, with the key table\'s caps), the others unchanged', row.join('|') === 'fire:Space:hold to fire|cockpit:C:take a fighter', row.join('|'));
  g.run(`CAMP.flags.cockpit = false;`);
  check('with the cockpit switch off C is not in the row and is not lit; Space still is', J('campPageHudFirst(C).items.filter(i => i.lit && i.id !== "q").map(i => i.id).join()') === 'fire');
  g.run(`CAMP.flags.cockpit = true; C.keysUsed = { fire: true };`);
  check('once Space has been held its chip goes quiet; C stays lit', J('campPageHudFirst(C).items.filter(i => i.lit && i.id !== "q").map(i => i.id).join()') === 'cockpit');
  g.run(`C.cockpitTaken = true;`);
  check('and once the stick has been taken C goes quiet too', J('campPageHudFirst(C).items.filter(i => i.lit && i.id !== "q").length') === 0);
  g.run(`__host(); CAMP.flags.cockpit = true; campTeachLights(C); C.t += 46000;`);
  check('it lasts 45 s from the first hostile seen, then the row is as it was', J('Object.keys(campTeachLights(C)).length') === 0);
  g.run(`__host(); C.input.fire = true; campTick(C, 1 / 30); C.input.fire = false;`);
  check('the sim notes that Space was held (C.keysUsed.fire), from the cruiser\'s input', J('!!(C.keysUsed && C.keysUsed.fire)') === true);
  g.run(`__mk(0, 6); C.input.fire = false; campTick(C, 1 / 30);`);
  check('and a tick with Space up notes nothing', J('!!(C.keysUsed && C.keysUsed.fire)') === false);
  g.run(`CAMP.flags.cockpit = false;`);
  check('the two new words are in the table, shown never said', J("uiText('camp.corner.chip.teachfire')") === 'hold to fire' && J("uiText('camp.corner.chip.teachc')") === 'take a fighter' && J("VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.teachc') && r.why && !r.spoken)") === true);
}

console.log('D. E and Enter at the miner\'s call (card space-game-chunk14-teach-e-enter)');
{
  g.run(`window.__call = (sec) => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; C.t = (sec == null ? 100 : sec) * 1000; C.ships = C.ships.filter(u => u.team === 'earth' || u.tid === 'dm'); C.waves[0].started = true; window.__p = campSpawn(C, 'skiff', C.carrier.x + 900, C.carrier.y); __p.team = 'alien'; __p.wave = 0; __p.hold = true; return C; };`);
  g.run(`__mk(0, 100);`);
  check('before the call (the distress wave not started) nothing of the call is taught', J('campMinerCall(C)') === null && J('campTeachChips(C).every(c => c.id !== "e")') && J('Object.keys(campTeachLights(C)).indexOf("enter") < 0'));
  g.run(`__call(100);`);
  check('at the call the miner is the one whose call is live', J('!!campMinerCall(C) && campMinerCall(C).tid') === 'dm');
  const e = J('campTeachChips(C).find(c => c.id === "e")');
  check('the E chip is added, lit: the key table\'s key for the friends\' list, the word Friendly, the note "then 2: the miner"', !!e && e.key === J('campKeyOpens("friends")') && e.key === 'E' && e.word === 'Friendly' && e.note === 'then 2: the miner' && e.lit === true, JSON.stringify(e));
  const en = J('campPageHudFirst(C).items.filter(i => i.id === "enter").map(i => (i.lit ? "lit " : "") + i.word + (i.note ? " [" + i.note + "]" : ""))');
  check('the Enter chip reads Form up until something is picked: it is NOT lit then (the note would contradict the word)', en.length === 1 && en[0] === 'Form up', JSON.stringify(en));
  g.run(`window.__was = campPageHudEnterNow; campPageHudEnterNow = () => ({ key: 'Enter', word: 'Guard', verb: 'guard' });`);
  const picked = J('campPageHudFirst(C).items.filter(i => i.id === "enter").map(i => (i.lit ? "lit " : "") + i.word + " [" + i.note + "]")');
  check('once the miner is picked (Enter reads Guard) the chip is lit with "send a pilot": E, then 2, then Enter, in the order the key row shows them', picked.length === 1 && picked[0] === 'lit Guard [send a pilot]', JSON.stringify(picked));
  g.run(`campPanelGo({ open: null, at: 0, top: 0, pick: null, trail: [] }, C, 'friends');`);
  check('opening the friends\' list (E) quiets the E chip; Enter stays lit (it reads Guard)', J('campTeachChips(C).every(c => c.id !== "e")') && J('Object.keys(campTeachLights(C)).indexOf("enter") >= 0'));
  g.run(`C.orders.guard++;`);
  check('an order given (Enter) quiets the Enter chip', J('Object.keys(campTeachLights(C)).indexOf("enter") < 0') && J('campPageHudFirst(C).items.every(i => !(i.id === "enter" && i.lit))'));
  g.run(`campPageHudEnterNow = __was;`);
  g.run(`__call(100); campTeachChips(C); campPageHudFirst(C); C.t += 91000;`);
  check('it lasts 90 s from the call', J('campTeachChips(C).every(c => c.id !== "e")') && J('Object.keys(campTeachLights(C)).indexOf("enter") < 0'));
  g.run(`__call(100); campTeachChips(C); __p.hp = 0;`);
  check('and ends with the call: the pirates dead, no chip and no light', J('campMinerCall(C)') === null && J('campTeachChips(C).every(c => c.id !== "e")') && J('Object.keys(campTeachLights(C)).indexOf("enter") < 0'));
  check('the miner\'s price rule did not change: campMinerAway is as it was (the same call, the pilots away)', J(`(() => { __call(100); const f = campWing(C).filter(u => u.pilot)[0]; const m = campMinerCall(C); f.x = m.x + 100; f.y = m.y; return campMinerAway(C).length; })()`) === 1);
  check('the three new words are in the table, shown never said', J("uiText('camp.corner.chip.friendly')") === 'Friendly' && J("uiText('camp.corner.chip.teache')") === 'then 2: the miner' && J("uiText('camp.corner.chip.teachenter')") === 'send a pilot' && ['friendly', 'teache', 'teachenter'].every(k => J(`VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.${k}') && r.why && !r.spoken)`) === true));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('TEACH FAIL (' + failed + ')'); process.exit(1); } else console.log('TEACH PASS');
