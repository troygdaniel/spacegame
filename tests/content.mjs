// Tests for the markdown content parser, schema and build script (card space-game-m1-parser-schema, docs/MODDING.md).
// No browser: it loads src/content.js with require(), like tools/build-content.mjs does. Run: node tests/content.mjs
// Each check names what it guards. Exit code 1 if any fails.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build, readPack, generate } from '../tools/build-content.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = createRequire(import.meta.url)('../src/content.js');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const section = t => console.log(t);

// one file in, the formatted problems and the entry out
const FM = (type, lines = '', body = '') => `---\ntype: ${type}\n${lines}---\n${body}`;
const one = (path, text, opts) => { const r = C.loadAll([{ path, text }], opts); return { r, e: r.entries[0], errs: r.errors.map(C.formatError) }; };
const SHIP = (extra = '', body = '') => FM('ship', 'name: Kite\n' + extra, body);
const has = (errs, part) => errs.some(x => x.includes(part));
const exact = (name, errs, want) => check(name, errs.length === 1 && errs[0] === want, JSON.stringify(errs));

section('parser: the file shape');
{
  const plain = SHIP('hull: 70\n', 'Words.\n\n## Hangar line\nFast.\n');
  const a = one('content/ships/kite.md', plain), b = one('content/ships/kite.md', plain.replace(/\n/g, '\r\n')), c = one('content/ships/kite.md', String.fromCharCode(0xfeff) + plain);
  check('a normal file loads with no problems', a.errs.length === 0 && a.e && a.e.data.hull === 70 && a.e.data.hangarLine === 'Fast.' && a.e.data.description === 'Words.', JSON.stringify(a));
  check('CRLF line endings load the same', JSON.stringify(b.e) === JSON.stringify(a.e) && b.errs.length === 0);
  check('a byte order mark at the start is ignored', JSON.stringify(c.e) === JSON.stringify(a.e) && c.errs.length === 0);
  exact('no front matter', one('content/ships/kite.md', 'Just words.\n').errs, 'content/ships/kite.md, line 1: the file must start with a line of three dashes (---) that opens the front matter. Skipped the file.');
  exact('empty file', one('content/ships/kite.md', '').errs, 'content/ships/kite.md, line 1: the file must start with a line of three dashes (---) that opens the front matter. Skipped the file.');
  exact('front matter never closed', one('content/ships/kite.md', '---\ntype: ship\nname: Kite\n').errs, 'content/ships/kite.md, line 1: the front matter is never closed: add a line of three dashes (---) after the last field. Skipped the file.');
  const q = one('content/ships/kite.md', FM('ship', '# a comment\n\nname: "Kite: Mk 2"\nrole: \'courier\'\nhull:70\n'));
  check('comments, blank lines, quotes and "key:value" without a space', q.errs.length === 0 && q.e.data.name === 'Kite: Mk 2' && q.e.data.role === 'courier' && q.e.data.hull === 70, JSON.stringify(q));
  exact('a front matter line that is not key: value', one('content/ships/kite.md', FM('ship', 'name: Kite\nthis is not a field\n')).errs, 'content/ships/kite.md, line 4: this line is not "key: value". Ignored.');
  const d = one('content/missions/m1.md', FM('mission', 'kind: rescue\ntitle: T\nreward: 5\n', 'First.\nSecond line.\n\nNew paragraph.\n<!-- a comment -->\n### not a heading\n\n## Offer\nText here.\n'));
  check('description keeps line breaks and paragraphs, ignores comments, ### is text', d.e.data.description === 'First.\nSecond line.\n\nNew paragraph.\n### not a heading' && d.e.data.offer === 'Text here.', JSON.stringify(d.e && d.e.data));
  const h = one('content/missions/m1.md', FM('mission', 'kind: rescue\ntitle: T\nreward: 5\n', '## offer\nlower case heading works\n'));
  check('headings match without regard to case', h.e.data.offer === 'lower case heading works' && h.errs.length === 0);
}

