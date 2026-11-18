// ---------- Surface: walk, find the colonist, protect them, bring them home ----------
class Surface extends Phaser.Scene {
  constructor() { super('Surface'); }
  create() {
    this.leaving = false;
    shipRefresh(this); // src/ships.js: the parked ship shows the upgrade tiers you own
    const SW = 2400, SH = 1400; this.pad = { x: 200, y: 700 };
    this.physics.world.setBounds(0, 0, SW, SH);
    this.cameras.main.setBounds(0, 0, SW, SH).fadeIn(300, 0, 0, 0);
    this.add.tileSprite(0, 0, SW, SH, 'ground').setOrigin(0);
    this.pod = { x: 2100, y: 700 };
    surfaceDress(this); // src/art_world.js: terrain colour, landing pad, wreck, smoke, dust, vignette, beacon
    this.add.image(this.pad.x, this.pad.y, 'ship').setScale(1.8).setRotation(-Math.PI / 2).setDepth(1);
    label(this, this.pad.x, this.pad.y + 130, 'YOUR SHIP', '#ffb454');

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
    this.boom = fxBoom(this, { spark: [GREEN, 0xfff1a8], ember: [0x6dff9c, 0xb6ffd0, 0xfff1a8], flash: 0xb6ffd0, ring: 0x8affb4 }); // src/art_world.js
    this.physics.add.overlap(this.pb, this.crawlers, (b, c) => {
      if (!b.active || !c.active) return;
      b.disableBody(true, true); c.hp -= 12; c.setTint(0xffffff); this.time.delayedCall(70, () => c.active && c.clearTint());
      this.boom.explode(5, b.x, b.y); sfx('tick'); feelNumber(this, c.x, c.y - 16, '12');
      if (c.hp <= 0) { this.boom.explode(22, c.x, c.y); c.destroy(); sfx('boom'); }
    });

    this.k = this.input.keyboard.addKeys('W,A,S,D,E,UP,DOWN,LEFT,RIGHT');
    this.nextFire = 0; this.tmp = new Phaser.Math.Vector2();
    this.prompt = floatPrompt(this, this.player); // key cap above you instead of a strip at the bottom (src/ui.js)
    surfaceYou(this); // a mark on you for the first seconds (below)
    surfaceControls(this); // controls panel on arrival (fades; C brings it back) and the aim line and cursor, both below
    surfaceAimInit(this);
    toast(this, missionActive('rescue') ? 'Landed. Find the colonist. The pod is to the east.' : 'Landed on Kepler-4b. Nobody needs you here yet.', '#9fe9ff');
    feelInstall(this); // src/feel.js: hit cues, muzzle flash, landing zoom
  }

