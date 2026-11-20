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

// what each ship is drawn as: a texture (art: a ship picture of the Campaign's own, src/campcruiser.js; model: a ship model of src/shipmodels.js; else a texture of the game) and its scale
const CAMP_LOOK = {
  // the carrier and the ships it launches: how big they are is CAMP.size (the drawn length and the hit circle, one table); the scale is that length over the picture's own width w (h is its height)
  carrier: campArtLook('carrier', 'cruiser'), fighter: campArtLook('fighter', 'fighter'), escort: campArtLook('escort', 'escort'), // the pictures are the Campaign's own (src/campcruiser.js)
  freighter: { tex: 'freighter', scale: 1 },
  raider: { tex: 'raider', scale: 1 }, drone: { tex: 'drone', scale: 1 }, gunship: { tex: 'gunship', scale: 1 }, mother: { tex: 'reaver', scale: 2.6, tint: 0xc9a0ff }, tower: { tex: 'gunship', scale: 1.6, tint: 0xff9a3a }
};
const CAMP_REACH = { w: 2, alpha: 0.4, color: 0xffd37a }; // the ring that shows how far the point guns reach (CAMP.carrier.pdRange): its line width, how solid it is, its colour (it was 1 px at 0.16, too faint to find: 6-GEN and 8-GEN)
const CAMP_MOUNT = { base: 3.2, dot: 1.7, hot: 2.8, aim: [7, 11], width: [1.5, 2.2], flash: 10, flashScale: 0.9, stub: [6.5, 0x9aa0a8] }; // a turret mount, drawn on the hull (it is a third smaller since the carrier is): its dark base, its amber dot (and the dot while it fires), the length of the barrel at rest and on a shot, the barrel's width at rest and on a shot, and how far in front of the mount the muzzle flash is and how big (it was 1.3 on the 140 px carrier and hid the bow of the 98 px one), and the steel barrel a mount with nothing to shoot at points along the carrier's heading (its length and colour: without it a mount was a lit dot and read as a window, the blind critic)
const CAMP_BLIP = { gap: 70, flash: 90, freq: 700, step: 45, dur: 0.035, vol: 0.012, slide: -260 }; // a turret's shot: at most one blip in gap ms of the battle's clock, its pitch (freq, and step more for each fourth turret), length, loudness and slide; the muzzle flash lasts flash ms
const CAMP_ADDR = { used: false }; // the address (?campaign=N, src/title.js) opens the Campaign once per page load: coming back to the title from it must not open it again
const CAMP_RADAR = { x: W - 118, y: 118, r: 98, range: 6000, fill: 0.9, rim: [2, 0.8], blip: 1 }; // the radar's centre and radius on the screen, and the px of space it shows from the carrier to its edge

function campaignStart(s, level) { // the title's K: the level reached (or the highest built one)
  let n = level || campProgressLoad().level; while (n > 1 && !CAMP.levels[n]) n--;
  go(s, 'Campaign', { level: n });
}

