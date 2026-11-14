# Long Haul (working title)

A browser 2D top-down space game, Elite Dangerous flavoured. Walk around a station, take a call from the board, fly out, fight pirates, land on a planet, bring someone home and get paid. Plain JavaScript on Phaser 3, **no build step, no network, no image or sound files**: every ship, station and planet is drawn in code and every sound is synthesized.

Licence: MIT (see `LICENSE`; the one bundled library is listed in `THIRD-PARTY.md`).

## The loop (v0.1)
Station (walk, take the rescue call, board ship) -> Ship bay (the hangar terminal: look the ship over, read the mission, switch, buy, sell, rename and move ships, Enter to launch, Esc to go back) -> Space (fly, fight drones, dock/land with L) -> Surface (walk, find the colonist, protect them, return to ship) -> fly home, dock, get paid.
## Play

Open `index.html` in a browser (Chrome is what it is tested in). Double-clicking the file works; if you prefer a server, run `python3 -m http.server` in this folder and open http://localhost:8000. If you are editing the markdown in `content/`, run `node tools/serve.mjs` instead: it rebuilds `content.generated.js` when you save and the page reloads on **R** (see `docs/MODDING.md` section 4).
## Files and who owns them
- src/common.js  shared helpers, global state G, beep(), toast(), go()
- src/boot.js    every texture is drawn here with shapes (no image files)
- src/station.js station interior scene
- src/data_parts.js the five ship parts (shields, weapons, engine, tank, cargo), three tiers each: names, prices, what each tier does, what a station sells; shipStat() in fleet.js applies them, space.js has the shield (points that take hits before the hull, recharging after a pause), the shop in shop.js sells them to the ship you fly (its fit limit and its price multiplier) at the station's stock (docs/UNIVERSE.md 7); tests/parts.mjs checks every effect
- src/shipmodels.js the six player ships (wren, kite, ox, talon, pathfinder, bastion): each hull drawn in code with its upgrade tiers, its physics circle, nozzles, flame colours and the anchors for the Ship bay callouts (table SHIP_LOOK); shipRefresh() in ships.js draws the active one into the texture 'ship'; tests/shipsheet.mjs makes the picture sheet and checks them
- src/journal.js the Journal: J in the station (or the Journal row in Pause) lists everyone met in the Drift with their mood, what they think of you, the last thing said and what you learned, from G.chat (docs/NPC-CHAT.md 4 and 5); works with no key; Forget everything needs a second press; tests/journal.mjs checks it
- src/shipmode.js the Ship bay scene between boarding and flight: the ship in view, its status, the mission, LAUNCH; tests/shipmode.mjs checks it
- src/hangar.js the hangar terminal inside the Ship bay (docs/UNIVERSE.md 6.3): a panel with FLEET (your six berths: board, move, sell with a second S, rename with R), YARD (the ships this station sells, buy with a second Enter) and CONTROLS; the stage and the status panel show the selected ship and the amber button does what Enter does for it (LAUNCH, BOARD, MOVE HERE, BUY); the rules are src/fleet.js; tests/hangar.mjs checks it
- src/space.js   flight, combat, dock/land
- src/surface.js planet surface, colonist escort
- src/hud.js, src/ui.js credits are one look everywhere: a gold coin and "N CR" (hudStrip and hudCoin in hud.js, crTag for the panels in ui.js; +N green and -N red float on every change); tests/credits.mjs checks it
- src/enemies.js the pirate types, their AI, salvage pods and the bounty a kill pays (bountyPay on a kill, bountyDock on docking); tests/bounty.mjs checks it
- src/ships.js   every ship texture (player with upgrade tiers, pirates, Reaver, MULE, civilian, police) and their flames, trails, shield flash, smoke and sparks
- src/stationart.js Halcyon Station and Kestrel Outpost art (canvas gradients, drawn in code) and their animation: spinning hub and ring, beacons, docking lane
  and the four looks for other systems (stationLook / stationLookFx: hub, foundry, nest, derelict, drawn on first use; unused until the systems cards land)
