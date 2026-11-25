# Long Haul: speed and memory

The first section below is the Campaign's fights (22 Nov 2026); the rest is the Long Haul scenes (14 Nov 2026).

What was measured on current main (card `space-game-perf-pass`, 2026-11-14), what was fixed, and how to measure again.
Everything here was measured in headless Chrome with software GL on a busy Mac, so read the numbers as sizes and ratios, not as
what a player's machine does. Wall-clock times moved by up to 50% between runs when other agents were using the CPU; the ratios
below come from runs that alternate old and new code in the same page.

## The new ship look: the base to beat (card `space-game-ship-look-f-foundation`, 25 Nov 2026)

Base: `main` at `c0c5dd91` (the merge of pull request 12), switch off. Every piece of the new look (A the ships, B the ring and arc, C fire and trails, D the signal shapes, E the panel and briefing; scope report on card `space-game-ship-look-scope`) puts its before and after beside these lines. The Mac was quiet (load 3).
- **The sim, no Chrome** (`node --expose-gc --max-semi-space-size=128 tools/perfcampaign.mjs sim busy1`, two runs): one step 0.46 ms median, 0.53 to 0.59 ms at the 95th percentile, 0.46 to 0.47 ms mean (2.8 percent of a 16.7 ms frame), 2.7 to 2.8 KB allocated a step. The new look does not touch the sim, so this should not move; if it does, the piece that moved it is wrong.
- **The drawing, Chrome (NOT measured in this landing: the card said no Chrome)**: the number the pieces must hold is the stepped frame of JavaScript in the busiest fight, `node tools/perfcampaign.mjs frames busy1`. The card text gave 1.3 ms; this file's own table (22 Nov, below) has 2.27 ms mean and 5.9 ms max for the same measure, and 1.27 ms was the 20 Nov build. Whoever lands piece A takes `frames busy1` on `c0c5dd91` and on the piece in one page, swapping the code under test (the ratio method in "Measuring again"), and writes both here; B and C do the same against the new base.

## Campaign fights on this Mac (card `space-game-choppy-fights`, 22 Nov 2026)

Troy says big fights are choppy. This section is the measurement and nothing else: no game file was changed for it. The fixes are listed at the end, for whoever makes them.

**The short answer.** On this Mac, in the busiest fight the tools can build, the game's own work is about 2 ms of a 16.7 ms frame (12%) and the drawing holds 60 frames a second with no interval over 20 ms when the Mac is quiet. It is the same at the start zoom (0.335), at 0.1 and at 0.03. When the Mac is busy, long intervals (33 to 80 ms) appear; in the run where I made the Mac busy on purpose every one of the 33 was spent outside the game's JavaScript (the game's own part of those frames stayed under 6 ms). So nothing in the fight is slow *by itself*; what I could not do is run the game in Troy's own headed Chrome window, which is where he sees the choppiness (see "What this does not show"). Two things did grow since 20 Nov and are worth fixing before they grow again: the HUD's Graphics drawing and the allocation (both about doubled).

### How it was measured (so it can be done again)

- Mac: 10 cores, shared with the other agents, load average 4 to 16 during the runs (it is written beside each number). Chrome is the one the tests drive: headless, `--mute-audio`, drawing on the GPU (`renderer: webgl`), under the shared test lock. Every run was on a checkout of main made for it: `3a2d4d0` for the stepped, profile, allocation and fill runs, `f0febd4` for the real-loop runs. The 20 Nov build is `b452fca` (the commit `docs/night/performance.md` measured), run through `PERF_ROOT=<checkout of b452fca>` so that the same tool and the same fight drive both.
- The fight is `busy1` of `tools/perfcampaign.mjs`: level 1 with the mothership, the aliens topped up to 18, the wing launched and topped up, a missile every 0.5 s, the carrier cannot die. It is worse than any played level (the numbers are the worst a level gives, not an average).
- **Real loop** (what a player gets): `node tools/perfcampaign.mjs live busy1 30`. The interval between drawn frames, and for each frame the game's own part of it (from the loop's first step to the end of its drawing, JavaScript only; added in this card). An interval over 33 ms whose own part was 2 or 3 ms was spent outside the game: the Mac, the browser's compositor or the display. `PERF_ZOOM=0.1 node tools/perfcampaign.mjs live busy1 20` sets the view's zoom first (the option was added in this card).
- **Stepped frames** (cost of the game's code, no vsync): `node tools/perfcampaign.mjs frames busy1` (600 frames split into sim, sprites, HUD, backdrop, rockets, drawing), `profile busy1` (CPU self time by function), `alloc busy1` (sampled heap profile).
- **Where drawing time goes** (a drawing cost is a fill cost): `LONGHAUL_GL=software node tools/perfcampaign.mjs fill busy1 8`: the real loop with one kind of thing hidden at a time. Software GL is the CPU rasteriser; it ranks what costs fill, it does not say what the Mac's GPU spends.
- **Troy's play logs** (`~/dev/spacegame-playlogs`, outside the repo; nothing from them is copied here except these counts): 86 sessions, 122 entries into the Campaign scene, windows from 1470x677 to 2043x1292 (the game's canvas is a fixed size scaled to fit, so the window size does not change what is drawn).

