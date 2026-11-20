# Night: the Campaign's gameplay (3-GEN, 20 Nov 2026)

Card `space-game-night-gameplay`. Analysis first (below), then two small changes, each ONE `[night] gameplay` commit that reverts alone (table at the end), then proposals for what would change how it plays. Main is tagged `campaign-before-night`. Everything here was measured on main at `c030e31` (missiles on F, the easier level 1, the turrets and their lead, ore) plus the two commits below; main moved four times while I worked and the first half of my numbers were thrown away each time, so each table says what it was measured on.

## How it was measured

`node tools/campaign-bot.mjs` (new, plain Node, no Chrome, changes nothing in the game) flies whole levels in the logic sim with a bot player and prints win rate, seconds, hull, Earth's shield and where the damage came from. A bot is a way of playing, not a clever player: **plain** launches at 1 s, escorts the Mars convoy, attacks every 5 s, flies the carrier at what is nearest Earth and holds Space; the others take one thing away or add one (`noescort`, `guard` = launch and never attack, `carrier` = no wing at all, `late` = launches at 30 s, `cycle` = recalls the wounded wing and launches again, `missile`, `troy` = see below). Skill is the carrier's aim (`sharp`, `rough`); with the turrets it hardly matters, so the tables are `rough`. 20 seeds a row (`--seeds`), the same seeds every run. `--set alien.hpScale=2` changes a number of the table for one run: the what-ifs below. "hull" is the carrier's hull at the end and "taken" the damage it was dealt in all: the 150-point ore shield takes damage first, so the hull can stay whole while the shield is half gone.

**Calibration against a real player.** The play log of the first tries (`~/dev/spacegame-playlogs`, 20 Nov, level 1) shows a player who launched at 45 s, escorted at 81 s, and never gave an attack order: lost to Earth's shield at 195 s and again at 278 s, then won only with god mode on. The `troy` bot does exactly that (launch 45 s, escort 81 s, no attack, the carrier stays at the base and fires at what comes within 900 px). On the numbers before the easier level 1 (`--old`) it loses 80 percent of seeds, all by Earth's shield; the real player lost 2 of 2. All the other bots are far better players than that one, so a win rate here is a ceiling, not a forecast.

## Findings, most important first

1. **The Campaign is now easy for anyone who holds Space.** Plain bot, 20 seeds: level 1 won in 87 s, level 2 in 62 s, level 3 in 129 s. The carrier is dealt 18, 5 and 119 hit points in all (median), against a 150-point shield (the ore card: it takes damage before the hull and does not mend) plus 600 or 900 of hull: **the hull is untouched on all 20 seeds of levels 1 and 2 and on 14 of 20 of level 3 (worst 29 of 900 lost).** **The carrier with no wing at all wins all three levels on every seed** (`carrier`: 126, 97 and 138 s; dealt 226, 37 and 304 in all: 80 of hull lost on level 1, none on level 2, 154 on level 3). On the first main I measured (`b452fca`, the old main gun, no shield) the same plain bot lost 10, 5 and 82 hull and a carrier with no wing lost or timed out on level 1; the turrets, their lead and the shield took that away. Nothing the player does in the battle is a decision any more except to hold fire; the wing is a speed-up, not a need (finding 4).

2. **The one way to lose is to be passive on level 1.** The `troy` bot (launches late, never presses 2, the carrier stays at the base) **still loses 75 percent of seeds** (65 with sharp aim): Earth's shield goes at 129 to 350 s, drained by the waves (gunships 232, raiders 194, drones 155 of the 600; the mothership 35). The easier level 1 made the player who attacks late safe; it did not touch the player who never attacks. 5-GEN's change 8 (`docs/night/ux.md`: "Press 2 to send the fighters...") is the right cure: the same bot that reads that line 3 s after the first real damage and then attacks wins **20 of 20** seeds against 5 of 20. Levels 2 and 3 have no Earth to lose, so they cannot be lost this way: the passive bot there just never finishes (it sits where it warps in).

