// ---------- Ship mode: the prep-for-launch screen ----------
// Station (E at YOUR SHIP) -> Ship (look the ship over, read the mission, learn the controls) -> Space.
// Enter, Space or a click on LAUNCH starts the flight; Esc goes back to the station. Tab (map), H (help) and M (mute) work here too.
// Everything is drawn with shapes, in the v2 HUD look (hudPanel, hudBar, hudGlowPath in src/hud.js) and the window style of src/ui.js.
//
// This scene is also the hangar terminal of docs/UNIVERSE.md (sections 6.3 and 9, card u-d4). src/hangar.js adds the panel at the bottom
// left with three tabs (FLEET: your ships, board, move, sell, rename; YARD: the ships this station sells; CONTROLS) and decides what the
// stage and the status panel show: the ship you have selected, one of yours or one in the yard (this.view). The big amber button does
// what Enter does for it: LAUNCH, BOARD, MOVE HERE or BUY. Three things keep this file small:
//   bayShipInfo(rec)  the only place that reads a ship of the fleet (hull, hold, fuel, parts); bayYardInfo(model) is the same for a ship for sale
//   BAY_SLOTS         one row per part slot: where its label sits on the ship and what each tier is called
//   fuel row          shows by itself as soon as bayShipInfo() returns a fuel figure (card u-b1)

const BAY = { shipX: 410, shipY: 272, scale: 5, padY: 458, sill: 400, grace: 350 }; // grace: ms of ignored input after arriving, so the E that boarded cannot launch
const BAY_CONTROLS = controlsBay(); // [[keys], what] for the twelve rows the table marks bay (src/data_controls.js), column by column, four rows each
// part slots as callouts on the ship. anchor names the spot on the ship in SHIP_LOOK[model].anchors (src/shipmodels.js: the art calls the shields
// spot 'armor', the engine 'booster' and the guns 'rapid'); lx, ly: the label; stock: what it says with nothing fitted. The tier names are PARTS[key].tiers.
// Tank and cargo have no spot on the hull: they are rows of the status panel.
const BAY_SLOTS = [
  { key: 'shields', anchor: 'armor', title: 'SHIELDS', stock: 'NO SHIELD', lx: 56, ly: 128, side: 'L' },
  { key: 'engine', anchor: 'booster', title: 'ENGINE', stock: 'STOCK DRIVE', lx: 56, ly: 300, side: 'L' },
  { key: 'weapons', anchor: 'rapid', title: 'WEAPONS', stock: 'STOCK GUNS', lx: 640, ly: 118, side: 'R' }
];

const bayModel = id => (SHIP_LOOK[id] ? id : 'wren'); // an id the art does not know is drawn as the Wren, as the fleet flies it
const bayWhere = id => String(fleetStationName(id)).replace(/ station$/i, '').toUpperCase(); // 'Halcyon Station' -> 'HALCYON'

// what the bay shows about one ship of the fleet (the one you fly unless you pass another record)
function bayShipInfo(rec) {
  rec = rec || activeShip();
  const L = shipLook(bayModel(rec.model));
  return {
    uid: rec.uid, model: bayModel(rec.model), name: rec.name, kind: L.name, role: L.role, at: rec === activeShip() ? G.lastDock : rec.at,
    hull: rec.hull, maxHull: rec.maxHull,
    ore: Math.min(rec.ore | 0, holdCap(rec)), oreCap: holdCap(rec),
    fuel: null, fuelMax: null, // src/fuel.js (card u-b1) fills these in
    parts: PART_ORDER.map(k => ({ key: k, name: PARTS[k].name, tier: partTier(k, rec), max: shipMaxTier(rec.model, k), descs: PARTS[k].brief, tiers: PARTS[k].tiers }))
  };
}
// a ship for sale: the model's own numbers, bare of parts
function bayYardInfo(model) {
  const m = SHIP_MODELS[model], L = shipLook(bayModel(model));
  return { model, name: m.name, kind: L.name, role: L.role, price: m.price, m, maxTier: PART_ORDER.map(k => ({ key: k, tier: shipMaxTier(model, k) })) };
}

class ShipBay extends Phaser.Scene {
  constructor() { super('Ship'); }

