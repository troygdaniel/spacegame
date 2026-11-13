# Long Haul playtest notes (v0.1, 2026-11-12)

Found by TaskMaster-1 with `bash tests/smoke.sh` (loads every scene, plays the whole rescue) and `node tests/probe.mjs` (measures the numbers below; run it again after a balance change). Nothing here was fixed by me: the files belong to other cards.

## Bugs, worst first

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