class Campaign extends Phaser.Scene {
  constructor() { super('Campaign'); }
  init(d) { // d: { level, techs (instead of the saved ones: the address's), via, seed, god }
    d = d || {}; this.d0 = d; this.warped = !!d.warped; // the start's own data, for the warp cinematic to hand back (src/campwarp.js)
    this.level = d.level || 1; this.via = d.via || 'menu'; this.opts = { seed: d.seed, god: !!d.god, via: this.via };
    this.P = campProgressLoad(); if (Array.isArray(d.techs)) this.P.techs = d.techs.filter(t => CAMP.tech[t]);
    this.leaving = false; this.panel = false; this.mode = 'intro'; this.card = null; this.mp = null; this.shown = {};
  }
  create() {
    if (typeof campWarpDue === 'function' && campWarpDue(this)) return; // a level that warps in starts with the warp cinematic, which comes back here with warped: true (src/campwarp.js)
    const dark = this.warped ? 255 : 0; this.cameras.main.fadeIn(300, dark, dark, dark); // out of the warp's white flash, else out of black
    spaceBackdrop(this, true);
    this.boom = fxBoom(this);
    this.camp = this.makeCamp();
    this.sp = {}; this.bsp = []; this.bayAt = { launch: -1e9, land: -1e9 }; // the battle clock of the last launch and the last landing: the bays of the cruiser stay lit a moment after each (campBayLight)
    const pl = campPlaces(this.level); this.farObjs = {}; this.farAt = 0; Object.keys(pl).forEach(id => { if (!pl[id].hidden && !pl[id].far) this.drawPlace(pl[id]); }); // the far bodies of the system (Sol's planets) are made when the carrier comes near (syncFar)
    this.osp = {}; this.rsp = {}; this.beams = []; // the ore lying about (chunks and wrecks), one sprite each; the rocks of the belt, one each; the beams on this frame
    this.beamG = this.add.graphics().setDepth(3.5); // the cracks and the beams
    this.csp = this.camp.caches.map(k => this.add.image(k.x, k.y, 'pod').setScale(1.8).setDepth(3).setTint(0xffd37a)); // resource caches (level 2): gold pods that go when collected
    this.relicG = this.add.graphics().setDepth(2); // the relic's ring (level 2), and how far the hold has got
    this.cachel = this.camp.caches.map(k => label(this, k.x, k.y + 34, uiText('camp.nav.cachelabel'), '#ffd37a', 12)); // a word under each cache: gold pods were easy to miss (docs/night/graphics.md finding 3)
    if (this.camp.relic) label(this, this.camp.relic.x, this.camp.relic.y - CAMP.levels[this.level].relic.radius - 24, uiText('camp.nav.relicmark'), '#7fe9ff', 14);
    this.sync();
    this.cameras.main.startFollow(this.sp[this.camp.carrier.id], true, 0.12, 0.12);
    this.k = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(100);
    const t = (x, y, size, color) => this.add.text(x, y, '', uiFont(size, color, { stroke: '#02060d', strokeThickness: 3 })).setScrollFactor(0).setDepth(101);
    this.hud = { shield: t(252, 18, 14, '#7fe9ff'), ore: t(252, 52, 14, '#ffd37a'), hull: t(24, 18, 14, '#9fe9ff'), earth: t(24, 52, 14, '#9fe9ff'), bay: t(24, 86, 14, '#9fe9ff'), wave: t(24, 108, 14, '#ffd37a'), mother: t(W / 2 - 150, 18, 14, '#ff9ec0'), blink: t(24, 130, 14, '#7fe9ff'),
      obj: t(24, 152, 14, '#ffffff'), nav: t(24, 174, 14, '#7fe9ff'), arrow: t(0, 0, 13, '#ffd37a').setOrigin(0.5), keys: this.add.text(24, H - 44, uiText('camp.ui.keys'), uiFont(14, '#9fbdd1', { stroke: '#02060d', strokeThickness: 4 })).setScrollFactor(0).setDepth(100) };
    this.input.keyboard.on('keydown', e => this.onKey(e));
    if (typeof campMapInstall === 'function') campMapInstall(this); // Tab: the map of the level, over the battle, which goes on behind it (src/campmap.js, src/campmapdraw.js)
    this.showIntro();
  }
  beam(e, ms) { if (!this.beams) this.beams = []; this.beams.push({ x: e.x, y: e.y, tx: e.tx, ty: e.ty, until: performance.now() + ms }); } // (the beam hum is the sound card's: it reads C.lasers)
  makeCamp() { // a new battle of this level: arrived by the chain (or a retry), the ore and the extra ships of the refit come with the cruiser; a level started by itself (an address, a skip) has its own
    const carried = this.P.level === this.level;
    return campNew(this.level, this.P.techs, Object.assign({}, this.opts, carried ? { ore: this.P.ore, bonus: this.P.bonus } : {}));
  }
  drawPlace(p) { // returns what it made, so a far place can be taken down again (syncFar)
    const r = p.r || 60, made = [];
    const im = p.kind === 'star' && typeof starTexture === 'function'
      ? this.add.image(p.x, p.y, starTexture(this, p.star || 'G')).setScale(r / 48).setDepth(1).setBlendMode(Phaser.BlendModes.ADD) // a star: the corona and the hot core (src/art_world.js), its disc r px across
      : this.add.image(p.x, p.y, planetTexture(this, p.kind || 'rock', p.seed || 1)).setScale(r / 300).setDepth(1); if (p.tint) im.setTint(p.tint); // the place's own colour (CAMP.places tint): Mars is not grey like Luna
    made.push(im, label(this, p.x, p.y - r - 36, String(p.name).toUpperCase(), '#ffb454', 16));
    if (p.base) { made.push(this.add.image(p.x + 70, p.y - 60, 'station').setScale(0.16).setDepth(2), label(this, p.x + 70, p.y - 100, String(p.base).toUpperCase(), '#38e1ff', 13)); }
    return made;
  }
  // the far bodies of the system (CAMP.world, src/campsol.js): a picture only while the carrier is within CAMP.world.draw px of the edge of it, a few times a second
  syncFar(time) {
    if (!this.farObjs || time < this.farAt) return; this.farAt = time + 250;
    const pl = campPlaces(this.level), c = this.camp.carrier, near = CAMP.world.draw;
    Object.keys(pl).forEach(id => {
      const p = pl[id]; if (!p.far || p.hidden) return;
      const d = Math.hypot(p.x - c.x, p.y - c.y) - (p.r || 60) * (p.kind === 'star' ? 3 : 1), on = this.farObjs[id];
      if (d < near && !on) this.farObjs[id] = this.drawPlace(p);
      else if (d > near * 1.4 && on) { on.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); delete this.farObjs[id]; }
    });
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
  // the Earth refit after the belt: one of the three techs (pick again before Enter), and ore buys extra fighters and escorts for the next level (the workshop's prices)
  showRefit() {
    this.mode = 'refit'; this.choices = campTechChoices(this.level); this.refit = { pick: null, f: 0, e: 0, ore: Math.floor(this.camp.ore) }; this.paintRefit();
  }
  paintRefit() {
    const R = this.refit, B = CAMP.build, lines = [uiText('camp.ui.refitore', { ore: R.ore, xf: R.f, xe: R.e }), uiText('camp.ui.refitpick')]
      .concat(this.choices.map((id, i) => (i + 1) + '   ' + uiText('camp.tech.' + id + '.name') + '  -  ' + uiText('camp.tech.' + id + '.text') + (R.pick === id ? '   <' : '')), [uiText('camp.ui.refitbuy', { fc: B.fighterCost, ec: B.escortCost })]);
    this.showCard(uiText('camp.ui.refit'), lines, R.pick ? uiText('camp.ui.refitgot', { name: uiText('camp.tech.' + R.pick + '.name') }) : '', 380);
  }
  refitKey(c) {
    const R = this.refit, B = CAMP.build, i = { Digit1: 0, Digit2: 1, Digit3: 2 }[c];
    if (i !== undefined && this.choices[i]) R.pick = this.choices[i];
    else if (c === 'Digit4' && R.f < CAMP.refit.most && R.ore >= B.fighterCost) { R.f++; R.ore -= B.fighterCost; }
    else if (c === 'Digit5' && R.e < CAMP.refit.most && R.ore >= B.escortCost) { R.e++; R.ore -= B.escortCost; }
    else if (c === 'Enter' && R.pick) { campPick(this.P, R.pick); this.P.bonus = { fighters: R.f, escorts: R.e }; this.hideCard(); this.next(R.ore); return; }
    else return;
    this.paintRefit();
  }
  showLost(why) {
    this.mode = 'lost'; const lines = typeof campLoseLines === 'function' ? campLoseLines(this.camp, why) : [uiText('camp.lose.' + why)]; // src/camplose.js: what happened, how far, one thing to try
    this.showCard(uiText('camp.ui.lost', { n: this.level }), lines, uiText('camp.ui.retry')); this.say([lines[0]].concat(lines.slice(2))); // the numbers are for reading: the cause and the tip are said
  }
  showPause() { this.mode = 'pause'; this.showCard(uiText('camp.ui.pausetitle'), [uiText('camp.ui.pausegoal', { goal: campObjective(this.camp) }), uiText('camp.ui.pausemap')].concat([uiText('camp.ui.pausehelp')], typeof campDebugLine === 'function' ? [campDebugLine(this.camp)] : []), uiText('camp.ui.paused'), 322); } // the goal first (docs/night/ux.md 7), then the map and the help lines, then campDebugLine: the tune kit's one short line of its keys
  next(ore) { // after the story (and the pick, or the refit): the next level, or after the last one the end, with a new campaign waiting. ore: what is left to carry (the refit spent some)
    const last = !CAMP.levels[this.level + 1];
    this.P.level = last ? 1 : Math.max(this.P.level, this.level + 1); if (last) { this.P.techs = []; this.P.ore = 0; this.P.bonus = { fighters: 0, escorts: 0 }; }
    else { this.P.ore = ore != null ? ore : Math.floor(this.camp.ore); if (!CAMP.levels[this.level].refit) this.P.bonus = { fighters: 0, escorts: 0 }; } // the extras of a refit are for the level after it; a level that had none carries only ore
    campProgressSave(this.P);
    if (!last) { go(this, 'Campaign', { level: this.level + 1, via: 'next' }); return; }
    this.mode = 'end'; this.showCard(uiText('camp.ui.title'), [], uiText('camp.ui.end'), 200);
  }

