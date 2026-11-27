// smoke: the cruiser's other Long Haul flight effects (src/campfeelfx.js): spark dots, turn puffs, braking jets, damage smoke, the engine glow, the velocity line, boost star streaks, the launch punch and the speed readout (plain Node, a stand-in scene)
// Card space-game-cruiser-all-long-haul-effects (Troy, 26 Nov 2026: "cranked and as crazy as the regular game, with all the same effects"). Pictures only: the sim is read, never written. The list of effects is on the card.
//   A  the dots: a rate a second for each engine (more on boost), a ring of at most CAMPFX.dots.cap, they drift, shrink and fade over 520 ms, never smaller than the least on the screen, pale blue to white on boost, none without thrust
//   B  the puffs: the turn's (nose and tail push apart), two jets forward when braking, the smoke of a hurt hull from an engine (more under 30 percent), a hitch frame shows nothing
//   C  the glow: the engine builds in 850 ms and drops in 200; none at rest
//   D  the line ahead: 0.35 s of travel with a dot, none under 30 px/s, its width constant on the screen
//   E  the streaks: 46 lines in screen space sliding against the flight and wrapping, a strength that follows the boost (and the Fast burn) and the speed
//   F  the launch punch and the camera: once at the start of a flight, 1.3 times closer easing out in 900 ms, with the boost's zoom-out multiplied in; never again, never with the feel off
//   G  the drawing: three Graphics (light ADD, soft puffs, streaks in screen space behind the world), hidden under the map, gone with the cruiser
//   H  the speed readout in the page HUD: the word and the number, shown while the cruiser moves, brighter above its plain top speed
//   I  the files: the script tag after campfeel.js, no Math.random, no gold or amber, the Long Haul's files are not named, a word for the readout
// Run: node tests/campfeelfx.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ feel: 'table', shiplook: 'table' });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).replace(/\/\/[^\n]*/g, '');

console.log('A. the dots');
g.run(`window.F = campFxNew(); window.NOZ = [{ x: 0, y: 7 }, { x: 0, y: -7 }]; window.emit = (th, b, t, dt) => campFxEmitDots(F, NOZ, 0, th, b, 100, t, dt);`);
let total = 0; for (let k = 0; k < 60; k++) total += J(`emit(1, 0, ${k * 16.7}, 16.7)`);
check('at full thrust each engine gives about 30 dots a second (a second of frames: 50 to 70 for both) and none are made without thrust', total >= 50 && total <= 70 && J('emit(0, 0, 1000, 16.7)') === 0 && J('emit(0.02, 0, 1000, 16.7)') === 0, total);
g.run(`window.F = campFxNew();`); let totalB = 0; for (let k = 0; k < 60; k++) totalB += J(`emit(1, 1, ${k * 16.7}, 16.7)`);
check('on boost it gives more (48 a second each: about 85 to 105 for both)', totalB >= 85 && totalB <= 105 && totalB > total * 1.4, totalB);
check('the ring never grows past its cap (70) and no object is made once it is full', (() => { g.run(`window.F = campFxNew(); for (let k = 0; k < 600; k++) emit(1, 1, k * 16.7, 16.7);`); return J('F.dots.length') <= 70 && J('F.dots.length') >= 40; })());
g.run(`window.F = campFxNew(); emit(1, 0, 0, 16.7); emit(1, 0, 16.7, 16.7); emit(1, 0, 33.4, 16.7);`);
const d0 = J('campFxDotsAt(F, 40, 1)'), d1 = J('campFxDotsAt(F, 300, 1)'), d2 = J('campFxDotsAt(F, 700, 1)');
check('a dot drifts off, shrinks and fades: bigger and brighter at 40 ms than at 300 ms, and gone after 520 ms', d0.length > 0 && d1.length > 0 && d1[0].r < d0[0].r && d1[0].a < d0[0].a && d0[0].a <= 0.9 && d2.length === 0);
g.run(`window.F = campFxNew(); emit(1, 0, 0, 40);`);
check('the first radius is 1.2 percent of the cruiser\'s length (1.2 px on 100, more than the least 1 on the screen at zoom 1), and far out (zoom 0.2) it is never under 1 px on the screen', Math.abs(J('campFxDotsAt(F, 0, 1)[0].r') - 1.2) < 0.01 && J('campFxDotsAt(F, 5, 0.2)[0].r') >= 1 / 0.2 * (1 - 5 / 520) - 1e-6);
g.run(`window.F = campFxNew(); emit(1, 0, 0, 40);`); const plainC = J('campFxDotsAt(F, 0, 1)[0].color'); g.run(`window.F = campFxNew(); emit(1, 1, 0, 40);`); const hotC = J('campFxDotsAt(F, 0, 1)[0].color');
check('the colour is the pale blue, and on boost the pale white-blue (never gold, amber or pink)', plainC === 0x6fd6ff && hotC === 0xb8ecff);
g.run(`window.F1 = campFxNew(); window.F2 = campFxNew(); for (let k = 0; k < 30; k++) { campFxEmitDots(F1, NOZ, 0, 1, 0, 100, k * 16.7, 16.7); campFxEmitDots(F2, NOZ, 0, 1, 0, 100, k * 16.7, 16.7); }`);
check('the same frames give the same dots (a seeded generator, no Math.random)', JSON.stringify(J('F1.dots')) === JSON.stringify(J('F2.dots')) && !/Math\.random/.test(code('src/campfeelfx.js')));

