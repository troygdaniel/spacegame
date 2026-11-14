// ---------- Feel: hit feedback, combat sparks and numbers, flight cues, launch and landing moves ----------
// Shapes and particles only. Game logic stays in the scenes; this file only shows what happened.
// Scenes call feelInstall(s) once in create, feelFrame(s, time, dt) once per frame, and the small hooks
// (feelHit, feelBite, feelShot, feelNumber, feelLaunch, feelDescend, feelLiftoff) where things happen.

const FEEL = { hitFade: 550, flashFade: 260, lowHull: 0.3, maxNumbers: 40 };

function feelInstall(s) {
  const f = s.fx = { hits: [], shots: [], flash: 0, biteAt: 0, numbers: 0 };
  f.low = s.add.graphics().setDepth(1);                        // approach rings, on the world under everything
  f.mid = s.add.graphics().setDepth(4.5);                      // thruster flame and velocity line, just under the ship
  f.top = s.add.graphics().setDepth(6.5);                      // muzzle flashes
  f.scr = s.add.graphics().setScrollFactor(0).setDepth(120);   // edge flash, hit arcs, low-hull pulse (screen space)
  f.read = s.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', color: '#9fe9ff' })
    .setOrigin(0.5).setStroke('#02060d', 3).setScrollFactor(0).setDepth(121).setVisible(false);
  feelArrive(s);
}

// ---- things that happen ----
// damage to the player: edge flash, an arc on the side it came from, a floating number
function feelHit(s, x, y, n) {
  const f = s.fx, p = s.ship || s.player; if (!f || !p) return;
  const a = x === undefined ? null : Phaser.Math.Angle.Between(p.x, p.y, x, y);
  f.hits.push({ a, t: s.time.now });
  f.flash = Math.min(1, f.flash + 0.35 + n / 40);
  feelNumber(s, p.x, p.y - 22, '-' + Math.round(n), '#ff4d6d');
}
// a crawler chewing on you (continuous damage): one hit cue every 350 ms
function feelBite(s, x, y) {
  const f = s.fx; if (!f || s.time.now - f.biteAt < 350) return;
  f.biteAt = s.time.now; feelHit(s, x, y, 7);
}
// muzzle flash where a shot left
function feelShot(s, x, y, rot) { if (s.fx) s.fx.shots.push({ x, y, rot, t: s.time.now }); }
// a number that floats up and fades: damage dealt, credits earned
function feelNumber(s, x, y, text, color = '#fff1a8', size = 15) {
  const f = s.fx; if (!f || f.numbers >= FEEL.maxNumbers) return;
  f.numbers++;
  const t = s.add.text(x + Phaser.Math.Between(-6, 6), y, text, { fontFamily: 'monospace', fontSize: size + 'px', color })
    .setOrigin(0.5).setStroke('#02060d', 3).setDepth(90);
  s.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 750, ease: 'Cubic.easeOut', onComplete: () => { t.destroy(); f.numbers--; } });
}

