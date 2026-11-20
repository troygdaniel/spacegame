// ---------- The Campaign scene: reads the keys, steps src/campaign.js, draws what its numbers say (docs/CAMPAIGN.md) ----------
// The only Phaser in the mode. Every rule, number and word comes from src/campaign.js (the tuning table CAMP, the sim, uiText for the text), so this
// file draws and listens and decides nothing about the game. It is not run by a test in plain Node (a scene is Phaser's): tests/campaign.mjs runs the sim.
//   K on the title opens it (campaignStart); Enter begins a level; W A S D fly, Space (held) makes the eight turrets fire, F fires a homing missile (the magazine is C.missiles), Q blinks (the warp tech);
//   there is no other gun: the turrets aim themselves at the nearest alien in reach, always, and fire only while Space is held; the scene draws them, their reach and their flash (syncRockets)
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
const CAMP_REACH = { w: 2, alpha: 0.4, color: 0xffd37a }; // the ring that shows how far the point guns reach (CAMP.carrier.pdRange): its line width, how solid it is, its colour (it was 1 px at 0.16, too faint to find: 6-GEN and 8-GEN)
const CAMP_ADDR = { used: false }; // the address (?campaign=N, src/title.js) opens the Campaign once per page load: coming back to the title from it must not open it again
const CAMP_RADAR = { x: W - 118, y: 118, r: 98, range: 6000, fill: 0.9, rim: [2, 0.8], blip: 1 }; // the radar's centre and radius on the screen, and the px of space it shows from the carrier to its edge

function campaignStart(s, level) { // the title's K: the level reached (or the highest built one)
  let n = level || campProgressLoad().level; while (n > 1 && !CAMP.levels[n]) n--;
  go(s, 'Campaign', { level: n });
}

