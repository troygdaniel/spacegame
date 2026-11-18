// smoke: a job shows the way: every kind of call has a next step in plain words and a destination the navigation panel can show (plain Node, no Chrome)
// Card space-game-job-shows-the-way. Troy took a courier run at Halcyon and could not find where to go: the place was a star system away and
// nothing on the screen said so in a way he could follow. For every call the game has, in another system and in its own:
//   the next step is one plain sentence (missionStep, src/missions.js): the jump first, then what to do there
//   the navigation panel has a row for it (navpanelMission + navpanelRows, src/navpanel.js): the star to jump to, or the place itself
//   Enter on the job's star opens the galaxy map there; in the right system the row is the dock or the site, and the dock takes the Dock order
//   the checklist's NEXT line is the same sentence, and the where line names the star system
// Run: node tests/jobway.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  toast = () => {}; sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  Phaser = { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
  // the Space scene as the mission code reads it, in the system you are in: the ship, the station and planet marks, the call's own things
  function __scene() {
    const st = sysBody('station'), pl = sysBody('planet'), at = b => b ? { x: b.x, y: b.y } : { x: 0, y: 0, nowhere: true };
    const wanted = { wanted: true, active: true, x: 900, y: 900 };
    return { ship: { x: 100, y: 100 }, station: at(st), planet: at(pl), canLand: true, cr: { target: null },
      mx: { freighter: { active: true, x: 500, y: 500 }, boss: { active: true, x: 700, y: 700 } }, enemies: { getChildren: () => [wanted] } };
  }
  function __take(id, system) { G.missionId = id; G.mission = 'accepted'; G.missionProgress = 0; G.system = system; G.deep = null; }
  // every charted star, so the panel has the jump rows the galaxy has
  G.known = Object.keys(SYSTEMS);
  // the explorer (range 18): every call has a way there, so the loops below see the plotted jumps; the ship that cannot is tests/routeplot.mjs
  G.fleet = [newShip('pathfinder')]; G.active = 0;
`);

const KINDS = ['rescue', 'escort', 'patrol', 'bounty', 'courier', 'haul', 'salvage', 'survey'];
const calls = J(`MISSIONS.map(m => ({ id: m.id, kind: missionKind(m), goal: callGoal(m).system, to: m.to || null, site: m.site || null, where: m.where }))`);
const systems = J('Object.keys(SYSTEMS)');

console.log('every kind of call is here');
check('the eight kinds: rescue, escort, patrol, bounty, courier, haul, salvage, survey', KINDS.every(k => calls.some(c => c.kind === k)) && calls.every(c => KINDS.includes(c.kind)), [...new Set(calls.map(c => c.kind))].join());
check('every call\'s system is one the game can fly in', calls.every(c => systems.includes(c.goal)), calls.filter(c => !systems.includes(c.goal)).map(c => c.id).join());

console.log('from another system: the jump first, and a row for the star');
for (const c of calls) {
  const from = systems.find(s => s !== c.goal);
  g.run(`__take('${c.id}', '${from}')`);
  const r = J(`(() => { const s = __scene(), st = missionStep(), m = navpanelMission(s), rows = navpanelRows([], navpanelJumps(s), m), row = rows.find(r => r.mission);
    return { step: st, m, row: row && { kind: row.kind, id: row.id, group: row.group, first: rows[0] === row }, hint: row ? navpanelHint(row, false, '') : '', job: navpanelJob(), next: hudMission(s, 'Space').next, far: !!missionFar() }; })()`);
  const name = J(`callSysName('${c.goal}')`), hop = r.step && r.step.hop, hopName = hop ? J(`callSysName('${hop}')`) : '';
  const start = r.step && (r.step.hops === 1 ? 'Jump to ' + name + ': press G, then ' : 'Jump 1 of ' + r.step.hops + ': ' + hopName + ', ');
  check(`${c.id}: "${r.step && r.step.text}"`, !!r.step && r.step.kind === 'jump' && r.step.system === c.goal && !!hop && r.step.text.startsWith(start) && !/undefined|null|\n/.test(r.step.text), JSON.stringify(r.step));
  check(`${c.id}: the panel's first row is the next jump (${hopName}), and Enter opens the galaxy map there`, !!r.row && r.row.kind === 'jump' && r.row.id === hop && r.row.group === 'mission' && r.row.first && r.hint === 'Enter  open the galaxy map at ' + hopName, JSON.stringify(r.row) + ' ' + r.hint);
  check(`${c.id}: the job line and the checklist say the same sentence`, r.job === 'JOB  ' + r.step.text && r.next === r.step.text, r.job + ' | ' + r.next);
}

