// Tests for the second look and the merge: ContentLib.checkEntry and ContentLib.apply (card space-game-m2-loader, docs/MODDING.md 5).
// No browser: src/content.js is loaded with require(), like tests/content.mjs does; the browser side is tests/contentboot.mjs.
// Run: node tests/contentapply.mjs        Each check names what it guards. Exit code 1 if any fails.
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPack } from '../tools/build-content.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = createRequire(import.meta.url)('../src/content.js');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const section = t => console.log(t);
const msgs = errs => errs.map(C.formatError);
const J = JSON.stringify;

const ship = (data, extra = {}) => ({ type: 'ship', id: 'kite', path: 'content/ships/kite.md', data: { name: 'Kite', ...data }, ...extra });
const BUILT_IN = { hull: 70 };
const opts = { defaultFor: (type, id, field) => BUILT_IN[field] };

section('checkEntry: a good entry passes untouched');
{
  // every entry the build makes from the good fixtures must come through the second look unchanged and without a word
  const files = readPack(join(ROOT, 'tests/fixtures/content-good'));
  const built = C.loadAll(files);
  check('the good fixture pack builds without problems', built.errors.length === 0 && built.entries.length >= 8, J(msgs(built.errors)));
  built.entries.forEach(en => {
    const r = C.checkEntry(en);
    check(`${en.type}:${en.id} comes through the second look unchanged`, r.errors.length === 0 && J(r.data) === J(en.data), J(msgs(r.errors)));
  });
}

section('checkEntry: a bad field is dropped and the built-in value stays');
{
  let r = C.checkEntry(ship({ hull: 5000 }), opts);
  check('hull out of range: dropped, built-in value named', r.data && r.data.hull === undefined && r.data.name === 'Kite'
    && J(msgs(r.errors)) === J(['content/ships/kite.md: hull is 5000 but must be a whole number from 10 to 1000. Kept the built-in value 70.']), J(msgs(r.errors)));
  r = C.checkEntry(ship({ hull: 'lots' }), opts);
  check('hull is a string: dropped', r.data && r.data.hull === undefined && msgs(r.errors)[0] === 'content/ships/kite.md: hull is not a number. Kept the built-in value 70.', J(msgs(r.errors)));
  r = C.checkEntry(ship({ hull: NaN, speed: Infinity, boost: 1e999 }), opts);
  check('NaN and Infinity are not numbers', r.data && r.data.hull === undefined && r.data.speed === undefined && r.data.boost === undefined && r.errors.length === 3, J(msgs(r.errors)));
  r = C.checkEntry(ship({ hull: 12.5 }), opts);
  check('a whole-number field refuses a fraction', r.data && r.data.hull === undefined && r.errors.length === 1, J(msgs(r.errors)));
  r = C.checkEntry(ship({ hull: 90, turn: 99 }), opts);
  check('the good fields of the same entry are kept', r.data && r.data.hull === 90 && r.data.turn === undefined && r.errors.length === 1, J(r));
  r = C.checkEntry(ship({ colour: 'cyan' }));
  check('an unknown field gets a hint and is ignored', r.data && r.data.colour === undefined && msgs(r.errors)[0].includes('unknown field "colour". Did you mean "color"? Ignored.'), J(msgs(r.errors)));
  r = C.checkEntry(ship({ side: 'rebel', color: 'purple', yard: 'halcyon-station' }));
  check('a pick, a colour and a list are each checked', r.data && r.data.side === undefined && r.data.color === undefined && r.data.yard === undefined && r.errors.length === 3, J(msgs(r.errors)));
  r = C.checkEntry(ship({ name: 'Ki‮te' }));
  check('a bidi override in a text field is refused', r.data === null && msgs(r.errors).join().includes('control characters'), J(r));
  r = C.checkEntry(ship({ name: 'x'.repeat(41) }));
  check('text over its limit on a required field skips the entry', r.data === null && msgs(r.errors)[0].includes('is 41 characters but the limit is 40. Skipped the file.'), J(msgs(r.errors)));
  r = C.checkEntry({ type: 'ship', id: 'kite', path: 'content/ships/kite.md', data: { hull: 70 } });
  check('a missing required field skips the entry', r.data === null && msgs(r.errors)[0] === 'content/ships/kite.md: name is required but missing. Skipped the file.', J(msgs(r.errors)));
}

