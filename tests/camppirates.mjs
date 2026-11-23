// smoke: the pirates and the neutral traffic of Level 1: the kinds, the sides, the prey, breaking off, the cues, the patrols and the miners, the map and the words (plain Node, no Chrome)
// Card space-game-l1-pirates-traffic (src/camppirates.js, CAMP.pirate and CAMP.traffic in src/campaign.js). The shape that Level 1's missions are built on (space-game-l1-rim-missions).
//   A. the kinds and the sides           B. who can hurt whom                 C. what a pirate goes for (prey)
//   D. breaking off and getting away     E. cues                              F. patrols and miners (neutral traffic)
//   G. the map, the list and the words
// Run: node tests/camppirates.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a test mission on Level 1 (this page's own copy of the table): at Ceres, where the cruiser starts, one hauler from Vesta to Ceres, a pirate wave, a patrol and two miners
g.run(`
  CAMP.levels[1].missions.push({ id: 'pt', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', 
    rocks: [{ at: [900, 700], n: 7, spread: 300 }, { at: [-1100, -400], n: 7, spread: 300 }], // (Level 1 has no rocks of its own since the rim run: each mission brings them)
    objectives: [{ type: 'hold', secs: 100000 }], bonus: [{ id: 'ok', type: 'neutrals', n: 0 }],
    convoys: [{ id: 'h1', name: 'Hauler 1', at: 2, from: 'vesta', to: 'ceres' }],
    waves: [{ at: 5, from: [3000, 0], ships: { skiff: 2, cutter: 1 }, goal: 'carrier', prey: 'haulers', breaks: 30, say: 'camp.say.raid' },
            { on: { cue: 'second' }, from: [-3000, 0], ships: { brute: 1 }, goal: 'carrier' }],
    cues: [{ name: 'auto', on: { t: 12 } }],
    traffic: [{ id: 'pat', kind: 'patrol', at: [-500, 400], r: 300 }, { id: 'min', kind: 'miner', at: [500, 300], n: 2, home: 'ceres' }] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__new = opts => { window.C = campNew(1, [], Object.assign({ seed: 5, god: true, mission: __M }, opts || {})); C.arrivedAt = 0; return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__still = u => { u.vmax = 0; u.accel = 0; u.nextShot = 1e12; return u; };
  window.__spawn = (kind, dx, dy) => campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy);
  window.__d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  window.__quiet = () => { C.L.waves = []; C.waves = []; C.L.cues = []; return C; }; // no wave comes: the neutrals have the sky to themselves
`);

// ---------- A. the kinds and the sides ----------
console.log('A. the kinds and the sides');
{
  g.run('__new()');
  check('three pirate kinds in the table', J('Object.keys(CAMP.pirate.kinds)').join() === 'skiff,cutter,brute');
  const s = J(`(() => { const u = __spawn('skiff', 800, 0); return { team: u.team, faction: u.faction, hp: u.hp, def: u.def.hp, dmg: u.def.dmg, base: CAMP.pirate.kinds.skiff.hp, r: u.r } })()`);
  check('a skiff is on the hostile side (team alien) with faction pirate', s.team === 'alien' && s.faction === 'pirate');
  check('a skiff has its own hull and damage, not the raider\'s', s.hp === s.base && s.def === s.base && s.dmg === 5 && s.hp !== 20, JSON.stringify(s));
  check('an alien raider has faction alien', J(`__spawn('raider', 900, 0).faction`) === 'alien');
  check('the mothership and a tower have faction alien', J(`__spawn('mother', 3000, 0).faction`) === 'alien' && J(`__spawn('tower', 3000, 500).faction`) === 'alien');
  check('the cruiser and the freighter are faction earth', J('C.carrier.faction') === 'earth');
  const nt = J(`(() => { const p = __spawn('patrol', 1500, 0), m = __spawn('miner', 1500, 100); return { pt: p.team, mt: m.team, pf: p.faction, inWing: campWing(C).includes(p) || campWing(C).includes(m), alien: campAliens(C).includes(p) || campAliens(C).includes(m) } })()`);
  check('a patrol and a miner are team neutral, in nobody\'s wing and not hostile', nt.pt === 'neutral' && nt.mt === 'neutral' && nt.pf === 'neutral' && !nt.inWing && !nt.alien, JSON.stringify(nt));
  check('a pirate is small: the pace scales it', J(`campSmall('skiff') && campSmall('brute') && !campSmall('patrol')`));
  g.run('__new({ seed: 5 })');
  const p0 = J(`(() => { const u = __spawn('skiff', 800, 0); return { v: u.vmax, a: u.accel } })()`);
  g.run('campPaceSet(C, 0.5)');
  const p1 = J(`(() => { const u = C.ships.find(s => s.kind === 'skiff'); return { v: u.vmax, a: u.accel } })()`);
  check('the pace slows a skiff', p1.v < p0.v && p1.a < p0.a, JSON.stringify([p0, p1]));
  g.run('campPaceSet(C, 1)');
  check('a wreck of a skiff holds ore (CAMP.pirate.kinds.ore)', J(`(() => { const u = C.ships.find(s => s.kind === 'skiff'); campKill(C, u); return C.pickups.some(p => p.kind === 'wreck' && p.ore === CAMP.pirate.kinds.skiff.ore) })()`));
  check('a pirate kill counts as a kill', J('C.kills') === 1);
}

