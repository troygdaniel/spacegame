// ---------- Campaign: a hurt fighter lands to be mended (card space-game-fighter-repair; Troy 21 Nov: the fights were not interactive and the escorts were boring, he wants to direct the fleet more) ----------
// A fighter of the wing under CAMP.repair.below (30 percent) of its hull breaks off, flies home, lands on the cruiser, is mended for CAMP.repair.time (10 s) and goes out again whole, with the order it had. The mend costs
// CAMP.repair.ore (5: card space-game-repair-with-ore); with none to pay it takes CAMP.repair.slow (twice) as long, and is never refused. A cruiser
// that is too far (more than CAMP.repair.within, 15 s of flight at the fighter's own speed) and the fighter fights on. A radio line each way (the ship's voice: content/text/campaign-repair.md). The wing strip (the bay line
// in the HUD's left column) shows "REPAIR n  s". The enemy's fighters never do this: it is the wing's AI only (campWingAI calls campRepairRun first), pirates and aliens alike are the ones it is fought against.
//   campRepairRun(C, u, dt)   the wing's AI, first thing: true when this ship is on its way home to be mended (or has just landed); false when it fights on as always
//   campRepairTick(C)         every tick: a fighter whose time is up goes out again, at once, when there is a fight (an alien near the cruiser, a ship of the wing out on an order) and the player has not
//                             recalled the wing since; else it is in the bay, whole, and Launch takes it
//   campRepairing(C, kind)    how many ships are being mended (of a kind, or all): they are still the wing's (the build limit, the dock, the "no ships left" rule count them)
//   campRepairState(C)        { n, next } for the HUD: how many, and the seconds until the first is whole
// The sim is the plain numbers of src/campaign.js: C.repairs is a list of { kind, until, order, squad, stay } (until: the battle clock in ms; order: what to go out with; squad: the fighter's squad, which it goes out in again and which counts it while it is mended (src/campwing.js campSquadNext); stay: the wing was recalled while it
// was mended, so it stays aboard). A landed fighter is not a ship of C.ships any more (as a recalled one is not): nothing in the sim can hit it, find it or count it as "out".
// Rules worth knowing: the wing's own AI runs this first, so it wins over any order (an Attack given to a fighter on its way home is kept, and is what it goes out with); a Recall given to it is kept too (it
// lands, is mended and stays aboard); a fighter ABOVE 30 percent that is recalled lands as it always did (whole at once, in the bay). The escorts and the scouts do not break off; the enemy has no repair
// (the raiders' and the pirates' AI never call it); the repair field tech (CAMP.tech.repair) still mends what flies near the cruiser, on top. C.mended counts the fighters made whole, for the bots' table.

function campRepairing(C, kind) { return (C.repairs || []).filter(r => !kind || r.kind === kind).length; }

// one radio line of a kind ('off', 'back', 'done'), but not twice within sayEvery seconds: four fighters hurt in one pass are one call
function campRepairSay(C, which) {
  const S = C.repairSay || (C.repairSay = {});
  if (S[which] != null && C.t - S[which] < CAMP.repair.sayEvery * 1000) return;
  S[which] = C.t; campSay(C, 'camp.say.repair' + which);
}

function campRepairRun(C, u, dt) {
  const K = CAMP.repair, c = C.carrier;
  if (!campFlag('repair') && !u.repair) return false; // the repair is switched off (the tuning panel): a hurt fighter fights on (one already on its way home is mended)
  if (u.team !== 'earth' || u.scout || K.kinds.indexOf(u.kind) < 0 || c.hp <= 0) return false;
  if (!u.repair) {
    if (u.hp >= u.maxHp * K.below) return false;
    if (campDist(u, c) > K.within * u.vmax) return false; // too far to get home: it fights on (asked again every tick: the cruiser may come to it)
    u.repair = true; campRepairSay(C, 'off'); C.events.push({ type: 'repairoff', id: u.id, x: u.x, y: u.y });
  }
  if (campDist(u, c) < CAMP.bay.dockAt) { // landed: out of the sim as a recalled ship is, in the repair list until it is whole
    const paid = K.ore <= 0 || campMendFunds(C) >= K.ore; // a mend costs a little ORE (card space-game-repair-with-ore; in flight credits cannot pay it); with none it is never refused, it takes K.slow times as long
    if (paid && K.ore > 0) campMendPay(C, K.ore);
    (C.repairs = C.repairs || []).push({ kind: u.kind, until: C.t + K.time * 1000 * (paid ? 1 : K.slow), order: u.order || null, squad: u.squad || '', stay: !!(u.order && u.order.type === 'recall'), paid });
    u.hp = 0; u.docked = true; u.repair = false; C.events.push({ type: 'dock', id: u.id, repair: true });
    return true;
  }
  campSeek(u, c.x, c.y, dt); // (as a recall flies it)
  return true;
}

function campRepairTick(C) {
  if (!C.repairs || !C.repairs.length || C.result || C.carrier.hp <= 0) return;
  const K = CAMP.repair, c = C.carrier;
  const out = C.launchQ.length > 0 || campWing(C).some(w => !w.scout && !(w.order && w.order.type === 'recall')); // a ship of the wing out on an order: the fight goes on
  const near = campAliens(C).some(a => campDist(a, c) <= K.fight);
  C.repairs = C.repairs.filter(r => {
    if (C.t < r.until) return true;
    if (!r.stay && (out || near)) {
      if (C.t < C.nextLaunch) return true; // the bay mouth is busy this tick: the next one
      campLaunch(C, r.kind, r.order, r.squad); C.mended = (C.mended | 0) + 1; campRepairSay(C, 'back'); return false;
    }
    C.bay[r.kind + 's']++; C.mended = (C.mended | 0) + 1; campRepairSay(C, 'done'); return false;
  });
}

function campRepairState(C) {
  const rs = C.repairs || [];
  return { n: rs.length, next: rs.length ? Math.max(0, Math.ceil((Math.min(...rs.map(r => r.until)) - C.t) / 1000)) : 0 };
}
