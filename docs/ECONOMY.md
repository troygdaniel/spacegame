# Long Haul: the economy (numbers, and a simulator that keeps them honest)

Card `space-game-economy-numbers`. This is the prep for card `space-game-u-e4-economy`: what the game pays and charges today, what each loop earns an hour, and the prices
that put the three milestones where the plan wants them (first upgrade in about 10 minutes, first new ship in about an hour, the full fleet in several hours).
Docs and a script only: nothing in the game changes here. E4 implements.

Run it: `node tools/economy-sim.mjs` (all tables), or one of `income prices losses pacing tune planned systems check`. `--eff 0.25` changes the efficiency guess.
Every table below is printed by that script from the game's own files, on main `a2aa7ae`. If a table here disagrees with the script, the script is right.

## 1. How to read the numbers

Three kinds of number go into the script, and the tables say which is which:

| Kind | What it is | Where it comes from |
|---|---|---|
| **DATA** | ship and part tables, call rewards, bounties, ore price, rock hit points, belts, spawn table, positions, the shop's price function | read from `src/` when the script runs (the game's own scripts are run in a sandbox) |
| **PINNED** | numbers that sit in a code line instead of a table: repair half a credit a point, insurance 20% (min 50), the MULE's speed, pod size, the rock split | copied once; `tools/economy-sim.mjs check` (smoke step 4y) greps the source and fails when a pinned line has changed, so a stale pin is noticed |
| **PACE** | how a player plays: seconds for a step, hit rate, how much of a session is spent earning | **guesses.** Nothing in the game knows them. They are all in one block at the top of the script |

The one guess that moves every answer is **efficiency**: the share of play time spent in a loop. The rest of a session is reading, shopping, flying about, learning the
controls and dying. It is set to 35%. Section 6 shows how the answers move with it, and section 11 says how to measure it in twenty minutes.

## 2. What the game pays and charges today (DATA)

| Thing | Value | Where |
|---|---|---|
| Rescue, Escort, Police patrol, Reaver bounty | 500, 400, 600, 1,200 | `missions.js` |
| Kill bounty | raider 45, drone 40, gunship 100; the Reaver 150 | `enemies.js`, `missions.js` |
| Patrol | 600 plus five wanted drones at 40 each | `missions.js` |
| Salvage pod | 70% credits (10 to 40), 30% hull; five fixed wrecks pay 720 once, 450 of it guarded | `enemies.js`, `data_systems.js` |
| Ore | 20 a unit at Halcyon; the Kepler belt (15 rocks) holds about 37.5 ore | `asteroids.js` |
| Repair | half a credit a point of hull (a full Wren repair is 50) | `station.js` |
| Insurance | 20% of your credits, never less than 50 | `space.js` |
| Parts, tier 1 / 2 / 3 on the Wren | shields 300 / 500 / 1,000; weapons 400 / 600 / 1,200; engine 350 / 550 / 1,100; tank 250 / 450 / 900; cargo 250 / 450 / 900 | `data_parts.js` |
| Ships | Kite 4,500, Ox 6,500, Talon 8,500, Pathfinder 11,000, Bastion 24,000; sells for 60%, parts for 50% | `data_ships.js`, `fleet.js` |
| Pirate spawn at Halcyon | one every 15 s up to 8; raider 25%, drone 35%, gunship 40% | `data_systems.js` |

## 3. Income per hour, each loop (the Wren, no parts, at Halcyon)

| Loop | Credits a run | Time a run | cr/h flat out | cr/h at 35% |
|---|---|---|---|---|
| Rescue call | 500 | 175 s | 10,311 | 3,609 |
| Escort the MULE | 600 | 109 s | 19,871 | 6,955 |
| Police patrol | 800 | 102 s | 28,276 | 9,897 |
| Reaver bounty | 1,481 | 150 s | 35,546 | 12,441 |
| Mining, Kepler belt | 200 | 98 s | 7,332 | 2,566 |
| Free hunting | 83 a kill | 15 s a kill | 19,860 | 6,951 |

Escort is 400 plus five ambush drones; patrol is 600 plus five drones; the Reaver is 1,200 plus its own 150 and two escorts. Free hunting is held back by the spawner
(one pirate every 15 s), not by how fast you kill. Salvage is a one-off (720 cr) and mining is held back by the hold (10 ore) and, for the Ox, by the belt: one Kepler belt
holds 37.5 ore, so a 40-ore hold cannot be filled in one flight there.

What this says, in order of how much it matters:

1. **Rescue, the call the guide sends you to first, is the slowest call.** Its 120 s on the ground (a PACE guess) is the long part. Escort pays 1.9 times as much an hour, patrol
   2.7 times, the Reaver 3.4 times. Mining is the only loop below it.
