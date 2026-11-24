// smoke: the Campaign's first-minute hint: pick a hostile and press E (the pilots start out, so there is no launch hint), once, level 1 only (plain Node, no Chrome)
// Card space-game-night-ux, finding 6 (docs/night/ux.md; src/campnudge.js, update in src/campaignscene.js). The pilots start each mission out beside the cruiser (card space-game-keys-orders) so the old launch hint is gone; the one hint left is at 26 s, with aliens about:
// 'Enemies. Pick one with the backslash, then W: the pilots attack.' It is shown once, never if the player has already given an attack, and only in level 1. The keys in it are the key table's ({keynear}, {keyorder} of src/data_controls.js).
// The player here does what it says: the pick key, then W.
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
    f.onKey({ code: CAMP_PANELS.panels.find(p => p.key === campKeyOpens(d.id)).code }); const open = campPanelOpen(f.pn), n = campPanelList(f.camp, d.id).length; for (let k = 0, downs = ((i - f.pn.at) % n + n) % n; k < downs; k++) f.onKey({ code: 'ArrowDown' }); // the Downs count from where the highlight opened (a list can open on its first usable row)
    f.onKey({ code: 'Enter' }); return [open, i]; };
  window.__tick = s => { for (let i = 0; i < s * 30; i++) F.update(0, 1000 / 30); };
`);
const ATTACK = 'Enemies. Pick one with \\, then W: the pilots attack.';
check('the hint reads its keys from the key table and says them by their letters, not "then Enter": the pick key ({keynear}) and the order key ({keyorder}); the launch hint is gone with the Launch key (the pilots start out)', J(`uiText('camp.nudge.attack')`) === ATTACK && J(`'Enemies. Pick one with ' + campKeyVar('keynear') + ', then ' + campKeyVar('keyorder') + ': the pilots attack.'`) === ATTACK && J(`UI_TEXT['camp.nudge.attack'].includes('{keyorder}') && UI_TEXT['camp.nudge.attack'].includes('{keynear}')`) && J(`UI_TEXT['camp.nudge.launch'] === undefined && UI_TEXT['camp.help.goalbay'] === undefined`) && J(`CAMPNUDGE.map(h => h.id).join()`) === 'attack', J(`uiText('camp.nudge.attack')`));
// a player who does nothing: the pilots are out from the first second
g.run(`window.F = __fake(1); __tick(5.5);`);
check('nothing is said in the first 5 seconds, and the three pilots are already out', J('__toasts.length') === 0 && J(`campWing(F.camp, 'fighter').length`) === 3 && J('F.camp.bay.fighters') === 0);
g.run(`__tick(10);`);
check('nobody is told to launch (the convoy\'s own message at 10 s is the only word in the first 16 seconds)', J('__toasts.filter(t => /launch/i.test(t[1])).length') === 0 && J('__toasts.some(t => /Convoy to Mars/.test(t[1]))'), JSON.stringify(J('__toasts')));
// the attack hint
g.run(`__tick(14);`);
check('with aliens about, at 26 s, the hint: "' + ATTACK + '"', J('__toasts.some(t => t[1] === ' + JSON.stringify(ATTACK) + ')') && J('(__toasts.find(t => /the pilots attack/.test(t[1])) || [0])[0]') >= 26 && J('(__toasts.find(t => /the pilots attack/.test(t[1])) || [99])[0]') < 26.5, JSON.stringify(J('__toasts')));
g.run(`__tick(20);`);
check('and not again', J('__toasts.filter(t => /the pilots attack/.test(t[1])).length') === 1);
// a player who does what the hint says: the pick key, then W, at once (no list, no second pick)
g.run(`window.F = __fake(1); __tick(20); campSpawn(F.camp, 'raider', F.camp.carrier.x + 900, F.camp.carrier.y); campSpawn(F.camp, 'raider', F.camp.carrier.x + 1400, F.camp.carrier.y + 200); F.onKey({ code: 'Backslash' }); window.__tgt = F.camp.tgt; F.onKey({ code: 'KeyW' }); window.__after = [!!F.pn.pick, F.camp.orders.attack, campPanelOpen(F.pn), campWing(F.camp, 'fighter').every(u => u.order.type === 'attack' && u.order.target === __tgt)];`);
check('with two hostiles about, the backslash picks the nearest and W sends all three pilots at it at once: no list, no sub-list', J('__tgt') !== '' && J('__after').join() === 'false,1,,true', JSON.stringify(J('__after')));
g.run(`window.F = __fake(1); __tick(20); campSpawn(F.camp, 'raider', F.camp.carrier.x + 900, F.camp.carrier.y); F.onKey({ code: 'Backslash' }); F.onKey({ code: 'KeyW' }); __toasts.length = 0; __tick(15);`);
check('a player who ordered the attack before 26 s (the backslash, W, as the hint says) is never told to', J('F.camp.orders.attack') === 1 && !J('__toasts.some(t => /the pilots attack/.test(t[1]))'), JSON.stringify(J('__toasts')));
// the fine print
g.run(`window.F = __fake(2); __tick(40);`);
check('level 2 has no hints (the player has learnt the keys)', !J('__toasts.some(t => /Press [QE]|launch the wing|the pilots attack/i.test(t[1]))') && J('F.camp.t') >= 39000, JSON.stringify(J('__toasts')));
g.run(`window.F = __fake(1); F.onKey({ code: 'Escape' }); __tick(10);`);
check('paused, the clock does not run and no hint is shown', J('__toasts.length') === 0 && J('F.camp.t') === 0);
g.run(`window.F = __fake(1); __tick(30); F.init({ level: 1, seed: 5 }); F.camp = campNew(1, F.P.techs, F.opts); F.onKey({ code: 'Enter' }); __toasts.length = 0; __tick(27);`);
check('the same scene started again (a retry runs init on the same object) hints again: the hint state is reset in init', J('__toasts.filter(t => /the pilots attack/.test(t[1])).length') === 1, JSON.stringify(J('__toasts')));
check('campNudge is quiet with no battle, no state, or a finished battle, and never throws', J('campNudge(null, {})') === null && J('campNudge({}, null)') === null && J(`campNudge(Object.assign(campNew(1, [], {}), { result: 'won', t: 9000 }), {})`) === null);
console.log(failed ? `\n${failed} of ${n} FAILED` : `\nAll ${n} checks passed.`);
process.exit(failed ? 1 : 0);
