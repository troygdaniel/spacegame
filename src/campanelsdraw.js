// ---------- Campaign: the order lists, the drawing (cards one-list-keys and list-shortcuts; Troy, 22 and 23 Nov 2026) ----------
// The Phaser half of src/camppanel.js, which says WHAT a list holds, what a key does and what a row says now. Nothing is on the screen until a list's key is pressed: then ONE list opens, a fleet list at the left (Q, or a part of it: W E R)
// or a ship list at the right (P, or a part of it: O I U), right UNDER the gauges at the top right (card space-game-power-presets: the power list's three rows each carry their system's pip bar, the twin of the gauge's, and the highlighted row frames its gauge).
//   campPanelPowerHi(s)      the dial (0 SHIELDS, 1 SPEED, 2 LASERS) whose row is highlighted in the open power list, else -1: the scene frames that gauge A row is its words in plain language and, at the right, a word or two of the live state, or the reason it cannot be done now (the row is grey);
// a row that opens a part of the list shows that part's KEY in a cap at its left and an arrow at its right; the highlighted row has a bright bar; the one in force (a stance, a convoy order) is marked.
// A list longer than CAMP_PANELS.show rows scrolls with the highlight, and says how many rows are below. The foot of the list names its keys (Up Down, Enter, Left back, Esc), read from the key table.
// The target's line (its name, how far, its hull) is always on the screen, under the radar: A D S X pick it with no list open.
// The words are the table's (CAMP_PANELS in src/data_controls.js), so a row or a list added by data is drawn without a line of code. The scene calls these:
//   campPanelsInstall(s)       once, in create: s.pn is the state (campPanelNew), s.pnl the objects (made once, shown and moved after that); the pointer is listened for and given back when the scene shuts down
//   campPanelsPaint(s, now)    every frame: the open list while the battle is on the screen (not over a card, the pause, the page of keys or the map), and the target's line; the words are live, four times a second
//   campPanelsClose(s)         a card coming up, the map, the end: the list closes
//   campPanelsKeep()           the rectangles the edge arrow's label keeps out of: the target's line (an open list is drawn over the arrow's label)
// Everything is on the screen's own camera (scroll factor 0), so the zoom (src/camzoom.js) never scales it. tests/campanelsui.mjs checks the states on stand-ins.
const CAMPPANELS_LOOK = {
  box: { w: 360, head: 30, row: 24, gap: 2, pad: 6, foot: 44 }, // px: the list's width, its heading's height, a row's height, the gap between rows, the gap under the heading, the foot (what is off the screen, and the keys)
  top: 262, topRight: 104, edge: 24, edgeRight: 4, depth: 160, every: 250, // the list's y: a left list under the lines of text at the left, a right list right under the gauges (the gauges end at about y 96, the radar is at the bottom right); its distance from the screen's edge (a right list ends 4 px from it, like the weapons gauge's bar that its pip bars sit under), the depth (over the map, 150 to 156), ms between the words being made live
  color: { left: CYAN, right: AMBER }, ink: { left: '#7fe9ff', right: '#ffd37a' },
  rowInk: { ok: '#e8f6ff', no: '#7f95a8', suffix: '#8fb4c8', why: '#ff9e7a', at: '#02101c' }, flash: 0xffffff,
  cap: { w: 24, h: 18, gap: 8 },                               // the key cap of a row that opens a part of the list (W E R, O I U), and the room after it: every row of a list that has such a row starts its words after the cap's place
  tgt: { x: 20, y: 414, w: 216, bar: 3 }                        // the target's line over the radar (at the bottom right): its distance from the right edge, its y, its width, its hull bar's height
};

