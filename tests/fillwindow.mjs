// smoke: fill the window, landing A: the sizing rule (a window's shape in, the game's size out, the cap, 16:9 is exactly today's), the safe area, the switch, the flight's cameras, and the 1280 by 720 maths kept true (plain Node, no Chrome)
// Card space-game-fill-window-a-flight (Troy, 25 Nov 2026; the plan is the report on card space-game-fill-window-scope). src/fillwindow.js is the one new file:
//   A. the switch: CAMP.flags.fill is false in the table; ?fill=1 turns it on, ?fill=0 off whatever the flag says; fillSet keeps the choice in the browser and fillLoad reads it back
//   B. the sizing rule (Troy: "extra room because i open up the window.. not scale"): a FIXED scale, 1.23 screen px a game px, so a bigger window is more game px; a window too small for 1280 by 720 at it scales down to fit;
//      the cap, 1.5 times 1280 by 720 each way, past which the picture scales up; the tests' 1280 by 720 window is exactly 1280 by 720
//   C. the safe area and the helpers: the offsets, the scroll and the pointer as the old maths want them; all of them give back what they got while the game is 1280 by 720
//   D. fillSync and fillRelease: the game's size, the three cameras (the world and the stars on the whole size, the canvas HUD on the centred 1280 by 720), the star layers; only when the window or the switch changes; back when the
//      scene pauses or ends and while the Tab map is open
//   E. the old maths stay true: a world point's place worked out the 1280 by 720 way, through the helpers, is where the larger camera really draws it (minus the safe area's offset), at any zoom
//   F. the files that read the camera or the pointer by hand go through the helpers; the page HUD and the screens host take their font size from the scale, not from the canvas's width; the Settings button; the words
// Run: node tests/fillwindow.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');

console.log('A. the switch');
check('the table\'s flag is false: the game is as it was for every player', J('CAMP.flags.fill') === false && J('fillOn()') === false);
check('?fill=1, a bare ?fill, =on and =true turn it on; ?fill=0, =off and =false are off; another name is not mine', ['?fill=1', '?x=1&fill', '?fill=on', '?FILL=TRUE'].every(a => J(`fillAddrOn(${JSON.stringify(a)})`) === true) && ['?fill=0', '?fill=off', '?a=b&fill=false'].every(a => J(`fillAddrOff(${JSON.stringify(a)})`) === true) && J(`fillAddrVal('?fillx=1&refill=1')`) === null);
g.run(`CAMP.flags.fill = true; window.location = { search: '?fill=0' }; FILL.memo.s = null;`);
check('?fill=0 in the page\'s address wins over the flag (the tests\' way back)', J('fillOn()') === false);
g.run(`CAMP.flags.fill = false; window.location = { search: '?fill=1' }; FILL.memo.s = null;`);
check('?fill=1 turns it on with the flag off', J('fillOn()') === true);
g.run(`window.location = { search: '' }; FILL.memo.s = null;`);
check('fillSet keeps the choice in the browser and fillLoad reads it back', J('fillSet(true)') === true && J('CAMP.flags.fill') === true && J(`localStorage.getItem(FILL.store)`) === '1' && (g.run('CAMP.flags.fill = false'), J('fillLoad()')) === true && J('CAMP.flags.fill') === true && J('fillSet(false)') === false && J(`localStorage.getItem(FILL.store)`) === '0' && J('fillLoad()') === false);

