// Builds content.generated.js from the markdown in content/ (docs/MODDING.md section 4).
// Why a build step: the game opens from file://, where the browser will not fetch() other local files, so the markdown is
// read here and written into one classic script that index.html loads with a script tag.
//   node tools/build-content.mjs             build, print every problem, write content.generated.js
//   node tools/build-content.mjs --watch     build again whenever a file in content/ or mods/ changes
//   node tools/build-content.mjs --strict    exit 1 if there is any error (warnings do not count); what the tests use
//   node tools/build-content.mjs --check     write nothing; exit 1 if content.generated.js is not what a build would make
//   node tools/build-content.mjs --seal     say that THIS content is the shipped core pack (maintainers only: see below)
//   --dir content  --out content.generated.js   other places (tests use them)
// Packs (docs/MODDING.md 13): every folder in mods/ is a pack, checked on its own and written, with its problems, into mods.generated.js.
//   --mods mods  --mods-out mods.generated.js   other places (tests use them); with --dir or --out and no --mods the packs are left alone
// The generated file carries two hashes: hash (what is in it now) and core (the shipped pack). A normal build keeps core as it
// was, so after you edit content/ the two differ and the Title screen says MODDED. Only --seal moves core to the new hash,
// which is for a change to the shipped content itself; tests/contentapply.mjs fails if the committed file is not sealed.
// Needs Node 22+, no packages. The parser and schema are src/content.js, the same file the game uses.
import { readdirSync, readFileSync, writeFileSync, existsSync, watch } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
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

// the ids the game's own code defines, so a station file may say system: halcyon without a systems/halcyon.md (docs/MODDING.md 5.1: the code defaults
// stay). Read from src/data_systems.js, which is plain data and runs in a bare vm.
let CODE_IDS = null;
function codeKnown(type, id) {
  if (!CODE_IDS) {
    CODE_IDS = { system: new Set(), station: new Set() };
    try {
      const S = vm.runInNewContext(readFileSync(join(ROOT, 'src/data_systems.js'), 'utf8') + '\n;SYSTEMS', {});
      Object.keys(S).forEach(k => { CODE_IDS.system.add(k); (S[k].bodies || []).forEach(b => { if (b.type === 'station') CODE_IDS.station.add(b.id); }); });
    } catch (e) { /* no code ids: every reference then needs its own file, as before */ }
  }
  return !!(CODE_IDS[type] && CODE_IDS[type].has(id));
}

// ---------- packs: mods/<name>/ laid over the core pack, each checked and written on its own ----------
// the text of mods.generated.js: one pack a line (a change in git is readable); the same input always gives the same text
export function generateMods(packs, errors) {
  const lines = a => a.map(x => '  ' + JSON.stringify(x)).join(',\n');
  return [
    '// mods.generated.js: made by tools/build-content.mjs from the packs in mods/ (docs/MODDING.md 13). Do not edit it by hand:',
    '// add or change a pack and run   node tools/build-content.mjs',
    '// The game loads this with a script tag (so it works from file://). Each pack is checked on its own; the player turns a pack on in the Mods screen.',
    'var MODS = {',
    '  version: 1,',
    '  packs: [' + (packs.length ? '\n' + lines(packs) + '\n  ' : '') + '],',
    '  errors: [' + (errors.length ? '\n' + lines(errors) + '\n  ' : '') + ']',
    '};',
    ''
  ].join('\n');
}

// the folders of mods/ that are packs: [{ name, dir }] in name order; a folder whose name is not a pack name is a problem, not a pack
export function readPacks(dir = join(ROOT, 'mods')) {
  const packs = [], errors = [];
  if (!existsSync(dir)) return { packs, errors };
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!e.isDirectory() || e.name[0] === '_' || e.name[0] === '.') continue;
    if (!ContentLib.packName(e.name)) { errors.push({ level: 'error', path: 'mods/' + e.name, line: 0, field: '', message: 'the folder name is not a pack name (lower-case letters, digits and dashes, starting with a letter, 40 characters at most). Skipped the pack.' }); continue; }
    if (packs.length >= ContentLib.LIMITS.packs) { errors.push({ level: 'error', path: 'mods/' + e.name, line: 0, field: '', message: 'more than ' + ContentLib.LIMITS.packs + ' packs; the rest are ignored.' }); continue; }
    packs.push({ name: e.name, dir: join(dir, e.name) });
  }
  return { packs, errors };
}

