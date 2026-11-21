// ---------- Campaign: the keyboard panels, the drawing (cards space-game-campaign-keys-help and space-game-campaign-panels-ui; Troy, 20 Nov 2026) ----------
// The Phaser half of src/camppanel.js, which says WHAT a panel holds, what a key does and what the drawing shows when (campPanelView). Troy, from a screenshot of the open FLEET panel (a wide box with two lines to a row and the numbers
// repeated, covering a lot of the screen): both panels are always on the screen as narrow collapsed TABS, 'Z FLEET' at the left edge and 'X SHIP' at the right (and 'C SYSTEMS' beside FLEET), below the gauges and the radar so nothing is covered. Its key (or a click on the tab)
// opens FLEET: its tab lights and its rows drop under it as one-line bulleted rows in a narrower column (the digit, the name, and at the right a word or two of the live state, or the reason it cannot, greyed); X does the same for SHIP,
// mirrored. Picking a row (its digit or a click) does it at once, flashes the chosen row twice in 160 ms and collapses the panel to its tab; a pick made before the panel was drawn (1 then 3 typed inside the 250 ms) pulses the TAB once instead.
// In an open panel one row is lit as the HIGHLIGHT (Up and Down move it, Enter does it: card space-game-panel-keys-zxc). Esc, any other key or a click elsewhere closes it. Keys and behaviour are camppanel.js's and did not change; this is the drawing, one component for both panels, its words from the table (CAMP_PANELS in src/data_controls.js),
// so a row added by data (a rank, a hub, a fabricator) is drawn without a line of code. The scene calls three things:
//   campPanelsInstall(s)       once, in create: s.pn is the state (campPanelNew), s.pnl the objects of both panels (made once, shown and moved after that); the pointer is listened for and given back when the scene shuts down
//   campPanelsPaint(s, now)    every frame: the two tabs (while the battle is on the screen), and a list under a tab while its panel is open, flashing or going away; the words are live, four times a second
//   campPanelsClose(s)         a card coming up, the map, the end: the panels go back to their tabs at once
// Everything is on the screen's own camera (scroll factor 0), so the zoom (src/camzoom.js) never scales it. tests/campanelsui.mjs checks the states and their timing on stand-ins.
const CAMPPANELS_LOOK = {
  tab: { w: 150, h: 28 }, slotGap: 6,                       // px: a collapsed tab: a key cap, the name and, on FLEET, the stance in force when it is not Free (card space-game-wrapup-stance-page: 110 wide until then); the gap between two tabs on one side (a panel's slot in the table)
  hint: { gap: 5, size: 12, ink: '#8fb4c8' },              // px, px, colour: the line under a list whose panel has a second page: the arrows flip it (it names the page they go to)
  list: { w: 232, row: 24, gap: 3, pad: 6 },               // px: the column of rows under the tab: its width (a name, its word and the digit have to fit: tests/campanelsui.mjs measures every row of the table), a row's height, the gap between rows, the gap under the tab
  top: 238, edge: 24, depth: 160, every: 250,              // the tab's y (the gauges take the top left to 176 and the radar the top right to 226), its distance from the screen's edge, the depth (over the map, 150 to 156), ms between the words being made live
  color: { left: CYAN, right: AMBER }, ink: { left: '#7fe9ff', right: '#ffd37a' },
  rowInk: { ok: '#e8f6ff', no: '#7f95a8', suffix: '#8fb4c8', why: '#ff9e7a', digit: '#ffd37a' }, flash: 0xffffff,
  pick: { fill: 0.24, bar: 0.95, width: 4 }                 // the highlighted row of the open panel: a wash of the panel's colour and a bright bar at its edge (alpha, alpha, px)
};

// where a panel is: its tab, the column of rows under it and the rows' places. x, y, w, h are the whole of it open (the tab and the list), as they were when it was one box
function campPanelsGeometry(def) {
  const K = CAMPPANELS_LOOK, right = def.side === 'right', n = def.rows.length, step = (def.slot || 0) * (K.tab.w + K.slotGap); // slot: a panel the table adds on a side that has one stands next to it (0 is at the edge)
  const tab = { x: right ? W - K.edge - K.tab.w - step : K.edge + step, y: K.top, w: K.tab.w, h: K.tab.h };
  const ly = tab.y + tab.h + K.list.pad, lh = n * K.list.row + (n - 1) * K.list.gap, lx = right ? tab.x + tab.w - K.list.w : tab.x; // the column hangs from its tab, on the side of the edge
  return { x: lx, y: tab.y, w: K.list.w, h: tab.h + K.list.pad + lh, tab, list: { x: lx, y: ly, w: K.list.w, h: lh }, rowH: K.list.row, rowY: k => ly + (k - 1) * (K.list.row + K.list.gap) };
}

