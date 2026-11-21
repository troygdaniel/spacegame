# Wrap-up bug hunt: level 3 (card `space-game-wrapup-hunt-l3`, 6-GEN, 20 Nov 2026)

Level 3 as a player: the ready room at Aegir Watch, the three missions (Approach, Outer ring, Inner ring), the debriefs, the ending and the reveal, losing and retrying, saves, the map and the panels. Method: the code and data read through; the logic sim (`tools/campaign-bot.mjs`, and a scripted player that logs what the game says); and four short Chrome walks through the real game (`tests/campl3-boot.mjs --part 1|2|3`, one muted Chrome through the lock, under five minutes each; pictures to `~/dev/spacegame-night/shots/l3-*.png`). Main `ea989ec` (bundle B, hub, outposts, anomalies, ranks, stances).

**Result: no blocker.** All three missions are winnable and understood (the objective line, the goal arrow, the map, the briefing), the wins are saved (results `3.1`..`3.3`), the debrief returns to the ready room, the ending and the reveal show and are saved (`revealed`), a lost mission is flown again, `R` restarts it. Bots win every mission at every skill; the level takes under a minute a mission (see "difficulty").

## Fixed (small commits on branch `wrapup-hunt-l3`)

| # | rank | finding | how to see it | fix |
|---|---|---|---|---|
| 1 | major | The **debrief card ran out of its box**: with four bonus lines (every mission has had one more since the anomalies card) or a promotion line, the text overlapped the title and the Enter hint and hung out of the card. | Win any mission with 3 or more bonus lines, or a promotion (Chrome walk part 1: `l3-p1-8-debrief.png`). | `showCard` measures its words and the card grows to them (`src/campaignscene.js`); a debrief of 8 paragraphs fits. |
| 2 | major | After the ending, a **page loaded later still said "The home world"** on the ready room's board (the reveal flag was applied only when the Campaign scene began), so the board gave away nothing but contradicted the ending. | Finish the campaign, reload the page, press K on the title: board says LEVEL 3 - The home world (walk part 4). | The ready room applies the flag when it opens (`src/camphubscene.js`); pinned in `tests/camphubscene.mjs` (2 checks, mutation-checked). |
| 3 | major | **Help lines named keys the panels took away**: the level 1 story said "press 6 to send the drones"; the lose cards said "Press 3", "Press 4, then hold Space", "(2) or guard (4)", "Launch the wing early (1)", the ambush line "Drones: press 2". Keys 3 to 9 alone do nothing now. | Lose a hauler mission; read the level 1 story card. | The lines say "1 or 2, then a digit" (`content/text/*`, 6 lines); `tests/controlshelp.mjs` fails on a Campaign line that names a lone digit key. |
| 4 | minor | A toast that was up when a card opened floated **over the debrief title**. | Win while "Defence tower: arrived. Fighters, attack." is showing (`l3-p2-8-debrief.png` before the fix). | `showCard` clears the toast. |

## Not fixed: handed on (one line each, or not mine)

| rank | finding | how to see it | owner / note |
|---|---|---|---|
| minor | **Level 3 has no warp cinematic**: the jump from Alpha Centauri to Epsilon Eridani goes straight from the ready room to the story card. The words `camp.warp.l3` ("Dropping out of warp.") exist and nothing uses them (`CAMP.levels[3]` has no `warp` data; the cinematic is Earth and Sun specific). | Launch mission 1 of level 3 from the ready room. | warp card owner; a feature, not a fix. |
| minor | After the reveal the **win card still says "The war is won."** (`camp.l3.after.*` has no `.r` variant) while the ending that follows says the war is not over. | Replay level 3 after the ending; win; read the card. | reveal card owner: one line `camp.l3.after.r.2`. |
| minor | The anomaly **`core` is noticed at second 0 of missions 2 and 3** (the carrier starts 2,300 to 2,400 px from it), so "Odd readings ahead" is the first toast of the mission, and in mission 2 the anomaly is not that mission's bonus. | Start mission 2 or 3, watch the toast and the radar. | mine (anomalies): a start-inside-range rule would be new behaviour; left. |
| minor | A **tech looted in level 3** (`nest`: Lens) can never be picked (there is no refit after the last level), and `found` (the loot and its weapons) is **kept when a new campaign begins** while techs, ore and the bought ships are reset. | Loot `nest`, finish the campaign, begin again. | mine; a product decision: reset `found` with the techs, or keep it as the pilot's career like the rank. |
| minor | Whole-system map: the route label ("251 km, about 13 s") **overlaps the INNER BELT label**; the edge arrow's label ("Scan point 1 251 km") runs into the radar's rim. | Level 3, Tab, Z; and any flight with the goal off screen to the upper right. | map owners (3-GEN, 5-GEN). |
| minor | The nav list calls the star **"Epsilon Eridani"**, the map's label says **"EPSILON ERIDANI STAR"**. | Level 3, Tab. | map owners. |
| minor | The SHIP panel's **Build a fighter / escort rows say "Dock at an outpost to build."** on a level that has no outpost at all (the Fabricator, bought in the ready room with U, is the only way). | Level 3, key 2. | outposts owner: "No outpost here. The Fabricator builds anywhere." |
| minor | The lose card's tip is the generic "Launch the wing early" on the tower missions; "F fires a missile at the nearest big ship" is the tip that helps against towers. | Lose mission 2 or 3. | content, 2-GEN with the difficulty card. |

## Difficulty (for the difficulty wrap-up card)

With the techs a player has by then (Shield, Plating), every bot of `tools/campaign-bot.mjs` wins missions 1 to 3 at every seed (6 seeds): the plain player in 51, 65 and 39 s; the idle player loses missions 2 and 3 only. The carrier takes 4, 48 and 24 damage of 900. The level is short and soft for a player who has flown levels 1 and 2; the hardest thing in it is the unscripted: the anomalies' guards (three gunships and three drones at `core`).

## Checked and fine

The story card (two lines, spoken); the briefing page of each mission (objectives, bonus lines, par); the goal arrow and the map list (the goal first, the scan points, the home world); Fast to the goal; the scans (three, 7 s each, the defenders when the first is scanned); the waves and their lines; the towers (the objective "Destroy the towers.", the nearest tower as the goal, the count); the debriefs (score, bonuses, time, hull, ships, promotion); the win card; the ending (three lines, the star Tau Ceti on the card) and the flag; the ready room after each mission (the board, `[x]`, the next); the lose card and its retry (the brief again, the ore and the wing as they were); `R` from the pause; no error in the console in any walk.
