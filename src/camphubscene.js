// ---------- Campaign: the hub scene, the ready room (card space-game-campaign-hub; Troy, 20 Nov 2026) ----------
// The room is Long Haul's own station hall (src/interior.js builds it: the baked floor, walls and props, the lights, the hologram desks, the repair arm, the hangar with its beacons and its bay door; the look
// of this station, src/stationlook.js style, is made here from the level's station in src/camphub.js). Nobody walks: the pilot stands at the desk of the row that is chosen (the Long Haul lounge's quick-go,
// station.js) and the cruiser stands on the pad. The rows, what each shows and the keys are src/camphub.js (pure, tests/camphub.mjs); this file draws them and sends the keys there.
//   Missions and Briefing and Rank are read at the mission desk (left), the Refit at the repair bay (middle), Launch at the pad (right). A dark glass panel lies over the lower deck: the five rows at the left,
//   the chosen row's page at the right, the amber line under the rows says what Enter does. The key line is in the south wall.
//   Launch rolls the bay door up and starts the Campaign scene on the next mission (via 'hub': the briefing was read here, so the scene does not show it again). A debrief comes back here (campaignscene.js).
const CAMP_HUBS = {
  panel: { x: 36, y: 440, w: 818, h: 232 },    // the glass over the lower deck of the hall: where it is and how big
  list: { x: 52, y: 478, w: 252, row: 34 },    // the five rows: the left edge, the top, the width, the height of a row
  pane: { x: 324, y: 476, w: 518, line: 15, lines: 12, col2: 262 }, // the page of the chosen row: its left edge and top, its width, the height of a line, how many lines, and where the second column starts
  foot: { x: 52, y: 654 },                     // the amber line: what Enter does
  keys: { x: 640, y: 696 },                    // the key line, in the south wall
  walk: { ms: 1.6, min: 260 },                 // the pilot's walk to a desk: ms for each px of the way (a brisk walk: 600 px a second), and the shortest walk in ms
  msg: 3200,                                   // ms a purchase's answer stays on the page
  cruiser: { x: 1090, y: 360, len: 190, name: 502 }, // the cruiser on the pad: where, how long it is drawn (nose up), and the y of its name under the pad's BAY 01
  stops: { board: [200, 246], brief: [236, 246], rank: [336, 312], refit: [640, 246], launch: [1028, 394] }, // where the pilot stands for each row: at the desk's front, in the open hall, at the pad
  face: { board: -1.5708, brief: -1.5708, rank: -1.5708, refit: -1.5708, launch: -0.5 } // which way the pilot looks there, in radians (the art looks east at 0): up at a desk, at the cruiser from the pad
};

class CampHub extends Phaser.Scene {
  constructor() { super('CampHub'); }
  init(d) { this.d = d || {}; this.leaving = false; }
  create() {
    this.P = campProgressLoad(); this.hub = campHubNew(this.P); this.msg = null; this.walls = [];
    const nx = campHubNext(this.P), st = campHubStation(nx.level), css = st.accent;
    this.look = { id: 'camp-hub', name: st.name, art: st.art, home: false, accent: parseInt(css.slice(1), 16), accentCss: css, pirate: false, // what src/stationlook.js answers for a dock: the hall's colour, and the desks in it (a mission desk and a repair bay, no bar, shop or pump)
      terminals: { missions: true, repair: true, shop: false, pump: false, bar: false }, barName: '', barLines: [], welcome: '' };
    this.accent = css;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    interiorBuild(this); // the hall (src/interior.js): needs this.look and this.walls, makes this.in
    this.pad();
    this.player = this.add.image(CAMP_HUBS.stops.board[0], CAMP_HUBS.stops.board[1], 'in-pilot0').setDepth(5); // the pilot (interiorTick turns it, rings it and tags it YOU)
    this.player.body = { speed: 0, destroy() {} }; // interiorTick reads the speed to swap the stride poses; the destroy is Phaser's, when the scene shuts down
    this.plates();
    this.build();
    this.keyFn = e => this.onKey(e); this.input.keyboard.on('keydown', this.keyFn);
    this.events.once('shutdown', () => { this.input.keyboard.off('keydown', this.keyFn); });
    this.paint(); this.stand(true);
  }

