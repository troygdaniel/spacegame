// ---------- The key row teaches: a chip lights, with a few words, at the moment its key first matters (card space-game-chunk12-teach-q; Troy, 26 Nov 2026; brief 8 proposal E and decision 5, docs/fly-and-fighter.html) ----------
// The bottom key row (src/camppagehud.js campPageHudFirst) shows five chips from the first second. A newcomer has no reason to press any of them. A TEACHING chip is one more chip at the left end of the row that is LIT
// (brighter, with a glow) and has a note of two or three words beside it, for as long as its moment lasts, and goes quiet once its key has been used. This card is the mechanism and ONE chip (Q); the next chips
// (the cards after it: Space and C at the first hostiles, E and Enter at the miner's call) are one more row of CAMP_TEACH each, with no new code. No key is moved: the cap is the key table's (campKeyOpens), never a letter written here.
// Pure rule, no Phaser; the key row's hints switch (CAMP.flags.hints) turns the whole row off, teaching chips with it.
//   CAMP_TEACH       the rows: { id, panel (the list whose key it teaches: CAMP_PANELS.panels), word, note (content keys, camp.corner.chip.*), mission (the mission row's id it is for), at, until (s of the mission clock), used(C) }
//   campTeachChips(C)  the chips due now, in order: [{ id, key, word, note, lit: true }]; [] when none is
//   C.keysUsed       { <list id>: true }: the lists the player has opened (campPanelGo, src/camppanel.js)
const CAMP_TEACH = [
  { id: 'q', panel: 'cruiser', word: 'camp.corner.chip.cruiser', note: 'camp.corner.chip.teachq', mission: 'escort', at: 5, until: 120, used: C => !!(C.keysUsed && C.keysUsed.cruiser) } // 1.1, 5 s in: the transport is leaving; Q opens the cruiser's list, row 1 is "Fly to the goal"
];
function campTeachChips(C) {
  if (!C || C.result || !C.L) return [];
  const sec = typeof campMissionClock === 'function' ? campMissionClock(C) : C.t / 1000, out = [];
  CAMP_TEACH.forEach(r => {
    if (r.mission && C.L.id !== r.mission) return;
    if (sec < r.at || sec > r.until || r.used(C)) return;
    const key = typeof campKeyOpens === 'function' ? campKeyOpens(r.panel) : ''; if (!key) return; // a key the table has not (the list's panel is off) has no chip
    out.push({ id: r.id, key, word: uiText(r.word), note: uiText(r.note), lit: true });
  });
  return out;
}
