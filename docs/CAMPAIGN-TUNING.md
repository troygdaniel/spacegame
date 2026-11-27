# Tuning the Campaign

Card `space-game-campaign-tune`. Troy plays the Campaign to feel out how it plays and where the story goes, so it has a kit: start at any level, debug keys, one table of numbers, and a play log of what he did. None of it touches Long Haul. Plain Node tests: `tests/campaigntune.mjs`, `tests/campaignaddr.mjs`, `tests/playlog.mjs`.

## Start at any level: the address

    index.html?campaign=2                       the Campaign at level 2 (a bare ?campaign is level 1)
    http://127.0.0.1:8787/?campaign=3&tech=beam,plating     level 3, with these techs

You start with the techs a player would have by then (the first one each earlier level offers); `&tech=a,b` names them instead (ids from `CAMP.tech`: shield, beam, blink, plating, bay2, repair). A wrong level (`?campaign=9`) or a tech that is not there is answered with a plain line and the game starts as it always does. The parser is `src/campaignaddr.js` (`campaignAddr`, `campAddrPlan`); the number of levels is the level table's, so a level added to `CAMP.levels` can be asked for at once.

## Debug keys (in the Campaign only, OFF unless the address says so)

Card `space-game-debug-keys-off`. The four keys sit beside Enter, and one slip on the backslash ended a real Mission 1 at 108 s. So they do **nothing** in the normal game: no key, no DEBUG line on the pause card, no debug group on the H page. Turn them on with the address:

    index.html?campaign=1&debug=1       (also ?debug, ?debug=on, ?debug=true, ?debug=yes; ?debug=0 and anything else is off)

A bot, a tool or a test turns the kit on in code with `campDebugSet(true)` (off again with `campDebugSet(false)`); `campDebugOn()` says which. Chrome tools that press a debug key open the page with `&debug=1` (`tools/campshots.mjs` part 3 does). `campDebugKey`, `campDebugRun` and `campDebugLine` all answer "nothing" while the kit is off, so no caller can slip past the switch.

| Key | Does |
|---|---|
| `'` | skip to the next level (the tech this level would have given is picked for you, the first it offers) |
| `6` | win this level: the story and the tech pick that follow a win are shown |
| `7` | lose this level |
| `` ` `` | god mode on and off: the carrier takes no damage and Earth's shield does not fall |

The brackets and the backslash are the player's selection keys now (card `space-game-keys-select` moved win and lose to `6` and `7`). They are listed in one small line on the pause screen (`campDebugLine`). The rows are the data table `CAMP_DEBUG` at the top of `src/campdebug.js`: change a key there, one line.

## The tuning panel (card `space-game-tuning-panel`; Troy, 22 Nov 2026)

How Troy iterates on feel: press **`N`**, in flight or in the ready room, and change a number or a switch while the battle waits; close it and fly. `Up` `Down` choose, `Left` `Right` change (`Shift`: ten steps), `Backspace` puts a row back to its default, `Enter` flips a switch, `Esc` or `N` closes. Each row says when the change is felt: **at once** (the battle already on feels it), **next mission** (the number is copied into a ship, a rock or the battle's clock when the mission is made) or **next call**. Changes are kept in the browser (`localStorage`, `longhaul.campaign.tuning`); a **TUNED** mark shows while any is on; **a mission flown tuned keeps no score and no rank** (the level still moves on). The rows are one table, `CAMP_TUNE` in `src/camptune.js`:

| Group | Rows (at once unless said) |
|---|---|
| The cruiser | top speed (next mission), turn rate (next), shield size, shield mend rate (the value at 2 pips; the other pips keep their shape) |
| The guns | turret damage, time between shots, reach; missiles at the start (next), missile reload; laser tank size, laser refill |
| The wing and the convoy | fighter hull (next), fighter damage; transport and hauler speed (a factor on every mission's convoy, next) |
| The enemy | hull and damage, each a factor on the mission's own scale (next) |
| Time and the pilots | battle pace (a factor on Normal, next), **fight pace** (how fast the small ships fly and fire while a foe is near, at once; 0.5, 1 is as fast as they travel; card `space-game-slower-fights`), time to the waves (a factor on every timed wave, `CAMP.time.waves`), time to answer a call and between calls (next call), starting zoom (presses of minus from 1, next) |
| Ore | ore in a rock (next), a mining ship's rate |
| Switches (`CAMP.flags`, read through `campFlag`) | pilots' calls; the distress call of 1.1 (next); torpedo boats (next); the rival ship (next); fighter repair; convoy orders; **turrets fire by themselves** (on; the others are on by default); the turret charge; the first-minute hints. Off takes the whole system out as if it were not in the mission: the plain bot still wins 1.1 with each off, and with all off together (`tests/camptune.mjs`) |

**Copy my settings** (the top row) puts only the changed rows on the clipboard, one line each: `cruiserspeed = 280   # Cruiser top speed, default 210`. Paste it to whoever bakes it in: `node tools/apply-tuning.mjs settings.txt` prints each `CAMP` change it means (the old default, the new one, the file and line), and `--write` makes the change in the source (only the number or the array on the line, never a comment). **Bots, node tests and boot scripts never see overrides**: only a scene reads the file (`campTuneLoadOnce`), and a driven browser (`navigator.webdriver`) neither reads nor writes it. To add a row: one line in `CAMP_TUNE.rows`, its words `camp.ui.tune.row.<id>` in `content/text/camptune.md`, and a check in `tests/camptune.mjs` that the number does what it says.

## The numbers: one table

`CAMP` at the top of `src/campaign.js`, one line a number, a comment on each. Units: px, px/s, seconds for the times written in a level, milliseconds for a delay.

