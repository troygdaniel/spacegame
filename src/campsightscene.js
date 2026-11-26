// ---------- The scene half of seeing hostiles from afar (card space-game-see-hostiles-earlier; the rules are src/campsight.js) ----------
// An ARROW at the edge of the screen, over the HUD's plates and under its lines, for each group of hostiles that is off the screen (a red triangle pointing at it, with how many, what and how far: "6 hostiles  410 km",
// "4 Skiffs, 2 Cutters  410 km" when a scout, an escort or the carrier is near enough to tell; it blinks for the CAMP.sensor.mark ms after the group was first seen), and, in amber, for a ship you protect that is under attack or
// nearly lost and is off the screen ("Hauler 2  40%  310 km"; card space-game-target-display: the radar that showed them is gone). There is no radar pulse any more: the radar was the target display's corner.
// The scene (src/campaignscene.js) calls campSightSync(scene) every frame. Nothing here decides anything; the graphics and the texts are kept in scene.hud (a scene that starts again has a new one: the
// objects of the old scene are destroyed with it). The goal's own arrow (src/campnav.js) is amber; these are red like the hostiles' dots.
const CAMP_SIGHT = {
  color: 0xff4d6d, text: '#ff9aae', font: 12,                 // the arrow of a hostile group (the hostiles' colour on the map), and the label
  friend: { color: 0xffb454, text: '#ffd37a' },               // the arrow of a ship you protect that is in trouble: the convoy's amber on the map
  tri: 11, depth: 62, gap: 12                                 // the triangle's size, the depth (over the far marks, 60), and the clear space between the arrow and the near edge of its label (px)
};
function campSightSync(scene) {
  const C = scene.camp, cam = scene.cameras && scene.cameras.main, K = CAMP_SIGHT; if (!C || !scene.hud || !cam || typeof campSightArrows !== 'function') return;
  if (!scene.hud.sight) scene.hud.sight = { g: scene.add.graphics().setScrollFactor(0).setDepth(K.depth), t: [] }; // kept in scene.hud: its objects are destroyed with a scene that ends
  const V = scene.hud.sight, g = V.g, z = cam.zoom > 0 ? cam.zoom : 1; g.clear();
  const pink = typeof slookOn === 'function' && slookOn(); // the new ship look: a hostile mark is pink, red is retired (card space-game-ship-look-d-glyphs)
  const on = scene.mode === 'play' && !scene.mp && !(typeof scene.hudHides === 'function' && scene.hudHides());
  const arrows = on ? (typeof campPageHudHides === 'function' && campPageHudHides('sight') ? [] : fillAsk(campSightArrows, C, cam, z)).concat(typeof campSightFriends === 'function' ? fillAsk(campSightFriends, C, cam, z) : []) : [];
  const keep = typeof scene.arrowKeep === 'function' ? scene.arrowKeep() : CAMP.nav.arrow.keep; // the places the labels keep out of, as the goal's label does (the gauges, the corner panels, the message band, the key line)
  const its = arrows.map((a, n) => { // the label of each arrow: its words and its size first, so that all of them can be put together
    let t = V.t[n]; if (!t) { t = V.t[n] = scene.add.text(0, 0, '', uiFont(K.font, K.text, { stroke: '#02060d', strokeThickness: 3 })).setOrigin(0.5).setScrollFactor(0).setDepth(K.depth + 1); }
    const s = a.friend ? uiText('camp.sight.friend', { name: a.what, pct: a.pct, km: campNavKm(a.dist) }) : uiText('camp.sight.arrow', { what: a.what, km: campNavKm(a.dist) });
    campLabel(t, s, a.friend ? K.friend.text : pink ? SLOOK.text.foe : K.text); // (set only when the words or the colour change)
    return { x: a.x, y: a.y, angle: a.angle, tx: a.tx, ty: a.ty, w: t.width || 120, h: t.height || 16 };
  });
  // the hostile groups first (nearest first), then the ships you protect: each next arrow that would touch one put before it slides along the edge until it does not (src/campedgespread.js; card space-game-edge-labels-overlap)
  const put = typeof campEdgeSpread === 'function' ? fillSpread(its, { keep, W, H, m: CAMP.nav.arrow.margin, tri: K.tri, gap: K.gap }) : its.map((it, i) => { const ca = Math.cos(it.angle), sa = Math.sin(it.angle), back = K.tri * 0.8 + K.gap + Math.abs(ca) * it.w / 2 + Math.abs(sa) * it.h / 2; return { x: it.x, y: it.y, angle: it.angle, lx: Math.max(it.w / 2 + 6, Math.min(W - it.w / 2 - 6, it.x - ca * back)), ly: Math.max(it.h / 2 + 6, Math.min(H - it.h / 2 - 40, it.y - sa * back)), boxes: [] }; });
  V.boxes = []; // the rectangles the arrows and labels take: the goal's arrow (src/campaignscene.js paintHud) keeps out of them
  arrows.forEach((a, n) => {
    const p = put[n], blink = a.fresh && Math.floor(C.t / 250) % 2 === 1, al = blink ? 0.35 : 0.95;
    const tri = [{ x: p.x + Math.cos(p.angle) * K.tri, y: p.y + Math.sin(p.angle) * K.tri }, { x: p.x + Math.cos(p.angle + 2.5) * K.tri * 0.8, y: p.y + Math.sin(p.angle + 2.5) * K.tri * 0.8 }, { x: p.x + Math.cos(p.angle - 2.5) * K.tri * 0.8, y: p.y + Math.sin(p.angle - 2.5) * K.tri * 0.8 }];
    g.fillStyle(a.friend ? K.friend.color : pink ? slookInt(SLOOK.C.foe) : K.color, al).fillPoints(tri, true); g.lineStyle(1, 0x02060d, 1).strokePoints(tri, true);
    V.t[n].setPosition(p.lx, p.ly).setAlpha(blink ? 0.5 : 1).setVisible(true); // out of the gauges, the corner panels, the message band and the key line, and off the others
    (p.boxes || []).forEach(b => V.boxes.push(b));
  });
  const n = arrows.length;
  for (let i = n; i < V.t.length; i++) V.t[i].setVisible(false);
}
