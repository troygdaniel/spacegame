// not in the smoke: the test-run ledger library lock.mjs and tests/ledger-on.mjs import (tests/ledgertest.mjs checks it)
// One line per test run, so what testing costs can be read later (card retro-test-run-ledger, retro rec 9). Counts and times only, never test output.
//
// A "run" is one test process: `node tests/jump.mjs`, by hand or as a step of `bash tests/smoke.sh`. When the process ends it appends ONE line:
//
//   2026-11-15T19:03:22Z <TAB> jump <TAB> 41.3 <TAB> 12.0 <TAB> pass <TAB> spacegame-TaskMaster-2 <TAB> smoke
//   ended (UTC)               suite       seconds    waited     result    who                          via
//
//   suite    the script's file name without .mjs (tests/jump.mjs -> jump); no path, no arguments
//   seconds  the whole process, how long the process ran, the wait for the Chrome lock included (process.uptime(): it does not tick while the Mac sleeps)
//   waited   of those, the seconds spent waiting for the one-Chrome-at-a-time lock (tests/lock.mjs); 0 for a test that takes no lock
//   result   pass (exit 0), fail, killed (Ctrl+C or kill, caught by lock.mjs) or timeout (gave up waiting for the lock)
//   who      $LONGHAUL_WHO, else $AGENTBOARD_NAME, else this checkout's folder name (spacegame-TaskMaster-2): never a user name or a full path
//   via      smoke (a step of tests/smoke.sh, which sets LONGHAUL_VIA=smoke) or hand
//
// Who writes it: lock.mjs arms it the first time a test asks for the lock (so every Chrome test is recorded however it was started), and
// tests/ledger-on.mjs, which smoke.sh loads with `node --import`, arms it for every test it runs (so the node-only ones are too). Arming twice
// is the same as once: one line a process. A node-only test started by hand is not recorded (it takes a second and no lock).
//
// Where: ONE file for every worktree on this Mac, in the repository's shared git directory (<repo>/.git/longhaul-test-runs.tsv): it is never in
// git, and it survives a worktree being deleted. Outside a git checkout it falls back to the OS temp folder. Rotation: past 256 KB (about 3,500
// runs) the file moves to <file>.1 (replacing the older one) and a new one starts, so at most two files, about 500 KB.
//
//   node tools/test-ledger.mjs           totals per suite and per day
//   env LONGHAUL_LEDGER=<path>           another file (tests/ledgertest.mjs uses it); LONGHAUL_LEDGER=off writes nothing
//   env LONGHAUL_LEDGER_MAX_BYTES        the rotation size (tests only)
//   env LONGHAUL_WHO, LONGHAUL_VIA       override who and via
//
// Writing the ledger must never change a test: every failure here is swallowed, and nothing here sets an exit code.
import { appendFileSync, statSync, renameSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FILE_NAME = 'longhaul-test-runs.tsv';
export const MAX_BYTES = 256 * 1024;
export const RESULTS = ['pass', 'fail', 'killed', 'timeout'];

const clean = (s, max = 40) => String(s).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, max);

// the git directory every worktree of this checkout shares (<repo>/.git), or null outside git. Read from the files, no git process started.
export function gitCommonDir(root = ROOT) {
  try {
    const dot = join(root, '.git');
    if (statSync(dot).isDirectory()) return dot;
    const m = /^gitdir:\s*(.+)$/m.exec(readFileSync(dot, 'utf8')); // a worktree: .git is a file naming <repo>/.git/worktrees/<name>
    if (!m) return null;
    const gd = resolve(root, m[1].trim());
    try { return resolve(gd, readFileSync(join(gd, 'commondir'), 'utf8').trim()); } catch (e) { return gd; }
  } catch (e) { return null; }
}

// the ledger file, or null when it is switched off
export function ledgerPath(env = process.env, root = ROOT) {
  const v = env.LONGHAUL_LEDGER;
  if (v === 'off' || v === '0') return null;
  if (v) return resolve(v);
  return join(gitCommonDir(root) || tmpdir(), FILE_NAME);
}

export const whoAmI = (env = process.env, root = ROOT) => clean(env.LONGHAUL_WHO || env.AGENTBOARD_NAME || basename(root));
export const suiteOf = (argv1 = process.argv[1]) => (argv1 ? clean(basename(argv1).replace(/\.[cm]?js$/, ''), 60) : null); // `node -e` has no script: no suite, no line

export function resultOf(code, noted) {
  if (code === 0) return 'pass';
  if (noted === 'timeout') return 'timeout';
  return code >= 128 ? 'killed' : 'fail'; // lock.mjs ends a Ctrl+C / kill with 128 + the signal number
}

export function formatLine({ ts, suite, seconds, waited, result, who, via }) {
  return [ts, suite, seconds.toFixed(1), waited.toFixed(1), result, who, via].join('\t') + '\n';
}

// one line back to an object; null for anything that is not a ledger line (a blank line, a half-written one)
export function parseLine(line) {
  const f = line.replace(/\r?\n$/, '').split('\t');
  if (f.length < 7) return null;
  const at = Date.parse(f[0]), seconds = Number(f[2]), waited = Number(f[3]);
  if (!Number.isFinite(at) || !Number.isFinite(seconds) || !Number.isFinite(waited) || !f[1] || !RESULTS.includes(f[4])) return null;
  return { ts: f[0], at, suite: f[1], seconds, waited, result: f[4], who: f[5], via: f[6] };
}

// append one line; past the size limit the file first moves to <file>.1 (the check is made twice so two runs ending together rotate once)
export function record(entry, file, maxBytes = Number(process.env.LONGHAUL_LEDGER_MAX_BYTES) || MAX_BYTES) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const big = () => { try { return statSync(file).size >= maxBytes; } catch (e) { return false; } };
    if (big() && big()) { try { renameSync(file, file + '.1'); } catch (e) { /* another run did */ } }
    appendFileSync(file, formatLine(entry)); // one small write in append mode: lines from runs ending together do not mix
    return true;
  } catch (e) { return false; }
}

// every run in the ledger (the older file first, then the current one), as objects
export function readRuns(file) {
  const runs = [];
  for (const f of [file + '.1', file]) {
    let text = '';
    try { text = readFileSync(f, 'utf8'); } catch (e) { continue; }
    for (const line of text.split('\n')) { const r = line ? parseLine(line) : null; if (r) runs.push(r); }
  }
  return runs;
}

// ---- the writer: one line when this process ends ----
let armed = false, waitedMs = 0, noted = null, target = null;
export const addWait = ms => { if (Number.isFinite(ms) && ms > 0) waitedMs += ms; };
export const note = what => { noted = what; };

export function arm() {
  if (armed) return false;
  armed = true;
  try { target = ledgerPath(); } catch (e) { target = null; } // read now: a test may switch the ledger off for the children it starts
  const suite = suiteOf();
  if (!target || !suite) return false;
  const via = clean(process.env.LONGHAUL_VIA || 'hand', 12).toLowerCase();
  process.on('exit', code => {
    try {
      record({
        ts: new Date().toISOString().slice(0, 19) + 'Z', suite,
        seconds: process.uptime(), waited: Math.min(waitedMs / 1000, process.uptime()),
        result: resultOf(code, noted), who: whoAmI(), via,
      }, target);
    } catch (e) { /* the ledger never breaks a test */ }
  });
  return true;
}

// for tests/ledgertest.mjs: start over as if this process were new
export function _reset() { armed = false; waitedMs = 0; noted = null; target = null; }
