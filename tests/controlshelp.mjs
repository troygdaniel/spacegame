// smoke: the help says the keys the game has: every key named is bound, every key bound in space is named, each line fits the H page (plain Node, no Chrome)
// Card space-game-controls-one-truth. On 17 Nov about fifteen cards changed keys in one evening and the help fell behind: the gun lock (V),
// the fuel ranger (F), X and the wheel were bound and nowhere in the help, and the Space page had grown to 28 drawn lines where 20 fit.
// The controls table (src/data_controls.js) is the one truth: the H page, Settings > Controls and the Ship bay's key list are built from it,
// and content/text/ui.md repeats its H lines. This test keeps the table honest against the code:
//   1. every key cap a row names is bound in a file of that row's scene (a help line for a key that does nothing fails here)
//   2. every key a file of the Space scene binds is named in FLIGHT or ANYWHERE (a new key with no help line fails here)
//   3. a line of the H page is at most 43 characters and a scene has at most 20: what the page holds without wrapping or running off
//   4. content/text/ui.md has exactly the table's lines; the key line in space and the README name only keys that are in the table
//   5. nothing names a control that is gone
// How it knows what is bound: the literal keys of addKey / addKeys calls, the e.code and e.key tests of keydown handlers, and the keys kept
// in tables (ASSIST.key, the assist's modes, OVERVIEW.key, GUNLOCK.key), read from the game itself.
// Run: node tests/controlshelp.mjs   (exit code 1 on a failed check)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const read = f => readFileSync(join(ROOT, f), 'utf8');

// ---- what the code binds, per scene ----
const WORDS = { ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9', ESCAPE: 'ESC', NUMPADENTER: 'ENTER' };
const norm = k => { let s = String(k).trim().toUpperCase().replace(/^KEY(?=[A-Z]$)/, '').replace(/^DIGIT(?=\d$)/, ''); if (s === ' ') s = 'SPACE'; return WORDS[s] || s; };
function bound(files) {
  const keys = new Set();
  for (const f of files) {
    const p = join(ROOT, 'src', f + '.js'); if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/addKeys?\('([^']+)'\)/g)) m[1].split(',').forEach(k => keys.add(norm(k)));
    for (const m of src.matchAll(/(?<![\w.])(?:e\.(?:code|key)|code) (?:===|!==) '([^']+)'/g)) keys.add(norm(m[1]));   // e.code === 'KeyG', code === 'KeyR' (not scene.key === 'Station')
    for (const m of src.matchAll(/\b(Key[A-Z]|Digit\d|Enter|Escape|Tab|Space): /g)) keys.add(norm(m[1]));                 // a map of codes: { KeyF: 'fleet', KeyY: 'yard' }
    for (const m of src.matchAll(/\bcode: '(Key[A-Z]|Digit\d)'/g)) keys.add(norm(m[1]));                                 // a table that holds the code to read: LISTEN.code of src/listen.js
    for (const m of src.matchAll(/keydown-([A-Z]+)/g)) keys.add(norm(m[1]));
    for (const m of src.matchAll(/\/\^\[(\d)-(\d)\]\$\/\.test\(e\.key\)/g)) for (let d = +m[1]; d <= +m[2]; d++) keys.add(String(d)); // a number row read from e.key
  }
  return keys;
}
const SPACE_FILES = ['space', 'assist', 'assist_orbit', 'autopilot', 'cruise', 'jump', 'gunlock', 'overview', 'clickmove', 'boost', 'camzoom', 'autotarget', 'handling', 'navpanel', 'hud'];
const EVERYWHERE = ['map', 'meta', 'shipcomputer', 'listen'];         // Tab, H, Esc, M, I (the ship's computer, src/shipcomputer.js) and U (hold to talk to it, src/listen.js): window handlers for every scene
const SCENES = {
  station: ['station', 'shop', 'fuel', 'chat', 'journal', 'jump'].concat(EVERYWHERE),
  ship: ['shipmode', 'hangar'].concat(EVERYWHERE),
  flight: SPACE_FILES.concat(EVERYWHERE),
  surface: ['surface'].concat(EVERYWHERE),
  title: ['title', 'contentui', 'settings', 'mods'],
  any: EVERYWHERE
};
const spaceOwn = bound(SPACE_FILES);
[J('ASSIST.key'), J('OVERVIEW.key'), J('GUNLOCK.key')].concat(J('Object.values(ASSIST_MODES).map(m => m.key).filter(Boolean)')).forEach(k => spaceOwn.add(norm(k)));

