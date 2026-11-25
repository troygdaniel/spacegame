// ---------- Campaign: wing orders with groups and explicit targets (card space-game-campaign-wing-targets; Troy: command the fleet from the map) ----------
// The sim side of commanding the fleet from the map. An order names a GROUP, a VERB and a TARGET: campWingOrder(C, group, verb, target, how). Plain numbers and strings, no Phaser; tests/campwing.mjs runs it in Node.
//   groups   built-in ones in CAMP.wing.groups: 'fighters', 'all' (the same ships: there is no escort ship, card space-game-cut-escorts), and the fighters' three SQUADS 'red', 'green' and 'yellow' (card space-game-fighter-squads: a fighter has u.squad, set when it
//            leaves the bay by campSquadNext; 'fighters' is all three squads together; an order to one squad leaves the others on theirs). A group is DATA: { name, kinds: ['fighter', ...] } or { name, ships: [ids] }, so numbered
//            groups drop in later: C.groups[id] = { name, ships } is read before the table (nothing builds them yet: bench idea 1, with ranks). A group left out is the verb's own (today's orders: Attack, Escort the convoy, Guard and Recall the fighters of all three squads).
//   targets  a target is one of: an enemy (a ship of theirs), a friend (one of ours), a convoy, a place, a point { x, y }, a pickup (ore lying about), a cache (a resource cache), an anomaly (one that is noticed), a rock.
//            Give it as an entity id ('raider-3', 'freighter-h1', 'carrier', 'rock-4', 'chunk-9'), a nav row of the map (campNavRows: 'place:vesta', 'cache:0', 'anom:veil', 'scan:1', 'mother', 'tower:tower-3'),
//            a point { x, y }, a { kind, id } of these, or words ("mars", "the mothership", "the anomaly"). null is no target: the verb's own default (Attack: the nearest alien, Guard: the carrier, Escort: the nearest convoy).
//   verbs    CAMP.wing.verbs: which kinds of target a verb takes, the group it addresses when none is named, and how it ends. Pairs that are not in the table are refused with a plain line.
//   campWingOrder(C, group, verb, target, how, dry)  the one entry point (the five old orders go through it too): { ok, code, say, group, verb, target, n } or { ok: false, code, say }
//   campWingCheck(C, group, verb, target)            the same answer, and nothing done (the ship computer asks first)
//   campWingCancel(C, group, how)                    the group's orders are dropped: its ships go back to guarding the carrier (not home: that is Recall)
//   campWingState(C)                                 what the map draws: [{ id, name, n, order, mixed, target, center, ships, line }] one per group that has ships
//   campWingVerbs(C, target)                         the verbs that take this target, for the map's order menu;  campWingSmart(C, target)  the one a right-click does
//   campWingTarget(C, spec) / campWingLive(C, tg)    the words, id, row or point -> { kind, id, name, x, y, r, ref }; the same target with its position now (a ship moves)
//   campWingText(C, text, dry)                       the strip and the voice: "fighters at the mothership", "red squad escort the convoy", "all guard Ceres" (the order 'wing' of campDo)

// ---- the three pilots (card space-game-three-pilots; Troy, 23 Nov 2026: one fighter replaces each squad, Wedge (red, the leader), Kara (green), Apollo (yellow)) ----
// A squad is ONE fighter now, a named pilot as strong as the squad was (CAMP.pilots, CAMP.pilotStrength: 3, 3 and 2 fighters' worth at the start; a rank, the bay2 tech and the refit add to it). The groups 'red', 'green' and 'yellow' are the pilots' own, and their names are
// the pilots' (CAMP.wing.groups): "Wedge, attack the mothership", "Kara guards the Mars convoy". A pilot's ship has u.pilot (the id), u.squad (the group), u.str (its strength: its hull and its gun are a lone fighter's times it).
//   campPilotStrengths(total)   the strength of each pilot (in CAMP.pilots' order) when the wing is `total` fighters' worth: as even as it goes, the first ones taking the odd ones (8 is 3, 3, 2)
//   campPilotSet(C, u)          makes a fighter the pilot of its squad: its id, its strength, its hull (called when it leaves the bay, in campSpawn and campLaunch)
//   campPilotName(u)            the name of a pilot's ship ('Wedge'), '' for any other ship
//   campPilots(C)               [{ id, name, squad, lead, str, ship }] the three pilots, ship: the one that is out and alive now, else null
function campPilotStrengths(total) {
  const n = CAMP.pilots.length, t = Math.max(0, Math.floor(total) || 0), base = Math.floor(t / n), rem = t % n;
  return CAMP.pilots.map((p, i) => Math.max(1, base + (i < rem ? 1 : 0)));
}
function campPilotSet(C, u) {
  const i = CAMP.pilots.findIndex(p => p.squad === u.squad); if (i < 0) return u;
  const P = CAMP.pilots[i], str = (C.pilotStr || campPilotStrengths(CAMP.pilotStrength))[i] || 1;
  u.pilot = P.id; u.str = str; u.maxHp = u.hp = CAMP.fighter.hp * str; if (u.def) u.def.hp = u.hp;
  return u;
}
const campPilotName = u => { const p = u && u.pilot ? CAMP.pilots.find(q => q.id === u.pilot) : null; return p ? p.name : ''; };
function campPilots(C) {
  return CAMP.pilots.map((p, i) => ({ id: p.id, name: p.name, squad: p.squad, lead: !!p.lead, str: (C.pilotStr || campPilotStrengths(CAMP.pilotStrength))[i] || 1,
    ship: C.ships.find(u => u.team === 'earth' && u.hp > 0 && u.kind === 'fighter' && u.pilot === p.id) || null }));
}

