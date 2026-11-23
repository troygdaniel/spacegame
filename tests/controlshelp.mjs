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
//   6. the Campaign (cards space-game-campaign-keys-help, one-list-keys and list-shortcuts): every key a Campaign file binds is on the table (the CAMPAIGN and LISTS groups and the debug keys), every key the table names is bound, and the key line, the
//      pause card and the title name only keys of the table. A key added to the Campaign scene, its map or its lists and not to src/data_controls.js fails here, so the H page cannot go stale again.
//      "One list per hand", with shortcut keys to its parts: Q opens the fleet list and W E R T its parts (all squads, red, green, yellow), P the ship list and O I U its parts (power, autopilot, dock); EACH OF THE EIGHT OPENS EXACTLY
//      ONE LIST AND IS BOUND TO NOTHING ELSE IN FLIGHT (Up, Down, Left, Enter in the open list); no digit, no letter order and no Shift is a flight key; and NO FLIGHT KEY HAS TWO MEANINGS but the shared ones the table's own
//      comment documents: the arrows and Enter belong to whichever list is open (an order list, the map; else the ship: fly, missile), and X clears the target in flight and the trip in the map
// How it knows what is bound: the literal keys of addKey / addKeys calls, the e.code and e.key tests of keydown handlers, and the keys kept
// in tables (ASSIST.key, the assist's modes, OVERVIEW.key, GUNLOCK.key), read from the game itself.
// Run: node tests/controlshelp.mjs   (exit code 1 on a failed check)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
g.run('campFleetListSet(true)'); // the lists' tables are checked with Q's pop-up on (switched off in the game: CAMP_FLEET_LIST); the game's own state, Q picking all three pilots, is the last section below (card space-game-q-selects-all)
g.run('campShipListSet(true)'); // and the ship list too: it is switched off in the game (CAMP_SHIP_LIST, card space-game-p-opens-power: P opens power) and on here; tests/campselect.mjs has the game's own state
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const read = f => readFileSync(join(ROOT, f), 'utf8');

// ---- what the code binds, per scene ----
const WORDS = { SEMICOLON: ';', ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9', ESCAPE: 'ESC', NUMPADENTER: 'ENTER' };
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
    for (const m of src.matchAll(/\b(Key[A-Z]|Digit\d|Enter|Escape|Tab|Space|Semicolon): /g)) keys.add(norm(m[1]));                 // a map of codes: { KeyF: 'fleet', KeyY: 'yard' }
    for (const m of src.matchAll(/\bcode: '(Key[A-Z]|Digit\d)'/g)) keys.add(norm(m[1]));                                 // a table that holds the code to read: LISTEN.code of src/listen.js
    for (const m of src.matchAll(/keydown-([A-Z]+)/g)) keys.add(norm(m[1]));
    for (const m of src.matchAll(/\/\^\[(\d)-(\d)\]\$\/\.test\(e\.key\)/g)) for (let d = +m[1]; d <= +m[2]; d++) keys.add(String(d)); // a number row read from e.key
  }
  return keys;
}
const SPACE_FILES = ['space', 'assist', 'assist_orbit', 'autopilot', 'cruise', 'jump', 'gunlock', 'overview', 'clickmove', 'boost', 'camzoom', 'autotarget', 'handling', 'navpanel', 'hud'];
const EVERYWHERE = ['map', 'meta', 'shipcomputer', 'listen'];         // Tab, H, Esc, M, I (the ship's computer, src/shipcomputer.js) and U (hold to talk to it, src/listen.js): window handlers for every scene
const CAMP_FILES = ['campaignscene', 'campmapdraw', 'campmap', 'campkeys', 'camppanel', 'camphud'];   // the Campaign scene, its Tab map, its H page, its order lists (src/camppanel.js) and its gauges (src/camphud.js)
const SCENES = {
  campaign: CAMP_FILES.concat(EVERYWHERE),
  panels: CAMP_FILES.concat(EVERYWHERE),
  station: ['station', 'shop', 'fuel', 'chat', 'journal', 'jump'].concat(EVERYWHERE),
  ship: ['shipmode', 'hangar'].concat(EVERYWHERE),
  flight: SPACE_FILES.concat(EVERYWHERE),
  surface: ['surface'].concat(EVERYWHERE),
  readyroom: ['camphub', 'camphubscene', 'campdock', 'campkeys', 'campbriefdraw'].concat(EVERYWHERE), // the ready room (cards space-game-campaign-replay, -briefing: the big briefing's keys are in campbriefdraw.js): its keys are in camphub.js (the row keys), camphubscene.js and campdock.js (the dock's rows); the digits are routed by campHubDigit, so 1 to 5 are added below
  title: ['title', 'contentui', 'settings', 'mods'],
  any: EVERYWHERE
};
// what the Campaign binds: the literal keys of its files, the scene's own tests of the code it holds in a variable (c === 'KeyT'), the map's key (CAMPMAP.key), the eight keys that open a list (CAMP_PANELS: Q W E R and P O I U;
// a row of a list has no key of its own, and a list with no key, the convoy, binds none) and the direct keys of CAMP_KEYS. The scene hands a key to campPanelKey and campKeyIs, which read those two tables, so a key named there is a key bound
const campBound = () => {
  const keys = bound(CAMP_FILES);
  for (const m of read('src/campaignscene.js').matchAll(/(?<![\w.])c === '([^']+)'/g)) keys.add(norm(m[1]));
  keys.add(norm(J('CAMPMAP.key'))); // (there is no pace key any more: card space-game-two-hands-keys)
  const ZOOMCAP = { Equal: '=', Minus: '-', NumpadAdd: '=', NumpadSubtract: '-' }; // the zoom keys (card space-game-campaign-zoom): src/campzoom.js holds them in a table of codes, the table names the caps
  J('Object.keys(CAMPZOOM.keys)').forEach(c => keys.add(ZOOMCAP[c] || norm(c))); J('CAMPZOOM.reset').forEach(c => keys.add(norm(c.replace(/^Numpad/, 'Digit'))));
  if (/\be\.shiftKey\b/.test(read('src/campaignscene.js')) && /\bshift\b/.test(read('src/campmapdraw.js'))) keys.add('SHIFT'); // Shift+Enter: the scene passes the event's shiftKey, the map reads it
  ['M'].forEach(k => { if (bound(EVERYWHERE).has(k)) keys.add(k); }); // the window handler that works in every scene, the Campaign's too: mute (meta). The strip is NOT I in the Campaign: it is CAMP_KEYS.strip (/), and the voice has no key there while CAMP_VOICE is off (listenScene is null for the Campaign), checked in part 6
  // the two hands: the key that opens each list that has one (a row has none), and the keys of CAMP_KEYS (the arrows, A D S X, the power, the zoom, the strip, the voice): the scene reads them from the tables (campPanelKey, campKeyCodes), so a key named there is a key bound
  J('CAMP_PANELS.panels.filter(p => p.key && p.code).map(p => p.key)').forEach(d => keys.add(norm(d)));
  J('Object.values(CAMP_KEYS).map(k => k.k)').forEach(k => keys.add(norm(k)));
  return new Set([...keys].filter(k => k === '.' || !k.includes('.'))); // 'e.key === camp.nav.go' is an event name, not a key (the period is the friendlies' key)
};
// the keys of the two cards between levels (the handlers noRefit leaves out of the flight scan): the codes their tables and tests name
const cardBound = () => { const keys = new Set(); for (const m of read('src/campaignscene.js').matchAll(/  (?:refitKey|pickKey)\(c\) \{[\s\S]*?\n  \}\n/g)) for (const k of m[0].matchAll(/\b(Digit\d|Enter)\b/g)) keys.add(norm(k[1])); return keys; };
const spaceOwn = bound(SPACE_FILES);
[J('ASSIST.key'), J('OVERVIEW.key'), J('GUNLOCK.key')].concat(J('Object.values(ASSIST_MODES).map(m => m.key).filter(Boolean)')).forEach(k => spaceOwn.add(norm(k)));

