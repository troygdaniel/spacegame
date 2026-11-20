# Campaign: Earth's fleet against the aliens (the first cut)

Card `space-game-campaign-mvp`. A new mode beside Long Haul: the title screen offers both as two panels, a click each: **Long Haul** (Enter, or any other key, as it always was) and the **Campaign** (**K**); `?campaign=N` in the address still opens a level at once. The pause menu of either game goes back to the title: Long Haul's has a **Title screen** row (it saves first, as the pause menu always does; New game stays last) and the Campaign's pause card has **T**; from the title either game starts again (card `space-game-title-modes`, words in `content/text/title.md`). Long Haul, its trading and its save are not touched. The aim is that Troy plays all three levels fast, a few minutes each, and feels the story.

**Status (20 Nov 2026).** Level 1 is now the asteroid belt (card `space-game-campaign-belt`, Troy's new story): the chain is the belt, the Earth refit, Alpha Centauri, the home world, an ending. The Earth defence level (Earth's shield, the Mars and Eros convoys) is out of the chain; its rules still work and it is kept as data under `CAMP.levels.home` for the tests and for a later campaign. The rules are tested in Node (`tests/campaign.mjs`; a plain bot, `tools/campaign-bot.mjs`, wins level 1 in about four to four and a half minutes, a passive player loses). The look, the radar and the feel are seen only by whoever boots it in Chrome. Every number is a line of the `CAMP` table at the top of `src/campaign.js`, and a level is a row of it.