section('validator: types and ranges');
{
  const p = 'content/ships/kite.md';
  exact('int not a number', one(p, SHIP('hull: lots\n')).errs, `${p}, line 4: hull is "lots" but must be a whole number from 10 to 1000. Ignored.`);
  exact('int too big', one(p, SHIP('hull: 5000\n')).errs, `${p}, line 4: hull is 5000 but must be a whole number from 10 to 1000. Ignored.`);
  exact('int with a decimal', one(p, SHIP('hull: 70.5\n')).errs, `${p}, line 4: hull is "70.5" but must be a whole number from 10 to 1000. Ignored.`);
  exact('num out of range', one(p, SHIP('turn: 9\n')).errs, `${p}, line 4: turn is 9 but must be a number from 0.001 to 3. Ignored.`);
  check('num accepts .5 and 1.25 and negatives where allowed', one(p, SHIP('turn: .5\nfuelPerLy: 1.25\n')).e.data.turn === 0.5);
  exact('bool', one(p, SHIP('strafe: maybe\n')).errs, `${p}, line 4: strafe is "maybe" but must be yes or no. Ignored.`);
  check('bool accepts yes no true false in any case', [['yes', true], ['No', false], ['TRUE', true], ['false', false]].every(([v, w]) => one(p, SHIP('strafe: ' + v + '\n')).e.data.strafe === w));
  exact('color', one(p, SHIP('trim: blue\n')).errs, `${p}, line 4: trim is "blue" but must be a color like #ffb454 or one of: cyan, amber, red, green, gold, white, pink. Ignored.`);
  check('color names become hex, hex is kept in lower case', one(p, SHIP('trim: Cyan\ncolor: #FFB454\n')).e.data.trim === '#38e1ff' && one(p, SHIP('color: #FFB454\n')).e.data.color === '#ffb454');
  exact('pick with a hint', one(p, SHIP('side: playr\n')).errs, `${p}, line 4: side is "playr" but must be one of: player, pirate. Did you mean "player"? Ignored.`);
  check('pick matches without regard to case and keeps the canonical word', one(p, SHIP('side: Pirate\n')).e.data.side === 'pirate');
  exact('id (a list of ids)', one(p, SHIP('yard: [Bad Id]\n')).errs, `${p}, line 4: yard has an item that is "Bad Id" but must be an id: a-z, 0-9 and dashes, starting with a letter. Ignored.`);
  exact('list needs brackets', one(p, SHIP('shot: 5, 6\n')).errs, `${p}, line 4: shot must be a list in square brackets, like [a, b]. Ignored.`);
  exact('list with the wrong length', one(p, SHIP('shot: [100]\n')).errs, `${p}, line 4: shot must have exactly 2 items, like [a, b]. Ignored.`);
  exact('list item out of range', one(p, SHIP('shot: [100, 99999]\n')).errs, `${p}, line 4: shot has an item that is 99999 but must be a whole number from 50 to 10000. Ignored.`);
  exact('text too long', one(p, SHIP('role: ' + 'x'.repeat(61) + '\n')).errs, `${p}, line 4: role is 61 characters but the limit is 60. Ignored.`);
  exact('empty text', one(p, SHIP('role:\n')).errs, `${p}, line 4: role is empty. Ignored.`);
  exact('unknown field with a hint', one(p, SHIP('colour: cyan\n')).errs, `${p}, line 4: unknown field "colour". Did you mean "color"? Ignored.`);
  exact('unknown field without a hint', one(p, SHIP('banana: 3\n')).errs, `${p}, line 4: unknown field "banana". Ignored.`);
  exact('a field twice', one(p, SHIP('hull: 70\nhull: 80\n')).errs, `${p}, line 5: hull appears twice (lines 4 and 5). Used the first.`);
  check('the first of two is the one kept', one(p, SHIP('hull: 70\nhull: 80\n')).e.data.hull === 70);
  exact('a required field missing', one(p, FM('ship', 'hull: 70\n')).errs, `${p}: name is required but missing. Skipped the file.`);
  exact('a required field wrong skips the file', one('content/parts/e.md', FM('part', 'slot: engine\ntier: 9\nname: X\n')).errs, `content/parts/e.md, line 4: tier is 9 but must be a whole number from 1 to 3. Skipped the file.`);
  check('a file with a required field wrong makes no entry', one('content/parts/e.md', FM('part', 'slot: engine\ntier: 9\nname: X\n')).e === undefined);
  const k = one(p, SHIP('hull: lots\n'), { defaultFor: (t, i, f) => (t === 'ship' && i === 'kite' && f === 'hull' ? 70 : undefined) });
  check('with defaultFor the message says which built-in value stays', k.errs.length === 1 && k.errs[0].endsWith('. Kept the built-in value 70.'), k.errs[0]);
}

section('validator: type, folder, id and file name');
{
  exact('type that does not match the folder', one('content/ships/kite.md', FM('mission', 'name: x\n')).errs, 'content/ships/kite.md, line 2: type is "mission" but this folder takes "ship". Skipped the file.');
  exact('unknown type with a hint', one('content/ships/kite.md', FM('shpi', 'name: x\n')).errs, 'content/ships/kite.md, line 2: type is "shpi" but must be one of: ship, part, system, station, mission, npc, voice, text, poi. Did you mean "ship"? Skipped the file.');
  exact('no type line', one('content/ships/kite.md', '---\nname: x\n---\n').errs, 'content/ships/kite.md: the front matter needs a type: line (ship, part, system, station, mission, npc, voice, text, poi). Skipped the file.');
  exact('a file outside any content folder', one('content/random/kite.md', SHIP()).errs, 'content/random/kite.md: this file is not inside a known content folder (ships, parts, systems, stations, missions, npcs, voice, text, poi). Skipped the file.');
  exact('a bad file name', one('content/ships/Kite Mk2.md', SHIP()).errs, 'content/ships/Kite Mk2.md: the file name "Kite Mk2.md" is not a valid id: use a-z, 0-9 and dashes, starting with a letter, 40 characters at most. Skipped the file.');
  exact('an id that disagrees with the file name', one('content/ships/kite.md', SHIP('id: wren\n')).errs, 'content/ships/kite.md, line 4: id is "wren" but the file name says "kite". Used the file name.');
  check('an id that agrees is fine', one('content/ships/kite.md', SHIP('id: kite\n')).errs.length === 0);
  check('sub-folders are allowed and the id is still the file name', one('content/missions/side/courier-1.md', FM('mission', 'kind: courier\ntitle: T\nreward: 5\n')).e.id === 'courier-1');
  const files = [{ path: 'content/ships/_draft.md', text: 'nonsense' }, { path: 'content/_templates/ship.md', text: 'x' }, { path: 'content/ships/.hidden.md', text: 'x' }, { path: 'content/ships/notes.txt', text: 'x' }, { path: 'content/ships/ok.md', text: SHIP() }];
  const r = C.loadAll(files);
  check('files and folders starting with _ or . and non-.md files are ignored without a word', r.entries.length === 1 && r.errors.length === 0 && r.files === 1, JSON.stringify(r.errors));
}

