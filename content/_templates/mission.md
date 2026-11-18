---
# Copy to content/missions/<id>.md. A new id adds a call of that kind (at most 4; the board shows four at a time and scrolls). kind: rescue, escort, patrol or bounty. kind picks what the mission does; everything else is words and numbers.
type: mission
kind: rescue
title: Example call
where: Somewhere nearby
reward: 500
# unlock: patrols>=1
# where it is played: system is a star system's id (content/systems), body an id of its Bodies table: the planet you land on (rescue), the gate
# the freighter flies to (escort), the station the wanted pirates loiter round (patrol), the planet the target hides behind (bounty).
# Leave both out and the call is played where the built-in call of its kind is.
# system: halcyon
# body: kepler-4b
# guards: 6   pirate drones that always ring that body; a ## Pickets table (x, y as in the system's file) puts more at fixed places
---
What the board says about this call. A single newline is kept as a line break.
Use {reward} for the pay.

## Board line
active: The one-line objective
rescued: The objective once the colonist is aboard
failed: Failed. Ask the station for another call

## Progress
Where you are in it. Use {progress} and {count} if the kind counts something.

## Progress rescued
Only for rescue calls: what the progress view says once the colonist is aboard.

## Steps
- Take the call
- Do the thing
- Come home

## Failure
What the game says when it goes wrong.
