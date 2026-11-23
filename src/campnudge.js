// ---------- Campaign: the first-minute hints (card space-game-night-ux, finding 6; docs/night/ux.md) ----------
// The key line at the bottom is small and grey. A player who flies about gets no help until the aliens come at 20 s. One hint, shown once, in level 1 only, and only while it is still true: send the pilots in
// once aliens are about (26 s: after the first wave's own message has had its time on the one message box). It is a toast, not the voice. An order a player has already given is never hinted.
// (The launch hint went with the Launch key: the pilots start out beside the cruiser, card space-game-keys-orders.)
//   campNudge(C, shown) -> the text of a hint that is due and not yet shown (and marks it in `shown`), or null        the scene calls it each frame of the battle (src/campaignscene.js update)
const CAMPNUDGE = [ // plain data: id, the level, the second it may first show, what must still be true, and the words (camp.nudge.* in content/text/ui.md)
  { id: 'attack', level: 1, at: 26, key: 'camp.nudge.attack', when: C => C.orders.attack === 0 && campWing(C, 'fighter').length > 0 && campAliens(C).length > 0 }
];
function campNudge(C, shown) {
  try {
    if (!C || C.result || !shown || !campFlag('hints')) return null; // the hints are switched off (the tuning panel): none shows
    for (const h of CAMPNUDGE) {
      if (shown[h.id] || C.level !== h.level || C.t < h.at * 1000) continue;
      if (!h.when(C)) { shown[h.id] = true; continue; } // no longer true (the player did it): never hinted
      shown[h.id] = true; return uiText(h.key);
    }
  } catch (e) { /* a hint is a nicety */ }
  const b = typeof campBeatNudge === 'function' ? campBeatNudge(C, shown) : null; // the hints of mission 1.1's beats, with their keys from the key table (src/campbeats.js)
  return b || (typeof campL1Nudge === 'function' ? campL1Nudge(C, shown) : null); // then those of missions 1.2 and 1.3 (src/campl1beats.js)
}
