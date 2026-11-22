// smoke: the Campaign's first-minute hints: open the fleet list and launch (Q, Enter), then open the fighters list and attack (E, Enter), once each, level 1 only (plain Node, no Chrome)
// Card space-game-night-ux, finding 6 (docs/night/ux.md; src/campnudge.js, update in src/campaignscene.js). A player who reads "Launch the wing" and then flies about is told, at 6 s, "Press Q, then Enter:
// launch the wing."; with the wing out and aliens about, at 26 s, "Enemies. Press E, then Enter: the fighters attack." Each is shown once, never if the player has already done it, and only in level 1.
// The keys in the hints are the key table's (cards one-list-keys and list-shortcuts: {vialaunch} and {viaattack} of src/data_controls.js, the key of the list each order is in), and the player here gives the orders
// exactly the way the hints say: the key, then Enter (so each order must be the FIRST row of its list, which is checked). A digit is no order any more, so a player who presses 1 is still hinted.
// Run: node tests/uxnudge.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__toasts = []; window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts.push([Math.round(s.camp.t / 100) / 10, msg]); }; shipcompSay = () => true;
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level, seed: 5 }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; f.onKey({ code: 'Enter' }); __toasts.length = 0; return f; };
  // do what a hint says: the key of the list the order is in (E for the fighters; a list with no key is reached through its parent's), then Enter on the list's first row. A hint that says "key, then Enter" is only true while the order IS the first row
  window.__pick = (f, row) => { const d = campKeyVia(row), i = campPanelList(f.camp, d.id).findIndex(r => r.id === row); if (i < 0) throw new Error('no row ' + row); if (campPanelOpen(f.pn)) f.onKey({ code: 'Escape' });
    f.onKey({ code: CAMP_PANELS.panels.find(p => p.key === campKeyOpens(d.id)).code }); const open = campPanelOpen(f.pn); for (let k = 0; k < i; k++) f.onKey({ code: 'ArrowDown' }); f.onKey({ code: 'Enter' }); return [open, i]; };
  window.__tick = s => { for (let i = 0; i < s * 30; i++) F.update(0, 1000 / 30); };
