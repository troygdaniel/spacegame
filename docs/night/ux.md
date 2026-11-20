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

_Filled in as the commits are made (below)._
