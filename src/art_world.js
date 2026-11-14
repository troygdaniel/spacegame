// ---------- World art (Long Haul v2): space backdrop, planet, asteroids, ore, planet surface, effects ----------
// Boot calls worldArt(scene) once; space.js, surface.js and asteroids.js call the small helpers at the bottom.
// Everything is drawn in code, no image files and no libraries. The textures are painted on 2D canvases rather than with
// Graphics shapes: soft glow, gradients and per-pixel shading (a lit sphere, a nebula) are not possible with shapes.
// A seeded random generator keeps the art identical on every boot, so before/after screenshots compare.

function waRng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const waLerp = (a, b, t) => a + (b - a) * t;
const waClamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const waSmooth = (a, b, x) => { const t = waClamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const waMix = (c1, c2, t) => [waLerp(c1[0], c2[0], t), waLerp(c1[1], c2[1], t), waLerp(c1[2], c2[2], t)];

// value noise that repeats every `period` lattice cells; fbm stacks octaves (u, v in 0..1, seamless across a tile)
// The nebula, the ground, the terrain and every planet call this a million times at boot, so the octaves run in one loop over plain
// arrays (no closure per octave). It must give exactly the same numbers as the first version: the lattice is filled in the same order
// from the same generator, every float operation is the same in the same order, and 1 / 2^o is exact, so x * (1 / 2^o) equals x / 2^o.
// (tests/perfart.mjs checks the pixels of every texture against hashes taken before the change.)
function waFbm(rnd, base, octaves) {
  const gs = [], Ps = [], scale = [], inv = [];
  for (let o = 0; o < octaves; o++) {
    const P = base << o, g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = rnd();
    gs.push(g); Ps.push(P); scale.push(base << o); inv.push(1 / (1 << o));
  }
  let norm = 0; for (let o = 0; o < octaves; o++) norm += 1 / (1 << o);
  return (u, v) => {
    let s = 0;
    for (let o = 0; o < octaves; o++) {
      const P = Ps[o], g = gs[o], k = scale[o], x = u * k, y = v * k;
      const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      let x0 = xi % P, y0 = yi % P; if (x0 < 0) x0 += P; if (y0 < 0) y0 += P; // negative inputs wrap too (a modulo that is never negative)
      const x1 = x0 + 1 === P ? 0 : x0 + 1, y1 = y0 + 1 === P ? 0 : y0 + 1, r0 = y0 * P, r1 = y1 * P;
      const a = g[r0 + x0], b = g[r0 + x1], c = g[r1 + x0], d = g[r1 + x1];
      s += (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * inv[o];
    }
    return s / norm;
  };
}

function waCanvas(sc, key, w, h, fn) {
  if (sc.textures.exists(key)) sc.textures.remove(key);
  const tex = sc.textures.createCanvas(key, w, h);
  fn(tex.getContext(), w, h);
  tex.refresh();
  return tex;
}
function waPixels(ctx, w, h, fn) { // fn(x, y, out): write out[0..3] = r, g, b, alpha (0-255); out starts at zero
  const img = ctx.createImageData(w, h), d = img.data, o = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    o[0] = o[1] = o[2] = o[3] = 0; fn(x, y, o);
    if (o[3] > 0) { const i = (y * w + x) * 4; d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = o[3]; }
  }
  ctx.putImageData(img, 0, 0);
}
function waGlow(ctx, x, y, r, rgb, a, falloff = 0.35) { // a soft round glow: bright centre fading to nothing at r
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(falloff, `rgba(${rgb},${a * 0.38})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// a lit sphere, shaded per pixel. colorFn(lon, lat, dx, dy, nz, diff, c) fills c[0..2] = surface colour, c[3] = night-side glow 0..1.
// o: { L: light direction, amb: night-side brightness, rim: atmosphere rgb, rimA, term: sunset-band rgb, termA }
function waSphere(ctx, cx, cy, R, o, colorFn) {
  const S = Math.ceil(R * 2 + 4), half = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c2 = cv.getContext('2d'), img = c2.createImageData(S, S), d = img.data, lx = o.L[0], ly = o.L[1], lz = o.L[2], c = [0, 0, 0, 0];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - half) / R, dy = (y + 0.5 - half) / R, r2 = dx * dx + dy * dy;
    const rr = Math.sqrt(r2), cov = waClamp((1 - rr) * R + 0.5); if (cov <= 0) continue;
    const nz = Math.sqrt(Math.max(0, 1 - r2)), diff = dx * lx + dy * ly + nz * lz;
    const lon = Math.atan2(dx, nz) / Math.PI + 0.5, lat = Math.asin(waClamp(dy, -1, 1)) / Math.PI + 0.5;
    c[0] = c[1] = c[2] = c[3] = 0; colorFn(lon, lat, dx, dy, nz, diff, c);
    const lit = waSmooth(-0.1, 0.62, diff), k = o.amb + (1 - o.amb) * lit;
    const rim = Math.pow(1 - nz, 3) * (0.2 + 0.8 * waSmooth(-0.55, 0.45, diff)) * o.rimA;
    const tw = Math.exp(-Math.pow((diff - 0.05) / 0.16, 2)) * (o.termA || 0) * (1 - rim * 0.5);
    const glow = c[3] * (1 - lit);
    const i = (y * S + x) * 4;
    d[i] = Math.min(255, c[0] * k + o.rim[0] * rim + (o.term ? o.term[0] * tw : 0) + 255 * glow);
    d[i + 1] = Math.min(255, c[1] * k + o.rim[1] * rim + (o.term ? o.term[1] * tw : 0) + 200 * glow);
    d[i + 2] = Math.min(255, c[2] * k + o.rim[2] * rim + (o.term ? o.term[2] * tw : 0) + 120 * glow);
    d[i + 3] = 255 * cov;
  }
  c2.putImageData(img, 0, 0);
  ctx.drawImage(cv, cx - half, cy - half);
}

const WA_STAR_COLORS = ['255,255,255', '255,255,255', '176,206,255', '255,232,186', '255,196,170', '200,225,255'];
function waStars(ctx, rnd, S, count, rMin, rMax, aMin, aMax, glintShare, margin) { // soft discs; a few get a four-point glint
  for (let i = 0; i < count; i++) {
    const x = margin + rnd() * (S - 2 * margin), y = margin + rnd() * (S - 2 * margin);
    const r = waLerp(rMin, rMax, rnd() * rnd()), a = waLerp(aMin, aMax, rnd()), col = WA_STAR_COLORS[Math.floor(rnd() * WA_STAR_COLORS.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.22, `rgba(${col},${a * 0.55})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    if (rnd() < glintShare) {
      const L = r * (7 + rnd() * 6);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const lg = ctx.createLinearGradient(x - dx * L, y - dy * L, x + dx * L, y + dy * L);
        lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.5, `rgba(${col},${a * 0.85})`); lg.addColorStop(1, `rgba(${col},0)`);
        ctx.strokeStyle = lg; ctx.lineWidth = Math.max(0.7, r * 0.4); ctx.beginPath(); ctx.moveTo(x - dx * L, y - dy * L); ctx.lineTo(x + dx * L, y + dy * L); ctx.stroke();
      }
    }
  }
}

function worldArt(sc) {
  const t0 = performance.now();
  waSpaceArt(sc);
  waPlanetArt(sc);
  waRockArt(sc);
  waSurfaceArt(sc);
  waFxArt(sc);
  window.waMs = Math.round(performance.now() - t0); // tests/world.mjs checks the boot cost
}

