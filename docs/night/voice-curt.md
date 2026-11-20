# Night: shorter spoken lines (1-GEN, 20 Nov 2026)

Card `space-game-voice-curt` (Troy: the voice scripts are too long). **The rule: every line the ship, the computer and the characters speak is one short sentence, about 12 words at most, the fact first, no pleasantries; the number or name the player needs stays.** This file lists **every changed line before and after**, so Troy can skim and veto. Each group below is its own `[night] voice-curt` commit, so a veto is one `git revert`.

## What changed, in five commits

| # | Commit | What | Revert it and |
|---|---|---|---|
| 0 | `a28db3b` | the test first: `tests/voicecurt.mjs` counts the words of what is spoken (12 a line) | nothing is checked |
| 1 | `9f65057` | the ship's event lines: three pleasantries out | launch, dock and the 2000 cr ending say the long lines again |
| 2 | `c7cac6b` | the characters' scripted lines and reactions (36 lines, files and the code defaults, resealed) | the bar talks as before (also revert the two test pins `tests/shipcomputer.mjs`, `tests/shipacts.mjs` in commit 3, they pin ATHENA's new greeting) |
| 3 | `ada8c5e` | the Campaign computer's help and lose tips, and the MULE and Reaver toasts (8 rows) | the Campaign help is long again |
| 4 | `3b2e338` | what **Short** says aloud: the first sentence only (45 letters to take a second one, 120 at most; it was 70 and 170) | Short says up to two sentences again |
| 5 | `b719322` | the computer's refusals and how-to answers (11 lines), and the rules the computer and the characters are given: one short sentence of about 12 words | the models may talk longer again |

Content rows did not grow: only the text column changed, so `ui.md` is still at its 200-row limit. No key, number or behaviour in the game changed apart from commit 4 (what is spoken, not what is shown: the strip still shows the whole answer).

## 1. The ship's event lines (`src/voice.js`, table in `docs/VOICE.md`)

| before | words | after | words |
|---|---|---|---|
| Launch clear. All systems nominal. | 5 | Launch clear. | 2 |
| Docking complete. Welcome to Halcyon Station. | 6 | Docked at Halcyon Station. | 4 |
| Two thousand credits earned. Well flown, pilot. | 7 | Two thousand credits earned. | 4 |

The other nine lines were already under 12 words and are kept (hull critical, hostile contacts, touchdown, the four accepted calls, mission failed, ship lost).

## 2. The characters (`content/npcs/*.md`; the code defaults of `src/shop.js` say the same words; `Lines` are what they say, `Reactions` what they say about you)

**JUNO**

| before | words | after | words |
|---|---|---|---|
| Welcome to the Drift. The drinks are synthetic, but the gossip is genuine. | 13 | Welcome to the Drift. Synthetic drinks, genuine gossip. | 8 |
| Halcyon turns once every three minutes. If your drink slides toward the hangar, you are not drunk, just late. | 19 | Halcyon turns every three minutes. A sliding drink means you are late. | 12 |
| The repair bay on the main deck charges half a credit a point of hull. It is the only honest price on this station. | 24 | The repair bay charges half a credit a point. Honest price. | 11 |
| Heard you lost the colonist out there. It happens to every pilot once, so sit, drink, and go again. | 19 | Lost the colonist? Happens to every pilot once. Drink, go again. | 11 |
| You are carrying a lot of credits. The hangar shop would love to meet them. | 15 | Lots of credits on you. The hangar shop would love them. | 11 |

**TAMSIN**

| before | words | after | words |
|---|---|---|---|
| Those drones around Kepler-4b used to be survey rigs. Somebody rewired them to shoot first and never ask. | 18 | The Kepler-4b drones were survey rigs. Somebody rewired them to shoot. | 11 |
| Word is the drones answer to a pirate captain out past the rim. Nobody I know has seen the captain and lived to tell it. | 25 | The drones answer to a captain past the rim. No witness lived. | 12 |
| You took the Kepler call? Six drones ring that planet, so come in from the side and take them one at a time. | 23 | Six drones ring Kepler. Come in from the side, one by one. | 12 |
| That is a rapid-fire rig on your ship. Faster rounds mean the drones drop before they finish turning. | 18 | Rapid fire: the drones drop before they finish turning. | 9 |

**DEX**

