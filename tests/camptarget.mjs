// smoke: the one target of the Campaign: A D S pick it, X clears it; 2 attacks it, 8 flies to it, Enter fires a missile at it (plain Node, no Chrome)
// Card space-game-two-hands-keys (Troy, 21 Nov 2026). The rules are src/camptarget.js (pure: C.tgt is a ship's id), the keys are src/camppanel.js, the bracket and the panel's line are the drawing (tests/campanelsui.mjs).
//   A. the list and the picks: the hostiles nearest the carrier first; D the next, A the last, round at the ends; with none picked D takes the nearest and A the farthest; S the nearest; X clears; a dead target is let go
//   B. the orders: 2 sends the fighters at it (and with none picked is the old Attack: the nearest alien), 8 flies the carrier to it (Shift: a burn), Enter fires a missile at it inside CAMP.missile.lock; each refusal is in words
//   C. the state: C.tgt is plain data; a seeded battle with the same orders is the same battle; the words of the target line and the refusals are in the content
// Run: node tests/camptarget.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__mk = () => { const C = campNew('home', [], { seed: 4 }); C.ships = C.ships.filter(u => u.team !== 'alien'); window.C = C; return C; };
  window.__foe = (kind, dx, dy) => campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy);
  window.__run = (s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
`);

console.log('A. the list and the picks');
g.run(`__mk(); window.a1 = __foe('raider', 900, 0); window.a2 = __foe('drone', 300, 0); window.a3 = __foe('gunship', -600, 100);`);
check('the list is the hostiles, nearest the carrier first (the drone at 300, the gunship at 600, the raider at 900); a friend or a neutral is not in it', J('campTgtList(C).map(u => u.kind).join()') === 'drone,gunship,raider' && J('campTgtList(C).every(u => u.team === "alien")'));
check('with none picked D takes the nearest and the target is its id; campTgtNow gives the ship', J('campTgtStep(C, 1).kind') === 'drone' && J('C.tgt') === J('a2.id') && J('campTgtNow(C).id') === J('a2.id'));
check('D again goes to the next (the gunship), then the raider, then round to the nearest', ['gunship', 'raider', 'drone'].every(k => J('campTgtStep(C, 1).kind') === k));
check('A goes to the last one, round at the start: from the drone to the raider, then the gunship', J('campTgtStep(C, -1).kind') === 'raider' && J('campTgtStep(C, -1).kind') === 'gunship');
g.run(`campTgtClear(C)`);
check('with none picked A takes the farthest', J('campTgtStep(C, -1).kind') === 'raider');
check('S takes the nearest whatever was picked', J('campTgtNearest(C).kind') === 'drone' && J('C.tgt') === J('a2.id'));
check('X clears it, and says whether there was one', J('campTgtClear(C)') === true && J('C.tgt') === '' && J('campTgtNow(C)') === null && J('campTgtClear(C)') === false);
g.run(`campTgtNearest(C); a2.hp = 0;`);
check('a target that is destroyed is let go the next time anyone asks: no target, the id is cleared', J('campTgtNow(C)') === null && J('C.tgt') === '');
g.run(`campTgtStep(C, 1);`);
check('and the list does not hold a dead ship: the next pick is the gunship', J('C.tgt') === J('a3.id') && J('campTgtList(C).length') === 2);
g.run(`C.ships = C.ships.filter(u => u.team !== 'alien'); C.by = {}; C.ships.forEach(u => { C.by[u.id] = u; });`);
check('with no hostile in the battle every pick answers null and leaves no target', J('campTgtStep(C, 1)') === null && J('campTgtNearest(C)') === null && J('C.tgt') === '');
g.run(`__mk(); window.a1 = __foe('raider', 500, 0); window.F = campPanelNew();`);
check('the keys: D, A, S and X on the panels\' door (campPanelKey) do it, are the left hand\'s (fleet: command time follows) and are no order', (() => { const d = J(`campPanelKey(F, C, 'KeyD', 0)`), s = J('C.tgt'), x = J(`campPanelKey(F, C, 'KeyX', 1)`); return d.used && d.fleet && !d.ran && d.tgt === s && s === J('a1.id') && x.used && x.tgt === '' && J(`campPanelKey(F, C, 'KeyS', 2).tgt`) === J('a1.id') && J(`campPanelKey(F, C, 'KeyA', 3).tgt`) === J('a1.id'); })());

console.log('B. the orders');
g.run(`__mk(); campOrder(C, 'launch'); __run(6); window.a1 = __foe('raider', 700, 0); window.a2 = __foe('drone', 1500, 300); window.F = campPanelNew();`); // the wing is out first: the foes come after, so it has not shot them down
check('2 with no target is the old Attack: the fighters go for the nearest alien (the order has no target id of its own), in the old words', (() => { const r = J(`campPanelKey(F, C, 'Digit2', 0)`); return r.ran && r.ok && r.say === 'Fighters, attack.' && J(`campWing(C, 'fighter').every(u => u.order.type === 'attack' && !u.order.target)`); })());
g.run(`campPanelKey(F, C, 'KeyD', 1); campPanelKey(F, C, 'KeyD', 2);`);
check('2 with a target sends the fighters at THAT ship, the farther one (the drone), and says it by name', (() => { const r = J(`campPanelKey(F, C, 'Digit2', 3)`); return r.ran && r.ok && /attack/i.test(r.say) && J(`campWing(C, 'fighter').every(u => u.order.type === 'attack' && u.order.target === '${J('a2.id')}')`) && J('C.tgt') === J('a2.id'); })());
check('and the order is the wing order of src/campwing.js (a named target): the same answer the strip gives for it', J(`campWingCheck(C, null, 'attack', '${J('a2.id')}').ok`) === true);
check('2 with the target picked and no fighter out is refused in words and nothing changes', (() => { g.run(`campOrder(C, 'recall'); __run(14);`); const r = J(`campPanelKey(F, C, 'Digit2', 4)`); return r.ran && !r.ok && /fighters|launch/i.test(r.say); })());
g.run(`__mk(); window.a1 = __foe('raider', 800, 0); window.F = campPanelNew();`);
check('8 with no target is refused in words: pick one with A, D or S', (() => { const r = J(`campPanelKey(F, C, 'Digit8', 0)`); return r.ran && !r.ok && /No target/.test(r.say) && /A or D picks one, S the nearest/.test(r.say) && J('C.nav') === null; })());
g.run(`campPanelKey(F, C, 'KeyS', 1);`);
check('8 with a target is the autopilot to that ship: C.nav is on it (row alien:<id>), regular speed', (() => { const r = J(`campPanelKey(F, C, 'Digit8', 2)`); return r.ran && r.ok && J('C.nav && C.nav.on') === true && J('C.nav.id') === 'alien:' + J('a1.id') && J('C.nav.fast') === false && J('C.nav.kind') === 'alien'; })());
g.run(`campNavClear(C, 'clear'); window.F2 = campPanelNew();`);
check('Shift with 8 is a burn to it (the wing is aboard); 8 alone is regular', (() => { const r = J(`campPanelKey(F2, C, 'Digit8', 0, true)`); return r.ok && J('C.nav.fast') === true; })());
g.run(`campNavClear(C, 'clear'); a1.hp = 0;`);
check('a target that is gone: 8 says no target', J(`campPanelKey(F2, C, 'Digit8', 1).say`).indexOf('No target') === 0);
g.run(`__mk(); window.a1 = __foe('gunship', 900, 0); window.a2 = __foe('tower', 2000, 0); a2.vmax = 0; window.F = campPanelNew();`);
check('Enter with no target is the old missile: at the nearest big ship in reach (the gunship), and says "Missile away."', (() => { const r = J(`campPanelKey(F, C, 'Enter', 0)`); return r.ran && r.ok && r.say === 'Missile away.' && J('C.missiles') === 5 && J('C.rockets[0].target') === J('a1.id'); })());
g.run(`C.nextRocket = 0; C.missiles = 6; C.rockets.length = 0; campTgtStep(C, 1); campTgtStep(C, 1);`);
check('Enter with a target fires at THAT ship inside the lock range (CAMP.missile.lock: 2400 px): the tower at 2000', J('C.tgt') === J('a2.id') && (() => { const r = J(`campPanelKey(F, C, 'Enter', 5)`); return r.ran && r.ok && J('C.rockets[0].target') === J('a2.id'); })());
g.run(`C.nextRocket = 0; C.missiles = 6; C.rockets.length = 0; a2.x = C.carrier.x + 3000;`);
check('and out of range it is refused in words: "The target is out of missile range", no missile is gone', (() => { const r = J(`campPanelKey(F, C, 'Enter', 9)`); return r.ran && !r.ok && r.say === 'The target is out of missile range, pilot.' && J('C.missiles') === 6; })());
g.run(`C.nextRocket = 0; C.missiles = 0; a2.x = C.carrier.x + 1000;`);
check('with the magazine empty the refusal is the magazine\'s', J(`campPanelKey(F, C, 'Enter', 12).say`) === 'The magazine is empty, pilot. It reloads slowly.');
check('the panel rows say it: the target row names it and how far, and says "no target" when there is none; the attack row (with the wing out) names it too', (() => { const sh = J(`campPanelRows(C, 'ship', 0)`); const t = /^Tower \d+  \d+ km$/.test(sh.find(r => r.id === 'target').state); g.run('campTgtClear(C)'); const none = J(`campPanelRows(C, 'ship', 0).find(r => r.id === 'target').short`) === 'no target'; g.run(`__mk(); campOrder(C, 'launch'); __run(6); window.a1 = __foe('gunship', 900, 0); a1.vmax = 0; campTgtStep(C, 1);`); const att = /^Gunship \d+, \d+ km$/.test(J(`campPanelRows(C, 'fleet', 0).find(r => r.id === 'attack').state`)); return t && none && att; })());

console.log('C. the state and the words');
check('C.tgt is plain data (a string), starts empty in every battle, and is in no other state: a battle with the picks and one without are the same battle when the same orders are given', (() => { const run = pick => J(`(() => { const C = campNew('home', [], { seed: 9 }); if (${pick}) { campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); campTgtStep(C, 1); campTgtClear(C); } else campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); campOrder(C, 'launch'); for (let i = 0; i < 30 * 20; i++) campStep(C, 1 / 30); return [typeof C.tgt, C.tgt, +C.t.toFixed(3), +C.carrier.x.toFixed(3), C.ships.length, C.ore]; })()`); const a = run(true), b = run(false); return a.join() === b.join() && a[0] === 'string' && a[1] === ''; })());
check('the words are in content/text/camptarget.md and mirror the table: the target line, none, the keys, the clear key, the refusals, the pilot\'s call heading', ['camp.ui.tgt', 'camp.ui.tgtnone', 'camp.ui.tgtkeys', 'camp.ui.tgtclear', 'camp.no.notarget', 'camp.no.tgtrange', 'camp.ui.callhead'].every(k => readFileSync(ROOT + '/content/text/camptarget.md', 'utf8').includes('| ' + k + ' |') && J(`uiText('${k}')`) !== k));
check('the refusal names the keys from the table, so a remap changes it', J(`uiText('camp.no.notarget')`) === 'No target, pilot. A or D picks one, S the nearest.');
check('the scripts are in index.html: the rules before the panels, the drawing after them', (h => h.indexOf('src/camptarget.js') > h.indexOf('src/campwing.js') && h.indexOf('src/camptarget.js') < h.indexOf('src/camppanel.js') && h.indexOf('src/camptargetdraw.js') > h.indexOf('src/camptarget.js'))(readFileSync(ROOT + '/index.html', 'utf8')));
check('the bracket is drawn for the target only, in play and not with the map open (the drawing on a stand-in scene)', (() => { g.run(`__mk(); window.a1 = __foe('raider', 400, 0); window.__lines = []; window.S = { camp: C, mode: 'play', mp: null, cameras: { main: { zoom: 1 } }, add: { graphics: () => { const gx = { clear() { __lines.length = 0; return gx; }, setDepth() { return gx; }, lineStyle() { return gx; }, lineBetween(...a) { __lines.push(a); return gx; } }; return gx; } } }; campTgtPaint(S);`); const none = J('__lines.length'); g.run(`campTgtStep(C, 1); campTgtPaint(S);`); const eight = J('__lines.length'); g.run(`S.mp = {}; campTgtPaint(S);`); const hidden = J('__lines.length'); return none === 0 && eight === 8 && hidden === 0; })());
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN TARGET FAIL (${failed} of ${n})` : `\nCAMPAIGN TARGET PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
