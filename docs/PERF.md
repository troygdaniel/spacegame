# Long Haul: speed and memory

What was measured on current main (card `space-game-perf-pass`, 2026-11-14), what was fixed, and how to measure again.
Everything here was measured in headless Chrome with software GL on a busy Mac, so read the numbers as sizes and ratios, not as
what a player's machine does. Wall-clock times moved by up to 50% between runs when other agents were using the CPU; the ratios
below come from runs that alternate old and new code in the same page.

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
   and 47 textures (27 painted at boot, 20 planets) against hashes taken from the code before the change
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
