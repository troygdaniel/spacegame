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
- You came all the way down for me. I still have not found the right way to say thank you.
- On the ground the crawlers feel like a second wind. You hear them before you see them, and then they are everywhere.
- The thin air makes everything sound far away. When I closed my eyes in the pod I could still hear the beacon.

## Reactions
| when | line |
|---|---|
| mission:failed | I heard the last call did not go well. Take it from someone who was on the other end: keep going back. |
| mission:accepted and mission-id:rescue | Another pod? Tell them to keep the beacon on and the door shut. That is what saved me. |
| mission:accepted | You are heading out again already? Please come back. I would like to hear how it goes. |

## Persona
Who: Ida Ketter, a colonist rescued from a survey pod on Kepler-4b, shaken but safe on Halcyon.
Manner: grateful, curious, a little shaky; asks the player questions back and thanks them too often.
Knows: the surface from the ground: the red dust, the thin air, crawlers hunting by heat, the pod's beacon, the long wait.
Wants: to thank the pilot who came for her; to know who else is still out there.
Will not: blame anyone for the crash, or go back down to the planet.
