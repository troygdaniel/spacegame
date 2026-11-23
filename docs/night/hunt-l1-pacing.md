# Hunt: the rebuilt missions 1.2 and 1.3 flown by hand (card `space-game-hunt-l1-pacing`, 9-GEN, 22 Nov 2026)

Main `b67798b`. Missions 1.2 (mine and defend) and 1.3 (haulers home) were rebuilt as beats by a cloud session (card `l1-pacing`, pull request 4) and had only been checked by Node tests and bots. They were flown as a player in the real game, muted, one Chrome through the test lock, each part under two minutes, by **`tests/huntl1pacing-boot.mjs`** (by hand, not in the smoke): real key events, every key read from the key table. Bug fixes only; everything that is balance or design is in "For Troy" below and nothing of it is in code. (A second card, `space-game-l1-pacing-bugs`, then fixed finding A and made finding B visible: both are marked below.)

```
node tests/huntl1pacing-boot.mjs --mission 2|3 [--ending win|lose] [--calls right|wrong|none|mix] [--nolaunch] [--nobrief] [--ore N] [--secs 420]
```

The player it flies: launches, orders the three squads apart (`E` red, `R` green, `T` yellow, `W` all) at a target picked with `S` and `D`, tucks the miners or the haulers in when torpedo boats come (`Q`, Convoy) and lets them carry on after, recalls a hurt squad in a quiet stretch and launches it again, puts two pips on the shields (`J`) and a missile on the big ships for the heavy raid and first contact, answers the pilots' calls, holds `Space` when a hostile is in reach, and in 1.2 mines (`W`, Mine ore), flies to the goal (`I`) and docks (`U`). It writes down every beat and every order with the mission clock.

## What was flown

| mission | how | result |
|---|---|---|
| 1.2 | the squads apart, tuck in, calls answered right | **won at 269 s, 2,855, all four bonuses**, no ship and no miner lost, hull 600 of 600, the shield never under 143 |
| 1.2 | the old walk (`huntfleet-boot.mjs`: the whole wing on one target, the cruiser sent at raiders from the map) | won at 362 s, 1,840; both miners lost to one torpedo |
| 1.2 | the wing launched, then no order ever | **not lost and not won**: the guarding wing beats all five raids, both miners die, and from 294 s nothing more happens ("Mine ore: 174 of 450." for ever) |
| 1.2 | nothing pressed at all (the wing in the bay) | **lost at 167 s** ("The carrier is lost."), Enter flies it again from its brief |
| 1.3 | the squads apart, tuck in, calls answered right | **won at 292 s, 2,490, all three bonuses**, no ship lost, hull 600 of 600, the shield never under 121 |
| 1.3 | the wing launched, the autopilot on the convoy, then no order ever | **not lost and not won in 432 s**: one hauler gets home, the wing is dead by 312 s, and six aliens and the cruiser stand off (hull 600 to 541 in two minutes: the shield mends about as fast as they hurt it) |
| 1.3 | nothing pressed at all | **lost at 119 s** ("The haulers are lost."), Enter flies it again from its brief |

## The beats, as flown (the winning flights)

**1.2 Mine and defend.** The cruiser never moved from Ceres.

| clock | what happened | what the player decided | quiet before it |
|---|---|---|---|
| 5 s | wing out | all squads mine (`W`, Mine ore) | |
| 40 s | 3 skiffs, 4,100 px out, east | red stops mining and meets them; green and yellow cut rock | 35 s (mining) |
| 60 s | the probe is gone (19 s); Miner 1 at 71 percent | red back to the rock | |
| 100 s | 3 skiffs and a cutter, south-west | red and yellow at them | **40 s** |
| 112 s | 2 skiffs and a cutter, north-east; the radio says "Split the squads"; a pilot's call ("Second group sighted. Orders?") | green at the second group; the call answered "All ships attack" (the answer the table rates right) | |
| 128 to 132 s | both groups gone (28 s and 19 s) | red has a hurt fighter: recalled, launched again 14 s later, everyone back to the rock | |
| 175 s | 2 torpedo boats and 2 skiffs, south | Tuck in (`Q`, Convoy), yellow at the boats, red at the skiffs | **43 s** |
| 217 s | the boats are gone (42 s), no torpedo fired | Carry on, back to the rock (ore 430) | |
| 230 s | the heavy raid: 3 skiffs, 3 cutters, 2 brutes, north-east | two pips to the shields, every squad at it, three missiles at a brute (two out of range), a call ("They are breaking off") | 13 s |
| 267 s | the raid is gone (37 s), ore 464 | fly to the goal (already there), dock: "Sold 464 ore for 1392." | |

