// Bot players for the Campaign, flown in the logic sim (plain Node, no Chrome): how long a level takes, how often it is won, and why it is lost.
// Card space-game-night-gameplay (docs/night/gameplay.md). It reads the game (src/campaign.js) and changes nothing in it.
//   node tools/campaign-bot.mjs                      the whole table: levels 1 to 3, every bot, seeds 1 to 12
//   node tools/campaign-bot.mjs --level 1 --seeds 20 --bots plain,carrier --skill steady
//   node tools/campaign-bot.mjs --power 4,1,1        the ship's systems for every run: weapons, shields, engines, 6 pips (default 2,2,2: every factor 1, the shield mending at its base rate)
//   node tools/campaign-bot.mjs --tech beam          start with these techs (a level's table row says which a player would have)
//   node tools/campaign-bot.mjs --old               level 1 with the numbers it had before the easier level 1 (Earth's shield 300 and the rest): what Troy's first tries were played on
//   node tools/campaign-bot.mjs --set alien.hpScale=2 --set alien.damageScale=2   what if: change numbers of the table (CAMP.<path> = a number) for this run only
//   node tools/campaign-bot.mjs --json               the numbers, not the table
// A bot is a way of playing: when it launches, whether it escorts, how often it attacks, whether it recalls its wounded, and the carrier's aim (skill: sharp,
// steady, rough). The carrier flies at the alien nearest Earth (or nearest itself on a level with no Earth) and fires; that is the "plain strategy" of tests/campaign.mjs.
// Per run it keeps: the result and the seconds, the carrier's hull, Earth's shield and where its damage came from (by the kind of the ship that fired), the carrier's
// damage by kind, the wave starts, the seconds with no alien alive (waiting), the ships lost.
import { nodeGame } from '../tests/nodegame.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] || '').startsWith('--') || i + 1 >= process.argv.length ? true : process.argv[i + 1]; };
const LEVELS = String(arg('level', '1,2,3')).split(',').map(Number);
const MISSION = arg('mission', null);                        // --mission 2: only mission 2 of each level (the missions of a level are flown one by one, card space-game-campaign-missions); without it every mission of the level is flown
const SEEDS = Number(arg('seeds', 12));
const SKILL = String(arg('skill', 'steady'));
const TECH = arg('tech', null);
const POWER = arg('power', null) === null ? null : String(arg('power')).split(',').map(Number); // --power 4,1,1: the ship's systems for every run (weapons, shields, engines; card space-game-campaign-systems); none: 2,2,2, today's numbers
const MAXSEC = Number(arg('max', 420));
const PACE = String(arg('pace', 'brisk'));                     // --pace calm|normal|brisk (or a number): the battle pace (card space-game-campaign-pace); brisk is 0.85 of the table's numbers since card space-game-command-slowtime (Calm 0.6, Normal 0.72, Brisk 0.85); --pace 1 is the table as it was. The bots step the sim themselves, so command time (a panel, the map or a call open: src/campslow.js, the scene's frame) never touches them: they need no teaching for it
const RANK = String(arg('rank', 'auto'));                     // --rank 0..5: the pilot's rank (src/campranks.js); auto: the rank a player of ordinary scores would have on reaching that mission (1,400 a mission flown before it)

