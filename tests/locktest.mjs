// smoke: the one-Chrome-at-a-time test lock and the orphan profile cleanup (no browser)
// Tests for tests/lock.mjs: the one-Chrome-at-a-time lock and the orphan profile cleanup. No Chrome is started: other processes
// stand in for lock holders and for Chrome. Uses its own lock directory, never the real one. Run: node tests/locktest.mjs
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, utimesSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url)), LOCKJS = pathToFileURL(join(HERE, 'lock.mjs')).href;
const work = mkdtempSync(join(tmpdir(), 'lhtest-')); // not named longhaul-*: the cleanup test must not touch real profiles
process.env.LONGHAUL_LOCK_DIR = join(work, 'chrome.lock');
delete process.env.LONGHAUL_NO_LOCK;
const L = await import(LOCKJS);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const quiet = { log: () => {} };
const dir = () => process.env.LONGHAUL_LOCK_DIR;
const owner = () => { try { return JSON.parse(readFileSync(join(dir(), 'owner'), 'utf8')); } catch (e) { return null; } };
const ago = (path, ms) => { const t = new Date(Date.now() - ms); utimesSync(path, t, t); };

// a child process that takes the lock the way a test run would; "mode" is what it does next
function holder(mode, extraEnv = {}) {
  const code = `import { acquire } from ${JSON.stringify(LOCKJS)}; await acquire({ log: () => {} }); console.log('GOT'); ` +
    (mode === 'hold' ? 'setInterval(() => {}, 1000);' : mode === 'brief' ? 'await new Promise(r => setTimeout(r, 1200));' : '');
  const p = spawn(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, ...extraEnv }, stdio: ['ignore', 'pipe', 'inherit'] });
  const got = new Promise((res, rej) => { p.stdout.on('data', d => { if (String(d).includes('GOT')) res(); }); p.on('exit', () => rej(new Error('holder exited before it got the lock'))); });
  const exited = new Promise(r => p.on('exit', (c, s) => r({ code: c, signal: s })));
  return { p, got, exited };
}
// a child that waits its turn, says so ("GOT <label>"), holds for 150 ms and gives the lock back (a short test run)
function runner(label, extraEnv = {}) {
  const code = `import { acquire, release } from ${JSON.stringify(LOCKJS)}; await acquire({ log: () => {} }); console.log('GOT ${label}'); await new Promise(r => setTimeout(r, 150)); release();`;
  const p = spawn(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, ...extraEnv }, stdio: ['ignore', 'pipe', 'inherit'] });
  const got = new Promise(res => { p.stdout.on('data', d => { if (String(d).includes('GOT')) res(true); }); p.on('exit', () => res(false)); });
  const exited = new Promise(r => p.on('exit', (c, s) => r({ code: c, signal: s })));
  return { p, got, exited, label };
}
const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(40); } return false; };
const within = (promise, ms) => Promise.race([promise.then(() => true, () => false), sleep(ms).then(() => false)]);
const tickets = () => L.queueStatus().waiting.length;
const deadPid = async () => { const p = spawn(process.execPath, ['-e', '0']); await new Promise(r => p.on('exit', r)); return p.pid; };

console.log('basic');
{
  await L.acquire(quiet);
  check('acquire makes the lock directory and names this process', existsSync(dir()) && owner() && owner().pid === process.pid);
  await L.acquire(quiet);
  L.release();
  check('it is re-entrant: one release of two keeps it', existsSync(dir()));
  L.release();
  check('the last release removes it', !existsSync(dir()));
  L.release();
  check('a release with nothing held does nothing', !existsSync(dir()));
  process.env.LONGHAUL_NO_LOCK = '1';
  await L.acquire(quiet);
  check('LONGHAUL_NO_LOCK=1 skips the lock', !existsSync(dir()));
  delete process.env.LONGHAUL_NO_LOCK;
}

