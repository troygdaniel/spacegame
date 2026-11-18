// ---------- Enemies: three pirate types, their AI, and the salvage pods they drop ----------
// space.js keeps the groups, the overlaps and spawnDrone(x, y) (which now picks a type by how far the
// spot is from Halcyon); missions.js keeps using d.wanted and d.prey on whatever spawnDrone returns.
//   Raider   fast and thin, 20 hp, quick light shots, circles wide and makes many gun runs; common near the station
//   Drone    the v0.1 pirate, 30 hp, circles close and makes a pass now and then; everywhere
//   Gunship  slow and wide, 80 hp, a 3-shot spread that hurts, circles and never turns in; common out by Kepler-4b
// How they fly (circle, pass and break away, run when badly hit) is pirateSteer below.
// bounty: what a kill pays (credits is the older figure, kept for a def with no bounty, like the Reaver). The repair bay
// charges half a credit a point, so a full 100-hull repair is 50 cr (70 with both armour plates): two kills of any type
// cover it and one gunship covers it with change.
const PIRATES = {
  raider:  { key: 'raider',  tex: 'raider',  hp: 20, credits: 35, bounty: 45, ram: 8,  radar: 0xff6b8a, body: [10, 10, 5], // body: circle radius and offset in the texture, which has a glow margin (ships.js)
             engage: 1000, speed: 520, max: 430, turn: 0.07, hold: 460, strafe: true, range: 520, aim: 0.4, shot: [550, 950], bullet: 540, dmg: 6 },
  drone:   { key: 'drone',   tex: 'drone',   hp: 30, credits: 25, bounty: 40, ram: 12, radar: RED,      body: [14, 8, 8],
             engage: 900, speed: 300, max: 260, turn: 0.035, hold: 280, range: 650, aim: 0.25, shot: [900, 1500], bullet: 420, dmg: 8 },
  gunship: { key: 'gunship', tex: 'gunship', hp: 80, credits: 70, bounty: 100, ram: 18, radar: 0xff8c3a, body: [19, 11, 6],
             engage: 1000, speed: 170, max: 150, turn: 0.022, hold: 430, range: 780, aim: 0.5, shot: [1500, 2100], bullet: 380, dmg: 10, spread: 3 }
};

// A fair launch (Troy's playtest, 2026-11-13: he died right after undocking, not while exploring).
//   For LAUNCH_GRACE after the ship appears no pirate hunting you engages and the timed spawner stays quiet;
//   then the first wave ramps: for 40 s one pirate at a time may come at you, for the next 40 s two, then any number.
//   Pirates hunting the escort freighter and bosses are not held back. HIT_IRON is the invulnerability after each hit.
const LAUNCH_GRACE = 20000, FIRST_WAVE = [[40000, 1], [80000, 2]], HIT_IRON = 450;
const SPAWN_DIST = 1600, SPAWN_KEEP_OUT = 1800; // the timed spawner: how far from you a pirate appears, and how close to Halcyon it never does
function pirateCap(s, time) { // how many pirates may engage you right now
  const t = time - s.launchAt - LAUNCH_GRACE;
  if (t < 0) return 0;
  for (const [until, n] of FIRST_WAVE) if (t < until) return n;
  return Infinity;
}
// true when this pirate must hold off: space.js resets s.aggro to 0 every frame before the pirates think
function pirateHeld(s, dist, def, time) {
  if (dist >= def.engage) return false;
  if (s.aggro >= pirateCap(s, time)) return true;
  s.aggro++; return false;
}

