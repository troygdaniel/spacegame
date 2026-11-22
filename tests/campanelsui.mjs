// smoke: the look of the Campaign's two lists: hidden until Q or P, the open one at its edge with its heading, its rows' words and greying, the highlight's bar, the mark of what is in force, the scrolling window and its foot; the target's line, the pilot's call in the middle (plain Node, no Chrome)
// Card one-list-keys (Troy, 22 Nov 2026: "one list per hand"), after space-game-campaign-panels-ui. The rules and the keys are tests/campanels.mjs and tests/campanelsdraw.mjs; this is the STATES of the drawing, on a stand-in scene whose graphics and texts record what they are told:
//   A. nothing but the target's line until a list is opened; the open list at its edge, below the gauges and the radar, a solid plate edged in its side's colour; gone over a card, the pause, the page of keys and the map
//   B. the rows: the name (no key cap), a live word, greyed with the reason when the row cannot be done; the highlighted row has the bright bar; the heading names the list, its key and where the highlight is
//   C. what is in force is marked (a stance, a convoy order); the convoy orders greyed with no ship to take them; the window scrolls and the foot says how many rows are below; the build rows where ships are built aboard
//   D. the target's line under the radar, and the pilot's call: a small amber list low in the middle with its own highlight, which waits, dimmed, while a Q or P list has the arrows and Enter
//   E. one component and one table: a row added to the table is drawn; every object is on the screen's own camera (scroll factor 0); the key line has a backing strip
// Run: node tests/campanelsui.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
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
  window.__rows = s => s.pnl.rows.map(r => ({ name: r.name.t, suffix: r.suffix.t, vis: r.name.vis, nameColor: r.name.color, suffixColor: r.suffix.color })).filter(r => r.vis); // the rows on the screen
  window.__lineW = s => { const l = s.pnl.g.log.filter(x => x[0] === 'lineStyle')[0]; return l ? { w: l[1], c: l[2], a: l[3] } : null; };
  window.__fills = s => s.pnl.g.log.filter(x => x[0] === 'fillStyle').map(x => ({ c: x[1], a: x[2] }));
  window.__key = (s, code, now) => campPanelKey(s.pn, s.camp, code, now);
  window.__to = (s, panel, id, now) => { const i = campPanelList(s.camp, panel).findIndex(r => r.id === id); campPanelClose(s.pn); campPanelKey(s.pn, s.camp, campPanelDef(panel).code, now); for (let k = 0; k < i; k++) campPanelKey(s.pn, s.camp, 'ArrowDown', now); return i; }; // open a list and put the highlight on a row
  window.S = __scene(); campPanelsInstall(S);
  window.__p = now => { S.time.now = now; campPanelsPaint(S, now); };