{
  g.run('__new()');
  const h = J(`(() => { const p = __spawn('cutter', 3000, 0); p.hold = true; p.hp = p.maxHp = 1e6; const x0 = p.x; __run(5); const stayed = Math.abs(p.x - x0) < 1; C.carrier.x = p.x - 400; C.carrier.y = p.y; __run(5); return { stayed, woke: p.hold === false } })()`);
  check('a pirate on guard (hold) waits until one of yours is near, then fights', h.stayed && h.woke, JSON.stringify(h));
}

// ---------- B. who can hurt whom ----------
console.log('B. who can hurt whom');
{
  g.run('__new()');
  const r = J(`(() => {
    const pir = __still(__spawn('cutter', 600, 0)), pat = __spawn('patrol', 400, 0), min = __spawn('miner', 700, 40);
    pat.vmax = pat.accel = 0; min.vmax = min.accel = 0; pir.hp = pir.maxHp = 1e6; pat.hp = pat.maxHp = 1e6; min.hp = min.maxHp = 1e6;
    const h0 = { pir: pir.hp, pat: pat.hp, min: min.hp };
    // a pirate's shot at the miner
    campBullet(C, pir, Math.atan2(min.y - pir.y, min.x - pir.x), 400, 7, 1500, 'alien', 0); __run(1);
    const a = min.hp < h0.min;
    // a neutral's shot at the pirate
    campBullet(C, pat, Math.atan2(pir.y - pat.y, pir.x - pat.x), 400, 5, 1500, 'neutral', 0); __run(1);
    const b = pir.hp < h0.pir;
    // your shot at the patrol does not hurt it
    campBullet(C, C.carrier, Math.atan2(pat.y - C.carrier.y, pat.x - C.carrier.x), 400, 9, 1500, 'earth', 0); __run(1);
    const c = pat.hp === h0.pat;
    // a pirate's shot at one of yours hurts
    return { a, b, c };
  })()`);
  check('a pirate\'s shot hurts a neutral miner', r.a);
  check('a neutral\'s shot hurts a pirate', r.b);
  check('your shot does not hurt a neutral', r.c);
  g.run('__new()');
  const t = J(`(() => { const pir = __still(__spawn('skiff', 300, 0)); campFill = 0; C.input.fire = true; __run(4); return { hurt: pir.hp < pir.maxHp || pir.hp <= 0 || !C.by[pir.id] } })()`);
  check('the cruiser\'s turrets shoot a pirate like any hostile', t.hurt);
  check('wave rows with pirate kinds spawn pirates', (() => { g.run('__new()'); g.run('__run(7)'); return J(`C.ships.filter(u => u.faction === 'pirate').length`) === 3; })());
  check('a pirate counts for a kill objective of its wave (wave:0 is not cleared while one lives)', J(`(() => { C.objectives = null; return C.ships.some(u => u.wave === 0 && u.hp > 0) })()`));
}

