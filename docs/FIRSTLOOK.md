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
