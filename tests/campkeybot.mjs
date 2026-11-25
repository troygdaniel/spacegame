// smoke: the keys alone win the Campaign: the plain bot gives every order through the order lists' keys (the list's key, Down to the row, Enter; the target picked first; Enter for a missile) and still wins all nine missions (plain Node, no Chrome)
// Card round-three. tools/campaign-bot.mjs flies the sim with campOrder; with --keys every order it gives goes through campPanelKey (src/camppanel.js), the same function the scene hands a player's keys to. So this suite fails when
// an order a mission needs has no row, when a row moves to a list the keys cannot reach, or when a key stops doing what the table says. Two seeds a mission: about fifteen seconds.
// Run: node tests/campkeybot.mjs   (exit code 1 on a failed check)
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const bot = args => JSON.parse(execFileSync(process.execPath, [join(ROOT, 'tools', 'campaign-bot.mjs'), '--bots', 'plain,idle', '--seeds', '2', '--json'].concat(args), { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));

const K = bot(['--keys']);
const missions = Object.keys(K).filter(k => /^\d\.\d$/.test(k));
check('all nine missions were flown', missions.join() === '1.1,1.2,1.3,2.1,2.2,2.3,3.1,3.2,3.3', missions.join());
check('giving every order through the keys, the plain bot wins every one of the nine, every seed', missions.every(m => K[m].plain.won === 100), missions.map(m => m + ':' + K[m].plain.won).join(' '));
check('and the orders really went through the lists: hundreds of them (launch, attack, escort, mine, recall, the convoy orders)', K.keys && K.keys.orders > 200, JSON.stringify(K.keys));
check('a player who presses nothing still wins none', missions.every(m => K[m].idle.won === 0), missions.map(m => m + ':' + K[m].idle.won).join(' '));
check('the mission 1.1 a player meets first is won by the keys with the transport delivered and no ship lost', K['1.1'].plain.delivered === 1 && K['1.1'].plain.shipsLost === 0, JSON.stringify([K['1.1'].plain.delivered, K['1.1'].plain.shipsLost]));

// ---- 1.2 through the keys (card space-game-12-keys-lose-miners): since the miners rule (space-game-12-lose-no-miners) the key bots lost 1.2 often (plain 67%, strong 50%, missile 17%, Normal, 6 seeds) while the straight bots did not (100, 83, 100). It was the bots, not the rule: the nearest-threat key kept sending the pilots after a pirate that had broken off, 10 to 17 km from Ceres, while the next raid killed the miners; and the missile bots built racks with the ore the mission asks for
const k12 = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'tools', 'campaign-bot.mjs'), '--keys', '--json', '--pace', 'normal', '--level', '1', '--mission', '2', '--seeds', '6', '--bots', 'plain,strong'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }))['1.2'];
check('1.2 through the keys: the plain bot wins every seed of six (it was 67 percent: it chased runners 10 km out and the miners died at home), the strong bot at least four of six (it was 50)', k12 && k12.plain.won === 100 && k12.strong.won >= 66, JSON.stringify(k12 && [k12.plain.won, k12.strong.won]));

console.log(failed ? `\nCAMPAIGN KEY BOT FAIL (${failed} of ${n})` : `\nCAMPAIGN KEY BOT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
