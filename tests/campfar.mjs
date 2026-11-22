// smoke: the far view: the names of the places and the escorted ships drawn as marks when the view is out so far that the world's labels are specks (plain Node, no Chrome)
// Card space-game-zoom-fit-mission (Troy, 22 Nov 2026: "zoom out in steps until the mission's start and goal both fit on screen"). src/campzoom.js is the rules (campZoomMarks, CAMPZOOM.view.markZ), src/campfarscene.js the
// drawing (campFarSync, on a stand-in scene here: the picture itself was looked at in Chrome once).
//   A. the marks: the places with their names, the hidden ones left out, the goal marked, the escorted ships
//   B. the drawing: nothing above markZ; under it the marks that are on the screen, at the place they are, off-screen and under the key line left out; the goal amber
//   C. what leaves them out (a card, the map) and what keeps them (the scene's hud, a scene that starts again)
//   D. the scene calls it and it is registered
// Run: node tests/campfar.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = () => { window.C = campNew(1, [], { seed: 1, god: true, mission: 0 }); C.arrivedAt = 0; for (let i = 0; i < 180; i++) { campStep(C, 1 / 30); C.events.length = 0; } return C; }; // (6 s in: the transport has left the Lunar Base)
  // a stand-in scene: texts that remember what was set on them, graphics that remember the calls, a camera on the cruiser
  window.__mk = (zoom, extra) => {
    const calls = [], texts = [], mkT = () => { const o = { text: '', x: 0, y: 0, vis: true, col: '' }; ['setOrigin', 'setScrollFactor', 'setDepth'].forEach(k => { o[k] = () => o; }); o.setText = s => { o.text = s; return o; }; o.setColor = c => { o.col = c; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = !!v; return o; }; texts.push(o); return o; };
    const mkG = () => { const o = new Proxy({}, { get: (t, k) => k === 'calls' ? calls : (...a) => { calls.push([String(k)].concat(a.map(x => typeof x === 'number' ? Math.round(x * 100) / 100 : typeof x))); return o; } }); return o; };
    const c = C.carrier;
    return Object.assign({ calls, texts, camp: C, mode: 'play', hud: {}, cameras: { main: { zoom, scrollX: c.x - W / 2, scrollY: c.y - H / 2 } }, add: { graphics: () => mkG(), text: () => mkT() } }, extra || {});
  };
  window.__scr = (s, x, y) => { const cam = s.cameras.main, z = cam.zoom; return [(x - cam.scrollX - W / 2) * z + W / 2, (y - cam.scrollY - H / 2) * z + H / 2]; };
