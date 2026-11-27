// smoke: the cockpit bots and their pass rule: ace takes a pilot's stick and flies it through C.cockpit.input, sit takes it and does nothing, the table is put back after each run, and the rule's verdicts are the proposal's (plain Node, no Chrome)
// Card space-game-fly-fighter-l3 (Troy, 26 Nov 2026: he will fly a pilot's fighter with the C key). tools/campaign-bot.mjs has the bots ace, ace1 (hpK 1), sit and sitoff (turrets 'off'), the new columns (seconds in the cockpit, its kills and deaths, the cruiser's damage while he was away)
// and `--cockpit`, the sweep with its pass rule (cockpitVerdict). The bots need src/campcockpit.js (card space-game-fly-fighter-l1): until it is in the game the bot checks are skipped and said so; the rule's own checks always run.
// Run: node tests/campcockpitbot.mjs   (exit code 1 on a failed check)
import { run, techsFor, botGame, cockpitVerdict, COCKPIT_RULE, summarise } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const J = e => JSON.parse(botGame.run(`JSON.stringify(${e}) ?? 'null'`));

// ---- the rule (always) ----
const S = (won, tWin, taken) => ({ won, tWin, taken });
const plain = S(100, 100, 100);
check('the rule: ace as fast and as hard on the cruiser as plain passes both', cockpitVerdict(plain, S(100, 100, 100), S(100, 100, 100)).ok);
check('the rule: ace 14 percent faster passes, 16 percent faster fails', cockpitVerdict(plain, S(100, 86, 100), plain).time === 'pass' && cockpitVerdict(plain, S(100, 84, 100), plain).time === 'FAIL');
check('the rule: ace taking 29 percent less cruiser damage passes, 31 percent less fails', cockpitVerdict(plain, S(100, 100, 71), plain).taken === 'pass' && cockpitVerdict(plain, S(100, 100, 69), plain).taken === 'FAIL');
check('the rule (card space-game-b12-c11-12-sweep-rules, Troy, 27 Nov 2026): sit may be up to 10 points worse than plain in a mission plain wins (was 3): 10 worse passes, 11 worse fails', cockpitVerdict(plain, plain, S(90, 100, 100)).sit === 'pass' && cockpitVerdict(plain, plain, S(89, 100, 100)).sit === 'FAIL' && cockpitVerdict(plain, plain, S(100, 100, 100)).sit === 'pass');
check('the rule: a mission plain does not win (under 90 percent) has no sit verdict', cockpitVerdict(S(50, 100, 100), plain, S(0, null, 0)).sit === 'n/a');
check('the rule: plain\'s own number must mean something: under 20 s or under 30 damage is n/a, whatever ace did', cockpitVerdict(S(100, 15, 20), S(100, 5, 1), plain).time === 'n/a' && cockpitVerdict(S(100, 15, 20), S(100, 5, 1), plain).taken === 'n/a');
check('the rule: ok is false when any verdict is FAIL and true when none is', !cockpitVerdict(plain, S(100, 50, 100), plain).ok && cockpitVerdict(plain, plain, plain).ok);
// rules 4 and 5 (card space-game-chunk15-sweep-rule, brief 8 decision 12): the flown fighter is really hit and deals a fair share of the damage (rule 5 counted its kills until card space-game-b12-c11-12-sweep-rules), or the sweep says "safe and changes little"
const F = (kills, dmgShare, cockHurt, shotRuns) => Object.assign(S(100, 100, 100), { kills, dmgShare, cockHurt, shotRuns }); // kills: plain's (a fight is 5 or more); dmgShare: the flown fighter's share of the damage dealt to hostiles, percent
const fplain = F(12, null, null, null);
check('rule 4 (re-made by card space-game-b10-c15-tune-11, Troy, 27 Nov 2026): in a fight, a median of 15 percent of a hull lost passes, 14 fails; never shot down is no failure; shot down in more than half the runs (shredded) fails', cockpitVerdict(fplain, F(12, 6, 15, 0), plain).hurt === 'pass' && cockpitVerdict(fplain, F(12, 6, 14, 0), plain).hurt === 'FAIL' && cockpitVerdict(fplain, F(12, 6, 20, 0), plain).hurt === 'pass' && cockpitVerdict(fplain, F(12, 6, 90, 50), plain).hurt === 'pass' && cockpitVerdict(fplain, F(12, 6, 90, 51), plain).hurt === 'FAIL');
check('rule 5 (card space-game-b12-c11-12-sweep-rules): in a fight, the fighter\'s share of the DAMAGE dealt to hostiles, median a run, at least 15 percent passes, 14.9 fails; its kills are not counted (a fighter with 0 kills and a fifth of the damage passes)', cockpitVerdict(fplain, F(12, 15, 20, 0), plain).dmg === 'pass' && cockpitVerdict(fplain, F(12, 14.9, 20, 0), plain).dmg === 'FAIL' && cockpitVerdict(fplain, Object.assign(F(12, 20, 20, 0), { cockKills: 0 }), plain).dmg === 'pass' && cockpitVerdict(fplain, Object.assign(F(12, 5, 20, 0), { cockKills: 12 }), plain).dmg === 'FAIL');
check('rules 4 and 5 judge only a fight: plain with under 5 kills (or none counted) gives n/a, whatever the fighter did', cockpitVerdict(F(4, null, null, null), F(4, 0, 0, 0), plain).hurt === 'n/a' && cockpitVerdict(F(4, null, null, null), F(4, 0, 0, 0), plain).dmg === 'n/a' && cockpitVerdict(plain, plain, plain).hurt === 'n/a');
check('"safe and changes little" fails the rule as a whole: a fighter that is as fast and as hard on the cruiser as plain but never hit (no hull lost) and with a kill or two', !cockpitVerdict(fplain, F(12, 1, 0, 0), plain).ok);
check('a fighter that is really hit (20 percent of a hull a run) and deals its share (20 percent of the damage) passes the whole rule where the old numbers pass', cockpitVerdict(fplain, F(12, 20, 20, 0), plain).ok);
check('the numbers: a fight is 5 kills of plain\'s, 15 percent of a hull lost a run, not shot down in more than 50 percent of the runs, 15 percent of the damage dealt (about a seventh; the kills share is gone)', COCKPIT_RULE.minFight === 5 && COCKPIT_RULE.hurtMin === 15 && COCKPIT_RULE.shotMax === 50 && COCKPIT_RULE.dmgShare === 15 && COCKPIT_RULE.killsShare === undefined);
check('the rule\'s numbers: 15 percent, 30 percent, 10 points (was 3: card space-game-b12-c11-12-sweep-rules), from 90 percent', COCKPIT_RULE.faster === 0.85 && COCKPIT_RULE.softer === 0.7 && COCKPIT_RULE.sitSlack === 10 && COCKPIT_RULE.sitFrom === 90);

