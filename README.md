# Long Haul (working title)

Browser 2D top-down space game, Elite Dangerous flavoured. Phaser 3.80.1 (vendored as phaser.min.js), no build step.

Run: open index.html in a browser (or `python3 -m http.server` here). Dev shortcuts: `index.html#space` and `index.html#surface` jump straight to that scene with the rescue mission accepted.

## The loop (v0.1)
Station (walk, take the rescue call, board ship) -> Space (fly, fight drones, dock/land with L) -> Surface (walk, find the colonist, protect them, return to ship) -> fly home, dock, get paid.

## Files and who owns them
- src/common.js  shared helpers, global state G, beep(), toast(), go()
- src/boot.js    every texture is drawn here with shapes (no image files)
- src/station.js station interior scene
- src/space.js   flight, combat, dock/land
- src/surface.js planet surface, colonist escort
- src/ships.js   every ship texture (player with upgrade tiers, pirates, Reaver, MULE, civilian, police) and their flames, trails, shield flash, smoke and sparks
- src/stationart.js Halcyon Station and Kestrel Outpost art (canvas gradients, drawn in code) and their animation: spinning hub and ring, beacons, docking lane
- src/art_world.js the world art, drawn in code on 2D canvases (seeded, same every boot): nebula and parallax star layers, distant sun, ringed giant and moon, Kepler-4b, asteroids and ore, the surface (ground, terrain, boulders, pad, crash site, colonist, crawlers) and the effects fxBoom (every s.boom), fxDash, fxPickup, fxDebris
- src/hyperspace.js the Hyper scene, the watched hyperspace tunnel (star streaks, gates, ribbons, nose bloom, readout). Dark: only index.html#hyper (or #hyper<ly>, e.g. #hyper24) opens it, no game effect yet
- src/main.js    Phaser config and scene list
New files get their own script tag in index.html. Keep edits inside the files your card names.

## Rules for agents
- Work in your own git worktree: `git -C ~/dev/spacegame worktree add ~/dev/spacegame-<yourname> -b <card-id>`. Never edit ~/dev/spacegame directly.
- Small commits on your branch. Do not push. ORCH fast-forward merges after you send the card to review.
- Smoke test before review: `node --check src/*.js`, then load in headless Chrome (see tests/ once TaskMaster-1 lands it) and look at a screenshot.
- Keep it one evening: simple shapes, no image assets, no new libraries.

## New work found along the way
Agents may add cards for new work they find: `agentboard add --status todo --id space-game-<name> "title" -d "what and which files"`, then tell ORCH in one line (agentboard chat send --name <you> --to ORCH). Do not claim it yourself; ORCH assigns it so the load stays even. Keep each card small enough for one sitting and name the files it touches.

## Progress on the board
Update each subtask the moment you finish it, not at the end: `agentboard update <subtask id> 50 "what you are doing"` when you start it, `... 100 "result"` when it is done. Troy watches the card fill up. Do not mark all subtasks 100 in one go when you send the card to review.
