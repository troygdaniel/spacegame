# The cockpit sweep (card `space-game-fly-fighter-l3`, 26 Nov 2026)

What the missions do when a player flies a pilot's fighter with the Wren's feel (`src/campcockpit.js`, the C key, behind `CAMP.flags.cockpit`), measured by bots in the logic sim: plain Node, no Chrome. **Nothing was retuned**: the rule below is a proposal for Troy to agree first.

Run: `node tools/campaign-bot.mjs --cockpit --seeds 32 --save sweep32.json` on main at the landing of the simulation half (`4ffe2816`), the cockpit table at its defaults (`hpK` 2, `damageK` 1, `rateK` 1, turrets 'auto'), pace Brisk, 32 seeds a mission, skills sharp, steady and rough. About 40 minutes.

## The bots

Each is `plain` (the cruiser flown the plain way, which stands for a Q order the cruiser keeps flying; its own Space is the fighter's gun now, so its turrets fire only if `CAMP.cockpit.turrets` is 'auto') plus a player in a fighter.

- **ace**: takes Red 1's stick as soon as he is out and flies him through `C.cockpit.input` (the five fields a human's keys write). Human limits: what its hands do is what it decided 200 ms ago; it fires inside a cone by skill (sharp 0.15 rad, steady 0.22, rough 0.3); it leads the target by skill (full, 0.6, 0.3); boost only on a chase over 800 px; it hands the fighter back under 30 percent hull and takes one again over 80 percent. It flies at the nearest foe, or waits near the cruiser.
- **ace1**: ace with `hpK` 1 (the pilot's own hull): the comparison column.
- **sit**: takes the stick and does nothing; the cruiser and the other five pilots alone, turrets 'auto'.
- **sitoff**: sit with turrets 'off': the cruiser fires nothing while the stick is away.

## The rule (the scope report's proposal)

1. ace's median win time is at least 85 percent of plain's (not faster by more than 15 percent);
2. ace's median cruiser damage is at least 70 percent of plain's (not softer by more than 30 percent);
3. sit (turrets 'auto') loses no mission plain wins: where plain wins at least 90 percent of the seeds, sit wins at least plain's rate less 3 points (one seed in 32).

A rule is judged only where plain's own number is big enough to mean something (win time over 20 s, damage over 30): under that it is n/a. This floor is mine, not the report's.

**15 of 27 mission-skills pass.** Fail: 1.1 rough, 1.2 sharp, 1.2 steady, 1.2 rough, 1.3 rough, 2.3 sharp, 2.3 steady, 2.3 rough, 3.1 sharp, 3.2 sharp, 3.2 steady, 3.2 rough.

## What it says

- **2.3 (hold the relic): a fast fighter kites the first wave away from the ring.** ace wins in 16 s against plain's 73 to 88, with the cruiser untouched (damage 0): the seven raiders chase the boosting fighter 2 km off while the cruiser sits on the ring for its 14 seconds. It is the "fast ship is everywhere" problem in miniature, at all three skills.
- **3.2 and 3.1: the cruiser takes 60 to 70 percent less damage** with the fighter out (3.2: 54 against 144 to 162 at the same time; 3.1 sharp: 9 against 31); 1.1 and 1.3 at rough: about half. Every one of them is a rule 2 fail.
- **1.2: taking a pilot out of the wing costs the miners.** sit wins 78 to 88 percent of 1.2 against plain's 97 to 100, ace 84 to 97; every lost seed is the miners. Rule 3 fails at all three skills. (The wing is what guards them; the cruiser's auto turrets do not cut rocks.)
- **Turrets 'off' is not a game.** sitoff wins 0 to 22 percent of 1.1, 1.2, 1.3, 2.2, 2.3 and 3.3, 47 to 63 of 3.1 and 94 to 100 of 2.1 and 3.2: with Space the fighter's gun and the cruiser silent nothing keeps the convoys alive. 'auto' is the only fair default (as the report said).
- **`hpK` hardly matters to a bot**: ace's fighter is almost never hit (deaths 0.06 a run at most, at any skill), because a Wren-flown fighter at 480 to 800 px/s is not hit by the aliens' slow shots. ace1 differs from ace mostly in 3.2 and 3.3, where the fighter takes hits and the cruiser takes more damage with the thinner hull (3.3: 472 against 353). A human will be hit far more than the bot; only play says what `hpK` should be.
- **What the bots cannot say**: whether it feels like the Wren, how often a human dies, and what a human does with a fighter that outruns everything (kiting, rescuing miners, skipping a wave). The bot flies at the nearest foe and returns to the cruiser; the first of those is what made 2.3 fall.

