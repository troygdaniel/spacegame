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
// ---- the new title: direction A of docs/screens-mock.html, two doors (landing d of the new screens; card space-game-screens-d-title; Troy, 25 Nov 2026) ----
// Behind the screens switch (scrOn, src/screens.js: off by default). With it on the title is page panels over the canvas (src/scrhost.js): the name, two cards (the Campaign with where you are in it, Long Haul), and Settings
// as a chip at the top right; the canvas keeps the stars, the planet, the station and the ship that flies by. ONE key means something new here, Troy's own call (25 Nov 2026): the CAMPAIGN door is lit first, so Enter on the
// new title starts the Campaign (on today's title, the switch off, Long Haul is lit first and Enter starts Long Haul, as it always did). Enter still does the lit door, the arrows still move the light, K is still the
// Campaign, S Settings, H the keys page; the chips say it: the Enter chip is on the lit door, and Long Haul, which has no letter of its own, shows the arrows while it is not lit. a click on a card or on the chip does what its key does. Every chip is a role of the key table's screens group (src/data_controls.js: start, pick, door, settings); the words are scr.title.*
// (content/text/scrtitle.md). The bottom line of Long Haul keys is not drawn: those keys are on the H page and in Settings > Controls.
//   titleScrAt(P)          PURE: where the Campaign is: { n (the next mission, 1 to of), of (the missions of every level: 9), flown, frac (flown of them, 0 to 1) }
//   titleScrModel(P, sel)  PURE: what the screen shows: { lab, name, doors: [{ id, go, chips, name, sub, on, at?, meter? }], settings: { chip, label } }; sel is the lit choice (an index of TITLE_CHOICES)
//   titleScrFirst()        the choice lit when the new title opens: the Campaign's index in TITLE_CHOICES
const TITLE_SCR = { first: 'campaign', enter: 'pick', move: 'door', doors: [{ id: 'campaign', go: 'campaign', role: 'start', name: 'scr.title.camp.name', sub: 'scr.title.camp.sub' }, { id: 'long', go: 'longhaul', role: '', name: 'scr.title.long.name', sub: 'scr.title.long.sub' }], settings: 'settings', refit: 500 }; // first: the door lit when the title opens; enter: the role of the key that does the lit door; move: the role of the keys that move the light; the doors in the order they are drawn (the mock's: the Campaign first), each with the role of its own key ('' for Long Haul: it has none); refit: ms between two fits of the panels to the canvas
const titleScrFirst = () => Math.max(0, TITLE_CHOICES.findIndex(c => c.go === TITLE_SCR.first));
function titleScrAt(P) {
  const lv = typeof campHubLevels === 'function' ? campHubLevels() : [], count = l => (typeof campMissions === 'function' ? campMissions(l).length : 0), of = lv.reduce((a, l) => a + count(l), 0) || 9;
  const nx = typeof campHubNext === 'function' ? campHubNext(P) : { level: 1, i: 0 }, before = lv.filter(l => l < nx.level).reduce((a, l) => a + count(l), 0);
  const flown = Math.min(of, typeof campHubFlown === 'function' ? campHubFlown(P) : 0);
  return { n: Math.max(1, Math.min(of, before + nx.i + 1)), of, flown, frac: of ? flown / of : 0 };
}
function titleScrModel(P, sel) {
  const at = titleScrAt(P), lit = (TITLE_CHOICES[sel | 0] || TITLE_CHOICES[0]).go;
  return {
    lab: uiText('scr.title.lab'), name: uiText('scr.title.name'),
    doors: TITLE_SCR.doors.map(d => Object.assign({ id: d.id, go: d.go, chips: scrChips((d.role ? [d.role] : []).concat(d.go === lit ? [TITLE_SCR.enter] : d.role ? [] : [TITLE_SCR.move])), name: uiText(d.name), sub: uiText(d.sub + (d.go === 'campaign' && P && P.revealed ? '.r' : '')), on: d.go === lit },
      d.go === 'campaign' ? { at: uiText('scr.title.camp.at', { n: at.n, of: at.of }), meter: scrMeter(at.frac, { tone: 'good' }) } : {})),
    settings: { chip: scrChip(TITLE_SCR.settings), label: uiText('scr.title.settings') }
  };
}
class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.leaving = false; this.born = performance.now(); this.sel = 0; this.focusAt = -1e9;
    this.scr = !!(typeof scrOn === 'function' && scrOn() && typeof scrHostMount === 'function' && scrHostMount(this)); // the new title (two doors, page panels: titleScr below) while the screens switch is on and the page has a place for them
    if (this.scr === true) this.sel = titleScrFirst(); // the new title opens with the Campaign lit: Enter starts the Campaign (Troy, 25 Nov 2026); today's title keeps Long Haul
    if (this.events && this.events.on && typeof scrOn === 'function') { const want = scrOn(), flip = () => { if (!this.leaving && scrOn() !== want) this.scene.restart(); }; this.events.on('resume', flip); this.events.once('shutdown', () => this.events.off('resume', flip)); } // the switch was flipped in Settings: the title is made again in the other look
    if (typeof window !== 'undefined' && window.addEventListener && typeof document !== 'undefined') { // the window got its focus back: the keys of the next moments are the way back's (Alt+Tab), not a choice
      const back = () => { this.focusAt = performance.now(); }, vis = () => { if (!document.hidden) back(); };
      window.addEventListener('focus', back); document.addEventListener('visibilitychange', vis);
      if (this.events && this.events.once) this.events.once('shutdown', () => { window.removeEventListener('focus', back); document.removeEventListener('visibilitychange', vis); });
    }
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.s1 = this.add.tileSprite(0, 0, W, H, 'stars1').setOrigin(0);
    this.s2 = this.add.tileSprite(0, 0, W, H, 'stars2').setOrigin(0);
    const pl = this.add.image(1030, 790, 'planet').setScale(1.15);
    const st = this.add.image(230, 210, 'station').setScale(0.5).setAlpha(0.9);
    this.fillBack = [this.s1, this.s2, pl, st]; this.fillBg = null; this.fillSig = null; // the sky: on the whole window when the title has taken its shape (src/fillwindow.js)
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
    if (this.scr !== true) { // (the new title has its own name, in a panel)
    this.add.rectangle(W / 2, 214, 640, 2, CYAN, 0.7);
    this.add.rectangle(W / 2, 332, 640, 2, CYAN, 0.7);
    this.add.rectangle(W / 2 - 320, 214, 22, 2, AMBER, 1).setOrigin(0, 0.5);
    this.add.rectangle(W / 2 + 320, 332, 22, 2, AMBER, 1).setOrigin(1, 0.5);
    this.add.text(W / 2, 273, 'L O N G   H A U L', mono(70, '#38e1ff')).setOrigin(0.5).setPadding(40, 30, 40, 30).setShadow(0, 0, '#38e1ff', 22, false, true); // padding gives the glow room
    this.add.text(W / 2, 372, 'HALCYON STATION   >   KEPLER-4B', mono(18, '#ffb454')).setOrigin(0.5).setPadding(16, 12, 16, 12).setShadow(0, 0, '#ffb454', 8, false, true);
    }
    this.modeChoices(); // two choices, each a key and a click: Long Haul (Enter) and the Campaign (K); the arrows move the highlight, Enter does it
    if (this.scr !== true) this.add.text(W / 2, H - 34, 'W A S D move    E use    Esc pause    M mute    S settings    (V ship voice, C NPC chat, O mods: optional)    Up Down choose    K Campaign', mono(14, '#5b7a92')).setOrigin(0.5);
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
    if (this.scr === true) { this.titleScr(); return; } // the new title: two cards in page panels
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
    this.sel = i; if (this.scr === true) { this.titleScrLit(); return; }
    const b = this.choiceBox && this.choiceBox[i]; if (!b || !this.pick) return;
    this.pick.clear(); this.pick.lineStyle(2, b.color, 0.95); this.pick.strokeRoundedRect(b.left - 5, b.y - 5, b.w + 10, b.h + 10, 13);
  }
  // a small glass chip at the top right: [S] SETTINGS. A click opens Settings; it is not "press any key"
  settingsChip() {
    if (this.scr === true) return; // the new title made its own (titleScr)
    const label = this.add.text(0, 0, 'SETTINGS', uiFont(13, '#9fe9ff', { fontStyle: 'bold', letterSpacing: 1 })).setOrigin(0, 0.5), cap = keyCap(this, 'S', CYAN);
    const w = Math.ceil(label.width) + 30 + cap.kw + 8, h = 30, left = W - 28 - w, y = 8, g = this.add.graphics(); // above the Settings panel's top edge, so the chip never shows through it
    hudPanel(g, left, y, w, h, 8, 0.92, CYAN); g.setAlpha(0.8).setDepth(20);
    cap.setPosition(left + 15 + cap.kw / 2, y + h / 2).setDepth(21); label.setPosition(left + 15 + cap.kw + 8, y + h / 2).setDepth(21);
    const zone = this.add.zone(left + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on('pointerdown', () => settingsOpen(this, 'sound')); zone.on('pointerover', () => g.setAlpha(1)); zone.on('pointerout', () => g.setAlpha(0.8));
  }
  // the new title's panels (src/scrhost.js makes the pieces): built once; a click goes through the panels to a zone of the canvas laid under each card and under the chip (the root takes no click)
  titleScr() {
    const R = this.scrHost, el = scrHostEl, set = scrHostSet, P = typeof campProgressLoad === 'function' ? campProgressLoad() : null, M = titleScrModel(P, this.sel);
    const head = el(R, 'div', 'sc-abs sc-c sc-ctr'); set(head, 'left', '0'); set(head, 'right', '0'); set(head, 'top', '22%');
    set(el(R, 'div', 'sc-lab', head), 'text', M.lab); const name = el(R, 'div', 'sc-t1', head); set(name, 'fontSize', '4.2em'); set(name, 'letterSpacing', '.08em'); set(name, 'text', M.name);
    const row = el(R, 'div', 'sc-abs sc-r'); set(row, 'left', '50%'); set(row, 'top', '56%'); set(row, 'transform', 'translateX(-50%)'); set(row, 'gap', '1.4em');
    this.scrDoors = M.doors.map(d => {
      const card = el(R, 'div', 'sc-p sc-c', row), r1 = el(R, 'div', 'sc-r', card), o = { el: card, go: d.go, keys: el(R, 'span', 'sc-r', r1), sig: null }; set(card, 'width', '19em'); card.setAttribute('data-door', d.id); set(o.keys, 'gap', '.35em');
      set(el(R, 'span', 'sc-t2', r1), 'text', d.name); o.sub = el(R, 'div', 'sc-sm', card); set(o.sub, 'text', d.sub);
      if (d.at) { const r2 = el(R, 'div', 'sc-r', card); o.at = el(R, 'span', 'sc-lab', r2); set(o.at, 'text', d.at); o.meter = scrHostMeter(R, r2, d.meter).firstChild; }
      return o;
    });
    const st = el(R, 'div', 'sc-abs sc-r'); set(st, 'right', '1.4em'); set(st, 'top', '1.3em'); st.setAttribute('data-door', 'settings'); scrHostChip(R, st, M.settings.chip); set(el(R, 'span', 'sc-lab', st), 'text', M.settings.label);
    this.titleScrLit();
    const rr = R.root.getBoundingClientRect(), k = rr.width > 0 ? rr.width / W : 0; // a zone of the canvas under each thing a click may land on, in game px
    const zone = (node, pad, fn) => { if (!k) return; const b = node.getBoundingClientRect(), z = this.add.zone((b.left - rr.left + b.width / 2) / k, (b.top - rr.top + b.height / 2) / k, b.width / k + pad, b.height / k + pad).setInteractive({ useHandCursor: true }).setDepth(22); z.on('pointerdown', fn); };
    this.scrDoors.forEach(o => zone(o.el, 0, () => { if (o.go === 'campaign') campaignStart(this); else this.startLongHaul(); }));
    zone(st, 12, () => settingsOpen(this, 'sound'));
    if (this.events && this.events.on) { // Settings (and the screens it opens) pause the title and draw on the canvas: the panels step aside, and come back with the save as it is then (a reset)
      const away = () => set(R.root, 'visibility', 'hidden'), back = () => { if (this.scr === true && this.scrHost) { set(this.scrHost.root, 'visibility', ''); this.titleScrFresh(); } };
      this.events.on('pause', away); this.events.on('resume', back); this.events.once('shutdown', () => { this.events.off('pause', away); this.events.off('resume', back); });
    }
  }
  titleScrLit() { // the lit door, the one Enter does: its border, and the chips of both doors (the Enter chip goes with the light; made again only when they change)
    const R = this.scrHost, M = titleScrModel(null, this.sel); if (!R) return;
    (this.scrDoors || []).forEach(o => { const d = M.doors.find(x => x.go === o.go); if (!d) return; scrHostSet(o.el, 'borderColor', d.on ? 'var(--sc-ink)' : '');
      const sig = d.chips.map(c => c.id).join(); if (sig === o.sig) return; o.sig = sig; while (o.keys.lastChild) o.keys.removeChild(o.keys.lastChild); d.chips.forEach(c => scrHostChip(R, o.keys, c)); });
  }
  titleScrFresh() { // the Campaign card says where the save is now
    const P = typeof campProgressLoad === 'function' ? campProgressLoad() : null, M = titleScrModel(P, this.sel);
    (this.scrDoors || []).forEach(o => { const d = M.doors.find(x => x.go === o.go); if (!d) return; scrHostSet(o.sub, 'text', d.sub); if (o.at) { scrHostSet(o.at, 'text', d.at); scrHostSet(o.meter, 'width', d.meter.pct + '%'); } });
  }
  update(time, dt) {
    if (typeof fillSync === 'function') fillSync(this); // the title takes the window's shape while Fill the window is on (src/fillwindow.js): its layout stays in the 1280 by 720 safe area, the sky (this.fillBack) covers the window
    if (this.scr === true && this.scrHost) { // the panels follow the canvas (a window that changed size) and step aside for the keys page, which is drawn on the canvas
      if (time - (this.scrFitAt || 0) > TITLE_SCR.refit) { this.scrFitAt = time; scrHostMount(this); }
      scrHostSet(this.scrHost.root, 'visibility', typeof campKeysIsOpen === 'function' && campKeysIsOpen(this) ? 'hidden' : '');
    }
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
