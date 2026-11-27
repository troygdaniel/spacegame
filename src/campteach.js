// ---------- The key row teaches: a chip lights, with a few words, at the moment its key first matters (card space-game-chunk12-teach-q; Troy, 26 Nov 2026; brief 8 proposal E and decision 5, docs/fly-and-fighter.html) ----------
// The bottom key row (src/camppagehud.js campPageHudFirst) shows five chips from the first second. A newcomer has no reason to press any of them. A TEACHING chip is one more chip at the left end of the row that is LIT
// (brighter, with a glow) and has a note of two or three words beside it, for as long as its moment lasts, and goes quiet once its key has been used. This card is the mechanism and ONE chip (Q); the next chips
// (the cards after it: Space and C at the first hostiles, E and Enter at the miner's call) are one more row of CAMP_TEACH each, with no new code. No key is moved: the cap is the key table's (campKeyOpens), never a letter written here.
// Pure rule, no Phaser; the key row's hints switch (CAMP.flags.hints) turns the whole row off, teaching chips with it.
//   CAMP_TEACH       the rows: { id, panel (the list whose key it teaches: CAMP_PANELS.panels), word, note (content keys, camp.corner.chip.*), mission (the mission row's id it is for), at, until (s of the mission clock), used(C) }
//   campTeachChips(C)  the chips due now that are ADDED to the row, in order: [{ id, key, word, note, lit: true }]; [] when none is.   campTeachLights(C)  the chips of the row that are LIT where they stand: { <chip id>: note } (card space-game-chunk13-teach-space-c: Space and C at the first hostiles)
//   C.keysUsed       { <list id>: true }: the lists the player has opened (campPanelGo, src/camppanel.js)
const campTeachOrders = C => Object.keys(C.orders || {}).reduce((a, k) => a + (C.orders[k] | 0), 0); // the orders given so far (Enter gives the one order of the pick: card space-game-keys6-enter)
const campTeachEnterIs = (C, verb) => { const en = typeof campPageHudEnterNow === 'function' ? campPageHudEnterNow(C) : null; return !!en && en.verb === verb; }; // what the row's Enter chip says now (src/camppagehud.js campPageHudEnterNow)
const campTeachCall = C => typeof campMinerCall === 'function' && !!campMinerCall(C); // the 1.1 miner's call is live (src/campminer.js)
const CAMP_TEACH = [
  { id: 'q', panel: 'cruiser', word: 'camp.corner.chip.cruiser', note: 'camp.corner.chip.teachq', mission: 'escort', at: 5, until: 120, used: C => !!(C.keysUsed && C.keysUsed.cruiser) }, // 1.1, 5 s in: the transport is leaving; Q opens the cruiser's list, row 1 is "Fly to the goal"
  // the chips that are in the row already are LIT where they stand, with a note (a row with `chip`: the id of the key row's own chip, fly, fire, boost, missile, enter or cockpit); `seen` starts its clock, `for` is how long it lasts after it (s), `keep` (optional) must stay true, `base` (optional) is read when the clock starts and handed to `used`
  { id: 'fire', chip: 'fire', note: 'camp.corner.chip.teachfire', seen: C => campTeachHostile(C), for: 45, used: C => !!(C.keysUsed && C.keysUsed.fire) },     // the first hostiles seen, in any mission: Space, hold to fire (card space-game-chunk13-teach-space-c)
  { id: 'cockpit', chip: 'cockpit', note: 'camp.corner.chip.teachc', seen: C => campTeachHostile(C), for: 45, used: C => !!(C.cockpitTaken || C.cockpit) }, // and C, take a fighter, only while the cockpit switch is on (the chip is in the row only then)
  // the 1.1 miner's call (card space-game-chunk14-teach-e-enter): E opens the friends' list (the miner is row 2) and Enter sends a pilot; an added chip or a lit one, while the call is live
  { id: 'e', panel: 'friends', word: 'camp.corner.chip.friendly', note: 'camp.corner.chip.teache', mission: 'escort', seen: C => campTeachCall(C), keep: C => campTeachCall(C), for: 90, used: C => !!(C.keysUsed && C.keysUsed.friends) },
  { id: 'enter', chip: 'enter', needs: C => campTeachEnterIs(C, 'guard'), note: 'camp.corner.chip.teachenter', mission: 'escort', seen: C => campTeachCall(C), keep: C => campTeachCall(C), for: 90, base: C => campTeachOrders(C), used: (C, b) => campTeachOrders(C) > (b | 0) } // Enter reads Form up until something is picked: once the player has picked the miner (E, then 2) it reads Guard, and THEN it is lit, "send a pilot"
];
const campTeachHostile = C => typeof campSightGroups === 'function' && campSightGroups(C, true).length > 0; // a hostile is seen (the hostiles' panel is up)
function campTeachClock(C, r) { // the second the row's moment began (the first time `seen` was true), remembered in C.teachAt (and what `base` read then, C.teachBase); null while it has not
  const T = C.teachAt || (C.teachAt = {});
  if (T[r.id] == null && r.seen(C)) { T[r.id] = C.t; if (r.base) (C.teachBase || (C.teachBase = {}))[r.id] = r.base(C); }
  return T[r.id] == null ? null : (C.t - T[r.id]) / 1000;
}
const campTeachDue = (C, r) => { // is the row's moment on, and not yet used
  if (r.mission && C.L.id !== r.mission) return false;
  if (r.used(C, C.teachBase && C.teachBase[r.id])) return false;
  if (r.needs && !r.needs(C)) return false; // (the chip says what the row needs it to say: Enter only once it reads Guard)
  if (r.seen) { const s = campTeachClock(C, r); return s !== null && s <= r.for && (!r.keep || r.keep(C)); }
  const sec = typeof campMissionClock === 'function' ? campMissionClock(C) : C.t / 1000; return sec >= r.at && sec <= r.until;
};
function campTeachChips(C) { // the chips that are ADDED to the row (the rows with no `chip`)
  if (!C || C.result || !C.L) return [];
  const out = [];
  CAMP_TEACH.forEach(r => {
    if (r.chip || !campTeachDue(C, r)) return;
    const key = typeof campKeyOpens === 'function' ? campKeyOpens(r.panel) : ''; if (!key) return; // a key the table has not (the list's panel is off) has no chip
    out.push({ id: r.id, key, word: uiText(r.word), note: uiText(r.note), lit: true });
  });
  return out;
}
function campTeachLights(C) { // the row's own chips to LIGHT, { <chip id>: note }
  const out = {};
  if (!C || C.result || !C.L) return out;
  CAMP_TEACH.forEach(r => { if (r.chip && campTeachDue(C, r)) out[r.chip] = uiText(r.note); });
  return out;
}
