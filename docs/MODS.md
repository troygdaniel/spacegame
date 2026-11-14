# Modding Long Haul in ten minutes

Long Haul keeps its words and numbers in plain markdown files. You can change what a mission pays, what the bartender says, how tough a pirate is or what a part costs by
editing a text file, with no code. This guide takes ten minutes: you will change a mission, a character and a pirate, give a call a file of its own, and learn to read the
game's complaints. The design behind it is `docs/MODDING.md`; the full list of fields is at the end of this page, written from the game's own schema.

## What you can change today, and what you cannot yet

**You can change what the game ships with**: the four calls on the mission board, the six characters in the bar, the three pirates, and the fifteen part tiers. Only some of these have a file in `content/`
today (the Rescue call, JUNO, the raider and the drone, and nine of the parts). To change one that has no file, you make a file for it: sections 3 to 5 show how.

**You cannot add a brand-new mission, character or ship yet.** A file whose name the game does not know is skipped, and the game says so:

```
content/missions/my-call.md: the game has no built-in mission called "my-call" and cannot add new ones. Skipped the file.
```

Adding new things is a later card. Player ships, star systems, stations, ship-voice lines and UI strings are checked by the build but the game does not read them yet (it says
"does not read ... yet. Ignored the file."). Section 5 has the exact list.

You need a text editor and Node.js 22 or newer (`node --version`). No packages. Playing never needs Node; only the build step in section 2 does.

## 1. The shape of a file (1 minute)

A content file is markdown. Between two `---` lines at the top are `key: value` lines; below them are the description and `##` sections. This is the shipped Rescue call, `content/missions/rescue.md`:

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
```

- **The file name is the id.** `rescue.md` is the game's `rescue`. Ids are lower-case letters, digits and dashes.
- **The folder says the type** (`missions/` takes `type: mission`), and a file in the wrong folder is refused.
- **Markdown carries words and numbers; code carries behaviour.** A file can change what a call pays, never what it does. It cannot run code, read your save or hold a key.
- The folder `content/_templates/` has one starting file for each type. Files and folders starting with `_` or `.` are never read.

## 2. The loop: edit, build, reload (1 minute)

1. Edit a file under `content/` and save it.
2. Run `node tools/build-content.mjs` in the game's folder. It checks every file, prints every problem in plain words and writes `content.generated.js`.
   The build always ends with a note that your content "differs from the shipped core pack ... will say MODDED". That is normal: it is how the Title screen knows the game is modded.
3. Reload `index.html` (double-click it, or press F5). The game opens from a file, which is why the build step exists: a browser will not let a page read other local files.

Faster: `node tools/serve.mjs` serves the game at `http://127.0.0.1:8787/`, rebuilds the moment you save and prints the problems; press **R** in the page to reload. Nothing else needs it.

Once the game has your content, the Title screen shows a small cyan **MODDED** tag, bottom right, and, if anything was wrong, an amber **CONTENT: N PROBLEMS** chip, bottom left. Click either, or press **P**, to
see the first eight problems. The game always starts: the worst a broken file can do is leave you the game as shipped, plus that list.

To undo: put the file back (`git checkout content/` if you use git, or delete your files) and run the build again.

## 3. Change a mission (2 minutes)

Open `content/missions/rescue.md`. Change `reward: 500` to `reward: 700`, and rewrite only the first line of the story (the text under the `---`; the other five lines stay):

```
reward: 700
---
A survey pod went down on Kepler-4b. Bring them home.
```

Save, build, reload, open the mission board in the station and read the Rescue call: it says REWARD 700 cr. The text under the front matter is what the board says; `## Board line` is the one-line
objective on the HUD; `## Progress`, `## Steps` and `## Failure` are the other texts. A text may use `{reward}`, `{count}` and `{progress}`: `She pays {reward} on arrival.`

The other three calls (`escort`, `patrol`, `bounty`) have no file in `content/` yet: the game uses its own built-in text and numbers for them. To change one, give it a file of its own, and that file is the first
change to it: the file name is the id and `kind` must be the same word. This is a whole, working file, `content/missions/escort.md`:

```md file=content/missions/escort.md
---
type: mission
kind: escort
title: Escort
where: MULE to the Perseus gate
reward: 800
---
The freighter MULE leaves the hangar when you do,
bound for the Perseus gate to the south-west.
Pirates know the route. Fly with her and shoot anything
that gets close. She pays {reward} on arrival.

## Board line
active: Escort the MULE to the Perseus gate
failed: Failed. The MULE was lost

## Failure
Ship destroyed. The MULE is on her own. Mission failed.
```