  // the cruiser on the pad, nose up, with its name under it
  pad() {
    const c = CAMP_HUBS.cruiser, art = CAMP_ART.cruiser, key = campShipTexture(this, 'cruiser');
    this.cruiser = this.add.image(c.x, c.y, key).setAngle(-90).setScale(c.len / (art.len * art.k)).setDepth(2.8);
    this.add.image(c.x + 8, c.y + 12, 'in-shadow').setAlpha(0.7).setScale(3.6, 4.6).setDepth(2.7);
    label(this, c.x, c.name, uiText('camp.hub.cruiser'), '#ffb454');
  }
  // the names of the desks, as the Long Haul hall has them: the mission desk, the repair bay (the refit) and the pad (launch)
  plates() {
    const T = n => uiText('camp.hub.row.' + n), col = this.accent;
    label(this, 200, 304, T('board'), col); label(this, 640, 304, T('refit'), '#6dff9c'); // under the pilot's YOU tag (y + 34 at a desk), which sat on a plate at 274
  }

  // ----- the glass: the five rows, the page, the foot and the key line -----
  build() {
    const Pn = CAMP_HUBS.panel, Li = CAMP_HUBS.list, Pg = CAMP_HUBS.pane, hex = parseInt(this.accent.slice(1), 16);
    this.glass = [this.add.rectangle(Pn.x + Pn.w / 2, Pn.y + Pn.h / 2, Pn.w, Pn.h, 0x04101c, 0.94).setStrokeStyle(1, hex, 0.9).setDepth(80)];
    this.titleT = this.add.text(Pn.x + 16, Pn.y + 12, '', uiFont(14, this.accent, { letterSpacing: 2 })).setDepth(81);
    this.lvT = this.add.text(Pn.x + Pn.w - 16, Pn.y + 12, '', uiFont(13, '#8fb4c9')).setOrigin(1, 0).setDepth(81);
    this.glass.push(this.add.rectangle(Pg.x - 12, Pn.y + 130, 1, 168, hex, 0.4).setDepth(81)); // the line between the rows and the page
    this.bar = this.add.rectangle(Li.x + Li.w / 2, Li.y + Li.row / 2, Li.w, Li.row - 2, 0xffb454, 0.16).setDepth(81); this.barEdge = this.add.rectangle(Li.x + 1, Li.y + Li.row / 2, 3, Li.row - 2, 0xffb454, 1).setDepth(82);
    this.rowT = campHubRows(this.P).map((r, k) => {
      const y = Li.y + k * Li.row;
      const cap = this.add.text(Li.x + 12, y + Li.row / 2, String(r.n), uiFont(14, '#02101c', { fontStyle: 'bold' })).setOrigin(0.5).setDepth(83).setBackgroundColor('#9fe9ff').setPadding(5, 1, 5, 1);
      const name = this.add.text(Li.x + 30, y + 3, '', uiFont(15, '#e8f6ff', { fontStyle: 'bold' })).setDepth(82), note = this.add.text(Li.x + 30, y + 20, '', uiFont(11, '#8fb4c9')).setDepth(82);
      const hit = this.add.rectangle(Li.x + Li.w / 2, y + Li.row / 2, Li.w, Li.row, 0xffffff, 0.001).setDepth(84).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.click(k));
      return { cap, name, note, hit };
    });
    this.footT = this.add.text(CAMP_HUBS.foot.x, CAMP_HUBS.foot.y, '', uiFont(13, '#ffb454')).setDepth(82);
    this.slots = {}; // the page's lines, made when first used: one Text for each column of each line
    this.add.rectangle(CAMP_HUBS.keys.x, CAMP_HUBS.keys.y, 560, 24, 0x04101c, 0.88).setDepth(89); // a dark band: the south wall's machines are busy behind a line of text
    this.keyT = this.add.text(CAMP_HUBS.keys.x, CAMP_HUBS.keys.y, campHubKeyLine(), uiFont(14, '#bfe9ff')).setOrigin(0.5).setDepth(90);
  }
  line(i, col, text, color, right) { // one line of the page: col 0 is the left column, 1 the second column; right: aligned to the page's right edge
    const k = i + ':' + col + (right ? 'r' : ''), Pg = CAMP_HUBS.pane;
    let t = this.slots[k];
    if (!t) t = this.slots[k] = this.add.text(right ? Pg.x + Pg.w : Pg.x + (col ? Pg.col2 : 0), Pg.y + i * Pg.line, '', uiFont(13, '#e8f6ff')).setOrigin(right ? 1 : 0, 0).setDepth(82);
    t.setText(text == null ? '' : String(text)).setColor(color || '#e8f6ff').setVisible(text != null && text !== '');
  }

  // everything on the glass from the state: rows, foot and the page of the chosen row
  paint() {
    const P = this.P, H = this.hub, Li = CAMP_HUBS.list, rows = campHubRows(P), id = CAMP_HUB.rows[H.row], nx = campHubNext(P);
    this.titleT.setText(uiText('camp.hub.title', { name: this.look.name.toUpperCase() })); this.lvT.setText(uiText('camp.hub.level', { n: nx.level, name: CAMP.levels[nx.level].name }));
    rows.forEach((r, k) => { const o = this.rowT[k]; o.name.setText(r.name).setColor(k === H.row ? '#ffffff' : '#cfefff'); o.note.setText(r.note).setColor(k === H.row ? '#ffd37a' : '#8fb4c9'); o.cap.setBackgroundColor(k === H.row ? '#ffb454' : '#9fe9ff'); });
    this.bar.setY(Li.y + H.row * Li.row + Li.row / 2); this.barEdge.setY(this.bar.y);
    this.footT.setText(campHubFoot(id));
    Object.keys(this.slots).forEach(k => this.slots[k].setVisible(false));
    ({ board: () => this.pageBoard(), brief: () => this.pageBrief(), refit: () => this.pageRefit(), rank: () => this.pageRank(), launch: () => this.pageLaunch() })[id]();
  }
  pageBoard() {
    const view = campHubBoardView(campHubBoard(this.P), CAMP_HUBS.pane.lines);
    view.forEach((r, i) => {
      if (r.head) { this.line(i, 0, uiText('camp.hub.level', { n: r.level, name: r.name }), '#38e1ff'); return; }
      const mark = { done: '[x]', next: '[>]', passed: '[-]', later: '[ ]' }[r.state], col = r.state === 'next' ? '#ffd37a' : r.state === 'later' ? '#6f8aa0' : '#e8f6ff';
      this.line(i, 0, '  ' + mark + ' ' + r.n + '  ' + r.title + '  (' + uiText('camp.hub.kind.' + r.kind) + ')', col);
      this.line(i, 0, r.state === 'next' ? uiText('camp.hub.next') : r.state === 'done' ? uiText('camp.hub.score', { score: r.score }) + (r.of ? '  ' + uiText('camp.hub.bonuses', { got: r.bonus, of: r.of }) : '') : '', r.state === 'next' ? '#ffb454' : '#9fe9ff', true);
    });
  }
  pageBrief() {
    const nx = campHubNext(this.P), b = campHubBrief(this.P, nx.level, nx.i); if (!b) return;
    this.line(0, 0, uiText('camp.hub.brief.head', { n: b.n, of: b.of, title: b.title }), '#38e1ff');
    this.line(1, 0, uiText('camp.hub.brief.kind', { kind: b.kindText, par: b.par }), '#8fb4c9');
    b.lines.forEach((l, i) => this.line(3 + i, 0, l, '#e8f6ff'));
    this.line(6, 0, uiText('camp.hub.brief.obj'), '#38e1ff'); b.objectives.slice(0, 4).forEach((o, i) => this.line(7 + i, 0, '- ' + o, '#e8f6ff'));
    this.line(6, 1, uiText('camp.ui.bonushead'), '#ffd37a'); b.bonus.slice(0, 4).forEach((x, i) => this.line(7 + i, 1, '+' + x.points + '  ' + x.text, '#ffd37a'));
    this.line(CAMP_HUBS.pane.lines - 1, 0, b.tries ? uiText('camp.hub.brief.best', { score: b.best, n: b.tries }) : uiText('camp.hub.brief.new'), '#8fb4c9');
  }
  pageRefit() {
    const r = campHubRefit(this.P); let i = 0;
    this.line(i++, 0, uiText('camp.hub.refit.head'), '#6dff9c');
    this.line(i++, 0, uiText('camp.hub.refit.ore', { ore: r.ore }), '#ffd37a');
    if (!r.techs.length) this.line(i++, 0, uiText('camp.hub.refit.notech'), '#8fb4c9'); else r.techs.slice(0, 4).forEach(t => this.line(i++, 0, (t.name + '  -  ' + t.text).slice(0, 66), '#e8f6ff'));
    this.line(i++, 0, uiText('camp.hub.refit.wing', { f: r.wing.fighters, e: r.wing.escorts }), '#e8f6ff');
    this.line(i++, 0, uiText('camp.hub.refit.extra', { xf: r.extra.fighters, xe: r.extra.escorts, most: r.most }), '#8fb4c9');
    i++; this.line(i++, 0, uiText('camp.hub.refit.buy', { fc: r.fc, ec: r.ec }), '#9fe9ff');
    if (this.msg && this.msg.until > this.time.now) this.line(i + 1, 0, this.msg.text, this.msg.ok ? '#6dff9c' : '#ffb454');
  }
  pageRank() {
    const r = campHubRank(this.P); let i = 0;
    this.line(i++, 0, uiText('camp.hub.rank.head'), '#38e1ff');
    if (r.ranked) { this.line(i++, 0, uiText('camp.hub.rank.name', { name: r.name, n: r.n, of: r.of }), '#ffd37a'); this.line(i++, 0, r.next != null ? uiText('camp.hub.rank.next', { to: r.nextName, next: r.next }) : uiText('camp.hub.rank.top'), '#8fb4c9'); }
    else this.line(i++, 0, uiText('camp.hub.rank.none'), '#8fb4c9');
    i++; this.line(i++, 0, uiText('camp.hub.rank.points', { points: r.points }), '#e8f6ff'); this.line(i++, 0, uiText('camp.hub.rank.flown', { n: r.flown, all: r.all }), '#e8f6ff');
    this.line(i++, 0, uiText('camp.hub.rank.wing', { f: r.wing.fighters, e: r.wing.escorts }), '#e8f6ff');
  }
  pageLaunch() {
    const nx = campHubNext(this.P), b = campHubBrief(this.P, nx.level, nx.i); if (!b) return; let i = 0;
    this.line(i++, 0, uiText('camp.hub.launch.head', { n: b.n, of: b.of, title: b.title }), '#ffd37a');
    b.lines.forEach(l => this.line(i++, 0, l, '#e8f6ff'));
    i++; if (nx.i === 0) this.line(i++, 0, uiText('camp.hub.launch.level', { n: nx.level, name: CAMP.levels[nx.level].name }), '#8fb4c9');
    this.line(i++, 0, uiText('camp.hub.launch.pad'), '#8fb4c9'); this.line(i++, 0, uiText('camp.hub.launch.go'), '#ffb454');
  }

  // the pilot walks to the desk of the chosen row (straight lines: the hall's doors are in line with the desks)
  stand(now) {
    const id = CAMP_HUB.rows[this.hub.row], to = CAMP_HUBS.stops[id], p = this.player, W_ = CAMP_HUBS.walk; if (!p) return;
    if (this.walk) { this.walk.stop(); this.walk = null; }
    const d = Math.hypot(to[0] - p.x, to[1] - p.y), face = CAMP_HUBS.face[id];
    if (now || d < 1) { p.setPosition(to[0], to[1]).setRotation(face); this.player.body.speed = 0; return; }
    p.setRotation(Math.atan2(to[1] - p.y, to[0] - p.x)); // the art looks east at rotation 0: it turns to walk
    this.player.body.speed = 100; // interiorTick swaps the stride poses while the body has speed
    this.walk = this.tweens.add({ targets: p, x: to[0], y: to[1], duration: Math.max(W_.min, d * W_.ms), ease: 'Sine.easeInOut', onComplete: () => { this.player.body.speed = 0; p.setRotation(face); this.walk = null; } });
  }

  // ----- the keys and the clicks -----
  onKey(e) {
    if (e.repeat || this.leaving) return;
    const r = campHubKey(this.hub, this.P, e.code); if (!r.used) return;
    if (e.preventDefault && (e.code === 'Backspace' || e.code === 'Tab')) e.preventDefault();
    this.apply(r);
  }
  click(k) { // a click on a row picks it; a second click on Launch launches
    if (this.leaving) return;
    if (k === this.hub.row && CAMP_HUB.rows[k] === 'launch') { this.apply({ used: true, action: 'launch', moved: false, changed: false, ok: true, say: null }); return; }
    this.hub.row = k; this.apply({ used: true, moved: true, action: '', changed: false, ok: true, say: null });
  }
  apply(r) {
    if (r.say) { this.msg = { text: uiText(r.say.key, r.say.vars), ok: r.ok, until: this.time.now + CAMP_HUBS.msg }; sfx(r.ok ? 'chime' : 'empty'); }
    if (r.changed) campProgressSave(this.P); // a purchase is kept at once
    if (r.moved) { sfx('tick'); this.stand(false); }
    this.paint();
    if (r.action === 'launch') this.launch(); else if (r.action === 'title') go(this, 'Title');
  }
  launch() {
    const d = campHubLaunch(this.P); sfx('dock'); if (typeof interiorLaunch === 'function') interiorLaunch(this); // the bay door rolls up as the cruiser goes
    go(this, 'Campaign', d);
  }
  update(time) {
    interiorTick(this, time);
    if (this.msg && this.msg.until <= time && CAMP_HUB.rows[this.hub.row] === 'refit' && !this.msg.gone) { this.msg.gone = true; this.paint(); } // the answer fades from the page
  }
}