### What the numbers say

| Measure (busy1) | 20 Nov build `b452fca` | now | Verdict |
|---|---|---|---|
| Real loop, Mac quiet (load 4 to 6): frames a second, intervals over 20 ms | not measured today | 60, **0 of 1800** in each of three 30 s runs; own part of a frame 1.9 ms mean, 5.4 max | Fine |
| Same at zoom 0.1 and 0.03 (20 s each) | n/a | 60, 0 over 20 ms; own part 1.6 and 1.9 ms | Zoom costs nothing on a GPU |
| Real loop, Mac busy (load 8 to 16, other agents' tests running) | 18 of 1796 over 20 ms, max 38 ms | 23 of 1795 over 20 ms, max 36 ms (a pair run back to back); other runs 31 to 40 over 20 ms, 17 to 18 over 33 ms, max 56 to 86 ms | Hitches, from the Mac |
| Real loop, ten CPU-burning loops added (the old build at zoom 1: it has no start zoom) | 58.3 fps; 53 over 20 ms, 29 over 33 ms, max 79 ms; own part max 4.9 ms | 58.4 fps; 54 over 20 ms, 33 over 33 ms, max 53 ms; own part max 6.0 ms | **All 33 (and all 29) long intervals were outside the game's JavaScript**; the build has not become more sensitive |
| Stepped frame of JS, mean | 1.27 ms | **2.27 ms** (max 5.9) | Small, but 1.8 times |
| of which drawing submit / update | 0.96 / 0.22 | 1.56 / 0.59 | |
| of which sim / HUD | 0.08 / 0.02 | 0.16 / **0.23** | The HUD is 10 times what it was |
| Things on the display list / textures | 166 / 74 | 252 / 142 | Not traced to their source |
| Allocation a frame (sampled) | 1,047 KB | **1,983 KB** (119 MB a second at 60) | 86% of it inside Phaser calls with no game function on the stack (Graphics paths) |
| Garbage collector, share of the frame | | 0.045 ms (1.8%) | Not the cause of hitches here |

### Ranked cost table (what a frame of the busiest fight is spent on, now)

CPU profile of 600 stepped frames, 2.56 ms a frame of self time; Phaser's code is charged to what called it. "Fill" is from the software-GL run, where a frame costs 65 ms.

| Rank | Cost | Measured | Where it lives | Who edits it |
|---|---|---|---|---|
| 1 | Phaser's drawing of the display list (submit): 252 objects, 142 textures | 1.56 ms a frame (was 0.96); Graphics paths `batchFillPath` 0.14 + `batchLine` 0.09 ms, sprites `batchQuad` 0.13 ms | everything on screen | all |
| 2 | **The three full-screen star layers** | **23 of 65 ms of a software-GL frame (36%)**; layer 3 (the one that breathes) alone 6 ms; nothing measurable on the GPU | `spaceBackdrop`, `src/art_world.js` (`s.bgLayers`) | stars-at-zoom card (landed) |
| 3 | HUD painting every frame: dials, gauges, panels, radar | `hudMs` 0.23 ms (was 0.02); `paintHud` 0.056, `campGaugesPaint` 0.039, `campPanelsPaint` 0.036, the gauge callback 0.051 ms; `campHudArc` allocates 76 KB a frame by itself | `src/camphud.js`, `src/campanelsdraw.js`, `paintHud` in `src/campaignscene.js` | the power-presets and panels cards |
| 4 | Allocation | 1,983 KB a frame; 86% from Phaser Graphics paths | the same HUD Graphics | as 3 |
| 5 | Text canvases re-uploaded | `texImage2D` 0.077 ms, `updateText` 0.025 ms | `uiText` callers | as 3 |
| 6 | The sim | 0.16 ms (was 0.08) | `src/campaign.js` | nobody |
| 7 | Missile launcher, reach ring | `syncRockets` 0.056 ms | `src/campaignscene.js` | nobody |
| - | Ship and shot sprites, planets, explosion particles | no measurable fill (hiding them moved a software-GL frame by less than the noise: 71, 74 and 73 ms against 65) | | |
| - | Starting a level | the planets are painted inside `create()`: 373 ms on level 1 (`docs/night/performance.md`). This is the only dip in Troy's play logs: one `fps_dip` (25.5 fps for 2 s) in 86 sessions, right after "Campaign" came up | `waPlanetArt`, `src/art_world.js` | **Done (card `space-game-cloud-followups`, 23 Nov 2026), measurement owed:** the ready room paints the next level's near planets, one a timer tick, while it is open (`campHubWarm`, `src/camphubscene.js`; `planetTexture` keeps each one), so a level started from the room finds them cached. A level started with no room (a retry, an address) paints them in `create()` as before. Chrome numbers: `node tools/perfcampaign.mjs planetstart 1` (create() with no planet painted, and after the room has been open 4.5 s; `PERF_ROOT=<an older checkout>` for the before) |

### What this does not show

- Troy's window. The runs are headless Chrome on this Mac's GPU; his is a headed Chrome with the display's own refresh (a 60 or a 120 Hz display) and his own load. I did not run the game in his Chrome (a background tab is throttled to 1 frame a second and it would play sound), so what he sees is not measured.
- His play logs cannot see "choppy". `fps_dip` fires only under 30 frames a second for 2 s in a row; a fight that runs at 45, or hitches for one frame in sixty, writes nothing. 86 sessions, 1 dip, 0 stalls: by that measure the game has never been slow for him, which is not what he reports.
- The shared Mac's load changes every number above that has a load beside it. Only comparisons run back to back (old and new in one sitting) are fair.

### Fixes I would make (not made: the cloud session does them)

In the order I would do them. The gain is what the measurement above allows me to promise.

1. **Make the play log able to see choppiness, first**, so the next fix is judged on Troy's machine: in `src/playlog.js` (`L.frame`), count per minute in the Campaign the frames whose interval is over 25, 33 and 50 ms, and the 95th percentile of the game's own part of a frame (start of `prestep` to `postrender`); a `fps_dip` threshold of 50 would also catch a fight at 45. Cost: a few additions a frame; no text, no key. This tells a hitching Mac from a slow game, which the table cannot.
2. **Start the level's planets before the level** (done for a level started from the ready room, card `space-game-cloud-followups`: `campHubWarm`). 373 ms in `create()` is the only logged dip. The warp scene (`CampWarp`) is on screen for seconds before: paint `waPlanetArt`'s textures there. Gain: the one 2 s dip at the start of every level.
3. **HUD Graphics: repaint on change.** The dials, gauges, panels and radar `clear()` and redraw their paths every frame, which is the 86% of the allocation and most of the 0.23 ms. A dial whose value did not change keeps its drawn Graphics (a key of the values it draws, compared before the paint). Gain: about 0.2 ms of JS and less garbage (the profile cannot name the caller inside Phaser, so I cannot say how much of the 86% is the HUD: measure `alloc busy1` before and after). Files: `src/camphud.js`, `src/campanelsdraw.js`, `paintHud`; their owners are working in them (2-GEN gauges, 3-GEN panels): tell them before touching.
4. **Text: set a text only when its string changed.** 142 textures against 74 and `texImage2D` on every frame it appears: check that the panel rows and the gauges' captions do not call `setText` with the same string every frame (Phaser re-uploads the canvas only when the string differs, so first count how many differ per frame).
5. **Star layers: two instead of three, or one baked.** The nearest two layers (factors 0.45 and 0.85) hardly differ at the Campaign's zoom (the layers move by the zoom times their factor, so at 0.335 they are 0.15 and 0.28 of the camera's move). Merging them saves one layer: 6 to 8 ms of a 65 ms software-GL frame (10 to 12%), nothing measurable on a GPU. Only worth it for a machine without one; it changes how the sky looks, so it is Troy's call.
6. **Not worth doing:** the sim, the sprites' sync, the rockets, the map: each is under 0.2 ms.

