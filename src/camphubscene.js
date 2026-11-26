// ---------- Campaign: the hub scene, the ready room (card space-game-campaign-hub; Troy, 20 Nov 2026) ----------
// The room is Long Haul's own station hall (src/interior.js builds it: the baked floor, walls and props, the lights, the hologram desks, the repair arm, the hangar with its beacons and its bay door; the look
// of this station, src/stationlook.js style, is made here from the level's station in src/camphub.js). Nobody walks: the pilot stands at the desk of the row that is chosen (the Long Haul lounge's quick-go,
// station.js) and the cruiser stands on the pad. The rows, what each shows and the keys are src/camphub.js (pure, tests/camphub.mjs); this file draws them and sends the keys there.
//   Missions and Rank are read at the mission desk (left), the Refit at the repair bay (middle), Launch at the pad (right). A dark glass panel lies over the lower deck: the four rows at the left, a sentence
//   or two about the chosen row at the right (what it is and what can be done there), the amber line under the rows says what Enter does. The key line is in the south wall.
//   ENTER OPENS THE ROW as an OVERLAY that takes the top of the screen (card space-game-ready-room-simple; Troy, 21 Nov 2026): the missions with the chosen one's briefing beside them, the refit's choices each with
//   what it changes (the numbers), its cost and what you have, the rank and the ranks above it. Up Down move in it, Enter does the thing, Left or Esc closes it. A dock's room has no overlays (its rows keep their pages).
//   Launch rolls the bay door up and starts the Campaign scene on the next mission (via 'hub': the briefing was read here, so the scene does not show it again). A debrief comes back here (campaignscene.js).
//   THE ROOM IS DATA (src/camphub.js has the rows: CAMP_HUB.note, .act, .rowKey): this file has the rest, by row id: CAMP_HUBS.page[id] (draws the row's page), .stops[id] and .face[id] (where the pilot stands), and
//   CAMP_HUBS.run[action] (what an action does). The scene is started with data { rows: [ids], at: id, station: { name, accent, art }, onLaunch(scene), onLeave(scene) }: a dock at an outpost (card
//   space-game-campaign-outposts) registers its rows (build, repair ...) with their pages, and opens the same room with them; what it passes replaces the defaults, and nothing it leaves out is needed.
const CAMP_HUBS = {
  panel: { x: 36, y: 440, w: 818, h: 232 },    // the glass over the lower deck of the hall: where it is and how big
  list: { x: 52, y: 478, w: 252, row: 34, room: 170 }, // the rows: the left edge, the top, the width, the height of a row, and the height they all share (five rows of 34)
  pane: { x: 324, y: 476, w: 518, line: 15, lines: 12, col2: 262 }, // the page of the chosen row: its left edge and top, its width, the height of a line, how many lines, and where the second column starts
  foot: { x: 52, y: 654 },                     // the amber line: what Enter does
  keys: { x: 640, y: 696 },                    // the key line, in the south wall
  walk: { ms: 1.6, min: 260 },                 // the pilot's walk to a desk: ms for each px of the way (a brisk walk: 600 px a second), and the shortest walk in ms
  msg: 3200,                                   // ms a purchase's answer stays on the page
  cruiser: { x: 1090, y: 360, len: 190, name: 502 }, // the cruiser on the pad: where, how long it is drawn (nose up), and the y of its name under the pad's BAY 01
  over: { x: 36, y: 24, w: 1208, h: 408, pad: 20, top: 46, line: 18, col2: 640, hint: 26, lines: 16 }, // the overlay: the glass at the top of the screen, the room inside it (from the left and from the top), a line's height, where the second column starts, how far above its bottom the hint stands, and how many lines of the missions it lists (each has a click zone)
  stops: { board: [200, 246], rank: [336, 312], refit: [640, 246], launch: [1028, 394] }, // where the pilot stands for each row: at the desk's front, in the open hall, at the pad
  face: { board: -1.5708, rank: -1.5708, refit: -1.5708, launch: -0.5 } // which way the pilot looks there, in radians (the art looks east at 0): up at a desk, at the cruiser from the pad
};

// a save from an older version (missions before the next one with no result) is told so ONCE: true the first time the ready room meets one, never again. The flag is a key of its own beside the save, not a key of it
function campHubOldNote(P) {
  if (!campHubOldSave(P)) return false; const key = CAMP.store + '.oldsave'; let seen = false;
  campTry(() => { seen = localStorage.getItem(key) === '1'; if (!seen) localStorage.setItem(key, '1'); }, 0);
  return !seen;
}

