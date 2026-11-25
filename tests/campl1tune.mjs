// smoke: the Level 1 tune of 1.2's mining and 1.3's first contact (plain Node, no Chrome)
// Card space-game-tune-l1-notes (5-GEN's real-game hunt). 1.2: the goal "mine 190" was met in about 36 s (the store carried in from 1.1 was most of it) and the 20 rocks were empty by 110 s, with the first
// raid not due until 70 s and the third at 270, so a quick player waited: now 30 rocks of 200 hit points (a field row's `hp`) and a goal of 450. 1.3: one wrong answer at first contact lost 8 ships against 1
// for a right one: the contact wave is four raiders, two drones and two gunships (it was 5, 3, 2) and the mission's damage scale 2.1 (it was 2.4).
// Card l1-pacing (Troy: "lots of flying, not much happens"): 1.2 has five raids at 40, 100, 112, 175 and 240 s (it was three at 70, 170, 270) and 1.3 six waves, the contact the last (it was the third);
// the scales are 2.0 and 1.35 in 1.2 and 2.9 and 1.55 in 1.3 (tougher hulls, lighter guns). The pins below that moved say so in their names.
// Run: node tests/campl1tune.mjs   (exit code 1 on a failed check)
import { run as botRun, setPace, techsFor, botGame } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = botGame;
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
setPace('normal');

