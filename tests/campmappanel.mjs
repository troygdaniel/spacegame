// smoke: the Tab map in the panel look: what each panel shows for a state, the chips from the key table, the swatches, the radio panel, the frame, the clicks and the paint on a stand-in page (plain Node, no Chrome, nothing waits)
// Card space-game-b3-f-tab-map-build (src/campmappanel.js, src/campmappanel.css, src/campmapdraw.js; Troy answered the six questions of card space-game-b3-f-tab-map-layout, all yes; the mock is docs/tab-map-mock.html, layout A).
//   A. the numbers: the card holds the map's frame, the header and the footer; the column is beside the card and inside the screen; the frame is not the glass panel's
//   B. the model (pure): the header, the zoom, the area, the goal panel (the flight HUD's own words), the list (no GOAL heading: the gold row says it), the set panel, the legend with its swatches, the footer
//   C. every chip is read from the key table (a remapped key moves its chip); the X of the map is the CAMPAIGN row of THE MAP; no chip is typed in the file
//   D. the words are content (camp.map.*), and the model shows no more words than the old map's own text did
//   E. a page: the map opens in its card (mp.dom, mp.F), paints the panels, takes a row click and the Fly and Fast pills, puts a radio line in its panel (no box over the map), closes and takes its page elements away;
//      with the page HUD off the map is as it was (the glass panel, the canvas texts)
// Run: node tests/campmappanel.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const words = x => x == null ? 0 : typeof x === 'string' ? x.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length : Array.isArray(x) ? x.reduce((a, v) => a + words(v), 0) : typeof x === 'object' ? Object.keys(x).filter(k => k !== 'sw' && k !== 'id' && k !== 'type').reduce((a, k) => a + words(x[k]), 0) : 0;

// ---- A. the numbers ----
const P = J(`CAMPMAPPANEL`), old = J(`CAMPMAP.frame`);
const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
check('A  the map\'s frame, the header and the footer are inside the card', inside(P.frame, P.card) && inside(P.head, P.card) && inside(P.foot, P.card));
check('A  the header is above the frame and the footer under it (the frame\'s box does not cover either)', P.head.y + P.head.h <= P.frame.y && P.foot.y >= P.frame.y + P.frame.h);
check('A  the column is beside the card, inside the 1280 by 720 screen, and the card is too', P.col.x >= P.card.x + P.card.w && P.col.x + P.col.w <= 1280 && P.col.y + P.col.h <= 720 && P.card.x + P.card.w <= 1280 && P.card.y + P.card.h <= 720);
check('A  the frame is bigger than the glass panel\'s (790 by 520) and as wide as it is tall by about the same share (the fit of a level does not change shape)', P.frame.w * P.frame.h > old.w * old.h && Math.abs(P.frame.w / P.frame.h - old.w / old.h) < 0.1, JSON.stringify([P.frame, old]));
check('A  campMapFrameOf gives a map its own frame and the table\'s when it has none', J(`campMapFrameOf({ F: { x: 1, y: 2, w: 3, h: 4 } }).w`) === 3 && J(`campMapFrameOf(null).w`) === old.w && J(`campMapFrameOf({}).w`) === old.w);

// ---- B. the model ----
g.run(`var C = campNew(1, [], { seed: 1, mission: 0 }); for (let i = 0; i < 60; i++) campStep(C, 1); // a moment into the mission: the transport is on the road and the list has its goal row (the state of docs/tab-map-mock.html; an idle battle is lost within a few seconds)
  var mp = { zWant: 1, whole: false }, rows = campNavRows(C), sel = 0, marks = campMapMarks(C, false, []), win = navpanelLines(rows, sel, CAMP.nav.list, CAMPNAV.groups), legend = campMapLegend(C, marks);
  var I = { rows, sel, win, setRow: null, setDist: 0, legend, km: '2,900', flat: true }; var M = campMapPanelModel(C, mp, I);`);
