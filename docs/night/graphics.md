# Night: the Campaign's graphics (7-GEN)

Card `space-game-night-graphics`, 20 Nov 2026 overnight. Subject: the Campaign (`K` on the title). Main was tagged `campaign-before-night`; this branch is `night-graphics`, started from main at aa86295 and merged with main at b452fca (missiles) once.

**How it was looked at.** 23 pictures of the Campaign in a fixed list (`tools/campshots.mjs`, one Chrome through the lock, stepped clock, 1280 px window), taken from aa86295 (the "before" set) and again after the changes ("after"). They are in `~/dev/spacegame-night/shots/` (`before-*.png`, `after-*.png`), outside the repo. A fresh agent with only the PNG files and the brief of `docs/CRITIC.md` judged the 23 pictures of the Campaign (list below). Each blocker and major was checked against the picture by me; the ones that come from how a picture was staged are marked. The numbers (drawn size against hit circle) come from the live scene.

Pictures: c01 level 1 story card, c02 start at the Lunar base, c03 the launch, c04 a melee (staged positions, real fight after it), c05 a kill, c06 a hit, c07 low hull and shield (staged), c08 recall, c09 the mothership (staged: put 560 px ahead), c11 level 2 start, c12 guards, c13 the relic, c14 a cache, c15 guns, c21 to c23 level 3, c30 won story, c31 tech pick, c32 lost, c33 pause, c34 the Tab map, c40 Mars, and `fx-*` crops of explosions at 60, 160, 320 and 520 ms (2x).

## Findings, ranked by how much they matter

