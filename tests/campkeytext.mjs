// smoke: no line the Campaign says names a key of its own: every key and every row of a list comes from the key table as a {placeholder} the table fills ({fleetkey}, {keymissile}, {rowescort}), and no line names a digit (cards space-game-two-hands-keys, one-list-keys; plain Node, no Chrome)
// [wrap-up] level 1 hunt: six lines still told the player to press 6 (send the drones), 2 (drones), 3 (escort), 4 (guard) and "(1)", "(2)", "(4)" after the panels replaced the direct digit keys:
// the story's first lines and the ambush hint in the belt, and the tips on the lose cards. Since "one list per hand" (22 Nov 2026) no order has a key at all: Q opens the fleet list, P the ship list, and an order is a ROW
// picked by its name. So a line says "{fleetkey}, then {rowescort}" (Q, then Escort the convoy): the list's key and the row's own words, both read from CAMP_PANELS, which stay true when a key or a label moves.
// The old placeholders of a row's key ({keylaunch}, {keyescort}, {keydock} ...) are gone with the keys: a line that still has one would show its braces, and fails here.
// Run: node tests/campkeytext.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const rows = JSON.parse(g.run(`JSON.stringify(Object.keys(UI_TEXT).filter(k => /^camp\\./.test(k)).map(k => [k, UI_TEXT[k]]))`));
check('the table has the Campaign lines to read', rows.length > 200, String(rows.length));
const stale = rows.filter(([k, v]) => !/^camp\.(hub|keys|ui\.(pick|refit))/.test(k) && /\b[Pp]ress \d\b|\((?:[0-9])\)|\bkey [0-9]\b|, then \d\b/.test(v));
check('no Campaign line says "press <digit>", "(<digit>)", "key <digit>" or ", then <digit>": no digit is a flight key, in the nudges too (the hub, the keys page and the refit cards name their own digits)', stale.length === 0, JSON.stringify(stale));
const six = ['camp.say.ambush2', 'camp.lose.tip.convoy', 'camp.lose.tip.base', 'camp.lose.tip.carrier', 'camp.lose.tip.earth'];
const byKey = Object.fromEntries(rows);
const HOLE = /\{(fleetkey|shipkey|panels|key[a-z]+|row[a-z]+)\}/g; // the placeholders the key table fills (campKeyVar, src/data_controls.js)
check('the five lines name the list by its key and the order by its row, both placeholders the table fills ({fleetkey}, {rowescort} ...), not by a letter or a digit of their own', six.every(k => /\{(fleetkey|shipkey)\}/.test(byKey[k] || '') && !/\b[QP]\b/.test(byKey[k] || '')), JSON.stringify(six.map(k => byKey[k])));
const said = k => g.run(`uiText(${JSON.stringify(k)})`);
check('and the table fills them: said, each of the five names Q (the fleet list) and has no brace left; the two with a row say the row\'s own words ("Escort the convoy", "Guard the cruiser")', six.every(k => /\bQ\b/.test(said(k)) && !/[{}]/.test(said(k))) && said('camp.lose.tip.convoy').includes(g.run(`campKeyVar('rowescort')`)) && g.run(`campKeyVar('rowescort')`) === 'Escort the convoy' && said('camp.lose.tip.base').includes('Guard the cruiser'), JSON.stringify(six.map(said)));
const holes = rows.flatMap(([k, v]) => [...v.matchAll(HOLE)].map(m => [k, m[1]])).filter(h => h[1] !== 'keys'); // ({keys} is not a key: the refit card fills it with its own list of digits)
const empty = holes.filter(([k, name]) => g.run(`campKeyVar(${JSON.stringify(name)})`) === '');
check('every key placeholder of every Campaign line is one the table knows (' + holes.length + ' of them in ' + new Set(holes.map(h => h[0])).size + ' lines): none is the key of a row, which no longer exists ({keylaunch}, {keyescort}, {keydock}, {keyattack} ...), so none is shown with its braces', holes.length > 20 && empty.length === 0, JSON.stringify(empty));
check('the table\'s answers: {fleetkey} Q, {shipkey} P, {keymissile} Enter, {keyshields} J, {rowlaunch} "Launch the wing", {panels} says where both lists are; an old row key ({keylaunch}, {keydock}, {keyescort}) and a name it never had are empty', JSON.parse(g.run(`JSON.stringify(['fleetkey', 'shipkey', 'keymissile', 'keyshields', 'rowlaunch', 'panels', 'keylaunch', 'keydock', 'keyescort', 'keyattack', 'rownope', 'nopekey'].map(campKeyVar))`)).join('|') === 'Q|P|Enter|J|Launch the wing|Q opens the fleet list, P opens the ship list||||||');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
