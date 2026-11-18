---
type: mission
kind: patrol
title: Police patrol
where: Halcyon approach
reward: 600
count: 5
# where it is played: the star system, and the station there the wanted pirates loiter round
system: halcyon
body: halcyon-station
---
Five pirates with bounties on their heads are
loitering on the approach to Halcyon Station.
They are marked in amber on your radar.
Destroy all five and the station pays the bounty.
Come back and dock whenever you like.

## Board line
active: Police patrol: {progress} of {count} wanted pirates down
failed: Failed. The pirates got away

## Progress
Wanted pirates destroyed: {progress} of {count}.
They wait on the approach to the station.

## Steps
- Take the patrol call
- Launch from the hangar
- Wanted pirates down  {progress}/{count}