## What the numbers say

| | Measured | Verdict |
|---|---|---|
| The game's own JavaScript, a frame | Space 0.6 ms, Station 0.1, Surface 0.1, Title 0 (a frame is 16.7 ms) | Not a problem |
| Drawing a frame (software GL here) | 0.3 to 1.8 ms to submit; the rest is the rasteriser, 38 ms a frame in Space | Cannot be judged without a real GPU |
| JS heap | 5 to 8 MB per scene; 173 textures, about 300 objects in Space | Small |
| Memory over a long session | grew 0.45 MB for every trip round the scenes | **A leak, fixed** (below) |
| Load to the first scene | about 0.55 s to Title, 0.9 s to Space; scripts themselves run in 40 ms | Half of it is the world art |
| First launch into Space | 386 ms of one frame | **Halved** (rock planet) |
| Allocation | 1.25 MB a frame, mostly Phaser's Graphics paths (the HUD's arcs, discs and rings); garbage collection costs 0.04 ms a frame | Left alone |

## What was fixed

1. **The world art is faster, pixel for pixel the same.** `src/art_world.js` paints the nebula, the ground, the terrain and every
   planet one pixel at a time from layered noise. `waFbm` (the noise) ran one closure per octave; it now runs the octaves in one loop
   over plain arrays, with the same float operations in the same order. The rock planet's crater loop skips craters a pixel is clearly
   outside of, which also spares a `Math.hypot` (slow). In an A/B inside one page, the space art went from 227 to 168 ms and the
   surface art from 149 to 110 ms (1.35 times faster); a rock planet from about 225 to about 100 ms in quiet runs. Other planet kinds
   gained 5 to 20%. `tests/perfart.mjs` holds it to the original: the noise against a copy of its first version on 300,000 samples,
   and 44 textures (24 painted at boot, 20 planets) against hashes taken from the code before the change
   (`tests/fixtures/arthash.json`).
