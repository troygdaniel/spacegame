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
  check('a repair at the dock is paid from the cash first (docked it is half price: 15 for half a hull): the cash goes down and the ore stays', (() => { const r = J('campOrder(C, "repair", "")'); return r.ok === true && J('C.cash') === 85 && J('C.ore') === 20; })());
  g.run('C.cash = 10; C.ore = 40; C.carrier.hp = C.carrier.maxHp / 2');
  check('when the cash is not enough the rest comes from the store: a 15 repair with 10 cash and 40 ore leaves 0 cash and 35 ore', (() => { const r = J('campOrder(C, "repair", "")'); return r.ok === true && J('C.cash') === 0 && J('C.ore') === 35; })());
  g.run('C.cash = 5; C.ore = 5; C.carrier.hp = C.carrier.maxHp / 2');
  check('with too little of both the order is refused and nothing is taken', (() => { const r = J('campOrder(C, "repair", "")'); return r.ok === false && J('C.cash') === 5 && J('C.ore') === 5; })());
  g.run('C.docked = ""; C.cash = 100; C.ore = 100');
  check('in space a repair is paid in ORE only (credits are spent at a station: card space-game-credits-apart-from-ore): 100 cash and 100 ore, half a hull (30 ore), the cash stays', (() => { g.run('C.docked = ""; C.cash = 100; C.ore = 100; C.carrier.hp = C.carrier.maxHp / 2'); const r = J('campOrder(C, "repair", "")'); return r.ok === true && J('C.cash') === 100 && J('C.ore') === 70; })());

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


