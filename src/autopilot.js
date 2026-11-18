// ---------- Autopilot: the ship flies itself to a body at local speed (card space-game-local-autopilot) ----------
// Cruise (src/cruise.js) covers the long legs and refuses the short ones: nothing inside 2100 px, and within 2500 px of a station or planet it asks the autopilot to fly clear first (autopilotClear below).
// Autopilot covers the rest. Pick a body (the N list and P, or the Tab map with W S and Enter, or P with a target already set) and the ship turns
// onto it, flies at its own top speed, slows down and stops just outside it, slow enough to dock or land (L). A long leg cruises in the middle:
// autopilot engages cruise once it is clear of the mass and takes the stick back when cruise drops out 900 px short. Any flight key cancels
// (W A S D, the arrows, Space, Shift, Q, E, or P again), so does a hit; a hostile within 1100 px stops it ("Contact: autopilot off").
//   space.js   calls autopilotSetup(this) in create(); autopilotFrame(this, time, dt, crs) right after cruiseFrame: 'auto' while it flies the
//              ship locally (flight input is ignored then, like the nav list), 'cruise' while it waits for a cruise it engaged, '' otherwise;
//              autopilotDrive(this, dt) after the thrust code sets the ship's heading and speed
// An ORDER takes it all the way in (card space-game-dock-by-command): autopilotGo(s, body, 'dock') on the system's station, or 'land' on the planet
// you can land on. The legs are the same (clear the mass, cruise the long middle, the local approach); where the plain order stops and says
// "press L", the order goes on to a last stage, 'final': the ship is in the dock or land zone and slow enough, so the autopilot presses the ship's
// own L and the dock or land code in src/space.js does the rest. One quiet line says what it is doing (autopilotSay). Any flight key, P, a hit or
// a hostile close by hands the stick back, as on every leg. The navigation panel gives the order (src/navpanel.js); P stays the plain "fly there".
//   cruise.js  cruiseKnown(s) is the list of bodies; cruiseEngage/cruiseEnd fly the long middle and cr.endWhy says how a cruise ended
const AUTO = {
  brake: 1.0, floor: 60, dropSpeed: 100, // limit = floor + brake x px left (so it keeps moving to the end); it stops under 100 px/s: the dock (150) and land (170) limits allow it
  turn: 0.004,                           // rad per ms, times the ship's turn stat
  hostile: 1100, grace: 250,             // px: a hostile this close stops it; ms after engaging before a held key counts as a cancel
  cruiseLeg: 3500,                       // px: a leg longer than this cruises in the middle (cruise itself wants 2100 or more)
  final: 2500                            // ms: how long a Dock or Land order waits in the zone for the dock to take; after that it says "press L" as the plain order does
};

// the order a body can take: 'dock' on the system's station, 'land' on the planet you can land on, '' on anything else (you can only reach it).
// b: a body or a row { id, type }; station, planet: the system's own (sysBody), or null; canLand: the Space scene's flag
function autopilotOrder(b, station, planet, canLand) {
  if (!b) return '';
  if (b.type === 'station' && station && b.id === station.id) return 'dock';
  if (b.type === 'planet' && canLand && planet && b.id === planet.id) return 'land';
  return '';
}
// the one quiet line while the autopilot flies. stage: 'clear', 'local' or 'final'; mass: the name of the mass it is clearing; km: what is left
function autopilotSay(order, stage, name, mass, km) {
  const N = String(name).toUpperCase(), head = order === 'dock' ? 'DOCKING AT  ' + N : order === 'land' ? 'LANDING ON  ' + N : 'AUTOPILOT  ' + N;
  if (stage === 'clear') return order ? head + '   clearing ' + mass : 'CLEARING  ' + String(mass).toUpperCase();
  if (stage === 'final') return head + (order === 'land' ? '   going down' : '   going in');
  return head + '   ' + km + ' km';
}

// how far from the body's centre the ship comes to rest
function autopilotStop(t) {
  if (t.type === 'station') return 260;              // the dock prompt comes on inside 320 px (space.js)
  if (t.type === 'planet') return (t.r || 0) + 100;  // the land prompt inside r + 150
  return (t.r || 0) + 350;                           // a belt, an outpost, a gate, a signal: hold off its edge
}

