// ---------- Title screen, and the faint speed streaks that show while boosting ----------
class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.leaving = false; this.born = performance.now();
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.s1 = this.add.tileSprite(0, 0, W, H, 'stars1').setOrigin(0);
    this.s2 = this.add.tileSprite(0, 0, W, H, 'stars2').setOrigin(0);
    this.add.image(1030, 790, 'planet').setScale(1.15);
    const st = this.add.image(230, 210, 'station').setScale(0.5).setAlpha(0.9);
    this.tweens.add({ targets: st, angle: 360, duration: 160000, repeat: -1 });

    // a ship crosses the screen every few seconds
    const fly = () => {
      if (this.leaving) return;
      const y0 = Phaser.Math.Between(430, 650), y1 = y0 - Phaser.Math.Between(150, 330);
      const sh = this.add.image(-60, y0, 'ship').setScale(1.8).setDepth(5).setRotation(Math.atan2(y1 - y0, 1400));
      const trail = this.add.particles(0, 0, 'spark', {
        lifespan: 520, speed: { min: 5, max: 25 }, scale: { start: 1.5, end: 0 }, alpha: { start: 0.8, end: 0 },
        tint: CYAN, blendMode: 'ADD', emitting: false
      }).setDepth(4);
      this.tweens.add({
        targets: sh, x: 1360, y: y1, duration: 5400, ease: 'Sine.easeInOut',
        onUpdate: () => trail.emitParticleAt(sh.x - Math.cos(sh.rotation) * 36, sh.y - Math.sin(sh.rotation) * 36, 2),
        onComplete: () => { sh.destroy(); this.time.delayedCall(900, () => trail.destroy()); }
      });
    };
    this.time.delayedCall(900, fly);
    this.time.addEvent({ delay: 8000, loop: true, callback: fly });

    // title block
    const mono = (size, color) => ({ fontFamily: 'monospace', fontSize: size + 'px', color });
    this.add.rectangle(W / 2, 214, 640, 2, CYAN, 0.7);
    this.add.rectangle(W / 2, 332, 640, 2, CYAN, 0.7);
    this.add.rectangle(W / 2 - 320, 214, 22, 2, AMBER, 1).setOrigin(0, 0.5);
    this.add.rectangle(W / 2 + 320, 332, 22, 2, AMBER, 1).setOrigin(1, 0.5);
    this.add.text(W / 2, 273, 'L O N G   H A U L', mono(70, '#38e1ff')).setOrigin(0.5).setPadding(40, 30, 40, 30).setShadow(0, 0, '#38e1ff', 22, false, true); // padding gives the glow room
    this.add.text(W / 2, 372, 'HALCYON STATION   >   KEPLER-4B', mono(18, '#ffb454')).setOrigin(0.5).setPadding(16, 12, 16, 12).setShadow(0, 0, '#ffb454', 8, false, true);
    const any = this.add.text(W / 2, 520, 'PRESS ANY KEY', mono(26, '#ffffff')).setOrigin(0.5).setPadding(20, 14, 20, 14).setShadow(0, 0, '#ffffff', 10, false, true);
    this.tweens.add({ targets: any, alpha: 0.25, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, H - 34, 'W A S D move    E use    Esc pause    M mute', mono(14, '#5b7a92')).setOrigin(0.5);

    const start = () => {
      if (this.leaving || performance.now() - this.born < 500) return;
      beep(520, 0.12, 'triangle', 0.05, 300); beep(780, 0.2, 'triangle', 0.04, 200);
      go(this, 'Station', { arrive: false });
    };
    this.input.keyboard.on('keydown', e => { if (!e.repeat && e.code !== 'KeyM') start(); }); // M still mutes
    this.input.on('pointerdown', start);
  }
  update(time, dt) {
    this.s1.tilePositionX += dt * 0.006; this.s1.tilePositionY += dt * 0.0015;
    this.s2.tilePositionX += dt * 0.014; this.s2.tilePositionY += dt * 0.0035;
  }
}

// Called once from main.js. Draws streaks into the Space scene from outside, so space.js needs no change.
function installLookFx(game) {
  const ps = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 0.5 + Math.random() }));
  let k = 0; // 0..1, how strongly the streaks show; eases in and out
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const s = game.scene.getScene('Space');
    const live = !!(s && s.sys.isActive() && s.ship && s.ship.body && s.k && !s.dead);
    if (live && (!s._fx || !s._fx.active)) s._fx = s.add.graphics().setScrollFactor(0).setDepth(-8);
    const boosting = live && s.boosting; // boost.js
    k += ((boosting ? Phaser.Math.Clamp((s.ship.body.speed - 450) / 300, 0, 1) : 0) - k) * 0.12;
    if (!s || !s._fx || !s._fx.active) return;
    const g = s._fx; g.clear();
    if (!live || k < 0.02) return;
    const v = s.ship.body.velocity, sp = Math.hypot(v.x, v.y) || 1, dx = v.x / sp, dy = v.y / sp, dt = game.loop.delta / 1000;
    g.lineStyle(1.5, 0x9fe9ff, 0.35 * k);
    ps.forEach(p => {
      p.x -= dx * sp * 0.9 * dt * p.l; p.y -= dy * sp * 0.9 * dt * p.l; // slides against the flight direction
      if (p.x < -40) p.x += W + 80; else if (p.x > W + 40) p.x -= W + 80;
      if (p.y < -40) p.y += H + 80; else if (p.y > H + 40) p.y -= H + 80;
      const len = (30 + 90 * p.l) * k;
      g.lineBetween(p.x, p.y, p.x + dx * len, p.y + dy * len);
    });
  });
}
