# Testing Long Haul: what runs in Node and what needs Chrome

The tests are `tests/*.mjs`, run by `bash tests/smoke.sh`, which finds each one by the `// smoke:` line at the top of its file (node-only tests first, then Chrome; `docs/SMOKE.md`). The slow, shared part is **headless Chrome**: only one runs at a time across every worktree (`tests/lock.mjs`), so every test that opens Chrome waits in the same queue. A test that does not need a browser should not be in that queue.

## The rule

**A test needs Chrome when it needs a scene**: Phaser drawing, the game loop stepped by hand, a key press, the DOM, Web Audio or a screenshot. A test that only calls the game's functions and reads its tables (the save, the fleet, the content merge, the prices, a mocked fetch) does not. Those run in plain Node with `tests/nodegame.mjs`: about a second, no lock, in parallel with anything.

## `tests/nodegame.mjs`

```js
import { nodeGame } from './nodegame.mjs';
const t = nodeGame();                 // the scripts of index.html (not Phaser, not main.js), then loadGame() and contentApply(), as the page does first
await t.ev('G.credits');              // like t.ev in tests/cdp.mjs: a plain value, array or plain object, else null
t.run('modsPickFiles(...)');          // the raw value (a promise, a class instance)
t.errors;                             // console.error calls, like t.errors
nodeGame({ root: copyOfTheGame });    // a game copy with another content.generated.js (tests/gamecopy.mjs)
nodeGame({ store });                  // the same Map as localStorage: a second nodeGame is a restart of the page
```

What it is and is not:

- It runs the real scripts, in `index.html` order, in one `vm` context with a plain `localStorage`, `setTimeout` (never keeps Node alive), no `setInterval` and no network (`fetch` rejects until a test installs its mock, as `tests/chat.mjs` does).
- Names a browser has and Node has not (`Phaser`, `document`, `AudioContext`, `Image`...) are stand-ins that accept anything (list: `BROWSER` in the file). A name that is neither a stand-in nor a JavaScript built-in is a ReferenceError, so a test that reaches for a browser **fails**, it does not pass on nothing.
- A stand-in does nothing: no scene is made, nothing is drawn, no key is read, `document.body.innerText` is not text. If a check is about any of that, it belongs in Chrome.
- `tests/nodegame.mjs` was compared once with the page (a throwaway script, not kept): the snapshot of every table the proof set reaches (`SNAP` in `tests/contentproof.mjs`, 2304 situations per character) and the loader's report came out of Node and out of Chrome equal, field for field. If the scripts grow a new need of the browser, `nodeGame()` throws a ReferenceError and names it: add it to `BROWSER` only if a stand-in is honest for that test.

## Which test is which

**Node only** (no Chrome at all): `content`, `contentapply`, `hygiene`, `locktest`, `modsdoc`, `savemig`, `worldat`, and `node tools/economy-sim.mjs check`.

**Node first, then Chrome for the part that needs a scene** (one test file, one Chrome turn, or fewer than before):

| Test | In Node | In Chrome |
|---|---|---|
| `contentproof` | the loader's words and every table of four game copies | one Chrome, opened once, visits the four copies: what the Station scene pays and the console errors |
| `mods` | B4: a pack adds a call, a character, a ship, a voice file; the shared limit; a picked folder | B1 to B3: the Mods screen, the folder picker's real `<input>`, a tampered storage |
| `chat` | part 1: the provider adapters with a mocked fetch (keys, headers, 401, 404, 429, three failures) | parts 2 to 6: the setup panel, the pause menu, the bar, memory, voice |
| `fleet` | part 1: the rules of the yard, prices, buy, sell, switch | part 2: a real save and a death |
| `shipmodels` | part 1: the table pinned to the design | part 2: the Space scene |
| `calls` | part 1: the rows, the pay, each station's board, a courier and a haul from board to dock, sites, jumps, death, the save | part 2: the boards in the Station scene and a paid courier across a jump, one Chrome |
| `systems` | part 1: the eight systems of the design table, which ship reaches which, the layouts, every dock and pirate table | part 2: the shipped files equal the code's rows, each system flown and each station docked at, one Chrome |

**Chrome only**, and why:

| What needs the browser | Tests |
|---|---|
| a scene with the clock stepped by hand (flight, pirates, a jump, the hangar) | `cruise`, `interdict`, `jump`, `launch`, `missions`, `parts`, `hyper`, `surface`, `bounty`, `fuel`, `loop`, `ribbons`, `outpostmap`, `systemart` |
| keys and panels (terminals, the Journal, Settings, the galaxy map) | `journal`, `npcs`, `hangar`, `shipsheet`, `shipmode`, `settings`, `galaxymap`, `contentui`, `credits`, `fixes` |
| Web Audio (the ship voice speaks, levels against the wind) | `voice`, `audiolevels`, `sfxlevels` |
| the game starting, a page reload or a screenshot | `scenes`, `contentboot`, `serve`, `contentadd`, `stationshots`, `hudshots`, `world`, `ships` |

`playtest2`, `playtest3` and `probe` drive the game to write notes; they are not part of the smoke. `cdp.mjs`, `lock.mjs`, `gamecopy.mjs` and `nodegame.mjs` are helpers.

## Writing a new test

1. Can it be written with `nodeGame()` and `t.ev(...)`? Then it should be: it will not wait for anyone.
2. Does the first half need only functions and the second a scene? Put the first half in `nodeGame()` and open Chrome once for the second, in the same file.
3. Opening Chrome more than once in a file costs a turn at the lock each time. Open it once and navigate (`t.send('Page.navigate', ...)`), as `tests/contentproof.mjs` does.
4. Keep every check: moving a check to Node is fine, dropping one is not. If a check is vacuous in Node (the page text of a canvas), say so in the test and make sure a Chrome test has it.
