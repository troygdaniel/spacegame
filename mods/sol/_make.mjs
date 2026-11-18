// Writes the Sol pack's system file, its dock files and the tables of docs/SOL.md from ONE table of bodies, so the numbers cannot disagree.
//   node mods/sol/_make.mjs            write mods/sol/systems/sol.md, mods/sol/stations/sol-*.md and the tables in docs/SOL.md
//   node mods/sol/_make.mjs --check    write nothing; exit 1 if any of them is not what this file makes
// Change the scale or a body here, run it, then node tools/build-content.mjs. The build never reads this file (a name that starts with _ is skipped).
// Real astronomy only: the bodies, their semi-major axes (AU) and the planets' mean longitudes at J2000 (1 Jan 2000, 12:00 TT) are real.
// Invented: every station and gate, the angle of each asteroid, how far a moon sits from its planet, every size on the screen.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..', '..');

// ---- the scale ----
// A body's ring is K x the square root of its real distance from the Sun in AU, in the units a system file is written in (the game spreads every
// position 3 times, SYSTEM_SCALE, so a unit is 3 px of space). A square root keeps the order and the feel: Mercury to Mars are close together,
// the giants far apart, and Neptune is 5.5 times as far out as Earth instead of 30 times.
export const SCALE = { K: 70000, power: 0.5, size: 1000000, sun: 500000, spread: 3 }; // K was 14,000 while a system file could be 200,000 units wide (card space-game-sol-needs-bigger-systems)
export const ringOf = au => Math.round(SCALE.K * Math.pow(au, SCALE.power));
// ecliptic longitude L (degrees, counted anticlockwise from the direction a map draws as east) to the file's angle (clockwise from north)
export const angleOf = L => ((90 - L) % 360 + 360) % 360;

