// ---------- Traffic: civilian freighters that come and go, and the station police ----------
// space.js calls trafficSetup(this) at the end of create() and trafficUpdate(this, time, dt) before hudTick().
// Civilians and police are plain sprites moved by hand: you cannot hurt them, they cannot hurt you.
const POLICE_ZONE = 900;   // police attack a pirate drone this close to the station
const CIV_TINTS = [0x7fc8ff, 0x9dffa8, 0xff9ec8, 0xc3a8ff, 0xffd36a]; // the civilian hull is pale, so these read as clear colours
const CIV_FINE = 30;       // credits, if you shoot a civilian
const RADIO = [
  'Halcyon traffic control: you are clear, welcome back.',
  'Halcyon traffic control: patrol has you on scope. Safe flying, pilot.',
  'Halcyon traffic control: lanes are quiet near the station. Keep it that way.'
];
let radioLast = -1;        // so the same line never plays twice in a row, even across visits

// The system's traffic level (0 to 3, src/data_systems.js) says how busy it is: 0 is an empty sky (no police, no civilians; the Hollow, Lethe, the Roost), 1 one police cruiser and
// one civilian at a time, 2 two of each (Halcyon, as it always was), 3 two police and three civilians (Meridian). A system with no station has none either.
function trafficSetup(s) {
  const level = sysDef().traffic | 0; // src/universe.js
  const t = s.tr = { police: [], civ: [], nextCiv: s.time.now + 7000, armed: s.from === 'surface', fineAt: 0, cap: level, off: level < 1 || !!s.station.nowhere };
  if (t.off) return;
  t.bullets = s.physics.add.group({ defaultKey: 'bullet', maxSize: 24 });
  s.physics.add.overlap(t.bullets, s.enemies, (b, e) => {
    if (!b.active || !e.active || e.wanted) return; // the wanted pirates of the patrol mission are yours to catch
    b.disableBody(true, true); e.hp -= 10; s.boom.explode(3, b.x, b.y); shipsHit(s, e, b.x, b.y);
    if (e.hp <= 0) { s.boom.explode(24, e.x, e.y); e.destroy(); } // no credits, no mission progress: the police just clear the lane
  });
  [[0.5, 620, 0.00034], [3.6, 820, -0.00028]].slice(0, Math.min(2, level)).forEach(([a, r, w]) => {
    const img = s.add.image(0, 0, 'police').setDepth(4);
    const l1 = s.add.image(0, 0, 'spark').setDepth(4).setBlendMode('ADD').setScale(1.6).setTint(0xff4d6d);
    const l2 = s.add.image(0, 0, 'spark').setDepth(4).setBlendMode('ADD').setScale(1.6).setTint(0x7fb8ff);
    t.police.push({ img, l1, l2, a, r, w, state: 'orbit', target: null, nextShot: 0 });
  });
  trafficPoliceStep(s, 0, true); // put them on their orbits straight away
  spawnCivilian(s, true);
}

// ---------- police ----------
function policeOrbitPoint(s, p) { return { x: s.station.x + Math.cos(p.a) * p.r, y: s.station.y + Math.sin(p.a) * p.r }; }

