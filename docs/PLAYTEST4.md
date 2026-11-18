# Long Haul playtest notes, round 4: the new flight (2026-11-17)

By 6-GEN for card `space-game-playtest-4`. The flight assist, click to move, the Heavy feel, the raiders' new fight and the lounge keys, played in the real game in headless Chrome under the test lock with `--mute-audio`, the game clock stepped by hand so the numbers are exact. The walk is `tests/playtest4.mjs` (not in the smoke), run in parts of under five minutes: `PT4_PART=a` to `g`, a screenshot per step in `tests/out/pt4-<step>.png`, the numbers in `tests/out/playtest4-<part>.json`.

**What it ran against.** None of this was on main when the walk ran, so it ran against a scratch branch (`playtest-4-mix`) that merges the seven cards as they stood in review: assist-core `c7692b6`, click-to-move `eec1dc0`, ship-weight `ab5beaa`, assist-orbit-match `209a42d`, fight-feel `118f853`, assist-hud `b311beb`, lounge-quick-go `2191835`. They merge cleanly except `content.generated.js` (assist-hud against lounge-quick-go), which a rebuild settles (`node tools/build-content.mjs --seal`). The strobe fix of bug 1 (`a205049`) came during the walk and is not in these numbers.

**What a script cannot tell you.** It measures: seconds, pixels, how often the engine lights. It does not feel. The "how it feels" lines below are read off those numbers and the screenshots; the one thing only Troy can judge is whether Heavy is fun.

## Bugs, worst first

| # | Where | What happens | State |
|---|---|---|---|
| 1 | `assist.js`, `assist_orbit.js` | **The engine and the nose strobe whenever the target moves.** In 20 s: Keep at range beside a ship flying straight lit the engine 86 times and reversed the nose 116 times; on a circling raider 281 and 444; Orbit round a still buoy 312 and 558; Match speed 113. On a still target: 1 and 0. In the game against one raider: 307 engine starts in 30 s. The range is held to a few pixels; the price is a flame and an engine note that flicker 4 to 15 times a second. | Card `space-game-assist-nose-chatter` (1-GEN). Fixed on its branch at `a205049` with a throttle and a memory for the nose; my own simulation of that commit gives 20 starts or fewer in every case, and 18 at worst over 60 random Match speed targets. Not yet seen in the game. |
| 2 | `assist.js` against `handling.js` | **The assist does not fly Heavy.** The same 2,000 px Approach from a standing start, nose the wrong way, takes 6.7 s under Classic and 6.7 s under Heavy: the assist has its own flight model with Classic's numbers. Under Heavy the hand needs 2 s to reach top speed and coasts 13 s; the assist does neither, so Z is a way round the feel the player chose. | Card `space-game-assist-flies-heavy` added. |
| 3 | `clickmove.js` | **A click on the HUD flies the ship.** With the assist on, a click on the mission panel, the radar, the hull gauge or the key line gives an Approach to the point in space behind it. The mission panel also collapses on a click, so one click does two things. | Card `space-game-click-through-hud` (mine). |
| 4 | `clickmove.js` | **Space does not fire while the order button is held.** Holding the mouse button after a click keeps the guns quiet, Space included: 0 shots in half a second of Space. The file's own notes say Space still fires. | Card `space-game-click-hold-mutes-space` (mine). |
| 5 | `assist.js` toasts | **Every order is a toast, and they stack over the target.** Click a ship, press 2, press 1: three two-line toasts cover the top centre of the screen, and the ship just clicked was under them (`pt4-click-ship-then-keys.png`). The HUD panel already says all of it. A ship ordered by key is named "the ship"; the same ship clicked is "the raider". | Card `space-game-assist-order-toasts` added. |

Not bugs, but they will be felt:

- **Space held does not kill a raider any more.** Before fight-feel, Keep at range with Space held killed a raider in 1 s (it flew straight at the nose). With fight-feel it circles: 30 s of Space held on one raider, 0 kills, 0 hull lost; on three raiders, 1 kill (at 4.7 s), 16 hull lost and one ram (19 px). The assist keeps the nose on the line to the target, the raider crosses it, the shots go behind. That is the right fight for a ship, and it is what card `space-game-gun-lock` (in progress) is for; until that lands, a fight flown by assist does not end.
- **A hit does not end an order** (the autopilot ends on a hit; the assist flew on at hull 90). I think that is right for a fight; it is written here because the two pilots differ.
- **A click needs to be within 34 px of a ship.** 20 px off a raider picks it; 40 px off is a move order to the point beside it. On a ship that circles at 360 px/s that will often miss.

## Each mode: how it feels, and the one number

