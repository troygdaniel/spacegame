# Spacegame (working title: Long Haul)

A browser 2D top-down space game with two modes on one title screen, in plain JavaScript on Phaser 3. **No build step, no network, no image or sound files**: every ship, station and planet is drawn in code and every sound is synthesized.

- **The Campaign** is where the work is now: a **Homeworld-style commander game** with **X-Wing's scripted missions and power management**. You fly Earth's cruiser, a big slow carrier, and direct its small ships. Three levels, nine missions, a story about an alien outpost.
- **Long Haul** is the first game, an Elite-flavoured trader and rescue game: walk a station, take a call from the board, fly out, fight pirates, land on a planet, bring someone home and get paid. It is finished and shares the engine.

Licence: MIT (see `LICENSE`; the one bundled library is listed in `THIRD-PARTY.md`).

## Start here

| If you want to know | Read |
|---|---|
| What works today, what is being built, what is open | [`PROJECT_STATUS.md`](PROJECT_STATUS.md) |
| What comes next, what is benched, what is out | [`ROADMAP.md`](ROADMAP.md) |
| How it is built and why | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Every Campaign rule and number | [`docs/CAMPAIGN.md`](docs/CAMPAIGN.md) (balance: [`docs/CAMPAIGN-TUNING.md`](docs/CAMPAIGN-TUNING.md)) |
| How an AI helper (you, ChatGPT) should work with this project | [`docs/WORKING-WITH-AI.md`](docs/WORKING-WITH-AI.md) |
| Rules for AI agents that change the code | [`CLAUDE.md`](CLAUDE.md) |
| How to contribute a change | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Long Haul's design | [`docs/UNIVERSE.md`](docs/UNIVERSE.md), [`docs/ECONOMY.md`](docs/ECONOMY.md) |

## The Campaign in short

**Premise.** The Earth cruiser, a mining ship turned warship, is drafted into a war with an alien fleet. Missions run from the Moon to the asteroid rim (level 1), through the warp to Alpha Centauri and an ancient relic (level 2), to the alien home world (level 3), and end on a reveal: *this is not their home, it is an outpost.*

**What you do.** You fly the cruiser yourself (the arrow keys, hold Space to fire its eight turrets, Enter a homing missile) and **command the rest**: fighters (attack, guard, mine), escorts (screen a convoy), the convoys themselves (tuck in, hold, run), scouts. You give orders from short lists (`Q` the fleet's, `P` the ship's, with a key for each part of them), by typing to the ship's computer, or by voice. Between missions you are in a **ready room** where you read briefings, spend ore on ships, and see your rank. After each battle you pick one of three alien technologies.

**The ideas that make it a commander game.**

