// smoke: the friend display in the bottom LEFT corner (the mirror of the target display): WHO A or D picked (All pilots by default), a pilot by its name, hull, shield and the order it is on; the square marker on friends; the coloured rings are gone (plain Node, no Chrome)
// Card space-game-friendly-display (Troy, 23 Nov 2026: "A and D work great. Just as the bottom right shows the selected enemy, show the selected friendly bottom left: same layout, with name (pilot name for Wedge, Kara, Apollo),
// hull and shield, and for a pilot the current order. Replace the coloured circles on friendlies with the same square marker used for the other targets"). The rule is src/camptdisp.js (campFdispSubject), the drawing is
// src/camptdispscene.js (campFdispSync: the same code as the target display, in the other corner) and the marker is src/camptargetdraw.js (campTgtCorners).
//   A. who is shown: All pilots with nothing picked (the default since card space-game-keys-select; a hostile target alone changes nothing here), a pilot, a ship you protect as the friendly is not who, a lost pilot is let go, X puts who back on All pilots
//   B. what is read: a pilot by its name (Wedge, Kara, Apollo), its hull, no shield, how far, the order it is on; a ship you protect by the name the lists give it
//   C. the box: the bottom left corner, the target display's size and height, inside a rectangle the edge arrows keep out of, and clear of the target display's box
//   D. the scene half on a stand-in: All pilots with nothing picked, one pilot shown when picked, in the friend's colour, on the left, both displays at once when a hostile and a friend are picked, hidden behind a card or the map
//   E. Q (all three pilots picked; card space-game-q-all-pilots-panel): the display says All pilots with a row for each pilot out, its name and its hull, and nothing else; back to one ship and away again
//   F. the square marker: the friend and the hostile and the fighters an order went to are all drawn by the one function; no ring is left in the scene; the scene calls the display every frame
//   G. an open left list (W, 7 rows to y 528) no longer covers the friend box: the box steps right of it while it is open, and back when it closes (card space-game-w-list-covers-friend-box)
//   H. the three boxes (card space-game-keys-panels): the friendly picked with , . is in its own box stacked above the enemy's, shown only when one is picked (an outpost too); the enemy's and the friendly's boxes have an order-key line at their foot, lit when the order can be given and grey when not
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

console.log('A. who is shown');
{
  g.run('__out()');
  check('nothing picked: All pilots is shown (the default: C.sel is all; the subject is no one ship but the three pilots out)', J(`(() => { const s = campFdispSubject(C); return !!s && s.u === null && s.side === 'friend' && s.all.length === 3; })()`) && J('C.sel') === 'all');
  g.run(`window.R1 = __foe(900, 0); C.tgt = R1.id;`);
  check('a hostile target alone changes nothing here (All pilots stays; the hostile is in the bottom right)', J(`campFdispSubject(C).all.length`) === 3 && J('campTdispSubject(C, P, 0).side') === 'hostile');
  g.run(`C.sel = 'pilot:red';`);
  const s1 = J(`(() => { const s = campFdispSubject(C); return s && { id: s.u.id, side: s.side, pilot: s.u.pilot }; })()`);
  check('a pilot picked (D): it is shown, as a friend, and it is the ship the selection gives (the squad\'s first)', s1 && s1.side === 'friend' && s1.id === J(`campSelUnits(C).who.id`) && s1.pilot === 'wedge', JSON.stringify(s1));
  g.run(`C.sel = 'all'; C.fsel = campFriList(C).find(e => e.kind === 'ward').id;`);
  const s2 = J(`(() => { const s = campFdispSubject(C); return s && { u: s.u, n: s.all && s.all.length, side: s.side }; })()`);
  check('a ship you protect picked as the friendly (comma, period) is not who: this display still says All pilots (the friendly has a box of its own: card space-game-keys-panels)', s2 && s2.u === null && s2.n === 3 && s2.side === 'friend' && J('C.fsel') !== '', JSON.stringify(s2));
  g.run(`C.fsel = ''; C.sel = 'pilot:yellow'; campWingShips(C, 'yellow').forEach(u => { u.hp = 0; });`);
  check('a pilot that is lost is let go: All pilots is shown again (two ships out)', J('campFdispSubject(C).all.length') === 2 && J('C.sel') === 'all');
  g.run(`__out(); C.sel = 'pilot:green'; campSelClear(C);`);
  check('X puts who back on All pilots: the three pilots are shown; no camp or a camp with no cruiser shows nothing', J('campFdispSubject(C).all.length') === 3 && J('campFdispSubject(null)') === null && J('campFdispSubject({})') === null);
}