// ---------- C. what a pirate goes for ----------
console.log('C. what a pirate goes for');
{
  g.run('__new()'); g.run('__quiet()'); g.run(`C.L.convoys = []; C.convoys = []; C.ships = C.ships.filter(u => u.team !== 'neutral');`);
  const fr = J(`(() => { const f = campSpawn(C, 'freighter', C.carrier.x + 1500, C.carrier.y); f.id = 'freighter-x1'; C.by[f.id] = f; f.dest = { x: C.carrier.x + 3000, y: C.carrier.y }; f.vmax = 0; window.__F = f; return f.id })()`);
  const pick = (prey, goal) => J(`(() => { const p = __still(__spawn('skiff', 900, 0)); p.prey = ${JSON.stringify(prey)}; p.goal = ${JSON.stringify(goal || '')}; const t = campPirateTarget(C, p); const id = t ? t.id : ''; p.hp = 0; return id })()`);
  check('prey any: a hauler 600 px off is wanted over the cruiser 900 px off (the weights)', pick('any') === 'freighter-x1', pick('any'));
  check('prey haulers: the hauler', pick('haulers') === 'freighter-x1');
  check('prey carrier: the cruiser, whatever else is there', pick('carrier') === J('C.carrier.id'));
  check('goal convoy:x1 wins over prey carrier', pick('carrier', 'convoy:x1') === 'freighter-x1');
  g.run(`campOrder(C, 'launch'); __run(8);`);
  const kinds = J(`(() => { const out = {}; const m = campSpawn(C, 'miner', C.carrier.x + 900, C.carrier.y + 900); const e = campWing(C, 'escort')[0] || campWing(C, 'fighter')[0]; out.mine = campPreyKind(m); out.free = campPreyKind(e); e.order = { type: 'mine' }; out.onMine = campPreyKind(e); e.order = null; out.pat = campPreyKind(campSpawn(C, 'patrol', 5000, 5000)); out.fr = campPreyKind(__F); out.car = campPreyKind(C.carrier); return out })()`);
  check('a neutral miner is a miner to a pirate', kinds.mine === 'miner');
  check('one of your ships on a Mine order is a miner to a pirate (prey miners reaches it)', kinds.onMine === 'miner' && kinds.free !== 'miner', JSON.stringify(kinds));
  check('a patrol, a hauler and the cruiser are their own kinds', kinds.pat === 'patrol' && kinds.fr === 'freighter' && kinds.car === 'carrier');
  const tm = J(`(() => { const e = campWing(C, 'escort')[0] || campWing(C, 'fighter')[0]; e.order = { type: 'mine' }; const p = __still(__spawn('skiff', 300, 0)); p.prey = 'miners'; const t = campPirateTarget(C, p); const r = t ? t.id : ''; p.hp = 0; return { r, e: e.id, isMiner: r === e.id || (t && t.kind === 'miner') } })()`);
  check('prey miners goes for a ship of yours on a Mine order (or a neutral miner)', tm.isMiner, JSON.stringify(tm));
  g.run('__new()');
  check('prey miners with no miners there takes what is (the cruiser)', J(`(() => { const p = __still(__spawn('skiff', 200, 0)); p.prey = 'miners'; C.ships.filter(u => u.team === 'neutral').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); const t = campPirateTarget(C, p); return t && t.id })()`) === J('C.carrier.id'));
  g.run('__new(); __quiet()'); g.run(`C.L.convoys = []; C.convoys = [];`);
  const fly = J(`(() => { const f = campSpawn(C, 'freighter', C.carrier.x + 1800, C.carrier.y + 100); f.id = 'freighter-x1'; C.by[f.id] = f; f.dest = { x: C.carrier.x + 4000, y: C.carrier.y }; f.vmax = 0; f.hp = f.maxHp = 1e6;
    C.ships.filter(u => u.team === 'neutral').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0);
    const p = __spawn('skiff', 2600, 100); p.prey = 'haulers'; p.goal = 'carrier'; const d0 = __d(p, f); __run(8); return { d0, d1: __d(p, f), dc: __d(p, C.carrier), hit: f.hp < 1e6 } })()`);
  check('a pirate of a hauler wave flies to the hauler and shoots it, not the cruiser it is "goal"', fly.d1 < 700 && fly.dc > 1500 && fly.hit, JSON.stringify(fly)); // it circles the hauler at its ring (about 460 px) and is far from the cruiser
}

// ---------- D. breaking off and getting away ----------
console.log('D. breaking off and getting away');
{
  g.run('__new()');
  const hurt = J(`(() => { const p = __spawn('cutter', 500, 0); p.hp = p.maxHp * 0.2; __run(0.2); return { running: !!p.running, why: p.running && p.running.why, id: p.id } })()`);
  check('a pirate under CAMP.pirate.breakHp turns to run', hurt.running && hurt.why === 'hurt', JSON.stringify(hurt));
  const own = J(`(() => { const p = __spawn('cutter', 500, 100); p.breakAt = 0.05; p.hp = p.maxHp * 0.2; __run(0.2); const a = !!p.running; p.hp = p.maxHp * 0.04; __run(0.2); return { stayed: !a, then: !!p.running } })()`);
  check('a wave row\'s breakAt is the pirate\'s own threshold', own.stayed && own.then, JSON.stringify(own));
  const run = J(`(() => { const p = C.by[${JSON.stringify(hurt.id)}]; const c = C.carrier; let shots = 0; const b0 = C.bullets.length; const d0 = __d(p, c); const t0 = C.t; let gone = false, esc0 = C.piratesEscaped, ev = []; for (let i = 0; i < 30 * 40 && !gone; i++) { campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'pirates') ev.push(e.stage); }); C.events.length = 0; gone = !C.by[p.id]; if (p.running && C.bullets.some(b => b.from === p.id)) shots++; } return { gone, d: __d(p, c), secs: (C.t - t0) / 1000, esc: C.piratesEscaped - esc0, shots, ev } })()`);
  check('a runner is gone for good once far enough from your ships', run.gone && run.esc >= 1, JSON.stringify(run));
  check('a runner does not shoot', run.shots === 0);
  check('"gone" is an event; the pirate was not killed (no kill, no wreck from it)', run.ev.includes('gone'));
  check('a runner takes at least CAMP.pirate.runMin ms', run.secs * 1000 >= J('CAMP.pirate.runMin'));
  g.run('__new()');
  g.run(`__run(5.5)`);
  check('wave 0 came at 5 s with three pirates', J(`C.ships.filter(u => u.faction === 'pirate' && u.wave === 0).length`) === 3);
  check('before `breaks` (30 s) they do not run', J(`C.ships.filter(u => u.running).length`) === 0);
  g.run('__run(31)');
  const br = J(`({ run: C.ships.filter(u => u.running && u.running.why === 'cue').length, say: 0, broke: C.waves[0].broke })`);
  check('after `breaks` seconds the wave breaks off', br.run >= 1 && br.broke === true, JSON.stringify(br));
  g.run('__run(40)');
  const left = J(`({ alive: C.ships.filter(u => u.faction === 'pirate' && u.wave === 0).length, esc: C.piratesEscaped })`);
  check('and gets away: none left, all counted as escaped', left.alive === 0 && left.esc === 3, JSON.stringify(left));
  check('a wave whose pirates all ran counts as cleared (cleared: wave:0)', J(`campWaveOn(C, { cleared: 'wave:0' })`));
  check('campPirateBreak by hand: wave:1 breaks the brute', (() => { g.run('__new()'); g.run(`campCue(C, 'second'); __run(0.5)`); const k = J(`C.ships.filter(u => u.faction === 'pirate' && u.wave === 1).length`); const m = J(`campPirateBreak(C, 'wave:1')`); return k === 1 && m === 1 && J(`C.ships.find(u => u.kind === 'brute').running.why`) === 'cue'; })());
  check('campPirateBreak(C, "all") breaks every pirate once (and a second call breaks none)', J(`(() => { __spawn('skiff', 700, 0); __spawn('skiff', 700, 50); const a = campPirateBreak(C, 'all'); const b = campPirateBreak(C, 'all'); return a >= 2 && b === 0 })()`));
}

