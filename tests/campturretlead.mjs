// smoke: the Campaign turrets lead their shots: a volley hits a gunship crossing at 100 px/s and a raider crossing at its top speed (plain Node, no Chrome)
// Card space-game-campaign-turret-lead. 8-GEN's boot of the turrets found the volleys flew past a gunship moving across at 100 px/s (0 damage in 3 s) and only hit
// standing towers. Each turret now aims at where its shot and the alien will meet (campLead in src/campaign.js; CAMP.carrier.lead is how far ahead: 1 is all the way).
//   A. the aim: a crossing alien is aimed ahead of, a standing one is not, the table's lead of 0 is the old aim, a hopeless case aims where the alien is
//   B. the volleys: a gunship at 100 px/s from 450 px, a raider at 430 px/s (its top speed) from 450 px, from every side, and with the carrier flying
//   C. the same volley with the lead switched off misses (the test bites)
//   D. nothing else moved: standing aliens, the spread, the numbers, Space held, Space up
// Run: node tests/campturretlead.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame(); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a duel: the carrier holds Space, one alien (a kind, 5,000 hit points so it lives to be hit) is made to fly a straight line at a constant velocity and never shoots.
// It answers: shots (turret shots fired), hits (the damage it took over the damage of one shot)
g.run(`
  window.__duel = (kind, dx, dy, vx, vy, secs, opts) => {
    opts = opts || {}; window.C = campNew(11, [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12;
    const c = C.carrier; if (opts.carrierV) { c.vx = opts.carrierV[0]; c.vy = opts.carrierV[1]; }
    const u = campSpawn(C, kind, c.x + dx, c.y + dy); u.accel = 0; u.vmax = 1e9; u.nextShot = 1e12; u.hp = u.maxHp = 5000;
    let shots = 0; const b0 = campBullet; campBullet = function (C2, from, rot, speed, dmg, life, team, ahead, extra) { if (team === 'earth' && extra && extra.pd) shots++; return b0.apply(null, arguments); };
    C.input.fire = true;
    const tail = opts.tail === 0 ? 0 : 30; for (let i = 0; i < secs * 30 + tail; i++) { if (i === secs * 30) C.input.fire = false; u.vx = vx; u.vy = vy; if (opts.carrierV) { c.vx = opts.carrierV[0]; c.vy = opts.carrierV[1]; } campStep(C, 1 / 30); C.events.length = 0; } // fire for secs, then a second more for the shots in the air to land
    campBullet = b0; return { shots, hits: Math.round((5000 - u.hp) / CAMP.carrier.pd), left: Math.round(u.hp) };
  };
  window.__sec = (kind, dx, dy, vx, vy) => { window.C = campNew(11, [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); const c = C.carrier, u = campSpawn(C, kind, c.x + dx, c.y + dy); u.vx = vx; u.vy = vy; u.accel = 0; u.vmax = 1e9; u.nextShot = 1e12;
    const tu = C.turrets[0], direct = Math.atan2(u.y - tu.y, u.x - tu.x); campStep(C, 1 / 30); return { aim: tu.aim, direct, target: tu.target === u.id }; }; // the aim is made before the alien moves in a tick, so the bearing is taken before it
`);
const ratio = r => r.shots ? r.hits / r.shots : 0;

// ---------- A. the aim ----------
console.log('A. the aim');
{
  const cross = J(`__sec('gunship', 450, 0, 0, 100)`);
  check('a gunship 450 px off crossing at 100 px/s is aimed ahead of: the turret points past where it is, by about asin(100 / 800) = 0.125 rad', cross.target && Math.abs(cross.aim - cross.direct) > 0.08 && Math.abs(cross.aim - cross.direct) < 0.2 && cross.aim > cross.direct, JSON.stringify(cross));
  const stand = J(`__sec('gunship', 450, 0, 0, 0)`);
  check('a standing one is aimed at where it is (towers are hit as before)', stand.target && Math.abs(stand.aim - stand.direct) < 1e-9, JSON.stringify(stand));
  const toward = J(`__sec('raider', 450, CAMP.carrier.mounts[0][1], -200, 0)`); // along the line of the first turret (its mount is that far north of the carrier's centre: the row of the table)
  check('one flying straight at a turret is aimed straight at: the lead is along the line, not off it', toward.target && Math.abs(toward.aim - toward.direct) < 1e-6, JSON.stringify(toward));
  const fast = J(`__sec('raider', 450, 0, 1500, 0)`);
  check('one faster than the shot and running away has no meeting: it is aimed at where it is, with a number and not NaN', fast.target && Number.isFinite(fast.aim) && Math.abs(fast.aim - fast.direct) < 1e-9, JSON.stringify(fast));
  g.run('CAMP.carrier.lead = 0');
  const off = J(`__sec('gunship', 450, 0, 0, 100)`);
  g.run('CAMP.carrier.lead = 0.5');
  const half = J(`__sec('gunship', 450, 0, 0, 100)`);
  g.run('CAMP.carrier.lead = 1');
  check('the table\'s lead of 0 is the old aim: at where it is', off.target && Math.abs(off.aim - off.direct) < 1e-9, JSON.stringify(off));
  check('a lead of 0.5 aims about half way', Math.abs((half.aim - half.direct) - (cross.aim - cross.direct) / 2) < 0.02, JSON.stringify([half.aim - half.direct, cross.aim - cross.direct]));
  check('the lead is one number in the one table, with its comment', J('CAMP.carrier.lead') === 1 && /lead: 1, +\/\/ how far ahead a turret aims/.test(src('src/campaign.js')));
  check('the carrier\'s own drift is read from the same number the shots use (campDrift), so they cannot disagree', /const campDrift = 0\.3/.test(src('src/campaign.js')) && (src('src/campaign.js').match(/campDrift/g) || []).length >= 4);
}

