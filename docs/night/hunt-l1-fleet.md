# Hunt: Level 1 flown start to finish after the fleet-command batch (card `space-game-hunt-l1-fleet`, 5-GEN, 21 Nov 2026)

Main `79e9f14`. Nobody had flown the new Level 1 end to end in the real game since the fleet-command batch (calls, convoy orders, scouts and the fork, torpedo boats, the rival, fighter repair, power, command time). It was flown as a player, muted, through the Chrome lock, by **`tests/huntfleet-boot.mjs`** (by hand, not in the smoke): real key events, every key read from the key table (`CAMP_PANELS` for the panels and their rows, the Campaign group of `CONTROLS` for the rest), so the walk survives the remap on `space-game-two-hands-keys`. Bug fixes only; nothing here is a balance change, and the tuning notes and the decisions for Troy are at the end.

```
node tests/huntfleet-boot.mjs --mission 1 [--ending win|lose] [--calls right|wrong|none|mix] [--lane short|long] [--secs 420] [--nobrief] [--idle 90]
```

What it does: K, the ready room, the missions overlay and the three briefing screens, L, the story card, then play: the wing out (FLEET, Launch), the cruiser on the autopilot beside the convoy (SHIP, Fly to the objective), the escorts on the convoy, a scout down each lane from the Tab map (V), the pick at the fork (T), the pilots' calls answered by a style (right, wrong, none, or in turn), Tuck in and Run for it and Carry on from the FLEET panel's convoy page, power moved through the leader's phases (J K L `;`), missiles (F), turrets (Space held when a ship is near), the map zoomed all the way out (minus), and in 1.2 the wing mining, the cruiser sent at the raiders from the map, the flight to the Works and the dock. After the end it reads the debrief, the cards that follow, the saved progress and the ready room; a loss reads the lost card, Enter (the mission again from its brief) and the pause card. One part is under five minutes of wall clock (1.1 is about 360 s of game time, flown in about 4 minutes).

## What was flown

