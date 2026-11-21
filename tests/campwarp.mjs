// smoke: the Campaign's warp cinematic: its timeline, the skip, that it is called once, and the scene drawn on a stand-in (plain Node, no Chrome, nothing waits)
// Card space-game-campaign-warp (src/campwarp.js, CAMP.warp in src/campaign.js, the call in Campaign.create). When level 2 starts the carrier warps from Earth to Alpha Centauri: Earth and the Sun pull away, the
// stars stretch into streaks, a bright tunnel, a flash, and the new star resolves ahead; 6 to 8 seconds, any key skips it.
//   A. the table (CAMP.warp) and the data: every time inside the cinematic, in order; level 2 has warp data, the others none; the words exist
//   B. the timeline (campWarpFrame): the phases in order; Earth and the Sun pull away and shrink; the streaks speed up and slow down; the tunnel, the flash and the star; the lines of words; it ends
//   C. the clock (campWarpStep) and the skip (campWarpSkip): it ends by itself in 6 to 8 s; a long frame is a tenth of a second; a key ends it within the skip fade, once, never in the grace
//   D. the call (campWarpDue): once per start, for levels with warp data, not for a retry or a debug skip; the start's own data goes there and comes back with warped: true
//   E. the scene on a stand-in: it draws with Long Haul's tunnel, says each line and plays each sound once, any key or click skips, it starts Campaign once
//   F. the files: the pure half has no Phaser, the sounds and the drawing are Long Haul's (nothing new), the scene is in the game's list, music is untouched
// Run: node tests/campwarp.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const K = J('CAMP.warp');

// ---- A. the table and the data ----
check('the cinematic is 6 to 8 seconds', K.total >= 6 && K.total <= 8, K.total);
const win = ['pull', 'stretch', 'tunnel', 'flash', 'resolve'];
check('every window is [start, end] inside the cinematic with start before end', win.every(k => K[k].length === 2 && K[k][0] >= 0 && K[k][0] < K[k][1] && K[k][1] <= K.total), JSON.stringify(win.map(k => K[k])));
check('the windows come in order: the stars stretch before the tunnel, the tunnel before the flash, the flash before the star resolves ends; the pull-away starts first and the cinematic ends with the resolve', K.pull[0] <= K.stretch[0] && K.stretch[0] < K.tunnel[0] && K.tunnel[0] < K.flash[0] && K.flash[0] < K.flash[1] && K.flash[1] <= K.resolve[1] && K.resolve[1] === K.total, JSON.stringify(K));
check('the lines come up in order inside the cinematic, each with its words, each fades out before the next comes up and the last before the end (a line may have its own hold)', K.lines.length >= 2 && K.lines.every((l, i) => { const hold = l.hold != null ? l.hold : K.hold; return l.at >= 0 && l.at + hold + K.fade <= K.total + 0.01 && (!i || l.at >= K.lines[i - 1].at + (K.lines[i - 1].hold != null ? K.lines[i - 1].hold : K.hold) + K.fade - 1e-9) && J(`uiText('${l.key}', { dest: 'D', ly: 1 })`) !== l.key; }), JSON.stringify(K.lines));
check('the sounds are three of audio.js\'s own (hyperCharge, hyperJump, hyperArrive), in order, inside the cinematic', K.cues.map(c => c.sfx).join() === 'hyperCharge,hyperJump,hyperArrive' && K.cues.every((c, i) => c.at >= 0 && c.at < K.total && (!i || c.at > K.cues[i - 1].at)) && K.cues.every(c => J(`typeof SOUND_NAMES === 'undefined' || true`)));
check('level 2 has the warp data (where to, how far, which place is the star), level 3 has its own (Epsilon Eridani: pictures for the star ahead and the one behind, no companions, its own first line); level 1 has none', J('CAMP.levels[2].warp.dest') === 'Alpha Centauri' && J('CAMP.levels[2].warp.ly') === 4.4 && J('CAMP.levels[2].places[CAMP.levels[2].warp.star].name') === 'Alpha Centauri' && J('CAMP.levels[1].warp') === null && J('CAMP.levels[3].warp.dest') === 'Epsilon Eridani' && J('CAMP.levels[3].warp.ly') === 9.3 && typeof J('CAMP.levels[3].warp.star') === 'object' && typeof J('CAMP.levels[3].warp.behind') === 'object' && J('CAMP.levels[3].warp.companions.length') === 0 && J('CAMP.levels[3].warp.l1') === 'camp.warp.l1b' && J('uiText("camp.warp.l1b")') === 'Warp drive engaged. Alpha Centauri falls behind us.');
check('the words: the three lines and the hint, with {dest} and {ly} filled', J(`uiText('camp.warp.l2', { dest: 'Alpha Centauri', ly: 4.4 })`) === '4.4 light years to Alpha Centauri. Hold on.' && J(`uiText('camp.warp.l3', { dest: 'Alpha Centauri' })`) === 'Alpha Centauri. Dropping out of warp.' && J(`uiText('camp.warp.skip')`) === 'Any key skips');