// ---- groups ----
const CAMPWING_GROUP_WORDS = { wedge: 'red', kara: 'green', apollo: 'yellow', red: 'red', 'red squad': 'red', green: 'green', 'green squad': 'green', yellow: 'yellow', 'yellow squad': 'yellow', squads: 'fighters', 'all squads': 'fighters', fighter: 'fighters', fighters: 'fighters', all: 'all', everyone: 'all', everybody: 'all', wing: 'all', fleet: 'all', squadron: 'all', ships: 'all' };
// the group's id for a word or an id; '' for none; null for one that does not exist
function campWingGroupId(C, group) {
  if (group == null || group === '') return '';
  const g = String(group).toLowerCase().trim();
  if (C && C.groups && C.groups[g]) return g;
  if (Object.prototype.hasOwnProperty.call(CAMP.wing.groups, g)) return g;
  return CAMPWING_GROUP_WORDS[g] || null;
}
const campWingGroupSpec = (C, id) => (C && C.groups && C.groups[id]) || CAMP.wing.groups[id] || null;
const campWingGroupName = (C, id) => { const s = campWingGroupSpec(C, id); return s ? String(s.name) : String(id); };
// the ships of a group that are out now
function campWingShips(C, id) {
  const sp = campWingGroupSpec(C, id); if (!sp) return [];
  return C.ships.filter(u => u.team === 'earth' && u.hp > 0 && u.kind === 'fighter' && (sp.ships ? sp.ships.indexOf(u.id) >= 0 : (sp.kinds || []).indexOf(u.kind) >= 0) && (!sp.squad || u.squad === sp.squad));
}

// THE PILOTS IN THE BAY (card space-game-keys-orders; Troy, 23 Nov 2026: "an order to a pilot in the bay launches them"). A pilot that was recalled lands and waits in the bay (C.bay.fighters); the mission starts with all three out (src/campaign.js campStartOut).
//   campWingDocked(C, id)   the squads of group id with no ship out that an order can reach now: [{ squad, how: 'bay' }] a pilot waiting in the bay (the order launches it, in its own squad), [{ squad, how: 'mend' }] one being mended (it goes out with the order when it is whole)
//   campWingReach(C, id)    how many ships an order to the group reaches: the ones out and the ones that could be launched or sent out whole
function campWingDocked(C, id) {
  const sp = campWingGroupSpec(C, id); if (!sp || sp.ships || !C.bay) return []; // a group of named ships has no ids for the ones in the bay
  const squads = sp.squad ? [sp.squad] : (CAMP.wing.squads || []).slice(), repairs = C.repairs || [], out = []; let free = C.bay.fighters | 0;
  squads.forEach(sq => {
    if (campWingShips(C, sq).length) return;
    if (repairs.some(r => r.kind === 'fighter' && r.squad === sq)) out.push({ squad: sq, how: 'mend' });
    else if (free > 0) { free--; out.push({ squad: sq, how: 'bay' }); }
  });
  return out;
}
const campWingReach = (C, id) => campWingShips(C, id).length + campWingDocked(C, id).length;
// launch the docked pilots an order is given to: the ones in the bay leave at once (ships added to `ships`), the ones being mended are told to go out whole (their order is set once it is known: campWingMendOrder)
function campWingLaunchDocked(C, docked, ships) {
  const mend = [];
  docked.forEach(d => {
    if (d.how === 'bay') { C.bay.fighters--; const u = campLaunch(C, 'fighter', null, d.squad); if (u) ships.push(u); }
    else mend.push(d.squad);
  });
  return mend;
}
function campWingMendOrder(C, mend, order) { (C.repairs || []).forEach(r => { if (mend.indexOf(r.squad) >= 0) { r.order = order; r.stay = false; } }); } // a pilot being mended goes out whole, with this order