// a key cap of the table as the keys it stands for; a cap that is not a keyboard key (the mouse) stands for none
const NOT_KEYS = ['CLICK', 'MOUSE', 'WHEEL', 'ANY KEY'];
const ARROWCAP = { '\u2190': 'LEFT', '\u2192': 'RIGHT' }; // an arrow drawn as a cap stands for its key
const capKeys = cap => { if (ARROWCAP[cap]) return [ARROWCAP[cap]]; const c = cap.toUpperCase(); if (c === 'ARROWS') return ['ARROWS']; if (NOT_KEYS.includes(c)) return []; const r = /^(\d)-(\d)$/.exec(c); if (r) { const out = []; for (let d = +r[1]; d <= +r[2]; d++) out.push(String(d)); return out; } return [norm(c)]; };
const groups = J(`CONTROLS.map(g => ({ id: g.id, scene: g.scene, rows: g.rows.map(r => ({ k: r.k, t: r.t, help: r.help })) }))`);
const group = id => groups.find(x => x.id === id);

console.log('1. every key the help names is bound');
for (const gr of groups) {
  const roomBound = () => { const k = bound(SCENES.readyroom); ['1', '2', '3', '4', '5'].forEach(d => k.add(d)); const ZC = { Equal: '=', Minus: '-', NumpadAdd: '=', NumpadSubtract: '-' }; if (/campZoomKey\(code\)/.test(read('src/campbriefdraw.js'))) { J('Object.keys(CAMPZOOM.keys)').forEach(c => k.add(ZC[c] || norm(c))); J('CAMPZOOM.reset').forEach(c => k.add(norm(c.replace(/^Numpad/, 'Digit')))); } if (/campKeyIs\('tune', e\.code\)/.test(read('src/camphubscene.js'))) J('CAMP_KEYS.tune.codes').forEach(c => k.add(norm(c))); return k; }; // the tuning panel's key, which the room reads from the table (card space-game-tuning-panel) // the room hands every digit to campHubKey, which picks the row whose place it is; the briefing's map takes the zoom keys of src/campzoom.js (the Tab map's own: card space-game-briefing-walkthrough)
  const have = gr.id === 'readyroom' ? roomBound() : gr.id === 'flight' ? new Set([...bound(SCENES.flight), ...spaceOwn]) : (gr.id === 'campaign' || gr.id === 'panels') ? campBound() : bound(SCENES[gr.id] || []);
  if (gr.id === 'campaign') cardBound().forEach(k => have.add(k)); // the rows under ON A CARD are the keys of the tech and refit cards (their own screens, left out of the flight scan): 1 to 3 pick a technology, 4 and 5 buy ships
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
  J('Object.values(CAMP_KEYS).map(k => k.k)').forEach(cap => capKeys(cap).forEach(k => named.add(k))); // the keys of CAMP_KEYS are the table too (the zoom's reset, the arrows)
  if (group('campaign').rows.some(r => /Shift\+Enter/.test(r.t) && r.k.includes('Enter'))) named.add('SHIFT'); // Shift is no key of its own any more: it is named only where it is read, in the line of the map's Enter ("Shift+Enter: fast")
  const ALSO = { UP: 'ARROWS', DOWN: 'ARROWS', LEFT: 'ARROWS', RIGHT: 'ARROWS', ARROWUP: 'ARROWS', ARROWDOWN: 'ARROWS', ARROWLEFT: 'ARROWS', ARROWRIGHT: 'ARROWS' }; // the arrows are the one cap "Arrows"
  const bnd = campBound();
  const silent = [...bnd].filter(k => !named.has(k) && !(ALSO[k] && named.has(ALSO[k])));
  check('no key the Campaign binds is missing from the CAMPAIGN and LISTS groups', silent.length === 0, 'bound and not named: ' + silent.join(' ') + '   bound: ' + [...bnd].join(' '));
  const SAW = ['ARROWS', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ENTER', 'A', 'D', 'S', 'X', '\\', ',', 'J', 'K', 'L', 'Q', 'W', 'E', 'R', 'P', 'O', 'I', 'U', 'TAB', 'T', 'R', 'ESC', 'H', 'M', '/', '.', '=', '-', 'SHIFT', '4'];
  check('the scan saw the keys it should (fly, fire, the missile, the three picks A D [ ] backslash comma period, the power, the keys of the lists, the map and its X, the cards, pause, help, strip, mute, zoom with S)', SAW.every(k => bnd.has(k)), SAW.filter(k => !bnd.has(k)).join(' '));
  const GONE_KEYS = ['1', '2', '3', '6', '7', '8', '9', '0']; // the digits that opened a panel or picked a row (4 and 5 are the refit card's)
  check('and it saw none of the keys the lists took away: no digit but the refit card\'s 4 and 5 is bound by a Campaign file', GONE_KEYS.every(k => !bnd.has(k)), GONE_KEYS.filter(k => bnd.has(k)).join(' '));
  // ---- Q W E R, P O I U: each opens exactly ONE list and is bound to nothing else in flight (card list-shortcuts) ----
  const LISTS = J('CAMP_PANELS.panels.map(p => ({ id: p.id, key: p.key, code: p.code, side: p.side, parent: p.parent || "" }))'), KEYED = LISTS.filter(p => p.key || p.code), EIGHT = ['Q', 'W', 'P', 'O', 'I', 'U']; // (named EIGHT when there were eight: the lists' keys)
  check('the table has seven lists and six of them have a key: Q W at the left (the fleet, then its part: all squads; E R T are the order keys now, card space-game-bracket-select-orders), P O I U at the right (the ship, then power, autopilot, dock); each key and each code is ONE list\'s, the code is the key\'s own (Q: KeyQ); the lists with no key (convoy, stance) have no code either',
    LISTS.length === 7 && KEYED.map(p => p.key).join('') === 'QWPOIU' && KEYED.map(p => p.id).join() === 'fleet,squads,ship,power,nav,yard' && new Set(KEYED.map(p => p.key)).size === 6 && new Set(KEYED.map(p => p.code)).size === 6 && KEYED.every(p => p.code === 'Key' + p.key) && KEYED.every(p => p.side === ('QW'.includes(p.key) ? 'left' : 'right')) && LISTS.filter(p => !p.key).every(p => p.code === '' && /^convoy$/.test(p.id) && p.parent === 'fleet'), JSON.stringify(LISTS));
  const open8 = J(`(() => { const bad = [], opens = [''].concat(CAMP_PANELS.panels.map(p => p.id)); CAMP_PANELS.panels.filter(p => p.code).forEach(p => opens.forEach(open => { const C = campNew(1, [], { seed: 1 }), P = campPanelNew(); P.open = open; P.at = open ? 1 : 0; const before = JSON.stringify([C.bay, C.stance, C.tgt || '', C.power, C.orders, C.nav || null, C.ships.length]);
    const r = campPanelKey(P, C, p.code, 0), want = open === p.id ? '' : p.id; if (!(r.used && !r.ran && !r.ok && r.row === '' && r.tgt === '' && r.fleet === false && r.say === '' && r.open === want && campPanelOpen(P) === want && P.at === 0 && P.top === 0 && JSON.stringify([C.bay, C.stance, C.tgt || '', C.power, C.orders, C.nav || null, C.ships.length]) === before)) bad.push(p.key + ' over ' + (open || 'nothing')); })); return bad; })()`);
  check('each of the nine opens exactly ONE list, its own, from anywhere: with no list open and over each of the twelve lists (the cases) the key opens that list at its first row, or closes it when it is the one open; it gives no order, picks no target and changes nothing in the battle', open8.length === 0, open8.join(' | '));
  const lit = bound(CAMP_FILES); for (const m of read('src/campaignscene.js').matchAll(/(?<![\w.])c === '([^']+)'/g)) lit.add(norm(m[1])); // the keys a Campaign file names in its own code, WITHOUT the two key tables
  const sceneR = read('src/campaignscene.js').split('\n').filter(l => /'KeyR'/.test(l)), sceneT = read('src/campaignscene.js').split('\n').filter(l => /'KeyT'/.test(l)); // R restarts and T leaves for the title on the pause card, T also on the lost and end cards: screens of their own
  check('and none of the nine is bound to anything else in flight: no Campaign file tests one of them by name in its own code (they are read from CAMP_PANELS only) but R and T on the pause, lost and end cards, screens of their own (restart the mission, leave for the title: the lines of the scene that name KeyR or KeyT are those modes\'); the window handlers of the Long Haul\'s I (ask the computer) and U (hold to talk) read / and . instead while the Campaign is up (the check after next); the scene polls only the arrows and Space as held keys',
    EIGHT.filter(k => lit.has(k)).sort().join() === '' && sceneR.length === 1 && /this\.mode === 'pause'\) \{.*c === 'KeyR'/.test(sceneR[0]) && sceneT.length === 3 && sceneT.every(l => /this\.mode === '(?:end|lost|pause)'/.test(l)) && !/'Key[QWEPOIU]'/.test(CAMP_FILES.map(f => read('src/' + f + '.js')).join('\n')) && /addKeys\('UP,DOWN,LEFT,RIGHT,SPACE'\)/.test(read('src/campaignscene.js')) && (read('src/campaignscene.js').match(/addKeys\(/g) || []).length === 1, EIGHT.filter(k => lit.has(k)).join(' ') + ' | ' + sceneR.length);
  check('none of the nine is another key of the Campaign: not a direct key of CAMP_KEYS (by cap or by code), not the map\'s key or one the open map takes (campMapKey says false to each), not a zoom key, not a debug key',
    J(`CAMP_PANELS.panels.filter(p => p.code).every(p => !Object.values(CAMP_KEYS).some(k => k.codes.includes(p.code) || k.k === p.key) && p.code !== CAMPMAP.key && !campZoomKey(p.code) && !CAMP_DEBUG.keys.some(r => r.code === p.code))`)
    && J(`(() => { const C = campNew(1, [], { seed: 1 }), rows = campNavRows(C), mp = { rows, list: rows, selId: rows[0] ? rows[0].id : '', setId: '', dirty: false, userSel: false }; const S = { camp: C, mp, mode: 'play' }; return CAMP_PANELS.panels.filter(p => p.code).every(p => { try { return campMapKey(S, p.code) === false; } catch (e) { return false; } }); })()`) === true);
  check('on the table each of the nine is in ONE flight row, a row of the LISTS group under THE ORDER LISTS that says what the list is; no other row names one of them', (() => { const rows = J(`['campaign', 'panels'].flatMap(id => controlsGroup(id).rows.map(r => ({ k: r.k, t: r.t, sub: r.sub, g: id })))`);
    return EIGHT.every(k => { const mine = rows.filter(r => r.k.includes(k)), flight = mine.filter(r => r.sub !== 'ON A CARD'); return flight.length === 1 && flight[0].g === 'panels' && flight[0].sub === 'THE ORDER LISTS' && flight[0].k.length === 1 && mine.length === 1; }) && rows.filter(r => r.g === 'panels' && r.k.length === 1 && EIGHT.includes(r.k[0])).map(r => r.k[0]).join('') === 'QWPOIU'; })());
  check('the strip is / in the Campaign, not the Long Haul\'s I, and the voice has no key there (switched off: CAMP_VOICE, card space-game-keys-select; the period is the friendlies\' now): src/shipcomputer.js and src/listen.js read the code from CAMP_KEYS while the Campaign is up', /shipcompCamp\(game\) \? e\.code !== campKeyCodes\('strip'\)\[0\] : e\.code !== 'KeyI'/.test(read('src/shipcomputer.js')) && /LISTEN\.code = camp \? campKeyCodes\('voice'\)\[0\] : 'KeyU'/.test(read('src/listen.js')) && J("campKeyCodes('strip')[0]") === 'Slash' && J("campKeyCodes('voice').length") === 0 && J("campKeyIs('fnext', 'Period')") === true && J("campKeyCodes('voice')[0] === undefined && CAMP_VOICE === false"));
  const scene = read('src/campaignscene.js');
  check('the scene has no key of its own for a digit or an order in flight (the refit card between levels buys with 4 and 5 on its own screen): every flight key goes through the tables (campPanelKey, campKeyCodes, campKeyIs), and Shift is not handed to the lists', /campPanelKey\(this\.pn, C, c, now\)/.test(scene) && !/Digit\d|Numpad\d/.test(noRefit(scene).split('\n').filter(l => !/R\.ore >= B\./.test(l)).join('\n')) && !/campOrder\(C, order, ''/.test(scene) && !/Digit1: 'launch'/.test(scene) && !/campPanelKey\([^)]*shift/i.test(scene));
  const dead = J(`(() => { const codes = []; for (let d = 0; d <= 9; d++) codes.push('Digit' + d, 'Numpad' + d); codes.push('KeyF', 'KeyG', 'KeyY', 'KeyB', 'KeyN', 'KeyC', 'KeyV', 'KeyZ', 'ShiftLeft', 'ShiftRight'); return [''].concat(CAMP_PANELS.panels.map(p => p.id)).flatMap(open => codes.filter(c => { const C = campNew(1, [], { seed: 1 }), P = campPanelNew(); P.open = open; const before = JSON.stringify([C.bay, C.stance, C.tgt || '', C.power]); const r = campPanelKey(P, C, c, 0); return r.used || r.ran || P.open !== open || P.at !== 0 || JSON.stringify([C.bay, C.stance, C.tgt || '', C.power]) !== before; }).map(c => open + ':' + c)); })()`);
  check('a digit does nothing in flight, and neither does a letter that is no key of the table (F G Y B N C V Z) or Shift: with no list open and with each of the twelve lists open, each of Digit0-9, Numpad0-9, those letters and Shift is not used by the lists, gives no order and moves nothing (W E R U I, which did nothing for a day, are list keys now: the checks above)', dead.length === 0, dead.join(' '));
  check('no row of a list has a key of its own: a row is its id, its order and its words (no k, code, n, tag or cycle), a list has no pages, and each list has at most one key (Q W, P O I U; the convoy none), which no direct key of CAMP_KEYS also is; a row that opens a part names a list of the table whose parent is the list the row is in, and every part has exactly one such row', J(`CAMP_PANELS.panels.every(p => p.rows.every(r => !('k' in r) && !('code' in r) && !('n' in r) && !('tag' in r) && !('cycle' in r)) && !('page2' in p) && !('page3' in p) && !('pages' in p) && !('back' in p))`) && J('CAMP_PANELS.panels.map(p => p.key + ":" + p.code).join()') === 'Q:KeyQ,:,W:KeyW,P:KeyP,O:KeyO,I:KeyI,U:KeyU' && J(`CAMP_PANELS.panels.filter(p => p.code).every(p => !Object.values(CAMP_KEYS).some(k => k.codes.includes(p.code) || k.k === p.key))`) && !('settle' in J('CAMP_PANELS'))
    && J(`CAMP_PANELS.panels.every(p => p.rows.filter(r => r.open).every(r => { const d = CAMP_PANELS.panels.find(x => x.id === r.open); return !!d && d.parent === p.id; })) && CAMP_PANELS.panels.filter(p => p.parent).every(p => CAMP_PANELS.panels.find(x => x.id === p.parent).rows.filter(r => r.open === p.id).length === 1 && !CAMP_PANELS.panels.find(x => x.id === p.parent).parent) && CAMP_PANELS.panels.filter(p => !p.parent).map(p => p.id).join() === 'fleet,ship'`));
  check('the H page does not name hold to speak while it is off (CAMP_VOICE, card space-game-keys-select): no row says speak or voice, the strip\'s heading is THE STRIP, and the switch gives the row back with its key and takes it away again', (() => { const rows = () => J(`controlsGroup('campaign').rows.map(r => r.k.join(' ') + '|' + r.sub + '|' + r.t)`), off = rows(); g.run(`campVoiceSet(true, { k: 'V', codes: ['KeyV'] })`); const on = rows(); g.run(`campVoiceSet(false)`); return !off.some(r => /speak|voice/i.test(r)) && off.some(r => r.startsWith('/|THE STRIP|')) && on.some(r => /^V\|THE STRIP\|Hold to speak/.test(r)) && JSON.stringify(rows()) === JSON.stringify(off); })());
  check('the power is in a list AND on its direct keys, and both are one order: a row of the O list (shields, engines, weapons) and its key (J K L) give the same campOrder with the same answer, the row leaves the list open (stay) to be given again, the key leaves an open list as it was', J(`['shields', 'engines', 'weapons'].every(id => { const A = campNew(2, [], { seed: 1 }), B = campNew(2, [], { seed: 1 }), PA = campPanelNew(), PB = campPanelNew();
    campPanelKey(PA, A, CAMP_PANELS.panels.find(p => p.id === 'power').code, 0); for (let i = campPanelList(A, 'power').findIndex(r => r.id === id); i > 0; i--) campPanelKey(PA, A, 'ArrowDown', 0); const a = campPanelKey(PA, A, 'Enter', 0), b = campPanelKey(PB, B, CAMP_KEYS[id].codes[0], 0);
    return a.ran && b.ran && a.ok === b.ok && a.say === b.say && a.row === id && b.row === id && JSON.stringify(A.power.p) === JSON.stringify(B.power.p) && campPanelOpen(PA) === 'power' && campPanelOpen(PB) === '' && campKeyRow(id).stay === 1; })`));

  // ---- one key, one meaning (cards one-list-keys and list-shortcuts): the table lists no flight key twice but the shared ones it documents ----
  // The rows of the CAMPAIGN and LISTS groups that are flight (not "ON A CARD": a card is a screen of its own, where T, R, Enter and the digits are the card's). A key that stands in more than one of them must be:
  //   the arrows or Enter (they belong to whichever list is open: an order list, the map; else the ship flies and Enter is a missile), or
  //   X (it clears: the target in flight, the trip in the map), or
  //   Esc, whose two lines say the same thing (it goes back a step in the open list; the LISTS group repeats it beside the lists).
  const flightRows = J(`['campaign', 'panels'].flatMap(id => controlsGroup(id).rows.filter(r => r.sub !== 'ON A CARD').map(r => ({ k: r.k, t: r.t, sub: r.sub, g: id })))`);
  const byKey = {}; flightRows.forEach(r => r.k.forEach(cap => capKeys(cap).forEach(k => { (byKey[k] = byKey[k] || []).push(r); })));
  const SHARED_LIST = ['ARROWS', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER']; // whichever list is open has them
  const twice = Object.keys(byKey).filter(k => byKey[k].length > 1), undocumented = twice.filter(k => !SHARED_LIST.includes(k) && k !== 'X' && k !== 'ESC');
  check('no flight key is listed with two meanings: the only keys in more than one flight row are the arrows and Enter (the open list\'s), X and Esc; every other key (' + Object.keys(byKey).filter(k => byKey[k].length === 1).join(' ') + ') has ONE row', undocumented.length === 0 && flightRows.length >= 20, undocumented.map(k => k + ': ' + byKey[k].map(r => r.t).join(' / ')).join(' | '));
  check('the shared ones are exactly the documented ones: Up and Down are the map and "In a list" (each line says which list), Enter is the missile "(no list open)", the map\'s "fly there" and "In a list: give the order"', (() => { const says = r => /^In a list:|^Map:|no list open|^Thrust, brake, turn/.test(r.t); return twice.filter(k => SHARED_LIST.includes(k)).every(k => byKey[k].every(says)) && ['UP', 'DOWN'].every(k => byKey[k].length === 2 && byKey[k].some(r => /^Map:/.test(r.t)) && byKey[k].some(r => /^In a list: move/.test(r.t)))
    && byKey.ENTER.length === 3 && byKey.ENTER.some(r => /Missile.*\(no list open\)/.test(r.t)) && byKey.ENTER.some(r => /^Map: fly there/.test(r.t)) && byKey.ENTER.some(r => /^In a list: give the order/.test(r.t)); })(), JSON.stringify(twice.map(k => [k, byKey[k].map(r => r.t)])));
  check('X is in two rows and only two: it clears the target (THE TARGET) and clears the trip in the map (THE MAP); Esc is in two rows that say one thing: it goes back a step in the open list (else closes the map, else it pauses)', byKey.X.length === 2 && byKey.X.some(r => r.sub === 'THE TARGET' && /X clears the picks/.test(r.t)) && byKey.X.some(r => r.sub === 'THE MAP' && /^Map: X clears the trip/.test(r.t)) && byKey.ESC.length === 2 && byKey.ESC.every(r => /^Back (a step|out of a list)/.test(r.t)), JSON.stringify([byKey.X, byKey.ESC]));
  check('the digits the table still names are the cards\' own and are read by the cards\' own handlers only (1-3 a technology, 4 a fighter, all under ON A CARD); no flight row names a digit', ['1', '2', '3', '4'].every(d => cardBound().has(d)) && J(`['campaign', 'panels'].flatMap(id => controlsGroup(id).rows).filter(r => r.k.some(c => /\\d/.test(c))).every(r => r.sub === 'ON A CARD')`) && !Object.keys(byKey).some(k => /\d/.test(k)));
  check('the codes say the same: a KeyboardEvent.code is under two names of CAMP_KEYS only where the arrows are also a list\'s Up and Down (fly, up, down) and Enter is also a list\'s pick (missile, pick); no other direct key shares a code', (() => { const K = J('CAMP_KEYS'), seen = {}; Object.keys(K).forEach(id => K[id].codes.forEach(c => { (seen[c] = seen[c] || []).push(id); })); const shared = Object.keys(seen).filter(c => seen[c].length > 1).map(c => c + '=' + seen[c].join('+')).sort().join();
    return shared === 'ArrowDown=fly+down,ArrowUp=fly+up,Enter=missile+pick,NumpadEnter=missile+pick'; })());
  check('a direct key means the same whether a list is open or not: A D [ ] backslash comma period X pick and clear the three picks and J K L move the power with no list open and with each of the lists open, and none of them closes the list or moves its highlight; the semicolon is no key in any of them', J(`[''].concat(CAMP_PANELS.panels.map(p => p.id)).every(open => ['KeyA', 'KeyD', 'BracketLeft', 'BracketRight', 'Backslash', 'Comma', 'Period', 'KeyX', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'].every((c, i) => { const C = campNew(2, [], { seed: 1 }), P = campPanelNew(); P.open = open; const r = campPanelKey(P, C, c, 0); if (c === 'Semicolon') return r.used === false && !r.ran && P.open === open && P.at === 0; return r.used && P.open === open && P.at === 0 && (i < 8 ? r.fleet === true && !r.ran : r.ran === true && r.row === ['shields', 'engines', 'weapons'][i - 8]); }))`));
  check('Enter is a missile only while no list is open: with none it is the missile (an order, row "missile"); with any of the nine lists open it is the list\'s (the highlighted row: its order, or, on a part\'s row, that part\'s list opened and no order), never the missile', J(`(() => { const run = open => { const C = campNew(2, [], { seed: 1 }), P = campPanelNew(); P.open = open; const first = open ? campPanelList(C, open)[0] : null, m0 = C.missiles, r = campPanelKey(P, C, 'Enter', 0); return open ? r.used && r.row !== 'missile' && C.missiles === m0 && C.rockets.length === 0 && (first.open ? !r.ran && r.row === '' && r.open === first.open : r.ran && r.row === first.id) : r.ran && r.row === 'missile'; }; return [''].concat(CAMP_PANELS.panels.map(p => p.id)).map(run); })()`).every(x => x === true));
  check('Left is the list\'s only in an open list: in a part it goes back to the list it is a part of (the highlight on that part\'s row), in the fleet or the ship list it is taken and does nothing, and with no list open the lists do not take it (the ship turns); Right goes into the part the highlight is on and nowhere else', J(`(() => { const C = campNew(1, [], { seed: 1 }); return CAMP_PANELS.panels.every(p => { const P = campPanelNew(); P.open = p.id; const r = campPanelKey(P, C, 'ArrowLeft', 0); if (!p.parent) return r.used && campPanelOpen(P) === p.id && P.at === 0; const at = campPanelList(C, p.parent).findIndex(x => x.open === p.id); const back = r.used && !r.ran && campPanelOpen(P) === p.parent && P.at === at && at >= 0; const g = campPanelKey(P, C, 'ArrowRight', 0); return back && g.used && !g.ran && campPanelOpen(P) === p.id && P.at === 0; })
    && ['ArrowLeft', 'ArrowRight'].every(c => { const P = campPanelNew(); return campPanelKey(P, C, c, 0).used === false && campPanelOpen(P) === ''; }) && (() => { const P = campPanelNew(); P.open = 'squads'; const r = campPanelKey(P, C, 'ArrowRight', 0); return r.used && !r.ran && campPanelOpen(P) === 'squads'; })(); })()`));
  const caps = (line, pick) => line.split(/ {2,}/).flatMap(seg => seg.split(' ').filter(t => pick.test(t))).map(c => c.toUpperCase());
  const keyLine = J(`uiText('camp.ui.keys', { panels: campPanelKeyLine() })`), pause = J(`uiText('camp.ui.paused')`);
  check('the bottom key line names only keys of the table, read from it, the lists\' nine keys first (the left hand\'s, then the right hand\'s): ' + keyLine, caps(keyLine, /^(?:[A-Z0-9=\-]|Tab|Space|Enter|Arrows)$/).every(c => named.has(c)) && keyLine.startsWith(J('campPanelKeyLine()')) && J('campPanelKeyLine()') === 'Q Fleet  W All    P Ship  O Power  I Autopilot  U Dock' && J(`campPanelKeyLine() === ['left', 'right'].map(sd => CAMP_PANELS.panels.filter(p => p.side === sd && p.key).map(p => p.key + ' ' + p.tab).join('  ')).join('    ')`) && EIGHT.every(k => caps(keyLine, /^(?:[A-Z0-9=\-]|Tab|Space|Enter|Arrows)$/).filter(c => c === k).length === 1) && keyLine.includes(J("CAMP_KEYS.fly.k") + ' fly') && keyLine.includes(J("campKeyVar('keymissile')") + ' missile') && keyLine.includes(J("campKeyVar('keymap')") + ' ') && /H Keys$/.test(keyLine) && !/\d/.test(keyLine) && !/\bI type an order\b/.test(keyLine) && keyLine === J('campKeyLine()'), caps(keyLine, /^(?:[A-Z0-9=\-]|Tab|Space|Enter|Arrows)$/).filter(c => !named.has(c)).join(' '));
  check('the key line fits the screen: 8.6 px a letter from x 24 ends at 1272 at the latest', 24 + keyLine.length * 8.6 <= 1272, keyLine.length + ' letters');
  check('the pause card says Esc, T and H, which are keys of the table', caps(pause, /^(?:[A-Z]|Esc)$/).every(c => named.has(c) || c === 'ESC') && /H {1,3}all keys/.test(pause) && /Esc/.test(pause), pause);
  const debugCodes = J('CAMP_DEBUG.keys.map(r => r.code)');
  g.run('campDebugSet(true)'); // the tune kit is off in the normal game and the H page leaves its keys out (card space-game-debug-keys-off): turned on here, as ?debug=1 does
  check('the debug keys are bound by the scene through their own table (campDebugKey) and the H page lists them from it', /campDebugKey\(c\)/.test(scene) && J('campKeysPage().some(g => g.rows.length === CAMP_DEBUG.keys.length && g.rows.every((r, i) => r.caps[0] === CAMP_DEBUG.keys[i].key))') && debugCodes.length >= 4);
  const offPage = (g.run('campDebugSet(false)'), J('campKeysPage().some(g => g.title === uiText("camp.keys.debug"))')); // and with it off the page has no debug group at all
  check('the H page has no debug group while the tune kit is off (the normal game)', offPage === false);
  g.run('campDebugSet(true)');
  // no digit is a flight key any more (the lists are Q and P, a row is picked with Up, Down and Enter), so no line may send the player to one: "press 3", "(2)" alone, and the panels' own "press 1, then 3" are all gone (cards space-game-wrapup-hunt-l3, one-list-keys)
  const stale = J(`Object.keys(UI_TEXT).filter(k => /^camp\\./.test(k) && /[Pp]ress [0-9]\\b|, then [0-9]\\b|\\([0-9]\\)/.test(UI_TEXT[k])).map(k => k + ': ' + UI_TEXT[k])`);
  check('no Campaign line names a digit key: "press 3", "press 1, then 3", "(2)" alone are gone (the way is the key of a list, then the row by its name)', stale.length === 0, stale.join(' | '));
  check('the H page lists every row of the two groups, in groups, once: nothing in the table is left off it', J(`(() => { const page = campKeysPage().flatMap(g => g.rows.map(r => r.caps.join(' ') + '|' + r.t)); return ['panels', 'campaign'].every(id => controlsGroup(id).rows.every(r => page.includes(r.k.join(' ') + '|' + r.t))); })()`));
}

// ---- the game's own state: the fleet list is off and Q picks all three pilots (card space-game-q-selects-all; Troy, 23 Nov 2026)
console.log('Q picks all three pilots');
{
  g.run('campFleetListSet(false)');
  const keyed = J(`CAMP_PANELS.panels.filter(p => p.key).map(p => p.key).join('')`);
  check('the fleet list is switched off: it has no key and no code (and a mark, off, that campPanelGo reads); the five lists with a key are W P O I U, and no list has the code of Q', keyed === 'WPOIU' && J(`CAMP_PANELS.panels.find(p => p.id === 'fleet').key + CAMP_PANELS.panels.find(p => p.id === 'fleet').code`) === '' && J(`CAMP_PANELS.panels.find(p => p.id === 'fleet').off`) === true && J(`CAMP_PANELS.panels.every(p => p.code !== 'KeyQ')`));
  check('Q is a direct key of the table, the one that picks all three pilots: CAMP_KEYS.all is Q, KeyQ, and no other key of the table (a direct key, a list, the map, a zoom key, a debug key) has that code', J(`CAMP_KEYS.all.k`) === 'Q' && J(`campKeyCodes('all').join()`) === 'KeyQ' && J(`Object.keys(CAMP_KEYS).filter(id => id !== 'all' && CAMP_KEYS[id].codes.includes('KeyQ')).length`) === 0 && J(`CAMPMAP.key !== 'KeyQ' && !campZoomKey('KeyQ') && !CAMP_DEBUG.keys.some(r => r.code === 'KeyQ')`));
  const open9 = J(`(() => { const bad = [], opens = [''].concat(CAMP_PANELS.panels.map(p => p.id)); opens.forEach(open => { const C = campNew(1, [], { seed: 1 }), P = campPanelNew(); P.open = open; P.at = open ? 1 : 0; const r = campPanelKey(P, C, 'KeyQ', 0); if (!(r.used && !r.ran && r.ok === false && C.sel === 'all' && campPanelOpen(P) === open)) bad.push('over ' + (open || 'nothing')); }); return bad; })()`);
  check('Q picks all three pilots from anywhere: with no list open and over each list, it is used, gives no order and opens or closes no list (the open one stays as it was), and the friend is all', open9.length === 0, open9.join(' | '));
  const left = J(`(() => { const C = campNew(1, [], { seed: 1 }), P = campPanelNew(); campPanelKey(P, C, 'KeyW', 0); const r = campPanelKey(P, C, 'ArrowLeft', 0); return [campPanelOpen(P), r.used, campPanelOpen(P) === 'squads']; })()`);
  check('Left in the all-squads list does not go back to the fleet list (it is off): the list stays, and nothing else opens', left[0] === 'squads' && left[1] === true);
  const page = J('campKeysPage()'), tgt = page.find(p => p.title === 'THE TARGET');
  check('the H page has Q under THE TARGET (all three pilots at once) and no Q among the order lists', tgt && tgt.rows.some(r => r.caps.join() === 'Q' && /pilots/.test(r.t)) && !page[0].rows.some(r => r.caps.join() === 'Q') && J('campPanelKeyLine()') === 'W All    P Ship  O Power  I Autopilot  U Dock');
  const back = (g.run('campFleetListSet(true)'), J(`[campPanelKeyLine(), CAMP_KEYS.all.codes.length, campKeysPage().find(p => p.title === 'THE TARGET').rows.some(r => r.caps.join() === 'Q')]`));
  check('and the switch turned on gives Q its list again (the old code is kept): the key line has Q Fleet, Q picks nothing, the page has no Q row; turned off, it all goes back', back[0].startsWith('Q Fleet  W All') && back[1] === 0 && back[2] === false && (g.run('campFleetListSet(false)'), J('campKeyCodes("all").join()') === 'KeyQ'));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCONTROLS HELP FAIL (${failed} of ${n})` : `\nCONTROLS HELP PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
