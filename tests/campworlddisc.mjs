// smoke: the world look's planets, moons and stars as flat discs (plain Node, no Chrome): every world of the game has its three tones, none a fight colour (delta E and saturation), the painter's shapes and calls (patches, night crescent, rim, bands, ring, a star with no glow), the Campaign draws them with the look on and today's with it off, Long Haul's painters untouched
// Card space-game-world-w2-planets (piece W2 of the world look; the scope report is on card space-game-world-look-scope, section 3; the mock is docs/world-look-mock.html, direction 1). src/campworlddisc.js is the table (CAMPDISC) and the painter; the switch is campWorldOn (src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0).
//   A  the tones: every place of the hub and of levels 1 to 3, every moon, every Sol body has a row of its own; the mock's five are the mock's; 'sun' is two worlds (the Sun in level 1, Alpha Centauri A in level 2); a world a mod adds takes its kind's default, shaded by its seed
//   B  no fight colour: every base tone is at least 20 (CIE76 delta E) from each side's colour of the ships (SLOOK.C: yours, your glow, the ones you protect, hostile, alien, your fire) and from gold, every light patch at least 14, no base tone more saturated than 0.40; the defaults too, at the ends of their shading
//   C  the shapes (data): two or three patches and a night crescent for a rock or an ice world, three bands for a gas giant, a ring for Saturn, one patch and no crescent for a star; the same world is the same picture every time
//   D  the painter: the calls on a 2D context (a flat fill, one clip, the patches, the crescent filled even-odd in the dark tone, a thin dark rim; a star's rim is light; the ring in two halves round the disc); no gradient, no glow, no blend; the texture is 512 px and kept
//   E  the Campaign: drawPlace draws a disc (scaled r / R, no tint, no blend) with the look on and the old pictures with it off; the warp cinematic and the ready room follow
//   F  Long Haul's painters are not read or changed, and the file loads nothing from the web
// Run: node tests/campworlddisc.mjs   (exit code 1 on a failed check)
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
const sat = h => { const [r, gg, b] = hexOf(h).map(v => v / 255), mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };

// ---- A. the tones ----
console.log('A. the tones');
{
  const places = J(`(() => { const out = []; ['home', 1, 2, 3].forEach(lv => { const pl = campPlaces(lv); Object.keys(pl).forEach(id => { const p = pl[id]; if (p && p.kind) out.push({ lv, id, kind: p.kind }); }); }); return out; })()`);
  const own = J(`${JSON.stringify(places)}.map(q => !!(CAMPDISC.tones[q.id + ':' + q.kind] || CAMPDISC.tones[q.id]))`);
  const missing = places.filter((q, i) => !own[i]).map(q => q.lv + ':' + q.id + '(' + q.kind + ')');
  check('every place of the hub and of levels 1 to 3 that has a kind (' + places.length + ' of them: the Sol bodies, the moons, the three levels\' worlds) has a row of its own', places.length >= 30 && missing.length === 0, missing.join(' '));
  const moons = J('CAMP.moons.map(m => m.id)'), mmiss = moons.filter(id => !J(`!!CAMPDISC.tones[${JSON.stringify(id)}]`));
  check('every moon of CAMP.moons has one (' + moons.length + ')', moons.length >= 12 && mmiss.length === 0, mmiss.join(' '));
  const mock = src('docs/world-look-mock.html'), W = {}; mock.replace(/(\w+):\{n:'([^']+)',r:\d+,a:'(#[0-9a-f]{6})',b:'(#[0-9a-f]{6})',c:'(#[0-9a-f]{6})'\}/g, (m, k, nm, a, b, c) => { W[k] = [a, b, c]; return m; });
  const map = { earth: 'earth', luna: 'luna', ceres: 'ceres', cenb: 'alpha-cen-b', kolga: 'kolga' };
  check('the mock\'s five (Earth, Luna, Ceres, Alpha Centauri B, Kolga) are the mock\'s tones, base, night side and patches', Object.keys(map).length === 5 && Object.keys(map).every(k => W[k] && JSON.stringify(J(`CAMPDISC.tones[${JSON.stringify(map[k])}]`)) === JSON.stringify(W[k])), JSON.stringify(W));
  const sun1 = J(`campDiscTone({ kind: 'star', seed: 1 }, 'sun')`), sun2 = J(`campDiscTone({ kind: 'lava', seed: 4371 }, 'sun')`);
  check('"sun" is two worlds: the Sun of level 1 (kind star) is the flat warm white, level 2\'s Alpha Centauri A (kind lava) is rust', sun1[0] === '#ece8dc' && sun2[0] === '#8a5a46' && J(`campPlaces(1).sun.kind`) === 'star' && J(`campPlaces(2).sun.kind`) === 'lava');
  const d1 = J(`campDiscTone({ kind: 'ice', seed: 5 }, 'a-mod-world')`), d2 = J(`campDiscTone({ kind: 'ice', seed: 9 }, 'another')`), d0 = J(`CAMPDISC.kinds.ice`);
  check('a world a mod adds takes its kind\'s default, shaded a little by its seed (two such worlds are not one colour)', d1.length === 3 && d1.join() !== d2.join() && dE(d1[0], d0[0]) < 8, JSON.stringify([d1, d2, d0]));
  check('a kind the table does not know draws as rock, a star with no row as the star default', J(`campDiscTone({ kind: 'weird', seed: 0 }, 'x')`).length === 3 && J(`campDiscKind({ kind: 'weird' })`) === 'rock' && J(`campDiscTone({ kind: 'star', seed: 13 }, 'a-new-star')[0]`) === J('CAMPDISC.kinds.star[0]'));
}

// ---- B. none a fight colour ----
console.log('B. no fight colour');
{
  const C = J('SLOOK.C'), fight = [C.friend, C.friendHi, C.protect, C.foe, C.alien, C.own, '#e9b872']; // yours, your glow, the ones you protect, hostile, alien, your fire, gold (the mock's goal colour)
  const all = J('CAMPDISC.tones'), bad = [];
  Object.keys(all).forEach(k => { const [a, b, c] = all[k]; fight.forEach(f => { if (dE(a, f) < 20) bad.push(k + ' base ' + a + ' ~ ' + f + ' ' + dE(a, f).toFixed(1)); if (dE(c, f) < 14) bad.push(k + ' patch ' + c + ' ~ ' + f + ' ' + dE(c, f).toFixed(1)); }); if (sat(a) > 0.40) bad.push(k + ' saturation ' + sat(a).toFixed(2)); });
  check('every world\'s base tone is 20 or more from every side\'s colour (and from gold), its patch tone 14 or more, no base tone over 0.40 saturated (' + Object.keys(all).length + ' rows)', Object.keys(all).length >= 30 && bad.length === 0, bad.join('; '));
  const ds = []; Object.keys(J('CAMPDISC.kinds')).forEach(k => [0.94, 1].forEach(s => { const t = J(`CAMPDISC.kinds[${JSON.stringify(k)}].map(h => campDiscShade(h, ${s}))`); fight.forEach(f => { if (dE(t[0], f) < 20) ds.push(k + ' ' + s + ' base'); if (dE(t[2], f) < 14) ds.push(k + ' ' + s + ' patch'); }); if (sat(t[0]) > 0.40) ds.push(k + ' ' + s + ' sat'); }));
  check('the defaults too, with no shading and with the most', ds.length === 0, ds.join('; '));
  const sh = J(`[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => parseInt(campDiscTone({ kind: 'rock', seed: s }, 'zz')[0].substr(1, 2), 16) / parseInt(CAMPDISC.kinds.rock[0].substr(1, 2), 16))`);
  check('the shading only darkens, by at most CAMPDISC.shade (6 percent): the thirteen seeds give thirteen tones from 0.94 to 1 of the default', J('CAMPDISC.shade') === 0.06 && sh.every(r => r >= 0.93 && r <= 1.0001) && new Set(sh.map(r => r.toFixed(3))).size >= 6, JSON.stringify(sh));
}

// ---- C. the shapes ----
console.log('C. the shapes (data)');
{
  const S = (k, seed, id) => J(`campDiscShapes(${JSON.stringify(k)}, ${seed}, ${JSON.stringify(id)})`);
  const rocks = ['luna', 'vesta', 'eros', 'mars', 'phobos', 'kolga'].map(id => S('rock', 3, id)), ice = S('ice', 7, 'earth');
  check('a rock or an ice world: two or three lighter patches, a night crescent, no bands, no ring', rocks.concat([ice]).every(s => s.patches.length >= 2 && s.patches.length <= 3 && s.crescent === true && s.bands.length === 0 && s.ring === null));
  const gas = S('gas', 19, 'jupiter'), sat1 = S('ringed', 20, 'saturn');
  check('a gas giant: three lighter bands in place of patches; Saturn: bands and a thin flat ring (wider than the disc, flatter than tall)', gas.bands.length === 3 && gas.patches.length === 0 && gas.ring === null && sat1.bands.length === 3 && !!sat1.ring && sat1.ring.rx > 1.5 && sat1.ring.ry < sat1.ring.rx / 2, JSON.stringify([gas, sat1]));
  const star = S('star', 0, 'sun'); check('a star: one lighter patch and no night side', star.patches.length === 1 && star.crescent === false && star.bands.length === 0 && star.ring === null);
  check('the same world is the same picture every time, another world another one', JSON.stringify(S('rock', 3, 'luna')) === JSON.stringify(S('rock', 3, 'luna')) && JSON.stringify(S('rock', 3, 'luna')) !== JSON.stringify(S('rock', 3, 'eros')));
  check('a patch lies on the disc (its middle inside the radius), a band within it', rocks.concat([ice, gas, sat1, star]).every(s => s.patches.every(q => Math.hypot(q.x, q.y) < 1.2) && s.bands.every(b => b.y > -1 && b.y < 1 && b.h > 0)));
}

// ---- D. the painter ----
console.log('D. the painter');
g.run(`
  window.__rec = () => { const calls = [], styles = [], ctx = new Proxy({}, { get: (t, k) => { if (k === 'calls') return calls; if (k === 'styles') return styles; if (k === 'then') return undefined; return (...a) => { calls.push([String(k), a]); return ctx; }; }, set: (t, k, v) => { calls.push(['set ' + String(k), [v]]); styles.push([String(k), v]); return true; } }); return ctx; };
  window.__paint = (id, kind, seed, tone) => { const c = __rec(); campDiscPaint(c, 512, tone || campDiscTone({ kind, seed }, id), kind, campDiscShapes(kind, seed, id)); return c.calls; };
`);
{
  const P = (id, kind, seed) => J(`__paint(${JSON.stringify(id)}, ${JSON.stringify(kind)}, ${seed})`), names = c => c.map(x => x[0]);
  const rock = P('luna', 'rock', 3), tone = J(`campDiscTone({ kind: 'rock', seed: 3 }, 'luna')`), sh = J(`campDiscShapes('rock', 3, 'luna')`);
  const fills = rock.filter(x => x[0] === 'set fillStyle').map(x => x[1][0]);
  check('a rock: the disc is one flat fill of the base tone, then one clip, the patches in the light tone, the crescent in the night tone, a thin dark rim', fills[0] === tone[0] && names(rock).filter(x => x === 'clip').length === 1 && names(rock).filter(x => x === 'ellipse').length === sh.patches.length && fills.includes(tone[2]) && fills.includes(tone[1]) && rock.filter(x => x[0] === 'set strokeStyle').pop()[1][0] === 'rgba(5,8,14,.9)', JSON.stringify(fills));
  check('the crescent is filled even-odd (the disc outside one offset circle), after the patches', rock.some(x => x[0] === 'fill' && x[1][0] === 'evenodd') && names(rock).lastIndexOf('ellipse') < names(rock).indexOf('rect'));
  const all = [rock, P('jupiter', 'gas', 19), P('saturn', 'ringed', 20), P('sun', 'star', 0)];
  check('no gradient, no glow, no blend, no shadow, no image, in any kind: flat fills and thin strokes', all.every(c => !names(c).some(x => /Gradient|createPattern|drawImage|putImageData|shadow/i.test(x)) && !c.some(x => /globalCompositeOperation|shadow/.test(x[0]))));
  const gas = P('jupiter', 'gas', 19);
  check('a gas giant: three band rectangles (clipped to the disc) and no patch ellipse', names(gas).filter(x => x === 'fillRect').length === 3 && names(gas).filter(x => x === 'ellipse').length === 0);
  const ring = P('saturn', 'ringed', 20), ni = names(ring), firstArc = ni.indexOf('arc');
  check('Saturn: the ring in two halves, the far half before the disc and the near half after its rim', ni.filter(x => x === 'ellipse').length === 2 && ni.indexOf('ellipse') < firstArc && ni.lastIndexOf('ellipse') > ni.lastIndexOf('arc'));
  const star = P('sun', 'star', 0), stone = J(`campDiscTone({ kind: 'star', seed: 0 }, 'sun')`);
  check('a star: no crescent, one translucent patch, a light rim', !star.some(x => x[0] === 'fill' && x[1][0] === 'evenodd') && star.filter(x => x[0] === 'set strokeStyle').pop()[1][0] === stone[2] && star.some(x => x[0] === 'set globalAlpha' && x[1][0] === 0.6));
  const sz = J(`[CAMPDISC.size, CAMPDISC.R, CAMPDISC.ringR, campDiscShapes('ringed', 1, 'x').ring.rx]`);
  check('the canvas is 512 px; the disc 240 (a ringed world 130, so that its ring, 1.85 times as wide, fits)', sz[0] === 512 && sz[1] === 240 && sz[2] === 130 && sz[2] * sz[3] + 130 * 0.1 / 2 < 256, JSON.stringify(sz));
  g.run(`window.__tx = (store) => ({ textures: { exists: k => !!store[k], createCanvas: (k, w, h) => { store[k] = { w, h, ctx: __rec(), refreshed: 0 }; return { getContext: () => store[k].ctx, refresh() { store[k].refreshed++; } }; } } });`);
  g.run(`window.__store = {}; window.__sc = __tx(__store); window.__t1 = campDiscTexture(__sc, { kind: 'rock', seed: 3, r: 45 }, 'luna'); window.__n1 = __store['cdisc-luna-rock-3'].ctx.calls.length; window.__t2 = campDiscTexture(__sc, { kind: 'rock', seed: 3, r: 45 }, 'luna'); window.__t3 = campDiscTexture(__sc, { kind: 'ringed', seed: 20 }, 'saturn');`);
  check('the texture: one canvas of 512 by 512 per world (key from id, kind and seed), painted and refreshed once, kept; its radius R comes back with it', J('__t1.key') === 'cdisc-luna-rock-3' && J('__t1.R') === 240 && J('__store["cdisc-luna-rock-3"].w') === 512 && J('__store["cdisc-luna-rock-3"].h') === 512 && J('__store["cdisc-luna-rock-3"].refreshed') === 1 && J('__t2.key') === 'cdisc-luna-rock-3' && J('__store["cdisc-luna-rock-3"].ctx.calls.length') === J('__n1') && J('__t3.R') === 130);
}

// ---- E. the Campaign ----
console.log('E. the Campaign draws it');
g.run(`
  window.Phaser = { BlendModes: { ADD: 'ADD' } };
  window.__log = []; window.__chain = nm => new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : k === 'name' ? nm : (...a) => { __log.push([nm, String(k), a]); return __chain(nm); }) });
  window.__planetOld = planetTexture; window.__starOld = starTexture; window.__calls = [];
  window.planetTexture = (sc, kind, seed) => { __calls.push(['planet', kind, seed]); return 'old-planet'; }; window.starTexture = (sc, type) => { __calls.push(['star', type]); return 'old-star'; };
  window.__draw = (flag, p, id) => { __log.length = 0; __calls.length = 0; CAMP.flags.worldlook = flag; const store = {}, sc = Object.create(Campaign.prototype); Object.assign(sc, __tx(store)); sc.add = { image: (x, y, key) => { __log.push(['image', key, x, y]); return __chain('im:' + key); }, text: () => __chain('text'), rectangle: () => __chain('rect') }; sc.placeLabels = []; sc.placeSets = [];
    sc.add.text = (x, y, t) => __chain('text'); const made = sc.drawPlace(p, id); return { calls: __calls.slice(), log: __log.map(x => x.slice(0, 2).concat(x[0] === 'image' ? [] : [JSON.stringify(x[2])])), made: made.length }; };
`);
{
  const on = J(`__draw(true, { x: 5, y: 6, name: 'Ceres', kind: 'ice', seed: 31, r: 90 }, 'ceres')`);
  const img = on.log.filter(x => x[0] === 'image' && /^cdisc-/.test(x[1])), setScale = on.log.filter(x => x[0] === 'im:cdisc-ceres-ice-31' && x[1] === 'setScale');
  check('the look on: a place is one image of its flat disc (key cdisc-<id>-<kind>-<seed>), scaled r / R (90 / 240), and planetTexture is not asked', img.length === 1 && img[0][1] === 'cdisc-ceres-ice-31' && setScale.length === 1 && Math.abs(JSON.parse(setScale[0][2])[0] - 90 / 240) < 1e-9 && on.calls.length === 0, JSON.stringify(on));
  const mars = J(`__draw(true, { x: 0, y: 0, name: 'Mars', kind: 'rock', seed: 12, r: 110, tint: 0xe0825a }, 'mars')`);
  check('Mars has its own tone and takes no tint (the old tint would turn the grey-brown disc orange)', !mars.log.some(x => x[1] === 'setTint') && mars.log.some(x => x[0] === 'image' && x[1] === 'cdisc-mars-rock-12'));
  const star = J(`__draw(true, { x: 0, y: 0, name: 'Sun', kind: 'star', star: 'G', seed: 0, r: 495, far: true }, 'sun')`);
  check('a star is a flat disc too: no starTexture, no ADD blend, no glow', star.calls.length === 0 && !star.log.some(x => x[1] === 'setBlendMode') && star.log.some(x => x[0] === 'image' && x[1] === 'cdisc-sun-star-0'));
  const off = J(`__draw(false, { x: 0, y: 0, name: 'Mars', kind: 'rock', seed: 12, r: 110, tint: 0xe0825a }, 'mars')`), offS = J(`__draw(false, { x: 0, y: 0, name: 'Sun', kind: 'star', star: 'G', seed: 0, r: 495 }, 'sun')`);
  check('the look off: today\'s world: planetTexture(kind, seed) scaled r / 300 with the tint, starTexture with the ADD blend', JSON.stringify(off.calls) === '[["planet","rock",12]]' && off.log.some(x => x[0] === 'image' && x[1] === 'old-planet') && off.log.some(x => x[1] === 'setTint') && JSON.stringify(offS.calls) === '[["star","G"]]' && offS.log.some(x => x[1] === 'setBlendMode'), JSON.stringify([off, offS]));
  g.run(`CAMP.flags.worldlook = false;`);
  const sc = src('src/campaignscene.js');
  check('the two callers pass the place\'s key (create: every near place; syncFar: a far body coming near)', /this\.drawPlace\(pl\[id\], id\); \}\);/.test(sc) && /this\.farObjs\[id\] = this\.drawPlace\(p, id\);/.test(sc));
  const wp = src('src/campwarp.js');
  check('the warp cinematic: with the look on Earth and the star ahead are flat discs (campDiscTexture; look names the tone), sized as the old pictures were (304 / R), else the old planetTexture', /campWorldOn\(\) && typeof campDiscTexture === 'function'/.test(wp) && /k: 304 \/ D\.R/.test(wp) && /planetTexture\(this, kind, seed\)/.test(wp) && /\* this\.earthK\)/.test(wp) && /\* this\.starK\)/.test(wp) && /look: 'star'/.test(src('src/campaign.js')) && /look: 'sun:lava'/.test(src('src/campaign.js')));
  g.run(`window.__sched = []; window.__hub = (flag) => { CAMP.flags.worldlook = flag; __sched.length = 0; const sc = { time: { delayedCall: (ms, fn) => __sched.push(ms) }, leaving: false }; const k = campHubWarm(sc, 1); CAMP.flags.worldlook = false; return { k, n: __sched.length }; };`);
  check('the ready room\'s slow pre-painting of the next level\'s planets is a no-op with the look on (nothing slow is left to do early), as it was with it off', J('__hub(true)').k === 0 && J('__hub(true)').n === 0 && J('__hub(false)').k >= 1 && J('__hub(false)').n === J('__hub(false)').k);
  g.run(`window.planetTexture = __planetOld; window.starTexture = __starOld;`);
}

// ---- F. Long Haul ----
console.log('F. Long Haul keeps its own pictures');
{
  const lh = ['src/art_world.js', 'src/stationart.js', 'src/boot.js', 'src/space.js', 'src/cruise.js', 'src/surface.js', 'src/asteroids.js'].map(f => [f, src(f)]);
  check('Long Haul\'s painters and scenes do not mention the disc painter or the switch: not read, not changed', lh.every(([f, s]) => !/campDisc|CAMPDISC|campWorld|worldlook/i.test(s)), lh.filter(([f, s]) => /campDisc|CAMPDISC|campWorld|worldlook/i.test(s)).map(x => x[0]).join());
  const d = src('src/campworlddisc.js');
  check('the disc file draws with the 2D context only: no web request, no image file, no web font, no library, no planetTexture or starTexture', !/https?:|fetch\(|XMLHttpRequest|new Image|\.png|\.jpg|@font-face|import |require\(|planetTexture\(|starTexture\(/.test(d.replace(/\/\/.*$/gm, '')));
  check('the file is a script of the page (a tag in index.html) and the game made no error', /<script src="src\/campworlddisc\.js"><\/script>/.test(src('index.html')) && g.errors.length === 0, g.errors.join(' | '));
}

console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