// the squad a fighter that leaves the bay joins: the one with the fewest ships (out, or landed to be mended: those come back to it), a tie to the first of CAMP.wing.squads. Six fighters leave as two and two and two; when a squad has lost
// its ships the next ones to leave (a Launch after a build) fill it again. No random number: the battle's seeded stream is the same as before squads.
function campSquadNext(C) {
  const ids = CAMP.wing.squads, n = {}; ids.forEach(k => { n[k] = 0; });
  C.ships.forEach(u => { if (u.team === 'earth' && u.hp > 0 && u.kind === 'fighter' && n[u.squad] != null) n[u.squad]++; });
  (C.repairs || []).forEach(r => { if (r.kind === 'fighter' && n[r.squad] != null) n[r.squad]++; });
  return ids.reduce((best, k) => (n[k] < n[best] ? k : best), ids[0]);
}
// THE SQUAD RING (card space-game-squad-rings; Troy, 22 Nov 2026, turning back the tint of card space-game-squad-tint): the fighters are all drawn alike, and a ring in the squad's colour is the only mark of a squad. It is on only for a squad IN FOCUS, so the
// player sees who an order goes to: (a) the pilot Q picked (WHO), each in its own colour, (b) after the W order went to all three, all three, and
// (c) after an order was given from such a list the ring is KEPT (P.ring = { sq, until }) until another squad is in focus, X clears the target, or CAMP.wing.ringKeep ms have passed. The map's dots follow the same rule (src/campmap.js).
// campSquadsLit(openId)             the squads a name is about: a squad's own name is that squad, 'squads' (the token the W order keeps) is all three, any other list or none is nobody's
// campSquadsFocus(P, C)             the squads in focus now: the pilot Q picked, else none
// campSquadsKeep(P, openId, now)    an order was given from list openId: its squads keep their ring (nothing for a list that is not a squad's)
// campSquadsFree(P)                 the kept ring goes (no key calls it now that X is gone: card space-game-keys5-qwe; the tests do)
// campSquadsShown(P, C, now)        the squads to draw a ring round this frame: the focus, which replaces the kept ring, else the kept ring until its time is up
function campSquadsLit(openId) {
  return openId === 'squads' ? CAMP.wing.squads.slice() : CAMP.wing.squads.indexOf(openId) >= 0 ? [openId] : [];
}
function campSquadsFocus(P, C) {
  const open = typeof campPanelOpen === 'function' ? campPanelOpen(P) : '';
  const f = C && typeof campSelNow === 'function' ? campSelNow(C) : null, sel = f && f.kind === 'pilot' ? [f.squad] : []; // the pilot Q W selected keeps its ring (All pilots, the default, rings nobody: card space-game-keys-select) while no squad's list is the focus (cards space-game-bracket-select-orders, space-game-q-selects-all)
  if (!open) return sel;
  const lit = campSquadsLit(open); return lit.length ? lit : sel; // an open list that is a squad's own would ring that squad (none is: the squads have no lists now)
}
function campSquadsKeep(P, openId, now) {
  const sq = campSquadsLit(openId); if (P && sq.length) P.ring = { sq, until: now + CAMP.wing.ringKeep };
}
function campSquadsFree(P) { if (P) P.ring = null; }
function campSquadsShown(P, C, now) {
  if (!P || typeof P !== 'object') return [];
  const f = campSquadsFocus(P, C); if (f.length) { P.ring = null; return f; } // a squad in focus takes the ring over: what was kept is let go
  const k = P.ring; if (!k) return [];
  if (!(now < k.until)) { P.ring = null; return []; }
  return k.sq.slice();
}

// Recall and the bay (card space-game-recall-while-launching; found by 3-GEN): Launch queues every ship in C.launchQ and one leaves every CAMP.bay.launchEvery ms, so a Recall given while the bay is still emptying
// found the ships out and sent them home, and the ships still in the queue came out afterwards with the guard and escort orders of a launch, as if there had been no Recall (and a burn that waited for the wing aboard
// waited for ships that were never recalled: campNavOut counts the queue; a burn no longer waits, card space-game-burn-with-wing-out). Now the ships of the group that are still in the queue are put back in the bay (C.bay.fighters) and counted aboard; the group's
// kinds say which; a group of named ships (C.groups) has none in the queue, which has no ids yet. Returns how many went back.
function campWingQueueBack(C, id) {
  const sp = campWingGroupSpec(C, id), kinds = sp && !sp.ships && !sp.squad ? sp.kinds || [] : []; // a squad has no ships in the queue (a fighter joins its squad when it leaves the bay): a Recall of one squad leaves the others' waiting ships where they are
  if (!C.launchQ.length || !kinds.length) return 0;
  let n = 0;
  C.launchQ = C.launchQ.filter(k => {
    if (kinds.indexOf(k) < 0) return true;
    C.bay.fighters++;
    n++; return false;
  });
  return n;
}

