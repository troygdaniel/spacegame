// ---------- The break: a hostile fighter with the player's fighter on its tail turns hard across his nose (card space-game-chunk6-enemy-break) ----------
// Troy (26 Nov 2026, brief 8 proposal A, docs/fly-and-fighter.html): "Today: straight at you. Break: on its tail inside 300 px, it turns hard across your nose." One behaviour, alone (the pair and the extend are later chunks, so he can fly this by itself).
// Pure rule, no Phaser; the numbers are the table CAMP.break. STEERING ONLY: no hit points, damage or speed change; a few lines in the tick each hostile ship already runs (campPirateAI, campAlienAI).
// Who: the hostile fighters (CAMP.break.kinds: skiff, cutter, raider, drone). Not a torpedo boat, a gunship, a tower or the mothership. Against whom: the fighter THE PLAYER FLIES (C.cockpit), and no other. I chose that
// over "any of the player's fighters" because the wing's fighters already have their own dogfight moves (src/campdogfight.js: break, flip, jink) and a flown fighter is the one that is excluded from them: it is flown straight at.
// On its tail: the flown fighter is within `range` px, within `cone` rad of dead astern of the hostile ship, and has its nose within `nose` rad of it (it is chasing, not passing).
// The break: for `ms` the ship heads at a right angle off the line from the chaser to it (across the chaser's nose, toward the side it is already off the nose line), turning at `turnK` times its own rate, and does not fire;
// then it steers as it did, and cannot break again for `cool` ms (so it does not jitter). State: u.tailBreak = { until, cool, h }. C.breaks counts the breaks of the battle.
// THE PAIR (card space-game-chunk7-enemy-pair, brief 8 proposal A, second behaviour; CAMP.break.pair): two hostile fighters together: when one breaks, the nearest other one (within `pair.range`, not breaking itself) comes round: for `pair.ms` it flies to a point `pair.behind` px dead astern
// of the chaser, does not fire, and when it has come within `pair.reach` of the point (or the time is up) it goes on as it was, which is at the chaser. Then `pair.cool` before it can be sent round again. State: u.flank = { until, f, cool }. C.flanks counts them.
//   campBreakSteer(C, u, m)   the ship's steering m ({ ang, face, fire, ... }), or the break's while it breaks, or the partner's while it comes round
function campBreakPartner(C, u, K) { // the nearest hostile fighter within pair.range that is free to be sent round
  let best = null, bd = K.pair.range;
  for (const s of C.ships) {
    if (s === u || s.hp <= 0 || s.team !== 'alien' || K.kinds.indexOf(s.kind) < 0) continue;
    if ((s.tailBreak && C.t < s.tailBreak.until) || (s.flank && C.t < Math.max(s.flank.until, s.flank.cool))) continue;
    const d = Math.hypot(s.x - u.x, s.y - u.y); if (d < bd) { best = s; bd = d; }
  }
  return best;
}
function campBreakSteer(C, u, m) {
  const K = CAMP.break; if (!K || !K.on || !C.cockpit || !m) return m;
  if (K.kinds.indexOf(u.kind) < 0) return m;
  const F = C.by[C.cockpit.id]; if (!F || F.hp <= 0 || F === u) return m;
  const b = u.tailBreak || (u.tailBreak = { until: 0, cool: 0, h: 0 }), t = C.t;
  if (u.flank && t < u.flank.until && K.pair) { // the partner comes round behind the chaser
    const px = F.x - Math.cos(F.rot) * K.pair.behind, py = F.y - Math.sin(F.rot) * K.pair.behind, a = Math.atan2(py - u.y, px - u.x);
    if (Math.hypot(px - u.x, py - u.y) <= K.pair.reach) u.flank.until = t; // it has come round
    else return Object.assign({}, m, { ang: a, face: a, fire: false });
  }
  if (t < b.until) { // breaking: the nose goes round hard, no shot
    u.rot = campRot(u.rot, b.h, u.turn * (C.dt || CAMP.step) * (K.turnK - 1));
    return Object.assign({}, m, { ang: b.h, face: b.h, fire: false });
  }
  if (t < b.cool) return m;
  const dx = F.x - u.x, dy = F.y - u.y, d = Math.hypot(dx, dy);
  if (d > K.range) return m;
  const astern = Math.abs(campWrap(Math.atan2(dy, dx) - (u.rot + Math.PI))), onIt = Math.abs(campWrap(Math.atan2(-dy, -dx) - F.rot));
  if (astern > K.cone || onIt > K.nose) return m;
  const line = Math.atan2(-dy, -dx), cross = Math.cos(F.rot) * (-dy) - Math.sin(F.rot) * (-dx); // the line from the chaser to this ship, and which side of the chaser's nose this ship is on
  const side = Math.abs(cross) > 1e-3 ? (cross > 0 ? 1 : -1) : (C.rng() < 0.5 ? -1 : 1);
  b.h = campWrap(line + side * K.turn); b.until = t + K.ms; b.cool = b.until + K.cool;
  C.breaks = (C.breaks | 0) + 1;
  const P = K.pair ? campBreakPartner(C, u, K) : null; // its partner, if it has one near, comes round behind the chaser
  if (P) { P.flank = { until: t + K.pair.ms, cool: t + K.pair.ms + K.pair.cool, f: F.id }; C.flanks = (C.flanks | 0) + 1; }
  return Object.assign({}, m, { ang: b.h, face: b.h, fire: false });
}
