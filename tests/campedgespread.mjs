// smoke: the labels at the screen's edge keep clear of each other and of the corner panels: ships off the screen in one direction get arrows and labels in a line along the edge (plain Node, no Chrome)
// Card space-game-edge-labels-overlap (found by flying 1.1: the miner's and the skiffs' labels, off the screen on the same side, stood one on the other). src/campedgespread.js is the rule; the scene halves are
// src/campsightscene.js (the hostile groups and the ships you protect that are in trouble) and the goal's arrow in src/campaignscene.js paintHud.
//   A. the border: a point's place along it and back
//   B. the spread: one thing stays; things in one direction go in a line, nearest first, none touching; on every side; out of the keep rectangles and the corner panels; off a label already put; the arrow turns to its ship
//   C. the scene: two groups in one direction (the sight arrows) and the goal's arrow beside them
//   D. the calls (the script is loaded, the scenes use it, the rows of the docs)
// Run: node tests/campedgespread.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false;');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const W = 1280, H = 720, M = J('CAMP.nav.arrow.margin'), KEEP = J('CAMP.nav.arrow.keep');
const spread = (items, o) => J(`campEdgeSpread(${JSON.stringify(items)}, ${JSON.stringify(Object.assign({ keep: KEEP, W, H, m: M }, o || {}))})`);
const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const onBorder = p => Math.abs(p.x - M) < 1 || Math.abs(p.x - (W - M)) < 1 || Math.abs(p.y - M) < 1 || Math.abs(p.y - (H - M)) < 1;
const edgeAt = (dx, dy) => J(`campNavEdge(${dx}, ${dy}, ${W}, ${H}, ${M}, ${JSON.stringify(KEEP)})`); // where the arrow of a ship that far from the middle of the screen sits
const item = (dx, dy, w = 130, h = 16) => { const e = edgeAt(dx, dy); return { x: e.x, y: e.y, angle: e.angle, tx: W / 2 + dx, ty: H / 2 + dy, w, h }; };
// the closed title row of each corner panel, from the corner table (so it follows the corners wherever they are put)
const CORNERS = (() => { const C = J('CAMP.corner'); return Object.keys(C.at).map(k => { const a = C.at[k]; return [a.x, a.dir > 0 ? a.y : a.y - C.title.h, a.x + C.w, a.dir > 0 ? a.y + C.title.h : a.y]; }); })();
const rects = p => p.boxes;
const clearOf = (p, list) => list.every(r => !overlap(p.boxes[0], r) && !overlap(p.boxes[1], r));

console.log('A. the border');
{
  const pts = [[M, M], [W / 2, M], [W - M, M], [W - M, H / 2], [W - M, H - M], [W / 2, H - M], [M, H - M], [M, H / 2]];
  check('a point of the border goes to its place along it and back to the same point (the four sides and the corners)', pts.every(([x, y]) => { const t = J(`campEdgeT(${x}, ${y}, ${W}, ${H}, ${M})`), p = J(`campEdgeAt(${t}, ${W}, ${H}, ${M})`); return Math.abs(p.x - x) < 0.01 && Math.abs(p.y - y) < 0.01; }));
  check('the places go clockwise from the top left, and wrap round (a negative one and one past the end are on the border too)', J(`campEdgeAt(0, ${W}, ${H}, ${M}).x`) === M && J(`campEdgeAt(${W - 2 * M} + 10, ${W}, ${H}, ${M}).x`) === W - M && onBorder(J(`campEdgeAt(-25, ${W}, ${H}, ${M})`)) && onBorder(J(`campEdgeAt(99999, ${W}, ${H}, ${M})`)));
}

