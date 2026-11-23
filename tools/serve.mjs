// Optional dev server for Long Haul (docs/MODDING.md section 4). Nothing in the game needs it: index.html still opens by double-click.
// It is for people who edit markdown in content/: it serves this folder, rebuilds content.generated.js the moment a file in
// content/ changes, and tells the open page, which then reloads when you press Shift+R or click its chip (plain R is the game's: Guard in the Campaign).
//   node tools/serve.mjs                     http://127.0.0.1:8787/   (the next free port if that one is taken)
//   --port N        another port; 0 means any free port
//   --root DIR      the folder to serve (default: this repo)
//   --content DIR   the markdown to watch and build (default: content)
//   --mods DIR      the packs to watch and build (default: mods; with --content or --out and no --mods the packs are left alone)
//   --out FILE      where the built script goes (default: content.generated.js)
//   --no-watch      build once and serve, do not watch
//   --playlogs DIR  where the play log of the page is kept (default ~/dev/spacegame-playlogs, or $LONGHAUL_PLAYLOGS): OUTSIDE the repo, never inside it
// Needs Node 22+, no packages. It listens on 127.0.0.1 only, answers only GET and HEAD (and the one POST of the play log, /__playlog, below), and serves nothing outside --root and
// nothing whose path has a dot-name in it (.git, .env, .DS_Store). The R-to-reload script is added to HTML pages as they are
// sent: the files themselves, and the game when you open it any other way, have no dev code in them.
import { createServer } from 'node:http';
import { readFileSync, realpathSync, statSync, createReadStream, watch, existsSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, sep, extname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, buildMods } from './build-content.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ContentLib = createRequire(import.meta.url)('../src/content.js');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.map': 'application/json; charset=utf-8'
};

// What the open page runs (sent as /__dev.js, and only to pages this server sends): a small chip that says what the server did,
// and the Shift+R key. Plain R does nothing here: R is a key of the game (Guard in the Campaign, restart on its pause card), so it must not reload the page (card space-game-dev-r-reload-clash). Shift+R does nothing while you type in a box, and Ctrl/Cmd+R is left to the browser.
const DEV_CLIENT = `(function () {
  var chip = document.createElement('div');
  chip.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:2147483647;font:12px monospace;padding:6px 10px;border-radius:3px;cursor:pointer;background:#04101c;border:1px solid #38e1ff;color:#9fe9ff;opacity:0.92';
  chip.title = 'Press Shift+R (or click) to reload the page; plain R belongs to the game';
  var set = function (text, color) { chip.textContent = text; chip.style.borderColor = color; chip.style.color = color; };
  var reload = function () { location.reload(); };
  chip.addEventListener('click', reload);
  (document.body || document.documentElement).appendChild(chip);
  set('DEV SERVER  Shift+R reloads', '#38e1ff');
  var say = function (d) {
    var at = new Date(d.at).toLocaleTimeString();
    if (d.problems) set('content rebuilt ' + at + ': ' + d.problems + ' problem' + (d.problems === 1 ? '' : 's') + ' (see the terminal)   Shift+R reloads', '#ffb454');
    else set('content rebuilt ' + at + ': no problems   Shift+R reloads', '#6dff9c');
  };
  var es = new EventSource('/__events');
  es.addEventListener('state', function (e) { var d = JSON.parse(e.data); if (d.problems) say(d); });
  es.addEventListener('rebuilt', function (e) { say(JSON.parse(e.data)); });
  es.onerror = function () { set('dev server stopped', '#ff4d6d'); };
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyR' || !e.shiftKey || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; // Shift+R only: a plain R is Guard in the game
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    reload();
  });
})();
`;

function parseArgs(argv) {
  const has = f => argv.includes(f), val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);
  const port = Number(val('--port', 8787));
  return {
    port: Number.isInteger(port) && port >= 0 && port < 65536 ? port : 8787, portGiven: has('--port'),
    root: resolve(REPO, val('--root', '.')), content: resolve(REPO, val('--content', 'content')), out: resolve(REPO, val('--out', 'content.generated.js')),
    watch: !has('--no-watch'), playlogs: resolve(val('--playlogs', process.env.LONGHAUL_PLAYLOGS || join(homedir(), 'dev', 'spacegame-playlogs'))),
    // packs (docs/MODDING.md 13): built and watched too, unless --content or --out point somewhere else (tests) and --mods does not say where the packs are
    mods: resolve(REPO, val('--mods', 'mods')), modsOut: resolve(REPO, val('--mods-out', 'mods.generated.js')), modsToo: has('--mods') || (!has('--content') && !has('--out'))
  };
}

// a request path to a real file inside root, or null. No .., no dot-names, no symlink out of the folder, no directory listing
function resolveFile(root, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch (e) { return null; }
  if (p.includes('\0') || p.includes('\\')) return null;
  const parts = p.split('/').filter(Boolean); // split before anything tidies the path: a .. or any dot-name anywhere is refused, even one that arrived as %2f
  if (parts.some(s => s[0] === '.')) return null;
  let file = join(root, ...parts);
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const real = realpathSync(file), realRoot = realpathSync(root);
    if (real !== realRoot && !real.startsWith(realRoot + sep)) return null;
    return statSync(real).isFile() ? real : null;
  } catch (e) { return null; }
}

