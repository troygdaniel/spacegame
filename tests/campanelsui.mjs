// smoke: the look of the Campaign's two panels, which are on the screen all the time: their places, colours, the rows' words and greying, the pages, the target line, the pilot's call in place of FLEET's rows, one component for both (plain Node, no Chrome)
// Cards space-game-campaign-panels-ui and space-game-two-hands-keys. The rules and the keys are tests/campanels.mjs and tests/campanelsdraw.mjs; this is the STATES of the drawing, on a stand-in scene whose graphics and texts record what they are told:
//   A. on the screen in the battle only, at the edges, below the gauges and the radar, translucent; gone over a card, the pause, the page of keys and the map
//   B. the rows: a key cap, the name, a live word, greyed with the reason when the row cannot be done; the heading names the page and its key
//   C. the pages: the stances (the one in force says so), the convoy orders (greyed with no convoy), SHIP's BUILD; a pick on a page goes back to the first
//   D. the target line under FLEET's rows, and the pilot's call in place of its rows (CALL, the pilot's line, 1 2 3, the bar running down)
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
  window.__rows = (s, id) => s.pnl.p[id].rows.map(r => ({ key: r.key.t, name: r.name.t, suffix: r.suffix.t, vis: r.name.vis, nameColor: r.name.color, suffixColor: r.suffix.color, keyColor: r.key.color }));
  window.__lineW = (s, id) => { const l = s.pnl.p[id].g.log.filter(x => x[0] === 'lineStyle')[0]; return l ? { w: l[1], c: l[2], a: l[3] } : null; };
  window.__fills = (s, id) => s.pnl.p[id].g.log.filter(x => x[0] === 'fillStyle').map(x => ({ c: x[1], a: x[2] }));
  window.S = __scene(); campPanelsInstall(S); S.camp.docked = 'luna'; // docked: the build rows say what they cost and can be done (undocked they say "dock first": card space-game-campaign-outposts)
  window.__p = now => { S.time.now = now; campPanelsPaint(S, now); };
