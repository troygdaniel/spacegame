// smoke: the Campaign's worlds: all of Sol (the Sun, the eight planets, Luna, the asteroids, the main belt as a ring of rocks), the rings round every star, the whole-system map (plain Node, no Chrome)
// Card space-game-campaign-sol (src/campsol.js, CAMP.world and the `world` line of each level in src/campaign.js, src/campmap.js, src/campmapdraw.js, src/campaignscene.js). The data is Long Haul's own, the Sol pack (mods/sol),
// read from MODS at runtime. The level's own places never move; the rest are added round the star at their rings and angles, far ones flagged, with the rings and the belts for the map.
//   A. the pack and the build: what each level got, the rings sorted and one to a distance
//   B. Sol: the Sun and every planet there, their distances from the Sun are the pack's rings at the Campaign's scale, the order of the planets, how far Neptune is
//   C. the belt: one ring of rocks between Mars and Jupiter, every rock inside it, the same every time; the Trojan camps are clusters
//   D. Alpha Centauri and Epsilon Eridani: the star in the middle, its rings, its planets and belts, the level's own places where they were
//   E. the map: the area and the whole system, the rings clipped to the frame, the rocks in the frame, the names, Z
//   F. the scene: a far body is made when the carrier comes near and taken down when it leaves; stars are drawn as stars; the radar leaves the far ones out
//   G. with the pack gone the Campaign is what it was
// Run: node tests/campsol.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const K = J('CAMP.world');
const P = lv => J(`campPlaces(${lv})`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---- A. the pack and the build ----
check('the Sol pack is in the page as MODS whether or not it is switched on: Sol, Alpha Centauri and Epsilon Eridani', ['sol', 'alpha-centauri', 'epsilon-eridani'].every(id => J(`campWorldPack('${id}') !== null && campWorldPack('${id}').bodies.length > 3`)) && J(`campWorldPack('nowhere')`) === null);
check('each of the three levels has its world: a star, rings, and the system it is', [1, 2, 3].every(lv => { const w = J(`campWorldOf(${lv})`); return w && w.star && w.rings.length >= 1 && ['sol', 'alpha-centauri', 'epsilon-eridani'][lv - 1] === w.system; }));
check('the rings are sorted from the star out, and no two are within the tolerance of each other (bodies at one distance share a ring)', [1, 2, 3].every(lv => J(`campWorldOf(${lv}).rings`).every((r, i, a) => r > 0 && (!i || (r - a[i - 1]) / a[i - 1] > K.ringTol - 1e-9))));
check('the numbers are CAMP.world (the table): scale, planetR, starR, farFrom, ringTol, bandJoin, clusterTol, dots, clusterDots, draw, skip', ['scale', 'planetR', 'starR', 'farFrom', 'ringTol', 'bandJoin', 'clusterTol', 'dots', 'clusterDots', 'draw'].every(k => typeof K[k] === 'number') && Array.isArray(K.skip));

// ---- B. Sol ----
const sol = P(1), W1 = J('campWorldOf(1)'), sun = sol.sun;
check('the level\'s own four places have not moved: Earth (0, 0), Luna (238, -137), Mars (4064, 571), Eros (-1705, -3206)', sol.earth.x === 0 && sol.earth.y === 0 && sol.luna.x === 238 && sol.luna.y === -137 && sol.mars.x === 4064 && sol.mars.y === 571 && sol.eros.x === -1705 && sol.eros.y === -3206);
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
check('the Sun, the eight planets, Luna, Eros and the three big asteroids are all places of level 1', planets.every(id => sol[id]) && sol.luna && sol.eros && ['ceres', 'vesta', 'pallas'].every(id => sol[id]) && sun && sun.kind === 'star' && sun.name === 'Sun', Object.keys(sol).join());
check('every body has a name, a size, a place on the map, and a look the planet art knows (rock, ice, gas, lava, ringed)', Object.keys(sol).every(id => { const p = sol[id]; return p.name && Number.isFinite(p.x) && Number.isFinite(p.y) && p.r > 0 && (p.kind === 'star' || ['rock', 'ice', 'gas', 'lava', 'ringed'].includes(p.kind)); }));
check('Pluto is not taken (the card has the eight planets); the moons of Mars, Jupiter and Saturn are not places (Luna is the level\'s own)', !sol.pluto && !sol.io && !sol.titan && !sol.phobos);
check('the bodies of the level\'s own area are not far; the Sun and the other planets, which are thousands of px off, are far', ['earth', 'luna', 'mars', 'eros'].every(id => !sol[id].far) && ['sun', 'mercury', 'venus', 'jupiter', 'saturn', 'uranus', 'neptune', 'ceres'].every(id => sol[id].far));
const k = K.scale;
check('each far planet is on its ring: its distance from the Sun is the pack\'s ring at the Campaign\'s scale (to a px)', [['mercury', 43547], ['venus', 59521], ['jupiter', 159671], ['saturn', 216174], ['uranus', 306645], ['neptune', 383853], ['ceres', 116440]].every(([id, ring]) => Math.abs(dist(sol[id], sun) - ring * k) <= 1.5 + ring * k * 0.0002), [['mercury', 43547], ['jupiter', 159671]].map(([id, ring]) => id + ' ' + Math.round(dist(sol[id], sun)) + ' vs ' + ring * k).join('; '));
check('Earth is 17,500 px from the Sun, and Mars (the level\'s own place, opposite the Sun from Earth) 21,600 px, within a hundredth of the pack\'s rings', Math.abs(dist(sol.earth, sun) - 70000 * k) < 1 && Math.abs(dist(sol.mars, sun) - 86415 * k) < 86415 * k * 0.01, dist(sol.mars, sun));
check('the planets are in their order from the Sun: Mercury, Venus, Earth, Mars, Ceres, Jupiter, Saturn, Uranus, Neptune', ['mercury', 'venus', 'earth', 'mars', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune'].every((id, i, a) => !i || dist(sol[id], sun) > dist(sol[a[i - 1]], sun)));
const toNep = dist(sol.neptune, sol.earth);
check('Neptune is 80,000 to 125,000 px from Earth (the pack\'s ring at 1 to 12: 96,000 px from the Sun)', toNep > 80000 && toNep < 125000, Math.round(toNep));
check('a place has the same id in the list the carrier flies to: campNavRows has every one, the far ones flagged and the Sun flagged as a star', (() => { const rows = J('(() => { const C = campNew(1, [], { seed: 3 }); return campNavRows(C).filter(r => r.group === "places").map(r => ({ id: r.id, far: r.far, star: r.star })); })()'); return planets.every(id => rows.some(r => r.id === 'place:' + id)) && rows.find(r => r.id === 'place:sun').star === true && rows.find(r => r.id === 'place:neptune').far === true && rows.find(r => r.id === 'place:mars').far === false; })());

// ---- B2. fast travel across the system ----
const trip = (id, fast) => J(`(() => { const C = campNew(1, [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); const row = campNavRows(C).find(r => r.id === '${id}');
  const d0 = Math.hypot(row.x - C.carrier.x, row.y - C.carrier.y), eta = campNavEta(C, d0, ${fast}), burn0 = campNavGo(C, row, ${fast}).burn; let t = 0, top = 0;
  while (C.nav && C.nav.on && t < 3000) { campStep(C, 1 / 30); t += 1 / 30; top = Math.max(top, Math.hypot(C.carrier.vx, C.carrier.vy)); }
  return { d0, eta, burn0, took: t, top, left: Math.hypot(row.x - C.carrier.x, row.y - C.carrier.y) - (row.r || 0), result: !!C.result }; })()`);
const near = trip('place:mars', true), nep = trip('place:neptune', true), nepSlow = trip('place:neptune', false);
check('one helper decides the burn: regular is 1, Fast is CAMP.nav.fast up to farFrom, CAMP.nav.farFast past it', J('[campNavBurn(99999, false), campNavBurn(4000, true), campNavBurn(CAMP.nav.farFrom, true), campNavBurn(CAMP.nav.farFrom + 1, true)]').join() === `1,${J('CAMP.nav.fast')},${J('CAMP.nav.fast')},${J('CAMP.nav.farFast')}`);
check('Earth to Mars (4,100 px) is still a Fast trip of the old burn: top speed 2 times the carrier\'s, arriving a stop distance from it', near.burn0 === J('CAMP.nav.fast') && Math.abs(near.top - 2 * J('CAMP.carrier.speed')) < 3 && near.left < 130, JSON.stringify(near));
check('Earth to Neptune on Fast: the far burn (672 px/s, Long Haul\'s cruise at 1 to 12), 2 to 3.5 minutes, and the map\'s time is within 10 percent of the trip', nep.burn0 === J('CAMP.nav.farFast') && Math.abs(nep.top - J('CAMP.carrier.speed') * J('CAMP.nav.farFast')) < 3 && nep.took > 120 && nep.took < 210 && Math.abs(nep.eta - nep.took) / nep.took < 0.1, JSON.stringify(nep));
check('it stops at the planet, not past it (the brake holds at 672 px/s): within a stop distance and a bit', nep.left > 0 && nep.left < 160, nep.left);
check('Earth to Neptune at regular speed is the long way: about 9 minutes (the carrier\'s own 210 px/s)', nepSlow.took > 480 && nepSlow.took < 620 && nepSlow.burn0 === 1, JSON.stringify(nepSlow));
check('the burn is decided once by the distance at the start: a trip begun far keeps its far burn when it is near', J(`(() => { const C = campNew(1, [], { seed: 3, god: true }); const row = campNavRows(C).find(r => r.id === 'place:jupiter'); campNavGo(C, row, true); C.carrier.x = row.x - 2000; C.carrier.y = row.y; return C.nav.burn === CAMP.nav.farFast; })()`));

// ---- C. the belt ----
const B = W1.bands;
check('the main belt is ONE band of rocks (the pack has three belts on rings 19 percent apart), between Mars\'s ring and Jupiter\'s', B.length === 1 && B[0].r0 > dist(sol.mars, sun) && B[0].r1 < dist(sol.jupiter, sun) && /Main Belt/.test(B[0].name), JSON.stringify(B.map(b => [b.r0, b.r1])));
check('Ceres, Vesta and Pallas are inside the band (they are the belt\'s big rocks)', ['ceres', 'vesta', 'pallas'].every(id => dist(sol[id], sun) > B[0].r0 - 400 && dist(sol[id], sun) < B[0].r1 + 400));
check('the band has CAMP.world.dots rocks, all of them between its two radii from the Sun, and they go all the way round (every quarter has rocks)', B[0].dots.length === K.dots && B[0].dots.every(([x, y]) => { const d = Math.hypot(x - sun.x, y - sun.y); return d >= B[0].r0 - 1 && d <= B[0].r1 + 1; }) && [0, 1, 2, 3].every(q => B[0].dots.some(([x, y]) => Math.floor(((Math.atan2(y - sun.y, x - sun.x) + Math.PI) / (Math.PI / 2))) % 4 === q)));
check('the rocks are the same every time (seeded): a second build gives the same rocks', J('JSON.stringify(campWorldBuild(Object.assign({}, CAMP.levels[1], { worldData: undefined }))).length') > 1000 && JSON.stringify(J('campWorldBuild(CAMP.levels[1]).bands[0].dots.slice(0, 20)')) === JSON.stringify(B[0].dots.slice(0, 20)));
check('the Trojan camps (belts on Jupiter\'s own ring) are clusters of rocks round their places, not rings: Greek and Trojan', W1.clusters.length === 2 && W1.clusters.every(c => c.dots.length === K.clusterDots && c.dots.every(([x, y]) => Math.hypot(x - c.x, y - c.y) <= c.r + 1) && Math.abs(Math.hypot(c.x - sun.x, c.y - sun.y) - dist(sol.jupiter, sun)) < dist(sol.jupiter, sun) * 0.01));

// ---- D. the other stars ----
const ac = P(2), W2 = J('campWorldOf(2)');
check('Alpha Centauri: the star is the level\'s own place "sun" (where it was), Proxima b is where it was, and the pack\'s other bodies are added round the star: B, Proxima, Proxima d', W2.star.id === 'sun' && ac.sun.x === -1800 && ac.sun.y === -3600 && ac.proxima.x === 1200 && ac.proxima.y === 800 && ac['alpha-cen-b'] && ac['proxima-w'] && ac['proxima-d'] && ac['proxima-w'].name === 'Proxima Centauri' && Object.keys(ac).filter(id => /proxima/.test(id) && ac[id].name === 'Proxima b').length === 1);
check('the pack\'s Proxima b is not added again (the level\'s place is it); the new bodies sit near the star on their rings, in the same order of distance as the pack: B nearest, then the Proxima group', dist(ac['alpha-cen-b'], ac.sun) < dist(ac.proxima, ac.sun) && Math.abs(dist(ac['proxima-d'], ac.sun) - dist(ac.proxima, ac.sun)) < dist(ac.proxima, ac.sun) * 0.1 && !ac['proxima-b']);
check('Proxima b is on its ring to the pack\'s proportions: the whole system is scaled by Proxima b\'s distance from the star (k > 1 here)', W2.k > 1 && Math.abs(W2.k * 15000 * k - dist(ac.proxima, ac.sun)) < 1, W2.k);
check('Alpha Centauri has a ring of rocks (the Centauri Drift), round the star at the pack\'s ring, with all its rocks in it', W2.bands.length === 1 && W2.bands[0].name === 'Centauri Drift' && W2.bands[0].dots.every(([x, y]) => { const d = Math.hypot(x - ac.sun.x, y - ac.sun.y); return d >= W2.bands[0].r0 - 1 && d <= W2.bands[0].r1 + 1; }));
const ee = P(3), W3 = J('campWorldOf(3)');
check('Epsilon Eridani: the alien home world is where it was and is the pack\'s Aegir (not added twice); the star is a K star, a place of its own, far from the towers', ee.home.x === 0 && ee.home.y === 0 && !ee['epsilon-eridani-b'] && ee.star.kind === 'star' && ee.star.star === 'K' && dist(ee.star, ee.home) > 5000 && ee.star.far === true && W3.star.type === 'K');
check('the home world is on a ring round that star (k = 3: the rings are three times the pack\'s) and both belts, inner and outer, are bands of rocks round the star, the home world between them', W3.rings.length === 1 && Math.abs(W3.rings[0] - 8500 * k * 3) < 2 && W3.bands.length === 2 && W3.bands[0].r1 < W3.rings[0] && W3.bands[1].r0 > W3.rings[0] && W3.bands.every(b => b.dots.length === K.dots), JSON.stringify([W3.rings, W3.bands.map(b => [b.r0, b.r1])]));
check('the level\'s other data is untouched: the warp point, the towers\' home, the tower rings; level 2\'s caches and relic place', ee.arrival.x === -7000 && ee.arrival.hidden === true && J('CAMP.levels[3].towers.length') === 2 && J('CAMP.levels[2].relic.place') === 'proxima' && J('CAMP.levels[2].caches.length') === 3);

// ---- E. the map ----
const bounds = (lv, whole) => J(`campMapBounds(${lv}, ${!!whole})`);
const b1 = bounds(1), b1w = bounds(1, true);
check('the area view of level 1 is what it was (the level\'s own places, caches, waves): the far bodies are not in it', b1.x0 === -4200 && b1.y0 === -4400 && b1.x1 === 4174 && b1.y1 === 3800, JSON.stringify(b1));
check('the whole-system view holds the Sun and every ring to Neptune\'s: a square round the Sun as wide as the outermost ring', b1w.x0 <= sun.x - Math.max(...W1.rings) + 1 && b1w.x1 >= sun.x + Math.max(...W1.rings) - 1 && b1w.y0 <= sun.y - Math.max(...W1.rings) + 1 && b1w.y1 >= sun.y + Math.max(...W1.rings) - 1 && Math.max(...W1.rings) > 95000, JSON.stringify(b1w));
check('the same for the other stars: the whole view is at least the area view, and holds the outermost belt', [2, 3].every(lv => { const a = bounds(lv), w = bounds(lv, true), wd = J(`campWorldOf(${lv})`), far = Math.max(...wd.rings, ...wd.bands.map(b => b.r1)); return w.x0 <= a.x0 + 1 && w.x1 >= a.x1 - 1 && w.y0 <= a.y0 + 1 && w.y1 >= a.y1 - 1 && w.x1 - w.x0 >= 2 * far - 2; }));
g.run(`var Cm = campNew(1, [], { seed: 3 });`);
const marks = whole => J(`campMapMarks(Cm, ${!!whole}).filter(m => m.type === 'place').map(m => m.id)`);
check('the area view has the four places, the whole view all of them (and the Sun is a star: the warm colour)', marks().join() === 'earth,luna,mars,eros' && marks(true).length === Object.keys(sol).length && marks(true).includes('sun') && J(`campMapMarks(Cm, true).find(m => m.id === 'sun').color`) === J('CAMPMAP.color.star'));
const F = J('CAMPMAP.frame'), R = { x: F.x, y: F.y, w: F.w, h: F.h }, ok = pts => pts.every(p => p.every(([x, y]) => x >= F.x - 1e-6 && x <= F.x + F.w + 1e-6 && y >= F.y - 1e-6 && y <= F.y + F.h + 1e-6));
const arcs = (cx, cy, r) => J(`campMapArcs(${cx}, ${cy}, ${r}, ${JSON.stringify(R)})`);
const mid = { x: F.x + F.w / 2, y: F.y + F.h / 2 };
check('a ring wholly in the frame is all there, closed (the first and last points meet)', (() => { const a = arcs(mid.x, mid.y, 100); return a.length === 1 && Math.hypot(a[0][0][0] - a[0].at(-1)[0], a[0][0][1] - a[0].at(-1)[1]) < 1 && a[0].length >= 48 && ok(a); })());
check('a ring that crosses the frame is only the pieces inside it, every point inside; one that does not touch it is nothing; one that holds the whole frame is nothing', (() => { const cross = arcs(F.x, mid.y, 300), none = arcs(F.x - 2000, F.y - 2000, 50), holds = arcs(mid.x, mid.y, 5000); return cross.length >= 1 && ok(cross) && none.length === 0 && holds.length === 0; })());
check('a huge ring far outside the frame whose edge runs across it is a smooth line, not a polygon of corners: no step strays from the true circle by half a px, and a piece runs to the edge of the frame (the steps are clipped, not dropped)', (() => { const a = arcs(mid.x - 20000, mid.y, 20000 + 200); return a.length >= 1 && ok(a) && a.every(pc => pc.every((p, i, l) => !i || Math.pow(Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]), 2) / (8 * 20200) < 0.5)) && a.some(pc => pc.some(p => Math.abs(p[1] - F.y) < 1e-6 || Math.abs(p[1] - F.y - F.h) < 1e-6)); })());
check('a ring of zero or less radius, or nothing at all, draws nothing and does not throw', arcs(mid.x, mid.y, 0).length === 0 && arcs(mid.x, mid.y, -5).length === 0 && J(`campMapArcs(NaN, 0, 10, ${JSON.stringify(R)})`).length === 0);
check('the rocks in the frame are only those in the frame', (() => { const dots = [[0, 0], [100, 100], [5000, 5000], [-5000, 0]], inside = J(`campMapDotsIn(${JSON.stringify(dots)}, (x, y) => ({ x: ${mid.x} + x * 0.5, y: ${mid.y} + y * 0.5 }), ${JSON.stringify(R)})`); return inside.length === 2 && inside.every(p => p.x >= F.x && p.x <= F.x + F.w); })());
// the drawing and the keys on a recording stand-in
g.run(`
  window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'visible' ? true : __mk(path + '.' + String(k))), apply: () => __mk(path + '()') });
  window.__texts = []; window.__calls = [];
  window.__sc = (level) => { const C = campNew(level, [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien' || u.kind === 'tower');
    const g2 = new Proxy({}, { get: (t, k) => (...a) => { __calls.push([k, a]); return g2; } });
    return { camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => g2, text: (x, y, t) => { const o = { x, y, t, vis: true, rowId: '', setText(v) { o.t = v; return o; }, setColor() { return o; }, setVisible(v) { o.vis = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() { o.gone = true; }, width: 100, height: 14, visible: true }; __texts.push(o); return o; } }, make: __mk('make'), input: { on() {}, off() {} } }; };
  window.M1 = __sc(1); campMapOpen(M1); campMapPaint(M1, 0);
`);
const names1 = J('__texts.filter(t => !t.gone && /^[A-Z ]+$/.test(t.t) && t.t.length > 2).map(t => t.t)');
check('the area view names the places of the level (Earth, Luna, Mars, Eros) and none of the far ones', ['EARTH', 'MARS', 'EROS'].every(x => names1.includes(x)) && !names1.includes('NEPTUNE') && !names1.includes('JUPITER'), names1.join());
g.run(`window.__n0 = __texts.filter(t => !t.gone).length; __calls.length = 0; window.__z = campMapKey(M1, 'KeyZ'); campMapPaint(M1, 300);`);
const names2 = J('__texts.filter(t => !t.gone && /^[A-Z ]+$/.test(t.t) && t.t.length > 2).map(t => t.t)');
check('Z: the whole system. Every body is named (Neptune, Jupiter, the Sun, the belt), the old names are taken down, and the key is the map\'s', J('__z') === true && J('M1.mp.whole') === true && ['NEPTUNE', 'JUPITER', 'SUN', 'SATURN', 'MAIN BELT'].every(x => names2.includes(x)) && J('__texts.filter(t => t.gone).length') > 3, names2.join());
check('and the view is the whole system: the mode line says so, the fit is the whole bounds', /^SYSTEM  [\d,]+ km across  Z: area$/.test(J('M1.mp.across.t')) && Math.abs(J('M1.mp.fit.s') - J(`campMapFit(campMapBounds(1, true), CAMPMAP.frame).s`)) < 1e-12, J('M1.mp.across.t'));
check('the map draws the rings (lines), the rocks (rects) and the planets (circles) in the whole view', J('__calls.some(c => c[0] === "strokePath")') && J('__calls.filter(c => c[0] === "fillRect").length') > 300 && J('__calls.some(c => c[0] === "fillCircle")'), J('__calls.map(c => c[0]).filter((x, i, a) => a.indexOf(x) === i).join()'));
g.run(`campMapKey(M1, 'KeyZ'); campMapPaint(M1, 600);`);
check('Z again: the area; its mode line says AREA', J('M1.mp.whole') === false && /^AREA  [\d,]+ km across  Z: whole$/.test(J('M1.mp.across.t')));
check('Z with the map closed is not the map\'s key', (g.run('campMapClose(M1)'), J(`campMapKey(M1, 'KeyZ')`) === false));
g.run(`window.M2 = __sc(2); campMapOpen(M2); campMapKey(M2, 'KeyZ'); campMapPaint(M2, 0);`);
check('level 2 whole: the star is named and the Centauri Drift is named; level 3: the star and both belts', ['ALPHA CENTAURI', 'CENTAURI DRIFT'].every(x => J('__texts.filter(t => !t.gone).map(t => t.t)').includes(x)) && (g.run(`campMapClose(M2); window.M3 = __sc(3); campMapOpen(M3); campMapKey(M3, 'KeyZ'); campMapPaint(M3, 0);`), ['EPSILON ERIDANI STAR', 'INNER BELT', 'OUTER BELT'].every(x => J('__texts.filter(t => !t.gone).map(t => t.t)').includes(x))));
check('a click on the list picks a far planet and the autopilot goes to it (the list has Neptune)', (() => { g.run(`window.M4 = __sc(1); campMapOpen(M4); campMapPaint(M4, 0);`); return J('M4.mp.rows.some(r => r.id === "place:neptune")'); })());

// ---- F. the scene ----
g.run(`
  window.__made = []; window.__dead = []; window.__planetTexture = planetTexture; window.__starTexture = starTexture;
  planetTexture = (s, kind, seed) => 'planet-' + kind; starTexture = (s, type) => 'star-' + type; label = () => ({ destroy() { __dead.push('label'); } });
  window.__fs = (x, y) => { const f = Object.create(Campaign.prototype); f.level = 1; f.camp = campNew(1, [], { seed: 3 }); f.camp.carrier.x = x; f.camp.carrier.y = y; f.farObjs = {}; f.farAt = 0;
    const img = (key) => { const o = { key, scale: 1, blend: null, setScale(v) { o.scale = v; return o; }, setDepth() { return o; }, setBlendMode(b) { o.blend = b; return o; }, setTint() { return o; }, destroy() { __dead.push(key); } }; __made.push(o); return o; };
    f.add = { image: (x, y, key) => img(key) }; return f; };
`);
g.run(`window.F1 = __fs(CAMP.places.earth.x, CAMP.places.earth.y); F1.syncFar(1000);`);
check('at Earth no far body is made (the nearest, Venus, is thousands of px away)', J('Object.keys(F1.farObjs).length') === 0);
g.run(`var jp = CAMP.places.jupiter; F1.camp.carrier.x = jp.x - 2000; F1.camp.carrier.y = jp.y; F1.syncFar(1300);`);
check('2,000 px from Jupiter its picture is made: one planet image (the gas kind), its label, once', J('Object.keys(F1.farObjs).join()') === 'jupiter' && J('__made.filter(o => o.key === "planet-gas").length') === 1 && J('F1.farObjs.jupiter.length') === 2);
g.run(`F1.syncFar(1400); F1.syncFar(1700);`);
check('and not made again while it is there (a few times a second, never twice)', J('__made.filter(o => o.key === "planet-gas").length') === 1);
g.run(`F1.camp.carrier.x = jp.x - 30000; __dead.length = 0; F1.syncFar(2000);`);
check('far from it again (past 1.4 times the range) it is taken down: the image and the label are destroyed', J('Object.keys(F1.farObjs).length') === 0 && J('__dead.length') === 2, J('__dead').join());
g.run(`var sp = CAMP.places.sun; F1.camp.carrier.x = sp.x - 2500; F1.camp.carrier.y = sp.y; F1.syncFar(2500); window.__sunImg = __made.find(o => o.key === 'star-G');`);
check('near the Sun it is drawn as a star, not a planet: the G star texture, added light, and made from farther off because a star is big (a star counts three times its radius)', J('Object.keys(F1.farObjs).includes("sun")') && J('!!__sunImg') && g.run('__sunImg.blend !== null') === true && Math.abs(J('__sunImg.scale') - sun.r / 48) < 1e-9, J('__sunImg && __sunImg.scale'));
g.run(`F1.camp.carrier.x = 0; F1.camp.carrier.y = 0; F1.syncFar(3000);`);
check('a scene that has not made its table (a stand-in, or before create) does nothing and does not throw', J(`(() => { const f = Object.create(Campaign.prototype); f.level = 1; f.camp = campNew(1, [], {}); f.syncFar(1000); return true; })()`));
const scene = readFileSync(ROOT + '/src/campaignscene.js', 'utf8');
check('create makes only the near places (not far ones), and update asks syncFar; the radar leaves out a far body beyond its range', /!pl\[id\]\.hidden && !pl\[id\]\.far\) this\.drawPlace/.test(scene) && /this\.syncFar\(time\)/.test(scene) && /!\(pl\[id\]\.far && Math\.hypot\(pl\[id\]\.x - c\.x, pl\[id\]\.y - c\.y\) > R\.range\)/.test(scene));

