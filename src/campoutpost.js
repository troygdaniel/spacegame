// ---------- Campaign: friendly outposts (card space-game-campaign-outposts; Troy, 20 Nov 2026) ----------
// Troy: fighters and escorts can only be BUILT, and the hull MENDED, DOCKED at a friendly outpost; the shield mends by itself, anywhere (the pips set how fast); mining works anywhere. A Fabricator
// upgrade lets the ship build anywhere. Low on hull with no ships left, the HUD says where to retreat and how long it takes on Fast. This file is the PURE half (no Phaser, no page;
// tests/campoutpost.mjs runs it in Node); the scene (src/campaignscene.js) opens the ready room (src/camphubscene.js, with the dock's rows, src/campdock.js) when the carrier docks.
//   THE DATA: CAMP.levels[n].outposts = { <place id>: { name?, range? } }: the friendly outposts of a level, places of that level (a hidden place is not one). name is what the room is called (else the place's
//   base, else "<place> outpost"). CAMP.outpost has the numbers (range, clear, repairOre, retreatHull, fabricator). The map marks them with a station and the list flags them (outpost: true).
//   campOutposts(level)        [{ id, name, place, x, y, r, range }] the outposts of the level, nearest to nothing in particular (the table's order)
//   campOutpostHot(C, o)       an alien is within CAMP.outpost.clear of the outpost: its doors are shut (a retreat to it would fly into them)
//   campOutpostNear(C, safe)   { o, d } the outpost the carrier is within the range of (d: px from its edge), or null; safe: leaving out the hot ones
//   campOutpostNearest(C, safe) { o, d, secs } the nearest outpost to the carrier whatever the range (d: px from its edge; secs: the flight on Fast), or null; safe: leaving out the hot ones
//   campAboard(C)              true when the level lists no outposts: build and repair work aboard (nowhere to dock)
//   campCanBuild(C)            docked, or the Fabricator, or aboard
//   campDock(C, arg, dry)      the order "dock": the outpost named (arg) or the near one; { ok, code, say } like every order; docked: C.docked = id, an event { type: 'docked' } for the scene
//   campUndock(C)              the carrier is free again
//   campMend(C, arg, dry)      the order "repair": the hull, docked (or aboard, in a level with no outposts), for ore
//   campRetreat(C)             null, or { o, d, secs, line, near, hot } when the hull is low and no ship of the wing is left: the HUD line and what to say. It names only an outpost whose doors are open: when every one is covered by aliens (level 2's gate while the guards live) hot is true, o is the nearest of them and the line says there is no safe dock (card space-game-outpost-hot-gate)
//   campOutpostTick(C, dt)     every tick: the retreat line is said once when it begins (campSay), and again only after it has changed (to a safe outpost, or to none) or cleared
const campOutpostBase = (L, id, pl) => { const p = pl[id], cfg = L.outposts[id] || {}; return { id, name: String(cfg.name || p.base || (p.name + ' outpost')), place: String(p.name), x: p.x, y: p.y, r: p.r || 60, market: cfg.market && cfg.market.rate > 0 ? { rate: cfg.market.rate } : null, range: Math.max(0, cfg.range != null ? cfg.range : CAMP.outpost.range) }; };
function campOutposts(level) {
  const L = CAMP.levels[level], pl = campPlaces(level), out = [];
  if (!L || !L.outposts) return out;
  Object.keys(L.outposts).forEach(id => { const p = pl[id]; if (p && !p.hidden) out.push(campOutpostBase(L, id, pl)); });
  return out;
}
const campOutpostEdge = (C, o) => Math.max(0, Math.hypot(o.x - C.carrier.x, o.y - C.carrier.y) - o.r); // px from the carrier to the edge of the outpost's place
const campOutpostHot = (C, o) => C.ships.some(u => u.team === 'alien' && u.hp > 0 && Math.hypot(u.x - o.x, u.y - o.y) <= CAMP.outpost.clear); // the dock's own rule (no alien within clear of the carrier) asked of the outpost: the carrier would arrive among them
function campOutpostNear(C, safe) {
  let best = null;
  campOutposts(C.level).forEach(o => { const d = campOutpostEdge(C, o); if (d <= o.range && (!best || d < best.d) && !(safe && campOutpostHot(C, o))) best = { o, d }; });
  return best;
}
// the HUD's line "U  dock at <outpost>": only when docking there is worth it now (the hull is hurt, there is ore for a ship, or the outpost buys ore and there is some), so a new player at the start of 1.1 is not sent to dock for nothing
function campDockHint(C) {
  if (!C || C.docked || C.result) return '';
  const n = campOutpostNear(C); if (!n) return '';
  const worth = C.carrier.hp < C.carrier.maxHp || C.ore >= Math.min(CAMP.build.fighterCost, CAMP.build.escortCost) || (!!n.o.market && C.ore > 0);
  return worth ? uiText('camp.hud.dockhint', { name: n.o.name }) : '';
}
function campOutpostNearest(C, safe) {
  let best = null;
  campOutposts(C.level).forEach(o => { const d = campOutpostEdge(C, o); if ((!best || d < best.d) && !(safe && campOutpostHot(C, o))) best = { o, d }; });
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
  C.docked = o.id; campSell(C, o); // a market buys the store on the spot
  C.input.thrust = 0; C.input.turn = 0; C.carrier.vx = 0; C.carrier.vy = 0;
  C.events.push({ type: 'docked', id: o.id, name: o.name }); // (the event 'dock' is a wing ship landing in the bay)
  return campYes('dock', { name: o.name });
}
// a market outpost (CAMP.levels[n].outposts[id].market = { rate }) buys the ore in the store when the carrier docks: rate cash for each, the store empty after. The cash pays for building, repair and the refit (campPay), and what is
// left of it and of the ore goes on to the ready room. { ore, cash } or null when nothing was sold
// THE STORE AND WHAT IS OVER IT (card space-game-l1-pacing-bugs; found by flying 1.2: "Sold 464 ore for 1392.", and 1.3 began with 500). What goes on from a mission is the cash and the ore together (campFunds),
// and a save holds CAMP.ore.cap of it at the most (campProgressLoad, campNew): the rest is gone when the debrief closes, and nothing said so. The rule is not changed here; the game SAYS it: the radio at the sale
// (camp.say.soldover), the dock room's build page (camp.hub.build.over) while it can still be spent there, and the debrief (camp.ui.over). The options for Troy are in docs/night/hunt-l1-pacing.md.
//   campStoreOver(C)   { funds, cap, over }: what the cruiser has (cash and ore), what the store carries on, and what is over it (0 when it all fits)
//   campOverLine(C)    the debrief's line when something is over, else ''
function campStoreOver(C) { const funds = C ? campFunds(C) : 0, cap = CAMP.ore.cap; return { funds, cap, over: Math.max(0, funds - cap) }; }
function campOverLine(C) { const ov = campStoreOver(C); return ov.over > 0 ? uiText('camp.ui.over', ov) : ''; }
function campSell(C, o) {
  if (!o || !o.market || C.ore < 1) return null;
  if (C.ore > (C.oreBest || 0)) C.oreBest = C.ore; // the best the store held counts for the mission's "ore" objective even if no tick has seen it
  const ore = Math.floor(C.ore), cash = Math.round(ore * o.market.rate);
  C.ore -= ore; C.cash = (C.cash || 0) + cash; C.sold = (C.sold || 0) + ore;
  C.events.push({ type: 'sold', id: o.id, name: o.name, ore, cash });
  campSay(C, 'camp.say.sold', { ore, cash });
  { const ov = campStoreOver(C); if (ov.over > 0) campSay(C, 'camp.say.soldover', { cap: ov.cap, over: ov.over }); } // more than the store carries on: say so now, while the dock's room is open to spend it in
  return { ore, cash };
}
function campUndock(C) { if (!C.docked) return false; const id = C.docked; C.docked = ''; C.events.push({ type: 'undocked', id }); return true; }