function autopilotSetup(s) {
  const ap = s.ap = { on: false, stage: '', order: '', target: null, since: 0, speed: 0, hull: 0, sh: 0, readAt: 0 };
  ap.k = s.input.keyboard.addKeys('P');
  ap.read = s.add.text(W / 2, TOAST.readY, '', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffd37a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setStroke('#02060d', 4).setVisible(false);
}

// fly to this body (a row of cruiseKnown, or a cr.target). order: '' (stop outside it), 'dock' or 'land' (all the way in; only where
// autopilotOrder allows it, else it is the plain order). Returns true when the autopilot took the ship.
function autopilotGo(s, b, order) {
  const ap = s.ap, cr = s.cr; if (!ap || !cr || !b || s.dead || s.leaving || s.jmp || G.deep) return false;
  const t = { id: b.id, name: b.name, type: b.type, x: b.x, y: b.y, r: b.r || 0 };
  order = order && order === autopilotOrder(t, sysBody('station'), sysBody('planet'), s.canLand) ? order : '';
  ap.order = order;
  if (!order && Math.hypot(t.x - s.ship.x, t.y - s.ship.y) <= autopilotStop(t) + 60) { toast(s, t.name + ': you are there.', '#ffd37a'); sfx('empty'); return false; }
  if (cr.active) cruiseEnd(s, 'quiet');
  cr.target = t; ap.target = t; // the HUD's objective arrow and the brackets follow cr.target (cruise clears it near the body; ap.target stays)
  const mass = autopilotMass(s);
  if (mass && Math.hypot(t.x - s.ship.x, t.y - s.ship.y) - autopilotStop(t) > AUTO.cruiseLeg) return autopilotClear(s, t, 'auto', mass); // a long leg from inside a mass limit: out the short way first
  ap.on = true; ap.stage = 'local'; ap.since = s.time.now; ap.speed = s.ship.body.speed; ap.hull = G.hull; ap.sh = s.sh ? s.sh.pts : 0;
  toast(s, (order === 'dock' ? 'Docking at ' : order === 'land' ? 'Landing on ' : 'Autopilot to ') + t.name + '. Any key takes the stick back.', '#ffd37a'); sfx('chime');
  return true;
}

// ---- flying clear of a mass (card space-game-bug-travel-refuses-near-mass) ----
// Cruise will not start within CRUISE.lockMass px of a station or planet. With a target set, C and P there used to answer "Too close to the mass" and the
// ship sat still. Now the autopilot takes it out of the limit by the short way, leaning to the target's side, and then does what was asked: `then` is
// 'cruise' (C: cruise engages and the autopilot lets go) or 'auto' (P: the autopilot's own leg, which cruises the long middle). Any flight key, P, a hit
// or a hostile close by takes the stick back, as in any autopilot leg.
// the station or planet whose mass limit the ship is inside (the nearest one), or null
function autopilotMass(s) {
  const ship = s.ship; let best = null, bd = CRUISE.lockMass;
  sysBodies('station').concat(sysBodies('planet')).forEach(b => { const d = Math.hypot(b.x - ship.x, b.y - ship.y); if (d < bd) { bd = d; best = b; } });
  return best;
}
// the heading (radians) that takes a ship at (sx, sy) out of the mass at (mx, my) on the way to a target at (tx, ty): straight at the target when it is on
// the ship's side of the mass, else outward from the mass, leaning to the target's side. It always has an outward part, so the ship never flies deeper in.
function autopilotClearAngle(sx, sy, mx, my, tx, ty) {
  let ox = sx - mx, oy = sy - my; const ol = Math.hypot(ox, oy), ux0 = tx - sx, uy0 = ty - sy, ul = Math.hypot(ux0, uy0) || 1, ux = ux0 / ul, uy = uy0 / ul;
  if (ol < 1) return Math.atan2(uy, ux); // at the very middle: any way is out, so the target's
  ox /= ol; oy /= ol;
  const dot = ox * ux + oy * uy;
  if (dot >= 0.2) return Math.atan2(uy, ux);
  const side = ux * -oy + uy * ox; // how far the target lies to the left of straight out (the part of its bearing along the limit's edge)
  return Math.atan2(oy + ox * side * 0.6, ox - oy * side * 0.6);
}
// take the ship out of `mass`, then `then` ('cruise' or 'auto') to the target t. Returns true when the autopilot took the ship.
function autopilotClear(s, t, then, mass) {
  const ap = s.ap, cr = s.cr; if (!ap || !cr || !t || !mass || s.dead || s.leaving || s.jmp || G.deep) return false;
  if (cr.active) cruiseEnd(s, 'quiet');
  ap.target = t; ap.then = then; // cr.target is t already: autopilotGo and cruiseEngage, the two callers, have it set
  ap.on = true; ap.stage = 'clear'; ap.since = s.time.now; ap.speed = s.ship.body.speed; ap.hull = G.hull; ap.sh = s.sh ? s.sh.pts : 0;
  toast(s, 'Clearing ' + mass.name + ', then ' + (then === 'cruise' ? 'cruising to ' : ap.order === 'dock' ? 'docking at ' : ap.order === 'land' ? 'landing on ' : 'on to ') + t.name + '. Any key takes the stick back.', '#ffd37a'); sfx('chime');
  return true;
}

function autopilotEnd(s, why) {
  const ap = s.ap, ship = s.ship, t = ap.target;
  if (ap.stage === 'final' && s.k && s.k.L) s.k.L._justDown = false; // an L the dock code did not take is not left lying about
  ap.on = false; ap.stage = ''; ap.order = ''; ap.read.setVisible(false);
  if (!s.cruising) {
    const sp = Math.min(ship.body.speed, shipStat('vmax'));
    ship.body.setVelocity(Math.cos(ship.rotation) * sp, Math.sin(ship.rotation) * sp).setDrag(0.55).setAcceleration(0, 0);
  }
  if (why === 'arrived') {
    const landable = t.type === 'planet' && s.canLand && sysBody('planet') && sysBody('planet').id === t.id;
    const what = t.type === 'station' ? ': press L to dock.' : landable ? ': press L to land.' : ' ahead. Autopilot off.';
    toast(s, t.name + what, '#6dff9c'); sfx('chime');
  } else if (why === 'hostile') { toast(s, 'Contact: autopilot off.', '#ff4d6d'); sfx('empty'); }
  else if (why === 'hit') { toast(s, 'Hit: autopilot off.', '#ff4d6d'); }
  else if (why === 'key') { toast(s, 'Autopilot off.', '#ffd37a'); sfx('tick'); }
  // 'quiet': a dock, a death, a jump, a cruise that was cut or interdicted: that event says its own line
  ap.target = null;
}

// a held flight key: the player wants the stick
function autopilotKeyDown(s) {
  const k = s.k;
  return ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'SHIFT', 'Q', 'E'].some(n => k[n] && k[n].isDown);
}
// may cruise take the middle of the leg right now: the same locks as cruiseEngage, without its toasts
function autopilotCruiseOk(s) {
  const ship = s.ship, d = o => Math.hypot(o.x - ship.x, o.y - ship.y);
  return !sysBodies('station').concat(sysBodies('planet')).some(b => d(b) < CRUISE.lockMass) && !s.enemies.getChildren().some(e => e.active && d(e) < CRUISE.lockHostile);
}