// ---------- B. the volleys ----------
console.log('B. the volleys hit what moves');
{
  const gun = J(`__duel('gunship', 450, 0, 0, 100, 3)`);
  check('a gunship 450 px off crossing at 100 px/s: most shots of a three-second volley hit (8 turrets, a shot every 0.7 s each)', gun.shots >= 28 && ratio(gun) >= 0.7 && gun.hits >= 18, JSON.stringify(gun));
  const rai = J(`__duel('raider', 450, 0, 0, 430, 1.5)`);
  check('a raider at its top speed (430 px/s) crossing from 450 px (where raiders circle, hold 460): most shots hit, in the 1.5 s before it is out of reach', rai.shots >= 5 && ratio(rai) >= 0.6, JSON.stringify(rai));
  const sides = [['gunship', 450, 0, 0, -100], ['gunship', 0, 450, 100, 0], ['gunship', 0, -450, -100, 0], ['gunship', -450, 0, 0, 100], ['raider', 0, 450, 430, 0], ['raider', -450, 0, 0, -430], ['raider', 320, 320, 300, -300], ['gunship', 320, -320, 70, 70]];
  const rs = sides.map(a => J(`__duel(${a.map(v => JSON.stringify(v)).join(', ')}, ${a[0] === 'raider' ? 1.5 : 3})`));
  check('from every side and on the diagonals, left and right, up and down: every volley lands more than half its shots', rs.every(r => r.shots >= 5 && ratio(r) >= 0.55), rs.map(r => r.hits + '/' + r.shots).join(' '));
  const far = J(`__duel('raider', 470, 0, 0, 430, 1.5)`);
  check('at the edge of the reach (470 px to the centre, a raider) the volley still lands: the shot lives 300 px past the reach, long enough to reach where it was aimed', far.shots >= 4 && ratio(far) >= 0.5, JSON.stringify(far));
  const toward = J(`__duel('raider', 450, 0, -300, 0, 2)`), away = J(`__duel('gunship', 300, 0, 100, 0, 2)`);
  check('one coming straight in and one going straight out are hit too', ratio(toward) >= 0.6 && ratio(away) >= 0.6, JSON.stringify([toward, away]));
  const fly = J(`__duel('gunship', 0, 450, 0, 0, 3, { carrierV: [210, 0] })`), fly2 = J(`__duel('raider', 0, 450, 430, 0, 1.5, { carrierV: [210, 0] })`);
  check('with the carrier flying at its top speed (210 px/s, a shot keeps 30 percent of it) a standing gunship abeam is still hit, and so is a crossing raider', ratio(fly) >= 0.6 && ratio(fly2) >= 0.5, JSON.stringify([fly, fly2]));
  check('the first volley is a fast one: a gunship at 100 px/s has lost hit points inside 0.9 s (the shots cross 450 px in about 0.55 s)', J(`__duel('gunship', 450, 0, 0, 100, 0.9).hits`) >= 1);
}

// ---------- C. the test bites ----------
console.log('C. with the lead off the volleys miss');
{
  g.run('CAMP.carrier.lead = 0');
  const gun = J(`__duel('gunship', 450, 0, 0, 100, 3)`), rai = J(`__duel('raider', 450, 0, 0, 430, 1.5)`);
  g.run('CAMP.carrier.lead = 1');
  check('without the lead a gunship at 100 px/s is hit by few shots and a raider at its top speed by almost none (8-GEN saw 0 in 3 s)', ratio(gun) < 0.4 && ratio(rai) < 0.15, JSON.stringify([gun, rai]));
  check('and the same two with the lead are what section B says: the lead is what changed it', ratio(J(`__duel('gunship', 450, 0, 0, 100, 3)`)) > ratio(gun) + 0.3 && ratio(J(`__duel('raider', 450, 0, 0, 430, 1.5)`)) > ratio(rai) + 0.4);
}

// ---------- D. nothing else moved ----------
console.log('D. nothing else moved');
{
  const sta = J(`__duel('tower', 400, 0, 0, 0, 3)`);
  check('a standing tower is hit by nearly every shot, as before', ratio(sta) >= 0.85, JSON.stringify(sta));
  g.run('__duel("gunship", 450, 0, 0, 100, 0.01, { tail: 0 }); C.input.fire = false; C.bullets.length = 0; for (let i = 0; i < 60; i++) { C.ships.find(u => u.kind === "gunship").vy = 100; campStep(C, 1 / 30); }');
  check('Space up: the turrets lead, aim and point, and fire nothing', J('C.bullets.filter(b => b.pd).length') === 0 && J('C.turrets.filter(t => t.target).length') >= 4);
  g.run('__duel("gunship", 450, 0, 0, 100, 0.15, { tail: 0 })');
  check('the shots still leave each turret\'s own mount (the spread is kept) and the turrets are still eight', J('C.turrets.length') === 8 && J('C.bullets.filter(b => b.pd).length') >= 2 && J('C.bullets.filter(b => b.pd).every(b => C.turrets.some(t => Math.hypot(b.x - t.x, b.y - t.y) < 150))'));
  check('the other numbers did not move: 4 a shot, every 0.7 s, out to 500 px; shots at 800 px/s', J('CAMP.carrier.pd') === 4 && J('CAMP.carrier.pdDelay') === 700 && J('CAMP.carrier.pdRange') === 500 && J('CAMP.carrier.pdSpeed') === 800);
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPTURRETLEAD FAIL (${failed} of ${n})` : `\nCAMPTURRETLEAD PASS (${n})`);
process.exitCode = failed ? 1 : 0;
