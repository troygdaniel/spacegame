# Long Haul: content in markdown (design and build plan)

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
  text/        ui.md                       strings by key (also the way to translate)
  _templates/  ship.md  mission.md  npc.md ...   copy one to start; a name starting with _ is ignored
mods/                    player packs (phase 2, section 9): mods/<name>/ships/..., same layout, ignored by git
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
Text may use `{name}` placeholders from a short list per type, filled by the game: `{reward}`, `{count}`, `{progress}`, `{station}`, `{system}`, `{credits}`, `{ship}`. An unknown placeholder is an error ("{rewrd} is not a known placeholder here; did you mean {reward}?"). There are no expressions, no conditions and no code in text.

### 3.4 Conditions (the whole list)
A reaction line or an unlock rule may carry a `when` from a closed list. A mod cannot invent new ones; a new one is a code contribution.
`always`, `mission:none`, `mission:accepted`, `mission:rescued`, `mission:failed`, `mission-id:ID`, `credits>=N`, `credits<N`, `upgrade:SLOT`, `patrols>=N`, `system:ID`, `ship:ID` (ID, SLOT and N are what you fill in).

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

What the dev server adds (card `m6`): it serves the folder on `http://localhost:8765`, rebuilds on change, and lets the page reload with `R` (dev only). Nothing in the game requires it.

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
- **Merge** (`contentApply()`, run once in `Boot.create`, before the scenes): for each valid entry, copy its valid fields over the in-code default with the same id; an entry with an id the code does not know is **added** if its type supports adding (missions, NPCs, voice lines, systems and ships once their tables exist), else it is an error. An invalid field is skipped and the default stays. An invalid `type` or `id` skips the file.
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
- A small "MODDED" tag on the Title screen whenever the loaded content differs from the shipped core pack (compared by a hash the build writes), so a bug report says whether the game was modded.

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
`slot*` (engine, shields, weapons, tank, cargo), `tier*` (1 to 3), `name*`, `price`, and that slot's effect numbers (`speedPct`, `jump`, `boostTank`; `points`, `regen`, `delay`; `fuelMult`; `holdPlus`). Today's `UPGRADES` with their `descs` and `prices` are parts.

### 6.3 `system`
`name*`, `kind*` (home, outpost, trade, mining, wild, graveyard, nest), `ly` (`[x, y]`), `size`, `danger`, `traffic`, `star` (`type`, `x`, `y`), `seed`. Section `## Bodies` is a table: `id | type | name | x | y | art | r | rocks | landable`. Matches `SYSTEMS` in `docs/UNIVERSE.md` 4.1. A body of type `station` points at a `stations/<id>.md`.

### 6.4 `station`
`name*`, `system*`, `accent` (colour), `fuel` (price per unit), `repair`, `ore` (buy price). Sections: `## Welcome` (text), `## Shop` (table: `item | price`), `## Services` (list), `## Bar` (list, the generic lines when no NPC is nearby).

### 6.5 `mission`
`kind*` (from the closed list), `title*`, `where`, `reward*`, `count`, `unlock` (a condition), `system`. Sections:
- `## Offer` text shown on the board.
- `## Board line` a list of `state: text` pairs (`active:`, `rescued:`, `failed:`) for the one-line objective.
- `## Progress` text for the progress view; may use `{progress}` and `{count}`.
- `## Steps` a list: the HUD checklist.
- `## Failure` text when the ship is lost or the mission fails.

This is exactly the shape of a row of `MISSIONS` plus its `HUD_MISSIONS` entry today.

### 6.6 `npc`
`name*`, `role`, `color`, `station`, `x`, `y`, `face`, `voice` (a Deepgram Aura voice name, optional). Sections: `## Lines` (list), `## Reactions` (table: `when | line`), `## Persona` (text, at most 600 characters, for chat).

### 6.7 `voice`
`event*` (from the list in `docs/VOICE.md` once it lands). Section `## Lines`: a list; the ship picks one at random and never repeats the last.

### 6.8 `text`
A table `key | text` of UI strings (`HELP`, scene tips, toasts), keys from an allow-list. This is also the way to translate: copy `text/ui.md` to a new file and change the text column.

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
- **One personal path:** a comment in `tests/ships.mjs` line 5 names `/Users/troydaniel/...`. Card `m3` replaces it.
- **Git history: 87 commits are authored `Troy Daniel <troygdaniel@gmail.com>` and 18 `ORCH <orch@local>`.** Publishing the history publishes that email. Options for Troy: (a) publish a new repository with one fresh commit and leave this history private (recommended: nothing is rewritten, nothing breaks, all agent worktrees keep working); (b) rewrite authorship with `git filter-repo` to a no-reply address (changes every hash, breaks open worktrees, needs everyone to stop first); (c) accept the email in public. This is Troy's call and is not done here.
- Agent names (ORCH, TaskMaster, BuildBot, DreamBot) and the first name Troy appear in `README.md`, `docs/*.md`, `tests/cdp.mjs`, `tests/missions.mjs`, comments in `src/missions.js` and two commit subjects. No private data; Troy decides if he wants them cleaned.

### 7.3 A hygiene test (card `m3`)
`tests/hygiene.mjs`, run by `smoke.sh`: fails on anything in the tracked files that looks like a key (`sk-`, `Bearer `, `Authorization:` with a value, long random strings next to `key`/`token`/`secret`), an email address, a phone number or a `/Users/<name>` path, with an allow-list for the licence text. It also scans `content/` for the same, since content is where a modder would paste something by mistake.

### 7.4 Player-supplied keys
Voice (`space-game-voice`) and chat (`space-game-npc-chat`) use the player's own key. That is a rule for those cards, repeated here because it is an open-source rule: the key lives only in the browser's `localStorage` (inside try/catch), is never written to a file, never logged, and is sent only to the API host it belongs to. Mods cannot read it (section 5.3).

## 8. The proof: what moves to markdown first

Nothing about play changes. The proof set exists in the code today and does not wait for the universe cards:
- **Two ships:** `raider` and `drone` (pirate ship stat blocks from `PIRATES`). When `space-game-u-a3-ship-models` merges, `wren` and `kite` follow.
- **One mission:** `rescue` (title, text, board lines, steps, failure line, reward).
- **One NPC:** JUNO (lines, reactions).
- **The three upgrades:** `armor`, `rapid`, `booster` as parts with names, descriptions and prices.
- **One system:** `halcyon`, once `space-game-u-a1-systems-data` merges (the table must exist first).

For each, the in-code table stays as the default and `tests/content.mjs` pins that the markdown file, applied over the default, changes **nothing** (a field-by-field comparison). Editing a file in a copy of the game (not in the test) then changes exactly what the file says. The test also loads a deliberately broken fixture pack (`tests/fixtures/content-bad/`) and checks that the game boots to Title, lists the errors and plays on the defaults.

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