console.log('B. the sizing rule');
const size = (w, h) => J(`fillSize(${w}, ${h})`);
check('the table: a fixed scale of 1.23 screen px for a game px (the size on Troy\'s own window today, 1578 / 1280), and a cap of 1.5 times 1280 by 720 each way', J('FILL.k') === 1.23 && J('FILL.cap') === 1.5 && Math.abs(1578 / 1280 - J('FILL.k')) < 0.01);
check('Troy\'s window, 1578 by 1000: the scale is the fixed one, the game is 1282 by 814: the width he sees today and 94 game px more room up and down', (z => z.k === 1.23 && z.w === 1282 && z.h === 814 && z.ox === 1 && z.oy === 47)(size(1578, 1000)), JSON.stringify(size(1578, 1000)));
check('a bigger window is MORE ROOM at the same scale, not a bigger picture: 1920 by 1080 is 1560 by 878 game px, 2100 by 900 is 1708 by 732', (a => a.k === 1.23 && a.w === 1560 && a.h === 878 && a.ox === 140 && a.oy === 79)(size(1920, 1080)) && (b => b.k === 1.23 && b.w === 1708 && b.h === 732 && b.ox === 214 && b.oy === 6)(size(2100, 900)), JSON.stringify([size(1920, 1080), size(2100, 900)]));
check('the scale never grows with the window under the cap: every window from Troy\'s up to 2300 by 1300 has k 1.23', [[1578, 1000], [1700, 1000], [1920, 1080], [2100, 900], [2300, 1300], [1600, 1300]].every(([w, h]) => size(w, h).k === 1.23));
check('the tests\' window, 1280 by 720, is too small for the fixed scale: it scales down to fit, exactly 1280 by 720, no offset (today\'s game, number for number)', (z => z.w === 1280 && z.h === 720 && z.ox === 0 && z.oy === 0 && z.k === 1)(size(1280, 720)));
check('a smaller window scales down to fit as today: 640 by 360 is 1280 by 720 at half size; a window too small one way only keeps 1280 or 720 that way and has room the other way', (a => a.w === 1280 && a.h === 720 && a.k === 0.5)(size(640, 360)) && (b => b.w === 1280 && b.h > 720 && b.k < 1.23)(size(1400, 1000)) && (c => c.h === 720 && c.w > 1280 && c.k < 1.23)(size(1800, 800)), JSON.stringify([size(1400, 1000), size(1800, 800)]));
check('the game is never less than 1280 by 720, whatever the window', [[300, 900], [900, 300], [1000, 1000], [5000, 800], [1578, 1000], [1281, 720], [1280, 721], [200, 200]].every(([w, h]) => { const z = size(w, h); return z.w >= 1280 && z.h >= 720; }));
check('THE CAP: no window shows more than 1920 by 1080 game px; past it the picture scales up again (2560 by 1440 is 1920 by 1080 at 1.33; 3840 by 2160 at 2)', (a => a.w === 1920 && a.h === 1080 && Math.abs(a.k - 2560 / 1920) < 1e-9)(size(2560, 1440)) && (b => b.w === 1920 && b.h === 1080 && b.k === 2)(size(3840, 2160)) && [[2560, 1440], [3840, 2160], [5000, 800], [800, 5000], [3000, 3000], [2400, 1400]].every(([w, h]) => { const z = size(w, h); return z.w <= 1920 && z.h <= 1080; }), JSON.stringify([size(2560, 1440), size(5000, 800), size(3000, 3000)]));
check('just under the cap the scale is still the fixed one (2360 by 1328 is 1918 by 1080 at 1.23)', (z => z.k === 1.23 && z.w <= 1920 && z.h <= 1080 && z.w >= 1916)(size(2360, 1328)), JSON.stringify(size(2360, 1328)));
check('both sides are an even number of px and the safe area starts on a whole pixel, so the middle of the view is the middle of the safe area', [[1578, 1000], [2100, 900], [1921, 1083], [1333, 777], [2560, 1440]].every(([w, h]) => { const z = size(w, h); return z.w % 2 === 0 && z.h % 2 === 0 && Number.isInteger(z.ox) && Number.isInteger(z.oy) && z.ox === (z.w - 1280) / 2 && z.oy === (z.h - 720) / 2; }));
check('no window (0, a NaN, a negative) is 1280 by 720', [[0, 0], ['NaN', 5], [-3, 100]].every(([w, h]) => { const z = size(w, h); return z.w === 1280 && z.h === 720 && z.ox === 0 && z.oy === 0; }));

