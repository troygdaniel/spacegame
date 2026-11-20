// smoke: the Campaign's two panels are collapsed tabs that open into a narrow one-line list, flash the pick twice, then collapse; a fast pick pulses the tab; two panels cross-fade; the drawing is one component for both (plain Node, no Chrome)
// Card space-game-campaign-panels-ui (Troy, from a screenshot of the open FLEET panel: a wide box that covered a lot of the screen). The rules and the keys are tests/campanels.mjs and tests/campanelsdraw.mjs and did not change; this is the STATES of the
// drawing and their timing, on a stand-in scene whose graphics and texts record what they are told:
//   A. collapsed: both tabs always on the screen in the battle, at the edges, below the gauges and the radar, narrow and translucent; gone over a card, the pause, the page of keys and the map
//   B. open: key 1 (after its 250 ms) or a click lights the tab and drops five one-line rows under it, in a column narrower than before; the live word is a few letters, greyed with the reason when the row cannot be done
//   C. the pick: the chosen row flashes twice in 160 ms, then the panel collapses; a pick before the panel was drawn pulses the tab once; Esc, any other key and a click elsewhere close it, with a short fade
//   D. two panels: a click on the other tab cross-fades them; SHIP is FLEET mirrored; one component and one table: a row added to the table is drawn
//   E. the screen's own camera: every object has scroll factor 0, so the zoom never scales a panel; the key line has a backing strip
// Run: node tests/campanelsui.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

g.run(`
  window.__said = []; toast = (s, m) => { __said.push(m); }; window.__all = [];
  window.__mk = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, gone: false, vis: true, alpha: 1, sf: null, color: '', log: [] };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => { tg.log.push([k].concat(a)); return px; }) });
    o.setText = v => { o.t = v; return px; }; o.setColor = v => { o.color = v; return px; }; o.setVisible = v => { o.vis = v; return px; }; o.setAlpha = v => { o.alpha = v; return px; }; o.setScrollFactor = v => { o.sf = v; return px; };
    o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.destroy = () => { o.gone = true; }; o.clear = () => { o.log.length = 0; return px; };
    __all.push(o); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), mode: 'play', time: { now: 0 }, add: { rectangle: (x, y) => __mk('rect', x, y), graphics: () => __mk('g'), text: (x, y, t) => __mk('text', x, y, t), container: (x, y, arr) => __mk('box', x, y) },
      input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off(e, f) { this.handlers = this.handlers.filter(h => h[1] !== f); } }, events: { once() {} } };
    s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
  window.__texts = (side) => __all.filter(o => o.kind === 'text' && o.vis && !o.gone).map(o => o.t);
  // what the graphics of a panel drew in its last frame: fills and strokes, in order
  window.__draw = (s, id) => { const O = s.pnl.p[id]; return O.g.log.map(l => ({ m: l[0], a: l.slice(1) })); };
  window.__rows = (s, id) => s.pnl.p[id].rows.map(r => ({ id: r.id, name: r.name.t, suffix: r.suffix.t, vis: r.name.vis, alpha: r.name.alpha, nameColor: r.name.color, suffixColor: r.suffix.color }));
  window.__tab = (s, id) => { const O = s.pnl.p[id]; return { cap: O.cap.vis, name: O.name.vis, nameColor: O.name.color }; };
  window.__lineW = (s, id) => { const l = s.pnl.p[id].g.log.filter(x => x[0] === 'lineStyle').pop(); return l ? { w: l[1], c: l[2], a: l[3] } : null; };
  window.__fills = (s, id) => s.pnl.p[id].g.log.filter(x => x[0] === 'fillStyle').map(x => ({ c: x[1], a: x[2] }));
  window.__key = (s, code, now) => { const r = campPanelKey(s.pn, s.camp, code, now); s.time.now = now; return r; };
  window.S = __scene(); campPanelsInstall(S);
`);
const K = J('CAMPPANELS_LOOK'), A = J('CAMP_PANELS.anim'), DELAY = J('CAMP_PANELS.delay');
const geo = id => J(`campPanelsGeometry(campPanelDef('${id}'))`);
const paint = now => g.run(`S.time.now = ${now}; campPanelsPaint(S, ${now});`);

