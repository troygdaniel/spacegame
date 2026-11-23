// smoke: the dev server: serves, refuses, rebuilds on change, Shift+R or a click on the chip reloads (plain R is the game's)
// The dev server (tools/serve.mjs, docs/MODDING.md section 4). Needs no packages; one headless Chrome for the reload keys at the end.
// Checks: it serves the game with the dev script added to HTML only; it refuses everything it should (.., dot-names, POST, a foreign
// Host header, other network interfaces); it rebuilds and tells the page when content/ changes, also when a file is broken; and Shift+R
// (or a click on the chip) reloads the page, but a plain R does not (it is Guard in the Campaign: card space-game-dev-r-reload-clash) and nothing reloads while you type in a box. Run: node tests/serve.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { launch, sleep, ROOT } from './cdp.mjs';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), 'lh-serve-'));

// one request with the exact path and headers given (fetch would tidy ".." away)
const get = (port, path, { method = 'GET', host } = {}) => new Promise((res, rej) => {
  const r = request({ host: '127.0.0.1', port, path, method, headers: { Host: host || '127.0.0.1:' + port } }, resp => {
    let body = ''; resp.on('data', d => { body += d; }); resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body }));
  });
  r.on('error', rej); r.end();
});
function startDev(args) {
  const child = spawn(process.execPath, [join(ROOT, 'tools', 'serve.mjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  const dev = { child, out: '', port: 0 };
  child.stdout.on('data', d => { dev.out += d; }); child.stderr.on('data', d => { dev.out += d; });
  dev.ready = new Promise((res, rej) => {
    const t0 = Date.now(), poll = setInterval(() => {
      const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(dev.out);
      if (m) { clearInterval(poll); dev.port = Number(m[1]); res(dev); } else if (Date.now() - t0 > 15000) { clearInterval(poll); rej(new Error('the dev server did not start: ' + dev.out)); }
    }, 50);
  });
  dev.stop = () => new Promise(res => { if (child.exitCode !== null) return res(); child.once('exit', res); child.kill('SIGTERM'); setTimeout(() => { child.kill('SIGKILL'); res(); }, 3000); });
  return dev;
}
// the page's view of the server: collect the events it would get
function listen(port) {
  const events = [];
  const r = request({ host: '127.0.0.1', port, path: '/__events', headers: { Host: '127.0.0.1:' + port } }, resp => {
    let buf = ''; resp.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n\n')) >= 0) { const block = buf.slice(0, i); buf = buf.slice(i + 2); const ev = /event: (\w+)/.exec(block), da = /data: (.*)/.exec(block); if (ev && da) events.push({ name: ev[1], data: JSON.parse(da[1]) }); } });
  });
  r.on('error', () => {}); r.end();
  return { events, close: () => r.destroy(), next: async (name, ms = 6000, from = 0) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const e = events.slice(from).find(x => x.name === name); if (e) return e.data; await sleep(50); } return null; } };
}
const TEMPLATE = readFileSync(join(ROOT, 'content', '_templates', 'mission.md'), 'utf8');

try {
  // ---- 1. the real game folder: what is served, and what is refused ----
  console.log('serving the game folder');
  const a = await startDev(['--port', '0', '--no-watch', '--out', join(tmp, 'gen-a.js')]).ready;
  try {
    const home = await get(a.port, '/');
    check('GET / is the game page', home.status === 200 && /text\/html/.test(home.headers['content-type']) && home.body.includes('phaser.min.js'));
    check('the dev script is added to the page', home.body.includes('<script src="/__dev.js"></script>'));
    check('index.html on disk has no dev code', !readFileSync(join(ROOT, 'index.html'), 'utf8').includes('__dev'));
    const js = await get(a.port, '/src/common.js');
    check('a game script is served as JavaScript, untouched', js.status === 200 && /text\/javascript/.test(js.headers['content-type']) && !js.body.includes('__dev') && js.body === readFileSync(join(ROOT, 'src', 'common.js'), 'utf8'));
    check('nothing is cached', home.headers['cache-control'] === 'no-store' && js.headers['cache-control'] === 'no-store');
    const dev = await get(a.port, '/__dev.js');
    check('/__dev.js has the Shift+R key and the typing guard, and the chip says Shift+R', dev.status === 200 && dev.body.includes("'KeyR'") && dev.body.includes('!e.shiftKey') && dev.body.includes('INPUT') && dev.body.includes('DEV SERVER  Shift+R reloads') && !/R reloads/.test(dev.body.replace(/Shift\+R reloads/g, '')));
    check('/__dev.js is valid JavaScript (a quote in its words would break it for the page)', (() => { try { new Function(dev.body); return true; } catch (e) { return String(e); } })() === true);
    check('HEAD works and sends no body', (await get(a.port, '/', { method: 'HEAD' })).body === '');
    for (const p of ['/../package.json', '/%2e%2e/%2e%2e/etc/hosts', '/src/..%2f..%2fREADME.md', '/.git/config', '/.env', '/src/%2e%2e/.git/HEAD', '/nope.js', '/src', '/%00', '/%zz'])
      check('refused: ' + p, [400, 404].includes((await get(a.port, p)).status), String((await get(a.port, p)).status));
    check('POST is refused (405)', (await get(a.port, '/', { method: 'POST' })).status === 405);
    check('a foreign Host header is refused (403)', (await get(a.port, '/', { host: 'evil.example' })).status === 403);
    const lan = Object.values(networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal);
    if (lan) check('not reachable on the network address ' + 'x.x.x.x', await new Promise(res => { const r = request({ host: lan.address, port: a.port, path: '/', timeout: 2000 }, () => res(false)); r.on('error', () => res(true)); r.on('timeout', () => { r.destroy(); res(true); }); r.end(); }));
    else console.log('  (no network address on this machine: skipped the network-reach check)');
  } finally { await a.stop(); }
  check('the server stops on SIGTERM', await get(a.port, '/').then(() => false, () => true));

  // ---- 2. a small pack: rebuild on change, broken files, the page hears about it ----
  console.log('rebuilding a small pack');
  mkdirSync(join(tmp, 'content', 'missions'), { recursive: true });
  writeFileSync(join(tmp, 'index.html'), '<!doctype html><html><body><input id="box"><script>window.__n=(+sessionStorage.getItem("n")||0)+1;sessionStorage.setItem("n",window.__n)</script></body></html>');
  writeFileSync(join(tmp, 'content', 'missions', 'first.md'), TEMPLATE);
  const gen = join(tmp, 'content.generated.js');
  const b = await startDev(['--port', '0', '--root', tmp, '--content', join(tmp, 'content'), '--out', gen]).ready;
  const page = listen(b.port);
  try {
    check('it builds once on start: 1 entry, 0 problems', /1 files, 1 entries, 0 problems/.test(b.out), b.out.split('\n').find(l => /built:/.test(l)));
    check('the generated script exists and holds the entry', existsSync(gen) && /"first"/.test(readFileSync(gen, 'utf8')));
    const state = await page.next('state');
    check('a new page is told the current state', state && state.problems === 0);
    let seen = page.events.length;
    writeFileSync(join(tmp, 'content', 'missions', 'second.md'), TEMPLATE);
    const r1 = await page.next('rebuilt', 8000, seen);
    check('a new file rebuilds and the page is told', r1 && r1.entries === 2 && r1.problems === 0 && r1.wrote === true, JSON.stringify(r1));
    check('the generated script now has both', /"second"/.test(readFileSync(gen, 'utf8')) && /"first"/.test(readFileSync(gen, 'utf8')));
    seen = page.events.length;
    writeFileSync(join(tmp, 'content', 'missions', 'broken.md'), 'no front matter in this file\n');
    const r2 = await page.next('rebuilt', 8000, seen);
    check('a broken file is counted as a problem and the server carries on', r2 && r2.problems >= 1 && (await get(b.port, '/')).status === 200, JSON.stringify(r2));
    check('the terminal names the broken file', /broken\.md/.test(b.out));
    seen = page.events.length;
    unlinkSync(join(tmp, 'content', 'missions', 'broken.md'));
    const r3 = await page.next('rebuilt', 8000, seen);
    check('removing it clears the problem', r3 && r3.problems === 0 && r3.entries === 2, JSON.stringify(r3));

    // ---- 3. in Chrome: the chip, and Shift+R or a click reloads (a plain R does not) ----
    console.log('R in a real page');
    const t = await launch('');
    try {
      await t.send('Page.navigate', { url: 'http://127.0.0.1:' + b.port + '/' });
      await t.waitFor('window.__n === 1 && document.body.innerText.includes("DEV SERVER")', 15000, 'the page and its chip');
      check('the chip shows on the page', true);
      writeFileSync(join(tmp, 'content', 'missions', 'third.md'), TEMPLATE);
      await t.waitFor('document.body.innerText.includes("content rebuilt")', 10000, 'the chip after a rebuild');
      check('the chip says the content was rebuilt', true);
      const key = (type, shift) => t.send('Input.dispatchKeyEvent', shift ? { type, windowsVirtualKeyCode: 82, code: 'KeyR', key: 'R', modifiers: 8 } : { type, windowsVirtualKeyCode: 82, code: 'KeyR', key: 'r' });
      await t.ev('(document.getElementById("box").blur(), 1)');
      await key('keyDown'); await key('keyUp'); await sleep(1200);
      check('a plain R does not reload the page (it is a key of the game: Guard in the Campaign)', (await t.ev('window.__n')) === 1);
      await t.ev('(document.getElementById("box").focus(), 1)');
      await key('keyDown', true); await key('keyUp', true); await sleep(1200);
      check('Shift+R typed in a box does not reload', (await t.ev('window.__n')) === 1);
      await t.ev('(document.getElementById("box").blur(), 1)');
      await key('keyDown', true); await key('keyUp', true);
      await t.waitFor('window.__n === 2', 10000, 'the page reloaded');
      check('Shift+R reloads the page', true);
      await t.waitFor('document.body.innerText.includes("DEV SERVER")', 15000, 'the chip on the reloaded page');
      check('the chip says Shift+R reloads', (await t.ev('document.body.innerText')).includes('Shift+R reloads'));
      await t.ev('([...document.querySelectorAll("div")].find(d => d.textContent.startsWith("DEV SERVER")).click(), 1)');
      await t.waitFor('window.__n === 3', 10000, 'the page reloaded by the chip');
      check('a click on the chip reloads the page', true);
      check('no console errors', t.errors.length === 0, t.errors.join(' | '));
    } finally { try { await t.close(); } catch (e) { /* the profile folder can still be filling on a busy Mac */ } }
  } finally { page.close(); await b.stop(); }
} catch (e) { console.log('  FAIL ' + e.message); failed++; }
finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(failed ? `SERVE FAIL (${failed})` : 'SERVE PASS');
process.exitCode = failed ? 1 : 0;
