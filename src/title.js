// ---------- Title screen, and the faint speed streaks that show while boosting ----------
// the two choices of the title: the words (keys of content/text/title.md), the key cap's colour and the name's, and what the panel does
const TITLE_CHOICES = [
  { key: 'title.long.key', name: 'title.long.name', sub: 'title.long.sub', color: AMBER, css: '#ffb454', go: 'longhaul' },
  { key: 'title.camp.key', name: 'title.camp.name', sub: 'title.camp.sub', color: CYAN, css: '#38e1ff', go: 'campaign' }
];
// the keys of the title (card space-game-title-any-key; Troy, 21 Nov 2026: pretty much any key started Long Haul, Alt+Tab did it). A mode starts only on a choice: its own key (Long Haul keeps ENTER, the Campaign keeps K),
// or the arrows to move the highlight between the two and Enter to do the highlighted one (Long Haul is lit at first, so a plain Enter is Long Haul as it always was), or a click on its panel. A modifier key does nothing, a key held
// with Alt, Ctrl, Meta or Shift does nothing (Cmd+K, Ctrl+S, Alt+Enter), and nothing is taken in the first TITLE_KEYS.grace ms after the window gets focus back (the end of an Alt+Tab is not a choice).
const TITLE_KEYS = { grace: 600, enter: ['Enter', 'NumpadEnter'], prev: ['ArrowUp', 'ArrowLeft'], next: ['ArrowDown', 'ArrowRight'], other: { KeyH: 'help', KeyV: 'voice', KeyC: 'chat', KeyS: 'settings', KeyO: 'mods', KeyK: 'campaign' } };
// PURE. S: { sel: the highlighted choice (an index of TITLE_CHOICES), focusAt: ms the window last got focus back }; e: a keydown { code, repeat, altKey, ctrlKey, metaKey, shiftKey }; now: ms.
// -> { act, sel }: act is 'long', 'campaign', 'help', 'voice', 'chat', 'settings', 'mods' (what the key does), 'move' (the highlight goes to sel) or '' (nothing: every other key, M too, which the sound keeps)
function titleKeyAct(S, e, now) {
  const none = { act: '', sel: S.sel };
  if (!e || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return none;
  if (now - (S.focusAt == null ? -1e9 : S.focusAt) < TITLE_KEYS.grace) return none;
  if (TITLE_KEYS.enter.indexOf(e.code) >= 0) return { act: TITLE_CHOICES[S.sel].go === 'campaign' ? 'campaign' : 'long', sel: S.sel };
  const n = TITLE_CHOICES.length, step = TITLE_KEYS.prev.indexOf(e.code) >= 0 ? -1 : TITLE_KEYS.next.indexOf(e.code) >= 0 ? 1 : 0;
  if (step) return { act: 'move', sel: (S.sel + step + n) % n };
  const act = Object.prototype.hasOwnProperty.call(TITLE_KEYS.other, e.code) ? TITLE_KEYS.other[e.code] : '';
  return act ? { act, sel: S.sel } : none;
}
class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.leaving = false; this.born = performance.now(); this.sel = 0; this.focusAt = -1e9;
    if (typeof window !== 'undefined' && window.addEventListener && typeof document !== 'undefined') { // the window got its focus back: the keys of the next moments are the way back's (Alt+Tab), not a choice
      const back = () => { this.focusAt = performance.now(); }, vis = () => { if (!document.hidden) back(); };
      window.addEventListener('focus', back); document.addEventListener('visibilitychange', vis);
      if (this.events && this.events.once) this.events.once('shutdown', () => { window.removeEventListener('focus', back); document.removeEventListener('visibilitychange', vis); });
    }
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
    this.modeChoices(); // two choices, each a key and a click: Long Haul (Enter) and the Campaign (K); the arrows move the highlight, Enter does it
    this.add.text(W / 2, H - 34, 'W A S D move    E use    Esc pause    M mute    S settings    (V ship voice, C NPC chat, O mods: optional)    Up Down choose    K Campaign', mono(14, '#5b7a92')).setOrigin(0.5);
    this.settingsChip();

    const start = () => this.startLongHaul();
    if (typeof campAddrPlanPage === 'function' && !CAMP_ADDR.used) { // the tune kit (src/campaignaddr.js): ?campaign=N[&tech=a,b] opens the Campaign at that level; a line to say, if the address was not understood, is shown and the title carries on
      const plan = campAddrPlanPage();
      if (plan && plan.level) { CAMP_ADDR.used = true; this.leaving = true; this.scene.start('Campaign', { level: plan.level, techs: plan.techs, via: 'address' }); return; }
      if (plan && plan.say) toast(this, plan.say, '#ffd37a');
    }
    this.contentUi = contentTitleUi(this); // src/contentui.js: the content problems chip, its panel and the MODDED tag (nothing when all is well)
    this.input.keyboard.on('keydown', e => {
      if (typeof campKeysIsOpen === 'function' && campKeysIsOpen(this)) { campKeysKey(this, e.code); return; }
      if (e.repeat || this.contentUi.handleKey(e)) return;
      const r = titleKeyAct({ sel: this.sel, focusAt: this.focusAt }, e, performance.now()); // only a choice does anything (above): not any key, not a modifier, not a key held with one
      if (r.act === 'move') this.pickChoice(r.sel); else if (r.act === 'long') start(); else if (r.act === 'campaign') campaignStart(this);
      else if (r.act === 'help') { if (typeof campKeysToggle === 'function') campKeysToggle(this); } else if (r.act === 'voice') voiceOpenSetup(this); else if (r.act === 'chat') chatOpenSetup(this); else if (r.act === 'settings') settingsOpen(this, 'sound'); else if (r.act === 'mods') modsOpenSetup(this);
    }); // K opens the Campaign (src/campaignscene.js); while Settings is open the title is paused, so nothing starts the game; M still mutes (the sound's own key); S, V and C open Settings (src/settings.js) at Sound, the Deepgram key and the chat keys; O opens the Mods screen (src/mods.js)
    // (no click on the empty sky starts anything now: a click on a panel is that panel's, a click on the chip or the tag is theirs: card space-game-title-any-key)
  }
  startLongHaul() { // Enter on the Long Haul choice, or a click on its panel: the regular game, from the station
    if (this.leaving || performance.now() - this.born < 500) return;
    beep(520, 0.12, 'triangle', 0.05, 300); beep(780, 0.2, 'triangle', 0.04, 200);
    go(this, 'Station', { arrive: false });
  }
  // the two choices of the title (card space-game-title-modes): a glass panel each, a key cap, the name and one line of what it is; a click on a panel does what its key does.
  // The words are in content/text/title.md; where they go is TITLE_CHOICES (the key shown, the colour, the left edge of the panel, what it does).
  modeChoices() {
    const w = 380, h = 100, y = 462, mono = c => ({ fontFamily: 'monospace', fontSize: '28px', color: c, fontStyle: 'bold' });
    this.choiceBox = []; this.pick = this.add.graphics().setDepth(24); // the highlight: a thin frame round the choice Enter would do (the arrows move it)
    TITLE_CHOICES.forEach((c, i) => {
      const left = W / 2 + (i === 0 ? -w - 18 : 18), g = this.add.graphics(), cap = keyCap(this, uiText(c.key), c.color);
      this.choiceBox.push({ left, y, w, h, color: c.color });
      hudPanel(g, left, y, w, h, 10, 0.88, c.color); g.setAlpha(0.85).setDepth(20);
      cap.setPosition(left + 18 + cap.kw / 2, y + 22).setDepth(21);
      this.add.text(left + 18 + cap.kw + 12, y + 22, uiText(c.name), mono(c.css)).setOrigin(0, 0.5).setDepth(21);
      this.add.text(left + 18, y + 48, uiText(c.sub + (c.go === 'campaign' && typeof campProgressLoad === 'function' && campProgressLoad().revealed ? '.r' : '')), uiFont(13, '#9fbdd1', { wordWrap: { width: w - 36 }, lineSpacing: 3 })).setOrigin(0, 0).setDepth(21);
      const zone = this.add.zone(left + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
      zone.on('pointerdown', () => { if (c.go === 'campaign') campaignStart(this); else this.startLongHaul(); });
      if (c.go === 'campaign' && typeof campKeysToggle === 'function') { // H: the Campaign's page of every key, from this panel too (src/campkeys.js; card space-game-campaign-keys-help)
        const hk = this.add.text(left + w - 16, y + h - 10, uiText('title.camp.keys'), uiFont(12, '#ffb454')).setOrigin(1, 1).setDepth(23).setInteractive({ useHandCursor: true });
        hk.on('pointerdown', (p, lx, ly, e) => { if (e && e.stopPropagation) e.stopPropagation(); campKeysToggle(this); });
      }
      zone.on('pointerover', () => g.setAlpha(1)); zone.on('pointerout', () => g.setAlpha(0.85));
    });
    this.pickChoice(this.sel || 0);
  }
  pickChoice(i) { // the highlight goes to choice i
    this.sel = i; const b = this.choiceBox && this.choiceBox[i]; if (!b || !this.pick) return;
    this.pick.clear(); this.pick.lineStyle(2, b.color, 0.95); this.pick.strokeRoundedRect(b.left - 5, b.y - 5, b.w + 10, b.h + 10, 13);
  }
  // a small glass chip at the top right: [S] SETTINGS. A click opens Settings; it is not "press any key"
  settingsChip() {
    const label = this.add.text(0, 0, 'SETTINGS', uiFont(13, '#9fe9ff', { fontStyle: 'bold', letterSpacing: 1 })).setOrigin(0, 0.5), cap = keyCap(this, 'S', CYAN);
    const w = Math.ceil(label.width) + 30 + cap.kw + 8, h = 30, left = W - 28 - w, y = 8, g = this.add.graphics(); // above the Settings panel's top edge, so the chip never shows through it
    hudPanel(g, left, y, w, h, 8, 0.92, CYAN); g.setAlpha(0.8).setDepth(20);
    cap.setPosition(left + 15 + cap.kw / 2, y + h / 2).setDepth(21); label.setPosition(left + 15 + cap.kw + 8, y + h / 2).setDepth(21);
    const zone = this.add.zone(left + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on('pointerdown', () => settingsOpen(this, 'sound')); zone.on('pointerover', () => g.setAlpha(1)); zone.on('pointerout', () => g.setAlpha(0.8));
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