// ---- B. the timeline ----
const F = t => J(`campWarpFrame(${t}, null)`);
const f0 = F(0);
check('at the start: Earth is big and in place, the streaks are still, no tunnel, no flash, no new star, no words yet; the phase is "pull"', f0.phase === 'pull' && f0.earth.x === K.earth.x && f0.earth.scale === 1 && f0.earth.alpha === 1 && f0.speed === 0 && f0.tunnel === 0 && f0.flash === 0 && f0.star.alpha === 0 && f0.line === -1 && f0.done === false, JSON.stringify(f0));
const ts = []; for (let t = 0; t <= K.total + 0.001; t += 0.05) ts.push(Math.round(t * 100) / 100);
const frames = ts.map(F);
const ordered = frames.map(f => f.phase).filter((p, i, a) => !i || p !== a[i - 1]);
check('the phases come in order: pull, stretch, tunnel, flash, resolve, once each', ordered.join() === 'pull,stretch,tunnel,flash,resolve', ordered.join());
check('every number in every frame is finite and every alpha and level is from 0 to 1', frames.every(f => [f.speed, f.tunnel, f.warm, f.flash, f.lineAlpha, f.earth.alpha, f.sun.alpha, f.star.alpha, f.star.glow].every(v => Number.isFinite(v) && v >= -1e-9 && v <= 1 + 1e-9) && [f.earth.x, f.earth.scale, f.sun.x, f.sun.scale, f.star.scale].every(Number.isFinite)));
const upTo = (t1, key) => frames.filter(f => f.t <= t1).map(key);
check('Earth pulls away and shrinks, never back: its x only falls and its size only falls until the end of the pull, and then stays', upTo(K.pull[1], f => f.earth.x).every((x, i, a) => !i || x <= a[i - 1] + 1e-9) && upTo(K.pull[1], f => f.earth.scale).every((x, i, a) => !i || x <= a[i - 1] + 1e-9) && Math.abs(F(K.pull[1]).earth.scale - K.earth.endScale) < 1e-9 && Math.abs(F(K.pull[1]).earth.x - K.earth.endX) < 1e-9);
check('Earth and the Sun fade into the distance as the tunnel comes up: they are gone (alpha 0) when the tunnel is on', F(K.tunnel[0] + 0.7).earth.alpha === 0 && F(K.tunnel[0] + 0.7).sun.alpha === 0 && F(K.pull[1]).earth.alpha > 0.8);
check('the streaks speed up from nothing to full by the end of the stretch and hold, then slow to nothing by the end', F(K.stretch[0]).speed === 0 && Math.abs(F(K.stretch[1]).speed - 1) < 1e-9 && F(K.stretch[1] + 0.1).speed === 1 && upTo(K.stretch[1], f => f.speed).every((x, i, a) => !i || x >= a[i - 1] - 1e-9) && F(K.total).speed === 0 && frames.filter(f => f.t >= K.resolve[0]).every((f, i, a) => !i || f.speed <= a[i - 1].speed + 1e-9));
check('the tunnel comes up at its window, is full in the middle of it and is gone by the flash\'s peak', F(K.tunnel[0] - 0.01).tunnel === 0 && F(K.tunnel[0] + 0.8).tunnel === 1 && F((K.tunnel[0] + K.flash[0]) / 2).tunnel > 0.9 && F((K.flash[0] + K.flash[1]) / 2).tunnel === 0);
check('the light warms as it nears the end (from cool to warm): warm is 0 early, 1 at the flash', F(K.tunnel[0]).warm === 0 && F(K.flash[0]).warm === 1);
const mid = (K.flash[0] + K.flash[1]) / 2;
check('the flash: none before its window, white (1) halfway, none after it', F(K.flash[0] - 0.01).flash === 0 && Math.abs(F(mid).flash - 1) < 1e-9 && F(K.flash[1] + 0.01).flash === 0 && frames.every(f => f.flash <= 1 + 1e-9));
check('the new star resolves after the flash\'s peak: not there before it, there at the end, growing only', F(mid - 0.01).star.alpha === 0 && F(K.total).star.alpha === 1 && Math.abs(F(K.total).star.scale - 1) < 1e-9 && frames.filter(f => f.t >= mid).every((f, i, a) => !i || f.star.scale >= a[i - 1].star.scale - 1e-9 && f.star.glow >= a[i - 1].star.glow - 1e-9));
const seen = frames.filter(f => f.line >= 0).map(f => f.line).filter((x, i, a) => !i || x !== a[i - 1]);
check('each line of words is up in its turn (0, 1, 2), fades in and out and is never up with the next', seen.join() === K.lines.map((l, i) => i).join() && frames.every(f => f.line < 0 || (f.t >= K.lines[f.line].at && f.t < K.lines[f.line].at + (K.lines[f.line].hold != null ? K.lines[f.line].hold : K.hold) + K.fade)) && F(K.lines[0].at + 0.3).lineAlpha > 0.5 && F(K.lines[0].at).lineAlpha === 0 && F(K.lines[0].at + K.hold + K.fade + 0.01).line === -1);
check('it is not done before the end and is done at it', F(K.total - 0.01).done === false && F(K.total).done === true && frames.filter(f => f.done).every(f => f.t >= K.total - 1e-9));