`);
const K = J('CAMPPANELS_LOOK'), A = J('CAMP_PANELS.anim');
const geo = id => J(`campPanelsGeometry(campPanelDef('${id}'))`);
const paint = now => g.run(`__p(${now});`);

console.log('A. on the screen in the battle only, and only when asked for');
{
  paint(0);
  const gl = geo('fleet'), gr = geo('ship');
  check('until a key opens one, no list is drawn: no heading, no row, no plate; the pointer is listened for', J('__rows(S).length') === 0 && !J('S.pnl.title.vis') && !J('S.pnl.count.vis') && !J('S.pnl.keys.vis') && J(`S.pnl.g.log.filter(l => /Rect$/.test(l[0])).length`) === 0 && J('S.input.handlers.length') === 1);
  g.run(`__key(S, 'KeyQ', 0); __p(0);`);
  check('Q: the fleet list is drawn, with its rows', J('__rows(S).length') === J('CAMP_PANELS.show') && J('S.pnl.title.vis') && J('S.pnl.title.x') === gl.x + 12);
  check('the fleet list is at the left edge and the ship list at the right edge, both inside the screen', gl.x === K.edge && gr.x + gr.w === 1280 - K.edge && gl.w === K.box.w && gr.w === K.box.w);
  check('they sit below the gauges at the top left (176) and the radar at the top right (226), and end above the key line (676): nothing is covered', gl.y >= 230 && gr.y >= 230 && gl.y + gl.h < 676 && gr.y + gr.h < 676, JSON.stringify([gl.y, gl.h, gr.y, gr.h]));
  const fill = J(`__fills(S)`)[0], plate = J(`S.pnl.g.log.filter(l => l[0] === 'fillRoundedRect')[0]`);
  check('the open list is a plate you read (it is there because you asked): a dark fill of 90 percent over the whole of its place, edged 2 px in its side\'s colour (cyan at the left)', fill.a === 0.9 && fill.c === 0x04101c && plate.slice(1, 5).join() === [gl.x, gl.y, gl.w, gl.h].join() && J(`__lineW(S)`).w === 2 && J(`__lineW(S)`).c === J('CYAN'), JSON.stringify([fill, plate, J(`__lineW(S)`)]));
  g.run(`__key(S, 'KeyP', 5); __p(5);`);
  check('the fleet list is cyan and the ship list amber: the colours of the sides (the edge, the heading, the highlight\'s bar)', J('CAMPPANELS_LOOK.color.left') === J('CYAN') && J('CAMPPANELS_LOOK.color.right') === J('AMBER') && J(`__lineW(S)`).c === J('AMBER') && J('S.pnl.title.color') === K.ink.right && J(`S.pnl.g.log.filter(l => l[0] === 'fillRoundedRect')[0].slice(1, 5).join()`) === [gr.x, gr.y, gr.w, gr.h].join());
  check('the lists show in the battle only: over the story, the pause card, the pick, the end every object is hidden (the target\'s line too) and an open list is closed', ['intro', 'pause', 'pick', 'won', 'lost', 'end', 'refit'].every(m => (g.run(`S.mode = 'play'; __key(S, 'KeyQ', 8); __p(8); S.mode = '${m}'; __p(10);`), J(`__rows(S).length`) === 0 && !J('S.pnl.title.vis') && !J('S.pnl.tgt.vis') && J('S.pnl.objs.every(o => o === S.pnl.g || !o.vis)') && J('S.pnl.g.log.length') === 0 && J('S.pn.open') === '')));
  g.run(`S.mode = 'play'; __key(S, 'KeyQ', 15); __p(15); S.mp = {}; __p(20);`);
  check('and with the Tab map open (its frame would run under them)', J(`__rows(S).length`) === 0 && !J('S.pnl.title.vis') && !J('S.pnl.tgt.vis'));
  g.run(`S.mp = null; S.ck = { open: true }; __p(30);`);
  check('and with the page of every key open', J(`__rows(S).length`) === 0 && !J('S.pnl.tgt.vis'));
  g.run(`S.ck = null; __p(40);`);
  check('and they are back when it goes', J(`__rows(S).length`) === J('CAMP_PANELS.show') && J('S.pnl.tgt.vis'));
  g.run(`__key(S, 'Escape', 50); __p(50);`);
  check('Esc: the list is gone from the screen again, the target\'s line stays', J(`__rows(S).length`) === 0 && !J('S.pnl.title.vis') && J('S.pnl.tgt.vis') && J(`S.pnl.g.log.filter(l => l[0] === 'fillRoundedRect').length`) === 0);
}

console.log('B. the rows');
{
  g.run(`__key(S, 'KeyQ', 1000); __p(1000);`);
  const rows = J(`__rows(S)`);
  check('the fleet list: the name on every row, from the table, in its order (Attack the target ... Convoy: hold here); a row has no key cap: it is a name and a word', rows.map(r => r.name).join('|') === 'Attack the target|Launch the wing|Escort the convoy|Guard the cruiser|Recall the wing|Mine ore|Convoy: tuck in|Convoy: run for it|Convoy: hold here' && J('Object.keys(S.pnl.rows[0]).join()') === 'name,suffix', JSON.stringify(rows.map(r => r.name)));
  check('a row that can be done is white with its word in grey-blue ("8 in bay"); one that cannot is greyed with the reason in the warm colour ("none out")', rows[1].nameColor === K.rowInk.ok && rows[1].suffix === '8 in bay' && rows[1].suffixColor === K.rowInk.suffix && rows[2].nameColor === K.rowInk.no && rows[2].suffix === 'none out' && rows[2].suffixColor === K.rowInk.why, JSON.stringify(rows.slice(0, 3)));
  const bars = () => J(`(() => { const L = S.pnl.g.log, out = []; for (let i = 0; i < L.length - 1; i++) if (L[i][0] === 'fillStyle' && L[i + 1][0] === 'fillRoundedRect' && L[i + 1][4] === CAMPPANELS_LOOK.box.row) out.push({ c: L[i][1], a: L[i][2], y: L[i + 1][2] }); return out; })()`);
  check('the highlighted row has the bar in the list\'s colour, dim while the row cannot be done (Attack, no fighter out): the other rows have a dark bar', (() => { const b = bars(); return b.length === 9 && b[0].c === J('CYAN') && b[0].a === 0.4 && b.slice(1).every(x => x.c === 0x0a1a2a) && rows[0].nameColor === K.rowInk.no && rows[0].suffixColor === K.rowInk.why; })(), JSON.stringify(bars().slice(0, 2)));
  g.run(`__key(S, 'ArrowDown', 1010); __p(1010);`);
  check('on a row that can be done the bar is bright and the words on it are dark (Launch the wing)', (() => { const b = bars(), r = J(`__rows(S)`); return b[1].c === J('CYAN') && b[1].a === 0.95 && b[0].c === 0x0a1a2a && r[1].nameColor === K.rowInk.at && r[1].suffixColor === K.rowInk.at && r[0].nameColor === K.rowInk.no; })(), JSON.stringify(bars().slice(0, 2)));
  check('the bar is on the row\'s own line: the rows are a row and a gap apart, the first under the heading', (() => { const b = bars(), G = J(`[0, 1, 8].map(i => campPanelsGeometry(campPanelDef('fleet')).rowY(i))`); return b[0].y === G[0] && b[1].y === G[1] && b[8].y === G[2] && G[1] - G[0] === K.box.row + K.box.gap && G[0] === K.top + K.box.head + K.box.pad; })());
  check('the heading says the list\'s key and name, in the side\'s ink, and where the highlight is: "Q   FLEET ORDERS", "2 / 15"', J('S.pnl.title.t') === 'Q   FLEET ORDERS' && J('S.pnl.title.color') === K.ink.left && J('S.pnl.count.t') === '2 / 15');
  check('the foot says the highlighted row\'s state in full, and the keys of the list', J('S.pnl.more.t') === '6 fighters, 2 escorts' && J('S.pnl.more.color') === '#9fbdd1' && J('S.pnl.keys.t') === 'Up Down move   Enter order   Q or Esc close' && (g.run(`__key(S, 'ArrowUp', 1020); __p(1020);`), J('S.pnl.more.t') === 'No fighters out' && J('S.pnl.more.color') === K.rowInk.why));
  g.run(`__key(S, 'KeyP', 1030); __p(1030);`);
  const ship = J(`__rows(S)`);
  check('the ship list: the goal says how far, the target says why not, the emergency what it gives, the dock names the outpost in range; six rows here (no blink without the tech, no build rows where ships are built docked)', ship.map(r => r.name).join('|') === 'Fly to the goal|Fly to the target|Fast burn to the goal|Fast burn to the target|Emergency shields|Dock at the outpost' && /^\d+ km$/.test(ship[0].suffix) && ship[1].suffix === 'no target' && ship[1].nameColor === K.rowInk.no && ship[4].suffix === '10 s', JSON.stringify(ship));
  check('"P   SHIP ORDERS", "1 / 6", and the foot names P as the key that closes it', J('S.pnl.title.t') === 'P   SHIP ORDERS' && J('S.pnl.count.t') === '1 / 6' && J('S.pnl.keys.t') === 'Up Down move   Enter order   P or Esc close');
  const w = J(`[campNew('home', [], { seed: 1 }), campNew(1, [], { seed: 1, mission: 1 }), campNew(2, ['blink'], { seed: 1 }), campNew(3, [], { seed: 1 })].flatMap(C => ['fleet', 'ship'].flatMap(id => campPanelRows(C, id).map(r => 14 + r.label.length * 8.4 + 8 + (r.short || '').length * 7.2 + 12)))`);
  check('every row\'s name and word fit the list at about 8.4 and 7.2 px a letter, in a level of each kind (tests/campanelsdraw-boot.mjs measures the real ones)', w.length >= 60 && w.every(x => x <= K.box.w), String(Math.max(...w)));
  g.run(`campOrder(S.camp, 'launch'); for (let i = 0; i < 30 * 8; i++) campStep(S.camp, 1 / 30); S.camp.result = null; __key(S, 'KeyQ', 1100); __p(1100); __p(1500);`);
  const r2 = J(`__rows(S)`);
  check('with the wing out Launch is greyed (all out) and Recall is white (8 out): two rows, not one that changes its name; Attack and Guard are ready with their counts', r2[1].name === 'Launch the wing' && r2[1].nameColor === K.rowInk.no && r2[1].suffix === 'all out' && r2[4].name === 'Recall the wing' && r2[4].nameColor === K.rowInk.ok && r2[4].suffix === '8 out' && /out$/.test(r2[0].suffix) && r2[3].nameColor === K.rowInk.ok, JSON.stringify(r2.slice(0, 5)));
  g.run(`campPanelClose(S.pn); __key(S, 'KeyQ', 2000); window.__rf = __key(S, 'ArrowDown', 2000) && __key(S, 'Enter', 2000); __p(2040);`);
  check('a row lights for ' + A.flash + ' ms when Enter gives it (here refused: all of the wing is out, so the list is still open to show it): a white wash on the row, gone after', (() => { const on = J(`S.pnl.g.log.filter(l => l[0] === 'fillStyle' && l[1] === CAMPPANELS_LOOK.flash).length`); g.run(`__p(2000 + CAMP_PANELS.anim.flash + 40);`); return J('__rf.ran') && !J('__rf.ok') && J('S.pn.lit.launch') === 2000 && on === 1 && J(`S.pnl.g.log.filter(l => l[0] === 'fillStyle' && l[1] === CAMPPANELS_LOOK.flash).length`) === 0 && J('S.pn.open') === 'fleet'; })());
}

console.log('C. what is in force, the window, the rows a mission has');
{
  g.run(`S.camp.stance = 'orbit'; window.__i = __to(S, 'fleet', 'free', 3000); __p(3000);`);
  const st = J(`__rows(S)`);
  check('the five stances are five rows at the end of the fleet list; the one in force says so in the list\'s ink and has the mark at its left, the others say nothing', st.slice(-4).map(r => r.name).join('|') === 'Convoy: run for it|Convoy: hold here|Convoy: carry on|Stance: fight freely' && (g.run(`__key(S, 'ArrowDown', 3010); __key(S, 'ArrowDown', 3010); __p(3010);`), (() => { const r = J(`__rows(S)`), m = J(`S.pnl.g.log.filter(l => l[0] === 'fillRect' && l[3] === 3)`); return r.slice(-3).map(x => x.name + ':' + x.suffix).join('|') === 'Stance: fight freely:|Stance: orbit the target:in force|Stance: keep distance:' && r[7].suffixColor === K.ink.left && m.length === 1 && m[0][2] === J(`campPanelsGeometry(campPanelDef('fleet')).rowY(7)`) + 4; })()), JSON.stringify(J(`__rows(S)`).slice(-3)));
  check('the window has scrolled with the highlight (13 / 15): four rows are above, two below, and the foot says so when the highlighted row has no state of its own ("2 more below")', J('S.pnl.count.t') === '13 / 15' && J('S.pn.top') === 4 && J('S.pnl.more.t') === '2 more below' && J(`__rows(S)[0].name`) === 'Recall the wing');
  g.run(`__key(S, 'ArrowDown', 3020); __key(S, 'ArrowDown', 3020); __p(3020);`);
  check('at the last row nothing is below and the foot is empty; the list is still nine rows high', J('S.pnl.count.t') === '15 / 15' && J('S.pnl.more.t') === '' && J(`__rows(S).length`) === 9 && J(`__rows(S)[8].name`) === 'Stance: hold position');
  g.run(`__to(S, 'fleet', 'ctuck', 3100); __p(3100);`);
  const cv = J(`__rows(S)`).filter(r => /^Convoy: /.test(r.name));
  check('the convoy orders are four rows: Tuck in, Run for it, Hold here, Carry on, greyed and "no convoy" while there is no escorted ship (the reason at the foot)', cv.map(r => r.name).join('|') === 'Convoy: tuck in|Convoy: run for it|Convoy: hold here|Convoy: carry on'.split('|').slice(0, cv.length).join('|') && cv.length >= 3 && cv.every(r => r.suffix === 'no convoy' && r.nameColor === K.rowInk.no) && J('S.pnl.more.t') === 'No escorted ships', JSON.stringify(cv));
  g.run(`window.S5 = __scene(); S5.camp = campNew(1, [], { seed: 1, mission: 1 }); campOrder(S5.camp, 'convoy', 'tuck in'); campPanelsInstall(S5); __to(S5, 'fleet', 'ctuck', 0); campPanelsPaint(S5, 0);`);
  check('with ships to take them, the convoy order in force is marked ("in force", dark on the bright bar while highlighted) and the others count the ships', (() => { const r = J('__rows(S5)').filter(x => /^Convoy: /.test(x.name)); return r[0].suffix === 'in force' && r[0].nameColor === K.rowInk.at && /^\d ships?$/.test(r[1].suffix) && r[1].nameColor === K.rowInk.ok && J(`S5.pnl.g.log.filter(l => l[0] === 'fillRect' && l[3] === 3).length`) >= 1; })(), JSON.stringify(J('__rows(S5)')));
  g.run(`window.S6 = __scene(); S6.camp = campNew(2, [], { seed: 1 }); campPanelsInstall(S6); __key(S6, 'KeyQ', 0); campPanelsPaint(S6, 0); window.__f6 = S6.pnl.count.t; __key(S6, 'KeyP', 0); campPanelsPaint(S6, 0);`);
  check('a level with no convoy draws no convoy row: the fleet list is eleven rows there ("1 / 11"), the stances straight after Mine ore', J('__f6') === '1 / 11' && J(`campPanelRows(S6.camp, 'fleet').map(r => r.label).slice(5, 7).join('|')`) === 'Mine ore|Stance: fight freely');
  g.run(`window.S7 = __scene(); S7.camp = campNew(3, [], { seed: 1 }); campPanelsInstall(S7); __key(S7, 'KeyP', 0); campPanelsPaint(S7, 0);`);
  const bd = J(`__rows(S7)`);
  check('where ships are built aboard (level 3) the ship list ends with Build a fighter and Build an escort with their costs, after "Repair the hull"', bd.map(r => r.name).slice(5).join('|') === 'Repair the hull|Build a fighter|Build an escort' && bd[6].suffix === '25 ore' && bd[7].suffix === 'needs 45 ore' && bd[7].nameColor === K.rowInk.no && J('S7.pnl.count.t') === '1 / 8', JSON.stringify(bd));
  g.run(`__key(S, 'KeyQ', 3300); __key(S, 'KeyQ', 3300); __p(3300);`);
  check('a list opened again is at its top row, whatever row it was left on', J('S.pn.open') === 'fleet' && J('S.pnl.count.t') === '1 / 15' && J(`__rows(S)[0].name`) === 'Attack the target');
  g.run(`campPanelClose(S.pn); S.camp.stance = 'free';`);
}

console.log('D. the target\'s line and the pilot\'s call');
{
  g.run(`S.camp.ships = S.camp.ships.filter(u => u.team !== 'earth' || u.kind === 'carrier' || (u.kind !== 'fighter' && u.kind !== 'escort')); campSpawn(S.camp, 'raider', S.camp.carrier.x + 600, S.camp.carrier.y); __key(S, 'KeyD', 4000); __p(4000); __p(4300);`);
  check('the target\'s line names the target and how far it is, in the warm colour, with its hull as a bar under it and the key that lets it go; it is under the radar, at the right, with no list open', /^TARGET  Raider \d+  \d/.test(J('S.pnl.tgt.t')) && J('S.pnl.tgt.color') === '#ff9e7a' && J(`S.pnl.g.log.filter(l => l[0] === 'fillRect').length`) === 2 && J('S.pnl.tgtKeys.t') === 'X clear' && J('S.pnl.tgt.x') === 1280 - K.tgt.x && J('S.pnl.tgt.y') === K.tgt.y && K.tgt.y >= 226 && K.tgt.y + 18 < K.top && J('S.pn.open') === '', J('S.pnl.tgt.t'));
  check('the hull bar is as long as the share of hull the target has left', (() => { g.run(`S.camp.by[S.camp.tgt].hp /= 2; __p(4350);`); const b = J(`S.pnl.g.log.filter(l => l[0] === 'fillRect')`); return b[0][3] === K.tgt.w && Math.abs(b[1][3] - K.tgt.w / 2) <= 1; })());
  g.run(`__key(S, 'KeyQ', 4360); __p(4360);`);
  check('it is on the screen with a list open too (A D S X work in both)', J('S.pnl.tgt.vis') && /^TARGET  Raider/.test(J('S.pnl.tgt.t')) && J('S.pnl.title.vis'));
  g.run(`__key(S, 'KeyX', 4400); __p(4400); __p(4700);`);
  check('with no target it says none, quietly, and the keys that pick', J('S.pnl.tgt.t') === 'TARGET  none' && J('S.pnl.tgt.color') === '#7f95a8' && J('S.pnl.tgtKeys.t') === 'A D S pick a target' && J(`S.pnl.g.log.filter(l => l[0] === 'fillRect' && l[4] === CAMPPANELS_LOOK.tgt.bar).length`) === 0);
  g.run(`campPanelClose(S.pn); campCallStart(S.camp, 'distress', { who: 'x', ids: [] }); __p(5000); campCallPaint(S);`);
  const U = J('CAMPCALL_UI'), cx = Math.round(1280 / 2 - U.w / 2), cy = 720 - U.lift, def = J('campCallView(S.camp).def');
  check('a pilot\'s call is a small amber plate low in the middle, not in a list\'s place: headed PILOT CALL, the pilot\'s line, three answers, clear of both lists and above the key line', J('S.callUi.head.t') === 'PILOT CALL' && J('S.callUi.on') === true && J('S.callUi.call.t.length') > 8 && J('S.callUi.rows.filter(r => r.vis && r.t).length') === 3 && J('S.callUi.x') === cx && J('S.callUi.y') === cy && cx > geo('fleet').x + geo('fleet').w && cx + U.w < geo('ship').x && cy + U.h < 676 && J(`S.callUi.edge.log.find(l => l[0] === 'lineStyle')[2]`) === 0xffd37a, JSON.stringify(J('S.callUi.rows.map(r => r.t)')));
  check('the answers have no digit before them (a digit answers nothing): the pilot\'s own pick is marked "(if you wait)", and the foot says the keys: Up Down pick, Enter answer', J('S.callUi.rows.every(r => !/^[0-9]/.test(r.t))') && J(`S.callUi.rows.map(r => / \\(if you wait\\)$/.test(r.t)).indexOf(true)`) === def - 1 && J(`S.callUi.rows.filter(r => /if you wait/.test(r.t)).length`) === 1 && J('S.callUi.foot.t') === 'Up Down pick   Enter answer');
  check('the highlight starts on the pilot\'s own pick, so an Enter pressed by accident does what silence would have done: the bright bar is on that row, its words dark', J('campCallSel(S)') === def - 1 && J('S.callUi.hi.vis') === true && J('S.callUi.hi.y') === cy + 50 + (def - 1) * U.row && J(`S.callUi.rows.map(r => r.color).join()`) === [0, 1, 2].map(i => i === def - 1 ? '#02101c' : '#9fe9ff').join() && J('campCallHasKeys(S)') === true);
  check('the lists are not touched by the call: none is open, the target\'s line is as it was, and Q still opens the fleet list', J(`__rows(S).length`) === 0 && J('S.pnl.tgt.vis') && !('callHead' in J('Object.fromEntries(Object.keys(S.pnl).map(k => [k, 1]))')));
  check('Down moves the call\'s highlight and goes round (three rows); Left and Right are swallowed; a digit, and a key of nobody, is not the call\'s and answers nothing', (() => { const at0 = J('campCallSel(S)'), d = J(`campCallKey(S, 'ArrowDown')`), at1 = J('campCallSel(S)'); J(`campCallKey(S, 'ArrowDown')`); J(`campCallKey(S, 'ArrowDown')`); const round = J('campCallSel(S)'), u = J(`campCallKey(S, 'ArrowUp')`), at2 = J('campCallSel(S)'); g.run(`campCallKey(S, 'ArrowDown'); campCallPaint(S);`); return d === true && at1 === (at0 + 1) % 3 && round === at0 && u === true && at2 === (at0 + 2) % 3 && J(`campCallKey(S, 'ArrowLeft') && campCallKey(S, 'ArrowRight')`) === true && ['Digit1', 'Digit2', 'Digit3', 'Numpad2', 'KeyB'].every(c => J(`campCallKey(S, '${c}')`) === false) && J('campCallOpen(S.camp)') === true && J('campCallSel(S)') === at0 && J('S.callUi.hi.y') === cy + 50 + at0 * U.row; })());
  const bar = () => J(`S.callUi.bar.log.filter(l => l[0] === 'setSize').pop()[1]`);
  const b0 = bar(); g.run(`S.camp.call.open.left = S.camp.call.open.total / 2; campCallPaint(S);`); const b1 = bar();
  check('the bar runs down with the time the pilot has: half of it is half as long', b1 > 0 && Math.abs(b1 / b0 - 0.5) < 0.05, b0 + ' ' + b1);
  g.run(`__key(S, 'KeyQ', 5100); __p(5100); campCallPaint(S);`);
  check('while a Q or P list is open the list has the arrows and Enter: the call waits, dimmed, its highlight gone, and says "Close the list or the map to answer"', J('campCallHasKeys(S)') === false && J('S.callUi.foot.t') === 'Close the list or the map to answer' && J('S.callUi.hi.vis') === false && J('S.callUi.back.alpha') === U.dim && J('S.callUi.rows.every(r => r.alpha === CAMPCALL_UI.dim && r.color === "#9fe9ff")') && J('S.callUi.on') === true);
  check('and its keys are the list\'s: campCallKey takes none, Down moves the LIST\'s highlight, the call is not answered', (() => { const sel = J('campCallSel(S)'); return J(`campCallKey(S, 'ArrowDown')`) === false && J(`campCallKey(S, 'Enter')`) === false && J(`__key(S, 'ArrowDown', 5110).used`) === true && J('S.pn.at') === 1 && J('campCallSel(S)') === sel && J('campCallOpen(S.camp)') === true; })());
  g.run(`__key(S, 'Escape', 5120); __p(5120); S.mp = {}; campCallPaint(S);`);
  check('the same with the map open (the map has the arrows): the call waits and says so; with the map closed it has its keys again, bright', J('campCallHasKeys(S)') === false && J('S.callUi.foot.t') === 'Close the list or the map to answer' && (g.run(`S.mp = null; campCallPaint(S);`), J('campCallHasKeys(S)') === true && J('S.callUi.foot.t') === 'Up Down pick   Enter answer' && J('S.callUi.back.alpha') === 1 && J('S.callUi.hi.vis') === true));
  check('behind a card the call has no keys (the mode is not play)', (g.run(`S.mode = 'pause';`), J('campCallHasKeys(S)') === false && J(`campCallKey(S, 'Enter')`) === false) && (g.run(`S.mode = 'play';`), true));
  g.run(`window.__n0 = S.camp.call.log.length; campCallKey(S, 'ArrowDown'); window.__want = campCallSel(S) + 1; window.__got = null; window.__ca0 = campCallAnswer; campCallAnswer = function (C, n, how) { __got = [n, how]; return __ca0.apply(null, arguments); }; window.__ans = campCallKey(S, 'Enter'); campCallAnswer = __ca0; campCallPaint(S); __p(5200);`);
  check('Enter answers with the highlighted row (its number, given as a key), and the plate is gone; with no call waiting the keys are not the call\'s', J('__ans') === true && J('campCallOpen(S.camp)') === false && J('S.camp.call.log.length') === J('__n0') + 1 && J('__got.join()') === J('__want') + ',key' && J('S.callUi.on') === false && J('S.callUi.back.vis') === false && J(`campCallKey(S, 'Enter')`) === false && J(`campCallKey(S, 'ArrowDown')`) === false, JSON.stringify(J('S.camp.call.log')));
}

console.log('E. one component, the screen\'s own camera');
{
  check('the two lists are one component: one set of objects made once from the one table (CAMP_PANELS) draws whichever is open, and the ship list\'s place is the fleet list\'s mirrored', !/function campPanelsBuild|function campPanelsPaintOne/.test(src('src/campanelsdraw.js')) && (src('src/campanelsdraw.js').match(/function campPanelsPaint\(/g) || []).length === 1 && J('S.pnl.rows.length') === J('CAMP_PANELS.show') && J(`(() => { const a = campPanelsGeometry(campPanelDef('fleet')), b = campPanelsGeometry(campPanelDef('ship')); return a.x + b.x + b.w === 1280 && a.y === b.y && a.h === b.h; })()`));
  g.run(`window.__T = CAMP_PANELS.panels[0]; __T.rows.push({ id: 'x16', order: 'launch', label: 'Sixteenth row', help: 'A row from the data' }); window.S2 = __scene(); campPanelsInstall(S2); __key(S2, 'KeyQ', 1000); __key(S2, 'ArrowUp', 1000); S2.time.now = 1000; campPanelsPaint(S2, 1000);`);
  check('a sixteenth row put in the table is drawn, with its own words on the bar of the highlight (a row the code has no short word for has none), at the end of the list (no line of drawing code knows it), and Enter gives it', J('S2.pnl.count.t') === '16 / 16' && J('__rows(S2)[8].name') === 'Sixteenth row' && J('__rows(S2)[8].suffix') === '' && J('__rows(S2)[8].nameColor') === K.rowInk.at && J(`__key(S2, 'Enter', 1010).row`) === 'x16' && J('S2.camp.launchQ.length') === 8, JSON.stringify(J('__rows(S2)').slice(-2)));
  g.run(`__T.rows.pop();`);
  check('and the table is as it was', J(`CAMP_PANELS.panels.length`) === 2 && J(`CAMP_PANELS.panels[0].rows.length`) === 15 && J(`CAMP_PANELS.panels[1].rows.length`) === 9);
  const objs = J(`S.pnl.objs.map(o => o.sf)`), call = J(`[S.callUi.back, S.callUi.edge, S.callUi.hi, S.callUi.bar, S.callUi.head, S.callUi.call, S.callUi.foot].concat(S.callUi.rows).map(o => o.sf)`);
  check('every object of the lists, the target\'s line and the call\'s plate has scroll factor 0: it is on the camera that never zooms (src/camzoom.js sorts by it), so - = and the wheel never scale them', objs.length === 1 + 2 + 2 * J('CAMP_PANELS.show') + 2 + 2 && objs.every(sf => sf === 0) && call.length === 10 && call.every(sf => sf === 0), objs.length);
  check('the lists are drawn over the map and the call\'s plate over the lists (their depths)', K.depth > 156 && J('CAMPCALL_UI.depth') > K.depth);
  const sc = src('src/campaignscene.js'), cr = sc.slice(sc.indexOf('  create() {'), sc.indexOf('  get camzoomHold()'));
  check('the bottom key line has a thin backing strip under it, over the whole width, on the screen\'s camera, below the text', /this\.keysBack = this\.add\.rectangle\(W \/ 2, H - 35, W, 26, 0x02060d, 0\.75\)\.setScrollFactor\(0\)\.setDepth\(99\)/.test(cr) && /keys: this\.add\.text\(24, H - 44, campKeyLine\(\)[^;]*\.setScrollFactor\(0\)\.setDepth\(100\)/.test(cr));
  check('the scene gives the lists the time of the scene, and they and the call are painted every frame', /campPanelsPaint\(this, this\.time\.now\)/.test(sc) && /campCallPaint\(this\)/.test(sc));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN LISTS UI FAIL (${failed} of ${n})` : `\nCAMPAIGN LISTS UI PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