console.log('C. the safe area and the helpers');
check('while the game is 1280 by 720 every helper gives back what it got', J('[fillW(), fillH(), fillOx(), fillOy()]').join() === '1280,720,0,0' && J('fillSX({ scrollX: 77 })') === 77 && J('fillSY({ scrollY: -5 })') === -5 && J('fillPX({ x: 300 })') === 300 && J('fillPY({ y: 9 })') === 9 && J('fillPutX(12)') === 12 && J('fillPutY(34)') === 34);
g.run(`FILL.now = { on: true, w: 1680, h: 811, ox: 200, oy: 46 };`);
check('with the window taken: the scroll is read plus the offset, a pointer minus it, and a scroll worked out the old way is given back minus it', J('fillSX({ scrollX: 77 })') === 277 && J('fillSY({ scrollY: -5 })') === 41 && J('fillPX({ x: 300 })') === 100 && J('fillPY({ y: 9 })') === -37 && J('fillPutX(277)') === 77 && J('fillPutY(41)') === -5 && J('[fillW(), fillH(), fillOx(), fillOy()]').join() === '1680,811,200,46');
check('camzoom\'s own names for them answer the same (the flight\'s files call these)', J('camzoomSX({ scrollX: 77 })') === 277 && J('camzoomSY({ scrollY: -5 })') === 41 && J('camzoomPutX(277)') === 77 && J('camzoomPutY(41)') === -5 && J('campPX({ x: 300 })') === 100 && J('campPY({ y: 9 })') === -37);

console.log('E. the old maths stay true');
{ // the camera Phaser makes for a w by h viewport at (0, 0) draws a world point at (wx - scrollX - w / 2) * z + w / 2; a follow puts the target in its middle: scrollX = tx - w / 2
  const real = (wx, sx, w, z) => (wx - sx - w / 2) * z + w / 2;
  const ok = [[1680, 812, 200, 46], [1280, 812, 0, 46], [1280, 720, 0, 0]].every(([w, h, ox, oy]) => { g.run(`FILL.now = { on: true, w: ${w}, h: ${h}, ox: ${ox}, oy: ${oy} };`);
    return [0.335, 1, 0.2, 1.6].every(z => [[5000, 4000, 5300, 3900], [100, -50, -400, 700]].every(([tx, ty, wx, wy]) => { const sx = tx - w / 2, sy = ty - h / 2; // the camera follows (tx, ty)
      const p = J(`camzoomScreen({ _cz: 1, cameras: { main: { scrollX: ${sx}, scrollY: ${sy}, zoom: ${z} } } }, ${wx}, ${wy})`); // the place the old maths give, in the safe area
      const back = J(`campClickWorld ? 1 : 0`);
      return Math.abs(p.x + ox - real(wx, sx, w, z)) < 1e-6 && Math.abs(p.y + oy - real(wy, sy, h, z)) < 1e-6 && back === 1; })); });
  check('a world point\'s place by the 1280 by 720 maths, plus the safe area\'s offset, is where the larger camera draws it: three sizes, four zooms, a follow anywhere', ok);
  g.run(`FILL.now = { on: true, w: 1680, h: 812, ox: 200, oy: 46 };`);
  const w0 = J(`(() => { const cam = { scrollX: 5000 - 840, scrollY: 4000 - 406, zoom: 0.5 }; const s = camzoomScreen({ _cz: 1, cameras: { main: cam } }, 5300, 3900); return campClickWorld(cam, s.x, s.y); })()`);
  check('and back: a click at that place in the safe area is that world point (campClickWorld reads the scroll the same way)', Math.abs(w0.x - 5300) < 1e-6 && Math.abs(w0.y - 3900) < 1e-6, JSON.stringify(w0));
  check('the cruiser the camera follows is in the middle of the safe area by the old maths, and so in the middle of the window', (p => Math.abs(p.x - 640) < 1e-6 && Math.abs(p.y - 360) < 1e-6)(J(`camzoomScreen({ _cz: 1, cameras: { main: { scrollX: 5000 - 840, scrollY: 4000 - 406, zoom: 0.335 } } }, 5000, 4000)`)));
}
g.run(`FILL.now = { on: false, w: 1280, h: 720, ox: 0, oy: 0 };`);

