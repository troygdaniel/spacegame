# Long Haul: content in markdown (design and build plan)

> Making a mod? Start with the ten-minute guide, [`docs/MODS.md`](MODS.md). This page is the design behind it.

Design by TaskMaster-1, 2026-11-13, for card `space-game-modding`. This is a plan, not code. It says what players and modders get, the file formats, how the game reads them, the answer to the `file://` problem, what has to be done before the repo can go public, and the cards that build it.

Troy's goal: Long Haul is open source in spirit. The content lives in plain markdown files so a player can change a ship, a mission, a shop price or what a bartender says without touching code.

| # | The card asks | Section |
|---|---------------|---------|
| 1 | Content as markdown with simple front matter, one file per thing, a short template for each | 2, 3 |
| 2 | A loader that validates with friendly errors and never shows a blank screen | 5 |
| 3 | The `file://` problem | 4 |
| 4 | Open-source basics: LICENSE, README, CONTRIBUTING, no keys or personal data, .gitignore | 7 |
| 5 | Migrate a few existing things as proof, tests stay green | 8 |

## 1. The one rule

**Markdown carries words and numbers. Code carries behaviour.**

A content file can say what a mission is called, what it pays, what the board says about it and what the bartender mutters when you are rich. It cannot say what a mission *does*. Doing is a `kind` that the code implements (`rescue`, `escort`, `patrol`, `bounty`, later `courier`, `haul`, `salvage`, `survey`), and a content file picks one. A new kind is a normal code contribution; a new mission of an existing kind is a file.

This keeps mods safe (a content file is only ever text and numbers: it cannot run code, read the save, call the network or read a key), keeps the loader small, and makes every error explainable in one line.

What that means for each thing:

| Thing | In markdown | Stays in code |
|---|---|---|
| Ships (player and pirate) | name, description, every stat, price, colours from a fixed list | the drawing (`ships.js`); a new silhouette is a code contribution; a mod picks `art:` from the built-in set |
| Parts and upgrades | slot, tier, price, effect numbers, text | the mechanics each slot has |
| Star systems | name, kind, galaxy position, danger, the bodies and where they are, services and prices | how a `station`, `planet`, `belt`, `poi` body is drawn and behaves |
| Missions | kind, title, reward, counts, every line of text, unlock rule from a short list | what each kind does |
| NPCs | name, role, colour, where they stand, scripted lines, reaction lines, the persona card for chat | the chat engine (`space-game-npc-chat`) |
| Ship voice lines | the lines, per event | when an event fires (`space-game-voice`) |
| Prices and text | shop prices, station names and welcome text, UI strings | what a screen does |

## 2. Folder layout

```
content/                 the core pack: what the game ships with. One file per thing.
  ships/       wren.md  kite.md  raider.md  drone.md ...
  parts/       engine-1.md  shields-2.md ...
  systems/     halcyon.md  kestrel.md ...
  stations/    halcyon-station.md ...      services, prices, text, bar lines
  missions/    rescue.md  escort.md ...
  npcs/        juno.md  tamsin.md  dex.md ...
  voice/       hull-low.md  launch-clear.md ...
  text/        ui.md                       strings by key (also the way to translate; read in name order, last wins)
  _templates/  ship.md  mission.md  npc.md ...   copy one to start; a name starting with _ is ignored
mods/                    player packs (section 13): mods/<name>/missions/..., same layout, ignored by git except mods/example/
mods.generated.js        made by tools/build-content.mjs from mods/, loaded by index.html (the example pack; your own packs too, locally)
content.generated.js     made by tools/build-content.mjs, committed, loaded by index.html
src/content.js           parser, schema, validator, merge (no Phaser: runs in the browser and in Node)
tools/build-content.mjs  content/ -> content.generated.js
tools/serve.mjs          optional dev server (section 4)
tests/content.mjs        parser, validator and loader tests
```

Rules: a file's id is its name without `.md` (`ships/kite.md` is the ship `kite`); `id:` in the front matter may repeat it and must agree. Ids are `a-z`, `0-9`, `-`, start with a letter, 40 characters at most. A file starting with `_` or `.` is ignored. Sub-folders are allowed and ignored for naming (`missions/side/courier-1.md` is still `courier-1`).

## 3. The file format

A markdown file with front matter, and sections under `##` headings.

```
---
type: ship
name: Kite
role: fast courier
hull: 70
speed: 580
boost: 950
price: 4500
trim: cyan
---
A thin needle with swept-back fins. It looks fast standing still.

## Hangar line
Fast, light, and very easy to break.
```

### 3.1 Front matter
- Between two lines that are exactly `---`, at the top of the file.
- One `key: value` per line. A line starting with `#` is a comment. Blank lines are fine.
- The **schema decides the type of a value**, the file never guesses: `hull: 70` is a number only because `hull` is declared a number. `name: 1984` stays the text `1984`.
- Types: `text` (rest of the line, quotes optional), `int`, `num`, `bool` (`yes`/`no`/`true`/`false`), `color` (`#rrggbb` or one of `cyan amber red green gold white pink`), `id` (a reference to another file, checked), `list` (`[a, b, c]`), `pick` (one word from a fixed list).
- Every field has a range (a ship hull is 10 to 1000). Out of range is an error, not a silent clamp, so a typo is seen.
- `type:` is required and must match the folder (`ships/` takes `type: ship`), so a file dropped in the wrong place says so.

### 3.2 Sections
Under a `## Heading` the body is one of three shapes, chosen by the schema:
- **text**: paragraphs (blank line = new paragraph, a single newline is kept as a line break, as the mission board does today).
- **list**: lines starting with `- `. Each item is one entry (NPC lines, steps).
- **table**: a pipe table, first row is the header, second the `---` separator; each row becomes an object. A table is how nested data stays readable (the bodies of a system, the items of a shop).

The text before the first `##` is the file's **description** (shown in the hangar, the shop, the mission board, depending on the type).

