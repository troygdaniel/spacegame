// ---------- Campaign: the rival ship (card space-game-rival-duel; Troy, 21 Nov 2026) ----------
// An enemy ship the cruiser's size, with a hull and a shield of its own, that hunts the cruiser and duels it in readable phases, so power management matters. The pure half (no Phaser, no page;
// tests/camprival.mjs runs it in Node). Every number is CAMP.rival in src/campaign.js, a kind of it is a row, so there can be several rivals (the first, and for now the only, is the pirate leader).
// THE PHASES (a cycle; each is announced on the screen and by the ship's voice, and fires a cue):
//   stalk    it circles the cruiser at `hold` px (340: on the screen and in the turrets' reach) and shoots a little. After `first` s (then `stalk` s after each ram or run) it begins to charge.
//   charge   it stops and turns its side on you; a ring grows round it for `charge` s (the event { type: 'rival', stage: 'charge', secs }); "Broadside charging. Power to shields." Then it fires the broadside:
//            six shots in a fan at where you are, 108 hit points in all. The answer is power to the shields (the cap and the mending), or moving off its line.
//   down     after it fires its shield DROPS for `down` s: every hit goes to the hull, `exposed` times over. "Its shields are down. Power to weapons." Then the shield comes back at `back` of its cap.
//   ram | run   by turns (the first is a ram). RAM: it turns on you at 1.5 times its speed but a slow turn; a hit is `dmg` and shoves both ships; a carrier that moves off its line is missed (power to engines).
//            RUN: it flees for `run.secs` and comes back (power to engines to chase it, or missiles). Below `runHp` of its hull it runs for good: gone once it is far off (the cue :gone), unless the row says leaves: false.
//   the carrier can be dead before any of it: a plain player at the default power wins (tests/camprival.mjs F).
// THE HOOK for a mission row (card space-game-l1-1-beats uses it for the pirate leader at the end of mission 1.1):
//   rivals: [{ id: 'leader', kind: 'pirateleader', at: 240 | on: { cue: 'beat4' }, from: [x, y] | ahead: 2000 (+ along: 't1'), escorts: { skiff: 2 }, leaves: false, say: 'camp.say.rival.leader' }]
//   at / on  when it comes: the seconds of the mission clock, or any condition of a wave (scanned, delivered, t, lane, cue, cleared); the same rules as a wave row.
//   from     where it comes from (an absolute point); ahead: it comes that many px in front of a convoy (along names it), as a wave's does; with neither it comes CAMP.rival.comeFrom px from the carrier.
//   escorts  pirates that come with it, as a wave's `ships` ({ skiff: 2 }); they fly as pirates do (prey: 'carrier' unless the row says). The rival itself always duels the cruiser.
//   leaves   false: it never runs for good, it fights to the death (the default is true).       say: the line the ship says when it comes (words in content/text/campaign-rival.md).
// An OBJECTIVE of the mission: { type: 'kill', what: 'rival:leader' } is met when the rival is dead or has got away (a rival that runs for good is gone, as a pirate that runs away is).
// CUES it fires (campCue, so a wave or a cue of the row can start on them: on: { cue: 'rival:leader:dead' }):
//   rival:<id>:appear   it came        rival:<id>:charge   it began to charge a broadside        rival:<id>:down    its shield dropped       rival:<id>:ram    it turned to ram
//   rival:<id>:run      it turned to run                   rival:<id>:dead     it was destroyed         rival:<id>:gone    it got away for good
//   campRivalOf(C, id)  the ship (alive) or null           campRivalDone(C, id)  true when it is dead or gone         C.rivalEnd[id]  'dead' | 'gone' once it is over
//   campRivalMake(C, u, kind)   campSpawn builds a rival's ship with this      campRivals(C, dt)   the tick: the rows whose time has come      campRivalAI(C, u, dt)   one ship, one tick
//   campRivalHurt(C, u, dmg)    campHurt: the shield takes it first; the damage left for the hull    campRivalDied(C, u)   what campKill does when it dies      campRivalState(u)   what the scene draws

