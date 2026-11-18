// smoke: wheel zoom: the clamp, the wheel steps, the easing, how it multiplies with cruise and the jump charge, label size far out (plain Node, no Chrome)
// Wheel zoom (card space-game-wheel-zoom, src/camzoom.js): the numbers behind the mouse wheel, with no scene. The camera work (three cameras, the HUD
// at its own size) needs a browser and is looked at by hand; this checks the functions the frame calls.
// Run: node tests/camzoom.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const C = J('({ min: CAMZOOM.min, max: CAMZOOM.max, want: CAMZOOM.want, far: CAMZOOM.far, farFull: CAMZOOM.farFull, labelMax: CAMZOOM.labelMax })');

console.log('the clamp and the wheel');
check('the range reaches far out and close in, and starts at 1', C.min <= 0.5 && C.min >= 0.3 && C.max >= 1.4 && C.max <= 2 && C.want === 1, JSON.stringify(C));
check('a zoom outside the range is held at its end; nonsense is 1', J(`[camzoomClamp(0.01), camzoomClamp(99), camzoomClamp(NaN), camzoomClamp(1.2)]`).join() === [C.min, C.max, 1, 1.2].join());
const out1 = J('camzoomWheel(1, 100)'), in1 = J('camzoomWheel(1, -100)');
check('wheel toward you zooms out, away from you zooms in', out1 < 1 && in1 > 1, out1 + ' ' + in1);
check('one mouse notch is a step you can feel but not a lurch (5 to 20 percent)', 1 - out1 > 0.05 && 1 - out1 < 0.2, out1);
check('a notch out then a notch in is where you began', near(J('camzoomWheel(camzoomWheel(1, 100), -100)'), 1));
check('every notch is the same share of the zoom, near or far', near(J('camzoomWheel(1.2, 100) / 1.2'), J('camzoomWheel(0.7, 100) / 0.7')));
check('twenty notches out stops at the far end, twenty in at the near end', J(`(() => { let z = 1; for (let i = 0; i < 20; i++) z = camzoomWheel(z, 100); return z; })()`) === C.min && J(`(() => { let z = 1; for (let i = 0; i < 20; i++) z = camzoomWheel(z, -100); return z; })()`) === C.max);
check('a flung trackpad (deltaY 5000) counts as no more than one big step', J('camzoomWheel(1, 5000)') === J('camzoomWheel(1, CAMZOOM.notch)') && J('camzoomWheel(1, 5000)') > 0.7);
check('no wheel movement, no change', J('camzoomWheel(0.8, 0)') === 0.8);

console.log('the easing');
const run = (from, to, dt, frames) => J(`(() => { let z = ${from}; const o = []; for (let i = 0; i < ${frames}; i++) { z = camzoomEase(z, ${to}, ${dt}); o.push(z); } return o; })()`);
const a = run(1, 0.4, 16.67, 120);
check('it moves toward the target every frame and never past it', a.every((z, i) => z >= 0.4 && z <= (i ? a[i - 1] : 1)), a.slice(0, 5).join(' '));
check('most of the way in a third of a second, there within a second and a half', a[19] < 0.4 + 0.6 * 0.15 && a[89] === 0.4, a[19] + ' ' + a[89]);
check('it lands exactly and stays', a[119] === 0.4 && J('camzoomEase(0.4, 0.4, 16)') === 0.4);
const slow = run(1, 0.4, 33.34, 15), fast = run(1, 0.4, 16.67, 30);
check('the same curve at 30 and 60 frames a second', near(slow[14], fast[29], 1e-6), slow[14] + ' ' + fast[29]);
check('a long frame (250 ms) does not overshoot', (z => z >= 0.4 && z < 1)(J('camzoomEase(1, 0.4, 250)')) && (z => z <= 1.6 && z > 1)(J('camzoomEase(1, 1.6, 250)')));
check('a frame of no time does not move it', J('camzoomEase(1, 0.4, 0)') === 1);