// the objects of one panel: a graphics for the tab and the row backs (drawn again each frame), the tab's key cap and name, and for each row its digit, its name and its suffix
function campPanelsBuild(s, def) {
  const K = CAMPPANELS_LOOK, G = campPanelsGeometry(def), own = (o, d) => { o.setScrollFactor(0).setDepth(K.depth + (d || 0)); s.pnl.objs.push(o); return o; };
  const O = { def, live: -1e9, g: own(s.add.graphics()) };
  O.cap = own(keyCap(s, def.key, AMBER), 2); O.cap.setPosition(G.tab.x + 20, G.tab.y + G.tab.h / 2);
  O.name = own(s.add.text(G.tab.x + 38, G.tab.y + G.tab.h / 2, def.title, uiFont(14, '#9fbdd1', { letterSpacing: 2 })).setOrigin(0, 0.5), 2);
  O.note = own(s.add.text(G.tab.x + G.tab.w - 8, G.tab.y + G.tab.h / 2, '', uiFont(11, K.ink[def.side], { letterSpacing: 1 })).setOrigin(1, 0.5), 2); // the stance in force (FLEET): a word, not Free
  O.hint = def.page2 || def.page3 ? own(s.add.text(G.list.x + 30, G.list.y + G.list.h + K.hint.gap, '', uiFont(K.hint.size, K.hint.ink)).setOrigin(0, 0), 2) : null; // "<- ->  stances" under the list, "<- ->  orders" on the second page
  O.rows = def.rows.map(r => {
    const y = G.rowY(r.n) + K.list.row / 2;
    return { id: r.id, digit: own(s.add.text(G.list.x + 15, y, String(r.n), uiFont(14, K.rowInk.digit, { fontStyle: 'bold' })).setOrigin(0.5), 2),
      name: own(s.add.text(G.list.x + 30, y, r.tag || r.label, uiFont(14, K.rowInk.ok)).setOrigin(0, 0.5), 2),
      suffix: own(s.add.text(G.list.x + G.list.w - 10, y, '', uiFont(12, K.rowInk.suffix)).setOrigin(1, 0.5), 2) };
  });
  return O;
}
function campPanelsInstall(s) {
  s.pn = campPanelNew(); s.pnl = { objs: [], p: {}, onPointer: null };
  CAMP_PANELS.panels.forEach(def => { s.pnl.p[def.id] = campPanelsBuild(s, def); });
  s.pnl.onPointer = p => campPanelsClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', s.pnl.onPointer);
  if (s.events && s.events.once) { const off = () => { try { if (s.input && s.input.off) s.input.off('pointerdown', s.pnl.onPointer); } catch (e) { /* gone */ } }; s.events.once('shutdown', off); s.events.once('destroy', off); }
}
// the panels go back to their tabs at once (no fade): a card, the map or the end took the screen
function campPanelsClose(s) {
  if (!s || !s.pn) return;
  s.pn.open = ''; s.pn.flash = null; s.pn.closed = null;
}
// the tabs show while the battle is on the screen: not over a card, the pause, the page of keys or the map (a panel that is open is drawn wherever it was opened)
const campPanelsTabsOn = s => s.mode === 'play' && !s.mp && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s));

