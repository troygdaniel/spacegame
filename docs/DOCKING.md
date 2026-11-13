# Docking: how Elite Dangerous does it, and a simple 2D version

Research by TaskMaster-1, 2026-11-12. The Elite facts come from community guides, not Frontier, so the numbers are approximate. Sources: [roguey.co.uk docking guide](https://roguey.co.uk/elite-dangerous/help/docking), [Elite Dangerous wiki on docking and access corridors](https://elite-dangerous.fandom.com/wiki/Access_Corridor), [gamepressure manual docking guide](https://www.gamepressure.com/elitedangerous/manual-docking/zc7399), and [BBC Elite on the original docking computer](https://www.bbcelite.com/deep_dives/the_docking_computer.html).

## How it works in Elite Dangerous

1. **Get close.** Request permission from inside about 7 to 7.5 km; farther out it is refused. If the station says it is busy, ask again.
2. **Permission.** The station replies with a landing pad number and a timer of about 10 minutes. Skipping the request earns a warning and a fine.
3. **The door.** Stations have a slot or door, usually facing the planet, and some mark its direction with an arrow. You line the nose up with it and fly in under about 100 m/s. Never boost indoors.
4. **The pad.** Inside you look for your numbered pad, slow right down, and the radar switches to a small map of you against the pad.
5. **Touchdown.** Gear down, centre over the pad, align with it, descend gently. A good landing says "Docking successful". The guides give no numeric landing speed, only the 100 m/s near the door.
6. **Docking computer** (a module you buy): after permission it flies steps 3 to 5 for you. The original Elite had one too, and it could fly you into the station if you started it from the wrong side.

## Proposal for Long Haul (9 lines)

Today: press L within 320 px at under 150 px/s and you are inside. Proposed:

1. L inside 900 px is "Request docking": the station answers with a pad (1 to 3) and a 60 s timer, stops its spin, and lights a cyan funnel in front of the amber bay notch on its east side.
2. L inside 320 px without a request: "Docking denied, request first" (Elite warns and fines).
3. Inside the funnel the speed limit is 120 px/s; above it the SPD readout goes red and the prompt says "Slow down" (Elite: about 100 m/s).
4. Alignment: nose within 20 degrees of the bay axis and within 40 px of its centre line, else "Line up with the bay".
5. Touchdown: reach the pad (within 24 px) under 60 px/s and it docks and fades to the Station scene exactly as today.
6. Hitting the station ring costs 10 hull and bounces you off (my addition; the guides do not say what a collision costs).
7. Timer runs out: permission lapses, request again (Elite: about 10 minutes, shortened for play).
8. Optional shop item, "Docking computer", 150 cr: after the request, L again flies the last 400 px for you.
9. Planet landing stays one key (L under 170 px/s): no request, no funnel, so the Surface trip stays short.

Cost, my estimate: steps 1 to 5 are about 60 lines in space.js; step 8 is a few more. Keep it to the evening: do 1, 2, 5 first (request, then dock), and add 3, 4, 6 if there is time.
