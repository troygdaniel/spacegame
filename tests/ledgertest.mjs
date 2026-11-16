// smoke: the test-run ledger (one line per run: suite, seconds, waited, result, who) and its reader tools/test-ledger.mjs (no browser)
// Tests for tests/ledger.mjs, its hooks in tests/lock.mjs and tests/smoke.sh, and tools/test-ledger.mjs. Uses its own ledger file and lock
// directory, never the real ones. Run: node tests/ledgertest.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const LEDGERJS = pathToFileURL(join(HERE, 'ledger.mjs')).href, LOCKJS = pathToFileURL(join(HERE, 'lock.mjs')).href;
const L = await import(LEDGERJS);
const R = await import(pathToFileURL(join(ROOT, 'tools', 'test-ledger.mjs')).href);
const work = mkdtempSync(join(tmpdir(), 'lhledger-'));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const fresh = name => join(work, name); // a path nothing has written yet

// ---- the line: written and read back, and bad lines are not lines ----
const sample = { ts: '2026-11-15T19:03:22Z', suite: 'jump', seconds: 41.34, waited: 12, result: 'pass', who: 'spacegame-TaskMaster-2', via: 'smoke' };
const line = L.formatLine(sample);
check('a line is seven tab-separated fields and one newline', line.endsWith('\n') && line.trimEnd().split('\t').length === 7 && line.split('\n').length === 2, JSON.stringify(line));
const back = L.parseLine(line);
check('and reads back the same (seconds to a tenth)', back && back.suite === 'jump' && back.seconds === 41.3 && back.waited === 12 && back.result === 'pass' && back.who === 'spacegame-TaskMaster-2' && back.via === 'smoke' && back.at === Date.parse(sample.ts));
check('a blank line, a short line, a bad result and a bad number are not runs',
  [L.parseLine(''), L.parseLine('a\tb'), L.parseLine(line.replace('pass', 'maybe')), L.parseLine(line.replace('41.3', 'x'))].every(r => r === null));
check('a line cut short by a crash is skipped, not a failure', L.parseLine(line.slice(0, 40)) === null);

// ---- result, suite, who ----
check('exit 0 is pass, 1 is fail, a signal exit is killed, a timeout is timeout',
  L.resultOf(0) === 'pass' && L.resultOf(1) === 'fail' && L.resultOf(130) === 'killed' && L.resultOf(143) === 'killed' && L.resultOf(1, 'timeout') === 'timeout' && L.resultOf(0, 'timeout') === 'pass');
check('the suite is the script name without the folder or .mjs', L.suiteOf('/a/b/tests/jump.mjs') === 'jump' && L.suiteOf('tools/perf.mjs') === 'perf');
check('node -e has no script and so no suite', L.suiteOf(null) === null && L.suiteOf('') === null);
check('a strange file name cannot break the line', !/[\t\n\/ ]/.test(L.suiteOf('x/we ird\tname.mjs')));
check('who: LONGHAUL_WHO, then AGENTBOARD_NAME, then the checkout folder name',
  L.whoAmI({ LONGHAUL_WHO: 'a', AGENTBOARD_NAME: 'b' }, '/x/y/z') === 'a' && L.whoAmI({ AGENTBOARD_NAME: 'b' }, '/x/y/z') === 'b' && L.whoAmI({}, '/x/y/spacegame-T9') === 'spacegame-T9');
check('who never carries a path, a space or a tab', !/[\t\/ ]/.test(L.whoAmI({ LONGHAUL_WHO: '/opt/some one/dev\tx' })));

// ---- where the file lives ----
check('LONGHAUL_LEDGER=off writes nothing; a path is used as given', L.ledgerPath({ LONGHAUL_LEDGER: 'off' }) === null && L.ledgerPath({ LONGHAUL_LEDGER: '0' }) === null && L.ledgerPath({ LONGHAUL_LEDGER: '/q/r.tsv' }) === '/q/r.tsv');
const repo = join(work, 'repo'), wt = join(work, 'wt-one'), plain = join(work, 'plain');
mkdirSync(join(repo, '.git', 'worktrees', 'wt-one'), { recursive: true }); mkdirSync(wt); mkdirSync(plain);
writeFileSync(join(repo, '.git', 'worktrees', 'wt-one', 'commondir'), '../..\n');
writeFileSync(join(wt, '.git'), `gitdir: ${join(repo, '.git', 'worktrees', 'wt-one')}\n`);
check('a checkout\'s ledger is in its .git directory', L.gitCommonDir(repo) === join(repo, '.git') && L.ledgerPath({}, repo) === join(repo, '.git', L.FILE_NAME));
check('a worktree shares the ledger of the checkout it came from', L.gitCommonDir(wt) === join(repo, '.git') && L.ledgerPath({}, wt) === join(repo, '.git', L.FILE_NAME));
check('outside git it falls back to the OS temp folder', L.gitCommonDir(plain) === null && L.ledgerPath({}, plain) === join(tmpdir(), L.FILE_NAME));
const real = L.ledgerPath({}), rel = relative(ROOT, real);
check('the real ledger is outside this working tree or inside its .git directory (so never in git)', rel.startsWith('..') || rel.startsWith('.git/'), real);

