// smoke: hygiene: no keys, emails, phone numbers or personal paths in anything we publish (no browser)
// Hygiene scan: nothing we publish may carry a key, a token, an email address, a phone number or a personal path.
// Run: node tests/hygiene.mjs        (exit code 1 on a finding; no Chrome, takes well under a second)
// Scans every tracked file, every untracked file git would not ignore, and everything under content/ and mods/example/
// (content is where a modder would paste something by mistake). Skips binary files and the vendored phaser.min.js.
// A finding prints as  file:line  what  (first four characters, then the length): the value itself is never printed.
// If a finding is a false alarm, add it to ALLOW below with the reason; do not weaken a rule.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['phaser.min.js', 'tests/hygiene.mjs']); // vendored library; this file, which holds the patterns
const TOP = ['content', 'mods/example'];                     // scanned from disk even if git does not list them

// a random-looking value: letters and digits mixed, no spaces (a word like "somethingDescriptive" is not one)
const randomish = v => v.length >= 24 && /\d/.test(v) && /[A-Za-z]/.test(v);

const RULES = [
  { name: 'API key (sk-...)', re: /\bsk-[A-Za-z0-9_-]{16,}/g },
  { name: 'bearer token', re: /\bBearer\s+[A-Za-z0-9._~+\/=-]{16,}/g },
  { name: 'Authorization header with a value', re: /Authorization\s*:\s*['"]?(?:[A-Za-z]+\s+)?[A-Za-z0-9._~+\/=-]{20,}/gi },
  { name: 'key, token or secret with a random-looking value', re: /(?:api[_-]?key|token|secret|passw(?:or)?d|\bkey)['"]?\s*[:=]\s*['"]?([A-Za-z0-9+\/_=-]{24,})/gi, test: m => randomish(m[1]) },
  { name: 'email address', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  { name: 'phone number', re: /(?<![\d.])(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\d)/g },
  { name: 'personal path (/Users/name or /home/name)', re: /\/(?:Users|home)\/[A-Za-z0-9._-]+/g },
  { name: 'personal path (C:\\Users\\name)', re: /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+/g }
];

// Known false alarms: { file: regex on the repo-relative path, rule: the rule name, why: the reason }. Empty is good.
const ALLOW = [];

// every finding in one text: [{ line, rule, text }]
export function scanText(text, file = '') {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const r of RULES) {
      r.re.lastIndex = 0;
      for (let m; (m = r.re.exec(line));) {
        if (r.test && !r.test(m)) continue;
        if (ALLOW.some(a => a.rule === r.name && a.file.test(file))) continue;
        out.push({ line: i + 1, rule: r.name, text: m[0] });
      }
    }
  });
  return out;
}

const redact = s => s.slice(0, 4) + '... (' + s.length + ' characters)';

// the scanner must catch what it claims to; the samples are built in pieces so this file never holds a real-looking one
const SAMPLES = [
  ['sk-' + 'a1B2c3D4e5F6g7H8i9J0k1L2', 'API key (sk-...)'],
  ['Authorization: Bearer ' + 'abcdefghij0123456789abcd', 'bearer token'],
  ['Authorization: ' + 'abcdefghij0123456789abcd', 'Authorization header with a value'],
  ['const api_key = "' + 'k3J9x0Q7m2Z8w4N6b1V5c3X7' + '"', 'key, token or secret with a random-looking value'],
  ['write to ' + 'someone' + '@' + 'example' + '.com', 'email address'],
  ['call ' + '416' + '-' + '555' + '-' + '0123', 'phone number'],
  ['call ' + '(905) 555 ' + '0123', 'phone number'],
  ['cd ' + '/Users' + '/alex/project', 'personal path (/Users/name or /home/name)'],
  ['cd ' + '/home' + '/alex/project', 'personal path (/Users/name or /home/name)'],
  ['C:' + '\\Users' + '\\alex\\Desktop', 'personal path (C:\\Users\\name)']
];
const CLEAN = [
  'const SAVE_KEY = "longhaul.save.v1";', 'key: "somethingDescriptiveButNotRandomAtAll"', 'size 1280 x 720, 36 000 px, 4 500 cr',
  'index.html#space and #surface', 'a path like /Users/<name> in prose', 'Bearer of bad news', 'sk-learn is a library'
];
function selfTest() {
  let bad = 0;
  for (const [text, rule] of SAMPLES) {
    if (!scanText(text).some(f => f.rule === rule)) { console.error(`  FAIL scanner missed a planted "${rule}"`); bad++; }
  }
  for (const text of CLEAN) {
    const f = scanText(text);
    if (f.length) { console.error(`  FAIL scanner flagged clean text "${text}": ${f.map(x => x.rule).join(', ')}`); bad++; }
  }
  return bad === 0;
}

function walk(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(relative(ROOT, p));
  }
}
function files() {
  const set = new Set();
  const git = args => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter(Boolean);
  try { git(['ls-files']).forEach(f => set.add(f)); git(['ls-files', '--others', '--exclude-standard']).forEach(f => set.add(f)); }
  catch (e) { const all = []; walk(ROOT, all); all.filter(f => !f.startsWith('tests/out/')).forEach(f => set.add(f)); } // not a git checkout: walk the folder
  const extra = []; TOP.forEach(d => walk(join(ROOT, d), extra)); extra.forEach(f => set.add(f));
  return [...set].filter(f => !SKIP.has(f)).sort();
}

if (!selfTest()) { console.error('HYGIENE FAIL (the scanner itself is broken)'); process.exit(1); }
let scanned = 0, found = 0;
for (const f of files()) {
  const p = join(ROOT, f);
  if (!existsSync(p) || !statSync(p).isFile() || statSync(p).size > 4 << 20) continue;
  const buf = readFileSync(p);
  if (buf.includes(0)) continue; // binary
  scanned++;
  for (const hit of scanText(buf.toString('utf8'), f)) { console.error(`  FAIL ${f}:${hit.line}  ${hit.rule}  ${redact(hit.text)}`); found++; }
}
console.log(`  scanned ${scanned} files, ${found} finding${found === 1 ? '' : 's'}`);
console.log(found ? 'HYGIENE FAIL' : 'HYGIENE PASS');
process.exitCode = found ? 1 : 0;
