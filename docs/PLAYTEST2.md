# Long Haul playtest notes, round 2 (main 61296f1, 2026-11-13)

By BuildBot for card `space-game-playtest-2`. One scripted walk through the game the way Troy plays it, in headless Chrome under the test lock: `node tests/playtest2.mjs` (47 steps, a screenshot per step in `tests/out/pt2-<step>.png`, the console errors and the render time per step in `tests/out/playtest2.json`), then five short probes for the things it flagged. Two full runs: the first on main, the second on this branch after the grace fix. No console errors in any step. Render time stayed at 1 to 5 ms a frame (software GL) in every scene, the ship bay the heaviest at 5 ms.

What was walked: title and its two key panels, the station (bar talks with JUNO, MOSS and SABLE, IDA absent before a rescue, the chat box with a mocked model, J Journal, Esc pause and its controls page, Tab map, repair at 40 hull, the shop, the mission board, the ship bay), launch, the undock grace, a first fight, a bounty, the N nav list, C cruise, docking with the bounty summary, save and reload byte for byte, the surface controls panel, Esc and Tab on the surface.

## Bugs, worst first

| # | Where | What happens | State |
|---|---|---|---|
| 1 | `space.js` create | **No launch grace on the first undock of a session.** `launchAt = this.time.now` in create() reads 0 on the first Space scene of a page (the scene clock has not ticked yet), so a player who spends two minutes in the station before launching gets no 20 s grace, no one-at-a-time first wave and no "patrol cover ends" toast: `pirateCap` jumped straight to open 4 s after launch. Later launches in the same page were fine, and `tests/launch.mjs` never saw it because it resets `launchAt` itself. This is the pirate-balance card's own bug, so Troy's "I die right after undocking" was only half fixed. | **Fixed here**: `launchAt` is set on the first update frame; `tests/launch.mjs` now checks it is not 0. Second run: cap 1 at 22 s, hull untouched. Card `space-game-bug-launch-grace-first-flight`. |
| 2 | `voice.js` / `title.js` | **V on the title opens the ship-voice panel and the game stops.** Within a few frames `document.hidden` turns true and `game.loop.frame` stops counting; Esc runs `close()`, which queues `scene.stop()` and `resume('Title')`, and the queue is never processed, so the panel stays and the title never comes back. The NPC-chat panel (C), built from the same code, keeps the loop running and closes fine, and the voice panel closes fine when opened by calling `voiceOpenSetup()` instead of pressing V, which is why `tests/voice.mjs` passes. Seen in headless Chrome only so far. | **Open**, needs a check in a real browser (press V, then Esc). Card `space-game-bug-voice-panel-v-key-freezes`. Repro in `tests/playtest2.mjs` steps `title-voice-panel*` (loop state printed). |
| 3 | `ships.js` (probably) | **A large tan square or bar appears beside the ship after a hit.** Seen twice: a 178 px square left of the ship after 22 s of thrust, a hard stop and a raider hit (`pt2-first-fight.png`, first run), and a full-height bar through the ship after a scene restart and a hit (`pt2-hit-probe.png`). It stays for several frames. Not reproduced on demand: the same sequence replayed five times with flames, ribbons, shield and hit cues disabled in turn showed nothing (`pt2-square-*.png`, tan pixel counts equal), nor did a pinned ship thrusting against the world bound (zero-length ribbon segments draw nothing), nor a 2500 px teleport. | **Open**, low frequency. Card `space-game-bug-ribbon-zero-length-quad` holds the pictures and what was ruled out. |

## Fixed on this branch

- Bug 1 (`src/space.js`, `tests/launch.mjs`).

## Numbers and feel

| What | Measured | Note |
|---|---|---|
| One raider against a ship that neither moves nor fires | 120 hull to 72 in 6 s (first run), to 78 (second): a hit every 0.55 to 0.95 s, each landing | With the 450 ms invulnerability the floor is about 7 hull a second from one raider. A player who fires back kills a raider in two shots; a player who freezes dies in 15 s. Troy's call whether that is the right floor; a smaller raider shot (6 to 5) would move it to 12 to 13 s. |
| Undock grace | 22 s of W from the hangar: hull untouched, zero pirates engaged, cap 1 at the end | As designed, once bug 1 is fixed. |
| Repair | 60 points at half a credit cost 30 cr | Matches MOSS's and JUNO's lines. |
| Bounty | Drone 40 cr, "BOUNTY +40" over the wreck, "+40" on the credits strip, "Bounty this flight: +40 cr (1 pirate)" on docking | Readable, consistent. |
| Save | Reload after docking gives the same save byte for byte; the Journal's three people and the chat key status survive | |
| Cruise | Refused 720 px from Kestrel Outpost ("near"), as the lock says | The probe parked next to a station; the nav list and target worked (eight bodies, distance and time per row). |
| Surface controls panel | Fades at 8 s of game time; 12 s on the wall clock under software GL because frames run long | Not a bug. |

## Things that fight each other, or do not (checked)

- Chat open, press J or Tab: nothing opens (the chat holds `s.panel`). Good.
- Journal open, press Esc: the Journal closes and Pause does not open. Good.
- Pause open, press Tab: nothing (no map from the pause menu). Fine; the map has its own key.
- Three toasts at once on docking stack with a gap and stay readable (`pt2-docked-summary.png`).
- The first-run guide tip ("W thrusts, A and D turn...") sits over the bottom key strip for the whole first flight until H. It reads fine but hides the strip's right half; a first-run thing only.
- Every HTML text box (chat, key panels) is gone from the page after its panel closes (checked each time).

## How to re-run

- `node tests/playtest2.mjs`: the whole walk, about 6 minutes under the lock; screenshots `tests/out/pt2-*.png`, `tests/out/playtest2.json`. Add a step with `step(name, fn)`; it never aborts the walk.
- `bash tests/smoke.sh` as always; the grace check is in step 4i.