**1.3 Haulers home.** The cruiser flew on the autopilot beside Hauler 1 the whole way.

| clock | road | what happened | what the player decided | quiet before it |
|---|---|---|---|---|
| 10 s | | wing out, haulers leaving | escorts to the convoy (`Q`, Escorts), autopilot to the goal | |
| 25 s | 8 % | 3 skiffs ahead | red forward | |
| 41 s | | gone (16 s) | | |
| 67 s | 24 % | a torpedo boat and 2 skiffs | Tuck in, yellow at the boat, red at the skiffs; a "running" call | 26 s |
| 91 s | | gone (24 s); one torpedo fired at Hauler 1 and shot down | Carry on | |
| 115 s | 40 % | 3 skiffs and a cutter on the last hauler (1,250 px from the cruiser) | green back to her; a "breaking for the convoy" call: fighters intercept | 24 s |
| 131 s | | gone (16 s) | | |
| 158 s | 56 % | 2 skiffs and 2 cutters ahead | red and yellow; a "running" call: chase | 27 s |
| 173 s | | gone (15 s) | | |
| 200 s | 72 % | 3 skiffs on the last hauler | green; a "wingman hit" call: fight on | 27 s |
| 208 s | | gone (8 s) | green has a hurt fighter: recalled, out again at 220 s | |
| 226 s | 82 % | **first contact**: 4 raiders, 2 drones, 2 gunships | two pips to the shields, every squad at them, two missiles at a gunship, a "breaking for the convoy" call | 18 s |
| 252 s | | gone (26 s); wing 10 of 11 out, the rest being mended | hurt squads recalled and launched again | |
| 274 to 292 s | | the three haulers arrive | nothing | **40 s** |

No stretch with nothing alive was longer than 43 s. The 40 s stretches in 1.2 are spent mining (the ore counts up, nothing to decide); the last 40 s of 1.3 are empty road.

## Fixed (each pinned in `tests/camphuntpacing.mjs`)