console.log('B. the puffs');
g.run(`window.U = { x: 0, y: 0, rot: 0, vx: 200, vy: 0, hp: 1000, maxHp: 1000 }; window.F = campFxNew(); window.step = (rot, inp, t, hp) => { U.rot = rot; if (hp !== undefined) U.hp = hp; return campFxEmitPuffs(F, U, inp || {}, 100, t, 16.7); };`);
g.run(`step(0, {}, 0);`); let straight = 0; for (let k = 1; k < 40; k++) straight += J(`step(0, {}, ${k * 16.7})`);
check('a cruiser flying straight makes no puff (nothing is turning, nothing brakes, the hull is whole)', straight === 0 && J('F.puffs.length') === 0);
g.run(`window.F = campFxNew(); step(0, {}, 0);`); let turned = 0; for (let k = 1; k < 40; k++) turned += J(`step(${k} * 0.025, { turn: 1 }, ${k * 16.7})`);
check('turning (1.5 rad/s) makes puffs in pairs, one every 50 ms: about 24 over 650 ms', turned >= 16 && turned <= 30 && turned % 2 === 0, turned);
const pf = J('F.puffs'), nose = pf.filter(p => p.x > 0 && Math.abs(p.y) < 60), tail = pf.filter(p => p.x < 0);
check('the nose puffs go one way and the tail puffs the other (the ship swings): opposite sideways speeds, off the nose and the tail', pf.length >= 2 && J('F.puffs[0].vy') * J('F.puffs[1].vy') < 0 && pf.some(p => p.x > 20) && pf.some(p => p.x < -20), JSON.stringify(pf.slice(0, 2)));
g.run(`window.F = campFxNew(); step(0, {}, 0);`); let slow = 0; for (let k = 1; k < 40; k++) slow += J(`step(${k} * 0.004, { turn: 1 }, ${k * 16.7})`);
check('a slow turn (under 0.3 rad/s) shows nothing', slow === 0);
g.run(`window.F = campFxNew(); step(0, { brake: true }, 0);`); let braked = 0; for (let k = 1; k < 20; k++) braked += J(`step(0, { brake: true }, ${k * 16.7})`);
check('braking at speed makes two jets forward, one off each side of the nose, going forward faster than the ship; no jets while nearly stopped', braked >= 6 && J('F.puffs.every(p => p.x > 40)') && J('F.puffs[0].vx') > 200 && (g.run('window.F = campFxNew(); U.vx = 10; step(0, { brake: true }, 0); step(0, { brake: true }, 100);'), J('F.puffs.length') === 0));
g.run(`U.vx = 200; window.F = campFxNew(); step(0, {}, 0);`); let smoke0 = 0, smokeL = 0, smokeH = 0;
for (let k = 1; k < 300; k++) { smoke0 += J(`step(0, {}, ${k * 16.7}, 1000)`); }
g.run(`window.F = campFxNew(); step(0, {}, 0, 500);`); for (let k = 1; k < 300; k++) smokeL += J(`step(0, {}, ${k * 16.7}, 500)`);
g.run(`window.F = campFxNew(); step(0, {}, 0, 200);`); for (let k = 1; k < 300; k++) smokeH += J(`step(0, {}, ${k * 16.7}, 200)`);
check('smoke: none with a whole hull; some under 60 percent (about 12 percent of frames, 0.8 s life); more than twice that under 30 percent; a dead cruiser (0 hull) none', smoke0 === 0 && smokeL > 15 && smokeL < 70 && smokeH > smokeL * 2 && (g.run(`window.F = campFxNew(); U.hp = 0; step(0, {}, 0, 0);`), J('F.puffs.length') === 0), [smoke0, smokeL, smokeH].join());
g.run(`window.F = campFxNew(); step(0, {}, 0); window.U.rot = 3; campFxEmitPuffs(F, U, { turn: 1 }, 100, 5000, 400);`);
check('a frame longer than 250 ms is a hitch, not a manoeuvre: it makes no puff', J('F.puffs.length') === 0);
check('the puffs drift on their own, grow and fade, and the old are dropped; the ring has a cap', (() => { g.run(`window.F = campFxNew(); step(0, {}, 0); step(1.2, { turn: 1 }, 100); step(2.4, { turn: 1 }, 200);`); const a = J('campFxPuffsAt(F, 210)'), b = J('campFxPuffsAt(F, 450)'), c = J('campFxPuffsAt(F, 5000)'); return a.length > 0 && b.length > 0 && b[0].r > a[0].r && b[0].a < a[0].a && c.length === 0 && J('CAMPFX.puff.cap') >= 40; })());

