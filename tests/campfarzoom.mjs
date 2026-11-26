// smoke: the far zoom of the flight is clean (card space-game-far-zoom-ugly): a world keeps a size you can see, its pill stands clear of it, the cruiser's sign has no bays, mounts or resting ring, and what draws the signs (plain Node, a stand-in scene)
// Troy, 25 Nov 2026, from two pictures of the flight zoomed out at Earth and Luna at the start of 1.1: the signs were soft and had hard grey circles round them, ships that fly together drew into a blob, Luna had no disc and Earth was under its label, the
// names were in the canvas's typewriter font. The signs are in tests/shiplookglyph.mjs (no halo, a thin rim, baked near the size shown), the stacked arcs in tests/shiplookmarks.mjs, the far marks in tests/campfar.mjs.
//   A  a world is never drawn under CAMPZOOM.view.worldLeast px of radius on the screen (campZoomWorldScale), and not touched where it is big enough
//   B  the scene draws it up each frame (syncWorldLeast) and gives it back when the view comes in
//   C  the page HUD's pill for a world stands clear of the disc as it is drawn (the pill sat on a moon drawn up to its least size)
//   D  the cruiser as a sign has no lit bay boxes, no turret mounts and no resting reach ring (they blew up with the picture); as its picture it has them as before; the reach ring shows while Space is held
// Run: node tests/campfarzoom.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

console.log('A. the rule');
const least = J('CAMPZOOM.view.worldLeast'), places = J('(() => { const p = campPlaces(1); return Object.keys(p).filter(id => !p[id].hidden).map(id => [id, p[id].r || 60]); })()');
check('there is a least size (7 px of radius) and the places of level 1 have radii', least === 7 && places.length >= 5, JSON.stringify([least, places.length]));
const zs = [0.335, 0.26, 0.2, 0.124, 0.08, 0.055, 0.03, 0.02];
check('at every zoom from the start to the farthest a world is at least the least size on the screen, whatever its radius', places.every(([id, r]) => zs.every(z => J(`${r} * ${z} * campZoomWorldScale(${z}, ${r})`) >= least - 1e-9)));
check('and it is not drawn up where it is big enough: the factor is 1 at zoom 1 and for a big world, and never under 1', places.every(([id, r]) => J(`campZoomWorldScale(1, ${r})`) === 1 && zs.every(z => J(`campZoomWorldScale(${z}, ${r})`) >= 1)) && J('campZoomWorldScale(0.1, 5000)') === 1);
check('the moon is drawn up when the view is out (Luna at 0.124 is a few pixels across: it is drawn up), a planet that is big enough is left alone', J(`campZoomWorldScale(0.124, ${places.find(p => p[0] === 'luna')[1]})`) > 1);

console.log('B. the scene draws it up');
g.run(`window.__im = r => ({ active: true, s: 1, setScale(v) { this.s = v; return this; } });
  window.__ws = (z, sets) => ({ cameras: { main: { zoom: z } }, placeSets: sets });`);
const lunaR = places.find(p => p[0] === 'luna')[1];
check('syncWorldLeast sets the picture\'s scale to its own scale times the factor, once (a second look at the same zoom sets nothing), and back to its own at the play zoom', J(`(() => { const im = __im(), sets = [{ im, r: ${lunaR}, base: 0.25 }], s = __ws(0.124, sets); Campaign.prototype.syncWorldLeast.call(s); const far = im.s; let calls = 0; const was = im.setScale; im.setScale = function (v) { calls++; return was.call(this, v); }; Campaign.prototype.syncWorldLeast.call(s); const again = calls; s.cameras.main.zoom = 1; Campaign.prototype.syncWorldLeast.call(s); return Math.abs(far - 0.25 * campZoomWorldScale(0.124, ${lunaR})) < 1e-9 && far > 0.25 && again === 0 && Math.abs(im.s - 0.25) < 1e-9; })()`));
check('a picture that is gone (destroyed with a far body that went) or has no scale is left alone, and a scene with no places does nothing', J(`(() => { const im = __im(); im.active = false; const a = { im, r: 60, base: 0.25 }, b = { im: __im(), r: 60, base: 0 }; Campaign.prototype.syncWorldLeast.call(__ws(0.1, [a, b, {}])); Campaign.prototype.syncWorldLeast.call({ cameras: { main: { zoom: 0.1 } } }); return im.s === 1 && b.im.s === 1; })()`));
check('drawPlace keeps the picture, its radius and its own scale in placeSets, and sync() calls syncWorldLeast once a frame', /placeSets \|\| \[\]\)\.push\(\{ p, nm, pb, im, r, base: im\.scaleX \}\)/.test(src('src/campaignscene.js')) && /\n\s*this\.syncWorldLeast\(\);\n\s*this\.squadMarks\(\);/.test(src('src/campaignscene.js')));