console.log('A. 1.2: the rocks and the goal');
{
  const row = J(`(() => { const L = CAMP.levels[1].missions[1]; return { rocks: L.rocks.map(f => ({ n: f.n, hp: f.hp })), goal: L.objectives[0], cash: L.objectives[2] }; })()`);
  check('four fields of ten rocks, each of 200 hit points (800 ore in all; it was three fields and 600 until card space-game-12-ore-enough, Troy, 24 Nov 2026: he could not finish)', row.rocks.length === 4 && row.rocks.every(f => f.n === 10 && f.hp === 200), JSON.stringify(row.rocks));
  const M = J(`(() => { const L = CAMP.levels[1].missions[1], pl = campPlaces(1).ceres, d = f => Math.round(Math.hypot(f.at[0], f.at[1])); return { ore: L.rocks.reduce((a, f) => a + f.n, 0) * CAMP.ore.rock, goal: L.objectives[0].n, d: L.rocks.map(d), spend: 5 * CAMP.missile.cost + CAMP.emergency.ore + CAMP.mend.hullOre, start: CAMP.ore.start }; })()`);
  check('ENOUGH ORE: the field holds at least 1.5 times the goal in the store (675 of 450), and a player who also pays for five missiles, one Emergency shield and one hull repair (210 ore) can still fill the bay to the goal with the rocks to spare', M.ore >= 1.5 * M.goal && M.ore >= M.goal + M.spend + 100, JSON.stringify(M));
  check('the fourth field is a little further out than the three (the furthest, under 3,000 px from Ceres: a cruiser flies there in about 14 s), the other three are where they were', M.d.length === 4 && M.d[3] === Math.max(...M.d) && M.d[3] < 3000 && M.d[3] > Math.max(...M.d.slice(0, 3)) && M.d.slice(0, 3).join() === '1140,1170,1628', M.d.join());
  check('the goal is a store of 450 (of the 500 it holds), and the sale asked for is as it was, 160', row.goal.type === 'ore' && row.goal.n === 450 && row.cash.type === 'cashin' && row.cash.n === 160, JSON.stringify(row));
  const C = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1, ore: 176 }); campStep(C, 0.1); return { n: C.rocks.length, hp: C.rocks.map(r => r.hp + '/' + r.maxHp).filter((v, i, a) => a.indexOf(v) === i), ore: C.ore, goal: campObjectives(C)[0] }; })()`);
  check('a battle makes 40 rocks of 200 hit points', C.n === 40 && C.hp.join() === '200/200', JSON.stringify(C));
  check('with the 176 ore a good 1.1 carries in, the goal is not met at the start (190 was: 14 ore to go); 274 ore are to be mined of the 800 in the fields', C.ore === 176 && C.goal.done === false && C.goal.need === 450 && C.goal.got === 176, JSON.stringify(C.goal));
  const o = J(`(() => { const C = campNew(2, [], { seed: 1 }); return C.rocks.length ? C.rocks.map(r => r.hp + '/' + r.maxHp).filter((v, i, a) => a.indexOf(v) === i) : null; })()`);
  check('a field row that says no hp keeps the table\'s 100 (level 2\'s rocks)', o && o.join() === '100/100', JSON.stringify(o));
}

console.log('B. 1.2: the bot that keeps mining (plainm) takes most of the mission to meet the goal, and the raids land while it works');
{
  g.run(`globalThis.__origT = campStep; campStep = function (C, dt) { __origT(C, dt); if (window.__tg) window.__tg(C); };`);
  const rows = [];
  for (const seed of [1, 2]) {
    g.run(`window.__goalAt = null; window.__raidAt = []; window.__tg = C => { const o = campObjectives(C)[0]; if (o && o.done && window.__goalAt == null) window.__goalAt = Math.round(C.t / 1000); const w = C.waves.filter(x => x.started).length; if (window.__raidAt.length < w) window.__raidAt.push(Math.round(C.t / 1000)); };`);
    const r = botRun(1, seed, 'plainm', 'steady', techsFor(1), 420, 1);
    rows.push({ seed, res: r.result, t: r.t, goal: J('window.__goalAt'), raids: J('window.__raidAt'), lost: r.shipsLost, hull: r.hull });
  }
  g.run('window.__tg = null');
  check('both runs are won, in about four and a half to five and a half minutes (240 to 400 s; it was 270 to 400 s when the last raid was the third, at 270 s: card l1-pacing made it the fifth, at 240 s or from 230 s if the others are dead), and neither is won before its fifth raid is in', rows.every(r => r.res === 'won' && r.t >= 240 && r.t <= 400 && r.raids.length === 5 && r.raids[4] >= 230 && r.raids[4] <= 285 && r.t > r.raids[4]), JSON.stringify(rows)); // the fifth raid is at 242 at the latest as it was; 250 since card space-game-slower-fights: with half-speed fights the others die later and seed 2's raid is seen at 244; 285 since card space-game-fighter-flight: the wing strafes the torpedo boats, which takes it 50 s, and the heavy raid comes 55 s after they are dead (259 on seed 1)
  check('from an empty store the goal is met between 150 and 310 s (it was about 100 s, and 290 s at most until the fights ran at half speed: cards space-game-slower-fights and space-game-l1-pacing-bugs together put seed 1 at 298), so mining fills most of the mission', rows.every(r => r.goal >= 150 && r.goal <= 310), JSON.stringify(rows));
  check('the first four raids (40, 100, 112 and 175 s; it was two, at 70 and 170 s, before card l1-pacing) land before the goal is met or while it is being worked: the first is in by 42 s, the fourth by 177 s, and the fourth is not after the goal (a tie at 175 s on seed 2 since card space-game-three-pilots)', rows.every(r => r.raids[0] <= 42 && r.raids[1] <= 102 && r.raids[2] <= 114 && r.raids[3] <= 177 && r.raids[3] <= r.goal), JSON.stringify(rows));
}

console.log('C. 1.3: the first contact');
{
  const row = J(`(() => { const L = CAMP.levels[1].missions[2]; const k = L.waves.findIndex(w => w.on && w.on.cue === 'contact'); return { hp: L.hpScale, dmg: L.dmgScale, at: k, of: L.waves.length, contact: L.waves[k].ships, on: L.waves[k].on, cue: L.cues[0].on.lane }; })()`);
  check('the contact wave is four raiders, one drone and one gunship (six ships; it was eight, 2 and 2, until card space-game-13-all-haulers-savable); it is the sixth and last wave now (it was the third: card l1-pacing put three more pirate beats before it) and its cue is at 0.82 of the road (it was 0.52)', row.at === 5 && row.of === 6 && row.cue === 0.82 && row.contact.raider === 4 && row.contact.drone === 1 && row.contact.gunship === 1 && Object.keys(row.contact).length === 3, JSON.stringify(row));
  check('the scales are 2.9 for hit points and 1.55 for damage (they were 2.2 and 2.1 until card l1-pacing: tougher hulls and lighter guns, so a fight lasts and a wrong answer costs less at once)', row.hp === 2.9 && row.dmg === 1.55, JSON.stringify(row));
  const lost = [1, 2, 3, 4].map(seed => botRun(1, seed, 'plains', 'steady', techsFor(1), 420, 2));
  check('the plain bot that helps (no pilot call asks for orders any more: card space-game-no-pilot-popups) wins first contact every time, and the wing loses 5 ships at the very most (it was up to 8)', lost.every(r => r.result === 'won' && r.shipsLost <= 5), JSON.stringify(lost.map(r => [r.result, r.shipsLost])));
}

console.log('D. 1.2: lost when both miners are destroyed, and the par is 300 s (card space-game-12-lose-no-miners, Troy, 24 Nov 2026)');
{
  const row = J(`(() => { const M = CAMP.levels[1].missions; return { lose: M[1].lose, par: M[1].par, swift: M[1].bonus.find(b => b.id === 'swift').secs, par13: M[2].par, swift11: M[0].bonus.find(b => b.id === 'swift').secs, none11: !M[0].lose && !M[2].lose }; })()`);
  check('the 1.2 row carries the lose rule: when the last neutral miner ship is gone the mission is lost, the cause is miners (1.1 and 1.3 have none)', JSON.stringify(row.lose) === '[{"type":"nomore","kind":"miner","why":"miners"}]' && row.none11, JSON.stringify(row));
  check('par and the swift bonus are 300 s, both places (they were 380); 1.3 keeps its par 380 and 1.1 its swift 400', row.par === 300 && row.swift === 300 && row.par13 === 380 && row.swift11 === 400, JSON.stringify(row));
  const sim = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1 }); campStep(C, 0.1); const ms = C.ships.filter(u => u.team === 'neutral' && u.kind === 'miner'), p = C.ships.find(u => u.pilot);
    campKill(C, p); campStep(C, 0.1); const afterPilot = C.result ? C.why : null;
    campKill(C, ms[0]); campStep(C, 0.1); const afterOne = C.result ? C.why : null;
    campKill(C, ms[1]); campStep(C, 0.1); const lines = campLoseLines(C, C.why); return { n: ms.length, afterPilot, afterOne, result: C.result, why: C.why, lines }; })()`);
  check('two miner ships at the start; a pilot lost or one miner lost does not end it; the second miner lost does: lost, because miners', sim.n === 2 && sim.afterPilot === null && sim.afterOne === null && sim.result === 'lost' && sim.why === 'miners', JSON.stringify(sim).slice(0, 300));
  check('the lose card says why in plain words (Both mining ships are lost.), then how long it lasted, then one thing to try with the keys from the key table and no brace left', sim.lines[0] === 'Both mining ships are lost.' && /^You lasted /.test(sim.lines[1]) && /^Guard the miners: pick one \(/.test(sim.lines[2]) && !/[{}]/.test(sim.lines.join(' ')) && sim.lines[2].split(/\s+/).length <= 14, JSON.stringify(sim.lines));
  check('1.1\'s one miner (the distress call) lost does not lose 1.1: the rule is 1.2\'s', J(`(() => { const C = campNew(1, [], { seed: 1, mission: 0 }); campStep(C, 0.1); const m = C.ships.find(u => u.team === 'neutral' && u.kind === 'miner'); if (!m) return 'no miner'; campKill(C, m); campStep(C, 0.1); return C.result ? C.why : null; })()`) === null);
  const bots = {};
  for (const name of ['idle', 'plain']) bots[name] = (name === 'idle' ? [1, 2] : [1, 2, 3, 4, 5, 6]).map(seed => { const r = botRun(1, seed, name, 'steady', techsFor(1), 420, 1); return { res: r.result, why: J('window.C.why'), t: r.t, bonus: r.bonus }; });
  check('the idle bot LOSES 1.2 (it used to sit there to the clock with no win and no loss): both seeds lost, because miners, well inside 420 s', bots.idle.every(r => r.res === 'lost' && r.why === 'miners' && r.t < 420), JSON.stringify(bots.idle));
  const swift = bots.plain.filter(r => /swift/.test(r.bonus)).length;
  check('the plain bot still WINS 1.2 on every seed, and the swift bonus at the new par (300 s) is within reach: earned on at least half of six seeds (measured 8 of 10 at Normal: the misses are 309 s and 333 s, a fight that pulls the pilots off the rocks; 380 s never was at risk)', bots.plain.every(r => r.res === 'won') && swift >= 3 && Math.min(...bots.plain.map(r => r.t)) < 290, JSON.stringify(bots.plain));
}

console.log('\nthe game made ' + (g.errors.length ? 'errors: ' + g.errors.join(' | ') : 'no errors'));
check('the game made no error', g.errors.length === 0);
console.log(failed ? `\nCAMPL1TUNE FAIL (${failed} of ${n})` : `\nCAMPL1TUNE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