section('validator: placeholders and conditions');
{
  const M = (extra = '', body = '') => FM('mission', 'kind: rescue\ntitle: T\nreward: 5\n' + extra, body);
  exact('a placeholder typo in a section', one('content/missions/m.md', M('', '## Offer\nPays {rewrd}.\n')).errs, 'content/missions/m.md, line 7: in the "## Offer" section, "{rewrd}" is not a known placeholder here. Did you mean {reward}? Ignored.');
  exact('a placeholder typo in the description', one('content/missions/m.md', M('', 'Pays {rewrd}.\n')).errs, 'content/missions/m.md, line 7: the description: "{rewrd}" is not a known placeholder here. Did you mean {reward}? Ignored.');
  check('known placeholders pass', one('content/missions/m.md', M('', '## Offer\nPays {reward} for {count}.\n')).errs.length === 0);
  check('braces that are not a name are plain text', one('content/missions/m.md', M('', '## Offer\nA {} and a { reward } and {"a":1}.\n')).errs.length === 0);
  exact('a type with no placeholders', one('content/ships/k.md', SHIP('', '{reward}\n')).errs, 'content/ships/k.md, line 5: the description: "{reward}" is not a known placeholder here (this type has none). Ignored.');
  check('text strings accept any placeholder', one('content/text/ui.md', FM('text', '', '## Strings\n| key | text |\n|---|---|\n| a.b | Hello {name} |\n')).errs.length === 0);
  const cond = c => one('content/missions/m.md', M('unlock: ' + c + '\n')).errs.length === 0;
  check('every form of condition is accepted', ['always', 'mission:none', 'mission:accepted', 'mission:rescued', 'mission:failed', 'mission-id:rescue', 'credits>=800', 'credits<50', 'upgrade:armor', 'patrols>=1', 'system:halcyon', 'ship:wren'].every(cond));
  check('conditions that are not on the list are refused', ['credits>800', 'mission:done', 'random', 'credits>=', 'credits>=-5', 'upgrade:'].every(c => !cond(c)));
}

section('validator: sections, lists, key lines and tables');
{
  const M = (body) => FM('mission', 'kind: rescue\ntitle: T\nreward: 5\n', body);
  const N = (body) => FM('npc', 'name: JUNO\n', body);
  exact('an unknown section with a hint', one('content/missions/m.md', M('## Offr\nx\n')).errs, 'content/missions/m.md, line 7: unknown section "## Offr". Did you mean "## Offer"? Ignored.');
  exact('an unknown section without a hint', one('content/missions/m.md', M('## Banana\nx\n')).errs, 'content/missions/m.md, line 7: unknown section "## Banana". This type has: Offer, Board line, Progress, Progress rescued, Steps, Failure. Ignored.');
  exact('a section twice', one('content/missions/m.md', M('## Offer\nA\n\n## Offer\nB\n')).errs, 'content/missions/m.md, line 10: "## Offer" appears twice. Used the first.');
  exact('a list line without a dash', one('content/missions/m.md', M('## Steps\n- One\nTwo\n')).errs, 'content/missions/m.md, line 9: this line is not a list item: start it with "- ". Ignored.');
  check('list items are kept in order, * works as a bullet', JSON.stringify(one('content/missions/m.md', M('## Steps\n- One\n* Two\n- Three\n')).e.data.steps) === '["One","Two","Three"]');
  const kv = one('content/missions/m.md', M('## Board line\nactive: Go\n- failed: Lost\nrescued:   Done  \n'));
  check('key lines work with or without a dash', kv.errs.length === 0 && JSON.stringify(kv.e.data.boardLine) === '{"active":"Go","failed":"Lost","rescued":"Done"}', JSON.stringify(kv));
  exact('a key line with an unknown key', one('content/missions/m.md', M('## Board line\nactiv: Go\n')).errs, 'content/missions/m.md, line 8: unknown key "activ". Did you mean "active"? Ignored.');
  exact('a key line that is not key: text', one('content/missions/m.md', M('## Board line\njust words\n')).errs, 'content/missions/m.md, line 8: this line is not "key: text". Ignored.');
  exact('a key twice', one('content/missions/m.md', M('## Board line\nactive: A\nactive: B\n')).errs, 'content/missions/m.md, line 9: "active" appears twice. Used the first.');
  exact('a list item that is too long', one('content/npcs/n.md', N('## Lines\n- ' + 'x'.repeat(241) + '\n')).errs, 'content/npcs/n.md, line 6: this item is 241 characters but the limit is 240. Ignored.');
  exact('the persona limit', one('content/npcs/n.md', N('## Persona\n' + 'x'.repeat(601) + '\n')).errs, 'content/npcs/n.md, line 5: "## Persona" is 601 characters but the limit is 600. Ignored.');
  const many = one('content/npcs/n.md', N('## Lines\n' + Array.from({ length: 70 }, (_, i) => '- line ' + i).join('\n') + '\n'));
  check('a list stops at 60 items and says so', many.e.data.lines.length === 60 && has(many.errs, 'more than 60 items; the rest are ignored.'), many.errs.join('|'));

  const T = (rows) => N('## Reactions\n| when | line |\n|---|---|\n' + rows);
  check('a table row becomes an object', JSON.stringify(one('content/npcs/n.md', T('| credits>=800 | Rich. |\n')).e.data.reactions) === '[{"when":"credits>=800","line":"Rich."}]');
  check('an escaped pipe stays inside the cell, edge pipes are optional', JSON.stringify(one('content/npcs/n.md', T('credits>=1 | a \\| b\n')).e.data.reactions) === '[{"when":"credits>=1","line":"a | b"}]');
  exact('a row with too few cells', one('content/npcs/n.md', T('| always |\n')).errs, 'content/npcs/n.md, line 8: this row has 1 cell but the header has 2. Ignored the row.');
  exact('a bad cell in a required column drops the row', one('content/npcs/n.md', T('| bogus | x |\n| always | ok |\n')).errs, 'content/npcs/n.md, line 8: when is "bogus" but is not a known condition. Known: ' + C.CONDITIONS.join(', ') + '. Ignored the row.');
  exact('an empty required cell', one('content/npcs/n.md', T('| always | |\n')).errs, 'content/npcs/n.md, line 8: line is empty but required. Ignored the row.');
  exact('a table without its separator line', one('content/npcs/n.md', N('## Reactions\n| when | line |\n| always | Hi. |\n')).errs, 'content/npcs/n.md, line 6: the table header needs a line of dashes under it, like |---|---|.');
  exact('an unknown column', one('content/npcs/n.md', N('## Reactions\n| when | line | extra |\n|---|---|---|\n| always | Hi. | x |\n')).errs, 'content/npcs/n.md, line 6: unknown column "extra". Known: when, line. Ignored.');
  exact('a table missing a required column', one('content/npcs/n.md', N('## Reactions\n| when |\n|---|\n| always |\n')).errs, 'content/npcs/n.md, line 6: the table needs the column line. Ignored the table.');
  const rows = one('content/npcs/n.md', T(Array.from({ length: 210 }, () => '| always | Hi. |').join('\n') + '\n'));
  check('a table stops at 200 rows and says so', rows.e.data.reactions.length === 200 && has(rows.errs, 'more than 200 rows; the rest are ignored.'), rows.errs.join('|'));
  const sys = one('content/systems/s.md', FM('system', 'name: S\nkind: mining\nly: [14, 26.5]\n', '## Bodies\n| id | type | name | x | y | r | kind |\n|---|---|---|---|---|---|---|\n| a-1 | planet | | 10 | 20 | 300 | rock |\n| b-1 | gate | | 10 | 20 | 50 | |\n'));
  check('a table with empty optional cells leaves them out', sys.errs.length === 0 && JSON.stringify(sys.e.data.bodies) === '[{"id":"a-1","type":"planet","x":10,"y":20,"r":300,"kind":"rock"},{"id":"b-1","type":"gate","x":10,"y":20,"r":50}]', JSON.stringify(sys.e && sys.e.data.bodies));
  check('a list of two numbers (ly) is read as numbers', JSON.stringify(sys.e.data.ly) === '[14,26.5]');
}

