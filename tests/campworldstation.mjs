// smoke: the world look's stations and docking mark (plain Node, no Chrome): the steel ring and hexagon painters, the station field, drawPlace with the look on and off, the dashed gold docking ring only while selling ore is the goal, Long Haul's station art untouched
// Card space-game-world-w3-stations (piece W3 of the world look; the scope report is on card space-game-world-look-scope; the mock is docs/world-look-mock.html, direction 1). src/campworldstation.js is the table (CAMPSTATION), the painters and the rule;
// the switch is campWorldOn (src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0).
//   A  the colours: steel and its facet are the mock's, no fight colour (delta E 20 or more from each side's colour of the ships and from gold)
//   B  the painters: the ring is an annulus (even-odd) with four spokes, a hub and a thin dark rim; the hexagon a polygon with its facet; no gradient, no glow; the texture 256 px, made once
//   C  the field: Luna is a hexagon, Ceres (no field) a ring, an unknown value a ring
//   D  the Campaign: drawPlace puts the steel station where it always stood (70 east, 60 north of its place), scaled world / R, with the look on; Long Haul's `station` picture at 0.16 with it off
//   E  the docking mark: rings only while the first objective not done is a cashin (selling ore), round the market outposts the scene draws; none for another goal, a won or docked battle, the look off; twelve dashes, gold, polylines (no arc)
//   F  Long Haul's station art is not read or changed; the file loads nothing from the web
// Run: node tests/campworldstation.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`if (typeof campWorldOn !== 'function') window.campWorldOn = () => CAMP.flags.worldlook === true;`); // (the switch is src/campworldlook.js's: this is for a checkout that has not got it yet)

const hexOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lab = h => { const [r, gg, b] = hexOf(h).map(lin), X = (0.4124 * r + 0.3576 * gg + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * gg + 0.0722 * b, Z = (0.0193 * r + 0.1192 * gg + 0.9505 * b) / 1.08883, f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

// ---- A. the colours ----
console.log('A. the colours');
{
  const mock = src('docs/world-look-mock.html'), steel = /steel:'(#[0-9a-f]{6})'/.exec(mock), facet = /steelD:'(#[0-9a-f]{6})'/.exec(mock), gold = /gold:'(#[0-9a-f]{6})'/.exec(mock);
  check('steel #8fa3b5 and its facet #4c5d70 are the mock\'s (read from the mock file)', !!steel && !!facet && J('CAMPSTATION.steel') === steel[1] && J('CAMPSTATION.facet') === facet[1], JSON.stringify([steel && steel[1], facet && facet[1]]));
  const C = J('SLOOK.C'), fight = [C.friend, C.friendHi, C.protect, C.foe, C.alien, C.own, '#e9b872'], bad = [];
  ['#8fa3b5', '#4c5d70'].forEach(c => fight.forEach(f => { if (dE(c, f) < 20) bad.push(c + ' ~ ' + f + ' ' + dE(c, f).toFixed(1)); }));
  check('neither is a fight colour: delta E 20 or more from each side\'s colour of the ships and from gold', bad.length === 0, bad.join('; '));
  check('the docking ring is the HUD\'s goal gold (the mock\'s #e9b872)', !!gold && J('CAMPSTATION.dock.color') === parseInt(gold[1].slice(1), 16), JSON.stringify(gold));
}

// ---- B. the painters ----
console.log('B. the painters');
g.run(`
  window.__rec = () => { const calls = [], ctx = new Proxy({}, { get: (t, k) => { if (k === 'calls') return calls; if (k === 'then') return undefined; return (...a) => { calls.push([String(k), a]); return ctx; }; }, set: (t, k, v) => { calls.push(['set ' + String(k), [v]]); return true; } }); return ctx; };
  window.__st = kind => { const c = __rec(); campStationPaint(c, 256, kind); return c.calls; };
`);
{
  const ring = J(`__st('ring')`), hex = J(`__st('hex')`), nm = c => c.map(x => x[0]), fills = c => c.filter(x => x[0] === 'set fillStyle').map(x => x[1][0]);
  check('the ring: an annulus filled even-odd in steel, four spokes in the facet tone, a hub in steel, a thin dark rim last', nm(ring).filter(x => x === 'fillRect').length === 4 && ring.some(x => x[0] === 'fill' && x[1][0] === 'evenodd') && fills(ring)[0] === '#8fa3b5' && fills(ring).includes('#4c5d70') && ring.filter(x => x[0] === 'set strokeStyle').pop()[1][0] === 'rgba(5,8,14,.9)' && nm(ring).lastIndexOf('stroke') > nm(ring).lastIndexOf('fill'), JSON.stringify(fills(ring)));
  check('the hexagon: a six-cornered polygon in steel, then its facet in the darker tone; no spokes, no ring', nm(hex).filter(x => x === 'lineTo').length === 10 && nm(hex).filter(x => x === 'moveTo').length === 2 && fills(hex).join() === '#8fa3b5,#4c5d70' && nm(hex).filter(x => x === 'fillRect').length === 0 && !hex.some(x => x[0] === 'fill' && x[1][0] === 'evenodd'), JSON.stringify([nm(hex).filter(x => x === 'lineTo').length, fills(hex)]));
  check('no gradient, no glow, no blend, no shadow in either', [ring, hex].every(c => !nm(c).some(x => /Gradient|createPattern|drawImage|shadow/i.test(x)) && !c.some(x => /globalCompositeOperation|shadow/.test(x[0]))));
  g.run(`window.__store = {}; window.__sc = { textures: { exists: k => !!__store[k], createCanvas: (k, w, h) => { __store[k] = { w, h, ctx: __rec(), refreshed: 0 }; return { getContext: () => __store[k].ctx, refresh() { __store[k].refreshed++; } }; } } }; window.__a = campStationTexture(__sc, { station: 'hex' }); window.__c1 = __store['cstation-hex'].ctx.calls.length; window.__b = campStationTexture(__sc, { station: 'hex' }); window.__r = campStationTexture(__sc, {});`);
  check('the texture: 256 by 256, one per kind (cstation-ring, cstation-hex), painted once and kept, R 110', J('__a.key') === 'cstation-hex' && J('__a.R') === 110 && J('__store["cstation-hex"].w') === 256 && J('__store["cstation-hex"].refreshed') === 1 && J('__store["cstation-hex"].ctx.calls.length') === J('__c1') && J('__r.key') === 'cstation-ring');
}

// ---- C. the field ----
console.log('C. the station field');
{
  check('Luna (the Lunar base, a base on a moon) is a hexagon; Ceres (no field) and a place with an unknown value are a ring; a place that says nothing is a ring', J(`campPlaces('home').luna.station`) === 'hex' && J(`campStationKind(campPlaces('home').luna)`) === 'hex' && J(`campStationKind(campPlaces(1).ceres)`) === 'ring' && J(`campStationKind({ station: 'dome' })`) === 'ring' && J(`campStationKind({})`) === 'ring' && J(`campStationKind(null)`) === 'ring');
}

// ---- D. the Campaign draws it ----
console.log('D. the Campaign draws it');
g.run(`
  window.Phaser = { BlendModes: { ADD: 'ADD' } };
  window.__log = []; window.__chain = nm => new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => { __log.push([nm, String(k), a]); return __chain(nm); }) });
  window.__dpOld = { p: planetTexture, s: starTexture }; window.planetTexture = () => 'old-planet'; window.starTexture = () => 'old-star';
  window.__draw = (flag, p, id) => { __log.length = 0; CAMP.flags.worldlook = flag; const store = {}, sc = Object.create(Campaign.prototype); sc.textures = { exists: k => !!store[k], createCanvas: (k) => { store[k] = { ctx: __rec() }; return { getContext: () => store[k].ctx, refresh() {} }; } };
    sc.add = { image: (x, y, key) => { __log.push(['image', key, x, y]); return __chain('im:' + key); }, text: () => __chain('text'), rectangle: () => __chain('rect') }; sc.placeLabels = []; sc.placeSets = []; sc.drawPlace(p, id); CAMP.flags.worldlook = false; return __log.map(x => x.slice(0, 2).concat(x[0] === 'image' ? [x[2], x[3]] : [JSON.stringify(x[2])])); };
`);
{
  const ceres = { x: 100, y: 200, name: 'Ceres', kind: 'ice', seed: 31, r: 90, base: 'Occator Works' }, luna = { x: 0, y: 0, name: 'Luna', kind: 'rock', seed: 3, r: 45, base: 'Lunar base', station: 'hex' };
  const on = J(`__draw(true, ${JSON.stringify(ceres)}, 'ceres')`), stn = on.filter(x => x[0] === 'image' && /^cstation-/.test(x[1]));
  check('the look on: the Works is one image of the steel ring (cstation-ring), where it always stood (70 east, 60 north of Ceres), scaled 32 / 110, above the planet (depth 2); Long Haul\'s `station` picture is not used', stn.length === 1 && stn[0][1] === 'cstation-ring' && stn[0][2] === 170 && stn[0][3] === 140 && !on.some(x => x[0] === 'image' && x[1] === 'station') && on.some(x => x[0] === 'im:cstation-ring' && x[1] === 'setScale' && Math.abs(JSON.parse(x[2])[0] - 32 / 110) < 1e-9) && on.some(x => x[0] === 'im:cstation-ring' && x[1] === 'setDepth' && JSON.parse(x[2])[0] === 2), JSON.stringify(on.filter(x => x[0] !== 'text')));
  const lun = J(`__draw(true, ${JSON.stringify(luna)}, 'luna')`);
  check('the Lunar base is the steel hexagon (cstation-hex)', lun.some(x => x[0] === 'image' && x[1] === 'cstation-hex'));
  const off = J(`__draw(false, ${JSON.stringify(ceres)}, 'ceres')`);
  check('the look off: today\'s: Long Haul\'s `station` picture at 0.16, no steel station', off.some(x => x[0] === 'image' && x[1] === 'station') && !off.some(x => /cstation/.test(x[1])) && off.some(x => x[0] === 'im:station' && x[1] === 'setScale' && JSON.parse(x[2])[0] === 0.16));
  const noBase = J(`__draw(true, { x: 0, y: 0, name: 'Vesta', kind: 'rock', seed: 41, r: 60 }, 'vesta')`);
  check('a place with no base has no station, with the look on or off', !noBase.some(x => /station/.test(x[1])));
  g.run(`window.planetTexture = __dpOld.p; window.starTexture = __dpOld.s;`);
  const sc = src('src/campaignscene.js');
  check('the scene asks the docking mark each frame (one line in update)', /campDockMarkSync\(this\);/.test(sc) && sc.split('campDockMarkSync(this)').length === 2);
}

// ---- E. the docking mark ----
console.log('E. the docking mark');
g.run(`
  window.__camp = (types, mod) => { CAMP.flags.worldlook = true; const C = campNew(1, [], { seed: 3, mission: 1 }); C.L.objectives = types.map(t => (t === 'cashin' ? { type: 'cashin', n: 160 } : t === 'ore' ? { type: 'ore', n: 450 } : { type: t })); if (mod) mod(C); return C; };
  window.__marks = (types, mod) => { const C = __camp(types, mod), m = campDockMarks(C); CAMP.flags.worldlook = false; return m; };
`);
{
  const only = J(`__marks(['cashin'])`), ore = J(`__marks(['ore', 'kill', 'cashin'])`), kill = J(`__marks(['kill'])`);
  const ceres = J(`campPlaces(1).ceres`);
  check('selling ore is the first goal not done: one ring, round the Occator Works (the one market outpost of level 1: Ceres), 48 world px (1.5 times the station\'s 32) round the station\'s place', only.length === 1 && only[0].id === 'ceres' && only[0].x === ceres.x + 70 && only[0].y === ceres.y - 60 && Math.abs(only[0].r - 48) < 1e-9, JSON.stringify(only));
  check('not while mining the ore or killing the attackers comes first (mission 1.2\'s order: ore, kill, then cashin), nor for a goal that is no sale', ore.length === 0 && kill.length === 0 && J(`__marks(['deliver'])`).length === 0 && J(`__marks(['scan'])`).length === 0);
  check('docking there is the goal also while the ore is being mined with ore aboard (the HUD says "Q dock at the Works", and a sale counts toward the sale goal): the sale not done and ore in the store is a ring; no ore aboard, no ring; no sale in the mission, no ring; the sale done, no ring (card space-game-world-batch-fixes: 1.2 showed none while mining)', J(`__marks(['ore', 'kill', 'cashin'], C => { C.ore = 260; })`).length === 1 && J(`__marks(['ore', 'kill', 'cashin'], C => { C.ore = 0; })`).length === 0 && J(`__marks(['ore', 'kill'], C => { C.ore = 260; })`).length === 0 && J(`__marks(['deliver', 'cashin'], C => { C.ore = 5; })`).length === 1 && J(`__marks(['ore', 'cashin'], C => { C.ore = 300; C.oreBest = 450; C.sold = 200; })`).length === 0 && J(`__marks(['cashin'], C => { C.ore = 0; })`).length === 1);
  check('the Lunar Base is no market (and Earth neither): only Ceres has a ring', J(`campOutposts(1).filter(o => o.market).map(o => o.id)`).join() === 'ceres');
  check('not in a won or lost battle, nor while docked', J(`__marks(['cashin'], C => { C.result = 'won'; })`).length === 0 && J(`__marks(['cashin'], C => { C.docked = 'ceres'; })`).length === 0);
  check('a far place is ringed only where the scene draws it (within CAMP.world.draw of the carrier); Ceres is a near place of level 1', J(`campPlaces(1).ceres.far`) !== true && J('CAMP.world.draw') === 3600);
  g.run(`window.__gcalls = []; window.__gr = { clear() { __gcalls.push(['clear']); return __gr; }, lineStyle(...a) { __gcalls.push(['lineStyle', a]); return __gr; }, strokePoints(p, c, o) { __gcalls.push(['strokePoints', p.length, c, o]); return __gr; }, strokeCircle() { __gcalls.push(['strokeCircle']); return __gr; }, arc() { __gcalls.push(['arc']); return __gr; } }; campDockMarkDraw(__gr, [{ id: 'ceres', x: 170, y: 140, r: 48 }], 0.335);`);
  const calls = J('__gcalls'), dashes = calls.filter(x => x[0] === 'strokePoints'), ls = calls.find(x => x[0] === 'lineStyle');
  check('a ring is twelve dashes (short polylines of five points, open), in goal gold, about 1.6 px on the screen (4.8 world px at zoom 0.335), drawn on a cleared Graphics; no arc, no circle (the cheap way, src/campcircles.js)', dashes.length === 12 && dashes.every(x => x[1] === 5 && x[2] === false) && calls[0][0] === 'clear' && !calls.some(x => x[0] === 'arc' || x[0] === 'strokeCircle') && ls[1][1] === 0xe9b872 && Math.abs(ls[1][0] - 1.6 / 0.335) < 1e-9, JSON.stringify(ls));
  g.run(`__gcalls.length = 0; campDockMarkDraw(__gr, [], 1); window.__w = []; campDockMarkDraw({ clear() {}, lineStyle(w) { __w.push(w); }, strokePoints() {} }, [{ x: 0, y: 0, r: 48 }], 0.001);`);
  check('no ring: the Graphics is only cleared; zoomed far out the line is capped at 12 world px', J('__gcalls').length === 1 && J('__gcalls[0][0]') === 'clear' && J('__w[0]') === 12);
  g.run(`window.__sync = (flag, types, mod) => { CAMP.flags.worldlook = flag; const C = __camp(types, mod); CAMP.flags.worldlook = flag; const made = [], s = { camp: C, cameras: { main: { zoom: 0.335 } }, add: { graphics: () => { const o = { depth: 0, setDepth(d) { o.depth = d; return o; }, clear() { o.cleared = (o.cleared || 0) + 1; return o; }, lineStyle() { return o; }, strokePoints() { o.dashes = (o.dashes || 0) + 1; return o; } }; made.push(o); return o; } } }; campDockMarkSync(s); const r = { made: made.length, dashes: made[0] && made[0].dashes || 0, depth: made[0] && made[0].depth }; CAMP.flags.worldlook = false; return r; };`);
  g.run(`window.__restart = () => { CAMP.flags.worldlook = true; const C = __camp(['cashin']); CAMP.flags.worldlook = true; const made = [], mkG = () => { const o = { setDepth() { return o; }, clear() { return o; }, lineStyle() { return o; }, strokePoints() { return o; } }; made.push(o); return o; }, s = { camp: C, cameras: { main: { zoom: 0.335 } }, add: { graphics: mkG } }; campDockMarkSync(s); const first = s.dockG; first.active = false; first.scene = undefined; campDockMarkSync(s); const second = s.dockG; campDockMarkSync(s); CAMP.flags.worldlook = false; return { made: made.length, renewed: second !== first, kept: s.dockG === second }; };`);
  check('a scene that starts again (a retry, the next mission) has a dead dock-ring layer: the sync makes a new one; a live layer is kept', J('__restart()').made === 2 && J('__restart()').renewed === true && J('__restart()').kept === true);
  check('the scene\'s one call: with the look on and selling ore the goal, one Graphics (depth 2.2, over the station) with twelve dashes; look off, or another goal: no Graphics is made', J(`__sync(true, ['cashin'])`).made === 1 && J(`__sync(true, ['cashin'])`).dashes === 12 && J(`__sync(true, ['cashin'])`).depth === 2.2 && J(`__sync(false, ['cashin'])`).made === 0 && J(`__sync(true, ['ore', 'cashin'])`).made === 0);
}

// ---- F. Long Haul ----
console.log('F. Long Haul keeps its own station');
{
  const lh = ['src/stationart.js', 'src/art_world.js', 'src/boot.js', 'src/station.js', 'src/stationlook.js', 'src/space.js'].map(f => [f, src(f)]);
  check('Long Haul\'s station art and scenes do not mention the steel stations or the docking mark: not read, not changed', lh.every(([f, s]) => !/campStation|CAMPSTATION|campDockMark|cstation-|worldlook/i.test(s)), lh.filter(([f, s]) => /campStation|CAMPSTATION|campDockMark|cstation-|worldlook/i.test(s)).map(x => x[0]).join());
  const d = src('src/campworldstation.js');
  check('the file draws with the 2D context and the Graphics only: no web request, no image file, no web font, no library', !/https?:|fetch\(|XMLHttpRequest|new Image|\.png|\.jpg|@font-face|import |require\(/.test(d.replace(/\/\/.*$/gm, '')));
  check('the file is a script of the page (a tag in index.html) and the game made no error', /<script src="src\/campworldstation\.js"><\/script>/.test(src('index.html')) && g.errors.length === 0, g.errors.join(' | '));
}

console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
