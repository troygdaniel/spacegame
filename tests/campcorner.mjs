// smoke: the corner panels (card space-game-layout-fleet): a title with its key chips that never leaves, the selection beside it that never fades, details that open when the keys are used and fade, a reopen hook; Q W FLEET at the bottom left
// Troy, 24 Nov 2026, agreed bite by bite from his screenshot: FOUR CORNERS, each a small title that never leaves, starting with its keys as plain key-cap chips: top left S CRUISER, bottom left Q W FLEET, top right [ ] HOSTILES, bottom right O P FRIENDLIES. The details open when its keys are used and fade; the selection is written beside the title and never fades. The rule and the registry are src/campcorner.js, the drawing src/campcornerscene.js, the numbers CAMP.corner.
//   A  the table and the words: the numbers with their comments, the four places, the four titles
//   B  the registry: a corner is added once (by id), its chips are its keys' caps, the selection and the title are read; a corner from another card (a stand-in here) works the same
//   C  FLEET: the selection is All pilots or the one pilot; closed, no details; Q or W (any key of the corner) opens the details: a name and a hull bar for each pilot; they stay 4 s, fade over 0.6 s, then go; the selection and the title stay
//   D  the reopen hook (campCornerOpen, with its own time) and the hit: a pilot's hull going down brings the details back by themselves for 4 s
//   E  where: the title row and the details' frame (open upward from the bottom, downward from the top); the MISSILES count is clear of it
//   F  the drawing on a stand-in scene: the chips, the title and the selection are always shown; the details only while open, fading; nothing behind a card or the map; an open left list moves the corner
//   H  the alignment (card space-game-layout-align): the top pair level, the margins mirrored, one chip column in every corner, a long selection cut with an ellipsis
//   G  the who box is gone: no fdisp, no campFdispSync, the scene calls campCornerSync and the keys hook; the script tags are in index.html
// Run: node tests/campcorner.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
g.run(`CAMP_CORNERS.splice(0, CAMP_CORNERS.length, ...CAMP_CORNERS.filter(d => d.id === 'fleet' || d.id === 'cruiser'));`); // this suite is the panel with FLEET, S CRUISER (card space-game-layout-cruiser, src/campcruiserhud.js) and the probe it adds: the target corners other cards register (HOSTILES, FRIENDLIES: tests/campcorners.mjs) are not in this world
g.run(`window.__CRUISER = campCornerDef('cruiser');`);

g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; C.t = 1000; return C; }; // the three pilots are out beside the cruiser
  window.__N = () => campCornerNow(C, 'fleet');
  window.__at = ms => { C.t = ms; return campCornerNow(C, 'fleet'); };
  // a stand-in scene: graphics and texts that remember what was done to them
  window.__scene = (extra) => {
    const mkG = () => { const o = { clears: 0, log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
    const objs = [], mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, alpha: 1, style: { color: '#ffffff' }, width: 60, height: 14 }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setAlpha = v => { o.alpha = v; return o; }; objs.push(o); return o; };
    return window.S = Object.assign({ objs, camp: C, pn: campPanelNew(), mode: 'play', hud: {}, add: { graphics: mkG, text: mkT } }, extra || {});
  };
  window.__shown = () => S.objs.filter(o => o.vis).map(o => o.text);
