// smoke: the bottom key row teaches: at 5 s into mission 1.1 the Q chip lights with "then 1: stay with her" at the left end of the row, and goes quiet once Q has been pressed (plain Node, no Chrome)
// Card space-game-chunk12-teach-q (Troy, 26 Nov 2026; brief 8 proposal E, decision 5, first chip only). src/campteach.js is the mechanism (CAMP_TEACH, campTeachChips); the next chips are one more row each.
//   A. the chip: not before 5 s, lit from 5 s in 1.1 only, at the left end of the row, its key the key table's, its words two or three; gone when the cruiser's list has been opened; gone after 120 s
//   C. (card space-game-chunk13-teach-space-c) Space and C at the first hostiles: the row's own chips lit where they stand with a note, quiet once used, 45 s, C only with the cockpit switch on
//   D. (card space-game-chunk14-teach-e-enter) E and Enter at the 1.1 miner's call: E added lit "then 2: the miner", Enter lit "send a pilot" once it reads Guard (the miner picked), quiet once the friends' list is opened / an order is given, 90 s, gone when the call is over
//   E. (card space-game-b10-c7-teach-shift) Shift when the ship you escort is more than 150 km off: the boost chip lit "catch up" (1.1: about 30 s after she leaves), quiet once Shift is held or you are beside her, 120 s
//   F. (card space-game-b10-c8-teach-z) Z when a torpedo boat or the pirate leader is inside missile range (2400 px) and there is a missile: the missile chip lit "in range", quiet once a missile is fired, 90 s
//   G. (card space-game-b10-c9-teach-r) R when the missile rack is empty for the first time: the R chip is added to the row, lit "rack is empty", quiet once R is pressed, 60 s
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

console.log('E. Shift when the ship you escort is far ahead (card space-game-b10-c7-teach-shift; the cloud\'s BRIEF 10 chunk 7: start 1.1, do nothing for 40 s, the Shift chip lights "catch up")');
{
  g.run(`window.__idle = (sec) => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; while (C.t < sec * 1000) campTick(C, 0.1); return C; };`);
  const boostLit = () => J('campPageHudFirst(C).items.filter(i => i.lit && i.id === "boost").map(i => i.key + ":" + i.word + ":" + i.note)');
  g.run(`__idle(20);`);
  check('at 20 s (the transport left at 5 s and is about 90 km off) Shift is not lit: she is inside 150 km', J('campTeachLights(C).boost') === null && J('Math.round(campDist(campConvoys(C)[0], C.carrier) / 10) < 150') === true);
  g.run(`__idle(40);`);
  const far = J('Math.round(campDist(campConvoys(C)[0], C.carrier) / 10)');
  check('THE PAGE\'S TEST: start 1.1, do nothing for 40 s, and she is more than 150 km off', far > 150, far);
  check('and the Shift chip, where it stands in the row, is lit "catch up" (key from the table)', boostLit().join() === 'Shift:Boost:catch up', boostLit().join());
  check('the row\'s own chips keep their order, and only boost is lit among fly, boost and missile', J('campPageHudFirst(C).items.filter(i => ["fly", "boost", "missile"].indexOf(i.id) >= 0).map(i => i.id + (i.lit ? "*" : "")).join()') === 'fly,boost*,missile', J('campPageHudFirst(C).items.map(i => i.id + (i.lit ? "*" : "")).join()'));
  g.run(`C.input.boost = true; campTick(C, 0.1); C.input.boost = false;`);
  check('Shift held once (the cruiser\'s input) notes it (C.keysUsed.boost) and the chip goes quiet', J('C.keysUsed.boost') === true && boostLit().length === 0);
  g.run(`__idle(40); C.cockpit = { input: { boost: true } }; campTick(C, 0.1); C.cockpit = null;`);
  check('the flown fighter\'s Shift counts too', J('C.keysUsed.boost') === true);
  g.run(`__idle(40); campTeachLights(C); C.carrier.x += 1000; C.carrier.y += 1000; `);
  check('it goes dark when you have caught up: the ship you escort inside 150 km again (the chip is lit only while she is far)', J('campTeachLights(C).boost') === null);
  g.run(`__idle(40); campTeachLights(C); C.carrier.x = campConvoys(C)[0].x; C.carrier.y = campConvoys(C)[0].y;`);
  check('flying up beside her: no light', J('campTeachLights(C).boost') === null);
  g.run(`__idle(40); campTeachLights(C); C.t += 121000;`);
  check('it ends 120 s after the first time she was far, even if she still is', J('campTeachLights(C).boost') === null);
  g.run(`__idle(40); CAMP.boost.on = false;`);
  check('with the boost switched off there is nothing to teach: no light', J('campTeachLights(C).boost') === null);
  g.run(`CAMP.boost.on = true; __idle(40); C.ships = C.ships.filter(u => u.kind !== 'freighter');`);
  check('with no ship to escort (none alive) nothing is lit', J('campTeachLights(C).boost') === null);
  g.run(`__idle(40); C.result = 'won';`);
  check('a mission that has ended lights nothing; the hints off turns the whole row off', J('campTeachLights(C).boost') === null && J('(() => { C.result = null; CAMP.flags.hints = false; try { return campPageHudFirst(C) === null; } finally { CAMP.flags.hints = true; } })()'));
  check('the note is a content key, shown never said (no letter is written for the key: the chip is the row\'s own)', J("uiText('camp.corner.chip.teachboost')") === 'catch up' && J("VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.teachboost') && r.why && !r.spoken)") === true);
  check('the sim\'s own rules are as they were: the transport\'s road does not change because a chip is lit (same position at 40 s with and without asking)', J(`(() => { const a = (__idle(40), Math.round(campConvoys(C)[0].x)); const b = (__idle(40), campTeachLights(C), campPageHudFirst(C), Math.round(campConvoys(C)[0].x)); return a === b; })()`) === true);
}

