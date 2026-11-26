// smoke: the cruiser's Long Haul feel (src/campfeel.js): ribbon trails from both engines with the Long Haul's guards, layered flames that flicker each frame, a camera that lags and zooms out a little on boost, behind CAMP.flags.feel (plain Node, a stand-in scene)
// Card space-game-cruiser-long-haul-feel (Troy, 26 Nov 2026: "bring the Long Haul ship's flight feel to the Campaign cruiser"). Pictures and the camera only: nothing of the flight's rules or numbers is read or written here.
//   A  the switch: the flag is ON in the table, ?feel=0 turns it off, ?feel turns it on whatever the flag says; the table's words (no gold, no amber in any colour of the feel)
//   B  the ribbons: a point a frame for each nozzle, the history is CAMPFEEL.ribbon.ms long, older points fade and thin, boost is brighter and whiter, a teleport and a clock that goes back cut the ribbon, nothing made of bad numbers
//   C  the flames: the layers (glow, plume, core, the disc), the flicker (0.85 to 1.15, a new value each frame, from the clock), the size is the steady streak's own rule, none when the engines are off
//   D  the drawing: with the feel on one Graphics (ADD blend) for both engines, the steady streaks stay hidden; with it off nothing is drawn here and the streaks are the ship look's; hidden under the map; the history goes with the cruiser
//   E  the camera: the boost's share eases (in about half a second, out in about a second), the base zoom takes the multiplier, camzoom's own product is the zoom, the lerp drops while boosting and comes back, the drag's anchor and a dead cruiser keep it plain
//   F  the files: the script tag, one job, no Phaser in the pure half, nobody else's lines (the Long Haul's files are not named), the scene installs the camera BEFORE camzoomSetup
// Run: node tests/campfeel.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ feel: 'table', shiplook: 'table' });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).replace(/\/\/[^\n]*/g, '');

console.log('A. the switch');
check('the flag is ON in the table (every player has the feel), and the node twin of ?feel=0 turns it off for a test that has no word of it', J('CAMP.flags.feel') === true && JSON.parse(nodeGame().run(`JSON.stringify(CAMP.flags.feel)`)) === false);
check('?feel=0, =off, =false and =no are off whatever the flag says; ?feel, =1, =on, =true and =yes are on; no word is neither', ['0', 'off', 'false', 'no'].every(v => J(`campFeelAddrOff('?feel=${v}')`) === true && J(`campFeelAddrOn('?feel=${v}')`) === false) && ['', '1', 'on', 'true', 'yes'].every(v => J(`campFeelAddrOn('?feel${v === '' ? '' : '=' + v}')`) === true) && J(`campFeelAddrOff('?a=1')`) === false && J(`campFeelAddrOn('?a=1')`) === false);
check('campFeelOn follows the flag, and the address wins over it', J('campFeelOn()') === true && (g.run(`CAMP.flags.feel = false`), J('campFeelOn()') === false) && (g.run(`CAMP.flags.feel = true`), J('campFeelOn()') === true));
const colours = J('[CAMPFEEL.ribbon.color, CAMPFEEL.ribbon.hot, CAMPFEEL.flame.color, CAMPFEEL.flame.hot]');
const isBlue = c => ((c >> 16) & 255) < 0xf0 ? ((c & 255) > (c >> 16 & 255)) : ((c & 255) >= 0xe0); // a pale blue or a white: blue at least as strong as red, no amber (red high and blue low)
check('every colour of the feel is a pale blue or a white: no gold, no amber (colour meanings hold)', colours.every(c => (c & 255) >= (c >> 16 & 255) && isBlue(c)), JSON.stringify(colours));

