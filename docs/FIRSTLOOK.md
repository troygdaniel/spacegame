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
