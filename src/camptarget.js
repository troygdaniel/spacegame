// ---------- Campaign: the two selections (cards space-game-two-hands-keys, 21 Nov 2026; space-game-bracket-select-orders, Troy, 23 Nov 2026, like X-Wing) ----------
// TWO selections are held at once: a HOSTILE (the target) and a FRIEND. [ and ] pick the hostile (nearest the cruiser first), S the nearest, A and D the friend (your pilots, then the ships you protect), X lets both go.
// The order keys act on them (campSelOrder): E sends the pilots at the hostile, R sends them to guard the friend, T recalls; a friend that is one of the pilots takes the order alone, else all three do. Fly to the target (P), Enter and the missile follow the hostile as before.
// The target is a ship of the aliens' or the pirates' side: C.tgt is its id ('' for none). The sim keeps it as plain data (no Phaser, seeded, nothing random): tests/camptarget.mjs runs it in Node;
// src/campanelsdraw.js says its name in the FLEET panel and src/campaignscene.js draws the bracket round it on the screen. A target that is destroyed is let go the next time anyone asks.
//   campTgtList(C)              the hostiles, nearest the carrier first (ties by id): every alien ship that is alive, the mothership and the towers too
//   campTgtNow(C)               the ship that is the target now, or null (a dead one is let go: C.tgt is cleared)
//   campTgtStep(C, dir)         ] (1) and [ (-1): the ship after or before the target in the list, round at the ends; with none, D takes the nearest and A the farthest. Returns the ship, or null when there is no hostile
//   campTgtNearest(C)           S: the nearest hostile, whatever the target was
//   campTgtClear(C)             X: no target (and no friend: campSelClear)
//   campTgtName(C)              'Raider 3', or '' for none
//   campTgtInfo(C)             { name, km, hp } for the panel and the bracket, or null
//   campTgtRow(C)               the row of the map's list (src/campnav.js campNavRows) that is the target, for the autopilot, or null
//   campTgtAttack(C, how, dry)  key 2 with a target: the fighters attack that ship (campWingOrder); the answer is the order's
//   campTgtMissile(C, dry)      Enter with a target: a missile at that ship, if it is inside CAMP.missile.lock; the answer is the order's
//   C.sel                       the friend selected: 'pilot:red' | 'pilot:green' | 'pilot:yellow' for one of the pilots, else the id of a ship you protect; '' for none (src/campaign.js campNew)
//   campSelList(C)              the friends A and D step through: the pilots with a ship out (red, green, yellow), then the ships you protect, nearest the cruiser first: [{ id, kind: 'pilot'|'ward', squad, unit, name }]
//   campSelNow(C)               the friend now (an entry of that list), or null (one that was lost or is home is let go the next time anyone asks)
//   campSelStep(C, dir)         D (1) and A (-1): the friend after or before, round at the ends; with none, D takes the first and A the last
//   campSelUnits(C)             { hostile, friend }: the two ships selected now (units, or null); what the camera and the brackets read (src/campselzoom.js, src/camptargetdraw.js)
//   campSelClear(C)             X: no friend
//   campSelOrder(C, verb, how, dry)   E 'attack', R 'guard', T 'recall' (campWingOrder): the group is the selected pilot's squad, else all three; attack goes at the hostile (none picked: S picks the nearest first), guard at the friend that is a ship (none or a pilot: the cruiser)
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
  C.tgt = list[i].id; return list[i];
}
function campTgtNearest(C) {
  const list = campTgtList(C); if (!list.length) { if (C) C.tgt = ''; return null; }
  C.tgt = list[0].id; return list[0];
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

// ---- the friend, and the order keys (card space-game-bracket-select-orders) ----
const CAMP_SELPILOT = 'pilot:';
function campSelPilotName(u, squad) { return typeof campPilotName === 'function' && u && u.pilot ? campPilotName(u) : squad.charAt(0).toUpperCase() + squad.slice(1) + ' squad'; } // the name three-pilots gave it (Wedge, Kara, Apollo), until then its squad's colour
function campSelList(C) {
  if (!C || !C.carrier) return [];
  const pilots = (CAMP.wing.squads || []).map(sq => { const ships = campWingShips(C, sq); return ships.length ? { id: CAMP_SELPILOT + sq, kind: 'pilot', squad: sq, unit: ships[0], name: campSelPilotName(ships[0], sq) } : null; }).filter(Boolean);
  const wards = campPickEscorts(C).map(i => ({ id: i.id, kind: 'ward', squad: '', unit: C.by[i.id], name: i.name })).filter(e => e.unit && e.unit.hp > 0);
  return pilots.concat(wards);
}
function campSelNow(C) {
  if (!C || !C.sel) return null;
  const e = campSelList(C).find(x => x.id === C.sel);
  if (!e) { C.sel = ''; return null; }
  return e;
}
function campSelStep(C, dir) {
  const list = campSelList(C); if (!list.length) { if (C) C.sel = ''; return null; }
  const at = list.findIndex(e => e.id === C.sel), d = dir < 0 ? -1 : 1, i = at < 0 ? (d > 0 ? 0 : list.length - 1) : (at + d + list.length) % list.length;
  C.sel = list[i].id; return list[i];
}
function campSelClear(C) { const had = !!(C && C.sel); if (C) C.sel = ''; return had; }
function campSelUnits(C) { const f = campSelNow(C); return { hostile: campTgtNow(C), friend: f ? f.unit : null }; }
function campSelOrder(C, verb, how, dry) {
  if (!C) return campNo('what');
  if (!campWing(C, 'fighter').length) return campNo(C.launchQ.length ? 'launching' : 'nofighters');
  const f = campSelNow(C), group = f && f.kind === 'pilot' ? f.squad : 'fighters';
  if (verb === 'attack') {
    const h = campTgtNow(C);
    if (!h && !campTgtList(C).length) { const d = campWingOrder(C, group, 'attack', null, how || 'key', true); return d.ok ? campNo('nofoe') : d; } // nothing picked and nothing in sight: the squad's own refusal if it has one, else "no hostiles in sight"
    const near = !h && !dry ? campTgtNearest(C) : null; // nothing picked: the nearest hostile is picked now, as S would (it is THE target: the bracket, the display, Fly to the target and the missile follow it)
    return campWingOrder(C, group, 'attack', h ? h.id : near ? near.id : null, how || 'key', dry);
  }
  if (verb === 'guard') return campWingOrder(C, group, 'guard', f && f.kind === 'ward' ? f.id : null, how || 'key', dry); // a ship you protect: the pilots fly in formation beside it; none or a pilot: the cruiser
  return campWingOrder(C, group, 'recall', null, how || 'key', dry);
}