A file only changes what it says: a field it leaves out keeps the game's value, and the rest of the call (the freighter, the ambushes, the gate) is code. How much a call should pay
against the time it takes is worked out in `docs/ECONOMY.md`.

## 4. Change a character (2 minutes)

Open `content/npcs/juno.md` and add a line at the top of the list, as the first line under `## Lines`:

```
## Lines
- Mind the stools. They are bolted down for a reason.
```

Walk to JUNO in the Drift bar and talk to her: she says her lines in order, so a line at the top of the list is the first thing she says. Under `## Reactions` a line says what she says when a condition holds (`credits>=800`, `mission:failed`, ...; the whole list is in the reference); the first
row that holds wins. `## Persona` is the card the optional chat feature gives the model (600 characters at most, see `docs/NPC-CHAT.md`).

The bar has six people: `juno`, `tamsin`, `dex`, `moss`, `sable` and `ida`. Only JUNO has a file; make one for any of the others the same way. A whole, working file, `content/npcs/moss.md`:

```md file=content/npcs/moss.md
---
type: npc
name: MOSS
role: repair bay mechanic
---
## Lines
- Half a credit a point of hull. I stand by that price.
- Bring it back in one piece and I will not charge for the lecture.
```

`{placeholders}` work in a mission's text and in an NPC's reaction lines, not in their ordinary lines.

## 5. Change a pirate or a part (2 minutes)

Open `content/ships/drone.md`. A pirate's numbers are the front matter: make it tougher and more rewarding.

```
hp: 60
bounty: 80
```

`hp` is its hit points, `bounty` what a kill pays. The three pirates are `raider`, `drone` and `gunship`; `raider.md` and `drone.md` exist, and a `gunship.md` can be made
the same way (`type: ship`, `side: pirate`, then the numbers). The other fields are in the reference, `ship` section. If you change a bounty, read the economy notes first: `docs/ECONOMY.md` shows how a kill's
credits add up against the rest of the game.

Parts are one file a tier, named `<slot>-<tier>`: `shields-2.md`, `engine-1.md`, ... `cargo-3.md`. The slot and tier inside the file must match its name. Edit a price or the numbers a tier gives
(`points`, `delay`, `damage`, `speedPct`, ...) and the shop and the ship use them at once. The nine files for shields, weapons and engine are in `content/parts/`; `tank` and `cargo` have no file yet, and a file you
make for one works the same way. For example, `content/parts/cargo-3.md` with `type: part`, `slot: cargo`, `tier: 3`, `name: FREIGHT HOLD`, `price: 800` and `holdPlus: 20` gives the big hold 20 ore for 800 credits.

**What the game reads today, type by type** (everything else in a file is checked by the build, then ignored):

