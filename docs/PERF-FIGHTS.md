# Big fights: what was made cheaper to draw

Card `perf-fights` (Troy, 23 Nov 2026: "the big fights feel slow"). `docs/PERF.md` has the measurement on Troy's Mac and the list of fixes it asked for; this file is the fixes that were made for it, what they measured, and what is still open. Read `docs/PERF.md` first.

## The short answer

In the busiest fight the tools can build (`busy1` of `tools/perfcampaign.mjs`: 18 aliens, the wing out, about 40 shots in the air) the game's own script work for a frame went **from 3.2 ms to 1.2 ms**, the memory a frame allocates **from 2,061 KB to 462 KB**, and the labels painted again each frame **from 9.4 to 0.4**. Nothing on the screen looks different. The rules of the game are not touched: no number, no timing, no bot result changes.

**What this does not prove.** These numbers are from a cloud machine that draws in software. On the Mac the game already held 60 frames a second in headless Chrome when the Mac was quiet (`docs/PERF.md`), so whether Troy's own window feels smoother has to be judged there. The play log can now count hitches in the Campaign (below), so the next play session says.

## What was wrong

1. **A circle was the most expensive thing on the screen.** Phaser builds every Graphics shape into triangles again at every render, and its circle is cut into a path of hundreds of points whatever its size, then triangulated. A 3 px radar dot cost what a 300 px ring costs. A fight draws about sixty a frame: a dot for every ship on the radar, two for each of the eight turret mounts, the bays' glow, the turrets' reach, the radar's own disc and rim. The eight turret mounts alone were about 430 KB a frame.
2. **The three gauges were 4,600 drawing commands, sixty times a second.** 92 percent of the HUD layer's commands, for dials that change a few times a second.
3. **Nine labels a frame were painted and sent to the graphics card again with nothing new on them.** Phaser's `setText` does nothing when the words are the same, but `setColor` paints the label again every call, same colour or not, and the HUD sets the colour of the missile count, the ore, the hull, the target and the dials' numbers every frame. (`docs/PERF.md` item 4 guessed at `setText`; it was `setColor`.)

## What was done

| Change | File | What it does |
|---|---|---|
| A circle is a small polygon | `src/campcircles.js` | In the Campaign's scenes `fillCircle` is a fan of triangles (which Phaser batches as they are: no path, nothing to triangulate) and `strokeCircle` one closed line, with as many corners as the size needs: 10 for a dot, 33 for the radar's disc, up to 96. The edge is never more than half a pixel off a true circle. |
| The gauges are painted 20 times a second | `src/campgaugecache.js` | The dials are painted into a Graphics that is not on the screen and drawn once into a small texture; between two paints a frame draws one picture. A pip that moved, the highlighted dial of the power list and the emergency repaint at once. The painter itself (`src/camphud.js`) is not changed. |
| A label is painted only when it changed | `src/camptextguard.js` | `setColor`, `setFontSize` and `setFontStyle` do nothing when the value is the one the label already has. |
| The play log counts hitches | `src/playlog.js` | In the Campaign, each minute's counts hold its frames and how many took over 25, 33 and 50 ms (`frames:campaign`, `slow25:campaign`, `slow33:campaign`, `slow50:campaign`). `fps_dip` only fires under 30 frames a second for 2 s, so it never saw a fight at 45 or one long frame in sixty. |

All three drawing changes are for the Campaign's scenes only (`Campaign`, `CampHub`, `CampWarp`); Long Haul's keep Phaser's own. No file of the HUD, the lists, the radar or the scene was edited: the three files change how Phaser's own calls behave for those scenes. `tests/campperf.mjs` pins them; `tests/playlog.mjs` pins the counts.

## The numbers

`busy1`, headless Chromium with software GL on a cloud machine, the repo's own tool (`frames`, `alloc`), before and after on the same commit of main:

| Measure | Before | After |
|---|---|---|
| Script work for a frame (median / 95th percentile) | 3.2 / 6.8 ms | **1.2 / 5.1 ms** |
| of which handing the frame to the renderer | 1.7 ms | 0.3 ms |
| of which the HUD's painting | 0.4 ms | 0.1 ms |
| Memory allocated a frame | 2,061 KB (124 MB a second at 60) | **462 KB** (28 MB a second) |
| The same in `busy3` (level 3, twelve towers) | not measured | 443 KB |
| Labels painted again a frame (my own count, 18 aliens at the cruiser) | 9.4 | **0.4** |
| The HUD layer's drawing commands a frame | about 5,000 | about 400 for the radar and bars, as paths; the gauges' 4,600 a third as often |

The Mac's own figure for the allocation before was 1,983 KB a frame, so the two machines agree on what was there.

## Still open (from `docs/PERF.md`, not done here)

1. **The planets are painted inside the level's start**: 373 ms in one frame, the only dip in the play logs. Paint them during the warp or the ready room. Not a fight, so not in this card.
2. **The three full-screen star layers** cost a third of a software-drawn frame and nothing measurable on a GPU.
3. **The simulation allocates about 150 KB a frame in a big fight** (a filtered copy of the ship list for every shot's step, `campBullets` in `src/campaign.js`). It is the rules' own file and the bots pin its results, so it was left; it is the next thing to take if hitches remain.
4. **The gauges could be split** into what never changes (glass, rings, ticks) and what does. They would then cost nothing between changes, not a third. It needs the painter itself changed (`src/camphud.js`).

## How to measure again

```
node tools/perfcampaign.mjs frames busy1     # script work for a frame, split by part
node tools/perfcampaign.mjs alloc busy1      # where a frame allocates
node tools/perfcampaign.mjs live busy1 30    # the real loop: intervals between drawn frames (the Mac only)
```

On Troy's machine, after a session: the `counts` lines of the play log, `slow25:campaign` over `frames:campaign`.