function campPanelsPaintOne(s, O, now, play) {
  const K = CAMPPANELS_LOOK, def = O.def, G = campPanelsGeometry(def), v = campPanelView(s.pn, def.id, now), col = K.color[def.side], g = O.g, T = G.tab;
  const tabOn = play || v.list > 0, lit = v.list, beat = Math.max(lit, v.pulse);
  const page = campPanelPageOf(s.pn, def.id), pages = campPanelPages(def.id); // the page the list is on: the open one's, or the one a pick was made on while it fades
  g.clear(); O.cap.setVisible(tabOn); O.name.setVisible(tabOn);
  { const st = pages > 1 && s.camp && s.camp.stance && s.camp.stance !== 'free' ? def.page2.rows.find(r => r.id === s.camp.stance) : null; O.note.setVisible(tabOn && !!st && v.list <= 0).setText(st ? st.label.split(' ')[0].toUpperCase() : ''); } // the collapsed tab names the stance in force
  if (tabOn) { // the tab: translucent and quiet when collapsed; brighter fill and border when its panel is open; one pulse when a pick came before the panel was drawn
    g.fillStyle(0x04101c, 0.55 + 0.4 * lit); g.fillRoundedRect(T.x, T.y, T.w, T.h, 7);
    if (beat > 0) { g.fillStyle(col, 0.18 * lit + 0.4 * v.pulse); g.fillRoundedRect(T.x, T.y, T.w, T.h, 7); }
    g.lineStyle(1 + 1.5 * beat, col, 0.42 + 0.58 * beat); g.strokeRoundedRect(T.x, T.y, T.w, T.h, 7);
    O.name.setColor(beat > 0.45 ? '#ffffff' : '#9fbdd1');
  }
  O.name.setText(v.list > 0 ? campPanelPageTitle(def, page) : def.title); // an open panel on another page says so on its tab; collapsed it is its own name again
  if (O.hint) O.hint.setVisible(v.list > 0 && pages > 1).setAlpha(v.list).setText('\u2190 \u2192  ' + (page + 1 >= pages ? def.title.toLowerCase() + ' orders' : campPanelPageTitle(def, page + 1).toLowerCase())); // the hint names the page the right arrow goes to: stances, convoy, then the orders again
  const show = v.list > 0;
  const nrows = campPanelPageRows(def, page).length; // the rows of the page: FLEET's orders are six, its stances five, so the sixth line is not drawn on the second page
  O.rows.forEach((r, i) => { [r.digit, r.name, r.suffix].forEach(o => { o.setVisible(show && i < nrows); if (show) o.setAlpha(v.list); }); });
  if (!show) { O.live = -1e9; return; }
  if (O.page !== page) { O.page = page; O.live = -1e9; } // flipped: the words are made again now, not at the next quarter second
  if (O.live < 0 || now - O.live >= K.every) { // the words are live: made on the first frame of the list and four times a second after that
    O.live = now;
    campPanelRows(s.camp, def.id, page).forEach((r, i) => { const o = O.rows[i]; if (!o) return; o.digit.setVisible(true); o.name.setText(r.tag || r.label).setColor(r.ok ? K.rowInk.ok : K.rowInk.no); o.digit.setColor(r.ok ? K.rowInk.digit : K.rowInk.no); o.suffix.setText(r.marked ? r.state : (r.short || '')).setColor(r.marked ? K.rowInk.digit : r.ok ? K.rowInk.suffix : K.rowInk.why); }); // a stance in force says so ("in force", in the digit's colour)
    for (let i = campPanelPageRows(def, page).length; i < O.rows.length; i++) { const o = O.rows[i]; o.name.setText(''); o.digit.setVisible(false); o.suffix.setText(''); } // a page with fewer rows than the panel's first (the convoy page has four): the rows it has no use for are blank, not the last page's words
  }
  campPanelPageRows(def, page).forEach(r => { // the rows: a translucent back with the panel's colour at its edge; the one just picked flashes
    const y = G.rowY(r.n), on = v.flash && v.flash.row === r.id ? v.flash.lit : 0;
    g.fillStyle(0x04101c, 0.8 * v.list); g.fillRoundedRect(G.list.x, y, G.list.w, G.rowH, 5);
    g.fillStyle(col, 0.9 * v.list); g.fillRect(G.list.x, y + 3, 3, G.rowH - 6);
    if (on > 0) { g.fillStyle(K.flash, 0.85 * on); g.fillRoundedRect(G.list.x, y, G.list.w, G.rowH, 5); }
  });
  if (s.pn.open === def.id && v.open) { // the highlight: the row Enter would do
    const hl = campPanelPageRows(def, page)[Math.min(s.pn.sel | 0, nrows - 1)];
    if (hl) { const y = G.rowY(hl.n); g.fillStyle(col, K.pick.fill * v.list); g.fillRoundedRect(G.list.x, y, G.list.w, G.rowH, 5); g.fillStyle(0xffffff, K.pick.bar * v.list); g.fillRect(G.list.x, y + 2, K.pick.width, G.rowH - 4); }
  }
}
function campPanelsPaint(s, now) {
  const P = s.pn, L = s.pnl; if (!P || !L) return;
  const play = campPanelsTabsOn(s);
  CAMP_PANELS.panels.forEach(def => { if (L.p[def.id]) campPanelsPaintOne(s, L.p[def.id], now, play); });
}

// a click. On a tab: that panel opens at once, or closes when it is the one open (the other one's list goes as this one comes in). With a panel drawn: on a row it does the row, flashes it and closes the panel;
// anywhere else it closes the panel. true when the panels took the click (a click in the 250 ms before a panel is drawn is not theirs, so it is not swallowed).
function campPanelsClick(s, px, py) {
  const P = s.pn, L = s.pnl; if (!P || !L) return false;
  const now = (s.time && s.time.now) || 0, K = CAMPPANELS_LOOK, inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y < r.y + r.h;
  const shown = campPanelShown(P, now);
  if (campPanelsTabsOn(s) || shown) {
    for (const def of CAMP_PANELS.panels) { if (inR(campPanelsGeometry(def).tab, px, py)) { campPanelToggle(P, def.id, now); return true; } }
  }
  if (!shown) return false;
  const def = campPanelDef(P.open), G = campPanelsGeometry(def), hit = inR(G.list, px, py) ? campPanelPageRows(def, campPanelPageOf(P, def.id)).find(r => py >= G.rowY(r.n) - 1 && py < G.rowY(r.n) + K.list.row + 1) : null;
  if (hit) { const r = campPanelRun(s.camp, hit, 'click'); if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454'); campPanelPick(P, def.id, hit.id, now); }
  else { P.closed = { id: def.id, at: now, shown: true }; P.open = ''; }
  return true;
}
