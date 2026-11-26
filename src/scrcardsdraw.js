// ---------- The cards of the Campaign scene in the new look, the drawing half: a tree of nodes (src/scrcards.js) as page panels over the canvas (piece a of the new screens; card space-game-screens-a-cards) ----------
// The panel host (src/scrhost.js) is the root over the canvas rectangle; a card is ONE element in it, built from a model by scrView and taken away by the scene's own hideCard (the card list holds a handle with destroy()).
// A veil on the canvas (a dark rectangle, as the old cards had) dims the flight behind it. Nothing here takes a key or a click: the cards' keys are the scene's (src/campaignscene.js onKey), no element is focusable, and a
// tile or chip has no handler, so every click goes through to the canvas as it did.
//   scrView(R, parent, node)        a node -> its element (rows, columns, texts, chips, pills, meters, rings, stats, tiles, the star)
//   scrCardShow(s, model, veil)     the card on the scene: the veil, the panel; s.card and s.panel are what the scene's hideCard reads. false when there is no page to draw on (a test, a stand-in): the scene draws the old card
//   scrCardSync(s)                  every frame while a card is up: the host follows the canvas, and hides while the H page or the tuning panel is over the card, or the scene is paused under Settings
//   scrCardCover(s, on)             the scene's own pause and resume events
const SCRCARD = { veil: 0.5, depth: 200 };
function scrViewSet(el, st) { Object.keys(st).forEach(k => { if (st[k] !== undefined && st[k] !== '') scrHostSet(el, k, st[k]); }); }
function scrView(R, parent, n, ctx) { // ctx (optional): { click(id) } for a tile that carries a click id (the mission pick's tiles)
  if (!n) return null;
  const E = (tag, cls, p) => scrHostEl(R, tag, cls, p || parent), tone = n.tone ? ' sc-' + n.tone : '';
  let e = null;
  if (n.k === 'screen') {
    e = E('div', 'sc-scr'); // a whole screen: its kids are placed with their own `at`
  } else if (n.k === 'rule') {
    return E('div', 'sc-rule');
  } else if (n.k === 'card') {
    e = E('div', (n.bare ? 'sc-abs ' : 'sc-p sc-abs ') + (n.row ? 'sc-r' : 'sc-c') + (n.ctr ? ' sc-ctr' : ''));
    scrViewSet(e, n.at ? Object.assign({ width: n.w ? n.w + 'em' : '', gap: n.gap != null ? n.gap + 'em' : '' }, n.at) : { left: '50%', top: n.top + '%', transform: 'translateX(-50%)', width: n.w + 'em', gap: n.gap + 'em' });
  } else if (n.k === 'row') {
    e = E('div', 'sc-r' + (n.just === 'sp' ? ' sc-sp' : ''));
    scrViewSet(e, { justifyContent: n.just === 'end' ? 'flex-end' : n.just === 'ctr' ? 'center' : '', flexWrap: n.wrap ? 'wrap' : '', gap: n.gap != null ? n.gap + 'em' : '', marginLeft: n.push ? 'auto' : '', alignItems: n.stretch ? 'stretch' : '', width: n.width ? n.width + 'em' : n.full ? '100%' : '' });
  } else if (n.k === 'col') {
    e = E('div', 'sc-c'); scrViewSet(e, { gap: n.gap != null ? n.gap + 'em' : '' });
  } else if (n.k === 'text') {
    e = E('span', 'sc-' + n.cls + tone); scrHostSet(e, 'text', n.text); if (n.w) scrViewSet(e, { width: n.w + 'em', flex: 'none' }); return e;
  } else if (n.k === 'chip') {
    return scrHostChip(R, parent, { id: n.id, k: n.cap });
  } else if (n.k === 'pill') {
    e = E('span', 'sc-pill' + tone);
    if (n.lead) { const b = scrHostEl(R, 'b', n.leadTone ? 'sc-' + n.leadTone : '', e); scrHostSet(b, 'text', n.lead); }
    if (n.ok !== null && n.ok !== undefined) { const b = scrHostEl(R, 'b', n.ok ? 'sc-ok' : 'sc-no', e); scrHostSet(b, 'text', n.ok ? '✓' : '–'); }
    const t = scrHostEl(R, 'span', '', e); scrHostSet(t, 'text', n.text);
    if (n.push) scrHostSet(e, 'marginLeft', 'auto');
    return e;
  } else if (n.k === 'meter') {
    return scrHostMeter(R, parent, { pct: n.pct, tone: n.tone });
  } else if (n.k === 'ring') {
    e = scrHostRing(R, parent, { v: n.v, tone: n.tone, text: n.text }); if (n.size) scrHostSet(e, '--s', n.size); return e;
  } else if (n.k === 'stat') {
    e = E('div', 'sc-c'); scrHostSet(e, 'gap', '0'); const a = scrHostEl(R, 'span', 'sc-lab', e), b = scrHostEl(R, 'span', 'sc-t3', e); scrHostSet(a, 'text', n.label); scrHostSet(b, 'text', n.value); return e;
  } else if (n.k === 'tile') {
    const click = n.click != null && ctx && typeof ctx.click === 'function';
    e = scrHostTile(R, parent, { on: n.on, dim: n.dim, id: n.click, onClick: click ? id => ctx.click(id) : null });
    if (n.dash || n.flat) scrHostSet(e, 'cls', 'sc-tile' + (n.on ? ' on' : '') + (n.dim ? ' lock' : '') + (click ? ' act' : '') + (n.dash ? ' sc-dash' : '') + (n.flat ? ' sc-flat' : ''));
    scrViewSet(e, { flex: n.grow ? '1 1 ' + n.grow + 'em' : '', gap: n.gap != null ? n.gap + 'em' : '', alignItems: n.ctr ? 'center' : '' });
  } else if (n.k === 'star') { // the distant star of the end card: a glow and a point, and its name (CSS only, no image)
    e = E('div', 'sc-star'); scrHostEl(R, 'i', '', e); const t = scrHostEl(R, 'span', '', e); scrHostSet(t, 'text', n.text); return e;
  } else return null;
  (n.kids || []).forEach(c => { scrView(R, e, c, ctx); });
  return e;
}
function scrCardShow(s, model, veil) {
  const R = typeof scrHostMount === 'function' ? scrHostMount(s) : null; if (!R || !model) return false;
  const el = scrView(R, R.root, model); if (!el) return false;
  const rect = s.add && typeof s.add.rectangle === 'function' ? s.add.rectangle(W / 2, H / 2, W, H, 0x02060d, veil == null ? SCRCARD.veil : veil).setScrollFactor(0).setDepth(SCRCARD.depth) : null;
  const handle = { destroy() { if (el.parentNode) el.parentNode.removeChild(el); if (s.scrCard && s.scrCard.el === el) { s.scrCard = null; scrCardHideNames(s, false); } } };
  s.card = rect ? [rect, handle] : [handle]; s.panel = true; s.scrCard = { el, id: model.id, on: true };
  if (!s.scrCardEvents && s.events && typeof s.events.on === 'function') { s.scrCardEvents = true; s.events.on('pause', () => scrCardCover(s, true)); s.events.on('resume', () => scrCardCover(s, false)); } // Settings opens over the pause card: the scene is paused, no frame runs, so the panel hides at once
  scrCardCover(s, false); scrCardHideNames(s, true);
  return true;
}
function scrCardCover(s, on) { if (!s) return; s.scrCovered = !!on; if (s.scrHost) scrHostSet(s.scrHost.root, 'display', on ? 'none' : ''); }
function scrCardSync(s) {
  const R = s && s.scrHost; if (!R || !s.scrCard || s.scrCard.on !== true) return false; // (a stand-in scene of a test answers any property with a function: only a card this file made counts)
  const under = (typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)) || (typeof campTuneIsOpen === 'function' && campTuneIsOpen(s)); // the H page or the tuning panel is over the card: only the CARD waits (the keys page of the new look is a panel in this same host: hiding the host hid it too: card space-game-screens-batch-fixes)
  const canvas = s.game && s.game.canvas;
  if (s.scrCovered === true) { scrHostSet(R.root, 'display', 'none'); return false; } // the scene is paused under Settings: the whole host waits
  if (canvas) scrHostFit(R, canvas);
  scrHostSet(s.scrCard.el, 'display', under ? 'none' : '');
  scrCardHideNames(s, true); // the flight's own world names stay off the canvas under a card (they showed through the veil)
  return !under;
}
// the flight's canvas names of the worlds (EARTH, LUNA, in the canvas's monospace) are hidden while a card of the new look is up, and given back when it goes
function scrCardHideNames(s, hide) { if (Array.isArray(s.placeLabels)) s.placeLabels.forEach(o => { if (o && o.active !== false && typeof o.setVisible === 'function') o.setVisible(!hide); }); }