console.log('waiting for a live holder');
{
  const h = holder('brief'); await h.got;
  check('a child holds it', owner() && owner().pid === h.p.pid);
  const t0 = Date.now();
  await L.acquire(quiet);
  const waited = Date.now() - t0;
  check('we wait until it is given back (it holds for 1.2 s)', waited >= 700 && waited < 6000, waited + ' ms');
  check('and then the lock is ours', owner() && owner().pid === process.pid);
  L.release();
  await h.exited;
}
{
  const h = holder('hold'); await h.got;
  let err = null; const t0 = Date.now();
  try { await L.acquire({ ...quiet, timeoutMs: 900 }); } catch (e) { err = e; }
  check('with a live holder and a short timeout, acquire fails and names the holder', err && /timed out/.test(err.message) && err.message.includes(String(h.p.pid)) && Date.now() - t0 < 5000, err && err.message);
  check('a failed acquire does not hold anything', owner() && owner().pid === h.p.pid);
  h.p.kill('SIGTERM'); const ex = await h.exited;
  await sleep(100);
  check('a holder that is stopped with SIGTERM gives the lock back', !existsSync(dir()), JSON.stringify(ex));
}

console.log('stale locks');
{
  const h = holder('hold'); await h.got;
  h.p.kill('SIGKILL'); await h.exited; // no chance to clean up
  check('a killed holder leaves its lock behind', existsSync(dir()));
  const t0 = Date.now(); await L.acquire(quiet);
  check('a lock whose owner is gone is taken over', owner().pid === process.pid && Date.now() - t0 < 5000, (Date.now() - t0) + ' ms');
  L.release();
}
{
  const live = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
  mkdirSync(dir()); writeFileSync(join(dir(), 'owner'), JSON.stringify({ pid: live.pid, cmd: 'fake', cwd: '/', since: Date.now() }));
  ago(join(dir(), 'owner'), 5 * 60000);
  const t0 = Date.now(); await L.acquire(quiet);
  check('a live owner that has not checked in for 5 minutes is taken over', owner().pid === process.pid && Date.now() - t0 < 5000);
  L.release();
  mkdirSync(dir()); writeFileSync(join(dir(), 'owner'), JSON.stringify({ pid: live.pid, cmd: 'fake', cwd: '/', since: Date.now() }));
  let err = null; try { await L.acquire({ ...quiet, timeoutMs: 700 }); } catch (e) { err = e; }
  check('a live owner with a fresh heartbeat keeps its lock', err && /timed out/.test(err.message) && owner().pid === live.pid);
  rmSync(dir(), { recursive: true, force: true }); live.kill('SIGKILL');
}
{
  mkdirSync(dir()); ago(dir(), 60000);
  const t0 = Date.now(); await L.acquire(quiet);
  check('a lock directory with no owner file for a minute is taken over', owner() && owner().pid === process.pid && Date.now() - t0 < 5000);
  L.release();
  mkdirSync(dir());
  let err = null; try { await L.acquire({ ...quiet, timeoutMs: 700 }); } catch (e) { err = e; }
  check('but one that was just made is left alone (its maker is about to write the owner file)', err && /timed out/.test(err.message));
  rmSync(dir(), { recursive: true, force: true });
}

console.log('heartbeat');
{
  process.env.LONGHAUL_BEAT_MS = '150';
  await L.acquire(quiet);
  const m0 = statSync(join(dir(), 'owner')).mtimeMs; ago(join(dir(), 'owner'), 60000);
  await sleep(500);
  const age = Date.now() - statSync(join(dir(), 'owner')).mtimeMs;
  check('the holder keeps touching the owner file', age < 1000, age + ' ms old');
  L.release();
  delete process.env.LONGHAUL_BEAT_MS;
  check('stopped heartbeat: nothing left behind', !existsSync(dir()));
}

