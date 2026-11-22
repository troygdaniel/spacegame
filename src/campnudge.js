// ---------- Campaign: the first-minute hints (card space-game-night-ux, finding 6; docs/night/ux.md) ----------
// The intro card says "Launch the wing" without the key, and the key line at the bottom is small and grey. A player who reads the card and then flies about gets no help until the aliens come at
// 20 s. Two hints, each shown once, in level 1 only, and only while they are still true: launch the wing (the fleet list) if it is still in the bay at 6 s; send the fighters in once the wing is out and aliens are about
// (26 s: after the first wave's own message has had its time on the one message box). They are toasts, not the voice. An order a player has already given is never hinted.
//   campNudge(C, shown) -> the text of a hint that is due and not yet shown (and marks it in `shown`), or null        the scene calls it each frame of the battle (src/campaignscene.js update)
const CAMPNUDGE = [ // plain data: id, the level, the second it may first show, what must still be true, and the words (camp.nudge.* in content/text/ui.md)
  { id: 'launch', level: 1, at: 6, key: 'camp.nudge.launch', when: C => C.orders.launch === 0 && C.launchQ.length === 0 },
  { id: 'attack', level: 1, at: 26, key: 'camp.nudge.attack', when: C => C.orders.launch > 0 && C.orders.attack === 0 && campWing(C, 'fighter').length > 0 && campAliens(C).length > 0 }
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
  return typeof campBeatNudge === 'function' ? campBeatNudge(C, shown) : null; // the hints of mission 1.1's beats, with their keys from the key table (src/campbeats.js)
}
