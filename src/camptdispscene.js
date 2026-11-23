// ---------- The scene half of the target display (card space-game-target-display; the rule is src/camptdisp.js) ----------
// The box in the bottom right corner, where the radar was: a frame (red for a hostile, cyan for a ship of yours or a neutral you are picking), the ship's name and type, a picture of it, a hull bar and a shield bar with their
// numbers, how far it is and the line of what it is doing. Nothing selected, nothing drawn: the corner is empty. It is read when a ship is first shown and four times a second after (CAMP.tdisp.every), the frame and the bars
// are drawn again only when the ship, the side or a number changes, and every text is set through campLabel (src/camptextguard.js), so a steady box costs nothing. It is on the screen's own camera (scroll factor 0), over the
// edge arrows and under the lists, and hidden behind a card, the pause, the page of keys and the Tab map (the same times as the lists). The scene calls campTdispSync(scene, now) every frame; the objects are kept in
// scene.hud.tdisp (a scene that starts again has a new hud: the old are destroyed with it). Nothing here decides anything.
function campTdispBox() { const K = CAMP.tdisp; return { x: W - K.right - K.w, y: H - K.bottom - K.h, w: K.w, h: K.h }; } // the box on the screen (also the rectangle the edge arrows' labels keep out of: inside CAMP.nav.arrow.keep)
const CAMP_TDISP_LAY = { name: [10, 8], type: [10, 29], pic: [10, 50], col: 96, hullL: 50, hullB: 63, hullN: 74, shL: 92, shB: 105, shN: 116, km: [10, 136], doing: [10, 160], wrap: 180 }; // where each part is, in px from the box's top left corner
function campTdispMake(s) {
  const K = CAMP.tdisp, mk = (o, d) => o.setScrollFactor(0).setDepth(K.depth + (d || 0)), tx = (size, color, st) => mk(s.add.text(0, 0, '', uiFont(size, color, st)), 2).setVisible(false);
  return { g: mk(s.add.graphics()), pic: mk(s.add.image(0, 0, 'ship'), 1).setVisible(false), name: tx(16, '#ffffff', { fontStyle: 'bold' }), type: tx(12, '#9fbdd1'), hullL: tx(11, '#9fbdd1'), hullN: tx(11, '#e8f6ff'), shL: tx(11, '#9fbdd1'), shN: tx(11, '#e8f6ff'), km: tx(14, '#e8f6ff'), doing: tx(12, '#ffffff', { wordWrap: { width: CAMP_TDISP_LAY.wrap } }), at: -1e9, id: '', side: '', info: null, gkey: '', kind: '' };
}
function campTdispOn(s) { return s.mode === 'play' && !s.mp && !(typeof s.hudHides === 'function' && s.hudHides()) && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)); }
function campTdispHide(V) { V.g.clear(); V.gkey = ''; V.id = ''; V.info = null; [V.pic, V.name, V.type, V.hullL, V.hullN, V.shL, V.shN, V.km, V.doing].forEach(o => o.setVisible(false)); }
function campTdispDraw(V, info) { // the frame, the picture's frame and the two bars
  const K = CAMP.tdisp, B = campTdispBox(), L = CAMP_TDISP_LAY, g = V.g, col = K.color[info.side === 'hostile' ? 'hostile' : 'friend'];
  g.clear(); g.fillStyle(0x04101c, 0.9).fillRoundedRect(B.x, B.y, B.w, B.h, 7); g.lineStyle(2, col, 0.9).strokeRoundedRect(B.x, B.y, B.w, B.h, 7);
  g.fillStyle(0x0a1a2a, 0.95).fillRect(B.x + L.pic[0], B.y + L.pic[1], K.pic, K.pic); g.lineStyle(1, col, 0.5).strokeRect(B.x + L.pic[0], B.y + L.pic[1], K.pic, K.pic);
  const bar = (y, share, color) => { g.fillStyle(0x16293d, 1).fillRect(B.x + L.col, B.y + y, K.bar.w, K.bar.h); g.fillStyle(color, 1).fillRect(B.x + L.col, B.y + y, Math.max(share > 0 ? 1 : 0, Math.round(K.bar.w * share)), K.bar.h); g.lineStyle(1, 0x38e1ff, 0.4).strokeRect(B.x + L.col, B.y + y, K.bar.w, K.bar.h); };
  bar(L.hullB, info.hull.share, CAMP.charge.color[campChargeBand(info.hull.share)]);
  if (info.shield) bar(L.shB, info.shield.share, 0x7fe9ff); else { g.fillStyle(0x16293d, 0.5).fillRect(B.x + L.col, B.y + L.shB, K.bar.w, K.bar.h); }
}
function campTdispSync(s, now) {
  const C = s.camp, P = s.pn, K = CAMP.tdisp; if (!C || !s.hud || !s.add) return;
  const V = s.hud.tdisp || (s.hud.tdisp = campTdispMake(s)), sub = campTdispOn(s) ? campTdispSubject(C, P, now) : null;
  if (!sub) { if (V.id || V.gkey) campTdispHide(V); return; }
  if (V.id !== sub.u.id || V.side !== sub.side || now - V.at >= K.every) { V.info = campTdispInfo(C, sub.u, sub.side); V.id = sub.u.id; V.side = sub.side; V.at = now; } // a new ship is read at once, the same one four times a second
  const info = V.info, B = campTdispBox(), L = CAMP_TDISP_LAY, ink = K.ink[info.side === 'hostile' ? 'hostile' : 'friend'];
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
