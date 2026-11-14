// ---------- Missions: the calls on the station board, and the space-side logic for each ----------
// G.missionId names a row of MISSIONS; G.mission is its state: none | accepted | rescued | failed.
// Rescue plays out in surface.js (land, find the colonist) and pays on docking (station.js), as in v0.1.
// Escort and Police patrol live entirely in space (hooks below) and pay the moment they are done.
G.missionId = null; G.missionProgress = 0; G.patrolsDone = 0; // patrolsDone unlocks the bounty call (saved by meta.js)

// The Perseus gate is a body of type 'gate' in the system data (src/data_systems.js). GATE stays as a live alias of its position
// for tests/missions.mjs, which moves the MULE next to it; the code below asks sysBody('gate') itself.
const GATE = { get x() { return sysBody('gate').x; }, get y() { return sysBody('gate').y; } };
const REAVER_HP = 300;

const MISSIONS = [
  {
    id: 'rescue', key: '1', title: 'Rescue call', where: 'Kepler-4b', reward: REWARD,
    offer: 'A survey pod went down on the surface.\nPirate drones circle the planet and\ncrawlers roam the ground.\nLand, find the colonist, keep them alive,\nwalk them back to your ship, bring them home.',
    line: st => st === 'rescued' ? 'Colonist aboard: dock at the station'
      : st === 'failed' ? 'Failed. Ask the station for another call' : 'Rescue the colonist on Kepler-4b',
    progress: () => G.mission === 'rescued' ? 'The colonist is aboard.\nDock at Halcyon Station to get paid.'
      : 'Find the colonist on Kepler-4b and\nbring them back alive.',
    failOnDeath: ['rescued'], deathMsg: 'Ship destroyed. The colonist was lost. Mission failed.'
  },
  {
    id: 'escort', key: '2', title: 'Escort', where: 'MULE to the Perseus gate', reward: 400,
    offer: 'The freighter MULE leaves the hangar when you do,\nbound for the Perseus gate to the south-west.\nPirates know the route. Fly with her and shoot\nanything that gets close. She pays on arrival.\nLose her and you get nothing.',
    line: st => st === 'failed' ? 'Failed. The MULE was lost' : 'Escort the MULE to the Perseus gate',
    progress: () => 'The MULE is under way to the Perseus gate.\nStay with her. Do not dock or land.',
    failOnDeath: ['accepted'], deathMsg: 'Ship destroyed. The MULE is on her own. Mission failed.',
    space: { setup: escortSetup, update: escortUpdate, target: escortTarget,
      leave: s => failMission(s, uiText('toast.mule-left')) }
  },
  {
    id: 'patrol', key: '3', title: 'Police patrol', where: 'Halcyon approach', reward: 600, count: 5,
    offer: 'Five pirates with bounties on their heads are\nloitering on the approach to Halcyon Station.\nThey are marked in amber on your radar.\nDestroy all five and the station pays the bounty.\nCome back and dock whenever you like.',
    line: st => st === 'failed' ? 'Failed. The pirates got away'
      : 'Police patrol: ' + G.missionProgress + ' of 5 wanted pirates down',
    progress: () => 'Wanted pirates destroyed: ' + G.missionProgress + ' of 5.\nThey wait on the approach to the station.',
    failOnDeath: [], deathMsg: '',
    space: { setup: patrolSetup, update: patrolUpdate, target: patrolTarget }
  },
  {
    id: 'bounty', key: '4', title: 'Bounty', where: 'The Reaver, off Kepler-4b', reward: 1200,
    unlock: () => G.patrolsDone > 0, // the board offers it once a police patrol has been finished
    offer: 'The pirate warlord they call the Reaver holds\nthe dark side of Kepler-4b with two escorts.\nA warship three times a drone: spread guns and\na ramming charge it telegraphs with a flash.\nHalcyon pays 1200 cr for the wreck.',
    line: st => st === 'failed' ? 'Failed. The Reaver got away'
      : 'Bounty: the Reaver  hull ' + Math.round(100 * Math.max(0, REAVER_HP - G.missionProgress) / REAVER_HP) + '%',
    progress: () => 'The Reaver waits south-west of Kepler-4b.\nIts hull is at ' + Math.round(100 * Math.max(0, REAVER_HP - G.missionProgress) / REAVER_HP) + '%.\nDock whenever you like; it will still be there.',
    failOnDeath: ['accepted'], deathMsg: 'Ship destroyed. The Reaver got away. Mission failed.',
    space: { setup: bountySetup, update: bountyUpdate, target: bountyTarget }
  }
];

