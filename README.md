# Long Haul (working title)

A browser 2D top-down space game, Elite Dangerous flavoured. Walk around a station, take a call from the board, fly out, fight pirates, land on a planet, bring someone home and get paid. Plain JavaScript on Phaser 3, **no build step, no network, no image or sound files**: every ship, station and planet is drawn in code and every sound is synthesized.

Licence: MIT (see `LICENSE`; the one bundled library is listed in `THIRD-PARTY.md`).

## Play

Open `index.html` in a browser (Chrome is what it is tested in). Double-clicking the file works; if you prefer a server, run `python3 -m http.server` in this folder and open http://localhost:8000.

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
- **Soon, change a markdown file.** The plan is that ships, missions, shop prices and what a bartender says live in plain `.md` files you can edit without touching code. The design is in [`docs/MODDING.md`](docs/MODDING.md); it is a plan, and the `content/` folder it describes does not exist yet.
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
| `src/hyperspace.js` | the hyperspace tunnel scene (star streaks, gates, colour ribbons, readout); opens only from `#hyper` for now |
| `src/missions.js`, `src/shop.js`, `src/poi.js`, `src/asteroids.js`, `src/guide.js` | the mission board and what each call does, the bar and upgrade shop, wrecks to salvage, asteroid mining, first-run hints and the ending card |
| `src/enemies.js`, `src/traffic.js`, `src/boost.js`, `src/feel.js` | pirate types and their AI, civilian traffic and police, boost and dash, hit feedback and flight cues |
| `src/ships.js`, `src/art_world.js`, `src/stationart.js`, `src/interior.js` | the art, all drawn in code: ships and their flames, the backdrop and planets, the stations, the station interior |
| `src/hud.js`, `src/ui.js`, `src/map.js`, `src/meta.js`, `src/audio.js` | the cockpit HUD, the shared panel style, the Tab map and `H` help, the pause menu and save, synthesized sound |
| `tests/` | headless-Chrome tests; `bash tests/smoke.sh` runs them (see `CONTRIBUTING.md`) |

## Contributing

Welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md). The project's own AI-agent workflow is described in [`docs/AGENTS.md`](docs/AGENTS.md); you do not need it.