// ---- mending the hull: docked only, for ore, in proportion to what is missing ----
const campMendQuote = C => { const c = C.carrier, missing = Math.max(0, c.maxHp - c.hp); return { missing, cost: Math.max(5, Math.ceil(CAMP.outpost.repairOre * missing / c.maxHp)) }; }; // what mending the hull would take: the points missing and the ore it costs
function campMend(C, arg, dry) {
  if (!C.docked && !campAboard(C)) return campNo('norepair');
  const c = C.carrier, q = campMendQuote(C), missing = q.missing; if (missing <= 0.5) return campNo('hullfull');
  const cost = q.cost;
  if (campFunds(C) < cost) return campNo('noore2', { need: cost, have: campFunds(C) });
  if (dry) return campYes('repair', { pts: Math.round(missing), ore: cost });
  campPay(C, cost); c.hp = c.maxHp; C.orders.repair = (C.orders.repair | 0) + 1;
  C.events.push({ type: 'mend', x: c.x, y: c.y });
  return campYes('repair', { pts: Math.round(missing), ore: cost });
}

// ---- the retreat ----
// no ship of the wing is left to fight for the carrier: none in the bay, out, launching or being built
const campNoShips = C => !(C.bay.fighters + C.bay.escorts) && !campWing(C).length && !C.launchQ.length && !C.build.queue.length && !campRepairing(C);
function campRetreat(C) {
  if (!C || C.result || C.docked || !C.carrier || C.carrier.hp <= 0) return null;
  if (C.carrier.hp >= C.carrier.maxHp * CAMP.outpost.retreatHull || !campNoShips(C)) return null;
  const n = campOutpostNear(C, true), far = n ? null : campOutpostNearest(C, true), o = n ? n.o : far && far.o;
  if (!o) { // none is open: if the level has outposts, say they are covered (the pilot is not sent into the aliens at the gate); a level with none says nothing
    const any = campOutpostNearest(C, false); if (!any) return null;
    return { o: any.o, d: any.d, secs: 0, near: false, hot: true, line: uiText('camp.hud.retreathot', { name: any.o.name }) };
  }
  const secs = n ? 0 : far.secs;
  return { o, d: n ? n.d : far.d, secs, near: !!n, hot: false, line: n ? uiText('camp.hud.dockhint', { name: o.name }) : uiText('camp.hud.retreat', { name: o.name, s: secs }) };
}
function campOutpostTick(C, dt) {
  const r = campRetreat(C), kind = !r ? false : r.hot ? 'hot' : r.near ? 'near' : 'go'; // what the retreat is now: covered, in range, or a flight
  if (kind && kind !== C.flags.retreat) campSay(C, kind === 'hot' ? 'camp.say.retreathot' : kind === 'near' ? 'camp.say.retreatnear' : 'camp.say.retreat', { name: r.o.name, s: r.secs }); // said once when it begins, and again when it becomes another (the guards are dead: a safe gate)
  C.flags.retreat = kind; // cleared (false): a second time is a new one
}