console.log('C. the glow');
g.run(`window.F = campFxNew();`);
let ms = 0; while (J('F.burn') < 0.99 && ms < 3000) { g.run(`campFxBurn(F, 1, 0, 16.7)`); ms += 16.7; }
check('the engine builds from nothing to full in about 850 ms of thrust (the heavy ship\'s), and does not overshoot', ms > 600 && ms < 1100 && J('F.burn') <= 1, ms);
let ms2 = 0; while (J('F.burn') > 0.01 && ms2 < 3000) { g.run(`campFxBurn(F, 0, 0, 16.7)`); ms2 += 16.7; }
check('and drops in about 200 ms when the thrust goes', ms2 > 120 && ms2 < 300 && J('F.burn') === 0, ms2);
check('at rest there is no glow; at full burn it is a soft disc 17 percent of the length across the nozzle, whiter on boost', J('campFxGlow(0, 100, 0)') === null && Math.abs(J('campFxGlow(1, 100, 0).r') - 17) < 1e-9 && J('campFxGlow(1, 100, 1).color') !== J('campFxGlow(1, 100, 0).color') && J('campFxGlow(0.5, 100, 0).r') < J('campFxGlow(1, 100, 0).r'));

console.log('D. the line ahead');
check('no line under 30 px/s; at 200 px/s it reaches 0.35 s ahead (70 px) with a dot at its end', J('campFxVelLine({ x: 0, y: 0, vx: 20, vy: 0 }, 1)') === null && Math.abs(J('campFxVelLine({ x: 0, y: 0, vx: 200, vy: 0 }, 1).x1') - 70) < 1e-9 && J('campFxVelLine({ x: 5, y: 6, vx: 0, vy: 100 }, 1).y1') === 41);
check('its width and its dot are the same on the screen at every zoom (1.5 px and 2.5 px): twice as wide in the world at zoom 0.5', Math.abs(J('campFxVelLine({ x: 0, y: 0, vx: 200, vy: 0 }, 0.5).w') - 3) < 1e-9 && Math.abs(J('campFxVelLine({ x: 0, y: 0, vx: 200, vy: 0 }, 0.5).dot.r') - 5) < 1e-9 && J('campFxVelLine({ x: 0, y: 0, vx: 200, vy: 0 }, 1).color') === 0x6fd6ff);

