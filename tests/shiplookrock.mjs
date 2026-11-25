// smoke: the new ship look's rocks (card space-game-b3-e-flat-rocks, src/shiplookrock.js): one straight-edged polygon in a neutral grey and one darker facet, painted once into a 64 by 64 texture, the old boulder when the look is off, nothing else about a rock changed (plain Node, no Chrome)
// Troy approved the cloud brief of 28 Nov 2026 (part 3, item 9): "rocks are drawn flat cut: one polygon and one darker facet, in a neutral grey, painted once into the sheet". Only the picture changes: a rock's size (its radius times 2.4 over 64), its hit
// circle, its ore and the effect of its breaking are not touched; the Long Haul keeps its boulders (src/art_world.js).
//   A  the outline: nine corners, 20 to 28 px from the middle of a 64 px picture, in order round it, three variants that differ, the same every run, no random number
//   B  the facet: ONE, made of corners of the outline on the side away from the light, a share of the rock's area
//   C  the colours: a neutral grey and a facet darker still (the world look mock's rock and rockD); none of the boulder's gradient, craters or glowing veins
//   D  the texture: painted once, named look-rock-<n>, 64 by 64, fills and plain paths only, the ships' rim; none without Phaser
//   E  the key: the variant is the rock's number mod 3, the new keys while the look is on, '' when it is off (the boulder stays); the scene and the briefing use it; the script is in the page
// Run: node tests/shiplookrock.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
g.run(`
  window.__scene = () => { const tex = new Set(), made = [];
    const mk = () => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => name === 'generateTexture' ? (key, w, h) => { tex.add(key); made.push({ key, w, h, ops }); } : name === 'destroy' ? () => {} : (...a) => { ops.push([name].concat(a)); return gfx; } }); return gfx; };
    return { made, tex, textures: { exists: k => tex.has(k) }, make: { graphics: () => mk() } }; };
`);
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; };
const V = [0, 1, 2].map(i => J(`slookRockPoints(${i})`)), F = [0, 1, 2].map(i => J(`slookRockFacet(${i})`));

console.log('A. the outline');
check('1 nine corners, each 20 to 28 px from the middle (32, 32) of the 64 by 64 picture, the boulders\' own spread, and the whole rock inside the picture with a margin', V.every(p => p.length === 9 && p.every(q => { const r = Math.hypot(q[0] - 32, q[1] - 32); return r >= 24 * 0.82 - 0.02 && r <= 24 * 1.18 + 0.02 && q[0] >= 2 && q[0] <= 62 && q[1] >= 2 && q[1] <= 62; })), JSON.stringify(V[0]));
check('2 the corners run round the middle in one direction (a simple polygon: no edge crosses another, the turn is always the same way), and each has a real area (more than half of a circle of 20 px)', V.every(p => { const ang = p.map(q => Math.atan2(q[1] - 32, q[0] - 32)); let sum = 0; for (let i = 0; i < p.length; i++) { let d = ang[(i + 1) % p.length] - ang[i]; while (d < 0) d += 2 * Math.PI; sum += d; if (d <= 0 || d >= Math.PI) return false; } return Math.abs(sum - 2 * Math.PI) < 1e-6 && area(p) > 0.5 * Math.PI * 400; }));
check('3 three variants that differ (the Campaign picks one by the rock\'s number), the same every time asked, and any number gives a variant (a negative one too)', JSON.stringify(V[0]) !== JSON.stringify(V[1]) && JSON.stringify(V[1]) !== JSON.stringify(V[2]) && JSON.stringify(V[0]) !== JSON.stringify(V[2]) && JSON.stringify(J('slookRockPoints(1)')) === JSON.stringify(V[1]) && JSON.stringify(J('slookRockPoints(4)')) === JSON.stringify(V[1]) && J('slookRockPoints(-1).length') === 9);
check('4 straight edges: the polygon is its corners and nothing else (no curve steps); a rock is not a ship: it has no row in the ships\' table', V.every(p => p.length === 9) && J('Object.keys(SLOOK.K).includes("rock")') === false);