console.log('A. collapsed: the two tabs');
{
  paint(0);
  const gl = geo('fleet'), gr = geo('ship');
  check('install makes both panels\' objects once and listens for the pointer', J('Object.keys(S.pnl.p).join()') === 'fleet,ship' && J('S.input.handlers.length') === 1 && J('S.pnl.objs.length') > 20);
  check('in the battle both tabs are on the screen with nothing open: the key cap and the name of each, no row', ['fleet', 'ship'].every(id => J(`__tab(S, '${id}')`).cap && J(`__tab(S, '${id}')`).name) && ['fleet', 'ship'].every(id => J(`__rows(S, '${id}')`).every(r => !r.vis)));
  check('the tab is narrow (110 px, about), FLEET at the left edge and SHIP at the right, both inside the screen', K.tab.w <= 120 && gl.tab.x === K.edge && gr.tab.x + gr.tab.w === 1280 - K.edge && gl.tab.w === K.tab.w && gr.tab.w === K.tab.w, JSON.stringify([gl.tab, gr.tab]));
  check('they sit below the gauges at the top left (176) and the radar at the top right (226): nothing is covered, and above the key line', gl.tab.y >= 230 && gr.tab.y >= 230 && gl.tab.y + gl.tab.h < 600);
  const fill = J(`__fills(S, 'fleet')`)[0];
  check('collapsed it is translucent and quiet: the fill under 70 percent, the border thin and under half', fill.a < 0.7 && J(`__lineW(S, 'fleet')`).w <= 1.01 && J(`__lineW(S, 'fleet')`).a < 0.5, JSON.stringify([fill, J(`__lineW(S, 'fleet')`)]));
  check('the name is FLEET and SHIP, the key caps Q and E (from the table: Q opens the left panel, E the right)', J('S.pnl.p.fleet.name.t') === 'FLEET' && J('S.pnl.p.ship.name.t') === 'SHIP' && J('campPanelDef("fleet").key') === 'Q' && J('campPanelDef("ship").key') === 'E');
  check('the tabs show in the battle only: over the story, the pause card, the pick, the end the tabs are gone', ['intro', 'pause', 'pick', 'won', 'lost', 'end', 'refit'].every(m => (g.run(`S.mode = '${m}'; campPanelsPaint(S, 10);`), !J(`__tab(S, 'fleet').cap`) && !J(`__tab(S, 'ship').cap`))) && (g.run(`S.mode = 'play'; campPanelsPaint(S, 10);`), J(`__tab(S, 'fleet').cap`)));
  g.run(`S.mp = {}; campPanelsPaint(S, 20);`);
  check('and with the Tab map open (its frame would run under them)', !J(`__tab(S, 'fleet').cap`) && !J(`__tab(S, 'ship').cap`));
  g.run(`S.mp = null; S.ck = { open: true }; campPanelsPaint(S, 30);`);
  check('and with the page of every key open', !J(`__tab(S, 'fleet').cap`));
  g.run(`S.ck = null; campPanelsPaint(S, 40);`);
}

