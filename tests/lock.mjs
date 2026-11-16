// not in the smoke: the one-Chrome-at-a-time lock the tests import (tests/locktest.mjs checks it)
// One headless Chrome at a time, across every worktree on this Mac (card space-game-test-load-proof), in the order runs arrived
// (card space-game-lock-two-at-a-time).
// With seven agents each running Chrome the load average reaches 35-50 and DevTools calls time out. cdp.mjs takes this lock in
// launch() and gives it back in close(), so a second run waits its turn instead of piling on.
//
// The lock: a lock directory in the OS temp dir (mkdir is atomic). Inside it, an "owner" file names the process that holds it, and the
// holder touches that file every 15 s (a heartbeat). A lock is stale, and taken over, when its owner process is gone, or its
// heartbeat is more than 2 minutes old, or the directory has no owner file for 10 s (a crash between mkdir and the write).
// The holder gives it back on exit, Ctrl+C and kill. In the same process it is re-entrant (a count).
//
// The queue: a run that finds the lock taken writes a ticket (a small file named by arrival time and pid) into <lock>.queue and only
// the OLDEST ticket tries for the lock, so runs get it in the order they came. Before this, every waiter polled at random and one run
// waited 45 minutes and timed out while later runs passed it. A waiter refreshes its ticket each time round its loop; a ticket whose
// process is gone, or that has not been refreshed for 15 s, is dropped by the others, so a dead or stuck waiter never blocks the line.
//
// Slots: LONGHAUL_LOCK_SLOTS=2 lets a second run in at once, but only while the one-minute load average is under LONGHAUL_LOCK_MAXLOAD
// (default 12, a 10-core Mac). Slot 0 is the lock directory itself, so an older lock.mjs (no queue, no slots) still excludes this one
// from slot 0; slot k is <lock>.<k>. The default is one slot: nothing changes for a run that does not ask.
//
//   import { acquire, release, cleanupOrphans, queueStatus } from './lock.mjs'
//   node tests/lock.mjs status   who holds a slot and who waits, in order ("idle" when nobody does)
//   env LONGHAUL_LOCK_DIR        another lock directory (tests/locktest.mjs uses it)
//   env LONGHAUL_NO_LOCK=1       skip the lock (one run on a quiet machine)
//   env LONGHAUL_LOCK_SLOTS      how many runs at once (default 1)
//   env LONGHAUL_LOCK_MAXLOAD    a slot after the first is only given while the load is under this (default 12)
//   env LONGHAUL_BEAT_MS, LONGHAUL_TICKET_STALE_MS, LONGHAUL_FAKE_LOAD   tests only
// The run ledger (card retro-test-run-ledger): the first acquire() in a process arms tests/ledger.mjs, which appends one line when the process ends
// (suite, seconds, seconds waited here, result, who). node tools/test-ledger.mjs reads it.
import { mkdirSync, rmSync, readFileSync, writeFileSync, utimesSync, statSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir, loadavg } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { arm as armLedger, addWait, note as noteLedger } from './ledger.mjs';

export const STALE_MS = 120000, NO_OWNER_MS = 10000;
// Two clocks. `wall` is what file times and the "since" fields use; `mono` does not tick while the Mac sleeps. A wait is timed on `mono`, so an hour asleep is not an
// hour waited (a run lost a 2700 s wait that way, card tests-flake-list). When a waiting run sees the two clocks part (it slept), no lock or ticket is judged stale
// from its file time for a while: every heartbeat looks hours old on waking, until its holder's next beat, and a waiter must not take a live run's lock then.
// tests/locktest.mjs swaps the clocks to play a sleep.
export const clock = { wall: () => Date.now(), mono: () => performance.now() };
const SLEEP_JUMP_MS = 5000;
let graceUntil = 0;
const trusted = () => clock.mono() >= graceUntil;
const beatMs = () => Number(process.env.LONGHAUL_BEAT_MS) || 15000; // env: tests/locktest.mjs speeds the heartbeat up
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const lockDir = () => process.env.LONGHAUL_LOCK_DIR || join(tmpdir(), 'longhaul-chrome.lock');

let held = 0, beat = null, hooked = false, mySlot = 0, myTicket = null;

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } // EPERM: it exists but is not ours
}
const readOwner = dir => { try { return JSON.parse(readFileSync(join(dir, 'owner'), 'utf8')); } catch (e) { return null; } };
const ageOf = path => { try { return clock.wall() - statSync(path).mtimeMs; } catch (e) { return Infinity; } };