- **Power management.** Six pips shared between weapons, shields and engines (like X-Wing's); shields mend by themselves at a rate the shield pips set; three gauges at the top right show where the energy goes, and the power list (`O`) opens right under them with the same pip bars on its rows.
- **Pilots ask for orders.** Timed radio calls with three choices (the miner's call in 1.1 has five: send all squads, Red, Green or Yellow, or stay) and real costs.
- **A mission is a sequence of questions.** Mission 1.1 is the finished example: a patrol turns back, a distress call, an ambush with torpedo boats, a pirate leader who duels your cruiser. Something happens about every minute.
- **Objectives and bonuses**, a score, and ranks that grow your wing.

The state of each system is in [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

## Play

Open `index.html` in a browser (Chrome is what it is tested in). Double-clicking the file works; if you prefer a server, run `python3 -m http.server` in this folder and open http://localhost:8000. If you are editing the markdown in `content/`, run `node tools/serve.mjs` instead (http://127.0.0.1:8787/): it rebuilds `content.generated.js` when you save and the page reloads on **R** (see `docs/MODDING.md` section 4).

On the title screen, **K** opens the Campaign; **Enter** starts Long Haul (or the choice the arrows picked, Up and Down or Left and Right); a click on a panel starts that mode. No other key starts a mode (so Alt+Tab or a stray key does nothing). Address options: `?campaign=N` opens Campaign level N at once; `?debug=1` turns on the Campaign's tuning keys.

## Controls

The game's own **H** page lists every key; it is built from `src/data_controls.js`, the one table of keys.

### Campaign

One list per hand, with shortcut keys. **`Q` opens the fleet list** at the left and **`P` opens the ship list** at the right. Each is short: a few orders, and one row for each of its parts with the part's key on it. **A part's key opens it directly at any time:** `W` all squads, `E` the red squad, `R` the green squad, `T` the yellow squad on the left (the fighters are split into three squads); `O` power (Shields first: `O`, `Enter` adds a shield pip), `I` autopilot, `U` dock and repair on the right. So `W` then `Enter` sends every fighter at the target, and `E` then `Enter` only the red squad. The escorts and the convoy have no key of their own: they are rows of the `Q` list. Nothing is on the screen until you press one of these keys. Each row says what it does in plain words; a row that cannot be used now is grey and says why. **No key means two things in flight**, and there are no number keys.

| Key | What it does |
|---|---|
| `Q` | the **fleet list**, a row for each part of the wing and nothing else: All squads, the Red, Green and Yellow squads, Escorts (Escort the convoy, Attack the target, Guard the cruiser, Recall the escorts) and Convoy (Tuck in, Run for it, Hold here, Carry on) |
| `W` | **all squads**: Launch the wing, Attack the target, Guard the cruiser, Recall, Mine ore (it opens on Launch while ships are in the bay and on Attack once the wing is out: `W`, Enter or `Q`, Enter, Enter launches everything) |
| `E` | the **red squad**: Attack the target, Guard the cruiser, Recall |
| `R` | the **green squad**: Attack the target, Guard the cruiser, Recall |
| `T` | the **yellow squad**: Attack the target, Guard the cruiser, Recall |
| `P` | the **ship list**: rows that open Power, Autopilot, Dock and repair; Warp blink ahead once you have that tech |
| `O` | **power**, which opens right under the three gauges at the top right: Shields, Engines and Weapons, each with its pip bar (the gauge's twin: both light together; the highlighted row frames its gauge), Enter gives one more pip and the list stays open; then Balance the power and Emergency shields |
| `I` | **autopilot**: Fly to the goal, Fly to the target, Fast burn to the goal, Fast burn to the target |
| `U` | **dock and repair**: Dock at the outpost (aboard, in a level with none: Repair the hull, Build a fighter, Build an escort) |
| `Up` `Down` `Enter` | in an open list: move the highlight, give the order (the list closes when the order is taken). On a row that opens a part, `Enter` or `Right` opens it |
| `Left` | in a part's list: back to the fleet or the ship list |
| Arrow keys | fly the cruiser: Up thrust, Left and Right turn, Down brake (while a list or a pilot's call is open the ship coasts) |
| `Space` (hold) | the turrets fire at ships in reach; they never fire on their own |
| `Enter` | a homing missile at the target (only while no list is open) |
| `A` `D` `S` `X` | the one target: the last or next hostile (nearest first), the nearest threat, clear it. A red bracket marks it and its name is under the radar; Attack goes at it, Fly to the target flies to it, `Enter` fires at it |
| `J` `K` `L` `;` | power, directly, one pip a press: a pip to the shields, the engines, the weapons; `;` back to 2, 2, 2 (the `I` list has the same orders) |
| `Tab` | the map of the level: `Up` `Down` step the marks, `Enter` flies there (`Shift+Enter` fast), a click sets a mark, `V` scouts, `X` clears the trip |
| `-` `=` `Backspace`, mouse wheel | zoom out, zoom in, reset the zoom and recentre (the view or the map) |
| mouse drag (left button) | pan the flight view away from the cruiser, or the Tab map; the RECENTRE mark, `Backspace`, or an arrow held bring it back |
| `/` `.` | type an order to the ship's computer; hold `.` and say it (both need a chat key: Settings > Keys) |
| `Esc`, `H`, `M` | back one step in the lists (a target list to its list, a list a row opened to `Q` or `P`; a list its own key opened closes), then close the map, else pause; the page of keys; mute |
| `N` | the **tuning panel** (flight and ready room): numbers and switches changed live, kept in this browser; `Up` `Down` choose, `Left` `Right` change (`Shift` ten steps), `Backspace` back to the default; *Copy my settings* copies what you changed. A mission flown tuned keeps no score |

**A pilot's call** (a timed radio prompt with three answers, or five when it offers the squads: a squad with no ship out is grey and `Enter` on it says why) is a small amber list low in the middle of the screen: `Up` and `Down` pick an answer, `Enter` gives it. The highlight starts on the pilot's own cautious pick, which is also what he does if you say nothing: he waits 8 seconds, shown by a bar. **Press `Up` or `Down` and the timer stops** (the bar stays where it was and turns pale blue, and the key line says "Timer stopped"): the call then waits for `Enter` (30 seconds at the longest, then he takes the cautious pick); touch nothing and it runs out as ever. No other key stops it. Only one list has the arrows and Enter at a time: while an order list (or the map) is open the call waits, dimmed, and says so.

The battle never slows for a list, the map or a pilot's call: it runs at its own speed whatever is open. It has one pace (Normal); there is no pace key. Cards between battles (the tech pick, the refit) still use the number keys shown on them.

### Long Haul

| Where | Keys |
|---|---|
| Station | `1`-`6` or `W S` and `Enter` pick from the station menu (go there and open it); `N` hands the keys back so `W A S D` walk and `E` uses what you stand at; `J` journal, `G` galaxy map |
| Space, by hand | `A D` turn, `W` thrust, `S` brake, `Shift` boost (uses energy), `Q` / `E` dash sideways, `Space` or mouse fire, `L` dock or land (fly slowly, close in), mouse wheel zoom |
| Space, where to go | `N` places (`Enter` sets the destination, `Enter` again goes there, `X` clears it), `C` cruise there, `P` autopilot there, `G` galaxy map and jump, `F` call the fuel ranger on a near-empty tank |
| Space, by command | `Z` flight assist on or off; `B` the Overview of ships (`Enter` targets one); `1`-`4` orders about the target: approach, keep at range, orbit, match speed; `V` gun lock; with the assist on a click in space flies there and a click on a ship or place targets it; `R` autotarget on or off (needs the part) |
| Surface | `W A S D` walk, mouse aim and click to fire, `E` talk to the colonist or board at the pad, `C` show the controls again |
| Anywhere | `Esc` pause menu, `M` mute, `Tab` sector map, `H` help page, `T` pin or hide the mission list |

**The loop:** Station (take the rescue call, board your ship) -> Space (fly, fight drones, dock or land with `L`) -> Surface (find the colonist, protect them, return to the ship) -> fly home, dock, get paid. Credits buy ship upgrades at the station shop.

**Saving:** the game saves itself in your browser (`localStorage`, key `longhaul.save.v1`); nothing leaves your machine. To start over, pause with `Esc` and choose *New game* (select it twice to confirm), or clear this site's data in the browser.

## Tech stack

Plain JavaScript (no modules, no bundler) on **Phaser 3** (vendored: `phaser.min.js`). Content text in markdown sealed into `content.generated.js`. Node 22+ for the tests and tools, Chrome for the browser tests. No network access: the optional ship voice (Deepgram) and NPC chat (OpenAI or Anthropic) work only if a player pastes their own key in Settings, and the key stays in that browser. How it fits together: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Tests

```
node tests/campaign.mjs        # one plain-Node suite, about a second; there are about 160
bash tests/smoke.sh            # everything (the Chrome ones too), about a minute
node tools/build-content.mjs --check   # the sealed content is up to date
node tools/economy-sim.mjs check       # the economy's pinned numbers
node tools/campaign-bot.mjs --level 1  # bots fly the Campaign: win rate and times per mission
```

See [`docs/TESTING.md`](docs/TESTING.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Mod it

- **Today, change the code.** `src/` is about two dozen small plain-JS files, one job each (map below). Edit a number, reload the page. There is nothing to install or compile.
- **Or change a markdown file.** The calls on the mission board, the bar's characters, the pirates, the part tiers, the salvage sites, the dock and the interface's words live in plain `.md` files in `content/`: edit one, run `node tools/build-content.mjs`, reload. The ten-minute guide is [`docs/MODS.md`](docs/MODS.md) (it also says what cannot be done yet, like adding a brand-new mission); the design is [`docs/MODDING.md`](docs/MODDING.md).
- **Keep your changes in a pack.** A folder in `mods/` (copy `mods/example/`) is laid over the game when you turn it on in the Mods screen (press O on the Title screen). You can also pick the folder in that screen with no build step and no Node. Packs are off until you turn them on, and the Title says MODDED while one is on.
- Ideas for bigger changes (a star map of many systems, ship classes, hyperspace) are sketched in [`docs/UNIVERSE.md`](docs/UNIVERSE.md).

Developer shortcuts: `index.html#space`, `#surface`, `#escort` and `#patrol` jump straight into that scene with the mission accepted and do not touch your save. `#hyper` (or `#hyper24` for a 24 light year jump) plays the hyperspace tunnel on its own. `#pullout` plays a jump that is pulled out at half way: the tunnel breaks, deep space with four pirates, then the rest of the tunnel. `#station` and `#bounty` also work but use your save.

## Easy first tweaks (Long Haul)

Ten numbers that change how the game feels. Open the file, change the number, reload the page. The ship rows are for the Wren, the ship you start in; the other five hulls have the same fields in the same table.

| Change | File | Constant | Today | What it does |
|---|---|---|---|---|
| Flight speed | `src/data_ships.js` | `SHIP_MODELS.wren.speed` | 480 | top speed, px/s |
| Boost | `src/data_ships.js` | `SHIP_MODELS.wren.boost` | 800 | top speed while Shift is held, px/s (`BOOST.drain` in `src/boost.js`, 25, is how fast it eats energy) |
| Turn rate | `src/data_ships.js` | `SHIP_MODELS.wren.turn` | 1.0 | a multiplier on the base turn rate (the `0.0036` in `src/space.js`); 1.5 turns half as fast again |
| Hit flash | `src/feel.js` | `FEEL.flashFade` | 260 | ms the red screen edge takes to fade after a hit; higher lingers |
| Star density | `src/art_world.js` | the fourth argument of the two `waStars(...)` calls for `stars2` and `stars3` | 80 and 26 | stars drawn on each background tile (a number in the call, not a named constant) |
| Raider count | `src/data_systems.js` | `SYSTEMS.halcyon.pirates.max` | 8 | pirates the home system keeps alive at once; `weights.raider` beside it (0.25) is the share that are raiders, and the three weights add up to 1 |
| Fuel burn | `src/data_ships.js` | `SHIP_MODELS.wren.fuelPerLy` | 1.0 | fuel units one light year of a jump costs |
| Cruise speed | `src/cruise.js` | `CRUISE.top` | 8000 | top speed in cruise (`C`), px/s |
| Jump charge time | `src/jump.js` | `JUMP.charge` | 4000 | ms the jump charges before it goes |
| Rescue pay | `content/missions/rescue.md` | `reward:` | 500 | credits the rescue call pays; this one is a markdown file, so run `node tools/build-content.mjs` before you reload |

The tests pin some of these numbers, so `bash tests/smoke.sh` can fail after a tweak: that is the tests noticing, not the game breaking.

## Code map (Long Haul and the shared engine)

| File | What it does |
|---|---|
| `index.html` | loads Phaser and every file below as a plain script, in order; a new file needs its own `<script>` tag |
| `src/common.js` | shared helpers: the global state `G`, `beep()`, `toast()`, `go()` |
| `src/boot.js` | draws every texture with shapes, then starts the first scene |
| `src/main.js` | Phaser config and the scene list |
| `src/title.js`, `src/station.js`, `src/space.js`, `src/surface.js` | the title screen and the three places you play: walk the station, fly and fight, walk the planet |
| `src/hyperspace.js`, `src/jump.js`, `src/pullout.js` | the hyperspace tunnel scene (star streaks, gates, colour ribbons, readout), the jump that plays it (G, the charge, the fuel, the arrival), and the pull-out that cuts some tunnels short (deep space, pirates, the way back) |
| `src/missions.js`, `src/shop.js`, `src/poi.js`, `src/asteroids.js`, `src/guide.js` | the mission board and what each call does, the bar and upgrade shop, wrecks to salvage, asteroid mining, first-run hints and the ending card |
| `src/enemies.js`, `src/traffic.js`, `src/boost.js`, `src/feel.js` | pirate types and their AI, civilian traffic and police, boost and dash, hit feedback and flight cues |
| `src/ships.js`, `src/art_world.js`, `src/stationart.js`, `src/interior.js` | the art, all drawn in code: ships and their flames, the backdrop and planets, the stations, the station interior |
| `src/content.js`, `src/contenttables.js`, `src/contentadd.js`, `src/contentui.js`, `content.generated.js` | markdown content (see `docs/MODDING.md`): the parser and checker, the adapters that write a file over the game's own table by id (`contentadd.js`: and that add a new voice line, ship, call or character when the id is new), the Title screen's problems chip and MODDED tag, and the built file the game loads |
| `src/fuel.js` | fuel: every ship's tank, the price of a jump (`jumpCost`), the pump terminal in the station (price per unit from the station's `dock.fuel`), the HUD FUEL chip's levels, and the fuel ranger for a pilot stranded where there is no pump. Nothing burns fuel yet; jumps come with card u-b4 |
| `src/data_systems.js`, `src/universe.js` | the eight star systems as data (docs/UNIVERSE.md 4.2: bodies, docks with their pump, yard and parts, pirate tables, stars, traffic) and the lookups the scenes use (`sysDef`, `sysBody`, `sysBodies`), plus the jump's arrival (`enterSystem`) and the generator (`makeSystem`, `makeGalaxy`, `generatedSystems`: eight more systems, not in `SYSTEMS` yet); `tests/systems.mjs` pins the table and flies each one, `tests/galaxy.mjs` pins the generator |
| `src/data_ships.js`, `src/fleet.js` | the six ship models (hull, speed, thrust, turn, tank, jump range, hold, price) and the fleet: up to six ship records, where each is parked, `fleetBuy`, `fleetSwitch`, `fleetSell`, `fleetRename` and `fleetTransfer` (docs/UNIVERSE.md 6.3; try them from the console, `fleetList()` shows the hangar), and `shipStat('vmax')` gives the active ship's number with its parts applied; `space.js`, `boost.js`, `shop.js` and the HUD read their speeds, thrust, turn and hull through it |
| `src/hud.js`, `src/ui.js`, `src/map.js`, `src/meta.js`, `src/audio.js` | the cockpit HUD, the shared panel style, the Tab map and `H` help, the pause menu and save, synthesized sound |
| `tests/` | tests, in plain Node where no scene is needed and in headless Chrome where one is (`docs/TESTING.md`); `bash tests/smoke.sh` runs them (see `CONTRIBUTING.md`) |

The Campaign has about fifty `src/camp*.js` files; [`ARCHITECTURE.md`](ARCHITECTURE.md) lists what each one does and the file inventory this README used to carry.

## Contributing

Welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md). Working with an AI helper: [`docs/WORKING-WITH-AI.md`](docs/WORKING-WITH-AI.md). The project's own AI-agent workflow is described in [`docs/AGENTS.md`](docs/AGENTS.md) and [`CLAUDE.md`](CLAUDE.md); you do not need them to play, mod or contribute.