// a key cap of the table as the keys it stands for; a cap that is not a keyboard key (the mouse) stands for none
const NOT_KEYS = ['CLICK', 'MOUSE', 'WHEEL', 'ANY KEY'];
const capKeys = cap => { const c = cap.toUpperCase(); if (NOT_KEYS.includes(c)) return []; const r = /^(\d)-(\d)$/.exec(c); if (r) { const out = []; for (let d = +r[1]; d <= +r[2]; d++) out.push(String(d)); return out; } return [norm(c)]; };
const groups = J(`CONTROLS.map(g => ({ id: g.id, scene: g.scene, rows: g.rows.map(r => ({ k: r.k, t: r.t, help: r.help })) }))`);
const group = id => groups.find(x => x.id === id);

console.log('1. every key the help names is bound');
for (const gr of groups) {
  const have = gr.id === 'flight' ? new Set([...bound(SCENES.flight), ...spaceOwn]) : bound(SCENES[gr.id] || []);
  if (gr.id === 'title') continue; // the Title reads keys by e.code in one long line of its own; its rows are not what changed and are checked in tests/settings.mjs
  const missing = [];
  gr.rows.forEach(r => r.k.forEach(cap => capKeys(cap).forEach(k => { if (!have.has(k)) missing.push(cap + ' (' + r.t + ')'); })));
  check(`${gr.id}: every key cap is a key its scene binds`, missing.length === 0, missing.join('; ') + '   bound: ' + [...have].join(' '));
}
check('the wheel row stands for a real wheel handler (src/camzoom.js)', /'wheel'/.test(read('src/camzoom.js')) && group('flight').rows.some(r => r.k.includes('Wheel')));
check('the click row stands for a real pointer handler (src/clickmove.js)', /pointerdown/.test(read('src/clickmove.js')) && group('flight').rows.some(r => r.k.includes('Click')));

console.log('2. every key bound in space is in the help');
{
  const named = new Set(); ['flight', 'any'].forEach(id => group(id).rows.forEach(r => r.k.forEach(cap => capKeys(cap).forEach(k => named.add(k)))));
  const ALSO = { UP: 'W', DOWN: 'S', LEFT: 'A', RIGHT: 'D' };  // the arrows do what these do; the table names the letters
  const silent = [...spaceOwn].filter(k => !named.has(k) && !(ALSO[k] && named.has(ALSO[k])) && k !== 'ENTER');
  check('no key of the Space scene is missing from FLIGHT and ANYWHERE', silent.length === 0, 'bound and not named: ' + silent.join(' '));
  const texts = group('flight').rows.map(r => r.t).join(' | ');
  check('Enter, which only the lists use, is named in the lines of both lists (N and B)', group('flight').rows.filter(r => r.k.includes('N') || r.k.includes('B')).every(r => /Enter/.test(r.t)), texts);
  check('the scan saw the keys it should (flight, lists, assist, orders, lock, ranger, mission panel)', ['W', 'A', 'D', 'S', 'SHIFT', 'Q', 'E', 'SPACE', 'L', 'R', 'N', 'X', 'C', 'P', 'F', 'Z', '1', '2', '3', '4', 'B', 'V', 'T'].every(k => spaceOwn.has(k)), [...spaceOwn].join(' '));
}

