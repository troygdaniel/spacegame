// smoke: card space-game-command-slowtime (Troy, 21 Nov 2026), plain Node, no Chrome
//   (a) while the FLEET, SHIP or SYSTEMS panel, the Tab map or an order-call prompt is open the battle runs at a quarter of its pace, with a sign; closing returns to pace; flying between places is not slowed
//   (b) fights are slower overall: the three pace values (Calm, Normal, Brisk) are 15 percent under what they were
//   A  the table and the numbers: CAMP.slow.scale, the pace modes, C.timeScale
//   B  what opens a command: campSlowOpen and campSlowScale on a stand-in scene
//   C  the scene's frame: the battle's clock moves by dt times the scale; the same twice; closing returns it; a card or the pause is not this
//   D  flying between places is as it was (nothing open: the same as the sim stepped by itself); with a command open the trip is part of the slowed battle
//   E  the sign and its one line, the words, the wiring
// Run: node tests/campslowtime.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// the stand-in scene of tests/campaign.mjs (the scene decides, the sim is the real one), with the toasts and the sign recorded
g.run(`
  window.__toasts = []; toast = (s, msg) => { __toasts.push(msg); };
  window.__rec = () => { const o = { vis: undefined, txt: '', cleared: 0 }; const p = new Proxy(o, { get(t, k) { if (k in t) return t[k]; if (k === 'setVisible') return v => { t.vis = v; return p; }; if (k === 'setText') return v => { t.txt = v; return p; }; if (k === 'clear') return () => { t.cleared++; return p; }; return () => p; } }); return p; };
  window.__fake = level => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { now: 0, delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { shield: document, ore: document, hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = f.makeCamp(); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.mode = 'play'; f.pn = campPanelNew(); return f; };
  window.__frames = (F, n, dt) => { for (let i = 0; i < n; i++) F.update(i * dt, dt); };
`);

console.log('A. the numbers');
check('CAMP.slow.scale is a quarter, and every new battle starts at its own pace (timeScale 1)', J('CAMP.slow.scale') === 0.25 && J('campNew(1, [], { seed: 1 }).timeScale') === 1);
check('(b) the pace values are 15 percent under what they were (0.7, 0.85, 1): Calm 0.6, Normal 0.72, Brisk 0.85; Normal is still the default', J('CAMP.pace.modes.map(m => m.id + ":" + m.mult).join()') === 'calm:0.6,normal:0.72,brisk:0.85' && J('CAMP.pace.start') === 'normal' && J('CAMP.pace.modes.every((m, i) => Math.abs(m.mult / [0.7, 0.85, 1][i] - 0.85) < 0.02)'));
check('(b) so the wing\'s fighters and the aliens\' raiders at Normal close 15 percent slower than they did (0.72 against 0.85 of the table)', J(`(() => { const a = campNew(1, [], { seed: 1, pace: 'normal' }), f = campSpawn(a, 'fighter', 0, 0), r = campSpawn(a, 'raider', 0, 0); return near(f.vmax, CAMP.fighter.speed * 0.72) && near(r.vmax, PIRATES.raider.max * 0.72); function near(x, y) { return Math.abs(x - y) < 1e-9; } })()`) && near(0.72 / 0.85, 0.847, 0.002));
check('with no pace (the pins, the bots) a battle is the table\'s own numbers still', J(`(() => { const a = campNew(1, [], { seed: 1 }), f = campSpawn(a, 'fighter', 0, 0); return a.pace === 1 && f.vmax === CAMP.fighter.speed; })()`));

console.log('B. what opens a command');
const S = (extra) => `Object.assign({ mode: 'play', mp: null, pn: { open: '' }, camp: campNew(1, [], { seed: 1 }) }, ${extra})`;
check('nothing open: the battle\'s own pace (1)', J(`campSlowScale(${S('{}')})`) === 1 && J(`campSlowOpen(${S('{}')})`) === false);
check('a fleet key pressed less than CAMP.slow.after ms ago (S.slowUntil ahead of the scene\'s clock): a quarter; after it, 1; campSlowKick sets it from the clock', J(`campSlowScale(${S('{ slowUntil: 3000, time: { now: 1000 } }')})`) === 0.25 && J(`campSlowScale(${S('{ slowUntil: 3000, time: { now: 3000 } }')})`) === 1 && J(`(() => { const s = ${S('{ time: { now: 500 } }')}; campSlowKick(s); return [s.slowUntil, campSlowScale(s)]; })()`).join() === '2500,0.25');
check('the Tab map open: a quarter', J(`campSlowScale(${S('{ mp: { objs: [] } }')})`) === 0.25);
check('an order-call prompt open (campCallOpen, card space-game-order-calls, 5-GEN): a quarter; shut again: 1; a scene that has no such function is not slowed by it', J(`(() => { const s = ${S('{}')}; const none = campSlowScale(s); window.campCallOpen = () => true; const open = campSlowScale(s); window.campCallOpen = () => false; const shut = campSlowScale(s); delete window.campCallOpen; return [none, open, shut, campSlowScale(s)]; })()`).join() === '1,0.25,1,1');
check('not behind a card or the pause: the battle is not on, so there is nothing to slow (a fleet key pressed just before a won card is 1)', ['pause', 'won', 'lost', 'intro', 'refit'].every(m => J(`campSlowScale(${S(`{ mode: '${m}', slowUntil: 1e9 }`)})`) === 1));
check('a stand-in with no panel state or no scene is 1, never a throw', J('[campSlowScale({ mode: "play" }), campSlowScale(null), campSlowScale({})]').join() === '1,1,1');

