// ---------- Campaign: pirates, neutral traffic and cues (card space-game-l1-pirates-traffic; Troy, 21 Nov 2026) ----------
// Level 1 is the rim run: other ships live in the world. The pure half (no Phaser, no page; tests/camppirates.mjs runs it in Node). The tables are CAMP.pirate and CAMP.traffic in src/campaign.js.
//
// PIRATES are human raiders: skiff, cutter, brute (CAMP.pirate.kinds; they fly and shoot like the raider, the drone and the gunship). They are on the hostile side, team 'alien', so the turrets, the wing, the
// kill objectives, the map marks and the wrecks treat them as foes with no change; u.faction is 'pirate' (the aliens' is 'alien') and the words never call them aliens. A wave row names them in `ships`:
//   { at | on, from, ships: { skiff: 4, cutter: 1 }, goal, say, prey, breaks, breakOn, breakAt }
//   prey:    'haulers' | 'miners' | 'carrier' | 'any' (the default): what the wave goes for. A pirate weighs everything it can attack (CAMP.pirate.prey: the distance times a weight, the least wins), so a hauler or a miner
//            is wanted over the cruiser. 'miners' is the neutral miners AND your own ships that are on a Mine order. `goal: 'convoy:h1'` (a named hauler) still wins over prey. When the prey the row names is not
//            there, the pirate takes what is.
//   breaks:  seconds after the wave came that the wave breaks off and runs;  breakOn: '<cue>' the same, on a named cue;  breakAt: the share of its hull a pirate runs at (CAMP.pirate.breakHp)
//   A runner flies away from your ships at full speed; once it is CAMP.pirate.gone px from every ship of yours it is gone: out of the battle, not killed (C.piratesEscaped++), and its wave counts as cleared.
// CUES are names a script fires: campCue(C, 'name'). A wave starts on one (on: { cue: 'name' }), a wave breaks on one (breakOn), and a mission row fires them itself from its own `cues`:
//   cues: [{ name: 'contact', on: { delivered: 2 } }]   on: any condition of a wave (scanned, delivered, t, cue, cleared: 'wave:0')
// NEUTRAL TRAFFIC is team 'neutral': not your wing, not at war with you; the pirates and the aliens are at war with them. A level or mission row `traffic` lists them:
//   traffic: [{ id, kind: 'patrol' | 'miner', place + off | at: [x, y], r, n, name, home, field }]   (at and field are offsets from the mission's place, as the other points of a mission are)
//   patrol: armed, ranges round its post, shoots a hostile in reach and goes to one within CAMP.traffic.kinds.patrol.help of its post. A mission that has none has none (the rim: no patrol rows).
//   miner:  unarmed, works the nearest rocks of the mission (the row's `field`, a point, picks which), goes home (a place) and docks, goes out again, runs home when a hostile comes close. Pirates raid it.
//   A neutral lost: C.neutralsLost++, a 'neutral' event, a line from the ship; the bonus { type: 'neutrals', n } asks for at most n lost.
//   campCue(C, name)             fire a cue (once; true)               campPirates(C, dt)    the tick: the mission's cues, the waves that break off
//   campPirateBreak(C, who)      who: 'all' | 'wave:N': break off now; the number of pirates that did      campPirateAI / campTrafficAI   one ship of each
//   campTrafficNew(C)            the neutral ships of the mission row, at campNew                         campNeutralLost(C, u)          what a lost neutral does
//   campPreyKind(u)              what a pirate sees in a ship: 'freighter', 'miner', 'escort', 'fighter', 'patrol' or 'carrier'

function campCue(C, name) {
  if (!name || !C.cues) return false;
  if (C.cues[name] == null) { C.cues[name] = C.t; C.events.push({ type: 'cue', name }); }
  return true;
}

// what a ship is to a pirate (the weights are CAMP.pirate.prey)
function campPreyKind(u) {
  if (u.kind === 'freighter') return 'freighter';
  if (u.kind === 'miner') return 'miner';
  if (u.kind === 'patrol') return 'patrol';
  if (u.kind === 'carrier') return 'carrier';
  if (u.team === 'earth' && u.order && u.order.type === 'mine') return 'miner'; // your own ships on a Mine order are mining ships to a pirate
  return u.kind === 'escort' ? 'escort' : 'fighter';
}
const campPreyOf = (want, kind) => want === 'haulers' ? kind === 'freighter' : want === 'miners' ? kind === 'miner' : want === 'carrier' ? kind === 'carrier' : true;