// ---- targets ----
const campWingKindOf = u => u.team === 'alien' ? 'enemy' : u.kind === 'freighter' ? 'convoy' : 'friend';
const CAMPWING_KIND_WORDS = { enemy: 'an enemy', friend: 'one of ours', convoy: 'a convoy', place: 'a place', point: 'a point', pickup: 'ore', cache: 'a cache', anomaly: 'an anomaly', rock: 'a rock' };
function campWingShipName(C, u) {
  if (u.kind === 'mother') return 'the mothership';
  if (u.kind === 'carrier') return 'the carrier';
  if (u.kind === 'freighter') return typeof campConvoyName === 'function' ? campConvoyName(u) + ' convoy' : 'the convoy';
  const k = 'camp.nav.k.' + u.kind, w = typeof uiText === 'function' ? uiText(k) : k, word = w && w !== k ? String(w).toLowerCase() : u.kind; // the kind's own words ("torpedo boat", "pirate leader"): the id said "Fighters, attack the tboat." and "the pirateleader"
  return (u.team === 'alien' ? 'the ' : 'our ') + word;
}
const campWingShipTarget = (C, u) => ({ kind: campWingKindOf(u), id: u.id, name: campWingShipName(C, u), x: u.x, y: u.y, r: u.r || 0, ref: u.id });
function campWingPlaceTarget(C, id) {
  const p = campPlaces(C.level)[id]; if (!p || p.hidden) return null;
  return { kind: 'place', id: 'place:' + id, name: String(p.name), x: p.x, y: p.y, r: p.r || 60, ref: 'place:' + id };
}
function campWingAnomalyTarget(C, a) { return a && (a.state === 'hidden' ? a.sensed : a.state === 'revealed') ? { kind: 'anomaly', id: 'anom:' + a.id, name: a.state === 'hidden' ? 'the anomaly' : 'the alien cache', x: a.x, y: a.y, r: 0, ref: 'anom:' + a.id } : null; }
// by the id strings of the game and of the map's list; null when it names nothing now
function campWingById(C, s) {
  let m;
  if (C.by[s] && C.by[s].hp > 0) return campWingShipTarget(C, C.by[s]);
  if (s === 'carrier') return campWingShipTarget(C, C.carrier);
  if ((m = /^place:(.+)$/.exec(s))) return campWingPlaceTarget(C, m[1]);
  if ((m = /^convoy:(.+)$/.exec(s))) return C.by[m[1]] && C.by[m[1]].hp > 0 ? campWingShipTarget(C, C.by[m[1]]) : null;
  if ((m = /^tower:(.+)$/.exec(s))) return C.by[m[1]] && C.by[m[1]].hp > 0 ? campWingShipTarget(C, C.by[m[1]]) : null;
  if (s === 'mother' || s === 'mothership') { const mo = C.ships.find(u => u.kind === 'mother' && u.hp > 0); return mo ? campWingShipTarget(C, mo) : null; }
  if ((m = /^cache:(\d+)$/.exec(s))) { const k = C.caches[+m[1]]; return k && !k.got ? { kind: 'cache', id: s, name: 'the cache', x: k.x, y: k.y, r: 0, ref: s } : null; }
  if ((m = /^anom:(.+)$/.exec(s))) return campWingAnomalyTarget(C, (C.anoms || []).find(a => a.id === m[1]));
  if ((m = /^scan:(\d+)$/.exec(s))) { const p = (C.scan || [])[+m[1]]; return p && !p.got ? { kind: 'point', id: s, name: 'the scan point', x: p.x, y: p.y, r: p.r || 0, ref: s } : null; }
  if (s === 'relic') return C.relic ? { kind: 'point', id: 'relic', name: 'the relic', x: C.relic.x, y: C.relic.y, r: 0, ref: 'relic' } : null;
  if (/^rock-/.test(s)) { const r = C.rocks.find(o => o.id === s && o.hp > 0); return r ? { kind: 'rock', id: s, name: 'the rock', x: r.x, y: r.y, r: r.r || 0, ref: s } : null; }
  if (/^(?:chunk|wreck)-/.test(s)) { const p = C.pickups.find(o => o.id === s); return p ? { kind: 'pickup', id: s, name: 'the ore', x: p.x, y: p.y, r: 0, ref: s } : null; }
  return null;
}
// by words: "mars", "the mothership", "the anomaly", "that cache", "the nearest ore"
function campWingByWords(C, text) {
  const q = String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); if (!q) return null;
  const near = (list, f) => list.filter(f).sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier))[0] || null;
  if (/\b(?:anomal(?:y|ies)|shimmer|cloaked)\b/.test(q)) { const a = near((C.anoms || []).filter(x => campWingAnomalyTarget(C, x)), () => true); return campWingAnomalyTarget(C, a); }
  if (/\b(?:ore|chunks?|wrecks?|salvage|loot)\b/.test(q)) { const p = near(C.pickups, () => true); return p ? campWingById(C, p.id) : null; }
  if (/\b(?:cache|caches|supplies|pods?)\b/.test(q) && !/\bconvoy\b/.test(q)) { const i = C.caches.map((k, n) => [k, n]).filter(x => !x[0].got).sort((a, b) => campDist(a[0], C.carrier) - campDist(b[0], C.carrier))[0]; return i ? campWingById(C, 'cache:' + i[1]) : null; }
  if (/\b(?:rock|rocks|asteroid|asteroids)\b/.test(q)) { const r = near(C.rocks, o => o.hp > 0); return r ? campWingById(C, r.id) : null; }
  if (/\b(?:gunship|raider|drone|tower|enemy|alien|bandit|pirate|skiff|cutter|brute|lancer|torpedo boat|boat)s?\b/.test(q)) { const w = (/\b(gunship|raider|drone|tower|skiff|cutter|brute|lancer|torpedo boat|boat)/.exec(q) || [])[1], kinds = !w ? null : /boat/.test(w) ? ['tboat', 'lancer'] : [w]; const e = near(C.ships, u => u.team === 'alien' && u.hp > 0 && (!kinds || kinds.indexOf(u.kind) >= 0)); return e ? campWingShipTarget(C, e) : null; } // the pirates' kinds and the torpedo boats by name too (card space-game-torpedo-boats): "attack the torpedo boat" is the nearest of them
  const t = typeof campFind === 'function' ? campFind(C, text) : null;
  if (!t) return null;
  if (t.kind === 'mother') return campWingById(C, 'mother');
  if (t.kind === 'carrier') return campWingById(C, 'carrier');
  if (t.kind === 'convoy') return campWingById(C, t.id);
  if (t.kind === 'place') return campWingPlaceTarget(C, t.id);
  return null;
}
// the target of anything the caller may hold: null for none given, false for one given that names nothing now
function campWingTarget(C, spec) {
  if (spec == null || spec === '') return null;
  let r = null;
  if (typeof spec === 'string') r = campWingById(C, spec) || (/^[a-z]+[-:][a-z0-9:_-]+$/.test(spec) ? null : campWingByWords(C, spec)); // an id that names nothing is not words ("rock-999" is not "the nearest rock")
  else if (typeof spec === 'object') {
    if (typeof spec.id === 'string' && (r = campWingById(C, spec.id))) { /* an id or a nav row */ }
    else if (typeof spec.ref === 'string' && (r = campWingById(C, spec.ref))) { /* a target of this file, handed back */ }
    else if (Number.isFinite(spec.x) && Number.isFinite(spec.y) && (!spec.kind || spec.kind === 'point' || !spec.id)) r = { kind: 'point', id: 'point', name: spec.name ? String(spec.name) : 'that point', x: spec.x, y: spec.y, r: spec.r || 0, ref: '' };
  }
  return r || false;
}
// the same target now: a ship has moved, ore has been taken; null when it is gone
function campWingLive(C, tg) {
  if (!tg) return null;
  if (tg.kind === 'point' && !tg.ref) return tg;
  const r = campWingById(C, tg.ref || tg.id || ''); return r || (tg.kind === 'point' && Number.isFinite(tg.x) ? tg : null);
}