// hand the leg to cruise: the one place the autopilot gives cruise its target back (cruise drops it near a body; ours stays)
function autopilotCruise(s, t) { s.cr.target = t; s.cr.endWhy = ''; cruiseEngage(s); }

// one call per frame from Space.update, right after cruiseFrame (crs is what it returned)
function autopilotFrame(s, time, dt, crs) {
  const ap = s.ap; if (!ap) return '';
  const JD = Phaser.Input.Keyboard.JustDown, cr = s.cr, ship = s.ship, p = JD(ap.k.P);
  if (s.dead || s.leaving) { if (ap.on) autopilotEnd(s, 'quiet'); return ''; }
  if (!ap.on) {
    if (!p || s.jmp || G.deep || crs === 'cruise') return '';
    if (crs === 'nav') { const b = cr.list[cr.sel]; if (b) { cruiseNavClose(s); autopilotGo(s, b); } }
    else if (cr.target) autopilotGo(s, cr.target);
    else { toast(s, 'No destination. Press N or Tab and pick one.', '#ffd37a'); sfx('empty'); }
    return ap.on ? 'auto' : '';
  }
  if (s.jmp) { autopilotEnd(s, 'quiet'); return ''; }
  if (p) { autopilotEnd(s, 'key'); return ''; }
  if (ap.stage === 'cruise') {
    if (s.cruising) return 'cruise'; // cruise flies: its keys rule (S cancels, A and D nudge)
    if (cr.endWhy !== 'arrived') { autopilotEnd(s, 'quiet'); return ''; } // cut, a contact, an interdiction: cruise said so
    ap.stage = 'local'; ap.speed = ship.body.speed; ap.since = time; // 900 px short of the body: the last mile is ours
  }
  const t = ap.target, dist = Math.hypot(t.x - ship.x, t.y - ship.y);
  if (s.enemies.getChildren().some(e => e.active && Math.hypot(e.x - ship.x, e.y - ship.y) < AUTO.hostile)) { autopilotEnd(s, 'hostile'); return ''; }
  if (G.hull < ap.hull || (s.sh && s.sh.pts < ap.sh)) { autopilotEnd(s, 'hit'); return ''; }
  if (time > ap.since + AUTO.grace && autopilotKeyDown(s)) { autopilotEnd(s, 'key'); return ''; }
  if (ap.stage === 'clear') {
    if (autopilotMass(s)) return 'auto'; // still inside the limit: autopilotDrive flies it out
    if (ap.then === 'cruise') { // C was pressed: cruise takes it from here and the autopilot lets go (a cruise that will not start says why itself)
      ap.on = false; ap.stage = ''; ap.target = null; ap.read.setVisible(false);
      autopilotCruise(s, t);
      if (s.cruising) return 'cruise';
      ship.body.setDrag(0.55).setAcceleration(0, 0); return '';
    }
    ap.stage = 'local'; ap.since = time; // P was pressed: the leg to the body, as ever
  }
  if (ap.stage === 'final') { // a Dock or Land order, in the zone and slow: press the ship's own L until the dock or land code takes it (s.leaving ends us, quietly)
    if (time > ap.since + AUTO.final) { autopilotEnd(s, 'arrived'); return ''; } // it did not take (a zone that moved, a scene with no L): say "press L" as the plain order does
    if (s.k && s.k.L) s.k.L._justDown = true;
    return 'auto';
  }
  if (dist - autopilotStop(t) > AUTO.cruiseLeg && autopilotCruiseOk(s)) { // a long leg: cruise the middle
    autopilotCruise(s, t);
    if (s.cruising) { ap.stage = 'cruise'; ap.read.setVisible(false); return 'cruise'; }
  }
  return 'auto';
}