// ---- G. no pack ----
const bare = nodeGame({ replace: { 'mods.generated.js': 'var MODS = { version: 1, packs: [], errors: [] };' } });
const BJ = e => JSON.parse(bare.run(`JSON.stringify(${e}) ?? 'null'`));
check('with the pack gone the Campaign is what it was: no world, no far places, level 1 has its four places, the area view is the same, and nothing throws', [1, 2, 3].every(lv => BJ(`campWorldOf(${lv})`) === null) && Object.keys(BJ('campPlaces(1)')).join() === 'earth,luna,mars,eros' && Object.keys(BJ('campPlaces(3)')).join() === 'arrival,home' && JSON.stringify(BJ('campMapBounds(1, false)')) === JSON.stringify(b1) && BJ('campMapBounds(1, true).x0') === b1.x0 && bare.errors.length === 0, bare.errors.join(' | '));
check('and the map still opens and Z does nothing harmful', (() => { bare.run(`window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : __mk(path + '.' + String(k))), apply: () => __mk(path + '()') }); var C = campNew(1, [], { seed: 3 }); var s = { camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => __mk('g'), text: () => { const o = { setText() { return o; }, setColor() { return o; }, setVisible() { return o; }, setPosition() { return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() {}, width: 10, height: 10 }; return o; } }, make: __mk('m'), input: { on() {}, off() {} } }; campMapOpen(s); campMapKey(s, 'KeyZ'); campMapPaint(s, 0); campMapKey(s, 'KeyZ'); campMapPaint(s, 100);`); return bare.errors.length === 0; })());

// ---- the files ----
const src = readFileSync(ROOT + '/src/campsol.js', 'utf8'), pure = src.replace(/\/\/.*$/gm, '');
check('src/campsol.js is the pure half: nothing of Phaser, the page, the clock or Math.random', !/\b(Phaser|document|window|localStorage|setTimeout|Math\.random|performance|Date)\b/.test(pure));
check('it is loaded once, after campaign.js and the mods file', (() => { const h = readFileSync(ROOT + '/index.html', 'utf8'); return (h.match(/src\/campsol\.js/g) || []).length === 1 && h.indexOf('src/campaign.js') < h.indexOf('src/campsol.js') && h.indexOf('mods.generated.js') < h.indexOf('src/campsol.js'); })());
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN SOL FAIL (${failed} of ${n})` : `CAMPAIGN SOL PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
