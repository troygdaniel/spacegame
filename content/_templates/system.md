---
# Copy to content/systems/<id>.md: the file name is the system's id (a-z, 0-9, dashes). Then run: node tools/build-content.mjs
# This file IS the system the game flies. A new id adds a star to the galaxy map; the id of a shipped system replaces it.
type: system
# name: what the galaxy map, the nav panel and the arrival line call it
name: Example Reach
# kind: home, outpost, trade, mining, volcanic, wild, graveyard or nest (the mark on the galaxy map)
kind: mining
# ly: where it is on the galaxy map, [x, y] in light years. A ship jumps as far as its range: Halcyon is at [20, 22]
ly: [14, 26.5]
# size: the width of the square of space, in the units of this file (the game spreads every position 3 times)
size: 36000
# danger: 0 to 5, how many pirates and how often
danger: 2
# traffic: 0 to 3, how many freighters and police (police need 2 or more)
traffic: 1
# pay: what a call paid in this system is multiplied by (leave out for 1)
pay: 1.15
# seed: any whole number; the same seed gives the same look
seed: 7714
# starType: the sun, O B A F G K or M: its colour, its size and the tint of the sky
starType: K
# starX, starY: where the sun is. The middle of the system is size / 2. It is a body you can fly to
starX: 18000
starY: 18000
# pirateMax, pirateEvery: at most this many pirates at once, one new one every this many ms (leave both out for the usual by danger)
pirateMax: 8
pirateEvery: 15000
# ---- the Bodies table below: everything with a place, one row each; leave a cell empty when it does not apply ----
# id        its own id (a-z, 0-9, dashes)
# type      station, planet, belt, poi (a salvage site), scenery or gate
# name      what the player reads
# x, y      where it is, in the units of this file (the game spreads them 3 times). Leave BOTH empty to place it by its orbit instead:
# orbit     how far it is from the sun, in the same units (from the middle of the system when it has no sun)
# angle     where on that ring, in degrees clockwise from north: 0 north, 90 east, 180 south, 270 west (leave empty for 0). The map is north up
#           A row gives x and y, or orbit and angle. With both, x and y are used and the build says the orbit is ignored
# parent    the id of another row of this table: orbit and angle are then measured from THAT body, not the sun (a moon round its planet,
#           a dock beside its moon). Leave empty to go round the sun. A parent may have a parent of its own
# art       how a station or an outpost is drawn: station, outpost, hub, foundry, nest or derelict
# r         its radius in px: a planet, a belt, the ring of a gate (not spread)
# rocks     how many rocks a belt has
# landable  yes or no (only Kepler-4b has a surface to land on today)
# kind      a planet's look (rock, gas, ice, ringed and the rest of the list in docs/MODS.md) or a site's kind (wreck, beacon)
# seed      a planet's own seed: the same number gives the same globe
# look      a scenery's look (derelict)
# labelDy   where the name sits: px above the body when negative
# credits   what a salvage site pays
# A station row needs a file content/stations/<its id>.md with system: set to this system's id. That file is its dock: pump, prices, yard, board.
# ---- the Pirates table: which pirates fly here and the share of each (leave the table out for the usual mix) ----
---
A line or two about the system (the text before the first heading, up to 600 characters).

## Bodies
| id | type | name | x | y | orbit | angle | parent | art | r | rocks | landable | kind | seed | look | labelDy | credits |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| example-smelter | station | Example Smelter | 9000 | 21000 | | | | foundry | | | | | | | -260 | |
| example-3 | planet | Example III | | | 9000 | 45 | | | 300 | | no | rock | 7 | | | |
| example-3a | planet | Example IIIa | | | 900 | 120 | example-3 | | 60 | | no | ice | 9 | | | |
| belt-a | belt | | | | 6000 | 270 | | | 900 | 40 | | | | | | |
| wreck-1 | poi | Old hulk | 30000 | 30000 | | | | | | | | wreck | | | | 150 |
| old-ring | scenery | Dead station | 5000 | 5000 | | | | | | | | | | derelict | -240 | |
| example-gate | gate | Example gate | 2000 | 6000 | | | | | 110 | | | | | | | |

## Pirates
| kind | weight |
|---|---|
| raider | 0.5 |
| drone | 0.5 |