// the local leg: turn onto the body, run up to the ship's top speed, brake by the distance left, stop just outside it
function autopilotDrive(s, dt) {
  const ap = s.ap; if (!ap || !ap.on || (ap.stage !== 'local' && ap.stage !== 'clear' && ap.stage !== 'final') || s.cruising) return;
  const ship = s.ship, t = ap.target, dts = dt / 1000, dx = t.x - ship.x, dy = t.y - ship.y, dist = Math.hypot(dx, dy);
  if (ap.stage === 'final') { // going in: keep the nose on it and let the speed run down; the dock or land code takes the ship
    ap.speed = Math.max(0, ap.speed - shipStat('accel') * dts);
    ship.body.setAcceleration(0, 0).setDrag(0).setVelocity(Math.cos(ship.rotation) * ap.speed, Math.sin(ship.rotation) * ap.speed);
    ap.read.setVisible(true).setText(autopilotSay(ap.order, 'final', t.name));
    return;
  }
  const mass = ap.stage === 'clear' ? autopilotMass(s) : null; // flying clear: out of the mass at full speed, no stop to brake for
  const left = mass ? 1e6 : Math.max(0, dist - autopilotStop(t));
  const want = mass ? autopilotClearAngle(ship.x, ship.y, mass.x, mass.y, t.x, t.y) : Math.atan2(dy, dx);
  ship.rotation = Phaser.Math.Angle.RotateTo(ship.rotation, want, AUTO.turn * shipStat('turn') * dt);
  const aligned = Math.abs(Phaser.Math.Angle.Wrap(want - ship.rotation)) < 0.5, acc = shipStat('accel'), vmax = shipStat('vmax');
  const limit = Math.min(vmax, AUTO.floor + AUTO.brake * left);
  if (ap.speed > limit) ap.speed = Math.max(limit, ap.speed - acc * 2 * dts);
  else if (aligned) ap.speed = Math.min(limit, ap.speed + acc * dts);
  else ap.speed = Math.max(0, ap.speed - acc * dts); // still turning onto it: do not run off sideways
  ship.body.setAcceleration(0, 0).setDrag(0).setMaxSpeed(vmax + 10);
  ship.body.setVelocity(Math.cos(ship.rotation) * ap.speed, Math.sin(ship.rotation) * ap.speed);
  if (aligned && ap.speed < limit && s.trail) s.trail.emitParticleAt(ship.x - Math.cos(ship.rotation) * 20, ship.y - Math.sin(ship.rotation) * 20, 2);
  if (left <= 30 && ap.speed <= AUTO.dropSpeed) {
    if (!ap.order) return autopilotEnd(s, 'arrived');
    ap.stage = 'final'; ap.since = s.time.now; return; // the order goes on: autopilotFrame presses L
  }
  ap.read.setVisible(true);
  if (s.time.now > ap.readAt) { ap.readAt = s.time.now + 200; ap.read.setText(autopilotSay(ap.order, mass ? 'clear' : 'local', t.name, mass ? mass.name : '', hudFmt(dist / 10))); }
}
