// ---------- Missions: the calls on the station board, and the space-side logic for each ----------
// G.missionId names a row of MISSIONS; G.mission is its state: none | accepted | rescued | failed.
// Rescue plays out in surface.js (land, find the colonist) and pays on docking (station.js), as in v0.1.
// Escort and Police patrol live entirely in space (hooks below) and pay the moment they are done.
G.missionId = null; G.missionProgress = 0;

const GATE = { x: 1800, y: 6200 };

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
      leave: s => failMission(s, 'You left the MULE behind. Mission failed.') }
  },
  {
    id: 'patrol', key: '3', title: 'Police patrol', where: 'Halcyon approach', reward: 600, count: 5,
    offer: 'Five pirates with bounties on their heads are\nloitering on the approach to Halcyon Station.\nThey are marked in amber on your radar.\nDestroy all five and the station pays the bounty.\nCome back and dock whenever you like.',
    line: st => st === 'failed' ? 'Failed. The pirates got away'
      : 'Police patrol: ' + G.missionProgress + ' of 5 wanted pirates down',
    progress: () => 'Wanted pirates destroyed: ' + G.missionProgress + ' of 5.\nThey wait on the approach to the station.',
    failOnDeath: [], deathMsg: '',
    space: { setup: patrolSetup, update: patrolUpdate, target: patrolTarget }
  }
];

function missionDef() { return MISSIONS.find(m => m.id === G.missionId) || null; }
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
  if (missionActive('rescue')) return { x: s.planet.x, y: s.planet.y, name: 'Kepler-4b' };
  return { x: s.station.x, y: s.station.y, name: 'Halcyon Station' };
}
// a wanted pirate went down
function missionKill(s) {
  if (!missionActive('patrol')) return;
  const m = missionDef(); G.missionProgress++;
  if (G.missionProgress >= m.count) completeMission(s, 'Patrol complete. All wanted pirates destroyed.');
  else toast(s, 'Wanted pirate down  ' + G.missionProgress + ' of ' + m.count, '#ffb454');
}
function radarDot(s, x, y, color, r) {
  const sc = 160 / s.WS;
  s.hud.fillStyle(color, 1); s.hud.fillCircle(W - 184 + x * sc, 24 + y * sc, r);
}

// ---- Escort: the MULE flies station -> gate; pirates lie in wait along the route ----
function escortSetup(s) {
  const st = s.station;
  const f = s.physics.add.sprite(st.x - 60, st.y + 260, 'freighter').setDepth(4);
  f.body.setCircle(14, 18, 0).setMaxSpeed(130);
  f.hp = 200; f.maxHp = 200; f.rammedAt = 0;
  f.rotation = Phaser.Math.Angle.Between(f.x, f.y, GATE.x, GATE.y);
  s.mx.freighter = f;

  const g = s.add.graphics().setDepth(1);
  g.lineStyle(6, AMBER, 0.9); g.strokeCircle(GATE.x, GATE.y, 110);
  g.lineStyle(2, AMBER, 0.4); g.strokeCircle(GATE.x, GATE.y, 130);
  label(s, GATE.x, GATE.y - 160, 'PERSEUS GATE', '#ffb454', 18);

  s.physics.add.overlap(f, s.eb, (fr, b) => { if (!b.active) return; b.disableBody(true, true); freighterHurt(s, 5); });
  s.physics.add.overlap(f, s.enemies, (fr, e) => {
    if (s.time.now < f.rammedAt) return; f.rammedAt = s.time.now + 1000; e.hp -= 10; freighterHurt(s, 2);
  });
  // two ambushes along the route; these drones hunt the MULE, not you
  const ambush = (frac, n) => {
    for (let i = 0; i < n; i++) {
      const d = s.spawnDrone(st.x + (GATE.x - st.x) * frac + Phaser.Math.Between(-260, 260),
                             st.y + (GATE.y - st.y) * frac + Phaser.Math.Between(-260, 260));
      d.prey = f;
    }
  };
  ambush(0.35, 2); ambush(0.7, 3);
  s.time.delayedCall(3600, () => { if (f.active && !s.leaving) toast(s, 'The MULE is leaving the hangar. Stay close to her.', '#ffd37a'); });
}
function freighterHurt(s, n) {
  const f = s.mx.freighter; if (!f || !f.active) return;
  f.hp -= n; f.setTint(0xffffff); s.time.delayedCall(70, () => f.active && f.clearTint());
  beep(200, 0.08, 'square', 0.02, -100);
  if (f.hp <= 0) {
    s.boom.explode(50, f.x, f.y); f.destroy(); beep(90, 0.5, 'sawtooth', 0.05, -60);
    failMission(s, 'The MULE was destroyed. Mission failed.');
  }
}
function escortUpdate(s) {
  const f = s.mx.freighter; if (!f || !f.active) return;
  if (Phaser.Math.Distance.Between(f.x, f.y, GATE.x, GATE.y) < 110) {
    s.boom.explode(30, f.x, f.y); f.destroy();
    completeMission(s, 'The MULE made the Perseus gate.'); return;
  }
  // she slows when pirates are close or you fall behind, so you can catch up
  let threat = false;
  s.enemies.getChildren().forEach(e => { if (e.active && Phaser.Math.Distance.Between(e.x, e.y, f.x, f.y) < 500) threat = true; });
  const behind = Phaser.Math.Distance.Between(f.x, f.y, s.ship.x, s.ship.y) > 700;
  s.physics.moveTo(f, GATE.x, GATE.y, threat ? 50 : behind ? 70 : 130);
  f.rotation = Phaser.Math.Angle.RotateTo(f.rotation, Phaser.Math.Angle.Between(f.x, f.y, GATE.x, GATE.y), 0.02);
  bar(s.hud, 24, 112, 220, 8, f.hp / f.maxHp, AMBER);
  radarDot(s, f.x, f.y, 0xffd37a, 3); radarDot(s, GATE.x, GATE.y, AMBER, 2);
}
function escortTarget(s) {
  const f = s.mx.freighter;
  return f && f.active ? { x: f.x, y: f.y, name: 'Freighter MULE' } : { x: GATE.x, y: GATE.y, name: 'Perseus gate' };
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
