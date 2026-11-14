// ---------- Space: fly, fight, dock, land ----------
// a system with no station or no planet in its data (Kestrel until card u-b5, and the deep space of a pull-out): the scene still has an object where
// the code looks for one, far outside the world, so every distance to it comes out huge and nothing is ever near it. nowhere marks it for the few
// places that would draw it (hud.js)
const spaceNowhere = () => ({ x: -60000, y: -60000, nowhere: true, active: false });
class Space extends Phaser.Scene {
  constructor() { super('Space'); }
  // from: 'station' (the default), 'surface', or 'jump': the ship comes out of hyperspace (src/jump.js hands over { from: 'jump', to, origin })
  init(d) {
    this.from = (d && d.from) || 'station';
    this.jumped = this.from === 'jump';
    if (this.jumped && d.to && G.system !== d.to) enterSystem(d.to, d.origin || null); // src/universe.js: the system, G.known, G.jumps and where the ship appears
  }
  create() {
    this.leaving = false; this.dead = false; this.rammedAt = 0; this.ironUntil = 0;
    this.launchAt = null; this.aggro = 0; this.graceOver = false; // enemies.js: launch grace and first-wave cap; launchAt is set on the first update (the scene clock is still 0 in create on a fresh page)
    shipRefresh(this); // src/ships.js: the ship texture shows the upgrade tiers you own
    shipSync(); // src/fleet.js: the hull cap comes from the model and its plating
    const WS = sysDef().size; this.WS = WS; // src/universe.js: the current system, from src/data_systems.js
    this.physics.world.setBounds(0, 0, WS, WS);
    this.cameras.main.fadeIn(300, 0, 0, 0).setBounds(0, 0, WS, WS);
    spaceBackdrop(this); // src/art_world.js: nebula, parallax star layers, distant sun, giant and moon

    const stDef = sysBody('station'), plDef = sysBody('planet');
    if (stDef) {
      this.station = this.add.image(stDef.x, stDef.y, stDef.art);
      this.tweens.add({ targets: this.station, angle: 360, duration: 180000, repeat: -1 });
      label(this, stDef.x, stDef.y + stDef.labelDy, stDef.name.toUpperCase(), '#38e1ff', 18);
      stationFx(this); // src/stationart.js: spinning hub and ring, beacons, docking lane, Kestrel Outpost
    } else this.station = spaceNowhere();
    if (plDef) {
      this.planet = this.add.image(plDef.x, plDef.y, plDef.art); this.planetR = plDef.r;
      label(this, plDef.x, plDef.y - plDef.r - 64, plDef.name.toUpperCase(), '#ffb454', 18);
    } else { this.planet = spaceNowhere(); this.planetR = 0; }

    let sx, sy, rot;
    const arr = this.jumped && G.arrival && G.arrival.system === G.system ? G.arrival : null; // out of hyperspace at the edge facing the star we came from
    if (arr) { sx = arr.x; sy = arr.y; rot = arr.rot; }
    else if (this.jumped || !stDef) { sx = WS / 2; sy = WS / 2; rot = 0; } // a jump with no origin, or a system with no station to launch from: the middle
    else if (this.from === 'surface') { sx = this.planet.x - 460; sy = this.planet.y + 120; rot = Math.PI; }
    else { sx = this.station.x + 250; sy = this.station.y; rot = 0; }
    this.ship = this.physics.add.sprite(sx, sy, 'ship').setDepth(5).setCollideWorldBounds(true);
    this.ship.body.setCircle(...shipLook().body).setDamping(true).setDrag(0.55).setMaxSpeed(shipStat('vmax')); // the 56x40 texture has a glow margin (ships.js); top speed from the model (fleet.js)
    this.ship.rotation = rot;
    const v0 = arr ? ARRIVE.speed : 140; // out of the tunnel at 500 px/s toward the middle (src/universe.js), off a launch pad at 140
    this.ship.setVelocity(Math.cos(rot) * v0, Math.sin(rot) * v0);
    this.lockUntil = this.time.now + (arr ? 0 : 1300);
    this.calmUntil = null; // set by the first frame of flight: no pirates engage and none spawn until then (a jump's 3 s of calm)
    if (this.jumped) G.arrival = null;
    this.cameras.main.startFollow(this.ship, true, 0.12, 0.12);

    this.pb = this.physics.add.group({ defaultKey: 'bullet', maxSize: 60 });
    this.eb = this.physics.add.group({ defaultKey: 'ebullet', maxSize: 60 });
    this.enemies = this.physics.add.group();
    enemiesSetup(this); // src/enemies.js: salvage pods and their pickup
    this.trail = this.add.particles(0, 0, 'spark', {
      lifespan: 380, speed: { min: 20, max: 70 }, scale: { start: 1.3, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: CYAN, blendMode: 'ADD', emitting: false
    }).setDepth(3);
    this.boom = fxBoom(this); // src/art_world.js: sparks, flash, embers, shockwave, shards, smoke, scaled by the count

    if (G.system === 'halcyon') { // the pirates round Kepler-4b and on the way to it are Halcyon's own (the other systems spawn from their table)
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, r = 520 + Math.random() * 220;
        this.spawnDrone(this.planet.x + Math.cos(a) * r, this.planet.y + Math.sin(a) * r);
      }
      // the station-side pirates sit on the way to Kepler-4b, over 2000 px out: outside the police zone and well past engage range
      [[5700, 2700], [6000, 3500], [2500, 2200]].forEach(([x, y]) => this.spawnDrone(x, y));
    }
    this.time.addEvent({
      delay: pirateTable().every, loop: true, callback: () => { // src/enemies.js: the system's spawn table
        if (this.dead || this.cruising || this.enemies.countActive() >= pirateTable().max || pirateCap(this, this.time.now) === 0 || (this.calmUntil && this.time.now < this.calmUntil)) return; // quiet during the launch grace and a jump's calm
        const a = Math.random() * Math.PI * 2;
        const x = Phaser.Math.Clamp(this.ship.x + Math.cos(a) * SPAWN_DIST, 100, WS - 100);
        const y = Phaser.Math.Clamp(this.ship.y + Math.sin(a) * SPAWN_DIST, 100, WS - 100);
        if (Phaser.Math.Distance.Between(x, y, this.station.x, this.station.y) > SPAWN_KEEP_OUT) this.spawnDrone(x, y);
      }
    });

    this.physics.add.overlap(this.pb, this.enemies, (b, e) => {
      if (!b.active || !e.active) return;
      const dmg = b.dmg || 15; b.disableBody(true, true); e.hp -= dmg; this.boom.explode(4, b.x, b.y); sfx('tick'); feelNumber(this, e.x, e.y - 18, String(dmg)); shipsHit(this, e, b.x, b.y);
      if (e.hp <= 0) this.killDrone(e);
    });
    this.physics.add.overlap(this.ship, this.eb, (s, b) => {
      if (!b.active || this.cruising) return; b.disableBody(true, true); this.hurt(b.dmg || 8, b.x, b.y);
    });
    this.physics.add.overlap(this.ship, this.enemies, (s, e) => {
      if (this.cruising || this.time.now < this.rammedAt) return; this.rammedAt = this.time.now + 600; e.hp -= 10; this.hurt(e.def ? e.def.ram : 12, e.x, e.y);
      if (e.hp <= 0) this.killDrone(e); // ramming used to take hp off a drone but never finish it
    });

    this.k = this.input.keyboard.addKeys('W,A,S,D,E,Q,L,SPACE,SHIFT,UP,DOWN,LEFT,RIGHT');
    const sh = this.sh = { max: shipStat('shieldMax'), pts: shipStat('shieldMax'), regen: shipStat('shieldRegen'), delay: shipStat('shieldDelay'), last: -1e9, hitAt: -1e9, down: -1e9 }; // the shield part (src/data_parts.js): full at launch
    boostInit(this); // src/boost.js: boost energy and the Q/E dash
    this.nextFire = 0;
    this.prompt = floatPrompt(this, this.ship); // key cap above you instead of a strip at the bottom (src/ui.js)
    this.add.text(24, H - 44, 'W thrust  A/D turn  S brake  Shift boost  Q/E dash  Space or click fire  L land/dock', {
      fontFamily: 'monospace', fontSize: '14px', color: '#5b7a92'
    }).setScrollFactor(0).setDepth(100);
    if (this.from === 'station') { bountyReset(); toast(this, 'Launch clear. Kepler-4b is to the north-east.', '#9fe9ff'); } // enemies.js: a new flight's bounty count starts at 0
    else if (this.jumped) toast(this, 'Arrived in ' + sysDef().name + '.', '#9fe9ff');
    missionSpaceSetup(this); // src/missions.js: escort freighter, wanted pirates
    trafficSetup(this); // src/traffic.js: civilian ships and the station police
    asteroidsSetup(this); // src/asteroids.js: the Kepler belt
    feelInstall(this); // src/feel.js: hit flashes, flame, approach rings, arrival zoom
    shipsInstall(this); // src/ships.js: flames, trails, shield flash, smoke and sparks on every ship
    cruiseSetup(this); cruiseFarBodies(this); // src/cruise.js: N nav list, C cruise, and the bodies out in far space
    jumpSetup(this); // src/jump.js: the jump charge, and the F key for the fuel ranger
  }

