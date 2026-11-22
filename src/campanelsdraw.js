// ---------- Campaign: the two lists, the drawing (card one-list-keys; Troy, 22 Nov 2026: "one list per hand") ----------
// The Phaser half of src/camppanel.js, which says WHAT a list holds, what a key does and what a row says now. Nothing is on the screen until Q or P is pressed: then ONE list opens, FLEET ORDERS at the left (Q) or
// SHIP ORDERS at the right (P), below the gauges and the radar. A row is its words in plain language and, at the right, a word or two of the live state, or the reason it cannot be done now (the row is grey);
// the highlighted row has a bright bar; the one in force (a stance, a convoy order) is marked. A list longer than CAMP_PANELS.show rows scrolls with the highlight, and says how many rows are above and below.
// The foot of the list names its keys (Up Down, Enter, the list's key or Esc), read from the key table. The target's line (its name, how far, its hull) is always on the screen, under the radar: A D S X pick it with no list open.
// The words are the table's (CAMP_PANELS in src/data_controls.js), so a row added by data is drawn without a line of code. The scene calls these:
//   campPanelsInstall(s)       once, in create: s.pn is the state (campPanelNew), s.pnl the objects (made once, shown and moved after that); the pointer is listened for and given back when the scene shuts down
//   campPanelsPaint(s, now)    every frame: the open list while the battle is on the screen (not over a card, the pause, the page of keys or the map), and the target's line; the words are live, four times a second
//   campPanelsClose(s)         a card coming up, the map, the end: the list closes
//   campPanelsKeep()           the rectangles the edge arrow's label keeps out of: the target's line (an open list is drawn over the arrow's label)
// Everything is on the screen's own camera (scroll factor 0), so the zoom (src/camzoom.js) never scales it. tests/campanelsui.mjs checks the states on stand-ins.
const CAMPPANELS_LOOK = {
  box: { w: 330, head: 30, row: 26, gap: 2, pad: 6, foot: 44 }, // px: the list's width, its heading's height, a row's height, the gap between rows, the gap under the heading, the foot (what is off the screen, and the keys)
  top: 262, edge: 24, depth: 160, every: 250,                   // the list's y (the gauges and their lines take the top left, the radar the top right), its distance from the screen's edge, the depth (over the map, 150 to 156), ms between the words being made live
  color: { left: CYAN, right: AMBER }, ink: { left: '#7fe9ff', right: '#ffd37a' },
  rowInk: { ok: '#e8f6ff', no: '#7f95a8', suffix: '#8fb4c8', why: '#ff9e7a', at: '#02101c' }, flash: 0xffffff,
  tgt: { x: 20, y: 236, w: 216, bar: 3 }                        // the target's line under the radar: its distance from the right edge, its y, its width, its hull bar's height
};

// where a list is: x, y, w, h of the whole of it, and the rows' places (always CAMP_PANELS.show rows high, so it does not jump as it scrolls)
function campPanelsGeometry(def) {
  const K = CAMPPANELS_LOOK, B = K.box, right = def.side === 'right', n = Math.max(1, CAMP_PANELS.show | 0);
  const x = right ? W - K.edge - B.w : K.edge, ry = K.top + B.head + B.pad, lh = n * (B.row + B.gap) - B.gap;
  return { x, y: K.top, w: B.w, h: B.head + B.pad + lh + B.pad + B.foot, n, head: { x, y: K.top, w: B.w, h: B.head }, rowH: B.row, rowY: i => ry + i * (B.row + B.gap), foot: { x, y: ry + lh + B.pad, w: B.w, h: B.foot }, list: { x, y: ry, w: B.w, h: lh } };
}
function campPanelsKeep() { const T = CAMPPANELS_LOOK.tgt; return [[W - T.x - T.w - 8, T.y - 12, W, T.y + 22]]; }

