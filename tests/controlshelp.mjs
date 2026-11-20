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
//   6. the Campaign (card space-game-campaign-keys-help): every key a Campaign file binds is on the table (the CAMPAIGN and PANELS groups and the debug keys), every key the table names is bound, and the key line, the
//      pause card and the title name only keys of the table. A key added to the Campaign scene, its map or its panels and not to src/data_controls.js fails here, so the H page cannot go stale again
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
// the Earth refit card and the plain pick card between levels are screens of their own, and print their keys on themselves (refit: 1 to 3 choose a tech, 4 and 5 buy ships, 6 to 8 choose what was looted from a cloaked cache; pick: 1 to 6): their handlers are not the Campaign's flight keys
const noRefit = src => src.replace(/  (?:refitKey|pickKey)\(c\) \{[\s\S]*?\n  \}\n/g, '');
function bound(files) {
  const keys = new Set();
  for (const f of files) {
    const p = join(ROOT, 'src', f + '.js'); if (!existsSync(p)) continue;
    const src = noRefit(readFileSync(p, 'utf8'));
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
const CAMP_FILES = ['campaignscene', 'campmapdraw', 'campmap', 'campkeys', 'camppanel'];             // the Campaign scene, its Tab map, its H page and its panels (src/camppanel.js)
const SCENES = {
  campaign: CAMP_FILES.concat(EVERYWHERE),
  panels: CAMP_FILES.concat(EVERYWHERE),
  station: ['station', 'shop', 'fuel', 'chat', 'journal', 'jump'].concat(EVERYWHERE),
  ship: ['shipmode', 'hangar'].concat(EVERYWHERE),
  flight: SPACE_FILES.concat(EVERYWHERE),
  surface: ['surface'].concat(EVERYWHERE),
  title: ['title', 'contentui', 'settings', 'mods'],
  any: EVERYWHERE
};
// what the Campaign binds: the literal keys of its files, the scene's own tests of the code it holds in a variable (c === 'KeyT'), the map's key (CAMPMAP.key), and the digits: the scene hands every digit
// to campPanelKey, which opens the panel whose key it is (CAMP_PANELS) and picks the row whose n it is, so those digits are bound by that table and the test below that the scene routes them
const campBound = () => {
  const keys = bound(CAMP_FILES);
  for (const m of read('src/campaignscene.js').matchAll(/(?<![\w.])c === '([^']+)'/g)) keys.add(norm(m[1]));
  keys.add(norm(J('CAMPMAP.key')));
  if (/\be\.shiftKey\b/.test(read('src/campaignscene.js')) && /\bshift\b/.test(read('src/campmapdraw.js'))) keys.add('SHIFT'); // Shift+Enter: the scene passes the event's shiftKey, the map reads it
  ['M', 'I', 'U'].forEach(k => { if (bound(EVERYWHERE).has(k)) keys.add(k); }); // the window handlers that work in every scene, the Campaign's too: mute (meta), the strip (shipcomputer), the voice (listen)
  J('CAMP_PANELS.panels.map(p => [p.key].concat(p.rows.map(r => String(r.n))))').flat().forEach(d => keys.add(d));
  return new Set([...keys].filter(k => !k.includes('.'))); // 'e.key === camp.nav.go' is an event name, not a key
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
  const have = gr.id === 'flight' ? new Set([...bound(SCENES.flight), ...spaceOwn]) : (gr.id === 'campaign' || gr.id === 'panels') ? campBound() : bound(SCENES[gr.id] || []);
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
  const anyNamed = new Set(); group('any').rows.forEach(r => r.k.forEach(c => anyNamed.add(c.toUpperCase()))); // H help is an ANYWHERE row
  check('the key line in space names only keys of the FLIGHT table (and the ANYWHERE rows: H help)', caps.length >= 8 && caps.every(c => named.has(c) || anyNamed.has(c)), line + '   -> ' + caps.join(' '));
  // card space-game-key-line (Troy, 18 Nov 2026, from docs/KEYS-PROPOSAL.md): the line the first flights show names jump, help and the click, and drops the dash (2 presses in his first 13 minutes)
  check('the key line says G jump, H help and Z fly by click, and no longer Q/E dash', /(^| {2})G jump( {2}|$)/.test(line) && /(^| {2})H help( {2}|$)/.test(line) && /(^| {2})Z fly by click( {2}|$)/.test(line) && !/Q\/E|dash/.test(line), line);
  check('it keeps the ones he used (W A/D S Shift Space L P N B) and fits the screen: 145 characters at the most (14 px monospace is about 8.4 px a character: 1220 of the 1232 px from its left edge)', ['W thrust', 'A/D turn', 'S brake', 'Shift boost', 'Space or click fire', 'L land/dock', 'P autopilot', 'N places', 'B ships'].every(p => line.includes(p)) && line.length <= 145, line.length + ' ' + line);
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

console.log('6. the Campaign: every bound key is on the table');
{
  const named = new Set(); ['campaign', 'panels'].forEach(id => group(id).rows.forEach(r => r.k.forEach(cap => capKeys(cap).forEach(k => named.add(k)))));
  const ALSO = { UP: 'W', DOWN: 'S', LEFT: 'A', RIGHT: 'D', ARROWUP: 'W', ARROWDOWN: 'S', ARROWLEFT: 'A', ARROWRIGHT: 'D' };
  const bnd = campBound();
  const silent = [...bnd].filter(k => !named.has(k) && !(ALSO[k] && named.has(ALSO[k])));
  check('no key the Campaign binds is missing from the CAMPAIGN and PANELS groups', silent.length === 0, 'bound and not named: ' + silent.join(' ') + '   bound: ' + [...bnd].join(' '));
  check('the scan saw the keys it should (fly, fire, blink, the panels\' digits, the map, cards, pause, title, help, strip, voice, mute)', ['W', 'A', 'S', 'D', 'SPACE', 'F', 'Q', '1', '2', '5', 'TAB', 'X', 'ENTER', 'ESC', 'T', 'H', 'I', 'U', 'M'].every(k => bnd.has(k)), ['W', 'A', 'S', 'D', 'SPACE', 'F', 'Q', '1', '2', '5', 'TAB', 'X', 'ENTER', 'ESC', 'T', 'H', 'I', 'U', 'M'].filter(k => !bnd.has(k)).join(' '));
  const scene = read('src/campaignscene.js');
  check('the scene hands every digit to the panels (campPanelKey) and has no key of its own for a digit from 4 to 9 or an order: the old direct digits are gone (the refit card between levels buys with 4 and 5 on its own screen)', /campPanelKey\(/.test(scene) && !/Digit[4-9]/.test(noRefit(scene).split('\n').filter(l => !/R\.ore >= B\./.test(l)).join('\n')) && !/campOrder\(C, order, ''/.test(scene) && !/Digit1: 'launch'/.test(scene));
  const caps = (line, pick) => line.split(/ {2,}/).flatMap(seg => seg.split(' ').filter(t => pick.test(t))).map(c => c.toUpperCase());
  const keyLine = J(`uiText('camp.ui.keys', { panels: campPanelKeyLine() })`), pause = J(`uiText('camp.ui.paused')`);
  check('the bottom key line names only keys of the table and says the panels from it: ' + keyLine, caps(keyLine, /^(?:[A-Z0-9]|Tab|Space)$/).every(c => named.has(c)) && keyLine.includes(J('campPanelKeyLine()')) && /H Keys$/.test(keyLine) && !/\b6-9\b|\bI type an order\b/.test(keyLine), caps(keyLine, /^(?:[A-Z0-9]|Tab|Space)$/).filter(c => !named.has(c)).join(' '));
  check('the key line fits the screen: 8.6 px a letter from x 24 ends at 1272 at the latest', 24 + keyLine.length * 8.6 <= 1272, keyLine.length + ' letters');
  check('the pause card says Esc, T and H, which are keys of the table', caps(pause, /^(?:[A-Z]|Esc)$/).every(c => named.has(c) || c === 'ESC') && /H {1,3}all keys/.test(pause) && /Esc/.test(pause), pause);
  const debugCodes = J('CAMP_DEBUG.keys.map(r => r.code)');
  check('the debug keys are bound by the scene through their own table (campDebugKey) and the H page lists them from it', /campDebugKey\(c\)/.test(scene) && J('campKeysPage().some(g => g.rows.length === CAMP_DEBUG.keys.length && g.rows.every((r, i) => r.caps[0] === CAMP_DEBUG.keys[i].key))') && debugCodes.length >= 4);
  check('the H page lists every row of the two groups, in groups, once: nothing in the table is left off it', J(`(() => { const page = campKeysPage().flatMap(g => g.rows.map(r => r.caps.join(' ') + '|' + r.t)); return ['panels', 'campaign'].every(id => controlsGroup(id).rows.every(r => page.includes(r.k.join(' ') + '|' + r.t))); })()`));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCONTROLS HELP FAIL (${failed} of ${n})` : `\nCONTROLS HELP PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
