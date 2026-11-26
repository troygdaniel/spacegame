// smoke: the new ship look's bright ring for the picked ship and hull arc for the hurt or picked ones (green above 60 percent, amber to 30, pink under), as polygon circles, in place of the corners and the health line; the percentage stays beside the arc; the switch off changes nothing (plain Node, no Chrome)
// Card space-game-ship-look-b-ring-arc (landing B of the ship look; Troy, 25 Nov 2026: decisions 2 and 3 of the report on card space-game-ship-look-scope; the mock docs/ship-look-mock.html). src/shiplookmarks.js holds the drawing, one call each
// frame from campTgtPaint (src/camptargetdraw.js), one from squadMarks (src/campaignscene.js) and the changes in src/campchargescene.js; the table is src/shiplook.js (slookRingR, slookPickR, slookArcColor), which this test does not repeat.
//   A  the pure parts: the arc's radius and its least size, the arc's corners, the hull colour
//   B  the picked ship's bright ring, at every zoom; the green corners and the red bracket are not drawn (switch on); with the switch off they are, and nothing else is
//   C  the hull arc: hurt and picked ships, in the three colours, from twelve o'clock clockwise; none for a full hull that is not picked, a ship off the screen, a lost ship, a kind that is not in the table, or under the map; once a ship
//   D  the percentage of a protected ship: no line or bar in the new look, the number for 4 s after a hit beside the arc in its colour; with the switch off the bar is as it was; a switch flipped while playing
//   E  the rules: polygon circles (no Phaser arc), no image, no web, one call each at the scene and the table's numbers are not copied
// Run: node tests/shiplookmarks.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; C.t = 1000; C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  // a Graphics that remembers: the strokes of its polygons (the line style then, the corners it was given), the rectangles (the old corners are rectangles)
  window.__rec = () => { const R = { strokes: [], rects: 0, style: { w: 0, c: 0, a: 0 } }, o = { active: true, scene: {} };
    o.clear = () => { R.strokes.length = 0; R.rects = 0; return o; }; o.lineStyle = (w, c, a) => { R.style = { w, c, a }; return o; }; o.fillStyle = () => o; o.fillRect = () => { R.rects++; return o; }; o.fillTriangle = () => o;
    o.strokePoints = (pts, close) => { R.strokes.push({ w: R.style.w, c: R.style.c, a: R.style.a, close: !!close, n: pts.length, x0: pts[0].x, y0: pts[0].y, x1: pts[pts.length - 1].x, y1: pts[pts.length - 1].y, pts: pts.map(p => [p.x, p.y]) }); return o; };
    R.g = o; return R; };
  window.__scene = z => { const R = window.REC = __rec(); const cam = { scrollX: C.carrier.x - W / 2, scrollY: C.carrier.y - H / 2, zoom: z || 1 }; return window.S = { camp: C, pn: campPanelNew(), mode: 'play', mp: null, cameras: { main: cam }, tgtG: R.g, hud: {}, add: {}, sp: {} }; };
  window.__foe = (dx, dy, kind) => { const u = campSpawn(C, kind || 'raider', C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; u.maxHp = 100; u.hp = 100; return u; };
  window.__ring = () => REC.strokes.filter(s => s.c === 0xe6edf7);
  window.__arcs = () => REC.strokes.filter(s => s.c !== 0xe6edf7 && s.c !== 0xffffff);
  window.__pick = u => { C.tgt = u.id; C.fsel = ''; campMarkTouch(C, false, true); }; // the enemy held, as [ ] and S do
  window.__heal = () => { C.ships.forEach(u => { u.gone = false; u.hp = u.maxHp || u.hp; }); };
  window.__fade = () => { C.t = 1000; campMarkNow(C); C.t = 30000; }; // the squares of the pilots are gone after 3 s (the clock of the marks starts at the first look): only what is picked again stays
`);

console.log('A. the pure parts');
check('the arc\'s radius is the table\'s (0.66 L + 4) for a ship L px long on the screen: the cruiser 58 px, a pilot 19 px', near(J('slookMarkR(58)'), 58 * 0.66 + 4) && near(J('slookMarkR(19)'), 19 * 0.66 + 4));
check('a ring never gets smaller than the bracket\'s least size (34 px across): a ship drawn 6 px long has the least radius (17 less the ring\'s gap)', near(J('slookMarkR(6)'), 17 - 4.5) && J('slookMarkR(6) + SLOOK.ring.gap') * 2 >= 34 - 1e-9);
const ap = J('(() => { const a = slookArcPoints(100, 200, 40, 0.25).map(p => [p.x, p.y]), b = slookArcPoints(100, 200, 40, 0.5).map(p => [p.x, p.y]), c = slookArcPoints(100, 200, 40, 1).map(p => [p.x, p.y]); return { a, b, c, n: campCircleSides(40) }; })()');
check('the arc starts at twelve o\'clock and runs clockwise: a quarter ends at three o\'clock, a half at six, a whole turn comes back to the start', near(ap.a[0][0], 100) && near(ap.a[0][1], 160) && near(ap.a.at(-1)[0], 140) && near(ap.a.at(-1)[1], 200) && near(ap.b.at(-1)[0], 100) && near(ap.b.at(-1)[1], 240) && near(ap.c.at(-1)[0], 100) && near(ap.c.at(-1)[1], 160));
check('a circle\'s corners are cut as src/campcircles.js cuts them (about 3.3 times the square root of the radius), a share of them for a share of the turn, and always at least two segments', ap.c.length === ap.n + 1 && ap.b.length === Math.ceil(ap.n / 2) + 1 && J('slookArcPoints(0, 0, 10, 0.001).length') === 3);
check('the hull colour is the arc\'s: green above 60 percent, amber to 30, pink under (red is retired), as a number; and the same function colours the percentage', J('slookHullColor(1)') === 0x4fe0a6 && J('slookHullColor(0.61)') === 0x4fe0a6 && J('slookHullColor(0.6)') === 0xffc857 && J('slookHullColor(0.31)') === 0xffc857 && J('slookHullColor(0.3)') === 0xff6fa8 && J('slookHullColor(0)') === 0xff6fa8);

console.log('B. the picked ship\'s bright ring');
g.run(`__new(); window.R1 = __foe(300, 0); campTgtStep(C, 1); __scene(1); C.t = 1000; CAMP.flags.shiplook = false; campTgtPaint(S);`);
check('switch off: the corners are drawn as they were (the enemy held: 8 arms; the three pilots: 24) and nothing of the new look (no polygon line)', J('REC.rects') === 32 && J('REC.strokes.length') === 0);
g.run(`CAMP.flags.shiplook = true; campTgtPaint(S);`);
check('switch on, All pilots picked (the default): no corner at all and no ring on the three pilots; only the enemy held has its bright ring (1 ring, the HUD\'s #e6edf7), a closed polygon (card space-game-b3-b-rings-reach)', J('C.sel') === 'all' && J('REC.rects') === 0 && J('__ring().length') === 1 && J('__ring().every(s => s.close)'));
g.run(`C.sel = 'pilot:red'; campMarkTouch(C, true, true); campTgtPaint(S);`);
check('one pilot picked (W, then 1): that pilot, and only that one, wears the ring (2 rings: the enemy held and the pilot), and it sits on the pilot\'s ship', J('__ring().length') === 2 && J('__ring().some(s => Math.hypot(s.x0 - campWingShips(C, "red")[0].x, s.y0 - campWingShips(C, "red")[0].y) < 40)'));
g.run(`C.sel = 'all'; campMarkTouch(C, true, true); campWingShips(C, 'green')[0].hp = 40; campWingShips(C, 'green')[0].maxHp = 100; REC.g.clear(); campTgtPaint(S);`);
check('All pilots picked again with one pilot hurt: that pilot has its hull arc (a ring marks a hurt ship too) but no bright ring: still 1 bright ring, the enemy held, and the arc is there', J('__ring().length') === 1 && J('__arcs().length') >= 1);
g.run(`__heal();`);
g.run(`__fade(); campTgtStep(C, 1); campTgtPaint(S);`);
const ring1 = J('__ring()');
check('after the pilots\' squares fade only the enemy held has its ring; it is 25 px (the raider is 25 px long: 0.66 x 25 + 4, and the ring 4.5 outside it) from the ship\'s middle, 1.6 px thick, bright', ring1.length === 1 && near(Math.hypot(ring1[0].x0 - J('R1.x'), ring1[0].y0 - J('R1.y')), 25, 1e-6) && near(ring1[0].w, 1.6) && ring1[0].a > 0.6 && ring1[0].a <= 1);
g.run(`__scene(0.5); S.sp[R1.id] = { displayWidth: 50, displayHeight: 20 }; campTgtPaint(S);`);
const ring2 = J('__ring()');
check('at half the zoom, with the ship drawn twice as long in the world (as the far view holds it), the ring is the same size on the SCREEN: twice the world px (50), its line twice as thick in the world (3.2)', ring2.length === 1 && near(Math.hypot(ring2[0].x0 - J('R1.x'), ring2[0].y0 - J('R1.y')), 50, 1e-6) && near(ring2[0].w, 3.2));
g.run(`__scene(0.5); campTgtPaint(S);`);
check('a ship that stays 25 px long in the world is 12.5 px on the screen at that zoom: the ring is the least size, 34 px across on the screen (68 in the world)', near(Math.hypot(J('__ring()[0].x0') - J('R1.x'), J('__ring()[0].y0') - J('R1.y')), 34, 1e-6));
g.run(`__scene(1); S.sp[R1.id] = { displayWidth: 120, displayHeight: 40 }; campTgtPaint(S);`);
check('the ring follows the ship\'s drawn length (a ship held up to its least size in the far view): a sprite 120 px long has a ring of 0.66 x 120 + 4 + 4.5', near(Math.hypot(J('__ring()[0].x0') - J('R1.x'), J('__ring()[0].y0') - J('R1.y')), 120 * 0.66 + 4 + 4.5, 1e-6));
g.run(`__scene(1); S.sp[R1.id] = { displayWidth: 5, displayHeight: 3 }; campTgtPaint(S);`);
check('and a ship drawn tiny has the least ring (34 px across)', near(Math.hypot(J('__ring()[0].x0') - J('R1.x'), J('__ring()[0].y0') - J('R1.y')), 17, 1e-6));
g.run(`__scene(1); S.mode = 'pause'; campTgtPaint(S);`);
check('a battle behind a card (the pause) shows no ring, as it showed no corners; the arcs are not the marks\' (section C)', J('__ring().length') === 0);

console.log('C. the hull arc');
g.run(`__new(); window.R1 = __foe(300, 0); window.R2 = __foe(-250, 120); window.R3 = __foe(0, -200); __scene(1); __fade(); CAMP.flags.shiplook = true; campTgtPaint(S);`);
check('hulls all full and nothing picked: no ring and no arc at all (the ring and the arc are only for the picked ship and the hurt ones)', J('REC.strokes.length') === 0 && J('REC.rects') === 0);
g.run(`R2.hp = 50; campTgtPaint(S);`);
const a2 = J('REC.strokes');
check('a hurt ship that is not picked has its arc and no ring: the faint full ring (white at 13 percent) and an amber arc of half a turn, from twelve o\'clock to six', a2.length === 2 && a2[0].c === 0xffffff && near(a2[0].a, 0.13) && a2[0].close && a2[1].c === 0xffc857 && !a2[1].close && near(a2[1].x0, J('R2.x')) && near(a2[1].y0, J('R2.y') - J('slookMarkR(25)')) && near(a2[1].x1, J('R2.x'), 1e-6) && near(a2[1].y1, J('R2.y') + J('slookMarkR(25)'), 1e-6) && near(a2[1].w, 2));
g.run(`R2.hp = 75; campTgtPaint(S);`);
check('above 60 percent the arc is green, and shorter the less it is hurt: 75 percent is three quarters of a turn (it ends at nine o\'clock)', J('REC.strokes[1].c') === 0x4fe0a6 && near(J('REC.strokes[1].x1'), J('R2.x') - J('slookMarkR(25)'), 1e-6) && near(J('REC.strokes[1].y1'), J('R2.y'), 1e-6));
g.run(`R2.hp = 25; campTgtPaint(S);`);
check('under 30 percent it is pink (the hostiles\' colour: red is retired)', J('REC.strokes[1].c') === 0xff6fa8);
g.run(`R2.hp = 50; R3.hp = 90; campTgtPaint(S);`);
check('two hurt ships: two arcs (and their two tracks), each at its own ship', J('REC.strokes.length') === 4 && J('REC.strokes.filter(s => s.close).length') === 2);
g.run(`__heal(); __pick(R1); campTgtPaint(S);`);
const hp1 = J('REC.strokes');
check('a picked ship with a full hull has the full ring (closed, green) as its arc and the bright ring outside it: the arc is on the picked ship although it is not hurt', hp1.length === 3 && hp1.filter(s => s.close).length === 3 && hp1.some(s => s.c === 0x4fe0a6) && hp1.some(s => s.c === 0xe6edf7));
g.run(`__heal(); __pick(R1); R1.hp = 40; campTgtPaint(S);`);
check('a picked ship that is hurt has its arc ONCE (the ring and the hurt pass both name it): the track, the arc and the ring: 3 strokes for it', J('REC.strokes.length') === 3 && J('REC.strokes.filter(s => s.c === 0xffc857 && !s.close).length') === 1);
g.run(`__heal(); C.tgt = ''; R2.hp = 50; R2.x = C.carrier.x + 5000; campTgtPaint(S);`);
check('a hurt ship off the screen has none', J('REC.strokes.filter(s => !s.close).length') === 0);
g.run(`R2.x = C.carrier.x - 250; R2.hp = 0; campTgtPaint(S);`);
check('a ship that is lost has none', J('REC.strokes.filter(s => !s.close).length') === 0);
g.run(`__heal(); C.tgt = ''; R2.hp = 50; R2.gone = true; campTgtPaint(S);`);
check('nor one that has gone', J('REC.strokes.filter(s => !s.close).length') === 0);
g.run(`__heal(); C.tgt = ''; R2.hp = 50; C.ships.push({ id: 'rock-x', kind: 'rock', team: 'alien', x: C.carrier.x + 50, y: C.carrier.y, hp: 5, maxHp: 10, r: 20 }); campTgtPaint(S);`);
check('a unit of a kind that is not in the look table (a rock) has none; the ships of the table all do: the cruiser, a pilot, a raider', J('REC.strokes.filter(s => !s.close).length') === 1 && J('slookKinds().every(k => slookHurt({ kind: k, hp: 5, maxHp: 10 }))') === true && J('slookHurt({ kind: "rock", hp: 5, maxHp: 10 })') === false);
g.run(`C.ships = C.ships.filter(u => u.id !== 'rock-x'); __heal(); R2.hp = 50; S.mp = {}; campTgtPaint(S);`);
check('under the map nothing is drawn', J('REC.strokes.length') === 0);
g.run(`S.mp = null; CAMP.flags.shiplook = false; campTgtPaint(S);`);
check('switch off: the hurt ship has no arc (nothing of the new look is drawn)', J('REC.strokes.length') === 0);
g.run(`CAMP.flags.shiplook = true; __heal(); C.tgt = ''; __scene(0.1); __fade(); C.carrier.hp = C.carrier.maxHp * 0.5; campTgtPaint(S);`);
check('the cruiser too: hurt at the far zoom (0.1), its arc is the least size on the screen, in the world 10 times the px', J('REC.strokes.filter(s => !s.close).length') === 1 && J('REC.strokes.filter(s => !s.close)[0].c') === 0xffc857);
g.run(`__heal(); C.tgt = ''; R1.hp = 50; __scene(1); __fade(); window.G1 = S.slookGen || 0; campTgtPaint(S); window.G2 = S.slookGen; campTgtPaint(S);`);
check('every frame is a new count (so a ship is drawn once a frame, not once ever)', J('G2') === J('G1') + 1 && J('S.slookGen') === J('G1') + 2 && J('REC.strokes.length') === 2);
g.run(`__heal(); C.tgt = ''; window.F1 = C.ships.find(u => u.kind === 'fighter'); F1.maxHp = 100; F1.hp = 50; __scene(1); __fade(); REC.g.clear(); campTgtPaint(S); window.N0 = REC.strokes.length; slookPickMark(REC.g, F1, CAMPTGT.friend, 1, 1, 0, S);`);
check('the squad\'s mark (slookPickMark, called from squadMarks) draws the ring only for a ship whose arc this frame already drew, and the arc and the ring for one that has none', J('REC.strokes.length') === J('N0') + 1 && (g.run(`window.F2 = C.ships.filter(u => u.kind === 'fighter')[1]; F2.hp = F2.maxHp; slookPickMark(REC.g, F2, CAMPTGT.friend, 1, 1, 0, S);`), J('REC.strokes.length') === J('N0') + 4));

console.log('D. the percentage of a protected ship');
g.run(`
  window.__cnew = () => { const C = window.C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.arrivedAt = 0; for (let i = 0; i < 8 * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__cscene = (zoom, sx, sy) => {
    const gs = [], ts = [];
    const mkG = () => { const o = { clears: 0, x: 0, y: 0, sx: 1, vis: true, dead: false }; ['fillStyle', 'lineStyle', 'fillRect', 'strokeRect'].forEach(k => { o[k] = () => o; }); o.clear = () => { o.clears++; return o; }; o.setDepth = () => o; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setScale = s => { o.sx = s; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.destroy = () => { o.dead = true; return o; }; gs.push(o); return o; };
    const mkT = () => { const o = { text: '', x: 0, y: 0, sx: 1, a: 1, vis: true, dead: false, ox: 0, oy: 0, width: 28, style: { color: '' } }; o.setDepth = () => o; o.setOrigin = (a, b) => { o.ox = a; o.oy = b; return o; }; o.setText = v => { o.text = v; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setScale = v => { o.sx = v; return o; }; o.setAlpha = v => { o.a = v; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.destroy = () => { o.dead = true; return o; }; ts.push(o); return o; };
    const sp = {}; C.ships.forEach(u => { sp[u.id] = { displayWidth: 60, displayHeight: 30 }; });
    return { gs, ts, camp: C, mode: 'play', hud: {}, sp, cameras: { main: { zoom, scrollX: sx, scrollY: sy } }, add: { graphics: mkG, text: mkT } };
  };
  window.__at = (u, sx, sy, z) => { u.x = (sx - W / 2) / z + W / 2; u.y = (sy - H / 2) / z + H / 2; };
`);
g.run(`__cnew(); window.M = C.ships.filter(u => u.kind === 'miner' && u.team === 'neutral')[0]; M.maxHp = 100; M.hp = 91; C.t = 60000; M.hurtAt = C.t - 100; CAMP.flags.shiplook = false; window.S1 = __cscene(1, 0, 0); __at(M, 640, 360, 1); campChargeSync(S1);`);
check('switch off: the bars are made and drawn as they were (a Graphics for each ship you protect) and the number is the bar\'s colours, 24 px to the right of the ship', J('S1.gs.length') === J('campChargeBars(C).length') && J('S1.gs.length') >= 1 && J('S1.gs.every(o => o.vis)') === true && J('S1.ts[0].text') === '91%' && near(J('S1.ts[0].x'), J('M.x') + 24));
g.run(`CAMP.flags.shiplook = true; window.S2 = __cscene(1, 0, 0); __at(M, 640, 360, 1); campChargeSync(S2);`);
const off = 60 * 0.66 + 4 + 4.5 + J('CAMP.charge.number.gap');
check('switch on: no bar for any ship (no Graphics made), and its percentage stands beside the arc: the ring\'s edge for a sprite 60 px long, and the gap, to the right, at the ship\'s own height, shown', J('S2.gs.length') === 0 && J('S2.ts.length') === 1 && J('S2.ts[0].text') === '91%' && J('S2.ts[0].vis') === true && near(J('S2.ts[0].x'), J('M.x') + off, 1e-6) && near(J('S2.ts[0].y'), J('M.y'), 1e-6) && J('S2.ts[0].ox') === 0, JSON.stringify(J('S2.ts[0]')));
check('the number is the arc\'s colour: green at 91 percent', J('S2.ts[0].style.color') === '#4fe0a6');
g.run(`M.hp = 50; M.hurtAt = C.t - 100; campChargeSync(S2);`);
check('amber at 50 percent, and', J('S2.ts[0].style.color') === '#ffc857' && J('S2.ts[0].text') === '50%');
g.run(`M.hp = 20; M.hurtAt = C.t - 100; campChargeSync(S2);`);
check('pink at 20 percent (red is retired)', J('S2.ts[0].style.color') === '#ff6fa8' && J('S2.ts[0].text') === '20%');
g.run(`C.t += 1000; campChargeSync(S2);`);
check('4 s after a hit it still shows (the same loud time as the bar had); then it eases out and is not shown', J('S2.ts[0].vis') === true && (g.run(`C.t += 9000; campChargeSync(S2);`), J('S2.ts[0].vis') === false));
g.run(`__at(M, 1230, 360, 1); M.hurtAt = C.t - 100; campChargeSync(S2);`);
check('near the right edge the number goes to the LEFT of the arc (origin 1) as it did of the bar; off the screen it is not shown', J('S2.ts[0].ox') === 1 && near(J('S2.ts[0].x'), J('M.x') - off, 1e-6) && (g.run(`__at(M, 1300, 360, 1); campChargeSync(S2);`), J('S2.ts[0].vis') === false));
g.run(`__at(M, 640, 360, 1); campChargeSync(S2); CAMP.flags.shiplook = false; campChargeSync(S2);`);
check('the switch flipped off while playing: the bars\' Graphics are made then and shown, and the number is at the bar\'s place again', J('S2.gs.length') === J('campChargeBars(C).length') && J('S2.gs.every(o => o.vis)') === true && near(J('S2.ts[0].x'), J('M.x') + 24, 1e-6));
g.run(`CAMP.flags.shiplook = true; campChargeSync(S2);`);
check('and on again: the bars are hidden (kept, not destroyed), the number beside the arc; a ship that is lost has its number destroyed', J('S2.gs.every(o => !o.vis && !o.dead)') === true && near(J('S2.ts[0].x'), J('M.x') + off, 1e-6) && (g.run(`M.hp = 0; campChargeSync(S2);`), J('S2.ts[0].dead') === true));
check('campChargeNumberSide takes a distance of its own: the same ship at 1150 has its number at the right with 24 px and at the left with 100 (the right would be cut)', J('campChargeNumberSide({ sx: 1150, sy: 360, ny: 340, tw: 28, th: 15 }, W, H)') === 'right' && J('campChargeNumberSide({ sx: 1150, sy: 360, ny: 340, tw: 28, th: 15, off: 100 }, W, H)') === 'left' && J('campChargeNumberSide({ sx: 1150, sy: 360, ny: 340, tw: 28, th: 15, off: 24 }, W, H)') === 'right');

console.log('E. the rules');
const mk = src('src/shiplookmarks.js'), code = mk.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('polygon circles, not Phaser\'s arc (campRing and strokePoints; no .arc, strokeCircle or fillCircle), no image, no libraries, no web request, one new line of drawing for the picked ship\'s ring and the arc', /campRing\(/.test(code) && /strokePoints\(/.test(code) && !/\.arc\(|strokeCircle|fillCircle|fetch\(|XMLHttpRequest|<img|data:image|createElement|new Image/.test(code));
check('the table\'s numbers are not copied: the colours, the gap and the widths come from SLOOK (src/shiplook.js), the least size from CAMPTGT', /SLOOK\.arc/.test(code) && /SLOOK\.ring\.gap/.test(code) && /CAMPTGT\.minScreen/.test(code) && !/0x4fe0a6|0xffc857|0xff6fa8|#e6edf7/i.test(code));
const tg = src('src/camptargetdraw.js'), sc = src('src/campaignscene.js'), cs = src('src/campchargescene.js');
check('the scene\'s calls are one in campTgtPaint (the ring in place of the corners, the arcs after the marks) and one in squadMarks; the old corner calls are still there for the switch off', /slookPickMark\(g, v, col, z, a, campTgtDrawn\(s, v\), s\)/.test(tg) && /campTgtCorners\(g, v, col, z, a, campTgtDrawn\(s, v\)\)/.test(tg) && /slookArcsPaint\(g, s, z\)/.test(tg) && /slookMarksBegin\(s\)/.test(tg) && /slookPickMark\(sg, u, CAMPTGT\.friend, z, al, campTgtDrawn\(this, u\), this\)/.test(sc) && /campTgtCorners\(sg, u, CAMPTGT\.friend, z, al, campTgtDrawn\(this, u\)\)/.test(sc));
check('the charge file asks the switch once a frame (slookOn) and takes the colours and the sizes from the marks file', /slookOn\(\)/.test(cs) && /slookHullColor\(b\.hull\)/.test(cs) && /slookMarkR\(/.test(cs));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nSHIP LOOK MARKS FAIL: ${failed} of ${n} checks failed` : `\nSHIP LOOK MARKS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