// what a pirate attacks: the hauler its wave names, else (for a while) whatever hit it, else the best by prey weight
function campPirateTarget(C, u) {
  const K = CAMP.pirate;
  if (u.goal && u.goal.indexOf('convoy:') === 0) { const f = C.by['freighter-' + u.goal.slice(7)]; if (f && f.hp > 0) return f; }
  if (u.hitBy && u.distractedUntil > C.t) { const h = C.by[u.hitBy]; if (h && h.hp > 0) return h; }
  const all = C.ships.filter(s => s.hp > 0 && (s.team === 'earth' || s.team === 'neutral'));
  const want = u.prey || 'any';
  let pool = want === 'any' ? all : all.filter(s => campPreyOf(want, campPreyKind(s)));
  if (!pool.length) pool = all;
  let best = null, bs = Infinity;
  pool.forEach(s => { const sc = campDist(u, s) * (K.prey[campPreyKind(s)] || 1); if (sc < bs) { bs = sc; best = s; } });
  return best;
}

function campPirateAI(C, u, dt) {
  const K = CAMP.pirate;
  if (u.running) return campPirateRun(C, u, dt);
  if (u.hold) { // a guard (a level's `guards` row, an anomaly's): it waits where it is until one of yours comes within reach, then it is an ordinary pirate
    if (!campNearest(C.ships.filter(s => s.team === 'earth' && s.hp > 0), u, u.def.engage * 0.9)) { const keep = Math.pow(0.5, dt); u.vx *= keep; u.vy *= keep; u.x += u.vx * dt; u.y += u.vy * dt; return; }
    u.hold = false;
  }
  if (u.hp < u.maxHp * (u.breakAt != null ? u.breakAt : K.breakHp)) { campPirateBreakOne(C, u, 'hurt'); return campPirateRun(C, u, dt); }
  const def = u.def, tgt0 = campPirateTarget(C, u) || C.carrier, tgt = tgt0 && campDogFoe(C, u, tgt0); // a skiff that picked one of your fighters flies at its partner (src/campdogfight.js)
  if (!tgt) return;
  const dx = tgt.x - u.x, dy = tgt.y - u.y, dist = Math.hypot(dx, dy), target = Math.atan2(dy, dx);
  const dog = campDogOn(C, u, tgt), m = dog ? campDogSteer(C, u, tgt, def.bullet * C.shot) : campSteer(C, u, def, dist, target, u.vx - (tgt.vx || 0), u.vy - (tgt.vy || 0)); // a skiff against a fighter is a dogfight
  if (dog) campDogMove(C, u, m, dt); else campMove(u, m.ang, m.face, dt);
  if (m.fire && dist < def.range && C.t > u.nextShot && Math.abs(campWrap((dog ? m.aim : target) - u.rot)) < def.aim) {
    u.nextShot = C.t + campFightGap(u, campBetween(C, def.shot[0], def.shot[1]));
    const n = def.spread || 1;
    for (let i = 0; i < n; i++) campBullet(C, u, u.rot + (i - (n - 1) / 2) * 0.17, def.bullet * C.shot, def.dmg * C.dmgS, 1800, 'alien', 14, { fac: 'pirate' }); // fac: the scene and the map draw a pirate's shot in amber, not the aliens' red
  }
}

// one pirate turns to run: faster, no more shooting (campPirateAI hands it to campPirateRun)
function campPirateBreakOne(C, u, why) {
  if (u.running) return;
  const K = CAMP.pirate;
  u.running = { since: C.t, why }; u.hold = false; u.runAng = null;
  u.vmax *= K.run; u.accel *= K.run;
  if (why === 'hurt' && C.t - (C.runSayAt == null ? -1e9 : C.runSayAt) >= 8000) { C.runSayAt = C.t; campSay(C, 'camp.say.pirate.run'); }
}
function campPirateRun(C, u, dt) {
  const K = CAMP.pirate, foes = C.ships.filter(s => s.hp > 0 && (s.team === 'earth' || s.team === 'neutral')), near = campNearest(foes, u);
  if (near) { const away = Math.atan2(u.y - near.y, u.x - near.x); u.runAng = u.runAng == null ? away : campRot(u.runAng, away, 2 * dt); }
  else if (u.runAng == null) u.runAng = u.rot;
  campMove(u, u.runAng, u.runAng, dt);
  if (C.t - u.running.since >= K.runMin && (!near || campDist(u, near) >= K.gone)) campPirateGone(C, u);
}
function campPirateGone(C, u) { // out of the battle: not killed (no kill, no wreck), counted as escaped
  u.hp = 0; u.gone = true; if (u.faction === 'pirate') C.piratesEscaped++; else C.aliensEscaped = (C.aliensEscaped | 0) + 1; // an alien boat that is out of torpedoes goes the same way
  C.events.push({ type: 'pirates', stage: 'gone', id: u.id, kind: u.kind, x: u.x, y: u.y, wave: u.wave });
}
// break off by hand (a script, or the wave's own `breaks` / `breakOn`): who is 'all' or 'wave:N'; how many pirates turned to run
function campPirateBreak(C, who) {
  who = who || 'all'; const w = /^wave:(\d+)$/.exec(who); let n = 0;
  C.ships.forEach(u => { if (u.hp > 0 && u.faction === 'pirate' && !u.running && (who === 'all' || (w && u.wave === +w[1]))) { campPirateBreakOne(C, u, 'cue'); n++; } });
  if (n) { C.events.push({ type: 'pirates', stage: 'break', n, who }); campSay(C, 'camp.say.pirate.break'); }
  return n;
}