section('limits and unsafe text');
{
  const big = one('content/ships/k.md', SHIP('', 'x'.repeat(33000)));
  check('a file over 32 KB is skipped', big.e === undefined && big.errs.length === 1 && big.errs[0] === 'content/ships/k.md: the file is 33 KB but the limit is 32 KB. Skipped the file.', big.errs.join('|'));
  const many = C.loadAll(Array.from({ length: 405 }, (_, i) => ({ path: 'content/ships/s' + String(1000 + i) + '.md', text: SHIP() })));
  check('more than 400 files: the first 400 load and it says so', many.entries.length === 400 && many.errors.length === 1 && many.errors[0].message === 'more than 400 content files; the rest are ignored.', many.errors.length + ' errors');
  const zw = String.fromCharCode(0x200b), bidi = String.fromCharCode(0x202e), ctl = String.fromCharCode(7), ls = String.fromCharCode(0x2028), bom = String.fromCharCode(0xfeff);
  const dirty = one('content/ships/k.md', FM('ship', `name: Ki${zw}te${bidi}${ctl}\nrole: a${ls}b${bom}c\n`, `Hel${zw}lo${bidi}\n`));
  check('control, zero-width, bidi and line-separator characters are removed from text', dirty.e.data.name === 'Kite' && dirty.e.data.role === 'abc' && dirty.e.data.description === 'Hello', JSON.stringify(dirty.e && dirty.e.data));
  const evil = one('content/ships/k.md', FM('ship', 'name: K\n__proto__: x\nconstructor: y\n', '## __proto__\nz\n'));
  check('__proto__ and constructor are only ever unknown names', ({}).polluted === undefined && !Object.prototype.hasOwnProperty.call(evil.e.data, '__proto__') && evil.errs.length === 3 && evil.errs.every(x => x.includes('unknown') || x.includes('not "key: value"')), evil.errs.join('|'));
  const evilKv = one('content/missions/m.md', FM('mission', 'kind: rescue\ntitle: T\nreward: 5\n', '## Board line\n__proto__: x\nconstructor: y\n'));
  check('key lines and table columns do not accept __proto__ either', evilKv.errs.length === 2 && evilKv.e.data.boardLine === undefined && Object.keys(({})).length === 0, evilKv.errs.join('|'));
  check('text is data: html and script stay as plain characters', one('content/ships/k.md', SHIP('role: <script>alert(1)</script>\n')).e.data.role === '<script>alert(1)</script>');
}