section('checkEntry: sections');
{
  const m = (data, type = 'mission', extra = {}) => ({ type, id: 'rescue', path: 'content/missions/rescue.md', data: { kind: 'rescue', title: 'Rescue', reward: 500, ...data }, ...extra });
  let r = C.checkEntry(m({ offer: 'Pays {rewrd} credits.' }));
  check('a typo in a placeholder is named with a hint', r.data && r.data.offer === undefined && msgs(r.errors)[0].includes('"{rewrd}" is not a known placeholder here. Did you mean {reward}?'), J(msgs(r.errors)));
  r = C.checkEntry(m({ offer: 'Pays {reward} credits.' }));
  check('a right placeholder passes', r.data && r.data.offer === 'Pays {reward} credits.' && r.errors.length === 0);
  r = C.checkEntry(m({ steps: ['one', 7, 'x'.repeat(81), 'two'] }));
  check('bad list items are dropped one by one', r.data && J(r.data.steps) === J(['one', 'two']) && r.errors.length === 2, J(msgs(r.errors)));
  r = C.checkEntry(m({ steps: Array.from({ length: 61 }, (_, i) => 'step ' + i) }));
  check('a list longer than 60 keeps the first 60', r.data && r.data.steps.length === 60 && r.errors.length === 1, J(msgs(r.errors)));
  r = C.checkEntry(m({ boardLine: { active: 'Go.', mood: 'Hm.', failed: 4 } }));
  check('a key: text section drops unknown keys and non-text', r.data && J(r.data.boardLine) === J({ active: 'Go.' }) && r.errors.length === 2, J(msgs(r.errors)));
  r = C.checkEntry({ type: 'npc', id: 'juno', path: 'content/npcs/juno.md', data: { name: 'JUNO', reactions: [{ when: 'credits>=500', line: 'Rich.' }, { when: 'sometimes', line: 'No.' }, { when: 'always' }, 'x'] } });
  check('table rows with a bad cell, a missing cell or no shape are dropped', r.data && J(r.data.reactions) === J([{ when: 'credits>=500', line: 'Rich.' }]) && r.errors.length >= 3, J(msgs(r.errors)));
  r = C.checkEntry({ type: 'system', id: 'brass', path: 'content/systems/brass.md', data: { name: 'Brass', kind: 'trade', bodies: Array.from({ length: 201 }, (_, i) => ({ id: 'b' + i, type: 'belt', x: 1, y: 1 })) } });
  check('a table longer than 200 rows keeps the first 200', r.data && r.data.bodies.length === 200, J(msgs(r.errors)));
  r = C.checkEntry(m({ description: 'x'.repeat(601) }));
  check('a description over 600 characters is dropped, the entry stays', r.data && r.data.description === undefined && r.data.title === 'Rescue');
}

section('checkEntry: shapes that should never get through');
{
  const bad = [
    ['null', null], ['a number', 7], ['a string', 'ship'], ['an array', []], ['no data', { type: 'ship', id: 'kite' }], ['data is a list', { type: 'ship', id: 'kite', data: [] }],
    ['an unknown type', { type: 'weapon', id: 'kite', data: { name: 'X' } }], ['a type from the prototype', { type: 'constructor', id: 'kite', data: { name: 'X' } }],
    ['a type named __proto__', { type: '__proto__', id: 'kite', data: { name: 'X' } }], ['a path in the id', { type: 'ship', id: '../kite', data: { name: 'X' } }],
    ['an id that is too long', { type: 'ship', id: 'a'.repeat(41), data: { name: 'X' } }], ['an upper-case id', { type: 'ship', id: 'Kite', data: { name: 'X' } }]
  ];
  bad.forEach(([what, en]) => { const r = C.checkEntry(en); check(`${what}: skipped with a message`, r.data === null && r.errors.length >= 1 && r.errors.every(e => e.level === 'error' && typeof e.message === 'string'), J(r)); });
  // JSON.parse makes a real own key called __proto__, which a literal in a script would not
  const evil = JSON.parse('{"type":"ship","id":"kite","path":"p","data":{"name":"Kite","__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":2}},"toString":"x"}}');
  const r = C.checkEntry(evil);
  check('keys named __proto__, constructor and toString are unknown fields, nothing is polluted', r.data && r.data.name === 'Kite' && ({}).polluted === undefined && Object.keys(r.data).join() === 'name' && r.errors.length === 3, J(msgs(r.errors)));
}

section('apply: content that is missing or unreadable');
{
  [['undefined', undefined], ['null', null], ['a number', 5], ['a string', 'CONTENT'], ['an array', []], ['entries is not a list', { entries: 'x' }], ['entries is an object', { entries: {} }]].forEach(([what, content]) => {
    const r = C.apply(content, {});
    check(`${what}: one error, the game plays on the defaults`, !r.loaded && r.applied.length === 0 && r.errors.length === 1
      && msgs(r.errors)[0] === 'content.generated.js: content.generated.js is missing: run node tools/build-content.mjs. Playing on the built-in values.', J(r));
  });
  check('an empty pack is fine and says nothing', J(C.apply({ version: 1, hash: 'abc', files: 0, entries: [], errors: [] }, {})) === J({ loaded: true, hash: 'abc', files: 0, applied: [], skipped: 0, errors: [] }));
}