function campPanelsInstall(s) {
  const K = CAMPPANELS_LOOK, n = Math.max(1, CAMP_PANELS.show | 0);
  s.pn = campPanelNew(); s.pnl = { objs: [], rows: [], live: -1e9, key: '', onPointer: null };
  const L = s.pnl, own = (o, d) => { o.setScrollFactor(0).setDepth(K.depth + (d || 0)); L.objs.push(o); return o; }, tx = (size, color, st) => own(s.add.text(0, 0, '', uiFont(size, color, st)), 2);
  L.g = own(s.add.graphics());
  L.title = tx(15, '#ffffff', { letterSpacing: 2 }).setOrigin(0, 0.5); L.count = tx(12, '#9fbdd1').setOrigin(1, 0.5);
  for (let i = 0; i < n; i++) L.rows.push({ name: tx(15, K.rowInk.ok).setOrigin(0, 0.5), suffix: tx(12, K.rowInk.suffix).setOrigin(1, 0.5) });
  L.more = tx(12, '#9fbdd1').setOrigin(0, 0.5); L.keys = tx(12, '#9fbdd1').setOrigin(0, 0.5);
  L.tgt = tx(13, '#ffd37a').setOrigin(1, 0.5); L.tgtKeys = tx(11, '#8fb4c8').setOrigin(1, 0.5);
  L.onPointer = p => campPanelsClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', L.onPointer);
  if (s.events && s.events.once) { const off = () => { try { if (s.input && s.input.off) s.input.off('pointerdown', L.onPointer); } catch (e) { /* gone */ } }; s.events.once('shutdown', off); s.events.once('destroy', off); }
}
// the list closes at once: a card, the map or the end took the screen
function campPanelsClose(s) { if (s && s.pn && typeof s.pn === 'object') campPanelClose(s.pn); }
// the lists and the target's line show while the battle is on the screen: not over a card, the pause, the page of keys or the map
const campPanelsOn = s => s.mode === 'play' && !s.mp && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s));

