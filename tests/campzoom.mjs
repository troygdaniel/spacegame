// smoke: + and - zoom the Campaign view (and the map): the keys, the limits, the memory per level, the wheel with the map open, the edge arrow at every zoom (plain Node, no Chrome)
// Card space-game-campaign-zoom (Troy): "+ and - keys, for the game and for the map; the mouse wheel keeps working; = and numpad too; a short smooth ease; the HUD, panels and strip do not scale; the zoom is remembered for the level and reset on
// a new level; 0 resets; clicks and the edge arrow stay accurate at every zoom". The camera work (three cameras, the HUD on its own) is src/camzoom.js's and needs a browser (looked at by hand, tests/camzoom.mjs checks its numbers); this
// checks what the Campaign adds (src/campzoom.js) and how the scene uses it, on stand-ins.
// Run: node tests/campzoom.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { readFileSync } from 'node:fs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const Z = J('({ min: CAMZOOM.min, max: CAMZOOM.max, key: CAMZOOM.key, hold: CAMZOOM.keyHold })');

console.log('the keys');
const keyOf = c => J(`campZoomKey('${c}')`);
check('+ is the = key with Shift (code Equal) and numpad +: zoom in; - and numpad -: zoom out', [keyOf('Equal'), keyOf('NumpadAdd')].every(k => k && k.dir === 1 && !k.reset) && [keyOf('Minus'), keyOf('NumpadSubtract')].every(k => k && k.dir === -1 && !k.reset));
check('0 and numpad 0 reset', [keyOf('Digit0'), keyOf('Numpad0')].every(k => k && k.reset === true && k.dir === 0));
check('no other key is a zoom key: the flying keys, the orders, Tab, Esc, Enter, the tune kit', ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyF', 'KeyQ', 'KeyI', 'KeyU', 'Tab', 'Escape', 'Enter', 'Digit1', 'Digit2', 'Digit5', 'Digit9', 'BracketRight', 'Backslash', 'BracketLeft', 'Backquote', 'KeyZ', 'KeyX', 'KeyH'].every(c => keyOf(c) === null));
check('a step of the keys is one and a fifth (a notch and a half of the wheel); a held key repeats in smaller steps', near(Z.key, 1.2) && Z.hold > 1 && Z.hold < Z.key, JSON.stringify(Z));
check('+ then - is where you began, and a held + goes on, in small steps', near(J('camzoomKey(camzoomKey(1, 1, false), -1, false)'), 1) && near(J('camzoomKey(1, 1, true)'), Z.hold) && J('camzoomKey(1, 1, true)') < J('camzoomKey(1, 1, false)'));
check('twenty presses stop at the limits of the Long Haul\'s zoom, in and out', J(`(() => { let z = 1; for (let i = 0; i < 20; i++) z = camzoomKey(z, 1, false); return z; })()`) === Z.max && J(`(() => { let z = 1; for (let i = 0; i < 20; i++) z = camzoomKey(z, -1, false); return z; })()`) === Z.min);
check('another range for the map: the clamp and the wheel and the keys take it', J('camzoomClamp(0.01, 0.5, 8)') === 0.5 && J('camzoomClamp(99, 0.5, 8)') === 8 && J('camzoomClamp(3, 0.5, 8)') === 3 && J('camzoomWheel(7.9, -240, 0.5, 8)') === 8 && J('camzoomKey(0.55, -1, false, 0.5, 8)') === 0.5 && J('camzoomClamp(0.01)') === Z.min);

console.log('the view: the scene reads the keys and the HUD does not scale');
g.run(`window.__press = (code, repeat, mode, extra) => { CAMZOOM.want = window.__want; const C = campNew(1, [], { seed: 1 }); const sc = Object.assign({ mode: mode || 'play', leaving: false, mp: null, camp: C }, extra || {}); Campaign.prototype.onKey.call(sc, { code, repeat: !!repeat }); return { want: CAMZOOM.want, orders: JSON.stringify(C.orders), blink: !!C.input.blink }; };`);
const press = (code, want, repeat, mode, extra) => { g.run(`window.__want = ${want}`); return J(`__press('${code}', ${!!repeat}, ${mode ? "'" + mode + "'" : 'null'}, ${extra ? JSON.stringify(extra) : 'null'})`); };
check('in the battle + zooms in and - out (a fifth a press), also the = key and numpad', near(press('Equal', 1).want, 1.2) && near(press('NumpadAdd', 1).want, 1.2) && near(press('Minus', 1).want, 1 / 1.2) && near(press('NumpadSubtract', 1).want, 1 / 1.2));
check('0 returns to the default from anywhere', press('Digit0', 1.5).want === 1 && press('Numpad0', 0.5).want === 1);
check('a held key is read: the scene ignores key repeats, but not these (each repeat is a small step)', near(press('Equal', 1, true).want, Z.hold) && near(press('Minus', 1, true).want, 1 / Z.hold));
check('the limits hold: at the far end - does nothing more, at the near end + does nothing more', press('Minus', Z.min).want === Z.min && press('Equal', Z.max).want === Z.max);
check('only in the battle: not over the story, the pick, the pause, the lost card, or while leaving', ['intro', 'won', 'pick', 'pause', 'lost', 'end'].every(m => press('Equal', 1, false, m).want === 1) && press('Equal', 1, false, 'play', { leaving: true }).want === 1);
const idleKey = press('KeyY', 1);
check('a zoom key does nothing else: no order given, no blink', idleKey.orders === press('Equal', 1).orders && !press('Minus', 1).blink);
check('the wheel is the camera\'s unless the map is open (the scene says it has the wheel then); it is not while leaving', J('[camzoomCanWheel({}), camzoomCanWheel({ camzoomHold: true }), camzoomCanWheel({ leaving: true }), camzoomCanWheel({ dead: true })]').join() === 'true,false,false,false' && J(`(() => { const d = Object.getOwnPropertyDescriptor(Campaign.prototype, 'camzoomHold'); return [d.get.call({ mp: null }), d.get.call({ mp: {} })]; })()`).join() === 'false,true');

console.log('the memory');
check('a level keeps its zoom for a retry and starts at the default on another level', J(`(() => { campZoomKeep(2, 1.45); return [campZoomStart(2), campZoomStart(3), campZoomStart(1)]; })()`).join() === '1.45,1,1');
check('keeping a new level forgets the old one; what is kept is held inside the limits', J(`(() => { campZoomKeep(3, 0.8); const a = [campZoomStart(3), campZoomStart(2)]; campZoomKeep(3, 99); return a.concat([campZoomStart(3)]); })()`).join() === '0.8,1,' + Z.max);
const sc = src('src/campaignscene.js'), cr = sc.slice(sc.indexOf('  create() {'), sc.indexOf('  get camzoomHold()'));
check('create() makes the Long Haul\'s camera zoom for the scene (three cameras: the HUD on its own), after setting where it starts, and puts the Long Haul\'s own zoom back on leaving', /this\.lhZoom = CAMZOOM\.want; CAMZOOM\.want = campZoomStart\(this\.level\); camzoomSetup\(this\)/.test(cr) && /campZoomKeep\(this\.level, CAMZOOM\.want\); CAMZOOM\.want = this\.lhZoom/.test(cr));
check('the HUD is on the screen\'s own camera: every HUD object is screen-fixed (scroll factor 0), which is what camzoom puts on it', /hudG = this\.add\.graphics\(\)\.setScrollFactor\(0\)/.test(cr) && /const t = \(x, y, size, color\) => this\.add\.text\(x, y, '', uiFont\(size, color, \{[^}]*\}\)\)\.setScrollFactor\(0\)/.test(cr));
check('index.html loads campzoom.js after camzoom.js and before the scene runs', (h => h.indexOf('src/camzoom.js') > 0 && h.indexOf('src/campzoom.js') > h.indexOf('src/camzoom.js') && h.indexOf('src/campzoom.js') < h.indexOf('src/main.js'))(src('index.html')));

