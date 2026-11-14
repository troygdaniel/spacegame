# Long Haul: the big universe (design and build plan)

Design by DreamBot, 2026-11-13, for card `space-game-universe-design`. This is a plan, not code. It says what we build, the numbers to start from, the data shapes, and a list of small cards that can merge one at a time without ever breaking the game.

Troy's decisions (from the card) and where they land:

| # | Troy said | Section |
|---|-----------|---------|
| 1 | Three speeds: local, in-system fast travel, star-to-star hyperspace | 2 |
| 2 | Hyperspace is a watched tunnel; travel time follows distance and fuel; pick a target on a galaxy map, charge, jump | 2, 3, 9 |
| 3 | Fuel bought at stations, cheap but a real decision | 3 |
| 4 | At least 8 systems, more cheap (seeds), diverse, some with no station | 4 |
| 5 | Pirates sometimes pull you out of fast travel or hyperspace | 5 |
| 6 | Six ships, a fleet, switch at a station hangar | 6 |
| 7 | Parts with tiers in slots (engine, shields, weapons, fuel tank, cargo) bought at stations | 7 |

## 1. What we start from (read from the code, 2026-11-13, main 4910a0b)

- One sector, hard-coded: `Space.create` sets `WS = 8000`, Halcyon Station at (4000, 4000), Kepler-4b at (6200, 2000) radius 316, the belt in `asteroids.js` (`BELT`), four wrecks and random signals in `poi.js` (`POI`), Kestrel Outpost in `stationart.js` (`SA_OUTPOST`, scenery only), the MULE gate in `missions.js` (`GATE`), the map in `map.js` (`SECTOR`). Pirate type comes from the distance to the station (`pirateTypeFor`).
- One ship: texture `ship`, redrawn by `shipRefresh()` from `G.upgrades` (`armor`, `rapid`, `booster`, tiers 0 to 2, prices in `shop.js` `UPGRADES`). Flight numbers are in `space.js` and `boost.js` (top speed 480, boost 800 to 1150, thrust 720, boost energy 100 to 165).
- Save: `meta.js`, localStorage key `longhaul.save.v1`, `snapshot()` / `loadGame()`. Loading always wakes you at the station.
- What we keep and build on: the mission board and the four missions, the repair bay (half a credit a point), the shop and the bar, ore and the cargo hold (`ORE_CAP` 10), salvage sites, the three pirate types and the Reaver, civilians and police, the HUD (v2) and the Tab map.

The biggest cost of this whole plan is the hard-coded sector. The first cards turn it into data without changing how it plays (section 10, phase A).

## 2. The three speeds

| | LOCAL | CRUISE (in-system fast travel) | HYPERSPACE |
|---|---|---|---|
| Where | around a station, planet, belt, wreck | between bodies of one system | between star systems |
| How | W A S D, as now | pick a destination (N), press C | galaxy map (G), pick a star, Enter, charge, jump |
| Speed | top 480 px/s, boost 800 to 1150 (ship stats, section 6) | 6000 px/s (12 times local), automatic | none: you watch the tunnel |
| Time | as now | 4 to 9 s a leg, in a 36 000 px system | 1.6 s per light year (6 to 30 s) |
| Fuel | none | none | distance (ly) times the ship's fuel per ly |
| Combat | everything | none; can be interdicted (section 5) | none; rare pull-out (section 5) |

### 2.1 Local flight
Unchanged. The only difference is that the numbers (top speed, thrust, turn, boost) come from the active ship (section 6) instead of constants.