// ---- the bodies that go round the Sun: [id, name, type, AU, longitude, r px, kind, seed, more] ----
// longitude: the planet's mean longitude at J2000; null for a body whose place on its ring is invented (given as `at`, an angle in the file's sense)
export const SUN_BODIES = [
  { id: 'sol-mercury', name: 'Mercury', type: 'planet', au: 0.387, L: 252.25, r: 150, kind: 'rock', seed: 11 },
  { id: 'sol-venus', name: 'Venus', type: 'planet', au: 0.723, L: 181.98, r: 280, kind: 'lava', seed: 12, why: 'no cloud world in the game: lava is the hot one' },
  { id: 'sol-earth', name: 'Earth', type: 'planet', au: 1.000, L: 100.46, r: 300, kind: 'ice', seed: 13, why: 'no ocean world in the game: ice is the blue and white one' },
  { id: 'sol-eros', name: 'Eros', type: 'planet', au: 1.458, at: 140, r: 45, kind: 'rock', seed: 14, why: 'a near-Earth asteroid: its orbit lies between Earth and Mars, not in the belt' },
  { id: 'sol-mars', name: 'Mars', type: 'planet', au: 1.524, L: 355.45, r: 200, kind: 'rock', seed: 15 },
  { id: 'sol-vesta', name: 'Vesta', type: 'planet', au: 2.362, at: 250, r: 60, kind: 'rock', seed: 16 },
  { id: 'sol-ceres', name: 'Ceres', type: 'planet', au: 2.767, at: 20, r: 80, kind: 'ice', seed: 17 },
  { id: 'sol-pallas', name: 'Pallas', type: 'planet', au: 2.772, at: 200, r: 60, kind: 'rock', seed: 18 },
  { id: 'sol-belt-inner', name: 'Main Belt, Vesta side', type: 'belt', au: 2.2, at: 262, r: 900, rocks: 30 },
  { id: 'sol-belt-ceres', name: 'Main Belt, Ceres side', type: 'belt', au: 2.9, at: 8, r: 1100, rocks: 40 },
  { id: 'sol-belt-outer', name: 'Main Belt, far side', type: 'belt', au: 3.1, at: 190, r: 1000, rocks: 35 },
  { id: 'sol-jupiter', name: 'Jupiter', type: 'planet', au: 5.203, L: 34.40, r: 520, kind: 'gas', seed: 19 },
  { id: 'sol-greeks', name: 'Greek camp (L4)', type: 'belt', au: 5.203, L: 34.40 + 60, r: 900, rocks: 25, why: 'the Jupiter trojans 60 degrees ahead of the planet' },
  { id: 'sol-trojans', name: 'Trojan camp (L5)', type: 'belt', au: 5.203, L: 34.40 - 60, r: 900, rocks: 25, why: 'the Jupiter trojans 60 degrees behind the planet; Patroclus is one of them' },
  { id: 'sol-saturn', name: 'Saturn', type: 'planet', au: 9.537, L: 49.94, r: 480, kind: 'ringed', seed: 20 },
  { id: 'sol-uranus', name: 'Uranus', type: 'planet', au: 19.19, L: 313.23, r: 360, kind: 'ice', seed: 21 },
  { id: 'sol-neptune', name: 'Neptune', type: 'planet', au: 30.07, L: 304.88, r: 350, kind: 'gas', seed: 22 },
  { id: 'sol-pluto', name: 'Pluto', type: 'planet', au: 39.48, L: 238.93, r: 110, kind: 'ice', seed: 23 },
  // the two jump points: invented. One a little outside Earth's ring, one out past Pluto
  { id: 'sol-inner-gate', name: 'Lagrange Gate', type: 'gate', au: 1.2, at: 310, r: 110, invented: true },
  { id: 'sol-outer-gate', name: 'Kuiper Gate', type: 'gate', au: 44, at: 215, r: 110, invented: true }
];
// ---- what sits beside a body: moons and docks, placed by an offset from their parent in file units, at an angle in the file's sense ----
// The file has no way to say "this goes round that" (docs/SOL.md, the data model): a moon is written as its own x and y, worked out here.
// km: the moon's real distance from its planet, for the table. A dock's `off` is small: it is beside its rock, not on a ring of its own.
export const MOONS = [
  { id: 'sol-luna', name: 'Luna', of: 'sol-earth', km: 384400, off: 1100, at: 70, r: 90, kind: 'rock', seed: 31 },
  { id: 'sol-phobos', name: 'Phobos', of: 'sol-mars', km: 9376, off: 600, at: 30, r: 30, kind: 'rock', seed: 32 },
  { id: 'sol-deimos', name: 'Deimos', of: 'sol-mars', km: 23463, off: 900, at: 200, r: 28, kind: 'rock', seed: 33 },
  { id: 'sol-io', name: 'Io', of: 'sol-jupiter', km: 421700, off: 900, at: 20, r: 70, kind: 'lava', seed: 34 },
  { id: 'sol-europa', name: 'Europa', of: 'sol-jupiter', km: 671000, off: 1300, at: 140, r: 60, kind: 'ice', seed: 35 },
  { id: 'sol-ganymede', name: 'Ganymede', of: 'sol-jupiter', km: 1070400, off: 1800, at: 250, r: 95, kind: 'rock', seed: 36 },
  { id: 'sol-callisto', name: 'Callisto', of: 'sol-jupiter', km: 1882700, off: 2400, at: 330, r: 90, kind: 'rock', seed: 37 },
  { id: 'sol-enceladus', name: 'Enceladus', of: 'sol-saturn', km: 238000, off: 900, at: 100, r: 35, kind: 'ice', seed: 38 },
  { id: 'sol-titan', name: 'Titan', of: 'sol-saturn', km: 1221900, off: 1700, at: 220, r: 100, kind: 'rock', seed: 39 },
  { id: 'sol-phoebe', name: 'Phoebe', of: 'sol-saturn', km: 12947000, off: 3000, at: 340, r: 30, kind: 'rock', seed: 40 },
  { id: 'sol-triton', name: 'Triton', of: 'sol-neptune', km: 354800, off: 1100, at: 60, r: 70, kind: 'ice', seed: 41 }
];
// the seven docks: our own names, each after a real feature of the body it serves. Only the FIRST station row of a system is a dock the game opens
// today (src/space.js draws and docks at one), so Imbrium Dock is the live one and the other six are written as scenery you can fly to; their dock
// files are in the pack, ready for the card that gives a system more than one dock (docs/SOL.md).
export const DOCKS = [
  { id: 'sol-imbrium-dock', name: 'Imbrium Dock', of: 'sol-luna', off: 420, at: 160, look: 'hub', after: 'Mare Imbrium, a sea of Luna',
    dock: { fuel: 8, repair: 0.5, ore: 20, yard: ['kite', 'ox'], parts: { engine: 2, shields: 2, weapons: 2, tank: 2, cargo: 2 } },
    runs: [['courier', 'halcyon-station'], ['haul', 'halcyon-station']], // the way home: a job on the board of the one dock Sol has today
    welcome: 'Welcome to {station}. Earth is the blue one. Mind the traffic.', services: ['Fuel', 'Repair', 'Parts shop (to tier 2)', 'Shipyard (the Kite and the Ox)'] },
  { id: 'sol-arsia-high', name: 'Arsia High', of: 'sol-mars', off: 430, at: 110, look: 'hub', after: 'Arsia Mons, a volcano of Mars',
    dock: { fuel: 9, repair: 0.5, ore: 22, yard: ['talon'], parts: { weapons: 3, shields: 3, aim: 3 } },
    welcome: 'Welcome to {station}. The dust gets into everything. So do the patrols.', services: ['Fuel', 'Repair', 'Parts (weapons, shields and the autotarget, to tier 3)', 'Shipyard (the Talon)'] },
  { id: 'sol-himeros-anchorage', name: 'Himeros Anchorage', of: 'sol-eros', off: 380, at: 300, look: 'foundry', after: 'Himeros, the saddle of Eros',
    dock: { fuel: 7, repair: 0.6, ore: 26, parts: { cargo: 2, tank: 2 } },
    welcome: 'Welcome to {station}. Tie off, it is a small rock and it tumbles.', services: ['Fuel', 'Repair', 'Parts (cargo and tank, to tier 2)'] },
  { id: 'sol-occator-works', name: 'Occator Works', of: 'sol-ceres', off: 400, at: 230, look: 'foundry', after: 'Occator, the crater of Ceres with the bright salt',
    dock: { fuel: 6, repair: 0.5, ore: 30, yard: ['ox'], parts: { cargo: 3, tank: 3 } },
    welcome: 'Welcome to {station}. Water, salt and ore: we sell all three by the tonne.', services: ['Fuel', 'Repair', 'Parts (cargo and tank, to tier 3)', 'Shipyard (the Ox)'] },
  { id: 'sol-patroclus-yard', name: 'Patroclus Yard', of: 'sol-trojans', off: 650, at: 40, look: 'foundry', after: 'Patroclus, a double asteroid among the trojans',
    dock: { fuel: 7, repair: 0.4, yard: ['kite', 'ox', 'talon', 'pathfinder', 'bastion'], parts: { engine: 3, tank: 3 } },
    welcome: 'Welcome to {station}. If it flies, we built one. If it does not, we will.', services: ['Fuel', 'Repair (the cheapest in Sol)', 'Parts (engine and tank, to tier 3)', 'Shipyard (five ships)'] },
  { id: 'sol-perrine-station', name: 'Perrine Station', of: 'sol-ganymede', off: 380, at: 80, look: 'hub', after: 'Perrine Regio, a dark plain of Ganymede',
    dock: { fuel: 8, repair: 0.5, ore: 24, parts: { shields: 3, engine: 2 } },
    welcome: 'Welcome to {station}. Jupiter fills half the sky. You stop noticing after a year.', services: ['Fuel', 'Repair', 'Parts (shields to tier 3, engine to tier 2)'] },
  { id: 'sol-kraken-shore', name: 'Kraken Shore', of: 'sol-titan', off: 400, at: 300, look: 'hub', after: 'Kraken Mare, the largest sea of Titan',
    dock: { fuel: 5, repair: 0.6, ore: 18, yard: ['pathfinder'], parts: { tank: 3, engine: 3 } },
    welcome: 'Welcome to {station}. Fuel is cheap here: we are standing on a sea of it.', services: ['Fuel (the cheapest in Sol)', 'Repair', 'Parts (tank and engine, to tier 3)', 'Shipyard (the Pathfinder)'] }
];

