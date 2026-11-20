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
- Off shift. The repair bay charges half a credit a point.
- Shields soak the first hits and recharge. Pilots buy them late.
- A booster makes you harder to hit, not faster.

## Reactions
| when | line |
|---|---|
| hull<50 | That hull hangs on by habit. Repair bay: two doors up. |
| upgrade:shields>=2 | Proper shields. You will need the hull patched less. |
| credits>=800 and !upgrade:engine | Enough credits for a booster and a bad idea. Buy the booster. |
| upgrade:weapons | Rapid fire, nice. Keep the hull to match. |
| mission:accepted | Check your hull before you go, not after. |

## Persona
Who: Moss, fifties, runs the repair bay and is off shift, with grease still under the nails.
Manner: tired, kind, practical; says what a part costs before what it does; dry jokes at their own expense.
Knows: hull damage, what shields, rapid fire and engines really do, the shop prices, the bay's half a credit a point.
Wants: pilots who come back with all their hull; one full night's sleep.
Will not: lie about what a repair costs, or touch a ship that is not theirs without asking.