console.log('the queue: runs get the lock in the order they came (card space-game-lock-two-at-a-time)');
{
  const holderA = holder('hold'); await holderA.got;
  const order = [], rs = [];
  for (const label of ['w1', 'w2', 'w3', 'w4']) { // each is in the line before the next one starts
    const r = runner(label); rs.push(r); r.got.then(ok => { if (ok) order.push(label); });
    await waitFor(() => tickets() >= rs.length, 8000);
  }
  check('four runs wait behind a holder, in a line of four', tickets() === 4, 'tickets ' + tickets());
  holderA.p.kill('SIGTERM'); await holderA.exited;
  await Promise.all(rs.map(r => r.exited));
  check('they get it in the order they arrived', order.join(',') === 'w1,w2,w3,w4', order.join(','));
  check('and the line is empty afterwards, with nothing held', tickets() === 0 && !existsSync(dir()));
}
{
  const h = holder('hold'); await h.got;
  let err = null; try { await L.acquire({ ...quiet, timeoutMs: 700 }); } catch (e) { err = e; }
  check('a run that times out takes its ticket with it', err && /timed out/.test(err.message) && tickets() === 0, 'tickets ' + tickets());
  h.p.kill('SIGTERM'); await h.exited;
  await L.acquire(quiet);
  check('a run that gets the lock has no ticket either', tickets() === 0 && owner().pid === process.pid);
  L.release();
}
{
  // a waiter that is killed leaves its ticket behind: the next in line must not wait for it
  const h = holder('hold'); await h.got;
  const a = runner('dead'); await waitFor(() => tickets() >= 1);
  a.p.kill('SIGKILL'); await a.exited;
  const b = runner('after-dead'); await waitFor(() => existsSync(dir() + '.queue') && tickets() >= 1);
  h.p.kill('SIGTERM'); await h.exited;
  check('a waiter that was killed does not hold up the one behind it', await within(b.got, 8000));
  await b.exited;
  check('its dead ticket is dropped', tickets() === 0);
}
{
  // a waiter that is alive but stuck (stopped) stops refreshing its ticket, and is dropped after the stale time
  const env = { LONGHAUL_TICKET_STALE_MS: '1500' };
  process.env.LONGHAUL_TICKET_STALE_MS = '1500';
  const h = holder('hold', env); await h.got;
  const a = runner('stuck', env); await waitFor(() => tickets() >= 1);
  a.p.kill('SIGSTOP');
  const b = runner('behind-stuck', env); await waitFor(() => tickets() >= 2);
  h.p.kill('SIGTERM'); await h.exited;
  check('a stopped waiter loses its place after the stale time, and the next run gets the lock', await within(b.got, 9000));
  a.p.kill('SIGKILL'); await Promise.all([a.exited, b.exited]);
  delete process.env.LONGHAUL_TICKET_STALE_MS;
}
{
  const h = holder('hold'); await h.got;
  const w = runner('waiter'); await waitFor(() => tickets() >= 1);
  const q = L.queueStatus();
  check('status names the holder and the run waiting behind it', q.holders.length === 1 && q.holders[0].pid === h.p.pid && q.waiting.length === 1 && q.waiting[0].place === 1 && !q.idle, JSON.stringify(q));
  h.p.kill('SIGTERM'); await Promise.all([h.exited, w.exited]);
  check('status says idle when nobody holds it or waits', L.queueStatus().idle === true, JSON.stringify(L.queueStatus()));
}

