# The Campaign's look: a smaller fleet and a cruiser (7-GEN)

Card `space-game-campaign-look`, 20 Nov 2026. Troy: the cruiser and the fighters (and the small escorts) another 30 percent smaller, drawn and hit circle together; the cruiser less arcade and more Battlestar Galactica (boxy, muted grey and bronze, a spine, hangar pods with a lit bay, an engine block with a dull glow, no neon); launch, recall and the eight turret mounts must still read.

## Where the numbers are

| What | Where | Now |
|---|---|---|
| drawn length and hit circle of the carrier, a fighter, an escort | `CAMP.size` (`src/campaign.js`) | 98 x 25, 22 x 6, 28 x 7 px (were 140 x 36, 31 x 8, 40 x 10) |
| where the eight turrets sit | `CAMP.carrier.mounts` | on the spine and the pods; move them with the hull |
| where a launched ship appears; how near a recalled one lands | `CAMP.bay.mouth`, `CAMP.bay.dockAt` | just ahead of a pod's launch tube (21, 19.5); 63 px (was 90) |
| how a mount is drawn (base, dot, barrels, flash) | `CAMP_MOUNT` (`src/campaignscene.js`) | base 3.2 px, barrel 6.5 idle, 7 aimed, 11 on a shot |
| how the bays light | `CAMP_BAY` (`src/campcruiser.js`) | lit while launching or recalling, 0.7 s fade |
| the drawings, their parts and their colours | `CAMP_ART`, `CAMP_HULL` (`src/campcruiser.js`) | steel and bronze, no neon |
| the faint disc under the fighters and escorts | `CAMP_ART.fighter.glow`, `.escort.glow` | alpha 0.13 and 0.15; set to 0 for none |

The scene scales each picture to its `CAMP.size` length (`campArtLook`), so one number changes the size. The mounts, the mouth and `dockAt` are written for the hull as drawn: change the length and move them too (`tests/camplook-size.mjs` and `camplook-cruiser.mjs` fail when a mount is off the hull).

The Long Haul's Bastion (`src/shipmodels.js`) is not touched: the cruiser is its own drawing in `src/campcruiser.js`.

## What was done (one `[look]` commit each, each reverts alone)

| Commit | What | Test |
|---|---|---|
| 872a1b5 | `CAMP.size`: the sizes in one table; the mounts, the launch mouth and `dockAt` follow | `camplook-size.mjs` |
| 9a73d4b | the mounts are drawn a third smaller, from `CAMP_MOUNT` | `camplook-mounts.mjs` |
| 3457cb3 | the cruiser: panelled spine, blunt head, bridge tower, two flight pods with a bay at each end, an engine block with four nozzles, running lights | `camplook-cruiser.mjs` |
| 43bdd5b | the bays light on launch (the tubes at the front of the pods) and on recall (the landing bays at the back) | `camplook-bay.mjs` |
| 8646c7c | fighters and escorts in the same steel and bronze; `tools/campshots.mjs look` | `camplook-small.mjs` |
| 972bc17 | a mount with nothing to shoot at has a steel barrel (it read as a window) | `camplook-mounts.mjs` |
| c0c59d9 | the bridge is a stepped tower with a shadow, a mast and lit windows; a sensor boom and a bronze plate break the symmetry | `camplook-cruiser.mjs` |
| 568c57a | fighters and escorts a step lighter, with small pale lights | `camplook-small.mjs` |
| 90266ca | a smaller muzzle flash (0.9) and a longer idle barrel (6.5) | `camplook-mounts.mjs` |
| 4882387 | a faint pale disc under the fighters and escorts | `camplook-small.mjs` |

Main was merged in once (ac8a7ad, the title card): no conflict.

## The blind critic (two rounds, `docs/CRITIC.md` brief, ten pictures each)

Pictures: `TAG=<name> node tools/campshots.mjs look` (2x crops round the carrier: start, launch, wing out, recall, a crowd, the turrets firing, the whole screen) and the melee of `node tools/campshots.mjs 1`; they go to `~/dev/spacegame-night/shots/`. The critic saw only the PNGs, with the old neon carrier as "X" and the new one as "Y".

- Round 1 (no blockers). Major: the small grey ships are easy to lose. Minor: the turret mounts read as windows until they fire; the bronze tower looks like a crate; the ship is flat and symmetrical; yellow bolts with no source (staged: the aliens were put in place). It read the launch (a fighter leaving, the pods' front ends lit) and the recall (the pods' back ends lit) from the ship. Y is the believable cruiser; X is easier for friend and foe.
- Fixed from it: the steel barrels, the tower, lighter fighters with pale lights.
- Round 2 (no blockers). It told friends from enemies in every picture. Still major: the fighters are hard to find against the moon and the dark. Minor: the muzzle flash hides the bow; the turrets have no visible barrels at game scale. Fixed: the flash is smaller, the barrel longer, a faint pale disc under the wing. The disc is faint on purpose (no neon); it was not shown to a third critic.

## Not done, for Troy

- **The aliens are still neon.** The fleet is matte grey and bronze; the raiders, drones and the orange gunship glow. The critic called it a clash and a useful signal. If the aliens should be drawn to match, it is a card for the alien art (`src/ships.js`).
- **The orange gunship** shares the bronze and amber of the carrier's pods and of the amber labels; one critic read it as possibly friendly before it fired.
- **Findability of 22 px fighters** against the moon and Earth is the price of 30 percent smaller; the disc helps a little. Making them 10 percent bigger again is one number, `CAMP.size.fighter.len`.
- **The minimap** piles every blip into one blob in a melee (critic, minor); not touched.

## Balance: a smaller target

The hit circles are 30 percent smaller, so alien shots hit the carrier less. Over 30 seeds of the bot player in `tests/campaign.mjs` (section D) the carrier is hurt on 25 seeds and both convoys get through on 17 of 30 with the cruiser's mounts (19 with the old mounts scaled to the new hull, 18 with the old mounts as they were): the mounts do not move it. Two six-seed checks sat at the edge of that and flipped, so their thresholds moved (hurt on three of six, was four; both convoys on four of six, was five) and the old-numbers guard allows three wins of six (was one). All three are in `tests/campaign.mjs` with the reason in the check text.

## Retaking the pictures

`TAG=after node tools/campshots.mjs look` (and `1` for the melee): one muted Chrome through the test lock, about 20 seconds each.
