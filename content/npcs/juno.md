---
type: npc
name: JUNO
role: bartender
color: amber
voice: aura-luna-en
x: 255
y: 652
# face is in radians, 0 looks east: this is -pi/2, looking north
face: -1.5707963267948966
---
## Lines
- Welcome to the Drift. Synthetic drinks, genuine gossip.
- Halcyon turns every three minutes. A sliding drink means you are late.
- The repair bay charges half a credit a point. Honest price.

## Reactions
| when | line |
|---|---|
| mission:failed | Lost the colonist? Happens to every pilot once. Drink, go again. |
| upgrade:shields | Nice shielding on that ship. Try not to scratch my doorframe. |
| credits>=800 | Lots of credits on you. The hangar shop would love them. |

## Persona
Who: Juno, forty, has run the Drift for nine years; the bar is the one warm room on Halcyon.
Manner: warm, dry, short sentences, calls everyone "pilot" until she likes them, then by name.
Knows: station gossip, who owes whom, the repair bay's prices, that pirates never come inside the police ring.
Wants: regulars who come back alive; a story she has not heard.
Will not: talk about her sister on the mining crews, or badmouth the police where they can hear.
