// smoke: a mock two-branch merge: tests found by their own // smoke: line and the sealed content header merge with no conflict (no browser; uses git in a temp folder)
// The proof for card space-game-smoke-autodiscover (docs/SMOKE.md 3). A throwaway git repo gets this repo's build script, parser,
// smoke runner and the good fixture content, sealed and committed. Two branches each add one content file and one test, build with
// --seal and commit; the merge must be clean, --check must pass with no rebuild, and smoke.sh --list must show both tests. As a
// control, the same two branches with the old header (a hash per branch) must conflict. Run: node tests/mergeproof.mjs
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };

if (spawnSync('git', ['--version']).status !== 0) {
  console.log('  skipped: no git on this machine\n\nMERGE PROOF PASS: 0 checks (skipped)');
  process.exit(0);
}

const repo = mkdtempSync(join(tmpdir(), `longhaul-mergeproof-${process.pid}-`));
// git with nobody's global config, hooks or signing; the identity is a plain word (no address: the hygiene scan reads this file)
const ENV = Object.assign({}, process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_AUTHOR_NAME: 'proof', GIT_AUTHOR_EMAIL: 'proof', GIT_COMMITTER_NAME: 'proof', GIT_COMMITTER_EMAIL: 'proof' });
const git = (...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...a], { cwd: repo, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...a], { cwd: repo, env: ENV, encoding: 'utf8' });
const node = (...a) => spawnSync(process.execPath, a, { cwd: repo, encoding: 'utf8' });
const bash = (...a) => spawnSync('bash', a, { cwd: repo, encoding: 'utf8' });
const build = (...flags) => node('tools/build-content.mjs', ...flags);
const commit = msg => { git('add', '-A'); git('commit', '-q', '-m', msg); return git('rev-parse', '--short', 'HEAD'); };
const write = (rel, text) => { mkdirSync(dirname(join(repo, rel)), { recursive: true }); writeFileSync(join(repo, rel), text); };
const gen = () => readFileSync(join(repo, 'content.generated.js'), 'utf8');

try {
  // the base: the pieces of this repo the proof needs, the good fixture pack as content/, sealed
  for (const f of ['tools/build-content.mjs', 'src/content.js', 'src/data_systems.js', 'src/data_ships.js', 'tests/smoke.sh']) cpSync(join(ROOT, f), join(repo, f));
  cpSync(join(ROOT, 'tests/fixtures/content-good'), join(repo, 'content'), { recursive: true });
  write('tools/economy-sim.mjs', '// stand-in for the fixed step; --list never runs it\n');
  git('init', '-q', '-b', 'main');
  let r = build('--seal', '--strict');
  check('the base builds and seals with no problem', r.status === 0 && /sealed: this content is the shipped core pack/.test(r.stdout), r.stdout + r.stderr);
  check('its header is the constant sealed line', gen().split('\n')[4] === '  version: 1, core: "sealed",', gen().split('\n')[4]);
  const base = commit('base');
  const mission = (id, title) => `---\ntype: mission\nkind: courier\ntitle: ${title}\nreward: 300\n---\n## Offer\nA parcel for {station}.\n`;
  const test = what => `// smoke: ${what}\nconsole.log('  ok  ${what}');\n`;

  // branch a: a file that sorts before the fixture's missions, and a test; branch b: one that sorts after, and a test
  git('checkout', '-q', '-b', 'a', base);
  write('content/missions/aa-proof.md', mission('aa-proof', 'Proof A'));
  write('tests/aaproof.mjs', test('proof test a'));
  r = build('--seal', '--strict'); check('branch a builds clean', r.status === 0, r.stdout + r.stderr);
  const a = commit('a: a mission and a test');
  git('checkout', '-q', '-b', 'b', base);
  write('content/missions/zz-proof.md', mission('zz-proof', 'Proof B'));
  write('tests/zzproof.mjs', test('proof test b'));
  r = build('--seal', '--strict'); check('branch b builds clean', r.status === 0, r.stdout + r.stderr);
  const b = commit('b: a mission and a test');
  check('the two branches differ in the generated file', git('diff', '--stat', a, b, '--', 'content.generated.js') !== '');

  // the merge
  git('checkout', '-q', 'a');
  let m = tryGit('merge', '--no-edit', 'b');
  check('a merges b with no conflict', m.status === 0 && !/CONFLICT/.test(m.stdout + m.stderr), m.stdout + m.stderr);
  check('smoke.sh did not change on either branch (no list to edit)', git('diff', '--stat', base, 'HEAD', '--', 'tests/smoke.sh') === '');
  const merged = gen();
  check('the merged file is still sealed and holds both missions', /core: "sealed"/.test(merged) && /aa-proof/.test(merged) && /zz-proof/.test(merged));
  r = build('--check');
  check('--check passes on the merged file with no rebuild: it is what a build makes', r.status === 0 && /up to date/.test(r.stdout), r.stdout + r.stderr);
  const list = bash('tests/smoke.sh', '--list');
  check('smoke.sh --list finds both new tests by their // smoke: line', list.status === 0 && /tests\/aaproof\.mjs: proof test a/.test(list.stdout) && /tests\/zzproof\.mjs: proof test b/.test(list.stdout) && /LIST OK: 2 tests/.test(list.stdout), list.stdout + list.stderr);
  write('tests/forgotten.mjs', 'console.log(1);\n');
  const bad = bash('tests/smoke.sh', '--list');
  check('a test file with no // smoke: line fails the list by name', bad.status === 1 && /FAIL tests\/forgotten\.mjs has no \/\/ smoke: line/.test(bad.stdout), bad.stdout);
  rmSync(join(repo, 'tests/forgotten.mjs'));

  // the control: the old header, a hash per branch, conflicts
  const oldHeader = (text, hash) => text.replace('  version: 1, core: "sealed",', `  version: 1, hash: "${hash}", core: "${hash}", files: 10,`);
  git('checkout', '-q', '-b', 'old-a', a);
  write('content.generated.js', oldHeader(gen(), 'aaaa1111')); commit('old header a');
  git('checkout', '-q', '-b', 'old-b', b);
  write('content.generated.js', oldHeader(gen(), 'bbbb2222')); commit('old header b');
  m = tryGit('merge', '--no-edit', 'old-a');
  check('control: with a hash in the header the same two branches conflict', m.status !== 0 && /CONFLICT/.test(m.stdout + m.stderr), m.stdout + m.stderr);
  tryGit('merge', '--abort');
} finally {
  rmSync(repo, { recursive: true, force: true });
}

console.log(failed ? `\nMERGE PROOF FAIL: ${failed} of ${n} checks failed` : `\nMERGE PROOF PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;