// ---- pirate tables per system (docs/UNIVERSE.md 5.3) ----
// max: how many pirates the timed spawner keeps alive; every: ms between spawns; weights: raider, drone and gunship, adding up to 1.
// A system can set its own as `pirates` in src/data_systems.js (Halcyon does, to keep what it always did); every other one gets a table
// from its danger: 3 pirates at danger 1 up to 12 at danger 5, a spawn every 15 s down to every 7 s, and more gunships the higher the danger.
const PIRATE_WEIGHTS = { 1: [0.5, 0.4, 0.1], 2: [0.4, 0.4, 0.2], 3: [0.3, 0.4, 0.3], 4: [0.25, 0.35, 0.4], 5: [0.2, 0.3, 0.5] };
function pirateTable(sys) {
  sys = sys || sysDef();
  const d = Phaser.Math.Clamp(sys.danger | 0, 1, 5), w = PIRATE_WEIGHTS[d], own = sys.pirates || {};
  return {
    max: own.max != null ? own.max : Math.round(3 + (d - 1) * 2.25),
    every: own.every != null ? own.every : 15000 - (d - 1) * 2000,
    weights: own.weights || { raider: w[0], drone: w[1], gunship: w[2] }
  };
}
function pickPirateType(weights, r) { // r is 0 to 1; gunships first, then raiders, then drones
  let acc = 0;
  for (const k of ['gunship', 'raider', 'drone']) { acc += weights[k] || 0; if (r < acc) return k; }
  return 'drone';
}

// which type turns up at a spot: raiders prowl the station lanes, the system's table decides further out
function pirateTypeFor(s, x, y) {
  const d = Phaser.Math.Distance.Between(x, y, s.station.x, s.station.y), r = Math.random();
  if (d < 1800) return r < 0.5 ? 'raider' : 'drone';
  if (d < 3200) return r < 0.25 ? 'raider' : r < 0.8 ? 'drone' : 'gunship';
  return pickPirateType(pirateTable().weights, r);
}

// type: a PIRATES key, a whole def (the Reaver in missions.js), or nothing to pick by distance
function spawnPirate(s, x, y, type) {
  const def = typeof type === 'object' && type ? type : PIRATES[type] || PIRATES[pirateTypeFor(s, x, y)];
  const d = s.enemies.create(x, y, def.tex).setDepth(4);
  d.def = def; d.hp = def.hp; d.nextShot = 0; d.rotation = Math.random() * 6.28;
  d.side = Math.random() < 0.5 ? -1 : 1; d.move = null; d.moveUntil = 0; d.ran = false; // src: pirateSteer
  d.body.setCircle(def.body[0], def.body[1], def.body[2]).setDamping(true).setDrag(0.5).setMaxSpeed(def.max);
  return d;
}

