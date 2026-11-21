# Wrap-up: the Campaign played whole (card `space-game-wrapup-playthrough`, 8-GEN, 20 Nov 2026)

Main `948f034`: the merge train (panels on Q / E / C, systems, scouts, wing targets, replay, the big briefing, mission places, pace on P, the difficulty scales, no-outpost
rule, voice-pack derive) and the three hunts' fixes are all on it. Feature freeze: this list is bugs and rough edges only. The three level hunts have their own detail:
`docs/wrapup/level1.md`, `level2.md`, `level3.md` (their findings are folded into the ranking below, with how to see each).

## For Troy, in one line

**Play it: title, K, the ready room (Enter for the briefing, L to launch), Q then 1 to launch the wing, Tab for the map, E then 6 to dock; no blocker and no crash anywhere I
looked; what is still rough is the difficulty of the escort mission (1.2) for a player who does not give orders, three small label and words things, and the debug keys on the
pause card (`\` wins a mission).**

## What I did, and what I did not (so nothing here is claimed that was not done)

- **Flown in Chrome as a player, on the final build** (muted, stepped clock, through the Chrome lock, in parts under five minutes; pictures in the scratchpad `pt/`, not in the repo):
  title; K to the ready room and every page of it (board, brief, refit, rank, launch), Esc back to the title; the pause card and the keys page (H); mission **1.1** to a win in
  83 s with Q then 1 (launch), Q then 2 (attack), Space and the map's goal row; the debrief, the level's won card, the **Earth refit** (tech, ships bought) and the room after it;
  mission **2.2** to a win (86 s); the lost cards of **1.2**, **2.3** and **3.2** (the scripted player lost them: see the difficulty note); the start of **2.3** and **3.3**; docking at
  Ceres with **E then 6** and Esc back to the same flight; zoom in and out; the **ending** ("This is not their home. It is an outpost. ... Tau Ceti") and the title after it.
- **Flown earlier on the pre-train main `1ec26c1`**: all nine missions won by the scripted player (47 to 115 s), the warp cinematic, the reveal. The train changed the missions
  (they start away from their place, the difficulty scales), so those wins are not repeated here.
- **Not flown by me on the final build**: 1.3, 2.1 and 3.1 (my script does not wait out the warp, and 1.3 was not finished at 244 s), the replay and retreat screens in Chrome.
  Those are covered by the hunts and the gate's boots (below); the retreat line ("Retreat to ...: 14 s on Fast") is checked in the sim by 1-GEN, and I did not
  reproduce it in a forced Chrome state (it needs the aliens near).
- **The gate**: 142 plain-Node suites, `economy-sim check` and `build-content --check` pass on this build. The **last full Chrome gate** (25 boots: Campaign, chain, map,
  missiles, turrets, resources, nav, gameplay, title, warp, click-fly, ux, sol, chatter, sounds, panels, missions, hub, outposts, voice, pursuit, map fire, reveal, rank, anomaly,
  targets, and Long Haul inside the first) passed on `2b43ed6`; three small commits came after it (a docs file, the test pins, the arrow-label keep list) and ran the Node suites,
  plus my real-game check of the label. No console error in any boot. The official bots (`node tools/campaign-bot.mjs --level N`) win every mission with every bot that plays
  and gives orders; see the table at the end.

## Ranked findings

### Blocker
None. No crash, no dead end, no console error in any run; every mission is winnable; the save, the retry, the replay and the ending work.

### Major: all FIXED and on main
| # | what | how it was seen | state |
|---|---|---|---|
| 1 | The debrief card (with a rank line), the pause card and the Earth refit were **taller than their box**: the score over the title, the last lines under the frame, the hint overwritten. | Win any mission; Esc; finish level 1. | fixed (`showCard` grows to its words; `tests/campcardfit.mjs`). Four of us found it; the fix on main is 7-GEN's (I dropped my own copy). |
| 2 | **Help lines named keys the panels took away** ("press 6", "Press 3", "(2)"). The first screen of the first mission said "press 6". | K, Enter, L: the story card; lose a hauler mission. | fixed (lines name the panel and the row; `tests/campkeytext.mjs`). |
| 3 | After the ending a **later page still said "The home world"** in the ready room. | Finish the Campaign, reload, K. | fixed (the room applies the reveal flag when it opens). |
| 4 | The **FLEET panel's stance page** (Free, Orbit, Keep distance, Match speed, Hold position) existed in the model and had no key. | Q, then Left or Right. | fixed (`space-game-wrapup-stance-page`). |
| 5 | Level 2's only outpost was **inside the guards' ring** (mission 2): the retreat line pointed the pilot into the guards. | Level 2, mission 2, hull under 35 percent. | fixed (the Alpha B relay; the gate stays the dock for missions 1 and 3). |
| 6 | The SHIP panel's **Dock row said nothing** next to an outpost (no short word for the row). | E in range of Occator Works. | fixed (`campPanelShortState`; `tests/campanels.mjs`). |

### Major (a decision, not a bug): difficulty of 1.2 for a player who gives no orders
The escort mission (1.2, three haulers to Mars) was **lost by two independent scripted players** on the train builds (7-GEN's, and mine: lost at 192 s, hauler 3 gone, 12 aliens
down), and the carrier-only bot loses it too, while every official bot that escorts wins 100 percent (114 s). 2-GEN tuned the scales; the plain bot wins all nine at three paces.
**What a player sees**: a player who launches and attacks but never uses Escort on the haulers will lose 1.2 on Normal. The lose card says what to do ("Keep the wing on the
haulers: FLEET panel, Escort."). **P changes the pace to Calm.** See it: K, Enter on the board at mission 2, L; fly to Mars at regular speed (about 150 s) or with Fast (Shift
and the SHIP panel's goal row, 47 s); do not order Escort. My scripted player also lost **2.3** (hold the ring at the relic, carrier lost at 77 s, 13 aliens near) and **3.2**
(147 s, "Destroy the towers", carrier lost); the official `strong` bot wins both (94 s and 37 s), so these are about orders (missiles at the towers, the wing out early), not luck.
The bots that model Troy's own first try (`troy`: launches at 45 s, never attacks) lose 8 of 9 and win 17 percent of 3.3: that is the play log's shape, and it is the argument
for Calm as a visible choice (it is on P and on the pause card).

### Minor: FIXED since the hunts
Mission 3 of level 2 had the second wave's words (now its own); "Lose at most 1 ships" (now "Ships lost: 1 or fewer"); the level 2 card said the warp had not happened (now
"We are through the warp. This is Alpha Centauri."); level 3 had no warp cinematic (it has one: "Alpha Centauri falls behind us"); the map list ended on an orphan heading; the
route label sat over the belts' names (3-GEN's labels, Node-tested, not seen by me); **the edge arrow's label sat under the SHIP tab (2.3, 3.3) and over the AUTOPILOT line (1.2)** (`948f034`, checked in the real game); the
briefing and the HUD gave two distances for one trip (407 and 707 km: one function now) and the briefing said the route twice; the SHIP panel said "Dock at an outpost to build"
on a level with no outpost (build and repair work aboard now); a toast over the debrief title; the same toast twice in one box; the lose tip on tower missions is now specific
("Fire missiles (F) at the towers. Send the wing at them.").

### Minor: OPEN (none blocks; each is one line for an owner)
I saw 1, 2, 7 and 15 myself on the final build; 3 to 6 and 8 to 12 are from the level hunts (their docs have the detail, and I did not re-check them); 13 and 14 are mine, from
earlier builds.
| # | what | how to see it |
|---|---|---|
| 1 | A lost mission says **"LEVEL 1 LOST"**, a won one "MISSION COMPLETE: Ore haulers" (the lost title takes the level). | Lose mission 2 (it is on the 1.2 card above). |
| 2 | The refit header says **"Choose a technology: 1 2 3"** while looted techs are chosen with 6, 7, 8 (4 and 5 buy ships). | Win level 1 with a cloaked cache found. |
| 3 | **I (type an order) and U (hold to speak) do nothing and say nothing** without a chat key. | Fresh browser, mission 1, press I. |
| 4 | **B (warp blink) says nothing** before the tech is chosen. | Press B in level 1. |
| 5 | The **debug keys** are listed on the pause card and the keys page, and `\` wins the mission. Fine for the tune kit; ship or hide is a decision. **Hidden now:** card `space-game-debug-keys-off` makes the keys do nothing unless the address says `?debug=1`. | Esc in any mission. |
| 6 | After the reveal the **win card still says "The war is won."** (no variant) while the ending says the war is not over. | Replay level 3 after the ending; win; read the card. |
| 7 | **"The belt is clear."** ends mission 3, which is at Europa; level 1 is still called "The belt". | Win 1.3. |
| 8 | The anomaly **`core` is noticed at second 0** of missions 2 and 3 of level 3 (the carrier starts inside its range): "Odd readings ahead" is the first toast. | Start 3.2 or 3.3. |
| 9 | A tech **looted in level 3 can never be picked** (no refit after the last level), and `found` is kept when a new campaign begins while techs and ore reset. A product decision. | Loot `nest`, finish, begin again. |
| 10 | The nav list says **"Epsilon Eridani"**, the map label says "EPSILON ERIDANI STAR". | Level 3, Tab. |
| 11 | The open **SHIP panel covers the edge-arrow label** (the tab no longer does). Transient (closes on a pick or Esc). | Open E with a target at the right edge. |
| 12 | Quit at the tech pick after mission 3 of a level and the next launch **resumes the level's mission 1** (the progress moves on only after the pick). | Win 2.3, close the tab on the pick, K. |
| 13 | The **"Odd readings ahead" toast covers the W / S / E power pips** (the toast starts at x 415, the pips are at 390 to 450, y 65 to 95). Seen on the train tip before the final tip; not re-checked. | Fly into an anomaly's range in any mission. |
| 14 | Two toasts can stack and cut each other ("... the wheel." over "Autopilot off: Alien is gone."). Seen on `1ec26c1`. | Take the wheel while the autopilot ends. |
| 15 | **After a win or a loss the HUD stays under the card** (the goal line, the tower arrow, the radar). Cosmetic. | Any debrief, lose card or the ending. |

## What to know before playing (not bugs, but they confuse a first minute)
- A mission **starts away from its place** ("Fly to Mars: 3,140 km"); the battle begins when the carrier arrives. Fast needs the wing aboard. The briefing is the page for it.
- **Orders are two keys**: Q (FLEET), E (SHIP), C (SYSTEMS), then a row digit; a digit alone does nothing. **Dock is E then 6.** **B is the blink, P the pace.**
- The **"cloaked cache" bonus** is on every mission, because every level has anomalies.
- The ready room's board starts on the next mission; Enter or R on a finished one replays it (best score kept).

## The bots, final build (6 seeds, `node tools/campaign-bot.mjs --level N --seeds 6`)
Win percent; `plain` and `strong` play, `troy` models Troy's first try (launch at 45 s, no attack).

| mission | idle | plain | strong | troy | troyh |
|---|---|---|---|---|---|
| 1.1 | 0 | 100 (59 s) | 100 (67 s) | 0 | 0 |
| 1.2 | 0 | 100 (114 s) | 100 (114 s) | 0 | 0 |
| 1.3 | 0 | 100 (121 s) | 100 (128 s) | 0 | 0 |
| 2.1 | 0 | 100 (65 s) | 100 (56 s) | 0 | 0 |
| 2.2 | 0 | 100 (60 s) | 100 (55 s) | 0 | 0 |
| 2.3 | 0 | 100 (96 s) | 100 (94 s) | 0 | 17 |
| 3.1 | 0 | 100 (68 s) | 100 (65 s) | 0 | 0 |
| 3.2 | 0 | 100 (74 s) | 100 (37 s) | 0 | 0 |
| 3.3 | 0 | 100 (95 s) | 100 (65 s) | 17 | 33 |

## Tests that were red on main, and are fixed
`tests/contentproof.mjs` (the `listen.early` word and the shorter voice lines), `tests/settings.mjs` (the Places line), `tests/sfxlevels.mjs` (the play log wraps `buyFuel` and
`buyUpgrade`) and the Chrome boots for the new keys (panels, outposts, reveal) follow the game now. `tests/music.mjs` flakes under load (it passes alone; the gate retries it once).
