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

// ---------- strafing runs (card space-game-fighter-flight; Troy, 22 Nov 2026: "against big ships: approach, fire, peel away, swing wide and come in again; visible attack lanes, not a ring around the target"; CAMP.strafe) ----------
// Against a ship that is no dogfighter (a drone, a gunship, a tower, a torpedo boat, the mothership: src/campdogfight.js campDogOn is false) a fighter used to fly the pirates' own steering, which goes round a ring about the
// target (src/enemies.js pirateSteer). Now it flies RUNS, in three moves, each a straight lane: IN (a line that passes CAMP.strafe.miss px beside the target, the nose on it, the guns firing in a burst), PEEL (past it, a hard turn away
// off the line, the nose where it flies, for a short time) and OUT (flying on away until it is CAMP.strafe.wide from it), then IN again from the other side. The flight of a squad runs together: a wingman takes its leader's side.
//   campStrafe(C, u, foe, dist, th)   one frame of one fighter against foe, `dist` and the bearing `th` from it to the target: { move, ang (where the engine pushes), face (the nose), fire, burst, thrust }
function campStrafe(C, u, foe, dist, th) {
  const K = CAMP.strafe, t = C.t, fr = foe.r || 0, r = u.run || (u.run = { m: 'in', until: t + K.inMax * 1000, side: campFlightNum(u) % 2 ? 1 : -1 });
  if (r.m === 'in' && (dist < fr + K.near || t > r.until)) { r.m = 'peel'; r.until = t + (K.peel[0] + C.rng() * (K.peel[1] - K.peel[0])) * 1000; }
  else if (r.m === 'peel' && t > r.until) r.m = 'out';
  else if (r.m === 'out' && dist > fr + K.wide) {
    r.m = 'in'; r.until = t + K.inMax * 1000; r.side = -r.side; // round again, from the other side of the line
    if (u.kind === 'fighter') { const lead = campFlightMembers(C, u)[0]; if (lead && lead !== u && lead.run) r.side = lead.run.side; } // a wingman is on its leader's side
  }
  if (r.m === 'peel') { const a = th + Math.PI - r.side * K.peelAngle; return { move: 'peel', ang: a, face: a, fire: false, thrust: 1 }; }
  if (r.m === 'out') { const a = th + Math.PI - r.side * K.peelAngle * 0.5; return { move: 'out', ang: a, face: a, fire: false, thrust: 1 }; }
  const base = u && foe.faction === 'pirate' && CAMP.pirate.kinds[foe.kind] ? CAMP.pirate.kinds[foe.kind].base : foe.kind; // a pirate's cutter is a drone to its guns
  return { move: 'in', ang: th + r.side * Math.atan2(fr + K.miss, Math.max(dist, 1)), face: th, fire: true, burst: K.burstBy[base] || K.burst, thrust: 1 };
}

// ---------- a wingman covers its leader (card space-game-fighter-flight: "a wingman covering the leader") ----------
//   campFlightCover(C, u)   for a wingman: the nearest alien (to the leader) that is within CAMP.flight.cover.range of its leader with its nose on him; else null (and always null for the leader). Attack with no target named and Guard use it first
function campFlightCover(C, u) {
  if (u.kind !== 'fighter') return null;
  const lead = campFlightMembers(C, u)[0]; if (!lead || lead === u || lead.hp <= 0) return null;
  const K = CAMP.flight.cover; let best = null, bd = K.range;
  for (const s of campAliens(C)) {
    if (s.hp <= 0 || s.rot == null || s.kind === 'mother' || s.kind === 'tower') continue; // these aim without turning: not counted (campDogThreat)
    const d = Math.hypot(s.x - lead.x, s.y - lead.y); if (d >= bd) continue;
    if (Math.abs(campWrap(Math.atan2(lead.y - s.y, lead.x - s.x) - s.rot)) < K.aspect) { best = s; bd = d; }
  }
  return best;
}
