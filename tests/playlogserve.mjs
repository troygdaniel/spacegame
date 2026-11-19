// smoke: the dev server keeps the play log of the page, outside the repo, and refuses what it should (plain Node, no Chrome)
// Card space-game-playlog (tools/serve.mjs, /__playlog). The page POSTs the lines it keeps; the server appends them to one file a session in a folder that is not in the repo.
// Checks: playlogAppend on its own (the file name, the first "server" line, only well-formed lines of this session kept, a second batch appended to the same file, a bad
// session id and a folder inside the repo refused); then the real server on a free port with a temp folder: a good batch is 204 and in the file, a foreign Origin, a
// wrong Host, a wrong content type, an oversize body and a bad session id are refused, a GET of the path is not a log, and the default folder is outside the repo.
// Run: node tests/playlogserve.mjs   (exit code 1 on a failed check)
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve, dirname, sep } from 'node:path';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { startServer, playlogAppend, playlogDirOk, PLAYLOG_MAX } from '../tools/serve.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'lh-playlog-')), dir = join(tmp, 'logs');
const SID = 'abcd1234', line = (ev, extra = {}, s = SID) => JSON.stringify(Object.assign({ t: 1, s, ev }, extra));

// ---- the helper ----
let r = playlogAppend(dir, SID, [line('session', { phase: 'start' }), line('sample', { credits: 5 }), 'not json', JSON.stringify([1]), line('other', {}, 'ffffffff'), JSON.stringify({ ev: 'x'.repeat(40), s: SID }), JSON.stringify({ ev: 'no session' })].join('\n'), new Date(2026, 10, 18, 9, 5, 7), 'abc1234');
check('a batch is kept line by line: the two good lines of this session, the five others counted and dropped', r.ok && r.kept === 2 && r.dropped === 5, JSON.stringify(r));
check('the file is named <date>-<time>-<session>.jsonl', r.file === '2026-11-18-090507-abcd1234.jsonl', r.file);
let text = readFileSync(join(dir, r.file), 'utf8').trim().split('\n').map(l => JSON.parse(l));
check('a new file starts with a server line: the commit and the node version', text[0].ev === 'server' && text[0].commit === 'abc1234' && text[0].node === process.version && text.length === 3, JSON.stringify(text[0]));
r = playlogAppend(dir, SID, line('tab', { state: 'hidden' }) + '\n', new Date(2027, 0, 1), 'zzz');
text = readFileSync(join(dir, r.file), 'utf8').trim().split('\n');
check('the next batch of the same session goes to the same file (found by its session id), with no second server line', r.file === '2026-11-18-090507-abcd1234.jsonl' && text.length === 4 && text.filter(l => l.includes('"server"')).length === 1, text.length);
check('another session is another file', playlogAppend(dir, 'deadbeef', line('tab', {}, 'deadbeef') + '\n').file.endsWith('-deadbeef.jsonl') && readdirSync(dir).length === 2);
check('a bad session id is refused', ['', 'x', 'ABCD1234', '../../etc1', 'abcd123'].every(s => playlogAppend(dir, s, line('tab') + '\n').ok === false));
check('a folder inside the repo is refused, and the check says so', playlogAppend(join(REPO, 'logs-here'), SID, line('tab') + '\n').why === 'inside the repo' && !existsSync(join(REPO, 'logs-here')) && playlogDirOk(REPO) === false && playlogDirOk(join(REPO, 'a')) === false && playlogDirOk(tmp) === true);
check('the default folder is ~/dev/spacegame-playlogs, which is not inside the repo', playlogDirOk(join(homedir(), 'dev', 'spacegame-playlogs')) && !join(homedir(), 'dev', 'spacegame-playlogs').startsWith(REPO + sep));
check('the files are private to the owner (mode 600) and the folder too (700)', (statSync(join(dir, r.file)).mode & 0o777) === 0o600 && (statSync(dir).mode & 0o777) === 0o700, (statSync(join(dir, r.file)).mode & 0o777).toString(8));

