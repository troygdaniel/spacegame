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
const lhLookOn = () => typeof lhNewOn === 'function' && lhNewOn() && typeof SLOOK === 'object';
function lhLookSpan(kind) { const k = SLOOK.K[kind]; let m = 0; (k ? k.p : []).forEach(q => { m = Math.max(m, Math.abs(q[1])); }); return 2 * m; } // the hull's width as a share of its length
function lhLookSpec(key, w, h) {
  if (!lhLookOn()) return null;
  const row = LHLOOK.map[key]; if (!row || !(w > 0) || !(h > 0) || !SLOOK.K[row[0]]) return null;
  const px = typeof SHIPS === 'object' && SHIPS.pad && SHIPS.pad[key] ? SHIPS.pad[key][0] : LHLOOK.pad, span = lhLookSpan(row[0]);
  const L = Math.max(8, Math.floor(Math.min(w - 2 * px, span > 0 ? (h - 2 * LHLOOK.edge) / span : w)));
  return { kind: row[0], side: row[1], L, tex: 'lh-' + key + '-' + (w | 0) + 'x' + (h | 0) };
}
function lhLookSize(scene, key) { // the px of Long Haul's own picture of a key: [w, h], or null when there is none
  try { const t = scene.textures.exists(key) ? scene.textures.get(key) : null, im = t && t.getSourceImage ? t.getSourceImage() : null; return im && im.width > 0 && im.height > 0 ? [im.width, im.height] : null; } catch (e) { return null; }
}
function lhLookTexture(scene, key) {
  if (!lhLookOn() || !scene || !scene.textures || !scene.make || typeof slookPaint !== 'function') return '';
  const sz = lhLookSize(scene, key), S = sz ? lhLookSpec(key, sz[0], sz[1]) : null; if (!S) return '';
  if (!scene.textures.exists(S.tex)) { const g = scene.make.graphics({ x: 0, y: 0, add: false }); slookPaint(g, S.kind, S.side, S.L, sz[0] / 2, sz[1] / 2); g.generateTexture(S.tex, sz[0], sz[1]); g.destroy(); }
  return S.tex;
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
