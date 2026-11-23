// ---------- The scene half of the protected ships' health bars (card space-game-protected-health; the rule is src/campcharge.js) ----------
// Each ship you protect wears a small bar over it in the flight view: the same size on the screen at every zoom (it is a graphics object of its own, scaled by 1/zoom, so a ship drawn at the minimum size of the far
// view still has a bar to read), green, then amber, then red as the hull goes, white for CAMP.charge.flash ms after a hit. A bar is drawn again only when what it shows changes (its fill, its colour, the flash's step); every
// frame only its place moves. It sits over the ship, never turned with it, its gap measured from the ship's drawn edge. The scene (src/campaignscene.js) calls campChargeSync(scene) after it has put the ships' sprites
// in place. Nothing here decides anything; the objects are kept in scene.hud (a scene that starts again has a new one: the old are destroyed with it).
const campChargeBlend = (a, b, k) => { const m = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (m(16) << 16) | (m(8) << 8) | m(0); }; // a colour moved k of the way to another
function campChargeDraw(g, color, hull, hit) { // the bar in screen px, its top left at (-w / 2, 0): a dark backing, the fill, a white frame while it flashes
  const K = CAMP.charge.bar, w = K.w, h = K.h, fill = campChargeBlend(color, 0xffffff, hit * 0.8);
  g.clear(); g.fillStyle(0x02060d, 0.85).fillRect(-w / 2 - 1, -1, w + 2, h + 2);
  g.fillStyle(0x16293d, 1).fillRect(-w / 2, 0, w, h);
  g.fillStyle(fill, 1).fillRect(-w / 2, 0, Math.max(1, Math.round(w * hull)), h);
  if (hit > 0) g.lineStyle(1, 0xffffff, 0.4 + 0.6 * hit).strokeRect(-w / 2 - 1, -1, w + 2, h + 2);
}
function campChargeSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, K = CAMP.charge; if (!C || !scene.hud || !cam || typeof campChargeBars !== 'function') return;
  const V = scene.hud.charge || (scene.hud.charge = {}), z = cam.zoom > 0 ? cam.zoom : 1, seen = {};
  campChargeBars(C).forEach(b => {
    let o = V[b.id]; if (!o) o = V[b.id] = { g: scene.add.graphics().setDepth(K.depth), key: '' };
    const sp = scene.sp && scene.sp[b.id], half = Math.max(K.bar.min, sp && sp.displayWidth ? Math.max(sp.displayWidth, sp.displayHeight) * z / 2 : 0); // px on the screen: the ship's half size, the least being what the far view draws
    const key = b.band + ':' + Math.round(b.hull * K.bar.w) + ':' + Math.round(b.hit * 5); // what the bar shows: drawn again only when this changes
    if (o.key !== key) { o.key = key; campChargeDraw(o.g, b.color, b.hull, Math.round(b.hit * 5) / 5); }
    o.g.setPosition(b.x, b.y - (half + K.bar.gap + K.bar.h) / z).setScale(1 / z).setVisible(!scene.mp); seen[b.id] = true; // the map is over the view: no bars under it
  });
  Object.keys(V).forEach(id => { if (!seen[id]) { V[id].g.destroy(); delete V[id]; } }); // a ship that is lost or arrived has no bar
}
