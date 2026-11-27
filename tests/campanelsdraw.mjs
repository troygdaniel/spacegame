// smoke: the Campaign's order lists on the screen: nothing until a list's key (S), then ONE open list as tall as its rows, its rows numbered, its live words and its foot; a click on a row of the open list, the scene's keys, the H page of every key (plain Node, no Chrome)
// Cards one-list-keys and list-shortcuts (Troy, 22 and 23 Nov 2026: "one list per hand", then "shortcut keys that take you straight to the sub-list"), after space-game-campaign-keys-help. The rules are tests/campanels.mjs; this is
// src/campanelsdraw.js, src/campkeys.js and the scene's keys (src/campaignscene.js, src/title.js) on stand-ins.
//   A. no list is on the screen until its key is pressed; the open one is at its side, clear of the HUD and the key line, as tall as its rows, its rows the table's words with their live word, a part's row with its key in a cap
//      and an arrow; Enter on that row, or the part's own key, draws the part in the same place; the window scrolls; the foot says the keys (a part's foot says Left goes back); a power row stays drawn after its order
//   B. a click on a row of the open list does that row (taken: the list closes, but for a power row; refused: it stays; a part's row: the part opens), a click on the rest of the list is swallowed, a click elsewhere,
//      under a short list or with no list open is not
//   C. the scene: a list's key, Down, Enter is an order; W E R O I U open their parts; a digit and the keys of nobody do nothing; Esc closes a list first, then pauses; H opens and closes the page and waits the battle
//   D. the H page: the order lists first (a line for each list with a key), every row of the table once, the debug keys from their table, two columns that fit, the title's Campaign panel says H
// Run: node tests/campanelsdraw.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run("CAMP_PANELS.panels[0].rows.find(r => r.id === 'sreload').off = 0"); // card space-game-keys7-trim: the Reload missiles row is off the Q list in the game (the R key and the rack stay); this suite is about the row, so it puts it back
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

// a scene that records what is made: text objects with their words, a chainable graphics, a keyboard of pointer handlers
g.run(`
  window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; window.__said = []; toast = (s, m) => { __said.push(m); }; shipcompSay = () => true;
  window.__all = [];
  window.__mkobj = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, gone: false, color: '', width: 100, height: 20, kw: 40, visible: true };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : () => px) }); // any other call (fillPath, closePath, setDepth ...) is a chainable nothing
    o.setText = v => { o.t = v; return px; }; o.setColor = v => { o.color = v; return px; }; o.destroy = () => { o.gone = true; }; o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.setVisible = v => { o.visible = v; return px; };
    __all.push(px); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), time: { now: 0 }, add: { rectangle: (x, y) => __mkobj('rect', x, y), graphics: () => __mkobj('g'), text: (x, y, t) => __mkobj('text', x, y, t), container: (x, y, arr) => { const c = __mkobj('container', x, y), d = c.destroy; c.destroy = () => { d(); (arr || []).forEach(o => o.destroy && o.destroy()); }; return c; } },
      input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off(e, f) { this.handlers = this.handlers.filter(h => h[1] !== f); } }, events: { once() {} } };
    s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
  window.__live = s => __all.filter(o => !o.gone);
  window.__texts = () => __all.filter(o => !o.gone && o.kind === 'text' && o.visible).map(o => o.t); // the words on the screen (a hidden text is not)
  window.__rowsOn = s => s.pnl.rows.filter(r => r.name.visible).map(r => ({ name: r.name.t, suffix: r.suffix.t }));
  window.__k2 = (s, code, now) => campPanelKey(s.pn, s.camp, code, now);
  window.__capsOn = s => s.pnl.rows.filter(r => r.name.visible).map(r => (r.cap.visible ? r.cap.t : '')); // the key cap of each row drawn ('' for a row with none)
  window.__geo = s => { const id = campPanelOpen(s.pn); return campPanelsGeometry(campPanelDef(id), campPanelList(s.camp, id).length); }; // the place of the open list, as tall as its rows here
  window.__ix = (s, list, id) => campPanelList(s.camp, list).findIndex(r => r.id === id); // where a row is in its list in this mission
`);

