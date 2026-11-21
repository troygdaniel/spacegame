// smoke: the Campaign's story is spoken line by line, so the default Short voice still says what to do (plain Node, no Chrome)
// Card space-game-night-ux, finding 1 (docs/night/ux.md). Short, the default of Settings > Sound > Spoken replies, speaks the first sentence or two of what it is given. The scene
// used to give it all of a story card joined into one text, so the setting was spoken and the line that says what to do was cut ("Launch the wing, cover the convoys, and kill their
// mothership."). Now each line is its own utterance (they queue, the voice says one at a time). Checks: for each level the intro and the win card call shipcompSay once per line, and what
// Short makes of each of them, joined, holds the tasking of the level; Full says everything; a one-line message is said as it was.
// Run: node tests/uxvoice.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(); belt(g, 1); // the old Level 1, the belt, as level 1: this suite was written for it and pins its missions (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__said = []; shipcompSay = text => { __said.push(text); return true; };
  window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {};
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); __said.length = 0; return f; };
`);
const tasking = { 1: 'SHIP panel', 2: 'Find it first', 3: 'Break the defence towers' }; // the words of the intro that say what to do (the curt lines of the belt, card space-game-campaign-belt)
for (const lv of [1, 2, 3]) {
  g.run(`VOICE.spoken = 'short'; window.F = __fake(${lv}); F.showIntro();`);
  const said = J('__said'), story = J(`campStory(${lv}, 'before')`);
  check(`level ${lv} intro: the voice is given each story line on its own (${story.length} lines), not one joined text`, said.length === story.length && said.every((s, i) => s === story[i]), JSON.stringify(said));
  const heard = said.map(s => J(`voiceSpokenText(${JSON.stringify(s)})`)).join(' ');
  check(`level ${lv} intro, Short: what is heard holds the tasking ("${tasking[lv]}...")`, heard.includes(tasking[lv]), heard);
  g.run(`VOICE.spoken = 'full'`);
  check(`level ${lv} intro, Full: everything is heard`, said.map(s => J(`voiceSpokenText(${JSON.stringify(s)})`)).join(' ') === story.join(' '));
}
g.run(`VOICE.spoken = 'short'; window.F = __fake(1); F.showWon();`);
check('the win card of level 1, Short: the last line ("refit.") is heard (a line was cut before)', J('__said.map(s => voiceSpokenText(s)).join(" ")').includes('refit.'), J('__said').join('|'));
g.run(`window.F = __fake(1); F.say(['One line only.']);`);
check('a single line (a wave, a convoy) is said exactly as before', J('__said').join('|') === 'One line only.');
g.run(`window.F = __fake(1); F.say([]); F.say(['', 'x']);`);
check('no lines say nothing, and an empty line is skipped', J('__said').join('|') === 'x');
check('the scene says nothing joined any more: no lines.join in say()', !/say\(lines\) \{[^}]*lines\.join/.test(readFileSync(ROOT + '/src/campaignscene.js', 'utf8')));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX VOICE FAIL (${failed} of ${n})` : `UX VOICE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
