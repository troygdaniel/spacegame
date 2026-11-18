// smoke: courier and haul runs come from the station files: the fourteen shipped ones unchanged, a new dock posts its own (plain Node, no Chrome)
// Card space-game-routes-from-files. Which runs exist was the list CALL_ROUTES in src/missions.js; a system made from files got none. A run is
// now a row of the Runs table of the station that posts it (content/stations/<id>.md: | kind | to |) and src/missions.js builds the calls from
// those rows (carryRoutes, carrySync). This test checks:
//   1. nothing changed for the shipped game: the same fourteen runs with the ids a saved game names, in the same order, on the same six boards
//   2. the schema: a Runs table is read; a run to itself, to a dock no file has, or listed twice is refused in words
//   3. a new system with a dock, written as two files: its dock posts a courier and a haul to a neighbour without naming them in `missions`,
//      the neighbour can post one back, the pay is the usual sum for the distance, and the shipped boards stay as they were
//   4. a run a file drops goes, but never the run being flown; a run that stays keeps its object (words a mission file laid over it survive)
// Run: node tests/routesfromfiles.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const Jin = (game, e) => JSON.parse(game.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const J = e => Jin(g, e);
const text = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
const DOCKS = ['halcyon-station', 'kestrel-outpost', 'meridian-exchange', 'brass-smelter', 'ember-foundry', 'roost-dock'];

// what the code's own list was on 17 Nov 2026, before the files took over: [kind, posted at, delivered to], in its order
const WAS = [
  ['courier', 'halcyon-station', 'kestrel-outpost'], ['courier', 'halcyon-station', 'brass-smelter'], ['haul', 'halcyon-station', 'brass-smelter'],
  ['courier', 'kestrel-outpost', 'halcyon-station'], ['courier', 'kestrel-outpost', 'meridian-exchange'], ['haul', 'kestrel-outpost', 'meridian-exchange'],
  ['courier', 'meridian-exchange', 'kestrel-outpost'], ['courier', 'meridian-exchange', 'ember-foundry'], ['courier', 'meridian-exchange', 'roost-dock'], ['haul', 'meridian-exchange', 'ember-foundry'],
  ['courier', 'brass-smelter', 'halcyon-station'], ['haul', 'brass-smelter', 'halcyon-station'],
  ['courier', 'ember-foundry', 'meridian-exchange'], ['haul', 'ember-foundry', 'meridian-exchange']
];
const WAS_IDS = ['courier-halcyon-kestrel', 'courier-halcyon-brass', 'haul-halcyon-brass', 'courier-kestrel-halcyon', 'courier-kestrel-meridian', 'haul-kestrel-meridian', 'courier-meridian-kestrel', 'courier-meridian-ember',
  'courier-meridian-roost', 'haul-meridian-ember', 'courier-brass-halcyon', 'haul-brass-halcyon', 'courier-ember-meridian', 'haul-ember-meridian'];
const WAS_BOARDS = {
  'halcyon-station': ['rescue', 'escort', 'patrol', 'courier-halcyon-kestrel', 'courier-halcyon-brass', 'haul-halcyon-brass', 'survey-hollow'],
  'kestrel-outpost': ['courier-kestrel-halcyon', 'courier-kestrel-meridian', 'haul-kestrel-meridian'],
  'meridian-exchange': ['courier-meridian-kestrel', 'courier-meridian-ember', 'courier-meridian-roost', 'haul-meridian-ember', 'salvage-lethe', 'survey-hollow'],
  'brass-smelter': ['courier-brass-halcyon', 'haul-brass-halcyon', 'salvage-lethe'],
  'ember-foundry': ['courier-ember-meridian', 'haul-ember-meridian'],
  'roost-dock': []
};
const boards = game => Jin(game, `Object.fromEntries(${JSON.stringify(DOCKS)}.map(st => [st, missionsOffered(st).map(m => m.id)]))`);

