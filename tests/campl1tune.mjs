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
  check('three fields of ten rocks, each of 200 hit points (600 ore in all)', row.rocks.length === 3 && row.rocks.every(f => f.n === 10 && f.hp === 200), JSON.stringify(row.rocks));
  check('the goal is a store of 450 (of the 500 it holds), and the sale asked for is as it was, 160', row.goal.type === 'ore' && row.goal.n === 450 && row.cash.type === 'cashin' && row.cash.n === 160, JSON.stringify(row));
  const C = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1, ore: 176 }); campStep(C, 0.1); return { n: C.rocks.length, hp: C.rocks.map(r => r.hp + '/' + r.maxHp).filter((v, i, a) => a.indexOf(v) === i), ore: C.ore, goal: campObjectives(C)[0] }; })()`);
  check('a battle makes 30 rocks of 200 hit points', C.n === 30 && C.hp.join() === '200/200', JSON.stringify(C));
  check('with the 176 ore a good 1.1 carries in, the goal is not met at the start (190 was: 14 ore to go); 274 ore are to be mined of the 600 in the fields', C.ore === 176 && C.goal.done === false && C.goal.need === 450 && C.goal.got === 176, JSON.stringify(C.goal));
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
  check('both runs are won, in about four and a half to five and a half minutes (240 to 400 s; it was 270 to 400 s when the last raid was the third, at 270 s: card l1-pacing made it the fifth, at 240 s or from 230 s if the others are dead), and neither is won before its fifth raid is in', rows.every(r => r.res === 'won' && r.t >= 240 && r.t <= 400 && r.raids.length === 5 && r.raids[4] >= 230 && r.raids[4] <= 242 && r.t > r.raids[4]), JSON.stringify(rows));
  check('from an empty store the goal is met between 150 and 290 s (it was about 100 s), so mining fills most of the mission', rows.every(r => r.goal >= 150 && r.goal <= 290), JSON.stringify(rows));
  check('the first four raids (40, 100, 112 and 175 s; it was two, at 70 and 170 s, before card l1-pacing) land before the goal is met or while it is being worked: the first is in by 42 s, the fourth by 177 s, and the fourth is before the goal', rows.every(r => r.raids[0] <= 42 && r.raids[1] <= 102 && r.raids[2] <= 114 && r.raids[3] <= 177 && r.raids[3] < r.goal), JSON.stringify(rows));
}

console.log('C. 1.3: the first contact');
{
  const row = J(`(() => { const L = CAMP.levels[1].missions[2]; const k = L.waves.findIndex(w => w.on && w.on.cue === 'contact'); return { hp: L.hpScale, dmg: L.dmgScale, at: k, of: L.waves.length, contact: L.waves[k].ships, on: L.waves[k].on, cue: L.cues[0].on.lane }; })()`);
  check('the contact wave is four raiders, two drones and two gunships (eight ships, as before); it is the sixth and last wave now (it was the third: card l1-pacing put three more pirate beats before it) and its cue is at 0.82 of the road (it was 0.52)', row.at === 5 && row.of === 6 && row.cue === 0.82 && row.contact.raider === 4 && row.contact.drone === 2 && row.contact.gunship === 2 && Object.keys(row.contact).length === 3, JSON.stringify(row));
  check('the scales are 2.9 for hit points and 1.55 for damage (they were 2.2 and 2.1 until card l1-pacing: tougher hulls and lighter guns, so a fight lasts and a wrong answer costs less at once)', row.hp === 2.9 && row.dmg === 1.55, JSON.stringify(row));
  g.run(`window.__SMART.wounded = window.__WRONG.wounded`); // every call right but the wounded one at first contact, which is answered wrong ("Cover him")
  const lost = [1, 2, 3, 4].map(seed => botRun(1, seed, 'plains', 'steady', techsFor(1), 420, 2));
  check('with that one wrong answer the mission is still won every time, and the wing loses 5 ships at the very most (it was up to 8)', lost.every(r => r.result === 'won' && r.shipsLost <= 5), JSON.stringify(lost.map(r => [r.result, r.shipsLost])));
  g.run(`window.__SMART.wounded = 3`);
}

console.log('\nthe game made ' + (g.errors.length ? 'errors: ' + g.errors.join(' | ') : 'no errors'));
check('the game made no error', g.errors.length === 0);
console.log(failed ? `\nCAMPL1TUNE FAIL (${failed} of ${n})` : `\nCAMPL1TUNE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