// ---- C. the clock and the skip ----
g.run(`var S = campWarpNew(); var steps = 0; while (!S.done && steps < 100000) { campWarpStep(S, 1 / 30); steps++; }`);
const took = J('S.t');
check('it ends by itself in 6 to 8 seconds of 30 frames a second', J('S.done') === true && took >= 6 && took <= 8.1, took);
g.run(`var S2 = campWarpNew(); campWarpStep(S2, 5);`);
check('a long frame (a sleeping tab, 5 s) counts for a tenth of a second', Math.abs(J('S2.t') - 0.1) < 1e-9 && J('campWarpStep(S2, -3).t') === J('S2.t'));
check('once it is over it stays over: more steps change nothing and the frame stays done', (g.run(`var Sd = campWarpNew(); Sd.t = CAMP.warp.total; campWarpStep(Sd, 0.05); var tD = Sd.t; campWarpStep(Sd, 0.05);`), J('Sd.done') === true && J('Sd.t') === J('tD')));
g.run(`var Sg = campWarpNew(); campWarpStep(Sg, 0.1);`);
check('a key in the first moments (the grace) does nothing', J('campWarpSkip(Sg)') === false && J('Sg.skippedAt') === null);
const skipRun = at => J(`(() => { const S = campWarpNew(); while (S.t < ${at}) campWarpStep(S, 1 / 30); const first = campWarpSkip(S), second = campWarpSkip(S), t0 = S.t; let f = null, steps = 0; while (!S.done && steps < 1000) { f = campWarpStep(S, 1 / 30); steps++; } return { first, second, took: Math.round((S.t - t0) * 1000) / 1000, flash: f.flash, line: f.line, done: S.done, at: S.skippedAt === t0 }; })()`);
for (const at of [1, 2.5, 4, 5.5, 6.5]) {
  const r = skipRun(at);
  check(`a key at ${at} s: the first press skips, the second does not, and it is over within the skip fade (${K.skipFade} s) and a frame, with the flash at white`, r.first === true && r.second === false && r.done && r.at && r.took <= K.skipFade + 0.06 && r.flash > 0.99 && r.line === -1, JSON.stringify(r));
}
check('a key after it is over does nothing', (g.run(`var Sx = campWarpNew(); while (!Sx.done) campWarpStep(Sx, 1 / 30);`), J('campWarpSkip(Sx)') === false));
check('after a skip the words are gone at once', (g.run(`var Sw = campWarpNew(); while (Sw.t < 1) campWarpStep(Sw, 1 / 30); campWarpSkip(Sw);`), J('campWarpStep(Sw, 1 / 30).line') === -1));

