// ---------- The ready room in the new look, the drawing half: the hub's screens as page panels over the dimmed hangar (piece c of the new screens; card space-game-screens-c-hub) ----------
// src/scrhub.js says what each screen shows; src/scrcardsdraw.js scrView draws a tree; the panel host (src/scrhost.js) is the root over the canvas. This file puts a model over the ready room scene (src/camphubscene.js) and
// keeps it there: scrHubPaint replaces the panels of the last paint (the screens are small: they are built again at each key, never written element by element), scrHubSync follows the canvas and hides the panels while
// a page of the room's own is in front (the big briefing, the H page, the tuning panel: they draw on the canvas and take the keys), scrHubDrop takes them off. A tile with a click id (the mission pick's nine, the three rows
// of the room) takes the mouse and calls the scene's own clickMission and click, so the mouse does what it always did; nothing else on the screen takes a click, nothing is focusable, and no key is read here.
//   scrHubPaint(s, model)   the model on the scene (the host is made once); false when there is no page to draw on: the scene draws the old room
//   scrHubSync(s, covered)  the host over the canvas rectangle, hidden when covered is true
//   scrHubDrop(s)           the panels off the page
function scrHubPaint(s, model) {
  const R = typeof scrHostMount === 'function' ? scrHostMount(s) : null; if (!R || !model) return false;
  if (s.scrHub && s.scrHub.el && s.scrHub.el.parentNode) s.scrHub.el.parentNode.removeChild(s.scrHub.el);
  const el = scrView(R, R.root, model, { click: id => { if (typeof id === 'string' && id.indexOf('row:') === 0) { if (typeof s.click === 'function') s.click(+id.slice(4)); } else if (typeof s.clickMission === 'function') s.clickMission(id); } });
  s.scrHub = { el, on: true, id: model.id };
  if (typeof campBriefIsOpen === 'function' && campBriefIsOpen(s)) scrHostSet(el, 'display', 'none'); // painted again under the briefing: it waits
  return !!el;
}
function scrHubSync(s, covered, under) { // covered: a page is over the screen (the H page, the tuning panel): only the screen waits; under: the one-page briefing is up (src/scrbriefdraw.js): only this screen waits, the briefing's panels are in the same host
  const R = s && s.scrHost; if (!R || !s.scrHub || s.scrHub.on !== true) return false; // (a stand-in scene of a test answers any property with a function: only a screen this file made counts)
  const canvas = s.game && s.game.canvas; if (canvas) scrHostFit(R, canvas);
  scrHostSet(s.scrHub.el, 'display', covered || under ? 'none' : ''); // the host stays: the keys page of the new look is a panel in it too (card space-game-screens-batch-fixes)
  return !covered && !under;
}
function scrHubDrop(s) {
  if (!s || !s.scrHub || s.scrHub.on !== true) return false;
  if (s.scrHub.el && s.scrHub.el.parentNode) s.scrHub.el.parentNode.removeChild(s.scrHub.el);
  s.scrHub = null; return true;
}