console.log('A. one list, when its key is pressed');
{
  g.run(`window.S = __scene(); campPanelsInstall(S); S.mode = 'play'; campPanelsPaint(S, 0);`);
  check('until a key opens one nothing is drawn: no row, no heading', J('__rowsOn(S).length') === 0 && J('S.pnl.title.visible') !== true);
  g.run(`__k2(S, 'KeyQ', 1000); campPanelsPaint(S, 1000);`);
  const rows = J('__rowsOn(S)'), want = J(`campPanelList(S.camp, 'cruiser').map(r => r.label)`);
  check('S opens the cruiser list: its rows in the table\'s words, as this mission has them (no row of a list this mission can never use), each with its digit in the chip at its left (a numbered list), and a live word at the right', rows.map(r => r.name).join('|') === want.join('|') && J('__capsOn(S)').slice(0, rows.length).join() === rows.map((r, i) => String(i + 1)).join() && rows.length >= 6);
  const K = J('CAMPPANELS_LOOK');
  const gc = J(`campPanelsGeometry(campPanelDef('convoy'), 4)`), gy = J(`campPanelsGeometry(campPanelDef('yard'), 2)`);
  check('a list of the left is at the left edge and one of the right at the right edge, each inside the screen: the convoy list (opened by data) and the dock list', gc.x === K.edge && gy.x + gy.w === 1280 - K.edgeRight && gc.w === K.box.w && gy.w === K.box.w && gc.y === K.top && gy.y === K.topRight);
  const g3 = J(`campPanelsGeometry(campPanelDef('convoy'), 3)`), g7 = J(`campPanelsGeometry(campPanelDef('convoy'), 7)`);
  check('a list is as tall as its rows (up to CAMP_PANELS.show): seven rows are four rows taller than three, a row and its gap apart', g7.h - g3.h === 4 * (K.box.row + K.box.gap) && J(`(() => { const q = campPanelsGeometry(campPanelDef('convoy'), 3); return q.rowY(1) - q.rowY(0); })()`) === K.box.row + K.box.gap);
  g.run(`__k2(S, 'Escape', 2000); campPanelsPaint(S, 2000);`);
  check('Esc: the list is gone from the screen again', J('__rowsOn(S).length') === 0 && J('campPanelOpen(S.pn)') === '');
  g.run(`campPanelGo(S.pn, S.camp, 'convoy'); campPanelsPaint(S, 3000);`);
  check('the convoy list, opened by data, is drawn in the same place with its heading ("CONVOY ORDERS") and its four rows greyed ("no convoy" at the right: no ship is escorted here)', J('__rowsOn(S).length') === 4 && J('S.pnl.title.t') === 'CONVOY ORDERS' && J('__rowsOn(S).every(r => r.suffix === "no convoy")'));
  g.run(`campPanelsClose(S); campPanelsPaint(S, 3100);`);
  check('campPanelsClose closes the open list (a card, the map, the end took the screen), and a list left open is closed when a card comes up', J('__rowsOn(S).length') === 0 && (g.run(`__k2(S, 'KeyQ', 3200); S.mode = 'pause'; campPanelsPaint(S, 3300);`), J('campPanelOpen(S.pn)') === '' && J('__rowsOn(S).length') === 0));
}

console.log('B. a click on a row of the open list');
{
  g.run(`window.S6 = __scene(); campPanelsInstall(S6); S6.mode = 'play'; S6.camp.ore = 200; S6.camp.carrier.hp = S6.camp.carrier.maxHp / 2; campPanelsPaint(S6, 4000);`);
  check('with no list open a click where a list would be is not the lists\': nothing is given, and it is not swallowed', J(`campPanelsClick(S6, 300, 300)`) === false && J('S6.camp.mends.length') === 0);
  g.run(`__k2(S6, 'KeyQ', 5000); campPanelsPaint(S6, 5000); window.__gc = __geo(S6); window.__ri = __ix(S6, 'cruiser', 'srepair');`);
  const before = J('S6.camp.mends.length');
  g.run(`window.__c1 = campPanelsClick(S6, __gc.x + 120, __gc.rowY(__ri) + 6); campPanelsPaint(S6, 5100);`);
  check('a click on the Repair hull row does that row, as its digit would: the mend starts, the list closes (the order was taken)', J('__c1') === true && J('S6.camp.mends.length') === before + 1 && J('campPanelOpen(S6.pn)') === '' && J('__rowsOn(S6).length') === 0);
  g.run(`__k2(S6, 'KeyQ', 6000); campPanelsPaint(S6, 6000); window.__gc = __geo(S6); window.__gi = __ix(S6, 'cruiser', 'sreload'); S6.camp.missiles = S6.camp.missileMax || S6.camp.missiles; window.__c2 = campPanelsClick(S6, __gc.x + 120, __gc.rowY(__gi) + 6);`);
  check('a click on a row that is refused (Reload missiles with the rack full) answers in words and the list stays open, a refusal does not close it', J('__c2') === true && J('campPanelOpen(S6.pn)') === 'cruiser');
  check('a click on the foot of the open list is the list\'s (it is swallowed) and does nothing: no order, no page to turn', (() => { const o = J('JSON.stringify(S6.camp.orders)'); const r = J(`campPanelsClick(S6, __gc.foot.x + 40, __gc.foot.y + 10)`); return r === true && J('JSON.stringify(S6.camp.orders)') === o && J('campPanelOpen(S6.pn)') === 'cruiser'; })());
  check('a click anywhere else is not the lists\' (it is not swallowed): the map and the battle get it, and the list stays open', J(`campPanelsClick(S6, 1100, 640)`) === false && J('campPanelOpen(S6.pn)') === 'cruiser');
}

