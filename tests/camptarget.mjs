// smoke: the one target of the Campaign: A D S pick it, X clears it; the squads' Attack rows (W all, E red, R green, T yellow) go at it, the autopilot's rows (I) fly or burn to it, Enter (no list open) fires a missile at it (plain Node, no Chrome)
// Card space-game-two-hands-keys (Troy, 21 Nov 2026), the keys as cards one-list-keys, keys4-onekey and delete-off-lists left them (S the cruiser list with its digits; Q who, [ ] \ the target, W the order; the fleet and ship lists are gone):
// no digit is a key in flight but the S list's.
// The rules are src/camptarget.js (pure: C.tgt is a ship's id), the keys are src/camppanel.js, the bracket and the target line are the drawing (tests/campanelsui.mjs).
//   A. the list and the picks: the hostiles nearest the carrier first; ] the next, [ the last, round at the ends; with none picked ] takes the nearest and [ the farthest; the backslash the nearest; X clears; a dead target is let go
//   B. the orders: E, "Attack the target" (the top row), Enter sends the fighters at it (and with none picked is the old Attack: the nearest alien); the same row is reached through Q, the Fighters row, Enter; R has the green squad's own Attack row, which moves that squad only;
//      I, "Fly to the target" flies the carrier to it and "Fast burn to the target" is its own row (no Shift); P, the Autopilot row, Enter (or Right) opens the same list and Left goes back onto that row;
//      Enter with no list open fires a missile at it inside CAMP.missile.lock; each refusal is in words and leaves the list open; a digit does nothing
//   C. the state: C.tgt is plain data; a seeded battle with the same orders is the same battle; the words of the target line and the refusals are in the content
// Run: node tests/camptarget.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__mk = () => { const C = campNew('home', [], { seed: 4 }); C.ships = C.ships.filter(u => u.team !== 'alien'); window.C = C; return C; };
  window.__foe = (kind, dx, dy) => campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy);
  window.__run = (s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  // press through the lists as the player does: the key of the list the row is in (campKeyVia; a part with no key of its own is reached through its parent: the parent's key, Down to the part's row, Enter), Down to the row, Enter.
  // The indexes are read from this mission's lists (campPanelList), not written here. null when the row is not in this mission's list
  window.__open = (P, C, listId, now) => { const def = campKeyList(listId); if (!def) return false; campPanelClose(P); if (def.key) { campPanelKey(P, C, def.code, now); return campPanelOpen(P) === listId; } campPanelGo(P, C, listId); return campPanelOpen(P) === listId; /* no key opens this list now: opened by data */ };
  window.__pick = (P, C, rowId, now) => { const def = campKeyVia(rowId); if (!def) return null; const i = campPanelList(C, def.id).findIndex(r => r.id === rowId); if (i < 0 || !__open(P, C, def.id, now)) return null; if (def.numbers) return campPanelKey(P, C, 'Digit' + (i + 1), now); const nr = campPanelList(C, def.id).length; for (let k = 0, d = ((i - P.at) % nr + nr) % nr; k < d; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); }; // (a list can open on its first usable row: the Downs count from the highlight)
`);

console.log('A. the list and the picks');
g.run(`__mk(); window.a1 = __foe('raider', 900, 0); window.a2 = __foe('drone', 300, 0); window.a3 = __foe('gunship', -600, 100);`);
check('the list is the hostiles, nearest the carrier first (the drone at 300, the gunship at 600, the raider at 900); a friend or a neutral is not in it', J('campTgtList(C).map(u => u.kind).join()') === 'drone,gunship,raider' && J('campTgtList(C).every(u => u.team === "alien")'));
check('with none picked ] takes the nearest and the target is its id; campTgtNow gives the ship', J('campTgtStep(C, 1).kind') === 'drone' && J('C.tgt') === J('a2.id') && J('campTgtNow(C).id') === J('a2.id'));
check('] again goes to the next (the gunship), then the raider, then round to the nearest', ['gunship', 'raider', 'drone'].every(k => J('campTgtStep(C, 1).kind') === k));
check('[ goes to the last one, round at the start: from the drone to the raider, then the gunship', J('campTgtStep(C, -1).kind') === 'raider' && J('campTgtStep(C, -1).kind') === 'gunship');
g.run(`campTgtClear(C)`);
check('with none picked [ takes the farthest', J('campTgtStep(C, -1).kind') === 'raider');
check('the backslash (campTgtNearest) takes the nearest whatever was picked', J('campTgtNearest(C).kind') === 'drone' && J('C.tgt') === J('a2.id'));
check('X clears it, and says whether there was one', J('campTgtClear(C)') === true && J('C.tgt') === '' && J('campTgtNow(C)') === null && J('campTgtClear(C)') === false);
g.run(`campTgtNearest(C); a2.hp = 0;`);
check('a target that is destroyed is let go the next time anyone asks: no target, the id is cleared', J('campTgtNow(C)') === null && J('C.tgt') === '');
g.run(`campTgtStep(C, 1);`);
check('and the list does not hold a dead ship: the next pick is the gunship', J('C.tgt') === J('a3.id') && J('campTgtList(C).length') === 2);
g.run(`C.ships = C.ships.filter(u => u.team !== 'alien'); C.by = {}; C.ships.forEach(u => { C.by[u.id] = u; });`);
check('with no hostile in the battle every pick answers null and leaves no target', J('campTgtStep(C, 1)') === null && J('campTgtNearest(C)') === null && J('C.tgt') === '');
g.run(`__mk(); window.a1 = __foe('raider', 500, 0); window.F = campPanelNew();`);
check('the keys: ], [, the backslash on the lists\' door (X is gone) (campPanelKey) do it, are the left hand\'s (fleet: true), are no order and open no list', (() => { const d = J(`campPanelKey(F, C, 'BracketRight', 0)`), s = J('C.tgt'), x = J(`campPanelKey(F, C, 'KeyX', 1)`); return d.used && d.fleet && !d.ran && d.open === '' && d.tgt === s && s === J('a1.id') && !x.used && J('C.tgt') === s && J(`campPanelKey(F, C, 'Backslash', 2).tgt`) === J('a1.id') && J(`campPanelKey(F, C, 'KeyZ', 2).used`) === false && J(`campPanelKey(F, C, 'KeyE', 3).tgt`) === J('a1.id') && J('campPanelOpen(F)') === ''; })());
check('and they mean the same with a list open (no key is reused): with a list open X is no key and ] picks it again, the list stays open on its row', (() => { g.run(`campPanelGo(F, C, 'convoy'); campPanelKey(F, C, 'ArrowDown', 4);`); const x = J(`campPanelKey(F, C, 'KeyX', 5)`), d = J(`campPanelKey(F, C, 'BracketRight', 6)`); const r = !x.used && !x.ran && d.tgt === J('a1.id') && J('campPanelOpen(F)') === 'convoy' && J('F.at') === 1; g.run('campPanelClose(F)'); return r; })());

console.log('B. the orders');
g.run(`__mk(); campOrder(C, 'launch'); __run(6); window.a1 = __foe('raider', 700, 0); window.a2 = __foe('drone', 1500, 300); window.F = campPanelNew();`); // the wing is out first: the foes come after, so it has not shot them down
check('a digit is no key in flight: 2 and 8 (the old Attack and Fly to the target) are not used, give no order and open no list', ['Digit2', 'Digit8', 'Numpad2'].every(c => { const r = J(`campPanelKey(F, C, '${c}', 0)`); return !r.used && !r.ran && r.open === ''; }) && J(`campWing(C, 'fighter').every(u => u.order.type !== 'attack')`) && J('C.nav') === null);
g.run(`campPanelKey(F, C, 'BracketRight', 1); campPanelKey(F, C, 'BracketRight', 2);`);
check('the order key with a target picked sends the fighters at THAT ship, the farther one (the drone), and says it by name', (() => { g.run(`campOrder(C, 'guard'); campPanelClose(F);`); const r = J(`campPanelKey(F, C, 'Enter', 3)`); return r.ran && r.ok && /attack/i.test(r.say) && J(`campWing(C, 'fighter').every(u => u.order.type === 'attack' && u.order.target === '${J('a2.id')}')`) && J('C.tgt') === J('a2.id'); })());
check('W sends the pilots at the target; with a pilot picked (Q) the order goes to THAT pilot alone (the green one) and the others stay as they were (guarding), and it is a fleet order (the left hand)', (() => { g.run(`campOrder(C, 'guard'); campSelStep(C, 1); campSelStep(C, 1);`); const n = J(`[campWingShips(C, 'green').length, campWingShips(C, 'red').length, C.sel]`); const r = J(`campPanelKey(F, C, 'Enter', 3)`); const ok = n[0] > 0 && n[1] > 0 && n[2] === 'pilot:green' && r.used && r.ran && r.ok && r.row === 'attack' && r.fleet && r.open === '' && J(`campWingShips(C, 'green').every(u => u.order.type === 'attack' && u.order.target === '${J('a2.id')}')`) && J(`campWingShips(C, 'red').every(u => u.order.type === 'guard')`); g.run(`campSelClear(C);`); return ok; })());
check('and the order is the wing order of src/campwing.js (a named target): the same answer the strip gives for it', J(`campWingCheck(C, null, 'attack', '${J('a2.id')}').ok`) === true);
g.run(`__mk(); window.a1 = __foe('raider', 800, 0); window.F = campPanelNew();`);
check('S, "Fly to the target" with no target is refused in words: pick one with ] or the backslash (the list stays open, the row is greyed: "pick a target first")', (() => { const st = J(`campPanelRows(C, 'cruiser').find(x => x.id === 'target')`); const r = J(`__pick(F, C, 'target', 0)`); return r.ran && !r.ok && r.row === 'target' && r.fleet && r.open === 'cruiser' && /No target/.test(r.say) && /\] picks one, \\ the nearest/.test(r.say) && J('C.nav') === null && st.ok === false && st.state === 'pick a target first'; })());
g.run(`campPanelKey(F, C, 'Backslash', 1);`); // the backslash with the cruiser list still open: the target is picked, the list is as it was
check('the same row with a target is the autopilot to that ship: C.nav is on it (row alien:<id>), regular speed, and the list closes', (() => { const still = J('campPanelOpen(F)') === 'cruiser'; const r = J(`__pick(F, C, 'target', 2)`); return still && r.ran && r.ok && r.open === '' && J('C.nav && C.nav.on') === true && J('C.nav.id') === 'alien:' + J('a1.id') && J('C.nav.fast') === false && J('C.nav.kind') === 'alien'; })());
g.run(`campNavClear(C, 'clear'); window.F2 = campPanelNew();`);
g.run(`campNavClear(C, 'clear'); a1.hp = 0;`);
check('a target that is gone: the row says no target', J(`__pick(F2, C, 'target', 1).say`).indexOf('No target') === 0 && J('C.nav') === null);
g.run(`__mk(); window.a1 = __foe('gunship', 900, 0); window.a2 = __foe('tower', 2000, 0); a2.vmax = 0; window.F = campPanelNew();`);
check('M with no enemy picked picks the nearest enemy (the gunship) and fires at it, says "Missile away.", and it is the target now (card space-game-keys7-trim)', (() => { const r = J(`campPanelKey(F, C, 'KeyM', 0)`); return r.ran && r.ok && r.row === 'missile' && r.say === 'Missile away.' && J('C.missiles') === 5 && J('C.rockets[0].target') === J('a1.id') && J('C.tgt') === J('a1.id'); })());
g.run(`C.nextRocket = 0; C.missiles = 6; C.rockets.length = 0; campTgtClear(C); campTgtStep(C, 1); campTgtStep(C, 1);`);
check('Enter with a target fires at THAT ship inside the lock range (CAMP.missile.lock: 2400 px): the tower at 2000', J('C.tgt') === J('a2.id') && (() => { const r = J(`campPanelKey(F, C, 'KeyM', 5)`); return r.ran && r.ok && J('C.rockets[0].target') === J('a2.id'); })());
g.run(`C.nextRocket = 0; C.missiles = 6; C.rockets.length = 0; a2.x = C.carrier.x + 3000;`);
check('and out of range it is refused in words: "The target is out of missile range", no missile is gone', (() => { const r = J(`campPanelKey(F, C, 'KeyM', 9)`); return r.ran && !r.ok && r.say === 'The target is out of missile range, pilot.' && J('C.missiles') === 6; })());
g.run(`C.nextRocket = 0; C.missiles = 0; a2.x = C.carrier.x + 1000;`);
check('with the magazine empty the refusal is the magazine\'s', J(`campPanelKey(F, C, 'KeyM', 12).say`) === 'The magazine is empty, pilot. R builds more, for ore.');
check('the list rows say it: the target row names it and how far, and says "no target" when there is none', (() => { const sh = J(`campPanelRows(C, 'cruiser')`); const t = /^Tower \d+  \d+ km$/.test(sh.find(r => r.id === 'target').state); g.run('campTgtClear(C)'); const none = J(`campPanelRows(C, 'cruiser').find(r => r.id === 'target').short`) === 'no target'; return t && none; })());

console.log('C. the state and the words');
check('C.tgt is plain data (a string), starts empty in every battle, and is in no other state: a battle with the picks and one without are the same battle when the same orders are given', (() => { const run = pick => J(`(() => { const C = campNew('home', [], { seed: 9 }); if (${pick}) { campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); campTgtStep(C, 1); campTgtClear(C); } else campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); campOrder(C, 'launch'); for (let i = 0; i < 30 * 20; i++) campStep(C, 1 / 30); return [typeof C.tgt, C.tgt, +C.t.toFixed(3), +C.carrier.x.toFixed(3), C.ships.length, C.ore]; })()`); const a = run(true), b = run(false); return a.join() === b.join() && a[0] === 'string' && a[1] === ''; })());
check('the words are in content/text/camptarget.md and mirror the table: the target line, none, the keys, the refusals', ['camp.ui.tgt', 'camp.ui.tgtnone', 'camp.ui.tgtkeys', 'camp.no.notarget', 'camp.no.tgtrange'].every(k => readFileSync(ROOT + '/content/text/camptarget.md', 'utf8').includes('| ' + k + ' |') && J(`uiText('${k}')`) !== k));
check('the refusal names the keys from the table, so a remap changes it', J(`uiText('camp.no.notarget')`) === 'No target, pilot. ] picks one, \\ the nearest.');
check('the scripts are in index.html: the rules before the lists, the drawing after them', (h => h.indexOf('src/camptarget.js') > h.indexOf('src/campwing.js') && h.indexOf('src/camptarget.js') < h.indexOf('src/camppanel.js') && h.indexOf('src/camptargetdraw.js') > h.indexOf('src/camptarget.js'))(readFileSync(ROOT + '/index.html', 'utf8')));
check('the bracket is drawn for the target only, in play and not with the map open (the drawing on a stand-in scene)', (() => { g.run(`__mk(); window.a1 = __foe('raider', 400, 0); window.__lines = []; window.S = { camp: C, mode: 'play', mp: null, cameras: { main: { zoom: 1 } }, add: { graphics: () => { const gx = { clear() { __lines.length = 0; return gx; }, setDepth() { return gx; }, fillStyle() { return gx; }, fillRect(...a) { __lines.push(a); return gx; } }; return gx; } } }; campTgtPaint(S);`); const none = J('__lines.length'); g.run(`campTgtStep(C, 1); campTgtPaint(S);`); const eight = J('__lines.length'); g.run(`S.mp = {}; campTgtPaint(S);`); const hidden = J('__lines.length'); return none === 0 && eight === 8 && hidden === 0; })());
// a bug found by retrying a mission in the browser (card one-list-keys): the scene object is started again, its layers are destroyed, and the bracket's old graphics (no scene, not active) was kept and drawn into for ever: no bracket after a retry
check('after the scene starts again (a retry: the old graphics is destroyed) the bracket is drawn on a NEW graphics, and a live one is kept, not made again each frame', (() => { g.run(`__mk(); window.a1 = __foe('raider', 400, 0); window.__made = 0; window.__lines = []; window.S = { camp: C, mode: 'play', mp: null, cameras: { main: { zoom: 1 } }, add: { graphics: () => { __made++; const gx = { clear() { return gx; }, setDepth() { return gx; }, fillStyle() { return gx; }, fillRect(...a) { if (gx.active !== false) __lines.push(a); return gx; } }; return gx; } } }; campTgtStep(C, 1); campTgtPaint(S); campTgtPaint(S);`); const kept = J('__made') === 1 && J('__lines.length') === 16; g.run(`S.tgtG.active = false; S.tgtG.scene = undefined; __lines.length = 0; campTgtPaint(S);`); return kept && J('__made') === 2 && J('__lines.length') === 8; })());
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN TARGET FAIL (${failed} of ${n})` : `\nCAMPAIGN TARGET PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
