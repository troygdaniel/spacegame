// ---------- Feel: hit feedback, combat sparks and numbers, flight cues, launch and landing moves ----------
// Shapes and particles only. Game logic stays in the scenes; this file only shows what happened.
// Scenes call feelInstall(s) once in create, feelFrame(s, time, dt) once per frame, and the small hooks
// (feelHit, feelBite, feelShot, feelNumber, feelLaunch, feelDescend, feelLiftoff) where things happen.

const FEEL = { hitFade: 550, flashFade: 260, lowHull: 0.3, maxNumbers: 40 };

function feelInstall(s) {
  const f = s.fx = { hits: [], shots: [], flash: 0, biteAt: 0, numbers: 0 };
  f.burn = feelBurnNew();                                      // the ship working: turn thrusters, the main engine, the braking burn (below)
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
  feelBurn(s, f, now); // the ship working: thruster puffs in a turn, the engine glow that builds, the braking burn
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

// ---- the ship working (card space-game-burn-feel) ----
// A manoeuvre has three phases and each one shows and sounds: the ship TURNS (small side-thruster puffs at the nose and the tail), the main
// engine BURNS (a glow and a plume at the stern that build with the burn, and the hum with them: src/audio.js), and it BRAKES (two jets
// forward, against the way it is going, and a hiss). By hand or under the flight assist or the autopilot: the phase is read from what the ship
// itself does (how fast its heading turns, how its velocity changes), so nothing here asks who is flying. Heavy handling shows more of it
// than Classic, and its engine takes longer to build.
// feelBurnRead is pure (tests/burnfeel.mjs flies it in plain Node); feelBurn is the scene side, drawn on the feel layers each frame.
const BURN = {
  turnMin: 0.3, turnFull: 2.4,        // rad/s: a turn slower than this shows nothing; this fast is a full puff
  accMin: 50, accFull: 600,           // px/s2 of push along the nose: under this the engine is off; this much is a full burn
  hint: 0.75, hintBoost: 1,           // the engine is commanded on but the ship is at its top speed (no push to measure): this much burn
  brakeRate: 0.9,                     // speed lost per second, as a share of the speed: more than a coasting ship loses (0.6) is a braking burn
  brakeMinSpeed: 45, brakeFull: 450,  // px/s: slower than this there is nothing to brake; px/s2 of slowing that is a full burn
  rise: { classic: 300, heavy: 850 }, // ms for the engine to build from nothing to full
  fall: 200, brakeRise: 130, brakeFall: 220, turnEase: 70, // ms
  strength: { classic: 1, heavy: 1.4 },                    // how big and bright (and loud) it all is
  puffs: 32, puffEvery: 50, puffLife: 360, maxDt: 250      // the pool of thruster puffs; a frame longer than maxDt is a hitch, not a manoeuvre
};
const feelBurnNew = () => ({ turn: 0, engine: 0, brake: 0, phase: 'coast', strength: 1, pool: [], next: 0, puffAt: 0 });
const feelWrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const feelClamp = x => (x < 0 ? 0 : x > 1 ? 1 : x);

// one frame of reading. b: the state kept between frames (feelBurnNew); me: { rot, vx, vy } and three optional hints: burn (the engine is
// commanded on), boost, brake (the brake is commanded on); dt in ms; h: { id: 'classic' | 'heavy' } (the handling). Sets b.turn (-1..1, the sign is the way it turns), b.engine and b.brake (0..1) and b.phase
// ('brake', 'burn', 'turn' or 'coast': the strongest thing it is doing).
function feelBurnRead(b, me, dt, h) {
  h = h || { id: 'classic' };
  b.strength = BURN.strength[h.id] || 1;
  let turnT = 0, engT = 0, brkT = 0;
  if (b.rot !== undefined && dt > 0 && dt <= BURN.maxDt) {
    const dts = dt / 1000, rate = feelWrap(me.rot - b.rot) / dts;
    const ax = (me.vx - b.vx) / dts, ay = (me.vy - b.vy) / dts, sp0 = Math.hypot(b.vx, b.vy), sp = Math.hypot(me.vx, me.vy);
    if (Math.abs(rate) > BURN.turnMin) turnT = Math.sign(rate) * feelClamp((Math.abs(rate) - BURN.turnMin) / (BURN.turnFull - BURN.turnMin));
    // the push along the nose. Slowing straight against the motion is drag or the brake, never the main engine (a ship sliding backwards
    // while it brakes is not burning), so that part is taken out first: a ship that only coasts or brakes reads 0
    const back = sp0 > 1 ? Math.min(0, (ax * b.vx + ay * b.vy) / sp0) : 0;
    const px = sp0 > 1 ? ax - back * b.vx / sp0 : ax, py = sp0 > 1 ? ay - back * b.vy / sp0 : ay;
    const push = px * Math.cos(me.rot) + py * Math.sin(me.rot);
    engT = feelClamp((push - BURN.accMin) / (BURN.accFull - BURN.accMin));
    if (me.burn) engT = Math.max(engT, me.boost ? BURN.hintBoost : BURN.hint);
    const slowing = (sp0 - sp) / dts; // px/s2
    if (!engT && sp0 > BURN.brakeMinSpeed && (me.brake || slowing / sp0 > BURN.brakeRate)) brkT = feelClamp(0.25 + slowing / BURN.brakeFull);
  }
  b.rot = me.rot; b.vx = me.vx; b.vy = me.vy;
  const to = (v, t, up, down) => (t > v ? Math.min(t, v + dt / up) : Math.max(t, v - dt / down));
  b.turn = to(b.turn, turnT, BURN.turnEase, BURN.turnEase);
  b.engine = to(b.engine, engT, BURN.rise[h.id] || BURN.rise.classic, BURN.fall); // it builds: this is the flare and the hum
  b.brake = to(b.brake, brkT, BURN.brakeRise, BURN.brakeFall);
  b.phase = b.brake > 0.15 ? 'brake' : b.engine > 0.1 ? 'burn' : Math.abs(b.turn) > 0.15 ? 'turn' : 'coast';
  return b;
}
// nothing is happening (a dock, a cruise, a death): the levels fall to nothing and the next reading starts fresh
function feelBurnRest(b) { b.turn = 0; b.engine = 0; b.brake = 0; b.phase = 'coast'; b.rot = undefined; }

// a puff from the pool: the oldest one is used again, so a long turn makes no new objects
function feelPuff(b, now, x, y, vx, vy, size, color) {
  let p = b.pool[b.next];
  if (!p) p = b.pool[b.next] = { x: 0, y: 0, vx: 0, vy: 0, t: -1e9, size: 0, color: 0 };
  b.next = (b.next + 1) % BURN.puffs;
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = now; p.size = size; p.color = color;
  return p;
}

function feelBurn(s, f, now) {
  const b = f.burn, ship = s.ship, body = ship.body, g = f.mid;
  if (s.leaving || s.cruising) { feelBurnRest(b); return; }
  const dt = b.at === undefined ? 0 : now - b.at; b.at = now;
  const hn = handlingNow(), flown = !!(s.as && s.as.mode); // the flight assist has the ship: its own model, its own commands
  feelBurnRead(b, {
    rot: ship.rotation, vx: body.velocity.x, vy: body.velocity.y, boost: !!s.boosting,
    burn: flown ? !!s.as.burning : body.acceleration.length() > 0,
    brake: flown ? !!(s.as.cmd && s.as.cmd.brake) : Math.abs(body.drag.x - hn.brake) < 1e-6
  }, dt, hn);
  const k = b.strength, sc = ship.scaleX || 1, r = ship.rotation, c = Math.cos(r), n = Math.sin(r);
  const at = (along, across) => [ship.x + (c * along - n * across) * sc, ship.y + (n * along + c * across) * sc];
  const vx = body.velocity.x, vy = body.velocity.y;

  // new puffs. A turn to the right (the heading grows): the nose thruster on the left fires and the tail thruster on the right, and the other way round
  const turn = Math.abs(b.turn), side = Math.sign(b.turn);
  if (now >= b.puffAt && (turn > 0.12 || b.brake > 0.2)) {
    b.puffAt = now + BURN.puffEvery;
    if (turn > 0.12) {
      const out = 90 + 60 * turn; // px/s away from the hull
      const [nx, ny] = at(15, -7 * side), [tx, ty] = at(-14, 7 * side);
      feelPuff(b, now, nx, ny, vx * 0.6 + n * side * out, vy * 0.6 - c * side * out, (2.2 + 2.2 * turn) * k, 0xdff6ff);
      feelPuff(b, now, tx, ty, vx * 0.6 - n * side * out, vy * 0.6 + c * side * out, (2.2 + 2.2 * turn) * k, 0xdff6ff);
    }
    if (b.brake > 0.2) { // the braking jets leave a little cloud ahead of the ship
      const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp;
      feelPuff(b, now, ship.x + ux * 20 * sc, ship.y + uy * 20 * sc, vx + ux * 150, vy + uy * 150, (3 + 3 * b.brake) * k, 0xffd9a0);
    }
  }
  // the puffs alive: each drifts on, swells and fades
  for (const p of b.pool) {
    const age = now - p.t; if (age < 0 || age > BURN.puffLife) continue;
    const q = age / BURN.puffLife, x = p.x + p.vx * age / 1000, y = p.y + p.vy * age / 1000;
    g.fillStyle(p.color, 0.55 * (1 - q)); g.fillCircle(x, y, p.size * (0.7 + 1.6 * q));
  }
  // the main engine: a glow at the stern and a plume, both as big as the burn has built
  if (b.engine > 0.03) {
    const e = b.engine, flick = 0.9 + Math.random() * 0.2, [ex, ey] = at(-17, 0), len = (10 + 46 * e * e) * k * flick * sc, wid = (2 + 5 * e) * k * sc;
    g.fillStyle(CYAN, 0.10 + 0.16 * e); g.fillCircle(ex, ey, (7 + 17 * e) * k * sc);
    g.fillStyle(CYAN, 0.35 * e); g.fillTriangle(ex - n * wid, ey + c * wid, ex + n * wid, ey - c * wid, ex - c * len, ey - n * len);
    g.fillStyle(0xffffff, 0.5 * e); g.fillTriangle(ex - n * wid * 0.4, ey + c * wid * 0.4, ex + n * wid * 0.4, ey - c * wid * 0.4, ex - c * len * 0.5, ey - n * len * 0.5);
  }
  // the braking burn: two jets against the motion, splayed a little, from the leading edge of the hull
  if (b.brake > 0.03) {
    const sp = Math.hypot(vx, vy);
    if (sp > 1) {
      const va = Math.atan2(vy, vx), q = b.brake, flick = 0.85 + Math.random() * 0.3, len = (12 + 30 * q) * k * flick * sc, wid = (1.6 + 2.6 * q) * k * sc;
      for (const d of [-0.42, 0.42]) {
        const a = va + d, ox = ship.x + Math.cos(a) * 15 * sc, oy = ship.y + Math.sin(a) * 15 * sc, jc = Math.cos(a), jn = Math.sin(a);
        g.fillStyle(AMBER, 0.5 * q); g.fillTriangle(ox - jn * wid, oy + jc * wid, ox + jn * wid, oy - jc * wid, ox + jc * len, oy + jn * len);
        g.fillStyle(0xffffff, 0.6 * q); g.fillTriangle(ox - jn * wid * 0.45, oy + jc * wid * 0.45, ox + jn * wid * 0.45, oy - jc * wid * 0.45, ox + jc * len * 0.5, oy + jn * len * 0.5);
      }
    }
  }
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
