// smoke: the page HUD's edge pills (card space-game-edge-pills-position): a pill shows only while its ship is off the screen (a little play at the edge, no flicker), sits on the edge toward the ship where the line from the screen's middle crosses it (never walked round to a corner), points at the ship, and the canvas's amber goal arrow for the nearest hostile is not drawn while the hostiles' pill is up
// Troy, playing 1.2 on 25 Nov 2026 (two screenshots): the pill of the miners and the pill of the hostiles stood in the bottom right corner with a wrong arrow, and showed while the ships were on the screen. Cause: the canvas HUD's keep rectangles (the key line along the whole bottom) decided where the arrow stood and whether a ship counted as on the screen, but the page HUD has no such rectangles.
//   A  the rule on its own: campEdgeOffscreen (CAMP.nav.pill: appear within `show` px of the border or beyond, go when `hide` px inside)
//   B  the sight functions with the page's rule: no keep rectangles, the point on the border, the canvas's own call unchanged
//   C  the model: a pill for a ship south / east / north-west stands on that edge, not in a corner; the arrow points at the ship from where the pill is; the hostiles' pill the same
//   D  the hysteresis through the model and the view (view.was, R.was)
//   E  the canvas's goal arrow for a hostile is hidden while the hostiles' pill is up; the files
// Run: node tests/campedgepills.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');

console.log('A. the rule on its own');
check('the table: show 8 px, hide 36 px (the hide one is the larger: the pill stays longer than it takes to come)', J('CAMP.nav.pill.show') === 8 && J('CAMP.nav.pill.hide') === 36);
check('the middle of the screen is on the screen; beyond the border is off it', J('campEdgeOffscreen(640, 360, 1280, 720, false)') === false && J('campEdgeOffscreen(-50, 360, 1280, 720, false)') === true && J('campEdgeOffscreen(640, 900, 1280, 720, false)') === true);
check('not shown: a ship 20 px inside the border is on the screen (no pill yet); 4 px inside, at the border or past it, it is off', J('campEdgeOffscreen(640, 700, 1280, 720, false)') === false && J('campEdgeOffscreen(640, 716, 1280, 720, false)') === true && J('campEdgeOffscreen(1280, 360, 1280, 720, false)') === true);
check('shown: the same ship 20 px and 30 px inside is still off (the pill stays); 40 px inside it is on the screen and the pill goes', J('campEdgeOffscreen(640, 700, 1280, 720, true)') === true && J('campEdgeOffscreen(640, 690, 1280, 720, true)') === true && J('campEdgeOffscreen(640, 680, 1280, 720, true)') === false && J('campEdgeOffscreen(640, 670, 1280, 720, true)') === false);
check('all four sides and the corners count', [[4, 360], [1276, 360], [640, 4], [640, 716], [4, 4], [1276, 716]].every(([x, y]) => J(`campEdgeOffscreen(${x}, ${y}, 1280, 720, false)`) === true));