console.log('B. open: the list under the lit tab');
{
  g.run(`S.pn = campPanelNew(); __key(S, 'KeyQ', 1000); campPanelsPaint(S, 1000);`);
  check('Q opens FLEET at once (no hold-back): the tab begins to light and the list begins to drop in, from nothing at 0 ms', J('S.pn.open') === 'fleet' && DELAY === 0 && J(`__rows(S, 'fleet')`).every(r => !r.vis || r.alpha === 0));
  paint(1000 + A.fadeIn / 2);
  check('half way (60 ms) the list is half in and the tab half lit; at 120 ms it is all in and the tab fully lit', J(`__rows(S, 'fleet')`).every(r => r.vis && near(r.alpha, 0.5, 0.01)) && (paint(1000 + A.fadeIn), J(`__rows(S, 'fleet')`).every(r => r.vis && r.alpha === 1)));
  const open = J(`__lineW(S, 'fleet')`);
  check('the tab is HIGHLIGHTED while its panel is open: a thicker, brighter border, the name white, and it stays where it is', open.w > 2 && open.a > 0.95 && J(`__tab(S, 'fleet')`).nameColor === '#ffffff' && J('S.pnl.p.fleet.name.y') === geo('fleet').tab.y + geo('fleet').tab.h / 2, JSON.stringify(open));
  const rows = J(`__rows(S, 'fleet')`), tx = J(`__texts()`);
  check('five rows under the tab, one line each: the name (Launch, Attack, Escort, Guard, Recall) and at the right a word or two of the live state', rows.length === 5 && rows.map(r => r.name).join() === 'Launch,Attack,Escort,Guard,Recall' && rows[0].suffix === '8 in bay', JSON.stringify(rows.map(r => [r.name, r.suffix])));
  check('no second line and no second big header: the old words (the bay line, "fighters, escorts", a heading in 18 px) are gone; the digits 1 to 5 are the only numbers', !tx.some(t => /bay \d\+\d|fighters,|^ore \d|shield \d/.test(t)) && ['1', '2', '3', '4', '5'].every(d => tx.includes(d)));
  const G = geo('fleet');
  check('the column is narrower than before (220 px, it was 300), starts under the tab, and its rows are 24 px high with 3 between', G.w === 220 && K.list.w < 300 && G.list.y >= G.tab.y + G.tab.h && G.rowH === 24 && near(J(`campPanelsGeometry(campPanelDef('fleet')).rowY(2) - campPanelsGeometry(campPanelDef('fleet')).rowY(1)`), 24 + 3) && G.list.y + G.list.h < 600, JSON.stringify(G));
  check('what cannot be done is greyed and says why in a few letters: Attack, Guard and Recall have nobody out', rows[1].suffix === 'none out' && rows[3].suffix === 'none out' && rows[4].suffix === 'none out' && rows[1].nameColor === J('CAMPPANELS_LOOK.rowInk.no') && rows[1].suffixColor === J('CAMPPANELS_LOOK.rowInk.why') && rows[0].nameColor === J('CAMPPANELS_LOOK.rowInk.ok'), JSON.stringify(rows.map(r => [r.suffix, r.nameColor])));
  check('every suffix is short (14 letters at most) and every name fits its column with it (at 8 px a letter, the digit, the name and the suffix under 220)', rows.every(r => r.suffix.length <= 14 && 30 + r.name.length * 8 + r.suffix.length * 7.2 + 10 <= 220), JSON.stringify(rows.map(r => r.name.length + r.suffix.length)));
  paint(1400); g.run(`campOrder(S.camp, 'launch'); for (let i = 0; i < 30 * 8; i++) campStep(S.camp, 1 / 30);`); paint(1400 + 260);
  check('the words are live (four times a second): after the wing is out Attack says how many fighters are, Recall how many ships', J(`__rows(S, 'fleet')`)[1].suffix === '6 out' && J(`__rows(S, 'fleet')`)[4].suffix === '8 out' && J(`__rows(S, 'fleet')`)[0].suffix === 'all out');
  g.run(`campPanelKey(S.pn, S.camp, 'Escape', 3000); campPanelsPaint(S, 3000);`);
  const half = (paint(3000 + A.fadeOut / 2), J(`__rows(S, 'fleet')`).map(r => r.alpha));
  check('Esc closes it: the list fades in 100 ms (half way at 50) and the tab is a tab again', half.every(a => near(a, 0.5, 0.01)) && (paint(3000 + A.fadeOut), J(`__rows(S, 'fleet')`).every(r => !r.vis)) && J(`__lineW(S, 'fleet')`).w <= 1.01);
  g.run(`__key(S, 'KeyE', 4000);`); paint(4000 + A.fadeIn + 20);
  const rs = J(`__rows(S, 'ship')`), gs = geo('ship');
  check('E does the same for SHIP at the right: the tab lit, five rows (Mine ore, Recharge, Build fighter, Build escort, Fly to goal), the column at the right edge', rs.map(r => r.name).join() === 'Mine ore,Recharge,Build fighter,Build escort,Fly to goal' && rs.every(r => r.vis && r.alpha === 1) && gs.list.x + gs.list.w === 1280 - K.edge && J(`__lineW(S, 'ship')`).w > 2 && !J(`__rows(S, 'fleet')`).some(r => r.vis), JSON.stringify(rs.map(r => [r.name, r.suffix])));
  check('SHIP\'s words are short too: what a ship costs (or the ore it needs), the objective\'s distance', rs[2].suffix === '25 ore' && rs[3].suffix === 'needs 45 ore' && /^[\d,]+ km$/.test(rs[4].suffix) && rs.every(r => r.suffix.length <= 14), JSON.stringify(rs.map(r => r.suffix)));
  g.run(`campPanelKey(S.pn, S.camp, 'KeyW', 5000); campPanelsPaint(S, 5000);`);
  check('any other key closes it too (W is itself: it flies)', J('S.pn.open') === '');
  paint(6000);
}