3. **The difficulty curve is flat, and level 2 cannot be made harder with a number.** Win times of the plain bot: 87, 62 and 129 s: nowhere near the 4 to 6 minutes `docs/CAMPAIGN.md` aims at. A slow player (`late`: 97, 66, 121 s) is still done in two minutes. Strengthening the aliens (`--set alien.hpScale=2 --set alien.damageScale=2`) moves level 1 to 131 s / 502 hull left and level 3 to 178 s / 316 of 900 left, **and does not move level 2 at all** (72 s and a whole hull at hp x2 damage x2; still 100 percent won at hp x3 damage x6, 81 s, 383 of 600 left): its guards hold still until a ship comes close, its two waves come from 4,000 to 6,000 px away and the wing kills them before they shoot. Level 2 needs its own change (proposal 2), not a scale. Level 3 is the other extreme: its towers (101 of the ~134 hit points a run the carrier takes) respond to damage x3 by killing the carrier (8 percent won), so the global scale is too blunt: one number moves level 3 from a walk to a wall.

4. **What the orders are worth** (win seconds on levels 1, 2, 3; rough aim):

   | way of playing | level 1 | level 2 | level 3 | what it tells |
   |---|---|---|---|---|
   | no wing at all (`carrier`) | 126 | 97 | 138 | the carrier alone wins: Launch (1) saves 16 to 39 s |
   | launch, never attack (`guard`) | 110 | 73 | 126 | Attack (2) saves 23 s on level 1, 11 on level 2, nothing on level 3 |
   | plain (launch, escort Mars, attack) | 87 | 62 | 129 | |
   | plain without the escort (`noescort`) | 87 | 62 | 129 | **Escort (3) changes nothing**: identical to the second, and the convoys deliver 2 of 2 on 20 of 20 seeds even with no wing (the Mars freighter's lowest hit points with the carrier parked: 4 to 70 of 200; one lost in 20) |
   | plain, recalling the wounded (`cycle`) | 88 | 62 | 130 | **Recall (5) changes nothing**: 0 to 2 ships lost a level with or without it, nobody to bring home |
   | plain, plus missiles on F (`missile`) | 82 | 51 | 103 | F saves 5 to 26 s: the best order, as a pure speed-up |

   Guard (4) is what the wing does after launch anyway; as a command it adds nothing in any run. Of the five orders and F, two shorten a level (1, 2, plus F), three do nothing a bot can find.

5. **A fault: the beam hit every ship on every step it spent inside it** (fixed, change 1). The tech text says the turrets fire beams of twice the damage that go through everything. A beam shot is a bullet that is not stopped by a hit, and the hit test ran each step with no memory of which ship it had hurt: one turret shot meant to do 8 did 16 to a raider, 18 to a gunship, **64 to the 90 px mothership (8 times)**, because the bigger the ship the more steps the shot spent inside it. With eight turrets that is the mothership's 700 hit points in a few volleys. (Before the turrets, with the main gun, it was 3x on a raider and 21x on the mothership.) Found by firing a single shot at a still ship of each kind (`tests/campgameplay-beam.mjs`; 5 of its 14 checks fail on main without the fix). The beam is still the strongest pick after it (finding 7).

6. **Nothing said so before a level was lost** (change 2). The only sign that Earth's shield or the hull was going was the bar. The ship's voice now says one line when each first falls to half and to a quarter. With finding 1 it will rarely speak for a player who fires; for the passive player of finding 2 it is the first word that Earth is going.

7. **The six techs are not equal, and the first one picked decides most of it.** Plain bot, rough, win seconds / hull lost, 20 seeds, on `c030e31`:

   | level 1 pick | on level 2 | level 3 with hull plating | with second bay | with repair field |
   |---|---|---|---|---|
   | shield grid | 62 s / 0 | 129 / 5 | 118 / 1 | 128 / 1 |
   | beam cannon | 53 s / 0 | **95 / 0** | **92 / 0** | 96 / 0 |
   | warp blink | 49 s / 0 | 122 / 63 | 115 / 51 | 119 / 4 |

   At today's strength every cell wins on every seed, so the picks differ in seconds. **Beam** takes 33 s off level 3 and nothing else comes close; **blink** is the fastest on level 2 (it crosses the 5,000 px gap) and the only pick that leaves the carrier hurt on level 3 (51 to 63 hull lost: it has no shield). Level 2's pick hardly matters (10 s between plating and bay2) because the carrier is not threatened. **Give the aliens twice the hit points and damage and the picks separate sharply** (level 3, same bot, win % / seconds / hull lost): shield+plating 100% / 178 / 572, shield+repair 100% / 177 / 86, **beam+bay2 100% / 104 / 103**, beam+repair 100% / 112 / 32, blink+plating **25%** / 153 / 847, blink+bay2 20%, blink+repair 75%. So: beam is the strongest, repair field the best of level 2's (it heals 4 hp a second, more than level 3 deals), hull plating the weakest, blink the weakest of level 1's for a player who has to fight. A player cannot read that from the card text.

8. **Pacing: the clock is the player's.** A wave comes at its table time (20, 80, 140 s on level 1) or sooner: 8 to 12 s after the wave before is dead, and wave 3 waits until wave 2 is dead. A player who kills fast gets the next wave 10 to 20 s after the last one started (level 1, plain bot: waves at 20, 30 to 40, 56 to 72 s), so the level takes 85 s and there is never a pause. Idle time (no alien alive after the first wave) is 0 s on every level for every bot; the only quiet is the first 15 to 25 s of each level, which is the time to launch (a launch takes 4.2 s). The table's later times (80, 140) are for the slow player only.

9. **Alien behaviour is fair, with one ambush.** Looked at the code and at 180 whole battles, half of them with random orders and random flying (no NaN, no negative bay or magazine, Earth's shield never below 0, the wing never above its size: checked again on `c030e31`). Waves are told ("Aliens on the Mars lane, pilot") and come from far away (level 1: 3,000 px, level 2: 4,900 to 6,000 px). The guards of level 2 wait until a ship comes within 90 percent of their reach and do nothing else. A tower outranges a turret by about 270 px (800 against 526 to its centre) and shoots slowly: on level 3 the towers deal about 100 hit points a run to a carrier with 900, the gunships 17. The mothership shells Earth only when none of your ships is within 1,000 px of it, so going out to it is also how Earth is protected. The one thing that feels unfair: **level 3's first wave appears 750 to 1,000 px from a carrier that flies straight at the planet**, 15 s after warp-in, with one line of warning ("Defenders are launching from the planet."). The carrier is its target (`goal: 'carrier'`). The bot takes it without damage because it has fired up; a player who has not launched yet meets six ships at close range.

## What was changed, and how to undo each

Two changes, each ONE commit that reverts alone (`git revert <hash>`), each with its own node test. Proved on a scratch copy: each reverted by itself leaves the Campaign, content and hygiene tests green. I wrote a third (a hint saying "press 1" or "press 2" when the player has not) and dropped it when main showed 5-GEN's change 8 doing the same: no duplicate.

| # | Change | Commit | What it does | Undo | Look at in the morning |
|---|---|---|---|---|---|
| 1 | A beam shot hurts each ship once | `c77e90b` | One check in `campBullets` (`src/campaign.js`): a beam bullet remembers the ships it has hurt. `tests/campgameplay-beam.mjs` (14 checks; 5 fail on main without it) | `git revert c77e90b` (clean) | Pick the beam after level 1 and fight the mothership: the turrets still go through a line of ships and reach 1.5 times as far, and the mothership now takes 11 volleys of the eight turrets (about 5 s of fire), not 2 |
| 2 | The ship's voice warns at half and a quarter | `498401c` | `campWarn` in `src/campaign.js`, `CAMP.warn = [0.5, 0.25]`, four lines (`camp.say.earthhalf`, `earthlow`, `hullhalf`, `hulllow`) in `content/text/ui.md`, `src/contenttables.js` and the sealed `content.generated.js`. `tests/campgameplay-warn.mjs` (18 checks) | `git revert 498401c`, then one conflict in `content.generated.js`: take either side and run `node tools/build-content.mjs --seal` | Level 1: park the carrier and send no fighters: Earth's shield speaks at 50 and at 25 percent, once each |

The bot tool and this file are in a third commit (`tools/campaign-bot.mjs`, `docs/night/gameplay.md`), with no gameplay in it. Merging: `content.generated.js` is one line and every branch that adds words conflicts there; take main's and run `node tools/build-content.mjs --seal`.

## Proposals (these change how it plays: not done, for Troy)

1. **Put pressure back, with two numbers.** `CAMP.alien.hpScale` 2 and `CAMP.alien.damageScale` 2 (one line each, the table's top): level 1 wins in 131 s with 502 of 600 hull left, level 3 in 178 s with 316 of 900 left, both on 100 percent of seeds for a bot that fires; and the level 2 picks and the tech choices start to matter (finding 7). `hpScale` 1.5 with `damageScale` 3 is the edge: 90 and 95 percent won. Past damage x3 level 3's towers win. `node tools/campaign-bot.mjs --set alien.hpScale=2 --set alien.damageScale=2` shows it in a minute; the tower's own `CAMP.tower.damage` (10) is the knob if level 3 should stay softer than level 1.
2. **Make level 2 cost something.** It is unlosable at any scale. Cheapest: a third wave in `levels[2].waves` (the second comes at 75 s and the level is usually over at 62), or the second guard group nearer the caches, or the caches farther apart (they are 3,000 to 3,800 px from each other; flying them is the level).
3. **Hit the 4 to 6 minutes.** The `early` rule brings the next wave 8 to 12 s after the last is dead, which is what makes a level 85 s. A floor of about 25 s between two wave starts would lengthen every level without making it harder per second.
4. **Give the escort order a job.** The convoys deliver on every seed. Either wave 1 (`goal: 'convoy:mars'`) comes sooner, at 10 s with the freighter, or a lost convoy costs something (the tech pick, a line of story).
5. **Rebalance the techs once there is pressure.** Beam is far ahead (shorter fights, pierces, reaches 1.5 times): `CAMP.tech.beam.damage` 2 to 1.5 or `reach` 1.5 to 1.3 would bring it near shield. Blink needs a reason to be picked (a shorter cooldown than 20 s, or it also drops the carrier's drag). Plating `hull` 1.5 to 2 would bring it near the repair field.
6. **Level 3's first wave** could come 5 s later or from the other side (`levels[3].waves[0].from`), so it is seen coming; or the warp-in could start the carrier 1,500 px back.
7. **Recall and Escort have no use in these fights**: if they should, the mothership's volleys (3 shots of 8) are what kills fighters, and the waves would have to reach the convoy before the wing does.

## The tool

    node tools/campaign-bot.mjs                                   levels 1 to 3, every bot, 12 seeds
    node tools/campaign-bot.mjs --level 1 --seeds 20 --skill rough --bots plain,troy
    node tools/campaign-bot.mjs --old                             level 1 with the numbers before the easier level 1
    node tools/campaign-bot.mjs --tech beam                       start with these techs
    node tools/campaign-bot.mjs --set alien.hpScale=2             what if: one number of the table for this run

It reads the game the way `tests/nodegame.mjs` does, so it measures what is on the branch it is run on: run it again after any change to `CAMP` and the tables above are a minute away. The `troy` bot has nothing to do on levels 2 and 3 (it sits where it warps in).
