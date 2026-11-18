#!/usr/bin/env node
// Long Haul economy simulator (card space-game-economy-numbers). It prints the tables that docs/ECONOMY.md explains, from the game's own
// files, so the numbers cannot drift from the game without a table changing here. No gameplay is touched: it only reads src/.
//   node tools/economy-sim.mjs              every table
//   node tools/economy-sim.mjs income       one of: income  prices  losses  pacing  tune  planned  systems  check
//   node tools/economy-sim.mjs --root DIR   read another checkout (default: this repo)
//   node tools/economy-sim.mjs --eff 0.5    the efficiency guess (share of play time spent in a loop, default 0.35)
// Three kinds of number are in here and the tables say which:
//   DATA     read from src/ at run time (ships, parts, rewards, bounties, ore price, rock hp, belts, spawn table, positions)
//   PINNED   written in a code line rather than a table (repair price, insurance, the MULE speed); `check` greps the source and
//            warns when that line changed, so a stale pin is noticed
//   PACE     how a player plays: seconds per step, hit rate, efficiency. Nothing in src/ knows these; they are guesses to be
//            replaced by what a playtest measures (docs/ECONOMY.md section 2). Change them in the PACE block and rerun.
// Needs Node 22+, no packages.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

// ---------------------------------------------------------------- 1. DATA: the game's own files, run in a sandbox
// The game is plain browser scripts that share globals, so they are run one after another in one vm context. What they use at run
// time (Phaser, scenes, sound) is a stand-in that accepts anything; the data tables and the small price functions are real.
const FILES = ['common', 'data_ships', 'data_parts', 'data_systems', 'universe', 'fleet', 'missions', 'enemies', 'asteroids'];
export function loadGame(root) {
  const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop, construct: () => noop });
  const real = vm.runInNewContext('globalThis'), builtins = new Set(Object.getOwnPropertyNames(real)), box = {};
  const sandbox = new Proxy(box, {
    has: (t, k) => typeof k === 'string' && (k in t || !builtins.has(k)),
    get: (t, k) => (k in t ? t[k] : builtins.has(k) ? real[k] : noop),
    set: (t, k, v) => { t[k] = v; return true; }
  });
  const ctx = vm.createContext(sandbox), problems = [];
  for (const f of FILES) {
    try { vm.runInContext(readFileSync(join(root, 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }); } catch (e) { problems.push(f + '.js: ' + e.message.split('\n')[0]); }
  }
  const get = expr => vm.runInContext(expr, ctx);
  const need = (name, ok) => { let v; try { v = get(name); } catch (e) { v = undefined; } if (!ok(v)) problems.push('missing or wrong: ' + name); return v; };
  const g = {
    problems,
    ships: need('SHIP_MODELS', v => v && v.wren && v.bastion),
    parts: need('PARTS', v => v && v.shields && v.cargo),
    order: need('PART_ORDER', Array.isArray),
    partPrice: get('partPrice'),                       // the shop's own function: ship partMult and a dock row, rounded to ten
    missions: need('MISSIONS', v => Array.isArray(v) && v.length >= 4),
    pirates: need('PIRATES', v => v && v.raider && v.gunship),
    systems: need('SYSTEMS', v => v && v.halcyon),
    oreCap: need('ORE_CAP', Number.isFinite), orePrice: need('ORE_PRICE', Number.isFinite), rockHp: need('ROCK_HP', v => v && v[3]),
    fleet: need('FLEET', v => v && v.sell > 0), reaverHp: need('REAVER_HP', Number.isFinite)
  };
  return g;
}

// ---------------------------------------------------------------- 2. PINNED: numbers that sit in a code line, not in a table
// text (one line of code, or a list of them) must still be found in the file, or `check` says the pin is stale
// constant: a pin whose number is a one-line constant in its file (let NAME = 0.5;): the value is READ from the code, so a change to the
// constant (a content file can change it) moves the pin with it, and `check` says so if that line is gone
export const constIn = (file, name) => {
  try { const m = new RegExp('\\b(?:let|const|var) ' + name + ' = (-?[0-9.]+);').exec(readFileSync(join(ROOT, file), 'utf8')); return m ? Number(m[1]) : null; } catch (e) { return null; }
};
export const PINS = {
  repairPerPoint: { get value() { return constIn('src/station.js', 'REPAIR_PRICE') ?? 0.5; }, constant: 'REPAIR_PRICE', file: 'src/station.js', text: ['price = repairPrice(), cost = Math.ceil(missing * price)', 'return d && d.repair > 0 ? d.repair : REPAIR_PRICE'], what: 'repair bay: credits a point of hull (the REPAIR_PRICE constant, 0.5 as shipped, Halcyon\'s; another dock has its own dock.repair)' },
  insurancePct: { value: 0.2, file: 'src/space.js', text: 'Math.floor(G.credits * 0.2)', what: 'insurance fee: 20% of your credits' },
  insuranceMin: { value: 50, file: 'src/space.js', text: 'Math.max(50,', what: 'insurance fee: never less than 50' },
  muleSpeed: { value: [60, 30], file: 'src/missions.js', text: 'box: 350, cruise: 60, slow: 30', what: 'the MULE: covered (you inside her 350 px ring), exposed (px/s)' },
  podCredit: { value: [10, 40], file: 'src/enemies.js', text: 'Phaser.Math.Between(10, 40)', what: 'a salvage pod that holds credits' },
  podCreditShare: { value: 0.7, file: 'src/enemies.js', text: "Math.random() < 0.3 ? 'hull'", what: 'a pod holds credits 70% of the time (30% hull)' },
  rockSplit: { value: 'thirds', file: 'src/asteroids.js', text: 'i < belt.rocks / 3 ? 3 : i < belt.rocks * 2 / 3 ? 2 : 1', what: 'a belt is a third each of size 3, 2 and 1 rocks' },
  oreDrop: { value: 0.5, file: 'src/asteroids.js', text: 'size > 1 || Math.random() < 0.5', what: 'a rock drops ore; a size 1 rock only half the time' },
  hyperSecPerLy: { value: 1.6, file: 'src/hyperspace.js', text: 'secPerLy: 1.6', what: 'hyperspace: seconds per light year' },
  launchGrace: { value: 20, file: 'src/enemies.js', text: 'LAUNCH_GRACE = 20000', what: 'no pirate engages for 20 s after a launch' }
};