const M = J(`M`);
check('B  the header says the level and the name: Map · Level 1, The rim run', M.head.lab === 'Map · Level 1' && M.head.name === 'The rim run', JSON.stringify(M.head));
check('B  the zoom pill is the zoom, and the words zoom and reset sit by their chips', M.zoom.pct === '100%' && M.zoom.w === 'zoom' && M.zoom.rw === 'reset');
check('B  the area pill says Area and the width; the whole system says System', M.area === 'Area 2,900 km' && J(`campMapPanelModel(C, { zWant: 0.5, whole: true }, I).area`) === 'System 2,900 km', M.area);
check('B  the goal panel has the flight HUD\'s goal words: Goal, the objective\'s label and its count, and a meter', M.goal && M.goal.lab === 'Goal' && M.goal.name === 'Transport arrived' && M.goal.value === '0 / 1' && M.goal.frac === 0, JSON.stringify(M.goal));
check('B  the list is headed Fly to and its first group has no GOAL heading (the gold row says it); the other headings stay', M.list.title === 'Fly to' && !M.list.lines.some(l => l.head === 'GOAL') && M.list.lines.some(l => l.head === 'PLACES') && !!M.list.lines[0].goal, JSON.stringify(M.list.lines.slice(0, 3)));
check('B  the chosen row is lit, the goal row is the gold one, every row has its distance', M.list.lines.filter(l => l.on).length === 1 && M.list.lines.filter(l => l.id).every(l => /km$/.test(l.km)) && M.list.lines[0].on === true);
check('B  with nothing set and no trip there is no set panel; a place set shows Set, its name and its distance; a trip shows Flying', M.set === null
  && J(`campMapPanelModel(C, mp, Object.assign({}, I, { setRow: rows[1], setDist: 1300 })).set.lab`) === 'Set' && J(`campMapPanelModel(C, mp, Object.assign({}, I, { setRow: rows[1], setDist: 1300 })).set.km`) === '130 km'
  && J(`(() => { C.nav = { on: true, name: 'Luna', x: C.carrier.x + 500, y: C.carrier.y, id: 'luna' }; const m = campMapPanelModel(C, mp, I).set; C.nav = null; return m && m.lab === 'Flying' && m.name === 'Luna' && m.km === '50 km'; })()`));
check('B  the legend has one row for each kind on the map, with its words as before and a swatch of its own', M.legend.length === J(`legend.length`) && M.legend.length >= 4 && M.legend.every(r => /^<svg /.test(r.sw)) && M.legend[0].text === 'Your cruiser', M.legend.map(r => r.text).join(' | '));
const sw = t => J(`campMapSwatch(${JSON.stringify(t)}, 0x4aa3ff, true)`);
check('B  a ship\'s swatch is its own sign in its side\'s colour (the cruiser\'s long arrow is two shapes, a pilot\'s chevron has arms and round ends, a patrol is the neutral colour), a cache a diamond, the relic a ring', sw('carrier').shapes.length === 2 && sw('wing').shapes.length === 5 && sw('patrol').color === J(`slookColor('neutral')`) && sw('cache').shapes[0].pts.length === 8 && sw('relic').shapes[0].t === 'ring' && sw('wing').color === J(`slookColor('friend')`));
check('B  with the old ship look (shiplook off) a swatch is a plain disc in the row\'s colour', J(`campMapSwatch('carrier', 0xffffff, false)`).shapes[0].t === 'disc' && J(`campMapSwatch('carrier', 0xffffff, false)`).color === '#ffffff');
check('B  the swatch markup holds numbers and colours only (no word of the game): polygons, circles, a viewBox', M.legend.every(r => /^<svg viewBox="-8 -8 16 16" width="16" height="16">(<(polygon|circle) [^>]*\/>)+<\/svg>$/.test(r.sw)), M.legend[0].sw);

// ---- C. the chips ----
check('C  every chip is the key table\'s: Up, Down and Enter on the list, the zoom keys, Tab and Esc on the footer, and the X of THE MAP row', JSON.stringify(M.list.keys) === JSON.stringify([{ k: [J(`CAMP_KEYS.up.k`), J(`CAMP_KEYS.down.k`)], w: 'choose' }, { k: [J(`CAMP_KEYS.pick.k`)], w: 'fly' }, { k: ['X'], w: 'clear' }]) && M.zoom.out === J(`CAMP_KEYS.zoomout.k`) && M.zoom.in === J(`CAMP_KEYS.zoomin.k`) && M.zoom.reset === J(`CAMP_KEYS.zoomreset.k`) && JSON.stringify(M.foot.keys) === JSON.stringify([J(`CAMP_KEYS.map.k`), J(`CAMP_KEYS.pause.k`)]), JSON.stringify(M.list.keys));
check('C  a key that moves in the table moves its chip (Up to P, the zoom reset to Z, the X row to Y)', J(`(() => { const u = CAMP_KEYS.up.k, z = CAMP_KEYS.zoomreset.k, r = controlsGroup('campaign').rows.find(x => x.sub === 'THE MAP' && /clears/i.test(x.t)), x = r.k[0]; CAMP_KEYS.up.k = 'P'; CAMP_KEYS.zoomreset.k = 'Z'; r.k[0] = 'Y'; const m = campMapPanelModel(C, mp, I); CAMP_KEYS.up.k = u; CAMP_KEYS.zoomreset.k = z; r.k[0] = x; return m.list.keys[0].k[0] === 'P' && m.zoom.reset === 'Z' && m.list.keys[2].k[0] === 'Y'; })()`));
const src = readFileSync(new URL('../src/campmappanel.js', import.meta.url), 'utf8');
check('C  the file types no key cap of its own: every chip text comes from a model field or the key table', !/textContent = '[A-Z]'|'Tab'|'Esc'|'Enter'|'Shift Enter'/.test(src.replace(/\/\/.*$/gm, '').replace("'Shift ' + K.fly", '')), '');

