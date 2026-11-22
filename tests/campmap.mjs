// smoke: the Campaign map: what is on it, how it fits, the key, the words, and a dry run of the drawing (plain Node, no Chrome, nothing waits)
// Card space-game-campaign-map (src/campmap.js, src/campmapdraw.js, src/campaignscene.js). Troy had no map of the level while playing the Campaign.
//   A. the bounds of each level hold everything its data puts on the map (places, caches, relic ring, guards, tower rings, wave origins, convoy ends)
//   B. the fit puts those bounds inside the frame, centred, with the scale of the longer side
//   C. the marks of a real battle of each level: places (not the warp point), the carrier, launched ships, convoys with where they head, aliens, the mothership, caches, relic, towers
//   D. the legend lists only what is on the map; the colours are the radar's; the words are in content/text/ui.md; the key is Tab and not the mute key
//   E. the scene calls it (its source is read: a scene is Phaser's) and the battle is NOT paused; a dry run of the drawing on a recording stand-in scene raises nothing.
//      With the lists (cards one-list-keys and list-shortcuts): Esc closes an open list first, then the map, and pauses only when neither is open; opening the map closes a list (the map has the arrows and Enter);
//      a list's key (Q W E R, P O I U) over the map closes the map and opens that list; Enter over the map is never a missile; the list with no key (the stance) is not a key at all
// Run: node tests/campmap.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const F = J(`CAMPMAP.frame`);
g.run(`var __run = (C, s) => { for (let i = 0; i < s; i++) campStep(C, 1); };`);

// ---- A. the bounds ----
for (const lv of [1, 2, 3]) {
  const pts = J(`(() => { const L = CAMP.levels[${lv}], pl = campPlaces(${lv}), o = [];
    Object.keys(pl).forEach(id => { if (!pl[id].hidden && !pl[id].far) { const p = pl[id], r = p.r || 0; o.push([p.x - r, p.y - r], [p.x + r, p.y + r]); } });
    (L.caches || []).forEach(c => o.push([c[0], c[1]])); (L.guards || []).forEach(q => o.push([q.at[0], q.at[1]]));
    (L.waves || []).forEach(w => { o.push([w.from[0], w.from[1]]); if (w.mother) o.push(w.mother); });
    (L.towers || []).forEach(t => { const p = pl[t.place]; o.push([p.x - t.r, p.y - t.r], [p.x + t.r, p.y + t.r]); });
    if (L.relic) { const p = pl[L.relic.place]; o.push([p.x - L.relic.radius, p.y - L.relic.radius], [p.x + L.relic.radius, p.y + L.relic.radius]); }
    (L.convoys || []).forEach(c => o.push([pl[c.to].x, pl[c.to].y]));
    return o; })()`);
  const b = J(`campMapBounds(${lv})`);
  check(`level ${lv}: the bounds hold every place, cache, guard, wave origin, tower ring, relic ring and convoy end its data names (${pts.length} points)`, pts.every(([x, y]) => x >= b.x0 - 1e-6 && x <= b.x1 + 1e-6 && y >= b.y0 - 1e-6 && y <= b.y1 + 1e-6), JSON.stringify(b));
  const fit = J(`campMapFit(campMapBounds(${lv}), CAMPMAP.frame)`), at = (x, y) => ({ x: F.x + F.w / 2 + (x - fit.cx) * fit.s, y: F.y + F.h / 2 + (y - fit.cy) * fit.s });
  check(`level ${lv}: every one of them lands inside the frame on the screen, with the padding`, pts.every(([x, y]) => { const p = at(x, y); return p.x > F.x && p.x < F.x + F.w && p.y > F.y && p.y < F.y + F.h; }));
  const ex = (b.x1 - b.x0), ey = (b.y1 - b.y0);
  check(`level ${lv}: the scale is the smaller of the two fits (one side touches the padding), and the level is centred in the frame`, Math.abs(fit.s - Math.min(F.w / (ex * 1.16), F.h / (ey * 1.16))) < 1e-9 && Math.abs(fit.cx - (b.x0 + b.x1) / 2) < 1e-9 && Math.abs(fit.cy - (b.y0 + b.y1) / 2) < 1e-9, JSON.stringify(fit));
}
check('the bounds of a level with one small place are never closer than the minimum extent, and a level that is not there has a plain default', (() => { const b = J(`(() => { CAMP.levels[9] = { name: 'x', start: 'p', startAt: [0, 0], win: 'mother', places: { p: { x: 10, y: 10, name: 'P', r: 5 } }, convoys: [], waves: [] }; const b = campMapBounds(9); delete CAMP.levels[9]; return b; })()`), d = J(`campMapBounds(77)`); return b.x1 - b.x0 >= 3000 && b.y1 - b.y0 >= 3000 && d.x1 - d.x0 >= 3000; })());