// ---------- space: nebula + star layers, distant sun, ringed giant, moon ----------
function waSpaceArt(sc) {
  const rnd = waRng(4711);
  // stars1: the nebula (soft clouds in four colours, dark dust lanes) with a fine layer of tiny stars. Seamless at 1024.
  waCanvas(sc, 'stars1', 1024, 1024, (ctx, S) => {
    const f1 = waFbm(rnd, 3, 5), f2 = waFbm(rnd, 3, 3), f3 = waFbm(rnd, 5, 4), dust = waFbm(rnd, 4, 3);
    const PUR = [96, 54, 176], BLU = [34, 96, 190], TEAL = [30, 160, 180], MAG = [200, 58, 136];
    waPixels(ctx, S, S, (x, y, o) => {
      const u = x / S, v = y / S, n1 = f1(u, v);
      let dens = waSmooth(0.38, 0.7, n1); if (dens < 0.01) return;
      const n3 = f3(u, v), n2 = f2(u, v);
      dens *= 0.5 + 0.8 * n3; dens *= 1 - 0.7 * waSmooth(0.5, 0.68, dust(u, v));
      const m = waSmooth(0.3, 0.7, n2), ac = waSmooth(0.5, 0.78, n3), hi = waSmooth(0.6, 0.85, n1);
      let c = waMix(PUR, BLU, m); c = waMix(c, MAG, ac * 0.55); c = waMix(c, TEAL, hi * 0.5);
      o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = Math.min(255, dens * 175);
    });
    waStars(ctx, rnd, S, 420, 0.45, 0.95, 0.25, 0.8, 0, 6);
  });
  waCanvas(sc, 'stars2', 512, 512, (ctx, S) => waStars(ctx, rnd, S, 80, 0.5, 1.5, 0.35, 0.95, 0.04, 22));
  waCanvas(sc, 'stars3', 1024, 1024, (ctx, S) => waStars(ctx, rnd, S, 26, 1.1, 2.6, 0.7, 1, 0.55, 44));

  waCanvas(sc, 'sun', 512, 512, (ctx, S) => { // a distant sun: wide corona, rays, a hot core
    const C = S / 2;
    waGlow(ctx, C, C, C, '255,170,90', 0.5, 0.2);
    ctx.globalCompositeOperation = 'lighter';
    const r2 = waRng(9);
    for (let i = 0; i < 30; i++) {
      const a = r2() * Math.PI * 2, len = 130 + r2() * 110, w = 2 + r2() * 5;
      ctx.save(); ctx.translate(C, C); ctx.rotate(a);
      const lg = ctx.createLinearGradient(30, 0, len, 0); lg.addColorStop(0, 'rgba(255,224,170,0.32)'); lg.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(30, -w); ctx.lineTo(len, 0); ctx.lineTo(30, w); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(C, C, 0, C, C, 46);
    g.addColorStop(0, '#fffdf4'); g.addColorStop(0.55, '#ffeab0'); g.addColorStop(0.9, '#ffc070'); g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C, C, 48, 0, 7); ctx.fill();
  });

  const SUN_DIR = (() => { const l = Math.hypot(-0.66, 0.42, 0.62); return [-0.66 / l, 0.42 / l, 0.62 / l]; })(); // sun is low on the left
  waCanvas(sc, 'giant', 512, 512, (ctx, S) => { // a ringed gas giant, tilted
    const C = S / 2, R = 112, r2 = waRng(31), band = waFbm(r2, 2, 4), warp = waFbm(r2, 4, 3);
    const ringBand = []; for (let i = 0; i < 128; i++) ringBand.push(0.25 + 0.75 * waSmooth(0.2, 0.8, 0.5 + 0.5 * Math.sin(i * 0.5 + r2() * 3) * r2()));
    const ring = front => {
      ctx.save(); ctx.translate(C, C); ctx.rotate(-0.3); ctx.scale(1, 0.27);
      for (let r = 142, i = 0; r < 236; r += 1.6, i++) {
        const gap = r > 186 && r < 196 ? 0.08 : 1, a = ringBand[i % ringBand.length] * gap * (0.55 - 0.25 * (r - 142) / 94);
        ctx.strokeStyle = r < 190 ? `rgba(226,205,170,${a})` : `rgba(186,200,226,${a})`; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(0, 0, r, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    };
    ring(false);
    const pal = [[78, 88, 138], [124, 138, 186], [176, 172, 200], [104, 118, 168], [196, 184, 190]];
    waSphere(ctx, C, C, R, { L: SUN_DIR, amb: 0.1, rim: [150, 170, 230], rimA: 0.7, term: [255, 150, 110], termA: 0.12 }, (lon, lat, dx, dy, nz, diff, c) => {
      const t = waClamp(0.5 + 0.5 * Math.sin((lat + (warp(lon, lat) - 0.5) * 0.1) * 17 + band(lon, lat) * 2.2));
      const k = t * (pal.length - 1), i = Math.min(pal.length - 2, Math.floor(k)), col = waMix(pal[i], pal[i + 1], k - i);
      c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
    });
    ring(true);
  });

  waCanvas(sc, 'moon', 192, 192, (ctx, S) => { // a small cratered moon
    const r2 = waRng(77), alb = waFbm(r2, 3, 4), cr = [];
    for (let i = 0; i < 11; i++) cr.push([r2() * 2 - 1, r2() * 2 - 1, 0.08 + r2() * r2() * 0.3]);
    waSphere(ctx, S / 2, S / 2, 84, { L: SUN_DIR, amb: 0.07, rim: [150, 170, 210], rimA: 0.25 }, (lon, lat, dx, dy, nz, diff, c) => {
      let v = 0.55 + 0.6 * (alb(lon, lat) - 0.5);
      for (const [x, y, r] of cr) {
        const d = Math.hypot(dx - x * 0.8, dy - y * 0.8) / r;
        if (d < 1.15) { v *= d < 0.95 ? 0.78 + 0.22 * d * d : 1 + 0.12 * (1 - Math.abs(d - 1) * 6); }
      }
      c[0] = 150 * v; c[1] = 154 * v; c[2] = 168 * v;
    });
  });
}

// Backdrop for the Space scene: parallax star layers and distant bodies. spaceBackdropTick(s) runs every frame.
// A system with a `star` ({ type, x, y }, src/data_systems.js) takes its sky from it: the star layers get the star type's tint (STAR_TYPES) and the sun in the sky is that
// type's star (its size), placed by the system's seed so no two skies are alike; its far planets are the bodies you can fly to, so there is no giant or moon. Halcyon has no
// `star` row, so its sky (the orange sun, the giant, the moon) is exactly what it always was. deep: the empty space of a pull-out (src/pullout.js): the stars and nothing else.
function spaceBackdrop(s, deep) {
  const sys = sysDef(), star = sys.star && STAR_TYPES[sys.star.type] ? sys.star.type : null; // src/universe.js
  s.cameras.main.setBackgroundColor(0x02050e);
  const layer = (key, depth, f, a) => { const t = s.add.tileSprite(0, 0, W, H, key).setOrigin(0).setScrollFactor(0).setDepth(depth).setAlpha(a); t.par = f; if (star) t.setTint(STAR_TYPES[star].tint); return t; };
  s.bgLayers = [layer('stars1', -10, 0.2, 1), layer('stars2', -9, 0.45, 1), layer('stars3', -8, 0.85, 1)]; // three full-screen layers: each one costs fill rate
  s.tweens.add({ targets: s.bgLayers[2], alpha: 0.78, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); // the bright stars breathe a little
  if (deep) return;
  // distant bodies drift slower than the world: an image with scroll factor f sits at (anchor + f * reference scroll), so each
  // one is placed where it should appear when you launch from the station
  const REF = { x: 3360, y: 3640 };
  const far = (key, ax, ay, f, depth, scale, alpha = 1) => s.add.image(ax + f * REF.x, ay + f * REF.y, key).setScrollFactor(f).setDepth(depth).setScale(scale).setAlpha(alpha);
  const seed = sys.seed | 0, k = star ? STAR_TYPES[star].size : 1;
  const sun = far(star ? starTexture(s, star) : 'sun', star ? 120 + (seed * 37) % 900 : 150, star ? 380 + (seed * 53) % 460 : 620, 0.03, -6.5, 1.15 * k);
  s.tweens.add({ targets: sun, scale: 1.22 * k, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  if (!star) {
    far('giant', 1010, 520, 0.07, -6, 0.62);
    far('moon', 560, 90, 0.11, -5.5, 0.42, 0.7); // dim and small so it never reads as a rock to shoot
  }
}
function spaceBackdropTick(s) {
  const c = s.cameras.main;
  for (const t of s.bgLayers) { t.tilePositionX = c.scrollX * t.par; t.tilePositionY = c.scrollY * t.par; }
}

// ---------- Kepler-4b ----------
function waPlanetArt(sc) {
  waCanvas(sc, 'planet', 800, 800, (ctx, S) => {
    const C = S / 2, R = 304, rnd = waRng(2024);
    // atmosphere: a halo outside the limb, a little stronger on the lit side
    const halo = (ox, oy, a) => { const g = ctx.createRadialGradient(C + ox, C + oy, R * 0.92, C + ox, C + oy, R + 92); g.addColorStop(0, `rgba(255,170,90,${a})`); g.addColorStop(0.2, `rgba(255,140,70,${a * 0.42})`); g.addColorStop(1, 'rgba(255,120,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); };
    halo(0, 0, 0.5); halo(-26, 18, 0.28);
    const hf = waFbm(rnd, 4, 5), cl = waFbm(rnd, 3, 4), lights = waFbm(rnd, 24, 2);
    const ramp = [[44, 20, 20], [104, 50, 34], [160, 82, 50], [200, 118, 74], [224, 148, 98]];
    const L = (() => { const l = Math.hypot(-0.66, 0.42, 0.62); return [-0.66 / l, 0.42 / l, 0.62 / l]; })();
    waSphere(ctx, C, C, R, { L, amb: 0.06, rim: [255, 140, 64], rimA: 0.6, term: [255, 120, 60], termA: 0.2 }, (lon, lat, dx, dy, nz, diff, c) => {
      const h = hf(lon, lat * 0.9 + 0.05), t = waClamp((h - 0.32) / 0.4) * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(t));
      let col = waMix(ramp[i], ramp[i + 1], t - i);
      const dune = 0.92 + 0.08 * Math.sin(lat * 60 + h * 9); col = [col[0] * dune, col[1] * dune, col[2] * dune];
      const pole = waSmooth(0.8, 1.0, Math.abs(lat - 0.5) * 2 + (h - 0.5) * 0.12); col = waMix(col, [212, 190, 170], pole * 0.85);
      const cloud = waSmooth(0.56, 0.78, cl(lon * 0.9 + lat * 0.25, lat * 2.2)) * 0.42; col = waMix(col, [236, 190, 160], cloud);
      c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
      c[3] = waSmooth(0.64, 0.8, lights(lon, lat)) * (h > 0.45 ? 1 : 0.25) * waSmooth(0.15, 0.4, nz); // colony lights on the night side
    });
    ctx.strokeStyle = 'rgba(255,190,120,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(C, C, R + 0.5, 0, 7); ctx.stroke();
  });
}

// ---------- planet kinds and star types for other star systems (Universe B6) ----------
// Nothing calls these yet: the systems cards wire them in (docs/UNIVERSE.md 4.4, 9). Textures are made on first use and cached.
//   planetTexture(sc, kind, seed)  the key of an 800 px canvas 'planet-<kind>-<seed>'. Kinds: rock, ice, gas, lava, ringed.
//                                  At most PLANET_CACHE_MAX of them are alive: asking for a new one drops the one asked for
//                                  longest ago (a system has up to five planets, so a jump to the next system recycles them).
//                                  A planet that a live image is showing is never dropped (the renderer would crash on it); if all
//                                  are on show the cache just stays over the cap until a scene lets go of them.
//   starTexture(sc, type)          the key of a 512 px canvas 'star-<type>'. Types M K G F A: STAR_TYPES says what each looks like
//                                  and gives the size and the backdrop tint a system of that star uses.
// The seed picks the palette and the markings, so the same (kind, seed) is the same planet on every boot.
const WA_LIGHT = (() => { const l = Math.hypot(-0.66, 0.42, 0.62); return [-0.66 / l, 0.42 / l, 0.62 / l]; })(); // the sun is low on the left, as for Kepler-4b
const PLANET_KINDS = ['rock', 'ice', 'gas', 'lava', 'ringed'];
const PLANET_CACHE_MAX = 6;
const waPlanetCache = []; // keys, the one asked for longest ago first

function waHalo(ctx, C, R, rgb, a, reach = 90) { // atmosphere seen past the limb
  const g = ctx.createRadialGradient(C, C, R * 0.92, C, C, R + reach);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.2, `rgba(${rgb},${a * 0.42})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
const waPick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
const waTint = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

const WA_PLANETS = {
  rock(ctx, S, rnd) { // airless and cratered: grey, tan or umber, with ridges and a few bright young craters
    const C = S / 2, R = 300, base = waPick(rnd, [[158, 150, 140], [176, 152, 124], [132, 134, 144], [150, 120, 104]]);
    const alb = waFbm(rnd, 4, 5), ridge = waFbm(rnd, 9, 3), cr = [];
    for (let i = 0; i < 46; i++) cr.push([rnd() * 2 - 1, rnd() * 2 - 1, 0.03 + Math.pow(rnd(), 3) * 0.26, rnd() < 0.12]);
    waHalo(ctx, C, R, '190,200,215', 0.12, 40);
    waSphere(ctx, C, C, R, { L: WA_LIGHT, amb: 0.06, rim: [170, 180, 200], rimA: 0.2 }, (lon, lat, dx, dy, nz, diff, c) => {
      let v = 0.52 + 0.7 * (alb(lon, lat) - 0.5) + 0.22 * (ridge(lon, lat) - 0.5);
      for (let k = 0; k < cr.length; k++) {
        const x = cr[k][0], y = cr[k][1], r = cr[k][2], young = cr[k][3], ex = dx - x * 0.85, ey = dy - y * 0.85, lim = r * 1.25;
        if (ex > lim || ex < -lim || ey > lim || ey < -lim) continue; // clearly outside 1.2 radii (it could change nothing), and it spares a Math.hypot, which is slow
        const d = Math.hypot(ex, ey) / r;
        if (d < 1.2) {
          if (d < 0.92) v *= 0.62 + 0.38 * d * d;                                  // a dark floor
          else v *= 1 + (young ? 0.4 : 0.12) * (1 - Math.abs(d - 1) * 5);           // a bright rim
          if (young && d < 3.2 && d > 1.2) v *= 1 + 0.12 * (1 - (d - 1.2) / 2);     // ejecta
        }
      }
      const col = waTint(base, waClamp(v, 0.15, 1.5)); c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
    });
  },
  ice(ctx, S, rnd) { // pale blue-white, cracked like a frozen sea, bright poles
    const C = S / 2, R = 300, hue = waPick(rnd, [[200, 226, 244], [214, 232, 240], [186, 214, 246]]);
    const alb = waFbm(rnd, 3, 5), cr1 = waFbm(rnd, 6, 4), cr2 = waFbm(rnd, 11, 3);
    waHalo(ctx, C, R, '150,215,255', 0.42, 70);
    waSphere(ctx, C, C, R, { L: WA_LIGHT, amb: 0.08, rim: [150, 215, 255], rimA: 0.65, term: [150, 190, 255], termA: 0.08 }, (lon, lat, dx, dy, nz, diff, c) => {
      let col = waMix(hue, [236, 246, 255], waSmooth(0.35, 0.7, alb(lon, lat)));
      const l1 = 1 - waSmooth(0, 0.035, Math.abs(cr1(lon, lat) - 0.5)), l2 = 1 - waSmooth(0, 0.02, Math.abs(cr2(lon, lat) - 0.5)); // thin lines where the noise crosses 0.5
      col = waMix(col, [78, 128, 186], Math.max(l1 * 0.85, l2 * 0.55));
      col = waMix(col, [250, 252, 255], waSmooth(0.74, 0.95, Math.abs(lat - 0.5) * 2) * 0.9); // polar caps
      c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
    });
  },
  gas(ctx, S, rnd) { // bands of cloud, a storm, a thick bright limb
    const C = S / 2, R = 300;
    const pal = waPick(rnd, [
      [[120, 62, 44], [178, 104, 64], [224, 172, 124], [150, 86, 56], [238, 208, 172]],      // rust and cream
      [[40, 92, 112], [72, 142, 164], [152, 202, 208], [60, 112, 138], [214, 232, 226]],    // teal
      [[96, 78, 120], [150, 126, 170], [214, 192, 214], [118, 96, 142], [236, 220, 230]],   // violet
      [[134, 112, 60], [190, 164, 96], [232, 214, 156], [160, 132, 70], [242, 232, 196]]    // ochre
    ]);
    const band = waFbm(rnd, 2, 4), warp = waFbm(rnd, 4, 3), swirl = waFbm(rnd, 8, 3), n = 13 + Math.floor(rnd() * 9);
    const storm = { lon: 0.3 + rnd() * 0.4, lat: 0.58 + rnd() * 0.14, rx: 0.07 + rnd() * 0.03, ry: 0.035 };
    const rimRgb = waMix(pal[2], [255, 255, 255], 0.3).map(Math.round).join(',');
    waHalo(ctx, C, R, rimRgb, 0.4, 80);
    waSphere(ctx, C, C, R, { L: WA_LIGHT, amb: 0.08, rim: waMix(pal[2], [255, 255, 255], 0.3), rimA: 0.75, term: waMix(pal[3], [255, 140, 100], 0.4), termA: 0.1 }, (lon, lat, dx, dy, nz, diff, c) => {
      const t = waClamp(0.5 + 0.5 * Math.sin((lat + (warp(lon, lat) - 0.5) * 0.09) * n + band(lon, lat) * 2.4 + swirl(lon * 2, lat * 6) * 0.9));
      const k = t * (pal.length - 1), i = Math.min(pal.length - 2, Math.floor(k));
      let col = waMix(pal[i], pal[i + 1], k - i);
      const sd = Math.hypot((lon - storm.lon) / storm.rx, (lat - storm.lat) / storm.ry);
      if (sd < 1.6) col = waMix(col, waMix(pal[0], [180, 60, 40], 0.5), (1 - waSmooth(0.7, 1.6, sd)) * 0.8);
      c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
    });
  },
  lava(ctx, S, rnd) { // a black crust cut by glowing cracks that shine on the night side too
    const C = S / 2, R = 300, crust = waPick(rnd, [[44, 30, 28], [36, 30, 34], [52, 34, 26]]);
    const alb = waFbm(rnd, 4, 5), c1 = waFbm(rnd, 5, 5), c2 = waFbm(rnd, 9, 3), pool = waFbm(rnd, 3, 4);
    waHalo(ctx, C, R, '255,110,50', 0.5, 84);
    waSphere(ctx, C, C, R, { L: WA_LIGHT, amb: 0.1, rim: [255, 110, 50], rimA: 0.7, term: [255, 90, 40], termA: 0.16 }, (lon, lat, dx, dy, nz, diff, c) => {
      const crack = Math.max(1 - waSmooth(0, 0.045, Math.abs(c1(lon, lat) - 0.5)), (1 - waSmooth(0, 0.025, Math.abs(c2(lon, lat) - 0.5))) * 0.6);
      const sea = waSmooth(0.66, 0.78, pool(lon, lat));                                  // a few open lakes of lava
      const glow = Math.max(crack, sea);
      let col = waTint(crust, 0.7 + 0.8 * alb(lon, lat));
      col = waMix(col, [255, 150, 50], glow * 0.95);
      c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; c[3] = glow * 0.9 * waSmooth(0.1, 0.4, nz);
    });
  },
  ringed(ctx, S, rnd) { // a smaller pale giant with a wide ring system: the ring is drawn behind the planet, then in front
    const C = S / 2, R = 206, tilt = (rnd() - 0.5) * 0.7, hue = waPick(rnd, [[[196, 176, 140], [226, 208, 170]], [[170, 180, 210], [214, 220, 238]], [[200, 160, 150], [232, 204, 190]]]);
    const band = waFbm(rnd, 2, 4), warp = waFbm(rnd, 4, 3), ringBand = [];
    for (let i = 0; i < 160; i++) ringBand.push(0.2 + 0.8 * waSmooth(0.15, 0.85, 0.5 + 0.5 * Math.sin(i * 0.43 + rnd() * 3) * rnd()));
    const ring = front => {
      ctx.save(); ctx.translate(C, C); ctx.rotate(tilt); ctx.scale(1, 0.26);
      for (let r = 252, i = 0; r < 380; r += 1.7, i++) {
        const gap = r > 318 && r < 330 ? 0.05 : r > 288 && r < 292 ? 0.3 : 1, f = (r - 252) / 128, a = ringBand[i % ringBand.length] * gap * (0.62 - 0.3 * f);
        ctx.strokeStyle = r < 318 ? `rgba(${hue[1][0]},${hue[1][1]},${hue[1][2]},${a})` : `rgba(190,200,224,${a})`; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(0, 0, r, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    };
    waHalo(ctx, C, R, '230,220,200', 0.18, 50);
    ring(false);
    waSphere(ctx, C, C, R, { L: WA_LIGHT, amb: 0.1, rim: [220, 212, 200], rimA: 0.6, term: [255, 160, 120], termA: 0.1 }, (lon, lat, dx, dy, nz, diff, c) => {
      const t = waClamp(0.5 + 0.5 * Math.sin((lat + (warp(lon, lat) - 0.5) * 0.08) * 19 + band(lon, lat) * 2));
      const col = waMix(hue[0], hue[1], t); c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
    });
    ring(true);
  }
};

function planetTexture(sc, kind, seed) {
  if (!PLANET_KINDS.includes(kind)) kind = 'rock';
  seed = (seed | 0) || 1;
  const key = 'planet-' + kind + '-' + seed, at = waPlanetCache.indexOf(key);
  if (at >= 0) waPlanetCache.splice(at, 1);
  if (at >= 0 && sc.textures.exists(key)) { waPlanetCache.push(key); return key; }
  waCanvas(sc, key, 800, 800, (ctx, S) => WA_PLANETS[kind](ctx, S, waRng(Math.imul(seed, 2654435761) + PLANET_KINDS.indexOf(kind) * 104729)));
  waPlanetCache.push(key);
  while (waPlanetCache.length > PLANET_CACHE_MAX) {
    const drop = waPlanetCache.find(k => !waOnShow(sc, k));
    if (!drop) break; // every one is on show: keep them all
    waPlanetCache.splice(waPlanetCache.indexOf(drop), 1); sc.textures.remove(drop);
  }
  return key;
}
// is any live image, in any scene (or inside a container), using this texture?
function waOnShow(sc, key) {
  const has = list => list.some(o => (o.texture && o.texture.key === key) || (o.list && has(o.list)));
  return sc.game.scene.scenes.some(s => s.children && has(s.children.list));
}

// star types: the colour of the sun in the sky and of the light on everything. size scales the sun image (1 is Halcyon's 'sun'),
// tint is the colour the system's nebula layers are tinted with (Image.setTint) so a red dwarf's sky is warm and a blue star's is cold.
const STAR_TYPES = {
  M: { name: 'red dwarf',      core: [255, 226, 190], mid: [255, 150, 100], corona: [255, 96, 64],   rays: 0.9, size: 0.8,  tint: 0xff9a80 },
  K: { name: 'orange dwarf',   core: [255, 240, 200], mid: [255, 196, 120], corona: [255, 150, 70],  rays: 1.0, size: 0.95, tint: 0xffbf85 },
  G: { name: 'yellow star',    core: [255, 253, 244], mid: [255, 234, 176], corona: [255, 205, 120], rays: 1.0, size: 1.0,  tint: 0xfff0c8 },
  F: { name: 'white star',     core: [255, 255, 255], mid: [236, 244, 255], corona: [205, 228, 255], rays: 1.1, size: 1.1,  tint: 0xe4eeff },
  A: { name: 'blue-white star', core: [244, 250, 255], mid: [170, 206, 255], corona: [110, 160, 255], rays: 1.3, size: 1.2,  tint: 0xa8c8ff }
};
function starTexture(sc, type) {
  const st = STAR_TYPES[type] || STAR_TYPES.G, key = 'star-' + (STAR_TYPES[type] ? type : 'G');
  if (sc.textures.exists(key)) return key;
  waCanvas(sc, key, 512, 512, (ctx, S) => { // the same recipe as 'sun': a wide corona, rays, a hot core
    const C = S / 2, rgb = a => a.join(','), r2 = waRng('MKGFA'.indexOf(type) * 131 + 9);
    waGlow(ctx, C, C, C, rgb(st.corona), 0.5, 0.2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 30; i++) {
      const a = r2() * Math.PI * 2, len = (130 + r2() * 110) * st.rays, w = 2 + r2() * 5;
      ctx.save(); ctx.translate(C, C); ctx.rotate(a);
      const lg = ctx.createLinearGradient(30, 0, len, 0); lg.addColorStop(0, `rgba(${rgb(st.mid)},0.32)`); lg.addColorStop(1, `rgba(${rgb(st.corona)},0)`);
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(30, -w); ctx.lineTo(len, 0); ctx.lineTo(30, w); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(C, C, 0, C, C, 46);
    g.addColorStop(0, `rgb(${rgb(st.core)})`); g.addColorStop(0.55, `rgb(${rgb(st.mid)})`); g.addColorStop(0.9, `rgb(${rgb(st.corona)})`); g.addColorStop(1, `rgba(${rgb(st.corona)},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C, C, 48, 0, 7); ctx.fill();
  });
  return key;
}

// ---------- asteroids and ore ----------
function waAsteroid(ctx, rnd) { // a 64 x 64 boulder: lumpy outline, cratered, with glowing ore veins
  const N = 16, pts = [], ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, r = 24 + 3.2 * Math.sin(a * 2 + ph[0]) + 2.4 * Math.sin(a * 3 + ph[1]) + 1.6 * Math.sin(a * 5 + ph[2]) + (rnd() - 0.5) * 2.6;
    pts.push([32 + Math.cos(a) * r, 32 + Math.sin(a) * r]);
  }
  const outline = () => { // smooth closed curve through the midpoints
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % N], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      if (i === 0) ctx.moveTo((pts[N - 1][0] + p0[0]) / 2, (pts[N - 1][1] + p0[1]) / 2);
      ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
    }
    ctx.closePath();
  };
  const g = ctx.createRadialGradient(25, 23, 2, 32, 32, 38);
  g.addColorStop(0, '#9a92a6'); g.addColorStop(0.5, '#5e566a'); g.addColorStop(1, '#27222f');
  ctx.fillStyle = g; outline(); ctx.fill();
  ctx.save(); outline(); ctx.clip();
  for (let i = 0; i < 90; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.16)'; ctx.fillRect(rnd() * 64, rnd() * 64, 1 + rnd() * 1.4, 1 + rnd() * 1.4); }
  for (let i = 0; i < 4; i++) { // craters: a dark bowl with a lit lip on the far side
    const x = 14 + rnd() * 36, y = 14 + rnd() * 36, r = 3 + rnd() * 5;
    ctx.fillStyle = 'rgba(14,10,22,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(205,196,220,0.4)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y, r, 0.2, 2.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x, y, r, 3.5, 5.6); ctx.stroke();
  }
  for (let v = 0; v < 3; v++) { // ore veins: amber light with a hot core
    let x = 12 + rnd() * 40, y = 12 + rnd() * 40, a = rnd() * 6.28; const path = [[x, y]];
    for (let i = 0; i < 4; i++) { a += (rnd() - 0.5) * 1.5; x += Math.cos(a) * (4 + rnd() * 4); y += Math.sin(a) * (4 + rnd() * 4); path.push([x, y]); }
    ctx.shadowColor = 'rgba(255,170,60,0.95)'; ctx.shadowBlur = 5; ctx.strokeStyle = 'rgba(255,176,84,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,241,168,0.95)'; ctx.lineWidth = 0.6; ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,150,184,0.75)'; ctx.lineWidth = 1.5; outline(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(32, 32, 22.5, 0.5, 2.3); ctx.stroke();
}

function waRockArt(sc) {
  const rnd = waRng(515);
  ['asteroid', 'asteroid2', 'asteroid3'].forEach(key => waCanvas(sc, key, 64, 64, ctx => waAsteroid(ctx, rnd)));
  waCanvas(sc, 'ore', 24, 24, ctx => { // a glowing amber crystal cluster
    waGlow(ctx, 12, 12, 12, '255,176,84', 0.6, 0.3);
    const gem = (cx, cy, w, h, rot) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      const g = ctx.createLinearGradient(-w, -h, w, h); g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, '#ffb454'); g.addColorStop(1, '#c4651a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, -h * 0.2); ctx.lineTo(w * 0.7, h); ctx.lineTo(-w * 0.7, h); ctx.lineTo(-w, -h * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, h); ctx.moveTo(-w, -h * 0.2); ctx.lineTo(w, -h * 0.2); ctx.stroke();
      ctx.restore();
    };
    gem(8, 14, 3.2, 6, -0.35); gem(16, 14, 3, 5.4, 0.4); gem(12, 11, 4.2, 7.6, 0);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10.5, 7.5, 1.1, 0, 7); ctx.fill();
  });
}

