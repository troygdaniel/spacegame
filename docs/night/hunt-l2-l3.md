# Overnight bug hunt: Levels 2 and 3, flown as a player (card `space-game-night-hunt-l2-l3`, 5-GEN, 21 Nov 2026)

Main `eec8146`. Troy asked, going to sleep, for bugs found and fixed overnight. Level 1 is being rewritten tonight (cards `space-game-l1-*`): its mission scripts are not touched here, and the checks written here look at levels 2 and 3 only. Undo anchor: `git tag level1-before-rim`. Bug fixes only (feature freeze); anything that is a design decision is listed for Troy and not put into code.

**How it was hunted.** The wrap-up playthrough (`docs/WRAPUP.md`) did not fly missions 2.1 and 3.1 on the final build, so they come first. Each mission was flown two ways: (1) in the logic sim with a tape (`tools/campaign-bot.mjs`'s player with every event, toast and HUD line written down), and (2) in the real game, muted, through the Chrome lock, in parts under five minutes with **`tests/camphunt-boot.mjs`** (new, by hand, not in the smoke): K, the ready room, the three briefing screens, the warp, the story card, then a player's keys (W thrust, D and A turn, Tab map, Q E C panels, P pace, E then Shift+5 for the Fast burn), the fight, the debrief and the room after it, with every toast the game showed written down. Pictures go to `~/dev/spacegame-night/shots/hunt-*.png` (not in the repo).

## Findings, ranked

(Filled in as the hunt goes; each line says what, how to see it, and the state: **fixed** with its test, **open** with the owner, or **decision** for Troy.)

### Fixed

| # | rank | finding | how to see it | fix and pin |
|---|---|---|---|---|
| 1 | minor | **Mission 2.1: the Fast burn to Alpha Centauri B ends on top of the cloaked wreck.** The wreck (the mission's "find the cloaked cache" bonus) lay 293 px from where the burn ends; the cruiser runs on and decloaks it within two seconds of arriving ("The cloak is down! ... guards coming out"), with the wing still in the bay and three guards on it, and the +250 find bonus comes free for anyone who uses the autopilot. | `?campaign=2` (or K with a save at level 2), Enter, Enter, Enter, Enter; E then Shift+5; 17 s in the toast appears. `hunt-21-9-arrived.png`. | The wreck moved from `[-3600, -400]` to `[-3300, -1100]` (between the first two caches, 450 px off the autopilot's line to either; still sensed from the route: "Odd readings ahead"). `tests/camphunt.mjs`: no anomaly of levels 2 and 3 within 660 px of any mission's burn line or arrival point. |
| 2 | minor | **The Tab map and the briefing gave two times for the same trip.** The briefing: "Route 579 km: 15 s regular, 7 s on Fast". The map's route label: "568 km, about 30 s" (and its Fly, Fast and Scout buttons the same): the map counted to the middle of the place, the briefing to the edge of the arrival circle, where the mission begins and the autopilot lets go. | Level 2, mission 1: read the briefing, launch, press Tab (`hunt-21-6-map.png`). | `campNavFlight` (src/campnav.js) is the one rule: a mission's own place, before arrival, is flown to the edge of its circle; the map's label and its three buttons use it. The km stay the distance to the middle (the HUD's own). `tests/camphunt.mjs` (4 checks). |