2. **The Reaver is repeatable** (the board offers it after one patrol and every time after) and is the best loop in the game by a wide margin. Either it is meant to be
   farmed and then the rest are too low, or it is not.
3. **Hunting pirates for nothing beats the rescue** (1.9 times, with no board, no ground leg and the spawner as the only limit).
4. **No ship earns much more than another on today's loops.** At Halcyon the six are within about 5% of each other on the board calls (table "income by ship" in `income`): a faster
   ship saves seconds of flying, a stronger one seconds of fighting. The Kite's 14 ly range also reaches the best-paying system, so the career in section 5 never switches to a later
   ship. The later ships need work of their own (haul for the Ox, survey and long courier for the Pathfinder, the rough systems for the Talon and Bastion): section 8.

## 4. Prices

Ships (fuel at 8 cr a unit; "all tiers it fits" is every tier of every slot up to the ship's `maxTier`):

| Ship | Price | Sells for | All tier 1 | All tiers it fits | Full tank | Full repair | Fuel cr/ly |
|---|---|---|---|---|---|---|---|
| Wren | 0 | 0 | 1,550 | 9,200 | 320 | 50 | 8 |
| Kite | 4,500 | 2,700 | 1,240 | 3,800 | 240 | 35 | 4.8 |
| Ox | 6,500 | 3,900 | 1,860 | 8,280 | 560 | 85 | 12.8 |
| Talon | 8,500 | 5,100 | 1,720 | 7,670 | 224 | 65 | 9.6 |
| Pathfinder | 11,000 | 6,600 | 1,720 | 6,740 | 720 | 45 | 5.6 |
| Bastion | 24,000 | 14,400 | 2,790 | 14,580 | 480 | 160 | 16 |

**Parts: keep them.** Tier 3 costs 3 to 3.6 times tier 1 and gives 3.4 times the shield, 3.2 times the fire rate, +25% speed, a double tank, a hold +14. That is a fair curve, and
the first part (400 for weapons 1) arrives about when the first rescue pays (section 5). A part's price on another ship is the Wren price times that ship's `partMult`
(0.8 to 1.8) and a station's `partMult` (below): both already work.

## 5. Pacing: today's prices

The script buys in a fixed order (Wren tier 1 parts, then the Kite, Ox, Talon, Pathfinder, Bastion, each with a few parts) and flies whichever ship it owns earns most.
"Typical" is the four board calls in turn; "best" is the best loop each time. Deaths cost 0.5 an hour. The first credit comes when the first call is finished.

| Milestone | Target | Typical (35%) | Best loop (35%) |
|---|---|---|---|
| First upgrade (Wren weapons 1, 400) | about 10 min | 9 min | 9 min |
| First new ship (Kite 4,500 with the first parts) | about 1 h | **36 min** | 29 min |
| The full fleet (about 54,500 plus parts) | several hours | 5 h 01 min | 3 h 13 min |

So today's prices are right for the first upgrade, too cheap for the first ship, and short of "several hours" for the fleet. The income rate flattens at the Kite (about 14,000 cr/h
at 35%) because no later ship earns more (section 3, point 4): everything after the Kite is bought at the same rate.

## 6. Pacing: the proposed ship prices

Ships are the money sink, so they are what is tuned; parts stay. Two curves, each solved so the first new ship comes at about 60 minutes:

| Ship | Now | A: today's curve scaled | B: a flatter curve (**proposed**) | B / Kite | B sells for |
|---|---|---|---|---|---|
| Kite | 4,500 | 8,500 | **8,500** | 1.0 | 5,100 |
| Ox | 6,500 | 12,500 | **12,000** | 1.4 | 7,200 |
| Talon | 8,500 | 16,500 | **15,500** | 1.8 | 9,300 |
| Pathfinder | 11,000 | 21,500 | **20,000** | 2.3 | 12,000 |
| Bastion | 24,000 | 46,500 | **35,000** | 4.0 | 21,000 |

A: first upgrade 9 min, first new ship 59 min, full fleet 9 h 30 min (best loop 41 min and 5 h 52 min).
B: first upgrade 9 min, first new ship 59 min, full fleet 8 h 06 min (best loop 41 min and 5 h 04 min).

I propose B: the first ship at an hour, the fleet in about 8 hours of typical play (5 for a player who picks the best loop). Curve A is a straight scale of the doc's prices; its
top ship is too far away: the Bastion costs 5.3 times the Kite, and the fleet takes about 9.5 hours of typical play however the scale is set.

**This depends on efficiency, which is a guess:**