// ---------------------------------------------------------------- 3. PACE: how a player plays (guesses, replace with measurements)
export const PACE = {
  speedUse: 0.85,      // share of top speed really flown over a leg (turns, the dock speed limit, looking around)
  cruiseSpeed: 8000,   // px/s in cruise (src/asteroids.js comment); used for far belts
  dockSec: 40,         // at the station per run: read the board, take the call, walk to the ship, undock; and on return dock and be paid
  groundSec: 120,      // Rescue on Kepler-4b: land, find the colonist, keep them alive, walk back, lift off
  hitRate: 0.45,       // the share of shots that hit a moving pirate
  approachSec: 10,     // closing on one pirate before the first shot
  fightFactor: 2.5,    // chasing and dodging make a fight this much longer than the shots alone
  reaverSec: 40,       // the Reaver's charge and spread, on top of killing it and its two escorts
  oreSec: 3.5,         // per ore: line up a rock, fly through the pod, collect it
  pumpSec: 10,         // refuel at the fuel pump before a jump
  arriveSec: 35,       // after a jump: fly from the arrival point to the station (cruise) and dock
  leaveSec: 25,        // before a jump: undock and fly clear of the station to where the jump can start
  loadSec: 30,         // loading a haul at one end and unloading at the other
  surveySec: 150,      // a survey call: fly to the site and scan it
  bigWreckSec: 180,    // the 800 cr wreck at Lethe: its scavenger drones and the salvage
  hullPerKill: 6,      // hull points a pirate costs you on average
  deathsPerHour: 0.5,  // ships lost per hour of play (the insurance fee comes out of your credits)
  efficiency: 0.35     // the share of play time that goes into the loop itself; the rest is flying about, reading, shopping, learning, dying (--eff N)
};

// ---------------------------------------------------------------- 4. DOC: what only docs/UNIVERSE.md says (the eight systems, not built yet)
// ly position and what the system does to prices. fuel and ore are credits a unit (UNIVERSE.md 3, 4.2); the rest is this card's proposal
// for E4: part = multiplier on a part's price (data_systems.js dock.partMult), pay = multiplier on call rewards, repair = on the repair bay.
export const SYSTEM_ECON = {
  halcyon:  { name: 'Halcyon',        kind: 'home',            ly: [20, 22],     danger: 1, fuel: 8,    ore: 20, part: 1.00, pay: 1.00, repair: 1.0, note: 'everything; the baseline' },
  kestrel:  { name: 'Kestrel',        kind: 'frontier outpost', ly: [25.5, 19],  danger: 1, fuel: 7,    ore: 0,  part: 1.10, pay: 1.00, repair: 1.0, note: 'no bar, parts to tier 1, cheap fuel' },
  meridian: { name: 'Meridian',       kind: 'trade hub',       ly: [29, 24.5],   danger: 1, fuel: 9,    ore: 26, part: 0.90, pay: 1.10, repair: 1.0, note: 'best shop and yard, six calls on the board' },
  brass:    { name: 'Brass Reach',    kind: 'mining',          ly: [14, 26.5],   danger: 2, fuel: 6,    ore: 30, part: 1.00, pay: 1.15, repair: 1.0, note: 'ore 30, rich belts, raiders hunt miners' },
  hollow:   { name: 'The Hollow',     kind: 'empty wild',      ly: [13.5, 17.5], danger: 2, fuel: null, ore: 0,  part: null, pay: null, repair: null, note: 'no station: bring fuel home' },
  lethe:    { name: 'Lethe',          kind: 'derelict',        ly: [7.5, 30],    danger: 2, fuel: null, ore: 0,  part: null, pay: null, repair: null, note: 'no station: fourteen wrecks, one pays 800' },
  ember:    { name: 'Ember',          kind: 'volcanic mining', ly: [34, 31],     danger: 3, fuel: 6,    ore: 28, part: 1.00, pay: 1.30, repair: 1.0, note: 'weapons parts to tier 3, heavy raiding' },
  roost:    { name: "Reaver's Roost", kind: 'pirate nest',     ly: [37, 15],     danger: 5, fuel: 15,   ore: 0,  part: 1.25, pay: 1.60, repair: 1.5, note: 'no police, salvage sells at double, gouging' }
};
// the rule behind pay: 1 + 0.15 a danger step above 1, and a hub pays 0.1 more for its better board (Meridian). Parts: hub 0.9, an outpost far from
// a yard 1.1, the nest 1.25 (UNIVERSE.md). Repair: the nest gouges (1.5), everywhere else the bay charges the same half credit.
// planned new calls (UNIVERSE.md section 11): not built, priced here so E4 can see them next to the built ones
// what this card proposes instead (docs/ECONOMY.md 8): about 1.3 times the rescue an hour, the fight and survey calls a little above
export const PROPOSED_CALLS = { courierBase: 300, courierPerLy: 20, haulPerOreUnitPer5Ly: 11, survey: 900, salvageBig: 800 };
const NEW_CALLS = { courierBase: 200, courierPerLy: 90, haulPerOreUnitPer5Ly: 20, survey: 600, salvageBig: 800 };