// ---- the bots (once src/campcockpit.js is in the game) ----
if (J("typeof campCockpitTake === 'function'") !== true) {
  console.log('  skip the bots: src/campcockpit.js (card space-game-fly-fighter-l1) is not in the game yet');
} else {
  const techs = techsFor(1), before = J('({ on: CAMP.flags.cockpit, hpK: CAMP.cockpit.hpK, turrets: CAMP.cockpit.turrets })');
  const p0 = run(1, 1, 'plain', 'steady', techs, 420, 0), a = run(1, 1, 'ace', 'steady', techs, 420, 0), a1 = run(1, 1, 'ace1', 'steady', techs, 420, 0), s = run(1, 1, 'sit', 'steady', techs, 420, 0), so = run(1, 1, 'sitoff', 'steady', techs, 420, 0), p1 = run(1, 1, 'plain', 'steady', techs, 420, 0);
  check('plain has no cockpit columns and is the same game before and after the cockpit bots ran (the flag and the table are put back)', p0.cockSec === 0 && p0.cockKills === 0 && p0.awayTaken === 0 && p0.t === p1.t && p0.hull === p1.hull && p0.kills === p1.kills && p0.result === p1.result, JSON.stringify([p0.t, p1.t, p0.hull, p1.hull]));
  check('after every run the switch and the table are as they were (flag ' + before.on + ', hpK ' + before.hpK + ', turrets ' + before.turrets + ')', JSON.stringify(J('({ on: CAMP.flags.cockpit, hpK: CAMP.cockpit.hpK, turrets: CAMP.cockpit.turrets })')) === JSON.stringify(before));
  check('ace takes the stick (seconds in the cockpit over half the mission) and flies it: the fighter has shot something down', a.cockSec > a.t / 2 && a.cockKills > 0 && a.cockTakes >= 1, JSON.stringify([a.cockSec, a.t, a.cockKills, a.cockTakes]));
  check('the run carries what hit the flown fighter (card space-game-b10-c1-lead-shots): its hull lost (a share of one hull) and the hand-backs for a low hull; plain has none, the ace and the sit have numbers', p0.cockHurt === 0 && p0.cockBacks === 0 && typeof a.cockHurt === 'number' && a.cockHurt >= 0 && Number.isInteger(a.cockBacks) && typeof s.cockHurt === 'number', JSON.stringify([p0.cockHurt, a.cockHurt, a.cockBacks, s.cockHurt]));
  check('every run carries what the raiders did to the convoys (card space-game-b10-c15-tune-11): convHurt, the share of the convoy ships\' hull lost, 0 to 1, for plain and for the ace', typeof p0.convHurt === 'number' && typeof a.convHurt === 'number' && p0.convHurt >= 0 && p0.convHurt <= 1 && a.convHurt >= 0 && a.convHurt <= 1, JSON.stringify([p0.convHurt, a.convHurt]));
  check('sit takes the stick and does nothing: seconds in the cockpit, no kills of its own, the cruiser flown on as plain flies it', s.cockSec > s.t / 2 && s.cockKills === 0 && s.cockTakes >= 1, JSON.stringify([s.cockSec, s.t, s.cockKills]));
  check('every run counts the damage dealt to hostiles by everybody (alienDmg), and the flown fighter\'s own part of it (cockDmg) is a part of it: plain has none of its own, the ace has some, the sit none; the summary\'s dmgShare is the median share a run in percent', p0.alienDmg > 0 && p0.cockDmg === 0 && a.alienDmg > 0 && a.cockDmg > 0 && a.cockDmg <= a.alienDmg && s.cockDmg === 0 && summarise([a]).dmgShare === Math.round(a.cockDmg / a.alienDmg * 1000) / 10 && summarise([s]).dmgShare === 0, JSON.stringify([p0.alienDmg, a.cockDmg, a.alienDmg, s.cockDmg]));
  check('a cockpit run counts what the cruiser takes while he is away (never more than it took in all)', a.awayTaken <= Object.values(a.hitC).reduce((x, y) => x + y, 0) + 1 && a.awayTaken > 0, JSON.stringify([a.awayTaken, a.hitC]));
  check('ace1 is a cockpit run of its own (hpK 1), and sitoff is sit with the cruiser\'s turrets silent while he is away: the cruiser kills less than it does with them on their own', a1.cockSec > 0 && so.cockSec > 0 && so.kills < s.kills, JSON.stringify([a1.cockSec, so.cockSec, so.kills, s.kills]));
  check('the same seed flies the same: ace twice is the same run', JSON.stringify(run(1, 2, 'ace', 'steady', techs, 420, 0)) === JSON.stringify(run(1, 2, 'ace', 'steady', techs, 420, 0)));
}

console.log(failed ? `\nCOCKPIT BOT FAIL: ${failed} of ${n} checks failed` : `\nCOCKPIT BOT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