function trafficPoliceStep(s, dt, snap) {
  const t = s.tr, st = s.station, time = s.time.now;
  t.police.forEach(p => {
    const img = p.img;
    p.a += p.w * dt;
    const op = policeOrbitPoint(s, p);
    if (snap) { img.setPosition(op.x, op.y); img.rotation = p.a + (p.w > 0 ? Math.PI / 2 : -Math.PI / 2); }
    else {
      // look for a pirate inside the zone (not the wanted ones)
      if (p.state !== 'engage') {
        let best = null, bd = Infinity;
        s.enemies.getChildren().forEach(d => {
          if (!d.active || d.wanted) return;
          const ds = Phaser.Math.Distance.Between(d.x, d.y, st.x, st.y);
          if (ds < POLICE_ZONE && ds < bd) { bd = ds; best = d; }
        });
        if (best) { p.state = 'engage'; p.target = best; }
      }
      if (p.state === 'orbit') {
        img.setPosition(op.x, op.y); img.rotation = p.a + (p.w > 0 ? Math.PI / 2 : -Math.PI / 2);
      } else if (p.state === 'engage') {
        const d = p.target;
        if (!d || !d.active || Phaser.Math.Distance.Between(d.x, d.y, st.x, st.y) > POLICE_ZONE + 250) { p.state = 'return'; p.target = null; }
        else {
          const ang = Phaser.Math.Angle.Between(img.x, img.y, d.x, d.y), dist = Phaser.Math.Distance.Between(img.x, img.y, d.x, d.y);
          img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, ang, 0.0042 * dt);
          const sp = dist > 260 ? 340 : 110;
          img.x += Math.cos(img.rotation) * sp * dt / 1000; img.y += Math.sin(img.rotation) * sp * dt / 1000;
          if (dist < 560 && time > p.nextShot && Math.abs(Phaser.Math.Angle.Wrap(ang - img.rotation)) < 0.2) {
            p.nextShot = time + 420;
            const b = t.bullets.get(img.x, img.y);
            if (b) {
              b.enableBody(true, img.x + Math.cos(img.rotation) * 22, img.y + Math.sin(img.rotation) * 22, true, true);
              b.setRotation(img.rotation).setDepth(4).setTint(0x7fd0ff); b.born = time;
              s.physics.velocityFromRotation(img.rotation, 760, b.body.velocity);
            }
          }
        }
      } else { // return to the orbit point
        const ang = Phaser.Math.Angle.Between(img.x, img.y, op.x, op.y), dist = Phaser.Math.Distance.Between(img.x, img.y, op.x, op.y);
        img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, ang, 0.005 * dt);
        img.x += Math.cos(img.rotation) * 360 * dt / 1000; img.y += Math.sin(img.rotation) * 360 * dt / 1000;
        if (dist < 70) p.state = 'orbit';
      }
    }
    // blinking light bar on the wing tips
    const on = Math.floor(time / 260) % 2 === 0, c = Math.cos(img.rotation), n = Math.sin(img.rotation);
    p.l1.setPosition(img.x - c * 18 - n * -11, img.y - n * 18 + c * -11).setVisible(on);
    p.l2.setPosition(img.x - c * 18 - n * 11, img.y - n * 18 + c * 11).setVisible(!on);
  });
  t.bullets.getChildren().forEach(b => { if (b.active && time - b.born > 800) b.disableBody(true, true); });
}

// ---------- civilians ----------
function spawnCivilian(s, initial) {
  const t = s.tr, st = s.station, pl = s.planet, gate = sysBody('gate'); // src/universe.js
  let goal;
  if (Math.random() < 0.6 || !gate) { // park short of the planet, on the line from the station
    const a = Phaser.Math.Angle.Between(st.x, st.y, pl.x, pl.y);
    goal = { x: pl.x - Math.cos(a) * 760, y: pl.y - Math.sin(a) * 760 };
  } else {                   // or fly out toward the Perseus gate
    const a = Phaser.Math.Angle.Between(gate.x, gate.y, st.x, st.y);
    goal = { x: gate.x + Math.cos(a) * 240, y: gate.y + Math.sin(a) * 240 };
  }
  const a0 = Phaser.Math.Angle.Between(st.x, st.y, goal.x, goal.y), f = initial ? Phaser.Math.FloatBetween(0.2, 0.5) : 0;
  const x = st.x + Math.cos(a0) * (240 + f * Phaser.Math.Distance.Between(st.x, st.y, goal.x, goal.y));
  const y = st.y + Math.sin(a0) * (240 + f * Phaser.Math.Distance.Between(st.x, st.y, goal.x, goal.y));
  const img = s.add.image(x, y, 'civilian').setDepth(3).setScale(0.85).setTint(Phaser.Utils.Array.GetRandom(CIV_TINTS)).setRotation(a0);
  if (!initial) img.setAlpha(0);
  t.civ.push({ img, tint: img.tintTopLeft, goal, state: 'out', phase: Math.random() * 6.28, speed: Phaser.Math.Between(110, 150), until: 0 });
}