// ---------------------------------------------------------------- helpers
const hypot = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const r0 = x => Math.round(x), r1 = x => Math.round(x * 10) / 10;
const fmtMin = m => (m < 90 ? r0(m) + ' min' : Math.floor(m / 60) + ' h ' + String(r0(m % 60)).padStart(2, '0') + ' min');
const money = n => (Math.round(n) + '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function table(title, head, rows, note) {
  const w = head.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i]).length)));
  const line = r => r.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  ');
  console.log('\n' + title + '\n' + line(head) + '\n' + w.map(n => '-'.repeat(n)).join('  '));
  rows.forEach(r => console.log(line(r)));
  if (note) console.log(note);
}

// ---------------------------------------------------------------- what a ship with these parts can do
// kit: { model, parts: { weapons, engine, shields, tank, cargo } } (tiers 0 to 3)
export function stats(g, kit) {
  const m = g.ships[kit.model], p = kit.parts || {}, t = s => (p[s] | 0);
  const delay = g.parts.weapons.delay[t('weapons')], dmg = g.parts.weapons.damage[t('weapons')];
  return {
    model: m, speed: m.speed * g.parts.engine.speed[t('engine')], hull: m.hull,
    dps: (1000 / delay) * dmg * m.guns * PACE.hitRate,                 // damage a second that lands
    hold: m.cargo + g.parts.cargo.add[t('cargo')],
    tank: Math.round(m.tank * g.parts.tank.mul[t('tank')]), range: m.range + g.parts.engine.range[t('engine')],
    shield: g.parts.shields.pts[t('shields')]
  };
}
// the pirates of a system, as a list of { hp, bounty, share }
function pirateMix(g, sysId) {
  const w = (g.systems[sysId].pirates || {}).weights || { raider: 0.25, drone: 0.35, gunship: 0.4 };
  return Object.entries(w).map(([k, share]) => ({ key: k, hp: g.pirates[k].hp, bounty: g.pirates[k].bounty, share }));
}
const killSec = (hp, st) => PACE.approachSec + (hp / st.dps) * PACE.fightFactor;
// ore in a belt of n rocks (a third each of size 3, 2, 1): a size 3 rock breaks into two size 2, each into two size 1
function beltOre(g, rocks) {
  const sizes = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < rocks; i++) sizes[i < rocks / 3 ? 3 : i < rocks * 2 / 3 ? 2 : 1]++;
  const ore1 = PINS.oreDrop.value, ore2 = 1 + 2 * ore1, ore3 = 1 + 2 * ore2;
  const hp1 = g.rockHp[1], hp2 = g.rockHp[2] + 2 * hp1, hp3 = g.rockHp[3] + 2 * hp2;
  return { ore: sizes[1] * ore1 + sizes[2] * ore2 + sizes[3] * ore3, hp: sizes[1] * hp1 + sizes[2] * hp2 + sizes[3] * hp3, sizes };
}

// the best pay multiplier and ore price among the systems with a station that a kit can reach from Halcyon by jumps of at most its range
export function reach(g, kit) {
  const st = stats(g, kit), ids = Object.keys(SYSTEM_ECON), seen = new Set(['halcyon']), queue = ['halcyon'];
  while (queue.length) {
    const a = queue.shift();
    for (const b of ids) if (!seen.has(b) && hypot(SYSTEM_ECON[a].ly, SYSTEM_ECON[b].ly) <= st.range + 1e-9 && SYSTEM_ECON[b].fuel !== null) { seen.add(b); queue.push(b); }
  }
  // a jump goes through a system with a pump; the Hollow and Lethe have none, so they are never a stop on the way and give nothing to earn from
  const here = [...seen].map(id => SYSTEM_ECON[id]);
  return { pay: Math.max(...here.map(s => s.pay || 1)), ore: Math.max(...here.map(s => s.ore || 0)), systems: [...seen] };
}