section('apply: merge by id');
{
  const calls = [];
  const tables = {
    ship: { has: id => id === 'raider', get: (id, f) => (f === 'hp' ? 40 : undefined), canAdd: false, apply: (id, data, isNew) => calls.push(['ship', id, J(data), isNew]) },
    mission: { has: id => id === 'rescue', get: () => undefined, canAdd: true, apply: (id, data, isNew) => calls.push(['mission', id, J(data), isNew]) }
  };
  const content = { version: 1, hash: 'h1', files: 3, errors: [], entries: [
    { type: 'ship', id: 'raider', path: 'content/ships/raider.md', data: { name: 'Raider', hp: 55, speed: 99999 } },
    { type: 'ship', id: 'new-one', path: 'content/ships/new-one.md', data: { name: 'New' } },
    { type: 'mission', id: 'rescue', path: 'content/missions/rescue.md', data: { kind: 'rescue', title: 'Rescue', reward: 600 } },
    { type: 'mission', id: 'courier-9', path: 'content/missions/courier-9.md', data: { kind: 'courier', title: 'Courier', reward: 300 } },
    { type: 'npc', id: 'juno', path: 'content/npcs/juno.md', data: { name: 'JUNO' } }
  ] };
  const r = C.apply(content, tables);
  check('a known id gets the valid fields, isNew is false', calls.some(c => c[0] === 'ship' && c[1] === 'raider' && c[2] === J({ name: 'Raider', hp: 55 }) && c[3] === false), J(calls));
  check('the out-of-range field never reaches the table', !calls.some(c => c[2].includes('99999')));
  check('the bad field is reported with the built-in value', msgs(r.errors).some(m => m.startsWith('content/ships/raider.md: speed is 99999 but must be a whole number from 50 to 2000.')), J(msgs(r.errors)));
  check('a type that cannot add refuses a new id, in plain words', msgs(r.errors).includes('content/ships/new-one.md: the game has no built-in ship called "new-one" and cannot add new ones. Skipped the file.'), J(msgs(r.errors)));
  check('a type that can add gets the new id with isNew true', calls.some(c => c[0] === 'mission' && c[1] === 'courier-9' && c[3] === true));
  check('a type with no table is left alone with a warning', msgs(r.errors).includes('(warning) content/npcs/juno.md: this version of the game does not read npcs yet. Ignored the file.'), J(msgs(r.errors)));
  check('applied lists exactly what changed something', J(r.applied) === J(['ship:raider', 'mission:rescue', 'mission:courier-9']), J(r.applied));
  check('skipped counts the rest, loaded is true, hash and files pass through', r.skipped === 2 && r.loaded && r.hash === 'h1' && r.files === 3, J(r));
}

section('apply: a table that misbehaves');
{
  const calls = [];
  const tables = {
    ship: { has: () => { throw new Error('boom'); }, get: () => { throw new Error('boom'); }, apply: () => {} },
    mission: { has: () => true, get: () => undefined, apply: () => { throw new Error('exploded'); } },
    part: { has: () => true, get: () => undefined, apply: (id, d) => calls.push(id) },
    station: 'not a table', voice: null
  };
  const content = { entries: [
    { type: 'ship', id: 'a', path: 'content/ships/a.md', data: { name: 'A', hull: 9999 } },
    { type: 'mission', id: 'b', path: 'content/missions/b.md', data: { kind: 'rescue', title: 'B', reward: 1 } },
    { type: 'part', id: 'c', path: 'content/parts/c.md', data: { slot: 'engine', tier: 1, name: 'C' } },
    { type: 'station', id: 'd', path: 'content/stations/d.md', data: { name: 'D', system: 'x' } },
    { type: 'voice', id: 'e', path: 'content/voice/e.md', data: { event: 'hull-low' } }
  ] };
  let r;
  try { r = C.apply(content, tables); check('a throwing table does not escape', true); } catch (e) { check('a throwing table does not escape', false, e.message); r = { errors: [], applied: [] }; }
  check('the table that works is still applied after the ones that throw', J(calls) === J(['c']) && r.applied.includes('part:c'), J(r));
  check('a throwing apply names the file and says the built-in values stay', msgs(r.errors).includes('content/missions/b.md: could not be applied (exploded). Kept the built-in values.'), J(msgs(r.errors)));
  check('a table that is not an object counts as no table', msgs(r.errors).filter(m => m.includes('does not read')).length === 2, J(msgs(r.errors)));
}