// where a list is: x, y, w, h of the whole of it, and the rows' places. rows: how many rows the list has in this mission: it is as tall as they are, up to CAMP_PANELS.show (a longer one scrolls and does not jump); none given: the full height
function campPanelsGeometry(def, rows) {
  const K = CAMPPANELS_LOOK, B = K.box, right = def.side === 'right', n = Math.max(1, Math.min(CAMP_PANELS.show | 0, rows > 0 ? rows : CAMP_PANELS.show | 0));
  const x = right ? W - K.edgeRight - B.w : K.edge, top = right ? K.topRight : K.top, ry = top + B.head + B.pad, lh = n * (B.row + B.gap) - B.gap;
  return { x, y: top, w: B.w, h: B.head + B.pad + lh + B.pad + B.foot, n, head: { x, y: top, w: B.w, h: B.head }, rowH: B.row, rowY: i => ry + i * (B.row + B.gap), foot: { x, y: ry + lh + B.pad, w: B.w, h: B.foot }, list: { x, y: ry, w: B.w, h: lh } };
}
function campPanelsKeep() { const T = CAMPPANELS_LOOK.tgt; return [[W - T.x - T.w - 8, T.y - 12, W, T.y + 22]]; }

function campPanelsInstall(s) {
  const K = CAMPPANELS_LOOK, n = Math.max(1, CAMP_PANELS.show | 0);
  s.pn = campPanelNew(); s.pnl = { objs: [], rows: [], live: -1e9, key: '', onPointer: null };
  const L = s.pnl, own = (o, d) => { o.setScrollFactor(0).setDepth(K.depth + (d || 0)); L.objs.push(o); return o; }, tx = (size, color, st) => own(s.add.text(0, 0, '', uiFont(size, color, st)), 2);
  L.g = own(s.add.graphics());
  L.title = tx(15, '#ffffff', { letterSpacing: 2 }).setOrigin(0, 0.5); L.count = tx(12, '#9fbdd1').setOrigin(1, 0.5);
  for (let i = 0; i < n; i++) L.rows.push({ cap: tx(12, '#02101c', { fontStyle: 'bold' }).setOrigin(0.5), name: tx(15, K.rowInk.ok).setOrigin(0, 0.5), suffix: tx(12, K.rowInk.suffix).setOrigin(1, 0.5) });
  L.more = tx(12, '#9fbdd1').setOrigin(0, 0.5); L.keys = tx(12, '#9fbdd1').setOrigin(0, 0.5);
  L.tgt = tx(13, '#ffd37a').setOrigin(1, 0.5); L.tgtKeys = tx(11, '#8fb4c8').setOrigin(1, 0.5);
  L.onPointer = p => campPanelsClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', L.onPointer);
  if (s.events && s.events.once) { const off = () => { try { if (s.input && s.input.off) s.input.off('pointerdown', L.onPointer); } catch (e) { /* gone */ } }; s.events.once('shutdown', off); s.events.once('destroy', off); }
}
// the dial whose row is highlighted in the open power list (the scene frames that gauge), else -1
function campPanelPowerHi(s) {
  const P = s && s.pn, C = s && s.camp; if (!P || !C || s.mode !== 'play' || typeof campPanelOpen !== 'function' || campPanelOpen(P) !== 'power') return -1;
  const row = campPanelList(C, 'power')[P.at | 0]; return row && row.pip !== undefined ? CAMP_DIAL_PIPS.indexOf(row.pip) : -1;
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
  const col = K.color[def.side], key = id + ':' + P.at + ':' + P.top + ':' + (P.pick ? 'p' + P.pick.sel + ':' + P.pick.at + ':' + P.pick.top : '') + ':' + (P.trail || []).join() + ':' + Object.keys(P.lit || {}).map(k => P.lit[k]).join(); // (an order just given is in the key too: a power row stays open, and its pips are right at once; so is the target sub-list's highlight)
  if (L.live < 0 || now - L.live >= K.every || L.key !== key) { L.live = now; L.key = key; L.view = campPanelView(P, C); } // the words are live: made when the list opens or the highlight moves, and four times a second
  const V = L.view; if (!V) return;
  const G = campPanelsGeometry(def, V.total);
  g.fillStyle(0x04101c, 0.9); g.fillRoundedRect(G.x, G.y, G.w, G.h, 7);
  g.lineStyle(2, col, 0.9); g.strokeRoundedRect(G.x, G.y, G.w, G.h, 7);
  g.fillStyle(col, 0.22); g.fillRoundedRect(G.x, G.y, G.w, B.head, 7);
  L.title.setVisible(true).setPosition(G.x + 12, G.y + B.head / 2).setText((def.key ? def.key + '   ' : '') + V.title).setColor(K.ink[def.side]); // (V.title: the list's, or what is being picked)
  const caps = V.rows.some(r => r.more), nx = G.x + 14 + (caps ? K.cap.w + K.cap.gap : 0); // a list with parts: every row's words start after the cap's place, so they line up
  L.count.setVisible(true).setPosition(G.x + G.w - 12, G.y + B.head / 2).setText((V.first + V.at + 1) + ' / ' + V.total);
  V.rows.forEach((st, i) => { // a row: its words, and at the right what it will do or why it cannot; the highlighted one has a bright bar
    const o = L.rows[i]; if (!o) return;
    const y = G.rowY(i), at = i === V.at, lit = P.lit && P.lit[st.id] != null && now - P.lit[st.id] < CAMP_PANELS.anim.flash ? 0.5 - 0.5 * Math.cos(4 * Math.PI * (now - P.lit[st.id]) / CAMP_PANELS.anim.flash) : 0;
    g.fillStyle(at ? col : 0x0a1a2a, at ? (st.ok ? 0.95 : 0.4) : 0.8); g.fillRoundedRect(G.x + 4, y, G.w - 8, B.row, 5);
    if (st.marked) { g.fillStyle(at ? 0x02101c : col, 1); g.fillRect(G.x + 4, y + 4, 3, B.row - 8); }
    if (lit > 0) { g.fillStyle(K.flash, 0.85 * lit); g.fillRoundedRect(G.x + 4, y, G.w - 8, B.row, 5); }
    const ink = at && st.ok ? K.rowInk.at : st.ok ? K.rowInk.ok : K.rowInk.no;
    if (st.key) { g.fillStyle(at ? 0x02101c : col, 1); g.fillRoundedRect(G.x + 10, y + (B.row - K.cap.h) / 2, K.cap.w, K.cap.h, 4); o.cap.setVisible(true).setPosition(G.x + 10 + K.cap.w / 2, y + B.row / 2).setText(st.key).setColor(at ? K.ink[def.side] : '#02101c'); } // the key that opens this part directly
    o.name.setVisible(true).setPosition(nx, y + B.row / 2).setText(st.label + (st.more ? '  >' : '')).setColor(ink);
    let sx = G.x + G.w - 12;
    if (st.pip >= 0 && s.gaugeAnim) { // a power row: that system's pip bar at its right, the twin of the gauge's (the same animation and flash: both light together when Enter gives a pip), under the weapons gauge's bar; its key and its reason stand left of it
      const Z = campHudGeom().cells[2].bar, d = CAMP_DIAL_PIPS.indexOf(st.pip), emer = C.t < C.power.until && st.pip === 1, by = y + (B.row - (Z.y1 - Z.y0)) / 2;
      campBarDraw(g, { bar: { x0: Z.x0, y0: by, x1: Z.x1, y1: by + Z.y1 - Z.y0 } }, s.gaugeAnim.shown[st.pip], s.gaugeAnim.flash[st.pip], emer ? 0xffffff : [CAMP_GAUGE.colors.shields, CAMP_GAUGE.colors.speed, CAMP_GAUGE.colors.lasers][d]);
      sx = Z.x0 - 10;
    }
    if (st.hull >= 0) { const Q = CAMP.charge.list, bx = sx - Q.w, by = y + (B.row - Q.h) / 2; g.fillStyle(0x02060d, 0.85).fillRect(bx - 1, by - 1, Q.w + 2, Q.h + 2); g.fillStyle(0x16293d, 1).fillRect(bx, by, Q.w, Q.h); g.fillStyle(CAMP.charge.color[st.band], 1).fillRect(bx, by, Math.max(1, Math.round(Q.w * st.hull)), Q.h); sx = bx - 10; } // a ship you protect: its hull as a bar at the right of its row, its km and percent left of it (card space-game-protected-health)
    o.suffix.setVisible(true).setPosition(sx, y + B.row / 2).setText(st.short || '').setColor(at && st.ok ? K.rowInk.at : st.marked ? K.ink[def.side] : st.ok ? K.rowInk.suffix : K.rowInk.why);
  });
  const cur = V.rows[V.at], F = G.foot; // the foot: the highlighted row's full state (or its reason), what is off the screen, and the keys
  L.more.setVisible(true).setPosition(F.x + 12, F.y + 10).setText(cur && cur.state ? cur.state.charAt(0).toUpperCase() + cur.state.slice(1) : (V.below ? uiText('camp.ui.listmore', { n: V.below }) : '')).setColor(cur && !cur.ok ? K.rowInk.why : '#9fbdd1');
  L.keys.setVisible(true).setPosition(F.x + 12, F.y + 30).setText(uiText(V.keys, { key: def.key })); // the foot's words are the model's: Esc closes a list its own key opened, goes back from one a row opened, and from a target sub-list
}