console.log('B. the spread');
{
  const one = spread([item(-3000, 0)])[0], it0 = item(-3000, 0);
  check('one arrow stays where it was, pointing as it did, not moved', one.x === it0.x && one.y === it0.y && one.angle === it0.angle && one.moved === false);
  check('and its label is behind it, to the right of an arrow at the left edge (the old place: back by the triangle, the gap and half the label)', one.lx > one.x + 12 && Math.abs(one.ly - one.y) < 1, JSON.stringify(one));
  const two = spread([item(-3000, 0), item(-5000, 0)]);
  check('two ships dead ahead on the left (the miner and the skiffs) were one on the other: now the first keeps its place and the second slides along the edge', two[0].moved === false && two[1].moved === true && onBorder(two[0]) && onBorder(two[1]) && Math.abs(two[1].y - two[0].y) >= 20 && Math.abs(two[1].x - M) < 1, JSON.stringify(two.map(p => [p.x, p.y])));
  check('their arrows and their labels touch nothing of one another', !overlap(two[0].boxes[0], two[1].boxes[0]) && !overlap(two[0].boxes[0], two[1].boxes[1]) && !overlap(two[0].boxes[1], two[1].boxes[0]) && !overlap(two[0].boxes[1], two[1].boxes[1]));
  check('the second still points at its ship from where it ended (the angle is to the ship on the screen, not the old line)', Math.abs(two[1].angle - Math.atan2(H / 2 - two[1].y, W / 2 - 5000 - two[1].x)) < 1e-9);
  check('with the nearest asked first it is the nearest that keeps its place (the order given is the order of say)', spread([item(-5000, 0), item(-3000, 0)])[0].moved === false);
  // six in one direction on each of the four sides
  for (const [name, dx, dy] of [['left', -4000, 0], ['right', 4000, 0], ['top', 0, -4000], ['bottom', 0, 4000], ['upper left', -3000, -2000], ['lower right', 3000, 2000]]) {
    const items = [1, 2, 3, 4, 5, 6].map(i => item(dx * i, dy * i, 120 + i * 12, 16)), out = spread(items);
    let hit = 0; for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) if (overlap(out[i].boxes[0], out[j].boxes[0]) || overlap(out[i].boxes[0], out[j].boxes[1]) || overlap(out[i].boxes[1], out[j].boxes[0]) || overlap(out[i].boxes[1], out[j].boxes[1])) hit++;
    check(`six ships in one direction (${name}): no arrow or label touches another, every arrow is on the border and out of the keep rectangles, every label is on the screen`, hit === 0 && out.every(p => onBorder(p) && !KEEP.some(r => p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3]) && p.boxes[1][0] >= 0 && p.boxes[1][2] <= W && p.boxes[1][1] >= 0 && p.boxes[1][3] <= H), `${hit} touching; ` + JSON.stringify(out.map(p => [Math.round(p.x), Math.round(p.y)])));
  }
  // a sweep: every 15 degrees, three ships in a line of sight: nothing touches, nothing is in a corner panel or a keep rectangle
  let bad = [];
  for (let a = 0; a < 360; a += 15) {
    const r = a * Math.PI / 180, out = spread([3000, 5000, 7000].map(d => item(Math.cos(r) * d, Math.sin(r) * d, 150, 16)));
    for (let i = 0; i < out.length; i++) {
      if (!clearOf(out[i], CORNERS)) bad.push(a + ':corner:' + i);
      if (KEEP.some(r2 => overlap(out[i].boxes[1], r2))) bad.push(a + ':keep:' + i);
      for (let j = i + 1; j < out.length; j++) if (overlap(out[i].boxes[0], out[j].boxes[0]) || overlap(out[i].boxes[0], out[j].boxes[1]) || overlap(out[i].boxes[1], out[j].boxes[0]) || overlap(out[i].boxes[1], out[j].boxes[1])) bad.push(a + ':touch:' + i + j);
    }
  }
  check('all round (every 15 degrees), three ships in one line of sight: no touching, no label on a keep rectangle, and no arrow or label on any corner panel\'s title row (read from CAMP.corner)', bad.length === 0, bad.slice(0, 6).join(' | '));
  check('the corner panels\' title rows are inside the keep rectangles (so the spread, which keeps out of them, keeps out of the panels): all four', CORNERS.every(c => KEEP.some(r => c[0] >= r[0] && c[2] <= r[2] && c[1] >= r[1] && c[3] <= r[3])), JSON.stringify(CORNERS));
  // up near a corner panel: the arrow of a ship at the upper left is slid out of the panel's rectangle, the next one goes on along the edge
  const nearTL = spread([item(-4000, -2200), item(-6000, -3300)]);
  check('two ships toward the top left corner (the panels are there): both are out of the keep rectangles and they do not touch', nearTL.every(p => !KEEP.some(r => p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3]) && !KEEP.some(r => overlap(p.boxes[1], r))) && !overlap(nearTL[0].boxes[1], nearTL[1].boxes[1]), JSON.stringify(nearTL.map(p => [Math.round(p.x), Math.round(p.y), p.boxes[1].map(Math.round)])));
  // a rectangle already taken (the goal's label)
  const base = spread([item(-3000, 0)])[0], taken = spread([item(-3000, 0)], { boxes: [base.boxes[1], base.boxes[0]] })[0];
  check('a rectangle already taken (the goal\'s arrow and label) is kept off as well: the arrow asked for the same place is slid', taken.moved === true && !overlap(taken.boxes[0], base.boxes[0]) && !overlap(taken.boxes[1], base.boxes[1]) && !overlap(taken.boxes[0], base.boxes[1]) && !overlap(taken.boxes[1], base.boxes[0]));
  const wanted = spread([Object.assign({}, item(-3000, 0), { want: null })])[0];
  check('with nothing in the way a label that has its own place (want) is put there: out of the keep rectangles, on the screen', (() => { const o = J(`campEdgeSpread([{ x: 40, y: 360, angle: Math.PI, w: 160, h: 18, want: (px, py, an) => ({ x: px - Math.cos(an) * 64, y: py - Math.sin(an) * 28 }) }], ${JSON.stringify({ keep: KEEP, W, H, m: M, tri: 13 })})[0]`); return o.lx === 40 + 64 && o.ly === 360 + 0 && o.moved === false; })() && wanted.moved === false);
  check('nothing is in the way of the open screen: the same call twice gives the same answer (no state)', JSON.stringify(spread([item(-3000, 0), item(-5000, 0)])) === JSON.stringify(spread([item(-3000, 0), item(-5000, 0)])));
  check('a screen with no room left (every place taken): the thing stays where it was, and the call returns', (() => { const o = spread([item(-3000, 0)], { boxes: [[-10, -10, W + 10, H + 10]] })[0]; return !!o && typeof o.x === 'number'; })());
  check('no things is no answer, and the keep list and the boxes are not changed by the call', J(`campEdgeSpread([], {}).length`) === 0 && (() => { const k = JSON.stringify(KEEP); spread([item(-3000, 0), item(-5000, 0)]); return JSON.stringify(J('CAMP.nav.arrow.keep')) === k; })());
}