// ---- C. the marks of real battles ----
const types = ms => ms.reduce((o, m) => { o[m.type] = (o[m.type] || 0) + 1; return o; }, {});
g.run(`var C1 = campNew(1, [], { seed: 7 }); __run(C1, 15);`);
let ms = J(`campMapMarks(C1)`), t = types(ms);
check('level 1 at 15 s: four places (Earth, Luna, Mars, Eros), the carrier, one convoy (the second leaves at 55 s) with a line to where it is heading', t.place === 4 && t.carrier === 1 && t.convoy === 1 && ms.find(m => m.type === 'convoy').to && typeof ms.find(m => m.type === 'convoy').to.x === 'number', JSON.stringify(t));
check('the places are named, Luna with its base, Earth in the Earth colour and the others in the place colour', ms.filter(m => m.type === 'place').map(m => m.name).join('|') === 'Earth|Luna / Lunar base|Mars|Eros' && ms.find(m => m.id === 'earth').color === J(`CAMPMAP.color.earth`) && ms.find(m => m.id === 'mars').color === J(`CAMPMAP.color.place`), ms.filter(m => m.type === 'place').map(m => m.name).join('|'));
check('the convoy\'s line goes to the place it was sent to (Mars: its x and y)', (() => { const c = ms.find(m => m.type === 'convoy'), mars = J(`CAMP.places.mars`); return c.to.x === mars.x && c.to.y === mars.y; })());
g.run(`campOrder(C1, 'launch', ''); __run(C1, 12);`);
ms = J(`campMapMarks(C1)`); t = types(ms);
check('after Launch the ships that left are on the map as the wing (fighters and escorts), apart from the carrier', t.wing >= 6 && t.carrier === 1, JSON.stringify(t));
g.run(`__run(C1, 40);`);
ms = J(`campMapMarks(C1)`); t = types(ms);
check('level 1 at 67 s: both convoys are flying and the first wave of aliens is on the map', t.alien >= 1 && t.convoy >= 1, JSON.stringify(t));
g.run(`var C1m = campNew(1, [], { seed: 7, god: true }); __run(C1m, 100); C1m.ships.filter(u => u.team === 'alien').forEach(u => { u.hp = 0; }); __run(C1m, 45);`); // wave 3 (with the mothership) waits for wave 2 to be dead
ms = J(`campMapMarks(C1m)`);
check('the mothership is a mark of its own when it has come (wave 3 at 140 s), and aliens are not marks of the mothership type', ms.filter(m => m.type === 'mother').length === 1 && ms.filter(m => m.type === 'alien').every(m => m.color !== J(`CAMPMAP.color.mother`)), JSON.stringify(types(ms)));
check('the order of the marks is the order they are drawn: places first, the carrier last', ms[0].type === 'place' && ms.at(-1).type === 'carrier' && ms.findIndex(m => m.type === 'mother') > ms.findIndex(m => m.type === 'alien'), ms.map(m => m.type).join());
g.run(`var C2 = campNew(2, [], { seed: 7 });`);
ms = J(`campMapMarks(C2)`); t = types(ms);
check('level 2: the star, Proxima b and the pack\'s other bodies round them are places, the warp point is not on the map, three caches, the relic ring, the guards are aliens, the carrier', t.place === 5 && ms.filter(m => m.type === 'place').map(m => m.name).sort().join() === 'Alpha Centauri,Alpha Centauri B,Proxima Centauri,Proxima b,Proxima d' && t.cache === 3 && t.relic === 1 && t.alien === 5 && t.carrier === 1, JSON.stringify(t));
g.run(`C2.caches[0].got = true; C2.relic.hold = 4;`);
ms = J(`campMapMarks(C2)`);
check('a cache that is picked up leaves the map, and the relic carries how far the hold has got (4 of 8 seconds: a half)', ms.filter(m => m.type === 'cache').length === 2 && ms.find(m => m.type === 'relic').hold === 0.5 && ms.find(m => m.type === 'relic').r === J(`CAMP.levels[2].relic.radius`));
g.run(`var C3 = campNew(3, [], { seed: 7 });`);
ms = J(`campMapMarks(C3)`); t = types(ms);
check('level 3: the alien home world and two of its moons (Kolga, Tyr; Ran is far from the warp point), twelve towers (8 and 4), the carrier; no Earth and no warp point', t.place === 3 && t.tower === 12 && t.carrier === 1 && !ms.some(m => m.id === 'earth' || m.id === 'arrival'), JSON.stringify(t));
g.run(`C3.ships.filter(u => u.kind === 'tower').slice(0, 5).forEach(u => { u.hp = 0; });`);
check('a dead tower is not on the map', J(`campMapMarks(C3)`).filter(m => m.type === 'tower').length === 7);

