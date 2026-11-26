// ---------- Dogfights: how the Campaign's fighters fly a duel (card space-game-fighter-dogfights; the numbers are CAMP.dog) ----------
// Troy (21 Nov 2026): the fighters should fight like the Vipers in Battlestar Galactica: fast turns, flip and burn, break and come round again, and the fights one on one, lasting longer.
// Who: the wing's fighters, the aliens' raiders and the pirates' skiffs (CAMP.dog.kinds; a skiff is a pirate whose base is the raider), against one another: that is a dogfight. A drone, a gunship, the mothership, an escort, a freighter, the carrier and Earth are not:
// a ship that flies at one of those is fought by the wing's fighters in strafing runs (src/campflight.js campStrafe), by the aliens with the pirates' own steering (src/enemies.js pirateSteer). The wing's orders win: the foe a fighter flies at is still the one its order names (an Attack on a named alien is that alien; with none named, or on guard, it is the ship's partner, if it has one).
//   The flight  The engine pushes along the nose: the part of a push that is backwards has CAMP.dog.retro of the accel, the part that is sideways CAMP.dog.side. So a ship must turn to where it means to burn,
//               and one that wants to stop turns its nose to where it came from and burns (the flip and burn). It keeps more of its speed than the game's ships do (CAMP.dog.drag), so it drifts and overshoots.
//   The moves   approach  (far off) burn in on the lead point.   attack  nose on the lead point, slow to the gun range, fire; held at the range, or chasing a target that runs.   break  after a pass
//               (too near) a hard turn away, off the line to the target, then round again.   flip  the target is behind: turn on the spot, brake, fire back as the nose comes round.
//               jink  the target has its nose on this ship: a hard turn aside.   Each move has a time, drawn from the battle's own seeded numbers, so a seed repeats a fight exactly.
//   The pairs   campDogPair: each fighter and raider within CAMP.dog.pair.range is matched with the nearest unmatched ship of the other side, and the pair keeps to each other until one is lost (or they are
//               pair.keep apart): a duel, not a crowd on one ship. A raider with a partner flies at it before it looks for the nearest; a fighter with no named foe flies at its partner.
//   campDogSteer(C, u, tgt, bs)  one frame of one ship: { ang: where the engine pushes, face: where the nose turns, fire: may it shoot, aim: the bearing the guns are to be on, thrust: 0 to 1, snap: turn fast }
//   campDogMove(C, u, m, dt)     the ship's own push, as that: the engine along the nose, the drag, the turn
//   campDogPair(C)               the pairing, once a tick      campDogOn(C, u, tgt)  whether this ship flies this fight as a dogfight      campDogFoe(C, u, foe)  the foe a ship that picked `foe` by "the nearest" flies at: its partner when `foe` is a
//                                dogfighter too (a drone or a gunship that is nearer is still the nearest: it is not a duel, and it is fought as it always was), else `foe`
// a dogfighter: the wing's fighter, the aliens' raider, or a pirate that flies like the raider (the skiff: CAMP.pirate.kinds[kind].base). Its role is its base kind: 'fighter' or 'raider'
const campDogRole = u => !u || u.cockpit ? null : CAMP.dog.kinds.indexOf(u.kind) >= 0 ? u.kind : (u.faction === 'pirate' && CAMP.pirate.kinds[u.kind] && CAMP.dog.kinds.indexOf(CAMP.pirate.kinds[u.kind].base) >= 0) ? CAMP.pirate.kinds[u.kind].base : null;
const campDogIs = u => campDogRole(u) !== null;
const campDogOn = (C, u, tgt) => !!(u && tgt && campDogIs(u) && campDogIs(tgt) && u.team !== tgt.team && tgt.hp > 0);
// who is at war with whom, for the ones that point their guns: the aliens and the pirates (team 'alien') against everyone else, the neutrals (patrols, miners) included
const campDogFoes = (a, b) => a.team !== b.team && (a.team === 'alien' || b.team === 'alien');

// the foe a ship that chose `foe` as the nearest flies at: its partner while it has one that is alive and not far off
function campDogFoe(C, u, foe, max) {
  if (!u.mate || !campDogIs(u) || (foe && !campDogIs(foe))) return foe; // a ship with no partner, or a nearest foe that is no dogfighter (a drone, a gunship, the carrier): it is fought as it was
  const m = C.by[u.mate];
  return m && m.hp > 0 && Math.hypot(m.x - u.x, m.y - u.y) <= (max || CAMP.dog.pair.keep) ? m : foe;
}

