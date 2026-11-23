// ---------- The scene half of the protected ships' health bars (cards space-game-protected-health and space-game-health-bar-quiet; the rule is src/campcharge.js) ----------
// Each ship you protect wears a bar over it in the flight view, the same size on the screen at every zoom (it is a graphics object of its own, scaled by 1/zoom, so a ship drawn at the minimum size of the far view still has
// one you can read). QUIET: normally a THIN LINE, full length at full hull and shortened, green, amber or red, as the hull goes, with no number; while the ship is under attack (for CAMP.charge.loud ms after the last hit) the FULL
// bar with its percentage, easing back to the line over CAMP.charge.ease ms; white for CAMP.charge.flash ms after a hit. The bar's bottom edge is where the line is, so it grows upward from the line. A bar is drawn again only when
// what it shows changes (its fill, its colour, the size's eighth, the flash's step), and its number only when the words or the colour change (campLabel, src/camptextguard.js); every frame only its place moves. The scene
// (src/campaignscene.js) calls campChargeSync(scene) after it has put the ships' sprites in place. Nothing here decides anything; the objects are kept in scene.hud (a scene that starts again has a new one: the old are destroyed with it).
const campChargeBlend = (a, b, k) => { const m = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (m(16) << 16) | (m(8) << 8) | m(0); }; // a colour moved k of the way to another
const campChargeCss = c => '#' + (c & 0xffffff).toString(16).padStart(6, '0');
function campChargeDraw(g, color, hull, hit, k) { // the bar in screen px, its bottom edge at y 0 and its middle at x 0: the faint track, the fill, and for the full bar a dark frame and a white edge while it flashes
  const K = CAMP.charge, w = K.bar.w, h = campChargeLook(k, K.line.h, K.bar.h), fill = campChargeBlend(color, 0xffffff, hit * 0.8);
  g.clear();
  if (k > 0) g.fillStyle(0x02060d, K.bar.back * k).fillRect(-w / 2 - 1, -h - 1, w + 2, h + 2);
  g.fillStyle(0x16293d, campChargeLook(k, K.line.back, 1)).fillRect(-w / 2, -h, w, h);
  g.fillStyle(fill, 1).fillRect(-w / 2, -h, Math.max(1, Math.round(w * hull)), h);
  if (hit > 0 && k > 0) g.lineStyle(1, 0xffffff, 0.4 + 0.6 * hit).strokeRect(-w / 2 - 1, -h - 1, w + 2, h + 2);
}
function campChargeSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, K = CAMP.charge; if (!C || !scene.hud || !cam || typeof campChargeBars !== 'function') return;
  const V = scene.hud.charge || (scene.hud.charge = {}), z = cam.zoom > 0 ? cam.zoom : 1, seen = {};
  campChargeBars(C).forEach(b => {
    let o = V[b.id]; if (!o) o = V[b.id] = { g: scene.add.graphics().setDepth(K.depth), t: null, key: '' }; // (the number's text is made the first time the bar is full: a ship nobody hits never has one)
    const sp = scene.sp && scene.sp[b.id], half = Math.max(K.bar.min, sp && sp.displayWidth ? Math.max(sp.displayWidth, sp.displayHeight) * z / 2 : 0); // px on the screen: the ship's half size, the least being what the far view draws
    const k = Math.round(b.loud * 8) / 8, key = b.band + ':' + Math.round(b.hull * K.bar.w) + ':' + k * 8 + ':' + Math.round(b.hit * 5); // what the bar shows: drawn again only when this changes
    if (o.key !== key) { o.key = key; campChargeDraw(o.g, b.color, b.hull, Math.round(b.hit * 5) / 5, k); }
    const vis = !scene.mp, at = b.y - (half + K.bar.gap) / z; // the map is over the view: no bars under it
    o.g.setPosition(b.x, at).setScale(1 / z).setVisible(vis);
    if (k > 0 && !o.t) o.t = scene.add.text(0, 0, '', uiFont(K.number.font, '#ffffff', { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0, 0.5).setDepth(K.depth);
    if (o.t) {
      if (typeof campLabel === 'function') campLabel(o.t, b.pct + '%', campChargeCss(b.color)); else { o.t.setText(b.pct + '%'); o.t.setColor(campChargeCss(b.color)); } // the percentage: only the full bar has it
      o.t.setPosition(b.x + (K.bar.w / 2 + K.number.gap) / z, at - campChargeLook(k, K.line.h, K.bar.h) / 2 / z).setScale(1 / z).setAlpha(k).setVisible(vis && k > 0);
    }
    seen[b.id] = true;
  });
  Object.keys(V).forEach(id => { if (!seen[id]) { V[id].g.destroy(); if (V[id].t) V[id].t.destroy(); delete V[id]; } }); // a ship that is lost or arrived has no bar
}
