// smoke: the fleet pick (cards space-game-keys5-qwe and space-game-keys7-trim, Troy 24 Nov 2026): each press of W steps WHO (Wedge, Kara, Apollo, All pilots, round again) and keeps the pick open; a digit 1 to 4 jumps straight there; Form up on me is the last row of the Q list (all pilots, at once, the held target stays held); E picks a friendly, Enter is the order, X is gone, the target cycles wrap with no empty stop (plain Node, no Chrome)
// Run: node tests/campfleetpick.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.C = campNew('home', [], { seed: 1, god: true }); campOrder(C, 'launch'); for (let i = 0; i < 240; i++) campStep(C, 1 / 30); C.ships = C.ships.filter(u => u.team !== 'alien'); window.P = campPanelNew();
  campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y); campSpawn(C, 'raider', C.carrier.x + 1500, C.carrier.y);`);
const k = code => J(`(() => { const r = campPanelKey(P, C, '${code}', 100); return { used: r.used, ran: r.ran, ok: r.ok, open: r.open, row: r.row, say: r.say }; })()`);
const ord = sq => J(`campWingShips(C, '${sq}').map(u => u.order && u.order.type).join()`);
const sel = () => J('C.sel');

check('the pick has three rows: Wedge, Kara, Apollo (the call signs are the pilots\'); All pilots is no row (card space-game-keys8-e-digit item 5: the first tap of W picks it) but it is the default, and none of the three is marked then', J(`campPanelRows(C, 'fleet').map(r => r.label).join('|')`) === 'Wedge|Kara|Apollo' && J(`campPanelRows(C, 'fleet').some(r => r.marked)`) === false && J(`campSelIs(C, 'all')`) === true && sel() === 'all');
const w1 = k('KeyW');
check('W (the pick closed) picks ALL pilots and opens the pick; it gives no order', w1.used && !w1.ran && w1.open === 'fleet' && sel() === 'all');
check('W again steps to Wedge, Kara, Apollo, All pilots, and round to Wedge; the pick stays open', [k('KeyW'), sel()][1] === 'pilot:red' && (k('KeyW'), sel()) === 'pilot:green' && (k('KeyW'), sel()) === 'pilot:yellow' && (k('KeyW'), sel()) === 'all' && (k('KeyW'), sel()) === 'pilot:red' && J('campPanelOpen(P)') === 'fleet');
const d3 = k('Digit3');
check('a digit still jumps straight there: 3 picks Apollo and closes the pick', d3.ok && !d3.ran && d3.open === '' && sel() === 'pilot:yellow');
check('a digit with no list open does nothing', (() => { const r = k('Digit1'); return !r.used && sel() === 'pilot:yellow'; })());
g.run('campPanelClose(P)'); k('KeyW'); const w4 = k('Digit4');
check('W alone picks all pilots, and W then 4 does nothing: the digit left the pick (the pick stays open)', sel() === 'all' && !w4.ok && w4.open === 'fleet');
g.run('campPanelClose(P)');
k('BracketRight'); const held = J('C.tgt');
k('Enter');
check('Enter at the enemy held: all pilots attack', held !== '' && J(`['red', 'green', 'yellow'].every(q => campWingShips(C, q).every(u => u.order.type === 'attack'))`));
const f5 = k('KeyW') && k('Digit5');
check('W then 5 does nothing now (the Form up row left the pick)', !f5.used || !f5.ran);
k('KeyQ'); const fu = k('Digit6');
check('Q then 6 is Form up on me (the seventh before Mine ore left the list, card space-game-orders-f5-q-cruiser-only): all pilots guard the cruiser at once, the pick closes, the target stays held', fu.ran && fu.ok && fu.row === 'formup' && fu.open === '' && J('C.tgt') === held && J(`['red', 'green', 'yellow'].every(q => campWingShips(C, q).every(u => u.order.type === 'guard'))`));
check('Form up is for ALL pilots, whoever is picked: with Wedge picked and the pilots sent out, the others form up too', (() => { k('KeyW'); k('Digit1'); k('Enter'); k('KeyQ'); k('Digit6'); return ['red', 'green', 'yellow'].every(q => ord(q) === 'guard'); })());
check('Enter with nothing held forms up (as before)', (() => { g.run(`C.tgt = ''; C.fsel = ''; C.sel = 'all'`); const r = k('Enter'); return r.ran && r.ok && ord('red') === 'guard'; })());
const x = k('KeyX');
check('X is no key: not used, nothing changes', !x.used && J(`campKeyIs('clear', 'KeyX')`) === false);
check('] and E wrap with no empty stop: four presses with two enemies end on a ship, never on none', (() => { g.run(`C.tgt = ''; C.fsel = ''; C.tgtAt = 0;`); const seen = [1, 2, 3, 4].map(() => (k('BracketRight'), J('C.tgt'))); return seen.every(t => t !== ''); })());
check('the label is the call sign and the name; the radio and the orders still say the name', J(`campSelList(C).filter(e => /^pilot:/.test(e.id)).map(e => e.label).join('|')`) === 'Wedge|Kara|Apollo' && J(`campSelList(C).filter(e => /^pilot:/.test(e.id)).map(e => e.name).join('|')`) === 'Wedge|Kara|Apollo');
check('a pilot who is not out is no stop: W steps past them', (() => { g.run(`campWingShips(C, 'yellow').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.sel = 'pilot:green'; campPanelClose(P);`); k('KeyW'); return sel() === 'all'; })());
if (failed) { console.log('FLEET PICK FAIL (' + failed + ')'); process.exit(1); } else console.log('FLEET PICK OK');