// every loop the game has today, for one kit, at Halcyon. Each returns { credits, sec } for one run, from the station and back.
export function loops(g, kit, mult = { pay: 1, ore: g.orePrice }) {
  const st = stats(g, kit), H = g.systems.halcyon, body = id => H.bodies.find(b => b.id === id);
  const station = body('halcyon-station'), planet = body('kepler-4b'), gate = body('perseus-gate'), belt = body('kepler-belt');
  const pos = b => [b.x, b.y], fly = px => px / (st.speed * PACE.speedUse);
  const mix = pirateMix(g, 'halcyon'), avgBounty = mix.reduce((a, p) => a + p.share * p.bounty, 0), avgHp = mix.reduce((a, p) => a + p.share * p.hp, 0);
  const reward = id => g.missions.find(m => m.id === id).reward * mult.pay, out = {}, bountyOf = b => b * mult.pay;
  const drone = g.pirates.drone;

  const toPlanet = hypot(pos(station), pos(planet));
  out.rescue = { credits: reward('rescue'), sec: PACE.dockSec + 2 * fly(toPlanet) + PACE.groundSec };

  // escort: the MULE leaves just south-west of the station for the gate and slows while you are outside her ring (chasing a pirate); three waves (8 pirates) and a last stand of 3 at the gate,
  // where she holds 8 s; she pays her reward plus up to 200 for her hull (half of it counted here), and you kill about 8 of the 11
  const mule = [station.x - 60, station.y + 260], muleRoute = hypot(mule, pos(gate)) - gate.r, [free, slow] = PINS.muleSpeed.value;
  const threatShare = 0.3, // the share of the route you spend outside her ring
        muleSec = muleRoute / (1 / ((1 - threatShare) / free + threatShare / slow));
  out.escort = { credits: reward('escort') + 100 + 8 * bountyOf(drone.bounty), sec: PACE.dockSec + muleSec + 8 + 8 * 0.5 * killSec(drone.hp, st) + fly(hypot(pos(gate), pos(station))) };

  // police patrol: five wanted drones (hp 40) 650 to 950 px from the station; each kill pays its bounty on top of the 600
  out.patrol = { credits: reward('patrol') + 5 * bountyOf(drone.bounty), sec: PACE.dockSec + 5 * killSec(40, st) };

  // the Reaver bounty (repeatable once a patrol is done): the Reaver pays its own 150 plus two escorts of the Halcyon mix
  out.bounty = { credits: reward('bounty') + bountyOf(150 + 2 * avgBounty), sec: PACE.dockSec + 2 * fly(toPlanet + 400) + killSec(g.reaverHp, st) + 2 * killSec(avgHp, st) + PACE.reaverSec };

  // mining the Kepler belt: you can only sell at the dock, so one run carries the smaller of the hold and what the belt holds
  const b = beltOre(g, belt.rocks), n = Math.min(st.hold, b.ore), shotSec = (b.hp / b.ore) / ((1000 / g.parts.weapons.delay[kit.parts && kit.parts.weapons | 0 || 0]) * g.parts.weapons.damage[kit.parts && kit.parts.weapons | 0 || 0] * st.model.guns * PACE.hitRate);
  out.mining = { credits: n * mult.ore, sec: PACE.dockSec + 2 * fly(hypot(pos(station), pos(belt))) + n * (PACE.oreSec + shotSec), ore: n, beltOre: b.ore };

  // free hunting: a pirate spawns every `every` ms up to the cap, so kills are limited by the spawner as well as by you; a pod adds credits
  const every = (H.pirates.every || 15000) / 1000, podAvg = PINS.podCreditShare.value * (PINS.podCredit.value[0] + PINS.podCredit.value[1]) / 2;
  const perKill = mix.reduce((a, p) => a + p.share * killSec(p.hp, st), 0), killsPerHour = Math.min(3600 / perKill, 3600 / every);
  out.hunt = { credits: bountyOf(avgBounty) + podAvg, sec: 3600 / killsPerHour, perHour: killsPerHour * (bountyOf(avgBounty) + podAvg), spawnLimited: 3600 / perKill > 3600 / every };
  return out;
}
// credits an hour of play at the efficiency, after repair and insurance
function perHour(l, eff = PACE.efficiency) { return l.credits / l.sec * 3600 * eff; }

