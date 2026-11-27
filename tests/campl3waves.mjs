// smoke: level 3 comes on what the player does (brief 7 decisions 1, 3 and 5): a scan's wave arrives when that scan starts, a scan stops while the cruiser is hit and goes on 2 s after, each tower that falls calls a group out from behind the next one, 3.3's two waves come together from opposite sides at the fourth tower, and a tower turns and shoots faster at the fighter the player flies (plain Node, no Chrome)
// Card space-game-b7-level3. The numbers of the waves are a first try (the bots measure them: docs/CAMPAIGN-TUNING.md); what is pinned here is the rule, not the counts.
// Run: node tests/campl3waves.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(), J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.__mk = (m, seed) => { const C = window.C = campNew(3, ['shield', 'plating'], { seed: seed || 1, mission: m }); C.arrivedAt = 0; return C; };
  window.__run = (secs) => { for (let i = 0; i < secs * 30; i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__alive = () => C.ships.filter(u => u.team === 'alien' && u.hp > 0).length;
  window.__started = () => C.waves.map(w => !!w.started);`);

console.log('A. 3.1: a scan and its wave');
g.run('__mk(0)');
check('three waves, one for each scan, none of them on a clock: each waits for its scan to begin (on.scanning 0, 1, 2)', J('C.L.waves.map(w => w.on && w.on.scanning).join()') === '0,1,2' && J('C.L.waves.every(w => w.at == null)'));
check('nothing comes while no ship of ours is in a ring', (g.run('__run(40)'), J('__started().join()') === 'false,false,false' && J('__alive()') === 0));
g.run('{ const p = C.scan[0]; C.carrier.x = p.x; C.carrier.y = p.y; C.carrier.vx = C.carrier.vy = 0; } __run(1);');
check('the first scan begins the moment the cruiser is in its ring: its wave starts then (not when the scan is done), the others do not', J('__started().join()') === 'true,false,false' && J('C.scan[0].began') === true && J('C.scan[0].t') > 0 && J('C.scan[1].began') === false, J('__started().join()') + ' ' + J('C.scan[0].t'));
g.run('{ const p = C.scan[1]; C.carrier.x = p.x; C.carrier.y = p.y; } __run(1);');
check('the second scan\'s wave comes when the second begins', J('__started().join()') === 'true,true,false');
g.run('{ const p = C.scan[2]; C.carrier.x = p.x; C.carrier.y = p.y; } __run(1);');
check('and the third\'s', J('__started().join()') === 'true,true,true');
check('the waves come out at their own side of the field, each at its own place (not one spot)', J('(() => { const f = C.L.waves.map(w => w.from.join()); return new Set(f).size === 3; })()'));

console.log('B. a scan stops while the cruiser is hit');
g.run('__mk(0, 2); C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); { const p = C.scan[0]; C.carrier.x = p.x; C.carrier.y = p.y; C.carrier.vx = C.carrier.vy = 0; } __run(2);');
const t0 = J('C.scan[0].t');
check('in the ring and unhurt, the scan runs (2 s of it)', t0 > 1.9 && t0 < 2.1, t0);
g.run('C.carrier.hurtAt = C.t; ');
g.run('__run(1);'); const t1 = J('C.scan[0].t');
check('one second after a hit it stands still', Math.abs(t1 - t0) < 1e-9, [t0, t1]);
g.run('__run(1.2);'); const t2 = J('C.scan[0].t');
check('...and goes on once 2 s have passed since the hit (2.2 s on: running again)', t2 > t1 + 0.1, [t1, t2]);
g.run('C.carrier.hurtAt = C.t; __run(1.9);'); const t3 = J('C.scan[0].t');
g.run('__run(0.3);'); const t4 = J('C.scan[0].t');
check('a second hit starts the two seconds again', Math.abs(t3 - t2) < 1e-9 && t4 > t3, [t2, t3, t4]);
check('only a hit on the cruiser stops it (the pause is 2 s in the mission\'s row, and no other mission has one)', J('campMissions(3)[0].objectives[0].pause') === 2 && [1, 2].every(l => J(`campMissions(${l}).every(m => (m.objectives || []).every(o => !o.pause))`)));

console.log('C. 3.2: each tower that falls calls a group');
g.run('__mk(1, 3)');
check('four towers, three groups (on 1, 2 and 3 towers down), each out from behind a tower: nearTower', J('C.towerN') === 4 && J('C.L.waves.map(w => w.on.towers).join()') === '1,2,3' && J('C.L.waves.every(w => w.nearTower > 0)'));
check('no group while all four stand', (g.run('__run(5)'), J('__started().join()') === 'false,false,false'));
g.run('{ const t = C.ships.filter(u => u.kind === "tower"); t[0].hp = 0; campKill(C, t[0]); } __run(0.1);');
check('the first tower falls: the first group comes, the others wait', J('__started().join()') === 'true,false,false');
g.run('{ const t = C.ships.filter(u => u.kind === "tower" && u.hp > 0); window.__next = campNearest(t, C.carrier); window.__wave = C.ships.filter(u => u.team === "alien" && u.wave === 1); }');
g.run('{ const t = C.ships.filter(u => u.kind === "tower" && u.hp > 0); t[0].hp = 0; campKill(C, t[0]); } __run(0.1);');
check('the second fall calls the second group and the third the third', J('__started().join()') === 'true,true,false' && (g.run('{ const t = C.ships.filter(u => u.kind === "tower" && u.hp > 0); t[0].hp = 0; campKill(C, t[0]); } __run(0.1);'), J('__started().join()') === 'true,true,true'));
g.run('__mk(1, 4); C.ships.filter(u => u.kind === "tower").forEach((t, i) => { if (i < 1) { t.hp = 0; campKill(C, t); } });');
g.run('{ const nt = campNearest(C.ships.filter(u => u.kind === "tower" && u.hp > 0), C.carrier); window.__nt = nt; const a = Math.atan2(nt.y - C.carrier.y, nt.x - C.carrier.x); window.__exp = [nt.x + Math.cos(a) * 700, nt.y + Math.sin(a) * 700]; } __run(0.05);');
check('the group is born 700 px behind the tower nearest the cruiser, seen from the cruiser (within the spawn\'s 300 px scatter)', J('(() => { const g = C.ships.filter(u => u.team === "alien" && u.wave === 0); return g.length > 0 && g.every(u => Math.hypot(u.x - __exp[0], u.y - __exp[1]) < 560); })()'), J('C.ships.filter(u => u.team === "alien").map(u => [Math.round(u.x), Math.round(u.y)])') + ' ' + J('__exp'));
check('the mission is not won by the last tower while a group is left: it needs the waves cleared too', J('campMissions(3)[1].objectives.map(o => o.type).join()') === 'kill,clear');

console.log('D. 3.3: two waves together, from opposite sides');
g.run('__mk(2, 5)');
check('two waves, both on the fourth tower down (no clock)', J('C.L.waves.length') === 2 && J('C.L.waves.every(w => w.on && w.on.towers === 4 && w.at == null)'));
check('nothing comes before the fourth falls (three down)', (g.run('{ const t = C.ships.filter(u => u.kind === "tower"); for (let i = 0; i < 3; i++) { t[i].hp = 0; campKill(C, t[i]); } } __run(40);'), J('__started().join()') === 'false,false'));
g.run('{ const t = C.ships.filter(u => u.kind === "tower" && u.hp > 0); t[0].hp = 0; campKill(C, t[0]); } __run(0.1);');
check('the fourth: both waves in the same tick', J('__started().join()') === 'true,true' && J('C.waves[0].at') === J('C.waves[1].at'));
check('and from opposite sides of the world: the two spawn points are on opposite sides of its centre', J('(() => { const a = C.L.waves[0].from, b = C.L.waves[1].from; return a[0] * b[0] + a[1] * b[1] < 0 && Math.abs(a[0] + b[0]) < 700 && Math.abs(a[1] + b[1]) < 700; })()'), J('C.L.waves.map(w => w.from)'));
check('par is 180 s, the swift bonus too', J('campMissions(3)[2].par') === 180 && J('campMissions(3)[2].bonus.find(b => b.id === "swift").secs') === 180);

console.log('E. towers and the ship the player flies');
g.run(`window.__probe = (flown, turnTest) => { CAMP.flags.cockpit = true; const C2 = __mk(1, 6); campOrder(C2, 'launch'); __run(3);
  const f = C2.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked), tw = C2.ships.find(u => u.kind === 'tower' && u.hp > 0);
  if (flown) campCockpitTake(C2, f.id);
  C2.ships.forEach(u => { if (u !== tw && u !== f && u.team === 'earth') { u.x = 1e6; u.y = 1e6; } }); C2.carrier.x = 1e6; C2.carrier.y = 1e6;
  f.x = tw.x + (turnTest ? 0 : 300); f.y = tw.y + (turnTest ? 300 : 0); f.vx = f.vy = 0; tw.rot = 0; tw.nextShot = 0; C2.bullets.length = 0;
  const r0 = tw.rot; campTowerAI(C2, tw, 1 / 30); const out = { turned: Math.abs(tw.rot - r0), speed: C2.bullets.length ? Math.hypot(C2.bullets[0].vx, C2.bullets[0].vy) : null }; CAMP.flags.cockpit = false; return out; };`);
const tf = J('__probe(true, true)'), tn = J('__probe(false, true)'), sf = J('__probe(true, false)'), sn = J('__probe(false, false)');
check('the tower turns 1.5 times as fast at the flown fighter as at the same fighter on its own', tn.turned > 0 && Math.abs(tf.turned / tn.turned - 1.5) < 0.02, JSON.stringify([tf, tn]));
check('and its shot flies 1.3 times as fast (the tower\'s own 440 px/s, 572 at the flown fighter)', sf.speed != null && sn.speed != null && Math.abs(sf.speed / sn.speed - 1.3) < 0.02 && Math.abs(sn.speed - 440) < 2, JSON.stringify([sf, sn]));
check('the two numbers are in the tower table: CAMP.tower.flownTurn 1.5 and flownSpeed 1.3', J('[CAMP.tower.flownTurn, CAMP.tower.flownSpeed]').join() === '1.5,1.3');

console.log('F. the cruiser\'s own game is the same where it should be');
check('a tower\'s shot at the cruiser is the old one (turn 3 rad/s, 440 px/s: the factors are for the flown fighter only)', J('[CAMP.tower.turn, CAMP.tower.bullet]').join() === '3,440');

console.log(failed ? `\nFAIL: ${failed} of ${n} checks failed` : `\nLEVEL 3 WAVES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
