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
| help.station.2 | 1-6   station menu: go to a row and open it |
| help.station.3 | W S Enter   station menu: choose and open |
| help.station.4 | N   menu keys off to walk; N again for menu |
| help.station.5 | E   use the terminal, repair bay or ship |
| help.station.6 | 1-6   buy a part, with the shop open |
| help.station.7 | T   chat in the bar (needs a chat key) |
| help.station.8 | J   journal: who you have met |
| help.station.9 | G   galaxy map (look only; jump in flight) |
| help.station.10 | Esc   close a terminal, or pause |
| help.station.11 | U   hold to talk to the ship's computer |
| help.ship.1 | Enter Space   launch or board |
| help.ship.2 | Enter   press twice to buy a ship |
| help.ship.3 | F Y C   fleet, yard or controls tab |
| help.ship.4 | A D   choose a ship (arrow keys too) |
| help.ship.5 | R   rename the ship |
| help.ship.6 | S   sell the ship (press twice) |
| help.ship.7 | Esc   back to the station |
| help.space.1 | W   thrust |
| help.space.2 | A D   turn |
| help.space.3 | S   brake |
| help.space.4 | Shift   boost with thrust |
| help.space.5 | Q E   dash left or right |
| help.space.6 | Space   fire (so does a click, assist off) |
| help.space.7 | L   dock or land (slow, close in) |
| help.space.8 | T   mission panel |
| help.space.9 | N X   places. Enter: set, then go. X: clear |
| help.space.10 | B   overview of ships: Enter targets one |
| help.space.11 | Click   assist on: fly there, or target it |
| help.space.12 | C   cruise there (A D nudge, S cancels) |
| help.space.13 | P   autopilot there (any key cancels) |
| help.space.14 | R   autotarget on or off (needs the part) |
| help.space.15 | V   gun lock: the guns fire at your target |
| help.space.16 | Z   flight assist on or off |
| help.space.17 | 1-4   assist orders: go, keep, orbit, match |
| help.space.18 | F   call the fuel ranger (tank near empty) |
| help.space.19 | G   galaxy map: Enter jumps, Esc cancels |
| help.space.20 | Tab   sector map (Z zooms) |
| help.surface.1 | W A S D   walk (the arrow keys work too) |
| help.surface.2 | Mouse   aim, and click to fire |
| help.surface.3 | E   talk to the colonist, board at the pad |
| help.surface.4 | C   show the controls panel again |
| tips.station | Pick from the station menu, bottom right: a number, or W S and Enter. Your ship is the last row: board it to launch. |
| tips.space | N picks a place: Enter sets it, Enter again goes there. B lists the ships; Z and 1 to 4 fly yours about the one you pick. Near a station or a planet, slow down and press L. |
| tips.ship | Look your ship over, then press Enter to launch. Esc goes back to the station to take a mission or repair first. |
| tips.surface | Aim with the mouse and click to fire. Walk back to the landing pad and press E to lift off. |
| toast.docked | Docked. |
| toast.delivered | Colonist delivered safely. +{reward} cr |
| toast.accepted | Mission accepted. Board your ship in the hangar. |
| toast.dropped | Mission dropped. The board has other calls. |
| toast.patrol-down | Wanted pirate down  {progress} of {count} |
| toast.patrol-done | Patrol complete. All wanted pirates destroyed. |
| toast.mule-leaving | The MULE is leaving the hangar. Stay inside her ring: she runs faster and takes half damage. |
| toast.mule-left | You left the MULE behind. Mission failed. |
| toast.mule-lost | The MULE was destroyed. Mission failed. |
| toast.mule-arrived | The MULE made the Perseus gate. |
| toast.mule-half | MULE: Hull at half. Get them off me. |
| toast.mule-gate-sight | MULE: Gate in sight. |
| toast.mule-spinup | MULE: At the gate. Eight seconds to spin up. Hold them off. |
| toast.mule-wave-port | MULE: Raiders, port side. |
| toast.mule-wave-starboard | MULE: Raiders, starboard side. |
| toast.mule-wave-ahead | MULE: Raiders, dead ahead. |
| toast.reaver-intro | The Reaver is south-west of Reaver's Rock. Watch for the flash before it charges. |
| toast.reaver-wing | The Reaver calls in its wing. |
| toast.reaver-burning | The Reaver is burning. It fights harder. |
| toast.reaver-dead | The Reaver is wreckage. Bounty paid. |
| toast.signal-new | New signal on the radar: {name} |
| toast.signal-found | Signal found: {name} |
| toast.signal-lost | Signal lost: {name} |
| keys.steps | Then: paste it above, press Test, done. |
| keys.deepgram.use | Speaks the ship and the bar voices, and hears you when you hold U: lines and sound go to Deepgram. |
| keys.deepgram.cost | It is your own Deepgram account: Deepgram may charge you for speaking and listening. |
| keys.deepgram.url | https://console.deepgram.com/ |
| keys.openai.use | Lets the characters answer you; each line you type is sent to OpenAI. Without it they use scripted lines. |
| keys.openai.cost | It is your own OpenAI account: OpenAI may charge you for what you use. |
| keys.openai.url | https://platform.openai.com/api-keys |
| keys.anthropic.use | Lets the characters answer you; each line you type is sent to Anthropic. Without it they use scripted lines. |
| keys.anthropic.cost | It is your own Anthropic account: Anthropic may charge you for what you use. |
| keys.anthropic.url | https://platform.claude.com/settings/keys |
| listen.use | Hold {key} in space or in a station and speak; let go and your words go to the ship's computer, as if you had typed them. The microphone is open only while the key is held. Nothing is recorded or kept. |
| listen.cost | Each hold sends its sound to Deepgram, on your own account, and may cost you money. This session may listen for {minutes} minutes. |
| listen.hint | Run node tools/serve.mjs and open http://127.0.0.1:8787/ : the browser then asks for the microphone once. Opened from a file it may ask every time, or refuse. |
| music.use | Music made by the game as you fly, never the same twice. It follows the master volume and M, and steps back when the ship speaks. |