| Efficiency | Kite (B) | Bastion (B) | First new ship at today's prices | Fleet at today's prices |
|---|---|---|---|---|
| 25% | 5,500 | 23,000 | 50 min | 7 h 10 min |
| 35% | 8,500 | 35,000 | 36 min | 5 h 01 min |
| 50% | 13,000 | 53,000 | 28 min | 3 h 28 min |

If a real session turns out at 25%, today's prices are close to right. At 50% every ship price must roughly triple. Do not change ship prices in the game until section 11 has
been measured; put the ship prices in a data file E4 can edit (`src/data_ships.js` already is one) and rerun `node tools/economy-sim.mjs tune --eff <measured>`.

## 7. Fuel, repair and insurance

**Fuel unit prices: keep the plan's** (`docs/UNIVERSE.md` 3): Halcyon 8, Kestrel 7, Meridian 9, miners 6 (Brass Reach and Ember), the Roost 15, none in the Hollow or Lethe.
A full tank is 224 to 720 cr (a Pathfinder at Halcyon is the top), about 2 to 5 minutes of typical income: a stop, not a tax.

The real test is fuel against what a jump earns. A Halcyon to Kestrel hop (6.3 ly) burns 50 cr of fuel. Against the **design** courier pay (200 + 90 a ly = 764) that is 7%; against
the **proposed** pay in section 8 (300 + 20 a ly = 425) it is 12%, 10 to 16% across the other hops. That matches the plan's wording ("about one rescue payout in ten") and is where fuel
becomes a decision. If a measured session pushes the courier lower, fuel unit prices go down with it; keep fuel between 10% and 15% of a courier call.

**Repair is cheap and should stay so.** Half a credit a point: a full Wren repair is 50, a Bastion's 160, six hull points a kill is 3 cr. It matters only at the Roost (x1.5).

**Insurance is the real sink and it scales with what you hold.**

| Credits held | Fee | Minutes of typical income (8,225 cr/h at 35%) |
|---|---|---|
| 500 | 100 | 0.7 |
| 2,000 | 400 | 2.9 |
| 5,000 | 1,000 | 7.3 |
| 10,000 | 2,000 | 14.6 |
| 25,000 | 5,000 | 36.5 |

At half a death an hour with 5,000 saved, insurance takes about 6% of income. That is a good number: dying is a setback, never a disaster, and saving up to a ship does not
turn into a trap. Keep it.

## 8. New calls: price them next to the rescue

The plan's new calls (`docs/UNIVERSE.md` 11) are priced far above the rescue for the time they take. `node tools/economy-sim.mjs planned`:

| Call | Design pay | Time | cr/h flat | vs rescue | Proposed pay | vs rescue |
|---|---|---|---|---|---|---|
| Rescue (built) | 500 | 175 s | 10,311 | 1.0 | 500 | 1.0 |
| Courier, 6.3 ly | 200 + 90/ly = 767 | 120 s | 22,995 | 2.2 | **300 + 20/ly = 426** | 1.2 |
| Courier, 12 ly (Kite) | 1,280 | 129 s | 35,666 | 3.5 | 540 | 1.5 |
| Haul, Ox full hold, 6.3 ly | 20 per ore unit per 5 ly = 1,008 | 150 s | 24,179 | 2.3 | **11 per ore unit per 5 ly = 554** | 1.3 |
| Survey | 600 | 270 s | 7,998 | 0.8 | **900** | 1.2 |
| The big wreck at Lethe (once) | 800 | 384 s | 7,506 | 0.7 | 800 (one-off) | one-off |

The courier and haul times include the dock, the pump, the flight out, the tunnel and the flight in; they are mostly flying, so they should pay a little more than the rescue an
hour (1.2 to 1.5 times), not three. Survey needed a raise because it is slow. The one-off wreck is a prize, so it stays.

**The ships should be paid for what they are for.** If every ship earns the same, nobody buys the second ship after the Kite. E4 should pay the Ox its hold (haul), the Pathfinder its
range and sensor (long courier, survey, the far wrecks), and give the Talon and Bastion the two rough systems (Ember and the Roost, below) where the pay is up to 1.6 times.

**The built calls.** The rescue stays at 500 (the guide, the tests and the toasts say so). Options for E4, cheapest first: (1) leave them; (2) pay the Reaver 1,200 once and 400
on repeats (its repeat run then pays about 680 for 150 s: 1.6 times the rescue, which fits the hardest call); (3) lift the rescue to 700 so it stops being the slowest. I recommend (2).

## 9. Systems: price multipliers for the eight (proposal for E4)

