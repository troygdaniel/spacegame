// ---------- Campaign: the keyboard panels, the drawing (card space-game-campaign-keys-help; Troy, 20 Nov 2026) ----------
// The Phaser half of src/camppanel.js, which says WHAT a panel holds and what a key does. Key 1 draws the FLEET panel at the left edge, key 2 the SHIP panel at the right, each with a heading, a line of what you have
// (the bay and the ships out, the ore and the shield) and five rows: the row's digit on a key cap, its name, and under it its live state in a few words (what it will do, or why it cannot, greyed).
// A panel comes up only CAMP_PANELS.delay ms (250) after the key, so for a fast typist 1 then 3 never flashes it; a click on a row does the row, a click anywhere else closes it. The scene calls three things:
//   campPanelsInstall(s)       once, in create: s.pn is the state (campPanelNew); the pointer is listened for and given back when the scene shuts down
//   campPanelsPaint(s, now)    every frame: draws the open panel once it is due, keeps its words live (four times a second), takes it away when it is closed
//   campPanelsClose(s)         a card coming up, the map, the end: the panel goes
const CAMPPANELS_LOOK = { w: 300, top: 238, bottomPad: 14, headH: 58, row: 46, left: 24, depth: 160, every: 250, color: { left: CYAN, right: AMBER } }; // px; the HUD's gauges take the top left (to 176) and the radar the top right (to 226)

function campPanelsGeometry(def) {
  const K = CAMPPANELS_LOOK, h = K.headH + def.rows.length * K.row + K.bottomPad, x = def.side === 'right' ? W - K.left - K.w : K.left;
  return { x, y: K.top, w: K.w, h, rowY: n => K.top + K.headH + (n - 1) * K.row };
}
function campPanelsInstall(s) {
  s.pn = campPanelNew(); s.pnl = { objs: [], id: '', at: -1e9, rows: [] };
  s.pnl.onPointer = p => campPanelsClick(s, p.x, p.y);
  if (s.input && s.input.on) s.input.on('pointerdown', s.pnl.onPointer);
  if (s.events && s.events.once) { const off = () => { try { if (s.input && s.input.off) s.input.off('pointerdown', s.pnl.onPointer); } catch (e) { /* gone */ } }; s.events.once('shutdown', off); s.events.once('destroy', off); }
}
function campPanelsClose(s) {
  if (!s || !s.pnl) return;
  s.pnl.objs.forEach(o => { try { o.destroy(); } catch (e) { /* gone with the scene */ } });
  s.pnl.objs = []; s.pnl.id = ''; s.pnl.rows = [];
  if (s.pn) s.pn.open = '';
}
function campPanelsPaint(s, now) {
  const P = s.pn, L = s.pnl; if (!P || !L) return;
  if (!campPanelShown(P, now)) { if (L.objs.length) { L.objs.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }); L.objs = []; L.id = ''; L.rows = []; } return; }
  const def = campPanelDef(P.open), K = CAMPPANELS_LOOK, G = campPanelsGeometry(def);
  if (L.id !== def.id) { // first frame of this panel: the glass, the heading and the rows are made once; after that only their words change
    L.objs.forEach(o => o.destroy()); L.objs = []; L.rows = []; L.id = def.id; L.at = -1e9;
    const own = (o, d) => { o.setScrollFactor(0).setDepth(K.depth + (d || 0)); L.objs.push(o); return o; }, col = K.color[def.side];
    hudPanel(own(s.add.graphics()), G.x, G.y, G.w, G.h, 14, 0.93, col);
    const cap = own(keyCap(s, def.key, AMBER), 2); cap.setPosition(G.x + 30, G.y + 24);
    own(s.add.text(G.x + 56, G.y + 14, def.title, uiFont(18, def.side === 'right' ? '#ffd37a' : '#7fe9ff', { letterSpacing: 3 })), 2);
    L.head = own(s.add.text(G.x + 56, G.y + 38, '', uiFont(12, '#9fbdd1')), 2);
    def.rows.forEach(r => {
      const y = G.rowY(r.n), c = own(keyCap(s, String(r.n), AMBER), 2); c.setPosition(G.x + 30, y + 14);
      const name = own(s.add.text(G.x + 56, y, r.label, uiFont(16, '#e8f6ff')), 2), state = own(s.add.text(G.x + 56, y + 21, '', uiFont(12, '#7fe9ff')), 2);
      L.rows.push({ id: r.id, name, state, x: G.x, y, w: G.w });
    });
  }
  if (now - L.at < K.every) return; L.at = now; // the words are live: four times a second is plenty
  L.head.setText(campPanelHead(s.camp, def.id));
  campPanelRows(s.camp, def.id).forEach((r, i) => { const o = L.rows[i]; o.name.setColor(r.ok ? '#e8f6ff' : '#6b7f90'); o.state.setText(r.state).setColor(r.ok ? '#7fe9ff' : '#ff9e7a'); });
}
// a click: on a row of the drawn panel it does that row (and the panel closes); anywhere else it closes the panel. true when the panel took the click.
function campPanelsClick(s, px, py) {
  const L = s.pnl, P = s.pn; if (!L || !P || !campPanelShown(P, (s.time && s.time.now) || 0) || !L.objs.length) return false;
  const def = campPanelDef(P.open), G = campPanelsGeometry(def), K = CAMPPANELS_LOOK;
  const inside = px >= G.x && px <= G.x + G.w && py >= G.y && py <= G.y + G.h, hit = inside ? def.rows.find(r => py >= G.rowY(r.n) - 2 && py < G.rowY(r.n) + K.row - 2) : null;
  if (hit) { const r = campPanelRun(s.camp, hit, 'click'); if (r && r.say) toast(s, r.say, r.ok ? '#9fe9ff' : '#ffb454'); }
  campPanelsClose(s); return true;
}
