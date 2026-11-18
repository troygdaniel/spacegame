// smoke: the mission box's place line is cut to the room its title leaves (plain Node, no Chrome)
// hudFitSub in src/hud.js (first look, docs/FIRSTLOOK.md): "Kestrel Outpost, Kestrel" beside "Courier run" ran into the title once the place
// line carried the star system. The line is monospace, so the cut is a count of letters.
// Run: node tests/hudfit.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const size = J('HT.label'), wide = s => s.length * size * 0.6;

check('a place that fits is left alone', J(`hudFitSub('Kepler-4b', 150, ${size})`) === 'Kepler-4b');
const cut = J(`hudFitSub('Kestrel Outpost, Kestrel', 150, ${size})`);
check('a place that does not fit is cut, ends in two dots and fits the room', cut.endsWith('..') && cut.length < 'Kestrel Outpost, Kestrel'.length && wide(cut) <= 150 && cut.startsWith('Kestrel Outpost'), cut);
check('the cut never leaves a comma or a space before the dots', J(`hudFitSub('Kestrel Outpost, Kestrel', ${Math.ceil(wide('Kestrel Outpost, ..'))}, ${size})`) === 'Kestrel Outpost..', J(`hudFitSub('Kestrel Outpost, Kestrel', ${Math.ceil(wide('Kestrel Outpost, ..'))}, ${size})`));
check('no room at all: nothing is written, not two dots on the title', J(`hudFitSub('Kestrel Outpost, Kestrel', 20, ${size})`) === '' && J(`hudFitSub('Kestrel', -40, ${size})`) === '');
check('for every call in the game the cut line fits the room it is given', J(`MISSIONS.every(m => [60, 120, 180, 260].every(room => hudFitSub(missionWhere(m), room, ${size}).length * ${size} * 0.6 <= room))`));
check('no place: an empty line', J(`hudFitSub(undefined, 150, ${size})`) === '');
// the navigation panel's foot line (src/navpanel.js): one line in the room its right-hand tag leaves
const panelW = J('NAVPANEL.w'), foot = (hint, tag) => J(`hudFitSub(${JSON.stringify(hint)}, ${panelW} - 28 - ${tag.length * 12 * 0.6}, 12)`);
const long = 'Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr.';
let f = foot(long, 'v12');
check('the route plotter\'s long foot sentence is cut to one line that fits beside the tag, with two dots', f.endsWith('..') && f.length * 12 * 0.6 <= panelW - 28 - 3 * 12 * 0.6 && f.startsWith('Needs a 12.2 ly jump'), f);
f = foot('Enter  open the galaxy map at Kestrel', 'v12');
check('the usual foot lines are left whole ("Enter  open the galaxy map at Kestrel" beside a v12 tag)', f === 'Enter  open the galaxy map at Kestrel', f);
check('every foot line of the panel that the game writes fits whole beside "X clear", the widest ordinary tag, except none: go, set, dock, jump', ['Enter  set as destination', 'Enter  go: autopilot and cruise', 'Enter  dock   P  fly there only', 'Enter  jump   7.8 fuel', 'N  choose where to go', 'You are there.'].every(h => foot(h, 'X clear') === h));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `HUD FIT FAIL (${failed} of ${n})` : `HUD FIT PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
