// ---------- Campaign: selecting a ship zooms out to show it (card space-game-select-zooms-out; Troy, 23 Nov 2026) ----------
// Troy: selecting a target zooms out until my ship and the target are both on the screen. [ ] \\ pick an enemy (C.tgt), O P a friendly ship you protect (C.fsel; a click on an outpost or planet of the map holds that place too) and Q W one pilot (C.sel; All pilots, the default, is nobody in particular: it does not move the zoom; cards space-game-bracket-select-orders, space-game-keys-select:
// the picks are campSelUnits(C), { hostile, friendly, friendlyPost, who }, each a ship or null (an outpost is a place), src/camptarget.js). F then follows the selected ship and S brings the view back, as they do today (src/campfocus.js).
//   when        the moment the selection CHANGES (a ship picked, another picked, one let go), not every frame: a target that flies off afterwards does not drag the zoom, and a zoom the player makes with + - or the
//               wheel stays his. Out only, never in: the zoom is the player's own (what it was before the pick) or the one at which the cruiser and every selected ship are on the screen, whichever is farther out
//   how far     campPickFit (src/camppick.js): the zoom at which the ship and the cruiser both fit inside the part of the screen the panels leave free; with two ships selected the smaller of the two, the farthest zoom
//               is the mission's (camzoomClamp)
//   given back  when both selections are let go (X, a ship that dies) and the zoom is still the one this set, the player's own comes back; a zoom he made meanwhile, or Backspace's reset, is left alone
//   not here    a target sub-list has the view while it is open (s.pickZoom, src/camppickdraw.js) and so has F's follow (s.focus): nothing changes then, and the selection is read again when they are done
// campSelZoom(s) is called every frame by the scene (src/campaignscene.js). The rule is in plain functions (tests/campselzoom.mjs runs them in Node).

// the things picked now: the one pilot (none for All pilots), the friendly ship or outpost, then the enemy (campSelUnits, src/camptarget.js), alive
function campSelZoomUnits(C) {
  if (!C || !C.carrier || typeof campSelUnits !== 'function') return [];
  const sel = campSelUnits(C), post = sel.friendlyPost ? { id: sel.friendlyPost.id, hp: 1, x: sel.friendlyPost.x, y: sel.friendlyPost.y, r: sel.friendlyPost.r } : null; // an outpost has no hull: it is a place to fit
  return [sel.who, sel.friendly, post, sel.hostile].filter(u => u && u.hp > 0 && !u.gone);
}
// the zoom at which the cruiser and every one of these ships are on the screen; Infinity for none
function campSelZoomFit(C, units) {
  let z = Infinity;
  (units || []).forEach(u => { z = Math.min(z, campPickFit(C, { x: u.x, y: u.y, r: u.r || (u.def && u.def.r) || 0 })); });
  return z;
}
// the answer: '' when the zoom was not moved, 'out' when the view zoomed out, 'in' when it came back in toward the player's own (a nearer ship picked), 'back' when the selection was let go and his zoom was given back
function campSelZoom(s) {
  if (!s || !s.camp || typeof CAMZOOM === 'undefined' || typeof camzoomClamp !== 'function' || typeof campPickFit !== 'function') return '';
  const C = s.camp;
  if (!C.carrier || s.mode !== 'play' || s.mp || s.leaving || C.result) return '';
  if (s.pickZoom || (typeof campFocusOf === 'function' && campFocusOf(s))) return ''; // a sub-list and F's follow have the view
  const units = campSelZoomUnits(C), key = units.map(u => u.id).sort().join('|'), Z = s.selZoom;
  if (Z && Z.key === key) return ''; // the same selection: nothing to do, whatever the player has done to the zoom since
  const mine = !!Z && Math.abs(CAMZOOM.want - Z.set) < 1e-9; // the zoom is still the one this set: the player has not touched it, so the one he had before is the base
  const base = Z && mine ? Z.was : CAMZOOM.want;
  if (!units.length) { s.selZoom = null; if (Z && mine && Math.abs(CAMZOOM.want - Z.was) > 1e-9) { CAMZOOM.want = Z.was; return 'back'; } return ''; }
  const want = camzoomClamp(Math.min(base, campSelZoomFit(C, units)));
  s.selZoom = { key, was: base, set: want };
  const was = CAMZOOM.want; CAMZOOM.want = want;
  return want < was - 1e-9 ? 'out' : want > was + 1e-9 ? 'in' : '';
}
