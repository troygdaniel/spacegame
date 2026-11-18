# First look

Since 17 Nov 2026, 21:02, cards land on logic tests only (plain Node, `node --check`, the economy and content checks). A new screen can reach the
owner without ever having been drawn. This is the log of the one look each such screen gets (card `space-game-first-look`).

## The rule

- When the gate reports a visual card on main, one agent opens the real game once in headless Chrome: one run, under 5 minutes, muted, through the test lock.
- The window is 1458 px wide, the owner's. The game is a 1280 by 720 canvas that scales to fit, so the picture shows what he sees.
- The agent looks at the picture itself. Plainly broken means: nothing drawn, text off the screen, panels on top of each other, a console error.
- Plainly broken and small: fixed on a branch at once, the card's owner told on the chat. Not small: handed to the owner as a card.
- Anything else (taste, wording, a better place for a panel) is noted here and left alone.

## How

    node tools/shots.mjs --look              every first-look view, into tests/out/firstlook/
    node tools/shots.mjs --look menu nav     only the views whose name has one of these words

The views are in `tools/shots.mjs` (`LOOKS`). A view of a card that is not in the checkout fails with "not in this checkout", it does not take a
wrong picture. Views come and go with the cards; the critic's ten fixed pictures (`docs/CRITIC.md`) are a different list and do not change.

## Log

| When | Card | Picture | Verdict | Fix |
|---|---|---|---|---|
| 17 Nov 21:13 | `space-game-nav-panel` | `nav-panel.png`, `nav-panel-set.png` | **Fine.** The panel draws under the mission checklist, the chosen row has its amber bar, the pinned line and the foot line ("Enter  go: autopilot and cruise") read well at 1458 px, no console error. Noted, not broken: with the mission checklist open only 4 lines fit (the foot says 7 more below). | none |
| 17 Nov 21:22 | `space-game-system-distances` | `far-map.png` | **Fine.** The Tab map of the system three times the size: 2,700 km across locally, Kepler-4b 838 km away, the labels and the right column in place. Noted: the KEPLER-4B label sits on its own marker ring. The trip itself: see the next row. | none |
| 17 Nov 21:27 | `space-game-station-menu` | `station-menu.png`, `station-menu-walk.png`, `station-menu-roost.png` | **Works, two small things fixed.** The menu draws low on the right over the hangar crates, six rows with their key caps, the amber bar and the foot line; with the keys handed to your feet it dims and says "N  menu". Every desk and the bar stay in view. Broken: stood at a desk by the menu, the YOU tag covered the middle of the desk's plate ("REP YOU BAY"); and the first-run tip still said to walk left to the terminal. | `dd8ab71`: the tag is under the feet; the tip names the menu row and its key |
| 17 Nov 21:27 | `space-game-no-backdrop-bodies`, `space-game-real-solar-system` | `sky.png` | **Fine.** No sun, giant or moon painted on the sky: stars only, and the radar shows the star at the centre with the orbit rings. No console error. | none |
| 17 Nov 21:33 | `space-game-system-distances` | `far-cruise-mid.png`, `far-cruise-end.png` | **Fine.** From the Halcyon launch to the farthest body, Tern, 9,500 km away, sent the way the navigation panel sends you (autopilot, which cruises the middle): it flew clear of the station, cruised and let go 51 km from Tern ("Tern ahead. Autopilot off.") inside 20 s of game time, no console error. The world is 108,000 px a side. Noted for the owner: three times the distance is still a 20 second trip. A plain C beside the station still refuses ("too close to the mass"), as before. | none |
| 17 Nov 21:38 | `space-game-station-menu` (after `dd8ab71`) | `station-menu-walk.png` | **Fine.** Stood at the repair bay by the menu: the YOU tag is under the feet, the REPAIR BAY plate reads whole, the tip on the south wall says "Pick Missions in the station menu, bottom right (press 2)." | none |
| 17 Nov 21:38 | `space-game-assist-overview-overlap` | `overview-orders.png` | **Fine.** The Overview list under the radar with a Keep at range order on the gate: the target row is marked, the order line under it (982 KM, CLOSING 450, BURN) and the five order buttons (1 Approach, 2 Keep lit, 3 Orbit, 4 Match, V Lock) sit inside the panel, nothing on top of the radar or the navigation panel. No console error. | none |
| 17 Nov 21:44 | `space-game-one-way-to-target` | `one-target.png`, `map-dest.png` | **Fine.** Places in the navigation panel on the left, ships only in the Overview on the right, side by side with nothing on top of the other; the Tab map rings the destination ("Destination: Kepler-4b 840 km") and its key line no longer offers to pick. | none |
| 17 Nov 21:44 | `space-game-real-solar-system` | `radar-fight.png`, `star.png` | **Radar: draws right, one note.** The radar is the whole system (the star in the middle, a ring a body) in and out of a fight. Noted for the owner: three raiders 30 to 90 km off all sit on your own mark, so the radar no longer says which side a near enemy is on (the target box and the Overview do). **Star: no verdict yet**, my picture had the disc off the left edge; the view is reframed for the next run. | none |
| 17 Nov 21:52 | `space-game-dock-by-command` | `dock-order.png`, `dock-order-end.png` | **Works.** Enter twice on the Halcyon Station row from 180 km out: "Docking at Halcyon Station. Any key takes the stick back.", and 8 s of game time later the Station scene is up. | none |
| 17 Nov 21:52 | `space-game-bug-travel-refuses-near-mass` | `clear-mass.png` | **Works.** C beside Kepler-4b with the gate as the target: the autopilot takes it at once (stage "clear": "Clearing Kepler-4b, then cruising to Perseus gate"), and the cruise is on 5 s later. | none |
| 17 Nov 21:52 | toasts (seen in `dock-order.png` and `clear-mass.png`) | same | **Overlap, handed on.** With two or three toasts up at once the stack covers the autopilot's readout line (it shows through as grey text under the second toast) and the right half of the pinned destination line, and touches the folded mission box. It clears when the toasts fade. Not a small fix: the toast stack is shared by every scene. | card `space-game-toasts-cover-readout` |
| 17 Nov 22:05 | `space-game-real-solar-system` | `star.png` (reframed) | **Drawn, one note.** The Halcyon Sun is where the body is, as a soft yellow glow with long rays. Noted for the owner: from 80 px off its rim there is no disc with an edge, only the glow, so up close it does not read as a ball you have arrived at. | none |
| 17 Nov 22:05 | `space-game-bug-runs-out-of-jump-range` (the mission board) | `board.png`, `board-far.png`, `board-dim.png` | **Two things fixed, the new dimming is fine.** Broken since 14 Nov, not by this card: four cards side by side are 1106 px and the panel behind them was 900, so the outer two hung 100 px outside it each side; and the haul's first line ran to four lines, out under its card. The card's own work, seen in a ship with 7 light years of range: the three runs out of reach have a dim title and place, an amber OUT OF JUMP RANGE line that fits above REWARD, and "Out of jump range for this ship." beside BRIEFING; E does nothing on them. Noted: the E Accept hint still shows on a dimmed call. With the starting ship every run at Halcyon is in reach, so the dimming never shows there. | `d77a663`: the panel is 1160 wide; `3b5ec7d`: a card's text stops at two lines |
