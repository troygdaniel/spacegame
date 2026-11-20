// ---------- The Campaign scene: reads the keys, steps src/campaign.js, draws what its numbers say (docs/CAMPAIGN.md) ----------
// The only Phaser in the mode. Every rule, number and word comes from src/campaign.js (the tuning table CAMP, the sim, uiText for the text), so this
// file draws and listens and decides nothing about the game. It is not run by a test in plain Node (a scene is Phaser's): tests/campaign.mjs runs the sim.
//   K on the title opens it (campaignStart); Enter begins a level; W A S D fly, Space fires the main gun, Q blinks (the warp tech);
//   1 launch, 2 attack, 3 escort, 4 guard, 5 recall; I types an order and U speaks one (the strip and the ship computer, src/shipcomputer.js, find this scene);
//   Esc pauses (this scene's own pause, not Long Haul's: the Long Haul save is not touched here); after a win the story, the tech pick (1 2 3), then the next level.
// Mode: 'intro' (the story before) -> 'play' <-> 'pause' -> 'won' (story after) -> 'pick' (one of three techs, when the level offers any) -> next level, or after the last level 'end' (back to the title);
// or 'lost' (Enter tries again).
// this.camp is the game (campNew); this.panel is true while a card is up, which keeps the command strip from opening over it.

// what each ship is drawn as: a texture (model: a ship model of src/shipmodels.js, else a texture of the game) and its scale
const CAMP_LOOK = {
  carrier: { model: 'bastion', scale: 1.56 }, fighter: { model: 'talon', scale: 0.52 }, escort: { tex: 'police', scale: 0.72 }, // the carrier and the ships it launches, 35 percent smaller than they were (2.4, 0.8, 1.1); the hit circles in CAMP follow
  freighter: { tex: 'freighter', scale: 1 },
  raider: { tex: 'raider', scale: 1 }, drone: { tex: 'drone', scale: 1 }, gunship: { tex: 'gunship', scale: 1 }, mother: { tex: 'reaver', scale: 2.6, tint: 0xc9a0ff }, tower: { tex: 'gunship', scale: 1.6, tint: 0xff9a3a }
};
const CAMP_ADDR = { used: false }; // the address (?campaign=N, src/title.js) opens the Campaign once per page load: coming back to the title from it must not open it again
const CAMP_RADAR = { x: W - 118, y: 118, r: 98, range: 6000 }; // the radar's centre and radius on the screen, and the px of space it shows from the carrier to its edge

function campaignStart(s, level) { // the title's K: the level reached (or the highest built one)
  let n = level || campProgressLoad().level; while (n > 1 && !CAMP.levels[n]) n--;
  go(s, 'Campaign', { level: n });
}

