// smoke: tests/smoke.sh stops at the first failed step with the cheap steps first, and ALL=1 goes on to the end (no browser; a stand-in repo in a temp folder)
// The check for card retro-smoke-fail-fast (docs/SMOKE.md 5). The real smoke.sh runs in a throwaway folder with stand-in tools and a
// few stand-in tests (one that fails, one that counts as a Chrome test but only prints a line), so no Chrome and no game is touched.
// Run: node tests/smokefail.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };

// smoke.sh calls a file a Chrome test when its text names the Chrome driver; this file must not name it, so the word is built here
const DRIVER = 'cd' + 'p.mjs';
const work = mkdtempSync(join(tmpdir(), `longhaul-smokefail-${process.pid}-`));
const put = (rel, text) => { mkdirSync(dirname(join(work, rel)), { recursive: true }); writeFileSync(join(work, rel), text); };
const smoke = (env, ...args) => spawnSync('bash', ['tests/smoke.sh', ...args], { cwd: work, encoding: 'utf8', env: Object.assign({}, process.env, { ALL: '', FULL: '', LONGHAUL_LEDGER: join(work, 'runs.tsv') }, env) }); // the run ledger (tests/ledger.mjs) of the stand-in runs is a file in the throwaway folder, never the real one
const reset = () => {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, 'tests'), { recursive: true });
  for (const f of ['smoke.sh', 'ledger.mjs', 'ledger-on.mjs']) copyFileSync(join(ROOT, 'tests', f), join(work, 'tests', f)); // smoke.sh loads the ledger hook for every test
  put('src/a.js', 'var a = 1;\n');
  put('tools/build-content.mjs', "console.log('  content check ran');\n");
  put('tools/economy-sim.mjs', "console.log('  ECON RAN');\n");
  put('tests/a-node.mjs', "// smoke: first node test\nconsole.log('  A RAN');\n");
  put('tests/b-node.mjs', "// smoke: second node test, it fails\nconsole.log('  B RAN');\nprocess.exit(1);\n");
  put('tests/c-node.mjs', "// smoke: third node test\nconsole.log('  C RAN');\n");
  put('tests/z-chrome.mjs', `// smoke: a Chrome test (it only prints)\n// uses ${DRIVER}\nconsole.log('  CHROME RAN');\n`);
};
const at = (s, word) => s.indexOf(word);

try {
  // 1. a failing node test: the run stops there; later node tests, the economy step and the Chrome test never start
  reset();
  let r = smoke({});
  check('a failed test ends the run with exit 1', r.status === 1, r.status + r.stdout);
  check('the tests before it ran, the failed one ran', /A RAN/.test(r.stdout) && /B RAN/.test(r.stdout), r.stdout);
  check('nothing after it ran: not the next node test, not the economy step, not Chrome', !/C RAN|ECON RAN|CHROME RAN/.test(r.stdout), r.stdout);
  check('it says where it stopped and how to go on', /SMOKE FAIL: stopped at the first failure \(step \d+\/\d+\); ALL=1 bash tests\/smoke\.sh goes on/.test(r.stdout), r.stdout);

  // 2. ALL=1: every step runs, every failure is listed, still exit 1
  r = smoke({ ALL: '1' });
  check('ALL=1 runs every step after a failure', /C RAN/.test(r.stdout) && /ECON RAN/.test(r.stdout) && /CHROME RAN/.test(r.stdout), r.stdout);
  check('ALL=1 still fails the run and says SMOKE FAIL, not a stop', r.status === 1 && /SMOKE FAIL\s*$/.test(r.stdout.trim()) && !/stopped at/.test(r.stdout), r.status + r.stdout.slice(-300));

  // 3. all pass: exit 0, SMOKE PASS, and the order is node tests, then the economy step, then the Chrome tests
  reset(); rmSync(join(work, 'tests/b-node.mjs'));
  r = smoke({});
  check('with no failure the run passes', r.status === 0 && /SMOKE PASS/.test(r.stdout), r.status + r.stdout);
  const ledger = (() => { try { return readFileSync(join(work, 'runs.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')); } catch (e) { return []; } })();
  check('every test the smoke ran left one smoke line in the run ledger, in order', ledger.map(l => l[1] + ':' + l[4] + ':' + l[6]).join() === 'a-node:pass:smoke,c-node:pass:smoke,z-chrome:pass:smoke', JSON.stringify(ledger));
  check('no-browser steps come before the Chrome test', at(r.stdout, 'content check ran') < at(r.stdout, 'A RAN') && at(r.stdout, 'C RAN') < at(r.stdout, 'ECON RAN') && at(r.stdout, 'ECON RAN') < at(r.stdout, 'CHROME RAN'), r.stdout);

  // 4. a Chrome test that fails stops the run too (the last step, but it must still be exit 1 and say so)
  put('tests/z-chrome.mjs', `// smoke: a Chrome test that fails\n// uses ${DRIVER}\nprocess.exit(1);\n`);
  r = smoke({});
  check('a failed Chrome test ends the run with exit 1', r.status === 1 && /stopped at the first failure/.test(r.stdout), r.status + r.stdout.slice(-300));

  // 5. a syntax error is the cheapest failure: it stops the run before any test starts
  reset(); put('src/bad.js', 'var = ;\n');
  r = smoke({});
  check('node --check failing stops the run before any test', r.status === 1 && !/A RAN|B RAN|ECON RAN|CHROME RAN/.test(r.stdout) && /stopped at the first failure \(step 1\//.test(r.stdout), r.stdout);
  r = smoke({ ALL: '1' });
  check('ALL=1 goes past the syntax error and runs the tests', r.status === 1 && /A RAN/.test(r.stdout) && /CHROME RAN/.test(r.stdout), r.stdout);

  // 6. a test file with no marker is named before anything runs
  reset(); put('tests/forgot.mjs', "console.log('  FORGOT RAN');\n");
  r = smoke({});
  check('a file with no marker is named and nothing runs', r.status === 1 && /FAIL tests\/forgot\.mjs has no \/\/ smoke: line/.test(r.stdout) && !/== 1\//.test(r.stdout) && /before step 1/.test(r.stdout), r.stdout);
  r = smoke({ ALL: '1' });
  check('ALL=1 names it and then runs the rest', r.status === 1 && /FAIL tests\/forgot\.mjs/.test(r.stdout) && /CHROME RAN/.test(r.stdout), r.stdout);
  r = smoke({}, '--list');
  check('--list names it and runs nothing', r.status === 1 && /FAIL tests\/forgot\.mjs/.test(r.stdout) && /LIST FAIL/.test(r.stdout) && !/A RAN/.test(r.stdout), r.stdout);
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n${failed ? 'SMOKE FAIL-FAST CHECK FAIL' : 'SMOKE FAIL-FAST CHECK PASS'}: ${n - failed}/${n} checks`);
process.exit(failed ? 1 : 0);
