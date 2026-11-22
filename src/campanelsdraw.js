// ---------- Campaign: the two hands' panels, the drawing (cards space-game-campaign-keys-help, space-game-campaign-panels-ui and space-game-two-hands-keys; Troy, 21 Nov 2026) ----------
// The Phaser half of src/camppanel.js, which says WHAT a panel holds, what a key does and what a row says now. Two panels are on the screen all the time, small, at the edges, below the gauges and the radar so nothing is covered:
// FLEET at the left (the left hand: 1 launch or recall, 2 attack, 3 escort, 4 guard, W mine, E stance, R convoy) with the target's line under its rows (A D S X), SHIP at the right (the right hand: 7 8 9 0, J K L ; U, Enter, I).
// Every row shows its KEY as a cap, its name and, at the right, a word or two of the live state, or the reason it cannot be done (greyed); a row lights for a moment when its key is pressed. The heading shows the page key (Q, P) and the page: the
// stances and the convoy orders of FLEET, BUILD of SHIP. While a pilot's call for orders waits, the FLEET panel shows the call in place of its rows, in amber and marked CALL (1 2 3 answer it). The words are the table's (CAMP_PANELS in src/data_controls.js),
// so a row added by data is drawn without a line of code. The scene calls these:
//   campPanelsInstall(s)       once, in create: s.pn is the state (campPanelNew), s.pnl the objects of both panels (made once, shown and moved after that); the pointer is listened for and given back when the scene shuts down
//   campPanelsPaint(s, now)    every frame: the two panels while the battle is on the screen (not over a card, the pause, the page of keys or the map); the words are live, four times a second
//   campPanelsClose(s)         a card coming up, the map, the end: the panels go back to their first page
//   campPanelsKeep()           the two panels' rectangles [[x1, y1, x2, y2]]: what the edge arrow's label keeps out of
// Everything is on the screen's own camera (scroll factor 0), so the zoom (src/camzoom.js) never scales it. tests/campanelsui.mjs checks the states on stand-ins.
const CAMPPANELS_LOOK = {
  box: { w: 262, head: 28, row: 22, gap: 2, pad: 6, foot: 30 }, // px: a panel's width, its heading's height, a row's height, the gap between rows, the gap under the heading, the target line under FLEET's rows
  cap: { w: 40, h: 18 },                                        // px: the key cap of a row
  hint: { size: 12, ink: '#8fb4c8' },
  top: 262, edge: 24, depth: 160, every: 250,                   // the panels' y (the gauges and their lines take the top left, the radar the top right), their distance from the screen's edge, the depth (over the map, 150 to 156), ms between the words being made live
  color: { left: CYAN, right: AMBER }, ink: { left: '#7fe9ff', right: '#ffd37a' },
  rowInk: { ok: '#e8f6ff', no: '#7f95a8', suffix: '#8fb4c8', why: '#ff9e7a', key: '#02101c' }, flash: 0xffffff,
  call: { ink: '#ffd37a', rowInk: '#9fe9ff', bar: 5, warn: 2.5, color: 0xffd37a }
};

// where a panel is: x, y, w, h of the whole of it, and the rows' places. n: how many rows the longest of its pages has
function campPanelsGeometry(def) {
  const K = CAMPPANELS_LOOK, B = K.box, right = def.side === 'right', pages = campPanelPages(def.id);
  const n = Math.max(def.rows.length, pages > 1 && def.page2 ? def.page2.rows.length : 0, pages > 2 && def.page3 ? def.page3.rows.length : 0), foot = def.id === 'fleet' ? B.foot : 0;
  const x = right ? W - K.edge - B.w : K.edge, ry = K.top + B.head + B.pad, lh = n * (B.row + B.gap) - B.gap;
  return { x, y: K.top, w: B.w, h: B.head + B.pad + lh + (foot ? B.pad + foot : 0), n, head: { x, y: K.top, w: B.w, h: B.head }, rowH: B.row, rowY: i => ry + i * (B.row + B.gap), foot: { x, y: ry + lh + B.pad, w: B.w, h: foot }, list: { x, y: ry, w: B.w, h: lh } };
}
function campPanelsKeep() { return CAMP_PANELS.panels.map(def => { const G = campPanelsGeometry(def); return [G.x - 8, G.y, G.x + G.w + 8, G.y + G.h + 8]; }); }