| # | rank | finding | how to see it | fix |
|---|---|---|---|---|
| 1 | **major** | **The hint that names the keys of a beat was never on the screen.** The screen has one message box. The hint of a beat ("Two groups, two sides. One squad each: E red, R green.", "Torpedo boats! Tuck the miners in: Q, Convoy, "Tuck in".", and 1.3's three) was put up on the step its wave came, and the wave's own radio line ("A second group, north-east. Split the squads.") replaced it on the same frame. The player was told what to do and never which keys. | 1.2 at 112 s and 175 s, 1.3 at 66 s, 115 s and 220 s: the log has both lines in one second, the picture at 113 s has only the radio line. | A beat's hint waits 4 s after its wave came (`CAMPL1HINT_WAIT`, `src/campl1beats.js`): the radio line, then the sensors' "Contact" line (2 s), then the hint. Seen in the next flights: 70 s, 113 s and 224 s in 1.3. 2 checks; two pinned times in `tests/campl1pacing.mjs` moved (112 to 116 s, 175 to 179 s). |
| 2 | minor | **Enter meant for a pilot's call fired a missile.** Enter answers a call; with no call and no list open it fires a missile. A call closes by itself when the ship it is about is gone or its 8 s run out. In 1.3 the "running" call closed between `Up` and `Enter`, and the Enter spent one of the six missiles ("Missile away."). | 1.3 at 78 to 79 s (the first winning flight). | For 0.7 s after a call closed by itself Enter is still the call's and does nothing (`CAMP_CALLS.grace`, `campCallGrace`). A call the player answered leaves no such pause. 5 checks. |
| 3 | minor (words) | **"A third raid, and heavier. Hold them."** announced the heavy raid of 1.2, which is the fifth wave of five since the rebuild (the HUD beside it says WAVE 5 OF 5). | 1.2 at 230 s. | "The heavy raid is coming. Hold them." (`camp.say.rim6`: one line for the voice pack to record again). 4 checks. |
| 4 | minor (words) | **"Torpedo boat arming on fighter." and "Torpedo away at fighter."** The radio named a ship of the wing by its kind id. | 1.2 at 206 s with the wing on Mine ore (the old walk). | "our fighter" (`campTorpName` uses the wing's own name for a ship). 2 checks. Why a boat arms on a fighter at all is item A below. |

## For Troy (nothing changed)

| # | finding | what was seen | what to decide |
|---|---|---|---|
| A | **Fixed since (card `space-game-l1-pacing-bugs`): a torpedo boat went for your own fighters while they mined.** A wing ship on a Mine order counts as "a mining ship" to a pirate (`campPreyKind`), and the boats read the same rule. In 1.2 the boats come "for the miners" at 175 s, when the wing is usually mining: a boat armed on a fighter, and Tuck in (what the hint says to do) covers the two miner ships, not the fighters. | The old walk, 1.2 at 206 to 208 s. With the miners gone every boat went for a fighter on all three seeds tried. | Nothing: a boat's prey is the haulers, the miners and the cruiser, never a fighter or an escort, whatever their order (`campTorpPrey`, `src/camptorpedo.js`); the pirates' skiffs still hunt a mining fighter. The pin in `tests/camptorpedo.mjs` that said a mining escort is prey was turned round. |
| B | **Said since (same card), rule unchanged: ore sold for more than the store holds is left behind.** 1.2 ends with "Sold 464 ore for 1392."; the dock room said "Ore in the store: 1392". What goes on from a mission is the cash and the ore together, and a save holds 500 of it at the most (`CAMP.ore.cap`: `campProgressLoad` and `campNew` both cut it): the HUD of 1.3 starts at ORE 500/500 and the Earth refit says ORE 500. The only place the 892 can be spent is the dock's own room, in the seconds between the sale and Undock. | The 1.2 win, then 1.3 flown with that save. | See "The store" below: the game now says it in three places; what to do about it is Troy's. |
| C | **The pilot's call at 1.2's second group argues with the mission.** The radio and the hint say "Split the squads. One squad each", and in the same second a pilot asks for orders, where the answer rated right is "All ships attack": it sends every fighter and escort at one group and undoes the split the player has just made. | 1.2 at 112 to 113 s. | Which is the lesson of that beat? (The call's rating is one row of `CAMP_CALL_RATE`.) |
| D | **Neither mission asks the player to fly the cruiser or touch the power.** 1.2 was won with every bonus with the cruiser parked at Ceres; 1.3 with the autopilot on Hauler 1 from 10 s to the end. In both the hull was never touched and the shield never fell under 121 of 150, with the power moved only because the walk chose to. The raids die in 8 to 28 s (42 s for the boats). | Both winning flights. | Level 1 is the gentle one, but the cruiser has nothing to do in it. |
| E | **A player who launches and then does nothing does not lose either mission.** 1.2: the guarding wing wins all five raids by itself; the mission then waits for ever for ore nobody mines. 1.3: a hauler gets home, the wing dies, and the eight ships of first contact cannot kill a cruiser that does nothing (hull 600 to 541 in 150 s). The docs say "idle: lost 100 percent": that is the bot that does not even launch (lost at 167 s and 119 s here). | The two launch-only flights. | Whether first contact should be able to kill the cruiser, and whether 1.2 should end when the miners are dead. |
| F | **The "running" call often closes within a second of opening** (the runner is out of the battle or dead at once): 1.2 at 56 s and 185 s, 1.3 at 185 s. The amber list flashes up and is gone. Fix 2 stops it costing a missile; it still flashes. | The logs: `open` and `gone` one second apart. | Could wait until a runner has been running for a second or two. |
| G | **A pilot calls for orders while the whole wing is in the bay.** With nothing launched: "Second group sighted. Orders?", "Hostiles breaking for the convoy. Orders?". | The two nothing-pressed flights. | Should a call need a pilot outside? |
| H | **The briefings do not name the keys the beats ask for.** 1.2's third screen lists `W` three times (launch, attack, mine) and `U`; nothing for the squads (`E` `R` `T`) or Tuck in (`Q`, Convoy), though walkthrough step 5 says "tuck them in, or send a squad". 1.3's lists the escorts and Emergency shields, not Tuck in. | Third briefing screen of each. | With fix 1 the hints in flight now say the keys; the briefing could too. |
| I | **A sensors label can sit under the radio line.** "4 hostiles 427 km" (the edge arrow's words, bottom left) was drawn under "ROOK: Ore secured." | 1.2 at 176 s, the picture `pacing-2Wr-tuck.png`. | A picture fix for whoever owns the edge arrows. |

## The store: what the game says now, and the options (finding B)

Nothing of the economy changed. Three lines were added, each only when the cash and the ore together are over the store's 500:

- **At the sale**, on the radio, after "Sold 464 ore for 1392.": **"Only 500 comes with us. Spend 892 here."**
- **In the dock's room**, on the Build page under "Ore in the store: 1392", in amber: **"Only 500 leaves with you: 892 to spend here, or it is lost."** (This room is the only place it can be spent: a fighter is 25, an escort 45, the Fabricator 300.)
- **On the debrief**: **"Funds 1392. The store holds 500: 892 was left behind."**

Seen in the real game (1.2 flown again): the dock room and the debrief both show their line, and nothing runs off the card.

What it is worth knowing: 1.2's bonus asks for 400 ore sold, which is 1,200 of cash, so **every player who earns that bonus is over the store by 700 or more**, and in 1.2 the sale itself wins the mission, so the dock room after it is the last chance to spend. The options, for Troy:

1. **A bigger store** (`CAMP.ore.cap`, one number): 1,500 holds a full sale. It also lets more ore be mined and carried in every mission, so the refit prices (210 for the extra ships, 300 for the Fabricator) would want a look.
2. **Cash kept apart from ore**: the store stays 500 of ore, and what the Works pays is credit with no cap, saved in its own field and spent first (`campPay` already spends cash before ore). The smallest change to what a mission feels like; it needs a line in the save and in the ready room's Refit.
3. **A prompt to spend before leaving**: Undock (and the debrief's Enter) asks once when something is over: "892 will be left behind. Enter again to leave." No number changes; the loss stays, but it is a choice.
4. **Sell less for the same goal**: the Works pays 1 for 1 above the store, or the sale is capped at what fits. Nothing is lost because nothing is over; the "triple at the Works" of the briefing would need its words changed.
5. **Leave it**, now that it is said.

For 1-GEN (`space-game-repair-with-ore`): spending goes through `campPay` (cash first, then ore) and is checked against `campFunds` (cash and ore together); a repair paid in the field from `C.ore` alone would not see the cash, and anything a mission ends with over 500 is cut whichever it was.

## Checked and fine

- **The briefings match the flights**: 1.2 "Beat the 5 raids", ENEMIES "13 pirate skiffs, 5 pirate cutters, 2 pirate brutes, 2 pirate torpedo boats" (the waves add up to that); 1.3 "13 pirate skiffs, 3 pirate cutters, 1 pirate torpedo boat, and unknown ships", no alien named before first contact. The HUD says WAVE n OF 5 and OF 6.
- **No hint names a key or a thing that is gone**: every key in a hint, a briefing key box and the bottom key line is one of today's (`Q W E R T`, `P O I U`); the squads' keys are in the split hint.
- **The squads apart**: red, green and yellow each took their own target and kept it while another squad was ordered ("Red squad, attack the skiff.", "Yellow squad, attack the torpedo boat."); a recalled squad was mended and launched again; the target keys (`S`, `D`) reached every ship of a wave.
- **Convoy orders on the miners and on the haulers**: "Convoy, tuck in under our shield.", "Convoy, carry on."; tucked, no miner and no hauler took a torpedo.
- **Calls**: second, running, breakaway, wounded, cruiser and opportunity were all seen; right answers say "Good call. The wing is sharp."; an unanswered call takes the pilot's own pick after 8 s.
- **The dock and the sale** in 1.2, the debriefs with every bonus marked, the promotion line, "LEVEL 1 WON" and the Earth refit after 1.3, the lost cards, Enter flying the mission again from its brief, and the pause card.
- **No error** was logged by the game in any of the nine flights.
