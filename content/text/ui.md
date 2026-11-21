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
| help.space.9 | N X   places. Enter: fly there. X: clear |
| help.space.10 | B   overview of ships: Enter flies to one |
| help.space.11 | Click   assist on: fly there, or target it |
| help.space.12 | C   cruise there (A D nudge, S cancels) |
| help.space.13 | P   autopilot there (any key cancels) |
| help.space.14 | R   autotarget on or off (needs the part) |
| help.space.15 | V   gun lock: the guns fire at your target |
| help.space.16 | Z   flight assist on or off |
| help.space.17 | 1-4   assist orders: go, keep, orbit, match |
| help.space.18 | F   call the fuel ranger (tank near empty) |
| help.space.19 | G   galaxy map: Enter jumps, Esc cancels |
| help.space.20 | Tab   sector map (Z zooms, click to fly) |
| help.surface.1 | W A S D   walk (the arrow keys work too) |
| help.surface.2 | Mouse   aim, and click to fire |
| help.surface.3 | E   talk to the colonist, board at the pad |
| help.surface.4 | C   show the controls panel again |
| tips.station | Pick from the station menu, bottom right: a number, or W S and Enter. Your ship is the last row: board it to launch. The SHOP sells parts; MISSIONS has courier and haul calls. |
| tips.space | N lists the places and B the ships: Enter or a click flies there; on the Tab map a click sets the place, then Enter flies there and Shift+Enter flies fast. Near a station, slow down and press L: ore sells there. G opens the galaxy map: pick a star, press Enter to jump. |
| tips.ship | Look your ship over, then press Enter to launch. Esc goes back to the station to take a mission or repair first. |
| tips.surface | Aim with the mouse and click to fire. Walk back to the landing pad and press E to lift off. |
| toast.docked | Docked. |
| toast.delivered | Colonist delivered safely. +{reward} cr |
| toast.accepted | Mission accepted. Board your ship in the hangar. |
| toast.dropped | Mission dropped. The board has other calls. |
| toast.patrol-down | Wanted pirate down  {progress} of {count} |
| toast.patrol-done | Patrol complete. All wanted pirates destroyed. |
| toast.mule-leaving | The MULE is leaving. Stay inside her ring: faster, half damage. |
| toast.mule-left | You left the MULE behind. Mission failed. |
| toast.mule-lost | The MULE was destroyed. Mission failed. |
| toast.mule-arrived | The MULE made the Perseus gate. |
| toast.mule-half | MULE: Hull at half. Get them off me. |
| toast.mule-gate-sight | MULE: Gate in sight. |
| toast.mule-spinup | MULE: At the gate. Eight seconds to spin up. Hold them off. |
| toast.mule-wave-port | MULE: Raiders, port side. |
| toast.mule-wave-starboard | MULE: Raiders, starboard side. |
| toast.mule-wave-ahead | MULE: Raiders, dead ahead. |
| toast.reaver-intro | The Reaver waits south-west of Reaver's Rock. Watch for its flash. |
| toast.reaver-wing | The Reaver calls in its wing. |
| toast.reaver-burning | The Reaver is burning. It fights harder. |
| toast.reaver-dead | The Reaver is wreckage. Bounty paid. |
| toast.signal-new | New signal on the radar: {name} |
| toast.signal-found | Signal found: {name} |
| toast.signal-lost | Signal lost: {name} |
| hint.dock | Slow down near a station and press L to dock. Ore sells and calls are taken there. |
| hint.jump | To jump: G opens the map, pick a star, press Enter. A jump burns fuel; the station pump refills it. |
| hint.ore | Shoot asteroids for ore. It sells for credits when you dock (L). |
| hint.shop | Credits buy parts at the SHOP: press {shop} in the station menu. |
| hint.calls | Courier and haul calls pay to carry cargo: MISSIONS, press {missions}. |
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
| listen.use | Hold {key} in space or in a station until the ring around it is full, then speak: it stops when you stop talking (or press {key} again to send, Esc to cancel) and your words go to the ship's computer, as if you had typed them. The microphone is open only while it listens. Nothing is recorded or kept. |
| listen.cost | Each time it listens, it sends its sound to Deepgram, on your own account, and may cost you money. This session may listen for {minutes} minutes. |
| listen.hint | Run node tools/serve.mjs and open http://127.0.0.1:8787/ : the browser then asks for the microphone once. Opened from a file it may ask every time, or refuse. |
| listen.early | Voice: the browser will ask to use your microphone. Choose Allow on every visit. |
| spoken.use | Spoken replies: how much of the computer's answer is said aloud. The strip always shows all of it. U, Esc or a click on the strip stops the voice. |
| spoken.short | the first sentence or two is said |
| spoken.full | the whole answer is said |
| spoken.off | answers are never said aloud |
| music.use | Music is made by the game as you fly and steps back when the ship speaks. Effects is the engine, the drone and every shot and click; they ease off a little while music plays. M mutes all. |
| camp.l1.before.1 | Ceres belt. The cruiser is mining. |
| camp.l1.before.2 | Fly over ore, or press 6 to send the drones. |
| camp.l1.after.1 | Mothership destroyed. The belt is clear. |
| camp.l1.after.2 | Their wreck holds alien technology. |
| camp.say.convoy | Convoy to {name} is away. |
| camp.say.delivered | The convoy has reached {name}. |
| camp.say.convoylost | The convoy to {name} is lost. |
| camp.say.wave1 | Aliens on the Mars lane, pilot. |
| camp.say.wave2 | A second wave, heading for Earth. |
| camp.say.wave3 | Their mothership has jumped in. Kill it. |
| camp.say.launch | Launching the wing. |
| camp.say.attack | Fighters, attack. |
| camp.say.attackmother | Fighters, attack the mothership. |
| camp.say.escort | Escorts are with the {name} convoy. |
| camp.say.guard | The wing is guarding. |
| camp.say.recall | Wing, return to the carrier. |
| camp.say.missiles | Missile away. |
| camp.say.missilesmother | Missile away, at the mothership. |
| camp.say.earthhalf | Earth's shield is at half, pilot. |
| camp.say.earthlow | Earth's shield is nearly gone, pilot. |
| camp.say.hullhalf | The carrier's hull is at half. |
| camp.say.hulllow | The carrier's hull is critical, pilot. |
| camp.no.over | The battle is over, pilot. |
| camp.no.bay | The bay is empty, pilot. |
| camp.no.launching | The wing is still launching. |
| camp.no.baydry | Everything is already out, pilot. |
| camp.no.nofighters | No fighters are out. Launch first. |
| camp.no.noescorts | No escorts are out. Launch first. |
| camp.no.noconvoy | There is no convoy to escort. |
| camp.no.nomother | The mothership has not come yet. |
| camp.no.nowing | No ships are out. Launch first. |
| camp.no.what | I cannot do that, pilot. |
| camp.no.nomissiles | The magazine is empty, pilot. It reloads slowly. |
| camp.no.missilewait | The launcher is still cycling. |
| camp.no.nobig | No big ship in missile range, pilot. |
| camp.no.range | The mothership is out of missile range, pilot. |
| camp.lose.carrier | The carrier is lost. |
| camp.lose.earth | Earth's shield has failed. |
| camp.lose.debug | The level was ended with the debug key. |
| camp.ui.title | CAMPAIGN |
| camp.ui.level | LEVEL {n}: {name} |
| camp.ui.won | LEVEL {n} WON |
| camp.ui.lost | LEVEL {n} LOST |
| camp.ui.keys | W A S D fly   Space turrets   F missiles   {panels}   Tab Map   + - Zoom   H Keys |
| camp.ui.begin | Enter  begin |
| camp.ui.pick | Choose one salvaged technology:  1  2  3 |
| camp.ui.next | Enter  continue |
| camp.ui.retry | Enter  try again     T  title |
| camp.ui.pausetitle | PAUSED |
| camp.ui.paused | Esc  resume     T  title     H  all keys |
| camp.ui.pausemap | Tab  map of the whole level (the battle goes on behind it) |
| camp.map.title | MAP  -  LEVEL {n}: {name} |
| camp.map.footer | Tab or Esc closes it. The battle goes on behind it. |
| camp.map.across | {km} km across |
| camp.map.carrier | Your carrier |
| camp.map.wing | Your ships out ({n}) |
| camp.map.convoy | Convoys ({n}), course drawn |
| camp.map.alien | Aliens ({n}) |
| camp.map.mother | The alien mothership |
| camp.map.tower | Defence towers ({n}) |
| camp.map.cache | Caches left ({n}) |
| camp.map.relic | The relic |
| camp.ui.hull | CARRIER |
| camp.ui.earth | EARTH |
| camp.ui.bay | BAY |
| camp.ui.out | OUT |
| camp.ui.wave | WAVE {n} OF {total} |
| camp.ui.mother | MOTHERSHIP |
| camp.ui.missiles | F  MISSILES  {n} |
| camp.ui.missilenext | next in {s} s |
| camp.ui.pausehelp | Hold Space: the turrets fire at ships close by. F fires a homing missile at the mothership or the nearest big ship. |
| camp.tech.shield.name | Shield grid |
| camp.tech.shield.text | The carrier takes 40 percent less damage. |
| camp.tech.beam.name | Beam turrets |
| camp.tech.beam.text | The turrets fire beams: twice the damage, further, and through what they hit. |
| camp.tech.blink.name | Warp blink |
| camp.tech.blink.text | Press B to hop the carrier 1,500 px ahead. Ready again after 20 seconds. |
| camp.tech.plating.name | Hull plating |
| camp.tech.plating.text | The carrier's hull is half as strong again. |
| camp.tech.bay2.name | Second bay |
| camp.tech.bay2.text | Four more fighters in the bay. |
| camp.tech.repair.name | Repair field |
| camp.tech.repair.text | The carrier and the ships beside it mend as they fly. |
| camp.l2.before.1 | We are through the warp. This is Alpha Centauri. |
| camp.l2.before.2 | Something old waits on Proxima b. Find it first. |
| camp.l2.after.1 | The relic is a machine from an older race. |
| camp.l2.after.2 | It shows where the aliens live. Choose a technology. |
| camp.l3.before.1 | Their home world is open. Last battle. |
| camp.l3.before.2 | Break the defence towers round their world. |
| camp.l3.after.1 | Their defences are down. |
| camp.l3.after.2 | The war is won. |
| camp.say.l2wave1 | The aliens followed us through the warp, pilot. |
| camp.say.l2wave2 | A second group, coming in from the far side. |
| camp.say.l3wave1 | Defenders are launching from the planet. |
| camp.say.l3wave2 | More defenders, from the north. |
| camp.say.l3wave3 | Their last reserves are coming. |
| camp.say.cache | Resources gathered: {n}. |
| camp.say.relicon | The relic is answering. Hold the ring. |
| camp.say.relicdone | The relic is ours. |
| camp.obj.mother | Destroy the alien mothership. |
| camp.obj.motherwait | Hold off the waves; the mothership comes last. |
| camp.obj.towers | Break the defence towers: {n} left. |
| camp.obj.caches | Gather resources: {n} of {need}. |
| camp.obj.relic | Hold the ring at the relic: {pct}%. |
| camp.ui.end | THE WAR IS NOT OVER     Enter  title |