section('loading a whole pack: duplicates, references, order, hash');
{
  const a = { path: 'content/ships/a/kite.md', text: SHIP('hull: 70\n') }, b = { path: 'content/ships/b/kite.md', text: SHIP('hull: 80\n') };
  const r = C.loadAll([b, a]);
  check('two files with the same id: the later path wins and both are named', r.entries.length === 1 && r.entries[0].data.hull === 80 && r.errors.length === 1 &&
    C.formatError(r.errors[0]) === '(warning) content/ships/b/kite.md: there are two ship files called "kite" (content/ships/a/kite.md and this one). Used this one.', C.formatError(r.errors[0] || {}));
  const files = [{ path: 'content/stations/s.md', text: FM('station', 'name: S\nsystem: nowhere\n') }, { path: 'content/ships/k.md', text: SHIP('yard: [s, ghost]\n') }];
  const w = C.loadAll(files);
  check('a reference with no file is a warning naming the file to make', w.errors.length === 2 && w.errors.every(e => e.level === 'warn') &&
    C.formatError(w.errors[0]) === '(warning) content/ships/k.md: yard refers to the station "ghost", but there is no file for it (stations/ghost.md).' &&
    C.formatError(w.errors[1]) === '(warning) content/stations/s.md: system refers to the system "nowhere", but there is no file for it (systems/nowhere.md).', w.errors.map(C.formatError).join('|'));
  check('strictRefs makes it an error', C.loadAll(files, { strictRefs: true }).errors.every(e => e.level === 'error'));
  check('known() says the code already has that id', C.loadAll(files, { known: (t, i) => i === 'ghost' || i === 'nowhere' }).errors.length === 0);
  const x = C.loadAll([a, { path: 'content/npcs/j.md', text: FM('npc', 'name: J\n') }]), y = C.loadAll([{ path: 'content/npcs/j.md', text: FM('npc', 'name: J\n') }, a]);
  check('the result does not depend on the order the files are given', JSON.stringify(x) === JSON.stringify(y));
  check('the hash is 8 hex characters, stable, and changes with the content', /^[0-9a-f]{8}$/.test(x.hash) && x.hash === y.hash && C.loadAll([{ path: a.path, text: SHIP('hull: 71\n') }]).hash !== C.loadAll([a]).hash);
}

