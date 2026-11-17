// smoke: how pirates fly a fight: circle at gun range, pass and break away, run when badly hit (plain Node, pirateSteer flown in a small simulation)
// Card space-game-fight-feel (Troy, 2026-11-17: the escort fight was flat). src/enemies.js pirateSteer decides where a pirate points its engine
// and its nose; this test flies it with the same rules the page's physics uses (thrust, damping 0.5, top speed) and looks at the path.
// No Chrome and no Phaser: pirateSteer takes and gives plain numbers. What the fight feels like is for a person at the keyboard.
// Run: node tests/enemies.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };

const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// fly(type, opts): one pirate of that type against one target for `secs` seconds at 60 frames a second.
//   from: how far away it starts; tv: the target's speed along x (the freighter does 130); hit: [second, hp] sets its hull at that second
// It answers one row per frame: [t, dist, move, speed, fire, bearing from the target to the pirate].
g.run(`globalThis.fly = (type, o) => {
  o = o || {};
  const def = PIRATES[type], dt = 1 / 60, rows = [];
  const d = { x: o.from || 900, y: 0, vx: 0, vy: 0, hp: def.hp, side: o.side || 1, move: null, moveUntil: 0, ran: false };
  const t = { x: 0, y: 0 };
  for (let f = 0; f < (o.secs || 30) * 60; f++) {
    const time = 100000 + f * dt * 1000;
    if (o.hit && Math.abs(f * dt - o.hit[0]) < dt / 2) d.hp = o.hit[1];
    if (o.hit2 && Math.abs(f * dt - o.hit2[0]) < dt / 2) d.hp = o.hit2[1];
    t.x += (o.tv || 0) * dt;
    const dx = t.x - d.x, dy = t.y - d.y, dist = Math.hypot(dx, dy), m = pirateSteer(d, def, dist, Math.atan2(dy, dx), time, d.vx - (o.tv || 0), d.vy);
    d.vx += Math.cos(m.ang) * def.speed * dt; d.vy += Math.sin(m.ang) * def.speed * dt;
    const k = Math.pow(0.5, dt); d.vx *= k; d.vy *= k;                       // setDamping(true).setDrag(0.5)
    const v = Math.hypot(d.vx, d.vy); if (v > def.max) { d.vx *= def.max / v; d.vy *= def.max / v; } // setMaxSpeed(def.max)
    d.x += d.vx * dt; d.y += d.vy * dt;
    rows.push([f * dt, Math.hypot(t.x - d.x, t.y - d.y), m.move, Math.hypot(d.vx, d.vy), m.fire, Math.atan2(d.y - t.y, d.x - t.x)]);
  }
  return rows;
}`);
const fly = (type, o = {}) => J(`fly('${type}', ${JSON.stringify(o)})`);
const P = J('({ raider: PIRATES.raider, drone: PIRATES.drone, gunship: PIRATES.gunship })');
const min = a => Math.min(...a), max = a => Math.max(...a), avg = a => a.reduce((x, y) => x + y, 0) / a.length;
// how far round the target it went, in turns: the bearing summed frame to frame
const turns = rows => { let sum = 0; for (let i = 1; i < rows.length; i++) { let da = rows[i][5] - rows[i - 1][5]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; sum += da; } return Math.abs(sum) / (2 * Math.PI); };
const after = (rows, s) => rows.filter(r => r[0] >= s);

console.log('the numbers the economy leans on are the ones they were');
{
  check('raider 20 hp 6 dmg 45 bounty, drone 30 / 8 / 40, gunship 80 / 10 / 100',
    [P.raider.hp, P.raider.dmg, P.raider.bounty, P.drone.hp, P.drone.dmg, P.drone.bounty, P.gunship.hp, P.gunship.dmg, P.gunship.bounty].join() === '20,6,45,30,8,40,80,10,100');
  check('speed, top speed, stand-off and gun range are untouched', [P.raider.speed, P.raider.max, P.raider.hold, P.raider.range, P.drone.max, P.drone.hold, P.drone.range, P.gunship.max, P.gunship.hold, P.gunship.range].join() === '520,430,460,520,260,280,650,150,430,780');
}

console.log('circle: the gunship orbits at gun range and never turns in');
{
  const rows = fly('gunship', { secs: 60 }), late = after(rows, 15), d = late.map(r => r[1]);
  check('it only ever circles', new Set(rows.map(r => r[2])).size === 1 && rows[0][2] === 'circle', [...new Set(rows.map(r => r[2]))].join());
  check('once there it stays on a ring near its stand-off distance (430)', min(d) > P.gunship.hold * 0.75 && max(d) < P.gunship.hold * 1.3, `${Math.round(min(d))} to ${Math.round(max(d))}`);
  check('the ring is inside its gun range', max(d) < P.gunship.range);
  check('it keeps moving: more than half its top speed on average (before, it parked and turned on the spot)', avg(late.map(r => r[3])) > P.gunship.max * 0.5, Math.round(avg(late.map(r => r[3]))));
  check('it goes round the target, more than half a turn in 45 s', turns(late) > 0.5, turns(late).toFixed(2));
  check('it may shoot the whole time it circles', late.every(r => r[4] === true));
  const other = turns(after(fly('gunship', { secs: 40, side: -1 }), 15));
  check('side -1 circles too (the other way round)', other > 0.3, other.toFixed(2));
}