class Campaign extends Phaser.Scene {
  constructor() { super('Campaign'); }
  init(d) { // d: { level, techs (instead of the saved ones: the address's), via, seed, god }
    d = d || {}; this.level = d.level || 1; this.via = d.via || 'menu'; this.opts = { seed: d.seed, god: !!d.god, via: this.via };
    this.P = campProgressLoad(); if (Array.isArray(d.techs)) this.P.techs = d.techs.filter(t => CAMP.tech[t]);
    this.leaving = false; this.panel = false; this.mode = 'intro'; this.card = null;
  }
  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    spaceBackdrop(this, true);
    this.boom = fxBoom(this);
    this.camp = campNew(this.level, this.P.techs, this.opts);
    this.sp = {}; this.bsp = [];
    const pl = campPlaces(this.level); Object.keys(pl).forEach(id => { if (!pl[id].hidden) this.drawPlace(pl[id]); });
    this.csp = this.camp.caches.map(k => this.add.image(k.x, k.y, 'pod').setScale(1.8).setDepth(3).setTint(0xffd37a)); // resource caches (level 2): gold pods that go when collected
    this.relicG = this.add.graphics().setDepth(2); // the relic's ring (level 2), and how far the hold has got
    this.sync();
    this.cameras.main.startFollow(this.sp[this.camp.carrier.id], true, 0.12, 0.12);
    this.k = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(100);
    const t = (x, y, size, color) => this.add.text(x, y, '', uiFont(size, color, { stroke: '#02060d', strokeThickness: 3 })).setScrollFactor(0).setDepth(101);
    this.hud = { hull: t(24, 18, 14, '#9fe9ff'), earth: t(24, 52, 14, '#9fe9ff'), bay: t(24, 86, 14, '#9fe9ff'), wave: t(24, 108, 14, '#ffd37a'), mother: t(W / 2 - 150, 18, 14, '#ff9ec0'), blink: t(24, 130, 14, '#7fe9ff'),
      obj: t(24, 152, 14, '#ffffff'), keys: this.add.text(24, H - 44, uiText('camp.ui.keys'), uiFont(14, '#9fbdd1', { stroke: '#02060d', strokeThickness: 4 })).setScrollFactor(0).setDepth(100) };
    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.showIntro();
  }
  drawPlace(p) {
    const r = p.r || 60;
    this.add.image(p.x, p.y, planetTexture(this, p.kind || 'rock', p.seed || 1)).setScale(r / 300).setDepth(1);
    label(this, p.x, p.y - r - 36, String(p.name).toUpperCase(), '#ffb454', 16);
    if (p.base) { this.add.image(p.x + 70, p.y - 60, 'station').setScale(0.16).setDepth(2); label(this, p.x + 70, p.y - 100, String(p.base).toUpperCase(), '#38e1ff', 13); }
  }

  // ----- the cards: the story, the pick, the end -----
  showCard(title, lines, hint, tall) {
    this.hideCard();
    const o = [], cx = W / 2, cy = H / 2 - 20, h = tall || 300;
    o.push(this.add.rectangle(cx, cy, 800, h, 0x04101c, 0.95).setStrokeStyle(2, CYAN, 0.85));
    o.push(this.add.text(cx, cy - h / 2 + 34, title, uiFont(24, '#38e1ff', { letterSpacing: 3 })).setOrigin(0.5));
    o.push(this.add.text(cx, cy + 6, lines.join('\n\n'), uiFont(20, '#e8f6ff', { align: 'center', wordWrap: { width: 720 }, lineSpacing: 4 })).setOrigin(0.5));
    o.push(this.add.text(cx, cy + h / 2 - 30, hint, uiFont(16, '#ffd37a')).setOrigin(0.5));
    o.forEach(x => x.setScrollFactor(0).setDepth(200));
    this.card = o; this.panel = true;
  }
  hideCard() { if (this.card) this.card.forEach(x => x.destroy()); this.card = null; this.panel = false; }
  say(lines) { if (typeof shipcompSay === 'function' && lines.length) shipcompSay(lines.join(' ')); } // the ship's voice, as much as Settings > Sound allows
  showIntro() {
    this.mode = 'intro'; const lines = campStory(this.level, 'before');
    this.showCard(uiText('camp.ui.level', { n: this.level, name: CAMP.levels[this.level].name }), lines, uiText('camp.ui.begin'));
    this.say(lines);
  }
  showWon() {
    this.mode = 'won'; const lines = campStory(this.level, 'after');
    this.showCard(uiText('camp.ui.title'), lines, uiText('camp.ui.next')); this.say(lines);
  }
  showPick() {
    this.mode = 'pick'; this.choices = campTechChoices(this.level);
    this.showCard(uiText('camp.ui.pick'), this.choices.map((id, i) => (i + 1) + '   ' + uiText('camp.tech.' + id + '.name') + '  -  ' + uiText('camp.tech.' + id + '.text')), '', 340);
  }
  showLost(why) {
    this.mode = 'lost'; const line = uiText('camp.lose.' + why);
    this.showCard(uiText('camp.ui.title'), [line], uiText('camp.ui.retry')); this.say([line]);
  }
  showPause() { this.mode = 'pause'; this.showCard(uiText('camp.ui.title'), typeof campDebugLine === 'function' ? [campDebugLine(this.camp)] : [], uiText('camp.ui.paused'), 200); } // campDebugLine: the tune kit's one short line of its keys
  next() { // after the story (and the pick): the next level, or after the last one the end, with a new campaign waiting
    const last = !CAMP.levels[this.level + 1];
    this.P.level = last ? 1 : Math.max(this.P.level, this.level + 1); if (last) this.P.techs = []; campProgressSave(this.P);
    if (!last) { go(this, 'Campaign', { level: this.level + 1, via: 'next' }); return; }
    this.mode = 'end'; this.showCard(uiText('camp.ui.title'), [], uiText('camp.ui.end'), 200);
  }

  // ----- keys -----
  onKey(e) {
    if (e.repeat || this.leaving) return;
    const c = e.code, C = this.camp;
    if (this.mode === 'intro') { if (c === 'Enter') { this.hideCard(); this.mode = 'play'; } return; }
    if (this.mode === 'won') { if (c === 'Enter') { if (campTechChoices(this.level).length) this.showPick(); else this.next(); } return; }
    if (this.mode === 'end') { if (c === 'Enter' || c === 'KeyT') go(this, 'Title'); return; }
    if (this.mode === 'pick') {
      const i = { Digit1: 0, Digit2: 1, Digit3: 2 }[c];
      if (i !== undefined && this.choices[i]) { campPick(this.P, this.choices[i]); this.hideCard(); this.next(); }
      return;
    }
    if (this.mode === 'lost') { if (c === 'Enter') go(this, 'Campaign', { level: this.level, techs: this.P.techs, via: 'retry' }); else if (c === 'KeyT') go(this, 'Title'); return; }
    if (this.mode === 'pause') { if (c === 'Escape') { this.hideCard(); this.mode = 'play'; } else if (c === 'KeyT') go(this, 'Title'); return; }
    if (c === 'Escape') { this.showPause(); return; }
    const order = { Digit1: 'launch', Digit2: 'attack', Digit3: 'escort', Digit4: 'guard', Digit5: 'recall' }[c];
    if (order) { const r = campOrder(C, order, '', 'key'); toast(this, r.say, r.ok ? '#9fe9ff' : '#ffb454'); }
    else if (c === 'KeyQ') C.input.blink = true;
    else if (typeof campDebugKey === 'function') { // the tune kit (src/campdebug.js): ] skip, \\ win, [ lose, ` god mode; none is a key you fly by
      const id = campDebugKey(c); if (!id) return;
      const r = campDebugRun(C, this.P, id); if (r && r.say) toast(this, r.say, '#ffd37a');
      if (r && r.go) go(this, 'Campaign', { level: r.go.level, techs: r.go.techs, via: 'skip' });
    }
  }

  // ----- each frame -----
  update(time, dt) {
    spaceBackdropTick(this);
    const C = this.camp;
    if (this.mode === 'play' && !C.result) {
      const k = this.k, inp = C.input;
      inp.turn = ((k.D.isDown || k.RIGHT.isDown) ? 1 : 0) - ((k.A.isDown || k.LEFT.isDown) ? 1 : 0);
      inp.thrust = (k.W.isDown || k.UP.isDown) ? 1 : 0; inp.brake = k.S.isDown || k.DOWN.isDown; inp.fire = k.SPACE.isDown;
      campStep(C, Math.min(dt, 100) / 1000);
    }
    C.events.splice(0).forEach(e => this.onEvent(e));
    this.sync(); this.paintHud();
  }
  onEvent(e) {
    if (e.type === 'say') { const text = uiText(e.key, e.vars); toast(this, text, '#9fe9ff'); this.say([text]); }
    else if (e.type === 'gun') sfx('laser');
    else if (e.type === 'boom') { this.boom.explode(e.big ? 90 : 26, e.x, e.y); sfx('boom'); if (e.kind === 'carrier') this.cameras.main.shake(400, 0.01); }
    else if (e.type === 'hit') { if (e.id === this.camp.carrier.id) this.cameras.main.shake(90, 0.003); this.boom.explode(3, e.x, e.y); }
    else if (e.type === 'earthhit') this.boom.explode(6, e.x, e.y);
    else if (e.type === 'launch' || e.type === 'dock') beep(e.type === 'launch' ? 560 : 420, 0.07, 'triangle', 0.04, 160);
    else if (e.type === 'blink') { this.boom.explode(30, e.x, e.y); sfx('shieldUp'); }
    else if (e.type === 'end') { if (e.result === 'won') this.time.delayedCall(1800, () => this.showWon()); else this.time.delayedCall(1200, () => this.showLost(e.why)); }
  }

  // the sprites follow the numbers: one per ship, one per shot, made when first seen and destroyed when the ship is gone
  texOf(kind) {
    const look = CAMP_LOOK[kind] || CAMP_LOOK.drone;
    const key = look.model && typeof shipPreviewTexture === 'function' ? shipPreviewTexture(this, look.model) : look.tex;
    return this.textures.exists(key) ? key : 'ship';
  }
  sync() {
    const C = this.camp, seen = {};
    C.ships.forEach(u => {
      let sp = this.sp[u.id];
      if (!sp) { const look = CAMP_LOOK[u.kind] || CAMP_LOOK.drone; sp = this.sp[u.id] = this.add.image(u.x, u.y, this.texOf(u.kind)).setScale(look.scale).setDepth(u.kind === 'carrier' ? 5 : u.team === 'earth' ? 4 : 3); if (look.tint) sp.setTint(look.tint); }
      sp.setPosition(u.x, u.y).setRotation(u.rot); seen[u.id] = true;
    });
    Object.keys(this.sp).forEach(id => { if (!seen[id]) { this.sp[id].destroy(); delete this.sp[id]; } });
    this.camp.caches.forEach((k, i) => this.csp[i].setVisible(!k.got));
    const rg = this.relicG, R = C.relic, L = CAMP.levels[C.level];
    rg.clear();
    if (R) { rg.lineStyle(2, 0x7fe9ff, 0.45).strokeCircle(R.x, R.y, L.relic.radius); if (R.hold > 0) { rg.lineStyle(6, 0x7fe9ff, 0.95).beginPath().arc(R.x, R.y, L.relic.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * R.hold / L.relic.hold).strokePath(); } }
    while (this.bsp.length < C.bullets.length) this.bsp.push(this.add.image(0, 0, 'bullet').setDepth(4));
    this.bsp.forEach((im, i) => {
      const b = C.bullets[i]; if (!b) { im.setVisible(false); return; }
      im.setVisible(true).setPosition(b.x, b.y).setRotation(b.rot).setTexture(b.team === 'earth' ? 'bullet' : 'ebullet').setScale(b.beam ? 4 : b.pd ? 0.6 : 1, b.beam ? 1.6 : 1);
      if (b.beam) im.setTint(0x7fe9ff); else im.clearTint();
    });
  }
  // the gauges and the radar
  paintHud() {
    const C = this.camp, g = this.hudG, c = C.carrier, bar = (x, y, w, f, color) => { g.fillStyle(0x04101c, 0.8).fillRect(x, y, w, 12); g.fillStyle(color, 1).fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, f))), 10); g.lineStyle(1, 0x38e1ff, 0.5).strokeRect(x, y, w, 12); };
    g.clear();
    bar(24, 36, 220, c.hp / c.maxHp, c.hp / c.maxHp > 0.3 ? 0x6dff9c : 0xff4d6d);
    if (C.earth) bar(24, 70, 220, C.earth.shield / C.earth.max, 0x38e1ff);
    const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0);
    if (m) bar(W / 2 - 150, 36, 300, m.hp / m.maxHp, 0xc9a0ff);
    const out = campWing(C, 'fighter').length + campWing(C, 'escort').length, waves = CAMP.levels[C.level].waves;
    this.hud.hull.setText(uiText('camp.ui.hull') + '  ' + Math.round(c.hp)); this.hud.earth.setText(C.earth ? uiText('camp.ui.earth') + '  ' + Math.round(C.earth.shield / C.earth.max * 100) + '%' : ''); this.hud.obj.setText(campObjective(C));
    this.hud.bay.setText(uiText('camp.ui.bay') + '  ' + C.bay.fighters + '+' + C.bay.escorts + '    ' + uiText('camp.ui.out') + '  ' + out);
    this.hud.wave.setText(uiText('camp.ui.wave', { n: C.waves.filter(w => w.started).length, total: waves.length }));
    this.hud.mother.setText(m ? uiText('camp.ui.mother') : '');
    this.hud.blink.setText(C.techs.indexOf('blink') >= 0 ? 'Q  ' + (C.t - C.blinkAt >= CAMP.tech.blink.cooldown ? 'READY' : Math.ceil((CAMP.tech.blink.cooldown - (C.t - C.blinkAt)) / 1000) + ' s') : '');
    // the radar: the carrier at its centre, space shown out to CAMP_RADAR.range; a ship beyond it is drawn on the rim
    const R = CAMP_RADAR; g.fillStyle(0x04101c, 0.75).fillCircle(R.x, R.y, R.r); g.lineStyle(1, 0x38e1ff, 0.6).strokeCircle(R.x, R.y, R.r);
    const dot = (p, color, size) => { let dx = (p.x - c.x) / R.range * R.r, dy = (p.y - c.y) / R.range * R.r; const d = Math.hypot(dx, dy); if (d > R.r - 3) { dx *= (R.r - 3) / d; dy *= (R.r - 3) / d; } g.fillStyle(color, 1).fillCircle(R.x + dx, R.y + dy, size); };
    const pl = campPlaces(C.level); Object.keys(pl).forEach(id => { if (!pl[id].hidden) dot(pl[id], id === 'earth' ? 0x4aa3ff : 0xb9a37a, id === 'earth' ? 4 : 2); });
    C.caches.forEach(k => { if (!k.got) dot(k, 0xffd37a, 2); }); if (C.relic) dot(C.relic, 0x7fe9ff, 3);
    C.ships.forEach(u => { if (u.hp <= 0) return; dot(u, u.team === 'alien' ? (u.kind === 'mother' ? 0xff4dff : u.kind === 'tower' ? 0xff9a3a : 0xff4d6d) : u.kind === 'freighter' ? 0xffb454 : u.kind === 'carrier' ? 0xffffff : 0x6dff9c, u.kind === 'mother' ? 4 : u.kind === 'carrier' ? 3 : 2); });
  }
}