// ---- where everything is, in file units ----
const rad = a => a * Math.PI / 180;
const place = (cx, cy, dist, angle) => ({ x: Math.round(cx + Math.sin(rad(angle)) * dist), y: Math.round(cy - Math.cos(rad(angle)) * dist) });
export function layout() {
  const at = {}, rows = [];
  SUN_BODIES.forEach(b => { const angle = b.L !== undefined ? angleOf(b.L) : b.at, orbit = ringOf(b.au); at[b.id] = Object.assign(place(SCALE.sun, SCALE.sun, orbit, angle), { orbit, angle: Math.round(angle * 100) / 100 }); });
  MOONS.forEach(m => { at[m.id] = place(at[m.of].x, at[m.of].y, m.off, m.at); });
  DOCKS.forEach(d => { at[d.id] = place(at[d.of].x, at[d.of].y, d.off, d.at); });
  // the order of the rows: the live dock first (the game takes the first station), then the Sun's bodies outward with each one's moons and dock after it
  const live = DOCKS[0];
  rows.push({ id: live.id, type: 'station', name: live.name, x: at[live.id].x, y: at[live.id].y, art: live.look, labelDy: -260 });
  SUN_BODIES.forEach(b => {
    rows.push(Object.assign({ id: b.id, type: b.type, name: b.name, orbit: at[b.id].orbit, angle: at[b.id].angle, r: b.r }, b.type === 'planet' ? { landable: 'no', kind: b.kind, seed: b.seed } : b.type === 'belt' ? { rocks: b.rocks } : {}));
    MOONS.filter(m => m.of === b.id).forEach(m => {
      rows.push({ id: m.id, type: 'planet', name: m.name, x: at[m.id].x, y: at[m.id].y, r: m.r, landable: 'no', kind: m.kind, seed: m.seed });
      DOCKS.filter(d => d.of === m.id && d !== live).forEach(d => rows.push({ id: d.id, type: 'scenery', name: d.name, x: at[d.id].x, y: at[d.id].y, look: d.look, labelDy: -240 }));
    });
    DOCKS.filter(d => d.of === b.id && d !== live).forEach(d => rows.push({ id: d.id, type: 'scenery', name: d.name, x: at[d.id].x, y: at[d.id].y, look: d.look, labelDy: -240 }));
  });
  return { at, rows };
}