### 3.3 Placeholders
Text may use `{name}` placeholders from a short list per type, filled by the game: `{reward}`, `{count}`, `{progress}`, `{station}`, `{system}`, `{credits}`, `{ship}`, `{kills}` (pirates you have destroyed) and, in a mission, `{hull}` (the percent of hull the bounty target has left). In a mission's own text `{reward}` and `{count}` are that call's, whichever call is open. An unknown placeholder is an error ("{rewrd} is not a known placeholder here; did you mean {reward}?"). There are no expressions, no conditions and no code in text.

### 3.4 Conditions (the whole list)
A reaction line or an unlock rule may carry a `when` from a closed list. A mod cannot invent new ones; a new one is a code contribution.
`always`, `mission:none`, `mission:accepted`, `mission:rescued`, `mission:failed`, `mission-id:ID`, `credits>=N`, `credits<N`, `upgrade:SLOT` (anything fitted in that slot), `upgrade:SLOT>=N` (tier N or better), `hull<N` (less than N percent of the hull left), `kills>=N`, `missions>=N` (calls you have finished), `patrols>=N`, `system:ID`, `ship:ID` (ID, SLOT and N are what you fill in). Put `!` in front of one to mean not, and join up to four with ` and ` (all must hold): `credits>=800 and !upgrade:engine`. In a table the first row that holds is what is said.

## 4. The `file://` problem, and what we chose

**Problem.** The game opens by double-clicking `index.html`, which is a `file://` page. Browsers block `fetch()` and `XMLHttpRequest` of other local files there, and block `import` of ES modules, so the game cannot read `content/*.md` at run time. Only classic `<script src="...">` tags work.

**Options considered.**
1. `fetch()` the markdown: blocked on `file://`. Needs a server for everyone, including players who only want to play. Rejected as the default.
2. A folder picker in the page (`<input webkitdirectory>`): works on `file://` with no Node, but the player has to pick the folder every time the page loads. Good as an extra, poor as the main path.
3. A tiny **build script** that reads `content/` and writes one classic script, `content.generated.js`, which `index.html` loads with a `<script>` tag. Works on `file://`, no server, no browser quirks.
4. A tiny **dev server** (`node tools/serve.mjs`): static files plus rebuild on every change, for a fast edit-and-reload loop.

**Chosen: 3 as the way it works, 4 as an optional convenience, 2 as a later extra (phase 2).**

Why:
- A player who only plays needs nothing: `content.generated.js` is committed, so `index.html` still opens with a double click and there is still no build step *to play*.
- A modder edits a markdown file and runs one command, `node tools/build-content.mjs` (Node 22+, no packages), and reloads the page. `--watch` rebuilds on every save.
- The build script and the game use the same `src/content.js`, so the errors a modder sees in the terminal are the errors the game shows. The build script also writes the errors into the generated file, so even a stale or hand-edited file is checked again in the browser.
- `tests/content.mjs` rebuilds in memory and fails if the committed `content.generated.js` is stale, so it cannot drift.

**The dev server** (card `m6`, `tools/serve.mjs`). For a modder who edits a lot: `node tools/serve.mjs` serves the game at `http://127.0.0.1:8787/` (the next free port if that one is busy; `--port N` picks one), rebuilds `content.generated.js` the moment you save a file in `content/`, prints the problems in the terminal, and puts a small chip in the corner of the page. Press **R** in the page (or click the chip) to reload it and see the change; R does nothing while you type in a box, and Ctrl/Cmd+R stays the browser's own. The game saves when the page closes, so your run carries over. The chip and the R key are added to the HTML as the server sends it: the files on disk, and the game opened by double-click or from any other server, have no dev code in them. It listens on `127.0.0.1` only, serves only files inside the game folder (never a dot-name such as `.git`), and refuses anything but GET and HEAD. Nothing in the game needs it. (Port 8787, not 8765: that is the agentboard's.) `tests/serve.mjs` checks all of this.

`README.md` changes one sentence: "no build step" becomes "no build step to play; one command to rebuild after you edit content".

## 5. The loader and its errors

### 5.1 Pipeline
```
content/*.md --(build)--> parse -> validate -> content.generated.js  (data + the errors found)
                                                   |
index.html loads content.generated.js (script tag) |
boot.js:  contentApply()   validates again, merges, records errors
                                                   |
code defaults  <--- overridden by id, field by field, by valid content
```
- **Parse** (`parseContent(path, text)`): file in, `{ type, id, fields, sections, errors }` out. Never throws. A file without front matter is an error for that file only.
- **Validate** (`validateContent(parsed)`): checks every field against the schema in `src/content.js` and every reference (`id` fields point at files that exist).
- **Merge** (`contentApply()`, run once in `Boot.create`, before the scenes): for each valid entry, copy its valid fields over the in-code default with the same id; an entry with an id the code does not know is **added** if its type can add (voice lines, player ships, missions of the four kinds and bar characters: section 12), else it is an error ("cannot add new ones"). An invalid field is skipped and the default stays. An invalid `type` or `id` skips the file.
- **Code defaults stay.** Until a table has been migrated and its tests pin it, the in-code table is the fallback for every id. That is what makes "never a blank screen" true: the worst a broken mod can do is give you the game as shipped, plus a list of what was wrong.
- If `content.generated.js` is missing or fails to load (`typeof CONTENT === 'undefined'`), the game runs on the defaults and reports one error: "content.generated.js is missing: run node tools/build-content.mjs".
- A duplicate id (two files, same type and id): the later path in alphabetical order wins, and both are named in the warning.

### 5.2 Error messages
One line each, in plain words, with the file, the line, what is wrong, what was expected and what the game did:

```
content/ships/kite.md, line 7: hull is "lots" but must be a whole number from 10 to 1000. Kept the built-in value 70.
content/missions/rescue.md, line 12: "{rewrd}" is not a known placeholder here. Did you mean {reward}?
content/npcs/juno.md, line 9: unknown field "colour". Did you mean "color"? Ignored.
content/ships/kite.md: type is "mission" but this folder takes "ship". Skipped the file.
```
"Did you mean" is a plain edit-distance match (distance 2 or less) against the schema's field names and placeholders.