console.log('E. the streaks');
g.run(`window.L = campFxStreaksNew(46);`);
check('46 lines to start, each with its own factor between 0.5 and 1.5', J('L.length') === 46 && J('L.every(p => p.l >= 0.5 && p.l <= 1.5)'));
g.run(`window.x0 = L.map(p => p.x);`); const ss = J('campFxStreaksStep(L, 1280, 720, 1, 0, 300, 100, 1)');
check('they slide against the flight (flying right they go left, the faster ones with the bigger factor faster) and the lines point along the flight', J('L.every((p, i) => p.x !== x0[i])') && ss.length === 46 && ss.every(l => l.x1 > l.x0 && Math.abs(l.y1 - l.y0) < 1e-9), JSON.stringify(ss[0]));
g.run(`for (let k = 0; k < 400; k++) campFxStreaksStep(L, 1280, 720, 0.6, 0.8, 900, 16.7, 1);`);
check('they wrap round the screen and stay inside it (with the 40 px margin), whatever the direction', J('L.every(p => p.x >= -40 && p.x <= 1320 && p.y >= -40 && p.y <= 760)'));
const k0 = J('campFxStreaksStep(L, 1280, 720, 1, 0, 300, 16, 0.5)'), k1 = J('campFxStreaksStep(L, 1280, 720, 1, 0, 300, 16, 1)');
check('the length and the opacity follow the strength: half the strength is about half the length', Math.abs((k0[3].x1 - k0[3].x0) / (k1[3].x1 - k1[3].x0) - 0.5) < 1e-9 && k0[3].a < k1[3].a);
check('the strength aims at 0 without boost or a burn, at the boost\'s share when it boosts at the top speed, 1 on the map\'s Fast burn at speed, and 0 when slow (under 60 percent of the top speed)', J('campFxStreakTarget(0, false, 400, 400)') === 0 && J('campFxStreakTarget(1, false, 400, 400)') === 1 && J('campFxStreakTarget(0.5, false, 400, 400)') === 0.5 && J('campFxStreakTarget(0, true, 400, 400)') === 1 && J('campFxStreakTarget(1, false, 200, 400)') === 0 && J('campFxStreakTarget(1, false, 320, 400)') > 0 && J('campFxStreakTarget(1, false, 320, 400)') < 1);

console.log('F. the launch punch and the camera');
check('the punch is 1.3 times closer at the launch and 1 when done, easing out (a Sine ease) and never past either', J('campFxPunchK(1)') === 1.3 && J('campFxPunchK(0)') === 1 && J('campFxPunchK(0.5)') > 1.15 && J('campFxPunchK(0.5)') < 1.25 && J('campFxPunchK(2)') === 1.3 && J('campFxPunchK(-1)') === 1);
g.run(`
  window.__camScene = (mode) => { const lerp = { x: 0.12, y: 0.12, set(a, b) { lerp.x = a; lerp.y = b; } };
    return { _cz: { base: 1, out: 1, cur: 1, anchor: null }, cameras: { main: { zoom: 1, _follow: {}, lerp } }, camp: { t: 200, boost: { on: false } }, mode, game: { loop: { delta: 16.7 } }, dead: false, leaving: false }; };
  window.pc = __camScene('play'); window.frame = s => { campFeelCamera(s); s._cz.out = s.cameras.main.zoom = s._cz.base; };
`);
g.run(`frame(pc);`);
check('the first frames of a flight punch the view in: the base zoom is 1.3 at the start', Math.abs(J('pc._cz.base') - 1.3) < 0.02 && J('pc.feel.launched') === true, J('pc._cz.base'));
let t = 0; while (J('pc.feel.punch') > 0 && t < 3000) { g.run('pc.camp.t += 16.7; frame(pc)'); t += 16.7; }
check('it eases out over 900 ms and lands on exactly 1', t > 800 && t < 1100 && J('pc._cz.base') === 1, t);
g.run(`pc.camp.t = 300; for (let k = 0; k < 30; k++) frame(pc);`);
check('it does not come again while the scene runs (only the first frames of a flight; a pause that goes back to play is not a launch)', J('pc.feel.punch') === 0 && J('pc._cz.base') === 1);
g.run(`window.pb = __camScene('play'); pb.camp.boost.on = true; frame(pb);`);
check('a launch and a boost together multiply (1.3 times the first frames of the boost\'s zoom-out)', J('pb._cz.base') > 1.2 && J('pb._cz.base') < 1.3);
g.run(`window.pn = __camScene('brief'); for (let k = 0; k < 20; k++) frame(pn);`);
check('no punch while a card has the scene (the brief or the intro): it waits for play', J('pn.feel.launched') === false && J('pn._cz.base') === 1);
g.run(`window.pl = __camScene('play'); pl.camp.t = 5000; for (let k = 0; k < 20; k++) frame(pl);`);
check('and none for a scene that is already five seconds into a flight (the scene came back with the sim running)', J('pl.feel.launched') === false && J('pl._cz.base') === 1);
g.run(`CAMP.flags.feel = false; window.po = __camScene('play'); for (let k = 0; k < 20; k++) frame(po); CAMP.flags.feel = true;`);
check('with the feel off no punch and the camera is not touched', J('po._cz.base') === 1 && J('po.feel.punch') === 0);