console.log('3. the H page holds it');
for (const sc of ['Station', 'Ship', 'Space', 'Surface']) {
  const lines = J(`controlsHelp('${sc}')`), long = lines.filter(l => l.length > 43);
  check(`${sc}: ${lines.length} lines, 20 at most, none over 43 characters`, lines.length <= 20 && long.length === 0, long.map(l => l.length + ': ' + l).join(' | '));
  check(`${sc}: the H page is the table (HELP is controlsHelp)`, J(`JSON.stringify(HELP.${sc}) === JSON.stringify(controlsHelp('${sc}'))`));
}

console.log('4. the other places that say keys');
{
  const ui = read('content/text/ui.md');
  const want = []; for (const sc of ['Station', 'Ship', 'Space', 'Surface']) J(`controlsHelp('${sc}')`).forEach((l, i) => want.push(`| help.${sc.toLowerCase()}.${i + 1} | ${l} |`));
  const got = ui.split('\n').filter(l => l.startsWith('| help.'));
  check('content/text/ui.md has exactly the table\'s H lines, in order', JSON.stringify(got) === JSON.stringify(want), got.filter((l, i) => l !== want[i]).slice(0, 3).join(' // '));
  const named = new Set(); group('flight').rows.forEach(r => r.k.forEach(c => named.add(c.toUpperCase())));
  const line = (/this\.keyLine = this\.add\.text\([^']*'([^']+)'/.exec(read('src/space.js')) || [])[1] || '';
  const caps = line.split(/ {2,}/).map(part => part.split(' ')[0]).flatMap(c => c.split('/')).filter(Boolean).map(c => c.toUpperCase());
  check('the key line in space names only keys of the FLIGHT table', caps.length >= 8 && caps.every(c => named.has(c)), line + '   -> ' + caps.join(' '));
  const readme = read('README.md'), rows = readme.split('\n').filter(l => /^\| Space/.test(l)).join(' ');
  const inReadme = [...rows.matchAll(/`([^`]+)`/g)].flatMap(m => m[1].split(' ')).map(c => c.toUpperCase());
  check('the README\'s Space rows name only keys of the FLIGHT table', inReadme.length >= 15 && inReadme.every(c => named.has(c) || c === 'ENTER' || /^\d$/.test(c)), inReadme.filter(c => !named.has(c) && c !== 'ENTER' && !/^\d$/.test(c)).join(' '));
  const must = ['Z', 'B', 'V', 'N', 'X', 'C', 'P', 'G', 'F', 'R', 'L'];
  check('and they name the keys of tonight: ' + must.join(' '), must.every(k => inReadme.includes(k)), must.filter(k => !inReadme.includes(k)).join(' '));
}

console.log('5. nothing names a control that is gone');
{
  const texts = { 'the table': groups.flatMap(x => x.rows.map(r => r.k.join(' ') + ' ' + r.t)).join('\n'), 'content/text/ui.md': read('content/text/ui.md'), 'the guide tips (src/guide.js)': [...read('src/guide.js').matchAll(/'([^'\n]{12,})'/g)].map(m => m[1]).join('\n'),
    'the README controls': read('README.md').split('\n').filter(l => /^\| (Station|Space|Surface|Anywhere)/.test(l)).join('\n') };
  const GONE = [[/\bnav(igation)? list\b|\bN list\b/i, 'the N list (it is the navigation panel)'], [/\bB\b[^|\n]{0,24}\block/i, 'B as the gun lock (the lock is V)'], [/pick(s|ed)? (it |one )?(on|from) the (Tab |sector )?map/i, 'the Tab-map picker'],
    [/Walk (left|right|up) to the|Go right to the hangar/i, 'a walk to a terminal as the way in (the station menu has the keys)']];
  for (const [where, text] of Object.entries(texts)) for (const [re, what] of GONE) check(`${where} does not name ${what}`, !re.test(text), (re.exec(text) || [''])[0]);
  const st = J(`guideHint({ scene: { key: 'Station' } })`);
  check('the first tip in the station names the station menu', /station menu/.test(st), st);
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCONTROLS HELP FAIL (${failed} of ${n})` : `\nCONTROLS HELP PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
