// smoke: no line the Campaign says names a digit key as an order: a digit opens a panel now, so "press 3" or "(2)" does nothing (plain Node, no Chrome)
// [wrap-up] level 1 hunt: six lines still told the player to press 6 (send the drones), 2 (drones), 3 (escort), 4 (guard) and "(1)", "(2)", "(4)" after the panels replaced the direct digit keys:
// the story's first lines and the ambush hint in the belt, and the tips on the lose cards. They now name the panel and the row ("FLEET panel, Escort"), which stays true when the panels'
// keys move. The one form allowed is the two-key one ("Press 1, then 1": the key that opens a panel, then the row: the nudges and the goal help), which tests/uxnudge.mjs checks against CAMP_PANELS.
// Run: node tests/campkeytext.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const rows = JSON.parse(g.run(`JSON.stringify(Object.keys(UI_TEXT).filter(k => /^camp\\./.test(k)).map(k => [k, UI_TEXT[k]]))`));
check('the table has the Campaign lines to read', rows.length > 200, String(rows.length));
const stale = rows.filter(([k, v]) => !/^camp\.nudge\./.test(k) && !/^camp\.(hub|keys|ui\.(pick|refit))/.test(k) && /\b[Pp]ress \d\b|\((?:[1-9])\)|\bkey [1-9]\b/.test(v.replace(/[Pp]ress \d, then \d/g, '')));
check('no Campaign line says "press <digit>", "(<digit>)" or "key <digit>" (the hub, the keys page and the refit cards name their own digits)', stale.length === 0, JSON.stringify(stale));
const six = ['camp.say.ambush2', 'camp.lose.tip.convoy', 'camp.lose.tip.base', 'camp.lose.tip.carrier', 'camp.lose.tip.earth'];
const byKey = Object.fromEntries(rows);
check('the five lines name a panel, not a key (the sixth, the old level 1 story line, is a different line now: the rim run)', six.every(k => /panel/i.test(byKey[k] || '')), JSON.stringify(six.map(k => byKey[k])));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