console.log('G. the drawing');
g.run(`
  window.Phaser = { BlendModes: { ADD: 'ADD' } };
  window.__gfx = () => { const o = { calls: [], blend: '', depth: 0, vis: true, sf: 1 };
    o.cleared = 0; o.clear = () => { o.calls.length = 0; o.cleared++; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setBlendMode = b => { o.blend = b; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setScrollFactor = f => { o.sf = f; return o; };
    o.lineStyle = (w, c, a) => { o.calls.push(['lineStyle', w, c, a]); return o; }; o.lineBetween = (a, b, c, d) => { o.calls.push(['line', a, b, c, d]); return o; };
    o.fillStyle = (c, a) => { o.calls.push(['fillStyle', c, a]); return o; }; o.fillCircle = (x, y, r) => { o.calls.push(['disc', x, y, r]); return o; }; o.fillTriangle = (...p) => { o.calls.push(['tri', ...p]); return o; }; return o; };
  window.__scene = () => { const made = []; return { made, mp: null, cameras: { main: { zoom: 0.5, width: 1280, height: 720 } }, _cz: { bg: { width: 1280, height: 720 } }, add: { graphics: () => { const o = __gfx(); made.push(o); return o; } } }; };
  window.__camp = () => ({ t: 1000, input: { turn: 1, thrust: 1, brake: false }, nav: { on: false } });
  window.U = { x: 100, y: 0, rot: 0, vx: 380, vy: 0, hp: 800, maxHp: 1000 }; window.S0 = {}; window.sc = __scene(); window.C = __camp();
`);
for (let k = 0; k < 90; k++) g.run(`(() => { U.x += 6; U.rot += 0.025; U.vx = 380 * Math.cos(U.rot); U.vy = 380 * Math.sin(U.rot); campFxDraw(sc, S0, U, [{ x: U.x - 49, y: U.y + 7 }, { x: U.x - 49, y: U.y - 7 }], { th: 1, boost: 1, flare: 0 }, 98, 0.5, ${k * 16.7}, 16.7, C); })()`);
check('three Graphics are made: the light in ADD blend over the ships\' depth, the soft puffs in the normal blend under the cruiser, and the streaks in ADD at screen space (scroll factor 0) behind the world (depth -8)', J('sc.made.length') === 3 && J('S0.fxG.blend') === 'ADD' && J('S0.fxP.blend') === '' && J('S0.fxP.depth') < J('S0.fxG.depth') && J('S0.fxS.sf') === 0 && J('S0.fxS.depth') === -8 && J('S0.fxS.blend') === 'ADD');
const gc = J('S0.fxG.calls'), pc2 = J('S0.fxP.calls'), sc2 = J('S0.fxS.calls');
check('the light has the glows, the dots and the line ahead with its dot; the puffs layer has the turn\'s puffs and the hull\'s smoke; the streaks are lines', gc.filter(c => c[0] === 'disc').length > 20 && gc.some(c => c[0] === 'line') && pc2.filter(c => c[0] === 'disc').length > 0 && sc2.filter(c => c[0] === 'line').length === 46, [gc.length, pc2.length, sc2.length].join());
g.run(`window.__n0 = S0.fxG.calls.length; window.__cl = S0.fxG.cleared || 0;`);
check('both layers are cleared and drawn again every frame: the light layer\'s commands are the last frame\'s, never a pile of every frame (a Graphics that is not cleared keeps what it drew: the first version left a solid white trail)', J('S0.fxG.cleared') >= 90 && J('S0.fxP.cleared') >= 90 && J('S0.fxG.calls.length') < 400, J('S0.fxG.calls.length') + ' ' + J('S0.fxG.cleared'));
check('every colour drawn is a pale blue or a white or the hull smoke\'s grey-blue: no gold, no amber, no pink', [...gc, ...pc2, ...sc2].filter(c => c[0] === 'fillStyle' || c[0] === 'lineStyle').every(c => { const col = c[0] === 'fillStyle' ? c[1] : c[2]; return (col & 255) >= ((col >> 16) & 255); }));
g.run(`sc.mp = {}; campFxDraw(sc, S0, U, [{ x: 0, y: 0 }], { th: 1, boost: 1, flare: 0 }, 98, 0.5, 2000, 16.7, C);`);
check('under the map all three are hidden', J('S0.fxG.vis') === false && J('S0.fxP.vis') === false && J('S0.fxS.vis') === false);
g.run(`campFxHide(S0);`);
check('hidden (the cruiser gone, the switch off): the pictures and the particles go and the streaks\' strength is 0', J('S0.fxG.vis') === false && J('S0.fxs.dots.length') === 0 && J('S0.fxs.puffs.length') === 0 && J('S0.fxs.k') === 0);
g.run(`window.sc3 = __scene(); window.S3 = {}; window.U3 = { x: 0, y: 0, rot: 0, vx: 0, vy: 0, hp: 1000, maxHp: 1000 }; for (let k = 0; k < 40; k++) campFxDraw(sc3, S3, U3, [{ x: -49, y: 7 }, { x: -49, y: -7 }], { th: 0, boost: 0, flare: 0 }, 98, 0.5, k * 16.7, 16.7, C);`);
check('a cruiser that sits still draws nothing but a quiet frame: no dots, no line, no streaks', J('S3.fxG.calls.length') === 0 && J('S3.fxS.vis') === false);

