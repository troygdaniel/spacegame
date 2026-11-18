// ---------- Cruise: fast travel inside one star system (docs/UNIVERSE.md 2.2) ----------
// N opens the nav list: every body you know of, nearest first, with its distance and the cruise time to it. Enter picks one as your
// target (the amber objective arrow points at it, the radar arrow stays on the mission). C engages cruise toward the target: the ship turns
// by itself, speeds up to 8000 px/s (6000 until the systems were spread out 3 times, card space-game-system-distances: the longest
// trip in a system now takes about twice as long as it did, not three times) and slows down so it arrives about 900 px out at under 150 px/s, then drops back to local flight.
// A and D nudge the heading, S cancels. Cruise costs no fuel and does nothing else: no shooting, no docking. The short legs and the last
// mile are the autopilot's (src/autopilot.js: P in the list or with a target, or Enter on the Tab map); it uses cruise for the long middle.
//   space.js   calls cruiseSetup(this) and cruiseFarBodies(this) in create(), cruiseFrame(this, time, dt) first thing in update()
//              (it returns 'cruise' while the ship flies itself, 'nav' while the list is open, '' otherwise) and tests this.cruising
//              where a ship at cruise speed must not be hit or spawn pirates
//   hud.js     draws s.cr.target as the objective, shows the speed in km/s and dims the radar while s.cruising
//   data       the far bodies it draws are in src/data_systems.js (planets with a kind and seed, scenery with a look)
//   the look   streaks, the cyan vignette, zoom 0.85 and the CRUISE readout (cruiseLook); amber bracket corners on the nav target that tighten
//              as the ship closes in, in cruise and after the drop-out (cruiseBrackets); a soft white flash and a low thud when cruise drops out (cruiseFlash, SFX.cruiseOff)
const CRUISE = {
  top: 8000, accel: 4000, stop: 900, brake: 3, dropSpeed: 150, // px/s, px/s2, px from the body, 1/s (limit = brake x distance left), px/s
  turn: 0.006, nudgeMax: 0.5, nudgeRate: 0.0014,                // auto-steer rad per ms, how far A and D can pull the heading (rad), rad per ms held
  lockMass: 2500, lockHostile: 1500, abortHostile: 1100,        // px: no cruise this close to a station or planet, or to a hostile; a hostile this close ends it
  zoom: 0.85, minLeg: 1200                                      // camera zoom in cruise; a target within stop + minLeg is just flown to
};
// interdiction (docs/UNIVERSE.md 5.1): pirates can pull you out of cruise. Every cruising second rolls `rate x danger`; never within `safe` px of a
// station, never twice within `cooldown` s of flying, never before the player has made `calm` jumps (so the first look at hyperspace is calm).
// When it fires: the INTERDICTED banner and a siren, cruise drops to 150 px/s, two or three pirates (the system's table) appear `ahead` px in front.
const INTERDICT = { rate: 0.004, safe: 4000, cooldown: 90, calm: 2, ahead: 900, spread: 170, warnMs: 1200 };
G.interdictCool = 0; // seconds of flying left before the next one (not saved)
CRUISE.rnd = Math.random; // tests replace this to force or forbid the roll
const CRUISE_ROWS = 8, CRUISE_TYPES = { station: 'STATION', planet: 'PLANET', belt: 'BELT', scenery: 'OUTPOST', poi: 'SIGNAL', gate: 'GATE' };

// the chance that one frame of cruise (dt ms) in a system of this danger is interdicted
function cruiseInterdictChance(danger, dt) { return INTERDICT.rate * danger * dt / 1000; }
// may it happen at all right now: not too close to a station, not on cooldown, not before the calm jumps
function cruiseInterdictOk(s) {
  if (G.interdictCool > 0 || (G.jumps | 0) < INTERDICT.calm || !(sysDef().danger > 0)) return false;
  return sysBodies('station').every(b => Math.hypot(b.x - s.ship.x, b.y - s.ship.y) >= INTERDICT.safe);
}
function cruiseInterdict(s) {
  const cr = s.cr, ship = s.ship, sys = sysDef(), table = pirateTable(sys), ux = Math.cos(ship.rotation), uy = Math.sin(ship.rotation), WS = s.WS;
  G.interdictCool = INTERDICT.cooldown;
  cr.speed = Math.min(cr.speed, CRUISE.dropSpeed);
  cruiseEnd(s, 'interdict');
  const n = sys.danger >= 4 ? 3 : Phaser.Math.Between(2, 3);
  for (let i = 0; i < n; i++) { // a loose line across your path, 900 px ahead, turned toward you
    const off = (i - (n - 1) / 2) * INTERDICT.spread;
    const x = Phaser.Math.Clamp(ship.x + ux * INTERDICT.ahead - uy * off, 100, WS - 100), y = Phaser.Math.Clamp(ship.y + uy * INTERDICT.ahead + ux * off, 100, WS - 100);
    const d = spawnPirate(s, x, y, pickPirateType(table.weights, Math.random()));
    d.ambush = true; d.rotation = Math.atan2(ship.y - y, ship.x - x); // not held back by the first-wave cap
  }
  cr.warnUntil = s.time.now + INTERDICT.warnMs;
  if (s._hud) s._hud.interdictUntil = s.time.now + 2500; // hud.js: the INTERDICTED banner and the red edge
  s.cameras.main.shake(500, 0.008); sfx('interdict');
  toast(s, 'Interdicted. Pirates ahead: fight, or fly away.', '#ff4d6d');
}

