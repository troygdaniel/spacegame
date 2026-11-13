// ---------- Enemies: three pirate types, their AI, and the salvage pods they drop ----------
// space.js keeps the groups, the overlaps and spawnDrone(x, y) (which now picks a type by how far the
// spot is from Halcyon); missions.js keeps using d.wanted and d.prey on whatever spawnDrone returns.
//   Raider   fast and thin, strafes around you, 20 hp, quick light shots; common near the station
//   Drone    the v0.1 pirate, 30 hp, circles in and pecks; everywhere
//   Gunship  slow and wide, 80 hp, a 3-shot spread that hurts; common out by Kepler-4b
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

// which type turns up at a spot: raiders prowl the station lanes, gunships hold the planet side
function pirateTypeFor(s, x, y) {
  const d = Phaser.Math.Distance.Between(x, y, s.station.x, s.station.y), r = Math.random();
  if (d < 1800) return r < 0.5 ? 'raider' : 'drone';
  if (d < 3200) return r < 0.25 ? 'raider' : r < 0.8 ? 'drone' : 'gunship';
  return r < 0.4 ? 'gunship' : r < 0.65 ? 'raider' : 'drone';
}

// type: a PIRATES key, a whole def (the Reaver in missions.js), or nothing to pick by distance
function spawnPirate(s, x, y, type) {
  const def = typeof type === 'object' && type ? type : PIRATES[type] || PIRATES[pirateTypeFor(s, x, y)];
  const d = s.enemies.create(x, y, def.tex).setDepth(4);
  d.def = def; d.hp = def.hp; d.nextShot = 0; d.rotation = Math.random() * 6.28;
  d.side = Math.random() < 0.5 ? -1 : 1; d.flipAt = 0;
  d.body.setCircle(def.body[0], def.body[1], def.body[2]).setDamping(true).setDrag(0.5).setMaxSpeed(def.max);
  return d;
}

// one frame of one pirate: chase its prey (the escort freighter) or you, then shoot when lined up
function pirateAI(s, d, ship, time) {
  if (!d.active || !d.body) return;
  const def = d.def || PIRATES.drone;
  if (def.ai) return def.ai(s, d, ship, time); // a boss brings its own brain
  const tgt = d.prey && d.prey.active ? d.prey : ship;
  const ddx = tgt.x - d.x, ddy = tgt.y - d.y, dist = Math.hypot(ddx, ddy);
  if (dist >= def.engage) { d.body.setAcceleration(0, 0); d.rotation += 0.003; return; }
  const target = Math.atan2(ddy, ddx);
  d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, target, def.turn);
  if (def.strafe) {
    if (time > d.flipAt) { d.flipAt = time + Phaser.Math.Between(1400, 2600); d.side = -d.side; }
    const ang = dist > def.hold ? target : target + d.side * 1.35; // close in, then circle
    s.physics.velocityFromRotation(ang, def.speed, d.body.acceleration);
  } else if (dist > def.hold) s.physics.velocityFromRotation(d.rotation, def.speed, d.body.acceleration);
  else d.body.setAcceleration(0, 0);
  if (dist < def.range && time > d.nextShot && Math.abs(Phaser.Math.Angle.Wrap(target - d.rotation)) < def.aim) {
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
