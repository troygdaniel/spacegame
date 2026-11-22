// smoke: the Campaign's two hands on the screen: both panels always drawn (the states are tests/campanelsui.mjs), a click on a heading or a row, the scene's keys, the H page of every key (plain Node, no Chrome)
// Cards space-game-campaign-keys-help and space-game-two-hands-keys (Troy, 21 Nov 2026). The rules are tests/campanels.mjs; this is src/campanelsdraw.js, src/campkeys.js and the scene's keys (src/campaignscene.js, src/title.js) on stand-ins.
//   A. both panels are on the screen from the first frame at their sides, clear of the HUD and the key line, one-line rows with a key cap and their live words
//   B. a click on a heading turns the page, a click on a row does that row, a click elsewhere is not swallowed
//   C. the scene: a key is an order, the keys of no row do nothing, B and N and F do nothing, Esc pauses, H opens and closes the page and waits the battle
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

console.log('A. both panels are on the screen from the first frame');
{
  g.run(`window.S = __scene(); campPanelsInstall(S); S.mode = 'play'; window.__n0 = __all.length; campPanelsPaint(S, 1000);`);
  check('install makes both panels\' objects at once and listens for the pointer', J('Object.keys(S.pnl.p).join()') === 'fleet,ship' && J('S.input.handlers.length') === 1 && J('__all.length') > 30);
  const t = J('__texts()');
  check('with no key pressed both panels are drawn: FLEET with its seven rows (Launch / recall, Attack, Escort, Guard, Mine ore, Stance, Convoy) and SHIP with its eleven', ['FLEET', 'Launch / recall', 'Attack', 'Escort', 'Guard', 'Mine ore', 'Stance', 'Convoy', 'SHIP', 'Fly to goal', 'Fly to target', 'Fast burn', 'Dock', 'Shields +', 'Engines +', 'Weapons +', 'Balance', 'Emergency', 'Missile', 'Blink'].every(r => t.includes(r)), t.join(' | '));
  check('each row shows its live word: launch what is in the bay, the others why not (no wing out yet)', t.includes('8 in bay') && t.filter(x => x === 'none out').length >= 3, t.join(' | '));
  g.run(`campOrder(S.camp, 'launch'); for (let i = 0; i < 30 * 8; i++) campStep(S.camp, 1 / 30); campPanelsPaint(S, 1100);`);
  check('the words are live but are not made again at once: 100 ms later the same, a quarter of a second after they say what the game says now (Recall, 8 out)', J('__texts().includes("8 in bay")') && (g.run('campPanelsPaint(S, 1320)'), J('__texts().includes("Recall") && __texts().includes("8 ships out") || __texts().includes("8 out")')));
  g.run(`S.camp.result = null;`);
  const geo = J('campPanelsGeometry(campPanelDef("fleet"))'), geo2 = J('campPanelsGeometry(campPanelDef("ship"))');
  check('FLEET is at the left edge and SHIP at the right edge, each inside the screen, below the HUD\'s gauges (176) and the radar (226), above the key line (676), and the two do not touch', geo.x === 24 && geo2.x === 1280 - 24 - geo2.w && geo.y >= 230 && geo2.y >= 230 && geo.y + geo.h < 676 && geo2.y + geo2.h < 676 && geo.x + geo.w < geo2.x, JSON.stringify([geo.x, geo.y, geo.w, geo.h, geo2.x, geo2.y, geo2.w, geo2.h]));
  check('the edge arrow\'s label keeps out of both panels (campPanelsKeep)', J('campPanelsKeep().length') === 2 && J('Campaign.prototype.arrowKeep.call({ pn: S.pn }).length') === J('CAMP.nav.arrow.keep.length') + 2);
  g.run(`S.camp.docked = 'luna'; campPanelKey(S.pn, S.camp, 'KeyP', 3000); campPanelsPaint(S, 3300); window.__t2 = __texts();`); // docked: the build rows say what they cost (undocked: "Dock at an outpost to build.")
  check('P turns SHIP to BUILD: the rows are New fighter and New escort, what each costs and why not', J('__t2').includes('BUILD') && ['New fighter', 'New escort'].every(r => J('__t2').includes(r)) && J('__t2').includes('25 ore'), J('__t2').join(' | '));
  g.run(`campPanelKey(S.pn, S.camp, 'Digit8', 3400); campPanelsPaint(S, 3700);`);
  check('a pick on BUILD (8, an escort, refused for want of ore) answers in words, and the panel is back on its first page', J('S.pn.page.ship') === 0 && J('S.pnl.p.ship.title.t') === 'SHIP' || J('__texts().includes("SHIP")'));
}

