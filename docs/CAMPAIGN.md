# Campaign: Earth's fleet against the aliens (the first cut)

Card `space-game-campaign-mvp`. A new mode beside Long Haul: press **K** on the title screen. Long Haul, its trading and its save are not touched. The aim is that Troy plays all three levels fast, a few minutes each, and feels the story. Nothing here has been played yet; the numbers are first guesses.

**The story.** Earth is learning to travel at warp speed when an alien race attacks. You command the flagship carrier from the Lunar base. You protect Earth and the supply convoys that fly from Earth to the colonies (the colonies pay for the tech). After each battle you salvage alien technology, choose one piece of it, and the war moves on.

## How you play

You fly the carrier yourself: big, slow, heavy. **W A S D** fly it, **Space** fires its main gun, and its point guns shoot anything close by themselves. Your small ships do the rest, and you give them orders by **keys**, by the **command strip** (I, then type) or by **voice** (U, then say it). The three ways run the same five orders:

| Order | Key | You can type or say | What the small ships do |
|---|---|---|---|
| Launch | 1 | "launch", "launch fighters" | the bay opens: one ship out every 0.6 s, six fighters and two escorts |
| Attack | 2 | "attack", "attack the mothership" | fighters go for the nearest alien, or the mothership if you name it |
| Escort | 3 | "send escorts to the Mars convoy" | escorts fly beside the convoy you name (or the nearest one) and shoot what comes at it |
| Guard | 4 | "guard the carrier", "defend Earth" | the wing circles what you name |
| Recall | 5 | "recall", "come home" | they fly back, land in the bay and are repaired; a ship lost stays lost |

An order the game cannot do is answered in words and does nothing ("the bay is empty"). The ship's voice answers each one in a short line.

## The three levels

| | Where | What you do | You win when | You lose when |
|---|---|---|---|---|
| 1 | Home system (real Sol: Earth, Luna, Mars, Ceres; distances from `docs/SOL.md`, 1 to 12 scale) | start at the Lunar base; three waves; two convoys leave Earth | the alien mothership is dead | the carrier is destroyed, or Earth's shield is gone |
| 2 | Alpha Centauri (real, 4.4 ly: `docs/NEAR-STARS.md`), warp unlocked | gather resources; find the tech an ancient race left | the tech is recovered and its guards are beaten | the carrier is destroyed |
| 3 | The alien home planet (orbits Epsilon Eridani, 10.5 ly) | assault | the planet's defence ring is broken | the carrier is destroyed |

Level 1 is built first and is complete on its own. Levels 2 and 3 are separate cards that reuse its pieces.

## Tech: one of three after each battle

| After level 1 (their wreck) | Does |
|---|---|
| Shield grid | the carrier takes 40 percent less damage |
| Beam cannon | the carrier's main gun becomes a long beam, 3 times the damage |
| Warp blink | a short warp hop of 1,500 px, ready again after 20 s |

After level 2 (ancient tech): hull plating (carrier hull +50 percent), a second bay (+4 fighters), a repair field (the carrier and the ships beside it heal). The pick carries into the next level, and is kept in `localStorage` under `longhaul.campaign`, apart from the Long Haul save.

## Story lines (plain, two or three before and after each level; shown on screen and spoken in the ship voice)

1. *Before:* "Unknown ships at the edge of the system, heading for Earth." "You have the Lunar carrier, pilot. Launch the wing, cover the convoys, kill their mothership."
   *After:* "The mothership is gone. Their wreck holds working technology." "Our engineers can build one piece of it. Choose."
2. *Before:* "The warp drive works. The nearest star is Alpha Centauri, four light years out." "Something old is waiting there. Find it before they do."
   *After:* "It was a machine left by a race older than the aliens." "It shows us where they live."
3. *Before:* "The way to their home is open. This is the last battle, pilot." *After:* "Their defences are down. Earth is safe." "The first step is done. The war is not over."

## How it is built

- `src/campaign.js` is the whole game in plain numbers, no Phaser: the level table, the ships, the waves, the five orders, the aliens' flying (the game's own `pirateSteer` and `PIRATES` from `src/enemies.js`), win and lose, the tech pick and its save. `tests/campaign.mjs` runs whole battles of it in Node.
- `src/campaignscene.js` is a thin scene: it reads the keys, steps the game, and draws what the numbers say. It has the only Phaser in the mode and is not run by a test.
- The command strip, the ship computer and the voice reach it through the closed list (`SC_ACT`): `fleet_launch`, `fleet_attack`, `fleet_escort`, `fleet_guard`, `fleet_recall`. The words are read by the game itself, with no chat key needed.
- Story text is in `content/text/ui.md` (keys `camp.*`), so it can be translated or changed without code.

## Assumed, and open

- The playing field is a 1 to 12 scale of the real Sol distances (Earth to Mars is about 4,100 px), not the true scale: true scale would make a level an hour.
- The campaign has no money: the convoys that arrive only appear in the story line after the level.
- Alpha Centauri and Epsilon Eridani are my picks; the alien home world has no real name.
- Left out of this cut: a map between levels, saving a level in the middle, difficulty, music of its own, and more than three techs a level.