  create() {
    this.leaving = false; this.ignoreUntil = performance.now() + BAY.grace;
    shipRefresh(this); // src/ships.js: the ship shows the upgrade tiers you own
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.fadeSet = []; // everything that fades away when you launch
    this.callLayer = this.statusBox = this.hintRow = null; // a restarted scene keeps its old fields: they point at objects that are gone
    this.view = this.hangarFirst(); // src/hangar.js: what the stage shows, { kind: 'fleet', rec } or { kind: 'yard', model }
    this.bayBackdrop(); this.bayShip(); this.bayCallouts(); this.bayTitle();
    const bottom = this.bayStatusView(24);              // each panel returns where it ends, the next one starts 16 px below
    const bottom2 = this.bayMission(bottom + 16);
    this.bayLaunch(bottom2 + 16);
    this.hangarBuild();                                 // the panel at the bottom left: fleet, yard, controls
    this.bayKeys();
    this.hangarApply();
    this.fadeSet.forEach((o, i) => { // the panels slide in one after another
      const y = o.y; o.setAlpha(0).setY(y + 18);
      this.tweens.add({ targets: o, alpha: 1, y, duration: 380, delay: 120 + i * 70, ease: 'Cubic.easeOut' });
    });
  }

  // forget a thing that was in the fade set (a panel that is about to be rebuilt)
  fadeDrop(o) { const i = this.fadeSet.indexOf(o); if (i >= 0) this.fadeSet.splice(i, 1); }
  // what the stage draws for a view: the model, the tiers fitted, the texture and the art row. The ship you fly is the 'ship' texture
  // (shipRefresh keeps it); another ship gets a texture of its own (shipPreviewTexture, src/shipmodels.js).
  bayArt(v) {
    const rec = v.kind === 'fleet' ? v.rec : null, model = bayModel(rec ? rec.model : v.model);
    const tiers = rec ? { plating: rec.parts.shields | 0, guns: rec.parts.weapons | 0, engine: rec.parts.engine | 0 } : { plating: 0, guns: 0, engine: 0 };
    return { model, tiers, look: SHIP_LOOK[model], key: rec && rec === activeShip() ? 'ship' : shipPreviewTexture(this, model, tiers) };
  }

  // ---- the hangar: the open bay door with stars, the planet and the station, a lit floor with a launch pad ----
  bayBackdrop() {
    const g = this.add.graphics().setDepth(0);
    const S = BAY.sill;
    g.fillGradientStyle(0x02050c, 0x02050c, 0x0b1a2c, 0x0b1a2c, 1); g.fillRect(0, 0, W, S);
    this.s1 = this.add.tileSprite(0, 0, W, S, 'stars1').setOrigin(0).setAlpha(0.9).setDepth(1);
    this.s2 = this.add.tileSprite(0, 0, W, S, 'stars2').setOrigin(0).setAlpha(0.9).setDepth(1);
    this.add.image(130, 520, 'planet').setScale(0.66).setDepth(1.5);
    const st = this.add.image(560, 96, 'station').setScale(0.18).setDepth(1.5).setAlpha(0.95);
    this.tweens.add({ targets: st, angle: 360, duration: 200000, repeat: -1 });

    // the frame of the bay door: a top beam, side pillars, three mullions
    const f = this.add.graphics().setDepth(2);
    f.fillStyle(0x060d18, 1); f.fillRect(0, 0, W, 30); f.fillRect(0, 0, 54, S + 10); f.fillRect(W - 54, 0, 54, S + 10);
    [330, 640, 950].forEach(x => { f.fillStyle(0x08111e, 1); f.fillRect(x - 7, 30, 14, S - 30); f.fillStyle(CYAN, 0.18); f.fillRect(x - 7, 30, 1, S - 30); f.fillRect(x + 6, 30, 1, S - 30); });
    f.fillStyle(CYAN, 0.55); f.fillRect(54, 28, W - 108, 2);
    for (let i = 0; i < 9; i++) { f.fillStyle(i % 3 === 1 ? AMBER : CYAN, 0.9); f.fillRect(80 + i * 140, 12, 46, 3); }
    hudGlowPath(f, [[54, 30], [54, S]], CYAN, 0.5, false, 1); hudGlowPath(f, [[W - 54, 30], [W - 54, S]], CYAN, 0.5, false, 1);

    // the floor: a gradient, a perspective grid, a hazard stripe along the door sill
    const fl = this.add.graphics().setDepth(3);
    fl.fillGradientStyle(0x10233a, 0x10233a, 0x03070e, 0x03070e, 1); fl.fillRect(0, S, W, H - S);
    fl.lineStyle(1, CYAN, 0.1);
    for (let i = 0; i <= 14; i++) fl.lineBetween(640 + (i - 7) * 70, S, 640 + (i - 7) * 260, H);
    for (let k = 1; k <= 7; k++) { const y = S + Math.pow(k / 7, 1.7) * (H - S); fl.lineStyle(1, CYAN, 0.04 + 0.08 * k / 7); fl.lineBetween(0, y, W, y); }
    for (let x = -40; x < W; x += 56) { fl.fillStyle(AMBER, 0.85); fl.fillPoints([{ x, y: S + 2 }, { x: x + 28, y: S + 2 }, { x: x + 20, y: S + 12 }, { x: x - 8, y: S + 12 }], true); }
    fl.fillStyle(0x02050c, 0.9); fl.fillRect(0, S - 2, W, 4);

    // the launch pad: dark plate, rings, ticks
    const px = BAY.shipX, py = BAY.padY, ring = (rx, ry, a, w) => hudGlowPath(fl, this.bayEllipse(px, py, rx, ry, 56), CYAN, a, true, w);
    fl.fillStyle(0x07121f, 0.95); fl.fillPoints(this.bayEllipse(px, py, 290, 58, 56).map(p => ({ x: p[0], y: p[1] })), true);
    ring(290, 58, 0.55, 1.2); ring(236, 46, 0.3, 1); ring(150, 29, 0.35, 1);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, c = Math.cos(a), s = Math.sin(a); fl.lineStyle(1, i % 6 === 0 ? AMBER : CYAN, i % 6 === 0 ? 0.9 : 0.35); fl.lineBetween(px + c * 290, py + s * 58, px + c * 270, py + s * 52.5); }