// every tick: the mission's cues fire, and a wave that was given `breaks` or `breakOn` breaks off when its time comes
function campPirates(C, dt) {
  if (C.arrivedAt == null || !C.cues) return;
  (C.L.cues || []).forEach(c => { if (c && c.name && c.on && C.cues[c.name] == null && campWaveOn(C, c.on)) campCue(C, c.name); });
  const sec = campMissionClock(C);
  C.L.waves.forEach((w, i) => {
    const st = C.waves[i]; if (!st || !st.started || st.broke) return;
    if ((w.breaks != null && sec - st.at >= w.breaks) || (w.breakOn && C.cues[w.breakOn] != null)) { st.broke = true; campPirateBreak(C, 'wave:' + i); }
  });
}

// ---------- neutral traffic ----------
function campTrafficNew(C) {
  const pl = campPlaces(C.level), K = CAMP.traffic;
  (C.L.traffic || []).forEach((t, ti) => {
    const kd = K.kinds[t.kind]; if (!kd) return;
    let x, y;
    if (t.place) { const p = pl[t.place]; if (!p) return; x = p.x + (t.off ? t.off[0] : 0); y = p.y + (t.off ? t.off[1] : 0); } else if (Array.isArray(t.at)) { x = t.at[0]; y = t.at[1]; } else return;
    const n = Math.max(1, t.n | 0), home = t.home && pl[t.home] ? pl[t.home] : t.place && pl[t.place] ? pl[t.place] : null;
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI + ti, d = n > 1 ? 60 : 0, u = campSpawn(C, t.kind, x + Math.cos(a) * d, y + Math.sin(a) * d);
      if (!u) continue;
      if (t.escort) u.escort = Object.assign({}, t.escort); // a patrol that flies with a convoy up to a share of its road, then turns back to its post (card space-game-l1-1-beats)
      u.tid = t.id || ('t' + ti); u.cname = (t.name || kd.name) + (n > 1 ? ' ' + (i + 1) : ''); u.post = { x, y }; u.range = t.r || kd.r; u.rot = a; u.slot = i;
      if (t.hp) u.hp = u.maxHp = t.hp; // a row may say how tough the ship is (the crippled miner of 1.1 is not 70)
      if (t.stay) u.stay = true; // a miner that works where it is and never goes home (until it is frightened): the distress call of 1.1 (card space-game-l1-1-beats)
      if (t.kind === 'miner') { u.home = home ? { x: home.x, y: home.y, r: home.r || 60 } : { x, y, r: 0 }; u.field = Array.isArray(t.field) ? { x: t.field[0], y: t.field[1] } : null; u.phase = 'out'; u.until = 0; u.beam = ''; }
    }
  });
}
function campNeutralLost(C, u) {
  C.neutralsLost++;
  C.events.push({ type: 'neutral', stage: 'lost', id: u.id, kind: u.kind, name: u.cname || u.kind, x: u.x, y: u.y });
  campSay(C, 'camp.say.neutral.lost', { name: u.cname || u.kind });
}
const campHostiles = C => C.ships.filter(s => s.hp > 0 && s.team === 'alien');