console.log('the edge arrow at every zoom');
const arrowAt = (z, carrier, scroll) => J(`(() => { const C = campNew('home', [], { seed: 1 }); C.carrier.x = ${carrier[0]}; C.carrier.y = ${carrier[1]}; return campNavArrow(C, { x: ${scroll[0]}, y: ${scroll[1]} }, 1280, 720, ${z}); })()`);
const scr = (z, goal, scroll) => ({ x: (goal[0] - scroll[0] - 640) * z + 640, y: (goal[1] - scroll[1] - 360) * z + 360 }); // where camzoomScreen puts a world point
const carrier = [900, 0], scroll = [carrier[0] - 640, carrier[1] - 360]; // the camera follows the carrier; the goal is Earth, at the origin
check('the goal 900 px away is on the screen when zoomed out to 0.5 (no arrow) and off it at 1 (an arrow)', arrowAt(0.5, carrier, scroll) === null && arrowAt(1, carrier, scroll) !== null);
check('with no zoom given it is as it always was (1)', JSON.stringify(arrowAt(undefined, carrier, scroll)) === JSON.stringify(arrowAt(1, carrier, scroll)));
const angOK = z => { const a = arrowAt(z, carrier, scroll), p = scr(z, [0, 0], scroll); return a && near(a.angle, Math.atan2(p.y - a.y, p.x - a.x), 1e-9) && (a.x === 40 || a.x === 1240 || a.y === 40 || a.y === 680); };
check('the arrow points at where the goal really is on the screen (camzoomScreen\'s formula), on the edge, at 1, 1.6 and 3', [1, 1.6, 3].every(angOK));
check('a goal seen at one zoom and lost at the next is the same line either way: the direction does not depend on the zoom for a point on the centre line', (() => { const a = arrowAt(1, carrier, scroll), b = arrowAt(2.5, carrier, scroll); return a && b && near(a.angle, b.angle, 1e-9) && near(a.dist, b.dist); })());
check('the scene gives the arrow the camera\'s zoom', /campNavArrow\(C, \{ x: cam\.scrollX, y: cam\.scrollY \}, W, H, cam\.zoom\)/.test(sc));
console.log('the map: the view');
const F = J('CAMPMAP.frame'), R = J('CAMPZOOM.map');
const base = J(`campMapFit(campMapBounds(1, false), CAMPMAP.frame)`), fitOf = (z, view, z0, focus) => J(`campMapView(${JSON.stringify(base)}, CAMPMAP.frame, ${z}, ${JSON.stringify(view)}, ${z0}, ${JSON.stringify(focus)})`);
const onScreen = (fit, p) => ({ x: F.x + F.w / 2 + (p.x - fit.cx) * fit.s, y: F.y + F.h / 2 + (p.y - fit.cy) * fit.s });
check('the map\'s range is a half to eight times the level fitted to the frame, and the key steps are the camera\'s', R.min === 0.5 && R.max === 8);
check('zoom 1 is the level fitted to the frame, exactly', JSON.stringify(fitOf(1, base, 1, null)) === JSON.stringify(base));
const z3 = fitOf(3, base, 1, null);
check('zoom about the middle: the scale is three times, the centre stays', near(z3.s, base.s * 3) && near(z3.cx, base.cx) && near(z3.cy, base.cy));
const focus = { x: base.cx + 0.2 * (F.w / 2 / base.s), y: base.cy - 0.15 * (F.h / 2 / base.s) };
const zf = fitOf(2.5, base, 1, focus), before = onScreen(base, focus), after = onScreen(zf, focus);
check('zoom about a place keeps the place where it was on the screen (to a hundredth of a pixel), the map goes in on it', near(before.x, after.x, 0.01) && near(before.y, after.y, 0.01) && near(zf.s, base.s * 2.5), JSON.stringify([before, after]));
const far = { x: base.cx + (F.w / 2 / base.s) * 0.95, y: base.cy + (F.h / 2 / base.s) * 0.95 }, zc = fitOf(8, base, 1, far);
check('zoomed all the way in on the edge of the level, the view stays inside the level (its frame never shows past the fitted extent)', zc.cx + F.w / 2 / zc.s <= base.cx + F.w / 2 / base.s + 1e-6 && zc.cx - F.w / 2 / zc.s >= base.cx - F.w / 2 / base.s - 1e-6 && zc.cy + F.h / 2 / zc.s <= base.cy + F.h / 2 / base.s + 1e-6 && zc.cy - F.h / 2 / zc.s >= base.cy - F.h / 2 / base.s - 1e-6, JSON.stringify(zc));
const out = fitOf(0.5, zf, 2.5, focus);
check('zoomed out below 1 the level is in the middle, at half the scale', near(out.s, base.s * 0.5) && near(out.cx, base.cx) && near(out.cy, base.cy));
check('eased back to 1 after zooming in on a place, the view is the whole level again, exactly', J(`(() => { const base = ${JSON.stringify(base)}, F = CAMPMAP.frame, focus = ${JSON.stringify(focus)}; let v = campMapView(base, F, 2.5, base, 1, focus), z = 2.5; for (let i = 0; i < 400; i++) { const z0 = z; z = camzoomEase(z, 1, 16.67); v = campMapView(base, F, z, v, z0, focus); } return [z, v.s === base.s, v.cx === base.cx, v.cy === base.cy]; })()`).join() === '1,true,true,true');

