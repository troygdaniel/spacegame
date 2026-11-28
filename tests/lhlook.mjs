// smoke: the new Long Haul's ships in the Campaign's flat-cut look (plain Node, no Chrome): off answers null and changes nothing, on maps every Long Haul ship to a Campaign kind and side, the picture is the old one's size so the hit circle stays, and no hostile is amber
// PROMPT 23 (the cloud session's brief 15), piece 3 of docs/longhaul-earth.html. src/lhlook.js: LHLOOK, lhLookSpec, lhLookTexture, lhLookOne, lhLookFlame, lhLookNozzles; the hook is the first line of shipsOne (src/ships.js).
//   A  off: every function answers null, '' or the colour it was given, and a sprite is not touched
//   B  the map: every ship texture Long Haul makes has a row, every kind and side is the Campaign's, the pirates are the foe side, the escort's freighter is protect, police and traffic neutral, yours friend
//   C  the picture: its key carries the old picture's size, the hull fits inside it with a margin (length and width), and it is painted by the Campaign's painter at the middle of a canvas of the same size
//   D  a sprite: it takes the flat picture once, keeps it, a traffic ship loses its tint, and a sprite showing something else is left alone
//   E  the flame and the nozzle: each side's engine glow (pink for every pirate, never amber or red), one nozzle at the tail of the flat hull
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
const specs = J(`Object.keys(SZ).map(k => Object.assign({ k, w: SZ[k][0], h: SZ[k][1], span: lhLookSpan(LHLOOK.map[k][0]) }, lhLookSpec(k, SZ[k][0], SZ[k][1])))`);
check('the key carries the old picture\'s size', specs.every(s => s.tex === `lh-${s.k}-${s.w}x${s.h}`));
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

console.log('F  the rest');
check('Long Haul\'s own textures were not written over', J('T.removed.length') === 0 && J(`T.made.every(m => /^lh-/.test(m[0]))`) === true);
check('shipsOne asks before it calls', /if \(typeof lhLookOne === 'function'\) \{ lhLookOne\(s, o, key\); color = lhLookFlame\(key, color\); \}/.test(src('src/ships.js')) && /typeof lhLookNozzles === 'function' && lhLookNozzles\(key, o\)\) \|\| SHIPS\.nozzles\[key\]/.test(src('src/ships.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhlook.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHLOOK FAIL: ${failed} of ${n} checks failed` : `\nLHLOOK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
