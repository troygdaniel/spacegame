// smoke: the star layers scroll by the view's zoom: zoomed out, the starfield does not stream past a fixed place (plain Node, no Chrome)
// Card space-game-stars-at-zoom (Troy, 22 Nov 2026): "when zoomed out, the speed at which the stars move should change or stop: some targets I fly to are not moving, like Ceres or the miner I help".
// The star layers moved by the camera's scroll times a layer factor (0.2, 0.45, 0.85) and never looked at the zoom. The camera that draws the world is zoomed, so a fixed place moves on the screen by
// the scroll times the ZOOM, and at the Campaign's start zoom (0.335) the near layer (0.85) ran 2.5 times faster than Ceres: the stars streamed past a place that stands still. Now a layer moves by the
// scroll times its factor times the wheel's zoom (up to 1; zoomed in it is as it was), added up frame by frame so that zooming with the camera still does not slide the stars.
//   A  the factor: 1 and over is as before, under 1 in proportion, the far zoom of a long mission (0.02) is almost nothing
//   B  a fixed place against the layers: at no zoom does a layer move faster on the screen than the place (the stars never stream past it), and the layers keep their order
//   C  zooming with the camera still moves no star (the offsets are added up, not read from the scroll)
//   D  the frame: the first tick does not jump, a new backdrop starts again, only the wheel's part of the zoom counts (cruise's own zoom out is left as it was)
//   E  the callers: both scenes tick the backdrop every frame
// Run: node tests/starszoom.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// a stand-in scene: the camera's scroll, the wheel's zoom (s._cz.cur, as src/camzoom.js sets it up), the three layers with their factors
g.run(`
  window.__scene = (cur, camZoom) => ({ cameras: { main: { scrollX: 0, scrollY: 0, zoom: camZoom === undefined ? cur : camZoom } }, _cz: cur === null ? undefined : { cur },
    bgLayers: [0.2, 0.45, 0.85].map(par => ({ par, tilePositionX: 0, tilePositionY: 0 })) });
  window.__move = (s, dx, dy) => { s.cameras.main.scrollX += dx; s.cameras.main.scrollY += dy; spaceBackdropTick(s); };
  window.__pos = s => s.bgLayers.map(t => [t.tilePositionX, t.tilePositionY]);
  // the screen distance each layer moved while the camera moved dx at the zoom, from a first tick at the start
  window.__run = (cur, dx, dy) => { const s = __scene(cur); spaceBackdropTick(s); const a = __pos(s); __move(s, dx, dy); const b = __pos(s); return s.bgLayers.map((t, i) => [b[i][0] - a[i][0], b[i][1] - a[i][1]]); };
`);
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// ---- A. the factor ----
console.log('A. the factor');
const PAR = [0.2, 0.45, 0.85];
const full = J('__run(1, 1000, -500)');
check('A  at zoom 1 each layer moves by the scroll times its factor, as it always did (0.2, 0.45, 0.85)', PAR.every((p, i) => near(full[i][0], 1000 * p) && near(full[i][1], -500 * p)), JSON.stringify(full));
const zin = J('__run(1.6, 1000, 0)');
check('A  zoomed in (1.6) it is the same: the layers do not move more than at 1', PAR.every((p, i) => near(zin[i][0], 1000 * p)), JSON.stringify(zin));
const start = J('__run(0.335, 1000, 0)');
check('A  at the Campaign\'s start zoom (0.335) each layer moves in proportion: 0.335 of what it did (near layer 285 px for 1000, not 850)', PAR.every((p, i) => near(start[i][0], 1000 * p * 0.335)), JSON.stringify(start));
const half = J('__run(0.5, 1000, 0)');
check('A  at 0.5 it is half', PAR.every((p, i) => near(half[i][0], 1000 * p * 0.5)), JSON.stringify(half));
const fit = J('__run(0.02, 1000, 0)');
check('A  at the far zoom of a long mission (0.02) the scroll is almost nothing: the near layer moves under 20 px for 1000 px of flight', fit[2][0] > 0 && fit[2][0] < 20 && fit.every(l => Math.abs(l[0]) < 20), JSON.stringify(fit));
const kz = J('typeof spaceBackdropK === "function" ? [spaceBackdropK(2), spaceBackdropK(1), spaceBackdropK(0.335), spaceBackdropK(0.02), spaceBackdropK(0), spaceBackdropK(undefined), spaceBackdropK(NaN)] : ["no spaceBackdropK"]').join();
check('A  the factor of a zoom: 1 for 1 and over, in proportion under, 1 for a zoom that is not a number', kz === '1,1,0.335,0.02,1,1,1', kz);

