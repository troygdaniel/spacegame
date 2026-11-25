// smoke: mission 1.3 has two kept radio lines: once at the first raid it says to hold the turrets key (the key table's name), and it warns, as the stray warning does, when the last hauler falls behind the convoy (plain Node, no Chrome)
// Card space-game-13-radio-lines (ORCH for Troy, 24 Nov 2026: "Troy said yes to both"). The rules: src/camp13lines.js (pure; camp13Tick is called once a tick from campTick, src/campaign.js); the numbers: CAMP.l13; the words: content/text/camp13.md; both lines are kept ones (CAMP.sayhold.keep: they stay up 5 s, src/campsayhold.js); the distance is the N panel's row `haulgap`.
//   A. the table: the numbers, the two lines and their words, the key's name from the key table (a remap moves it), kept, the N panel's row
//   B. the turrets line: not before the first raid, once, CAMP.l13.turretsWait s after it comes, never in 1.1, 1.2 or another level
//   C. the last hauler: the strung-out convoy is not "behind"; a hauler dragged back is, after the grace and again every 25 s; with one ship left or none behind there is no warning; the N panel's distance moves it
//   D. the wiring: the tick is in campTick after the beats, the script is in index.html after campsayhold.js
// Run: node tests/camp13lines.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = (level, mission, seed) => { window.C = campNew(level, [], { seed: seed || 1, mission, god: true }); window.__log = []; return !!C; };
  window.__step = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) { campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'say') __log.push({ key: e.key, text: uiText(e.key, e.vars), at: Math.round(campMissionClock(C) * 10) / 10 }); }); C.events.length = 0; } };
  window.__seen = key => __log.filter(l => l.key === key);
  window.__haulers = () => C.ships.filter(u => u.kind === 'freighter' && u.hp > 0);
