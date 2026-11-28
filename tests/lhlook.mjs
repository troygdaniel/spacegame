// smoke: the new Long Haul's ships in the Campaign's flat-cut look (plain Node, no Chrome): off answers null and changes nothing, on maps every Long Haul ship to a Campaign kind and side, the picture is the old one's size so the hit circle stays, and no hostile is amber
// PROMPT 23 (the cloud session's brief 15), piece 3 of docs/longhaul-earth.html. src/lhlook.js: LHLOOK, lhLookSpec, lhLookTexture, lhLookOne, lhLookFlame, lhLookNozzles; the hook is the first line of shipsOne (src/ships.js).
//   A  off: every function answers null, '' or the colour it was given, and a sprite is not touched
//   B  the map: every ship texture Long Haul makes has a row, every kind and side is the Campaign's, the pirates are the foe side, the escort's freighter is protect, police and traffic neutral, yours friend
//   C  the picture: its key carries the old picture's size, the hull fits inside it with a margin (length and width), and it is painted by the Campaign's painter at the middle of a canvas of the same size
//   D  a sprite: it takes the flat picture once, keeps it, a traffic ship loses its tint, and a sprite showing something else is left alone
//   E  the flame and the nozzle: each side's engine glow (pink for every pirate, never amber or red), one nozzle at the tail of the flat hull
//   G  the six hulls (card space-game-lh-hull-shapes): each its own outline, the plating and barrels you own drawn on it, a new part a new picture, the Campaign's table left as it was
//   F  Long Haul's own textures are not written over, the hook asks first, and the file asks the web for nothing
// Run: node tests/lhlook.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const SIZES = { ship: [56, 40], police: [56, 40], raider: [40, 30], drone: [44, 44], gunship: [60, 50], reaver: [112, 90], freighter: [76, 40], civilian: [76, 40] }; // the canvases src/ships.js makes
g.run(`window.SZ = ${JSON.stringify(SIZES)}; window.T = { made: [], calls: [], removed: [] };
window.fakeScene = () => ({ textures: { has: {}, exists(k) { return !!SZ[k] || !!this.has[k]; }, get(k) { return { getSourceImage: () => ({ width: SZ[k][0], height: SZ[k][1] }) }; }, remove(k) { T.removed.push(k); } },
  make: { graphics: () => new Proxy({}, { get: (t, k) => (k === 'generateTexture' ? (key, w, h) => { T.made.push([key, w, h]); } : (...a) => { T.calls.push([String(k)].concat(a)); return undefined; }) }) } });
window.fakeSprite = (key, civ) => ({ texture: { key }, width: SZ[key][0], height: SZ[key][1], civ: !!civ, tinted: true, set: 0, setTexture(k) { this.texture = { key: k }; this.set++; return this; }, clearTint() { this.tinted = false; return this; } });`);

console.log('A  off');
check('spec, texture and nozzles are empty', J(`lhLookSpec('ship', 56, 40)`) === null && J(`lhLookTexture(fakeScene(), 'ship')`) === '' && J(`lhLookNozzles('ship', { lhL: 40 })`) === null);
check('the flame is the colour given', J(`lhLookFlame('raider', 0xff6b8a)`) === 0xff6b8a);
check('a sprite is not touched', J(`(() => { const o = fakeSprite('raider'); return [lhLookOne(fakeScene(), o, 'raider'), o.texture.key, o.set]; })()`).join() === 'false,raider,0');

