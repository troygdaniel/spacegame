// ---------- Campaign: torpedo boats and torpedoes (card space-game-torpedo-boats; Troy, 21 Nov 2026) ----------
// Troy: the fights were not interactive and the escorts were boring; he wants to direct the fleet more. A torpedo boat is a slow hull that IGNORES the fighters and runs at the convoy, the transport,
// the miners or the cruiser, and fires a heavy torpedo at close range. It must be killed (or the torpedo shot down, or blocked) before it hits: a wave pairs boats with fighters that tie up
// the wing, so the player has too few ships for both and must choose who intercepts. The pure half (no Phaser, no page; tests/camptorpedo.mjs runs it in Node). The tables are CAMP.torpedo in src/campaign.js.
//
// THE BOAT (CAMP.torpedo.boats): `tboat` is the pirates' (faction 'pirate'), `lancer` the aliens' (faction 'alien'): the same boat with its own numbers. A wave row names them in `ships`:
//   { at | on, from, ships: { tboat: 2, skiff: 3 }, goal, say, prey, breaks, breakOn, breakAt }   (the row's fields are the pirates'; a boat of the aliens ignores breaks and breakAt)
//   prey:  'haulers' | 'miners' | 'carrier' | 'any' (the default). The boat weighs the ships in its own table (boats.<kind>.prey: a hauler, a miner, the cruiser) by distance times weight, the least wins;
//          fighters and escorts are not in it, so the boat flies past them. `goal: 'convoy:h1'` (a named hauler) wins over prey. With none of the prey left it goes for the cruiser.
//   It flies at its prey at its own slow speed, no gun. Inside tube.range it stops and ARMS for tube.windup ms (an 'arming' event and a line on the radio), then launches (a 'launch' event); tube.reload ms
//   to the next, tube.n in all. Killed while it arms, it fires nothing. With no torpedo left it breaks off and runs (a pirate boat as the pirates do: src/camppirates.js; it counts as escaped).
// THE TORPEDO (CAMP.torpedo.torp): C.torpedoes = [{ id: 'torpedo-N', kind: 'torpedo', x, y, vx, vy, rot, sp, hp, maxHp, r, target (a ship's id), from (the boat's id), fac, life (ms of fuel), dmg }], and each is in C.by
//   (a missile can lock it). Heavy and slow: it homes (torp.turn rad/s), and it hits the FIRST ship of yours or the neutrals that its path touches, so the cruiser between a boat and the transport takes it
//   (the shield first). The ship it hits takes dmg, every other one within blast takes splash of it. Earth's disc is hit as a shot is. It is shot down by:
//     the cruiser's turrets (they take a torpedo within torp.bias px of a nearer alien first: campTorpedoPick),  the missile (F: its fuze goes off near one and its blast kills it; with no mothership in reach
//     it flies at the nearest torpedo inside torp.lock of the cruiser: campMissileTarget),  and any shot of yours or the neutrals that crosses it (campTorpedoShot: the wing's stray fire, a patrol's).
//   campTorpedoes(C, dt)         the flight: homing, the hit, the blast, the fuel       campTorpedoHurt(C, t, dmg, byId)    a torpedo takes damage (dead at 0: 'shot')
//   campTorpedoNew(C)            at campNew: C.torpedoes, C.torpStat = { launched, shot, hit }, the radio's clocks
//   campTorpedoBoatAI(C, u, dt)  one boat       campTorpedoTarget(C, u)   what it goes for       campTorpedoLaunch(C, u, tgt)   one torpedo out of its tube
//   campTorpedoThreats(C)        what is coming, for the order calls (src/campcalls.js) and the bots: [{ kind: 'boat' | 'torpedo', id, target (a ship's id), eta (s until it would hit), launchIn (s
//                                until a boat launches; 0 for a torpedo), x, y, fac }], the soonest first;  campTorpedoBoats(C)  the boats alive
// Events: { type: 'torpedo', stage: 'arming' | 'launch' | 'shot' | 'hit' | 'fizzle', id, from, target, x, y } and { type: 'tboom', x, y, r } for the blast. The bonus { type: 'torpedoes', n } asks for at most n torpedoes to hit.

const campTorpedoBoats = C => C.ships.filter(u => u.boat && u.hp > 0);
const campTorpedoBoatKind = kind => (CAMP.torpedo.boats || {})[kind] || null;

