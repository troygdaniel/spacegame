// ---------- Campaign: planets, moons and stars as flat discs (card space-game-world-w2-planets; piece W2 of the world look; Troy approved it on 25 Nov 2026; the mock is docs/world-look-mock.html, direction 1) ----------
// The ships are flat-cut (a shape, a fill, a facet, a rim: src/shiplook.js); the worlds they fly past were shaded, textured balls painted pixel by pixel (src/art_world.js planetTexture: noise, a lit sphere, a halo; 373 ms at a level's start).
// Now, with the world look on (campWorldOn, src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0 for today's), a world is the same recipe: a flat disc in one tone, two or three lighter patches, one darker crescent for the night side
// and a thin dark rim, painted once into a 512 px canvas and shown as one image. A gas giant has two or three lighter bands in place of the patches; Saturn has a thin flat ring; a star is a flat disc with a lighter patch and a thin
// lighter rim, no corona and no glow (gold is for goals in the world: the old Sun's corona was gold). Nothing here is Long Haul's: art_world.js (planetTexture, starTexture) is not read or changed, it paints for Long Haul as it did.
//   CAMPDISC.tones       the three tones of each world: [base, night side, light patches], keyed by the place's id ('earth', 'ceres', 'alpha-cen-b'...), or 'id:kind' where one id is two worlds ('sun' is the Sun in level 1,
//                        a star-sized lava world, Alpha Centauri A, in level 2). The mock's five (Earth, Luna, Ceres, Alpha Centauri B, Kolga) as it draws them; the rest the scope report's (card space-game-world-look-scope, section 3)
//   CAMPDISC.kinds       a default for each kind (rock, ice, gas, lava, ringed, star), so a world a mod adds still draws; the seed makes it a little darker (up to 6 percent) so two such worlds are not one
//   campDiscTone(p, id)  the three tones of a place p (id: its key in campPlaces; the place has none of its own)
//   campDiscShapes(kind, seed, id)   WHAT is painted, as data (the patches, the bands, the ring, the crescent): the painter reads it, the test too
//   campDiscPaint(ctx, S, tone, kind, shapes)   paints it on a 2D context of S by S
//   campDiscTexture(sc, p, id)       { key, R }: the canvas texture of the place (made once, kept by the texture manager) and the disc's radius in it: the image is scaled r / R, so a world is as wide on the screen as it was
// None of the colours is a fight colour (tests/campworlddisc.mjs: the delta E of every base tone from the six sides' colours is at least 20, of every patch at least 14, and no base tone is more saturated than 0.4).
const CAMPDISC = {
  size: 512,                                  // px: a disc's canvas
  R: 240,                                     // px: the disc's radius in its canvas (a ringed world's is ringR, so that its ring fits)
  ringR: 130,
  rim: 'rgba(5,8,14,.9)',                     // the thin dark rim, the ships' own (SLOOK.rim)
  rimK: 0.03,                                 // its width, a share of the radius (at least 1 px)
  cresc: { x: 0.55, y: 0.25, r: 1.05 },       // the night side: what lies outside this circle (a share of the radius, from the centre) is the dark tone
  tones: {
    // the mock's five, as it draws them (docs/world-look-mock.html, the W table)
    earth: ['#3f5f86', '#25384f', '#6a86a8'], luna: ['#727a86', '#434a55', '#9aa2ad'], ceres: ['#7f8a97', '#4b535e', '#a9b3bf'], 'alpha-cen-b': ['#7c4c3c', '#472a21', '#a06a55'], kolga: ['#5f7069', '#38433f', '#869790'],
    // the scope report's (section 3): the same family, slate blues, cool greys, one rust brown, one grey green
    mercury: ['#77716d', '#44403d', '#9c958f'], venus: ['#85735f', '#4c4033', '#a99580'], mars: ['#8a5a47', '#50342a', '#b07f68'], eros: ['#625d59', '#37332f', '#857f79'],
    vesta: ['#6c7178', '#40444a', '#8f949b'], pallas: ['#5f6b7b', '#374048', '#8391a3'], phobos: ['#5b5653', '#34302d', '#7e7874'], deimos: ['#686460', '#3b3835', '#8b8680'],
    io: ['#7b7a64', '#46452f', '#a09f87'], europa: ['#8d96a1', '#515962', '#b6bec8'], ganymede: ['#6f6d72', '#3f3e43', '#939197'], callisto: ['#55575e', '#30323a', '#787b84'],
    titan: ['#80745f', '#493f31', '#a59882'], enceladus: ['#9aa3ae', '#596270', '#b9c1cc'],
    jupiter: ['#8a8478', '#4e4a42', '#aea799'], saturn: ['#8c8672', '#504c3f', '#b1ab96'], uranus: ['#617e87', '#384850', '#86a2ab'], neptune: ['#46577d', '#2a3348', '#6b7c9f'],
    ran: ['#687c92', '#3d4958', '#8da1b6'], tyr: ['#7a8697', '#465060', '#9fabbb'],
    proxima: ['#7a6a5c', '#453a30', '#a09080'], 'proxima-d': ['#69707a', '#3d4249', '#8d949e'], 'proxima-w': ['#6e463a', '#3d241d', '#92604f'], 'sun:lava': ['#8a5a46', '#4f2f24', '#b07a62'],
    home: ['#566071', '#2f3643', '#7b879a'],
    'sun:star': ['#ece8dc', '#a9a597', '#ffffff'], star: ['#d9cfbd', '#9d9484', '#f2ecdf']
  },
  kinds: {                                    // for a world with no row of its own (a mod's): the report's middle-of-the-family tones
    rock: ['#6c7178', '#40444a', '#8f949b'], ice: ['#8d96a1', '#515962', '#b6bec8'], gas: ['#8a8478', '#4e4a42', '#aea799'],
    lava: ['#8a5a46', '#4f2f24', '#b07a62'], ringed: ['#8c8672', '#504c3f', '#b1ab96'], star: ['#ece8dc', '#a9a597', '#ffffff']
  },
  shade: 0.06                                 // a default tone is made darker by up to this share, by the seed
};

