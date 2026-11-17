# Escort: why it is flat, and three changes

Read from the code on 2026-11-17 (`src/missions.js` escortSetup / escortUpdate, `src/enemies.js` pirateAI, `tests/missions.mjs` part C). Not played: timings below are worked out from the numbers, not measured.

## What the player does today

The whole call is about one minute, so this is second by second.

| When | What happens | What the player does |
|---|---|---|
| 0 s | The MULE appears 260 px below Halcyon and heads straight for the Perseus gate, 2,800 px away, at 130 px/s. All five pirates already exist: 2 at 35% of the route, 3 at 70%. | Launches, turns south-west. |
| 3 to 10 s | The first two pirates are inside their 900 px engage range almost at once. Any pirate within 500 px of the MULE drops her to 50 px/s. | Flies to them. |
| 10 to 30 s | Drones and gunships fly to their hold distance (280 / 430 px), **stop dead** and shoot the MULE. Raiders strafe. Every hit is 5 hull of her 200. | Shoots parked targets. |
| 30 to 50 s | Same again with three pirates at 70%, maybe one gunship. | Same again. |
| 50 to 60 s | Nothing. The last 800 px is empty. She touches the gate ring, 400 cr. | Watches. |

Why that is flat:

1. **Nobody shoots at you.** A pirate with `prey` set targets the MULE and only the MULE, even while you are killing it. The ambush is a shooting gallery; the only danger to you is a stray pirate from the timed spawner.
2. **The targets do not move.** Drones and gunships park at hold distance. There is nothing to chase, lead or dodge.
3. **Flying with her does not matter.** The only flight rule is a 700 px leash that slows her to 70. Formation, position and speed change nothing, so there is no flying to do between fights.
4. **The MULE is a health bar.** She never swerves, calls out, or changes state; a scraped win pays the same 400 as a clean one.
5. **It has no shape.** Two fights of the same kind, then a dead stretch. No build, no finale.

## Three changes, ranked

### 1. Pirates that come in waves, split up, and turn on you  (the fight)
- Spawn by her progress instead of all at launch: a wave at 25%, 50% and 75% of the route, appearing 1,400 px out on a flank or ahead, so each one is seen coming on the radar.
- Each wave has roles: one **screen** pirate with no `prey` (it hunts you), the rest go for the MULE. Raiders use the new moves from `space-game-fight-feel`: circle her at gun range, make a pass, break off. Damage then comes in bursts you can interrupt, not a steady drip.
- **Pull them off her:** a pirate you hit drops its prey and fights you for about 4 s. This is the one rule that turns "shoot the target" into "who do I peel first".
- Files: `src/missions.js` (escortSetup, escortUpdate), `src/enemies.js` (one check of a `distractedUntil` stamp in pirateAI; coordinate with 4-GEN), `tests/missions.mjs` part C (it counts 5 prey pirates at launch; that check changes).
- Size: **medium**, about 60 lines and one test section. Needs `space-game-fight-feel` on main.

### 2. An escort box that Match speed holds for you  (the flight)
- Draw a ring 350 px around the MULE. While you are inside it she runs at full speed and takes half damage ("under your guns"); outside it she slows and takes full damage. Drop today's rule that any pirate nearby slows her to 50: the fight should happen on the move.
- Match speed (one key, from `space-game-assist-orbit-match`) parks you in the box, so the default is easy and the tension is the choice: stay in the box, or break out to chase a raider that has just broken off, knowing every second out costs her hull. Orbit at 300 px is the second option: sweep around her while a wave circles.
- Slow her cruise from 130 to about 90 so the run is two minutes, not one. A number, not a design change.
- Files: `src/missions.js` (escortUpdate, freighterHurt, the ring), a HUD hint in `src/hud.js` escort steps, `tests/missions.mjs`.
- Size: **small**, about 30 lines. Needs Match speed on main; the box itself works without it.

### 3. A MULE with a voice, a price on her hull, and a last stand at the gate  (the stakes)
- She talks: "Raiders, port side", "Hull at half", "Gate in sight" as toasts and voice lines, tied to the waves in change 1.
- Pay by hull: 400 for getting there, up to 200 more for the hull she has left. A clean run is worth flying well for.
- Finale: at the gate she must hold still for 8 s while it spins up, and the last wave arrives then. The dead last stretch becomes the hardest ten seconds, and Orbit is the right tool for it.
- Files: `src/missions.js`, the toast text in `src/contenttables.js` and `content/text/ui.md` (reseal), `src/voice.js`, `tests/missions.mjs` (the "pays 400 at the gate" check moves to "pays 400 to 600 after the spin-up").
- Size: **medium**, about 50 lines plus text.

## Order

1 first: it fixes the biggest gap (nobody fights back) and is where the new raider moves land. 2 as soon as Match speed is on main. 3 last; it is polish on a mission that by then has a fight and a reason to fly.
