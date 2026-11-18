// smoke: the world art is unchanged by the speed-up: noise numbers and the pixels of 47 textures
// The world art is drawn pixel by pixel at boot (src/art_world.js), and that was the biggest cost of loading the game (card
// space-game-perf-pass). The drawing was made faster without changing a pixel; this test keeps it that way.
//   1. (no browser) waFbm, the noise every texture is built from, gives exactly the numbers of the first version, which is copied below.
//   2. (Chrome) every texture art_world.js paints, and every planet kind with four seeds, has the pixels recorded in
//      tests/fixtures/arthash.json, which was taken from the code before the speed-up.
// If a texture is changed on purpose, run   node tests/perfart.mjs --write   to record the new pixels, and say so in the commit.
// Run: node tests/perfart.mjs   (exit code 1 on any failure)
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, ROOT } from './cdp.mjs';

let failed = 0, n = 0;
const check = (ok, msg) => { n++; console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) failed++; };

// ---- 1. the noise ----
// The first version of waFbm (one closure per octave), as it was before the speed-up. It is the definition the new one must match.
function firstFbm(rnd, base, octaves) {
  const ns = [];
  for (let o = 0; o < octaves; o++) {
    const P = base << o, g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = rnd();
    ns.push((x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
      const a = g[y0 * P + x0], b = g[y0 * P + x1], c = g[y1 * P + x0], d = g[y1 * P + x1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    });
  }
  let norm = 0; for (let o = 0; o < octaves; o++) norm += 1 / (1 << o);
  return (u, v) => { let s = 0; for (let o = 0; o < octaves; o++) s += ns[o](u * (base << o), v * (base << o)) / (1 << o); return s / norm; };
}
{
  const ctx = vm.createContext({ document: {}, window: {}, performance });
  vm.runInContext(readFileSync(join(ROOT, 'src', 'art_world.js'), 'utf8'), ctx);
  let samples = 0, different = 0;
  // every (base, octaves) the game uses, and a few more; a grid across the tile, then points outside it (negative and past 1)
  const shapes = [[3, 5], [3, 3], [5, 4], [4, 3], [24, 2], [9, 3], [2, 4], [4, 5], [6, 4], [11, 3], [16, 2], [8, 3]];
  let seed = 1;
  for (const [base, octaves] of shapes) {
    const A = firstFbm(ctx.waRng(100 + base), base, octaves), B = ctx.waFbm(ctx.waRng(100 + base), base, octaves);
    for (let y = 0; y < 1024; y += 7) for (let x = 0; x < 1024; x += 7) { const u = x / 1024, v = y / 1024; samples++; if (A(u, v) !== B(u, v)) different++; }
    for (let i = 0; i < 4000; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; const u = (seed / 4294967296) * 4 - 1.5; seed = (seed * 1664525 + 1013904223) >>> 0; const v = (seed / 4294967296) * 4 - 1.5; samples++; if (A(u, v) !== B(u, v)) different++; }
  }
  check(different === 0, `waFbm gives the numbers of the first version: ${samples} samples, ${different} different`);
}

// ---- 2. the pixels ----
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'arthash.json');
const write = process.argv.includes('--write');
// The pixels in tests/fixtures/arthash.json were recorded from software drawing (SwiftShader). The GPU rounds a few values differently, so this one
// test keeps software drawing whatever the default is (docs/SMOKE.md 7); what it checks is unchanged.
const gl0 = process.env.LONGHAUL_GL; process.env.LONGHAUL_GL = 'software';
const t = await launch('');
if (gl0 === undefined) delete process.env.LONGHAUL_GL; else process.env.LONGHAUL_GL = gl0;
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Title'))", 30000, 'Title active');
  const got = await t.ev(`(() => {
    const sc = game.scene.getScene('Title'), H = {};
    const hashOf = src => {
      const w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, w, h).data;
      let a = 0x811c9dc5, b = 0; for (let i = 0; i < d.length; i++) { a ^= d[i]; a = Math.imul(a, 16777619); b = (b + d[i] * ((i % 251) + 1)) | 0; }
      return w + 'x' + h + ':' + (a >>> 0).toString(16) + ':' + (b >>> 0).toString(16);
    };
    const keys = [];
    const orig = window.waCanvas; window.waCanvas = function (s, key, ...rest) { keys.push(key); return orig.call(this, s, key, ...rest); };
    worldArt(sc); window.waCanvas = orig; // paints every texture of art_world.js once more, so the keys it makes are known
    keys.forEach(k => { H[k] = hashOf(game.textures.get(k).getSourceImage()); });
    for (const kind of PLANET_KINDS) for (const seed of [1, 2, 3, 17]) { const key = planetTexture(sc, kind, seed); H[key] = hashOf(game.textures.get(key).getSourceImage()); }
    return H;
  })()`);
  const names = Object.keys(got);
  if (write) {
    writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
    console.log(`  wrote ${names.length} hashes to tests/fixtures/arthash.json`);
  } else {
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const bad = Object.keys(want).filter(k => want[k] !== got[k]);
    const missing = Object.keys(want).filter(k => !(k in got)), extra = names.filter(k => !(k in want));
    check(names.length >= 40, `${names.length} textures hashed (24 painted at boot, 20 planets)`);
    check(bad.length === 0 && missing.length === 0, `every texture has the recorded pixels${bad.length ? ' (changed: ' + bad.join(', ') + ')' : ''}${missing.length ? ' (not made now: ' + missing.join(', ') + ')' : ''}`);
    check(extra.length === 0, `no texture the record does not know${extra.length ? ' (' + extra.join(', ') + ' are new: run node tests/perfart.mjs --write)' : ''}`);
  }
  check(t.errors.length === 0, 'no console errors' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
} finally { await t.close(); }

console.log(failed ? `\nPERFART FAIL (${failed} of ${n} checks)` : `\nPERFART PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
