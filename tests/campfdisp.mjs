// smoke: the target display in the bottom RIGHT corner (one target box with the order key on it) and the square marker on friends and enemies; the who box that was in the bottom left is gone (the FLEET corner is tests/campcorner.mjs)
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
  // a stand-in scene: graphics and texts that remember what was done to them, an image, the panels' state
  window.__scene = (extra) => {
    const mkG = () => { const o = { clears: 0, log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
    const mkT = (objs) => () => { const o = { text: '', x: 0, y: 0, vis: false, style: { color: '#ffffff' }, width: 60, height: 14 }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; objs.push(o); return o; };
    const objs = [], pics = [];
    const mkP = () => { const pic = { vis: false, tex: '', tint: -1, x: 0, y: 0, width: 64, height: 32 }; ['setScrollFactor', 'setDepth', 'setRotation', 'setScale'].forEach(k => { pic[k] = () => pic; }); pic.setTexture = t => { pic.tex = t; return pic; }; pic.setTint = t => { pic.tint = t; return pic; }; pic.clearTint = () => { pic.tint = -1; return pic; }; pic.setPosition = (x, y) => { pic.x = x; pic.y = y; return pic; }; pic.setVisible = v => { pic.vis = v; return pic; }; pics.push(pic); return pic; };
    return Object.assign({ objs, pics, camp: C, pn: P, mode: 'play', hud: {}, textures: { exists: () => true }, texOf: k => 'tex-' + k, add: { graphics: mkG, text: mkT(objs), image: mkP } }, extra || {});
  };
`);

console.log('H. the one target box and its order-key line (cards space-game-keys-panels, space-game-keys2-panels)');
{
  g.run('__out()'); g.run('window.S = __scene()');
  const K = J('CAMP.tdisp'), Tb = J('campTdispBox()'), keep = J('CAMP.nav.arrow.keep');
  check('the target box is in the bottom right, 200 wide and 200 + the key line tall, and the FLEET corner at the bottom left (the who box is gone: card space-game-layout-fleet) does not touch it', Tb.h === 200 + K.line && Tb.x + Tb.w === 1280 - K.right && Tb.x > J('CAMP.corner.at.bl.x') + J('CAMP.corner.w'), JSON.stringify(Tb));
  check('the target box is inside a rectangle the edge arrows keep out of (it runs from the target box\'s top, not up to the friendly\'s old place), and so is the room the FLEET corner and its details can take at the bottom left', keep.some(r => Tb.x >= r[0] && Tb.y >= r[1] && Tb.x + Tb.w <= r[2] && Tb.y + Tb.h <= r[3]) && !keep.some(r => r[0] >= 1000 && r[1] < Tb.y - 10 && r[1] > 150) && keep.some(r => r[0] === 0 && r[1] <= 446 && r[2] >= 218 && r[3] >= 630));
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
  g.run('window.S = __scene()'); g.run(`campTdispSync(S, 1000);`);
  const T = 'S.hud.tdisp', keyE = J('(CAMP_KEYS.engage || CAMP_KEYS.attack).k'), keyG = J('(CAMP_KEYS.engage || CAMP_KEYS.guard).k'); // E is the one order key once card space-game-keys2-orders is in; before that the verb\'s own
  check('the enemy in the box: its name at the box\'s top left, its key line at the foot: the order key from the key table and the word "Attack", lit with the pilots out', /^Raider \d+$/.test(J(`${T}.name.text`)) && J(`${T}.name.x`) === Tb.x + 10 && J(`${T}.keyCap.text`) === keyE && J(`${T}.keyLabel.text`) === 'Attack' && J(`${T}.info.order.ok`) === true && J(`${T}.keyLabel.style.color`) === '#e8f6ff' && J(`${T}.keyLabel.y`) > Tb.y + Tb.h - K.line);
  g.run(`C.tgt = ''; C.fsel = W1.id; campTdispSync(S, 1400);`);
  check('a friendly picked instead (the enemy let go): the same box now shows the friendly, with the word "Guard" and the same key, in the friend\'s colour', J(`${T}.name.text`) === J('campTdispName(W1.unit)') && J(`${T}.keyLabel.text`) === 'Guard' && J(`${T}.keyCap.text`) === keyG && J(`${T}.info.order.ok`) === true && J(`${T}.g.log.some(l => l[0] === 'lineStyle' && l[2] === CAMP.tdisp.color.friend)`) && J(`${T}.pic.vis && ${T}.hullN.vis`));
  g.run(`campWing(C, 'fighter').forEach(u => { u.hp = 0; }); campTdispSync(S, 1900);`);
  check('no pilot out: the order cannot be given: the line is grey (the cap dim, the word grey)', J(`${T}.info.order.ok`) === false && J(`${T}.keyLabel.style.color`) === '#7f95a8' && J(`${T}.keyCap.style.color`) === '#9fb4c4' && J(`${T}.g.log.some(l => l[0] === 'fillStyle' && l[1] === 0x2a3b4c)`));
  g.run('__out()'); g.run('window.S = __scene()');
  g.run(`campPickOpen(P, { id: 'escort', pick: 'escort' }, campPickItems(C, 'escort')); campTdispSync(S, 3000);`);
  check('a friendly ship that an order\'s list is on shows in the box as before, and has no order line (the line is the target held\'s)', J(`${T}.side`) === 'friend' && J(`${T}.info.order`) === null && !J(`${T}.keyCap.vis`) && !J(`${T}.keyLabel.vis`));
  g.run(`P.pick = null; P.seen = null; window.P1 = campFriPlace(C, 'place:luna'); /* an outpost: held by a map click now, not in the O P cycle (card space-game-keys3-select) */ C.fsel = P1.id; campTdispSync(S, 4000);`);
  check('an outpost held: its name, "Friendly post" and how far; no picture, hull, shield or order it is on; the key line "Guard" is there', J(`${T}.name.text`) === J('P1.name') && J(`${T}.type.text`) === 'Friendly post' && J(`${T}.km.vis`) && !J(`${T}.pic.vis`) && !J(`${T}.hullN.vis`) && !J(`${T}.shN.vis`) && !J(`${T}.doing.vis`) && J(`${T}.keyLabel.text`) === 'Guard' && J(`${T}.keyCap.vis`));
  g.run(`C.fsel = campFriList(C).find(e => e.kind === 'ward').id; campTdispSync(S, 4500);`);
  check('and back to a ship: the picture, hull and order come back', J(`${T}.pic.vis && ${T}.hullN.vis && ${T}.doing.vis`) && !/post/i.test(J(`${T}.type.text`)));
  g.run(`campFriClear(C); campTdispSync(S, 5000);`);
  check('the target let go: the box goes (every text, the picture and the line hidden)', J(`[${T}.name, ${T}.type, ${T}.km, ${T}.hullN, ${T}.doing, ${T}.keyCap, ${T}.keyLabel].every(o => !o.vis) && !${T}.pic.vis`));
  g.run(`C.fsel = campFriList(C).find(e => e.kind === 'ward').id; campTdispSync(S, 5500); S.mp = {}; campTdispSync(S, 5600);`);
  check('the map open hides it, key line too', J(`!${T}.name.vis && !${T}.keyCap.vis && !${T}.keyLabel.vis`));
  g.run(`S.mp = null; campTdispSync(S, 5800); window.__c0 = ${T}.g.clears; campTdispSync(S, 5900); campTdispSync(S, 6000);`);
  check('a steady box costs nothing: not drawn again while nothing changes', J(`${T}.g.clears === __c0`));
  // open lists
  g.run(`campPanelGo(P, C, 'power'); S.pnl = { view: campPanelView(P, C) }; campTdispSync(S, 6500);`);
  check('the power list (right, five rows, to y 318) does not reach the target box (it starts at y ' + Tb.y + '): the box stays', J(`${T}.dx`) === 0);
  g.run(`campPanelClose(P); delete S.pnl; P.open = 'ship'; S.pnl = { view: { total: 11 } }; campTdispSync(S, 7000);`); // (the ship list is parked: no key opens it and it has few rows now, so the panel state and its eleven rows are set by hand to try the rule)
  const Sh = J(`(() => { const G = campPanelsGeometry(campPanelDef('ship'), S.pnl.view ? S.pnl.view.total : 0); return { x: G.x, y: G.y, w: G.w, h: G.h }; })()`), TNow = J(`campTdispBox(false, ${T}.dx)`);
  check('the ship list (right, eleven rows, to y 474) reaches it: the box steps left of the list, CAMP.tdisp.beside px from its edge, and they do not touch', Sh.y + Sh.h > Tb.y && J(`${T}.dx`) < 0 && TNow.x + TNow.w + K.beside === Sh.x, JSON.stringify([Sh, TNow]));
  g.run(`campPanelClose(P); delete S.pnl; campTdispSync(S, 7500);`);
  check('the list closes: the box goes back to its corner', J(`${T}.dx`) === 0 && J(`${T}.name.x`) === Tb.x + 10);
  check('a left list moves the who box and never the target box; a right list the target box and never the who box', J(`(() => { const L = { pn: Object.assign(campPanelNew(), { open: 'squads' }), pnl: null }, R = { pn: Object.assign(campPanelNew(), { open: 'ship' }), pnl: null }; return [campBoxDx(L, true) > 0, campBoxDx(L, false) === 0, campBoxDx(R, true) === 0, campBoxDx(R, false) < 0].every(Boolean); })()`));
  const scene = src('src/campaignscene.js');
  check('the scene calls the target display and the corner panels every frame (the who display is gone: card space-game-layout-fleet), in files that have their script tags', /campTdispSync\(this, this\.time\.now\);[^\n]*\n\s*if \(typeof campCornerSync === 'function'\) campCornerSync\(this, this\.time\.now\)/.test(scene) && /function campCornerSync\(/.test(src('src/campcornerscene.js')) && !/campFdispSync/.test(scene));
  check('the words: Attack, Guard and Friendly post are content (no bare key at run time) and the voice pack\'s tdisp family covers them', ['camp.tdisp.key.attack', 'camp.tdisp.key.guard', 'camp.tdisp.type.post'].every(k => J(`uiText(${JSON.stringify(k)})`) !== k) && /camp\\\.tdisp\\\./.test(src('src/voicepack.js')));
}

console.log('F. the square marker, and no rings');
{
  const html = src('index.html'), scene = src('src/campaignscene.js'), draw = src('src/camptargetdraw.js'), tds = src('src/camptdispscene.js');
  check('the target\'s function draws the square (campTgtCorners): the hostile, the friend picked and the fighters an order went to use the same one', /function campTgtCorners\(/.test(draw) && /campTgtCorners\(g, v, col, z, al\)/.test(draw) && /campTgtCorners\(sg, u, CAMPTGT\.friend/.test(scene));
  check('the friend\'s square is in a friendly colour that reads apart from the hostile\'s: green, not red', J('CAMPTGT.friend') !== J('CAMPTGT.color') && J('(CAMPTGT.friend >> 8) & 255') > J('(CAMPTGT.friend >> 16) & 255') && J('(CAMPTGT.color >> 16) & 255') > J('(CAMPTGT.color >> 8) & 255'));
  check('with All pilots picked all three pilots\' squares are drawn (campTgtPaint draws every ship WHO is: whoShips), and with one pilot picked that pilot\'s', /pk\.whoShips/.test(draw) && /campTgtCorners\(g, v, col, z, al\)/.test(draw));
  check('no coloured ring is left on a friendly ship: the scene has no squadCircle and strokes no circle round a fighter (the squad colours still colour the map\'s dots and the display\'s picture)', !/squadCircle/.test(scene) && /squadMarks\(\) \{/.test(scene) && !/campRing\(sg/.test(scene) && !/strokeCircle/.test(scene.slice(scene.indexOf('squadMarks() {'), scene.indexOf('  sync() {'))));
  check('the scene calls the corner panels right after the target display; there is no campFdispSync, no fdisp and no campFdispAll left', /function campCornerSync\(/.test(src('src/campcornerscene.js')) && !/campFdispSync|campFdispAll|CAMP_FDISP_ALL|hud\.fdisp/.test(scene + src('src/camptdispscene.js') + src('src/camptdisp.js')));
  check('the arrows\' keep list has the left corner\'s rectangle (a label is never put under the display)', J('CAMP.nav.arrow.keep.some(r => r[0] === 0 && r[1] === 430 && r[2] >= 218)'));
}

console.log(failed ? `\nFRIEND DISPLAY FAIL: ${failed} of ${n} checks failed` : `\nFRIEND DISPLAY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