// ---------------------------------------------------------------- tables
function tIncome(g) {
  const kit = { model: 'wren', parts: {} }, L = loops(g, kit), names = { rescue: 'Rescue call', escort: 'Escort the MULE', patrol: 'Police patrol', bounty: 'Reaver bounty', mining: 'Mining, Kepler belt', hunt: 'Free hunting (per kill)' };
  const rows = Object.keys(names).map(k => {
    const l = L[k], raw = k === 'hunt' ? l.perHour : l.credits / l.sec * 3600;
    return [names[k], money(l.credits), r0(l.sec) + ' s', money(raw), money(raw * PACE.efficiency)];
  });
  table('INCOME: each loop on the starter Wren with no parts, at Halcyon (DATA rewards and bounties, PACE times)', ['loop', 'credits a run', 'time a run', 'cr/h flat out', 'cr/h at ' + PACE.efficiency * 100 + '%'], rows,
    `  mining: ${r0(L.mining.ore)} ore a run (the hold is ${stats(g, kit).hold}, the Kepler belt holds ${r1(L.mining.beltOre)}); free hunting is ${L.hunt.spawnLimited ? 'limited by the spawner' : 'limited by how fast you kill'}.`);
  const typ = ['rescue', 'escort', 'patrol', 'bounty'].reduce((a, k) => a + perHour(L[k], 1), 0) / 4;
  console.log(`  typical call (the mean of rescue, escort, patrol and bounty) flat out: ${money(typ)} cr/h. To read a real session: efficiency = credits an hour you really earned / ${r0(typ)}, then run: node tools/economy-sim.mjs tune --eff <that>.`);
  // what each ship earns on the same loops
  const ids = Object.keys(g.ships);
  table('INCOME by ship (cr/h flat out, no parts): a ship changes travel time, kill time and the hold', ['ship', ...Object.keys(names).map(k => k)],
    ids.map(id => { const L2 = loops(g, { model: id, parts: {} }); return [g.ships[id].name, ...Object.keys(names).map(k => money(k === 'hunt' ? L2[k].perHour : L2[k].credits / L2[k].sec * 3600))]; }));
  // salvage sites: one time each
  const pois = g.systems.halcyon.bodies.filter(b => b.type === 'poi'), credits = pois.reduce((a, b) => a + (b.credits || 0), 0);
  const guarded = pois.filter(b => b.guard).reduce((a, b) => a + (b.credits || 0), 0);
  console.log(`\nSALVAGE sites at Halcyon (once each, per game): ${pois.length} sites, ${credits} cr in all (${guarded} of it guarded), one repair kit. A pirate pod adds about ${r1(PINS.podCreditShare.value * 25)} cr a kill (counted in free hunting).`);
  // the planned calls next to these
  const hop = 6.3;
  console.log(`PLANNED calls (docs/UNIVERSE.md 11, not built): courier ${NEW_CALLS.courierBase} + ${NEW_CALLS.courierPerLy}/ly: Halcyon to Kestrel (${hop} ly) pays ${r0(NEW_CALLS.courierBase + NEW_CALLS.courierPerLy * hop)}; `
    + `a full hold of the Ox (${g.ships.ox.cargo}) on a haul of ${hop} ly pays ${r0(NEW_CALLS.haulPerOreUnitPer5Ly * g.ships.ox.cargo * hop / 5)}; survey ${NEW_CALLS.survey}; the big wreck ${NEW_CALLS.salvageBig}.`);
}

function tPrices(g) {
  const ids = Object.keys(g.ships), fuelPrice = SYSTEM_ECON.halcyon.fuel;
  const rows = ids.map(id => {
    const m = g.ships[id], cap = m.maxTier, price = (slot, t) => g.partPrice(slot, t, id, {});
    let t1 = 0, t3 = 0;
    g.order.forEach(slot => { t1 += price(slot, 1); for (let t = 1; t <= cap[slot]; t++) t3 += price(slot, t); });
    return [m.name, money(m.price), money(Math.floor(g.fleet.sell * m.price)), money(t1), money(t3), money(m.tank * fuelPrice), money(m.hull * PINS.repairPerPoint.value), r1(m.fuelPerLy * fuelPrice)];
  });
  table('SHIPS (DATA, fuel at Halcyon 8 cr a unit): price, what it sells for, a tier 1 part in every slot, every tier it can fit, a full tank, a full repair, fuel a light year',
    ['ship', 'price', 'sells for', 'all tier 1', 'all tiers it fits', 'full tank', 'full repair', 'fuel cr/ly'], rows);
  const prow = g.order.map(slot => [g.parts[slot].name, ...[1, 2, 3].map(t => money(g.partPrice(slot, t, 'wren', {}))), g.parts[slot].brief.join(' | ')]);
  table('PARTS on the Wren (DATA; other ships multiply by partMult, a station by its dock row)', ['slot', 'tier 1', 'tier 2', 'tier 3', 'what each tier gives'], prow);
}

function tLosses(g) {
  const wren = g.ships.wren, L = loops(g, { model: 'wren', parts: {} });
  const typical = ['rescue', 'escort', 'patrol', 'bounty'].reduce((a, k) => a + perHour(L[k], 1), 0) / 4;
  const hourly = typical * PACE.efficiency;
  const rows = [250, 500, 1000, 2000, 5000, 10000, 25000].map(c => {
    const fee = Math.min(c, Math.max(PINS.insuranceMin.value, Math.floor(c * PINS.insurancePct.value)));
    return [money(c), money(fee), r1(fee / hourly * 60) + ' min', r1(fee / (wren.hull * PINS.repairPerPoint.value)) + 'x'];
  });
  table(`LOSSES: one death costs max(${PINS.insuranceMin.value}, ${PINS.insurancePct.value * 100}% of your credits); typical income ${money(hourly)} cr/h (the mean of the four calls at ${PACE.efficiency * 100}%)`,
    ['credits held', 'insurance fee', 'minutes of income', 'full Wren repairs'], rows,
    `  repair is ${PINS.repairPerPoint.value} cr a point: ${PACE.hullPerKill} hull a kill is ${PINS.repairPerPoint.value * PACE.hullPerKill} cr, and at ${PACE.deathsPerHour} deaths an hour the insurance on ${money(5000)} held costs about ${money(PACE.deathsPerHour * 1000)} cr an hour: ${r1(PACE.deathsPerHour * 1000 / hourly * 100)}% of income.`);
}