console.log('C. the scene\'s frame');
const run = (open, n, dt) => J(`(() => { const F = __fake(1); const C = F.camp; F.slowUntil = ${open ? 1e9 : 0}; const t0 = C.t; __frames(F, ${n}, ${dt}); return { dt: C.t - t0, ts: C.timeScale }; })()`);
const free = run('', 20, 33), slow = run('ship', 20, 33);
check('a frame with nothing open steps the battle by dt (33 ms a frame, 20 frames: 660 ms of battle clock)', near(free.dt, 660, 0.01) && free.ts === 1, JSON.stringify(free));
check('with the SHIP panel open the same 20 frames are a quarter of that (165 ms) and C.timeScale says 0.25 (the order calls\' clock divides by it)', near(slow.dt, 165, 0.01) && slow.ts === 0.25, JSON.stringify(slow));
check('the frame cap still holds (a stall of 500 ms is 100 ms of sim, and 25 slowed)', near(J(`(() => { const F = __fake(1); const t0 = F.camp.t; F.update(0, 500); return F.camp.t - t0; })()`), 100, 0.01) && near(J(`(() => { const F = __fake(1); F.slowUntil = 1e9; const t0 = F.camp.t; F.update(0, 500); return F.camp.t - t0; })()`), 25, 0.01));
const fight = open => J(`(() => { const F = __fake(1), C = F.camp; campOrder(C, 'launch'); for (let i = 0; i < 40; i++) { F.slowUntil = i >= 10 && i < 30 && ${open} ? 1e9 : 0; C.input.thrust = 1; C.input.fire = true; F.update(i * 33, 33); } return { t: +C.t.toFixed(3), x: +C.carrier.x.toFixed(4), y: +C.carrier.y.toFixed(4), vx: +C.carrier.vx.toFixed(4), hp: C.carrier.hp, ships: C.ships.map(u => [u.id, +u.x.toFixed(3), +u.y.toFixed(3)]) }; })()`);
const f1 = fight(true), f2 = fight(true), f0 = fight(false);
check('the sim stays deterministic: the same frames with the panel opened and closed at the same moments end in the very same battle (ships, positions, clock)', JSON.stringify(f1) === JSON.stringify(f2) && f1.ships.length > 1);
check('and the slowed stretch counts: 20 of the 40 frames were a quarter, so the clock is 20 x 33 + 20 x 8.25 = 825 ms (not 1,320)', near(f1.t, 825, 0.01) && near(f0.t, 1320, 0.01), JSON.stringify([f1.t, f0.t]));
check('closing the panel returns the pace at once: the last ten frames after it closed are full steps', J(`(() => { const F = __fake(1), C = F.camp; F.slowUntil = 1e9; F.update(0, 33); const a = C.t; F.slowUntil = 0; F.update(33, 33); return [a, C.t - a, C.timeScale]; })()`).slice(1).join() === '33,1');
check('the pause card and a result card do not step the battle at all (as before): frames in them move nothing', J(`(() => { const F = __fake(1), C = F.camp; F.mode = 'pause'; F.slowUntil = 1e9; const t0 = C.t; __frames(F, 5, 33); F.mode = 'won'; __frames(F, 5, 33); return C.t - t0; })()`) === 0);