console.log('C. the pick: flash, collapse; a pick before the list is in pulses the tab');
{
  g.run(`S.pn = campPanelNew(); __key(S, 'KeyQ', 10000); window.__p = now => { S.time.now = now; campPanelsPaint(S, now); };`);
  g.run(`__p(${10000 + A.fadeIn + 30});`);
  g.run(`window.__r = __key(S, 'Digit3', 10500)`);
  check('3 with the list in does the row (escort) and closes the panel in the state, at once; the row is to flash', J('__r.ran') && J('__r.row') === 'escort' && J('S.pn.open') === '' && J('S.pn.flash.id') === 'fleet' && J('S.pn.flash.row') === 'escort' && J('S.pn.flash.shown') === true);
  const samples = [0, 40, 80, 120, 160].map(t => { g.run(`__p(${10500 + t})`); const f = J(`__fills(S, 'fleet')`).filter(x => x.c === 16777215); return f.length ? f[f.length - 1].a : 0; });
  check('the chosen row FLASHES twice in 160 ms: bright (white) at 40 ms and again at 120, dark between and at the ends', samples[0] < 0.05 && samples[1] > 0.6 && samples[2] < 0.05 && samples[3] > 0.6 && samples[4] < 0.05, JSON.stringify(samples));
  g.run(`__p(${10500 + 40})`);
  const bright = J(`__draw(S, 'fleet')`).filter(d => d.m === 'fillStyle' && d.a[0] === 16777215).length;
  check('only the chosen row flashes (one white fill), and the list is still there, with the tab lit, during the flash', bright === 1 && J(`__rows(S, 'fleet')`).every(r => r.vis && r.alpha === 1) && J(`__lineW(S, 'fleet')`).w > 2);
  g.run(`__p(${10500 + A.flash + A.fadeOut / 2})`);
  check('then it collapses: the list fades in 100 ms after the flash (half way, then gone) and the tab is a tab again', J(`__rows(S, 'fleet')`).every(r => r.vis && near(r.alpha, 0.5, 0.01)) && (g.run(`__p(${10500 + A.flash + A.fadeOut})`), J(`__rows(S, 'fleet')`).every(r => !r.vis)) && J(`__lineW(S, 'fleet')`).w <= 1.01);
  check('the whole is 260 ms from the pick to a tab: flash 160, fade 100', A.flash === 160 && A.fadeOut === 100 && A.flash + A.fadeOut === 260);
  g.run(`__p(20000); window.__w0 = S.camp.orders.recall; __key(S, 'KeyQ', 20000); __key(S, 'Digit5', 20060); __p(20060);`);
  check('Q then 5 typed fast (the list not all in, 60 ms): the wing is recalled, no row flashes, and the TAB pulses once', J('S.camp.orders.recall') === J('__w0') + 1 && J('S.pn.flash.shown') === false && J('S.pn.flash.id') === 'fleet' && !J(`__draw(S, 'fleet')`).some(d => d.m === 'fillStyle' && d.a[0] === 16777215));
  const w = t => { g.run(`__p(${20060 + t})`); return J(`__lineW(S, 'fleet')`).w; };
  const wides = [0, 60, 120, 180, 240, 300].map(w);
  check('the tab pulses: its border is thick at the middle of 240 ms (peak near 120), thin before and after; the pulse is the tab\'s, not the list\'s', wides[0] <= 1.8 && wides[2] > 2.3 && wides[1] > wides[0] && wides[4] <= 1.1 && wides[5] <= 1.1, JSON.stringify(wides));
  check('and the name of the tab goes white at the peak', (g.run(`__p(${20060 + 120})`), J(`__tab(S, 'fleet')`).nameColor === '#ffffff') && (g.run(`__p(${20060 + 300})`), J(`__tab(S, 'fleet')`).nameColor === '#9fbdd1'));
  check('and the list that was dropping in goes from where it was (a short fade), not all at once', (g.run(`__p(${20060 + 20})`), J(`__rows(S, 'fleet')`).every(r => r.vis && r.alpha > 0 && r.alpha < 0.5)) && (g.run(`__p(${20060 + 100})`), J(`__rows(S, 'fleet')`).every(r => !r.vis)));
}