`);

console.log('A. the marks');
{
  g.run('__new()');
  const marks = J('campZoomMarks(C)'), pl = J('(() => { const p = campPlaces(C.level); return Object.keys(p).filter(id => !p[id].hidden).map(id => [id, String(p[id].name), p[id].x, p[id].y]); })()');
  check('every place that is not hidden has a mark, with its name and where it is', pl.length >= 5 && pl.every(([id, name, x, y]) => marks.some(m => m.kind === 'place' && m.id === 'place:' + id && m.name === name && m.x === x && m.y === y)), JSON.stringify([pl.length, marks.length]));
  check('a hidden place has none', J('(() => { const p = campPlaces(C.level), ids = Object.keys(p).filter(id => p[id].hidden); return ids.every(id => !campZoomMarks(C).some(m => m.id === "place:" + id)); })()'));
  check('the escorted ships have one each with their names (the transport of 1.1), where they are now', J('(() => { const f = C.ships.filter(u => u.kind === "freighter" && u.hp > 0), m = campZoomMarks(C).filter(x => x.kind === "convoy"); return f.length >= 1 && m.length === f.length && f.every(u => m.some(x => x.id === u.id && x.x === u.x && x.y === u.y && x.name === campConvoyName(u))); })()'));
  check('the goals are the place the HUD\'s goal is at and the places the escorted ships are going to (Ceres on 1.1: the transport\'s end of the road), and no other; a goal that is not a place marks none of its own', J('(() => { const g = campNavGoal(C), want = {}; if (g && g.kind === "place") want[g.id] = 1; C.L.convoys.forEach(cv => { want["place:" + cv.to] = 1; }); const got = campZoomMarks(C).filter(x => x.goal).map(x => x.id).sort().join(); return got === Object.keys(want).sort().join() && want["place:ceres"] === 1; })()') && J('(() => { const old = campNavGoal, cv = C.L.convoys; campNavGoal = () => ({ id: "rock:1", kind: "rock" }); C.L.convoys = []; const none = campZoomMarks(C).filter(x => x.goal).length; campNavGoal = old; C.L.convoys = cv; return none; })()') === 0);
  check('a ship that is dead has none', J('(() => { const f = C.ships.find(u => u.kind === "freighter"); f.hp = 0; const r = campZoomMarks(C).some(m => m.id === f.id); f.hp = 100; return r; })()') === false);
}

console.log('B. the drawing');
{
  g.run('__new(); window.__s1 = __mk(1); campFarSync(__s1);');
  check('at the default zoom nothing is drawn: no mark, no text (the layer is there, made in scene.hud)', J('__s1.texts.length') === 0 && J('!!__s1.hud.far') && !J('__s1.calls.some(c => c[0] === "strokeCircle" || c[0] === "strokePoints")'));
  g.run('window.__sa = __mk(0.15); campFarSync(__sa);');
  check('at 0.15 (over markZ) too: the world\'s own labels are readable there (6 times their size)', J('__sa.texts.length') === 0 && !J('__sa.calls.some(c => c[0] === "strokeCircle")'));
  const Kz = J('CAMPZOOM.view.markZ'), Kf = J('CAMP_FAR');
  const z = J('campZoomFloor(1, 0)');
  g.run(`window.__s2 = __mk(${z}); campFarSync(__s2);`);
  const want = J(`(() => { const s = __s2, K = CAMP_FAR; return campZoomMarks(C).map(m => { const p = __scr(s, m.x, m.y); return { m, p }; }).filter(({ p }) => p[0] >= K.edge && p[0] <= W - K.edge && p[1] >= K.edge && p[1] <= H - K.keep).map(({ m, p }) => ({ name: m.name, x: p[0] + K.gap, y: p[1], goal: m.goal, kind: m.kind })); })()`);
  const got = J('__s2.texts.filter(t => t.vis).map(t => ({ name: t.text, x: t.x, y: t.y, col: t.col }))');
  check('at the farthest zoom of 1.1 (' + z.toFixed(4) + ') each mark that is on the screen has its name beside it, at the place the thing is: the same names and the same positions as the projection', want.length >= 1 && got.length === want.length && want.every(w => got.some(q => q.name === w.name && Math.abs(q.x - w.x) < 0.5 && Math.abs(q.y - w.y) < 0.5)), JSON.stringify([want, got]));
  check('the ring is drawn for each place and a diamond for each ship, one line style each', J('__s2.calls.filter(c => c[0] === "strokeCircle").length') === want.filter(w => w.kind === 'place').length && J('__s2.calls.filter(c => c[0] === "strokePoints").length') === want.filter(w => w.kind === 'convoy').length);
  check('what is off the screen is not drawn, and Ceres, the far end of the route, is on it (the room left for the key line: the route fits with a quarter to spare)', want.length < J('campZoomMarks(C).length') && want.some(w => w.name === 'Ceres' || /ceres/i.test(w.name)), JSON.stringify(want.map(w => w.name)));
  check('a mark under the key line (the bottom ' + Kf.keep + ' px) or at the edge is left out', J(`(() => { const s = __mk(${z}); const K = CAMP_FAR; s.cameras.main.scrollY -= (H - K.keep + 5 - H / 2) / ${z}; return 1; })()`) === 1 && J(`(() => { const s = __mk(${z}); const cam = s.cameras.main; const r = campZoomMarks(C).filter(m => { const p = __scr(s, m.x, m.y); return p[1] > H - CAMP_FAR.keep || p[1] < CAMP_FAR.edge || p[0] < CAMP_FAR.edge || p[0] > W - CAMP_FAR.edge; }).length; campFarSync(s); return s.texts.filter(t => t.vis).length === campZoomMarks(C).length - r; })()`));
  g.run(`window.__s3 = __mk(${z}); campFarSync(__s3); window.__n3 = __s3.texts.filter(t => t.vis).length; __s3.cameras.main.zoom = 1; campFarSync(__s3);`);
  check('zoomed back in the names go and the texts stay (hidden, to be used again): none visible, as many made as before', J('__s3.texts.filter(t => t.vis).length') === 0 && J('__s3.texts.length') === J('__n3'));
  check('a name that changes is set again and a name that does not is not (the text is only touched when it differs)', J(`(() => { const s = __mk(${z}); campFarSync(s); const t = s.texts[0]; let sets = 0; const was = t.setText; t.setText = x => { sets++; return was(x); }; campFarSync(s); return sets; })()`) === 0);
}

console.log('C. what leaves them out and what keeps them');
{
  const z = J('campZoomFloor(1, 0)');
  g.run(`__new(); window.__sm = __mk(${z}); __sm.mode = 'won'; campFarSync(__sm);`);
  check('with a result card up (mode is not play) none is drawn', J('__sm.texts.filter(t => t.vis).length') === 0);
  g.run(`window.__sp = __mk(${z}, { mp: {} }); campFarSync(__sp);`);
  check('with the Tab map open none is drawn (the map has its own names)', J('__sp.texts.filter(t => t.vis).length') === 0);
  g.run(`window.__sh = __mk(${z}); campFarSync(__sh); const old = __sh.hud.far.g; __sh.hud = {}; campFarSync(__sh); window.__renewed = __sh.hud.far.g !== old;`);
  check('a scene that starts again (a new hud) makes its graphics anew: they are kept in scene.hud, not on the scene', J('window.__renewed') && J('!Object.prototype.hasOwnProperty.call(__sh, "far")'));
  check('a stand-in scene with no camera, no hud or no campaign does nothing and does not throw', J(`(() => { try { campFarSync({ camp: C, hud: {} }); campFarSync({ camp: null, hud: {}, cameras: {} }); campFarSync({ camp: C, cameras: { main: { zoom: 0.02 } } }); return true; } catch (e) { return String(e); } })()`) === true);
}

console.log('D. the scene calls it and it is registered');
{
  const h = src('index.html'), sc = src('src/campaignscene.js');
  check('campaignscene.js calls campFarSync on a line of its own, once a frame, and the file is registered before the scene', /\n\s*if \(typeof campFarSync === 'function'\) campFarSync\(this\);/.test(sc) && h.indexOf('src/campfarscene.js') > 0 && h.indexOf('src/campfarscene.js') < h.indexOf('src/campaignscene.js'));
  check('the marks are under the HUD (depth 60, the HUD plates are 99 and over) and on the screen camera (scroll factor 0, so the zoom never scales them)', (() => { const f = src('src/campfarscene.js'); return /setScrollFactor\(0\)\.setDepth\(60\)/.test(f) && /setScrollFactor\(0\)\.setDepth\(61\)/.test(f); })());
  check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPFAR FAIL (${failed} of ${n})` : `\nCAMPFAR PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