// ---- the verbs and what they do ----
// the order a verb puts on a ship; the AI is campWingAI in src/campaign.js. tg: the target, or null for the verb's own default
const CAMPWING_ORDER = {
  attack: (C, u, tg) => ({ type: 'attack', target: tg ? tg.id : '' }),
  escort: (C, u, tg, i) => ({ type: 'escort', target: tg.id, slot: i }),
  guard: (C, u, tg) => ({ type: 'guard', at: !tg || tg.id === C.carrier.id ? { kind: 'carrier' } : tg.kind === 'place' ? { kind: 'place', id: tg.id.slice(6) } : tg.kind === 'point' ? { kind: 'point', x: tg.x, y: tg.y } : { kind: tg.kind, id: tg.id } }),
  hold: (C, u, tg) => ({ type: 'hold', at: { x: tg.x, y: tg.y } }),
  fetch: (C, u, tg) => ({ type: 'fetch' }),
  mine: (C, u, tg) => ({ type: 'mine', target: tg ? tg.id : '' }),
  recall: () => ({ type: 'recall' })
};
const campWingNo = (code, vars) => ({ ok: false, code, say: uiText('camp.no.' + code, vars) });
function campWingPlural(n, one, many) { return n === 1 ? one : many; }

function campWingOrder(C, group, verb, target, how, dry) {
  if (!C || C.result) return campNo('over');
  const V = CAMP.wing.verbs[verb]; if (!V) return campNo('what');
  const gid = campWingGroupId(C, group); if (gid === null) return campWingNo('wnogroup');
  const id = gid || V.group, ships = campWingShips(C, id), docked = verb === 'recall' ? [] : campWingDocked(C, id); // an order other than Recall reaches the pilots in the bay too: it launches them (card space-game-keys-orders)
  const empty = { fighters: 'nofighters', all: 'nowing', red: 'nosquad', green: 'nosquad', yellow: 'nosquad' }[id] || 'nowing';
  if (!ships.length && !docked.length) return campNo(C.launchQ.length ? 'launching' : empty);
  const tg = campWingTarget(C, target);
  if (tg === false) return campWingNo('wnotarget');
  const gname = campWingGroupName(C, id);
  if (verb === 'recall') {
    const rc = id === 'all' ? 'recall' : 'wing.recall', rv = { group: gname, name: '' }; // one part recalled is named: "Fighters, return to the carrier."
    if (dry) return campYes(rc, rv);
    ships.forEach(u => { u.order = { type: 'recall' }; u.move = null; }); C.orders.recall++;
    const back = campWingQueueBack(C, id); // the ships of the group still waiting to leave the bay stay aboard (card space-game-recall-while-launching)
    (C.repairs || []).forEach(r => { r.stay = true; }); // a fighter still being mended stays aboard when it is whole (src/camprepair.js)
    const r = campWingDone(C, id, verb, null, ships, how, rc, rv); r.queued = back; return r;
  }
  if (tg && V.kinds.indexOf(tg.kind) < 0) return campWingNo('wbadpair', { group: gname, verb, what: CAMPWING_KIND_WORDS[tg.kind] || tg.kind });
  if (!tg && V.need) return campWingNo('wneed', { verb });
  let say = 'wing.' + verb, vars = { group: gname, name: tg ? tg.name : '' }, tgo = tg;
  if (verb === 'attack') {
    if (tg && C.by[tg.id] && C.by[tg.id].kind === 'mother') say = id === V.group ? 'attackmother' : 'wing.attack'; // today's words for today's order, the generic ones for any other group
    else if (!tg) say = id === V.group ? 'attack' : 'wing.attacknear';
  } else if (verb === 'escort') {
    if (!tg) {
      if (!C.L.convoys.length) { // no convoys in this level: Escort keeps the fighters close to the carrier
        if (dry) return campYes('escortcarrier');
        const mend0 = campWingLaunchDocked(C, docked, ships); campWingMendOrder(C, mend0, { type: 'guard', at: { kind: 'carrier' } });
        ships.forEach(u => { u.order = { type: 'guard', at: { kind: 'carrier' } }; u.move = null; }); C.orders.escort++;
        return campWingDone(C, id, verb, null, ships, how, 'escortcarrier');
      }
      const cv = campNearest(campConvoys(C), C.carrier); if (!cv) return campNo('noconvoy');
      tgo = campWingShipTarget(C, cv); say = id === V.group ? 'escort' : say; vars = { name: campConvoyName(cv), group: gname };
    } else if (tg.kind === 'convoy' && id === V.group) { say = 'escort'; vars = { name: campConvoyName(C.by[tg.id]), group: gname }; }
  } else if (verb === 'guard') {
    if (!tg || tg.id === C.carrier.id) { say = id === V.group ? 'guard' : 'wing.guardcarrier'; }
    else if (id === V.group && (tg.kind === 'place' || tg.kind === 'convoy')) say = 'guard';
  } else if (verb === 'fetch') {
    if (!tg) { // nothing named: the nearest ore lying about, else the nearest cache
      const p = campNearest(C.pickups, C.carrier), k = C.caches.map((q, n) => [q, n]).filter(x => !x[0].got).sort((a, b) => campDist(a[0], C.carrier) - campDist(b[0], C.carrier))[0];
      tgo = p ? campWingById(C, p.id) : k ? campWingById(C, 'cache:' + k[1]) : null; if (!tgo) return campWingNo('wnothing');
      vars = { group: gname, name: tgo.name };
    }
  } else if (verb === 'mine') {
    if (!C.pickups.length && !C.rocks.some(r => r.hp > 0)) return campNo('noore');
    say = tg ? 'wing.mine' : 'mine';
  }
  if (dry) return campYes(say, vars);
  const mend = campWingLaunchDocked(C, docked, ships); // the pilots in the bay leave now, with this order; the ones being mended go out with it when whole
  if (mend.length) { const mo = CAMPWING_ORDER[verb](C, {}, tgo, 0); if (tgo) mo.tg = { kind: tgo.kind, id: tgo.id, ref: tgo.ref, name: tgo.name, x: tgo.x, y: tgo.y }; if (verb === 'guard' && tgo && (tgo.kind === 'friend' || tgo.kind === 'convoy')) mo.grp = id; campWingMendOrder(C, mend, mo); }
  ships.forEach((u, i) => { u.order = CAMPWING_ORDER[verb](C, u, tgo, i); if (tgo) u.order.tg = { kind: tgo.kind, id: tgo.id, ref: tgo.ref, name: tgo.name, x: tgo.x, y: tgo.y }; if (verb === 'guard' && tgo && (tgo.kind === 'friend' || tgo.kind === 'convoy')) u.order.grp = id; u.move = null; }); // grp: the group the guard of a ship was given to (campWingGuardStep says its end once for it)
  C.orders[verb] = (C.orders[verb] | 0) + 1;
  return campWingDone(C, id, verb, tgo, ships, how, say, vars);
}
function campWingDone(C, id, verb, tg, ships, how, code, vars) {
  C.events.push({ type: 'wingorder', group: id, verb, target: tg ? { kind: tg.kind, id: tg.id, name: tg.name } : null, n: ships.length, how: how || '' });
  const r = campYes(code, vars || { group: campWingGroupName(C, id), name: tg ? tg.name : '' });
  r.group = id; r.verb = verb; r.target = tg; r.n = ships.length; return r;
}
const campWingCheck = (C, group, verb, target) => campWingOrder(C, group, verb, target, 'check', true);

