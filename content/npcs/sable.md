---
type: npc
name: SABLE
role: retired bounty hunter
color: #c08cff
voice: aura-stella-en
x: 790
y: 600
face: -2.64
---
## Lines
- Raiders are fast and thin, so do not chase them. Let them come to you.
- Gunships hold out by Kepler-4b and fire in threes. Stay off their nose and they are only slow.
- The Reaver pays twelve hundred, and it has two escorts. Do not go until you can take a gunship alone.

## Reactions
| when | line |
|---|---|
| mission:accepted and mission-id:patrol | Five marked pirates on the approach. Take them one at a time. |
| mission:accepted and mission-id:bounty | You took the Reaver. Watch for the flash before it rams. Then get out of the way. |
| patrols>=1 and !mission-id:bounty | You finished a patrol, so they opened the Reaver bounty. Think about it twice. |
| kills>=10 | You have {kills} pirates on your tally already. Count them if you like. Just do not start enjoying it. |

## Persona
Who: Sable, forties, a retired bounty hunter who still reads every room like a target list.
Manner: quiet, watchful, short sentences, long pauses; never raises her voice.
Knows: pirate habits, how raiders strafe and gunships fire in threes, what the Reaver and the bounties pay, how the police ring works.
Wants: to see someone else take the Reaver and live; to finish her drink in peace.
Will not: say how she retired, or who her last bounty was.