const campRivalOf = (C, id) => C.ships.find(u => u.rival && u.rival.id === id && u.hp > 0) || null;
const campRivalDone = (C, id) => !!(C.rivalEnd && C.rivalEnd[id]);
const campRivalCue = (C, u, what) => campCue(C, 'rival:' + u.rival.id + ':' + what);

// campSpawn calls this for a ship of a rival kind: the hull, the size and the way of flying of the kind, a shield, and the phase it is in
function campRivalMake(C, u, kind) {
  const k = CAMP.rival.kinds[kind], d = Object.assign({}, PIRATES[k.base], { hp: k.hull, dmg: k.dmg, radar: k.color });
  Object.assign(u, { team: 'alien', faction: 'pirate', def: d, hp: k.hull * C.hpS, r: CAMP.size[kind].hit, vmax: k.move.speed, accel: k.move.accel, turn: k.move.turn, breakAt: -1 });
  u.rival = { id: '', kind, name: k.name, sh: k.shield * C.hpS, shMax: k.shield * C.hpS, ph: '', at: C.t, cycle: 0, until: k.phase.first, final: false, leaves: true, side: C.rng() < 0.5 ? -1 : 1, hitAt: -1e9 };
  return u;
}

// what the scene draws: the phase, how far into it (0 to 1, for the ring of a charge), the shield and the hull as shares
function campRivalState(C, u) {
  const R = u.rival, K = CAMP.rival.kinds[R.kind], P = K.phase, t = (C.t - R.at) / 1000;
  const len = R.ph === 'charge' ? P.charge : R.ph === 'down' ? P.down : R.ph === 'ram' ? P.ram.secs : R.ph === 'run' ? P.run.secs : R.ph === 'stalk' ? R.until : 1;
  return { id: R.id, name: R.name, phase: R.ph, t, len, frac: Math.max(0, Math.min(1, t / (len || 1))), shield: R.shMax > 0 ? R.sh / R.shMax : 0, hull: u.hp / u.maxHp, down: R.ph === 'down', final: R.final };
}

// campHurt calls this: the shield takes the hit first; with it down (the phase 'down') the hit goes to the hull, harder. Returns what is left for the hull
function campRivalHurt(C, u, dmg) {
  const R = u.rival; if (dmg <= 0) return dmg;
  if (R.ph === 'down') return dmg * CAMP.rival.kinds[R.kind].phase.exposed;
  if (R.sh > 0) { const take = Math.min(R.sh, dmg); R.sh -= take; dmg -= take; R.hitAt = C.t; }
  return dmg;
}

// every tick: the rows whose time has come bring their rival (and its escorts)
function campRivals(C, dt) {
  const rows = C.L.rivals; if (!rows || !rows.length || C.arrivedAt == null) return;
  if (!C.rivalSt) { C.rivalSt = rows.map(() => ({ started: false })); C.rivalEnd = {}; }
  const sec = campMissionClock(C);
  rows.forEach((r, i) => {
    const st = C.rivalSt[i]; if (st.started || !CAMP.rival.kinds[r.kind]) return;
    if (!(r.on ? campWaveOn(C, r.on) : sec >= (r.at || 0))) return;
    st.started = true;
    const ahead = r.ahead != null ? campAhead(C, r) : null, car = C.carrier, org = ahead ? [ahead.x, ahead.y] : (r.from || [car.x + CAMP.rival.comeFrom, car.y]);
    const goal = r.goal || 'carrier', u = campSpawn(C, r.kind, org[0], org[1]); if (!u) return;
    u.rival.id = r.id; u.rival.leaves = r.leaves !== false; u.goal = goal; u.prey = r.prey || 'carrier'; u.rot = Math.atan2(car.y - u.y, car.x - u.x); u.nextShot = C.t + 1500;
    Object.keys(r.escorts || {}).forEach(kind => { for (let n = 0; n < r.escorts[kind]; n++) { const e = campSpawn(C, kind, org[0] + campBetween(C, -260, 260), org[1] + campBetween(C, -260, 260)); if (e) { e.goal = goal; e.prey = u.prey; e.rot = u.rot; e.rivalEscort = r.id; } } });
    C.events.push({ type: 'rival', stage: 'appear', id: r.id, x: u.x, y: u.y });
    campCue(C, 'rival:' + r.id + ':appear'); const say = r.say || CAMP.rival.kinds[r.kind].say; if (say) campSay(C, say, { name: u.rival.name }); // a row's own line, else the kind's
  });
}
function campRivalDied(C, u) {
  if (!C.rivalEnd) C.rivalEnd = {}; C.rivalEnd[u.rival.id] = 'dead';
  C.events.push({ type: 'rival', stage: 'dead', id: u.rival.id, x: u.x, y: u.y });
  campRivalCue(C, u, 'dead'); campSay(C, 'camp.say.rival.dead', { name: u.rival.name });
}

