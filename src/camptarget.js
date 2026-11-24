// ---------- Campaign: WHO and one TARGET (cards space-game-two-hands-keys, 21 Nov 2026; space-game-bracket-select-orders, 23 Nov 2026; space-game-keys-select, space-game-keys2-select and space-game-keys3-select, Troy, 23 Nov 2026, like X-Wing) ----------
// Two picks are held: WHO takes the order (C.sel: All pilots, the default, or one pilot) and ONE target, which is an ENEMY (C.tgt) or a FRIENDLY (a ship you protect, or an outpost or planet a click on the Tab map holds, C.fsel), never both: picking a friendly lets the enemy go and picking an enemy lets the friendly go. Q and W step WHO (All pilots, Wedge, Kara, Apollo, round), [ and ] the enemy (nearest the cruiser first), \ the nearest threat,
// O and P the friendly SHIP (last, next: no outpost or planet is in that cycle), a click on an outpost or a planet on the Tab map holds that place (campFriHold), X lets the target go and puts WHO back on All pilots. S is no pick: it brings the view back to the cruiser (src/campzoom.js).
// The order key acts on them (campSelOrder, card space-game-keys2-orders): E sends WHO at the enemy, or to guard the friendly, or (nothing picked) to form up on the cruiser; there is no recall; a pilot takes the order alone, All pilots are all three. Fly to the target, Enter and the missile follow the enemy as before.
// The target is a ship of the aliens' or the pirates' side: C.tgt is its id ('' for none). The sim keeps it as plain data (no Phaser, seeded, nothing random): tests/camptarget.mjs runs it in Node;
// src/campanelsdraw.js says its name in the FLEET panel and src/campaignscene.js draws the bracket round it on the screen. A target that is destroyed is let go the next time anyone asks.
//   campTgtList(C)              the hostiles, nearest the carrier first (ties by id): every alien ship that is alive, the mothership and the towers too
//   campTgtNow(C)               the ship that is the target now, or null (a dead one is let go: C.tgt is cleared)
//   campTgtStep(C, dir)         ] (1) and [ (-1): the ship after or before the target in the list, round at the ends; with none, ] takes the nearest and [ the farthest. Returns the ship, or null when there is no hostile
//   campTgtNearest(C)           \: the nearest hostile, whatever the target was
//   campTgtClear(C)             the enemy only (X is campPicksClear)
//   campTgtName(C)              'Raider 3', or '' for none
//   campTgtInfo(C)             { name, km, hp } for the panel and the bracket, or null
//   campTgtRow(C)               the row of the map's list (src/campnav.js campNavRows) that is the target, for the autopilot, or null
//   campTgtAttack(C, how, dry)  key 2 with a target: the fighters attack that ship (campWingOrder); the answer is the order's
//   campTgtMissile(C, dry)      Enter with a target: a missile at that ship, if it is inside CAMP.missile.lock; the answer is the order's
//   C.sel                       WHO: 'all' (All pilots: the default; '' reads as it) | 'pilot:red' | 'pilot:green' | 'pilot:yellow' (src/campaign.js campNew)
//   campSelList(C)              the stops Q and W step through: All pilots, then the pilots with a ship out: [{ id, kind: 'all'|'pilot', squad, unit, units, name }]
//   campSelNow(C)               WHO now (an entry of that list), never null with a cruiser (a pilot who was lost or is home is let go the next time anyone asks: All pilots)
//   campSelStep(C, dir)         D (1) and A (-1): the next or the last who, round at the ends
//   campSelAll(C)               Q: WHO is All pilots (kind 'all', name 'All pilots', units: the ships out)
//   campSelClear(C)             WHO back to All pilots
//   C.fsel                      the FRIENDLY: the id of a ship you protect (the transport, a miner, a hauler) or of an outpost ('place:...'); '' for none. C.tgt and C.fsel are never both set (one target): a pick of one lets go of the other, and the step with nothing to pick changes neither
//   campHeldNow(C)             the ONE target held now (card space-game-keys2-select): { kind: 'hostile' | 'friendly', id, name, unit (a ship; null for an outpost), post (the outpost's entry; null for a ship) }, or null. What the target box, the bracket and the order keys read
//   campFriList(C)              the stops of O and P: the SHIPS you protect, nearest the cruiser first: [{ id, kind: 'ward', unit, name, x, y, r }]
//   campFriHold(C, 'place:luna')  a click on an outpost or a planet of the Tab map (src/campmapdraw.js campMapClick): that place is the target held (the enemy is let go); campFriNow then says { id, kind: 'post', unit: null, name, x, y, r }
//   campHeldRow(C)              the nav row of the target held (an enemy's, a place's, a ship's): what Fly to the target flies to
//   campFriNow(C) / campFriStep(C, dir) / campFriClear(C)   the friendly now (or null); P (1) and O (-1) the next and the last, round at the ends; none
//   campPicksClear(C)           X: no target, WHO back on All pilots; true when there was something to let go
//   campMarkNow(C)              { who, held }: the strength 0..1 of the squares now (card space-game-pilot-squares-fade): the pilots WHO is, and the target held (enemy or friendly); each is 1 for CAMP.mark.show ms after it was picked (campMarkTouch, called by every pick below, even a pick of what is picked already), an order was given (the wing counters of C.orders) or the mission began, then CAMP.mark.fade ms of fade, then 0; the numbers are in CAMP.mark, the clock is C.t, the state is kept per C
//   campSelUnits(C)             { hostile, friendly, friendlyPost, who, whoShips }: the ships picked now (each a unit or null; friendlyPost is the entry of an outpost, which is no unit; who is the one ship of a pilot, null for All pilots; whoShips every ship WHO is: the three for All pilots); what the camera, the brackets and the displays read (src/campselzoom.js, src/camptargetdraw.js, src/camptdisp.js)
//   campSelRowFor(C, kind)      the pick a W row acts on (card space-game-w-uses-selection): 'hostile' the enemy, 'friend' the friendly: { id, name, unit } or { code: 'nohostile' | 'nofriend' };   campSelWho(C)   'Kara' or 'all squads': who takes the order
//   campSelOrder(C, verb, how, dry)   E is 'engage' (campWingOrder): the group is WHO's squad (a pilot), else all three; an enemy picked: attack it; a friendly picked: guard it; none: form up on the cruiser ({ verb: 'attack'|'guard', formup }); 'attack' and 'guard' alone are its halves (the target boxes' dry runs)
const CAMP_TGT = '@target'; // the arg of campOrder(C, 'attack' | 'missiles', CAMP_TGT): the picked target (campDo in src/campaign.js)
function campTgtList(C) {
  if (!C || !C.carrier) return [];
  return campAliens(C).filter(u => typeof campSeen !== 'function' || campSeen(C, u)).slice().sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function campTgtNow(C) {
  if (!C || !C.tgt) return null;
  const u = C.by && C.by[C.tgt];
  if (!u || u.hp <= 0 || u.team !== 'alien') { C.tgt = ''; return null; }
  return u;
}
function campTgtStep(C, dir) {
  const list = campTgtList(C); if (!list.length) { if (C) C.tgt = ''; return null; }
  const at = list.findIndex(u => u.id === C.tgt), d = dir < 0 ? -1 : 1, i = at < 0 ? (d > 0 ? 0 : list.length - 1) : (at + d + list.length) % list.length;
  C.tgt = list[i].id; C.fsel = ''; campMarkTouch(C, false, true); return list[i]; // one target: the friendly is let go
}
function campTgtNearest(C) {
  const list = campTgtList(C); if (!list.length) { if (C) C.tgt = ''; return null; }
  C.tgt = list[0].id; C.fsel = ''; campMarkTouch(C, false, true); return list[0]; // one target: the friendly is let go
}
function campTgtClear(C) { const had = !!(C && C.tgt); if (C) C.tgt = ''; return had; }
function campTgtName(C) { const u = campTgtNow(C); return u ? campNavUnitName(u) : ''; }
function campTgtInfo(C) {
  const u = campTgtNow(C); if (!u) return null;
  return { id: u.id, name: campNavUnitName(u), km: campNavKm(campDist(u, C.carrier)), hp: Math.max(0, Math.min(1, u.hp / (u.maxHp || u.hp || 1))) };
}
function campTgtRow(C) {
  const u = campTgtNow(C); if (!u) return null;
  return campNavRows(C).find(r => r.group === 'enemies' && r.ref === u.id) || null;
}
function campTgtAttack(C, how, dry) {
  const u = campTgtNow(C); if (!u) return campNo('notarget');
  if (!campWing(C, 'fighter').length) return campNo(C.launchQ.length ? 'launching' : 'nofighters');
  return campWingOrder(C, null, 'attack', u.id, how, dry);
}
function campTgtMissile(C, dry) {
  const u = campTgtNow(C); if (!u) return campNo('notarget');
  if (C.missiles <= 0) return campNo('nomissiles');
  if (C.t < C.nextRocket) return campNo('missilewait');
  if (campDist(u, C.carrier) > CAMP.missile.lock) return campNo('tgtrange');
  const code = u.kind === 'mother' ? 'missilesmother' : 'missiles';
  if (dry) return campYes(code);
  campFire(C, u); C.orders.missiles++; return campYes(code);
}

// ---- WHO takes the order (C.sel), the FRIENDLY (C.fsel) and the order keys (cards space-game-bracket-select-orders, space-game-keys-select) ----
const CAMP_SELPILOT = 'pilot:';
const CAMP_SELALL = 'all'; // WHO: the three pilots at once, the first stop of Q and W and the default (nothing picked is All pilots)
function campSelPilotName(u, squad) { const p = (CAMP.pilots || []).find(q => q.squad === squad); return typeof campPilotName === 'function' && u && u.pilot ? campPilotName(u) : p ? p.name : squad.charAt(0).toUpperCase() + squad.slice(1) + ' squad'; } // the name three-pilots gave it (Wedge, Kara, Apollo), until then its squad's colour
function campSelAllUnits(C) { return C && C.carrier ? (CAMP.wing.squads || []).reduce((a, sq) => a.concat(campWingShips(C, sq)), []) : []; } // the pilots' ships that are out
function campSelAllName() { return typeof uiText === 'function' ? uiText('camp.sel.all') : 'All pilots'; }
function campSelList(C) { // the stops of Q and W: All pilots, then the pilots an order can reach: out, or in the bay (it launches them: card space-game-keys-orders) or being mended (red, green, yellow); [{ id, kind: 'all'|'pilot', squad, unit (a pilot's ship; null for all, and for a pilot in the bay), units (all: the ships out), name }]
  if (!C || !C.carrier) return [];
  const pilots = (CAMP.wing.squads || []).map(sq => {
    const ships = campWingShips(C, sq); if (!ships.length && !campWingDocked(C, sq).length) return null; // lost, with nothing in the bay to take its place: not a stop
    return { id: CAMP_SELPILOT + sq, kind: 'pilot', squad: sq, unit: ships[0] || null, units: ships.length ? [ships[0]] : [], name: campSelPilotName(ships[0] || null, sq) };
  }).filter(Boolean);
  return [{ id: CAMP_SELALL, kind: 'all', squad: '', unit: null, units: campSelAllUnits(C), name: campSelAllName() }].concat(pilots);
}
function campSelAll(C) { if (C && C.carrier) { C.sel = CAMP_SELALL; campMarkTouch(C, true, false); } return C ? C.sel : ''; } // Q (until the Q list returns): WHO is all three pilots
function campSelNow(C) { // WHO now: never null with a cruiser; '' (nothing picked), or a pilot who was lost or is home, is All pilots
  if (!C || !C.carrier) return null;
  const list = campSelList(C), e = list.find(x => x.id === C.sel);
  if (!e) { C.sel = CAMP_SELALL; return list[0]; }
  return e;
}
function campSelStep(C, dir) { // D (1) and A (-1): the next or the last who, round at the ends (All pilots, Wedge, Kara, Apollo, All pilots...)
  const list = campSelList(C); if (!list.length) { if (C) C.sel = CAMP_SELALL; return null; }
  const at = Math.max(0, list.findIndex(e => e.id === C.sel)), d = dir < 0 ? -1 : 1, i = (at + d + list.length) % list.length;
  C.sel = list[i].id; campMarkTouch(C, true, false); return list[i];
}
function campSelClear(C) { const had = !!(C && C.sel && C.sel !== CAMP_SELALL); if (C) C.sel = CAMP_SELALL; return had; } // WHO back to All pilots
function campFriList(C) { // the stops of O and P: the SHIPS you protect (the transport, a miner, a hauler), nearest the cruiser first (no outpost or planet: a click on the Tab map holds one, campFriHold): [{ id, kind: 'ward', unit (the ship), name, x, y, r }]
  if (!C || !C.carrier || typeof campPickGuardees !== 'function') return [];
  return campPickGuardees(C).filter(i => i.what !== 'post').map(i => ({ id: i.id, kind: 'ward', unit: C.by[i.id] || null, name: i.name, x: i.x, y: i.y, r: i.r })).filter(e => e.unit && e.unit.hp > 0);
}
function campFriPlace(C, id) { // an outpost or a planet (a place of the level, id 'place:...') as the friendly: { id, kind: 'post', unit: null, name, x, y, r }, or null (no such place, or it is hidden)
  const m = /^place:(.+)$/.exec(String(id || '')); if (!m || !C || !C.carrier || typeof campPlaces !== 'function') return null;
  const p = campPlaces(C.level)[m[1]]; if (!p || p.hidden) return null;
  return { id: 'place:' + m[1], kind: 'post', unit: null, name: String(p.name), x: p.x, y: p.y, r: p.r || 60 };
}
function campFriHold(C, id) { // a click on an outpost or a planet on the Tab map (src/campmapdraw.js): that place is THE target held now (the enemy is let go); the entry, or null when it is no place
  const e = campFriPlace(C, id); if (!e) return null;
  C.fsel = e.id; C.tgt = ''; campMarkTouch(C, false, true); return e;
}
function campFriNow(C) { // the friendly now: a ship of the list, or the place a map click holds; null when there is none (a ship that was lost is let go the next time anyone asks)
  if (!C || !C.fsel) return null;
  const e = campFriList(C).find(x => x.id === C.fsel) || campFriPlace(C, C.fsel);
  if (!e) { C.fsel = ''; return null; }
  return e;
}
function campFriStep(C, dir) { // P (1) and O (-1): the friendly after or before, round at the ends; with none, P takes the first and O the last. One target: the enemy is let go
  const list = campFriList(C); if (!list.length) return null; // no ship to protect: a place held by a map click stays held (campFriNow lets go of a ship that is lost)
  const at = list.findIndex(e => e.id === C.fsel), d = dir < 0 ? -1 : 1, i = at < 0 ? (d > 0 ? 0 : list.length - 1) : (at + d + list.length) % list.length;
  C.fsel = list[i].id; C.tgt = ''; campMarkTouch(C, false, true); return list[i];
}
function campFriClear(C) { const had = !!(C && C.fsel); if (C) C.fsel = ''; return had; }
function campPicksClear(C) { const had = !!(C && (C.tgt || C.fsel || (C.sel && C.sel !== CAMP_SELALL))); campTgtClear(C); campFriClear(C); campSelClear(C); return had; } // X: no enemy, no friendly, WHO is All pilots again
function campHeldRow(C) { // the nav row of the ONE target held (the row Fly to the target flies to): the enemy's, the place's, a ship's; null for none
  const h = campHeldNow(C); if (!h) return null;
  if (h.kind === 'hostile') return campTgtRow(C);
  const rows = campNavRows(C); return rows.find(r => r.id === h.id || r.id === 'convoy:' + h.id || r.ref === h.id) || null;
}
function campHeldNow(C) { // the ONE target held now: the enemy (C.tgt) or the friendly (C.fsel); null when there is none. A dead enemy or a lost friendly is let go by the readers it calls
  const h = campTgtNow(C); if (h) return { kind: 'hostile', id: h.id, name: campNavUnitName(h), unit: h, post: null };
  const f = campFriNow(C); return f ? { kind: 'friendly', id: f.id, name: f.name, unit: f.unit || null, post: f.kind === 'post' ? f : null } : null;
}
function campSelUnits(C) { // the ships picked now: hostile (the enemy), friendly (a ship you protect, null for an outpost: friendlyPost is it), who (the one pilot's ship; null for All pilots), whoShips (the ships WHO is: the three for All pilots)
  const w = campSelNow(C), f = campFriNow(C);
  return { hostile: campTgtNow(C), friendly: f ? f.unit : null, friendlyPost: f && f.kind === 'post' ? f : null, who: w && w.kind === 'pilot' ? w.unit : null, whoShips: w ? w.units : [] };
}
const CAMP_MARKS = new WeakMap(); // C -> { who, held (the time each square was brought back), whoKey, heldKey, n (what was seen last) }: a new C (the next mission) starts with the squares shown
const campMarkClock = C => +(C && C.t) || 0; // (a scene stand-in in a test may have no clock: 0)
function campMarkState(C) { let m = CAMP_MARKS.get(C); if (!m) { m = { who: campMarkClock(C), held: campMarkClock(C), whoKey: String(C.sel || ''), heldKey: String(C.tgt || '') + '|' + String(C.fsel || ''), n: campMarkOrders(C) }; CAMP_MARKS.set(C, m); } return m; }
function campMarkOrders(C) { return C && C.orders ? CAMP.mark.verbs.reduce((n, k) => n + (C.orders[k] | 0), 0) : 0; } // the pilots' orders carried out so far (launch, attack, escort, guard, recall, mine: each is counted once in C.orders when it is carried out, from a key, the strip, the voice or the map)
function campMarkTouch(C, who, held) { if (!C || typeof C !== 'object') return; const m = campMarkState(C), t = campMarkClock(C); if (who) m.who = t; if (held) m.held = t; } // a pick was made (the pick functions call it, so picking what is picked already brings the square back too)
function campMarkNow(C) { // the strength of the squares now: what changed since the last look brings its square back (a pick by a path that is not a pick function, an order from anywhere), then the age decides
  const K = CAMP.mark, m = campMarkState(C), t = campMarkClock(C), wk = String(C.sel || ''), hk = String(C.tgt || '') + '|' + String(C.fsel || ''), n = campMarkOrders(C);
  if (m.who > t || m.held > t) { m.who = Math.min(m.who, t); m.held = Math.min(m.held, t); } // a clock that went back
  if (wk !== m.whoKey) { m.whoKey = wk; m.who = t; }
  if (hk !== m.heldKey) { m.heldKey = hk; m.held = t; }
  if (n !== m.n) { m.n = n; m.who = m.held = t; }
  const k = at => { const age = t - at; return age < K.show ? 1 : age < K.show + K.fade ? 1 - (age - K.show) / K.fade : 0; };
  return { who: k(m.who), held: k(m.held) };
}
// the pick a row of the W list acts on (card space-game-w-uses-selection): kind 'hostile' is the enemy [ ] \ picked, 'friend' the friendly O P picked; { id, name, unit } (unit: a ship, or the outpost's place) or { code: 'nohostile' | 'nofriend' } (the refusal) when there is none
function campSelRowFor(C, kind) {
  if (kind === 'hostile') { const u = campTgtNow(C); return u ? { id: u.id, name: campNavUnitName(u), unit: u } : { code: 'nohostile' }; }
  const f = campFriNow(C); return f ? { id: f.id, name: f.name, unit: f.unit || { x: f.x, y: f.y, r: f.r } } : { code: 'nofriend' };
}
const campSelWho = C => { const f = campSelNow(C); return f && f.kind === 'pilot' ? f.name : uiText('camp.w.all'); }; // who takes the order of a W row: a selected pilot alone, else all squads
function campSelOrder(C, verb, how, dry) { // 'engage' is E, the one order key (card space-game-keys2-orders): an enemy picked, attack it; a friendly picked, guard it; nothing picked, form up on the cruiser. 'attack' and 'guard' are its two halves (the target boxes' dry runs ask them); there is no recall (the pilots stay out; the Fast burn recalls them itself)
  if (!C) return campNo('what');
  if (verb === 'engage') {
    const h = campTgtNow(C), fr = h ? null : campFriNow(C), r = campSelOrder(C, h ? 'attack' : 'guard', how, dry);
    return Object.assign({}, r, { verb: h ? 'attack' : 'guard', formup: !h && !fr }); // formup: nothing was picked, the pilots guard the cruiser
  }
  const f = campSelNow(C), group = f && f.kind === 'pilot' ? f.squad : 'fighters';
  if (verb !== 'attack' && verb !== 'guard') return campNo('what');
  if (!campWing(C, 'fighter').length && !campWingDocked(C, group).length) return campNo(C.launchQ.length ? 'launching' : 'nofighters'); // pilots in the bay take an order by launching (card space-game-keys-orders)
  if (verb === 'attack') {
    const h = campTgtNow(C);
    if (!h && !campTgtList(C).length) { const d = campWingOrder(C, group, 'attack', null, how || 'key', true); return d.ok ? campNo('nofoe') : d; } // nothing picked and nothing in sight: the squad's own refusal if it has one, else "no hostiles in sight"
    const near = !h && !dry ? campTgtNearest(C) : null; // nothing picked: the nearest hostile is picked now, as \ would (it is THE target: the bracket, the display, Fly to the target and the missile follow it)
    return campWingOrder(C, group, 'attack', h ? h.id : near ? near.id : null, how || 'key', dry);
  }
  const fr = campFriNow(C); return campWingOrder(C, group, 'guard', fr ? fr.id : null, how || 'key', dry); // the friendly (a ship: the pilots fly in formation beside it; an outpost: they hold it); none: the cruiser
}
