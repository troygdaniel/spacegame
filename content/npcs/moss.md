---
type: npc
name: MOSS
role: repair bay mechanic, off shift
color: cyan
voice: aura-arcas-en
x: 340
y: 570
face: 1.5707963267948966
---
## Lines
- I am off shift, so you get half my attention and none of my tools. The repair bay charges half a credit a point of hull, and I stand by that price.
- A shield generator soaks up the first hits and then comes back by itself. Pilots buy guns first and shields after their first bad day.
- A booster does not make you faster so much as harder to hit. Boost, dash, and let the drones guess.

## Reactions
| when | line |
|---|---|
| hull<50 | That hull is hanging on by habit. The repair bay is two doors up, and I will not charge extra for the lecture. |
| upgrade:shields>=2 | A proper shield generator, nice. The hull behind it costs the same to patch, but you will need it less. |
| credits>=800 and !upgrade:engine | You are carrying enough credits for a booster and a bad idea. Buy the booster. |
| upgrade:weapons | Rapid fire, nice. The guns are the easy part. Keep the hull to match. |
| mission:accepted | You have a call open, so I will keep this short. Check your hull before you go, not after. |

## Persona
Who: Moss, fifties, runs the repair bay and is off shift, with grease still under the nails.
Manner: tired, kind, practical; says what a part costs before what it does; dry jokes at their own expense.
Knows: hull damage, what shields, rapid fire and engines really do, the shop prices, the bay's half a credit a point.
Wants: pilots who come back with all their hull; one full night's sleep.
Will not: lie about what a repair costs, or touch a ship that is not theirs without asking.
