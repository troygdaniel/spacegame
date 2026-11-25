// smoke: the Campaign's map labels keep clear of each other and of the HUD: the route label, the edge arrow's label (out of the gauges, the radar and the target's line under it), a cut name (plain Node, no Chrome)
// Wrap-up hunt of level 3 (docs/wrapup/level3.md, minors): on the whole-system map the route label ("251 km, about 13 s") sat on the INNER BELT label; the edge arrow's label ("Scan point 1  251 km") ran into
// the radar's rim; the list cut the star's name ("Epsilon Eridani star") without saying so.
//   campMapFreeSpot(cands, w, h, boxes)   the first candidate centre where a w by h label overlaps no box;  campMapRouteSpots(a, b)   where to try the route label along its line
//   campNavLabelAt(x, y, w, h, keep, W, H) the arrow's label pushed out of the keep rectangles and kept on the screen
//   the keep rectangles                    the table's CAMP.nav.arrow.keep only (the target's line that was kept out of too is gone; the target display's box is inside the radar's old rectangle): the two lists are hidden until Q or P opens one, and an open list is drawn over the label, so no list is kept out of
// Run: node tests/camplabels.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

console.log('the route label');
{
  const spots = J('campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 })');
  check('the spots begin in the middle of the line, above then below it, and move along it either side', spots[0].x === 50 && spots[0].y === -11 && spots[1].x === 50 && spots[1].y === 11 && spots.length === 14 && spots.every(s => s.x >= 0 && s.x <= 100));
  const none = J('campMapFreeSpot(campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 }), 40, 14, [])');
  check('with nothing in the way the middle is taken: where the label always was (above the line)', none && none.x === 50 && none.y === -11);
  const boxes = [{ x: 30, y: -20, w: 40, h: 16 }];
  const moved = J(`campMapFreeSpot(campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 }), 40, 14, ${JSON.stringify(boxes)})`);
  check('a name on the middle of the line (the INNER BELT label) moves it: it is below the line, or along it, and on no box', moved && !(Math.abs(moved.x - 50) < 40 && moved.y - 7 < -4 && moved.y + 7 > -20) && moved.y !== -11, JSON.stringify(moved));
  check('with every spot taken there is none (the caller keeps the old place)', J(`campMapFreeSpot(campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 }), 40, 14, [{ x: -50, y: -50, w: 300, h: 100 }])`) === null);
  check('the map paints the route label by it, from the names it has drawn (and the word GOAL, and a line too short for it: the next section)', /campMapRouteSpots\(cp, q\)/.test(src('src/campmapdraw.js')) && /campMapFreeSpot\(spots, rw, rh, names\.concat\(btns, goalBox\)\)/.test(src('src/campmapdraw.js')) && /mp\.nameObjs/.test(src('src/campmapdraw.js')));
}