**The story.** The cruiser is a mining ship working the asteroid belt at Ceres, out of the Occator Works. Its fighters are its mining drones, its eight turrets are mining lasers. A quiet minute of mining, then an alien fleet ambushes the belt out of the dark. The mining tools are turned to weapons (the story says so; the keys stay: Space, F, 2, and the ore keys 6 to 9). Three waves and a mothership later the belt is clear; the cruiser flies home, Earth refits it with one of three alien techs (and the ore it mined buys extra ships), and it warps to Alpha Centauri, then to the alien home world. All the story lines are curt (one short sentence, about 12 words at most, fact first: Troy's rule), shown and spoken.

## Missions (card `space-game-campaign-missions`; Troy: "steal from X-Wing: recon, escort, attack, defend")

Each level is a run of three short missions, each with a **briefing** (one screen: its title, the objectives in plain words, the bonus objectives), the **flight**, and a **debrief** (the score, the bonus objectives met, time, hull, ships lost, and the rank when the ranks card is there). A mission lost is flown again (the level is not lost); a mission can be restarted from the pause card (R); after the last mission of a level come the level's story and, in the belt, the Earth refit. The mission table is data, apart from the code that runs it, so a campaign can be made again and again.

**The table.** `CAMP.levels[n].missions` is a list of rows. A row is laid over its level's row (`campMissionRow(level, i)`, which a battle reads as `C.L`), so it may set anything the level sets (`waves`, `convoys`, `rocks`, `guards`, `towers`, `caches`, `relic`, `start`, `startAt`, `defend` ...) and these fields of its own:

| field | what it is |
|---|---|
| `id`, `kind` | its name, and its kind: `recon`, `escort`, `attack`, `defend`, `waves` (the kind is for the hub and the words; what runs is the objectives) |
| `objectives` | what the mission asks; ALL must be met: `scan` (points `{ at, r, secs }`: any ship of yours within r of each for secs), `deliver` (`n` haulers arrive and none is still on its way), `kill` (`what`: `mother`, `towers`, `guards`, `wave:<i>`), `hold` (`secs`: the defended place stands that long), `relic`, `caches` (`n`), `clear` |
| `bonus` | bonus objectives, each worth `CAMP.score.bonus`: `time` (`secs`), `lost` (`n` ships at most), `hull` (`pct` at least), `ore` (`n`), `delivered` (every hauler) |
| `par` | the seconds it should take (else `CAMP.score.par`): each second under it is worth `CAMP.score.speed` |
| `waves[].on` | a wave that waits for an event instead of a time: `{ scanned: k }`, `{ delivered: k }`, `{ t: s }` (the ambush that hits mid-survey) |
| `convoys[]` | haulers `{ id, name, say, at, from, to }`: `from` and `to` are places of the level, `name` its words ("Hauler 1") |
| `defend` | `{ place, shield, name }`: a place with a shield the aliens go for (an Earth-like thing, `C.earth`); lost, the reason is `base` |

A level row with no `missions` is one mission of its own (kind `waves`, no objectives: won by the old rule), which is how the Earth level `home` and the tests' old rows still work. The words: `camp.m.<level>.<mission>.title`, `.b1`, `.b2` (two curt lines), the objective lines `camp.o.*`, the bonus lines `camp.b.*`, the debrief `camp.ui.*`: all in `content/text/campaign-missions.md`.

**The state** (`campProgressLoad` / `campProgressSave`, one JSON under `longhaul.campaign`): `level` and `mission` (the next to fly), `techs`, `ore` and `bonus` (carried into the next mission or level), and `results`: `{ '<level>.<mission>': { score, bonuses: [ids], t, hull, lost, tries } }`, the best score of each mission flown. The API the hub, the ranks and the chatter build on: `campMissions(level)`, `campMissionRow(level, i)`, `campResultKey(level, i)`, `campMissionDone(P, level, i, score)` (keeps the result, moves on, answers `{ levelDone }`), `campMissionTried`, and in a battle `campObjectives(C)` (each objective's state), `campBonuses(C)`, `campScore(C)` (`{ score, base, bonuses, bonus, hull, speed, lost, t, hullLeft, shipsLost }`, also `C.score` when won). The ranks card hangs a rank on the score with a global `campRankLine(P, score)`, which the debrief calls when it exists. A start can ask for a mission: `campNew(level, techs, { mission })`, the scene `go(this, 'Campaign', { level, mission })`; only a level's first mission warps (src/campwarp.js).

**The score.** `CAMP.score`: 1,000 for the objectives, 250 for each bonus objective, up to 300 for the hull left, 5 a second under the par, minus 50 for each ship lost.

**The nine missions.** The belt: 1 *Belt survey* (recon: scan three rock fields; the ambush hits when the second is scanned and must be beaten), 2 *Ore haulers* (escort: three haulers fly Vesta to Ceres, two must arrive, the raiders go for them), 3 *The mothership* (attack: three waves, the last with the mothership). Alpha Centauri: 1 *Resources* (recon: two of three caches, and the attackers who followed), 2 *The guards* (attack: seven guards round the relic), 3 *The relic* (defend: hold its ring 14 s with no alien near it). The home world: 1 *Approach* (recon: three points on the way in; the defenders come on the first), 2 *Outer ring* (attack: four towers), 3 *Inner ring* (attack: eight towers). A plain bot (`node tools/campaign-bot.mjs`, which flies the missions one by one, `--mission N` for one) wins each in 45 to 75 seconds; a person takes longer; a player who does nothing never wins one (the survey and the approach are never finished, the others are lost).

## Ranks (card `space-game-campaign-ranks`)

You are promoted as you fly. Six ranks, plain names: **Cadet, Ensign, Lieutenant, Commander, Captain, Commodore**. The points are the **best scores of the missions flown, added up** (a mission score already counts its objectives, its bonus objectives, the hull left and the time; a mission flown again for a better score can only raise the total). Nothing is saved for the rank: it is read from the saved results.

| Rank | From points | Extra fighters | Extra escorts | About |
|---|---|---|---|---|
| Cadet | 0 | 0 | 0 | the start |
| Ensign | 1,000 | 1 | 0 | one good mission |
| Lieutenant | 3,500 | 2 | 1 | about three missions |
| Commander | 6,500 | 3 | 1 | about five |
| Captain | 10,000 | 4 | 2 | about seven |
| Commodore | 14,000 | 5 | 3 | the nine missions flown well |

The effect is on the wing you command: the extras are added to the **bay** at the start of every mission (on top of the bay of six fighters and two escorts, the second-bay tech and the extras of the Earth refit) and to the **wing limit** of the workshop (14 fighters and 6 escorts, plus the extras), so the orders (launch, attack, escort, guard, recall) matter more as you rise. The debrief says the promotion when a mission's score takes you up (`PROMOTED: Lieutenant. The bay holds 8 fighters and 3 escorts.` and a line of the rank's own), and the rank and what the next needs otherwise; the hub (the ready room) shows the rank through `campRankStatus(P)`: `{ name, n, of, points, next, nextName, wing: { fighters, escorts } }`.

The ranks are data: `CAMP.ranks` in `src/campaign.js` (the points and the extras of each), the code is `src/campranks.js`, the words are `content/text/campaign-ranks.md`. A battle is made with `campNew(level, techs, { rank })` (the scene passes the rank of the saved results; no rank is a cadet, so every old battle of a test is as it was). **Balance**: `node tools/campaign-bot.mjs --rank 0|1..5|auto` flies the missions at a rank (auto: 1,400 points a mission flown before it). The missions were already won by every bot at the lowest rank, so the ranks do not change who wins; at the top rank the wing takes about half the damage on the hard missions (the home world's second and third: 60 to 29 and 30 to 18 on average) and the missions end 5 to 10 percent sooner. A battle with no action still loses at every rank (`tests/campranks.mjs`).

**Left for later (the idea bench, `space-game-idea-bench`): a second carrier at a high rank.** Not built; the table has no room for one yet on purpose.

## How you play

You fly the carrier yourself: big, slow, heavy. **W A S D** fly it, hold **Space** to make its eight turrets fire at the ships close by, **F** fires a homing missile, and **Q** blinks (once you have that tech). There is no other gun (see The weapons below). **Esc** pauses, with its own menu. Your small ships do the rest, and you give them orders by **keys**, by the **command strip** (I, then type) or by **voice** (U, then say it). The three ways run the same five orders:

| Order | Key | You can type or say | What the small ships do |
|---|---|---|---|
| Launch | 1 then 1 | "launch", "launch fighters" | the bay opens: one ship out every 0.6 s, six fighters and two escorts |
| Attack | 1 then 2 | "attack", "attack the mothership" | fighters go for the nearest alien, or the mothership if you name it |
| Escort | 1 then 3 | "send escorts to the Mars convoy" | escorts fly beside the convoy you name (or the nearest one) and shoot what comes at it; in a level with no convoys (the belt) they stay close to the cruiser |
| Guard | 1 then 4 | "guard the carrier", "defend Earth" | the wing circles what you name |
| Recall | 1 then 5 | "recall", "come home" | they fly back, land in the bay and are repaired; a ship lost stays lost |

**The keyboard panels (card `space-game-campaign-keys-help`, Troy, 20 Nov 2026).** The digits are not orders on their own any more. **1** opens the FLEET panel at the left edge (rows 1 to 5: launch, attack, escort, guard, recall) and **2** the SHIP panel at the right (mine ore, recharge shields, build a fighter, build an escort, fly to the objective); a row's digit does it, so *1 then 3* is "escort", and the panel closes. Each row has its number, its name and its live state under it (what it will do, or why it cannot, greyed: "needs 45 ore", "no fighters out"). A panel is drawn only **250 ms** after its key, so a fast "1 then 3" never flashes it; a click on a row does it, a click anywhere else or Esc closes it. Digits 4 to 9 and key 3 do nothing (**3** is reserved for a centre panel), B and N do nothing in the Campaign (the Tab map's list is where the places are), and typing or saying an order is unchanged. **H** opens one page of every key (two columns, the panels first); it is on the pause card and the title's Campaign panel, and the bottom key line ends "1 Fleet   2 Ship   Tab Map   H Keys". One table feeds all of it: `CAMP_PANELS` and the CAMPAIGN and PANELS groups of `src/data_controls.js` (the panels, their rows, keys and words), read by `src/camppanel.js` (what a row does and whether it can be done now), `src/campanelsdraw.js` (the drawing), `src/campkeys.js` (the page), the key line, the pause card, the ship computer's rules and the tests; a later card adds a row, or the centre panel, there.

An order the game cannot do is answered in words and does nothing ("the bay is empty"). The ship's voice answers each one in a short line.

## The weapons (card `space-game-campaign-missiles`)

The carrier has two ways to hurt an alien, one key each (card `space-game-campaign-turrets` took away the single main gun):

| Weapon | How | What it is for |
|---|---|---|
| Turrets | hold **Space**: eight turrets spread along the hull (four a side, two near the nose, two at the stern, rows of `CAMP.carrier.mounts`); each aims itself at the nearest alien within 500 px of it (to the edge of the alien), always, and fires one shot of 4 hit points every 0.7 s, but only while Space is held and only at something in reach; nothing fires on its own. The eight do not fire together: each has a slot of its own in the 0.7 s cycle, a turret's width of the cycle (about 90 ms) behind the one before it, moved a little at random (12 ms), so the fire is a continuous rattle and not a volley; a slot with nothing to shoot at, or with Space up, is let go, so nothing bursts when Space is pressed. Each turret leads its shot: it points where its shot and the alien will meet (the alien's speed, the shot's 800 px/s and the carrier's own drift), so a gunship crossing at 100 px/s or a raider at its top speed is hit, not just a tower that stands still | the small ships that come close, and any big one you fly up to; 46 hit points a second in all |
| Missile launcher | **F**; "fire missiles" or "missiles at the mothership" typed on the strip (I) or spoken (U) | big ships: the mothership, the towers and the gunships |

