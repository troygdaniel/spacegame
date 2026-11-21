// smoke: Level 1 as the rim run (plain Node, no Chrome): the rules the three missions need, tested on a fixture level, then the real data
// Card space-game-l1-rim-missions (Troy, 21 Nov 2026: Level 1 becomes the rim run: 1.1 escort a transport to Ceres, 1.2 mine and defend, cash in at the Ceres outpost, 1.3 haulers home and first contact).
//   A. the rules on a fixture level: a convoy's own speed, a wave that comes by how far a convoy has flown (on.lane) and from ahead of it (ahead), selling ore at a market outpost, paying from the cash
//      first, the objectives mined and cashin, the score a lost hauler costs
//   B. the real data (added with the missions)
// Run: node tests/camprim.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`
  window.__run = sec => { while (sec > 1e-9 && !C.result) { const d = Math.min(1, sec); campStep(C, d); sec -= d; } };
  var __pl = campPlaces(1);
  CAMP.levels.rt = { name: 'Rim test', start: 'luna', startAt: [130, 30], earth: false, startOre: 0, places: __pl, rocks: [], convoys: [], waves: [],
    outposts: { luna: { name: 'Lunar Base' }, ceres: { name: 'Occator Works', market: { rate: 3 } } },
    missions: [
      { id: 'escort', kind: 'escort', place: 'luna', dock: 'luna',
        convoys: [{ id: 't1', name: 'Transport', at: 2, from: 'luna', to: 'ceres', speed: 100 }],
        objectives: [{ type: 'deliver', n: 1 }],
        waves: [{ on: { lane: 0.3 }, ahead: 1800, ships: { raider: 2 }, goal: 'convoy:t1', say: 'camp.say.raid' }, { on: { lane: 0.6 }, ahead: 1500, ships: { raider: 3 }, goal: 'convoy:t1', say: 'camp.say.raid2' }] },
      { id: 'mine', kind: 'defend', start: 'ceres', startAt: [130, 30], place: 'ceres', dock: 'ceres',
        rocks: [{ at: [900, 700], n: 6, spread: 200 }],
        objectives: [{ type: 'ore', n: 100 }, { type: 'cashin' }], waves: [] },
      { id: 'haulers', kind: 'escort', start: 'ceres', startAt: [130, 30], place: 'ceres', dock: 'ceres',
        convoys: [{ id: 'h1', name: 'Hauler 1', at: 1, from: 'ceres', to: 'luna' }, { id: 'h2', name: 'Hauler 2', at: 2, from: 'ceres', to: 'luna' }, { id: 'h3', name: 'Hauler 3', at: 3, from: 'ceres', to: 'luna' }],
        objectives: [{ type: 'deliver', n: 1 }] }
    ] };
  window.__rt = (i, seed) => { window.C = campNew('rt', [], { seed: seed == null ? 1 : seed, mission: i }); return !!C; };