// the group's orders are dropped: its ships go back to guarding the carrier
function campWingCancel(C, group, how, dry) {
  if (!C || C.result) return campNo('over');
  const gid = campWingGroupId(C, group); if (gid === null) return campWingNo('wnogroup');
  const id = gid || 'all', ships = campWingShips(C, id);
  if (!ships.length) return campNo(C.launchQ.length ? 'launching' : 'nowing');
  if (dry) return campYes('wing.cancel', { group: campWingGroupName(C, id), name: '' });
  ships.forEach(u => { u.order = { type: 'guard', at: { kind: 'carrier' } }; u.move = null; });
  C.events.push({ type: 'wingorder', group: id, verb: 'cancel', target: null, n: ships.length, how: how || '' });
  const r = campYes('wing.cancel', { group: campWingGroupName(C, id), name: '' }); r.group = id; r.verb = 'cancel'; r.n = ships.length; return r;
}

// ---- Guard the target (card space-game-guard-the-target; Troy, 22 Nov 2026) ----
// A squad (or the wing) sent to guard a SHIP (a convoy ship, a neutral miner, the distress miner) flies in formation beside it, meets what comes near it and returns (campWingAI, the guard branch, src/campflight.js). It stays on that ship until it is given
// another order, or until the ship is SAFE (it arrived: u.arrived) or LOST (its hull is gone), which this says on the radio, once for each group: "Red squad, Mars convoy is lost. Back to the cruiser." Then the group guards the cruiser again. A place (an outpost)
// is guarded as it always was, and ends only with another order. Called every tick (campTick); a few ships, so it costs nothing.
function campWingGuardStep(C) {
  const said = {};
  C.ships.forEach(u => {
    if (u.team !== 'earth' || u.hp <= 0) return;
    const o = u.order; if (!o || o.type !== 'guard' || !o.at || (o.at.kind !== 'friend' && o.at.kind !== 'convoy')) return;
    const m = C.by[o.at.id]; if (m && m.hp > 0) return; // still there
    const gid = o.grp || u.squad || (u.kind === 'escort' ? 'escorts' : 'all'), name = o.tg && o.tg.name ? o.tg.name : 'the ship', key = gid + '|' + o.at.id; // the group the order was given to (the whole wing is one voice), else the ship's own squad
    if (!said[key]) { said[key] = 1; campSay(C, m && m.arrived ? 'camp.say.wing.guardsafe' : 'camp.say.wing.guardlost', { group: campWingGroupName(C, gid), name }); }
    u.order = { type: 'guard', at: { kind: 'carrier' } }; u.move = null; // back to the cruiser
  });
}

