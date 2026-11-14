// Builds content.generated.js from the markdown in content/ (docs/MODDING.md section 4).
// Why a build step: the game opens from file://, where the browser will not fetch() other local files, so the markdown is
// read here and written into one classic script that index.html loads with a script tag.
//   node tools/build-content.mjs             build, print every problem, write content.generated.js
//   node tools/build-content.mjs --watch     build again whenever a file in content/ changes
//   node tools/build-content.mjs --strict    exit 1 if there is any error (warnings do not count); what the tests use
//   node tools/build-content.mjs --check     write nothing; exit 1 if content.generated.js is not what a build would make
//   node tools/build-content.mjs --seal     say that THIS content is the shipped core pack (maintainers only: see below)
//   --dir content  --out content.generated.js   other places (tests use them)
// The generated file carries two hashes: hash (what is in it now) and core (the shipped pack). A normal build keeps core as it
// was, so after you edit content/ the two differ and the Title screen says MODDED. Only --seal moves core to the new hash,
// which is for a change to the shipped content itself; tests/contentapply.mjs fails if the committed file is not sealed.
// Needs Node 22+, no packages. The parser and schema are src/content.js, the same file the game uses.
import { readdirSync, readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ContentLib = createRequire(import.meta.url)('../src/content.js');

// every .md under dir (names starting with _ or . are skipped, folders too), paths with / and a prefix like content/
export function readPack(dir, prefix = 'content/') {
  const files = [];
  const walk = (d, rel) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name[0] === '_' || e.name[0] === '.') continue;
      if (e.isDirectory()) walk(join(d, e.name), rel + e.name + '/');
      else if (e.isFile() && /\.md$/i.test(e.name)) files.push({ path: prefix + rel + e.name, text: readFileSync(join(d, e.name), 'utf8') });
    }
  };
  if (existsSync(dir)) walk(dir, '');
  return files;
}

// the text of content.generated.js: one entry per line so a change in git is readable; the same input always gives the same text
export function generate(result, core) {
  const lines = a => a.map(x => '  ' + JSON.stringify(x)).join(',\n');
  return [
    '// content.generated.js: made by tools/build-content.mjs from the markdown in content/. Do not edit it by hand:',
    '// change the markdown and run   node tools/build-content.mjs',
    '// The game loads this with a script tag (so it works from file://). It holds every valid entry and the problems found.',
    'var CONTENT = {',
    '  version: 1, hash: ' + JSON.stringify(result.hash) + ', core: ' + JSON.stringify(core || result.hash) + ', files: ' + result.files + ',',
    '  entries: [' + (result.entries.length ? '\n' + lines(result.entries) + '\n  ' : '') + '],',
    '  errors: [' + (result.errors.length ? '\n' + lines(result.errors) + '\n  ' : '') + ']',
    '};',
    ''
  ].join('\n');
}

// build once. write:false leaves the file alone (tests); returns the result, the text and whether the file on disk differs
// core: the hash of the shipped pack. Given (tests), it is used as is; seal: true makes this build the shipped pack; otherwise the
// core already in the file at out stays, and a first build seals itself.
export function build({ dir = join(ROOT, 'content'), prefix = 'content/', out = join(ROOT, 'content.generated.js'), write = true, opts = {}, core, seal = false } = {}) {
  const result = ContentLib.loadAll(readPack(dir, prefix), opts);
  const old = existsSync(out) ? readFileSync(out, 'utf8') : null;
  const kept = old && /\bcore:\s*"([0-9a-f]{1,16})"/.exec(old);
  const sealed = seal ? result.hash : core || (kept && kept[1]) || result.hash;
  const text = generate(result, sealed);
  const changed = old !== text;
  if (write && changed) writeFileSync(out, text);
  return { result, text, changed, wrote: write && changed, core: sealed, modded: sealed !== result.hash };
}

function main() {
  const args = process.argv.slice(2), has = f => args.includes(f), val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
  const dir = resolve(ROOT, val('--dir', 'content')), out = resolve(ROOT, val('--out', 'content.generated.js'));
  const once = () => {
    const b = build({ dir, out, write: !has('--check'), seal: has('--seal') });
    const errors = b.result.errors.filter(e => e.level === 'error'), warns = b.result.errors.length - errors.length;
    b.result.errors.forEach(e => console.log('  ' + ContentLib.formatError(e)));
    const kinds = {}; b.result.entries.forEach(e => { kinds[e.type] = (kinds[e.type] || 0) + 1; });
    console.log(`content: ${b.result.files} files, ${b.result.entries.length} entries` + (b.result.entries.length ? ' (' + Object.entries(kinds).map(([k, n]) => n + ' ' + k).join(', ') + ')' : '') +
      `, ${errors.length} problem${errors.length === 1 ? '' : 's'}` + (warns ? `, ${warns} warning${warns === 1 ? '' : 's'}` : '') +
      (has('--check') ? (b.changed ? '  -> content.generated.js is OUT OF DATE: run node tools/build-content.mjs' : '  -> content.generated.js is up to date')
        : '  -> ' + out.replace(ROOT + '/', '') + (b.wrote ? ' written' : ' unchanged')));
    if (b.modded) console.log('  note: this content differs from the shipped core pack (hash ' + b.result.hash + ', shipped ' + b.core + '), so the game will say MODDED. Maintainers changing the shipped content run with --seal.');
    return { b, errors };
  };
  const { b, errors } = once();
  if ((has('--strict') && errors.length) || (has('--check') && b.changed)) process.exitCode = 1;
  if (has('--watch')) {
    console.log('watching ' + dir.replace(ROOT + '/', '') + ' (Ctrl+C stops)');
    let t = null;
    watch(dir, { recursive: true }, () => { clearTimeout(t); t = setTimeout(() => { console.log('--'); once(); }, 150); });
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
