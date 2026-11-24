// smoke: the three things that make a big fight cheaper to draw: circles as small polygons, labels painted only when they change, the gauges painted 20 times a second into a texture (plain Node, no Chrome)
// Card perf-fights (Troy: "the big fights feel slow"). Measured in a full fight (docs/PERF-FIGHTS.md): the scene allocated 2 MB a frame, 84 percent of it Phaser building the HUD's circles and arcs into
// triangles again at every render, and nine labels a frame were painted and sent to the graphics card again with nothing new on them. Nothing here changes what is on the screen.
//   A. src/campcircles.js: how many corners a circle gets, that they lie on the circle, that the edge strays under half a pixel; a Campaign scene's fillCircle is a fan of triangles and its strokeCircle a closed
//      line, with no arc; another scene's circles are Phaser's own
//   B. src/camptextguard.js: the same colour, size or style set again paints nothing; a new one paints; another scene's labels are Phaser's own
//   C. src/campgaugecache.js: the dials are painted at most once in 50 ms, at once when the pips or the highlighted dial change, straight into the HUD's Graphics when the scene cannot make a texture
// Run: node tests/campperf.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { nodeGame } from './nodegame.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about them (the list, J K L, the bars, the pip orders), so it switches them on. The game as it is now: tests/powerremoved.mjs
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const campSides = r => J(`campRoundRectSides(${r})`); // corners to a quarter circle of radius r (card space-game-perf-after-keys)
const src = f => readFileSync(join(ROOT, f), 'utf8');

console.log('A. circles');
{
  check('a dot gets 10 corners, the radar\'s disc (98 px) 33, the turrets\' reach (500 px) 74, and no circle more than 96', J('[1, 3, 98, 500, 5000, 0, -4].map(campCircleSides)').join() === '10,10,33,74,96,10,10', J('[1, 3, 98, 500, 5000, 0, -4].map(campCircleSides)').join());
  check('the corners lie on the circle, evenly, the first one due east', J(`(() => { const p = campCirclePoints(100, 50, 20).map(q => [q.x, q.y]); return p.length === campCircleSides(20) && p.every(q => Math.abs(Math.hypot(q[0] - 100, q[1] - 50) - 20) < 1e-9) && Math.abs(p[0][0] - 120) < 1e-9 && Math.abs(p[0][1] - 50) < 1e-9; })()`));
  check('the edge of the polygon is never more than half a pixel inside the true circle, for every radius from 1 to 800 px', J(`(() => { let worst = 0; for (let r = 1; r <= 800; r++) { const s = campCircleSides(r), sag = r * (1 - Math.cos(Math.PI / s)); if (sag > worst) worst = sag; } return worst; })()`) <= 0.5, J(`(() => { let worst = 0; for (let r = 1; r <= 800; r++) { const s = campCircleSides(r), sag = r * (1 - Math.cos(Math.PI / s)); if (sag > worst) worst = sag; } return worst; })()`));
  check('the list of corners is used again by the next call (nothing is made per circle): the same point objects come back', J(`(() => { const a = campCirclePoints(0, 0, 5), a0 = a[0]; const b = campCirclePoints(9, 9, 5); return a === b && b[0] === a0 && b[0].x === 14; })()`));
  // the patch itself, on a stand-in Phaser: the file is run again in a scope of its own with a Graphics that records what it is told
  g.run(`(() => { const calls = []; function G(key) { this.scene = { sys: { settings: { key } } }; this.calls = []; }
    G.prototype.fillCircle = function (x, y, r) { this.calls.push('ARC-FILL'); return this; }; G.prototype.strokeCircle = function (x, y, r) { this.calls.push('ARC-STROKE'); return this; };
    G.prototype.fillTriangle = function () { this.calls.push('tri'); return this; }; G.prototype.fillPoints = function (p, c) { this.calls.push('fillPoints' + p.length); return this; }; G.prototype.strokePoints = function (p, c, e) { this.calls.push('strokePoints' + p.length + (c ? 'closed' : '') + (e ? 'end' : '')); return this; };
    const Phaser = { GameObjects: { Graphics: G } }; ${src('src/campcircles.js')}; window.__G = G; })()`);
  const run = (key, call) => J(`(() => { const o = new __G(${JSON.stringify(key)}); o.${call}; return o.calls; })()`);
  check('in the Campaign a filled circle is a fan of triangles (corners less two), with no arc and no path to triangulate', run('Campaign', 'fillCircle(10, 10, 3)').join() === Array(8).fill('tri').join() && run('Campaign', 'fillCircle(0, 0, 98)').length === 31 && run('Campaign', 'fillCircle(0, 0, 98)').every(c => c === 'tri'));
  check('and an outline is one closed line through the corners', run('Campaign', 'strokeCircle(0, 0, 500)').join() === 'strokePoints74closedend' && run('CampHub', 'strokeCircle(0, 0, 3)').join() === 'strokePoints10closedend');
  check('the ready room and the warp are the Campaign\'s too; Long Haul\'s scenes (Space, Station, Title) keep Phaser\'s own circles, and so does a Graphics with no scene', ['CampHub', 'CampWarp'].every(k => run(k, 'fillCircle(0, 0, 4)')[0] === 'tri') && ['Space', 'Station', 'Title', 'Surface'].every(k => run(k, 'fillCircle(0, 0, 4)').join() === 'ARC-FILL' && run(k, 'strokeCircle(0, 0, 4)').join() === 'ARC-STROKE') && J(`(() => { const o = new __G('x'); o.scene = null; o.fillCircle(1, 1, 1); return o.calls; })()`).join() === 'ARC-FILL');
  check('a circle of no size is left to Phaser (nothing to fan)', run('Campaign', 'fillCircle(0, 0, 0)').join() === 'ARC-FILL');
}

