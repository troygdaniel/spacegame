// ---------- Campaign: the keyboard panels, the drawing (cards space-game-campaign-keys-help and space-game-campaign-panels-ui; Troy, 20 Nov 2026) ----------
// The Phaser half of src/camppanel.js, which says WHAT a panel holds, what a key does and what the drawing shows when (campPanelView). Troy, from a screenshot of the open FLEET panel (a wide box with two lines to a row and the numbers
// repeated, covering a lot of the screen): both panels are always on the screen as narrow collapsed TABS, '1 FLEET' at the left edge and '2 SHIP' at the right, below the gauges and the radar so nothing is covered. Key 1 (or a click on the tab)
// opens FLEET: its tab lights and its five rows drop under it as one-line bulleted rows in a narrower column (the digit, the name, and at the right a word or two of the live state, or the reason it cannot, greyed); key 2 does the same for SHIP,
// mirrored. Picking a row (its digit or a click) does it at once, flashes the chosen row twice in 160 ms and collapses the panel to its tab; a pick made before the panel was drawn (1 then 3 typed inside the 250 ms) pulses the TAB once instead.
// Esc, any other key or a click elsewhere closes it. Keys and behaviour are camppanel.js's and did not change; this is the drawing, one component for both panels, its words from the table (CAMP_PANELS in src/data_controls.js),
// so a row added by data (a rank, a hub, a fabricator) is drawn without a line of code. The scene calls three things:
//   campPanelsInstall(s)       once, in create: s.pn is the state (campPanelNew), s.pnl the objects of both panels (made once, shown and moved after that); the pointer is listened for and given back when the scene shuts down
//   campPanelsPaint(s, now)    every frame: the two tabs (while the battle is on the screen), and a list under a tab while its panel is open, flashing or going away; the words are live, four times a second
//   campPanelsClose(s)         a card coming up, the map, the end: the panels go back to their tabs at once
// Everything is on the screen's own camera (scroll factor 0), so the zoom (src/camzoom.js) never scales it. tests/campanelsui.mjs checks the states and their timing on stand-ins.
const CAMPPANELS_LOOK = {
  tab: { w: 110, h: 28 }, slotGap: 6,                       // px: a collapsed tab: a key cap and the name; the gap between two tabs on one side (a panel's slot in the table)
  list: { w: 232, row: 24, gap: 3, pad: 6 },               // px: the column of rows under the tab: its width (a name, its word and the digit have to fit: tests/campanelsui.mjs measures every row of the table), a row's height, the gap between rows, the gap under the tab
  top: 238, edge: 24, depth: 160, every: 250,              // the tab's y (the gauges take the top left to 176 and the radar the top right to 226), its distance from the screen's edge, the depth (over the map, 150 to 156), ms between the words being made live
  color: { left: CYAN, right: AMBER }, ink: { left: '#7fe9ff', right: '#ffd37a' },
  rowInk: { ok: '#e8f6ff', no: '#7f95a8', suffix: '#8fb4c8', why: '#ff9e7a', digit: '#ffd37a' }, flash: 0xffffff
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
  g.clear(); O.cap.setVisible(tabOn); O.name.setVisible(tabOn);
  if (tabOn) { // the tab: translucent and quiet when collapsed; brighter fill and border when its panel is open; one pulse when a pick came before the panel was drawn
    g.fillStyle(0x04101c, 0.55 + 0.4 * lit); g.fillRoundedRect(T.x, T.y, T.w, T.h, 7);
    if (beat > 0) { g.fillStyle(col, 0.18 * lit + 0.4 * v.pulse); g.fillRoundedRect(T.x, T.y, T.w, T.h, 7); }
    g.lineStyle(1 + 1.5 * beat, col, 0.42 + 0.58 * beat); g.strokeRoundedRect(T.x, T.y, T.w, T.h, 7);
    O.name.setColor(beat > 0.45 ? '#ffffff' : '#9fbdd1');
  }
  const show = v.list > 0;
  O.rows.forEach(r => { [r.digit, r.name, r.suffix].forEach(o => { o.setVisible(show); if (show) o.setAlpha(v.list); }); });
  if (!show) { O.live = -1e9; return; }
  if (O.live < 0 || now - O.live >= K.every) { // the words are live: made on the first frame of the list and four times a second after that
    O.live = now;
    campPanelRows(s.camp, def.id).forEach((r, i) => { const o = O.rows[i]; if (!o) return; o.name.setColor(r.ok ? K.rowInk.ok : K.rowInk.no); o.digit.setColor(r.ok ? K.rowInk.digit : K.rowInk.no); o.suffix.setText(r.short || '').setColor(r.ok ? K.rowInk.suffix : K.rowInk.why); });
  }
  def.rows.forEach(r => { // the rows: a translucent back with the panel's colour at its edge; the one just picked flashes
    const y = G.rowY(r.n), on = v.flash && v.flash.row === r.id ? v.flash.lit : 0;
    g.fillStyle(0x04101c, 0.8 * v.list); g.fillRoundedRect(G.list.x, y, G.list.w, G.rowH, 5);
    g.fillStyle(col, 0.9 * v.list); g.fillRect(G.list.x, y + 3, 3, G.rowH - 6);
    if (on > 0) { g.fillStyle(K.flash, 0.85 * on); g.fillRoundedRect(G.list.x, y, G.list.w, G.rowH, 5); }
  });
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
  const def = campPanelDef(P.open), G = campPanelsGeometry(def), hit = inR(G.list, px, py) ? def.rows.find(r => py >= G.rowY(r.n) - 1 && py < G.rowY(r.n) + K.list.row + 1) : null;
  if (hit) { const r = campPanelRun(s.camp, hit, 'click'); if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454'); campPanelPick(P, def.id, hit.id, now); }
  else { P.closed = { id: def.id, at: now, shown: true }; P.open = ''; }
  return true;
}