const campDiscHash = s => { let h = 2166136261; String(s).split('').forEach(ch => { h = Math.imul(h ^ ch.charCodeAt(0), 16777619); }); return h >>> 0; }; // FNV-1a: the same world is the same picture on every start
function campDiscRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const campDiscKind = p => (p && CAMPDISC.kinds[p.kind] ? p.kind : 'rock'); // a kind the table does not know draws as rock (planetTexture did the same)
function campDiscShade(hex, k) { return '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(String(hex).substr(i, 2), 16) * k))).toString(16).padStart(2, '0')).join(''); }
function campDiscTone(p, id) {
  const i = String(id || (p && p.id) || ''), kind = campDiscKind(p), own = CAMPDISC.tones[i + ':' + (p && p.kind)] || CAMPDISC.tones[i];
  if (own) return own.slice();
  const k = 1 - ((((p && p.seed) | 0) * 37) % 13) / 12 * CAMPDISC.shade; // 1 .. 0.94: darker only, so a light patch never creeps toward the white of yours
  return CAMPDISC.kinds[kind].map(h => campDiscShade(h, k));
}

// what is painted, as data: patches { x, y, rx, ry, rot } (lighter ellipses, a share of the radius), bands { y, h } (a gas giant's), a ring { rx, ry, tilt, w } (Saturn's), a crescent (not a star: a star has no night side).
// The recipe is the mock's (direction 1): three ellipses at ((r - .6) R, (r - .5) 1.2 R), the dark side one circle's outside. A star's one patch sits up and left of the middle.
function campDiscShapes(kind, seed, id) {
  const rnd = campDiscRng(campDiscHash(String(id || '') + ':' + (seed | 0) + ':' + kind)), out = { patches: [], bands: [], ring: null, crescent: kind !== 'star' };
  if (kind === 'star') { out.patches.push({ x: -0.25, y: -0.3, rx: 0.45, ry: 0.3, rot: rnd() * 3 }); return out; }
  if (kind === 'gas' || kind === 'ringed') {
    for (let i = 0; i < 3; i++) out.bands.push({ y: -0.55 + i * 0.5 + (rnd() - 0.5) * 0.14, h: 0.08 + rnd() * 0.08 }); // two or three lighter stripes across the disc, a little tilted (below)
    if (kind === 'ringed') out.ring = { rx: 1.85, ry: 0.5, tilt: -0.35, w: 0.1 };
    return out;
  }
  const n = 2 + (rnd() > 0.5 ? 1 : 0); // two or three patches
  for (let i = 0; i < n; i++) out.patches.push({ x: rnd() - 0.6, y: (rnd() - 0.5) * 1.2, rx: 0.18 + rnd() * 0.22, ry: 0.1 + rnd() * 0.12, rot: rnd() * 3 });
  return out;
}

function campDiscPaint(ctx, S, tone, kind, shapes) {
  const R = kind === 'ringed' ? CAMPDISC.ringR : CAMPDISC.R, K = CAMPDISC, base = tone[0], night = tone[1], light = tone[2], sh = shapes;
  const ringHalf = (from, to) => { const g = sh.ring; ctx.save(); ctx.rotate(g.tilt); ctx.lineWidth = Math.max(1, g.w * R); ctx.strokeStyle = light; ctx.beginPath(); ctx.ellipse(0, 0, g.rx * R, g.ry * R, 0, from, to); ctx.stroke(); ctx.restore(); };
  ctx.save(); ctx.translate(S / 2, S / 2);
  if (sh.ring) ringHalf(Math.PI, 2 * Math.PI); // the far half of the ring, behind the disc
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = base; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = light; ctx.globalAlpha = kind === 'star' ? 0.6 : 1;
  sh.patches.forEach(q => { ctx.beginPath(); ctx.ellipse(q.x * R, q.y * R, q.rx * R, q.ry * R, q.rot, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
  if (sh.bands.length) { ctx.save(); ctx.rotate(-0.12); sh.bands.forEach(b => ctx.fillRect(-R * 1.3, b.y * R, R * 2.6, b.h * R)); ctx.restore(); }
  if (sh.crescent) { ctx.fillStyle = night; ctx.beginPath(); ctx.arc(R * K.cresc.x, R * K.cresc.y, R * K.cresc.r, 0, 7); ctx.rect(R * 2, -R * 2, -R * 4, R * 4); ctx.fill('evenodd'); } // the dark side: the disc outside the offset circle
  ctx.restore();
  ctx.lineWidth = Math.max(1, R * K.rimK); ctx.strokeStyle = kind === 'star' ? light : K.rim; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke(); // a thin dark rim; a star's is light
  if (sh.ring) ringHalf(0, Math.PI); // the near half, in front of the disc
  ctx.restore();
}

// the canvas texture of a place and its disc's radius in it (made on the first ask, then the texture manager keeps it: a level has a dozen at most, one MB each)
function campDiscTexture(sc, p, id) {
  const k = campDiscKind(p), nm = String(id || (p && p.id) || 'x'), key = 'cdisc-' + nm + '-' + k + '-' + ((p && p.seed) | 0);
  if (!sc.textures.exists(key)) {
    const S = CAMPDISC.size, tex = sc.textures.createCanvas(key, S, S);
    campDiscPaint(tex.getContext(), S, campDiscTone(p, id), k, campDiscShapes(k, p && p.seed, nm)); tex.refresh();
  }
  return { key, R: k === 'ringed' ? CAMPDISC.ringR : CAMPDISC.R };
}
