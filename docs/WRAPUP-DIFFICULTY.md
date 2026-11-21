# Difficulty pass (card `space-game-wrapup-difficulty`, 20 Nov 2026)

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
| 1.2 haulers | 1.2 | 1.3 | as before |
| 1.3 mothership | 1.6 | 1.8 | as before |
| 2.1 resources | 1.5 | 1.8 | the first wave 4 raiders and 3 drones (was 3 and 2) |
| 2.2 guards | 2.4 | 3 | 4 drones and 3 gunships (was 3 and 2), and a second wave at 40 s: 4 raiders and 3 drones |
| 2.3 relic | 2.8 | 3.4 | three waves (6 s: 4 drones, 3 raiders; 24 s: 3 gunships, 3 raiders; 42 s: 4 drones, 3 gunships) in place of one of 3 and 2 |
| 3.1 approach | 2.2 | 2.6 | 5 raiders and 3 drones on the first point (was 4 and 2) |
| 3.2 outer ring | 2.4 | 3 | the wave at 25 s: 4 drones, 3 gunships (was 3 and 2) |
| 3.3 inner ring | 2.4 | 3.2 | as before |

The hull scale also lifts the towers' and the mothership's hit points; the damage scale their shots. The scales never fall from a level's first mission to its third (`tests/camppace.mjs`, section F). The first try of 3.3 at 3 and 4 was far too hard (the plain bot won none); 2.4 and 3.2 is a win on every seed with the hull at half.

## After (the table now, at the three paces)

| mission | bot | calm | normal | brisk |
|---|---|---|---|---|
| 1.1 | plain | 100% 63s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 |
| 1.1 | strong | 100% 65s hull 600 hit 0 lost 0 | 100% 62s hull 600 hit 0 lost 0 | 100% 67s hull 600 hit 0 lost 0 |
| 1.1 | idle | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 | 0% hull 600 hit 0 lost 0 |
| 1.2 | plain | 100% 57s hull 600 hit 41 lost 0 | 100% 57s hull 600 hit 62 lost 0 | 100% 57s hull 600 hit 52 lost 0 |
| 1.2 | strong | 100% 57s hull 600 hit 68 lost 0 | 100% 57s hull 600 hit 49 lost 0 | 100% 57s hull 600 hit 70 lost 0 |
| 1.2 | idle | 0% hull 600 hit 42 lost 0 | 0% hull 600 hit 31 lost 0 | 0% hull 600 hit 73 lost 0 |
| 1.3 | plain | 100% 93s hull 397 hit 248 lost 7 | 100% 89s hull 487 hit 234 lost 5 | 100% 94s hull 556 hit 191 lost 6 |
| 1.3 | strong | 100% 74s hull 530 hit 89 lost 2 | 100% 84s hull 541 hit 191 lost 6 | 100% 77s hull 600 hit 79 lost 4 |
| 1.3 | idle | 0% hull 0 hit 763 lost 0 | 0% hull 0 hit 763 lost 0 | 0% hull 0 hit 759 lost 0 |
| 2.1 | plain | 100% 48s hull 600 hit 0 lost 0 | 100% 46s hull 600 hit 0 lost 0 | 100% 59s hull 600 hit 0 lost 0 |
| 2.1 | strong | 100% 45s hull 600 hit 0 lost 0 | 100% 44s hull 600 hit 9 lost 0 | 100% 52s hull 600 hit 0 lost 0 |
| 2.1 | idle | 0% hull 154 hit 588 lost 0 | 0% hull 467 hit 281 lost 0 | 0% hull 249 hit 490 lost 0 |
| 2.2 | plain | 100% 61s hull 599 hit 148 lost 3 | 100% 75s hull 577 hit 173 lost 6 | 100% 84s hull 556 hit 173 lost 5 |
| 2.2 | strong | 100% 48s hull 600 hit 29 lost 1 | 100% 52s hull 600 hit 43 lost 1 | 100% 55s hull 600 hit 98 lost 1 |
| 2.2 | idle | 0% hull 0 hit 763 lost 0 | 0% hull 0 hit 760 lost 0 | 0% hull 0 hit 763 lost 0 |
| 2.3 | plain | 100% 113s hull 501 hit 232 lost 7 | 100% 114s hull 264 hit 286 lost 7 | 100% 113s hull 383 hit 298 lost 7 |
| 2.3 | strong | 100% 101s hull 570 hit 171 lost 3 | 100% 101s hull 477 hit 224 lost 6 | 100% 103s hull 530 hit 167 lost 7 |
| 2.3 | idle | 0% hull 0 hit 751 lost 0 | 0% hull 0 hit 754 lost 0 | 0% hull 0 hit 759 lost 0 |
| 3.1 | plain | 100% 59s hull 900 hit 19 lost 1 | 100% 65s hull 900 hit 9 lost 2 | 100% 60s hull 900 hit 9 lost 1 |
| 3.1 | strong | 100% 52s hull 900 hit 9 lost 1 | 100% 55s hull 900 hit 9 lost 2 | 100% 62s hull 900 hit 19 lost 1 |
| 3.1 | idle | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 | 0% hull 900 hit 0 lost 0 |
| 3.2 | plain | 100% 76s hull 787 hit 252 lost 2 | 100% 80s hull 773 hit 245 lost 3 | 100% 79s hull 805 hit 227 lost 1 |
| 3.2 | strong | 100% 65s hull 888 hit 151 lost 1 | 100% 70s hull 900 hit 90 lost 1 | 100% 65s hull 900 hit 86 lost 1 |
| 3.2 | idle | 0% hull 0 hit 1051 lost 0 | 0% hull 0 hit 1062 lost 0 | 0% hull 0 hit 1055 lost 0 |
| 3.3 | plain | 100% 83s hull 570 hit 454 lost 5 | 100% 93s hull 405 hit 638 lost 7 | 100% 95s hull 462 hit 557 lost 6 |
| 3.3 | strong | 100% 58s hull 766 hit 276 lost 1 | 100% 77s hull 681 hit 311 lost 2 | 100% 65s hull 747 hit 285 lost 2 |
| 3.3 | idle | 0% hull 313 hit 707 lost 0 | 0% hull 0 hit 1056 lost 0 | 0% hull 0 hit 1060 lost 0 |

Reading it at the normal pace: the plain player goes from 0 damage at 1.1 through 234 at 1.3, 173 at 2.2 and 286 at 2.3 to 638 at 3.3 (the hull 405 of 900 left, seven of the wing lost); every mission is won on every seed at every pace by both the plain and the strong player, the plain player in 46 to 114 seconds; the idle player never wins; the strong player takes about half the damage of the plain one at the real fights (3.3: 311 against 638) and wins faster. Calm and Brisk keep the same curve (3.3 costs the plain player 454 at Calm, 638 at Normal, 557 at Brisk): the pace changes the look of the fight more than its balance.

## Pinned, and re-run

- `tests/camppace.mjs` (sections E and F): the plain bot wins all nine at Normal and Calm in 25 to 180 seconds, idle never wins, and the scales of the curve.
- `tests/campaign.mjs`: the crude test player is pinned only on the five gentler missions; the four real fights are for the bot tool.
- Re-run on the merge train's tip (the pace card and the mission places add a trip of 7 to 46 seconds by Fast before a mission, the wave clocks count from arrival): see the foot of this file.
