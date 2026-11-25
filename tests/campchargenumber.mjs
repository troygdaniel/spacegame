// smoke: the percentage of a protected ship's full health bar is kept whole inside the screen, and is not drawn for a ship that is off it (plain Node: no Phaser, no page, no Chrome)
// Card space-game-edge-percent-label-cut (browser batch bc8ad3e5, 1.2, Troy's browser look): with the miners just off the left of the screen, a small green percentage was cut by the screen's edge (it read "1%") and, with the page HUD on,
// sat over the miner's edge pill. The number sits at the right of the bar, the bar is on the ship, and a ship just off the edge had its bar off the screen but the number (24 px further in) half on it. The rule is
// campChargeNumberSide (src/campcharge.js): no number for a ship the edge arrow / page pill already speaks for (the same test as campSightFriends: CAMP.nav.arrow margin and keep), the left of the bar when the right is cut off, none when it
// would not fit whole. The scene half (src/campchargescene.js) moves the number and its origin. The page HUD does not change it (the same on or off: the number is the canvas's, the pill is the page's).
//   A. the rule at 1280 x 720: in the middle at the right; at the edge the arrow's margin and keep rects say off the screen; near the right edge to the left; too high or low none
//   B. the same test as the edge pill: for a grid of places a ship has no number exactly where campSightFriends gives it an arrow (the page asks for the same list with `all`)
//   C. the flight view: the card's own picture (a hit miner just off the left edge: no number), a sweep of ships and zooms in which every number that shows is whole inside the screen, the left flip and back, the origin set once
//   D. the page HUD on or off changes nothing; the table's key and its comment; the rule file stays pure; the page HUD's files are not touched
// Run: node tests/campchargenumber.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (mission, s) => { const C = campNew(1, [], { seed: 5, god: true, mission }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, s || 8); C.ships = C.ships.filter(u => u.team !== 'alien'); window.C = C; return C; };
  // a stand-in scene: graphics, and texts that remember their origin, where they are, how big, how wide (28 px: a three digit number at 11 px) and whether they show; the camera has no size (the scene's W and H are the screen)
  window.__scene = (zoom, scrollX, scrollY) => {
    const gs = [], ts = [];
    const mkG = () => { const o = { clears: 0, x: 0, y: 0, sx: 1, vis: true, dead: false }; ['fillStyle', 'lineStyle', 'fillRect', 'strokeRect'].forEach(k => { o[k] = () => o; }); o.clear = () => { o.clears++; return o; }; o.setDepth = () => o; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setScale = s => { o.sx = s; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.destroy = () => { o.dead = true; return o; }; gs.push(o); return o; };
    const mkT = () => { const o = { text: '', x: 0, y: 0, sx: 1, a: 1, vis: true, dead: false, ox: 0, oy: 0, origins: 0, width: 28, style: { color: '' } }; o.setDepth = () => o; o.setOrigin = (a, b) => { o.ox = a; o.oy = b; o.origins++; return o; }; o.setText = v => { o.text = v; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setScale = v => { o.sx = v; return o; }; o.setAlpha = v => { o.a = v; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.destroy = () => { o.dead = true; return o; }; ts.push(o); return o; };
    const sp = {}; C.ships.forEach(u => { sp[u.id] = { displayWidth: 60, displayHeight: 30 }; });
    return { gs, ts, camp: C, mode: 'play', hud: {}, sp, cameras: { main: { zoom, scrollX, scrollY } }, add: { graphics: mkG, text: mkT } };
  };
  // put the ship so it is at (sx, sy) of the screen of a scene with the camera at scroll (0, 0) and zoom z: world x = sx / z - W / 2 / z + W / 2
  window.__at = (u, sx, sy, z) => { u.x = (sx - W / 2) / z + W / 2; u.y = (sy - H / 2) / z + H / 2; };
  window.__side = (sx, sy, ny, tw, th) => campChargeNumberSide({ sx, sy, ny: ny === undefined ? sy - 20 : ny, tw: tw || 28, th: th || 15 }, W, H);
`);

console.log('A. the rule');
{
  const side = (sx, sy, ny, tw, th) => J(`__side(${sx}, ${sy}, ${ny === undefined ? 'undefined' : ny}, ${tw || 28}, ${th || 15})`);
  check('the screen is 1280 x 720 and the table says how the number keeps off the edge (4 px), the arrow\'s margin is 40', J('W') === 1280 && J('H') === 720 && J('CAMP.charge.number.edge') === 4 && J('CAMP.nav.arrow.margin') === 40);
  check('a ship in the middle: the number is at the right of the bar', side(640, 360) === 'right');
  check('a ship just off the left edge (the card: the number would have been 14 px in, cut by the edge): none', side(-10, 360) === null && side(0, 360) === null);
  check('a ship at the arrow\'s margin or inside it has none (it has its edge arrow or pill): 20 and 40 px in; 41 has the number', side(20, 360) === null && side(40, 360) === null && side(41, 360) === 'right');
  check('the right edge: the number does not fit at the right of the bar (24 px and 28 px wide) from 1280 - 4 - 52 = 1224 on: it goes to the left of the bar', side(1223, 360) === 'right' && side(1224, 360) === 'right' && side(1225, 360) === 'left' && side(1239, 360) === 'left');
  check('a ship off the right edge, or in the margin: none', side(1240, 360) === null && side(1300, 360) === null);
  check('a ship under a HUD corner (the keep rects of the edge arrows) has none: the top left, the top middle', side(100, 100) === null && side(640, 100) === null);
  check('above or under the ship in the screen: a number whose box is not whole inside the screen height is not drawn (the bar of a big ship near the top)', side(640, 360, 6) === null && side(640, 360, 10) === null && side(640, 360, 12) === 'right' && side(640, 360, 714) === null && side(640, 360, 708) === 'right' ? true : false, [side(640, 360, 6), side(640, 360, 10), side(640, 360, 12), side(640, 360, 714), side(640, 360, 708)].join());
  check('a wide number that fits neither side gets none (a screen that is too narrow: 100 px wide text)', side(640, 360, undefined, 1200) === null);
}

console.log('B. the same test as the edge pill');
{
  g.run('__new(1)');
  g.run('window.M = C.ships.filter(u => u.kind === \'miner\' && u.team === \'neutral\')[0]; C.carrier.x = 640; C.carrier.y = 360;');
  let bad = [], cases = 0;
  for (let sx = -100; sx <= 1380; sx += 37) for (let sy = -60; sy <= 780; sy += 41) {
    g.run(`__at(M, ${sx}, ${sy}, 1);`);
    // (at scroll 0 and zoom 1 the ship is where it is on the screen: campSightFriends is asked the way the page HUD asks it, `all`)
    const arrow = J(`campSightFriends(C, { x: 0, y: 0 }, W, H, 1, true).some(a => a.id === M.id)`), none = J(`__side(${sx}, ${sy}, ${sy - 20}, 28, 15) === null`);
    cases++; if (arrow !== none) bad.push(sx + ',' + sy + ' arrow ' + arrow + ' none ' + none);
  }
  check('a ship has an arrow (and with the page HUD its pill) exactly where its number is not drawn: ' + cases + ' places on and round the screen', bad.length === 0 && cases > 600, bad.slice(0, 5).join(' | '));
}

console.log('C. the flight view');
{
  g.run('__new(1)');
  g.run(`window.M = C.ships.filter(u => u.kind === 'miner' && u.team === 'neutral')[0]; M.maxHp = 100; M.hp = 91; C.t = 60000; M.hurtAt = C.t - 100;`);
  const row = (z, sx, sy) => { g.run(`window.S = __scene(${z}, 0, 0); __at(M, ${sx}, ${sy}, ${z}); campChargeSync(S);`); return J('S.ts.length ? { vis: S.ts[0].vis, x: S.ts[0].x, y: S.ts[0].y, ox: S.ts[0].ox, s: S.ts[0].sx, text: S.ts[0].text } : null'); };
  const at = (z, sx) => row(z, sx, 360);
  check('the card: a hit miner just off the left edge (its bar is off the screen, its number would be 14 px in): the number is made and not shown', (r => r && r.vis === false && r.text === '91%')(at(1, -10)));
  check('the same ship in the middle: shown at the right of the bar (origin 0), 24 px from the ship\'s middle', (r => r && r.vis === true && r.ox === 0 && Math.abs(r.x - (J('M.x') + 24)) < 1e-6 && r.text === '91%')(at(1, 640)));
  check('near the right edge: shown at the LEFT of the bar (origin 1), 24 px the other way', (r => r && r.vis === true && r.ox === 1 && Math.abs(r.x - (J('M.x') - 24)) < 1e-6)(at(1, 1230)));
  check('off the right edge: not shown', (r => r && r.vis === false)(at(1, 1290)));
  check('the far view (zoom 0.335, the 1.2 start): the same, and the offset is 24 px ON THE SCREEN (24 / zoom in the world), the text scaled by 1 / zoom', (r => r && r.vis === true && Math.abs(r.x - (J('M.x') + 24 / 0.335)) < 1e-6 && Math.abs(r.s - 1 / 0.335) < 1e-9)(at(0.335, 640)) && (r => r && r.vis === false)(at(0.335, -10)));
  // a sweep: every number that shows is whole inside the screen, and belongs to a ship that has no edge arrow
  let shown = 0, cut = [], withArrow = [], flips = 0, hidden = 0;
  for (const z of [1, 0.335, 0.1]) for (let sx = -120; sx <= 1400; sx += 11) for (let sy = -60; sy <= 780; sy += 29) {
    const r = row(z, sx, sy); if (!r) continue;
    if (!r.vis) { hidden++; continue; }
    shown++; if (r.ox === 1) flips++;
    const left = ((r.x - 0 - 640) * z + 640) - (r.ox === 1 ? 28 : 0), right = left + 28, top = (r.y - 360) * z + 360 - 7.7, bot = top + 15.4; // the box on the screen (the text's width is its screen px)
    if (left < 4 - 1e-6 || right > 1280 - 4 + 1e-6 || top < 4 - 1e-6 - 0.1 || bot > 720 - 4 + 0.1) cut.push(`${z} ${sx},${sy}: ${left.toFixed(1)}..${right.toFixed(1)} ${top.toFixed(1)}..${bot.toFixed(1)}`);
    g.run(`__at(M, ${sx}, ${sy}, ${z});`); if (J(`campSightFriends(C, { x: 0, y: 0 }, W, H, ${z}, true).some(a => a.id === M.id)`)) withArrow.push(z + ' ' + sx + ',' + sy);
  }
  check('a sweep of 3 zooms and the whole screen and its border: every number that shows is whole inside the screen (4 px in)', shown > 500 && cut.length === 0, shown + ' shown; ' + cut.slice(0, 4).join(' | '));
  check('and none of them is for a ship that has an edge arrow; some were moved to the left of the bar, some not drawn at all', withArrow.length === 0 && flips > 20 && hidden > 500, withArrow.slice(0, 3).join(' | ') + ' flips ' + flips + ' hidden ' + hidden);
  // the origin is set when the side changes, not every frame; the bar itself stays (only the number is kept in)
  g.run(`window.S = __scene(1, 0, 0); __at(M, 640, 360, 1); campChargeSync(S); window.o1 = S.ts[0].origins; for (let i = 0; i < 20; i++) campChargeSync(S);`);
  check('the origin is not set again every frame (the side did not change)', J('S.ts[0].origins') === J('o1'));
  g.run(`__at(M, 1230, 360, 1); campChargeSync(S); window.o2 = S.ts[0].origins; campChargeSync(S); campChargeSync(S);`);
  check('it is set once when the number flips to the left, and not again', J('S.ts[0].ox') === 1 && J('S.ts[0].origins') === J('o1') + 1 && J('S.ts[0].origins') === J('o2'));
  g.run(`__at(M, 640, 360, 1); campChargeSync(S);`);
  check('and back to the right when the ship comes back (origin 0 again)', J('S.ts[0].ox') === 0 && J('S.ts[0].vis') === true);
  g.run(`__at(M, -10, 360, 1); campChargeSync(S);`);
  check('a ship off the screen keeps its bar (the bar and the thin line draw as before: only the number is dropped)', J('S.hud.charge[M.id].g.vis') === true && J('S.hud.charge[M.id].t.vis') === false);
  g.run(`window.S = __scene(1, 0, 0); __at(M, 640, 360, 1); M.hurtAt = C.t - 100; campChargeSync(S); S.mp = {}; campChargeSync(S);`);
  check('with the map open the number stays hidden, as before', J('S.ts[0].vis') === false);
  g.run(`S.mp = null; campChargeSync(S); window.T2 = campChargeBars(C).length;`);
  check('a scene with a camera that has no scroll (a stand-in in another test) is not an error', (() => { try { g.run(`campChargeSync({ camp: C, hud: {}, sp: {}, cameras: { main: { zoom: 1 } }, add: { graphics: () => ({ setDepth() { return this; }, clear() { return this; }, fillStyle() { return this; }, fillRect() { return this; }, lineStyle() { return this; }, strokeRect() { return this; }, setPosition() { return this; }, setScale() { return this; }, setVisible() { return this; }, destroy() {} }), text: () => ({ setOrigin() { return this; }, setDepth() { return this; }, setText() { return this; }, setColor() { return this; }, setPosition() { return this; }, setScale() { return this; }, setAlpha() { return this; }, setVisible() { return this; }, destroy() {}, style: {} }) } });`); return true; } catch (e) { return false; } })());
}

console.log('D. the page HUD, the table, the files');
{
  g.run('__new(1)'); g.run(`window.M = C.ships.filter(u => u.kind === 'miner' && u.team === 'neutral')[0]; M.hp = M.maxHp * 0.9; C.t = 60000; M.hurtAt = C.t - 100;`);
  const run = on => { g.run(`CAMP.flags.pagehud = ${on}; window.S = __scene(1, 0, 0); __at(M, 1230, 360, 1); campChargeSync(S);`); return J('S.ts[0] && { vis: S.ts[0].vis, x: S.ts[0].x, ox: S.ts[0].ox }'); };
  const off = run(false), on = run(true); g.run('CAMP.flags.pagehud = false;');
  check('the page HUD on or off: the number is the same (it is the canvas\'s; the pill is the page\'s)', JSON.stringify(off) === JSON.stringify(on) && off.vis === true && off.ox === 1, JSON.stringify([off, on]));
  const cc = src('src/campcharge.js'), cs = src('src/campchargescene.js'), cp = src('src/campaign.js'), html = src('index.html');
  check('the table has the key and its comment says why', /number: \{ font: 11, gap: 5, edge: 4 \},\s*\/\/[^\n]*card space-game-edge-percent-label-cut/.test(cp));
  check('the rule is in the rule file, which stays pure (no Phaser, no scene), and the scene half calls it', /function campChargeNumberSide\(/.test(cc) && !/Phaser|scene\./.test(cc.replace(/^\/\/.*$/gm, '').replace(/\/\/[^\n]*/g, '')) && /campChargeNumberSide\(\{/.test(cs));
  check('the scene half does not know the page HUD (no flag, no hides): the number is the same on and off', !/pagehud|PageHud|campPageHud/i.test(cs));
  check('no new file: index.html lists campcharge.js and campchargescene.js as before, once each', (html.match(/src\/campcharge\.js/g) || []).length === 1 && (html.match(/src\/campchargescene\.js/g) || []).length === 1);
  check('the page HUD\'s files are as they were: they do not mention the number\'s rule (5-GEN\'s camppagehud.js, campsightscene.js, campsight.js are not touched)', !/campChargeNumberSide/.test(src('src/camppagehud.js') + src('src/campsightscene.js') + src('src/campsight.js')));
}

console.log(failed ? `\nCAMPAIGN CHARGE NUMBER FAIL: ${failed} of ${n} checks failed` : `\nCAMPAIGN CHARGE NUMBER PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
