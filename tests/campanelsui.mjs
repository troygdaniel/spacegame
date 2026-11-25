// smoke: the look of the Campaign's order lists: hidden until a list's key, the open one at its edge, as tall as its rows, with its rows' words and greying, the digit chip of each row of the numbered S list, the mark of what is in force, the window that scrolls, one component and one table, the screen's own camera (a stand-in scene records what is drawn; plain Node, no Chrome)
// Cards one-list-keys and list-shortcuts (Troy, 22 and 23 Nov 2026: "one list per hand", then "shortcut keys that take you straight to the sub-list"), after space-game-campaign-panels-ui. The rules and the keys are tests/campanels.mjs
// and tests/campanelsdraw.mjs; this is the STATES of the drawing, on a stand-in scene whose graphics and texts record what they are told:
//   A. nothing but the target's line until a list is opened; the open list at its edge, below the gauges and the radar, a solid plate as tall as its rows, edged in its side's colour (a part in its parent's place and colour);
//      gone over a card, the pause, the page of keys and the map
//   B. the rows: the name, a live word, greyed with the reason when the row cannot be done; a row that opens a part has that part's key in a cap at its left and an arrow after its name; the highlighted row has the bright bar;
//      the heading names the list, its key and where the highlight is; the foot's keys (a part's foot says Left goes back); a power row stays on the screen after its order
//   C. what is in force is marked (a convoy order), in the part's own list and on the part's row; the convoy orders greyed with no ship to take them; the window scrolls and the foot says how many rows are below;
//      the rows a mission leaves out (the Convoy row, the build rows, the blink)
//   D. the target's line under the radar (no pilot's call has a plate: card space-game-no-pilot-popups)
//   E. one component and one table: a row or a whole list added to the table is drawn; every object is on the screen's own camera (scroll factor 0); the key line has a backing strip
// Run: node tests/campanelsui.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run("CAMP_PANELS.panels[0].rows.find(r => r.id === 'sreload').off = 0"); // card space-game-keys7-trim: the Reload missiles row is off the Q list in the game (the R key and the rack stay); this suite is about the row, so it puts it back
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`
  window.__said = []; toast = (s, m) => { __said.push(m); }; window.__all = [];
  window.__mk = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, gone: false, vis: true, alpha: 1, sf: null, color: '', log: [] };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => { tg.log.push([k].concat(a)); return px; }) });
    o.setText = v => { o.t = v; return px; }; o.setColor = v => { o.color = v; return px; }; o.setVisible = v => { o.vis = v; return px; }; o.setAlpha = v => { o.alpha = v; return px; }; o.setScrollFactor = v => { o.sf = v; return px; };
    o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.destroy = () => { o.gone = true; }; o.clear = () => { o.log.length = 0; return px; };
    __all.push(o); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), mode: 'play', time: { now: 0 }, add: { rectangle: (x, y) => __mk('rect', x, y), graphics: () => __mk('g'), text: (x, y, t) => __mk('text', x, y, t), container: (x, y) => __mk('box', x, y) },
      input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off(e, f) { this.handlers = this.handlers.filter(h => h[1] !== f); } }, events: { once() {} } };
    s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
  window.__rows = s => s.pnl.rows.map(r => ({ name: r.name.t, suffix: r.suffix.t, cap: r.cap.vis ? r.cap.t : '', vis: r.name.vis, nameColor: r.name.color, suffixColor: r.suffix.color })).filter(r => r.vis); // the rows on the screen (cap: the key in the row's cap, '' when it has none)
  window.__lineW = s => { const l = s.pnl.g.log.filter(x => x[0] === 'lineStyle')[0]; return l ? { w: l[1], c: l[2], a: l[3] } : null; };
  window.__fills = s => s.pnl.g.log.filter(x => x[0] === 'fillStyle').map(x => ({ c: x[1], a: x[2] }));
  window.__key = (s, code, now) => campPanelKey(s.pn, s.camp, code, now);
  window.__open = (s, list, now) => { const d = campPanelDef(list); campPanelClose(s.pn); if (d.code) campPanelKey(s.pn, s.camp, d.code, now); else campPanelGo(s.pn, s.camp, list); }; // a list as a player opens it (its own key), or by data (the convoy and dock lists have no key)
  window.__to = (s, id, now) => { const via = campKeyVia(id), i = campPanelList(s.camp, via.id).findIndex(r => r.id === id); __open(s, via.id, now); const n = campPanelList(s.camp, via.id).length; if (!campPanelDef(via.id).numbers) for (let k = 0, d = ((i - s.pn.at) % n + n) % n; k < d; k++) campPanelKey(s.pn, s.camp, 'ArrowDown', now); }; // (a numbered list has no highlight)
  window.__geo = s => { const id = campPanelOpen(s.pn); return campPanelsGeometry(campPanelDef(id), campPanelList(s.camp, id).length); }; // the place of the open list: as tall as its rows in this mission
  window.__rowY = (s, is) => { const G = __geo(s); return is.map(i => G.rowY(i)); };
  window.S = __scene(); campPanelsInstall(S);
  window.__p = now => { S.time.now = now; campPanelsPaint(S, now); };
`);
const K = J('CAMPPANELS_LOOK'), A = J('CAMP_PANELS.anim');
const geo = id => J(`campPanelsGeometry(campPanelDef('${id}'))`);
const paint = now => g.run(`__p(${now});`);
const tall = rows => K.box.head + K.box.pad + rows * (K.box.row + K.box.gap) - K.box.gap + K.box.pad + K.box.foot; // the height of a list of that many rows

