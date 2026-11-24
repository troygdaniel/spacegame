// smoke: the two target corners: [ ] HOSTILES top right and O P FRIENDLIES bottom right (the rule: which corner holds the one target, the name beside the title, NO HOSTILES and NO FRIENDLIES when empty)
// Card space-game-layout-targets (Troy, 24 Nov 2026: four corners, each a small title that never leaves, starting with its keys as plain key-cap chips; the selection is written beside the title and never fades;
// still ONE target held at a time). src/camptdisp.js campCornerInfo is the rule (no Phaser); the drawing is src/camptdispscene.js on the corner panel; the words are camp.tdisp.corner.* (content/text/camptdisp.md).
//   A. the titles and the chips: from the key table; HOSTILES and FRIENDLIES while there is something to pick
//   B. an enemy held: its name is beside HOSTILES, FRIENDLIES has no name, and the details (the subject) are in HOSTILES alone
//   C. a friendly held (a ship, then a map-clicked outpost): its name is beside FRIENDLIES, HOSTILES has none, and the details are in FRIENDLIES alone
//   D. empty: NO HOSTILES with no hostile alive, NO FRIENDLIES with no ship to protect and no place held; a place held is a friendly
//   E. one target: picking one side lets the other go; X lets both go; the held name follows the pick
//   F. an order's list: the ship it is on is in the details of its side, with no name beside the title (nothing is held)
// Run: node tests/campcorners.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (s) => { const C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, s || 4); C.ships = C.ships.filter(u => u.team !== 'alien'); C.ships.forEach(u => { delete u.hurtAt; }); window.C = C; window.P = campPanelNew(); return C; };
  window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
  window.HC = () => campCornerInfo(C, P, 0, 'host'); window.FC = () => campCornerInfo(C, P, 0, 'fri');
