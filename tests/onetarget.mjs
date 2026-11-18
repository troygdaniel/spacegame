// smoke: every way to set the target is on one list, and a new one fails (plain Node, no Chrome)
// Card space-game-one-way-to-target. Troy: too many different ways to select a target. The rule now:
//   a place (station, planet, sun, belt, gate, signal, another system)   the navigation panel (N, src/navpanel.js)
//   a ship (raider, escort, police, freighter)                          the Overview list (B, src/overview.js)
//   anything you can see                                                 a click on it in space (src/clickmove.js)
// Nothing else picks: the Tab map only shows the destination, V locks the selected raider and never walks to the next one.
// This test reads src/*.js for every call and every write that makes something the target, and compares them with the DOORS table below.
// A call from a file that is not in the table, or one more call than the table has, fails: a new way to pick a target has appeared.
// If it is meant, it belongs in the navigation panel or the Overview; only then add it here, with the reason on its line.
// Run: node tests/onetarget.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// what makes a target, and who may do it: { file: how many times }. Setting it to null (clearing) is not counted.
const DOORS = [
  // ---- a place ----
  { what: 'cruisePick( : make a place the destination', re: /\bcruisePick\(/g, who: {
    navpanel: 1,    // Enter or a click on a row of the navigation panel
    clickmove: 1 } }, // a click on the place in space
  { what: 'cr.target = : write the destination', re: /\bcr\.target = (?!null)/g, who: {
    cruise: 1,      // cruisePick itself
    autopilot: 2,   // the autopilot keeps the place it was sent to (autopilotGo, and its cruise leg); it picks nothing
    overview: 2 } }, // Cruise to (card space-game-overview-cruise-to): the ship ALREADY selected becomes the cruise's destination, and the destination you had comes back after; it picks nothing
  { what: 'np.jump = : make another system the destination', re: /\bnp\.jump = (?!null)/g, who: {
    navpanel: 1 } }, // a row of Gates and jumps
  { what: 'autopilotGo( : fly to a place', re: /\bautopilotGo\(/g, who: {
    autopilot: 2,   // P: to the destination, or to the row under the ring while the navigation panel is open
    navpanel: 1 } }, // Enter again on the destination
  { what: 'jumpStart( : start a jump', re: /\bjumpStart\(/g, who: {
    jump: 1,        // the galaxy map's own Enter (G)
    navpanel: 1 } }, // Enter again on a jump row
  // ---- a ship ----
  { what: 'overviewPick( : make a ship the target', re: /\boverviewPick\(/g, who: {
    overview: 2 } }, // Enter on a row, a click on a row
  { what: 'clickmoveClick( : a click in space', re: /\bclickmoveClick\(/g, who: {
    clickmove: 1,   // the pointer
    overview: 1 } }, // an Overview row is the same pick as a click on that ship
  { what: 'cm.pick = : the picked ship', re: /\bcm\.pick = (?!null)/g, who: {
    clickmove: 1 } },
  { what: 'assistSet(mode, target : an order on a ship', re: /\bassistSet\([^(),]+,/g, who: {
    assist: 1,      // an order key (1-4) goes to the thing already selected
    clickmove: 3,   // a click on a ship, and the order keys on the picked ship
    overview: 3 } }, // a row with no click to move in the build, the order buttons of the target row, and the hand-over after Cruise to (the same selected ship)
  { what: 'gunlockSet( : lock a raider', re: /\bgunlockSet\((?!null)/g, who: {
    gunlock: 1,     // V: the selected raider, else the nearest. No walk to the next one.
    overview: 1 } }, // the Lock button of the target row
  { what: 'L.target = : the lock itself', re: /\bL\.target = (?!null)/g, who: {
    gunlock: 1 } }
];

const files = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js'));
const code = {};
for (const f of files) code[f.slice(0, -3)] = readFileSync(join(ROOT, 'src', f), 'utf8').split('\n')
  .map(l => l.replace(/\/\/.*$/, ''))                // comments say the names too
  .filter(l => !/^\s*function \w+\(/.test(l) || /\{.*\b\w+\(/.test(l.replace(/^\s*function \w+\([^)]*\)\s*\{/, '{'))) // a definition is not a call
  .map(l => l.replace(/^\s*function \w+\(/, 'function('))
  .join('\n');

console.log('every way to set the target is on the list');
for (const d of DOORS) {
  const found = {};
  for (const f in code) { const c = (code[f].match(d.re) || []).length; if (c) found[f] = c; }
  const extra = Object.keys(found).filter(f => !(f in d.who)).map(f => `src/${f}.js is new (${found[f]})`);
  const more = Object.keys(d.who).filter(f => (found[f] || 0) !== d.who[f]).map(f => `src/${f}.js has ${found[f] || 0}, the list says ${d.who[f]}`);
  check(d.what, extra.length === 0 && more.length === 0, extra.concat(more).join('; '));
}

console.log('what was taken out stays out');
{
  check('the Tab map has no picker: no ring rule, no call that flies or picks', J('typeof mapPickStart') === 'undefined' && !/autopilotGo|cruisePick|cruiseKnown/.test(code.map));
  check('the Overview lists no places: it does not read the bodies of the system', !/cruiseKnown/.test(code.overview));
  check('a place handed to the Overview is refused', J(`overviewPick({ cr: { target: null } }, { ref: { id: 'st', name: 'Halcyon Station', x: 0, y: 0 } })`) === '');
  check('V does not walk from one raider to the next: the rule takes no current lock', J('gunlockNext.length') === 3);
  check('one key each: N for places, B for ships', J(`CONTROLS.find(g => g.id === 'flight').rows.filter(r => /^Places/.test(r.t) && r.k[0] === 'N').length`) === 1 && J(`CONTROLS.find(g => g.id === 'flight').rows.filter(r => /^Overview of ships/.test(r.t) && r.k.join() === OVERVIEW.key).length`) === 1);
  check('the help page says it too, and the Tab line picks nothing', J(`HELP.Space.some(l => /^N X   places/.test(l)) && HELP.Space.some(l => /^B   overview of ships/.test(l)) && HELP.Space.some(l => /^Tab   sector map/.test(l) && !/choose|Enter/.test(l))`));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