// a click on a row of the open list does the row (as Enter would). true when the list took the click (so it is not also a click on the map or the battle)
// the pointer is on the open list's box: a press there is the list's click (campPanelsClick), never the start of a drag of the view (src/campdrag.js)
function campPanelsOver(s, px, py) {
  const P = s.pn; if (!P || typeof P !== 'object' || !campPanelsOn(s)) return false;
  const def = campPanelDef(campPanelOpen(P)); if (!def) return false;
  const V = campPanelView(P, s.camp); if (!V) return false;
  const G = campPanelsGeometry(def, V.total); return px >= G.x && px <= G.x + G.w && py >= G.y && py < G.y + G.h;
}
function campPanelsClick(s, px, py) {
  const P = s.pn, L = s.pnl; if (!P || !L || !campPanelsOn(s)) return false;
  const def = campPanelDef(campPanelOpen(P)); if (!def) return false;
  const V = campPanelView(P, s.camp); if (!V) return false; // the rows on the screen: the list's, or the candidates of a target sub-list
  const G = campPanelsGeometry(def, V.total), now = (s.time && s.time.now) || 0; if (!(px >= G.x && px <= G.x + G.w && py >= G.y && py < G.y + G.h)) return false;
  let i = -1; for (let k = 0; k < G.n; k++) if (py >= G.rowY(k) - 1 && py < G.rowY(k) + G.rowH + 1) i = k;
  if (P.pick) { // a candidate: highlighted and chosen, the order is given at it
    const pk = P.pick, items = campPickSync(s.camp, pk), it = i >= 0 ? items[pk.top + i] : null; if (!it) return true;
    pk.at = pk.top + i; pk.sel = it.id; const r = campPanelChoose(P, s.camp, now, 'click', def); if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454'); return true;
  }
  const rows = campPanelList(s.camp, def.id), hit = i >= 0 ? rows[(P.top | 0) + i] : null;
  if (hit && hit.open) { campPanelGo(P, s.camp, hit.open, '', def.id); return true; } // a part's row: its list opens (Esc comes back here)
  if (hit) {
    P.at = (P.top | 0) + i; let item = null;
    if (campPickKind(hit) && campPanelRowState(s.camp, hit).ok) { const plan = campPickPlan(s.camp, hit); if (plan.how === 'list') { campPickOpen(P, hit, plan.items); return true; } if (plan.how === 'auto') item = plan.item; } // a row that needs a target: one is taken, several open a sub-list
    const r = campPanelRun(s.camp, hit, 'click', item); P.lit[hit.id] = now; if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454');
    if (r && r.ok && item) P.seen = { kind: campPickKind(hit), id: item.id, until: now + CAMP_PICK.seen };
    if (r && r.ok && !hit.stay) campPanelClose(P);
  }
  return true;
}