// ---- what the map draws ----
const campWingOrderKey = u => { const o = u.order || { type: 'guard', at: { kind: 'carrier' } }; return o.type + '|' + (o.tg ? o.tg.id : o.target || (o.at && o.at.id) || (o.at && o.at.kind) || ''); };
function campWingState(C) {
  const out = [], ids = Object.keys(CAMP.wing.groups).filter(id => id !== 'all').concat(Object.keys(C.groups || {})); // 'all' is the same ships as 'fighters' now (no escort ship, card space-game-cut-escorts): one row for them
  ids.forEach(id => {
    const ships = campWingShips(C, id); if (!ships.length) return;
    const count = {}; ships.forEach(u => { const k = campWingOrderKey(u); count[k] = (count[k] || 0) + 1; });
    const keys = Object.keys(count).sort((a, b) => count[b] - count[a]), best = keys[0], lead = ships.find(u => campWingOrderKey(u) === best), o = lead.order || { type: 'guard', at: { kind: 'carrier' } };
    const cx = ships.reduce((a, u) => a + u.x, 0) / ships.length, cy = ships.reduce((a, u) => a + u.y, 0) / ships.length;
    let target = null;
    if (o.type === 'recall') target = campWingShipTarget(C, C.carrier);
    else if (o.tg) target = campWingLive(C, o.tg);
    else if (o.type === 'attack' && o.target) { const u = C.by[o.target]; target = u && u.hp > 0 ? campWingShipTarget(C, u) : null; }
    else if (o.type === 'escort' && o.target) { const u = C.by[o.target]; target = u && u.hp > 0 ? campWingShipTarget(C, u) : null; }
    else if (o.type === 'guard' && o.at && o.at.kind === 'place') target = campWingPlaceTarget(C, o.at.id);
    else if (o.type === 'hold' && o.at) target = { kind: 'point', id: 'point', name: 'that point', x: o.at.x, y: o.at.y, r: 0, ref: '' };
    out.push({ id, name: campWingGroupName(C, id), n: ships.length, order: o.type, mixed: keys.length > 1, target, center: { x: cx, y: cy },
      ships: ships.map(u => ({ id: u.id, kind: u.kind, x: u.x, y: u.y })), line: target ? { from: { x: cx, y: cy }, to: { x: target.x, y: target.y } } : null });
  });
  return out;
}
// the verbs that take this target (the map's order menu), and the one a right-click does
function campWingVerbs(C, target) {
  const tg = campWingTarget(C, target); if (!tg) return [];
  return Object.keys(CAMP.wing.verbs).filter(v => CAMP.wing.verbs[v].kinds.indexOf(tg.kind) >= 0);
}
function campWingSmart(C, target) {
  const tg = campWingTarget(C, target); if (!tg) return '';
  const v = CAMP.wing.smart[tg.kind]; return v && campWingVerbs(C, tg).indexOf(v) >= 0 ? v : (campWingVerbs(C, tg)[0] || '');
}

