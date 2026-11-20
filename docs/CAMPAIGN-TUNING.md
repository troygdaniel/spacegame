# Tuning the Campaign

Card `space-game-campaign-tune`. Troy plays the Campaign to feel out how it plays and where the story goes, so it has a kit: start at any level, debug keys, one table of numbers, and a play log of what he did. None of it touches Long Haul. Plain Node tests: `tests/campaigntune.mjs`, `tests/campaignaddr.mjs`, `tests/playlog.mjs`.

## Start at any level: the address

    index.html?campaign=2                       the Campaign at level 2 (a bare ?campaign is level 1)
    http://127.0.0.1:8787/?campaign=3&tech=beam,plating     level 3, with these techs

You start with the techs a player would have by then (the first one each earlier level offers); `&tech=a,b` names them instead (ids from `CAMP.tech`: shield, beam, blink, plating, bay2, repair). A wrong level (`?campaign=9`) or a tech that is not there is answered with a plain line and the game starts as it always does. The parser is `src/campaignaddr.js` (`campaignAddr`, `campAddrPlan`); the number of levels is the level table's, so a level added to `CAMP.levels` can be asked for at once.

## Debug keys (in the Campaign only)

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
| the turrets fire as one volley, or as a rattle | `carrier.stagger`: 1 gives each turret its own slot in the cycle, 0 puts all eight on one beat; `carrier.jitter` (ms of random on each slot; under half of `pdDelay` over the turret count). The shots a second are `8 / pdDelay` either way. Their sound and flash: `CAMP_BLIP` at the top of `src/campaignscene.js` (the least gap between blips, the flash time, pitch, length, loudness) |
| the turrets miss moving ships (or hit too well) | `carrier.lead`: 1 aims where the shot and the alien meet, 0 where the alien is now, 0.5 half way; `carrier.pdSpeed` (a faster shot needs less lead) |
| more or fewer turrets, or somewhere else on the hull | `carrier.mounts`: one `[x, y]` row each, px from the carrier's centre in its own frame (x along the nose); the hull is drawn 140 by 100 px |
| a faster or slower level | `waves[i].at` (seconds into the level), `early` (seconds after the wave before is dead), `convoys[i].at` |
| the map | `places` (px from Earth); the Sol distances are `docs/SOL.md` at 1 to 12 |

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

## The play log

Every level is in the play log (`docs/PLAYLOG.md`, the `campaign` event): the level, how it began (menu, address, next, retry or skip), the waves, each order and how it was given (key, strip, voice, click) and whether it worked, each ship lost, the tech picked, each debug key, and the end (win, lose, quit or skip, why, the wave reached, the ships lost, the hull left, the seconds). `node tools/playlog-summary.mjs` prints a **Campaign** block, one line a level. A level the tab closes on is ended as quit.

## For the scene

What the Campaign scene calls (none of it draws, all of it is plain data and functions):

- `campNew(level, techs, { via })`: `via` is `'menu' | 'address' | 'next' | 'retry' | 'skip'`, for the log. `campOrder(C, name, arg, how)`: `how` is `'key' | 'strip' | 'voice' | 'click'`, for the log.
- Title: `const plan = campAddrPlanPage()`; a plan with a `level` starts the Campaign scene with it (`{ level, techs, via }`); a plan with only `say` shows that line and the title goes on.
- Every key: `const id = campDebugKey(e.code); if (id) { const r = campDebugRun(this.C, this.P, id); show(r.say); if (r.go) start r.go.level with r.go.techs }`.
- Pause screen: `campDebugLine(C)`.
- The play log needs nothing else: it watches `campNew`, `campStep`, `campOrder` and `campPick` from outside (`playlogWrap`) and `campDebugRun` says its own steps (`campaignNote`).