`);

// ---- A. the table and the words ----
console.log('A. the table and the words');
const camp = src('src/campaign.js');
check('CAMP.corner: 320 wide (room for the FLEET line, FRIENDLIES and a name beside it: cards space-game-layout-align and space-game-fleet-sentence); details open 4 s after the keys, 4 s after a hit, fade over 600 ms', J('CAMP.corner.w') === 320 && J('CAMP.corner.show') === 4000 && J('CAMP.corner.hit') === 4000 && J('CAMP.corner.fade') === 600);
check('the four corners have a place each, STACKED at the top (card space-game-keys5-corners): Q CRUISER at 78 and W FLEET under it, ] HOSTILES at 78 and [ FRIENDLIES under it (row 26 + stack 6), every one opening downward', J('Object.keys(CAMP.corner.at).join()') === 'tl,bl,tr,br' && ['tl', 'bl', 'tr', 'br'].every(c => J(`CAMP.corner.at.${c}.dir`) === 1) && J('CAMP.corner.at.tl.y') === 78 && J('CAMP.corner.at.tr.y') === 78 && J('CAMP.corner.at.bl.y') === J('CAMP.corner.at.tl.y + CAMP.corner.title.h + CAMP.corner.stack') && J('CAMP.corner.at.br.y') === J('CAMP.corner.at.bl.y') && J('CAMP.corner.stack') === 6 && J('CAMP.corner.radio') === 70);
check('every number has its comment in the table', /show: 4000, +\/\/ ms/.test(camp) && /hit: 4000, +\/\/ ms/.test(camp) && /fade: 600, +\/\/ ms/.test(camp) && /w: 320, +\/\/ px: a panel/.test(camp) && /edge: 18, +\/\/ px: THE margin/.test(camp) && /ink: 2, +\/\/ px: a text/.test(camp) && /at: \{ +\/\/ where each corner/.test(camp));
check('the four titles and the pilot-in-the-bay word are content, not bare keys', J(`uiText('camp.corner.cruiser')`) === 'CRUISER' && J(`uiText('camp.corner.fleet')`) === 'FLEET' && J(`uiText('camp.corner.hostiles')`) === 'HOSTILES' && J(`uiText('camp.corner.friendlies')`) === 'FRIENDLIES' && J(`uiText('camp.corner.bay')`) === 'in the bay');

// ---- B. the registry ----
console.log('B. the registry');
g.run(`__new();`);
check('FLEET is registered: the second row of the left stack, key W (the chip is its cap), the title\'s words, and it draws the fleet pick as its details', J('campCornerDef("fleet").at') === 'bl' && J('__N().chips').join() === 'W' && J('__N().title') === 'FLEET' && J('campCornerDef("fleet").list') === 'fleet' && J('campCornerDrawsList("fleet")') === true && J('campCornerDrawsList("cruiser")') === false);
g.run(`window.__n0 = CAMP_CORNERS.length; campCornerAdd({ id: 'probe', at: 'tr', keys: ['friendlies', 'hostiles', { cap: 'S', codes: ['KeyS'] }], title: 'camp.corner.hostiles', selection: C => 'Raider 9', rows: C => [{ kind: 'bar', name: 'Raider 9', num: '30 / 40', share: 0.75, color: 0xffb454 }, { kind: 'text', text: 'attacking Kara' }, { kind: 'key', cap: 'E', label: 'Attack', ok: true }] }); window.__n1 = CAMP_CORNERS.length; campCornerAdd({ id: 'probe', at: 'tr', keys: [], title: 'camp.corner.hostiles' }); window.__n2 = CAMP_CORNERS.length;`);
check('a corner another card adds: added once, added again by the same id it is replaced, not doubled', J('__n1') === J('__n0') + 1 && J('__n2') === J('__n1'));
g.run(`campCornerAdd({ id: 'probe', at: 'tr', keys: ['friendlies', 'hostiles', { cap: 'S', codes: ['KeyS'] }], title: 'camp.corner.hostiles', selection: C => 'Raider 9', rows: C => [{ kind: 'bar', name: 'Raider 9', num: '30 / 40', share: 0.75, color: 0xffb454 }, { kind: 'text', text: 'attacking Kara' }, { kind: 'key', cap: 'E', label: 'Attack', ok: true }] });`);
check('its chips are the table\'s keys ([ and ]) and the one that is not in the table (S), in order', J('campCornerNow(C, "probe").chips').join() === '[,],S' && J('campCornerNow(C, "probe").selection') === 'Raider 9' && J('campCornerNow(C, "probe").at') === 'tr');
check('its keys open it, the one outside the table too (KeyS), and no other key does', (() => { g.run(`C.t = 1000; campCornerKey(C, 'KeyA')`); const a = J('campCornerNow(C, "probe").open'); g.run(`campCornerKey(C, 'KeyS')`); const b = J('campCornerNow(C, "probe").items.length'); return a === 0 && b === 3; })());
check('the items it returns pass through as they are (a bar, a line of text, a key chip), their heights add up', J('campCornerItemsH(campCornerNow(C, "probe").items)') === J('CAMP.corner.item.bar + CAMP.corner.item.text + CAMP.corner.item.key'));
check('a corner with no selection and no rows is fine (the title row alone): nothing throws', J('(() => { campCornerAdd({ id: "bare", at: "tl", keys: [], title: "camp.corner.cruiser" }); const r = campCornerNow(C, "bare"); CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === "bare"), 1); return r.selection === "" && r.items.length === 0 && r.chips.length === 0; })()'));
g.run(`CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === 'probe'), 1);`);

// ---- C. FLEET ----
console.log('C. FLEET');
g.run(`__new();`);
check('the selection is All pilots by default, and it is a line of the corner, not of its details', J('__N().selection') === 'All pilots' && J('__N().open') === 0 && J('__N().items.length') === 0);
g.run(`campSelStep(C, 1);`);
check('with one pilot picked the selection is that pilot\'s call sign and name', J('C.sel') === 'pilot:red' && J('__N().selection') === 'Red 1 Wedge');
g.run(`C.sel = 'pilot:green';`);
check('the selection follows the pick: Red 2 Kara', J('__N().selection') === 'Red 2 Kara');
g.run(`C.sel = 'all'; C.t = 10000;`);
check('closed: no details until a key of the corner is used', J('__N().open') === 0 && J('__N().items.length') === 0);
g.run(`campCornerKey(C, 'KeyW');`);
const o1 = J('__N()');
check('W opens the details: the fleet pick\'s rows, numbered: 1 Red 1 Wedge, 2 Red 2 Kara, 3 Red 3 Apollo, each a bar with its hull numbers (hull now / max) and a digit chip, then the key rows (All pilots, and what the pick has after it)', o1.open === 1 && o1.items.length === J(`campPanelList(C, 'fleet').length`) && o1.items.slice(0, 3).map(i => i.name).join() === 'Red 1 Wedge,Red 2 Kara,Red 3 Apollo' && o1.items.slice(0, 3).every(i => i.kind === 'bar' && /^\d+ \/ \d+$/.test(i.num) && i.share > 0 && i.share <= 1) && o1.items.map(i => i.cap).join() === o1.items.map((x, i) => String(i + 1)).join() && o1.items[3].kind === 'key' && o1.items[3].label === 'All pilots', JSON.stringify(o1.items));
g.run(`campCornerKey(C, 'KeyW'); C.t = 10000 + 3999;`);
check('W opens them too, and they stay 4 s at full strength', J('__N().open') === 1);
g.run(`C.t = 10000 + 4300;`);
check('then a fade over 0.6 s: half way is half', near(J('__N().open'), 0.5));
g.run(`C.t = 10000 + 4700;`);
check('then they go: no details, the line (W, who) and the selection stay', J('__N().open') === 0 && J('__N().items.length') === 0 && J('__N().title') === 'FLEET' && J('__N().selection') === 'All pilots' && J('__N().chips').join() === 'W');
g.run(`C.t = 10000 + 4700; campCornerKey(C, 'KeyA'); campCornerKey(C, 'KeyE'); campCornerKey(C, 'KeyQ'); campCornerKey(C, 'BracketRight');`);
check('a key of another corner (Q is the cruiser\'s) or of no corner (E is the order) does not open FLEET', J('__N().open') === 0);
g.run(`C.sel = 'pilot:green'; C.t = 50000; campCornerKey(C, 'KeyW');`);
const o2 = J('__N()');
check('with Kara picked the details still list all three pilots, and Red 2 Kara is the row that is lit', o2.items.filter(i => i.kind === 'bar').length === 3 && o2.items.filter(i => i.sel).map(i => i.name).join() === 'Red 2 Kara', JSON.stringify(o2.items.map(i => [i.name || i.label, i.sel])));
g.run(`C.sel = 'all';`);
check('with All pilots the All pilots row is the one lit (the digit that picked it)', J('__N().items.filter(i => i.sel).map(i => i.label).join()') === 'All pilots');

// ---- D. the hook and the hit ----
console.log('D. the reopen hook and the hit');
g.run(`__new(); C.t = 5000; __N();`);
g.run(`campCornerOpen(C, 'fleet'); C.t = 5000 + 3999;`);
check('campCornerOpen(C, id) is the reopen hook: open for the default 4 s', J('__N().open') === 1 && J('__N().items.length') === J(`campPanelList(C, 'fleet').length`));
g.run(`C.t = 30000; campCornerOpen(C, 'fleet', 1000); C.t = 30000 + 999;`);
check('with its own time: 1 s at full strength', J('__N().open') === 1);
g.run(`C.t = 30000 + 1300;`);
check('and then the same fade', near(J('__N().open'), 0.5));
g.run(`__new(); C.t = 2000; __N(); C.t = 20000; window.__p = campSelList(C).find(e => e.kind === 'pilot').unit; __p.hp -= 5;`);
check('a pilot is hit (its hull goes down): the details come back by themselves', J('__N().open') === 1 && J('__N().items.length') === J(`campPanelList(C, 'fleet').length`));
g.run(`C.t = 20000 + 3999;`);
check('for 4 s at full strength', J('__N().open') === 1);
g.run(`C.t = 20000 + 4700;`);
check('and then they fade away again', J('__N().open') === 0);
g.run(`__p.hp = Math.min(__p.maxHp, __p.hp + 3); C.t = 40000;`);
check('a pilot mended (the hull goes up) does not bring them back', J('__N().open') === 0);
g.run(`C.t = 50000; __p.hp -= 2;`);
check('hit again: back again', J('__N().open') === 1);
g.run(`__new(); C.t = 1000; __N(); window.__q = campSelList(C).filter(e => e.kind === 'pilot').map(e => e.unit); __q.forEach(u => { u.hp = 1; }); C.t = 100000;`);
check('every pilot hit at once is one open, not three (the same 4 s)', J('__N().open') === 1);
check('the first look in a mission is not a hit (what it saw is only remembered)', (() => { g.run(`__new(); C.t = 3000;`); return J('__N().open') === 0; })());

// ---- E. where ----
console.log('E. where');
const geo = J('campCornerGeom("bl", campCornerItemsH([{ share: 1 }, { share: 1 }, { share: 1 }]), 0)');
const geoS = J('campCornerGeom("bl", campCornerItemsH([{ share: 1 }, { share: 1 }, { share: 1 }]), 0, 200)');
check('FLEET\'s title row is under Q CRUISER\'s at the top left (y 110, the stack gap under the 78 row), and its details open DOWNWARD under it with a gap', geo.title.x === 18 && geo.title.w === 320 && geo.title.y === 110 && geo.title.y === J('CAMP.corner.at.tl.y + CAMP.corner.title.h + CAMP.corner.stack') && geo.det.y === geo.title.y + geo.title.h + 4 && geo.det.w === 320 && geo.det.h === 3 * 46 + 16, JSON.stringify(geo));
check('a row slid down (dy: the row above has its details open) moves its title and its details together, and nothing else', geoS.title.y === geo.title.y + 200 && geoS.det.y === geo.det.y + 200 && geoS.det.h === geo.det.h && geoS.title.x === geo.title.x);
const geoT = J('campCornerGeom("tl", 66, 0)');
check('a top corner opens downward: the details start under the title row', geoT.det.y === geoT.title.y + geoT.title.h + 4 && geoT.title.y === J('CAMP.corner.at.tl.y'), JSON.stringify(geoT));
check('with no items there is no frame, and dx moves both rectangles sideways', J('campCornerGeom("bl", 0, 0).det') === null && J('campCornerGeom("bl", 138, 40).title.x') === 58 && J('campCornerGeom("bl", 138, 40).det.x') === 58);
{ // the stack: the second row sits as far down as the first row's details are open (campCornerSlide), by their height and the gap, and comes back as they fade
  g.run(`__new(); C.t = 1000; window.__Ns = () => { const o = {}; CAMP_CORNERS.forEach(d => { o[d.id] = campCornerNow(C, d.id); }); return o; };`);
  const sl = (ext) => J(`campCornerSlide('fleet', __Ns(), ${ext ? JSON.stringify(ext) : 'null'})`), tcl = J('CAMP_CORNERS.find(d => d.at === "tl").id');
  check('STACKED (card space-game-keys5-corners): with nothing open the second row is where it is; the first row (the top one) never slides', sl() === 0 && J(`campCornerSlide('${tcl}', __Ns(), null)`) === 0);
  g.run(`campCornerAdd({ id: 'probetl', at: 'tl', keys: [{ cap: 'Z', codes: ['KeyZ'] }], title: 'camp.corner.cruiser', selection: () => '', rows: () => [{ kind: 'bar', name: 'a', num: '1', share: 1 }, { kind: 'text', text: 'b' }] }); CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === 'cruiser'), 1); C.t = 20000; campCornerKey(C, 'KeyZ');`);
  const h1 = J('campCornerItemsH([{ kind: "bar" }, { kind: "text" }]) + CAMP.corner.pad * 2 + CAMP.corner.gap');
  check('the first row\'s details open: the second row slides down by their frame\'s height and the gap', sl() === h1 && h1 === 46 + 20 + 16 + 4, sl());
  g.run(`C.t = 20000 + 4300;`);
  check('and back as they fade: half way is half', near(sl(), h1 / 2));
  g.run(`C.t = 20000 + 4700;`);
  check('and the row is where it was when they are gone', sl() === 0);
  check('a list the first row has that this file does not know (the cruiser list hangs under it): ext { h, k } slides the row by its height times its strength', sl({ h: 340, k: 1 }) === 340 && near(sl({ h: 340, k: 0.5 }), 170) && sl({ h: 340, k: 0 }) === 0);
  g.run(`CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === 'probetl'), 1); campCornerAdd(__CRUISER);`);
}
check('the room of the left stack (campTdispBox(true)) is the two rows closed, from the top row down to the bottom of the second; the right stack\'s is the same at the right', J('campTdispBox(true).x') === 18 && J('campTdispBox(true).y') === 78 && J('campTdispBox(true).h') === 110 + 26 - 78 && J('campTdispBox(false).x') === 942 && J('campTdispBox(false).y') === 78 && J('campTdispBox(false).w') === 320);
check('the MISSILES count is not under the FLEET corner any more (card space-game-missiles-cost-ore moved it into the status block at the top left): no CAMP.tdisp.count, no text of it in the scene', J('CAMP.tdisp.count') === null && !/H - CAMP\.tdisp\.count/.test(src('src/campaignscene.js')) && !/hud\.missiles/.test(src('src/campaignscene.js')));
check('the two stacks are inside rectangles the edge arrows\' labels keep out of: the rows closed, top left and top right', [J('campTdispBox(true)'), J('campTdispBox(false)')].every(b => J('CAMP.nav.arrow.keep').some(r => b.x >= r[0] && b.y >= r[1] && b.x + b.w <= r[2] && b.y + b.h <= r[3])));

// ---- F. the drawing ----
console.log('F. the drawing');
g.run(`__new(); __scene(); campCornerSync(S, 0);`);
const shown0 = J('__shown()');
check('closed: the FLEET line (the chip W, All pilots, the chip E, Form up: cards space-game-fleet-sentence and space-game-keys5-corners) and the Q CRUISER corner (chip Q, title CRUISER, no selection), and nothing else', shown0.length === 6 && ['All pilots', 'Form up', 'W', 'E', 'CRUISER', 'Q'].every(t => shown0.includes(t)), JSON.stringify(shown0));
g.run(`window.__PROBE = { id: 'probe', at: 'tr', keys: ['friendlies', 'hostiles', { cap: 'S', codes: ['KeyS'] }], title: 'camp.corner.hostiles', selection: C => 'Raider 9', rows: C => [{ kind: 'bar', name: 'Raider 9', num: '30 / 40', share: 0.75, color: 0xffb454 }, { kind: 'text', text: 'attacking Kara' }, { kind: 'key', cap: 'E', label: 'Attack', ok: true }] }; campCornerAdd(__PROBE); campCornerSync(S, 0);`);
check('a corner another card adds is drawn by the same code, at its own corner (top right here: its title is on the right half of the screen) with its own chips, title and selection', ['HOSTILES', 'Raider 9', '[', ']', 'S'].every(t => J('__shown()').includes(t)) && J('S.hud.corner.probe.title.x') > 640 && J('S.hud.corner.probe.title.y') >= J('CAMP.corner.at.tr.y'));
g.run(`campCornerKey(C, 'KeyS'); campCornerSync(S, 0);`);
check('its details open on its own key, a bar, a line of text and a key chip, under the title (the corner opens downward)', ['attacking Kara', 'Attack', 'E', '30 / 40'].every(t => J('__shown()').includes(t)) && J('S.objs.find(o => o.text === "attacking Kara").y') > J('S.hud.corner.probe.title.y'));
g.run(`CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === 'probe'), 1); campCornerHide(S.hud.corner.probe); S.hud.corner.probe.g.log = [];`);
check('the title row is a frame and two chips (Q and the order key W of the line); no details frame', J('S.hud.corner.fleet.g.log.filter(l => l[0] === "fillRoundedRect").length') === 3, JSON.stringify(J('S.hud.corner.fleet.g.log.map(l => l[0])')));
check('the chip W, who, the chip E and the order stand in the title row, in that order, left to right (no title word and no selection: the row is a line)', (() => { const V = 'S.hud.corner.fleet'; return J(`${V}.chips[0].x`) < J(`${V}.words[0].x`) && J(`${V}.words[0].x`) < J(`${V}.chips[1].x`) && J(`${V}.chips[1].x`) < J(`${V}.words[1].x`) && J(`${V}.words[0].y`) >= 110 && J(`${V}.words[0].y`) < 136 && !J(`${V}.title.vis`) && !J(`${V}.sel.vis`); })());
g.run(`campCornerKey(C, 'KeyW'); campCornerSync(S, 0);`);
const shown1 = J('__shown()');
check('opened by W: the three pilots\' names and numbers are drawn under the title, each after its digit chip, at full strength', ['Red 1 Wedge', 'Red 2 Kara', 'Red 3 Apollo', '1', '2', '3', '4'].every(t => shown1.includes(t)) && shown1.filter(t => /^\d+ \/ \d+$/.test(t)).length === 3 && J('S.objs.filter(o => o.vis && ["Red 1 Wedge", "Red 2 Kara", "Red 3 Apollo"].includes(o.text)).every(o => o.alpha === 1)'), JSON.stringify(shown1));
check('and a frame for them and a bar for each pilot are drawn (the title row\'s frame and chip as well)', J('S.hud.corner.fleet.g.log.filter(l => l[0] === "fillRoundedRect").length') === 4 + J('campCornerNow(C, "fleet").items.length') && J('S.hud.corner.fleet.g.log.filter(l => l[0] === "fillRect").length') >= 6, JSON.stringify(J('S.hud.corner.fleet.g.log.map(l => l[0])')));
check('the details are UNDER the title row (their names are lower on the screen than the line)', J('S.objs.find(o => o.text === "Red 1 Wedge").y') > J('S.hud.corner.fleet.words[0].y'));
g.run(`C.t += 4000 + 300; campCornerSync(S, 0);`);
check('half way through the fade the names are half transparent and still drawn; the line is not', near(J('S.objs.find(o => o.text === "Red 2 Kara").alpha'), 0.5) && J('S.objs.find(o => o.text === "Red 2 Kara").vis') && J('S.hud.corner.fleet.words[0].alpha') === 1);
g.run(`C.t += 400; campCornerSync(S, 0);`);
const shown2 = J('__shown()');
check('faded away: the names and numbers are hidden; the line (the chips, who and the order) is still there', !shown2.includes('Red 1 Wedge') && !shown2.includes('Red 2 Kara') && shown2.includes('Form up') && shown2.includes('All pilots') && shown2.includes('W') && shown2.includes('E'), JSON.stringify(shown2));
g.run(`campCornerKey(C, 'KeyW'); S.mode = 'map'; campCornerSync(S, 0);`);
check('behind the map (or a card, the pause, the keys page) nothing of it is drawn', J('__shown()').length === 0 && J('S.hud.corner.fleet.g.log.length') === 0);
g.run(`S.mode = 'play'; campCornerSync(S, 0);`);
check('and it is back when the map is closed (a corner the game opened is still open)', J('__shown()').includes('Form up'));
g.run(`C.sel = 'pilot:green'; campCornerSync(S, 0);`);
check('the selection is redrawn when the pick changes: the line says Red 2 Kara', J('S.hud.corner.fleet.words[0].text') === 'Red 2 Kara');
check('an open left list (the convoy list: data, no key opens it; it hangs from y 150, under both rows of the left stack) does not move the corners, and neither does the fleet pick (its rows are the corner\'s own details, drawn by the corner)', (() => {
  g.run(`S.pn = Object.assign(campPanelNew(), { open: 'convoy' }); S.pnl = null; campCornerSync(S, 0);`);
  const dxL = J('campBoxDx(S, true)'), x1 = J('S.hud.corner.fleet.chips[0].x');
  g.run(`S.pn = Object.assign(campPanelNew(), { open: 'fleet' }); campCornerSync(S, 0);`);
  const dxF = J('campBoxDx(S, true)');
  g.run(`S.pn = campPanelNew(); campCornerSync(S, 0);`);
  return dxL === 0 && dxF === 0 && x1 === J('S.hud.corner.fleet.chips[0].x') && x1 === J('CAMP.corner.at.bl.x') + J('CAMP.corner.title.pad') + J('CAMP.corner.title.chipW') / 2;
})());

// ---- H. the alignment (card space-game-layout-align; Troy, 24 Nov 2026, from his screenshot) ----
console.log('H. the alignment');
{
  const at = J('CAMP.corner.at'), K = J('CAMP.corner'), W = J('W'), scn = src('src/campaignscene.js');
  check('(1) the two stacks are level: HOSTILES starts at the same y as Q CRUISER and FRIENDLIES at the same y as FLEET, under it', at.tl.y === at.tr.y && at.bl.y === at.br.y && at.tl.y === 78 && at.bl.y === at.tl.y + K.title.h + K.stack, JSON.stringify(at)); // (78 since card space-game-missiles-cost-ore: the status block over S CRUISER has a fourth line)
  check('(4) one margin: the left corners start at CAMP.corner.edge and the right ones end the same distance from the right edge (x is W - edge - w)', at.tl.x === K.edge && at.bl.x === K.edge && at.tr.x === W - K.edge - K.w && at.br.x === W - K.edge - K.w && W - (at.tr.x + K.w) === at.tl.x, JSON.stringify(at));
  check('(4) the key line and the radio line start where the frames do: x = edge - ink (the stroke and the letter\'s side put the first letter ink px right of x)', /keys: this\.add\.text\(CAMP\.corner\.edge - CAMP\.corner\.ink, H - 44/.test(scn) && /this\.hud\.chat = this\.add\.text\(CAMP\.corner\.edge - CAMP\.corner\.ink, /.test(scn) && K.edge === 18 && K.ink === 2 && !/add\.text\(24, H - /.test(scn));
  check('(4) the target box\'s room is the right corners\' column: its width is the panel\'s and its right edge is the margin', J('CAMP.tdisp.w') === K.w && J('CAMP.tdisp.right') === K.edge && J('campTdispBox().x') === at.br.x && J('campTdispBox(true).w') === K.w);
  check('(5) the title rows are inside the screen and the arrows\' labels keep out of all four title rows', [['tl', 78], ['tr', 78], ['bl', 110], ['br', 110]].every(([c, y]) => J('CAMP.nav.arrow.keep').some(r => at[c].x >= r[0] && y >= r[1] && at[c].x + K.w <= r[2] && y + K.title.h <= r[3])), JSON.stringify(J('CAMP.nav.arrow.keep')));
  g.run(`__new(); __scene(); campCornerAdd({ id: 'probe2', at: 'tr', keys: ['hostiles'], title: 'camp.corner.hostiles', selection: C => 'Mothership Alpha Centauri Relay Station', rows: () => [] }); campCornerSync(S, 0);`);
  const T = id => J('S.hud.corner.' + id + '.title.x');
  check('(3) the chip column is as wide in every corner: S CRUISER and the probe (one chip each) start their titles at the same distance from their left edge (FLEET is a line: its chip starts at the same place; tests/campfleetsentence.mjs)', T('cruiser') - at.tl.x === T('probe2') - at.tr.x && T('cruiser') - at.tl.x === K.title.pad + K.title.chips * (K.title.chipW + K.title.chipGap) - K.title.chipGap + K.title.gap && J('S.hud.corner.fleet.chips[0].x') - at.bl.x === J('S.hud.corner.cruiser.chips[0].x') - at.tl.x, [T('cruiser'), T('probe2')].join());
  check('(3) the chips are the same size and on the same baseline in every corner: the first chip starts at the same distance from the corner\'s edge and is as high', J('S.hud.corner.cruiser.chips[0].x') - at.tl.x === J('S.hud.corner.fleet.chips[0].x') - at.bl.x && J('S.hud.corner.cruiser.chips[0].y') - at.tl.y === J('S.hud.corner.fleet.chips[0].y') - at.bl.y && J('S.hud.corner.probe2.chips[0].y') - at.tr.y === J('S.hud.corner.cruiser.chips[0].y') - at.tl.y);
  check('(2) a long selection is cut short with an ellipsis so that it ends inside the frame (the stand-in text is 10 px a letter here); it is worked out when the name changes, not every frame', (() => {
    const V = 'S.hud.corner.probe2';
    g.run(`(() => { const t = ${V}.sel; window.__sets = 0; t.setText = v => { window.__sets++; t.text = v; t.width = v.length * 10; return t; }; t.width = t.text.length * 10; })(); __SELKEY = 1; ${V}.selK = ''; campCornerSync(S, 0);`);
    const shown = J(V + '.sel.text'), W1 = J(V + '.sel.width'), room = at.tr.x + K.w - K.title.pad - J(V + '.sel.x'), sets = J('__sets');
    g.run(`campCornerSync(S, 0); campCornerSync(S, 0);`);
    return shown.endsWith('\u2026') && shown.length < 'Mothership Alpha Centauri Relay Station'.length && W1 <= room && room > 0 && J('__sets') === sets;
  })());
  check('campCornerFit: a text that fits is returned as it is, one that does not is cut with an ellipsis (no trailing space before it), and a room too small for a letter gives the ellipsis alone', J(`campCornerFit('Skiff 3', 100, s => s.length * 8)`) === 'Skiff 3' && J(`campCornerFit('Mothership Alpha', 100, s => s.length * 8)`) === 'Mothership\u2026' && J(`campCornerFit('Mothership Alpha', 6, s => s.length * 8)`) === '\u2026' && J(`campCornerFit('', 50, s => s.length * 8)`) === '');
  g.run(`CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === 'probe2'), 1); campCornerHide(S.hud.corner.probe2);`);
}

// ---- G. the who box is gone ----
console.log('G. the who box is gone');
const scene = src('src/campaignscene.js'), tds = src('src/camptdispscene.js'), html = src('index.html');
check('no fdisp, no campFdispSync, no campFdispAll, no campFdispSubject: the who box is gone', !/campFdisp|hud\.fdisp|CAMP_FDISP/.test(scene + tds + src('src/camptdisp.js') + src('src/campcornerscene.js')) && J('typeof campFdispSubject') === 'undefined' && J('typeof campFdispAllInfo') === 'undefined' && J('typeof campFdispSync') === 'undefined');
check('the scene calls campCornerSync every frame, and campCornerKey for every key in play', /if \(typeof campCornerSync === 'function'\) campCornerSync\(this, this\.time\.now\)/.test(scene) && /if \(this\.mode === 'play' && typeof campCornerKey === 'function'\) campCornerKey\(C, c\)/.test(scene));
check('the two files have their script tags (the rule after the target display\'s, the drawing with the other scene halves)', /<script src="src\/campcorner\.js"><\/script>/.test(html) && /<script src="src\/campcornerscene\.js"><\/script>/.test(html));
check('the rule is pure (no Phaser: no this.add, no scene) and keeps its state in a WeakMap per mission', !/this\.add|scene\.add|s\.add/.test(src('src/campcorner.js')) && /const CAMP_CORNER_STATE = new WeakMap\(\)/.test(src('src/campcorner.js')));

console.log(failed ? `\nCORNER PANEL FAIL: ${failed} of ${n} checks failed` : `\nCORNER PANEL PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