| Type | Ids the game knows | What changes in the game |
|---|---|---|
| `mission` | `rescue`, `escort`, `patrol`, `bounty` (the file's `kind` must equal its name) | `title`, `where`, `reward`, `count`, the description, `## Board line`, `## Progress`, `## Progress rescued`, `## Steps`, `## Failure` |
| `npc` | `juno`, `tamsin`, `dex`, `moss`, `sable`, `ida` | `name`, `role`, `voice`, `color`, `x`, `y`, `face`, `## Lines`, `## Reactions`, `## Persona` |
| `ship` | the pirates `raider`, `drone`, `gunship` (side `pirate`) | the numbers, `radar`, `art`. `name`, `role` and the description are read; nothing shows them yet. Player ships are not read yet |
| `part` | `shields-1` to `shields-3`, and the same for `weapons`, `engine`, `tank`, `cargo` | `name`, `brief`, `price`, the description, the tier's numbers |
| `system`, `station`, `voice`, `text` | none yet | nothing: the build checks the file, the game ignores it |

## 6. When it goes wrong (2 minutes)

Every complaint is one line: the file, the line, what is wrong, and what the game did. These are the ones you will meet, word for word. The build prints the first four. The last two come only from the game when it loads your
content (the Title screen chip, or **P**): the build cannot know which ids the game has, so it says "0 problems" for them, and `--strict` does not catch them.

| The message | What it means, and the fix |
|---|---|
| `content/missions/escort.md, line 6: unknown field "rewrd". Did you mean "reward"? Ignored.` | a typo in a field name. The game guesses what you meant; fix the spelling |
| `content/missions/escort.md: reward is required but missing. Skipped the file.` | a required field (marked * in the reference) is not there; here it was the typo above |
| `content/missions/escort.md, line 6: reward is "lots" but must be a whole number from 0 to 1000000. Skipped the file.` | the value is the wrong kind or out of range; the reference says what each field takes |
| `content/missions/escort.md, line 8: the description: "{rewrd}" is not a known placeholder here. Did you mean {reward}? Ignored.` | a `{placeholder}` the game does not know |
| `content/missions/escort.md: could not be applied (kind is "rescue" but the file is called escort, so its kind must be escort). Kept the built-in values.` | you copied the template and left `kind: rescue`. A file's `kind` must be its own name |
| `content/missions/my-call.md: the game has no built-in mission called "my-call" and cannot add new ones. Skipped the file.` | the id is not one the game knows (section 5). You cannot add new ones yet |

`node tools/build-content.mjs --strict` exits with a failure if there is any error, which is handy in a script. Warnings (a reference to something that has no file) do not count.
A file may be 32 KB at most and a text field 400 characters; the reference lists every limit. Control characters and invisible text are stripped, so a copy and paste from a web page is safe.

## 7. Sharing and the rules

- Your edits show the **MODDED** tag on the Title screen, so a bug report says whether the game was modded. It is not an accusation: it is how the game tells a changed pack from the shipped one.
- `node tools/build-content.mjs --seal` is for people changing the shipped content itself (it says "this is the core pack now"). A modder does not run it.
- Content never holds keys. The optional ship voice (`docs/VOICE.md`) and NPC chat keys live only in the player's own browser, and a test fails if a content file looks like a key.
- Mod packs in a folder of their own (`mods/<pack>/`), a Mods screen with a folder picker, and adding brand-new things are later cards (`docs/MODDING.md` sections 9 and 11).

## The field reference

Written by `node tools/mods-fields.mjs --write` from the schema in `src/content.js`, so it is what the game accepts. If you change the schema, run that command and commit the result:
`tests/modsdoc.mjs` (in the smoke test) fails when this page is out of date.

<!-- fields:start (written by node tools/mods-fields.mjs --write: do not edit between these lines) -->

Fields marked * are required. "Takes" is what the file may say; a value outside it is an error, never a silent change.

**Colours:** `cyan` #38e1ff, `amber` #ffb454, `red` #ff4d6d, `green` #6dff9c, `gold` #ffd24a, `white` #ffffff, `pink` #ff4fd8, or any `#rrggbb`.

**Conditions** (for `unlock:` and a `when` column; the whole list, a mod cannot add one): `always`, `mission:none`, `mission:accepted`, `mission:rescued`, `mission:failed`, `mission-id:ID`, `credits>=N`, `credits<N`, `upgrade:SLOT`, `patrols>=N`, `system:ID`, `ship:ID`. ID, SLOT and N are what you fill in.

**Limits:** a file up to 32768 bytes; up to 400 files; a text field up to 400 characters, a line up to 240, a persona up to 600, a description up to 600; a list up to 60 items; a table up to 200 rows. Ids are a-z, 0-9 and dashes, starting with a letter, at most 40 characters.

#### `mission`  (folder `content/missions/`)

Placeholders in its text: `{reward}`, `{count}`, `{progress}`, `{station}`, `{system}`, `{credits}`, `{ship}`.

| Field | Takes | Meaning |
|---|---|---|
| `kind`* | one of: `rescue`, `escort`, `patrol`, `bounty`, `courier`, `haul`, `salvage`, `survey` | what the call does: the code decides, the file only says which |
| `title`* | text, up to 40 characters | its name on the board |
| `where` | text, up to 60 characters | where it happens, as the board says it |
| `reward`* | whole number from 0 to 1000000 | credits paid |
| `count` | whole number from 1 to 50 | how many (a patrol counts pirates) |
| `unlock` | a condition (see Conditions) | a condition: the board shows the call once it holds |
| `system` | the id of a system | the system it belongs to |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Offer` | text, up to 600 characters |
| `## Board line` | one `key: text` line each for `active`, `rescued`, `failed`; up to 240 characters |
| `## Progress` | text, up to 400 characters |
| `## Progress rescued` | text, up to 400 characters |
| `## Steps` | a list, one `- item` a line, each up to 80 characters |
| `## Failure` | text, up to 240 characters |

#### `npc`  (folder `content/npcs/`)

Placeholders in its text: `{reward}`, `{count}`, `{progress}`, `{station}`, `{system}`, `{credits}`, `{ship}`.

| Field | Takes | Meaning |
|---|---|---|
| `name`* | text, up to 24 characters | what they are called |
| `role` | text, up to 40 characters | what they do |
| `color` | a colour (see Colours) | their colour |
| `station` | the id of a station | the station they stand in |
| `x` | whole number from 0 to 8000 | where they stand, px from the left |
| `y` | whole number from 0 to 8000 | where they stand, px from the top |
| `face` | number from -6.3 to 6.3 | which way they look, radians (0 is east) |
| `voice` | text, up to 40 characters | a Deepgram Aura voice name (docs/VOICE.md) |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Lines` | a list, one `- item` a line, each up to 240 characters |
| `## Reactions` | a table: `when`* (a condition (see Conditions)); `line`* (text, up to 240 characters) |
| `## Persona` | text, up to 600 characters |

#### `ship`  (folder `content/ships/`)

No placeholders.

| Field | Takes | Meaning |
|---|---|---|
| `name`* | text, up to 40 characters | what the ship is called |
| `role` | text, up to 60 characters | a few words: what it is for |
| `side` | one of: `player`, `pirate` | player or pirate |
| `art` | one of: `ship`, `raider`, `drone`, `gunship`, `reaver`, `freighter`, `civilian`, `police`, `wren`, `kite`, `ox`, `talon`, `pathfinder`, `bastion` | the built-in picture it is drawn with |
| `trim` | a colour (see Colours) | accent colour |
| `color` | a colour (see Colours) | main colour |
| `hull` | whole number from 10 to 1000 | hit points of a player ship |
| `speed` | whole number from 50 to 2000 | speed in px a second (a player ship: top speed) |
| `boost` | whole number from 50 to 3000 | top speed while boosting, px a second |
| `accel` | whole number from 50 to 3000 | thrust, px a second squared |
| `turn` | number from 0.001 to 3 | turn rate, a multiplier |
| `tank` | whole number from 1 to 300 | fuel units the tank holds |
| `fuelPerLy` | number from 0.1 to 5 | fuel one light year costs |
| `range` | number from 1 to 60 | jump range, light years |
| `cargo` | whole number from 0 to 200 | the hold, in ore units |
| `guns` | whole number from 1 to 6 | how many guns |
| `sensor` | number from 0.5 to 4 | radar and find range, a multiplier |
| `price` | whole number from 0 to 1000000 | credits |
| `yard` | list in square brackets: ids of stations | the stations that sell it |
| `hp` | whole number from 1 to 5000 | a pirate's hit points |
| `max` | whole number from 50 to 2000 | a pirate's top speed, px a second |
| `engage` | whole number from 100 to 3000 | how far away it starts hunting you, px |
| `hold` | whole number from 0 to 3000 | the distance it keeps from you, px |
| `fireRange` | whole number from 100 to 3000 | how far it shoots, px |
| `shot` | list in square brackets, exactly 2: whole numbers from 50 to 10000 | the shortest and longest wait between shots, ms |
| `bullet` | whole number from 50 to 2000 | bullet speed, px a second |
| `dmg` | whole number from 1 to 200 | damage a shot |
| `spread` | whole number from 0 to 9 | extra shots in a fan |
| `bounty` | whole number from 0 to 100000 | credits a kill pays |
| `credits` | whole number from 0 to 100000 | the older kill figure, used when there is no bounty |
| `ram` | whole number from 0 to 200 | damage when it rams you |
| `aim` | number from 0 to 1 | how well it aims, 0 to 1 |
| `strafe` | yes or no | circles you instead of closing in |
| `radar` | a colour (see Colours) | the colour of its blip |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Hangar line` | text, up to 240 characters |

#### `part`  (folder `content/parts/`)

No placeholders.

| Field | Takes | Meaning |
|---|---|---|
| `slot`* | one of: `engine`, `shields`, `weapons`, `tank`, `cargo` | which of the five slots |
| `tier`* | whole number from 1 to 3 | 1 to 3 |
| `name`* | text, up to 40 characters | the tier's name in the shop |
| `brief` | text, up to 40 characters | a short form for tight places |
| `key` | text, up to 20 characters |  |
| `price` | whole number from 0 to 1000000 | credits, for a Wren (a ship scales it) |
| `points` | whole number from 0 to 500 | shields: points that take hits before the hull |
| `regen` | number from 0 to 100 | shields: points a second once it recharges; engine: boost refill |
| `delay` | whole number from 20 to 10000 | shields: ms without a hit before it recharges; weapons: ms between shots |
| `damage` | whole number from 1 to 100 | weapons: damage a shot |
| `speedPct` | number from 0 to 100 | engine: percent more top speed |
| `jump` | number from 0 to 20 | engine: light years more jump range |
| `boostAdd` | whole number from 0 to 2000 | engine: px a second more boost speed |
| `boostTank` | whole number from 0 to 500 | engine: the boost tank |
| `boostRegen` | whole number from 0 to 200 | engine: how fast it refills |
| `fuelMult` | number from 1 to 5 | tank: the tank times this |
| `holdPlus` | whole number from 0 to 100 | cargo: ore units more |

#### `system`  (folder `content/systems/`)

No placeholders.

| Field | Takes | Meaning |
|---|---|---|
| `name`* | text, up to 40 characters | its name |
| `kind`* | one of: `home`, `outpost`, `trade`, `mining`, `wild`, `graveyard`, `nest` | what kind of place |
| `ly` | list in square brackets, exactly 2: numbers from -1000 to 1000 | galaxy map position [x, y], light years |
| `size` | whole number from 4000 to 200000 | world size, px |
| `danger` | whole number from 0 to 5 | 0 to 5: how many pirates |
| `traffic` | whole number from 0 to 3 | 0 to 3: how busy |
| `seed` | whole number from 0 to 2147483647 | the random seed |
| `starType` | one of: `O`, `B`, `A`, `F`, `G`, `K`, `M` |  |
| `starX` | whole number from 0 to 200000 |  |
| `starY` | whole number from 0 to 200000 |  |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Bodies` | a table: `id`* (an id: a-z, 0-9, dashes); `type`* (one of: `station`, `planet`, `belt`, `poi`, `star`); `name` (text, up to 40 characters); `x`* (whole number from 0 to 200000); `y`* (whole number from 0 to 200000); `art` (text, up to 30 characters); `r` (whole number from 10 to 5000); `rocks` (whole number from 0 to 200); `landable` (yes or no); `kind` (one of: `wreck`, `beacon`); `credits` (whole number from 0 to 100000) |

#### `station`  (folder `content/stations/`)

Placeholders in its text: `{reward}`, `{count}`, `{progress}`, `{station}`, `{system}`, `{credits}`, `{ship}`.

| Field | Takes | Meaning |
|---|---|---|
| `name`* | text, up to 40 characters | its name |
| `system`* | the id of a system | the system it is in |
| `accent` | a colour (see Colours) | its colour |
| `fuel` | number from 0 to 100 | credits a unit of fuel |
| `repair` | number from 0 to 5 | credits a point of hull |
| `ore` | number from 0 to 200 | credits a unit of ore |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Welcome` | text, up to 400 characters |
| `## Shop` | a table: `item`* (text, up to 40 characters); `price`* (whole number from 0 to 1000000) |
| `## Services` | a list, one `- item` a line, each up to 60 characters |
| `## Bar` | a list, one `- item` a line, each up to 240 characters |

#### `voice`  (folder `content/voice/`)

Placeholders in its text: `{reward}`, `{count}`, `{progress}`, `{station}`, `{system}`, `{credits}`, `{ship}`.

| Field | Takes | Meaning |
|---|---|---|
| `event`* | one of: `launch-clear`, `hull-low`, `pirates-detected`, `docked`, `mission-accepted`, `credits-earned`, `fuel-low` | which moment the lines are for |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Lines` | a list, one `- item` a line, each up to 240 characters |

#### `text`  (folder `content/text/`)

Text may use any `{placeholder}` the game knows.

| Field | Takes | Meaning |
|---|---|---|
| (none) | | the file is only its table |

Under `##` headings (the text before the first heading is the description, up to 600 characters):

| Heading | Holds |
|---|---|
| `## Strings` | a table: `key`* (a key: a-z, 0-9, dots and dashes); `text`* (text, up to 400 characters) |

<!-- fields:end -->