| before | words | after | words |
|---|---|---|---|
| I charted Kepler-4b last year. Red dust, thin air, and crawlers that hunt by heat. | 15 | Kepler-4b: red dust, thin air, and crawlers that hunt by heat. | 11 |
| That survey pod is still pinging its beacon. Whoever takes the call has to be quick and quiet. | 18 | The survey pod still pings its beacon. Be quick and quiet. | 11 |
| Halcyon was a mining relay before the ore ran out. Now it is mostly mercenaries, mechanics and me. | 18 | Halcyon was a mining relay. Now it is mercenaries, mechanics and me. | 12 |
| You took the rescue? Find the pod, keep the colonist close, and get them back to the ship. Crawlers hunt by heat, and a walking colonist is warm. | 28 | Find the pod, keep the colonist close. Crawlers hunt by heat. | 11 |
| Is that a booster on your ship? You can outrun the drones now, if you keep your nerve. | 18 | A booster. Now you can outrun the drones. | 8 |

**MOSS**

| before | words | after | words |
|---|---|---|---|
| I am off shift, so you get half my attention and none of my tools. The repair bay charges half a credit a point of hull, and I stand by that price. | 32 | Off shift. The repair bay charges half a credit a point. | 11 |
| A shield generator soaks up the first hits and then comes back by itself. Pilots buy guns first and shields after their first bad day. | 25 | Shields soak the first hits and recharge. Pilots buy them late. | 11 |
| A booster does not make you faster so much as harder to hit. Boost, dash, and let the drones guess. | 20 | A booster makes you harder to hit, not faster. | 9 |
| That hull is hanging on by habit. The repair bay is two doors up, and I will not charge extra for the lecture. | 23 | That hull hangs on by habit. Repair bay: two doors up. | 11 |
| A proper shield generator, nice. The hull behind it costs the same to patch, but you will need it less. | 20 | Proper shields. You will need the hull patched less. | 9 |
| You are carrying enough credits for a booster and a bad idea. Buy the booster. | 15 | Enough credits for a booster and a bad idea. Buy the booster. | 12 |
| Rapid fire, nice. The guns are the easy part. Keep the hull to match. | 14 | Rapid fire, nice. Keep the hull to match. | 8 |
| You have a call open, so I will keep this short. Check your hull before you go, not after. | 19 | Check your hull before you go, not after. | 8 |

**SABLE**

| before | words | after | words |
|---|---|---|---|
| Raiders are fast and thin, so do not chase them. Let them come to you. | 15 | Raiders are fast and thin. Do not chase; let them come. | 11 |
| Gunships hold out by Kepler-4b and fire in threes. Stay off their nose and they are only slow. | 18 | Gunships near Kepler-4b fire in threes. Stay off their nose. | 10 |
| The Reaver pays twelve hundred, and it has two escorts. Do not go until you can take a gunship alone. | 20 | The Reaver pays twelve hundred, with two escorts. Beat a gunship first. | 12 |
| You took the Reaver. Watch for the flash before it rams. Then get out of the way. | 17 | The Reaver: watch for the flash before it rams, then move. | 11 |
| You finished a patrol, so they opened the Reaver bounty. Think about it twice. | 14 | Patrol done, so the Reaver bounty opened. Think twice. | 9 |
| You have {kills} pirates on your tally already. Count them if you like. Just do not start enjoying it. | 19 | {kills} pirates down. Count them if you like. Do not enjoy it. | 12 |

**IDA KETTER**

| before | words | after | words |
|---|---|---|---|
| You came all the way down for me. I still have not found the right way to say thank you. | 20 | You came down for me. Thank you. | 7 |
| On the ground the crawlers feel like a second wind. You hear them before you see them, and then they are everywhere. | 22 | You hear the crawlers before you see them. Then they are everywhere. | 12 |
| The thin air makes everything sound far away. When I closed my eyes in the pod I could still hear the beacon. | 22 | Thin air makes everything sound far away. I still hear the beacon. | 12 |
| I heard the last call did not go well. Take it from someone who was on the other end: keep going back. | 22 | The call failed? I was on the other end. Keep going back. | 12 |
| Another pod? Tell them to keep the beacon on and the door shut. That is what saved me. | 18 | Another pod? Tell them: beacon on, door shut. That saved me. | 11 |
| You are heading out again already? Please come back. I would like to hear how it goes. | 17 | Heading out again? Please come back and tell me how it goes. | 12 |

**ATHENA, the ship computer (file only: content/npcs/ship-computer.md)**

| before | words | after | words |
|---|---|---|---|
| Ship's computer, ready. Ask me about the route, the ship, your job or the controls. | 15 | Ship's computer, ready. Ask about the route, the ship or the controls. | 12 |
| Tell me to plot a course, open the map or set your destination, and I will. Buying anything is your call. | 21 | I plot courses and open maps. Buying is your call. | 10 |