console.log('A. on the screen in the battle only, and only when asked for');
{
  paint(0);
  check('until a key opens one, no list is drawn: no heading, no row, no plate; the pointer is listened for', J('__rows(S).length') === 0 && !J('S.pnl.title.vis') && !J('S.pnl.count.vis') && !J('S.pnl.keys.vis') && J(`S.pnl.g.log.filter(l => /Rect$/.test(l[0])).length`) === 0 && J('S.input.handlers.length') === 1);
  g.run(`__key(S, 'KeyQ', 0); __p(0);`);
  const want = J(`campPanelList(S.camp, 'cruiser').map(r => r.label)`);
  check('S: the cruiser list is drawn, a row for each of the mission\'s rows, in the table\'s words and order, each with its digit in the chip at its left (the list is numbered: no highlight, no arrow)', J('__rows(S).map(r => r.name).join("|")') === want.join('|') && J('__rows(S).map(r => r.cap).slice(0, 4).join()') === '1,2,3,4' && J('S.pnl.rows.length') === J('CAMP_PANELS.show'));
  const gl = geo('convoy'), gr = geo('yard');
  check('a list of the left is at the left edge and one of the right at the right edge, both inside the screen', gl.x === K.edge && gr.x + gr.w === 1280 - K.edgeRight && gl.w === K.box.w && gr.w === K.box.w);
  check('the left list sits below the lines of text at the left (it opens at y ' + K.top + ') and the right list right under the top (y ' + K.topRight + ')', gl.y === K.top && gr.y === K.topRight);
  check('the lists show in the battle only: over the story, the pause card, the pick, the end every object is hidden and an open list is closed', ['intro', 'pause', 'pick', 'won', 'lost', 'end', 'refit'].every((m, i) => (g.run(`S.mode = 'play'; campPanelClose(S.pn); __key(S, 'KeyQ', ${10 + i}); __p(${10 + i}); S.mode = '${m}'; __p(${20 + i});`), J('__rows(S).length') === 0 && J('S.pn.open') === '' && !J('S.pnl.title.vis'))));
  g.run(`S.mode = 'play'; campPanelClose(S.pn); __key(S, 'KeyQ', 15); __p(15); S.mp = {}; __p(20);`);
  check('and with the Tab map open (its frame would run under them)', J(`__rows(S).length`) === 0 && !J('S.pnl.title.vis'));
  g.run(`S.mp = null; S.ck = { open: true }; __p(30);`);
  check('and with the page of every key open', J(`__rows(S).length`) === 0);
  g.run(`S.ck = null; __p(40);`);
  check('and they are back when it goes', J(`__rows(S).length`) === want.length);
  g.run(`__key(S, 'Escape', 50); __p(50);`);
  check('Esc: the list is gone from the screen again', J(`__rows(S).length`) === 0 && !J('S.pnl.title.vis') && J(`S.pnl.g.log.filter(l => l[0] === 'fillRoundedRect').length`) === 0);
}

