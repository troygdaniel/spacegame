---
type: text
---
The words the interface says. A key is a string the game reads: help.<scene>.<line> (the H screen), tips.<scene> (the tip under it) or toast.<name> (the lines that pop up).
Change the text column; a toast may use {placeholders} such as {reward}, {name}, {progress} and {count}; help lines and tips are plain text.
Files here are read in name order and the last file to give a key wins, so a file that changes a key must sort after ui.md (words.md does; my-words.md loses to it).
To translate, change the text column here, or copy this file to a name after ui (words-fr.md) and delete this one.

## Strings
| key | text |
|---|---|
| help.station.1 | W A S D   walk (the arrow keys work too) |
| help.station.2 | E   use the terminal, repair bay or ship |
| help.station.3 | 1-6   buy a part in the shop |
| help.station.4 | T   chat with someone in the bar (needs a chat key) |
| help.station.5 | J   journal: who you have met |
| help.station.6 | G   galaxy map (look only here; you jump from your ship) |
| help.station.7 | Esc   close a terminal, or pause |
| help.ship.1 | Enter Space   the amber button: launch or board |
| help.ship.2 | Enter   press twice to buy a ship |
| help.ship.3 | F Y C   fleet, yard or controls tab |
| help.ship.4 | A D   choose a ship (the arrow keys work too) |
| help.ship.5 | R   rename the ship |
| help.ship.6 | S   sell the ship (press twice) |
| help.ship.7 | Esc   back to the station |
| help.space.1 | W   thrust |
| help.space.2 | A D   turn |
| help.space.3 | S   brake |
| help.space.4 | Shift   boost with thrust |
| help.space.5 | Q E   dash left or right |
| help.space.6 | Space   fire (or click) |
| help.space.7 | L   dock or land (fly slowly, close in) |
| help.space.8 | T   mission panel |
| help.space.9 | R   autotarget on or off (needs the part from the shop) |
| help.space.10 | N   nav list: Enter picks a target, P flies there |
| help.space.11 | C   cruise to the target (A D nudge, S cancels) |
| help.space.12 | P   autopilot to the target: it stops at the dock (any key cancels) |
| help.space.13 | Tab   sector map: W S choose a body, Enter flies there |
| help.space.14 | G   galaxy map: pick a system, Enter charges the jump (S or Esc cancels) |
| help.space.15 | Z   flight assist on or off: the ship flies itself about the target |
| help.space.16 | 1-4   assist orders: approach, keep at range, orbit, match speed |
| help.surface.1 | W A S D   walk (the arrow keys work too) |
| help.surface.2 | Mouse   aim, and click to fire |
| help.surface.3 | E   talk to the colonist, board at the pad |
| tips.station | Walk up to a terminal, the bar or the hangar shop and press E. Board your ship in the hangar to launch. |
| tips.space | The amber arrow points at your objective and the radar is top right. Slow down near the station or the planet, then press L. |
| tips.ship | Look your ship over, then press Enter to launch. Esc goes back to the station to take a mission or repair first. |
| tips.surface | Aim with the mouse and click to fire. Walk back to the landing pad and press E to lift off. |
| toast.docked | Docked. |
| toast.delivered | Colonist delivered safely. +{reward} cr |
| toast.accepted | Mission accepted. Board your ship in the hangar. |
| toast.dropped | Mission dropped. The board has other calls. |
| toast.patrol-down | Wanted pirate down  {progress} of {count} |
| toast.patrol-done | Patrol complete. All wanted pirates destroyed. |
| toast.mule-leaving | The MULE is leaving the hangar. Stay close to her. |
| toast.mule-left | You left the MULE behind. Mission failed. |
| toast.mule-lost | The MULE was destroyed. Mission failed. |
| toast.mule-arrived | The MULE made the Perseus gate. |
| toast.reaver-intro | The Reaver is south-west of Reaver's Rock. Watch for the flash before it charges. |
| toast.reaver-wing | The Reaver calls in its wing. |
| toast.reaver-burning | The Reaver is burning. It fights harder. |
| toast.reaver-dead | The Reaver is wreckage. Bounty paid. |
| toast.signal-new | New signal on the radar: {name} |
| toast.signal-found | Signal found: {name} |
| toast.signal-lost | Signal lost: {name} |