console.log('two slots (LONGHAUL_LOCK_SLOTS), the second only while the Mac is quiet');
{
  const h1 = holder('hold'); await h1.got;
  const h2 = holder('hold'); h2.got.catch(() => {});
  check('with the default of one slot, a second run waits', !(await within(h2.got, 1500)));
  h2.p.kill('SIGKILL'); h1.p.kill('SIGTERM'); await Promise.all([h1.exited, h2.exited]); await sleep(100);
}
{
  const two = { LONGHAUL_LOCK_SLOTS: '2', LONGHAUL_FAKE_LOAD: '3' };
  const h1 = holder('hold', two); await h1.got;
  const h2 = holder('hold', two);
  check('two slots and a quiet Mac (load 3): a second run gets in at once', await within(h2.got, 4000));
  check('and it holds the second slot', existsSync(dir() + '.1') && JSON.parse(readFileSync(join(dir() + '.1', 'owner'), 'utf8')).pid === h2.p.pid);
  const h3 = holder('hold', two); h3.got.catch(() => {});
  check('a third run waits: two is the limit', !(await within(h3.got, 1500)));
  h2.p.kill('SIGTERM'); await h2.exited;
  check('a slot given back is taken by the one waiting', await within(h3.got, 4000));
  check('a run that stops gives its slot directory back', !existsSync(dir() + '.1') || JSON.parse(readFileSync(join(dir() + '.1', 'owner'), 'utf8')).pid === h3.p.pid);
  h1.p.kill('SIGTERM'); h3.p.kill('SIGTERM'); await Promise.all([h1.exited, h3.exited]); await sleep(100);
  check('everything is given back', L.queueStatus().idle === true && !existsSync(dir() + '.1'), JSON.stringify(L.queueStatus()));
}
{
  const busy = { LONGHAUL_LOCK_SLOTS: '2', LONGHAUL_FAKE_LOAD: '50' };
  const h1 = holder('hold', busy); await h1.got;
  const h2 = holder('hold', busy); h2.got.catch(() => {});
  check('two slots but a busy Mac (load 50 against a limit of 12): the second run waits', !(await within(h2.got, 1800)) && !existsSync(dir() + '.1'));
  h2.p.kill('SIGKILL'); h1.p.kill('SIGTERM'); await Promise.all([h1.exited, h2.exited]); await sleep(100);
  const high = { LONGHAUL_LOCK_SLOTS: '2', LONGHAUL_FAKE_LOAD: '50', LONGHAUL_LOCK_MAXLOAD: '100' };
  const g1 = holder('hold', high); await g1.got;
  const g2 = holder('hold', high);
  check('LONGHAUL_LOCK_MAXLOAD raises that limit', await within(g2.got, 4000));
  g1.p.kill('SIGTERM'); g2.p.kill('SIGTERM'); await Promise.all([g1.exited, g2.exited]); await sleep(100);
}
{
  // slot 0 is the old lock directory: a holder from before the queue existed (plain mkdir and an owner file) is respected
  const live = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
  mkdirSync(dir()); writeFileSync(join(dir(), 'owner'), JSON.stringify({ pid: live.pid, cmd: 'older lock.mjs', cwd: '/', since: Date.now() }));
  const w = runner('after-old', { LONGHAUL_LOCK_SLOTS: '1' }); w.got.catch(() => {});
  check('a run waits for a holder that uses the older lock format', !(await within(w.got, 1500)));
  rmSync(dir(), { recursive: true, force: true });
  check('and gets in when that one is gone', await within(w.got, 4000));
  await w.exited; live.kill('SIGKILL');
}

console.log('orphan Chrome profiles');
{
  const base = join(work, 'tmp'); mkdirSync(base);
  const dead = await deadPid();
  const orphan = join(base, `longhaul-${dead}-abc123`), live = join(base, `longhaul-${process.pid}-def456`), other = join(base, 'somebody-else');
  [orphan, live, other].forEach(d => { mkdirSync(d); writeFileSync(join(d, 'Local State'), '{}'); });
  // a stand-in for Chrome: a process whose command line carries the orphan's --user-data-dir
  const chrome = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', '--', `--user-data-dir=${orphan}`], { stdio: 'ignore' });
  const mine = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', '--', `--user-data-dir=${live}`], { stdio: 'ignore' });
  await sleep(300);
  const r = L.cleanupOrphans({ base });
  await sleep(300);
  check('a profile whose driver is gone is removed', !existsSync(orphan) && r.removed.includes(`longhaul-${dead}-abc123`), JSON.stringify(r));
  check('the Chrome still using it is killed', r.killed.includes(chrome.pid) && !L.alive(chrome.pid), JSON.stringify(r));
  check('a profile whose driver is alive is left alone, and so is its Chrome', existsSync(live) && L.alive(mine.pid));
  check('folders that are not longhaul-<pid>- profiles are never touched', existsSync(other));
  check('a second pass has nothing to do', L.cleanupOrphans({ base }).removed.length === 0);
  mine.kill('SIGKILL'); chrome.kill('SIGKILL');
}