// ---- appending and rotating ----
const f1 = fresh('append.tsv');
check('record appends a line (and makes the folder)', L.record(sample, join(work, 'deeper', 'one.tsv')) && existsSync(join(work, 'deeper', 'one.tsv')));
for (let i = 0; i < 3; i++) L.record({ ...sample, suite: 's' + i }, f1);
check('three records are three lines in order', readFileSync(f1, 'utf8').trim().split('\n').map(l => l.split('\t')[1]).join() === 's0,s1,s2');
const f2 = fresh('rotate.tsv');
for (let i = 0; i < 12; i++) L.record({ ...sample, suite: 'r' + i }, f2, 300); // 300 bytes: about four lines
check('past the size limit the file moves to .1 and a new one starts', existsSync(f2 + '.1') && existsSync(f2) && readFileSync(f2, 'utf8').length < 600);
const kept = L.readRuns(f2).map(r => r.suite);
check('the reader sees the old file and the new one, in order, and the newest run is last', kept.at(-1) === 'r11' && kept.join() === [...kept].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(), kept.join());
check('only two files are ever kept', !existsSync(f2 + '.2'));
check('a record that cannot be written is false, not an exception', L.record(sample, join(f1, 'inside-a-file', 'x.tsv')) === false);

// ---- real child processes: the hooks in lock.mjs and smoke.sh ----
const baseEnv = ledger => { const e = { ...process.env, LONGHAUL_LEDGER: ledger, LONGHAUL_LOCK_DIR: join(work, 'chrome.lock'), LONGHAUL_WHO: 'test-who' }; delete e.LONGHAUL_NO_LOCK; delete e.LONGHAUL_VIA; return e; };
const script = (name, body) => { const p = join(work, name); writeFileSync(p, body); return p; };
const run = (args, env) => spawnSync(process.execPath, args, { env, encoding: 'utf8', cwd: ROOT });
const lines = f => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')) : []);

const nodeOnly = script('nodeonly.mjs', 'await new Promise(r => setTimeout(r, 150));\nprocess.exitCode = Number(process.env.WANT || 0);\n');
let led = fresh('c1.tsv');
let r = run(['--import', './tests/ledger-on.mjs', nodeOnly], { ...baseEnv(led), LONGHAUL_VIA: 'smoke' });
let got = lines(led);
check('a node-only test run under smoke leaves one pass line', r.status === 0 && got.length === 1 && got[0][1] === 'nodeonly' && got[0][4] === 'pass' && got[0][5] === 'test-who' && got[0][6] === 'smoke', JSON.stringify(got));
check('its seconds are the run (about 0.15 s) and it waited for nothing', got[0] && Number(got[0][2]) >= 0.1 && Number(got[0][2]) < 5 && Number(got[0][3]) === 0);
r = run(['--import', './tests/ledger-on.mjs', nodeOnly], { ...baseEnv(led), WANT: '3' });
got = lines(led);
check('a failing test is recorded as fail and keeps its exit code; with no LONGHAUL_VIA the run is a hand run', r.status === 3 && got.length === 2 && got[1][4] === 'fail' && got[1][6] === 'hand', JSON.stringify(got[1]));
const crash = script('crash.mjs', 'throw new Error("boom");\n');
r = run(['--import', './tests/ledger-on.mjs', crash], baseEnv(led));
check('an uncaught error is a fail line too', r.status === 1 && lines(led).at(-1)[1] === 'crash' && lines(led).at(-1)[4] === 'fail');
r = run(['--import', './tests/ledger-on.mjs', '-e', '0'], baseEnv(led));
check('node -e (no script) writes no line', r.status === 0 && lines(led).length === 3);
const off = fresh('off.tsv');
r = run(['--import', './tests/ledger-on.mjs', nodeOnly], baseEnv('off'));
check('LONGHAUL_LEDGER=off writes nothing anywhere', r.status === 0 && !existsSync(off) && lines(led).length === 3);