console.log('F. Z when a torpedo boat or the pirate leader is in missile range (card space-game-b10-c8-teach-z; the cloud\'s BRIEF 10 chunk 8)');
{
  g.run(`window.__big = (kind, d, sec) => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; C.t = (sec == null ? 10 : sec) * 1000; C.ships = C.ships.filter(u => u.team === 'earth'); window.__b = campSpawn(C, kind, C.carrier.x + d, C.carrier.y); __b.team = 'alien'; __b.hold = true; return C; };`);
  const zLit = () => J('campPageHudFirst(C).items.filter(i => i.lit && i.id === "missile").map(i => i.key + ":" + i.word + ":" + i.note)');
  g.run(`__big('skiff', 800);`);
  check('a skiff in range is not a moment for Z: nothing is lit (only a torpedo boat or the leader)', zLit().length === 0 && J('campTeachLights(C).missile') === null);
  g.run(`__big('tboat', 2000);`);
  check('a torpedo boat inside the missile lock range (2400 px) lights the Z chip where it stands, "in range" (key from the table)', J('!!__b.boat') && zLit().join() === 'Z:Missile:in range', zLit().join());
  g.run(`__big('tboat', 2600);`);
  check('the same boat just outside the lock range lights nothing', zLit().length === 0);
  g.run(`__big('pirateleader', 1500);`);
  check('the pirate leader in range lights it too', J('__b.kind') === 'pirateleader' && zLit().join() === 'Z:Missile:in range', zLit().join());
  g.run(`__big('tboat', 2000); C.missiles = 0;`);
  check('with the rack empty there is nothing to fire: no light (R is the key to teach then)', zLit().length === 0);
  g.run(`__big('tboat', 2000); campTeachLights(C); C.keysUsed = {}; campFire(C, __b);`);
  check('a missile fired (campFire: Z, the order, a click) notes it (C.keysUsed.missile) and the chip goes quiet', J('C.keysUsed.missile') === true && zLit().length === 0);
  g.run(`__big('tboat', 2000); campTeachLights(C); __b.x = C.carrier.x + 3000;`);
  check('lit only while one is in range: out of range again, the light goes (and it does not need the ship to be picked)', zLit().length === 0);
  g.run(`__big('tboat', 2000); campTeachLights(C); C.t += 91000;`);
  check('it ends 90 s after the first time, even if the boat is still there', zLit().length === 0);
  g.run(`__big('tboat', 2000); C.cockpit = null; CAMP.flags.hints = false;`);
  check('with the hints off the row is gone, the light with it', J('campPageHudFirst(C) === null') === true);
  g.run(`CAMP.flags.hints = true; __big('tboat', 2000); C.result = 'won';`);
  check('a mission that has ended lights nothing', J('campTeachLights(C).missile') === null);
  // THE PAGE'S TEST, as it works: stay with the transport (idle, the boats come for her and are 700 km from the cruiser, out of range)
  g.run(`window.__stay = (stay) => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; window.__first = null; window.__wasTb = -1; while (C.t < 130000) { campTick(C, 0.1); const f = campConvoys(C)[0]; if (stay && f && C.t > 6000) { C.carrier.x = f.x - 150; C.carrier.y = f.y; } if (__first === null && campTeachLights(C).missile) __first = Math.round(C.t / 1000); } return C; };`);
  g.run(`__stay(true);`);
  const t1 = J('__first');
  check('THE PAGE\'S TEST, corrected: start 1.1 and STAY WITH THE TRANSPORT; the boats come at about 1 min 45 s (106 s) and the Z chip lights "in range"', t1 !== null && t1 >= 100 && t1 <= 112, t1);
  g.run(`__stay(false);`);
  check('(the page says "wait for the boats": with the cruiser left idle they come for the transport, 700 km off, and Z is not lit: the page\'s test needs you beside her)', J('__first') === null, J('__first'));
  check('the new word is in the table, shown never said', J("uiText('camp.corner.chip.teachmissile')") === 'in range' && J("VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.teachmissile') && r.why && !r.spoken)") === true);
}