function missionDef() { return MISSIONS.find(m => m.id === G.missionId) || null; }
function missionsOffered() { return MISSIONS.filter(m => !m.unlock || m.unlock()); } // what the board shows today
function missionActive(id) { return G.mission === 'accepted' && G.missionId === id; }
// the board calls this when Troy reads a call; pressing E in station.js then sets G.mission = 'accepted'
function pickMission(id) { G.missionId = id; G.missionProgress = 0; }
function abandonMission() { G.mission = 'none'; G.missionId = null; G.missionProgress = 0; }

function failMission(s, msg) {
  if (G.mission !== 'accepted' && G.mission !== 'rescued') return;
  G.mission = 'failed'; beep(150, 0.6, 'sawtooth', 0.05, -100); toast(s, msg, '#ff4d6d');
}
function completeMission(s, msg) {
  const m = missionDef(); if (!m) return;
  G.credits += m.reward; G.mission = 'none'; G.missionId = null; G.missionProgress = 0;
  beep(660, 0.25, 'triangle', 0.05, 440); toast(s, msg + '  +' + m.reward + ' cr', '#6dff9c');
}

// ---- hooks called from space.js ----
function missionSpaceSetup(s) {
  s.mx = {};
  const m = missionDef();
  if (m && m.space && G.mission === 'accepted') m.space.setup(s);
}
function missionSpaceUpdate(s, time, dt) {
  const m = missionDef();
  if (m && m.space && G.mission === 'accepted') m.space.update(s, time, dt);
}
function missionLeaveSpace(s) {
  const m = missionDef();
  if (m && m.space && m.space.leave && G.mission === 'accepted') m.space.leave(s);
}
function missionDeath(s) {
  const m = missionDef();
  if (!m || !m.failOnDeath.includes(G.mission)) return false;
  failMission(s, m.deathMsg); return true;
}
// where the objective arrow points
function missionTarget(s) {
  const m = missionDef();
  const t = m && m.space && m.space.target && G.mission === 'accepted' ? m.space.target(s) : null;
  if (t) return t;
  if (missionActive('rescue')) return { x: s.planet.x, y: s.planet.y, name: sysBody('planet').name };
  return { x: s.station.x, y: s.station.y, name: sysBody('station').name };
}
// a pirate went down: a wanted one counts for the patrol, the Reaver ends the bounty
function missionKill(s, e) {
  if (e && e.boss) {
    if (missionActive('bounty')) { s.cameras.main.shake(600, 0.012); completeMission(s, uiText('toast.reaver-dead')); }
    return;
  }
  if (!e || !e.wanted || !missionActive('patrol')) return;
  const m = missionDef(); G.missionProgress++;
  if (G.missionProgress >= m.count) { G.patrolsDone++; completeMission(s, uiText('toast.patrol-done')); }
  else toast(s, uiText('toast.patrol-down'), '#ffb454');
}
function radarDot(s, x, y, color, r) { hudBlip(s, x, y, color, r); } // the HUD radar (src/hud.js) draws it this frame