// seconds for a leg of this length, from rest, by the same speed rules the ship follows (plus 0.4 s to turn onto the heading)
function cruiseEta(dist) {
  const d = Math.max(0, dist - CRUISE.stop), h = 0.05;
  let t = 0.4, v = 0, x = 0;
  for (let i = 0; i < 1000 && x < d - 50; i++) {
    const lim = Math.min(CRUISE.top, CRUISE.brake * Math.max(0, d - x));
    v = v > lim ? lim : Math.min(lim, v + CRUISE.accel * h); x += v * h; t += h;
  }
  return t;
}

// every body you know of in this system: stations, planets, belts, gates and scenery are always known; a salvage site once you have found it
function cruiseKnown(s) {
  const out = [];
  sysBodies().forEach(b => {
    if (b.type === 'station' || b.type === 'planet' || b.type === 'belt' || b.type === 'scenery' || b.type === 'gate') out.push(b);
    else if (b.type === 'poi' && (typeof siteState === 'function' ? siteState(b) : G.poi[b.id]) >= 1) out.push(b);
  });
  if (typeof POIRUN !== 'undefined' && POIRUN) POIRUN.sig.filter(q => q.state === 1).forEach(q => out.push({ id: q.id, type: 'poi', name: q.name, x: q.x, y: q.y }));
  const sh = s.ship;
  return out.map(b => ({ id: b.id, name: b.name, type: b.type, look: b.look, x: b.x, y: b.y, r: b.r || 0, dist: Math.hypot(b.x - sh.x, b.y - sh.y) })).sort((a, b) => a.dist - b.dist);
}