- src/cruise.js in-system fast travel: N nav list, C cruise (6000 px/s, stops 900 px out), and the far bodies of a system; Halcyon is 36000 px (src/data_systems.js); tests/cruise.mjs checks it. Interdiction (pirates pull you out of cruise, INTERDICT in cruise.js, dark until two jumps) and the pirate table per system (pirateTable in enemies.js) are checked by tests/interdict.mjs
- src/art_world.js world art: backdrop, Kepler-4b, asteroids, surface, effects; also planetTexture (rock, ice, gas, lava, ringed; at most six alive) and starTexture (types M K G F A) for other systems; tests/systemart.mjs checks the new art
- src/art_world.js the world art, drawn in code on 2D canvases (seeded, same every boot): nebula and parallax star layers, distant sun, ringed giant and moon, Kepler-4b, asteroids and ore, the surface (ground, terrain, boulders, pad, crash site, colonist, crawlers) and the effects fxBoom (every s.boom), fxDash, fxPickup, fxDebris
- src/hyperspace.js the Hyper scene, the watched hyperspace tunnel (star streaks, gates, ribbons, nose bloom, readout). The jump (src/jump.js) plays it; index.html#hyper (or #hyper<ly>, e.g. #hyper24) still opens it on its own, with no game effect
- src/galaxymap.js the galaxy map overlay (docs/UNIVERSE.md 4.3): the stars as glowing nodes, links and a dashed ring for your jump range, a card with distance, fuel cost, time, pump, danger and why you cannot go; G opens it (src/jump.js), and Enter on a star charges a jump (index.html#galaxy opens it on its own); the eight systems come from a stub table until the systems card; tests/galaxymap.mjs checks it
- src/jump.js the jump (docs/UNIVERSE.md 2.3): G opens the galaxy map, Enter charges for 4 s (Esc, S or a hit cancels; no charge near a station, a planet or a hostile), the fuel burns when the charge ends, the Hyper scene plays, enterSystem (src/universe.js) puts the ship at the edge facing the star it came from; F calls the fuel ranger; tests/jump.mjs
- src/voice.js  optional ship voice (Deepgram text-to-speech, only with the player's own key, see docs/VOICE.md)
- mods/, mods.generated.js, src/mods.js, tests/mods.mjs  mod packs (docs/MODDING.md 13, docs/MODS.md 9): a folder in mods/ is a pack laid over the game, built on its own and turned on in the Mods screen (O on the Title screen), or picked from a folder with no Node at all; off until turned on; `mods/example/` is a small one to copy; tests/mods.mjs runs it in headless Chrome
- docs/MODS.md, tools/mods-fields.mjs  the ten-minute guide for modders (change a mission, a character, a pirate, a part, a salvage site, the dock and the interface's words; what the game reads today; the errors you will meet). The field reference at the end is written from the schema in src/content.js by `node tools/mods-fields.mjs --write`; tests/modsdoc.mjs (no browser) fails when that table is stale, an example file in the guide is invalid, or a claim about the game's ids or messages is no longer true
- tools/economy-sim.mjs, docs/ECONOMY.md  the economy in numbers: `node tools/economy-sim.mjs` prints what each loop earns an hour, the prices, the pacing against the plan and the per-system multipliers, from the game's own data files; docs/ECONOMY.md explains them and proposes the numbers for card u-e4-economy. It changes no gameplay; `node tools/economy-sim.mjs check` (smoke step 4y) fails when a code line it copies has changed
- tools/retro-stats.py, docs/RETRO.md, docs/RETRO-NUMBERS.md  how the build went (14 Nov 2026): `python3 tools/retro-stats.py --logs <test logs>` reads the agentboard board, its chat snapshots, the git history and the test logs and prints the per-card timings, merge conflicts, test-lock waits and idle time; RETRO.md reads them and ranks ten changes by hours saved
- src/chat.js   optional NPC chat: the adapter (OpenAI or Anthropic, one key per provider, only with the player's own key); the setup is in Settings; the bar chat box, memory and Journal follow in later cards (see docs/NPC-CHAT.md)
- src/settings.js the Settings screen (Title S, Pause > Settings): SOUND (volume, mute, ship voice and its voice), KEYS (Deepgram, OpenAI, Anthropic: paste, last four only, Test, Forget; chat provider and model; the cost note), CONTROLS (every key, from src/data_controls.js), CONTENT (which pack runs, what it ignored), RESET (Reset game and Forget all keys, each with a second press); V, C and P on the title open the matching section; tests/settings.mjs checks it with a mocked fetch
- src/data_controls.js the one table of every key of the game: Settings > Controls, the H help page and the Ship bay's key list are built from it
- src/interior.js the station interior art and animation
- the bar's six characters (JUNO, TAMSIN, DEX, MOSS, SABLE, IDA KETTER) are rows of NPCS in src/shop.js with their lines, reactions, voice name and persona card (docs/NPC-CHAT.md 3.1); IDA is there only after the first rescue is paid; their sprites are drawn in src/interior.js; tests/npcs.mjs checks them
- src/main.js    Phaser config and scene list
- src/content.js, tools/build-content.mjs, content/, content.generated.js  content in markdown (docs/MODDING.md): src/content.js is the parser, schema and validator (no Phaser; Node and the browser use the same file), `node tools/build-content.mjs` turns content/*.md into content.generated.js (`--watch`, `--strict`, `--check`), content/_templates/ has one starting file per type; tests/content.mjs checks it. The game reads the pirates (raider, drone), the four calls, the bar's six characters, nine ship part tiers, the salvage sites and signals, the interface words (text/ui.md) and the dock through src/contenttables.js; tests/contentproof.mjs pins that the files over their defaults change nothing and that edits change exactly what they say. The eight systems and six stations are read and kept, and `worldAt(systemId)` in src/contenttables.js gives any of them in the shape of a `SYSTEMS` row (nothing plays from it yet; tests/worldat.mjs pins that Halcyon built from its files is the code's row)
- tests/cdp.mjs, tests/lock.mjs  the headless Chrome harness; lock.mjs lets only one Chrome run at a time across worktrees (a busy Mac made DevTools calls time out), waits its turn, and removes orphan longhaul-* Chrome profiles; tests/locktest.mjs checks it
New files get their own script tag in index.html. Keep edits inside the files your card names.

| Where | Keys |
|---|---|
| Station | `W A S D` or arrows walk, `E` use a terminal, the repair bay or the ship |
| Space | `A D` turn, `W` thrust, `S` brake, `Shift` boost (uses energy), `Q` / `E` dash sideways, `Space` or mouse fire, `L` dock or land (fly slowly, close in) |
| Surface | `W A S D` walk, mouse aim and click to fire, `E` talk to the colonist or board at the pad |
| Anywhere | `Esc` pause menu, `M` mute, `Tab` sector map, `H` help page, `T` pin or hide the mission list |

**The loop:** Station (take the rescue call, board your ship) -> Space (fly, fight drones, dock or land with `L`) -> Surface (find the colonist, protect them, return to the ship) -> fly home, dock, get paid. Credits buy ship upgrades at the station shop.

**Saving:** the game saves itself in your browser (`localStorage`, key `longhaul.save.v1`); nothing leaves your machine. To start over, pause with `Esc` and choose *New game* (select it twice to confirm), or clear this site's data in the browser.

## Mod it

- **Today, change the code.** `src/` is about two dozen small plain-JS files, one job each (map below). Edit a number, reload the page. There is nothing to install or compile.
- **Or change a markdown file.** The calls on the mission board, the bar's characters, the pirates, the part tiers, the salvage sites, the dock and the interface's words live in plain `.md` files in `content/`: edit one, run `node tools/build-content.mjs`, reload. The ten-minute guide is [`docs/MODS.md`](docs/MODS.md) (it also says what cannot be done yet, like adding a brand-new mission); the design is [`docs/MODDING.md`](docs/MODDING.md).
- **Keep your changes in a pack.** A folder in `mods/` (copy `mods/example/`) is laid over the game when you turn it on in the Mods screen (press O on the Title screen). You can also pick the folder in that screen with no build step and no Node. Packs are off until you turn them on, and the Title says MODDED while one is on.
- Ideas for bigger changes (a star map of many systems, ship classes, hyperspace) are sketched in [`docs/UNIVERSE.md`](docs/UNIVERSE.md).

Developer shortcuts: `index.html#space`, `#surface`, `#escort` and `#patrol` jump straight into that scene with the mission accepted and do not touch your save. `#hyper` (or `#hyper24` for a 24 light year jump) plays the hyperspace tunnel on its own. `#station` and `#bounty` also work but use your save.

## Code map

| File | What it does |
|---|---|
| `index.html` | loads Phaser and every file below as a plain script, in order; a new file needs its own `<script>` tag |
| `src/common.js` | shared helpers: the global state `G`, `beep()`, `toast()`, `go()` |
| `src/boot.js` | draws every texture with shapes, then starts the first scene |
| `src/main.js` | Phaser config and the scene list |
| `src/title.js`, `src/station.js`, `src/space.js`, `src/surface.js` | the title screen and the three places you play: walk the station, fly and fight, walk the planet |
| `src/hyperspace.js`, `src/jump.js` | the hyperspace tunnel scene (star streaks, gates, colour ribbons, readout), and the jump that plays it: G, the charge, the fuel, the arrival |
| `src/missions.js`, `src/shop.js`, `src/poi.js`, `src/asteroids.js`, `src/guide.js` | the mission board and what each call does, the bar and upgrade shop, wrecks to salvage, asteroid mining, first-run hints and the ending card |
| `src/enemies.js`, `src/traffic.js`, `src/boost.js`, `src/feel.js` | pirate types and their AI, civilian traffic and police, boost and dash, hit feedback and flight cues |
| `src/ships.js`, `src/art_world.js`, `src/stationart.js`, `src/interior.js` | the art, all drawn in code: ships and their flames, the backdrop and planets, the stations, the station interior |
| `src/content.js`, `src/contenttables.js`, `src/contentadd.js`, `src/contentui.js`, `content.generated.js` | markdown content (see `docs/MODDING.md`): the parser and checker, the adapters that write a file over the game's own table by id (`contentadd.js`: and that add a new voice line, ship, call or character when the id is new), the Title screen's problems chip and MODDED tag, and the built file the game loads |
| `src/fuel.js` | fuel: every ship's tank, the price of a jump (`jumpCost`), the pump terminal in the station (price per unit from the station's `dock.fuel`), the HUD FUEL chip's levels, and the fuel ranger for a pilot stranded where there is no pump. Nothing burns fuel yet; jumps come with card u-b4 |
| `src/data_ships.js`, `src/fleet.js` | the six ship models (hull, speed, thrust, turn, tank, jump range, hold, price) and the fleet: up to six ship records, where each is parked, `fleetBuy`, `fleetSwitch`, `fleetSell`, `fleetRename` and `fleetTransfer` (docs/UNIVERSE.md 6.3; try them from the console, `fleetList()` shows the hangar), and `shipStat('vmax')` gives the active ship's number with its parts applied; `space.js`, `boost.js`, `shop.js` and the HUD read their speeds, thrust, turn and hull through it |
| `src/hud.js`, `src/ui.js`, `src/map.js`, `src/meta.js`, `src/audio.js` | the cockpit HUD, the shared panel style, the Tab map and `H` help, the pause menu and save, synthesized sound |
| `tests/` | headless-Chrome tests; `bash tests/smoke.sh` runs them (see `CONTRIBUTING.md`) |

## Contributing

Welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md). The project's own AI-agent workflow is described in [`docs/AGENTS.md`](docs/AGENTS.md); you do not need it.
