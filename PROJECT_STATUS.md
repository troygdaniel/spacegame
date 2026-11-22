# Project status

**Updated: 21 Nov 2026, written against main `3214678`.** This file is the first thing to read after the README. It says what the game is doing *now*. Whoever lands a change that alters what a player sees or does updates it in the same hand-in (rule in `CLAUDE.md`). If this file and the code disagree, the code is right and this file is stale: say so in an issue.

## In one minute

A browser game, plain JavaScript on Phaser 3, no build step. Two modes on one title screen:

- **The Campaign** (where all current work is): a Homeworld-style *commander* game. You fly a big, slow carrier ("the cruiser") and command its small ships (fighters, escorts) with panels, a command strip and your voice. Missions are scripted like X-Wing's (a mission is a sequence of beats with objectives and bonuses), and the ship's power is shared between weapons, shields and engines like X-Wing's. Earth's fleet against the aliens: three levels, nine missions, a story about an outpost, not an invasion.
- **Long Haul** (finished, not being changed): an Elite-flavoured trader and rescue game. It shares the engine, the art and the sounds.

The owner is Troy. He plays the build himself and gives feedback in chat; his feedback becomes the work. His standing goal for the Campaign (21 Nov 2026): *fights were not interactive and escorts were boring; he wants to direct the fleet more.* Feature freeze since 20 Nov: **bug fixes and the fleet-command batch only; new ideas go on the bench** (`ROADMAP.md`).

## Running version

