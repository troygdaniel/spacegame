# Night: Campaign performance (card `space-game-night-performance`, 1-GEN, 20 Nov 2026)

Main at `aa86295` (tag `campaign-before-night` is the way back). Everything below was measured on Troy's Mac, headless Chrome, one at a time through the lock, `--mute-audio`, load 5 to 14 (always under 18).

## The answer

**The Campaign has no speed or memory problem on a Mac with a GPU, and no change to the game is justified by the numbers, so I made none.** The busiest fight I could build (18 to 24 aliens topped up all the time, 12 of your ships out, the mothership or twelve towers, 25 to 80 shots in the air) holds 60 frames a second in the real loop, and the game's own JavaScript uses 0.3 to 0.6 ms of a 16.7 ms frame. The only thing that can be slow is *drawing*, and only on a machine with no GPU (software drawing: 20 frames a second). The fix there is a look change, so it is a proposal for Troy below, not a commit. The one new file is a measuring tool (`tools/perfcampaign.mjs`); it changes nothing the game loads.

## How it was measured

`tools/perfcampaign.mjs` (header says each mode). Scenarios: `busy1` / `busy3` keep a full fight going (level 1 with the mothership; level 3 with its twelve towers; carrier cannot die, nothing can end the level), `natural1` is level 1 played like a player (launch at 3 s, attack and escort at 14 s, fly at the nearest alien and fire). Frame times are 600 stepped frames with the parts timed apart; per-call costs come from tight loops (the page clock is only good to 0.1 ms); the real loop is run for 20 to 100 s and the gaps between drawn frames are recorded. A Node mode (`sim`) runs the sim alone: **use it only for allocation and for A/B, not for time** (a vm context looks globals up slowly: 0.75 ms a step in Node, 0.068 ms in Chrome for the same fight).

## Numbers (GPU drawing, the Chrome of the tests)

| | busy1 (level 1) | busy3 (level 3) | natural1 |
|---|---|---|---|
| Real loop, frames a second / longest gap / frames over 20 ms | 60 / 18.5 ms / 0 of 1200 | 60 / 18.8 ms / 0 of 1200 | 60 / 30.6 ms / 1 of 6000 (100 s) |
| A frame of JS, stepped (mean; of which drawing submit) | 0.57 ms (0.45) | 0.44 ms (0.37) | 0.34 ms (0.32) |
| The sim, one step (campStep, with the play log's wrapper) | 0.068 ms | 0.030 ms | 0.006 ms |
| `sync()` sprites / `paintHud()` / all `uiText` calls of a frame | 0.012 / 0.015 / 0.006 ms | 0.009 / 0.013 / 0.006 | 0.004 / 0.009 / 0.006 |
| The play log's wrapper round `campStep` | 0.0005 ms | 0.0006 ms | 0.0006 ms |
| The map (Tab) redraw / `campMapMarks` / legend | 0.027 / 0.006 / 0.015 ms | 0.021 / 0.005 / 0.011 | 0.014 / 0.002 / 0.005 |
| Textures / things on the display list / ship sprites / shot sprites | 74 / 122 to 150 / 31 to 40 / 46 to 77 | 66 / 86 / 27 / 32 | 73 / 32 to 73 / 2 to 13 / 0 to 33 |
| Heap after a full collection | 7.2 MB | 7.0 MB | 6.5 MB |

Where a stepped frame goes (busy1, mean 0.57 ms): drawing submit 0.45, sim 0.05, HUD 0.02, sprites 0.01, backdrop 0.00, the text calls 0.01. A frame is 16.7 ms.

## Findings, in the order they matter

1. **Frame time is not a problem.** 60 a second held for 100 s of a played level and 20 s of each stress fight, with the Mac at load 7 to 14. The sim is 0.7 % of a frame in the worst case, so a fight twenty times as big would still fit. The node `sim` run says a step allocates 0.6 to 2.6 KB, 0.3 % of what a frame allocates, so the sim is not the garbage either.
2. **On a machine with no GPU the drawing is the whole cost, and half of it is the backdrop.** With `LONGHAUL_GL=software` the busiest fight runs at 20 frames a second (gaps 49 ms on average, 122 at worst) while the game's own JavaScript is the same 0.6 ms. Hiding things one at a time in the real loop (software drawing, 8 s each): the three full-screen star layers hidden 17.5 to 34.5 frames a second (57 to 29 ms a frame); the third layer alone (the one that breathes, alpha-tweened) 57 to 44 ms; the HUD's graphics 57 to 51 ms; the ship and shot sprites, the planets and the explosion particles are inside the run-to-run noise (about 10 %). The code comment in `src/art_world.js` already says each layer costs fill rate; here is the size of it. It matters only if Troy ever plays on a machine without a GPU.
3. **Allocation is 0.8 to 1 MB a frame, 90 % of it inside Phaser's own drawing of Graphics** (path arrays for the radar dots and bars of `hudG`, and the map's drawing when open), and the collector spends 3 % of 0.7 ms on it (0.02 ms a frame, sampled profile). The Campaign's own code is about 60 KB of it: the shot loop's callback (18 to 25 KB), `campNearest`, `Math.hypot` (it allocates), the filters of `campAlienAI`. Not worth changing: no hitch comes from it (finding 1).
4. **Memory is flat.** Ten minutes of game time in a fight that never ends: the heap after a collection went 7.68 to 8.15 MB in the first seven minutes and then 8.14, 8.13, 8.07 (flat); textures 72 to 76 (the toasts' text canvases come and go), nodes 257 to 258, event listeners 64 throughout. Starting a level 45 times in a row: 5.9 to 7.3 MB, 0.9 MB of it in the first 12 starts and about 0.01 MB a start after that (100 starts, about 1 MB: not a leak worth a snapshot; listeners stay 64, nodes 257 to 259, textures 70 to 74, display list 28 to 32).
5. **Starting a level costs a pause once: the planets are painted inside `create()`.** Level 1 makes four (Earth 77, Luna 97, Mars 102, Eros 97: **373 ms**), level 2 two (sun 72, Proxima b 99: 171 ms); a retry of the same level pays nothing (the textures are kept, `PLANET_CACHE_MAX`). The page itself: `?campaign=3` is at the Campaign scene about 520 ms after navigation (runs 500 to 588), `?campaign=1` about 845 ms (the difference is the four planets); of the 512 ms of a CPU profile of the first load, 248 ms (48 %) is the world art `art_world.js:28`, painted at boot for the whole game (docs/PERF.md left it, and so do I).
6. **Looked at and fine.** The play log's wrapper round `campStep`: 0.0005 ms a step. `uiText` runs `contentVars()` for every call even when the text has no `{placeholder}`: 7 calls a frame, 0.006 ms in all (0.4 % of garbage). The map (Tab) open: the frame goes 0.57 to 1.6 ms (the glass panel, the grid, about 15 Text objects), its own redraw 0.027 ms. HUD text changing every frame (hull and Earth's shield falling at every step, a worse case than any fight): +0.26 ms a frame (0.56 to 0.82); one `setText` with a new string 0.01 ms.
7. **Hitches in a played level.** In 120 s of stepped play (7200 frames, mean 0.54 ms): 32 frames over 3 ms, 21 over 8 ms, the worst 76 ms. Of the twelve costliest, eleven were inside the drawing call (`render`): back-to-back stepped frames with no vsync fill the GPU's queue, and the real loop shows nothing like it (finding 1: 1 gap of 30.6 ms in 6000 frames). The one that was game code: 26.5 ms at the first launch, the first `beep` of a page that has played no sound creating its `AudioContext` (`src/common.js`); a page that has had a title click or music probably has it already (not checked), so I did not touch it.