// the career: buy things in a fixed order as credits allow, at the pace of the kit you fly. rate = 'typical' (mean of the four calls) or 'best' (best loop)
export function career(g, rate, scale = { ship: 1, part: 1 }) {
  const order = [
    ['part', 'wren', 'weapons', 1], ['part', 'wren', 'shields', 1], ['part', 'wren', 'engine', 1], ['part', 'wren', 'tank', 1], ['part', 'wren', 'cargo', 1],
    ['ship', 'kite'], ['part', 'kite', 'weapons', 1], ['part', 'kite', 'shields', 1], ['part', 'kite', 'engine', 2],
    ['ship', 'ox'], ['part', 'ox', 'cargo', 2], ['part', 'ox', 'shields', 2], ['part', 'ox', 'weapons', 1],
    ['ship', 'talon'], ['part', 'talon', 'weapons', 2], ['part', 'talon', 'shields', 2], ['part', 'talon', 'engine', 2],
    ['ship', 'pathfinder'], ['part', 'pathfinder', 'engine', 2], ['part', 'pathfinder', 'tank', 2],
    ['ship', 'bastion'], ['part', 'bastion', 'weapons', 2], ['part', 'bastion', 'shields', 3]
  ];
  const kits = { wren: { model: 'wren', parts: {} } };
  let credits = 0, minute = 0, i = 0, cr = 0, fly = 'wren'; const log = [];
  const firstRun = Math.ceil(loops(g, kits.wren).rescue.sec / PACE.efficiency / 60); // the first credit arrives when the first call (the guided rescue) is done
  const salvage = g.systems.halcyon.bodies.filter(b => b.type === 'poi').reduce((a, b) => a + (b.credits || 0), 0);
  let salvaged = false;
  // you fly the ship that earns most with what it has fitted, and what it earns is worked out again after each purchase
  const rateOf = kit => {
    const rc = reach(g, kit), L = loops(g, kit, { pay: rc.pay, ore: Math.max(g.orePrice, rc.ore) });
    return rate === 'best' ? Math.max(...['rescue', 'escort', 'patrol', 'bounty', 'mining'].map(k => perHour(L[k])), perHour(L.hunt, PACE.efficiency))
      : ['rescue', 'escort', 'patrol', 'bounty'].reduce((a, k) => a + perHour(L[k]), 0) / 4;
  };
  const pick = () => { fly = Object.keys(kits).reduce((a, k) => (rateOf(kits[k]) > rateOf(kits[a]) ? k : a)); cr = rateOf(kits[fly]); };
  pick();
  while (i < order.length && minute < 60 * 80) {
    minute++;
    if (minute < firstRun) continue;                      // still on the first call: nothing earned yet
    credits += minute === firstRun ? g.missions[0].reward : Math.max(0, cr - PACE.deathsPerHour * Math.max(50, credits * PINS.insurancePct.value)) / 60; // deaths come out of credits held
    if (!salvaged && minute >= 30) { credits += salvage; salvaged = true; } // the five wrecks, about half an hour in
    for (;;) {
      const o = order[i]; if (!o) break;
      const price = o[0] === 'ship' ? (scale.price && scale.price[o[1]] != null ? scale.price[o[1]] : Math.round(g.ships[o[1]].price * scale.ship)) : Math.round(g.partPrice(o[2], o[3], o[1], {}) * scale.part);
      if (credits < price) break;
      credits -= price;
      if (o[0] === 'ship') kits[o[1]] = { model: o[1], parts: {} }; else { const k = kits[o[1]]; k.parts[o[2]] = Math.max(k.parts[o[2]] | 0, o[3]); }
      pick();
      log.push({ at: minute, what: o[0] === 'ship' ? 'buy the ' + g.ships[o[1]].name : o[1] + ' ' + o[2] + ' ' + o[3], price, rate: r0(cr), fly });
      i++;
    }
  }
  return { log, done: i === order.length, minutes: minute };
}
function tPacing(g) {
  const typ = career(g, 'typical'), best = career(g, 'best');
  const rows = typ.log.map((e, i) => { const b = best.log[i]; return [e.what, money(e.price), fmtMin(e.at), b ? fmtMin(b.at) : '-', money(e.rate) + ' cr/h (' + e.fly + ')']; });
  table(`PACING: buy in this order, fly the ship that earns most, ${PACE.efficiency * 100}% efficiency, deaths ${PACE.deathsPerHour} an hour, salvage 720 cr at minute 30. 'typical' = the four calls in turn, 'best' = the best loop each time`,
    ['bought', 'price', 'typical at', 'best at', 'typical rate then'], rows);
  const first = typ.log[0], ship = typ.log.find(e => e.what.startsWith('buy')), last = typ.log[typ.log.length - 1];
  const keep = PACE.efficiency, srows = [0.15, 0.25, 0.35, 0.5, 0.75].map(e => {
    PACE.efficiency = e; const c = career(g, 'typical'), sh = c.log.find(x => x.what.startsWith('buy'));
    return [r0(e * 100) + '%', fmtMin(c.log[0].at), fmtMin(sh.at), c.done ? fmtMin(c.log[c.log.length - 1].at) : 'not in 80 h'];
  });
  PACE.efficiency = keep;
  table('PACING against the efficiency guess (typical rate): the one number nothing in the game can tell us', ['efficiency', 'first upgrade', 'first new ship', 'full fleet'], srows);
  console.log(`  targets (card): first upgrade ~10 min, first new ship ~1 h, full fleet several hours.  typical: ${fmtMin(first.at)}, ${fmtMin(ship.at)}, ${typ.done ? fmtMin(last.at) : 'not in 80 h'}.  best: ${fmtMin(best.log[0].at)}, ${fmtMin(best.log.find(e => e.what.startsWith('buy')).at)}, ${best.done ? fmtMin(best.log[best.log.length - 1].at) : 'not in 80 h'}.`);
}


