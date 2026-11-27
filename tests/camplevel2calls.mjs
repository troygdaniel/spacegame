// smoke: missions 2.1 and 2.2 bring their aliens on what the player does: the first cache taken calls a group to the next cache, the fourth dead guard calls reinforcements from two sides, the sixth a second group; and a hunting party or a patrol comes to a player who does nothing (plain Node, no Chrome)
// Card space-game-b7-level2 (Troy, 26 Nov 2026: yes to the cloud's brief 7, decision 1). Before it 2.1's one wave came at 20 s and 2.2's two at 18 and 40 s of the mission's clock, so a quick player never met 2.2's reinforcements.
// Now (src/campaign.js):
//   - a wave row's `on: { caches: n }` (campWaveOn): it comes when n caches have been taken; with `at: 'cache'` it comes out AT the nearest cache still to take and waits there (a guard: it wakes when a ship of yours is in reach).
//   - a wave row's `on: { guardsDead: n }`: it comes when n of the mission's guards are dead.
//   - an objective { type: 'kill', what: 'wave:all' }: every wave of the mission has come and none of them is left (its words are the one wave's: "Destroy the attackers.").
//   - 2.1 still needs two of its three caches (Troy, 26 Nov 2026: it keeps two, so the voiced goal line stays true) and the group the first one calls; 2.2 needs the guards AND the groups they call.
// Run: node tests/camplevel2calls.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`
  globalThis.T = {};
  T.make = (mi, seed) => { const C = campNew(2, ['shield'], { seed, mission: mi }); C.arrivedAt = C.arrivedAt == null ? 0 : C.arrivedAt; return C; };
  T.started = C => C.waves.map(w => w.started ? 1 : 0).join('');
  T.step = (C, secs) => { for (let i = 0; i < 30 * secs && !C.result; i++) { C.input.thrust = 0; C.input.fire = false; campStep(C, 1 / 30); } };
  T.park = C => { C.ships.forEach(u => { if (u.team === 'earth') { u.x = -9000; u.y = -9000; u.vx = 0; u.vy = 0; u.hp = Math.max(u.hp, 1e6); } }); }; // your ships far from everything: nothing wakes, nothing is picked up
  T.objs = C => campObjectives(C).map(o => o.type + (o.what ? ':' + o.what : '') + ' ' + o.got + '/' + o.need);
