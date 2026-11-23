// smoke: the Campaign's bay gauge says what its numbers are (plain Node, no Chrome)
// Card space-game-night-ux, finding 5 (docs/night/ux.md; paintHud in src/campaignscene.js). It read "BAY  6+2    OUT  0" and nothing said that was six fighters and two escorts (since card space-game-cut-escorts: eight fighters and no escorts). Now
// "BAY  fighters 3   OUT 0" (labels first, so there is no plural to get wrong), kept to 40 letters so it stays clear of the toast band (which starts at x 364).
// The wing is launched the way the pilot does it since the card one-list-keys: Q opens the fleet list, Down to "Launch the wing", Enter. A digit does nothing in flight.
// Run: node tests/uxbay.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {}; shipcompSay = () => true;
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys'].forEach(k => { h[k] = { text: '', setText(t) { h[k].text = t; return h[k]; } }; }); f.hud = h;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
  // give a row of a list as the pilot does: the list's key (Q or P), Down to the row, Enter
  window.__pick = (f, id, row) => { const i = campPanelList(f.camp, id).findIndex(r => r.id === row); f.onKey({ code: CAMP_PANELS.panels.find(p => p.id === id).code }); for (let k = 0; k < i; k++) f.onKey({ code: 'ArrowDown' }); f.onKey({ code: 'Enter' }); return i; };
  window.F = __fake(1); F.onKey({ code: 'Enter' }); F.update(0, 33);
`);
check('at the start: three fighters (the pilots), none out, in words', J('F.hud.bay.text') === 'BAY  fighters 3   OUT 0', J('F.hud.bay.text'));
g.run(`F.onKey({ code: 'Digit1' }); for (let i = 0; i < 30 * 6; i++) F.update(0, 1000 / 30);`);
check('a digit is no order in flight (card one-list-keys): after 1 and six seconds the gauge has not moved', J('F.hud.bay.text') === 'BAY  fighters 3   OUT 0', J('F.hud.bay.text'));
g.run(`window.__at = __pick(F, 'squads', 'launch'); for (let i = 0; i < 30 * 6; i++) F.update(0, 1000 / 30);`);
check('after Launch (W, Enter on the Launch row, the top of the all-squads list) the bay is empty and three are out', J('F.hud.bay.text') === 'BAY  fighters 0   OUT 3', J('F.hud.bay.text'));
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); F.camp.bay.fighters = 1; F.update(0, 33);`);
check('one fighter has no plural to get wrong', J('F.hud.bay.text') === 'BAY  fighters 1   OUT 0');
g.run(`window.F = __fake(2); F.onKey({ code: 'Enter' }); F.update(0, 33);`);
check('level 2 reads the same (the second bay of the tech makes the pilots stronger, not more)', J('F.hud.bay.text') === 'BAY  fighters 3   OUT 0' && (g.run(`window.F = __fake(2); F.P.techs = ['bay2']; F.camp = campNew(2, ['bay2'], F.opts); F.onKey({ code: 'Enter' }); F.update(0, 33);`), J('F.hud.bay.text') === 'BAY  fighters 3   OUT 0'), J('F.hud.bay.text'));
check('the line fits: 40 letters at most with three-digit numbers, and ends left of the toast band (x 364)', J(`uiText('camp.ui.baywords', { f: 999, e: 999, out: 999 })`).length <= 40 && 24 + 40 * 8.4 < 364, J(`uiText('camp.ui.baywords', { f: 999, e: 999, out: 999 })`).length);
check('the old words are still in the table (nothing else is removed)', J(`uiText('camp.ui.bay')`) === 'BAY' && J(`uiText('camp.ui.out')`) === 'OUT');
check('the scene no longer builds the gauge from "+" and the numbers', !/C\.bay\.fighters \+ '\+'/.test(readFileSync(ROOT + '/src/campaignscene.js', 'utf8')));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX BAY FAIL (${failed} of ${n})` : `UX BAY PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
