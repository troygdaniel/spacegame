// ---------- Surface: walk, find the colonist, protect them, bring them home ----------
class Surface extends Phaser.Scene {
  constructor() { super('Surface'); }
  create() {
    this.leaving = false;
    const SW = 2400, SH = 1400; this.pad = { x: 200, y: 700 };
    this.physics.world.setBounds(0, 0, SW, SH);
    this.cameras.main.setBounds(0, 0, SW, SH).fadeIn(300, 0, 0, 0);
    this.add.tileSprite(0, 0, SW, SH, 'ground').setOrigin(0);
    const pg = this.add.graphics();
    pg.lineStyle(4, AMBER, 0.9); pg.strokeCircle(this.pad.x, this.pad.y, 100);
    pg.lineStyle(2, AMBER, 0.4); pg.strokeCircle(this.pad.x, this.pad.y, 116);
    this.add.image(this.pad.x, this.pad.y, 'ship').setScale(1.8).setRotation(-Math.PI / 2).setDepth(1);
    label(this, this.pad.x, this.pad.y + 130, 'YOUR SHIP', '#ffb454');

    this.pod = { x: 2100, y: 700 };
    pg.fillStyle(0x24262b, 1); pg.fillCircle(this.pod.x, this.pod.y, 34);
    pg.lineStyle(3, AMBER, 0.9); pg.strokeCircle(this.pod.x, this.pod.y, 34);
    label(this, this.pod.x, this.pod.y - 56, 'CRASHED POD', '#ffb454');

    this.rocks = this.physics.add.staticGroup();
    [[500, 400], [620, 980], [820, 700], [1000, 300], [1100, 1100], [1300, 650], [1450, 380], [1500, 1000],
     [1750, 520], [1700, 860], [1950, 300], [1950, 1050], [2250, 420], [2250, 1000], [400, 1200], [800, 150]]
      .forEach(([x, y]) => { this.rocks.create(x, y, 'rock').setScale(Phaser.Math.FloatBetween(0.9, 1.5)).refreshBody(); });

    this.player = this.physics.add.sprite(300, 700, 'walker').setCollideWorldBounds(true).setDepth(5);
    this.player.body.setCircle(8, 2, 3);
    this.physics.add.collider(this.player, this.rocks);
    this.hp = 100;
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.col = null;
    if (missionActive('rescue')) {
      const s = this.physics.add.sprite(this.pod.x - 50, this.pod.y + 20, 'colonist').setDepth(4);
      s.body.setCircle(8, 3, 3);
      this.physics.add.collider(s, this.rocks);
      this.col = { s, hp: 60, state: 'waiting' };
    }

    this.crawlers = this.physics.add.group();
    [[1700, 500], [1850, 900], [1950, 600], [2000, 820], [2250, 640], [1600, 740], [2150, 480]].forEach(([x, y]) => {
      const c = this.crawlers.create(x, y, 'crawler').setDepth(4);
      c.hp = 36; c.body.setCircle(11, 4, 4); c.turn = 0; c.dir = Math.random() * 6.28;
    });
    this.physics.add.collider(this.crawlers, this.rocks);

    this.pb = this.physics.add.group({ defaultKey: 'bullet', maxSize: 40 });
    this.physics.add.collider(this.pb, this.rocks, b => { if (b.active) b.disableBody(true, true); });
    this.boom = this.add.particles(0, 0, 'spark', {
      lifespan: 500, speed: { min: 40, max: 200 }, scale: { start: 1.8, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [GREEN, 0xfff1a8], blendMode: 'ADD', emitting: false
    }).setDepth(6);
    this.physics.add.overlap(this.pb, this.crawlers, (b, c) => {
      if (!b.active || !c.active) return;
      b.disableBody(true, true); c.hp -= 12; c.setTint(0xffffff); this.time.delayedCall(70, () => c.active && c.clearTint());
      this.boom.explode(5, b.x, b.y); sfx('tick'); feelNumber(this, c.x, c.y - 16, '12');
      if (c.hp <= 0) { this.boom.explode(22, c.x, c.y); c.destroy(); sfx('boom'); }
    });

    this.k = this.input.keyboard.addKeys('W,A,S,D,E,UP,DOWN,LEFT,RIGHT');
    this.nextFire = 0; this.tmp = new Phaser.Math.Vector2();
    this.prompt = floatPrompt(this, this.player); // key cap above you instead of a strip at the bottom (src/ui.js)
    this.add.text(24, H - 44, 'WASD walk   aim with mouse   click fire   E interact', {
      fontFamily: 'monospace', fontSize: '14px', color: '#5b7a92'
    }).setScrollFactor(0).setDepth(100);
    toast(this, missionActive('rescue') ? 'Landed. Find the colonist. The pod is to the east.' : 'Landed on Kepler-4b. Nobody needs you here yet.', '#9fe9ff');
    feelInstall(this); // src/feel.js: hit cues, muzzle flash, landing zoom
  }

  update(time, dt) {
    guideTick(this);
    const k = this.k, p = this.player, JD = Phaser.Input.Keyboard.JustDown, col = this.col;
    if (this.leaving) { feelFrame(this, time, dt); return; } // lift-off move is playing (feel.js)
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(210);
    p.setVelocity(v.x, v.y);
    const ptr = this.input.activePointer; ptr.positionToCamera(this.cameras.main, this.tmp);
    const aim = Phaser.Math.Angle.Between(p.x, p.y, this.tmp.x, this.tmp.y);
    p.rotation = aim;
    if (ptr.isDown && time > this.nextFire) {
      this.nextFire = time + 200;
      const b = this.pb.get(p.x, p.y);
      if (b) {
        b.enableBody(true, p.x + Math.cos(aim) * 14, p.y + Math.sin(aim) * 14, true, true);
        b.setRotation(aim).setDepth(4); b.born = time;
        this.physics.velocityFromRotation(aim, 820, b.body.velocity);
        sfx('laser'); feelShot(this, p.x + Math.cos(aim) * 16, p.y + Math.sin(aim) * 16, aim);
      }
    }
    this.pb.getChildren().forEach(b => { if (b.active && time - b.born > 800) b.disableBody(true, true); });

    // colonist
    if (col && col.state === 'following') {
      const d = Phaser.Math.Distance.Between(col.s.x, col.s.y, p.x, p.y);
      if (d > 80) this.physics.moveToObject(col.s, p, 160); else col.s.setVelocity(0, 0);
    }

    // crawlers hunt the nearest of the player and the colonist
    this.crawlers.getChildren().slice().forEach(c => {
      let tgt = null, best = 380;
      const dp = Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y);
      if (dp < best) { best = dp; tgt = p; }
      if (col && col.state !== 'dead') {
        const dc = Phaser.Math.Distance.Between(c.x, c.y, col.s.x, col.s.y);
        if (dc < best) { best = dc; tgt = col.s; }
      }
      if (tgt) {
        this.physics.moveToObject(c, tgt, 100);
        c.rotation = Phaser.Math.Angle.Between(c.x, c.y, tgt.x, tgt.y);
        if (best < 28) {
          if (tgt === p) { this.hp -= dt * 0.02; feelBite(this, c.x, c.y); }
          else col.hp -= dt * 0.012;
        }
      } else {
        c.turn -= dt;
        if (c.turn <= 0) { c.turn = Phaser.Math.Between(1500, 3000); c.dir = Math.random() * 6.28; }
        this.physics.velocityFromRotation(c.dir, 40, c.body.velocity); c.rotation = c.dir;
      }
    });

    if (this.hp <= 0) {
      this.hp = 100; p.setPosition(300, 700); beep(100, 0.4, 'sawtooth', 0.05, -50);
      if (col && col.state === 'following') col.state = 'waiting';
      toast(this, 'You were knocked out. You wake up by the ship.', '#ff4d6d');
    }
    if (col && col.state !== 'dead' && col.hp <= 0) {
      col.state = 'dead'; this.boom.explode(20, col.s.x, col.s.y); col.s.destroy();
      G.mission = 'failed'; this.col = null; beep(150, 0.6, 'sawtooth', 0.05, -100);
      toast(this, 'The colonist did not make it. Mission failed.', '#ff4d6d');
    }

    // interactions
    let msg = '';
    const c2 = this.col;
    const nearCol = c2 && c2.state === 'waiting' && Phaser.Math.Distance.Between(p.x, p.y, c2.s.x, c2.s.y) < 70;
    const nearPad = Phaser.Math.Distance.Between(p.x, p.y, this.pad.x, this.pad.y) < 110;
    if (nearCol) {
      msg = 'E  Talk to the colonist';
      if (JD(k.E)) { c2.state = 'following'; beep(520, 0.15, 'triangle', 0.05, 300); toast(this, 'Colonist: "Thank god. Get me out of here."', '#ffd37a'); }
    } else if (nearPad) {
      const withMe = c2 && c2.state === 'following' && Phaser.Math.Distance.Between(c2.s.x, c2.s.y, p.x, p.y) < 180;
      msg = c2 && c2.state === 'following' && !withMe ? 'Wait for the colonist to catch up' : 'E  Board ship and lift off';
      if (JD(k.E)) {
        if (c2 && c2.state === 'following' && !withMe) toast(this, 'The colonist is still on the way.', '#ffd37a');
        else {
          if (withMe) { G.mission = 'rescued'; toast(this, 'Colonist aboard. Take them home.', '#6dff9c'); }
          sfx('thrusters'); feelLiftoff(this, () => go(this, 'Space', { from: 'surface' }));
        }
      }
    }
    this.prompt.setText(msg);

    hudTick(this); // src/hud.js
    feelFrame(this, time, dt); // src/feel.js: hit cues, muzzle flash, low-health pulse
  }
}