// ---- D. the call ----
g.run(`window.__starts = []; window.__sc = (o) => Object.assign({ level: 2, via: 'next', warped: false, d0: { level: 2, via: 'next', techs: ['shield'], seed: 5, extra: 'kept' }, scene: { start: (k, d) => __starts.push([k, d]) } }, o || {});`);
const due = o => J(`(() => { __starts.length = 0; const s = __sc(${JSON.stringify(o || {})}); return { r: campWarpDue(s), starts: __starts.slice() }; })()`);
const d1 = due();
check('level 2 started "next": it goes to the cinematic once, with the start\'s own data (techs, seed, anything else) and the level and the way it began; warped false', d1.r === true && d1.starts.length === 1 && d1.starts[0][0] === 'CampWarp' && d1.starts[0][1].level === 2 && d1.starts[0][1].via === 'next' && d1.starts[0][1].techs[0] === 'shield' && d1.starts[0][1].seed === 5 && d1.starts[0][1].extra === 'kept' && d1.starts[0][1].warped === false, JSON.stringify(d1));
check('the other ways in play it too: the address (?campaign=2), the title\'s K (menu)', due({ via: 'address' }).r === true && due({ via: 'menu' }).r === true);
check('not for a retry of the level, not for a debug skip, not when it has been shown (warped), not on level 1, never with no scene, and level 3 starts it like level 2', due({ via: 'retry' }).r === false && due({ via: 'skip' }).r === false && due({ warped: true }).r === false && due({ level: 1 }).r === false && due({ level: 3 }).r === true && due({ level: 3, via: 'retry' }).r === false && J('campWarpDue({ level: 2, via: "next", warped: false })') === false && J('campWarpDue(null)') === false);
check('a start does not start the cinematic when asked again with warped: it plays once per start', (g.run(`__starts.length = 0; var s1 = __sc({}); campWarpDue(s1); var back = Object.assign({}, __starts[0][1], { warped: true }); var s2 = __sc({ d0: back, warped: back.warped }); window.__r2 = campWarpDue(s2);`), J('__r2') === false && J('__starts.length') === 1));
// the real Campaign scene: create returns at once, init remembers the data
g.run(`window.__cf = Object.create(Campaign.prototype); __cf.scene = { start: (k, d) => __starts.push([k, d]) }; __starts.length = 0; __cf.init({ level: 2, via: 'next', techs: ['shield'], seed: 5, extra: 'kept' }); __cf.create();`);
check('Campaign.create on a level that warps in goes to the cinematic and does nothing else (no camera, no backdrop, no battle: it would have thrown on this stand-in)', J('__starts.length') === 1 && J('__starts[0][0]') === 'CampWarp' && J('__starts[0][1].extra') === 'kept' && J('__cf.camp') === null);
g.run(`__cf.init(Object.assign({}, __starts[0][1], { warped: true }));`);
check('and Campaign.init on the data it comes back with has warped: true, so create goes on (campWarpDue says no)', J('__cf.warped') === true && J('campWarpDue(__cf)') === false);