| mission | ending | how | result |
|---|---|---|---|
| 1.1 Rim escort | win, short lane | calls right, wrong, none in turn; both lanes scouted; tuck, carry on, run for it; power in every phase | won at 357 s, 2,515 |
| 1.1 | win, long lane | no call answered (the pilot's own pick each time); both lanes scouted | won at 334 s, 2,380 (the miner was lost) |
| 1.1 | loss | launch and autopilot only, no orders | the transport was lost at 227 s to the torpedo boats; the lost card, Enter, the brief, the pause card |
| 1.1 | dock at the Lunar Base first | E 4 at 3 s (the HUD offers it), the build, repair and refit pages, Esc | the room opens over the paused battle and the flight goes on ("Undocked") |
| 1.1 | idle 100 s | nothing pressed for the first 100 s | the hints say what they say (below); the transport waited out the fork and took the short lane at 108 s |
| 1.1 | win, unscouted, the cruiser at the leader | calls right; the transport took the short lane at the fork by T; the cruiser flew at the pirate leader from the map (Enter) and fired | won at 284 s, **3,130 with all five bonuses** ("Pirate leader is down.") |
| 1.1 | the mouse | the map driven by clicks: a lane row (set, with its Scout and Take buttons), the buttons clicked | "Scout 1 is going to Long lane.", "Taking the long lane." |
| 1.1 | the idle player's Fast burn | nothing for 55 s, then Tab, the transport, Shift+Enter (what the 50 s hint says) | "Autopilot to Transport convoy, full burn.": the 2,800 px gap closed in 10 s |
| 1.1 | retry after the loss | the retry left alone for 75 s | clean: the hints say themselves again (6 s, 50 s, 63 s), no call, no lane picked, the transport waits at the fork |
| 1.2 Mine and defend | win | calls right; the wing mines, the cruiser goes to the raiders from the map, to the Works, E dock | won at 301 s, 2,695 ("Sold 500 ore for 1500.") |
| 1.2 | loss | the cruiser destroyed at 200 s (1.2 is not lost by standing still) | the lost card, Enter, the brief |
| 1.3 Haulers home | win | calls right, wrong, none in turn | won at 292 s, 1,840 (8 ships lost to first contact), the refit, the tech |
| 1.3 | win | every call right | won at 292 s, 1 ship lost |
| 1.3 | loss | launch and autopilot, no orders | all three haulers lost by 187 s to the contact wave; the lost card ("The haulers are lost."), Enter, the brief |

## Findings, ranked

### Fixed (each pinned in `tests/camphuntfleet.mjs`)

| # | rank | finding | how to see it | fix |
|---|---|---|---|---|
| 1 | **major** | **At 1.1's fork the map's V and T went to the transport, not to the lane you marked.** The map keeps the place a trip is flying to as the SET place, and the list starts on it. A player who follows the transport (the HUD says AUTOPILOT Transport convoy; it is the thing everybody does) opens the map, moves the mark to a lane (W S) and presses T as the toast says: V answered "This mission has no scouting." (it had scouted the transport), T did nothing, and the transport waited out the whole 45 s ("No word. Taking the short lane."). Nobody could pick a lane or scout one by the keys while the autopilot was on. | 1.1: autopilot on, Tab, S until Long lane is marked, V, then T (`tests/huntfleet-boot.mjs`; the probe: with the autopilot off both worked). | V and T act on the marked row (`campMapKey`, two lines in `src/campmapdraw.js`; the place a trip flies to stays set, with its buttons, and the buttons still act on it). 4 checks. |
| 2 | minor | **A toast could show half a sentence.** A message that wrapped on two lines was remembered by its last line; a toast within 1.5 s of it was "paired" with that fragment, and the box showed the fragment on top. 1.1's leader hint read "Q, CONVOY, 3 is Run for it." with "The leader blocks the way. Send the transport past it:" missing, and the fork's "Pick a lane on the map, press T." lost its start. | 1.1 at the leader (281 s) and at the fork (63 s): `fleet-1Wm-rival-null.png`, `fleet-1Wm-fork-hold.png`. | `toast` keeps the last message whole (`src/common.js`, one line). 3 checks (`tests/toastband.mjs` still passes). |
| 3 | minor (words) | **1.1's goal said "Haulers delivered: 0 of 1."** (HUD, briefing, ship computer, pause card) in the mission of one Transport that the rest of the game calls the transport ("Transport is under way", "Transport has arrived"). | Any 1.1 HUD or the briefing's second screen. | A deliver row may carry a `word`: 1.1's says `transport` ("Transport arrived: 0 of 1."); 1.3's haulers keep theirs. `campObjKey` is the one rule (HUD and hub). 3 checks. |
| 4 | minor (words) | **1.1's lost card said "The haulers are lost."** | Let the transport die. | The cause line looks for the mission's word first (`camp.lose.convoy.transport`: "The transport is lost."). The tip below it is still the shared convoy tip, which names the haulers and the keys: see open C. 2 checks. |
| 5 | minor (words) | **V on a row that is not a lane said "This mission has no scouting."** in the mission that scouts its lanes (and after the lane was taken). | 1.1, V on the transport or on a ship, or after the fork. | "Scouts only read the lanes here, pilot." and, once the lane is taken, "The fork is behind us. Nothing to scout." (`camp.no.scoutlanes`, `camp.no.scoutpast`: two more lines for the voice pack, 576 to record, 0 unclassified); 1.3 still says "no scouting". 3 checks. |
| 6 | minor (briefing) | **The briefing's ENEMIES said "6 pirate skiffs" for 1.1; the flight meets 8** (the distress call's 2, the ambush's 4, and the 2 that come with the pirate leader). | 1.1, the third briefing screen. | `campBriefEnemies` counts a rival's `escorts`. 2 checks. |

| 7 | minor (briefing) | **1.2's briefing said "Mine ore: 0 of 190."** while the HUD says "Mine ore: 60 of 190." from the first second (the store holds what the ready room's pocket held; with the ore carried from 1.1 it is more). | 1.2, the briefing's second screen against the HUD. | The briefing starts the mining goal from the ore carried (`campHubBrief`, never above the goal). 1 check. |
| 8 | minor (my fix 3, caught by the picture) | **"Transport delivered: 0 of 1." wrapped its "1." alone in the Tab map's column** (27 letters fit; it was 28; "Haulers delivered: 0 of 1." is 26). | 1.1, Tab: `fleet-mouse-1-lane-set.png` before the change. | "Transport arrived: 0 of 1." (26). 1 check: both deliver goals are 27 letters or fewer. |

### Open: for Troy or for the owner (nothing changed)

| # | rank | finding | how to see it | owner / what to decide |
|---|---|---|---|---|
| A | minor | **The pilots' call plate: the keys caption overlaps the third row** ("(no answer)1 2 3 answer") when the third row is the cautious one and its words are long ("Stay with the transport"). | 1.1's distress call (`fleet-1Wm-call-1-distress.png`). | Mine, but not touched: `space-game-two-hands-keys` draws the call in the FLEET panel in place of this plate (its change to `src/camporderdraw.js` is on its branch). Re-check after it lands. |
| B | minor | **The Tab map's footer still says "Z: area"** (and the briefing's "M: the whole system"): the map's Z key was removed with the zoom-out card. | Tab, the footer line. | 7-GEN, who owns the key words (`space-game-two-hands-keys`). |
| C | minor (words) | **The lost card's tip for 1.1 names the haulers**: "Keep the wing on the haulers: FLEET panel, Escort." | The 1.1 lost card. | 7-GEN is rewriting that row (the key word is a placeholder on their branch). `campLoseLines` already looks for `camp.lose.tip.convoy.transport` first: write it there and the code needs nothing. |
| D | note | **The 1.1 briefing's walkthrough has no line for the distress call** (the miner under attack at 31 percent of the road: the first order call of the game). It says scout, ambush, leader. | The third briefing screen (`fleet-1Wm-2-brief-3.png`). | Words in `content/text/campbrief.md`; a line was not added because the walkthrough has four steps by design. Troy: is a fifth wanted? |

