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
const base = press('KeyY', 1);
check('a zoom key does nothing else: no order given, no blink', base.orders === press('Equal', 1).orders && !press('Minus', 1).blink);
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
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