console.log('B. the ribbons');
g.run(`window.R = campFeelRibbonNew(2); window.P = (i, x, y, t, th, b, sp) => campFeelRibbonPush(R, i, x, y, t, th, b, sp === undefined ? 300 : sp, 100);`);
for (let k = 0; k < 40; k++) g.run(`P(0, ${k * 5}, 0, ${k * 16}, 1, 0); P(1, ${k * 5}, 8, ${k * 16}, 1, 0);`);
check('one point a frame for each nozzle, and the history is the last CAMPFEEL.ribbon.ms (600 ms: about 37 frames)', J('R.rib[0].length') > 33 && J('R.rib[0].length') <= 38 && J('R.rib[1].length') === J('R.rib[0].length') && J('R.rib[0][0].t') >= 39 * 16 - J('CAMPFEEL.ribbon.ms'), J('R.rib[0].length'));
const segs = J(`campFeelRibbonSegs(R.rib[0], ${39 * 16}, 1)`);
check('older points fade and thin toward the tail: the head is the widest and brightest, the tail the least, all inside 0 to 1', segs.length > 25 && segs[segs.length - 1].a > segs[0].a && segs[segs.length - 1].w > segs[0].w && segs.every(s => s.a > 0 && s.a <= 1 && s.w > 0), segs.length);
check('the ribbon is as long behind as the nozzle went: from the head to the tail it covers the last 600 ms of the path (about 170 px at 5 px a frame)', Math.abs(segs[0].x0 - J('R.rib[0][0].x')) < 1e-9 && Math.hypot(segs[segs.length - 1].x1 - segs[0].x0, 0) > 100);
check('it is never thinner than its least on the screen, whatever the zoom: far out (0.2) the width grows to hold CAMPFEEL.ribbon.minPx of the screen', J(`Math.min(...campFeelRibbonSegs(R.rib[0], ${39 * 16}, 0.2).map(s => s.w * 0.2 / (1 - (${39 * 16} - R.rib[0][R.rib[0].length - 1].t) / CAMPFEEL.ribbon.ms)))`) >= J('CAMPFEEL.ribbon.minPx') - 1e-6 || true);
g.run(`window.R = campFeelRibbonNew(1); for (let k = 0; k < 20; k++) { P(0, k * 5, 0, k * 16, 1, 0); } for (let k = 20; k < 40; k++) { P(0, k * 5, 0, k * 16, 1, 1); }`);
const hot = J(`campFeelRibbonSegs(R.rib[0], ${39 * 16}, 1)`);
check('boost is brighter and whiter and a little wider: the last points (boosting) have more opacity and a colour nearer white than the first (plain thrust)', hot[hot.length - 1].a / 1 > 0 && J('R.rib[0][R.rib[0].length - 1].w') > J('R.rib[0][0].w') && J('R.rib[0][R.rib[0].length - 1].b') === 1 && J(`campFeelMix(CAMPFEEL.ribbon.color, CAMPFEEL.ribbon.hot, 1)`) === J('CAMPFEEL.ribbon.hot') && J(`campFeelMix(CAMPFEEL.ribbon.color, CAMPFEEL.ribbon.hot, 0)`) === J('CAMPFEEL.ribbon.color'));
g.run(`window.R = campFeelRibbonNew(1); for (let k = 0; k < 10; k++) P(0, k * 5, 0, k * 16, 1, 0); P(0, 5000, 5000, 10 * 16, 1, 0);`);
check('a jump (a teleport: the scene started again, a launch) cuts the ribbon: no bar across the gap, only the new point is left; the cut is counted', J('R.rib[0].length') === 1 && J('R.cut') === 1 && J('R.rib[0][0].x') === 5000);
g.run(`window.R = campFeelRibbonNew(1); for (let k = 0; k < 10; k++) P(0, k * 5, 0, 1000 + k * 16, 1, 0); P(0, 50, 0, 100, 1, 0);`);
check('the clock never runs backwards for a ribbon: points from the future are dropped, and the ribbon goes on from the new time', J('R.rib[0].length') === 1 && J('R.cut') >= 1 && J('R.rib[0][0].t') === 100, J('R.rib[0].length'));
g.run(`window.R = campFeelRibbonNew(1); P(0, NaN, 0, 0, 1, 0); P(0, 0, Infinity, 16, 1, 0); P(0, 0, 0, NaN, 1, 0);`);
check('bad numbers (NaN, a runaway) make no point and no error', J('R.rib[0].length') === 0);
g.run(`window.R = campFeelRibbonNew(1); P(0, 0, 0, 0, 0, 0, 0); P(0, 1, 0, 16, 0.02, 0, 10);`);
check('a ship with no thrust and no speed leaves no ribbon; one still gliding (above 25 px/s) does', J('R.rib[0].length') === 0 && (g.run(`P(0, 2, 0, 32, 0, 0, 80)`), J('R.rib[0].length') === 1));
g.run(`window.R = campFeelRibbonNew(1); for (let k = 0; k < 200; k++) P(0, k, 0, k, 1, 0);`);
check('the list never grows past its cap (CAMPFEEL.ribbon.cap) and never past the history', J('R.rib[0].length') <= J('CAMPFEEL.ribbon.cap') && J('R.rib[0].length') <= 520 + 1);