function campPanelsPaint(s, now) {
  const P = s.pn, L = s.pnl; if (!P || !L || !L.g) return;
  const K = CAMPPANELS_LOOK, B = K.box, C = s.camp, on = campPanelsOn(s), g = L.g;
  g.clear(); L.objs.forEach(o => { if (o !== g) o.setVisible(false); });
  if (!on) { if (campPanelOpen(P) && s.mode !== 'play') campPanelClose(P); L.live = -1e9; return; }
  // the target's line, under the radar: always there, so A D S X can be used with no list open
  const T = K.tgt, tg = campPanelTarget(C), tx = W - T.x;
  L.tgt.setVisible(true).setPosition(tx, T.y).setText(tg ? uiText('camp.ui.tgt', { name: tg.name, km: tg.km }) : uiText('camp.ui.tgtnone')).setColor(tg ? '#ff9e7a' : '#7f95a8');
  L.tgtKeys.setVisible(true).setPosition(tx, T.y + 18).setText(uiText(tg ? 'camp.ui.tgtclear' : 'camp.ui.tgtkeys'));
  if (tg) { g.fillStyle(0x16293d, 1); g.fillRect(tx - T.w, T.y + 9, T.w, T.bar); g.fillStyle(0xff7a6a, 1); g.fillRect(tx - T.w, T.y + 9, Math.max(1, T.w * tg.hp), T.bar); }
  const id = campPanelOpen(P), def = id ? campPanelDef(id) : null; if (!def) { L.live = -1e9; L.key = ''; return; }
  const G = campPanelsGeometry(def), col = K.color[def.side], key = id + ':' + P.at + ':' + P.top;
  if (L.live < 0 || now - L.live >= K.every || L.key !== key) { L.live = now; L.key = key; L.view = campPanelView(P, C); } // the words are live: made when the list opens or the highlight moves, and four times a second
  const V = L.view; if (!V) return;
  g.fillStyle(0x04101c, 0.9); g.fillRoundedRect(G.x, G.y, G.w, G.h, 7);
  g.lineStyle(2, col, 0.9); g.strokeRoundedRect(G.x, G.y, G.w, G.h, 7);
  g.fillStyle(col, 0.22); g.fillRoundedRect(G.x, G.y, G.w, B.head, 7);
  L.title.setVisible(true).setPosition(G.x + 12, G.y + B.head / 2).setText(def.key + '   ' + def.title).setColor(K.ink[def.side]);
  L.count.setVisible(true).setPosition(G.x + G.w - 12, G.y + B.head / 2).setText((V.first + V.at + 1) + ' / ' + V.total);
  V.rows.forEach((st, i) => { // a row: its words, and at the right what it will do or why it cannot; the highlighted one has a bright bar
    const o = L.rows[i]; if (!o) return;
    const y = G.rowY(i), at = i === V.at, lit = P.lit && P.lit[st.id] != null && now - P.lit[st.id] < CAMP_PANELS.anim.flash ? 0.5 - 0.5 * Math.cos(4 * Math.PI * (now - P.lit[st.id]) / CAMP_PANELS.anim.flash) : 0;
    g.fillStyle(at ? col : 0x0a1a2a, at ? (st.ok ? 0.95 : 0.4) : 0.8); g.fillRoundedRect(G.x + 4, y, G.w - 8, B.row, 5);
    if (st.marked) { g.fillStyle(at ? 0x02101c : col, 1); g.fillRect(G.x + 4, y + 4, 3, B.row - 8); }
    if (lit > 0) { g.fillStyle(K.flash, 0.85 * lit); g.fillRoundedRect(G.x + 4, y, G.w - 8, B.row, 5); }
    const ink = at && st.ok ? K.rowInk.at : st.ok ? K.rowInk.ok : K.rowInk.no;
    o.name.setVisible(true).setPosition(G.x + 14, y + B.row / 2).setText(st.label).setColor(ink);
    o.suffix.setVisible(true).setPosition(G.x + G.w - 12, y + B.row / 2).setText(st.short || '').setColor(at && st.ok ? K.rowInk.at : st.marked ? K.ink[def.side] : st.ok ? K.rowInk.suffix : K.rowInk.why);
  });
  const cur = V.rows[V.at], F = G.foot; // the foot: the highlighted row's full state (or its reason), what is off the screen, and the keys
  L.more.setVisible(true).setPosition(F.x + 12, F.y + 10).setText(cur && cur.state ? cur.state.charAt(0).toUpperCase() + cur.state.slice(1) : (V.below ? uiText('camp.ui.listmore', { n: V.below }) : '')).setColor(cur && !cur.ok ? K.rowInk.why : '#9fbdd1');
  L.keys.setVisible(true).setPosition(F.x + 12, F.y + 30).setText(uiText('camp.ui.listkeys', { key: def.key }));
}

// a click on a row of the open list does the row (as Enter would). true when the list took the click (so it is not also a click on the map or the battle)
function campPanelsClick(s, px, py) {
  const P = s.pn, L = s.pnl; if (!P || !L || !campPanelsOn(s)) return false;
  const def = campPanelDef(campPanelOpen(P)); if (!def) return false;
  const G = campPanelsGeometry(def), now = (s.time && s.time.now) || 0; if (!(px >= G.x && px <= G.x + G.w && py >= G.y && py < G.y + G.h)) return false;
  const rows = campPanelList(s.camp, def.id); let i = -1; for (let k = 0; k < G.n; k++) if (py >= G.rowY(k) - 1 && py < G.rowY(k) + G.rowH + 1) i = k;
  const hit = i >= 0 ? rows[(P.top | 0) + i] : null;
  if (hit) { P.at = (P.top | 0) + i; const r = campPanelRun(s.camp, hit, 'click'); P.lit[hit.id] = now; if (def.id === 'fleet' && typeof campSlowKick === 'function') campSlowKick(s, now); if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454'); if (r && r.ok) campPanelClose(P); }
  return true;
}