console.log('B. the sight functions with the page\'s rule');
g.run(`
  CAMP.flags.pagehud = true; window.C = campNew(1, [], { seed: 5, mission: 2 }); C.god = true; for (let i = 0; i < 450 && !C.result; i++) campStep(C, 1 / 30); C.t = 100000; C.ships = C.ships.filter(u => u.team !== 'alien');
  window.VO = { x: C.carrier.x - 640, y: C.carrier.y - 360, zoom: 1 };
  window.HO = campFriNumbered(C).map(e => e.unit).find(u => u && u.kind === 'freighter');
  window.__at = (u, sx, sy) => { u.x = C.carrier.x + (sx - 640); u.y = C.carrier.y + (sy - 360); return u; }; // a ship at this place on the screen (the camera is on the cruiser, zoom 1)
`);
g.run(`__at(HO, 640, 900);`);
const pg = J('campSightFriends(C, VO, W, H, 1, true, { was: {} })'), cv = J('campSightFriends(C, VO, W, H, 1, true)');
check('a ship below the screen, in the middle: the page\'s point is on the bottom border, in the middle (no walk round the key line to the corner)', pg.length === 1 && Math.abs(pg[0].x - 640) < 1 && Math.abs(pg[0].y - 680) < 1, JSON.stringify(pg));
check('the canvas\'s call (no page) is as it was: the key line is a keep rectangle, so the point is walked round to the corner (the old fault, kept for the canvas HUD)', cv.length === 1 && cv[0].x > 1200, JSON.stringify(cv));
g.run(`__at(HO, 640, 690);`);
check('a ship 30 px above the bottom, in the keep rectangle of the key line: the canvas calls it off the screen; the page does not (the page has no key line)', J('campSightFriends(C, VO, W, H, 1, true).length') === 1 && J('campSightFriends(C, VO, W, H, 1, true, { was: {} }).length') === 0);
g.run(`__at(HO, 1274, 360);`);
check('a ship at the right border: the page says off; one on the screen in the middle of the HUD\'s corners (under the old rectangles) is on', J('campSightFriends(C, VO, W, H, 1, true, { was: {} }).length') === 1 && (g.run(`__at(HO, 200, 100);`), J('campSightFriends(C, VO, W, H, 1, true).length') === 1 && J('campSightFriends(C, VO, W, H, 1, true, { was: {} }).length') === 0));
g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x, C.carrier.y + 3000); RA.vx = RA.vy = 0; C.t = 100000; campSightStep(C);`);
const ha = J('campSightArrows(C, VO, W, H, 1, { was: {} })'), hc = J('campSightArrows(C, VO, W, H, 1)');
check('hostiles due south: the page\'s point is the bottom border in the middle; the canvas\'s (the old call) the corner', ha.length === 1 && Math.abs(ha[0].x - 640) < 1 && Math.abs(ha[0].y - 680) < 1 && hc.length === 1 && hc[0].x > 1200, JSON.stringify([ha, hc]));
g.run(`__at(RA, 640, 690);`);
check('a hostile 30 px above the bottom: the canvas\'s call has it (the keep rectangle); the page has none', J('campSightArrows(C, VO, W, H, 1).length') === 1 && J('campSightArrows(C, VO, W, H, 1, { was: {} }).length') === 0);
g.run(`RA.hp = 0; RA.gone = true; C.ships = C.ships.filter(u => u !== RA);`);

console.log('C. the model');
const angTo = (f, tx, ty) => Math.atan2(ty - f.y, tx - f.x);
const at = (sx, sy) => { g.run(`__at(HO, ${sx}, ${sy});`); return J('campPageModel(C, VO).fedges'); };
const south = at(640, 1100), east = at(1500, 360), nw = at(-300, -250), north = at(640, -400), west = at(-500, 360);
check('a ship due south: ONE pill on the bottom edge in the middle (not the corner), the arrow pointing down', south.length === 1 && Math.abs(south[0].x - 640) < 120 && south[0].y > 640 && Math.abs(south[0].angle - Math.PI / 2) < 0.2, JSON.stringify(south));
check('a ship due east: the pill on the right edge at the height of the ship, the arrow pointing right', east.length === 1 && east[0].x > 1000 && Math.abs(east[0].y - 360) < 40 && Math.abs(east[0].angle) < 0.15, JSON.stringify(east));
check('a ship due north: the top edge in the middle, the arrow up; due west: the left edge, the arrow left', north.length === 1 && Math.abs(north[0].x - 640) < 120 && north[0].y < 80 && Math.abs(north[0].angle + Math.PI / 2) < 0.2 && west.length === 1 && west[0].x < 280 && Math.abs(west[0].y - 360) < 40 && Math.abs(Math.abs(west[0].angle) - Math.PI) < 0.15, JSON.stringify([north, west]));
check('a ship up and to the left (north-west): its pill is at the top left, not on the south or east side', nw.length === 1 && nw[0].y < 120 && nw[0].x < 640, JSON.stringify(nw));
check('every arrow points at its ship from where the pill is (not the way the border point pointed): within a hair', [[south, 640, 1100], [east, 1500, 360], [nw, -300, -250], [north, 640, -400], [west, -500, 360]].every(([p, tx, ty]) => Math.abs(Math.atan2(Math.sin(p[0].angle - angTo(p[0], tx, ty)), Math.cos(p[0].angle - angTo(p[0], tx, ty)))) < 0.01), JSON.stringify([south, east, nw, north, west].map(p => p[0].angle)));
const edgeAt = (sx, sy) => { g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x + ${sx - 640}, C.carrier.y + ${sy - 360}); RA.vx = RA.vy = 0; C.t = 100000; campSightStep(C);`); const e = J('campPageModel(C, VO).edge'); g.run(`C.ships = C.ships.filter(u => u !== RA);`); return e; };
g.run(`__at(HO, 640, 360);`);
const hs = edgeAt(640, 1100), he = edgeAt(1500, 360);
check('the hostiles\' pill: hostiles due south have the arrow pointing down (the bottom edge), hostiles due east have it pointing right', !!hs && Math.abs(hs.x - 640) < 120 && hs.y > 640 && Math.abs(hs.angle - Math.PI / 2) < 0.2 && !!he && he.x > 1000 && Math.abs(he.angle) < 0.15, JSON.stringify([hs, he]));
g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x + 100, C.carrier.y + 50); RA.vx = RA.vy = 0; C.t = 100000; campSightStep(C);`);
check('hostiles on the screen: no pill for them; a ship on the screen: none for it', J('campPageModel(C, VO).edge') === null && J('campPageModel(C, VO).fedges.length') === 0);
g.run(`C.ships = C.ships.filter(u => u !== RA);`);

console.log('D. no flicker at the edge');
g.run(`__at(HO, 640, 716);`);
const d1 = J('campPageModel(C, VO)');
check('a ship 4 px from the bottom: it has its pill; the model says which pills show (was)', d1.fedges.length === 1 && d1.was[HOid()] === true, JSON.stringify(d1.was));
function HOid() { return J('HO.id'); }
g.run(`__at(HO, 640, 700);`);
const d2 = J('campPageModel(C, VO)'), d3 = J(`campPageModel(C, Object.assign({}, VO, { was: ${JSON.stringify(d1.was)} }))`);
check('20 px inside: no pill from a cold start, but the pill that was shown stays', d2.fedges.length === 0 && d3.fedges.length === 1);
g.run(`__at(HO, 640, 670);`);
const d4 = J(`campPageModel(C, Object.assign({}, VO, { was: ${JSON.stringify(d3.was)} }))`);
check('50 px inside: the pill that was shown goes (the ship is on the screen)', d4.fedges.length === 0 && !d4.was[HOid()]);
g.run(`
  const mk = tag => { const e = { tag, children: [], parentNode: null, _cls: '', _text: '', _inner: '', style: new Proxy({ setProperty(k, v) { this[k] = v; } }, { set(o, k, v) { o[k] = v; return true; } }) };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } }); Object.defineProperty(e, 'innerHTML', { get() { return e._inner; }, set(v) { e._inner = v; } });
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.insertBefore = (c, ref) => { c.parentNode = e; const i = e.children.indexOf(ref); e.children.splice(i < 0 ? e.children.length : i, 0, c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    e.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720, bottom: 150 }); return e; };
  window.document = { createElement: mk, body: mk('body') };
  window.__scene = () => ({ camp: C, mode: 'play', mp: null, game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } }, events: { once() {} } });
  window.SO = __scene(); SO.cameras = { main: { scrollX: VO.x, scrollY: VO.y, zoom: 1 } }; __at(HO, 640, 716); campPageHudSync(SO, 0);
