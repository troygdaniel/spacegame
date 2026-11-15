// not in the smoke: the Chrome DevTools helper the tests import
// Tiny Chrome DevTools helper for the Long Haul tests. No dependencies: needs Node 22+ (global WebSocket and fetch).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir, loadavg, cpus } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire, release, cleanupOrphans, removeDir, stopProfileProcesses } from './lock.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'tests', 'out');
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// A DevTools call gets 120 s (it was 30: with seven agents running Chrome a call can take longer than that). DEVTOOLS_TIMEOUT_MS changes it.
const CALL_MS = Number(process.env.DEVTOOLS_TIMEOUT_MS) || 120000;
// How long a wait may take is stretched by how busy the Mac is: the one-minute load per core, never under 1 and at most 4 times (card tests-flake-list: with seven agents the
// load average passed 80 on 10 cores, and DevTools calls and 8 s waits for a scene to start ran out while the page was only starved, in 14 of the 61 smoke logs on this Mac).
// The limits are there to catch a hang, not to time the game: an idle Mac gets exactly the limit it always had, and a wait for something that never happens still ends.
export const patience = ms => ms * Math.min(4, Math.max(1, loadavg()[0] / (cpus().length || 1)));

const KEYS = {
  C: [67, 'KeyC', 'c'], E: [69, 'KeyE', 'e'], L: [76, 'KeyL', 'l'], W: [87, 'KeyW', 'w'], S: [83, 'KeyS', 's'], X: [88, 'KeyX', 'x'],
  1: [49, 'Digit1', '1'], 2: [50, 'Digit2', '2'], 3: [51, 'Digit3', '3'], 4: [52, 'Digit4', '4'], 5: [53, 'Digit5', '5'], ESC: [27, 'Escape', 'Escape'],
  J: [74, 'KeyJ', 'j'], V: [86, 'KeyV', 'v'], UP: [38, 'ArrowUp', 'ArrowUp'], DOWN: [40, 'ArrowDown', 'ArrowDown'],
  ENTER: [13, 'Enter', 'Enter'], TAB: [9, 'Tab', 'Tab'], SPACE: [32, 'Space', ' ']
};

// A test process that is done with Chrome must be able to exit. Something (a Chrome child that will not die, a socket) can keep the event loop alive for ever, and the
// smoke run waits for the process: one run sat 21 minutes after printing PASS and was ended by hand (card tests-flake-list). close() arms this net: if the process is
// still here 5 minutes later it says so and ends with the exit code it already has, or 1 when none was set yet (so a process that was in the middle of something fails
// loudly instead of passing). The next launch() disarms it, so a test that goes on to open another session is not cut short. The timer is unref'd: it never keeps a
// process alive by itself.
let exitNet = null;
export function armExitNet(ms = Number(process.env.LONGHAUL_EXIT_NET_MS) || 300000) {
  clearTimeout(exitNet);
  exitNet = setTimeout(() => { console.log(`  (note: this test process was still running ${Math.round(ms / 1000)} s after its Chrome session closed; ending it)`); process.exit(process.exitCode ?? 1); }, ms);
  exitNet.unref();
}
export function disarmExitNet() { clearTimeout(exitNet); exitNet = null; }

// Launch a throwaway headless Chrome (own profile, so it never touches your real Chrome) and return a session.
// root: the folder whose index.html to open (default: this checkout; a test can pass a copy with another content.generated.js)
// Only one headless Chrome runs at a time across every worktree (tests/lock.mjs): launch() waits for its turn, close() gives it back.
export async function launch(hash = '', root = ROOT) {
  disarmExitNet();
  await acquire();
  try {
    cleanupOrphans({ log: console.log }); // Chrome profiles whose driver died: nobody else is running Chrome now, so they are safe to remove
    // starting Chrome can fail when the Mac is busy: one retry before giving up
    let t;
    try { t = await launchOnce(hash, root); } catch (e) {
      console.log('  (Chrome did not start cleanly, trying once more: ' + e.message + ')');
      t = await launchOnce(hash, root);
    }
    const close = t.close; let done = false;
    t.close = async () => { try { await close(); } finally { if (!done) { done = true; release(); armExitNet(); } } };
    return t;
  } catch (e) { release(); throw e; }
}