const chromeish = script('chromeish.mjs', `import { acquire, release } from ${JSON.stringify(LOCKJS)};\nawait acquire({ log: () => {} }); await new Promise(r => setTimeout(r, 200)); release();\n`);
led = fresh('c2.tsv');
r = run([chromeish], baseEnv(led));
got = lines(led);
check('a test that takes the lock is recorded by lock.mjs alone, by hand, with no smoke hook', r.status === 0 && got.length === 1 && got[0][1] === 'chromeish' && got[0][4] === 'pass' && got[0][6] === 'hand', JSON.stringify(got));
check('a free lock is waited for 0.0 s (well under a second)', got[0] && Number(got[0][3]) < 1);
r = run(['--import', './tests/ledger-on.mjs', chromeish], baseEnv(led));
check('lock.mjs and the smoke hook together are still one line a run', r.status === 0 && lines(led).length === 2, JSON.stringify(lines(led)));
r = run([chromeish], { ...baseEnv(led), LONGHAUL_NO_LOCK: '1' });
check('with the lock switched off the run is still recorded (waited 0)', r.status === 0 && lines(led).length === 3 && Number(lines(led)[2][3]) === 0);

// a holder keeps the lock for 1.5 s; a second run has to wait for it, and the ledger says how long
const holder = script('holder.mjs', `import { acquire, release } from ${JSON.stringify(LOCKJS)};\nawait acquire({ log: () => {} }); console.log('GOT'); await new Promise(r => setTimeout(r, 1500)); release();\n`);
led = fresh('c3.tsv');
const hp = spawn(process.execPath, [holder], { env: baseEnv('off'), stdio: ['ignore', 'pipe', 'inherit'] });
const hpExit = new Promise(res => hp.on('exit', res)); // made now: it may have exited before the run below returns
await new Promise((res, rej) => { hp.stdout.on('data', d => { if (String(d).includes('GOT')) res(); }); hp.on('exit', () => rej(new Error('holder gave up'))); });
const t0 = Date.now();
r = run([chromeish], baseEnv(led));
got = lines(led);
check('a run that waits for the lock records the wait', r.status === 0 && got.length === 1 && Number(got[0][3]) >= 0.8, JSON.stringify(got));
check('the wait is part of its seconds, and no longer than them', got[0] && Number(got[0][2]) >= Number(got[0][3]) && Number(got[0][2]) <= (Date.now() - t0) / 1000 + 1);
await hpExit;

// a run that is killed while it holds the lock, and one that gives up waiting
const hold = script('hold.mjs', `import { acquire } from ${JSON.stringify(LOCKJS)};\nawait acquire({ log: () => {} }); console.log('GOT'); setInterval(() => {}, 1000);\n`);
led = fresh('c4.tsv');
const kp = spawn(process.execPath, [hold], { env: baseEnv(led), stdio: ['ignore', 'pipe', 'inherit'] });
const kpExit = new Promise(res => kp.on('exit', res));
await new Promise((res, rej) => { kp.stdout.on('data', d => { if (String(d).includes('GOT')) res(); }); kp.on('exit', () => rej(new Error('hold gave up'))); });
const waiter = script('giveup.mjs', `import { acquire } from ${JSON.stringify(LOCKJS)};\nawait acquire({ timeoutMs: 700, log: () => {} });\n`);
r = run([waiter], baseEnv(led));
check('a run that gives up waiting for the lock is a timeout line with its wait', r.status !== 0 && lines(led).length === 1 && lines(led)[0][1] === 'giveup' && lines(led)[0][4] === 'timeout' && Number(lines(led)[0][3]) >= 0.6, JSON.stringify(lines(led)));
kp.kill('SIGTERM');
await kpExit;
await new Promise(res => setTimeout(res, 100));
const kl = lines(led).find(l => l[1] === 'hold');
check('a run killed with SIGTERM is a killed line', kl && kl[4] === 'killed', JSON.stringify(lines(led)));

// the whole file: only counts and times, never a path, a user name or test output
const everything = [...lines(fresh('c1.tsv')), ...lines(fresh('c2.tsv')), ...lines(fresh('c3.tsv')), ...lines(led)];
check('every line is seven plain fields with no path in them', everything.length > 8 && everything.every(l => l.length === 7 && !l.some(f => /[\/\\]/.test(f)) && !l.join('').includes(homedir())));

