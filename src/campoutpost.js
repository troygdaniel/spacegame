// ---------- Campaign: friendly outposts (card space-game-campaign-outposts; Troy, 20 Nov 2026) ----------
// Troy: fighters and escorts can only be BUILT, and the hull MENDED, DOCKED at a friendly outpost; the shield is recharged in the ship, anywhere, with ore; mining works anywhere. A Fabricator
// upgrade lets the ship build anywhere. Low on hull with no ships left, the HUD says where to retreat and how long it takes on Fast. This file is the PURE half (no Phaser, no page;
// tests/campoutpost.mjs runs it in Node); the scene (src/campaignscene.js) opens the ready room (src/camphubscene.js, with the dock's rows, src/campdock.js) when the carrier docks.
//   THE DATA: CAMP.levels[n].outposts = { <place id>: { name?, range? } }: the friendly outposts of a level, places of that level (a hidden place is not one). name is what the room is called (else the place's
//   base, else "<place> outpost"). CAMP.outpost has the numbers (range, clear, repairOre, retreatHull, fabricator). The map marks them with a station and the list flags them (outpost: true).
//   campOutposts(level)        [{ id, name, place, x, y, r, range }] the outposts of the level, nearest to nothing in particular (the table's order)
//   campOutpostNear(C)         { o, d } the outpost the carrier is within the range of (d: px from its edge), or null
//   campOutpostNearest(C)      { o, d, secs } the nearest outpost to the carrier whatever the range (d: px from its edge; secs: the flight on Fast), or null
//   campAboard(C)              true when the level lists no outposts: build and repair work aboard (nowhere to dock)
//   campCanBuild(C)            docked, or the Fabricator, or aboard
//   campDock(C, arg, dry)      the order "dock": the outpost named (arg) or the near one; { ok, code, say } like every order; docked: C.docked = id, an event { type: 'docked' } for the scene
//   campUndock(C)              the carrier is free again
//   campMend(C, arg, dry)      the order "repair": the hull, docked (or aboard, in a level with no outposts), for ore
//   campRetreat(C)             null, or { o, d, secs, line, near } when the hull is low and no ship of the wing is left: the HUD line and what to say
//   campOutpostTick(C, dt)     every tick: the retreat line is said once when it begins (campSay), and again only after it has cleared
const campOutpostBase = (L, id, pl) => { const p = pl[id], cfg = L.outposts[id] || {}; return { id, name: String(cfg.name || p.base || (p.name + ' outpost')), place: String(p.name), x: p.x, y: p.y, r: p.r || 60, range: Math.max(0, cfg.range != null ? cfg.range : CAMP.outpost.range) }; };
function campOutposts(level) {
  const L = CAMP.levels[level], pl = campPlaces(level), out = [];
  if (!L || !L.outposts) return out;
  Object.keys(L.outposts).forEach(id => { const p = pl[id]; if (p && !p.hidden) out.push(campOutpostBase(L, id, pl)); });
  return out;
}
const campOutpostEdge = (C, o) => Math.max(0, Math.hypot(o.x - C.carrier.x, o.y - C.carrier.y) - o.r); // px from the carrier to the edge of the outpost's place
function campOutpostNear(C) {
  let best = null;
  campOutposts(C.level).forEach(o => { const d = campOutpostEdge(C, o); if (d <= o.range && (!best || d < best.d)) best = { o, d }; });
  return best;
}
function campOutpostNearest(C) {
  let best = null;
  campOutposts(C.level).forEach(o => { const d = campOutpostEdge(C, o); if (!best || d < best.d) best = { o, d }; });
  if (best) best.secs = typeof campNavEta === 'function' ? campNavEta(C, Math.hypot(best.o.x - C.carrier.x, best.o.y - C.carrier.y), true) : 0; // the flight on Fast, as the map says it
  return best;
}
// a level whose data lists NO outposts (the alien home world) has nowhere to dock: building and repairing work aboard the carrier there, at the same ore costs (card space-game-campaign-no-outpost-rule; the rule is the level's own list)
const campAboard = C => campOutposts(C.level).length === 0;
const campCanBuild = C => !!C.docked || campAboard(C) || (typeof campHas === 'function' && campHas(C, 'fabricator'));

