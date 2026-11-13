// ---------- Station: walk around, take the mission, board the ship ----------
class Station extends Phaser.Scene {
  constructor() { super('Station'); }
  init(d) { this.arrive = !!(d && d.arrive); }
  create() {
    this.leaving = false; this.panel = false;
    shipRefresh(this); // src/ships.js: the hangar ship shows the upgrade tiers you own
    this.cameras.main.fadeIn(300, 0, 0, 0);
    interiorTextures(this); // src/interior.js: the floor, walls, props, lights and people are drawn there
    this.shipImg = this.add.image(1090, 360, 'ship').setScale(3);
    label(this, 1090, 432, 'YOUR SHIP', '#9fe9ff');

    this.walls = [];
    const wall = (x, y, w, h) => { const r = rectWall(this, x, y, w, h); this.walls.push(r); return r; };
    wall(0, 0, W, IN_NORTH); wall(0, H - IN_SOUTH, W, IN_SOUTH); wall(0, 0, 20, H); wall(W - 20, 0, 20, H); // the top and bottom walls are thicker: interior.js draws them face-on
    wall(860, IN_NORTH, 20, 280 - IN_NORTH); wall(860, 440, 20, 260 - (IN_SOUTH - 20));
    wall(20, 420, 380, 20); wall(520, 420, 340, 20);
    [[500, 100], [540, 100], [760, 320]].forEach(([x, y]) => {
      const c = this.add.rectangle(x, y, 40, 40, 0x3a2a14).setStrokeStyle(2, AMBER, 0.8);
      this.physics.add.existing(c, true); this.walls.push(c);
    });

    // interactables: [x, y, label, key]
    this.spots = [
      { x: 200, y: 200, text: 'MISSIONS', key: 'missions', color: '#38e1ff', dy: 74 },
      { x: 640, y: 200, text: 'REPAIR BAY', key: 'repair', color: '#6dff9c', dy: 74 },
      { x: 1090, y: 360, text: 'YOUR SHIP', key: 'ship', color: '#ffb454', dy: 76 }
    ];
    [this.spots[0], this.spots[1]].forEach(sp => {
      const r = rectWall(this, sp.x - 50, sp.y - 22, 100, 44, 0x0d2a3f, sp.key === 'repair' ? GREEN : CYAN);
      this.walls.push(r);
      label(this, sp.x, sp.y + 16, sp.text, sp.color, 11); // the nameplate on the front of the desk
    });

    // the lower deck is the bar (src/shop.js) and the hangar gets the upgrade shop terminal
    buildBar(this); buildShop(this);

    interiorBuild(this); // lights, signs, hologram desks, patrons and wanderers (src/interior.js)

    this.player = this.physics.add.sprite(960, 400, 'in-pilot0').setCollideWorldBounds(true).setDepth(5);
    this.player.body.setCircle(9, 7, 7);
    this.walls.forEach(w => this.physics.add.collider(this.player, w));
    this.k = this.input.keyboard.addKeys('W,A,S,D,E,ESC,UP,DOWN,LEFT,RIGHT');

    this.prompt = floatPrompt(this, this.player); // key cap above whatever you can use (src/ui.js)
    this.add.text(24, H - IN_SOUTH - 28, 'WASD walk   E interact', { fontFamily: 'monospace', fontSize: '14px', color: '#5b7a92' }).setDepth(100);

    this.ui = panel(this, { w: 900, h: 480, title: 'MISSION BOARD  -  HALCYON STATION', dim: true }); // src/ui.js
    this.panelBox = this.ui.box.setVisible(false); this.boardObjs = [];

    if (this.arrive && G.mission === 'rescued') {
      G.credits += REWARD; G.mission = 'none'; G.stats.missions++;
      toast(this, 'Colonist delivered safely. +' + REWARD + ' cr', '#6dff9c'); sfx('chime');
    } else if (this.arrive) {
      toast(this, 'Docked.', '#9fe9ff');
    }
    if (this.arrive) sellOre(this); // asteroids.js: ore in the hold is sold on docking
    if (this.arrive) bountyDock(this); // enemies.js: what this flight's pirate kills paid
    if (this.arrive) feelArrive(this); // feel.js: a short settle-in zoom after docking
  }

