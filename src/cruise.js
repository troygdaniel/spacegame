// ---------- Cruise: fast travel inside one star system (docs/UNIVERSE.md 2.2) ----------
// N opens the nav list: every body you know of, nearest first, with its distance and the cruise time to it. Enter picks one as your
// target (the amber objective arrow points at it, the radar arrow stays on the mission). C engages cruise toward the target: the ship turns
// by itself, speeds up to 6000 px/s and slows down so it arrives about 900 px out at under 150 px/s, then drops back to local flight.
// A and D nudge the heading, S cancels. Cruise costs no fuel and does nothing else: no shooting, no docking.
//   space.js   calls cruiseSetup(this) and cruiseFarBodies(this) in create(), cruiseFrame(this, time, dt) first thing in update()
//              (it returns 'cruise' while the ship flies itself, 'nav' while the list is open, '' otherwise) and tests this.cruising
//              where a 6000 px/s ship must not be hit or spawn pirates
//   hud.js     draws s.cr.target as the objective, shows the speed in km/s and dims the radar while s.cruising
//   data       the far bodies it draws are in src/data_systems.js (planets with a kind and seed, scenery with a look)
const CRUISE = {
  top: 6000, accel: 4000, stop: 900, brake: 3, dropSpeed: 150, // px/s, px/s2, px from the body, 1/s (limit = brake x distance left), px/s
  turn: 0.006, nudgeMax: 0.5, nudgeRate: 0.0014,                // auto-steer rad per ms, how far A and D can pull the heading (rad), rad per ms held
  lockMass: 2500, lockHostile: 1500, abortHostile: 1100,        // px: no cruise this close to a station or planet, or to a hostile; a hostile this close ends it
  zoom: 0.85, minLeg: 1200                                      // camera zoom in cruise; a target within stop + minLeg is just flown to
};
const CRUISE_ROWS = 8, CRUISE_TYPES = { station: 'STATION', planet: 'PLANET', belt: 'BELT', scenery: 'OUTPOST', poi: 'SIGNAL' };

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

// every body you know of in this system: stations, planets, belts and scenery are always known; a salvage site once you have found it
function cruiseKnown(s) {
  const out = [];
  sysBodies().forEach(b => {
    if (b.type === 'station' || b.type === 'planet' || b.type === 'belt' || b.type === 'scenery') out.push(b);
    else if (b.type === 'poi' && (typeof siteState === 'function' ? siteState(b) : G.poi[b.id]) >= 1) out.push(b);
  });
  if (typeof POIRUN !== 'undefined' && POIRUN) POIRUN.sig.filter(q => q.state === 1).forEach(q => out.push({ id: q.id, type: 'poi', name: q.name, x: q.x, y: q.y }));
  const sh = s.ship;
  return out.map(b => ({ id: b.id, name: b.name, type: b.type, look: b.look, x: b.x, y: b.y, r: b.r || 0, dist: Math.hypot(b.x - sh.x, b.y - sh.y) })).sort((a, b) => a.dist - b.dist);
}