{ // the same two shapes by name, for new drawing (squad rings, health bars): any Graphics, any scene
  const r = J(`(() => { const o = new __G('Space'); campDisc(o, 5, 5, 3); const fan = o.calls.slice(); o.calls.length = 0; campRing(o, 5, 5, 3); const ring = o.calls.slice(); o.calls.length = 0; campDisc(o, 0, 0, 0); campRing(o, 0, 0, -1); return { fan, ring, none: o.calls.length, back: campDisc(o, 1, 1, 1) === o && campRing(o, 1, 1, 1) === o, nil: campDisc(null, 0, 0, 1) }; })()`);
  check('campDisc and campRing draw the cheap circle on any Graphics, whatever its scene: a fan of triangles, a closed line; a circle of no size draws nothing; each answers the Graphics so a chain goes on', r.fan.join() === Array(8).fill('tri').join() && r.ring.join() === 'strokePoints10closedend' && r.none === 0 && r.back === true && r.nil === null, JSON.stringify(r));
}

console.log('A2. rounded rectangles and the squares (card space-game-perf-after-keys)');
{ // the All pilots box is on from the first frame now, and its frame was a rounded rectangle Phaser triangulates again at every render: 250 KB a frame. In a Campaign scene a rounded rectangle is a polygon.
  check('a corner gets 3 to 8 pieces by its radius (radius 4, 7 and 20 are 3, 4 and 6), and a radius of nothing is the four corners of a plain rectangle', J('[0, 4, 7, 20, 400].map(campRoundRectSides)').join() === '3,3,4,6,8' && J('campRoundRectPoints(10, 20, 100, 50, 0).length') === 4);
  check('the points lie round the rectangle: all inside it, the four sides touched, every corner on its quarter circle, and the edge never more than a quarter of a pixel inside the true arc', J(`(() => { let ok = true; for (const [w, h, r] of [[220, 150, 7], [60, 20, 5], [100, 100, 20], [28, 18, 4], [200, 40, 30]]) { const x = 30, y = 40, p = campRoundRectPoints(x, y, w, h, r).map(q => [q.x, q.y]), rr = Math.min(r, w / 2, h / 2); const n = campRoundRectSides(rr);
    ok = ok && p.length === 4 * (n + 1) && p.every(q => q[0] >= x - 1e-9 && q[0] <= x + w + 1e-9 && q[1] >= y - 1e-9 && q[1] <= y + h + 1e-9) && Math.min(...p.map(q => q[0])) === x && Math.max(...p.map(q => q[0])) === x + w && Math.min(...p.map(q => q[1])) === y && Math.max(...p.map(q => q[1])) === y + h;
    const cs = [[x + w - rr, y + rr], [x + w - rr, y + h - rr], [x + rr, y + h - rr], [x + rr, y + rr]]; p.forEach((q, i) => { const c = cs[Math.floor(i / (n + 1))]; ok = ok && Math.abs(Math.hypot(q[0] - c[0], q[1] - c[1]) - rr) < 1e-6; });
    const sag = rr * (1 - Math.cos(Math.PI / 4 / n)); ok = ok && sag < 0.25; } return ok; })()`));
  check('a radius larger than half the shorter side is held to it (a pill), and a negative or missing size draws nothing', J(`(() => { const p = campRoundRectPoints(0, 0, 100, 20, 50), ys = p.map(q => q.y); return Math.min(...ys) === 0 && Math.max(...ys) === 20 && p.every(q => q.x >= 0 && q.x <= 100); })()`) && J(`(() => { const o = { n: 0, fillTriangle() { o.n++; return o; }, strokePoints() { o.n++; return o; } }; campRoundRect(o, 0, 0, -5, 10, 4); campRoundRect(o, 0, 0, 10, 0, 4); campRoundRectLine(o, 0, 0, 0, 10, 4); return o.n; })()`) === 0);
  g.run(`(() => { function G(key) { this.scene = { sys: { settings: { key } } }; this.calls = []; }
    G.prototype.fillCircle = function () { this.calls.push('ARC-FILL'); return this; }; G.prototype.strokeCircle = function () { this.calls.push('ARC-STROKE'); return this; };
    G.prototype.fillRoundedRect = function () { this.calls.push('RRECT-FILL'); return this; }; G.prototype.strokeRoundedRect = function () { this.calls.push('RRECT-STROKE'); return this; };
    G.prototype.fillTriangle = function () { this.calls.push('tri'); return this; }; G.prototype.strokePoints = function (p, a, b) { this.calls.push('strokePoints' + p.length + (a ? 'closed' : '') + (b ? 'end' : '')); return this; };
    const Phaser = { GameObjects: { Graphics: G } }; ${src('src/campcircles.js')}; window.__G2 = G; })()`);
  const rr = (key, call) => J(`(() => { const o = new __G2(${JSON.stringify(key)}); o.${call}; return o.calls; })()`);
  check('in the Campaign a filled rounded rectangle is a fan of triangles (corners less two), with no path to triangulate, and its outline is one closed line through the corners', rr('Campaign', 'fillRoundedRect(0, 0, 200, 150, 7)').join() === Array(4 * 5 - 2).fill('tri').join() && rr('Campaign', 'strokeRoundedRect(0, 0, 200, 150, 7)').join() === 'strokePoints20closedend');
  check('the ready room and the warp are the Campaign\'s too; Long Haul\'s scenes, a Graphics with no scene, a radius that is an object (one for each corner) and a rectangle with no size are Phaser\'s own', ['CampHub', 'CampWarp'].every(k => rr(k, 'fillRoundedRect(0, 0, 10, 10, 4)')[0] === 'tri') && ['Space', 'Station', 'Title'].every(k => rr(k, 'fillRoundedRect(0, 0, 10, 10, 4)').join() === 'RRECT-FILL' && rr(k, 'strokeRoundedRect(0, 0, 10, 10, 4)').join() === 'RRECT-STROKE') && rr('Campaign', 'fillRoundedRect(0, 0, 10, 10, { tl: 4, tr: 2 })').join() === 'RRECT-FILL' && rr('Campaign', 'strokeRoundedRect(0, 0, 0, 10, 4)').join() === 'RRECT-STROKE' && J(`(() => { const o = new __G2('Campaign'); o.scene = null; o.fillRoundedRect(0, 0, 10, 10, 4); return o.calls.join(); })()`) === 'RRECT-FILL');
  check('no radius given is Phaser\'s 20, held to half the shorter side like any other', rr('Campaign', 'fillRoundedRect(0, 0, 200, 150)').length === 4 * (campSides(20) + 1) - 2 && rr('Campaign', 'fillRoundedRect(0, 0, 30, 30)').length === 4 * (campSides(15) + 1) - 2);
  // the square round a ship (campTgtCorners): its eight arms are thin rectangles with the geometry the eight lines had
  check('a square\'s eight arms are filled rectangles (one fill style, the pulse\'s alpha), each the line it replaces: the same ends, the same width, butt ends', J(`(() => { const o = { st: [], r: [], fillStyle(c, a) { o.st.push([c, a]); return o; }, fillRect(x, y, w, h) { o.r.push([x, y, w, h]); return o; }, lineStyle() { throw new Error('a line style'); }, lineBetween() { throw new Error('a line'); } };
    const v = { x: 1000, y: -400, r: 30 }, z = 0.335; campTgtCorners(o, v, 0x7dffa0, z, 0.8); const K = CAMPTGT, h = Math.max(v.r + K.pad, K.minScreen / 2 / z), a = h * K.arm, w = K.line / z; const want = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = v.x + sx * h, y = v.y + sy * h; want.push([Math.min(x, x - sx * a), y - w / 2, a, w], [x - w / 2, Math.min(y, y - sy * a), w, a]); });
    return o.st.length === 1 && o.st[0][0] === 0x7dffa0 && o.st[0][1] === 0.8 && o.r.length === 8 && o.r.every((q, i) => q.every((n, j) => Math.abs(n - want[i][j]) < 1e-9)); })()`));
}