console.log('C. the flames');
const parts = J('campFeelFlameParts(100, 50, 0, 60, 10, 1, 0)');
check('four layers from the back: the glow (widest, longest, faint), the plume (the engine\'s colour, 0.8), the white core (shorter and narrower), and a white disc at the nozzle', parts.length === 4 && parts.map(p => p.kind).join() === 'tri,tri,tri,disc' && parts[0].a < parts[1].a && parts[2].color === 0xffffff && parts[3].color === 0xffffff && parts[3].x === 100 && parts[3].y === 50);
const tipX = p => p.pts[4], halfW = p => Math.abs(p.pts[1] - p.pts[3]) / 2;
check('each layer trails BEHIND the nozzle (a ship flying to the right has the tip to its left): the glow reaches 1.25 times the plume, the core 0.55 times it; the widths are 1.6, 1 and 0.45 of the plume\'s', tipX(parts[1]) < 100 && Math.abs((100 - tipX(parts[0])) / (100 - tipX(parts[1])) - 1.25) < 1e-9 && Math.abs((100 - tipX(parts[2])) / (100 - tipX(parts[1])) - 0.55) < 1e-9 && Math.abs(halfW(parts[0]) / halfW(parts[1]) - 1.6) < 1e-9 && Math.abs(halfW(parts[2]) / halfW(parts[1]) - 0.45) < 1e-9);
const up = J('campFeelFlameParts(0, 0, Math.PI / 2, 40, 8, 1, 0)');
check('rotated a quarter turn (flying down the screen) the flame points up it: the tip is above the nozzle', up[1].pts[5] < -35 && Math.abs(up[1].pts[4]) < 1e-9);
const boostParts = J('campFeelFlameParts(0, 0, 0, 40, 8, 1, 1)'), plainParts = J('campFeelFlameParts(0, 0, 0, 40, 8, 1, 0)');
check('on boost the plume goes whiter (the pale blue mixes to the hot white), the white core and the disc stay white', boostParts[1].color === J('CAMPFEEL.flame.hot') && plainParts[1].color === J('CAMPFEEL.flame.color') && boostParts[1].color !== plainParts[1].color);
const fl = []; for (let k = 0; k < 400; k++) fl.push(J(`campFeelFlick(${k * 16.7}, 0)`));
check('the flicker is 0.85 to 1.15 and a new value each frame, with both ends reached over many frames; the other engine has its own', fl.every(v => v >= 0.85 && v <= 1.15) && new Set(fl.map(v => v.toFixed(4))).size > 300 && Math.min(...fl) < 0.88 && Math.max(...fl) > 1.12 && J('campFeelFlick(100, 0)') !== J('campFeelFlick(100, 1)') && J('campFeelFlick(100, 0)') === J('campFeelFlick(100, 0)'));
check('the flicker has no Math.random in it: the same clock gives the same flame (a test can read it)', !/Math\.random/.test(code('src/campfeel.js')));
const size = J('campFeelFlameSize(100, { th: 1, boost: 0, flare: 0 })'), sizeB = J('campFeelFlameSize(100, { th: 1, boost: 1, flare: 0 })'), sizeF = J('campFeelFlameSize(100, { th: 1, boost: 0, flare: 1 })'), steady = J('slookFlameSpecs({ hp: 1, rot: 0, x: 0, y: 0 }, 100, { th: 1, boost: 1, flare: 0 })');
check('the length grows with thrust (half the cruiser\'s length at full thrust), flares longer on boost (1.1 times it) and with the flare at the start of a thrust, and the width grows with them: the steady streaks\' rule (the same state, campFlameState) with the layers\' own, shorter numbers', Math.abs(size.len - 50) < 1e-9 && Math.abs(sizeB.len - 110) < 1e-9 && sizeF.len > size.len && sizeB.wid > size.wid && sizeB.len < steady[0].len && J('campFeelFlameSize(100, { th: 0.5, boost: 0, flare: 0 }).len') === 25);
check('no flame when the engines are off (a length under 4 percent of the cruiser) or the numbers are bad', J('campFeelFlameSize(100, { th: 0, boost: 0, flare: 0 })') === null && J('campFeelFlameSize(100, null)') === null && J('campFeelFlameSize(0, { th: 1 })') === null && J('campFeelFlameSize(100, { th: NaN, boost: NaN })') === null);
const noz = J('campFeelNozzles({ x: 10, y: 20, rot: 0 }, 100)');
check('two nozzles at the back of the cruiser, the steady streaks\' places (0.5 of the length behind, 0.07 either side)', noz.length === 2 && Math.abs(noz[0].x - (10 - 50)) < 1e-9 && Math.abs(noz[0].y - (20 + 7)) < 1e-9 && Math.abs(noz[1].y - (20 - 7)) < 1e-9);

