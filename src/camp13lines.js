// ---------- Campaign: two radio lines of mission 1.3, Haulers home (card space-game-13-radio-lines; Troy said yes to both) ----------
// Pure rule, no Phaser. It changes nothing but what the player is told. Both are KEPT lines (CAMP.sayhold.keep, src/campsayhold.js): each stays up 5 s and the radio lines that come in then wait.
//   1. THE TURRETS, once. CAMP.l13.turretsWait s after the first raid of 1.3 comes (the first wave row: pirates on the lead hauler) the radio says to hold the turrets key, and the key's name is the key table's
//      ({keyfire}, src/data_controls.js): a player who has only flown and mined may never have held it, and the first raid is the first fight the turrets must win.
//   2. THE LAST HAULER, again and again while it lasts (the pattern of src/campstray.js). In a mission that delivers a convoy, when the last ship of it (the least of the road flown, C.lane) is further than CAMP.l13.gapFar px
//      behind the next one ahead of her, the radio says so (camp.say.l13.behind: her name and how far), first after CAMP.l13.gapGrace s of it and again every CAMP.l13.gapAgain s while it lasts. With one ship left there is no convoy to fall behind.
//   camp13Gap(C)    { u: the last ship, d: px to the one ahead of her } when she is too far behind, else null
//   camp13Tick(C)   once a tick (from campTick, src/campaign.js): says the line that is due. State: C.l13 = { turrets, since, said } (ms of C.t)
function camp13Gap(C) {
  if (!C || C.result || !C.L || !(C.L.objectives || []).some(o => o.type === 'deliver')) return null;
  const cs = campConvoys(C).filter(u => u.cid != null); if (cs.length < 2) return null;
  const share = u => C.lane[u.cid] || 0, order = cs.slice().sort((a, b) => share(a) - share(b)); // the last first
  const d = campDist(order[0], order[1]);
  return d > CAMP.l13.gapFar ? { u: order[0], d } : null;
}
function camp13Tick(C) {
  try {
    if (!C || C.result || C.level !== 1 || !C.L || C.L.mid !== 'haulers') return;
    const S = C.l13 || (C.l13 = { turrets: false, since: -1, said: -1 }), K = CAMP.l13, w = C.waves && C.waves[0];
    if (!S.turrets && w && w.started && campMissionClock(C) - (w.at || 0) >= K.turretsWait) { S.turrets = true; campSay(C, 'camp.say.l13.turrets'); }
    const g = camp13Gap(C); if (!g) { S.since = -1; return; }
    if (S.since < 0) S.since = C.t;
    if (C.t - S.since < K.gapGrace * 1000) return;
    if (S.said >= 0 && C.t - S.said < K.gapAgain * 1000) return;
    S.said = C.t;
    campSay(C, 'camp.say.l13.behind', { name: campConvoyName(g.u), km: campNavKm(g.d) });
  } catch (e) { /* a warning is a nicety */ }
}