// ---- how a pirate flies a fight (Troy, 2026-11-17: the escort fight was flat, they flew straight in and sat there) ----
// Three moves, the same against you or the freighter a pirate hunts:
//   circle   orbit the target at def.hold (inside gun range), nose on it, shooting as the guns line up
//   pass     every few seconds turn in and fly a gun run just past the target, then BREAK away to the ring again, sometimes the other way round
//   run      the first time it is down to RUN_AT of its hull it turns and runs for a few seconds, not shooting; then it comes back and fights to the end
// Hull, damage, speed and range are the def's, as before: only where the pirate points its engine changed.
// FIGHT.pass: ms a type circles between passes. A type that is not here (the gunship, a mod's own def) only circles and runs.
const FIGHT = { pass: { raider: [2200, 4200], drone: [3200, 5600] }, passFor: 2600, near: 150, miss: 90, breakFor: 1500, breakTo: 0.7, runAt: 0.35, runFor: [3500, 5000] };
function fightBetween(a, b) { return a + Math.random() * (b - a); }
// What the pirate d does this frame: plain numbers in and out, so tests/enemies.mjs flies it in Node.
//   in:  dist and target (the bearing, radians) to what it hunts, time in ms, vx and vy its own velocity relative to the target;
//        d carries hp, side, move, moveUntil, ran
//   out: { move, ang: where the engine pushes, face: where the nose turns, fire: may it shoot }
function pirateSteer(d, def, dist, target, time, vx, vy) {
  const ring = def.hold, passes = FIGHT.pass[def.key];
  if (!d.move) { d.move = 'circle'; d.moveUntil = time + (passes ? fightBetween(passes[0], passes[1]) : 0); }
  if (!d.ran && d.hp < def.hp && d.hp <= def.hp * FIGHT.runAt) { d.ran = true; d.move = 'run'; d.moveUntil = time + fightBetween(FIGHT.runFor[0], FIGHT.runFor[1]); }
  else if (d.move === 'run' && time > d.moveUntil) { d.move = 'circle'; d.moveUntil = time + (passes ? fightBetween(passes[0], passes[1]) : 0); }
  else if (d.move === 'circle' && passes && time > d.moveUntil && dist < ring * 1.5) { d.move = 'pass'; d.moveUntil = time + FIGHT.passFor; }
  else if (d.move === 'pass' && (dist < FIGHT.near || time > d.moveUntil)) { d.move = 'break'; d.moveUntil = time + FIGHT.breakFor; }
  else if (d.move === 'break' && (dist > ring * FIGHT.breakTo || time > d.moveUntil)) {
    d.move = 'circle'; d.moveUntil = time + fightBetween(passes[0], passes[1]);
    if (Math.random() < 0.5) d.side = -d.side;
  }
  if (d.move === 'run') { const ang = target + Math.PI + d.side * 0.3; return { move: 'run', ang, face: ang, fire: false }; }
  if (d.move === 'break') { const ang = target + Math.PI - d.side * 0.9; return { move: 'break', ang, face: ang, fire: false }; } // peel off to one side, nose where it flies
  if (d.move === 'pass') return { move: 'pass', ang: target + d.side * Math.atan2(FIGHT.miss, Math.max(dist, 1)), face: target, fire: true }; // aimed just beside the target: a run past it, not a ram
  // circle: sideways along the ring. It leans in by what the turn itself needs (speed squared over the radius), more when it is too far out
  // or drifting out, and leans out when too close or closing; from far away it is a straight approach.
  if (dist > ring * 2) return { move: 'circle', ang: target, face: target, fire: true };
  vx = vx || 0; vy = vy || 0;
  const out = -(vx * Math.cos(target) + vy * Math.sin(target)), v2 = vx * vx + vy * vy - out * out; // out: speed away from the target; v2: speed along the ring, squared
  const lean = Math.asin(Math.min(0.9, v2 / (ring * def.speed))) + 2.2 * (dist - ring) / ring + 1.2 * out / def.max;
  return { move: 'circle', ang: target + d.side * (Math.PI / 2 - Math.max(-0.8, Math.min(1.45, lean))), face: target, fire: true };
}

// one frame of one pirate: fly its move around its prey (the escort freighter) or you, then shoot when lined up
function pirateAI(s, d, ship, time) {
  if (!d.active || !d.body) return;
  const def = d.def || PIRATES.drone;
  if (def.ai) return def.ai(s, d, ship, time); // a boss brings its own brain
  const tgt = d.prey && d.prey.active && !(d.distractedUntil > time) ? d.prey : ship; // distractedUntil: the escort's pirate you hit fights you for a while (src/missions.js)
  const ddx = tgt.x - d.x, ddy = tgt.y - d.y, dist = Math.hypot(ddx, ddy);
  d.calm = tgt === ship && !d.ambush && pirateHeld(s, dist, def, time); // held back by the launch grace or the first-wave cap (an interdiction ambush is not: src/cruise.js)
  if (dist >= def.engage || d.calm) { d.body.setAcceleration(0, 0); d.rotation += 0.003; if (d.move !== 'run') d.move = null; return; }
  const target = Math.atan2(ddy, ddx), tv = tgt.body ? tgt.body.velocity : { x: 0, y: 0 },
        m = pirateSteer(d, def, dist, target, time, d.body.velocity.x - tv.x, d.body.velocity.y - tv.y);
  d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, m.face, def.turn * (m.face === target ? 1 : 2)); // it turns away faster than it aims
  s.physics.velocityFromRotation(m.ang, def.speed, d.body.acceleration);
  if (m.fire && dist < def.range && time > d.nextShot && Math.abs(Phaser.Math.Angle.Wrap(target - d.rotation)) < def.aim) {
    d.nextShot = time + Phaser.Math.Between(def.shot[0], def.shot[1]);
    const n = def.spread || 1;
    for (let i = 0; i < n; i++) {
      const b = s.shoot(s.eb, d.x, d.y, d.rotation + (i - (n - 1) / 2) * 0.17, def.bullet, time);
      if (b) b.dmg = def.dmg;
    }
  }
}