`);

// ---- 2.1: the rows ----
const r1 = J(`(() => { const L = T.make(0, 1).L; return { par: L.par, objectives: L.objectives, bonus: L.bonus, caches: L.caches.length, waves: L.waves.map(w => ({ on: w.on, at: w.at, ships: w.ships })) }; })()`);
check('2.1 asks for two of its three caches and the group they call; par and the swift bonus are 100 s, as they were', r1.caches === 3 && r1.objectives[0].type === 'caches' && r1.objectives[0].n === 2 && r1.objectives[1].what === 'wave:all' && r1.par === 100 && r1.bonus.find(b => b.id === 'swift').secs === 100, JSON.stringify(r1));
check('its one group (the old wave\'s 4 raiders and 3 drones) comes on the first cache taken, at the next cache; it has no second of the clock', r1.waves.length === 1 && r1.waves[0].on.caches === 1 && r1.waves[0].at === 'cache' && r1.waves[0].ships.raider === 4 && r1.waves[0].ships.drone === 3, JSON.stringify(r1.waves));

// ---- 2.1: nothing by the clock; a cache calls a group to the nearest cache left ----
const c1 = J(`(() => { const C = T.make(0, 3); T.park(C); T.step(C, 40); const quiet = { started: T.started(C), aliens: campAliens(C).filter(u => u.wave != null).length };
  const k0 = C.caches[0]; const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); f.x = k0.x; f.y = k0.y; T.step(C, 0.2); f.x = -9000; f.y = -9000; T.step(C, 0.2);
  const left = C.caches.filter(k => !k.got), grp = campAliens(C).filter(u => u.wave === 0), near = left.map(k => Math.round(Math.max(...grp.map(u => campDist(u, k))))), car = C.carrier;
  const nextK = left.slice().sort((p, q) => campDist(p, car) - campDist(q, car))[0];
  return { quiet, got: C.cachesGot, started: T.started(C), n: grp.length, hold: grp.every(u => u.hold), farFromNext: Math.round(Math.max(...grp.map(u => campDist(u, nextK)))), near, objs: T.objs(C) }; })()`);
check('2.1: forty seconds with no cache taken and no wave has come', c1.quiet.started === '0' && c1.quiet.aliens === 0, JSON.stringify(c1));
check('the first cache taken calls the group', c1.got === 1 && c1.started === '1' && c1.n === 7, JSON.stringify(c1));
check('the group is at the nearest cache still to take (every ship within 450 px of it) and waits there', c1.farFromNext <= 450 && c1.hold === true, JSON.stringify(c1));
const c2 = J(`(() => { const C = T.make(0, 3); T.park(C); const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); const take = k => { f.x = k.x; f.y = k.y; T.step(C, 0.2); f.x = -9000; f.y = -9000; T.step(C, 0.2); };
  take(C.caches[0]); take(C.caches.find(k => !k.got)); const b = { got: C.cachesGot, result: C.result || null, objs: T.objs(C), aliens: campAliens(C).filter(u => u.wave != null).length };
  campAliens(C).forEach(u => { if (u.wave != null) u.hp = 0; }); T.step(C, 0.5); return { b, end: C.result || null }; })()`);
check('two caches taken with the group alive is not a win; with the group dead it is', c2.b.got === 2 && c2.b.result === null && c2.b.aliens === 7 && c2.end === 'won', JSON.stringify(c2));

// ---- 2.2: the rows ----
const r2 = J(`(() => { const C = T.make(1, 1), L = C.L, P = campMissionPlace(C) || { x: 0, y: 0 }; return { guards: L.guards.length, objectives: L.objectives, waves: L.waves.map(w => ({ on: w.on, from: w.from, ships: w.ships, ang: Math.atan2(w.from[1] - P.y, w.from[0] - P.x) })) }; })()`); // (a row's `from` is laid over the mission's place: the bearing is from that place)
check('2.2 asks for the seven guards and every group they call', r2.guards === 7 && r2.objectives.length === 2 && r2.objectives[0].what === 'guards' && r2.objectives[1].what === 'wave:all', JSON.stringify(r2));
check('the reinforcements are two groups on the fourth dead guard, from opposite sides (bearings half a turn apart, within 0.3 rad); the second group comes when the guard that runs has made its call (card space-game-fighter-job-22: it was the sixth dead guard)', r2.waves.length === 3 && r2.waves[0].on.guardsDead === 4 && r2.waves[1].on.guardsDead === 4 && r2.waves[2].on.runner === true && Math.abs(Math.abs(r2.waves[0].ang - r2.waves[1].ang) - Math.PI) < 0.3, JSON.stringify(r2.waves));
check('the groups\' ships are the old two waves\' and the runner\'s, with more ships in each group and nothing else (card space-game-22-longer-more-ships, Troy, 27 Nov 2026): 6 drones and 5 gunships split in two, then 6 raiders and 4 drones', r2.waves[0].ships.drone + r2.waves[1].ships.drone === 6 && r2.waves[0].ships.gunship + r2.waves[1].ships.gunship === 5 && r2.waves[2].ships.raider === 6 && r2.waves[2].ships.drone === 4, JSON.stringify(r2.waves));

// ---- 2.2: the guards call them ----
const g2 = J(`(() => { const C = T.make(1, 4); T.park(C); { const P = campMissionPlace(C); C.carrier.x = P.x; C.carrier.y = P.y; C.carrier.vx = 0; C.carrier.vy = 0; C.carrier.hp = 1e6; } T.step(C, 35); const out = { quiet: T.started(C) }; const kill = k => { C.ships.filter(u => u.guard && u.hp > 0).slice(0, k).forEach(u => { u.hp = 0; }); T.step(C, 0.3); };
  kill(3); out.three = T.started(C); kill(1); out.four = T.started(C); out.n4 = campAliens(C).filter(u => u.wave != null).length; out.sides = [0, 1].map(w => { const a = campAliens(C).filter(u => u.wave === w); return Math.round(Math.atan2(a.reduce((s, u) => s + u.y, 0) / a.length - (campMissionPlace(C) || { y: 0 }).y, a.reduce((s, u) => s + u.x, 0) / a.length - (campMissionPlace(C) || { x: 0 }).x) * 100) / 100; });
  kill(1); out.five = T.started(C); kill(1); out.six = T.started(C); out.left = C.ships.filter(u => u.guard && u.hp > 0).length; kill(1); out.afterGuards = C.result || null; out.objs = T.objs(C);
  campAliens(C).forEach(u => { u.hp = 0; }); T.step(C, 0.5); out.end = C.result || null; return out; })()`);
check('2.2: thirty-five seconds with no guard dead and nothing has come; three dead, still nothing', g2.quiet === '000' && g2.three === '000', JSON.stringify(g2));
check('the fourth dead guard calls both reinforcement groups at once (11 ships), from two sides', g2.four === '110' && g2.n4 === 11 && Math.abs(Math.abs(g2.sides[0] - g2.sides[1]) - Math.PI) < 0.5, JSON.stringify(g2));
check('the sixth dead guard, with one left, makes the last guard run: the group is NOT called yet (card space-game-fighter-job-22; before it the sixth death called it)', g2.five === '110' && g2.six === '110' && g2.left === 1, JSON.stringify(g2));
check('the last guard dead with the called groups alive is not a win; with them dead it is', g2.afterGuards === null && g2.end === 'won', JSON.stringify(g2));

// ---- the threat that comes to a player who does nothing (a row's hunt: campHunt) ----
// Troy, 26 Nov 2026: yes to both. 2.1: no cache taken 45 s after arriving, 3 raiders and 2 drones from the west; another every 45 s, each two ships larger; a cache taken stops them for good.
// 2.2: no guard dead for 40 s, 2 drones and a gunship from the north-east; each two larger; a guard killed starts the 40 s again; they are not guards and must be dead to win.
const h1 = J(`(() => { const C = T.make(0, 6); T.park(C); const P = campMissionPlace(C), cnt = () => campAliens(C).filter(u => u.hunt != null).length, out = {}; T.step(C, 44); out.at44 = cnt(); T.step(C, 2); out.at46 = cnt(); out.kinds = campAliens(C).filter(u => u.hunt === 0).map(u => u.kind).sort().join();
  out.west = campAliens(C).filter(u => u.hunt === 0).every(u => u.x < P.x - 2000); out.goal = campAliens(C).filter(u => u.hunt != null).every(u => u.goal === 'carrier' && !u.hold && u.wave == null); // (the party's own ships: the guards of the second cache hold their post, card space-game-b10-c5-21-guarded-cache)
  T.step(C, 45); out.second = campAliens(C).filter(u => u.hunt === 1).length; C.cachesGot = 1; T.step(C, 100); out.afterCache = campAliens(C).filter(u => u.hunt != null && u.hunt >= 2).length; out.off = C.hunt.off;
  C.cachesGot = 2; campAliens(C).forEach(u => { if (u.wave != null) u.hp = 0; }); T.step(C, 0.5); out.withParty = C.result || null; campAliens(C).forEach(u => { u.hp = 0; }); T.step(C, 0.5); out.end = C.result || null; return out; })()`);
check('2.1: with no cache taken nothing comes for 44 s; at 45 s a party of 3 raiders and 2 drones comes from the west, for the cruiser', h1.at44 === 0 && h1.at46 === 5 && h1.kinds === 'drone,drone,raider,raider,raider' && h1.west === true && h1.goal === true, JSON.stringify(h1));
check('45 s later a second party, two ships larger (7); a cache taken stops the parties for good', h1.second === 7 && h1.afterCache === 0 && h1.off === true, JSON.stringify(h1));
check('a party must be dead to win: the caches and the called group done with a party alive is not a win, with it dead it is', h1.withParty === null && h1.end === 'won', JSON.stringify(h1));
const h2 = J(`(() => { const C = T.make(1, 6); T.park(C); const P = campMissionPlace(C), cnt = k => campAliens(C).filter(u => u.hunt === k).length, out = {}; T.step(C, 39); out.at39 = cnt(0); T.step(C, 2); out.at41 = cnt(0); out.kinds = campAliens(C).filter(u => u.hunt === 0).map(u => u.kind).sort().join();
  out.ne = campAliens(C).filter(u => u.hunt === 0).every(u => u.x > P.x + 1500 && u.y < P.y - 1200) ; out.notGuards = campAliens(C).filter(u => u.hunt != null).every(u => !u.guard && u.wave == null);
  T.step(C, 30); C.ships.find(u => u.guard && u.hp > 0).hp = 0; T.step(C, 20); out.restarted = cnt(1); T.step(C, 21); out.second = cnt(1); out.started = T.started(C);
  C.ships.forEach(u => { if (u.guard || u.wave != null) u.hp = 0; }); T.step(C, 0.5); C.ships.forEach(u => { if (u.wave != null) u.hp = 0; }); T.step(C, 0.5); out.withPatrol = C.result || null; const n = C.hunt.n; T.step(C, 90); out.noneAfterGuards = C.hunt.n === n;
  campAliens(C).forEach(u => { u.hp = 0; }); T.step(C, 0.5); out.end = C.result || null; return out; })()`);
check('2.2: with no guard dead nothing comes for 39 s; at 40 s a patrol of 2 drones and a gunship comes from the north-east; its ships are not guards and belong to no wave', h2.at39 === 0 && h2.at41 === 3 && h2.kinds === 'drone,drone,gunship' && h2.ne === true && h2.notGuards === true, JSON.stringify(h2));
check('a guard killed starts the 40 s again (the second patrol is not there 20 s after the kill, and is, two ships larger, 41 s after it); a patrol does not count as a dead guard', h2.restarted === 0 && h2.second === 5 && h2.started === '000', JSON.stringify(h2));
check('the patrols must be dead to win, and none comes once the guards are all dead', h2.withPatrol === null && h2.noneAfterGuards === true && h2.end === 'won', JSON.stringify(h2));

// ---- the called groups and the patrols go for the cruiser (card space-game-chunk16-22-fighter-gap, Troy: yes) ----
// a wave row's or a hunt's `focus: 'carrier'` (campAlienAI): a ship of yours that flies by, or hits it, does not draw it off: a flown fighter used to drag 2.2's groups away from the cruiser
const fo = J(`(() => { const C = T.make(1, 5); T.park(C); const car = C.carrier, f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter'); const P = campMissionPlace(C); car.x = P.x - 3000; car.y = P.y; car.vx = 0; car.vy = 0;
  const run = focus => { const a = campSpawn(C, 'raider', car.x + 1500, car.y); a.goal = 'carrier'; a.focus = focus; a.hold = false; f.x = a.x + 250; f.y = a.y + 80; f.vx = 0; f.vy = 0; a.hitBy = f.id; a.distractedUntil = C.t + 8000; const d0 = campDist(a, car); for (let i = 0; i < 90; i++) { f.x = a.x + 250; f.y = a.y + 80; f.vx = 0; f.vy = 0; campStep(C, 1 / 30); } const d1 = campDist(a, car); a.hp = 0; campStep(C, 1 / 30); return Math.round(d0 - d1); };
  return { rows: C.L.waves.every(w => w.focus === 'carrier') && C.L.hunt.focus === 'carrier', free: run(null), focus: run('carrier') }; })()`);
check('2.2: every wave row and the patrol carry focus: carrier', fo.rows === true, JSON.stringify(fo));
check('a raider with a fighter of yours 250 px away on the far side (away from the cruiser) that has just hit it still flies at the cruiser (closes at least 250 px in 3 s); the same raider without the flag is drawn onto the fighter (closes less than half of that)', fo.focus >= 250 && fo.free < fo.focus / 2, JSON.stringify(fo));

// ---- the triggers themselves ----
const tr = J(`(() => { const C = T.make(1, 2), D = T.make(0, 2); return { g0: campWaveOn(C, { guardsDead: 0 }), g1: campWaveOn(C, { guardsDead: 1 }), c0: campWaveOn(D, { caches: 0 }), c1: campWaveOn(D, { caches: 1 }), none: campWaveOn(D, { guardsDead: 1 }) }; })()`);
check('the triggers: no guard dead and no cache taken at the start; a mission with no guards never fires the guards\' one', tr.g1 === false && tr.c0 === true && tr.c1 === false && tr.none === false, JSON.stringify(tr));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP LEVEL 2 CALLS OK (${n} checks)`);
process.exit(failed ? 1 : 0);
