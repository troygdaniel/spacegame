// ---------- Campaign: the price of answering the miner's call in mission 1.1 (card l1-miner-choice; Troy, 24 Nov 2026: "what does the player decide, and what does it cost?") ----------
// Pure rule, no Phaser. The call is one plain radio line (the wave row's `say`, src/campbeats.js) and the player answers with the ordinary keys: nobody goes, one pilot goes, or all go.
// This file says the price, once: when pilots have left the cruiser for the miner while his pirates live, the radio says who is away (camp.say.miner.short: one or two pilots; camp.say.miner.all: all three).
// What makes the price real is mission data: the wave of the 1.1 row that goes for the transport just after the call (src/campaign.js), and its `perAway`: the scheduler asks campMinerAway how many pilots are away when that wave spawns and sends half a torpedo boat more for each (rounded), so more pilots away means more risk to the transport (card space-game-11-miner-real-price, 26 Nov 2026). Beyond that this file only changes what the player is told.
//   CAMPMINER                 the numbers
//   campMinerAway(C)          the pilots that are away at the miner now: [] when the call is not live (not begun, the miner lost or saved)
//   campMinerTick(C)          once a tick (from campBeats): the price line, CAMPMINER.wait s after the first pilot is seen away, counted then; and the pilots SENT, every pilot seen away at the miner while the call is live. State: C.beats.away = { since, said }, C.beats.sent = { <pilot id>: true }
//   campMinerSent(C)          how many pilots were sent (card space-game-b7-level1, brief 7 decision 4): the pilots seen away at the miner at any time while the call was live, flown by the player or not, and at least the ones away now. The price wave counts these when it spawns, not who happens to be away at that instant: a fighter the player flies at boost is at the miner in about 4 s, kills his two pirates in less than the ten seconds the price wave waits, and was back before the boats, so the rescue was free
const CAMPMINER = { gone: 1200, near: 1300, wait: 1.5 }; // px: a pilot this far from the cruiser and within `near` px of the miner is away at the miner (half the 2,600 px he works off the road: a pilot chasing something near the transport is not); s: the line waits this long, so that three pilots sent together are counted together
function campMinerAway(C) {
  if (!C || C.result || !C.L || !C.waves || !C.carrier) return [];
  const w = C.L.waves.findIndex(x => x.beat === 'distress'); if (w < 0 || !C.waves[w] || !C.waves[w].started) return [];
  const m = C.ships.find(u => u.team === 'neutral' && u.hp > 0 && u.tid === C.L.waves[w].victim); if (!m) return [];
  if (!C.ships.some(u => u.team === 'alien' && u.hp > 0 && u.wave === w)) return []; // his pirates are dead: the call is over
  return campWing(C).filter(u => u.pilot && campDist(u, C.carrier) > CAMPMINER.gone && campDist(u, m) < CAMPMINER.near);
}
function campMinerSent(C) {
  const B = C && C.beats, n = B && B.sent ? Object.keys(B.sent).length : 0;
  return Math.max(n, campMinerAway(C).length);
}
function campMinerTick(C) {
  try {
    const B = C && C.beats; if (!B) return;
    const out = campMinerAway(C);
    if (out.length) { const S = B.sent || (B.sent = {}); out.forEach(u => { if (u.pilot) S[u.pilot] = true; }); } // sent, once and for all: a pilot who has been away at the miner while the call was live counts, flown or not
    if (B.away && B.away.said) return;
    if (!out.length) return;
    const A = B.away || (B.away = { since: C.t, said: false });
    if (C.t - A.since < CAMPMINER.wait * 1000) return;
    A.said = true;
    const all = out.length >= campWing(C).filter(u => u.pilot).length + (C.launchQ || []).length, names = out.map(u => ((CAMP.pilots || []).find(p => p.id === u.pilot) || {}).name || u.pilot);
    campSay(C, all ? 'camp.say.miner.all' : 'camp.say.miner.short', { name: names.join(' and ') });
  } catch (e) { /* a line on the radio is a nicety */ }
}
