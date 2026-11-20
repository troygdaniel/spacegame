// smoke: the carrier is drawn as a boxy grey and bronze cruiser (src/campcruiser.js): no neon, every mark inside its picture, the eight turret mounts on the hull, the bays in the faces of the pods (plain Node, no Chrome)
// Card space-game-campaign-look (Troy): "less arcade and more like Battlestar Galactica: a boxy, utilitarian hull in muted grey and bronze, a long spine, hangar pods along the sides with a lit bay opening, a big engine block with a dull
// glow, panel lines and a few running lights, no neon outline, no bright tint; the launch and recall must still read; the eight turret mounts stay on the hull". The drawing is run on a recording stand-in for the Phaser Graphics,
// so what it draws (its colours, its line widths, where its marks fall) is checked without a browser; what it LOOKS like is for the pictures (tools/camplook.mjs) and the blind critic (docs/CRITIC.md).
// Run: node tests/camplook-cruiser.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`window.__rec = () => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => (...a) => { ops.push([name].concat(a)); return gfx; } }); campCruiserDraw(gfx); return ops; };`);
const ops = J('__rec()'), A = J('CAMP_ART'), H = J('CAMP_HULL'), [W, Ht] = J(`campArtSize('cruiser')`), cr = A.cruiser, k = cr.k;