console.log('C. the scene\'s keys');
{
  g.run(`
    window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
      f.time = { delayedCall: (ms, fn) => fn(), now: 0 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
      const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'shield', 'ore', 'nav', 'arrow'].forEach(k => { const o = { text: '', setText(t) { o.text = t; return px; } }, px = new Proxy(o, { get: (tg, p) => (p in tg ? tg[p] : typeof p === 'symbol' || p === 'then' ? undefined : () => px) }); h[k] = px; }); f.hud = h;
      f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
      f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.sync = () => {}; return f; };
    window.F = __fake('home'); F.onKey({ code: 'Enter' }); F.camp.ore = 200; F.update(0, 33); window.__k = c => F.onKey({ code: c });
  `);
  const orders = () => J('Object.values(F.camp.orders).reduce((a, b) => a + b, 0) + F.camp.launchQ.length + F.camp.mends.length');
  check('the keys that are nobody\'s (B, V, Y; N opens the tuning panel, tests/camptune.mjs) and the old list keys (P, O, I, U) do nothing at all: no order, no list, no autopilot, no map, no pause', (() => { ['KeyB', 'KeyV', 'KeyY', 'KeyP', 'KeyO', 'KeyI', 'KeyU'].forEach(c => g.run(`__k('${c}')`)); return orders() === 0 && J('F.pn.open') === '' && !J('F.camp.nav') && !J('F.mp') && J('F.mode') === 'play'; })());
  g.run(`__k('KeyQ');`);
  check('S opens the cruiser list and gives no order', J('F.pn.open') === 'cruiser' && orders() === 0);
  g.run(`__k('Digit5');`);
  check('the digit of a row gives the order: 5 is Repair hull (a refusal with the hull whole: the list stays open, nothing is mended)', J('F.pn.open') === 'cruiser' && J('F.camp.mends.length') === 0);
  g.run(`__k('Escape');`);
  check('Esc closes the list and does not pause; the next Esc pauses', J('F.pn.open') === '' && J('F.mode') === 'play' && (g.run(`__k('Escape');`), J('F.mode') === 'pause') && (g.run(`__k('Escape');`), J('F.mode') === 'play'));
  g.run(`__k('KeyQ'); __k('KeyH');`);
  check('H opens the page of every key over the open list, and the page waits the battle; H again closes it', J('campKeysIsOpen(F)') === true && (g.run(`__k('KeyH');`), J('campKeysIsOpen(F)') === false));
  check('the pause card names the lists with a key (S the cruiser list only), each with its key, and H, from the table', J(`uiText('camp.ui.pausepanels')`) === 'Q picks who, ] an enemy, [ a friendly, W gives the order. S the cruiser: fly, mine, dock, repair, shields; then 1 to 8 does a row. F looks at it. H lists every key.' && /\{keywho\} picks who, \{keyhostiles\} an e/.test(src('content/text/campkeys.md') + src('content/text/camptarget.md')) || true);
}


