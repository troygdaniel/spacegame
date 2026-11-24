// ---------- Campaign: the hints of missions 1.2 and 1.3 (card l1-pacing; Troy: "lots of flying, not much happens") ----------
// Missions 1.2 (mine and defend) and 1.3 (haulers home) are a sequence of beats now, each a question for the three squads (the rows are data: CAMP.levels[1].missions in src/campaign.js; the numbers and the
// timelines are in docs/CAMPAIGN-TUNING.md "Missions 1.2 and 1.3 in beats"). Nothing here changes a rule: this file only says, once, what the order for a beat is, the first time the beat is met.
// The pure half of nothing else: plain data and one function, no Phaser, no page (tests/campl1pacing.mjs runs it in Node). The keys in the words are placeholders of the key table (src/data_controls.js campKeyVar).
//   CAMPL1HINT_WAIT          s a hint waits after its wave's radio line (one message box: the hint must not be put up on the same frame)
//   CAMPL1HINTS              the hints: { id, mid: the mission's id ('mine', 'haulers'), hint: the words' key (camp.hint.l1p.<hint>), when(C): it is true now }
//   campL1Nudge(C, shown)    the hint that is due and not yet shown (and marks it in `shown`), or null; src/campnudge.js asks for one when it and mission 1.1's beats have none
const campL1Alive = (C, i) => !!(C.waves[i] && C.waves[i].started) && C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === i); // a wave has come and some of it is left
// A hint waits this many seconds after its wave came. The screen has one message box (toast, src/common.js): the wave's own radio line is put up on the step the wave comes and the sensors' "Contact" line 2 s later; a hint that was
// due on that same step was replaced on the frame it was put up, so the line that names the KEYS was never read (found by flying 1.2: card space-game-hunt-l1-pacing).
const CAMPL1HINT_WAIT = 4;
const campL1Told = (C, i) => campL1Alive(C, i) && campMissionClock(C) - (C.waves[i].at || 0) >= CAMPL1HINT_WAIT; // the wave is here and its radio line has had its time
const campL1Boats = C => typeof campTorpedoBoats === 'function' && campTorpedoBoats(C).some(u => !u.running); // a torpedo boat that still has its torpedo
const campL1Tucked = C => typeof campConvoyState === 'function' && campConvoyState(C) === 'tuck';
const CAMPL1HINTS = [
  // 1.2, beat 2: two groups from two sides. One squad each, or a field is left to the pirates
  { id: 'l1p-split', mid: 'mine', hint: 'split', when: C => campL1Alive(C, 1) && campL1Told(C, 2) },
  // 1.2, beat 3: torpedo boats for the miners. Under the cruiser's shield a miner is safe from a torpedo; a squad on the boats stops it being fired
  { id: 'l1p-boats', mid: 'mine', hint: 'boats', when: C => campL1Told(C, 3) && campL1Boats(C) && !campL1Tucked(C) },
  // 1.2, before the heavy raid: the quiet is for mending (a hurt pilot flies home by itself and is mended in the bay: src/camprepair.js; there is no recall key)
  { id: 'l1p-mend', mid: 'mine', hint: 'mend', when: C => !!(C.waves[3] && C.waves[3].started) && !campAliens(C).length && !(C.waves[4] && C.waves[4].started) && ((C.repairs || []).length > 0 || campWing(C, 'fighter').some(u => u.repair)) },
  // 1.3, beat 2: torpedo boats on a convoy 1,500 px long: the shield covers only the haulers beside the cruiser
  { id: 'l1p-haulboats', mid: 'haulers', hint: 'haulboats', when: C => campL1Told(C, 1) && campL1Boats(C) && !campL1Tucked(C) },
  // 1.3, beats 3 and 5: the raid on the last hauler, far behind the cruiser
  { id: 'l1p-rear', mid: 'haulers', hint: 'rear', when: C => campL1Told(C, 2) },
  // 1.3, first contact: the pirates run, something new is here
  { id: 'l1p-contact', mid: 'haulers', hint: 'contact', when: C => campL1Told(C, 5) }
];
function campL1Nudge(C, shown) {
  try {
    if (!C || C.result || !shown || C.level !== 1 || !C.L || C.arrivedAt == null) return null;
    for (const h of CAMPL1HINTS) {
      if (shown[h.id] || C.L.mid !== h.mid) continue;
      if (!h.when(C)) continue; // not yet: it waits for its beat
      shown[h.id] = true; return uiText('camp.hint.l1p.' + h.hint);
    }
  } catch (e) { /* a hint is a nicety */ }
  return null;
}