`);
const LAUNCH = 'Press Q, then Enter: launch the wing.', ATTACK = 'Enemies. Press W, then Enter: the fighters attack.';
check('the two hints read their keys from the key table: Q is the key of the list "Launch the wing" is in, W the key of the list "Attack the target" is in ({vialaunch}, {viaattack}), and "then Enter" is true: each is the first row of its list', J(`uiText('camp.nudge.launch')`) === LAUNCH && J(`uiText('camp.nudge.attack')`) === ATTACK && J(`'Press ' + campKeyVar('vialaunch') + ', then Enter: launch the wing.'`) === LAUNCH && J(`'Enemies. Press ' + campKeyVar('viaattack') + ', then Enter: the fighters attack.'`) === ATTACK && J(`UI_TEXT['camp.nudge.launch'].includes('{vialaunch}') && UI_TEXT['camp.nudge.attack'].includes('{viaattack}')`) && J(`[campKeyVia('launch').id, campKeyVia('launch').key, campKeyVia('attack').id, campKeyVia('attack').key]`).join() === 'fleet,Q,squads,W' && J(`campPanelList(campNew(1, [], {}), 'fleet')[0].id === 'launch' && campPanelList(campNew(1, [], {}), 'squads')[0].id === 'attack'`), J(`uiText('camp.nudge.launch')`) + ' | ' + J(`uiText('camp.nudge.attack')`));
// a player who does nothing
g.run(`window.F = __fake(1); __tick(5.5);`);
check('nothing is said in the first 5 seconds', J('__toasts.length') === 0);
g.run(`__tick(1);`);
check('at 6 s: "' + LAUNCH + '"', J('__toasts.map(t => t[1])').join('|') === LAUNCH && J('__toasts[0][0]') >= 6 && J('__toasts[0][0]') < 6.2, JSON.stringify(J('__toasts')));
g.run(`__tick(10);`);
check('and it is not said again (the convoy\'s own message at 10 s is the only other)', J('__toasts.filter(t => /launch the wing/.test(t[1])).length') === 1 && J('__toasts.some(t => /Convoy to Mars/.test(t[1]))'), JSON.stringify(J('__toasts')));
// a player who presses the old key: a digit is no order (card one-list-keys), so the wing is still in the bay and the hint still comes
g.run(`window.F = __fake(1); __tick(3); F.onKey({ code: 'Digit1' }); __toasts.length = 0; __tick(4);`);
check('a player who pressed 1 at 3 s has launched nothing and is still told how', J('F.camp.orders.launch') === 0 && J('__toasts.filter(t => t[1] === ' + JSON.stringify(LAUNCH) + ').length') === 1, JSON.stringify(J('__toasts')));
// a player who launches at 3 s
g.run(`window.F = __fake(1); __tick(3); window.__how = __pick(F, 'launch'); window.__lit = [F.camp.orders.launch, campPanelOpen(F.pn)]; __toasts.length = 0; __tick(10);`);
check('a player who launched at 3 s (Q, Enter, as the hint says: the fleet list opens on the row, the order is taken and the list closes) is never told to', J('__how').join() === 'fleet,0' && J('__lit').join() === '1,' && !J('__toasts.some(t => /launch the wing/i.test(t[1]))'), JSON.stringify(J('__lit')) + JSON.stringify(J('__toasts')));
// the attack hint
g.run(`__tick(14);`);
check('with the wing out and aliens about, at 26 s, the second hint: "' + ATTACK + '"', J('__toasts.some(t => t[1] === ' + JSON.stringify(ATTACK) + ')') && J('(__toasts.find(t => /the fighters attack/.test(t[1])) || [0])[0]') >= 26 && J('(__toasts.find(t => /the fighters attack/.test(t[1])) || [99])[0]') < 26.5, JSON.stringify(J('__toasts')));
g.run(`__tick(20);`);
check('and not again', J('__toasts.filter(t => /the fighters attack/.test(t[1])).length') === 1);
g.run(`window.F = __fake(1); __tick(3); __pick(F, 'launch'); __tick(20); campSpawn(F.camp, 'raider', F.camp.carrier.x + 900, F.camp.carrier.y); window.__how = __pick(F, 'attack'); if (F.pn.pick) F.onKey({ code: 'Enter' }); /* several hostiles: the sub-list opened, Enter takes the nearest (card space-game-order-target-pick) */ window.__lit = [F.camp.orders.attack, campPanelOpen(F.pn)]; __toasts.length = 0; __tick(15);`);
check('a player who ordered the attack before 26 s (W, Enter, as the hint says: W opens the all-squads list directly, on its first row) is never told to', J('__how').join() === 'squads,0' && J('__lit').join() === '1,' && !J('__toasts.some(t => /the fighters attack/.test(t[1]))'), JSON.stringify(J('__toasts')));
// the fine print
g.run(`window.F = __fake(2); __tick(40);`);
check('level 2 has no hints (the player has learnt the keys)', !J('__toasts.some(t => /Press [QE]|launch the wing|the fighters attack/i.test(t[1]))') && J('F.camp.t') >= 39000, JSON.stringify(J('__toasts')));
g.run(`window.F = __fake(1); F.onKey({ code: 'Escape' }); __tick(10);`);
check('paused, the clock does not run and no hint is shown', J('__toasts.length') === 0 && J('F.camp.t') === 0);
g.run(`window.F = __fake(1); __tick(8); F.init({ level: 1, seed: 5 }); F.camp = campNew(1, F.P.techs, F.opts); F.onKey({ code: 'Enter' }); __toasts.length = 0; __tick(7);`);
check('the same scene started again (a retry runs init on the same object) hints again: the hint state is reset in init', J('__toasts.filter(t => t[1] === ' + JSON.stringify(LAUNCH) + ').length') === 1, JSON.stringify(J('__toasts')));
check('campNudge is quiet with no battle, no state, or a finished battle, and never throws', J('campNudge(null, {})') === null && J('campNudge({}, null)') === null && J(`campNudge(Object.assign(campNew(1, [], {}), { result: 'won', t: 9000 }), {})`) === null);
check('the table is plain data: ids, the level, the second, a test, and words that are in content/text/ui.md', J('CAMPNUDGE.map(h => h.id).join()') === 'launch,attack' && J('CAMPNUDGE.every(h => h.level === 1 && h.at > 0 && typeof h.when === "function" && uiText(h.key) !== h.key)'));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX NUDGE FAIL (${failed} of ${n})` : `UX NUDGE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