console.log('removing a Chrome profile that is still being written to (card space-game-cdp-cleanup-race)');
{
  const base = join(work, 'tmp2'); mkdirSync(base);
  const busy = code => () => { const e = new Error(code + ': simulated'); e.code = code; throw e; };
  const notes = []; const note = m => notes.push(m);
  let calls = 0;
  let ok = await L.removeDir(join(base, 'x'), { rm: () => { if (++calls <= 3) busy('ENOTEMPTY')(); }, delayMs: 5, log: note });
  check('ENOTEMPTY three times, then it works: removed, tried four times, no note', ok === true && calls === 4 && notes.length === 0, JSON.stringify({ ok, calls, notes }));
  calls = 0; notes.length = 0;
  let threw = false;
  try { ok = await L.removeDir(join(base, 'y'), { rm: () => { calls++; busy('EBUSY')(); }, tries: 4, delayMs: 5, log: note }); } catch (e) { threw = true; }
  check('busy for good: it gives up after its tries, says so and does not throw', !threw && ok === false && calls === 4 && notes.length === 1 && notes[0].includes('EBUSY') && notes[0].includes(join(base, 'y')), JSON.stringify({ threw, ok, calls, notes }));
  calls = 0; notes.length = 0;
  try { ok = await L.removeDir(join(base, 'z'), { rm: () => { calls++; busy('EINVAL')(); }, tries: 4, delayMs: 5, log: note }); } catch (e) { threw = true; }
  check('an error that is not a race is not retried, and still does not throw', !threw && ok === false && calls === 1 && notes.length === 1, JSON.stringify({ ok, calls, notes }));
  check('a folder that is already gone is fine', (await L.removeDir(join(base, 'nothing-here'), { log: note })) === true);

  // a stand-in for Chrome's helper: keeps writing into the profile (and recreating it) for as long as it lives
  const writer = path => spawn(process.execPath, ['-e', `const fs = require('node:fs'), path = require('node:path'), d = process.argv.find(a => a.startsWith('--user-data-dir=')).slice(16);
    let i = 0; setInterval(() => { try { fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'f' + (i++ % 50)), 'x'); } catch (e) {} }, 5);`, '--', `--user-data-dir=${path}`], { stdio: 'ignore' });

  // 1. the helper only writes for a moment (Chrome closing down): plain retries are enough
  const brief = join(base, 'longhaul-1-brief'); mkdirSync(brief); writeFileSync(join(brief, 'Local State'), '{}');
  const w1 = writer(brief); await sleep(200);
  setTimeout(() => w1.kill('SIGKILL'), 500);
  const r1 = await L.removeDir(brief, { delayMs: 100, log: note });
  check('a helper that stops writing after half a second: the profile is removed, nothing thrown', r1 === true && !existsSync(brief), JSON.stringify({ r1, exists: existsSync(brief) }));
  w1.kill('SIGKILL');

  // 2. the helper never stops: removeDir ends it (it has this profile in its command line) and then removes the folder
  const stuck = join(base, 'longhaul-2-stuck'); mkdirSync(stuck);
  const w2 = writer(stuck); await sleep(200);
  let tries2 = 0; // the first two removals fail as a busy folder does; the helper is still alive then, so removeDir must end it
  const r2 = await L.removeDir(stuck, { rm: (p, o) => { if (++tries2 <= 2) busy('ENOTEMPTY')(); return rmSync(p, o); }, delayMs: 50, log: note });
  await sleep(200);
  check('a helper that never stops: it is ended after two failed tries, then the profile is removed', r2 === true && tries2 === 3 && !existsSync(stuck) && !L.alive(w2.pid), JSON.stringify({ r2, exists: existsSync(stuck), alive: L.alive(w2.pid) }));
  w2.kill('SIGKILL');

  // 3. stopProfileProcesses only ends the process that has exactly this profile
  const P = join(base, 'longhaul-3-abc');
  const mine3 = writer(P), longer = writer(P + 'def'), other = writer(join(base, 'unrelated'));
  await sleep(300);
  L.stopProfileProcesses(P);
  await sleep(300);
  check('stopProfileProcesses ends the helper of that profile', !L.alive(mine3.pid));
  check('it leaves a profile whose name merely starts the same, and unrelated ones, alone', L.alive(longer.pid) && L.alive(other.pid));
  check('and it is quiet and false when nothing matches', L.stopProfileProcesses(join(base, 'nobody')) === false);
  [mine3, longer, other].forEach(c => c.kill('SIGKILL'));
}

rmSync(work, { recursive: true, force: true });
console.log(failed ? `\nLOCK FAIL (${failed} of ${n} checks)` : `\nLOCK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