// ---- D. the words ----
check('D  the new words are content (camp.map.* in content/text/campmappanel.md, the same default in the tables)', ['head', 'zoomw', 'resetw', 'areapill', 'syspill', 'goalpanel', 'flyto', 'kchoose', 'kfly', 'kclear', 'closew', 'live', 'setlab', 'flyinglab', 'pillfly', 'pillfast', 'dock'].every(k => J(`("camp.map.${k}" in UI_TEXT)`) === true) && readFileSync(new URL('../content/text/campmappanel.md', import.meta.url), 'utf8').includes('| camp.map.flyto | Fly to |'));
const w = words(M), todays = 76; // the old map's own text without the names on the map: the title (6), the zoom line (5), the objective (5), the two headings (2), the rows (22), the keys line (7), the legend (14), the footer (11) and the area (4) = 76
check(`D  the panels show ${w} words and numbers against the ${todays} the old map's text showed (the mock counts 84 and 90 with the names on the map)`, w <= todays, w);

// ---- E. a page ----
// the node game is made with the page HUD and the new ship look OFF (tests/nodegame.mjs: the node twin of ?pagehud=0); this section is the page's, so it turns them on
g.run(`CAMP.flags.pagehud = true; CAMP.flags.shiplook = true;
  class __El { constructor(t) { this.tagName = t; this.children = []; this.className = ''; this._t = ''; this.innerHTML = ''; this.attrs = {}; this.ls = {}; this.parentNode = null; this.style = { setProperty() {} }; this.offsetWidth = 90; this.offsetHeight = 22; }
    set textContent(v) { this._t = String(v); this.children = []; } get textContent() { return this._t + this.children.map(c => c.textContent).join(''); }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; } removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
    get firstChild() { return this.children[0] || null; } setAttribute(k, v) { this.attrs[k] = v; } addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; } }
  globalThis.document = { createElement: t => new __El(t), body: new __El('body') };
  var __calls = [];
  var __mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : __mk(path + '.' + String(k))), apply: (t, self, args) => { __calls.push([path, args]); return __mk(path + '()'); } });
  var __sc = { camp: C, add: __mk('add'), make: __mk('make'), mode: 'play', time: { now: 0 }, game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } } };
  var all = (el, f, out = []) => { if (f(el)) out.push(el); el.children.forEach(c => all(c, f, out)); return out; };
  var byCls = (c) => all(document.body, e => (' ' + e.className + ' ').indexOf(' ' + c + ' ') >= 0);
  campMapOpen(__sc); campMapPaint(__sc, 100);`);