On the screen each turret is a dark base with an amber dot; once it has picked an alien it points a short barrel at it (even with Space up), and when it shoots it flashes white with a longer barrel. A faint ring round the carrier shows how far they reach, and their shots are amber (the beam tech's are cyan). Each shot has a muzzle flash (a short spark at the barrel tip) and a quiet blip whose pitch changes from turret to turret, at most one blip in 70 ms, so eight turrets rattle and do not stack into noise.

A missile is a homing round. It goes for the mothership if the mothership is within 2,400 px, else the nearest tower or gunship within that reach; named ("at the mothership") it goes for the mothership only, and says so if the mothership is not there or too far. It leaves the tube slowly, gets up to speed (560 px/s) and turns at 3.4 rad/s, so one fired the wrong way still comes round. It carries 7 seconds of fuel, then it dies with no bang (a plain puff). Its fuze goes off near a big ship only: a raider or a drone on its way does not stop it. Where it goes off, every alien within 80 px is hurt: a big ship 100 hit points, any other alien 10 (a raider has 20, a drone 30). Six missiles take 600 of the mothership's 700 (see `CAMP.mother.hp`), the guns and the wing finish it; a tower (160) takes two; a gunship (80) one. A smoke trail follows it and the bang is a plain explosion.

The magazine is small and the reload is slow: you start with 6, one comes back every 15 seconds while it is below 6, and the launcher cycles for 0.7 s between two launches. The HUD shows `F  MISSILES  4    next in 9 s` at the bottom left, in red when it is empty. The count is one plain number, `C.missiles`; the ore of the resources card adds to it through `campMissileAdd(C, n)` (up to 12, the most the magazine holds; the slow reload does not fill it past 6). All the numbers are `CAMP.missile` in `src/campaign.js`. The key line and the pause card name F; the ship computer has the order `fleet_missiles` (the model is told the key and the act in a battle).

## The sounds (card `space-game-campaign-sounds`)

All synthesized in `src/audio.js` from the game's own voices (no audio files), through the effects volume of Settings > Sound, the master volume and M, like every effect. `SFX_BUILT` in that file says in words what each is made of; the numbers are in each sound's own line. To ask for a change, use the name.

| Name | When | Made of |
|---|---|---|
| `turret` | each turret shot, at most one in 70 ms | a short bright square bolt falling to under a third of its pitch in 70 ms, a thin sawtooth zip, a hair of click; the pitch is the turret's (1500 Hz plus 150 Hz a step, the back four higher) moved 3 percent at random: a staggered pew-rattle |
| `beamhum` (a loop, `beamHum`) | the Beam turrets firing; a mining laser on a rock (the belt card's `C.lasers`; a plain turret shot at an alien is also a beam there but keeps its pew, unless `CAMP.beamHum.alienLaser` is 1) | a sine root, a sine fifth and a sawtooth buzz an octave up through a low-pass that opens as it climbs, a thin band of hiss; 140 to 320 Hz over two seconds of unbroken fire |
| `missileLaunch` | F | a whoosh that climbs for half a second (a rising noise band and a rising sawtooth), then at 0.3 s a dull thump |
| `missileBlast` | a missile goes off | a low sine thump, a low-passed rumble, a crackle of five quick bright bursts |
| `missileFizzle` | a missile runs out of fuel | a soft puff of air and a small falling tone |
| `blastSmall` / `blastBig` | a ship dies / the mothership or the carrier dies | a thump and a rumble with a crackle of four / eight bursts; the big one is two thumps and a second long |
| `shieldHit` | a shot on the carrier's shield | a bright electric zap, high and short |
| `hullHit` | a shot that got through to the hull | a dull clank, low and short |
| `earthHit` | a shot on Earth's shield | a deep thump felt more than heard |

The rules they keep (`tests/campsounds.mjs`, plain Node on a stand-in AudioContext): each is short, no louder than the game's own kill, made on the pool's voices (no new audio node however long a fight runs), silent when muted, at volume 0 or with the effects at 0, scaled by the effects volume, with a share of the reverb that leaves the kill, the jump, the arrival and the dock the longest tails. The scene limits how often each kind plays (`CAMP_BLIP`, `CAMP_SND` in `src/campaignscene.js`).

## The three levels

| | Where | What you do | You win when | You lose when |
|---|---|---|---|---|
| 1 | The belt at Ceres (real Sol: Ceres, Vesta, Pallas; `docs/SOL.md`), the rocks from the ore card | a quiet minute of mining (fly over ore, or press 6 to send the drones); at 60 s the aliens ambush, with an alarm; three waves (an ambush of 8, then 7, then 6) and the mothership; then the Earth refit | the alien mothership is dead | the cruiser is destroyed (there is no Earth shield or convoy here any more) |
| 2 | Alpha Centauri (real, 4.4 ly: `docs/NEAR-STARS.md`), warp unlocked | warp in; gather two of the three resource caches (fly a ship over one); fly to the ancient relic on Proxima b, past its five guards (they wait until you come close) and two waves for the carrier | the carrier holds the relic's ring for 8 s with no alien near it | the carrier is destroyed |
| 3 | The alien home planet (orbits Epsilon Eridani, 10.5 ly) | assault: three waves of defenders, and twelve fixed towers in two rings round the planet | every tower is destroyed | the carrier is destroyed |

### Level 1, the belt, in order

1. **Quiet** (0 to 60 s). No alien in the sky. Ore comes in: 32 rocks (640 ore, more than the 200-ore store) in five fields round Ceres, Vesta and Pallas; the store starts empty. Fly over ore, or launch and press 6 (or say "mine") and the whole wing, which is the drones, fetches it. The aim is ore for what follows: shields (7), new ships (8, 9).
2. **The ambush** (60 s). An alarm, "Alarm. Unknown ships, coming for the cruiser.", and five raiders and three drones come out of the dark, all for the cruiser. Five seconds on: "Mining lasers are weapons now. Hold Space. Drones: press 2."
3. **Three waves and the mothership.** Wave 2 (four drones and three gunships) at 150 s or 85 s after the ambush began once it is dead, wave 3 (four raiders and two gunships, with the mothership) at 280 s or 90 s after wave 2 began once it is dead and wave 2 is dead. Win: the mothership.
4. **Home.** The win card has three lines ("Mothership destroyed. The belt is clear." / "Their wreck holds alien technology." / "Earth recalls the cruiser for a refit."). The trip back is a fast transition, not a flight: the card, then the refit screen.
5. **The Earth refit.** One of the three alien techs (1, 2, 3; choose again before Enter), and the ore you mined buys extra ships for the next level (4: a fighter, 25 ore; 5: an escort, 45 ore; at most three of each). Enter takes the choice. The ore left, and the extra ships, come with the cruiser into level 2 (the save keeps them; level 3 gets the ore the same way). A level started by itself (`?campaign=2`, a debug skip) has its own 30 ore and no extras.

The chain is: belt, refit, warp to Alpha Centauri (the warp cinematic is 5-GEN's, one line in `Campaign.create` and a `warp` row in the level's data), the relic, the pick, the home world, the ending.

Levels 1, 2 and 3 are rows of the same table and reuse every piece. The kinds the engine knows are the wins (`mother`, `relic`, `towers`), waves, convoys, guards, tower rings, caches and techs; a new level is data, not code.

## Easier (20 Nov 2026; the Earth level)

These numbers are those of the Earth defence level (`CAMP.levels.home`), which was level 1 until the belt. Troy lost level 1 twice at wave 3, both times because Earth's shield ran out, with about seven small ships lost each time. A player who launches, escorts, attacks and guards but leaves the carrier at the Moon now wins: Earth's shield is 600 (was 300) and mends 3 a second after 6 seconds without a hit (a lull between waves heals it, a siege does not); wave 3 is two raiders and a gunship (was three and one); the mothership has 700 hull (was 900), shoots for 8 (was 12), holds 1,300 px from Earth (was 1,600, out of reach of anything at the Moon) and launches a raider every 12 s up to 3 (was 8 s, 6). `tests/campaign.mjs` K pins it: those two plain players win, nobody wins by doing nothing, and the same players lose with the old numbers.

## Ore: mine it, spend it (card `space-game-campaign-resources`, Troy: "mine resources to recharge my shields and build new ships")

- **Where ore is.** Asteroid rocks (fields of them, level data `rocks`; each has 100 hit points and 20 ore) and the wrecks of dead aliens (a raider 4, a drone 6, a gunship 12, a tower 20, the mothership 40; a wreck goes after 30 s). A rock is cut by a laser (below) and breaks into a chunk of ore; a chunk, or a wreck's ore, is taken by any ship of yours that flies over it, into the one ore store of the carrier (200 at most). The ore store is shown on the HUD.
- **Mining lasers (Troy: "mining must be by lasers").** A mining ship works a rock with a visible beam: the rock glows where the beam lands, reddens and cracks as it is cut, and breaks into ore. The drones (the fighters; in the belt they are the cruiser's mining drones, so the whole wing mines) stop 150 px from a rock and take 5 hit points a second off it from up to 230 px: one drone cuts a rock in 20 s, eight in about 3. The carrier's eight turrets are the same lasers: **hold Space beside a rock** with no alien in reach and each cuts it (a turret shot does 35 percent of its damage to rock), and the beam tech cuts faster. With an alien in reach the turrets shoot the alien, the same beam flash, the same hum. The sim keeps the beams firing as `C.lasers`, `[{ from, to, kind: 'rock' | 'alien', since }]`, for the hum (card `space-game-campaign-sounds`) and the scene draws them. The numbers are `CAMP.ore` (rockHp, rock, rockR) and `CAMP.laser` (dps, range, hold, turret).
- **Mine (keys 2 then 1, "mine", "send the drones to mine").** Your whole wing flies to the nearest rock that is not under the aliens' guns and cuts it, or takes a chunk or a wreck lying about; they fight back what comes within 320 px; with nothing safe left they circle the carrier and wait. An attack order (keys 1 then 2) turns the drones back to the fight. A full minute of mining by the wing brings the store from empty to full.
- **Recharge shields (keys 2 then 2, "recharge shields").** The carrier now has a shield of 150 points that takes damage before the hull and does not mend by itself. 25 ore fills it. Within 900 px of Earth, and with Earth's shield under full, the order mends Earth's shield instead (40 ore for 200 points); "recharge Earth" or "recharge the carrier" says which.
- **Build (keys 2 then 3 a fighter, 2 then 4 an escort; "build fighters", "build an escort").** 25 ore a fighter, 45 an escort; one ship at a time (6 s, 10 s), into the bay, where Launch puts it out. The bay holds at most 14 fighters and 6 escorts, counting what is out.
- **All three levels use it** (rocks and wrecks are in every level; Earth's shield only in the Earth level, `home`). Every number is a line of `CAMP` (`ore`, `shield`, `recharge`, `build`).
- **Assumed:** Troy meant the shield bars; the carrier had none, so it has one now. Wrecks are the income of a fight, the rocks are the quiet minute's. The words of these orders are in `content/text/campaign.md` because `content/text/ui.md` is full (200 rows a file).

## Tech: one of three after each battle

| After level 1 (their wreck) | Does |
|---|---|
| Shield grid | the carrier takes 40 percent less damage |
| Beam turrets | the turrets fire beams: twice the damage (8 a shot), half as far again (750 px), and a shot goes through everything it hits |
| Warp blink | a short warp hop of 1,500 px, ready again after 20 s |

After level 2 (ancient tech): hull plating (carrier hull +50 percent), a second bay (+4 fighters), a repair field (the carrier and the ships beside it heal). The pick carries into the next level, and is kept in `localStorage` under `longhaul.campaign`, apart from the Long Haul save.

## Story lines (plain, two or three before and after each level; shown on screen and spoken in the ship voice)

1. *Before (the belt):* "Ceres belt. The cruiser is mining." "Fly over ore, or press 6 to send the drones." "Quiet shift. Fill the store." *The ambush:* "Alarm. Unknown ships, coming for the cruiser." "Mining lasers are weapons now. Hold Space. Drones: press 2." *After:* "Mothership destroyed. The belt is clear." "Their wreck holds alien technology." "Earth recalls the cruiser for a refit."
2. *Before (Alpha Centauri):* "Warp drive ready. Next star: Alpha Centauri." "Something old waits on Proxima b. Find it first." *After:* "The relic is a machine from an older race." "It shows where the aliens live. Choose a technology."
3. *Before (the home world):* "Their home world is open. Last battle." "Break the defence towers round their world." *After:* "Their defences are down. Earth is safe." "The first step is done. The war is not over."

## How it is built

- `src/campaign.js` is the whole game in plain numbers, no Phaser: the level table, the ships, the waves, the five orders, the aliens' flying (the game's own `pirateSteer` and `PIRATES` from `src/enemies.js`), win and lose, the tech pick and its save. `tests/campaign.mjs` runs whole battles of it in Node.
- `src/campaignscene.js` is a thin scene: it reads the keys, steps the game, and draws what the numbers say. It has the only Phaser in the mode and is not run by a test.
- The command strip, the ship computer and the voice reach it through the closed list (`SC_ACT`): `fleet_launch`, `fleet_attack`, `fleet_escort`, `fleet_guard`, `fleet_recall`. The words are read by the game itself, with no chat key needed.
- Story text is in `content/text/ui.md` (keys `camp.*`), so it can be translated or changed without code.

## Assumed, and open

- The playing field is a 1 to 12 scale of the real Sol distances (Earth to Mars is about 4,100 px), not the true scale: true scale would make a level an hour.
- The campaign has no money: the convoys that arrive only appear in the story line after the level.
- Alpha Centauri and Epsilon Eridani are my picks; the alien home world has no real name.
- The turrets' reach is 500 px, about three and a half carrier lengths (the carrier is drawn 98 px long). With the single gun gone, the carrier's only far reach is the missile. The numbers (500 px, 4 a shot, every 0.7 s, eight turrets: 46 a second) were fitted to the sensible players of `tests/campaign.mjs` twice: first with shots aimed where the alien is (80 a second), then, when `space-game-campaign-turret-lead` made the shots hit moving aliens, lowered, because a shot that lands is worth more than one that misses. A carrier that stays at the Moon and holds Space still wins level 1 in 2.5 to 5 minutes; with the old, harder numbers (Earth's shield 300, no mending) it wins at most half the seeds. One table, `CAMP.carrier`.
- Missiles are for big ships on purpose: with only raiders and drones near, F answers "No big ship in missile range" and spends nothing.
- Left out of this cut: a map between levels, saving a level in the middle, difficulty, music of its own, and more than three techs a level.