console.log('B. what is read');
{
  g.run('__out()');
  g.run(`C.sel = 'pilot:red'; window.U = campSelUnits(C).who; window.I = campTdispInfo(C, U, 'friend');`);
  check('a pilot\'s ship has the pilot\'s name (Wedge), not "Fighter 3"; Kara and Apollo are the green and the yellow', J('I.name') === 'Wedge' && J(`(() => { C.sel = 'pilot:green'; const a = campTdispInfo(C, campSelUnits(C).who, 'friend').name; C.sel = 'pilot:yellow'; const b = campTdispInfo(C, campSelUnits(C).who, 'friend').name; return a + '|' + b; })()`) === 'Kara|Apollo');
  check('the hull is its own (now / max, a share), a fighter has no shield, and its distance is read', J('I.hull.now') === Math.ceil(J('U.hp')) && J('I.hull.max') >= J('I.hull.now') && J('I.shield') === null && /^[\d.]+$/.test(String(J('I.km'))));
  g.run(`U.repair = false; U.order = { type: 'guard' };`);
  check('and the order it is on: guard (the cruiser)', J('campTdispInfo(C, U, "friend").doing') === 'guarding the cruiser');
  g.run(`window.R1 = __foe(900, 0); U.order = { type: 'attack', target: R1.id };`);
  check('attack a named hostile: "attacking Raider N"', /^attacking Raider \d+$/.test(J('campTdispInfo(C, U, "friend").doing')), J('campTdispInfo(C, U, "friend").doing'));
  g.run(`U.order = { type: 'recall' };`);
  check('recall: "returning to the bay"', J('campTdispInfo(C, U, "friend").doing') === 'returning to the bay');
  g.run(`U.hp = U.maxHp / 2;`);
  check('hit: the hull number and its share follow', J('campTdispInfo(C, U, "friend").hull.share') > 0.45 && J('campTdispInfo(C, U, "friend").hull.share') < 0.55);
  g.run(`C.fsel = campFriList(C).find(e => e.kind === 'ward').id; window.W = C.by[C.fsel];`);
  check('a ship you protect keeps the name the lists give it (no pilot name)', J('campTdispInfo(C, W, "friend").name') === J('campTdispName(W)') && !['Wedge', 'Kara', 'Apollo'].includes(J('campTdispInfo(C, W, "friend").name')));
  check('a fighter with no pilot (an old save, a test ship) has the lists\' name as before', (g.run(`window.NP = campSpawn(C, 'fighter', C.carrier.x + 300, C.carrier.y); NP.team = 'earth'; delete NP.pilot;`), /^Fighter \d+$/.test(J('campTdispName(NP)'))));
}

console.log('C. the box');
{
  const R = J('campTdispBox()'), L = J('campTdispBox(true)'), K = J('CAMP.tdisp'), keep = J('CAMP.nav.arrow.keep');
  check('the friend display is in the bottom LEFT corner: its left edge ' + K.left + ' px from the edge, level with the target display at the bottom, 200 by 200 (the enemy\'s box is the order-key line taller)', L.x === K.left && L.y + L.h === R.y + R.h && L.w === R.w && L.h === 200 && R.h === 200 + K.line);
  check('it is the mirror of the target display: the same distance from the edge, the other side', L.x === 1280 - (R.x + R.w) && K.left === K.right);
  check('it is inside the rectangle the edge arrows keep out of, so no label is put on it', keep.some(r => L.x >= r[0] && L.y >= r[1] && L.x + L.w <= r[2] && L.y + L.h <= r[3]));
  check('it is clear of the target display\'s box and of the lines of text and the lists at the left top (they end at about y 262; the box starts below)', L.x + L.w < R.x && L.y > 262);
}