// ---- D. the legend, the colours, the words, the key ----
let lg = J(`campMapLegend(C1)`);
check('the legend has a row for each kind that is on the map and none for the rest (level 1 with a wing out has the carrier, the ships out, the three squads, the convoys, the aliens; no towers, no relic)', lg.map(r => r.type).join() === 'carrier,wing,red,green,yellow,convoy,alien' && !lg.some(r => /tower|relic|cache/.test(r.type)), lg.map(r => r.type).join());
lg = J(`campMapLegend(C2)`);
check('level 2\'s legend has the caches and the relic, with the number of caches left in the words', lg.some(r => r.type === 'cache' && /2/.test(r.text)) && lg.some(r => r.type === 'relic') && lg.every(r => /^[A-Z]/.test(r.text) && !/camp\.map/.test(r.text)), JSON.stringify(lg));
check('the colours: the radar and the map use one function, and it gives what the radar gave before (alien, mother, tower, convoy, carrier, wing)', J(`['raider', 'mother', 'tower'].map(k => campDotColor({ team: 'alien', kind: k }))`).join() === [0xff4d6d, 0xff4dff, 0xff9a3a].join() && J(`[['freighter', 'earth'], ['carrier', 'earth'], ['fighter', 'earth'], ['escort', 'earth']].map(([k, t]) => campDotColor({ team: t, kind: k }))`).join() === [0xffb454, 0xffffff, 0x6dff9c, 0x6dff9c].join());
const scene = readFileSync(ROOT + '/src/campaignscene.js', 'utf8'), draw = readFileSync(ROOT + '/src/campmapdraw.js', 'utf8'), pure = readFileSync(ROOT + '/src/campmap.js', 'utf8');
check('the radar asks campDotColor for its colours (one set of colours for both)', /dot\(u, campDotColor\(u\)/.test(scene));
const words = ['camp.ui.pausemap', 'camp.map.title', 'camp.map.footer', 'camp.map.across', 'camp.map.carrier', 'camp.map.wing', 'camp.map.convoy', 'camp.map.alien', 'camp.map.mother', 'camp.map.tower', 'camp.map.cache', 'camp.map.relic'];
check('every word of the map is in content/text/ui.md (not the key shown back)', words.every(k => J(`uiText(${JSON.stringify(k)}, { n: 3, name: 'X', km: '1,000' })`) !== k && J(`uiText(${JSON.stringify(k)}, { n: 3, name: 'X', km: '1,000' })`).length > 3), words.filter(k => J(`uiText(${JSON.stringify(k)})`) === k).join());
check('every legend row fits one line of the right column: 27 letters at most with a number up to 99 (8-GEN saw "Convoys (1), a line to where each is hea" run off the panel), and the column has room for 27 letters of the 14 px monospace font', ['carrier', 'wing', 'convoy', 'alien', 'mother', 'tower', 'cache', 'relic'].every(k => J(`uiText('camp.map.${k}', { n: 99 })`).length <= 27) && 947 + 27 * 8.4 <= 1190, ['carrier', 'wing', 'convoy', 'alien', 'mother', 'tower', 'cache', 'relic'].map(k => J(`uiText('camp.map.${k}', { n: 99 })`).length).join());
check('the key line and the pause card say the map key: "Tab map"', /Tab Map/.test(J(`campKeyLine()`)) && /^Tab /.test(J(`uiText('camp.ui.pausemap')`)) && J(`CAMPMAP.key`) === 'Tab');
check('the map key is not the mute key (M mutes in every screen, src/meta.js) and not a key the Campaign flies, commands or debugs by: it is no other direct key of the table (CAMP_KEYS), no list\'s key (Q W E R, P O I U), no debug key, and CAMP_KEYS.map says the same key', J(`CAMPMAP.key`) !== 'KeyM' && !/^(Key[A-Z]|Arrow.*|Space|Digit\d|Escape|Enter|Semicolon|Slash|Period|Bracket.*|Backslash|Backquote)$/.test(J(`CAMPMAP.key`)) && J(`Object.keys(CAMP_KEYS).filter(id => id !== 'map' && CAMP_KEYS[id].codes.includes(CAMPMAP.key)).length`) === 0 && J(`CAMP_PANELS.panels.every(p => p.code !== CAMPMAP.key)`) && J(`CAMP_DEBUG.keys.every(r => r.code !== CAMPMAP.key)`) && J(`JSON.stringify(CAMP_KEYS.map.codes)`) === '["Tab"]' && /e\.code === 'KeyM'/.test(readFileSync(ROOT + '/src/meta.js', 'utf8')));

// ---- E. the scene and a dry run of the drawing ----
check('the scene installs the map\'s Tab key once in create, Esc closes an open list first, then the map, and pauses only when neither is open, every frame paints the map while it is open, and a card closes it', /campMapInstall\(this\)/.test(scene) && (scene.match(/campMapInstall\(this\)/g) || []).length === 1 && /campKeyCodes\('pause'\)\.indexOf\(c\) >= 0\) \{ if \(listOpen\) campPanelsClose\(this\); else if \(this\.mp\) campMapClose\(this\); else this\.showPause\(\)/.test(scene) && /if \(this\.mp\) campMapPaint\(this, time\)/.test(scene) && /campMapClose\(this\); \/\/ a card/.test(scene) && /this\.mp = null/.test(scene));
check('the map and the lists share the arrows and Enter, one at a time: opening the map closes an open list (campMapOpen), the key of any list (Q W E R T, P O I U: a list that HAS a code; the convoy, escorts and stance lists have none and are no key) over the map closes the map and then opens that list, Enter over the map is never a missile, and the map is asked for its keys before the lists are', /campPanelsClose\(s\)/.test(draw.slice(draw.indexOf('function campMapOpen'), draw.indexOf('function campMapOpen') + 1200)) && /if \(this\.mp && !typing && \(CAMP_PANELS\.panels\.some\(p => p\.code && p\.code === c\) \|\| campKeyIs\('missile', c\)\)\) \{ if \(campKeyIs\('missile', c\)\) return; campMapClose\(this\); \}/.test(scene) && scene.indexOf('campMapKey(this, c, e.shiftKey)') > 0 && scene.indexOf('campMapKey(this, c, e.shiftKey)') < scene.indexOf('campPanelKey(this.pn, C, c, now)') && J(`CAMP_PANELS.panels.filter(p => p.code).map(p => p.key).join('')`) === 'QWERTPOIU' && J(`CAMP_PANELS.panels.filter(p => !p.code).map(p => p.id).join()`) === 'convoy,escorts,stance' && J(`(() => { const P = campPanelNew(), r = campPanelKey(P, campNew(1, [], { seed: 1 }), '', 0); return !r.used && r.open === ''; })()`));
check('the battle is not paused behind the map: no scene pause, no stop of the sim, in the drawing or in the scene\'s map lines', !/scene\.pause|\.pause\(\)|physics\.pause|timeScale/.test(draw + pure) && /update\(time, dt\)/.test(scene) && /this\.mode === 'play' && !C\.result/.test(scene));
check('the pause card lists the map key (a line of its own, above the debug line)', /uiText\('camp\.ui\.pausemap'\), uiText\('camp\.ui\.pausepanels'/.test(scene));
check('the pure file reaches nothing of the page or of Phaser; the drawing file masks nothing (no geometry mask: a ship past the frame is drawn on its edge)', !/\b(Phaser|document|window|localStorage|setTimeout|geometryMask|setMask)\b/.test(pure.replace(/\/\/.*$/gm, '')) && !/setMask|createGeometryMask/.test(draw));
{
  const html = readFileSync(ROOT + '/index.html', 'utf8'), at = f => html.indexOf('src/' + f);
  check('index.html loads campmap.js and campmapdraw.js once each, after campaign.js and the scene', (html.match(/src\/campmap\.js/g) || []).length === 1 && (html.match(/src\/campmapdraw\.js/g) || []).length === 1 && at('campaign.js') < at('campmap.js') && at('campmap.js') < at('campmapdraw.js'));
}
// the Tab key: a listener of the scene's own on the window, in the battle only
{
  g.run(`
    var __h = [], __win = { addEventListener: (t, f) => { __h.push([t, f]); }, removeEventListener: (t, f) => { __h = __h.filter(x => x[1] !== f); } };
    var __ev = {}, __ts = { camp: C1, mode: 'play', leaving: false, panel: false, mp: null, add: __mk0(), make: __mk0(), events: { once: (n, f) => { __ev[n] = f; } } };
    function __mk0() { return new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : __mk0()), apply: () => __mk0() }); }
    var __off = campMapInstall(__ts, __win);
    var __tab = (o) => __h.forEach(([t, f]) => f(Object.assign({ code: 'Tab', repeat: false, target: { tagName: 'CANVAS' } }, o || {})));
  `);
  check('the scene\'s window listener is added once, for keydown, and comes off when the scene shuts down', J(`__h.length`) === 1 && J(`__h[0][0]`) === 'keydown' && J(`typeof __ev.shutdown`) === 'function' && J(`typeof __off`) === 'function');
  g.run(`__tab()`); const o1 = J(`!!__ts.mp`);
  g.run(`__tab()`); const o2 = J(`!!__ts.mp`);
  check('Tab opens the map in the battle and Tab closes it', o1 === true && o2 === false);
  g.run(`__tab({ code: 'KeyM' }); __tab({ code: 'KeyW' }); __tab({ repeat: true });`);
  check('another key, and a held-down Tab, do nothing (M is the mute key and stays that)', J(`__ts.mp`) === null);
  g.run(`__ts.pn = campPanelNew(); campPanelKey(__ts.pn, C1, 'KeyQ', 0); campPanelKey(__ts.pn, C1, 'ArrowDown', 0);`); const l0 = J(`[campPanelOpen(__ts.pn), __ts.pn.at]`);
  g.run(`__tab()`); const l1 = J(`[!!__ts.mp, campPanelOpen(__ts.pn), __ts.pn.at]`);
  g.run(`__tab()`); const l2 = J(`[!!__ts.mp, campPanelOpen(__ts.pn)]`);
  g.run(`campPanelKey(__ts.pn, C1, 'KeyP', 0); __tab();`); const l3 = J(`[!!__ts.mp, campPanelOpen(__ts.pn)]`); g.run(`__tab();`);
  check('Tab with the Q list open (its highlight on the second row) opens the map and CLOSES the list: the map has the arrows and Enter, so only one of them is open; Tab again closes the map and the list stays shut; the P list the same', l0.join() === 'fleet,1' && l1.join() === 'true,,0' && l2.join() === 'false,' && l3.join() === 'true,' && J(`__ts.mp`) === null, JSON.stringify([l0, l1, l2, l3]));
  g.run(`__tab({ target: { tagName: 'INPUT' } });`);
  check('a Tab typed in the command strip\'s box is not the map', J(`__ts.mp`) === null);
  for (const m of ['intro', 'won', 'pick', 'pause', 'lost', 'end']) { g.run(`__ts.mode = '${m}'; __tab();`); check(`Tab does nothing while the scene shows its "${m}" card`, J(`__ts.mp`) === null); }
  g.run(`__ts.mode = 'play'; __ts.leaving = true; __tab(); __ts.leaving = false; __ts.panel = true; __tab(); __ts.panel = false;`);
  check('and nothing while the scene is leaving or its old panel flag is up', J(`__ts.mp`) === null);
  g.run(`__tab(); __ts.mode = 'won';`); const stillOpen = J(`!!__ts.mp`);
  g.run(`__tab();`);
  check('Tab closes an open map whatever the mode has become (a card that came up closes it too, from the scene)', stillOpen === true && J(`__ts.mp`) === null);
  g.run(`__ev.shutdown(); `);
  check('after the shutdown the listener is gone', J(`__h.length`) === 0);
  check('with a target that cannot listen the install does nothing and does not throw', J(`campMapInstall({ events: null }, {})`) === null);
}
// a recording stand-in for the scene: every call is noted, every property is another stand-in; the drawing runs against it
g.run(`
  var __calls = [];
  var __mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : __mk(path + '.' + String(k))), apply: (t, self, args) => { __calls.push([path, args]); return __mk(path + '()'); } });
  var __sc = { camp: C2, add: __mk('add'), make: __mk('make') };
`);
g.run(`__sc.mode = 'play'; campMapOpen(__sc)`);
const opened = J(`!!__sc.mp`), texts = J(`__calls.filter(c => c[0] === 'add.text').map(c => c[1][2])`);
check('open: the scene has a map with its objects; the title, the footer, a name for each place (upper case) and the legend rows are made', opened && J(`__sc.mp.objs.length`) > 10 && texts.some(x => /^MAP\s+-\s+LEVEL 2: Alpha Centauri$/.test(x)) && texts.some(x => /Tab or Esc closes/.test(x)) && texts.includes('ALPHA CENTAURI') && texts.includes('PROXIMA B'), texts.join(' | '));
g.run(`__calls.length = 0; campMapPaint(__sc, 100); campMapPaint(__sc, 200);`);
const paint = J(`__calls.map(c => c[0])`);
check('painting twice (two frames) clears and redraws: the marks (circles, points), the grid and the frame are drawn', paint.filter(p => /clear/.test(p)).length === 2 && paint.some(p => /fillCircle/.test(p)) && paint.some(p => /fillPoints/.test(p)) && paint.some(p => /lineBetween/.test(p)), paint.slice(0, 8).join());
g.run(`C2.relic.hold = 3; C2.carrier.x = 99999; C2.carrier.y = -99999; __calls.length = 0; campMapPaint(__sc, 300);`);
check('a ship far outside the level is pinned to the edge of the frame (nothing is drawn outside it) and the relic\'s hold arc is drawn', J(`__calls.filter(c => /fillPoints$/.test(c[0])).every(c => c[1][0].every(p => p.x >= CAMPMAP.frame.x - 10 && p.x <= CAMPMAP.frame.x + CAMPMAP.frame.w + 10 && p.y >= CAMPMAP.frame.y - 10 && p.y <= CAMPMAP.frame.y + CAMPMAP.frame.h + 10))`) && J(`__calls.some(c => /\\.arc$/.test(c[0]))`));
g.run(`campMapClose(__sc);`);
check('closing destroys the objects and the scene has no map; closing twice is harmless', J(`__sc.mp`) === null && J(`(() => { campMapClose(__sc); campMapClose(__sc); campMapClose({}); campMapClose(null); return true; })()`) === true && J(`__calls.filter(c => /destroy$/.test(c[0])).length`) >= 10);
for (const lv of [1, 3]) {
  g.run(`var __s${lv} = { camp: C${lv}, add: __mk('add'), make: __mk('make') }; campMapOpen(__s${lv}); campMapPaint(__s${lv}, 1); campMapClose(__s${lv});`);
}
check('the drawing runs for levels 1 and 3 too, with no error', true);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN MAP FAIL (${failed} of ${n})` : `CAMPAIGN MAP PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
