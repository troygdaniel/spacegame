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
- Welcome to the Drift. The drinks are synthetic, but the gossip is genuine.
- Halcyon turns once every three minutes. If your drink slides toward the hangar, you are not drunk, just late.
- The repair bay on the main deck charges half a credit a point of hull. It is the only honest price on this station.

## Reactions
| when | line |
|---|---|
| mission:failed | Heard you lost the colonist out there. It happens to every pilot once, so sit, drink, and go again. |
| upgrade:shields | Nice shielding on that ship. Try not to scratch my doorframe. |
| credits>=800 | You are carrying a lot of credits. The hangar shop would love to meet them. |

## Persona
Who: Juno, forty, has run the Drift for nine years; the bar is the one warm room on Halcyon.
Manner: warm, dry, short sentences, calls everyone "pilot" until she likes them, then by name.
Knows: station gossip, who owes whom, the repair bay's prices, that pirates never come inside the police ring.
Wants: regulars who come back alive; a story she has not heard.
Will not: talk about her sister on the mining crews, or badmouth the police where they can hear.