function trafficCivilianStep(s, time, dt) {
  const t = s.tr, st = s.station;
  for (let i = t.civ.length - 1; i >= 0; i--) {
    const c = t.civ[i], img = c.img;
    if (img.alpha < 1 && c.state !== 'leaving') img.alpha = Math.min(1, img.alpha + dt / 900);
    if (c.state === 'loiter') { if (time > c.until) c.state = 'back'; continue; }
    if (c.state === 'leaving') { // docked: fade away
      img.alpha -= dt / 800;
      if (img.alpha <= 0) { img.destroy(); t.civ.splice(i, 1); }
      continue;
    }
    const tgt = c.state === 'out' ? c.goal : st;
    const ang = Phaser.Math.Angle.Between(img.x, img.y, tgt.x, tgt.y) + Math.sin(time * 0.0006 + c.phase) * 0.14; // a gentle weave
    img.rotation = Phaser.Math.Angle.RotateTo(img.rotation, ang, 0.0014 * dt);
    img.x += Math.cos(img.rotation) * c.speed * dt / 1000; img.y += Math.sin(img.rotation) * c.speed * dt / 1000;
    s.trail.emitParticleAt(img.x - Math.cos(img.rotation) * 26, img.y - Math.sin(img.rotation) * 26, 1);
    const d = Phaser.Math.Distance.Between(img.x, img.y, tgt.x, tgt.y);
    if (c.state === 'out' && d < 90) { c.state = 'loiter'; c.until = time + 3500; }
    else if (c.state === 'back' && d < 260) c.state = 'leaving';
  }
}

// a shot from you reached a civilian: the bullet is lost, you pay a small fine
function trafficCheckFriendlyFire(s, time) {
  const t = s.tr;
  s.pb.getChildren().forEach(b => {
    if (!b.active) return;
    for (const c of t.civ) {
      if (c.state === 'leaving' || Phaser.Math.Distance.Between(b.x, b.y, c.img.x, c.img.y) > 34) continue;
      b.disableBody(true, true);
      c.img.setTint(0xffffff); s.time.delayedCall(120, () => c.img.active && c.img.setTint(c.tint));
      if (time > t.fineAt) {
        t.fineAt = time + 2000;
        const f = Math.min(G.credits, CIV_FINE); G.credits -= f;
        toast(s, f ? sysDef().name + ' traffic control: that was a civilian. Fine: ' + f + ' cr' : sysDef().name + ' traffic control: that was a civilian. Logged.', '#ff4d6d');
        sfx('hit');
      }
      return;
    }
  });
}

// the first time you pass a patrol (after launching clear, or arriving from the surface), traffic control says hello
function trafficRadio(s) {
  const t = s.tr, ship = s.ship;
  if (!t.armed) { if (Phaser.Math.Distance.Between(ship.x, ship.y, s.station.x, s.station.y) > 1500) t.armed = true; return; }
  for (const p of t.police) {
    if (Phaser.Math.Distance.Between(ship.x, ship.y, p.img.x, p.img.y) > 600) continue;
    let v; do { v = Phaser.Math.Between(0, RADIO.length - 1); } while (v === radioLast);
    radioLast = v; t.armed = false;
    toast(s, RADIO[v].replace('Halcyon', sysDef().name), '#9fe9ff'); sfx('tick');
    return;
  }
}

function trafficUpdate(s, time, dt) {
  const t = s.tr; if (!t || t.off) return;
  dt = Math.min(dt, 100);
  trafficPoliceStep(s, dt, false);
  trafficCivilianStep(s, time, dt);
  if (t.civ.length < t.cap && time > t.nextCiv) { spawnCivilian(s, false); t.nextCiv = time + Phaser.Math.Between(14000, 26000); }
  if (!s.dead) { trafficCheckFriendlyFire(s, time); trafficRadio(s); }
  t.police.forEach(p => hudBlip(s, p.img.x, p.img.y, 0x7fb8ff, 3));
  t.civ.forEach(c => hudBlip(s, c.img.x, c.img.y, 0x9fe9ff, 2));
}
