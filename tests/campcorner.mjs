// smoke: the corner panels (card space-game-layout-fleet): a title with its key chips that never leaves, the selection beside it that never fades, details that open when the keys are used and fade, a reopen hook; Q W FLEET at the bottom left
// Troy, 24 Nov 2026, agreed bite by bite from his screenshot: FOUR CORNERS, each a small title that never leaves, starting with its keys as plain key-cap chips: top left S CRUISER, bottom left Q W FLEET, top right [ ] HOSTILES, bottom right O P FRIENDLIES. The details open when its keys are used and fade; the selection is written beside the title and never fades. The rule and the registry are src/campcorner.js, the drawing src/campcornerscene.js, the numbers CAMP.corner.
//   A  the table and the words: the numbers with their comments, the four places, the four titles
//   B  the registry: a corner is added once (by id), its chips are its keys' caps, the selection and the title are read; a corner from another card (a stand-in here) works the same
//   C  FLEET: the selection is All pilots or the one pilot; closed, no details; Q or W (any key of the corner) opens the details: a name and a hull bar for each pilot; they stay 4 s, fade over 0.6 s, then go; the selection and the title stay
//   D  the reopen hook (campCornerOpen, with its own time) and the hit: a pilot's hull going down brings the details back by themselves for 4 s
//   E  where: the title row and the details' frame (open upward from the bottom, downward from the top); the MISSILES count is clear of it
//   F  the drawing on a stand-in scene: the chips, the title and the selection are always shown; the details only while open, fading; nothing behind a card or the map; an open left list moves the corner
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
g.run(`CAMP_CORNERS.splice(0, CAMP_CORNERS.length, ...CAMP_CORNERS.filter(d => d.id === 'fleet'));`); // this suite is the panel alone, with FLEET and the probe it adds: the target corners other cards register (HOSTILES, FRIENDLIES: tests/campcorners.mjs) are not in this world

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
check('CAMP.corner: 200 wide; details open 4 s after the keys, 4 s after a hit, fade over 600 ms', J('CAMP.corner.w') === 200 && J('CAMP.corner.show') === 4000 && J('CAMP.corner.hit') === 4000 && J('CAMP.corner.fade') === 600);
check('the four corners have a place each: top left, bottom left, top right, bottom right (the bottom ones open upward, the top ones downward)', J('Object.keys(CAMP.corner.at).join()') === 'tl,bl,tr,br' && J('CAMP.corner.at.bl.dir') === -1 && J('CAMP.corner.at.br.dir') === -1 && J('CAMP.corner.at.tl.dir') === 1 && J('CAMP.corner.at.tr.dir') === 1 && J('CAMP.corner.at.bl.x') < 640 && J('CAMP.corner.at.br.x') > 640);
check('every number has its comment in the table', /show: 4000, +\/\/ ms/.test(camp) && /hit: 4000, +\/\/ ms/.test(camp) && /fade: 600, +\/\/ ms/.test(camp) && /w: 200, +\/\/ px: a panel/.test(camp) && /at: \{ +\/\/ where each corner/.test(camp));
check('the four titles and the pilot-in-the-bay word are content, not bare keys', J(`uiText('camp.corner.cruiser')`) === 'CRUISER' && J(`uiText('camp.corner.fleet')`) === 'FLEET' && J(`uiText('camp.corner.hostiles')`) === 'HOSTILES' && J(`uiText('camp.corner.friendlies')`) === 'FRIENDLIES' && J(`uiText('camp.corner.bay')`) === 'in the bay');

// ---- B. the registry ----
console.log('B. the registry');
g.run(`__new();`);
check('FLEET is registered: bottom left, keys Q and W (the chips are their caps, in order), the title\'s words', J('campCornerDef("fleet").at') === 'bl' && J('__N().chips').join() === 'Q,W' && J('__N().title') === 'FLEET');
g.run(`window.__n0 = CAMP_CORNERS.length; campCornerAdd({ id: 'probe', at: 'tr', keys: ['last', 'next', { cap: 'S', codes: ['KeyS'] }], title: 'camp.corner.hostiles', selection: C => 'Raider 9', rows: C => [{ kind: 'bar', name: 'Raider 9', num: '30 / 40', share: 0.75, color: 0xffb454 }, { kind: 'text', text: 'attacking Kara' }, { kind: 'key', cap: 'E', label: 'Attack', ok: true }] }); window.__n1 = CAMP_CORNERS.length; campCornerAdd({ id: 'probe', at: 'tr', keys: [], title: 'camp.corner.hostiles' }); window.__n2 = CAMP_CORNERS.length;`);
check('a corner another card adds: added once, added again by the same id it is replaced, not doubled', J('__n1') === J('__n0') + 1 && J('__n2') === J('__n1'));
g.run(`campCornerAdd({ id: 'probe', at: 'tr', keys: ['last', 'next', { cap: 'S', codes: ['KeyS'] }], title: 'camp.corner.hostiles', selection: C => 'Raider 9', rows: C => [{ kind: 'bar', name: 'Raider 9', num: '30 / 40', share: 0.75, color: 0xffb454 }, { kind: 'text', text: 'attacking Kara' }, { kind: 'key', cap: 'E', label: 'Attack', ok: true }] });`);
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
check('with one pilot picked (D) the selection is that pilot\'s name', J('C.sel') === 'pilot:red' && J('__N().selection') === 'Wedge');
g.run(`C.sel = 'pilot:green';`);
check('the selection follows the pick: Kara', J('__N().selection') === 'Kara');
g.run(`C.sel = 'all'; C.t = 10000;`);
check('closed: no details until a key of the corner is used', J('__N().open') === 0 && J('__N().items.length') === 0);
g.run(`campCornerKey(C, 'KeyQ');`);
const o1 = J('__N()');
check('Q opens the details: a row for each pilot, in order Wedge, Kara, Apollo, each a bar with its hull numbers (hull now / max)', o1.open === 1 && o1.items.map(i => i.name).join() === 'Wedge,Kara,Apollo' && o1.items.every(i => i.kind === 'bar' && /^\d+ \/ \d+$/.test(i.num) && i.share > 0 && i.share <= 1), JSON.stringify(o1.items));
g.run(`campCornerKey(C, 'KeyW'); C.t = 10000 + 3999;`);
check('W opens them too, and they stay 4 s at full strength', J('__N().open') === 1);
g.run(`C.t = 10000 + 4300;`);
check('then a fade over 0.6 s: half way is half', near(J('__N().open'), 0.5));
g.run(`C.t = 10000 + 4700;`);
check('then they go: no details, the title and the selection stay', J('__N().open') === 0 && J('__N().items.length') === 0 && J('__N().title') === 'FLEET' && J('__N().selection') === 'All pilots' && J('__N().chips').join() === 'Q,W');
g.run(`C.t = 10000 + 4700; campCornerKey(C, 'KeyA'); campCornerKey(C, 'KeyE'); campCornerKey(C, 'BracketRight');`);
check('a key of another corner or of no corner does not open FLEET', J('__N().open') === 0);
g.run(`C.sel = 'pilot:green'; C.t = 50000; campCornerKey(C, 'KeyW');`);
const o2 = J('__N()');
check('with Kara picked the details still list all three pilots, and Kara is the one that is lit', o2.items.length === 3 && o2.items.filter(i => i.sel).map(i => i.name).join() === 'Kara', JSON.stringify(o2.items.map(i => [i.name, i.sel])));
g.run(`C.sel = 'all';`);
check('with All pilots all three are lit', J('__N().items.every(i => i.sel)'));

// ---- D. the hook and the hit ----
console.log('D. the reopen hook and the hit');
g.run(`__new(); C.t = 5000; __N();`);
g.run(`campCornerOpen(C, 'fleet'); C.t = 5000 + 3999;`);
check('campCornerOpen(C, id) is the reopen hook: open for the default 4 s', J('__N().open') === 1 && J('__N().items.length') === 3);
g.run(`C.t = 30000; campCornerOpen(C, 'fleet', 1000); C.t = 30000 + 999;`);
check('with its own time: 1 s at full strength', J('__N().open') === 1);
g.run(`C.t = 30000 + 1300;`);
check('and then the same fade', near(J('__N().open'), 0.5));
g.run(`__new(); C.t = 2000; __N(); C.t = 20000; window.__p = campSelList(C).find(e => e.kind === 'pilot').unit; __p.hp -= 5;`);
check('a pilot is hit (its hull goes down): the details come back by themselves', J('__N().open') === 1 && J('__N().items.length') === 3);
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
check('FLEET\'s title row is at the bottom left, ending at y 630 (where the who box ended), and its details open above it with a gap', geo.title.x === 18 && geo.title.w === 200 && geo.title.y + geo.title.h === 630 && geo.det.y + geo.det.h === geo.title.y - 4 && geo.det.w === 200 && geo.det.h === 3 * 46 + 16, JSON.stringify(geo));
const geoT = J('campCornerGeom("tl", 66, 0)');
check('a top corner opens downward: the details start under the title row', geoT.det.y === geoT.title.y + geoT.title.h + 4 && geoT.title.y === J('CAMP.corner.at.tl.y'), JSON.stringify(geoT));
check('with no items there is no frame, and dx moves both rectangles sideways', J('campCornerGeom("bl", 0, 0).det') === null && J('campCornerGeom("bl", 138, 40).title.x') === 58 && J('campCornerGeom("bl", 138, 40).det.x') === 58);
check('the three details fit the room the corner is given (the rectangle the list dodge and the arrows\' labels use): from y 430 to 630', geo.det.y >= J('campTdispBox(true).y') && geo.title.y + geo.title.h <= J('campTdispBox(true).y + campTdispBox(true).h') && J('campTdispBox(true).x') === 18);
{ const top = J('H - CAMP.tdisp.count'); check('the MISSILES count (bottom left, card space-game-missiles-line-overlap) is under the corner and clear of it, and over the key line\'s strip (its top is H - 48): the corner ends at 630, the count starts at ' + top, top >= 630 + 8 && top + 20 <= J('H') - 48 && /this\.add\.text\(24, H - CAMP\.tdisp\.count/.test(src('src/campaignscene.js'))); }
check('the room the corner takes is inside a rectangle the edge arrows\' labels keep out of', J('CAMP.nav.arrow.keep').some(r => r[0] === 0 && r[1] <= 446 && r[2] >= 218 && r[3] >= 630));

// ---- F. the drawing ----
console.log('F. the drawing');
g.run(`__new(); __scene(); campCornerSync(S, 0);`);
const shown0 = J('__shown()');
check('closed: the chips Q and W, the title FLEET and the selection All pilots are drawn, and nothing else', shown0.join('|') === 'FLEET|All pilots|Q|W' || (shown0.length === 4 && ['FLEET', 'All pilots', 'Q', 'W'].every(t => shown0.includes(t))), JSON.stringify(shown0));
g.run(`window.__PROBE = { id: 'probe', at: 'tr', keys: ['last', 'next', { cap: 'S', codes: ['KeyS'] }], title: 'camp.corner.hostiles', selection: C => 'Raider 9', rows: C => [{ kind: 'bar', name: 'Raider 9', num: '30 / 40', share: 0.75, color: 0xffb454 }, { kind: 'text', text: 'attacking Kara' }, { kind: 'key', cap: 'E', label: 'Attack', ok: true }] }; campCornerAdd(__PROBE); campCornerSync(S, 0);`);
check('a corner another card adds is drawn by the same code, at its own corner (top right here: its title is on the right half of the screen) with its own chips, title and selection', ['HOSTILES', 'Raider 9', '[', ']', 'S'].every(t => J('__shown()').includes(t)) && J('S.hud.corner.probe.title.x') > 640 && J('S.hud.corner.probe.title.y') >= J('CAMP.corner.at.tr.y'));
g.run(`campCornerKey(C, 'KeyS'); campCornerSync(S, 0);`);
check('its details open on its own key, a bar, a line of text and a key chip, under the title (the corner opens downward)', ['attacking Kara', 'Attack', 'E', '30 / 40'].every(t => J('__shown()').includes(t)) && J('S.objs.find(o => o.text === "attacking Kara").y') > J('S.hud.corner.probe.title.y'));
g.run(`CAMP_CORNERS.splice(CAMP_CORNERS.findIndex(d => d.id === 'probe'), 1); campCornerHide(S.hud.corner.probe); S.hud.corner.probe.g.log = [];`);
check('the title row is a frame and two chips; no details frame', J('S.hud.corner.fleet.g.log.filter(l => l[0] === "fillRoundedRect").length') === 3, JSON.stringify(J('S.hud.corner.fleet.g.log.map(l => l[0])')));
check('the chips are in the title row, the title after them, the selection after the title (in order, left to right)', (() => { const V = 'S.hud.corner.fleet'; return J(`${V}.chips[0].x`) < J(`${V}.chips[1].x`) && J(`${V}.chips[1].x`) < J(`${V}.title.x`) && J(`${V}.title.x`) < J(`${V}.sel.x`) && J(`${V}.title.y`) >= 604 && J(`${V}.title.y`) < 630; })());
g.run(`campCornerKey(C, 'KeyW'); campCornerSync(S, 0);`);
const shown1 = J('__shown()');
check('opened by W: the three pilots\' names and numbers are drawn under the title, at full strength', ['Wedge', 'Kara', 'Apollo'].every(t => shown1.includes(t)) && shown1.filter(t => /^\d+ \/ \d+$/.test(t)).length === 3 && J('S.objs.filter(o => o.vis && ["Wedge", "Kara", "Apollo"].includes(o.text)).every(o => o.alpha === 1)'), JSON.stringify(shown1));
check('and a frame for them and a bar for each pilot are drawn (the title row\'s frame and chips as well)', J('S.hud.corner.fleet.g.log.filter(l => l[0] === "fillRoundedRect").length') === 4 && J('S.hud.corner.fleet.g.log.filter(l => l[0] === "fillRect").length') >= 6, JSON.stringify(J('S.hud.corner.fleet.g.log.map(l => l[0])')));
check('the details are above the title row (their names are higher on the screen than the title)', J('S.objs.find(o => o.text === "Wedge").y') < J('S.hud.corner.fleet.title.y'));
g.run(`C.t += 4000 + 300; campCornerSync(S, 0);`);
check('half way through the fade the names are half transparent and still drawn; the title is not', near(J('S.objs.find(o => o.text === "Kara").alpha'), 0.5) && J('S.objs.find(o => o.text === "Kara").vis') && J('S.hud.corner.fleet.title.alpha') === 1);
g.run(`C.t += 400; campCornerSync(S, 0);`);
const shown2 = J('__shown()');
check('faded away: the names and numbers are hidden; the chips, the title and the selection are still there', !shown2.includes('Wedge') && !shown2.includes('Kara') && shown2.includes('FLEET') && shown2.includes('All pilots') && shown2.includes('Q') && shown2.includes('W'), JSON.stringify(shown2));
g.run(`campCornerKey(C, 'KeyW'); S.mode = 'map'; campCornerSync(S, 0);`);
check('behind the map (or a card, the pause, the keys page) nothing of it is drawn', J('__shown()').length === 0 && J('S.hud.corner.fleet.g.log.length') === 0);
g.run(`S.mode = 'play'; campCornerSync(S, 0);`);
check('and it is back when the map is closed (a corner the game opened is still open)', J('__shown()').includes('FLEET'));
g.run(`C.sel = 'pilot:green'; campCornerSync(S, 0);`);
check('the selection is redrawn when the pick changes: Kara', J('__shown()').includes('Kara') && !J('__shown()').includes('All pilots'));
check('an open left list (the squads list) moves the corner right of it, with the same gap as the boxes always had; the corner goes back when it closes', (() => {
  g.run(`S.pn = Object.assign(campPanelNew(), { open: 'squads' }); S.pnl = null; campCornerSync(S, 0);`);
  const moved = J('S.hud.corner.fleet.title.x'), dx = J('campBoxDx(S, true)'), G = J('(() => { const G = campPanelsGeometry(campPanelDef("squads"), 0); return G.x + G.w; })()');
  g.run(`S.pn = campPanelNew(); campCornerSync(S, 0);`);
  return dx > 0 && J('S.hud.corner.fleet.chips[0].x') < moved + 20 && G + J('CAMP.tdisp.beside') === 18 + dx && J('S.hud.corner.fleet.chips[0].x') === J('CAMP.corner.at.bl.x') + J('CAMP.corner.title.pad') + J('CAMP.corner.title.chipW') / 2;
})());

// ---- G. the who box is gone ----
console.log('G. the who box is gone');
const scene = src('src/campaignscene.js'), tds = src('src/camptdispscene.js'), html = src('index.html');
check('no fdisp, no campFdispSync, no campFdispAll, no campFdispSubject: the who box is gone', !/campFdisp|hud\.fdisp|CAMP_FDISP/.test(scene + tds + src('src/camptdisp.js') + src('src/campcornerscene.js')) && J('typeof campFdispSubject') === 'undefined' && J('typeof campFdispAllInfo') === 'undefined' && J('typeof campFdispSync') === 'undefined');
check('the scene calls campCornerSync every frame, and campCornerKey for every key in play', /if \(typeof campCornerSync === 'function'\) campCornerSync\(this, this\.time\.now\)/.test(scene) && /if \(this\.mode === 'play' && typeof campCornerKey === 'function'\) campCornerKey\(C, c\)/.test(scene));
check('the two files have their script tags (the rule after the target display\'s, the drawing with the other scene halves)', /<script src="src\/campcorner\.js"><\/script>/.test(html) && /<script src="src\/campcornerscene\.js"><\/script>/.test(html));
check('the rule is pure (no Phaser: no this.add, no scene) and keeps its state in a WeakMap per mission', !/this\.add|scene\.add|s\.add/.test(src('src/campcorner.js')) && /const CAMP_CORNER_STATE = new WeakMap\(\)/.test(src('src/campcorner.js')));

console.log(failed ? `\nCORNER PANEL FAIL: ${failed} of ${n} checks failed` : `\nCORNER PANEL PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
