# The stars near the Sun (the `mods/sol` pack)

Card `space-game-near-stars-pack`. The real stars within about 12 light years of the Sun, as star systems you can jump to. They live in the same pack as Sol (`mods/sol/`, card `space-game-sol-system-pack`), which is **off until you turn it on**: press **O** on the Title screen, switch `sol` on, press **R**. Nothing in the shipped game changes while it is off.

Every number on this page that comes from a star catalogue was **written from memory**, not looked up: the positions, distances and star types are the commonly quoted values and should be right to the precision shown, but nobody has checked them against a catalogue yet. Section 7 lists the ones I am least sure of.

## 1. The stars

Sol is at `ly: [26, 27]` on the galaxy map (1-GEN's choice: 7.8 ly from Halcyon, so a Wren can jump between the two). Each star below sits at its real distance from that point.

| Star | File (`mods/sol/systems/`) | Real distance | Right ascension | Declination | Type (real) | Sun in the game | Map `ly` | Distance from Sol on the map |
|---|---|---|---|---|---|---|---|---|
| Alpha Centauri | `alpha-centauri.md` | 4.37 ly | 14h 39m 36s | -60° 50′ | G2V + K1V, with Proxima M5.5Ve | G | [22.46, 29.56] | 4.37 ly |
| Barnard's Star | `barnard.md` | 5.96 ly | 17h 57m 48s | +04° 42′ | M4V | M | [21.04, 30.31] | 5.96 ly |
| Wolf 359 | `wolf-359.md` | 7.86 ly | 10h 56m 29s | +07° 01′ | M6V | M | [30.44, 33.48] | 7.86 ly |
| Lalande 21185 | `lalande-21185.md` | 8.31 ly | 11h 03m 20s | +35° 58′ | M2V | M | [29.89, 34.34] | 8.31 ly |
| Sirius | `sirius.md` | 8.60 ly | 06h 45m 09s | -16° 43′ | A1V + white dwarf DA2 | A | [34.48, 25.58] | 8.60 ly |
| Luyten 726-8 | `luyten-726-8.md` | 8.73 ly | 01h 39m 01s | -17° 57′ | M5.5V + M6V (UV Ceti) | M | [28.23, 18.56] | 8.73 ly |
| Ross 154 | `ross-154.md` | 9.69 ly | 18h 49m 49s | -23° 50′ | M3.5V | M | [20.51, 34.99] | 9.69 ly |
| Ross 248 | `ross-248.md` | 10.30 ly | 23h 41m 55s | +44° 10′ | M5.5V | M | [17.26, 21.55] | 10.30 ly |
| Epsilon Eridani | `epsilon-eridani.md` | 10.47 ly | 03h 32m 56s | -09° 27′ | K2V | K | [33.3, 19.49] | 10.47 ly |
| Lacaille 9352 | `lacaille-9352.md` | 10.72 ly | 23h 05m 52s | -35° 51′ | M0.5V | M | [24.42, 16.4] | 10.72 ly |
| Ross 128 | `ross-128.md` | 11.01 ly | 11h 47m 44s | +00° 48′ | M4V | M | [29.6, 37.41] | 11.01 ly |
| Procyon | `procyon.md` | 11.46 ly | 07h 39m 18s | +05° 13′ | F5IV-V + white dwarf DQZ | F | [37.35, 28.61] | 11.46 ly |
| 61 Cygni | `cygni-61.md` | 11.40 ly | 21h 06m 54s | +38° 45′ | K5V + K7V | K | [15.41, 22.78] | 11.40 ly |
| Tau Ceti | `tau-ceti.md` | 11.91 ly | 01h 44m 04s | -15° 56′ | G8V | G | [29.87, 15.74] | 11.91 ly |

Right ascension and declination are for the epoch J2000. The file of 61 Cygni is `cygni-61.md` because an id must start with a letter. Proxima is not a system of its own: it is 0.2 ly from Alpha Centauri and is a body of that system.

The game has seven star types (O B A F G K M) and one sun per system. A double star flies under its brighter star's type, and its companion is a body in the system (section 5).

## 2. How three dimensions became two

The galaxy map is flat and the stars are not: they surround the Sun in every direction. Fourteen points on spheres round the Sun cannot be laid on a sheet without moving some of them relative to each other. The rule used:

1. **Every star keeps its true distance from Sol.** A star may only move along the circle of that radius round Sol; only its direction on the map is free.
2. **The directions are chosen so the distances between stars stay as close to real as they can**, near pairs counting most (each pair's error is weighed by one over its real distance squared). A numerical search from 300 starting layouts picked the best.
3. **The jump graph counts extra.** A pair the map would bring inside 8 ly (the starting ship's range) or 9 ly (the next ship's) when it really is not, or push outside when it really is inside, is penalised, so the map does not invent or lose a jump.
4. The whole layout is then turned round Sol so that no star lands on one of the eight shipped systems (the nearest comes to 2.8 ly).

So the map is **not** a view from above the galaxy or the ecliptic: north on it means nothing. `tools/near-stars-flatten.py` is the script, with the inputs in it; it reproduces the positions in the files.

**The error it leaves.**

- Distances from Sol: exact to the two decimals written in the files (the worst is 0.00 ly off).
- The 13 pairs of stars that really are within 8 ly of each other: on average 1.8 ly off, the worst 4.9 ly (Alpha Centauri and Barnard's Star). Nearly all of them are **closer on the map than in space**: a flat map has less room than a sphere.
- All 91 pairs: on average 1.8 ly off, the worst 9.4 ly. Stars on opposite sides of the Sun are far apart in space and can be near each other on a flat map; that is where the large errors are.

The pairs that really are within 9 ly, and what the map makes of them:

| Pair | Real | On the map | Off by |
|---|---|---|---|
| Luyten 726-8 and Tau Ceti | 3.20 ly | 3.26 ly | +0.06 |
| Wolf 359 and Ross 128 | 3.90 ly | 4.02 ly | +0.12 |
| Wolf 359 and Lalande 21185 | 4.07 ly | 1.02 ly | -3.05 |
| Luyten 726-8 and Epsilon Eridani | 5.07 ly | 5.15 ly | +0.08 |
| Sirius and Procyon | 5.26 ly | 4.17 ly | -1.08 |
| Epsilon Eridani and Tau Ceti | 5.46 ly | 5.08 ly | -0.38 |
| Barnard's Star and Ross 154 | 5.54 ly | 4.71 ly | -0.83 |
| Ross 248 and 61 Cygni | 5.58 ly | 2.22 ly | -3.36 |
| Alpha Centauri and Barnard's Star | 6.48 ly | 1.61 ly | -4.87 |
| Lalande 21185 and Ross 128 | 6.59 ly | 3.08 ly | -3.51 |
| Luyten 726-8 and Lacaille 9352 | 6.64 ly | 4.38 ly | -2.26 |
| Sirius and Epsilon Eridani | 7.83 ly | 6.20 ly | -1.63 |
| Lacaille 9352 and Tau Ceti | 7.88 ly | 5.49 ly | -2.39 |
| Alpha Centauri and Ross 154 | 8.10 ly | 5.77 ly | -2.34 |
| Alpha Centauri and Wolf 359 | 8.34 ly | 8.89 ly | +0.55 |
| Wolf 359 and Procyon | 8.67 ly | 8.45 ly | -0.21 |
| Wolf 359 and Sirius | 9.05 ly | 8.87 ly | -0.17 |

**Where the map and space disagree about a jump.**

- At 8 ly: Alpha Centauri and Ross 154 are 8.1 ly apart in space and 5.8 ly on the map (the map allows a jump that space refuses).
- At 9 ly: Alpha Centauri and Lalande 21185 are 10.4 ly apart in space and 8.8 ly on the map (the map allows a jump that space refuses); Wolf 359 and Sirius are 9.0 ly apart in space and 8.9 ly on the map (the map allows a jump that space refuses); Ross 248 and Lacaille 9352 are 13.6 ly apart in space and 8.8 ly on the map (the map allows a jump that space refuses).

## 3. The jump ladder from Sol

A jump needs the range (the distance on the map) and the fuel. The ships of the yard:

| Ship | Range | Tank | Fuel per ly | Price |
|---|---|---|---|---|
| Wren (the ship you start with) | 8 ly | 40 | 1.0 | free |
| Bastion | 7 ly | 60 | 2.0 | 24,000 |
| Ox | 8 ly | 70 | 1.6 | 6,500 |
| Talon | 9 ly | 28 | 1.2 | 8,500 |
| Kite | 14 ly | 30 | 0.6 | 4,500 |
| Pathfinder | 18 ly | 90 | 0.7 | 11,000 |

An engine part adds 1, 2 or 3 ly to any of them (tier 1 to 3), so a Wren with a tier 1 engine is a 9 ly ship.

| Star | From Sol | With the Wren (8 ly) | With a 9 ly ship (a Talon, or a Wren with a tier 1 engine) | With a Kite (14 ly) |
|---|---|---|---|---|
| Alpha Centauri | 4.37 ly | 1 jump: Sol → Alpha Centauri | 1 jump: Sol → Alpha Centauri | 1 jump |
| Barnard's Star | 5.96 ly | 1 jump: Sol → Barnard's Star | 1 jump: Sol → Barnard's Star | 1 jump |
| Wolf 359 | 7.86 ly | 1 jump: Sol → Wolf 359 | 1 jump: Sol → Wolf 359 | 1 jump |
| Lalande 21185 | 8.31 ly | 2 jumps: Sol → Wolf 359 → Lalande 21185 | 1 jump: Sol → Lalande 21185 | 1 jump |
| Sirius | 8.60 ly | out of reach | 1 jump: Sol → Sirius | 1 jump |
| Luyten 726-8 | 8.73 ly | out of reach | 1 jump: Sol → Luyten 726-8 | 1 jump |
| Ross 154 | 9.69 ly | 2 jumps: Sol → Alpha Centauri → Ross 154 | 2 jumps: Sol → Alpha Centauri → Ross 154 | 1 jump |
| Ross 248 | 10.30 ly | out of reach | 3 jumps: Sol → Luyten 726-8 → Lacaille 9352 → Ross 248 | 1 jump |
| Epsilon Eridani | 10.47 ly | out of reach | 2 jumps: Sol → Sirius → Epsilon Eridani | 1 jump |
| Lacaille 9352 | 10.72 ly | out of reach | 2 jumps: Sol → Luyten 726-8 → Lacaille 9352 | 1 jump |
| Ross 128 | 11.01 ly | 2 jumps: Sol → Wolf 359 → Ross 128 | 2 jumps: Sol → Wolf 359 → Ross 128 | 1 jump |
| Procyon | 11.46 ly | out of reach | 2 jumps: Sol → Wolf 359 → Procyon | 1 jump |
| 61 Cygni | 11.40 ly | out of reach | 4 jumps: Sol → Luyten 726-8 → Lacaille 9352 → Ross 248 → 61 Cygni | 1 jump |
| Tau Ceti | 11.91 ly | out of reach | 2 jumps: Sol → Luyten 726-8 → Tau Ceti | 1 jump |

**Reading it as a ladder.**

- **Rung 1, the Wren from Sol in one jump:** Alpha Centauri, Barnard's Star, Wolf 359. Alpha Centauri is the first and shortest.
- **Rung 2, the Wren with one stop:** Lalande 21185, Ross 154, Ross 128.
- **Beyond the Wren:** Sirius, Luyten 726-8, Ross 248, Epsilon Eridani, Lacaille 9352, Procyon, 61 Cygni, Tau Ceti. No chain of 8 ly jumps reaches any of them, on the map or in real space: the gap between the inner stars and these is wider than 8 ly everywhere. They need a better ship: 9 ly of range opens Sirius and Luyten 726-8 from Sol and the rest from those two; a Kite reaches every star from Sol in one jump and costs less than a Talon.
- The Wren's ladder on the map is the same as the ladder real distances would give (the same stars at the same number of jumps).
- With 9 ly the map is kinder than space to: Ross 248, 61 Cygni. In real space Ross 248 is 10.3 ly from the Sun and 61 Cygni is 9.3 ly from Barnard's Star, its nearest neighbour inside the ladder, so a 9 ly ship could not reach either; on the map a false 8.8 ly link between Lacaille 9352 and Ross 248 lets it through.

**Fuel.** The Wren burns 1 unit a light year from a 40 unit tank, so Sol → Wolf 359 → Ross 128 and home again (about 22 ly) fits in one tank; the pumps below are there so you never have to count.

## 4. The stops (our own names)

Six stars have a small dock with a pump, where the ladder needs a stop. The names are ours; none is taken from a book, a show or another game.

| Dock | Star | Why there | Why the name |
|---|---|---|---|
| Toliman Waypoint | Alpha Centauri | the first jump out of Sol | Toliman is the real name of Alpha Centauri B |
| Runaway Depot | Barnard's Star | the stop before Ross 154 | Barnard's Star moves across the sky faster than any other star |
| Dimlight Post | Wolf 359 | the stop before Lalande 21185 and Ross 128 | one of the faintest stars near the Sun |
| Dogwatch Station | Sirius | the stop before Procyon and Epsilon Eridani | Sirius is the Dog Star |
| Flarewatch Outpost | Luyten 726-8 | the stop before Tau Ceti and Lacaille 9352 | its second star, UV Ceti, is the pattern of all flare stars |
| Bessel Point | 61 Cygni | the stop before Ross 248 | Friedrich Bessel measured the distance to 61 Cygni in 1838, the first for any star |

Each sells fuel and repairs; none has a shipyard or a mission board yet.

## 5. What is in each system, and what is real

Every body is placed by its orbit from the star, in the units of the file; the sizes and orbits are **not to scale** (a real system would be a dot on a 36,000 unit square). "Real" means the body exists; where it sits in the game is invented. "Stand-in" means the body is real but the game has no way to draw it yet: a second star is drawn as a glowing (lava) globe and a white dwarf as a small pale (ice) globe, because a system has one sun.

| System | Body | Status | Note |
|---|---|---|---|
| Alpha Centauri | Alpha Centauri B | real, stand-in | the K1 companion of Alpha Centauri A; the two orbit each other every 80 years |
| | Proxima Centauri | real, stand-in | the M5.5 red dwarf, the nearest star to the Sun (4.24 ly), far out from the pair |
| | Proxima b | real | confirmed 2016: a rocky world a little heavier than Earth in an 11 day orbit, where water could be liquid |
| | Proxima d | real, less sure | reported 2022: a small world in a 5 day orbit; I am not sure it counts as confirmed |
| | Centauri Drift (belt) | invented | |
| | Toliman Waypoint | invented | the dock |
| Barnard's Star | Barnard b | real, less sure | reported 2024: a hot world under half Earth's mass in a 3 day orbit; more were reported after it |
| | Barnard Belt, the survey beacon, Runaway Depot | invented | |
| Wolf 359 | Wolf 359 b | candidate | a cold, Neptune-sized world on a long orbit was proposed in 2019 and is not confirmed |
| | Wolf Shoal (belt), Dimlight Post | invented | |
| Lalande 21185 | Lalande 21185 b | real | a hot world of about 2.7 Earth masses in a 13 day orbit |
| | Lalande 21185 c | real | a cold world of about 14 Earth masses on an orbit of about 8 years |
| | Lalande Belt | invented | |
| Sirius | Sirius B | real, stand-in | a white dwarf as heavy as the Sun and the size of the Earth, in a 50 year orbit |
| | Dog Star Shoal (belt), the burnt-out tender, Dogwatch Station | invented | no planet is known at Sirius |
| Luyten 726-8 | UV Ceti | real, stand-in | the second red dwarf of the pair; the first is BL Ceti |
| | Luyten Rubble (belt), Flarewatch Outpost | invented | no planet is confirmed |
| Ross 154 | Ross 154 Drift (belt), Ross 154 Ice, the lost prospector | invented | no planet is known; the ice world is ours |
| Ross 248 | Ross 248 Rock, Ross 248 Belt | invented | no planet is known |
| Epsilon Eridani | Aegir (Epsilon Eridani b) | real | a giant world on an orbit of about 7 years; Aegir is its official name |
| | Inner Belt, Outer Belt | real | the star has two belts of rock and a wide outer ring of dust; their sizes here are invented |
| | the abandoned ore barge | invented | |
| Lacaille 9352 | Lacaille 9352 b and c | real | two heavy rocky worlds found in 2020 (the star is also called Gliese 887), in 9 and 22 day orbits |
| | Lacaille Belt | invented | |
| Ross 128 | Ross 128 b | real | found in 2017: a world a little heavier than Earth in a 10 day orbit, temperate |
| | Ross 128 Belt, the listening post | invented | |
| Procyon | Procyon B | real, stand-in | a faint white dwarf in a 41 year orbit |
| | Procyon Scatter (belt) | invented | no planet is known |
| 61 Cygni | 61 Cygni B | real, stand-in | the K7 companion, in an orbit of about 700 years |
| | Cygni Belt, Bessel Point | invented | no planet is confirmed |
| Tau Ceti | Tau Ceti e and f | candidates | two of four worlds proposed in 2017, at the inner and outer edge of where water could be liquid; none is confirmed |
| | Tau Ceti Debris (belt) | real | the star has a disc of dust and comets many times the Sun's |
| | the old probe relay | invented | |

Danger and traffic are ours: the inner stars are quiet (danger 1), the far ones a little rougher (danger 2); only Sirius has police.

## 6. How it sits in the game

- **Off by default.** `mods/sol/` is a pack: nothing here is read until the player switches it on.
- **Beside the shipped systems.** The pack adds stars; it replaces none. With it on, the galaxy map has the eight shipped systems, Sol, and these fourteen. Alpha Centauri happens to be 7.95 ly from Halcyon, so a Wren can jump there from the start even before Sol's own file is in.
- **Whether Sol and these replace the invented systems or stay beside them is Troy's decision** (card `space-game-sol-system-pack`); nothing here depends on the answer, only the turn of the map in section 2 step 4 would be free again.
- **Files.** `mods/sol/systems/<star>.md` (14) and `mods/sol/stations/<dock>.md` (6). Sol itself, its docks and the pack's label are 1-GEN's files in the same folder.
- **Tests.** `node tests/nearstars.mjs`: the pack builds with no problems, every star is at its real distance from Sol, and every star can be reached from Sol by a chain of jumps with some ship of the yard.

## 7. Numbers to check

Written from memory, in the order I would check them:

1. **Right ascension and declination** of all fourteen (section 1). They only matter for the layout in section 2: a wrong one moves a star's direction on the map, not its distance from Sol.
2. **Ross 248** (10.30 ly), **61 Cygni** (11.40 ly), **Procyon** (11.46 ly), **Lacaille 9352** (10.72 ly) and **Tau Ceti** (11.91 ly): quoted values differ by a few hundredths of a light year between sources.
3. **Luyten 726-8**: 8.73 ly is the older value; newer measurements give about 8.8.
4. **Proxima d** and **Barnard b**: recent reports (2022 and 2024). I am not sure of their status today, or of how many more worlds have been reported at Barnard's Star.
5. **Wolf 359 b** and the **Tau Ceti** candidates: proposed, not confirmed; the Tau Ceti list has changed more than once.
6. **Star types**: Ross 248 (M5.5 or M6), Lacaille 9352 (M0.5 to M2), Tau Ceti (G8 or G8.5), Procyon B (the kind of white dwarf).
7. The orbital periods and masses in section 5 are round numbers.

## 8. Stars left out

The card names fourteen. Other stars I believe are within 12 ly and are not in the pack: Epsilon Indi, EZ Aquarii, Struve 2398, Groombridge 34, DX Cancri, GJ 1061, YZ Ceti, Luyten's Star, Teegarden's Star and Kapteyn's Star. Adding one is a file in `mods/sol/systems/` and a row in `tools/near-stars-flatten.py`; the layout should then be fitted again, which moves the others' directions.