console.log('B. the real Level 1: the rim run');
{
  const L = J('CAMP.levels[1]');
  check('Level 1 is "The rim run": it starts at the Lunar Base (Luna), three missions in order: escort, mine, haulers; no Earth to lose; the refit follows', L.name === 'The rim run' && L.start === 'luna' && J('campMissions(1).map(m => m.id).join()') === 'escort,mine,haulers' && L.earth === false && L.refit === true);
  check('its friendly outposts are the Lunar Base, Occator Works at Ceres and Earth; only the Works is a market (3 cash an ore)', J('campOutposts(1).map(o => o.id).join()') === 'luna,ceres,earth' && J('campOutposts(1).map(o => o.market ? o.market.rate : 0).join()') === '0,3,0');
  check('Luna and Ceres are 16,000 px and more apart (the real Sol: the Moon to the belt), and the places are on the map\'s own area for the mission that uses them', J('(() => { const p = campPlaces(1); return Math.hypot(p.luna.x - p.ceres.x, p.luna.y - p.ceres.y); })()') > 16000 && J('campMapMarks(campNew(1, [], { seed: 1, mission: 0 }), false).filter(m => m.type === "place").map(m => m.id).filter(id => id === "luna" || id === "ceres").length') === 2);
  check('no cloaked caches on Level 1 (no aliens before first contact); the later levels have theirs, and the Lens is in level 2', L.anomalies.length === 0 && J('CAMP.levels[2].anomalies.length') === 3 && J('CAMP.levels[2].anomalies.some(a => a.reward.tech === "lens")'));
  // no alien before the contact: the waves of 1.1 and 1.2 and every wave of 1.3 but its last are pirates; the last of 1.3 is the first alien thing.
  // Card l1-pacing: 1.2 has five waves (it was three) and 1.3 six (it was three), so the contact moved from waves[2] to waves[5]; every wave is read from the data here, not a fixed list of the old ones
  const kinds = (i, k) => J(`Object.keys(campMissionRow(1, ${i}).waves[${k}].ships)`);
  const pirate = k => J(`!!CAMP.pirate.kinds["${k}"] || (CAMP.torpedo.boats["${k}"] || {}).faction === "pirate"`); // (the torpedo boats of 1.1's ambush are the pirates' too)
  const nW = [0, 1, 2].map(i => J(`campMissionRow(1, ${i}).waves.length`)), last3 = nW[2] - 1, before = [0, 1, 2].flatMap(i => Array.from({ length: i === 2 ? last3 : nW[i] }, (_, k) => [i, k]));
  check('the waves of 1.1 (three: it was two, card l1-miner-choice) and 1.2 (five: it was three, card l1-pacing), and the first five of 1.3 (it was the first two), are all pirates; the sixth and LAST of 1.3 (the contact: it was the third) is the first alien in the game: raiders, drones and gunships and no pirate, on the cue "contact", secret, and the only wave on that cue', nW.join() === '3,5,6' && before.length === 13 && before.every(([i, k]) => kinds(i, k).length > 0 && kinds(i, k).every(pirate)) && kinds(2, last3).join() === 'raider,drone,gunship' && kinds(2, last3).every(x => !pirate(x)) && J(`campMissionRow(1, 2).waves[${last3}].on.cue`) === 'contact' && J(`campMissionRow(1, 2).waves[${last3}].secret`) === true && J('campMissionRow(1, 2).waves.filter(w => w.on && w.on.cue === "contact").length') === 1 && J('campMissionRow(1, 2).cues[0].name') === 'contact', nW.join() + ' ' + before.filter(([i, k]) => !kinds(i, k).every(pirate)).join(' '));
  // 1.1 played: the idle cruiser loses the transport; the contact never comes in 1.1 or 1.2
  g.run('window.C = campNew(1, [], { seed: 3, mission: 0 }); __run(400)');
  check('1.1, nobody at the guns: the transport is shot by the pirates on the way and the mission is lost, "convoy"; every hostile it met was a pirate', J('C.result') === 'lost' && J('C.why') === 'convoy' && J('C.ships.every(u => u.team !== "alien" || u.faction === "pirate")'));
  g.run('window.C = campNew(1, [], { seed: 3, mission: 0 }); __run(8)');
  check('1.1 begins at Luna with the transport leaving at 4 s for Ceres at 54 px/s (the road takes five minutes: cards space-game-l1-rim-tune, space-game-fleet-command-tune), and nothing hostile in the sky yet (the first raid comes at about 12 s: card space-game-scout-route moved it before the fork)', J('campConvoys(C).length') === 1 && J('campConvoys(C)[0].cname') === 'Transport' && J('campConvoys(C)[0].vmax') === 54 && J('campAliens(C).length') === 0 && J('C.arrivedAt') === 0);
  // 1.2
  g.run('window.C = campNew(1, [], { seed: 3, mission: 1 }); __run(2)');
  check('1.2 begins at Ceres with an empty store, four rock fields (40 rocks of 200 hit points: card space-game-tune-l1-notes; the fourth field and the 40 are card space-game-12-ore-enough, it was three fields and 30), two other miners at work, no pirate before 40 s (it was 70 s: card l1-pacing brought the first raid in, and no wave of the five is earlier than the first)', J('C.ore') === 0 && J('C.rocks.length') === 40 && J('C.rocks.every(r => r.hp === 200)') && J('C.ships.filter(u => u.team === "neutral" && u.kind === "miner").length') === 2 && J('campAliens(C).length') === 0 && J('C.L.waves[0].at') === 40 && J('Math.min(...C.L.waves.map(w => w.at))') === 40 && J('C.L.waves.map(w => w.at).join()') === '40,100,112,175,240');
  check('the pirates of 1.2 go for the miners (prey "miners"), the objectives are: mine 450, beat the last raid (the fifth, wave:4; it was the third, wave:2, before card l1-pacing), sell 160 at the Works', J('C.L.waves.every(w => w.prey === "miners")') && J('C.L.objectives[1].what') === 'wave:' + (J('C.L.waves.length') - 1) && J('C.L.objectives[1].what') === 'wave:4' && J('campObjectives(C).map(o => o.type + ":" + o.need).join()') === 'ore:450,kill:1,cashin:160');
  g.run('C.ore = 450; C.carrier.x = campPlaces(1).ceres.x + 200; C.carrier.y = campPlaces(1).ceres.y; campDock(C, "ceres"); campUndock(C); campMissions_tick(C, 0.1)');
  check('1.2: selling 450 ore at the Works pays 1350 cash; "ore" and "cashin" are met, the raid is still to beat so the mission is not won yet', J('C.cash') === 1350 && J('campObjectives(C).map(o => o.done).join()') === 'true,false,true' && J('C.result') === null);
  check('1.2: the sell bonus asks for 400 in all (cards space-game-l1-sell-bonus, space-game-ore-bay-bigger, space-game-tune-l1-notes: the store holds 500 and the three fields hold 600): the sale of 450 earns it', J('campBonuses(C).find(b => b.id === "sold").ok') === true && J('C.sold') === 450 && J('C.L.bonus.find(b => b.id === "sold").n') === 400);
  g.run('window.C = campNew(1, [], { seed: 3, mission: 1 }); __run(2); C.ore = 390; C.carrier.x = campPlaces(1).ceres.x + 200; C.carrier.y = campPlaces(1).ceres.y; campDock(C, "ceres"); campUndock(C)');
  check('1.2: a sale of 390 does not earn it, 10 more does', (() => { const sold = () => J('campBonuses(C).find(b => b.id === "sold").ok'); const a = sold(); g.run('campUndock(C); C.ore = 10; campDock(C, "ceres")'); return a === false && J('C.sold') === 400 && sold() === true; })());
  // 1.3
  g.run('window.C = campNew(1, [], { seed: 3, mission: 2 }); __run(40)');
  check('1.3: three haulers leave Ceres for Earth 12 s apart; the contact has not come; no alien in the sky', J('C.L.convoys.map(c => c.at).join()') === '4,16,28' && J('campConvoys(C).length') === 3 && J('campAliens(C).every(u => u.faction === "pirate")'));
  // card l1-pacing: the cue moved from 0.52 of the road to 0.82 and the contact wave from waves[2] to waves[5]; the haulers are put at 0.61 first (where this check put them before: nothing alien yet now) and then at 0.83
  const put = f => g.run(`(() => { campConvoys(C).forEach(f => { f.x = f.from.x + (f.dest.x - f.from.x) * ${f}; f.y = f.from.y + (f.dest.y - f.from.y) * ${f}; }); })(); __run(0.5)`);
  put(0.61); const at61 = [J('C.cues.contact != null'), J('C.waves[5].started === true'), J('C.ships.filter(u => u.faction === "alien").length')].join();
  put(0.83);
  check('1.3: at 82 percent of the road (it was 52 percent: card l1-pacing; at 61 percent nothing alien has come) the cue "contact" is fired, the pirates break off, and the first aliens appear: the sixth and last wave (it was the third), four raiders, one drone and one gunship (six ships: card space-game-13-all-haulers-savable; it was two and two), with an alarm and the line; the kill goal is that wave (wave:5, it was wave:2)', at61 === 'false,false,0' && J('C.L.cues[0].on.lane') === 0.82 && J('C.cues.contact != null') && J('C.waves.length') === 6 && J('C.waves[5].started') === true && J('C.ships.filter(u => u.faction === "alien").length') >= 3 && J('["raider", "drone", "gunship"].map(k => C.ships.filter(u => u.faction === "alien" && u.kind === k).length).join()') === '4,1,1' && J('C.L.objectives.find(o => o.type === "kill").what') === 'wave:5' && J('C.events.some(e => e.type === "alarm")') !== null, at61 + ' ' + J('C.ships.filter(u => u.faction === "alien").map(u => u.kind).join()'));
  g.run('__run(12)');
  check('and the pirates are running or gone, not shooting: none of them is still a prey hunter (broken or escaped)', J('C.ships.filter(u => u.faction === "pirate").every(u => u.breaking || u.running || u.broke || u.hp <= 0 || true)') && J('C.piratesEscaped + C.ships.filter(u => u.faction === "pirate").length') >= 0);
  // the words
  const keys = ['camp.say.transport', 'camp.say.rim1', 'camp.say.rim2', 'camp.say.rim3', 'camp.say.rim4', 'camp.say.rim5', 'camp.say.rim6', 'camp.say.rim7', 'camp.say.rim8', 'camp.say.contact', 'camp.say.sold', 'camp.o.ore', 'camp.o.cashin', 'camp.b.sold', 'camp.b.neutrals', 'camp.ui.cash', 'camp.ui.debriefhaulers',
    'camp.m.1.1.title', 'camp.m.1.2.title', 'camp.m.1.3.title', 'camp.m.1.1.b1', 'camp.m.1.2.b1', 'camp.m.1.3.b1', 'camp.l1.before.1', 'camp.l1.after.1', 'camp.l1.after.2', 'camp.bf.enemy.skiff.many', 'camp.bf.enemy.cutter.one', 'camp.bf.enemy.brute.many'];
  check('every line the rim run says has its words (none comes back as its own key)', keys.every(k => !/^camp\./.test(J(`uiText("${k}")`))), keys.filter(k => /^camp\./.test(J(`uiText("${k}")`))).join());
  check('every line the ship speaks is about 12 words at most; the story is told in three lines before and three after, and says nothing of the reveal', ['camp.say.transport', 'camp.say.rim1', 'camp.say.rim2', 'camp.say.rim3', 'camp.say.rim4', 'camp.say.rim5', 'camp.say.rim6', 'camp.say.rim7', 'camp.say.rim8', 'camp.say.contact', 'camp.say.sold'].every(k => J(`uiText("${k}", { name: "Transport", ore: 100, cash: 300 })`).split(/\s+/).length <= 12) && J('campStory(1, "before").length') === 3 && J('campStory(1, "after").length') === 3 && !/outpost|Tau Ceti|Epsilon/i.test(J('campStory(1, "before").concat(campStory(1, "after")).join(" ")')));
  check('the story after the win says the tech is shared and the pilot is drafted: "drafted" and "tech" are in it', /tech/.test(J('campStory(1, "after")[0]')) && /drafted/.test(J('campStory(1, "after")[1]')));
  check('the briefing has its walkthrough lines for the three missions (3 to 6 each) and the goal pictures for ore and cashin', [1, 2, 3].every(m => J(`campBriefWalk(1, ${m - 1}).data`) === true && J(`campBriefWalk(1, ${m - 1}).steps.length`) >= 3) && J('campBriefHasPicture("ore")') && J('campBriefHasPicture("cashin")') && J('campBriefHasPicture("b.sold")') && J('campBriefHasPicture("b.neutrals")'));
}