Where they show up:
- The terminal: `build-content.mjs` prints all of them and a count; exit code 0 (warnings), or 1 with `--strict` (what the tests use for the core pack).
- The browser: `console.warn` for each, and on the **Title** screen an amber chip "Content: 3 problems" that opens a panel (the first 8, then "and 4 more, see the browser console"), in the same glass style as the HUD. The game starts regardless.
- A small "MODDED" tag on the Title screen whenever the loaded content differs from the shipped core pack, so a bug report says whether the game was modded. How: `content.generated.js` carries two hashes, `hash` (the entries in it) and `core` (the shipped pack). A normal build keeps `core` as it was, so after you edit `content/` the two differ; only `node tools/build-content.mjs --seal` moves `core` to the new hash, which is for changing the shipped content itself (`tests/contentapply.mjs` fails if the committed file is not sealed). The browser hashes the entries itself rather than trusting the `hash` line, so a hand-edited generated file reads as modded too, with a warning that its hash does not match. The chip and the tag are in `src/contentui.js`; the panel opens with a click or `P` (`C` on the Title screen is NPC chat).

### 5.3 Limits and safety
A mod is untrusted text, so the loader enforces limits even though the build script has already checked them:
- file at most 32 KB; at most 400 files; a text field at most 400 characters, an NPC line at most 240; a list at most 60 items; a table at most 200 rows.
- numbers must be finite and inside the field's range.
- control characters, zero-width characters and bidi overrides are removed from all text.
- ids are matched with a strict pattern and stored in plain `Map`s, never as object keys named by the file (so `__proto__` and `constructor` cannot do anything).
- text is only ever drawn with Phaser text objects, never as HTML.
- nothing in a content file is ever fetched, evaluated or followed: no URLs are opened, no `eval`, no `new Function`, no `<script>` from content.
- a **persona** (NPC chat) is data that goes into the model's prompt. `space-game-npc-chat` must put persona text in a clearly marked data block and keep its own safety rules outside it, because a shared mod could carry text meant to talk the model out of them.
- content never holds keys. The Deepgram and Anthropic keys (voice, chat) live only in the player's own `localStorage`; a test fails if anything in `content/` looks like a key (section 7).

## 6. Types and fields

Fields marked * are required. All numbers have ranges in the schema; the examples show the shapes, `src/content.js` has the full table. Everything the code tables hold today has a field here.

