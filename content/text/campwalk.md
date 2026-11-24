---
type: text
---
The words of the briefing's walk (card space-game-briefing-map-walk; Troy, 22 Nov 2026): the map on every page, and the cruiser, the wing and the convoy walking the road, one line at each stop. camp.bf.<level>.<mission>.s<n> is the line of stop n of a mission's walk (src/data_briefwalk.js); {from}, {to}, {name}, {km} and {mins} are the road's own numbers, and the keys are the key table's. The marks on the map (camp.bw.m.*) are short names of a hint, never a fact about a surprise. A key may be in any file of this folder.

## Strings
| key | text |
|---|---|
| camp.bf.1.1.s1 | The transport must reach {to}: {km} km, about {mins} minutes. A patrol sees her off. |
| camp.bf.1.1.s2 | The patrol turns back at the edge of safe space. You are on your own. |
| camp.bf.1.1.s3 | A distress call may come. Pick the attackers ({keynear}), then {keyorder}. |
| camp.bf.1.1.s4 | Pirates are likely to ambush the road. Pick the convoy ({keyfriendlies}), then {keyorder}. |
| camp.bf.1.1.s5 | A pirate leader waits near {to}. Kill it, or get the transport past. |
| camp.bf.1.1.s6 | Get her into {to} and the mission is won. The pirate leader is a bonus. |
| camp.bw.wing | WING |
| camp.bw.patrol | PATROL |
| camp.bw.m.help | CALL? |
| camp.bw.m.threat | PIRATES? |
| camp.bw.m.leader | LEADER? |
| camp.bw.m.goal | ARRIVE |
