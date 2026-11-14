---
type: mission
kind: bounty
title: Bounty
where: The Reaver, off Kepler-4b
reward: 1200
# the board offers this call once a police patrol has been finished
unlock: patrols>=1
---
The pirate warlord they call the Reaver holds
the dark side of Kepler-4b with two escorts.
A warship three times a drone: spread guns and
a ramming charge it telegraphs with a flash.
Halcyon pays {reward} cr for the wreck.

## Board line
active: Bounty: the Reaver  hull {hull}%
failed: Failed. The Reaver got away

## Progress
The Reaver waits south-west of Kepler-4b.
Its hull is at {hull}%.
Dock whenever you like; it will still be there.

## Steps
- Take the bounty call
- Launch from the hangar
- Reaver hull  {hull}%

## Failure
Ship destroyed. The Reaver got away. Mission failed.