// ---- every frame ----
function feelFrame(s, time, dt) {
  const f = s.fx; if (!f) return;
  const cam = s.cameras.main, now = s.time.now, p = s.ship || s.player;
  f.low.clear(); f.mid.clear(); f.top.clear(); f.scr.clear(); f.read.setVisible(false);
  if (!p) return;
  const sx = (p.x - cam.worldView.x) * cam.zoom, sy = (p.y - cam.worldView.y) * cam.zoom; // player on screen
  if (s.scene.key === 'Space' && !s.dead) feelSpace(s, f, now, sx, sy);
  if (s.scene.key === 'Space') shipsFrame(s, now, dt); // src/ships.js: every ship's flame, trail, shield, smoke

  // muzzle flashes live 70 ms
  f.shots = f.shots.filter(sh => now - sh.t < 70);
  f.shots.forEach(sh => {
    f.top.fillStyle(0xfff1a8, 0.8); f.top.fillCircle(sh.x, sh.y, 6);
    tri(f.top, sh.x + Math.cos(sh.rot) * 7, sh.y + Math.sin(sh.rot) * 7, sh.rot, 9, 0xffffff);
  });

  // hit arcs around the player, on the side the damage came from
  f.hits = f.hits.filter(h => now - h.t < FEEL.hitFade);
  f.hits.forEach(h => {
    if (h.a === null) return;
    const k = 1 - (now - h.t) / FEEL.hitFade;
    f.scr.lineStyle(5, RED, 0.9 * k);
    f.scr.beginPath(); f.scr.arc(sx, sy, 38 + 20 * (1 - k), h.a - 0.45, h.a + 0.45); f.scr.strokePath();
  });

  // red edge: a flash that decays, and a slow pulse while the hull is low
  f.flash = Math.max(0, f.flash - dt / FEEL.flashFade);
  const frac = s.scene.key === 'Space' ? G.hull / G.maxHull : s.hp / 100;
  const low = frac < FEEL.lowHull && !s.dead;
  const a = Math.max(f.flash * 0.6, low ? 0.11 + 0.08 * Math.sin(now / 140) : 0);
  if (a > 0.01) {
    for (let i = 0; i < 5; i++) {
      f.scr.lineStyle(14, RED, a * (1 - i / 5));
      f.scr.strokeRect(7 + i * 12, 7 + i * 12, W - 14 - i * 24, H - 14 - i * 24);
    }
  }
  if (low && Math.sin(now / 280) > 0) {
    f.read.setVisible(true).setPosition(W / 2, H - 96).setColor('#ff4d6d')
      .setText(s.scene.key === 'Space' ? 'HULL CRITICAL' : 'HEALTH CRITICAL');
  }
}

function feelSpace(s, f, now, sx, sy) {
  const ship = s.ship, body = ship.body, g = f.mid;
  if (!ship.visible || !body) return;
  // the thruster flame is drawn by shipsFrame (src/ships.js) with every other ship's
  // velocity vector: where you are actually going
  const v = body.velocity, sp = body.speed;
  if (sp > 30 && !s.leaving) {
    const ex = ship.x + v.x * 0.35, ey = ship.y + v.y * 0.35;
    g.lineStyle(1.5, CYAN, 0.45); g.lineBetween(ship.x, ship.y, ex, ey);
    g.fillStyle(CYAN, 0.75); g.fillCircle(ex, ey, 2.5);
  }
  // approach rings: dim cyan far out, amber inside but too fast, green when L will work
  feelRing(s, f, now, sx, sy, s.station, 320, 150, 'DOCK');
  if (s.canLand) feelRing(s, f, now, sx, sy, s.planet, s.planetR + 150, 170, 'LAND'); // only where you can land (src/space.js)
}

function feelRing(s, f, now, sx, sy, t, R, vmax, name) {
  const ship = s.ship, sp = ship.body.speed, d = Phaser.Math.Distance.Between(ship.x, ship.y, t.x, t.y);
  if (d > R * 2.4) return;
  const inside = d < R, slow = sp < vmax;
  const col = inside ? (slow ? GREEN : AMBER) : CYAN, a = inside ? 0.9 : 0.3 + 0.15 * Math.sin(now / 300);
  f.low.lineStyle(inside ? 3 : 2, col, a);
  for (let i = 0; i < 36; i++) { // a slowly turning dashed ring
    const a0 = i / 36 * Math.PI * 2 + now / 5000;
    f.low.beginPath(); f.low.arc(t.x, t.y, R, a0, a0 + 0.09); f.low.strokePath();
  }
  if (!inside || s.leaving) return;
  f.read.setVisible(true).setPosition(sx, sy + 46).setColor(slow ? '#6dff9c' : '#ffb454')
    .setText(slow ? name + ' SPEED OK    SPD ' + Math.round(sp) : 'SLOW DOWN    SPD ' + Math.round(sp) + '  >  ' + vmax);
}