// ---------- the phases ----------
function campRivalGo(C, u, name, extra) {
  const R = u.rival, K = CAMP.rival.kinds[R.kind], P = K.phase; R.ph = name; R.at = C.t; Object.assign(R, extra || {});
  const secs = name === 'charge' ? P.charge : name === 'down' ? P.down : name === 'ram' ? P.ram.secs : name === 'run' ? P.run.secs : 0;
  C.events.push({ type: 'rival', stage: name, id: R.id, secs, x: u.x, y: u.y });
  if (name === 'charge' || name === 'down' || name === 'ram' || name === 'run') { campRivalCue(C, u, name); campSay(C, 'camp.say.rival.' + name + (name === 'run' && R.final ? '.final' : '')); }
}
// a drive with the phase's own multipliers on the speed, the push and the turn: toward `ang`, the nose to `face`
function campRivalDrive(u, ang, face, dt, speed, accel, turn) {
  const a = u.accel * accel;
  u.vx += Math.cos(ang) * a * dt; u.vy += Math.sin(ang) * a * dt;
  const keep = Math.pow(0.5, dt); u.vx *= keep; u.vy *= keep;
  const top = u.vmax * speed, sp = Math.hypot(u.vx, u.vy); if (sp > top) { u.vx *= top / sp; u.vy *= top / sp; }
  u.rot = campRot(u.rot, face, u.turn * turn * dt);
  u.x += u.vx * dt; u.y += u.vy * dt;
}
function campRivalCoast(u, dt, keepPerSec) { const keep = Math.pow(keepPerSec, dt); u.vx *= keep; u.vy *= keep; u.x += u.vx * dt; u.y += u.vy * dt; }

