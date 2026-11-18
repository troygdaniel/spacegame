---
# Sol, our own solar system. MADE by mods/sol/_make.mjs from one table of bodies: change that file and run it, do not edit this one by hand.
# The scale, the table of every body with its real distance, and what is invented: docs/SOL.md.
type: system
name: Sol
kind: trade
# where it is on the galaxy map: 7.8 light years from Halcyon, so the starter ship can jump here (invented: Halcyon is not a real star)
ly: [26, 27]
size: 200000
danger: 1
traffic: 3
seed: 1969
# the Sun: a G star, in the middle
starType: G
starX: 100000
starY: 100000
---
Where we started. Eight planets, their moons, a belt of rock between Mars and Jupiter, and seven docks named for the ground under them. The distances are squeezed: a ring is the square root of the real one.

## Bodies
| id | type | name | x | y | orbit | angle | art | r | rocks | landable | kind | seed | look | labelDy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sol-imbrium-dock | station | Imbrium Dock | 98636 | 86252 |  |  | hub |  |  |  |  |  |  | -260 |
| sol-mercury | planet | Mercury |  |  | 8709 | 197.75 |  | 150 |  | no | rock | 11 |  |  |
| sol-venus | planet | Venus |  |  | 11904 | 268.02 |  | 280 |  | no | lava | 12 |  |  |
| sol-earth | planet | Earth |  |  | 14000 | 349.54 |  | 300 |  | no | ice | 13 |  |  |
| sol-luna | planet | Luna | 98492 | 85857 |  |  |  | 90 |  | no | rock | 31 |  |  |
| sol-eros | planet | Eros |  |  | 16905 | 140 |  | 45 |  | no | rock | 14 |  |  |
| sol-himeros-anchorage | scenery | Himeros Anchorage | 110537 | 112760 |  |  |  |  |  |  |  |  | foundry | -240 |
| sol-mars | planet | Mars |  |  | 17283 | 94.55 |  | 200 |  | no | rock | 15 |  |  |
| sol-phobos | planet | Phobos | 117529 | 100851 |  |  |  | 30 |  | no | rock | 32 |  |  |
| sol-deimos | planet | Deimos | 116921 | 102217 |  |  |  | 28 |  | no | rock | 33 |  |  |
| sol-arsia-high | scenery | Arsia High | 117633 | 101518 |  |  |  |  |  |  |  |  | hub | -240 |
| sol-vesta | planet | Vesta |  |  | 21516 | 250 |  | 60 |  | no | rock | 16 |  |  |
| sol-ceres | planet | Ceres |  |  | 23288 | 20 |  | 80 |  | no | ice | 17 |  |  |
| sol-occator-works | scenery | Occator Works | 107659 | 78373 |  |  |  |  |  |  |  |  | foundry | -240 |
| sol-pallas | planet | Pallas |  |  | 23309 | 200 |  | 60 |  | no | rock | 18 |  |  |
| sol-belt-inner | belt | Main Belt, Vesta side |  |  | 20765 | 262 |  | 900 | 30 |  |  |  |  |  |
| sol-belt-ceres | belt | Main Belt, Ceres side |  |  | 23841 | 8 |  | 1100 | 40 |  |  |  |  |  |
| sol-belt-outer | belt | Main Belt, far side |  |  | 24650 | 190 |  | 1000 | 35 |  |  |  |  |  |
| sol-jupiter | planet | Jupiter |  |  | 31934 | 55.6 |  | 520 |  | no | gas | 19 |  |  |
| sol-io | planet | Io | 126657 | 81112 |  |  |  | 70 |  | no | lava | 34 |  |  |
| sol-europa | planet | Europa | 127185 | 82954 |  |  |  | 60 |  | no | ice | 35 |  |  |
| sol-ganymede | planet | Ganymede | 124658 | 82574 |  |  |  | 95 |  | no | rock | 36 |  |  |
| sol-perrine-station | scenery | Perrine Station | 125032 | 82508 |  |  |  |  |  |  |  |  | hub | -240 |
| sol-callisto | planet | Callisto | 125149 | 79880 |  |  |  | 90 |  | no | rock | 37 |  |  |
| sol-greeks | belt | Greek camp (L4) |  |  | 31934 | 355.6 |  | 900 | 25 |  |  |  |  |  |
| sol-trojans | belt | Trojan camp (L5) |  |  | 31934 | 115.6 |  | 900 | 25 |  |  |  |  |  |
| sol-patroclus-yard | scenery | Patroclus Yard | 129217 | 113300 |  |  |  |  |  |  |  |  | foundry | -240 |
| sol-saturn | planet | Saturn |  |  | 43235 | 40.06 |  | 480 |  | no | ringed | 20 |  |  |
| sol-enceladus | planet | Enceladus | 128712 | 67065 |  |  |  | 35 |  | no | ice | 38 |  |  |
| sol-titan | planet | Titan | 126733 | 68211 |  |  |  | 100 |  | no | rock | 39 |  |  |
| sol-kraken-shore | scenery | Kraken Shore | 126387 | 68011 |  |  |  |  |  |  |  |  | hub | -240 |
| sol-phoebe | planet | Phoebe | 126800 | 64090 |  |  |  | 30 |  | no | rock | 40 |  |  |
| sol-uranus | planet | Uranus |  |  | 61329 | 136.77 |  | 360 |  | no | ice | 21 |  |  |
| sol-neptune | planet | Neptune |  |  | 76771 | 145.12 |  | 350 |  | no | gas | 22 |  |  |
| sol-triton | planet | Triton | 144855 | 162429 |  |  |  | 70 |  | no | ice | 41 |  |  |
| sol-pluto | planet | Pluto |  |  | 87966 | 211.07 |  | 110 |  | no | ice | 23 |  |  |
| sol-inner-gate | gate | Lagrange Gate |  |  | 15336 | 310 |  | 110 |  |  |  |  |  |  |
| sol-outer-gate | gate | Kuiper Gate |  |  | 92865 | 215 |  | 110 |  |  |  |  |  |  |
