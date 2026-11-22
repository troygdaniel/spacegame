// ---------- The scene half of seeing hostiles from afar (card space-game-see-hostiles-earlier; the rules are src/campsight.js) ----------
// Two things are drawn on the screen, over the HUD's plates and under its lines: an ARROW at the edge of the screen for each group of hostiles that is off the screen (a red triangle pointing at it, with
// how many, what and how far: "6 hostiles  410 km", "4 Skiffs, 2 Cutters  410 km" when a scout, an escort or the carrier is near enough to tell; it blinks for the CAMP.sensor.mark ms after the group was first seen), and a PULSE on the radar's blip of a group that was just seen (a ring that opens and fades).
// The scene (src/campaignscene.js) calls campSightSync(scene) every frame. Nothing here decides anything; the graphics and the texts are kept in scene.hud (a scene that starts again has a new one: the
// objects of the old scene are destroyed with it). The goal's own arrow (src/campnav.js) is amber; these are red like the hostiles' dots.
const CAMP_SIGHT = {
  color: 0xff4d6d, text: '#ff9aae', font: 12,                 // the arrow and the pulse (the hostiles' colour on the map and the radar), and the label
  tri: 11, depth: 62, gap: 12,                                // the triangle's size, the depth (over the far marks, 60), and the clear space between the arrow and the near edge of its label (px)
  pulse: [4, 14], width: 1.5                                  // the pulse's ring: the radius it starts at and the radius it grows to, and its line (px)
};
function campSightSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, K = CAMP_SIGHT; if (!C || !scene.hud || !cam || typeof campSightArrows !== 'function') return;
  if (!scene.hud.sight) scene.hud.sight = { g: scene.add.graphics().setScrollFactor(0).setDepth(K.depth), t: [] }; // kept in scene.hud: its objects are destroyed with a scene that ends
  const V = scene.hud.sight, g = V.g, z = cam.zoom > 0 ? cam.zoom : 1; g.clear();
  const on = scene.mode === 'play' && !scene.mp && !(typeof scene.hudHides === 'function' && scene.hudHides());
  const arrows = on ? campSightArrows(C, { x: cam.scrollX, y: cam.scrollY }, W, H, z) : [], marks = on ? campSightMarks(C) : [];
  let n = 0;
  arrows.forEach(a => {
    const blink = a.fresh && Math.floor(C.t / 250) % 2 === 1; // a group just seen: the arrow blinks
    const al = blink ? 0.35 : 0.95, ca = Math.cos(a.angle), sa = Math.sin(a.angle);
    const tri = [{ x: a.x + ca * K.tri, y: a.y + sa * K.tri }, { x: a.x + Math.cos(a.angle + 2.5) * K.tri * 0.8, y: a.y + Math.sin(a.angle + 2.5) * K.tri * 0.8 }, { x: a.x + Math.cos(a.angle - 2.5) * K.tri * 0.8, y: a.y + Math.sin(a.angle - 2.5) * K.tri * 0.8 }];
    g.fillStyle(K.color, al).fillPoints(tri, true); g.lineStyle(1, 0x02060d, 1).strokePoints(tri, true);
    let t = V.t[n]; if (!t) { t = V.t[n] = scene.add.text(0, 0, '', uiFont(K.font, K.text, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0.5).setScrollFactor(0).setDepth(K.depth + 1); }
    const s = uiText('camp.sight.arrow', { what: a.what, km: campNavKm(a.dist) });
    if (t.text !== s) t.setText(s);
    const w = t.width || 120, h = t.height || 16, back = K.tri * 0.8 + K.gap + Math.abs(ca) * w / 2 + Math.abs(sa) * h / 2; // the label's middle: back from the arrow by its own half-size along the arrow, so its near edge clears the triangle's tail
    const keep = typeof scene.arrowKeep === 'function' ? scene.arrowKeep() : CAMP.nav.arrow.keep, lp = typeof campNavLabelAt === 'function' ? campNavLabelAt(a.x - ca * back, a.y - sa * back, w, h, keep, W, H) : { x: Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, a.x - ca * back)), y: Math.max(h / 2 + 6, Math.min(H - h / 2 - 40, a.y - sa * back)) }; // out of the gauges, the radar, the message band and the key line, as the goal's label is
    t.setPosition(lp.x, lp.y).setAlpha(blink ? 0.5 : 1).setVisible(true); n++;
  });
  for (let i = n; i < V.t.length; i++) V.t[i].setVisible(false);
  if (typeof CAMP_RADAR === 'object' && C.carrier) marks.forEach(m => { // the radar: a ring opening where the group is (on the rim when it is beyond the radar's range, as the blips are)
    const R = CAMP_RADAR, c = C.carrier; let dx = (m.x - c.x) / R.range * R.r, dy = (m.y - c.y) / R.range * R.r; const d = Math.hypot(dx, dy); if (d > R.r - 3) { dx *= (R.r - 3) / d; dy *= (R.r - 3) / d; }
    g.lineStyle(K.width, K.color, 1 - m.age).strokeCircle(R.x + dx, R.y + dy, K.pulse[0] + (K.pulse[1] - K.pulse[0]) * m.age);
  });
}