// ---- E. the scene on a stand-in ----
g.run(`
  window.__rec = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : __rec(path + '.' + String(k))), apply: () => __rec(path + '()') });
  window.__log = { said: [], sfx: [], texts: {}, starts: [], key: [], ptr: [], white: [], hum: 0, humStop: 0, words: [] };
  window.__img = () => { const o = { x: 0, y: 0, a: 1, s: 1, vis: true }; const m = new Proxy(o, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'setPosition') { o.x = a[0]; o.y = a[1]; } if (k === 'setAlpha') o.a = a[0]; if (k === 'setScale') o.s = a[0]; return m; }) }); return m; };
  planetTexture = () => 'planet'; shipPreviewTexture = () => 'ship'; hyperHum = () => { __log.hum++; return { out: {}, list: [] }; }; hyperHumStop = () => { __log.humStop++; }; shipcompSay = t => { __log.said.push(t); return true; }; sfx = n => { __log.sfx.push(n); };
  window.__scene = (d) => { const f = Object.create(CampWarp.prototype); const text = (x, y, t) => { const o = { t, a: 1, setText(v) { o.t = v; if (!/Any key/.test(String(t))) __log.words.push(v); return o; }, setAlpha(v) { o.a = v; return o; }, setOrigin() { return o; }, setDepth() { return o; } }; __log.texts[String(t)] = o; return o; };
    f.add = { image: () => __img(), graphics: () => __rec('g'), text, rectangle: () => { const r = __rec('rect'); const o = { setDepth() { return o; }, setAlpha(v) { __log.white.push(v); return o; } }; return o; } };
    f.cameras = { main: __rec('cam') }; f.textures = { exists: () => true }; f.make = __rec('make');
    f.input = { keyboard: { on: (e, fn) => __log.key.push(fn) }, on: (e, fn) => __log.ptr.push(fn) }; f.events = { once: (e, fn) => { f.__shutdown = fn; } };
    f.scene = { start: (k, data) => __log.starts.push([k, data]) };
    f.init(d || { level: 2, via: 'next', techs: ['shield'], seed: 5, extra: 'kept' }); f.create(); return f; };
  window.__play = (f, secs) => { for (let i = 0; i < secs * 30; i++) f.update(0, 1000 / 30); };
`);
g.run(`window.W1 = __scene(); __play(W1, 20);`);
check('the scene runs the whole cinematic and starts Campaign once, with the start\'s own data and warped: true', J('__log.starts.length') === 1 && J('__log.starts[0][0]') === 'Campaign' && J('__log.starts[0][1].warped') === true && J('__log.starts[0][1].extra') === 'kept' && J('__log.starts[0][1].level') === 2 && J('__log.starts[0][1].techs[0]') === 'shield', JSON.stringify(J('__log.starts')));
check('the ship\'s voice says each of the three lines once, with the destination and the distance filled in', J('__log.said').join('|') === ['Warp drive engaged. Earth and the Sun fall behind us.', '4.4 light years to Alpha Centauri. Hold on.', 'Alpha Centauri. Dropping out of warp.'].join('|'), J('__log.said').join('|'));
check('the three sounds of audio.js are played once each, in order', J('__log.sfx').join() === 'hyperCharge,hyperJump,hyperArrive', J('__log.sfx').join());

g.run(`var h0 = __log.hum, s0 = __log.sfx.slice(), st0 = __log.starts.slice(), w0 = __log.words.slice(), said0 = __log.said.slice(); __log.said.length = 0; __log.starts.length = 0; __log.words.length = 0; window.W3 = __scene({ level: 3, via: 'hub', techs: ['shield'], seed: 5 }); __play(W3, 20); window.__l3 = { said: __log.said.slice(), starts: __log.starts.slice() }; __log.hum = h0; __log.sfx.length = 0; s0.forEach(x => __log.sfx.push(x)); __log.starts.length = 0; st0.forEach(x => __log.starts.push(x)); __log.words.length = 0; w0.forEach(x => __log.words.push(x)); __log.said.length = 0; said0.forEach(x => __log.said.push(x));`);
check('level 3 runs the same cinematic with its own words: it leaves Alpha Centauri, 9.3 light years to Epsilon Eridani, no companion stars drawn, and starts Campaign once with warped: true', J('__l3.said').join('|') === ['Warp drive engaged. Alpha Centauri falls behind us.', '9.3 light years to Epsilon Eridani. Hold on.', 'Epsilon Eridani. Dropping out of warp.'].join('|') && J('W3.comp.length') === 0 && J('__l3.starts.length') === 1 && J('__l3.starts[0][1].warped') === true && J('__l3.starts[0][1].level') === 3, J('__l3.said').join('|'));
check('the words on the screen are the same three lines, in order, none twice in a row after the fade (only the changes: three different texts)', [...new Set(J('__log.words'))].join('|') === J('__log.said').join('|'));
check('Long Haul\'s hum starts once and is stopped when the scene shuts down', J('__log.hum') === 1 && (g.run('W1.__shutdown()'), J('__log.humStop') === 1));
check('the white flash covers the screen at its peak and at the end, and is clear at the start', J('Math.max(...__log.white)') > 0.99 && J('__log.white[0]') === 0);
g.run(`__log.starts.length = 0; __log.said.length = 0; __log.key.length = 0; window.W2 = __scene(); __play(W2, 1.5);`);
check('any key skips: the keydown handler ends it within the skip fade and Campaign starts once, even if keys are pressed again and again; the held key (repeat) does nothing', (g.run(`__log.key[0]({ repeat: true }); __play(W2, 0.1);`), J('__log.starts.length') === 0) && (g.run(`__log.key[0]({ repeat: false }); __log.key[0]({ repeat: false }); __play(W2, 0.7); __log.key[0]({ repeat: false }); __play(W2, 1);`), J('__log.starts.length') === 1 && J('__log.starts[0][1].warped') === true));
g.run(`__log.starts.length = 0; __log.ptr.length = 0; window.W3 = __scene(); __play(W3, 1); __log.ptr[0](); __play(W3, 1);`);
check('a click skips too', J('__log.starts.length') === 1);
g.run(`__log.starts.length = 0; __log.key.length = 0; window.W4 = __scene(); __log.key[0]({ repeat: false }); __play(W4, 0.2); __log.key[0]({ repeat: false }); __play(W4, 0.1);`);
check('a key in the grace (the key that started the level still down) does not skip: after 0.3 s it is still playing', J('__log.starts.length') === 0 && J('W4.S.skippedAt') === null);
g.run(`window.W5 = __scene(); __play(W5, 3.5);`);
check('mid-cinematic the images are where the frame says: Earth is gone (alpha 0) when the tunnel is on, the carrier is at its place', J('W5.earth.a') === 0 && Math.abs(J('W5.ship.x') - 1280 * K.ship.x) < 40);
g.run(`window.W6 = __scene(); __play(W6, 6.9);`);
check('at the end the new star is in place on the right, big and bright: its picture, its white-hot core and its glow', J('W6.star.a') > 0.45 && J('W6.core.a') > 0.9 && Math.abs(J('W6.star.x') - 1280 * K.star.x) < 1 && J('W6.starGlow.a') > 0.7);

