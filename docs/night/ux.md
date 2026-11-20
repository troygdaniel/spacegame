# Night: the Campaign's UX (5-GEN, 20 Nov 2026)

Card `space-game-night-ux`. Troy loves the keyboard controls, so **no key is changed or added anywhere in this file's commits.** Analysis first (below), then small changes, each its own `[night] ux` commit that reverts alone (table at the end), then proposals for what would change how it plays. Main is tagged `campaign-before-night`. The analysis is from the code and from the Campaign played in plain Node (the real scene code on a stand-in scene, tests/campaign.mjs' own way), not from the browser.

## What was looked at

The first minute (the intro card, the key line, the first launch, what is said and when), the strip and voice (what a new player can ask and what comes back), the lose and win screens, the story and tech cards, the pause card, the HUD, the Tab map, and the message queue (the one toast box, the ship's voice queue).

What is already good, so nobody "fixes" it: every refusal says why in plain words ("No fighters are out. Launch first."); there is one message box and a new message replaces the old one (nothing stacks); the toast band (y 86 to 150, centred) and the left HUD stack (x up to about 330) never touch; the key line at the bottom ends at x 998 of 1280; a retry is one key and keeps the techs; the map and the radar agree on colours.

## Findings, most important first

1. **The briefing never says what to do, in the default voice mode.** Settings > Sound > Spoken replies is Short by default, and Short speaks the first sentence or two of what it is given. The scene gives it the whole story joined into one text, so only the setting is spoken and the tasking is cut: level 1 says "Unknown ships ... heading for Earth. You have the Lunar carrier, pilot." and never "Launch the wing, cover the convoys, and kill their mothership."; level 2 never says "Gather what we need, and find it before they do."; level 3 never says "Break the defence towers round their world."; level 3's end never says "The war is not over." (The card shows all of it, but the voice is what a player who looks at the carrier hears.) Evidence: `voiceSpokenText` on `campStory(n, 'before').join(' ')`, run for each level.
2. **The ship's computer cannot answer a plain question in the Campaign without a chat key.** In the Campaign the local reader (the words that need no key) knows only the five fleet orders. "help", "what do I do", "what keys", "how do I fire", "what is my goal", "show the map", "status" and "how is the carrier" all fall through to "The ship's computer needs a chat key: Settings > Keys." A new player has no key yet, and "help" is the first word they will try. Evidence: `shipcompLocal` on 38 phrases (the five orders answered, every question null).
3. **The lose card says what happened and nothing else.** "The carrier is lost." or "Earth's shield has failed." and "Enter try again". No how far you got, no hint of what to do differently. Since a retry is free, the missing half is the advice.
4. **The objective is "Destroy the alien mothership." for the first 140 seconds, when there is no mothership.** It arrives with the third wave. A player who has launched and won wave 1 has nothing to aim at and an instruction they cannot follow. (Level 2 and 3 objectives are state-aware and fine.)
5. **The bay gauge reads `BAY  6+2    OUT  0`.** Nothing says that is six fighters and two escorts.
6. **Nothing nudges the first launch.** The intro card says "Launch the wing" without the key, the key line at the bottom (small and grey) says "1 launch". A player who reads the card and then flies about gets no help until the aliens arrive at 20 s.
7. **The pause card has no goal on it.** After a break, "what was I doing?" is answered by the HUD line behind the card only.
8. **The win card is two story lines and no result.** Time, hull left, convoys delivered and ships lost are what Troy is tuning with, and what makes the win feel earned.

## Proposals (these change how it plays or what a key does: not done, for Troy)

- **Order 2 right after order 1 is refused** ("The wing is still launching."): the bay takes 4.8 s to empty (8 ships at 0.6 s). 1 then 2 is the most natural pair. The order could be kept and given to each fighter as it leaves. Changes play.
- **T on the pause card leaves the level at once**, with no "press again". An accidental T throws the level away. A second press would be a key behaviour change.
- **The intro card can only be left with Enter.** Esc or T there could go back to the title (a player who pressed K by mistake must start the level, pause, press T).
- **A countdown on the wave line** ("WAVE 1 OF 3 IN 14 s"). New information on the HUD.
- **"show the map" by words**, through the closed action list (src/shipcomputer.js SC_ACT).
- **Enter on a card could cut that card's own voice** (voiceStop, as U, Esc and a click on the strip do in Long Haul).
- **Level 2's objective** could say what a cache looks like ("gold pods").

## What changed, and how to undo each

Eight changes, in this order, each ONE commit that reverts alone (`git revert <hash>`). Proved on a scratch copy: each one reverted by itself leaves every Campaign, content and hygiene test green. A commit that adds words has them in a file of its own, `content/text/ux-<name>.md`, and a revert of one of those meets one conflict, in the sealed `content.generated.js`: take either side and run `node tools/build-content.mjs --seal` (it rebuilds the file from the markdown; `--check` says when it is right). The words are not in `content/text/ui.md` because that file is at 194 of the 200 rows a content file may have (`LIMITS.rows` in `src/content.js`): **a new string in ui.md now needs a new file or a bigger limit.**

| # | Change | Commit | What it does | Undo | Look at in the morning |
|---|---|---|---|---|---|
| 1 | Story spoken line by line | `8bc05b7` | The scene gives the voice each story line on its own, so Short mode says the tasking too. One line in `say()` of `src/campaignscene.js`. `tests/uxvoice.mjs` | `git revert 8bc05b7` (clean) | Start level 1 with Spoken replies on Short: the ship says "...Launch the wing, cover the convoys, and kill their mothership." |
| 2 | Local answers in the strip and voice | `95bce58` | "help", "what do I do", "what keys", "how do I fire", "show the map", "status": answered with no chat key. `src/camphelp.js`, one line in `shipcompIntent`. `tests/uxhelp.mjs` | `git revert 95bce58` (+ reseal) | In the Campaign press I and type `help`, `what do I do`, `status`: a plain line each, no key needed |
| 3 | Lose card: how far and what to try | `e6d304b` | Cause, "You lasted 1:42: wave 2 of 3, 5 aliens down.", and a tip. `src/camplose.js`, `showLost`. `tests/uxlose.mjs` | `git revert e6d304b` (+ reseal) | Lose a level (or press `[`): the card has three lines |
| 4 | Goal before the mothership comes | `1fe2a88` | Level 1's goal line reads "Hold off the waves; the mothership comes last." until the mothership is there. One line in `campObjective` (`src/campaign.js`). `tests/uxgoal.mjs` | `git revert 1fe2a88` (+ reseal) | The line under the HUD at the start of level 1, and again when wave 3 brings the mothership |
| 5 | Bay gauge in words | `6315877` | `BAY  fighters 6  escorts 2   OUT 0` for `6+2`. One line in `paintHud`. `tests/uxbay.mjs` | `git revert 6315877` (clean) | The HUD, top left, before and after pressing 1 |
| 6 | Goal on the pause card | `7224e4b` | `Goal: ...` is the first line of the Esc card. One line in `showPause`. `tests/uxpause.mjs` | `git revert 7224e4b` (+ reseal) | Press Esc in a level |
| 7 | Win card result line | `0e8f28c` | "Won in 3:12. Carrier hull 420 of 600, 2 of 2 convoys delivered, 1 of your ships lost." under the story, not spoken. `src/campwin.js`, `showWon`. `tests/uxwin.mjs` | `git revert 0e8f28c` (+ reseal) | Win a level (or press `\`): the card has a third line |
| 8 | Two first-minute hints | `b2b1569` | Level 1 only, once each: "Press 1 to launch the wing." at 6 s if the wing is still in the bay; "Press 2 to send the fighters at the aliens." at 26 s with the wing out and aliens about. `src/campnudge.js`, one line in `update`. `tests/uxnudge.mjs` | `git revert b2b1569` (clean) | Start level 1 and wait 6 s without pressing anything |

No key was changed or added. Each change touches the scene by one or two lines and keeps its own logic in a small file of its own (`camphelp.js`, `camplose.js`, `campwin.js`, `campnudge.js`), so a revert takes nothing else with it.

Not done because they change how it plays or what a key does: everything under Proposals above. Each of the eight findings has its change in the table; nothing was left out for lack of time.