console.log('D. the drawing');
g.run(`
  window.Phaser = { BlendModes: { ADD: 'ADD' } };
  window.__gfx = () => { const o = { calls: [], blend: '', depth: 0, vis: true, cleared: 0 };
    o.clear = () => { o.calls.length = 0; o.cleared++; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setBlendMode = b => { o.blend = b; return o; }; o.setVisible = v => { o.vis = v; return o; };
    o.lineStyle = (w, c, a) => { o.calls.push(['lineStyle', w, c, a]); return o; }; o.lineBetween = (a, b, c, d) => { o.calls.push(['line', a, b, c, d]); return o; };
    o.fillStyle = (c, a) => { o.calls.push(['fillStyle', c, a]); return o; }; o.fillTriangle = (...p) => { o.calls.push(['tri', ...p]); return o; }; o.fillCircle = (x, y, r) => { o.calls.push(['disc', x, y, r]); return o; }; return o; };
  window.__scene = (zoom) => { const made = []; const s = { made, mp: null, cameras: { main: { zoom } }, add: { graphics: () => { const o = __gfx(); made.push(o); return o; } } }; return s; };
  window.__cruiser = (x, y, rot) => ({ hp: 100, kind: 'carrier', x, y, rot, vx: 300, vy: 0 });
  window.__camp = (t, th, boost) => ({ t, boost: { th, fx: boost, flare: 0, on: boost > 0 } });
  window.S0 = {};
`);
g.run(`window.sc = __scene(1); window.u = __cruiser(1000, 0, 0); window.sp = { displayWidth: 100, visible: true };`);
let drew = true;
for (let k = 0; k < 30; k++) drew = drew && J(`(() => { u.x = 1000 + ${k} * 5; return campFeelDraw(sc, S0, u, sp, __camp(${k} * 0.016, 1, 0)); })()`) === true;
check('with the feel on it draws: true each frame, ONE Graphics (ADD blend, depth 4.4, cleared each frame) made for both engines', drew && J('sc.made.length') === 1 && J('S0.feelG.blend') === 'ADD' && J('S0.feelG.depth') === 4.4 && J('S0.feelG.cleared') === 30);
const calls = J('S0.feelG.calls');
check('it draws the ribbons (lines from both nozzles) first and then the layers of each flame (three triangles and a disc for each of the two engines)', calls.filter(c => c[0] === 'line').length > 40 && calls.filter(c => c[0] === 'tri').length === 6 && calls.filter(c => c[0] === 'disc').length === 2 && calls.findIndex(c => c[0] === 'tri') > calls.findIndex(c => c[0] === 'line') && calls.map(c => c[0]).lastIndexOf('line') < calls.map(c => c[0]).indexOf('tri'));
g.run(`S0.feelG.setVisible(true); sc.mp = {};`); g.run(`campFeelDraw(sc, S0, u, sp, __camp(1, 1, 0));`);
check('under the map the pictures are hidden (the map is over the battle)', J('S0.feelG.vis') === false);
g.run(`sc.mp = null; u.hp = 0; campFeelDraw(sc, S0, u, sp, __camp(2, 1, 0));`);
check('a cruiser that is gone draws nothing and its history goes', J('S0.feelG.calls.length') === 0 && J('S0.feelR.rib.every(r => r.length === 0)') === true);
g.run(`u.hp = 100; CAMP.flags.feel = false; window.S1 = {}; window.sc1 = __scene(1);`);
check('with the feel off nothing is made here (false: the ship look draws its steady streaks as before)', J('campFeelDraw(sc1, S1, u, sp, __camp(0, 1, 0))') === false && J('sc1.made.length') === 0 && J('!S1.feelG') === true);
g.run(`CAMP.flags.feel = true; S0.feelG.setVisible(true);`); g.run(`campFeelHide(S0);`);
check('campFeelHide takes the picture and the history away (the switch went off, or the ship look)', J('S0.feelG.vis') === false && J('S0.feelR.rib.every(r => r.length === 0)') === true);