// ---- F. the files ----
const src = readFileSync(ROOT + '/src/campwarp.js', 'utf8'), pure = src.slice(0, src.indexOf('class CampWarp')).replace(/\/\/.*$/gm, '');
check('the timeline half has nothing of Phaser or the page: no Phaser, document, window, localStorage, setTimeout, Math.random', !/\b(Phaser|document|window|localStorage|setTimeout|Math\.random|navigator)\b/.test(pure));
check('the drawing and the sound are Long Haul\'s own: Hyper.prototype.drawTunnel, hyperGlowTex, hyperHum, planetTexture and audio.js sfx names; no new sound file or audio element', ['Hyper.prototype.drawTunnel', 'hyperGlowTex', 'hyperVignetteTex', 'hyperHum(', 'planetTexture', 'hyperMix'].every(k => src.includes(k)) && !/new Audio|\.mp3|\.ogg|\.wav|createOscillator/.test(src));
check('the scene is in the game\'s list and its script is loaded once, after campaign.js', /Journal, Campaign, CampWarp(?:, CampHub)?\]/.test(readFileSync(ROOT + '/src/main.js', 'utf8')) && (readFileSync(ROOT + '/index.html', 'utf8').match(/src\/campwarp\.js/g) || []).length === 1 && readFileSync(ROOT + '/index.html', 'utf8').indexOf('src/campaign.js') < readFileSync(ROOT + '/index.html', 'utf8').indexOf('src/campwarp.js'));
const scene = readFileSync(ROOT + '/src/campaignscene.js', 'utf8');
check('the call is the first line of Campaign.create, and the level fades in from white when it comes back from the warp', /create\(\) \{\n    if \(typeof campWarpDue === 'function' && campWarpDue\(this\)\) return;/.test(scene) && /const dark = this\.warped \? 255 : 0; this\.cameras\.main\.fadeIn\(300, dark, dark, dark\)/.test(scene) && /this\.d0 = d; this\.warped = !!d\.warped/.test(scene));
check('music keeps its rules: the music engine hooks the Station, Space and Surface scenes only, and this file does not touch it', !/music|MUS\b/i.test(src.replace(/\/\/.*$/gm, '')) && /\['Station', 'Space', 'Surface'\]/.test(readFileSync(ROOT + '/src/music.js', 'utf8')));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN WARP FAIL (${failed} of ${n})` : `CAMPAIGN WARP PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
