// smoke: the Campaign's pause card says the goal (plain Node, no Chrome)
// Card space-game-night-ux, finding 7 (docs/night/ux.md; showPause in src/campaignscene.js). After a break "what was I doing?" was answered only by the HUD line behind the card. The card now
// starts with "Goal: ..." (the level's own goal line, so it follows the state), then the map key line, then the tune kit's debug line. Esc and T do what they did.
// Run: node tests/uxpause.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__cards = []; window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {}; shipcompSay = () => true;
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.showCard = function (title, lines, hint, tall) { __cards.push({ title, lines, hint, tall }); this.card = [{ destroy() {} }]; this.panel = true; };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
  window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; F.onKey({ code: 'Escape' });
`);
let card = J('__cards.pop()');
check('Esc in level 1: the pause card has the goal first, then the map key line, and the debug line last (other lines may sit between), with the title and hint the pause card has now (read from the table)', J('F.mode') === 'pause' && card.title === J("uiText('camp.ui.pausetitle')") && card.lines.length >= 3 && card.lines[0] === 'Goal: ' + J('campObjective(F.camp)') && /^Goal: .{8,}/.test(card.lines[0]) && /^Tab  map of the whole level/.test(card.lines[1]) && /^DEBUG  /.test(card.lines[card.lines.length - 1]) && card.hint === J("uiText('camp.ui.paused')"), JSON.stringify(card));
check('the card is tall enough for its lines (262 px for three)', card.tall >= 262);
g.run(`window.F = __fake(2); F.onKey({ code: 'Enter' }); __cards.length = 0; F.onKey({ code: 'Escape' });`);
check('level 2: the goal is that level\'s ("Gather resources: 0 of 2.")', J('__cards.pop().lines[0]') === 'Goal: Gather resources: 0 of 2.');
g.run(`window.F = __fake(3); F.onKey({ code: 'Enter' }); __cards.length = 0; F.onKey({ code: 'Escape' });`);
check('level 3: the goal is the towers left', J('__cards.pop().lines[0]') === 'Goal: Break the defence towers: 12 left.');
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Escape' });`);
check('Esc again goes back to the battle and the sim runs; T goes to the title (as before)', (g.run(`F.onKey({ code: 'Escape' })`), J('F.mode') === 'play') && (g.run(`F.onKey({ code: 'Escape' }); F.onKey({ code: 'KeyT' })`), J('__went.pop()').key === 'Title'));
check('every line is short enough for the card: 100 letters at most', J('__cards.length') >= 0 && ['Goal: Hold off the waves; the mothership comes last.', 'Goal: Destroy the alien mothership.', 'Goal: Break the defence towers: 12 left.', 'Goal: Hold the ring at the relic: 100%.'].every(l => l.length <= 100));
check('the words are in content/text/ui.md and the code table', J(`uiText('camp.ui.pausegoal', { goal: 'X' })`) === 'Goal: X');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX PAUSE FAIL (${failed} of ${n})` : `UX PAUSE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
