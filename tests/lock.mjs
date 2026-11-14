// One headless Chrome at a time, across every worktree on this Mac (card space-game-test-load-proof).
// With seven agents each running Chrome the load average reaches 35-50 and DevTools calls time out. cdp.mjs takes this lock in
// launch() and gives it back in close(), so a second run waits its turn instead of piling on.
//
// How: a lock directory in the OS temp dir (mkdir is atomic). Inside it, an "owner" file names the process that holds it, and the
// holder touches that file every 15 s (a heartbeat). A lock is stale, and taken over, when its owner process is gone, or its
// heartbeat is more than 2 minutes old, or the directory has no owner file for 10 s (a crash between mkdir and the write).
// The holder gives it back on exit, Ctrl+C and kill. In the same process it is re-entrant (a count).
//
//   import { acquire, release, cleanupOrphans } from './lock.mjs'
//   env LONGHAUL_LOCK_DIR   another lock directory (tests/locktest.mjs uses it)
//   env LONGHAUL_NO_LOCK=1  skip the lock (one run on a quiet machine)
//   env LONGHAUL_BEAT_MS    heartbeat period (tests only)
import { mkdirSync, rmSync, readFileSync, writeFileSync, utimesSync, statSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export const STALE_MS = 120000, NO_OWNER_MS = 10000;
const beatMs = () => Number(process.env.LONGHAUL_BEAT_MS) || 15000; // env: tests/locktest.mjs speeds the heartbeat up
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const lockDir = () => process.env.LONGHAUL_LOCK_DIR || join(tmpdir(), 'longhaul-chrome.lock');

let held = 0, beat = null, hooked = false;

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } // EPERM: it exists but is not ours
}
const readOwner = dir => { try { return JSON.parse(readFileSync(join(dir, 'owner'), 'utf8')); } catch (e) { return null; } };
const ageOf = path => { try { return Date.now() - statSync(path).mtimeMs; } catch (e) { return Infinity; } };

// why a lock can be taken over, or null when it is held by a live run
export function staleReason(dir) {
  const o = readOwner(dir);
  if (!o) return ageOf(dir) > NO_OWNER_MS ? 'it has no owner file' : null;
  if (!alive(o.pid)) return `its owner (pid ${o.pid}) is gone`;
  if (ageOf(join(dir, 'owner')) > STALE_MS) return `its owner (pid ${o.pid}) has not checked in for ${Math.round(ageOf(join(dir, 'owner')) / 1000)} s`;
  return null;
}

function giveBack() {
  const dir = lockDir(), o = readOwner(dir);
  if (o && o.pid === process.pid) rmSync(dir, { recursive: true, force: true });
}

export async function acquire({ timeoutMs = 45 * 60000, log = console.log } = {}) {
  if (process.env.LONGHAUL_NO_LOCK === '1') return;
  if (held) { held++; return; }
  const dir = lockDir(), t0 = Date.now();
  let lastNote = 0;
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(join(dir, 'owner'), JSON.stringify({ pid: process.pid, cwd: process.cwd(), cmd: process.argv.slice(1).join(' '), since: Date.now() }));
      break;
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const was = readOwner(dir), why = staleReason(dir);
    if (why) {
      // take it over only if it is still the owner we judged stale (another waiter may have done it first and taken the lock)
      if (JSON.stringify(readOwner(dir)) === JSON.stringify(was) && staleReason(dir)) { log(`  (test lock: taking over a stale lock, ${why})`); rmSync(dir, { recursive: true, force: true }); }
      continue;
    }
    if (Date.now() - t0 > timeoutMs) {
      const o = readOwner(dir) || {};
      throw new Error(`timed out after ${Math.round(timeoutMs / 1000)} s waiting for the test lock held by pid ${o.pid} (${o.cmd || '?'} in ${o.cwd || '?'}); delete ${dir} if that run is dead`);
    }
    if (Date.now() - lastNote > 30000) {
      const o = readOwner(dir) || {};
      log(`  (test lock: waiting for another Long Haul test run: pid ${o.pid}, ${o.cmd || '?'}, running ${Math.round((Date.now() - (o.since || Date.now())) / 1000)} s)`);
      lastNote = Date.now();
    }
    await sleep(400 + Math.random() * 400);
  }
  held = 1;
  beat = setInterval(() => { try { const t = new Date(); utimesSync(join(dir, 'owner'), t, t); } catch (e) { /* lock was removed: nothing to keep alive */ } }, beatMs());
  beat.unref();
  if (!hooked) { // give it back however this process ends
    hooked = true;
    process.on('exit', () => { if (held) giveBack(); });
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (held) giveBack(); process.exit(128 + ({ SIGINT: 2, SIGTERM: 15, SIGHUP: 1 })[sig]); });
  }
}

