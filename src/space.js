// ---------- Space: fly, fight, dock, land ----------
class Space extends Phaser.Scene {
  constructor() { super('Space'); }
  init(d) { this.from = (d && d.from) || 'station'; }
  create() {
    this.leaving = false; this.dead = false; this.rammedAt = 0;
    const WS = 8000; this.WS = WS;
    this.physics.world.setBounds(0, 0, WS, WS);
    this.cameras.main.fadeIn(300, 0, 0, 0).setBounds(0, 0, WS, WS);
    this.s1 = this.add.tileSprite(0, 0, W, H, 'stars1').setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.s2 = this.add.tileSprite(0, 0, W, H, 'stars2').setOrigin(0).setScrollFactor(0).setDepth(-9);

    this.station = this.add.image(4000, 4000, 'station');
    this.tweens.add({ targets: this.station, angle: 360, duration: 180000, repeat: -1 });
    label(this, 4000, 3740, 'HALCYON STATION', '#38e1ff', 18);
    this.planet = this.add.image(6200, 2000, 'planet'); this.planetR = 316;
    label(this, 6200, 1620, 'KEPLER-4B', '#ffb454', 18);

    let sx, sy, rot;
    if (this.from === 'surface') { sx = this.planet.x - 460; sy = this.planet.y + 120; rot = Math.PI; }
    else { sx = this.station.x + 250; sy = this.station.y; rot = 0; }
    this.ship = this.physics.add.sprite(sx, sy, 'ship').setDepth(5).setCollideWorldBounds(true);
    this.ship.body.setCircle(12, 10, 3).setDamping(true).setDrag(0.55).setMaxSpeed(480);
    this.ship.rotation = rot;
    this.ship.setVelocity(Math.cos(rot) * 140, Math.sin(rot) * 140);
    this.lockUntil = this.time.now + 1300;
    this.cameras.main.startFollow(this.ship, true, 0.12, 0.12);

    this.pb = this.physics.add.group({ defaultKey: 'bullet', maxSize: 60 });
    this.eb = this.physics.add.group({ defaultKey: 'ebullet', maxSize: 60 });
    this.enemies = this.physics.add.group();
    this.trail = this.add.particles(0, 0, 'spark', {
      lifespan: 380, speed: { min: 20, max: 70 }, scale: { start: 1.3, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: CYAN, blendMode: 'ADD', emitting: false
    }).setDepth(3);
    this.boom = this.add.particles(0, 0, 'spark', {
      lifespan: 700, speed: { min: 60, max: 300 }, scale: { start: 2.4, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [AMBER, RED, 0xfff1a8], blendMode: 'ADD', emitting: false
    }).setDepth(6);

    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, r = 520 + Math.random() * 220;
      this.spawnDrone(this.planet.x + Math.cos(a) * r, this.planet.y + Math.sin(a) * r);
    }
    [[5000, 3100], [5100, 3500], [3300, 2500]].forEach(([x, y]) => this.spawnDrone(x, y));
    this.time.addEvent({
      delay: 15000, loop: true, callback: () => {
        if (this.dead || this.enemies.countActive() >= 8) return;
        const a = Math.random() * Math.PI * 2;
        const x = Phaser.Math.Clamp(this.ship.x + Math.cos(a) * 1100, 100, WS - 100);
        const y = Phaser.Math.Clamp(this.ship.y + Math.sin(a) * 1100, 100, WS - 100);
        if (Phaser.Math.Distance.Between(x, y, this.station.x, this.station.y) > 1000) this.spawnDrone(x, y);
      }
    });

    this.physics.add.overlap(this.pb, this.enemies, (b, e) => {
      if (!b.active || !e.active) return;
      b.disableBody(true, true); e.hp -= 15; this.boom.explode(4, b.x, b.y); sfx('tick');
      if (e.hp <= 0) {
        const wanted = e.wanted;
        this.boom.explode(28, e.x, e.y); e.destroy(); G.credits += 25; G.stats.drones++; sfx('boom');
        if (wanted) missionKill(this); else toast(this, 'Drone down  +25 cr', '#ffb454');
      }
    });
    this.physics.add.overlap(this.ship, this.eb, (s, b) => {
      if (!b.active) return; b.disableBody(true, true); this.hurt(8);
    });
    this.physics.add.overlap(this.ship, this.enemies, (s, e) => {
      if (this.time.now < this.rammedAt) return; this.rammedAt = this.time.now + 600; e.hp -= 10; this.hurt(12);
    });

    this.k = this.input.keyboard.addKeys('W,A,S,D,E,L,SPACE,SHIFT,UP,DOWN,LEFT,RIGHT');
    this.nextFire = 0;
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hudL1 = hudText(this, 24, 22);
    this.hudL2 = hudText(this, 24, 46, '#ffd37a');
    this.hudSpd = hudText(this, 24, 100);
    this.objText = hudText(this, W / 2, 128, '#ffd37a', 14).setOrigin(0.5);
    this.prompt = floatPrompt(this, this.ship); // key cap above you instead of a strip at the bottom (src/ui.js)
    this.add.text(24, H - 44, 'W thrust  A/D turn  S brake  Shift boost  Space or click fire  L land/dock', {
      fontFamily: 'monospace', fontSize: '14px', color: '#5b7a92'
    }).setScrollFactor(0).setDepth(100);
    if (this.from === 'station') toast(this, 'Launch clear. Kepler-4b is to the north-east.', '#9fe9ff');
    missionSpaceSetup(this); // src/missions.js: escort freighter, wanted pirates
  }

  spawnDrone(x, y) {
    const d = this.enemies.create(x, y, 'drone').setDepth(4);
    d.hp = 30; d.nextShot = 0; d.rotation = Math.random() * 6.28;
    d.body.setCircle(14, 3, 3).setDamping(true).setDrag(0.5).setMaxSpeed(260);
    return d;
  }

  shoot(group, x, y, rot, speed, now) {
    const b = group.get(x, y);
    if (!b) return;
    b.enableBody(true, x, y, true, true);
    b.setRotation(rot).setDepth(4);
    b.born = now;
    this.physics.velocityFromRotation(rot, speed, b.body.velocity);
  }

  hurt(n) {
    if (this.dead || this.leaving) return;
    G.hull -= n; this.cameras.main.shake(120, 0.006); sfx('hit');
    if (G.hull <= 0) this.die();
  }

  die() {
    this.dead = true; G.hull = G.maxHull;
    this.boom.explode(70, this.ship.x, this.ship.y);
    this.ship.setVisible(false); this.ship.body.enable = false;
    G.credits = Math.floor(G.credits * 0.8);
    if (!missionDeath(this)) toast(this, 'Ship destroyed. Insurance paid out (-20% credits).', '#ff4d6d');
    this.time.delayedCall(2200, () => go(this, 'Station', { arrive: false }));
  }

  update(time, dt) {
    guideTick(this);
    const k = this.k, ship = this.ship, JD = Phaser.Input.Keyboard.JustDown;
    this.s1.tilePositionX = this.cameras.main.scrollX * 0.25; this.s1.tilePositionY = this.cameras.main.scrollY * 0.25;
    this.s2.tilePositionX = this.cameras.main.scrollX * 0.6; this.s2.tilePositionY = this.cameras.main.scrollY * 0.6;
    if (this.dead) return;
    const locked = time < this.lockUntil;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.UP.isDown, brake = k.S.isDown || k.DOWN.isDown, boost = k.SHIFT.isDown;

    if (!locked) ship.rotation += ((right ? 1 : 0) - (left ? 1 : 0)) * 0.0036 * dt;
    ship.body.setDrag(brake && !locked ? 0.12 : 0.55);
    ship.body.setMaxSpeed(boost ? boostMax() : 480);
    const thrust = locked ? 600 : (up ? (boost ? 1500 : 720) : 0);
    this.physics.velocityFromRotation(ship.rotation, thrust, ship.body.acceleration);
    if (thrust) {
      const tx = ship.x - Math.cos(ship.rotation) * 20, ty = ship.y - Math.sin(ship.rotation) * 20;
      this.trail.emitParticleAt(tx, ty, boost ? 3 : 2);
    }
    if (!locked && (k.SPACE.isDown || this.input.activePointer.isDown) && time > this.nextFire) {
      this.nextFire = time + fireDelay();
      this.shoot(this.pb, ship.x + Math.cos(ship.rotation) * 24, ship.y + Math.sin(ship.rotation) * 24, ship.rotation, 950, time);
      sfx('laser');
    }
    this.pb.getChildren().forEach(b => { if (b.active && time - b.born > 900) b.disableBody(true, true); });
    this.eb.getChildren().forEach(b => { if (b.active && time - b.born > 1800) b.disableBody(true, true); });

    this.enemies.getChildren().forEach(d => {
      const tgt = d.prey && d.prey.active ? d.prey : ship; // escort pirates hunt the freighter
      const ddx = tgt.x - d.x, ddy = tgt.y - d.y, dist = Math.hypot(ddx, ddy);
      if (dist < 900) {
        const target = Math.atan2(ddy, ddx);
        d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, target, 0.035);
        if (dist > 280) this.physics.velocityFromRotation(d.rotation, 300, d.body.acceleration);
        else d.body.setAcceleration(0, 0);
        if (dist < 650 && time > d.nextShot && Math.abs(Phaser.Math.Angle.Wrap(target - d.rotation)) < 0.25) {
          d.nextShot = time + Phaser.Math.Between(900, 1500);
          this.shoot(this.eb, d.x, d.y, d.rotation, 420, time);
        }
      } else { d.body.setAcceleration(0, 0); d.rotation += 0.003; }
    });

    // dock / land
    const dS = Phaser.Math.Distance.Between(ship.x, ship.y, this.station.x, this.station.y);
    const dP = Phaser.Math.Distance.Between(ship.x, ship.y, this.planet.x, this.planet.y);
    const spd = ship.body.speed;
    let msg = '';
    if (dS < 320) {
      if (spd < 150) { msg = 'L  Dock at Halcyon Station'; if (JD(k.L)) { missionLeaveSpace(this); sfx('dock'); go(this, 'Station', { arrive: true }); } }
      else msg = 'Too fast to dock. Hold S to brake';
    } else if (dP < this.planetR + 150) {
      if (spd < 170) { msg = 'L  Land on Kepler-4b'; if (JD(k.L)) { missionLeaveSpace(this); sfx('thrusters'); go(this, 'Surface'); } }
      else msg = 'Too fast to land. Hold S to brake';
    }
    this.prompt.setText(msg);

    // HUD
    const g = this.hud; g.clear();
    this.hudL1.setText('CREDITS ' + G.credits);
    this.hudL2.setText(missionLine());
    bar(g, 24, 74, 220, 12, G.hull / G.maxHull, G.hull > G.maxHull * 0.35 ? CYAN : RED);
    this.hudSpd.setText('HULL ' + Math.round(G.hull) + '/' + G.maxHull + '   SPD ' + Math.round(spd));
    this.hudSpd.y = 92;
    // objective arrow
    const tgt = missionTarget(this), name = tgt.name;
    const a = Phaser.Math.Angle.Between(ship.x, ship.y, tgt.x, tgt.y);
    const sx = ship.x - this.cameras.main.scrollX, sy = ship.y - this.cameras.main.scrollY;
    tri(g, sx + Math.cos(a) * 80, sy + Math.sin(a) * 80, a, 11, AMBER);
    this.objText.setText(name + '  ' + (Phaser.Math.Distance.Between(ship.x, ship.y, tgt.x, tgt.y) / 10 | 0) + ' km');
    // radar
    const rx = W - 184, ry = 24, rs = 160, sc = rs / this.WS;
    g.fillStyle(0x000000, 0.55); g.fillRect(rx, ry, rs, rs); g.lineStyle(1, CYAN, 0.7); g.strokeRect(rx, ry, rs, rs);
    g.fillStyle(CYAN, 1); g.fillCircle(rx + this.station.x * sc, ry + this.station.y * sc, 4);
    g.fillStyle(AMBER, 1); g.fillCircle(rx + this.planet.x * sc, ry + this.planet.y * sc, 5);
    g.fillStyle(RED, 1);
    this.enemies.getChildren().forEach(d => { if (!d.wanted) g.fillRect(rx + d.x * sc - 1, ry + d.y * sc - 1, 3, 3); });
    g.fillStyle(0xffffff, 1); g.fillCircle(rx + ship.x * sc, ry + ship.y * sc, 3);
    missionSpaceUpdate(this, time, dt); // after the HUD: it draws the freighter bar and radar marks
  }
}
