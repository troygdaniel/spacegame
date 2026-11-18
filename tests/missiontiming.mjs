// smoke: every call still plays in sensible time after the systems were spread 3 times: its length worked out from the data, inside its band (plain Node, no Chrome)
// Card space-game-missions-after-distances. tools/mission-timing.mjs works out how long each call takes from the game's own numbers (where the
// bodies are, the MULE's speeds, the gate hold, cruise and jump numbers, the pirates' hull, the Wren) and the pace guesses of the economy
// simulator. This test fails when a call leaves its band: 1.5 to 5 minutes for a call played in one system or over one jump, up to 12 for a
// journey of several jumps (docs/MISSIONS-TIMING.md has the table and why the floor is 1.5 and not the 2 the card asked for).
// Run: node tests/missiontiming.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { missionTimes, bandOf, BAND, LONG_MAX, BEFORE } from '../tools/mission-timing.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame(), { scale, calls } = missionTimes(g), by = id => calls.find(c => c.id === id), m1 = x => x.toFixed(1) + ' min';

check('the systems are spread 3 times and the model has every call of the game', scale === 3 && calls.length === g.run('MISSIONS.length') && calls.length >= 20, calls.length + ' calls');
check('the bands: 1.5 to 5 minutes, 12 for a journey', BAND.min === 1.5 && BAND.max === 5 && LONG_MAX === 12);
for (const c of calls) {
  const b = bandOf(c);
  if (!b) { check(`${c.id}: not timed, and it says why (${c.note})`, c.kind === 'out of range' && /range|reach/.test(c.note)); continue; }
  check(`${c.id} (${c.kind}): ${m1(c.min)}, inside ${b.min} to ${b.max} minutes`, c.min >= b.min && c.min <= b.max, `before the spread ${m1(c.before.min)}, ${Math.round(c.perMin)} cr a minute`);
}
const timed = calls.filter(c => bandOf(c));
check('nothing got shorter with the spread', timed.every(c => c.unfixed.min >= c.before.min - 1e-9));
check('apart from the escort the spread moved no call by more than half a minute (cruise takes the distance)', timed.filter(c => c.id !== 'escort').every(c => c.unfixed.min - c.before.min <= 0.5), timed.filter(c => c.id !== 'escort').map(c => c.id + ' +' + (c.unfixed.min - c.before.min).toFixed(2)).join(', ').slice(0, 280));

// the escort: the one call the spread broke, and what was done about it
const e = by('escort');
check('the escort route is three times as long as it was', e.parts.px > e.before.parts.px * 2.8 && e.parts.px < e.before.parts.px * 3.4, `${Math.round(e.before.parts.px)} px, now ${Math.round(e.parts.px)} px`);
check('left as it was, the escort ran over 5 minutes with a wave every 45 s or more', e.unfixed.min > BAND.max && e.unfixed.parts.waveGapSec > 45, `${m1(e.unfixed.min)}, a wave every ${e.unfixed.parts.waveGapSec.toFixed(0)} s`);
check('now it is between 3 and 4.5 minutes with a wave every 20 to 40 s', e.min >= 3 && e.min <= 4.5 && e.parts.waveGapSec >= 20 && e.parts.waveGapSec <= 40, `${m1(e.min)}, a wave every ${e.parts.waveGapSec.toFixed(0)} s`);
check('the MULE flies at 90 covered and 45 exposed (60 and 30 before), still slower than any ship that escorts her', g.run('ESCORT.cruise') === 90 && g.run('ESCORT.slow') === 45 && BEFORE.mule.cruise === 60 && g.run('ESCORT.cruise < Math.min(...Object.values(SHIP_MODELS).map(s => s.speed)) / 3'));
check('her ring, the pirates\' fly-in and the gate hold are sizes and timers, not places: unchanged', g.run('ESCORT.box === 350 && ESCORT.inbound === 240 && ESCORT.spinUp === 8000 && ESCORT.waveOut === 1400 && ESCORT.lastOut === 1100'));

// Halcyon's station-side pirates: written as places in the old units in src/space.js, they were left behind by the spread
const src = readFileSync(new URL('../src/space.js', import.meta.url), 'utf8');
check('the three pirates on the way to Kepler-4b are placed through sysAt, like the system data', /\[\[5700, 2700\], \[6000, 3500\], \[2500, 2200\]\]\.forEach\(\(\[x, y\]\) => this\.spawnDrone\(sysAt\(x\), sysAt\(y\)\)\)/.test(src));
const far = JSON.parse(g.run(`JSON.stringify([[5700, 2700], [6000, 3500], [2500, 2200]].map(([x, y]) => { const st = sysBody('station', 'halcyon'), pl = sysBody('planet', 'halcyon'), p = { x: sysAt(x), y: sysAt(y) }; return { st: Math.hypot(p.x - st.x, p.y - st.y), pl: Math.hypot(p.x - pl.x, p.y - pl.y), raw: Math.hypot(x - st.x, y - st.y) }; }))`));
check('placed so, each is over 2000 px from the station (outside the police zone) and nearer to it than the raw numbers were', far.every(p => p.st > 2000 && p.st < p.raw), JSON.stringify(far.map(p => [Math.round(p.st), Math.round(p.raw)])));
check('two of them sit between the station and the planet, as the comment in space.js says', far.filter(p => p.st + p.pl < 1.6 * g.run(`Math.hypot(sysBody('station', 'halcyon').x - sysBody('planet', 'halcyon').x, sysBody('station', 'halcyon').y - sysBody('planet', 'halcyon').y)`)).length >= 2);

// found on the way, not caused by the spread: calls the starter ship cannot fly
const out = calls.filter(c => c.kind === 'out of range');
check('the calls a Wren cannot reach are known and listed in the doc (routes of 8.2 and 12.4 ly against a range of 8)', out.length === 5 && out.every(c => /ember|roost|meridian/.test(c.id)), out.map(c => c.id).join(', '));
check('the bounty is timed in the cheapest ship that reaches the Roost, and says so', /Kite|cheapest/.test(by('bounty').note) && by('bounty').kind === 'journey');
const doc = readFileSync(new URL('../docs/MISSIONS-TIMING.md', import.meta.url), 'utf8');
check('docs/MISSIONS-TIMING.md has a row for every kind of call and the escort numbers of this run', ['Rescue call', 'Escort', 'Police patrol', 'Courier run', 'Haul', 'Salvage: the Widow', 'Survey: the Hollow', 'Bounty: the Reaver'].every(t => doc.includes(t)) && doc.includes(e.min.toFixed(1)) && doc.includes(e.unfixed.min.toFixed(1)));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `MISSIONTIMING FAIL (${failed} of ${n})` : `MISSIONTIMING PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
