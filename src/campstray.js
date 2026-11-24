// ---------- Campaign: the cruiser left behind by the ship she escorts is told so (found by flying mission 1.1: the transport left, the cruiser sat at Luna, and the only sign was a small label at the screen's edge) ----------
// Pure rule, no Phaser. In a mission whose goal is to deliver a convoy, while the nearest ship of it is further than CAMPSTRAY.far px from the cruiser and the autopilot is not already flying to a convoy ship,
// the radio says so (camp.say.stray: how far, and the row that flies there), first after CAMPSTRAY.grace s of it and again every CAMPSTRAY.again s while it lasts. It changes nothing but what the player is told.
//   CAMPSTRAY                the numbers
//   campStrayFar(C)          px from the cruiser to the nearest convoy ship when that is too far (and no trip to a convoy ship is on), else 0
//   campStrayTick(C)         once a tick (from campNavTick, src/campnav.js): says the line when it is due. State: C.stray = { since, said } (ms of C.t)
const CAMPSTRAY = { far: 1500, grace: 4, again: 25 }; // px (150 km on the HUD: three times the turrets' reach), s, s
function campStrayFar(C) {
  if (!C || C.result || !C.L || !(C.L.objectives || []).some(o => o.type === 'deliver')) return 0;
  const cs = campConvoys(C); if (!cs.length || !C.carrier || C.carrier.hp <= 0) return 0;
  if (C.nav && C.nav.on && C.nav.kind === 'convoy') return 0; // on her way to them already
  const d = Math.min.apply(null, cs.map(u => campDist(u, C.carrier)));
  return d > CAMPSTRAY.far ? d : 0;
}
function campStrayTick(C) {
  try {
    const d = campStrayFar(C); if (!d) { if (C && C.stray) C.stray = null; return; }
    const S = C.stray || (C.stray = { since: C.t, said: -1 });
    if (C.t - S.since < CAMPSTRAY.grace * 1000) return;
    if (S.said >= 0 && C.t - S.said < CAMPSTRAY.again * 1000) return;
    S.said = C.t;
    const u = campConvoys(C).slice().sort((a, b) => campDist(a, C.carrier) - campDist(b, C.carrier))[0];
    campSay(C, 'camp.say.stray', { name: campConvoyName(u), km: campNavKm(d) });
  } catch (e) { /* a warning is a nicety */ }
}