## What I changed

| Change | Commit | What it does | How to undo | What to look at in the morning |
|---|---|---|---|---|
| `tools/perfcampaign.mjs` (new file) | see `git log --oneline -- tools/perfcampaign.mjs` | measures the Campaign (modes in its header) | `git revert <hash>`: nothing loads it | nothing in the game |
| `docs/night/performance.md` (this file) | same branch | the findings | delete it | nothing |

No game file was touched (no `src/` line), so there is nothing to revert in the game.

## Proposals for Troy (not done: each changes how it looks or when the cost is paid)

1. **Slow-GPU headroom: fewer or cheaper star layers.** The three layers are half the drawing time on a CPU rasteriser. Merging `stars1` and `stars2` into one texture, or dropping the breathing alpha tween on the third (`src/art_world.js` `spaceBackdrop`, shared with Long Haul), would take about 14 ms off a software-drawn frame (the third layer alone measured 14 ms). Worth doing only if a no-GPU machine matters. It changes the look of the sky a little, so it is Troy's.
2. **The 370 ms pause on pressing K (level 1).** Paint the level's planets while the story card is up, or one a frame behind the title. Changes when the cost falls, and the picture pops in; a smaller texture for the small bodies (Luna is drawn 120 px wide from an 800 px canvas) would cut the painting several times over (its cost goes with the pixels) but changes `planetTexture`'s output, which `tests/perfart.mjs` pins.
3. **Radar blips as small squares instead of discs** would cut the HUD's Graphics garbage (finding 3) by most of its 0.8 MB a frame. The collector costs 0.02 ms a frame, so the gain is not measurable in play; I would leave it.

## Not measured, and assumed

- A real GPU other than this Mac's, a laptop on battery, a phone, a 120 or 144 Hz screen (the sim steps at most 1/30 s at a time, so a faster screen only means one smaller step a frame).
- Audio, the voice and the speech: headless Chrome is muted and plays none (`--mute-audio`).
- Garbage-collection pauses directly (no tracing): inferred from the sampled profile (3 % of a frame) and the longest real-loop gap (30.6 ms once in 6000).
- Assumed: the fights I built are worse than a real one (aliens topped up to 18, carrier cannot die, the mothership cannot die, towers cannot die). If 2-GEN's easier levels or 6-GEN's missiles add shots, finding 1 leaves room: the shot loop is the only part that grows with the number of shots times the number of ships (80 shots times 40 ships is 0.014 ms now).

## Measuring again

```
node --expose-gc --max-semi-space-size=128 tools/perfcampaign.mjs sim busy1 1800 [--profile]   (no Chrome: allocation and A/B only)
node tools/perfcampaign.mjs all busy1            frames, per-call costs, allocation and CPU profile in one Chrome
node tools/perfcampaign.mjs live busy1 20        the real loop: gaps between drawn frames (natural1 [secs] plays the level)
node tools/perfcampaign.mjs soak 10 busy1        ten game minutes, heap after a collection each minute
node tools/perfcampaign.mjs restart 45           start a level 45 times: what stays behind
node tools/perfcampaign.mjs load 3 | loadprofile 1 | planets      page load, its profile, the first-time cost of each planet
LONGHAUL_GL=software node tools/perfcampaign.mjs fill busy1 8      where the drawing time goes on a machine with no GPU
```
