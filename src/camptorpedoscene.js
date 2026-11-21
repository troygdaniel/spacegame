// ---------- The scene half of the torpedo boats (card space-game-torpedo-art; the rules are src/camptorpedo.js) ----------
// The player must SEE a torpedo to shoot it down, so it is drawn to be found: a pale body with an orange warhead, a bright flame, a trail of smoke, a pulsing amber ring round it (red-pink for the aliens'), and a thin line to the ship
// it is going for. A boat that is arming glows at its tube and pulses a ring for as long as the windup lasts. The radar shows a torpedo as a blinking bright dot; the Tab map has its own marks (src/campmap.js).
// The scene (src/campaignscene.js) calls campTorpedoSync(scene, ms) every frame and campTorpedoEvent(scene, e) for the events 'torpedo' and 'tboom'. Nothing here decides anything: it draws what C.torpedoes and the boats say.
const CAMP_TORP = {
  tex: 'torpedo', size: [26, 10], scale: 1.25,                       // the picture (made once, in px) and how large it is drawn
  color: { pirate: 0xffa040, alien: 0xff4d6d }, hot: 0xffe0a0,        // the ring, the flame and the line of a pirate's torpedo and of an alien's; the hot centre of a flame
  ring: [15, 3, 190], width: 2, ringAlpha: 0.85,                      // the warning ring: its radius, how much it swells, the ms of a pulse; its line width and alpha
  line: { width: 1.5, alpha: 0.3, max: 1500 },                        // the thin line to its target: only when the target is this close (px), so the screen is not crossed by lines
  flame: { back: 12, scale: 1.4 },                                   // px behind the body, and the ember's scale
  puffEvery: 45,                                                     // ms between two puffs of smoke
  arm: { ring: [10, 4, 160], glow: 9, alpha: 0.9 }                    // a boat that arms: a ring round it (px beyond its hit circle, the swell, ms of a pulse) and the glow at its nose (px radius at the full windup)
};

function campTorpedoTexture(scene) { // made once
  const key = CAMP_TORP.tex; if (scene.textures.exists(key)) return key;
  const [w, h] = CAMP_TORP.size, g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x5a5e65, 1); g.fillTriangle(5, 2, 0, 0, 9, 2); g.fillTriangle(5, h - 2, 0, h, 9, h - 2); // the tail fins
  g.fillStyle(0x8e939b, 1); g.fillRect(4, 2, 15, h - 4); g.fillStyle(0xc2c7cf, 1); g.fillRect(4, 2, 15, 2); // the body, with a light edge along the top
  g.fillStyle(0xe8873a, 1); g.fillRect(11, 2, 2, h - 4); // an orange band
  g.fillStyle(0xff7a2a, 1); g.fillTriangle(19, 2, w - 1, h / 2, 19, h - 2); g.fillStyle(0xffe0a0, 1); g.fillCircle(w - 3, h / 2, 1.2); // the warhead, with a hot tip
  g.lineStyle(1, 0x15171a, 0.9); g.strokeRect(4, 2, 15, h - 4);
  g.generateTexture(key, w, h); g.destroy();
  return key;
}

function campTorpedoSync(scene, ms) {
  const C = scene.camp, K = CAMP_TORP; if (!C || !C.torpedoes) return;
  if (!scene.hud.tp) { campTorpedoTexture(scene); scene.hud.tp = { g: scene.add.graphics().setDepth(4.6), h: scene.add.graphics().setDepth(5.4).setBlendMode('ADD'), sp: {} }; } // kept in scene.hud: a scene that starts again has a new hud, and its old graphics are gone with it (a scene object of its own would outlive them)
  const T = scene.hud.tp, g = T.g, h = T.h, play = scene.mode === 'play', seen = {}, now = C.t; g.clear(); h.clear();
  C.torpedoes.forEach(t => {
    if (t.dead) return;
    const col = K.color[t.fac] || K.color.pirate, ux = Math.cos(t.rot), uy = Math.sin(t.rot);
    let r = T.sp[t.id];
    if (!r) r = T.sp[t.id] = { body: scene.add.image(t.x, t.y, K.tex).setScale(K.scale).setDepth(5), flame: scene.add.image(t.x, t.y, 'ember').setBlendMode('ADD').setTint(col).setScale(K.flame.scale).setDepth(5), puff: 0 };
    r.body.setPosition(t.x, t.y).setRotation(t.rot); r.flame.setPosition(t.x - ux * K.flame.back, t.y - uy * K.flame.back).setTint(col); seen[t.id] = true;
    const pulse = Math.sin(now / K.ring[2] * Math.PI * 2); // the warning ring: it swells and fades
    g.lineStyle(K.width, col, K.ringAlpha * (0.65 + 0.35 * pulse)).strokeCircle(t.x, t.y, K.ring[0] + K.ring[1] * pulse);
    const tg = C.by[t.target]; if (tg && tg.hp > 0 && Math.hypot(tg.x - t.x, tg.y - t.y) <= K.line.max) g.lineStyle(K.line.width, col, K.line.alpha).lineBetween(t.x, t.y, tg.x, tg.y);
    r.puff -= ms;
    if (play && r.puff <= 0) { r.puff = K.puffEvery; const p = scene.add.image(t.x - ux * 14, t.y - uy * 14, 'smoke').setScale(0.2).setTint(0xb8c2cc).setAlpha(0.5).setDepth(4); scene.tweens.add({ targets: p, alpha: 0, scale: 0.75, duration: 650, onComplete: () => p.destroy() }); }
  });
  Object.keys(T.sp).forEach(id => { if (!seen[id]) { T.sp[id].body.destroy(); T.sp[id].flame.destroy(); delete T.sp[id]; } });
  C.ships.forEach(u => { // a boat that arms: the glow at its tube grows with the windup and a ring pulses round it
    if (!u.boat || u.hp <= 0 || !(u.arming > 0)) return;
    const bk = CAMP.torpedo.boats[u.kind], col = K.color[u.faction] || K.color.pirate, left = Math.max(0, Math.min(1, (u.arming - C.t) / bk.tube.windup)), pulse = Math.sin(now / K.arm.ring[2] * Math.PI * 2);
    const nx = u.x + Math.cos(u.rot) * (u.r + 4), ny = u.y + Math.sin(u.rot) * (u.r + 4);
    h.fillStyle(col, K.arm.alpha * (1 - left * 0.6)).fillCircle(nx, ny, 3 + K.arm.glow * (1 - left)); h.fillStyle(K.hot, 0.8 * (1 - left)).fillCircle(nx, ny, 2 + 3 * (1 - left));
    g.lineStyle(K.width, col, 0.45 + 0.4 * (1 - left)).strokeCircle(u.x, u.y, u.r + K.arm.ring[0] + K.arm.ring[1] * pulse);
  });
}

function campTorpedoEvent(scene, e) {
  if (e.type === 'tboom') { scene.boom.explode(Math.max(40, (e.r || 90) * 0.7), e.x, e.y); sfx('missileBlast'); const c = scene.camp.carrier; if (c && Math.hypot(c.x - e.x, c.y - e.y) < 400) scene.cameras.main.shake(260, 0.006); return; }
  if (e.stage === 'arming') beep(240, 0.16, 'sawtooth', 0.04, 90); // a low warning growl as the tube arms
  else if (e.stage === 'launch') sfx('missileLaunch');
  else if (e.stage === 'fizzle') { scene.boom.explode(6, e.x, e.y); sfx('missileFizzle'); }
  // 'shot' (shot down) has its bang already: the sim sends a 'boom' for it, which the scene draws and sounds as any kill
}