// The next level's planets are painted while the ready room is open, one a timer tick, so the level starts without painting them: planetTexture (src/art_world.js) keeps each one, and the Campaign scene's create() finds
// them there. Painted inside create() they cost 373 ms of one frame on level 1, the one dip in Troy's play logs (docs/PERF.md; card space-game-cloud-followups, from the cloud session's note on pull request 5). A mission
// picked on the board from another level, or a level started with no room (a retry, an address), finds none cached and paints them as before. Returns how many it will paint.
function campHubWarm(sc, level) {
  if (!sc || !sc.time || typeof sc.time.delayedCall !== 'function' || typeof planetTexture !== 'function' || typeof campPlaces !== 'function') return 0;
  if (typeof campWorldOn === 'function' && campWorldOn()) return 0; // the world look (card space-game-world-w2-planets): a flat disc paints in a few ms at the level's start, there is nothing slow to do early
  const pl = campPlaces(level) || {}, near = Object.keys(pl).map(id => pl[id]).filter(p => p && !p.hidden && !p.far && p.kind !== 'star').slice(0, 5); // the ones the scene draws at its start (drawPlace), no more than the cache keeps
  near.forEach((p, i) => sc.time.delayedCall(600 + 160 * i, () => { if (!sc.leaving) campTry(() => planetTexture(sc, p.kind || 'rock', p.seed || 1), 0); })); // after the fade-in, a frame or more apart; a scene that is left takes its timers with it
  return near.length;
}

// THE NEW LOOK (piece c of the new screens, card space-game-screens-c-hub; src/scrhub.js says what is shown, src/scrhubdraw.js draws it over the room): while CAMP.flags.screens is on, the glass, the rows, the pages and the overlays
// of the canvas (every object at depth 80 to 90) are hidden and the hangar is dimmed; the next-mission card, the refit, the rank and the mission pick are page panels instead. The keys are campHubKey's, as ever, and a click on a tile
// is clickMission or click. True when the room was painted that way; false when it is the canvas's turn (the switch is off, a dock's room, or there is no page). A function and not a method, with the switch asked first: a stand-in
// scene of a test has only the functions it needs.
function campHubNewLook(sc) {
  const on = typeof scrOn === 'function' && scrOn() && !(sc.d && sc.d.dock) && typeof scrHubPaint === 'function';
  if (!on) { if (sc.scrHubOn === true) campHubOldLook(sc); return false; }
  const msg = sc.msg && sc.time && sc.msg.until > sc.time.now && sc.msg.over === (sc.hub.open || '') ? { text: sc.msg.text, ok: sc.msg.ok } : null;
  if (!scrHubPaint(sc, scrHubModel(sc.P, sc.hub, { station: String(sc.look && sc.look.name || ''), msg, oldNote: !!sc.oldNote && campHubOldSave(sc.P) }))) { if (sc.scrHubOn === true) campHubOldLook(sc); return false; }
  if (sc.scrHubOn !== true) {
    sc.scrHubOn = true;
    (sc.children && sc.children.list ? sc.children.list : []).forEach(o => { if (o.depth >= 80 && o.depth <= 90 && typeof o.setVisible === 'function') o.setVisible(false); }); // the glass, the rows, the pages, the overlay and its click zones, the key line
    campHubHideNames(sc);
    if (!sc.scrVeil && sc.add && typeof sc.add.rectangle === 'function') sc.scrVeil = sc.add.rectangle(W / 2, H / 2, W, H, 0x02060d, 0.78).setDepth(79); // the hangar stays, dimmed
    if (sc.scrVeil) sc.scrVeil.setVisible(true);
    if (sc.events && typeof sc.events.once === 'function') sc.events.once('shutdown', () => { sc.scrHubOn = false; });
  }
  return true;
}
function campHubHideNames(sc) { // the hangar's own words (MISSIONS, HANGAR 1, the station's name, BAY 01 THE CRUISER, the YOU tag) are canvas text under the panels: hidden while the new look is up (card space-game-screens-batch-fixes)
  (sc.children && sc.children.list ? sc.children.list : []).forEach(o => { if (o && o.type === 'Text' && o.depth < 79 && o.visible && typeof o.setVisible === 'function') { o.setVisible(false); (sc.scrNamesHidden = sc.scrNamesHidden || []).push(o); } });
}
function campHubOldLook(sc) { // the switch went off in the middle of the room: the canvas's own glass comes back (the paint that follows sets what each line shows)
  sc.scrHubOn = false; if (typeof scrHubDrop === 'function') scrHubDrop(sc);
  (sc.children && sc.children.list ? sc.children.list : []).forEach(o => { if (o.depth >= 80 && o.depth <= 90 && typeof o.setVisible === 'function') o.setVisible(true); });
  if (sc.scrVeil) sc.scrVeil.setVisible(false);
  (sc.scrNamesHidden || []).forEach(o => { if (o && o.active !== false && typeof o.setVisible === 'function') o.setVisible(true); }); sc.scrNamesHidden = [];
}