section('apply: duplicates, build errors and limits');
{
  const seen = [];
  const tables = { ship: { has: () => true, get: () => undefined, apply: (id, d) => seen.push(d.name) } };
  const e1 = { type: 'ship', id: 'kite', path: 'content/ships/a/kite.md', data: { name: 'First' } }, e2 = { type: 'ship', id: 'kite', path: 'content/ships/b/kite.md', data: { name: 'Second' } };
  [[e1, e2], [e2, e1]].forEach(([x, y], i) => {
    seen.length = 0;
    const r = C.apply({ entries: [x, y] }, tables);
    const m = msgs(r.errors);
    check(`two files, one id (${i ? 'later one listed first' : 'in order'}): the later path wins, both are named`,
      J(seen) === J(['Second']) && m.length === 1 && m[0].startsWith('(warning) ') && m[0].includes('content/ships/a/kite.md') && m[0].includes('content/ships/b/kite.md') && m[0].includes('Used the later.'), J({ seen, m }));
  });
  let r = C.apply({ entries: [], errors: [{ level: 'warn', path: 'content/x.md', line: 3, field: 'f', message: 'built warning' }, { level: 'bogus', path: 'content/y.md', message: 'built error' }, { path: 'p' }, null, 'x'] }, {});
  check('problems the build found are passed on, odd ones dropped, levels normalised', J(r.errors.map(e => [e.level, e.path, e.line, e.message])) === J([['warn', 'content/x.md', 3, 'built warning'], ['error', 'content/y.md', 0, 'built error']]), J(r.errors));
  const many = Array.from({ length: 450 }, (_, i) => ({ type: 'ship', id: 'ship-' + i, path: 'content/ships/ship-' + i + '.md', data: { name: 'S' } }));
  seen.length = 0; r = C.apply({ entries: many }, tables);
  check('more than 400 entries: the first 400 are used and one error says so', seen.length === 400 && msgs(r.errors).some(m => m.includes('more than 400 entries')), J({ n: seen.length, e: msgs(r.errors) }));
  r = C.apply({ entries: [{ type: 'ship', id: 'k', path: 'p'.repeat(5000), data: { name: 'K', hull: 0 } }], errors: [{ message: 'm'.repeat(5000), path: 'q'.repeat(5000) }] }, tables);
  check('very long paths and messages are cut down', r.errors.every(e => e.path.length <= 200 && e.message.length <= 500), J(r.errors.map(e => [e.path.length, e.message.length])));
}

section('apply: garbage never throws');
{
  const junk = [undefined, null, 0, 1, NaN, '', 'x', true, [], [1], {}, { entries: [undefined, null, 1, 'a', [], {}, { type: 1 }, { type: 'ship' }, { type: 'ship', id: 'x' }, { type: 'ship', id: 'x', data: 1 }] },
    { entries: [{ type: 'ship', id: 'x', path: 5, data: { name: {}, hull: [], speed: {}, role: null, yard: 'x', shot: { length: 2 } } }] },
    { entries: new Array(5), errors: 'x', hash: {}, files: 'many' }, { entries: [{ type: 'mission', id: 'x', data: { steps: 'x', boardLine: [], offer: [] } }, { type: 'system', id: 'y', data: { name: 'Y', kind: 'trade', bodies: 'x' } }, { type: 'npc', id: 'z', data: { name: 'Z', reactions: [null, 1, [], {}] } }] }];
  let threw = null;
  for (const t of [{}, null, undefined, 'x', { ship: { has: () => true, apply() {} } }]) for (const j of junk) { try { C.apply(j, t); C.checkEntry(j); } catch (e) { threw = e; } }
  check('apply and checkEntry survive every odd input', threw === null, threw && threw.message);
  // the real thing: the bad fixture pack, built and applied
  const built = C.loadAll(readPack(join(ROOT, 'tests/fixtures/content-bad')));
  let r = null;
  try { r = C.apply({ version: 1, hash: built.hash, files: built.files, entries: built.entries, errors: built.errors }, {}); } catch (e) { threw = e; }
  check('the bad fixture pack applies without throwing and the problems are listed', r && r.errors.length >= built.errors.length && r.errors.length > 5, r && r.errors.length);
  check('with no tables registered nothing is applied', r && r.applied.length === 0);
}

console.log(failed ? `\nCONTENT APPLY FAIL: ${failed} of ${n} checks failed` : `\nCONTENT APPLY PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;
