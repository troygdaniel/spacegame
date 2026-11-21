# Wrap-up: level 1 bug hunt (card space-game-wrapup-hunt-l1)

Level 1 of the Campaign (the belt: Belt survey, Ore haulers, The mothership), played as a player on main `ea989ec` + the gate's bundle A (`1ec26c1`), by the logic bot, the code and
short Chrome runs (one Chrome through the lock, muted, stepped clock; a run of all three missions is about 30 s of wall time). Nothing here changes behaviour: three
bug fixes, each its own commit on branch `wrapup-hunt-l1`; the rest is handed to the owner by one line.

**Verdict: no blocker.** All three missions are won by the bots (57 to 105 s, every seed), by the autopilot and the panels in Chrome (79 s, 56 s, 79 s), the goals complete,
the objective line follows them, the debrief, the room, the save, the retry, the pause, the map, the zoom, docking and coming back all work, and seventeen odd saves
(not JSON, `{}`, level 99, ore "lots", results null, ...) open the room and launch a mission without an error. Two majors and one minor are fixed; five minors are for owners.

## Fixed (separate small commits)

### 1. MAJOR: the debrief, the pause card and the refit overlapped their own title and hint: `116be6d`
Every mission ends on the debrief card, and on main its words were taller than the card: the title ("MISSION COMPLETE: The mothership") was drawn over the first line
("SCORE 2780" stood above the card), the hint ("Enter continue") over the "PROMOTED: ..." line, and the last line ran out of the box. Measured in Chrome (y in px, the card
fixed at 330 for the debrief): the words ran 158 to 534 in a card from 175 to 505; the pause card (a 402 px card, words 172 to 520, its title on the first line); the EARTH
REFIT at the end of the level (380 px card, 376 px of words, the hint "Chosen: Shield grid" on the buy line). With looted techs (up to six choices) the refit's words were 593 px on a
720 px screen and ran off both edges.
- See it: win any mission (or press Esc in one, or finish level 1) on `ea989ec`. Pictures: `~/dev/spacegame-night/shots/hunt1/o-debrief3.png` (before), `o-debrief3-fixed.png` (after), `g-refit6.png` (six choices, after).
- Fix: `showCard` measures the words first (a throwaway text), grows the card to them, and past the screen steps the type down. `tests/campcardfit.mjs` (fails 3 checks on the old code).

### 2. MAJOR: six lines told the player to press a digit that does nothing now: `d4f8735`
After the panels replaced the direct digit keys (a digit opens a panel, then picks a row) the first lines of the level still said "Fly over ore, or **press 6** to send the drones"
(6 does nothing), the ambush hint at 1:00 said "Drones: **press 2**" (2 opens SHIP), and four lose-card tips said "Press 3", "Press 4, then hold Space", "Launch the wing early (1)",
"send fighters (2) or guard (4)". The first of them is the first screen of the first mission.
- See it: K on the title, Enter, L: the story card. Or let mission 2 lose: "Keep the wing on the haulers. Press 3."
- Fix: the lines name the panel and the row ("FLEET panel, Escort"), which stays true when the panels' keys move (the panels card moves them to Q and E). `tests/campkeytext.mjs` fails on any Campaign line that says "press <digit>", "(<digit>)" or "key <digit>"; the three tests that pinned the old words follow.

### 3. MINOR: the same toast twice in one box: `548ec60`
A refused key pressed twice within 1.5 s ("The battle is over, pilot." twice, "No ships are out. Launch first." twice) shared a box with itself: the same line on two rows. The planner now does not pair a message with an identical one. `tests/toastband.mjs` has the case (fails on the old code).

## Not fixed: for the owner (one line each; nothing new built)

### 4. MINOR: "LEVEL 1 LOST" on a lost mission
A won mission says "MISSION COMPLETE: Ore haulers"; a lost one says "LEVEL 1 LOST" (`camp.ui.lost` takes the level, not the mission). See it: let mission 2 lose. Owner of the missions text: a title with the mission, "MISSION LOST: {title}", is a text change.

### 5. MINOR: the refit says "Choose a technology: 1 2 3" while looted techs are chosen with 6, 7 and 8
`camp.ui.refitpick`: the header lists three digits, the rows beside it list 1, 2, 3, 6, 7, 8 (4 and 5 buy ships). See it: win the level with a cloaked cache found. Owner: the anomalies card.

### 6. MINOR: I (type an order) and U (hold to speak) do nothing and say nothing without a chat key
The H page lists both under "THE STRIP AND THE VOICE". With no key set `cmdstripOpen` returns false and the player gets no line (the plain commands still run through `shipcompQuick`, but only by voice). See it: a fresh browser, mission 1, press I. Owner: the ship's computer card; one toast ("needs a key: Settings") would do.

### 7. MINOR (a decision): the pause card and the keys page list the debug keys to every player
"DEBUG  ] next level   \ win   [ lose   ` god mode off" is on the pause card of every mission, and `\` wins the mission. Fine for the tune kit; the owner decides whether it ships.

### 8. NOT LEVEL 1: `tests/contentproof.mjs` is red on main (3 of 47 checks)
"the words only a file gives are exactly the 13 listed": there are 14 (`listen.early`), and the interface-words check follows from it. Red on a clean `1ec26c1` too, so not from this branch. Owner: whoever added `listen.early`.

## Seen on the merge train, not on main yet (mine, after panels-ui lands)
- 1-GEN (heads-up on `space-game-wrapup-hunt-l2`, `docs/wrapup/level2.md` 7): the open SHIP panel covers the edge-arrow label (Cache 1, 204 km) at the top right. A panel-position bug of my panels card: I fix it after `5baab3a` is on main.
- The "Warp blink - Press Q" line in the refit and the strip's key line: on `5baab3a` the blink is B and the text says so; check the train tip says B and Q is FLEET everywhere (`tests/campkeytext.mjs` does not catch letters).

## Checked and fine (so nobody repeats it)
- The bot table (`node tools/campaign-bot.mjs --level 1 --seeds 6`): mission 1 won by every bot but the passive ones (they never scan: expected), mission 2 won 100% by every bot that escorts (83% for the two that never attack), mission 3 won by every bot but the idle one, which loses (64 to 105 s).
- Chrome, all three missions with the panels and the autopilot: objectives, scans (0 of 3 to 3 of 3), the ambush at the second scan, three waves, the mothership, the hauler lines ("Hauler 1 is under way", "More raiders. Cover the last hauler."), the bonus lines of every debrief, the promotion, the room after each win, the save after each win, the level's end (story, tech pick, refit, level 2's room at Proxima Gate).
- Pause (Esc), resume, R (back to the briefing), T, H and the keys page, Tab and the map (W S choose, Enter flies, Z, X, + - 0), the zoom keys (1.2 steps, 0 resets), the panels with a card up (they close), docking at Ceres mid-mission and undocking back to the same mission clock, Fast (Shift+digit with the wing aboard burns; with the wing out it asks), mining by the panel (40 ore per 10 s, the store caps at 200, so "Mine 60 ore" is easy), lose by doing nothing (mission 2 at 0:39, mission 3 at 1:41), retry through the briefing.
- Every `camp.*` key the code names has a line in the table (a scan of src/camp*.js and shipcomputer.js).
- Saves: 17 odd values for `longhaul.campaign` open the room, and Launch starts a mission, with no console error.