console.log('D. two panels, one component, one table');
{
  g.run(`S.pn = campPanelNew(); __key(S, 'KeyQ', 30000); __p(${30000 + A.fadeIn + 10});`);
  check('Q opened FLEET; its list is in', J('S.pn.open') === 'fleet' && J(`__rows(S, 'fleet')`).every(r => r.vis && r.alpha === 1));
  g.run(`__key(S, 'KeyE', 31000);`);
  check('E while FLEET is open switches: SHIP opens and FLEET is what closed (a key, not a pick)', J('S.pn.open') === 'ship' && J('S.pn.closed.id') === 'fleet' && J('S.pn.flash') === null);
  g.run(`__p(${31000 + 50})`);
  const f50 = J(`__rows(S, 'fleet')`)[0], s50 = J(`__rows(S, 'ship')`)[0];
  check('they CROSS-FADE: 50 ms in, FLEET\'s list is half gone and SHIP\'s is 42 percent in (both on the screen at once)', f50.vis && s50.vis && near(f50.alpha, 0.5, 0.01) && near(s50.alpha, 50 / A.fadeIn, 0.01), JSON.stringify([f50.alpha, s50.alpha]));
  g.run(`__p(${31000 + A.fadeIn + 10})`);
  check('and by 120 ms FLEET is a tab and SHIP is open', !J(`__rows(S, 'fleet')`)[0].vis && J(`__rows(S, 'ship')`)[0].alpha === 1 && J(`__lineW(S, 'ship')`).w > 2 && J(`__lineW(S, 'fleet')`).w <= 1.01);
  g.run(`__key(S, 'KeyE', 32000);`);
  check('E again closes it; Q with the right one open switches back the other way', J('S.pn.open') === '' && (g.run(`__key(S, 'KeyE', 32100); __key(S, 'KeyQ', 32200);`), J('S.pn.open') === 'fleet' && J('S.pn.closed.id') === 'ship'));
  g.run(`S.pn = campPanelNew(); S.time.now = 33000; campPanelToggle(S.pn, 'fleet', 33000); __p(${33000 + A.fadeIn + 10});`);
  const tabs = J(`CAMP_PANELS.panels.map(p => campPanelsGeometry(p).tab)`);
  check('a click on a tab opens its panel (a click is Q or E with a mouse); on the other tab it switches and they cross-fade; on the open tab it closes it', (() => { g.run(`S.time.now = 34000; campPanelsClick(S, ${tabs[1].x + 10}, ${tabs[1].y + 10});`); const a = J('S.pn.open') === 'ship' && J('S.pn.closed.id') === 'fleet'; g.run(`S.time.now = 35000; campPanelsClick(S, ${tabs[1].x + 10}, ${tabs[1].y + 10});`); return a && J('S.pn.open') === ''; })());
  g.run(`S.pn = campPanelNew(); __key(S, 'KeyE', 40000); S.time.now = 40100;`);
  check('with a panel open a click elsewhere on the screen closes it; with none open a click on the screen is not the panels\' (it is not swallowed), but a click on a tab is theirs', (() => { g.run(`campPanelsClick(S, 640, 500);`); const closed = J('S.pn.open') === ''; const free = J('campPanelsClick(S, 640, 400)') === false; const tab = J(`campPanelsClick(S, ${tabs[0].x + 10}, ${tabs[0].y + 10})`) === true && J('S.pn.open') === 'fleet'; return closed && free && tab; })());
  g.run(`S.pn = campPanelNew(); S.camp.ore = 100; S.time.now = 50000; campPanelToggle(S.pn, 'ship', 50000); __p(50000 + 200); window.__gs = campPanelsGeometry(campPanelDef('ship')); window.__said.length = 0;`);
  g.run(`S.time.now = 50300; campPanelsClick(S, __gs.list.x + 100, __gs.rowY(3) + 10);`);
  check('a click on SHIP row 3 builds a fighter (25 ore spent), the panel closes and the row is to flash', J('S.camp.ore') === 75 && J('S.camp.build.queue.length') === 1 && J('S.pn.open') === '' && J('S.pn.flash.row') === 'buildf' && J('S.pn.flash.shown') === true);
  check('FLEET and SHIP are one component: the two panels\' objects are made by the same function from the same table (CAMP_PANELS), and SHIP is FLEET mirrored', (src('src/campanelsdraw.js').match(/function campPanelsBuild/g) || []).length === 1 && (src('src/campanelsdraw.js').match(/function campPanelsPaintOne/g) || []).length === 1 && J(`(() => { const a = campPanelsGeometry(campPanelDef('fleet')), b = campPanelsGeometry(campPanelDef('ship')); return a.tab.x + b.tab.x + b.tab.w === 1280 && a.tab.y === b.tab.y && a.list.w === b.list.w && a.list.x + b.list.x + b.list.w === 1280; })()`));
  g.run(`window.__T = CAMP_PANELS.panels[0]; __T.rows.push({ n: 6, id: 'launch', order: 'launch', label: 'Sixth row', tag: 'Sixth', help: 'A row from the data' }); window.S2 = __scene(); campPanelsInstall(S2); S2.pn.open = 'fleet'; S2.pn.at = 0; S2.time.now = 1000; campPanelsPaint(S2, 1000);`);
  check('a sixth row put in the table is drawn, with its own name and a place under the fifth (no line of drawing code knows it)', J('S2.pnl.p.fleet.rows.length') === 6 && J('S2.pnl.p.fleet.rows[5].name.t') === 'Sixth' && J('S2.pnl.p.fleet.rows[5].digit.t') === '6' && J(`campPanelsGeometry(campPanelDef('fleet')).rowY(6)`) > J(`campPanelsGeometry(campPanelDef('fleet')).rowY(5)`));
  g.run(`__T.rows.pop();`);
  g.run(`window.__third = { key: 'C', code: 'KeyC', id: 'systems', side: 'left', slot: 1, title: 'SYSTEMS', rows: [{ n: 1, id: 'launch', order: 'launch', label: 'Weapons plus', tag: 'Weapons+', help: 'x' }] }; CAMP_PANELS.panels.push(__third); window.S3 = __scene(); campPanelsInstall(S3);`);
  check('a third panel put in the table (a key, a side and a slot) is drawn as a tab beside the first: its tab does not cover FLEET\'s, its column hangs from it', J('Object.keys(S3.pnl.p).join()') === 'fleet,ship,systems' && J(`(() => { const a = campPanelsGeometry(campPanelDef('fleet')).tab, c = campPanelsGeometry(campPanelDef('systems')).tab; return c.x >= a.x + a.w && c.y === a.y && c.x + c.w < 640; })()`) && J(`campPanelsGeometry(campPanelDef('systems')).list.x`) === J(`campPanelsGeometry(campPanelDef('systems')).tab.x`));
  g.run(`CAMP_PANELS.panels.pop();`);
  check('and the table is as it was', J(`CAMP_PANELS.panels.length`) === 2 && J(`CAMP_PANELS.panels[0].rows.length`) === 5);
}

