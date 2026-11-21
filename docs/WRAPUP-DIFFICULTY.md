# Difficulty pass (card `space-game-wrapup-difficulty`, 20 Nov 2026)

> **Level 1 in the tables of this page is the old belt level.** It has been replaced by the rim run; its numbers and the way they were tuned are in the last section, "The rim run" (card `space-game-l1-rim-tune`, 21 Nov 2026). Levels 2 and 3 are as this page left them (checked again there).

Feature freeze, wrap-up work. The gameplay night found that a plain bot wins every level undamaged, and more player power has landed since (ore, turrets, missiles, ranks, systems, scouts, stances). This is the table of what the bots do now, and the numbers-only tuning that gives the Campaign a rising curve. No new mechanics: the only code is that a mission row may carry `hpScale` and `dmgScale` (the aliens' hull and damage, times the table's `CAMP.alien` scales; a row with none is as it was).

## How it was measured

`node tools/campaign-bot.mjs --pace calm|normal|brisk --bots plain,strong,idle --seeds 6 --json` over all nine missions (the bot flies each mission by itself, with the techs the chain gives: the first tech each earlier level offers).

- **plain**: the sensible player of the gameplay night: launches at 1 s, escorts, attacks every 5 s, steady skill.
- **strong**: plain plus a missile on every big ship in reach, the hurt wing recalled and launched again, sharp skill (`strong` in the bot's table).
- **idle**: a passive player who does nothing.

Cells: win rate (and the median seconds of the wins), `hull` the carrier's hull left, `hit` the damage the carrier took in all (its shield, 150, goes first, then the hull; the hull is 600 in levels 1 and 2, 900 in level 3), `lost` the wing ships lost. Medians over six seeds.

## The curve aimed at

Each level climbs, the third mission of each level is a real fight, level 3 is hard (X-Wing's way: the tension rises through a level and through the game).

| mission | aim for the plain player (normal pace) |
|---|---|
| 1.1 | gentle: no damage |
| 1.2 | a little damage, a few shots taken |
| 1.3 | a real fight: the shield gone, the hull touched, a few wing ships lost |
| 2.1 | gentle |
| 2.2 | damage and losses |
| 2.3 | a real fight, harder than 1.3 |
| 3.1 | gentle |
| 3.2 | damage and losses, more than 2.2 |
| 3.3 | hard: the hull down by a third or more, half the wing lost, a win on most seeds |

The passive player always loses; the strong player wins with about half the damage of the plain one (it still has to work).

## Before (the table the pass started from)

At each pace. A plain player took no hull damage in any mission, and lost no ships in most; the strong player was no harder to beat.

| mission | bot | calm | normal | brisk |
|---|---|---|---|---|
| 1.1 | plain | 100% 63s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 |
| 1.1 | strong | 100% 65s hull 600 hit 0 lost 0 | 100% 62s hull 600 hit 0 lost 0 | 100% 67s hull 600 hit 0 lost 0 |
| 1.1 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 1.2 | plain | 100% 57s hull 600 hit 26 lost 0 | 100% 57s hull 600 hit 32 lost 0 | 100% 57s hull 600 hit 36 lost 0 |
| 1.2 | strong | 100% 57s hull 600 hit 32 lost 0 | 100% 57s hull 600 hit 14 lost 0 | 100% 57s hull 600 hit 42 lost 0 |
| 1.2 | idle | 0% hull 600 hit 46 lost 0 | 0% hull 600 hit 42 lost 0 | 0% hull 600 hit 40 lost 0 |
| 1.3 | plain | 100% 73s hull 600 hit 38 lost 1 | 100% 73s hull 600 hit 36 lost 0 | 100% 66s hull 600 hit 24 lost 1 |
| 1.3 | strong | 100% 68s hull 600 hit 6 lost 0 | 100% 65s hull 600 hit 44 lost 1 | 100% 66s hull 600 hit 22 lost 0 |
| 1.3 | idle | 0% hull 0 hit 752 lost 0 | 0% hull 0 hit 754 lost 0 | 0% hull 0 hit 754 lost 0 |
| 2.1 | plain | 100% 42s hull 600 hit 0 lost 0 | 100% 38s hull 600 hit 0 lost 0 | 100% 48s hull 600 hit 0 lost 0 |
| 2.1 | strong | 100% 45s hull 600 hit 0 lost 0 | 100% 42s hull 600 hit 0 lost 0 | 100% 40s hull 600 hit 0 lost 0 |
| 2.1 | idle | 0% hull 529 hit 216 lost 0 | 0% hull 600 hit 96 lost 0 | 0% hull 565 hit 181 lost 0 |
| 2.2 | plain | 100% 51s hull 600 hit 0 lost 0 | 100% 49s hull 600 hit 0 lost 0 | 100% 48s hull 600 hit 0 lost 0 |
| 2.2 | strong | 100% 48s hull 600 hit 0 lost 0 | 100% 45s hull 600 hit 0 lost 0 | 100% 47s hull 600 hit 0 lost 0 |
| 2.2 | idle | 0% hull 481 hit 269 lost 0 | 0% hull 0 hit 754 lost 0 | 0% hull 0 hit 754 lost 0 |
| 2.3 | plain | 100% 52s hull 600 hit 0 lost 0 | 100% 50s hull 600 hit 0 lost 0 | 100% 46s hull 600 hit 0 lost 0 |
| 2.3 | strong | 100% 50s hull 600 hit 0 lost 0 | 100% 47s hull 600 hit 5 lost 0 | 100% 44s hull 600 hit 0 lost 0 |
| 2.3 | idle | 0% hull 424 hit 326 lost 0 | 0% hull 600 hit 125 lost 0 | 0% hull 491 hit 247 lost 0 |
| 3.1 | plain | 100% 52s hull 900 hit 0 lost 0 | 100% 50s hull 900 hit 4 lost 0 | 100% 51s hull 900 hit 4 lost 0 |
| 3.1 | strong | 100% 53s hull 900 hit 0 lost 0 | 100% 50s hull 900 hit 0 lost 0 | 100% 52s hull 900 hit 0 lost 0 |
| 3.1 | idle | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 |
| 3.2 | plain | 100% 68s hull 900 hit 52 lost 0 | 100% 66s hull 900 hit 41 lost 0 | 100% 65s hull 900 hit 48 lost 0 |
| 3.2 | strong | 100% 54s hull 900 hit 12 lost 0 | 100% 55s hull 900 hit 12 lost 0 | 100% 53s hull 900 hit 11 lost 0 |
| 3.2 | idle | 0% hull 767 hit 274 lost 0 | 0% hull 0 hit 1055 lost 0 | 0% hull 0 hit 1054 lost 0 |
| 3.3 | plain | 100% 36s hull 900 hit 18 lost 0 | 100% 37s hull 900 hit 24 lost 0 | 100% 39s hull 900 hit 24 lost 0 |
| 3.3 | strong | 100% 29s hull 900 hit 6 lost 0 | 100% 31s hull 900 hit 12 lost 0 | 100% 29s hull 900 hit 10 lost 0 |
| 3.3 | idle | 0% hull 820 hit 221 lost 0 | 0% hull 0 hit 1054 lost 0 | 0% hull 0 hit 1054 lost 0 |

## The numbers changed

Only numbers (the aliens' hull and damage per mission, and the sizes of the waves), in `src/campaign.js`:

| mission | hpScale | dmgScale | waves |
|---|---|---|---|
| 1.1 survey | 1 | 1 | as before |
| 1.2 haulers | 1 | 1 | as before (7 raiders and 3 drones, three times; a first try at 1.2 and 1.3 scales left the haulers lost on one seed in six at Calm) |
| 1.3 mothership | 1.6 | 1.8 | as before |
| 2.1 resources | 1.5 | 1.8 | the first wave 4 raiders and 3 drones (was 3 and 2) |
| 2.2 guards | 2 | 2.4 | 4 drones and 3 gunships (was 3 and 2), and a second wave at 40 s: 4 raiders and 3 drones |
| 2.3 relic | 2.6 | 3 | three waves (6 s: 4 drones, 3 raiders; 24 s: 3 gunships, 3 raiders; 42 s: 4 drones, 2 gunships) in place of one of 3 and 2 |
| 3.1 approach | 2.2 | 2.6 | 5 raiders and 3 drones on the first point (was 4 and 2) |
| 3.2 outer ring | 2.4 | 3 | the wave at 25 s: 4 drones, 3 gunships (was 3 and 2) |
| 3.3 inner ring | 2.4 | 3 | as before |

The hull scale also lifts the towers' and the mothership's hit points; the damage scale their shots. The scales never fall from a level's first mission to its third (`tests/camppace.mjs`, section F). Tries that were wrong, kept for the next tuner: 3.3 at 3 and 4 was far too hard (the plain bot won none); 2.2 at 2.4 and 3, and 2.3 at 2.8 and 3.4, cost the plain player 6 to 10 of the wing (a plain player should keep some of it), so they were eased to 2 and 2.4, and 2.6 and 3; 2.3 at 2.4 and 2.8 was too easy again (90 damage). With 2.6 and 3 the plain player loses 4 to 10 of the wing (about 6 on average).

## The bot and the merge train

The first full table on the merge train's tip (pace, mission places, fast-board) showed the plain bot with wins at 200 seconds and 1.2 lost on a seed in three: since the fast-board card a Fast trip needs the wing aboard, and the bot launched at 1 s, so it flew the trip to Mars at the cruiser's ordinary speed (about 140 s). A player flies the trip with the wing aboard and launches on arrival, so the bot does the same: `tools/campaign-bot.mjs` makes no order before the cruiser has arrived and times its plan (launch, escort, attack) from the arrival. The win times above are the trip (7 to 46 s by Fast) and the fight.

## After (the table now, at the three paces)

| mission | bot | calm | normal | brisk |
|---|---|---|---|---|
| 1.1 | plain | 100% 63s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 |
| 1.1 | strong | 100% 65s hull 600 hit 0 lost 0 | 100% 62s hull 600 hit 0 lost 0 | 100% 67s hull 600 hit 0 lost 0 |
| 1.1 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 1.2 | plain | 100% 114s hull 600 hit 12 lost 0 | 100% 114s hull 600 hit 12 lost 0 | 100% 114s hull 600 hit 6 lost 0 |
| 1.2 | strong | 83% 114s hull 600 hit 28 lost 0 | 100% 114s hull 600 hit 18 lost 0 | 100% 114s hull 600 hit 14 lost 0 |
| 1.2 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 1.3 | plain | 100% 131s hull 563 hit 165 lost 5 | 100% 132s hull 491 hit 169 lost 6 | 100% 121s hull 574 hit 158 lost 4 |
| 1.3 | strong | 100% 117s hull 600 hit 97 lost 3 | 100% 119s hull 588 hit 65 lost 3 | 100% 128s hull 595 hit 151 lost 4 |
| 1.3 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 2.1 | plain | 100% 59s hull 600 hit 13 lost 0 | 100% 55s hull 600 hit 11 lost 0 | 100% 65s hull 600 hit 13 lost 0 |
| 2.1 | strong | 100% 58s hull 600 hit 13 lost 1 | 100% 51s hull 600 hit 15 lost 0 | 100% 56s hull 600 hit 13 lost 0 |
| 2.1 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 2.2 | plain | 100% 61s hull 600 hit 43 lost 1 | 100% 63s hull 600 hit 55 lost 4 | 100% 60s hull 600 hit 93 lost 4 |
| 2.2 | strong | 100% 60s hull 600 hit 37 lost 1 | 100% 56s hull 600 hit 26 lost 0 | 100% 55s hull 600 hit 37 lost 0 |
| 2.2 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 2.3 | plain | 100% 104s hull 600 hit 86 lost 6 | 100% 106s hull 538 hit 144 lost 6 | 100% 96s hull 595 hit 137 lost 5 |
| 2.3 | strong | 100% 95s hull 600 hit 100 lost 4 | 100% 95s hull 600 hit 69 lost 5 | 100% 94s hull 600 hit 54 lost 5 |
| 2.3 | idle | 0% hull 0 hit 763 lost 0 | 0% hull 0 hit 760 lost 0 | 0% hull 0 hit 763 lost 0 |
| 3.1 | plain | 100% 72s hull 900 hit 9 lost 1 | 100% 72s hull 900 hit 21 lost 1 | 100% 68s hull 900 hit 31 lost 0 |
| 3.1 | strong | 100% 75s hull 900 hit 31 lost 1 | 100% 67s hull 900 hit 21 lost 1 | 100% 65s hull 900 hit 21 lost 1 |
| 3.1 | idle | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 |
| 3.2 | plain | 100% 79s hull 870 hit 162 lost 1 | 100% 77s hull 834 hit 212 lost 3 | 100% 74s hull 859 hit 176 lost 1 |
| 3.2 | strong | 100% 37s hull 900 hit 36 lost 0 | 100% 37s hull 900 hit 18 lost 0 | 100% 37s hull 900 hit 36 lost 0 |
| 3.2 | idle | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 |
| 3.3 | plain | 100% 83s hull 600 hit 425 lost 5 | 100% 93s hull 445 hit 597 lost 7 | 100% 95s hull 499 hit 522 lost 6 |
| 3.3 | strong | 100% 58s hull 784 hit 259 lost 1 | 100% 77s hull 704 hit 292 lost 2 | 100% 65s hull 766 hit 266 lost 2 |
| 3.3 | idle | 0% hull 359 hit 662 lost 0 | 0% hull 0 hit 1051 lost 0 | 0% hull 0 hit 1054 lost 0 |

Reading it at the normal pace (the table was run on the merge train's tip 128379e plus this commit): the plain player goes from 0 damage at 1.1 and 12 at 1.2 through 169 at 1.3 (6 of the wing lost); 11 at 2.1, 55 at 2.2 and 144 at 2.3 (6 lost); 21 at 3.1, 212 at 3.2 to 597 at 3.3 (the hull 445 of 900 left, 7 of the wing lost). Every mission is won on every seed at every pace by the plain player, in 55 to 132 seconds (the trip included); the idle player never wins; the strong player wins every mission at every pace but one seed of six at 1.2 on Calm, and takes about half the damage of the plain one at the real fights (3.3: 292 against 597). Level 2's third mission is no harder than 1.3 by the damage taken (144 against 169; the two lose the same 6 ships): the second level climbs inside itself, and level 3 is the hard one. Calm and Brisk keep the same curve (3.3 costs the plain player 425 at Calm, 597 at Normal, 522 at Brisk): the pace changes the look of the fight more than its balance. Seeds vary a lot in the real fights (2.3: 4 to 10 of the wing lost, 50 to 350 damage over twelve seeds); the table is the median of six.

## Pinned, and re-run

- `tests/camppace.mjs` (sections E and F): the plain bot wins all nine at Normal and Calm in 25 to 180 seconds, idle never wins, and the scales of the curve never fall inside a level.
- `tests/campaign.mjs`: the crude test player is pinned only on the five gentler missions; the four real fights are for the bot tool. The briefing's distance and the HUD's are one number (`campKmText`, the centre of the place, as the map reads it).
- Re-run it with `node tools/campaign-bot.mjs --pace normal --bots plain,strong,idle --seeds 6` (and `calm`, `brisk`); `--set alien.hpScale=1.2` tries a what-if.

## The rim run (card `space-game-l1-rim-tune`, 21 Nov 2026)

Level 1 was rewritten as the rim run (1.1 escort a transport from the Lunar Base to Ceres, 1.2 mine and defend at Ceres, 1.3 haulers home and first contact; cards `space-game-l1-rim-missions`, `space-game-l1-pirates-traffic`), and the fighters got real dogfights (`space-game-fighter-dogfights`). This is the tune of that level on main a3f6841. The aim, from the card: the plain bot wins all three at every pace, the hard one has real damage and losses, an idle player never wins, and each mission takes about five to eight minutes. Undo anchor: the tag `level1-before-rim` (main before the rim run).

**Method.** The same tool (`node tools/campaign-bot.mjs --level 1 --pace calm|normal|brisk --bots plain,strong,idle --seeds 12 --json`), then what-ifs on one number at a time with `--set` (a path into the table, arrays by index: `--set 'levels[1].missions[0].convoys[0].speed=52'`), then the rows were edited and the three paces run again. The time is the bot's clock from arrival to the win card (all three start where the mission is, so there is no trip). A person is slower than the bot (menus, the map, a pause, a detour for ore), so the bot at about five minutes is a person at about six or seven.

**Before (main a3f6841, the rim run as landed, 6 seeds).** The plain bot wins and takes almost nothing; 1.1 is a 167 s road, 1.2 over in two minutes, 1.3 in under three:

| mission | bot | calm | normal | brisk |
|---|---|---|---|---|
| 1.1 | plain | 100% 167s hull 600 hit 27 lost 0 | 100% 167s hull 600 hit 30 lost 0 | 100% 167s hull 600 hit 20 lost 0 |
| 1.1 | strong | 100% 167s hull 600 hit 35 lost 0 | 100% 167s hull 600 hit 20 lost 0 | 100% 167s hull 600 hit 30 lost 0 |
| 1.1 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 1.2 | plain | 100% 125s hull 600 hit 7 lost 0 | 100% 124s hull 600 hit 0 lost 0 | 100% 122s hull 600 hit 5 lost 0 |
| 1.2 | strong | 100% 124s hull 600 hit 0 lost 0 | 100% 125s hull 600 hit 0 lost 0 | 100% 121s hull 600 hit 5 lost 0 |
| 1.2 | idle | 0% hull 0 hit 752 lost 0 | 0% hull 0 hit 752 lost 0 | 0% hull 0 hit 750 lost 0 |
| 1.3 | plain | 100% 177s hull 600 hit 27 lost 0 | 100% 177s hull 600 hit 61 lost 0 | 100% 177s hull 600 hit 27 lost 0 |
| 1.3 | strong | 100% 177s hull 600 hit 18 lost 0 | 100% 177s hull 600 hit 47 lost 0 | 100% 177s hull 600 hit 31 lost 0 |
| 1.3 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |

**What was changed** (all in the rows of `CAMP.levels[1].missions`; the lines of the ship's voice for the new raids are in `content/text/campaign-rimtune.md`):

| mission | before | now |
|---|---|---|
| 1.1 escort | transport 100 px/s, three raids (lane 0.15, 0.4, 0.7: 2 skiffs; 3 skiffs and a cutter; 3 skiffs and 2 cutters), par 220 | transport **52 px/s** (a little over five minutes), **five** raids (lane 0.1, 0.28, 0.46, 0.64, 0.82: 2 skiffs; 3 skiffs; 3 skiffs and a cutter; 3 skiffs and 2 cutters; 4 skiffs and 2 cutters), par 400 |
| 1.2 mine | scales 1 and 1, mine 120 and sell 100, raids at 40 s (+30 s, +35 s early) of 3, 4 and 5 ships, par 260 | scales **1.4 and 1.8**, mine **190** and sell **160** (the store held 200: it holds 500 since card `space-game-ore-bay-bigger`; the sell bonus is 400 now, see docs/CAMPAIGN.md), raids at **70 s, then 100 s after the one before** (or sooner never): 4, 6 and 9 ships (the last with two brutes), par 380 |
| 1.3 haulers | scales 1.6 and 1.8, haulers 110 px/s, raids of 4 and 5 ships, contact at 60 percent with 2 raiders and a drone, par 260 | scales **2.2 and 2.4**, haulers **62 px/s**, raids of 6 and 7 ships (lane 0.16 and 0.34), contact at **52** percent with **5 raiders, 3 drones and 2 gunships**, par 380 |

**After (12 seeds, the three paces).** Plain wins every seed at every pace; idle never wins (1.1 and 1.3: the convoy is lost; 1.2: the carrier is destroyed). The climb is 1.1 gentle (a few shots on the shield), 1.2 a little damage, 1.3 a real fight (the shield gone, the hull touched, two or three of the wing lost, a hauler or two). The strong bot (missiles, recalls) takes about two thirds of the damage of the plain one at 1.3 (49 to 82 percent over the three paces).

| mission | bot | calm | normal | brisk |
|---|---|---|---|---|
| 1.1 | plain | 100% 317s hull 600 hit 55 lost 0 | 100% 317s hull 600 hit 45 lost 0 | 100% 317s hull 600 hit 22 lost 0 |
| 1.1 | strong | 100% 317s hull 600 hit 62 lost 0 | 100% 317s hull 600 hit 50 lost 0 | 100% 317s hull 600 hit 30 lost 0 |
| 1.1 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 1.2 | plain | 100% 298s hull 600 hit 27 lost 0 | 100% 298s hull 600 hit 34 lost 0 | 100% 297s hull 600 hit 47 lost 0 |
| 1.2 | strong | 100% 299s hull 600 hit 43 lost 0 | 100% 297s hull 600 hit 50 lost 0 | 100% 296s hull 600 hit 43 lost 0 |
| 1.2 | idle | 0% hull 0 hit 752 lost 0 | 0% hull 0 hit 754 lost 0 | 0% hull 0 hit 754 lost 0 |
| 1.3 | plain | 100% 292s hull 568 hit 163 lost 2 | 100% 292s hull 600 hit 122 lost 3 | 100% 292s hull 599 hit 137 lost 3 |
| 1.3 | strong | 100% 292s hull 600 hit 120 lost 1 | 100% 292s hull 600 hit 100 lost 2 | 100% 292s hull 600 hit 67 lost 1 |
| 1.3 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |

**Levels 2 and 3 after the dogfights (6 seeds, plain bot, normal pace; the first number is the table of this page above, taken before the dogfights, the second is main a3f6841).** The curve stands: all nine still win at all three paces and idle never wins; 3.2 is the same to the digit.

| mission | damage taken before | now | wing lost before | now |
|---|---|---|---|---|
| 2.1 | 11 | 0 | 0 | 0 |
| 2.2 | 55 | 58 | 4 | 2 |
| 2.3 | 144 | 147 | 6 | 6 |
| 3.1 | 21 | 19 | 1 | 0 |
| 3.2 | 212 | 212 | 3 | 3 |
| 3.3 | 597 | 508 | 7 | 5 |

Nothing in levels 2 and 3 was changed. 2.1 is gentler by about ten points of damage, 3.3 a little easier (the wing is stronger in a dogfight); both stay inside the aim of this page.

**Tries that were wrong.**
- The slower roads alone (transport 52, haulers 62) with the old raids gave the right length and no fight: 10 to 18 points of damage in 1.1 and 1.3. The raids had to grow, not only the road.
- 1.2 with later raids but `early: 50` was over in 196 s: a raid comes when the one before is beaten and `early` seconds have gone, so the third raid arrived at 170 s. The gap was set to 100 s and the ore raised to 190 in one step, and the length followed the raids (298 s).
- 1.3 at the scales 2.2 and 2.6 with a brute in the second raid lost one seed in twelve at Brisk (92 percent: all three haulers lost). The damage scale went to 2.4 and the raid to 4 skiffs and 3 cutters.

**Assumptions.** (1) "About five to eight minutes" is read as the plain bot's clock at about five minutes (317, 298, 292 s) and a person at six or seven; if a person at the real controls is much slower than that, the transport and the haulers can go to 45 px/s. (2) The three missions are meant to climb, 1.3 about as hard as 2.3 in damage but with fewer losses (2.3 is the harder at 4 to 6 wing lost). (3) "Losses in the hard ones" is 1.3 (wing ships and haulers); 1.2 stays a little damage because its pirates go for the miners, not the wing. (4) Par is 1.2 times the plain bot's time, to the next ten seconds. (5) The pace changes how the pirates fly and shoot, not the lengths: the roads are set by the convoys' speeds, so the three paces give the same times.

**The bonuses** (5-GEN's rim hunt, docs/night/hunt-l1-rim.md: at the old numbers the 260 s bonus and the sell-180 bonus were free). The swift bonuses are the par: the plain bot is under it (317 of 400, 298 of 380) and a person at six or seven minutes is about on it. The sell bonus of 1.2 is now 260 in all: the store holds 200, so it takes a second sale after more mining; the goal (sell 160) is met by one sale.

**Pinned.** `tests/camprim.mjs` (the speed, the first raid, the ore and sale numbers), `tests/camppace.mjs` section E (level 1 in four to seven minutes at Normal and Calm, idle given the time to be beaten), `tests/campbrief.mjs` (the digit of a panel key is not a number of the data). The briefing line of 1.1 no longer counts its raids (`camp.bf.1.1.w2`).
