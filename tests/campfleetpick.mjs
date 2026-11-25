// smoke: the fleet pick (card space-game-keys5-qwe, Troy 24 Nov 2026): W opens it, a digit picks WHO (1 Red 1 Wedge, 2 Red 2 Kara, 3 Red 3 Apollo, 4 All pilots) and 5 is Form up on me, an order given at once to who is picked while the held target stays held; W alone only opens it; E is the order, X is gone, the target cycles wrap with no empty stop (plain Node, no Chrome)
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

const w = k('KeyW');
check('W opens the fleet pick and gives no order and picks nobody', w.used && !w.ran && w.open === 'fleet' && J('C.sel') !== 'pilot:red');
check('the pick has five rows: Red 1 Wedge, Red 2 Kara, Red 3 Apollo, All pilots, Form up on me (the call signs are the pilots\')', J(`campPanelRows(C, 'fleet').map(r => r.label).join('|')`) === 'Red 1 Wedge|Red 2 Kara|Red 3 Apollo|All pilots|Form up on me');
check('All pilots is the default and is marked', J(`campPanelRows(C, 'fleet').find(r => r.id === 'whoall').marked`) === true);
const d2 = k('Digit2');
check('digit 2 picks Kara, closes the pick, gives no order', d2.ok && !d2.ran && d2.open === '' && J('C.sel') === 'pilot:green');
check('a digit with no list open does nothing (no pick)', (() => { const r = k('Digit1'); return !r.used && J('C.sel') === 'pilot:green'; })());
k('KeyW'); k('Digit1');
check('W then 1 picks Wedge; W then 3 Apollo; W then 4 all pilots', J('C.sel') === 'pilot:red' && (k('KeyW'), k('Digit3'), J('C.sel')) === 'pilot:yellow' && (k('KeyW'), k('Digit4'), J('C.sel')) === 'all');
k('BracketRight'); const held = J('C.tgt');
k('Enter');
check('E at the enemy held: all pilots attack', held !== '' && J(`['red', 'green', 'yellow'].every(q => campWingShips(C, q).every(u => u.order.type === 'attack'))`));
k('KeyW'); const f5 = k('Digit5');
check('W then 5 forms up at once: the order is given, the pick closes, the target stays held', f5.ran && f5.ok && f5.row === 'whoform' && J('C.tgt') === held && J(`['red', 'green', 'yellow'].every(q => campWingShips(C, q).every(u => u.order.type === 'guard'))`));
k('KeyW'); k('Digit1'); k('Enter');
k('KeyW'); k('Digit5');
check('5 goes to who is picked: with Wedge picked only Wedge forms up, the others keep what they had', (() => { k('KeyW'); k('Digit4'); k('Enter'); k('KeyW'); k('Digit2'); k('KeyW'); k('Digit5'); return ord('green') === 'guard' && ord('red') === 'attack'; })());
check('E with nothing held forms up (as before)', (() => { g.run(`C.tgt = ''; C.fsel = ''; C.sel = 'all'`); const r = k('Enter'); return r.ran && r.ok && ord('red') === 'guard'; })());
const x = k('KeyX');
check('X is no key: not used, nothing changes', !x.used && J(`campKeyIs('clear', 'KeyX')`) === false);
check('] and [ wrap with no empty stop: three presses with two enemies end on a ship, never on none', (() => { g.run(`C.tgt = ''; C.fsel = ''; C.tgtAt = 0;`); const seen = [1, 2, 3, 4].map(() => (k('BracketRight'), J('C.tgt'))); return seen.every(t => t !== ''); })());
check('the label is the call sign and the name; the radio and the orders still say the name', J(`campSelList(C).filter(e => /^pilot:/.test(e.id)).map(e => e.label).join('|')`) === 'Red 1 Wedge|Red 2 Kara|Red 3 Apollo' && J(`campSelList(C).filter(e => /^pilot:/.test(e.id)).map(e => e.name).join('|')`) === 'Wedge|Kara|Apollo');
check('a pilot who is not out cannot be picked: refused in words, who stays', (() => { g.run(`campWingShips(C, 'yellow').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.sel = 'all';`); k('KeyW'); const r = k('Digit3'); return r.ran === false || r.ok === false ? J('C.sel') === 'all' : false; })());
if (failed) { console.log('FLEET PICK FAIL (' + failed + ')'); process.exit(1); } else console.log('FLEET PICK OK');
