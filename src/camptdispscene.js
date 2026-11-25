// ---------- The room the target corners take, and when they are shown (card space-game-target-display, then space-game-layout-targets; the rule is src/camptdisp.js) ----------
// The target display was a box of its own in the bottom right corner, where the radar was. It is two corners of the corner panel now: [ ] HOSTILES at the top right and O P FRIENDLIES at the bottom right (card space-game-layout-targets:
// src/camptcorner.js is their rule, src/campcorner.js and src/campcornerscene.js the panel that draws them, src/camptcornerscene.js the ship's picture in their details). What is left here is what those scenes share:
//   campTdispBox(left, dx)  the rectangle of the right stack of corner rows (] HOSTILES and [ FRIENDLIES at the top right; the edge arrows' labels keep out of it, CAMP.nav.arrow.keep) or, with left, the left stack (Q CRUISER and W FLEET at the top left)
//   campTdispOn(s)          true while the corners are shown: in play, not behind a card, the pause, the page of keys or the Tab map (the same times as the lists)
//   campBoxDx(s, left)      how far a corner steps out of an open list's way
function campTdispBox(left, dx) { const C = CAMP.corner, a = left ? C.at.tl : C.at.tr, b = left ? C.at.bl : C.at.tr; return { x: a.x + (dx || 0), y: a.y, w: C.w, h: b.y + C.title.h - a.y }; } // (the right stack is one row now: HOSTILES) // a rectangle on the screen: the room a STACK of two corner rows takes when no details are open (card space-game-keys5-corners: Q CRUISER and W FLEET at the left, ] HOSTILES and [ FRIENDLIES at the right, both at the top); the edge arrows' labels keep out of it (CAMP.nav.arrow.keep) and an open list that reaches it makes the corners step aside (campBoxDx); dx moves it sideways
function campTdispOn(s) { return s.mode === 'play' && !s.mp && !(typeof s.hudHides === 'function' && s.hudHides()) && !(typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)); }
// A box that an open list reaches steps out of its way, at the same height, and goes back when the list closes (cards space-game-w-list-covers-friend-box, found by 8-GEN's batch, and space-game-keys-panels): the WHO box
// (bottom left) steps right of an open left list (the cruiser list), the target box (bottom right) steps left of an open right list that reaches it. CAMP.tdisp.beside px from the list's edge. The list's own height is read from what it drew (s.pnl.view.total rows); before it has drawn, the full height is taken.
function campBoxDx(s, left) {
  const P = s.pn, K = CAMP.tdisp; if (!P || typeof campPanelOpen !== 'function' || typeof campPanelDef !== 'function' || typeof campPanelsGeometry !== 'function') return 0;
  const id = campPanelOpen(P), def = id ? campPanelDef(id) : null; if (!def || def.corner || (typeof campCornerDrawsList === 'function' && campCornerDrawsList(id)) || (def.side === 'right') === !!left) return 0; // (a list that hangs under its own corner's row, the cruiser's, moves nothing: the row under it slides down instead, campCornerSlide) // a left list moves the left box, a right list the right ones
  const G = campPanelsGeometry(def, s.pnl && s.pnl.view ? s.pnl.view.total : 0, s.pnl && s.pnl.view ? s.pnl.view.pick : false), B = campTdispBox(left, 0);
  if (!(G.x < B.x + B.w && G.x + G.w > B.x && G.y < B.y + B.h && G.y + G.h > B.y)) return 0;
  return left ? G.x + G.w + K.beside - B.x : G.x - K.beside - B.w - B.x;
}