  update(time, dt) {
    guideTick(this);
    const k = this.k, p = this.player, JD = Phaser.Input.Keyboard.JustDown, col = this.col;
    if (this.leaving) { this.aimG.clear(); this.reticle.clear(); feelFrame(this, time, dt); return; } // lift-off move is playing (feel.js)
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(210);
    p.setVelocity(v.x, v.y);
    const ptr = this.input.activePointer; ptr.positionToCamera(this.cameras.main, this.tmp);
    const aim = Phaser.Math.Angle.Between(p.x, p.y, this.tmp.x, this.tmp.y);
    p.rotation = aim;
    surfaceAimDraw(this, ptr, aim);
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
      if (col && col.state === 'following') { // a colonist waiting at the pod is left alone until woken
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
    this.prompt.offsetY = surfacePromptSide(this, p); // above you, or below when above would cover the mission panel (the landing spot is right under it)
    this.prompt.setText(msg);

    surfaceTick(this, time); // src/art_world.js: crawler legs, colonist beacon
    hudTick(this); // src/hud.js
    feelFrame(this, time, dt); // src/feel.js: hit cues, muzzle flash, low-health pulse
  }
}

// ---------- the landing: where the key prompt goes, and a mark on you ----------
// The prompt floats 52 px above you. You land just under the mission panel (top left), so there it covered the panel's last rows and its hint
// (docs/CRITIC.md run 1, finding 3): when the prompt's box would reach into the panel it goes under you instead. The panel's place is what the HUD
// drew last frame (its first zone, src/hud.js hudTick), so an open panel and a slim one are both right.
const SURFACE_PROMPT = { up: -52, down: 58, halfH: 20 };
function surfacePromptSide(s, p, zone) {
  const z = zone || (s._hud && s._hud.zones && s._hud.zones[0]), cam = s.cameras.main; if (!z) return SURFACE_PROMPT.up;
  const px = p.x - cam.scrollX, py = p.y - cam.scrollY + SURFACE_PROMPT.up, half = Math.max(90, (s.prompt && s.prompt.pw || 0) / 2);
  return px - half < z.x1 && py - SURFACE_PROMPT.halfH < z.y1 ? SURFACE_PROMPT.down : SURFACE_PROMPT.up;
}
// YOU and a ring that closes in on the walker for the first seconds after landing: it is small beside the ship, and a first look could not find it (finding 10)
function surfaceYou(s) {
  const p = s.player, ring = s.add.circle(p.x, p.y, 26).setStrokeStyle(2, 0xffffff, 0.9).setDepth(6);
  const tag = s.add.text(p.x + 34, p.y, 'YOU', uiFont(13, '#ffffff')).setOrigin(0, 0.5).setDepth(6).setStroke('#02060d', 4); // beside you: above is the mission panel at the landing spot, below is the key prompt
  const follow = () => { ring.setPosition(p.x, p.y); tag.setPosition(p.x + 34, p.y); };
  s.events.on('update', follow);
  s.tweens.add({ targets: ring, scale: { from: 1.6, to: 0.7 }, alpha: { from: 1, to: 0.2 }, duration: 800, repeat: 4 });
  s.tweens.add({ targets: tag, alpha: 0, delay: 3400, duration: 600, onComplete: () => { s.events.off('update', follow); ring.destroy(); tag.destroy(); } });
  s.events.once('shutdown', () => s.events.off('update', follow));
  s.you = { ring, tag };
}

// ---------- controls panel: on arrival it shows WASD move, mouse aim, click fire, E interact, then fades; C brings it back ----------
function surfaceControls(s) {
  const items = [
    { keys: ['W', 'A', 'S', 'D'], text: 'Move' },
    { mouse: 'aim', text: 'Aim' },
    { mouse: 'fire', text: 'Fire' },
    { keys: ['E'], text: 'Interact' }
  ];
  const parts = [], made = items.map(it => {
    const label = s.add.text(0, 0, it.text, uiFont(16, '#ffffff')).setOrigin(0, 0.5);
    let icon, iw;
    if (it.keys) { // a row of key caps
      icon = it.keys.map(k => keyCap(s, k, AMBER)); iw = icon.reduce((a, c) => a + c.kw, 0) + 4 * (icon.length - 1);
    } else { // a mouse: the whole body to aim, the left button lit to fire
      const g = s.add.graphics(), lit = it.mouse === 'fire';
      g.fillStyle(0x0b2236, 1); g.fillRoundedRect(-10, -15, 20, 30, 9);
      if (lit) { g.fillStyle(AMBER, 1); g.beginPath(); g.moveTo(-10, -6); g.lineTo(-10, -6); g.arc(0, -6, 10, Math.PI, 1.5 * Math.PI); g.lineTo(0, -6); g.closePath(); g.fillPath(); }
      g.lineStyle(2, CYAN, 1); g.strokeRoundedRect(-10, -15, 20, 30, 9); g.lineBetween(-10, -6, 10, -6); g.lineBetween(0, -15, 0, -6);
      if (!lit) { g.lineStyle(2, AMBER, 1); g.lineBetween(-3, 5, 3, 5); g.lineBetween(0, 2, 0, 8); } // a little cross: it follows the mouse
      icon = [g]; iw = 20;
    }
    return { icon, iw, label, w: iw + 9 + label.width };
  });
  const gap = 34, total = made.reduce((a, m) => a + m.w, 0) + gap * (made.length - 1), w = total + 44, h = 54;
  const bg = s.add.graphics();
  bg.fillStyle(0x04101c, 0.92); bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  bg.lineStyle(1, CYAN, 0.8); bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  const box = s.add.container(24 + w / 2, H - 52, [bg]).setScrollFactor(0).setDepth(125); // bottom left, where its "C  show controls" reminder sits: out of the play field (it was in the middle of it: docs/CRITIC.md run 1, finding 8)
  let x = -total / 2;
  made.forEach(m => {
    let cx = x;
    m.icon.forEach(o => { const ow = o.kw || 20; o.setPosition(cx + ow / 2, 0); box.add(o); cx += ow + 4; });
    m.label.setPosition(x + m.iw + 9, 0); box.add(m.label);
    x += m.w + gap;
  });
  const hint = s.add.text(24, H - 44, 'C  show controls', uiFont(14, '#7fa6c2')).setScrollFactor(0).setDepth(100);
  const ctl = s.ctl = { box, hint, timer: null };
  ctl.show = secs => { // fade in, hold, fade out
    s.tweens.killTweensOf(box); if (ctl.timer) ctl.timer.remove(false);
    box.setVisible(true).setAlpha(0); hint.setAlpha(0); // the reminder says "show controls": not while they are showing, and the card sits on its place
    s.tweens.add({ targets: box, alpha: 1, duration: 220 });
    ctl.timer = s.time.delayedCall(secs * 1000, () => s.tweens.add({ targets: box, alpha: 0, duration: 700, onComplete: () => { box.setVisible(false); hint.setAlpha(1); } }));
  };
  s._cKey = s.input.keyboard.addKey('C'); // polled in surfaceAimDraw each frame
  ctl.show(7);
}

// ---------- aim line and cursor: a dashed line from you toward the mouse (as far as a shot flies) and a reticle on the mouse ----------
function surfaceAimInit(s) {
  s.sawMouse = false;
  s.aimG = s.add.graphics().setDepth(6);
  s.reticle = s.add.graphics().setScrollFactor(0).setDepth(130); // screen space, so it sits exactly on the mouse
  const cursor = c => s.input.setDefaultCursor(c);
  s.input.on('pointermove', () => { if (!s.sawMouse) { s.sawMouse = true; cursor('none'); } }); // the reticle is the cursor once the mouse has moved
  const onPause = () => cursor('default'), onResume = () => { if (s.sawMouse) cursor('none'); };
  s.events.on('pause', onPause); s.events.on('resume', onResume); // this scene object is reused on every landing, so take the listeners off again
  s.events.once('shutdown', () => { cursor('default'); s.events.off('pause', onPause); s.events.off('resume', onResume); });
}

function surfaceAimDraw(s, ptr, aim) {
  if (s._cKey && Phaser.Input.Keyboard.JustDown(s._cKey)) s.ctl.show(6); // C: show the controls again
  const g = s.aimG, r = s.reticle; g.clear(); r.clear();
  if (!s.sawMouse || s.leaving) return;
  const p = s.player, d = Math.min(Phaser.Math.Distance.Between(p.x, p.y, s.tmp.x, s.tmp.y), 640); // a shot flies about 650 px
  const cx = Math.cos(aim), cy = Math.sin(aim);
  for (let t = 26; t < d - 14; t += 18) { // dashes that thin out a little with distance
    const a = 0.95 - 0.5 * t / 640;
    g.lineStyle(5, 0x000000, a * 0.4); g.lineBetween(p.x + cx * t, p.y + cy * t, p.x + cx * (t + 10), p.y + cy * (t + 10));
    g.lineStyle(3, 0xfff1a8, a); g.lineBetween(p.x + cx * t, p.y + cy * t, p.x + cx * (t + 10), p.y + cy * (t + 10));
  }
  const fire = ptr.isDown, rad = fire ? 9 : 13, col = fire ? 0xff6b6b : 0xfff1a8; // the ring closes in while you fire
  r.lineStyle(5, 0x000000, 0.45); r.strokeCircle(ptr.x, ptr.y, rad);
  r.lineStyle(2, col, 1); r.strokeCircle(ptr.x, ptr.y, rad);
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => {
    r.lineStyle(4, 0x000000, 0.45); r.lineBetween(ptr.x + ux * (rad + 6), ptr.y + uy * (rad + 6), ptr.x + ux * (rad - 4), ptr.y + uy * (rad - 4));
    r.lineStyle(2, col, 1); r.lineBetween(ptr.x + ux * (rad + 5), ptr.y + uy * (rad + 5), ptr.x + ux * (rad - 3), ptr.y + uy * (rad - 3));
  });
  r.fillStyle(col, 1); r.fillCircle(ptr.x, ptr.y, 2);
}
