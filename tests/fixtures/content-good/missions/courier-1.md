---
type: mission
kind: courier
title: Parcel run
where: Brass Reach
reward: 650
unlock: patrols>=1
system: brass
---
A sealed parcel for {station}.
Pays {reward}.

## Board line
active: Deliver the parcel to Brass Smelter
failed: Failed. The parcel was lost

## Progress
Parcel delivered: {progress} of {count}.

## Steps
- Take the call
- Jump to Brass Reach
- Dock at Brass Smelter

## Failure
Ship destroyed. The parcel is gone.