class CampHub extends Phaser.Scene {
  constructor() { super('CampHub'); }
  init(d) { this.d = d || {}; this.leaving = false; } // d: the scene data above (all of it optional)
  create() {
    if (typeof campTuneLoadOnce === 'function') campTuneLoadOnce(); // the tuning panel's overrides (src/camptune.js): read once per page, before anything here reads the CAMP table
    this.P = this.d.P || campProgressLoad(); if (typeof campReveal === 'function') campReveal(!!this.P.revealed); // after the ending has been seen, level 3 is the outpost on the board too (the Campaign scene did this only when it began: a page loaded after the ending showed the old name)
    this.hub = campHubNew(this.P, { rows: this.d.rows, at: this.d.at }); this.oldNote = !this.d.dock && campHubOldNote(this.P); this.msg = null; this.walls = []; // a dock hands in the Campaign scene's own progress, so what is bought there is not overwritten at the debrief
    const nx = campHubNext(this.P), st = Object.assign({}, campHubStation(nx.level, nx.i), this.d.station && typeof this.d.station === 'object' ? this.d.station : {}), css = /^#[0-9a-f]{6}$/i.test(st.accent) ? st.accent : campHubStation(nx.level).accent;
    this.look = { id: 'camp-hub', name: String(st.name), art: st.art, home: false, accent: parseInt(css.slice(1), 16), accentCss: css, pirate: false, // what src/stationlook.js answers for a dock: the hall's colour, and the desks in it (a mission desk and a repair bay, no bar, shop or pump)
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
    campHubWarm(this, nx.level); // the planets of the level to come, painted while the room is up
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
    const rh = this.rowH = Math.min(Li.row, Math.floor(CAMP_HUBS.list.room / this.hub.rows.length)); // a room with more rows than five has them closer
    this.bar = this.add.rectangle(Li.x + Li.w / 2, Li.y + rh / 2, Li.w, rh - 2, 0xffb454, 0.16).setDepth(81); this.barEdge = this.add.rectangle(Li.x + 1, Li.y + rh / 2, 3, rh - 2, 0xffb454, 1).setDepth(82);
    this.rowT = campHubRows(this.P, this.hub.rows).map((r, k) => {
      const y = Li.y + k * rh, Lr = rh;
      const cap = this.add.text(Li.x + 12, y + Lr / 2, String(r.n), uiFont(14, '#02101c', { fontStyle: 'bold' })).setOrigin(0.5).setDepth(83).setBackgroundColor('#9fe9ff').setPadding(5, 1, 5, 1);
      const name = this.add.text(Li.x + 30, y + 3, '', uiFont(15, '#e8f6ff', { fontStyle: 'bold' })).setDepth(82), note = this.add.text(Li.x + 30, y + 20, '', uiFont(11, '#8fb4c9')).setDepth(82);
      const hit = this.add.rectangle(Li.x + Li.w / 2, y + Lr / 2, Li.w, Lr, 0xffffff, 0.001).setDepth(84).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.click(k));
      return { cap, name, note, hit };
    });
    this.footT = this.add.text(CAMP_HUBS.foot.x, CAMP_HUBS.foot.y, '', uiFont(13, '#ffb454')).setDepth(82);
    this.slots = {}; // the page's lines, made when first used: one Text for each column of each line
    this.add.rectangle(CAMP_HUBS.keys.x, CAMP_HUBS.keys.y, 640, 24, 0x04101c, 0.88).setDepth(89); // a dark band: the south wall's machines are busy behind a line of text
    this.keyT = this.add.text(CAMP_HUBS.keys.x, CAMP_HUBS.keys.y, campHubKeyLine(!!(this.d && this.d.dock)), uiFont(14, '#bfe9ff')).setOrigin(0.5).setDepth(90);
    const O = CAMP_HUBS.over; // the overlay, made once and shown when a row is opened: the glass over the top of the screen, its title, a bar behind the refit's choice, and its lines (made when first used)
    this.ovGlass = this.add.rectangle(O.x + O.w / 2, O.y + O.h / 2, O.w, O.h, 0x04101c, 0.97).setStrokeStyle(1, hex, 0.9).setDepth(86);
    this.ovTitle = this.add.text(O.x + O.pad, O.y + 12, '', uiFont(16, this.accent, { letterSpacing: 2 })).setDepth(87);
    this.ovBar = this.add.rectangle(O.x + O.w / 2, O.y + O.top, O.w - 2 * O.pad + 12, O.line * 2 + 6, 0xffb454, 0.14).setDepth(86.5);
    this.ovSlots = {}; this.ovShow(false);
    // the mouse on the missions list (card space-game-click-mission): a clear zone over each line the list can have, shown only on the lines a mission the cursor can stand on is drawn on (zonesPaint), each with the hand; and one faint bar under the line the pointer is on
    const zl = O.x + O.pad - 6, zw = O.col2 - 60 - 2 * O.pad + 12; // from a little left of the text to a little past the rank at its right
    this.mHits = []; this.hov = -1;
    for (let k = 0; k < O.lines; k++) {
      const z = this.add.rectangle(zl + zw / 2, O.y + O.top + k * O.line + O.line / 2, zw, O.line, 0xffffff, 0.001).setDepth(88).setInteractive({ useHandCursor: true }); z.cur = -1; z.setVisible(false);
      z.on('pointerdown', () => this.clickMission(z.cur)); z.on('pointerover', () => this.hoverMission(z.cur)); z.on('pointerout', () => this.hoverMission(-1, z.cur));
      this.mHits.push(z);
    }
    this.ovHover = this.add.rectangle(zl + zw / 2, O.y + O.top + O.line / 2, zw, O.line, 0xffffff, 0.08).setDepth(86.5).setVisible(false);
  }
  ovShow(on) { this.ovGlass.setVisible(on); this.ovTitle.setVisible(on); this.ovBar.setVisible(false); Object.keys(this.ovSlots).forEach(k => this.ovSlots[k].setVisible(false)); }
  ovLine(i, x, text, color, right) { // one line of the overlay: i the line, x from the left of its room (the glass's right edge when right: aligned to it), the text and its colour
    const O = CAMP_HUBS.over, k = i + ':' + x + (right ? 'r' : '');
    let t = this.ovSlots[k];
    if (!t) t = this.ovSlots[k] = this.add.text(right ? O.x + x : O.x + O.pad + x, O.y + O.top + i * O.line, '', uiFont(14, '#e8f6ff')).setOrigin(right ? 1 : 0, 0).setDepth(87);
    t.setText(text == null ? '' : String(text)).setColor(color || '#e8f6ff').setVisible(text != null && text !== '');
  }
  wrap(text, max) { // a sentence or two in lines of at most max characters
    const out = []; let cur = '';
    String(text).split(' ').forEach(w => { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push(cur); return out;
  }
  line(i, col, text, color, right) { // one line of the page: col 0 is the left column, 1 the second column; right: aligned to the page's right edge
    const k = i + ':' + col + (right ? 'r' : ''), Pg = CAMP_HUBS.pane;
    let t = this.slots[k];
    if (!t) t = this.slots[k] = this.add.text(right ? Pg.x + Pg.w : Pg.x + (col ? Pg.col2 : 0), Pg.y + i * Pg.line, '', uiFont(13, '#e8f6ff')).setOrigin(right ? 1 : 0, 0).setDepth(82);
    t.setText(text == null ? '' : String(text)).setColor(color || '#e8f6ff').setVisible(text != null && text !== '');
  }

  // everything on the glass from the state: rows, foot and the page of the chosen row
  paint() {
    if (campHubNewLook(this)) return; // the new look draws the room as page panels (above)
    const P = this.P, H = this.hub, Li = CAMP_HUBS.list, rows = campHubRows(P, H.rows, Object.assign({}, this.d, { hub: H })), id = H.rows[H.row], nx = campHubNext(P);
    this.titleT.setText(uiText('camp.hub.title', { name: this.look.name.toUpperCase() })); this.lvT.setText(uiText('camp.hub.level', { n: nx.level, name: CAMP.levels[nx.level].name }));
    rows.forEach((r, k) => { const o = this.rowT[k]; o.name.setText(r.name).setColor(k === H.row ? '#ffffff' : '#cfefff'); o.note.setText(r.note).setColor(k === H.row ? '#ffd37a' : '#8fb4c9'); o.cap.setBackgroundColor(k === H.row ? '#ffb454' : '#9fe9ff'); });
    this.bar.setY(Li.y + H.row * this.rowH + this.rowH / 2); this.barEdge.setY(this.bar.y);
    const open = !this.d.dock && H.open && CAMP_HUBS.overlay[H.open] ? H.open : '';
    this.footT.setText(open ? uiText('camp.room.foot.close') : campHubFoot(id, this.d));
    Object.keys(this.slots).forEach(k => this.slots[k].setVisible(false));
    const page = !this.d.dock && CAMP_HUBS.desc[id] ? s => s.pageDesc(id) : CAMP_HUBS.page[id]; if (page) page(this); // a dock's rows keep their pages; the hall's rows say in a sentence or two what they are (the overlay has the rest)
    this.ovShow(!!open); if (open) { this.ovTitle.setText(uiText('camp.hub.row.' + open)); CAMP_HUBS.overlay[open](this); }
    this.zonesPaint(open === 'board'); // the click zones follow the list
  }
  pageDesc(id) { // the sentence or two about the chosen row (Launch names the mission, or the replay it flies), and under it, once, what an older save means
    const P = this.P, t = campHubTarget(P, this.hub), b = id === 'launch' ? campHubBrief(P, t.level, t.i) : null;
    const lines = this.wrap(uiText(id === 'launch' && t.replay && !t.skipped ? 'camp.room.desc.replay' : 'camp.room.desc.' + id, b ? { n: b.n, of: b.of, title: b.title } : {}), 62); lines.forEach((l, i) => this.line(i, 0, l, '#e8f6ff'));
    if (this.oldNote && campHubOldSave(P)) this.wrap(uiText('camp.hub.oldsave'), 62).forEach((l, i) => this.line(lines.length + 1 + i, 0, l, '#ffb454')); // "This save is from an older version..."
  }
  pageBoard() {
    const H = this.hub, sel = campHubSelectable(this.P), legend = sel.length > 0 && !(this.d && this.d.dock), pk = H.pick;
    if (sel.length) H.cur = Math.max(0, Math.min(sel.length - 1, H.cur | 0));
    const cur = legend ? sel[H.cur] : null, view = campHubBoardView(campHubBoard(this.P), CAMP_HUBS.pane.lines - (legend ? 1 : 0));
    view.forEach((r, i) => {
      if (r.head) { this.line(i, 0, uiText('camp.hub.level', { n: r.level, name: r.name }), '#38e1ff'); return; }
      const isCur = !!(cur && r.level === cur.level && r.i === cur.i), isPick = !!(pk && r.level === pk.level && r.i === pk.i);
      const mark = isPick ? '[R]' : { done: '[x]', next: '[>]', passed: '[-]', later: '[ ]' }[r.state], col = isPick ? '#6dff9c' : isCur ? '#ffffff' : r.state === 'next' ? '#ffd37a' : r.state === 'later' ? '#6f8aa0' : '#e8f6ff';
      this.line(i, 0, (isCur ? '> ' : '  ') + mark + ' ' + r.n + '  ' + r.title + '  (' + uiText('camp.hub.kind.' + r.kind) + ')', col); // the cursor: > on a mission done or the next one; Enter or R opens its briefing, and a mission done is then the replay ([R])
      this.line(i, 0, r.state === 'next' ? uiText('camp.hub.next') : r.state === 'done' ? uiText('camp.hub.score', { score: r.score }) + (r.of ? '  ' + uiText('camp.hub.bonuses', { got: r.bonus, of: r.of }) : '') + (r.rank ? '  ' + r.rank : '') : '', isPick ? '#6dff9c' : r.state === 'next' ? '#ffb454' : '#9fe9ff', true);
    });
    if (legend) { const m = this.msg && this.msg.until > this.time.now && this.hub.rows[this.hub.row] === 'board' ? this.msg : null; this.line(CAMP_HUBS.pane.lines - 1, 0, m ? m.text : uiText('camp.hub.replay.keys'), m ? (m.ok ? '#6dff9c' : '#ffb454') : '#8fb4c9'); } // the keys, or the answer of the last one
  }
  // ----- the overlays: the top of the screen, opened by Enter on a row -----
  ovFoot() { const m = this.msg && this.msg.until > this.time.now && this.msg.over === this.hub.open ? this.msg : null, O = CAMP_HUBS.over; if (this.hub.ask && this.hub.open === 'board') return { text: uiText('camp.hub.restart.ask'), color: '#ffb454' }; return m ? { text: m.text, color: m.ok ? '#6dff9c' : '#ffb454' } : { text: uiText('camp.room.hint.' + this.hub.open), color: '#8fb4c9' }; } // (the answer of a key stays on the overlay it was given in: a fighter bought at the refit does not stand on the rank's foot)
  ovHint(line) { const f = this.ovFoot(); this.ovLine(line, 0, f.text, f.color); }
  overBoard() { // the missions on the left, the chosen one's briefing beside them; under them the last row, Start the campaign over, and what the marks mean
    const P = this.P, H = this.hub, O = CAMP_HUBS.over, sel = campHubSelectable(P), pk = H.pick, over = campHubOverRow(P);
    H.cur = Math.max(0, Math.min(over, H.cur | 0)); // (the cursor may stand on the Start over row, one past the missions)
    const cur = sel[H.cur] || null, view = campHubBoardView(campHubBoard(P), O.lines), at = view.length + 1;
    view.forEach((r, i) => {
      if (r.head) { this.ovLine(i, 0, uiText('camp.hub.level', { n: r.level, name: r.name }), '#38e1ff'); return; }
      const isCur = !!(cur && r.level === cur.level && r.i === cur.i), isPick = !!(pk && r.level === pk.level && r.i === pk.i);
      const mark = isPick ? '[R]' : { done: '[x]', next: '[>]', passed: '[-]', later: '[ ]' }[r.state], col = isPick ? '#6dff9c' : isCur ? '#ffffff' : r.state === 'next' ? '#ffd37a' : r.state === 'later' ? '#6f8aa0' : '#e8f6ff';
      this.ovLine(i, 0, (isCur ? '> ' : '  ') + mark + ' ' + r.n + '  ' + r.title + '  (' + uiText('camp.hub.kind.' + r.kind) + ')', col);
      this.ovLine(i, O.col2 - 60 - O.pad, r.state === 'next' ? uiText('camp.hub.next') : r.state === 'passed' ? uiText('camp.hub.skipped.tag') : r.state === 'done' ? uiText('camp.hub.score', { score: r.score }) + (r.of ? '  ' + uiText('camp.hub.bonuses', { got: r.bonus, of: r.of }) : '') + (r.rank ? '  ' + r.rank : '') : '', isPick ? '#6dff9c' : r.state === 'next' ? '#ffb454' : r.state === 'passed' ? '#8fb4c9' : '#9fe9ff', true);
    });
    const ask = !!H.ask && H.cur === over; // Start over has asked: its row turns amber
    this.ovLine(at, 0, (H.cur === over ? '> ' : '  ') + uiText('camp.hub.restart.row'), ask ? '#ffb454' : H.cur === over ? '#ffffff' : '#8fb4c9');
    if (at + 3 < 19) { this.ovLine(at + 2, 0, uiText('camp.hub.legend'), '#8fb4c9'); this.wrap(uiText('camp.hub.replay.how'), 66).forEach((l, i) => { if (at + 3 + i < 19) this.ovLine(at + 3 + i, 0, l, '#8fb4c9'); }); } // what the marks mean, and how to fly one again
    const b = cur ? campHubBrief(P, cur.level, cur.i) : null, X = O.col2 - O.pad; if (b) {
      const replay = cur.state === 'done'; // a mission done is a replay; a skipped one has its briefing as it is, with "Not flown yet" under it
      this.ovLine(0, X, uiText(replay ? 'camp.hub.replay.head' : 'camp.hub.brief.head', { n: b.n, of: b.of, title: b.title }), replay ? '#6dff9c' : '#38e1ff');
      this.ovLine(1, X, uiText('camp.hub.brief.kind', { kind: b.kindText, par: b.par }), '#8fb4c9');
      b.lines.forEach((l, i) => this.ovLine(3 + i, X, l, '#e8f6ff'));
      this.ovLine(6, X, uiText('camp.hub.brief.obj'), '#38e1ff'); b.objectives.slice(0, 4).forEach((o, i) => this.ovLine(7 + i, X, ('- ' + o).slice(0, 74), '#e8f6ff'));
      this.ovLine(12, X, uiText('camp.ui.bonushead'), '#ffd37a'); b.bonus.slice(0, 4).forEach((x, i) => this.ovLine(13 + i, X, ('+' + x.points + '  ' + x.text).slice(0, 74), '#ffd37a'));
      this.ovLine(18, X, b.tries ? uiText('camp.hub.brief.best', { score: b.best, n: b.tries }) : uiText('camp.hub.brief.new'), '#8fb4c9');
    } else if (H.cur === over) { // the Start over row: what it does
      this.ovLine(0, X, uiText('camp.hub.restart.row'), '#ffb454'); this.wrap(uiText('camp.hub.restart.desc'), 54).forEach((l, i) => this.ovLine(2 + i, X, l, '#e8f6ff'));
    }
    this.ovHint(19);
  }
  overRefit() { // the choices: what each changes (the numbers), what it costs, what you have; then the tech already fitted
    const P = this.P, H = this.hub, O = CAMP_HUBS.over, r = campHubRefit(P), at = Math.max(0, Math.min(2, H.sel | 0)), X = [24, 230, 790];
    this.ovLine(0, 0, uiText('camp.hub.refit.ore', { ore: r.ore, credits: r.credits }), '#ffd37a'); this.ovLine(0, 360, uiText('camp.hub.refit.wing', { f: r.wing.fighters }), '#e8f6ff');
    this.ovLine(2, X[0], uiText('camp.room.col.choice'), '#6f8aa0'); this.ovLine(2, X[1], uiText('camp.room.col.change'), '#6f8aa0'); this.ovLine(2, X[2], uiText('camp.room.col.cost'), '#6f8aa0');
    r.items.forEach((it, k) => {
      const y = 3 + k * 3, on = k === at;
      this.ovLine(y, 0, on ? '>' : '', '#ffb454'); this.ovLine(y, X[0], it.name, on ? '#ffffff' : '#cfefff'); this.ovLine(y, X[1], it.change, on ? '#ffffff' : '#e8f6ff'); this.ovLine(y, X[2], uiText('camp.room.cost', { cost: it.cost }), '#ffd37a');
      this.ovLine(y + 1, X[1], it.have, '#8fb4c9'); this.ovLine(y + 1, X[2], it.status, it.ok ? '#6dff9c' : '#ffb454');
      if (on) { this.ovBar.setY(O.y + O.top + (y + 0.5) * O.line + 3).setVisible(true); }
    });
    this.ovLine(13, 0, uiText('camp.room.refit.techs'), '#38e1ff');
    if (!r.techs.length) this.ovLine(14, X[0], uiText('camp.room.refit.notech'), '#8fb4c9'); else r.techs.slice(0, 5).forEach((t, i) => { this.ovLine(14 + i, X[0], t.name, '#6dff9c'); this.ovLine(14 + i, X[1], t.change || t.text, '#e8f6ff'); });
    this.ovHint(19);
  }
  overRank() { // the rank, what the next one needs, and the ranks above (the ships each adds to the wing)
    const P = this.P, r = campHubRank(P); let i = 0;
    if (r.ranked) { this.ovLine(i++, 0, uiText('camp.hub.rank.name', { name: r.name, n: r.n, of: r.of }), '#ffd37a'); this.ovLine(i++, 0, r.next != null ? uiText('camp.hub.rank.next', { to: r.nextName, next: r.next }) + '   (' + uiText('camp.room.rank.togo', { n: Math.max(0, r.next - r.points) }) + ')' : uiText('camp.hub.rank.top'), '#8fb4c9'); }
    else this.ovLine(i++, 0, uiText('camp.hub.rank.none'), '#8fb4c9');
    i++; this.ovLine(i++, 0, uiText('camp.hub.rank.points', { points: r.points }), '#e8f6ff'); this.ovLine(i++, 0, uiText('camp.hub.rank.flown', { n: r.flown, all: r.all }), '#e8f6ff');
    this.ovLine(i++, 0, uiText('camp.hub.rank.wing', { f: r.wing.fighters }), '#e8f6ff');
    if (r.ladder.length) { i++; this.ovLine(i++, 0, uiText('camp.room.rank.ladder'), '#38e1ff'); r.ladder.forEach(l => this.ovLine(i++, 0, (l.here ? '> ' : '  ') + uiText('camp.room.rank.rung', { name: l.name, at: l.at, f: l.fighters }), l.here ? '#ffd37a' : '#e8f6ff')); }
    this.ovHint(19);
  }

  // ----- the mouse on the missions list (card space-game-click-mission) -----
  modalUp() { return (typeof campBriefIsOpen === 'function' && campBriefIsOpen(this)) || (typeof campKeysIsOpen === 'function' && campKeysIsOpen(this)) || (typeof campTuneIsOpen === 'function' && campTuneIsOpen(this)); } // a page in front of the list (the briefing, the H page, the tuning panel): it takes the pointer as it takes the keys
  zonesPaint(on) { // the zones are on the lines a mission the cursor can stand on is drawn on (src/camphub.js campHubBoardHits); the others, and every zone while another page is up, are hidden
    const at = {}; if (on && !this.d.dock) campHubBoardHits(this.P, CAMP_HUBS.over.lines).forEach(h => { at[h.line] = h.cur; });
    this.mHits.forEach((z, k) => { z.cur = at[k] != null ? at[k] : -1; z.setVisible(z.cur >= 0); });
    if (!on) this.hov = -1; this.hoverPaint();
  }
  hoverMission(cur, from) { // the pointer enters (cur) or leaves (-1, from the one it left) a zone: out of an old zone after into the next must not clear the next
    if (cur >= 0) this.hov = cur; else if (from == null || this.hov === from) this.hov = -1;
    this.hoverPaint();
  }
  hoverPaint() { // the faint bar under the line the pointer is on: not while a page is in front of the list
    const z = this.hov >= 0 && this.hub.open === 'board' && !this.modalUp() ? this.mHits.find(o => o.visible !== false && o.cur === this.hov) : null;
    if (z) this.ovHover.setY(z.y); this.ovHover.setVisible(!!z);
  }
  clickMission(cur) { // a click on a mission: the arrows' move, and on the chosen one Enter (src/camphub.js campHubClickMission); nothing under a page in front
    if (this.leaving || this.d.dock || this.modalUp()) return;
    const r = campHubClickMission(this.hub, this.P, cur); if (r.used) this.apply(r);
  }

  // the pilot walks to the desk of the chosen row (straight lines: the hall's doors are in line with the desks)
  stand(now) {
    const id = this.hub.rows[this.hub.row], to = CAMP_HUBS.stops[id] || CAMP_HUBS.stops.board, p = this.player, W_ = CAMP_HUBS.walk; if (!p) return;
    if (this.walk) { this.walk.stop(); this.walk = null; }
    const d = Math.hypot(to[0] - p.x, to[1] - p.y), face = CAMP_HUBS.face[id] != null ? CAMP_HUBS.face[id] : -1.5708;
    if (now || d < 1) { p.setPosition(to[0], to[1]).setRotation(face); this.player.body.speed = 0; return; }
    p.setRotation(Math.atan2(to[1] - p.y, to[0] - p.x)); // the art looks east at rotation 0: it turns to walk
    this.player.body.speed = 100; // interiorTick swaps the stride poses while the body has speed
    this.walk = this.tweens.add({ targets: p, x: to[0], y: to[1], duration: Math.max(W_.min, d * W_.ms), ease: 'Sine.easeInOut', onComplete: () => { this.player.body.speed = 0; p.setRotation(face); this.walk = null; } });
  }

  // ----- the keys and the clicks -----
  onKey(e) {
    if (this.leaving) return;
    if (typeof campTuneIsOpen === 'function' && campTuneIsOpen(this)) { campTuneKey(this, e); return; } // the tuning panel (src/camptunedraw.js) takes every key while it is open, a held arrow too
    if (e.repeat && !(typeof campBriefIsOpen === 'function' && campBriefIsOpen(this) && typeof campZoomKey === 'function' && campZoomKey(e.code))) return; // a held key repeats only for the briefing map's zoom
    if (typeof campKeysIsOpen === 'function' && campKeysIsOpen(this)) { campKeysKey(this, e.code); return; } // the H page of every key is open: any key closes it, and it takes the key
    if (typeof campBriefIsOpen === 'function' && campBriefIsOpen(this)) { if (e.code === 'KeyH' && typeof campKeysOpen === 'function') { campKeysOpen(this, CAMPKEYS.room); return; } campBriefKey(this, e.code, e.repeat); if (e.preventDefault) e.preventDefault(); return; } // the big briefing is up (src/campbriefdraw.js): it takes the keys: Enter or L launch, Esc back to the board, Left Right page the walkthrough, M the map's zoom
    if (e.code === 'KeyH' && typeof campKeysOpen === 'function') { campKeysOpen(this, CAMPKEYS.room); return; } // H: the ready room's keys, on one page (src/campkeys.js)
    if (typeof campTuneOpen === 'function' && campKeyIs('tune', e.code) && !this.hub.open) { campTuneOpen(this); return; } // N: the tuning panel (src/camptunedraw.js), at the top of the room (not over an open row)
    const r = campHubKey(this.hub, this.P, e.code, this.d); if (!r.used) return;
    if (e.preventDefault && (e.code === 'Backspace' || e.code === 'Tab')) e.preventDefault();
    this.apply(r);
  }
  click(k) { // a click on a row picks it (and closes an overlay that was up); a second click on the chosen row is Enter: it opens the row, or launches on Launch
    if (this.leaving) return;
    const H = this.hub;
    if (k === H.row && !H.open) { this.apply(campHubKey(H, this.P, 'Enter', this.d)); return; }
    H.row = k; H.open = ''; this.apply({ used: true, moved: true, action: '', changed: false, ok: true, say: null });
  }
  apply(r) {
    if (r.say) { this.msg = { text: r.say.text != null ? String(r.say.text) : uiText(r.say.key, r.say.vars), ok: r.ok, until: this.time.now + CAMP_HUBS.msg, over: this.hub.open || '' }; sfx(r.ok ? 'chime' : 'empty'); }
    if (r.changed) campProgressSave(this.P); // a purchase is kept at once
    if (r.moved) { sfx('tick'); this.stand(false); }
    this.paint();
    const run = r.action && CAMP_HUBS.run[r.action]; if (run) run(this);
  }
  launch() {
    sfx('dock'); if (typeof interiorLaunch === 'function') interiorLaunch(this); // the bay door rolls up as the cruiser goes
    if (typeof this.d.onLaunch === 'function') { this.d.onLaunch(this); return; } // a dock's own launch (the outposts card): back to the flight it came from
    go(this, 'Campaign', campHubLaunch(this.P, this.hub)); // the mission to fly: the next one, or the replay picked on the board
  }
  leave() { if (typeof this.d.onLeave === 'function') this.d.onLeave(this); else go(this, 'Title'); }
  update(time) {
    interiorTick(this, time);
    if (typeof campTuneMark === 'function') campTuneMark(this); // the TUNED mark, while any override is on (src/camptunedraw.js)
    if (typeof campWalkTickScene === 'function') campWalkTickScene(this, time); // the briefing's walking map plays on (src/campbriefwalkdraw.js)
    if (this.scrHubOn === true) campHubHideNames(this); // (the YOU tag is made at the first tick)
    if (this.scrHubOn === true && typeof scrBriefSync === 'function') scrBriefSync(this);
    if (this.scrHubOn === true && typeof scrHubSync === 'function') scrHubSync(this, (typeof campKeysIsOpen === 'function' && campKeysIsOpen(this)) || (typeof campTuneIsOpen === 'function' && campTuneIsOpen(this)), typeof campBriefIsOpen === 'function' && campBriefIsOpen(this)); // the new look's panels follow the canvas and wait while a page of the room's own is in front (the briefing's one page lives in the same host: only the room's screen waits for it)
    if (this.msg && this.msg.until <= time && !this.msg.gone) { this.msg.gone = true; this.paint(); } // the answer fades from the page
  }
}

// the registries the room reads by row id and action: the five rows' pages, and what an action does. A dock at an outpost adds its own (CAMP_HUBS.page.build = scene => { scene.line(0, 0, ...) }).
CAMP_HUBS.page = { board: s => s.pageBoard() }; // a dock's room has the board's page; the hall's rows are in the desc and overlay tables
CAMP_HUBS.desc = { board: 1, refit: 1, rank: 1, launch: 1 }; // the rows of the hall that say in a sentence or two what they are (camp.room.desc.<id>, pageDesc); a dock's room does not
CAMP_HUBS.overlay = { board: s => s.overBoard(), refit: s => s.overRefit(), rank: s => s.overRank() }; // the rows that open an overlay on Enter, by id (CAMP_HUB.over in src/camphub.js has their keys)
CAMP_HUBS.run = { launch: s => s.launch(), ready: s => { if (typeof s.d.onLaunch === 'function' || !(typeof campBriefOpen === 'function' && campBriefOpen(s))) s.launch(); }, title: s => s.leave(), brief: s => { if (typeof campBriefOpen === 'function') campBriefOpen(s); } }; // brief: the big briefing of the mission under the cursor (src/campbriefdraw.js), opened from the missions overlay
