// ---------- Campaign: the corner panels on the screen (card space-game-layout-fleet; the rule and the registry are src/campcorner.js, the numbers CAMP.corner) ----------
// campCornerSync(scene, now) is called every frame by the Campaign scene: for each registered corner it draws the title row (the key-cap chips, the title, the selection written beside it, which never fade) and, while they are
// open, the details under it (a frame, then the items: a name with a number and a bar, a line of text, a key chip and its word) with the strength campCornerNow gives, so they fade out. Nothing here decides anything. The objects are kept in
// scene.hud.corner[id] (a scene that starts again has a new hud); the frame and the bars are drawn again only when something they show changes, and every text is set through campLabel (src/camptextguard.js). Shown at the same times
// as the target display (campTdispOn: not behind a card, the pause, the page of keys or the Tab map), and a left corner steps right of an open left list as the who box did (campBoxDx, src/camptdispscene.js).
function campCornerMake(s) {
  const K = CAMP.corner, mk = (o, d) => o.setScrollFactor(0).setDepth(K.depth + d), tx = (size, color, st) => mk(s.add.text(0, 0, '', uiFont(size, color, st)), 2).setVisible(false);
  return { g: mk(s.add.graphics(), 0), chips: [], title: tx(12, '#9fbdd1', { fontStyle: 'bold' }), sel: tx(14, '#ffffff', { fontStyle: 'bold' }), rows: [], words: [], gkey: '', tx, meas: { b: tx(14, '#ffffff', { fontStyle: 'bold' }), p: tx(13, '#ffffff') } }; // words: the line's words (FLEET), meas: two hidden texts the line is measured with, bold 14 and plain 13
}
function campCornerRow(V, i) { // the texts of one detail line, made the first time it is wanted and kept
  while (V.rows.length <= i) V.rows.push({ name: V.tx(14, '#ffffff', { fontStyle: 'bold' }), num: V.tx(12, '#e8f6ff').setOrigin(1, 0), text: V.tx(12, '#9fbdd1'), cap: V.tx(12, '#02101c', { fontStyle: 'bold' }).setOrigin(0.5), label: V.tx(13, '#e8f6ff') });
  return V.rows[i];
}
function campCornerHide(V) { if (!V.gkey && !V.on) return; V.g.clear(); V.gkey = ''; V.on = false; [V.title, V.sel].concat(V.chips, V.words).forEach(o => o.setVisible(false)); V.rows.forEach(r => [r.name, r.num, r.text, r.cap, r.label].forEach(o => o.setVisible(false))); }
function campCornerSync(s, now) {
  const C = s.camp; if (!C || !s.hud || !s.add || typeof CAMP_CORNERS === 'undefined') return;
  const all = s.hud.corner || (s.hud.corner = {}), on = campTdispOn(s), Ns = {}, ext = on ? campCornerListUnder(s, now) : null;
  CAMP_CORNERS.forEach(d => { Ns[d.id] = on ? campCornerNow(C, d.id) : null; }); // every corner first: the second row of a stack sits as far down as the first row's details are open
  CAMP_CORNERS.forEach(d => { const V = all[d.id] || (all[d.id] = campCornerMake(s)), N = Ns[d.id]; if (!N) campCornerHide(V); else campCornerDraw(s, V, N, campCornerSlide(d.id, Ns, ext)); });
}
// the cruiser list (the first row of the left stack has no details of its own: this list hangs under it): its frame's height plus the gap, and how strong it is (it fades); null when none is open
function campCornerListUnder(s, now) {
  const P = s.pn, id = P && typeof campPanelOpen === 'function' ? campPanelOpen(P) : '', def = id && typeof campPanelDef === 'function' ? campPanelDef(id) : null;
  if (!def || def.corner !== 'tl' || campCornerDrawsList(id) || typeof campPanelsGeometry !== 'function') return null;
  const V = s.pnl && s.pnl.view, G = campPanelsGeometry(def, V ? V.total : 0, V ? V.pick : false), k = typeof campPanelFade === 'function' ? campPanelFade(P, now) : 1;
  return { h: G.h + CAMP.corner.gap, k };
}
function campCornerDraw(s, V, N, dy) {
  const K = CAMP.corner, T = K.title, left = N.at.charAt(1) === 'l', dx = campBoxDx(s, left), G = campCornerGeom(N.at, campCornerItemsH(N.items), dx, dy, N.span), g = V.g, o = N.open, T0 = G.title; V.on = true;
  const cy = T0.y + (T0.h - T.chipH) / 2, chipX = i => T0.x + T.pad + i * (T.chipW + T.chipGap);
  let CL, WL = []; // CL: the chips as drawn { x, cap, ok }; WL: the words of a line
  if (N.line) { // a LINE (FLEET: card space-game-fleet-sentence): chips and words from the left, never fading; the title and the selection are not drawn
    const mt = sg => (sg.bold ? V.meas.b : V.meas.p), L = campCornerLineLayout(N.line, T0, (t, sg) => { const m = mt(sg); m.setText(t); return m.width || t.length * (sg.bold ? 8.4 : 7); });
    CL = L.chips; WL = L.words; V.title.setVisible(false); V.sel.setVisible(false);
    while (V.words.length < WL.length) { const w = WL[V.words.length]; V.words.push(V.tx(w.size, w.ink, w.bold ? { fontStyle: 'bold' } : {})); } // (a word's size and weight are the first ones its place in the line was made with)
    V.words.forEach((w, i) => { if (i >= WL.length) w.setVisible(false); });
    WL.forEach((w, i) => { const o2 = V.words[i]; campLabel(o2, w.text, w.ink); o2.setPosition(w.x, T0.y + (T0.h - w.size - 2) / 2).setVisible(true); });
  } else {
    V.words.forEach(w => w.setVisible(false)); CL = N.chips.map((cap, i) => ({ x: chipX(i), cap, ok: true }));
    const slots = Math.max(T.chips, N.chips.length), after = T0.x + T.pad + slots * (T.chipW + T.chipGap) - T.chipGap + T.gap; // the chip column is the same width in every corner (CAMP.corner.title.chips), so the titles start at the same x
    campLabel(V.title, N.title, '#9fbdd1'); V.title.setPosition(after, T0.y + (T0.h - 14) / 2).setVisible(true);
    const selX = after + (V.title.width || N.title.length * 8) + T.gap, room = T0.x + T0.w - T.pad - selX; // the selection has this much room, to the frame's inner edge: a longer name is cut short with an ellipsis (it ran off the screen)
    if (N.selection) { const k = N.selection + '|' + Math.round(room); if (V.selK !== k) { V.selK = k; campLabel(V.sel, N.selection, '#ffffff'); V.selV = V.sel.width > room ? campCornerFit(N.selection, room, str => { V.sel.setText(str); return V.sel.width; }) : N.selection; } campLabel(V.sel, V.selV, '#ffffff'); } // (worked out when the name or the room changes, not every frame)
    else campLabel(V.sel, '', '#ffffff');
    V.sel.setPosition(selX, T0.y + (T0.h - 16) / 2).setVisible(!!N.selection);
  }
  while (V.chips.length < CL.length) V.chips.push(V.tx(12, '#02101c', { fontStyle: 'bold' }).setOrigin(0.5));
  V.chips.forEach((c, i) => { if (i >= CL.length) c.setVisible(false); });
  CL.forEach((c, i) => { const t = V.chips[i]; campLabel(t, c.cap, c.ok ? '#02101c' : '#9fb4c4'); t.setPosition(c.x + T.chipW / 2, cy + T.chipH / 2).setVisible(true); });
  const key = [CL.map(c => [c.x, c.cap, c.ok].join(':')).join(), N.title, dx, Math.round(T0.y), G.det ? G.det.h : 0, Math.round(o * 20), N.items.map(it => [campCornerKind(it), it.name || it.text || it.cap, it.num || it.label || '', Math.round((it.share || 0) * 100), it.color, it.ok, it.sel, it.cap, it.capOk].join(':')).join('|')].join('#');
  if (V.gkey !== key) { // the frame, the chips, the bars: drawn again when something they show changes
    V.gkey = key; g.clear();
    g.fillStyle(0x04101c, 0.85).fillRoundedRect(T0.x, T0.y, T0.w, T0.h, 6); g.lineStyle(1, 0x38e1ff, 0.45).strokeRoundedRect(T0.x, T0.y, T0.w, T0.h, 6);
    CL.forEach(c => g.fillStyle(c.ok ? K.chip : 0x2a3b4c, c.ok ? 0.95 : 0.9).fillRoundedRect(c.x, cy, T.chipW, T.chipH, 4));
    if (G.det && o > 0) {
      const D = G.det; g.fillStyle(0x04101c, 0.9 * o).fillRoundedRect(D.x, D.y, D.w, D.h, 7); g.lineStyle(2, K.chip, 0.9 * o).strokeRoundedRect(D.x, D.y, D.w, D.h, 7);
      let y = D.y + K.pad;
      N.items.forEach(it => {
        const kind = campCornerKind(it);
        if (kind === 'bar') { const bx = D.x + K.pad, bw = D.w - K.pad * 2, by = y + K.bar.dy; g.fillStyle(0x16293d, o).fillRect(bx, by, bw, K.bar.h); g.fillStyle(it.color || 0x6dff9c, o).fillRect(bx, by, Math.max(it.share > 0 ? 1 : 0, Math.round(bw * (it.share || 0))), K.bar.h); g.lineStyle(1, 0x38e1ff, 0.4 * o).strokeRect(bx, by, bw, K.bar.h); }
        const capOk = it.capOk !== undefined ? it.capOk : it.ok !== false; // a digit chip is grey when its digit does nothing now
        if (kind === 'key') g.fillStyle(capOk ? K.chip : 0x2a3b4c, (capOk ? 0.95 : 0.9) * o).fillRoundedRect(D.x + K.pad, y + 4, T.chipW + 2, T.chipH, 4);
        else if (kind === 'bar' && it.cap) g.fillStyle(capOk ? K.chip : 0x2a3b4c, (capOk ? 0.95 : 0.9) * o).fillRoundedRect(D.x + K.pad, y, T.chipW + 2, T.chipH, 4); // a pilot's digit, level with the name
        y += K.item[kind] || K.item.text;
      });
    }
  }
  let i = 0, y = G.det ? G.det.y + K.pad : 0; const D = G.det;
  if (D && o > 0) N.items.forEach(it => {
    const kind = campCornerKind(it), r = campCornerRow(V, i++), x = D.x + K.pad;
    const capOk = it.capOk !== undefined ? it.capOk : it.ok !== false, nx = x + (it.cap ? T.chipW + 10 : 0); // a bar with a digit chip: the name starts after the chip
    if (kind === 'bar') { campLabel(r.name, it.name, it.sel ? '#9fe9ff' : it.ok === false ? '#7f95a8' : '#ffffff'); r.name.setPosition(nx, y).setAlpha(o).setVisible(true); campLabel(r.num, it.num, '#e8f6ff'); r.num.setPosition(D.x + D.w - K.pad, y + 2).setAlpha(o).setVisible(true); [r.text, r.label].forEach(t => t.setVisible(false)); if (it.cap) { campLabel(r.cap, it.cap, capOk ? '#02101c' : '#9fb4c4'); r.cap.setPosition(x + (T.chipW + 2) / 2, y + T.chipH / 2).setAlpha(o).setVisible(true); } else r.cap.setVisible(false); }
    else if (kind === 'key') { campLabel(r.cap, it.cap, capOk ? '#02101c' : '#9fb4c4'); r.cap.setPosition(x + (T.chipW + 2) / 2, y + 4 + T.chipH / 2).setAlpha(o).setVisible(true); campLabel(r.label, it.label, it.sel ? '#9fe9ff' : it.ok === false ? '#7f95a8' : '#e8f6ff'); r.label.setPosition(x + T.chipW + 8, y + 5).setAlpha(o).setVisible(true); [r.name, r.num, r.text].forEach(t => t.setVisible(false)); }
    else { campLabel(r.text, it.text, it.ink || '#9fbdd1'); r.text.setPosition(x, y + 2).setAlpha(o).setVisible(true); [r.name, r.num, r.cap, r.label].forEach(t => t.setVisible(false)); }
    y += K.item[kind] || K.item.text;
  });
  for (; i < V.rows.length; i++) { const r = V.rows[i]; [r.name, r.num, r.text, r.cap, r.label].forEach(t => t.setVisible(false)); } // lines no longer wanted
}