console.log('B. the facet');
check('5 ONE facet a rock: a list of three corners or more, every one a corner of the outline, in the outline\'s own order (no point of its own, so it is a straight cut on the rim)', F.every((f, i) => f.length >= 3 && f.length < V[i].length && f.every(q => V[i].some(p => p[0] === q[0] && p[1] === q[1])) && f.map(q => V[i].findIndex(p => p[0] === q[0] && p[1] === q[1])).every((k, j, a) => !j || k > a[j - 1])));
check('6 it is on the side away from the light (the lower right: the boulders were lit from the upper left): its corners\' mean is right of and below the middle', F.every(f => f.reduce((a, q) => a + q[0], 0) / f.length > 32 && f.reduce((a, q) => a + q[1], 0) / f.length > 32));
check('7 it is a part of the rock, not all and not a sliver: 12 to 50 percent of the outline\'s area', F.every((f, i) => { const s = area(f) / area(V[i]); return s >= 0.12 && s <= 0.5; }), JSON.stringify(F.map((f, i) => Math.round(area(f) / area(V[i]) * 100))));

console.log('C. the colours');
const col = J('slookRockColors()'), hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)), lum = h => { const c = hex(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
check('8 the grey is the world look mock\'s rock (#7b8591) and the facet its rockD (#4a525d), read from the mock file: a neutral grey (red, green and blue within 30 of one another), not the neutral side\'s blue-grey (#9fb3c8: a rock is not mistaken for a neutral ship), the facet darker, same family', (() => { const mk = src('docs/world-look-mock.html'), m = mk.match(/rock:'(#[0-9a-f]{6})',rockD:'(#[0-9a-f]{6})'/); return !!m && col.fill === m[1] && col.facet === m[2] && col.fill !== J('SLOOK.C.neutral') && lum(col.facet) < lum(col.fill) && Math.max(...hex(col.fill)) - Math.min(...hex(col.fill)) < 30; })(), JSON.stringify(col));
const cr = code('src/shiplookrock.js');
check('9 none of the boulder\'s look: no gradient, no craters, no speckle, no glow or ore veins, no random number (a seeded generator), no image file', !/createRadialGradient|createLinearGradient|ellipse|shadowBlur|Math\.random|\.png|\.jpg|new Image|fetch\(/.test(cr) && /mulberry|0x6D2B79F5/.test(cr));

console.log('D. the texture');
const mkTex = i => { g.run(`window.S = __scene(); window.__key = slookRockTexture(S, ${i});`); return { key: J('__key'), made: J('S.made[0] || null'), count: J('S.made.length') }; };
const T = [0, 1, 2].map(mkTex);
check('10 one texture a variant, named look-rock-<n>, 64 by 64 (the boulders\' size, so the scale a rock is drawn at is the same), made once: asking again makes none; a stand-in with no Phaser gets an empty key', T.every((t, i) => t.key === 'look-rock-' + i && t.made && t.made.key === t.key && t.made.w === 64 && t.made.h === 64 && t.count === 1) && (g.run(`window.S = __scene(); slookRockTexture(S, 0); slookRockTexture(S, 0); slookRockTexture(S, 3);`), J('S.made.length') === 1) && J('slookRockTexture(null, 0)') === '' && J('slookRockTexture({}, 0)') === '');
check('11 it paints with fills and plain paths only (fillStyle, lineStyle, beginPath, moveTo, lineTo, closePath, fillPath, strokePath): outline filled in the grey, the dark rim (the ships\' rim: 0x050810 at 0.9, at least 1 px), then the facet filled in the darker grey: two fills and one stroke', T.every(t => { const o = t.made.ops, fs = o.filter(x => x[0] === 'fillStyle'), ls = o.filter(x => x[0] === 'lineStyle'); return o.every(x => ['fillStyle', 'lineStyle', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath'].includes(x[0])) && fs.length === 2 && ls.length === 1 && fs[0][1] === parseInt(col.fill.slice(1), 16) && fs[1][1] === parseInt(col.facet.slice(1), 16) && ls[0][2] === 0x050810 && ls[0][3] === 0.9 && ls[0][1] >= 1 && o.filter(x => x[0] === 'fillPath').length === 2 && o.filter(x => x[0] === 'strokePath').length === 1; }));
check('12 the outline it paints is the pure function\'s: nine corners (a moveTo and eight lineTo) at the same points, and the facet\'s are a moveTo and the rest lineTo at the facet\'s', T.every((t, i) => { const lines = t.made.ops.filter(x => x[0] === 'moveTo' || x[0] === 'lineTo'), a = lines.slice(0, 9).map(x => [x[1], x[2]]), b = lines.slice(9).map(x => [x[1], x[2]]); return JSON.stringify(a) === JSON.stringify(V[i]) && JSON.stringify(b) === JSON.stringify(F[i]); }));

console.log('E. the key, the scene, the briefing');
const key = (id, on) => { g.run(`window.S = __scene(); CAMP.flags.shiplook = ${on ? 'true' : 'false'}; window.__k = slookRockKey(S, ${JSON.stringify(id)});`); return J('__k'); };
check('13 the key of a rock is its number mod 3, as the boulders were picked ("rock-0" to look-rock-0, "rock-4" to look-rock-1, "rock-5" to look-rock-2): the texture is made when it is asked for, once', key('rock-0', true) === 'look-rock-0' && key('rock-4', true) === 'look-rock-1' && key('rock-5', true) === 'look-rock-2' && key('rock-12', true) === 'look-rock-0' && J('S.made.length') === 1);
check('14 an id that is not a rock\'s number still gets a variant, never none; with the look off the key is empty (the caller keeps the boulder: asteroid, asteroid2, asteroid3) and nothing is made', key('rock-x', true) === 'look-rock-0' && key('rock-3', false) === '' && J('S.made.length') === 0 && J('slookRockKey(S, "rock-3")') === '');
g.run(`CAMP.flags.shiplook = false;`);
const sc = code('src/campaignscene.js');
check('15 the scene draws its rocks (the belt\'s and the pickups\') with the key and falls back to the boulder; the scale of a rock is still its radius times 2.4 over 64 (so its size is the same), and the break effect, the cracks and the tint are the lines they were', (sc.match(/\(typeof slookRockKey === 'function' && slookRockKey\(this, [or]\.id\)\) \|\| \['asteroid', 'asteroid2', 'asteroid3'\]\[parseInt\(String\([or]\.id\)\.split\('-'\)\[1\], 10\) % 3\]/g) || []).length === 2 && /setScale\(r\.r \* 2\.4 \/ 64\)/.test(sc) && /this\.boom\.explode\(16, e\.x, e\.y\)/.test(sc) && /bg\.lineStyle\(1\.5, 0x2a1408, 0\.9\)/.test(sc));
check('16 the briefing\'s picture of a rock is the flat-cut one while the look is on, the boulder otherwise, at the same scale; the Long Haul still has its boulders (art_world.js makes asteroid, asteroid2, asteroid3 and does not mention the look)', /slookRockKey\(s, 'rock-0'\)\) \|\| 'asteroid'/.test(code('src/campbriefdraw.js')) && /\['asteroid', 'asteroid2', 'asteroid3'\]\.forEach\(key => waCanvas\(sc, key, 64, 64/.test(code('src/art_world.js')) && !/slook/.test(code('src/art_world.js')) && !/slook/.test(code('src/asteroids.js')));
const idx = src('index.html');
check('17 the script is in the page once, after the ships\' files (one job a file), and the node harness loads it; the rule files are not touched: the rock\'s hit circle and ore are in src/campaign.js, which this card leaves alone', (idx.match(/src\/shiplookrock\.js/g) || []).length === 1 && idx.indexOf('src/shiplookrock.js') > idx.indexOf('src/shiplookpic.js') && J('typeof slookRockKey') === 'function' && J('CAMP.ore.rock') === 20);

console.log(failed ? `\nSHIP LOOK ROCKS FAIL: ${failed} of ${n} checks failed` : `\nSHIP LOOK ROCKS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
