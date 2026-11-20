# The play log

Long Haul keeps a plain record of how it is played, on this computer, so the way a person plays can be looked at and talked through (card `space-game-playlog`).
It is local only. **No word typed or spoken is in it** (the ship computer and the bar chat are logged as "it happened, it took this long, it failed with this code"),
no key, and nothing is sent anywhere: the only other place the lines go is `tools/serve.mjs` on the same machine.

## What is in it

One JSON line per event, `{ t: ms since the session began, s: session id, ev: name, ... }`. The events and the only fields each may carry are `PLAYLOG.fields` in
`src/playlog.js`; a field that is not on the list is dropped, and a string is cut to plain characters.

| event | what it says |
|---|---|
| `session` | start (with the window size and the mods on, and `prev: unclean` when the last session never ended), end (and why: `pagehide` is the tab closing or the page reloading), off, resume |
| `scene` | the screen on top changed: from, to, seconds spent in the one it left. Pause and Settings are scenes, so every pause and every Settings visit is a line |
| `dock`, `system`, `jump` | docked, the star system changed, a jump started |
| `sample` | every 10 s: where, the ship, credits, fuel, hull, speed, whether it is flying itself, the call |
| `mission` | accepted, done (with the pay), failed, dropped |
| `buy`, `sell`, `credits` | a deal (what, and the credits it moved); credits that moved with no deal (fees, finds) |
| `death` | what killed the ship (the nearest raider's kind) |
| `counts` | every minute: how many times each ACTION was used (`key:flight: thrust`, `click`, `voice`) |
| `computer`, `computer_plan`, `npc_chat` | the ship computer asked (ms, ok, code, and `why` for an empty reply: length, refusal, filter or blank) and which action of its closed list it chose; the bar chat (ms, ok, code, why) |
| `voice_reply` | one spoken answer of the ship computer is over: seconds heard, whether the player stopped it and how (`end`, `u`, `esc`, `click`), the Spoken replies mode (`short`, `full`, `off`), the letters said and the letters of the whole answer. Counts and seconds only |
| `listen` | the microphone asked early at the launch from a station (`early`: ms the launch waited, `why`: granted, blocked, allowed, declined, slow); a press of the voice key (U), one line a step: `start`, `ring` (`done`: the ring filled; or `held`: how long it was held when it did not), `open` (ms the microphone took), `stop` (`held`: seconds it listened; `why`: silence, again, lead or cap; short, silent), `clip` (bytes), `heard` (ms, `chars` of the transcript: 0 is empty) and `end` (`why`: `sent`, or the plain line shown: tap, silent, nothing, denied, nokey, slow...). Counts and times, never the words |
| `idle` | **no input for 20 s or more**: how long, and what was on screen (scene, panel, call, system, flying itself). The best sign of confusion |
| `fps_dip` | under 30 frames a second for 2 s or more |
| `stall`, `tab` | the page froze (no tick for 5 s); the tab was hidden or shown |
| `campaign` | the Campaign mode (card `space-game-campaign-tune`), one line a step. `start` (level, `via`: menu, address, next, retry, skip or hub), `wave` (the wave reached), `order` (which order, `how`: key, strip, voice or click, `ok`: false when it did nothing), `lost` (what was lost: a small ship or the carrier), `tech` (the piece picked), `debug` (a debug key: skip, win, lose or god) and `end` (`result`: win, lose, quit or skip; `why`; the highest wave, the ships lost, the carrier's hull left). `secs` is the time since the level began, worked out by the log. A level still open when the tab closes is ended as `quit`. A level ends once (a second `end` for the same level is ignored). The log watches the game's `campNew`, `campStep`, `campOrder` and `campPick` from outside, and the debug keys (`src/campdebug.js`) say their own steps; `how` and `via` come from the last argument the scene passes (`campOrder(C, name, arg, how)`, `campNew(level, techs, { via })`). In the Campaign scene a key is counted as `key:campaign` (a debug key as `key:campaign: debug skip`) and is never a "key that did nothing". How to tune it: `docs/CAMPAIGN-TUNING.md`. Names from a closed list or one plain word, numbers and counts: never a word typed or said |
| `error` | every JS error, rejected promise and `console.error`, with the stack (the home folder shortened to `~`), 30 a minute at most |

A key is counted by what it **does** (from `src/data_controls.js`, by the screen you are on), never by its letter; a key pressed in a text box is activity and no action.

A key that does nothing on its screen is counted as `key:other` and also as `nokey: <screen> <code>` (for example `nokey: Galaxy KeyJ`, `nokey: Space F5`): the screen it was
pressed on and the **physical key's code** (`event.code`), so a list of the keys a player reaches for in vain can be read (card `space-game-keys-awkward`). It is never the
character a key types, never from a text box (every typed-text field of the game is a real `<input>`, so a key pressed in one never reaches the log), never a chord with
Ctrl, Cmd or Alt, never a held-down repeat and never a key of an input method. A code that is not plain letters and digits is `Other`. The counts are per minute, with no order
and no times between presses, so nothing typed can be read back out of them. `node tools/playlog-summary.mjs` lists them on one `No action:` line, most pressed first.
The ANYWHERE keys of the controls table (Esc, H, M, Tab) count as their own action (`key:any: pause`) in every screen that has a table (flight, station, ship bay, surface); on a
screen with no table of its own (the maps, Pause, the ship's computer) every key is `key:other`, which is why the raw code and the screen are kept beside it. Before 18 Nov 2026 the
ANYWHERE rows were never read, so Esc, H and M in flight were `key:other` too (Troy's first log: 70 `other`, 7 of them the Esc that opened a pause).

## Where it goes

- **Always:** a ring of chunks in this browser's localStorage (about 480 KB, the oldest chunk goes first). Works from a double-clicked `index.html`.
- **With the dev server** (`node tools/serve.mjs`): each batch is also POSTed to `/__playlog` and appended to `~/dev/spacegame-playlogs/<date>-<time>-<session>.jsonl`
  (or `--playlogs DIR`, or `$LONGHAUL_PLAYLOGS`), **outside the repo** (the server refuses a folder inside it), mode 600. The first line of a file says the commit.
  The server takes the POST only from its own page (Origin and Host checked), `text/plain`, 256 KB at most, only well-formed lines of that session.
- **Settings > Reset > PLAY LOG:** ON or OFF (default ON), Download log (a `.jsonl` file), Forget log (a second press; a copy the server kept stays in its folder).

## Reading it

    node tools/playlog-summary.mjs                  the newest file of ~/dev/spacegame-playlogs, its last session
    node tools/playlog-summary.mjs FILE [--session ID | --all | --json]

One screen: playtime, where the time went, the credits curve, deals and profit, calls, deaths and causes, what was pressed most, idle gaps with what was on screen
(the ones while the ship flew itself counted apart), the ship computer, errors, frame dips, and where the session ended.

## For the code

`src/playlog.js` loads last (after every script it watches) and starts itself. It changes no other file's code: it looks at the game once a second and wraps a few of the
game's own functions (`buyUpgrade`, `fleetBuy`, `fleetSell`, `sellOre`, `buyFuel`, `jumpStart`, `voiceSay`, `shipcompAsk`, `shipcompPlan`, `chatComplete`,
`Space.prototype.die`, `Station.prototype.repairHull`). It never throws and never slows a frame: every entry point is in try/catch, a frame is a few additions, writes are
batched (one 24 KB chunk every 5 s). The Campaign says its steps through one door, `campaignNote(step, data)` at the foot of `src/playlog.js` (`campaignNote('wave', { level: 1, wave: 2 })`): quiet with no logger, never throws, 120 campaign lines a minute at most (a level's start and end always get in). The summary has a **Campaign** block, one line a level. Tests, all plain Node: `tests/playlog.mjs` (a fake clock, store and sink, a fake game and window), `tests/playlogserve.mjs`, `tests/playlogsummary.mjs`.
