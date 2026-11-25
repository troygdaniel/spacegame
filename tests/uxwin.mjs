// smoke: the Campaign's win card says how it went (plain Node, no Chrome)
// Card space-game-night-ux, finding 8 (docs/night/ux.md; src/campwin.js, showWon in src/campaignscene.js). The win card was two story lines and "Enter continue". It now has one more line, for
// reading and not said aloud: "Won in 3:12. Carrier hull 420 of 600, 2 of 2 convoys delivered, 1 of your ships lost." Levels with no convoys (2 and 3) leave them out.
// Run: node tests/uxwin.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(); belt(g, 1); // the old Level 1, the belt, as level 1: this suite was written for it and pins its missions (card space-game-l1-rim-missions)
g.run('campBlinkSet(true)'); // card space-game-keys7-trim: the warp blink (its row and its tech) is switched off in the game; this suite is about it, so it switches it on
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__cards = []; window.__said = []; window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {}; shipcompSay = t => { __said.push(t); return true; };
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.showCard = function (title, lines, hint, tall) { __cards.push({ title, lines, hint, tall }); this.card = [{ destroy() {} }]; this.panel = true; };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
  var C = campNew(1, [], { seed: 3 }); C.t = 192000; C.carrier.hp = 420; C.delivered = 2; C.lostShips = 1;
`);
check('level 1: time, hull, convoys delivered of those sent, ships lost', J('campWinLine(C)') === 'Won in 3:12. Carrier hull 420 of 600, 2 of 2 convoys delivered, 1 of your ships lost.', J('campWinLine(C)'));
g.run(`C.delivered = 1; C.lostShips = 0; C.t = 59400;`);
check('another battle: 0:59, one convoy of two, none lost', J('campWinLine(C)') === 'Won in 0:59. Carrier hull 420 of 600, 1 of 2 convoys delivered, 0 of your ships lost.', J('campWinLine(C)'));
g.run(`var C2 = campNew(2, [], { seed: 3 }); C2.t = 125000; C2.carrier.hp = 600; C2.lostShips = 3;`);
check('level 2 has no convoys, so the line has none', J('campWinLine(C2)') === 'Won in 2:05. Carrier hull 600 of 600, 3 of your ships lost.', J('campWinLine(C2)'));
check('no battle says nothing and does not throw', J('campWinLine(null)') === '' && J('campWinLine({})') === '');
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); F.sync = () => {}; __cards.length = 0; __said.length = 0; F.camp.t = 130000; campEnd(F.camp, 'won', 'mother'); F.update(0, 33);`);
const card = J('__cards.pop()');
const story = J(`campStory(1, 'after')`);
check('the win card: the story lines of the level (the three of the belt), then the result line; the hint is "Enter  continue" as before', J('F.mode') === 'won' && story.length === 3 && card.lines.length === 4 && card.lines.slice(0, 3).join('|') === story.join('|') && /^Won in 2:10\. /.test(card.lines[3]) && card.hint === 'Enter  continue', JSON.stringify(card));
check('the voice says the story, not the numbers (however the lines are split into utterances)', /Mothership destroyed\./.test(J('__said.join(" ")')) && /refit\./.test(J('__said.join(" ")')) && !/Won in|convoys delivered/.test(J('__said.join(" ")')), JSON.stringify(J('__said')));
g.run(`F.onKey({ code: 'Enter' })`);
check('Enter still goes to the pick (three techs on level 1)', J('F.mode') === 'pick' && J('F.choices.length') === 3);
check('the line fits the card: 120 letters at most with a convoy and two-digit numbers (the card wraps it in two lines)', J(`campWinLine(Object.assign(campNew(1, [], {}), { t: 3599000, delivered: 12, lostShips: 12 }))`).length <= 120);
check('the words are in content/text/ui.md and the code table', J(`uiText('camp.win.result', { time: 'T', hull: 1, max: 2, lost: 3 })`) === 'Won in T. Carrier hull 1 of 2, 3 of your ships lost.');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX WIN FAIL (${failed} of ${n})` : `UX WIN PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