// ---- scene changes ----
// Space and Surface open with a short zoom out; the ship grows as it leaves the bay or climbs off the pad
function feelArrive(s) {
  const cam = s.cameras.main;
  if (s.scene.key === 'Space') {
    cam.setZoom(1.6); cam.zoomTo(1, 900, 'Sine.easeOut');
    s.ship.setScale(0.4); s.tweens.add({ targets: s.ship, scale: 1, duration: 700, ease: 'Sine.easeOut' });
  } else if (s.scene.key === 'Surface') {
    cam.setZoom(1.5); cam.zoomTo(1, 800, 'Sine.easeOut');
  } else if (s.scene.key === 'Station') {
    cam.setZoom(1.2); cam.zoomTo(1, 600, 'Sine.easeOut');
  }
}

// Station: the ship slides out of the hangar on a flame, camera closing in, then done()
function feelLaunch(s, done) {
  if (s.leaving) return;
  s.leaving = true;
  const cam = s.cameras.main, img = s.shipImg;
  cam.setBounds(0, 0, W, H); cam.pan(img.x, img.y, 500, 'Sine.easeInOut'); cam.zoomTo(1.5, 700, 'Sine.easeIn');
  const flame = s.add.particles(0, 0, 'spark', {
    lifespan: 380, speed: { min: 80, max: 200 }, angle: { min: 168, max: 192 }, scale: { start: 2.2, end: 0 },
    alpha: { start: 0.9, end: 0 }, tint: [AMBER, 0xfff1a8], blendMode: 'ADD', frequency: 12
  }).setDepth(6);
  flame.startFollow(img, -42, 0);
  cam.shake(900, 0.002);
  s.tweens.add({
    targets: img, x: img.x + 560, duration: 850, delay: 300, ease: 'Cubic.easeIn',
    onComplete: () => { flame.destroy(); s.leaving = false; done(); }
  });
}

// Space: the ship glides into the station or down to the planet, shrinking, camera closing in, then done()
function feelDescend(s, target, done) {
  if (s.leaving) return;
  s.leaving = true;
  const ship = s.ship, cam = s.cameras.main;
  ship.body.stop(); ship.body.enable = false;
  const ang = Phaser.Math.Angle.Between(ship.x, ship.y, target.x, target.y);
  cam.stopFollow(); cam.pan(target.x, target.y, 950, 'Sine.easeInOut'); cam.zoomTo(1.8, 950, 'Sine.easeIn');
  s.tweens.add({
    targets: ship, x: target.x - Math.cos(ang) * 30, y: target.y - Math.sin(ang) * 30, scale: 0.3, duration: 950, ease: 'Sine.easeInOut',
    onUpdate: () => {
      ship.rotation = Phaser.Math.Angle.RotateTo(ship.rotation, ang, 0.1);
      s.trail.emitParticleAt(ship.x - Math.cos(ship.rotation) * 16 * ship.scaleX, ship.y - Math.sin(ship.rotation) * 16 * ship.scaleX, 1);
    },
    onComplete: () => { s.leaving = false; done(); }
  });
}

// Surface: you vanish into the ship, it lifts off the pad in a burst of dust, then done()
function feelLiftoff(s, done) {
  if (s.leaving) return;
  s.leaving = true;
  const cam = s.cameras.main, img = s.children.list.find(o => o.texture && o.texture.key === 'ship');
  s.player.setVisible(false); s.player.body.stop(); s.player.body.enable = false;
  if (s.col && s.col.s && s.col.s.active) s.col.s.setVisible(false);
  cam.stopFollow(); cam.pan(s.pad.x, s.pad.y, 700, 'Sine.easeInOut'); cam.zoomTo(1.4, 900, 'Sine.easeIn');
  s.boom.explode(36, s.pad.x, s.pad.y); cam.shake(600, 0.003);
  if (!img) { s.time.delayedCall(700, () => { s.leaving = false; done(); }); return; }
  s.tweens.add({
    targets: img, scale: 3.4, alpha: 0, duration: 900, delay: 150, ease: 'Cubic.easeIn',
    onComplete: () => { s.leaving = false; done(); }
  });
}