console.log('D. fillSync and fillRelease');
g.run(`
  window.__sized = []; window.__cam = n => ({ name: n, v: null, setViewport(x, y, w, h) { this.v = [x, y, w, h]; return this; } });
  window.__scene = () => ({ mp: null, fillSig: null, game: { scale: { width: 1280, height: 720, setGameSize(w, h) { __sized.push(w + 'x' + h); this.width = w; this.height = h; } } }, _cz: { main: __cam('main'), bg: __cam('cz-bg'), ui: __cam('cz-ui') },
    bgLayers: [0, 1, 2].map(() => ({ width: 1280, height: 720, setSize(w, h) { this.width = w; this.height = h; } })) });
  window.S1 = __scene(); window.innerWidth = 1578; window.innerHeight = 1000; CAMP.flags.fill = false;
`);
check('the switch off: fillSync asks nothing of the game', J('fillSync(S1)') === false && J('__sized.length') === 0 && J('FILL.now.on') === false);
g.run(`CAMP.flags.fill = true;`);
check('the switch on: the game takes the window\'s shape (1282 by 814 for 1578 by 1000)', J('fillSync(S1)') === true && J('__sized').join() === '1282x814' && J('FILL.now').w === 1282 && J('FILL.now').h === 814 && J('FILL.now').oy === 47);
check('the world camera and the star camera are the whole size; the canvas HUD\'s camera is the 1280 by 720 safe area, centred', J('S1._cz.main.v').join() === '0,0,1282,814' && J('S1._cz.bg.v').join() === '0,0,1282,814' && J('S1._cz.ui.v').join() === '1,47,1280,720');
check('the star layers cover the whole size', J('S1.bgLayers.map(t => t.width + "x" + t.height)').join() === '1282x814,1282x814,1282x814');
check('the next frames ask nothing more (the window and the switch have not changed)', (g.run('fillSync(S1); fillSync(S1);'), J('__sized.length')) === 1);
g.run(`window.innerWidth = 2100; window.innerHeight = 900;`);
check('the window changes: the game follows at the next frame (1708 by 732, the safe area 214 px in)', J('fillSync(S1)') === true && J('__sized').join() === '1282x814,1708x732' && J('S1._cz.ui.v').join() === '214,6,1280,720' && J('S1._cz.main.v').join() === '0,0,1708,732');
g.run(`S1.mp = { open: true };`);
check('the Tab map opens: the game is 1280 by 720 again while it is (the map is laid out for that)', J('fillSync(S1)') === false && J('__sized').slice(-1)[0] === '1280x720' && J('S1._cz.ui.v').join() === '0,0,1280,720' && J('FILL.now.on') === false && J('fillOx()') === 0);
g.run(`S1.mp = null;`);
check('and closes: the window is taken again', J('fillSync(S1)') === true && J('__sized').slice(-1)[0] === '1708x732');
check('the scene pauses or ends (fillRelease): 1280 by 720, the cameras as they were, the offsets 0; the next frame of the scene takes the window again', J('fillRelease(S1)') === true && J('__sized').slice(-1)[0] === '1280x720' && J('S1._cz.main.v').join() === '0,0,1280,720' && J('S1._cz.ui.v').join() === '0,0,1280,720' && J('[fillW(), fillH(), fillOx(), fillOy()]').join() === '1280,720,0,0' && J('fillSync(S1)') === true && J('__sized').slice(-1)[0] === '1708x732');
g.run(`CAMP.flags.fill = false;`);
check('the switch goes off in Settings: the next frame gives the window back', J('fillSync(S1)') === false && J('__sized').slice(-1)[0] === '1280x720' && J('S1.bgLayers[0].width') === 1280);
check('a release with nothing taken asks nothing', (n0 => J('fillRelease(S1)') === false && J('__sized.length') === n0)(J('__sized.length')));
g.run(`window.innerWidth = 1280; window.innerHeight = 720; CAMP.flags.fill = true; window.S2 = __scene(); __sized.length = 0;`);
check('the tests\' 1280 by 720 window with the switch on: the game is asked for nothing (it is 1280 by 720 already) and the cameras are today\'s', J('fillSync(S2)') === true && J('__sized.length') === 0 && J('S2._cz.ui.v').join() === '0,0,1280,720' && J('S2._cz.main.v').join() === '0,0,1280,720');
g.run(`CAMP.flags.fill = false; FILL.now = { on: false, w: 1280, h: 720, ox: 0, oy: 0 };`);