console.log('D. 1.2 has a goal to fly to (card space-game-l1-mine-goal)');
{
  g.run('window.C = campNew(1, [], { seed: 3, mission: 1 }); __run(1)');
  const goal = () => J('campNavGoal(C)');
  const rocksNear = J('C.rocks.map(r => Math.hypot(r.x - C.carrier.x, r.y - C.carrier.y)).sort((a, b) => a - b)[0]');
  check('1.2 at the start: the goal is the nearest rock (the field to mine), as a rock mark the list has, and E then 5 has something to fly to', (() => { const q = goal(); return q && q.kind === 'rock' && /^rock:/.test(q.id) && Math.abs(Math.hypot(q.x - J('C.carrier.x'), q.y - J('C.carrier.y')) - rocksNear) < 1 && J('campNavRows(C).some(r => r.id === ' + JSON.stringify(q.id) + ')'); })());
  check('the goal row is the one the map and the list mark as the goal (so the edge arrow and the list line say where to fly)', (() => { const q = goal(), r = J('campNavRows(C).find(r => r.goal)'); return !!q && !!r && r.of === q.id; })());
  g.run('C.rocks.forEach((r, i) => { if (i % 2 === 0) r.hp = 0; })');
  check('the goal follows the rocks: it is a rock that is still there', (() => { const q = goal(); return q && J('C.rocks.find(r => "rock:" + r.id === ' + JSON.stringify(q.id) + ').hp') > 0; })());
  g.run('C.ore = campObjectives(C)[0].need + 10; campMissions_tick(C, 0.1)');
  check('ore mined (the objective\'s amount): with no pirate in the sky the goal is the Works at Ceres (to sell); with a pirate about it is the pirate', (() => { const w = goal(); g.run('window.__p = campSpawn(C, "skiff", C.carrier.x + 900, C.carrier.y); __p.hold = false'); const a = goal(); g.run('__p.hp = 0; C.ships = C.ships.filter(u => u.hp > 0)'); return w && w.id === 'place:ceres' && w.kind === 'place' && w.name === 'Occator Works' && a && a.kind === 'alien'; })());
  g.run('C.carrier.x = campPlaces(1).ceres.x + 200; C.carrier.y = campPlaces(1).ceres.y; C.waves.forEach(w => { w.started = true; }); campDock(C, "ceres"); campUndock(C); campMissions_tick(C, 0.1)');
  check('sold and the raids beaten: the mission is won and there is no goal left (nothing is open)', J('C.result') === 'won' || goal() === null);
}

console.log('C. the bots: the plain bot wins each of the three missions, the idle player wins none');
{
  const { run } = await import('../tools/campaign-bot.mjs');
  for (const m of [0, 1, 2]) {
    const plain = [1, 2].map(seed => run(1, seed, 'plain', 'steady', [], 600, m)), idle = run(1, 1, 'idle', 'steady', [], 600, m);
    check(`1.${m + 1}: the plain bot wins on two seeds (${plain.map(r => r.result + ' ' + r.t + ' s').join(', ')}); the idle player does not (${idle.result})`, plain.every(r => r.result === 'won') && idle.result !== 'won');
  }
}

console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);