// ---- the strip and the voice ----
// "fighters at the mothership", "red squad escort the convoy", "all guard Ceres", "fighters hold at Ceres", "cancel the fighters", "red squad attack the mothership", "yellow guard", "all squads recall"
const CAMPWING_VERB_WORDS = { attack: 'attack', engage: 'attack', hit: 'attack', strike: 'attack', guard: 'guard', defend: 'guard', protect: 'guard', escort: 'escort', cover: 'escort', fetch: 'fetch', get: 'fetch', collect: 'fetch', grab: 'fetch', retrieve: 'fetch', hold: 'hold', mine: 'mine', recall: 'recall' };
function campWingParse(text) {
  const q = String(text == null ? '' : text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:the |our )/, '');
  const mc = /^(?:cancel|stop|stand down|release|clear)\s+(?:the |our )?(wedge|kara|apollo|red squad|green squad|yellow squad|red|green|yellow|all squads|squads|fighters?|all|everyone|everybody|wing|fleet|squadron|ships)\b/.exec(q); if (mc) return { group: CAMPWING_GROUP_WORDS[mc[1]], verb: 'cancel', target: '' };
  let m = /^(wedge|kara|apollo|red squad|green squad|yellow squad|red|green|yellow|all squads|squads|fighters?|all|everyone|everybody|wing|fleet|squadron|ships)\b\s*(.*)$/.exec(q); if (!m) return null;
  const group = CAMPWING_GROUP_WORDS[m[1]]; let rest = m[2].replace(/^(?:to |should |must |please )/, '');
  let verb = '', mv = /^(attack|engage|hit|strike|guard|defend|protect|escort|cover|fetch|get|collect|grab|retrieve|hold|mine|recall)\b\s*(.*)$/.exec(rest);
  if (mv) { verb = CAMPWING_VERB_WORDS[mv[1]]; rest = mv[2]; }
  rest = rest.replace(/^(?:at|to|on|over|for|near|beside|around|in)\b\s*/, '').replace(/^(?:the |that |our )/, '').trim();
  return { group, verb, target: rest };
}
function campWingText(C, text, dry) {
  const p = typeof text === 'object' && text ? text : campWingParse(text);
  if (!p) return campWingNo('wnogroup');
  if (p.verb === 'cancel' || (!p.verb && /^(?:cancel|stand down|stand by|carry on)$/.test(p.target || ''))) return campWingCancel(C, p.group, 'strip', dry);
  if (p.verb === 'recall') return campWingOrder(C, p.group, 'recall', null, 'strip', dry);
  const tg = p.target ? campWingTarget(C, p.target) : null;
  if (p.target && tg === false) return campWingNo('wnotarget');
  const verb = p.verb || (tg ? campWingSmart(C, tg) : '');
  if (!verb) return campWingNo(tg ? 'wbadpair' : 'wneed', { group: campWingGroupName(C, p.group), verb: p.verb || 'order', what: tg ? CAMPWING_KIND_WORDS[tg.kind] : '' });
  return campWingOrder(C, p.group, verb, tg || null, 'strip', dry);
}
