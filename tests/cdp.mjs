// Tiny Chrome DevTools helper for the Long Haul tests. No dependencies: needs Node 22+ (global WebSocket and fetch).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

const KEYS = {
  C: [67, 'KeyC', 'c'], E: [69, 'KeyE', 'e'], L: [76, 'KeyL', 'l'], W: [87, 'KeyW', 'w'], S: [83, 'KeyS', 's'], X: [88, 'KeyX', 'x'],
  1: [49, 'Digit1', '1'], 2: [50, 'Digit2', '2'], 3: [51, 'Digit3', '3'], 4: [52, 'Digit4', '4'], 5: [53, 'Digit5', '5'], ESC: [27, 'Escape', 'Escape'],
  J: [74, 'KeyJ', 'j'], V: [86, 'KeyV', 'v'], UP: [38, 'ArrowUp', 'ArrowUp'], DOWN: [40, 'ArrowDown', 'ArrowDown'],
  ENTER: [13, 'Enter', 'Enter'], TAB: [9, 'Tab', 'Tab'], SPACE: [32, 'Space', ' ']
};

// Launch a throwaway headless Chrome (own profile, so it never touches your real Chrome) and return a session.
// root: the folder whose index.html to open (default: this checkout; a test can pass a copy with another content.generated.js)
// Only one headless Chrome runs at a time across every worktree (tests/lock.mjs): launch() waits for its turn, close() gives it back.
export async function launch(hash = '', root = ROOT) {
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
    t.close = async () => { try { await close(); } finally { if (!done) { done = true; release(); } } };
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
      setTimeout(() => { if (pending.delete(i)) rej(new Error(`DevTools call timed out: ${method} (after ${CALL_MS / 1000} s)`)); }, CALL_MS);
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
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch (e) { /* page still loading */ } await sleep(100); }
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
  return { send, ev, waitFor, press, clock, run, key, shot, close, errors };
}