    // two shafts of light from the ceiling lamps onto the pad
    const sh = this.add.graphics().setDepth(2.5).setBlendMode(Phaser.BlendModes.ADD);
    [[px - 150, -1], [px + 150, 1]].forEach(([lx, side]) => {
      for (let i = 0; i < 4; i++) {
        const spread = 20 + i * 14;
        sh.fillStyle(0x9fe9ff, 0.035);
        sh.fillPoints([{ x: lx - 12, y: 30 }, { x: lx + 12, y: 30 }, { x: px + side * 40 + spread * 2.4, y: py }, { x: px + side * 40 - spread * 2.4, y: py }], true);
      }
      sh.fillStyle(0xffffff, 0.6); sh.fillRect(lx - 14, 28, 28, 3);
    });
    this.dyn = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD); // pad ripples, scan line, nozzle glow: redrawn every frame
  }

  bayEllipse(cx, cy, rx, ry, n) { const p = []; for (let i = 0; i < n; i++) p.push([cx + Math.cos(i / n * TAU) * rx, cy + Math.sin(i / n * TAU) * ry]); return p; }

  // ---- the ship: hovering over the pad, nozzle flames, a shadow that breathes with it ----
  bayShip() {
    const { shipX: x, shipY: y } = BAY, A = this.bayArt(this.view), L = A.look, K = shipFitScale(BAY.scale, A.model); // the ship is always as wide as the Wren at 5x
    this.shadow = this.add.ellipse(x, BAY.padY + 6, 300, 38, 0x000000, 0.5).setDepth(5);
    this.glow = this.add.image(x, y, 'glow-c').setScale(4.2 * L.w / 56).setAlpha(0.42).setBlendMode(Phaser.BlendModes.ADD).setDepth(9); // a soft halo behind the hull
    this.tweens.add({ targets: this.glow, alpha: 0.28, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.shipImg = this.add.image(x, y, A.key).setScale(K).setDepth(10);
    this.bob = this.tweens.add({
      targets: this.shipImg, y: y - 7, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => { const k = (y - this.shipImg.y) / 7; this.shadow.setScale(1 - k * 0.07, 1 - k * 0.07).setAlpha(0.5 - k * 0.1); this.shipImg.setRotation(k * 0.012 - 0.006); }
    });
    this.K = K; this.flames = []; this.bayFlames(A);
    this.stageTag = this.add.text(x, BAY.sill - 14, '', uiFont(12, '#ffb454', { fontStyle: 'bold', letterSpacing: 3 })).setOrigin(0.5).setDepth(12).setPadding(10, 4, 10, 4).setBackgroundColor('#07101ccc');
    this.fadeSet.push(this.stageTag);
  }
  // the nozzle flames follow the ship image; a ship of another model has other nozzles
  bayFlames(A) {
    this.flames.forEach(e => e.destroy());
    const K = this.K; this.nozzles = A.look.nozzles(A.tiers);
    this.flames = this.nozzles.map(([nx, ny, ns]) => this.add.particles(0, 0, 'spark', {
      lifespan: 440, speed: { min: 60, max: 150 }, angle: { min: 172, max: 188 }, scale: { start: 2.4 * ns, end: 0 },
      alpha: { start: 0.85, end: 0 }, tint: [CYAN, 0xcfefff], blendMode: 'ADD', frequency: 24
    }).setDepth(9).startFollow(this.shipImg, nx * K, ny * K));
  }
  // the stage changed to another view: the picture, its size, its halo and its flames
  bayStage() {
    const A = this.bayArt(this.view), K = shipFitScale(BAY.scale, A.model);
    this.K = K; this.shipImg.setTexture(A.key).setScale(K);
    this.glow.setScale(4.2 * A.look.w / 56);
    this.bayFlames(A);
  }

  // ---- labels on the ship: what you have fitted, with a line to the part. Drawn again whenever the view changes ----
  bayCallouts() {
    if (this.callLayer) { this.fadeDrop(this.callLayer); this.callLayer.destroy(); }
    const A = this.bayArt(this.view), SX = BAY.shipX, SY = BAY.shipY, K = shipFitScale(BAY.scale, A.model), L = A.look, at = (px, py) => [SX + (px - L.w / 2) * K, SY + (py - L.h / 2) * K];
    const layer = this.callLayer = this.add.container(0, 0).setDepth(12); this.fadeSet.push(layer);
    const g = this.add.graphics(); layer.add(g);
    const list = [];
    if (this.view.kind === 'yard') { // a ship for sale: what the hull can fit, not what is fitted
      const y = bayYardInfo(this.view.model), tier = k => y.maxTier.find(q => q.key === k).tier, guns = y.m.guns;
      BAY_SLOTS.forEach(sl => {
        const t = tier(sl.key), n = sl.key === 'weapons' ? guns + (guns === 1 ? ' GUN' : ' GUNS') : 'TIER ' + t;
        list.push({ title: sl.title, value: sl.key === 'weapons' ? n : 'UP TO ' + n, n: t, of: 3, desc: 'fits up to tier ' + t, pt: at(...L.anchors[sl.anchor]), lx: sl.lx, ly: sl.ly, side: sl.side });
      });
      list.push({ title: 'HULL', value: y.m.hull + ' PTS', n: -1, desc: y.role.toLowerCase(), pt: at(...L.anchors.hull), lx: 640, ly: 300, side: 'R', color: GREEN });
    } else {
      const info = bayShipInfo(this.view.rec), frac = info.hull / info.maxHull, hc = frac > 0.6 ? GREEN : frac > 0.3 ? AMBER : RED;
      BAY_SLOTS.forEach(sl => {
        const p = info.parts.find(q => q.key === sl.key); if (!p) return;
        list.push({ title: sl.title, value: p.tier ? p.tiers[p.tier - 1] : sl.stock, n: p.tier, of: p.max,
          desc: p.tier ? p.descs[p.tier - 1] : 'none fitted', pt: at(...L.anchors[sl.anchor]), lx: sl.lx, ly: sl.ly, side: sl.side });
      });
      list.push({ title: 'HULL', value: Math.round(frac * 100) + '%', n: -1, desc: Math.round(info.hull) + ' of ' + Math.round(info.maxHull) + ' points', pt: at(...L.anchors.hull), lx: 640, ly: 300, side: 'R', color: hc });
    }
    list.forEach(c => {
      const col = c.color || (c.n > 0 ? GREEN : CYAN), css = hudCss(col), uy = c.ly + 60, [ax, ay] = c.pt;
      const far = c.side === 'L' ? [c.lx + 190, uy] : [c.lx, uy];
      hudGlowPath(g, [[c.lx, uy], [c.lx + 190, uy]], col, 0.7, false, 1);
      hudGlowPath(g, [far, [(far[0] + ax) / 2, uy - (uy - ay) * 0.15], [ax, ay]], col, 0.75, false, 1);
      g.fillStyle(col, 0.18); hudDisc(g, ax, ay, 9); g.fillStyle(col, 1); hudDisc(g, ax, ay, 3.5);
      const mk = (x, y, str, size, color, style) => layer.add(this.add.text(x, y, str, uiFont(size, color, style)).setOrigin(0, 0.5));
      mk(c.lx, c.ly, c.title, 11, '#5b7a92', { letterSpacing: 2 });
      mk(c.lx, c.ly + 22, c.value, 16, css, { fontStyle: 'bold' });
      mk(c.lx, c.ly + 44, c.desc, 12, '#8fb4c9');
      if (c.n >= 0) layer.add(pips(this, c.lx + 149, c.ly + 17, c.n, c.of, GREEN));
    });
  }

  // ---- panels. text() puts a label inside a panel's box; (x, y) are measured from the panel's centre ----
  text(box, x, y, str, size, color, o = {}) {
    const t = this.add.text(x, y, str, uiFont(size, color, o.style)).setOrigin(o.ox === undefined ? 0 : o.ox, o.oy === undefined ? 0.5 : o.oy);
    if (o.glow) { // a glowing number: padding gives the glow room, the origin allows for it
      const p = 8, ox = o.ox === undefined ? 0 : o.ox; t.setPadding(p).setShadow(0, 0, color, o.glow, false, true);
      t.setOrigin((p + ox * (t.width - 2 * p)) / t.width, 0.5);
    }
    box.add(t); return t;
  }

  bayTitle() {
    const mono = (size, color) => ({ fontFamily: 'monospace', fontSize: size + 'px', color });
    const a = this.add.text(22, 56, 'SHIP BAY', Object.assign(mono(38, '#38e1ff'), { letterSpacing: 6 })).setOrigin(0, 0.5).setPadding(20, 14, 20, 14).setShadow(0, 0, '#38e1ff', 16, false, true).setDepth(20);
    this.sub = this.add.text(46, 90, '', mono(13, '#ffb454')).setOrigin(0, 0.5).setDepth(20).setPadding(0, 4, 0, 4);
    this.baySubtitle();
    this.fadeSet.push(a, this.sub);
  }
  // the line under the title, and the tag on the stage, for the ship in view
  baySubtitle() {
    const v = this.view, here = bayWhere(G.lastDock) + ' HANGAR';
    if (v.kind === 'yard') {
      const y = bayYardInfo(v.model);
      this.sub.setText(y.name.toUpperCase() + '  -  ' + y.role + '  -  FOR SALE, ' + hudFmt(y.price) + ' CR');
      this.stageTag.setText('FOR SALE').setVisible(true);
      return;
    }
    const rec = v.rec, info = bayShipInfo(rec), mine = rec === activeShip(), away = !mine && rec.at !== G.lastDock;
    this.sub.setText(info.name.toUpperCase() + '  -  ' + info.role + '  -  ' + (away ? 'PARKED AT ' + bayWhere(rec.at) : here));
    this.stageTag.setText(mine ? '' : away ? 'PARKED AT ' + bayWhere(rec.at) : 'PARKED HERE, NOT FLYING').setVisible(!mine);
  }

  // The status panel is drawn again whenever the view changes; it keeps its place and its height (the fuel row is the same for every ship), so
  // the mission panel and the button below it never move. Top y in, bottom y out.
  bayStatusView(top) {
    const first = !this.statusBox;
    if (!first) { this.fadeDrop(this.statusBox); this.statusBox.destroy(); }
    const bottom = this.view.kind === 'yard' ? this.bayYardStats(top) : this.bayStatus(top);
    if (!first) this.statusBox.setAlpha(0), this.tweens.add({ targets: this.statusBox, alpha: 1, duration: 160 });
    return bottom;
  }
  statusHeight() { const hasFuel = bayShipInfo().fuelMax != null; return 40 + 16 + 46 + 46 + (hasFuel ? 46 : 0) + 14 + 22 + PART_ORDER.length * 29 + 14; }

  bayStatus(top) {
    const info = bayShipInfo(this.view.rec), L = -190, R = 190, w = 420, hasFuel = bayShipInfo().fuelMax != null, h = this.statusHeight();
    const mine = this.view.rec === activeShip();
    const ui = panel(this, { x: 1045, y: top + h / 2, w, h, title: mine ? 'SHIP STATUS' : 'PARKED SHIP', depth: 20, foot: false }), box = ui.box;
    ui.crLast = this.crPrev; this.crPrev = undefined; // a purchase, a sale or a move that just happened: the coin tag pops and shows +N or -N
    crTag(this, ui, G.credits, ui.crLast !== undefined); // src/ui.js: the gold coin and N CR in the title band, as on every other window
    const g = this.add.graphics(); box.add(g);
    const frac = Phaser.Math.Clamp(info.hull / info.maxHull, 0, 1), hc = frac > 0.6 ? GREEN : frac > 0.3 ? AMBER : RED;
    let y = -h / 2 + 40 + 22; // label row; the bar is 14 below
    const label = (str, color = '#5b7a92') => this.text(box, L, y, str, 11, color, { style: { letterSpacing: 2 } });
    const value = (str, color) => this.text(box, R, y, str, 14, color, { ox: 1, style: { fontStyle: 'bold' } });
    label('HULL INTEGRITY'); value(Math.round(info.hull) + ' / ' + Math.round(info.maxHull) + (frac > 0.3 ? '' : '   REPAIR'), hudCss(hc));
    hudBar(g, L, y + 12, 380, 14, frac, hc, 24); y += 46;
    label('CARGO HOLD'); value(info.ore ? info.ore + ' / ' + info.oreCap + ' ore' : 'empty', info.ore ? '#ffd37a' : '#6b8296');
    hudBar(g, L, y + 12, 380, 10, info.ore / info.oreCap, AMBER, info.oreCap); y += 46;
    if (hasFuel) {
      const ff = Phaser.Math.Clamp(info.fuel / info.fuelMax, 0, 1), fc = ff > 0.25 ? CYAN : ff > 0.1 ? AMBER : RED;
      label('FUEL'); value(Math.round(info.fuel) + ' / ' + Math.round(info.fuelMax), hudCss(fc)); hudBar(g, L, y + 12, 380, 10, ff, fc, 20); y += 46;
    }
    g.lineStyle(1, CYAN, 0.35); g.lineBetween(-w / 2 + 14, y - 8, w / 2 - 14, y - 8); y += 6;
    label('UPGRADES'); y += 28;
    info.parts.forEach(p => {
      const on = p.tier > 0;
      this.text(box, L, y, p.name, 13, on ? '#cfefff' : '#6b8296');
      box.add(pips(this, -58, y - 4, p.tier, p.max, GREEN));
      this.text(box, R, y, on ? p.descs[p.tier - 1] : 'not fitted', 12, on ? '#9fe9ff' : '#4d6579', { ox: 1 });
      y += 29;
    });
    this.fadeSet.push(box); this.statusBox = box; this.statusUI = ui;
    return top + h;
  }

  // a ship for sale: bars of what the hull gives against the best of the six, and a tick where the ship you fly stands
  bayYardStats(top) {
    const y0 = bayYardInfo(this.view.model), m = y0.m, mine = SHIP_MODELS[bayModel(activeShip().model)], L = -190, R = 190, w = 420, h = this.statusHeight();
    const ui = panel(this, { x: 1045, y: top + h / 2, w, h, title: 'FOR SALE', depth: 20, foot: false }), box = ui.box;
    ui.crLast = this.crPrev; this.crPrev = undefined;
    crTag(this, ui, G.credits, ui.crLast !== undefined);
    const g = this.add.graphics(); box.add(g);
    const best = k => Math.max(...Object.keys(SHIP_MODELS).filter(id => SHIP_MODELS[id].price > 0 || id === 'wren').map(id => SHIP_MODELS[id][k]));
    const rows = [['HULL', 'hull', v => v + ' pts'], ['TOP SPEED', 'speed', v => String(v)], ['HOLD', 'cargo', v => v + ' ore'], ['FUEL TANK', 'tank', v => String(v)], ['JUMP RANGE', 'range', v => v + ' ly'], ['GUNS', 'guns', v => String(v)]];
    let y = -h / 2 + 40 + 20;
    rows.forEach(([name, k, fmt]) => {
      const v = m[k], mineV = mine[k], d = Math.round((v - mineV) * 10) / 10, col = d > 0 ? '#6dff9c' : d < 0 ? '#ff4d6d' : '#cfefff';
      this.text(box, L, y, name, 11, '#5b7a92', { style: { letterSpacing: 2 } });
      this.text(box, R, y, fmt(v) + (d ? '  (' + (d > 0 ? '+' : '') + d + ')' : '  (same)'), 13, col, { ox: 1, style: { fontStyle: 'bold' } });
      hudBar(g, L, y + 11, 380, 9, v / best(k), CYAN, 20);
      const tx = L + 380 * Math.min(1, mineV / best(k)); g.fillStyle(AMBER, 1); g.fillRect(tx - 1, y + 8, 2, 15); // where the ship you fly stands
      y += 38;
    });
    g.lineStyle(1, CYAN, 0.35); g.lineBetween(-w / 2 + 14, y - 8, w / 2 - 14, y - 8);
    this.text(box, L, y + 12, 'FITS UP TO TIER', 11, '#5b7a92', { style: { letterSpacing: 2 } });
    this.text(box, R, y + 12, PART_ORDER.map(k => PARTS[k].short + ' ' + shipMaxTier(this.view.model, k)).join('  '), 12, '#9fe9ff', { ox: 1 });
    this.text(box, L, y + 34, 'amber tick: your ' + activeShip().name, 11, '#ffb454');
    this.fadeSet.push(box); this.statusBox = box; this.statusUI = ui;
    return top + h;
  }

  bayMission(top) {
    const w = 420, h = 138, ui = panel(this, { x: 1045, y: top + h / 2, w, h, title: 'MISSION', depth: 20, foot: false }), box = ui.box;
    const m = missionDef(), live = m && (G.mission === 'accepted' || G.mission === 'rescued'), failed = m && G.mission === 'failed';
    if (live) {
      ui.tagText.setText('PAYS ' + m.reward + ' cr');
      this.text(box, -190, -16, m.title.toUpperCase(), 18, '#ffd37a', { style: { fontStyle: 'bold' } });
      this.text(box, -190, 8, m.where, 13, '#8fb4c9');
      this.text(box, -190, 30, m.progress(), 13, '#cfefff', { oy: 0, style: { lineSpacing: 3, wordWrap: { width: 380 } } });
    } else {
      ui.tagText.setText(failed ? 'FAILED' : 'NONE').setColor(failed ? '#ff4d6d' : '#6b8296');
      this.text(box, -190, -16, failed ? 'LAST CALL FAILED' : 'NO MISSION TAKEN', 18, failed ? '#ff4d6d' : '#9fe9ff', { style: { fontStyle: 'bold' } });
      this.text(box, -190, 8, failed ? m.line('failed') : 'You can fly free.', 13, '#8fb4c9');
      this.text(box, -190, 32, 'Calls are on the mission board in the hangar.\nGo back (Esc) to take one before you launch.', 13, '#cfefff', { oy: 0, style: { lineSpacing: 3 } });
    }
    this.fadeSet.push(box);
    return top + h;
  }

  bayLaunch(top) {
    const w = 420, h = 84, cx = 1045, cy = top + h / 2, c = 18;
    const box = this.add.container(cx, cy).setDepth(20);
    const p = [[-w / 2, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c]];
    const g = this.add.graphics(); hudPanel(g, -w / 2, -h / 2, w, h, c, 0.97, AMBER);
    g.fillStyle(AMBER, 0.16); g.fillPoints(p.map(([x, y]) => ({ x: x * 0.985, y: y * 0.94 })), true);
    g.fillGradientStyle(AMBER, AMBER, AMBER, AMBER, 0, 0, 0.22, 0.22); g.fillRect(-w / 2 + 3, 4, w - c - 6, h / 2 - 8); // the lower half glows
    const edge = this.add.graphics(); hudGlowPath(edge, p, AMBER, 1, true, 2.2); // the pulsing edge
    this.tweens.add({ targets: edge, alpha: 0.3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const cap = keyCap(this, 'Enter', AMBER); cap.setPosition(-w / 2 + 22 + cap.kw / 2, 0);
    box.add([g, edge, cap]);
    this.pLabel = this.text(box, 22, 0, 'LAUNCH', 34, '#ffb454', { ox: 0.5, glow: 10, style: { fontStyle: 'bold', letterSpacing: 6 } }); // after the glass, so it sits on top
    this.pSub = this.text(box, 22, 24, '', 13, '#ffd37a', { ox: 0.5 }); // what the button costs or says (src/hangar.js)
    const arrow = this.add.graphics(); arrow.fillStyle(AMBER, 1); arrow.fillTriangle(0, -11, 0, 11, 16, 0); arrow.fillStyle(AMBER, 0.45); arrow.fillTriangle(-20, -11, -20, 11, -4, 0);
    arrow.setPosition(w / 2 - 52, 0);
    this.tweens.add({ targets: arrow, x: w / 2 - 44, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const zone = this.add.rectangle(0, 0, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { box.setScale(1.025); beep(740, 0.03, 'square', 0.01); });
    zone.on('pointerout', () => box.setScale(1));
    zone.on('pointerdown', () => this.primary());
    box.add([arrow, zone]); this.fadeSet.push(box);
    this.launchBox = box;

    // one line of advice under the button: the thing most worth knowing before you go (src/hangar.js changes it for the other buttons)
    this.advText = this.add.text(cx, cy + h / 2 + 24, '', uiFont(13, '#ffd37a', { align: 'center', wordWrap: { width: 400 } })).setOrigin(0.5).setDepth(20); this.fadeSet.push(this.advText);
    this.hintCy = cx; this.bayHints('Launch');
  }

  // the advice for LAUNCH: low hull first, then the mission
  launchAdvice() {
    const info = bayShipInfo(), frac = info.hull / info.maxHull, m = missionDef(), live = m && (G.mission === 'accepted' || G.mission === 'rescued');
    return frac <= 0.4 ? ['Hull at ' + Math.round(frac * 100) + '%. The repair bay is in the hangar (Esc).', '#ff4d6d']
      : !live ? ['No mission taken. You can still fly free.', '#ffd37a']
      : ['All systems ready. ' + m.title + ' is waiting.', '#6dff9c'];
  }

  // the key hints, each one clickable; the first says what Enter does now
  bayHints(verb) {
    this.hintVerb = verb;
    if (this.hintRow) { this.fadeDrop(this.hintRow); this.hintRow.destroy(); }
    const row = this.hintRow = this.add.container(this.hintCy, H - 44).setDepth(20); this.fadeSet.push(row);
    const made = layoutHints(this, row, [['Enter', verb], ['Esc', 'Back to station'], ['Tab', 'Sector map']], 0), acts = [() => this.primary(), () => this.back(), () => toggleOverlay(this.game, 'map')];
    for (let i = 0; i < made.length; i += 2) {
      const cap2 = made[i], lab = made[i + 1], x0 = cap2.x - cap2.kw / 2 - 5, x1 = lab.x + lab.width + 5;
      const z = this.add.rectangle((x0 + x1) / 2, 0, x1 - x0, 30, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      z.on('pointerdown', acts[i / 2]); row.add(z);
    }
  }

  // the key list, drawn into a container of the hangar panel (src/hangar.js); (0, 0) is the middle of the panel
  bayControls(box, w) {
    BAY_CONTROLS.forEach(([keys, what], i) => {
      const col = Math.floor(i / 4), row = i % 4;
      let x = -w / 2 + 26 + col * 252; const y = -28 + row * 31;
      keys.forEach(k => { const cap = keyCap(this, k, AMBER); cap.setPosition(x + cap.kw / 2, y); box.add(cap); x += cap.kw + 4; }); // amber caps, as on the surface controls panel
      this.text(box, x + 8, y, what, 14, '#cfefff');
    });
  }

  // ---- keys: Enter or Space does what the amber button says, Esc goes back (src/hangar.js has the rest). A key held down from the station (repeat) is never a press ----
  bayKeys() {
    const kb = this.input.keyboard;
    kb.on('keydown', e => {
      if (e.repeat || this.leaving || this.typing || performance.now() < this.ignoreUntil) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') this.primary(e.code !== 'Space');
      else if (e.code === 'Escape') { if (this.armed) this.hangarDisarm(); else this.back(); }
      else this.hangarKey(e.code);
    });
    const resumed = () => { this.ignoreUntil = performance.now() + 300; }; // the map or help overlay closed: its Esc must not also leave the bay
    this.events.on('resume', resumed);
    this.events.once('shutdown', () => { this.events.off('resume', resumed); this.hangarClose(); });
  }

  back() {
    if (this.leaving || performance.now() < this.ignoreUntil) return;
    beep(300, 0.12, 'triangle', 0.04, -80);
    go(this, 'Station', { arrive: false });
  }

  // the panels fade, the ship fires its nozzles and flies out through the bay door, then the flight begins
  launch() {
    if (this.leaving || performance.now() < this.ignoreUntil || this.view.kind !== 'fleet' || this.view.rec !== activeShip()) return; // only the ship you fly launches
    this.hangarClose(); this.leaving = true; sfx('thrusters');
    const cam = this.cameras.main, img = this.shipImg;
    this.bob.stop(); img.setRotation(0);
    this.tweens.add({ targets: this.fadeSet, alpha: 0, duration: 320 });
    this.flames.forEach(e => e.setFrequency(5, 2));
    cam.shake(1000, 0.0025);
    this.tweens.add({
      targets: img, x: img.x + 1000, scale: this.K * 0.55, duration: 950, delay: 420, ease: 'Cubic.easeIn',
      onComplete: () => { this.flames.forEach(e => e.destroy()); this.leaving = false; go(this, 'Space', { from: 'station' }); } // go() refuses while leaving is set
    });
  }

  update(time, dt) {
    this.s1.tilePositionX += dt * 0.006; this.s2.tilePositionX += dt * 0.016;
    this.hangarTick(); // src/hangar.js: a message runs out, so does a sale or a purchase nobody confirmed
    const g = this.dyn, t = time / 1000, px = BAY.shipX, py = BAY.padY, img = this.shipImg;
    g.clear();
    if (this.leaving) { this.nozzleGlow(g, img); return; }
    for (let i = 0; i < 3; i++) { // ripples spreading out from under the ship
      const k = (t * 0.32 + i / 3) % 1, pts = this.bayEllipse(px, py, 120 + k * 170, 24 + k * 34, 40);
      g.lineStyle(1.5, CYAN, (1 - k) * 0.5); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.strokePath();
    }
    const k = (t / 3.8) % 1, sy = BAY.shipY - 128 + k * 256, a = Math.sin(k * Math.PI); // a scan line sweeps down over the ship
    g.fillGradientStyle(CYAN, CYAN, CYAN, CYAN, 0, 0, 0.22 * a, 0.22 * a); g.fillRect(px - 190, sy - 40, 380, 40);
    g.lineStyle(2, 0xcfefff, 0.7 * a); g.lineBetween(px - 190, sy, px + 190, sy);
    this.nozzleGlow(g, img);
  }

  nozzleGlow(g, img) { // a soft glow at each nozzle, following the ship
    const k = img.scaleX / this.K;
    this.nozzles.forEach(([nx, ny, ns]) => {
      const x = img.x + nx * img.scaleX, y = img.y + ny * img.scaleY;
      g.fillStyle(CYAN, 0.1); hudDisc(g, x, y, 34 * ns * k); g.fillStyle(CYAN, 0.18); hudDisc(g, x, y, 20 * ns * k); g.fillStyle(0xcfefff, 0.6); hudDisc(g, x, y, 7 * ns * k);
    });
  }
}
