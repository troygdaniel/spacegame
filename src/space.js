// ---------- Space: fly, fight, dock, land ----------
// a system with no station or no planet in its data (Kestrel until card u-b5, and the deep space of a pull-out): the scene still has an object where
// the code looks for one, far outside the world, so every distance to it comes out huge and nothing is ever near it. nowhere marks it for the few
// places that would draw it (hud.js)
const spaceNowhere = () => ({ x: -60000, y: -60000, nowhere: true, active: false });
// which of the eight ways a step of (dx, dy) goes; the screen's y grows downward, so north is up
function spaceCompass(dx, dy) { return ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8]; }
// the banner of a launch from the station: where the call you carry sends you and which way that is, or only "Launch clear." (no call, a goal
// in another system, a goal right beside the pad). It named Kepler-4b on every launch, whatever the call: on an escort that was the wrong way.
// It is shown before the call's own ships are in space (missionSpaceSetup), so an escort gives where the MULE is bound, the gate.
function spaceLaunchLine(s) {
  const plain = 'Launch clear.';
  if (G.mission !== 'accepted' || typeof missionTarget !== 'function') return plain;
  let t = null;
  try { const view = Object.create(s); view.mx = {}; t = missionTarget(view); } catch (e) { t = null; } // a call whose target needs its ships: no direction rather than no launch
  const home = spaceHomeDock();
  if (!t || !t.name || (home && t.name === home.name)) return plain; // the fallback of missionTarget is the station you have just left
  const dx = t.x - s.ship.x, dy = t.y - s.ship.y;
  if (!(Math.hypot(dx, dy) > 600)) return plain;
  return plain + ' ' + t.name + ' is to the ' + spaceCompass(dx, dy) + '.';
}
// ---- more than one dock in a system (card space-game-more-than-one-dock) ----
// Every station row of the system's data is a dock: drawn, with a dock prompt near it, and G.lastDock is the one you docked at (the pump, the yard,
// the fleet and the launch are that one's). The scene keeps them in s.docks: [{ def: the body's row, obj: what is drawn }]. s.station stays, for the
// code that wants "the station" (the police, the traffic, the escort's start): it is the dock you launched from, else the system's first.
const DOCK_REACH = 320, DOCK_SPEED = 150; // px from a dock's centre the prompt comes on, and the speed (px/s) under which L docks
// the dock you launch from: the station row with the id of G.lastDock when it is in this system, else the first station row, else null
function spaceHomeDock(id) { const all = sysBodies('station', id); return all.find(b => b.id === G.lastDock) || all[0] || null; }
// the nearest of docks ([{ def }] or the rows themselves) to a point, with how far: { dock, d }, or null when there is none
function spaceDockNearest(docks, x, y) {
  let best = null;
  (docks || []).forEach(k => { const b = k.def || k, d = Math.hypot(b.x - x, b.y - y); if (!best || d < best.d) best = { dock: k, d }; });
  return best;
}
// the dock L would take: the nearest one, when it is inside DOCK_REACH; else null
function spaceDockAt(docks, x, y) { const n = spaceDockNearest(docks, x, y); return n && n.d < DOCK_REACH ? n.dock : null; }
// what the scene draws for the dock the ship is nearest to (the approach ring of src/feel.js goes round it); the home dock with no ship yet
function spaceDockObj(s) { const n = s.ship && s.docks && s.docks.length ? spaceDockNearest(s.docks, s.ship.x, s.ship.y) : null; return n ? n.dock.obj : s.station; }
class Space extends Phaser.Scene {
  constructor() { super('Space'); }
  // from: 'station' (the default), 'surface', 'jump' (the ship comes out of hyperspace: src/jump.js hands over { from: 'jump', to, origin }) or 'pullout'
  // (the tunnel was cut short: src/hyperspace.js hands over { from: 'pullout', deep } and G.deep makes the current system an empty deep space, src/pullout.js)
  init(d) {
    this.from = (d && d.from) || 'station';
    this.jumped = this.from === 'jump';
    this.seamless = !!(d && d.seamless); // started under the tunnel's flash (src/hyperspace.js handOver): the flash is the fade, so no black fade-in of its own
    G.deep = this.from === 'pullout' && d.deep ? d.deep : null;
    if (this.jumped && d.to && G.system !== d.to) enterSystem(d.to, d.origin || null); // src/universe.js: the system, G.known, G.jumps and where the ship appears
  }
  create() {
    this.leaving = false; this.dead = false; this.rammedAt = 0; this.ironUntil = 0;
    this.launchAt = null; this.aggro = 0; this.graceOver = false; // enemies.js: launch grace and first-wave cap; launchAt is set on the first update (the scene clock is still 0 in create on a fresh page)
    shipRefresh(this); // src/ships.js: the ship texture shows the upgrade tiers you own
    shipSync(); // src/fleet.js: the hull cap comes from the model and its plating
    const WS = sysDef().size; this.WS = WS; // src/universe.js: the current system, from src/data_systems.js
    this.physics.world.setBounds(0, 0, WS, WS);
    if (!this.seamless) this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBounds(0, 0, WS, WS);
    spaceBackdrop(this, !!G.deep); // src/art_world.js: nebula, parallax star layers, distant sun, giant and moon (deep space has only stars)
    this.events.once('shutdown', () => { G.deep = null; }); // a pull-out lives only as long as this scene shows it

    const land = G.deep ? null : missionLandBody(); // src/missions.js: the planet of a rescue call played in this system (its file names the body), when it is landable; deep space keeps G.system on the books but has no planet (the call's body is looked up by that id and would put Kepler-4b in the empty world)
    const stDef = spaceHomeDock(), plDef = land || sysBody('planet'); // the dock you launch from (G.lastDock), else the system's first
    this.docks = sysBodies('station').map(def => { // every station row is a dock
      const built = stationBuild(this, def); // src/stationart.js: Halcyon's ring, a small outpost, or one of the looks, by the body's art
      label(this, def.x, def.y + built.labelDy, def.name.toUpperCase(), '#38e1ff', 18);
      if (def.art === 'station') stationFx(this, built.obj); // src/stationart.js: Halcyon's spinning hub and ring, beacons, docking lane, Kestrel Outpost scenery
      return { def, obj: built.obj };
    });
    this.station = stDef ? this.docks.find(k => k.def === stDef).obj : spaceNowhere();
    // you can land only where there is a surface to land on: the Surface scene is the rescue call's (a world of the Hollow gets its own later), so only that call's planet is landable
    this.canLand = !!land;
    if (plDef) {
      this.planet = this.add.image(plDef.x, plDef.y, plDef.kind ? planetTexture(this, plDef.kind, plDef.seed) : plDef.art); this.planetR = plDef.r; // a planet of a kind and seed is made on first use (src/art_world.js)
      if (plDef.kind) this.planet.setScale(plDef.r / (plDef.kind === 'ringed' ? 206 : 300)); // the globe is 300 px (ringed: 206) in its 800 px canvas
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
    this.lockUntil = this.time.now + (arr || G.deep ? 0 : 1300); // no launch lock coming out of a tunnel, and none in deep space
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

    // (G.system is still the system you left while deep space is up) the pirates that are always here: the rescue call's file lists them (guards round
    // its planet, pickets on the way to it; content/missions/rescue.md, src/missions.js missionPirates). The other systems spawn from their table.
    if (!G.deep) missionPirates().forEach(p => this.spawnDrone(p.x, p.y));
    this.time.addEvent({
      delay: pirateTable().every, loop: true, callback: () => { // src/enemies.js: the system's spawn table
        if (this.dead || this.cruising || this.enemies.countActive() >= pirateTable().max || pirateCap(this, this.time.now) === 0 || (this.calmUntil && this.time.now < this.calmUntil)) return; // quiet during the launch grace and a jump's calm
        const a = Math.random() * Math.PI * 2;
        const x = Phaser.Math.Clamp(this.ship.x + Math.cos(a) * SPAWN_DIST, 100, WS - 100);
        const y = Phaser.Math.Clamp(this.ship.y + Math.sin(a) * SPAWN_DIST, 100, WS - 100);
        const near = spaceDockNearest(this.docks, x, y); // no pirate spawns on top of a dock, whichever one
        if (!near || near.d > SPAWN_KEEP_OUT) this.spawnDrone(x, y);
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

    this.k = this.input.keyboard.addKeys('W,A,S,D,E,Q,L,R,SPACE,SHIFT,UP,DOWN,LEFT,RIGHT');
    const sh = this.sh = { max: shipStat('shieldMax'), pts: shipStat('shieldMax'), regen: shipStat('shieldRegen'), delay: shipStat('shieldDelay'), last: -1e9, hitAt: -1e9, down: -1e9 }; // the shield part (src/data_parts.js): full at launch
    boostInit(this); // src/boost.js: boost energy and the Q/E dash
    this.nextFire = 0;
    this.prompt = floatPrompt(this, this.ship); // key cap above you instead of a strip at the bottom (src/ui.js)
    // the key line, bottom left: a readable grey-blue with a dark outline, so the sun's rays and the station do not wash it out, and hidden
    // while a first-run tip of the guide is up (update below), because that tip says the same keys two lines higher (docs/CRITIC.md run 1, finding 19)
    this.keyLine = this.add.text(24, H - 44, 'W thrust  A/D turn  S brake  Shift boost  Q/E dash  Space or click fire  L land/dock  P autopilot  N places  B ships', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9fbdd1', stroke: '#02060d', strokeThickness: 4
    }).setScrollFactor(0).setDepth(100);
    if (this.from === 'station') { bountyReset(); toast(this, spaceLaunchLine(this), '#9fe9ff'); } // enemies.js: a new flight's bounty count starts at 0
    else if (this.jumped) { const fresh = galaxyChart(); toast(this, 'Arrived in ' + sysDef().name + '.' + (fresh.length ? ' Charted in range: ' + fresh.map(x => x.name).join(', ') + '. G opens the galaxy map.' : ''), '#9fe9ff'); } // src/galaxymap.js: the stars in range of here are now known
    missionSpaceSetup(this); // src/missions.js: escort freighter, wanted pirates
    trafficSetup(this); // src/traffic.js: civilian ships and the station police
    asteroidsSetup(this); // src/asteroids.js: the Kepler belt
    feelInstall(this); // src/feel.js: hit flashes, flame, approach rings, arrival zoom
    shipsInstall(this); // src/ships.js: flames, trails, shield flash, smoke and sparks on every ship
    cruiseSetup(this); cruiseFarBodies(this); // src/cruise.js: N nav list, C cruise, and the bodies out in far space
    autopilotSetup(this); // src/autopilot.js: P flies the ship to the target at local speed
    assistSetup(this); // src/assist.js: Z switches the flight assist on; 1 Approach, 2 Keep at range fly the ship about its target
    overviewSetup(this); // src/overview.js: B shows the list of what is around; a click on a row, or W S and Enter, makes it the target
    jumpSetup(this); // src/jump.js: the jump charge, and the F key for the fuel ranger
    deepSetup(this); // src/pullout.js: the pirates of a pull-out in deep space, or a nest's entry pirates
    camzoomSetup(this); // src/camzoom.js: the mouse wheel zooms the view; the HUD keeps its size on a camera of its own
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
        sh.pts -= took; n -= took; sh.hurt = true; // sh.hurt: the recharge below plays its sound once when the shield is whole again
        feelNumber(this, this.ship.x, this.ship.y - 22, '-' + Math.round(took), '#7fe9ff'); shipsHit(this, this.ship, fromX, fromY);
        if (sh.pts <= 0) { sh.down = now; sfx('shieldDown'); }
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
    this.time.delayedCall(2200, () => {
      const home = dockSystem(G.lastDock); if (home) G.system = home; // you wake docked at the last station: its system is where you are (a jump or a pull-out left G.system elsewhere)
      go(this, 'Station', { arrive: false });
    });
  }

  update(time, dt) {
    guideTick(this);
    if (this.keyLine) this.keyLine.setVisible(G.guideDone || !(this._gh && this._gh.visible)); // not under a first-run tip, which says the keys itself; the later travel tip does not, so the line stays
    const k = this.k, ship = this.ship, JD = Phaser.Input.Keyboard.JustDown;
    spaceBackdropTick(this); // parallax layers follow the camera
    if (this.dead) return;
    if (this.leaving) { feelFrame(this, time, dt); return; } // docking or landing move is playing (feel.js)
    deepFrame(this); // src/pullout.js: the last pirate of a pull-out gone starts the way back into the tunnel
    jumpFrame(this, dt); // src/jump.js: the charge ring, and the jump when it is full
    if (this.leaving) { feelFrame(this, time, dt); return; } // the jump went
    overviewFrame(this, time); // src/overview.js: the list's own keys, read before the flight keys below
    const crs = cruiseFrame(this, time, dt); // src/cruise.js: 'cruise' = the ship flies itself, 'nav' = the nav list is open (no flight input)
    const ap = autopilotFrame(this, time, dt, crs); // src/autopilot.js: 'auto' = the autopilot flies the ship locally, 'cruise' = it just engaged a cruise
    const ast = assistFrame(this, time, dt, crs, ap); // src/assist.js: 'assist' = an order of the flight assist flies the ship (any flight key gives the stick back; the guns stay yours)
    if (crs === 'cruise' || ap === 'cruise') {
      this.prompt.setText('');
      missionSpaceUpdate(this, time, dt); trafficUpdate(this, time, dt); asteroidsUpdate(this, time, dt);
      hudTick(this); feelFrame(this, time, dt);
      return;
    }
    const still = crs === 'nav' || ap === 'auto'; // no flight input: the list has the keys, or the autopilot has the stick (any key gives it back)
    const sh = this.sh; // the shield recharges once it has gone a while without a hit
    if (sh && sh.max > 0 && sh.pts < sh.max && this.time.now - sh.last > sh.delay) { sh.pts = Math.min(sh.max, sh.pts + sh.regen * dt / 1000); if (sh.pts >= sh.max && sh.hurt) { sh.hurt = false; sfx('shieldUp'); } }
    const locked = time < this.lockUntil;
    const left = !still && (k.A.isDown || k.LEFT.isDown), right = !still && (k.D.isDown || k.RIGHT.isDown);
    const up = !still && (k.W.isDown || k.UP.isDown), brake = still || k.S.isDown || k.DOWN.isDown;
    const boost = boostFrame(this, time, dt, locked, up); // src/boost.js: Shift drains the energy ring, Q and E dash

    if (!locked) ship.rotation += handlingTurn(this, (right ? 1 : 0) - (left ? 1 : 0), dt) * 0.0036 * shipStat('turn') * dt; // src/handling.js: Classic or Heavy
    ship.body.setDrag(handlingDrag(brake && !locked));
    ship.body.setMaxSpeed(boostCap(this, boost, dt));
    const acc = shipStat('accel'); // src/fleet.js; the Wren's 720 gives today's 600 while the launch lock holds and 1500 on the boost
    const thrust = (locked ? acc * 5 / 6 : (up ? (boost ? acc * 25 / 12 : acc) : 0)) * handlingThrust(this, locked || up, dt);
    this.physics.velocityFromRotation(ship.rotation, thrust, ship.body.acceleration);
    if (thrust) {
      const tx = ship.x - Math.cos(ship.rotation) * 20, ty = ship.y - Math.sin(ship.rotation) * 20;
      this.trail.emitParticleAt(tx, ty, boost ? 3 : 2);
    }
    if (ap === 'auto') autopilotDrive(this, dt); // the autopilot sets the heading and the speed over the thrust code above
    if (ast === 'assist') assistDrive(this, dt); // the flight assist does the same, with its own flight model
    if (JD(k.R)) aimToggle(this); // src/autotarget.js: the sixth part, on or off (R is free in flight; X belongs to the nav list, which reads it every frame)
    aimUpdate(this, ship, locked || still); // the reticle on the raider the guns would turn to (none while it is off, unfitted, or you cannot fire)
    if (!locked && !still && (k.SPACE.isDown || this.input.activePointer.isDown) && time > this.nextFire) {
      this.nextFire = time + fireDelay();
      const rot = aimAngle(this, ship); // the ship's heading, or toward the nearest raider in reach when the autotarget is fitted and on
      const shot = this.shoot(this.pb, ship.x + Math.cos(ship.rotation) * 24, ship.y + Math.sin(ship.rotation) * 24, rot, SHOT_SPEED, time);
      if (shot) shot.dmg = shipStat('damage'); // the weapons part: 15, and 20 at tier 3
      sfx('laser'); feelShot(this, ship.x + Math.cos(ship.rotation) * 26, ship.y + Math.sin(ship.rotation) * 26, rot);
    }
    this.pb.getChildren().forEach(b => { if (b.active && time - b.born > SHOT_LIFE) b.disableBody(true, true); });
    this.eb.getChildren().forEach(b => { if (b.active && time - b.born > 1800) b.disableBody(true, true); });

    if (this.launchAt === null) { // the first frame of flight starts the launch grace (playtest 2: time.now was 0 in create, so the first launch of a session had no grace)
      this.launchAt = time;
      if (this.jumped) { this.calmUntil = time + ARRIVE.calm; this.launchAt = time - LAUNCH_GRACE + ARRIVE.calm; this.graceOver = true; } // a jump: 3 s of calm, then the first wave ramps as usual
    }
    if (G.deep) this.graceOver = true; // no "patrol cover ends" notice in deep space: the pirates are already here
    if (!this.graceOver && pirateCap(this, time) > 0) { this.graceOver = true; toast(this, 'Patrol cover ends here. Pirates about.', '#ffd37a'); }
    this.aggro = 0; // how many pirates have engaged you this frame (enemies.js caps it while the first wave ramps up)
    this.enemies.getChildren().forEach(d => pirateAI(this, d, ship, time)); // src/enemies.js: chase, strafe, shoot
    enemiesUpdate(this, time); // salvage pods drift and expire

    // dock / land
    const dock = spaceDockAt(this.docks, ship.x, ship.y); // the dock in reach, of all the system has (none in a system with no station: tests/nostation.mjs)
    const dP = Phaser.Math.Distance.Between(ship.x, ship.y, this.planet.x, this.planet.y);
    const spd = ship.body.speed;
    let msg = '';
    if (dock) {
      if (spd < DOCK_SPEED) { msg = 'L  Dock at ' + dock.def.name; if (JD(k.L)) { missionLeaveSpace(this); sfx('dock'); G.lastDock = dock.def.id; fleetSync(); feelDescend(this, dock.obj, () => go(this, 'Station', { arrive: true })); } } // lastDock: where the pump, the yard and the fleet are now (src/fleet.js)
      else msg = 'Too fast to dock. Hold S to brake';
    } else if (this.canLand && dP < this.planetR + 150) {
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