// the ways of playing. launchAt/attackFrom/attackEvery are seconds into the level; escort: the seconds each convoy is named (level 1); cycle: recall the wing when the fighters
// are on average under this share of their hit points, launch again when they have landed; defend: fly at the alien nearest Earth, not nearest the carrier
const BOTS = {
  idle: { name: 'idle', idle: true },
  carrier: { name: 'carrier', launch: false },                                                                  // flies and shoots, never launches
  guard: { name: 'guard', launchAt: 1 },                                                                        // launches; the wing only guards the carrier
  noescort: { name: 'noescort', launchAt: 1, attackFrom: 12, attackEvery: 5 },                                    // launches and attacks, never escorts
  plain: { name: 'plain', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5 },                             // the test's sensible player: escorts Mars, attacks every 5 s
  both: { name: 'both', launchAt: 1, escort: [9, 56], attackFrom: 12, attackEvery: 5 },                          // escorts the second convoy too
  cycle: { name: 'cycle', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, cycle: 0.45 },                // plain, and it recalls the wounded wing and launches again
  defend: { name: 'defend', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, defend: true },              // plain, flying at what is nearest Earth
  late: { name: 'late', launchAt: 30, escort: [40], attackFrom: 40, attackEvery: 20 },                            // a slow player: launches at 30 s, attacks every 20 s
  missile: { name: 'missile', launchAt: 1, escort: [9], attackFrom: 12, attackEvery: 5, missiles: true },         // plain, and it presses F whenever a big ship is in reach
  mguard: { name: 'mguard', launchAt: 1, missiles: true },                                                       // launches (the wing only guards) and fires missiles
  troy: { name: 'troy', launchAt: 45, escort: [81], sit: true },                                                   // Troy's first try (play log 20 Nov): launches at 45 s, escorts at 81 s, never attacks, the carrier stays at the base and shoots what comes close
  troyh: { name: 'troyh', launchAt: 45, escort: [81], sit: true, reactive: 3 },                                      // troy, and when the first real damage comes (Earth under 90 percent, or the hull under 80) it reads a hint 3 s later: launch if need be, attack every 5 s, fly out
  strong: { name: 'strong', launchAt: 1, escort: [9, 56], attackFrom: 12, attackEvery: 5, missiles: true, cycle: 0.45, skill: 'sharp' }, // a strong player (card space-game-wrapup-difficulty): escorts both convoys, missiles on every big ship, recalls and relaunches the hurt wing, and flies sharp
  mcarrier: { name: 'mcarrier', launch: false, missiles: true }                                                  // no wing at all, missiles only
};
const SKILLS = { sharp: { gain: 3, thr: 0.15, noise: 0 }, steady: { gain: 2, thr: 0.22, noise: 0.1 }, rough: { gain: 1.5, thr: 0.3, noise: 0.2 } };

