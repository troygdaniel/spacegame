// ---------- The scene half of the target display (card space-game-target-display; the rule is src/camptdisp.js) ----------
// The box in the bottom right corner, where the radar was: a frame (red for a hostile, cyan for a ship of yours or a neutral you are picking), the ship's name and type, a picture of it, a hull bar and a shield bar with their
// numbers, how far it is and the line of what it is doing. Nothing selected, nothing drawn: the corner is empty. The same box is the FRIEND display in the bottom LEFT corner (card space-game-friendly-display: campFdispSync, the ship A or D picked; campTdispBox(true); its objects in scene.hud.fdisp), drawn by the same code. It is read when a ship is first shown and four times a second after (CAMP.tdisp.every), the frame and the bars
// are drawn again only when the ship, the side or a number changes, and every text is set through campLabel (src/camptextguard.js), so a steady box costs nothing. It is on the screen's own camera (scroll factor 0), over the
// edge arrows and under the lists, and hidden behind a card, the pause, the page of keys and the Tab map (the same times as the lists). The scene calls campTdispSync(scene, now) every frame; the objects are kept in
// scene.hud.tdisp (a scene that starts again has a new hud: the old are destroyed with it). Nothing here decides anything.
function campTdispBox(left, dx) { const K = CAMP.tdisp; return { x: (left ? K.left : W - K.right - K.w) + (dx || 0), y: H - K.bottom - K.h, w: K.w, h: K.h }; } // the box on the screen: in the bottom right corner (the target), or with left set in the bottom LEFT one (the friend display, card space-game-friendly-display: the same box and layout, mirrored). dx moves it right (campFdispDx: out of the way of an open left list). Both are rectangles the edge arrows' labels keep out of (inside CAMP.nav.arrow.keep)
const CAMP_TDISP_LAY = { name: [10, 8], type: [10, 29], pic: [10, 50], col: 96, hullL: 50, hullB: 63, hullN: 74, shL: 92, shB: 105, shN: 116, km: [10, 136], doing: [10, 160], wrap: 180 }; // where each part is, in px from the box's top left corner
function campTdispMake(s) {
  const K = CAMP.tdisp, mk = (o, d) => o.setScrollFactor(0).setDepth(K.depth + (d || 0)), tx = (size, color, st) => mk(s.add.text(0, 0, '', uiFont(size, color, st)), 2).setVisible(false);
  return { g: mk(s.add.graphics()), pic: mk(s.add.image(0, 0, 'ship'), 1).setVisible(false), name: tx(16, '#ffffff', { fontStyle: 'bold' }), type: tx(12, '#9fbdd1'), hullL: tx(11, '#9fbdd1'), hullN: tx(11, '#e8f6ff'), shL: tx(11, '#9fbdd1'), shN: tx(11, '#e8f6ff'), km: tx(14, '#e8f6ff'), doing: tx(12, '#ffffff', { wordWrap: { width: CAMP_TDISP_LAY.wrap } }), at: -1e9, id: '', side: '', info: null, gkey: '', kind: '' };
}
function campTdispOn(s) { return s.mode === 'play' && !s.mp && !(typeof s.hudHides === 'function' && s.hudHides()) && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)); }
function campTdispHide(V) { V.g.clear(); V.gkey = ''; V.id = ''; V.info = null; [V.pic, V.name, V.type, V.hullL, V.hullN, V.shL, V.shN, V.km, V.doing].forEach(o => o.setVisible(false)); campFdispRowsHide(V); V.allOn = false; }
function campTdispFrame(V, col) { const B = campTdispBox(V.left, V.dx), g = V.g; g.clear(); g.fillStyle(0x04101c, 0.9).fillRoundedRect(B.x, B.y, B.w, B.h, 7); g.lineStyle(2, col, 0.9).strokeRoundedRect(B.x, B.y, B.w, B.h, 7); } // the box's own frame
function campTdispBar(g, x, y, w, h, share, color) { g.fillStyle(0x16293d, 1).fillRect(x, y, w, h); g.fillStyle(color, 1).fillRect(x, y, Math.max(share > 0 ? 1 : 0, Math.round(w * share)), h); g.lineStyle(1, 0x38e1ff, 0.4).strokeRect(x, y, w, h); } // a bar: its ground, its fill by the share, its edge
function campTdispDraw(V, info) { // the frame, the picture's frame and the two bars
  const K = CAMP.tdisp, B = campTdispBox(V.left, V.dx), L = CAMP_TDISP_LAY, g = V.g, col = K.color[info.side === 'hostile' ? 'hostile' : 'friend'];
  campTdispFrame(V, col);
  g.fillStyle(0x0a1a2a, 0.95).fillRect(B.x + L.pic[0], B.y + L.pic[1], K.pic, K.pic); g.lineStyle(1, col, 0.5).strokeRect(B.x + L.pic[0], B.y + L.pic[1], K.pic, K.pic);
  const bar = (y, share, color) => campTdispBar(g, B.x + L.col, B.y + y, K.bar.w, K.bar.h, share, color);
  bar(L.hullB, info.hull.share, CAMP.charge.color[campChargeBand(info.hull.share)]);
  if (info.shield) bar(L.shB, info.shield.share, 0x7fe9ff); else { g.fillStyle(0x16293d, 0.5).fillRect(B.x + L.col, B.y + L.shB, K.bar.w, K.bar.h); }
}
// The friend box is in the bottom left corner, and a left list (Q, W: up to 11 rows, 262 to 528 px down) opens over its top: both must show (card space-game-w-list-covers-friend-box, found by 8-GEN's batch).
// While a left list that reaches the box is open, the box steps right of it (CAMP.tdisp.beside px from the list's edge) at the same height; when the list closes it goes back. The list's own height is read from what it
// drew (s.pnl.view.total rows); before it has drawn, the full height is taken. A right list never reaches this corner.
function campFdispDx(s) {
  const P = s.pn, K = CAMP.tdisp; if (!P || typeof campPanelOpen !== 'function' || typeof campPanelDef !== 'function' || typeof campPanelsGeometry !== 'function') return 0;
  const id = campPanelOpen(P), def = id ? campPanelDef(id) : null; if (!def || def.side === 'right') return 0;
  const G = campPanelsGeometry(def, s.pnl && s.pnl.view ? s.pnl.view.total : 0), B = campTdispBox(true);
  return G.x < B.x + B.w && G.x + G.w > B.x && G.y < B.y + B.h && G.y + G.h > B.y ? G.x + G.w + K.beside - B.x : 0;
}
function campTdispSync(s, now) { campTdispShow(s, now, 'tdisp', false, () => campTdispSubject(s.camp, s.pn, now)); } // the target display, bottom right
function campFdispSync(s, now) { campTdispShow(s, now, 'fdisp', true, () => campFdispSubject(s.camp)); } // the friend display, bottom left: the ship A or D picked (src/camptdisp.js campFdispSubject)
function campTdispShow(s, now, slot, left, subject) { // one display: its objects are kept in scene.hud[slot]; the ship is read when first shown and every CAMP.tdisp.every ms after
  const C = s.camp, K = CAMP.tdisp; if (!C || !s.hud || !s.add) return;
  const V = s.hud[slot] || (s.hud[slot] = Object.assign(campTdispMake(s), { left })), sub = campTdispOn(s) ? subject() : null;
  const dx = left ? campFdispDx(s) : 0; if (V.dx !== dx) { V.dx = dx; V.gkey = ''; } // the friend box steps right of an open left list, and is drawn again there
  if (!sub) { if (V.id || V.gkey) campTdispHide(V); return; }
  if (sub.all) return campFdispAll(s, now, V, sub); // Q: all three pilots
  if (V.allOn) { campFdispRowsHide(V); V.allOn = false; V.gkey = ''; V.id = ''; } // back to one ship: the rows go, the frame and the texts are made again
  if (V.id !== sub.u.id || V.side !== sub.side || now - V.at >= K.every) { V.info = campTdispInfo(C, sub.u, sub.side); V.id = sub.u.id; V.side = sub.side; V.at = now; } // a new ship is read at once, the same one four times a second
  const info = V.info, B = campTdispBox(left, V.dx), L = CAMP_TDISP_LAY, ink = K.ink[info.side === 'hostile' ? 'hostile' : 'friend'];
  const gkey = info.side + '|' + info.hull.now + '|' + info.hull.max + '|' + (info.shield ? info.shield.now + '/' + info.shield.max : '-');
  if (V.gkey !== gkey) { V.gkey = gkey; campTdispDraw(V, info); }
  const at = (o, p, text, color) => { campLabel(o, text, color); o.setPosition(B.x + p[0], B.y + p[1]).setVisible(true); };
  at(V.name, L.name, info.name, ink); at(V.type, L.type, info.type); at(V.hullL, [L.col, L.hullL], uiText('camp.tdisp.hull')); at(V.hullN, [L.col, L.hullN], info.hull.now + ' / ' + info.hull.max);
  at(V.shL, [L.col, L.shL], uiText('camp.tdisp.shield')); at(V.shN, [L.col, L.shN], info.shield ? info.shield.now + ' / ' + info.shield.max : uiText('camp.tdisp.noshield'), info.shield ? '#e8f6ff' : '#7f95a8');
  at(V.km, L.km, uiText('camp.tdisp.km', { km: info.km })); at(V.doing, L.doing, info.doing, ink);
  if (V.kind !== info.kind + '|' + info.id && s.textures && typeof s.texOf === 'function') { // the picture: the ship's own art, its nose up, to fit the frame (and in its squad's colour for a fighter)
    V.kind = info.kind + '|' + info.id; const look = (typeof CAMP_LOOK === 'object' && CAMP_LOOK[info.kind]) || {}, u = C.by[info.id], sq = u && u.kind === 'fighter' && u.team === 'earth' && u.squad ? CAMP.wing.squadColor[u.squad] : 0;
    V.pic.setTexture(s.texOf(info.kind)); V.pic.setRotation(-Math.PI / 2); if (sq || look.tint) V.pic.setTint(sq || look.tint); else V.pic.clearTint();
    V.pic.setScale((K.pic - 8) / Math.max(1, V.pic.width, V.pic.height));
  }
  V.pic.setPosition(B.x + L.pic[0] + K.pic / 2, B.y + L.pic[1] + K.pic / 2).setVisible(true);
}