console.log('B. the rows');
{
  g.run(`campPanelClose(S.pn); S.camp.carrier.hp = S.camp.carrier.maxHp; __key(S, 'KeyQ', 1000); __p(1000);`);
  const rows = J(`__rows(S)`);
  check('every row has its name, a live word at the right, and a greyed look with the reason when it cannot be done: Repair hull with the hull whole says "hull sound" and its name is grey-blue; Fly to the goal is white with the distance', (() => { const rep = rows.find(r => r.name === 'Repair hull'), goal = rows.find(r => r.name === 'Fly to the goal'); return !!rep && rep.suffix === 'hull sound' && rep.nameColor === K.rowInk.no && !!goal && goal.nameColor === K.rowInk.ok && /km/.test(goal.suffix || 'km') ; })(), JSON.stringify(rows.slice(0, 5)));
  check('the row of the key R (Reload missiles) has its key in a second chip after its words, the others have none', J(`S.pnl.rows.filter(r => r.cap2.vis).map(r => r.name.t + ':' + r.cap2.t).join()`) === 'Reload missiles:R');
  check('the plate is as tall as its rows in this mission (a numbered list: its heading is its corner\'s title, so the plate has none), its foot says the digits and Esc', J('S.pnl.keys.t') === J(`uiText('camp.ui.listnums', { last: campPanelList(S.camp, 'cruiser').length })`) && J('S.pnl.keys.vis') === true);
  check('a row lights for ' + A.flash + ' ms when its digit gives it (here refused: the hull is whole, the list stays open to show it): a white wash on the row, gone after', (() => { const i = J(`campPanelList(S.camp, 'cruiser').findIndex(r => r.id === 'srepair')`); g.run(`__key(S, 'Digit' + ${i + 1}, 2000); __p(2040);`); const on = J(`S.pnl.g.log.filter(l => l[0] === 'fillStyle' && l[1] === ${K.flash}).length`); g.run(`__p(2400);`); const off = J(`S.pnl.g.log.filter(l => l[0] === 'fillStyle' && l[1] === ${K.flash}).length`); return J('S.pn.lit.srepair') === 2000 && on > 0 && off === 0 && J('S.pn.open') === 'cruiser'; })());
}