// ---- Escort: the MULE flies station -> gate; pirates lie in wait along the route ----
function escortSetup(s) {
  const st = s.station, gate = sysBody('gate'); // src/universe.js
  const f = s.physics.add.sprite(st.x - 60, st.y + 260, 'freighter').setDepth(4);
  f.body.setCircle(14, 24, 6).setMaxSpeed(130); // offset in the 76x40 texture (ships.js)
  f.hp = 200; f.maxHp = 200; f.rammedAt = 0;
  f.rotation = Phaser.Math.Angle.Between(f.x, f.y, gate.x, gate.y);
  s.mx.freighter = f;

  const g = s.add.graphics().setDepth(1);
  g.lineStyle(6, AMBER, 0.9); g.strokeCircle(gate.x, gate.y, gate.r);
  g.lineStyle(2, AMBER, 0.4); g.strokeCircle(gate.x, gate.y, gate.r + 20);
  label(s, gate.x, gate.y - gate.r - 50, gate.name.toUpperCase(), '#ffb454', 18);

  s.physics.add.overlap(f, s.eb, (fr, b) => { if (!b.active) return; b.disableBody(true, true); freighterHurt(s, 5); });
  s.physics.add.overlap(f, s.enemies, (fr, e) => {
    if (s.time.now < f.rammedAt) return; f.rammedAt = s.time.now + 1000; e.hp -= 10; freighterHurt(s, 2);
  });
  // two ambushes along the route; these drones hunt the MULE, not you
  const ambush = (frac, n) => {
    for (let i = 0; i < n; i++) {
      const d = s.spawnDrone(st.x + (gate.x - st.x) * frac + Phaser.Math.Between(-260, 260),
                             st.y + (gate.y - st.y) * frac + Phaser.Math.Between(-260, 260));
      d.prey = f;
    }
  };
  ambush(0.35, 2); ambush(0.7, 3);
  s.time.delayedCall(3600, () => { if (f.active && !s.leaving) toast(s, uiText('toast.mule-leaving'), '#ffd37a'); });
}
function freighterHurt(s, n) {
  const f = s.mx.freighter; if (!f || !f.active) return;
  f.hp -= n; f.setTint(0xffffff); s.time.delayedCall(70, () => f.active && f.clearTint());
  if (s.sparks) s.sparks.explode(5, f.x, f.y); // ships.js
  beep(200, 0.08, 'square', 0.02, -100);
  if (f.hp <= 0) {
    s.boom.explode(50, f.x, f.y); f.destroy(); beep(90, 0.5, 'sawtooth', 0.05, -60);
    failMission(s, uiText('toast.mule-lost'));
  }
}
function escortUpdate(s) {
  const f = s.mx.freighter; if (!f || !f.active) return;
  const gate = sysBody('gate');
  if (Phaser.Math.Distance.Between(f.x, f.y, gate.x, gate.y) < gate.r) {
    s.boom.explode(30, f.x, f.y); f.destroy();
    completeMission(s, uiText('toast.mule-arrived')); return;
  }
  // she slows when pirates are close or you fall behind, so you can catch up
  let threat = false;
  s.enemies.getChildren().forEach(e => { if (e.active && Phaser.Math.Distance.Between(e.x, e.y, f.x, f.y) < 500) threat = true; });
  const behind = Phaser.Math.Distance.Between(f.x, f.y, s.ship.x, s.ship.y) > 700;
  s.physics.moveTo(f, gate.x, gate.y, threat ? 50 : behind ? 70 : 130);
  f.rotation = Phaser.Math.Angle.RotateTo(f.rotation, Phaser.Math.Angle.Between(f.x, f.y, gate.x, gate.y), 0.02);
  hudMeter(s, 'MULE', f.hp / f.maxHp, AMBER);
  radarDot(s, f.x, f.y, 0xffd37a, 3); radarDot(s, gate.x, gate.y, AMBER, 2);
}
function escortTarget(s) {
  const f = s.mx.freighter, gate = sysBody('gate');
  return f && f.active ? { x: f.x, y: f.y, name: 'Freighter MULE' } : { x: gate.x, y: gate.y, name: gate.name };
}

// ---- Police patrol: wanted pirates loiter on the approach to the station ----
function patrolSetup(s) {
  const m = missionDef(), left = m.count - G.missionProgress;
  s.mx.mark = s.add.graphics().setDepth(3);
  for (let i = 0; i < left; i++) {
    const a = i / left * Math.PI * 2 + Math.random() * 0.8, r = Phaser.Math.Between(650, 950);
    const d = s.spawnDrone(s.station.x + Math.cos(a) * r, s.station.y + Math.sin(a) * r);
    d.wanted = true; d.hp = 40;
  }
}
function patrolUpdate(s) {
  const g = s.mx.mark; g.clear(); g.lineStyle(2, AMBER, 0.9);
  s.enemies.getChildren().forEach(d => {
    if (!d.wanted || !d.active) return;
    g.strokeCircle(d.x, d.y, 26); radarDot(s, d.x, d.y, AMBER, 3);
  });
}
function patrolTarget(s) {
  let best = null, bd = Infinity;
  s.enemies.getChildren().forEach(d => {
    if (!d.wanted || !d.active) return;
    const dd = Phaser.Math.Distance.Between(s.ship.x, s.ship.y, d.x, d.y);
    if (dd < bd) { bd = dd; best = d; }
  });
  return best ? { x: best.x, y: best.y, name: 'Wanted pirate' } : null;
}