function cruiseSetup(s) {
  const cr = s.cr = {
    target: null, active: false, cancel: false, speed: 0, nudge: 0, navOpen: false, sel: 0, list: [], listAt: 0, k: null,
    lk: 0, z: 1, rows: [], readAt: 0, ps: []
  };
  s.cruising = false;
  cr.k = s.input.keyboard.addKeys('N,C,X,ENTER,UP,DOWN,W,S');
  // the cyan edge vignette: clear in the middle, cyan toward the corners
  if (!s.textures.exists('cruise-vig')) {
    const t = s.textures.createCanvas('cruise-vig', 320, 180), c = t.getContext('2d'), g = c.createRadialGradient(160, 90, 60, 160, 90, 200);
    g.addColorStop(0, 'rgba(56,225,255,0)'); g.addColorStop(0.55, 'rgba(56,225,255,0.10)'); g.addColorStop(1, 'rgba(56,225,255,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180); t.refresh();
  }
  cr.vig = s.add.image(W / 2, H / 2, 'cruise-vig').setScale(W / 320, H / 180).setScrollFactor(0).setDepth(98).setAlpha(0).setVisible(false);
  cr.fx = s.add.graphics().setScrollFactor(0).setDepth(-7);
  for (let i = 0; i < 70; i++) cr.ps.push({ x: Math.random() * W, y: Math.random() * H, l: 0.4 + Math.random() * 1.2 });
  cr.read = s.add.text(W / 2, 128, '', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#9fe9ff' }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setStroke('#02060d', 4).setVisible(false);

  // the nav list: the shared glass panel with a row per body
  const ui = cr.ui = panel(s, { w: 660, h: 440, title: 'NAV  -  ' + sysDef().name.toUpperCase(), depth: 140 });
  ui.tagText.setText('N  close'); ui.setHints([['W S', 'Choose'], ['Enter', 'Set target'], ['X', 'Clear target'], ['N', 'Close']]);
  const w = ui.w, h = ui.h, add = o => { ui.box.add(o); return o; };
  [[-w / 2 + 34, 'BODY'], [-w / 2 + 250, 'TYPE'], [w / 2 - 150, 'DISTANCE'], [w / 2 - 30, 'CRUISE']].forEach(([x, str], i) => add(s.add.text(x, -h / 2 + 62, str, uiFont(12, '#5b7a92')).setOrigin(i > 1 ? 1 : 0, 0.5)));
  for (let i = 0; i < CRUISE_ROWS; i++) {
    const y = -h / 2 + 96 + i * 36;
    cr.rows.push({
      hl: add(s.add.rectangle(0, y, w - 36, 32, 0xffb454, 0.16).setStrokeStyle(1, AMBER, 0.7).setVisible(false)),
      mark: add(s.add.text(-w / 2 + 24, y, '', uiFont(16, '#ffb454', { fontStyle: 'bold' })).setOrigin(0.5)),
      name: add(s.add.text(-w / 2 + 38, y, '', uiFont(17, '#cfefff')).setOrigin(0, 0.5)),
      type: add(s.add.text(-w / 2 + 250, y, '', uiFont(13, '#5b7a92')).setOrigin(0, 0.5)),
      km: add(s.add.text(w / 2 - 150, y, '', uiFont(16, '#9fe9ff')).setOrigin(1, 0.5)),
      eta: add(s.add.text(w / 2 - 30, y, '', uiFont(16, '#ffd37a')).setOrigin(1, 0.5))
    });
  }
  cr.more = add(s.add.text(0, h / 2 - 62, '', uiFont(13, '#5b7a92')).setOrigin(0.5));
  ui.setVisible(false);
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
function cruiseNavOpen(s) {
  const cr = s.cr; cr.navOpen = true; cr.listAt = 0; cr.sel = 0;
  const cur = cr.target && cruiseKnown(s).findIndex(b => b.id === cr.target.id); if (cur > 0) cr.sel = cur;
  cr.ui.setVisible(true); sfx('tick');
}
function cruiseNavClose(s) { s.cr.navOpen = false; s.cr.ui.setVisible(false); sfx('tick'); }

function cruiseNavDraw(s) {
  const cr = s.cr, list = cr.list = cruiseKnown(s), n = list.length;
  cr.sel = Phaser.Math.Clamp(cr.sel, 0, Math.max(0, n - 1));
  const first = Phaser.Math.Clamp(cr.sel - Math.floor(CRUISE_ROWS / 2), 0, Math.max(0, n - CRUISE_ROWS));
  cr.rows.forEach((r, i) => {
    const b = list[first + i], on = !!b;
    [r.hl, r.mark, r.name, r.type, r.km, r.eta].forEach(o => o.setVisible(on));
    if (!on) return;
    const isSel = first + i === cr.sel, isTgt = cr.target && cr.target.id === b.id;
    r.hl.setVisible(isSel);
    r.mark.setText(isTgt ? '>' : '');
    r.name.setText(b.name).setColor(isSel ? '#ffffff' : '#cfefff');
    r.type.setText(b.look === 'derelict' ? 'DERELICT' : CRUISE_TYPES[b.type] || '');
    r.km.setText(hudFmt(b.dist / 10) + ' km');
    r.eta.setText(b.dist < CRUISE.stop + CRUISE.minLeg ? 'near' : Math.round(cruiseEta(b.dist)) + ' s');
  });
  cr.more.setText(n > CRUISE_ROWS ? (first > 0 ? 'above  ' : '') + n + ' bodies' + (first + CRUISE_ROWS < n ? '  below' : '') : '');
}

function cruisePick(s, b) {
  const cr = s.cr;
  cr.target = { id: b.id, name: b.name, type: b.type, x: b.x, y: b.y, r: b.r || 0 };
  toast(s, 'Target: ' + b.name + '. Press C to cruise.', '#ffd37a'); sfx('chime');
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
  sfx('cruiseOn'); toast(s, 'Cruise to ' + t.name + '. S cancels, A and D nudge.', '#9fe9ff');
}

function cruiseEnd(s, why) {
  const cr = s.cr, ship = s.ship, t = cr.target;
  cr.active = false; s.cruising = false;
  const sp = Math.min(cr.speed, why === 'cut' ? 480 : CRUISE.dropSpeed);
  ship.body.setVelocity(Math.cos(ship.rotation) * sp, Math.sin(ship.rotation) * sp).setDrag(0.55);
  cr.speed = 0; cr.cancel = false; cr.nudge = 0; s.lockUntil = 0;
  s.cameras.main.shake(220, 0.0035); sfx('cruiseOff');
  if (why === 'arrived') toast(s, (t ? t.name : 'Destination') + ' ahead. Cruise ended.', '#6dff9c');
  else if (why === 'hostile') toast(s, 'Contact ahead: cruise dropped.', '#ff4d6d');
  else if (why === 'cut') toast(s, 'Cruise cancelled.', '#ffd37a');
}

// one frame of cruise: steer, speed up or slow down by the speed limit, check for trouble
function cruiseStep(s, time, dt) {
  const cr = s.cr, ship = s.ship, t = cr.target, k = s.k, dts = dt / 1000;
  if (s.enemies.getChildren().some(e => e.active && Math.hypot(e.x - ship.x, e.y - ship.y) < CRUISE.abortHostile)) { cr.speed = Math.min(cr.speed, CRUISE.dropSpeed); return cruiseEnd(s, 'hostile'); }
  const dx = t.x - ship.x, dy = t.y - ship.y, dist = Math.hypot(dx, dy);
  if (k.S.isDown || k.DOWN.isDown) cr.cancel = true;
  const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
  cr.nudge = Phaser.Math.Clamp(cr.nudge + ((right ? 1 : 0) - (left ? 1 : 0)) * CRUISE.nudgeRate * dt, -CRUISE.nudgeMax, CRUISE.nudgeMax);
  if (!left && !right) cr.nudge *= Math.pow(0.02, dts); // the heading eases back onto the target
  const want = Math.atan2(dy, dx) + cr.nudge;
  ship.rotation = Phaser.Math.Angle.RotateTo(ship.rotation, want, CRUISE.turn * dt);
  const aligned = Math.abs(Phaser.Math.Angle.Wrap(want - ship.rotation)) < 0.45;
  // the speed limit is what stops you flying through a planet: 3 x the distance left after the 900 px stop, never above 6000
  const limit = cr.cancel ? 0 : Math.min(CRUISE.top, CRUISE.brake * Math.max(0, dist - CRUISE.stop));
  if (cr.speed > limit) cr.speed = Math.max(limit, cr.speed - (cr.cancel ? 12000 : 40000) * dts);
  else if (aligned) cr.speed = Math.min(limit, cr.speed + CRUISE.accel * dts);
  ship.body.setAcceleration(0, 0).setMaxSpeed(CRUISE.top + 500).setDrag(1);
  ship.body.setVelocity(Math.cos(ship.rotation) * cr.speed, Math.sin(ship.rotation) * cr.speed);
  if (cr.cancel) { if (cr.speed < 400) cruiseEnd(s, 'cut'); }
  else if (limit <= CRUISE.dropSpeed && cr.speed <= CRUISE.dropSpeed) cruiseEnd(s, 'arrived');
}

// ---- the look: streaks, vignette, zoom, the readout. Runs every frame, cruising or not, so it can fade out ----
function cruiseLook(s, time, dt) {
  const cr = s.cr, cam = s.cameras.main, on = cr.active, e = Math.min(1, dt * 0.005);
  cr.lk += ((on ? Phaser.Math.Clamp(cr.speed / 2500, 0, 1) : 0) - cr.lk) * e;
  const k = cr.lk;
  cr.vig.setVisible(k > 0.02).setAlpha(k).setScale(W / 320 / cam.zoom, H / 180 / cam.zoom); // zoom shrinks screen-fixed things too: scale it back to the edges
  cr.fx.clear();
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
  if (s.dead || s.leaving) { if (cr.active) cruiseEnd(s, 'quiet'); if (cr.navOpen) cruiseNavClose(s); return ''; }
  const n = JD(k.N), c = JD(k.C), x = JD(k.X), enter = JD(k.ENTER), up = JD(k.UP) || JD(k.W), down = JD(k.DOWN) || JD(k.S);
  // a target that has gone (a random signal that faded) or that you have reached stops being a target
  const t = cr.target;
  if (t && !cr.active) {
    const gone = typeof t.id === 'string' && t.id.indexOf('sig-') === 0 && !(typeof POIRUN !== 'undefined' && POIRUN && POIRUN.sig.some(q => q.id === t.id && q.state === 1));
    if (gone || Math.hypot(t.x - ship.x, t.y - ship.y) < t.r + 500) cr.target = null;
  }
  if (cr.active) { if (!cr.target) cruiseEnd(s, 'cut'); else { cruiseStep(s, time, dt); } return cr.active ? 'cruise' : ''; }
  if (cr.navOpen) {
    if (n) { cruiseNavClose(s); return ''; }
    if (up || down) { cr.sel += down ? 1 : -1; sfx('tick'); cr.listAt = 0; }
    if (x) { cr.target = null; toast(s, 'Target cleared.', '#9fe9ff'); sfx('tick'); }
    if (enter && cr.list[cr.sel]) { cruisePick(s, cr.list[cr.sel]); cruiseNavClose(s); return ''; }
    if (time > cr.listAt) { cr.listAt = time + 250; cruiseNavDraw(s); }
    return 'nav';
  }
  if (n) { cruiseNavOpen(s); cruiseNavDraw(s); return 'nav'; }
  if (c) cruiseEngage(s);
  return cr.active ? 'cruise' : '';
}