// ---------- E. cues ----------
console.log('E. cues');
{
  g.run('__new()');
  check('a cue is not fired at the start', J('C.cues.second === undefined && C.cues.auto === undefined'));
  check('wave 1 waits for its cue (nothing of it at 20 s)', J(`(() => { __run(20); return C.waves[1].started })()`) === false);
  check('a mission row\'s `cues` fire by their own condition (auto at 12 s)', J('C.cues.auto != null'));
  g.run(`campCue(C, 'second'); __run(0.2)`);
  check('campCue fires a named cue once; the wave on it starts', J('C.cues.second != null && C.waves[1].started'));
  check('a second campCue keeps the first time and sends no second event', J(`(() => { const t = C.cues.second; C.events.length = 0; const r = campCue(C, 'second'); return r === true && C.cues.second === t && C.events.length === 0 })()`));
  check('campCue says a cue event the scene can read', J(`(() => { campCue(C, 'zzz'); return C.events.some(e => e.type === 'cue' && e.name === 'zzz') })()`));
  check('breakOn: a wave breaks on its cue', (() => {
    g.run(`CAMP.levels[1].missions[__M].waves[0].breaks = null; CAMP.levels[1].missions[__M].waves[0].breakOn = 'go'; __new(); __run(8);`);
    const before = J(`C.ships.filter(u => u.running).length`); g.run(`campCue(C, 'go'); __run(0.2)`); const after = J(`C.ships.filter(u => u.running).length`);
    g.run(`CAMP.levels[1].missions[__M].waves[0].breaks = 30; delete CAMP.levels[1].missions[__M].waves[0].breakOn;`);
    return before === 0 && after === 3;
  })());
  check('cleared: a wave is cleared when it came and none is left', J(`(() => { __new(); __run(6); const a = campWaveOn(C, { cleared: 'wave:0' }); C.ships.filter(u => u.wave === 0).forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); return !a && campWaveOn(C, { cleared: 'wave:0' }) })()`));
  check('no cues fire before the cruiser has arrived', J(`(() => { __new(); C.arrivedAt = null; C.t = 50000; campPirates(C, 1 / 30); return Object.keys(C.cues).length === 0 })()`));
}