There is **no hosted deploy**. Troy runs the game on his own computer with `node tools/serve.mjs` (http://127.0.0.1:8787/), which serves a checkout of `main`. The running version is `main` at or just after the commit named at the top of this file (a landing moves `main` by one merge commit); if the page and this file disagree, ask Troy which commit he is on. Anyone else runs it the same way (see `README.md`).

## What works now, level by level

All nine missions are playable and winnable (the plain test bot wins every one; a player who gives no orders does not). Numbers and detail: `docs/CAMPAIGN.md`, balance: `docs/CAMPAIGN-TUNING.md`.

| Level | Missions | State |
|---|---|---|
| **1, the rim run** (Lunar Base to Ceres and back toward Earth) | 1.1 escort a transport past pirates, 1.2 mine at Ceres and defend the miners, 1.3 escort the haulers home and meet the first aliens | The newest and most worked level. **1.1 is the one finished example** of the fleet-command systems (below): something happens about every minute. 1.2 and 1.3 are tuned (the rim tune) but the new beats are not scripted into them. Then the **Earth refit** (pick one of three techs, spend ore on ships). |
| **2, Alpha Centauri** (warp unlocked) | 2.1 resources, 2.2 the guards, 2.3 the relic | Works. Being retuned for the new systems. |
| **3, the alien home world** | 3.1 approach, 3.2 outer ring, 3.3 inner ring (twelve towers) | Works, then the ending (the outpost reveal). Being retuned for the new systems. |

Between missions you are in **the ready room**: four rows (Missions, Refit, Rank, Launch). Enter opens a row as an overlay (missions with their briefing, the refit with what each choice changes in numbers, the rank ladder). You can replay any mission you have flown. After each battle you pick one of three techs.

### What the fleet-command batch added (all on main)

The batch is the answer to "I want to direct the fleet more". Each item has its own section in `docs/CAMPAIGN.md`.

- **Panels and orders.** Three panels on keys Q (FLEET), E (SHIP), C (SYSTEMS), then a row's digit; an open panel takes Up/Down/Enter. FLEET has pages: orders, stances, convoy orders. The same orders can be typed (I) or spoken (U).
- **Command time.** While a panel, the map or an order-call prompt is open, the battle runs at a quarter speed, with a sign. Fights are also 15 percent slower overall.
- **Pilots ask for orders.** Timed radio calls with three choices (1 2 3), real costs and effects.
- **Convoy orders.** Tuck in, Hold here, Run for it, for the ships you escort; the cruiser's shield can cover a ship tucked in.
- **Scout ahead.** An escort route can fork: send a scout, then pick the short dangerous lane or the long quiet one.
- **Enemy torpedo boats** (slow, ignore the fighters, launch a heavy torpedo at the convoy; the turrets and missiles can shoot torpedoes down) and a **rival ship** (the pirate leader: an enemy your size that duels the cruiser in phases, so power management matters).
- **Fighter repair.** A hurt fighter flies home, is mended and relaunches.
- **Ship systems.** Power pips to weapons, shields and engines (keys J K L, `;` to reset); three Long Haul-style gauges (shields, speed, lasers) with power bars; **shields now mend by themselves**, at a rate the shield pips set (the old pay-ore recharge is gone).
- **Quality of life.** Zoom out to the whole system (Tab map) and twice as far in flight; the ore store holds 500; the title starts a mode only on a deliberate choice (Enter, K, arrows then Enter, or a click), not on any key.

## Being built right now

- **Panel keys move to Z X C** (FLEET to Z, SHIP to X, SYSTEMS stays C), so the three panels sit under the left hand; Q and E become free. Part 1 (arrow keys, Mine ore moves to FLEET) is on main; the key change itself is in progress. Until it lands, the keys in this file and the README are Q E C.
- **Retuning all nine missions** after the new systems (target: the plain bot wins all nine at all three paces with losses in the hard ones; an idle player never wins; a player who answers calls and uses convoy orders does clearly better; level 1 missions about five to eight minutes). 1.1 is done.
- **Enemy torpedo boats**: on main and used in 1.1; finishing touches.
- **Test upkeep** for the above (Chrome boot scripts that press keys that moved).

## Known issues and rough edges

- **Balance is mid-retune.** Levels 2 and 3 were tuned before the fleet-command batch; expect them to feel easier or odd until the retune lands. The last all-nine playthrough with findings is `docs/WRAPUP.md` (20 Nov, before the batch); the night's fixes are in `docs/night/*.md`.
- **Levels 2 and 3 after the fleet-command batch** were flown by hand (`docs/night/hunt-l23-fleet.md`, 21 Nov): all six missions win and nothing crashes, but 2.1, 2.2, 3.1 and 3.2 are won in about half a minute with the hull untouched and no pilot ever calls in them (calls start at 40 s of a mission); only 2.3 and 3.3 ask anything of the shield, the power pips and the calls. Tuning notes are in that doc for the retune; two small fixes (the second bay's numbers on the pick card, a call about a pilot already flying home) landed with it.
- **Level 1 was flown start to finish after the fleet-command batch** (`docs/night/hunt-l1-fleet.md`, by `tests/huntfleet-boot.mjs`): the Tab map's V (scout) and T (take a lane) now act on the lane you marked even when the autopilot follows the transport, a toast no longer shows half a sentence, and 1.1 says "transport" where it said "haulers". Open items are listed there (the call plate's key caption, which the two-hands key change replaces; the lost card's tip).
- **Debug keys** (the backslash wins a mission) exist for testing and are **off** unless the address says `?debug=1`.
- **Chrome tests are run rarely** by choice (they are slow and take a shared lock). The Node suites (about 160) run on every landing, and some Chrome boots are updated by hand when keys move and run only at the gate. A red boot after a key change is usually a stale key in the script, not a game bug.
- **Only mission 1.1 has the full set of beats.** Asking "why are the other eight plainer" is fair; that is the cut-list rule below.
- **Long Haul** is unchanged; its design notes are `docs/UNIVERSE.md` and `docs/ECONOMY.md`.

## What Troy has and has not played

As far as the project's notes say:

- He has played the Campaign from the title through the ready room and into missions, and his feedback of 21 Nov (title started on any key, ready room too complicated, ore bay too small, zoom, a refit that did not show what changes) is all fixed and on main.
- He has **not yet judged mission 1.1 with the whole fleet-command batch together** (order calls, convoy orders, scouting, torpedo boats, the rival, command time). **The cut list below waits on that.**
- Levels 2 and 3 have been played less since the batch.

## Open design questions

These need Troy's answer; do not decide them in a PR or an issue comment.

1. **The cut list** (nothing is cut until he has played 1.1 and says so). The test for every idea: *what does the player decide, and what does it cost?* A mission is a sequence of questions. Candidates: the stances page on the FLEET panel (order calls may cover it); the pace key P (command time may cover it); holding Space to fire the turrets (in a commander game the turrets could fire by themselves, the job being power and orders); scout-ahead routes (content for one mission); the distress call in 1.1. Rule: make 1.1 the one finished example before spreading these systems to levels 2 and 3.
2. **The key layout for two hands.** Panels on Z X C under the left hand is agreed and in progress. What goes under the right hand (steering and the J K L power keys sit where?) is a draft, not decided.
3. **Which benched ideas come back first** (fleet groups, fleet orders from the map, a second carrier, a supply ship, the Dying Earth story chapter): see `ROADMAP.md`.

## Where to look next

`README.md` (play it, controls), `ROADMAP.md` (next and benched), `ARCHITECTURE.md` (how it is built), `docs/CAMPAIGN.md` (every Campaign rule and number), `docs/WORKING-WITH-AI.md` (how to help from outside the repo).