  // The mission board: offer cards you pick between, then E accepts. Offers come from MISSIONS in src/missions.js.
  // 1-3 or the arrow keys choose a call, E accepts it, X drops the one under way, Esc closes.
  openPanel() {
    this.panel = true; this.panelBox.setVisible(true); this.canAccept = false; this.prompt.setText('');
    const busy = () => G.mission === 'accepted' || G.mission === 'rescued';
    const RISK = { rescue: ['MEDIUM', 2, '#ffb454'], escort: ['HIGH', 3, '#ff4d6d'], patrol: ['MEDIUM', 2, '#ffb454'], bounty: ['EXTREME', 3, '#ff2a4a'] };
    const OFFERS = missionsOffered(); // the bounty call appears once a patrol has been finished (missions.js)
    const GAP = Math.min(288, Math.floor(1120 / OFFERS.length)), CW = Math.min(270, GAP - 14);
    const clear = () => { this.boardObjs.forEach(o => o.destroy()); this.boardObjs = []; };
    const add = o => { this.panelBox.add(o); this.boardObjs.push(o); return o; };
    const txt = (x, y, str, size, color, o = {}) => add(this.add.text(x, y, str, uiFont(size, color, o.style)).setOrigin(o.ox === undefined ? 0 : o.ox, o.oy === undefined ? 0.5 : o.oy));
    const risk = m => RISK[m.id] || ['UNKNOWN', 1, '#9fe9ff'];
    let sel = 0;

    const card = (m, i, cx, cy, w, h, selected) => {
      const g = add(this.add.graphics());
      g.fillStyle(selected ? 0x10283d : 0x0a1b2c, 1); g.fillRect(cx - w / 2, cy - h / 2, w, h);
      g.lineStyle(selected ? 3 : 1, selected ? AMBER : CYAN, selected ? 1 : 0.5); g.strokeRect(cx - w / 2, cy - h / 2, w, h);
      if (selected) { g.fillStyle(AMBER, 1); g.fillRect(cx - w / 2, cy - h / 2, w, 4); }
      const L = cx - w / 2 + 16, cap = keyCap(this, m.key, selected ? AMBER : CYAN); cap.setPosition(L + cap.kw / 2, cy - h / 2 + 30); add(cap);
      txt(L + cap.kw + 10, cy - h / 2 + 30, m.title.toUpperCase(), 17, selected ? '#ffd37a' : '#9fe9ff', { style: { fontStyle: 'bold' } });
      txt(L, cy - h / 2 + 58, m.where, 13, '#8fb4c9');
      txt(L, cy - h / 2 + 90, 'REWARD', 11, '#5b7a92'); txt(L, cy - h / 2 + 112, m.reward + ' cr', 28, '#ffb454', { style: { fontStyle: 'bold' } });
      const r = risk(m);
      txt(L, cy - h / 2 + 144, 'RISK', 11, '#5b7a92');
      const pg = add(pips(this, L, cy - h / 2 + 157, r[1], 3, Phaser.Display.Color.HexStringToColor(r[2]).color));
      txt(L + 58, cy - h / 2 + 161, r[0], 13, r[2], { style: { fontStyle: 'bold' } });
      txt(L, cy - h / 2 + 178, m.offer.split('\n')[0], 13, '#cfefff', { oy: 0, style: { wordWrap: { width: w - 32 }, lineSpacing: 2 } });
      return add(this.add.rectangle(cx, cy, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
    };

    const render = () => {
      clear(); this.ui.tagText.setText('CREDITS ' + G.credits);
      if (busy()) {
        const m = missionDef(), r = risk(m), cy = -70;
        this.ui.titleText.setText('MISSION BOARD  -  UNDER WAY');
        const g = add(this.add.graphics());
        g.fillStyle(0x10283d, 1); g.fillRect(-300, cy - 110, 600, 220); g.lineStyle(3, AMBER, 1); g.strokeRect(-300, cy - 110, 600, 220);
        g.fillStyle(AMBER, 1); g.fillRect(-300, cy - 110, 600, 4);
        txt(-276, cy - 78, m.title.toUpperCase(), 22, '#ffd37a', { style: { fontStyle: 'bold' } });
        txt(276, cy - 78, 'IN PROGRESS', 15, '#6dff9c', { ox: 1 });
        txt(-276, cy - 44, m.where, 14, '#8fb4c9');
        txt(-276, cy - 8, m.progress(), 17, '#e8f6ff', { oy: 0, style: { lineSpacing: 6 } });
        txt(-276, cy + 84, 'PAYS ' + m.reward + ' cr', 16, '#ffb454', { style: { fontStyle: 'bold' } });
        this.ui.setHints([['X', 'Drop the mission'], ['Esc', 'Close']]); return;
      }
      this.ui.titleText.setText('MISSION BOARD  -  HALCYON STATION');
      OFFERS.forEach((m, i) => {
        const z = card(m, i, (i - (OFFERS.length - 1) / 2) * GAP, -75, CW, 220, i === sel);
        z.on('pointerdown', () => { if (sel === i) acceptSel(); else choose(i); });
      });
      txt(-420, 52, 'BRIEFING', 11, '#5b7a92');
      txt(-420, 66, OFFERS[sel].offer, 14, '#cfefff', { oy: 0, style: { lineSpacing: 4 } });
      this.ui.setHints([['E', 'Accept'], ['1-' + OFFERS.length, 'Choose'], ['Esc', 'Close']]);
    };
    const choose = (i, quiet) => {
      sel = Phaser.Math.Wrap(i, 0, OFFERS.length); pickMission(OFFERS[sel].id); this.canAccept = true;
      if (!quiet) beep(600, 0.05, 'square', 0.02);
      render();
    };
    const acceptSel = () => { // same as pressing E in update()
      if (!this.canAccept) return;
      G.mission = 'accepted'; this.closePanel(); beep(520, 0.15, 'triangle', 0.05, 300);
      toast(this, 'Mission accepted. Board your ship in the hangar.');
    };

    const kb = this.input.keyboard;
    if (this.boardKeys) kb.off('keydown', this.boardKeys);
    this.boardKeys = e => {
      if (!this.panel) { kb.off('keydown', this.boardKeys); this.boardKeys = null; return; }
      const key = e.key.toLowerCase();
      if (busy()) {
        if (key === 'x') {
          abandonMission(); this.closePanel(); beep(200, 0.2, 'sawtooth', 0.04, -100);
          toast(this, 'Mission dropped. The board has other calls.', '#ffd37a');
        }
        return;
      }
      const i = OFFERS.findIndex(x => x.key === key);
      if (i >= 0) choose(i);
      else if (key === 'arrowright') choose(sel + 1);
      else if (key === 'arrowleft') choose(sel - 1);
    };
    kb.on('keydown', this.boardKeys);
    if (busy()) render(); else choose(Math.max(0, OFFERS.findIndex(m => m.id === G.missionId)), true);
  }
  closePanel() { this.panel = false; this.panelBox.setVisible(false); this.boardObjs.forEach(o => o.destroy()); this.boardObjs = []; }

  update() {
    guideTick(this); interiorTick(this, this.time.now);
    const JD = Phaser.Input.Keyboard.JustDown, k = this.k;
    hudTick(this); // src/hud.js
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
    if (near) this.prompt.at(near.x, near.y - (near.dy || 56));
    this.prompt.setText(near && !this.talk ? 'E  ' + (near.prompt || { missions: 'Check the mission board', repair: 'Repair hull', ship: 'Board ship and launch' }[near.key]) : '');
    if (near && JD(k.E) && !spotInteract(this, near)) {
      if (near.key === 'missions') this.openPanel();
      else if (near.key === 'repair') {
        // half a credit a point; too poor for a full repair and it mends as much as you can pay for
        const missing = G.maxHull - G.hull, cost = Math.ceil(missing * 0.5);
        if (missing <= 0) toast(this, 'Hull is already perfect.', '#9fe9ff');
        else if (G.credits <= 0) toast(this, 'Repair costs ' + cost + ' cr. You have 0.', '#ff4d6d');
        else {
          const pay = Math.min(cost, G.credits);
          G.credits -= pay; G.hull = pay < cost ? Math.min(G.maxHull, G.hull + pay * 2) : G.maxHull;
          beep(400, 0.2, 'triangle', 0.05, 300); toast(this, (pay < cost ? 'Partly repaired' : 'Hull repaired') + ' (-' + pay + ' cr).', '#6dff9c'); }
      } else if (near.key === 'ship') { sfx('thrusters'); interiorLaunch(this); feelLaunch(this, () => go(this, 'Space', { from: 'station' })); }
    }
  }
}
