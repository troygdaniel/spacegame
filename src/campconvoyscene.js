// ---------- The scene half of the convoy orders (card space-game-convoy-orders; the rules are src/campconvoy.js) ----------
// While any escorted ship is tucked in, the cruiser's shield bubble is drawn (a soft ring of CAMP.convoyOrders.bubble px, with a faint fill) and a thin link runs from the cruiser to each tucked ship; a ship that is
// outside the bubble has a broken link (dashes). When a hit on a tucked ship goes to the cruiser's shield instead, a bright line flashes from the ship to the cruiser. A new order is a short blip.
// The scene (src/campaignscene.js) calls campConvoySync(scene) every frame and campConvoyEvent(scene, e) for the events of type 'convoy'. Nothing here decides anything; the graphics are kept in scene.hud (a scene that starts again has a new hud).
const CAMP_CVLOOK = {
  color: 0x7fe9ff, ring: { width: 2, alpha: 0.3, fill: 0.05, swell: 0.025, ms: 1400 }, // the bubble: its line and fill, how much it swells with the pulse (a share) and the ms of a pulse
  link: { width: 1.5, alpha: 0.3, dash: [10, 8] },                                    // the link to a tucked ship (dashes when the ship is outside the bubble)
  cover: { ms: 260, color: 0xe8fbff, width: 3 },                                      // the flash of a hit taken for a tucked ship
  blip: { hz: [520, 0.06, 'triangle', 0.04, 140] }                                    // an order given: the blip's sound, as the scene's other order blips
};
function campConvoySync(scene) {
  const C = scene.camp, K = CAMP_CVLOOK; if (!C || !scene.hud || !C.carrier) return;
  if (!scene.hud.cv) scene.hud.cv = { g: scene.add.graphics().setDepth(4.4), covers: [] }; // kept in scene.hud: its graphics are destroyed with a scene that ends
  const V = scene.hud.cv, g = V.g, c = C.carrier, now = C.t; g.clear();
  const tucked = typeof campConvoyShips === 'function' ? campConvoyShips(C).filter(u => u.cord === 'tuck') : [];
  V.covers = V.covers.filter(h => now - h.at < K.cover.ms);
  if (!tucked.length || c.hp <= 0) return;
  const B = CAMP.convoyOrders.bubble, pulse = Math.sin(now / K.ring.ms * Math.PI * 2);
  g.fillStyle(K.color, K.ring.fill).fillCircle(c.x, c.y, B); g.lineStyle(K.ring.width, K.color, K.ring.alpha * (0.75 + 0.25 * pulse)).strokeCircle(c.x, c.y, B * (1 + K.ring.swell * pulse));
  tucked.forEach(u => {
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= B) g.lineStyle(K.link.width, K.color, K.link.alpha).lineBetween(c.x, c.y, u.x, u.y);
    else { const n = Math.min(60, Math.floor(d / (K.link.dash[0] + K.link.dash[1]))); for (let i = 0; i < n; i++) { const a = i * (K.link.dash[0] + K.link.dash[1]) / d, b = Math.min(1, a + K.link.dash[0] / d); g.lineStyle(K.link.width, K.color, K.link.alpha * 0.8).lineBetween(c.x + (u.x - c.x) * a, c.y + (u.y - c.y) * a, c.x + (u.x - c.x) * b, c.y + (u.y - c.y) * b); } } // outside: dashes, so the player sees it is not covered
  });
  V.covers.forEach(h => { const k = 1 - (now - h.at) / K.cover.ms; g.lineStyle(K.cover.width, K.cover.color, 0.9 * k).lineBetween(h.x, h.y, c.x, c.y); }); // the hit that went to the cruiser
}
function campConvoyEvent(scene, e) {
  if (!scene.hud || !scene.camp) return;
  if (e.stage === 'cover') { if (!scene.hud.cv) return; scene.hud.cv.covers.push({ x: e.x, y: e.y, at: scene.camp.t }); if (scene.hud.cv.covers.length > 12) scene.hud.cv.covers.shift(); }
  else if (e.stage === 'order' && typeof beep === 'function') beep.apply(null, CAMP_CVLOOK.blip.hz);
}