const names = new Set(ops.map(o => o[0]));
check('it draws only with fills, plain lines and paths (no gradient, no stroked circle, no glow filter)', [...names].every(n => ['fillStyle', 'lineStyle', 'fillRect', 'fillCircle', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath', 'lineBetween'].includes(n)), [...names].join(' '));
check('the picture is as long as the hull plus its margin, both sides, at k times the units', W === Math.round((cr.len + 2 * cr.pad) * k) && Ht === Math.round((2 * cr.half + 2 * cr.pad) * k), W + ' x ' + Ht);

// every mark inside the picture (half a px of slack for the edge of a line)
const out = [];
let lw = 0;
ops.forEach(([n, ...a]) => {
  const inside = (x, y) => x >= -0.5 && y >= -0.5 && x <= W + 0.5 && y <= Ht + 0.5;
  if (n === 'fillRect' && !(inside(a[0], a[1]) && inside(a[0] + a[2], a[1] + a[3]))) out.push([n, ...a]);
  if (n === 'fillCircle' && !(inside(a[0] - a[2], a[1] - a[2]) && inside(a[0] + a[2], a[1] + a[2]))) out.push([n, ...a]);
  if ((n === 'moveTo' || n === 'lineTo') && !inside(a[0], a[1])) out.push([n, ...a]);
  if (n === 'lineBetween' && !(inside(a[0], a[1]) && inside(a[2], a[3]))) out.push([n, ...a]);
});
check('every mark lies inside the picture (nothing is cut off at the edge, the engine glow included)', out.length === 0, out.length + ' outside, first ' + JSON.stringify(out[0]));

// the colours: only the palette, steel and bronze muted, the warm lights few and small, nothing cyan, no thick bright edge
const hsv = c => { const r = (c >> 16 & 255) / 255, gg = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: h * 60, s: mx ? d / mx : 0, v: mx }; };
const palette = new Set([...H.steel, ...H.bronze, H.dark, H.edge, H.window, H.bay, H.bayDim, H.engine, H.hot, H.red, H.green, 0xffffff]);
const used = new Set(); ops.forEach(([n, a, b]) => { if (n === 'fillStyle' || n === 'lineStyle') used.add(n === 'fillStyle' ? a : b); });
check('it uses only the colours of its palette (CAMP_HULL), no colour of its own', [...used].every(c => palette.has(c)), [...used].filter(c => !palette.has(c)).map(c => c.toString(16)).join(' '));
check('steel and the dark tones are grey: saturation under 0.2', [...H.steel, H.dark, H.edge].every(c => hsv(c).s < 0.2), [...H.steel, H.dark, H.edge].map(c => hsv(c).s.toFixed(2)).join(' '));
check('bronze is muted: a warm hue (20 to 50 degrees), saturation under 0.55, never brighter than 0.7', H.bronze.every(c => { const x = hsv(c); return x.h >= 20 && x.h <= 50 && x.s < 0.55 && x.v <= 0.7; }), H.bronze.map(c => { const x = hsv(c); return x.h.toFixed(0) + '/' + x.s.toFixed(2) + '/' + x.v.toFixed(2); }).join(' '));
check('no neon: no colour of the palette is cyan or blue (hue 160 to 260) with any strength, and none is a saturated bright (saturation over 0.5 and brightness over 0.75) except the three small lights', [...palette].every(c => { const x = hsv(c); return !(x.h >= 160 && x.h <= 260 && x.s > 0.25) && (!(x.s > 0.5 && x.v > 0.75) || [H.bay, H.window, H.hot].includes(c)); }));
const lines = []; ops.forEach((o, i) => { if (o[0] === 'lineStyle') lines.push({ w: o[1] / k, color: o[2], alpha: o[3] }); });
check('no thick glowing edge: every line is under 1 unit wide (the hull has panel lines and a dark edge, not an outline of light)', lines.length > 10 && lines.every(l => l.w <= 1), 'widest ' + Math.max(...lines.map(l => l.w)).toFixed(2));
check('and every outline is the dark edge colour', (() => { const o = []; ops.forEach((x, i) => { if (x[0] === 'strokePath') { for (let j = i - 1; j >= 0; j--) if (ops[j][0] === 'lineStyle') { o.push(ops[j][2]); break; } } }); return o.length > 4 && o.every(c => c === H.edge); })());
const halos = ops.filter(([n, , , r]) => n === 'fillCircle' && r > 2.5 * k);
check('the only glow is the engines\': at most eight faint circles (two a nozzle), the rest of the picture has none', halos.length > 0 && halos.length <= 8, String(halos.length));
// the area of what is lit (windows, bays, the engines' fire) against the area of the hull
let lit = 0;
ops.forEach((o, i) => { if (o[0] === 'fillRect') { for (let j = i - 1; j >= 0; j--) if (ops[j][0] === 'fillStyle') { if ([H.window, H.bay, H.engine, H.hot].includes(ops[j][1]) && (ops[j][2] === undefined || ops[j][2] >= 0.4)) lit += o[3] * o[4]; break; } } });
const hull = J(`(() => { const a = CAMP_ART.cruiser, pod = a.pod; return (a.len * 20 + 2 * (pod[2] - pod[0]) * (pod[3] - pod[1])) * CAMP_ART.cruiser.k * CAMP_ART.cruiser.k; })()`);
check('what is lit is a small part of the hull: under 3 percent of its area (a few windows, the bays, four nozzles)', lit / hull < 0.03, (lit / hull * 100).toFixed(2) + ' percent');

// the geometry the scene and the sim lean on
const mounts = J('CAMP.carrier.mounts'), core = cr.core, [px1, py1, px2, py2] = cr.pod, [ex1, ey1, ex2, ey2] = cr.engine;
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const onHull = (x, y, m) => inPoly(x, y, core) && inPoly(x + m, y, core) && inPoly(x - m, y, core) && inPoly(x, y + m, core) && inPoly(x, y - m, core) || (Math.abs(y) >= py1 + m && Math.abs(y) <= py2 - m && x >= px1 + m && x <= px2 - m) || (x >= ex1 + m && x <= ex2 - m && Math.abs(y) <= ey2 - m);
const mr = 3.5; // a mount's dark base is about 3 px (CAMP_MOUNT.base in the scene, tests/camplook-mounts.mjs): it has to lie on the hull with its base, not only its centre
check('each of the eight turret mounts, with its base, lies on the hull: on the spine, the head or a pod', mounts.length === 8 && mounts.every(([x, y]) => onHull(x, y, mr)), JSON.stringify(mounts.filter(([x, y]) => !onHull(x, y, mr))));
check('the pods are the same each side of the spine, and a pod does not touch the spine (a gap for the struts)', py1 > 11 && Math.abs(core.reduce((m, p) => Math.max(m, Math.abs(p[1])), 0) - 11) < 1e-9 && cr.half === py2);
check('the launch tube of a pod is in its front face and the landing bay in its aft face, inside the pod\'s width', cr.launch[0] === px2 && cr.land[0] === px1 && [cr.launch[1], cr.land[1]].every(y => y - cr.bay[1] >= py1 && y + cr.bay[1] <= py2));
const bays = J(`campArtBays('cruiser')`);
check('the scene is told where the bays are, one on each side: four places in the carrier\'s frame', bays.launch.length === 2 && bays.land.length === 2 && bays.launch[0][1] === -bays.launch[1][1] && bays.land[0][1] === -bays.land[1][1]);
const mouth = J('CAMP.bay.mouth');
check('ships are launched from just in front of the launch tube (CAMP.bay.mouth: 1 to 6 units ahead of it, level with it)', mouth[0] - cr.launch[0] >= 1 && mouth[0] - cr.launch[0] <= 6 && Math.abs(mouth[1] - cr.launch[1]) < 0.01, JSON.stringify(mouth));
check('the hull is as long as the table says: the engine block at the stern and the head at the bow make len, and the scene scales it to CAMP.size.carrier.len', Math.abs(ex1 + cr.len / 2) < 1e-9 && Math.max(...core.map(p => p[0])) === cr.len / 2 && J('CAMP_LOOK.carrier.scale * CAMP_LOOK.carrier.w') === J('CAMP.size.carrier.len'));
// the bridge tower reads as a tower and not as a crate (the blind critic): a shadow on the hull under it, two decks, a row of lit windows across its front
(() => {
  const [tx1, ty1, tx2, ty2] = cr.tower, X = x => W / 2 + x * k, Y = y => Ht / 2 + y * k; let fc = 0, fa = 1; const near = [], wins = [];
  ops.forEach(([n, a, b, c, d]) => { if (n === 'fillStyle') { fc = a; fa = b === undefined ? 1 : b; } if (n === 'fillRect' && a >= X(tx1) - 1 && a <= X(tx2 + 3) && b >= Y(ty1) - 1 && b <= Y(ty2 + 3)) { near.push({ c: fc, a: fa, w: c, h: d }); if (fc === H.window) wins.push(1); } });
  check('the bridge tower throws a shadow on the hull (a dark, faint block under it), has a lower and an upper deck, and a row of at least five lit windows across its front', near.some(r => r.c === H.edge && r.a <= 0.5) && wins.length >= 5, wins.length + ' windows');
})();
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