// the pairing: every `every` ms, a ship with no partner (or a partner that is gone or too far) takes the nearest ship of the other side that has none, nearest pairs first
function campDogPair(C) {
  const K = CAMP.dog.pair;
  if (C.t < (C.dogPairAt || 0)) return;
  C.dogPairAt = C.t + K.every;
  const live = C.ships.filter(u => u.hp > 0 && campDogIs(u));
  live.forEach(u => { const m = u.mate && C.by[u.mate]; if (!m || m.hp <= 0 || m.mate !== u.id || Math.hypot(m.x - u.x, m.y - u.y) > K.keep) { if (m && m.mate === u.id) m.mate = null; u.mate = null; } });
  const free = live.filter(u => !u.mate), ours = free.filter(u => u.team === 'earth'), theirs = free.filter(u => u.team === 'alien'), pairs = [];
  ours.forEach(a => theirs.forEach(b => { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d <= K.range) pairs.push([d, a, b]); }));
  pairs.sort((p, q) => p[0] - q[0] || (p[1].id < q[1].id ? -1 : 1) || (p[2].id < q[2].id ? -1 : 1));
  pairs.forEach(([, a, b]) => { if (!a.mate && !b.mate) { a.mate = b.id; b.mate = a.id; } });
}

// where to aim so the shot and a moving target meet: in the frame of the shot (which keeps campDrift of the shooter's own speed) the target is at p and moves at v; the shot, at speed bs, reaches it at the
// smaller positive root of |p + v t| = bs t. None, or one that is too far: aim where it is. `share` of the lead is taken (1 is all of it)
function campDogLead(u, tgt, bs, share) {
  const px = tgt.x - u.x, py = tgt.y - u.y, direct = Math.atan2(py, px);
  const vx = (tgt.vx || 0) - (u.vx || 0) * campDrift, vy = (tgt.vy || 0) - (u.vy || 0) * campDrift;
  const a = vx * vx + vy * vy - bs * bs, b = 2 * (px * vx + py * vy), c = px * px + py * py;
  let t = -1;
  if (Math.abs(a) < 1e-6) t = b < 0 ? -c / b : -1;
  else { const d = b * b - 4 * a * c; if (d >= 0) { const q = Math.sqrt(d), t1 = (-b - q) / (2 * a), t2 = (-b + q) / (2 * a), lo = Math.min(t1, t2), hi = Math.max(t1, t2); t = lo > 0 ? lo : hi; } }
  if (!(t > 0) || t > 2.5) return direct;
  const lead = Math.atan2(py + vy * t, px + vx * t);
  return direct + campWrap(lead - direct) * share;
}

