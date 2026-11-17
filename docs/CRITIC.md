# The blind critic

Card `space-game-blind-critic`, from row 1 of `docs/review-abyssal-garden.html`. The people who build a screen stop seeing it. So: ten fixed pictures, judged by a fresh agent that gets the PNG files and nothing else. No code, no notes, no history.

## How to run it

1. `node tools/shots.mjs` takes the ten pictures into `tests/out/critic/` (one Chrome, muted, through the test lock; about two minutes once it has the lock). `node tools/shots.mjs 05 08` retakes only those.
2. Start a fresh subagent. Give it the ten paths and this brief, and nothing more: judge only what is visible; report text that overlaps or is cut off, labels too dim or small, things covering what the player needs, misalignment, a screen that does not say what to do next, contradictions, clutter, empty or broken-looking areas, style that differs between screens; rank each blocker (cannot read or do something needed, or plainly broken), major (clearly hurts a main screen) or minor (polish); give the picture, where on it, one or two sentences, and how sure it is.
3. Check each blocker and major against the picture yourself, mark the ones that come from how the picture was staged, and make cards for the rest. Fix nothing on the critic's card.

The list of pictures is fixed so two runs can be compared. Add a picture when a new main screen lands; do not swap one out.

| # | Picture | How it is staged |
|---|---|---|
| 01 | title | the page with no hash |
| 02 | station-lounge | `#station`, the player put in the Drift bar |
| 03 | station-hangar | `#station`, the player put at the ship |
| 04 | space-fight | `#space`, three pirates spawned close, the ship moving |
| 05 | space-assist-target | `#space`, assist on, the Perseus gate as target, Keep at range |
| 06 | escort | `#escort`, seven seconds in, hands off |
| 07 | surface | `#surface`, just landed |
| 08 | tab-map | `#space`, the sector map open |
| 09 | galaxy-map | `#galaxy` (the demo page) |
| 10 | settings | the title, then S |

The station is one fixed screen, so 02 and 03 differ only in where the player stands and the prompt at the ship.

## Run 1: 2026-11-17, main at 44c4fef

31 defects: 3 blockers, 18 majors, 10 minors. Best screen: the galaxy map. Weakest: the sector map, the surface, and space with the assist on.

Cards group findings that are one fix in one file, so 21 blockers and majors became 8 cards. "Staged" means the picture's setup caused it, not the game; those have no card.

### Blockers

| # | Picture, where | What the critic saw | Card |
|---|---|---|---|
| 1 | 08, map top left | KEPLER-4B, HALCYON STATION, KESTREL OUTPOST and YOU piled on each other; KESTREL OUTPOST runs out of the frame | `space-game-critic-map` |
| 2 | 05, top centre under the banners | The assist's one-line readout sits half hidden behind two toasts | `space-game-critic-assist-readout` |
| 3 | 07, left, over the mission panel | The "E Board ship and lift off" prompt covers the last checklist row and the hint line | `space-game-critic-surface-start` |

### Majors

| # | Picture, where | What the critic saw | Card |
|---|---|---|---|
| 4 | 05, top centre | Three banners stacked over a fifth of the play area | staged: the script gave two orders in the first seconds |
| 5 | 05 and 06, bottom tip | The tip says "Follow the amber arrow to Kepler-4b" while the arrow points at the gate or the MULE | `space-game-critic-tips` |
| 6 | 06, banner and marker | "The MULE is leaving the hangar" while she is 127 km off and out of sight | staged: seven seconds hands off, she had left |
| 7 | 07 and 05, top strip | Hollow box glyphs between SHD WPN ENG TNK CRG AIM; other pictures show dots | `space-game-critic-hud-strip` |
| 8 | 07, centre | A big controls card in the play field while the corner says "C show controls"; three places repeat one instruction | `space-game-critic-surface-start` |
| 9 | 07, bottom centre | A rock is drawn over "H hide tips" | `space-game-critic-tips` |
| 10 | 07, whole field | The player cannot be found (under the prompt or the ship) | `space-game-critic-surface-start` |
| 11 | 08, whole map | Everything that matters is in one corner, the rest is empty grid; a lighter band at y 450 to 470 | `space-game-critic-map` |
| 12 | 08, right column | Objective Kepler-4b, but the line under it says "Enter: autopilot to Halcyon Station" | `space-game-critic-map` |
| 13 | 08, legend | Lists wanted pirate, salvage site and drones that are not on the map; Slag Belt, Dead station, Tern, Kepler-4c are on it and not listed | `space-game-critic-map` |
| 14 | 10, panel body | LONG HAUL and PRESS ANY KEY of the title show through the panel | `space-game-critic-settings` |
| 15 | 10, voice row | "Ship voice: ON" next to "the game is silent", with Sound ON at 100% | `space-game-critic-settings` |
| 16 | 02 and 03, bottom centre | The tip bar and "H hide tips" cover the rug and the people near SABLE | `space-game-critic-tips` |
| 17 | 02 and 03, terminals | MISSIONS, REPAIR BAY, UPGRADE SHOP are small and crossed by the machine art; MISSIONS is written twice | `space-game-critic-station-read` |
| 18 | 02, whole scene | The player cannot be told from the NPCs | `space-game-critic-station-read` |
| 19 | 04, 05, 06, bottom key line | Dim grey, washed out by the sun's rays at its left end, and it repeats the tip above it | `space-game-critic-key-line` |
| 20 | 02 to 07, top strip | SHD WPN ENG TNK CRG AIM are tiny and dim, and nothing says what they measure | `space-game-critic-hud-strip` |
| 21 | 09, right panel | A green JUMP READY box that then says jumps start from space | staged: `#galaxy` is the look-only demo page |

### Minors (no cards)

- 09: the "40 ly" axis label runs past the frame into "35 ly".
- 01: the station ring overlaps the L of LONG HAUL; the key line is dim and nearly gone over the planet.
- 04: the KEPLER-4B marker touches the ORE panel; a drone icon overlaps the "Tab map" chip; a stray underline after "Find the colonist".
- 05, 06, 02, 03: station art and a moon show through the top HUD bar.
- 06: the amber banner starts where the mission chip ends, so they read as one broken strip.
- 02, 03: BAY 01 on the floor is crossed by the pad ring and crowded by YOUR SHIP.
- 10: volume is shown three times; "KEYS 0 of 3" beside CONTROLS is unclear; the voice arrows are 420 px apart; the bottom note is very dim.
- All: key hints come in four styles (dim text, filled chips, plain "W S: choose", big key caps); 09 uses a different frame width.

### The critic's three to fix first

1. The sector map: pull the labels apart, keep them in the frame, use the map area.
2. Banners and prompts: no readout under a banner, the E prompt and the controls card off the mission panel and the play field.
3. The standing tip: make it match the task and the arrow, and stop it covering art or being covered.

### Notes on this run

- Finding 2 is half answered already: `space-game-assist-hud` (not on main when the pictures were taken) hides the one-line readout while a target is set. With no target the line still sits where toasts land.
- Checked by eye against the pictures: 1, 3, 5, 7, 8, 9, 11, 12, 13. The others are the critic's word.
- The pictures are not committed (`tests/out/` is ignored). Retake them from the commit named above to see what the critic saw.
