// smoke: 3.2 and 3.3's towers: a tower that turns on the fighter you fly fires its first shot CAMP.tower.flownDelay (1 s) late, with a ring closing on it (a 'towertell' event the scene draws), and not at any other ship (plain Node, no Chrome)
// Card space-game-b12-c9-tower-delay (the cloud's BRIEF 12 chunk 9; Troy, 27 Nov 2026: yes): "a warning, not a weaker tower". src/campaign.js campTowerAI (u.onFlown, u.armAt, the 'towertell' event), CAMP.tower.flownDelay; the picture is campaignscene.js towerTell.
//   A. the table: 1000 ms (0 is no delay)
//   B. the fighter you fly, 600 px south of the tower with the cruiser nearer: the first shot is at least 1 s after the tower began to turn on it, one tell, the shot after it on the tower's own rhythm
//   C. the same at flownDelay 0: no delay and no tell (the tower as it was)
//   D. a tower on any other ship (the cruiser, a wing fighter nobody flies): no delay, no tell
//   E. the lock: one tell for a fighter held in range, a second one when it leaves the range and comes back, none for the stick given back
//   F. the picture's hook is in the scene
// Run: node tests/camptowerdelay.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// 3.2 (level 3, mission 2): one tower kept, the rest of the aliens and your other ships put away (as tests/campfightertower.mjs does); the cruiser and the fighter placed by the test
g.run(`window.T = {}; T.make = seed => { const C = campNew(3, [], { seed, mission: 1 }); C.arrivedAt = 0; CAMP.flags.cockpit = true; C.waves.forEach(w => { w.started = true; }); const tw = C.ships.filter(u => u.kind === 'tower'); const T0 = tw[0]; C.ships.forEach(u => { if (u.team === 'alien' && u !== T0) u.hp = 0; });
    T0.hp = T0.maxHp = 1e9; T0.x = 0; T0.y = 0; T0.rot = 0; T0.nextShot = 0; C.__t = T0; const car = C.carrier; car.hp = 1e9; const fs = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter'); C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'fighter' && u !== car) u.hp = 0; });
    fs.forEach((u, i) => { u.x = 9000; u.y = 9000 + i * 400; u.vx = 0; u.vy = 0; u.hp = 1e9; }); C.__f = fs[0]; return C; };
  T.place = (C, cx, cy, fx, fy) => { const car = C.carrier; car.x = cx; car.y = cy; car.vx = 0; car.vy = 0; const f = C.__f; f.x = fx; f.y = fy; f.vx = 0; f.vy = 0; };
  // run secs (30 steps a second) with the cruiser at (cx, cy) and the fighter at (fx, fy); the seconds each alien shot appeared at (from the start of this run), the tells
  T.run = (C, secs, cx, cy, fx, fy, o) => { o = o || { shots: [], tells: [], step: 0 }; for (let i = 0; i < Math.round(30 * secs); i++, o.step++) { T.place(C, cx, cy, fx, fy); C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); C.bullets.forEach(b => { if (b.team === 'alien' && !b.__seen) { b.__seen = true; o.shots.push(+((o.step + 1) / 30).toFixed(2)); } }); C.events.forEach(e => { if (e.type === 'towertell') o.tells.push({ at: +((o.step + 1) / 30).toFixed(2), id: e.id, ms: e.ms, x: e.x, y: e.y }); }); C.events.length = 0; } return o; };
  T.go = (delay, flown, fx, fy, secs, seed) => { CAMP.tower.flownDelay = delay; const C = T.make(seed || 2); if (flown) campCockpitTake(C, C.__f.id); const o = T.run(C, secs || 6, 300, 0, fx, fy); o.tower = C.__t.id; return o; };`);

console.log('A. the table');
check('CAMP.tower.flownDelay is 1000 ms (the cloud\'s starting point; 0 is no delay)', J('CAMP.tower.flownDelay') === 1000, J('CAMP.tower.flownDelay'));