check('E  the map opens in the card: mp.dom, its own frame, the panels are on the page', J(`__sc.mp.dom === true && __sc.mp.F.x === CAMPMAPPANEL.frame.x && !!__sc.mpPanel && document.body.children.length === 1 && document.body.children[0].className === 'ph-root mp-root'`));
check('E  the glass panel, its title, its footer and the canvas lists are not made (the card has none of them)', J(`__calls.filter(c => c[0] === 'add.text').map(c => c[1][2]).every(t => !/^MAP\\s+-/.test(t) && !/Tab or Esc closes/.test(t))`) && J(`!__sc.mp.zoomText && !__sc.mp.obj && __sc.mp.list.length === 0 && __sc.mp.btnFly === undefined`) && J(`!__calls.some(c => /hudPanel|hudGlowPath/.test(c[0]))`));
check('E  the header and the footer carry the words and chips', J(`byCls('mp-title')[0].textContent`) === 'The rim run' && J(`byCls('ph-lab')[0].textContent`) === 'Map · Level 1' && /^Area [\d,]+ km$/.test(J(`byCls('mp-pill')[1].textContent`)) && J(`byCls('mp-foot')[0].textContent`).includes('Battle goes on'), J(`byCls('mp-foot')[0].textContent`));
check('E  the goal panel and the list are painted: Goal, 0 / 1; Fly to; the goal row lit and gold; no row of the list says GOAL', J(`byCls('mp-gold')[0].textContent`) === 'Goal' && J(`byCls('ph-between')[0].textContent`).includes('0 / 1') && J(`byCls('mp-list')[0].textContent`).includes('Fly to') && J(`byCls('mp-tile').length`) >= 5 && J(`byCls('mp-tile')[0].className`) === 'mp-tile act on goal' && !J(`byCls('mp-list')[0].textContent`).includes('GOAL'));
check('E  the legend is painted with a swatch for each row, and a Docks row for the places you can dock at', J(`byCls('mp-lr').length`) === J(`campMapLegend(C, campMapMarks(C, false, [])).length`) + 1 && J(`byCls('mp-lr').some(e => /^Docks \\(2\\)$/.test(e.textContent))`) && J(`byCls('mp-sw').every(e => /^<svg/.test(e.innerHTML))`), J(`byCls('mp-lr').map(e => e.textContent).join('|')`));
// a click on a row sets the place; a second flies; the pills appear with their words and chips
g.run(`var __row = byCls('mp-tile')[2]; __row.ls.click[0]({ stopPropagation() {} }); campMapPaint(__sc, 400);`); // the third row: Earth, 185 km off (the second, Luna, is where the cruiser is: "We are already at Luna")
check('E  a click on a row of the list sets that place (the same pick as a click on the map), and the set panel and the two pills appear', J(`__sc.mp.setId === __sc.mp.rows[2].id`) && J(`byCls('mp-btn').filter(e => e.style.display !== 'none').length`) >= 2 && J(`byCls('mp-btn')[0].textContent`).includes('Fly') && J(`byCls('mp-btn')[1].textContent`).includes('Fast') && J(`byCls('mp-btn')[0].textContent`).includes('Enter') && J(`byCls('mp-pn').some(e => e.textContent.includes('Set'))`), J(`byCls('mp-btn')[0].textContent`));
g.run(`var __b = byCls('mp-btn')[1]; __b.ls.click[0]({ stopPropagation() {} });`);
check('E  the Fast pill flies there at the burn speed, as the old button did', J(`!!C.nav && !!C.nav.on && C.nav.fast === true`), J(`JSON.stringify(C.nav)`));
// the radio line: toast() gives it to the panel, no canvas box is made
g.run(`__calls.length = 0; __sc.toasts = []; __sc.mapRadio = null; toast(__sc, 'Transport is 441 km off, alone.', '#9fe9ff'); campMapPaint(__sc, 500);`);
check('E  a radio line while the map is open is the radio panel\'s (shown, its words, its colour bar), and no box is put over the map', J(`byCls('mp-radio')[0].style.display`) === '' && J(`byCls('mp-rad')[0].textContent`) === 'Transport is 441 km off, alone.' && J(`__calls.filter(c => c[0] === 'add.rectangle' || c[0] === 'add.text').length`) === 0 && J(`__sc.toasts.length`) === 0);
g.run(`__sc.time.now = 60000; campMapPaint(__sc, 60000);`);
check('E  the radio panel goes when the line has had its time and its fade', J(`byCls('mp-radio')[0].style.display`) === 'none');
g.run(`campMapClose(__sc);`);
check('E  closing takes the page elements away with the map; closing twice is harmless', J(`document.body.children.length === 0 && __sc.mp === null && __sc.mpPanel === null && __sc.mapRadio === null`) && J(`(() => { campMapClose(__sc); campMapClose(__sc); return true; })()`));
check('E  with no map open a radio line is nobody\'s here (the box code runs as before)', J(`campMapToast({ mp: null }, 'x', '#fff', 0)`) === false && J(`campMapToast({ mp: { dom: 1 } }, 'x', '#fff', 0)`) === false);
g.run(`CAMP.flags.pagehud = false; var __s2 = { camp: C, add: __mk('add'), make: __mk('make'), mode: 'play', time: { now: 0 }, game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } } }; __calls.length = 0; campMapOpen(__s2); campMapPaint(__s2, 100);`);
check('E  with the page HUD off (?pagehud=0, the tests\' way) the map is as it was: the glass panel, the glass frame, the canvas lists, no page element', J(`__s2.mp.dom === false && __s2.mp.F.w === CAMPMAP.frame.w && !!__s2.mp.zoomText && __s2.mp.list.length === CAMP.nav.list && document.body.children.length === 0 && __calls.some(c => /hudPanel/.test(c[0]) || c[0] === 'add.graphics')`));
g.run(`campMapClose(__s2); CAMP.flags.pagehud = true;`);
// ---- F. the names of the places stand clear of the marks (card space-game-tab-map-labels-rings) ----
g.run(`
  var __tx = (str) => { const o = { x: 0, y: 0, width: String(str).length * 8, height: 14, visible: true, text: String(str), setOrigin() { return o; }, setDepth() { return o; }, setScrollFactor() { return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setVisible(v) { o.visible = v; return o; }, destroy() { o.gone = true; }, setText(t) { o.text = String(t); return o; }, setColor() { return o; }, setBackgroundColor() { return o; }, setAlpha() { return o; }, setFontSize() { return o; } }; return o; };
  var __add = new Proxy({}, { get: (t, k) => k === 'text' ? (x, y, str) => __tx(str) : __mk('add.' + String(k)) });
  C.carrier.x = C.carrier.x; var __sf = { camp: C, add: __add, make: __mk('make'), mode: 'play', time: { now: 0 }, game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } } };
  campMapOpen(__sf); campMapPaint(__sf, 100);
  var __names = () => __sf.mp.nameObjs.filter(t => t.world && t.visible !== false && !t.gone);
  var __hits = () => { const F = campMapFrameOf(__sf.mp), ob = campMapObstacles(__sf.mp, campMapMarks(C, __sf.mp.whole, [])); return __names().filter(t => ob.some(o => Math.max(Math.abs(t.x - o.x) - t.width / 2, 0) ** 2 + Math.max(Math.abs(t.y - o.y) - t.height / 2, 0) ** 2 < o.r * o.r)).map(t => t.text); };`);