// the objects of one panel: a graphics for the backs, the heading's words, for each row its key, its name and its suffix, the target line, and the call that takes the rows' place
function campPanelsBuild(s, def) {
  const K = CAMPPANELS_LOOK, B = K.box, G = campPanelsGeometry(def), own = (o, d) => { o.setScrollFactor(0).setDepth(K.depth + (d || 0)); s.pnl.objs.push(o); return o; };
  const O = { def, live: -1e9, g: own(s.add.graphics()) }, tx = (x, y, str, size, color, st) => own(s.add.text(x, y, str, uiFont(size, color, st)), 2);
  O.title = tx(G.x + 12, G.y + B.head / 2, def.title, 14, '#9fbdd1', { letterSpacing: 2 }).setOrigin(0, 0.5);
  O.pageKey = tx(G.x + G.w - 12, G.y + B.head / 2, '', 12, K.ink[def.side], { letterSpacing: 1 }).setOrigin(1, 0.5); // "Q  1/3": the page key and the page
  O.rows = [];
  for (let i = 0; i < G.n; i++) {
    const y = G.rowY(i) + B.row / 2;
    O.rows.push({ key: tx(G.x + 8 + K.cap.w / 2, y, '', 12, K.rowInk.key, { fontStyle: 'bold' }).setOrigin(0.5),
      name: tx(G.x + 8 + K.cap.w + 8, y, '', 14, K.rowInk.ok).setOrigin(0, 0.5),
      suffix: tx(G.x + G.w - 10, y, '', 12, K.rowInk.suffix).setOrigin(1, 0.5) });
  }
  if (def.id === 'fleet') {
    O.foot = tx(G.foot.x + 12, G.foot.y + 10, '', 13, '#ffd37a').setOrigin(0, 0.5);                                              // "TARGET  Raider 3  1.2 km"
    O.footKeys = tx(G.foot.x + G.w - 10, G.foot.y + 10, '', 11, K.hint.ink).setOrigin(1, 0.5);                                   // "A D S  X clear"
    O.callHead = tx(G.x + 12, G.y + B.head / 2, '', 14, K.call.ink, { letterSpacing: 2 }).setOrigin(0, 0.5);
    O.callLine = tx(G.x + 12, G.list.y + 4, '', 13, K.call.ink, { wordWrap: { width: G.w - 24 } });
    O.callRows = [0, 1, 2].map(i => tx(G.x + 12, G.list.y + 4 + 70 + i * 22, '', 14, K.call.rowInk));
    O.callFoot = tx(G.x + G.w - 10, G.list.y + G.list.h - 6, '', 11, '#7f9fb4').setOrigin(1, 1);
  }
  return O;
}
function campPanelsInstall(s) {
  s.pn = campPanelNew(); s.pnl = { objs: [], p: {}, onPointer: null };
  CAMP_PANELS.panels.forEach(def => { s.pnl.p[def.id] = campPanelsBuild(s, def); });
  s.pnl.onPointer = p => campPanelsClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', s.pnl.onPointer);
  if (s.events && s.events.once) { const off = () => { try { if (s.input && s.input.off) s.input.off('pointerdown', s.pnl.onPointer); } catch (e) { /* gone */ } }; s.events.once('shutdown', off); s.events.once('destroy', off); }
}
// the panels go back to their first page at once: a card, the map or the end took the screen
function campPanelsClose(s) {
  if (!s || !s.pn || !s.pn.page) return;
  CAMP_PANELS.panels.forEach(p => { s.pn.page[p.id] = 0; });
}
// the panels show while the battle is on the screen: not over a card, the pause, the page of keys or the map
const campPanelsOn = s => s.mode === 'play' && !s.mp && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s));

