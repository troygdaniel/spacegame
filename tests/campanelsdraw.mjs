// smoke: the Campaign's keyboard panels on the screen: drawn after 250 ms and not before, live words, a click on a row does it, the H page of every key, the digits that are gone, B and N that do nothing (plain Node, no Chrome)
// Card space-game-campaign-keys-help (Troy, 20 Nov 2026). The rules are tests/campanels.mjs; this is src/campanelsdraw.js, src/campkeys.js and the scene's keys (src/campaignscene.js, src/title.js) on stand-ins.
//   A. a panel is drawn only 250 ms after its key, at its side of the screen, clear of the HUD and the key line, with five rows and their live words; Esc, a pick and a click outside take it away
//   B. a click on a row does that row and closes the panel; the numbers and the words of each panel
//   C. the scene: a digit is a panel key, 4 to 9 and key 3 do nothing, B and N do nothing, Esc closes a panel before it pauses, H opens and closes the page and waits the battle
//   D. the H page: the panels first, every row of the table once, the debug keys from their table, two columns that fit, the title's Campaign panel says H
// Run: node tests/campanelsdraw.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
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
  window.__texts = () => __all.filter(o => !o.gone && o.kind === 'text').map(o => o.t);
`);

console.log('A. drawn after 250 ms, at its side, with live words');
{
  g.run(`window.S = __scene(); campPanelsInstall(S); window.__n0 = __all.length;`);
  check('install makes no objects (nothing on the screen until a panel opens) and listens for the pointer', J('__all.length') === J('__n0') && J('S.input.handlers.length') === 1);
  g.run(`campPanelKey(S.pn, S.camp, 'Digit1', 1000); campPanelsPaint(S, 1000); campPanelsPaint(S, 1100); campPanelsPaint(S, 1249);`);
  check('key 1 opened the panel but at 0, 100 and 249 ms nothing is drawn: 1 then 3 never flashes it', J('S.pn.open') === 'fleet' && J('__all.length') === J('__n0'));
  g.run(`campPanelsPaint(S, 1250);`);
  const t = J('__texts()');
  check('at 250 ms it is drawn: the heading FLEET, a line of what you have, the five rows with their names', t.includes('FLEET') && t.includes('bay 6+2   out 0') && ['Launch', 'Attack', 'Escort', 'Guard', 'Recall'].every(r => t.includes(r)), t.join(' | '));
  check('each row shows its live state: launch what is in the bay, the others why not (no wing out yet)', t.includes('6 fighters, 2 escorts') && t.includes('no fighters out') && t.includes('no escorts out') && t.includes('no ships out'), t.join(' | '));
  const objs = J('__live().length');
  g.run(`campOrder(S.camp, 'launch'); for (let i = 0; i < 30 * 8; i++) campStep(S.camp, 1 / 30); campPanelsPaint(S, 1300);`);
  check('the words are live but are not made again: at 300 ms (50 ms after) the same, a quarter of a second later they say what the game says now', J('__texts().includes("6 fighters, 2 escorts")') && (g.run('campPanelsPaint(S, 1520)'), J('__texts().includes("6 fighters out")') && J('__texts().includes("all of it is out")') && J('__live().length') === objs));
  g.run(`S.camp.result = null;`);
  const geo = J('campPanelsGeometry(campPanelDef("fleet"))'), geo2 = J('campPanelsGeometry(campPanelDef("ship"))');
  check('FLEET is at the left edge and SHIP at the right edge, each inside the screen, below the HUD\'s gauges (176) and the radar (226), above the key line (676)', geo.x === 24 && geo2.x === 1280 - 24 - geo2.w && geo.y >= 230 && geo2.y >= 230 && geo.y + geo.h <= 660 && geo2.y + geo2.h <= 660 && geo2.x + geo2.w <= 1256, JSON.stringify([geo, geo2]));
  g.run(`campPanelKey(S.pn, S.camp, 'Escape', 2000); campPanelsPaint(S, 2000);`);
  check('Esc takes it away: every object is gone', J('S.pn.open') === '' && J('__live().length') === 0);
  g.run(`S.camp.docked = 'luna'; campPanelKey(S.pn, S.camp, 'Digit2', 3000); campPanelsPaint(S, 3300); window.__t2 = __texts();`); // docked: the build rows say what they cost (undocked: "Dock at an outpost to build.")
  check('key 2 draws SHIP: the ore and the shield, the six rows, what each costs and why not', J('__t2').includes('SHIP') && J('__t2').some(x => /^ore \d+   shield \d+$/.test(x)) && ['Mine ore', 'Recharge shields', 'Build a fighter', 'Build an escort', 'Fly to the objective', 'Dock at an outpost'].every(r => J('__t2').includes(r)) && J('__t2').includes('25 ore, 6 s') && J('__t2').includes('needs 45 ore') && J('__t2').includes('shield is full'), J('__t2').join(' | '));
  g.run(`campPanelKey(S.pn, S.camp, 'Digit4', 3400); campPanelsPaint(S, 3400);`);
  check('a pick closes it too: 2 then 4 (build an escort, refused for want of ore) and the panel is gone', J('S.pn.open') === '' && J('__live().length') === 0);
}

console.log('B. a click on a row does it');
{
  g.run(`window.S = __scene(); campPanelsInstall(S); window.__said.length = 0; S.time.now = 5000; campPanelKey(S.pn, S.camp, 'Digit1', 5000); campPanelsPaint(S, 5300); S.time.now = 5300;`);
  g.run(`window.__g = campPanelsGeometry(campPanelDef("fleet")); campPanelsClick(S, __g.x + 120, __g.rowY(1) + 10);`);
  check('a click on row 1 (launch) launches the wing, says so, and closes the panel', J('S.camp.launchQ.length') === 8 && J('__said.pop()') === 'Launching the wing.' && J('S.pn.open') === '' && J('__live().length') === 0);
  g.run(`S.time.now = 6000; campPanelKey(S.pn, S.camp, 'Digit1', 6000); campPanelsPaint(S, 6300); S.time.now = 6300; window.__g = campPanelsGeometry(campPanelDef("fleet")); campPanelsClick(S, __g.x + 120, __g.rowY(2) + 10);`);
  check('a click on a row that cannot be done answers in words and still closes it', J('__said.pop()') === 'The wing is still launching.' && J('S.pn.open') === '');
  g.run(`S.time.now = 7000; campPanelKey(S.pn, S.camp, 'Digit1', 7000); campPanelsPaint(S, 7300); S.time.now = 7300; window.__o = S.camp.orders.launch; campPanelsClick(S, 700, 400);`);
  check('a click anywhere else closes the panel and does nothing', J('S.pn.open') === '' && J('S.camp.orders.launch') === J('__o') && J('__live().length') === 0);
  g.run(`S.time.now = 8000; campPanelKey(S.pn, S.camp, 'Digit1', 8000); S.time.now = 8100;`);
  check('during the 250 ms before it is drawn a click is not the panel\'s (it is not swallowed)', J('campPanelsClick(S, 700, 400)') === false && J('S.pn.open') === 'fleet');
  g.run(`campPanelKey(S.pn, S.camp, 'Escape', 8200);`);
  g.run(`S.time.now = 9000; window.S.camp.ore = 100; S.camp.docked = 'luna'; campPanelKey(S.pn, S.camp, 'Digit2', 9000); campPanelsPaint(S, 9300); S.time.now = 9300; window.__g2 = campPanelsGeometry(campPanelDef("ship")); campPanelsClick(S, __g2.x + 150, __g2.rowY(3) + 10);`);
  check('the click on SHIP row 3 builds a fighter: 25 ore spent, one queued', J('S.camp.ore') === 75 && J('S.camp.build.queue.length') === 1);
}

console.log('C. the scene\'s keys');
{
  g.run(`
    window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
      f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
      const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'shield', 'ore', 'nav', 'arrow'].forEach(k => { const o = { text: '', setText(t) { o.text = t; return px; } }, px = new Proxy(o, { get: (tg, p) => (p in tg ? tg[p] : typeof p === 'symbol' || p === 'then' ? undefined : () => px) }); h[k] = px; }); f.hud = h;
      f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
      f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.sync = () => {}; return f; };
    window.F = __fake('home'); F.onKey({ code: 'Enter' }); F.camp.ore = 200; F.update(0, 33); window.__k = c => F.onKey({ code: c });
  `);
  const orders = () => J('Object.values(F.camp.orders).reduce((a, b) => a + b, 0) + F.camp.launchQ.length + F.camp.build.queue.length');
  check('digits 4 to 9 and key 3, pressed on their own, do nothing at all: no order, no panel, no toast, no pause', (() => { ['Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].forEach(c => g.run(`__k('${c}')`)); return orders() === 0 && J('F.pn.open') === '' && J('F.mode') === 'play' && J('F.camp.ore') === 200; })());
  check('B and N do nothing in the Campaign: no order, no autopilot, no map, no pause', (() => { ['KeyB', 'KeyN', 'KeyB', 'KeyN'].forEach(c => g.run(`__k('${c}')`)); return orders() === 0 && J('F.camp.nav') === null && J('F.mp') === null && J('F.mode') === 'play' && J('F.pn.open') === ''; })());
  g.run(`__k('Digit1');`);
  check('1 opens the fleet panel: it launches nothing', J('F.pn.open') === 'fleet' && orders() === 0);
  g.run(`__k('Escape');`);
  check('Esc closes the panel and the battle goes on: it did not also pause', J('F.pn.open') === '' && J('F.mode') === 'play');
  g.run(`__k('Digit2'); __k('Digit5');`);
  check('2 then 5 flies to the objective: the autopilot is on', J('F.camp.nav && F.camp.nav.id') === 'place:earth' && J('F.pn.open') === '');
  g.run(`F.camp.nav = null; __k('Digit1'); __k('KeyW');`);
  check('another key with a panel open closes it, and the key is itself (W flies: the panel does not eat it)', J('F.pn.open') === '');
  g.run(`__k('KeyH');`);
  check('H opens the page of every key, and the battle waits behind it (the pause card\'s mode)', J('F.ck && F.ck.open') === true && J('F.mode') === 'pause' && (g.run('window.__t0 = F.camp.t; F.update(0, 100)'), J('F.camp.t') === J('__t0')));
  g.run(`__k('Digit1'); __k('Digit1');`);
  check('with the page open a digit does nothing (the page has the keys)', orders() === 0 && J('F.pn.open') === '');
  g.run(`__k('KeyH');`);
  check('H again closes it and the battle runs on', J('F.ck') === null && J('F.mode') === 'play' && (g.run('F.update(0, 100)'), J('F.camp.t') > J('__t0')));
  g.run(`__k('KeyH'); __k('Escape');`);
  check('Esc closes the page and does not pause', J('F.ck') === null && J('F.mode') === 'play');
  g.run(`__k('Escape');`);
  check('Esc with nothing open pauses as it always did; H on the pause card opens the page over it and Esc closes it back to the card', J('F.mode') === 'pause' && (g.run(`__k('KeyH')`), J('F.ck && F.ck.open') === true && J('F.mode') === 'pause') && (g.run(`__k('Escape')`), J('F.ck') === null && J('F.mode') === 'pause'));
  g.run(`__k('Escape');`);
  check('the pause card names the panels and H, from the table', /1 Fleet, 2 Ship, C Systems open the panels/.test(J(`uiText('camp.ui.pausepanels', { panels: campPanelKeyLine().replace(/   /g, ', ') })`)) && /H  all keys/.test(J(`uiText('camp.ui.paused')`)) && /campPanelKeyLine\(\)\.replace/.test(src('src/campaignscene.js')));
}

console.log('D. the H page');
{
  const page = J('campKeysPage()');
  check('the page begins with the two panels (five rows, and seven on SHIP: the dock row and the Shift+5 burn row), then the rest of the table, then the debug keys from their table', page[0].title === 'KEY 1  -  THE FLEET PANEL' && page[1].title === 'KEY 2  -  THE SHIP PANEL' && page[0].rows.length === 5 && page[1].rows.length === 7 && page[0].rows[2].caps.join() === '1,3' && page[page.length - 1].rows.length === J('CAMP_DEBUG.keys.length') && page.some(p => p.title === 'FLY AND FIRE') && page.some(p => p.title === 'THE MAP'), page.map(p => p.title).join(' | '));
  check('every row of the PANELS and CAMPAIGN groups of the table is on it, once', J(`(() => { const page = campKeysPage().flatMap(g => g.rows.map(r => r.caps.join(' ') + '|' + r.t)); const rows = ['panels', 'campaign'].flatMap(id => controlsGroup(id).rows.map(r => r.k.join(' ') + '|' + r.t)); return rows.length === page.length - CAMP_DEBUG.keys.length && rows.every(r => page.filter(p => p === r).length === 1); })()`));
  const L = J('campKeysLayout(campKeysPage())'), K = J('CAMPKEYS');
  check('two columns of whole groups that fit the panel: the lowest line of each is above ' + K.bottom + ' and the lines are balanced', L.cols.length === 2 && L.cols.every(col => J(`campKeysHeight(${JSON.stringify(col)})`) <= K.bottom) && Math.abs(L.lines[0] - L.lines[1]) <= 8, JSON.stringify(L.lines) + ' ' + L.cols.map(col => J(`campKeysHeight(${JSON.stringify(col)})`)).join(','));
  check('a line of words fits its column (at 8.4 px a letter) and the caps fit their room', J(`campKeysPage().every(g => g.rows.every(r => r.t.length * 8.4 <= CAMPKEYS.colW - CAMPKEYS.capsW && r.caps.reduce((w, k) => w + Math.max(24, Math.ceil(k.length * 7.8) + 14) + 4, 0) <= CAMPKEYS.capsW))`));
  g.run(`window.S2 = __scene(); __all.length = 0; campKeysOpen(S2);`);
  const t = J('__texts()');
  check('opened, the page draws its title, its footer, every group heading and a line for every row', t.includes('CAMPAIGN  -  ALL THE KEYS') && t.some(x => /^H or Esc closes this page/.test(x)) && page.every(p => t.includes(p.title)) && page.flatMap(p => p.rows).every(r => t.includes(r.t)), t.length + ' texts');
  check('it is one page that closes: s.ck is the open page, H or Esc closes it, and a second open while open does nothing', J('campKeysIsOpen(S2)') && J('campKeysOpen(S2)') === false && J('campKeysKey(S2, "KeyH")') === true && J('S2.ck') === null && J('__live().length') === 0);
  const title = src('src/title.js');
  check('the title\'s Campaign panel says H and H (or the label) opens the page; the page takes the keys while it is open so no key starts a game', /campKeysToggle\(this\)/.test(title) && /title\.camp\.keys/.test(title) && /campKeysIsOpen\(this\)\) \{ campKeysKey\(this, e\.code\); return; \}/.test(title) && /e\.code === 'KeyH' && typeof campKeysToggle/.test(title) && J(`uiText('title.camp.keys')`) === 'H  all the keys');
  check('index.html loads the three files once each: campkeys.js, camppanel.js, campanelsdraw.js', ['campkeys', 'camppanel', 'campanelsdraw'].every(f => src('index.html').split('src/' + f + '.js').length === 2));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PANELS DRAW FAIL (${failed} of ${n})` : `\nCAMPAIGN PANELS DRAW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
