// ---------- Asteroid belt: shoot rocks into ore, collect it, sell it when you dock ----------
// space.js calls asteroidsSetup(this) in create() and asteroidsUpdate(this, time, dt) in update();
// station.js calls sellOre(this) when you dock; hud.js shows the hold on the strip; meta.js saves G.ore.
const ORE_CAP = 10;       // the cargo hold
const ORE_PRICE = 20;     // credits per ore, paid when you dock
const BELT = { x: 5500, y: 1300, r: 700 }; // north-west of Kepler-4b
const ROCK_HP = { 1: 15, 2: 30, 3: 60 }, ROCK_SCALE = { 1: 0.38, 2: 0.65, 3: 1 };

G.ore = 0;

function asteroidsSetup(s) {
  const a = s.ast = { rocks: s.physics.add.group(), ore: [], bumpAt: 0, fullAt: 0, told: false };
  // scatter rocks, keeping them apart so the belt reads as separate boulders
  const spots = [];
  for (let tries = 0; spots.length < 15 && tries < 400; tries++) {
    const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * BELT.r;
    const p = { x: BELT.x + Math.cos(ang) * d, y: BELT.y + Math.sin(ang) * d };
    if (spots.every(q => Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) > 140)) spots.push(p);
  }
  spots.forEach((p, i) => spawnRock(s, p.x, p.y, i < 5 ? 3 : i < 10 ? 2 : 1));
  label(s, BELT.x, BELT.y - BELT.r - 70, 'KEPLER BELT', '#9fb4c9', 16);

  // a wrecked ship loses its cargo: wrap die() on this scene instance, so space.js needs no change
  const die = s.die.bind(s);
  s.die = () => { if (G.ore > 0) { G.ore = 0; s.time.delayedCall(700, () => toast(s, 'Cargo lost with the ship.', '#ff4d6d')); } die(); };

  s.ship.body.setBounce(0.4); // rocks bump you back a little
  s.physics.add.collider(s.ship, a.rocks, () => {
    const now = s.time.now;
    if (now < a.bumpAt || s.dead) return;
    a.bumpAt = now + 400; s.cameras.main.shake(70, 0.0025); sfx('tick');
  });
  s.physics.add.overlap(s.pb, a.rocks, (b, r) => {
    if (!b.active || !r.active) return;
    b.disableBody(true, true); r.hp -= 15; s.boom.explode(3, b.x, b.y); sfx('tick');
    r.setTint(0xffffff); s.time.delayedCall(60, () => r.active && r.clearTint());
    if (r.hp <= 0) breakRock(s, r);
  });
  s.physics.add.overlap(s.eb, a.rocks, (b, r) => { if (b.active && r.active) { b.disableBody(true, true); s.boom.explode(2, b.x, b.y); } }); // rocks are cover
}

function spawnRock(s, x, y, size, vx, vy) {
  const r = s.ast.rocks.create(x, y, ['asteroid', 'asteroid2', 'asteroid3'][Math.floor(Math.random() * 3)]).setDepth(2).setScale(ROCK_SCALE[size]).setRotation(Math.random() * 6.28);
  r.size = size; r.hp = ROCK_HP[size]; r.spin = Phaser.Math.FloatBetween(-0.0006, 0.0006);
  r.body.setCircle(26, 6, 6).setImmovable(true);
  r.setVelocity(vx !== undefined ? vx : Phaser.Math.Between(-9, 9), vy !== undefined ? vy : Phaser.Math.Between(-9, 9));
  return r;
}

function breakRock(s, r) {
  const a = s.ast, size = r.size, x = r.x, y = r.y;
  s.boom.explode(10 + size * 6, x, y); sfx('hit'); fxDebris(s, x, y, size); // src/art_world.js
  r.destroy();
  if (size > 1) { // two smaller rocks fly apart
    const ang = Math.random() * Math.PI * 2;
    [0, Math.PI].forEach(o => {
      const d = 16 + size * 10;
      spawnRock(s, x + Math.cos(ang + o) * d, y + Math.sin(ang + o) * d, size - 1, Math.cos(ang + o) * 45, Math.sin(ang + o) * 45);
    });
  }
  if (size > 1 || Math.random() < 0.5) dropOre(s, x, y);
}

function dropOre(s, x, y) {
  const o = s.add.image(x, y, 'ore').setDepth(3).setBlendMode('ADD');
  s.tweens.add({ targets: o, scale: 1.25, yoyo: true, repeat: -1, duration: 500 });
  s.ast.ore.push({ img: o, vx: Phaser.Math.Between(-30, 30), vy: Phaser.Math.Between(-30, 30), born: s.time.now });
}

function asteroidsUpdate(s, time, dt) {
  const a = s.ast; if (!a) return;
  const ship = s.ship, sec = dt / 1000;
  a.rocks.getChildren().forEach(r => { if (r.active) { r.rotation += r.spin * dt; hudBlip(s, r.x, r.y, 0x6a7a90, r.size > 1 ? 2 : 1.4); } });

  // ore drifts, gets pulled in when you are close, and is collected on touch (while the hold has room)
  for (let i = a.ore.length - 1; i >= 0; i--) {
    const o = a.ore[i], img = o.img, age = time - o.born;
    const d = Phaser.Math.Distance.Between(img.x, img.y, ship.x, ship.y);
    if (age > 60000) { img.destroy(); a.ore.splice(i, 1); continue; }
    if (age > 45000) img.setAlpha(0.4 + 0.3 * Math.sin(age / 90)); // about to vanish
    if (d < 170 && G.ore < ORE_CAP) { // magnet
      const ang = Phaser.Math.Angle.Between(img.x, img.y, ship.x, ship.y), pull = 120 + (170 - d) * 2.2;
      o.vx = Math.cos(ang) * pull; o.vy = Math.sin(ang) * pull;
    } else { o.vx *= 0.985; o.vy *= 0.985; }
    img.x += o.vx * sec; img.y += o.vy * sec;
    if (d < 30) {
      if (G.ore < ORE_CAP) {
        G.ore++; fxPickup(s, img.x, img.y, 0xffb454); img.destroy(); a.ore.splice(i, 1); beep(900 + G.ore * 40, 0.06, 'triangle', 0.03);
        if (G.ore === ORE_CAP) toast(s, 'Cargo hold full: ' + ORE_CAP + ' ore. Sell it at Halcyon Station.', '#ffd37a');
      } else if (time > a.fullAt) { a.fullAt = time + 4000; toast(s, 'Cargo hold full. Sell the ore at Halcyon Station.', '#ffd37a'); }
    }
  }
  if (!a.told && Phaser.Math.Distance.Between(ship.x, ship.y, BELT.x, BELT.y) < BELT.r + 700) {
    a.told = true; toast(s, 'Kepler belt: shoot rocks, fly through the ore, sell it at Halcyon.', '#9fe9ff');
  }
}

// docking sells the hold (called from station.js)
function sellOre(s) {
  const n = G.ore | 0; if (n <= 0) return;
  const pay = n * ORE_PRICE; G.ore = 0; G.credits += pay;
  s.time.delayedCall(900, () => { toast(s, 'Sold ' + n + ' ore  +' + pay + ' cr', '#6dff9c'); sfx('chime'); });
}