console.log('D. flying between places is not slowed');
const place = 'campNavRows(C).find(r => r.id === "place:mars")';
const trip = J(`(() => { const F = __fake(1), C = F.camp, x0 = C.carrier.x, y0 = C.carrier.y; campNavGo(C, ${place}); __frames(F, 150, 33); return { t: +C.t.toFixed(3), x: +C.carrier.x.toFixed(4), y: +C.carrier.y.toFixed(4), on: !!(C.nav && C.nav.on), moved: Math.round(Math.hypot(C.carrier.x - x0, C.carrier.y - y0)) }; })()`);
const direct = J(`(() => { const C = __fake(1).camp, x0 = C.carrier.x, y0 = C.carrier.y; campNavGo(C, ${place}); for (let i = 0; i < 150; i++) campStep(C, 33 / 1000); return { t: +C.t.toFixed(3), x: +C.carrier.x.toFixed(4), y: +C.carrier.y.toFixed(4), on: !!(C.nav && C.nav.on), moved: Math.round(Math.hypot(C.carrier.x - x0, C.carrier.y - y0)) }; })()`);
check('the autopilot with nothing open is the very same flight as the sim stepped by itself (the trip: the scene adds nothing to it), and it did fly', JSON.stringify(trip) === JSON.stringify(direct) && trip.on === true && trip.moved > 50, JSON.stringify([trip, direct]));
const slowTrip = J(`(() => { const F = __fake(1), C = F.camp, x0 = C.carrier.x, y0 = C.carrier.y; campNavGo(C, ${place}); F.slowUntil = 1e9; __frames(F, 150, 33); return Math.round(Math.hypot(C.carrier.x - x0, C.carrier.y - y0)); })()`);
check('with a panel open the same 150 frames of the same trip go a good deal less far (a quarter of the clock: the burn is part of the battle while a command is open)', slowTrip < trip.moved / 2, JSON.stringify([slowTrip, trip.moved]));
check('the slowed pace is in the scene\'s frame only: the sim files (campaign, campnav, campwarp) never read the scale of a panel (the warp and the trip are not told)', !/campSlow|CAMP\.slow/.test(src('src/campnav.js')) && !/campSlow|CAMP\.slow/.test(src('src/campwarp.js')) && !/campSlow|CAMP\.slow/.test(src('src/campaign.js').replace(/\/\/.*$/gm, '').replace(/\n {2}slow: \{[^]*?\n {2}\},\n/, '')));

console.log('E. the sign, the words, the wiring');
const sign = J(`(() => { const F = __fake(1); F.add = { graphics: __rec, rectangle: __rec, text: __rec }; campSlowInstall(F); F.hudHides = () => false; const sg = F.slowSign; const at = []; campSlowPaint(F); at.push([sg.back.vis, sg.text.vis]); F.slowUntil = 1e9; campSlowPaint(F); at.push([sg.back.vis, sg.text.vis, sg.text.txt]); campSlowPaint(F); at.push(sg.frame.cleared); F.slowUntil = 0; campSlowPaint(F); at.push([sg.back.vis, sg.text.vis]); F.slowUntil = 1e9; F.hudHides = () => true; campSlowPaint(F); at.push([sg.back.vis, sg.text.vis]); return at; })()`);
check('the sign is hidden with nothing open, up with "COMMAND TIME  x0.25" while a panel is, gone again when it closes, and not drawn over a result card', JSON.stringify(sign[0]) === '[null,null]' || JSON.stringify(sign[0]) === '[false,false]' || sign[0].every(v => v === null || v === false), JSON.stringify(sign));
check('(the sign, in detail)', sign[1][0] === true && sign[1][1] === true && sign[1][2] === 'COMMAND TIME  x0.25' && sign[3].every(v => v === false) && sign[4].every(v => v === false), JSON.stringify(sign));
check('the first slowing of a session says why in one curt line, once; the sign is enough after', (() => { const t = J('__toasts'); return t.filter(x => x === 'Time slows while you give orders.').length === 1; })());
const md = src('content/text/campslow.md');
check('the words are in content/text/campslow.md and sealed (the game reads them), the sign is curt, the hint is 12 words or fewer', ['camp.slow.sign', 'camp.slow.hint'].every(k => md.includes('| ' + k + ' |') && J(`uiText('${k}')`) !== k) && J('uiText("camp.slow.hint")').split(/\s+/).length <= 12 && J('uiText("camp.slow.sign", { scale: 0.25 })') === 'COMMAND TIME  x0.25');
const scene = src('src/campaignscene.js');
check('the scene wires it: the sign made in create, the frame stepped by dt times C.timeScale, the sign painted each frame, and index.html loads src/campslow.js', /campSlowInstall\(this\)/.test(scene) && /C\.timeScale = typeof campSlowScale/.test(scene) && /campStep\(C, Math\.min\(dt, 100\) \/ 1000 \* C\.timeScale\)/.test(scene) && /campSlowPaint\(this\)/.test(scene) && /src\/campslow\.js/.test(src('index.html')));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPSLOWTIME PASS');
process.exit(failed ? 1 : 0);