// ---- docking ----
function campDock(C, arg, dry) {
  if (C.docked) return campNo('docked');
  const all = campOutposts(C.level); if (!all.length) return campNo('noposts');
  const q = String(arg == null ? '' : arg).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(the|a|an|at|to|in)\b/g, ' ').replace(/\s+/g, ' ').trim();
  let o = null, d = 0;
  if (q) { // a named outpost: by its name or its place's ("luna", "lunar base")
    o = all.find(x => q === x.id || q === x.place.toLowerCase() || q === x.name.toLowerCase() || x.name.toLowerCase().indexOf(q) >= 0 || q.indexOf(x.place.toLowerCase()) >= 0) || null;
    if (!o) return campNo('whichpost', { name: arg });
    d = campOutpostEdge(C, o); if (d > o.range) return campNo('farpost', { name: o.name, km: hudFmt(Math.round(d / 10)) });
  } else { const near = campOutpostNear(C); if (!near) { const far = campOutpostNearest(C); return campNo('farpost', { name: far.o.name, km: hudFmt(Math.round(far.d / 10)) }); } o = near.o; d = near.d; }
  if (C.ships.some(u => u.team === 'alien' && u.hp > 0 && Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) <= CAMP.outpost.clear)) return campNo('hotdock', { name: o.name });
  if (dry) return campYes('dock', { name: o.name });
  if (C.nav) { if (typeof campNavClear === 'function') campNavClear(C, 'arrived'); else C.nav = null; } // an autopilot trip ends: the carrier is in the outpost's bay
  C.docked = o.id;
  C.input.thrust = 0; C.input.turn = 0; C.carrier.vx = 0; C.carrier.vy = 0;
  C.events.push({ type: 'docked', id: o.id, name: o.name }); // (the event 'dock' is a wing ship landing in the bay)
  return campYes('dock', { name: o.name });
}
function campUndock(C) { if (!C.docked) return false; const id = C.docked; C.docked = ''; C.events.push({ type: 'undocked', id }); return true; }

// ---- mending the hull: docked only, for ore, in proportion to what is missing ----
function campMend(C, arg, dry) {
  if (!C.docked && !campAboard(C)) return campNo('norepair');
  const c = C.carrier, missing = c.maxHp - c.hp; if (missing <= 0.5) return campNo('hullfull');
  const cost = Math.max(5, Math.ceil(CAMP.outpost.repairOre * missing / c.maxHp));
  if (C.ore < cost) return campNo('noore2', { need: cost, have: Math.floor(C.ore) });
  if (dry) return campYes('repair', { pts: Math.round(missing), ore: cost });
  C.ore -= cost; c.hp = c.maxHp; C.orders.repair = (C.orders.repair | 0) + 1;
  C.events.push({ type: 'mend', x: c.x, y: c.y });
  return campYes('repair', { pts: Math.round(missing), ore: cost });
}

// ---- the retreat ----
// no ship of the wing is left to fight for the carrier: none in the bay, out, launching or being built
const campNoShips = C => !(C.bay.fighters + C.bay.escorts) && !campWing(C).length && !C.launchQ.length && !C.build.queue.length;
function campRetreat(C) {
  if (!C || C.result || C.docked || !C.carrier || C.carrier.hp <= 0) return null;
  if (C.carrier.hp >= C.carrier.maxHp * CAMP.outpost.retreatHull || !campNoShips(C)) return null;
  const n = campOutpostNear(C), far = n ? null : campOutpostNearest(C), o = n ? n.o : far && far.o; if (!o) return null;
  const secs = n ? 0 : far.secs;
  return { o, d: n ? n.d : far.d, secs, near: !!n, line: n ? uiText('camp.hud.dockhint', { name: o.place }) : uiText('camp.hud.retreat', { name: o.place, s: secs }) };
}
function campOutpostTick(C, dt) {
  const r = campRetreat(C);
  if (r && !C.flags.retreat) { C.flags.retreat = true; campSay(C, r.near ? 'camp.say.retreatnear' : 'camp.say.retreat', { name: r.o.place, s: r.secs }); } // said once when it begins
  else if (!r && C.flags.retreat) C.flags.retreat = false; // cleared: a second time is a new one
}