// ---- the display for Q: All pilots (card space-game-q-all-pilots-panel; Troy, 23 Nov 2026: Q picks all three pilots, "All pilots with each pilot's name and hull") ----
// The same box and frame, with the title (camp.sel.all) where a ship's name goes and, under it, a row for each pilot out: the pilot's name, its hull numbers and a hull bar the box's width. Nothing else: no picture, no type, no order.
// With no pilot out it is the title alone. The rows' texts are made the first time they are wanted (three at most) and kept in V.rows.
const CAMP_FDISP_ALL = { first: 40, pitch: 50, name: 10, numRight: 190, bar: { x: 10, dy: 22, w: 180, h: 9 } }; // px from the box's top left corner: the first row's top and the step to the next, the name's x, the numbers' right end, the bar under the name
function campFdispRows(s, V, n) {
  const K = CAMP.tdisp, mk = (o, d) => o.setScrollFactor(0).setDepth(K.depth + d); V.rows = V.rows || [];
  while (V.rows.length < n) V.rows.push({ name: mk(s.add.text(0, 0, '', uiFont(14, '#ffffff', { fontStyle: 'bold' })), 2).setVisible(false), num: mk(s.add.text(0, 0, '', uiFont(12, '#e8f6ff')), 2).setOrigin(1, 0).setVisible(false) });
  return V.rows;
}
function campFdispRowsHide(V) { (V.rows || []).forEach(r => { r.name.setVisible(false); r.num.setVisible(false); }); }
function campFdispAll(s, now, V, sub) {
  const C = s.camp, K = CAMP.tdisp, A = CAMP_FDISP_ALL, B = campTdispBox(V.left, V.dx), L = CAMP_TDISP_LAY;
  if (V.id !== 'all' || now - V.at >= K.every) { V.info = campFdispAllInfo(C, sub.all); V.id = 'all'; V.side = 'friend'; V.at = now; } // read when first shown and four times a second after
  const info = V.info, rows = campFdispRows(s, V, info.rows.length);
  if (!V.allOn) { [V.pic, V.type, V.hullL, V.hullN, V.shL, V.shN, V.km, V.doing].forEach(o => o.setVisible(false)); V.allOn = true; V.gkey = ''; V.kind = ''; } // the single ship's parts go, and its picture is set again when one comes back
  if (V.gkey !== info.key) { // the frame and the bars are drawn again only when a pilot or a number changes
    V.gkey = info.key; campTdispFrame(V, K.color.friend);
    info.rows.forEach((r, i) => campTdispBar(V.g, B.x + A.bar.x, B.y + A.first + i * A.pitch + A.bar.dy, A.bar.w, A.bar.h, r.hull.share, CAMP.charge.color[campChargeBand(r.hull.share)]));
  }
  campLabel(V.name, info.name, K.ink.friend); V.name.setPosition(B.x + L.name[0], B.y + L.name[1]).setVisible(true);
  V.rows.forEach((r, i) => {
    const row = info.rows[i]; if (!row) { r.name.setVisible(false); r.num.setVisible(false); return; }
    campLabel(r.name, row.name); r.name.setPosition(B.x + A.name, B.y + A.first + i * A.pitch).setVisible(true);
    campLabel(r.num, row.hull.now + ' / ' + row.hull.max); r.num.setPosition(B.x + A.numRight, B.y + A.first + i * A.pitch + 2).setVisible(true);
  });
}