| E | note | **Typed orders need a chat key.** I opens the strip, but without an OpenAI or Anthropic key every line (even "take the long lane", "tuck in") is answered "The ship's computer needs a chat key (OpenAI or Anthropic) to answer: Settings > Keys." The Campaign's H page lists "I: Type an order to the ship" with no word about the key. The orders themselves (panel, map, calls) need no key, so a player with no key is never stuck. | Press I in 1.1 with no key. | Troy: is a one-word "(needs a chat key)" on that H row wanted? (The Long Haul rows say it.) |

### For 2-GEN's tune card (what feels off; no numbers changed)

- **1.2: the mining goal is met in about 36 s and the rocks are empty by about 110 s** (60 to 180 ore in 34 s with the wing on Mine ore, 488 by 111 s, the store full at 500): the first raid is at 70 s and the second at 170 s whatever you do, so a quick player waits. "Mine 190" does not ask for anything.
- **1.3, right against wrong, same flight:** every call answered right: won at 292 s, **1 ship lost**; one wounded call answered wrong 3 s after first contact (the mixed run): **8 ships lost**. The calls do change a fight, as intended; the size of the swing is the thing to judge.
- **1.3: first contact cost 8 ships** in the flight that answered the wounded call wrongly 3 s after the aliens came (Cover him: the wing deals 0.6 and takes 1.6 for 20 s): the wing went from 11 to 3 within 30 s. The debrief says "Ships lost 8" and the "lose no ships" bonus is gone. Fine as a lesson; say so if it is too much for the end of the first level.
- **The leader ran for good before it could be killed** in both wins (it ran for good at 327 s and 329 s, below 30 percent of its hull) and the "Destroy the pirate leader" bonus was missed twice: the kill needs the cruiser on it, not the wing.

## Checked and fine

- **The briefing's three screens** match the flight: the route and the patrol ("A patrol sees her off, then she is on her own": it turned back at 39 s), the goal, the five bonuses (all five are earnable and the debrief scored each), the walkthrough, the keys (Q 1, Q 2, Q 3, Tab, C 5, zoom), the readiness (Bay 6 and 2, Missiles 6, Ore 60, power 2 2 2, shield 150).
- **The 1.1 tutorial lines** say what happens: "Press Q, then 1, to launch the wing." at 6 s (a player who has not launched), "A long quiet road. On the map (Tab), pick the transport and burn Fast." at 50 s, the fork's two lines at 63 s, "Torpedo boats! Tuck the transport in under your shield: press Q, flip to CONVOY, 1." at 205 s and "The leader blocks the way. Send the transport past it: Q, CONVOY, 3 is Run for it." at 281 s. Tuck in and Run for it did what they said ("Convoy, tuck in under our shield.", "Transport, run for it. No cover.").
- **Order calls**: all six types seen in 1.1 to 1.3 (distress, running, second, wounded, breakaway, opportunity), answered right ("Good call. The wing is sharp."), wrong ("Bad call. The wing is rattled."), and not at all (the pilot's cautious pick, "No orders. I will play it safe."), the radio line and the mood each time; a call that is gone when its ship is gone closes ("gone").
- **The scouts** read both lanes before the transport reached the fork ("Scout 1, short lane: ambush, 6 pirates.", "Scout 2, long lane: ambush, 4 pirates, a cache.") and came home; the pick by T on the map ("Taking the long lane.").
- **Power in the leader's phases**: J (shields) on the charge, L (weapons) on the shield drop, K (engines) on the ram and the run, `;` back to even on the stalk; the toasts and the gauges followed ("Power to shields.", "Engines are low on power, pilot." when the engines were squeezed).
- **Fighter repair**: "Fighter hit hard. Breaking off to land." then "Fighter mended and launching again." (1.2, three times).
- **The mouse at the fork** works: a click on a lane row sets it (the Fly, Fast, Scout and Take buttons come up), the Scout and Take buttons act on it.
- **A retry starts clean**: after a loss, the new try's hints, calls and fork are fresh.
- **The kill**: with the cruiser sent at the leader from the map (Enter on its row), "Pirate leader is down.", the transport arrived 13 s later and the debrief scored all five bonuses.
- **The map all the way out** (minus from the key table): ZOOM 9 percent in 1.1, the whole system with the lanes, the convoy and the traffic in the list.
- **1.2**: Sold 500 ore for 1500, the Works' doors open once the raiders are gone, "Docking at Occator Works." and the ready room's BUILD page after the win; the rank promotion line and the bay's new size.
- **The cards after a win and a loss**: the debrief with each bonus marked, "LEVEL 1 WON" with the story, the Earth refit (a tech by its digit, then Enter), the saved progress (`results` per mission, the ore), the lost card and Enter flying the mission again from its brief, the pause card (Goal, the keys, the pace).
- **Not looked at closely**: the dogfights at close range and the pictures of the torpedo boats and the leader (their cards' pictures cover them).