  // ----- keys -----
  onKey(e) {
    if (e.repeat || this.leaving) return;
    const c = e.code, C = this.camp;
    if (this.mode === 'intro') { if (c === 'Enter') { this.hideCard(); this.mode = 'play'; } return; }
    if (this.mode === 'won') { if (c === 'Enter') { if (CAMP.levels[this.level].refit) this.showRefit(); else if (campTechChoices(this.level).length) this.showPick(); else this.next(); } return; }
    if (this.mode === 'refit') { this.refitKey(c); return; }
    if (this.mode === 'end') { if (c === 'Enter' || c === 'KeyT') go(this, 'Title'); return; }
    if (this.mode === 'pick') {
      const i = { Digit1: 0, Digit2: 1, Digit3: 2 }[c];
      if (i !== undefined && this.choices[i]) { campPick(this.P, this.choices[i]); this.hideCard(); this.next(); }
      return;
    }
    if (this.mode === 'lost') { if (c === 'Enter') go(this, 'Campaign', { level: this.level, techs: this.P.techs, via: 'retry' }); else if (c === 'KeyT') go(this, 'Title'); return; }
    if (this.mode === 'pause') { if (c === 'Escape') { this.hideCard(); this.mode = 'play'; } else if (c === 'KeyT') go(this, 'Title'); return; }
    if (c === 'Escape') { if (this.mp) campMapClose(this); else this.showPause(); return; } // Esc closes the map first; it never pauses while the map is open
    if (this.mp && typeof campMapKey === 'function' && campMapKey(this, c, e.shiftKey)) return; // the open map's list: W S choose, A D change group, Enter fly there (Shift+Enter fast), X clear (src/campmapdraw.js)
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

  // a turret fires (src/campaign.js says each shot with an event of its own): a flash at its muzzle, and a quiet blip, never more than one in CAMP_BLIP.gap ms of the battle's clock, so eight turrets rattle and do not pile up into noise
  turretFlash(e) {
    const C = this.camp, B = CAMP_BLIP, f = this.add.image(e.x + Math.cos(e.aim) * CAMP_MOUNT.flash, e.y + Math.sin(e.aim) * CAMP_MOUNT.flash, 'ember').setBlendMode('ADD').setTint(0xffe9a0).setScale(CAMP_MOUNT.flashScale).setDepth(7);
    this.tweens.add({ targets: f, alpha: 0, scale: CAMP_MOUNT.flashScale * 0.4, duration: B.flash, onComplete: () => f.destroy() });
    if (!(C.t - this.blipAt < B.gap)) { this.blipAt = C.t; beep(B.freq + (e.i % 4) * B.step, B.dur, 'square', B.vol, B.slide); }
  }
  fireMissile() { const r = campOrder(this.camp, 'missiles', '', 'key'); toast(this, r.say, r.ok ? '#9fe9ff' : '#ffb454'); }

  // ----- each frame -----
  update(time, dt) {
    spaceBackdropTick(this);
    const C = this.camp;
    if (this.mode === 'play' && !C.result) {
      const k = this.k, inp = C.input;
      // the autopilot (src/campnav.js, card space-game-campaign-navigate): while the map is open W A S D and the arrows are the list's, not the wheel's; with it closed any of them takes the wheel back
      const typing = typeof document !== 'undefined' && !!document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName); // the strip's own box: the letters typed there are not the wheel
      const wheel = !this.mp && !typing && [k.W, k.A, k.S, k.D, k.UP, k.DOWN, k.LEFT, k.RIGHT].some(x => x && x.isDown);
      if (wheel && C.nav && typeof campNavClear === 'function') campNavClear(C, 'key');
      if (!(C.nav && C.nav.on)) {
        if (this.mp) { inp.turn = 0; inp.thrust = 0; inp.brake = false; }
        else {
          inp.turn = ((k.D.isDown || k.RIGHT.isDown) ? 1 : 0) - ((k.A.isDown || k.LEFT.isDown) ? 1 : 0);
          inp.thrust = (k.W.isDown || k.UP.isDown) ? 1 : 0; inp.brake = k.S.isDown || k.DOWN.isDown;
        }
      }
      inp.fire = k.SPACE.isDown;
      campStep(C, Math.min(dt, 100) / 1000);
      if (typeof campNudge === 'function') { const nd = campNudge(C, this.shown); if (nd) toast(this, nd, '#9fe9ff'); } // the first-minute hints, once each (src/campnudge.js)
    }
    C.events.splice(0).forEach(e => this.onEvent(e));
    this.syncFar(time); this.syncRockets(Math.min(dt, 100)); this.syncBay();
    this.sync(); this.paintHud();
    if (this.mp) campMapPaint(this, time);
  }
  onEvent(e) {
    if (e.type === 'say') { const text = uiText(e.key, e.vars); toast(this, text, '#9fe9ff'); this.say([text]); }
    else if (e.type === 'nav') { toast(this, uiText(e.key, e.vars), '#7fe9ff'); if (e.key === 'camp.nav.go' || e.key === 'camp.nav.arrived') beep(e.key === 'camp.nav.go' ? 520 : 660, 0.07, 'triangle', 0.04, 160); } // the autopilot's own lines (src/campnav.js)
    else if (e.type === 'turret') { this.turretFlash(e); if (e.tx !== undefined) this.beam(e, 120); } // a turret shot at an alien is the same laser: a beam flash
    else if (e.type === 'laser') this.beam(e, e.src === 'turret' ? 220 : 90);
    else if (e.type === 'rockbreak') { this.boom.explode(16, e.x, e.y); beep(520, 0.09, 'triangle', 0.04, 260); }
    else if (e.type === 'boom') { this.boom.explode(e.big ? 90 : 26, e.x, e.y); sfx('boom'); if (e.kind === 'carrier') this.cameras.main.shake(400, 0.01); }
    else if (e.type === 'hit') { if (e.id === this.camp.carrier.id) { this.cameras.main.shake(90, 0.003); this.flash(e.id); } this.boom.explode(3, e.x, e.y); }
    else if (e.type === 'earthhit') this.boom.explode(6, e.x, e.y);
    else if (e.type === 'launch' || e.type === 'dock') { this.bayAt[e.type === 'launch' ? 'launch' : 'land'] = this.camp.t; beep(e.type === 'launch' ? 560 : 420, 0.07, 'triangle', 0.04, 160); }
    else if (e.type === 'alarm') { sfx('siren'); this.cameras.main.flash(300, 255, 60, 60); this.cameras.main.shake(300, 0.004); } // the ambush: out of the dark
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
    const key = look.art ? campShipTexture(this, look.art) : look.model && typeof shipPreviewTexture === 'function' ? shipPreviewTexture(this, look.model) : look.tex;
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
    this.camp.caches.forEach((k, i) => { this.csp[i].setVisible(!k.got); if (this.cachel && this.cachel[i]) this.cachel[i].setVisible(!k.got); });
    if (!this.osp) this.osp = {}; const seenOre = {}; // (made in create; a stand-in scene in a test has none)
    C.pickups.forEach(o => { // rocks are asteroids, a wreck's ore glows; a wreck blinks in its last seconds
      let im = this.osp[o.id];
      if (!im) { im = this.osp[o.id] = o.kind === 'rock' ? this.add.image(o.x, o.y, ['asteroid', 'asteroid2', 'asteroid3'][parseInt(String(o.id).split('-')[1], 10) % 3]).setDepth(2).setRotation(o.x) : this.add.image(o.x, o.y, 'ore').setDepth(3).setBlendMode('ADD').setScale(1.4); }
      if (o.kind === 'wreck') im.setAlpha(C.t - o.born > CAMP.ore.wreckLife - 6000 && Math.sin(C.t / 90) < 0 ? 0.3 : 1);
      seenOre[o.id] = true;
    });
    Object.keys(this.osp).forEach(id => { if (!seenOre[id]) { this.osp[id].destroy(); delete this.osp[id]; } });
    // the rocks of the belt: asteroids that glow where a laser is on them, redden and crack as they are cut (a broken one is gone: its chunk of ore lies there), with the beams on top
    if (!this.rsp) this.rsp = {}; const seenRock = {}, now = C.t, bg = this.beamG; if (bg) bg.clear();
    C.rocks.forEach(r => {
      let im = this.rsp[r.id];
      if (!im) im = this.rsp[r.id] = this.add.image(r.x, r.y, ['asteroid', 'asteroid2', 'asteroid3'][parseInt(String(r.id).split('-')[1], 10) % 3]).setDepth(2).setRotation(r.x).setScale(r.r * 2.4 / 64);
      const cut = Math.max(0, Math.min(1, 1 - r.hp / r.maxHp)), hot = now - r.cutAt < 160;
      im.setTint(hot ? 0xfff0b0 : cut > 0 ? (0xff << 16) | (Math.round(255 - 90 * cut) << 8) | Math.round(255 - 160 * cut) : 0xffffff).setRotation(r.x + (hot ? Math.sin(now / 25) * 0.04 : 0)); seenRock[r.id] = true;
      if (bg && cut > 0) { const n = 1 + Math.floor(cut * 4); bg.lineStyle(1.5, 0x2a1408, 0.9); for (let i = 0; i < n; i++) { const a = (parseInt(String(r.id).split('-')[1], 10) * 1.7 + i * 2.1), l = r.r * (0.5 + 0.5 * cut); bg.lineBetween(r.x + Math.cos(a) * 2, r.y + Math.sin(a) * 2, r.x + Math.cos(a) * l, r.y + Math.sin(a) * l + (i % 2 ? 3 : -3)); } } // the cracks
    });
    Object.keys(this.rsp).forEach(id => { if (!seenRock[id]) { this.rsp[id].destroy(); delete this.rsp[id]; } });
    if (bg && this.beams) { this.beams = this.beams.filter(b => b.until > performance.now()); this.beams.forEach(b => { // a beam: a soft wide line, a bright core, a hot spot where it lands. The same for a rock and an alien
      bg.lineStyle(7, 0x7fe9ff, 0.22).lineBetween(b.x, b.y, b.tx, b.ty); bg.lineStyle(2.5, 0xe8fbff, 0.95).lineBetween(b.x, b.y, b.tx, b.ty); bg.fillStyle(0xbff6ff, 0.8).fillCircle(b.tx, b.ty, 5); }); }
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
  // the bays of the cruiser: dimly lit in the picture, and bright while the wing leaves (the launch tubes, at the front of the pods) and while it comes home (the landing bays, at the back): the order to launch or recall can be seen on the ship
  syncBay() {
    const C = this.camp, c = C.carrier, B = CAMP_BAY;
    if (!this.bayG) { this.bayG = this.add.graphics().setDepth(5.2); this.bayGlow = this.add.graphics().setDepth(5.3).setBlendMode('ADD'); }
    const g = this.bayG, h = this.bayGlow; g.clear(); h.clear();
    if (!this.bayAt) this.bayAt = { launch: -1e9, land: -1e9 };
    const L = campBayLight(C, this.bayAt), bays = campArtBays('cruiser'), cs = Math.cos(c.rot), sn = Math.sin(c.rot), d = bays.half[0], w = bays.half[1];
    const pos = ([x, y]) => [c.x + cs * x - sn * y, c.y + sn * x + cs * y];
    const quad = (x, y, x1, x2, y1, y2) => [[x + x1, y + y1], [x + x2, y + y1], [x + x2, y + y2], [x + x1, y + y2]].map(([a, b]) => [c.x + cs * a - sn * b, c.y + sn * a + cs * b]); // a box in the carrier's frame, turned with it
    [['launch', bays.launch, -d, 0], ['land', bays.land, 0, d]].forEach(([k, at, x1, x2]) => {
      const lv = L[k]; if (lv <= 0) return;
      at.forEach(([x, y]) => {
        const q = quad(x, y, x1, x2, -w, w), m = quad(x, y, x1, x2, -w * 0.45, w * 0.45);
        g.fillStyle(B.color, B.slot * lv).fillPoints(q.map(([a, b]) => ({ x: a, y: b })), true); g.fillStyle(B.core, B.slot * lv).fillPoints(m.map(([a, b]) => ({ x: a, y: b })), true);
        const [gx, gy] = pos([x + (k === 'launch' ? 1 : -1), y]); B.halo.forEach(([r, a]) => h.fillStyle(B.color, a * lv).fillCircle(gx, gy, r));
      });
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
        const M = CAMP_MOUNT;
        mg.fillStyle(0x04101c, 0.9).fillCircle(tu.x, tu.y, M.base); mg.fillStyle(hot ? 0xffffff : 0xffd37a, 1).fillCircle(tu.x, tu.y, hot ? M.hot : M.dot);
        if (!tu.target) mg.lineStyle(M.width[0], M.stub[1], 0.95).lineBetween(tu.x, tu.y, tu.x + Math.cos(c.rot) * M.stub[0], tu.y + Math.sin(c.rot) * M.stub[0]); // nothing in reach: a steel barrel along the heading, so the mount reads as a gun and not as a lit window
        if (tu.target) mg.lineStyle(hot ? M.width[1] : M.width[0], hot ? 0xffe9a0 : 0xffd37a, hot ? 0.95 : 0.7).lineBetween(tu.x, tu.y, tu.x + Math.cos(tu.aim) * (hot ? M.aim[1] : M.aim[0]), tu.y + Math.sin(tu.aim) * (hot ? M.aim[1] : M.aim[0]));
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
    const pl = campPlaces(C.level); Object.keys(pl).forEach(id => { if (!pl[id].hidden && !(pl[id].far && Math.hypot(pl[id].x - c.x, pl[id].y - c.y) > R.range)) dot(pl[id], id === 'earth' ? 0x4aa3ff : 0xb9a37a, id === 'earth' ? 4 : 2); });
    C.rocks.forEach(o => dot(o, 0x8c8c8c, 1)); C.pickups.forEach(o => dot(o, 0xffd37a, 1)); C.caches.forEach(k => { if (!k.got) dot(k, 0xffd37a, 2); }); if (C.relic) dot(C.relic, 0x7fe9ff, 3);
    C.ships.forEach(u => { if (u.hp <= 0) return; dot(u, campDotColor(u), u.kind === 'mother' ? 4 : u.kind === 'carrier' ? 3 : 2); }); // campDotColor (src/campmap.js): the map's colours too
    // the autopilot's readout under the goal line, and an arrow at the edge of the screen pointing at the goal with its distance (src/campnav.js; docs/night/graphics.md finding 3)
    if (this.hud.nav) this.hud.nav.setText(C.nav ? uiText('camp.nav.hud', { name: C.nav.name, km: campNavKm(Math.hypot(C.nav.x - c.x, C.nav.y - c.y)) }) : '');
    if (this.hud.arrow) {
      const cam = this.cameras && this.cameras.main, ar = cam && typeof campNavArrow === 'function' && !this.mp ? campNavArrow(C, { x: cam.scrollX, y: cam.scrollY }, W, H) : null; // a stand-in scene in a test has no camera
      if (!ar) this.hud.arrow.setVisible(false);
      else {
        const a = ar.angle, tri = [{ x: ar.x + Math.cos(a) * 13, y: ar.y + Math.sin(a) * 13 }, { x: ar.x + Math.cos(a + 2.5) * 10, y: ar.y + Math.sin(a + 2.5) * 10 }, { x: ar.x + Math.cos(a - 2.5) * 10, y: ar.y + Math.sin(a - 2.5) * 10 }];
        g.fillStyle(0xffd37a, 0.95).fillPoints(tri, true); g.lineStyle(1, 0x02060d, 1).strokePoints(tri, true);
        this.hud.arrow.setVisible(true).setText(uiText('camp.nav.arrow', { name: ar.name, km: campNavKm(ar.dist) })).setPosition(Math.max(80, Math.min(W - 80, ar.x - Math.cos(a) * 64)), Math.max(14, Math.min(H - 14, ar.y - Math.sin(a) * 28)));
      }
    }
  }
}
