# Keys: a proposal for Troy (card `space-game-keys-awkward`, 18 Nov 2026)

**No key of the game has moved and no line a player sees has changed.** (The play log itself changed, see below.) Three questions at the end; each is a yes or a no.

## What Troy's first log says (13 min 20 s, 720 key presses, `node tools/playlog-summary.mjs`)

- **Turning is the work:** A/D were pressed 224 times, 31 % of every key press and the most of any action (thrust 160, fire 86, brake 65). A key held down counts once, so these are 224 separate presses.
- **The mouse does not turn the ship.** A click fires, unless flight assist is on. Assist is off at the start (`ASSIST.on = false`); Z, picking a ship in the B list or an order (1 to 4)
  turns it on. The first key line (`src/space.js`) does not mention Z.
- **He used the keys that are on the first key line and barely the ones that are not.** On the line: places N 19, ships B 14, autopilot P 7, dock L 7. Not on it: galaxy map G 4 (jumps: 0),
  sector map Tab 2, mission panel T 1, cruise C 0, flight assist Z 0. That fits "I did not know how to jump".
- **`other` was 70 presses (10 %), and the number was wrong in a way that matters:** the logger never read the ANYWHERE rows of the controls table, so Esc (Pause), H (help) and M (mute)
  counted as `other`, and so did every key in a screen with no table of its own (the maps, Pause, the ship's computer). He paused 7 times: up to 7 of the 70 are the Esc that opened a pause, and the presses inside Pause were `other` too (it has no table). The bursts of 10 to 17
  line up with time in Pause (65 s once, 24 s once), the galaxy map and the minute before the ship's computer opened; that is a reading, the log cannot prove it (it counts per minute).
- **Not in the log at all:** which keys. That is what the logger change on this card is for: the next session lists `No action: Galaxy KeyJ x5, ...` (the screen and the key's own code,
  never a typed character, never from a text box).

## The keys that mean different things in different screens (from `src/data_controls.js`)

| key | flight | elsewhere |
|---|---|---|
| S | brake (and cancels a cruise) | sell the ship, press twice (bay); Settings (title) |
| C | cruise | controls tab (bay); controls panel (surface); NPC chat key (title) |
| T | mission panel | chat in the bar (station) |
| N | places | menu on or off (station) |
| F | call the fuel ranger | fleet tab (bay) |
| R | autotarget | rename the ship (bay) |
| V | gun lock | ship voice key (title) |

The same everywhere (good): G galaxy map, I ship's computer, U hold to talk, Esc back or pause, H help, M mute, Tab sector map. Nothing in the log shows a wrong press from the table above, so I
would **not** move any of these now.

## Assumed, not evidence (what a new player reaches for)

Mouse to steer or aim, WASD, Space or click to fire, Esc for a menu, M or Tab for a map, E to use something. The game already has WASD, Space, Esc, Tab, E. M is the mute key; many games make it the map.

## Your call

1. **First key line: add `G jump` and `H help`, take `Q/E dash` off it** (dash: 2 presses in 13 minutes). Text only (`src/space.js`), no key moves. *Recommended: yes.*
2. **Turning with the mouse.** (a) Put `Z fly by click` on the first key line and in the first-run tip: assist already flies to a click; text only. (b) Build a real mouse turn (the ship
   follows the cursor while a button is held): a new control, its own card. *Recommended: (a) now, (b) only if (a) is not enough after the next log.*
3. **Move no key until the next logged session.** The raw list will say which keys he reaches for; I will write the second half of this proposal (the keys themselves) from it. *Recommended: yes.*

## Answers (Troy, 18 Nov 2026: yes, yes, yes) and what was done
1. Done (card `space-game-key-line`): the first key line is `... N places  B ships  G jump  H help  Z fly by click`; `Q/E dash` is off it. The key still works.
2. (a) Done: the first flight's tip says `Z: click to fly there.` (the tip stands in for the key line on a first flight, so it is where a new player reads it). (b) is not built.
3. No key has moved. The next logged session lists the keys that did nothing (`No action:` line of `node tools/playlog-summary.mjs`); the second half of this proposal waits for it.