JUNO's second line is also the Halcyon bar line (`content/stations/halcyon-station.md`), changed the same. A line that was already 12 words or fewer is kept (JUNO's shield reaction, SABLE's patrol line, TAMSIN's third line, ATHENA's two short greetings).

## 3. The Campaign's computer lines and the two comms toasts (`ui.md`, `ux-help.md`, `ux-lose.md`, and the code table `src/contenttables.js`)

| before | words | after | words |
|---|---|---|---|
| The MULE is leaving the hangar. Stay inside her ring: she runs faster and takes half damage. | 17 | The MULE is leaving. Stay inside her ring: faster, half damage. | 11 |
| The Reaver is south-west of Reaver's Rock. Watch for the flash before it charges. | 14 | The Reaver waits south-west of Reaver's Rock. Watch for its flash. | 11 |
| W A S D fly the carrier and Space fires its gun. 1 launch, 2 attack, 3 escort, 4 guard, 5 recall. Tab is the map. | 26 | W A S D fly, Space fires, 1 to 5 order the wing. | 13 |
| Tab opens the map of the whole level, with Earth, the convoys, the aliens and your ships on it. Tab or Esc closes it. | 24 | Tab opens the level map. Tab or Esc closes it. | 10 |
| Carrier hull {hull} of {max}. Earth's shield {earth} percent. {out} ships out, {bay} still in the bay. | 17 | Hull {hull} of {max}. Earth {earth} percent. {out} out, {bay} in bay. | 12 |
| Carrier hull {hull} of {max}. {out} ships out, {bay} still in the bay. | 13 | Hull {hull} of {max}. {out} out, {bay} in bay. | 9 |
| Launch the wing early (1): the fighters draw their fire. Keep the carrier moving. | 14 | Launch the wing early (1): fighters draw fire. Keep moving. | 10 |
| Aliens that reach Earth shell it. Send the fighters at them (2) or guard (4) before a wave arrives. | 19 | Aliens at Earth shell it. Send fighters (2) or guard (4) early. | 12 |

`camp.help.keys` is the one line over 12 words (17): it lists the five orders by name because the pilot asked which keys, and `tests/uxhelp.mjs` pins that the spoken keys equal the HUD's key line. The test allows it by name.

## 4. What Short says aloud (`src/voice.js`, `VOICE_SPOKEN_LIMIT`)

| | before | after |
|---|---|---|
| a first sentence under this many letters takes the second one too | 70 | 45 |
| nothing is said past this many letters in one go | 170 | 120 |

Short (Settings > Sound > Spoken replies, the default) still says the first sentence, and the second only when the first is tiny, so a cue like "Choose." keeps the line before it. **Full** and **Off** are untouched; the strip always shows the whole answer.

## 5. The computer's own answers and the rules it is given (`src/shipcomputer.js`, `src/chat.js`)