// build the packs once. coreEntries: the entries of the core pack, so a pack may refer to something the core defines (a station, a system)
export function buildMods({ dir = join(ROOT, 'mods'), out = join(ROOT, 'mods.generated.js'), write = true, coreEntries = [], opts = {} } = {}) {
  const found = readPacks(dir), core = new Set(coreEntries.map(e => e.type + ':' + e.id));
  const known = (ref, id) => core.has(ref + ':' + id) || codeKnown(ref, id);
  const packs = found.packs.map(p => {
    const files = readPack(p.dir, 'mods/' + p.name + '/'), info = join(p.dir, '_pack.md');
    if (existsSync(info)) files.push({ path: 'mods/' + p.name + '/_pack.md', text: readFileSync(info, 'utf8') });
    return ContentLib.loadPack(p.name, files, Object.assign({ known }, opts));
  });
  const old = existsSync(out) ? readFileSync(out, 'utf8') : null, text = generateMods(packs, found.errors), changed = old !== text;
  if (write && changed) writeFileSync(out, text);
  return { packs, errors: found.errors, text, changed, wrote: write && changed };
}

// build once. write:false leaves the file alone (tests); returns the result, the text and whether the file on disk differs
// core: the hash of the shipped pack. Given (tests), it is used as is; seal: true makes this build the shipped pack; otherwise the
// core already in the file at out stays, and a first build seals itself.
export function build({ dir = join(ROOT, 'content'), prefix = 'content/', out = join(ROOT, 'content.generated.js'), write = true, opts = {}, core, seal = false } = {}) {
  const result = ContentLib.loadAll(readPack(dir, prefix), Object.assign({ known: codeKnown }, opts));
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
  const modsToo = has('--mods') || (!has('--dir') && !has('--out')); // a build into another place (tests) leaves the packs alone unless it is told where they are
  const modsDir = resolve(ROOT, val('--mods', 'mods')), modsOut = resolve(ROOT, val('--mods-out', 'mods.generated.js'));
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
    let m = null, modErrors = [];
    if (modsToo) {
      m = buildMods({ dir: modsDir, out: modsOut, write: !has('--check'), coreEntries: b.result.entries });
      m.errors.forEach(e => console.log('  ' + ContentLib.formatError(e)));
      m.packs.forEach(p => {
        const perr = p.errors.filter(e => e.level === 'error'), pw = p.errors.length - perr.length;
        p.errors.forEach(e => console.log('  ' + ContentLib.formatError(e)));
        console.log(`pack ${p.name}: ${p.files} files, ${p.entries.length} entries, ${perr.length} problem${perr.length === 1 ? '' : 's'}` + (pw ? `, ${pw} warning${pw === 1 ? '' : 's'}` : ''));
      });
      modErrors = m.errors.concat(...m.packs.map(p => p.errors)).filter(e => e.level === 'error');
      console.log(`mods: ${m.packs.length} pack${m.packs.length === 1 ? '' : 's'}` + (has('--check') ? (m.changed ? '  -> mods.generated.js is OUT OF DATE: run node tools/build-content.mjs' : '  -> mods.generated.js is up to date')
        : '  -> ' + modsOut.replace(ROOT + '/', '') + (m.wrote ? ' written' : ' unchanged')));
    }
    return { b, errors: errors.concat(modErrors), m };
  };
  const { b, errors, m } = once();
  if ((has('--strict') && errors.length) || (has('--check') && (b.changed || (m && m.changed)))) process.exitCode = 1;
  if (has('--watch')) {
    console.log('watching ' + dir.replace(ROOT + '/', '') + (modsToo ? ' and ' + modsDir.replace(ROOT + '/', '') : '') + ' (Ctrl+C stops)');
    let t = null;
    const again = () => { clearTimeout(t); t = setTimeout(() => { console.log('--'); once(); }, 150); };
    watch(dir, { recursive: true }, again);
    if (modsToo && existsSync(modsDir)) watch(modsDir, { recursive: true }, again);
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