console.log('F. the files');
{
  const scene = code('src/campaignscene.js'), fw = code('src/fillwindow.js');
  check('the Campaign scene calls fillSync at the top of every frame and gives the window back when it pauses or ends; no other scene does', /update\(time, dt\) \{\n    if \(typeof fillSync === 'function'\) fillSync\(this\);/.test(scene) && /this\.events\.on\('pause', back\); this\.events\.once\('shutdown', \(\) => \{ this\.events\.off\('pause', back\); back\(\); \}\)/.test(scene) && readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js') && /\bfillSync\(/.test(code('src/' + f))).sort().join() === 'campaignscene.js,fillwindow.js');
  check('main.js is untouched: FIT and CENTER_BOTH, 1280 by 720 at the start', /mode: Phaser\.Scale\.FIT, autoCenter: Phaser\.Scale\.CENTER_BOTH/.test(src('src/main.js')) && /width: W, height: H/.test(src('src/main.js')) && /const W = 1280, H = 720;/.test(src('src/common.js')));
  const raw = readdirSync(join(ROOT, 'src')).filter(f => /^(camp|shiplook)/.test(f) && f.endsWith('.js') && /\b(cam|main)\.scroll[XY]\b(?!\s*-=)/.test(code('src/' + f).replace(/camzoomS[XY]\(cam\)/g, '')));
  check('in the flight\'s files the camera\'s scroll is read through camzoomSX and camzoomSY and written through camzoomPutX and camzoomPutY; the two that still name it are the page HUD (it lies over the whole canvas and uses the camera\'s own scroll with the whole size) and the writes of the glides', raw.sort().join() === 'campfocus.js,camppagehud.js,campselzoom.js' && /cam\.scrollX = camzoomPutX\(/.test(code('src/campfocus.js')) && /cam\.scrollX = camzoomPutX\(/.test(code('src/campselzoom.js')) && /main\.setScroll\(camzoomPutX\(q\.x\), camzoomPutY\(q\.y\)\)/.test(code('src/camzoom.js')), raw.join());
  check('the hand-made hit tests read the pointer in the safe area: the drag\'s handlers, the Tab map\'s click and the lists\' click', !/\bp\.(x|y)\b/.test(code('src/campdrag.js').split('function campDragInstall')[1] || 'p.x') && /campPanelsClick\(s, campPX\(p\), campPY\(p\)\)/.test(code('src/campanelsdraw.js')));
  check('the page HUD: its font size is a share of 1280 game px times the scale, not of the canvas\'s width; its pills are placed in the whole view; the canvas rows under its panels are put in the safe area', /gk = r\.width \/ campPageW\(\), fs = gk \* W \* K\.em/.test(code('src/camppagehud.js')) && /campSightArrows\(C, \{ x: view\.x, y: view\.y \}, campPageW\(\), campPageH\(\)/.test(code('src/camppagehud.js')) && /CAMP_CORNER_SHIFT\.tl = Math\.round\(shipB - soy - th - A\.tl\.y\)/.test(code('src/camppagehud.js')));
  check('the screens host: its em is a share of 1280 game px times the scale too', J(`scrHostBox({ left: 0, top: 0, width: 1280, height: 720 }, 1280)`).em === 19.2 && (g.run(`FILL.now = { on: true, w: 1680, h: 720, ox: 200, oy: 0 };`), J(`scrHostBox({ left: 0, top: 0, width: 2100, height: 900 }, 1280)`).em) === 24 && J(`scrHostBox({ left: 0, top: 0, width: 2100, height: 900 }, 1280)`).k === 1.25);
  g.run(`FILL.now = { on: false, w: 1280, h: 720, ox: 0, oy: 0 };`);
  check('the route-fit zoom is worked out for 1280 by 720 always (it reads W and H, never the live size): balance holds', /Math\.min\(W \/ \(2 \* Math\.max\(1, b\.x1 - b\.x0\) \* pad\), H \/ \(2 \* Math\.max\(1, b\.y1 - b\.y0\) \* pad\)\)/.test(code('src/campzoom.js')) && !/fill[WH]\(/.test(code('src/campzoom.js')) && !/fill[WH]\(/.test(code('src/campaign.js')) && !/fill[WH]\(/.test(code('src/campsight.js')));
  check('the new file asks the web for nothing and is loaded by the page', !/fetch\(|XMLHttpRequest|new Image|https?:/.test(fw) && /<script src="src\/fillwindow\.js"><\/script>/.test(src('index.html')));
  check('the canvas R chip is hidden with the rest of the stock block while the page HUD has it (it showed beside the panel once the safe area moved)', /\['crOre', 'crCash', 'crMis', 'crMisWhy', 'crMisKey', 'crChipG'\]/.test(code('src/campcruiserhud.js')));
}
{
  const md = src('content/text/fillwindow.md'), keys = [...md.matchAll(/^\| (fill\.[\w.]+) \| (.*) \|$/gm)].map(m => [m[1], m[2]]);
  check('four words of fill.set, in content/text/fillwindow.md and the table the same; the voice pack\'s rule keeps them unspoken', keys.length === 4 && keys.every(([k, t]) => J(`UI_TEXT[${JSON.stringify(k)}]`) === t) && /\/\^fill\\\.\//.test(src('src/voicepack.js')));
  g.run(`
    const __btn = () => ({ text: '', on: null, edge: null, set(t) { this.text = t; return this; }, mark(v) { this.on = v; return this; }, draw() {} });
    window.__said = []; window.__row = { slots: { fillOn: __btn() }, say(m) { __said.push(m); } }; CAMP.flags.fill = false; localStorage.removeItem(FILL.store);
    Settings.prototype.fillToggle.call(__row);
  `);
  check('the Settings button: the first press turns it ON (the flag, the memory, the button, the line)', J('CAMP.flags.fill') === true && J('localStorage.getItem(FILL.store)') === '1' && J('__row.slots.fillOn.text') === 'Fill the window: ON' && J('__row.slots.fillOn.on') === true && /^Fill the window ON/.test(J('__said[0]')));
  g.run(`Settings.prototype.fillToggle.call(__row);`);
  check('the second turns it OFF again', J('CAMP.flags.fill') === false && J('localStorage.getItem(FILL.store)') === '0' && J('__row.slots.fillOn.text') === 'Fill the window: OFF' && /^Fill the window OFF/.test(J('__said[1]')));
  check('the button is in Settings > CONTENT beside the New screens row', /this\.slots\.fillOn = this\.button\(bx \+ this\.bw - 240, by \+ 42, 220, uiText\(fill \? 'fill\.set\.on' : 'fill\.set\.off'\), \(\) => this\.fillToggle\(\)/.test(code('src/settings.js')));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('FILL WINDOW FAIL (' + failed + ')'); process.exit(1); } else console.log('FILL WINDOW PASS');