section('systems: bodies, pirates, docks and what the files say to each other (docs/MODDING.md 6.3, 6.4)');
{
  const HEAD = '| id | type | name | x | y | art | r | rocks | landable | kind | seed | look | labelDy | credits | hull | guard | note |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  // a body row from the columns that matter; the rest stay empty
  const ROW = o => '| ' + ['id', 'type', 'name', 'x', 'y', 'art', 'r', 'rocks', 'landable', 'kind', 'seed', 'look', 'labelDy', 'credits', 'hull', 'guard', 'note'].map(k => (o[k] === undefined ? '' : o[k])).join(' | ') + ' |\n';
  const SYS = (rows, front = '', after = '') => FM('system', 'name: S\nkind: mining\n' + front, '## Bodies\n' + HEAD + rows.map(ROW).join('') + after);
  const KNOWN = { known: () => true }; // the code knows every station, system and ship these single files name
  const sys = (rows, front, after) => one('content/systems/s.md', SYS(rows, front, after), KNOWN);
  const B = (id, type, extra) => Object.assign({ id, type, x: 100, y: 200 }, extra);

  const all = sys([
    B('s-station', 'station', { name: 'S Station', art: 'station', labelDy: -260 }),
    B('s-home', 'planet', { name: 'Home', art: 'planet', r: 316, landable: 'yes' }),
    B('s-far', 'planet', { name: 'Far', kind: 'gas', seed: 2, r: 440, landable: 'no' }),
    B('s-belt', 'belt', { name: 'Belt', r: 700, rocks: 15 }),
    B('s-wreck', 'poi', { name: 'Hulk', kind: 'wreck', credits: 250, hull: 40, guard: 2, note: 'Pirates guard it.' }),
    B('s-out', 'scenery', { name: 'Outpost', art: 'outpost', labelDy: -175 }),
    B('s-dead', 'scenery', { name: 'Dead station', look: 'derelict', labelDy: -240 }),
    B('s-gate', 'gate', { name: 'Gate', r: 110 })
  ], 'pirateMax: 8\npirateEvery: 15000\nstarType: G\nstarX: 18000\nstarY: 18000\nseed: 4001\n', '\n## Pirates\n| kind | weight |\n|---|---|\n| raider | 0.25 |\n| drone | 0.35 |\n| gunship | 0.4 |\n');
  check('a system with every kind of body, a pirate table and a star loads with no problems', all.errs.length === 0 && all.e && all.e.data.bodies.length === 8, all.errs.join(' | '));
  const rows = all.e && all.e.data.bodies;
  check('a planet keeps kind and seed, scenery keeps look and labelDy, a site keeps its payout and note', rows && rows[2].kind === 'gas' && rows[2].seed === 2 && rows[2].landable === false && rows[6].look === 'derelict' && rows[6].labelDy === -240 && rows[5].art === 'outpost' && rows[4].guard === 2 && rows[4].note === 'Pirates guard it.' && rows[7].r === 110, JSON.stringify(rows));
  check('the pirate table and its two numbers are kept', all.e && all.e.data.pirateMax === 8 && all.e.data.pirateEvery === 15000 && JSON.stringify(all.e.data.pirates) === '[{"kind":"raider","weight":0.25},{"kind":"drone","weight":0.35},{"kind":"gunship","weight":0.4}]', JSON.stringify(all.e && all.e.data.pirates));

  const bad = (name, row, say) => { const r = sys([row, B('ok-1', 'gate', { name: 'Gate', r: 5 + 5 })]); check(name, r.errs.some(m => m.includes(say) && m.includes('Ignored')) && r.e.data.bodies.length === 1 && r.e.data.bodies[0].id === 'ok-1', r.errs.join(' | ')); };
  bad('a planet with no kind and no art is refused, saying how to fix it', B('p-1', 'planet', { name: 'P', r: 300 }), 'a planet needs a kind (rock, ice, gas, lava, ringed), or art planet for the built-in one');
  bad('a planet whose kind is a wreck is refused', B('p-2', 'planet', { name: 'P', r: 300, kind: 'wreck' }), 'a planet\'s kind is wreck but must be one of: rock, ice, gas, lava, ringed');
  bad('a planet with no radius is refused', B('p-3', 'planet', { name: 'P', kind: 'rock' }), 'a planet needs r');
  bad('a belt needs a radius and a rock count', B('b-1', 'belt', { name: 'B', r: 300 }), 'a belt needs rocks');
  bad('a site needs a kind: wreck or beacon', B('w-1', 'poi', { name: 'W', kind: 'rock' }), 'a poi needs a kind: wreck or beacon');
  bad('scenery needs an art or a look', B('c-1', 'scenery', { name: 'C' }), 'a scenery body needs an art or a look');
  bad('scenery needs a name', B('c-2', 'scenery', { art: 'outpost' }), 'a scenery needs name');
  bad('a gate needs a radius', B('g-1', 'gate', { name: 'G' }), 'a gate needs r');
  bad('a station row needs a name', B('t-1', 'station', { art: 'station' }), 'a station needs name');
  bad('a texture the game does not have is refused with the list', B('x-1', 'scenery', { name: 'X', art: 'banana' }), 'art is "banana" but must be one of: station, outpost, planet, hub, foundry, nest, derelict');
  const far = sys([B('l-1', 'scenery', { name: 'L', art: 'outpost', labelDy: -5000 })]);
  check('a label that sits 5000 px away loses the label offset and keeps the body', far.errs.length === 1 && far.errs[0].includes('labelDy is -5000 but must be a whole number from -3000 to 3000. Ignored.') && far.e.data.bodies.length === 1 && far.e.data.bodies[0].labelDy === undefined, far.errs.join(' | '));

  const dup = sys([B('d-1', 'gate', { name: 'One', r: 20 }), B('d-1', 'gate', { name: 'Two', r: 30 })]);
  check('a body id used twice keeps the first row and says so', dup.e.data.bodies.length === 1 && dup.e.data.bodies[0].name === 'One' && dup.errs.some(m => m.includes('the body "d-1" is in the Bodies table twice. Ignored the second row.')), dup.errs.join(' | '));
  const pb = sys([B('a-1', 'gate', { name: 'A', r: 9 + 1 })], 'pirateMax: 0\n', '\n## Pirates\n| kind | weight |\n|---|---|\n| bandit | 0.5 |\n| raider | 2 |\n');
  check('a pirate table names real pirates with weights from 0 to 1, and pirateMax starts at 1', has(pb.errs, 'pirateMax is 0 but must be a whole number from 1 to 40') && has(pb.errs, 'kind is "bandit" but must be one of: raider, drone, gunship') && has(pb.errs, 'weight is 2 but must be a number from 0 to 1'), pb.errs.join(' | '));

  const ST = (extra = '', body = '') => FM('station', 'name: Dock\nsystem: s\n' + extra, body);
  const dock = one('content/stations/s-station.md', ST('yard: [kite, ox]\npartMult: 1.25\nfee: 50\nsalvageMult: 2\n', '## Parts\n| slot | tier |\n|---|---|\n| shields | 3 |\n| weapons | 2 |\n'), KNOWN);
  check('a station keeps its yard, price factor, fee, salvage factor and part caps', dock.errs.length === 0 && JSON.stringify(dock.e.data.yard) === '["kite","ox"]' && dock.e.data.partMult === 1.25 && dock.e.data.fee === 50 && dock.e.data.salvageMult === 2 && JSON.stringify(dock.e.data.parts) === '[{"slot":"shields","tier":3},{"slot":"weapons","tier":2}]', dock.errs.join(' | ') + JSON.stringify(dock.e && dock.e.data));
  const badDock = one('content/stations/s-station.md', ST('partMult: 9\nfee: -1\nsalvageMult: 0.5\n', '## Parts\n| slot | tier |\n|---|---|\n| armor | 2 |\n| tank | 4 |\n'), KNOWN);
  check('a station with a wrong factor, fee, slot or tier is told so, one problem each', has(badDock.errs, 'partMult is 9 but must be a number from 0.1 to 5') && has(badDock.errs, 'fee is -1 but must be a whole number from 0 to 100000') && has(badDock.errs, 'salvageMult is 0.5 but must be a number from 1 to 5') && has(badDock.errs, 'slot is "armor" but must be one of: engine, shields, weapons, tank, cargo') && has(badDock.errs, 'tier is 4 but must be a whole number from 1 to 3'), badDock.errs.join(' | '));
  const yardRef = C.loadAll([{ path: 'content/stations/s-station.md', text: ST('yard: [kite, frigate]\n') }], { strictRefs: true, known: (t, i) => t === 'system' || (t === 'ship' && i === 'kite') });
  check('a yard with a ship nobody has is an error under strictRefs, naming the file to make; a ship the code has is fine', yardRef.errors.length === 1 && C.formatError(yardRef.errors[0]) === 'content/stations/s-station.md: yard refers to the ship "frigate", but there is no file for it (ships/frigate.md).', yardRef.errors.map(C.formatError).join('|'));

  // the files of one world
  const sysFile = (rows, extra) => ({ path: 'content/systems/s.md', text: SYS(rows, extra) });
  const world = files => C.loadAll(files, { known: (t, i) => t === 'ship' }).errors.map(C.formatError);
  let w = world([sysFile([B('s-dock', 'station', { name: 'Dock' })])]);
  check('a station row with no station file is a warning naming the file to make', w.length === 1 && w[0] === '(warning) content/systems/s.md: the station "s-dock" has a row here but no file (stations/s-dock.md).', w.join('|'));
  w = world([sysFile([B('s-dock', 'station', { name: 'Dock' })]), { path: 'content/stations/s-dock.md', text: ST() }]);
  check('a station file and its row agree: nothing to say', w.length === 0, w.join('|'));
  w = world([sysFile([B('s-dock', 'station', { name: 'Dock' })]), { path: 'content/stations/other.md', text: ST() }]);
  check('a station file whose system has no row for it is a warning: nothing places the dock', has(w, 'content/stations/other.md: its system "s" (content/systems/s.md) has no station row "other" in its Bodies table, so nothing places this dock.'), w.join('|'));
  w = world([sysFile([B('s-dock', 'station', { name: 'Dock' })]), { path: 'content/stations/s-dock.md', text: FM('station', 'name: Dock\nsystem: t\n') }, { path: 'content/systems/t.md', text: SYS([B('t-gate', 'gate', { name: 'G', r: 50 })]) }]);
  check('a station that says another system than the one with its row is a warning', has(w, 'content/stations/s-dock.md: system is "t" but systems/s.md has a station row for "s-dock"'), w.join('|'));
  w = world([sysFile([B('s-dock', 'station', { name: 'Dock Row' })]), { path: 'content/stations/s-dock.md', text: ST() }]);
  check('a station called two things is a warning: the station file wins', has(w, 'name is "Dock" but the Bodies row in content/systems/s.md calls it "Dock Row". The station file wins.'), w.join('|'));
  const SITE = (extra = '') => ({ path: 'content/poi/s-wreck.md', text: FM('poi', 'kind: wreck\nname: Hulk\n' + extra, 'Pays out.\n') });
  w = world([sysFile([B('s-wreck', 'poi', { kind: 'wreck', credits: 90, name: 'Row name' })]), SITE('credits: 120\n')]);
  check('a site paid in its file and again in the row is a warning: the file wins', has(w, 'the site "s-wreck" has its own file (content/poi/s-wreck.md), which pays it; the row says where, so name, credits in the row are ignored.'), w.join('|'));
  w = world([sysFile([B('s-wreck', 'poi', { kind: 'beacon' })]), SITE()]);
  check('a site that is a beacon in the row and a wreck in its file is a warning', has(w, 'the site "s-wreck" is a beacon here but a wreck in content/poi/s-wreck.md.'), w.join('|'));
  w = world([sysFile([B('s-wreck', 'poi', { kind: 'wreck' })]), SITE('credits: 120\n')]);
  check('a row that only says where, over a site with its own file: nothing to say', w.length === 0, w.join('|'));
}