### 2.2 Cruise
Systems become big: 36 000 px square by default (48 000 for empty wilds). Halcyon keeps its current cluster (station, Kepler-4b, belt, wrecks) exactly where it is in the north-west corner (coordinates 0 to 8000), so no existing mission or test moves; the rest of the system is new space with new bodies (a far moon, Kestrel's gas giant and so on). Station to Kepler-4b is 6 s at full local speed; a 36 000 px system is 75 s edge to edge. Cruise is what makes that bearable.

- Press **N**: the nav list. Every body you know (stations, planets, belts, found signals), sorted by distance, each with distance and cruise ETA. Enter picks one: it becomes the target (the amber objective arrow of the HUD points at it; the radar edge arrow stays as is).
- Press **C** with a target and clear space: cruise engages. The ship turns toward the target by itself (A and D nudge it, S cancels), speeds up at 4000 px/s2 to 6000 px/s, and slows down by itself so it arrives about 900 px from the body at under 150 px/s, then drops out into local flight. The speed limit is `min(6000, 3 x (distance - 900))`, which is what stops you flying through a planet.
- It will not engage inside 2500 px of a station or planet ("too close to the mass: fly clear") or with a hostile within 1500 px ("hostiles near").
- Cruise costs no fuel. Fuel is for jumps (decision 3). Cruise exists to save the player's time, so it must never become a chore.
- A typical leg: 30 000 px = 1.5 s of acceleration, about 3.5 s of flat out, 1.5 s of braking: 6.5 s.
- Trip legs cross empty space on purpose: that is where interdiction happens (section 5) and where the scenery shows.
- Look: the speed streaks that boosting already uses (`installLookFx` in `title.js`) at full strength, the camera eases out to 0.85 zoom, a cyan edge vignette, the speed readout switches from px/s to a "km/s" style number, the radar dims (nothing local matters). Detail in section 9.

### 2.3 Hyperspace
- **G** opens the galaxy map (section 4.3): known stars, links within the ship's jump range, the cost of each. Pick a star, Enter.
- **Charge**: 4 s. A ring fills round the ship, the engine whine rises, the camera creeps in; Esc, S or taking damage cancels. You cannot start a charge inside 2000 px of a station or planet, or with a hostile within 1500 px.
- **Tunnel**: the `Hyper` scene (new). Seen from above like the rest of the game: the ship points right at the middle of the screen, star streaks rush past it to the left, glowing rings (gates) come out of the distance, past the ship and away behind it, colour bands twist along the path, a light bleeds from the nose, a soft shake. A readout shows destination, time left and fuel burned. Nothing to do, everything to look at. It lasts `ly x 1.6` seconds, clamped 6 to 30 s. The knob is `HYPER.secPerLy`.
- **Arrival**: the `Space` scene of the new system, the ship at the system's entry point (the edge facing the star you came from, so jumping from the west puts you at the west edge), moving at 500 px/s toward the middle, hostiles held off for 3 s.
- Fuel is spent when the charge completes, not at arrival: a pull-out (section 5) does not refund it.

## 3. Fuel

| Thing | Value |
|---|---|
| Jump fuel | `ly x ship.fuelPerLy` units |
| Tank | per ship (28 to 90 units), grows with the TANK part (x1.25, x1.5, x2) |
| Price per unit | Halcyon 8, trade hub 9, outposts 7, miners 6, the pirate nest 15 (they gouge), none in empty systems |
| Refuel | a fuel pump terminal at every station that has one; pay per unit, half or full; a full tank is never more than about 400 cr |
| What a jump costs | Halcyon to Kestrel (6.3 ly) is 6.3 units for the starter = 50 cr, about one rescue payout in ten |
| Range of one tank | starter 40 units = about 6 jumps; explorer 90 units at 0.7 per ly = 128 ly |

Why it is a real decision and not a tax: some systems have no pump (the Hollow, Lethe), so you plan the way out as well as the way in; heavy ships burn twice as much per ly; the nest charges double; a long hop can need more fuel than the cheap tank holds. If fuel runs out in a system with no pump you are not lost: a **fuel ranger** can be called (45 s, 10 units, three times the price, never more than all your credits). No soft locks.

The first two jumps of a new game cannot be interdicted, so the first look at the tunnel is always a calm one.

## 4. Star systems

### 4.1 What a system is (data, not code)
One plain object per system, in `src/data_systems.js` for the authored ones; the same shape comes out of the generator (4.4). The `Space` scene builds itself from it.

```js
{
  id: 'brass', name: 'Brass Reach', kind: 'mining',          // kind picks art, traffic and spawn tables
  ly: [14, 26.5],                                            // galaxy map position, light years
  seed: 7714, size: 36000,                                   // seed: art and layout; size: world px
  danger: 2, traffic: 1,                                     // 0 to 5 and 0 to 3
  star: { type: 'K', x: 18000, y: 18000 },                   // star type sets colour, size, backdrop tint
  entry: null,                                               // computed from the star you jumped from
  bodies: [                                                  // everything with a place
    { id: 'brass-smelter', type: 'station', art: 'foundry', name: 'Brass Smelter', x: 9000, y: 21000,
      dock: { fuel: 6, repair: 0.5, shop: 3, yard: ['ox', 'bastion'], missions: ['haul', 'patrol'], ore: 30 } },
    { id: 'brass-3', type: 'planet', art: 'rock', name: 'Brass III', x: 24000, y: 9000, r: 300, landable: false },
    { id: 'belt-a', type: 'belt', x: 12000, y: 18000, r: 900, rocks: 40, rich: 0.3 },
    { id: 'wreck-1', type: 'poi', kind: 'wreck', x: 30000, y: 30000, credits: 150 }
  ]
}
```
Halcyon is the same shape with its current coordinates (station 4000, 4000; planet 6200, 2000; belt, wrecks and Kestrel scenery) so the refactor changes nothing a player can see. Old per-file tables (`BELT`, `POI`, `SA_OUTPOST`, `SECTOR`, `GATE`) become lookups into the current system.

### 4.2 The first eight (authored)
Coordinates are in light years on the galaxy map. Ranges: starter 8 ly, courier 14, hauler 8, fighter 9, explorer 18, heavy 7 (section 6). Checked with a script: the starter reaches six of the eight; the pirate nest needs a courier or explorer; Ember needs one engine tier on the starter (+1 ly).

| System | Kind | ly pos | Danger | Station and services | What is there to do |
|---|---|---|---|---|---|
| **Halcyon** | home | 20, 22 | 1 | Halcyon Station: everything. Fuel 8, ore 20 | the current game: Kepler-4b, belt, wrecks, police |
| **Kestrel** | frontier outpost | 25.5, 19 (6.3 from Halcyon) | 1 | Kestrel Outpost: fuel 7, repair, parts to tier 1, no bar | quiet; a ringed gas giant; a good first jump |
| **Meridian** | trade hub | 29, 24.5 (9.3; 6.5 from Kestrel) | 1 | Meridian Exchange: shipyard sells all six, parts to tier 3, ore 26, fuel 9, six calls on the board | busy traffic, police, the best shop |
| **Brass Reach** | mining | 14, 26.5 (7.5 from Halcyon) | 2 | Brass Smelter: ore 30, cargo and tank parts, sells the hauler | three belts, one with rich veins; raiders hunt miners |
| **The Hollow** | empty wild | 13.5, 17.5 (7.9 from Halcyon) | 2 | none | one ice world to land on, a beacon to chart, nothing to buy: bring fuel home |
| **Lethe** | derelict graveyard | 7.5, 30 (7.4 from Brass Reach) | 2 | none | fourteen wrecks to salvage, scavenger drones, one wreck that pays 800 |
| **Ember** | volcanic mining | 34, 31 (8.2 from Meridian) | 3 | Ember Foundry: ore 28, weapons parts to tier 3, sells the fighter | lava world, belts, heavy raiding |
| **Reaver's Roost** | pirate nest | 37, 15 (12.2 from Kestrel, 12.4 from Meridian) | 5 | the Roost dock: no police, 50 cr fee, buys salvage at double, fuel 15, shield and weapon parts at x1.25, heavy ship discounted | waves of pirates, the Reaver bounty |

What a new ship sees: from Halcyon the starter reaches Kestrel, Brass Reach and the Hollow in one jump (Meridian is 9.3 away, so two hops through Kestrel, or one for a courier or fighter); Lethe takes two hops; Ember and the Roost are out of reach, which gives you a reason to buy a better ship or an engine. The heavy (7 ly) reaches only Halcyon, Kestrel and Meridian until it gets engine tiers; that is its character.

### 4.3 The galaxy map
A new overlay (key **G**, also a button on the Tab map), same glass-panel look as the HUD. Stars as glowing nodes coloured by kind (cyan home, green outposts and hubs, amber miners, red nests, grey wilds, white graveyards), a station ring on those with a dock, a skull-free danger pip row. Known systems only; unknown ones near a known one show as "?" dots. Faint lines join stars within the jump range of your ship, a dashed ring shows the range round you. Selecting a star shows a card: name, kind, ly, fuel cost and time, whether it has fuel, danger. If you cannot afford it, the card says how many units short. Enter charges the jump when you are in space; docked, the map is read-only (plan from the bar). The nearest stars are known at the start; a system becomes known when you jump to it or when a mission or chart names it.

### 4.4 The generator
`makeSystem(seed, kind)` returns the same shape as 4.1. It places the star near the middle, planets on loose rings (0 to 5, kinds rock, ice, gas, lava, ringed), stations from the kind table, belts and wrecks from the kind table, with a minimum 2500 px between anything. The seed also picks the name (syllable lists), the backdrop tint and the star type. `makeGalaxy(seed, n)` scatters stars at least 5 ly apart over 80 x 50 ly, gives each a kind (wild 25%, mining 20%, outpost 15%, graveyard 10%, trade 10%, nest 10%, lawless mining 10%), sets danger from the distance to Halcyon (+1 per 12 ly), and repairs the graph so every star is reachable with an 18 ly ship. The eight authored systems are fixed; the generator adds eight more in its first card to prove it, and "more is cheap" means appending a seed.

## 5. Danger on the way

### 5.1 Interdiction in cruise
Every cruising second at danger d rolls `0.004 x d` (a 6.5 s leg in a danger-3 system is about 8%). Never inside 4000 px of a station, never twice within 90 s, never in the first two jumps of a game. When it fires: a red warning and a siren for 1.2 s, cruise drops to 150 px/s, two or three pirates (types by the system) appear 900 px ahead, the screen shakes once. You fight, or run: flying away at local speed works as it does today. Later (stretch) there is an evade mini-game: keep the nose on the green mark for 2 s while the ring fills.

### 5.2 Pull-out in hyperspace
Each jump rolls `0.02 + 0.01 x max(danger of the two systems)` (2 to 7%). When it fires the tunnel flickers, an alarm sounds, and the rings collapse at 40 to 70% of the way. You drop into **deep space**: the `Space` scene with an empty system definition (no bodies, a dark tint, no docking) and three to five pirates sized to the danger. Win and the tunnel resumes for the time that was left; the fuel was spent when you jumped. Die and the usual insurance flow runs: you wake at the last station you docked at, with the fee. Nests have pirates waiting at the entry point as well.

### 5.3 Pirates in a bigger world
Spawn tables become per system: `maxActive` (3 at danger 1 to 12 at danger 5), spawn interval, weights of raider, drone and gunship (`pirateTypeFor` takes the system's weights; the distance rule stays near stations). The Reaver lives at the Roost. Police exist only where traffic is 2 or more.

## 6. Ships and the fleet

### 6.1 The six
Stats are for a ship with no parts. `vmax` and `boost` are px/s, `accel` px/s2 (the starter is today's 480, 800, 720).

| Id | Name | Role | Hull | vmax / boost | Accel | Turn | Tank | Fuel per ly | Jump range | Hold | Guns | Sensor | Price |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `wren` | Wren | starter, balanced | 100 | 480 / 800 | 720 | 1.0 | 40 | 1.0 | 8 | 10 | 1 | 1.0 | free |
| `kite` | Kite | fast courier | 70 | 580 / 950 | 900 | 1.25 | 30 | 0.6 | 14 | 4 | 1 | 1.0 | 4 500 |
| `ox` | Ox | cargo hauler | 170 | 360 / 560 | 520 | 0.6 | 70 | 1.6 | 8 | 40 | 1 | 1.0 | 6 500 |
| `talon` | Talon | fighter | 130 | 520 / 880 | 880 | 1.35 | 28 | 1.2 | 9 | 3 | 2 | 1.0 | 8 500 |
| `pathfinder` | Pathfinder | explorer | 90 | 440 / 700 | 700 | 1.0 | 90 | 0.7 | 18 | 8 | 1 | 1.6 | 11 000 |
| `bastion` | Bastion | heavy | 320 | 300 / 480 | 480 | 0.5 | 60 | 2.0 | 7 | 20 | 3 | 1.0 | 24 000 |

Sensor scales the radar range, the salvage find distance and the cruise nav list discovery radius. Guns is the number of hardpoints (shots per trigger pull). Turn multiplies today's 0.0036 rad/ms.

### 6.2 What each looks like (brief for the ship art)
Each is a 56 x 40 style texture (the big ones larger) drawn in `ships.js`, with its own silhouette so it reads on the radar and at a glance, and with the existing upgrade-tier overlays redone per ship.

- **Wren**: today's dart, cyan trim.
- **Kite**: a thin needle with swept-back fins and two long nozzles, white hull, cyan stripe. Looks fast standing still.
- **Ox**: a boxy spine with three cargo pods slung under it, one big engine block, amber hazard stripes. Like the MULE, but a pilot's ship, not a liner.
- **Talon**: a wide delta with two forward gun pods, orange and graphite, angular.
- **Pathfinder**: a round-nosed hull with a sensor dish on the back and long fuel tanks alongside, pale green trim.
- **Bastion**: a wide armoured wedge, four nozzles, two turrets, grey with a red band; the biggest thing a player flies (about 1.6 times the Wren).

### 6.3 The fleet
- You may own up to six ships, duplicates allowed. Every owned ship is a record: model, name, parts, hull, fuel, hold, and **where it is parked** (a station id). You start with one Wren.
- You fly one, the **active** ship. The Ship bay (`src/shipmode.js`, card `space-game-ship-mode`) is the hangar terminal's home: boarding at the YOUR SHIP spot opens it, it shows the active ship, and card `d4-hangar-ui` adds a strip of the ships parked here and the buy, sell, rename and transfer tabs to that scene instead of making a second screen (its data comes from `bayShipInfo()`, its part callouts from `BAY_SLOTS`, and a fuel row appears as soon as `bayShipInfo()` returns fuel). At a station with a **hangar** terminal (the existing YOUR SHIP spot, now opening the bay) you can switch to any ship parked there, buy a ship from that station's yard, sell one, rename one, or pay to **transfer** a ship from another station (25 cr per ly plus 100; it is waiting when you next dock there).
- Selling gives 60% of the ship's base price plus 50% of what is fitted. Buying a ship does not touch the old one: it stays parked.
- Death: the insurance flow stays (20% of credits, minimum 50); the ship is rebuilt, never lost. Fleet ships elsewhere are untouched.
- Cargo stays with the ship. Ore is sold when you dock where the station buys it, as now; switching ships never moves cargo. A mission stays with you, not with a ship.

## 7. Parts

Five slots on every ship: **engine, shields, weapons, tank, cargo**. Each has tiers 1 to 3; the ship decides how high a slot goes (a courier cannot fit tier 3 weapons; a hauler can fit tier 3 cargo). Prices below are for the Wren; each ship has a price multiplier (Kite 0.8, Ox 1.2, Talon 1.1, Pathfinder 1.1, Bastion 1.8). Parts are tied to the ship; a part cannot move between ships (to keep the save simple). Selling a part gives 50%.

| Slot | Tier 1 | Tier 2 | Tier 3 | Prices (T1 / T2 / T3) |
|---|---|---|---|---|
| **Engine** | +8% speed, +1 ly jump range, boost tank 130 | +16%, +2 ly, boost tank 165 (today's booster tiers) | +25%, +3 ly, boost tank 200, faster refill | 350 / 550 / 1100 |
| **Shields** | 25 points, +6 a second after 4 s without a hit | 50 points, +8 a second after 3.5 s | 85 points, +11 a second after 3 s | 300 / 500 / 1000 |
| **Weapons** | fire delay 100 ms (today's rapid tier 1) | 70 ms (today's tier 2) | 50 ms, shots 20 damage | 400 / 600 / 1200 |
| **Tank** | fuel x1.25 | x1.5 | x2.0 | 250 / 450 / 900 |
| **Cargo** | hold +4 | +8 | +14 | 250 / 450 / 900 |

Where they are sold: Halcyon and Meridian sell tier 1 and 2 of everything; Meridian also tier 3. Outposts sell tank and engine tier 1. Mining systems sell cargo and tank to tier 2 and 3. Ember sells weapons to tier 3, the Roost sells shields and weapons to tier 3 at x1.25. The shop terminal keeps the look it has now (`openShop` in `shop.js`); it gets five cards in two rows instead of three.

**v1 upgrades map across**: `armor` becomes `shields` (tier for tier, same prices: the old +20 max hull is replaced by shield points), `rapid` becomes `weapons`, `booster` becomes `engine`. `tank` and `cargo` start at 0. The save migration (section 8.3) does this once.

## 8. Data and save

### 8.1 Files (all plain script tags, no build step)
New:
- `src/data_ships.js`: `SHIP_MODELS` (the table in 6.1 plus art keys and max tier per slot).
- `src/data_parts.js`: `PART_SLOTS` (the table in 7).
- `src/data_systems.js`: `SYSTEMS` (the eight in 4.2).
- `src/universe.js`: `G.system`, `sysDef()`, `sysBodies()`, `distLy()`, `jumpTargets()`, `enterSystem(id, from)`, `makeSystem`, `makeGalaxy`.
- `src/fleet.js`: the fleet records, `activeShip()`, `shipStat(name)` (hull, vmax, accel, turn, tank, fuelPerLy, range, hold, guns, sensor with parts applied), the hangar terminal.
- `src/fuel.js`: fuel state, `jumpCost(from, to)`, the pump terminal, the ranger.
- `src/cruise.js`: the cruise state machine and the nav list.
- `src/galaxymap.js`: the galaxy overlay scene.
- `src/hyperspace.js`: the `Hyper` scene (tunnel) and the jump charge in space.
- Tests in `tests/`: `galaxy.mjs`, `savemig.mjs`, `cruise.mjs`, `jump.mjs`.

Changed over time: `space.js` (builds from `sysDef()`, reads stats from `shipStat`), `shop.js` (parts), `meta.js` (save v2), `map.js` (system map scales to `size`, galaxy button), `missions.js` (system ids, new calls), `asteroids.js`, `poi.js`, `stationart.js`, `traffic.js`, `enemies.js` (system-aware spawns), `hud.js` (fuel chip, cruise readout), `station.js` (per-station services), `boot.js` (new textures).

### 8.2 Save v2
Key `longhaul.save.v2`; the v1 key is read when v2 is absent and never overwritten (so a rollback loses nothing).

```json
{ "v": 2, "credits": 1420, "mission": "none", "missionId": null, "missionProgress": 0, "patrolsDone": 1,
  "system": "halcyon", "lastDock": "halcyon-station", "jumps": 3,
  "known": ["halcyon", "kestrel", "brass", "hollow"],
  "active": 0,
  "fleet": [ { "uid": 1, "model": "wren", "name": "Wren", "at": "halcyon-station",
               "hull": 100, "fuel": 31, "ore": 4,
               "parts": { "engine": 1, "shields": 2, "weapons": 0, "tank": 0, "cargo": 0 } } ],
  "poi": {}, "charted": [], "volume": 1, "muted": false,
  "guide": {}, "stats": {} }
```
- You always wake docked at `lastDock` (as v1 always woke at the station), even if the last autosave was in space or in a system with no station. It costs nothing and removes every "saved in the middle of nowhere" bug. (Stretch: save in space.)
- `hull`, `fuel`, `ore` live per ship, not globally, so switching ships keeps each one's state.
- A save that names a system or model we do not know (a later version) falls back to Halcyon and the Wren; the rest of the save is kept.

### 8.3 Migration (v1 to v2)
Run once in `loadGame()` when only v1 exists: credits, mission fields, patrols, volume, muted, poi, guide, stats copy across; `system` is `halcyon`, `lastDock` the station; one Wren record with `parts` from `{armor: shields, rapid: weapons, booster: engine}`, `fuel` equal to the tank, `ore` from `G.ore`, `hull` clamped to the Wren's hull. `tests/savemig.mjs` loads a canned v1 file and checks all of it, and a v2 round trip.

### 8.4 Keeping old code working
`G.upgrades` stays as a live alias of the active ship's `parts`, with the old three keys still answering (`armor` reads `shields`) until the parts card renames the call sites; `G.hull`, `G.maxHull`, `G.ore` stay as the active ship's hull, hull cap and ore. Each is a getter and setter pair on `G` so no existing line has to change in the foundation cards.

## 9. Look and feel (DreamBot owns this part)

All new screens use the v2 HUD language: `hudPanel` glass with a glowing edge, segmented `hudBar`, `keyCap`s, amber for the thing to do, cyan for information, red only for danger.

**Galaxy map** (sketch):
```
 GALAXY                                   [Tab] system   [Esc] close
 ┌──────────────────────────────────────────────────────┐ ┌─────────────┐
 │        ·Lethe        ·Hollow        ◯Kestrel   ✦Roost│ │ KESTREL     │
 │             ·BrassReach     ◉YOU Halcyon  ◯Meridian │ │ outpost     │
 │                    (range ring, dashed)       ◯Ember │ │ 6.3 ly      │
 │                                                      │ │ FUEL  6 / 40│
 └──────────────────────────────────────────────────────┘ │ TIME  10 s  │
                                                          │ [Enter] jump│
                                                          └─────────────┘
```
**Hyperspace tunnel**: the ship small at 35% from the left, centre height. About 220 star streaks, long horizontal lines flying left with speed by depth, tinted by distance (cyan, then white, then a warm amber for long jumps). Every 0.3 s a gate ring (a tall thin ellipse with a glow) races from the right edge, passes the ship and leaves left, brightening as it passes. Two slow sine ribbons of colour run along the path. A white bloom at the nose pulses with a slow breath; camera shake 0.0015. HUD: destination top centre, a thin progress line, time left, fuel burned. Cheap to draw (one Graphics, redrawn per frame) and it reuses the polyline helpers in `hud.js`.

**Cruise**: the same streaks as boosting but twice as long, a cyan vignette at the screen edges, camera zoom 0.85, the distance to the target counts down in the HUD, the target gets bracket corners, the drop-out has a soft white flash and a thud. The radar dims.

**HUD**: a FUEL chip joins the credits strip (gear chips, ore cells): a segmented bar, amber below 25%, red below 10% with the same pulse as low hull. The jump charge is a ring round the ship. Interdiction: a red edge flash, the banner "INTERDICTED" (same banner system as `hudWarn`), a siren.

**Station**: every station uses the one `Station` scene; the name above the hangar, the accent colour, which terminals exist and the NPC lines come from the station's data. The pirate dock gets red accents. That is cheap; real new interiors are the separate card `space-game-v2-station-interior`.

## 10. The build plan

### 10.1 Rules so each card merges alone
1. One branch off the latest main per card; `bash tests/smoke.sh` passes before review; update the tests the card breaks in the same card.
2. **Land dark.** A new feature has no way in until the last card of its phase wires the key. (The G key arrives with the hyperspace card, not the map card.) Half a feature is never reachable.
3. Never change two of these in one card: the save format, a coordinate frame, the scene flow.
4. Halcyon's coordinates do not move until the cruise card enlarges it, and the enlarging only adds space.
5. Data first, then behaviour: a card that adds a table does not also change how the game reads it, unless it is the card that says so.
6. Each card names its files; if a card must touch a file another open card touches, say so on the card and merge in the listed order.

### 10.2 The cards
IDs start `space-game-u-`. Owners: **BB** BuildBot (logic), **DB** DreamBot (look, UI, feel), **TM** a TaskMaster (data, tests, QA). Size: S under an evening, M about one evening. "Needs" lists the cards that must be merged first.

**Phase A: foundations (nothing changes for the player)**

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `a1-systems-data` | BB | M | | `data_systems.js` with Halcyon as data; `universe.js` (`G.system`, `sysDef`, `sysBodies`); `space.js`, `asteroids.js`, `poi.js`, `stationart.js`, `traffic.js`, `map.js`, `missions.js` read station, planet, belt, wrecks, outpost and gate from it. Same coordinates, size 8000. Done when smoke and `missions.mjs` pass unchanged |
| `a2-save-v2` | TM | M | a1 | `meta.js` v2 save and the v1 migration, `lastDock`, getters on `G` for hull and ore, `tests/savemig.mjs` (canned v1 file, v2 round trip, unknown ids) |
| `a3-ship-models` | BB | S | a2 | `data_ships.js`, `fleet.js` with one Wren record, `shipStat()`; `space.js` and `boost.js` read speed, thrust, turn and hull from it. Stats equal today's, so nothing changes; a test pins them |

**Phase B: fuel and the first jump**

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `b1-fuel` | BB | S | a3 | `fuel.js`: fuel per ship, pump terminal on the station (fuel price from the station data), FUEL chip in `hud.js`, save field. No jumps yet |
| `b2-galaxy-map` | DB | M | a1, b1 | `galaxymap.js` overlay with the eight systems from a stub table, ranges, cost card, reachable highlight; key not wired yet (opens from a test hash `#galaxy`) |
| `b3-hyper-scene` | DB | M | | `hyperspace.js` `Hyper` scene: the tunnel, readout, fixed duration; opens from a test hash `#hyper`; no game effect |
| `b4-jump` | BB | M | b1, b2, b3 | the charge sequence in `space.js`, mass and hostile locks, fuel burn, `enterSystem()`, the entry point, arrival; **wires the G key**. Jumping to Kestrel works with Kestrel as an empty system |
| `b5-systems-8` | TM | M | a1, b4 | author the other seven systems in `data_systems.js`: bodies, services, prices, danger, tints; `spaceBackdrop` takes the system tint; stations get names and `dock` data |
| `b6-system-art` | BB | M | a1 | art: planet kinds (rock, ice, gas, lava, ringed), star types, four new station textures (hub, foundry, nest dock, derelict) in `art_world.js` and `stationart.js`, cached and made on first use |

**Phase C: cruise**

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `c1-cruise` | BB | M | a1 | `cruise.js`: nav list (N), cruise (C), speed profile, auto-steer, drop-out, locks; Halcyon grows to 36 000 with new far bodies (a moon, a derelict gas giant, a second belt); world bounds and map scale from `size`; `tests/cruise.mjs` with the stepped clock |
| `c2-cruise-fx` | DB | S | c1 | streaks, vignette, zoom, target brackets, HUD readout, drop-out flash |

**Phase D: parts and fleet**

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `d1-parts` | BB | M | a3 | `data_parts.js`, five slots, shields mechanic, tank and cargo effects, `shop.js` rework, the v1 key mapping (`armor`, `rapid`, `booster`) retired from call sites, engine tier adds jump range |
| `d2-ship-art` | BB | M | | five new ship textures and the per-ship tier overlays in `ships.js`; radar colours; the Station scene's ship image uses the active model |
| `d3-fleet-logic` | BB | M | a3, d2 | fleet records, parking, switching, buying, selling, transfer, rules of 6.3, per-ship state, tests |
| `d4-hangar-ui` | DB | M | d3 | the hangar terminal, built into the Ship bay scene (`src/shipmode.js`, already merged by then): a strip of the ships parked here, stat bars, buy/sell/switch/rename/transfer, in the `panel()` and `hudPanel` style. Boarding already opens the bay; Launch stays the amber button |

**Phase E: danger, missions, money**

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `e1-interdiction` | BB | S | c1 | cruise interdiction (5.1), pirate tables per system in `enemies.js` |
| `e2-pullout` | BB | M | b4 | hyperspace pull-out and the deep-space scene (5.2), resume of the tunnel; DB adds the flicker and alarm |
| `e3-missions-xsys` | BB | M | b5 | courier, haul, salvage and survey calls, the bounty moves to the Roost, mission fail on leaving a system, calls by station, the objective marker across systems |
| `e4-economy` | TM | S | b5, d1 | ore, fuel, repair and part prices per station; the balance table in section 11 checked with `tests/probe.mjs` |
| `e5-station-variants` | DB | M | b5 | the Station scene reads name, accent, terminals and NPC lines from station data; pirate dock look; coordinate with `space-game-v2-station-interior` |
| `e6-generator` | BB | M | b5 | `makeSystem`, `makeGalaxy`, eight more systems, `tests/galaxy.mjs` (connectivity, no overlaps, names unique) |

**Phase F: QA**

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `f1-qa` | TM | M | all above | headless playthrough: new game, fuel, jump, cruise, buy a ship, save and reload; frame cost in a 36 000 px system; notes in `docs/PLAYTEST.md` |

Suggested order, keeping the board busy: A1, then A2 and B3 and B6 at once; A3; B1 and B2 and C1; B4; B5 and C2 and D1 and D2; D3, D4, E1, E2; E3, E4, E5, E6; F1. The first thing a player can feel is B4 (a jump to Kestrel): about seven cards in. To feel something sooner, B3 can ship a "hyperspace demo" key for Troy to watch the tunnel while the rest is built.

### 10.3 Risks
- **A1 is the big one.** Many files hard-code the sector. Do it in small commits file by file with the smoke test after each; if it runs long, split it into "station and planet and belt" and "wrecks, outpost, gate, map".
- **World size.** 36 000 px worlds are fine for Phaser (physics bounds and camera bounds are just numbers); the cost is in how many objects are alive, which does not change. C1 measures the frame cost.
- **Radar and arrows** keep their 2400 px range; far bodies show through the objective arrow and the nav list, not the radar.
- **Textures**: planets are 800 px canvases. Make them on first use and keep a cache of at most six.
- **Save**: only `a2` changes the format; a test pins the migration; the v1 key is never deleted.
- **Missions** use coordinates (`GATE`, the bounty position, wreck ids). They move into system data in A1, and each mission gets a `system` id in E3.

## 11. Numbers to start with (balance table)

| Thing | Value |
|---|---|
| Rescue, escort, patrol, bounty | 500, 400, 600, 1200 (as now) |
| New calls | courier 200 + 90 per ly; haul 20 per ore-unit of hold carried, per 5 ly; salvage 700 to 800; survey 600 |
| Ore | 20 at Halcyon, 30 mining, 26 hub; hold 10 (starter) gives 200 to 300 a run |
| Fuel | 6 to 15 per unit; a full starter tank costs about 320 |
| Ships | 4 500, 6 500, 8 500, 11 000, 24 000 |
| Time to the first new ship | about 10 to 14 rescue-sized runs, so one evening; the heavy takes three |
| Repair | half a credit per point (as now) |
| Insurance | 20% of credits, minimum 50 (as now) |

## 12. Open questions for Troy
1. **Skip the tunnel?** The plan says no skip (you like the tunnel). If it gets long after twenty jumps, one line makes Space skip the second half. Say if you want that.
2. **Saving in space.** The plan wakes you docked at the last station you used. If you would rather resume where you were, that is a stretch card (it needs saving the position, speed and fight state).
3. **One mission at a time.** The plan keeps it. A second slot is easy later.

## 13. Stretch ideas (not in the plan)
Fuel scoop (refuel from the star in cruise), the interdiction evade game, trade goods with prices per system (it would make the cargo slot matter beyond ore), the docking computer from `docs/DOCKING.md`, anomalies and gates, a ship transfer delay, saving in space, a fourth speed called "drift" for the very big systems if 36 000 turns out too small.