console.log('D. the scene half');
{
  g.run('__out()'); g.run('window.S = __scene()');
  g.run('campFdispSync(S, 0)');
  check('nothing picked: All pilots is drawn (the title and a row for each pilot), no picture is shown', J('S.hud.fdisp.name.text') === 'All pilots' && J('S.hud.fdisp.rows.filter(r => r.name.vis).length') === 3 && J('S.pics.every(p => !p.vis)'));
  g.run(`C.sel = 'pilot:red'; campFdispSync(S, 1000);`);
  const Bx = J('campTdispBox(true)');
  check('a pilot picked: the name is written, in the left box, with its hull and the order it is on', J('S.hud.fdisp.name.text') === 'Wedge' && J('S.hud.fdisp.name.x') === Bx.x + 10 && J('S.hud.fdisp.name.y') >= Bx.y && J('S.hud.fdisp.hullN.text') === J('campTdispInfo(C, campSelUnits(C).who, "friend").hull.now') + ' / ' + J('campTdispInfo(C, campSelUnits(C).who, "friend").hull.max') && J('S.hud.fdisp.doing.text') === 'guarding the cruiser' && J('S.hud.fdisp.shN.text') === 'no shield');
  check('every text and the picture are inside the left box', J('(() => { const B = campTdispBox(true), V = S.hud.fdisp; return [V.name, V.type, V.hullL, V.hullN, V.shL, V.shN, V.km, V.doing].every(o => o.vis && o.x >= B.x && o.x <= B.x + B.w && o.y >= B.y && o.y <= B.y + B.h) && V.pic.vis && V.pic.x > B.x && V.pic.x < B.x + B.w && V.pic.y > B.y && V.pic.y < B.y + B.h; })()'));
  check('the frame is drawn in the friend\'s colour, round the left box (a hostile\'s is red, in the other corner)', J(`S.hud.fdisp.g.log.some(l => l[0] === 'strokeRoundedRect' && l[1] === ${J('campTdispBox(true).x')})`) && J(`S.hud.fdisp.g.log.some(l => l[0] === 'lineStyle' && l[2] === CAMP.tdisp.color.friend)`) && !J(`S.hud.fdisp.g.log.some(l => l[0] === 'lineStyle' && l[2] === CAMP.tdisp.color.hostile)`));
  check('it is the ship\'s own art, as in the target display (its texture is set, a fighter in its squad\'s colour)', J('S.hud.fdisp.pic.tex') === 'tex-fighter' && J('S.hud.fdisp.pic.tint') === J('CAMP.wing.squadColor.red'));
  check('the target display (bottom right) is not made by it, and is still empty', !J('S.hud.tdisp'));
  g.run(`window.R1 = __foe(900, 0); C.tgt = R1.id; campTdispSync(S, 1000); campFdispSync(S, 1000);`);
  const T = J('campTdispBox()');
  check('a hostile and a friend picked: two displays, the hostile at the right and the friend at the left, each its own', J('S.hud.tdisp.name.x') === T.x + 10 && J('S.hud.fdisp.name.x') === Bx.x + 10 && /^Raider \d+$/.test(J('S.hud.tdisp.name.text')) && J('S.hud.fdisp.name.text') === 'Wedge');
  g.run(`C.sel = 'pilot:green'; campFdispSync(S, 1100);`);
  check('another friend picked: it is read at once (Kara), the hostile\'s display is as it was', J('S.hud.fdisp.name.text') === 'Kara' && /^Raider \d+$/.test(J('S.hud.tdisp.name.text')));
  g.run(`campPicksClear(C); campFdispSync(S, 1200);`);
  check('X puts who back on All pilots: the one ship\'s parts go (the picture, the numbers, the order), the title and three rows come back, and the hostile is let go with it', J('[S.hud.fdisp.type, S.hud.fdisp.hullL, S.hud.fdisp.hullN, S.hud.fdisp.shL, S.hud.fdisp.shN, S.hud.fdisp.km, S.hud.fdisp.doing].every(o => !o.vis)') && J('!S.hud.fdisp.pic.vis') && J('S.hud.fdisp.name.text') === 'All pilots' && J('S.hud.fdisp.rows.filter(r => r.name.vis).length') === 3 && J('C.tgt') === '');
  g.run(`C.sel = 'pilot:red'; campFdispSync(S, 1300); S.mode = 'won'; campFdispSync(S, 1400);`);
  check('a card or the map in front hides it, and it is there again after', J('!S.hud.fdisp.name.vis') && (g.run(`S.mode = 'play'; campFdispSync(S, 1500);`), J('S.hud.fdisp.name.vis')));
  g.run(`S.mp = {}; campFdispSync(S, 1600);`);
  check('the map open hides it too', J('!S.hud.fdisp.name.vis') && !J('S.hud.fdisp.pic.vis'));
  g.run(`S.mp = null; campFdispSync(S, 1700); window.__n0 = S.hud.fdisp.g.clears; campFdispSync(S, 1800); campFdispSync(S, 1900);`);
  check('a steady display costs nothing: the frame is not drawn again while nothing changes', J('S.hud.fdisp.g.clears === __n0'));
  g.run(`campSelUnits(C).who.hp -= 3; campFdispSync(S, 2100);`);
  check('a number that changes (a hit) draws the frame and bars again', J('S.hud.fdisp.g.clears') === J('__n0') + 1);
  check('a scene with no camp, or no graphics, is not an error', (() => { try { g.run('campFdispSync({}, 0); campFdispSync({ camp: C, hud: {} }, 0);'); return true; } catch (e) { return false; } })());
}

