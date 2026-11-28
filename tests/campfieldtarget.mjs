// smoke: a rock field is an E target and Enter sends the pilots to MINE it (card space-game-orders-f3-enter-fits; Troy, 27 Nov 2026, mock F: "a rock field is just another E target"; no W4, the pilots are the miners): the numbers, the pick, Enter, the words, the details (plain Node, no Chrome)
// src/camptarget.js: campFriRegister gives the rock fields the numbers AFTER every ship (E1, E2 stay the ships; 1.1's miner, which joins at a cue, keeps the number reserved for it), campFriNumbered / campFriJump / campFriNow carry a field (place-like: kind 'post', field true, rock = the nearest rock),
// campSelOrder 'engage' with a field held is 'mine' (campWingOrder 'mine' at the field's rock); the sentence line and the tip (src/camporderline.js), the E rows (src/camptcorner.js) and the target box (src/camptdisp.js) know a field.
//   A  the numbers: 1.2 has the miners 1 and 2 and the four fields 3 to 6; 2.1 has the fields 1 and 2; fields keep their own number order; a number is kept for the mission, a field with no rock left is dark
//   B  the pick: E then its digit (the real keys) holds the field, the enemy is let go; a dark field does nothing and says so; a held field whose rocks are gone is let go
//   C  Enter: the picked pilot (or All pilots) goes to mine the field's nearest rock; the dry run says mine; nothing else changes (a hostile attacks, a friendly is guarded, nothing is form up)
//   D  the words: the sentence line "Wedge  mine  Rock field 1", the tip at the field's middle, the E rows ("10 rocks", no hull bar), the target box ("Rock field"), and the bottom row's Enter word Do it
//   E  a ship that joins at a cue keeps its number: 1.1's miner is E2 whether or not a rock field was seen first
// Run: node tests/campfieldtarget.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`window.__mk = (level, mission) => { const C = window.C = campNew(level, [], { seed: 3, mission }); C.arrivedAt = 0; for (let i = 0; i < 120; i++) campStep(C, 1 / 30); C.events.length = 0; return C; };
  window.__nums = () => campFriNumbered(C).map(e => e.number + ':' + e.name + (e.alive ? '' : '(dark)') + (e.field ? '*' : ''));`);

console.log('A. the numbers');
{
  g.run(`__mk(1, 1);`);
  check('1.2: the four rock fields are E1 to E4 (marked *), then the miners E5 and E6 (ore is the goal there: card space-game-b14-c14-15-e-pick; tests/campepick.mjs)', J('__nums()').join() === '1:Rock field 1*,2:Rock field 2*,3:Rock field 3*,4:Rock field 4*,5:Miner 1,6:Miner 2', J('__nums()').join());
  g.run(`__mk(2, 0);`);
  check('2.1 has no ship to protect: your cruiser is E1 (card space-game-e-row-cruiser-first), then the fields E2 and E3, in their own order (Rock field 1 first, though Rock field 2 is nearer)', J('__nums()').join() === '1:Cruiser,2:Rock field 1*,3:Rock field 2*', J('__nums()').join());
  g.run(`__mk(1, 1); window.__f0 = campFriNumbered(C).find(e => e.field && e.id === 'field-0'); C.rocks.filter(r => r.field === 0).forEach(r => { r.hp = 0; }); for (let i = 0; i < 3; i++) campStep(C, 1 / 30);`);
  check('a field with no rock left is dark, and keeps its number (the others do not move)', J('campFriNumbered(C).find(e => e.id === "field-0").alive') === false && J('campFriNumbered(C).find(e => e.id === "field-0").number') === J('__f0.number') && J('campFriNumbered(C).find(e => e.id === "field-1").number') === J('__f0.number') + 1);
  check('E steps through the live ones only (the dark field is passed)', (g.run(`C.fsel = ''; campFriStep(C, 1); campFriStep(C, 1); campFriStep(C, 1);`), J('C.fsel')) === 'field-1' || J('C.fsel') !== 'field-0');
}

console.log('B. the pick');
{
  g.run(`__mk(1, 1); window.P = campPanelNew(); window.__tgt = campSpawn(C, 'raider', C.carrier.x + 600, C.carrier.y); __tgt.hold = true; campTgtHold(C, __tgt.id);`);
  g.run(`campPanelKey(P, C, 'KeyE', 1000); window.__r = campPanelKey(P, C, 'Digit1', 1100);`);
  check('E then 1 (the real keys) holds Rock field 1 and lets the enemy go (one target)', J('C.fsel') === 'field-0' && J('C.tgt') === '' && J('__r.ok') === true, J('[C.fsel, C.tgt, __r]'));
  const h = J('campHeldNow(C)');
  check('the one target held is a friendly with a place-like entry (post, field): its name is Rock field 1', h && h.kind === 'friendly' && h.name === 'Rock field 1' && !!h.post && h.post.field === true && h.unit === null, JSON.stringify(h));
  g.run(`C.rocks.filter(r => r.field === 0).forEach(r => { r.hp = 0; });`);
  check('a held field whose rocks are all gone is let go the next time anyone asks', J('campHeldNow(C)') === null && J('C.fsel') === '');
  g.run(`window.P = campPanelNew(); campPanelKey(P, C, 'KeyE', 1200); window.__fs = C.fsel; window.__r = campPanelKey(P, C, 'Digit1', 1300);`);
  check('E then the dark number does nothing and says so: the pick is what the E tap left, and the answer is a refusal', J('__r.ok') === false && J('C.fsel') === J('__fs') && J('C.fsel') !== 'field-0', J('[__r.ok, __r.say, C.fsel, __fs]'));
}

console.log('C. Enter');
{
  g.run(`__mk(1, 1); C.fsel = 'field-0'; campSelPick(C, 'pilot:red', 'key');`);
  const dry = J(`campSelOrder(C, 'engage', 'key', true)`);
  check('the dry run of Enter says mine (ok, not form up)', dry.ok === true && dry.verb === 'mine' && dry.formup === false, JSON.stringify(dry));
  g.run(`window.__fl = campPickFields(C).find(f => f.id === 'field-0'); window.__r = campSelOrder(C, 'engage', 'key');`);
  const ord = J(`C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter').map(u => u.squad + ':' + (u.order && u.order.type) + ':' + (u.order && u.order.target))`);
  check('Enter: Wedge (the pick) mines the field\'s nearest rock; the other two pilots keep what they had (guarding)', J('__r.ok') === true && ord.includes('red:mine:' + J('__fl.rock')) && ord.filter(x => /^(green|yellow):guard/.test(x)).length === 2, JSON.stringify([ord, J('__r.say')]));
  g.run(`__mk(1, 1); C.fsel = 'field-1'; campSelPick(C, 'all', 'key'); campSelOrder(C, 'engage', 'key');`);
  const all = J(`C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter').map(u => (u.order && u.order.type))`);
  check('with All pilots (the default) all three go to mine', all.length === 3 && all.every(t => t === 'mine'), JSON.stringify(all));
  g.run(`__mk(1, 1); window.__tgt = campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); campTgtHold(C, __tgt.id);`);
  check('a hostile held: Enter still attacks it; a friendly (a miner): still guards it; nothing: still forms up', J(`campSelOrder(C, 'engage', 'key', true).verb`) === 'attack' && (g.run(`campTgtClear(C); C.fsel = campFriNumbered(C).find(e => !e.field).id;`), J(`campSelOrder(C, 'engage', 'key', true).verb`)) === 'guard' && (g.run(`C.fsel = '';`), J(`campSelOrder(C, 'engage', 'key', true).formup`)) === true);
  g.run(`__mk(1, 1); C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter').forEach(u => { u.hp = 0; u.gone = true; }); C.ships = C.ships.filter(u => u.hp > 0); C.bay.fighters = 0; C.launchQ = []; C.fsel = 'field-0';`);
  check('no pilot to send: the Enter is refused in the game\'s own words (ok false)', J(`campSelOrder(C, 'engage', 'key', true).ok`) === false);
}