// why a lock can be taken over, or null when it is held by a live run
export function staleReason(dir) {
  const o = readOwner(dir);
  if (!o) return trusted() && ageOf(dir) > NO_OWNER_MS ? 'it has no owner file' : null;
  if (!alive(o.pid)) return `its owner (pid ${o.pid}) is gone`;
  if (trusted() && ageOf(join(dir, 'owner')) > STALE_MS) return `its owner (pid ${o.pid}) has not checked in for ${Math.round(ageOf(join(dir, 'owner')) / 1000)} s`;
  return null;
}

// ---- slots and the queue ----
export const slots = () => Math.max(1, parseInt(process.env.LONGHAUL_LOCK_SLOTS, 10) || 1);
const maxLoad = () => (process.env.LONGHAUL_LOCK_MAXLOAD !== undefined && process.env.LONGHAUL_LOCK_MAXLOAD !== '' ? Number(process.env.LONGHAUL_LOCK_MAXLOAD) : 12);
const load1 = () => (process.env.LONGHAUL_FAKE_LOAD !== undefined && process.env.LONGHAUL_FAKE_LOAD !== '' ? Number(process.env.LONGHAUL_FAKE_LOAD) : loadavg()[0]);
const ticketStaleMs = () => Number(process.env.LONGHAUL_TICKET_STALE_MS) || 15000;
export const slotDir = k => (k === 0 ? lockDir() : lockDir() + '.' + k); // slot 0 is the old lock directory: an older lock.mjs still excludes this one
export const queueDir = () => lockDir() + '.queue';