section('schema sanity');
{
  const S = C.SCHEMA, types = Object.keys(S);
  check('every type has a folder and every folder maps back', types.every(t => C.FOLDERS[S[t].folder] === t));
  check('every reference points at a real type', types.every(t => Object.values(S[t].fields).every(f => !f.ref || S[f.ref])));
  check('every pick list has words and no duplicates', types.every(t => [...Object.values(S[t].fields), ...Object.values(S[t].sections).flatMap(s => Object.values(s.cols || {}))].every(f => f.t !== 'pick' || (f.of.length && new Set(f.of).size === f.of.length))));
  check('every number has a range with min below max', types.every(t => Object.values(S[t].fields).every(f => !['int', 'num'].includes(f.t) || f.min < f.max)));
  check('field names are plain words (no section or reserved names)', types.every(t => Object.keys(S[t].fields).every(f => /^[A-Za-z][A-Za-z0-9]*$/.test(f) && f !== 'type' && f !== 'id' && f !== 'description' && !(f in S[t].sections))));
  check('a field and a section never share a name', types.every(t => Object.keys(S[t].sections).every(k => !(k in S[t].fields))));
}

section('templates and the shipped pack');
{
  const tdir = join(ROOT, 'content', '_templates'), names = readdirSync(tdir).filter(f => f.endsWith('.md'));
  check('there is one template per type', names.length === Object.keys(C.SCHEMA).length && Object.keys(C.SCHEMA).every(t => names.includes(t + '.md')), names.join(','));
  names.forEach(f => {
    const t = f.replace('.md', ''), r = C.loadAll([{ path: 'content/' + C.SCHEMA[t].folder + '/template.md', text: readFileSync(join(tdir, f), 'utf8') }]);
    check(`template ${f} is a valid file with no problems`, r.entries.length === 1 && r.errors.filter(e => e.level === 'error').length === 0, r.errors.map(C.formatError).join(' | '));
  });
  const shipped = build({ write: false });
  check('the shipped content/ has no errors', shipped.result.errors.filter(e => e.level === 'error').length === 0, shipped.result.errors.map(C.formatError).join(' | '));
  check('content.generated.js is up to date (run node tools/build-content.mjs)', !shipped.changed);
}