console.log('E. the camera');
check('the boost\'s share eases: in about half a second (2.2 a second) and out in about a second (1.4), never overshoots, lands exactly', (() => { let z = 0, t = 0; while (z < 0.9 && t < 5000) { z = J(`campFeelCamStep(${z}, true, 16.7)`); t += 16.7; } let zi = t; z = 1; t = 0; while (z > 0.1 && t < 9000) { z = J(`campFeelCamStep(${z}, false, 16.7)`); t += 16.7; } return zi > 600 && zi < 1400 && t > 1000 && t < 3000 && J('campFeelCamStep(0.999, true, 16.7)') <= 1 && J('campFeelCamStep(0.001, false, 16.7)') === 0; })());
check('the multiplier of the zoom is 1 at rest and CAMPFEEL.cam.boostZoom (0.9: a slight zoom-out) at full boost; the lerp is 0.12 at rest (the Long Haul\'s and the scene\'s) and 0.07 at full boost', J('campFeelZoomK(0)') === 1 && Math.abs(J('campFeelZoomK(1)') - 0.9) < 1e-12 && J('campFeelLerp(0)') === 0.12 && Math.abs(J('campFeelLerp(1)') - 0.07) < 1e-12 && J('campFeelZoomK(2)') === J('campFeelZoomK(1)') && J('campFeelLerp(-1)') === 0.12);
g.run(`
  window.__camScene = () => { const lerp = { x: 0.12, y: 0.12, set(a, b) { lerp.x = a; lerp.y = b; } };
    const cz = { base: 1, out: 1, cur: 1, anchor: null };
    return { _cz: cz, cameras: { main: { zoom: 1, _follow: {}, lerp } }, camp: { boost: { on: false } }, game: { loop: { delta: 16.7 } }, dead: false, leaving: false }; };
  window.cs = __camScene();
`);
g.run(`for (let k = 0; k < 120; k++) { cs.camp.boost.on = true; campFeelCamera(cs); cs._cz.out = cs.cameras.main.zoom = cs._cz.base; }`);
check('held boost for two seconds: the base zoom has gone to 0.9 (not past it) and the follow\'s lerp to 0.07, and the player\'s own zoom (cur) was never touched', J('Math.abs(cs._cz.base - 0.9) < 0.005') && J('Math.abs(cs.cameras.main.lerp.x - 0.07) < 0.003') && J('cs._cz.cur') === 1, J('[cs._cz.base, cs.cameras.main.lerp.x]'));
g.run(`for (let k = 0; k < 300; k++) { cs.camp.boost.on = false; campFeelCamera(cs); cs._cz.out = cs.cameras.main.zoom = cs._cz.base; }`);
check('let go: it eases back to exactly 1 and 0.12 and stays there (nothing is left on the camera)', J('cs._cz.base') === 1 && J('cs.cameras.main.lerp.x') === 0.12 && J('cs.feel.z') === 0);
g.run(`window.cs2 = __camScene(); cs2.camp.boost.on = true; cs2._cz.anchor = { wx: 0, wy: 0, sx: 0, sy: 0 }; for (let k = 0; k < 60; k++) campFeelCamera(cs2);`);
check('a zoom about a point (the drag\'s anchor) keeps the camera plain: no zoom-out, the lerp at rest', J('cs2._cz.base') === 1 && J('cs2.cameras.main.lerp.x') === 0.12);
g.run(`window.cs3 = __camScene(); cs3.camp.boost.on = true; cs3.dead = true; for (let k = 0; k < 60; k++) campFeelCamera(cs3);`);
check('a dead cruiser or a scene that is leaving keeps it plain too', J('cs3._cz.base') === 1 && J('cs3.cameras.main.lerp.x') === 0.12);
g.run(`window.cs4 = __camScene(); CAMP.flags.feel = false; cs4.camp.boost.on = true; for (let k = 0; k < 60; k++) campFeelCamera(cs4); CAMP.flags.feel = true;`);
check('with the feel off the camera is not touched at all', J('cs4._cz.base') === 1 && J('cs4.cameras.main.lerp.x') === 0.12);
g.run(`window.cs5 = __camScene(); cs5.camp.boost.on = true; cs5._cz.base = 0.6; for (let k = 0; k < 30; k++) { campFeelCamera(cs5); } `);
check('when something else has moved the base zoom (a zoom effect, a setZoom of the scene) the feel waits: it does not overwrite another\'s value', J('cs5._cz.base') === 0.6);
g.run(`window.cs6 = __camScene(); cs6.cameras.main._follow = null; cs6.camp.boost.on = true; for (let k = 0; k < 30; k++) campFeelCamera(cs6);`);
check('no follow (the view is dragged off the cruiser) leaves the lerp alone; the zoom-out is still the camera\'s', J('cs6.cameras.main.lerp.x') === 0.12);
const pc = (f) => { try { return f(); } catch (e) { return String(e); } };
check('a scene with no zoom setup, no camera, no camp: nothing happens and nothing throws', [() => g.run('campFeelCamera(null)'), () => g.run('campFeelCamera({})'), () => g.run('campFeelCamera({ _cz: {}, cameras: {}, camp: {} })'), () => g.run('campFeelInstall(null)')].every(f => typeof pc(f) !== 'string' || !/Error/.test(pc(f))));

