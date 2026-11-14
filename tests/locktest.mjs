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

rmSync(work, { recursive: true, force: true });
console.log(failed ? `\nLOCK FAIL (${failed} of ${n} checks)` : `\nLOCK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
