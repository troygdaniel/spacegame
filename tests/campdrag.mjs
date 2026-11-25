// smoke: drag the view: press and drag pans the flight view and the Tab map away from the cruiser, a recentre mark, S and the flying keys bring it back (plain Node, no Chrome)
// Card space-game-drag-view (Troy, 22 Nov 2026, from his play: "drag the map around so the centre point can move"). The flight camera followed the cruiser and the map was fitted to the level, so the
// centre could not be moved. Now a press and a drag with the mouse (past a few pixels: a click is a click) pans the flight camera off the cruiser, where it stays, and pans the Tab map; a RECENTRE mark
// shows while the view is off; S (which already resets the zoom: it was Backspace until card space-game-keys-select), a click on the mark, and a flying key held a moment bring it back. The wheel zooms about the pointer while panned. src/campdrag.js,
// src/campmap.js (the map's free view), src/camzoom.js (the anchor of a zoom). Phaser is not in a plain Node game, so the camera and the scene here are stand-ins that keep what the code writes to them;
// tests/campdrag-boot.mjs (Chrome, not in the smoke) flies the real thing.
//   A  the press: a click stays a click under CAMPDRAG.move pixels, a drag moves by what the pointer moved, a release says which it was
//   B  the flight pan: the camera lets go of the cruiser and moves by the drag over the zoom; again and again; only in the battle, not over a list, the map or a card
//   C  coming back: the camera follows the cruiser again; S, the mark and a flying key held CAMPDRAG.fly ms do it; a key tapped does not
//   D  the map: the free view (no hold, inside the system's box), the pan, the zoom that keeps the pan, the recentre
//   E  the zoom about the pointer: the world point under it stays under it as the zoom eases
//   F  the words and the wiring: the mark names the key from the table, the help page says it (in the zoom row), the scene and the map call it, the script is in the page
// Run: node tests/campdrag.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 240) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const R = c => { try { g.run(c); } catch (e) { check('setup: ' + String(c).trim().slice(0, 70), false, e.message); } }; // a setup that throws is a failed check, not a crash of the run
const read = f => readFileSync(join(ROOT, f), 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// stand-ins: the camera keeps what the code writes (its scroll, whether it follows), the scene is what the code reads of the Campaign scene
R(`
  window.__cam = (zoom, sx, sy) => ({ scrollX: sx === undefined ? 1000 : sx, scrollY: sy === undefined ? 500 : sy, zoom: zoom === undefined ? 0.5 : zoom, following: true, starts: 0, stopFollow() { this.following = false; }, startFollow(t) { this.following = true; this.target = t; this.starts++; } });
  window.__scene = (zoom, sx, sy) => ({ cameras: { main: __cam(zoom, sx, sy) }, sp: { cv: { name: 'sprite' } }, camp: { carrier: { id: 'cv', x: 5000, y: 3000 }, result: null }, mode: 'play', _cz: { anchor: null, cur: zoom === undefined ? 0.5 : zoom }, panned: false, mp: null });
`);

// ---- A. the press ----
console.log('A. the press');
check('the move that makes a press a drag is a few pixels, not none', J('CAMPDRAG.move') >= 3 && J('CAMPDRAG.move') <= 12, J('CAMPDRAG.move'));
R(`window.__d = campDragNew(); campDragDown(__d, 400, 300);`);
check('a move under the threshold is still a click: no pan', J('campDragMove(__d, 402, 301)') === null);
const click = J('campDragUp(__d)');
check('a release after it says click, at the press point', click && click.drag === false && click.x === 400 && click.y === 300, JSON.stringify(click));
R(`campDragDown(__d, 400, 300);`);
const m1 = J('campDragMove(__d, 440, 330)'), m2 = J('campDragMove(__d, 450, 320)');
check('past the threshold it is a drag: the first move is how far the pointer is from where it was pressed', m1 && m1.dx === 40 && m1.dy === 30, JSON.stringify(m1));
check('and each move after it is the pointer\'s move since the last', m2 && m2.dx === 10 && m2.dy === -10, JSON.stringify(m2));
check('a pointer back where it started does not turn a drag into a click', J('campDragMove(__d, 400, 300)') && J('campDragUp(__d)').drag === true);
check('a move with no press is nothing, and a release with no press says so', J('campDragMove(__d, 10, 10)') === null && J('campDragUp(__d)') === null);
R(`campDragDown(__d, 1, 1); campDragMove(__d, 50, 50); campDragUp(__d); campDragDown(__d, 7, 7);`);
check('a new press starts afresh (no drag left over from the last)', J('campDragMove(__d, 8, 8)') === null && J('campDragUp(__d)').drag === false);

// ---- B. the flight pan ----
console.log('B. the flight pan');
R(`window.__s = __scene(0.5); campViewPan(__s, 100, -50);`);
const p1 = J('({ x: __s.cameras.main.scrollX, y: __s.cameras.main.scrollY, f: __s.cameras.main.following, p: __s.panned })');
check('a drag of 100 px right and 50 up at zoom 0.5 moves the camera 200 px left and 100 down in the world (the world follows the hand), and the camera lets go of the cruiser', p1.x === 800 && p1.y === 600 && p1.f === false && p1.p === true, JSON.stringify(p1));
R(`campViewPan(__s, 100, -50);`);
check('a second drag adds to the first', J('__s.cameras.main.scrollX') === 600 && J('__s.cameras.main.scrollY') === 700);
R(`window.__s2 = __scene(2); campViewPan(__s2, 100, 0);`);
check('zoomed in (2) the same drag is half as far in the world (the hand moves a point of the world, not the camera by a fixed step)', J('__s2.cameras.main.scrollX') === 950, J('__s2.cameras.main.scrollX'));
check('the cruiser and the battle are not touched by the pan (the camp is read, never written)', J('__s.camp.carrier.x') === 5000 && J('__s.camp.carrier.y') === 3000 && J('__s.mode') === 'play');
R(`window.__s3 = __scene(0.5); __s3._cz.anchor = { wx: 1, wy: 2, sx: 3, sy: 4 }; campViewPan(__s3, 10, 10);`);
check('a drag drops a zoom\'s anchor (the hand has the view now)', J('__s3._cz.anchor') === null);
const can = (mode, extra) => J(`(() => { const s = __scene(0.5); s.mode = ${JSON.stringify(mode)}; ${extra || ''} return campDragCanStart(s, 640, 360); })()`);
check('a drag may start in the battle, in open space', can('play') === true);
check('not over the story card, the briefing, the debrief, the pause (any mode but the battle)', ['intro', 'brief', 'debrief', 'won', 'pause', 'refit', 'pick', 'lost', 'end'].every(m => can(m) === false));
check('not with the map open (the map has its own drag), not while the scene is leaving, not with the page of keys open', can('play', 's.mp = {};') === false && can('play', 's.leaving = true;') === false);
R(`window.__sp = __scene(0.5); __sp.pn = campPanelNew(); window.__C = campNew(1, [], { seed: 1 }); __sp.camp = __C; campPanelGo(__sp.pn, __C, 'cruiser');`);
const L = J('(() => { const def = campPanelDef(campPanelOpen(__sp.pn)), V = campPanelView(__sp.pn, __C), G = campPanelsGeometry(def, V.total); return { x: G.x + 20, y: G.y + 20 }; })()');
check('not on an open list: a press on its rows is the list\'s click, a press beside it is the view\'s', J(`campDragCanStart(__sp, ${L.x}, ${L.y})`) === false && J('campDragCanStart(__sp, 640, 360)') === true, JSON.stringify(L));

// ---- C. coming back ----
console.log('C. coming back');
R(`window.__s = __scene(0.5); campViewPan(__s, 100, 0); campViewRecentre(__s);`);
check('recentre: the camera follows the cruiser again (its sprite), and the view is no longer off', J('__s.cameras.main.following') === true && J('__s.cameras.main.target.name') === 'sprite' && J('__s.panned') === false);
R(`window.__s = __scene(0.5); campViewRecentre(__s);`);
check('recentre when the view is not off does nothing (no second follow)', J('__s.cameras.main.starts') === 0);
R(`window.__s = __scene(0.5); campViewPan(__s, 100, 0);`);
check('a flying key held under CAMPDRAG.fly ms does not bring the view back', J('campDragFlyTick(__s, 200, true)') === false && J('__s.panned') === true);
check('held past it does: the view is back on the cruiser', J(`campDragFlyTick(__s, ${'CAMPDRAG.fly'} , true)`) === true && J('__s.panned') === false && J('__s.cameras.main.following') === true);
R(`window.__s = __scene(0.5); campViewPan(__s, 100, 0); campDragFlyTick(__s, 300, true); campDragFlyTick(__s, 300, false);`);
check('a key let go starts the count again: tapping the arrows now and then does not take the view back', J('campDragFlyTick(__s, 300, true)') === false && J('__s.panned') === true);
R(`window.__s = __scene(0.5); campDragFlyTick(__s, 5000, true);`);
check('a flying key with the view on the cruiser does nothing', J('__s.cameras.main.starts') === 0);
R(`window.__s = __scene(0.5); campViewPan(__s, 100, 0); __s.mode = 'debrief'; campDragFrame(__s, 16, false);`);
check('the battle ending (a card over it) brings the view back by itself', J('__s.panned') === false && J('__s.cameras.main.following') === true);
// S is the zoom reset of campZoomPress: it recentres too, the flight's and the map's
R(`window.__s = __scene(0.5); campViewPan(__s, 100, 0); campZoomPress(__s, { dir: 0, reset: true }, false);`);
check('S (the zoom reset) recentres the flight view too', J('__s.panned') === false && J('__s.cameras.main.following') === true && near(J('CAMZOOM.want'), J('campZoomDefault()')));
check('and a zoom key that is not the reset leaves the pan alone', (() => { R(`window.__s = __scene(0.5); campViewPan(__s, 100, 0); campZoomPress(__s, { dir: -1, reset: false }, false);`); return J('__s.panned') === true; })());

// ---- D. the map ----
console.log('D. the map');
R(`
  window.__F = CAMPMAP.frame; window.__C1 = campNew(1, [], { seed: 1 });
  window.__mp = () => { const base = campMapFit(campMapBounds(1, false, __C1.L), __F), wholeBase = campMapFit(campMapBounds(1, true, __C1.L), __F); return { base, wholeBase, fit: Object.assign({}, base), z: 1, zWant: 1, rows: [], zMin: campMapZMin(base, wholeBase, CAMPZOOM.map.min), box: campMapBounds(1, true, __C1.L), panned: false }; };
`);
const base = J('__mp().base');
const freeA = J(`campMapView(__mp().base, __F, 3, { s: ${base.s}, cx: ${base.cx + 90000}, cy: ${base.cy} }, 3, null, __mp().wholeBase)`), freeB = J(`(() => { const m = __mp(); return campMapView(m.base, __F, 3, { s: m.base.s, cx: m.base.cx + 90000, cy: m.base.cy }, 3, null, m.wholeBase, m.box); })()`);
check('the map\'s view holds the centre inside the level\'s extent when it is not panned (as it always did)', Math.abs(freeA.cx - base.cx) < 20000, JSON.stringify([freeA.cx, base.cx]));
const box = J('__mp().box');
check('with a free box it holds the centre only inside the whole system\'s bounds', freeB.cx <= box.x1 + 1e-6 && freeB.cx >= box.x0 - 1e-6 && freeB.cx > freeA.cx, JSON.stringify([freeB.cx, box]));
R(`window.__m = __mp(); window.__c0 = Object.assign({}, __m.fit); campMapPan(__m, __F, 100, -40);`);
const pn = J('({ cx: __m.fit.cx, cy: __m.fit.cy, panned: __m.panned })'), c0 = J('__c0');
check('a drag of the map moves its centre by the drag over the scale (the map follows the hand): 100 px right moves the centre 100/s left', near(pn.cx, c0.cx - 100 / c0.s, 1e-9) && near(pn.cy, c0.cy + 40 / c0.s, 1e-9) && pn.panned === true, JSON.stringify({ pn, c0 }));
R(`campMapPan(__m, __F, -1e9, -1e9);`);
const edge = J('({ cx: __m.fit.cx, cy: __m.fit.cy })');
check('it cannot be dragged out of the system: the centre stops at the bounds', near(edge.cx, box.x1, 1e-9) && near(edge.cy, box.y1, 1e-9), JSON.stringify({ edge, box }));
R(`window.__m = __mp(); campMapPan(__m, __F, 800, 200); window.__cp = Object.assign({}, __m.fit); __m.zWant = 3; for (let i = 0; i < 150; i++) campMapZoomStep(__m, __F, 16);`);
check('zooming a panned map keeps the pan (the hold does not pull it back to the level\'s middle)', near(J('__m.fit.cx'), J('__cp').cx, 1e-6) && near(J('__m.fit.cy'), J('__cp').cy, 1e-6) && J('__m.z') === 3, JSON.stringify([J('__m.fit'), J('__cp')]));
R(`window.__m = __mp(); __m.zWant = 3; for (let i = 0; i < 150; i++) campMapZoomStep(__m, __F, 16); window.__held = Object.assign({}, __m.fit);`);
check('a map that was never panned zooms as before: the hold works (centre on the level\'s own middle at zoom 3 of nothing set)', near(J('__held').cx, base.cx, 1e-6) && near(J('__held').cy, base.cy, 1e-6));
R(`window.__m = __mp(); campMapPan(__m, __F, 800, 200); campMapRecentre(__m, __F);`);
check('recentre: the map is on the level again and no longer panned', near(J('__m.fit.cx'), base.cx, 1e-6) && near(J('__m.fit.cy'), base.cy, 1e-6) && J('__m.panned') === false);
R(`window.__s = __scene(0.5); __s.mp = __mp(); campMapPan(__s.mp, __F, 800, 200); __s.mp.zWant = 4; campZoomPress(__s, { dir: 0, reset: true }, false);`);
check('S on the map is the zoom reset and the recentre', J('__s.mp.zWant') === 1 && J('__s.mp.panned') === false && near(J('__s.mp.fit.cx'), base.cx, 1e-6));

// ---- E. the zoom about the pointer ----
console.log('E. the zoom about the pointer');
R(`window.__sa = __scene(0.4, 2000, 1000); campViewPan(__sa, 0, 0); campViewAnchor(__sa, 900, 200);`);
const an = J('__sa._cz.anchor');
check('the anchor is the world point under the pointer, and where on the screen it is', an && near(an.wx, 2000 + 640 + (900 - 640) / 0.4, 1e-9) && an.sx === 900 && an.sy === 200, JSON.stringify(an));
const sc = J('camzoomAnchorScroll(__sa._cz.anchor, 0.8)');
check('as the zoom eases to 0.8 the scroll puts the same world point back under the pointer', !!an && !!sc && near(sc.x + 640 + (900 - 640) / 0.8, an.wx, 1e-9) && near(sc.y + 360 + (200 - 360) / 0.8, an.wy, 1e-9), JSON.stringify(sc));
check('with no anchor (not panned: the cruiser is in the middle) the zoom is as it was: no anchor is made', (() => { R(`window.__sb = __scene(0.4); campViewAnchor(__sb, 900, 200);`); return J('__sb._cz.anchor') === null; })());

// ---- F. the words and the wiring ----
console.log('F. the words and the wiring');
const mark = J('uiText("camp.hud.recentre")');
check('the mark says RECENTRE and names the key from the table, not a letter written into the words', /recentre/i.test(mark) && mark.includes(J('CAMP_KEYS.zoomreset.k')) && !/\{/.test(mark), mark);
const rows = J("(CONTROLS.find(c => c.id === 'campaign') || { rows: [] }).rows.map(r => r.k.join(' ') + ' ' + r.t)");
check('the H page says that a drag pans, in the row of the zoom, where Q is named (a row of its own did not fit the page)', rows.some(r => /drag/i.test(r) && /Q resets/.test(r)), JSON.stringify(rows.filter(r => /drag|Q resets/i.test(r))));
const html = read('index.html'), scene = read('src/campaignscene.js'), mapdraw = read('src/campmapdraw.js'), zoom = read('src/campzoom.js'), cz = read('src/camzoom.js');
check('the script is in the page, after the map and the zoom it uses', /<script src="src\/campdrag\.js"><\/script>/.test(html) && html.indexOf('src/campdrag.js') > html.indexOf('src/campzoom.js'));
check('the scene installs it once and ticks it every frame', /campDragInstall\(this\)/.test(scene) && /campDragFrame\(this/.test(scene));
check('S is the reset in campZoomPress and recentres', /campViewRecentre|campMapRecentre/.test(zoom));
check('the zoom frame puts the scroll back for an anchor', /camzoomAnchorScroll/.test(cz));
check('the map\'s click is read on release, so a drag that starts on a mark is not a click on it (campMapClick is called by the drag code, not by a pointerdown)', !/s\.input\.on\('pointerdown', mp\.onPointer\)/.test(mapdraw) && /campdrag\.js/.test(mapdraw));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `DRAG VIEW FAIL (${failed} of ${n})` : `DRAG VIEW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
