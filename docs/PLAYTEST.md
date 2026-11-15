# Long Haul playtest notes (v0.1, 2026-11-12)

Found by TaskMaster-1 with `bash tests/smoke.sh` (loads every scene, plays the whole rescue) and `node tests/probe.mjs` (measures the numbers below; run it again after a balance change). Nothing here was fixed by me: the files belong to other cards.

## Bugs, worst first

All five are fixed on branch `space-game-bugs` (one commit each, 3f326f8 to b71d83a), each guarded by a check in `tests/fixes.mjs`. Bug 5 has one addition: a player too poor to pay the fee gets the ship rebuilt at half hull instead of a free full repair.

| # | Where | What happens | Suggested fix |
|---|-------|--------------|---------------|
| 1 | surface.js, crawler AI | **The colonist dies before you can reach the pod.** Crawlers hunt the colonist from the moment the scene loads. Measured with the player idle at the ship: colonist hp 60 at 0 s, 36 at 4 s, dead by 6 s. Walking to the pod is about 1800 px at 210 px/s, so 9 s or more. The rescue fails almost every time. | Crawlers ignore the colonist while its state is `waiting`, and only chase it once it is `following` (or once the player is within 500 px). |
| 2 | station.js, surface.js, space.js | An empty prompt still draws a small black box at the bottom centre (the text has a background and padding). Visible in the station and surface screenshots. | `this.prompt.setVisible(msg !== '')` in each update. |
| 3 | common.js `toast()` | Two toasts at once draw on top of each other and read as garbage (landing on Kepler-4b: "Landed..." and the colonist's line overlap). | Start each new toast lower than the live ones (y + 40 each), or replace the previous one. |
| 4 | space.js, ram handler | Ramming a drone takes 10 hp but never checks for death. Measured: drone hp -40 and still active after 4 s on the ship. It only dies when a bullet later hits it. | Share the kill code with the bullet handler: if `e.hp <= 0` then boom, destroy, +25 cr. |
| 5 | space.js `die()` | Dying with no credits costs nothing: 20% of 0 is 0 and the hull resets to 100. | Insurance fee of at least 50 cr (or 20%, whichever is more), capped at what you have. |

Visual only, not bugs: the first frame after a teleport shows the camera still catching up (the screenshot `loop-2-space-landing.png` has no planet in it for that reason).

## Numbers that feel off

Measured in the running game, one line each with a value to try.

| What | Now | Measured | Try |
|------|-----|----------|-----|
| Drone ram on the ship | 12 hull per 600 ms | One drone sitting on the ship: hull 100 to 8 in 4 s | 6 hull per 900 ms |
| Landing approach under fire | 6 drones circle the planet at 520-740 px, bullets 8 each | Parked on the approach and not shooting back: hull 84 at 7 s, 16 at 9 s, dead at 10 s | 4 drones around the planet; keep bullets at 8 |
| Crawler speed | 100 px/s (player 210, colonist follows at 160) | Fine for the player, but see bug 1 | 85 px/s, and colonist hp 60 to 90 |
| Crawler bite | 0.02 hp per ms (20 hp/s) | One crawler touching the player: 9 hp/s in practice | Leave it, it is fine |
| Dock limit 150, land limit 170 px/s | Top speed 480 (boost 800) | Holding S brakes 480 to 150 in 0.6 s, so the limits never bite. Coasting without S takes 5.2 s | Brake drag 0.12 to 0.3, limits 150/170 to 120/140; re-run the probe |
| Trip station to planet | 2973 px, HUD says 297 km | 6.2 s at 480 px/s, 3.7 s boosting: the world feels small | Top speed 480 to 360 and boost 800 to 600 (8.3 s and 5 s) |
| Drone bounty | 25 cr | Full hull repair costs 2 cr per point (up to 200 cr); the rescue pays 500 | Bounty 25 to 40, so a fight can pay for its own repairs |

## How to re-run

- `bash tests/smoke.sh` : syntax check, one screenshot per scene in `tests/out/`, then the scripted rescue (asserts +500 credits). Exit code 1 on any failure.
- `node tests/loop.mjs` : only the scripted rescue. It removes drones and crawlers so it is deterministic, which also means it does not see bug 1.
- `node tests/probe.mjs` : prints the numbers in this file.
- `node tests/missions.mjs` (or `FULL=1 bash tests/smoke.sh`) : the mission board, Rescue, Escort, Police patrol and their failure paths, game clock stepped by hand, about 2 minutes. Ported from BuildBot's drive.mjs.

## Round 4: the universe loop, scripted (card u-f1, main with B5, E2, E5, E6 and the perf pass, 2026-11-14)

`node tests/playthrough.mjs` plays the loop a new player plays, in headless Chrome on the stepped clock, and prints a table; `tests/out/playthrough.json` keeps the numbers and `tests/out/pt4-*.png` a picture per step. Five runs while the script was being written; the last two were clean on every step: new game, fuel up, launch, cruise, jump to Kestrel, jump home, dock, buy the Kite and board it, save and reload. No console error in any run. The economy numbers per station are in `docs/UNIVERSE.md` 11.1 (`node tests/econprobe.mjs`).

| What | Measured | Reads as |
|---|---|---|
| New game | 0 cr, one Wren, 40 of 40 units | as designed |
| Fill 10 to 40 units at Halcyon | 240 cr (key 2 fills, key 1 is half for 160) | half a rescue; fine |
| Launch to flight | 14 s wall on this Mac (software GL), pirates 13 in the system, none engaging (grace) | the 20 s grace holds |
| Frame in Halcyon space (36000 px), the whole step / `Space.update` alone | 41 to 57 ms / 0.19 to 0.27 ms, 168 to 175 objects, load 6 to 14 | `docs/PERF.md` measured 38 ms and 0.6 ms: the game's own code is well under its baseline, the rest is the software rasteriser |
| Frame in cruise | 30 to 41 ms / 0.24 to 0.32 ms | same |
| Frame in Kestrel (empty, 5 bodies) | 23 to 30 ms / 0.13 to 0.17 ms, 96 objects | half of Halcyon: the objects are the cost |
| Cruise, 6,946 px to the Slag Belt | arrives within 1 to 3 s of game time, top speed 5,468 px/s | a 36000 px system crosses in seconds; by design (UNIVERSE 2.2) |
| Jump, each way | charge 4.35 s, tunnel 11 s, 6.3 units (50 cr) | 15 s per jump; the round trip burns 12.6 of 40 units |
| Dock after the trip | prompt at 200 px, "Docked.", hull 100 | fine |
| Buy the Kite at Halcyon | 5,000 to 500 cr, parked, Enter in the FLEET tab boards it | fine |
| Save and reload | byte for byte the same (738 chars), the Kite still flying, 4.3 to 4.6 s wall to the station | fine; the reload time is this Mac's |

Nothing to fix from this round. Two things for the design: a full tank is well over 400 cr for the big ships (UNIVERSE 11.1), and the cruise crosses a system so fast that the interdiction window is short (a roll at 40 to 70% of a few seconds). Rerun after E3 (the calls across systems) lands: `node tests/playthrough.mjs`, about 4 minutes plus the wait at the test lock.