console.log('C. what is in force, the window, the rows a mission has');
{
  g.run(`__open(S, 'convoy', 3000); __p(3000);`);
  const cv = J(`__rows(S)`);
  check('the convoy orders are the four rows of the convoy list (opened by data): Tuck in, Run for it, Hold here, Carry on, greyed and "no convoy" while there is no escorted ship (the reason at the foot)', J('S.pnl.title.t') === 'CONVOY ORDERS' && cv.map(r => r.name).join('|') === 'Tuck in|Run for it|Hold here|Carry on' && cv.every(r => r.suffix === 'no convoy' && r.nameColor === K.rowInk.no) && /no escorted ships/i.test(J('S.pnl.more.t')), JSON.stringify(cv));
  g.run(`window.S5 = __scene(); S5.camp = campNew(1, [], { seed: 1, mission: 1 }); campOrder(S5.camp, 'convoy', 'tuck in'); campPanelsInstall(S5); __open(S5, 'convoy', 0); campPanelsPaint(S5, 0);`);
  check('with ships to take them, the convoy order in force is marked ("in force", dark on the bright bar while highlighted) and the others count the ships', (() => { const r = J('__rows(S5)'); return r[0].name === 'Tuck in' && r[0].suffix === 'in force' && r[0].nameColor === K.rowInk.at && /^\d ships?$/.test(r[1].suffix) && /^\d ships?$/.test(r[2].suffix); })());
  g.run(`window.__show0 = CAMP_PANELS.show; CAMP_PANELS.show = 3; __open(S5, 'convoy', 3010); campPanelsPaint(S5, 3010);`);
  check('a list longer than the window (three rows here, over the four of the convoy list) draws the window\'s rows only and its plate is the window\'s height: 1 / 4, three rows drawn from the first', J('S5.pnl.count.t') === '1 / 4' && J('S5.pn.top') === 0 && J('__rows(S5).length') === 3 && J(`S5.pnl.g.log.filter(l => l[0] === 'fillRoundedRect')[0][4]`) === tall(3));
  g.run(`for (let i = 0; i < 3; i++) __key(S5, 'ArrowDown', 3020); campPanelsPaint(S5, 3020);`);
  check('the window scrolls with the highlight (4 / 4): the first row is off the top, the rows drawn are the second to the fourth', J('S5.pnl.count.t') === '4 / 4' && J('S5.pn.top') === 1 && J('__rows(S5).length') === 3 && J(`__rows(S5)[2].name`) === 'Carry on');
  g.run(`CAMP_PANELS.show = __show0;`);
  g.run(`window.S7 = __scene(); S7.camp = campNew(3, [], { seed: 1 }); campPanelsInstall(S7); __open(S7, 'yard', 0); campPanelsPaint(S7, 0);`);
  const bd = J(`__rows(S7)`);
  check('where there is no outpost (level 3) the dock list is "Repair the hull" alone, with the hull sound, and the plate is one row tall', bd.map(r => r.name).join('|') === 'Repair the hull' && J('S7.pnl.count.t') === '1 / 1' && J(`S7.pnl.g.log.filter(l => l[0] === 'fillRoundedRect')[0][4]`) === tall(1), JSON.stringify(bd));
  g.run(`campBlinkSet(true); window.S8 = __scene(); S8.camp = campNew(2, ['blink'], { seed: 1 }); campPanelsInstall(S8); __key(S8, 'KeyQ', 0); campPanelsPaint(S8, 0);`);
  check('with the warp tech (and the blink switched on) the cruiser list has the blink row, before Form up on me: its digit in the chip, "ready" at the right; without the tech the row is not there', (() => { const r = J('__rows(S8)'); const b = r.find(x => x.name === 'Warp blink ahead'); g.run('campBlinkSet(false)'); return !!b && b.suffix === 'ready' && b.cap === String(r.indexOf(b) + 1) && r[r.length - 1].name === 'Form up on me'; })());
  g.run(`campPanelClose(S.pn); __key(S, 'KeyQ', 3300); __key(S, 'KeyQ', 3300); __key(S, 'KeyQ', 3300); __p(3300);`);
  check('a list opened again is at the top, whatever was done with it', J('S.pn.open') === 'cruiser' && J(`__rows(S)[0].name`) === 'Fly to the goal');
  g.run(`campPanelClose(S.pn);`);
}

console.log('D. the target');
{
  g.run(`S.camp.ships = S.camp.ships.filter(u => u.team !== 'earth' || u.kind === 'carrier' || (u.kind !== 'fighter' && u.kind !== 'escort')); campSpawn(S.camp, 'raider', S.camp.carrier.x + 600, S.camp.carrier.y); __key(S, 'BracketRight', 4000); __p(4000); __p(4300);`);
  check('] picks the target with no list open (the target display in the bottom right shows it: tests/camptdisp.mjs; the lists have no line of it)', /^raider-/.test(J('S.camp.tgt')) && J('S.pn.open') === '' && !('tgt' in J('Object.fromEntries(Object.keys(S.pnl).map(k => [k, 1]))')));
  g.run(`__key(S, 'KeyQ', 4360); __p(4360);`);
  check('the target stays picked with a list open too (] [ work in both)', /^raider-/.test(J('S.camp.tgt')) && J('S.pnl.rows.some(r => r.name.vis)'));
  g.run(`__key(S, 'KeyX', 4400); __p(4400); __p(4700);`);
  check('X is no flight key any more (card space-game-keys5-qwe): the target stays picked', /^raider-/.test(J('S.camp.tgt')));
  g.run(`campPanelClose(S.pn); __p(5000);`);
  check('no pilot\'s call has a plate any more: the scene paints none and nothing of it is in the game (card space-game-no-pilot-popups)', J(`typeof campCallPaint`) === 'undefined' && !J('S.callUi') && J(`__rows(S).length`) === 0);
}