console.log('D. the words');
{
  g.run(`__mk(1, 1); C.fsel = 'field-0'; campSelPick(C, 'pilot:red', 'key');`);
  const L = J('campOrderLine(C)');
  check('the sentence line: "Wedge  mine  Rock field 1" (the mock\'s "Miners mine Ceres", with the pilots as the miners); the target is a field', L && L.who.t === 'Wedge' && L.verb.t === 'mine' && L.verb.kind === 'mine' && L.target.t === 'Rock field 1' && L.target.kind === 'field' && L.ok === true, JSON.stringify(L));
  check('the tip is for the field: text "Wedge will mine", at its middle with its size (no ship id to look up)', L.tip.text === 'Wedge will mine' && L.tip.id === 'field-0' && L.tip.at && L.tip.at.r > 0 && Math.abs(L.tip.at.x - J('campPickFields(C).find(f => f.id === "field-0").x')) < 1e-6, JSON.stringify(L.tip));
  g.run(`window.__tipScene = () => { const t = { visible: false, active: true, scene: true, text: '', alpha: 1, x: 0, y: 0, sc: 1, setOrigin() { return t; }, setDepth() { return t; }, setText(s) { t.text = s; return t; }, setScale(k) { t.sc = k; return t; }, setAlpha(a) { t.alpha = a; return t; }, setPosition(x, y) { t.x = x; t.y = y; return t; }, setVisible(v) { t.visible = v; return t; } }; const sc = { camp: C, cameras: { main: { zoom: 1 } }, hud: {}, mode: 'play', mp: null, add: { text() { return t; } } }; window.__tip = t; return sc; }; campOrderLineTipSync(__tipScene());`);
  check('the scene puts the tip over the field: "Wedge will mine", above the middle of it', J('__tip.visible') === true && J('__tip.text') === 'Wedge will mine' && J('__tip.y') < J('campPickFields(C).find(f => f.id === "field-0").y') && Math.abs(J('__tip.x') - J('campPickFields(C).find(f => f.id === "field-0").x')) < 1e-6, J('[__tip.text, __tip.x, __tip.y]'));
  check('the field\'s ring in the left panel is the ore colour, the ships\' are not', J(`campPageHudShips(C).filter(r => r.color === 'ore').length`) === J('campFriNumbered(C).filter(e => e.field).length') && J(`campPageHudShips(C).filter(r => r.color !== 'ore').length`) === 2);
  check('the tip sits just above the field\'s middle, not a field radius away (a field is hundreds of px across)', J('(() => { const f = campPickFields(C).find(x => x.id === "field-0"); return campOrderLineTipSync(__tipScene()), Math.abs(f.y - __tip.y) < 60; })()') === true, J('__tip.y'));
  const rows = J('campFriRows(C)');
  const fr = rows.find(r => r.name === 'Rock field 1');
  check('the E rows: the ships have their hull bars, the field says its rocks ("10 rocks") and has no bar (share 0), lit when it is the pick', fr && fr.num === '10 rocks' && fr.share === 0 && fr.sel === true && rows.some(r => /Miner/.test(r.name) && /\/ /.test(r.num)), JSON.stringify(rows.map(r => [r.name, r.num, r.sel])));
  const sub = J('(() => { const s = campTdispSubject(C, null, 0); return s && { name: s.post.name, side: s.side, held: s.held }; })()');
  check('the target box has the field: its name, on the friends\' side, held', sub && sub.name === 'Rock field 1' && sub.side === 'friend' && sub.held === true, JSON.stringify(sub));
  check('and says what it is: the post info type is "Rock field", an outpost\'s is not', J('campTdispPostInfo(C, campFriNow(C)).type') === 'Rock field' && J('uiText("camp.tdisp.type.post")') !== 'Rock field');
  check('the bottom row\'s Enter chip says Do it and carries the verb mine; the left panel\'s Enter is not for a field (it is for attack and guard)', J('campPageHudFirst(C).items.find(i => i.id === "enter").word') === 'Do it' && J('campPageHudFirst(C).items.find(i => i.id === "enter").verb') === 'mine' && J("campPageHudEnter(C, 'guard')") === null);
  check('the one word the field adds to the corner is Mine (camp.corner.enter.mine)', J("uiText('camp.corner.enter.mine')") === 'Mine');
}

