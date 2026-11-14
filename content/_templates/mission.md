---
# Copy to content/missions/<id>.md. kind picks what the mission does; everything else is words and numbers.
type: mission
kind: rescue
title: Example call
where: Somewhere nearby
reward: 500
# unlock: patrols>=1
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