console.log('H. the speed readout');
check('the readout is the word and the speed in px/s, shown from 1 px/s; above the plain top speed it is the bright one; hidden when still', J('campPageHudSpeed({ carrier: { vx: 300, vy: 400 } }).n') === 500 && J('campPageHudSpeed({ carrier: { vx: 300, vy: 400 } }).show') === true && J('campPageHudSpeed({ carrier: { vx: 0, vy: 0 } }).show') === false && J(`campPageHudSpeed({ carrier: { vx: CAMP.carrier.speed * 1.5, vy: 0 } }).over`) === true && J(`campPageHudSpeed({ carrier: { vx: CAMP.carrier.speed * 0.9, vy: 0 } }).over`) === false && J('campPageHudSpeed({ carrier: { vx: 1, vy: 0 } }).word') === 'Speed');
check('the model carries it with the boost and the shields (ship.speed), and the page has its row, its style and its word', /speed: campPageHudSpeed\(C\)/.test(src('src/camppagehud.js')) && /ph-speedrow/.test(src('src/camppagehud.css')) && /camp\.corner\.m\.speed \| Speed/.test(src('content/text/campcorner.md')) && /'camp\.corner\.m\.speed': 'Speed'/.test(src('src/contenttables.js')));

console.log('J. whichever ship the player flies (ORCH for Troy, 26 Nov 2026: he may fly a pilot\'s fighter instead of a faster cruiser)');
check('there is one place that says which ship the player flies (campFeelShip: the cruiser today, nothing for no sim), and the effects take their ship, its size and its engines from what they are given', J('campFeelShip({ carrier: { id: 7 } }).id') === 7 && J('campFeelShip(null)') === null && J('campFeelShip({})') === null && /campFeelShip\(C\)/.test(src('src/camppagehud.js')) && /campFeelShip\(C\)/.test(src('src/shiplookfx.js')));
check('the engines are by the kind of ship, as shares of its length: the cruiser has its two, the pilot\'s fighter its two on the shoulders of its tail notch, any other kind (a freighter) one in the middle of its tail', J("campFeelEngines({ kind: 'carrier' }).length") === 2 && J("campFeelEngines({ kind: 'fighter' }).length") === 2 && J("campFeelEngines({ kind: 'fighter' })[0][1]") === -J("campFeelEngines({ kind: 'fighter' })[1][1]") && J("campFeelEngines({ kind: 'fighter' })[0][0]") > -0.5 && J("campFeelEngines({ kind: 'freighter' }).length") === 1 && J("campFeelEngines({ kind: 'freighter' })[0][1]") === 0 && J('campFeelEngines(null).length') === 1);
const fn = J("campFeelNozzles({ kind: 'fighter', x: 100, y: 50, rot: Math.PI / 2 }, 22)");
check('a fighter 22 px long, heading down the screen: two nozzles 8.4 px behind it (above it), 1.5 px each side of its middle', fn.length === 2 && Math.abs(fn[0].y - (50 - 0.38 * 22)) < 1e-9 && Math.abs(fn[1].y - fn[0].y) < 1e-9 && Math.abs(Math.abs(fn[0].x - fn[1].x) - 0.14 * 22) < 1e-9 && Math.abs((fn[0].x + fn[1].x) / 2 - 100) < 1e-9, JSON.stringify(fn));
check('the top speed is the cruiser\'s boost top for the cruiser, the ship\'s own vmax for another, and 0 for none', J('campFeelTop({ carrier: { kind: "carrier" } }, { kind: "carrier" })') === J('CAMP.carrier.speed * CAMP.boost.speed') && J('campFeelTop({ carrier: {} }, { kind: "fighter", vmax: 420 })') === 420 && J('campFeelTop({}, null)') === 0 && J('campFeelTop({}, { kind: "fighter" })') === 0);
g.run(`CAMP.flags.feel = true; window.scF = __scene(); window.SF = {}; window.CF = Object.assign(__camp(), { carrier: { id: 1 }, boost: { th: 1, fx: 0, flare: 0, on: false } }); window.uc = { id: 1, kind: 'carrier', hp: 100, x: 0, y: 0, rot: 0, vx: 300, vy: 0 }; window.spc = { displayWidth: 98, visible: true };
  for (let k = 0; k < 40; k++) { CF.t = k * 16.7; uc.x += 5; campFeelDraw(scF, SF, uc, spc, CF); }`);