| Mode | What the walk saw | How it feels | The one number I would change |
|---|---|---|---|
| Z on and off | "Flight assist on. 1 Approach 2 Keep at range 3 Orbit 4 Match speed"; 1 with no target says "No target. Press N and pick one."; Z in the middle of an order ends it and says "Flight assist off." | Clear. | None. |
| Approach | Station from 3,000 px, nose away: 8.2 s, one burn, one brake, top speed 480, stops 267 px out at 9 px/s with "L Dock at Halcyon Station" up, and L docks. Planet: stops 116 px off the surface with the land prompt up. A point, with 400 px/s of sideways drift to kill first: 5.1 s, ends 6 px from it. | Like a ship: it turns, burns once, brakes once. The best of the set. | None. |
| Keep at range | Still target from 2,000 px: settles at 493 px, engine off, nose steady. From inside (150 px): backs out to 508 px, but the nose reverses 24 times on the way (bug 1). | Good on something still; restless on anything that moves (bug 1). | `ASSIST.keepRange` 500 to 600: a raider's guns reach 520, so the default parks you inside them. |
| Orbit | Round a buoy at 400 px: on the circle to the pixel (404 to 405), 260 px/s, about 10 s a lap. | The path is right; the engine is not (bug 1: 332 starts in 20 s). Judge it again after the fix. | None until bug 1 is in. |
| Match speed | Beside a ship at 152 px/s: 200 px abeam after 15 s, 5 px/s of difference, status "matched". | Does what it says. Same strobe (bug 1). | None until bug 1 is in. |
| Click to move | Real mouse events. 200 px away: 2.0 s. 500 px ahead: 2.8 s. 400 px behind: 3.4 s, it turns first. Ends 7 to 16 px from the ring. No shot fired by the click. A second click in mid flight is taken, but the nose reverses 38 times re-aiming (bug 1). | Direct. The ring with a cross says where; the ship goes. | `ASSIST.dead` 20 to 10: it stops up to 16 px short of the ring, which shows on a 14 px ring. |
| Click to target | Station: "Target: Halcyon Station", then 1 approaches it. A drone: amber corners, "Target: the drone", 2 keeps range on it, 1 approaches. | Works; the toasts get in the way (bug 5). | `CLICKMOVE.ship` 34 to 48 px, so a moving ship is easier to hit. |
| Classic by hand | W held: 348 px/s at 0.5 s, 480 at 1 s. Half turn 0.9 s. Lets go: stops in 5.5 s over 777 px. S: stops in 1.6 s over 222 px. A tap of D: 21 degrees. | The game as it was: instant. | None. |
| Heavy by hand | W held: 38 px/s at 0.5 s, 195 at 1 s, 480 at 2 s. Half turn 1.2 s, and the nose swings 25 degrees more after the key is up. Lets go: 13 s and 1,859 px to stop. S: 2.7 s, 386 px. A tap of D: 1.9 degrees. | Has weight, and the long drift reads as space. Two worries: a tap does almost nothing, so small aiming corrections are gone; and half a second of W gives 38 px/s, which may read as a dead key. | `HANDLING.heavy.turnUp` 380 to 200 ms: keeps the swing, gives the tap back. |
| Raider fight | Guns cold, Keep at range on one raider for 20 s: it stays 407 to 728 px off, hull lost 0. Space held: see above. | The raider now looks like it is flying a fight. The player's side of it waits for gun-lock. | `PIRATES.raider.aim` or its shot timing: 20 s inside its gun range cost 0 hull, so a lone raider cost a ship that holds its range nothing. |
| Escort | A click on the MULE picks her ("Target: MULE"). The whole run as the game plays it, twice, Keep at 250 px on her, Space held, hands off: the ship sat 261 to 270 px off her, she crawled at 50 px/s nearly all the way (pirates within 500 px of her all the time), went from 200 hull to 90 and to 85, and made the gate in 45 to 50 s: "+400 cr". The player lost 36 and 56 hull; the held trigger killed 2 to 3 pirates by luck and, in one run, hit a civilian ("Fine: 30 cr"). Then: "Target lost. You have the stick." | The assist makes the escort a job you can do with one key and no flying, which is the EVE feel asked for; but the nose stays on the MULE, so you guard her by sitting there, not by shooting. Needs gun-lock to be a fight. | The line when she arrives: "Target lost" reads as a failure on a mission you just won. Say nothing, or "The MULE is through." |
| Lounge keys | Hint "1-6 go to a spot E interact WASD walk". 1 BAR, 2 MISSIONS, 3 FUEL, 4 SHOP, 5 REPAIR, 6 SHIP: each put the player exactly on its spot (0 px off). At MISSIONS, E opened the board; with the board open, 1 did not move the player. | Instant. | None. Not checked: that E reaches the desk at the other five stops. |
| HUD panel | TARGET, the name, RANGE 53 km, CLOSING 38, the order and its state, the four keys with the live one lit; the assist's own text line is off while it shows. | Reads at a glance. | None. |

## The two pilots together

- P during an order: the assist ends, the autopilot takes over, says so. 1 during the autopilot: the autopilot ends, the assist takes over. No fight over the ship.
- Approach to the station ends inside the dock range and under the dock speed, so "1, wait, L" docks. The same at the planet for landing.

## Cards added

- `space-game-assist-nose-chatter`: bug 1 (1-GEN, fixed on its branch during the walk).
- `space-game-assist-flies-heavy`: bug 2.
- `space-game-click-through-hud`: bug 3.
- `space-game-click-hold-mutes-space`: bug 4.
- `space-game-assist-order-toasts`: bug 5.

## Running it again

`PT4_ROOT=<a tree with the flight cards> PT4_PART=<a to g> node tests/playtest4.mjs`. Parts: a the orders, b the fights, c Orbit and Match speed, d the mouse, e the two pilots, Classic against Heavy and the HUD panel, f the escort, g the lounge. A part holds the one Chrome of the Mac for one to four minutes; a part that reaches 280 s skips what it has left and says so. Once the cards are on main, `PT4_ROOT` is not needed. Worth a second run after bug 1 and gun-lock land: parts b, c and f are the ones that will change.
