// smoke: a kept radio line (the miner's call, the price of answering it, the stray ship's warning) stays up 5 s; the radio lines that come in meanwhile wait and are shown after, in order, none lost (plain Node, no Chrome)
// Card space-game-price-line-held (ORCH for Troy, 24 Nov 2026: "in 1.1 the radio line that tells the price of sending pilots to the miner is overwritten within seconds by Contact and Torpedo down. Give important lines a least hold, about 5 s, N panel"). The rule: src/campsayhold.js (pure); the numbers: CAMP.sayhold in src/campaign.js; the N panel's row `sayhold` (src/camptune.js); the scene shows a line with radioShow and flushes the waiting ones each frame of the battle (src/campaignscene.js); toast takes a hold (src/common.js).
//   A. the table: the hold, the queue, the kept lines (every line campminer.js and campstray.js say, the miner's call), their words, the N panel's row
//   B. the rule: a line shows at once, a kept line starts the hold, the others wait for it and come in order, the queue is short, a kept line is not dropped, no hold with 0
//   C. the scene (on a stand-in): the price line then Contact then Torpedo down; the toast of a kept line is told to stay 5 s; the waiting lines are shown and said together when the hold ends
//   D. the wiring: the flush is in the battle's frame, before the step; toast keeps the longer hold
// Run: node tests/campsayhold.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__shown = []; toast = (s, msg, color, hold) => { __shown.push({ msg, hold: hold | 0 }); };
  window.__said = [];
  window.__fake = () => { const f = Object.create(Campaign.prototype); f.say = lines => lines.forEach(l => __said.push(l)); f.time = { now: 1000 }; f.camp = { ships: [], events: [] }; f.hud = {}; f.mode = 'play'; f.leaving = false; f.mp = null; f.sayR = campSayNew(); return f; };
  window.__say = (f, key, vars) => f.onEvent({ type: 'say', key, vars });