function campTorpedoNew(C) {
  C.torpedoes = []; C.torpId = 0; C.torpStat = { launched: 0, shot: 0, hit: 0 }; C.torpSay = {}; // the radio says each kind of line at most so often (CAMP.torpedo.sayEvery)
}

// the radio: one line a kind, not more often than CAMP.torpedo.sayEvery[kind] ms
function campTorpSay(C, kind, key, vars) {
  const gap = CAMP.torpedo.sayEvery[kind] || 0, at = C.torpSay[kind];
  if (at != null && C.t - at < gap) return;
  C.torpSay[kind] = C.t; campSay(C, key, vars);
}
// a ship by name for a line of words: a hauler or a neutral has its own, the cruiser is "us" (a line of its own)
const campTorpName = u => u.kind === 'freighter' ? campConvoyName(u) : (u.cname || u.kind);
const campTorpKey = (u, stem) => stem + (u.kind === 'carrier' ? '.us' : '.name');

// what a boat goes for: the hauler its wave names, else the best of its prey by distance times weight (the prey the row names when it is there), else the cruiser
function campTorpedoTarget(C, u) {
  const bk = CAMP.torpedo.boats[u.kind];
  if (u.goal && u.goal.indexOf('convoy:') === 0) { const f = C.by['freighter-' + u.goal.slice(7)]; if (f && f.hp > 0) return f; }
  const all = C.ships.filter(s => s.hp > 0 && (s.team === 'earth' || s.team === 'neutral') && bk.prey[campPreyKind(s)] != null);
  const want = u.prey || 'any';
  let pool = want === 'any' ? all : all.filter(s => campPreyOf(want, campPreyKind(s)));
  if (!pool.length) pool = all;
  let best = null, bs = Infinity;
  pool.forEach(s => { const sc = campDist(u, s) * bk.prey[campPreyKind(s)]; if (sc < bs) { bs = sc; best = s; } });
  return best || (C.carrier && C.carrier.hp > 0 ? C.carrier : null);
}

function campTorpedoBoatAI(C, u, dt) {
  const bk = CAMP.torpedo.boats[u.kind], tube = bk.tube;
  if (u.running) return campPirateRun(C, u, dt);
  if (u.faction === 'pirate' && u.hp < u.maxHp * (u.breakAt != null ? u.breakAt : CAMP.pirate.breakHp)) { campPirateBreakOne(C, u, 'hurt'); return campPirateRun(C, u, dt); }
  if (u.tubes <= 0 && !u.arming) { campPirateBreakOne(C, u, 'empty'); return campPirateRun(C, u, dt); } // nothing left to fire: it goes home
  const tgt = campTorpedoTarget(C, u); u.tgt = tgt ? tgt.id : '';
  if (!tgt) return;
  const dx = tgt.x - u.x, dy = tgt.y - u.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (u.arming) { // it holds still to arm: a plain target for as long as the windup lasts
    campSeek(u, u.x, u.y, dt, ang);
    if (C.t >= u.arming) { u.arming = 0; if (dist <= tube.range * 1.3) campTorpedoLaunch(C, u, tgt); }
    return;
  }
  if (dist > tube.range * 0.85) campMove(u, ang, ang, dt); else campSeek(u, u.x, u.y, dt, ang); // fly at it; inside the range it slows and keeps its nose on it
  if (u.tubes > 0 && C.t >= u.tubeAt && dist <= tube.range && Math.abs(campWrap(ang - u.rot)) < tube.aim) {
    u.arming = C.t + tube.windup;
    C.events.push({ type: 'torpedo', stage: 'arming', id: u.id, from: u.id, target: tgt.id, x: u.x, y: u.y });
    campTorpSay(C, 'arming', campTorpKey(tgt, 'camp.say.torp.arm'), { name: campTorpName(tgt) });
  }
}

function campTorpedoLaunch(C, u, tgt) {
  const T = CAMP.torpedo.torp, bk = CAMP.torpedo.boats[u.kind], rot = u.rot, id = 'torpedo-' + (++C.torpId);
  const t = { id, kind: 'torpedo', x: u.x + Math.cos(rot) * (u.r + 4), y: u.y + Math.sin(rot) * (u.r + 4), rot, sp: T.launch, vx: 0, vy: 0, hp: T.hp, maxHp: T.hp, r: T.r, target: tgt.id, from: u.id, fac: u.faction, life: T.life, dmg: T.dmg * C.dmgS };
  t.vx = Math.cos(rot) * t.sp; t.vy = Math.sin(rot) * t.sp;
  C.torpedoes.push(t); C.by[id] = t; C.torpStat.launched++;
  u.tubes--; u.tubeAt = C.t + bk.tube.reload;
  C.events.push({ type: 'torpedo', stage: 'launch', id, from: u.id, target: tgt.id, x: t.x, y: t.y });
  campTorpSay(C, 'launch', campTorpKey(tgt, 'camp.say.torp.fire'), { name: campTorpName(tgt) });
  return t;
}