console.log('E. one component, the screen\'s own camera');
{
  check('the lists are one component: one set of objects made once from the one table (CAMP_PANELS) draws whichever is open', !/function campPanelsBuild|function campPanelsPaintOne/.test(src('src/campanelsdraw.js')) && (src('src/campanelsdraw.js').match(/function campPanelsInstall/g) || []).length === 1);
  g.run(`window.__T = CAMP_PANELS.panels.find(p => p.id === 'cruiser'); __T.rows.push({ id: 'x9', order: 'recall', label: 'Ninth row', help: 'A row from the data' }); window.S2 = __scene(); campPanelsInstall(S2); __key(S2, 'KeyQ', 1000); S2.time.now = 1000; campPanelsPaint(S2, 1000);`);
  check('a row put in the table is drawn at the end of the list (no line of drawing code knows it), with its own digit', J('__rows(S2).length') === J(`campPanelList(S2.camp, 'cruiser').length`) && J('__rows(S2)[__rows(S2).length - 1].name') === 'Ninth row' && J('__rows(S2)[__rows(S2).length - 1].cap') === String(J('__rows(S2).length')));
  g.run(`__T.rows.pop(); CAMP_PANELS.panels.push({ id: 'xl', side: 'left', key: '', code: '', title: 'EXTRA', tab: '', name: 'the extra list', rows: [{ id: 'x1', order: 'recall', label: 'A row of the extra list', help: 'From the data' }] }); window.S9 = __scene(); campPanelsInstall(S9); campPanelGo(S9.pn, S9.camp, 'xl'); campPanelsPaint(S9, 0); window.__x2 = [S9.pnl.title.t, S9.pnl.count.t, __rows(S9)[0].name, S9.pnl.keys.t]; CAMP_PANELS.panels.pop();`);
  check('a whole list put in the table is drawn like the others, with no line of code: its heading, its one row and its foot (a list that is not numbered says Up, Down, Enter)', J('__x2[0]') === 'EXTRA' && J('__x2[1]') === '1 / 1' && J('__x2[2]') === 'A row of the extra list' && /Enter/.test(J('__x2[3]')));
  check('and the table is as it was: four lists with their rows (cruiser 10, fleet pick 4, convoy, dock)', J(`CAMP_PANELS.panels.length`) === 4 && J(`CAMP_PANELS.panels.map(p => p.rows.length).join()`) === '10,4,4,2');
  const objs = J(`S.pnl.objs.map(o => o.sf)`);
  check('every object of the lists (the key caps too) has scroll factor 0: it is on the camera that never zooms (src/camzoom.js sorts by it), so - = and the wheel never scale them', objs.length === 1 + 2 + 4 * J('CAMP_PANELS.show') + 2 && objs.every(sf => sf === 0), objs.length);
  check('the lists are drawn over the map (their depth)', K.depth > 156);
  const sc = src('src/campaignscene.js'), cr = sc.slice(sc.indexOf('  create() {'), sc.indexOf('  get camzoomHold()'));
  check('the bottom key line has a thin backing strip under it, over the whole width, on the screen\'s camera, below the text', /this\.keysBack = this\.add\.rectangle\(W \/ 2, H - 35, W, 26, 0x02060d, 0\.75\)\.setScrollFactor\(0\)\.setDepth\(99\)/.test(cr) && /keys: this\.add\.text\(CAMP\.corner\.edge - CAMP\.corner\.ink, H - 44, campKeyLine\(\)[^;]*\.setScr/.test(cr));
  check('the scene gives the lists the time of the scene, and they are painted every frame (no call plate is painted)', /campPanelsPaint\(this, this\.time\.now\)/.test(sc) && !/campCallPaint/.test(sc));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN LISTS UI FAIL (${failed} of ${n})` : `\nCAMPAIGN LISTS UI PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
