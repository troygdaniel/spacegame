// ---------- Campaign: repair in space with ore (card space-game-repair-with-ore; Troy, 22 Nov 2026: "we do not build ships, we repair them in space with ore") ----------
// Nothing builds ships any more: the wing you launch with is the wing you have for the mission, and the next mission starts with the whole wing again. Ore pays for mending instead, in open space:
//   the hull       the order 'repair' (the cruiser list's Repair hull, the strip and the voice): the ore is paid now, the hull mends over CAMP.mend.hullSecs. The price is the share of the hull that is missing of
//                  CAMP.mend.hullOre (60 ore for a whole hull, as the dock's repair was; at least CAMP.mend.min). Docked at an outpost it is instant and CAMP.mend.dockShare (half) of the price
//   a ship you protect   the order 'mendship' (arg: its id, or none for the nearest hurt one in range; the strip and the voice give it; the dock list's row, which no key opens now, picks it, src/camppick.js kind 'ward'): a ship of the convoys or
//                  a neutral miner within CAMP.mend.range of the cruiser is mended over CAMP.mend.wardSecs for CAMP.mend.wardPoint ore a hit point
//   the fighters   a hurt fighter that lands is still mended (src/camprepair.js), but each mend costs CAMP.repair.ore; with none it takes CAMP.repair.slow times as long and is never refused
// In flight all of it is paid in ORE only (the cruiser's store); docked, the dock's repair takes credits first and then ore (campMendFunds, campMendPay: card space-game-credits-apart-from-ore)
// A mend in progress is C.mends = [{ id, left, rate }]: the ship (the cruiser's id or a protected ship's), the points still to give, the points a second. campMendTick runs every step. The ore is paid when the
// order is given and the mend gives back the points it was paid for and no more (damage taken while it runs is not covered); a ship that dies is dropped from the list. Pure: no Phaser. tests/camprepairore.mjs.
//   campMendQuote(C)              { missing, cost } for the hull now (docked: half price)
//   campMend(C, arg, dry)         the order 'repair'
//   campMendWard(C, arg, dry)     the order 'mendship'
//   campMending(C, id)            true while that ship is being mended
//   campWardsNear(C)              the hurt ships you protect within range of the cruiser, the nearest first (the candidates of the dock list's ward row)
//   campWardQuote(C, u)           { missing, cost } for a protected ship
//   campMendTick(C, dt)           every step
const campMending = (C, id) => (C.mends || []).some(m => m.id === id);
// what a mend is paid with: in flight the ORE ONLY (credits are spent only at a station: card space-game-credits-apart-from-ore); docked, credits first and then ore (campFunds, campPay). One seam for every mend here
const campMendFunds = C => C.docked ? campFunds(C) : Math.floor(C.ore);
const campMendPay = (C, cost) => { if (C.docked) campPay(C, cost); else C.ore = Math.max(0, C.ore - cost); };
const campMendQuote = C => {
  const c = C.carrier, K = CAMP.mend, missing = Math.max(0, c.maxHp - c.hp);
  return { missing, cost: Math.max(K.min, Math.ceil(K.hullOre * missing / c.maxHp * (C.docked ? K.dockShare : 1))) };
};
function campMend(C, arg, dry) {
  const c = C.carrier, K = CAMP.mend, q = campMendQuote(C);
  if (q.missing <= 0.5) return campNo('hullfull');
  if (!C.docked && campMending(C, c.id)) return campNo('mending', { name: 'the hull' });
  if (campMendFunds(C) < q.cost) return campNo('noore2', { need: q.cost, have: campMendFunds(C) });
  const secs = C.docked ? 0 : Math.round(K.hullSecs * q.missing / c.maxHp);
  if (dry) return campYes(C.docked ? 'repair' : 'mendhull', { pts: Math.round(q.missing), ore: q.cost, s: secs });
  campMendPay(C, q.cost); C.orders.repair = (C.orders.repair | 0) + 1;
  if (C.docked) { c.hp = c.maxHp; C.events.push({ type: 'mend', x: c.x, y: c.y }); } // docked the battle is paused: the dock's repair is whole at once
  else (C.mends = C.mends || []).push({ id: c.id, left: q.missing, rate: c.maxHp / K.hullSecs });
  return campYes(C.docked ? 'repair' : 'mendhull', { pts: Math.round(q.missing), ore: q.cost, s: secs });
}