console.log('B. the fighter you fly, 600 px south, the cruiser nearer (300 px east)');
const b = J('T.go(1000, true, 0, 600, 6)');
check('the tower fires at it (shots came) and its first shot is at least 1 s after it began to turn on it (and not later than 1.4 s: the tell is a beat, not a pause)', b.shots.length > 1 && b.shots[0] >= 1 && b.shots[0] <= 1.4, JSON.stringify(b.shots));
check('one tell, from the first step, with the tower\'s id, 1000 ms and the tower\'s place', b.tells.length === 1 && b.tells[0].at <= 0.1 && b.tells[0].ms === 1000 && b.tells[0].id === b.tower && b.tells[0].x === 0 && b.tells[0].y === 0, JSON.stringify(b.tells));
check('the shots after the first are on its own rhythm: 1.3 to 1.9 s apart (it is a warning, not a weaker tower)', b.shots.slice(1).every((t, i) => { const d = t - b.shots[i]; return d >= 1.25 && d <= 1.95; }), JSON.stringify(b.shots));

console.log('C. the same at flownDelay 0');
const c = J('T.go(0, true, 0, 600, 6)');
check('no delay: the first shot is within 0.6 s (the gun turns about a quarter turn first) and no tell', c.shots.length > 1 && c.shots[0] < 0.6 && c.tells.length === 0, JSON.stringify({ shots: c.shots, tells: c.tells }));

console.log('D. a tower on any other ship');
const d1 = J('T.go(1000, false, 0, 600, 6)'), d2 = J('T.go(1000, false, 9000, 9000, 6)');
check('the stick not taken: the tower turns on the nearest ship (the fighter 600 px away is the pilot\'s own, nearest is the cruiser at 300): first shot within 0.6 s, no tell', d1.shots.length > 1 && d1.shots[0] < 0.6 && d1.tells.length === 0, JSON.stringify({ shots: d1.shots, tells: d1.tells }));
check('the cruiser alone in its range: first shot within 0.6 s, no tell', d2.shots.length > 1 && d2.shots[0] < 0.6 && d2.tells.length === 0, JSON.stringify({ shots: d2.shots, tells: d2.tells }));

console.log('E. the lock');
const e = J(`(() => { CAMP.tower.flownDelay = 1000; const C = T.make(2); campCockpitTake(C, C.__f.id); const o = T.run(C, 3, 300, 0, 0, 600); const before = o.tells.length; T.run(C, 2, 300, 0, 0, 900, o); const away = o.tells.length; T.run(C, 3, 300, 0, 0, 600, o); const back = o.tells.length; campCockpitGive(C, 'hand'); T.run(C, 2, 300, 0, 0, 900, o); T.run(C, 3, 300, 0, 0, 600, o); return { before, away, back, after: o.tells.length, tells: o.tells }; })()`);
check('held in range for three seconds: one tell', e.before === 1, JSON.stringify(e));
check('flown out of its range (900 px, the range is 800) for two seconds: no new tell', e.away === 1, JSON.stringify(e));
check('flown back in: a second tell, and another 1 s before the shot', e.back === 2, JSON.stringify(e));
check('the stick given back: no tell for the pilot\'s own fighter', e.after === 2, JSON.stringify(e));
const e2 = J(`(() => { CAMP.tower.flownDelay = 1000; const C = T.make(2); campCockpitTake(C, C.__f.id); const o = T.run(C, 3, 300, 0, 0, 600); const was = o.shots.length; T.run(C, 2, 300, 0, 0, 900, o); const o2 = { shots: [], tells: [], step: 0 }; T.run(C, 2.5, 300, 0, 0, 600, o2); return { was, first: o2.shots[0], tells: o2.tells.length }; })()`);
check('flown back in after a gap: its first shot is again at least 1 s after it turned on it', e2.first >= 1 && e2.tells === 1, JSON.stringify(e2));

console.log('F. the picture');
{
  const src = readFileSync(new URL('../src/campaignscene.js', import.meta.url), 'utf8');
  check('the scene draws the tell: a towerTell(e) method (the ring closing over e.ms) and the event branch for \'towertell\'', /towerTell\(e\)\s*\{/.test(src) && /e\.type === 'towertell'\) this\.towerTell\(e\)/.test(src));
}
g.run('CAMP.tower.flownDelay = 1000;');

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP TOWER DELAY OK (${n} checks)`);
process.exit(failed ? 1 : 0);