`);

console.log('A. the rules, on a fixture level');
{
  g.run('__rt(0)');
  check('the carrier starts at the Lunar Base (Luna), not at Ceres; the level has two outposts and the Ceres one is a market', Math.hypot(J('C.carrier.x') - J('campPlaces("rt").luna.x'), J('C.carrier.y') - J('campPlaces("rt").luna.y')) < 200 && J('campOutposts("rt").length') === 2);
  g.run('__run(2.5)');
  const t = () => J('campConvoys(C)[0]');
  check('a convoy row has its own speed: the transport flies at 100 px/s, not the table\'s 120', !!t() && t().vmax === 100, JSON.stringify(t()));
  check('a convoy remembers its lane: where it began and how long the way is (Luna to Ceres, over 15,000 px)', J('campConvoys(C)[0].lane') > 15000 && J('campConvoys(C)[0].from.x') !== undefined);
  check('no wave yet: the transport has flown a few hundred px of sixteen thousand', J('C.waves[0].started') === false && J('campAliens(C).length') === 0);
  g.run('(() => { const f = campConvoys(C)[0]; const dx = f.dest.x - f.from.x, dy = f.dest.y - f.from.y; f.x = f.from.x + dx * 0.31; f.y = f.from.y + dy * 0.31; })(); __run(0.1)');
  check('at 31 percent of the way the first wave comes: two raiders, said once', J('C.waves[0].started') === true && J('C.waves[1].started') === false && J('campAliens(C).length') === 2);
  check('they come from ahead of the transport: about 1,800 px in front of it along its way, within 400 px to either side', J('(() => { const f = campConvoys(C)[0], a = campAliens(C)[0], dx = f.dest.x - f.x, dy = f.dest.y - f.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ex = a.x - f.x, ey = a.y - f.y; const along = ex * ux + ey * uy, side = Math.abs(-ex * uy + ey * ux); return along > 1400 && along < 2200 && side < 700; })()'));
  g.run('(() => { const f = campConvoys(C)[0]; const dx = f.dest.x - f.from.x, dy = f.dest.y - f.from.y; f.x = f.from.x + dx * 0.62; f.y = f.from.y + dy * 0.62; })(); __run(0.1)');
  check('at 62 percent the second wave comes: three more', J('C.waves[1].started') === true && J('campAliens(C).length') === 5);
  g.run('__rt(0); __run(2.5); campConvoys(C)[0].hp = 0; campKill(C, campConvoys(C)[0] || C.ships.find(u => u.kind === "freighter")); __run(0.2)');
  check('the transport dying loses the mission (deliver 1 of 1 can no longer be met)', J('C.result') === 'lost' && J('C.why') === 'convoy');
  g.run('__rt(0); __run(2.5); (() => { const f = campConvoys(C)[0]; f.x = f.dest.x - 50; f.y = f.dest.y; })(); __run(1)');
  check('the transport arriving at Ceres wins the mission with a score', J('C.result') === 'won' && J('C.score.score') > 1000);
  g.run('__rt(0); __run(1)');
  check('a wave with no lane trigger and no convoy running never starts by itself (lane is false until the convoy has left)', (g.run('C.convoys[0].started = false; C.ships = C.ships.filter(u => u.kind !== "freighter")'), J('campWaveOn(C, { lane: 0.3 })') === false));

  // the market
  g.run('__rt(1); C.ships = C.ships.filter(u => u.team !== "alien"); C.ore = 150; C.carrier.x = campPlaces("rt").ceres.x + 200; C.carrier.y = campPlaces("rt").ceres.y');
  check('docking at the Ceres outpost sells the store: 150 ore at 3 each is 450 cash, the store is empty, the sale is an event the room can say', (() => { const r = J('campDock(C, "ceres")'); return r.ok === true && J('C.cash') === 450 && J('C.ore') === 0 && J('C.events.some(e => e.type === "sold" && e.ore === 150 && e.cash === 450)'); })());
  check('and the sale is made once: docking again with nothing in the store adds nothing; ore mined later is sold at the next docking', (() => { g.run('campUndock(C); C.ore = 10'); g.run('campDock(C, "ceres")'); return J('C.cash') === 480 && J('C.ore') === 0; })());
  g.run('__rt(1); C.ships = C.ships.filter(u => u.team !== "alien"); C.ore = 80; C.carrier.x = campPlaces("rt").luna.x + 100; C.carrier.y = campPlaces("rt").luna.y');
  check('an outpost with no market (the Lunar Base) buys nothing: the ore stays in the store', (() => { g.run('campDock(C, "luna")'); return J('C.cash') === 0 && J('C.ore') === 80; })());

  // paying
  g.run('__rt(1); C.docked = "ceres"; C.ore = 20; C.cash = 100; C.carrier.hp = C.carrier.maxHp / 2');
  check('funds are the cash and the ore together: 120', J('campFunds(C)') === 120);
  check('a repair is paid from the cash first: the half hull costs 30 ore-worth, the cash goes down and the ore stays', (() => { const r = J('campOrder(C, "repair", "")'); return r.ok === true && J('C.cash') === 70 && J('C.ore') === 20; })());
  g.run('C.cash = 10; C.ore = 40; C.carrier.hp = C.carrier.maxHp / 2');
  check('when the cash is not enough the rest comes from the store: a 30 repair with 10 cash and 40 ore leaves 0 cash and 20 ore', (() => { const r = J('campOrder(C, "repair", "")'); return r.ok === true && J('C.cash') === 0 && J('C.ore') === 20; })());
  g.run('C.cash = 5; C.ore = 5; C.carrier.hp = C.carrier.maxHp / 2');
  check('with too little of both the order is refused and nothing is taken', (() => { const r = J('campOrder(C, "repair", "")'); return r.ok === false && J('C.cash') === 5 && J('C.ore') === 5; })());
  g.run('C.docked = ""; C.cash = 100; C.ore = 100');
  check('a fighter built at the dock is paid the same way (cash first)', (() => { g.run('C.docked = "ceres"'); const r = J('campOrder(C, "build", "fighter")'); return r.ok === true && J('C.cash') + J('C.ore') === 200 - J('CAMP.build.fighterCost') && J('C.cash') === 100 - J('CAMP.build.fighterCost'); })());

  // the objectives
  g.run('__rt(1); C.ships = C.ships.filter(u => u.team !== "alien")');
  check('mission "mine": an objective ore (at least 100 in the store at some time) and one cashin; neither is met at the start', J('campObjectives(C).map(o => o.type + ":" + o.done).join()') === 'ore:false,cashin:false');
  g.run('C.ore = 120; campMissions_tick(C, 0.1)');
  check('the store reaching 100 meets "ore", and it stays met when the ore is sold (the best store counts, the mission remembers it)', (() => { const was = J('campObjectives(C)[0].done'); g.run('C.carrier.x = campPlaces("rt").ceres.x + 200; C.carrier.y = campPlaces("rt").ceres.y; campDock(C, "ceres"); campUndock(C); campMissions_tick(C, 0.1)'); return was === true && J('campObjectives(C)[0].done') === true; })());
  check('selling at the market meets "cashin" and with both met the mission is won', J('campObjectives(C)[1].done') === true && J('C.result') === 'won' && J('C.score.score') > 1000);
  check('the carried money: what the cruiser has at the end (ore and cash) is what the progress takes on (the ready room and the refit spend it)', J('campFunds(C)') === 360);

  // the haulers
  g.run('__rt(2); __run(3.2)');
  check('three haulers leave Ceres for the Lunar Base; two lost of three do not lose the mission (deliver 1): only all lost does', (() => { g.run('campConvoys(C).forEach((u, i) => { if (i < 2) campHurt(C, u, 9999, "x"); }); __run(0.2)'); const still = J('C.result') === null; g.run('campConvoys(C).forEach(u => campHurt(C, u, 9999, "x")); __run(0.2)'); return still && J('C.result') === 'lost' && J('C.why') === 'convoy'; })());
  g.run('__rt(2); __run(3.2); campHurt(C, campConvoys(C)[0], 9999, "x"); campHurt(C, campConvoys(C)[1], 9999, "x"); (() => { const f = campConvoys(C)[0]; f.x = f.dest.x - 50; f.y = f.dest.y; })(); __run(1)');
  check('one hauler arriving of three wins it; the two lost lower the score by CAMP.score.hauler each (it is not the same as a lost ship of the wing)', J('C.result') === 'won' && J('C.lost') === 2 && J('C.score.haulerLost') === 2 * J('CAMP.score.hauler') && J('C.score.shipsLost') === 0 && J('CAMP.score.hauler') > 0);
  g.run('__rt(2); __run(3.2); (() => { const f = campConvoys(C)[0]; f.x = f.dest.x - 50; f.y = f.dest.y; })(); __run(0.2); (() => { const f = campConvoys(C)[0]; f.x = f.dest.x - 50; f.y = f.dest.y; })(); __run(0.2); (() => { const f = campConvoys(C)[0]; f.x = f.dest.x - 50; f.y = f.dest.y; })(); __run(1)');
  check('all three arriving costs nothing: no hauler lost, no deduction', J('C.result') === 'won' && J('C.lost') === 0 && J('C.score.haulerLost') === 0);
}

console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);