`);

// ---- A. the table ----
{
  const keep = J('CAMP.sayhold.keep');
  check('the hold is 5 s, at most three lines wait, and the kept lines are the miner\'s call, the price (one or two pilots away, or all), the call was bait, the stray ship, and mission 1.3\'s two (the turrets\' key, the last hauler behind: card space-game-13-radio-lines)', J('CAMP.sayhold.ms') === 5000 && J('CAMP.sayhold.queue') === 3 && keep.slice().sort().join() === 'camp.say.distress,camp.say.l13.behind,camp.say.l13.turrets,camp.say.miner.all,camp.say.miner.bait,camp.say.miner.short,camp.say.stray', keep.join());
  check('every kept line has its words (a key with none would show its own name)', keep.every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
  const said = f => [...src(f).matchAll(/campSay\(C, [^']*'(camp\.say\.[a-z.]+)'(?:[^']*'(camp\.say\.[a-z.]+)')?/g)].flatMap(m => m.slice(1).filter(Boolean));
  const price = said('src/campminer.js').concat(said('src/campstray.js'));
  check('the price line and the stray warning the cloud files say are kept lines (campminer.js: short and all; campstray.js: stray)', price.length >= 3 && price.every(k => keep.includes(k)), price.join());
  check('campSayKeep says it from the table: the kept lines yes, Contact and Torpedo down no', J(`campSayKeep('camp.say.miner.short')`) === true && J(`campSayKeep('camp.say.sight')`) === false && J(`campSayKeep('camp.say.torp.down')`) === false && J(`campSayKeep('')`) === false);
  check('the N panel has the row (Radio line hold: CAMP.sayhold.ms, 0 to 15 s) and its words, and the tune kit changes it', J(`CAMP_TUNE.rows.some(r => r.id === 'sayhold' && r.path === 'sayhold.ms' && r.root === 'CAMP')`) && J(`uiText('camp.ui.tune.row.sayhold')`) === 'Hold of the kept radio lines');
}

// ---- B. the rule ----
{
  g.run(`window.R = campSayNew();`);
  const ord = t => ({ text: t, keep: false }), kept = t => ({ text: t, keep: true });
  g.run(`window.__o = t => ({ text: t, keep: false }); window.__kp = t => ({ text: t, keep: true });`);
  check('with nothing up a line is shown at once (and does not start a hold)', J(`campSayOffer(R, 1000, __o('Contact.')).map(l => l.text)`).join() === 'Contact.' && J('R.until') === 0 && J('R.wait.length') === 0);
  check('a kept line is shown at once and holds the radio for 5 s', J(`campSayOffer(R, 2000, __kp('price')).map(l => l.text)`).join() === 'price' && J('R.until') === 7000);
  check('the lines that come in the hold wait: nothing is shown at 3000 or at 4500', J(`campSayOffer(R, 3000, __o('Contact.')).length`) === 0 && J(`campSayOffer(R, 4500, __o('Torpedo down.')).length`) === 0 && J('R.wait.length') === 2);
  check('nothing is due before the hold ends (6999) and both are due at 7000, in the order they came', J('campSayDue(R, 6999).length') === 0 && J(`campSayDue(R, 7000).map(l => l.text)`).join() === 'Contact.,Torpedo down.' && J('R.wait.length') === 0);
  g.run(`window.R = campSayNew(); campSayOffer(R, 0, __kp('price'));`);
  g.run(`campSayOffer(R, 100, __o('a')); campSayOffer(R, 200, __o('b')); campSayOffer(R, 300, __o('c')); campSayOffer(R, 400, __o('d'));`);
  check('only three wait: the oldest goes (a), so b c d come, a stale line is not worth keeping', J(`R.wait.map(l => l.text)`).join() === 'b,c,d');
  g.run(`window.R = campSayNew(); campSayOffer(R, 0, __kp('price')); campSayOffer(R, 100, __kp('call')); campSayOffer(R, 200, __o('a')); campSayOffer(R, 300, __o('b')); campSayOffer(R, 400, __o('c'));`);
  check('a kept line is not the one dropped: the oldest ordinary line is (a), so call b c wait', J(`R.wait.map(l => l.text)`).join() === 'call,b,c', J(`R.wait.map(l => l.text)`).join());
  check('a kept line that waited is shown at 5000 and holds the radio again: the lines behind it wait another 5 s', J(`campSayDue(R, 5000).map(l => l.text)`).join() === 'call' && J('R.until') === 10000 && J('campSayDue(R, 9999).length') === 0 && J(`campSayDue(R, 10000).map(l => l.text)`).join() === 'b,c');
  g.run(`window.R = campSayNew(); campTuneSet('sayhold', 0); campSayOffer(R, 0, __kp('price'));`);
  check('hold 0 (the N panel): a kept line holds nothing, the next line is shown at once', J(`campSayOffer(R, 10, __o('Contact.')).map(l => l.text)`).join() === 'Contact.' && J('R.wait.length') === 0);
  g.run(`campTuneSet('sayhold', 5000);`);
  check('the N panel row gives the hold back (5000)', J('CAMP.sayhold.ms') === 5000);
  check('with no state at all a line is just shown (a scene with no radio state)', J(`campSayOffer(null, 5, __o('x')).map(l => l.text)`).join() === 'x' && J('campSayDue(null, 5).length') === 0);
}

// ---- C. the scene ----
{
  g.run(`window.F = __fake(); __shown.length = 0; __said.length = 0; F.time.now = 1000; __say(F, 'camp.say.miner.short', { name: 'HAWK' });`);
  check('the price line is shown at once and is told to stay 5 s', J('__shown.length') === 1 && J('__shown[0].msg') === 'HAWK away at the miner. We are short here.' && J('__shown[0].hold') === 5000 && J('__said[0]') === 'HAWK away at the miner. We are short here.', J('JSON.stringify(__shown)'));
  g.run(`F.time.now = 3000; __say(F, 'camp.say.sight', { dir: 'north', what: 'gunship', km: 12 }); F.time.now = 4000; __say(F, 'camp.say.torp.down');`);
  check('Contact and Torpedo down, two and three seconds on, do not replace it: nothing new is shown or said, they wait', J('__shown.length') === 1 && J('__said.length') === 1 && J('F.sayR.wait.length') === 2);
  g.run(`F.time.now = 5999; F.radioShow(campSayDue(F.sayR, F.time.now));`);
  check('at 5999 the price line has been up 4999 ms: still held', J('__shown.length') === 1);
  g.run(`F.time.now = 6000; F.radioShow(campSayDue(F.sayR, F.time.now));`);
  check('at 6000 (5 s after it) the two waiting lines are shown and said, in order, together: Contact then Torpedo down', J('__shown.length') === 3 && J('__shown[1].msg').startsWith('Contact, north') && J('__shown[2].msg') === 'Torpedo down.' && J('__said.length') === 3 && J('__shown[1].hold') === 0 && J('__said[2]') === 'Torpedo down.', J('JSON.stringify(__shown)'));
  g.run(`window.F = __fake(); __shown.length = 0; F.time.now = 100; __say(F, 'camp.say.sight', { dir: 'east', what: 'skiff', km: 3 }); F.time.now = 200; __say(F, 'camp.say.torp.down');`);
  check('with no kept line up the radio is as it was: each line is shown at once, one replacing the next', J('__shown.length') === 2 && J('F.sayR.wait.length') === 0);
  g.run(`window.F = __fake(); F.sayR = null; __shown.length = 0; __say(F, 'camp.say.torp.down');`);
  check('a scene with no radio state yet makes it on the first line (a stand-in scene, a resumed battle)', J('__shown.length') === 1 && J('F.sayR && F.sayR.wait.length') === 0);
}

// ---- D. the wiring ----
{
  const s = src('src/campaignscene.js'), upd = s.indexOf('update(time, dt) {'), play = s.indexOf("if (this.mode === 'play' && !C.result) {", upd), flush = s.indexOf('campSayDue(this.sayR, this.time.now)', play), step = s.indexOf('campStep(C, ', play);
  check('the waiting lines are flushed in the battle\'s frame (only in play mode), before the step', upd > 0 && play > upd && flush > play && step > flush);
  check('a new battle starts with a fresh radio state (init makes campSayNew)', /this\.sayR = campSayNew\(\)/.test(s));
  check('the script is in index.html after campminer.js, and toast keeps the longer of its own hold and the line\'s', /campminer\.js"><\/script>\s*<script src="src\/campsayhold\.js">/.test(src('index.html')) && /Math\.max\(TOAST\.hold, hold \| 0\)/.test(src('src/common.js')));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nSAY HOLD FAIL (${failed} of ${n})` : `\nSAY HOLD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