const OLD = process.argv.includes('--old');
const SETS = process.argv.map((a, i) => a === '--set' ? process.argv[i + 1] : null).filter(Boolean); // --set alien.hpScale=2 --set alien.damageScale=2: change the table before the run (what-if)
const g = nodeGame();
g.run(`window.__PACE = ${isNaN(Number(PACE)) ? JSON.stringify(PACE) : Number(PACE)}`); // the battle pace of every battle of this run
g.run(`window.__RANK = ${JSON.stringify(RANK)}`); // the pilot's rank for every battle of this run
if (OLD) g.run(`(() => { CAMP.earth.shield = 300; CAMP.earth.regen = 0; CAMP.mother.hp = 900; CAMP.mother.damage = 12; CAMP.mother.holdAt = 1600; CAMP.mother.spawnEvery = 8000; CAMP.mother.spawnMax = 6; CAMP.levels[1].waves[2].ships.raider = 3; })()`); // the numbers before the easier level 1
g.run(`(() => {
  const kindOf = id => String(id || '').split('-')[0];
  window.__M = null;
  const hurt0 = campHurt;
  campHurt = function (C, u, dmg, byId) {
    const M = window.__M;
    if (M && u.kind === 'carrier' && u.hp > 0 && !C.result && !C.god) { const d = dmg * (campHas(C, 'shield') ? CAMP.tech.shield.taken : 1); const k = kindOf(byId); M.hitC[k] = (M.hitC[k] || 0) + d; }
    return hurt0.apply(null, arguments);
  };
  const clampi = v => Math.max(-1, Math.min(1, v));
  window.__botStep = (C, s, B, sk, st) => {
    if (B.idle) return;
    if (C.arrivedAt == null) return; // the trip first, with the wing aboard (a Fast burn needs it: card space-game-campaign-fast-board); the plan runs from the arrival, as a player's does
    s -= C.arrivedAt / 1000;
    if (B.reactive != null && st.react == null && ((C.earth && C.earth.shield <= C.earth.max * 0.9) || C.carrier.hp <= C.carrier.maxHp * 0.8)) st.react = s + B.reactive;
    if (st.react != null && s >= st.react) { B = Object.assign({}, B, { sit: false, launchAt: st.launched ? B.launchAt : 0, attackFrom: 0, attackEvery: 5 }); st.sitOff = true; }
    if (B.launch !== false && B.launchAt != null && !st.launched && s >= B.launchAt) { st.launched = true; campOrder(C, 'launch'); }
    (B.escort || []).forEach((at, i) => { if (!st['e' + i] && s >= at && campConvoys(C).length) { st['e' + i] = true; campOrder(C, 'escort', 'convoy'); } }); // the wing goes to the nearest convoy ship (the transport, the haulers)
    const mineOpen = campObjectives(C).some(o => !o.done && o.type === 'ore') && !B.nomine, fight = campAliens(C).some(u => !u.hold);
    if (B.launch !== false && st.launched && mineOpen && !st.mining && !fight && s >= (st.mineAt || 0)) { if (campOrder(C, 'mine').ok) st.mining = true; else st.mineAt = s + 1; } // while the mission asks for ore the wing mines, and goes to the fight only when one comes (then mines again) // a mission that asks for ore: the wing mines (E then 1)
    if (B.cycle && st.launched) {
      if (st.landAt && s >= st.landAt) { st.landAt = 0; campOrder(C, 'launch'); st.nextAtk = s + 2; }
      const fs = campWing(C, 'fighter');
      if (!st.landAt && fs.length >= 3 && Math.round(s * 30) % 60 === 0 && fs.reduce((a, u) => a + u.hp / u.maxHp, 0) / fs.length < B.cycle && C.carrier.hp > 0) { campOrder(C, 'recall'); st.landAt = s + 14; st.recalls = (st.recalls || 0) + 1; }
    }
    if (B.missiles && Math.round(s * 30) % 21 === 0 && typeof campOrder === 'function') campOrder(C, 'missiles', C.ships.some(u => u.kind === 'mother' && u.hp > 0) ? 'mothership' : '');
    if (B.attackEvery && st.launched && s >= B.attackFrom && !st.landAt && Math.round(s * 30) % Math.round(B.attackEvery * 30) === 0 && (!mineOpen || fight)) { campOrder(C, 'attack', C.ships.some(u => u.kind === 'mother') ? 'mothership' : ''); st.mining = false; }
  };
  window.__fly = (C, B, sk, st) => {
    if (B.idle) return;
    const c = C.carrier, al = campAliens(C).filter(u => !u.hold);
    let a = null;
    if (al.length) { const ref = (B.defend || C.earth) && C.earth ? C.earth : c; a = al.slice().sort((p, q) => campDist(p, ref) - campDist(q, ref))[0]; if (!B.defend) a = al.slice().sort((p, q) => campDist(p, c) - campDist(q, c))[0]; }
    if (st.sitOff) B = Object.assign({}, B, { sit: false });
    if (B.sit && a && campDist(a, c) > 900) a = null; // a carrier that stays where it is and fights only what comes close
    if (B.sit && !a) { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; return; }
    const L = C.L; let goal = a;
    if (L.place && C.arrivedAt == null) { if (!C.nav || !C.nav.on) { const gp = campNavGoal(C); if (gp) campNavGo(C, gp, true); } return; } // the trip to the mission's place first: the map's Fast click, which the autopilot flies (it sets the input itself)
    if (L.objectives) { // a mission: fly at what its first open objective asks (a point to scan, a cache, the relic, the haulers), and at what comes near
      const first = campObjectives(C).find(o => !o.done) || {}, byD = list => list.sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      if (first.type === 'scan') goal = byD(C.scan.filter(p => !p.got)) || goal; else if (first.type === 'caches') goal = byD(C.caches.filter(k => !k.got)) || goal; else if (first.type === 'relic') goal = C.relic;
      else if (first.type === 'deliver') goal = byD(campConvoys(C).slice()) || goal || { x: 1000, y: -500 }; else if (first.type === 'hold') goal = C.earth || goal;
      else if (first.type === 'ore') goal = byD(C.rocks.filter(r => r.hp > 0)) || goal; // mine: fly to the nearest rock (the carrier's lasers cut it; the wing mines too)
      else if (first.type === 'kill' && !goal) goal = byD(C.rocks.filter(r => r.hp > 0)) || goal; // wait for the raid at the rocks, not in the open
      else if (first.type === 'cashin') { // sell the store: fly to the market outpost and dock (campDock refuses with an alien near: the fight comes first)
        const o = campOutposts(C.level).find(x => x.market); if (o) { goal = { x: o.x, y: o.y, got: false }; if (campOutpostNear(C) && !campAliens(C).length) { campDock(C, o.id); campUndock(C); } }
      }
      if (a && campDist(a, c) < 900) goal = a;
    } else if (C.level === 2) { const k = C.caches.filter(k => !k.got).sort((p, q) => campDist(p, c) - campDist(q, c))[0]; goal = C.cachesGot < L.relic.caches && k ? k : C.relic; if (a && campDist(a, c) < 700) goal = a; }
    else if (C.level === 3) { const near = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0]; goal = near; a = near; }
    if (!goal) { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; return; }
    st.err = (st.err || 0) * 0.97 + (C.rng() - 0.5) * sk.noise * 0.25;
    const want = Math.atan2(goal.y - c.y, goal.x - c.x) + st.err, d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)), dist = campDist(goal, c);
    C.input.turn = clampi(d * sk.gain);
    const turrets = typeof campReach === 'function', reach = turrets ? campReach(C) : 800 * (campHas(C, 'beam') ? 1.5 : 1); // the turrets (6-GEN) fire in every direction, to 500 px from the edge of the target; the old main gun fired along the nose to about 800
    const hold = goal === C.relic ? 60 : (goal && goal.got === false ? 40 : (a && goal === a ? (turrets ? reach * 0.6 : 420) : 300));
    C.input.thrust = dist > hold ? 1 : 0;
    const tgt = a || goal, w2 = Math.atan2(tgt.y - c.y, tgt.x - c.x) + st.err, d2 = Math.atan2(Math.sin(w2 - c.rot), Math.cos(w2 - c.rot));
    C.input.blink = !!(campHas(C, 'blink') && dist > 2200 && Math.abs(d) < 0.25 && C.t - C.blinkAt >= campBlinkCooldown(C));
    C.input.fire = !!a && (turrets ? campDist(a, c) - a.r < reach : Math.abs(d2) < sk.thr && campDist(a, c) < reach); // Space held while an alien is in reach
  };
  window.__run1 = (level, seed, techs, B, sk, maxSec, mission) => {
    const rank = window.__RANK === 'auto' ? campRankAt(((level - 1) * 3 + (mission | 0)) * 1400) : Number(window.__RANK) | 0; // the ranks card: the wing of the rank
    const C = window.C = campNew(level, techs, { seed, mission: mission | 0, rank, power: ${JSON.stringify(POWER)}, pace: window.__PACE });
    const M = window.__M = { hitC: {}, drainE: {}, waves: [], clear: [], idle: 0, first: null, minHull: 1e9, recalls: 0, earthSum: 0 };
    const st = {}, total = maxSec * 30, hull0 = C.carrier.hp;
    let wavesSeen = 0, started = false, prevAl = 0;
    for (let i = 0; i < total && !C.result; i++) {
      const s = i / 30;
      __botStep(C, s, B, sk, st); __fly(C, B, sk, st);
      // where Earth's damage will come from this step: the alien shots that cross the planet
      const E = C.earth, before = E ? E.shield : 0, hits = [];
      if (E) C.bullets.forEach(b => { if (!b.dead && b.team === 'alien' && b.life > 34 && campSegHit(b.x, b.y, b.x + b.vx / 30, b.y + b.vy / 30, E.x, E.y, E.r)) hits.push(kindOf(b.from)); });
      campStep(C, 1 / 30); C.events.length = 0;
      if (E && E.shield < before) { const per = (before - E.shield) / Math.max(1, hits.length); hits.forEach(k => { M.drainE[k] = (M.drainE[k] || 0) + per; }); if (hits.length === 0) M.drainE.other = (M.drainE.other || 0) + (before - E.shield); }
      const w = C.waves.filter(x => x.started).length; if (w > wavesSeen) { wavesSeen = w; M.waves.push(Math.round(C.t / 1000)); started = true; }
      const al = campAliens(C).filter(u => !u.hold).length;
      if (started && al === 0) M.idle += 1 / 30;
      if (prevAl > 0 && al === 0 && started) M.clear.push(Math.round(C.t / 1000));
      prevAl = al;
      if (M.first == null && campAliens(C).some(u => !u.hold && campDist(u, C.carrier) < 800)) M.first = Math.round(C.t / 1000);
      if (C.carrier.hp < M.minHull) M.minHull = C.carrier.hp;
    }
    M.recalls = st.recalls || 0;
    const r = { level, seed, result: C.result || 'timeout', why: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), hull0: Math.round(hull0), minHull: Math.round(M.minHull), earth: C.earth ? Math.round(C.earth.shield) : null,
      kills: C.kills, delivered: C.delivered, convoyLost: C.lost, shipsLost: C.lostShips, caches: C.cachesGot, towers: C.ships.filter(u => u.kind === 'tower').length, waves: M.waves, idle: Math.round(M.idle), first: M.first, recalls: M.recalls,
      hitC: Object.fromEntries(Object.entries(M.hitC).map(([k, v]) => [k, Math.round(v)])), drainE: Object.fromEntries(Object.entries(M.drainE).map(([k, v]) => [k, Math.round(v * 10) / 10])), orders: Object.assign({}, C.orders) };
    window.__M = null; return r;
  };
})()`);