const ribC = J('SF.feelR.rib.length'), dotsC = J('SF.fxs.dots.length');
g.run(`window.uf = { id: 9, kind: 'fighter', hp: 50, maxHp: 50, x: 500, y: 0, rot: 0, vx: 200, vy: 0 }; window.spf = { displayWidth: 22, visible: true }; CF.t = 700; campFeelDraw(scF, SF, uf, spf, CF);`);
check('switching to a fighter starts that ship\'s own history: a ribbon for each of its two engines, none of the cruiser\'s dots or ribbon points left, drawn at its size', ribC === 2 && dotsC > 10 && J('SF.feelR.rib.length') === 2 && J('SF.feelId') === 9 && J('SF.fxs.dots.length') <= 4 && J('SF.feelR.rib[0].length') <= 1);
g.run(`for (let k = 0; k < 30; k++) { CF.t = 700 + k * 16.7; uf.x += 4; campFeelDraw(scF, SF, uf, spf, CF); }`);
const fdots = J('campFxDotsAt(SF.fxs, 1100, 4)');
check('the fighter\'s dots are made for its size (1.2 percent of 22 px: 0.26 px, close up where that is more than the least on the screen), not the cruiser\'s 1.2 px', fdots.length > 5 && fdots.every(d => d.r <= 0.2641) && fdots.some(d => d.r > 0.15), JSON.stringify(fdots.slice(0, 2)));
console.log('I. the files');
const html = src('index.html');
check('src/campfeelfx.js has its own script tag, after src/campfeel.js', html.indexOf('src/campfeelfx.js') > html.indexOf('src/campfeel.js') && html.indexOf('src/campfeel.js') > 0);
check('the Long Haul\'s files are not named in code (comments only) and nothing of theirs is called: no shipsFrame, feelBurn, feelSpace, installLookFx, boostFrame', !/\b(shipsFrame|shipsFlame|shipsOne|feelBurn|feelSpace|feelPuff|installLookFx|boostFrame|fxDash|cruiseLook)\s*\(/.test(code('src/campfeelfx.js')) && !/[^.]\b(BURN|SHIPS|FEEL|BOOST|CRUISE)\./.test(code('src/campfeelfx.js')));
check('no gold or amber is written in the file (0xffd37a, 0xffc857, 0xffa040, 0xffb454, 0xffd9a0), and no pink', !/0xff(d37a|c857|a040|b454|d9a0|6fa8)/i.test(src('src/campfeelfx.js')));
check('it only reads the sim: nothing is assigned to the cruiser unit (u.x, u.vx, u.rot, u.hp), the inputs or the clock', !/\b(u|U|C|inp)\.(x|y|vx|vy|rot|hp|input|t|thrust|turn|brake)\s*(\+|-)?=[^=]/.test(code('src/campfeelfx.js')));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMP FEEL FX FAIL (${failed} of ${n})` : `CAMP FEEL FX PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