// ---------- F. patrols and miners ----------
console.log('F. patrols and miners (neutral traffic)');
{
  g.run('__new()');
  const rows = J(`C.ships.filter(u => u.team === 'neutral').map(u => ({ id: u.id, kind: u.kind, x: u.x, y: u.y, name: u.cname, tid: u.tid }))`);
  check('the mission row\'s traffic is spawned at campNew: a patrol and two miners', rows.filter(r => r.kind === 'patrol').length === 1 && rows.filter(r => r.kind === 'miner').length === 2, JSON.stringify(rows));
  const pl = J(`campPlaces(1).ceres`);
  const pat = rows.find(r => r.kind === 'patrol');
  check('`at` is an offset from the mission\'s place (the patrol is at Ceres + [-500, 400])', Math.abs(pat.x - (pl.x - 500)) < 5 && Math.abs(pat.y - (pl.y + 400)) < 5, JSON.stringify([pat, pl]));
  check('a row with n: 2 names them "Miner 1", "Miner 2"', rows.filter(r => r.kind === 'miner').map(r => r.name).sort().join() === 'Miner 1,Miner 2');
  check('a mission with no traffic rows has no neutral ships', J(`(() => { const D = campNew(1, [], { seed: 5, mission: 2 }); return D.ships.filter(u => u.team === 'neutral').length })()`) === 0);
  // the patrol ranges round its post
  g.run('__new(); __quiet(); __run(20)');
  const ranged = J(`(() => { const p = C.ships.find(u => u.kind === 'patrol'); return __d(p, p.post) })()`);
  check('an idle patrol ranges round its post (within its range)', ranged <= 300, ranged);
  // the patrol shoots a pirate in reach
  g.run('__new()');
  const fight = J(`(() => { const p = C.ships.find(u => u.kind === 'patrol'); const pi = __still(campSpawn(C, 'cutter', p.x + 400, p.y)); pi.hp = pi.maxHp = 60; pi.goal = ''; __run(10); return { dead: !C.by[pi.id], hp: pi.hp, kills: C.kills } })()`);
  check('a patrol shoots a pirate that comes within its range', fight.dead || fight.hp < 60, JSON.stringify(fight));
  // a patrol goes to a hostile near its post (help), not to one that is far
  g.run('__new(); __quiet()');
  const help = J(`(() => { const p = C.ships.find(u => u.kind === 'patrol'); const pi = __still(campSpawn(C, 'cutter', p.post.x + 2200, p.post.y)); pi.hp = pi.maxHp = 1e6; const d0 = __d(p, pi); __run(12); const near = __d(p, pi); const far = __still(campSpawn(C, 'cutter', p.post.x + 9000, p.post.y)); far.hp = far.maxHp = 1e6; return { d0, near, helped: near < d0 * 0.6 } })()`);
  check('a patrol goes to a hostile within `help` of its post', help.helped, JSON.stringify(help));
  g.run('__new(); __quiet()');
  check('a patrol does not leave its post for a hostile far beyond `help`', J(`(() => { const p = C.ships.find(u => u.kind === 'patrol'); const far = __still(campSpawn(C, 'cutter', p.post.x + 9000, p.post.y)); far.hp = far.maxHp = 1e6; __run(15); return __d(p, p.post) <= 400 })()`));
  // a miner works the nearest rocks, docks at home, goes out again
  g.run('__new(); __quiet()');
  const phases = J(`(() => { const m = C.ships.find(u => u.kind === 'miner'); const seen = {}; let rock = ''; for (let i = 0; i < 30 * 140; i++) { campStep(C, 1 / 30); C.events.length = 0; seen[m.phase] = (seen[m.phase] || 0) + 1; if (m.phase === 'work' && !rock) rock = m.rockId; } return { seen: Object.keys(seen), rock, left: C.rocks.length } })()`);
  check('a miner goes out, works, goes home and docks, and goes out again', ['out', 'work', 'home', 'dock'].every(p => phases.seen.includes(p)), JSON.stringify(phases));
  check('a miner works one of the mission\'s rocks', /^rock-/.test(phases.rock), JSON.stringify(phases));
  check('a miner does not cut the rocks (your ore is yours)', J('C.rocks.every(r => r.hp === r.maxHp)'));
  g.run('__new(); __quiet()');
  const fear = J(`(() => { const m = C.ships.find(u => u.kind === 'miner'); __run(3); const pi = __still(campSpawn(C, 'skiff', m.x + 500, m.y)); pi.hp = pi.maxHp = 1e6; __run(1); const a = m.phase; return { a } })()`);
  check('a miner runs home when a hostile comes within `fear`', fear.a === 'run', JSON.stringify(fear));
  // losing a neutral
  g.run('__new()');
  const lost = J(`(() => { const m = C.ships.find(u => u.kind === 'miner'); const ls = C.lostShips, ev0 = C.events.length; campHurt(C, m, 1e6, 'x'); return { n: C.neutralsLost, ls: C.lostShips - ls, ev: C.events.filter(e => e.type === 'neutral' && e.stage === 'lost').length, say: C.events.some(e => e.type === 'say' && e.key === 'camp.say.neutral.lost'), name: C.events.find(e => e.type === 'neutral').name } })()`);
  check('a lost neutral counts in C.neutralsLost, not in lostShips; an event and a line from the ship', lost.n === 1 && lost.ls === 0 && lost.ev === 1 && lost.say && /^Miner/.test(lost.name), JSON.stringify(lost));
  check('the bonus { type: "neutrals", n: 0 } fails when one was lost', J(`campBonuses(C).find(b => b.id === 'ok').ok`) === false);
  check('and holds when none was', J(`(() => { __new(); return campBonuses(C).find(b => b.id === 'ok').ok })()`) === true);
  check('pirates go for the neutral miners (prey weights): a skiff of prey "miners" picks a miner', J(`(() => { __new(); const m = C.ships.find(u => u.kind === 'miner'); const p = __still(campSpawn(C, 'skiff', m.x + 1200, m.y)); p.prey = 'miners'; const t = campPirateTarget(C, p); return !!t && t.kind === 'miner' })()`));
}

