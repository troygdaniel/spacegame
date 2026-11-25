// ---------- The new world look, the shield hit (piece W5 of the world look; card space-game-world-w5-shield-hit; the mock is docs/world-look-mock.html, direction 1, and the report on card space-game-world-look-scope) ----------
// A shot that the cruiser's shield takes is a short arc of the player's pale blue on the side that was hit, with a small white ring at the point it came in, in place of the generic spark (the shake and the sound stay). The sim says which side:
// the event the sim already had (src/campaign.js campHurt: { type: 'shieldhit', x, y }) has one more field, `a`, the angle from the cruiser toward where the hit came from (a shot's own direction, a torpedo's place, the shooter's bearing:
// campHitAngle); no rule, number or state of the sim depends on it. The scene draws the arc from a POOL of CAMPSHIELD.pool records (the oldest is reused when they are all up), on one Graphics, as polygon circles (src/campcircles.js:
// Phaser's own arc is the slow path), only while a record is alive, for CAMPSHIELD.life ms, fading out. The size is the mock's: the arc's radius is CAMPSHIELD.k times the cruiser's length, its width and the ring's radius are
// screen pixels (so the effect reads at every zoom), as the ring and the arc of the ship look are (src/shiplookmarks.js). Behind the world look's switch (src/campworldlook.js: CAMP.flags.worldlook, ?worldlook=0 draws the spark);
// the Long Haul's effects (src/art_world.js fxBoom) are not touched.
//   campShieldHitEvent(s, e)     the scene's 'shieldhit' handler asks it: true when the arc takes the hit (the switch is on and the event has its angle), and the spark of the hit that follows is not drawn
//   campShieldHitSkip(s, e)      the scene's 'hit' handler asks it: true when this hit was the shield's whole and its arc is up (a hit that got through to the hull keeps its spark and its red flash)
//   campShieldHitPaint(s, now)   once a frame: the live arcs and rings, on the scene's own clock
//   campShieldArcPoints(x, y, r, a, half)   the corners of an arc round the angle a, half a turn-share each side, [{ x, y }] in a list that the next call uses again
const CAMPSHIELD = { life: 260, pool: 6, half: 0.7, k: 0.78, w: 2, ring: { r: 5, w: 1.4 }, color: 0x6fd6ff, alpha: 0.85, depth: 9, pts: [] }; // ms the arc stays (and fades), the records at most, the arc's half span (rad: 80 degrees in all), its radius over the ship's length, the line's width and the ring's radius and width (screen px), the colour (the player's pale blue), its strength and the layer
function campShieldArcPoints(x, y, r, a, half) {
  const n = typeof campCircleSides === 'function' ? campCircleSides(r) : 24, m = Math.max(3, Math.ceil(n * (2 * half) / (Math.PI * 2))), out = CAMPSHIELD.pts; out.length = m + 1;
  for (let i = 0; i <= m; i++) { const p = out[i] || (out[i] = { x: 0, y: 0 }), t = a - half + (2 * half) * i / m; p.x = x + Math.cos(t) * r; p.y = y + Math.sin(t) * r; out[i] = p; }
  return out;
}
function campShieldHitEvent(s, e) {
  if (!s || !e || typeof campWorldOn !== 'function' || !campWorldOn() || typeof e.a !== 'number' || !isFinite(e.a)) return false;
  const P = s.shieldPool || (s.shieldPool = Array.from({ length: CAMPSHIELD.pool }, () => ({ on: false, a: 0, t0: 0 }))), now = s.time && typeof s.time.now === 'number' ? s.time.now : 0;
  let r = P.find(o => !o.on) || P.reduce((a, b) => (b.t0 < a.t0 ? b : a)); // a free record, else the oldest
  r.on = true; r.a = e.a; r.t0 = now; s.shieldSeen = true;
  return true;
}
function campShieldHitSkip(s, e) { // the hit that follows a shieldhit: its spark is left out when the shield took all of it (the arc is the picture); one that got through to the hull is drawn as it was
  if (!s || !s.shieldSeen) return false;
  s.shieldSeen = false; return !!e && !e.hull && !!s.camp && !!s.camp.carrier && e.id === s.camp.carrier.id;
}
function campShieldHitPaint(s, now) {
  const P = s && s.shieldPool; if (!P) return 0;
  const K = CAMPSHIELD, t = +now || 0; let live = 0;
  P.forEach(o => { if (o.on && t - o.t0 >= K.life) o.on = false; if (o.on) live++; });
  let g = s.shieldG;
  if (!live) { if (g && g.active !== false && s.shieldDrawn) { g.clear(); s.shieldDrawn = false; } return 0; }
  const C = s.camp, c = C && C.carrier, cam = s.cameras && s.cameras.main; if (!c || !s.add) return 0;
  if (!g || (g.active === false && !g.scene)) g = s.shieldG = s.add.graphics().setDepth(K.depth); // (a scene that starts again destroys its layers: a new one is made)
  const z = cam && cam.zoom > 0 ? cam.zoom : 1, L = typeof slookMarkLen === 'function' ? slookMarkLen(s, c) : 58, R = L * K.k; // the ship's length in the world as it is drawn (the far view's least size is in it): the arc round it
  g.clear(); s.shieldDrawn = true;
  P.forEach(o => {
    if (!o.on) return;
    const al = K.alpha * (1 - (t - o.t0) / K.life), px = c.x + Math.cos(o.a) * R, py = c.y + Math.sin(o.a) * R;
    g.lineStyle(K.w / z, K.color, al); g.strokePoints(campShieldArcPoints(c.x, c.y, R, o.a, K.half), false, false);
    g.lineStyle(K.ring.w / z, 0xffffff, Math.min(1, al * 1.15)); if (typeof campRing === 'function') campRing(g, px, py, K.ring.r / z);
  });
  return live;
}
