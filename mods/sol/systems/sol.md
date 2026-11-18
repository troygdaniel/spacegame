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
| id | type | name | x | y | orbit | angle | parent | art | r | rocks | landable | kind | seed | look | labelDy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sol-imbrium-dock | station | Imbrium Dock |  |  | 420 | 160 | sol-luna | hub |  |  |  |  |  |  | -260 |
| sol-mercury | planet | Mercury |  |  | 8709 | 197.75 |  |  | 150 |  | no | rock | 11 |  |  |
| sol-venus | planet | Venus |  |  | 11904 | 268.02 |  |  | 280 |  | no | lava | 12 |  |  |
| sol-earth | planet | Earth |  |  | 14000 | 349.54 |  |  | 300 |  | no | ice | 13 |  |  |
| sol-luna | planet | Luna |  |  | 1100 | 70 | sol-earth |  | 90 |  | no | rock | 31 |  |  |
| sol-eros | planet | Eros |  |  | 16905 | 140 |  |  | 45 |  | no | rock | 14 |  |  |
| sol-himeros-anchorage | station | Himeros Anchorage |  |  | 380 | 300 | sol-eros | foundry |  |  |  |  |  |  | -260 |
| sol-mars | planet | Mars |  |  | 17283 | 94.55 |  |  | 200 |  | no | rock | 15 |  |  |
| sol-phobos | planet | Phobos |  |  | 600 | 30 | sol-mars |  | 30 |  | no | rock | 32 |  |  |
| sol-deimos | planet | Deimos |  |  | 900 | 200 | sol-mars |  | 28 |  | no | rock | 33 |  |  |
| sol-arsia-high | station | Arsia High |  |  | 430 | 110 | sol-mars | hub |  |  |  |  |  |  | -260 |
| sol-vesta | planet | Vesta |  |  | 21516 | 250 |  |  | 60 |  | no | rock | 16 |  |  |
| sol-ceres | planet | Ceres |  |  | 23288 | 20 |  |  | 80 |  | no | ice | 17 |  |  |
| sol-occator-works | station | Occator Works |  |  | 400 | 230 | sol-ceres | foundry |  |  |  |  |  |  | -260 |
| sol-pallas | planet | Pallas |  |  | 23309 | 200 |  |  | 60 |  | no | rock | 18 |  |  |
| sol-belt-inner | belt | Main Belt, Vesta side |  |  | 20765 | 262 |  |  | 900 | 30 |  |  |  |  |  |
| sol-belt-ceres | belt | Main Belt, Ceres side |  |  | 23841 | 8 |  |  | 1100 | 40 |  |  |  |  |  |
| sol-belt-outer | belt | Main Belt, far side |  |  | 24650 | 190 |  |  | 1000 | 35 |  |  |  |  |  |
| sol-jupiter | planet | Jupiter |  |  | 31934 | 55.6 |  |  | 520 |  | no | gas | 19 |  |  |
| sol-io | planet | Io |  |  | 900 | 20 | sol-jupiter |  | 70 |  | no | lava | 34 |  |  |
| sol-europa | planet | Europa |  |  | 1300 | 140 | sol-jupiter |  | 60 |  | no | ice | 35 |  |  |
| sol-ganymede | planet | Ganymede |  |  | 1800 | 250 | sol-jupiter |  | 95 |  | no | rock | 36 |  |  |
| sol-perrine-station | station | Perrine Station |  |  | 380 | 80 | sol-ganymede | hub |  |  |  |  |  |  | -260 |
| sol-callisto | planet | Callisto |  |  | 2400 | 330 | sol-jupiter |  | 90 |  | no | rock | 37 |  |  |
| sol-greeks | belt | Greek camp (L4) |  |  | 31934 | 355.6 |  |  | 900 | 25 |  |  |  |  |  |
| sol-trojans | belt | Trojan camp (L5) |  |  | 31934 | 115.6 |  |  | 900 | 25 |  |  |  |  |  |
| sol-patroclus-yard | station | Patroclus Yard |  |  | 650 | 40 | sol-trojans | foundry |  |  |  |  |  |  | -260 |
| sol-saturn | planet | Saturn |  |  | 43235 | 40.06 |  |  | 480 |  | no | ringed | 20 |  |  |
| sol-enceladus | planet | Enceladus |  |  | 900 | 100 | sol-saturn |  | 35 |  | no | ice | 38 |  |  |
| sol-titan | planet | Titan |  |  | 1700 | 220 | sol-saturn |  | 100 |  | no | rock | 39 |  |  |
| sol-kraken-shore | station | Kraken Shore |  |  | 400 | 300 | sol-titan | hub |  |  |  |  |  |  | -260 |
| sol-phoebe | planet | Phoebe |  |  | 3000 | 340 | sol-saturn |  | 30 |  | no | rock | 40 |  |  |
| sol-uranus | planet | Uranus |  |  | 61329 | 136.77 |  |  | 360 |  | no | ice | 21 |  |  |
| sol-neptune | planet | Neptune |  |  | 76771 | 145.12 |  |  | 350 |  | no | gas | 22 |  |  |
| sol-triton | planet | Triton |  |  | 1100 | 60 | sol-neptune |  | 70 |  | no | ice | 41 |  |  |
| sol-pluto | planet | Pluto |  |  | 87966 | 211.07 |  |  | 110 |  | no | ice | 23 |  |  |
| sol-inner-gate | gate | Lagrange Gate |  |  | 15336 | 310 |  |  | 110 |  |  |  |  |  |  |
| sol-outer-gate | gate | Kuiper Gate |  |  | 92865 | 215 |  |  | 110 |  |  |  |  |  |  |