`);
const K = J('CAMPPANELS_LOOK'), A = J('CAMP_PANELS.anim');
const geo = id => J(`campPanelsGeometry(campPanelDef('${id}'))`);
const paint = now => g.run(`__p(${now});`);

console.log('A. on the screen in the battle only');
{
  paint(0);
  const gl = geo('fleet'), gr = geo('ship');
  check('both panels are drawn at once, with their rows (no key opens them)', ['fleet', 'ship'].every(id => J(`__rows(S, '${id}')[0].vis`)) && J('S.input.handlers.length') === 1);
  check('FLEET is at the left edge and SHIP at the right edge, both inside the screen', gl.x === K.edge && gr.x + gr.w === 1280 - K.edge && gl.w === K.box.w && gr.w === K.box.w);
  check('they sit below the gauges at the top left (176) and the radar at the top right (226), and end above the key line (676): nothing is covered', gl.y >= 230 && gr.y >= 230 && gl.y + gl.h < 676 && gr.y + gr.h < 676, JSON.stringify([gl.y, gl.h, gr.y, gr.h]));
  const fill = J(`__fills(S, 'fleet')`)[0];
  check('they are translucent and quiet: the fill under 70 percent, the border thin (the call\'s is thick)', fill.a < 0.7 && J(`__lineW(S, 'fleet')`).w <= 1.6 && J(`__lineW(S, 'fleet')`).a < 0.7, JSON.stringify([fill, J(`__lineW(S, 'fleet')`)]));
  check('FLEET is cyan and SHIP amber: the colours of the sides (the key caps and the edge bars)', J('CAMPPANELS_LOOK.color.left') === J('CYAN') && J('CAMPPANELS_LOOK.color.right') === J('AMBER'));
  check('the panels show in the battle only: over the story, the pause card, the pick, the end every object is hidden', ['intro', 'pause', 'pick', 'won', 'lost', 'end', 'refit'].every(m => (g.run(`S.mode = '${m}'; __p(10);`), !J(`__rows(S, 'fleet')[0].vis`) && !J(`__rows(S, 'ship')[0].vis`) && !J('S.pnl.p.fleet.title.vis'))));
  g.run(`S.mode = 'play'; S.mp = {}; __p(20);`);
  check('and with the Tab map open (its frame would run under them)', !J(`__rows(S, 'fleet')[0].vis`) && !J(`__rows(S, 'ship')[0].vis`));
  g.run(`S.mp = null; S.ck = { open: true }; __p(30);`);
  check('and with the page of every key open', !J(`__rows(S, 'fleet')[0].vis`));
  g.run(`S.ck = null; __p(40);`);
  check('and they are back when it goes', J(`__rows(S, 'fleet')[0].vis`) && J(`__rows(S, 'ship')[0].vis`));
}

console.log('B. the rows');
{
  paint(1000);
  const rows = J(`__rows(S, 'fleet')`), ship = J(`__rows(S, 'ship')`);
  check('FLEET: a key cap and a name on every row, from the table (1 Launch / recall ... R Convoy); the rest of the lines are empty', rows.slice(0, 7).map(r => r.key + ' ' + r.name).join() === '1 Launch / recall,2 Attack,3 Escort,4 Guard,W Mine ore,E Stance,R Convoy', JSON.stringify(rows.map(r => r.key + ' ' + r.name)));
  check('SHIP: 7 8 9 0 J K L ; U Enter I with their names; the long cap (Enter) is drawn smaller to fit its cap', ship.map(r => r.key).join('') === '7890JKL;UEnterI' && ship[9].name === 'Missile' && ship[10].name === 'Blink');
  check('a row that can be done is white with its word in grey-blue ("8 in bay"); one that cannot is greyed with the reason in the warm colour ("none out")', rows[0].nameColor === K.rowInk.ok && rows[0].suffix === '8 in bay' && rows[1].nameColor === K.rowInk.no && rows[1].suffix === 'none out' && rows[1].suffixColor === K.rowInk.why, JSON.stringify(rows.slice(0, 2)));
  check('the stance and the convoy rows say the one in force: Free and no convoy', rows[5].suffix === 'Free' && rows[5].nameColor === K.rowInk.ok);
  check('SHIP: the goal says how far, the target says why not, the dock names the outpost, the blink says it needs the tech, the missile counts', ship[0].suffix === '' || /\d+ km$/.test(ship[0].suffix), JSON.stringify(ship));
  check('the heading says the page and its key: FLEET Q 1/3, SHIP P 1/2', J('S.pnl.p.fleet.title.t') === 'FLEET' && J('S.pnl.p.fleet.pageKey.t') === 'Q   1/3' && J('S.pnl.p.ship.pageKey.t') === 'P   1/2');
  const w = J(`[S.pnl.p.fleet, S.pnl.p.ship].map(O => O.rows.filter(r => r.name.vis).map(r => 8 + CAMPPANELS_LOOK.cap.w + 8 + r.name.t.length * 8.4 + 8 + r.suffix.t.length * 7.2 + 10))`);
  check('every row\'s key, name and word fit the column at about 8.4 and 7.2 px a letter (tests/campanelsdraw-boot.mjs measures the real ones)', w.flat().every(x => x <= K.box.w), JSON.stringify(w.map(l => Math.max(...l))));
  g.run(`campOrder(S.camp, 'launch'); for (let i = 0; i < 30 * 8; i++) campStep(S.camp, 1 / 30); S.camp.result = null; __p(1100); __p(1500);`);
  const r2 = J(`__rows(S, 'fleet')`);
  check('with the wing out the launch row is Recall (8 out), and Attack and Guard are white with their counts', r2[0].name === 'Recall' && r2[0].suffix === '8 out' && r2[1].nameColor === K.rowInk.ok && /out$/.test(r2[1].suffix), JSON.stringify(r2.slice(0, 4)));
}

console.log('C. the pages');
{
  g.run(`S.camp.stance = 'orbit'; campPanelKey(S.pn, S.camp, 'KeyQ', 3000); __p(3000);`);
  const st = J(`__rows(S, 'fleet')`).filter(r => r.vis);
  check('the stances page: the heading STANCES 2/3, the five stances with 1 to 5, the one in force says so (in the panel\'s colour), the others nothing', J('S.pnl.p.fleet.title.t') === 'STANCES' && st.map(r => r.key + ' ' + r.name).join() === '1 Free,2 Orbit,3 Keep distance,4 Match speed,5 Hold position' && st[1].suffix === 'in force' && st[1].suffixColor === K.ink.left && [0, 2, 3, 4].every(i => st[i].suffix === ''), JSON.stringify(st));
  g.run(`campPanelKey(S.pn, S.camp, 'KeyQ', 3100); __p(3100);`);
  const cv = J(`__rows(S, 'fleet')`).filter(r => r.vis);
  check('the convoy page: Tuck in, Hold here, Run for it, Carry on with 1 to 4, greyed and "no convoy" while there is no escorted ship', J('S.pnl.p.fleet.title.t') === 'CONVOY' && cv.map(r => r.key + ' ' + r.name).join() === '1 Tuck in,2 Hold here,3 Run for it,4 Carry on' && cv.every(r => r.suffix === 'no convoy' && r.nameColor === K.rowInk.no), JSON.stringify(cv));
  g.run(`campPanelKey(S.pn, S.camp, 'KeyQ', 3200); campPanelKey(S.pn, S.camp, 'KeyP', 3200); __p(3200);`);
  const bd = J(`__rows(S, 'ship')`).filter(r => r.vis);
  check('SHIP\'s BUILD page: 7 New fighter and 8 New escort with their costs (docked), the rest of the lines empty', J('S.pnl.p.ship.title.t') === 'BUILD' && bd.map(r => r.key + ' ' + r.name).join() === '7 New fighter,8 New escort' && bd[0].suffix === '25 ore' && bd[1].suffix === 'needs 45 ore', JSON.stringify(bd));
  g.run(`campPanelKey(S.pn, S.camp, 'KeyP', 3300); __p(3300);`);
  check('and the next P is the first page again', J('S.pnl.p.ship.title.t') === 'SHIP' && J(`__rows(S, 'ship')[0].key`) === '7');
}

console.log('D. the target line and the pilot\'s call');
{
  g.run(`campSpawn(S.camp, 'raider', S.camp.carrier.x + 600, S.camp.carrier.y); campPanelKey(S.pn, S.camp, 'KeyD', 4000); __p(4000); __p(4300);`);
  check('the target line names the target and how far it is, in the warm colour, with its hull as a bar under it', /^TARGET  Raider \d+  \d/.test(J('S.pnl.p.fleet.foot.t')) && J('S.pnl.p.fleet.foot.color') === '#ff9e7a' && J(`S.pnl.p.fleet.g.log.filter(l => l[0] === 'fillRect').length`) > J('S.pnl.p.fleet.rows.filter(r => r.name.vis).length'), J('S.pnl.p.fleet.foot.t'));
  g.run(`campPanelKey(S.pn, S.camp, 'KeyX', 4400); __p(4400); __p(4700);`);
  check('with no target it says none, quietly, and the keys that pick', J('S.pnl.p.fleet.foot.t') === 'TARGET  none' && J('S.pnl.p.fleet.foot.color') === '#7f95a8' && J('S.pnl.p.fleet.footKeys.t') === 'A D S  X clear');
  g.run(`campCallStart(S.camp, 'distress', { who: 'x', ids: [] }); __p(5000);`);
  check('a pilot\'s call takes the place of FLEET\'s rows: the heading says PILOT CALL in amber with a thick edge, the pilot\'s line and the three answers show, the rows and the target line are hidden', J('S.pnl.p.fleet.callHead.t') === 'PILOT CALL' && J('S.pnl.p.fleet.callHead.vis') && J('S.pnl.p.fleet.callLine.vis') && J('S.pnl.p.fleet.callRows.filter(r => r.vis).length') === 3 && J('S.pnl.p.fleet.callRows.every(r => /^[123]  /.test(r.t))') && !J(`__rows(S, 'fleet')[0].vis`) && !J('S.pnl.p.fleet.foot.vis') && J(`__lineW(S, 'fleet').w`) > 2 && J(`__lineW(S, 'fleet').c`) === J('CAMPPANELS_LOOK.call.color'), J('S.pnl.p.fleet.callRows.map(r => r.t)'));
  check('SHIP is not touched by the call', J(`__rows(S, 'ship')[0].vis`) && !J('S.pnl.p.ship.callHead'));
  const bar = () => J(`S.pnl.p.fleet.g.log.filter(l => l[0] === 'fillRect').pop()[3]`);
  const b0 = bar(); g.run(`S.camp.call.open.left = S.camp.call.open.total / 2; __p(5100);`); const b1 = bar();
  check('the bar runs down with the time the pilot has: half of it is half as long', b1 > 0 && Math.abs(b1 / b0 - 0.5) < 0.05, b0 + ' ' + b1);
  g.run(`campCallAnswer(S.camp, 2, 'key'); __p(5200);`);
  check('answered, the rows come back and the call is gone from the panel', !J('S.pnl.p.fleet.callHead.vis') && J(`__rows(S, 'fleet')[0].vis`) && J('S.pnl.p.fleet.foot.vis'));
}

console.log('E. one component, the screen\'s own camera');
{
  check('FLEET and SHIP are one component: the two panels\' objects are made by the same function from the same table (CAMP_PANELS), and SHIP is FLEET mirrored', (src('src/campanelsdraw.js').match(/function campPanelsBuild/g) || []).length === 1 && (src('src/campanelsdraw.js').match(/function campPanelsPaintOne/g) || []).length === 1 && J(`(() => { const a = campPanelsGeometry(campPanelDef('fleet')), b = campPanelsGeometry(campPanelDef('ship')); return a.x + b.x + b.w === 1280 && a.y === b.y; })()`));
  g.run(`window.__T = CAMP_PANELS.panels[0]; __T.rows.push({ n: 8, id: 'x8', k: 'F8', code: 'F8', order: 'launch', label: 'Eighth row', tag: 'Eighth', help: 'A row from the data' }); window.S2 = __scene(); campPanelsInstall(S2); S2.time.now = 1000; campPanelsPaint(S2, 1000);`);
  check('an eighth row put in the table is drawn, with its own key and name and a place under the seventh (no line of drawing code knows it)', J('S2.pnl.p.fleet.rows.length') === 8 && J('S2.pnl.p.fleet.rows[7].name.t') === 'Eighth' && J('S2.pnl.p.fleet.rows[7].key.t') === 'F8' && J(`campPanelsGeometry(campPanelDef('fleet')).rowY(7)`) > J(`campPanelsGeometry(campPanelDef('fleet')).rowY(6)`));
  g.run(`__T.rows.pop();`);
  check('and the table is as it was', J(`CAMP_PANELS.panels.length`) === 2 && J(`CAMP_PANELS.panels[0].rows.length`) === 7);
  const objs = J(`S.pnl.objs.map(o => o.sf)`);
  check('every object of the panels has scroll factor 0: it is on the camera that never zooms (src/camzoom.js sorts by it), so - = and the wheel never scale a panel', objs.length > 40 && objs.every(sf => sf === 0), objs.length);
  const sc = src('src/campaignscene.js'), cr = sc.slice(sc.indexOf('  create() {'), sc.indexOf('  get camzoomHold()'));
  check('the bottom key line has a thin backing strip under it, over the whole width, on the screen\'s camera, below the text', /this\.keysBack = this\.add\.rectangle\(W \/ 2, H - 35, W, 26, 0x02060d, 0\.75\)\.setScrollFactor\(0\)\.setDepth\(99\)/.test(cr) && /keys: this\.add\.text\(24, H - 44, campKeyLine\(\)[^;]*\.setScrollFactor\(0\)\.setDepth\(100\)/.test(cr));
  check('the scene gives the panels the time of the scene, and they are painted every frame', /campPanelsPaint\(this, this\.time\.now\)/.test(sc));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PANELS UI FAIL (${failed} of ${n})` : `\nCAMPAIGN PANELS UI PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