// the planned calls (docs/UNIVERSE.md section 11) next to the Rescue: what each pays an hour if the design numbers are used, and what it should pay
// to sit level with the rescue (x1.0) or a little above it for the harder ones (x1.3)
function tPlanned(g) {
  const wren = { model: 'wren', parts: {} }, rescue = loops(g, wren).rescue, base = rescue.credits / rescue.sec * 3600;
  const hyper = ly => Math.min(30, Math.max(6, ly * PINS.hyperSecPerLy.value)); // hyperspace.js: seconds in the tunnel
  const trip = hop => PACE.dockSec + PACE.pumpSec + PACE.leaveSec + hyper(hop) + PACE.arriveSec; // one call from the board to the pay: dock, pump, fly clear, tunnel, arrive
  const ly = 6.3, rows = [];
  const add = (name, pay, sec) => rows.push([name, money(pay), r0(sec) + ' s', money(pay / sec * 3600), r1(pay / sec * 3600 / base) + 'x', money(base * sec / 3600), money(base * 1.3 * sec / 3600)]);
  add('Rescue (built, the baseline)', rescue.credits, rescue.sec);
  add('Courier, ' + ly + ' ly', NEW_CALLS.courierBase + NEW_CALLS.courierPerLy * ly, trip(ly));
  add('Courier, 12 ly (Kite)', NEW_CALLS.courierBase + NEW_CALLS.courierPerLy * 12, trip(12));
  add('Haul, Ox full hold, ' + ly + ' ly', NEW_CALLS.haulPerOreUnitPer5Ly * g.ships.ox.cargo * ly / 5, trip(ly) + PACE.loadSec);
  add('Survey', NEW_CALLS.survey, trip(ly) + PACE.surveySec);
  add('Big wreck at Lethe (there and back)', NEW_CALLS.salvageBig, trip(7.4) + trip(7.4) - PACE.dockSec + PACE.bigWreckSec);
  table('PLANNED calls against the Rescue (UNIVERSE.md 11; PACE times): pay as designed, an hour at that pay, against the rescue, and the pay that would match it', ['call', 'pay', 'time', 'cr/h flat', 'vs rescue', 'pay for x1.0', 'pay for x1.3'], rows,
    '  Courier and haul have no ground leg and no fight, only a short tunnel, so at the design pay they earn two to three times the rescue an hour; survey and the big wreck, with a long flight and a fight, earn less than it.');
}