async function launchOnce(hash, root) {
  const profile = mkdtempSync(join(tmpdir(), `longhaul-${process.pid}-`)) // pid in the name: cleanup can target only this run;
  const chrome = spawn(CHROME, [
    '--headless=new', '--mute-audio', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--allow-file-access-from-files', '--remote-debugging-port=0', '--remote-allow-origins=*',
    `--user-data-dir=${profile}`, '--window-size=1280,720', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', 'about:blank'
  ], { stdio: 'ignore' });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 300 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) { chrome.kill('SIGKILL'); await removeDir(profile); throw new Error('Chrome did not start'); }
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  let page = null;
  for (let i = 0; i < 50 && !page; i++) {
    page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
    if (!page) await sleep(100);
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('DevTools socket did not open')), 20000); });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails; errors.push('exception: ' + (d.exception?.description || d.text));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    }
  };
  // every DevTools call has a time limit (CALL_MS), so a stuck Chrome fails the test instead of hanging it forever.
  // opts.retry sends a call that timed out once more. Only for calls that are safe to run twice (reads, screenshots): a
  // timed-out call may still be running in the page, and running a step or an action twice would change the game.
  const send = (method, params = {}, opts = {}) => {
    const once = () => new Promise((res, rej) => {
      const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
      const limit = patience(CALL_MS);
      setTimeout(() => { if (pending.delete(i)) rej(new Error(`DevTools call timed out: ${method} (after ${Math.round(limit / 1000)} s)`)); }, limit);
    });
    return opts.retry ? once().catch(e => (/timed out/.test(e.message) ? once() : Promise.reject(e))) : once();
  };
  // Phaser objects cannot be sent back by value ("object reference chain is too long"), so only plain values,
  // arrays and plain objects come back; anything else (a sprite from setPosition, say) comes back as null.
  const ev = async (expr, opts) => { // ev(expr, { retry: true }) for an expression that is safe to run twice
    const wrapped = `(() => { const r = (${expr}); return (r && typeof r === 'object' && !Array.isArray(r) && Object.getPrototypeOf(r) !== Object.prototype) ? null : r; })()`;
    const r = await send('Runtime.evaluate', { expression: wrapped, returnByValue: true }, opts);
    if (r.exceptionDetails) throw new Error('eval failed: ' + expr + ' -> ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const waitFor = async (expr, ms = 8000, what = expr) => {
    const t0 = performance.now(), limit = patience(ms); // monotonic: a Mac that sleeps in the middle of a wait does not use it up
    while (performance.now() - t0 < limit) { try { if (await ev(expr)) return true; } catch (e) { /* page still loading */ } await sleep(100); }
    throw new Error('timed out waiting for: ' + what);
  };
  const press = async (k, hold = 120) => {
    const [vk, code, key] = KEYS[k];
    await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key });
    await sleep(hold);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key });
  };
  // Stepped clock (idea from BuildBot's drive.mjs): headless Chrome can stall or slow animation frames when the Mac is
  // busy, so a test that needs the game to run for an exact time stops Phaser's own loop and steps it by hand,
  // 16.67 ms a frame. After clock(), use run(ms) and key(k) (not press): real time no longer moves the game.
  const clock = () => ev('(() => { game.loop.stop(); window.__t = performance.now(); window.tick = n => { for (let i = 0; i < n; i++) { __t += 16.67; game.step(__t, 16.67); } }; return 1; })()');
  const run = async ms => { // in slices of 120 frames (2 s of game time) so no single DevTools call runs for long
    for (let left = Math.ceil(ms / 16.67); left > 0; left -= 120) await ev(`(() => { tick(${Math.min(left, 120)}); return 1; })()`);
  };
  const key = async k => {
    const [vk, code, key] = KEYS[k];
    await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key });
    await run(50);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key });
    await run(100);
  };
  // A screenshot can hang on a busy Mac (software GL). It returns true or false instead of throwing, so a test that
  // only wants a picture goes on; tests/scenes.mjs, where the picture is the point, fails on false.
  const shot = async name => {
    try {
      const r = await send('Page.captureScreenshot', { format: 'png' }, { retry: true });
      writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
      return true;
    } catch (e) { console.log(`  (screenshot ${name} skipped: ${e.message})`); return false; }
  };
  // close never throws: a test that finished its checks must not die on housekeeping. Wait for Chrome to exit (kill it if it will
  // not), end any helper still holding the profile, then remove the profile, retrying while Chrome's helpers finish writing.
  const close = async () => {
    try { ws.close(); } catch (e) { /* already closed */ }
    try {
      const gone = () => chrome.exitCode !== null || chrome.signalCode !== null;
      if (!gone()) {
        const exited = new Promise(r => chrome.once('exit', r));
        chrome.kill('SIGTERM');
        await Promise.race([exited, sleep(4000)]);
        if (!gone()) { chrome.kill('SIGKILL'); await Promise.race([exited, sleep(2000)]); } // a loaded machine can ignore SIGTERM for a while
      }
    } catch (e) { console.log('  (note: Chrome did not stop cleanly: ' + e.message + ')'); }
    stopProfileProcesses(profile);
    await removeDir(profile);
  };
  await send('Page.enable'); await send('Runtime.enable');
  // Headless Chrome starts with no focused page, and the first key event sent through DevTools then makes it focused AND hidden
  // (document.hidden turns true), so requestAnimationFrame stops and Phaser's real loop freezes: the game never handles that key
  // and a queued scene.stop() never runs. Any key does it (M too), not only V (docs/PLAYTEST2.md finding 2). A real window does not.
  // Focus emulation keeps the page focused and visible, so a test that lets the real loop run behaves like a player's browser.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url: 'file://' + root + '/index.html' + hash });
  // goto(hash, root): the same Chrome opens another page, or another copy of the game. A test with several cases uses it instead of a second
  // launch(), which would wait for its turn at the test lock all over again. The profile is cleaned first (localStorage and sessionStorage), as a new
  // launch would give it, and errors starts empty, so a case cannot see the last one's keys, saves or console errors. A page of its own is a
  // new page: about:blank in between, because a change of the #hash alone does not reload the game.
  const goto = async (h = '', r = root) => {
    try { await ev('(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* no storage on this page */ } return 1; })()'); } catch (e) { /* nothing loaded to clean */ }
    errors.length = 0;
    await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
    await send('Page.navigate', { url: 'file://' + r + '/index.html' + h });
  };
  return { send, ev, waitFor, press, clock, run, key, shot, close, errors, goto, pid: chrome.pid };
}

// A test with several cases and one Chrome: pool.open(hash, root) is launch() the first time and goto() after, and the session it gives back has a
// close() that does nothing, so a case written as `const t = await launch(...); try { ... } finally { await t.close(); }` only changes its first line.
// pool.close() ends the Chrome (put it in the test's last finally). One turn at the test lock for the whole test, not one a case.
export function chromePool() {
  let t = null;
  const quit = () => { if (t) { try { t.pid && process.kill(t.pid, 'SIGKILL'); } catch (e) { /* gone already */ } } };
  process.once('exit', quit); // a test that throws must not leave its Chrome behind
  return {
    open: async (hash = '', root = ROOT) => {
      if (!t) t = await launch(hash, root); else await t.goto(hash, root);
      const view = Object.create(t); view.close = async () => {}; // the case's own close() leaves the Chrome up
      return view;
    },
    close: async () => { if (t) { const x = t; t = null; await x.close(); } }
  };
}
