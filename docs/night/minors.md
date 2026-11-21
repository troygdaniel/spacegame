# The open minors of docs/WRAPUP.md, worked down (card `space-game-night-fix-minors`, 3-GEN, night of 20 to 21 Nov 2026)

Off main `eec8146`. Feature freeze: bugs and rough edges only; level 1's mission scripts were left alone (they are being rewritten). Each fix is pinned in
`tests/campnightminors.mjs` (plain Node). The numbers are the table's in `docs/WRAPUP.md`, "Minor: OPEN".

| # | minor | what happened |
|---|---|---|
| 1 | A lost mission said "LEVEL 1 LOST" | **fixed**: a mission lost says "MISSION LOST: Ore haulers" (the mirror of "MISSION COMPLETE: <title>"); a level with no missions keeps "LEVEL n LOST" (`camp.ui.lostmission`) |
| 2 | Refit header "Choose a technology: 1 2 3" with looted techs on 6, 7, 8 | **fixed**: the header lists the keys its rows have (`{keys}`) |
| 3 | I does nothing and says nothing without a chat key | **fixed**: one toast, the same words as U's (`shipcompNoKey`, not twice in two seconds); U already said it (`listenPress`) |
| 4 | B says nothing before the blink tech is picked | **fixed**: "No warp blink yet. It is a technology you can pick."; while it cools "The blink is not ready: 12 s." (`campBlinkWhy`) |
| 5 | Debug keys on the pause card | **already fixed** on main (`campDebugOn`: off unless `?debug=1`) |
| 6 | The win card says "The war is won." after the reveal | **already fixed** on main (`campStory(3, 'after', true)`; `tests/campl3minors.mjs`) |
| 7 | "The belt is clear." ends mission 3 (Europa) | **left**: it is level 1's mission script, which is being rewritten tonight |
| 8 | The anomaly `core` noticed at second 0 | **already fixed** on main (`tests/campl3minors.mjs`) |
| 9 | A tech looted in level 3 can never be picked | **already fixed** on main (`tests/campl3minors.mjs`: no tech nothing could offer; a new campaign forgets its loot) |
| 10 | The nav list says "Epsilon Eridani", the map "EPSILON ERIDANI STAR" | **fixed**: the star of a system with a name is named by it, no added word (`src/campsol.js`); the map and the list read "Epsilon Eridani" |
| 11 | The open SHIP panel covers the edge-arrow label | **fixed**: the label keeps out of the open panel's column too (`arrowKeep`) |
| 12 | Quit at the tech pick after mission 3 and the next launch resumes the level's mission 1 | **fixed** (batch 2): the save has `levelDone` (the level whose last mission is won and whose story and pick are not done); the ready room's next mission is then the level's last one, the Launch row says "the tech pick", and the scene shows the level's won card (no battle) and the pick; `next()` clears it. An old save reads 0 |
| 13 | The "Odd readings ahead" toast covers the W S E power pips | **fixed**: the pips sit beside the shield bar, above the toast band (`CAMP.hud.pips`: x 366, y 40; the band is y 86 to 150) |
| 14 | Two toasts stack and cut each other | **already fixed** on main (one box, `tests/toastband.mjs`) |
| 15 | After a win or a loss the HUD stays under the card | **fixed**: the won, lost, debrief, refit, pick and ending cards hide the gauges, the radar, the goal line and the arrow (`hudHides`, `hudShow`) |

## Card `space-game-night-quit-at-pick` (findings A and F of `docs/night/hunt-l2-l3.md`), off main `505c2c3`

- **A (quit at the pick or the refit refights the level)**: this is minor 12 above, already on main (`4000fee`): the save's `levelDone` is set by the last mission of a level and cleared
  by `Campaign.next`, so it also holds at the Earth refit after level 1. `tests/campquitpick.mjs` pins level 1 (the refit) as well as level 2.
- **F (level 3 had no key to mend the hull)**: on a level that lists no outpost (`campAboard`) the SHIP panel's sixth row reads **"Repair the hull"** (tab "Repair"; the live word is
  "450 hull for 45 ore", "hull sound" when whole, "needs 45 ore" when poor) and E then 6, or a click, runs the repair order. A level with outposts keeps "Dock at an outpost". The row is
  made over at the moment from the table (`campPanelAs`, `src/camppanel.js`); the table, the keys page (H) and the typed order are unchanged.