2. **A leak.** `src/asteroids.js` wrapped the Space scene's `die()` with `s.die.bind(s)` in `asteroidsSetup`, which runs at every
   launch into Space. The scene instance lives on, so each launch wrapped the last wrapper, and each layer kept that launch's rocks,
   physics bodies and physics world alive: about 125 sprites and 2 worlds per trip round the loop, and the heap grew without end.
   It now wraps the class's own `die()`. After the fix the heap climbs for about twelve trips (code and caches warming up) and then
   stays at about 10.9 MB. `tests/perfleak.mjs` goes round the scenes six times and counts live physics worlds, sprites and bodies:
   the old code grew by 8 worlds and about 450 sprites over the last four trips, the new code by 1 and about 24.

## What was looked at and left alone

- The HUD allocates a lot (Phaser builds arc and line paths for `hudArc`, `hudDisc`, `hudRing`, `hudRadar` every frame) but the
  collector spends 0.04 ms a frame on it. Caching the static rings would be the way, if a real machine ever shows hitches.
- The surface textures (`ground`, `terrain`, 75 ms) and `planet` (70 ms) are painted at boot but first used later. They could be
  made on first use. Each has its own seeded generator in `art_world.js`, so the pixels would not change, but every place that names
  them (`surface.js`, the systems data's `art:` key, mods) would need the same guard, and the cost would move to the first landing.
  Not done: the saving (about 150 ms once) is small for the risk of a missing texture.
- Texture painting could be spread over several frames behind the title screen. Not done for the same reason.

## The HUD repaint cache (cloud PR 5), measured on this Mac (card `space-game-verify-cloud-prs`, 23 Nov 2026)

`docs/PERF-FIGHTS.md` has the cloud machine's numbers for PR 5 (script work 3.2 to 1.2 ms a frame, allocation 2,061 to 462 KB a frame, no change to the game's sums). These are the same two runs on this Mac, headless Chrome with the GPU, `busy1`, the commands of "Measuring again" below. Off is `a626167c` (PR 5 not in), on is main `3d6bdbb3`. **On is main as it is today, so it also has what landed after PR 5** (the three pilots in place of eight fighters, fewer ships in the fight): the allocation drop is PR 5 plus that, not PR 5 alone. The picture does not change: PR 5's cache is there in the profile (`campGaugesPaintCached` in `campgaugecache.js`) and the HUD's Graphics paths are gone from the top of the list.

