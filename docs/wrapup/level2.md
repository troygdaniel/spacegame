# Wrap-up bug hunt: level 2 (Alpha Centauri), every mission

Card `space-game-wrapup-hunt-l2`, 1-GEN, 20 Nov 2026, on main `1ec26c1` (the merge-train tip is hunted again when 3-GEN publishes it: see "Second pass" at the end). Bug fixes only, no new behaviour.

**How it was hunted:** the level's data and code paths read in full (`src/campaign.js` level 2 rows, objectives, bonuses, saves, `src/campoutpost.js`, `src/camphub.js`); the bot (`tools/campaign-bot.mjs --level 2`, five ways of playing, 6 seeds, every mission); scripts on the logic sim for the outpost (distance, Fast time, dock); every string the level uses resolved; the progress path through `campMissionDone` / save / load; and **one muted Chrome walk through the lock** (warp, level card, briefing, ship panel, the map list, 25 s of flight with the first wave, the debrief; pictures in `~/dev/spacegame-night/shots/hunt2-*.png`, out of the repo).

## Findings, ranked

### Fixed (small, mine)

1. **MAJOR: the mission briefing and the debrief cards overflowed.** Mission 1 of level 2 has two lines, BONUS and three bonuses: eleven rows of text on a 330 px card, so the title was written over the first line and the last bonus over "Enter fly" (the debrief, with score, bonuses, stats and the rank line, had the same fault). Every mission with three bonuses was affected. *See it:* `?campaign=2`, Enter, Enter: the briefing (before the fix: `hunt2-3-brief.png`). *Fix:* `showCard` (src/campaignscene.js) grows the card to its text (title and hint move with it); too tall for the screen even grown, the blank lines go. `tests/campcardfit.mjs` (5 checks, failing first). Looked at the briefing and the debrief again in Chrome: both fit.

### Open (not fixed: not small, not mine, or a decision)

