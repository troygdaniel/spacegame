// smoke: the cockpit bots and their pass rule: ace takes a pilot's stick and flies it through C.cockpit.input, sit takes it and does nothing, the table is put back after each run, and the rule's verdicts are the proposal's (plain Node, no Chrome)
// Card space-game-fly-fighter-l3 (Troy, 26 Nov 2026: he will fly a pilot's fighter with the C key). tools/campaign-bot.mjs has the bots ace, ace1 (hpK 1), sit and sitoff (turrets 'off'), the new columns (seconds in the cockpit, its kills and deaths, the cruiser's damage while he was away)
// and `--cockpit`, the sweep with its pass rule (cockpitVerdict). The bots need src/campcockpit.js (card space-game-fly-fighter-l1): until it is in the game the bot checks are skipped and said so; the rule's own checks always run.
// Run: node tests/campcockpitbot.mjs   (exit code 1 on a failed check)
import { run, techsFor, botGame, cockpitVerdict, COCKPIT_RULE } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const J = e => JSON.parse(botGame.run(`JSON.stringify(${e}) ?? 'null'`));

// ---- the rule (always) ----
const S = (won, tWin, taken) => ({ won, tWin, taken });
const plain = S(100, 100, 100);
check('the rule: ace as fast and as hard on the cruiser as plain passes both', cockpitVerdict(plain, S(100, 100, 100), S(100, 100, 100)).ok);
check('the rule: ace 14 percent faster passes, 16 percent faster fails', cockpitVerdict(plain, S(100, 86, 100), plain).time === 'pass' && cockpitVerdict(plain, S(100, 84, 100), plain).time === 'FAIL');
check('the rule: ace taking 29 percent less cruiser damage passes, 31 percent less fails', cockpitVerdict(plain, S(100, 100, 71), plain).taken === 'pass' && cockpitVerdict(plain, S(100, 100, 69), plain).taken === 'FAIL');
check('the rule: sit may lose one seed in 32 (3 points) of a mission plain wins, not two', cockpitVerdict(plain, plain, S(97, 100, 100)).sit === 'pass' && cockpitVerdict(plain, plain, S(94, 100, 100)).sit === 'FAIL');
check('the rule: a mission plain does not win (under 90 percent) has no sit verdict', cockpitVerdict(S(50, 100, 100), plain, S(0, null, 0)).sit === 'n/a');
check('the rule: plain\'s own number must mean something: under 20 s or under 30 damage is n/a, whatever ace did', cockpitVerdict(S(100, 15, 20), S(100, 5, 1), plain).time === 'n/a' && cockpitVerdict(S(100, 15, 20), S(100, 5, 1), plain).taken === 'n/a');
check('the rule: ok is false when any verdict is FAIL and true when none is', !cockpitVerdict(plain, S(100, 50, 100), plain).ok && cockpitVerdict(plain, plain, plain).ok);
check('the rule\'s numbers are the proposal\'s: 15 percent, 30 percent, 3 points, from 90 percent', COCKPIT_RULE.faster === 0.85 && COCKPIT_RULE.softer === 0.7 && COCKPIT_RULE.sitSlack === 3 && COCKPIT_RULE.sitFrom === 90);

// ---- the bots (once src/campcockpit.js is in the game) ----
if (J("typeof campCockpitTake === 'function'") !== true) {
  console.log('  skip the bots: src/campcockpit.js (card space-game-fly-fighter-l1) is not in the game yet');
} else {
  const techs = techsFor(1), before = J('({ on: CAMP.flags.cockpit, hpK: CAMP.cockpit.hpK, turrets: CAMP.cockpit.turrets })');
  const p0 = run(1, 1, 'plain', 'steady', techs, 420, 0), a = run(1, 1, 'ace', 'steady', techs, 420, 0), a1 = run(1, 1, 'ace1', 'steady', techs, 420, 0), s = run(1, 1, 'sit', 'steady', techs, 420, 0), so = run(1, 1, 'sitoff', 'steady', techs, 420, 0), p1 = run(1, 1, 'plain', 'steady', techs, 420, 0);
  check('plain has no cockpit columns and is the same game before and after the cockpit bots ran (the flag and the table are put back)', p0.cockSec === 0 && p0.cockKills === 0 && p0.awayTaken === 0 && p0.t === p1.t && p0.hull === p1.hull && p0.kills === p1.kills && p0.result === p1.result, JSON.stringify([p0.t, p1.t, p0.hull, p1.hull]));
  check('after every run the switch and the table are as they were (flag ' + before.on + ', hpK ' + before.hpK + ', turrets ' + before.turrets + ')', JSON.stringify(J('({ on: CAMP.flags.cockpit, hpK: CAMP.cockpit.hpK, turrets: CAMP.cockpit.turrets })')) === JSON.stringify(before));
  check('ace takes the stick (seconds in the cockpit over half the mission) and flies it: the fighter has shot something down', a.cockSec > a.t / 2 && a.cockKills > 0 && a.cockTakes >= 1, JSON.stringify([a.cockSec, a.t, a.cockKills, a.cockTakes]));
  check('sit takes the stick and does nothing: seconds in the cockpit, no kills of its own, the cruiser flown on as plain flies it', s.cockSec > s.t / 2 && s.cockKills === 0 && s.cockTakes >= 1, JSON.stringify([s.cockSec, s.t, s.cockKills]));
  check('a cockpit run counts what the cruiser takes while he is away (never more than it took in all)', a.awayTaken <= Object.values(a.hitC).reduce((x, y) => x + y, 0) + 1 && a.awayTaken > 0, JSON.stringify([a.awayTaken, a.hitC]));
  check('ace1 is a cockpit run of its own (hpK 1), and sitoff is sit with the cruiser\'s turrets silent while he is away: the cruiser kills less than it does with them on their own', a1.cockSec > 0 && so.cockSec > 0 && so.kills < s.kills, JSON.stringify([a1.cockSec, so.cockSec, so.kills, s.kills]));
  check('the same seed flies the same: ace twice is the same run', JSON.stringify(run(1, 2, 'ace', 'steady', techs, 420, 0)) === JSON.stringify(run(1, 2, 'ace', 'steady', techs, 420, 0)));
}

console.log(failed ? `\nCOCKPIT BOT FAIL: ${failed} of ${n} checks failed` : `\nCOCKPIT BOT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