console.log('1. the shipped game is what it was');
check('the code has no list of routes any more', J(`typeof CALL_ROUTES`) === 'undefined' && !/CALL_ROUTES\s*=/.test(readFileSync(new URL('../src/missions.js', import.meta.url), 'utf8')));
check('the files give the fourteen routes the code had, in its order', JSON.stringify(J(`carryRoutes()`)) === JSON.stringify(WAS), JSON.stringify(J(`carryRoutes()`)));
check('the runs have the ids a saved game names, in the same order', JSON.stringify(J(`MISSIONS.filter(m => m.carry).map(m => m.id)`)) === JSON.stringify(WAS_IDS));
check('they sit where they sat in MISSIONS: after the four first calls, before the site calls', (() => { const o = J(`MISSIONS.map(m => m.carry ? 'run' : m.id)`).join(); return /^rescue,escort,patrol,bounty,(run,){14}/.test(o + ',') && !/run,.*[a-z]+-[a-z]+,.*run/.test(o); })(), J(`MISSIONS.map(m => m.id)`).join(' '));
check('every dock posts what it posted', JSON.stringify(boards(g)) === JSON.stringify(WAS_BOARDS), JSON.stringify(boards(g)));
check('a courier still pays 200 + 90 a light year, a haul 20 cr a unit per 5 ly', J(`(() => { const c = MISSIONS.find(m => m.id === 'courier-halcyon-kestrel'), h = MISSIONS.find(m => m.id === 'haul-halcyon-brass'); return c.reward === Math.round(200 + 90 * c.ly) && h.reward === haulPay(h.ly, shipStat('hold')) && c.from === 'halcyon-station' && c.to === 'kestrel-outpost'; })()`));
check('asking again changes nothing (carrySync is quiet when the routes are the same)', J(`[carrySync(), carrySync(), MISSIONS.length]`).join() === 'false,false,20');

console.log('2. the schema');
{
  const C = g.run('ContentLib');
  const st = (id, runs, extra = '') => ({ path: `content/stations/${id}.md`, text: `---\ntype: station\nname: ${id}\nsystem: halcyon\n${extra}---\n\n## Runs\n| kind | to |\n|---|---|\n${runs.map(r => `| ${r[0]} | ${r[1]} |\n`).join('')}` });
  const KNOWN = { known: (type, id) => type === 'system' && id === 'halcyon' };
  const ok = C.loadAll([st('a-dock', [['courier', 'b-dock'], ['haul', 'b-dock']]), st('b-dock', [['courier', 'a-dock']])], KNOWN);
  check('a Runs table is read: kind and to, row by row', ok.errors.length === 0 && JSON.stringify(ok.entries.find(e => e.id === 'a-dock').data.runs) === JSON.stringify([{ kind: 'courier', to: 'b-dock' }, { kind: 'haul', to: 'b-dock' }]), JSON.stringify(ok.errors).slice(0, 300));
  const said = files => C.loadAll(files, KNOWN).errors.map(e => e.message || String(e)).join(' | ');
  check('a run to the station itself is refused', /goes nowhere/.test(said([st('a-dock', [['courier', 'a-dock']])])), said([st('a-dock', [['courier', 'a-dock']])]));
  check('a run to a dock no file has is refused, and the message names the file to write', /names a station no file has \(stations\/zz-dock\.md\)/.test(said([st('a-dock', [['haul', 'zz-dock']])])));
  check('the same run twice is refused', /listed twice/.test(said([st('a-dock', [['courier', 'b-dock'], ['courier', 'b-dock']]), st('b-dock', [])])));
  check('a kind that is not courier or haul is refused', said([st('a-dock', [['taxi', 'b-dock']]), st('b-dock', [])]).length > 0);
  check('the five shipped station files that post runs each have a Runs table, the Roost has none, and each dock row carries its table', J(`CONTENT.entries.filter(e => e.type === 'station').map(e => e.id + ':' + (Array.isArray(e.data.runs) ? e.data.runs.length : 0)).sort()`).join() === 'brass-smelter:2,ember-foundry:2,halcyon-station:3,kestrel-outpost:3,meridian-exchange:4,roost-dock:0'
    && J(`['halcyon-station', 'roost-dock'].map(id => JSON.stringify(fleetStation(id).body.dock.runs || null))`).join(' ') === '[{"kind":"courier","to":"kestrel-outpost"},{"kind":"courier","to":"brass-smelter"},{"kind":"haul","to":"brass-smelter"}] null');
}

