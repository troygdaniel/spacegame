// ---------- Flights: a squad flies beside what it protects (card space-game-fighter-flight; Troy, 22 Nov 2026: "more like X-wings and A-wings: not circling the targets but flying beside"; the numbers are CAMP.flight) ----------
// A squad is a FLIGHT: its live fighters, in the order of their numbers; the first is the LEADER and the others are its wingmen. Guarding the cruiser, a place or a ship, escorting a convoy ship, or waiting with nothing to mine,
// a flight does not circle: each ship holds a SLOT in a loose formation BESIDE and a little BEHIND what it protects, at that thing's own speed and with its nose the way that thing's nose points. A ship that meets a threat (the
// orders' own reach: an alien within 700 px of the thing, or 450 of the ship) breaks off to fight it, and when the fight is over it flies back to its slot. Nothing here is random: a slot is a place worked out from the numbers.
//   The slots   Each squad has an ANCHOR in the protected thing's own frame (forward, right of it): the red flight at its port quarter, the green at its starboard quarter, the yellow astern (CAMP.flight.anchors, times the
//               thing's radius plus CAMP.flight.beside). The leader flies at the anchor; a wingman of the flight is in the VEE behind and to the side of it, left and right in turn, a row farther back for each pair (gap).
//   campFlightMembers(C, u)       the live fighters of u's squad (u's own flight), by the number of their id; the same list is used for every ship of the tick
//   campFlightRank(C, u)          0 for the leader, 1, 2, ... for the wingmen
//   campFlightSlot(C, u, P)       the place u holds beside P (a ship or a point { x, y, vx, vy, rot, r }): { x, y, vx, vy, face, fly: true, rank, lead }; the ship's wish is P's velocity plus the way to it (campStation)
// A ship that is not a fighter of a squad (an escort ship) is a flight of its own kind, ranked by id, so the same call serves every ship of the wing.
const campFlightNum = u => parseInt(String(u.id).split('-')[1], 10) || 0;
function campFlightMembers(C, u) {
  const F = C.flights && C.flights.t === C.t ? C.flights : (C.flights = { t: C.t, by: {} }), key = (u.kind === 'fighter' ? u.squad || '' : u.kind) + '';
  return F.by[key] || (F.by[key] = C.ships.filter(s => s.hp > 0 && s.team === 'earth' && !s.scout && s.kind === u.kind && (s.kind !== 'fighter' || (s.squad || '') === (u.squad || ''))).sort((a, b) => campFlightNum(a) - campFlightNum(b)));
}
function campFlightRank(C, u) { const m = campFlightMembers(C, u), i = m.indexOf(u); return i < 0 ? m.length : i; }
function campFlightSlot(C, u, P) {
  const K = CAMP.flight, rank = campFlightRank(C, u), h = Number.isFinite(P.rot) ? P.rot : K.rest, ci = Math.cos(h), si = Math.sin(h);
  const A = K.anchors[Math.max(0, CAMP.wing.squads.indexOf(u.squad))] || K.anchors[K.anchors.length - 1], D = (P.r || 0) + K.beside;
  const row = Math.ceil(rank / 2), side = rank === 0 ? 0 : (rank % 2 ? 1 : -1) * row * K.gap * K.vee.side, back = rank === 0 ? 0 : -row * K.gap * K.vee.back;
  const fw = A.back * D + back, rt = A.side * D + side; // forward and right of the thing, in its own frame (y grows downward, so "right" of an eastward nose is +y)
  return { x: P.x + ci * fw - si * rt, y: P.y + si * fw + ci * rt, vx: P.vx || 0, vy: P.vy || 0, face: h, fly: true, rank, lead: rank === 0 };
}