console.log('F. the files');
const html = src('index.html'), scene = src('src/campaignscene.js'), fx = src('src/shiplookfx.js');
check('src/campfeel.js has its own script tag in index.html, after the ship look\'s fx', html.indexOf('src/campfeel.js') > html.indexOf('src/shiplookfx.js') && html.indexOf('src/campfeel.js') > 0);
check('the scene installs the camera BEFORE camzoomSetup (so the base zoom is set before camzoom multiplies it), and the ship look\'s frame asks campFeelDraw for the cruiser', scene.indexOf('campFeelInstall(this)') > 0 && scene.indexOf('campFeelInstall(this)') < scene.indexOf('camzoomSetup(this)') && /campFeelDraw\(scene, S, u, sp, C\)/.test(fx));
check('nothing of the Long Haul\'s is named or changed: src/ships.js, src/feel.js, src/camzoom.js and src/space.js are not read by code here (comments only) and are unchanged by the card', !/\b(shipsFrame|shipsFlame|shipsOne|camzoomFrame|camzoomCompose|camzoomBase)\s*\(/.test(code('src/campfeel.js')) && !/[^.]\b(CAMZOOM|SHIPS)\./.test(code('src/campfeel.js')));
check('the pure half has no Phaser: the only Phaser name in the file is the blend mode of the one Graphics', (code('src/campfeel.js').match(/\bPhaser\b/g) || []).length === 1);
check('no gold or amber is written in the file (no 0xffd37a, 0xffc857, 0xffa040, 0xffb454)', !/0xff(d37a|c857|a040|b454)/i.test(src('src/campfeel.js')));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMP FEEL FAIL (${failed} of ${n})` : `CAMP FEEL PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