function makeTicket() {
  mkdirSync(queueDir(), { recursive: true });
  const name = `${String(Date.now()).padStart(15, '0')}-${String(process.pid).padStart(7, '0')}-${Math.random().toString(36).slice(2, 6)}`;
  writeFileSync(join(queueDir(), name), JSON.stringify({ pid: process.pid, cwd: process.cwd(), cmd: process.argv.slice(1).join(' '), since: Date.now() }));
  return name;
}
const dropTicket = name => { if (name) try { rmSync(join(queueDir(), name), { force: true }); } catch (e) { /* gone already */ } };
// the tickets in arrival order; a ticket whose process is gone, or that has not been refreshed lately, is dropped first
function liveTickets() {
  let names = [];
  try { names = readdirSync(queueDir()).sort(); } catch (e) { return []; }
  const out = [];
  for (const name of names) {
    const path = join(queueDir(), name); let o = null;
    try { o = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { o = null; }
    if (!o && ageOf(path) < NO_OWNER_MS) { out.push({ name, pid: 0, cmd: '?', cwd: '?', since: Date.now() }); continue; } // just made, not written yet
    if (!o || !alive(o.pid) || (trusted() && ageOf(path) > ticketStaleMs())) { try { rmSync(path, { force: true }); } catch (e) { /* another waiter did */ } continue; }
    out.push({ name, ...o });
  }
  return out;
}
const touchTicket = name => { try { const t = new Date(); utimesSync(join(queueDir(), name), t, t); } catch (e) { /* dropped: the loop makes a new one */ } };

// try for the slot directory k once: true when it is ours now. A stale lock found there is taken over (and the caller tries again).
function takeSlot(k, log) {
  const dir = slotDir(k);
  try {
    mkdirSync(dir);
    writeFileSync(join(dir, 'owner'), JSON.stringify({ pid: process.pid, cwd: process.cwd(), cmd: process.argv.slice(1).join(' '), since: Date.now() }));
    return 'taken';
  } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const was = readOwner(dir), why = staleReason(dir);
  if (why) {
    // take it over only if it is still the owner we judged stale (another waiter may have done it first and taken the lock)
    if (JSON.stringify(readOwner(dir)) === JSON.stringify(was) && staleReason(dir)) { log(`  (test lock: taking over a stale lock, ${why})`); rmSync(dir, { recursive: true, force: true }); return 'stale'; }
  }
  return 'busy';
}

// who holds a slot and who waits, in order. idle: nobody does.
export function queueStatus() {
  const holders = [];
  for (let k = 0; k < Math.max(slots(), 4); k++) {
    const o = readOwner(slotDir(k));
    if (o && !staleReason(slotDir(k))) holders.push({ slot: k, pid: o.pid, cmd: o.cmd, cwd: o.cwd, runningS: Math.round((Date.now() - (o.since || Date.now())) / 1000) });
  }
  const waiting = liveTickets().map((t, i) => ({ place: i + 1, pid: t.pid, cmd: t.cmd, cwd: t.cwd, waitedS: Math.round((Date.now() - (t.since || Date.now())) / 1000) }));
  return { holders, waiting, idle: !holders.length && !waiting.length };
}

function giveBack() {
  const dir = slotDir(mySlot), o = readOwner(dir);
  if (o && o.pid === process.pid) rmSync(dir, { recursive: true, force: true });
}

export async function acquire({ timeoutMs = 45 * 60000, log = console.log } = {}) {
  armLedger(); // the run ledger (tests/ledger.mjs): this process now writes one line when it ends, with the seconds spent waiting here
  if (process.env.LONGHAUL_NO_LOCK === '1') return;
  if (held) { held++; return; }
  const t0 = clock.mono();
  let lastNote = -Infinity, got = -1, lastWall = clock.wall(), lastMono = t0;
  myTicket = null;
  try {
    myTicket = makeTicket();
    for (;;) {
      const w = clock.wall(), m = clock.mono();
      if ((w - lastWall) - (m - lastMono) > SLEEP_JUMP_MS) { // the clocks parted: this Mac slept (or the clock was set)
        graceUntil = m + 2 * beatMs() + 5000;
        log('  (test lock: the clock jumped, the Mac probably slept: not taking over any lock for a little while)');
      }
      lastWall = w; lastMono = m;
      const line = liveTickets();
      let at = line.findIndex(t => t.name === myTicket);
      if (at < 0) { myTicket = makeTicket(); at = liveTickets().findIndex(t => t.name === myTicket); } // our ticket was dropped (a long stall): back of the line
      if (at === 0) { // the head of the line is the only one that tries
        for (let k = 0; k < slots(); k++) {
          if (k > 0 && load1() >= maxLoad()) break; // a second run only while the Mac is quiet
          let r = takeSlot(k, log);
          if (r === 'stale') r = takeSlot(k, log);
          if (r === 'taken') { got = k; break; }
        }
        if (got >= 0) break;
      }
      touchTicket(myTicket);
      if (clock.mono() - t0 > timeoutMs) {
        const o = readOwner(slotDir(0)) || {};
        noteLedger('timeout');
        throw new Error(`timed out after ${Math.round(timeoutMs / 1000)} s waiting for the test lock held by pid ${o.pid} (${o.cmd || '?'} in ${o.cwd || '?'}); delete ${slotDir(0)} if that run is dead`);
      }
      if (clock.mono() - lastNote > 30000) {
        const o = readOwner(slotDir(0)) || {};
        log(`  (test lock: waiting for another Long Haul test run: pid ${o.pid}, ${o.cmd || '?'}, running ${Math.round((Date.now() - (o.since || Date.now())) / 1000)} s; you are ${at < 0 ? '?' : at + 1} in line)`);
        lastNote = clock.mono();
      }
      await sleep(250 + Math.random() * 200);
    }
  } finally { dropTicket(myTicket); myTicket = null; addWait(clock.mono() - t0); } // got it, timed out or failed: the ticket is not needed; the wait goes in the ledger
  mySlot = got; held = 1;
  const dir = slotDir(mySlot);
  beat = setInterval(() => { try { const t = new Date(); utimesSync(join(dir, 'owner'), t, t); } catch (e) { /* lock was removed: nothing to keep alive */ } }, beatMs());
  beat.unref();
  if (!hooked) { // give it back however this process ends
    hooked = true;
    process.on('exit', () => { if (held) giveBack(); dropTicket(myTicket); });
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (held) giveBack(); dropTicket(myTicket); process.exit(128 + ({ SIGINT: 2, SIGTERM: 15, SIGHUP: 1 })[sig]); });
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

// node tests/lock.mjs status: who is running Chrome tests and who is waiting
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === 'status') {
  const q = queueStatus();
  if (q.idle) console.log('test lock: idle (nobody holds it, nobody waits)');
  else {
    q.holders.forEach(h => console.log(`holds slot ${h.slot}: pid ${h.pid} for ${h.runningS} s  ${h.cmd}  (${h.cwd})`));
    q.waiting.forEach(w => console.log(`waiting #${w.place}: pid ${w.pid} for ${w.waitedS} s  ${w.cmd}  (${w.cwd})`));
  }
}
