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
| `]` | skip to the next level (the tech this level would have given is picked for you, the first it offers) |
| `\` | win this level: the story and the tech pick that follow a win are shown |
| `[` | lose this level |
| `` ` `` | god mode on and off: the carrier takes no damage and Earth's shield does not fall |

They are listed in one small line on the pause screen (`campDebugLine`). The rows are the data table `CAMP_DEBUG` at the top of `src/campdebug.js`: change a key there, one line.

## The numbers: one table

`CAMP` at the top of `src/campaign.js`, one line a number, a comment on each. Units: px, px/s, seconds for the times written in a level, milliseconds for a delay.

| To make it | Change |
|---|---|
| easier on the carrier | `carrier.hull` up, `carrier.speed` up, the `shield` tech's `taken` down (0.6 is 40 percent less damage) |
| easier on Earth | `earth.shield` up, `alien.earthDamage` down |
| a bigger wing | `bay.fighters`, `bay.escorts`; `fighter.damage` up, `fighter.hp` up |
| weaker or stronger aliens | `alien.hpScale` and `alien.damageScale` for all of them; `mother.hp` for the mothership |
| a bigger wave | `levels[n].waves[i].ships` (`raider`, `drone`, `gunship`) |
| stronger or weaker missiles | `missile.big` (the mothership, towers, gunships), `missile.small` (the rest), `missile.blast` |
| more or fewer missiles | `missile.magazine` (the start and the reload's full), `missile.reload` (ms for one to come back), `missile.max` (the most ore can fill it to) |
| easier or harder to aim | `missile.turn`, `missile.speed`, `missile.lock` (how far it can pick a target), `missile.fuze` |
| the turrets hit harder, reach further or fire faster | `carrier.pd` (damage of one shot), `carrier.pdRange` (px), `carrier.pdDelay` (ms between a turret's shots); eight turrets means 8 times `pd` over `pdDelay`; `tech.beam` for the beam tech |
| promoted sooner or later, a bigger or smaller wing at a rank | `ranks[i].at` (the points a rank is held from), `ranks[i].fighters`, `ranks[i].escorts` (its extras to the bay and the wing limit); the points are the sum of the best mission scores (`score.*` for what a mission is worth); `node tools/campaign-bot.mjs --rank 5` to see the effect |
| the wing orbits tighter, stands off farther, keeps a wider formation | `stance.orbit` (px), `stance.orbitSpeed` (rad/s), `stance.stand` (share of the gun's range), `stance.weave` (px/s of sidestep while it keeps the range), `stance.formation` (px of the ring round the carrier), `stance.leash` (px a held ship lets the carrier go before it comes back) |
| the turrets fire as one volley, or as a rattle | `carrier.stagger`: 1 gives each turret its own slot in the cycle, 0 puts all eight on one beat; `carrier.jitter` (ms of random on each slot; under half of `pdDelay` over the turret count). The shots a second are `8 / pdDelay` either way. Their sound and flash: `CAMP_BLIP` at the top of `src/campaignscene.js` (the least gap between blips, the flash time, pitch, length, loudness) |
| the turrets miss moving ships (or hit too well) | `carrier.lead`: 1 aims where the shot and the alien meet, 0 where the alien is now, 0.5 half way; `carrier.pdSpeed` (a faster shot needs less lead) |
| more or fewer turrets, or somewhere else on the hull | `carrier.mounts`: one `[x, y]` row each, px from the carrier's centre in its own frame (x along the nose); the hull is drawn 98 by 70 px; a turret has to lie on it |
| your ships bigger or smaller | `size`: one row each for the carrier, the fighters and the escorts, the drawn length in px (`len`, the picture is scaled to it) and the hit circle's radius (`hit`); the turret mounts, `bay.mouth` (where a launched ship appears) and `bay.dockAt` (how near a recalled ship lands) are sized for the hull as drawn, so move them with it |
| a faster or slower level | `waves[i].at` (seconds into the level), `early` (seconds after the wave before is dead), `convoys[i].at` |
| the map | `places` (px from Earth); the Sol distances are `docs/SOL.md` at 1 to 12 |
| who an order reaches, what it takes as a target, what a right-click does | `wing.groups` (a name and a list of kinds), `wing.verbs[v].kinds` (the targets a verb takes) and `.group` (who it addresses when none is named), `wing.smart` (the verb of a right-click on each kind of target), `wing.holdAt` (px a held ship is "there") |
| the pirates: how hard, how fast, what they go for, when they run | `pirate.kinds` (`skiff`, `cutter`, `brute`: `base` the PIRATES row it flies like, `hp`, `dmg`, `ore` its wreck holds, `color` its mark), `pirate.prey` (the weight of each kind of ship: the least distance times weight is attacked), `pirate.breakHp`, `pirate.run`, `pirate.runMin`, `pirate.gone`; a wave row's `prey`, `breaks`, `breakOn`, `breakAt` |
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

`CAMP.outpost` has the numbers; each level lists its outposts (`CAMP.levels[n].outposts`); `docs/CAMPAIGN.md` says the rules. `range` 280 px (how near the edge of an outpost's place the carrier must be to dock: Earth to the Lunar base is 275 px between middles, so the start of the Earth level is docked-ready), `clear` 900 px (no alien this near: the doors stay shut), `repairOre` 60 (a whole hull from nothing; a part costs its share, at least 5), `retreatHull` 0.35 (the share of the hull under which, with no ship left, the HUD says where to retreat), `fabricator` 120 ore (the store holds 200). The retreat's seconds are the map's own Fast time (`campNavEta(C, dist, true)`), so they change with `CAMP.nav.fast` and `farFast`.

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