`);

console.log('A. the titles and the chips');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0);');
  check('the hostiles corner: the chips are the key table\'s last and next enemy keys, the title is HOSTILES', JSON.stringify(J('HC().keys')) === JSON.stringify(['[', ']']) && J('HC().title') === 'HOSTILES', JSON.stringify(J('HC()')));
  check('the friendlies corner: the chips are the friendly keys (O P), the title is FRIENDLIES', JSON.stringify(J('FC().keys')) === JSON.stringify(['O', 'P']) && J('FC().title') === 'FRIENDLIES', JSON.stringify(J('FC()')));
  check('the chips follow the key table (a key moved there moves here)', (() => { g.run(`window.__k = [CAMP_KEYS.flast.k, CAMP_KEYS.fnext.k]; CAMP_KEYS.flast.k = 'N'; CAMP_KEYS.fnext.k = 'M';`); const a = J('FC().keys'); g.run(`CAMP_KEYS.flast.k = __k[0]; CAMP_KEYS.fnext.k = __k[1];`); return JSON.stringify(a) === JSON.stringify(['N', 'M']); })());
  check('with something picked nowhere: no name beside either title, nothing held', J('HC().name') === '' && J('FC().name') === '' && J('HC().held') === false && J('FC().held') === false);
  check('no cruiser (a world that has not begun): both corners are empty and say nothing', J('campCornerInfo(null, null, 0, "host").title') === '' && J('campCornerInfo({}, null, 0, "fri").empty') === true);
}

console.log('B. an enemy held');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campTgtStep(C, 1);');
  check('its name is written beside HOSTILES (the name the lists give it)', J('HC().name') === J('campNavUnitName(R1)') && /^Raider \d+$/.test(J('HC().name')), J('HC().name'));
  check('FRIENDLIES has no name and is not holding', J('FC().name') === '' && J('FC().held') === false);
  check('the details (the picture, hull, shield, distance, what it does, E Attack) are the enemy\'s, in HOSTILES alone', J('HC().subject.u.id') === J('R1.id') && J('HC().subject.side') === 'hostile' && J('FC().subject') === null);
  check('and HOSTILES is not empty', J('HC().empty') === false && J('HC().title') === 'HOSTILES');
}

console.log('C. a friendly held');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campFriStep(C, 1);');
  check('a ship you protect held: its name is beside FRIENDLIES', J('FC().held') === true && J('FC().name') === J('campFriNow(C).name') && J('FC().name') !== '', J('FC()'));
  check('HOSTILES has no name; the details are the friendly\'s, in FRIENDLIES alone', J('HC().name') === '' && J('HC().subject') === null && J('FC().subject.side') === 'friend' && J('FC().subject.held') === true);
  g.run(`campFriHold(C, 'place:' + Object.keys(campPlaces(C.level)).find(id => !campPlaces(C.level)[id].hidden));`);
  check('a map-clicked outpost or planet is a friendly: its name is beside FRIENDLIES, the details are its post', J('FC().held') === true && J('FC().name') === J('campFriNow(C).name') && !!J('FC().subject.post') && J('FC().subject.u') === null, JSON.stringify(J('FC()')).slice(0, 300));
  check('and HOSTILES still has no name', J('HC().name') === '' && J('HC().held') === false);
}

console.log('D. empty: NO HOSTILES and NO FRIENDLIES');
{
  g.run('__new();');
  check('no hostile alive: the title is NO HOSTILES (and it holds nothing)', J('HC().empty') === true && J('HC().title') === 'NO HOSTILES' && J('HC().name') === '', J('HC()'));
  check('a ship you protect is flying: FRIENDLIES is not empty', J('FC().empty') === false && J('FC().title') === 'FRIENDLIES', J('FC()'));
  g.run('C.ships.forEach(u => { if (u.team !== "alien" && u !== C.carrier && u.kind !== "fighter") u.hp = 0; });');
  check('no ship to protect and no place held: NO FRIENDLIES', J('campFriList(C).length') === 0 && J('FC().empty') === true && J('FC().title') === 'NO FRIENDLIES', J('FC()'));
  g.run(`campFriHold(C, 'place:' + Object.keys(campPlaces(C.level)).find(id => !campPlaces(C.level)[id].hidden));`);
  check('a place held by a map click makes it FRIENDLIES again, with its name', J('FC().empty') === false && J('FC().title') === 'FRIENDLIES' && J('FC().name') !== '', J('FC()'));
  g.run('window.R2 = __foe("raider", 900, 0);');
  check('a hostile comes: HOSTILES is back, with no name until one is picked', J('HC().empty') === false && J('HC().title') === 'HOSTILES' && J('HC().name') === '');
}

console.log('E. one target');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); campFriStep(C, 1);');
  const who = J('FC().name'); check('a friendly held: its name is in FRIENDLIES', who !== '' && J('HC().name') === '');
  g.run('campTgtStep(C, 1);');
  check('an enemy picked next: the friendly is let go, the name moves to HOSTILES', J('FC().name') === '' && J('FC().held') === false && J('HC().name') === J('campNavUnitName(R1)') && J('HC().held') === true);
  g.run('campFriStep(C, 1);');
  check('a friendly picked again: the enemy is let go, the name moves back', J('HC().name') === '' && J('FC().name') === who);
  g.run('campPicksClear(C);');
  check('X lets both go: no name in either corner, the titles stay', J('HC().name') === '' && J('FC().name') === '' && J('HC().title') === 'HOSTILES' && J('FC().title') === 'FRIENDLIES');
  g.run('R1.hp = 0; campTgtStep(C, 1);');
  check('an enemy that is lost is let go: no name, and NO HOSTILES when it was the last', J('HC().name') === '' && J('HC().empty') === true && J('HC().title') === 'NO HOSTILES');
}

console.log('F. an order\'s list');
{
  g.run('__new(); window.R1 = __foe("raider", 900, 0); window.TR = C.ships.find(u => u.kind === "freighter"); campPickOpen(P, { id: "escort", pick: "escort" }, campPickItems(C, "escort"));');
  check('a friendly ship the list is on: it is in the details of FRIENDLIES, with no name beside the title (nothing is held)', J('FC().subject.u.team') !== 'alien' && J('FC().subject.side') === 'friend' && J('FC().name') === '' && J('HC().subject') === null, JSON.stringify(J('FC().subject && FC().subject.side')));
  g.run('campPickOpen(P, { id: "attack", pick: "enemy" }, campPickItems(C, "enemy"));');
  check('a hostile the list is on: it is in the details of HOSTILES, and FRIENDLIES has none', J('HC().subject.u.team') === 'alien' && J('FC().subject') === null && J('HC().name') === '');
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
