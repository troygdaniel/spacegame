// ---------- Campaign: missiles cost ore (card space-game-missiles-cost-ore; Troy, 24 Nov 2026) ----------
// "Building missiles takes ore. Automatic, but only when down to 0 missiles; and a key to build when not at 0 so he can reload in calm times: R, shown as a row on the S list."
// The magazine no longer fills itself. A missile is BUILT, and a build costs CAMP.missile.cost ore (20), paid when it starts, and takes CAMP.missile.reload ms (the old reload time, now the build time).
//   AT ZERO the ship builds ONE missile by itself, if the ore allows, so the pilot is never stuck with an empty rack. It does not build while there is one left.
//   R (the order 'reload': the key, the S list's row Reload missiles, and the words "reload missiles") builds UP TO THE FULL RACK (C.magazine), one after another, each 20 ore on the same build time,
//   and stops when the rack is full or the ore runs short (one line on the radio, camp.say.rackdry). Loot (a wreck's missiles) still goes straight into the rack (campMissileAdd, src/campaign.js).
// The state is two plain numbers on the battle: C.reloadAt (when the missile being built is done, ms of the battle's clock; 0: none is building) and C.rackOn (R was pressed: keep building to the full rack).
//   campMissileStep(C)          every frame (campMissiles): a build that is done goes into the rack; a new one starts when the rule above says so and the ore is there
//   campMissileState(C)         what the HUD and the rows say (pure): { state: 'building' | 'noore' | 'ready' | 'full', secs, rack, cost, n, cap }
//   campReloadDo(C, dry)        the order 'reload' (campDo, src/campaign.js): refused in words when the rack is full, a rack build is already on, or the ore is short; else it starts the rack build
//   campReloadPlan(C)           what R would do now, pure: { missing, building, afford, n, ore }  (the missing missiles, a build already paid for, how many the ore pays, how many R builds in all, the ore it spends)
// The pure half: no Phaser, no page; tests/campmissilecost.mjs runs it in Node.

const campMissileCost = () => Math.max(0, Math.floor(CAMP.missile.cost || 0)); // ore a missile costs to build (0: they are free, as they were)
const campMissileOre = C => Math.floor(C.ore || 0); // the ore the way the HUD says it (a whole number)

function campReloadPlan(C) {
  const cost = campMissileCost(), have = campMissileOre(C), building = C.reloadAt > 0 ? 1 : 0, missing = Math.max(0, C.magazine - C.missiles);
  const afford = cost > 0 ? Math.floor(have / cost) + building : missing + building; // the build already paid for, and the ones the ore pays
  const n = Math.min(missing, afford);
  return { missing, building, afford, n, ore: Math.max(0, n - building) * cost, cost };
}

// the build and the rack, once a frame
function campMissileStep(C) {
  const cost = campMissileCost();
  if (C.reloadAt && C.t >= C.reloadAt) { C.reloadAt = 0; C.missiles = Math.min(CAMP.missile.max, C.missiles + 1); C.events.push({ type: 'mbuilt' }); } // the missile is done: into the rack
  if (C.rackOn && C.missiles >= C.magazine) C.rackOn = false; // the rack is full: the run is over
  if (C.reloadAt || !(C.missiles <= 0 || (C.rackOn && C.missiles < C.magazine))) return; // building already, or nothing asks for one: only a rack at zero builds by itself
  if (campMissileOre(C) >= cost) { C.ore -= cost; C.reloadAt = C.t + campReload(C); return; } // the ore is paid now, the missile is done in a build time
  if (C.rackOn) { C.rackOn = false; campSay(C, 'camp.say.rackdry', { n: C.missiles }); } // R ran out of ore: it stops where it is, and says so
}

// what the status block and the S list's row say: building (with the seconds), no ore (the rack is at zero and nothing is building), ready, or full
function campMissileState(C) {
  const cost = campMissileCost(), out = { state: 'ready', secs: 0, rack: !!C.rackOn, cost, n: C.missiles, cap: C.magazine };
  if (C.reloadAt > 0) { out.state = 'building'; out.secs = Math.max(0, Math.ceil((C.reloadAt - C.t) / 1000)); return out; }
  if (C.missiles <= 0 && campMissileOre(C) < cost) { out.state = 'noore'; return out; }
  if (C.missiles >= C.magazine) out.state = 'full';
  return out;
}

// the order 'reload' (R, the S list's row, "reload missiles"): the refusals in words, else the rack build starts at once
function campReloadDo(C, dry) {
  const P = campReloadPlan(C);
  if (P.missing <= 0) return campNo('rackfull');
  if (C.rackOn) return campNo('reloading');
  if (P.n <= P.building) return campNo('noore2', { need: P.cost, have: campMissileOre(C) }); // nothing the ore would pay for (a build already on does not count: it is paid)
  if (dry) return campYes('reload', { n: P.n, ore: P.ore });
  C.rackOn = true;
  campMissileStep(C); // the first build starts now (the ore is paid): the HUD shows it this frame
  return campYes('reload', { n: P.n, ore: P.ore });
}
