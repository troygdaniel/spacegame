// ---------- The new Long Haul: the ships in the Campaign's flat-cut look (PROMPT 23, piece 3 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// With the switch on, every ship in flight is drawn with the Campaign's own painter (src/shiplookdraw.js slookPaint: one outline in its side's colour, a darker facet, a thin dark rim) from the Campaign's own table
// (src/shiplook.js SLOOK.K, SLOOK.C). Nothing of either is copied or changed. Long Haul's ships keep everything they are: the sprite, its physics circle, its speed, its hit points. Only the PICTURE changes, and the
// picture is baked into a canvas of the SAME size as the one it replaces, with the hull's middle at the canvas's middle, so the hit circle (set in the old picture's own px: src/space.js, src/enemies.js) is where it was.
// Long Haul's own textures ('ship', 'raider' ...) are never written over: the Campaign's old look and the station's hangar draw them too. The flat ones have keys of their own (lh-<key>-<w>x<h>), and a ship in flight is
// given its flat picture by the one place that already visits every ship each frame, shipsOne (src/ships.js), which also asks here for the flame's colour and where the nozzle is on the flat hull.
// The sides: yours pale blue, the pirates pink (the raider as the skiff, the drone as the cutter, the gunship as the brute, the Reaver as the pirate leader), the freighter of an escort call amber (a ship you protect),
// the police and the traffic grey-blue (neutral). Amber is only ever a ship you protect; no hostile is amber or red.
//   LHLOOK.map               Long Haul's texture key to [the Campaign's kind, its side]
//   lhLookSpec(key, w, h)    PURE: { kind, side, L (the hull's length in px), tex (the flat picture's key) } for a picture of w by h px, or null (the switch is off, or the key is not a ship's)
//   lhLookTexture(scene, key)  the flat picture's key for Long Haul's texture `key`, made on first use; '' when there is none
//   lhLookOne(scene, o, key) a ship's sprite this frame: it takes the flat picture if it still shows Long Haul's (a traffic ship's own tint is taken off: every neutral is the one grey-blue)
//   lhLookFlame(key, color)  the colour of its flame and ribbon: the side's engine glow while the switch is on, else `color`
//   lhLookNozzles(key, o)    its nozzles on the flat hull ([[along, across, size]]: one at the tail), or null for Long Haul's own
const LHLOOK = {
  map: { ship: ['fighter', 'friend'], police: ['patrol', 'neutral'], raider: ['skiff', 'foe'], drone: ['cutter', 'foe'], gunship: ['brute', 'foe'], reaver: ['pirateleader', 'foe'], freighter: ['freighter', 'protect'], civilian: ['freighter', 'neutral'] },
  flame: { friend: 0x6fd6ff, protect: 0xffc857, foe: 0xff6fa8, neutral: 0x9fb3c8 }, // the engine glow of a side (the Campaign's trail tones: SLOOK.C.friendHi, protect, foe, neutral)
  pad: 6,                // px of margin at the nose and the tail where SHIPS.pad has no row for the key
  edge: 2,               // px of margin above and below the hull at least
  nozzle: 0.46           // the nozzle is this share of the hull's length behind its middle (the flat hulls' tails are at 0.5; the notch of a fighter's is at 0.42)
};
// THE SIX HULLS (card space-game-lh-hull-shapes; BRIEF 16 ask 3, ORCH for Troy, 28 Nov 2026): the ship you fly is Long Haul's 'ship' texture, which shipRefresh (src/ships.js) draws as the ACTIVE hull (src/shipmodels.js: the Wren, Kite, Ox, Talon,
// Pathfinder, Bastion) at the tiers you own; with the switch on it used to be the Campaign's one fighter for every hull. Now each hull has an outline of its own in the same flat-cut style (units of the hull's length, nose at +x, the same as SLOOK.K):
//   p      the outline (half of it is mirrored by hand: the point list goes round the whole hull)        d      the darker facet
//   plate  the plating you bought (the shields part, shipTiers().plating): a = tier 1 (a plate on each side), b = tier 2 (a second one), s = tier 3 (a bright seam: x1, y1, x2, y2); each polygon is the +y side, mirrored for the other
//   gun    the barrels you bought (the weapons part, .guns): a = tier 1 and b = tier 2 ([y, length] a pair, +y mirrored: it starts a little inside the hull where its outline is at that y and points forward, to at most the nose), l = tier 3, a glowing lance on the nose (the x it starts at, at y 0)
// Every hull sits inside its canvas (the old picture's size), at most 0.5 long each way from the middle and its width inside the canvas with a margin (lhLookSpec works the length out from the widest point).
const LHHULLS = {
  wren: { p: [[.5, 0], [.2, .14], [.04, .42], [-.16, .42], [-.12, .16], [-.3, .12], [-.5, .18], [-.5, -.18], [-.3, -.12], [-.12, -.16], [-.16, -.42], [.04, -.42], [.2, -.14]], d: [[.28, 0], [.02, .12], [-.2, 0], [.02, -.12]],
    plate: { a: [[.12, .2], [.04, .38], [-.06, .38], [-.04, .2]], b: [[-.1, .14], [-.28, .13], [-.3, .17], [-.12, .2]], s: [.02, .4, -.14, .2] }, gun: { a: [.38, .16], b: [.3, .12], l: .38 } },
  kite: { p: [[.5, 0], [.1, .1], [-.1, .35], [-.26, .35], [-.2, .1], [-.5, .12], [-.5, -.12], [-.2, -.1], [-.26, -.35], [-.1, -.35], [.1, -.1]], d: [[.3, 0], [0, .08], [-.2, 0], [0, -.08]],
    plate: { a: [[.04, .16], [-.1, .32], [-.18, .32], [-.12, .14]], b: [[-.16, .1], [-.36, .1], [-.38, .14], [-.2, .14]], s: [-.2, .3, .06, .14] }, gun: { a: [.33, .17], b: [.26, .13], l: .38 } },
  ox: { p: [[.5, .06], [.4, .14], [.3, .16], [.3, .3], [-.22, .3], [-.22, .22], [-.5, .24], [-.5, -.24], [-.22, -.22], [-.22, -.3], [.3, -.3], [.3, -.16], [.4, -.14], [.5, -.06]], d: [[.46, 0], [.3, .1], [-.4, .1], [-.46, 0], [-.4, -.1], [.3, -.1]],
    plate: { a: [[.26, .18], [.26, .29], [0, .29], [0, .18]], b: [[-.04, .18], [-.04, .29], [-.2, .29], [-.2, .18]], s: [.3, .23, -.22, .23] }, gun: { a: [.06, .16], b: [.11, .12], l: .38 } },
  talon: { p: [[.5, 0], [.24, .1], [.2, .43], [-.02, .43], [-.06, .18], [-.34, .16], [-.5, .22], [-.5, -.22], [-.34, -.16], [-.06, -.18], [-.02, -.43], [.2, -.43], [.24, -.1]], d: [[.3, 0], [.04, .1], [-.2, 0], [.04, -.1]],
    plate: { a: [[.1, .2], [.18, .4], [.02, .4], [-.02, .2]], b: [[-.12, .12], [-.3, .12], [-.34, .16], [-.14, .17]], s: [.18, .42, -.02, .2] }, gun: { a: [.4, .15], b: [.33, .12], l: .38 } },
  pathfinder: { p: [[.5, .03], [.34, .08], [.18, .14], [.1, .38], [-.06, .44], [-.2, .3], [-.5, .2], [-.5, -.2], [-.2, -.3], [-.06, -.44], [.1, -.38], [.18, -.14], [.34, -.08], [.5, -.03]], d: [[.4, 0], [.12, .1], [-.2, .08], [-.34, 0], [-.2, -.08], [.12, -.1]],
    plate: { a: [[.1, .3], [.02, .42], [-.06, .42], [-.04, .24]], b: [[-.2, .2], [-.4, .18], [-.44, .2], [-.22, .28]], s: [.08, .36, -.14, .28] }, gun: { a: [.36, .14], b: [.3, .1], l: .38 } },
  bastion: { p: [[.5, .08], [.34, .16], [.28, .34], [.06, .4], [-.18, .4], [-.3, .3], [-.5, .26], [-.5, -.26], [-.3, -.3], [-.18, -.4], [.06, -.4], [.28, -.34], [.34, -.16], [.5, -.08]], d: [[.34, 0], [.1, .14], [-.3, .14], [-.4, 0], [-.3, -.14], [.1, -.14]],
    plate: { a: [[.24, .2], [.26, .34], [.08, .38], [.02, .2]], b: [[-.02, .2], [-.02, .38], [-.2, .38], [-.26, .3], [-.2, .2]], s: [.26, .34, -.2, .38] }, gun: { a: [.34, .2], b: [.28, .16], l: .38 } }
};
LHLOOK.hulls = LHHULLS;
LHLOOK.plate = { a: 0x8fa6bf, b: 0xa9bfd4, seam: 0xffffff, seamA: 0.85 };   // the plating's tones (steel, a lighter steel, a bright seam)
LHLOOK.barrel = { body: 0x4d5d70, tip: 0x6fd6ff };                          // the barrels' dark steel and the glow at the muzzle (SLOOK.C.friendHi)
const lhLookOn = () => typeof lhNewOn === 'function' && lhNewOn() && typeof SLOOK === 'object';
function lhLookSpan(kind) { const k = SLOOK.K[kind]; let m = 0; (k ? k.p : []).forEach(q => { m = Math.max(m, Math.abs(q[1])); }); return 2 * m; } // the hull's width as a share of its length
function lhLookHullId(key) { // the hull of the ship you fly (Long Haul's 'ship' texture is the ACTIVE hull, src/shipmodels.js shipActiveModel), when it has an outline of its own here; else ''
  if (key !== 'ship' || typeof shipActiveModel !== 'function') return '';
  try { const id = shipActiveModel(); return LHLOOK.hulls[id] ? id : ''; } catch (e) { return ''; }
}
function lhLookTiers() { try { const t = typeof shipTiers === 'function' ? shipTiers() : null; return { plating: Math.max(0, Math.min(3, (t && t.plating) | 0)), guns: Math.max(0, Math.min(3, (t && t.guns) | 0)) }; } catch (e) { return { plating: 0, guns: 0 }; } } // the plating and the barrels you own, 0 to 3 each
const lhLookHullSpan = hull => { let m = 0; hull.p.forEach(q => { m = Math.max(m, Math.abs(q[1])); }); return 2 * m; };
function lhLookSpec(key, w, h) {
  if (!lhLookOn()) return null;
  const row = LHLOOK.map[key]; if (!row || !(w > 0) || !(h > 0) || !SLOOK.K[row[0]]) return null;
  const hid = lhLookHullId(key), hull = hid ? LHLOOK.hulls[hid] : null, tiers = hull ? lhLookTiers() : null;
  const px = typeof SHIPS === 'object' && SHIPS.pad && SHIPS.pad[key] ? SHIPS.pad[key][0] : LHLOOK.pad, span = hull ? lhLookHullSpan(hull) : lhLookSpan(row[0]);
  const L = Math.max(8, Math.floor(Math.min(w - 2 * px, span > 0 ? (h - 2 * LHLOOK.edge) / span : w)));
  return { kind: row[0], side: row[1], L, hull: hid, tiers, tex: 'lh-' + key + (hull ? '-' + hid + '-' + tiers.plating + tiers.guns : '') + '-' + (w | 0) + 'x' + (h | 0) }; // (a hull's key carries the hull and the tiers: a new part is a new picture)
}
function lhLookSize(scene, key) { // the px of Long Haul's own picture of a key: [w, h], or null when there is none
  try { const t = scene.textures.exists(key) ? scene.textures.get(key) : null, im = t && t.getSourceImage ? t.getSourceImage() : null; return im && im.width > 0 && im.height > 0 ? [im.width, im.height] : null; } catch (e) { return null; }
}
function lhLookTexture(scene, key) {
  if (!lhLookOn() || !scene || !scene.textures || !scene.make || typeof slookPaint !== 'function') return '';
  const sz = lhLookSize(scene, key), S = sz ? lhLookSpec(key, sz[0], sz[1]) : null; if (!S) return '';
  if (!scene.textures.exists(S.tex)) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    if (S.hull) lhLookPaintHull(g, S, sz[0] / 2, sz[1] / 2); else slookPaint(g, S.kind, S.side, S.L, sz[0] / 2, sz[1] / 2);
    g.generateTexture(S.tex, sz[0], sz[1]); g.destroy();
  }
  return S.tex;
}
function lhLookEdgeX(pts, y) { let best = null; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (a[1] !== b[1] && (a[1] - y) * (b[1] - y) <= 0) { const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); if (best === null || x > best) best = x; } } return best; } // the furthest forward x of an outline at height y (null where it is not that wide)
const lhLookFlat = (pts, L, mirror) => { const out = []; (mirror ? pts.map(q => [q[0], -q[1]]).reverse() : pts).forEach(q => { out.push(q[0] * L, q[1] * L); }); return out; }; // [[x, y]] in units of the length as a flat list of px, the +y side or its mirror
function lhLookPaintHull(g, S, ox, oy) { // the hull's flat-cut picture by the Campaign's painter (its outline is put in SLOOK.K for the bake only, then taken out again), then the plating and the barrels the player owns
  const hull = LHLOOK.hulls[S.hull], key = 'lhhull-' + S.hull, L = S.L, T = S.tiers || { plating: 0, guns: 0 };
  SLOOK.K[key] = { name: S.hull, side: 'friend', px: L, p: hull.p, d: hull.d, g: 'chev' };
  try { slookPaint(g, key, S.side, L, ox, oy); } finally { delete SLOOK.K[key]; }
  const fill = (pts, color, alpha) => { slookPath(g, pts, ox, oy); g.fillStyle(color, alpha); g.fillPath(); }, both = (pts, color, alpha) => { fill(lhLookFlat(pts, L, false), color, alpha); fill(lhLookFlat(pts, L, true), color, alpha); };
  const P = LHLOOK.plate, B = LHLOOK.barrel, th = Math.max(1.4, L * 0.05);
  if (T.plating >= 1) both(hull.plate.a, P.a, 1);
  if (T.plating >= 2) both(hull.plate.b, P.b, 1);
  if (T.plating >= 3) { const [x1, y1, x2, y2] = hull.plate.s; g.lineStyle(Math.max(1, L * 0.035), P.seam, P.seamA); g.lineBetween(ox + x1 * L, oy + y1 * L, ox + x2 * L, oy + y2 * L); g.lineBetween(ox + x1 * L, oy - y1 * L, ox + x2 * L, oy - y2 * L); }
  const barrel = (y, len) => { const e = lhLookEdgeX(hull.p, y), x0 = (e == null ? 0 : e) - 0.03, x1 = Math.min(0.5, x0 + len); [1, -1].forEach(sg => { const cy = sg * y * L; fill([x0 * L, cy - th / 2, x1 * L, cy - th / 2, x1 * L, cy + th / 2, x0 * L, cy + th / 2], B.body, 1); g.fillStyle(B.tip, 1); g.fillCircle(ox + x1 * L, oy + cy, th * 0.7); }); }; // a pair, one on each side, on the hull's leading edge at that y: dark steel with a glow at the muzzle
  if (T.guns >= 1) barrel(hull.gun.a[0], hull.gun.a[1]);
  if (T.guns >= 2) barrel(hull.gun.b[0], hull.gun.b[1]);
  if (T.guns >= 3) { const x = hull.gun.l; fill([x * L, -th * 0.4, 0.5 * L, -th * 0.4, 0.5 * L, th * 0.4, x * L, th * 0.4], 0xffffff, 0.9); g.fillStyle(B.tip, 1); g.fillCircle(ox + 0.5 * L, oy, th * 0.9); }
}
function lhLookOne(scene, o, key) {
  if (!lhLookOn() || !o || !o.texture || o.texture.key !== key || typeof o.setTexture !== 'function') return false;
  const tex = lhLookTexture(scene, key); if (!tex) return false;
  o.setTexture(tex); o.lhL = lhLookSpec(key, o.width, o.height).L;
  if (o.civ && typeof o.clearTint === 'function') o.clearTint();
  return true;
}
function lhLookFlame(key, color) { const row = lhLookOn() ? LHLOOK.map[key] : null; return row ? LHLOOK.flame[row[1]] : color; }
function lhLookNozzles(key, o) {
  if (!lhLookOn() || !LHLOOK.map[key] || !o || !(o.lhL > 0)) return null;
  const own = typeof SHIPS === 'object' && SHIPS.nozzles[key] ? SHIPS.nozzles[key] : null, size = own && own.length ? Math.max.apply(null, own.map(n => n[2])) : 1;
  return [[-o.lhL * LHLOOK.nozzle, 0, size]];
}