console.log('B2. the stacked top corners (card space-game-keys6-layout, on main: Q CRUISER and W on one row at y 78, E FRIENDLIES under it at y 110; ] HOSTILES at y 78 on the right; the bottom corners are empty)');
{
  const at = J('CAMP.corner.at'), KT = J('CAMP.corner.title.h');
  check('the corner table is the stacked layout: every title row is at the top (a row starts under y 150), and none is a bottom corner', Object.values(at).every(a => a.dir > 0 && a.y + KT <= 150), JSON.stringify(at));
  check('the second row of the left stack (E FRIENDLIES, y 110 to 136) is inside the keep rectangles the arrows keep out of', CORNERS.every(c => KEEP.some(r => c[0] >= r[0] && c[2] <= r[2] && c[1] >= r[1] && c[3] <= r[3])), JSON.stringify(CORNERS));
  let bad = [];
  for (let a = 0; a < 360; a += 15) {
    const r = a * Math.PI / 180, out = spread([3000, 5000, 7000, 9000].map(d => item(Math.cos(r) * d, Math.sin(r) * d)));
    for (let i = 0; i < out.length; i++) {
      if (CORNERS.some(c => overlap(out[i].boxes[0], c) || overlap(out[i].boxes[1], c))) bad.push(a + ':row:' + i);
      for (let j = i + 1; j < out.length; j++) if (overlap(out[i].boxes[0], out[j].boxes[0]) || overlap(out[i].boxes[0], out[j].boxes[1]) || overlap(out[i].boxes[1], out[j].boxes[0]) || overlap(out[i].boxes[1], out[j].boxes[1])) bad.push(a + ':touch:' + i + j);
    }
  }
  check('all round, four ships in one line of sight: no touching, and none on a title row of any corner panel', bad.length === 0, bad.slice(0, 6).join(' | '));
  check('the bottom corners are free: an arrow on the right side, low (the target display used to be there) is not pushed away, it sits where the line from the middle meets the border', (() => { const e = edgeAt(3000, 900), p = spread([item(3000, 900)])[0]; return Math.abs(p.x - e.x) < 1 && Math.abs(p.y - e.y) < 1 && p.y > 450 && p.moved === false; })());
}

