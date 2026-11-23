// smoke: NO command time (card space-game-no-command-slowdown, Troy, 22 Nov 2026: "do not change the speed of the game with command mode"; it takes out what card space-game-command-slowtime, 21 Nov, built); plain Node, no Chrome
//   The battle stays at its own speed while the Q or P list, a part's list (W E R, O I U, the convoy), the Tab map or a pilot's call is open, and after an order or a pick of the target. There is no sign and no hint that says time slows.
//   What stays of that card: the battle PACE is 15 percent under what it was (Calm 0.6, Normal 0.72, Brisk 0.85) and the Campaign has no pace key; they are not command time
//   A  the numbers: no CAMP.slow, no timeScale on a battle, the pace values as they were set
//   B  the scene's frame: a frame is dt of battle whatever is open (nothing, each of the nine lists, the map, a pilot's call); a frame cap of 100 ms still holds; the same frames end in the very same battle with a list open or not
//   C  the real key handler: Q, P, a part's key, an order, a pick of the target, Esc: every frame after each is a full step; the pilot's call clock counts the battle's seconds
//   D  flying between places is the same with a list open as with nothing open
//   E  nothing of it is left: no src/campslow.js, no content/text/campslow.md, no camp.slow words, no sign, no hint that says time slows, the scene and the order calls never scale by a list
// Run: node tests/campnoslow.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const here = f => existsSync(new URL('../' + f, import.meta.url));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// the stand-in scene of tests/campaign.mjs (the scene decides, the sim is the real one)
g.run(`
  toast = () => {};
  window.__fake = level => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { now: 0, delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { shield: document, ore: document, hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = f.makeCamp(); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.mode = 'play'; f.pn = campPanelNew(); return f; };
  window.__frames = (F, n, dt) => { for (let i = 0; i < n; i++) F.update(i * dt, dt); };
  // one frame of 33 ms through the scene's own update: how much battle clock it moved (ms); n frames: the mean
  window.__step = (F, n) => { const C = F.camp, t0 = C.t; for (let i = 0; i < (n || 1); i++) { F.update(F.time.now, 33); F.time.now += 33; } return +((C.t - t0) / (n || 1)).toFixed(3); };
`);

console.log('A. the numbers');
check('there is no CAMP.slow table, no campSlow function, no timeScale on a battle', J('typeof CAMP.slow') === 'undefined' && ['campSlowOpen', 'campSlowKick', 'campSlowScale', 'campSlowInstall', 'campSlowPaint'].every(f => J(`typeof ${f}`) === 'undefined') && J('campNew(1, [], { seed: 1 }).timeScale') === null);
check('the pace is not command time and stays: Calm 0.6, Normal 0.72, Brisk 0.85 (15 percent under what they were), Normal the default', J('CAMP.pace.modes.map(m => m.id + ":" + m.mult).join()') === 'calm:0.6,normal:0.72,brisk:0.85' && J('CAMP.pace.start') === 'normal');
check('a battle made with no pace (the pins, the bots) is the table\'s own numbers still', J(`(() => { const a = campNew(1, [], { seed: 1 }), f = campSpawn(a, 'fighter', 0, 0); return a.pace === 1 && f.vmax === CAMP.fighter.speed; })()`));

console.log('B. the scene\'s frame');
const LISTS = J('CAMP_PANELS.panels.map(p => p.id)');
const run = (open, n, dt, extra) => J(`(() => { const F = __fake(1); const C = F.camp; ${extra || ''} F.pn.open = '${open}'; const t0 = C.t; __frames(F, ${n}, ${dt}); return C.t - t0; })()`);
check('there are seven lists (the two tops and their five parts) and a frame with each open, or none, is the battle\'s own dt: 20 frames of 33 ms are 660 ms of the battle clock', LISTS.length === 7 && [''].concat(LISTS).every(id => near(run(id, 20, 33), 660, 0.01)), JSON.stringify(LISTS));
check('a pilot\'s call waiting for an answer does not slow it either', near(run('', 20, 33, "C.call = campCallsNew(C); C.call.open = { id: 'wounded', ctx: {}, left: 8, total: 8, pick: 0 };"), 660, 0.01));
check('nor does the Tab map open (the battle goes on behind it at its own speed; the map\'s own painting is stubbed here, it is the scene\'s clock that is looked at)', near(J(`(() => { const sv = campMapPaint; campMapPaint = () => {}; try { const F = __fake(1); F.mp = { objs: [], fire: [] }; const t0 = F.camp.t; __frames(F, 20, 33); return F.camp.t - t0; } finally { campMapPaint = sv; } })()`), 660, 0.01));
check('the frame cap still holds (a stall of 500 ms is 100 ms of the battle), with a list open as well', near(J(`(() => { const F = __fake(1); const t0 = F.camp.t; F.update(0, 500); return F.camp.t - t0; })()`), 100, 0.01) && near(J(`(() => { const F = __fake(1); F.pn.open = 'fleet'; const t0 = F.camp.t; F.update(0, 500); return F.camp.t - t0; })()`), 100, 0.01));
const fight = open => J(`(() => { const F = __fake(1), C = F.camp; campOrder(C, 'launch'); for (let i = 0; i < 40; i++) { F.pn.open = i >= 10 && i < 30 && ${open} ? 'ship' : ''; C.input.thrust = 1; C.input.fire = true; F.update(i * 33, 33); } return { t: +C.t.toFixed(3), x: +C.carrier.x.toFixed(4), y: +C.carrier.y.toFixed(4), ships: C.ships.map(u => [u.id, Math.round(u.x), Math.round(u.y)]) }; })()`);
const f1 = fight(true), f0 = fight(false);
check('the same 40 frames with a list open for 20 of them and with none are the very same battle (ships, positions, clock 1,320 ms)', JSON.stringify(f1) === JSON.stringify(f0) && near(f1.t, 1320, 0.01) && f1.ships.length > 1, JSON.stringify([f1.t, f0.t]));