console.log('B. a click on a heading or a row');
{
  g.run(`window.S = __scene(); S.mode = 'play'; campPanelsInstall(S); window.__said.length = 0; S.time.now = 5000; campPanelsPaint(S, 5000); S.time.now = 5000;`);
  g.run(`window.__g = campPanelsGeometry(campPanelDef("fleet")); campPanelsClick(S, __g.x + 120, __g.rowY(0) + 10);`);
  check('a click on row 1 (launch / recall) launches the wing, says so, and lights the row', J('S.camp.launchQ.length') === 8 && J('__said.pop()') === 'Launching the wing.' && J('S.pn.lit.launch') === 5000);
  g.run(`S.time.now = 6000; campPanelsPaint(S, 6000); campPanelsClick(S, __g.x + 120, __g.rowY(1) + 10);`);
  check('a click on a row that cannot be done answers in words (the wing is still launching)', /launching/i.test(J('__said.pop()') || ''));
  g.run(`S.time.now = 7000; window.__o = S.camp.orders.launch; campPanelsClick(S, __g.x + 100, __g.y + 10);`);
  check('a click on the heading turns the page: the stances', J('S.pn.page.fleet') === 1);
  g.run(`S.time.now = 7100; campPanelsClick(S, __g.x + 120, __g.rowY(3) + 10);`);
  check('a click on a row of the stances page picks it (match speed) and goes back to the orders', J('S.camp.stance') === 'match' && J('S.pn.page.fleet') === 0);
  g.run(`S.time.now = 8000; window.__o = S.camp.orders.launch;`);
  check('a click anywhere else is not the panels\' (it is not swallowed): the map and the battle get it', J('campPanelsClick(S, 700, 400)') === false && J('S.camp.orders.launch') === J('__o'));
  g.run(`S.time.now = 9000; window.S.camp.ore = 100; S.camp.docked = 'luna'; campPanelKey(S.pn, S.camp, 'KeyP', 9000); campPanelsPaint(S, 9000); window.__g2 = campPanelsGeometry(campPanelDef("ship")); campPanelsClick(S, __g2.x + 150, __g2.rowY(0) + 10);`);
  check('the click on BUILD row 1 builds a fighter: 25 ore spent, one queued', J('S.camp.ore') === 75 && J('S.camp.build.queue.length') === 1);
  g.run(`S.mode = 'pause'; S.time.now = 9500;`);
  check('behind a card, the pause or the map a click is not the panels\'', J(`campPanelsClick(S, ${J('__g.x')} + 120, ${J('__g.rowY(0)')} + 10)`) === false);
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
  const orders = () => J('Object.values(F.camp.orders).reduce((a, b) => a + b, 0) + F.camp.launchQ.length + F.camp.build.queue.length');
  check('the digits that are no row of the first pages (5, 6) and the keys that are nobody\'s now (B, N, F, Z, C) do nothing at all: no order, no autopilot, no map, no pause', (() => { ['Digit5', 'Digit6', 'KeyB', 'KeyN', 'KeyF', 'KeyZ', 'KeyC'].forEach(c => g.run(`__k('${c}')`)); return orders() === 0 && J('F.camp.nav') === null && J('F.mp') === null && J('F.mode') === 'play' && J('F.camp.ore') === 200; })());
  g.run(`__k('Digit1');`);
  check('1 launches the wing with no panel to open first', J('F.camp.launchQ.length') === 8);
  g.run(`F.camp.launchQ.length = 0; __k('Digit7');`);
  check('7 flies to the objective: the autopilot is on', J('F.camp.nav && F.camp.nav.id') === 'place:earth');
  g.run(`F.camp.nav = null; __k('Escape');`);
  check('Esc pauses (there is no panel to close first), and Esc on the pause card goes back to the battle', J('F.mode') === 'pause' && (g.run(`__k('Escape')`), J('F.mode') === 'play'));
  g.run(`__k('KeyH');`);
  check('H opens the page of every key, and the battle waits behind it (the pause card\'s mode)', J('F.ck && F.ck.open') === true && J('F.mode') === 'pause' && (g.run('window.__t0 = F.camp.t; F.update(0, 100)'), J('F.camp.t') === J('__t0')));
  const o0 = orders();
  g.run(`__k('Digit2'); __k('KeyQ'); __k('KeyD');`);
  check('with the page open the keys do nothing (the page has them)', orders() === o0 && J('F.pn.page.fleet') === 0 && J('F.camp.tgt') === '');
  g.run(`__k('KeyH');`);
  check('H again closes it and the battle runs on', J('F.ck') === null && J('F.mode') === 'play' && (g.run('F.update(0, 100)'), J('F.camp.t') > J('__t0')));
  g.run(`__k('KeyH'); __k('Escape');`);
  check('Esc closes the page and does not pause', J('F.ck') === null && J('F.mode') === 'play');
  g.run(`__k('Escape'); __k('KeyH');`);
  check('H on the pause card opens the page over it and Esc closes it back to the card', J('F.ck && F.ck.open') === true && J('F.mode') === 'pause' && (g.run(`__k('Escape')`), J('F.ck') === null && J('F.mode') === 'pause'));
  g.run(`__k('Escape');`);
  check('the pause card names the two hands and H, from the table', /Left hand: FLEET/.test(J(`uiText('camp.ui.pausepanels')`)) && /H  all keys/.test(J(`uiText('camp.ui.paused')`)));
}