console.log('C. the scene');
{
  g.run(`
    window.__mk = () => { const C = campNew('home', [], { seed: 4 }); C.ships = C.ships.filter(u => u.team !== 'alien'); C.carrier.x = 0; C.carrier.y = 0; window.C = C; return C; };
    window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
    window.__scene = (zoom, extra) => {
      const calls = [], texts = [], mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, width: 130, height: 16 }; ['setOrigin', 'setScrollFactor', 'setDepth'].forEach(k => { o[k] = () => o; }); o.setAlpha = () => o; o.setText = s => { o.text = s; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setColor = () => o; o.setStyle = () => o; texts.push(o); return o; };
      const mkG = () => new Proxy({}, { get: (t, k) => k === 'calls' ? calls : (...a) => { calls.push([String(k)].concat(a.map(x => typeof x === 'number' ? Math.round(x * 100) / 100 : typeof x === 'object' ? 'obj' : x))); return mkG.self; } });
      mkG.self = mkG();
      const c = C.carrier;
      return Object.assign({ calls, texts, camp: C, mode: 'play', hud: {}, cameras: { main: { zoom, scrollX: c.x - W / 2, scrollY: c.y - H / 2 } }, add: { graphics: () => mkG.self, text: () => mkT() } }, extra || {});
    };
  `);
  g.run('__mk(); window.__a1 = __foe("raider", -5000, 0); window.__a2 = __foe("drone", -7500, 0); C.t = 100000; campSightStep(C)');
  g.run('window.__S = __scene(1); campSightSync(__S)');
  const raw = J('campSightArrows(C, { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2 }, W, H, 1)');
  check('two hostile groups in the same direction (the skiffs and something behind them) have the same arrow point at the left edge to start with: the thing the card found', raw.length === 2 && Math.abs(raw[0].x - raw[1].x) < 1 && Math.abs(raw[0].y - raw[1].y) < 1 && raw.every(a => a.tx != null && a.ty != null), JSON.stringify(raw.map(a => [a.x, a.y])));
  const L = J('__S.texts.filter(t => t.vis).map(t => [t.x, t.y, t.width, t.height, t.text])');
  const box = t => [t[0] - t[2] / 2, t[1] - t[3] / 2, t[0] + t[2] / 2, t[1] + t[3] / 2];
  check('the scene shows two labels and they do not overlap', L.length === 2 && !overlap(box(L[0]), box(L[1])), JSON.stringify(L));
  check('the two triangles are not on top of each other either (the graphics drew two, their points not the same)', (() => { const f = J('__S.calls.filter(c => c[0] === "fillPoints")'); return f.length === 2 && J('__S.hud.sight.boxes.length') === 4; })());
  check('both labels are out of the keep rectangles and the corner panels\' rows', L.every(t => !KEEP.some(r => overlap(box(t), r)) && !CORNERS.some(r => overlap(box(t), r))));
  const sb = J('__S.hud.sight.boxes');
  check('the scene keeps the rectangles of the arrows and labels in scene.hud.sight.boxes (four: two arrows, two labels), for the goal\'s arrow to keep out of', sb.length === 4 && sb.every(b => b.length === 4));
  g.run('__S.mode = "map"; campSightSync(__S)');
  check('on the map there are none (the rectangles are given back with the arrows)', J('__S.hud.sight.boxes.length') === 0);
  g.run('__mk(); window.__b1 = __foe("raider", -5000, 0); C.t = 100000; campSightStep(C); window.__S = __scene(1); campSightSync(__S)');
  const L1 = J('__S.texts.filter(t => t.vis).map(t => [t.x, t.y])');
  check('one group alone has its label where it always had it: behind its arrow, level with it (no slide for nothing)', L1.length === 1 && Math.abs(L1[0][1] - 360) < 1 && L1[0][0] > M + 12, JSON.stringify(L1));
  // the goal's arrow keeps out of the sight arrows' rectangles (paintHud: Campaign.prototype with a stand-in)
  const paint = src('src/campaignscene.js');
  check('the goal\'s arrow in paintHud asks the spread, with the sight arrows\' rectangles taken (scene.hud.sight.boxes) and the same keep rectangles', /campEdgeSpread\(\[\{ x: ar\.x, y: ar\.y, angle: ar\.angle, w: aw, h: ah, want \}\], \{ keep: this\.arrowKeep\(\), W, H, m: CAMP\.nav\.arrow\.margin, tri: 13, boxes: this\.hud\.sight && this\.hud\.sight\.boxes/.test(paint));
}

console.log('D. the calls');
{
  check('the script is in index.html before the scene half that uses it', (() => { const h = src('index.html'), a = h.indexOf('src/campedgespread.js'), b = h.indexOf('src/campsightscene.js'); return a > 0 && b > a; })());
  check('the sight scene puts its arrows through the spread and keeps the rectangles', /campEdgeSpread\(its, \{ keep, W, H, m: CAMP\.nav\.arrow\.margin, tri: K\.tri, gap: K\.gap \}\)/.test(src('src/campsightscene.js')) && /V\.boxes = \[\]/.test(src('src/campsightscene.js')));
  check('the arrows carry where their ship is on the screen (tx, ty), for the turn', /tx: sx, ty: sy, n: g\.n/.test(src('src/campsight.js')) && /tx: sx, ty: sy, dist: campDist\(b, C\.carrier\)/.test(src('src/campsight.js')));
  check('the keep table is not changed by it (it is the corner panels\' own: cards space-game-keys5-corners and space-game-keys6-layout): the spread reads CAMP.nav.arrow.keep as it is', /K = o\.keep \|\| \[\]/.test(src('src/campedgespread.js')));
  check('PROJECT_STATUS.md says it', /edge labels/i.test(src('PROJECT_STATUS.md')) && /space-game-edge-labels-overlap/.test(src('PROJECT_STATUS.md')));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMP EDGE SPREAD FAIL (${failed} of ${n})` : `\nCAMP EDGE SPREAD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