function campTrafficAI(C, u, dt) {
  if (u.kind === 'patrol') return campPatrolAI(C, u, dt);
  if (u.kind === 'miner') return campMinerAI(C, u, dt);
}
function campPatrolAI(C, u, dt) {
  const k = CAMP.traffic.kinds.patrol, hs = campHostiles(C);
  if (u.escort) { // it flies with the transport (beside her, ahead of her nose) until she has flown `until` of her road, says it turns back and goes home
    const E = u.escort, f = C.by['freighter-' + E.convoy], started = !!f || C.convoys.some(c => c.started);
    if (started && (!f || f.hp <= 0 || campLane(C, E.convoy) >= E.until)) { u.escort = null; if (E.say && C.beats && !C.beats.patrolSaid) { C.beats.patrolSaid = true; campSay(C, E.say); } }
    else if (f) { const side = (u.slot | 0) % 2 ? 1 : -1, h = f.rot || 0; campSeek(u, f.x + Math.cos(h) * 140 - Math.sin(h) * 170 * side, f.y + Math.sin(h) * 140 + Math.cos(h) * 170 * side, dt, h); return; }
  }
  let foe = campNearest(hs, u, k.range);
  if (!foe) foe = campNearest(hs.filter(h => campDist(h, u.post) <= k.help), u); // one within the help of its post (a hauler or a miner under fire): it goes there
  if (foe && campDist(foe, u.post) <= k.help + k.range) {
    const dx = foe.x - u.x, dy = foe.y - u.y, dist = Math.hypot(dx, dy), aim = Math.atan2(dy, dx), want = k.range * 0.6;
    if (dist > want) campSeek(u, foe.x - Math.cos(aim) * want, foe.y - Math.sin(aim) * want, dt, aim); else campSeek(u, u.x, u.y, dt, aim);
    if (dist < k.range && C.t > u.nextShot && Math.abs(campWrap(aim - u.rot)) < 0.25) { u.nextShot = C.t + campBetween(C, k.shot[0], k.shot[1]); campBullet(C, u, u.rot, k.bullet, k.dmg, 1500, 'neutral', u.r); }
    return;
  }
  const a = C.t / 1000 * 0.12 + (u.slot | 0), r = u.range * 0.5; // nothing to do: it ranges round its post
  campSeek(u, u.post.x + Math.cos(a) * r, u.post.y + Math.sin(a) * r, dt);
}
// the rock a miner works: the nearest to its field (or its post), the one its slot picks among the nearest three when there are several, so two miners do not sit on one rock
function campMinerRock(C, u) {
  const from = u.field || u.post, rocks = (C.rocks || []).filter(r => r.hp > 0).sort((a, b) => campDist(a, from) - campDist(b, from));
  return rocks.length ? rocks[(u.slot | 0) % Math.min(3, rocks.length)] : null;
}
function campMinerAI(C, u, dt) {
  if (u.cord && typeof campConvoyMiner === 'function' && campConvoyMiner(C, u, dt)) return; // an order of the pilot's (Tuck in, Hold here, Run for it: src/campconvoy.js)
  const k = CAMP.traffic.kinds.miner, hs = campHostiles(C), scared = campNearest(hs, u, k.fear);
  if (u.stay) { u.beam = ''; return; } // a crippled miner (the distress call of 1.1) cannot run: it sits where it is until the pirates have it or the wing comes (card space-game-l1-1-beats)
  if (scared) { u.phase = 'run'; u.beam = ''; } else if (u.phase === 'run' && !campNearest(hs, u, k.fear * 1.6)) u.phase = 'out';
  if (u.phase === 'run') { campSeek(u, u.home.x, u.home.y, dt); return; } // home as fast as it goes
  if (u.phase === 'out') {
    const rock = (u.rockId && (C.rocks || []).find(r => r.id === u.rockId && r.hp > 0)) || campMinerRock(C, u), spot = rock || u.field || u.post;
    u.rockId = rock ? rock.id : '';
    if (campDist(u, spot) > 120) { campSeek(u, spot.x + 90, spot.y + 40, dt); u.beam = ''; return; }
    u.phase = 'work'; u.until = C.t + campBetween(C, k.work[0], k.work[1]) * 1000; u.beam = rock ? rock.id : '';
  }
  if (u.phase === 'work') {
    const rock = (C.rocks || []).find(r => r.id === u.rockId && r.hp > 0); if (!rock) { u.beam = ''; u.rockId = ''; }
    campSeek(u, (rock || u.post).x + 90, (rock || u.post).y + 40, dt, rock ? Math.atan2(rock.y - u.y, rock.x - u.x) : undefined);
    if (C.t >= u.until && !u.stay) { u.phase = 'home'; u.beam = ''; }
    return;
  }
  if (u.phase === 'home') {
    if (campDist(u, u.home) > (u.home.r || 0) + 80) { campSeek(u, u.home.x, u.home.y, dt); return; }
    u.phase = 'dock'; u.until = C.t + campBetween(C, k.dock[0], k.dock[1]) * 1000;
  }
  if (u.phase === 'dock') { campSeek(u, u.x, u.y, dt); if (C.t >= u.until) { u.phase = 'out'; u.rockId = ''; } }
}