class Campaign extends Phaser.Scene {
  constructor() { super('Campaign'); }
  init(d) { // d: { level, techs (instead of the saved ones: the address's), via, seed, god }
    d = d || {}; this.level = d.level || 1; this.via = d.via || 'menu'; this.opts = { seed: d.seed, god: !!d.god, via: this.via };
    this.P = campProgressLoad(); if (Array.isArray(d.techs)) this.P.techs = d.techs.filter(t => CAMP.tech[t]);
    this.leaving = false; this.panel = false; this.mode = 'intro'; this.card = null; this.mp = null; this.shown = {};
  }
  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    spaceBackdrop(this, true);
    this.boom = fxBoom(this);
    this.camp = campNew(this.level, this.P.techs, this.opts);
    this.sp = {}; this.bsp = [];
    const pl = campPlaces(this.level); Object.keys(pl).forEach(id => { if (!pl[id].hidden) this.drawPlace(pl[id]); });
    this.osp = {}; // the ore lying about (asteroid rocks and wrecks), one sprite each
    this.csp = this.camp.caches.map(k => this.add.image(k.x, k.y, 'pod').setScale(1.8).setDepth(3).setTint(0xffd37a)); // resource caches (level 2): gold pods that go when collected
    this.relicG = this.add.graphics().setDepth(2); // the relic's ring (level 2), and how far the hold has got
    this.sync();
    this.cameras.main.startFollow(this.sp[this.camp.carrier.id], true, 0.12, 0.12);
    this.k = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(100);
    const t = (x, y, size, color) => this.add.text(x, y, '', uiFont(size, color, { stroke: '#02060d', strokeThickness: 3 })).setScrollFactor(0).setDepth(101);
    this.hud = { shield: t(252, 18, 14, '#7fe9ff'), ore: t(252, 52, 14, '#ffd37a'), hull: t(24, 18, 14, '#9fe9ff'), earth: t(24, 52, 14, '#9fe9ff'), bay: t(24, 86, 14, '#9fe9ff'), wave: t(24, 108, 14, '#ffd37a'), mother: t(W / 2 - 150, 18, 14, '#ff9ec0'), blink: t(24, 130, 14, '#7fe9ff'),
      obj: t(24, 152, 14, '#ffffff'), keys: this.add.text(24, H - 44, uiText('camp.ui.keys'), uiFont(14, '#9fbdd1', { stroke: '#02060d', strokeThickness: 4 })).setScrollFactor(0).setDepth(100) };
    this.input.keyboard.on('keydown', e => this.onKey(e));
    if (typeof campMapInstall === 'function') campMapInstall(this); // Tab: the map of the level, over the battle, which goes on behind it (src/campmap.js, src/campmapdraw.js)
    this.showIntro();
  }
  drawPlace(p) {
    const r = p.r || 60;
    const im = this.add.image(p.x, p.y, planetTexture(this, p.kind || 'rock', p.seed || 1)).setScale(r / 300).setDepth(1); if (p.tint) im.setTint(p.tint); // the place's own colour (CAMP.places tint): Mars is not grey like Luna
    label(this, p.x, p.y - r - 36, String(p.name).toUpperCase(), '#ffb454', 16);
    if (p.base) { this.add.image(p.x + 70, p.y - 60, 'station').setScale(0.16).setDepth(2); label(this, p.x + 70, p.y - 100, String(p.base).toUpperCase(), '#38e1ff', 13); }
  }

  // ----- the cards: the story, the pick, the end -----
  showCard(title, lines, hint, tall) {
    this.hideCard(); if (typeof campMapClose === 'function') campMapClose(this); // a card (the story, the end) comes up over the map: the map goes
    const o = [], cx = W / 2, cy = H / 2 - 20, h = tall || 300;
    o.push(this.add.rectangle(W / 2, H / 2, W, H, 0x02060d, 0.5)); // a veil over the battle and its gauges, so the card is the one thing to read (the blind critic: HUD and planet labels showed through the card)
    o.push(this.add.rectangle(cx, cy, 800, h, 0x04101c, 1).setStrokeStyle(2, CYAN, 0.85));
    o.push(this.add.text(cx, cy - h / 2 + 34, title, uiFont(24, '#38e1ff', { letterSpacing: 3 })).setOrigin(0.5));
    o.push(this.add.text(cx, cy + 6, lines.join('\n\n'), uiFont(20, '#e8f6ff', { align: 'center', wordWrap: { width: 720 }, lineSpacing: 4 })).setOrigin(0.5));
    o.push(this.add.text(cx, cy + h / 2 - 30, hint, uiFont(16, '#ffd37a')).setOrigin(0.5));
    o.forEach(x => x.setScrollFactor(0).setDepth(200));
    this.card = o; this.panel = true;
  }
  hideCard() { if (this.card) this.card.forEach(x => x.destroy()); this.card = null; this.panel = false; }
  flash(id) { const sp = this.sp[id]; if (!sp) return; sp.setTint(0xff8a8a); this.time.delayedCall(90, () => { if (sp.active !== false) sp.clearTint(); }); } // the hull took a hit: the carrier blinks red for 90 ms (the blind critic: nothing but a red bar said so)
  say(lines) { if (typeof shipcompSay === 'function') lines.forEach(l => { if (l) shipcompSay(l); }); } // the ship's voice, as much as Settings > Sound allows: each line on its own, because Short speaks only the first sentence or two of what it is given and one joined text lost the line that says what to do (docs/night/ux.md 1)
  showIntro() {
    this.mode = 'intro'; const lines = campStory(this.level, 'before');
    this.showCard(uiText('camp.ui.level', { n: this.level, name: CAMP.levels[this.level].name }), lines, uiText('camp.ui.begin'));
    this.say(lines);
  }
  showWon() {
    this.mode = 'won'; const lines = campStory(this.level, 'after'), res = typeof campWinLine === 'function' ? campWinLine(this.camp) : ''; // src/campwin.js: how it went, for reading
    this.showCard(uiText('camp.ui.won', { n: this.level }), res ? lines.concat([res]) : lines, uiText('camp.ui.next')); this.say(lines);
  }
  showPick() {
    this.mode = 'pick'; this.choices = campTechChoices(this.level);
    this.showCard(uiText('camp.ui.pick'), this.choices.map((id, i) => (i + 1) + '   ' + uiText('camp.tech.' + id + '.name') + '  -  ' + uiText('camp.tech.' + id + '.text')), '', 340);
  }
  showLost(why) {
    this.mode = 'lost'; const lines = typeof campLoseLines === 'function' ? campLoseLines(this.camp, why) : [uiText('camp.lose.' + why)]; // src/camplose.js: what happened, how far, one thing to try
    this.showCard(uiText('camp.ui.lost', { n: this.level }), lines, uiText('camp.ui.retry')); this.say([lines[0]].concat(lines.slice(2))); // the numbers are for reading: the cause and the tip are said
  }
  showPause() { this.mode = 'pause'; this.showCard(uiText('camp.ui.pausetitle'), [uiText('camp.ui.pausegoal', { goal: campObjective(this.camp) }), uiText('camp.ui.pausemap')].concat([uiText('camp.ui.pausehelp')], typeof campDebugLine === 'function' ? [campDebugLine(this.camp)] : []), uiText('camp.ui.paused'), 322); } // the goal first (docs/night/ux.md 7), then the map and the help lines, then campDebugLine: the tune kit's one short line of its keys
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
    if (c === 'Escape') { if (this.mp) campMapClose(this); else this.showPause(); return; } // Esc closes the map first; it never pauses while the map is open
    const order = { Digit1: 'launch', Digit2: 'attack', Digit3: 'escort', Digit4: 'guard', Digit5: 'recall', Digit6: 'mine', Digit7: 'recharge', Digit8: 'build', Digit9: 'build' }[c];
    if (order) { const r = c === 'Digit9' ? campOrder(C, 'build', 'escort', 'key') : campOrder(C, order, '', 'key'); toast(this, r.say, r.ok ? '#9fe9ff' : '#ffb454'); } // 8 builds a fighter, 9 an escort
    else if (c === 'KeyQ') C.input.blink = true;
    else if (c === 'KeyF') this.fireMissile();
    else if (typeof campDebugKey === 'function') { // the tune kit (src/campdebug.js): ] skip, \\ win, [ lose, ` god mode; none is a key you fly by
      const id = campDebugKey(c); if (!id) return;
      const r = campDebugRun(C, this.P, id); if (r && r.say) toast(this, r.say, '#ffd37a');
      if (r && r.go) go(this, 'Campaign', { level: r.go.level, techs: r.go.techs, via: 'skip' });
    }
  }

  fireMissile() { const r = campOrder(this.camp, 'missiles', '', 'key'); toast(this, r.say, r.ok ? '#9fe9ff' : '#ffb454'); }

  // ----- each frame -----
  update(time, dt) {
    spaceBackdropTick(this);
    const C = this.camp;
    if (this.mode === 'play' && !C.result) {
      const k = this.k, inp = C.input;
      inp.turn = ((k.D.isDown || k.RIGHT.isDown) ? 1 : 0) - ((k.A.isDown || k.LEFT.isDown) ? 1 : 0);
      inp.thrust = (k.W.isDown || k.UP.isDown) ? 1 : 0; inp.brake = k.S.isDown || k.DOWN.isDown; inp.fire = k.SPACE.isDown;
      campStep(C, Math.min(dt, 100) / 1000);
      if (typeof campNudge === 'function') { const nd = campNudge(C, this.shown); if (nd) toast(this, nd, '#9fe9ff'); } // the first-minute hints, once each (src/campnudge.js)
    }
    C.events.splice(0).forEach(e => this.onEvent(e));
    this.syncRockets(Math.min(dt, 100));
    this.sync(); this.paintHud();
    if (this.mp) campMapPaint(this, time);
  }
  onEvent(e) {
    if (e.type === 'say') { const text = uiText(e.key, e.vars); toast(this, text, '#9fe9ff'); this.say([text]); }
    else if (e.type === 'gun') sfx('laser');
    else if (e.type === 'boom') { this.boom.explode(e.big ? 90 : 26, e.x, e.y); sfx('boom'); if (e.kind === 'carrier') this.cameras.main.shake(400, 0.01); }
    else if (e.type === 'hit') { if (e.id === this.camp.carrier.id) { this.cameras.main.shake(90, 0.003); this.flash(e.id); } this.boom.explode(3, e.x, e.y); }
    else if (e.type === 'earthhit') this.boom.explode(6, e.x, e.y);
    else if (e.type === 'launch' || e.type === 'dock') beep(e.type === 'launch' ? 560 : 420, 0.07, 'triangle', 0.04, 160);
    else if (e.type === 'blink') { this.boom.explode(30, e.x, e.y); sfx('shieldUp'); }
    else if (e.type === 'missile') beep(170, 0.4, 'sawtooth', 0.045, 520);
    else if (e.type === 'mboom') { this.boom.explode(44, e.x, e.y); sfx('boom'); }
    else if (e.type === 'mfizzle') this.boom.explode(6, e.x, e.y);
    else if (e.type === 'ore') beep(900, 0.05, 'triangle', 0.035, 200);
    else if (e.type === 'built') beep(660, 0.12, 'triangle', 0.05, 240);
    else if (e.type === 'recharge') { sfx('shieldUp'); this.boom.explode(10, e.x, e.y); }
    else if (e.type === 'shieldhit' && e.x === this.camp.carrier.x) this.cameras.main.shake(60, 0.002);
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
    if (!this.osp) this.osp = {}; const seenOre = {}; // (made in create; a stand-in scene in a test has none)
    C.pickups.forEach(o => { // rocks are asteroids, a wreck's ore glows; a wreck blinks in its last seconds
      let im = this.osp[o.id];
      if (!im) { im = this.osp[o.id] = o.kind === 'rock' ? this.add.image(o.x, o.y, ['asteroid', 'asteroid2', 'asteroid3'][parseInt(String(o.id).split('-')[1], 10) % 3]).setDepth(2).setRotation(o.x) : this.add.image(o.x, o.y, 'ore').setDepth(3).setBlendMode('ADD').setScale(1.4); }
      if (o.kind === 'wreck') im.setAlpha(C.t - o.born > CAMP.ore.wreckLife - 6000 && Math.sin(C.t / 90) < 0 ? 0.3 : 1);
      seenOre[o.id] = true;
    });
    Object.keys(this.osp).forEach(id => { if (!seenOre[id]) { this.osp[id].destroy(); delete this.osp[id]; } });
    const rg = this.relicG, R = C.relic, L = CAMP.levels[C.level];
    rg.clear();
    if (R) { rg.lineStyle(2, 0x7fe9ff, 0.45).strokeCircle(R.x, R.y, L.relic.radius); if (R.hold > 0) { rg.lineStyle(6, 0x7fe9ff, 0.95).beginPath().arc(R.x, R.y, L.relic.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * R.hold / L.relic.hold).strokePath(); } }
    while (this.bsp.length < C.bullets.length) this.bsp.push(this.add.image(0, 0, 'bullet').setDepth(4));
    this.bsp.forEach((im, i) => {
      const b = C.bullets[i]; if (!b) { im.setVisible(false); return; }
      im.setVisible(true).setPosition(b.x, b.y).setRotation(b.rot).setTexture(b.team === 'earth' ? 'bullet' : 'ebullet').setScale(b.beam ? 3 : b.pd ? 0.9 : 1, b.beam ? 1.2 : 1);
      if (b.beam) im.setTint(0x7fe9ff); else if (b.pd) im.setTint(0xffd37a); else im.clearTint(); // the turrets' shots are amber; the beam tech's are cyan, long and go through
    });
  }
  // the missiles in flight (a body, a flame and a trail of smoke), the turrets (a faint ring of how far they reach, four mounts that flash when one fires) and the magazine count
  syncRockets(ms) {
    const C = this.camp, c = C.carrier, k = CAMP.missile, seen = {}, play = this.mode === 'play';
    if (!this.hud.missiles) { // made the first time: the missiles in flight, the turrets' reach ring and mounts, the magazine count (bottom left, above the key line)
      this.msp = {}; this.reachG = this.add.graphics().setDepth(2); this.mountG = this.add.graphics().setDepth(6);
      this.hud.missiles = this.add.text(24, H - 72, '', uiFont(14, '#ffb454', { stroke: '#02060d', strokeThickness: 3 })).setScrollFactor(0).setDepth(101);
    }
    C.rockets.forEach(m => {
      const ux = Math.cos(m.rot), uy = Math.sin(m.rot);
      let r = this.msp[m.id];
      if (!r) r = this.msp[m.id] = { body: this.add.rectangle(m.x, m.y, 16, 5, 0xfff1d0).setDepth(5), flame: this.add.image(m.x, m.y, 'ember').setBlendMode('ADD').setTint(0xffa040).setScale(1.6).setDepth(5), puff: 0 };
      r.body.setPosition(m.x, m.y).setRotation(m.rot); r.flame.setPosition(m.x - ux * 11, m.y - uy * 11); seen[m.id] = true;
      r.puff -= ms;
      if (play && r.puff <= 0) { // smoke: a soft puff every 40 ms that grows and fades
        r.puff = 40; const p = this.add.image(m.x - ux * 10, m.y - uy * 10, 'smoke').setScale(0.22).setTint(0xb8c2cc).setAlpha(0.55).setDepth(4);
        this.tweens.add({ targets: p, alpha: 0, scale: 0.8, duration: 700, onComplete: () => p.destroy() });
      }
    });
    Object.keys(this.msp).forEach(id => { if (!seen[id]) { this.msp[id].body.destroy(); this.msp[id].flame.destroy(); delete this.msp[id]; } });
    const g = this.reachG, mg = this.mountG; g.clear(); mg.clear();
    if (c.hp > 0) {
      g.lineStyle(CAMP_REACH.w, CAMP_REACH.color, CAMP_REACH.alpha).strokeCircle(c.x, c.y, campReach(C)); // how far a turret reaches (the beam tech reaches further)
      C.turrets.forEach(tu => { // the eight turrets, where the sim put them: a dark base and an amber dot; a barrel toward the alien each has picked (it aims even when Space is not held); a bright flash and a longer barrel on the shot
        const hot = C.t - tu.shotAt < 120;
        mg.fillStyle(0x04101c, 0.9).fillCircle(tu.x, tu.y, 5); mg.fillStyle(hot ? 0xffffff : 0xffd37a, 1).fillCircle(tu.x, tu.y, hot ? 4 : 2.5);
        if (tu.target) mg.lineStyle(hot ? 3 : 2, hot ? 0xffe9a0 : 0xffd37a, hot ? 0.95 : 0.7).lineBetween(tu.x, tu.y, tu.x + Math.cos(tu.aim) * (hot ? 18 : 11), tu.y + Math.sin(tu.aim) * (hot ? 18 : 11));
      });
    }
    this.hud.missiles.setColor(C.missiles > 0 ? '#ffb454' : '#ff4d6d').setText(uiText('camp.ui.missiles', { n: C.missiles })
      + (C.missiles < k.magazine && C.reloadAt ? '    ' + uiText('camp.ui.missilenext', { s: Math.max(0, Math.ceil((C.reloadAt - C.t) / 1000)) }) : ''));
  }
  // the gauges and the radar
  paintHud() {
    const C = this.camp, g = this.hudG, c = C.carrier, bar = (x, y, w, f, color) => { g.fillStyle(0x04101c, 0.8).fillRect(x, y, w, 12); g.fillStyle(color, 1).fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, f))), 10); g.lineStyle(1, 0x38e1ff, 0.5).strokeRect(x, y, w, 12); };
    g.clear();
    bar(24, 36, 220, c.hp / c.maxHp, c.hp / c.maxHp > 0.3 ? 0x6dff9c : 0xff4d6d);
    bar(252, 36, 90, C.shield / CAMP.carrier.shield, 0x7fe9ff);
    if (C.earth) bar(24, 70, 220, C.earth.shield / C.earth.max, 0x38e1ff);
    const m = C.ships.find(u => u.kind === 'mother' && u.hp > 0);
    if (m) bar(W / 2 - 150, 36, 300, m.hp / m.maxHp, 0xc9a0ff);
    const out = campWing(C, 'fighter').length + campWing(C, 'escort').length, waves = CAMP.levels[C.level].waves;
    this.hud.hull.setText(uiText('camp.ui.hull') + '  ' + Math.round(c.hp)); this.hud.earth.setText(C.earth ? uiText('camp.ui.earth') + '  ' + Math.round(C.earth.shield / C.earth.max * 100) + '%' : ''); this.hud.obj.setText(campObjective(C));
    this.hud.bay.setText(uiText('camp.ui.baywords', { f: C.bay.fighters, e: C.bay.escorts, out })); // "BAY  fighters 6  escorts 2   OUT 0": it used to read 6+2 (docs/night/ux.md 5)
    if (this.hud.ore) this.hud.ore.setText(uiText('camp.ui.ore') + '  ' + Math.floor(C.ore) + (C.build.queue.length ? '  +' + C.build.queue.length : '')); // the ore, under the shield gauge (a stand-in scene in a test may have no ore text)
    if (this.hud.shield) this.hud.shield.setText(uiText('camp.ui.shield') + '  ' + Math.round(C.shield)); // (a stand-in scene in a test may have no shield text)
    this.hud.wave.setText(uiText('camp.ui.wave', { n: C.waves.filter(w => w.started).length, total: waves.length }));
    this.hud.mother.setText(m ? uiText('camp.ui.mother') : '');
    this.hud.blink.setText(C.techs.indexOf('blink') >= 0 ? 'Q  ' + (C.t - C.blinkAt >= CAMP.tech.blink.cooldown ? 'READY' : Math.ceil((CAMP.tech.blink.cooldown - (C.t - C.blinkAt)) / 1000) + ' s') : '');
    // the radar: the carrier at its centre, space shown out to CAMP_RADAR.range; a ship beyond it is drawn on the rim
    const R = CAMP_RADAR; g.fillStyle(0x04101c, R.fill).fillCircle(R.x, R.y, R.r); g.lineStyle(R.rim[0], 0x38e1ff, R.rim[1]).strokeCircle(R.x, R.y, R.r);
    const dot = (p, color, size) => { let dx = (p.x - c.x) / R.range * R.r, dy = (p.y - c.y) / R.range * R.r; const d = Math.hypot(dx, dy); if (d > R.r - 3) { dx *= (R.r - 3) / d; dy *= (R.r - 3) / d; } g.fillStyle(color, 1).fillCircle(R.x + dx, R.y + dy, size + R.blip); };
    const pl = campPlaces(C.level); Object.keys(pl).forEach(id => { if (!pl[id].hidden) dot(pl[id], id === 'earth' ? 0x4aa3ff : 0xb9a37a, id === 'earth' ? 4 : 2); });
    C.pickups.forEach(o => dot(o, o.kind === 'wreck' ? 0xffd37a : 0x8c8c8c, 1)); C.caches.forEach(k => { if (!k.got) dot(k, 0xffd37a, 2); }); if (C.relic) dot(C.relic, 0x7fe9ff, 3);
    C.ships.forEach(u => { if (u.hp <= 0) return; dot(u, campDotColor(u), u.kind === 'mother' ? 4 : u.kind === 'carrier' ? 3 : 2); }); // campDotColor (src/campmap.js): the map's colours too
  }
}