## Numbers

Median over 32 seeds. won: percent of seeds won. t(win): seconds, median of the won seeds. taken: the cruiser's damage in all (shield first), median. away: the cruiser's damage while the stick was away. cockpit: seconds in the cockpit, the fighter's kills a run (median), its deaths a run (mean).

| mission | skill | bot | won% | t(win) | taken | away | cockpit s | kills | deaths | rule |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 | sharp | plain | 88 | 306 | 207 | - | - | - | - |  |
|  |  | ace | 100 | 306 | 212 | 212 | 305 | 2 | 0 | PASS (time pass, taken pass, sit n/a) |
|  |  | ace1 | 100 | 306 | 212 | 212 | 305 | 2 | 0 |  |
|  |  | sit | 94 | 306 | 222 | 222 | 305 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 5 | 5 | 115 | 0 | 0 |  |
| 1.1 | steady | plain | 100 | 306 | 207 | - | - | - | - |  |
|  |  | ace | 100 | 306 | 222 | 222 | 305 | 4 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 306 | 222 | 222 | 305 | 4 | 0.03 |  |
|  |  | sit | 97 | 306 | 227 | 227 | 305 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 5 | 5 | 114 | 0 | 0 |  |
| 1.1 | rough | plain | 100 | 306 | 212 | - | - | - | - |  |
|  |  | ace | 100 | 306 | 105 | 105 | 305 | 7 | 0 | FAIL (time pass, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 306 | 105 | 105 | 305 | 7 | 0.03 |  |
|  |  | sit | 100 | 306 | 222 | 222 | 305 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 5 | 5 | 114 | 0 | 0 |  |
| 1.2 | sharp | plain | 100 | 266 | 29 | - | - | - | - |  |
|  |  | ace | 91 | 287 | 16 | 16 | 276 | 1 | 0 | FAIL (time pass, taken n/a, sit FAIL) |
|  |  | ace1 | 91 | 287 | 12 | 12 | 272 | 1 | 0 |  |
|  |  | sit | 88 | 277 | 35 | 35 | 274 | 0 | 0 |  |
|  |  | sitoff | 22 | 398 | 67 | 68 | 370 | 0 | 0 |  |
| 1.2 | steady | plain | 100 | 266 | 35 | - | - | - | - |  |
|  |  | ace | 84 | 272 | 21 | 22 | 270 | 3 | 0 | FAIL (time pass, taken FAIL, sit FAIL) |
|  |  | ace1 | 84 | 272 | 21 | 22 | 269 | 3 | 0 |  |
|  |  | sit | 84 | 275 | 31 | 31 | 268 | 0 | 0 |  |
|  |  | sitoff | 6 | 381 | 60 | 59 | 345 | 0 | 0 |  |
| 1.2 | rough | plain | 97 | 267 | 33 | - | - | - | - |  |
|  |  | ace | 97 | 270 | 33 | 34 | 268 | 9 | 0 | FAIL (time pass, taken pass, sit FAIL) |
|  |  | ace1 | 97 | 270 | 31 | 24 | 268 | 9 | 0 |  |
|  |  | sit | 78 | 285 | 26 | 26 | 273 | 0 | 0 |  |
|  |  | sitoff | 13 | 403 | 53 | 53 | 299 | 0 | 0 |  |
| 1.3 | sharp | plain | 100 | 292 | 63 | - | - | - | - |  |
|  |  | ace | 100 | 292 | 56 | 56 | 291 | 1 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 292 | 56 | 56 | 291 | 1 | 0.03 |  |
|  |  | sit | 100 | 292 | 60 | 60 | 291 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 39 | 39 | 157 | 0 | 0 |  |
| 1.3 | steady | plain | 100 | 292 | 58 | - | - | - | - |  |
|  |  | ace | 100 | 292 | 53 | 53 | 291 | 4 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 292 | 53 | 50 | 291 | 4 | 0 |  |
|  |  | sit | 100 | 292 | 63 | 62 | 291 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 39 | 39 | 154 | 0 | 0 |  |
| 1.3 | rough | plain | 100 | 292 | 77 | - | - | - | - |  |
|  |  | ace | 100 | 292 | 39 | 39 | 291 | 8 | 0 | FAIL (time pass, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 292 | 39 | 39 | 291 | 8 | 0 |  |
|  |  | sit | 100 | 292 | 67 | 67 | 291 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 47 | 47 | 170 | 0 | 0 |  |
| 2.1 | sharp | plain | 100 | 42 | 17 | - | - | - | - |  |
|  |  | ace | 100 | 43 | 6 | 6 | 35 | 1 | 0 | PASS (time pass, taken n/a, sit pass) |
|  |  | ace1 | 100 | 43 | 6 | 6 | 35 | 1 | 0 |  |
|  |  | sit | 100 | 43 | 15 | 15 | 35 | 0 | 0 |  |
|  |  | sitoff | 97 | 119 | 115 | 114 | 111 | 0 | 0 |  |
| 2.1 | steady | plain | 100 | 42 | 15 | - | - | - | - |  |
|  |  | ace | 100 | 43 | 0 | 0 | 35 | 1 | 0 | PASS (time pass, taken n/a, sit pass) |
|  |  | ace1 | 100 | 43 | 0 | 0 | 35 | 1 | 0 |  |
|  |  | sit | 100 | 43 | 17 | 17 | 35 | 0 | 0 |  |
|  |  | sitoff | 97 | 111 | 144 | 145 | 104 | 0 | 0 |  |
| 2.1 | rough | plain | 100 | 42 | 17 | - | - | - | - |  |
|  |  | ace | 100 | 42 | 0 | 0 | 34 | 3 | 0 | PASS (time pass, taken n/a, sit pass) |
|  |  | ace1 | 100 | 42 | 0 | 0 | 34 | 3 | 0 |  |
|  |  | sit | 100 | 43 | 9 | 9 | 35 | 0 | 0 |  |
|  |  | sitoff | 97 | 118 | 138 | 138 | 110 | 0 | 0 |  |
| 2.2 | sharp | plain | 100 | 73 | 132 | - | - | - | - |  |
|  |  | ace | 100 | 80 | 101 | 101 | 70 | 1 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 80 | 118 | 101 | 66 | 1 | 0 |  |
|  |  | sit | 100 | 77 | 170 | 170 | 66 | 0 | 0 |  |
|  |  | sitoff | 6 | 90 | 786 | 786 | 88 | 0 | 0 |  |
| 2.2 | steady | plain | 100 | 73 | 153 | - | - | - | - |  |
|  |  | ace | 100 | 81 | 130 | 130 | 70 | 2 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 81 | 133 | 130 | 69 | 2 | 0 |  |
|  |  | sit | 100 | 79 | 167 | 167 | 68 | 0 | 0 |  |
|  |  | sitoff | 13 | 96 | 786 | 786 | 87 | 0 | 0 |  |
| 2.2 | rough | plain | 100 | 76 | 144 | - | - | - | - |  |
|  |  | ace | 100 | 76 | 104 | 104 | 66 | 5 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 76 | 104 | 104 | 66 | 5 | 0 |  |
|  |  | sit | 100 | 79 | 153 | 153 | 68 | 0 | 0 |  |
|  |  | sitoff | 3 | 74 | 783 | 783 | 88 | 0 | 0 |  |
| 2.3 | sharp | plain | 100 | 73 | 137 | - | - | - | - |  |
|  |  | ace | 100 | 16 | 0 | 0 | 15 | 0 | 0 | FAIL (time FAIL, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 16 | 0 | 0 | 15 | 0 | 0 |  |
|  |  | sit | 100 | 94 | 220 | 220 | 93 | 0 | 0 |  |
|  |  | sitoff | 3 | 240 | 814 | 814 | 87 | 0 | 0 |  |
| 2.3 | steady | plain | 100 | 73 | 141 | - | - | - | - |  |
|  |  | ace | 100 | 16 | 0 | 0 | 15 | 0 | 0 | FAIL (time FAIL, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 16 | 0 | 0 | 15 | 0 | 0 |  |
|  |  | sit | 100 | 95 | 223 | 223 | 94 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 810 | 810 | 83 | 0 | 0 |  |
| 2.3 | rough | plain | 100 | 88 | 144 | - | - | - | - |  |
|  |  | ace | 100 | 16 | 0 | 0 | 15 | 1 | 0 | FAIL (time FAIL, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 16 | 0 | 0 | 15 | 1 | 0 |  |
|  |  | sit | 100 | 96 | 245 | 245 | 95 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 803 | 803 | 81 | 0 | 0 |  |
| 3.1 | sharp | plain | 100 | 69 | 31 | - | - | - | - |  |
|  |  | ace | 100 | 74 | 9 | 9 | 64 | 1 | 0 | FAIL (time pass, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 74 | 9 | 9 | 63 | 1 | 0 |  |
|  |  | sit | 100 | 73 | 19 | 19 | 63 | 0 | 0 |  |
|  |  | sitoff | 59 | 228 | 493 | 493 | 240 | 0 | 0 |  |
| 3.1 | steady | plain | 100 | 69 | 19 | - | - | - | - |  |
|  |  | ace | 100 | 73 | 9 | 9 | 63 | 2 | 0 | PASS (time pass, taken n/a, sit pass) |
|  |  | ace1 | 100 | 73 | 9 | 0 | 61 | 2 | 0 |  |
|  |  | sit | 100 | 71 | 21 | 22 | 61 | 0 | 0 |  |
|  |  | sitoff | 63 | 196 | 615 | 615 | 262 | 0 | 0 |  |
| 3.1 | rough | plain | 100 | 69 | 21 | - | - | - | - |  |
|  |  | ace | 100 | 70 | 0 | 0 | 60 | 5 | 0 | PASS (time pass, taken n/a, sit pass) |
|  |  | ace1 | 100 | 70 | 0 | 0 | 60 | 5 | 0 |  |
|  |  | sit | 100 | 72 | 21 | 22 | 62 | 0 | 0 |  |
|  |  | sitoff | 47 | 223 | 680 | 680 | 275 | 0 | 0 |  |
| 3.2 | sharp | plain | 100 | 44 | 144 | - | - | - | - |  |
|  |  | ace | 100 | 44 | 54 | 18 | 26 | 0 | 0 | FAIL (time pass, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 46 | 72 | 36 | 28 | 0 | 0 |  |
|  |  | sit | 100 | 46 | 162 | 162 | 37 | 0 | 0 |  |
|  |  | sitoff | 97 | 119 | 702 | 702 | 110 | 0 | 0 |  |
| 3.2 | steady | plain | 100 | 44 | 162 | - | - | - | - |  |
|  |  | ace | 100 | 44 | 54 | 18 | 25 | 0 | 0 | FAIL (time pass, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 48 | 108 | 72 | 30 | 0 | 0 |  |
|  |  | sit | 100 | 46 | 180 | 180 | 37 | 0 | 0 |  |
|  |  | sitoff | 94 | 114 | 677 | 677 | 106 | 0 | 0 |  |
| 3.2 | rough | plain | 100 | 44 | 144 | - | - | - | - |  |
|  |  | ace | 100 | 33 | 54 | 36 | 21 | 1 | 0 | FAIL (time FAIL, taken FAIL, sit pass) |
|  |  | ace1 | 100 | 42 | 90 | 0 | 15 | 1 | 0 |  |
|  |  | sit | 100 | 46 | 162 | 162 | 37 | 0 | 0 |  |
|  |  | sitoff | 100 | 115 | 673 | 673 | 107 | 0 | 0 |  |
| 3.3 | sharp | plain | 100 | 55 | 468 | - | - | - | - |  |
|  |  | ace | 100 | 60 | 353 | 126 | 29 | 1 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 83 | 472 | 216 | 47 | 0 | 0.06 |  |
|  |  | sit | 100 | 57 | 450 | 450 | 56 | 0 | 0 |  |
|  |  | sitoff | 9 | 160 | 1185 | 1184 | 127 | 0 | 0 |  |
| 3.3 | steady | plain | 100 | 61 | 436 | - | - | - | - |  |
|  |  | ace | 100 | 62 | 378 | 108 | 29 | 1 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 82 | 494 | 194 | 45 | 1 | 0.03 |  |
|  |  | sit | 100 | 66 | 446 | 446 | 65 | 0 | 0 |  |
|  |  | sitoff | 0 | - | 1170 | 1170 | 113 | 0 | 0 |  |
| 3.3 | rough | plain | 100 | 60 | 436 | - | - | - | - |  |
|  |  | ace | 100 | 54 | 317 | 90 | 24 | 2 | 0 | PASS (time pass, taken pass, sit pass) |
|  |  | ace1 | 100 | 61 | 306 | 130 | 36 | 2 | 0.03 |  |
|  |  | sit | 100 | 66 | 450 | 450 | 65 | 0 | 0 |  |
|  |  | sitoff | 13 | 130 | 1167 | 1166 | 122 | 0 | 0 |  |

## After the fire-rate change (card `space-game-fly-fighter-fire-rate`, 26 Nov 2026)

Troy flew the fighter and asked for a faster gun, so the defaults became `rateK` 3 and `damageK` 0.5 (a steady shot every 183 ms, half a pilot's damage a shot; was 1 and 1). The same sweep, the same 32 seeds, the same rule, with `hpK` 2 and turrets 'auto': **13 of 27 mission-skills pass (was 15)**. Fail now: 1.1 rough, 1.2 rough, 1.2 sharp, 1.2 steady, 1.3 rough, 2.2 rough, 2.3 rough, 2.3 sharp, 2.3 steady, 3.1 sharp, 3.2 rough, 3.2 sharp, 3.2 steady, 3.3 rough.

- **Newly failing:** 2.2 rough, 3.3 rough. **Newly passing:** none.
- The faster gun makes the bot's wide-cone skills (rough) hit more: it takes less cruiser damage out of the cockpit (2.2 rough 81 against plain's 144, 3.3 rough 270 against 436, 1.3 rough 32 against 77) and kills more (1.2 rough 10 kills, 1.2 steady 5 instead of 3). Win times are about the same except 3.2 rough (30 s against 44).
- 2.3 is unchanged (16 s at every skill): it is the kiting, not the gun.
- `sit` and `sitoff` do not use the gun, so their rows are as before: 1.2 still fails rule 3 at every skill.
- ace1 (hpK 1) differs from ace, as before, in 3.2 and 3.3 where the thinner hull gets hit.

ace, before and after: win time / cruiser damage / the fighter's kills (median of 32); plain's win time / damage is the base. The rule is judged on ace's two numbers against plain's.

| mission | skill | plain t / taken | ace before (rateK 1, damageK 1) | ace after (rateK 3, damageK 0.5) | rule |
|---|---|---|---|---|---|
| 1.1 | sharp | 306 / 207 | 306 / 212 / 2 | 306 / 217 / 1 | PASS -> PASS |
| 1.1 | steady | 306 / 207 | 306 / 222 / 4 | 306 / 202 / 5 | PASS -> PASS |
| 1.1 | rough | 306 / 212 | 306 / 105 / 7 | 306 / 105 / 8 | FAIL -> FAIL |
| 1.2 | sharp | 266 / 29 | 287 / 16 / 1 | 292 / 9 / 2 | FAIL -> FAIL |
| 1.2 | steady | 266 / 35 | 272 / 21 / 3 | 273 / 33 / 5 | FAIL -> FAIL |
| 1.2 | rough | 267 / 33 | 270 / 33 / 9 | 269 / 24 / 10 | FAIL -> FAIL |
| 1.3 | sharp | 292 / 63 | 292 / 56 / 1 | 292 / 56 / 1 | PASS -> PASS |
| 1.3 | steady | 292 / 58 | 292 / 53 / 4 | 292 / 50 / 5 | PASS -> PASS |
| 1.3 | rough | 292 / 77 | 292 / 39 / 8 | 292 / 32 / 9 | FAIL -> FAIL |
| 2.1 | sharp | 42 / 17 | 43 / 6 / 1 | 44 / 6 / 1 | PASS -> PASS |
| 2.1 | steady | 42 / 15 | 43 / 0 / 1 | 43 / 6 / 1 | PASS -> PASS |
| 2.1 | rough | 42 / 17 | 42 / 0 / 3 | 42 / 6 / 3 | PASS -> PASS |
| 2.2 | sharp | 73 / 132 | 80 / 101 / 1 | 81 / 118 / 0 | PASS -> PASS |
| 2.2 | steady | 73 / 153 | 81 / 130 / 2 | 79 / 115 / 1 | PASS -> PASS |
| 2.2 | rough | 76 / 144 | 76 / 104 / 5 | 76 / 81 / 6 | PASS -> FAIL |
| 2.3 | sharp | 73 / 137 | 16 / 0 / 0 | 16 / 0 / 0 | FAIL -> FAIL |
| 2.3 | steady | 73 / 141 | 16 / 0 / 0 | 16 / 0 / 0 | FAIL -> FAIL |
| 2.3 | rough | 88 / 144 | 16 / 0 / 1 | 16 / 0 / 1 | FAIL -> FAIL |
| 3.1 | sharp | 69 / 31 | 74 / 9 / 1 | 74 / 9 / 1 | FAIL -> FAIL |
| 3.1 | steady | 69 / 19 | 73 / 9 / 2 | 71 / 9 / 1 | PASS -> PASS |
| 3.1 | rough | 69 / 21 | 70 / 0 / 5 | 66 / 0 / 6 | PASS -> PASS |
| 3.2 | sharp | 44 / 144 | 44 / 54 / 0 | 44 / 54 / 0 | FAIL -> FAIL |
| 3.2 | steady | 44 / 162 | 44 / 54 / 0 | 44 / 54 / 0 | FAIL -> FAIL |
| 3.2 | rough | 44 / 144 | 33 / 54 / 1 | 30 / 36 / 3 | FAIL -> FAIL |
| 3.3 | sharp | 55 / 468 | 60 / 353 / 1 | 60 / 353 / 0 | PASS -> PASS |
| 3.3 | steady | 61 / 436 | 62 / 378 / 1 | 59 / 378 / 1 | PASS -> PASS |
| 3.3 | rough | 60 / 436 | 54 / 317 / 2 | 51 / 270 / 2 | PASS -> FAIL |

## Is the flown fighter ever shot down? (card `space-game-chunk4-fighter-shot-down`; brief 8 finding 1 and decision 3)
The finding: with `hpK` 2 the ace bot was never shot down in any mission (0 deaths in every run of the 27 mission-skills), so flying a fighter was safe and changed little. What I found in the code: **nothing makes the aliens ignore the flown fighter.** It is an ordinary ship of Earth's: an alien picks the nearest of them within its reach (`campAlienAI`), so it is chosen as readily as any pilot; the leash that ties a chase to the cruiser (`campPursuit`) only applies to an alien whose target is the cruiser; a tower takes the nearest too (and, since level 3's card, turns and shoots faster at it). Two things keep it safe: its speed (480 to 800 px/s: an alien shoots where the target is, with no lead, so shots miss a crossing fighter) and that the raiders' dogfight steering does not include it (`campDogRole` skips `u.cockpit`: the flown fighter is not a partner of a dogfight). I changed none of that: the card says the number.

So the lever is `hpK`, and **it stays 2: Troy chose the double hull himself so that he is not shot down in seconds while he learns, and the bot is too evasive to show when a human is shot down** (it parks out of reach and is almost never hit; a human at 0.65 would be hit by about four raiders and would die constantly). The measurement below is kept for Troy to judge `hpK` in play: **0.65 is where the ace bot starts to die in 3.2 and 3.3.** A tower hit in 3.2 and 3.3 is 30 and the pilot's hull at level 3 is about 144 times hpK (a trace of 2.3 showed 288 at hpK 2): by that arithmetic at 0.65 the ace survives three tower hits and dies at the fourth, at 0.6 it dies at the third (not checked hit by hit). It is a cliff: below 0.7 the fighter that hovers in a tower's reach is lost; a fighter that keeps out of it never is.

The ace's (steady skill, `--cockpit --cbots plain,ace`, 32 seeds a mission; the share of runs in which the fighter was shot down at least once, percent; the column `shot%` of the sweep now prints it; the ace won 100 percent of every cell except 3.3 at 0.5, 13 percent):

| mission | hpK 0.7 | 0.6 | 0.55 | 0.5 | ace won% at 0.55 / 0.5 |
|---|---|---|---|---|---|
| 2.1 | 0 | 0 | 0 | 0 | 100 / 100 |
| 2.2 | 0 | 3 | 3 | 13 | 100 / 100 |
| 2.3 | 0 | 3 | 3 | 13 | 100 / 100 |
| 3.1 | 0 | 0 | 0 | 3 | 100 / 100 |
| 3.2 | 0 | 100 | 38 | 19 | 100 / 100 |
| 3.3 | 0 | 81 | 13 | 100 | 100 / 13 |

The two missions with towers, in finer steps (32 seeds; shot down %):

| mission | 0.675 | 0.65 | 0.625 |
|---|---|---|---|
| 3.2 | 3 | 3 | 100 |
| 3.3 | 0 | 9 | 44 |

Level 1 (12 seeds): shot down in none of the runs at hpK 1 or 0.5 (at 0.25: 1 run in 12 of 1.1 and 1.2, 2 of 1.3).

**What the table says:** the highest hpK at which the ace is shot down at all is 0.65 (3 percent of 3.2 and 9 percent of 3.3, still winning every run); 0.625 shreds it (3.2: every run, 2.8 times a run; 3.3: 44 percent) and 0.7 shields it entirely. The brief's example, one run in five in the busier missions, is not reachable with this bot: its chance goes from none to nearly all within 0.05 of hpK, because it parks in the towers' reach. **Troy tests it in play:** set "Flown hull" on the N panel (`The flown fighter (C)`, steps of 0.05; the default is 2) and sit Wedge in a tower's reach in 3.2 or 3.3.

What happens to a shot-down pilot (lost for the mission today, a pod and back in 20 s in the brief) is Troy's separate call and is not touched here.

## Rules 4 and 5: "safe and changes little" fails (card `space-game-chunk15-sweep-rule`; brief 8 decision 12)
Added to the pass rule (`COCKPIT_RULE`, `cockpitVerdict`; tools and docs only, no game change): where plain fights (a fight to speak of: plain's median kills at least 5),
4. the flown fighter is **shot down in at least 5 percent and no more than 50 percent of the runs** (the sweep's `shot%` column: the share of runs in which it was shot down at least once): never shot down fails, and so does shredded;
5. the fighter's **own kills** (median a run) are **at least a quarter of plain's** kills: few kills fails.
Both are n/a where plain does not fight (under 5 kills) or the numbers are missing. The thresholds (5, 50, a quarter, a fight of 5) are mine, for Troy to agree like the rest of the rule. `node tools/campaign-bot.mjs --cockpit` prints the two verdicts in the `shot` and `kills` columns.

**The sweep again, 32 seeds, defaults (`hpK` 2, `rateK` 3, `damageK` 0.5, turrets auto): 0 of 27 mission-skills pass.** The fighter is never shot down in any mission (rule 4 fails in all 27 of the 27: `shot%` is 0 everywhere, which is the finding of card `space-game-chunk4-fighter-shot-down`: with Troy's double hull the bot is too evasive to be hit) and its own kills are few (rule 5 fails in 17 of 27: the median is 0 to 10 against plain's 7 to 21). Rules 1 to 3 on their own fail in 11 of the 27 (16 pass). So "safe and changes little" fails every cell, as the card asks; a retune that makes the fighter matter has to start with kills and being hit, not with speed.

| mission | skill | plain kills | ace shot% | ace kills | time | taken | sit | shot | kills | rule |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 | sharp | 17 | 0 | 1 | pass | pass | n/a | FAIL | FAIL | FAIL |
| 1.1 | steady | 17 | 0 | 5 | pass | pass | pass | FAIL | pass | FAIL |
| 1.1 | rough | 17 | 0 | 8 | pass | FAIL | pass | FAIL | pass | FAIL |
| 1.2 | sharp | 20 | 0 | 2 | pass | n/a | FAIL | FAIL | FAIL | FAIL |
| 1.2 | steady | 20 | 0 | 5 | pass | pass | FAIL | FAIL | pass | FAIL |
| 1.2 | rough | 20 | 0 | 10 | pass | pass | FAIL | FAIL | pass | FAIL |
| 1.3 | sharp | 21 | 0 | 1 | pass | pass | pass | FAIL | FAIL | FAIL |
| 1.3 | steady | 21 | 0 | 5 | pass | pass | pass | FAIL | FAIL | FAIL |
| 1.3 | rough | 21 | 0 | 9 | pass | FAIL | pass | FAIL | pass | FAIL |
| 2.1 | sharp | 7 | 0 | 0 | pass | n/a | pass | FAIL | FAIL | FAIL |
| 2.1 | steady | 7 | 0 | 1 | pass | n/a | pass | FAIL | FAIL | FAIL |
| 2.1 | rough | 7 | 0 | 2 | pass | n/a | pass | FAIL | pass | FAIL |
| 2.2 | sharp | 21 | 0 | 1 | pass | pass | pass | FAIL | FAIL | FAIL |
| 2.2 | steady | 21 | 0 | 2 | pass | pass | pass | FAIL | FAIL | FAIL |
| 2.2 | rough | 21 | 0 | 6 | pass | FAIL | pass | FAIL | pass | FAIL |
| 2.3 | sharp | 19 | 0 | 1 | pass | pass | pass | FAIL | FAIL | FAIL |
| 2.3 | steady | 19 | 0 | 2 | pass | FAIL | pass | FAIL | FAIL | FAIL |
| 2.3 | rough | 19 | 0 | 5 | pass | FAIL | pass | FAIL | pass | FAIL |
| 3.1 | sharp | 10 | 0 | 1 | pass | FAIL | pass | FAIL | FAIL | FAIL |
| 3.1 | steady | 10 | 0 | 2 | pass | pass | pass | FAIL | FAIL | FAIL |
| 3.1 | rough | 10 | 0 | 5 | FAIL | FAIL | pass | FAIL | pass | FAIL |
| 3.2 | sharp | 12 | 0 | 1 | pass | pass | pass | FAIL | FAIL | FAIL |
| 3.2 | steady | 12 | 0 | 1 | pass | pass | pass | FAIL | FAIL | FAIL |
| 3.2 | rough | 12 | 0 | 3 | FAIL | FAIL | pass | FAIL | pass | FAIL |
| 3.3 | sharp | 16 | 0 | 1 | pass | pass | pass | FAIL | FAIL | FAIL |
| 3.3 | steady | 16 | 0 | 2 | pass | pass | pass | FAIL | FAIL | FAIL |
| 3.3 | rough | 16 | 0 | 3 | pass | pass | pass | FAIL | FAIL | FAIL |

## Hostile fighters lead their shots at the flown fighter (card `space-game-b10-c1-lead-shots`, brief 10 chunk 1; Troy, 27 Nov 2026: yes)

The rule (`campLeadAt`, `src/campbreak.js`; the knob `CAMP.cockpit.leadK`, 1): a skiff, a cutter, a raider or a drone (the break's kinds) aims at where the fighter THE PLAYER FLIES will be when its shot gets there, with the wing fighters' lead maths (`campDogLead`); at every other ship it aims where the ship is, as before. Aim only: no hit point, damage, rate or speed changed, and `hpK` stays 2. With nobody flying a fighter nothing runs: the plain bot's every number is the same to the last digit before and after (all 27 mission-skills).

**Measured** (`node tools/campaign-bot.mjs --cockpit --cbots plain,ace,sit --seeds 12`, steady skill; before is main `37b62765`, after is the card's branch; the new columns `hurt%` and `backs` are the median share of one full hull the flown fighter lost in a run, and the hand-backs for a low hull a run, the bot's rule being to hand the stick back under 30 percent hull):

| mission | hull lost % (before → after) | handed back a run (before → after) | shot down % | kills | win time s | cruiser damage |
|---|---|---|---|---|---|---|
| 1.1 | 2 → 2 | 0 → 0 | 0 → 0 | 5 → 5 | 306 → 306 | 217 → 217 |
| 1.2 | 28 → 73 | 0 → 3.17 | 0 → 0 | 5 → 6 | 270 → 268 | 31 → 27 |
| 1.3 | 17 → 70 | 0 → 1.67 | 0 → 0 | 4 → 3 | 292 → 292 | 39 → 39 |
| 2.1 | 4 → 8 | 0 → 0 | 0 → 0 | 1 → 1 | 32 → 32 | 6 → 6 |
| 2.2 | 8 → 17 | 0 → 0 | 0 → 0 | 1 → 1 | 66 → 67 | 138 → 109 |
| 2.3 | 17 → 31 | 0 → 0 | 0 → 0 | 2 → 1 | 77 → 78 | 97 → 79 |
| 3.1 | 16 → 54 | 0 → 0.83 | 0 → 0 | 3 → 2 | 78 → 72 | 37 → 35 |
| 3.2 | 73 → 73 | 2.83 → 2.83 | 0 → 0 | 1 → 1 | 53 → 53 | 165 → 165 |
| 3.3 | 97 → 92 | 4.17 → 4.25 | 0 → 0 | 1 → 1 | 75 → 75 | 396 → 432 |

- **The fighter is hit now, where hostile fighters meet it:** in 1.2 it loses 73 percent of a hull a run (was 28) and is handed back 3.2 times a run (was never); 1.3 70 percent (was 17), 3.1 54 (was 16), 2.3 31 (was 17), 2.2 17 (was 8). 1.1 and 2.1 hardly move (2 to 2 and 4 to 8 percent), and 3.2 and 3.3 are as they were (73 and 92 percent; their towers already led their shots at it, card `space-game-fighter-job-32`).
- **It is shot down in no run, in any of the 27 mission-skills, before and after.** The ace hands the stick back under 30 percent hull, as a player would, and a hull of 216 (hpK 2) cannot go from above 30 percent to nothing in a step. So the stop rule (shot down in most runs) is not met: nothing needs the partial lead (`leadK` 0.5 to 0.8) and the default is the full lead, 1. `shot%` (rule 4) is still 0, so the pass rule still passes 0 of 27; it needs a different measure to show that the fighter is hit (hull lost, hand-backs), which is for ORCH to propose.
- **Nothing else moved much:** the ace wins every cell it won before (1.1 and 1.2 sharp 92 percent as before), win time within 6 s (3.1 steady 78 to 72 s, 1.2 270 to 268), its kills within one, the cruiser damage the same or lower (2.2 138 to 109, 2.3 97 to 79; 3.3 396 to 432). The hands-off bot (`sit`, the stick taken and nothing done) now loses 1.2 rough in 2 runs of 12 where it lost none; its steady and sharp cells did not move.