### 6.1 `ship` (player ships and pirate ships)
`name*`, `role`, `side` (`player` or `pirate`), `art` (pick from the built-in textures), `trim` and `color` (colours). Player ships: `hull`, `speed` (top speed), `boost`, `accel`, `turn` (a multiplier), `tank`, `fuelPerLy`, `range` (jump range in ly), `cargo` (the hold), `guns`, `sensor`, `price`, `yard` (the stations that sell it). Pirate ships keep the names of `PIRATES` in `enemies.js`: `hp`, `speed`, `max`, `turn`, `engage`, `hold` (stand-off distance), `aim`, `shot` (`[min, max]` ms), `bullet`, `dmg`, `spread`, `strafe`, `ram`, `bounty`, `credits`, `radar`; `fireRange` is their shooting range in px (it is `PIRATES.range`; a ship's own `range` is the jump range). Section: `## Hangar line`. Matches `SHIP_MODELS` in `docs/UNIVERSE.md` section 6.1 and `PIRATES` in `enemies.js`. The exact fields and ranges are the `SCHEMA` in `src/content.js`.

### 6.2 `part`
One file a tier, named `<slot>-<tier>` (`shields-1`, `engine-3`; the name says which tier of which slot). `slot*` (engine, shields, weapons, tank, cargo), `tier*` (1 to 3), `name*` (the tier's name in the shop), `brief` (a short form for tight places), `price` (for a Wren: a ship scales it by its price multiplier), and that tier's numbers: shields `points`, `regen` (points a second), `delay` (ms without a hit before it recharges); weapons `delay` (ms between shots), `damage`; engine `speedPct` (+% top speed), `jump` (+ly), `boostAdd` (+px/s boost speed), `boostTank`, `boostRegen`; tank `fuelMult`; cargo `holdPlus`. The text under the front matter is the shop's one-line description. This is `PARTS` in `src/data_parts.js`, which `shipStat()` reads; a file that says the wrong slot or tier for its name is refused with a message.

### 6.3 `system`
`name*`, `kind*` (home, outpost, trade, mining, wild, graveyard, nest), `ly` (`[x, y]`), `size`, `danger`, `traffic`, `seed`, `starType`, `starX`, `starY` (the star: O, B, A, F, G, K or M and where it is), `pirateMax` and `pirateEvery` (a system's own pirate table: at most this many at once, one every this many ms). Matches `SYSTEMS` in `docs/UNIVERSE.md` 4.1 and `src/data_systems.js`.

Section `## Pirates` is a table `kind | weight` (`raider`, `drone` or `gunship`, a weight from 0 to 1): with `pirateMax` and `pirateEvery` it is `pirates: { max, every, weights }` of the code's row, what `enemies.js` `pirateTable` reads. A system with none gets a table from its `danger`.

Section `## Bodies` is a table with the columns `id* | type* | name | x* | y* | art | r | rocks | landable | kind | seed | look | labelDy | credits | hull | guard | note`; use only the columns a file needs. `type` is `station`, `planet`, `belt`, `poi`, `scenery` or `gate`, and each type needs its own columns, or the row is ignored with a sentence saying which:

| type | needs | the rest |
|---|---|---|
| `station` | nothing: its name, prices and words are in `stations/<id>.md` | `art` (`station`, or a look: `hub`, `foundry`, `nest`), `labelDy` |
| `planet` | `r` and a `kind` (`rock`, `ice`, `gas`, `lava`, `ringed`) or `art: planet` (Kepler-4b, the built-in one) | `seed` (the same kind and seed is the same planet on every boot), `landable`, `name` |
| `belt` | `r`, `rocks` | `name` |
| `poi` | `kind` (`wreck` or `beacon`) | `name`, `credits`, `hull`, `guard`, `note` |
| `scenery` | `name` and an `art` (`outpost`, or a station look) or a `look` (`derelict`: a dead station) | `labelDy` |
| `gate` | `r` | `name` (Perseus gate: where the MULE is escorted to) |

`labelDy` moves the name label (pixels, negative is above). A body id is used once in a system; a second row with it is ignored. **A site that has its own file in `poi/` (Halcyon's five) is paid from that file: its row says where, so `name`, `credits`, `hull`, `guard` and `note` in the row are ignored with a warning.** A site without one (every site outside Halcyon) says all of it in its row. A station row needs its `stations/<id>.md` (the name is the file's; a row that gives another name gets a warning, and the file wins) and the file must say the same system; both are warnings when they disagree.

**`worldAt(systemId)`** (`src/contenttables.js`) is the one place that puts these files together, for the cards that jump (`u-b4`), draw the systems (`u-b5`) and dock (`u-e5`). It gives a system shaped like a row of `SYSTEMS`: the code has all eight rows (`u-b5` authored the seven in `data_systems.js`, with the same numbers as the files), so `worldAt` gives the code's own row for every one; `worldFromFiles(id)` builds the row the files alone make, for any of them, Halcyon too (a pack that adds a system the code does not have gets that row). Station bodies carry `dock` (`fuel`, `repair`, `ore`, `yard`, `shop` and `parts` as `src/data_parts.js` reads them, `partMult`, `fee`, `salvageMult`) and `about` (`accent`, `welcome`, `services`, `bar`, `shop`: the words for the Station scene); a site with its own file carries that file's payout. `worldIds()` lists every system. A system nobody knows is `null`, a wrong row is left out, and nothing throws. `tests/worldat.mjs` pins that Halcyon built from its files alone is the code's row, and that every field of the eight systems is in the row the files make; `tests/systems.mjs` pins that the seven rows of the code are those rows, field by field (the words aside).

### 6.4 `station`
`name*`, `system*`, `accent` (colour), `fuel` (price per unit), `repair`, `ore` (buy price), `yard` (the ships it sells, by id: `[kite, ox]`; the six are `wren`, `kite`, `ox`, `talon`, `pathfinder`, `bastion`), `partMult` (the price of its parts times this: 1.25 at the Roost), `fee` (credits it takes at the door), `salvageMult` (what a salvage pays here, times the usual). Sections: `## Parts` (table `slot | tier`: the slots its shop sells and the highest tier of each, so a slot not listed is not sold; no table means tiers 1 and 2 of everything, as Halcyon always did), `## Welcome` (text), `## Shop` (table: `item | price`), `## Services` (list), `## Bar` (list, the generic lines when no NPC is nearby). `Services` is words for the sign; the numbers are the fields and the Parts table.

Read by the game today (card `m5`): `name`, `repair` (credits a point of hull at the repair bay) and `ore` (credits an ore pays when you dock), for Halcyon Station, whose two prices are the game's prices; `system` must be the system the code puts it in. The other five docks are in the code too now (`u-b5`): their file's `name` is applied, and their numbers are the `dock` of their row in `src/data_systems.js`, which the economy card (`u-e4`) will read (a file for one never moves Halcyon's prices). Everything else is checked and kept for `worldAt` (6.3, card `systems-schema-gaps`): a dock is `{ fuel, repair, ore, yard, shop, parts, partMult, fee, salvageMult }`, with `shop: 0` and `parts: { engine: 1, tank: 1 }` when a Parts table lists the slots (`partStockCap` in `data_parts.js` reads that shape), and the words (accent, welcome, services, bar, shop) go on the station body as `about`. A station file for a dock the code does not have is kept, not applied. The `yard` names ships by id; an id nobody has is a warning, and `fleet.js` never sells one it does not know. A reference to a system or station the code defines (`system: halcyon`) needs no file of its own: the build reads the ids from `src/data_systems.js`.

### 6.5 `mission`
`kind*` (from the closed list), `title*`, `where`, `reward*`, `count`, `unlock` (a condition), `system`. Sections:
- `## Offer` text shown on the board.
- `## Board line` a list of `state: text` pairs (`active:`, `rescued:`, `failed:`) for the one-line objective.
- `## Progress` text for the progress view; may use `{progress}` and `{count}`.
- `## Progress rescued` the progress text once the colonist is aboard (rescue calls; other kinds say it with `## Progress`).
- `## Steps` a list: the HUD checklist.
- `## Failure` text when the ship is lost or the mission fails.

This is exactly the shape of a row of `MISSIONS` plus its `HUD_MISSIONS` entry today.

### 6.6 `npc`
`name*`, `role`, `color`, `label` (the colour of the name above them, when it is not `color`), `appears` (a condition: they are in the bar only while it holds; IDA has `missions>=1`), `station`, `x`, `y`, `face`, `voice` (a Deepgram Aura voice name, optional). Sections: `## Lines` (list), `## Reactions` (table: `when | line`), `## Persona` (text, at most 600 characters, for chat).

### 6.7 `voice`
`event*` (from the list in `docs/VOICE.md` once it lands). Section `## Lines`: a list; the ship picks one at random and never repeats the last.

### 6.8 `text`
A table `key | text` of the words the interface says. The keys are the allow-list, and `text/ui.md` lists all of them: `help.<scene>.<line>` (the H screen, one key a line: `help.space.5`), `tips.<scene>` (the tip under it) and `toast.<name>` (the lines that pop up: docking, the call outcomes, signals). A toast may use `{placeholders}` (`{reward}`, `{progress}`, `{count}`, `{name}`); help lines and tips are plain text. **Order:** the files in `text/` are read in name order (`ui.md` before `words.md`, `my-words.md` before `ui.md`) and the **last file to give a key wins**. A file that changes a key must therefore sort after `ui.md`; a file that sorts before it is overridden by it, key by key, and says nothing about it. This is also the way to translate: change the text column in `ui.md` itself, or copy it to a name that sorts after `ui` (`words-fr.md`) and delete the original (a copy named `fr.md` would lose to `ui.md`). A key the game does not read refuses that whole file, with a hint ("Did you mean ..."), so a typo is seen. More strings join as code sites move to `uiText(key)`.

### 6.9 Examples

`content/missions/rescue.md`:
```
---
type: mission
kind: rescue
title: Rescue call
where: Kepler-4b
reward: 500
---
A survey pod went down on the surface.
Pirate drones circle the planet and
crawlers roam the ground.
Land, find the colonist, keep them alive,
walk them back to your ship, bring them home.

## Board line
active: Rescue the colonist on Kepler-4b
rescued: Colonist aboard: dock at the station
failed: Failed. Ask the station for another call

## Steps
- Take the rescue call
- Find the colonist
- Escort them to your ship
- Dock at Halcyon Station

## Failure
Ship destroyed. The colonist was lost. Mission failed.
```

`content/npcs/juno.md`:
```
---
type: npc
name: JUNO
role: bartender
color: amber
station: halcyon-station
---
## Lines
- Welcome to the Drift. The drinks are synthetic, but the gossip is genuine.
- Halcyon turns once every three minutes. If your drink slides toward the hangar, you are not drunk, just late.

## Reactions
| when | line |
|---|---|
| mission:failed | Heard you lost the colonist out there. It happens to every pilot once, so sit, drink, and go again. |
| credits>=800 | You are carrying a lot of credits. The hangar shop would love to meet them. |

## Persona
Warm, dry, sees everything from behind the bar. Knows every pilot's business and keeps most of it to herself.
```

### 6.10 `poi`
Salvage sites and random signals (`src/poi.js`). A file is named for the thing it describes: a fixed site of a star system (`wreck-nw`, `beacon-e`) or a kind of random signal (`signal-beacon`, `signal-wreck`). `kind*` (wreck or beacon; it must match the site) and `name*`; the text under the front matter is the line shown when you salvage it. A fixed site has `credits` (what it pays), `hull` (hull it repairs) and `guard` (pirates that guard it); where it is stays in the system's data. A random signal has `pays` (`[min, max]`), `guardChance`, `hullChance` and `hull`. A file for a site the game does not have is refused.

## 7. Open source basics

Nothing here publishes anything. **Troy decides when and where the repo goes public**; this makes it ready to.

### 7.1 Files to add (card `m3`)
- `LICENSE`: MIT, as ORCH confirmed. The copyright line needs a name: **question for Troy** (a personal name, "Long Haul contributors", or an entity). Until he says, the card uses "Long Haul contributors".
- `THIRD-PARTY.md`: Phaser 3.80.1 is MIT. The vendored `phaser.min.js` carries no licence banner, so the licence text and copyright holder must be added from Phaser's own repository (to be checked against the 3.80.1 release, not written from memory).
- `README.md` rewritten for two readers: *players* (open `index.html`, controls, how to reset a save) and *modders* (the content folder, one worked example, the build command, link to this doc).
- `CONTRIBUTING.md`: how to run `bash tests/smoke.sh`, the content rule (section 1), "no build step to play", small files, where agent-workflow rules went.
- The agent rules now in `README.md` ("Rules for agents", worktrees, ORCH) move to `docs/AGENTS.md`, so the public README is for people.
- `.gitignore`: `.DS_Store`, `node_modules/`, `tests/out/`, `mods/*` except `mods/example/`, `*.log`, `.env*`.

### 7.2 Audit of the repo today (main `6a605f3`, 2026-11-13)
- **Working tree: no API keys, tokens, passwords, emails or phone numbers.** (Searched all text files except `phaser.min.js`.)
- **One personal path:** a comment in `tests/ships.mjs` line 5 named a path inside the author's home folder. Card `m3` replaced it, and `tests/hygiene.mjs` now fails on any such path.
- **Git history: 87 commits are authored by Troy Daniel with his personal email address, and 18 by `ORCH <orch@local>`.** Publishing the history publishes that address. Options for Troy: (a) publish a new repository with one fresh commit and leave this history private (recommended: nothing is rewritten, nothing breaks, all agent worktrees keep working); (b) rewrite authorship with `git filter-repo` to a no-reply address (changes every hash, breaks open worktrees, needs everyone to stop first); (c) accept the email in public. This is Troy's call and is not done here.
- Agent names (ORCH, TaskMaster, BuildBot, DreamBot) and the first name Troy appear in `README.md`, `docs/*.md`, `tests/cdp.mjs`, `tests/missions.mjs`, comments in `src/missions.js` and two commit subjects. No private data; Troy decides if he wants them cleaned.

### 7.3 A hygiene test (card `m3`)
`tests/hygiene.mjs`, run by `smoke.sh`: fails on anything in the tracked files that looks like a key (`sk-`, `Bearer `, `Authorization:` with a value, long random strings next to `key`/`token`/`secret`), an email address, a phone number or a `/Users/<name>` path, with an allow-list for the licence text. It also scans `content/` for the same, since content is where a modder would paste something by mistake.

### 7.4 Player-supplied keys
Voice (`space-game-voice`) and chat (`space-game-npc-chat`) use the player's own key. That is a rule for those cards, repeated here because it is an open-source rule: the key lives only in the browser's `localStorage` (inside try/catch), is never written to a file, never logged, and is sent only to the API host it belongs to. Mods cannot read it (section 5.3).

## 8. The proof: what moves to markdown first

Nothing about play changes. Card `m4-proof` moved this set, and card `m5-more-types` the rest (below the list), and `tests/contentproof.mjs` (smoke step 4x) guards it:
- **Two ships:** `raider` and `drone` (the pirate stat blocks of `PIRATES` in `enemies.js`; `gunship` follows with the rest). `name`, `role`, `side` and the description are read and checked, but nothing in the game shows them yet. When `space-game-u-a3-ship-models` merged, `wren` and `kite` did not move with them: a player ship file is refused until its adapter lands (card `m5`).
- **One mission:** `rescue` (title, place, reward, offer, the three board lines, both progress texts, steps, failure line). The station pays what the file says.
- **One NPC:** JUNO (look, place, voice, lines, reactions, persona). Her file leaves out `station:` because there is no `stations/halcyon-station.md` yet.
- **Nine part tiers:** shields, weapons and engine, tiers 1 to 3 (what `armor`, `rapid` and `booster` became in `space-game-u-d1-parts`). The adapter reads all five slots; tank and cargo files join with `m5`.
- **Eight systems and six stations** (card `systems-content-draft`, after `m4`): `content/systems/` holds Halcyon, Kestrel, Meridian, Brass Reach, The Hollow, Lethe, Ember and Reaver's Roost (the table in `docs/UNIVERSE.md` 4.2: kind, position in ly, danger, traffic, seed, star type, bodies), and `content/stations/` the six docks (name, accent, fuel, repair and ore prices, welcome line, services, bar lines). Card `u-b5` then authored the seven in `src/data_systems.js` (the same numbers, pinned by `tests/systems.mjs`), so the game flies them; the files' own numbers are checked and kept in `CONTENT_WORLD` (`src/contenttables.js`) and the words (welcome, services, bar) wait for the Station scene card `u-e5`. Card `systems-schema-gaps` then gave every field a home (6.3, 6.4): the `scenery` and `gate` bodies, a planet's `kind` and `seed` (they had been written into `art`), a site's `hull`, `guard` and `note`, `labelDy`, a system's pirate table, a station's `yard`, `Parts` table, `partMult`, `fee` and `salvageMult`; and `worldAt(systemId)` reads the lot. Still not in markdown: a belt's `rich` veins and the Roost's discount on the heavy ship (the Services line says it, no number does).

Card `m5-more-types` added, one type a commit: the other three calls (`escort`, `patrol`, `bounty`, with `{hull}` and `unlock`), the other five characters (with the conditions they needed), the salvage sites and random signals (`poi/`), the interface words (`text/ui.md`: help screens, scene tips and 17 toasts, through `uiText(key)`) and the one dock (`stations/halcyon-station.md`: name, repair and ore prices). Still in code, on purpose: player ships (`wren` and the other five), `gunship`, system files, a station's welcome, shop, services and bar sections, voice lines.

How it works: `src/contenttables.js` registers one adapter per type in `CONTENT_TABLES` (`src/boot.js`); `contentApply()` hands it each valid file and it changes the in-code row **in place**, only the fields the file sets. A file that disagrees with the code (a part in the wrong slot, a call of another `kind`, a pirate that says `side: player`) is refused with a message and the row stays as it was. A file with an id the code has no row for is refused too ("cannot add new ones") unless its type can add (card `m9`, section 12).

For each, the in-code table stays as the default and `tests/contentproof.mjs` pins that the markdown file, applied over the default, changes **nothing** (it plays the game twice, with the shipped pack and with an empty one, and compares every number and text field by field). It then edits a copy of the files and checks that exactly what each edited line says has changed, and that the Title would say MODDED. It also loads a pack of wrong files and checks that all are refused and every table stays the default. `tests/contentboot.mjs` loads a deliberately broken fixture pack (`tests/fixtures/content-bad/`) and checks that the game boots to Title, lists the errors and plays on the defaults.

End state, in later cards: once a table is fully migrated and pinned, the in-code copy shrinks to a minimal safe core (one Wren, Halcyon, the rescue call) and the shipped `content/` becomes the single source of truth.

## 9. The cards

IDs start `space-game-m`, for example `space-game-m1-parser-schema`; each is a top-level Todo card with `--blocked-by` for its "Needs" (the same way the universe cards are), not a subtask, so ORCH can assign them one by one. Owners are suggestions: **TM** a TaskMaster (parser, tests, tools, docs), **BB** BuildBot (game wiring), **DB** DreamBot (the screens). All cards: own worktree off the latest main, `bash tests/smoke.sh` passes, update subtasks as you go, never push. "Needs" lists cards that must merge first.

| Card | Owner | Size | Needs | What and where |
|---|---|---|---|---|
| `m1-parser-schema` | TM | M | | `src/content.js` (parser, schema, validator, edit-distance hints, limits; no Phaser, runs in Node and the browser), `tools/build-content.mjs` (`--watch`, `--strict`), `content.generated.js`, `content/_templates/`, `tests/content.mjs` (parser edge cases, every error message, stale-file check). Nothing in the game reads it yet |
| `m2-loader` | BB | M | m1 | `contentApply()` in `boot.js`, the `<script>` in `index.html`, merge by id, the missing-file fallback, console warnings, the broken-pack fixture and boot test. Game behaviour unchanged |
| `m2b-content-ui` | DB | S | m2 | the Title chip "Content: N problems", its panel (first 8, count), the MODDED tag, in the HUD glass style |
| `m3-open-source` | TM | M | | LICENSE, THIRD-PARTY.md, README for players and modders, CONTRIBUTING, `docs/AGENTS.md`, `.gitignore`, the `tests/ships.mjs` path fix, `tests/hygiene.mjs` and its `smoke.sh` step. Publishes nothing |
| `m4-proof` | BB | M | m2 | migrate the proof set of section 8 (raider, drone, rescue, JUNO, the three upgrades) with the equal-to-default pin test. `missions.js`, `shop.js`, `enemies.js` read their text and numbers through the merged tables |
| `m5-more-types` | TM | M | m4 | the other missions, NPCs, POI notes and signals, UI strings (`text/ui.md`), station text. One type per commit. Voice lines and personas join when `space-game-voice` and `space-game-npc-chat` merge |
| `m6-dev-server` | TM | S | m1 | `tools/serve.mjs`: static server, rebuild on change, reload key `R`; one paragraph in the modder guide |
| `m7-mod-packs` | BB | M | m4 | `mods/<pack>/` layering over `content/`, the build writes each pack separately so errors name the pack, an example pack `mods/example/`, a Mods screen with a folder picker that works without Node |
| `m8-modder-guide` | TM | S | m4 | `docs/MODS.md`: a ten-minute walk through making a new mission, a new NPC and a new ship, using the templates; the full field table generated from the schema |

Suggested order: m1 and m3 at once (no overlap), then m2, then m2b and m4 and m6, then m5 and m7 and m8. The first thing a player or modder can feel is m4: changing `content/missions/rescue.md`, rebuilding and seeing the board change.

Overlaps to watch: `m4` and `m5` touch `missions.js`, `shop.js`, `enemies.js`, `poi.js`, which the universe cards (`a1`, `a3`, `d1`, `e3`, `e5`) also change. Tell ORCH to merge in this order: universe `a1` and `a3`, then `m4`; `d1` before the parts rows of `m5`; `e3` before the new mission kinds get content files.

## 10. Risks
- **Two sources of truth** while tables are half migrated. The pin test in `m4` is the guard; the end state in section 8 removes the duplication.
- **Schema drift** against the universe tables. The schema lives in `src/content.js`, and every universe card that adds a field adds it there too (note this on those cards).
- **A mod that makes the game unwinnable or too easy.** Not prevented, only visible: the MODDED tag. Balance is the modder's business.
- **Old saves and changed content.** Saves hold ids and numbers, not text. A save that names an id a mod removed falls back as `docs/UNIVERSE.md` 8.2 says (unknown ship or system: Wren and Halcyon).
- **Big content, slow boot.** The core pack is a few hundred lines; the 400-file and 32 KB limits keep a mod from making boot slow.

## 11. Open questions for Troy
1. **Name on the LICENSE.** A personal name, "Long Haul contributors", or something else?
2. **History when it goes public.** Fresh single-commit repository (recommended), rewritten authors, or as is? (section 7.2)
3. **Node-free modding in v1?** The build script needs Node. The folder-picker (`m7`) lets a player mod with only a browser. Do we want it in the first public version or later?
4. **New ship art from mods.** The plan allows recolours and stats only. A mod that brings its own drawing would need a safe drawing format; that is a bigger card. Is "recolour and re-stat" enough for v1?

## 12. Adding new things (card `m9-add-new`)

Until now a file could only change what the game already had. A file with an id the code does not know now becomes a **new row** for four types. `src/contentadd.js` holds the code; `tests/contentadd.mjs` (smoke step 4zb) plays each case in the real game.

The promises, for every type: a short file is enough (what it leaves out has a default); a row is built **all or nothing** (a file that cannot become a whole row adds nothing, and the message names the file and says "Skipped the file"); there is a **limit** on how many a pack may add (the rest are refused with the limit named); a new row never takes the place of a built-in one (a built-in id is a change, as before); applying the same pack twice adds nothing twice; and a save that names something a pack added, when the pack is gone, falls back (no call under way, the ship flies as a Wren).

| Type | A new file needs | Default for the rest | At most | Refused |
|---|---|---|---|---|
| `voice` | `event`, `## Lines` with one line or more | nothing else | 40 files | an event the list does not have, no lines |
| `ship` | `name`; an id that is not one of the six built-in ships | the Wren's numbers, price 5000, art `wren`, sold at Halcyon Station | 6 | `side: pirate`; the six built-in ids (not changeable from a file yet); `art` that is not a player hull; price 0 |
| `mission` | `kind`, `title`, `reward` | the kind's own words and where it takes place; `count` 5 for a patrol | 4 | a kind the game does not play yet (courier, haul, salvage, survey) |
| `npc` | `name`, `## Lines` with one line or more | cyan, a body drawn from the colour, the nearest free spot on the floor, no reactions, no persona | 6 | `station:` other than Halcyon Station |

**Voice lines.** `event` is one of `launch-clear` (leaving the hangar), `hull-low` (hull under 30%), `pirates-detected` (a hostile within 750 px), `docked`, `mission-accepted`, `credits-earned` (a payment of 100 credits or more) or `fuel-low` (the tank under a quarter). The ship says one of its own line and the lines files add, at random, never the one it said last for that event. `replace: yes` in the front matter drops the built-in line for that event, so only your lines are said. A line may use the placeholders of the type's list (`{credits}`, `{ship}`, `{reward}`...). Only a player who has pasted their own Deepgram key hears any of it (`docs/VOICE.md`).

**Ships.** A new ship is a row of `SHIP_MODELS` in `src/data_ships.js`. Numbers: `hull`, `speed`, `boost`, `accel`, `turn`, `tank`, `fuelPerLy`, `range`, `cargo`, `guns`, `sensor`, `price` (all with the ranges of section 6.1). It can fit tier 3 of every part, and its parts cost what the Wren's do. **The picture is borrowed**: `art` names the hull of one of the six built-in ships (`wren`, `kite`, `ox`, `talon`, `pathfinder`, `bastion`; the Wren when the file says nothing) and the Ship bay and the hangar say so, `freight tug (Ox hull)`, until a ship can bring its own drawing. `yard: [halcyon-station]` lists the stations that sell it (Halcyon when it is left out); the yard shows six ships at most. `trim`, `color` and the hangar line are read and kept; nothing shows the colours yet.

**Missions.** What a call *does* is the code of its kind (`missions.js`, `surface.js`, `hud.js`): a rescue pod is on Kepler-4b, the escort is the MULE to the Perseus gate, the patrol's wanted pirates wait on the approach to the station, the bounty is the Reaver. What it *says and pays* is the file: `title`, `where`, `reward`, `count` (how many pirates a patrol wants), `unlock` (a condition), the briefing, the board lines, the progress texts, the steps and the failure line, exactly as for a built-in call. A text the file leaves out is the kind's own; the patrol's default texts count to this call's `count`. The board shows four calls at a time and scrolls with the arrow keys (`CALLS 1-4 OF 6`); the number keys of added calls are 5 to 8. A patrol of a pack also counts towards the Reaver bounty's unlock.

**Characters.** A new character is a row of `NPCS` in `src/shop.js` with the same fields as a built-in one. Their body is drawn in code from their `color` (the coat is the colour, darkened; hair, skin and one extra, a visor, a cap, goggles, a pack or a bun, come from the id, so two new characters do not look alike). They stand where `x` and `y` say when that spot is free, and on the **nearest free spot** when it is not: the floor of the bar, without the walls, the counter, the two tables, the doorway lane and 48 px round every other character. `appears` and `## Reactions` use the conditions of section 3.4. A character with no persona gets a plain card for the chat (`name, role, a regular on Halcyon Station`).

**Not added, on purpose.** Pirate ships (how a pirate flies and where it appears is code; the three that exist can be changed), the six built-in player ships (changing them waits for the fleet records to read their numbers at boot), mission kinds that have no code, new part slots or tiers (the five slots with three tiers each are what the shop, the HUD and the Ship bay are drawn for; the fifteen tiers can all be changed), and systems, stations, salvage sites and interface words, which can be changed but not added.

## 13. Mod packs (card `m7-mod-packs`)

A pack is a folder of content files laid **over** the shipped game, so changes can be kept apart from `content/`, switched on and off and shared. It has the same layout as `content/` (`mods/<name>/missions/rescue.md`, `mods/<name>/npcs/...`) and an optional label file `_pack.md` (`title`, `author`, `about`, one line each, between two `---` lines). A pack name is lower-case letters, digits and dashes, starting with a letter, 40 characters at most; a folder of `mods/` whose name is not one is a problem, not a pack, and so is anything beyond the 12th. `mods/*` is ignored by git except `mods/example/`.

**Where a pack comes from.** Two ways, the same checker (`src/content.js`: `loadPack` is `loadAll` plus the label):
- **Built.** `node tools/build-content.mjs` (and the dev server, which also watches `mods/`) checks every folder of `mods/` **on its own** and writes them to `mods.generated.js` (`var MODS = { packs: [...], errors: [...] }`, one pack a line), loaded by `index.html` like `content.generated.js`. A pack's files carry `mods/<name>/` in their path, so every problem names the pack (`mods/b-bad/missions/rescue.md, line 5: unknown field "rewrd"...`), and one pack's mistakes never touch another. A reference to something the core pack or the game defines (a station, a system) needs no file of the pack's own. `--check` also fails when `mods.generated.js` is stale; `--strict` fails on a problem in any pack; `--mods DIR` and `--mods-out FILE` say where the packs are (tests), and a build with `--dir` or `--out` and no `--mods` leaves them alone. The committed `mods.generated.js` holds only the example pack, which `tests/mods.mjs` pins; building your own packs changes it locally, so commit it only when you changed `mods/example/`.
- **Picked.** The Mods screen has an `<input type="file" webkitdirectory>`. The page reads the chosen folder with the same parser (no Node, no server, works from `file://`): only `.md` files inside the folder, never a name starting with `_` (except `_pack.md`) or `.`, a file over 32 KB is a problem and is not read at all, at most 400 files. The pack is kept in this browser (`localStorage`, `longhaul.mods.picked`, at most 1500 KB a pack) so it need not be picked again, and turned on. A picked pack with the name of a built one replaces it.

**Off until turned on.** The on list is `localStorage` `longhaul.mods.on` (a list of names). A pack is off by default, the example pack included, so the shipped game is the shipped game, and a bad pack that is off costs nothing: its problems are only counted on the screen.

**Layering.** `contentApply()` applies the core pack as before, then `modsApply()` (`src/mods.js`) applies the packs that are on, **in name order, so a later name wins** where two say the same thing (each pack goes through `ContentLib.apply` with the game's adapters, which change a built-in row in place, field by field). A pack can also **add** (section 12: a call, a character, a ship, voice lines) because it goes through the same adapters; the limits of section 12 count what `content/` and every pack added together, and `tests/mods.mjs` (B4) plays it. Because the change is in place, turning a pack on or off needs a **restart** (the Mods screen says so, R restarts). A pack that is on makes the Title say MODDED, and the content panel (P) names the packs on. Problems of a pack that is on go to the same list as the core pack's, each naming its pack.

**Safety.** A pack is untrusted text, and the browser takes nobody's word for it: whatever is in `mods.generated.js` or in storage goes through the same second look as the core pack (`ContentLib.apply` checks every field against the schema). Stored names that are not pack names, entries that are not content entries, numbers out of range, an id such as `__proto__`, a 1000-character line, a title longer than 40 characters: all refused or cut, with a message that names the pack, and the game still starts. Text stays text (drawn by Phaser, never HTML), nothing in a pack is fetched or evaluated, and a pack cannot hold a key (the hygiene test scans `mods/example/`).

**The Mods screen** (`ModsSetup`, `src/mods.js`; key **O** on the Title screen): the packs in name order (six on the screen), a box to turn each on or off (click, or `1` to `6`), the label, the file and problem counts, where it came from, a REMOVE button on a picked one, **Pick a folder** (`F`), **Restart to apply** (`R`, dim until something changed), Esc back. `tests/mods.mjs` (smoke step 4zm) runs all of it in headless Chrome.

**Not here, on purpose.** Hot reload without a restart (adapters change rows in place; undoing a change needs the original), reading a `.zip` (a folder is what a browser can pick), a pack that depends on another or carries its own drawings, a way to publish or rate packs. The real file chooser cannot be driven by the test: it hands the page `File` objects with `webkitRelativePath`, which the test builds itself and passes through the real `<input>`'s change event; a human check in a headed window is still worth doing once.