Fuel and ore are the plan's numbers. The others are one rule each: **pay = 1 + 0.15 for each danger step above 1** (the hub adds 0.1 for its better board); **parts = 0.9 at the
hub, 1.1 at a far outpost, 1.25 at the nest** (the plan); **repair = 1.5 at the nest**. Put them in each system's data: `dock.partMult` already exists, `pay` and `repair`
are new fields for E4.

| System | Kind | Danger | Fuel/unit | Full Wren tank | Ore/unit | Parts x | Pay x | Repair x | What it does to your day |
|---|---|---|---|---|---|---|---|---|---|
| Halcyon | home | 1 | 8 | 320 | 20 | 1.00 | 1.00 | 1.0 | everything; the baseline |
| Kestrel | frontier outpost | 1 | 7 | 280 | - | 1.10 | 1.00 | 1.0 | no bar, parts to tier 1, cheap fuel |
| Meridian | trade hub | 1 | 9 | 360 | 26 | 0.90 | 1.10 | 1.0 | best shop and yard, six calls |
| Brass Reach | mining | 2 | 6 | 240 | 30 | 1.00 | 1.15 | 1.0 | ore 30, rich belts, raiders hunt miners |
| The Hollow | empty wild | 2 | none | - | - | - | - | - | no station: bring fuel home |
| Lethe | derelict | 2 | none | - | - | - | - | - | no station: fourteen wrecks, one pays 800 |
| Ember | volcanic mining | 3 | 6 | 240 | 28 | 1.00 | 1.30 | 1.0 | weapons parts to tier 3, heavy raiding |
| Reaver's Roost | pirate nest | 5 | 15 | 600 | - | 1.25 | 1.60 | 1.5 | no police, salvage at double, gouging |

Ore: a full hold is 200 at Halcyon, 260 at Meridian, 300 at Brass Reach and 280 at Ember for the Wren, and 800, 1,040, 1,200 and 1,120 for the Ox. A Kepler-size belt holds about 37.5
ore, so a 40-ore hold needs a bigger belt (the Slag Belt holds about 100) or two flights: the belts, not the price, limit mining.

Jumps with the Wren (8 ly, 1 fuel a ly), fuel and its share of the proposed courier pay:

| Hop | ly | In range | Fuel cr | Share of the proposed courier |
|---|---|---|---|---|
| Halcyon to Kestrel | 6.3 | yes | 50 | 12% |
| Halcyon to Brass Reach | 7.5 | yes | 60 | 13% |
| Halcyon to The Hollow | 7.9 | yes | 63 | 14% |
| Kestrel to Meridian | 6.5 | yes | 46 | 11% |
| Halcyon to Meridian | 9.3 | no (the Kite, or two hops) | 75 | 15% |
| Meridian to Ember | 8.2 | no (one engine tier) | 74 | 16% |
| Kestrel to the Roost | 12.2 | no (a Kite or Pathfinder) | 85 | 16% |

## 10. What E4 should do with this

1. Ship prices from curve B (section 6), in `data_ships.js`, as the starting values until section 11 is measured. Parts, fuel unit prices, repair and insurance stay.
2. New calls at the proposed pay (section 8): courier 300 + 20 a ly, haul 11 per ore unit per 5 ly, survey 900.
3. Per-system `pay`, `partMult` and `repair` fields from section 9; fuel and ore from the plan.
4. Decide the Reaver (section 8, option 2 is recommended): this is the one built call whose pay needs a code change and a saved flag.
5. Give each later ship its own work (section 8), or every purchase after the Kite is a trophy.
6. After the change, run `node tools/economy-sim.mjs` again and replace the DATA tables here; the PACE block and the pins are the only things to keep by hand.

## 11. What to measure (twenty minutes, one person)

Everything above that is a guess comes down to one number. Play the game the way you normally do for twenty minutes, from a new save: note the credits at the start and at the end,
and the minutes. Efficiency is `credits an hour you really earned / 23,501` (23,501 cr/h is the typical call flat out, printed by `node tools/economy-sim.mjs income`). Then
`node tools/economy-sim.mjs tune --eff <that>` prints the ship prices for it. Also worth timing once each: one rescue from the board to the pay (the sim says 175 s; the 120 s on
the ground is the biggest guess), one patrol (102 s), and one flight of mining (98 s for 10 ore). Replace the numbers in the `PACE` block with what you saw.

## 12. Open questions for Troy

- **Is the Reaver meant to be farmed?** It is the best loop in the game and repeatable. Section 8 recommends 1,200 once, then 400.
- **Should the first new ship cost an evening or an hour?** The card says an hour; the numbers say that costs 8,500 for the Kite, almost twice what the plan writes down.
- **Do later ships need work of their own, or are they trophies?** Section 8 assumes work (haul, survey, the rough systems).
