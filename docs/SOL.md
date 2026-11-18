# Sol: our own solar system as a pack

Card `space-game-sol-system-pack`, 17 Nov 2026. `mods/sol/` is a pack: switched off, the game is exactly as it shipped; switched on in the Mods screen (O on the title), Sol is one more star on the galaxy map, 7.8 light years from Halcyon, and you can jump to it. Whether Sol replaces the eight invented systems or sits beside them is not decided here.

Nothing on this page was seen on a screen: the pack is checked by `node tests/solpack.mjs` (it builds with no problem, every body can be flown to, and with the pack off nothing changes).

## How to change it

Everything in the pack is made from one table of bodies in `mods/sol/_make.mjs`. Change a body or the scale there, then:

```
node mods/sol/_make.mjs          # writes mods/sol/systems/sol.md, the dock files and the tables below
node tools/build-content.mjs     # puts the pack into mods.generated.js
```

## The scale

True distances would leave the outer system empty for hours: Neptune is 30 times as far from the Sun as Earth. So a body's ring is **14,000 times the square root of its real distance in AU**, in the units a system file is written in. The game spreads every position 3 times, so a file unit is 3 px of space: Earth's ring is 14,000 units, 42,000 px.

What the square root keeps: the order of every body, and the feel of inner-close, outer-far (Mercury to Mars fit inside 26,000 px of each other's rings; Saturn to Uranus is 54,000 px). What it gives up: proportion. Neptune is 5.5 times as far out as Earth here, not 30.

| Trip, at its shortest | Space, px | A cruise at 8,000 px/s |
|---|---|---|
| Earth to Mars | 9,800 | a few seconds |
| Earth to Jupiter | 53,800 | about 9 s |
| Earth to Neptune | 188,300 | about 26 s |
| Earth to Pluto | 221,900 | about 30 s |

**This is shorter than the card asked for** ("Earth to Neptune a cruise of a few minutes"). The reason is a limit, not a choice: a system file may be at most 200,000 units across, the Kuiper Gate already sits 92,865 units from the Sun, and a cruise is 8,000 px/s. A few minutes would need a system about five times as wide or a slower cruise in big systems; both are code (the schema's `size` limit in `src/content.js`, `CRUISE.top` in `src/cruise.js`). Card: `space-game-sol-needs-bigger-systems`.

Where a body is on its ring: each planet is at its real mean longitude for 1 January 2000 (J2000), so the planets are spread as they really were that day. An asteroid's place on its ring is invented. The map is north up; longitude 0 points east and grows anticlockwise, as on a chart seen from above the Sun's north pole.

## Every body

<!-- sol-tables:start (made by mods/sol/_make.mjs) -->

### Bodies that go round the Sun

| Body | Drawn as | Real distance, AU | Ring in the file | Ring in space, px | Where on the ring | Note |
|---|---|---|---|---|---|---|
| Mercury | rock world | 0.387 | 8,709 | 26,127 | J2000 longitude 252.25 deg |  |
| Venus | lava world | 0.723 | 11,904 | 35,712 | J2000 longitude 181.98 deg | no cloud world in the game: lava is the hot one |
| Earth | ice world | 1 | 14,000 | 42,000 | J2000 longitude 100.46 deg | no ocean world in the game: ice is the blue and white one |
| Eros | rock world | 1.458 | 16,905 | 50,715 | invented | a near-Earth asteroid: its orbit lies between Earth and Mars, not in the belt |
| Mars | rock world | 1.524 | 17,283 | 51,849 | J2000 longitude 355.45 deg |  |
| Vesta | rock world | 2.362 | 21,516 | 64,548 | invented |  |
| Ceres | ice world | 2.767 | 23,288 | 69,864 | invented |  |
| Pallas | rock world | 2.772 | 23,309 | 69,927 | invented |  |
| Main Belt, Vesta side | belt field | 2.2 | 20,765 | 62,295 | invented |  |
| Main Belt, Ceres side | belt field | 2.9 | 23,841 | 71,523 | invented |  |
| Main Belt, far side | belt field | 3.1 | 24,650 | 73,950 | invented |  |
| Jupiter | gas world | 5.203 | 31,934 | 95,802 | J2000 longitude 34.40 deg |  |
| Greek camp (L4) | belt field | 5.203 | 31,934 | 95,802 | J2000 longitude 94.40 deg | the Jupiter trojans 60 degrees ahead of the planet |
| Trojan camp (L5) | belt field | 5.203 | 31,934 | 95,802 | J2000 longitude 334.40 deg | the Jupiter trojans 60 degrees behind the planet; Patroclus is one of them |
| Saturn | ringed world | 9.537 | 43,235 | 129,705 | J2000 longitude 49.94 deg |  |
| Uranus | ice world | 19.19 | 61,329 | 183,987 | J2000 longitude 313.23 deg |  |
| Neptune | gas world | 30.07 | 76,771 | 230,313 | J2000 longitude 304.88 deg |  |
| Pluto | ice world | 39.48 | 87,966 | 263,898 | J2000 longitude 238.93 deg |  |

### Moons

Real distance from the planet, and the offset the file uses instead (the order outward is kept, the distances are not).

| Moon | Of | Real distance, km | Offset in the file | Offset in space, px |
|---|---|---|---|---|
| Luna | Earth | 384,400 | 1,100 | 3,300 |
| Phobos | Mars | 9,376 | 600 | 1,800 |
| Deimos | Mars | 23,463 | 900 | 2,700 |
| Io | Jupiter | 421,700 | 900 | 2,700 |
| Europa | Jupiter | 671,000 | 1,300 | 3,900 |
| Ganymede | Jupiter | 1,070,400 | 1,800 | 5,400 |
| Callisto | Jupiter | 1,882,700 | 2,400 | 7,200 |
| Enceladus | Saturn | 238,000 | 900 | 2,700 |
| Titan | Saturn | 1,221,900 | 1,700 | 5,100 |
| Phoebe | Saturn | 12,947,000 | 3,000 | 9,000 |
| Triton | Neptune | 354,800 | 1,100 | 3,300 |

### Docks (all invented)

| Dock | Beside | Named for | Its dock file | In the game today |
|---|---|---|---|---|
| Imbrium Dock | Luna | Mare Imbrium, a sea of Luna | fuel 8, repair 0.5, ore 20, yard: kite, ox | a dock; the first station row of the system |
| Arsia High | Mars | Arsia Mons, a volcano of Mars | fuel 9, repair 0.5, ore 22, yard: talon | a dock |
| Himeros Anchorage | Eros | Himeros, the saddle of Eros | fuel 7, repair 0.6, ore 26 | a dock |
| Occator Works | Ceres | Occator, the crater of Ceres with the bright salt | fuel 6, repair 0.5, ore 30, yard: ox | a dock |
| Patroclus Yard | Trojan camp (L5) | Patroclus, a double asteroid among the trojans | fuel 7, repair 0.4, yard: kite, ox, talon, pathfinder, bastion | a dock |
| Perrine Station | Ganymede | Perrine Regio, a dark plain of Ganymede | fuel 8, repair 0.5, ore 24 | a dock |
| Kraken Shore | Titan | Kraken Mare, the largest sea of Titan | fuel 5, repair 0.6, ore 18, yard: pathfinder | a dock |

### Gates (invented)

| Gate | Placed as if at | Ring in the file | Ring in space, px |
|---|---|---|---|
| Lagrange Gate | 1.2 AU | 15,336 | 46,008 |
| Kuiper Gate | 44 AU | 92,865 | 278,595 |

<!-- sol-tables:end -->

## What is real and what is invented

**Real:** the Sun as a G star; every planet, moon and asteroid named above; each one's distance from the Sun (the semi-major axis of its orbit, AU) and each moon's from its planet (km); the planets' longitudes at J2000; Eros as a near-Earth asteroid whose orbit lies between Earth's and Mars's, not in the belt; the trojans as two swarms 60 degrees ahead of and behind Jupiter, and Patroclus as one of them; the features the docks are named for (Mare Imbrium, Arsia Mons, Himeros, Occator, Perrine Regio, Kraken Mare).

**Invented:** every dock and both gates, and their names, which are ours: none is taken from a book, a show or a game. Where an asteroid sits on its ring. How far a moon sits from its planet on the screen. Every size on the screen (a planet is 150 to 520 px across its radius whatever its real size). The three "Main Belt" fields and the two trojan camps as rock fields you can mine: the real belt is a ring of mostly empty space. Sol's place on the galaxy map: Halcyon is not a real star, so 7.8 light years from it means nothing in the sky. How each world is drawn: the game has five kinds of globe (rock, ice, gas, lava, ringed), so Earth is the blue-white "ice" one and Venus the "lava" one.

## What the data model cannot say yet

- **A body that goes round a body: it can now** (card `space-game-bodies-orbit-a-body`). A row may name a `parent`, another body of the same table, and its `orbit` and `angle` are then measured from that body: Luna is `orbit` 1100, `angle` 70, `parent` `sol-earth`, and Imbrium Dock's parent is Luna. Every moon and dock of Sol is written that way; the game keeps the parent on the body, so when bodies move along their orbits a moon turns with its planet. Nothing moves yet.
- **More than one dock in a system.** Done (card `space-game-more-than-one-dock`): every `station` row of a system is a dock, so all seven docks of Sol are drawn, have a dock prompt, and you launch from the one you docked at. Imbrium Dock is the first row, which is where the things that still want one station per system look: the police and traffic when you arrive by a jump, the pump mark on the galaxy map, and the Tab map (it shows the dock you launched from only).
- **Calls.** Imbrium Dock posts two runs home, a courier and a haul to Halcyon Station (its dock file's `## Runs` table). Nothing comes the other way: a run *to* Sol would be a row in Halcyon Station's own file, which a pack that only adds things does not touch. The four first calls (rescue, escort, patrol, bounty) play where their mission files say, in Halcyon and the Roost; Sol has none of its own yet.
- **Landing.** Only Kepler-4b has a surface, so every world of Sol is `landable: no`.
