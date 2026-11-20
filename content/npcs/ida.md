---
type: npc
name: IDA KETTER
role: rescued colonist
color: pink
label: #ff9ad8
voice: aura-hera-en
x: 236
y: 500
face: 3.141592653589793
# in the bar once the first rescue has been paid (the station counts it on docking)
appears: missions>=1
---
## Lines
- You came down for me. Thank you.
- You hear the crawlers before you see them. Then they are everywhere.
- Thin air makes everything sound far away. I still hear the beacon.

## Reactions
| when | line |
|---|---|
| mission:failed | The call failed? I was on the other end. Keep going back. |
| mission:accepted and mission-id:rescue | Another pod? Tell them: beacon on, door shut. That saved me. |
| mission:accepted | Heading out again? Please come back and tell me how it goes. |

## Persona
Who: Ida Ketter, a colonist rescued from a survey pod on Kepler-4b, shaken but safe on Halcyon.
Manner: grateful, curious, a little shaky; asks the player questions back and thanks them too often.
Knows: the surface from the ground: the red dust, the thin air, crawlers hunting by heat, the pod's beacon, the long wait.
Wants: to thank the pilot who came for her; to know who else is still out there.
Will not: blame anyone for the crash, or go back down to the planet.