| before | words | after | words |
|---|---|---|---|
| There are no pirates in deep space right now. They come at you when the jump ends. | 16 | No pirates in deep space. They come when the jump ends. | 10 |
| Pirates show on the radar and the B list in flight. Launch first. | 13 | Launch first: pirates show on the radar and the B list. | 11 |
| {star} is not charted yet. It shows on the galaxy map once it is inside your jump range, or a call names it. | 22 | {star} is not charted yet. It appears in jump range. | 10 |
| I can approach, keep range, orbit, match speed or cruise to the selected target. Which one? | 16 | Approach, keep range, orbit, match speed or cruise. Which one? | 10 |
| Select a ship first, in the overview or by clicking it: I cruise to ships. | 15 | Select a ship first: I cruise to ships. | 8 |
| Nothing is selected. Press N and pick a target, or tell me where. | 13 | Nothing is selected. Press N and pick a target. | 9 |
| The yard is at a station, pilot: dock first, then ask me again. | 13 | The yard is at a station, pilot. Dock first. | 9 |
| No job is accepted. Jobs are taken at the MISSIONS terminal in a station. | 13 | No job accepted. Take one at a station's MISSIONS terminal. | 10 |
| The fleet is only yours in the Campaign, pilot. Press K on the title screen. | 15 | No fleet here, pilot. Campaign: press K on the title. | 10 |
| The carrier is only yours in the Campaign, pilot. Press K on the title screen. | 15 | No carrier here, pilot. Campaign: press K on the title. | 10 |
| That is your own decision and your own key press, pilot. I can only advise. | 15 | That is your call and your key press, pilot. | 9 |
| "how do I jump": To jump: press G for the galaxy map, pick a star with the arrow keys or a click, then press Enter. The jump charges for 4 seconds; Esc or S cancels. It needs the star in jump range, the fuel for it (the pump is on a station's upper deck) and no pirate close by. Or tell me "fly to" and a star. | 62 | Press G for the galaxy map, pick a star, press Enter. The jump charges for 4 seconds; Esc or S cancels. It needs jump range, fuel and no pirate close by. | 30 |
| "how do I trade": There is no goods market. Ore: shoot the rocks of an asteroid belt with Space, collect the ore, then dock (slow, close in, press L) and it sells itself. Jobs: at a station's MISSIONS terminal press E, choose a call with its number key and press E to accept; courier and haul runs pay most. | 54 | No goods market. Shoot asteroids with Space for ore, then dock (L): it sells itself. For jobs, press E at a station's MISSIONS terminal. | 24 |

**The rules the models are given** (what makes the answers they write short; the words are code, not content):

| where | before | after |
|---|---|---|
| computer, RULES (`SC_RULES`) | Be brief: one or two short sentences, plain words ... more (at most four short sentences) only when the pilot asks | Be curt: one short sentence, about 12 words, the fact first, plain words, no pleasantries ... more (at most three short sentences) only when the pilot asks |
| computer, plain-reply format (`SAY:`, twice) | one or two short sentences for the pilot (up to four only when the pilot asked for more) | one short sentence for the pilot, about 12 words (up to three only when the pilot asked for more) |
| the bar characters' reply rule (`CHAT_RULES`) | Reply in one to three short sentences | Reply in one short sentence, about 12 words |
| ATHENA's persona card | Brief: one or two sentences, more only when asked to explain. | Brief: one short sentence, about 12 words; more if asked. |

The token and letter caps (160 tokens, 320 letters by default, 300 and 700 when asked for more; 120 tokens for a character) are **unchanged**: the rule shortens the answers, the caps only cut what runs on.

## Not changed, and why

- **The Campaign story lines** (`camp.l1`, `l2`, `l3` before and after, 12 rows): space-game-campaign-belt (2-GEN) rewrites them to the same rule. The test counts them as untouched.
- **The win card's result line** (`camp.win.result`, `camp.win.resultconv`): it is for reading and not said aloud (`tests/uxwin.mjs`).
- **Shown-only text**: the H screens, the tips under them, the mission board and its steps, the key hints (`hint.*`), the first-run tips, the error lines of the microphone and the keys (`src/listen.js`, `src/chat.js`) are read, not spoken. They are not in the test.
- **What the model is shown, not what it says**: the STATE, HOW and KEYS blocks of the prompt (long on purpose, the answer is what is short).
- **Lines already short**: every `camp.say.*`, `camp.no.*`, `camp.nav.*` and `camp.nudge.*` row was 12 words or fewer. The example pack's JUNO line in `mods/example` is a demo of the mod screen.
- **Lines a model writes**: an answer from the chat key is the model's own words; the rule above is what shortens it. With no key the characters say the lines in section 2.

## Assumed (say if wrong)

- "Spoken" means everything the ship, the computer and the characters say or write as speech: event lines, the computer's answers, the characters' lines and reactions, the Campaign's computer lines and the MULE's and Reaver's toasts. The characters' scripted lines are shown typed, and spoken only when a reply comes through the chat; they are shortened too, as Troy said "the NPCs".
- "About 12 words" is a hard 12 in the test (a `{placeholder}` counts as one word, "W A S D" as four), with one named exception (above).
- The Short change (commit 4) is in scope: Troy's complaint was how long the ship talks, and Short is what it says by default.
- A line's meaning is kept; where a joke needed two sentences (MOSS's "I will not charge extra for the lecture", JUNO's "not drunk, just late") the fact stayed and the joke went or was cut to half.

## Checked

`node tests/voicecurt.mjs` (21 checks, failing 16 before the first change; commit `a28db3b`); the touched node suites `uxhelp`, `uxlose`, `uxwin`, `uxvoice`, `uxnudge`, `campnav`, `campaign`, `shipcomputer`, `shipacts`, `voiceshort`, `flyto`, `cmdstrip`, `listen`, `content`, `contentapply`, `contentholes`, `contentadd`, `modsdoc`; `node tools/build-content.mjs --check` (sealed); `node tools/economy-sim.mjs check`; `node tests/hygiene.mjs`. Not run (they need a browser, and the rule is logic tests only): `tests/voice.mjs`, `tests/chat.mjs`, `tests/contentproof.mjs`, `tests/npcs.mjs` — their pinned words were edited to the new text (`voice.mjs` the launch line, `contentproof.mjs` the TAMSIN edits) and read carefully, but not run.