console.log('in the right system: the place itself');
for (const c of calls) {
  g.run(`__take('${c.id}', '${c.goal}')`);
  const r = J(`(() => { const s = __scene(), st = missionStep(), m = navpanelMission(s);
    const bodies = sysBodies().map(b => ({ id: b.id, name: b.name || b.id, type: b.type, x: b.x, y: b.y, r: b.r || 0, dist: Math.hypot(b.x - s.ship.x, b.y - s.ship.y) }));
    const rows = navpanelRows(bodies, [], m), row = rows.find(r => r.mission);
    return { step: st, m, row: row && { kind: row.kind, id: row.id, name: row.name, type: row.type, first: rows[0] === row, order: navpanelOrder(s, row) } }; })()`);
  check(`${c.id}: "${r.step && r.step.text}"`, !!r.step && r.step.kind !== 'jump' && r.step.system === null && r.step.text.length > 8 && !/^Jump to|undefined|null|\n/.test(r.step.text), JSON.stringify(r.step));
  check(`${c.id}: the panel's first row is a place with a position (${r.row && r.row.name})`, !!r.m && Number.isFinite(r.m.x) && Number.isFinite(r.m.y) && !!r.m.name && !!r.row && r.row.kind === 'body' && r.row.first, JSON.stringify(r.m));
  if (c.to) check(`${c.id}: that row is ${c.to}, and Enter twice docks there (the Dock order)`, r.row.id === c.to && r.row.order === 'dock' && r.step.kind === 'dock', JSON.stringify(r.row));
  if (c.site) check(`${c.id}: that row is the site ${c.site}`, r.row.id === c.site && r.step.kind === 'site', JSON.stringify(r.row));
}

console.log('the courier Troy took: Halcyon to Kestrel Outpost');
{
  g.run(`__take('courier-halcyon-kestrel', 'halcyon')`);
  check('at Halcyon: Jump to Kestrel: press G, then dock at Kestrel Outpost', J('missionStep().text') === 'Jump to Kestrel: press G, then dock at Kestrel Outpost');
  check('the star the galaxy map opens on is Kestrel', J('missionGoalSystem()') === 'kestrel');
  g.run(`G.system = 'kestrel'`);
  check('in Kestrel: Dock at Kestrel Outpost', J('missionStep().text') === 'Dock at Kestrel Outpost' && J('missionStep().kind') === 'dock');
  g.run(`G.mission = 'none'; G.missionId = null`);
  check('with no call there is no step and no job line', J('missionStep()') === null && J('navpanelJob()') === '');
  g.run(`__take('rescue', 'halcyon'); G.mission = 'rescued'`);
  check('the colonist aboard: dock at Halcyon Station', J('missionStep().text') === 'Dock at Halcyon Station');
  g.run(`G.system = 'kestrel'`);
  check('and from another system: the jump home first', J('missionStep().text') === 'Jump to Halcyon: press G, then dock at Halcyon Station');
}

console.log('the where line names the star system');
{
  const where = J(`MISSIONS.map(m => [m.id, missionWhere(m), callSysName(callGoal(m).system)])`);
  check('every call\'s where line has its system in it', where.every(([, w, sys]) => w.toLowerCase().includes(sys.toLowerCase())), where.filter(([, w, sys]) => !w.toLowerCase().includes(sys.toLowerCase())).map(x => x.join(': ')).join('; '));
  check('the rescue reads Kepler-4b, Halcyon; a courier is not said twice', J(`missionWhere(MISSIONS.find(m => m.id === 'rescue'))`) === 'Kepler-4b, Halcyon' && J(`missionWhere(MISSIONS.find(m => m.id === 'courier-halcyon-kestrel'))`) === 'Kestrel Outpost, Kestrel');
}

console.log('the job line has room');
{
  g.run(`G.system = 'halcyon'`);
  const longest = J(`MISSIONS.map(m => { G.missionId = m.id; G.mission = 'accepted'; G.system = Object.keys(SYSTEMS).find(s => s !== callGoal(m).system); return navpanelJob(); }).sort((a, b) => b.length - a.length)[0]`);
  const perLine = Math.floor((J('NAVPANEL.w') - 20) / 7.3); // 12 px monospace
  check(`the longest job line fits the three lines it has (${longest.length} letters, ${perLine} a line)`, longest.length <= perLine * 3 - 24, longest);
  check('the list gives up rows for the job line, never fewer than its least', J('navpanelFit(300, NAVPANEL.job)') < J('navpanelFit(300, 0)') && J('navpanelFit(560, NAVPANEL.job)') === J('NAVPANEL.min'));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
