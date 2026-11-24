// ---------- Campaign: missiles cost ore, and R queues them (cards space-game-missiles-cost-ore and space-game-missile-queue; Troy, 24 Nov 2026) ----------
// "Building missiles takes ore. Automatic, but only when down to 0 missiles; and a key to build when not at 0 so he can reload in calm times: R, shown as a row on the S list." Then: "hitting R multiple times shows me how many are queued."
// The magazine no longer fills itself. A missile is BUILT, and a build costs CAMP.missile.cost ore (20), paid when it starts, and takes CAMP.missile.reload ms (the old reload time, now the build time).
//   AT ZERO the ship builds ONE missile by itself, if the ore allows, so the pilot is never stuck with an empty rack. It does not build while there is one left.
//   R (the order 'reload': the key, the S list's row Reload missiles, and the words "reload missiles") QUEUES ONE missile; presses add up, at most to the empty slots of the rack (a press with every empty slot spoken for says so), and the queue is
//   built one after another, each 20 ore taken when its build starts. A press the ore cannot pay for (the ore must cover every missile still waiting, with the new one) is refused in words; if the ore runs short LATER (it was spent elsewhere)
//   the queue stops where it is and the radio says so (camp.say.rackdry). Loot (a wreck's missiles) still goes straight into the rack (campMissileAdd, src/campaign.js) and cuts the queue to the slots left.
// The state is plain numbers on the battle: C.reloadAt (when the missile being built is done, ms of the battle's clock; 0: none is building) and C.queued (missiles waiting for their build to start, the one being built not counted).
//   The status line's +n is the missiles on their way: the queue and the one building (pending).
//   campMissileStep(C)          every frame (campMissiles): a build that is done goes into the rack; a new one starts when the queue (or a rack at zero) asks for one and the ore is there
//   campMissileState(C)         what the HUD and the rows say (pure): { state: 'building' | 'noore' | 'ready' | 'full', secs, rack, cost, n, cap, queued, pending }
//   campReloadDo(C, dry)        the order 'reload' (campDo, src/campaign.js): refused in words when the rack is full, every empty slot is queued already, or the ore is short; else it queues one more (and starts it at once when nothing is building)
//   campReloadPlan(C)           what R would do now, pure: { missing, building, queued, pending, free, afford, need, n, ore, cost }  (the empty slots, a build under way, the missiles waiting, both together, the slots no one is on the way to, whether the ore pays one more, the ore it would take, 1 or 0 missiles one press queues, the ore that one costs)
// The pure half: no Phaser, no page; tests/campmissilecost.mjs runs it in Node.

const campMissileCost = () => Math.max(0, Math.floor(CAMP.missile.cost || 0)); // ore a missile costs to build (0: they are free, as they were)
const campMissileOre = C => Math.floor(C.ore || 0); // the ore the way the HUD says it (a whole number)

function campReloadPlan(C) {
  const cost = campMissileCost(), have = campMissileOre(C), building = C.reloadAt > 0 ? 1 : 0, queued = Math.max(0, C.queued || 0), missing = Math.max(0, C.magazine - C.missiles), pending = building + queued, free = Math.max(0, missing - pending);
  const need = (queued + 1) * cost, afford = cost <= 0 || have >= need; // the ore must pay every missile still waiting, with the one this press adds (the build under way is paid)
  const n = free > 0 && afford ? 1 : 0;
  return { missing, building, queued, pending, free, afford, need, n, ore: n * cost, cost };
}

// the build and the queue, once a frame
function campMissileStep(C) {
  const cost = campMissileCost();
  if (C.reloadAt && C.t >= C.reloadAt) { C.reloadAt = 0; C.missiles = Math.min(CAMP.missile.max, C.missiles + 1); C.events.push({ type: 'mbuilt' }); } // the missile is done: into the rack
  const room = Math.max(0, C.magazine - C.missiles) - (C.reloadAt ? 1 : 0); // the empty slots no build is on its way to
  if ((C.queued || 0) > room) C.queued = Math.max(0, room); // the rack was filled from outside (loot): the queue is cut to the slots left
  if (C.reloadAt || !((C.queued || 0) > 0 || C.missiles <= 0)) return; // building already, or nothing asks for one: only a rack at zero builds by itself
  if (campMissileOre(C) >= cost) { C.ore -= cost; C.reloadAt = C.t + campReload(C); if (C.queued > 0) C.queued--; return; } // the ore is paid now, the missile is done in a build time
  if (C.queued > 0) { C.queued = 0; campSay(C, 'camp.say.rackdry', { n: C.missiles }); } // the queue ran out of ore: it stops where it is, and says so
}

// what the status block and the S list's row say: building (with the seconds), no ore (the rack is at zero and nothing is building), ready, or full; queued and pending: the missiles waiting, and those with the one under way
function campMissileState(C) {
  const cost = campMissileCost(), queued = Math.max(0, C.queued || 0), pending = queued + (C.reloadAt > 0 ? 1 : 0), out = { state: 'ready', secs: 0, rack: pending > 0, cost, n: C.missiles, cap: C.magazine, queued, pending };
  if (C.reloadAt > 0) { out.state = 'building'; out.secs = Math.max(0, Math.ceil((C.reloadAt - C.t) / 1000)); return out; }
  if (C.missiles <= 0 && campMissileOre(C) < cost) { out.state = 'noore'; return out; }
  if (C.missiles >= C.magazine) out.state = 'full';
  return out;
}

// the order 'reload' (R, the S list's row, "reload missiles"): the refusals in words, else one more missile is queued (and starts at once when nothing is building)
function campReloadDo(C, dry) {
  const P = campReloadPlan(C);
  if (P.missing <= 0) return campNo('rackfull');
  if (P.free <= 0) return campNo('reloading'); // every empty slot has a missile on its way already
  if (!P.afford) return campNo('noore2', { need: P.need, have: campMissileOre(C) }); // the ore does not pay for one more
  if (dry) return campYes('reload', { n: P.pending + 1, ore: P.need });
  C.queued = (C.queued || 0) + 1;
  campMissileStep(C); // the first build starts now when nothing was building (the ore is paid): the HUD shows it this frame
  return campYes('reload', { n: P.pending + 1, ore: P.need });
}