| Measure (busy1, this Mac) | off `a626167c` | on `3d6bdbb3` | Verdict |
|---|---|---|---|
| Allocation a frame, `alloc busy1` (sampled) | 2,049 KB, 84% inside Phaser with no game function on the stack | **294 KB**, 39% of it that | The cloud saw 2,061 to 462 KB; here the pilots take it lower still |
| Real loop, `live busy1 30`, Mac quiet (load 4.3 to 4.6): frames a second | 60 (1800 frames) | 60.03 (1801) in both runs | Same |
| Intervals over 20 ms of the 1800 | 1 (max 20.2 ms) | 5 (max 22.2) and 1 (max 20.7) | Same, within the noise |
| The game's own part of a frame, mean (median) | 2.75 ms (2.7) | 1.71 ms (1.4) and 0.85 ms (0.8) | About half to a third |
| A pair run when the Mac got busy (load 6.1), off | 57.7 fps, 39 over 20 ms, 30 over 33 ms, max 63.9 ms; all 30 of the long ones spent outside the game's JavaScript; own part 2.07 ms mean | not run in that load | The Mac, not the game: the old build's own part is the same 2 ms |

Order of the runs: alloc off, alloc on, live off, live on, live on, live off (pairs back to back, the second pair swapped), 09:24 to 09:27. The player's frame rate was 60 either way on a quiet Mac, so what PR 5 buys here is a lower allocation and a smaller own part of the frame, not a frame rate you can see on a quiet Mac (the garbage collector was 1.8% of a frame before it, so it is headroom on a busy machine, not a fix for a hitch we saw).

## What the keys changes cost, and what was fixed (card `space-game-perf-after-keys`, 23 Nov 2026)

8-GEN's batch after the day's key changes: still 60 fps and no frame over 33 ms, but the game's own part of a frame went from about 1 ms to 2.8 ms and the allocation from 294 to 609 KB a frame (`3d6bdbb3` to `ec3bc15b`). This is the bisect and the fix, `busy1`, headless Chrome with the GPU, this Mac (load 4 to 7), runs of the commands in "Measuring again", old and new back to back in the same sitting.