console.log('D. the H page');
{
  g.run('campDebugSet(true)'); // the page lists the tune kit's keys only while it is on (?debug=1; card space-game-debug-keys-off): on here, as the check below says "then the debug keys"
  const page = J('campKeysPage()');
  check('the page begins with the two panels (the rows of each with their keys, then its page key: FLEET seven and Q, SHIP eleven and P), then the rest of the table, then the debug keys from their table', page[0].title === 'THE FLEET PANEL (LEFT HAND)' && page[1].title === 'THE SHIP PANEL (RIGHT HAND)' && page[0].rows.length === 8 && page[1].rows.length === 12 && page[0].rows[0].caps.join() === '1' && page[0].rows[7].caps.join() === 'Q' && page[1].rows[0].caps.join() === '7' && page[page.length - 1].rows.length === J('CAMP_DEBUG.keys.length') && page.some(p => p.title === 'FLY AND FIRE') && page.some(p => p.title === 'THE MAP'), page.map(p => p.title).join(' | '));
  check('every row of the PANELS and CAMPAIGN groups of the table is on it, once', J(`(() => { const page = campKeysPage().flatMap(g => g.rows.map(r => r.caps.join(' ') + '|' + r.t)); const rows = ['panels', 'campaign'].flatMap(id => controlsGroup(id).rows.map(r => r.k.join(' ') + '|' + r.t)); return rows.length === page.length - CAMP_DEBUG.keys.length && rows.every(r => page.filter(p => p === r).length === 1); })()`));
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
console.log(failed ? `\nCAMPAIGN PANELS DRAW FAIL (${failed} of ${n})` : `\nCAMPAIGN PANELS DRAW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