console.log('3. a new dock posts runs to its neighbours');
{
  const C = g.run('ContentLib');
  const sol = '---\ntype: system\nname: Sol Reach\nkind: outpost\nly: [23, 25]\nsize: 36000\ndanger: 1\ntraffic: 1\nseed: 77\nstarType: G\nstarX: 18000\nstarY: 18000\n---\nA new place.\n\n## Bodies\n| id | type | name | x | y | art |\n| --- | --- | --- | --- | --- | --- |\n| sol-dock | station |  | 9000 | 21000 | outpost |\n';
  const dock = '---\ntype: station\nname: Sol Dock\nsystem: sol\nfuel: 6\n---\nA dock that was not in the game.\n\n## Runs\n| kind | to |\n|---|---|\n| courier | halcyon-station |\n| haul | halcyon-station |\n| courier | kestrel-outpost |\n';
  const made = C.loadAll([{ path: 'content/systems/sol.md', text: sol }, { path: 'content/stations/sol-dock.md', text: dock }], { known: (type, id) => type === 'station' && DOCKS.includes(id) });
  check('the two files are valid', made.errors.length === 0 && made.entries.length === 2, JSON.stringify(made.errors).slice(0, 400));
  // Halcyon posts one back: its own file gets one more row
  const halcyon = text.replace('{"kind":"haul","to":"brass-smelter"}]', '{"kind":"haul","to":"brass-smelter"},{"kind":"courier","to":"sol-dock"}]');
  check('(the test found Halcyon\'s Runs in the built content)', halcyon !== text);
  const g2 = nodeGame({ replace: { 'content.generated.js': halcyon.replace('  entries: [\n', '  entries: [\n' + made.entries.map(e => '  ' + JSON.stringify(e)).join(',\n') + ',\n') } });
  const J2 = e => Jin(g2, e);
  check('the new system and its dock are in the game', J2(`!!SYSTEMS.sol && (fleetStation('sol-dock') || {}).system`) === 'sol', g2.errors.join(' | '));
  const board = J2(`missionsOffered('sol-dock').map(m => [m.id, m.kind, m.from, m.to, m.where])`);
  check('its board posts its three runs, though its file has no `missions` list', JSON.stringify(board.map(r => r[0])) === JSON.stringify(['courier-sol-halcyon', 'haul-sol-halcyon', 'courier-sol-kestrel']) && board.every(r => r[2] === 'sol-dock'), JSON.stringify(board));
  const pay = J2(`(() => { const c = MISSIONS.find(m => m.id === 'courier-sol-halcyon'); return [c.reward, Math.round(200 + 90 * c.ly), Math.round(c.ly * 100) / 100, Math.round(fleetLy('sol-dock', 'halcyon-station') * 100) / 100, c.where, c.system]; })()`);
  check('the courier pays the usual sum for the distance, and says where it goes', pay[0] === pay[1] && pay[2] === pay[3] && pay[2] > 0 && pay[4] === 'Halcyon Station, Halcyon' && pay[5] === 'halcyon', JSON.stringify(pay));
  const b2 = boards(g2), wantHalcyon = WAS_BOARDS['halcyon-station'].slice(0, 6).concat(['courier-halcyon-sol', 'survey-hollow']);
  check('Halcyon posts the run back, with its other runs', JSON.stringify(b2['halcyon-station']) === JSON.stringify(wantHalcyon), JSON.stringify(b2['halcyon-station']));
  check('the other five boards are as they were', DOCKS.filter(d => d !== 'halcyon-station').every(d => JSON.stringify(b2[d]) === JSON.stringify(WAS_BOARDS[d])));
  check('the new runs can be taken and are found again by id (a saved game)', J2(`(() => { pickMission('haul-sol-halcyon'); G.mission = 'accepted'; const m = missionDef(); const r = [m && m.id, m && m.carry, callGoal(m).station]; abandonMission(); return r; })()`).join() === 'haul-sol-halcyon,true,halcyon-station');
  check('no errors in that game', g2.errors.length === 0, g2.errors.join(' | '));

  console.log('4. a run comes and goes with its file');
  const r = J2(`(() => {
    const keep = MISSIONS.find(m => m.id === 'courier-halcyon-kestrel'); keep.title = 'Laid over by a file';
    const dock = fleetStation('sol-dock').body.dock, was = dock.runs.slice(), out = {}; // what worldSync does when a pack's file changes: the dock row gets the new table
    dock.runs = was.filter(x => x.kind !== 'haul');
    out.changed = carrySync(); out.gone = !MISSIONS.some(m => m.id === 'haul-sol-halcyon'); out.rest = missionsOffered('sol-dock').map(m => m.id);
    out.sameObject = MISSIONS.find(m => m.id === 'courier-halcyon-kestrel') === keep && keep.title === 'Laid over by a file';
    // the run you are flying is never taken from under you
    pickMission('courier-sol-kestrel'); G.mission = 'accepted';
    dock.runs = [];
    carrySync(); out.flown = !!missionDef() && missionDef().id === 'courier-sol-kestrel'; out.others = MISSIONS.filter(m => m.carry && m.from === 'sol-dock').map(m => m.id);
    abandonMission(); CARRY_KEY = null; carrySync(); out.after = MISSIONS.filter(m => m.carry && m.from === 'sol-dock').length;
    return out; })()`);
  check('a row taken out of the table: that run is gone from the game and the board, the others stay', r.changed === true && r.gone && JSON.stringify(r.rest) === JSON.stringify(['courier-sol-halcyon', 'courier-sol-kestrel']), JSON.stringify(r));
  check('a run that stays keeps its object, so what a mission file laid over it is still there', r.sameObject === true);
  check('the run being flown stays until it is over, even with its table emptied; the others go at once', r.flown === true && JSON.stringify(r.others) === JSON.stringify(['courier-sol-kestrel']) && r.after === 0, JSON.stringify(r));
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nROUTES FROM FILES FAIL (${failed} of ${n})` : `\nROUTES FROM FILES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