// ---------- the play log (card space-game-playlog): the page POSTs the lines it keeps to /__playlog?s=<session id>; they are appended here ----------
// One file a session, <date>-<time>-<session id>.jsonl, in a folder OUTSIDE the repo (a log inside a worktree would end up in a commit). Only lines that are a JSON object
// with a short "ev" and this session's id are kept; the rest are counted and dropped. The first line of a new file says the commit and the node that served it.
export const PLAYLOG_MAX = { body: 256 * 1024, lines: 2000, line: 4000 };
export function playlogDirOk(dir) { const d = resolve(dir); return d !== REPO && !d.startsWith(REPO + sep); }
export function playlogAppend(dir, sid, text, now = new Date(), commit = '') {
  if (!/^[0-9a-f]{8}$/.test(sid)) return { ok: false, why: 'session' };
  if (!playlogDirOk(dir)) return { ok: false, why: 'inside the repo' };
  const keep = []; let dropped = 0;
  String(text).split('\n').filter(Boolean).slice(0, PLAYLOG_MAX.lines).forEach(l => {
    try { const o = JSON.parse(l); if (l.length <= PLAYLOG_MAX.line && o && typeof o === 'object' && !Array.isArray(o) && typeof o.ev === 'string' && o.ev.length <= 24 && o.s === sid) { keep.push(l); return; } } catch (e) { /* not a line of ours */ }
    dropped++;
  });
  if (!keep.length) return { ok: true, kept: 0, dropped };
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  let name = readdirSync(dir).find(f => f.endsWith('-' + sid + '.jsonl')), fresh = false;
  if (!name) {
    const p = n => String(n).padStart(2, '0');
    name = now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate()) + '-' + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds()) + '-' + sid + '.jsonl'; fresh = true;
  }
  const head = fresh ? JSON.stringify({ t: 0, s: sid, ev: 'server', commit: String(commit).slice(0, 40), node: process.version }) + '\n' : '';
  appendFileSync(join(dir, name), head + keep.join('\n') + '\n', { mode: 0o600 });
  return { ok: true, kept: keep.length, dropped, file: name };
}
let COMMIT = null;
const gitCommit = () => { if (COMMIT === null) { try { COMMIT = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { COMMIT = ''; } } return COMMIT; };

export function startServer(opts) {
  const o = Object.assign(parseArgs([]), opts);
  const state = { at: Date.now(), problems: 0, warnings: 0, files: 0, entries: 0, lines: [] };
  const clients = new Set();
  let port = 0;

  // build now and whenever content/ changes; report to the terminal and to open pages
  const rebuild = (why) => {
    let b;
    try { b = build({ dir: o.content, out: o.out }); } catch (e) { console.log('  build failed: ' + e.message); return state; }
    let all = b.result.errors, wrote = b.wrote, packs = 0;
    if (o.modsToo) { // the packs of mods/, each on its own; their problems count with the rest
      try {
        const m = buildMods({ dir: o.mods, out: o.modsOut, coreEntries: b.result.entries });
        all = all.concat(m.errors, ...m.packs.map(p => p.errors)); wrote = wrote || m.wrote; packs = m.packs.length;
      } catch (e) { console.log('  packs failed: ' + e.message); }
    }
    const errors = all.filter(e => e.level === 'error');
    state.at = Date.now(); state.problems = errors.length; state.warnings = all.length - errors.length; state.files = b.result.files; state.entries = b.result.entries.length;
    state.lines = all.map(e => ContentLib.formatError(e));
    state.lines.forEach(l => console.log('  ' + l));
    console.log(`${new Date(state.at).toLocaleTimeString()}  ${why}: ${state.files} files, ${state.entries} entries, ${state.problems} problem${state.problems === 1 ? '' : 's'}` +
      (state.warnings ? `, ${state.warnings} warning${state.warnings === 1 ? '' : 's'}` : '') + (packs ? `, ${packs} pack${packs === 1 ? '' : 's'}` : '') + (wrote ? '  -> ' + o.out.replace(REPO + sep, '') + (o.modsToo ? ' and ' + o.modsOut.replace(REPO + sep, '') : '') + ' written' : '  -> unchanged'));
    const msg = 'event: rebuilt\ndata: ' + JSON.stringify({ at: state.at, problems: state.problems, warnings: state.warnings, files: state.files, entries: state.entries, wrote }) + '\n\n';
    clients.forEach(res => res.write(msg));
    return state;
  };

  const send = (res, code, body, headers = {}) => {
    res.writeHead(code, Object.assign({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': 'text/plain; charset=utf-8' }, headers));
    res.end(body);
  };
  const server = createServer((req, res) => {
    // a page on another site must not be able to talk to this server by pointing a hostname at 127.0.0.1
    const host = String(req.headers.host || '').toLowerCase();
    if (host !== '127.0.0.1:' + port && host !== 'localhost:' + port) return send(res, 403, 'Wrong Host header.\n');
    let path, query;
    try { const u = new URL(req.url, 'http://x'); path = u.pathname; query = u.searchParams; } catch (e) { return send(res, 400, 'Bad request.\n'); }
    if (req.method === 'POST' && path === '/__playlog') { // the one thing that is written: a batch of play log lines, from this server's own page
      const origin = req.headers.origin;
      if (origin && origin !== 'http://127.0.0.1:' + port && origin !== 'http://localhost:' + port) return send(res, 403, 'Wrong Origin.\n');
      if (!/^text\/plain/i.test(String(req.headers['content-type'] || ''))) return send(res, 415, 'text/plain only.\n');
      let size = 0; const chunks = []; let over = false;
      req.on('data', d => { size += d.length; if (size > PLAYLOG_MAX.body) { over = true; req.destroy(); } else chunks.push(d); });
      req.on('close', () => { if (over && !res.writableEnded) send(res, 413, 'Too big.\n'); });
      req.on('end', () => {
        if (over) return;
        try {
          const r = playlogAppend(o.playlogs, String(query.get('s') || ''), Buffer.concat(chunks).toString('utf8'), new Date(), gitCommit());
          if (!r.ok) return send(res, r.why === 'session' ? 400 : 500, 'Not kept: ' + r.why + '.\n');
          return send(res, 204, '');
        } catch (e) { return send(res, 500, 'Could not write the play log.\n'); }
      });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Only GET and HEAD.\n', { Allow: 'GET, HEAD' });

    if (path === '/__dev.js') return send(res, 200, DEV_CLIENT, { 'Content-Type': MIME['.js'] });
    if (path === '/__events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 1000\nevent: state\ndata: ' + JSON.stringify({ at: state.at, problems: state.problems, warnings: state.warnings, files: state.files }) + '\n\n');
      clients.add(res); req.on('close', () => clients.delete(res));
      return;
    }
    const file = resolveFile(o.root, path === '/' ? '/index.html' : path);
    if (!file) return send(res, 404, 'Not found.\n');
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    if (type.startsWith('text/html')) { // HTML gets the dev script just before </body>; the file on disk is not touched
      let html = readFileSync(file, 'utf8');
      const tag = '<script src="/__dev.js"></script>';
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + '</body>') : html + tag;
      return send(res, 200, req.method === 'HEAD' ? '' : html, { 'Content-Type': type });
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': statSync(file).size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });

  const keepAlive = setInterval(() => clients.forEach(res => res.write(': still here\n\n')), 20000); keepAlive.unref();
  let watcher = null, modsWatcher = null, timer = null;
  const listen = (p, triesLeft) => new Promise((ok, fail) => {
    server.once('error', e => {
      if (e.code === 'EADDRINUSE' && !o.portGiven && triesLeft > 0) listen(p + 1, triesLeft - 1).then(ok, fail); else fail(e);
    });
    server.listen(p, '127.0.0.1', () => { port = server.address().port; ok(port); });
  });
  const ready = listen(o.port, 20).then(() => {
    rebuild('built');
    if (o.watch && existsSync(o.content)) {
      const on = () => { clearTimeout(timer); timer = setTimeout(() => rebuild('content changed'), 150); };
      try { watcher = watch(o.content, { recursive: true }, on); } catch (e) { watcher = watch(o.content, on); }
      if (o.modsToo && existsSync(o.mods)) { try { modsWatcher = watch(o.mods, { recursive: true }, on); } catch (e) { modsWatcher = watch(o.mods, on); } }
    }
    return { port, url: 'http://127.0.0.1:' + port + '/' };
  });
  const close = () => new Promise(res => {
    clearTimeout(timer); clearInterval(keepAlive); if (watcher) watcher.close(); if (modsWatcher) modsWatcher.close();
    clients.forEach(r => r.end()); server.close(() => res()); server.closeAllConnections();
  });
  return { ready, close, state, server };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const s = startServer(o);
  try {
    const { url } = await s.ready;
    console.log(`Long Haul dev server: ${url}   (serving ${o.root.replace(REPO, '.') || '.'}; press Shift+R in the page to reload it; Ctrl+C stops)`);
    console.log(playlogDirOk(o.playlogs) ? `play log: the page's log is kept in ${o.playlogs.replace(homedir(), '~')} (outside the repo)` : `play log: ${o.playlogs} is inside the repo: the page's log is NOT kept (use --playlogs with a folder outside it)`);
    console.log(o.watch ? `watching ${o.content.replace(REPO + sep, '')}/${o.modsToo ? ' and ' + o.mods.replace(REPO + sep, '') + '/' : ''} and rebuilding ${o.out.replace(REPO + sep, '')}${o.modsToo ? ' and ' + o.modsOut.replace(REPO + sep, '') : ''} when it changes` : 'not watching: --no-watch');
  } catch (e) {
    console.error(e.code === 'EADDRINUSE' ? `Port ${o.port} is already in use. Try --port ${o.port + 1}, or --port 0 for any free port.` : 'Could not start: ' + e.message);
    process.exit(1);
  }
  const stop = () => s.close().then(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
