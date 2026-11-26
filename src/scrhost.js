// ---------- The new screens, the DOM half: one panel host for the menus (landing F of the new screens; card space-game-screens-f-foundation) ----------
// The page HUD (src/camppagehud.js) makes its panels only inside the Campaign scene, in play and pause; the Title, the ready room, the cards and Settings have no DOM at all. This is the host they will share: ONE root over the
// canvas rectangle (src/screens.css: the menus' own em, 1.5 percent of the width against the flight HUD's 1.12), pointer-events none on the root and auto on the tiles and chips that have a handler, no element focusable (a
// focused element would take the keys the scene reads), the HUD's element maker and diff-writer reused (campPageHudEl, campPageHudSet: a value is written only when it changed). Nothing mounts it yet: a piece of the new
// screens calls scrHostMount(scene) when its screen opens and scrHostDrop(scene) when it closes (the host drops itself with the scene).
//   scrHostBox(rect, W)         PURE: where the root goes for a canvas rectangle { left, top, width, height }: { left, top, width, height, em, k } (em: the root's font size in px; k: screen px for a game px, W the game's width 1280)
//   scrHostBuild(doc)           the root and nothing in it: { doc, root, at: 0 }
//   scrHostMount(scene)         the host of a scene, made once and fitted to its canvas (every call places it again); null where the scene has no canvas or the page no document
//   scrHostDrop(scene)          the root off the page
//   scrHostEl(R, tag, cls, parent), scrHostSet(el, prop, value)    an element, and the diff-writer
//   scrHostChip(R, parent, chip), scrHostRing(R, parent, ring), scrHostMeter(R, parent, meter), scrHostPill(R, parent, pill), scrHostTile(R, parent, o)    the pieces a screen is made of, from the models of src/screens.js
const SCRHOST = { em: 0.015, z: 6, W: 1280, cls: 'sc-root' };   // the menus' em (a share of the canvas's width), the root's z-index (over the flight HUD's 5, under Settings' inputs at 20), the game's width in px
function scrHostBox(rect, W) {
  const r = rect || {}, w = Math.max(0, +r.width || 0), h = Math.max(0, +r.height || 0), gw = W > 0 ? W : SCRHOST.W;
  return { left: Math.round(+r.left || 0), top: Math.round(+r.top || 0), width: Math.round(w), height: Math.round(h), em: Math.round(w * SCRHOST.em * 100) / 100, k: w / gw };
}
function scrHostBuild(doc) {
  const root = campPageHudEl(doc, 'div', SCRHOST.cls, null);
  root.setAttribute('aria-hidden', 'true'); // a picture of the game, not a page: the keys are the game's (nothing here takes focus)
  return { doc, root, at: 0 };
}
const scrHostEl = (R, tag, cls, parent) => campPageHudEl(R.doc, tag, cls, parent || R.root);
const scrHostSet = (el, prop, v) => campPageHudSet(el, prop, v);
function scrHostFit(R, canvas) { // the root over the canvas rectangle, at the menus' font size; while a scene has taken the window's shape (src/fillwindow.js) it is the 1280 by 720 safe area in the middle of the canvas: the panels keep their layout and their size on the glass, beside what the canvas draws there
  if (!R || !canvas || typeof canvas.getBoundingClientRect !== 'function') return null;
  const b = scrHostBox((typeof fillSafeRect === 'function' ? fillSafeRect(canvas) : canvas.getBoundingClientRect()), SCRHOST.W), set = scrHostSet, root = R.root;
  set(root, 'display', ''); set(root, 'left', b.left + 'px'); set(root, 'top', b.top + 'px'); set(root, 'width', b.width + 'px'); set(root, 'height', b.height + 'px'); set(root, 'fontSize', b.em + 'px');
  return b;
}
function scrHostMount(s) {
  if (!s || typeof document === 'undefined') return null;
  const canvas = s.game && s.game.canvas; if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return null;
  if (!s.scrHost) {
    s.scrHost = scrHostBuild(document); document.body.appendChild(s.scrHost.root);
    if (s.events && s.events.once) { const off = () => scrHostDrop(s); s.events.once('shutdown', off); s.events.once('destroy', off); } // a scene that ends takes its screen with it
  }
  scrHostFit(s.scrHost, canvas);
  return s.scrHost;
}
function scrHostDrop(s) {
  const R = s && s.scrHost; if (!R) return false;
  if (R.root && R.root.parentNode) R.root.parentNode.removeChild(R.root);
  s.scrHost = null; return true;
}
// a key chip: the cap of a role of the key table (scrChip), never typed in a screen
function scrHostChip(R, parent, chip) { const e = scrHostEl(R, 'span', 'sc-k', parent); scrHostSet(e, 'text', chip ? chip.k : ''); if (chip) e.setAttribute('data-key', chip.id); return e; }
function scrHostRing(R, parent, ring) { // a ring: the hull or a share in a colour, a word or a number inside
  const e = scrHostEl(R, 'div', 'sc-ring', parent), t = scrHostEl(R, 'span', '', e);
  scrHostSet(e, '--v', String(ring ? ring.v : 0)); scrHostSet(e, '--c', 'var(--sc-' + (ring ? ring.tone : 'good') + ')'); scrHostSet(t, 'text', ring ? ring.text : '');
  return e;
}
function scrHostMeter(R, parent, m) { const e = scrHostEl(R, 'div', 'sc-m', parent), i = scrHostEl(R, 'i', '', e); scrHostSet(i, 'width', (m ? m.pct : 0) + '%'); scrHostSet(i, 'background', 'var(--sc-' + (m ? m.tone : 'good') + ')'); return e; }
function scrHostPill(R, parent, p) { const e = scrHostEl(R, 'span', 'sc-pill', parent); if (p && p.ok !== null) { const b = scrHostEl(R, 'b', p.ok ? 'sc-ok' : 'sc-no', e); scrHostSet(b, 'text', p.ok ? '✓' : '–'); } scrHostEl(R, 'span', '', e); scrHostSet(e.lastChild, 'text', p ? p.text : ''); return e; }
function scrHostTile(R, parent, o) { // a tile: the one thing on a screen the mouse can click (the mission list); the root lets no click through anywhere else
  o = o || {}; const e = scrHostEl(R, 'div', 'sc-tile' + (o.on ? ' on' : '') + (o.dim ? ' lock' : '') + (o.onClick ? ' act' : ''), parent);
  if (o.id != null) e.setAttribute('data-id', String(o.id));
  if (o.onClick) { e.addEventListener('click', ev => { o.onClick(o.id, ev); }); e.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); }); } // (a press never selects text or takes focus)
  return e;
}