for (const type of ['raider', 'drone']) {
  console.log(`pass and break away: the ${type}`);
  const def = P[type], rows = fly(type, { secs: 60 }), moves = rows.map(r => r[2]), d = rows.map(r => r[1]);
  const passes = moves.filter((m, i) => m === 'pass' && moves[i - 1] !== 'pass').length;
  const breaks = moves.filter((m, i) => m === 'break' && moves[i - 1] !== 'break').length;
  check('it circles, makes passes and breaks away: all three in a minute', passes >= 3 && breaks >= 3 && moves.includes('circle'), `${passes} passes, ${breaks} breaks`);
  check('a pass is never the first thing: it circles for 2 s or more before turning in', rows.find(r => r[2] === 'pass')[0] - rows.find(r => r[1] < def.hold * 1.5)[0] >= 2, (rows.find(r => r[2] === 'pass')[0] - rows.find(r => r[1] < def.hold * 1.5)[0]).toFixed(2));
  const passEnds = rows.filter((r, i) => r[2] === 'pass' && moves[i + 1] === 'break').map(r => r[1]);
  check('a pass brings it in close: well inside the ring on average', avg(passEnds) < def.hold * 0.75, passEnds.map(Math.round).join());
  check('it flies past the target, it does not ram it: never nearer than 40 px', min(d) > 40, Math.round(min(d)));
  // after each break it is back out: the furthest point between two passes is near the ring again
  const outs = []; let far = 0;
  rows.forEach((r, i) => { if (r[2] === 'pass' && moves[i - 1] !== 'pass') { if (far) outs.push(far); far = 0; } else if (r[2] !== 'pass' && passes) far = Math.max(far, r[1]); });
  check('between passes it opens the range again: out to 80% of the ring or further every time', outs.slice(1).every(x => x > def.hold * 0.8), outs.map(Math.round).join());
  check('it does not shoot while breaking away, and may while circling and passing', rows.every(r => r[4] === (r[2] !== 'break')));
  check('it keeps its speed up: 60% of top speed on average once in the fight', avg(after(rows, 8).map(r => r[3])) > def.max * 0.6, Math.round(avg(after(rows, 8).map(r => r[3]))));
  check('it stays in the fight: never further than 1.6 rings once it has arrived', max(after(rows, 8).map(r => r[1])) < def.hold * 1.6, Math.round(max(after(rows, 8).map(r => r[1]))));
}

console.log('run: badly hit, a pirate runs once and comes back');
{
  const rows = fly('raider', { secs: 40, hit: [10, 5] }), at = rows.findIndex(r => r[2] === 'run'), run = rows.filter(r => r[2] === 'run');
  check('at 5 of 20 hull the raider runs, that same frame', at >= 0 && Math.abs(rows[at][0] - 10) < 0.05, at >= 0 ? rows[at][0] : 'never');
  check('it runs for 3.5 to 5 s', run.length / 60 >= 3.4 && run.length / 60 <= 5.1, (run.length / 60).toFixed(1));
  check('it does not shoot while it runs', run.every(r => r[4] === false));
  check('it opens the range: 600 px or more further away at the end of the run', run[run.length - 1][1] - run[0][1] > 600, Math.round(run[run.length - 1][1] - run[0][1]));
  const back = rows.slice(at + run.length);
  check('then it comes back and fights: no second run, and it is on the ring again', back.every(r => r[2] !== 'run') && min(back.map(r => r[1])) < P.raider.hold * 1.1, Math.round(min(back.map(r => r[1]))));
  const twice = fly('raider', { secs: 40, hit: [10, 5], hit2: [25, 2] });
  check('hit again after it came back, it does not run a second time', twice.filter(r => r[0] > 20).every(r => r[2] !== 'run'));
  const whole = fly('raider', { secs: 20 });
  check('an unhurt raider never runs', whole.every(r => r[2] !== 'run'));
  const half = fly('drone', { secs: 20, hit: [5, 15] });
  check('a drone at half hull (one of your shots) does not run; at 10 of 30 it does', half.every(r => r[2] !== 'run') && fly('drone', { secs: 20, hit: [5, 10] }).some(r => r[2] === 'run'));
  const gun = fly('gunship', { secs: 30, hit: [16, 25] });
  check('a gunship at 25 of 80 runs too', gun.some(r => r[2] === 'run') && gun.filter(r => r[2] === 'run').every(r => r[4] === false));
}

console.log('the convoy: a target that moves at the freighter\'s 130');
for (const type of ['raider', 'drone', 'gunship']) {
  const def = P[type], rows = after(fly(type, { secs: 60, tv: 130, from: 700 }), 12), d = rows.map(r => r[1]);
  const inRange = rows.filter(r => r[1] < def.range).length / rows.length;
  check(`the ${type} keeps up with it: in gun range ${type === 'gunship' ? 'most' : '90%'} of the time`, inRange > (type === 'gunship' ? 0.6 : 0.9), (inRange * 100).toFixed(0) + '%');
  check(`the ${type} does not ram it: never nearer than 40 px`, min(d) > 40, Math.round(min(d)));
}

console.log('the page wiring');
{
  check('a pirate is made with no move yet and has not run', /d\.move = null; d\.moveUntil = 0; d\.ran = false/.test(J('spawnPirate.toString()')));
  check('pirateAI flies what pirateSteer says and shoots only when it allows', /pirateSteer\(d, def, dist, target, time, d\.body\.velocity\.x - tv\.x, d\.body\.velocity\.y - tv\.y\)/.test(J('pirateAI.toString()')) && /m\.fire && dist < def\.range/.test(J('pirateAI.toString()')));
  check('held off (launch grace, out of range) it still drifts with the engine off', /d\.calm\) \{ d\.body\.setAcceleration\(0, 0\)/.test(J('pirateAI.toString()')));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
