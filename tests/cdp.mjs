// Tiny Chrome DevTools helper for the Long Haul tests. No dependencies: needs Node 22+ (global WebSocket and fetch).
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'tests', 'out');
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

const KEYS = {
  C: [67, 'KeyC', 'c'], E: [69, 'KeyE', 'e'], L: [76, 'KeyL', 'l'], W: [87, 'KeyW', 'w'], S: [83, 'KeyS', 's'], X: [88, 'KeyX', 'x'],
  1: [49, 'Digit1', '1'], 2: [50, 'Digit2', '2'], 3: [51, 'Digit3', '3'], ESC: [27, 'Escape', 'Escape']
};

// Launch a throwaway headless Chrome (own profile, so it never touches your real Chrome) and return a session.
export async function launch(hash = '') {
  // starting Chrome can fail when the Mac is busy (load average 25 from other agents): one retry before giving up
  try { return await launchOnce(hash); } catch (e) {
    console.log('  (Chrome did not start cleanly, trying once more: ' + e.message + ')');
    return await launchOnce(hash);
  }
}

async function launchOnce(hash) {
  const profile = mkdtempSync(join(tmpdir(), `longhaul-${process.pid}-`)) // pid in the name: cleanup can target only this run;
  const chrome = spawn(CHROME, [
    '--headless=new', '--mute-audio', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--allow-file-access-from-files', '--remote-debugging-port=0', '--remote-allow-origins=*',
    `--user-data-dir=${profile}`, '--window-size=1280,720', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', 'about:blank'
  ], { stdio: 'ignore' });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 300 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) { chrome.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); throw new Error('Chrome did not start'); }
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
  // every DevTools call has a 30 s limit, so a stuck Chrome fails the test instead of hanging it forever
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pending.delete(i)) rej(new Error('DevTools call timed out: ' + method)); }, 30000);
  });
  // Phaser objects cannot be sent back by value ("object reference chain is too long"), so only plain values,
  // arrays and plain objects come back; anything else (a sprite from setPosition, say) comes back as null.
  const ev = async expr => {
    const wrapped = `(() => { const r = (${expr}); return (r && typeof r === 'object' && !Array.isArray(r) && Object.getPrototypeOf(r) !== Object.prototype) ? null : r; })()`;
    const r = await send('Runtime.evaluate', { expression: wrapped, returnByValue: true });
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
      const r = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
      return true;
    } catch (e) { console.log(`  (screenshot ${name} skipped: ${e.message})`); return false; }
  };
  const close = async () => {
    try { ws.close(); } catch (e) { /* already closed */ }
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill('SIGTERM');
    await Promise.race([exited, sleep(4000)]);
    if (chrome.exitCode === null) { chrome.kill('SIGKILL'); await sleep(500); } // a loaded machine can ignore SIGTERM for a while
    rmSync(profile, { recursive: true, force: true });
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file://' + ROOT + '/index.html' + hash });
  return { send, ev, waitFor, press, clock, run, key, shot, close, errors };
}
