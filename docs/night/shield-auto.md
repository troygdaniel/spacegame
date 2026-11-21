# Shields mend by themselves (card space-game-shield-auto, Troy, 21 Nov 2026)

Troy's goal: fights were not interactive and escorts were boring; he wants to direct the fleet more. Paying ore to refill the shield was a chore on the SHIP panel, so the shield now mends by itself, at a rate the SYSTEMS shield pips set. Undo anchor: `git tag fleet-command-before`.

## What changed

| | before | now |
|---|---|---|
| Shield mend | none at 0 to 2 pips, 3 a second at 3 pips, 6 at 4 | **0 / 1.5 / 3 / 6 / 10 a second at 0 / 1 / 2 / 3 / 4 pips**, after 3 s with no hit (`CAMP.power.shields.regen`, `regenDelay`) |
| SHIP panel | 6 rows: mine, recharge, fighter, escort, goal, dock | **5 rows: mine (1), fighter (2), escort (3), goal (4), dock (5)** |
| The burn | E then Shift+5 | E then Shift+4 |
| Dock | E then 6 | E then 5 (HUD hint "E 5  dock at ...", briefing key line, retreat line) |
| Ore | recharge (25 for a full shield, 40 for 200 Earth points), ships, hull mend | ships and hull mend |
| Voice and strip | `fleet_recharge` is offered to the model and runs the order | not offered; "recharge shields" is still understood and answers "Shields mend on their own. More pips on shields mend faster." |

The SYSTEMS panel's shield row now says the mend too ("2 pips: shield 150, mends 3/s", "0 pips: shield 75, no mend"). It is the carrier's shield on every level, pirates and aliens alike: nothing in a level script names it.

## Assumptions (the card left them open)

1. **Earth's ore recharge went too.** The row did both (the carrier's shield, or Earth's when the cruiser was near it). Earth keeps its own slow mend (`CAMP.earth.regen` 3 a second after 6 s). The level 1 bots win as before (below), so I did not touch Earth's numbers; say so if Earth should mend faster.
2. **Rates.** 3 a second at the default 2 pips is the slow base (a whole shield in 50 s), 10 at 4 pips the fast one (the 225 cap in 22 s, and the emergency shields now give 100 points in their 10 s). The card said "fast at 4 to 6": a system holds 4 pips at most (`CAMP.power.max`), so 4 is the top.
3. **Delay** is the existing 3 s (`regenDelay`), the same for every pip count.
4. **The old words stay understood.** A pilot who types or says "recharge shields" gets the one line above, not a silent "I could not do that".
5. **The bots (`tools/campaign-bot.mjs`) needed no teaching:** the plain bot never used ore for shields, so it gains the mend for free. Six seeds, every mission of the three levels, steady skill, plain bot: 100 percent wins before and after; the median hull is the same or higher (1.3 mission 3 unchanged at 600; 3.2 859 to 900; 3.3 402 to 524).
6. The old pin of the 120 s battle (`tests/campsystems.mjs`, `tests/campscouts.mjs`) moves only in the shield (136 and 113.6 to 150): the carrier, the kills, the missiles and the turrets are the pins of before.

## Where

`src/campaign.js` (the regen row, `CAMP.recharge` and `campRecharge` removed, the order answers `shieldauto`), `src/camppanel.js` (the recharge helpers; the shield row's state), `src/data_controls.js` (the table), `src/shipcomputer.js` (the model's action list and the how-to), `src/campaignscene.js` (the recharge flash), words in `content/text/campshield.md` and the key lines of `campbrief.md`, `campoutpost.md` (with their defaults in `src/contenttables.js`). Test: `tests/campshieldauto.mjs`; the suites that pinned the old rows and the old pin were moved.
