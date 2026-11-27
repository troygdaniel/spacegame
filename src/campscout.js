// ---------- 3.1's fighter is the scout (card space-game-fighter-job-31; BRIEF 8 proposal C, decision 1: "a fighter reveals the next ring's defenders 10 s before the cruiser arrives"; ORCH's reading, 26 Nov 2026: the word is REVEAL, information, a scout's prize,
// not a wave called early) ----------
// A scan objective may carry scout (seconds): while a fighter of yours (a pilot's, or the one he flies: kind 'fighter', not docked) is within the ring's radius plus that many seconds of its top speed of a ring that has not begun, the wave that ring will
// call (the row's wave with on { scanning: k }) is REVEALED: how many and of what, and where it will come from. Nothing starts: the scan, the wave and every rule are as they were; the HUD's hostiles panel and the Tab map show what is revealed, dimmed, until the
// wave is real (the ring begins, and the real hostiles show as always). A mission with no scout on its objective reveals nothing.
//   campScoutReveals(C)   [{ k, n, kinds: { raider: 2 }, x, y, ring: { x, y, r } }] (x, y: where the wave comes from; k: the ring), nearest the cruiser first; [] when there is nothing to show
//   campScoutSpeed(u)     a fighter's top speed in px/s: the flown fighter's (CAMP.cockpit.speed), else the unit's own
const campScoutSpeed = u => u && u.cockpit && typeof CAMP === 'object' && CAMP.cockpit && CAMP.cockpit.speed > 0 ? CAMP.cockpit.speed : (u && u.vmax > 0 ? u.vmax : 0);
function campScoutReveals(C) {
  const L = C && C.L, so = L && L.objectives ? L.objectives.find(o => o.type === 'scan' && o.scout > 0) : null;
  if (!so || !C.scan || !C.carrier || C.result) return [];
  const scouts = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked && !u.gone); if (!scouts.length) return [];
  const out = [];
  C.scan.forEach((p, k) => {
    if (p.began || p.got) return;
    const w = (L.waves || []).find(x => x.on && x.on.scanning === k); if (!w || !w.from) return;
    if (!scouts.some(u => Math.hypot(u.x - p.x, u.y - p.y) <= p.r + so.scout * campScoutSpeed(u))) return;
    const kinds = {}; let n = 0; Object.keys(w.ships || {}).forEach(kind => { const c = (w.ships[kind] | 0); if (c > 0) { kinds[kind] = c; n += c; } });
    if (n > 0) out.push({ k, n, kinds, x: w.from[0], y: w.from[1], ring: { x: p.x, y: p.y, r: p.r } });
  });
  const c = C.carrier; return out.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y) || a.k - b.k);
}