const COLS = ['id', 'type', 'name', 'x', 'y', 'orbit', 'angle', 'art', 'r', 'rocks', 'landable', 'kind', 'seed', 'look', 'labelDy'];
const cell = v => (v === undefined || v === null ? '' : String(v));
export function systemFile() {
  const { rows } = layout();
  return [
    '---',
    '# Sol, our own solar system. MADE by mods/sol/_make.mjs from one table of bodies: change that file and run it, do not edit this one by hand.',
    '# The scale, the table of every body with its real distance, and what is invented: docs/SOL.md.',
    'type: system',
    'name: Sol',
    'kind: trade',
    '# where it is on the galaxy map: 7.8 light years from Halcyon, so the starter ship can jump here (invented: Halcyon is not a real star)',
    'ly: [26, 27]',
    'size: ' + SCALE.size,
    'danger: 1',
    'traffic: 3',
    'seed: 1969',
    '# the Sun: a G star, in the middle',
    'starType: G',
    'starX: ' + SCALE.sun,
    'starY: ' + SCALE.sun,
    '---',
    'Where we started. Eight planets, their moons, a belt of rock between Mars and Jupiter, and seven docks named for the ground under them. The distances are squeezed: a ring is the square root of the real one.',
    '',
    '## Bodies',
    '| ' + COLS.join(' | ') + ' |',
    '|' + COLS.map(() => '---').join('|') + '|',
    ...rows.map(r => '| ' + COLS.map(c => cell(r[c])).join(' | ') + ' |'),
    ''
  ].join('\n');
}
export function stationFile(d) {
  const k = d.dock, lines = ['---', '# A dock of the Sol pack. MADE by mods/sol/_make.mjs: change that file and run it.', 'type: station', 'name: ' + d.name, 'system: sol', 'accent: cyan'];
  if (k.fuel !== undefined) lines.push('fuel: ' + k.fuel);
  if (k.repair !== undefined) lines.push('repair: ' + k.repair);
  if (k.ore !== undefined) lines.push('ore: ' + k.ore);
  if (k.yard) lines.push('yard: [' + k.yard.join(', ') + ']');
  lines.push('---', 'Named for ' + d.after + '.', '', '## Parts', '| slot | tier |', '|---|---|', ...Object.entries(k.parts).map(([s, t]) => '| ' + s + ' | ' + t + ' |'), ...(d.runs ? ['', '## Runs', '| kind | to |', '|---|---|', ...d.runs.map(([k, to]) => '| ' + k + ' | ' + to + ' |')] : []), '', '## Welcome', d.welcome, '', '## Services', ...d.services.map(s => '- ' + s), '');
  return lines.join('\n');
}
// the tables of docs/SOL.md, between its two marker lines
export const DOC_START = '<!-- sol-tables:start (made by mods/sol/_make.mjs) -->', DOC_END = '<!-- sol-tables:end -->';
export function docTables() {
  const { at } = layout(), px = u => (u * SCALE.spread).toLocaleString('en-US'), n = x => x.toLocaleString('en-US');
  const sun = SUN_BODIES.filter(b => !b.invented).map(b => `| ${b.name} | ${b.type === 'belt' ? 'belt field' : b.kind + ' world'} | ${b.au} | ${n(at[b.id].orbit)} | ${px(at[b.id].orbit)} | ${b.L !== undefined ? 'J2000 longitude ' + (((b.L % 360) + 360) % 360).toFixed(2) + ' deg' : 'invented'} | ${b.why || ''} |`);
  const moons = MOONS.map(m => `| ${m.name} | ${SUN_BODIES.find(b => b.id === m.of).name} | ${n(m.km)} | ${n(m.off)} | ${px(m.off)} |`);
  const docks = DOCKS.map((d, i) => { const host = MOONS.find(m => m.id === d.of) || SUN_BODIES.find(b => b.id === d.of), k = d.dock; return `| ${d.name} | ${host.name} | ${d.after} | fuel ${k.fuel}, repair ${k.repair}${k.ore ? ', ore ' + k.ore : ''}${k.yard ? ', yard: ' + k.yard.join(', ') : ''} | ${i === 0 ? 'the live dock' : 'scenery today; its dock file is ready'} |`; });
  const gates = SUN_BODIES.filter(b => b.invented).map(b => `| ${b.name} | ${b.au} AU | ${n(at[b.id].orbit)} | ${px(at[b.id].orbit)} |`);
  return [DOC_START, '',
    '### Bodies that go round the Sun', '', '| Body | Drawn as | Real distance, AU | Ring in the file | Ring in space, px | Where on the ring | Note |', '|---|---|---|---|---|---|---|', ...sun, '',
    '### Moons', '', 'Real distance from the planet, and the offset the file uses instead (the order outward is kept, the distances are not).', '', '| Moon | Of | Real distance, km | Offset in the file | Offset in space, px |', '|---|---|---|---|---|', ...moons, '',
    '### Docks (all invented)', '', '| Dock | Beside | Named for | Its dock file | In the game today |', '|---|---|---|---|---|', ...docks, '',
    '### Gates (invented)', '', '| Gate | Placed as if at | Ring in the file | Ring in space, px |', '|---|---|---|---|', ...gates, '', DOC_END].join('\n');
}

