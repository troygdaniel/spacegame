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
  window.__started = () => C.waves.filter((w, k) => !C.L.waves[k].optional).map(w => !!w.started); // (the idle threat's waves are optional: section G has them)`);

console.log('A. 3.1: a scan and its wave');
g.run('__mk(0)');
check('three waves, one for each scan, none of them on a clock: each waits for its scan to begin (on.scanning 0, 1, 2)', J('C.L.waves.slice(0, 3).map(w => w.on && w.on.scanning).join()') === '0,1,2' && J('C.L.waves.every(w => w.at == null)'));
check('nothing comes while no ship of ours is in a ring', (g.run('__run(40)'), J('__started().join()') === 'false,false,false' && J('__alive()') === 0));
g.run('{ const p = C.scan[0]; C.carrier.x = p.x; C.carrier.y = p.y; C.carrier.vx = C.carrier.vy = 0; } __run(1);');
check('the first scan begins the moment the cruiser is in its ring: its wave starts then (not when the scan is done), the others do not', J('__started().join()') === 'true,false,false' && J('C.scan[0].began') === true && J('C.scan[0].t') > 0 && J('C.scan[1].began') === false, J('__started().join()') + ' ' + J('C.scan[0].t'));
g.run('{ const p = C.scan[1]; C.carrier.x = p.x; C.carrier.y = p.y; } __run(1);');
check('the second scan\'s wave comes when the second begins', J('__started().join()') === 'true,true,false');
g.run('{ const p = C.scan[2]; C.carrier.x = p.x; C.carrier.y = p.y; } __run(1);');
check('and the third\'s', J('__started().join()') === 'true,true,true');
check('the waves come out at their own side of the field, each at its own place (not one spot)', J('(() => { const f = C.L.waves.slice(0, 3).map(w => w.from.join()); return new Set(f).size === 3; })()'));

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
check('four towers, three groups (on 1, 2 and 3 towers down), each out from behind a tower: nearTower', J('C.towerN') === 4 && J('C.L.waves.slice(0, 3).map(w => w.on.towers).join()') === '1,2,3' && J('C.L.waves.slice(0, 3).every(w => w.nearTower > 0)'));
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
check('two waves, both on the fourth tower down (no clock), then the four idle groups', J('C.L.waves.filter(w => !w.optional).length') === 2 && J('C.L.waves.filter(w => !w.optional).every(w => w.on && w.on.towers === 4 && w.at == null)') && J('C.L.waves.length') === 6);
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

console.log('G. the idle threats (Troy\'s yes, 26 Nov: 3.1 the picket, 3.2 the reserve)');
g.run(`window.__kill = () => C.ships.forEach(u => { if (u.team === 'alien' && u.kind !== 'tower') u.hp = 0; }); window.__idleN = () => C.waves.map((w, k) => (w.started && C.L.waves[k].optional) ? 1 : 0).join(''); // (one digit a wave: the three scan waves first, then the four idle ones)`);
g.run('__mk(0, 7); __run(59);');
check('3.1: four optional waves on the idle clock (60, 100, 140, 180 s, until a scan has begun), after the three scan waves', J('C.L.waves.slice(3).map(w => w.on.idle + w.on.until + w.optional).join()') === '60scantrue,100scantrue,140scantrue,180scantrue' && J('C.L.waves.slice(0, 3).every(w => !w.optional)'));
check('59 s in with no scan begun: nothing yet', J('C.waves.slice(3).every(w => !w.started)'));
g.run('__run(2);');
check('at 60 s the picket leaves: 3 raiders and a gunship, for the cruiser, born about 1,800 px from it toward the planet', J('C.waves[3].started') === true && J('(() => { const a = C.ships.filter(u => u.team === "alien" && u.wave === 3); return a.length === 4 && a.filter(u => u.kind === "raider").length === 3 && a.filter(u => u.kind === "gunship").length === 1 && a.every(u => u.goal === "carrier"); })()') && J('(() => { const a = C.ships.filter(u => u.team === "alien" && u.wave === 3), c = C.carrier; return a.every(u => { const d = Math.hypot(u.x - c.x, u.y - c.y); return d > 1200 && d < 2400; }); })()'));
check('it comes from the planet\'s side: its middle is nearer the planet than the cruiser is', J('(() => { const a = C.ships.filter(u => u.team === "alien" && u.wave === 3), c = C.carrier, mx = a.reduce((s, u) => s + u.x, 0) / a.length, my = a.reduce((s, u) => s + u.y, 0) / a.length; return Math.hypot(mx, my) < Math.hypot(c.x, c.y); })()'));
g.run('__kill(); { const p = C.scan[0]; C.carrier.x = p.x; C.carrier.y = p.y; C.carrier.vx = C.carrier.vy = 0; C.arrivedAt = 0; } __run(1);');
g.run('__run(45);');
check('once a scan has begun no more patrols come (the one due at 100 s never does)', J('C.scan[0].began') === true && J('__idleN()') === '0001000', J('__idleN()'));
g.run('__mk(0, 8); C.arrivedAt = 0; __run(2); __kill(); __run(100); __kill(); __run(100); __kill(); __run(100); __kill(); __run(100);');
check('with no scan ever begun: four patrols and no more (at 400 s, the four waves have come, there is no fifth)', J('__idleN()') === '0001111' && J('C.waves.length') === 7);
g.run('__mk(0, 9); C.arrivedAt = null; __run(150);');
check('a cruiser that never reaches the place: the clock starts 120 s after the start (nothing at 150 s)...', J('C.waves.slice(3).every(w => !w.started)'));
g.run('__run(32);');
check('...and the picket finds it at 180 s (60 s on the idle clock)', J('C.waves[3].started') === true && J('CAMP.mission.idleTrip') === 120);
g.run('__mk(0, 10); C.arrivedAt = 0; for (let i = 0; i < 3; i++) { C.scan[i].got = true; C.scan[i].began = true; C.waves[i].started = true; } C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; });');
check('a player who scans never has to beat the idle waves: "clear" is met by the scan waves alone', J('campObjectives(C).find(o => o.type === "clear").done') === true && J('C.waves.slice(3).every(w => !w.started)'));
g.run('__mk(1, 11); C.arrivedAt = 0; __run(44);');
check('3.2: the reserve waits for 45 s (nothing at 44 s)', J('C.L.waves.slice(3).map(w => w.on.idle + w.on.until).join()') === '45tower,85tower,125tower,165tower' && J('C.waves.slice(3).every(w => !w.started)'));
g.run('__run(2);');
check('at 45 s with no tower fallen: 2 drones and 2 gunships for the cruiser, born toward the nearest tower', J('C.waves[3].started') === true && J('(() => { const a = C.ships.filter(u => u.team === "alien" && u.wave === 3); return a.length === 4 && a.filter(u => u.kind === "drone").length === 2 && a.filter(u => u.kind === "gunship").length === 2 && a.every(u => u.goal === "carrier"); })()'));
g.run('{ const t = C.ships.find(u => u.kind === "tower"); t.hp = 0; campKill(C, t); } __kill(); __run(45);');
check('a tower falls: the reserve stops (the one due at 85 s does not come)', J('C.waves[4].started') === false && J('C.waves[5].started') === false);
check('3.2 needs the tower groups cleared only: the optional waves are not required for "clear"', J('C.L.waves.slice(3).every(w => w.optional)') && J('C.L.waves.slice(0, 3).every(w => !w.optional)'));