console.log('C. the pill');
g.run(`window.__C = campNew(1, [], { seed: 1, god: true, mission: 0 });`);
check('the pill of a world is at least half a pill (16 px) above the disc as it is drawn, at every zoom the pills are drawn at (they stop at markZ)', J(`(() => { const C = __C, pl = campPlaces(1); return [0.335, 0.2, 0.124, 0.09].every(z => { const c = C.carrier, view = { x: c.x - W / 2, y: c.y - H / 2, zoom: z }; return campPageHudPlaces(C, view).every(pp => { const p = Object.keys(pl).map(id => pl[id]).find(q => (q.base ? q.name + ' \\u00b7 ' + q.base : String(q.name)) === pp.name); const cy = (p.y - view.y - H / 2) * z + H / 2, rpx = Math.max((p.r || 60) * z, CAMPZOOM.view.worldLeast); return cy - pp.y >= rpx + 16 - 0.01 && cy - pp.y >= ((p.r || 60) + 36) * z - 0.01; }); }); })()`));
check('and at the start zoom nothing moved: the pill is still 36 world px over the edge (the world look\'s own distance) where that is more', J(`(() => { const C = __C, pl = campPlaces(1), z = 0.335, c = C.carrier, view = { x: c.x - W / 2, y: c.y - H / 2, zoom: z }, pp = campPageHudPlaces(C, view).find(q => q.name === 'Earth'); const p = pl.earth; if (!pp) return true; const cy = (p.y - view.y - H / 2) * z + H / 2; return Math.abs((cy - pp.y) - Math.max(((p.r || 60) + 36) * z, Math.max((p.r || 60) * z, CAMPZOOM.view.worldLeast) + 16)) < 0.01; })()`));

console.log('D. the cruiser as a sign');
const sc = src('src/campaignscene.js');
g.run(`window.__rec = () => { const calls = []; const o = new Proxy({}, { get: (t, k) => k === 'calls' ? calls : (...a) => { calls.push(String(k)); return o; } }); return o; };
  window.__bay = (sign) => { const C = __C, c = C.carrier, bayG = __rec(), bayGlow = __rec(); const s = { camp: C, bayG, bayGlow, bayAt: { launch: C.t, land: -1e9 }, sp: { [c.id]: { _sg: sign, _k: 1 } }, add: { graphics: () => __rec() } }; Campaign.prototype.syncBay.call(s); return { g: bayG.calls, h: bayGlow.calls }; };`);
check('a cruiser that is its sign gets no lit bay: the boxes and the glow are cleared and nothing is drawn', J('(() => { const r = __bay(true); return r.g.every(k => k === "clear") && r.h.every(k => k === "clear"); })()'));
check('as its picture it keeps its bays (the launch tubes light while the wing leaves)', J('(() => { const r = __bay(false); return r.g.includes("fillPoints") || r.h.includes("fillCircle"); })()'));
check('the turret mounts are skipped for a sign, and the reach ring rests at nothing for it (it still shows while Space is held: the glow)', /const csp = this\.sp && this\.sp\[c\.id\], sign = !!csp && csp\._sg === true;/.test(sc) && /\(sign \? 0 : CAMP_REACH\.rest\) \+ \(1 - \(sign \? 0 : CAMP_REACH\.rest\)\) \* campReachGlow\(this, C\)/.test(sc) && /if \(!sign\) C\.turrets\.forEach\(/.test(sc));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `FAR ZOOM FAIL (${failed} of ${n})` : `FAR ZOOM PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