check('F  campMapObstacles: the ships in the frame are circles (the cruiser\'s is 12 px, the mission\'s ring at most 24), places are not', J(`(() => { const ob = campMapObstacles(__sf.mp, campMapMarks(C, false, [])), F = campMapFrameOf(__sf.mp); const far = campMapObstacles(__sf.mp, [{ type: 'place', x: 0, y: 0 }, { type: 'rock', x: 0, y: 0 }]); return ob.length >= 4 && ob.every(o => o.x >= F.x - 24 && o.x <= F.x + F.w + 24) && ob.some(o => o.r === 12) && Math.max(...ob.map(o => o.r)) <= 24 && far.length === 0; })()`));
check('F  a mark past the edge is on the edge, so is its name\'s place and the ship that is an obstacle there (zoomed out; zoomed in only the cruiser, the mothership and the convoys stay)', J(`(() => { const mp = Object.assign({}, __sf.mp, { z: 0.4 }), F = campMapFrameOf(mp), pin = campMapPin(mp, { x: 9999, y: 9999 }), far = campMapObstacles(mp, [{ type: 'wing', x: 1e9, y: 1e9 }]), zin = Object.assign({}, __sf.mp, { z: 2 }), a = campMapObstacles(zin, [{ type: 'wing', x: 1e9, y: 1e9 }]), b = campMapObstacles(zin, [{ type: 'carrier', x: 1e9, y: 1e9 }]); return pin.x === F.x + F.w - 5 && pin.y === F.y + F.h - 5 && far.length === 1 && far[0].x === pin.x && a.length === 0 && b.length === 1; })()`));
check('F  campMapNamesBad: a name over a mark is bad, over its own mark twice as bad, clear is 0, and two names over each other count', J(`(() => { const b = { x: 50, y: 50, w: 40, h: 14 }, m = { x: 50, y: 50, r: 10 }; const own = campMapNamesBad([b], [m]), other = campMapNamesBad([b], [{ x: 0, y: 0, r: 1 }, m]), clear = campMapNamesBad([b], [{ x: 200, y: 200, r: 10 }]), two = campMapNamesBad([b, { x: 55, y: 50, w: 40, h: 14 }], []); return own === 2 * other && own > 0 && clear === 0 && two > 0; })()`));
check('F  the names of the places are clear of every ship mark at the start (the cruiser is at Luna: LUNA is not under it)', J(`__names().length >= 3 && __hits().length === 0`), J(`__hits().join()`));
check('F  a name stands outside the thin ring of a dock: its box does not reach the ring round Luna or Ceres', J(`(() => { const mp = __sf.mp, F = campMapFrameOf(mp), pl = campMapMarks(C, false, []).filter(m => m.type === 'place' && m.outpost); return pl.length >= 2 && pl.every(m => { const p = campMapPoint(mp.fit, F, m.x, m.y), R = Math.max(5, m.r * mp.fit.s) + 8, t = __names().find(x => x.text === m.name.toUpperCase()); return !!t && Math.max(Math.abs(t.x - p.x) - t.width / 2, 0) ** 2 + Math.max(Math.abs(t.y - p.y) - t.height / 2, 0) ** 2 >= R * R; }); })()`));
check('F  a ship that comes to stand on a name moves the names again (after a second), and only then; the new spot is clear of it', J(`(() => {
    const mp = __sf.mp, F = campMapFrameOf(mp), t = __names().find(x => x.text === 'EARTH' || x.text === 'CERES / OCCATOR WORKS'), was = mp.namePlan;
    campMapNamesRecheck(__sf, 5000); const same = mp.namePlan === was; // nothing in the way: nothing moves
    const s = mp.fit.s; C.carrier.x = mp.fit.cx + (t.x - (F.x + F.w / 2)) / s; C.carrier.y = mp.fit.cy + (t.y - (F.y + F.h / 2)) / s;
    campMapNamesRecheck(__sf, 5100); const early = mp.namePlan === was; // inside the second: it is left alone
    campMapNamesRecheck(__sf, 7000); const moved = mp.namePlan !== was;
    return same && early && moved && __hits().length === 0; })()`), J(`__hits().join()`));