console.log('C. the real keys');
check('through the scene\'s own keys every frame is 33 ms of battle: Q pressed, Q again, P, a part\'s key over it (W: the all-squads list), Esc (it closes the list and does not pause: the mode is still play)', J(`(() => { const F = __fake(1), out = [__step(F, 4)]; F.onKey({ code: 'KeyQ' }); out.push(campPanelOpen(F.pn), __step(F, 4)); F.onKey({ code: 'KeyQ' }); out.push(campPanelOpen(F.pn), __step(F, 4)); F.onKey({ code: 'KeyP' }); out.push(campPanelOpen(F.pn), __step(F, 4)); F.onKey({ code: 'KeyW' }); out.push(campPanelOpen(F.pn), __step(F, 4)); F.onKey({ code: 'Escape' }); out.push(F.mode, campPanelOpen(F.pn) || '', __step(F, 4)); return out; })()`).join() === '33,fleet,33,,33,ship,33,squads,33,play,,33');
check('a list left open stays at full speed however long it is open (300 frames, ten seconds: every one 33 ms), and the highlight moving does not change it', J(`(() => { const F = __fake(1); F.onKey({ code: 'KeyP' }); const a = __step(F, 150); F.onKey({ code: 'ArrowDown' }); F.onKey({ code: 'ArrowDown' }); return [a, __step(F, 150)]; })()`).join() === '33,33');
check('an order taken from the fleet list (Q, Enter: launch the wing), from a part of it (W, E, R: a convoy, fighters or escorts order, taken or refused), from the ship list (I, Down, Enter), a pick of the target (S), and every frame after each: 33 ms, the whole way', J(`(() => { const F = __fake(1), out = []; const press = cs => cs.forEach(c => F.onKey({ code: c })); const go = cs => { press(cs); out.push(__step(F, 1)); out.push(__step(F, 40)); };
  go(['KeyQ', 'Enter']); go(['KeyW', 'Enter']); go(['KeyE']); go(['KeyR']); go(['KeyT']); go(['KeyI', 'ArrowDown', 'Enter']); go(['KeyS']); go(['KeyX']); return out; })()`).every(v => v === 33));
check('the pilot\'s clock is the battle\'s own: 2 s of ticks take 2 s off the 8, even if something set a C.timeScale (nothing reads one)', J(`(() => { const C = __fake(1).camp; C.call = campCallsNew(C); C.call.open = { id: 'wounded', ctx: {}, left: 8, total: 8, pick: 0 }; C.timeScale = 0.25; for (let i = 0; i < 60; i++) campCallsTick(C, 1 / 30); return C.call.open.left; })()`) < 6.05);

console.log('D. flying between places');
const place = 'campNavRows(C).find(r => r.id === "place:mars")';
const trip = open => J(`(() => { const F = __fake(1), C = F.camp, x0 = C.carrier.x, y0 = C.carrier.y; campNavGo(C, ${place}); ${open ? "F.pn.open = 'ship';" : ''} __frames(F, 150, 33); return { t: +C.t.toFixed(3), x: +C.carrier.x.toFixed(4), y: +C.carrier.y.toFixed(4), on: !!(C.nav && C.nav.on), moved: Math.round(Math.hypot(C.carrier.x - x0, C.carrier.y - y0)) }; })()`);
const free = trip(false), listed = trip(true);
check('the autopilot to a place flies the very same trip with a list open as with nothing open, and it did fly', JSON.stringify(free) === JSON.stringify(listed) && free.on === true && free.moved > 50, JSON.stringify([free, listed]));

console.log('E. nothing of it is left');
check('src/campslow.js and content/text/campslow.md are gone, and index.html loads no campslow', !here('src/campslow.js') && !here('content/text/campslow.md') && !/campslow/.test(src('index.html')));
check('the scene and the order calls never scale the battle: no campSlow, no CAMP.slow, no timeScale, no slowUntil in src/ (a word in this card\'s own comments aside: the comments say "no command time")', readdirSync(new URL('../src', import.meta.url)).filter(f => f.endsWith('.js')).every(f => !/campSlow|CAMP\.slow\b|timeScale|slowUntil|camp\.slow\./.test(src('src/' + f))));
check('the sign and its line are not in the words: no camp.slow.* key in the content tables or the generated content, no "COMMAND TIME" label', !/camp\.slow\./.test(src('src/contenttables.js')) && !/camp\.slow\./.test(src('content.generated.js')) && !/COMMAND TIME/.test(src('src/contenttables.js')) && J('uiText("camp.slow.sign")') === 'camp.slow.sign');
const words = readdirSync(new URL('../content/text', import.meta.url)).filter(f => f.endsWith('.md')).map(f => src('content/text/' + f)).join('\n') + src('src/contenttables.js') + src('src/data_controls.js');
check('no line the player can read says that time slows or names command time (the help, the hints, the nudges, the briefings)', !/command time|time slows|slows? (the )?(battle|time|game)|battle (slows|runs slow)|quarter (speed|pace)/i.test(words), (words.match(/.{30}(command time|time slows|slows? (the )?(battle|time|game)|battle (slows|runs slow)|quarter (speed|pace)).{30}/i) || [''])[0]);
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPNOSLOW PASS');
process.exit(failed ? 1 : 0);