console.log('H. 3.3\'s idle reserve (card space-game-33-idle-threat) and the briefing');
g.run('__mk(2, 12); C.arrivedAt = 0; __run(44);');
check('3.3: the reserve waits for 45 s (nothing at 44 s); four optional groups on the idle clock 45, 85, 125, 165 until a tower falls', J('C.L.waves.slice(2).map(w => w.on.idle + w.on.until + w.optional).join()') === '45towertrue,85towertrue,125towertrue,165towertrue' && J('C.waves.slice(2).every(w => !w.started)'));
g.run('__run(2);');
check('at 45 s with no tower fallen: 2 raiders and 2 gunships for the cruiser, born toward the nearest tower', J('C.waves[2].started') === true && J('(() => { const a = C.ships.filter(u => u.team === "alien" && u.wave === 2); return a.length === 4 && a.filter(u => u.kind === "raider").length === 2 && a.filter(u => u.kind === "gunship").length === 2 && a.every(u => u.goal === "carrier"); })()'));
g.run('{ const t = C.ships.find(u => u.kind === "tower"); t.hp = 0; campKill(C, t); } __kill(); __run(45);');
check('a tower falls: no more groups (the one due at 85 s does not come); the two waves of the fourth tower are still to come', J('C.waves[3].started') === false && J('C.waves[0].started') === false);
check('the mission does not need the idle groups for "clear" (they are optional), only the two waves', J('C.L.waves.slice(2).every(w => w.optional)') && J('C.L.waves.slice(0, 2).every(w => !w.optional)'));
check('the briefing counts only what a player who plays meets: 3.1 "Expect 6 raiders, 2 drones, 2 gunships.", 3.2 two raiders, four drones, two gunships and four towers, 3.3 two raiders, two drones, four gunships and eight towers (the idle groups are not in it)', J('campBriefEnemies(3, 0).line') === 'Expect 6 raiders, 2 drones, 2 gunships.' && J('campBriefEnemies(3, 1).line') === 'Expect 2 raiders, 4 drones, 2 gunships, 4 defence towers.' && J('campBriefEnemies(3, 2).line') === 'Expect 2 raiders, 2 drones, 4 gunships, 8 defence towers.');
check('and the one-page briefing\'s word for the waves counts the real ones: "Two" for 3.3, "Three" for 3.1 and 3.2', J('scrMomentVars(campMissionRow(3, 2)).wavesword') === 'Two' && J('scrMomentVars(campMissionRow(3, 0)).wavesword') === 'Three' && J('scrMomentVars(campMissionRow(3, 1)).wavesword') === 'Three');

console.log('F. the cruiser\'s own game is the same where it should be');
check('a tower\'s shot at the cruiser is the old one (turn 3 rad/s, 440 px/s: the factors are for the flown fighter only)', J('[CAMP.tower.turn, CAMP.tower.bullet]').join() === '3,440');

console.log(failed ? `\nFAIL: ${failed} of ${n} checks failed` : `\nLEVEL 3 WAVES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
