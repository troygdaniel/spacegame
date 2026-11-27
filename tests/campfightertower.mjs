// smoke: 3.2's fighter job (card space-game-fighter-job-32; BRIEF 8 proposal C): a tower inside whose range the fighter the player flies is turns on it, not on a nearer cruiser, so it cannot fire at the cruiser; (plain Node, no Chrome)
// src/campaign.js campTowerAI (the flown fighter in range is the target), CAMP.tower.flownTurn / flownSpeed (brief 7 decision 5: the gun turns 1.5 times as fast and the shot flies 1.3 times as fast against it).
// Run: node tests/campfightertower.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// 3.2 (level 3, mission 2): one tower kept, the rest of the aliens and your other ships put away; the cruiser and the fighter placed by the test
g.run(`window.T = {}; T.make = seed => { const C = campNew(3, [], { seed, mission: 1 }); C.arrivedAt = 0; CAMP.flags.cockpit = true; C.waves.forEach(w => { w.started = true; }); const tw = C.ships.filter(u => u.kind === 'tower'); const T0 = tw[0]; C.ships.forEach(u => { if (u.team === 'alien' && u !== T0) u.hp = 0; });
    T0.hp = T0.maxHp = 1e9; T0.x = 0; T0.y = 0; T0.rot = 0; C.__t = T0; const car = C.carrier; car.hp = 1e9; const fs = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter'); C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'fighter' && u !== car) u.hp = 0; });
    fs.forEach((u, i) => { u.x = 9000; u.y = 9000 + i * 400; u.vx = 0; u.vy = 0; u.hp = 1e9; }); C.__f = fs[0]; return C; };
  T.place = (C, cx, cy, fx, fy) => { const car = C.carrier; car.x = cx; car.y = cy; car.vx = 0; car.vy = 0; const f = C.__f; f.x = fx; f.y = fy; f.vx = 0; f.vy = 0; };
  T.run = (C, secs, cx, cy, fx, fy) => { const shots = []; for (let i = 0; i < 30 * secs; i++) { const b0 = C.bullets.length; T.place(C, cx, cy, fx, fy); C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); C.bullets.forEach(b => { if (b.team === 'alien' && !b.__seen) { b.__seen = true; shots.push(Math.atan2(b.vy, b.vx)); } }); } return shots; };`);

// ---- the target ----
const a = J(`(() => { const C = T.make(2); const sh = T.run(C, 6, 300, 0, 0, 600); return { shots: sh.length, rot: +C.__t.rot.toFixed(2), flown: false }; })()`);
check('no fighter flown: the tower turns on the nearest ship, the cruiser (300 px away, east): it faces east and its shots go east', a.shots > 0 && Math.abs(a.rot) < 0.3, JSON.stringify(a));
const b = J(`(() => { const C = T.make(2); campCockpitTake(C, C.__f.id); const sh = T.run(C, 6, 300, 0, 0, 600); const toF = Math.PI / 2, off = sh.map(r => Math.abs(Math.atan2(Math.sin(r - toF), Math.cos(r - toF)))); return { shots: sh.length, rot: +C.__t.rot.toFixed(2), worst: +Math.max(...off).toFixed(2), flown: !!campCockpitFlown(C) }; })()`);
check('the fighter flown 600 px away (south) with the cruiser nearer (300 px, east): the tower turns on the fighter, it faces south', b.flown && b.shots > 0 && Math.abs(b.rot - Math.PI / 2) < 0.3, JSON.stringify(b));
check('and every shot it fires goes at the fighter (within 0.35 rad of its bearing): none at the cruiser', b.worst < 0.35, JSON.stringify(b));
const c = J(`(() => { const C = T.make(2); campCockpitTake(C, C.__f.id); const sh = T.run(C, 6, 300, 0, 0, 900); return { shots: sh.length, rot: +C.__t.rot.toFixed(2) }; })()`);
check('the fighter flown OUT of the tower\'s range (900 px, the range is 800): the tower turns on the nearest ship again, the cruiser', c.shots > 0 && Math.abs(c.rot) < 0.3, JSON.stringify(c));
const d = J(`(() => { const C = T.make(2); campCockpitTake(C, C.__f.id); campCockpitGive(C, 'hand'); const sh = T.run(C, 6, 300, 0, 0, 600); return { rot: +C.__t.rot.toFixed(2) }; })()`);
check('the stick given back: the pilot\'s fighter is no one\'s decoy: the tower is back on the nearest ship, the cruiser', Math.abs(d.rot) < 0.3, JSON.stringify(d));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP FIGHTER TOWER OK (${n} checks)`);
process.exit(failed ? 1 : 0);
