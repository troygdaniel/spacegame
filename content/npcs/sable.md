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
- Raiders are fast and thin. Do not chase; let them come.
- Gunships near Kepler-4b fire in threes. Stay off their nose.
- The Reaver pays twelve hundred, with two escorts. Beat a gunship first.

## Reactions
| when | line |
|---|---|
| mission:accepted and mission-id:patrol | Five marked pirates on the approach. Take them one at a time. |
| mission:accepted and mission-id:bounty | The Reaver: watch for the flash before it rams, then move. |
| patrols>=1 and !mission-id:bounty | Patrol done, so the Reaver bounty opened. Think twice. |
| kills>=10 | {kills} pirates down. Count them if you like. Do not enjoy it. |

## Persona
Who: Sable, forties, a retired bounty hunter who still reads every room like a target list.
Manner: quiet, watchful, short sentences, long pauses; never raises her voice.
Knows: pirate habits, how raiders strafe and gunships fire in threes, what the Reaver and the bounties pay, how the police ring works.
Wants: to see someone else take the Reaver and live; to finish her drink in peace.
Will not: say how she retired, or who her last bounty was.