console.log('E. a ship that joins at a cue keeps its number');
{
  g.run(`window.C = campNew(1, [], { seed: 3, mission: 0 }); C.arrivedAt = 0; C.rocks.push({ id: 'rock-t1', x: C.carrier.x + 900, y: C.carrier.y + 400, r: 30, hp: 100, maxHp: 100, field: 0 }); for (let i = 0; i < 90; i++) campStep(C, 1 / 30);`);
  const before = J('campFriNumbered(C).map(e => e.number + ":" + e.name + (e.field ? "*" : ""))');
  g.run(`C.cues = C.cues || {}; C.cues.distress = C.t; for (let i = 0; i < 60; i++) campStep(C, 1 / 30);`);
  const after = J('campFriNumbered(C).map(e => e.number + ":" + e.name + (e.field ? "*" : ""))');
  check('1.1 with a field in sight at the start: the Transport is E1, the miner (which joins when he calls for help) has E2 reserved, and the field takes E3, before and after the cue', after.join() === '1:Transport,2:Miner,3:Rock field 1*' && before.filter(x => !/Miner|Transport/.test(x)).join() === '3:Rock field 1*', JSON.stringify([before, after]));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('FIELD TARGET FAIL (' + failed + ')'); process.exit(1); } else console.log('FIELD TARGET PASS');