console.log('B. labels');
{
  g.run(`(() => { function T(key, style) { this.scene = { sys: { settings: { key } } }; this.style = Object.assign({ color: '#fff', fontSize: '14px', fontStyle: '' }, style); this.paints = 0; }
    T.prototype.setColor = function (c) { this.style.color = c; this.paints++; return this; }; T.prototype.setFontSize = function (v) { this.style.fontSize = typeof v === 'number' ? v + 'px' : v; this.paints++; return this; }; T.prototype.setFontStyle = function (v) { this.style.fontStyle = v; this.paints++; return this; };
    const Phaser = { GameObjects: { Text: T } }; ${src('src/camptextguard.js')}; window.__T = T; window.__TG = CAMPTEXTGUARD; })()`);
  const paints = (key, calls) => J(`(() => { const t = new __T(${JSON.stringify(key)}); ${calls}; return t.paints; })()`);
  check('the colour a label already has, set again sixty times, paints nothing; a new colour paints once; back again paints once more', paints('Campaign', `for (let i = 0; i < 60; i++) t.setColor('#fff')`) === 0 && paints('Campaign', `for (let i = 0; i < 60; i++) t.setColor('#ff4d6d')`) === 1 && paints('Campaign', `t.setColor('#f00'); t.setColor('#f00'); t.setColor('#fff'); t.setColor('#fff')`) === 2);
  check('the same for the size (a number or its px) and the style', paints('Campaign', `t.setFontSize(14); t.setFontSize('14px'); t.setFontStyle('')`) === 0 && paints('Campaign', `t.setFontSize(12); t.setFontSize(12); t.setFontSize('12px'); t.setFontStyle('bold'); t.setFontStyle('bold')`) === 2);
  check('a guarded call still answers the label, so a chain goes on (setColor(...).setText(...))', J(`(() => { const t = new __T('Campaign'); return t.setColor('#fff') === t && t.setColor('#000') === t; })()`));
  check('Long Haul\'s labels are Phaser\'s own: every call paints, the same value or not', paints('Space', `for (let i = 0; i < 5; i++) t.setColor('#fff')`) === 5 && paints('Station', `t.setFontSize(14); t.setFontSize(14)`) === 2);
  check('campLabel sets a label\'s words and colour and paints only for what changed, in any scene (a stand-in label with setText)', J(`(() => { const t = new __T('Space', { color: '#fff' }); t.text = 'HULL 600'; t.setText = function (v) { this.text = v; this.paints++; return this; }; campLabel(t, 'HULL 600', '#fff'); const same = t.paints; campLabel(t, 'HULL 590', '#fff'); const words = t.paints; campLabel(t, 'HULL 590', '#ff4d6d'); const col = t.paints; campLabel(t, undefined, '#ff4d6d'); campLabel(t, 590 === 590 ? 'HULL 590' : '', undefined); return [same, words, col, t.paints, campLabel(null, 'x') === null, t.style.color].join(); })()`) === '0,1,2,2,true,#ff4d6d');
  check('the paints saved are counted (for the measuring tools)', J('__TG.skipped') > 60);
}

