// ---------- The scene half of the target corners: the ship's picture (card space-game-layout-targets; the rule is src/camptcorner.js, the panel src/campcornerscene.js) ----------
// The details of [ ] HOSTILES and O P FRIENDLIES have one row the corner panel cannot draw: the picture. campTcornerSync(scene, now) is called every frame after campCornerSync: where the details are open and have a { kind: 'pic' }
// row, it draws the ship's own art (nose up, to fit CAMP.tdisp.pic, in its squad's colour for a fighter) in a frame in the box's colour (red for a hostile, cyan for a friendly), and beside it the ship's name (only for a ship an
// order's list is on: the held one's is beside the title), its type and how far it is. The row's place is read from the panel's own geometry (campCornerGeom), so it follows the details when a list pushes them aside and fades
// with them (the strength is the panel's). Nothing here decides anything. The objects are kept in scene.hud.tcorner[id]; the frame is drawn again only when it moves, changes colour or fades; every text is set through campLabel.
const CAMP_TCORNER_IDS = ['hostiles', 'friendlies'];
function campTcornerMake(s) {
  const K = CAMP.corner, mk = (o, d) => o.setScrollFactor(0).setDepth(K.depth + d), tx = (size, color, st) => mk(s.add.text(0, 0, '', uiFont(size, color, st)), 3).setVisible(false);
  return { g: mk(s.add.graphics(), 3), pic: mk(s.add.image(0, 0, 'ship'), 4).setVisible(false), name: tx(14, '#ffffff', { fontStyle: 'bold' }), type: tx(12, '#9fbdd1', { wordWrap: { width: 100 } }), km: tx(14, '#e8f6ff'), gkey: '', ship: '' };
}
function campTcornerHide(V) { if (!V.gkey && !V.on) return; V.g.clear(); V.gkey = ''; V.on = false; V.ship = ''; [V.pic, V.name, V.type, V.km].forEach(o => o.setVisible(false)); }
function campTcornerSync(s, now) {
  const C = s.camp; if (!C || !s.hud || !s.add || typeof campCornerNow !== 'function') return;
  const all = s.hud.tcorner || (s.hud.tcorner = {}), on = campTdispOn(s);
  CAMP_TCORNER_IDS.forEach(id => {
    const V = all[id] || (all[id] = campTcornerMake(s)), N = on ? campCornerNow(C, id) : null, it = N && N.open > 0 ? N.items.find(x => x.kind === 'pic') : null;
    if (!it) campTcornerHide(V); else campTcornerDraw(s, V, N, it);
  });
}
function campTcornerDraw(s, V, N, it) {
  const K = CAMP.corner, P = CAMP.tdisp.pic, left = N.at.charAt(1) === 'l', G = campCornerGeom(N.at, campCornerItemsH(N.items), campBoxDx(s, left)), D = G.det; if (!D) return campTcornerHide(V);
  let y = D.y + K.pad; for (const x of N.items) { if (x === it) break; y += K.item[campCornerKind(x)] || K.item.text; } // the row's top: under the items above it
  const x0 = D.x + K.pad, o = N.open, col = CAMP.tdisp.color[it.side === 'hostile' ? 'hostile' : 'friend'], ink = CAMP.tdisp.ink[it.side === 'hostile' ? 'hostile' : 'friend'], tx = x0 + P + 8, py = y + 2; V.on = true;
  const gkey = [x0, py, it.side, Math.round(o * 20)].join('|');
  if (V.gkey !== gkey) { V.gkey = gkey; V.g.clear(); V.g.fillStyle(0x0a1a2a, 0.95 * o).fillRect(x0, py, P, P); V.g.lineStyle(1, col, 0.5 * o).strokeRect(x0, py, P, P); } // the picture's frame
  const sk = it.ship + '|' + it.id;
  if (V.ship !== sk && s.textures && typeof s.texOf === 'function') { // the picture: the ship's own art, its nose up, to fit the frame (and in its squad's colour for a fighter)
    V.ship = sk; const look = (typeof CAMP_LOOK === 'object' && CAMP_LOOK[it.ship]) || {}, u = s.camp.by[it.id], sq = u && u.kind === 'fighter' && u.team === 'earth' && u.squad ? CAMP.wing.squadColor[u.squad] : 0;
    V.pic.setTexture(s.texOf(it.ship)); V.pic.setRotation(-Math.PI / 2); if (sq || look.tint) V.pic.setTint(sq || look.tint); else V.pic.clearTint();
    V.pic.setScale((P - 8) / Math.max(1, V.pic.width, V.pic.height));
  }
  V.pic.setPosition(x0 + P / 2, py + P / 2).setAlpha(o).setVisible(true);
  const put = (t, text, color, yy) => { campLabel(t, text, color); t.setPosition(tx, yy).setAlpha(o).setVisible(!!text); };
  put(V.name, it.name, ink, y + 2); put(V.type, it.type, '#9fbdd1', y + (it.name ? 22 : 6)); put(V.km, it.km, '#e8f6ff', y + 56);
}
