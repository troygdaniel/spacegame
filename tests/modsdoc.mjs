// docs/MODS.md, the ten-minute modder guide (card space-game-m8-modder-guide). No browser: it keeps the guide true.
//   1. the field reference between the marker lines is what tools/mods-fields.mjs writes from the schema in src/content.js
//   2. every example file in the guide (a fence marked  md file=content/...) is a whole, valid file with no problems
//   3. the ids the guide says the game knows are the ones in the code, and the game still cannot ADD new ones (the guide says so)
//   4. the error messages the guide quotes are still said by the code, the build flags it names exist, the files it names exist
// If one fails, the code changed and the guide says something that is no longer true: change docs/MODS.md (or run node tools/mods-fields.mjs --write).
// Run: node tests/modsdoc.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { spliced, staleNotes } from '../tools/mods-fields.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = createRequire(import.meta.url)('../src/content.js');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } else console.log(`  ok   ${name}`); };

const doc = read('docs/MODS.md');

console.log('1. the field reference is current');
check('the two marker lines are in the guide', doc.includes('<!-- fields:start') && doc.includes('<!-- fields:end -->'));
const next = spliced(doc);
check('what is between them is what tools/mods-fields.mjs writes', next === doc, 'run: node tools/mods-fields.mjs --write');
check('no note in tools/mods-fields.mjs is for a field the schema lacks', staleNotes().length === 0, staleNotes().join(', '));

console.log('2. the example files in the guide are whole and valid');
const fences = [...doc.matchAll(/```md file=(\S+)\n([\s\S]*?)```/g)].map(m => ({ path: m[1], text: m[2] }));
check('the guide has example files to try (at least the Escort call and MOSS)', fences.length >= 2, String(fences.length));
for (const f of fences) {
  const r = C.loadAll([{ path: f.path, text: f.text }], { strictRefs: false });
  check(`${f.path} loads with no problems`, r.errors.length === 0 && r.entries.length === 1, r.errors.map(e => C.formatError(e)).join(' | '));
  const folder = f.path.split('/')[1], type = r.entries[0] && r.entries[0].type;
  check(`${f.path} is in the folder of its type`, !!type && C.SCHEMA[type].folder === folder, String(type));
}

console.log('3. the ids the guide names are the game\'s, and the game cannot add new ones');
// run the game's own tables in a sandbox (no browser): what it uses at run time is a stand-in that accepts anything
const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : noop), apply: () => noop, construct: () => noop });
const real = vm.runInNewContext('globalThis'), builtins = new Set(Object.getOwnPropertyNames(real)), box = {};
const ctx = vm.createContext(new Proxy(box, {
  has: (t, k) => typeof k === 'string' && (k in t || !builtins.has(k)),
  get: (t, k) => (k in t ? t[k] : builtins.has(k) ? real[k] : noop), set: (t, k, v) => { t[k] = v; return true; }
}));
for (const f of ['common', 'data_parts', 'missions', 'enemies', 'shop']) {
  try { vm.runInContext(read('src/' + f + '.js'), ctx, { filename: f + '.js' }); } catch (e) { check('the game table file src/' + f + '.js runs in the sandbox', false, e.message.split('\n')[0]); }
}
const ids = expr => { try { return vm.runInContext(expr, ctx); } catch (e) { return ['ERROR ' + e.message]; } };
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const MISSIONS = ids('MISSIONS.map(m => m.id)'), NPCS = ids('NPCS.map(n => n.id)'), PIRATES = ids('Object.keys(PIRATES)'), PARTS = ids("Object.keys(PARTS)");
check('the calls are rescue, escort, patrol, bounty', same(MISSIONS, ['rescue', 'escort', 'patrol', 'bounty']), MISSIONS.join());
check('the bar has juno, tamsin, dex, moss, sable, ida', same(NPCS, ['juno', 'tamsin', 'dex', 'moss', 'sable', 'ida']), NPCS.join());
check('the pirates are raider, drone, gunship', same(PIRATES, ['raider', 'drone', 'gunship']), PIRATES.join());
check('the part slots are shields, weapons, engine, tank, cargo', same(PARTS, ['shields', 'weapons', 'engine', 'tank', 'cargo']), PARTS.join());
for (const f of fences) {
  const id = f.path.split('/').pop().replace(/\.md$/, ''), type = f.path.split('/')[1];
  const known = { missions: MISSIONS, npcs: NPCS, ships: PIRATES }[type] || [];
  check(`${f.path} is a file for something the game knows (${id})`, known.includes(id));
}
const tables = read('src/contenttables.js');
check('no adapter in src/contenttables.js can add a new id (the guide says none can)', !/canAdd:\s*true/.test(tables), 'an adapter now says canAdd: true: update sections 0, 5 and 6 of docs/MODS.md');
const unread = Object.keys(C.SCHEMA).filter(t => !new RegExp('CONTENT_TABLES\\.' + t + ' =').test(tables));
check('the types the game does not read yet are system, station, voice and text (section 5 of the guide)', same(unread, ['system', 'station', 'voice', 'text']), unread.join());

console.log('4. what the guide quotes and names is still there');
const code = read('src/content.js') + read('src/contenttables.js') + read('src/boot.js');
// [a piece of a message the code says, whether the guide quotes it]
for (const [piece, quoted] of [['is not a known placeholder here', true], ['is required but missing', true], ['but must be a whole number', true], ['unknown field', true], ['Did you mean', true],
  ['cannot add new ones', true], ['could not be applied', true], ['so its kind must be', true], ['does not read', true]]) {
  check(`the code still says "${piece}"`, code.includes(piece));
  if (quoted) check(`the guide quotes "${piece}"`, doc.includes(piece));
}
const build = read('tools/build-content.mjs');
for (const flag of ['--strict', '--seal']) check(`tools/build-content.mjs has ${flag}, which the guide names`, build.includes(flag) && doc.includes(flag));
for (const f of ['docs/MODDING.md', 'docs/ECONOMY.md', 'docs/VOICE.md', 'docs/NPC-CHAT.md', 'tools/build-content.mjs', 'tools/serve.mjs', 'tools/mods-fields.mjs', 'content/_templates/mission.md', 'content/npcs/juno.md', 'content/ships/drone.md', 'content/missions/rescue.md']) {
  check(`${f} exists`, existsSync(join(ROOT, f)));
  if (!f.startsWith('content/')) check(`the guide mentions ${f}`, doc.includes(f) || doc.includes(f.replace('tools/', '').replace('docs/', '')));
}

console.log(failed ? `\nMODSDOC FAIL (${failed} of ${n})` : `\nMODSDOC PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