export function release() {
  if (process.env.LONGHAUL_NO_LOCK === '1' || !held) return;
  if (--held > 0) return;
  clearInterval(beat); beat = null;
  giveBack();
}

// ---------- removing a throwaway Chrome profile (card space-game-cdp-cleanup-race) ----------
// Chrome's helper processes (GPU, network, renderer) can still be writing into the profile for a moment after the main process has
// exited, so a plain rmSync fails with ENOTEMPTY and crashed a test's close(). stopProfileProcesses ends whatever still has THIS
// profile open (matched on its exact --user-data-dir, never another run's); removeDir tries again for a few seconds and never
// throws: a folder that stays busy is left for the next run's cleanupOrphans, with a note.
const BUSY = ['ENOTEMPTY', 'EBUSY', 'EPERM', 'EACCES', 'EMFILE', 'ENFILE'];
export function stopProfileProcesses(path) {
  const re = '--user-data-dir=' + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$)'; // the whole argument, so longhaul-1-abc never matches longhaul-1-abcdef
  try { execFileSync('pkill', ['-KILL', '-f', '--', re], { stdio: 'ignore' }); return true; } catch (e) { return false; } // exit status 1: nothing matched
}
export async function removeDir(path, { tries = 30, delayMs = 250, rm = rmSync, log = console.log } = {}) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try { rm(path, { recursive: true, force: true }); return true; } catch (e) {
      last = e;
      if (!BUSY.includes(e && e.code)) break; // not a race: waiting will not help
      if (i === 1) stopProfileProcesses(path); // still busy after two tries: something still has it open
      await sleep(delayMs);
    }
  }
  log(`  (note: could not remove ${path}: ${(last && last.code) || last}; the next test run cleans it up)`);
  return false;
}

// Chrome profiles are named longhaul-<driver pid>-<random> (cdp.mjs). When the driver is gone the profile is an orphan: kill any
// Chrome still using it and delete it. A profile whose driver is alive is never touched. Returns what it did.
export function cleanupOrphans({ base = tmpdir(), log = () => {} } = {}) {
  const done = { killed: [], removed: [] };
  let names = [];
  try { names = readdirSync(base).filter(n => /^longhaul-\d+-/.test(n)); } catch (e) { return done; }
  const dead = names.filter(n => !alive(parseInt(/^longhaul-(\d+)-/.exec(n)[1], 10)));
  if (!dead.length) return done;
  let table = '';
  try { table = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (e) { /* no ps: delete the folders only */ }
  const rows = table.split('\n').map(l => /^\s*(\d+)\s+(.*)$/.exec(l)).filter(Boolean).map(m => ({ pid: parseInt(m[1], 10), cmd: m[2] }));
  for (const n of dead) {
    const path = join(base, n);
    for (const r of rows) {
      if (r.pid !== process.pid && r.cmd.includes('--user-data-dir=' + path)) { try { process.kill(r.pid, 'SIGKILL'); done.killed.push(r.pid); } catch (e) { /* already gone */ } }
    }
    try { rmSync(path, { recursive: true, force: true }); done.removed.push(n); log(`  (cleaned up the orphan Chrome profile ${n})`); } catch (e) { /* in use: next time */ }
  }
  return done;
}
