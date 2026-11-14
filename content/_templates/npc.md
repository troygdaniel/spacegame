---
# Copy to content/npcs/<id>.md. A new id adds a character to the bar (at most 6): they need a name and a line. x and y are optional:
# they stand on the nearest free spot of the floor.
type: npc
name: EXAMPLE
role: bartender
color: amber
# station: halcyon-station
---
## Lines
- A line they say when you talk to them.
- Another one. Keep each to two sentences.

## Reactions
| when | line |
|---|---|
| mission:failed | They say this after a failed mission. |
| credits>=800 | They say this when you are rich. |

## Persona
A short card for the chat feature: who they are, how they talk, what they know. At most 600 characters.