console.log('the map: the keys, the wheel, the corner');
g.run(`window.__mp = (extra) => Object.assign({ zWant: 1, z: 1, rows: [], selId: '', setId: '', userSel: false }, extra || {});`);
check('with the map open + and - zoom the map and not the camera: the target is the map\'s (0.5 to 8), the camera\'s stays', J(`(() => { CAMZOOM.want = 1; const s = { mp: __mp() }; campZoomPress(s, { dir: 1 }, false); campZoomPress(s, { dir: 1 }, false); return [s.mp.zWant, CAMZOOM.want]; })()`).join() === [1.44, 1].join());
check('0 puts the map back to 1, and the camera\'s zoom is left as it was', J(`(() => { CAMZOOM.want = 1.3; const s = { mp: __mp({ zWant: 4 }) }; campZoomPress(s, { reset: true }, false); return [s.mp.zWant, CAMZOOM.want]; })()`).join() === '1,1.3');
check('twenty presses in stop at 8 and twenty out at 0.5 (the map\'s own limits, not the camera\'s 0.4 to 1.6)', J(`(() => { const s = { mp: __mp() }; for (let i = 0; i < 20; i++) campZoomPress(s, { dir: 1 }, false); const a = s.mp.zWant; for (let i = 0; i < 40; i++) campZoomPress(s, { dir: -1 }, false); return [a, s.mp.zWant]; })()`).join() === '8,0.5');
check('the scene sends the key to the map when it is open (onKey with the map open), and not to the camera', J(`(() => { CAMZOOM.want = 1; const sc = { mode: 'play', leaving: false, mp: __mp(), camp: campNew(1, [], { seed: 1 }) }; Campaign.prototype.onKey.call(sc, { code: 'Equal', repeat: false }); Campaign.prototype.onKey.call(sc, { code: 'Equal', repeat: true }); return [+sc.mp.zWant.toFixed(4), CAMZOOM.want]; })()`).join() === [+(1.2 * 1.03).toFixed(4), 1].join());
check('the wheel over the map zooms it in the same steps as the camera, inside the map\'s limits; nothing without a map', J(`(() => { const mp = __mp(); campZoomMapWheel(mp, -100); const a = mp.zWant; campZoomMapWheel(mp, 200); const b = mp.zWant; for (let i = 0; i < 60; i++) campZoomMapWheel(mp, -240); const c = mp.zWant; campZoomMapWheel(null, -100); return [a > 1, b < a, c]; })()`).join() === 'true,true,8');
const stepRun = J(`(() => { const base = ${JSON.stringify(base)}, mp = { base, fit: Object.assign({}, base), z: 1, zWant: 2.5, rows: [], selId: '', setId: '', userSel: false }; const zs = [], fits = []; for (let i = 0; i < 200; i++) { const moved = campMapZoomStep(mp, CAMPMAP.frame, 16.67); zs.push(mp.z); fits.push(mp.fit.s); if (!moved && i > 5) break; } return { zs, last: mp.fit.s, base: base.s, again: campMapZoomStep(mp, CAMPMAP.frame, 16.67) }; })()`);
check('the map eases to its zoom: it moves every frame, never past it, lands exactly, and the view is the base at that zoom; no frame moves it once there', stepRun.zs[0] > 1 && stepRun.zs[0] < 2.5 && stepRun.zs.every((z, i) => z <= 2.5 && (!i || z >= stepRun.zs[i - 1])) && stepRun.zs[stepRun.zs.length - 1] === 2.5 && near(stepRun.last, stepRun.base * 2.5) && stepRun.again === false, stepRun.zs.slice(0, 4).join(' '));
const foc = (mp) => J(`campMapFocus(${JSON.stringify(mp)})`), rowsA = [{ id: 'a', x: 10, y: 20 }, { id: 'b', x: -30, y: 5 }];
check('the zoom is about the place you set by a click, else the one you chose in the list, else the middle (null); a row that is gone gives the middle', JSON.stringify(foc({ rows: rowsA, setId: 'b', selId: 'a', userSel: true })) === '{"x":-30,"y":5}' && JSON.stringify(foc({ rows: rowsA, selId: 'a', userSel: true })) === '{"x":10,"y":20}' && foc({ rows: rowsA, selId: 'a', userSel: false }) === null && foc({ rows: rowsA, setId: 'zz' }) === null && foc(null) === null);
check('W S A D and a click in the list or on the map mark the choice (userSel) that the zoom is about', /mp\.userSel = true; \} return true; \}; \/\/ a choice in the list/.test(src('src/campmapdraw.js')) && /mp\.selId = row\.id; mp\.userSel = true;/.test(src('src/campmapdraw.js')));
const md = src('src/campmapdraw.js');
check('the paint steps the zoom first (before it reads mp.fit), moves the names with the marks while it eases, and places them afresh when it has arrived', md.indexOf('campMapZoomStep(mp, F, dt)') > 0 && md.indexOf('campMapZoomStep(mp, F, dt)') < md.indexOf('const C = s.camp, f = mp.fit') && /if \(moving\) campMapNamesMove\(s\); else if \(mp\.z === mp\.zWant && mp\.namesZ !== mp\.z\) \{ campMapNames\(s\)/.test(md));
check('the wheel is taken by the map when it opens and given back when it closes', /s\.input\.on\('wheel', mp\.onWheel\)/.test(md) && /s\.input\.off\('wheel', s\.mp\.onWheel\)/.test(md));
check('Z (the whole system) is a new extent: the zoom goes back to 1', /mp\.base = campMapFit\(campMapBounds\(s\.camp\.level, mp\.whole\), CAMPMAP\.frame\); mp\.fit = Object\.assign\(\{\}, mp\.base\); mp\.z = mp\.zWant = mp\.namesZ = 1;/.test(md));
const zt = J(`uiText('camp.map.zoom', { pct: 800 })`);
check('the corner says the zoom level and the keys, one short line that fits beside the title (40 letters at most)', zt === 'ZOOM 800%   + - zoom   0 reset' && zt.length <= 40 && /ui\.zoomText\.setText|mp\.zoomText\.setText\(uiText\('camp\.map\.zoom', \{ pct: Math\.round\(mp\.zWant \* 100\) \}\)\)/.test(md), zt);

console.log('the map: names');
const namesAt = J(`(() => { const F = CAMPMAP.frame, base = ${JSON.stringify(base)}, mk = (x, y, ox, oy) => { const t = { world: { x, y }, off: { x: ox, y: oy }, vis: null, pos: null, setPosition(a, b) { t.pos = [a, b]; return t; }, setVisible(v) { t.vis = v; return t; } }; return t; }; const band = { band: true, vis: null, setVisible(v) { band.vis = v; return band; } }; const a = mk(base.cx, base.cy, 5, 12), b = mk(base.cx + 1e7, base.cy, 0, 0); const sc = { mp: { fit: { s: base.s * 2, cx: base.cx, cy: base.cy }, nameObjs: [a, b, band] } }; campMapNamesMove(sc); return { a: a.pos, av: a.vis, bv: b.vis, bandv: band.vis, mid: [F.x + F.w / 2, F.y + F.h / 2] }; })()`);
check('while the zoom eases a name keeps its place from its mark (5 right, 12 below here), a name whose mark has gone out of the frame is hidden, and the belts\' names wait', near(namesAt.a[0], namesAt.mid[0] + 5) && near(namesAt.a[1], namesAt.mid[1] + 12) && namesAt.av === true && namesAt.bv === false && namesAt.bandv === false, JSON.stringify(namesAt));

console.log('the map: clicks at every zoom');
const clicks = z => J(`(() => {
  const C = campNew(1, [], { seed: 1 }), F = CAMPMAP.frame, base = ${JSON.stringify(base)}, rows = campNavRows(C);
  const focus = rows.length ? { x: rows[Math.min(2, rows.length - 1)].x, y: rows[Math.min(2, rows.length - 1)].y } : null;
  const fit = campMapView(base, F, ${z}, base, 1, focus), P = r => campMapPoint(fit, F, r.x, r.y), inside = r => { const p = P(r); return p.x >= F.x + 4 && p.x <= F.x + F.w - 4 && p.y >= F.y + 4 && p.y <= F.y + F.h - 4; };
  const seen = rows.filter(inside).filter(r => rows.filter(inside).every(o => o === r || Math.hypot(P(o).x - P(r).x, P(o).y - P(r).y) > 40)); // each at least 40 px from the next, so a click can only mean it
  const out = []; seen.forEach(r => { const mp = { fit, rows, list: [], selId: '', setId: '', dirty: false, btnFly: null, btnFast: null }; const sc = { mp, camp: C }; const p = P(r); const ok = campMapClick(sc, p.x + 3, p.y - 2); out.push([r.id, ok, mp.setId === r.id, mp.userSel === true]); });
  const none = (() => { const mp = { fit, rows, list: [], selId: '', setId: '', dirty: false, btnFly: null, btnFast: null }; return campMapClick({ mp, camp: C }, F.x + F.w + 30, F.y + F.h / 2); })();
  return { n: seen.length, out, none, rows: rows.length };
})()`);
[0.5, 1, 2, 4, 8].forEach(z => { const r = clicks(z); check('at zoom ' + z + ': a click on each place in the frame (' + r.n + ' of them, a few pixels off its mark) sets that place, and a click outside the frame sets none', r.n >= 1 && r.out.every(o => o[1] && o[2]) && r.none === false, JSON.stringify(r.out)); });
check('at least three different places were checked across the zooms (the level has them)', [0.5, 1].every(z => clicks(z).n >= 3));
console.log('the key table, the H page and the key line');
const row = J(`controlsGroup('campaign').rows.find(r => r.k.includes('+'))`);
check('the key table has one row for the zoom keys in the Campaign group: + - 0, what they do and the wheel', row && row.k.join(' ') === '+ - 0' && /zoom/i.test(row.t) && /wheel/.test(row.t) && /0 resets/.test(row.t), JSON.stringify(row));
check('so the H page lists it (campKeysPage), once', J(`campKeysPage().flatMap(g => g.rows).filter(r => r.caps.includes('+')).length`) === 1);
check('and the bottom key line says + - Zoom, before H Keys, and still fits the screen (8.6 px a letter from x 24 to 1272)', (l => /Tab Map {3}\+ - Zoom {3}H Keys$/.test(l) && 24 + l.length * 8.6 <= 1272)(J(`uiText('camp.ui.keys', { panels: campPanelKeyLine() })`)));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