console.log('C. the gauges');
{
  g.run(`
    window.__mkScene = can => { const made = { graphics: 0, rt: [] }; const gfx = () => { const o = { cmds: 0, clears: 0, clear() { o.clears++; o.cmds = 0; return o; } }; ['fillStyle', 'lineStyle', 'fillRect', 'strokeRect', 'fillPoints', 'strokePoints', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'fillPath', 'lineBetween', 'fillRoundedRect', 'strokeRoundedRect', 'fillCircle', 'strokeCircle', 'fillTriangle', 'closePath', 'arc'].forEach(k => { o[k] = () => { o.cmds++; return o; }; }); return o; };
      const s = { hud: {}, hudG: gfx(), made };
      if (can) { s.make = { graphics: () => { made.graphics++; return gfx(); } }; s.add = { renderTexture: (x, y, w, h) => { const rt = { x, y, w, h, draws: [], clears: 0, clear() { rt.clears++; return rt; }, draw(o, dx, dy) { rt.draws.push([o.cmds, dx, dy]); return rt; }, setOrigin() { return rt; }, setScrollFactor(v) { rt.sf = v; return rt; }, setDepth(d) { rt.depth = d; return rt; }, setVisible(v) { rt.vis = v; return rt; } }; made.rt.push(rt); return rt; } }; }
      return s; };
    window.__C = campNew(1, [], { seed: 1 }); window.__A = campGaugeAnimNew(__C.power.p);
    window.__paint = (s, now, hi) => campGaugesPaintCached(s, s.hudG, null, __C, __A, now, hi == null ? -1 : hi);
  `);
  const box = J('campGaugeCacheBox()'), Z = J('campHudGeom()');
  check('the texture covers the three dials, their bars and halos, and the line down to where the power list opens, and stays on the screen', box.x <= Z.block.x0 - 8 && box.y >= 0 && box.x + box.w >= Z.block.x1 && box.x + box.w <= 1280 && box.y + box.h >= Z.block.y1 && box.y + box.h >= J(`typeof CAMPPANELS_LOOK === 'object' && CAMPPANELS_LOOK.topRight ? CAMPPANELS_LOOK.topRight : 104`), JSON.stringify(box));
  check('the first frame paints the dials into a Graphics of their own (thousands of commands) and draws that ONCE into the texture; the HUD\'s own Graphics gets none of it', J(`(() => { const s = window.__S = __mkScene(true); const did = __paint(s, 1000); const rt = s.made.rt[0]; return did === true && s.made.graphics === 1 && s.made.rt.length === 1 && s.hudG.cmds === 0 && rt.draws.length === 1 && rt.draws[0][0] > 500 && rt.draws[0][1] === -rt.x && rt.draws[0][2] === -rt.y && rt.sf === 0 && rt.depth === CAMPGAUGECACHE.depth && s.hud.gaugeRT === rt; })()`));
  check('for the next 49 ms nothing is painted again; at 50 ms it is: sixty frames a second are twenty paints', J(`(() => { const s = __S, rt = s.made.rt[0]; const a = [__paint(s, 1016), __paint(s, 1033), __paint(s, 1049)], n0 = rt.draws.length, b = __paint(s, 1050); let paints = 0; for (let f = 0; f < 60; f++) if (__paint(s, 2000 + f * 1000 / 60)) paints++; return a.join() === 'false,false,false' && n0 === 1 && b === true && paints >= 19 && paints <= 21 && s.made.graphics === 1 && s.made.rt.length === 1; })()`));
  check('a pip that moved is seen at once, and so is the dial of the row highlighted in the power list, and the emergency', J(`(() => { const s = __S; __paint(s, 5000); const quiet = __paint(s, 5001); campOrder(__C, 'power', 'shields'); const pip = __paint(s, 5002), hi = __paint(s, 5003, 1), same = __paint(s, 5004, 1), off = __paint(s, 5005, -1); __C.shield = 10; __C.ore = 100; campOrder(__C, 'emergency'); const em = __paint(s, 5006); return [quiet, pip, hi, same, off, em].join(); })()`) === 'false,true,true,false,true,true');
  check('the texture is in the HUD\'s own table, so a result card hides it with the rest (hudShow walks that table), and a scene that starts again makes a new one (its hud is new)', J(`(() => { const s = __S, old = s.made.rt.length; s.hud = {}; __paint(s, 9000); return typeof s.hud.gaugeRT.setVisible === 'function' && s.made.rt.length === old + 1; })()`));
  check('a scene that cannot make a texture (a stand-in in a test) is painted as before, straight into the HUD\'s Graphics, every frame', J(`(() => { const s = __mkScene(false); const a = __paint(s, 0), n = s.hudG.cmds; s.hudG.clear(); __paint(s, 1); return a === false && n > 500 && s.hudG.cmds === n && !s.hud.gz; })()`));
  check('the scene\'s own call is untouched (campGaugesPaint(g, ...)): the cache answers to that name and finds the scene from the Graphics, and the three files are in the page after the files they lean on', /campGaugesPaint\(g, this\.hud\.gauges/.test(src('src/campaignscene.js')) && J(`(() => { const s = __mkScene(true); s.hudG.scene = s; campGaugesPaint(s.hudG, null, __C, __A, 100, -1); const noScene = __mkScene(true); campGaugesPaint(noScene.hudG, null, __C, __A, 100, -1); return s.hudG.cmds === 0 && s.made.rt.length === 1 && noScene.hudG.cmds > 500 && noScene.made.rt.length === 0 && typeof campGaugesPaintDirect === 'function'; })()`) && (() => { const h = src('index.html'), at = f => h.indexOf(`src="src/${f}"`); return at('camphud.js') > 0 && at('campgaugecache.js') > at('camphud.js') && at('campcircles.js') > h.indexOf('phaser.min.js') && at('camptextguard.js') > h.indexOf('phaser.min.js'); })());
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PERF FAIL (${failed} of ${n})` : `\nCAMPAIGN PERF PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