function campRivalAI(C, u, dt) {
  const R = u.rival, K = CAMP.rival.kinds[R.kind], P = K.phase, car = C.carrier;
  if (!car || car.hp <= 0) { campRivalCoast(u, dt, 0.5); return; }
  const dx = car.x - u.x, dy = car.y - u.y, d = Math.hypot(dx, dy), brg = Math.atan2(dy, dx);
  if (!R.ph) { R.ph = 'stalk'; R.at = C.t; }
  const sec = (C.t - R.at) / 1000, hullShare = u.hp / (u.maxHp || 1);
  // a hurt rival turns for good (never in the middle of a charge or while its shield is down: that is the punishment)
  if (R.leaves && !R.final && hullShare <= P.runHp && (R.ph === 'stalk' || R.ph === 'ram' || R.ph === 'run')) campRivalGo(C, u, 'run', { final: true });
  if (R.ph === 'stalk') {
    const a = Math.atan2(u.y - car.y, u.x - car.x) + R.side * 0.45, px = car.x + Math.cos(a) * P.hold, py = car.y + Math.sin(a) * P.hold;
    campSeek(u, px, py, dt, brg);
    const G = K.gun;
    if (d < G.range && C.t > u.nextShot && Math.abs(campWrap(brg - u.rot)) < G.aim) { u.nextShot = C.t + campBetween(C, G.delay[0], G.delay[1]); campBullet(C, u, u.rot, G.speed * C.shot, G.dmg * C.dmgS, 1800, 'alien', u.r); }
    if (sec >= R.until && d < P.hold * 1.8) campRivalGo(C, u, 'charge');
  } else if (R.ph === 'charge') {
    campRivalCoast(u, dt, 0.25); // it stops and turns its side on you
    const side = campWrap(brg - u.rot) >= 0 ? 1 : -1, want = brg - side * Math.PI / 2; // the side that is nearer to you turns to you
    u.rot = campRot(u.rot, want, u.turn * 2 * dt);
    if (sec >= P.charge && Math.abs(campWrap(want - u.rot)) < 0.35) campRivalFire(C, u, brg);
  } else if (R.ph === 'down') {
    campRivalCoast(u, dt, 0.7); u.rot = campRot(u.rot, brg, u.turn * 0.4 * dt); // it drifts and is slow to turn
    if (sec >= P.down) {
      R.sh = Math.max(R.sh, R.shMax * P.back); R.cycle++;
      if (R.leaves && hullShare <= P.runHp) campRivalGo(C, u, 'run', { final: true });
      else campRivalGo(C, u, (R.cycle % 2 === 1) === !!P.ramFirst ? 'ram' : 'run');
    }
  } else if (R.ph === 'ram') {
    campRivalDrive(u, brg, brg, dt, P.ram.speed, P.ram.accel, P.ram.turn);
    if (d <= u.r + car.r + 4) { // it hit: the damage, and a shove for both ships
      campHurt(C, car, P.ram.dmg * C.dmgS, u.id);
      car.vx += Math.cos(brg) * P.ram.push; car.vy += Math.sin(brg) * P.ram.push; u.vx = -Math.cos(brg) * P.ram.push; u.vy = -Math.sin(brg) * P.ram.push;
      C.events.push({ type: 'rival', stage: 'ramhit', id: R.id, x: car.x, y: car.y });
      campRivalGo(C, u, 'stalk', { until: P.stalk });
    } else if (sec >= P.ram.secs) campRivalGo(C, u, 'stalk', { until: P.stalk });
  } else if (R.ph === 'run') {
    const away = brg + Math.PI; campRivalDrive(u, away, away, dt, P.run.speed, 1.3, 2);
    if (R.final) { if (sec >= P.run.min && d >= CAMP.pirate.gone) campRivalGone(C, u); }
    else if (sec >= P.run.secs) campRivalGo(C, u, 'stalk', { until: P.stalk });
  }
}
// the broadside: six shots in a fan at where the cruiser is now, from along its side; then its shield drops
function campRivalFire(C, u, brg) {
  const R = u.rival, K = CAMP.rival.kinds[R.kind], B = K.broadside;
  for (let i = 0; i < B.shots; i++) {
    const t = B.shots > 1 ? i / (B.shots - 1) - 0.5 : 0, ang = brg + t * 2 * B.spread, along = t * u.r * 1.6;
    campBullet(C, { x: u.x + Math.cos(u.rot) * along, y: u.y + Math.sin(u.rot) * along, vx: u.vx, vy: u.vy, id: u.id }, ang, B.speed * C.shot, B.dmg * C.dmgS, B.life, 'alien', u.r * 0.6);
  }
  C.events.push({ type: 'rival', stage: 'broadside', id: R.id, x: u.x, y: u.y, rot: brg });
  R.sh = 0; campRivalGo(C, u, 'down');
}
// out of the battle for good: not killed (no kill, no wreck); the objective of its kill counts it
function campRivalGone(C, u) {
  const R = u.rival; u.hp = 0; u.gone = true; if (!C.rivalEnd) C.rivalEnd = {}; C.rivalEnd[R.id] = 'gone';
  C.events.push({ type: 'rival', stage: 'gone', id: R.id, x: u.x, y: u.y });
  campRivalCue(C, u, 'gone'); campSay(C, 'camp.say.rival.gone', { name: R.name });
}