2. **MAJOR (mission 2, "The guards"): the only outpost is inside the guards' ring.** Proxima Gate sits at Proxima b, and the seven guards wait 580 to 900 px from it; five are within the 900 px that keeps the doors shut. So the retreat line ("Retreat to Proxima b: 15 s on Fast", said when the hull is under 35 percent and no ship is left) points the pilot into the guards, and docking there says "Aliens too close to dock at Proxima Gate, pilot." until the guards near it are dead: in this mission the retreat-and-regroup loop does not work. *See it:* `campNew(2, [], { mission: 1 })`, put the carrier 100 px from the gate edge, `campCheck(C, 'dock', '')` gives `hotdock` (5 aliens within 900). Missions 1 and 3 are fine (below). *Owner / options:* 5-GEN (outposts) or ORCH: either the retreat line skips an outpost that is hot (campRetreat: nothing or "the gate is guarded" while aliens are within `CAMP.outpost.clear` of it), or the guards' posts move out of the ring, or `clear` is smaller for this mission. Not mine to choose; behaviour change.
3. **MINOR: the level card after the warp says the warp has not happened.** The cinematic ends at Alpha Centauri, and then the card reads "Warp drive ready. Next star: Alpha Centauri." (`camp.l2.before.1`). *See it:* `?campaign=2`, wait for the warp. *Owner:* whoever owns the story words (content/text/ui.md); one line, for example "We are through. This is Alpha Centauri." Content is sealed: change, `--seal`.
4. **MINOR: mission 3 says "A second group, coming in from the far side."** `camp.say.l2wave2` is reused for mission 3's only wave. *Owner:* campaign words; a line of its own for mission 3 (the wave row's `say`).
5. **MINOR: "Lose at most 1 ships"** (`camp.b.lost` with n 1; mission 2's bonus "clean"). *Owner:* campaign words: a singular, or "Lose at most {n}" with the noun left out.
6. **MINOR: quit at the tech pick after mission 3 and the game resumes at level 2, mission 1.** The progress moves to the next level only in `next()` (after the won card and the pick); the saved `level` stays 2 and `mission` 0 after the last mission, though the results of all three are kept. *See it:* win mission 3, close the tab on the pick card, press K on the title. The player picks again after replaying; nothing is lost. *Owner:* 3-GEN (missions/hub): `campMissionDone` could keep a `levelDone` flag.
7. **MINOR: the SHIP panel covers the edge-arrow label** ("Cache 1 204 km", top right) while it is open (`hunt2-6-ship-panel.png`). Cosmetic. *Owner:* 7-GEN (panels).

### Checked and fine

- **Proxima Gate for the other missions** (what ORCH asked): mission 1: 6,060 px from the start, **15 s on Fast** (33 s at normal speed), dock accepted (no alien near; the wave comes from the west, behind the start): reachable and useful. Mission 3: the carrier starts **521 px** from the gate (**2 s on Fast**), dock accepted: useful. The ship panel's Dock row says "no outpost in range" away from it and "dock at Proxima Gate" in range; the map list flags "Proxima b [outpost]".
- **Words:** every string level 2 uses resolves (titles, briefings, bonuses, wave lines, the story, the HUD goal lines: "Gather resources: 0 of 2.", "Destroy the guards.", "Hold the ring at the relic.").
- **Objectives:** "kill wave 0" is not met before the wave has come (no vacuous win); the guards objective waits for the guards to exist; the relic needs the ring and no alien near it.
- **Saves:** the three missions saved and reloaded through `campMissionDone`: results `2.1`, `2.2`, `2.3`, the progress moves 2/1, 2/2, then done.
- **Bot:** mission 1: plain, missile, carrier-only and late bots win 100 percent, the carrier takes at most 9 damage; mission 2: plain and missile 100 percent, late 100; mission 3: 100 percent for every bot that flies. The idle bot never wins (right). **Carrier-only on mission 2 wins 50 percent: a bot artefact**, not a game fault: the bot never flies at a guard that is holding its post (the three left alive sit 1,300 to 2,000 px away and wait; a player sees them on the radar and the map).
- The warp cinematic ends in the Campaign scene without a key; the level card and the briefing read; Enter starts the flight; the wave of mission 1 comes at 20 s ("The aliens followed us through the warp, pilot."); no console error in the walk.

### Not hunted here (reasons)

- Chrome parts for missions 2 and 3 (guard fight, relic hold): the logic sim and the bot cover the rules; one Chrome walk was used for the screens a player meets first. The ready room, the panels (stances), systems and scouts are not on main yet: they come with the merge-train tip (second pass).

## Second pass (merge-train tip 128379e, 20 Nov 2026)

The train carries the hunt fixes (card growth, the three lines), the hot-gate fix with the new **Alpha B relay**, the mission places, the panels on Q / E / C, systems, scouts, replay and the pace and difficulty scales. Hunted again the same way: all plain-Node suites, the bot (5 seeds, five ways of playing), scripts on the sim for the outposts at each mission's own place, a scout fetch on mission 1, and **one muted Chrome walk through the lock** (warp, level card, briefing, the three panels, a won mission, the debrief, the ready room and its briefing, Launch to mission 2, a replay of mission 1 and its debrief; pictures `~/dev/spacegame-night/shots/hunt2b-*.png`).

### Re-checked: fixed or fine

- **The hot gate (finding 2) is fixed**: in mission 2 the gate is `hot` (guards within 900 px), the retreat names the **Alpha B relay** (14 s on Fast from Proxima d; "Retreat to Alpha Centauri B: 14 s on Fast."), and the gate stays the dock for missions 1 and 3. Mission 1 starts its flight at Alpha Centauri B where the relay is (35 px from the carrier at arrival: "E 6  dock at Alpha Centauri B"); mission 3 at Proxima b, 50 px from the gate: "E 6  dock at Proxima b". The outposts are reachable and useful in every mission.
- **Briefing and debrief cards fit** (the mission briefing, the debrief, and the replay debrief: text between title and hint, measured in Chrome), and the level card reads "We are through the warp. This is Alpha Centauri." (findings 1 and 3 fixed). Mission 3 says its own wave line.
- **Panels:** Q opens FLEET, E SHIP, C SYSTEMS (each with its rows and live states, greyed ones with the reason), Esc closes; the key line reads "Q Fleet   E Ship   C Systems". **Systems:** the C panel shows weapons / shields / engines pips at 2 / 2 / 2, Balance and Emergency. **Scouts:** mission 1 allows recon and fetch; a scout sent to a cache fetched it (1 of 2 counted after it landed, no ship lost).
- **Ready room and replay:** Enter at the debrief opens the ready room (rows board, brief, refit, rank, launch); its briefing opens; Launch flies mission 2 straight (no second briefing, mode play); a replay of mission 1 flies with the replay flag and its debrief says "Your best stands at 2,300 points." No page error in the walk.
- **The bot:** missions 1 and 2: plain and missile bots win 100 percent, mission 3 100 percent for plain, missile and late; the carrier-only bot wins mission 2 only 20 percent (the same bot artefact as before: it never wakes a guard on hold) and mission 3 80 percent (one lost carrier of five: fair for no wing).

### New findings (second pass)

8. **MINOR: two distances for the same trip.** The briefing and the ready room say the trip to Proxima d is **407 km** (about 10 s by Fast: `campTravel`, which counts to the edge of the 3,000 px arrival circle), the HUD's goal line says "Fly to Proxima d: **707 km**." (the carrier's distance to the place's middle). Mission 1: 279 km against 579 km. Both are true and the mission starts at 300 km, but a player sees two numbers for one trip. *See it:* `?campaign=2`, the hub's briefing, then the first HUD line. *Owner:* 3-GEN (mission places): the HUD line could count to the arrival circle, or the briefing could say "then the mission begins within 300 km".
9. **INFO (for 2-GEN's difficulty card, not a fault):** on the train the plain bot loses **10 ships** in mission 3 (8 for the missile bot) and 3 in mission 2; the carrier survives (hull 464 of 600). The wing is spent hard by the new scales; the "lost" bonus of mission 2 (at most 1 ship) is out of reach for the plain bot.

### Not hunted

- Missions 2 and 3 in Chrome (the guard fight and the relic hold): the sim and the bot cover the rules; the walk covered every screen a player meets between missions.