// a torpedo that has no target (its own is gone) takes the nearest ship of the kinds the boats go for, inside torp.lock of it
function campTorpedoRetarget(C, t) {
  const T = CAMP.torpedo.torp, boat = C.by[t.from], bk = boat && CAMP.torpedo.boats[boat.kind] || CAMP.torpedo.boats.tboat;
  return campNearest(C.ships.filter(s => s.hp > 0 && (s.team === 'earth' || s.team === 'neutral') && bk.prey[campPreyKind(s)] != null), t, T.lock);
}

function campTorpedoes(C, dt) {
  const T = CAMP.torpedo.torp;
  C.torpedoes.forEach(t => {
    if (t.dead) return;
    t.life -= dt * 1000;
    if (t.life <= 0) { campTorpedoEnd(C, t, 'fizzle'); return; }
    let tg = C.by[t.target]; if (!tg || tg.hp <= 0 || !tg.team || tg.team === 'alien') { tg = campTorpedoRetarget(C, t); t.target = tg ? tg.id : ''; }
    if (tg) t.rot = campRot(t.rot, Math.atan2(tg.y - t.y, tg.x - t.x), T.turn * dt);
    t.sp = Math.min(T.speed * C.shot, t.sp + T.accel * dt); t.vx = Math.cos(t.rot) * t.sp; t.vy = Math.sin(t.rot) * t.sp;
    const px = t.x, py = t.y; t.x += t.vx * dt; t.y += t.vy * dt;
    let hit = null, hd = Infinity; // the first ship of yours or the neutrals along the step: the nearest to where it was
    C.ships.forEach(u => { if (u.hp > 0 && (u.team === 'earth' || u.team === 'neutral') && campSegHit(px, py, t.x, t.y, u.x, u.y, u.r + T.fuze)) { const d = Math.hypot(u.x - px, u.y - py); if (d < hd) { hd = d; hit = u; } } });
    if (hit) return campTorpedoBoom(C, t, hit);
    if (C.earth && campSegHit(px, py, t.x, t.y, C.earth.x, C.earth.y, C.earth.r)) return campTorpedoBoom(C, t, null); // Earth's disc is hit as a shot is
  });
  C.torpedoes = C.torpedoes.filter(t => t.dead ? (delete C.by[t.id], false) : true);
}

// out of fuel: it goes out with no bang
function campTorpedoEnd(C, t, stage) {
  t.dead = true; C.events.push({ type: 'torpedo', stage, id: t.id, from: t.from, target: t.target, x: t.x, y: t.y });
}

// the bang: the ship it hit takes dmg, every other ship of yours or the neutrals within blast takes splash of it; hit is null on Earth's disc
function campTorpedoBoom(C, t, hit) {
  const T = CAMP.torpedo.torp;
  t.dead = true; C.torpStat.hit++;
  C.events.push({ type: 'torpedo', stage: 'hit', id: t.id, from: t.from, target: hit ? hit.id : '', x: t.x, y: t.y });
  C.events.push({ type: 'tboom', x: t.x, y: t.y, r: T.blast });
  if (hit) {
    campHurt(C, hit, t.dmg);
    C.ships.forEach(u => { if (u !== hit && u.hp > 0 && (u.team === 'earth' || u.team === 'neutral') && campDist(u, t) <= T.blast + u.r) campHurt(C, u, t.dmg * T.splash); });
    if (hit.kind === 'carrier' || hit.kind === 'freighter' || hit.team === 'neutral') campTorpSay(C, 'hit', campTorpKey(hit, 'camp.say.torp.hit'), { name: campTorpName(hit) });
  } else if (C.earth) {
    if (!C.god) C.earth.shield -= t.dmg * CAMP.alien.earthDamage; C.earth.hitAt = C.t; C.events.push({ type: 'earthhit', x: t.x, y: t.y });
    if (C.earth.shield <= 0) { C.earth.shield = 0; campEnd(C, 'lost', C.earth.loseWhy === 'base' ? 'base' : 'earth'); }
  }
}