SETS.forEach(kv => { const [k, v] = kv.split('='); if (!/^[A-Za-z0-9_.\[\]]+$/.test(k) || isNaN(Number(v))) throw new Error('--set path=number: ' + kv); g.run(`CAMP.${k} = ${Number(v)}`); });

export function techsFor(level, override) {
  if (override && override !== true) return String(override).split(',').filter(Boolean);
  return JSON.parse(g.run(`JSON.stringify([1, 2].filter(n => n < ${level}).map(n => campTechChoices(n)[0]))`)); // the first tech each earlier level offers, as the address does
}
export function setPace(p) { g.run(`window.__PACE = ${typeof p === 'number' ? p : JSON.stringify(p)}`); } // the battle pace of the runs that follow (a test uses it; the CLI has --pace)
export const botGame = g; // the game the bots fly in (a script that wants to look inside a run)
export function run(level, seed, botName, skill, techs, maxSec = MAXSEC, mission = 0) {
  const B = BOTS[botName], sk = SKILLS[B.skill || skill]; // a bot may bring its own skill
  return JSON.parse(g.run(`JSON.stringify(__run1(${level}, ${seed}, ${JSON.stringify(techs)}, ${JSON.stringify(B)}, ${JSON.stringify(sk)}, ${maxSec}, ${mission | 0}))`));
}
const med = a => { const s = a.filter(x => x != null).sort((p, q) => p - q); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const pct = (a, f) => Math.round(a.filter(f).length / Math.max(1, a.length) * 100);
export function summarise(rs) {
  const won = rs.filter(r => r.result === 'won'), lost = rs.filter(r => r.result === 'lost');
  const why = {}; lost.forEach(r => { why[r.why] = (why[r.why] || 0) + 1; });
  const sum = (key) => { const o = {}; rs.forEach(r => Object.entries(r[key] || {}).forEach(([k, v]) => { o[k] = (o[k] || 0) + v; })); Object.keys(o).forEach(k => { o[k] = Math.round(o[k] / rs.length); }); return o; };
  return { n: rs.length, won: pct(rs, r => r.result === 'won'), lost: pct(rs, r => r.result === 'lost'), timeout: pct(rs, r => r.result === 'timeout'), tWin: med(won.map(r => r.t)), tAll: med(rs.map(r => r.t)),
    hull: med(rs.map(r => r.hull)), taken: med(rs.map(r => Object.values(r.hitC || {}).reduce((a, b) => a + b, 0))), // taken: the damage the carrier was dealt in all (its shield, 150 from the ore card, takes it before the hull does, so hull is 600 until the shield is gone)
 minHull: med(rs.map(r => r.minHull)), earth: med(rs.map(r => r.earth)), kills: med(rs.map(r => r.kills)), shipsLost: med(rs.map(r => r.shipsLost)), delivered: med(rs.map(r => r.delivered)), idle: med(rs.map(r => r.idle)),
    why, hitC: sum('hitC'), drainE: sum('drainE'), waves: rs[0] && rs[0].waves };
}

if (process.argv[1] && process.argv[1].endsWith('campaign-bot.mjs')) {
  const botList = String(arg('bots', Object.keys(BOTS).join(','))).split(',');
  const out = {};
  const missionsOf = level => MISSION ? [Number(MISSION) - 1] : Array.from({ length: g.run(`campMissions(${level}).length`) }, (_, i) => i);
  const keys = [];
  for (const level of LEVELS) {
    const techs = techsFor(level, TECH);
    for (const m of missionsOf(level)) {
      const key = level + '.' + (m + 1); keys.push([key, level, m]); out[key] = {};
      for (const b of botList) {
        const rs = []; for (let seed = 1; seed <= SEEDS; seed++) rs.push(run(level, seed, b, SKILL, techs, MAXSEC, m));
        out[key][b] = summarise(rs);
      }
    }
  }
  if (arg('json', false)) console.log(JSON.stringify(out, null, 1));
  else for (const [key, level] of keys) {
    console.log(`\nLevel ${key} (mission ${key.split('.')[1]})  skill ${SKILL}  techs [${techsFor(level, TECH).join(',')}]  ${SEEDS} seeds`);
    console.log('bot       won%  lost%  t(win)  hull  taken  earth  kills  shipsLost  deliv  idle  lost because');
    for (const b of botList) { const s = out[key][b]; console.log(b.padEnd(9), String(s.won).padStart(4), String(s.lost).padStart(6), String(s.tWin == null ? '-' : s.tWin).padStart(7), String(s.hull).padStart(5), String(s.taken).padStart(6), String(s.earth == null ? '-' : s.earth).padStart(6), String(s.kills).padStart(6), String(s.shipsLost).padStart(10), String(s.delivered).padStart(6), String(s.idle).padStart(5), ' ' + JSON.stringify(s.why)); }
  }
}
