// smoke: the pause card, Settings and Esc: Esc out of Settings closes Settings and leaves the pause card, the next Esc resumes the game, every time; Settings drops a key in its first 200 ms of real time (plain Node, no Chrome)
// Card space-game-pause-esc-after-settings (9-GEN's browser batch on 88ae7f03: "on the pause card open Settings, Esc out, Esc again: the game stayed paused in 4 of 7 scripted runs"). The game's own
// rule, read from src/settings.js and src/campaignscene.js: Settings ignores every key for the first 200 ms after it opens, measured on the REAL clock (performance.now(), a deliberate lock so the key
// that opened it, or a held key, is not also read by it); Esc then closes Settings and gives the Campaign back with its pause card still up; the next Esc takes the card away and the battle goes on. The
// batch's scripts step the game clock by hand (t.run(ms)), so a stepped 600 ms can be a few real ms: their first Esc fell inside the lock, Settings stayed open, and their second Esc only closed Settings
// (the card was still there: mode 'pause'). A script that opens Settings must wait real time (sleep 300 ms) before it presses Esc. Nothing in the game changed. The game logic here is the real
// Campaign.onKey and Settings.onKey / close, on stand-in scenes (Phaser is not in a plain Node game).
//   A  Settings: Esc inside its first 200 ms is dropped (it stays open); after that Esc closes it and the Campaign is resumed
//   B  the whole way, every time: pause card, Settings, Esc (Settings closes, the card stays), Esc (the battle goes on): three times over
//   C  the batch's case: the first Esc inside the lock leaves Settings open, so the second Esc is only the one that closes it: the card is still up (a third Esc resumes)
// Run: node tests/pauseesc.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 240) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const read = f => readFileSync(join(ROOT, f), 'utf8');

// a Campaign (the real class, its keys and its cards) and a Settings (the real class) that share a stand-in scene manager: pause(), launch() make a Settings, stop() and resume() are logged
g.run(`
  window.__log = [];
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn(), now: 0 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'shield', 'ore', 'nav', 'arrow'].forEach(k => { const o = { text: '', setText(t) { o.text = t; return px; } }, px = new Proxy(o, { get: (tg, p) => (p in tg ? tg[p] : typeof p === 'symbol' || p === 'then' ? undefined : () => px) }); h[k] = px; }); f.hud = h;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.sync = () => {};
    const mgr = { st: null, isActive: k => k === 'Settings' && !!mgr.st };
    f.scene = { key: 'Campaign', manager: mgr, pause() { __log.push('pause'); }, resume(k) { __log.push('resume ' + k); }, bringToTop() {}, get: k => (k === 'Campaign' ? f : mgr.st), stop() { __log.push('stop'); mgr.st = null; },
      launch(k, d) { __log.push('launch ' + k); const s = Object.create(Settings.prototype); s.scene = { get: kk => (kk === 'Campaign' ? f : s), stop() { __log.push('stop'); mgr.st = null; }, resume(kk) { __log.push('resume ' + kk); } }; s.init(d); s.saveModel = () => {}; mgr.st = s; } };
    return f; };
  window.__esc = (f, realMsLater) => { const s = f.scene.manager.st; if (s) s.born = performance.now() - realMsLater; /* Settings is open: that many real ms since it opened */ f.scene.manager.st ? f.scene.manager.st.onKey({ code: 'Escape', repeat: false }) : f.onKey({ code: 'Escape' }); };
`);

// ---- A. Settings' lock ----
console.log('A. Settings\' lock');
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Escape' }); window.__sk = campKeyCodes('settings')[0]; F.onKey({ code: __sk }); __log.length = 0;`);
check('the pause card is up and the Settings key opened Settings (the scene was paused, Settings launched)', J('F.mode') === 'pause' && J('F.scene.manager.isActive("Settings")') === true, J('F.mode'));
g.run(`__esc(F, 50);`);
check('Esc 50 real ms after Settings opened is dropped: it stays open, nothing is stopped or resumed', J('F.scene.manager.isActive("Settings")') === true && !J('__log').some(x => x === 'stop' || /^resume/.test(x)), JSON.stringify(J('__log')));
g.run(`__esc(F, 250);`);
check('Esc 250 real ms after it opened closes Settings and resumes the Campaign', J('F.scene.manager.isActive("Settings")') === false && J('__log').indexOf('stop') >= 0 && J('__log').indexOf('resume Campaign') >= 0, JSON.stringify(J('__log')));
check('and the pause card is still up (Esc out of Settings is Settings\' Esc, not the card\'s)', J('F.mode') === 'pause');
const lock = /performance\.now\(\) - this\.born < (\d+)/.exec(read('src/settings.js'));
check('the lock is 200 ms in settings.js (the number the batch scripts must out-wait)', !!lock && +lock[1] === 200, lock && lock[0]);

// ---- B. the whole way, every time ----
console.log('B. the whole way, every time');
for (let i = 1; i <= 3; i++) {
  g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Escape' }); F.onKey({ code: __sk }); __esc(F, 300);`);
  const after1 = J('F.mode');
  g.run(`__esc(F, 300);`);
  check(`run ${i}: Esc out of Settings leaves the pause card; the next Esc resumes the game`, after1 === 'pause' && J('F.mode') === 'play' && J('F.scene.manager.isActive("Settings")') === false, after1 + ' then ' + J('F.mode'));
}

// ---- C. the batch's case ----
console.log('C. the batch\'s case: the first Esc inside the lock');
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Escape' }); F.onKey({ code: __sk }); __esc(F, 40);`);
const open1 = J('F.scene.manager.isActive("Settings")');
g.run(`__esc(F, 700);`);
const m2 = J('F.mode'), open2 = J('F.scene.manager.isActive("Settings")');
check('a first Esc inside the lock is dropped (Settings is still open), the second only closes Settings: the pause card is still up, the game still paused (the batch\'s "stayed paused")', open1 === true && open2 === false && m2 === 'pause', JSON.stringify([open1, open2, m2]));
g.run(`__esc(F, 700);`);
check('a third Esc takes the card away', J('F.mode') === 'play');
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));

console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