| To make it | Change |
|---|---|
| easier on the carrier | `carrier.hull` up, `carrier.speed` up, the `shield` tech's `taken` down (0.6 is 40 percent less damage) |
| easier on Earth | `earth.shield` up, `alien.earthDamage` down |
| a bigger wing | `bay.fighters`, `bay.escorts`; `fighter.damage` up, `fighter.hp` up |
| hurt fighters land and come back sooner, later or never | `repair.below` (the hull share a pilot breaks off under, 0.25; 0 turns the repair off), `repair.time` (s mended, 20), `repair.ore` (what a mend costs, 0), `repair.within` (s of flight it may be from the cruiser, 15); `repair.below` and `repair.time` are rows of the N panel |
| weaker or stronger aliens | `alien.hpScale` and `alien.damageScale` for all of them; `mother.hp` for the mothership |
| a bigger wave | `levels[n].waves[i].ships` (`raider`, `drone`, `gunship`) |
| stronger or weaker missiles | `missile.big` (the mothership, towers, gunships), `missile.small` (the rest), `missile.blast` |
| more or fewer missiles | `missile.magazine` (the start and the reload's full), `missile.reload` (ms for one to come back), `missile.max` (the most ore can fill it to) |
| easier or harder to aim | `missile.turn`, `missile.speed`, `missile.lock` (how far it can pick a target), `missile.fuze` |
| the turrets hit harder, reach further or fire faster | `carrier.pd` (damage of one shot), `carrier.pdRange` (px), `carrier.pdDelay` (ms between a turret's shots); eight turrets means 8 times `pd` over `pdDelay`; `tech.beam` for the beam tech |
| promoted sooner or later, a bigger or smaller wing at a rank | `ranks[i].at` (the points a rank is held from), `ranks[i].fighters`, `ranks[i].escorts` (its extras to the bay and the wing limit); the points are the sum of the best mission scores (`score.*` for what a mission is worth); `node tools/campaign-bot.mjs --rank 5` to see the effect |
| the wing's formation is looser or tighter, its strafing runs come in closer or swing wider, a circling fight is broken off sooner or later | `flight.beside` (px from the thing's edge), `flight.gap` (px between the ships of a flight), `flight.reach` and `flight.self` (px: a threat the flight breaks off for), `strafe.miss` (px: the lane's offset), `strafe.wide` (px: how far out it swings), `strafe.burst` and `strafe.burstBy` (the guns' burst on a run in), `dog.circle.limit` (rad of turning a fighter takes before it extends) |
| the turrets fire as one volley, or as a rattle | `carrier.stagger`: 1 gives each turret its own slot in the cycle, 0 puts all eight on one beat; `carrier.jitter` (ms of random on each slot; under half of `pdDelay` over the turret count). The shots a second are `8 / pdDelay` either way. Their sound and flash: `CAMP_BLIP` at the top of `src/campaignscene.js` (the least gap between blips, the flash time, pitch, length, loudness) |
| the turrets miss moving ships (or hit too well) | `carrier.lead`: 1 aims where the shot and the alien meet, 0 where the alien is now, 0.5 half way; `carrier.pdSpeed` (a faster shot needs less lead) |
| more or fewer turrets, or somewhere else on the hull | `carrier.mounts`: one `[x, y]` row each, px from the carrier's centre in its own frame (x along the nose); the hull is drawn 98 by 70 px; a turret has to lie on it |
| your ships bigger or smaller | `size`: one row each for the carrier, the fighters and the escorts, the drawn length in px (`len`, the picture is scaled to it) and the hit circle's radius (`hit`); the turret mounts, `bay.mouth` (where a launched ship appears) and `bay.dockAt` (how near a recalled ship lands) are sized for the hull as drawn, so move them with it |
| a faster or slower level | `waves[i].at` (seconds into the level), `early` (seconds after the wave before is dead), `convoys[i].at` |
| the map | `places` (px from Earth); the Sol distances are `docs/SOL.md` at 1 to 12 |
| who an order reaches, what it takes as a target, what a right-click does | `wing.groups` (a name and a list of kinds), `wing.verbs[v].kinds` (the targets a verb takes) and `.group` (who it addresses when none is named), `wing.smart` (the verb of a right-click on each kind of target), `wing.holdAt` (px a held ship is "there") |
| the pirates: how hard, how fast, what they go for, when they run | `pirate.kinds` (`skiff`, `cutter`, `brute`: `base` the PIRATES row it flies like, `hp`, `dmg`, `ore` its wreck holds, `color` its mark), `pirate.prey` (the weight of each kind of ship: the least distance times weight is attacked), `pirate.breakHp`, `pirate.run`, `pirate.runMin`, `pirate.gone`; a wave row's `prey`, `breaks`, `breakOn`, `breakAt` |
| the torpedo boats: how tough, how slow, how soon they fire, what they go for | `torpedo.boats` (`tboat` the pirates', `lancer` the aliens': `hp`, `speed`, `accel`, `turn`, `ore`, `prey`: the weight of each kind it goes for, and `tube`: `n` torpedoes, `reload` ms, `range` px, `windup` ms it holds still to arm, `aim` rad); the wave row's `prey`, `breaks`, `breakOn` |
| the torpedo: how hard, how fast, how easily it is shot down | `torpedo.torp` (`hp`, `speed`, `launch`, `accel`, `turn`, `life` ms of fuel, `dmg`, `blast` and `splash`, `fuze`, `r`, `bias`: how much nearer an alien must be for the turrets to leave a torpedo, `lock`: how far F reaches for one); `torpedo.sayEvery` how often the radio speaks; a mission's bonus `{ type: 'torpedoes', n }` |
| the convoy orders: how close the cover is, how fast a ship runs | `convoyOrders.bubble` (px: a tucked ship this close to the cruiser is under its shield), `.run` (times its speed: Run for it), `.accel` (px/s per s: how fast an ordered ship gains and loses speed), `.slots` (where tucked miners lie), `.kinds` (who takes orders); `CAMP_PANELS.pages` 3 shows the CONVOY page of FLEET, 2 hides it |
| the patrols and the other miners | `traffic.kinds.patrol` (`hp`, `speed`, `range`, `dmg`, `help`: how far from its post it goes to a fight, `r`: how far it ranges) and `traffic.kinds.miner` (`fear`, `work` and `dock`: seconds); the rows are `levels[n].traffic` or a mission's: `{ id, kind, place + off | at, n, r, home, field, name }` |
| named cues a script fires | `campCue(C, name)`; a mission row's `cues: [{ name, on }]`; a wave's `on: { cue }`; `on: { cleared: 'wave:0' }` |
| the cloaked caches: where they are, what they hold, how hard they are guarded | `levels[n].anomalies`: one row each (`id`, `at: [x, y]` or `place` + `off`, `hides`: weapons or tech, `guards: { raider: 2, gunship: 1 }`, `reward: { ore, missiles, turret, tech }`); a mission asks for one as a bonus: `{ id: 'find', type: 'anomaly', anomaly: '<id>' }` |
| noticed from farther, a longer visit, a wider haze | `anomaly.sense` (px; the lens tech doubles it), `anomaly.visit` (px) and `anomaly.hold` (seconds), `anomaly.haze` (px the shimmer is drawn from), `anomaly.size` (the haze's radius), `anomaly.ring` (px the guards come out at) |
| the loot bigger or smaller | the row's `reward` (`ore` in chunks of `anomaly.chunk`, `missiles`: more in the magazine up to `missile.max`, `turret`: 0.15 is 15 percent more damage, `tech`: `overdrive` or `lens`, offered at the refit as one more choice) and the techs themselves in `tech` (`after: 'find'`) |
| how far + - and the wheel zoom, and how big a step is | `CAMZOOM.min`, `max`, `key`, `keyHold` (`src/camzoom.js`: the view, shared with the Long Haul); `CAMPZOOM.map.min`, `max` (`src/campzoom.js`: the Tab map) |

A reload shows a change. A few small numbers still live in the code (a ship's radius, the freighter's turn): if you want one, move it into the table.

## The map (Tab)

Tab opens a map of the whole level over the battle (card `space-game-campaign-map`): the places (Earth, Luna and its base, Mars, Eros; the star and Proxima b; the alien home world), the convoys with a line to where each is heading, the aliens and the mothership, the carrier and the ships it has launched, and the caches, the relic (with how far the hold has got) and the towers of the later levels. It fits the level's data, so it does not zoom about while you read it; a ship that leaves it sits on the edge. The legend lists only what is on it now.

- **The battle goes on behind it.** The map does not pause anything: the orders (1 to 5), the strip (I) and the voice (U) work from it. Esc or Tab closes it (Esc never pauses while it is open), and a card (the story, the end) closes it.
- **The key is Tab, not M.** M is the mute key in every screen (`src/meta.js`), so it cannot also open a map; Tab is the sector map's own key in Long Haul. It is `CAMPMAP.key` at the top of `src/campmap.js` (a `KeyboardEvent.code`); the key line and the pause card say "Tab" in `content/text/ui.md` and `src/contenttables.js`.
- **Reuse.** The names are placed by the sector map's `mapPlace`, the grid by `mapGridStep`, the panel and frame by `hudPanel` and `hudGlowPath` (`src/map.js`, `src/hud.js`), and the colours are the radar's (`campDotColor`). What is on the map and how it fits is `src/campmap.js` (plain functions, `tests/campmap.mjs`); the drawing is `src/campmapdraw.js`.

## Navigate by the map (Tab, then pick)

Card `space-game-campaign-navigate`. The Tab map is also where you choose where to fly.

- **The goal.** Every level has one (`campNavGoal`): level 1 the mothership once it has come (before that the convoy to protect, else Earth), level 2 the nearest cache until two are gathered and then the relic, level 3 the nearest tower. On the map it pulses and says GOAL, with a line from the carrier and "412 km, about 24 s". On the main screen an arrow at the edge points at it with its distance when it is off the screen (it keeps out of the gauges, the radar, the message band and the key line); the caches and the relic have a word under them in the world.
- **The one list** (`campNavRows`, in the map's right-hand column): the goal, the places, the convoys, the caches and the relic, your ships. It is the Long Haul nav panel's idea (B and N, `src/navpanel.js`, which are not changed): **W S** or the up and down arrows choose, **A D** or the side arrows jump to the next group, **Enter** flies there, **X** clears the destination. A click on a line, or on a mark of the map, picks it the same way. These keys work only while the map is open; while it is open the flying keys are the list's, as they are in the Long Haul nav panel.
- **Flying there.** The carrier turns, runs up to a speed limit of floor plus brake times the distance left, brakes and stops just outside it (the Long Haul autopilot's own rule, `src/autopilot.js`, in the sim: `campNavDrive`). Any steering key (W A S D or the arrows, with the map closed) takes the wheel back; Space, the orders (1 to 5), the strip and the voice go on working while it flies. A convoy or the mothership is followed, not stopped at. A gathered cache counts as arriving. Hostile ships near do not stop it: it is a battle.
- **By words**, with no chat key: "fly to Mars", "go to the relic", "take me to the objective", "head for the nearest cache", "cancel the course". The closed list has one more action for it, `fleet_fly`.
- **Every number** is `CAMP.nav` in `src/campaign.js` (stop distances, the speed rule, the steer gain, the flight-time factor, the click radius, the lines of the list, the arrow's margin and keep-out rectangles).

## The warp cinematic (level 2)

Card `space-game-campaign-warp`. When level 2 starts the carrier warps from Earth to Alpha Centauri, and you see it: Earth and the Sun pull away behind the carrier, the stars stretch into streaks, a bright tunnel (Long Haul's own: `Hyper.prototype.drawTunnel`, its glow textures, its hum, the sounds of `src/audio.js`), a white flash, and the star resolves ahead with its two companions (the level's own picture of it, with a white-hot core). About 7 seconds, **any key or a click skips it**, three short lines of words (the ship's voice says them too). It plays when the level starts from the title (K), after level 1 ("next") and from the address (`?campaign=2`); not for a retry of the level or a debug skip (`]`), and once per start.

- **Every number is `CAMP.warp`** in `src/campaign.js`: the windows in seconds (the pull-away, the stretch, the tunnel, the flash, the resolve, the total), the skip fade, the grace in which a key is ignored, the lines and the sounds with their times, where Earth, the Sun and the star sit and how big they are, the colours.
- **Which level warps** is data: `warp: { dest, ly, star }` on the level in `CAMP.levels` (level 2 has it). Take the line away and the level starts as it did; put it on another level and that level warps in. `star` names the place that resolves ahead.
- **The call** is one line, the first of `Campaign.create` (`if (campWarpDue(this)) return;`). The cinematic is its own scene (`CampWarp`); it ends by starting Campaign again with the same data plus `warped: true`.
- The timeline is plain functions (`campWarpFrame(t, skippedAt)`), tested in Node (`tests/campwarp.mjs`); the scene only draws what the frame says. Long Haul's `hyperspace.js` has two optional multipliers for it (`ribbonK`, `gateK`, default 1: nothing else sets them) and two optional parts of the ship (`nozzles`, `noseDx`: the warp's cruiser brings its four nozzles and its nose; the scene's `CAMP.warp.ship.scale` and `.flame` size it and its flames; without them the tunnel flies the player's nozzles and a nose at 24 px, as before).

## The worlds of Sol and of the other stars

Card `space-game-campaign-sol`. The Campaign world holds all of Sol, and every level's star has its rings, from Long Haul's own data: the Sol pack (`mods/sol`, `docs/SOL.md`) is in the page as `MODS` whether or not the pack is switched on, with Sol, Alpha Centauri and Epsilon Eridani as bodies with a ring round the star, an angle, a size and a look. `src/campsol.js` places them in a level's own coordinates once, at load, and `src/campmap.js` / `src/campmapdraw.js` draw them.

- **Sol (level 1, the Earth level):** the Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Ceres, Vesta, Pallas, Luna and Eros (Pluto and the moons of the gas giants are left out). The level's own Earth, Luna, Mars and Eros stay exactly where they were (Mars is on the far side of Earth from the Sun, 4,100 px off); the others sit on their rings round the Sun at the pack's J2000 angles, turned to agree with Earth. **Scale: 1 to 12 of Long Haul's**, which is `CAMP.world.scale` (0.25 px per unit of the pack's files): Earth is 17,500 px from the Sun, Jupiter 40,000, Neptune 96,000, and **Neptune is about 112,000 px (11,200 km as the Campaign counts) from Earth**. A body's size is the pack's times `CAMP.world.planetR`.
- **The belt** is one ring of 700 rocks round the Sun between Mars's ring and Jupiter's (the pack's three belts, 19 percent apart, are one band), with Ceres, Vesta and Pallas in it; the Trojan camps are clusters on Jupiter's ring. **Alpha Centauri** (level 2): the star, Alpha Centauri B, Proxima and Proxima d round it with Proxima b where the level has it, and the Centauri Drift as a ring of rocks. **Epsilon Eridani** (level 3): a K star, the alien home world (the pack's Aegir) on its ring, and the inner and outer belts as rings of rocks (the rings are three times the pack's so the star is not on top of the towers).
- **The Tab map** has the rings (a thin circle through every body, one for bodies at one distance) and the belts under the marks, every body named, and **Z** between the level's own area and the whole system, to scale (the key line below the map says which, how wide, and Z). A click on a list line or a mark flies there as before; the list has every body.
- **In the world** a far body is made (a picture) only while the carrier is within `CAMP.world.draw` px of it, and taken down when it leaves; the Sun is a star with its corona. Far bodies are not on the radar beyond its range, and not in the area view of the map.
- **Fast travel across the system** (`CAMP.nav.farFrom`, `farFast`, one helper `campNavBurn` in `src/campnav.js` read by the carrier, the autopilot and the map's time): a Fast trip (the map's Fast button, Shift+Enter) of 8,000 px or less burns at 2 times the carrier's speed, longer at 3.2 times, 672 px/s, which is Long Haul's cruise at the Campaign's scale. **Earth to Neptune: 112,000 px, about 3 minutes on Fast (173 s measured, the map says 184 s), about 9 minutes at the carrier's regular 210 px/s.** Earth to Jupiter is about a minute. Each mission's content stays near its own area; the trip crosses empty space and any steering key takes the wheel.
- **Which levels:** one data line, `world: { system, fit: { place, pack }, star?, same?, k? }`, on a level in `CAMP.levels` (see `src/campsol.js`). Without a pack, or without that line, a level is what it was.

## Outposts (card `space-game-campaign-outposts`)

`CAMP.outpost` has the numbers; each level lists its outposts (`CAMP.levels[n].outposts`); `docs/CAMPAIGN.md` says the rules. `range` 280 px (how near the edge of an outpost's place the carrier must be to dock: Earth to the Lunar base is 275 px between middles, so the start of the Earth level is docked-ready), `clear` 900 px (no alien this near: the doors stay shut), `retreatHull` 0.35 (the share of the hull under which, with no ship left, the HUD says where to retreat). **Repair with ore** (card `space-game-repair-with-ore`) has its own table, `CAMP.mend`: `hullOre` 60 (a whole hull from nothing; a part costs its share), `min` 5, `hullSecs` 8, `wardPoint` 0.1 (ore a hit point of a ship you protect), `wardSecs` 6, `range` 700 px, `dockShare` 0.5 (the dock's price), and `CAMP.repair.ore` 5 (a fighter's mend) with `CAMP.repair.slow` 2 (times as long with no ore); the three prices are rows of the tuning panel's ore group (`repairprice`, `wardprice`, `fightermend`). The retreat's seconds are the map's own Fast time (`campNavEta(C, dist, true)`), so they change with `CAMP.nav.fast` and `farFast`.

## The fleet command tune (card `space-game-fleet-command-tune`; 21 Nov 2026)
> **History note (23 Nov 2026, card `space-game-no-pilot-popups`):** the pilots' calls for orders were removed (no pop-ups). The tables below about order calls, `CAMP_CALL_RATE`, the answering bots `plainf`/`plainw` and the `--nocalls` option describe a game that no longer has them; they are kept as the record of what was measured.

The fleet-command cards (1.1 in four beats, scout route, order calls, convoy orders, torpedo boats, fighter repair, auto shields, slow time, the gauges, the bigger ore bay) each moved the numbers of the nine missions; this card read them again with the bots (`tools/campaign-bot.mjs`, plain Node, no Chrome). Mission 1.1 was tuned first and landed on its own; the rest followed.
- **How to run it.** `node tools/campaign-bot.mjs --pace normal --bots plain,plains,idle --seeds 12` is the table (all nine missions; `--level 1 --mission 1` is one; the `plainf` bot named in the tables below was removed with the pilots' calls, so a run that asks for it stops with "Cannot read properties of undefined"). A run now reports the `score` and the `bonus` ids earned, and `ore`, `oreBest`, `sold`. The bots: `plain` takes the cautious pick of every order call and scouts the fork; `plains` answers each call with the best pick (the table `__SMART`, below); `plainf` answers 1 every time; `plainu` is plain without the scout (the default lane); `plainm` is plain with the wing mining while any rock is left (1.2 as a player flies it, card `space-game-tune-l1-notes`); `tuck` uses the convoy orders against everything near the transport; `thinks` / `thinku` answer well and use the convoy orders against torpedo boats and the leader only (with and without the scout); `troy` / `troyh` are Troy's first try (never attack: they lose 1.1); `idle` does nothing.
- **Mission 1.1** (`docs/CAMPAIGN.md` "Mission 1.1 in four beats"): the transport at 54 px/s, so the road is about 5 minutes; the beats a minute apart (39, 97, 160, 230, arrival 306 s; the long lane of 362 s went with the fork: card `space-game-cut-lane-fork`, 22 Nov 2026); the pirate leader is softer (first charge 10 s, 4 s of warning, broadside 6 x 15, ram 32). The beat times are measured by flying the road with a tough transport, the way `tests/campbeats.mjs` F does.
- **Which pick is right** (`CAMP_CALL_RATE` in `src/camporders.js`; a grid, every pick of each type with the others held at the cautious one, the plain-with-answers bot, 4 seeds, Normal, the nine missions, found the shape): running: chase (1.3: 1.8 ships lost against 4.3), second: everyone attacks (2.3: 25 fewer hits), wounded: covering him is the worst (1.3: 242 hits against 175), opportunity: the missile, breakaway and cruiser: nearly even by the bot, so the ratings there are by what a player would do (intercept the raiders of a convoy ship, emergency power when the shield is going). The first rating table said only what each pick did; the next paragraph is what it is worth.
- **Does answering pay? Before and after** (the nine missions, 8 seeds, Normal, scores and hits and ships lost added over the nine; the plain bot takes the cautious pick, `plains` the right pick of each call, `plainw` the wrong one, `plainf` always 1). **Before** (the calls did what they said and nothing more): wrong 17,807 score / 1,327 hits / 20.8 ships lost; cautious 18,142 / 1,235 / 20.3; always-1 18,087 / 1,346 / 20.1; right 18,164 / 1,267 / 19.6: **answering well was worth +0.1 per cent score**. **After** (a right pick makes the wing deal 1.8 times and take 0.6 for 25 s, a wrong pick 0.6 and 1.6 for 20 s: `CAMP_CALLS.mood`): wrong 17,226 / 1,518 / 32.5; cautious 18,142 / 1,235 / 20.3 (as before: nothing changed for it); always-1 17,863 / 1,322 / 24.8; right 19,131 / 1,079 / 12.4. So the right answers are **+5.5 per cent score, 13 per cent fewer hits and 39 per cent fewer ships lost** over the nine missions, the wrong ones **-5.0 per cent score, 23 per cent more hits and 60 per cent more ships lost**, and the cautious pick sits in the middle. The hard missions show it: 1.3 +11 per cent score and 3.6 ships lost down to 0.4, 2.2 +10 per cent, 2.3 +19.5 per cent, 3.3 +10 per cent; the easy ones (2.1, 3.1) have no call that matters and do not move. At the other paces (Calm, Brisk) the same: right 19,506 / 19,155 against cautious 18,653 / 18,151 and wrong 17,521 / 17,143; the always-wrong bot loses a mission at Calm (7 of 8) where the cautious one never does, and idle wins nothing at any pace. The convoy orders pay on their own: against torpedo boats and the leader they cut the damage by a fifth to three quarters (1.1: 52 hits against 210; 1.3: 138 against 171, with the answers of `plains` on top) with the same win rate; the `thinks` bot answers well and uses them (against torpedo boats and the leader only: against everything near the transport the first version of the bot kept the cruiser from the miner and lost two bonuses). What the passive player loses is the mission: `troy` and `idle` lose 1.1 at about 212 s (the ambush).
- **The table at the tune's tip** (12 seeds, plain bot, Normal; Calm and Brisk are within a few seconds and a few hits of it): 1.1 100 per cent 362 s, 1.2 100 per cent 315 s, 1.3 100 per cent 292 s, 2.1 53 s, 2.2 80 s, 2.3 110 s, 3.1 71 s, 3.2 77 s, 3.3 86 s, all won, with ships lost in the hard ones (1.3 3.6, 2.2 4.1, 2.3 6.8, 3.3 2.6) and 406 hits taken in 3.3. Idle wins none.
- **After the two-hands keys** (card `space-game-bots-two-hands-check`, 21 Nov 2026, main 42fdd4a; the pace is fixed at Normal, 0.72, so `--pace normal` is the table to run: the bot's own default is still `brisk`). Plain bot, 12 seeds: 1.1 100 per cent 362 s (the quiet long lane; `plainu`, no scout, 351 s), 1.2 302 s, 1.3 292 s, 2.1 52 s, 2.2 82 s, 2.3 106 s, 3.1 69 s, 3.2 78 s, 3.3 81 s, all won; `plains` and `plainf` (8 seeds) win all nine too. Idle wins none (it loses 1.1, 1.2, 1.3 and 2.3, and the other five run out the clock with the hull untouched); the passive `troy` bot loses 1.1 and 1.3 and wins 38 per cent of 3.3, the same as on the commit before the keys (79e9f14: 1.2 296 s and 3.3 38 per cent in both). So the keys, the targeting and the fixed pace moved no bot number. There is no command time (card `space-game-no-command-slowdown`: the battle never slows for a list, the map or a call), so a human's wall time for a mission is the bot's seconds plus the time spent on the cards, the map and the lists, which the bots do not spend.

## The fight pace (card `space-game-slower-fights`; Troy, 22 Nov 2026: "slow the pace of the fights down so I can enjoy it", then "a lot more": 0.75 became 0.5)

**What I did, in one line:** I did not lower the one battle-pace number, because that slows the trip as well (a what-if run with `--set pace.scale=0.75` won 2.3 at 23 s with no kill: the waves came in so late that the relic's 14 s hold finished first). The small ships now have a **fight pace**: while a foe is within 900 px a ship flies, turns and fires at **0.5** of its pace (half speed); beyond 1,700 px it is at the pace it had, and the share eases in between (at 1,300 px it is 0.75) so nothing snaps. `CAMP.pace.fight` (0.5), `CAMP.pace.engage` (900 and 1,700), `CAMP.pace.every` (200 ms between looks); `campFightPace` in `src/campaign.js`; the N row **Fight pace** (group time, felt at once, 0.25 to 1 by 0.05, default 0.5; 1 is as fast as travel) beside Battle pace, which is as it was.

- **What a fight is.** A small ship (the wing's fighters, the raiders, drones and gunships, the pirates, the torpedo boats, the rival) with a foe near it: the aliens' foes are every ship that is not an alien, the wing's the aliens. **What goes down by half:** top speed, acceleration, turn rate and the gap between a ship's shots (a torpedo boat's tube reload too). A fighter at Normal flies 310 px/s on the way and 155 in a fight (acceleration 374 and 187, turn 3.0 and 1.5 rad/s); its shots come at twice the gap. **What does not:** the carrier, the towers and the mothership, the turrets and missiles, the haulers and the transport, the Fast burn, the warp, the map trip, hull, damage, range and shot speed (a slower shot would fall short of the gun's range), and every mission clock (waves, beats, par). **Not in a fight at all:** a torpedo boat (a slow hull: at half its speed the turrets kill it before it can launch), a runner (a pirate that has broken off flees at its full run speed, `CAMP.pirate.run`) and a ship whose only foe near is a runner (a fighter slowed to a runner's speed could never catch it).
- **Only a pace mode has it.** A battle made with a pace *number* or none (what the sims, the pins and `--pace 1` use) is the table's own numbers: no ship gets a share. The game flies at Normal, so the game has it, and so does `node tools/campaign-bot.mjs --pace normal` (`--set pace.fight=1` for the old numbers).
- **Before and after** (the plain bot, Normal, 4 seeds, the same seeds; before is `--set pace.fight=1` on main as it was, every number as it was): seconds to win, score, damage the carrier took, ships of the wing lost, and the seconds a foe was within 1,000 px of a ship of ours.

| mission | win s before / after | score before / after | damage before / after | ships lost before / after | foe near, s before / after |
|---|---|---|---|---|---|
| 1.1 | 306 / 306 | 2,993 / 2,947 | 241 / 207 | 0 / 0 | 72 / 78 |
| 1.2 | 291 / 292 | 2,744 / 2,741 | 43 / 32 | 0 / 0 | 80 / 107 |
| 1.3 | 292 / 292 | 2,078 / 2,328 | 112 / 83 | 1 / 0.3 | 125 / 112 |
| 2.1 | 52 / 49 | 2,029 / 2,008 | 8 / 13 | 1 / 0.5 | 20 / 17 |
| 2.2 | 72 / 81 | 1,838 / 1,893 | 58 / 132 | 3 / 2.3 | 42 / 51 |
| 2.3 | 109 / 106 | 1,238 / 1,384 | 147 / 179 | 6.3 / 3.3 | 66 / 61 |
| 3.1 | 71 / 72 | 1,744 / 2,015 | 24 / 13 | 2 / 0.3 | 18 / 23 |
| 3.2 | 80 / 48 | 2,012 / 2,175 | 177 / 131 | 0.5 / 0.5 | 20 / 6 |
| 3.3 | 82 / 65 | 2,104 / 2,396 | 395 / 274 | 2.3 / 1.3 | 44 / 22 |
| nine | all won / all won | 18,780 / 19,887 | 1,205 / 1,064 | 16.1 / 8.5 | 487 / 477 |

(Main 938e60a, both cloud pull requests in: 1.2 and 1.3 are the beat versions. The plain bot at 0.75 was within the same few seconds.)

- **What it says.** All nine are won before and after, and `idle` wins none (`node tools/campaign-bot.mjs --pace normal --bots plain,idle --seeds 4`: it loses 1.1, 1.2, 1.3, 2.3 and 3.3, and the other four run out the clock). **No mission got longer by more than 9 s** (the beats, the waves, the road and the hold set a mission's length, and the carrier's turrets and missiles, which are not slowed, do most of the killing; the seconds a foe is near are 487 and 477), so **no par and no `swift` bonus is out of reach and none moved**: 1.1 306 s of its 400, 1.2 292 of 380, 1.3 292 of 380, 2.1 49 of 100, 2.2 81 of 100, 3.1 72 of 120, 3.2 48 of 120, 3.3 65 of 150, and 2.3's par of 90 was out of the plain bot's reach before (109 s) and still is (106 s). The scores do not fall, they rise by 6 per cent (18,780 and 19,887: half-speed ships are easier to dodge, 1,205 damage taken before and 1,064 after, 16 ships lost before and 8.5 after), and level 1 is still about five minutes (306, 292, 292 s). **Cloud pull request 4's numbers (1.2 and 1.3 as beats) need no pass of their own.** What a player sees changes in the ships: half the speed in every pass and twice the gap between shots, so a duel is easier to follow (one fighter against one raider: about twice the seconds near each other, `tests/campfightpace.mjs`); it does not change how long the mission takes or how much it pays.
- **One mission clock moved:** 2.3's first wave comes at 3 s, not 6 (`campMissions(2)[2].waves[0].at`). The relic's 14 s hold races the first wave; at half speed the last of the approach is a second or two longer, and the hold finished before the raiders came (a win at 22 s with no fight at Calm, at 55 s with ten kills at Normal). With the wave at 3 s the plain bot has 17 to 19 kills at Calm and 19 at Normal in every seed tried.
- **First tries that were wrong, found by the tests and the bots.** The pace look reset a runner's speed (a skiff of 6 hull could not be caught); a runner slowed to the carrier's speed by the carrier at its heels was chased for ever by the plain bot (1.3 timed out at Brisk), and a fighter slowed by a runner near it could not catch it (1.2 timed out): runners, and ships that have only a runner near, are out of the fight pace. A torpedo boat at half speed was killed before it could launch (`tests/camptorpedo.mjs` found no launch): boats are out of it too. A band of 1,000 to 2,200 px slowed the last of every approach, so at Calm a wave came too late for 2.3's hold: the band is 900 to 1,700 px. At 0.5 the dogfight suite's own pins (flips, breaks, jinks and the length of a duel) all moved at once, because every duel is twice as long: `tests/campdogfight.mjs` now flies at the pace's own numbers (`CAMP.pace.fight = 1`; it pins the dogfight's moves, not the pace) and `tests/campfightpace.mjs` flies a duel with the fight pace on. 3.3 now ends in 50 to 62 s at Brisk, before the second pilot call, so `tests/camporders.mjs` checks that the same seed makes the same calls on 1.3, not 3.3.
- **Run it:** `node tests/campfightpace.mjs` (35 checks: the table and the row, the rule and its ease, the runner, the torpedo boat and the chaser, travel as it was, the row live, the guns, a duel, the plain bot).

## After the strafing runs (card `space-game-tune-after-strafing`; 22 Nov 2026)

**Correction first.** The card began from "fighters kill towers five times faster, 3.3 in 69 s against 105": that compared the strafing tip with main from before the fight pace. Against main as it is (c92c366f) the first strafing tip (754202e9) was *slower*: 3.3 in 74 s against 64, 2.2 in 97 s against 67, 3.2 in 79 s against 47, with more damage taken, and 7 fighters never caught a moving torpedo boat (the strafing lane's clock ran while the boat flew off; 7-GEN's cef36835 fixed it). So nothing was made tougher on the first reading.

- **What the fixed tip does to a big target** (7 fighters on an Attack order, the carrier far away, Normal, 3 seeds; seconds to kill; the harness is `Attack` on one ship in an empty battle):

| target | main | strafing tip | tip, retuned |
|---|---|---|---|
| tower (160 hull; 200 after) | 6 s | 4 s | 5 s |
| torpedo boat | 9 s | 8 s | 8 s |
| lancer | 9 s | 9 s | 9 s |
| pirate leader (1500 hull; 1900 after) | 57 s | 44 s | 54 s |

- **The retune, only what was off:** `CAMP.tower.hp` 160 to **200** and the pirate leader's `hull` 1500 to **1900** (`CAMP.rival.kinds.pirateleader`): a quarter more, so the fighters' kill time is about what it was. The boats are as they were and the flight itself is untouched.
- **The nine missions** (plain bot, Normal, 4 seeds, seconds to win; main c92c366f, the fixed tip, the tip with the retune): 1.1 306 / 306 / 306, 1.2 266 / 270 / 270, 1.3 292 / 292 / 292, 2.1 48 / 47 / 47, 2.2 67 / 66 / 66, 2.3 103 / 99 / 99, 3.1 77 / 76 / 76, 3.2 47 / 48 / 48, 3.3 64 / 58 / 67. All nine are won in every case and `idle` wins none. The carrier's turrets do most of the killing in level 3 (a tower dies about every 6 to 10 s as the carrier flies from one to the next), so the strafing tip changes a mission by seconds; only 3.3 moved enough (6 s shorter) to want the hull back. No par or bonus moved: 2.2 (par 100) is 66 s and 3.3 (par 150) 67 s.
- **The mothership** (7-GEN's note: the scripted ore player of `tests/campaign.mjs`, seed 5, loses 7 of 8 fighters to it under strafing runs; circling lost 1): the mothership is in the old Level 1 fixture (`CAMP.levels.home`, the tests') and in none of the nine missions, so it is not retuned; the knobs for a big gun are `CAMP.strafe.miss`, `near`, `wide` and `burstBy`, and a mission that brings one back should check them.
- **The fast plain bot (`plainf`, always answers 1) losing 1.2 in about 1 of 12 seeds since the half-speed fights:** it is a slow-mining tail, not a stall. The run ends at the bot's 420 s cap, neither won nor lost, with the hull whole: one seed had lost 6 of the wing (ore 392 of 450), another had the whole wing mining and 428 of 450 at 420 s. The other eleven win in 266 to 362 s. Nothing in the game is stuck, so nothing was changed; if Troy wants the tail gone the lever is the ore goal (450) or the mining rate.
- **Note for Troy: Level 3 is short (about a minute a mission: 76, 48 and 67 s).** The cause is the shape, not the numbers: the carrier's eight turrets kill a tower in about 8 s, the next one is a short flight away, and nothing else happens. Making the towers tougher only makes the same minute longer and costs more shield. What I would do: give Level 3 beats, as 1.1 has (something to decide every 45 to 60 s), one mission at a time, starting with 3.3, the climax (eight towers in 67 s): a guard squad that comes out of the first towers to meet the wing, a second wave behind the carrier while it is at a tower, a tower the wing can disable (a shield node to take out first) or a tower that calls for help. Then raise the tower hull a little and the pars by what the beats add (a mission of about two minutes: par 120 to 180), and run the bots. The aim in `tests/camppace.mjs` (levels 2 and 3 about one to two minutes) is already met at the low end; this is about what the player does in them, not the clock.

## The Level 1 hunt tune (card `space-game-tune-l1-notes`; 21 Nov 2026)

5-GEN's real-game hunt of Level 1 (`docs/night/hunt-l1-fleet.md`, "For 2-GEN's tune card") found two things that felt off. Numbers are the sim's, Normal pace (the fixed pace), plain-Node: `node tools/campaign-bot.mjs --pace normal --bots plain,idle --seeds 12`. A new bot, **`plainm`**, is `plain` whose wing keeps mining while any rock is left, goal met or not: that is what a player does in 1.2 (`plain` stops mining once the goal is met, so it never showed the empty fields).
- **1.2: the mining goal was met in about 36 s and the fields were empty by about 110 s.** The store the cruiser carries in from 1.1 is 60 to 175 ore (the bots end 1.1 with 158 to 176), so the goal of 190 was 14 to 130 ore away, and the wing mines 3 to 4.5 ore a second, so 20 rocks (400 ore) were gone in under two minutes with the first raid not due until 70 s and the third at 270. Before (`plainm`, 3 seeds): with 60 ore carried in the goal was met at 77 to 80 s, the fields were empty at 139 to 141 s (244 in one run) and the bay was full at 180 s; with 170 carried the goal was met at 13 s. **After:** the goal is **450** (the bay holds 500; the ore carried in still counts, so it is 275 to 390 to mine) and the three fields hold **30 rocks of 200 hit points** (a field row's `hp`, new: 600 ore; the others' rocks stay at 100). Over 6 seeds: from an empty store the goal is met at 186 to 198 s (one run 276), with 60 carried at 169 to 181 s (256), with 170 carried at 137 to 147 s (226); no run empties the fields; the first raid (70 s) and the second (170 s) land while the wing works; the mission still ends at about 5 minutes (295 to 300 s, the third raid at 270 s; some runs 355 to 400 s when the bot's dock is slow, as before). What I tried and left: a bigger goal alone cannot do it (the bay caps at 500 and the wing fills it in 100 s of mining); harder rock for every level (`CAMP.ore.rockHp`) would slow the ore of levels 2 and 3 too. `sold` (bonus) stays 400 and the sale asked for 160.
- **1.3: one wrong answer at first contact lost 8 ships against 1.** The bots show it too, but as a tail: the contact wave kills 3 to 5 of the wing in the first ten seconds whatever the pilot said (at 141 s the aliens come; the losses are at 146 to 152 s), so the cautious pick (no mood at all) loses nearly as many as the wrong one. Before (main e7faf23, 30 seeds, every call right but the one named): all right 1.0 ships lost (worst 4), cautious 2.4 (worst 8), the wounded call wrong 3.3 (worst 8), the breakaway wrong 1.8, the running wrong 1.5. I tried softening the wrong-answer mood (20 s of x0.6 and x1.6 down to 8 s of x0.8 and x1.25): the wounded-wrong average moved 2.4, 2.2, 2.0, 2.3 on 30 seeds, which is noise, so `CAMP_CALLS.mood` is as it was. What moved the numbers is the ambush itself: **the contact wave is four raiders, two drones and two gunships** (it was five, three and two) and **the mission's damage scale is 2.1** (it was 2.4; the hit-point scale stays 2.2). **After** (40 seeds): all right 0.5 (worst 3), cautious 1.5 (worst 4), the wounded call wrong 2.1 (worst 5), score 2,317 right against 2,131 wrong (it was 2,059 and 1,843). So a wrong answer at first contact costs a few ships, not eight, and a right one still keeps the wing nearly whole.
- **The table after** (plain bot, 12 seeds; plains and plainf 8): every mission won by plain, plains, plainf and plainm, 100 per cent: 1.1 362 s, 1.2 297 s (it was 302), 1.3 292 s with 1 ship lost and 110 hull points taken (2 and 187 before), 2.1 52 s, 2.2 82 s, 2.3 106 s, 3.1 69 s, 3.2 78 s, 3.3 81 s. Idle wins none (loses 1.1, 1.2, 1.3 and 2.3, the rest run out the clock); the passive `troy` bot loses 1.1 and 1.3 and wins 38 per cent of 3.3, as before. Levels 2 and 3 are untouched (the new `hp` is read only where a field row says it).
- **Pins moved:** `tests/campbay.mjs`, `camphunt.mjs`, `camphuntfleet.mjs` (the goal 190 is 450), `camprim.mjs` (30 rocks of 200, selling 450 pays 1,350, the 400 bonus earned by that sale or by 390 and 10 more), the hunt tool `tests/huntfleet-boot.mjs` (docks at 450); new `tests/campl1tune.mjs` pins the numbers and runs the bots.

## Three pilots (card `space-game-three-pilots`; 23 Nov 2026; base main 981c198b)
Three pilots, one for each squad, each as strong as the squad it replaces: hull, gun damage and mining laser are a lone fighter's times 3, 3 and 2 (`CAMP.pilotStrength` 8, shared by `campPilotStrengths`). The numbers are the plain bot's (`tools/campaign-bot.mjs`, 6 seeds, base and mine run niced one after the other): all nine missions won on every seed both ways; winning time 1.1 306 s (306), 1.2 269 (270), 1.3 292 (292), 2.1 47 (47), 2.2 81 (62), 2.3 101 (102), 3.1 71 (70), 3.2 45 (46), 3.3 61 (59); ships lost 0 in all nine (0 to 3); idle seconds 1.1 128 (134), 1.2 86 (75), 1.3 107 (99). Pinned numbers that moved: 1.2's heavy raid at 230 to 245 s (it was 241), 1.3's quiet seconds at 126 or less (it was 120), the old-numbers plain player of `tests/campaign.mjs` wins all six (it was five of six), the fighter repair lands one seed of ten (it was at least three). No number of the table was changed.

## Missions 1.2 and 1.3 in beats (card `l1-pacing`; 23 Nov 2026)

Troy on the first mission: "lots of flying, not much happens", "the waiting, and the fights not being interactive". Mission 1.1 was rebuilt for that; 1.2 and 1.3 were not. The plain bot met no hostile for 149 of the 297 s of 1.2 and for 148 of the 292 s of 1.3. Both are a sequence of beats now, each a question for the three squads. Only the two mission rows changed (`CAMP.levels[1].missions[1]` and `[2]` in `src/campaign.js`), with the hints in `src/campl1beats.js` and the words in `content/text/campl1pacing.md`. No rule, no enemy kind, no key and no score rule is new. `tests/campl1pacing.mjs` pins all of it.

**1.2 Mine and defend: five beats** (it was three raids, at 70, 170 and 270 s).

| Time | What happens | What the player decides | What it costs |
|---|---|---|---|
| 0 s | At Ceres, empty store, three rock fields, two other miners | Which squads mine and which stand guard | A squad on guard cuts no rock |
| 40 s | A probe: 3 skiffs from the east, for the miners | Which squad stops mining to meet it | Ore not mined while it is away |
| 100 s | A raid from the south-west: 3 skiffs, 1 cutter | Send the wing, or part of it | See the next row |
| 112 s | A second group from the north-east, the far side: 2 skiffs, 1 cutter (the pilots' "second group" call asks) | A pilot to each side, or finish one side first | A side with no pilot is a miner under fire |
| 175 s | 2 torpedo boats and 2 skiffs, for the miners | Send the pilots at the boats (the radio and the hint say so), or tuck the miners in under the shield (typed on the strip: no key), or both | Tucked: the torpedoes hit the cruiser's shield. Pilots on the boats are not on the skiffs. Nothing: a miner or both are lost |
| 230 to 240 s | The heavy raid, once the others are dead: 3 skiffs, 3 cutters, 2 brutes | Hurt squads home to be mended first, or all in now | Mending takes a squad out of the fight for a while |
| after it | The Works opens its doors | Dock and sell (the mission ends), or mine on for the 400-ore bonus | Time against the speed bonus |

**1.3 Haulers home: six beats** (it was two raids at 16 and 34 percent of the road, the contact at 52 percent, and then a minute and a half of empty road). The three haulers leave twelve seconds apart as before, so the convoy is 1,500 px long and the cruiser's shield cannot cover the first and the last at once.

| Time (plain bot) | Road | What happens | What the player decides | What it costs |
|---|---|---|---|---|
| 24 s | 8 % | A probe at the lead hauler: 3 skiffs | One squad forward, or keep the wing close | A squad forward is not at the back later |
| 66 s | 24 % | 1 torpedo boat and 2 skiffs | Send the pilots at the boat (the radio says so), or tuck the haulers in or run for it (typed on the strip: no key) | Tucked haulers fly at the cruiser's side: slower. Left alone: two torpedo hits on a hauler |
| 110 s | 40 % | A raid on the LAST hauler: 3 skiffs, 1 cutter | A squad sent back, the cruiser turned round, or the hauler left to it | The front is thinner while a squad is back there |
| 150 s | 56 % | Pirates at the front again: 2 skiffs, 2 cutters | Which squad, and who needs mending | As above |
| 195 s | 72 % | 3 skiffs at the last hauler again | The same question, with a tired wing | As above |
| 220 s | 82 % | **First contact**: the pirates break off and run; 4 raiders, 2 drones, 2 gunships fall on the cruiser (the same eight ships as before) | Hurt squads home to be mended, or all in; the power to the shields; a pilot's call | A squad in the bay is not in the fight; a wrong call costs ships |
| 255 to 292 s | | The road to Earth, about 40 s (it was 90 s) | | |

No alien is seen or named before first contact: the five waves before it are pirates, and the briefing's pictures and its ENEMIES line say pirates "and unknown ships".

**Fights last longer and cost no more.** A raid used to be over in about ten seconds. The pirates of the two missions are tougher and hit softer: 1.2's scales are 2.0 for hit points and 1.35 for damage (they were 1.4 and 1.8), 1.3's are 2.9 and 1.55 (2.2 and 2.1). Raids also start farther out (4,300 px or more from Ceres, 2,400 to 3,400 px ahead on the road), so they are alive and coming for longer: with the longer sensor range that is a decision before it is a fight.

**Before and after** (`node tools/campaign-bot.mjs --level 1`, 12 seeds, the median of each):

| Bot | 1.2 before | 1.2 after | 1.3 before | 1.3 after |
|---|---|---|---|---|
| plain: won, seconds, quiet seconds, ships lost | 100 %, 297, 149, 0 | 100 %, 277, **95**, 0 | 100 %, 292, 148, 0 | 100 %, 292, **95**, 0 |
| plain: damage the cruiser took | 34 | 24 | 89 | 100 |
| late (a slow player) | 100 %, 302, 164, 0 | 100 %, 266, 114, 0 | 100 %, 292, 143, 1 | 100 %, 292, 98, 1 |
| plainw (every call answered wrong) | 100 %, 298, 168, 0 | 100 %, 292, 117, 0 | 100 %, 292, 134, 3 | 100 %, 292, 101, 2 |
| tuck (uses the convoy orders) | 100 %, 300, 164, 0 | 100 %, 269, 121, 0 | 100 %, 294, 158, 1 | 100 %, 301, 130, 0 |
| idle (no order given) | lost 83 %, never won | lost 100 % | lost 100 % | lost 100 % |

Haulers lost in 1.3, the mean of six seeds: plain 0.8 before and 0.5 after; a slow player 0.5 and 0.8; a wing that only guards 0.5 and 0.7; with the convoy orders none, before and after. Miners lost in 1.2: the plain bot none, before and after; a slow player one on one seed in six before, two on one seed in six after (the torpedo boats). Missions 1.1, 2.x and 3.x are not touched.

**What the tests show a choice changes.** At the torpedo boats of 1.2: doing nothing loses a miner or both; tucking in loses none and the shield takes the torpedoes; Red on the boats loses none and fewer torpedoes are fired. At the torpedo boat of 1.3: tucked haulers keep 20 points of hull or more; all squads on the boat and it fires less. **Not shown to change the outcome:** splitting the squads at 1.2's two-sided raid, and sending a squad back to 1.3's last hauler. They are choices about where the squads are, and the plain bot does about as well either way.

## The play log

Every level is in the play log (`docs/PLAYLOG.md`, the `campaign` event): the level, how it began (menu, address, next, retry, skip or hub), the waves, each order and how it was given (key, strip, voice, click) and whether it worked, each ship lost, the tech picked, each debug key, and the end (win, lose, quit or skip, why, the wave reached, the ships lost, the hull left, the seconds). `node tools/playlog-summary.mjs` prints a **Campaign** block, one line a level. A level the tab closes on is ended as quit.

## For the scene

What the Campaign scene calls (none of it draws, all of it is plain data and functions):

- `campNew(level, techs, { via })`: `via` is `'menu' | 'address' | 'next' | 'retry' | 'skip'`, for the log. `campOrder(C, name, arg, how)`: `how` is `'key' | 'strip' | 'voice' | 'click'`, for the log.
- Title: `const plan = campAddrPlanPage()`; a plan with a `level` starts the Campaign scene with it (`{ level, techs, via }`); a plan with only `say` shows that line and the title goes on.
- Every key: `const id = campDebugKey(e.code); if (id) { const r = campDebugRun(this.C, this.P, id); show(r.say); if (r.go) start r.go.level with r.go.techs }`.
- Pause screen: `campDebugLine(C)` (empty while the kit is off: the scene leaves the line out when `campDebugOn()` is false).
- The play log needs nothing else: it watches `campNew`, `campStep`, `campOrder` and `campPick` from outside (`playlogWrap`) and `campDebugRun` says its own steps (`campaignNote`).

## Click a place, then Fly or Fast (both maps)

Card `space-game-map-click-fly` (Troy, 20 Nov 2026). In the Campaign's Tab map and in Long Haul's sector map a click on a place **sets** it as the destination (a ring, the route and the distance, as before) instead of flying at once. Two small buttons by the mark say **Fly** (regular speed) and **Fast**, each with its key and its time: `Enter` is Fly, `Shift+Enter` is Fast, and a second click on the place with no button is Fly. Every existing key stays (the Campaign list's W S A D Enter X, Long Haul's N, B, X, P and C); any steering key takes the wheel back. Plain Node: `tests/mapclickfly.mjs`; a hand-run boot of both games with a real mouse: `node tests/mapclickfly-boot.mjs`.

| | Fly (regular) | Fast |
|---|---|---|
| Campaign | the autopilot as it was: the carrier at its top speed, 210 px/s | a **burn**: the carrier's top speed and thrust times `CAMP.nav.fast` (2) while the autopilot flies it; steering, arriving or X ends it. The time on the button is `campNavEta(C, dist, true)` |
| Long Haul | the autopilot's **local leg only**, at the ship's own top speed: no cruise, and no flying clear of a mass first (`autopilotGo(s, body, order, false)`) | the autopilot as it always was: a leg longer than 3,500 px cruises in the middle (8,000 px/s), the rest is local. On a short leg Fast is Fly and the button says "too near to cruise" |

The words are in `content/text/mapfly.md` (Campaign) and in `src/map.js` (Long Haul). The Long Haul N list's Enter, P, C and the ship computer are unchanged (they pass no speed, so they go as they always did).

## The miner's call (mission 1.1; card l1-miner-choice, 24 Nov 2026)

The owner's test for a beat: what does the player decide, and what does it cost? On main `4e02059` the miner's call had a reward and no price. Ignored, the miner was lost. Any order saved him. The transport was never at risk, because the cruiser's own turrets shot down what two torpedo boats fired later, and pilots sent to the miner were back long before the ambush.

**The one lever: a group goes for the transport while the pilots are away.** Moving the ambush forward was tried first and did not separate the answers (the turrets shoot down two torpedoes), and it left more than two minutes of empty road before the leader.

| Number | Old (main `4e02059`) | New |
|---|---|---|
| Waves in the 1.1 row | 2 (the call at 31 percent of the road, the ambush at 52) | 3: one more at **34 percent** (about 10 s after the call), **3 torpedo boats and 2 skiffs**, 1,700 px ahead of the transport, for the transport |
| Pirates the 1.1 briefing counts | 8 skiffs, 2 torpedo boats | 10 skiffs, 5 torpedo boats |

Nothing else in the row moved: the call (31 percent, 2 skiffs), the ambush (52 percent, 4 skiffs and 2 boats) and the leader (75 percent) are as they were. The new wave is the last in the row's list, so the waves before it keep their numbers. It is not on the `N` panel (that file is the local team's).

The three answers, flown by the bots `plaini`, `plaing` and `plaina` (`tools/campaign-bot.mjs`), seeds 1, 2 and 3. Every flight is won in 306 s with no pilot lost.

| Answer | | Miner's hull at the end (of 24; 0 is lost) | Torpedo hits on the transport | Transport's hull at the end (of 200) | Ore at the end | Cruiser's hull (of 600) |
|---|---|---|---|---|---|---|
| Ignore the call | before | 0, 0, 0 | 1, 0, 0 | 125, 185, 200 | 112, 112, 124 | 580, 557, 575 |
| | after | 0, 0, 0 | 0, 0, 0 | 185, 190, 180 | 160, 160, 154 | 552, 571, 583 |
| Send one pilot to guard him | before | 7, 9, 6 | 0, 0, 0 | 195, 195, 175 | 146, 146, 146 | 586, 556, 569 |
| | after | 7, 6, 0 | 0, 0, 0 | 180, 170, 200 | 168, 218, 160 | 600, 600, 554 |
| Send all three | before | 4, 17, 8 | 1, 0, 0 | 95, 190, 180 | 138, 152, 152 | 585, 554, 600 |
| | after | 8, 17, 6 | 1, 1, 1 | 120, 115, 125 | 206, 134, 182 | 582, 585, 600 |

After the change no row is best at everything: ignoring loses the miner and his bonus; sending all three saves him and takes a torpedo every time (the "no torpedo hits" bonus is lost and the transport ends about 65 hull lower); sending one keeps the transport clean but one pilot against two skiffs does not always save him. The plain bot (which attacks whatever is nearest) still wins all five seeds: its quiet time fell from 126 s to 104 s of 306, its kills rose from 11 to 16, and the cruiser's hull at the end fell from 580 to 555.

One older pin changed meaning and was moved, not loosened: in `tests/campbeats.mjs` one pilot sent to **attack** the miner's pirates used to save him in 45 s; with the boats on the transport he is too slow, so that check now sends all three (the three answers are pinned in `tests/campminer.mjs`).


## Missiles that hit (card `space-game-missiles-miss`; Troy, 24 Nov 2026: "missiles fired with M often miss"; base main `674a066f`)

**The cause, measured first.** `node tools/missile-hitrate.mjs` (plain Node, no Chrome): one enemy of a kind at a range from the carrier, the missile key pressed (the target picked first, or none picked so the key picks the nearest), 12 s of battle; a HIT is a missile that went off within its blast of the target and hurt it. Before the fix, at every range from 600 to 2300 px (6 shots a cell, 20 in the second run):

| target | picked or auto, 600 to 2300 px, base `674a066f` | after |
|---|---|---|
| mothership, tower, gunship (the `bigKinds`) | 100% | 100% |
| raider, drone, skiff, cutter, brute (every other kind) | **0%** | **100%** |

The missile flew at the small ship it was fired at and went through it: `campMissiles` set the fuze off on `campBig(u)` ships only (`CAMP.missile.bigKinds`: mother, tower, gunship, pirateleader), so a missile at anything else ran its 7 s of fuel out with no bang. **It was the same before tonight**: the same tool on `keys3-before` (23 Nov) and `keys5-before` (24 Nov) gives 0% on every small kind when the target is picked. What tonight changed (card `space-game-keys7-trim`, M with none picked picks the nearest enemy and fires) is that M now fires at the nearest enemy of ANY size, which is nearly always a raider or a skiff: before, an unpicked missile went only for a big ship in reach (`auto` row: 0% fired at small kinds, 100% at big ones), so Troy only ever saw it fired at a big ship. Out to range 2300 px (`CAMP.missile.lock` 2400) the missile always found its target: the turn rate (3.4 rad/s), the speed (560 px/s) and the fuel (7 s) were not the cause; the fastest pirate (a skiff, 430 px/s) is caught as well.

**The smallest fix, two lines.** (1) The fuze goes off on `campBig(u) || u.id === m.target`: a big ship as before, and also the ship the missile was fired at, whatever its size. (2) M with no enemy picked picks the nearest enemy **in missile range** (`campTgtNearest(C, CAMP.missile.lock)`), not the nearest at any range; with none in range it fires nothing and says the usual short no-line (a picked one out of range is refused as before). **No number moved**: `fuze` 34, `blast` 80, `big` 100, `small` 10, `turn` 3.4, `speed` 560, `life` 7000, `lock` 2400 are as they were; no N panel row was needed. The damage to a small ship the missile was fired at is the `small` 10 it already did to anything small in the blast (a raider has 20 hit points, a drone 30, a skiff 16, a cutter 36, a brute 90, a gunship 80): so a missile now HITS a raider and takes half its hull; whether a direct hit should do `big` to its own target is Troy's call, not made here.

**The one pin that moved.** `tests/campsystems.mjs` GOLD `l3` (a 120 s battle at level 3 whose script fires a missile every 20 s at the nearest alien, any kind): the turret shots 126 became 105 and the turrets' timers with them; the carrier's place, hull, shield, kills (8), the missiles (0) and the ships left (4) are the same. The missiles now kill the raiders they were fired at, so the turrets fire less. (`l1` is unchanged.)

**Bots stay where they were** (`node tools/campaign-bot.mjs --pace normal --bots plain,missile,strong --seeds 4`, all nine missions, before at `674a066f` and after): every cell is the same, win rate, time to win, hull, damage taken and kills: the bots fire at the mothership or the nearest big ship, which the old fuze already hit. The 1.2 `strong` 75% and the 1.1 `plain` hull 556 are the table's own, unchanged.

## Mission 1.2: enough ore in the field (card `space-game-12-ore-enough`, 24 Nov 2026; base main 6c3a70a1)

Troy played 1.2 and could not finish it: not enough ore. The count: the store goal is 450 held at once (`oreBest`, the 500 cap), the three rock fields held 30 rocks x `CAMP.ore.rock` 20 = **600 ore**, the store starts at 30 (`CAMP.ore.start`), a pirate wreck of a skiff, cutter or brute leaves none, and the miners only cut rocks (their chunks lie for the wing and the cruiser to take: nothing is lost with a miner). The ore the player pays for comes out of that: a missile 20 (`missile.cost`), Emergency shields 50 (`emergency.ore`), a hull repair 60 (`mend.hullOre`). Five missiles, one Emergency and one repair are 210 ore: 450 + 210 = 660 > 600, so a normal run could not fill the bay. The bots never spend, so they won (the plain bot sold 500).

| What | Old | New |
|---|---|---|
| `CAMP.levels[1].missions[1].rocks` (the 1.2 row) | 3 fields of 10 rocks, 200 hit points: at `[900, 700]`, `[-1100, -400]`, `[300, -1600]` (offsets from Ceres, 1,140 / 1,170 / 1,628 px out) | the same three, plus a fourth: `{ at: [-2100, -1400], n: 10, spread: 330, hp: 200 }` (2,520 px out, north-west: no raid comes from that side) |
| ore in the 1.2 fields | 600 (1.33 times the goal of 450) | 800 (1.78 times; with the 210 of spending, 140 to spare) |

To undo it, delete the fourth field. Nothing else in 1.2 moved (the goal 450, the sale 160, par 380, the waves, the miners). Measured on the bots (Normal, `--level 1 --mission 2`): plain 100 percent, 272 s on main and 277 s with the fourth field over 10 seeds (the fourth field is only reached when the near rocks are cut, and the seeded draws after the rocks shift a little); plainm 100 percent, 278 s; idle neither wins nor loses (the sister card `space-game-12-lose-no-miners` changes that). For that card's 300 s par the plain bot's 277 s still has 23 s in hand. Pins: `tests/campl1tune.mjs` (four fields, 40 rocks, the 1.5 times margin and the 210 of spending, the fourth field furthest and under 3,000 px).

## Mission 1.2: lost with no miners, and a 300 s par (card `space-game-12-lose-no-miners`, 24 Nov 2026; base main 0c990ee7, which has the fourth rock field)

Troy said yes to both (from the cloud session's audit). Doing nothing never ended 1.2: the pirates killed both miners and the mission sat there with no win and no loss until the player quit.

| What | Old | New |
|---|---|---|
| a lose rule in the 1.2 row (`CAMP.levels[1].missions[1].lose`) | none | `[{ type: 'nomore', kind: 'miner', why: 'miners' }]`: when the last neutral ship of that kind is gone (`campNeutralLost`, `src/camppirates.js`) the mission is lost, cause `miners`. Only the two miner ships count: the pilots mine too, and 1.1's one miner and 1.3 have no such rule |
| the lose card | | `camp.lose.miners` "Both mining ships are lost." and the tip `camp.lose.tip.miners` "Guard the miners: pick one ({keyfriendlies}), then {keyorder}." (`content/text/campaign-missions.md`, the table and the voice rule `campaign.lose` in `src/voicepack.js`) |
| 1.2 par (`missions[1].par`) | 380 s | 300 s |
| 1.2 swift bonus (`bonus` `swift`, `secs`) | 380 s | 300 s |

To undo it: delete the `lose` row, put both 380s back (1.3's par 380 and 1.1's swift 400 did not move). Bots (Normal, `--level 1 --mission 2`): idle now LOSES (6 of 6 seeds, cause miners; it used to run to the clock); plain and plainm win every seed. The 300 s swift bonus is within reach but not certain, as Troy wanted: the plain bot earns it on 8 of 10 seeds (times 277 309 284 333 272 267 211 289 269 272 s; the two misses are fights that pull the pilots off the rocks); with par 380 it was never at risk. Pins: `tests/campl1tune.mjs` section D (the rule, the par in both places, one miner or a pilot lost does not end it, the second miner does, the card's words, 1.1 untouched, idle loses, plain wins and earns the bonus on at least half of six seeds). The N panel row for the par is not added: the panel's tool needs to write a number inside the missions list, which card `space-game-stray-n-rows` (paused, b8a4d416) adds.

## Mission 1.3: all three haulers can come home (card `space-game-13-all-haulers-savable`, 24 Nov 2026; base main a18a5367 for the old numbers, 7cdf85f5 for the new ones)

Troy asked for good play to bring all three haulers home in 1.3. The first lever, the departure gap (12 s between haulers), was measured and is **not** the lever: gaps of 4, 6, 8, 10, 12, 14, 16, 20 and 24 s, 12 seeds each, Normal, gave "all three home" in 0 to 67 per cent of runs with no trend (the plain bot: 33, 0, 0, 58, 50, 25, 42, 25 and 17), and the ship lost was the LEAD hauler (h1) in 7 to 12 of 12 runs at every gap, never the rear one: at about 240 s, 20 s after the first-contact aliens arrive, killed by a gunship (most runs) or a drone. Moving the contact cue later (lane 0.82 to 0.90 or 0.96) did not change it. So Troy chose the first-contact force as the ONE lever, and the gap stays 12 s (haulers leave at 4, 16 and 28 s).

| What | Old | New |
|---|---|---|
| drones in the first-contact wave (`CAMP.levels[1].missions[2].waves[5].ships.drone`) | 2 | 1 |
| gunships in the first-contact wave (`...ships.gunship`) | 2 | 1 |
| raiders in the wave | 4 | 4 (the force is six ships, it was eight) |
| N panel (group Foes) | | two rows, "First contact (1.3): drones" and "First contact (1.3): gunships" (0 to 6, felt when the wave comes) |

The table (`node tools/campaign-bot.mjs --level 1 --mission 3 --bots idle,carrier,guard,plain,plainr --seeds 12 --pace normal`; **all three haulers home**, per cent of 12 seeds; the mission is won in every row but idle, which loses every convoy):

| Bot | Old force 4,2,2 (raiders, drones, gunships) | New force 4,1,1 |
|---|---|---|
| idle (does nothing) | 0 | 0 |
| carrier (flies and shoots, no wing: the "only flies to the goal" player) | 8 | 42 |
| guard (launches, the wing guards the cruiser: one order) | 8 | 42 |
| plain (the sensible player: escort, attack every 5 s) | 50 | **83** |
| plainr (plain, and Kara guards the rear hauler once it leaves; new bot) | 17 | **67** |

Other forces tried, same seeds (carrier / plain / plainr): 4,2,1 gave 17 / 58 / 50; 4,2,0 gave 42 / 92 / 67; 2,2,1 gave 50 / 75 / 50; 3,1,1 gave 50 / 83 / 75; 2,1,1 gave 50 / 75 / 92.

So careful play (plain, or plain with a pilot posted on the rear) brings all three home on 10 and 8 of 12 seeds, where it was 6 and 2. A player who only flies the cruiser still loses a hauler on 7 of 12 seeds (it was 11 of 12), and one who does nothing loses them all. The noise is about plus or minus 14 points at 12 seeds, so read the rows as a band: the force 4, 1, 1 was picked as the smallest change (one ship less of each of the two heavy kinds) that puts both careful players at two thirds or more. The all-delivered bonus (`all`) stays a bonus.

To undo it: `drone: 2, gunship: 2` in the wave (or set both N rows back to 2). The bots in the tuning doc: `plainr`, and `--runs` (one line per run: result, haulers delivered and lost, which hauler was lost and by what, the bonuses) are new in `tools/campaign-bot.mjs`; its summary has an `allHome` column in `--json`.

## The pilots' chase leash (card `space-game-pilot-chase-leash`, 24 Nov 2026; base main cbd9fc00)

Found on `space-game-12-keys-lose-miners`: a pilot that chased a pirate that had broken off had no limit (10 to 17 km from Ceres in 1.2), and the next raid killed the miners or the transport. Troy said yes to a leash. The rule is in `campWingAI` (`src/campaign.js`): a pilot further than `CAMP.flight.leash` from what it guards (the ship, place or point of its guard order, else the cruiser) breaks off and flies back to its slot when (a) it is on a guard order and chasing any foe it picked by itself, or (b) it is on an attack order and the foe has broken off (a runner). An attack order on a foe that is still fighting, named or picked, is kept however far: a first version also leashed those, and it turned back the pilots sent at the pirates on 1.1's miner (3,000 px or more from the cruiser), failing `tests/campbeats.mjs`, `campdogfight.mjs`, `campfightpace.mjs` and `campminer.mjs`. An attack order that was on a runner is over when the pilot breaks off (it guards the cruiser), or it would send the pilot out again the next frame.

| What | Old | New |
|---|---|---|
| `CAMP.flight.leash` (new number) | none (a pilot chased without limit) | 3000 px; 0 is no leash. The N panel has the row `pilotleash` ("Pilots' chase leash", 0 to 10,000 in steps of 250, felt at once) |

To undo it: set the number to 0 (or delete the leash block in `campWingAI`). The three assumptions on the card: (1) holds as widened above (a foe that is still fighting is kept after, named or not; the leash is for runners and for a guard pilot acting by itself); (2) no new radio line; (3) the cruiser has no leash, only the pilots' AI reads it. Not on the leash (their chases are short already): the mine, fetch and hold orders (a foe within 320 px of the pilot) and the escort order (within 650 px of the convoy ship). Pins: `tests/camppilotleash.mjs` (13 checks).

Bots, Normal, 8 seeds, before (main cbd9fc00) and after (the leash at 3,000, main with the key-bot fix of `space-game-12-keys-lose-miners` merged):

| Mission, bots | Before | After |
|---|---|---|
| 1.1 plain / strong / thinks (straight) | 100 / 100 / 100 percent, 306 / 306 / 365 s | 100 / 100 / 100, 306 / 306 / 365 s (the same) |
| 1.2 plain / strong / thinks (straight) | 88 / 88 / 88 (one lost to the miners each), 284 / 302 / 277 s | 88 / 100 / 100, 275 / 271 / 268 s |
| 1.3 plain / strong / thinks (straight) | 100 / 100 / 100, 292 s | 100 / 100 / 100, 292 s (the same) |
| 1.2 plain / strong / missile through the keys, with the key-bot fix, game leash 0 | 100 / 88 / 63 | game leash 3000: 100 / 88 / 38 |

So 1.1 and 1.3 do not move (no run chased a runner past 3,000 px: the escorts are neither easier nor harder in these numbers), and 1.2 loses fewer miners for the strong and thinks bots. The key bots strong and missile on 1.2 are not helped: on 16 seeds with the first, wider version of the leash strong was 63 percent won with or without it and missile 56 with it, 69 without (inside the noise of 16 seeds), and the 8 seeds above say 38 against 63, so their remaining losses to the miners are not the chase (they stay with card `space-game-12-keys-lose-miners`). Two pins in `tests/campl1pacing.mjs` moved with the leash and say so: the empty time of 1.3 (no hostile alive) was 117 s on the median of three seeds and is 131 with the leash at 3,000 (119 at 4,000, 129 at 5,000: mostly the noise of three seeds), so its bound went from 126 to 135; and 'do nothing' at 1.2's beat 3 costs a miner and a torpedo hit on seven of eight seeds with the leash (eight of eight without it), so the pin is now five of six seeds, not both of two. A pilot that stops chasing a runner leaves the road a little emptier: a longer leash is the lever if Troy minds.

## The cruiser's mounts and launch mouth on the flat-cut hull (card `space-game-ship-look-default-on`; Troy, 25 Nov 2026: "no switch back")

With the new ship look on for everyone, the two front turret mounts (`CAMP.carrier.mounts`: x 10 to x 2) and the launch mouth (`CAMP.bay.mouth`: (21, 19.5) to (9, 20)) became every player's and every bot's numbers: the flat-cut hull is only 11 px wide forward of x 5, so they had to move back onto it. They were measured before they were made the table's.

**How.** Base `02460033` (tag `shiplook-default-before`, the last commit with both sets of numbers, one behind the switch), `tools/campaign-bot.mjs`'s own bot driver (`run`), missions 1.1, 1.2 and 1.3, five bots (plain, strong, thinks, troy, cycle), **32 seeds each, 160 runs a mission, 480 a column**, three columns on the same seeds: the old numbers; the new numbers; and a **sham** (the old numbers with every mount nudged 0.3 px along the nose), which moves every fight the same chaotic way as a real change but cannot move the balance, so it says how far a number moves by noise alone. A difference is read paired (the same bot and seed in both columns): its standard error (se) is in brackets, z is the difference over it.

| mission | measure | old numbers | new numbers | new - old (se) | z | sham - old (se) |
|---|---|---|---|---|---|---|
| 1.1 | won (%) | 80.00 | 80.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.1 | time to the end (s) | 277.56 | 277.98 | +0.42 (0.81) | +0.5 | +0.76 (0.48) |
| 1.1 | cruiser's hull left | 586.48 | 587.98 | +1.49 (1.17) | +1.3 | -0.21 (0.26) |
| 1.1 | damage the cruiser took | 132.90 | 129.89 | -3.01 (2.09) | -1.4 | -1.41 (0.81) |
| 1.1 | kills | 12.67 | 12.62 | -0.04 (0.03) | -1.5 | +0.01 (0.02) |
| 1.1 | ships lost | 0.00 | 0.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.1 | convoy lost (%) | 20.00 | 20.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.1 | transports delivered | 0.80 | 0.80 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.2 | won (%) | 79.38 | 80.00 | +0.62 (0.62) | +1.0 | +0.00 (0.00) |
| 1.2 | time to the end (s) | 296.31 | 288.61 | -7.70 (3.67) | -2.1 | -5.91 (3.15) |
| 1.2 | cruiser's hull left | 600.00 | 600.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.2 | damage the cruiser took | 32.32 | 31.46 | -0.86 (2.08) | -0.4 | -1.88 (1.04) |
| 1.2 | kills | 18.84 | 18.64 | -0.21 (0.19) | -1.1 | -0.19 (0.15) |
| 1.2 | ships lost | 0.02 | 0.04 | +0.03 (0.02) | +1.1 | -0.01 (0.01) |
| 1.2 | convoy lost (%) | 0.00 | 0.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.2 | transports delivered | 0.00 | 0.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.3 | won (%) | 80.00 | 80.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.3 | time to the end (s) | 255.84 | 255.86 | +0.02 (0.02) | +1.0 | +0.03 (0.03) |
| 1.3 | cruiser's hull left | 600.00 | 600.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.3 | damage the cruiser took | 50.33 | 57.32 | +6.99 (2.39) | +2.9 | +0.71 (1.22) |
| 1.3 | kills | 16.59 | 16.66 | +0.07 (0.12) | +0.6 | +0.06 (0.05) |
| 1.3 | ships lost | 0.00 | 0.00 | +0.00 (0.00) | +0.0 | +0.00 (0.00) |
| 1.3 | convoy lost (%) | 44.38 | 40.62 | -3.75 (3.53) | -1.1 | -3.75 (1.96) |
| 1.3 | transports delivered | 2.16 | 2.19 | +0.04 (0.04) | +1.1 | +0.04 (0.02) |

**Reading it.** The `won` row is 80 percent in all three columns because one of the five bots, `troy` (Troy's first try: launches late and sits), loses every mission in every column; the other four win about every run, and the only run that moved is one seed of 1.2 with the `strong` bot (96.9 to 100 percent: the sham did not move it, one seed of 32). **No mission's win rate or time moves beyond noise**: the one time that looks large, 1.2 (-7.7 s, z -2.1), moves almost as far with the sham (-5.9 s, z -1.9), and so does the swift bonus there (+7.5 points against +6.9 for the sham). The cruiser's hull is 600 at the end in 1.2 and 1.3 in every run, and the transports and miners are saved as often (1.3: convoy lost 44 / 41 / 41 percent, the sham the same as the new numbers).

**One real but small movement:** in 1.3 the cruiser takes **about 7 more damage a run** with the new mounts (50.3 to 57.3 of a pool of 750 with the shield: **+14 percent, z +2.9**, the sham +0.7), and the `strong` bot kills 0.6 more (20.5 to 21.1, z +2.4). The hull stays 600, win rate and time are the same, so nothing is retuned; if Troy wants the 1.3 damage back, the table row is `CAMP.carrier.mounts[2..3]` (the two front mounts, now at x 2, sit 8 px ahead of the next pair; they moved 8 px back).

**The other pins this moved, and what was done with them** (all on card `space-game-ship-look-default-on`; every one is a sample of three or six seeds that the new numbers re-dealt, and the 32-seed numbers above say the game did not move):
- *A second player, the crude one of `tests/campaign.mjs`, on 32 seeds* (the old-belt fixture of that suite, old numbers / new / sham): 1.1 won 32 / 32 / 32 of 32; 1.2 won 25 / 27 / 27; 1.3 won 28 / 27 / 29 (a time-out or two each). So the six-seed checks that failed are chaos at the edge: `campaign.mjs` now asks two of six wins for that fixture's 1.2 (it asked five) and the carrier hurt on two of six seeds (it asked three); `campkeybot.mjs` asks the plain bot five of six through the keys in 1.2 (it asked six).
- *Seconds with no hostile alive* (the plain bot, 32 seeds): the median is 109 s in 1.2 and 132 s in 1.3 for the old numbers and for the new. `campl1pacing.mjs` took 162, 141 and 149 s for 1.3 on its three seeds; its bound is 150 s (it was 135).
- *The first four raids and the goal* (`campl1tune.mjs`): the plain bot meets the goal five or six seconds earlier on seeds 1 and 2, so the fourth raid (175 s) comes up to ten seconds after it; the pin allows ten (it allowed none). A nudge of the mounts of 0.3 px moves a goal time as much.
- *Torpedoes in 1.1* (`campminer.mjs`): the bonus for no torpedo hit is kept on 23 / 22 / 22 of 32 runs by the bot that ignores the miner's call and on 22 / 21 / 23 by the one that answers it (old / new / sham), so a torpedo gets through in about three runs of ten either way; the suite asks that one gets through on every seed when the call is answered and that fewer do when it is ignored (it asked for none).
- *The cruiser alone* (`campturretlead.mjs`, `campmissiles.mjs`): the pilots start out beside the cruiser, at the mouth, and shoot too; the mouth moved, so the raider of one duel was hit by their guns, not the turrets'. The two suites keep the pilots in the bay (`CAMP.bay.startOut = false`, as the suites of the bay do), which is what they were measuring.
- *Exact end states* (`campsystems.mjs`, section B): the carrier, the shield, the kills, the missiles and the turrets' times are the same; level 1 ends with 34 turret shots (it had 11), level 3 with 63 (it had 105) and one ship fewer.
- *Geometry* (`camplook-size.mjs`, `camplook-cruiser.mjs`): the mounts are 8 px apart at the front (they were 14), and the mouth sits just in front of the flat-cut hull's launch tube, not the old picture's.

## Hostile fighters break when the fighter you fly is on their tail (card `space-game-chunk6-enemy-break`; Troy, 26 Nov 2026, brief 8 proposal A, first behaviour only; base main `654702eb`)
**The rule** (`src/campbreak.js`, the table `CAMP.break`): a skiff, cutter, raider or drone (not a torpedo boat, a gunship, a brute, a tower) with **the fighter the player flies** within **300 px**, dead astern of it (within 0.9 rad) and with its nose on it (within 0.7 rad) turns hard across the chaser's nose: for **0.7 s** it heads at a right angle off the line from the chaser to it, turning at 1.6 times its own rate, and does not fire; then it steers as before and cannot break again for **3 s** (no jitter). Steering only: no hit points, damage or speed. **Which fighter:** only the one the player flies (`C.cockpit`), not "any of the player's fighters": the wing's fighters already have their own dogfight moves (`CAMP.dog`: break, flip, jink) and the flown fighter is the one that is excluded from them and was flown straight at. No pair and no extend (the later chunks).

**12 seeds, the cockpit sweep, steady skill, every mission** (`node tools/campaign-bot.mjs --cockpit --seeds 12 --skills steady`; old = main `654702eb`, new = the break; won percent, win time in s, the cruiser's damage; the plain and sit bots do not fly a fighter, so they only change where the idle fighter happens to be on a tail: in 3.1):

| mission | ace won | ace time | ace damage taken (old to new) | the fighter's kills a run | the fighter shot down | plain (damage) |
|---|---|---|---|---|---|---|
| 1.1 | 100 to 100 | 306 to 306 | 222 to **197** | 4 to 5 | 0 to 0 | 202 to 202 |
| 1.2 | 92 to 92 | 273 to 271 | 21 to **12** | 5 to 4 | 0 to 0 | 42 to 42 |
| 1.3 | 100 to 100 | 292 to 292 | 56 to **24** | 4 to 4 | 0 to 0 | 53 to 53 |
| 2.1 | 100 to 100 | 32 to 32 | 6 to 6 | 1 to 1 | 0 to 0 | 0 to 0 |
| 2.2 | 100 to 100 | 74 to 73 | 104 to **93** | 2 to 2 | 0 to 0 | 161 to 161 |
| 2.3 | 100 to 100 | 77 to 77 | 97 to 97 | 2 to 2 | 0 to 0 | 252 to 252 |
| 3.1 | 100 to 100 | 72 to 74 | 0 to 0 | 2 to 2 | 0 to 0 | 19 to 19 |
| 3.2 | 100 to 100 | 44 to 44 | 54 to 54 | 0 to 0 | 0 to 0 | 162 to 162 |
| 3.3 | 100 to 100 | 59 to 59 | 407 to 400 | 0 to 0 | 0 to 0 | 407 to 407 |

**What it says:** nothing is won faster or lost more; the cruiser's win rate with the cruiser bots is **identical** to the last digit (nobody flies a fighter, nothing breaks). With a fighter out the cruiser takes **less** damage in the three level 1 missions (1.1: 11 percent less, 1.2: 43, 1.3: 57), because the hostile fighters that peel off the chaser spend those 0.7 s not shooting at the cruiser or what it guards; kills are the same (4 to 5, 5 to 4, 4 to 4) and the fighter is never shot down (the bot flies a Wren-fast fighter; a human may differ). That is the damage rule of `docs/night/cockpit-sweep.md` pushed a step further in the wrong direction for level 1 (the flown fighter makes the cruiser's fight easier): a number for Troy to weigh with the other chunks, not a bug of this one (a shorter break, `ms` 700, or a longer cool-down, `cool` 3000, is one number each).

## Hostile fighters pair up: when one breaks, its partner comes round behind you (card `space-game-chunk7-enemy-pair`; Troy, 26 Nov 2026, brief 8 proposal A, second behaviour; base: the break, chunk 6 tip `3c5a4216`)
**The rule** (`src/campbreak.js`, `CAMP.break.pair`): when a skiff, cutter, raider or drone breaks off the nose of the fighter the player flies, the nearest other one within **500 px** (not breaking itself, not sent round in the last 4 s; a gunship, a brute and a torpedo boat are no partners) flies to a point **220 px dead astern** of the chaser for up to **2.5 s** and does not fire; within 140 px of the point, or when the time is up, it goes on as it was, which is at the chaser. Steering only. Nothing changes with nobody flying a fighter (the cruiser bots do not change).

**12 seeds, the cockpit sweep, steady skill, every mission** (old = the break alone, chunk 6; new = the break and the pair; the ace bot flies the fighter; plain and sit change only where the idle fighter happens to be on a tail, and none did):

| mission | ace won | ace time | ace damage taken (old to new) | kills a run | fighter shot down | plain damage |
|---|---|---|---|---|---|---|
| 1.1 | 100 to 100 | 306 to 306 | 197 to 202 | 5 to 5 | 0 to 0 | 202 |
| 1.2 | 92 to **100** | 271 to 270 | 12 to **40** | 4 to 5 | 0 to 0 | 42 |
| 1.3 | 100 to 100 | 292 to 292 | 24 to **34** | 4 to 4 | 0 to 0 | 53 |
| 2.1 | 100 to 100 | 32 to 32 | 6 to 6 | 1 to 1 | 0 to 0 | 0 |
| 2.2 | 100 to 100 | 73 to 73 | 93 to 90 | 2 to 2 | 0 to 0 | 161 |
| 2.3 | 100 to 100 | 77 to 77 | 97 to 97 | 2 to 2 | 0 to 0 | 252 |
| 3.1 | 100 to 100 | 77 to 75 | 47 to 40 | 2 to 2 | 0 to 0 | 65 |
| 3.2 | 100 to 100 | 60 to 61 | 144 to 144 | 1 to 1 | 0 to 0 | 230 |
| 3.3 | 100 to 100 | 73 to 73 | 450 to 450 | 3 to 3 | 0 to 0 | 461 |

**What it says:** the pair gives back what the break took: in 1.2 the cruiser's damage with the fighter out goes from 12 back to **40** (plain 42) and the ace wins every seed; in 1.3 from 24 to 34 (plain 53); the others move a few points. Nothing is won faster, the fighter is never shot down by this bot, kills are the same. The partner rarely reaches the point behind a fighter at full thrust inside 2.5 s (it gives up and attacks from where it is: seen in a muted look, it closed 270 to 160 px in the 2 s); a slower chaser is caught. `pair.ms`, `pair.behind` and `pair.range` are one number each.

## The miner's call has a real price (card `space-game-11-miner-real-price`; Troy, 26 Nov 2026: "yes"; base main with the quicker cruiser, `6f1672ff`)
The finding that led here (the quicker-handling card): on 32 seeds a torpedo got through on 9, 10 and 9 of them for the three answers (ignore, one pilot, all three), and the transport's mean hull was 175, 171 and 171. The call had a reward (the miner) but no steady price; the old three-seed pins only looked like one.

**The rule, the smallest that does it:** the price wave of the 1.1 row (the third wave, at 34 percent of the road, 3 torpedo boats and 2 skiffs for the transport) carries `perAway: { tboat: 0.5 }`. When it spawns, the scheduler (`campSchedule`) asks `campMinerAway` how many pilots are away at the miner and sends `Math.round(away * 0.5)` more torpedo boats: 3 boats with nobody away, 4 with one, 4 with two, 5 with all three. One line in the scheduler and one field on a row; no new state, no words, no recording, no key. The briefing still counts the base wave (5 boats in all).

**Why this lever:** the boats arrive while the wing is at the miner, so more boats against fewer guards is the whole price; the cruiser's turrets alone stop three boats about two times in three (ignore 9 of 32), five get through nearly every time. The ambush (4 skiffs, 2 boats) and the call itself are untouched.

32 seeds per answer (the bots `plaini`, `plaing`, `plaina`), before (base `6f1672ff`) and with each size of the step:

| per pilot away | ignore: torpedoes / hull / won | one pilot: torpedoes / hull / won / miner saved | all three: torpedoes / hull / won / miner saved |
|---|---|---|---|
| none (before) | 9 / 175 / 32 | 10 / 171 / 32 / 23 | 9 / 171 / 32 / 31 |
| 0.34 (boats 3, 3, 4, 4) | 9 / 175 / 32 | 10 / 171 / 32 / 23 | 13 / 158 / 31 / 31 |
| **0.5 (boats 3, 4, 4, 5), taken** | 9 / 175 / 32 | 11 / 166 / 32 / 25 | **27 / 113 / 31 / 30** |
| 1 (boats 3, 4, 5, 6) | 9 / 175 / 32 | 11 / 166 / 32 / 25 | 29 / 93 / 23 / 31 |

At 0.34 the all-three step (9 to 13 of 32) is inside the noise of 32 seeds; at 1 the all-three answer loses 9 runs of 32 (the transport dies), which is a wall, not a price. 0.5 is the smallest step that is clear: torpedoes 9, 11 and 27 of 32, hull 175, 166 and 113, in the order of the pilots away, every answer still winning on 31 or 32 seeds, the miner saved on 0, 25 and 30 of 32 (so ignoring still costs the miner and the "No miner lost" bonus, as it did).

**1.1's win rate (all 26 bots, 32 seeds, mission 1.1 only):** mean 88.5 percent before, **88.0** with the step (84.2 at 1); the plain bot 100 before and after; the median win time 306 s throughout. Three bots lose a run each: `noescort` 100 to 97, `late` 100 to 94, `plaina` 100 to 97 (all "convoy": the transport lost), the others do not move. Within a few points of 88, as asked.

**The pins:** `tests/campminer.mjs` reads thirty-two seeds of each answer now (about forty seconds) and says the table above (the order never reverses; all three costs the transport at least 40 hull and at least 10 more torpedoes than ignoring; every answer wins at least 28 of 32; the "no torpedo hits" bonus is lost in exactly the runs a torpedo got through); a unit check says the counts 3, 4, 4, 5 and that only the price wave has the field. The through-the-keys check no longer says "no torpedo gets through" (it never held beyond three seeds; it says the same torpedoes as the order).

## The cruiser turns and pushes about twice as quickly (card `space-game-cruiser-quicker-handling`; Troy, 26 Nov 2026: "yes"; base main `922b7a92`, which has the Shift boost)
Troy felt the Long Haul's Wren (turn about 3.6 rad/s, accel 720) and the cruiser as heavy as a barge. After the boost landed alone, so he could feel it first, the cruiser's own handling is about twice as responsive and still clearly heavier than the Wren.

| `CAMP.carrier` | old | new | the Wren, for comparison |
|---|---|---|---|
| `turn` (rad/s) | 1.1 | **2.2** | about 3.6 |
| `accel` (px/s per s) | 170 | **340** | 720 |
| `speed` (top, px/s) | 210 | 210 (unchanged: the boost is the surge) | |
| drag, brakeDrag | 0.55, 0.12 | as today (nothing felt loose in the Node sim: the cruise is still 210, the stop is the same braking) | |

What it does, from the 32-seed bot tables (`node tools/campaign-bot.mjs --level 1 --seeds 32 --json`, 26 bots a mission, the old and the new on the SAME seeds, old = a second worktree of `922b7a92`):
- **Level 1 (the three missions): mean win rate** 1.1 88.0 to 88.5, 1.2 80.7 to 80.7, 1.3 88.5 to 88.5 percent; **median win time** 1.1 306 to 306 s, 1.2 270 to 266, 1.3 292 to 292. Only the 1.1 `thinks` bots moved 10 s or more (356 to 312 s) and the carrier and guard bots go from 94 to 100 percent: faster turning only ever helped. Nobody wins less. That is inside noise.
- **Levels 2 and 3 (plain bot, 12 seeds, the bot's default pace):** 2.1 48 to 41 s, 2.2 76 to 73, 2.3 99 to 89, 3.1 72 to 70, 3.2 45 to 44, 3.3 61 to 55 (hull 786 to 673); the carrier bot on 2.2 wins 33 to 92 percent. Every mission is still won on every seed.
- **Mission 2.3 (the relic) is the one real move.** It needs 14 s of holding within 240 px of the relic with no alien within 650 px, and its waves start at 3, 24 and 42 s. At the pace a player gets (Normal) the plain bot takes 102 s with 19 kills before and 72 s with 14 kills now; at Calm (the tests only) 104 s before and 16 s with no fight now: the cruiser reaches the relic and starts the hold before the first wave is close. A player can do the same by flying straight at it.
- **The autopilot** (trips to places in 1.1; a still alien): to a place it lets go within 2 s of the old time, turned 2.7, 1.0 and 0.8 rad in all, and arrives at 43 to 60 px/s (under the 70 px/s drop speed), so no overshoot or circling that was not there. To a still alien it hunts about the 400 px stand-off both before (211 to 467 px) and now (185 to 425): the same hunt, a step quicker, not worse.
- **Perf:** none (two numbers).

**Troy's ruling (26 Nov 2026, through ORCH): land as is.** Mission 2.3 gets quicker (about 30 s at the pace a player gets); a retune (a longer relic hold, or the first wave earlier) only if he finds it too easy when he plays it. The two other options that were on the table, accel 255 with turn 2.2, or a second number on 2.3, were not taken.

**The pins this moved, and what was done with each** (card `space-game-cruiser-quicker-handling`; base main `922b7a92`; each re-pin has its dated note in the suite):
- Plain number pins: `tests/campaign.mjs` (turns at 2.2), `tests/camptune.mjs` (a tuned battle's cruiser turn is 2.2), `tests/mapclickfly.mjs` (accel 340, top speed 210), `tests/campboost.mjs` (the turn is the table's own).
- `tests/campsystems.mjs`: the two seeded 120 s battles end elsewhere (level 1 at (5569.6, 4288.0) with 48 turret shots, level 3 at (-1560.4, 7758.0) with 143 and 542.4 hull); shield, kills, missiles and turret times are the same.
- `tests/camppursuit.mjs`: on Fast the raider is 762 px behind after 2.5 s, 686 before; "close, not lost" stays, the bound goes 760 to 800.
- `tests/camppace.mjs`: at Calm (0.6, the tests' pace) mission 2.3 is won in 16 s on two of three seeds (106 to 118 s before): its floor is 12 s there; every other mission keeps 25 s.
- `tests/campl1pacing.mjs`: the plain bot's empty road on 1.3 is a median of 155 s on its three seeds (149), allowed 160; on 32 seeds the mean is 146 s against 138 on 1.3 and 109 against 110 on 1.2.
- `tests/campmaptargets.mjs`: the check read one instant of the carrier's hunt round a still alien's 400 px stand-off (it was at 408 px there by luck of the old numbers). It hunts, with the old and the new numbers alike (211 to 467 px before, 185 to 425 now), so the check reads 20 s of it: between 150 and 520 px and the trip on. **Known and not new:** the autopilot does not come to rest at the stand-off from a still alien; it hunts about it. It was left as it was (the card is the handling, not the autopilot).
- `tests/campminer.mjs`: the miner call's "price" was pinned on three seeds, and three seeds were never the measure. On 32 seeds (the three answers: ignore, one pilot, all three) the miner is saved on 0, 22 and 31 of 32 before and 0, 23 and 31 after, and a torpedo gets through on 10, 6 and 11 of 32 before and 9, 10 and 9 after; the transport's mean hull is 166, 176 and 163 before and 175, 171 and 171 after. So the call has no steady price in hull at 32 seeds before the change either, only a third of the runs with a torpedo whichever way. The three checks now read twelve seeds and say exactly that (it passes on the old numbers too): some torpedo runs and not all, the hull within 60 of ignoring, one pilot saves the miner on most seeds but not surely. **For Troy:** whether the call should cost more is a design question the numbers raise and this card does not settle.

## The far zoom, clean (card `space-game-far-zoom-ugly`, 25 Nov 2026; base: main at the landing before it)
- `CAMPZOOM.view.worldLeast: 7` (new): a world is drawn up so its radius is at least 7 px on the screen (Luna at zoom 0.124 is about 4 px: it is drawn at 7); the far marks' ring is the least plus 4.
- `SLGLYPH.halo: 0.16 -> 0` (no disc round a sign), `SLGLYPH.rim { color 0x050810, alpha .9, k .05, least 1 }` (new), `SLGLYPH.buckets` (the lengths a sign is baked at: 10 to 640 px) and `SLGLYPH.keep { under 1.15, over 0.6 }` (a sign keeps its bucket between them).
- `SLOOKMARK.apart: 0.9` (new): two hurt ships' arcs are drawn at least 0.9 of the larger radius apart on the screen; the more hurt one wins.
- The far marks' name gap 10 -> 8 px; the places' pill stands 16 px above the disc as drawn (`campPageHudPlaces`).
- The cruiser is not a sign at the far zoom (card `space-game-far-zoom-cruiser-picture`, 26 Nov 2026): `slookGlyphKeep(u)` (the carrier) keeps its flat-cut picture, baked at the same `SLGLYPH.buckets` (key `look-carrier-friend-<px>`), scaled down by the hull over the bucket and drawn up by the view's least size like the signs. No number changed; to put the sign back, make `slookGlyphKeep` return false.


## Fill the window: the sizing numbers (cards `space-game-fill-window-a-flight`, `space-game-fill-window-scale-bug`)

`src/fillwindow.js`, table `FILL`; the rule is `fillSize(window)`, pinned in `tests/fillwindow.mjs`. Behind `CAMP.flags.fill` (off; Settings > CONTENT, `?fill=1`). All sizes are CSS px; the screen's pixel ratio plays no part.

- `FILL.k: 1.23` (Troy, 25 Nov 2026): the fixed scale, screen px for a game px: the size the game had on his own window that day. A bigger window is more game px at the same size on the glass.
- The least window is 1575 by 886 px (1280 by 720 game px at 1.23). Under it, either way, the picture scales down to fit, as the game always did: the HUD and the lists are laid out for 1280 by 720.
- `FILL.cap: 1.5 -> 0` (Troy, 26 Nov 2026, base main `79089997`): **the cap is removed.** For a day no window showed more than 1920 by 1080 game px and past that the picture scaled UP; on a 2000 px wide window that began at 2362 px wide (1329 px tall), and Troy, playing, felt the scale change ("more visible space WITHOUT scaling"). Now nothing scales above the least window: a 2560 by 1440 window is 2082 by 1170 game px. A number in `FILL.cap` (a multiple of 1280 by 720 each way) brings the scale-up back.
- What a larger view changes: nothing in the rules (what is seen is the sensor's range, `CAMP.sensor`, not the screen; the route-fit zoom `campZoomFit` is worked out for 1280 by 720 always). The eye sees more of the battle on a larger screen.
- Landing B (card `space-game-fill-window-b-screens`, 26 Nov 2026, base main `008095ae`): the title, the ready room (its pick and briefing), the warp, Settings over them and the Tab map keep the window too, at the same `FILL.k`. Each keeps its 1280 by 720 layout in the middle (the safe area); the title's sky covers the window; a dimming layer (a 1280 by 720 rectangle in the middle) is stretched over the window. The window is given back `FILL.idle: 2` steps of the game after the last scene asked for it (a scene of the Long Haul: 1280 by 720, as it was). The Tab map's card does not grow: it sits in the safe area.
- The clipping card (`space-game-fill-window-clipping`, Troy's 3705 by 1558 px window, 26 Nov 2026): the canvas HUD was cut at the safe area's border (the Q list showed its last row). Its camera is the whole window now and its numbers are moved to the safe area by the camera's scroll; the corner lists go out to the page panels at the window's corners (`CAMP_CORNER_SHIFTX`); the goal arrow, the edge labels and the ship marks use the whole view, so a ship in the extra room has its ring and no edge label. The game's size is read from the element FIT fits to, not the window's inner size.

## Mission 2.3: the waves come on the hold, and hold the ring (card `space-game-23-waves-on-entry`; Troy, 26 Nov 2026: "yes"; the cloud's brief 7, decision 2; base `gate-next` `0d2137f6`, which is main `591969a8` with the cockpit bots)

**What was wrong.** The three waves came at 3, 24 and 42 s of the mission's clock and flew at the cruiser, turning on whatever hit them. A flown fighter drew the first wave 2 km off the ring; the cruiser sat on it for its 14 s and the mission was won in 16 s, cruiser untouched, the other two waves never seen (`docs/night/cockpit-sweep.md`).

**What changed** (`src/campaign.js`; the hold's own rule is NOT changed: it counts while the CRUISER is in the ring and no alien is within 650 px of the RELIC, and falls twice as fast otherwise):
- **The waves come on the hold**, not the clock: a wave row's `on: { held: n }` (`campWaveOn`) is true once the relic has been held `n` seconds at best (`C.relic.best`); `held: 0` is the cruiser's first time inside the ring. 2.3's rows: `held: 0`, `held: 5`, `held: 10`. A cruiser that never enters the ring meets nothing.
- **The hold is 20 s** (`relic.hold` 14 to 20): longer than the last wave's mark, so the third wave always comes before the relic answers.
- **Each wave comes out of the dark about 1,100 px from the relic** (a wave row's `ring: [dx, dy]`, from the relic's own place: north, west, south-east) and is inside the clear radius in under 8 s. They came from 2,900 to 3,900 px away.
- **The wave holds the ring** (goal `'relic'`, `campRelicAlien`): it flies to the relic and fights only what is within `relic.leash` (800 px) of the relic: the ship that hit it if that ship is inside the leash, else the nearest of yours there. With nothing of yours inside the leash, or once outside it itself, it flies back to within `relic.stand` (200 px) of the relic. So while one of a wave lives it is inside the clear radius or on its way back, and the hold cannot run.

**Why the hold's seconds and not "a third and two thirds" or "after the last wave is beaten":** it is the brief's rule, and it is the one the player can read off the ring's arc. Because an alien inside 650 px empties the hold, the second wave can only come once the first is dead or driven out, and the third likewise: the three fights follow each other, and the last 20 s are the quiet hold.

**The numbers** (`node tools/campaign-bot.mjs --level 2 --mission 3 --seeds 32 --bots plain,carrier,ace --skill <s>`; won per cent / seconds / cruiser damage taken / kills; hull 600 of 600 at the end in every row, before and after):

| skill | bot | before | after |
|---|---|---|---|
| steady | plain | 100 / 73 s / 141 / 17 | 100 / 87 s / 72 / 19 |
| steady | carrier | 100 / 94 s / 295 / 19 | 100 / 87 s / 76 / 19 |
| steady | ace | 100 / **16 s** / 0 / 0 | 100 / 86 s / 54 / 19 |
| sharp | plain | 100 / 73 s / 137 / 17 | 100 / 87 s / 69 / 19 |
| sharp | carrier | 100 / 92 s / 280 / 19 | 100 / 87 s / 90 / 19 |
| sharp | ace | 100 / **16 s** / 0 / 0 | 100 / 87 s / 68 / 19 |
| rough | plain | 100 / 88 s / 144 / 19 | 100 / 87 s / 82 / 19 |
| rough | carrier | 100 / 92 s / 262 / 19 | 100 / 88 s / 80 / 19 |
| rough | ace | 100 / **16 s** / 0 / 1 | 100 / 81 s / 57 / 19 |

- The three bots now take the same time (the fighter no longer changes the mission), every wave is fought (19 kills), and about 43 s of the 87 are the hold itself with no alien alive (5 + 10 + 20 s, less what overlaps a wave's flight in).
- **Not met: the old cruiser damage, and "can still be lost".** The cruiser takes about half what it did (72 against 141 for the plain bot), because the waves no longer overlap: one wave at a time fights it. The mission was not lost by any bot on any seed before the change either (hull 600 of 600 in every old row: the shield mends faster than one wave hurts), and a cruiser that sits on the ring alone and never fires is not hurt in 400 s (it does not win: the wave stays on the ring). Making 2.3 losable needs a call from Troy (more ships in a wave, or the second and third wave together from two sides); no hit-point or damage number was changed here.
- The idle bot does not win and is not attacked (it never enters the ring).

**Words.** The four moments of 2.3 stay true: "Enter the ring", "Hold {hold} seconds" (it reads the row: now 20), "Keep aliens off", "Aliens arrive fast" (truer: under 8 s from the call to the ring). One line changed, shown only, not voiced: `camp.bf.2.3.w2` "Hold there 14 seconds ..." is now "Hold there 20 seconds with no alien near the relic."

**Pins.** `tests/camprelicwaves.mjs` (new, 16 checks: the rows, nothing for the clock, the waves at 0, 5 and 10 s held, a wave on the ring within 8 s, the kite: a fighter that hits the wave and runs 2,500 px off draws no alien past 1,300 px and the hold never runs). `tests/campaign.mjs`: the hold is 20 and the waves have no clock second. `tests/scrbriefings.mjs`: "Hold 20 seconds", and the first wave comes on entering. The rows keep `from` only for the Tab map's extent (its zoom limit is unchanged, `tests/campzoom.mjs`). `tests/camppace.mjs`: 2.3's floor is 60 s at both paces (the 12 s exception for Calm, which was the 16 s win, is gone).

## The flown fighter fires three times as fast, at half the damage (card `space-game-fly-fighter-fire-rate`, Troy, 26 Nov 2026; base: main at the landing of the cockpit's scene half)
Troy flew a pilot's fighter (C key, `src/campcockpit.js`) and liked it; the first thing he asked for: the fire rate is too slow. The pilots' gun is 8 damage every 450 to 650 ms (14.5 a second); the Long Haul Wren fires every 160 ms for 15 (94 a second, which equals the whole wing).
- `CAMP.cockpit.rateK: 1 -> 3`: one shot every mean delay over it, a steady 183 ms (550 / 3), no random gap, on a schedule of one gap so the rate does not depend on the tick (at 30 ticks a second a shot lands on the tick after its time: gaps of 167 to 200 ms, 27 shots in five seconds).
- `CAMP.cockpit.damageK: 1 -> 0.5`: each shot 4 damage (times the pilot's strength). The stream is 22 a second, about 1.5 times a pilot's and under a quarter of the Wren's. To land on exactly 170 ms (the Wren's feel) dial `rateK` to 3.25 on the N panel: 169 ms, 24 a second.
- Both are live rows of the group "The flown fighter (C)" on the N panel (`cockpitrate`, `cockpitdamage`, step 0.25). `CAMP.fighter` (the pilots' own guns: 8 damage, 450 to 650 ms, 700 px/s, 420 range) is untouched: the AI pilots fire as before.
- **Sound and flash** (`src/campaignscene.js`, `cockpitShot`): the flown gun's shot is its own case in the scene. Before, it went through the wing's rule (a pew softer the farther from the cruiser, none past 1,600 px, one in 55 ms shared with every pilot), so a fighter flown 2 km out was silent and the pilots' shots could swallow it. Now: the wing's own soft pew (`sfx('wingShot')`, random 6 percent detune each shot) at 0.7 whatever the distance, at most one in `CAMP_SND.cockpit` = 100 ms of the battle's clock (at 183 ms every shot sounds; dial the rate past 5.5 and it plays every other one, a stream and not a buzz), and one small flash at the nose per shot (the 'ember' image, 11 px ahead, the friend blue, 0.45 scale, gone in 60 ms: two alive at most). No new sound is made.
- Pinned by `tests/campcockpitfire.mjs` (the rate and its steadiness, the damage, the AI pilots' unchanged, the scene's pew and flash), `tests/campcockpit.mjs` (the defaults) and `tests/campsounds.mjs` (the table line). The cockpit sweep was run again with these defaults: `docs/night/cockpit-sweep.md`.

## Mission 2.3: waves two and three together, from two sides (card `space-game-23-two-sides`; Troy, 26 Nov 2026: "yes"; base: the tip of the section above, `b76e9867`)

**Why.** With the waves on the hold one after another, the cruiser took about half the old damage and a cruiser fighting the ring alone still won two times in three. Troy: the second and third wave arrive together from two sides, so 2.3 can be lost. No hit-point, damage or ship count changed.

**What changed** (the wave rows of 2.3 and one rule in `campWaveOn`, `src/campaign.js`):
- The second wave comes at **10 s held** (was 5), from the west of the relic.
- The third comes **8 s behind the second**, from the EAST, the opposite side (`on: { behind: 1, secs: 8 }`: this many seconds after wave 1 of the rows came; it was 10 s held, from the south-east). The second wave is still on the ring when it arrives: twelve ships from two sides.
- The first wave (on entering), the 20 s hold, the 1,100 px spawn distance and the ring-holding rule are as in the section above.

**Picked by the tables** (32 seeds, steady; seconds / cruiser damage for plain, carrier, ace, sit):

| the two waves | plain | carrier | ace | sit |
|---|---|---|---|---|
| one after another, 5 s and 10 s held (the base) | 87 / 72 | 87 / 76 | 86 / 54 | 92 / 75 |
| both at 5 s held | 72 / 134 | 74 / 177 | 71 / 97 | 80 / 140 |
| both at 10 s held | 78 / 122 | 79 / 158 | 78 / 108 | 84 / 133 |
| second at 5 s held, third 8 s behind | 75 / 140 | 75 / 159 | 73 / 112 | 80 / 137 |
| second at 5 s held, third 14 s behind | 77 / 123 | 77 / 162 | 75 / 97 | 79 / 166 |
| **second at 10 s held, third 8 s behind (taken)** | **80 / 191** | **80 / 180** | **79 / 122** | **85 / 148** |

The one taken is the longest and the hardest on the cruiser, and the player has ten seconds of hold to lose when they come.

**The numbers** (won per cent / seconds / cruiser damage / kills; 32 seeds):

| skill | bot | before this card (`b76e9867`) | after |
|---|---|---|---|
| steady | plain | 100 / 87 / 72 / 19 | 100 / 80 / 191 / 19 |
| steady | carrier | 100 / 87 / 76 / 19 | 100 / 80 / 180 / 19 |
| steady | ace | 100 / 86 / 54 / 19 | 100 / 79 / 122 / 19 |
| steady | sit | 100 / 92 / 75 / 19 | 100 / 85 / 148 / 19 |
| sharp | plain | 100 / 87 / 69 / 19 | 100 / 80 / 158 / 19 |
| sharp | carrier | 100 / 87 / 90 / 19 | 100 / 82 / 180 / 19 |
| sharp | ace | 100 / 87 / 68 / 19 | 100 / 80 / 137 / 19 |
| sharp | sit | not run | 100 / 84 / 155 / 19 |
| rough | plain | 100 / 87 / 82 / 19 | 100 / 80 / 162 / 19 |
| rough | carrier | 100 / 88 / 80 / 19 | 100 / 80 / 165 / 19 |
| rough | ace | 100 / 81 / 57 / 19 | 100 / 74 / 97 / 19 |
| rough | sit | 100 / 90 / 93 / 19 | 100 / 82 / 144 / 19 |

**Careless players** (not bots of the tool: flown in the sim on 12 seeds, 300 s each, the cruiser sitting on the ring):

| player | before this card | after |
|---|---|---|
| the wing guards, the cruiser never fires | lost 12 of 12 | lost 12 of 12 |
| the cruiser fires at the nearest, its wing lost | won 8, lost 4 | **lost 12 of 12** |
| the cruiser never fires, its wing lost (the first wave is never beaten, so the others never come) | neither in 300 s, least hull 384 | the same |

- **Met:** the damage is back in the old range (122 to 191 against the old 137 to 295; ace 97 at rough), and the mission can be lost: a cruiser without its wing is beaten on every seed, and the test's pilot who sits on the ring and never aims is beaten by the two waves together.
- **Not met:** the time is about 80 s, not 90 to 100 (two fights at once are shorter than two in a row; a longer hold would add only quiet seconds). And no BOT of the tool loses a seed, rough and sit among them: they all keep the wing out and aim. To make the sit or rough bot lose would take more ships or more damage, which this card rules out.
- The ace bot is 1 to 8 per cent faster than plain and takes 13 to 40 per cent less cruiser damage (rough: 97 against 162, over the sweep's 30 per cent rule; steady 36 per cent; sharp 13).

**Words.** Nothing becomes untrue: "Enter the ring", "Hold 20 seconds", "Keep aliens off", "Aliens arrive fast"; no line changed in this card.

**Pins.** `tests/camprelicwaves.mjs` (18 checks): the second wave at 10 s held, the third 8 s behind it from the opposite side; the pilot who never aims now loses (he won); a cruiser alone loses at least 3 seeds of 4. `tests/campaign.mjs`: the rows' triggers are the hold or "behind". `tests/camppace.mjs`: words only (the 60 s floor holds).

## Missions 2.1 and 2.2: the aliens come on what the player does, and a threat comes to a player who does nothing (card `space-game-b7-level2`; Troy, 26 Nov 2026: "yes", with his calls below; the cloud's brief 7, decisions 1 and 6; base `b14a4131`, the 2.3 two-sides tip)

**What was wrong.** 2.1's one wave came at 20 s and 2.2's two at 18 and 40 s of the mission's clock, so a quick player never met 2.2's reinforcements (the plain bot won 2.2 in 73 s, the cruiser took 153), and a player who only waited was never touched in 2.1: it ended in nothing (the tool's idle bot never arrives, so it shows 0 won, 0 lost).

**2.1 Resources** (`src/campaign.js`, wave rows with `on: { caches: n }` and `at: 'cache'`; a mission row's `hunt`, `campHunt`):
- **Troy's call: it keeps TWO caches** (not three), so "Gather two resource caches." and the briefing's "Find 2 of the 3 resource pods" stay true. Par stays 100 s.
- **The first cache taken calls the group** (the old wave's 4 raiders and 3 drones) to the nearest cache still to take, where it waits (a guard: it wakes when a ship of yours is in reach). The mission also needs that group dead (`{ type: 'kill', what: 'wave:all' }`, words "Destroy the attackers.").
- **The threat for a player who takes no cache** (Troy: yes): 45 s after arriving, a party of 3 raiders and 2 drones comes from the west for the cruiser; another every 45 s, each 2 ships larger (5 and 3, 6 and 4 ...), with no upper limit; a cache taken stops them for good. Ship kinds and hit points are as they are. A party must be dead to win.

**2.2 The guards** (wave rows with `on: { guardsDead: n }`; `hunt` with `restart: 'guard'`):
- **Reinforcements when the fourth guard dies, from two sides at once** (the old first wave's ships split in two: 2 drones and 2 gunships from the north-east, 2 drones and a gunship from the other side); **the last guard calls a second group** (the old second wave's ships, 4 raiders and 3 drones) when the sixth guard dies, with one left. No ship was added or taken away. The mission needs the guards AND the groups they call dead.
- **The threat for a player who kills no guard** (Troy: yes): 40 s after arriving with no guard dead, a patrol of 2 drones and a gunship from the north-east; another every 40 s, each 2 ships larger; a guard killed starts the 40 s again; the patrols are not guards (they do not count for the fourth guard) and must be dead to win; none comes once the guards are all dead.
- The bots now fly at waiting guards and at the groups a cache or a dead guard calls (`tools/campaign-bot.mjs`: no clock brings the fight to a cruiser that sits); that is why the no-wing "carrier" bot wins 2.2 on every seed now (59 and 66 per cent before: it was only ever fed by the clock's waves).

**The numbers** (`node tools/campaign-bot.mjs --level 2 --mission <1|2> --seeds 32 --bots plain,carrier,ace,sit --skill <s>`; won per cent / seconds / cruiser damage / kills; hull 600 at the end except where said):

| mission | skill | bot | before (`b14a4131`) | after |
|---|---|---|---|---|
| 2.1 | steady | plain | 100 / 42 / 15 / 7 | 100 / 33 / 13 / 7 |
| 2.1 | steady | carrier | 100 / 43 / 15 / 7 | 100 / 33 / 15 / 7 |
| 2.1 | steady | ace | 100 / 43 / 0 / 7 | 100 / 32 / 9 / 7 |
| 2.1 | steady | sit | 100 / 43 / 17 / 7 | 100 / 33 / 15 / 7 |
| 2.1 | rough | plain | 100 / 42 / 17 / 7 | 100 / 33 / 15 / 7 |
| 2.1 | rough | carrier | 100 / 43 / 13 / 7 | 100 / 33 / 13 / 7 |
| 2.1 | rough | ace | 100 / 42 / 0 / 7 | 100 / 32 / 13 / 7 |
| 2.1 | rough | sit | 100 / 43 / 9 / 7 | 100 / 33 / 15 / 7 |
| 2.2 | steady | plain | 100 / 73 / 153 / 16 | 100 / 76 / 162 / 21 |
| 2.2 | steady | carrier | **59** / 92 / 265 / 21 | 100 / 85 / 216 / 21 (hull 597) |
| 2.2 | steady | ace | 100 / 81 / 130 / 21 | 100 / 72 / 112 / 21 |
| 2.2 | steady | sit | 100 / 79 / 167 / 15 | 100 / 80 / 182 / 21 |
| 2.2 | rough | plain | 100 / 76 / 144 / 17 | 100 / 76 / 147 / 21 |
| 2.2 | rough | carrier | **66** / 95 / 257 / 21 | 100 / 86 / 208 / 21 |
| 2.2 | rough | ace | 100 / 76 / 104 / 21 | 100 / 68 / 75 / 21 |
| 2.2 | rough | sit | 100 / 79 / 153 / 15 | 100 / 81 / 165 / 21 |

- **About as hard as today for the cruiser bots:** 2.1 is as easy as it was (about 33 s, was 42: the group is smaller than the clock's wave was a trip behind it; damage 9 to 15); 2.2 is the same length (68 to 86 s against 73 to 95) with the cruiser's damage at or above what it was (112 to 216 against 130 to 265), and now every bot meets all 21 ships (the plain bot met 16, the sit bot 15).
- **Not met, for Troy: the fighter bot in 2.2.** Against the plain bot the ace bot is 5 per cent faster and takes 31 per cent less cruiser damage at steady skill, and 11 per cent faster and 49 per cent less at rough (75 against 147). The sweep's rule is 15 per cent faster and 30 per cent less (docs/night/cockpit-sweep.md): the damage is over it at both. Before this card it was 15 per cent less at steady (130 against 153) and 28 per cent at rough (104 against 144). Why: the two reinforcement groups come on the fourth dead guard, which a flown fighter kills early, while the plain bot's cruiser takes the groups' fire as it arrives. No hit-point or damage number was changed; Troy to say whether to leave it.
- **The idle player** (flown in the sim: the cruiser arrives, sits at the mission's place and brakes, its wing guarding; 8 seeds, 600 s). 2.1: before, neither won nor lost on any seed; now **lost on 8 of 8 at 281 to 356 s** (6 to 7 parties came; none is in 33 s of any bot's play). If it also fires at what comes near, it holds out the 600 s against 13 parties of up to 29 ships (the cruiser's guns beat each party as it comes). 2.2: before, a cruiser that does not fire was beaten by the guards in 46 to 65 s and one that does won on 8 of 8; now it is beaten in 70 to 96 s, and one that fires won 6 of 8 (the other two ended with no result at 600 s: the sim's sitter does not fly at aliens beyond 1,200 px, so what lost its target waits unseen; a player flies). In 2.2 the patrols never came in these runs because the wing killed a guard inside every 40 s; the guards themselves are the threat to a sitter there.
- **The tool's own idle bot** still shows 0 won and 0 lost on both: it never makes the trip to the mission's place, so nothing is called. Not changed.

**Words** (Troy approved both new lines, 26 Nov: shown only, not voiced): `camp.bf.2.1.w3` "Aliens come from the west after 20 seconds." is now "Taking the first pod calls aliens to the next one."; `camp.bf.2.2.w2` "More aliens join after 18 seconds, from the north-east." is now "More aliens join when the fourth guard dies, from two sides." Left as they were and still true: `camp.m.2.1.b1` "Gather two resource caches." (a voiced line), `camp.bf.2.1.w1`, the moments "Find two caches", "Anyone can collect", "Aliens from west" (true again for the hunting party, which comes from the west), "Kill them all", "Reinforcements", "Clear them all". Nothing voiced changed.

**Pins.** `tests/camplevel2calls.mjs` (new, 20 checks: the rows, nothing for the clock, a cache and a dead guard call their groups, the sides, the win needs the groups dead, the hunting party and the patrol with their numbers, the triggers). `tests/campaign.mjs` (2.1's wave comes on the first cache, not at 20 s; the guards alone no longer win 2.2), `campgoalcount.mjs`, `camphunt.mjs` (2.2's reinforcements are two rows and one line), `camplevel2words.mjs`, `scrbriefings.mjs` (the reinforcements are called by the fourth guard), `campbrief.mjs` (the two reworded lines). The bot's tool rule: guards and called groups are flown at.

## The flown fighter fires three times as fast, at half the damage (card `space-game-fly-fighter-fire-rate`, Troy, 26 Nov 2026; base: main at the landing of the cockpit's scene half)
Troy flew a pilot's fighter (C key, `src/campcockpit.js`) and liked it; the first thing he asked for: the fire rate is too slow. The pilots' gun is 8 damage every 450 to 650 ms (14.5 a second); the Long Haul Wren fires every 160 ms for 15 (94 a second, which equals the whole wing).
- `CAMP.cockpit.rateK: 1 -> 3`: one shot every mean delay over it, a steady 183 ms (550 / 3), no random gap, on a schedule of one gap so the rate does not depend on the tick (at 30 ticks a second a shot lands on the tick after its time: gaps of 167 to 200 ms, 27 shots in five seconds).
- `CAMP.cockpit.damageK: 1 -> 0.5`: each shot 4 damage (times the pilot's strength). The stream is 22 a second, about 1.5 times a pilot's and under a quarter of the Wren's. To land on exactly 170 ms (the Wren's feel) dial `rateK` to 3.25 on the N panel: 169 ms, 24 a second.
- Both are live rows of the group "The flown fighter (C)" on the N panel (`cockpitrate`, `cockpitdamage`, step 0.25). `CAMP.fighter` (the pilots' own guns: 8 damage, 450 to 650 ms, 700 px/s, 420 range) is untouched: the AI pilots fire as before.
- **Sound and flash** (`src/campaignscene.js`, `cockpitShot`): the flown gun's shot is its own case in the scene. Before, it went through the wing's rule (a pew softer the farther from the cruiser, none past 1,600 px, one in 55 ms shared with every pilot), so a fighter flown 2 km out was silent and the pilots' shots could swallow it. Now: the wing's own soft pew (`sfx('wingShot')`, random 6 percent detune each shot) at 0.7 whatever the distance, at most one in `CAMP_SND.cockpit` = 100 ms of the battle's clock (at 183 ms every shot sounds; dial the rate past 5.5 and it plays every other one, a stream and not a buzz), and one small flash at the nose per shot (the 'ember' image, 11 px ahead, the friend blue, 0.45 scale, gone in 60 ms: two alive at most). No new sound is made.
- Pinned by `tests/campcockpitfire.mjs` (the rate and its steadiness, the damage, the AI pilots' unchanged, the scene's pew and flash), `tests/campcockpit.mjs` (the defaults) and `tests/campsounds.mjs` (the table line). The cockpit sweep was run again with these defaults: `docs/night/cockpit-sweep.md`.

## Mission 2.2: the called groups and the patrols go for the cruiser (card `space-game-chunk16-22-fighter-gap`; ORCH, 26 Nov 2026 night: option 2; base `654702eb`)

**Why.** In 2.2 the flown-fighter (ace) bot took 31 to 49 per cent less cruiser damage than the plain bot (rule: 30). I measured where it comes from (12 seeds, rough, damage by phase, plain against ace): before the fourth guard 31 against 13, after the reinforcements 24 against 9, after the sixth 122 against 78: lower in every phase, so it is not when the groups arrive (a clock floor would move it by about 5 s: the ace's first group comes at about 19 s, plain's at about 24 s) but the fighter's own gun, and a fighter that flies past or hits a group draws it off the cruiser.

**What changed** (`src/campaign.js`): a wave row's or a hunt's `focus: 'carrier'` (campAlienAI): the aliens of a group so marked go for the cruiser and are not drawn off by a ship of yours that flies by or hits them. On the three wave rows and the patrol of 2.2 only (the guards, and every other mission, are as they were). No hit-point, damage, ship or timing change.

**The numbers** (12 seeds; won per cent / seconds / cruiser damage; 100 per cent won everywhere):

| skill | bot | before (`654702eb`) | after |
|---|---|---|---|
| steady | plain | 74 / 161 | 74 / 182 |
| steady | carrier | 88 / 193 | 88 / 193 |
| steady | ace | 74 / 104 | 71 / 127 |
| steady | sit | 75 / 182 | 74 / 198 |
| rough | plain | 75 / 165 | 73 / 170 |
| rough | carrier | 86 / 208 | 86 / 208 |
| rough | ace | 65 / 81 | 63 / 93 |
| rough | sit | 81 / 164 | 74 / 173 |

- Ace against plain, damage: steady 35 per cent less before, **30 per cent after** (127 against 182); rough 51 per cent less before, **45 per cent after** (93 against 170). The rule (docs/night/cockpit-sweep.md) is 30. Time: ace 0 to 4 per cent faster at steady (rule 15), 14 per cent at rough (63 against 73).
- **Not closed:** at rough the ace still takes 45 per cent less. The rest is the flown fighter's own gun (the same 12 seeds with the guards also going for the cruiser: 182 against 114, 37 per cent less): the fighter is better in 2.2, as intended; for Troy to judge in play.
- The wing's pilots under the cruiser's orders do not change (carrier and the plain bot keep their numbers within noise).

**Pins.** `tests/camplevel2calls.mjs` (22 checks): the rows carry the flag, and a raider with a fighter on its far side that has just hit it still flies at the cruiser while the same raider without the flag is drawn onto the fighter.

## Level 3 comes on what the player does (card `space-game-b7-level3`; brief 7 decisions 1, 3, 5 and 6; Troy said yes to all of it on 26 Nov 2026)
Base: main at the landing of the flown fighter's fire rate (`rateK` 3, `damageK` 0.5, `hpK` 2, turrets 'auto'); old tables from main just before the card (`e0bee48d`, the level 3 sim identical), new from the card's branch. Every number of the waves is a first try, measured with the bots: 32 seeds a mission, skill steady, pace Brisk; `node tools/campaign-bot.mjs --level 3 --seeds 32 --bots idle,carrier,plain,troy --json` for the cruiser bots, `--max 900` for the idle ones, `--cockpit --level 3` for the fighter bots.

**What changed (the table, `src/campaign.js`):**
- 3.1 *Approach*: three waves, one for each scan (`on: { scanning: k }`: a ship of ours is in the ring): 2 raiders; 2 raiders, a drone and a gunship; the same again. A scan stands still while the cruiser is hit and goes on 2 s after (`pause: 2` on the scan objective; the points stay 7 s: the briefing says 7). The mission wants every wave beaten (`clear`).
- 3.2 *Outer ring*: three groups, one for each of the first three towers to fall (`on: { towers: k }`), each born 700 px behind the tower nearest the cruiser (`nearTower`): 2 drones; 2 drones and a gunship; 2 raiders and a gunship. `clear` too. (The wave of 25 s is gone.)
- 3.3 *Inner ring*: two waves together at the fourth tower (`on: { towers: 4 }`): 2 raiders and 2 gunships from the north-west, 2 drones and 2 gunships from the south-east; `clear`; par and the swift bonus 150 to 180 s. (The waves of 20 s and 75 s are gone.)
- `CAMP.tower.flownTurn` 1.5 and `flownSpeed` 1.3: a tower turns and shoots faster at the ship the player flies (`campTowerAI`); the cruiser's own game is as it was.
- The idle threats (3.1 the picket, 3.2 the reserve), below.

**The cruiser bots** (won% / win time s / hull left / damage taken; median of 32): the plain bot and the carrier bot (the carrier bot never launches the wing).

| mission | bot | old | new |
|---|---|---|---|
| 3.1 | plain | 100 / 69 / 900 / 19 | 100 / 80 / 900 / 65 |
| 3.1 | carrier | 100 / 70 / 900 / 59 | 100 / 85 / 900 / 81 |
| 3.2 | plain | 100 / 44 / 900 / 162 | 100 / 59 / 870 / 230 |
| 3.2 | carrier | 100 / 82 / 670 / 461 | 100 / 72 / 695 / 407 |
| 3.3 | plain | 100 / 61 / 667 / 436 | 100 / 71 / 623 / 486 |
| 3.3 | carrier | 100 / 56 / 626 / 461 | 100 / 78 / 508 / 608 |

3.1 is about four times as hard in damage (the brief: "three scans with almost no opposition: 12 damage in the whole mission"), 3.2 about 40 percent, 3.3 about 10 percent; every mission is still won by every cruiser bot, every seed. 3.2's carrier bot is a little easier and quicker (72 s against 82); I did not find out why (probably the groups come to it by the tower it is shooting at).

**The idle player** (the idle bot gives no order at all; the passive bot is Troy's first try: it launches the wing at 45 s, escorts at 81 s and never attacks; 900 seconds of play; won% / lost% / timed out%):

| mission | bot | old | new |
|---|---|---|---|
| 3.1 | idle (does nothing) | 0 / 0 / 100 | 0 / 78 / 22 |
| 3.1 | passive (launches, never attacks) | 0 / 0 / 100 | 0 / 0 / 100 |
| 3.2 | idle (does nothing) | 0 / 0 / 100 | 0 / 9 / 91 |
| 3.2 | passive (launches, never attacks) | 0 / 0 / 100 | 0 / 0 / 100 |
| 3.3 | idle (does nothing) | 0 / 6 / 94 | 0 / 0 / 100 |
| 3.3 | passive (launches, never attacks) | 63 / 0 / 38 | 0 / 0 / 100 |

3.1 and 3.2 can be lost by an idle player now: **the picket** (no scan begun 60 s after arrival: 3 raiders and a gunship come for the cruiser, another every 40 s until a scan begins, four at most) and **the reserve** (no tower fallen 45 s after arrival: 2 drones and 2 gunships, same rhythm). The idle bot loses 78 percent of 3.1 in fifteen minutes (66 percent in seven) and 9 percent of 3.2; the passive bot, who launches the wing, is hurt (113 damage in 3.1, 396 in 3.2) and neither wins nor loses. The reserve is weaker against the pilots; to make 3.2 lose more often, give it a third gunship or a fifth group. **3.3 has the old problem the other way round:** its waves now wait for the fourth tower, so an idle player is never found (the old clock lost 6 percent of the idle runs) and the passive bot no longer wins (63 percent before: the waves used to come to it). A third idle threat there would be the same mechanism (`on: { idle: s, until: 'tower' }`).

**The fighter bots** (`--cockpit`, `hpK` 2, `damageK` 0.5, `rateK` 3; win time s / cruiser damage; the rule is `docs/night/cockpit-sweep.md`'s): old = main before the card, new = the card's branch.

| mission | skill | plain old | plain new | ace old | ace new (and kills) | sit new won% | rule |
|---|---|---|---|---|---|---|---|
| 3.1 | sharp | 69 / 31 | 79 / 78 | 74 / 9 | 82 / 47 / 1 | 100 | FAIL -> FAIL |
| 3.1 | steady | 69 / 19 | 80 / 65 | 71 / 9 | 76 / 47 / 2 | 100 | PASS -> PASS |
| 3.1 | rough | 69 / 21 | 81 / 68 | 66 / 0 | 67 / 12 / 5 | 100 | PASS -> FAIL |
| 3.2 | sharp | 44 / 144 | 59 / 245 | 44 / 54 | 60 / 173 / 1 | 100 | FAIL -> PASS |
| 3.2 | steady | 44 / 162 | 59 / 230 | 44 / 54 | 60 / 166 / 1 | 100 | FAIL -> PASS |
| 3.2 | rough | 44 / 144 | 60 / 238 | 30 / 36 | 46 / 151 / 3 | 100 | FAIL -> FAIL |
| 3.3 | sharp | 55 / 468 | 70 / 544 | 60 / 353 | 79 / 522 / 1 | 100 | PASS -> PASS |
| 3.3 | steady | 61 / 436 | 71 / 486 | 59 / 378 | 74 / 468 / 2 | 100 | PASS -> PASS |
| 3.3 | rough | 60 / 436 | 70 / 443 | 51 / 270 | 68 / 396 / 3 | 100 | FAIL -> PASS |

**6 of 9 mission-skills pass the rule (was 4).** Fixed: 3.2 sharp and steady (the ace took a third of the plain bot's damage because a tower could not track a fast fighter: now 166 against 230) and 3.3 rough. Still failing: 3.1 sharp (ace 47 damage against plain's 78: probably the fighter meets each wave before it reaches the cruiser), 3.1 rough (67 s against 81, and 12 damage against 68: probably with no hit the scan never stands still, so the fighter's cover makes the scans quicker), 3.2 rough (46 s against 60: probably three times the rate shoots a tower down quickly). The rough skill is the ace's widest cone; at sharp and steady the rule holds in 3.2 and 3.3 and in 3.1 steady. What might move the rest (not tried): a second 3.1 wave that comes to the cruiser from the far side (a fighter cannot meet both), or fewer scan pauses. Not done: Troy agrees the rule before any retune.

**Briefing lines made untrue, then reworded (card `space-game-l3-briefing-words`; they are shown-only, none is voiced):** 3.1 "Aliens answer your first scan." is now "Aliens answer each scan."; 3.2 "More aliens arrive after 25 seconds, from the north-east." is now "Each tower that falls calls a group to the next one."; 3.3 "Two waves come: at 20 seconds and at 75." is now "Two waves come together when the fourth tower falls." The allowance in `tests/campbrief.mjs` for the old numbers is gone.

Pinned by `tests/campl3waves.mjs` (39 checks: the cues, the scan pause, the groups, the two waves, the flown-fighter factors, the idle threats), `tests/campaign.mjs` and `tests/campbrief.mjs` (the moved pins).

## 3.3: the fighter clears the towers on one side so the cruiser comes in from there (card `space-game-fighter-job-33`; Troy, 26 Nov 2026: yes, BRIEF 8 proposal C; base main `a3fe84f1`)

**What was in the way.** The fighter could never clear a tower: 3.3's towers have 480 hit points and the flown fighter's gun deals 4 a shot at a shot every 183 ms (22 a second): about 22 s of fire for one tower, while a tower kills the fighter's 72 hull (Troy's double) in three hits. So the rule is about the fighter's gun against a tower, nothing else.

**The rule** (`CAMP.cockpit.towerK`, applied where a shot hits, `campBullets`): the fighter the player flies deals **three times** its damage to a TOWER: 12 a shot, 36 a second, one tower in about 7 s of fire. Its shots at anything else, the wing pilots' shots and the cruiser's are as they were. The fighter's hull stays at Troy's double (`hpK` 2); no tower number changed. The gap itself needs no code: 3.3's eight towers stand 765 px apart on a ring at 1,000 px and each reaches 800, so a ring point is under the guns of three of them; with the two nearest dead it is under one (pinned).

**The numbers** (12 seeds, 3.3; won per cent / seconds / cruiser damage; 100 per cent won everywhere):

| skill | bot | before | after |
|---|---|---|---|
| steady | plain | 70 / 461 | 70 / 461 |
| steady | carrier | 76 / 569 | 76 / 569 |
| steady | ace | 73 / 450 | 74 / 457 (one pilot's fighter lost in the 12 runs) |
| steady | sit | 77 / 536 | 77 / 536 |
| rough | plain | 68 / 410 | 68 / 410 |
| rough | carrier | 76 / 504 | 76 / 504 |
| rough | ace | 68 / 378 | 59 / 320 |
| rough | sit | 76 / 522 | 76 / 522 |

- Ace against plain: steady 1 per cent less damage, 4 per cent slower (74 against 70); rough 22 per cent less damage and 13 per cent faster (59 against 68). The sweep's rule is 15 per cent faster and 30 per cent less damage: inside it at both.
- Why not a higher factor: at 2 the rough ace was 59 / 288 (30 per cent less than plain: at the rule's edge); at 3, 59 / 320. The cruiser bots do not change at any value (they never fly the fighter at a tower).

**Pins.** `tests/campfightergap.mjs` (5 checks: the number is 3; a flown shot deals 30 for 10 to a tower, a wing pilot's 10, and at 1 the flown one 10; against a raider the flown shot deals 10 as a wing pilot's does; one 3.3 tower takes about 7 s of fire (5 to 9); the gap: a ring point is under three towers and under one once the two nearest are dead).
