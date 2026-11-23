// ---------- Campaign: the gauges are drawn 20 times a second, not 60 (card perf-fights; Troy: "the big fights feel slow") ----------
// The three dials and their bars (src/camphud.js campGaugesPaint) are about 4,600 drawing commands: glass, three halo rings a dial, ticks, segments, bars. They went into the HUD's Graphics every frame, and Phaser
// builds a Graphics' arcs, circles and lines into triangles again at EVERY render, changed or not: 92 percent of the HUD's commands and most of the 2 MB a frame the scene allocated in a fight (docs/PERF-FIGHTS.md).
// So the gauges get a Graphics of their own that is not on the screen, and a small texture that is: every CAMPGAUGECACHE.every ms the dials are painted into the hidden Graphics and that is drawn ONCE into the
// texture; between two paints a frame draws one picture. Nothing about how a gauge looks or what it says is decided here: campGaugesPaint is called as it was, only less often.
// A change that must be seen at once (the highlighted dial of the power list, a pip that moved) repaints at once. A scene that cannot make a texture (a stand-in scene in a test) paints straight into the HUD's
// Graphics as before.
//   campGaugesPaint(g, T, C, A, now, hi)            the scene's call, unchanged: this file puts itself in its place (the scene is the Graphics' own: g.scene) and keeps the painter as campGaugesPaintDirect
//   campGaugesPaintCached(s, g, T, C, A, now, hi)   the cache: g is the HUD's own Graphics (used only when there is no texture)
//   campGaugeCacheBox()                             the part of the screen the texture covers: { x, y, w, h } (the three cells, their halos, and down to where the power list opens)
const CAMPGAUGECACHE = { every: 50, pad: 16, depth: 100 }; // ms between two paints of the dials (20 a second: the needle and the bars still move smoothly); px of room round the cells for the halos; the HUD Graphics' own depth
function campGaugeCacheBox() {
  const Z = campHudGeom(), B = Z.block, P = CAMPGAUGECACHE.pad, Wd = typeof W === 'number' ? W : 1280, low = typeof CAMPPANELS_LOOK === 'object' && CAMPPANELS_LOOK.topRight ? CAMPPANELS_LOOK.topRight : 104; // (the line from the highlighted dial runs down to where the list opens)
  const x = Math.max(0, Math.floor(B.x0 - P)), y = Math.max(0, Math.floor(B.y0 - P - 12)), x1 = Math.min(Wd, Math.ceil(B.x1 + P)), y1 = Math.ceil(Math.max(B.y1, low) + P); // (the balance word under the last bar went with the semicolon key: card space-game-keys-select)
  return { x, y, w: x1 - x, h: y1 - y };
}
function campGaugesPaintCached(s, g, T, C, A, now, hi) {
  const can = !!(s && s.hud && s.make && typeof s.make.graphics === 'function' && s.add && typeof s.add.renderTexture === 'function');
  if (!can) { campGaugesPaintDirect(g, T, C, A, now, hi); return false; }
  let Z = s.hud.gz; // kept in s.hud: a scene that starts again has a new hud, and the old texture went with the old scene
  if (!Z) {
    const box = campGaugeCacheBox();
    Z = s.hud.gz = { box, g: s.make.graphics({ x: 0, y: 0, add: false }), at: -1e9, key: '' };
    s.hud.gaugeRT = s.add.renderTexture(box.x, box.y, box.w, box.h).setOrigin(0, 0).setScrollFactor(0).setDepth(CAMPGAUGECACHE.depth); // in s.hud, so hudShow hides it behind a result card with the rest of the HUD
  }
  const key = hi + ':' + C.power.p.join() + ':' + (C.t < C.power.until ? 1 : 0); // what must be seen at once: the highlighted dial, the pips, the emergency
  if (now - Z.at < CAMPGAUGECACHE.every && key === Z.key) return false;
  Z.at = now; Z.key = key;
  Z.g.clear(); campGaugesPaintDirect(Z.g, T, C, A, now, hi);
  const rt = s.hud.gaugeRT; rt.clear(); rt.draw(Z.g, -Z.box.x, -Z.box.y);
  return true;
}
// the painter of src/camphud.js is kept under another name and the cache answers to its name, so the scene's line is the one it always was
const campGaugesPaintDirect = campGaugesPaint;
campGaugesPaint = function (g, T, C, A, now, hi) { return campGaugesPaintCached(g && g.scene, g, T, C, A, now, hi); }; // eslint-disable-line no-func-assign
