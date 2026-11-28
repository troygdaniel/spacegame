// ---------- The new Long Haul: Earth, the Moon and the sky (PROMPT 23, piece 2 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// With the switch on, the flight is drawn in the Campaign's world look, by the Campaign's own painters (nothing of them is copied or changed): the sky is campWorldBackdrop (src/campworldback.js: near black, white stars,
// two faint slate clouds, no tint), the worlds the names file gives a tone (LHNEW.earth.bodies: the Moon, Cruithne, Anchor Rock) are campDiscTexture's flat discs (src/campworlddisc.js) at the size the body has, and the
// Sun is the Campaign's flat star. In the home system Earth itself is one very large flat disc behind everything, in the Campaign's Earth tones: it is a picture, not a place (no body, no gravity, nothing docks there), and
// it slides a little as the ship flies so the system reads as an orbit. The other systems get the sky and nothing else. With the switch off every function here answers null or false and the caller draws what it drew.
//   lhBackdrop(scene, deep)   in place of spaceBackdrop: the Campaign's sky and, in the home system (not in deep space), Earth. true when it drew
//   lhWorld(scene, body)      { key, scale } for a world of the home system that has a tone, or null: the caller's image takes the key and the scale
//   lhStar(scene, star)       { key, scale } for the system's star as a flat disc, or null
//   lhEarthAt(par, home, view) PURE: where Earth's image stands in the world so that, with the ship at the home dock, its middle is at LHEARTH.at of the screen: { x, y }
const LHEARTH = {
  tone: 'earth',                 // the Campaign's three Earth tones (CAMPDISC.tones.earth)
  key: 'lh-earth',               // the texture, made once
  size: 1536, k: 3,              // its canvas, and how many times the Campaign's 512 px disc it is painted at (the disc is then 720 px in radius: a picture this large is not a scaled-up small one)
  r: 900,                        // px: Earth's radius on the screen at zoom 1
  par: 0.02,                     // the share of the camera's move Earth takes: the home system is 108,000 px across, so Earth leaves the screen about 30,000 px from the dock
  at: [0.16, 1.5],               // where its middle is on the 1280 by 720 screen while the ship is at the home dock (shares of the width and the height: low on the left, most of it under the edge)
  depth: -7.5                    // over the three star layers (-10, -9, -8), under every world and ship (0 and up)
};
const lhEarthHome = () => typeof lhNewOn === 'function' && lhNewOn() && typeof G !== 'undefined' && !G.deep && G.system === LHNEW.earth.system;
function lhEarthAt(par, home, view) { // an image with scroll factor `par` is drawn at x - scrollX * par; with the ship at `home` the camera's scroll is home minus half the view
  const w = view && view.w > 0 ? view.w : 1280, h = view && view.h > 0 ? view.h : 720, hx = home ? home.x : 0, hy = home ? home.y : 0;
  return { x: LHEARTH.at[0] * w + (hx - w / 2) * par, y: LHEARTH.at[1] * h + (hy - h / 2) * par };
}
function lhEarthTexture(scene) {
  const K = LHEARTH;
  if (!scene.textures.exists(K.key)) {
    const tex = scene.textures.createCanvas(K.key, K.size, K.size), ctx = tex.getContext(), kind = 'rock';
    ctx.save(); ctx.scale(K.k, K.k); campDiscPaint(ctx, K.size / K.k, campDiscTone({ kind }, K.tone), kind, campDiscShapes(kind, 0, K.tone)); ctx.restore(); tex.refresh();
  }
  return { key: K.key, R: CAMPDISC.R * K.k };
}
function lhBackdrop(scene, deep) {
  if (typeof lhNewOn !== 'function' || !lhNewOn() || typeof campWorldBackdrop !== 'function') return false;
  campWorldBackdrop(scene);
  if (!deep && lhEarthHome() && typeof campDiscPaint === 'function') {
    const home = typeof spaceHomeDock === 'function' ? spaceHomeDock() : null, T = lhEarthTexture(scene), at = lhEarthAt(LHEARTH.par, home, { w: typeof W === 'number' ? W : 1280, h: typeof H === 'number' ? H : 720 });
    scene.lhEarth = scene.add.image(at.x, at.y, T.key).setScrollFactor(LHEARTH.par).setDepth(LHEARTH.depth).setScale(LHEARTH.r / T.R);
  }
  return true;
}
function lhWorld(scene, body) {
  if (!lhEarthHome() || !body || typeof campDiscTexture !== 'function') return null;
  const row = LHNEW.earth.bodies[body.id]; if (!row || !row.tone || !(body.r > 0)) return null;
  const T = campDiscTexture(scene, { kind: row.kind || body.kind || 'rock', seed: body.seed | 0 }, row.tone);
  return { key: T.key, scale: body.r / T.R };
}
function lhStar(scene, star) {
  if (typeof lhNewOn !== 'function' || !lhNewOn() || !star || !(star.r > 0) || typeof campDiscTexture !== 'function') return null;
  const T = campDiscTexture(scene, { kind: 'star', seed: 0 }, 'sun');
  return { key: T.key, scale: star.r / T.R };
}
