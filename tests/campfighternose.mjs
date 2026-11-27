// smoke: while a fighter is flown ] and \ pick the hostile nearest the fighter's NOSE (distance times the angle off it), not the one nearest the cruiser; in the cruiser it is the plain distance, as it was (plain Node, no Chrome)
// Card space-game-chunk9-pick-from-nose (Troy, 26 Nov 2026, BRIEF 8 decision 7). src/camptarget.js campTgtList / campTgtScore, CAMP.target.nose.
// Run: node tests/campfighternose.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// the cruiser at the origin; the fighter flown 3,000 px east of it, nose pointing east (rot 0); two hostiles: A 600 px from the cruiser but BEHIND the fighter's nose side (west of the fighter, 3,600 away), B east of the fighter 1,500 ahead of its nose (4,500 from the cruiser)
g.run(`window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3 }); CAMP.flags.cockpit = true; campOrder(C, 'launch'); for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0;
  C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); campStep(C, 1 / 30);
  const c = C.carrier; c.x = 0; c.y = 0; const f = C.ships.find(x => x.team === 'earth' && x.kind === 'fighter' && x.hp > 0 && !x.docked); f.x = 3000; f.y = 0; f.rot = 0; f.vx = 0; f.vy = 0;
  const A = campSpawn(C, 'raider', 600, 200), B = campSpawn(C, 'raider', 4500, 0); A.hold = true; B.hold = true; C.__A = A.id; C.__B = B.id; C.__f = f.id; window.__seen = campSeen; campSeen = () => true; return C; };`);
const base = J(`(() => { const C = __mk(); return { list: campTgtList(C).map(u => u.id === C.__A ? 'A' : u.id === C.__B ? 'B' : '?'), nose: CAMP.target.nose }; })()`);
check('in the cruiser (no fighter flown): nearest the cruiser first: A (600 px) before B (4,500 px)', base.list.join() === 'A,B', JSON.stringify(base));
const flown = J(`(() => { const C = __mk(); campCockpitTake(C, C.__f); const a = campTgtList(C).map(u => u.id === C.__A ? 'A' : 'B'); const first = campTgtCycle(C); const id = first && (first.id === C.__A ? 'A' : 'B'); return { a, first: id, flown: !!campCockpitFlown(C) }; })()`);
check('flown, nose east: B (1,500 px dead ahead) is picked before A (2,400 px behind it), by ] at the first press', flown.flown && flown.a.join() === 'B,A' && flown.first === 'B', JSON.stringify(flown));
const turned = J(`(() => { const C = __mk(); campCockpitTake(C, C.__f); C.by[C.__f].rot = Math.PI; return campTgtList(C).map(u => u.id === C.__A ? 'A' : 'B').join(); })()`);
check('flown, nose turned west: A is dead ahead (2,400 px) and goes first; B (1,500 px behind) goes second', turned === 'A,B', turned);
const near = J(`(() => { const C = __mk(); campCockpitTake(C, C.__f); const f = C.by[C.__f]; const X = campSpawn(C, 'raider', 3000, 400), Y = campSpawn(C, 'raider', 3600, 0); X.hold = true; Y.hold = true; return campTgtList(C).map(u => u.id === X.id ? 'X' : u.id === Y.id ? 'Y' : u.id === C.__A ? 'A' : 'B').join(); })()`);
check('distance still counts: Y (600 px dead ahead) goes before X (400 px off to the side, score about 1,570) , and X is in the first three', near.split(',').indexOf('Y') < near.split(',').indexOf('X') && near.split(',').indexOf('X') <= 2, near);
const back = J(`(() => { const C = __mk(); campCockpitTake(C, C.__f); C.by[C.__f].rot = 0; C.ships.forEach(u => { if (u.id === C.__B) u.hp = 0; }); campStep(C, 1 / 30); return campTgtList(C).map(u => u.id === C.__A ? 'A' : '?').join(); })()`);
check('one behind is still on the list (picked last, not never): with B dead A is still the first press', back === 'A', back);
const off = J(`(() => { const C = __mk(); campCockpitTake(C, C.__f); CAMP.target.nose = 0; const r = campTgtList(C).map(u => u.id === C.__A ? 'A' : 'B').join(); CAMP.target.nose = 2.5; return r; })()`);
check('nose 0 is the plain distance from the fighter (B 1,500 px, A 2,400 px): B,A', off === 'B,A', off);
check('the number is in the table: CAMP.target.nose is 2.5', J('CAMP.target.nose') === 2.5);

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP FIGHTER NOSE OK (${n} checks)`);
process.exit(failed ? 1 : 0);