console.log('B  the map');
J('lhNewSet(true)');
const made = [...src('src/ships.js').matchAll(/\n  mk\('([a-z]+)', \d+, \d+/g)].map(m => m[1]).filter(k => k !== 'smoke');
const map = J('LHLOOK.map');
check('every ship texture Long Haul makes has a row', made.concat(['ship']).every(k => !!map[k]), made.filter(k => !map[k]).join(' '));
check('every kind and side is the Campaign\'s', J(`Object.values(LHLOOK.map).every(r => !!SLOOK.K[r[0]] && SLOOK.sides.indexOf(r[1]) >= 0)`) === true);
check('the pirates are foes, the escort\'s freighter is protected, police and traffic neutral, yours friend', ['raider', 'drone', 'gunship', 'reaver'].every(k => map[k][1] === 'foe') && map.freighter[1] === 'protect' && map.police[1] === 'neutral' && map.civilian[1] === 'neutral' && map.ship[1] === 'friend');
check('the four pirates are four different shapes', new Set(['raider', 'drone', 'gunship', 'reaver'].map(k => map[k][0])).size === 4);

console.log('C  the picture');
const specs = J(`Object.keys(SZ).map(k => { const s = lhLookSpec(k, SZ[k][0], SZ[k][1]); return Object.assign({ k, w: SZ[k][0], h: SZ[k][1], span: s.hull ? lhLookHullSpan(LHLOOK.hulls[s.hull]) : lhLookSpan(LHLOOK.map[k][0]) }, s); })`); // (yours is the active hull's own outline: the Wren here)
check('the key carries the old picture\'s size (yours also the hull and the tiers you own: lh-ship-wren-00-56x40)', specs.every(s => s.tex === (s.k === 'ship' ? `lh-ship-wren-00-${s.w}x${s.h}` : `lh-${s.k}-${s.w}x${s.h}`)), JSON.stringify(specs.map(s => s.tex)));
check('the hull fits inside with a margin, length and width', specs.every(s => s.L >= 8 && s.L <= s.w - 8 && s.L * s.span <= s.h - 4 + 1e-9), JSON.stringify(specs.map(s => [s.k, s.L, Math.round(s.L * s.span)])));
check('the hull is not small in its canvas (at least 60 percent of the width or 85 of the height)', specs.every(s => s.L >= 0.6 * s.w || s.L * s.span >= 0.85 * (s.h - 4)), JSON.stringify(specs.map(s => [s.k, s.L])));
const tex = J(`(() => { T.made.length = 0; T.calls.length = 0; const s = fakeScene(), k = lhLookTexture(s, 'gunship'); return { k, made: T.made, tr: T.calls.filter(c => c[0] === 'moveTo').slice(0, 1), n: T.calls.filter(c => c[0] === 'fillPath').length }; })()`);
check('the canvas is the same size and the painter fills an outline and a facet', tex.k === 'lh-gunship-60x50' && tex.made.length === 1 && tex.made[0].join() === 'lh-gunship-60x50,60,50' && tex.n >= 2, JSON.stringify(tex.made));
const mid = J(`(() => { T.calls.length = 0; lhLookTexture(fakeScene(), 'raider'); const xs = T.calls.filter(c => c[0] === 'moveTo' || c[0] === 'lineTo'); return [Math.min(...xs.map(c => c[1])) + Math.max(...xs.map(c => c[1])), Math.min(...xs.map(c => c[2])) + Math.max(...xs.map(c => c[2]))]; })()`);
check('the hull is in the middle of the canvas, up and down exactly', Math.abs(mid[1] - 30) < 1e-6 && Math.abs(mid[0] - 40) < 2, mid.join());

console.log('D  a sprite');
const one = J(`(() => { const s = fakeScene(), o = fakeSprite('civilian', true), a = lhLookOne(s, o, 'civilian'), b = lhLookOne(s, o, 'civilian'); return { a, b, key: o.texture.key, set: o.set, tinted: o.tinted, L: o.lhL }; })()`);
check('it takes the flat picture once and keeps it; a traffic ship loses its tint', one.a === true && one.b === false && one.key === 'lh-civilian-76x40' && one.set === 1 && one.tinted === false && one.L > 0, JSON.stringify(one));
check('a sprite showing something else is left alone', J(`(() => { const o = fakeSprite('raider'); o.texture.key = 'pod'; return lhLookOne(fakeScene(), o, 'raider'); })()`) === false);

console.log('E  the flame and the nozzle');
const fl = J(`Object.keys(LHLOOK.map).map(k => [k, lhLookFlame(k, 1)])`);
const hex = c => '#' + c.toString(16).padStart(6, '0');
check('every pirate burns pink', fl.filter(f => map[f[0]][1] === 'foe').every(f => hex(f[1]) === J('SLOOK.C.foe')));
check('yours is your glow, a protected ship amber, a neutral grey-blue', hex(fl.find(f => f[0] === 'ship')[1]) === J('SLOOK.C.friendHi') && hex(fl.find(f => f[0] === 'freighter')[1]) === J('SLOOK.C.protect') && hex(fl.find(f => f[0] === 'police')[1]) === J('SLOOK.C.neutral'));
check('a key that is not a ship keeps its colour', J(`lhLookFlame('pod', 7)`) === 7);
const nz = J(`lhLookNozzles('gunship', { lhL: 40 })`);
check('one nozzle at the tail of the flat hull', nz.length === 1 && nz[0][0] < -15 && nz[0][0] >= -20 && nz[0][1] === 0 && nz[0][2] > 0, JSON.stringify(nz));
J('lhNewSet(null)');

console.log('G  the six hulls (card space-game-lh-hull-shapes; BRIEF 16 ask 3): each hull its own flat-cut shape, and the plating and barrels you bought show on it');
J('lhNewSet(true)');
const HULLS = ['wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion'], HS = J('Object.fromEntries(Object.keys(SHIP_LOOK).map(k => [k, [SHIP_LOOK[k].w, SHIP_LOOK[k].h]]))');
g.run(`window.__setHull = (id, plating, guns) => { window.shipActiveModel = () => id; window.shipTiers = () => ({ plating, guns, engine: 0 }); };`);
const hs = J('Object.keys(LHLOOK.hulls)');
check('a table row for each of the six hulls of src/shipmodels.js, and no other', hs.join() === HULLS.join() && HULLS.every(h => !!HS[h]), hs.join());
check('every outline is its own: six different shapes, none the Campaign\'s fighter', new Set(HULLS.map(h => J(`JSON.stringify(LHLOOK.hulls.${h}.p)`))).size === 6 && HULLS.every(h => J(`JSON.stringify(LHLOOK.hulls.${h}.p) !== JSON.stringify(SLOOK.K.fighter.p)`)));
check('each is a whole hull: nose at +x at 0.5 and tail at -0.5, a closed outline mirrored top to bottom, inside half a length either way', HULLS.every(h => J(`(() => { const p = LHLOOK.hulls.${h}.p, xs = p.map(q => q[0]), ys = p.map(q => q[1]); return Math.max(...xs) === 0.5 && Math.min(...xs) === -0.5 && p.length >= 11 && Math.abs(Math.max(...ys) + Math.min(...ys)) < 1e-9 && Math.max(...ys.map(Math.abs)) <= 0.5; })()`) === true));
check('the plates, the barrels and the facet lie on the hull: inside its width and length, each barrel at a height the outline reaches (the painter stops it at the nose)', HULLS.every(h => J(`(() => { const H = LHLOOK.hulls.${h}, w = Math.max(...H.p.map(q => Math.abs(q[1]))), pts = [].concat(H.plate.a, H.plate.b, H.d), ok = pts.every(q => Math.abs(q[0]) <= 0.5 && Math.abs(q[1]) <= w + 1e-9), g = [H.gun.a, H.gun.b].every(b => Math.abs(b[0]) <= w + 1e-9 && b[1] > 0 && lhLookEdgeX(H.p, b[0]) !== null), s = H.plate.s.every((v, i) => Math.abs(v) <= (i % 2 ? w : 0.5) + 1e-9); return ok && g && s && H.gun.l < 0.5; })()`) === true));
const hsp = HULLS.map(h => { g.run(`__setHull('${h}', 0, 0);`); return J(`Object.assign({ h: '${h}', w: ${HS[h][0]}, hh: ${HS[h][1]}, span: lhLookHullSpan(LHLOOK.hulls.${h}) }, lhLookSpec('ship', ${HS[h][0]}, ${HS[h][1]}))`); });
check('the picture is the old one\'s size, its key names the hull: lh-ship-<hull>-<plating><barrels>-<w>x<h>', hsp.every(s => s.tex === `lh-ship-${s.h}-00-${s.w}x${s.hh}` && s.hull === s.h), JSON.stringify(hsp.map(s => s.tex)));
check('each hull fits its canvas with a margin, length and width, and is not small in it (60 percent of the width or 85 of the height)', hsp.every(s => s.L >= 8 && s.L <= s.w - 8 && s.L * s.span <= s.hh - 4 + 1e-9 && (s.L >= 0.6 * s.w || s.L * s.span >= 0.85 * (s.hh - 4))), JSON.stringify(hsp.map(s => [s.h, s.L, Math.round(s.L * s.span)])));
const count = (id, pl, gu) => { g.run(`__setHull('${id}', ${pl}, ${gu}); T.made.length = 0; T.calls.length = 0; window.__K0 = Object.keys(SLOOK.K).join(); window.__k = lhLookTexture(fakeScene(), 'ship');`); return J(`({ k: __k, made: T.made.map(m => m.join()), fills: T.calls.filter(c => c[0] === 'fillPath').length, circles: T.calls.filter(c => c[0] === 'fillCircle').length, lines: T.calls.filter(c => c[0] === 'lineBetween').length, same: Object.keys(SLOOK.K).join() === __K0 })`); };
const base = count('wren', 0, 0);
check('no plating, no barrels: the hull and its facet only, in a canvas of the old size, at the Campaign painter\'s own two fills', base.k === 'lh-ship-wren-00-56x40' && base.made.join() === 'lh-ship-wren-00-56x40,56,40' && base.fills === 2 && base.circles === 0 && base.lines === 0, JSON.stringify(base));
const pl = [1, 2, 3].map(t => count('wren', t, 0)), gu = [1, 2, 3].map(t => count('wren', 0, t));
check('plating shows: a plate on each side at tier 1 (two fills more), a second at tier 2 (two more), a bright seam at tier 3 (two lines)', pl[0].fills === 4 && pl[1].fills === 6 && pl[2].fills === 6 && pl[2].lines === 2 && pl[1].lines === 0, JSON.stringify(pl.map(x => [x.fills, x.lines])));
check('barrels show: a pair at tier 1 (two fills and two muzzle glows), a second pair at tier 2, a lance on the nose at tier 3', gu[0].fills === 4 && gu[0].circles === 2 && gu[1].fills === 6 && gu[1].circles === 4 && gu[2].fills === 7 && gu[2].circles === 5, JSON.stringify(gu.map(x => [x.fills, x.circles])));
check('a new part is a new picture (the key changes), the same parts the same key', new Set([base.k, pl[0].k, pl[1].k, gu[0].k, count('wren', 2, 3).k]).size === 5 && count('wren', 2, 3).k === 'lh-ship-wren-23-56x40' && count('wren', 1, 0).k === pl[0].k);
check('the Campaign\'s table is left as it was: the outline is put in SLOOK.K for the bake only', HULLS.every(h => { const c = count(h, 3, 3); return c.same === true && c.made.length === 1; }) && J(`Object.keys(SLOOK.K).filter(k => /^lhhull-/.test(k)).length`) === 0);
const mids = HULLS.map(h => { g.run(`__setHull('${h}', 3, 3); SZ.ship = [${HS[h][0]}, ${HS[h][1]}]; T.calls.length = 0; lhLookTexture(fakeScene(), 'ship'); SZ.ship = [56, 40];`); return J(`(() => { const xs = T.calls.filter(c => c[0] === 'moveTo' || c[0] === 'lineTo'); return [Math.min(...xs.map(c => c[1])) + Math.max(...xs.map(c => c[1])), Math.min(...xs.map(c => c[2])) + Math.max(...xs.map(c => c[2]))]; })()`).concat([HS[h][0], HS[h][1]]); });
check('every hull is in the middle of its canvas, up and down exactly (the hit circle stays where it was)', mids.every(m => Math.abs(m[1] - m[3]) < 1e-6 && Math.abs(m[0] - m[2]) < 3), JSON.stringify(mids));
check('a sprite of the ship you fly takes the picture of its hull once, with its length for the nozzle (the flame is yours), and the nozzle is at the tail', (() => { g.run(`__setHull('ox', 2, 1);`); const r = J(`(() => { SZ.ship = [78, 46]; const s = fakeScene(), o = fakeSprite('ship'), a = lhLookOne(s, o, 'ship'), b = lhLookOne(s, o, 'ship'); SZ.ship = [56, 40]; return { a, b, key: o.texture.key, L: o.lhL, noz: lhLookNozzles('ship', o) }; })()`); return r.a === true && r.b === false && r.key === 'lh-ship-ox-21-78x46' && r.L > 0 && r.noz.length === 1 && r.noz[0][0] === -r.L * 0.46; })());
check('another hull that is not in the table (an unknown model) is the Campaign\'s fighter as before', (() => { g.run(`window.shipActiveModel = () => 'mystery'; window.shipTiers = () => ({ plating: 3, guns: 3, engine: 0 });`); const sp = J(`lhLookSpec('ship', 56, 40)`); return sp.hull === '' && sp.tex === 'lh-ship-56x40' && sp.tiers === null; })());
check('every other ship is unchanged by the hull and the tiers (the key and the length)', (() => { g.run(`__setHull('bastion', 3, 3);`); return J(`['raider', 'drone', 'gunship', 'reaver', 'freighter', 'civilian', 'police'].every(k => { const s = lhLookSpec(k, SZ[k][0], SZ[k][1]); return s.hull === '' && s.tex === 'lh-' + k + '-' + SZ[k][0] + 'x' + SZ[k][1]; })`) === true; })());
g.run(`delete window.shipActiveModel; delete window.shipTiers;`);
J('lhNewSet(null)');

console.log('F  the rest');
check('Long Haul\'s own textures were not written over', J('T.removed.length') === 0 && J(`T.made.every(m => /^lh-/.test(m[0]))`) === true);
check('shipsOne asks before it calls', /if \(typeof lhLookOne === 'function'\) \{ lhLookOne\(s, o, key\); color = lhLookFlame\(key, color\); \}/.test(src('src/ships.js')) && /typeof lhLookNozzles === 'function' && lhLookNozzles\(key, o\)\) \|\| SHIPS\.nozzles\[key\]/.test(src('src/ships.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhlook.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHLOOK FAIL: ${failed} of ${n} checks failed` : `\nLHLOOK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
