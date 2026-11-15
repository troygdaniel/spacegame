// smoke: docs/MODS.md, the modder guide, stays true to the schema and the code (no browser)
// docs/MODS.md, the ten-minute modder guide (card space-game-m8-modder-guide). No browser: it keeps the guide true.
//   1. the field reference between the marker lines is what tools/mods-fields.mjs writes from the schema in src/content.js
//   2. every example file in the guide (a fence marked  md file=content/...) is a whole, valid file with no problems
//   3. the ids the guide says the game knows are the ones in the code, and only text files can be ADDED (the guide says so)
//   3b. which files exist in content/, and the lines the guide says to change are there to change
//   4. the error messages the guide quotes are still said by the code (the build's own, word for word), the build flags it names exist, the files it names exist
// If one fails, the code changed and the guide says something that is no longer true: change docs/MODS.md (or run node tools/mods-fields.mjs --write).
// Run: node tests/modsdoc.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
check('the guide has example files to try (the gunship, a cargo part, a text file)', fences.length >= 3, String(fences.length));
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
check('the bar has juno, tamsin, dex, moss, sable, ida, and the keeper of the other bars (barkeep)', same(NPCS, ['juno', 'tamsin', 'dex', 'moss', 'sable', 'ida', 'barkeep']), NPCS.join());
check('the pirates are raider, drone, gunship', same(PIRATES, ['raider', 'drone', 'gunship']), PIRATES.join());
check('the part slots are shields, weapons, engine, tank, cargo', same(PARTS, ['shields', 'weapons', 'engine', 'tank', 'cargo']), PARTS.join());
const partIds = PARTS.flatMap(slot => [1, 2, 3].map(t => slot + '-' + t));
for (const f of fences) {
  const id = f.path.split('/').pop().replace(/\.md$/, ''), type = f.path.split('/')[1];
  if (type === 'text') { check(`${f.path} is a text file: new ones are read, whatever the name`, true); continue; }
  const known = { missions: MISSIONS, npcs: NPCS, ships: PIRATES, parts: partIds }[type] || [];
  check(`${f.path} is a file for something the game knows (${id})`, known.includes(id));
}
// the guide says a text file is read in name order and the last to say a key wins, so an example has to sort after ui.md
const uiText = read('content/text/ui.md');
for (const f of fences.filter(x => x.path.startsWith('content/text/'))) {
  const r = C.loadAll([{ path: f.path, text: f.text }, { path: 'content/text/ui.md', text: uiText }], { strictRefs: false });
  check(`${f.path} is read after content/text/ui.md, so its lines win (the guide says so)`, r.entries.map(e => e.path).join() === 'content/text/ui.md,' + f.path, r.entries.map(e => e.path).join());
  const keys = new Set((r.entries[0].data.strings || []).map(x => x.key));
  const mine = (r.entries[1].data.strings || []);
  check(`every key of ${f.path} is one ui.md has`, mine.length > 0 && mine.every(x => keys.has(x.key)));
}
const tables = read('src/contenttables.js');
const adds = read('src/contentadd.js');
check('the adapters that can add new ids are text, system and station in src/contenttables.js (kept or read) and voice, ship, mission and npc in src/contentadd.js (the guide lists exactly those)', (tables.match(/canAdd:\s*true/g) || []).length === 3 && /const CT_TEXT = \{\s*canAdd: true/.test(tables) && ['VOICE', 'SHIP', 'MISSION', 'NPC'].every(n => new RegExp('const CA_' + n + ' = \\{\\s*canAdd: true').test(adds)) && (adds.match(/canAdd:\s*true/g) || []).length === 4, 'another adapter can add now: update the first sections, 6, 7 and 8 of docs/MODS.md');
const unread = Object.keys(C.SCHEMA).filter(t => !new RegExp('CONTENT_TABLES\\.' + t + ' =').test(tables + adds));
check('every type has an adapter (section 7 of the guide: system and station files are kept, nothing uses them yet)', same(unread, []), unread.join());

console.log('3b. which files exist, and the lines the guide says to change');
const list = dir => readdirSync(join(ROOT, 'content', dir)).filter(f => f.endsWith('.md')).sort().join();
check('content/missions: rescue, escort, patrol, bounty (the guide says all four have a file)', list('missions') === 'bounty.md,escort.md,patrol.md,rescue.md', list('missions'));
check('content/npcs: all six people have a file', list('npcs') === 'dex.md,ida.md,juno.md,moss.md,sable.md,tamsin.md', list('npcs'));
check('content/ships: raider and drone only (the guide says gunship has no file)', list('ships') === 'drone.md,raider.md', list('ships'));
const partFiles = readdirSync(join(ROOT, 'content', 'parts')).filter(f => f.endsWith('.md'));
check('content/parts has nine files, all shields, weapons or engine (the guide says tank and cargo have none)', partFiles.length === 9 && partFiles.every(f => /^(shields|weapons|engine)-[123]\.md$/.test(f)), partFiles.join());
check('content/poi: five sites and two signals', list('poi') === 'beacon-e.md,signal-beacon.md,signal-wreck.md,wreck-nw.md,wreck-s.md,wreck-se.md,wreck-w.md', list('poi'));
check('content/stations: the six docks (the guide says halcyon-station is the one the game uses)', list('stations') === 'brass-smelter.md,ember-foundry.md,halcyon-station.md,kestrel-outpost.md,meridian-exchange.md,roost-dock.md', list('stations'));
check('content/text has ui.md', list('text').split(',').includes('ui.md'), list('text'));
// [file, a line the guide tells the reader to change, a line the guide says it then reads]
for (const [file, snippet] of [
  ['content/missions/rescue.md', 'reward: 500'], ['content/missions/rescue.md', 'A survey pod went down on the surface.'],
  ['content/missions/escort.md', 'reward: 400'], ['content/missions/escort.md', 'She pays on arrival.'], ['content/missions/bounty.md', 'unlock: patrols>=1'],
  ['content/npcs/juno.md', '## Lines'], ['content/npcs/moss.md', 'credits>=800 and !upgrade:engine'], ['content/npcs/moss.md', 'hull<50'], ['content/npcs/moss.md', 'upgrade:shields>=2'], ['content/npcs/ida.md', 'appears: missions>=1'],
  ['content/ships/drone.md', 'hp: 30'], ['content/ships/drone.md', 'bounty: 40'], ['content/poi/wreck-nw.md', 'credits: 120'], ['content/poi/signal-wreck.md', 'pays: [80, 160]'],
  ['content/stations/halcyon-station.md', 'repair: 0.5'], ['content/stations/halcyon-station.md', 'ore: 20'], ['content/text/ui.md', '| toast.docked |'], ['content/text/ui.md', '| help.space.5 |']
]) {
  check(`${file} still has "${snippet}", and the guide mentions it`, read(file).includes(snippet) && doc.includes(snippet.replace(/^\| (\S+) \|$/, '$1')));
}
// the two mistakes the guide says only the game can see: the build reports nothing for them
const escortText = read('content/missions/escort.md');
const wrongKind = escortText.replace('kind: escort', 'kind: rescue'), unknownId = { path: 'content/missions/my-call.md', text: escortText };
check('a mission file with the wrong kind is not a problem to the build (the game says it)', C.loadAll([{ path: 'content/missions/escort.md', text: wrongKind }]).errors.length === 0);
check('a mission file with an id the game does not know is not a problem to the build (the game says it)', C.loadAll([unknownId]).errors.length === 0);
const typoKey = C.loadAll([{ path: 'content/text/words.md', text: '---\ntype: text\n---\nA typo.\n\n## Strings\n| key | text |\n|---|---|\n| toast.docekd | Docked. |\n' }]);
check('a text file with a key the game does not read is not a problem to the build (the game says it)', typoKey.errors.length === 0);
// the three messages the build does print, word for word as the guide quotes them (made from the shipped Escort file)
const said = text => C.loadAll([{ path: 'content/missions/escort.md', text }]).errors.map(e => C.formatError(e));
for (const line of [...said(escortText.replace('reward: 400', 'rewrd: 400')), ...said(escortText.replace('reward: 400', 'reward: lots')), ...said(escortText.replace('She pays on arrival.', 'She pays {rewrd} cr on arrival.'))]) {
  check(`the guide quotes "${line.slice(0, 70)}..." word for word`, doc.includes(line));
}

console.log('3c. the claims about packs (section 9 of the guide; tests/mods.mjs plays them in the game)');
const ex = ['mods/example/_pack.md', 'mods/example/missions/rescue.md', 'mods/example/npcs/juno.md'];
for (const f of ex) check(`${f} exists, and the guide names the example pack`, existsSync(join(ROOT, f)) && doc.includes('mods/example/'));
check('the example pack makes Rescue pay 650, as the guide says', /reward: 650/.test(read('mods/example/missions/rescue.md')) && doc.includes('Rescue pays 650'));
check('the guide names the label file, the generated file and the keys it tells the reader to press (O, F, R)', doc.includes('_pack.md') && doc.includes('mods.generated.js') && ['**O**', '**F**', '**R**'].every(k => doc.includes(k)));
const titleJs = read('src/title.js'), modsJs = read('src/mods.js');
check('O on the Title screen opens the Mods screen (src/title.js)', /KeyO'\)\s*modsOpenSetup/.test(titleJs));
check('the Mods screen takes F (pick a folder), R (restart) and 1 to 6 (turn on or off) (src/mods.js)', /addKeys\('ESC,F,R,ONE,TWO,THREE,FOUR,FIVE,SIX'\)/.test(modsJs) && /this\.k\.F\)\) this\.pick\(\)/.test(modsJs) && /this\.k\.R\)\) this\.restart\(\)/.test(modsJs));
check('the folder picker is an input with webkitdirectory (the guide says no Node is needed)', /setAttribute\('webkitdirectory'/.test(modsJs));
check('packs are off until turned on and laid over in name order (the guide says so): modsAvailable sorts by name and only the on list is applied', /\.sort\(\(a, b\) => \(a\.name < b\.name/.test(modsJs) && /if \(!row\.on\) return;/.test(modsJs));
check('a list in a pack file replaces the normal one whole (the guide says so for Lines, Reactions and Steps)', /n\.lines\.splice\(0, n\.lines\.length, \.\.\.data\.lines\)/.test(read('src/contenttables.js')) && /HUD_MISSIONS\[id\]\.steps = data\.steps\.map/.test(read('src/contenttables.js')) && /n\.react = \(\) =>/.test(read('src/contenttables.js')));
check('the example JUNO file has a Lines list and no other section, the example Rescue file has no body (the guide describes both)', /^## Lines/m.test(read('mods/example/npcs/juno.md')) && !/^## (Reactions|Persona)/m.test(read('mods/example/npcs/juno.md')) && !/^## /m.test(read('mods/example/missions/rescue.md')) && read('content/npcs/juno.md').match(/^- /gm).length === 3, 'the guide says JUNO has three normal lines');
check('_pack.md is the one underscore file the picker reads (the guide says so)', /parts\.join\('\/'\) !== '_pack\.md'/.test(modsJs));
const addJs = read('src/contentadd.js');
check('packs add things the way content/ does: the limits the guide gives (four calls, six characters, six ships, 40 voice files) are src/contentadd.js CA_MAX, and modsApply uses the same tables', /CA_MAX = \{ voice: 40, ship: 6, mission: 4, npc: 6 \}/.test(addJs) && /four calls, six characters, six ships, 40 voice files/.test(doc) && /ContentLib\.apply\(\{ entries: p\.entries[^)]*\}, CONTENT_TABLES\)/.test(modsJs));
check('the guide says a pack can add (mods/my-pack/npcs/ada.md) and that a later pack changes a row an earlier one added; tests/mods.mjs B4 plays both', doc.includes('mods/my-pack/npcs/ada.md') && doc.includes('the later pack changes the row the earlier one added') && /B4\. a pack can add new things/.test(read('tests/mods.mjs')));
const ign = read('.gitignore');
check('.gitignore ignores mods/* except mods/example/ (the guide says your packs stay on your computer)', /^mods\/\*$/m.test(ign) && /^!mods\/example\/$/m.test(ign));

console.log('4. what the guide quotes and names is still there');
const code = read('src/content.js') + read('src/contenttables.js') + read('src/boot.js');
// [a piece of a message the code says, whether the guide quotes it]
for (const [piece, quoted] of [['is not a known placeholder here', true], ['is required but missing', true], ['but must be a whole number', true], ['unknown field', true], ['Did you mean', true],
  ['cannot add new ones', true], ['could not be applied', true], ['so its kind must be', true], ['does not read', true], ['is not a string the game reads', true]]) {
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