// ---------- planet surface: ground, terrain colour, boulders, colonist, crawlers, landing pad, crash site ----------
function waSurfaceArt(sc) {
  const rnd = waRng(808);
  waCanvas(sc, 'ground', 512, 512, (ctx, S) => { // rust-red dust that tiles without a seam
    const f1 = waFbm(rnd, 3, 5), f2 = waFbm(rnd, 16, 2), rid = waFbm(rnd, 4, 3);
    const DARK = [40, 20, 16], MID = [82, 42, 30], LIGHT = [132, 74, 48];
    waPixels(ctx, S, S, (x, y, o) => {
      const u = x / S, v = y / S, n = f1(u, v);
      let c = waMix(DARK, MID, waSmooth(0.3, 0.58, n)); c = waMix(c, LIGHT, waSmooth(0.56, 0.8, n) * 0.85);
      const rp = 0.5 + 0.5 * Math.sin((u * 8 + rid(u, v) * 2.4) * Math.PI * 2);
      c = waMix(c, LIGHT, rp * rp * 0.14 * waSmooth(0.35, 0.7, n));
      const gr = (f2(u, v) - 0.5) * 44;
      o[0] = c[0] + gr; o[1] = c[1] + gr * 0.8; o[2] = c[2] + gr * 0.7; o[3] = 255;
    });
    const wrap = fn => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
    for (let i = 0; i < 70; i++) { // pebbles with a tiny shadow and a lit edge
      const x = rnd() * S, y = rnd() * S, r = 1.4 + rnd() * 3.4, a = rnd() * 3;
      wrap((ox, oy) => {
        ctx.fillStyle = 'rgba(10,4,4,0.4)'; ctx.beginPath(); ctx.ellipse(x + ox + 1.2, y + oy + 1.4, r, r * 0.8, a, 0, 7); ctx.fill();
        ctx.fillStyle = `rgb(${96 + rnd() * 30},${64 + rnd() * 20},${52 + rnd() * 16})`; ctx.beginPath(); ctx.ellipse(x + ox, y + oy, r, r * 0.8, a, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,214,170,0.28)'; ctx.beginPath(); ctx.ellipse(x + ox - r * 0.3, y + oy - r * 0.3, r * 0.45, r * 0.3, a, 0, 7); ctx.fill();
      });
    }
    for (let i = 0; i < 9; i++) { // dry cracks
      let x = rnd() * S, y = rnd() * S, a = rnd() * 6.28; const path = [[x, y]];
      for (let k = 0; k < 7; k++) { a += (rnd() - 0.5) * 1.1; x += Math.cos(a) * (10 + rnd() * 14); y += Math.sin(a) * (10 + rnd() * 14); path.push([x, y]); }
      wrap((ox, oy) => { ctx.strokeStyle = 'rgba(12,5,5,0.5)'; ctx.lineWidth = 1.3; ctx.beginPath(); path.forEach((p, k) => k ? ctx.lineTo(p[0] + ox, p[1] + oy) : ctx.moveTo(p[0] + ox, p[1] + oy)); ctx.stroke(); });
    }
  });
  waCanvas(sc, 'terrain', 1200, 700, (ctx, W2, H2) => { // large soft patches over the tiled ground: dark basalt flats, pale dust, a few old craters
    const f = waFbm(rnd, 3, 4), f2 = waFbm(rnd, 6, 3);
    waPixels(ctx, W2, H2, (x, y, o) => {
      const u = x / W2, v = y / H2, n = f(u, v), m = f2(u, v);
      const dark = waSmooth(0.5, 0.68, n), pale = waSmooth(0.55, 0.7, 1 - m);
      if (dark > pale * 0.6) { o[0] = 14; o[1] = 6; o[2] = 8; o[3] = dark * 120; } else { o[0] = 236; o[1] = 170; o[2] = 120; o[3] = pale * 46; }
    });
    for (let i = 0; i < 8; i++) { // old craters: a bowl shaded dark on the far side, a pale lip on the near side
      const x = 80 + rnd() * 1040, y = 60 + rnd() * 580, r = 24 + rnd() * 50;
      const g = ctx.createRadialGradient(x + r * 0.35, y + r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,190,140,0.10)'); g.addColorStop(0.55, 'rgba(10,4,4,0.28)'); g.addColorStop(0.9, 'rgba(10,4,4,0.38)'); g.addColorStop(1, 'rgba(10,4,4,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      const lip = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.12); lip.addColorStop(0, 'rgba(255,200,150,0)'); lip.addColorStop(0.5, 'rgba(255,200,150,0.14)'); lip.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = lip; ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, 7); ctx.fill();
    }
  });
  waCanvas(sc, 'rock', 56, 56, ctx => { // a faceted boulder with a soft shadow, lit from the upper left
    const r = waRng(33), N = 11, pts = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + r() * 0.3, d = 19 + r() * 5; pts.push([27 + Math.cos(a) * d, 26 + Math.sin(a) * d]); }
    for (let i = 4; i > 0; i--) { ctx.fillStyle = `rgba(0,0,0,${0.08 * (5 - i)})`; ctx.beginPath(); ctx.ellipse(31, 32, 22 + i, 19 + i, 0.4, 0, 7); ctx.fill(); }
    const poly = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const g = ctx.createRadialGradient(20, 18, 2, 27, 26, 30); g.addColorStop(0, '#7d6258'); g.addColorStop(0.55, '#47342f'); g.addColorStop(1, '#1f1514');
    ctx.fillStyle = g; poly(); ctx.fill();
    ctx.save(); poly(); ctx.clip();
    pts.forEach((p, i) => { const q = pts[(i + 1) % N]; const lv = Math.cos(i / N * 6.28 + 2.2); ctx.fillStyle = lv > 0 ? `rgba(255,214,180,${0.03 + lv * 0.07 * r()})` : `rgba(0,0,0,${0.04 - lv * 0.1 * r()})`; ctx.beginPath(); ctx.moveTo(24 + r() * 6, 23 + r() * 6); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); });
    for (let i = 0; i < 30; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)'; ctx.fillRect(8 + r() * 38, 8 + r() * 38, 1.5, 1.5); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(170,130,120,0.65)'; ctx.lineWidth = 1.4; poly(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,190,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(27, 26, 19, 3.4, 4.7); ctx.stroke();
  });
  waCanvas(sc, 'colonist', 22, 22, ctx => { // a stranded colonist in a suit, seen from above, facing right
    waGlow(ctx, 11, 11, 11, '255,180,84', 0.55, 0.3);
    ctx.fillStyle = '#3a2306'; ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(3, 6, 6, 10, 2); ctx.fill(); ctx.stroke(); // life pack
    const g = ctx.createRadialGradient(9, 8, 1, 11, 11, 9); g.addColorStop(0, '#ffcf80'); g.addColorStop(1, '#a8601c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(10, 11, 6, 8, 0, 0, 7); ctx.fill(); ctx.stroke(); // shoulders
    ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.arc(13, 11, 4.6, 0, 7); ctx.fill(); ctx.stroke(); // helmet
    ctx.fillStyle = '#9fe9ff'; ctx.beginPath(); ctx.ellipse(14.6, 11, 2, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(15, 9.8, 0.9, 0, 7); ctx.fill();
  });
  [0, 1].forEach(step => waCanvas(sc, step ? 'crawler2' : 'crawler', 30, 30, ctx => { // a six-legged crawler: two frames so the legs walk
    waGlow(ctx, 15, 15, 15, '109,255,156', 0.3, 0.3);
    ctx.strokeStyle = '#6dff9c'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [-1, 1].forEach(side => [0, 1, 2].forEach(i => {
      const bx = 11 + i * 4, swing = ((i + (step ? 1 : 0)) % 2 ? 1 : -1) * 2.4, kx = bx + swing * 0.5 + (i - 1) * 2, ky = 15 + side * 9, fx = bx + swing + (i - 1) * 4, fy = 15 + side * 12.5;
      ctx.beginPath(); ctx.moveTo(bx, 15 + side * 3); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    }));
    ctx.lineWidth = 1.2; ctx.fillStyle = '#0f2a17';
    ctx.beginPath(); ctx.ellipse(8, 15, 6.5, 5.5, 0, 0, 7); ctx.fill(); ctx.stroke(); // abdomen
    ctx.beginPath(); ctx.ellipse(15, 15, 5.5, 5, 0, 0, 7); ctx.fill(); ctx.stroke(); // thorax
    ctx.beginPath(); ctx.ellipse(21, 15, 4.2, 3.8, 0, 0, 7); ctx.fill(); ctx.stroke(); // head
    ctx.strokeStyle = 'rgba(109,255,156,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, 15); ctx.lineTo(18, 15); ctx.moveTo(8, 11.5); ctx.lineTo(8, 18.5); ctx.stroke();
    ctx.strokeStyle = '#6dff9c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(24, 13); ctx.lineTo(27.5, 11.4); ctx.moveTo(24, 17); ctx.lineTo(27.5, 18.6); ctx.stroke(); // mandibles
    ctx.fillStyle = '#d8ffe6'; ctx.beginPath(); ctx.arc(22.4, 13.4, 1.2, 0, 7); ctx.arc(22.4, 16.6, 1.2, 0, 7); ctx.fill();
    waGlow(ctx, 22.4, 15, 5, '109,255,156', 0.55, 0.3);
  }));
  waCanvas(sc, 'pad', 280, 280, ctx => { // the landing pad: plate, hazard ring, panel lines, ring of lights (the lights pulse from padlights)
    const C = 140;
    waGlow(ctx, C, C, 140, '255,180,84', 0.16, 0.5);
    const g = ctx.createRadialGradient(C - 20, C - 24, 10, C, C, 124); g.addColorStop(0, '#34404f'); g.addColorStop(1, '#161d27');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C, C, 112, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,84,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(C, C, 112, 0, 7); ctx.stroke();
    for (let i = 0; i < 36; i++) { // hazard stripes
      const a0 = i / 36 * Math.PI * 2, a1 = a0 + Math.PI * 2 / 72; ctx.strokeStyle = i % 2 ? '#ffb454' : '#1a2230'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(C, C, 101, a0, a1); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,150,180,0.35)'; ctx.lineWidth = 1.5;
    [88, 66, 40].forEach(r => { ctx.beginPath(); ctx.arc(C, C, r, 0, 7); ctx.stroke(); });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(C + Math.cos(a) * 40, C + Math.sin(a) * 40); ctx.lineTo(C + Math.cos(a) * 88, C + Math.sin(a) * 88); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,180,84,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(C, C, 120, 0, 7); ctx.stroke();
  });
  waCanvas(sc, 'padlights', 280, 280, ctx => {
    const C = 140;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = C + Math.cos(a) * 120, y = C + Math.sin(a) * 120; waGlow(ctx, x, y, 13, i % 3 === 0 ? '109,255,156' : '255,200,110', 0.9, 0.3); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
  });
  waCanvas(sc, 'wreck', 140, 140, ctx => { // the crashed escape pod: soot scar, broken hull, a hatch hanging open, a flickering light
    const C = 70;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(8,4,4,${0.07 + i * 0.03})`; ctx.beginPath(); ctx.ellipse(C + 2, C + 3, 66 - i * 6, 50 - i * 5, 0.2, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(C, C); ctx.rotate(-0.35);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(5, 6, 38, 24, 0, 0, 7); ctx.fill();
    const g = ctx.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, '#7a8694'); g.addColorStop(0.5, '#3a4452'); g.addColorStop(1, '#1b212b');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,180,84,0.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, 0, 36, 22, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(10,6,6,0.5)'; ctx.beginPath(); ctx.ellipse(-14, 4, 14, 9, 0, 0, 7); ctx.fill(); // scorch
    ctx.strokeStyle = 'rgba(180,196,214,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-8, 20); ctx.moveTo(10, -21); ctx.lineTo(10, 21); ctx.stroke();
    ctx.fillStyle = '#0c1118'; ctx.beginPath(); ctx.ellipse(14, 0, 11, 8, 0, 0, 7); ctx.fill(); // open hatch
    ctx.fillStyle = '#5a6674'; ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(36, -18); ctx.lineTo(34, -4); ctx.closePath(); ctx.fill(); // hatch door
    ctx.strokeStyle = '#ffb454'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-34, -6); ctx.lineTo(-24, -2); ctx.lineTo(-30, 6); ctx.stroke(); // torn hull plating
    ctx.restore();
    for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, d = 36 + rnd() * 26; ctx.fillStyle = `rgba(90,100,114,${0.4 + rnd() * 0.4})`; ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.8, 2 + rnd() * 3, 1.5 + rnd() * 2); } // debris
  });
  waCanvas(sc, 'vignette', 640, 360, (ctx, w, h) => { // soft dark corners, drawn once and stretched over the screen
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,4,10,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

// the extra layers of the Surface scene (called from surface.js create, after the ground tile and this.pad / this.pod exist)
function surfaceDress(s) {
  const SW = 2400, SH = 1400;
  s.cameras.main.setBackgroundColor(0x1a0d0b);
  s.add.image(0, 0, 'terrain').setOrigin(0).setScale(SW / 1200).setDepth(0.2);
  s.add.image(s.pad.x, s.pad.y, 'pad').setDepth(0.5);
  const lights = s.add.image(s.pad.x, s.pad.y, 'padlights').setDepth(0.6).setBlendMode('ADD');
  s.tweens.add({ targets: lights, alpha: 0.2, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  s.add.image(s.pod.x, s.pod.y, 'wreck').setDepth(0.5);
  const lamp = s.add.image(s.pod.x + 14, s.pod.y - 8, 'glow').setDepth(0.7).setBlendMode('ADD').setTint(0xff7a3a).setScale(0.7);
  s.tweens.add({ targets: lamp, alpha: 0.25, duration: 340, yoyo: true, repeat: -1, ease: 'Stepped' });
  s.add.particles(s.pod.x + 6, s.pod.y - 4, 'smoke', { // a thin column of smoke from the wreck
    lifespan: 2600, frequency: 220, speed: { min: 8, max: 20 }, angle: { min: 245, max: 290 }, scale: { start: 0.35, end: 1.5 },
    alpha: { start: 0.28, end: 0 }, tint: 0x8a8a98
  }).setDepth(7);
  s.add.particles(0, 0, 'ember', { // dust blowing across the screen
    x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: 4200, frequency: 90, speedX: { min: 40, max: 110 }, speedY: { min: -14, max: 14 },
    scale: { start: 0.55, end: 0.2 }, alpha: { start: 0.35, end: 0 }, tint: 0xe0a070, blendMode: 'ADD'
  }).setScrollFactor(0).setDepth(8);
  s.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setScrollFactor(0).setDepth(60);
  s.beacon = s.add.image(0, 0, 'ring').setTint(AMBER).setBlendMode('ADD').setDepth(3).setVisible(false);
  s.tweens.add({ targets: s.beacon, scale: { from: 0.22, to: 0.46 }, alpha: { from: 0.95, to: 0.1 }, duration: 1100, repeat: -1 });
}
// every frame: crawlers walk (two leg frames), the beacon rings the colonist until they are woken
function surfaceTick(s, time) {
  s.crawlers.getChildren().forEach(c => {
    if (!c.active) return;
    const key = (c.body.speed > 8 && ((time / 130) | 0) % 2) ? 'crawler2' : 'crawler';
    if (c.texture.key !== key) c.setTexture(key);
  });
  const col = s.col;
  if (col && col.state === 'waiting' && col.s.active) s.beacon.setVisible(true).setPosition(col.s.x, col.s.y); else s.beacon.setVisible(false);
}

// ---------- effects: explosions, dash streak, pickup sparkle, rock debris ----------
function waFxArt(sc) {
  waCanvas(sc, 'glow', 64, 64, ctx => waGlow(ctx, 32, 32, 32, '255,255,255', 1, 0.28));
  waCanvas(sc, 'ember', 12, 12, ctx => waGlow(ctx, 6, 6, 6, '255,255,255', 1, 0.3));
  waCanvas(sc, 'smoke', 64, 64, ctx => waGlow(ctx, 32, 32, 32, '255,255,255', 0.8, 0.55));
  waCanvas(sc, 'ring', 128, 128, ctx => {
    [[6, 0.12], [3.4, 0.4], [1.6, 1]].forEach(([w, a]) => { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(64, 64, 58, 0, 7); ctx.stroke(); });
  });
  waCanvas(sc, 'shard', 14, 4, ctx => {
    const g = ctx.createLinearGradient(0, 0, 14, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(13, 0.2); ctx.lineTo(14, 2); ctx.lineTo(13, 3.8); ctx.closePath(); ctx.fill();
  });
  waCanvas(sc, 'chunk', 12, 12, ctx => {
    ctx.fillStyle = '#4a4254'; ctx.strokeStyle = '#9a90aa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(6, 1.5); ctx.lineTo(10.5, 4); ctx.lineTo(9.5, 9.5); ctx.lineTo(4, 10.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(6, 2.5); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill();
  });
}

// The explosion used by every scene as s.boom: boom.explode(count, x, y). A small count is a hit spark; a bigger one adds a
// flash, embers, a shockwave ring, shards and smoke, scaled by the count. pal: { spark, ember, flash, ring }.
function fxBoom(s, pal = {}) {
  const spark = pal.spark || [AMBER, RED, 0xfff1a8], ember = pal.ember || [0xffb454, 0xff7a3a, 0xfff1a8], flash = pal.flash || 0xffd9a0, ringTint = pal.ring || 0xffc080;
  const sparks = s.add.particles(0, 0, 'ember', {
    lifespan: 700, speed: { min: 60, max: 300 }, scale: { start: 2.2, end: 0 }, alpha: { start: 1, end: 0 }, tint: spark, blendMode: 'ADD', emitting: false
  }).setDepth(6);
  const embers = s.add.particles(0, 0, 'ember', {
    lifespan: { min: 500, max: 1200 }, speed: { min: 20, max: 170 }, scale: { start: 1.3, end: 0 }, alpha: { start: 0.95, end: 0 }, tint: ember, blendMode: 'ADD', emitting: false
  }).setDepth(6);
  const shards = s.add.particles(0, 0, 'shard', {
    lifespan: { min: 320, max: 760 }, speed: { min: 140, max: 440 }, rotate: { min: 0, max: 360 }, scale: { start: 1.2, end: 0.2 }, alpha: { start: 1, end: 0 }, tint: ember, blendMode: 'ADD', emitting: false
  }).setDepth(6);
  const smoke = s.add.particles(0, 0, 'smoke', {
    lifespan: { min: 800, max: 1500 }, speed: { min: 8, max: 60 }, scale: { start: 0.5, end: 1.9 }, alpha: { start: 0.38, end: 0 }, tint: 0x5c5866, emitting: false
  }).setDepth(5.4);
  return {
    explode(n, x, y) {
      sparks.explode(n, x, y);
      if (n < 8) return;
      const k = waClamp(n / 30, 0.3, 2.6);
      const f = s.add.image(x, y, 'glow').setDepth(5.6).setBlendMode('ADD').setTint(flash).setScale(0.4 * k);
      s.tweens.add({ targets: f, scale: 3 * k, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => f.destroy() });
      const hot = s.add.image(x, y, 'glow').setDepth(5.65).setBlendMode('ADD').setScale(0.25 * k);
      s.tweens.add({ targets: hot, scale: 1.3 * k, alpha: 0, duration: 240, ease: 'Quad.out', onComplete: () => hot.destroy() });
      embers.explode(Math.ceil(n * 0.6), x, y);
      if (n < 20) return;
      const r = s.add.image(x, y, 'ring').setDepth(5.7).setBlendMode('ADD').setTint(ringTint).setScale(0.15).setAlpha(0.95);
      s.tweens.add({ targets: r, scale: 0.7 + k * 0.9, alpha: 0, duration: 520, ease: 'Cubic.out', onComplete: () => r.destroy() });
      shards.explode(Math.ceil(6 + n / 5), x, y);
      smoke.explode(Math.ceil(2 + n / 12), x, y);
    }
  };
}
function fxDash(s, a) { // the push-off flare of a dodge dash: a stretched streak behind the ship and a ring
  const x = s.ship.x, y = s.ship.y;
  const streak = s.add.image(x - Math.cos(a) * 26, y - Math.sin(a) * 26, 'glow').setDepth(3.2).setBlendMode('ADD').setTint(CYAN).setRotation(a).setScale(1.9, 0.26).setAlpha(0.9);
  s.tweens.add({ targets: streak, scaleX: 3.8, scaleY: 0.08, alpha: 0, duration: 260, ease: 'Cubic.out', onComplete: () => streak.destroy() });
  const r = s.add.image(x, y, 'ring').setDepth(3.1).setBlendMode('ADD').setTint(CYAN).setScale(0.16).setAlpha(0.8);
  s.tweens.add({ targets: r, scale: 0.55, alpha: 0, duration: 300, ease: 'Cubic.out', onComplete: () => r.destroy() });
}
function fxPickup(s, x, y, tint = 0xffd37a) { // a collected pickup: a bright pop, a ring and a few sparks drifting up
  const f = s.add.image(x, y, 'glow').setDepth(5).setBlendMode('ADD').setTint(tint).setScale(0.25);
  s.tweens.add({ targets: f, scale: 1.1, alpha: 0, duration: 300, ease: 'Cubic.out', onComplete: () => f.destroy() });
  const r = s.add.image(x, y, 'ring').setDepth(5).setBlendMode('ADD').setTint(tint).setScale(0.1).setAlpha(0.9);
  s.tweens.add({ targets: r, scale: 0.4, alpha: 0, duration: 360, ease: 'Cubic.out', onComplete: () => r.destroy() });
  for (let i = 0; i < 6; i++) {
    const p = s.add.image(x, y, 'ember').setDepth(5).setBlendMode('ADD').setTint(tint).setScale(0.8), a = Math.random() * 6.28, d = 14 + Math.random() * 22;
    s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 10, alpha: 0, scale: 0.1, duration: 420 + Math.random() * 200, ease: 'Cubic.out', onComplete: () => p.destroy() });
  }
}
function fxDebris(s, x, y, size, tint) { // a rock breaking: chunks fly out and fade
  const n = 3 + size * 2;
  for (let i = 0; i < n; i++) {
    const c = s.add.image(x, y, 'chunk').setDepth(3).setScale(0.5 + Math.random() * 0.5 + size * 0.15).setRotation(Math.random() * 6.28), a = Math.random() * 6.28, d = 30 + Math.random() * 60 + size * 14;
    if (tint) c.setTint(tint);
    s.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, rotation: c.rotation + (Math.random() - 0.5) * 8, alpha: 0, scale: 0.15, duration: 600 + Math.random() * 500, ease: 'Cubic.out', onComplete: () => c.destroy() });
  }
}
