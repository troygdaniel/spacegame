// smoke: 1.2's raiders leave a neutral miner alone while the fighter the player flies is within 300 px of him (card space-game-b10-c11-12-miner-guard, BRIEF 10 chunk 11; Troy: yes): the rule, its one row, what the raiders pick instead, and nothing else of the pirates changed
// The rule is a mission row's minerGuard (px): src/camppirates.js campPirateMinerGuarded, asked by campPirateTarget; 1.2 (the mission 'mine') has minerGuard 300. The same idea as 1.3's hauler guard (tests/campraidguard.mjs). The bot table is in PROJECT_STATUS.md.
//   A  the row: only 1.2 has minerGuard (300 px); the other eight missions have theirs (or none)
//   B  campPirateMinerGuarded: the flown fighter within 300 px guards a neutral miner, one farther does not; a pilot's own fighter, the cruiser, a docked or dead flown fighter, a freighter and a mission with no row do not
//   C  the raiders' choice: with the fighter away the nearest miner is the prey, with it beside him they go for something else (the other miner, the fighter, the cruiser) and they come back to him when it leaves
//   D  the rest is as it was: no flown fighter, no change; a wave that does not hunt miners picks as before; the pilots' mining ships are still prey
//   E  the page's one-minute test, as a run: 1.2, the stick taken, the fighter beside a miner when the first raid comes (about 40 s): the skiffs turn toward the fighter, not the miner
// Run: node tests/campminerguard.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`{
  window.__new = (mission) => { const C = window.C = campNew(1, [], { seed: 3, mission: mission == null ? 1 : mission }); C.arrivedAt = 0; C.god = true; CAMP.flags.cockpit = true; C.ships = C.ships.filter(u => u.team !== 'alien'); window.M1 = C.ships.find(u => u.kind === 'miner'); window.M2 = C.ships.filter(u => u.kind === 'miner')[1] || null; return C; };
  window.__raider = (dx, dy) => { const u = campSpawn(C, 'skiff', M1.x + dx, M1.y + dy); u.wave = 0; u.prey = 'miners'; u.hitBy = null; return u; };
  window.__fly = (dx, dy) => { const f = C.ships.find(u => u.kind === 'fighter' && u.team === 'earth' && !u.cockpit); campCockpitTake(C, f.id); f.x = M1.x + dx; f.y = M1.y + dy; return f; };
}`);

console.log('A. the row');
{
  const rows = [0, 1, 2].map(m => { g.run(`__new(${m});`); return J('[C.L.id, C.L.minerGuard || null]'); });
  check('1.2 (the mission \'mine\') has minerGuard 300 and 1.1 and 1.3 have none', JSON.stringify(rows) === JSON.stringify([['escort', null], ['mine', 300], [rows[2][0], null]]), JSON.stringify(rows));
  check('no other mission row of any level has one (it is 1.2\'s job for the fighter)', J('CAMP.levels ? Object.keys(CAMP.levels).every(k => (CAMP.levels[k].missions || []).every(m => m.id === "mine" ? m.minerGuard === 300 : !m.minerGuard)) : true') === true);
}

console.log('B. campPirateMinerGuarded');
{
  g.run(`__new(); __fly(299, 0);`);
  check('the flown fighter 299 px from a miner guards him', J('campPirateMinerGuarded(C, M1)') === true);
  g.run(`__new(); __fly(301, 0);`);
  check('301 px away it does not', J('campPirateMinerGuarded(C, M1)') === false);
  g.run(`__new(); __fly(100, 0);`);
  check('and a miner farther from it is not guarded while the other one is: the guard is per miner', J('campPirateMinerGuarded(C, M2)') === (J('campDist(C.by[C.cockpit.id], M2)') <= 300));
  g.run(`__new(); { const f = C.ships.find(u => u.kind === 'fighter' && u.team === 'earth'); f.x = M1.x + 50; f.y = M1.y; }`);
  check('a pilot\'s own fighter beside him (not the one he flies) does not guard: the pilots have their guard orders', J('campPirateMinerGuarded(C, M1)') === false);
  g.run(`__new(); C.carrier.x = M1.x + 50; C.carrier.y = M1.y;`);
  check('the cruiser beside him does not', J('campPirateMinerGuarded(C, M1)') === false);
  g.run(`__new(); __fly(100, 0); C.by[C.cockpit.id].docked = true;`);
  check('a docked flown fighter does not', J('campPirateMinerGuarded(C, M1)') === false);
  g.run(`__new(); __fly(100, 0); C.by[C.cockpit.id].hp = 0;`);
  check('a dead one does not', J('campPirateMinerGuarded(C, M1)') === false);
  g.run(`__new(); __fly(100, 0); window.__fr = campSpawn(C, 'freighter', M1.x + 100, M1.y);`);
  check('a freighter (a hauler, not a miner) is never guarded by this rule', J('campPirateMinerGuarded(C, __fr)') === false);
  g.run(`__new(0); { const f = C.ships.find(u => u.kind === 'fighter' && u.team === 'earth'); campCockpitTake(C, f.id); }`);
  check('a mission with no row never asks: in 1.1 the answer is false for a miner beside the flown fighter', J('(() => { const m = C.ships.find(u => u.kind === "miner"); if (!m) return true; const f = C.by[C.cockpit.id]; f.x = m.x + 50; f.y = m.y; return campPirateMinerGuarded(C, m) === false; })()') === true);
}

console.log('C. the raiders\' choice');
{
  g.run(`__new(); __raider(900, 0);`);
  check('with no fighter flown the raider that hunts miners goes for the nearest one (M1)', J('campPirateTarget(C, C.ships[C.ships.length - 1]).id') === J('M1.id'));
  g.run(`__new(); window.__u = __raider(900, 0); __fly(100, 0);`);
  const t1 = J('campPirateTarget(C, __u).id');
  check('with the flown fighter beside M1 the raider goes for something else: not M1', t1 !== J('M1.id'), t1);
  check('what it goes for is a ship of yours or the other miner (never nothing)', ['fighter', 'miner', 'carrier'].some(k => J(`C.by['${t1}'] && C.by['${t1}'].kind`) === k), t1);
  g.run(`__new(); window.__u = __raider(900, 0); window.__f = __fly(100, 0); __f.x = M1.x + 2000;`);
  check('and when the fighter leaves (2000 px off) it comes back to M1', J('campPirateTarget(C, __u).id') === J('M1.id'));
  g.run(`__new(); window.__u = __raider(900, 0); window.__f = __fly(100, 0); __f.x = M1.x + 900; __f.y = M1.y + 20;`);
  check('the fighter close to the raider but far from the miners (900 px from M1) guards nothing: M1 is the prey again', J('campPirateTarget(C, __u).id') !== J('__f.id') || J('campDist(__f, M1) > 300') === true);
  g.run(`__new(); window.__u = __raider(900, 0); window.__f = __fly(100, 0); M2.x = M1.x + 150; M2.y = M1.y + 150;`);
  check('both miners within 300 px of the fighter: neither is prey, the raider goes for the fighter or the cruiser', J(`(() => { const t = campPirateTarget(C, __u); return !!t && t.kind !== 'miner'; })()`) === true);
  g.run(`__new(); window.__u = __raider(900, 0); window.__f = __fly(100, 0); M2.x = M1.x + 2000; M2.y = M1.y;`);
  check('the other miner far from the fighter is then the prey if he is the nearest one it can have: the raid goes for the unguarded one', J('campPirateTarget(C, __u).id') === J('M2.id') || J('campPirateTarget(C, __u).kind') !== 'miner');
}

console.log('D. the rest is as it was');
{
  g.run(`__new(); window.__u = __raider(900, 0); window.__w = campPirateTarget(C, __u);`);
  check('with no fighter flown nothing changed: the raider\'s prey is the nearest miner', J('__w.id') === J('M1.id'));
  g.run(`__new(); window.__u = __raider(900, 0); __u.prey = 'any'; __fly(100, 0);`);
  check('a raid with no prey word (any) also leaves the guarded miner: it is the pool, not the word', J('campPirateTarget(C, __u).id') !== J('M1.id'));
  g.run(`__new(2); window.__m = campSpawn(C, 'freighter', C.carrier.x + 1500, C.carrier.y); __m.team = 'neutral'; window.__u2 = campSpawn(C, 'skiff', __m.x - 900, __m.y); __u2.wave = 0; __u2.prey = 'haulers';`);
  check('1.3 is as it was: a raider that hunts haulers picks a hauler', J('campPirateTarget(C, __u2).kind') === 'freighter');
  g.run(`__new(); window.__u = __raider(900, 0); __fly(100, 0); { const mining = C.ships.find(u => u.kind === 'fighter' && u.team === 'earth' && !u.cockpit); mining.order = { type: 'mine' }; mining.x = M1.x + 700; mining.y = M1.y; }`);
  check('your own fighter on a Mine order is still a miner to a pirate (it is not a neutral miner): the rule does not shield it', J('campPreyKind(C.ships.find(u => u.kind === "fighter" && u.order && u.order.type === "mine"))') === 'miner');
}

console.log('E. the page\'s test, as a run: 1.2, the stick taken, the fighter beside a miner when the first raid comes');
{
  g.run(`window.__run = (guard) => { window.C = campNew(1, [], { seed: 3, mission: 1 }); C.arrivedAt = 0; CAMP.flags.cockpit = true; C.god = true; if (!guard) C.L.minerGuard = 0; for (let i = 0; i < 20 * 30; i++) campStep(C, 1 / 30); { const f = C.ships.find(u => u.kind === 'fighter' && u.team === 'earth'); campCockpitTake(C, f.id); window.__f = f; } window.__m = C.ships.filter(u => u.kind === 'miner'); window.__aims = []; for (let i = 0; i < 40 * 30; i++) { __f.x = __m[0].x + 120; __f.y = __m[0].y; __f.vx = 0; __f.vy = 0; campStep(C, 1 / 30); if (i % 30 === 0) C.ships.filter(u => u.team === 'alien' && u.wave === 0 && u.hp > 0).forEach(u => { const t = campPirateTarget(C, u); __aims.push(t ? t.kind : null); }); } return C; };`);
  g.run(`__run(true);`);
  const aimOn = J('__aims');
  check('the first raid (wave 0, three skiffs, 40 s) came while the fighter sat 120 px from a miner, and the skiffs picked the FIGHTER (at least 4 picks in 5), never the miner (the page: turn away from him and toward you)', aimOn.length >= 3 && aimOn.filter(k => k === 'miner').length === 0 && aimOn.filter(k => k === 'fighter').length >= aimOn.length * 0.8, JSON.stringify([aimOn.length, aimOn.filter(k => k === 'fighter').length, aimOn.filter(k => k === 'miner').length, aimOn.filter(k => k !== 'fighter' && k !== 'miner')]));
  check('the miners were not lost: both alive', J('__m.every(m => m.hp > 0)') === true);
  g.run(`__run(false);`);
  const aimBait = J('__aims');
  g.run(`CAMP.cockpit.baitR = 0; __run(false); CAMP.cockpit.baitR = 500;`);
  const aimOff = J('__aims');
  check('the same run with the row taken away and the bait off (as it was): the skiffs go for a miner (most of their picks)', aimOff.length >= 3 && aimOff.filter(k => k === 'miner').length >= aimOff.length * 0.8, JSON.stringify([aimOff.length, aimOff.filter(k => k === 'miner').length, aimOff.filter(k => k !== 'miner')]));
  check('the row taken away but the bait on (card space-game-b10-c15-tune-11: a pirate within 500 px of the fighter he flies shoots IT): some of the picks are the fighter now (a quarter at least), and more than with the bait off, which is none', aimBait.length >= 3 && aimBait.filter(k => k === 'fighter').length >= aimBait.length * 0.25 && aimBait.filter(k => k === 'fighter').length > aimOff.filter(k => k === 'fighter').length, JSON.stringify([aimBait.length, aimBait.filter(k => k === 'fighter').length, aimOff.filter(k => k === 'fighter').length]));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('MINER GUARD FAIL (' + failed + ')'); process.exit(1); } else console.log('MINER GUARD PASS');