const campWardQuote = (C, u) => { const missing = Math.max(0, u.maxHp - u.hp); return { missing, cost: Math.max(1, Math.ceil(missing * CAMP.mend.wardPoint)) }; };
// the ships you protect that are hurt and within range of the cruiser, the nearest first (campConvoyShips: the convoys and the neutral miners)
function campWardsNear(C) {
  const c = C.carrier, ships = typeof campConvoyShips === 'function' ? campConvoyShips(C) : campConvoys(C);
  return ships.filter(u => u.hp > 0 && u.maxHp - u.hp > 0.5 && campDist(u, c) <= CAMP.mend.range).sort((a, b) => campDist(a, c) - campDist(b, c) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function campMendWard(C, arg, dry) {
  const c = C.carrier, K = CAMP.mend, id = String(arg == null ? '' : arg).trim();
  const all = typeof campConvoyShips === 'function' ? campConvoyShips(C) : campConvoys(C);
  let u = null;
  if (id) { u = all.find(s => s.id === id) || null; if (!u) return campNo('noward'); } else u = campWardsNear(C)[0] || null;
  if (!u) return campNo('noward');
  if (u.maxHp - u.hp <= 0.5) return campNo('noward');
  const name = typeof campConvoyName === 'function' ? campConvoyName(u) : u.kind, d = campDist(u, c);
  if (campMending(C, u.id)) return campNo('mending', { name });
  if (d > K.range) return campNo('farward', { name, km: hudFmt(Math.round(d / 10)), range: hudFmt(Math.round(K.range / 10)) });
  const q = campWardQuote(C, u);
  if (campMendFunds(C) < q.cost) return campNo('noore2', { need: q.cost, have: campMendFunds(C) });
  if (dry) return campYes('mendward', { name, pts: Math.round(q.missing), ore: q.cost });
  campMendPay(C, q.cost); C.orders.mendship = (C.orders.mendship | 0) + 1;
  (C.mends = C.mends || []).push({ id: u.id, left: q.missing, rate: u.maxHp / K.wardSecs });
  return campYes('mendward', { name, pts: Math.round(q.missing), ore: q.cost });
}

function campMendTick(C, dt) {
  if (!C.mends || !C.mends.length) return;
  C.mends = C.mends.filter(m => {
    const u = m.id === C.carrier.id ? C.carrier : C.by[m.id]; if (!u || u.hp <= 0) return false; // a ship that has gone is dropped
    const give = Math.min(m.left, m.rate * dt, Math.max(0, u.maxHp - u.hp));
    u.hp += give; m.left -= give;
    return m.left > 0.01 && u.hp < u.maxHp - 0.01;
  });
}

// ---- Emergency shields (card space-game-keys2-cruiser; Troy, 23 Nov 2026) ----
// The cruiser list's last row but one: the shield is filled to its top at once, for CAMP.emergency.ore ore (the store, as a mend is paid: in flight ore only), and the row cannot be given again for CAMP.emergency.cooldown ms.
// Refused in words, first the one that says why it will wait: cooling (the seconds left), the shield already full, not enough ore. C.emergAt is the clock of the last one (none yet: long ago). Pure: no Phaser.
//   campEmergencyLeft(C)   ms until it can be given again (0: now)          campEmergency(C, dry)   the order 'emergency'
const campEmergencyLeft = C => Math.max(0, (C.emergAt === undefined ? -1e9 : C.emergAt) + CAMP.emergency.cooldown - C.t);
function campEmergency(C, dry) {
  const K = CAMP.emergency, left = campEmergencyLeft(C), max = campShieldMax(C);
  if (left > 0) return campNo('cooling', { s: Math.ceil(left / 1000) });
  if (C.shield >= max - 0.5) return campNo('shieldfull');
  if (campMendFunds(C) < K.ore) return campNo('noore2', { need: K.ore, have: campMendFunds(C) });
  if (dry) return campYes('emergency');
  campMendPay(C, K.ore); C.shield = max; C.emergAt = C.t; C.orders.emergency = (C.orders.emergency | 0) + 1;
  C.events.push({ type: 'emergency', x: C.carrier.x, y: C.carrier.y });
  return campYes('emergency');
}
