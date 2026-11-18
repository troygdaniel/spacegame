// smoke: a hand-edited content.generated.js (a null, a number or a word where an entry should be, entries that is not a list) never stops the scripts from loading (plain Node, no Chrome)
// Card space-game-night-contentboot. The overnight smoke found a real bug: siteCallsFrom (src/missions.js) read e.type on every entry of content.entries
// when the script LOADED, so one null in the file threw a TypeError before Boot, and a game that is meant to play on its built-in values on a bad file
// never reached Title (tests/contentboot.mjs puts null, 7 and 'not an entry' in the file on purpose). That test needs Chrome and the lock; this one
// loads the same scripts in plain Node (tests/nodegame.mjs), so every reader of the file that runs at load, or at the first contentApply, is held to it:
// siteCallsFrom (the site calls), sysWorldOf (the systems), the mods check (a pack's entry is a place that exists), ContentLib.apply (the merge).
// What is checked: the page's scripts load and the first Boot step runs without a throw; the bad entries are skipped and everything else is read
// exactly as it is from the clean file (the same systems, the same calls); a file whose entries is not a list leaves the game on its built-in
// values and says so; a file that is not an object at all does the same.
// Run: node tests/contentholes.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };

const real = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
const content = new Function(real + '\n;return CONTENT;')();
const mk = obj => 'var CONTENT = ' + JSON.stringify(obj) + ';\n';
const sample = g => JSON.parse(g.run(`JSON.stringify({ systems: Object.keys(SYSTEMS), missions: MISSIONS.map(m => m.id), sites: MISSIONS.filter(m => m.site).map(m => m.id), problems: SITE_PROBLEMS.length, loaded: CONTENT_STATE.loaded, applied: CONTENT_STATE.applied.length, errors: CONTENT_ERRORS.map(e => e.level + '|' + e.message), kept: typeof SYSTEMS_KEPT !== 'undefined' ? SYSTEMS_KEPT.slice() : [] })`));

// a game that loads or does not: the load itself is what the card is about
const load = (label, text) => {
  try { const g = nodeGame({ replace: { 'content.generated.js': text } }); return { g, err: '' }; } catch (e) { return { g: null, err: String(e && e.message || e) }; }
};

const clean = nodeGame(); const want = sample(clean);
check('the clean file loads and has systems and site calls to compare with', want.systems.length >= 3 && want.sites.length >= 1 && want.loaded === true, JSON.stringify({ systems: want.systems.length, sites: want.sites.length }));

// ---- a bad entry among the good ones ----
const BAD = [null, 7, 'not an entry', [], true, 0, { type: 'mission' }, { type: 'mission', id: 'x', data: null }, { type: 'mission', id: 'y', data: 'text' }, { type: 'mission', id: 9, data: { kind: 'site' } },
  { type: 'system', id: 'zzz', data: null }, { type: 'station', id: 's', data: [] }, { type: 'poi', data: { name: 'x' } }, { type: null, id: null, data: null }];
const spread = JSON.parse(JSON.stringify(content));
const mid = Math.floor(spread.entries.length / 2);
spread.entries = [null, ...spread.entries.slice(0, mid), 7, 'not an entry', ...spread.entries.slice(mid), ...BAD];
{
  const r = load('bad entries among the good', mk(spread));
  check('null, 7, a word, a list, an entry with no data: the scripts load, nothing throws', r.g !== null, r.err);
  if (r.g) {
    const got = sample(r.g);
    check('the systems and the calls are exactly those of the clean file: the bad entries were skipped, nothing else', JSON.stringify(got.systems) === JSON.stringify(want.systems) && JSON.stringify(got.missions) === JSON.stringify(want.missions) && JSON.stringify(got.sites) === JSON.stringify(want.sites), JSON.stringify({ systems: got.systems.length, missions: got.missions.length, sites: got.sites.length }));
    check('the file is read and the bad entries are named, not hidden: more than one problem, the file still loaded', got.loaded === true && got.errors.length >= 3, got.errors.length + ' problems');
    check('no console errors from the scripts', r.g.errors.length === 0, r.g.errors.join(' | '));
  }
}

// ---- entries is not a list ----
for (const [name, value] of [['a word', 'text'], ['an object', { a: 1 }], ['a number', 7], ['null', null], ['true', true], ['missing', undefined]]) {
  const c = JSON.parse(JSON.stringify(content)); if (value === undefined) delete c.entries; else c.entries = value;
  const r = load('entries is ' + name, mk(c));
  check(`entries is ${name}: the scripts load`, r.g !== null, r.err);
  if (r.g) {
    const got = sample(r.g);
    check(`entries is ${name}: the game plays on its built-in systems and calls, and says it read nothing`, got.systems.length >= 3 && got.missions.length >= 1 && got.loaded === false && got.errors.length >= 1, JSON.stringify({ systems: got.systems.length, loaded: got.loaded, errors: got.errors.slice(0, 2) }));
    check(`entries is ${name}: no console errors`, r.g.errors.length === 0, r.g.errors.join(' | '));
  }
}

// ---- the file is not an object ----
for (const [name, text] of [['null', 'var CONTENT = null;\n'], ['a word', 'var CONTENT = "text";\n'], ['a number', 'var CONTENT = 7;\n'], ['a list', 'var CONTENT = [null, 7];\n'], ['an empty object', 'var CONTENT = {};\n']]) {
  const r = load('CONTENT is ' + name, text);
  check(`CONTENT is ${name}: the scripts load and the game has its systems`, r.g !== null && sample(r.g).systems.length >= 3, r.err);
}

// ---- the readers of the file by name: each takes anything ----
{
  const g = clean;
  const probe = (name, expr) => { let ok = true, err = ''; try { g.run(expr); } catch (e) { ok = false; err = String(e && e.message); } check(name, ok, err); };
  probe('siteCallsFrom takes a null, a word, a number, a list of anything', `[null, undefined, 7, 'x', [], {}, { entries: null }, { entries: 'x' }, { entries: 7 }, { entries: {} }, { entries: [null, 7, 'x', [], {}, { type: 'mission' }, { type: 'mission', data: null }] }].forEach(c => siteCallsFrom(c))`);
  probe('sysRowsFrom takes the same', `[null, undefined, 7, 'x', [], {}, { entries: null }, { entries: 'x' }, { entries: 7 }, { entries: {} }, { entries: [null, 7, 'x', [], {}, { type: 'system' }, { type: 'system', id: 'a', data: null }, { type: 'system', id: 'a', data: 'x' }] }].forEach(c => sysRowsFrom(c))`);
}

check('no errors in the clean game', clean.errors.length === 0, clean.errors.join(' | '));
console.log(failed ? `CONTENTHOLES FAIL (${failed} of ${n})` : `CONTENTHOLES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