// ---- Bounty: the Reaver, a warship with two escorts on the dark side of Kepler-4b ----
// It is a pirate in s.enemies like the others (your guns, salvage and the radar all work on it), with its own AI.
const REAVER = {
  key: 'reaver', tex: 'reaver', hp: REAVER_HP, credits: 150, ram: 25, radar: 0xff2a4a, body: [30, 14, 13], // offset in the 112x90 texture (ships.js)
  engage: 1400, speed: 220, max: 190, turn: 0.02, hold: 380, range: 820, aim: 0.5, shot: [1200, 1800], bullet: 400, dmg: 10, spread: 3,
  boss: true, ai: (s, d, ship, time) => reaverAI(s, d, ship, time)
};
function bountySetup(s) {
  const bx = s.planet.x - 1100, by = s.planet.y + 650;
  const d = spawnPirate(s, bx, by, REAVER);
  d.boss = true; d.hp = Math.max(1, REAVER_HP - G.missionProgress); d.phase = 1; d.chargeAt = s.time.now + 6000; d.tele = 0; d.chargeEnd = 0;
  s.mx.boss = d;
  spawnPirate(s, bx + 180, by - 140, 'raider'); spawnPirate(s, bx - 160, by + 160, 'gunship'); // the two escorts
  s.mx.mark = s.add.graphics().setDepth(3);
  s.time.delayedCall(3600, () => { if (!s.leaving && d.active) toast(s, uiText('toast.reaver-intro'), '#ffd37a'); });
}
function reaverAI(s, d, ship, time) {
  const def = d.def, dist = Phaser.Math.Distance.Between(d.x, d.y, ship.x, ship.y);
  // phases: below two thirds and one third it speeds up and calls two raiders
  const phase = d.hp > REAVER_HP * 2 / 3 ? 1 : d.hp > REAVER_HP / 3 ? 2 : 3;
  if (phase > d.phase) {
    d.phase = phase; s.cameras.main.shake(300, 0.006);
    toast(s, uiText(phase === 2 ? 'toast.reaver-wing' : 'toast.reaver-burning'), '#ff4d6d');
    for (let i = 0; i < 2; i++) spawnPirate(s, d.x + Phaser.Math.Between(-200, 200), d.y + Phaser.Math.Between(-200, 200), 'raider');
  }
  const mult = [1, 1, 1.25, 1.5][phase];
  if (dist >= def.engage) { d.body.setAcceleration(0, 0); d.body.setMaxSpeed(def.max); d.rotation += 0.002; return; }
  const target = Phaser.Math.Angle.Between(d.x, d.y, ship.x, ship.y);
  // the ram: a white flash for 800 ms, then a 600 ms charge straight at where you are
  if (time > d.chargeEnd && d.charging) { d.charging = false; d.body.setMaxSpeed(def.max * mult); d.chargeAt = time + [0, 8000, 6500, 5000][phase]; }
  if (!d.charging && !d.tele && time > d.chargeAt) d.tele = time + 800;
  if (d.tele && time < d.tele) { // telegraph
    d.setTint(Math.floor(time / 90) % 2 ? 0xffffff : 0xff2a4a); d.body.setAcceleration(0, 0); d.body.setVelocity(d.body.velocity.x * 0.9, d.body.velocity.y * 0.9);
    d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, target, 0.12);
    return;
  }
  if (d.tele && time >= d.tele) { // charge
    d.tele = 0; d.charging = true; d.chargeEnd = time + 600; d.clearTint();
    d.body.setMaxSpeed(900); d.body.setAcceleration(0, 0); s.physics.velocityFromRotation(d.rotation, 850, d.body.velocity);
    beep(90, 0.5, 'sawtooth', 0.06, -40);
  }
  if (d.charging) return;
  d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, target, def.turn * mult);
  if (dist > def.hold) s.physics.velocityFromRotation(d.rotation, def.speed * mult, d.body.acceleration);
  else d.body.setAcceleration(0, 0);
  if (dist < def.range && time > d.nextShot && Math.abs(Phaser.Math.Angle.Wrap(target - d.rotation)) < def.aim) {
    d.nextShot = time + Phaser.Math.Between(def.shot[0], def.shot[1]) / mult;
    const n = phase === 3 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const b = s.shoot(s.eb, d.x, d.y, d.rotation + (i - (n - 1) / 2) * 0.17, def.bullet, time);
      if (b) b.dmg = def.dmg;
    }
  }
}
function bountyUpdate(s) {
  const d = s.mx.boss; if (!d || !d.active) return;
  G.missionProgress = REAVER_HP - Math.max(0, d.hp); // damage dealt so far; survives docking and reloads
  hudMeter(s, 'REAVER', d.hp / REAVER_HP, RED);
  radarDot(s, d.x, d.y, 0xff2a4a, 4);
  const g = s.mx.mark; g.clear();
  g.lineStyle(2, d.tele ? 0xffffff : RED, d.tele ? 0.9 : 0.5); g.strokeCircle(d.x, d.y, 48 + (d.tele ? 6 * Math.sin(s.time.now / 60) : 0));
}
function bountyTarget(s) {
  const d = s.mx.boss;
  return d && d.active ? { x: d.x, y: d.y, name: 'The Reaver' } : null;
}
