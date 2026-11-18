---
# Sol, our own solar system. MADE by mods/sol/_make.mjs from one table of bodies: change that file and run it, do not edit this one by hand.
# The scale, the table of every body with its real distance, and what is invented: docs/SOL.md.
type: system
name: Sol
kind: trade
# where it is on the galaxy map: 7.8 light years from Halcyon, so the starter ship can jump here (invented: Halcyon is not a real star)
ly: [26, 27]
size: 1000000
danger: 1
traffic: 3
seed: 1969
# the Sun: a G star, in the middle
starType: G
starX: 500000
starY: 500000
---
Where we started. Eight planets, their moons, a belt of rock between Mars and Jupiter, and seven docks named for the ground under them. The distances are squeezed: a ring is the square root of the real one.

## Bodies
| id | type | name | x | y | orbit | angle | art | r | rocks | landable | kind | seed | look | labelDy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sol-imbrium-dock | station | Imbrium Dock | 488470 | 431182 |  |  | hub |  |  |  |  |  |  | -260 |
| sol-mercury | planet | Mercury |  |  | 43547 | 197.75 |  | 150 |  | no | rock | 11 |  |  |
| sol-venus | planet | Venus |  |  | 59521 | 268.02 |  | 280 |  | no | lava | 12 |  |  |
| sol-earth | planet | Earth |  |  | 70000 | 349.54 |  | 300 |  | no | ice | 13 |  |  |
| sol-luna | planet | Luna | 488326 | 430787 |  |  |  | 90 |  | no | rock | 31 |  |  |
| sol-eros | planet | Eros |  |  | 84523 | 140 |  | 45 |  | no | rock | 14 |  |  |
| sol-himeros-anchorage | scenery | Himeros Anchorage | 554001 | 564558 |  |  |  |  |  |  |  |  | foundry | -240 |
| sol-mars | planet | Mars |  |  | 86415 | 94.55 |  | 200 |  | no | rock | 15 |  |  |
| sol-phobos | planet | Phobos | 586443 | 506335 |  |  |  | 30 |  | no | rock | 32 |  |  |
| sol-deimos | planet | Deimos | 585835 | 507701 |  |  |  | 28 |  | no | rock | 33 |  |  |
| sol-arsia-high | scenery | Arsia High | 586547 | 507002 |  |  |  |  |  |  |  |  | hub | -240 |
| sol-vesta | planet | Vesta |  |  | 107582 | 250 |  | 60 |  | no | rock | 16 |  |  |
| sol-ceres | planet | Ceres |  |  | 116440 | 20 |  | 80 |  | no | ice | 17 |  |  |
| sol-occator-works | scenery | Occator Works | 539519 | 390839 |  |  |  |  |  |  |  |  | foundry | -240 |
| sol-pallas | planet | Pallas |  |  | 116545 | 200 |  | 60 |  | no | rock | 18 |  |  |
| sol-belt-inner | belt | Main Belt, Vesta side |  |  | 103827 | 262 |  | 900 | 30 |  |  |  |  |  |
| sol-belt-ceres | belt | Main Belt, Ceres side |  |  | 119206 | 8 |  | 1100 | 40 |  |  |  |  |  |
| sol-belt-outer | belt | Main Belt, far side |  |  | 123248 | 190 |  | 1000 | 35 |  |  |  |  |  |
| sol-jupiter | planet | Jupiter |  |  | 159671 | 55.6 |  | 520 |  | no | gas | 19 |  |  |
| sol-io | planet | Io | 632055 | 408945 |  |  |  | 70 |  | no | lava | 34 |  |  |
| sol-europa | planet | Europa | 632583 | 410787 |  |  |  | 60 |  | no | ice | 35 |  |  |
| sol-ganymede | planet | Ganymede | 630056 | 410407 |  |  |  | 95 |  | no | rock | 36 |  |  |
| sol-perrine-station | scenery | Perrine Station | 630430 | 410341 |  |  |  |  |  |  |  |  | hub | -240 |
| sol-callisto | planet | Callisto | 630547 | 407713 |  |  |  | 90 |  | no | rock | 37 |  |  |
| sol-greeks | belt | Greek camp (L4) |  |  | 159671 | 355.6 |  | 900 | 25 |  |  |  |  |  |
| sol-trojans | belt | Trojan camp (L5) |  |  | 159671 | 115.6 |  | 900 | 25 |  |  |  |  |  |
| sol-patroclus-yard | scenery | Patroclus Yard | 644415 | 568494 |  |  |  |  |  |  |  |  | foundry | -240 |
| sol-saturn | planet | Saturn |  |  | 216174 | 40.06 |  | 480 |  | no | ringed | 20 |  |  |
| sol-enceladus | planet | Enceladus | 640013 | 334703 |  |  |  | 35 |  | no | ice | 38 |  |  |
| sol-titan | planet | Titan | 638034 | 335849 |  |  |  | 100 |  | no | rock | 39 |  |  |
| sol-kraken-shore | scenery | Kraken Shore | 637688 | 335649 |  |  |  |  |  |  |  |  | hub | -240 |
| sol-phoebe | planet | Phoebe | 638101 | 331728 |  |  |  | 30 |  | no | rock | 40 |  |  |
| sol-uranus | planet | Uranus |  |  | 306645 | 136.77 |  | 360 |  | no | ice | 21 |  |  |
| sol-neptune | planet | Neptune |  |  | 383853 | 145.12 |  | 350 |  | no | gas | 22 |  |  |
| sol-triton | planet | Triton | 720463 | 814344 |  |  |  | 70 |  | no | ice | 41 |  |  |
| sol-pluto | planet | Pluto |  |  | 439832 | 211.07 |  | 110 |  | no | ice | 23 |  |  |
| sol-inner-gate | gate | Lagrange Gate |  |  | 76681 | 310 |  | 110 |  |  |  |  |  |  |
| sol-outer-gate | gate | Kuiper Gate |  |  | 464327 | 215 |  | 110 |  |  |  |  |  |  |