section('build script and the generated file');
{
  const good = build({ dir: join(ROOT, 'tests/fixtures/content-good'), prefix: 'content/', out: '/nonexistent/none.js', write: false });
  check('the good fixture pack loads with no problems, one entry per file', good.result.errors.length === 0 && good.result.entries.length === 9 && good.result.files === 9, good.result.errors.map(C.formatError).join(' | '));
  const types = good.result.entries.map(e => e.type).sort().join(',');
  check('and it covers every type', types === 'mission,npc,part,ship,ship,station,system,text,voice', types);
  const again = build({ dir: join(ROOT, 'tests/fixtures/content-good'), prefix: 'content/', out: '/nonexistent/none.js', write: false });
  check('the generated text is the same every time', again.text === good.text);
  const ctx = vm.createContext({}); vm.runInContext(good.text, ctx);
  const got = vm.runInContext('CONTENT', ctx);
  check('the generated file is plain JavaScript that sets CONTENT', got && got.version === 1 && got.hash === good.result.hash && got.entries.length === 9 && Array.isArray(got.errors), good.text.slice(0, 200));
  check('and CONTENT matches what the loader returned', JSON.stringify(got.entries) === JSON.stringify(good.result.entries));
  const bad = build({ dir: join(ROOT, 'tests/fixtures/content-bad'), prefix: 'content/', out: '/nonexistent/none.js', write: false });
  const errs = bad.result.errors.filter(e => e.level === 'error').length;
  check('the bad fixture pack loads what it can and lists what was wrong', bad.result.entries.length === 4 && errs === 12, bad.result.entries.length + ' entries, ' + errs + ' errors');
  check('and the problems are in the generated file too', JSON.stringify(vm.runInContext('CONTENT', (() => { const c = vm.createContext({}); vm.runInContext(bad.text, c); return c; })()).errors) === JSON.stringify(bad.result.errors));
  const shipped = build({ dir: join(ROOT, 'content'), prefix: 'content/', out: '/nonexistent/none.js', write: false });
  check('the shipped content/ is the proof set of card m4 (2 ships, 4 missions, 6 npcs, 9 parts, 7 poi, the UI strings, the dock, five more docks and eight star systems of card systems-content-draft) and builds with no problems at all', shipped.result.errors.length === 0 && shipped.result.entries.map(e => e.type + ':' + e.id).sort().join() === 'mission:bounty,mission:escort,mission:patrol,mission:rescue,npc:dex,npc:ida,npc:juno,npc:moss,npc:sable,npc:tamsin,part:engine-1,part:engine-2,part:engine-3,part:shields-1,part:shields-2,part:shields-3,part:weapons-1,part:weapons-2,part:weapons-3,poi:beacon-e,poi:signal-beacon,poi:signal-wreck,poi:wreck-nw,poi:wreck-s,poi:wreck-se,poi:wreck-w,ship:drone,ship:raider,station:brass-smelter,station:ember-foundry,station:halcyon-station,station:kestrel-outpost,station:meridian-exchange,station:roost-dock,system:brass,system:ember,system:halcyon,system:hollow,system:kestrel,system:lethe,system:meridian,system:roost,text:ui', shipped.result.errors.map(C.formatError).join(' | '));
  check('an engine part may set boostAdd (px/s on the boost speed) up to 2000, and a rescue call has a second progress text', (() => {
    const p = (path, text) => C.validate(C.parse(path, text));
    const ok = p('content/parts/booster-1.md', '---\ntype: part\nslot: engine\ntier: 1\nname: B\nboostAdd: 200\n---\n').data, big = p('content/parts/booster-1.md', '---\ntype: part\nslot: engine\ntier: 1\nname: B\nboostAdd: 9000\n---\n');
    const r = p('content/missions/rescue.md', '---\ntype: mission\nkind: rescue\ntitle: T\nreward: 5\n---\n## Progress rescued\nAboard.\n').data;
    return ok && ok.boostAdd === 200 && big.errors.some(e => /boostAdd/.test(e.message) && /2000/.test(e.message)) && r && r.progressRescued === 'Aboard.';
  })());
  check('readPack skips _ and . names (the templates) and gives / paths with the prefix', readPack(join(ROOT, 'content'), 'content/').length === 43 && !readPack(join(ROOT, 'content'), 'content/').some(f => /\/_/.test(f.path)) && readPack(join(ROOT, 'tests/fixtures/content-good'), 'content/').every(f => f.path.startsWith('content/') && !f.path.includes('\\')));
  check('generate() of an empty result is valid JavaScript', (() => { const c = vm.createContext({}); vm.runInContext(generate({ hash: 'x', files: 0, entries: [], errors: [] }), c); return vm.runInContext('CONTENT.entries.length', c) === 0; })());
}

console.log(failed ? `\nCONTENT FAIL (${failed} of ${n} checks)` : `\nCONTENT PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