function cruiseSetup(s) {
  const cr = s.cr = {
    target: null, active: false, cancel: false, speed: 0, nudge: 0, navOpen: false, sel: 0, list: [], listAt: 0, k: null,
    lk: 0, z: 1, rows: [], readAt: 0, ps: [], endWhy: '' // endWhy: how the last cruise ended (the autopilot reads it, src/autopilot.js)
  };
  s.cruising = false;
  s.events.once('shutdown', stopCruiseHum); // the rumble never outlives the scene (a death, a dock, a restart)
  cr.k = s.input.keyboard.addKeys('N,C,X,ENTER,UP,DOWN,W,S');
  // the cyan edge vignette: clear in the middle, cyan toward the corners
  if (!s.textures.exists('cruise-vig')) {
    const t = s.textures.createCanvas('cruise-vig', 320, 180), c = t.getContext('2d'), g = c.createRadialGradient(160, 90, 60, 160, 90, 200);
    g.addColorStop(0, 'rgba(56,225,255,0)'); g.addColorStop(0.55, 'rgba(56,225,255,0.10)'); g.addColorStop(1, 'rgba(56,225,255,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180); t.refresh();
  }
  cr.vig = s.add.image(W / 2, H / 2, 'cruise-vig').setScale(W / 320, H / 180).setScrollFactor(0).setDepth(98).setAlpha(0).setVisible(false);
  cr.fx = s.add.graphics().setScrollFactor(0).setDepth(-7);
  cr.br = s.add.graphics().setDepth(99); cr.brInfo = null; cr.flash = null; // brackets live in the world, on the target: the camera moves them, so they never lag a fast ship
  for (let i = 0; i < 70; i++) cr.ps.push({ x: Math.random() * W, y: Math.random() * H, l: 0.4 + Math.random() * 1.2 });
  cr.read = s.add.text(W / 2, 128, '', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#9fe9ff' }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setStroke('#02060d', 4).setVisible(false);

  navpanelSetup(s); // src/navpanel.js: the navigation panel on the left, which is the N list now (it keeps cr.list, cr.sel and cr.ui for the files that read them)
}

// ---- the far bodies of the system: planets with a kind (art_world.js) and scenery with a look (stationart.js) ----
function cruiseFarBodies(s) {
  sysBodies('planet').slice(1).forEach(b => { // the first planet is Kepler-4b, which space.js draws itself
    const key = b.kind ? planetTexture(s, b.kind, b.seed) : b.art;
    s.add.image(b.x, b.y, key).setDepth(0).setScale(b.r / (b.kind === 'ringed' ? 206 : 300)); // the globe is 300 px (ringed: 206) in its 800 px canvas
    label(s, b.x, b.y - b.r - 64, b.name.toUpperCase(), '#ffb454', 18);
  });
  sysBodies('scenery').filter(b => b.look).forEach(b => {
    stationLookFx(s, b.look, b.x, b.y, { depth: 1 });
    label(s, b.x, b.y + (b.labelDy || -240), b.name.toUpperCase(), '#9aa7b3', 16);
  });
}

// ---- the nav list ----
function cruiseNavOpen(s) { navpanelOpen(s, false); }  // src/navpanel.js draws the list and reads its keys; these three names are what the other files and the tests call
function cruiseNavClose(s) { navpanelClose(s); }
function cruiseNavDraw(s) { navpanelDraw(s); }

function cruisePick(s, b) {
  const cr = s.cr;
  cr.target = { id: b.id, name: b.name, type: b.type, x: b.x, y: b.y, r: b.r || 0 };
  toast(s, 'Target: ' + b.name + '. C cruises, P flies you there.', '#ffd37a'); sfx('chime');
}

// ---- engage ----
function cruiseEngage(s) {
  const cr = s.cr, ship = s.ship, t = cr.target, say = (m, c) => { toast(s, m, c || '#ffd37a'); sfx('empty'); };
  const dist = t ? Math.hypot(t.x - ship.x, t.y - ship.y) : 0, d = (o, p) => Math.hypot(o.x - p.x, o.y - p.y);
  if (!t) return say('No destination. Press N and pick one.');
  if (dist < CRUISE.stop + CRUISE.minLeg) return say(t.name + ' is close: fly there.');
  const mass = sysBodies('station').concat(sysBodies('planet')).find(b => d(ship, b) < CRUISE.lockMass);
  if (mass) return say('Too close to the mass: fly clear of ' + mass.name + '.', '#ff4d6d');
  if (s.enemies.getChildren().some(e => e.active && d(ship, e) < CRUISE.lockHostile)) return say('Hostiles near: cruise locked.', '#ff4d6d');
  cr.active = true; s.cruising = true; cr.cancel = false; cr.nudge = 0; cr.speed = Math.min(ship.body.speed, 600);
  s.cameras.main.startFollow(ship, true, 1, 1); s.cameras.main.shake(260, 0.003);
  sfx('cruiseOn'); startCruiseHum(); toast(s, 'Cruise to ' + t.name + '. S cancels, A and D nudge.', '#9fe9ff');
}

function cruiseEnd(s, why) {
  const cr = s.cr, ship = s.ship, t = cr.target;
  cr.active = false; s.cruising = false; cr.endWhy = why; stopCruiseHum();
  const sp = Math.min(cr.speed, why === 'cut' ? shipStat('vmax') : CRUISE.dropSpeed);
  ship.body.setVelocity(Math.cos(ship.rotation) * sp, Math.sin(ship.rotation) * sp).setDrag(0.55);
  cr.speed = 0; cr.cancel = false; cr.nudge = 0; s.lockUntil = 0;
  if (why !== 'interdict') { s.cameras.main.shake(220, 0.0035); sfx('cruiseOff'); } // an interdiction has its own look and sound (cruiseInterdict)
  if (why !== 'quiet' && why !== 'interdict') cruiseFlash(s, why);
  if (why === 'arrived') toast(s, (t ? t.name : 'Destination') + ' ahead. Cruise ended.', '#6dff9c');
  else if (why === 'hostile') toast(s, 'Contact ahead: cruise dropped.', '#ff4d6d');
  else if (why === 'cut') toast(s, 'Cruise cancelled.', '#ffd37a');
}

// one frame of cruise: steer, speed up or slow down by the speed limit, check for trouble
function cruiseStep(s, time, dt) {
  const cr = s.cr, ship = s.ship, t = cr.target, k = s.k, dts = dt / 1000;
  if (s.enemies.getChildren().some(e => e.active && Math.hypot(e.x - ship.x, e.y - ship.y) < CRUISE.abortHostile)) { cr.speed = Math.min(cr.speed, CRUISE.dropSpeed); return cruiseEnd(s, 'hostile'); }
  if (cruiseInterdictOk(s) && CRUISE.rnd() < cruiseInterdictChance(sysDef().danger, dt)) return cruiseInterdict(s);
  const dx = t.x - ship.x, dy = t.y - ship.y, dist = Math.hypot(dx, dy);
  if (k.S.isDown || k.DOWN.isDown) cr.cancel = true;
  const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
  cr.nudge = Phaser.Math.Clamp(cr.nudge + ((right ? 1 : 0) - (left ? 1 : 0)) * CRUISE.nudgeRate * dt, -CRUISE.nudgeMax, CRUISE.nudgeMax);
  if (!left && !right) cr.nudge *= Math.pow(0.02, dts); // the heading eases back onto the target
  const want = Math.atan2(dy, dx) + cr.nudge;
  ship.rotation = Phaser.Math.Angle.RotateTo(ship.rotation, want, CRUISE.turn * dt);
  const aligned = Math.abs(Phaser.Math.Angle.Wrap(want - ship.rotation)) < 0.45;
  // the speed limit is what stops you flying through a planet: 3 x the distance left after the 900 px stop, never above CRUISE.top
  const limit = cr.cancel ? 0 : Math.min(CRUISE.top, CRUISE.brake * Math.max(0, dist - CRUISE.stop));
  if (cr.speed > limit) cr.speed = Math.max(limit, cr.speed - (cr.cancel ? 12000 : 40000) * dts);
  else if (aligned) cr.speed = Math.min(limit, cr.speed + CRUISE.accel * dts);
  ship.body.setAcceleration(0, 0).setMaxSpeed(CRUISE.top + 500).setDrag(1);
  ship.body.setVelocity(Math.cos(ship.rotation) * cr.speed, Math.sin(ship.rotation) * cr.speed);
  if (cr.cancel) { if (cr.speed < 400) cruiseEnd(s, 'cut'); }
  else if (limit <= CRUISE.dropSpeed && cr.speed <= CRUISE.dropSpeed) cruiseEnd(s, 'arrived');
}

// the drop-out flash: soft white over the world and under the HUD (so the numbers stay readable), gone in about 0.4 s; lighter when you cut it yourself
function cruiseFlash(s, why) {
  const cr = s.cr;
  if (cr.flash && cr.flash.active) cr.flash.destroy();
  const r = cr.flash = s.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0xffffff, why === 'cut' ? 0.22 : 0.45).setScrollFactor(0).setDepth(97); // twice the screen: the zoom shrinks screen-fixed things
  s.tweens.add({ targets: r, alpha: 0, duration: 420, ease: 'Sine.easeOut', onComplete: () => r.destroy() });
}

// the target's bracket corners (amber, the colour of the thing to do) on the nav target, while it is on screen: in cruise and after the drop-out,
// until you arrive (the target clears itself 500 px from its rim). Wide while it is far, tightening onto the body as the ship closes in,
// so the arrival has something to land on. They live in the world, on the target, in world units: the camera scales and moves them, so they
// never lag a ship at cruise speed. The drop-out is 900 px out, just past the edge of a 0.85 zoom screen, so the corners are never under 150 px:
// a small outpost still shows its two near corners. cr.brInfo keeps what was drawn (tests read it).
function cruiseBracketHalf(t, d, z) { // screen px
  const body = Math.max((t.r || 0) * z + 30, 150);
  return Phaser.Math.Linear(body, body + 140, Phaser.Math.Clamp((d - (t.r || 0) - 500) / 2500, 0, 1));
}
function cruiseBrackets(s, time) {
  const cr = s.cr, g = cr.br, t = cr.target, cam = s.cameras.main, z = cam.zoom;
  g.clear(); cr.brInfo = null;
  if (!t || s.dead) return;
  const d = Math.hypot(t.x - s.ship.x, t.y - s.ship.y), half = cruiseBracketHalf(t, d, z) * (1 + 0.04 * Math.sin(time / 140));
  const sx = (t.x - cam.worldView.x) * z, sy = (t.y - cam.worldView.y) * z;
  if (sx < -half || sx > W + half || sy < -half || sy > H + half) return;
  hudBrackets(g, t.x, t.y, half / z, Math.min(46, half * 0.3) / z, AMBER, 0.95, 2.5 / z);
  cr.brInfo = { x: Math.round(sx), y: Math.round(sy), half: Math.round(half), d: Math.round(d) };
}

// ---- the look: streaks, vignette, zoom, the readout. Runs every frame, cruising or not, so it can fade out ----
function cruiseLook(s, time, dt) {
  const cr = s.cr, cam = s.cameras.main, on = cr.active, e = Math.min(1, dt * 0.005);
  cr.lk += ((on ? Phaser.Math.Clamp(cr.speed / 2500, 0, 1) : 0) - cr.lk) * e;
  const k = cr.lk;
  cr.vig.setTint(time < (cr.warnUntil || 0) ? 0xff4d6d : 0xffffff).setVisible(k > 0.02).setAlpha(k).setScale(W / 320 / cam.zoom, H / 180 / cam.zoom); // zoom shrinks screen-fixed things too: scale it back to the edges
  cr.fx.clear();
  cruiseBrackets(s, time);
  if (k > 0.02) {
    const ship = s.ship, dx = Math.cos(ship.rotation), dy = Math.sin(ship.rotation), sp = Math.max(300, cr.speed) * 0.55, g = cr.fx, ds = dt / 1000;
    cr.ps.forEach(p => {
      p.x -= dx * sp * ds * p.l; p.y -= dy * sp * ds * p.l;
      if (p.x < -450) p.x += W + 900; else if (p.x > W + 450) p.x -= W + 900;
      if (p.y < -450) p.y += H + 900; else if (p.y > H + 450) p.y -= H + 900;
      const len = (50 + 330 * p.l) * k; // twice the length of the boost streaks at full speed
      g.lineStyle(p.l > 1.2 ? 2.4 : 1.5, p.l > 1.2 ? 0xffffff : 0x9fe9ff, (0.2 + 0.22 * p.l) * k);
      g.lineBetween(p.x, p.y, p.x + dx * len, p.y + dy * len);
    });
  }
  // the camera eases out to 0.85 in cruise and back to 1 after; follow is tight in between so a fast ship stays in the middle
  const zt = on ? CRUISE.zoom : 1;
  if (on || cr.z !== 1) {
    cr.z += (zt - cr.z) * e;
    if (!on && Math.abs(cr.z - 1) < 0.004) { cr.z = 1; cam.startFollow(s.ship, true, 0.12, 0.12); }
    cam.setZoom(cr.z);
  }
  // the readout: where to, how far, how long
  cr.read.setVisible(on);
  if (on && cr.target && time > cr.readAt) {
    cr.readAt = time + 200;
    const d = Math.hypot(cr.target.x - s.ship.x, cr.target.y - s.ship.y);
    cr.read.setText('CRUISE  ' + cr.target.name.toUpperCase() + '   ' + hudFmt(d / 10) + ' km   ' + Math.max(0, Math.round(cruiseEta(d) - 0.4)) + ' s');
  }
}

// one call per frame from Space.update: 'cruise' (the ship flies itself), 'nav' (the list is open: no flight input) or ''
function cruiseFrame(s, time, dt) {
  const cr = s.cr; if (!cr) return '';
  const JD = Phaser.Input.Keyboard.JustDown, k = cr.k, ship = s.ship;
  cruiseLook(s, time, dt);
  if (G.interdictCool > 0) G.interdictCool = Math.max(0, G.interdictCool - dt / 1000); // counts flying time only
  if (s.dead || s.leaving) { if (cr.active) cruiseEnd(s, 'quiet'); if (cr.navOpen) cruiseNavClose(s); return ''; }
  const n = JD(k.N), c = JD(k.C), x = JD(k.X), enter = JD(k.ENTER), up = JD(k.UP) || JD(k.W), down = JD(k.DOWN) || JD(k.S);
  if (s.jmp || G.deep) return ''; // a jump is charging (src/jump.js): no nav list and no cruise until it is done or cancelled; none in deep space after a pull-out either
  // a target that has gone (a random signal that faded) or that you have reached stops being a target
  const t = cr.target;
  if (t && !cr.active) {
    const gone = typeof t.id === 'string' && t.id.indexOf('sig-') === 0 && !(typeof POIRUN !== 'undefined' && POIRUN && POIRUN.sig.some(q => q.id === t.id && q.state === 1));
    if (gone || Math.hypot(t.x - ship.x, t.y - ship.y) < t.r + 500) cr.target = null;
  }
  if (cr.active) { if (!cr.target) cruiseEnd(s, 'cut'); else { cruiseStep(s, time, dt); } return cr.active ? 'cruise' : ''; }
  const nv = navpanelFrame(s, time, { n, x, enter, up, down }); if (nv) return nv; // src/navpanel.js: 'nav' while the panel has the keys
  if (c) cruiseEngage(s);
  return cr.active ? 'cruise' : '';
}