// ---- salvage: every kill leaves a pod; fly through it for credits or hull ----
function enemiesSetup(s) {
  s.salvage = s.physics.add.group();
  s.physics.add.overlap(s.ship, s.salvage, (ship, p) => { if (p.active && !s.dead) pickSalvage(s, p); });
}
function dropSalvage(s, e) {
  const p = s.salvage.create(e.x, e.y, 'pod').setDepth(3);
  const v = e.body ? e.body.velocity : { x: 0, y: 0 };
  p.body.setCircle(9).setVelocity(v.x * 0.3 + Phaser.Math.Between(-30, 30), v.y * 0.3 + Phaser.Math.Between(-30, 30))
    .setDamping(true).setDrag(0.3).setAngularVelocity(90);
  p.born = s.time.now;
  p.kind = Math.random() < 0.3 ? 'hull' : 'credits';
  p.amount = p.kind === 'hull' ? 15 : Phaser.Math.Between(10, 40);
  return p;
}
function pickSalvage(s, p) {
  if (p.kind === 'hull') {
    const gain = Math.max(0, Math.min(p.amount, G.maxHull - G.hull)); G.hull += gain;
    feelNumber(s, p.x, p.y - 16, '+' + gain + ' hull', '#6dff9c', 16);
  } else {
    G.credits += p.amount;
    feelNumber(s, p.x, p.y - 16, '+' + p.amount + ' cr', '#ffb454', 16);
  }
  s.boom.explode(10, p.x, p.y); beep(880, 0.08, 'triangle', 0.04, 300);
  p.destroy();
}
// pods drift, blink in their last seconds, and are gone after 12 s; they show amber on the radar
function enemiesUpdate(s, time) {
  s.salvage.getChildren().slice().forEach(p => {
    if (!p.active) return;
    const age = time - p.born;
    if (age > 12000) { p.destroy(); return; }
    p.setAlpha(age > 9000 && Math.sin(time / 90) < 0 ? 0.3 : 1);
    hudBlip(s, p.x, p.y, 0xffd37a, 2);
  });
}

// ---- bounty: a kill pays, and you can see and hear it ----
// G.flight is this flight's pirate kills and what they paid; docking shows it and clears it. It is not saved.
Object.assign(G, { flight: { kills: 0, bounty: 0 } });
function bountyOf(def) { return def && def.bounty != null ? def.bounty : (def && def.credits) || 25; }
function bountyReset() { G.flight = { kills: 0, bounty: 0 }; }
// pay the bounty for the pirate that was at (x, y): the credits, a gold BOUNTY +N that rises from the wreck, a small spray
// of coins, a glow on the HUD credits strip and a short chime just after the boom
function bountyPay(s, x, y, def) {
  const n = bountyOf(def);
  G.credits += n; G.flight.kills++; G.flight.bounty += n;
  const t = s.add.text(x, y - 40, 'BOUNTY +' + n, { fontFamily: 'monospace', fontSize: '24px', fontStyle: 'bold', color: '#ffe08a' })
    .setOrigin(0.5).setStroke('#02060d', 4).setDepth(91).setScale(0.6);
  s.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
  s.tweens.add({ targets: t, y: y - 108, alpha: 0, delay: 500, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  for (let i = 0; i < 7; i++) { // coins: little amber discs that fly out and fade
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 50;
    const c = s.add.circle(x, y, 3, 0xffd37a).setStrokeStyle(1, 0xb8791a).setDepth(91);
    s.tweens.add({ targets: c, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r - 14, alpha: 0, duration: 550 + Math.random() * 250, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
  }
  if (s._hud) s._hud.pulse = s.time.now + 650; // hud.js lights the credits strip
  s.time.delayedCall(140, () => sfx('bounty'));
  return n;
}
// on docking: what this flight's kills paid, then start the count again. Shown after the ore sale so the toasts do not cover each other
function bountyDock(s) {
  const f = G.flight; bountyReset();
  if (!f || f.kills <= 0) return;
  s.time.delayedCall(1700, () => toast(s, 'Bounty this flight: +' + f.bounty + ' cr  (' + f.kills + (f.kills === 1 ? ' pirate)' : ' pirates)'), '#ffd37a'));
}