// ---------- G. the map, the list and the words ----------
console.log('G. the map, the list and the words');
{
  g.run('__new()');
  g.run(`window.__sk = __spawn('skiff', 900, 100); window.__pt = C.ships.find(u => u.kind === 'patrol'); window.__mn = C.ships.find(u => u.kind === 'miner'); window.__al = __spawn('raider', 1100, 0);`);
  const col = J(`({ sk: campDotColor(__sk), pt: campDotColor(__pt), mn: campDotColor(__mn), al: campDotColor(__al), wing: campDotColor(C.carrier) })`);
  check('pirates, patrols and miners have colours of their own: not the aliens\' red, not yours', new Set(Object.values(col)).size === 5, JSON.stringify(col));
  const types = J(`campMapMarks(C).filter(m => m.id).reduce((o, m) => { o[m.id] = m.type; return o }, {})`);
  check('map marks: pirate, patrol, miner, alien are their own types', types[J('__sk.id')] === 'pirate' && types[J('__pt.id')] === 'patrol' && types[J('__mn.id')] === 'miner' && types[J('__al.id')] === 'alien', JSON.stringify(types).slice(0, 200));
  const legend = J(`campMapLegend(C).map(r => r.type)`);
  check('the map\'s legend has rows for pirates, patrols and miners', ['pirate', 'patrol', 'miner'].every(t => legend.includes(t)), legend.join());
  const rows = J(`campNavRows(C).filter(r => r.ref).map(r => ({ id: r.id, kind: r.kind, group: r.group, name: r.name }))`);
  const nm = rows.find(r => r.kind === 'neutral');
  check('the list has the neutrals in a TRAFFIC group, by name', nm && nm.group === 'traffic' && /^(Patrol|Miner)/.test(nm.name), JSON.stringify(rows.slice(0, 4)));
  const sk = rows.find(r => r.id === 'alien:' + J('__sk.id'));
  check('a pirate is an enemy row named for its kind: "Skiff 7"', sk && sk.group === 'enemies' && /^Skiff \d+$/.test(sk.name), JSON.stringify(sk));
  check('the list headings include TRAFFIC', J('CAMPNAV.groups.some(g => g[0] === "traffic")'));
  check('flying to a neutral stops alongside (like a friend)', J(`campNavStop('neutral', { r: 0 })`) === J('CAMP.nav.stopFriend'));
  const tgt = J(`(() => { const r = campNavRows(C).find(r => r.kind === 'neutral'); const t = campNavTarget(C, r); return !!t && Number.isFinite(t.x) })()`);
  check('a neutral row resolves to its ship (the autopilot can fly to it)', tgt);
  // the nav goal of a kill objective names a pirate, not an alien
  g.run(`C.L.objectives = [{ type: 'kill', what: 'wave:0' }]; C.waves[0].started = true; __spawn('skiff', 800, 0).wave = 0;`);
  check('the goal row of a kill mission against pirates says "Pirate", not "Alien"', J(`(() => { const g = campNavGoal(C); return g && g.name })()`) === 'Pirate');
  const summ = J(`campSummary(C)`);
  check('the ship computer is told about pirates apart from aliens', /Pirates alive: \d+/.test(summ) && /Aliens alive: 1\./.test(summ), summ.slice(-300));
  // the words
  const keys = ['camp.say.pirate.break', 'camp.say.pirate.run', 'camp.say.neutral.lost', 'camp.nav.pirate', 'camp.nav.k.skiff', 'camp.nav.k.cutter', 'camp.nav.k.brute', 'camp.nav.k.patrol', 'camp.nav.k.miner', 'camp.map.pirate', 'camp.map.patrol', 'camp.map.miner'];
  const words = J(`${JSON.stringify(keys)}.map(k => uiText(k, { n: 3, name: 'Miner 1' }))`);
  check('every new line has words (none falls back to its key)', words.every((w, i) => w && w !== keys[i]), words.join(' | '));
  check('no word of a pirate says "alien"', !words.some(w => /alien/i.test(w)));
  check('spoken lines are short (12 words at most)', words.slice(0, 3).every(w => w.split(/\s+/).length <= 12));
  const md = src('content/text/campaign-pirates.md');
  check('the words are in their own file, content/text/campaign-pirates.md', keys.every(k => md.includes('| ' + k + ' |')));
  const scene = src('src/campaignscene.js');
  check('every new kind has a look in the scene (not the alien drone\'s)', ['skiff', 'cutter', 'brute', 'patrol', 'miner'].every(k => new RegExp('\\b' + k + ': campArtLook\\(').test(scene)));
  check('the script is in index.html', /src\/camppirates\.js/.test(src('index.html')));
  check('the table is documented in CAMP (pirate, traffic)', /pirate: \{/.test(src('src/campaign.js')) && /traffic: \{/.test(src('src/campaign.js')));
}

// ---------- I. the colour of their shots (card space-game-l1-pirate-shot-colour) ----------
console.log('I. the colour of their shots');
{
  g.run('__new(); __quiet()');
  const sh = J(`(() => { const p = __still(__spawn('skiff', 300, 0)); p.nextShot = 0; p.vmax = p.accel = 0; p.hp = p.maxHp = 1e6; p.def = Object.assign({}, p.def, { engage: 5000 }); const seen = []; for (let i = 0; i < 30 * 6; i++) { campStep(C, 1 / 30); C.events.length = 0; C.bullets.forEach(b => { if (b.from === p.id && seen.indexOf(b) < 0) seen.push(b); }); } return { n: seen.length, fac: seen.map(b => b.fac), team: seen.map(b => b.team) } })()`);
  check('a pirate\'s shots carry fac "pirate" (and are still the hostile side\'s, team alien)', sh.n >= 1 && sh.fac.every(f => f === 'pirate') && sh.team.every(t => t === 'alien'), JSON.stringify(sh));
  g.run('__new(); __quiet()');
  const al = J(`(() => { const a = __still(__spawn('raider', 300, 0)); a.nextShot = 0; a.hp = a.maxHp = 1e6; const seen = []; for (let i = 0; i < 30 * 6; i++) { campStep(C, 1 / 30); C.events.length = 0; C.bullets.forEach(b => { if (b.from === a.id && seen.indexOf(b) < 0) seen.push(b); }); } return { n: seen.length, fac: seen.map(b => b.fac || '') } })()`);
  check('an alien\'s shots carry no fac: they stay red', al.n === 0 || al.fac.every(f => f === ''), JSON.stringify(al));
  const pt = J(`(() => { const p = C.ships.find(u => u.kind === 'patrol'); const h = __still(campSpawn(C, 'cutter', p.x + 400, p.y)); h.hp = h.maxHp = 1e6; const seen = []; for (let i = 0; i < 30 * 5; i++) { campStep(C, 1 / 30); C.events.length = 0; C.bullets.forEach(b => { if (b.from === p.id && seen.indexOf(b) < 0) seen.push(b); }); } return { n: seen.length, team: seen.map(b => b.team) } })()`);
  check('a patrol\'s shots are team neutral (the scene draws them cyan)', pt.n >= 1 && pt.team.every(t => t === 'neutral'), JSON.stringify(pt));
  const col = J('CAMP_SHOT'), hsv = c => { const r = (c >> 16 & 255) / 255, gg = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: h * 60, s: mx ? d / mx : 0 }; };
  const ph = hsv(col.pirate), nh = hsv(col.neutral);
  check('a pirate\'s shot is amber: orange hue, not red (the aliens\'), not pale yellow (your guns\')', ph.h >= 25 && ph.h <= 45 && ph.s > 0.7, JSON.stringify(ph));
  check('a neutral\'s shot is cyan, not green (the wing\'s)', nh.h >= 170 && nh.h <= 200, JSON.stringify(nh));
  const scene = src('src/campaignscene.js'), fire = src('src/campmapfire.js');
  check('the scene picks the texture by team and fac (shot-neutral, shot-pirate; the alien keeps ebullet)', /b\.team === 'neutral' \? 'shot-neutral' : b\.fac === 'pirate' \? 'shot-pirate' : 'ebullet'/.test(scene));
  check('the textures are made when the scene is created', /campShotTextures\(this\)/.test(scene) && /function campShotTextures/.test(scene));
  check('the Tab map draws the same: a neutral\'s bullet teal, a pirate\'s yellow, an alien\'s red', /b\.team === 'neutral' \? K\.patrol : b\.fac === 'pirate' \? K\.pirate : K\.alien/.test(fire));
  const tex = J(`(() => { const made = {}; const sc = { textures: { exists: k => !!made[k] }, make: { graphics: () => { const g = new Proxy({}, { get: (t, n) => n === 'generateTexture' ? (k, w, h) => { made[k] = [w, h]; } : () => g }); return g; } } }; campShotTextures(sc); campShotTextures(sc); return made })()`);
  check('campShotTextures makes shot-pirate and shot-neutral, 14 by 4, once', tex['shot-pirate'] && tex['shot-pirate'].join() === '14,4' && tex['shot-neutral'] && tex['shot-neutral'].join() === '14,4' && Object.keys(tex).length === 2, JSON.stringify(tex));
}

// ---------- H. their own pictures (src/camppirateart.js) ----------
console.log('H. their own pictures');
{
  g.run(`window.__rec = fn => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => (...a) => { ops.push([name].concat(a)); return gfx; } }); window[fn](gfx); return ops; };`);
  const hsv = c => { const r = (c >> 16 & 255) / 255, gg = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: h * 60, s: mx ? d / mx : 0, v: mx }; };
  const fns = { skiff: 'campSkiffDraw', cutter: 'campCutterDraw', brute: 'campBruteDraw', patrol: 'campPatrolDraw', miner: 'campMinerDraw' };
  Object.keys(fns).forEach(kind => {
    const ops = J(`__rec('${fns[kind]}')`), [W, Ht] = J(`campArtSize('${kind}')`), a = J(`CAMP_ART.${kind}`), k = a.k;
    check(kind + ': it draws with fills, plain lines and paths only', [...new Set(ops.map(o => o[0]))].every(o => ['fillStyle', 'lineStyle', 'fillRect', 'fillCircle', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath', 'lineBetween'].includes(o)));
    check(kind + ': the picture is the hull plus a margin each side, k times the units', W === Math.round((a.len + 2 * a.pad) * k) && Ht === Math.round((2 * a.half + 2 * a.pad) * k), W + ' x ' + Ht);
    const out = []; ops.forEach(([o, ...p]) => { const inside = (x, y) => x >= -0.5 && y >= -0.5 && x <= W + 0.5 && y <= Ht + 0.5; if (o === 'fillRect' && !(inside(p[0], p[1]) && inside(p[0] + p[2], p[1] + p[3]))) out.push([o, ...p]); if (o === 'fillCircle' && !(inside(p[0] - p[2], p[1] - p[2]) && inside(p[0] + p[2], p[1] + p[2]))) out.push([o, ...p]); if (o === 'moveTo' || o === 'lineTo') { if (!inside(p[0], p[1])) out.push([o, ...p]); } });
    check(kind + ': every mark lies inside the picture', out.length === 0, out.length + ' outside, first ' + JSON.stringify(out[0]));
    const used = new Set(); ops.forEach(([o, x, y]) => { if (o === 'fillStyle') used.add(x); if (o === 'lineStyle') used.add(y); });
    check(kind + ': nothing red or pink (the aliens are)', [...used].every(c => { const x = hsv(c); return !((x.h >= 330 || x.h <= 15) && x.s > 0.3); }), [...used].filter(c => { const x = hsv(c); return (x.h >= 330 || x.h <= 15) && x.s > 0.3; }).map(c => c.toString(16)).join(' '));
    if (kind !== 'patrol' && kind !== 'miner') check(kind + ': a pirate has no green, cyan or blue (those are the wing\'s and the neutrals\') beyond its canopy glass', [...used].every(c => { const x = hsv(c); return !(x.h >= 80 && x.h <= 260 && x.s > 0.3); }));
    const look = J(`campArtLook('${kind}', '${kind}')`);
    check(kind + ': the scene scales it to the table length CAMP.size.' + kind + '.len', Math.abs(look.scale * look.w - J(`CAMP.size.${kind}.len`)) < 1e-9 && look.art === kind, JSON.stringify(look));
    check(kind + ': the hit circle is inside the drawn ship (under its half length)', J(`CAMP.size.${kind}.hit`) <= J(`CAMP.size.${kind}.len`) / 2, J(`CAMP.size.${kind}.hit`));
  });
  const tex = J(`(() => { const made = {}; const sc = { textures: { exists: k => !!made[k] }, make: { graphics: () => { const g = new Proxy({}, { get: (t, n) => n === 'generateTexture' ? (k, w, h) => { made[k] = [w, h]; } : () => g }); return g; } } }; return ['skiff', 'cutter', 'brute', 'patrol', 'miner'].map(k => [campShipTexture(sc, k), made['camp-' + k]]) })()`);
  check('campShipTexture makes each under its own key (camp-skiff ...) at the size campArtSize says', tex.every(([key, size], i) => key === 'camp-' + ['skiff', 'cutter', 'brute', 'patrol', 'miner'][i] && size && size[0] === J(`campArtSize('${['skiff', 'cutter', 'brute', 'patrol', 'miner'][i]}')`)[0]), JSON.stringify(tex));
  check('the pirates are bigger than your fighter and smaller than the cruiser; a brute is the biggest pirate', J('CAMP.size.skiff.len > CAMP.size.fighter.len && CAMP.size.brute.len > CAMP.size.cutter.len && CAMP.size.cutter.len > CAMP.size.skiff.len && CAMP.size.brute.len < CAMP.size.carrier.len'));
  check('a pirate\'s hit circle is about the raider\'s, the drone\'s and the gunship\'s it flies like (within a third)', [['skiff', 'raider'], ['cutter', 'drone'], ['brute', 'gunship']].every(([k, b]) => Math.abs(J(`CAMP.size.${k}.hit`) - J(`PIRATES.${b}.body[0]`)) <= J(`PIRATES.${b}.body[0]`) / 3));
  check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log(`\n${n - failed} of ${n} checks pass`);
process.exit(failed ? 1 : 0);
