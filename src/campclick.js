// ---------- Campaign: click a ship in the flight view (card space-game-click-target; Troy, 24 Nov 2026) ----------
// Troy: "allow me to select a target by clicking it on the flight view, as I zoom out", and the right click is the order key. The picks are the keys' (src/camptarget.js): an enemy or a ship you protect is THE target held
// (one at a time), a pilot is WHO. The click makes the same pick the key would, so the squares, the corner boxes and the peek (src/campselzoom.js: a ship off the screen is glided to and back, one on the screen moves nothing) are the same.
//   left click     on an enemy: it is the target held ([ ] \ do that); on a ship you protect: it is the target held (the enemy let go); on one of your pilots: that pilot is who (Q); on empty space: nothing
//   right click    on an enemy or a ship you protect: it is held, and the order key is pressed through the lists' door (src/camppanel.js): the pilots attack it or guard it, with the key's own answer and refusals;
//                  on one of your pilots: that pilot is who and no order is given (none fits your own ship); on empty space: the order key alone, which orders what is held (nothing held: form up on the cruiser)
//   the circle     CAMP.click.hit screen pixels around a ship, never smaller than the ship: a world radius of hit over the zoom, so it grows as the view zooms out and a small far ship can be hit
// A press that does not move is a click (CAMPDRAG.move, src/campdrag.js: a drag still pans); the scene's shipClick (src/campaignscene.js) turns the screen point into a world point and toasts the answer.
//   campClickWorld(cam, px, py)        the world point under a screen point: { x, y } (the camera's scroll, zoom about the middle of the screen)
//   campClickHit(C, wx, wy, zoom)      the ship under a world point: { kind: 'hostile' | 'friendly' | 'pilot', id, unit, squad (a pilot's), d } or null; the nearest to the point (an enemy before a friend when they are as near)
//   campClickPick(C, hit)              what the left click holds; true when it held something
//   campClickAct(P, C, hit, button, now)   one click ('left' | 'right'): { used, ...the key's answer (ran, ok, say, row) when an order was given }; { used: false } when the click meant nothing
// tests/campclicktarget.mjs (Node).
function campClickWorld(cam, px, py) {
  const z = cam && cam.zoom > 0 ? cam.zoom : 1;
  return { x: (cam ? camzoomSX(cam) : 0) + W / 2 + (px - W / 2) / z, y: (cam ? camzoomSY(cam) : 0) + H / 2 + (py - H / 2) / z }; // (px, py: in the 1280 by 720 view, as the scroll is read: src/fillwindow.js)
}
function campClickHit(C, wx, wy, zoom) {
  if (!C || !C.carrier || !isFinite(wx) || !isFinite(wy)) return null;
  const z = zoom > 0 ? zoom : 1, ring = CAMP.click.hit / z, found = [];
  const add = (kind, id, unit, extra) => { if (!unit || !(unit.hp > 0) || unit === C.carrier) return; const d = Math.hypot(unit.x - wx, unit.y - wy); if (d <= Math.max(unit.r || 0, ring)) found.push(Object.assign({ kind, id, unit, d }, extra)); };
  campTgtList(C).forEach(u => add('hostile', u.id, u));
  campFriList(C).forEach(e => add('friendly', e.id, e.unit));
  campSelList(C).forEach(e => { if (e.kind === 'pilot') add('pilot', e.id, e.unit, { squad: e.squad }); });
  return found.reduce((best, h) => (!best || h.d < best.d ? h : best), null);
}
function campClickPick(C, hit) {
  if (!C || !hit) return false;
  if (hit.kind === 'hostile') return !!campTgtHold(C, hit.id);
  if (hit.kind === 'friendly') return !!campFriShip(C, hit.id);
  if (hit.kind === 'pilot') return !!campSelHold(C, hit.squad);
  return false;
}
function campClickAct(P, C, hit, button, now) {
  const none = { used: false };
  if (!C || !C.carrier) return none;
  if (button === 'left') return campClickPick(C, hit) ? { used: true } : none;
  if (button !== 'right') return none;
  if (hit && hit.kind === 'pilot') return campClickPick(C, hit) ? { used: true } : none; // your own pilot: who, and no order fits it
  if (hit && !campClickPick(C, hit)) return none; // a ship that was lost between the look and the click
  if (typeof campKeyCodes !== 'function' || typeof campPanelKey !== 'function' || (typeof campPanelOpen === 'function' && campPanelOpen(P))) return hit ? { used: true } : none; // the order key is the door's: with a list open the keys are the list's
  const code = campKeyCodes('order')[0]; if (!code) return hit ? { used: true } : none;
  return Object.assign({}, campPanelKey(P, C, code, now || 0), { used: true });
}