console.log('combining with cruise, the jump charge and the launch settle');
check('the wheel multiplies what the game wants: 0.5 with cruise 0.85 is 0.425', near(J('camzoomCompose(0.85, 0.5)'), 0.425));
// a frame loop like camzoomFrame's, with a camera whose zoom the "game" writes: returns the zoom drawn each frame
const sim = body => J(`(() => {
  const cam = { zoom: 1 }, c = { base: 1, out: null }, lin = t => t, drawn = [];
  const fx = { isRunning: false, source: 1, destination: 1, progress: 0, ease: lin };
  const zoomTo = (to, frames) => { fx.isRunning = true; fx.source = cam.zoom; fx.destination = to; fx.progress = 0; fx.frames = frames; };
  const fxStep = () => { if (!fx.isRunning) return; fx.progress = Math.min(1, fx.progress + 1 / fx.frames); cam.zoom = fx.source + (fx.destination - fx.source) * fx.ease(fx.progress); if (fx.progress >= 1) fx.isRunning = false; };
  const frame = wheel => { c.base = camzoomBase(c, cam.zoom, fx); cam.zoom = camzoomCompose(c.base, wheel); c.out = cam.zoom; drawn.push(cam.zoom); };
  ${body}
  return drawn;
})()`);
const steady = sim('for (let i = 0; i < 5; i++) frame(0.5);');
check('nothing else zooming: the camera sits at the wheel setting, and does not drift', steady.every(z => z === 0.5), steady.join(' '));
const jump = sim('for (let i = 0; i < 3; i++) frame(0.5); zoomTo(1.1, 10); frame(0.5); for (let i = 0; i < 12; i++) { fxStep(); frame(0.5); }');
check('a jump charge begun while zoomed out starts from where the camera is: no lurch', near(jump[3], 0.5) && Math.abs(jump[4] - jump[3]) < 0.02, jump.slice(2, 6).join(' '));
check('and ends at the wheel times the charge zoom (0.5 x 1.1), rising all the way', near(jump[jump.length - 1], 0.55) && jump.slice(3).every((z, i, l) => !i || z >= l[i - 1] - 1e-12), jump.join(' '));
const cancel = sim('for (let i = 0; i < 2; i++) frame(0.5); zoomTo(1.1, 10); frame(0.5); for (let i = 0; i < 5; i++) { fxStep(); frame(0.5); } zoomTo(1, 4); frame(0.5); for (let i = 0; i < 6; i++) { fxStep(); frame(0.5); }');
check('a cancelled charge eases back to the wheel setting', near(cancel[cancel.length - 1], 0.5) && cancel.every(z => z > 0.49 && z < 0.56), cancel.join(' '));
const cruise = sim('let z = 1; for (let i = 0; i < 40; i++) { z += (0.85 - z) * 0.2; cam.zoom = z; frame(0.5); } for (let i = 0; i < 60; i++) { z += (1 - z) * 0.2; if (Math.abs(z - 1) < 0.004) z = 1; cam.zoom = z; frame(0.5); } for (let i = 0; i < 3; i++) frame(0.5);');
check('cruise writes its own zoom every frame: the camera eases to 0.5 x 0.85, then back to 0.5 and holds', near(cruise[39], 0.425, 1e-3) && cruise[cruise.length - 1] === 0.5 && cruise.every(z => z <= 0.5 + 1e-12 && z > 0.42), cruise[39] + ' ' + cruise[cruise.length - 1]);
const settle = sim('cam.zoom = 1.6; zoomTo(1, 10); for (let i = 0; i < 12; i++) { fxStep(); frame(0.5); }');
check('the launch settle (set to 1.6, eased to 1) is not mistaken for the wheel: it runs 1.6 to 1, times the wheel', settle[0] < 0.8 && settle[0] > 0.7 && near(settle[settle.length - 1], 0.5), settle.join(' '));
const wheelMove = sim('for (let i = 0; i < 4; i++) frame(0.5 + i * 0.1); for (let i = 0; i < 3; i++) frame(0.8);');
check('turning the wheel with nothing else zooming follows the wheel only (the base stays 1)', near(wheelMove[3], 0.8) && near(wheelMove[6], 0.8), wheelMove.join(' '));

console.log('reading things far out, and where a world point is on the screen');
check('a world label keeps its size on the screen when the camera is out', near(J('camzoomLabelScale(0.5)') * 0.5, 1) && near(J('camzoomLabelScale(0.8)') * 0.8, 1));
check('close in it is left alone, and it is never blown up past the cap', J('camzoomLabelScale(1)') === 1 && J('camzoomLabelScale(1.6)') === 1 && J('camzoomLabelScale(0.1)') === C.labelMax);
check('the ship chevron is off at zoom 1, on at the far end, and fades in between', J('camzoomFarK(1)') === 0 && J(`camzoomFarK(${C.min})`) === 1 && (k => k > 0 && k < 1)(J(`camzoomFarK(${(C.far + C.farFull) / 2})`)));
const scr = (zoom, cz) => J(`(() => { const s = { _cz: ${cz ? '{}' : 'null'}, cameras: { main: { zoom: ${zoom}, scrollX: 1000, scrollY: 2000 } } }; return [camzoomScreen(s, 1000 + W / 2, 2000 + H / 2), camzoomScreen(s, 1100, 2100), camzoomZ(s)]; })()`);
check('at zoom 1 a world point is at (x - scroll), as the HUD always had it', JSON.stringify(scr(1, true)[1]) === '{"x":100,"y":100}');
const half = scr(0.5, true);
check('zoomed to 0.5 the middle of the view stays in the middle and the rest closes in on it', half[0].x === 640 && half[0].y === 360 && half[1].x === 640 + (100 - 640) * 0.5 && half[1].y === 360 + (100 - 360) * 0.5 && half[2] === 0.5, JSON.stringify(half));
check('a scene with no wheel zoom (station, surface) is answered as before, whatever its camera does', JSON.stringify(scr(1.5, false)[1]) === '{"x":100,"y":100}' && scr(1.5, false)[2] === 1);

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);