// ---- B. a fixed place against the layers ----
console.log('B. a fixed place against the layers');
let worst = 0, order = true, worstZ = null;
for (const z of [0.02, 0.05, 0.1, 0.2, 0.335, 0.5, 0.75, 1, 1.2, 1.6]) {
  const r = J(`__run(${z}, 1000, 0)`), place = 1000 * z; // a fixed place moves on the screen by the scroll times the zoom
  r.forEach(l => { const ratio = Math.abs(l[0]) / place; if (ratio > worst) { worst = ratio; worstZ = z; } });
  if (!(r[0][0] < r[1][0] && r[1][0] < r[2][0])) order = false;
}
check('B  at no zoom from 0.02 to 1.6 does a star layer move faster on the screen than a fixed place (Ceres, the miner): the stars do not stream past it', worst < 1, `the worst: ${worst.toFixed(3)} of the place's own speed at zoom ${worstZ}`);
check('B  the nearest layer keeps up with the place best (0.85 of its speed, at every zoom up to 1): a fixed place is nearly still against the near stars, a moving ship is not', Math.abs(worst - 0.85) < 1e-6, worst);
check('B  the layers keep their order at every zoom: far slowest, near fastest', order);
// the old behaviour for the same trip: at 0.335 the near layer ran 850 against the place's 335
check('B  at the start zoom the place moves 335 px on the screen for 1000 of flight and the near layer 284.75 (it was 850)', Math.abs(start[2][0] - 284.75) < 0.01, start[2][0]);

// ---- C. zooming with the camera still ----
console.log('C. zooming with the camera still');
g.run(`window.__s = __scene(1); spaceBackdropTick(__s); __move(__s, 12000, 3000); window.__before = __pos(__s);`);
const stillOk = [];
for (const z of [0.9, 0.6, 0.335, 0.2, 0.6, 1, 1.6]) { g.run(`__s._cz.cur = ${z}; spaceBackdropTick(__s);`); stillOk.push(J('__pos(__s)')); }
const before = J('__before');
check('C  the camera 12,000 px out and the zoom eased from 1 to 0.2 and back: not one star layer moved (no slide, no streak while the wheel turns)', stillOk.every(p => p.every((l, i) => near(l[0], before[i][0]) && near(l[1], before[i][1]))), JSON.stringify([before, stillOk[3]]));
g.run(`window.__s = __scene(1); spaceBackdropTick(__s); __move(__s, 100, 0); __s._cz.cur = 0.5; __move(__s, 100, 0); window.__mixed = __pos(__s)[2][0];`);
check('C  a flight that goes on while the zoom changes adds each frame at its own zoom (100 px at 1, then 100 px at 0.5: 0.85 x 150)', near(J('__mixed'), 0.85 * 150), J('__mixed'));
g.run(`window.__s = __scene(0.335); spaceBackdropTick(__s); for (let i = 0; i < 4000; i++) __move(__s, 40, 40); window.__big = __pos(__s);`);
check('C  the offsets stay small however far the cruiser flies (the tiles repeat: no number grows past the wrap)', J('__big').every(p => Math.abs(p[0]) < 4096 && Math.abs(p[1]) < 4096), JSON.stringify(J('__big')));

// ---- D. the frame ----
console.log('D. the frame');
g.run(`window.__s = __scene(1); __s.cameras.main.scrollX = 9000; __s.cameras.main.scrollY = -4000; spaceBackdropTick(__s);`);
check('D  the first tick after the backdrop is made does not jump by the camera\'s whole scroll (a flight that starts 9,000 px out)', J('__pos(__s)').every(p => Math.abs(p[0]) < 1 && Math.abs(p[1]) < 1), JSON.stringify(J('__pos(__s)')));
const sceneSrc = readFileSync(join(ROOT, 'src/art_world.js'), 'utf8');
check('D  spaceBackdrop() starts the count again (a scene object is used for the next launch): it clears the last scroll', /bgLast\s*=\s*null/.test(sceneSrc.slice(sceneSrc.indexOf('function spaceBackdrop('), sceneSrc.indexOf('function spaceBackdropTick'))));
check('D  only the wheel\'s part of the zoom counts: cruise zooms the camera to 0.85 by itself and the stars run as they did (wheel 1, camera 0.85: factor 1)', near(J('(() => { const s = __scene(1, 0.85); spaceBackdropTick(s); __move(s, 1000, 0); return __pos(s)[2][0]; })()'), 850));
check('D  a scene with no wheel zoom (no _cz) is as it was: factor 1', near(J('(() => { const s = __scene(null, 0.3); spaceBackdropTick(s); __move(s, 1000, 0); return __pos(s)[2][0]; })()'), 850));
check('D  a scene with no layers and no camera ticks without throwing (a stand-in scene in a test)', J('(() => { try { spaceBackdropTick({ cameras: { main: { scrollX: 1, scrollY: 1 } }, bgLayers: [] }); return true; } catch (e) { return e.message; } })()') === true);

// ---- E. the callers ----
console.log('E. the callers');
const sp = readFileSync(join(ROOT, 'src/space.js'), 'utf8'), cs = readFileSync(join(ROOT, 'src/campaignscene.js'), 'utf8');
check('E  the Space scene and the Campaign scene tick the backdrop in their update', /spaceBackdropTick\(this\)/.test(sp) && /spaceBackdropTick\(this\)/.test(cs));
check('E  the backdrop reads the wheel\'s zoom from the scene\'s camera set-up (src/camzoom.js), nothing else', /_cz\s*\?\s*s\._cz\.cur/.test(sceneSrc) || /s\._cz && s\._cz\.cur/.test(sceneSrc));

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `STARS AT ZOOM FAIL (${failed} of ${n})` : `STARS AT ZOOM PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