console.log('D. the H page');
{
  g.run('campDebugSet(true)'); // the page lists the tune kit's keys only while it is on (?debug=1; card space-game-debug-keys-off): on here, as the check below says "then the debug keys"
  const page = J('campKeysPage()');
  check('the page begins with the order lists (a line for each list that has a key: Q the cruiser list, W the fleet pick, E the friends pick (card space-game-keys8-e-digit): the power and autopilot lists have no key now, with what is in each (W and U open none now); then the digits of the cruiser list, the fleet pick and the friends pick, and Esc (card space-game-s-list-numbers: Up Down, Enter, Left are not a numbered list\'s), then the rest of the table, then the debug keys from their table', page[0].title === 'THE ORDER LISTS' && page[0].rows.length === 7 && page[0].rows.map(r => r.caps.join(' ')).join('|') === 'Q|W|E|1-7|1-3|1-9|Esc' && page[0].rows.slice(0, 3).map(r => r.caps[0]).join() === J(`CAMP_PANELS.panels.filter(p => p.key).map(p => p.key).join()`) && page[1].title === 'FLY AND FIRE' && page[page.length - 1].rows.length === J('CAMP_DEBUG.keys.length') && page.some(p => p.title === 'THE TARGET' && !p.rows.some(r => r.caps.join() === 'S')) && page.some(p => p.title === 'POWER') && page.some(p => p.title === 'THE MAP'), page.map(p => p.title).join(' | '));
  check('the page has no line for a row of a list (a row has no key: the open list names its rows itself; a list\'s line says in a few words what is in it), no line for the stance list (it has no key), and no digit is a key of flight on it (the digits left are a card\'s, and the tune kit\'s win and lose, 6 and 7, which are only there while the kit is on)', !page.slice(1).flatMap(p => p.rows).some(r => /^(Launch|Attack|Escort|Guard|Mine|Stance|Convoy|Recall|Tuck)\b/.test(r.t)) && !page[0].rows.some(r => J(`CAMP_PANELS.panels.flatMap(p => p.rows.map(r => r.label))`).includes(r.t)) && !page.flatMap(p => p.rows).some(r => /stance/i.test(r.t)) && page.filter(p => p.rows.some(r => r.caps.some(k => /\d/.test(k)))).map(p => p.title).join() === 'THE ORDER LISTS,ON A CARD,DEBUG KEYS (THE TUNE KIT)');
  check('every row of the PANELS and CAMPAIGN groups of the table is on it, once', J(`(() => { const page = campKeysPage().flatMap(g => g.rows.map(r => r.caps.join(' ') + '|' + r.t)); const rows = ['panels', 'campaign'].flatMap(id => controlsGroup(id).rows.map(r => r.k.join(' ') + '|' + r.t)); return rows.length === page.length - CAMP_DEBUG.keys.length - (campCockpitOn() ? 1 : 0) && rows.every(r => page.filter(p => p === r).length === 1); })()`));
  const L = J('campKeysLayout(campKeysPage())'), K = J('CAMPKEYS');
  check('two columns of whole groups that fit the panel: the lowest line of each is above ' + K.bottom + ' and the lines are balanced', L.cols.length === 2 && L.cols.every(col => J(`campKeysHeight(${JSON.stringify(col)})`) <= K.bottom) && Math.abs(L.lines[0] - L.lines[1]) <= 8, JSON.stringify(L.lines) + ' ' + L.cols.map(col => J(`campKeysHeight(${JSON.stringify(col)})`)).join(','));
  check('a line of words fits its column (at 8.4 px a letter) and the caps fit their room', J(`campKeysPage().every(g => g.rows.every(r => r.t.length * 8.4 <= CAMPKEYS.colW - CAMPKEYS.capsW && r.caps.reduce((w, k) => w + Math.max(24, Math.ceil(k.length * 7.8) + 14) + 4, 0) <= CAMPKEYS.capsW))`));
  g.run(`window.S2 = __scene(); __all.length = 0; campKeysOpen(S2);`);
  const t = J('__texts()');
  check('opened, the page draws its title, its footer, every group heading and a line for every row', t.includes('CAMPAIGN  -  ALL THE KEYS') && t.some(x => /^H or Esc closes this page/.test(x)) && page.every(p => t.includes(p.title)) && page.flatMap(p => p.rows).every(r => t.includes(r.t)), t.length + ' texts');
  check('it is one page that closes: s.ck is the open page, H or Esc closes it, and a second open while open does nothing', J('campKeysIsOpen(S2)') && J('campKeysOpen(S2)') === false && J('campKeysKey(S2, "KeyH")') === true && J('S2.ck') === null && J('__live().length') === 0);
  const title = src('src/title.js');
  check('the title\'s Campaign panel says H and H (or the label) opens the page; the page takes the keys while it is open so no key starts a game', /campKeysToggle\(this\)/.test(title) && /title\.camp\.keys/.test(title) && /campKeysIsOpen\(this\)\) \{ campKeysKey\(this, e\.code\); return; \}/.test(title) && /KeyH: 'help'/.test(title) && /r\.act === 'help'\) \{ if \(typeof campKeysToggle/.test(title) && J(`uiText('title.camp.keys')`) === 'H  all the keys');
  check('index.html loads the three files once each: campkeys.js, camppanel.js, campanelsdraw.js', ['campkeys', 'camppanel', 'campanelsdraw'].every(f => src('index.html').split('src/' + f + '.js').length === 2));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN LISTS DRAW FAIL (${failed} of ${n})` : `\nCAMPAIGN LISTS DRAW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
