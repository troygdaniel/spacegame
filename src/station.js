// ---------- Station: walk around, take the mission, board the ship ----------
class Station extends Phaser.Scene {
  constructor() { super('Station'); }
  init(d) { this.arrive = !!(d && d.arrive); }
  create() {
    this.leaving = false; this.panel = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.tileSprite(0, 0, W, H, 'tile').setOrigin(0);
    this.add.rectangle(1070, 360, 380, 680, 0x0f2438, 0.9);
    this.add.rectangle(1250, 360, 10, 200, AMBER, 0.8);
    label(this, 1180, 40, 'HANGAR', '#ffb454');
    this.shipImg = this.add.image(1090, 360, 'ship').setScale(3);
    label(this, 1090, 420, 'YOUR SHIP', '#9fe9ff');

    this.walls = [];
    const wall = (x, y, w, h) => { const r = rectWall(this, x, y, w, h); this.walls.push(r); return r; };
    wall(0, 0, W, 20); wall(0, H - 20, W, 20); wall(0, 0, 20, H); wall(W - 20, 0, 20, H);
    wall(860, 20, 20, 260); wall(860, 440, 20, 260);
    wall(20, 420, 380, 20); wall(520, 420, 340, 20);
    [[500, 100], [540, 100], [760, 320]].forEach(([x, y]) => {
      const c = this.add.rectangle(x, y, 40, 40, 0x3a2a14).setStrokeStyle(2, AMBER, 0.8);
      this.physics.add.existing(c, true); this.walls.push(c);
    });

    // interactables: [x, y, label, key]
    this.spots = [
      { x: 200, y: 200, text: 'MISSIONS', key: 'missions', color: '#38e1ff' },
      { x: 640, y: 200, text: 'REPAIR BAY', key: 'repair', color: '#6dff9c' },
      { x: 1090, y: 360, text: 'YOUR SHIP', key: 'ship', color: '#ffb454' }
    ];
    [this.spots[0], this.spots[1]].forEach(sp => {
      const r = rectWall(this, sp.x - 50, sp.y - 22, 100, 44, 0x0d2a3f, sp.key === 'repair' ? GREEN : CYAN);
      this.walls.push(r);
      label(this, sp.x, sp.y - 40, sp.text, sp.color);
    });

    // the lower deck is the bar (src/shop.js) and the hangar gets the upgrade shop terminal
    buildBar(this); buildShop(this);

    // ambience: a couple of civilians drift through the bar's open floor
    for (let i = 0; i < 2; i++) {
      const n = this.add.image(Phaser.Math.Between(460, 820), Phaser.Math.Between(570, 680), 'walker').setTint(0x7a8ca0);
      const wander = () => this.tweens.add({
        targets: n, x: Phaser.Math.Between(450, 820), y: Phaser.Math.Between(560, 680),
        duration: Phaser.Math.Between(3500, 7000), onUpdate: () => {}, onComplete: wander
      });
      wander();
    }

    this.player = this.physics.add.sprite(960, 400, 'walker').setCollideWorldBounds(true).setDepth(5);
    this.player.body.setCircle(8, 2, 3);
    this.walls.forEach(w => this.physics.add.collider(this.player, w));
    this.k = this.input.keyboard.addKeys('W,A,S,D,E,ESC,UP,DOWN,LEFT,RIGHT');

    this.hud1 = hudText(this, 24, 22);
    this.hud2 = hudText(this, 24, 46, '#ffd37a');
    this.prompt = this.add.text(W / 2, H - 56, '', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', backgroundColor: '#000000bb', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(100);
    this.add.text(24, H - 44, 'WASD walk   E interact', { fontFamily: 'monospace', fontSize: '14px', color: '#5b7a92' }).setDepth(100);

    this.panelBox = this.add.container(W / 2, H / 2).setDepth(150).setVisible(false);
    this.panelBg = this.add.rectangle(0, 0, 620, 340, 0x07101c, 0.96).setStrokeStyle(2, CYAN, 1);
    this.panelText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#cfefff', align: 'center', lineSpacing: 6
    }).setOrigin(0.5);
    this.panelBox.add([this.panelBg, this.panelText]);

    if (this.arrive && G.mission === 'rescued') {
      G.credits += REWARD; G.mission = 'none';
      toast(this, 'Colonist delivered safely. +' + REWARD + ' cr', '#6dff9c'); sfx('chime');
    } else if (this.arrive) {
      toast(this, 'Docked.', '#9fe9ff');
    }
  }

  openPanel() {
    this.panel = true; this.panelBox.setVisible(true);
    if (G.mission === 'accepted') {
      this.panelText.setText('RESCUE IN PROGRESS\n\nFind the colonist on Kepler-4b and\nbring them back alive.\n\n[Esc] Close');
      this.canAccept = false;
    } else {
      this.panelText.setText(
        'RESCUE CALL  -  KEPLER-4B\n\nA survey pod went down on the surface.\nPirate drones circle the planet and\ncrawlers roam the ground.\nLand, find the colonist, keep them alive,\nwalk them back to your ship, bring them home.\n\nReward: ' + REWARD + ' cr\n\n[E] Accept        [Esc] Close');
      this.canAccept = true;
    }
  }
  closePanel() { this.panel = false; this.panelBox.setVisible(false); }

  update() {
    const JD = Phaser.Input.Keyboard.JustDown, k = this.k;
    this.hud1.setText('CREDITS ' + G.credits + '    HULL ' + Math.round(G.hull) + '/' + G.maxHull);
    this.hud2.setText(missionLine());
    if (shopFrame(this)) return; // upgrade shop panel is open
    if (this.panel) {
      this.player.setVelocity(0, 0);
      if (JD(k.ESC)) this.closePanel();
      if (this.canAccept && JD(k.E)) {
        G.mission = 'accepted'; this.closePanel(); beep(520, 0.15, 'triangle', 0.05, 300);
        toast(this, 'Mission accepted. Board your ship in the hangar.');
      }
      return;
    }
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(210);
    this.player.setVelocity(v.x, v.y);
    if (dx || dy) this.player.rotation = Math.atan2(dy, dx);

    let near = null, nearD = 90;
    this.spots.forEach(sp => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y);
      if (d < nearD) { near = sp; nearD = d; }
    });
    this.prompt.setText(near ? 'E  ' + (near.prompt || { missions: 'Check the mission board', repair: 'Repair hull', ship: 'Board ship and launch' }[near.key]) : '');
    if (near && JD(k.E) && !spotInteract(this, near)) {
      if (near.key === 'missions') this.openPanel();
      else if (near.key === 'repair') {
        const cost = Math.ceil((G.maxHull - G.hull) * 2);
        if (G.hull >= G.maxHull) toast(this, 'Hull is already perfect.', '#9fe9ff');
        else if (G.credits < cost) toast(this, 'Repair costs ' + cost + ' cr. You have ' + G.credits + '.', '#ff4d6d');
        else { G.credits -= cost; G.hull = G.maxHull; beep(400, 0.2, 'triangle', 0.05, 300); toast(this, 'Hull repaired (-' + cost + ' cr).', '#6dff9c'); }
      } else if (near.key === 'ship') { sfx('thrusters'); go(this, 'Space', { from: 'station' }); }
    }
  }
}