console.log('E. the screen\'s own camera, the key line');
{
  const objs = J(`S.pnl.objs.map(o => o.sf)`);
  check('every object of the panels has scroll factor 0: it is on the camera that never zooms (src/camzoom.js sorts by it), so + - and the wheel never scale a panel', objs.length > 20 && objs.every(sf => sf === 0), objs.join());
  const sc = src('src/campaignscene.js'), cr = sc.slice(sc.indexOf('  create() {'), sc.indexOf('  get camzoomHold()'));
  check('the bottom key line has a thin backing strip under it, over the whole width, on the screen\'s camera, below the text', /this\.keysBack = this\.add\.rectangle\(W \/ 2, H - 35, W, 26, 0x02060d, 0\.6\)\.setScrollFactor\(0\)\.setDepth\(99\)/.test(cr) && /keys: this\.add\.text\(24, H - 44, campKeyLine\(\)[^;]*\.setScrollFactor\(0\)\.setDepth\(100\)/.test(cr));
  check('the strip covers the line: the line\'s text (at H - 44, 14 px) lies inside the strip (H - 48 to H - 22)', 720 - 44 >= 720 - 35 - 13 && 720 - 44 + 18 <= 720 - 35 + 13);
  check('the scene gives the panels the time of the scene, and the tabs are painted every frame', /campPanelsPaint\(this, this\.time\.now\)/.test(sc));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PANELS UI FAIL (${failed} of ${n})` : `\nCAMPAIGN PANELS UI PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
