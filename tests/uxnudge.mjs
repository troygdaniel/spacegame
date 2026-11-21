// smoke: the Campaign's first-minute hints: press 1, then press 2, once each, level 1 only (plain Node, no Chrome)
// Card space-game-night-ux, finding 6 (docs/night/ux.md; src/campnudge.js, update in src/campaignscene.js). A player who reads "Launch the wing" and then flies about is told, at 6 s, "Press Q, then 1, to
// launch the wing."; with the wing out and aliens about, at 26 s, "Press Q, then 2, to send the fighters at the aliens." Each is shown once, never if the player has already done it, and only in level 1.
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
  window.__tick = s => { for (let i = 0; i < s * 30; i++) F.update(0, 1000 / 30); };
`);
// a player who does nothing
g.run(`window.F = __fake(1); __tick(5.5);`);
check('nothing is said in the first 5 seconds', J('__toasts.length') === 0);
g.run(`__tick(1);`);
check('at 6 s: "Press Q, then 1, to launch the wing."', J('__toasts.map(t => t[1])').join() === 'Press Q, then 1, to launch the wing.' && J('__toasts[0][0]') >= 6 && J('__toasts[0][0]') < 6.2, JSON.stringify(J('__toasts')));
g.run(`__tick(10);`);
check('and it is not said again (the convoy\'s own message at 10 s is the only other)', J('__toasts.filter(t => /launch the wing/.test(t[1])).length') === 1 && J('__toasts.some(t => /Convoy to Mars/.test(t[1]))'), JSON.stringify(J('__toasts')));
// a player who launches at 3 s
g.run(`window.F = __fake(1); __tick(3); F.onKey({ code: 'KeyQ' }); F.onKey({ code: 'Digit1' }); __toasts.length = 0; __tick(10);`);
check('a player who launched at 3 s is never told to', !J('__toasts.some(t => /Press Q, then 1/.test(t[1]))'), JSON.stringify(J('__toasts')));
// the attack hint
g.run(`__tick(14);`);
check('with the wing out and aliens about, at 26 s, the second hint: "Press Q, then 2, to send the fighters at the aliens."', J('__toasts.some(t => t[1] === "Press Q, then 2, to send the fighters at the aliens.")') && J('__toasts.find(t => /Press Q, then 2/.test(t[1]))[0]') >= 26, JSON.stringify(J('__toasts')));
g.run(`__tick(20);`);
check('and not again', J('__toasts.filter(t => /Press Q, then 2/.test(t[1])).length') === 1);
g.run(`window.F = __fake(1); __tick(3); F.onKey({ code: 'KeyQ' }); F.onKey({ code: 'Digit1' }); __tick(20); F.onKey({ code: 'KeyQ' }); F.onKey({ code: 'Digit2' }); __toasts.length = 0; __tick(15);`);
check('a player who ordered the attack before 26 s is never told to', !J('__toasts.some(t => /Press Q, then 2/.test(t[1]))'), JSON.stringify(J('__toasts')));
// the fine print
g.run(`window.F = __fake(2); __tick(40);`);
check('level 2 has no hints (the player has learnt the keys)', !J('__toasts.some(t => /Press [12]/.test(t[1]))'), JSON.stringify(J('__toasts')));
g.run(`window.F = __fake(1); F.onKey({ code: 'Escape' }); __tick(10);`);
check('paused, the clock does not run and no hint is shown', J('__toasts.length') === 0 && J('F.camp.t') === 0);
g.run(`window.F = __fake(1); __tick(8); F.init({ level: 1, seed: 5 }); F.camp = campNew(1, F.P.techs, F.opts); F.onKey({ code: 'Enter' }); __toasts.length = 0; __tick(7);`);
check('the same scene started again (a retry runs init on the same object) hints again: the hint state is reset in init', J('__toasts.filter(t => /Press Q, then 1/.test(t[1])).length') === 1, JSON.stringify(J('__toasts')));
check('campNudge is quiet with no battle, no state, or a finished battle, and never throws', J('campNudge(null, {})') === null && J('campNudge({}, null)') === null && J(`campNudge(Object.assign(campNew(1, [], {}), { result: 'won', t: 9000 }), {})`) === null);
check('the table is plain data: ids, the level, the second, a test, and words that are in content/text/ui.md', J('CAMPNUDGE.map(h => h.id).join()') === 'launch,attack' && J('CAMPNUDGE.every(h => h.level === 1 && h.at > 0 && typeof h.when === "function" && uiText(h.key) !== h.key)'));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX NUDGE FAIL (${failed} of ${n})` : `UX NUDGE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