function campPanelsPaintOne(s, O, now, on) {
  const K = CAMPPANELS_LOOK, B = K.box, def = O.def, G = campPanelsGeometry(def), col = K.color[def.side], g = O.g, C = s.camp;
  const call = on && def.id === 'fleet' && C && typeof campCallView === 'function' ? campCallView(C) : null;
  const pages = campPanelPages(def.id), page = campPanelPageOf(s.pn, def.id), rows = campPanelPageRows(def, page);
  g.clear();
  const objs = [O.title, O.pageKey].concat(O.rows.flatMap(r => [r.key, r.name, r.suffix]), O.foot ? [O.foot, O.footKeys] : [], O.callHead ? [O.callHead, O.callLine, O.callFoot].concat(O.callRows) : []);
  objs.forEach(o => o.setVisible(false));
  if (!on) { O.live = -1e9; return; }
  // the back and the heading
  const hot = call ? K.call.color : col;
  g.fillStyle(0x04101c, 0.62); g.fillRoundedRect(G.x, G.y, G.w, G.h, 7);
  g.lineStyle(call ? 2.5 : 1.5, hot, call ? 0.95 : 0.55); g.strokeRoundedRect(G.x, G.y, G.w, G.h, 7);
  g.fillStyle(hot, call ? 0.3 : 0.14); g.fillRoundedRect(G.x, G.y, G.w, B.head, 7);
  if (call) { // a pilot's call: the rows' place is the call's (1 2 3 answer it)
    O.callHead.setVisible(true).setText(uiText('camp.ui.callhead'));
    O.callLine.setVisible(true); O.callFoot.setVisible(true).setText(uiText('camp.call.hud.keys'));
    const key = call.id + ':' + call.pilot;
    if (O.callKey !== key) {
      O.callKey = key; O.callLine.setText((typeof campCallPilot === 'function' ? campCallPilot(call.pilot)[0] : 'PILOT') + ': ' + uiText(call.line));
      call.rows.forEach((r, i) => O.callRows[i] && O.callRows[i].setText(r.n + '  ' + uiText(r.label) + (r.def ? '   (' + uiText('camp.call.hud.def') + ')' : '')));
    }
    O.callRows.forEach((t, i) => t.setVisible(i < call.rows.length));
    const share = call.total > 0 ? Math.max(0, Math.min(1, call.left / call.total)) : 0, by = G.list.y + G.list.h - 4, bw = G.w - 24;
    g.fillStyle(call.left <= K.call.warn ? 0xff6a5a : K.call.color, 1); g.fillRect(G.x + 12, by, Math.max(1, Math.round(bw * share)), K.call.bar);
    O.live = -1e9; return;
  }
  O.title.setVisible(true).setText(campPanelPageTitle(def, page)).setColor(page > 0 ? '#ffffff' : '#9fbdd1');
  O.pageKey.setVisible(pages > 1).setText(def.key + '   ' + (page + 1) + '/' + pages);
  if (O.live < 0 || now - O.live >= K.every || O.page !== page) { // the words are live: made on the first frame and four times a second after that (or at once when the page turned)
    O.live = now; O.page = page; O.state = campPanelRows(C, def.id, page);
    if (def.id === 'fleet') { const tg = campPanelTarget(C); O.tgt = tg ? { text: uiText('camp.ui.tgt', { name: tg.name, km: tg.km }), hp: tg.hp } : { text: uiText('camp.ui.tgtnone'), hp: -1 }; }
  }
  rows.forEach((r, i) => { // a row: a translucent back with the panel's colour at its edge, the key cap, the name and the live word
    const o = O.rows[i], st = (O.state || [])[i] || { ok: true }, y = G.rowY(i), lit = s.pn.lit && s.pn.lit[r.id] != null && now - s.pn.lit[r.id] < CAMP_PANELS.anim.flash ? 0.5 - 0.5 * Math.cos(4 * Math.PI * (now - s.pn.lit[r.id]) / CAMP_PANELS.anim.flash) : 0;
    g.fillStyle(0x04101c, 0.8); g.fillRoundedRect(G.x + 4, y, G.w - 8, B.row, 5);
    g.fillStyle(col, 0.9); g.fillRect(G.x + 4, y + 3, 3, B.row - 6);
    g.fillStyle(st.ok ? col : 0x4a5d70, 1); g.fillRoundedRect(G.x + 8, y + (B.row - K.cap.h) / 2, K.cap.w, K.cap.h, 4); // the key cap
    if (lit > 0) { g.fillStyle(K.flash, 0.85 * lit); g.fillRoundedRect(G.x + 4, y, G.w - 8, B.row, 5); }
    o.key.setVisible(true).setText(r.k).setColor(st.ok ? K.rowInk.key : '#c5d2de').setFontSize(String(r.k).length > 3 ? 10 : 12);
    o.name.setVisible(true).setText(st.tag || r.tag || r.label).setColor(st.ok ? K.rowInk.ok : K.rowInk.no);
    o.suffix.setVisible(true).setText(st.marked ? st.state : (st.short || '')).setColor(st.marked ? K.ink[def.side] : st.ok ? K.rowInk.suffix : K.rowInk.why);
  });
  if (O.foot) { // the target: its name and how far, under the rows, with its hull as a thin bar
    const tg = O.tgt || { text: '', hp: -1 }, F = G.foot;
    O.foot.setVisible(true).setText(tg.text).setColor(tg.hp >= 0 ? '#ff9e7a' : '#7f95a8');
    O.footKeys.setVisible(true).setText(uiText(tg.hp >= 0 ? 'camp.ui.tgtclear' : 'camp.ui.tgtkeys')); // with a target the line is long: only the key that lets it go
    if (tg.hp >= 0) { g.fillStyle(0x16293d, 1); g.fillRect(F.x + 12, F.y + 22, F.w - 24, 3); g.fillStyle(0xff7a6a, 1); g.fillRect(F.x + 12, F.y + 22, Math.max(1, (F.w - 24) * tg.hp), 3); }
  }
}
function campPanelsPaint(s, now) {
  const P = s.pn, L = s.pnl; if (!P || !L) return;
  campPanelTick(P, now);
  const on = campPanelsOn(s);
  CAMP_PANELS.panels.forEach(def => { if (L.p[def.id]) campPanelsPaintOne(s, L.p[def.id], now, on); });
}

// a click: on a panel's heading it turns the page; on a row it does the row (as its key would). true when a panel took the click (so it is not also a click on the map or the battle)
function campPanelsClick(s, px, py) {
  const P = s.pn, L = s.pnl; if (!P || !L || !campPanelsOn(s)) return false;
  const now = (s.time && s.time.now) || 0, inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y < r.y + r.h;
  for (const def of CAMP_PANELS.panels) {
    const G = campPanelsGeometry(def); if (!inR(G, px, py)) continue;
    if (inR(G.head, px, py)) { campPanelKey(P, s.camp, def.code, now); return true; }
    const page = campPanelPageOf(P, def.id), hit = campPanelPageRows(def, page).find((r, i) => py >= G.rowY(i) - 1 && py < G.rowY(i) + G.rowH + 1);
    if (hit) { const r = campPanelRun(s.camp, hit, 'click'); P.lit[hit.id] = now; if (def.id === 'fleet' && typeof campSlowKick === 'function') campSlowKick(s, now); if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454'); if (page > 0) P.page[def.id] = 0; }
    return true;
  }
  return false;
}