`);
const sh = () => J('SO.pageHud.fedges.filter(p => p.el.style.display !== "none").length');
check('the view keeps the pills shown: a ship 4 px from the bottom has its pill; at 20 px it keeps it; at 50 px the pill is hidden; at 20 px again (coming back) it does not return before the border', sh() === 1 && (g.run(`__at(HO, 640, 700); campPageHudSync(SO, 200);`), sh() === 1) && (g.run(`__at(HO, 640, 670); campPageHudSync(SO, 400);`), sh() === 0) && (g.run(`__at(HO, 640, 700); campPageHudSync(SO, 600);`), sh() === 0) && (g.run(`__at(HO, 640, 718); campPageHudSync(SO, 800);`), sh() === 1));

g.run(`__at(HO, 640, 1100); window.RA = campSpawn(C, 'raider', C.carrier.x + 700, C.carrier.y + 3000); RA.vx = RA.vy = 0; C.t = 100000; campSightStep(C); campPageHudSync(SO, 2000);`);
const view = J(`(() => { const R = SO.pageHud, pos = p => ({ x: parseFloat(p.el.style.left), y: parseFloat(p.el.style.top), a: parseFloat(p.ic._ph['--a']) }); return { f: R.fedges.filter(p => p.el.style.display !== 'none').map(pos), e: R.edge.el.style.display !== 'none' ? pos(R.edge) : null }; })()`);
const aim = (p, tx, ty) => { const want = Math.atan2(ty - p.y, tx - p.x) * 180 / Math.PI, d = Math.abs(((p.a - want) % 360 + 540) % 360 - 180); return d < 1.5; };
check('the view (after the panels are cleared): the ship\'s pill is at the bottom edge in the middle and the hostiles\' pill at the bottom edge too, each arrow turned to its ship from the place the pill is drawn at', view.f.length === 1 && Math.abs(view.f[0].x - 640) < 120 && view.f[0].y > 640 && !!view.e && view.e.y > 640 && aim(view.f[0], 640, 1100) && aim(view.e, 640 + 700 * 1, 360 + 3000 * 1), JSON.stringify(view));
g.run(`C.ships = C.ships.filter(u => u !== RA);`);

console.log('E. the goal arrow of the canvas, the files');
check('campPageHudHasFoePill: true while the last model has the hostiles\' pill; false without it, without a model and for a scene with no page HUD', J('campPageHudHasFoePill({ pageHud: { last: { edge: { n: 2 } } } })') === true && J('campPageHudHasFoePill({ pageHud: { last: { edge: null } } })') === false && J('campPageHudHasFoePill({ pageHud: {} })') === false && J('campPageHudHasFoePill({})') === false && J('campPageHudHasFoePill(null)') === false);
const cs = code('src/campaignscene.js');
check('the scene draws no amber goal arrow for the nearest hostile (kind alien) while the hostiles\' pill is up; the ship pill\'s rule is as it was', /campPageHudHasPill\(this, ar0\.ref\)\) \|\| \(ar0\.kind === 'alien' && typeof campPageHudHasFoePill === 'function' && campPageHudHasFoePill\(this\)\)\) \? null : ar0/.test(cs));
const ps = code('src/campsight.js'), pp = code('src/camppagehud.js');
check('the sight functions take the page\'s rule as the last argument and then pass NO keep rectangles to the border point; without it the call is the canvas\'s as before', /campEdgeOffscreen\(sx, sy, W_, H_, !!\(page\.was && page\.was\.hostiles\)\)/.test(ps) && /campEdgeOffscreen\(sx, sy, W_, H_, !!\(page\.was && page\.was\[b\.id\]\)\)/.test(ps) && (ps.match(/page \? null : A\.keep/g) || []).length === 2);
check('the page HUD asks with { was }, keeps what showed (R.was) and aims every arrow at its ship from where the pill ends', /campSightArrows\(C, \{ x: view\.x, y: view\.y \}, campPageW\(\), campPageH\(\), view\.zoom > 0 \? view\.zoom : 1, \{ was: view\.was \|\| \{\} \}\)/.test(pp) && /campSightFriends\([^;]*true, \{ was: view\.was \|\| \{\} \}\)/.test(pp) && /R\.was = M\.was/.test(pp) && /angle: it\.tx != null \? Math\.atan2\(it\.ty - put\[i\]\.y, it\.tx - put\[i\]\.x\) : it\.angle/.test(pp) && /angle: f\.tx != null \? Math\.atan2\(f\.ty - put\[i\]\.y, f\.tx - put\[i\]\.x\) : f\.angle/.test(pp));
check('no new text key, no number of the pill rule typed in the code (the table has them)', !/uiText\('camp\.pagehud\./.test(pp) && !/campEdgeOffscreen[^;]*\b(8|36)\b/.test(code('src/campedgespread.js')) && /CAMP\.nav\.pill/.test(code('src/campedgespread.js')));

console.log(failed ? `\nEDGE PILLS FAIL: ${failed} of ${n} checks failed` : `\nEDGE PILLS OK: ${n} checks`);
process.exit(failed ? 1 : 0);