1. **The lose card showed a raw text key.** `[` (debug lose) ends a level for the reason `debug` and no sentence existed: the card said `camp.lose.debug`. Seen in c32, confirmed in the text tables. Troy uses that key, so he would see it. Fixed (commit 1).
2. **Every card was titled CAMPAIGN, and the cards were see-through.** The pause card said CAMPAIGN with PAUSED in amber at the foot like a button; the won and lost cards had no word for won or lost; the planet's labels (`EARTH`, `LUNA`) and the gauges showed through the 95 percent card and made the story text muddy (c01, c30, c31, c33). Fixed (commits 2, 3, 8).
3. **No sign on the screen of where to go in levels 2 and 3.** The goal line says "Gather resources: 0 of 2." or "Break the defence towers: 12 left." and the screen is empty; only the radar blips and the Tab map say where (c11, c21). The resource cache is an unlabelled gold hexagon (c14). Not fixed: an arrow or edge marker is new behaviour. Proposal 1.
4. **The radar was hard to read.** Blips were 2 px, the disc 75 percent so a planet or a fighter behind it showed through, and the orange towers sat on a bright gas giant in c23. Fixed (commit 6).
5. **The only hull feedback was a thin bar going red.** Nothing on the ship itself when it was hit (c07). Fixed with a 90 ms red blink of the carrier (commit 5). Open: Earth's bar stays cyan at 18 percent while the hull bar goes red (proposal 6).
6. **The turret reach ring was too faint to find** (1 px at alpha 0.16; 6-GEN and 8-GEN also said so). Fixed (commit 7).
7. **The carrier started on top of Luna and the Lunar base ring** (c02: 90 px from the moon, drawn 140 px long). Fixed (commit 9).
8. **Mars was the same grey cratered ball as Luna and Proxima b** (c06, c13). Mars is rust now (commit 4). Earth is the `ice` world, a white ball with blue cracks, not oceans (c02): a new planet kind in `art_world.js` is more than a small change (proposal 4).
9. **The relic on Proxima b is only a thin ring** (c13): there is no picture of the machine. Proposal 3.
10. **Shots are thin** (12 x 2 px, cream for friends and pink for enemies, no glow). They can be told apart and found in the pictures (c04, c15, c23), the critic ranked them major. Not changed: it is a taste call and the line was being edited by the missiles card. Proposal 2.
11. **The Tab map** (5-GEN's, not touched): the "Launching the wing." toast sits on the map's top frame; the key line at the foot runs into the panel's bottom border; the gauges behind it show at the left of the panel; level 1 uses the middle of the panel only (c34). Proposal 7, for 5-GEN.
12. **HUD with no Earth** (levels 2 and 3): a blank row between the hull bar and BAY; the hull shows a number (600, 900) with no maximum while Earth shows a percent (c11 to c23). 2-GEN's resources card was editing the HUD, so it was left. Proposal 5.
13. **The tech pick card**: centred rows, so the numerals sit at different x and a wrapped line is ragged; "1,500 px" is a developer unit (c31). Proposal 8.
14. **Hit circles are about half the drawn half-length for every kind** (table below), so a shot that visibly clips a ship's nose or tail goes through. It is the number the shrink card chose (`CAMP`), and it changes how the game plays: not touched. Proposal 9.

**Checked and fine.** Friend against enemy reads at a glance in a crowd (c04): the wing is teal (fighters) and blue (escorts) with cyan outlines, the aliens are red and pink; the two friendly types are alike by design. Explosions: the critic saw only late frames of rings; the crops at 60 to 160 ms (`fx-ship-160`, `fx-big-160`) show a bright flash, sparks, shards and a ring, as intended. The mothership is clearly the biggest thing (291 x 234 px against the carrier's 140 x 100) and has its own gauge. The gas giant of level 3 is the best planet in the set. The story card is clean.

**Staged, not faults.** The stale level 1 gauges behind the won and lost cards (c30 to c32: the debug keys jump, a real win has the real state behind it); the `Debug:` toasts and the DEBUG row on the pause card (Troy's tune kit, kept); the dark side bars and objects cut at x 1202 (the headless window is 1280 x 633, the canvas fits it at 0.88); the carrier on the mothership (put there); a toast that stays long (the clock is stepped).

Drawn size against hit circle (px, from the live scene):

| kind | drawn W x H | half-length | hit r | hit / half |
|---|---|---|---|---|
| carrier | 140 x 100 | 70 | 36 | 0.51 |
| fighter | 31 x 23 | 15.5 | 8 | 0.52 |
| escort | 40 x 29 | 20 | 10 | 0.50 |
| raider | 40 x 30 | 20 | 10 | 0.50 |
| drone | 44 x 44 | 22 | 14 | 0.64 |
| gunship | 60 x 50 | 30 | 19 | 0.63 |
| mothership | 291 x 234 | 145 | 90 | 0.62 |
| tower | 96 x 80 | 48 | 26 | 0.54 |

## What was changed

One commit each, all starting `[night] graphics:`. Every one reverts alone with `git revert <hash>` (the order below is the order they were made; the merge of main sits between 6 and 7). Each has its own node test; none needs a browser.

| # | Commit | What it does | Undo | Look at in the morning |
|---|---|---|---|---|
| 1 | 2d4df2a | `camp.lose.debug` has a sentence ("The level was ended with the debug key."); `tests/campgfx-losetext.mjs` reads every `campEnd(C, 'lost', why)` from the code and wants a sentence for each | `git revert 2d4df2a` (the card shows the raw key again) | press `[` in a level: the card says why |
| 2 | 319e2b4 | the story, pick, lost and pause cards sit on a half-dark veil over the screen and are opaque; `tests/campgfx-cards.mjs` | `git revert 319e2b4` | press Esc in a fight: the gauges are dim behind the card, no planet label through it |
| 3 | 5051d31 | the won and lost cards are headed `LEVEL n WON` and `LEVEL n LOST` (keys `camp.ui.won`, `camp.ui.lost`); `tests/campgfx-titles.mjs` | `git revert 5051d31` | press `\` then `[` |
| 4 | 3023672 | Mars is rust-coloured: a `tint` field in `CAMP.places` read by `drawPlace`; `tests/campgfx-mars.mjs` | `git revert 3023672` | fly east to Mars (4,100 px) |
| 5 | 363a1eb | the carrier blinks red for 90 ms when hit (`flash`, in `onEvent`); `tests/campgfx-hit.mjs` | `git revert 363a1eb` | take a hit: the ship blinks with the shake |
| 6 | 4ef78f8 | the radar is a solid disc (alpha 0.9, was 0.75) with a 2 px rim, blips 1 px bigger; numbers in `CAMP_RADAR`; `tests/campgfx-radar.mjs` | `git revert 4ef78f8` | the top right in a fight, and level 3 where a planet sits behind it |
| 7 | 59db4c3 | the point guns' reach ring is 2 px at alpha 0.4 (was 1 px at 0.16); numbers in `CAMP_REACH`; `tests/campgfx-reach.mjs` | `git revert 59db4c3` | the amber circle round the carrier: findable without shouting? |
| 8 | c3eefb8 | the pause card is headed `PAUSED` (`camp.ui.pausetitle`) and its foot is `Esc resume   T title`; `tests/campgfx-pause.mjs` | `git revert c3eefb8` | Esc |
| 9 | 6a2a388 | the carrier starts 130 px east and 30 south of Luna (was 90 east), clear of the moon and the base ring; `tests/campgfx-start.mjs`; `tests/campaign.mjs` reads `startAt` instead of pinning 90 | `git revert 6a2a388` | the first second of level 1 |
| 10 | 98cc75f | `tools/campshots.mjs`: the fixed Campaign pictures (a tool, no game code) | `git revert 98cc75f` | `TAG=after node tools/campshots.mjs 1` and look in `~/dev/spacegame-night/shots/` |

Checks run on the branch: every `tests/campgfx-*.mjs` (each also run against its change turned off, and fails then), `tests/campaign.mjs`, `campaigntune`, `campmap`, `campmissiles`, `content`, `controlshelp`, `hygiene`, `node tools/economy-sim.mjs check`, `node tools/build-content.mjs --check`, `node tools/mods-fields.mjs --check`, `bash tests/smoke.sh --list`. Not run: the Chrome smoke (8-GEN's gate). Looked at in Chrome: the "after" pictures (c02, c04, c23, c32, c33, c40); the blink (5) is not visible in a still and rests on its node test.

## Proposals for Troy (not done: they add behaviour, change how it plays, or touch files others were in)

1. **Show where to go.** An amber arrow at the screen edge toward the next goal (the nearest cache, the relic, the nearest tower, the mothership), and a label on the cache pods. The one thing the critic ranked first after combat feedback.
2. **Shots with a glow.** Bigger, additive, a short trail; do it after the missiles settle (the `bullet` line in `sync`).
3. **Draw the relic.** A slowly turning machine on Proxima b under the ring.
4. **An ocean planet kind** in `art_world.js` for Earth.
5. **HUD with no Earth:** close the blank row, show the hull as `600 / 600`, hide `WAVE 0 OF n` where the waves are not the goal. After 2-GEN's resources card lands.
6. **Earth's bar goes red when low**, like the hull bar.
7. **Tab map (5-GEN):** the toast over the map frame, the key line under the panel, level 1 using only the middle of the panel.
8. **Tech pick card:** left-aligned rows with a hanging numeral; say "a long hop" instead of "1,500 px".
9. **Hit circles against the drawn size** (the table above): leave the circles as they are, or make them about 0.7 of the drawn half-length. Changes how fights feel: Troy's call.

## Retaking the pictures

`TAG=after node tools/campshots.mjs 1` (then `2`, `3`, `fx`, `mars`): one Chrome, muted, through the test lock, about 15 seconds each. The list is fixed so two runs can be compared; add a picture, do not swap one.