`);

// ---- A. the table ----
{
  check('the numbers: the turrets line 3 s after the first raid, a gap of 1100 px (more than the 744 px the haulers leave apart), 4 s of grace, again every 25 s', J('JSON.stringify(CAMP.l13)') === '{"turretsWait":3,"gapFar":1100,"gapGrace":4,"gapAgain":25}', J('JSON.stringify(CAMP.l13)'));
  check('both lines are kept ones (they stay up 5 s and the lines that come in then wait)', J(`campSayKeep('camp.say.l13.turrets')`) === true && J(`campSayKeep('camp.say.l13.behind')`) === true);
  check('the turrets line names the key from the key table: Space, as the table has it', J(`uiText('camp.say.l13.turrets')`) === 'Pirates. Hold Space: the turrets fire at ships in reach.' && J('CAMP_KEYS.fire.k') === 'Space', J(`uiText('camp.say.l13.turrets')`));
  g.run(`window.__was = CAMP_KEYS.fire.k; CAMP_KEYS.fire.k = 'Z';`);
  check('a remap moves it (the words are read from the table, no letter is typed in the line)', J(`uiText('camp.say.l13.turrets')`) === 'Pirates. Hold Z: the turrets fire at ships in reach.' && !/Space/.test(src('content/text/camp13.md').split('| camp.say.l13.turrets |')[1].split('\n')[0]));
  g.run(`CAMP_KEYS.fire.k = __was;`);
  check('the warning says who and how far, curt (about 12 words), and what to do', J(`uiText('camp.say.l13.behind', { name: 'Hauler 3', km: 120 })`) === 'Hauler 3 is 120 km behind the convoy. Guard her with a squad.');
  check('the N panel has the distance (Last hauler\'s gap before the warning: CAMP.l13.gapFar, 300 to 4000 px) and its words', J(`CAMP_TUNE.rows.some(r => r.id === 'haulgap' && r.root === 'CAMP' && r.path === 'l13.gapFar' && r.min === 300 && r.max === 4000)`) && J(`uiText('camp.ui.tune.row.haulgap')`) === 'Last hauler\'s gap before the warning');
}

// ---- B. the turrets line ----
{
  g.run(`__new(1, 2, 1);`);
  check('mission 1.3 is the haulers\' (the id the rule reads) and its first wave is the pirates on the lead hauler', J('C.L.mid') === 'haulers' && J('C.L.waves[0].say') === 'camp.say.rim7' && J('C.waves.length') === 6);
  g.run(`__step(5);`);
  check('before the first raid nothing is said about the turrets', J('C.waves[0].started') === false && J(`__seen('camp.say.l13.turrets').length`) === 0);
  g.run(`__step(200);`);
  const w0 = J('C.waves[0].at'), told = J(`__seen('camp.say.l13.turrets')`);
  check('the first raid came and the line was said, once', J('C.waves[0].started') === true && told.length === 1, JSON.stringify(told));
  check('it came CAMP.l13.turretsWait (3 s) after the raid, after the wave\'s own radio line, not on the same step', told.length === 1 && told[0].at - w0 >= 3 && told[0].at - w0 < 4, `raid at ${w0}, line at ${told[0] && told[0].at}`);
  g.run(`__step(40);`);
  check('it is not said again later in the same battle (once only), even with more raids', J(`__seen('camp.say.l13.turrets').length`) === 1 && J('C.waves.filter(w => w.started).length') >= 2);
  g.run(`__new(1, 0, 1); __step(120);`);
  check('mission 1.1 says nothing of the turrets', J(`__seen('camp.say.l13.turrets').length`) === 0 && J('C.L.mid') !== 'haulers');
  g.run(`__new(1, 1, 1); __step(120);`);
  check('mission 1.2 says nothing of the turrets and nothing of a hauler behind', J(`__seen('camp.say.l13.turrets').length`) === 0 && J(`__seen('camp.say.l13.behind').length`) === 0);
}

// ---- C. the last hauler ----
{
  g.run(`__new(1, 2, 1); __step(40);`);
  check('three haulers are under way, strung out 12 s apart: 744 px between neighbours, under the gap, so the convoy is not "behind"', J('__haulers().length') === 3 && J('camp13Gap(C)') === null, J('JSON.stringify(__haulers().map(u => [u.cid, Math.round(u.x)]))'));
  g.run(`__step(20);`);
  check('flown on, nothing is said of a hauler behind (the whole road, left to themselves)', J(`__seen('camp.say.l13.behind').length`) === 0);
  g.run(`window.__rear = () => __haulers().slice().sort((a, b) => (C.lane[a.cid] || 0) - (C.lane[b.cid] || 0))[0]; { const r = __rear(); r.x -= 1500; window.__rid = r.id; window.__pin = { x: r.x, y: r.y }; }
    window.__stepPin = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) { const r = C.by[__rid]; r.x = __pin.x; r.y = __pin.y; campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'say') __log.push({ key: e.key, text: uiText(e.key, e.vars), at: Math.round(campMissionClock(C) * 10) / 10 }); }); C.events.length = 0; } };`); // the dragged hauler is held where she was put: left to herself she would steer for Earth and close the gap
  const gap = J('camp13Gap(C)');
  check('a hauler 1500 px back is the last one, and the gap says who and how far', gap && gap.u.id === J('__rid') && gap.d > 1100, JSON.stringify(gap && { id: gap.u.id, d: Math.round(gap.d) }));
  g.run(`__log.length = 0; C.l13.since = -1; C.l13.said = -1; __stepPin(3);`);
  check('3 s of it is inside the grace (4 s): nothing is said yet', J(`__seen('camp.say.l13.behind').length`) === 0);
  g.run(`__stepPin(2);`);
  const first = J(`__seen('camp.say.l13.behind')`);
  check('after the grace the radio says it once', first.length === 1, JSON.stringify(first));
  check('the words: her name and the distance in km (ten px a km on the HUD, the stray warning\'s helper: the line says the distance to the hauler ahead of her)', /^Hauler 3 is \d+ km behind the convoy\. Guard her with a squad\.$/.test(first[0] && first[0].text) && Math.abs(+/is (\d+) km/.exec(first[0].text)[1] - J('Math.round(camp13Gap(C).d / 10)')) <= 2, first[0] && first[0].text);
  g.run(`__stepPin(20);`);
  check('and not again inside 25 s', J(`__seen('camp.say.l13.behind').length`) === 1);
  g.run(`__stepPin(8);`);
  check('again after 25 s, while it lasts', J(`__seen('camp.say.l13.behind').length`) === 2, J(`JSON.stringify(__seen('camp.say.l13.behind'))`));
  g.run(`{ const r = C.by[__rid]; const ahead = __haulers().filter(u => u.id !== r.id)[0]; r.x = ahead.x - 400; r.y = ahead.y; } __log.length = 0; __step(30);`);
  check('close up again: the warning stops, and the clock of the grace starts over (C.l13.since is -1)', J('camp13Gap(C)') === null && J(`__seen('camp.say.l13.behind').length`) === 0 && J('C.l13.since') === -1);
  g.run(`{ const ru = __haulers().sort((a, b) => (C.lane[a.cid] || 0) - (C.lane[b.cid] || 0)); ru[0].hp = 0; }`);
  check('with two haulers left and close there is no gap; with one left there is no convoy to fall behind', J('camp13Gap(C)') === null && (() => { g.run(`__haulers().slice(1).forEach(u => { u.hp = 0; });`); return J('camp13Gap(C)') === null && J('__haulers().length') === 1; })());
  g.run(`__new(1, 2, 1); __step(40); CAMP.l13.gapFar = 600;`);
  check('the N panel\'s distance moves it: at 600 px the 744 px between neighbours is a gap, and the last hauler is told', J('camp13Gap(C) && camp13Gap(C).d > 600') === true);
  g.run(`CAMP.l13.gapFar = 1100;`);
}

// ---- D. the wiring ----
{
  const c = src('src/campaign.js'), beats = c.indexOf('campBeats(C); // a saved miner'), tick = c.indexOf('camp13Tick(C);', beats);
  check('the tick is called once a step from campTick, right after the beats', beats > 0 && tick > beats && tick - beats < 400);
  check('the script is in index.html after campsayhold.js, and the words are in their file and the table', /campsayhold\.js"><\/script>\s*<script src="src\/camp13lines\.js">/.test(src('index.html')) && src('content/text/camp13.md').includes('| camp.say.l13.behind |') && src('src/contenttables.js').includes("'camp.say.l13.turrets'"));
  check('the rule reads nothing of the cloud files but their public helpers (campConvoyName, campNavKm); it edits none of them: campstray.js, campnav.js, campbeats.js and campminer.js are not in this card', !/campstray|campbeats|campminer/.test(src('src/camp13lines.js').replace(/\/\/.*$/gm, '')));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMP 1.3 LINES FAIL (${failed} of ${n})` : `\nCAMP 1.3 LINES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
