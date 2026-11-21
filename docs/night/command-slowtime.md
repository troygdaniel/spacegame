# Command time: the battle slows while you give orders (card space-game-command-slowtime, Troy, 21 Nov 2026)

Troy's goal: fights were not interactive and escorts were boring; he wants to direct the fleet more. Undo anchor: `git tag fleet-command-before`.

## What changed

**(a) Command time.** While the FLEET, SHIP or SYSTEMS panel, the Tab map or an order-call prompt is open, the battle runs at a quarter speed (`CAMP.slow.scale` 0.25). A sign says so: "COMMAND TIME  x0.25" in a pill at the top centre and a thin cyan frame round the screen, above the map and the panels (depth 300). Closing returns to pace at once.

**(b) Fights slower overall.** I took the three pace values down by 15 percent rather than touch the fighters' own speeds: Calm 0.7 to **0.6**, Normal 0.85 to **0.72** (the default), Brisk 1 to **0.85**. The pace scales every small ship's top speed, acceleration and turn (fighters, escorts, raiders, drones, gunships), and their shots by the square root, so it is the closing speed and nothing else: hull, damage, fire intervals, the carrier, the big ships, the burn and the warp stay. The three notes on the Settings page say the new numbers.

## Assumptions (the card left them open)

1. **The whole battle slows, not only the small ships.** The scene steps the sim by `dt x C.timeScale`, so every clock in it slows together: waves, reloads, the blink and emergency cooldowns, the mission timers. That is Homeworld's pause-and-order, and it keeps one clock for the sim (no half-slowed state).
2. **The autopilot's trip is part of the battle,** so a burn flown while a panel is open is slowed too. With nothing open, flying between places is exactly the sim as it was (tested against the sim stepped by itself).
3. **"Brisk" is no longer the table's own numbers.** A battle made with no pace, or with the number 1, still is (the pins, `tools/campaign-bot.mjs --pace 1`, the tests); `brisk` is now 0.85. The pace test and the dogfight duels moved to say so.
4. **5-GEN's order calls.** `campCallOpen(C)` (src/camporders.js, landing soon) opens command time through a `typeof` guard, so this file works before and after it lands; `C.timeScale` is 0.25 while a call waits, as 5-GEN asked, and his 8 s clock divides `dt` by it.
5. **One line the first time** a session slows ("Time slows while you give orders."); the sign is enough after. A pilot who taps Q and a digit quickly sees the sign flash for a moment; that is the price of a sign that is always true.
6. **The bots** step the sim themselves, so command time never touches them and they need no answer to it. The plain bot still wins every mission at Calm, Normal and Brisk (`tests/camppace.mjs` E; the table in the hand-in).

## Where

`src/campslow.js` (new: `campSlowOpen`, `campSlowScale`, `campSlowInstall`, `campSlowPaint`), `src/campaign.js` (`CAMP.slow`, `C.timeScale`, the pace values), `src/campaignscene.js` (the frame and the sign), `index.html`, words in `content/text/campslow.md` and the pace notes in `content/text/campaign-pace.md` (defaults in `src/contenttables.js`). Test: `tests/campslowtime.mjs`; `tests/camppace.mjs` moved with the values.
