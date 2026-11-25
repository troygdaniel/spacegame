---
type: text
---
The words the new screens share (card space-game-screens-f-foundation; Troy, 25 Nov 2026): the prefix scr. is for the screens around the flight (src/screens.js, src/scrhost.js; the mock is docs/screens-mock.html). Landing F has only the Settings row that turns them on; each later piece adds its own screen's keys here or in a file of its own, under scr.<screen>. (title, ready, refit, rank, pick, brief, won, lost, pause, keys, settings). A key chip is never a word of this file: it is read from the key table (src/data_controls.js, CAMP_SCREEN_KEYS) by src/screens.js.

## Strings
| key | text |
|---|---|
| scr.set.row | New screens |
| scr.set.on | New screens: ON |
| scr.set.off | New screens: OFF |
| scr.set.hint | The menus in the new look, with fewer words. Kept in this browser. A page address ending in ?screens=0 turns it off, ?screens=1 turns it on. |
| scr.set.said.on | New screens ON. |
| scr.set.said.off | New screens OFF: the screens are as they were. |