// the nearest enemy that has its nose on this ship, in range of a shot: the one that is to be dodged (not only the partner: a drone's or a gunship's guns hurt as much). Towers and the mothership aim without turning: not counted
function campDogThreat(C, u) {
  const J = CAMP.dog.jink; let best = null, bd = J.range;
  for (const s of C.ships) {
    if (s.hp <= 0 || !campDogFoes(u, s) || s.rot == null || s.kind === 'mother' || s.kind === 'tower' || s.kind === 'freighter' || s.kind === 'carrier') continue;
    const d = Math.hypot(u.x - s.x, u.y - s.y); if (d >= bd) continue;
    if (Math.abs(campWrap(Math.atan2(u.y - s.y, u.x - s.x) - s.rot)) < J.aspect) { best = s; bd = d; }
  }
  return best;
}
const campDogDraw = (C, a, b) => a + C.rng() * (b - a);
// one frame of one ship in a duel with tgt (a ship): what it does, as numbers; bs is the speed of its shot
function campDogSteer(C, u, tgt, bs) {
  const K = CAMP.dog, d = u.dog || (u.dog = { mode: 'approach', until: 0, side: u.side || 1, flipAt: -1e9, jinkAt: -1e9 }), t = C.t;
  const dx = tgt.x - u.x, dy = tgt.y - u.y, dist = Math.hypot(dx, dy) || 1, th = Math.atan2(dy, dx), dt = C.dt || CAMP.step;
  const tvx = tgt.vx || 0, tvy = tgt.vy || 0, off = campWrap(th - u.rot);
  const role = campDogRole(u), aim = campDogLead(u, tgt, bs, K.lead[role] == null ? 0.8 : K.lead[role]);
  if (role === 'fighter') { const Q = K.circle; d.wind = (d.wind || 0) * Math.max(0, 1 - Q.decay * dt) + (d.los == null ? 0 : campWrap(th - d.los)); d.los = th; } // the line to the target turning round and round is a circling fight: the wing's fighters do not fly one (below)
  const away = -((u.vx - tvx) * Math.cos(th) + (u.vy - tvy) * Math.sin(th)); // my speed away from the target along the line (positive: I am leaving it)
  // the moves end
  if (d.mode === 'break' && (t > d.until || dist > K.breakOff.to) && t > d.from + 450) d.mode = 'attack';
  else if (d.mode === 'flip' && (t > d.until || (Math.abs(off) < 0.25 && Math.abs(away) < 90))) d.mode = 'attack';
  else if (d.mode === 'jink' && t > d.until) d.mode = 'attack';
  else if (d.mode === 'extend' && t > d.until) { d.mode = 'attack'; d.wind = 0; }
  // the moves begin
  if (d.mode === 'approach' || d.mode === 'attack') {
    if (dist > K.far) d.mode = 'approach'; else if (d.mode === 'approach') d.mode = 'attack';
    if (d.mode === 'attack') {
      if (role === 'fighter' && u.order && u.order.type === 'attack' && Math.abs(d.wind) > K.circle.limit && t - (d.extendAt == null ? -1e9 : d.extendAt) >= K.circle.every * 1000 && !campDogThreat(C, u)) { d.mode = 'extend'; d.extendAt = t; d.until = t + campDogDraw(C, K.circle.extend[0], K.circle.extend[1]) * 1000; }
      else if (dist < K.near) { d.mode = 'break'; d.from = t; d.until = t + campDogDraw(C, K.breakOff.time[0], K.breakOff.time[1]) * 1000; d.side = C.rng() < 0.5 ? -1 : 1; }
      else if (Math.abs(off) > K.flip.off && dist < K.flip.range && t - d.flipAt >= K.flip.every * 1000) { d.mode = 'flip'; d.flipAt = t; d.until = t + campDogDraw(C, K.flip.time[0], K.flip.time[1]) * 1000; }
      else if (t - d.jinkAt >= (K.jink.every[role] == null ? 2 : K.jink.every[role]) * 1000 && C.rng() < (K.jink.rate[role] == null ? 1 : K.jink.rate[role]) * dt) { const thr = campDogThreat(C, u); if (thr) { d.mode = 'jink'; d.jinkAt = t; d.until = t + campDogDraw(C, K.jink.time[0], K.jink.time[1]) * 1000; d.side = C.rng() < 0.5 ? -1 : 1; d.from = Math.atan2(thr.y - u.y, thr.x - u.x); } }
    }
  }
  if (d.mode === 'extend') { const a = th + Math.PI; return { mode: 'extend', ang: a, face: a, fire: false, aim: th, thrust: 1, snap: true }; } // straight away from the target, the nose where it flies: the end of a turning fight, then in again
  if (d.mode === 'break') { const a = th + Math.PI - d.side * K.breakOff.angle; return { mode: 'break', ang: a, face: a, fire: false, aim: th, thrust: 1, snap: true }; }
  if (d.mode === 'jink') { const a = (d.from == null ? th : d.from) + d.side * (Math.PI / 2 + 0.25); return { mode: 'jink', ang: a, face: a, fire: false, aim: th, thrust: 1, snap: true }; }
  if (d.mode === 'flip') return { mode: 'flip', ang: aim, face: aim, fire: true, aim, thrust: 1, snap: true }; // nose to the target, and the main engine pushes against the way it was going: the brake
  if (d.mode === 'approach') return { mode: 'approach', ang: aim, face: aim, fire: dist < K.far * 0.5, aim, thrust: 1, snap: Math.abs(off) > 0.5 };
  // attack: the wish is the target's own speed plus the speed that closes on it, and the push is what gets the ship from the speed it has to that wish; the nose goes to the lead point (the guns) while the push
  // is within CAMP.dog.cone of it, else to the push itself (the ship that is sliding sideways round its target turns to kill the slide, and fires when it is round). It drives IN: the closing speed it wants falls with
  // the range down to K.pass, never to nothing, so a pass is a pass (the break, below K.near, follows); a target that runs is followed at its own speed and a little over
  const wantClose = Math.max(K.pass, Math.min(u.vmax, (dist - K.hold) * 1.6)), wx = tvx + Math.cos(th) * wantClose, wy = tvy + Math.sin(th) * wantClose, ex = wx - u.vx, ey = wy - u.vy, e = Math.hypot(ex, ey);
  const need = e > 8 ? Math.atan2(ey, ex) : aim, face = Math.abs(campWrap(need - aim)) < K.cone ? aim : need;
  return { mode: 'attack', ang: need, face, fire: true, aim, thrust: Math.min(1, e / 140), snap: Math.abs(campWrap(face - u.rot)) > 0.5 };
}

// the ship's own push: the engine along the nose (retro and side a share of it), the drag, the turn; then the step
function campDogMove(C, u, m, dt) {
  const K = CAMP.dog, fx = Math.cos(u.rot), fy = Math.sin(u.rot), ax = Math.cos(m.ang), ay = Math.sin(m.ang);
  const along = ax * fx + ay * fy, side = -ax * fy + ay * fx;
  const f = (along >= 0 ? along : along * K.retro) * m.thrust, s = side * K.side * m.thrust, a = u.accel;
  u.vx += (fx * f - fy * s) * a * dt; u.vy += (fy * f + fx * s) * a * dt;
  const keep = Math.pow(K.drag, dt); u.vx *= keep; u.vy *= keep;
  const sp = Math.hypot(u.vx, u.vy); if (sp > u.vmax) { u.vx *= u.vmax / sp; u.vy *= u.vmax / sp; }
  u.rot = campRot(u.rot, m.face, u.turn * dt * (m.snap ? K.snap : 1));
  u.x += u.vx * dt; u.y += u.vy * dt;
}
