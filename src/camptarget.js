// ---------- Campaign: the one target (card space-game-two-hands-keys; Troy, 21 Nov 2026) ----------
// ONE target for everything. A, D and S pick it (hostiles, nearest the cruiser first), X lets it go; then 2 sends the fighters at it, 8 flies the cruiser to it and Enter fires a missile at it.
// The target is a ship of the aliens' or the pirates' side: C.tgt is its id ('' for none). The sim keeps it as plain data (no Phaser, seeded, nothing random): tests/camptarget.mjs runs it in Node;
// src/campanelsdraw.js says its name in the FLEET panel and src/campaignscene.js draws the bracket round it on the screen. A target that is destroyed is let go the next time anyone asks.
//   campTgtList(C)              the hostiles, nearest the carrier first (ties by id): every alien ship that is alive, the mothership and the towers too
//   campTgtNow(C)               the ship that is the target now, or null (a dead one is let go: C.tgt is cleared)
//   campTgtStep(C, dir)         D (1) and A (-1): the ship after or before the target in the list, round at the ends; with none, D takes the nearest and A the farthest. Returns the ship, or null when there is no hostile
//   campTgtNearest(C)           S: the nearest hostile, whatever the target was
//   campTgtClear(C)             X: no target
//   campTgtName(C)              'Raider 3', or '' for none
//   campTgtInfo(C)             { name, km, hp } for the panel and the bracket, or null
//   campTgtRow(C)               the row of the map's list (src/campnav.js campNavRows) that is the target, for the autopilot, or null
//   campTgtAttack(C, how, dry)  key 2 with a target: the fighters attack that ship (campWingOrder); the answer is the order's
//   campTgtMissile(C, dry)      Enter with a target: a missile at that ship, if it is inside CAMP.missile.lock; the answer is the order's
const CAMP_TGT = '@target'; // the arg of campOrder(C, 'attack' | 'missiles', CAMP_TGT): the picked target (campDo in src/campaign.js)
function campTgtList(C) {
  if (!C || !C.carrier) return [];
  return campAliens(C).slice().sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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
