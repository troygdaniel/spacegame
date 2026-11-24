// ---------- The scene half of the target display (card space-game-target-display; the rule is src/camptdisp.js) ----------
// The box in the bottom right corner, where the radar was: a frame (red for a hostile, cyan for a ship of yours or a neutral you are picking), the ship's name and type, a picture of it, a hull bar and a shield bar with their
// numbers, how far it is and the line of what it is doing. Nothing selected, nothing drawn: the corner is empty. The bottom LEFT corner is the FLEET panel now (card space-game-layout-fleet: src/campcorner.js, src/campcornerscene.js: the who box that was here is gone); the TARGET box in the bottom right holds the one target (cards space-game-keys-panels, space-game-keys2-panels: an enemy or a friendly ship or outpost), drawn by the same code, with an order-key line at its foot (E Attack for an enemy, E Guard for a friendly: lit when the order can be given, grey when not). It is read when a ship is first shown and four times a second after (CAMP.tdisp.every), the frame and the bars
// are drawn again only when the ship, the side or a number changes, and every text is set through campLabel (src/camptextguard.js), so a steady box costs nothing. It is on the screen's own camera (scroll factor 0), over the
// edge arrows and under the lists, and hidden behind a card, the pause, the page of keys and the Tab map (the same times as the lists). The scene calls campTdispSync(scene, now) every frame; the objects are kept in
// scene.hud.tdisp (a scene that starts again has a new hud: the old are destroyed with it). Nothing here decides anything.
function campTdispBox(left, dx) { const K = CAMP.tdisp, C = CAMP.corner, y = H - K.bottom - K.h - K.line; return left ? { x: C.at.bl.x + (dx || 0), y: C.at.bl.y - K.h, w: C.w, h: K.h } : { x: W - K.right - K.w + (dx || 0), y, w: K.w, h: K.h + K.line }; } // a rectangle on the screen: the TARGET box (bottom right: the one target held, an enemy or a friendly; the order-key line at its foot, CAMP.tdisp.line px) or, with left, the room the FLEET corner and its details can take at the bottom left (CAMP.corner.at.bl; the MISSILES count, CAMP.tdisp.count, is under it); dx moves it sideways (campBoxDx: out of the way of an open list). Both are inside the edge arrows' keep rectangles (CAMP.nav.arrow.keep)
const CAMP_TDISP_LAY = { name: [10, 8], type: [10, 29], pic: [10, 50], col: 96, hullL: 50, hullB: 63, hullN: 74, shL: 92, shB: 105, shN: 116, km: [10, 136], doing: [10, 160], wrap: 180, cap: { x: 10, w: 24, h: 18, dy: 4 }, label: 42 }; // where each part is, in px from the box's top left corner; the key line's cap (its place from the line's top) and its word's x
function campTdispMake(s) {
  const K = CAMP.tdisp, mk = (o, d) => o.setScrollFactor(0).setDepth(K.depth + (d || 0)), tx = (size, color, st) => mk(s.add.text(0, 0, '', uiFont(size, color, st)), 2).setVisible(false);
  return { g: mk(s.add.graphics()), pic: mk(s.add.image(0, 0, 'ship'), 1).setVisible(false), name: tx(16, '#ffffff', { fontStyle: 'bold' }), type: tx(12, '#9fbdd1'), hullL: tx(11, '#9fbdd1'), hullN: tx(11, '#e8f6ff'), shL: tx(11, '#9fbdd1'), shN: tx(11, '#e8f6ff'), km: tx(14, '#e8f6ff'), doing: tx(12, '#ffffff', { wordWrap: { width: CAMP_TDISP_LAY.wrap } }), keyCap: tx(12, '#02101c', { fontStyle: 'bold' }).setOrigin(0.5), keyLabel: tx(13, '#e8f6ff'), at: -1e9, id: '', side: '', info: null, gkey: '', kind: '' };
}
function campTdispOn(s) { return s.mode === 'play' && !s.mp && !(typeof s.hudHides === 'function' && s.hudHides()) && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)); }
function campTdispHide(V) { V.g.clear(); V.gkey = ''; V.id = ''; V.info = null; [V.pic, V.name, V.type, V.hullL, V.hullN, V.shL, V.shN, V.km, V.doing, V.keyCap, V.keyLabel].forEach(o => o.setVisible(false)); }
function campTdispFrame(V, col) { const B = campTdispBox(V.left, V.dx), g = V.g; g.clear(); g.fillStyle(0x04101c, 0.9).fillRoundedRect(B.x, B.y, B.w, B.h, 7); g.lineStyle(2, col, 0.9).strokeRoundedRect(B.x, B.y, B.w, B.h, 7); } // the box's own frame
function campTdispBar(g, x, y, w, h, share, color) { g.fillStyle(0x16293d, 1).fillRect(x, y, w, h); g.fillStyle(color, 1).fillRect(x, y, Math.max(share > 0 ? 1 : 0, Math.round(w * share)), h); g.lineStyle(1, 0x38e1ff, 0.4).strokeRect(x, y, w, h); } // a bar: its ground, its fill by the share, its edge
function campTdispDraw(V, info) { // the frame, the picture's frame and the two bars (an outpost has neither), and the order-key line's rule and cap
  const K = CAMP.tdisp, B = campTdispBox(V.left, V.dx), L = CAMP_TDISP_LAY, g = V.g, col = K.color[info.side === 'hostile' ? 'hostile' : 'friend'];
  campTdispFrame(V, col);
  if (info.kind !== 'post') {
    g.fillStyle(0x0a1a2a, 0.95).fillRect(B.x + L.pic[0], B.y + L.pic[1], K.pic, K.pic); g.lineStyle(1, col, 0.5).strokeRect(B.x + L.pic[0], B.y + L.pic[1], K.pic, K.pic);
    const bar = (y, share, color) => campTdispBar(g, B.x + L.col, B.y + y, K.bar.w, K.bar.h, share, color);
    bar(L.hullB, info.hull.share, CAMP.charge.color[campChargeBand(info.hull.share)]);
    if (info.shield) bar(L.shB, info.shield.share, 0x7fe9ff); else { g.fillStyle(0x16293d, 0.5).fillRect(B.x + L.col, B.y + L.shB, K.bar.w, K.bar.h); }
  }
  if (info.order) { // the key line: a rule above it, and the key's cap lit in the box's colour when the order can be given, dim when it cannot
    const y = B.y + B.h - K.line; g.lineStyle(1, col, 0.35).lineBetween(B.x + 8, y, B.x + B.w - 8, y);
    g.fillStyle(info.order.ok ? col : 0x2a3b4c, info.order.ok ? 0.95 : 0.9).fillRoundedRect(B.x + L.cap.x, y + L.cap.dy, L.cap.w, L.cap.h, 4);
  }
}
// A box that an open list reaches steps out of its way, at the same height, and goes back when the list closes (cards space-game-w-list-covers-friend-box, found by 8-GEN's batch, and space-game-keys-panels): the WHO box
// (bottom left) steps right of an open left list (W: seven rows, down to y 528), the target box (bottom right) steps left of an open right list that reaches it (the ship list, eleven rows, ends at y 474). CAMP.tdisp.beside px from the list's edge. The list's own height is read from what it drew (s.pnl.view.total rows); before it has drawn, the full height is taken.
function campBoxDx(s, left) {
  const P = s.pn, K = CAMP.tdisp; if (!P || typeof campPanelOpen !== 'function' || typeof campPanelDef !== 'function' || typeof campPanelsGeometry !== 'function') return 0;
  const id = campPanelOpen(P), def = id ? campPanelDef(id) : null; if (!def || (def.side === 'right') === !!left) return 0; // a left list moves the left box, a right list the right ones
  const G = campPanelsGeometry(def, s.pnl && s.pnl.view ? s.pnl.view.total : 0, s.pnl && s.pnl.view ? s.pnl.view.pick : false), B = campTdispBox(left, 0);
  if (!(G.x < B.x + B.w && G.x + G.w > B.x && G.y < B.y + B.h && G.y + G.h > B.y)) return 0;
  return left ? G.x + G.w + K.beside - B.x : G.x - K.beside - B.w - B.x;
}
function campTdispSync(s, now) { campTdispShow(s, now, 'tdisp', { left: false, keyline: true }, () => campTdispSubject(s.camp, s.pn, now)); } // the TARGET display, bottom right: the one target held (an enemy picked with [ ] \\, or a friendly with O P), with its order-key line; or the ship an order's list is on
function campTdispShow(s, now, slot, o, subject) { // one display: its objects are kept in scene.hud[slot]; the ship is read when first shown and every CAMP.tdisp.every ms after
  const C = s.camp, K = CAMP.tdisp; if (!C || !s.hud || !s.add) return;
  const V = s.hud[slot] || (s.hud[slot] = Object.assign(campTdispMake(s), { left: !!o.left, keyline: !!o.keyline })), sub = campTdispOn(s) ? subject() : null;
  const dx = campBoxDx(s, V.left); if (V.dx !== dx) { V.dx = dx; V.gkey = ''; } // a box steps out of an open list's way, and is drawn again there
  if (!sub) { if (V.id || V.gkey) campTdispHide(V); return; }
  const sid = sub.u ? sub.u.id : sub.post.id;
  if (V.id !== sid || V.side !== sub.side || now - V.at >= K.every) { // a new ship is read at once, the same one four times a second
    V.info = sub.post ? campTdispPostInfo(C, sub.post) : campTdispInfo(C, sub.u, sub.side); V.id = sid; V.side = sub.side; V.at = now;
    V.info.order = V.keyline && sub.held ? campTdispOrder(C, sub.side === 'hostile' ? 'attack' : 'guard') : null; // the key line: the target held has it, Attack for an enemy and Guard for a friendly (not a ship an order's list is on)
  }
  const info = V.info, B = campTdispBox(V.left, V.dx), L = CAMP_TDISP_LAY, ink = K.ink[info.side === 'hostile' ? 'hostile' : 'friend'], post = info.kind === 'post', ord = info.order;
  const gkey = info.side + '|' + (post ? 'post' : info.hull.now + '|' + info.hull.max + '|' + (info.shield ? info.shield.now + '/' + info.shield.max : '-')) + '|' + (ord ? ord.key + (ord.ok ? '+' : '-') : '');
  if (V.gkey !== gkey) { V.gkey = gkey; campTdispDraw(V, info); }
  const at = (o, p, text, color) => { campLabel(o, text, color); o.setPosition(B.x + p[0], B.y + p[1]).setVisible(true); };
  at(V.name, L.name, info.name, ink); at(V.type, L.type, info.type); at(V.km, L.km, uiText('camp.tdisp.km', { km: info.km }));
  if (post) { [V.hullL, V.hullN, V.shL, V.shN, V.doing, V.pic].forEach(o => o.setVisible(false)); V.kind = ''; } // an outpost has no hull, no shield, no picture and no order it is on
  else {
    at(V.hullL, [L.col, L.hullL], uiText('camp.tdisp.hull')); at(V.hullN, [L.col, L.hullN], info.hull.now + ' / ' + info.hull.max);
    at(V.shL, [L.col, L.shL], uiText('camp.tdisp.shield')); at(V.shN, [L.col, L.shN], info.shield ? info.shield.now + ' / ' + info.shield.max : uiText('camp.tdisp.noshield'), info.shield ? '#e8f6ff' : '#7f95a8');
    at(V.doing, L.doing, info.doing, ink);
    if (V.kind !== info.kind + '|' + info.id && s.textures && typeof s.texOf === 'function') { // the picture: the ship's own art, its nose up, to fit the frame (and in its squad's colour for a fighter)
      V.kind = info.kind + '|' + info.id; const look = (typeof CAMP_LOOK === 'object' && CAMP_LOOK[info.kind]) || {}, u = C.by[info.id], sq = u && u.kind === 'fighter' && u.team === 'earth' && u.squad ? CAMP.wing.squadColor[u.squad] : 0;
      V.pic.setTexture(s.texOf(info.kind)); V.pic.setRotation(-Math.PI / 2); if (sq || look.tint) V.pic.setTint(sq || look.tint); else V.pic.clearTint();
      V.pic.setScale((K.pic - 8) / Math.max(1, V.pic.width, V.pic.height));
    }
    V.pic.setPosition(B.x + L.pic[0] + K.pic / 2, B.y + L.pic[1] + K.pic / 2).setVisible(true);
  }
  if (ord) { // the key line: the key and its word, bright when the order can be given, grey when not
    const y = B.y + B.h - K.line;
    campLabel(V.keyCap, ord.key, ord.ok ? '#02101c' : '#9fb4c4'); V.keyCap.setPosition(B.x + L.cap.x + L.cap.w / 2, y + L.cap.dy + L.cap.h / 2).setVisible(true);
    campLabel(V.keyLabel, ord.label, ord.ok ? '#e8f6ff' : '#7f95a8'); V.keyLabel.setPosition(B.x + L.label, y + L.cap.dy + 1).setVisible(true);
  } else { V.keyCap.setVisible(false); V.keyLabel.setVisible(false); }
}