// a torpedo takes damage (a turret shot, a missile, a stray shot of the wing); at zero it is shot down
function campTorpedoHurt(C, t, dmg, byId) {
  if (t.dead || t.hp <= 0) return;
  t.hp -= dmg; C.events.push({ type: 'hit', x: t.x, y: t.y, id: t.id, hull: false });
  if (t.hp > 0) return;
  t.hp = 0; t.dead = true; t.by = byId || ''; C.torpStat.shot++;
  C.events.push({ type: 'torpedo', stage: 'shot', id: t.id, from: t.from, target: t.target, x: t.x, y: t.y });
  C.events.push({ type: 'boom', x: t.x, y: t.y, big: false, id: t.id, kind: 'torpedo' });
  campTorpSay(C, 'down', 'camp.say.torp.down');
}

// the cruiser's turrets: the torpedo this turret should shoot at, if one is inside its reach: { t, d } (d: px to its edge); campTurrets takes it over a nearer alien within torp.bias
function campTorpedoPick(C, from, reach) {
  let best = null, bd = reach;
  (C.torpedoes || []).forEach(t => { if (t.dead) return; const d = campDist(t, from) - t.r; if (d <= bd) { bd = d; best = t; } });
  return best ? { t: best, d: bd } : null;
}
// a shot of yours (or a neutral's) that crosses a torpedo hurts it; a beam hurts each torpedo once. Called by campBullets for a bullet that has not hit a ship; true when the bullet is spent
function campTorpedoShot(C, b, px, py) {
  for (const t of C.torpedoes) {
    if (t.dead || !campSegHit(px, py, b.x, b.y, t.x, t.y, t.r + 2)) continue;
    if (b.beam) { b.hit = b.hit || {}; if (b.hit[t.id]) continue; b.hit[t.id] = true; }
    campTorpedoHurt(C, t, b.dmg, b.from);
    if (!b.beam) { b.dead = true; return true; }
  }
  return false;
}
// the missile's fuze: a torpedo this step of the missile (from px, py to m) comes within the fuze; null when none
function campTorpedoFuze(C, px, py, m) {
  const k = CAMP.missile;
  return (C.torpedoes || []).find(t => !t.dead && campSegHit(px, py, m.x, m.y, t.x, t.y, t.r + k.fuze)) || null;
}
// the missile's blast: every torpedo within radius of where it went off is hurt
function campTorpedoBlast(C, m, radius, dmg) {
  (C.torpedoes || []).forEach(t => { if (!t.dead && campDist(t, m) <= radius + t.r) campTorpedoHurt(C, t, dmg, C.carrier.id); });
}
// the torpedo F should fly at when there is no mothership: the nearest inside torp.lock of the carrier (null when none)
function campTorpedoLock(C, p) {
  return campNearest((C.torpedoes || []).filter(t => !t.dead), p, CAMP.torpedo.torp.lock);
}

// what is coming, soonest first (the order calls and the bots read it): a boat that has a torpedo left is a threat from the moment it is out; a torpedo in flight is one until it is gone
function campTorpedoThreats(C) {
  const T = CAMP.torpedo.torp, out = [];
  campTorpedoBoats(C).forEach(u => {
    if (u.running || (u.tubes <= 0 && !u.arming)) return;
    const tg = C.by[u.tgt]; if (!tg || tg.hp <= 0) return;
    const tube = CAMP.torpedo.boats[u.kind].tube, dist = campDist(u, tg), launchIn = u.arming ? Math.max(0, (u.arming - C.t) / 1000) : Math.max(0, (dist - tube.range) / Math.max(1, u.vmax)) + Math.max(0, (u.tubeAt - C.t) / 1000) + tube.windup / 1000;
    out.push({ kind: 'boat', id: u.id, target: tg.id, eta: launchIn + Math.min(dist, tube.range) / T.speed, launchIn, x: u.x, y: u.y, fac: u.faction });
  });
  (C.torpedoes || []).forEach(t => { if (t.dead) return; const tg = C.by[t.target]; out.push({ kind: 'torpedo', id: t.id, target: tg && tg.hp > 0 ? tg.id : '', eta: tg && tg.hp > 0 ? campDist(t, tg) / Math.max(1, t.sp) : Infinity, launchIn: 0, x: t.x, y: t.y, fac: t.fac }); });
  return out.sort((a, b) => a.eta - b.eta || (a.id < b.id ? -1 : 1));
}