console.log('G. R when the missile rack is empty for the first time (card space-game-b10-c9-teach-r; the cloud\'s BRIEF 10 chunk 9)');
{
  g.run(`window.__rack = (n) => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; C.t = 10000; C.missiles = n; return C; };`);
  const rLit = () => J('campTeachChips(C).filter(c => c.id === "r").map(c => c.key + ":" + c.word + ":" + c.note + ":" + c.lit)');
  g.run(`__rack(2);`);
  check('with missiles left there is nothing to teach: no R chip, the row as it was', rLit().length === 0 && J('campPageHudFirst(C).items.map(i => i.id).filter(x => ["fly", "fire", "boost", "missile"].indexOf(x) >= 0).join()') === 'fly,fire,boost,missile' && J('campPageHudFirst(C).items.every(i => i.id !== "r")'));
  g.run(`__rack(0);`);
  check('the first time the rack is empty the R chip is ADDED to the row, lit, with the key table\'s key (R), the word Reload and the note "rack is empty"', rLit().join() === 'R:Reload:rack is empty:true', rLit().join());
  check('it is among the added chips at the left end of the row (after Q\'s, which is up at 10 s in 1.1), before the row\'s own chips, which are unchanged', J('campPageHudFirst(C).items.map(i => i.id + (i.lit ? "*" : "")).filter(x => x !== "enter").join()') === 'q*,r*,fly,fire,boost,missile'); // (Q's chip is there at 10 s in 1.1; the added chips come before the row's own, in the order of the table)
  g.run(`__rack(0); campTeachChips(C); C.missiles = 3;`);
  check('it is lit while the rack is not full and goes with the rack full (loot or a build): here 3 of 6 it still is', rLit().length === 1);
  g.run(`C.missiles = C.magazine;`);
  check('the rack full again: no chip', rLit().length === 0);
  g.run(`__rack(0); campTeachChips(C); C.t += 61000;`);
  check('it ends 60 s after the first time, even if the rack is still empty', rLit().length === 0);
  g.run(`__rack(0); campOrder(C, 'reload', '', 'key');`);
  check('R pressed (a refusal for ore counts too: campReloadDo, the key or the Q list\'s row) notes it (C.keysUsed.reload) and the chip goes quiet', J('C.keysUsed.reload') === true && rLit().length === 0);
  g.run(`__rack(0); campReloadDo(C, true);`);
  check('a dry run (the Q list asking whether the row can run) is not a press: the chip stays', J('!!(C.keysUsed && C.keysUsed.reload)') === false && rLit().length === 1);
  g.run(`__rack(0); CAMP.flags.hints = false;`);
  check('the hints off: the row is gone, the chip with it', J('campPageHudFirst(C) === null') === true);
  g.run(`CAMP.flags.hints = true; __rack(0); C.result = 'won';`);
  check('a mission that has ended lights nothing', rLit().length === 0);
  // THE PAGE'S TEST: start 1.1, press Z six times at anything: works from the first skiffs (about 38 s: nothing is in range before), one press every 0.8 s (the launcher cycles in 0.7 s)
  g.run(`window.__six = (from) => { const C = window.C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; window.P = campPanelNew(); window.__n = 0; for (let t = 0; t < 12 && C.missiles > 0; t++) { while (C.t < (from + t * 0.8) * 1000) campTick(C, 0.1); const m0 = C.missiles; campPanelKey(P, C, 'KeyZ', C.t); if (C.missiles < m0) __n++; } return C; };`);
  g.run(`__six(1);`);
  check('THE PAGE\'S TEST, as it works: pressing Z at the very start does nothing (no hostile in range: "No big ship in missile range"), so no chip', J('__n') === 0 && J('C.missiles') === J('C.magazine') && rLit().length === 0);
  g.run(`__six(38);`);
  check('pressing Z at the first skiffs (from about 38 s), six times, 0.8 s apart: the rack is empty and the R chip is lit "rack is empty"', J('C.missiles') === 0 && J('__n') === 6 && rLit().join() === 'R:Reload:rack is empty:true', J('[C.missiles, __n]') + ' ' + rLit().join());
  check('the new words are in the table, shown never said', J("uiText('camp.corner.chip.reload')") === 'Reload' && J("uiText('camp.corner.chip.teachr')") === 'rack is empty' && ['reload', 'teachr'].every(k => J(`VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.chip.${k}') && r.why && !r.spoken)`) === true));
  check('no key is written for R: the cap is the key table\'s (campCornerCap)', !/'R'/.test(readFileSync(join(ROOT, 'src/campteach.js'), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '')));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('TEACH FAIL (' + failed + ')'); process.exit(1); } else console.log('TEACH PASS');
