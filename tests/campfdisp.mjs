// smoke: what the bottom right holds (the one target: its subject, the room the corners take, the dodge of an open list) and the square marker on friends and enemies; the who box that was in the bottom left is gone (the FLEET corner is tests/campcorner.mjs)
// Cards space-game-target-display, space-game-friendly-display (the square marker), space-game-keys-panels and space-game-keys2-panels (the one target box with the order-key line); space-game-layout-fleet took the who box out (the corner panel: src/campcorner.js).
//   H. the one target box: the one target held, an enemy or a friendly (an outpost too), with one order-key line at its foot (Attack for an enemy, Guard for a friendly), lit when the order can be given and grey when not; the stacked friendly box is gone
//   F. the square marker: the friend and the hostile and the fighters an order went to are all drawn by the one function; no ring is left in the scene; the scene calls the target display and the corner panels every frame
// Run: node tests/campfdisp.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('campFleetListSet(true); // this suite is about the all-squads list (W) over the corner box: it is switched off in the game with the old fleet switch (card space-game-keys-orders; CAMP_FLEET_LIST) and on here');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  // mission 1.1 with the wing launched and no hostile: the three pilots are out
  window.__out = () => { const C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.ships = C.ships.filter(u => u.team !== 'alien'); campOrder(C, 'launch'); __run(C, 8); C.ships = C.ships.filter(u => u.team !== 'alien'); window.C = C; window.P = campPanelNew(); return C; };
  window.__foe = (dx, dy) => { const u = campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
`);

console.log('H. the one target box and its order-key line (cards space-game-keys-panels, space-game-keys2-panels)');
{
  g.run('__out()');
  const K = J('CAMP.tdisp'), Tb = J('campTdispBox()'), keep = J('CAMP.nav.arrow.keep');
  check('the target box is in the bottom right, 200 wide and 200 + the key line tall, and the FLEET corner at the bottom left (the who box is gone: card space-game-layout-fleet) does not touch it', Tb.h === 200 + K.line && Tb.x + Tb.w === 1280 - K.right && Tb.x > J('CAMP.corner.at.bl.x') + J('CAMP.corner.w'), JSON.stringify(Tb));
  check('the target box is inside a rectangle the edge arrows keep out of and so is the room the FLEET corner and its details can take at the bottom left', keep.some(r => Tb.x >= r[0] && Tb.y >= r[1] && Tb.x + Tb.w <= r[2] && Tb.y + Tb.h <= r[3]) && keep.some(r => r[0] === 0 && r[1] <= 446 && r[2] >= 218 && r[3] >= 630));
  { const hT = J('campCornerGeom("tr", 0, 0).title'), fG = J('campCornerGeom("br", ' + (J('CAMP.corner.item.pic + CAMP.corner.item.bar * 2 + CAMP.corner.item.text + CAMP.corner.item.key')) + ', 0)'), inKeep = b => keep.some(r => b.x >= r[0] && b.y >= r[1] && b.x + b.w <= r[2] && b.y + b.h <= r[3]); check('the target corners are inside rectangles the edge arrows keep out of: the HOSTILES title row, and the FRIENDLIES title with its largest details (a picture row, two bars, a line of text, the E chip) above it; the rest of the right edge is free for the arrows\' labels', inKeep(hT) && inKeep(fG.title) && inKeep(fG.det) && !keep.some(r => r[0] >= 1000 && r[1] > 180 && r[1] < 360), JSON.stringify([hT, fG])); }
  check('there is no stacked friendly box any more: no campGdispSync, no gdisp, no stack number', J(`typeof campGdispSync`) === 'undefined' && J(`typeof campGdispSubject`) === 'undefined' && K.stack === undefined && !/gdisp|campGdispSync/.test(src('src/campaignscene.js') + src('src/camptdispscene.js')));
  check('nothing held: nothing is shown', J('campTdispSubject(C, P, 0)') === null);
  g.run(`window.W1 = campFriList(C).find(e => e.kind === 'ward'); window.P1 = campFriPlace(C, 'place:luna'); /* an outpost: held by a map click now, not in the O P cycle (card space-game-keys3-select) */ C.fsel = W1.id;`);
  const sub = J(`(() => { const s = campTdispSubject(C, P, 0); return s && { id: s.u.id, side: s.side, held: s.held }; })()`);
  check('a friendly ship held (O P): the one target box shows it, as a friend, held', sub && sub.id === J('W1.id') && sub.side === 'friend' && sub.held === true, JSON.stringify(sub));
  g.run(`C.fsel = P1.id;`);
  const post = J(`(() => { const s = campTdispSubject(C, P, 0); return s && { u: s.u, post: s.post.name, side: s.side, held: s.held }; })()`);
  check('an outpost held: no unit, the outpost\'s name', post && post.u === null && post.post === J('P1.name') && post.side === 'friend' && post.held === true, JSON.stringify(post));
  g.run(`window.R1 = __foe(900, 0); C.fsel = ''; C.tgt = R1.id;`);
  const en = J(`(() => { const s = campTdispSubject(C, P, 0); return s && { id: s.u.id, side: s.side, held: s.held }; })()`);
  check('an enemy held ([ ] backslash): the same box shows it, as a hostile, held', en && en.id === J('R1.id') && en.side === 'hostile' && en.held === true, JSON.stringify(en));
  // the scene half of the box (its frame, texts, picture, the key line, the steady cost, the map and card hiding) is the target corners' now: tests/campcorners.mjs sections G, H and I
  g.run(`C.tgt = ''; C.fsel = ''; window.R = { pn: Object.assign(campPanelNew(), { open: 'power' }), pnl: { view: { total: 5 } } };`);
  check('the power list (right, five rows, to y 318) does not reach the bottom right room (it starts at y ' + Tb.y + '): it stays', J('campBoxDx(R, false)') === 0);
  g.run(`campPanelClose(P); window.R = { pn: Object.assign(campPanelNew(), { open: 'ship' }), pnl: { view: { total: 11 } } };`); // (the ship list is parked: no key opens it and it has few rows now, so the panel state and its eleven rows are set by hand to try the rule)
  const Sh = J(`(() => { const G = campPanelsGeometry(campPanelDef('ship'), 11); return { x: G.x, y: G.y, w: G.w, h: G.h }; })()`), dx = J('campBoxDx(R, false)'), TNow = J(`campTdispBox(false, ${dx})`);
  check('the ship list (right, eleven rows, to y 474) reaches it: the right corners step left of the list, CAMP.tdisp.beside px from its edge, and they do not touch', Sh.y + Sh.h > Tb.y && dx < 0 && TNow.x + TNow.w + K.beside === Sh.x, JSON.stringify([Sh, TNow]));
  g.run(`window.R = { pn: campPanelNew(), pnl: null };`);
  check('the list closes: no step aside', J('campBoxDx(R, false)') === 0);
  check('a left list moves the left corner and never the right ones; a right list the right ones and never the left', J(`(() => { const L = { pn: Object.assign(campPanelNew(), { open: 'squads' }), pnl: null }, R = { pn: Object.assign(campPanelNew(), { open: 'ship' }), pnl: null }; return [campBoxDx(L, true) > 0, campBoxDx(L, false) === 0, campBoxDx(R, false) < 0, campBoxDx(R, true) === 0].every(Boolean); })()`));
  const scene = src('src/campaignscene.js');
  check('the scene calls the corner panels and the target corners\' picture every frame (the old target box and the who box are gone), in files that have their script tags', /campTcornerLook\(this\.pn, this\.time\.now\);[^\n]*\n\s*if \(typeof campCornerSync === 'function'\) campCornerSync\(this, this\.time\.now\);[^\n]*\n\s*if \(typeof campTcornerSync === 'function'\) campTcornerSync\(this, this\.time\.now\)/.test(scene) && !/campTdispSync/.test(scene) && ['campcorner.js', 'campcornerscene.js', 'camptcorner.js', 'camptcornerscene.js'].every(f => src('index.html').indexOf('src/' + f) > 0));
  check('the words: Attack, Guard and Friendly post are content (no bare key at run time) and the voice pack\'s tdisp family covers them', ['camp.tdisp.key.attack', 'camp.tdisp.key.guard', 'camp.tdisp.type.post'].every(k => J(`uiText(${JSON.stringify(k)})`) !== k) && /camp\\\.tdisp\\\./.test(src('src/voicepack.js')));
}

console.log('F. the square marker, and no rings');
{
  const html = src('index.html'), scene = src('src/campaignscene.js'), draw = src('src/camptargetdraw.js'), tds = src('src/camptdispscene.js');
  check('the target\'s function draws the square (campTgtCorners): the hostile, the friend picked and the fighters an order went to use the same one', /function campTgtCorners\(/.test(draw) && /campTgtCorners\(g, v, col, z, al, drawn\)/.test(draw) && /campTgtCorners\(sg, u, CAMPTGT\.friend/.test(scene));
  check('the friend\'s square is in a friendly colour that reads apart from the hostile\'s: green, not red', J('CAMPTGT.friend') !== J('CAMPTGT.color') && J('(CAMPTGT.friend >> 8) & 255') > J('(CAMPTGT.friend >> 16) & 255') && J('(CAMPTGT.color >> 16) & 255') > J('(CAMPTGT.color >> 8) & 255'));
  check('with All pilots picked all three pilots\' squares are drawn (campTgtPaint draws every ship WHO is: whoShips), and with one pilot picked that pilot\'s', /pk\.whoShips/.test(draw) && /campTgtCorners\(g, v, col, z, al, drawn\)/.test(draw));
  check('no coloured ring is left on a friendly ship: the scene has no squadCircle and strokes no circle round a fighter (the squad colours still colour the map\'s dots and the display\'s picture)', !/squadCircle/.test(scene) && /squadMarks\(\) \{/.test(scene) && !/campRing\(sg/.test(scene) && !/strokeCircle/.test(scene.slice(scene.indexOf('squadMarks() {'), scene.indexOf('  sync() {'))));
  check('the scene calls the corner panels; there is no campFdispSync, no fdisp and no campFdispAll left', /function campCornerSync\(/.test(src('src/campcornerscene.js')) && !/campFdispSync|campFdispAll|CAMP_FDISP_ALL|hud\.fdisp/.test(scene + src('src/camptdispscene.js') + src('src/camptdisp.js')));
  check('the arrows\' keep list has the left corner\'s rectangle (a label is never put under the display)', J('CAMP.nav.arrow.keep.some(r => r[0] === 0 && r[1] === 430 && r[2] >= 218)'));
}

console.log(failed ? `\nFRIEND DISPLAY FAIL: ${failed} of ${n} checks failed` : `\nFRIEND DISPLAY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