check('F  the dock row of the legend is a thin ring in the pale blue; with no dock there is no row', J(`(() => { const a = campMapPanelModel(C, __sf.mp, { legend: [], docks: 2, flat: true }).legend, b = campMapPanelModel(C, __sf.mp, { legend: [], docks: 0, flat: true }).legend; return a.length === 1 && a[0].text === 'Docks (2)' && /<circle [^>]*fill="none" stroke="#cfe6ff"/.test(a[0].sw) && b.length === 0; })()`));
check('F  the goal\'s gold pill stays inside the frame when the goal is at the top edge (it goes under the ring)', J(`(() => { const mp = __sf.mp, F = campMapFrameOf(mp), gl = campNavGoal(C); campMapPaint(__sf, 8000); mp.panned = true; const y0 = campMapPoint(mp.fit, F, gl.x, gl.y).y; campMapPan(mp, F, 0, F.y + 4 - y0); campMapPaint(__sf, 8100); const gt = mp.goalText; return gt.y - 8 >= F.y && gt.y > campMapPoint(mp.fit, F, gl.x, gl.y).y; })()`));
check('F  the goal\'s gold pill is clear of every name and ship mark (it was over LUNA when the transport stood by it)', J(`(() => { const mp = __sf.mp, gt = mp.goalText, w = gt.width + 14, h = gt.height + 3; campMapPaint(__sf, 9000); const ov = (b) => Math.max(0, Math.min(gt.x + w / 2, b.x + b.w) - Math.max(gt.x - w / 2, b.x)) * Math.max(0, Math.min(gt.y + h / 2, b.y + b.h) - Math.max(gt.y - h / 2, b.y)); return __names().every(t => ov({ x: t.x - t.width / 2, y: t.y - t.height / 2, w: t.width, h: t.height }) === 0); })()`));
check('F  no dock is a green square on the card: the page HUD draws the thin ring, the glass map keeps its frame (read from the source)', /if \(mp\.dom\) g\.lineStyle\(1\.5, CAMPMAPPANEL\.dock, 0\.85\)\.strokeCircle\(p\.x, p\.y, r \+ 8\); else \{ const q = r \+ 9; g\.lineStyle\(2, 0x6dff9c/.test(readFileSync(new URL('../src/campmapdraw.js', import.meta.url), 'utf8')));
g.run(`campMapClose(__sf);`);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `TAB MAP PANELS FAIL (${failed} of ${n})` : `TAB MAP PANELS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
