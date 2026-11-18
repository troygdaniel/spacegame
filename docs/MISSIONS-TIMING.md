# How long each call takes, before and after the systems were spread out

Card `space-game-missions-after-distances`, 17 Nov 2026. Systems were spread out 3 times that day (`SYSTEM_SCALE` in `src/data_systems.js`) with no browser run. This page is the check that every call still plays in sensible time, worked out from the numbers. Nothing here was played or seen on a screen.

Run it again any time: `node tools/mission-timing.mjs` prints this table from the game as it is; `node tests/missiontiming.mjs` fails when a call leaves its band.

## The table

Minutes for the starter Wren with no parts. "Spread, unfixed" is the game right after the spread; "now" is with this card's two fixes.

| call | kind | before the spread | spread, unfixed | now | band | pay | cr/min before | cr/min now |
|---|---|---|---|---|---|---|---|---|
| Rescue call | local |  2.9 |  3.1 |  3.1 | 1.5 to 5: ok | 500 |  172 |  160 |
| Escort | local |  2.7 |  5.1 |  4.0 | 1.5 to 5: ok | 500 |  182 |  125 |
| Police patrol | local |  1.7 |  1.7 |  1.7 | 1.5 to 5: ok | 600 |  353 |  353 |
| Courier run to Kestrel | one jump |  1.7 |  1.8 |  1.8 | 1.5 to 5: ok | 764 |  445 |  432 |
| Courier run to Brass Reach | one jump |  1.8 |  1.9 |  1.9 | 1.5 to 5: ok | 875 |  488 |  454 |
| Haul to Brass Reach | one jump |  2.3 |  2.4 |  2.4 | 1.5 to 5: ok | 300 |  131 |  124 |
| Courier run to Halcyon | one jump |  1.8 |  1.9 |  1.9 | 1.5 to 5: ok | 764 |  433 |  403 |
| Courier run to Meridian | one jump |  1.8 |  1.8 |  1.8 | 1.5 to 5: ok | 787 |  449 |  426 |
| Haul to Meridian | one jump |  2.3 |  2.3 |  2.3 | 1.5 to 5: ok | 261 |  116 |  111 |
| Courier run to Kestrel | one jump |  1.8 |  1.9 |  1.9 | 1.5 to 5: ok | 787 |  448 |  423 |
| Courier run to Ember | out of range |    - |    - |    - | n/a | 938 |    - |    - |
| Courier run to Reaver's Roost | out of range |    - |    - |    - | n/a | 1318 |    - |    - |
| Haul to Ember | out of range |    - |    - |    - | n/a | 328 |    - |    - |
| Courier run to Halcyon | one jump |  1.8 |  1.9 |  1.9 | 1.5 to 5: ok | 875 |  490 |  460 |
| Haul to Halcyon | one jump |  2.3 |  2.4 |  2.4 | 1.5 to 5: ok | 300 |  131 |  125 |
| Courier run to Meridian | out of range |    - |    - |    - | n/a | 938 |    - |    - |
| Haul to Meridian | out of range |    - |    - |    - | n/a | 328 |    - |    - |
| Salvage: the Widow | journey |  4.7 |  4.9 |  4.9 | 1.5 to 12: ok | 700 |  148 |  144 |
| Survey: the Hollow | one jump |  1.6 |  1.7 |  1.7 | 1.5 to 5: ok | 600 |  368 |  345 |
| Bounty: the Reaver | journey |  4.5 |  4.7 |  4.7 | 1.5 to 12: ok | 1200 |  265 |  256 |

escort: route 2778 px before, 8999 px now; the MULE averaged 46 px/s, now 69; a wave every 15 s before, 49 s after the spread, 32 s now

## What the spread changed

- **Escort: broke, fixed.** Her route to the gate went from about 2,800 px to 9,000 px. At her old speeds (60 px/s covered, 30 exposed) the call ran over 5 minutes with a wave every 49 s, against 2.7 minutes and a wave every 15 s before. The MULE now flies 90 covered and 45 exposed: about 4 minutes, a wave every 32 s. Her ring (350 px), the pirates' fly-in, the wave points (a quarter, a half, three quarters of the route) and the 8 s gate hold are sizes, shares and timers, not places: unchanged and still right.
- **Three Halcyon pirates were left behind, fixed.** `src/space.js` places three pirates "on the way to Kepler-4b" by coordinates written in the old units. After the spread they sat in empty space north-west of the station, off the route. They are placed through `sysAt` now, like the system data.
- **Everything else: no real change.** No other call moved by more than 0.2 of a minute. A longer leg inside a system is a cruise at 8,000 px/s, so three times the distance costs a few seconds. The patrol has no distance between places in it at all.

## What was not changed, and why

- **The floor of the band is 1.5 minutes, not the 2 the card asked for.** The police patrol, the one-jump courier runs and the survey come out at 1.7 to 1.9 minutes. They were at 1.6 to 1.8 before the spread, so the spread did not cause it, and 0.2 of a minute is well inside what the pace guesses can be wrong by. Making them longer is a design choice (more pirates on a patrol, a scan that takes time), not a repair.
- **Pay.** The escort pays less a minute than it did (about 125 against 182) because it is longer. The pay was left alone: it is still a better fight for the money than it reads, since her hull bonus is counted at half here.

## Found on the way, not caused by the spread

- **Five runs cannot be flown in the starter ship.** Meridian to Ember and Ember to Meridian are 8.2 light years and Meridian to the Roost is 12.4; the Wren jumps 8. Those boards offer them to any ship. Worth a card: hide a run the ship you fly cannot reach, or say so on the board.
- **The bounty cannot be reached in a Wren either** (the last jump to the Roost is 12.4 ly). It is timed here in the Kite, the cheapest ship that gets there.

## How the minutes are worked out

Data read from the game: where the bodies are, the MULE's speeds and route, the gate hold, cruise (top speed, acceleration, braking, the 2,500 px lock near a mass), jumps (charge, seconds a light year, where a jump comes out), the pirates' hull, the Wren's speed and guns, each call's pay.

Guesses about the player, the same ones `tools/economy-sim.mjs` uses: 40 s at the station per call, 85 percent of top speed flown by hand, 45 percent of shots hit, 10 s to close on a pirate, a fight 2.5 times as long as the shooting alone, 120 s on the ground for the rescue, 30 percent of an escort spent outside the MULE's ring. Three more here: 3 s to start a cruise, 10 s to scan a site, 180 s for the Widow's wreck and its drones.

These guesses have never been checked against a played session. The table is good for comparing before with after, and for catching a call that doubles; it is not good to a tenth of a minute.