export function files() {
  const out = { 'mods/sol/systems/sol.md': systemFile() };
  // the live dock is a file the build reads; the other six wait in a folder whose name starts with _ (the build skips it), because a dock file with no
  // station row is a warning. When a system can have more than one dock: make their rows `station` in layout() and write them to stations/ too.
  DOCKS.forEach((d, i) => { out['mods/sol/' + (i === 0 ? 'stations/' : '_stations-later/') + d.id + '.md'] = stationFile(d); });
  return out;
}
function main() {
  const check = process.argv.includes('--check'); let stale = 0;
  const put = (rel, text) => { const f = join(ROOT, rel), old = existsSync(f) ? readFileSync(f, 'utf8') : null; if (old === text) return; stale++; if (check) console.log('  stale: ' + rel); else { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); console.log('  wrote ' + rel); } };
  Object.entries(files()).forEach(([rel, text]) => put(rel, text));
  const doc = join(ROOT, 'docs/SOL.md');
  if (existsSync(doc)) { const t = readFileSync(doc, 'utf8'), i = t.indexOf(DOC_START), j = t.indexOf(DOC_END); if (i >= 0 && j > i) put('docs/SOL.md', t.slice(0, i) + docTables() + t.slice(j + DOC_END.length)); else { stale++; console.log('  docs/SOL.md has no marker lines for its tables'); } }
  else if (check) { stale++; console.log('  docs/SOL.md is missing'); }
  console.log(check ? (stale ? 'sol pack: ' + stale + ' file(s) are not what mods/sol/_make.mjs makes' : 'sol pack: every file is current') : 'sol pack: done');
  process.exit(check && stale ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