// ---- the hooks are in the runner ----
const smoke = readFileSync(join(HERE, 'smoke.sh'), 'utf8'), lock = readFileSync(join(HERE, 'lock.mjs'), 'utf8');
check('smoke.sh marks its runs smoke and loads the ledger hook for every test', /^export LONGHAUL_VIA=smoke/m.test(smoke) && smoke.includes('run node --import ./tests/ledger-on.mjs "$file"'));
check('lock.mjs arms the ledger first thing in acquire and adds the wait whether it got the lock or not', /async function acquire[^\n]*\n\s*armLedger\(\)/.test(lock) && lock.includes('addWait(clock.mono() - t0)') && lock.includes("noteLedger('timeout')"));

// ---- the reader ----
const fx = fresh('reader.tsv');
const at = (day, hh) => `2026-11-${day}T${hh}:00:00Z`;
const rows = [
  [at('13', '12'), 'jump', 60, 20, 'pass', 'ann', 'smoke'], [at('13', '12'), 'scenes', 100, 0, 'pass', 'ann', 'smoke'], [at('13', '12'), 'hygiene', 2, 0, 'pass', 'bob', 'hand'],
  [at('14', '12'), 'jump', 90, 30, 'fail', 'bob', 'hand'], [at('14', '12'), 'scenes', 100, 0, 'pass', 'ann', 'smoke'],
  [at('15', '12'), 'jump', 30, 0, 'pass', 'bob', 'hand'],
];
writeFileSync(fx + '.1', rows.slice(0, 2).map(x => L.formatLine({ ts: x[0], suite: x[1], seconds: x[2], waited: x[3], result: x[4], who: x[5], via: x[6] })).join(''));
writeFileSync(fx, rows.slice(2).map(x => L.formatLine({ ts: x[0], suite: x[1], seconds: x[2], waited: x[3], result: x[4], who: x[5], via: x[6] })).join('') + 'not a ledger line\n');
const rd = (...a) => spawnSync(process.execPath, [join(ROOT, 'tools', 'test-ledger.mjs'), '--file', fx, ...a], { encoding: 'utf8' });
let out = rd();
check('the reader reads the old file and the current one and skips what is not a line', out.status === 0 && out.stdout.includes('6 test runs, 2026-11-1'), out.stdout.split('\n')[0]);
check('its headline totals: 382 s in all, 50 s waited, one not passed', out.stdout.includes('6m 22s in all, 50.0s of it waiting') && out.stdout.includes('1 not passed'), out.stdout.split('\n')[0]);
const suiteRow = name => (out.stdout.split('\n').find(l => l.startsWith(name + ' ')) || '').split(/\s{2,}/);
check('per suite: jump has 3 runs, 1 not passed, 3m 00s in all, 50.0s waited', (r = suiteRow('jump')).length > 4 && r[1] === '3' && r[2] === '1' && r[3] === '3m 00s' && r[4] === '50.0s', r.join('|'));
check('per suite: the busiest suite (most total seconds) is first', out.stdout.indexOf('\nscenes') < out.stdout.indexOf('\njump') && out.stdout.indexOf('\njump') < out.stdout.indexOf('\nhygiene'));
check('per day: three days, with the smoke and hand runs counted apart', /2026-11-13 +3 +[^\n]* 2 +1\n/.test(out.stdout) && /2026-11-14 +2 +1 [^\n]* 1 +1\n/.test(out.stdout) && /2026-11-15 +1 [^\n]* 0 +1\n/.test(out.stdout), out.stdout);
out = rd('--since', '2026-11-14');
check('--since leaves out the earlier days', out.stdout.includes('3 test runs') && !out.stdout.includes('2026-11-13 '));
out = rd('--who', 'bob', '--via', 'hand');
check('--who and --via filter', out.stdout.includes('3 test runs') && !out.stdout.includes('scenes'));
out = rd('--by', 'who');
check('--by who totals per runner', /\nann +3 /.test(out.stdout) && /\nbob +3 /.test(out.stdout));
out = rd('--by', 'nonsense');
check('a bad --by is an error, not a table', out.status === 2 && out.stderr.includes('--by'));
out = spawnSync(process.execPath, [join(ROOT, 'tools', 'test-ledger.mjs'), '--file', join(work, 'nope.tsv')], { encoding: 'utf8' });
check('no ledger yet is a plain sentence and exit 0', out.status === 0 && out.stdout.includes('no test runs recorded yet'));
check('span prints seconds, minutes and hours', R.span(4) === '4.0s' && R.span(75) === '1m 15s' && R.span(59.97) === '1m 00s' && R.span(3700) === '1h 01m' && R.span(0) === '0.0s');

rmSync(work, { recursive: true, force: true });
console.log(failed ? `\nLEDGER FAIL (${failed} of ${n} checks)` : `\nLEDGER PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