// Card space-game-map-title-and-labels (9-GEN's browser batch on 02460033, items 4 and 5): on the Tab map the radio line's box covered the map's title, and with the cruiser at the goal's own place (16 km on a map 2,900 km across:
// a few pixels) the route label ran through the two marks, over the word GOAL and the place's name. The box now sits inside the top of the frame while the map is open; the label goes beside the pair.
console.log('the route label beside two marks that are close');
{
  const F = J('CAMPMAP.frame'), R = J('CAMPMAP.routeR'), w = 150, h = 16;
  const hits = (c, b) => c.x - w / 2 < b.x + b.w && c.x + w / 2 > b.x && c.y - h / 2 < b.y + b.h && c.y + h / 2 > b.y;
  const pairBox = (a, b) => ({ x: Math.min(a.x, b.x) - R, y: Math.min(a.y, b.y) - R, w: Math.abs(a.x - b.x) + 2 * R, h: Math.abs(a.y - b.y) + 2 * R });
  const a = { x: 345, y: 140 }, b = { x: 352, y: 143 }, A = J(`campMapRouteBeside(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${w}, ${h}, CAMPMAP.frame)`);
  check('a pair near the left of the frame: the first place is on its left (away from the middle of the screen, where the radio box is), at the pair\'s middle height', A[0].x < a.x && Math.abs(A[0].y - 141.5) < 0.01, JSON.stringify(A[0]));
  check('every place is clear of the pair of marks (R px round each), and inside the frame', A.length >= 6 && A.every(c => !hits(c, pairBox(a, b)) && c.x - w / 2 >= F.x && c.x + w / 2 <= F.x + F.w && c.y - h / 2 >= F.y && c.y + h / 2 <= F.y + F.h), JSON.stringify(A));
  const a2 = { x: 700, y: 300 }, b2 = { x: 706, y: 296 }, B = J(`campMapRouteBeside(${JSON.stringify(a2)}, ${JSON.stringify(b2)}, ${w}, ${h}, CAMPMAP.frame)`);
  check('a pair on the right half: its right first', B[0].x > a2.x && B.every(c => !hits(c, pairBox(a2, b2))), JSON.stringify(B[0]));
  const word = { x: a.x - 15, y: a.y - 22 - 7, w: 30, h: 14 }, name = { x: a.x - 16, y: b.y + 18, w: 32, h: 14 }; // the word GOAL over the goal and the place's name under it
  const taken = J(`campMapFreeSpot(campMapRouteBeside(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${w}, ${h}, CAMPMAP.frame), ${w}, ${h}, ${JSON.stringify([word, name])})`);
  check('the word GOAL and the name are in neither: the label is on a side, clear of both', taken && !hits(taken, word) && !hits(taken, name) && Math.abs(taken.y - 141.5) < 0.01, JSON.stringify(taken));
  const wall = J(`campMapFreeSpot(campMapRouteBeside(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${w}, ${h}, CAMPMAP.frame), ${w}, ${h}, [{ x: ${F.x}, y: 115, w: 220, h: 55 }])`);
  check('a name on the left side: the label goes to the right of the pair', wall && wall.x > a.x, JSON.stringify(wall));
  const edge = { x: F.x + 3, y: F.y + 5 }, E = J(`campMapRouteBeside(${JSON.stringify(edge)}, ${JSON.stringify(edge)}, ${w}, ${h}, CAMPMAP.frame)`);
  check('a pair in the very corner of the frame: nothing is offered outside it', E.every(c => c.x - w / 2 >= F.x && c.y - h / 2 >= F.y) && E.length >= 1, JSON.stringify(E));
}

console.log('the map painted (the real campMapPaint on a stand-in scene)');
{
  g.run(`
    window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'visible' ? true : __mk(path + '.' + String(k))), apply: () => __mk(path + '()') });
    window.__said = []; toast = (s, m) => { __said.push(m); };
    window.__scx = C => ({ camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => __mk('g'), text: (x, y, t) => { const o = { x, y, t, visible: true, rowId: '', width: 190, height: 24, alpha: 1, setText(v) { o.t = v; return o; }, setBackgroundColor() { return o; }, setColor() { return o; }, setAlpha(a) { o.alpha = a; return o; }, setVisible(v) { o.visible = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() { o.gone = true; } }; return o; } }, make: __mk('make'), input: { on() {}, off() {} } });
    window.__near = (C, dx, dy) => { const G = campNavGoal(C); C.carrier.x = G.x + dx; C.carrier.y = G.y + dy; return G; };
    window.__lab = S => { const mp = S.mp, F = CAMPMAP.frame, G = campNavGoal(S.camp), q = campMapPoint(mp.fit, F, G.x, G.y), cp = campMapPoint(mp.fit, F, S.camp.carrier.x, S.camp.carrier.y), t = mp.routeText, gt = mp.goalText;
      return { cp, q, r: { x: t.x, y: t.y, w: t.width, h: t.height, v: t.visible }, gw: { x: gt.x, y: gt.y, w: gt.width, h: gt.height }, d: Math.hypot(q.x - cp.x, q.y - cp.y) }; };
  `);
  const clear = (L, R) => { const marks = [L.cp, L.q].map(p => ({ x: p.x - 16, y: p.y - 16, w: 32, h: 32 })), word = { x: L.gw.x - L.gw.w / 2, y: L.gw.y - L.gw.h / 2, w: L.gw.w, h: L.gw.h }; const t = L.r; const hit = b => t.x - t.w / 2 < b.x + b.w && t.x + t.w / 2 > b.x && t.y - t.h / 2 < b.y + b.h && t.y + t.h / 2 > b.y; return { onMark: marks.some(hit), onWord: hit(word) }; };
  g.run(`window.C = campNew(1, [], { seed: 3, god: true }); __near(C, 6, 4); window.S = __scx(C); campMapOpen(S); S.mp.dirty = true; campMapPaint(S, 0); campMapPaint(S, 400); campMapPaint(S, 800);`);
  const L = J('__lab(S)'), c = clear(L);
  check('the cruiser a few pixels from the goal: the route label is drawn, and it is on neither mark nor on the word GOAL', L.r.v === true && L.d < 20 && !c.onMark && !c.onWord, JSON.stringify(L));
  const Fr = J('CAMPMAP.frame');
  check('and it is inside the frame', L.r.x - L.r.w / 2 >= Fr.x && L.r.x + L.r.w / 2 <= Fr.x + Fr.w && L.r.y - L.r.h / 2 >= Fr.y && L.r.y + L.r.h / 2 <= Fr.y + Fr.h, JSON.stringify(L.r));
  g.run(`__near(C, 300 / S.mp.fit.s, 100 / S.mp.fit.s); S.mp.dirty = true; campMapPaint(S, 1200); campMapPaint(S, 1600); window.__L2 = __lab(S);`);
  const L2 = J('__L2'), cands = J(`campMapRouteSpots(__L2.cp, __L2.q)`);
  check('a line long enough to hold the label (the label is 190 wide in this stand-in) is as it was: on one of the places along the line', L2.d > 190 + 2 * J('CAMPMAP.routeR') && cands.some(p => Math.abs(p.x - L2.r.x) < 0.01 && Math.abs(p.y - L2.r.y) < 0.01), JSON.stringify([L2.d, L2.r]));
}