console.log('E. Q: all three pilots (card space-game-q-all-pilots-panel)');
{
  g.run('__out()'); g.run('window.S = __scene()');
  const Bx = J('campTdispBox(true)'), A = J('CAMP_FDISP_ALL');
  g.run(`campSelAll(C);`);
  const sub = J(`(() => { const s = campFdispSubject(C); return s && { u: s.u, side: s.side, n: s.all.length, names: s.all.map(u => campTdispName(u)).join() }; })()`);
  check('Q picked: the subject is no one ship but all three pilots out, as a friend', sub && sub.u === null && sub.side === 'friend' && sub.n === 3 && sub.names === 'Wedge,Kara,Apollo', JSON.stringify(sub));
  const inf = J(`(() => { const i = campFdispAllInfo(C, campFdispSubject(C).all); return { name: i.name, rows: i.rows.map(r => r.name + ' ' + r.hull.now + '/' + r.hull.max), key: i.key }; })()`);
  check('what it reads: the title "All pilots" and a row for each: the pilot\'s name and its hull now and at most', inf.name === 'All pilots' && inf.rows.length === 3 && /^Wedge \d+\/\d+$/.test(inf.rows[0]) && /^Kara /.test(inf.rows[1]) && /^Apollo /.test(inf.rows[2]), JSON.stringify(inf));
  g.run(`campFdispSync(S, 1000);`);
  const V = 'S.hud.fdisp';
  check('the title is where a ship\'s name goes (the box\'s top left), in the friend\'s ink', J(`${V}.name.text`) === 'All pilots' && J(`${V}.name.x`) === Bx.x + 10 && J(`${V}.name.y`) === Bx.y + 8 && J(`${V}.name.style.color`) === J('CAMP.tdisp.ink.friend'));
  check('three rows, one under the other: each pilot\'s name at the left and its hull numbers ("108 / 108") at the right', [0, 1, 2].every(i => J(`${V}.rows[${i}].name.vis`) && J(`${V}.rows[${i}].name.x`) === Bx.x + A.name && J(`${V}.rows[${i}].name.y`) === Bx.y + A.first + i * A.pitch && /^\d+ \/ \d+$/.test(J(`${V}.rows[${i}].num.text`)) && J(`${V}.rows[${i}].num.x`) === Bx.x + A.numRight) && J(`${V}.rows.map(r => r.name.text).join()`) === 'Wedge,Kara,Apollo');
  check('nothing else: no picture, type, shield, distance or order is shown', J(`!${V}.pic.vis && !${V}.type.vis && !${V}.hullL.vis && !${V}.hullN.vis && !${V}.shL.vis && !${V}.shN.vis && !${V}.km.vis && !${V}.doing.vis`));
  check('every row is inside the box, and the last row\'s bar ends above its bottom edge', J(`${V}.rows.every(r => r.name.x >= ${Bx.x} && r.num.x <= ${Bx.x + Bx.w} && r.name.y >= ${Bx.y} && r.num.y + 14 <= ${Bx.y + Bx.h})`) && Bx.y + A.first + 2 * A.pitch + A.bar.dy + A.bar.h < Bx.y + Bx.h);
  const bars = J(`${V}.g.log.filter(l => l[0] === 'fillRect' && l[3] === ${A.bar.w})`);
  check('a hull bar under each name, the box\'s width less its edges (its ground and its fill: two rectangles each), the frame in the friend\'s colour', bars.length === 6 && J(`${V}.g.log.some(l => l[0] === 'lineStyle' && l[2] === CAMP.tdisp.color.friend)`) && J(`${V}.g.log.some(l => l[0] === 'strokeRoundedRect')`));
  g.run(`window.__n0 = ${V}.g.clears; campFdispSync(S, 1100); campFdispSync(S, 1200);`);
  check('a steady display costs nothing: the frame is not drawn again while nothing changes', J(`${V}.g.clears === __n0`));
  g.run(`campWing(C, 'fighter').filter(u => u.pilot === 'kara')[0].hp -= 10; campFdispSync(S, 1500);`);
  check('a hit on one pilot: its numbers change and the frame and bars are drawn again', J(`${V}.g.clears`) === J('__n0') + 1 && J(`${V}.rows[1].num.text`) === J(`(() => { const u = campWing(C, 'fighter').filter(u => u.pilot === 'kara')[0], h = campTdispHull(u); return h.now + ' / ' + h.max; })()`));
  g.run(`campWing(C, 'fighter').filter(u => u.pilot === 'wedge').forEach(u => { u.hp = 0; }); campFdispSync(S, 1800);`);
  check('a pilot lost: its row goes (two rows are left: Kara and Apollo) and the third row\'s texts are hidden', J(`${V}.rows.filter(r => r.name.vis).length`) === 2 && J(`${V}.rows[0].name.text`) === 'Kara' && J(`${V}.rows[1].name.text`) === 'Apollo' && !J(`${V}.rows[2].name.vis`) && !J(`${V}.rows[2].num.vis`));
  g.run(`campWing(C, 'fighter').forEach(u => { u.hp = 0; }); campFdispSync(S, 2100);`);
  check('no pilot out: the title alone, no row', J(`${V}.name.text`) === 'All pilots' && J(`${V}.name.vis`) && J(`${V}.rows.every(r => !r.name.vis && !r.num.vis)`));
  g.run('__out()'); g.run('window.S = __scene()');
  g.run(`campSelAll(C); campFdispSync(S, 3000); C.sel = 'pilot:green'; campFdispSync(S, 3100);`);
  check('then one pilot picked (D): the rows go and the one ship\'s display is there again, its picture and order too', J(`${V}.rows.every(r => !r.name.vis && !r.num.vis)`) && J(`${V}.name.text`) === 'Kara' && J(`${V}.pic.vis`) && J(`${V}.doing.vis`) && J(`${V}.pic.tex`) === 'tex-fighter' && J(`${V}.hullN.vis`));
  g.run(`campSelAll(C); campFdispSync(S, 3400);`);
  check('and Q again: the one ship\'s parts go, the rows are back, and the picture is set again for the next ship picked', J(`!${V}.pic.vis && !${V}.doing.vis && !${V}.hullN.vis`) && J(`${V}.rows.filter(r => r.name.vis).length`) === 3 && J(`${V}.kind`) === '');
  g.run(`C.sel = 'pilot:red'; campFdispSync(S, 3600); campPicksClear(C); campFdispSync(S, 3700);`);
  check('X puts who back on All pilots: the one ship\'s parts go and the title and the three rows are shown (All pilots is the default, never hidden)', J(`${V}.name.text`) === 'All pilots' && J(`${V}.rows.filter(r => r.name.vis).length`) === 3 && J(`!${V}.pic.vis && !${V}.doing.vis`));
  g.run(`campSelAll(C); campFdispSync(S, 4000); S.mp = {}; campFdispSync(S, 4100);`);
  check('the map open hides it, rows too', J(`!${V}.name.vis && ${V}.rows.every(r => !r.name.vis && !r.num.vis)`));
  g.run(`S.mp = null; campFdispSync(S, 4400);`);
  check('and it is back when the map closes', J(`${V}.name.vis && ${V}.rows.filter(r => r.name.vis).length === 3`));
  g.run(`window.R1 = __foe(900, 0); C.tgt = R1.id; campTdispSync(S, 4500);`);
  check('a hostile picked as well: its display is in the other corner as ever (Q does not touch the target display)', /^Raider \d+$/.test(J('S.hud.tdisp.name.text')) && J('S.hud.tdisp.name.x') === J('campTdispBox().x') + 10 && J(`${V}.name.text`) === 'All pilots');
  check('the words are the key camp.sel.all (campkeys.md) and the display adds none of its own', J(`uiText('camp.sel.all')`) === 'All pilots' && !/uiText\('camp\.[a-z.]+'/.test(readFileSync(new URL('../src/camptdispscene.js', import.meta.url), 'utf8').split('card space-game-q-all-pilots-panel')[1].replace(/uiText\('camp\.tdisp\.[a-z.]+'/g, '')));
}

console.log('G. an open list and the friend box (card space-game-w-list-covers-friend-box)');
{
  g.run('__out()'); g.run('window.S = __scene()');
  g.run(`window.__hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; window.__open = id => { campPanelGo(P, C, id); S.pnl = { view: campPanelView(P, C) }; const d = campPanelDef(id); return campPanelsGeometry(d, S.pnl.view ? S.pnl.view.total : 0); };`);
  g.run(`C.sel = 'pilot:red'; campFdispSync(S, 1000);`);
  const home = J('campTdispBox(true)'), V = 'S.hud.fdisp';
  check('no list open: the box is in its corner', J(`${V}.dx`) === 0 && J(`${V}.name.x`) === home.x + 10);
  const W = J(`(() => { const G = __open('squads'); return { x: G.x, y: G.y, w: G.w, h: G.h, n: G.n }; })()`);
  check('the W list is the card\'s case: seven rows, down past the top of the corner box (so it covers it where it stands)', W.n === 7 && W.y + W.h > home.y && W.x < home.x + home.w, JSON.stringify([W, home]));
  g.run(`window.__c0 = ${V}.g.clears; campFdispSync(S, 1100);`);
  const sh = J(`campTdispBox(true, ${V}.dx)`);
  check('with the W list open the box steps right of it, CAMP.tdisp.beside px from its edge, at the same height', J(`${V}.dx`) === W.x + W.w + J('CAMP.tdisp.beside') - home.x && sh.x === W.x + W.w + J('CAMP.tdisp.beside') && sh.y === home.y, JSON.stringify([sh, W]));
  check('so the list and the box do not touch: both show', !J(`__hit(${JSON.stringify(W)}, ${JSON.stringify(sh)})`) && sh.x + sh.w <= 1280);
  check('its name and its picture are in the box where it is now, and the frame and bars were drawn again there', J(`${V}.name.x`) === sh.x + 10 && J(`${V}.pic.x`) > sh.x && J(`${V}.pic.x`) < sh.x + sh.w && J(`${V}.g.clears`) === J('__c0') + 1);
  g.run(`window.__c1 = ${V}.g.clears; campFdispSync(S, 1200); campFdispSync(S, 1300);`);
  check('a steady frame with the list open costs nothing (the box is not drawn again while it stays there)', J(`${V}.g.clears`) === J('__c1'));
  g.run(`campPanelClose(P); delete S.pnl; campFdispSync(S, 1400);`);
  check('the list closes: the box goes back to its corner, drawn again there', J(`${V}.dx`) === 0 && J(`${V}.name.x`) === home.x + 10 && J(`${V}.g.clears`) === J('__c1') + 1);
  const Cv = J(`(() => { const G = __open('convoy'); return { x: G.x, y: G.y, w: G.w, h: G.h, n: G.n }; })()`);
  g.run(`campFdispSync(S, 1500);`);
  check('a short list (the convoy\'s, four rows, ending above the box) does not move it', Cv.y + Cv.h <= home.y && J(`${V}.dx`) === 0, JSON.stringify([Cv, home]));
  g.run(`campPanelClose(P); delete S.pnl; __open('ship'); campFdispSync(S, 1600);`);
  check('a right list (the ship list) never reaches this corner: the box stays', J(`${V}.dx`) === 0);
  g.run(`campPanelClose(P); delete S.pnl;`);
  const full = J(`(() => { const out = {}; CAMP_PANELS.panels.filter(d => d.side !== 'right').forEach(d => { const G = campPanelsGeometry(d), B = campTdispBox(true), dx = campBoxDx({ pn: Object.assign(campPanelNew(), { open: d.id }), pnl: null }, true, false), A = campTdispBox(true, dx); out[d.id] = { hits: __hit(G, B), dx, clear: !__hit(G, A), inside: A.x + A.w <= 1280 }; }); return out; })()`);
  check('every left list at its full height, with the box where it would put it: no overlap, and on the screen', Object.values(full).every(r => r.clear && r.inside) && Object.keys(full).length >= 3, JSON.stringify(full));
  check('and the ones that reach the corner are the ones that move it (the ones that do not leave it alone)', Object.values(full).every(r => r.hits === (r.dx !== 0)), JSON.stringify(full));
  g.run(`C.sel = 'all'; __open('squads'); campFdispSync(S, 2000);`);
  const shAll = J(`campTdispBox(true, ${V}.dx)`);
  check('Q (all pilots) steps right of the open list too, rows and title with it', J(`${V}.dx`) !== 0 && J(`${V}.name.x`) === shAll.x + 10 && J(`${V}.rows[0].name.x`) === shAll.x + J('CAMP_FDISP_ALL.name') && J(`${V}.rows[0].num.x`) === shAll.x + J('CAMP_FDISP_ALL.numRight'));
  check('the scene\'s own panel view is read (the stand-in has none: the full height is taken); the numbers are in the table with their comments', /s\.pnl && s\.pnl\.view \? s\.pnl\.view\.total : 0/.test(readFileSync(new URL('../src/camptdispscene.js', import.meta.url), 'utf8')) && /beside: 12, +\/\/ px between an open list/.test(readFileSync(new URL('../src/campaign.js', import.meta.url), 'utf8')));
}

console.log('H. the three boxes and the order-key lines (card space-game-keys-panels)');
{
  g.run('__out()'); g.run('window.S = __scene()');
  const K = J('CAMP.tdisp'), En = J('campTdispBox()'), Fr = J('campTdispBox(false, 0, true)'), Wh = J('campTdispBox(true)'), keep = J('CAMP.nav.arrow.keep');
  check('the friendly\'s box is stacked just above the enemy\'s (CAMP.tdisp.stack px between them), in the same column, the same size', Fr.x === En.x && Fr.w === En.w && Fr.h === En.h && Fr.y + Fr.h + K.stack === En.y, JSON.stringify([Fr, En]));
  check('the enemy\'s and the friendly\'s boxes both end at or after the who box\'s height of 200 + the key line, the who box has no line', En.h === 200 + K.line && Fr.h === 200 + K.line && Wh.h === 200);
  check('both right boxes are inside a rectangle the edge arrows keep out of, and none of the three boxes touches another', [En, Fr, Wh].every(b => keep.some(r => b.x >= r[0] && b.y >= r[1] && b.x + b.w <= r[2] && b.y + b.h <= r[3])) && !J(`[[${JSON.stringify(Fr)}, ${JSON.stringify(En)}], [${JSON.stringify(Wh)}, ${JSON.stringify(En)}], [${JSON.stringify(Wh)}, ${JSON.stringify(Fr)}]].some(([a, b]) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)`));
  check('no friendly picked: nothing is shown in its box', J('campGdispSubject(C)') === null && J('campGdispSubject(null)') === null && J('campGdispSubject({})') === null);
  g.run(`window.W1 = campFriList(C).find(e => e.kind === 'ward'); window.P1 = campFriList(C).find(e => e.kind === 'post'); C.fsel = W1.id;`);
  const sub = J(`(() => { const s = campGdispSubject(C); return s && { id: s.u.id, side: s.side }; })()`);
  check('a ship you protect picked with , .: its box shows it, as a friend', sub && sub.id === J('W1.id') && sub.side === 'friend', JSON.stringify(sub));
  g.run(`C.fsel = P1.id;`);
  const post = J(`(() => { const s = campGdispSubject(C); return s && { u: s.u, post: s.post.name, side: s.side }; })()`);
  check('an outpost picked: its box shows it (no unit, the outpost\'s name)', post && post.u === null && post.post === J('P1.name') && post.side === 'friend', JSON.stringify(post));
  g.run(`C.fsel = W1.id; campFdispSync(S, 1000); campTdispSync(S, 1000); campGdispSync(S, 1000);`);
  const V = 'S.hud.gdisp';
  check('the friendly\'s box is drawn in its own place: its name, type, hull and distance are written inside the stacked box', J(`${V}.name.text`) === J('campTdispName(W1.unit)') && J(`${V}.name.x`) === Fr.x + 10 && J(`${V}.name.y`) === Fr.y + 8 && /^Friendly /.test(J(`${V}.type.text`)) && J(`${V}.hullN.vis`) && J(`${V}.km.vis`) && J(`${V}.pic.vis`));
  check('the enemy\'s box and the who box are still there: the who box says All pilots, the enemy\'s is empty with no enemy picked', J('S.hud.fdisp.name.text') === 'All pilots' && !J('S.hud.tdisp && S.hud.tdisp.name.vis'));
  const key = J('CAMP_KEYS.guard.k'), keyA = J('CAMP_KEYS.attack.k');
  check('its foot has the order-key line: the key from the key table and the word, "Guard"', J(`${V}.keyCap.text`) === key && J(`${V}.keyLabel.text`) === 'Guard' && J(`${V}.keyCap.vis && ${V}.keyLabel.vis`) && J(`${V}.keyLabel.y`) > Fr.y + Fr.h - K.line && J(`${V}.keyLabel.x`) > Fr.x);
  check('the order can be given (the pilots are out): the line is lit: the cap is filled in the box\'s colour and the word is bright', J(`${V}.info.order.ok`) === true && J(`${V}.keyLabel.style.color`) === '#e8f6ff' && J(`${V}.g.log.some(l => l[0] === 'fillStyle' && l[1] === CAMP.tdisp.color.friend)`) && J(`${V}.keyCap.style.color`) === '#02101c');
  g.run(`campWing(C, 'fighter').forEach(u => { u.hp = 0; }); campGdispSync(S, 1500);`);
  check('no pilot out: the order cannot be given: the line is grey (the cap dim, the word grey)', J(`${V}.info.order.ok`) === false && J(`${V}.keyLabel.style.color`) === '#7f95a8' && J(`${V}.keyCap.style.color`) === '#9fb4c4' && J(`${V}.g.log.some(l => l[0] === 'fillStyle' && l[1] === 0x2a3b4c)`) && !J(`${V}.g.log.some(l => l[0] === 'fillStyle' && l[1] === CAMP.tdisp.color.friend && l[2] === 0.95)`));
  g.run('__out()'); g.run('window.S = __scene()');
  g.run(`window.R1 = __foe(900, 0); C.tgt = R1.id; campTdispSync(S, 2000);`);
  const T = 'S.hud.tdisp';
  check('an enemy picked: the enemy\'s box has the line too: its key and "Attack", lit with the pilots out', J(`${T}.keyCap.text`) === keyA && J(`${T}.keyLabel.text`) === 'Attack' && J(`${T}.info.order.ok`) === true && J(`${T}.keyCap.vis`) && J(`${T}.name.x`) === En.x + 10);
  g.run(`campWing(C, 'fighter').forEach(u => { u.hp = 0; }); campTdispSync(S, 2500);`);
  check('no pilot out: the enemy\'s line is grey', J(`${T}.info.order.ok`) === false && J(`${T}.keyLabel.style.color`) === '#7f95a8');
  g.run('__out()'); g.run('window.S = __scene()');
  g.run(`campPickOpen(P, { id: 'escort', pick: 'escort' }, campPickItems(C, 'escort')); campTdispSync(S, 3000);`);
  check('a friendly ship that an order\'s list is on shows in the enemy\'s box as before, and has no order line there (the line is the enemy\'s)', J(`${T}.side`) === 'friend' && J(`${T}.info.order`) === null && !J(`${T}.keyCap.vis`) && !J(`${T}.keyLabel.vis`));
  g.run(`P.pick = null; P.seen = null; window.P1 = campFriList(C).find(e => e.kind === 'post'); C.fsel = P1.id; campGdispSync(S, 4000);`);
  check('an outpost in the friendly\'s box: its name, "Friendly post" and how far; no picture, hull, shield or order it is on; the key line is there', J(`${V}.name.text`) === J('P1.name') && J(`${V}.type.text`) === 'Friendly post' && J(`${V}.km.vis`) && !J(`${V}.pic.vis`) && !J(`${V}.hullN.vis`) && !J(`${V}.shN.vis`) && !J(`${V}.doing.vis`) && J(`${V}.keyLabel.text`) === 'Guard' && J(`${V}.keyCap.vis`));
  g.run(`C.fsel = campFriList(C).find(e => e.kind === 'ward').id; campGdispSync(S, 4500);`);
  check('and back to a ship: the picture, hull and order come back', J(`${V}.pic.vis && ${V}.hullN.vis && ${V}.doing.vis`) && !/post/i.test(J(`${V}.type.text`)));
  g.run(`campFriClear(C); campGdispSync(S, 5000);`);
  check('X lets the friendly go: its box goes (every text, the picture and the line hidden)', J(`[${V}.name, ${V}.type, ${V}.km, ${V}.hullN, ${V}.doing, ${V}.keyCap, ${V}.keyLabel].every(o => !o.vis) && !${V}.pic.vis`));
  g.run(`C.fsel = campFriList(C).find(e => e.kind === 'ward').id; campGdispSync(S, 5500); S.mp = {}; campGdispSync(S, 5600);`);
  check('the map open hides it, key line too', J(`!${V}.name.vis && !${V}.keyCap.vis && !${V}.keyLabel.vis`));
  g.run(`S.mp = null; campGdispSync(S, 5800); window.__c0 = ${V}.g.clears; campGdispSync(S, 5900); campGdispSync(S, 6000);`);
  check('a steady box costs nothing: not drawn again while nothing changes', J(`${V}.g.clears === __c0`));
  // an open right list
  g.run(`campPanelGo(P, C, 'power'); S.pnl = { view: campPanelView(P, C) }; campGdispSync(S, 6500); campTdispSync(S, 6500);`);
  const Pw = J(`(() => { const G = campPanelsGeometry(campPanelDef('power'), S.pnl.view.total); return { x: G.x, y: G.y, w: G.w, h: G.h }; })()`), FrNow = J(`campTdispBox(false, ${V}.dx, true)`);
  check('the power list (right, five rows, to y 318) would cover the friendly\'s box: the box steps left of it, CAMP.tdisp.beside px from its edge, and they do not touch', Pw.y + Pw.h > Fr.y && J(`${V}.dx`) < 0 && FrNow.x + FrNow.w + K.beside === Pw.x && !J(`(${JSON.stringify(Pw)}.x < ${FrNow.x + FrNow.w} && ${JSON.stringify(Pw)}.x + ${Pw.w} > ${FrNow.x})`), JSON.stringify([Pw, FrNow]));
  check('the enemy\'s box, below the list, stays; the who box (a right list never reaches it) stays', J('!S.hud.tdisp || S.hud.tdisp.dx === 0') && J('!S.hud.fdisp || !S.hud.fdisp.dx'));
  g.run(`campPanelClose(P); delete S.pnl; campGdispSync(S, 7000);`);
  check('the list closes: the friendly\'s box goes back to its column', J(`${V}.dx`) === 0 && J(`${V}.name.x`) === Fr.x + 10);
  check('a left list moves the who box and never the right ones; a right list the right ones and never the who box', J(`(() => { const L = { pn: Object.assign(campPanelNew(), { open: 'squads' }), pnl: null }, R = { pn: Object.assign(campPanelNew(), { open: 'power' }), pnl: null }; return [campBoxDx(L, true, false) > 0, campBoxDx(L, false, true) === 0, campBoxDx(L, false, false) === 0, campBoxDx(R, true, false) === 0, campBoxDx(R, false, true) < 0].every(Boolean); })()`));
  const html = src('index.html'), scene = src('src/campaignscene.js');
  check('the scene calls the three displays every frame, in the one file (no new script)', /campTdispSync\(this, this\.time\.now\);[^\n]*\n\s*if \(typeof campFdispSync === 'function'\) campFdispSync\(this, this\.time\.now\);[^\n]*\n\s*if \(typeof campGdispSync === 'function'\) campGdispSync\(this, this\.time\.now\)/.test(scene) && /function campGdispSync\(/.test(src('src/camptdispscene.js')));
  check('the words: Attack, Guard and Friendly post are content (no bare key at run time) and the voice pack\'s tdisp family covers them', ['camp.tdisp.key.attack', 'camp.tdisp.key.guard', 'camp.tdisp.type.post'].every(k => J(`uiText(${JSON.stringify(k)})`) !== k) && /camp\\\.tdisp\\\./.test(src('src/voicepack.js')));
}

console.log('F. the square marker, and no rings');
{
  const html = src('index.html'), scene = src('src/campaignscene.js'), draw = src('src/camptargetdraw.js'), tds = src('src/camptdispscene.js');
  check('the target\'s function draws the square (campTgtCorners): the hostile, the friend picked and the fighters an order went to use the same one', /function campTgtCorners\(/.test(draw) && /campTgtCorners\(g, v, col, z, al\)/.test(draw) && /campTgtCorners\(sg, u, CAMPTGT\.friend/.test(scene));
  check('the friend\'s square is in a friendly colour that reads apart from the hostile\'s: green, not red', J('CAMPTGT.friend') !== J('CAMPTGT.color') && J('(CAMPTGT.friend >> 8) & 255') > J('(CAMPTGT.friend >> 16) & 255') && J('(CAMPTGT.color >> 16) & 255') > J('(CAMPTGT.color >> 8) & 255'));
  check('no coloured ring is left on a friendly ship: the scene has no squadCircle and strokes no circle round a fighter (the squad colours still colour the map\'s dots and the display\'s picture)', !/squadCircle/.test(scene) && /squadMarks\(\) \{/.test(scene) && !/campRing\(sg/.test(scene) && !/strokeCircle/.test(scene.slice(scene.indexOf('squadMarks() {'), scene.indexOf('  sync() {'))));
  check('the scene calls the friend display every frame, right after the target display, and the file is the same one (no new script)', /campTdispSync\(this, this\.time\.now\);[^\n]*\n\s*if \(typeof campFdispSync === 'function'\) campFdispSync\(this, this\.time\.now\)/.test(scene) && /function campFdispSync\(/.test(tds));
  check('the arrows\' keep list has the left corner\'s rectangle (a label is never put under the display)', J('CAMP.nav.arrow.keep.some(r => r[0] === 0 && r[1] === 450 && r[2] >= 218)'));
  check('every number is in the table: the left edge has its comment', /left: 18, +\/\/ px from the left edge to the friend display/.test(src('src/campaign.js')));
}

console.log(failed ? `\nFRIEND DISPLAY FAIL: ${failed} of ${n} checks failed` : `\nFRIEND DISPLAY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