**What it was.** Not the simulation: `node tools/perfcampaign.mjs sim busy1` is 0.44 ms a step at both commits. It is what the scene draws. Switching one part of a frame off inside one page (`PERF_PATCH`, below) priced each part: nothing else the day changed (the S list, the target box's text, the pause band, the plain gauges, the lists) shows. Two things are on from the first frame now, which they were not before (a pilot starts out, and All pilots is the default who):

| Part of a frame (busy1) | Allocation a frame | What it was |
|---|---|---|
| The WHO box, bottom left, All pilots: its frame is `fillRoundedRect` and `strokeRoundedRect` | **about 250 KB**, and most of the added draw time | Phaser makes a rounded rectangle a path of arcs and triangulates it again at every render; the box is steady (it is drawn again only when a number changes) but the render is not. Every Graphics' circle was already a polygon (`src/campcircles.js`); its rounded rectangles were not |
| The three pilots' squares (`campTgtCorners`: eight `lineBetween` strokes each, 24 a frame) | about 65 KB as lines (about 30 KB as rectangles) | the same: a path per line, built again at every render |
| `campNavEdge` (the arrow at the screen edge, and the sight arrows) | about 25 to 50 KB | when the point lands in a keep rectangle it walks the border in steps of 8 px: up to 500 two-number lists a frame; not new, but busy1 hits it more now |
| the rest of the day's changes | 17 KB at most | 272 KB with the box and the squares both off against 255 KB at `3d6bdbb3` |

**What was fixed** (all in the Campaign scenes; no picture changes: the corner and the line are the ones they were):

1. `src/campcircles.js`: in a Campaign scene `fillRoundedRect` is a fan of triangles and `strokeRoundedRect` a closed line through the corners (3 to 8 pieces to a quarter circle by the radius; the edge strays under a quarter of a pixel). A radius that is an object, a rectangle with no size and Long Haul's scenes are Phaser's own.
2. `src/camptargetdraw.js`: each arm of a pilot's square is a thin filled rectangle with the geometry of the line it replaces (the arms run along the axes, so butt ends and all), not a `lineBetween`.
3. `src/campnav.js`: `campNavEdge` walks the border through one shared list, not a list a step. Same answers: 200,000 random inputs compared against the old function, 0 differences.

| busy1, stepped (`frames,alloc,profile`, three runs each, interleaved) | `3d6bdbb3` (morning) | `ec3bc15b` (before) | this change |
|---|---|---|---|
| Allocation a frame (sampled) | 254 to 257 KB | **620 to 626 KB** | **337 to 338 KB** |
| Frame of JavaScript, mean (update + render) | 0.37 to 0.44 ms | 0.55 to 0.60 ms | 0.50 to 0.51 ms |
| of which drawing (render) | 0.10 to 0.16 | 0.23 to 0.25 | 0.15 to 0.17 |
| CPU profile, self time a frame | 0.44 to 0.55 ms | 0.81 to 0.85 ms | 0.68 to 0.71 ms |
| Display list | 237 | 261 | 261 |

So about three quarters of the added allocation and about half of the added frame time are gone. **What is left is the two things themselves, on from the first frame by design:** 82 KB and 0.1 ms a frame over the morning's build, which `PERF_PATCH` splits as the WHO box (the frame as polygons: 28 KB and 0.05 ms in drawing, seven texts and the bars) and the three squares (24 filled rectangles, about 30 KB), the rest being the texts' `setText` checks. With the box and the squares both off the fight is at the morning's numbers (272 KB, 0.43 ms).

**Tried and dropped: the box as a texture.** The same trick as the gauges (`src/campgaugecache.js`, deleted since with the gauges: card `space-game-layout-hud`): draw the frame and bars into a Graphics that is not on the screen and show them through a `RenderTexture`, redrawn only when a number changes. Drawing fell to the morning's level (0.10 ms) and the allocation to 310 KB, but the update rose from 0.25 to 0.41 ms: in a fight the pilots' hulls change several times a second, and each redraw clears and draws a render texture, which switches the framebuffer and flushes the batch. The frame total was no better (0.55 ms against 0.50). It would pay in a calm scene and lose in a fight, which is where the cost matters, so it is not in. (One thing it taught: the frame's 2 px line is centred on the box's edge, so a texture the box's own size cuts half of it off; a texture needs a margin.)

**The "own part of a frame" of the real loop does not separate these builds** at load 4 to 7: `live busy1 20` gave a median of 1.5 to 2.3 ms for the build before the fix, 2.3 for the fixed one and 0.6 and 2.2 for the morning's, from the same machine in the same ten minutes. It includes the wait for the GPU and the compositor. Use the stepped runs (`frames`, `alloc`, `profile`) to compare two builds, and the real loop only to see that 60 fps holds (it did in every run: 60.0 fps, 0 frames over 33 ms). 8-GEN's 2.8 ms in the batch is the same number read at a busier moment.

**To price a part of a frame** (added by this card): `PERF_PATCH='window.campTgtPaint = () => {}' node tools/perfcampaign.mjs frames,alloc,profile busy1` runs the code after the fight is set up and before anything is measured. `window.campFdispSync = () => {}` switches the WHO box off, `window.campTdispSync = () => {}` the target box, `Campaign.prototype.paintHud = () => {}` the HUD, `window.campPanelsPaint = () => {}` the lists, `window.campNavEdge = () => null` the arrow at the edge. Nothing is saved. `PERF_ROOT=<a checkout of another commit>` runs the same tool on that code, to set two builds side by side.

## Measuring again

```
node tools/perf.mjs frames [scenes]    update and render time of 600 stepped frames, object counts, heap
node tools/perf.mjs load [scenes]      DOMContentLoaded, the game object, the first scene up (median of 5)
node tools/perf.mjs loadprofile space  CPU profile of one load, by file and function
node tools/perf.mjs art                time of each texture art_world.js paints, and of a planet of each kind
node tools/perf.mjs profile space      CPU profile of 600 frames
node tools/perf.mjs alloc space        where 600 frames allocate
node tools/perf.mjs leaks 8            heap, textures and nodes after each trip round the scenes
```

How to read a profile here: `(program)` is Chrome and the software rasteriser, not the game. The rows with a file name are the game's
JavaScript. To compare two versions, run both in turn (a second worktree of the older commit works) or, better, swap the function
under test inside one page, so both see the same load. `tests/perfart.mjs` and `tests/perfleak.mjs` are in `tests/smoke.sh`
(steps 4zo and 4zp); if a texture is changed on purpose, `node tests/perfart.mjs --write` records the new pixels.