// ---- the server ----
const root = join(tmp, 'root'); // a root with nothing to build: the server only has to answer
const logs2 = join(tmp, 'logs2');
const srv = startServer({ port: 0, root: tmp, content: join(tmp, 'nocontent'), out: join(tmp, 'out.js'), watch: false, modsToo: false, playlogs: logs2 });
const { port } = await srv.ready;
const post = (path, body, { host, origin, type = 'text/plain' } = {}) => new Promise((res, rej) => {
  const h = { Host: host || '127.0.0.1:' + port, 'Content-Length': Buffer.byteLength(body) }; if (type) h['Content-Type'] = type; if (origin) h.Origin = origin;
  const q = request({ host: '127.0.0.1', port, path, method: 'POST', headers: h }, resp => { let b = ''; resp.on('data', d => { b += d; }); resp.on('end', () => res({ status: resp.statusCode, body: b })); });
  q.on('error', e => res({ status: 0, body: String(e.message) })); q.end(body);
});
const get = path => new Promise((res, rej) => { const q = request({ host: '127.0.0.1', port, path, method: 'GET', headers: { Host: '127.0.0.1:' + port } }, resp => { let b = ''; resp.on('data', d => { b += d; }); resp.on('end', () => res({ status: resp.statusCode, body: b })); }); q.on('error', rej); q.end(); });
try {
  const ok = await post('/__playlog?s=' + SID, line('session', { phase: 'start' }) + '\n' + line('tab', { state: 'hidden' }) + '\n', { origin: 'http://127.0.0.1:' + port });
  check('a good batch from the server\'s own page is 204 and is in the file', ok.status === 204 && readdirSync(logs2).length === 1 && readFileSync(join(logs2, readdirSync(logs2)[0]), 'utf8').includes('"phase":"start"'), JSON.stringify(ok));
  const noOrigin = await post('/__playlog?s=' + SID, line('tab', { state: 'visible' }) + '\n');
  check('a request with no Origin (a script, a beacon from a file) is accepted', noOrigin.status === 204, JSON.stringify(noOrigin));
  check('a page of another site (a foreign Origin) is refused and writes nothing', (await post('/__playlog?s=' + SID, line('tab') + '\n', { origin: 'https://example.com' })).status === 403);
  check('a wrong Host header is refused', (await post('/__playlog?s=' + SID, line('tab') + '\n', { host: 'evil.example:' + port })).status === 403);
  check('a body that is not text/plain is refused', (await post('/__playlog?s=' + SID, line('tab') + '\n', { type: 'application/json' })).status === 415 && (await post('/__playlog?s=' + SID, line('tab') + '\n', { type: '' })).status === 415);
  check('a bad session id is a 400', (await post('/__playlog?s=nope', line('tab') + '\n')).status === 400 && (await post('/__playlog', line('tab') + '\n')).status === 400);
  const big = await post('/__playlog?s=' + SID, ('x'.repeat(1000) + '\n').repeat(PLAYLOG_MAX.body / 1000 + 50));
  check('a body over 256 KB is refused', big.status === 413 || big.status === 0, JSON.stringify(big).slice(0, 80));
  check('another path with POST is still 405: the play log is the only thing written', (await post('/index.html', 'x')).status === 405 && (await post('/__events', 'x')).status === 405);
  check('a GET of the log path is not a log: it is not a file of the root', (await get('/__playlog')).status === 404);
  const files = readdirSync(logs2);
  check('after all that there is one file and only the two good batches are in it', files.length === 1 && readFileSync(join(logs2, files[0]), 'utf8').trim().split('\n').length === 4, readFileSync(join(logs2, files[0]), 'utf8'));
} finally { await srv.close(); rmSync(tmp, { recursive: true, force: true }); }
check('the folder inside the repo was never made', !existsSync(join(REPO, 'logs-here')));
console.log(failed ? `PLAYLOG SERVE FAIL (${failed} of ${n})` : `PLAYLOG SERVE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