console.log('the radio line\'s box and the map\'s title');
{
  const sc = src('src/campmapdraw.js'), tm = /s\.add\.text\(F\.x, (\d+), uiText\('camp\.map\.title'.*?uiFont\((\d+)/.exec(sc.replace(/\n/g, ' '));
  const ty = tm ? +tm[1] : 0, tf = tm ? +tm[2] : 0, F = J('CAMPMAP.frame'), IN = J('CAMPMAP.toastIn');
  const open = J(`Campaign.prototype.toastTop.call({ mp: { objs: [] }, hudStack: 40 })`), shut = J(`Campaign.prototype.toastTop.call({ mp: null, hudStack: 40 })`), none = J(`Campaign.prototype.toastTop.call({ hudStack: 40 })`);
  check('the title is read from the map\'s source (y and type size)', ty > 0 && tf > 0, JSON.stringify(tm));
  check('with the Tab map open a toast starts inside the top of the frame (CAMPMAP.toastIn under its edge), under the title: the title\'s line (its y and its type size, 1.3 of it high) ends above it', open === F.y + IN && open > ty + tf * 1.3, JSON.stringify([open, F.y, IN, ty, tf]));
  check('with the map shut the column\'s own place is as before (hudStack + the gap)', shut === Math.ceil(40 + J('CAMP.hud.toastGap')) && none === shut, JSON.stringify([shut, none]));
  const box = J(`toastBox({ size: 20, lines: ['Transport is under way. Stay with her.', 'Torpedo hit the cruiser.'] }, ${open})`);
  check('the box of the longest case (two lines of 20 px) is under the title and inside the frame from its top: it ends above the frame\'s bottom', box.top > ty + tf * 1.3 && box.bottom < F.y + F.h && box.top >= F.y, JSON.stringify(box));
  check('the scene keeps a toast that is up at that place every frame (toastKeep, with its toastTop)', /toastKeep\(this, this\.toastTop\(\)\)/.test(src('src/campaignscene.js')));
}

console.log('the arrow\'s label');
{
  const K = J('CAMP.nav.arrow.keep'), W = 1280, H = 720, L = (x, y, w, h) => J(`campNavLabelAt(${x}, ${y}, ${w}, ${h}, ${JSON.stringify(K)}, ${W}, ${H})`);
  const inside = (p, w, h, r) => p.x + w / 2 > r[0] && p.x - w / 2 < r[2] && p.y + h / 2 > r[1] && p.y - h / 2 < r[3];
  const a = L(1180, 120, 170, 18);
  check('a label wanted inside the radar\'s rectangle (upper right) is out of it, and on the screen', !K.some(r => inside(a, 170, 18, r)) && a.x - 85 >= 0 && a.x + 85 <= W && a.y - 9 >= 0 && a.y + 9 <= H, JSON.stringify(a));
  const b = L(640, 400, 170, 18);
  check('a label in the clear stays where it was put', b.x === 640 && b.y === 400);
  for (const [x, y] of [[100, 60], [640, 40], [60, 700], [1250, 10], [20, 360], [1270, 700]]) { const p = L(x, y, 170, 18); check(`wanted at ${x},${y}: it ends on the screen and out of every keep rectangle`, p.x - 85 >= 0 && p.x + 85 <= W && p.y - 9 >= 0 && p.y + 9 <= H && !K.some(r => inside(p, 170, 18, r)), JSON.stringify(p)); }
  check('the scene puts the arrow\'s label by it (through the edge spread, src/campedgespread.js: the label\'s own place is 64 px back and 28 off the arrow, out of the keep rectangles of CAMP.nav.arrow)', /campEdgeSpread\(\[\{ x: ar\.x, y: ar\.y, angle: ar\.angle, w: aw, h: ah, want \}\], \{ keep: this\.arrowKeep\(\)/.test(src('src/campaignscene.js')) && /x: px - Math\.cos\(an\) \* 64, y: py - Math\.sin\(an\) \* 28/.test(src('src/campaignscene.js')) && /campNavLabelAt\(wx, wy, w, h, K, W_, H_\)/.test(src('src/campedgespread.js')) && /CAMP\.nav\.arrow\.keep/.test(src('src/campaignscene.js')));
}

console.log('the keep-out rectangles hold the target display and the left HUD rows (8-GEN: the label sat under the SHIP tab and over the AUTOPILOT line; the tabs are gone, the lists open on a key)');
{
  const BX = J('campTdispBox()'), K = J('CAMP.nav.arrow.keep');
  check('the target display (in the corner the radar had: its box, campTdispBox) is inside a keep rectangle, so no label is put on it', K.some(r => BX.x >= r[0] && BX.x + BX.w <= r[2] && BX.y >= r[1] && BX.y + BX.h <= r[3]) && J('typeof campPanelsKeep') === 'undefined', JSON.stringify([BX, K]));
  check('no list is kept out of: the lists are hidden until Q or P opens one (an open list is drawn over the label), so the places of the lists are free for the label while none is open', (() => { const heads = J('CAMP_PANELS.panels.map(d => campPanelsGeometry(d).list)'); return heads.every(t => !K.some(r => t.x >= r[0] && t.x + t.w <= r[2] && t.y >= r[1] && t.y + t.h <= r[3])) && J('Campaign.prototype.arrowKeep.call({}).length') === K.length; })());
  check('the left HUD\'s busiest column (card space-game-hud-topleft-trim: Earth with its bar, the wave, the objective, the repair line and the outpost hint, 14 px type from y 14) is inside the first rectangle', (() => { const T = J('CAMP.hud.text'); return K.some(r => r[0] === 0 && r[1] === 0 && r[3] >= T.y + 12 + 4 * T.pitch + 18); })());
  const W = 1280, H = 720, L = (x, y) => J(`campNavLabelAt(${x}, ${y}, 190, 18, ${JSON.stringify(K)}, ${W}, ${H})`), hit = (p, r) => p.x + 95 > r[0] && p.x - 95 < r[2] && p.y + 9 > r[1] && p.y - 9 < r[3];
  const a = L(1144, 222), b = L(85, 60), c = L(BX.x + BX.w / 2, BX.y + BX.h / 2);
  check('the label wanted at the top right (2.3 and 3.3 starts), on the target display, or on the objective line (1.2) ends out of every rectangle, and on the screen', [a, b, c].every(p => !K.some(r => hit(p, r)) && p.x - 95 >= 0 && p.x + 95 <= W && p.y - 9 >= 0 && p.y + 9 <= H), JSON.stringify([a, b, c]));
}

console.log('the list');
check('a name cut to fit the list says so with an ellipsis: "Epsilon Eridani\u2026" for the star, not the name without its word', /\.slice\(0, 15\) \+ '\\u2026'/.test(src('src/campmapdraw.js')));
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMP LABELS FAIL (${failed} of ${n})` : `\nCAMP LABELS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