  killDrone(e) { // one place for bullets and ramming to finish an enemy
    const wanted = e.wanted, x = e.x, y = e.y, def = e.def;
    dropSalvage(this, e); // src/enemies.js
    this.boom.explode(28, x, y); e.destroy(); G.stats.drones++; sfx('boom');
    bountyPay(this, x, y, def); // src/enemies.js: the credits, the gold BOUNTY +N, coins, HUD glow, chime
    if (wanted || e.boss) missionKill(this, e);
  }

  spawnDrone(x, y) { return spawnPirate(this, x, y); } // src/enemies.js picks raider, drone or gunship by the spot

  shoot(group, x, y, rot, speed, now) {
    const b = group.get(x, y);
    if (!b) return null;
    b.enableBody(true, x, y, true, true);
    b.setRotation(rot).setDepth(4);
    b.born = now; b.dmg = 0;
    this.physics.velocityFromRotation(rot, speed, b.body.velocity);
    return b;
  }

  hurt(n, fromX, fromY) {
    if (this.dead || this.leaving || this.time.now < this.ironUntil) return; // brief invulnerability after each hit; the shield flash (ships.js) shows it
    if (this.jmp) jumpCancel(this, 'hit'); // src/jump.js: a charging jump does not survive a hit
    this.ironUntil = this.time.now + HIT_IRON;
    const sh = this.sh, now = this.time.now;
    if (sh && sh.max > 0) { // the shield takes the hit first; whatever it cannot hold goes through to the hull
      sh.last = now; sh.hitAt = now;
      const took = Math.min(sh.pts, n);
      if (took > 0) {
        sh.pts -= took; n -= took;
        feelNumber(this, this.ship.x, this.ship.y - 22, '-' + Math.round(took), '#7fe9ff'); shipsHit(this, this.ship, fromX, fromY);
        if (sh.pts <= 0) { sh.down = now; sfx('empty'); }
        if (n <= 0) { sfx('tick'); this.cameras.main.shake(60, 0.002); return; } // all of it held: a flash and a number, no hull damage
      }
    }
    G.hull -= n; this.cameras.main.shake(120, 0.006); sfx('hit'); feelHit(this, fromX, fromY, n); shipsHit(this, this.ship, fromX, fromY);
    if (G.hull <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.boom.explode(70, this.ship.x, this.ship.y);
    this.ship.setVisible(false); this.ship.body.enable = false;
    // insurance fee: 20% of your credits, never less than 50; too poor to cover it and the ship is rebuilt at half hull
    const owed = Math.max(50, Math.floor(G.credits * 0.2)), fee = Math.min(owed, G.credits);
    G.credits -= fee; G.hull = fee < owed ? Math.ceil(G.maxHull / 2) : G.maxHull;
    if (!missionDeath(this)) toast(this, fee < owed ? 'Ship destroyed. You could only pay ' + fee + ' cr: rebuilt at half hull.' : 'Ship destroyed. Insurance fee -' + fee + ' cr.', '#ff4d6d');
    this.time.delayedCall(2200, () => go(this, 'Station', { arrive: false }));
  }

  update(time, dt) {
    guideTick(this);
    const k = this.k, ship = this.ship, JD = Phaser.Input.Keyboard.JustDown;
    spaceBackdropTick(this); // parallax layers follow the camera
    if (this.dead) return;
    if (this.leaving) { feelFrame(this, time, dt); return; } // docking or landing move is playing (feel.js)
    jumpFrame(this, dt); // src/jump.js: the charge ring, and the jump when it is full
    if (this.leaving) { feelFrame(this, time, dt); return; } // the jump went
    const crs = cruiseFrame(this, time, dt); // src/cruise.js: 'cruise' = the ship flies itself, 'nav' = the nav list is open (no flight input)
    if (crs === 'cruise') {
      this.prompt.setText('');
      missionSpaceUpdate(this, time, dt); trafficUpdate(this, time, dt); asteroidsUpdate(this, time, dt);
      hudTick(this); feelFrame(this, time, dt);
      return;
    }
    const still = crs === 'nav';
    const sh = this.sh; // the shield recharges once it has gone a while without a hit
    if (sh && sh.max > 0 && sh.pts < sh.max && this.time.now - sh.last > sh.delay) sh.pts = Math.min(sh.max, sh.pts + sh.regen * dt / 1000);
    const locked = time < this.lockUntil;
    const left = !still && (k.A.isDown || k.LEFT.isDown), right = !still && (k.D.isDown || k.RIGHT.isDown);
    const up = !still && (k.W.isDown || k.UP.isDown), brake = still || k.S.isDown || k.DOWN.isDown;
    const boost = boostFrame(this, time, dt, locked, up); // src/boost.js: Shift drains the energy ring, Q and E dash

    if (!locked) ship.rotation += ((right ? 1 : 0) - (left ? 1 : 0)) * 0.0036 * shipStat('turn') * dt;
    ship.body.setDrag(brake && !locked ? 0.12 : 0.55);
    ship.body.setMaxSpeed(boostCap(this, boost, dt));
    const acc = shipStat('accel'); // src/fleet.js; the Wren's 720 gives today's 600 while the launch lock holds and 1500 on the boost
    const thrust = locked ? acc * 5 / 6 : (up ? (boost ? acc * 25 / 12 : acc) : 0);
    this.physics.velocityFromRotation(ship.rotation, thrust, ship.body.acceleration);
    if (thrust) {
      const tx = ship.x - Math.cos(ship.rotation) * 20, ty = ship.y - Math.sin(ship.rotation) * 20;
      this.trail.emitParticleAt(tx, ty, boost ? 3 : 2);
    }
    if (!locked && !still && (k.SPACE.isDown || this.input.activePointer.isDown) && time > this.nextFire) {
      this.nextFire = time + fireDelay();
      const shot = this.shoot(this.pb, ship.x + Math.cos(ship.rotation) * 24, ship.y + Math.sin(ship.rotation) * 24, ship.rotation, 950, time);
      if (shot) shot.dmg = shipStat('damage'); // the weapons part: 15, and 20 at tier 3
      sfx('laser'); feelShot(this, ship.x + Math.cos(ship.rotation) * 26, ship.y + Math.sin(ship.rotation) * 26, ship.rotation);
    }
    this.pb.getChildren().forEach(b => { if (b.active && time - b.born > 900) b.disableBody(true, true); });
    this.eb.getChildren().forEach(b => { if (b.active && time - b.born > 1800) b.disableBody(true, true); });

    if (this.launchAt === null) { // the first frame of flight starts the launch grace (playtest 2: time.now was 0 in create, so the first launch of a session had no grace)
      this.launchAt = time;
      if (this.jumped) { this.calmUntil = time + ARRIVE.calm; this.launchAt = time - LAUNCH_GRACE + ARRIVE.calm; this.graceOver = true; } // a jump: 3 s of calm, then the first wave ramps as usual
    }
    if (!this.graceOver && pirateCap(this, time) > 0) { this.graceOver = true; toast(this, 'Patrol cover ends here. Pirates about.', '#ffd37a'); }
    this.aggro = 0; // how many pirates have engaged you this frame (enemies.js caps it while the first wave ramps up)
    this.enemies.getChildren().forEach(d => pirateAI(this, d, ship, time)); // src/enemies.js: chase, strafe, shoot
    enemiesUpdate(this, time); // salvage pods drift and expire

    // dock / land
    const dS = Phaser.Math.Distance.Between(ship.x, ship.y, this.station.x, this.station.y); // (huge when the system has none: spaceNowhere)
    const dP = Phaser.Math.Distance.Between(ship.x, ship.y, this.planet.x, this.planet.y);
    const spd = ship.body.speed;
    let msg = '';
    if (dS < 320) {
      if (spd < 150) { msg = 'L  Dock at ' + sysBody('station').name; if (JD(k.L)) { missionLeaveSpace(this); sfx('dock'); feelDescend(this, this.station, () => go(this, 'Station', { arrive: true })); } }
      else msg = 'Too fast to dock. Hold S to brake';
    } else if (dP < this.planetR + 150) {
      if (spd < 170) { msg = 'L  Land on ' + sysBody('planet').name; if (JD(k.L)) { missionLeaveSpace(this); sfx('thrusters'); feelDescend(this, this.planet, () => go(this, 'Surface')); } }
      else msg = 'Too fast to land. Hold S to brake';
    }
    this.prompt.setText(msg);

    missionSpaceUpdate(this, time, dt); // queues the freighter bar and radar dots for the HUD
    trafficUpdate(this, time, dt); // src/traffic.js
    asteroidsUpdate(this, time, dt); // src/asteroids.js: rocks, ore, cargo
    hudTick(this); // src/hud.js: gauges, checklist, radar, objective marker
    feelFrame(this, time, dt); // src/feel.js: flame, velocity line, approach rings, hit cues
  }
}