// ship prices that put the first new ship at about an hour: the same curve scaled, and a flatter one (the full fleet would otherwise take about nine hours
// whatever the scale, because the doc's top price is 5.3 times the cheapest ship)
function tTune(g) {
  const goal = 60, ids = Object.keys(g.ships).filter(id => g.ships[id].price > 0), round = v => Math.round(v / 500) * 500;
  const firstShip = c => { const e = c.log.find(x => x.what.startsWith('buy')); return e ? e.at : Infinity; };
  const solve = (make, lo, hi) => { for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (firstShip(career(g, 'typical', { ship: 1, part: 1, price: make(mid) })) < goal) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  const same = k => Object.fromEntries(ids.map(id => [id, round(g.ships[id].price * k)]));
  const FLAT = { kite: 1, ox: 1.4, talon: 1.8, pathfinder: 2.3, bastion: 4.0 };
  const flat = base => Object.fromEntries(ids.map(id => [id, round(base * FLAT[id])]));
  const k = solve(same, 0.3, 6), base = solve(flat, 2000, 40000), A = same(k), B = flat(base);
  const run = pr => { const c = career(g, 'typical', { ship: 1, part: 1, price: pr }), d = career(g, 'best', { ship: 1, part: 1, price: pr }); return `first upgrade ${fmtMin(c.log[0].at)}, first new ship ${fmtMin(firstShip(c))}, full fleet ${c.done ? fmtMin(c.log[c.log.length - 1].at) : 'not in 80 h'} (best loop: ${fmtMin(firstShip(d))} and ${d.done ? fmtMin(d.log[d.log.length - 1].at) : 'not in 80 h'})`; };
  const rows = ids.map(id => [g.ships[id].name, money(g.ships[id].price), money(A[id]), money(B[id]), 'x' + FLAT[id].toFixed(1), money(Math.round(B[id] * g.fleet.sell))]);
  table(`TUNING at ${PACE.efficiency * 100}% efficiency: A = today's curve times ${k.toFixed(2)}, B = a flatter curve; both put the first new ship at about ${goal} min, parts unchanged`, ['ship', 'now', 'A: same curve', 'B: flatter', 'B / Kite', 'B sells for'], rows,
    `  A: ${run(A)}.\n  B: ${run(B)}.`);
}

function tSystems(g) {
  const rows = Object.entries(SYSTEM_ECON).map(([id, s]) => {
    const wren = g.ships.wren;
    return [s.name, s.kind, s.danger, s.fuel === null ? 'none' : s.fuel, s.fuel === null ? '-' : money(wren.tank * s.fuel), s.ore || '-', s.part === null ? '-' : s.part.toFixed(2), s.pay === null ? '-' : s.pay.toFixed(2), s.repair === null ? '-' : s.repair.toFixed(1), s.note];
  });
  table('SYSTEMS (UNIVERSE.md 4.2 for fuel and ore; part, pay and repair are the proposal for E4): per-system price multipliers',
    ['system', 'kind', 'danger', 'fuel/unit', 'full Wren tank', 'ore/unit', 'parts x', 'pay x', 'repair x', 'what it does to your day'], rows);
  // jumps: fuel cost against payout for the hops the doc names
  const hops = [['halcyon', 'kestrel'], ['halcyon', 'brass'], ['halcyon', 'hollow'], ['kestrel', 'meridian'], ['halcyon', 'meridian'], ['brass', 'lethe'], ['meridian', 'ember'], ['kestrel', 'roost']];
  const wren = g.ships.wren;
  const hrows = hops.map(([a, b]) => {
    const ly = hypot(SYSTEM_ECON[a].ly, SYSTEM_ECON[b].ly), fuel = ly * wren.fuelPerLy, price = SYSTEM_ECON[a].fuel || SYSTEM_ECON[b].fuel || 0;
    const courier = NEW_CALLS.courierBase + NEW_CALLS.courierPerLy * ly, mine = PROPOSED_CALLS.courierBase + PROPOSED_CALLS.courierPerLy * ly;
    return [SYSTEM_ECON[a].name + ' to ' + SYSTEM_ECON[b].name, r1(ly), ly > wren.range ? 'no (needs ' + r1(ly) + ' ly)' : 'yes', r1(fuel), r0(fuel * price), r0(courier), r0(fuel * price / courier * 100) + '%', r0(mine), r0(fuel * price / mine * 100) + '%'];
  });
  table('JUMPS with the Wren (8 ly range, 1 fuel a ly): fuel burned, its cost at the system you leave, a courier call for the same hop at the design pay and at the proposed pay, and fuel as a share of each',
    ['hop', 'ly', 'in range', 'fuel', 'fuel cr', 'courier (design)', 'fuel share', 'courier (proposed)', 'fuel share'], hrows);
  const hold = ['wren', 'kite', 'ox', 'pathfinder'].map(id => { const m = g.ships[id]; return [m.name, m.cargo, ...['halcyon', 'meridian', 'brass', 'ember'].map(s => money(m.cargo * SYSTEM_ECON[s].ore))]; });
  table('ORE: a full hold sold at each ore system (credits; a Kepler-size belt holds only about ' + r1(beltOre(g, 15).ore) + ' ore, so a hold above that is not filled in one flight)', ['ship', 'hold', 'Halcyon 20', 'Meridian 26', 'Brass Reach 30', 'Ember 28'], hold);
}

function tCheck(g) {
  let bad = 0;
  if (g.problems.length) { bad += g.problems.length; g.problems.forEach(p => console.log('  PROBLEM ' + p)); }
  for (const [k, p] of Object.entries(PINS)) {
    const file = join(ROOT, p.file), src = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const missing = [].concat(p.text).filter(t => !src.includes(t));
    if (p.constant && constIn(p.file, p.constant) === null) missing.push('let ' + p.constant + ' = <number>;');
    if (missing.length) { bad++; console.log(`  STALE PIN ${k}: ${p.file} no longer has ${missing.map(t => '"' + t + '"').join(' and ')} (${p.what}). Read that code again and fix PINS.`); }
  }
  console.log(bad ? `\ncheck: ${bad} problem${bad === 1 ? '' : 's'}` : `check: the game files loaded (${FILES.length} files, ${Object.keys(g.ships).length} ships, ${g.order.length} part slots, ${g.missions.length} calls) and all ${Object.keys(PINS).length} pinned code lines are still there`);
  return bad;
}

// ---------------------------------------------------------------- main
let ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TABLES = { income: tIncome, prices: tPrices, losses: tLosses, pacing: tPacing, tune: tTune, planned: tPlanned, systems: tSystems, check: tCheck };
async function main() {
  const args = process.argv.slice(2), ri = args.indexOf('--root');
  if (ri >= 0) { ROOT = resolve(args[ri + 1]); args.splice(ri, 2); }
  const ei = args.indexOf('--eff');
  if (ei >= 0) { PACE.efficiency = Number(args[ei + 1]); args.splice(ei, 2); if (!(PACE.efficiency > 0 && PACE.efficiency <= 1)) { console.error('--eff takes a number above 0 and up to 1'); process.exit(2); } }
  const which = args[0] || 'all', g = loadGame(ROOT);
  if (which !== 'all' && !TABLES[which]) { console.error('unknown table "' + which + '"; one of: ' + Object.keys(TABLES).join(', ') + ' (or none for all)'); process.exit(2); }
  console.log('Long Haul economy simulator: DATA from ' + ROOT + '/src, PACE guesses in tools/economy-sim.mjs (efficiency ' + PACE.efficiency * 100 + '%)');
  let bad = 0;
  for (const [name, fn] of Object.entries(TABLES)) if (which === 'all' || which === name) { const r = fn(g); if (name === 'check') bad = r; }
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
