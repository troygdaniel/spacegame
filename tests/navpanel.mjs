// smoke: navigation panel: the rows in groups, nearest first, the mission's row, the jumps in reach, the window of lines, what Enter would do (plain Node, no Chrome)
// The navigation panel (card space-game-nav-panel, src/navpanel.js): the list behind it, with no scene. Distances and light years are read from the
// game's own data and compared with each other, never with a number written here (the systems are being spread out; the test must not care).
// Run: node tests/navpanel.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const ORDER = J('NAVPANEL.groups.map(g => g[0])');
// a ship parked beside the first station of the system, everything charted, a full tank
const SHIP = `(() => { const st = sysBodies('station')[0] || sysBodies()[0]; return { ship: { x: st.x + 600, y: st.y + 200 } }; })()`;
g.run(`G.system = 'halcyon'; G.known = galaxySystems().map(s => s.id); G.mission = 'none'; G.missionId = null; activeShip().fuel = shipStat('tank');`);
const rowsOf = (mission = 'null') => J(`(() => { const s = ${SHIP}; return navpanelRows(cruiseKnown(s), navpanelJumps(s), ${mission}); })()`);

console.log('the rows: groups in order, nearest first');
const rows = rowsOf(), known = J(`cruiseKnown(${SHIP})`), jumps = J(`navpanelJumps(${SHIP})`);
check('every body you know of has a row, and every jump in reach', rows.filter(r => r.kind === 'body').length === known.length && rows.filter(r => r.kind === 'jump').length === jumps.length && known.length > 3, known.length + ' bodies, ' + jumps.length + ' jumps, ' + rows.length + ' rows');
check('the groups come in the panel\'s order', rows.every((r, i) => !i || ORDER.indexOf(rows[i - 1].group) <= ORDER.indexOf(r.group)), rows.map(r => r.group).join(' '));
check('stations and outposts are STATIONS, the sun, planets and belts their own group, the gate with the jumps', rows.every(r => r.kind !== 'body' || r.group === { star: 'bodies', station: 'stations', scenery: 'stations', planet: 'bodies', belt: 'bodies', poi: 'signals', gate: 'gates' }[r.type]) && rows.some(r => r.type === 'star'));
check('inside a group the nearest is first', rows.every((r, i) => !i || rows[i - 1].group !== r.group || rows[i - 1].kind !== r.kind || (r.kind === 'jump' ? rows[i - 1].ly <= r.ly : rows[i - 1].dist <= r.dist)));
check('in the last group the gate comes before the jumps', (l => l.every((r, i) => !i || !(l[i - 1].kind === 'jump' && r.kind === 'body')))(rows.filter(r => r.group === 'gates')));
check('with no call open there is no MISSION group', !rows.some(r => r.group === 'mission'));
check('a body\'s distance is the one cruise works with', rows.filter(r => r.kind === 'body').every(r => { const k = known.find(b => b.id === r.id); return k && k.dist === r.dist; }));

console.log('the jumps');
check('there is somewhere to jump to from Halcyon with a full tank', jumps.some(j => j.ok), JSON.stringify(jumps).slice(0, 300));
check('the system you are in is not a jump, and nothing out of range is listed', jumps.every(j => j.id !== 'halcyon' && j.why !== 'range'));
check('every jump says how far in light years and what fuel it burns (the galaxy map\'s own numbers)', J(`(() => { const here = galaxyFind(G.system); return navpanelJumps(${SHIP}).every(j => { const q = galaxyJump(here, galaxyFind(j.id)); return q.ly === j.ly && q.cost === j.cost && q.ok === j.ok; }); })()`));
check('a star you have not charted is not offered', J(`(() => { const all = navpanelJumps(${SHIP}), keep = G.known; G.known = ['halcyon']; const none = navpanelJumps(${SHIP}); G.known = keep; return none.length === 0 && all.length > 0; })()`));
check('an empty tank greys the jumps out, with the reason', J(`(() => { const rec = activeShip(), f = rec.fuel; rec.fuel = 0; const l = navpanelRows([], navpanelJumps(${SHIP}), null); rec.fuel = f; return l.length > 0 && l.every(r => !r.ok && r.why === 'fuel' && navpanelHow(r) === 'no' && /fuel/.test(navpanelHint(r, false))); })()`));
check('in deep space after a pull-out there are no jumps', J(`(() => { G.deep = { from: 'halcyon' }; let l; try { l = navpanelJumps({ ship: { x: 0, y: 0 } }); } finally { G.deep = null; } return l.length; })()`) === 0);

console.log('the mission row');
const planet = known.find(b => b.type === 'planet'), far = jumps.find(j => j.ok) || jumps[0];
const mBody = rowsOf(`{ name: ${JSON.stringify(planet.name)}, x: ${planet.x + 10}, y: ${planet.y - 5}, dist: 1 }`);
check('a goal that is a body here: that body\'s row moves to MISSION, first in the list, and is not listed twice', mBody[0].group === 'mission' && mBody[0].id === planet.id && mBody[0].mission && mBody.filter(r => r.id === planet.id).length === 1 && mBody.length === rows.length, JSON.stringify(mBody[0]));
const mFree = rowsOf(`{ name: 'The MULE', x: 123456, y: 654321, dist: 4200 }`);
check('a goal that is no body (a freighter, a pirate) gets a row of its own you can fly to', mFree[0].group === 'mission' && mFree[0].id === 'mission' && mFree[0].kind === 'body' && mFree.length === rows.length + 1);
const mJump = rowsOf(`{ system: '${far.id}', name: 'Somewhere, ${far.name}', ly: ${far.ly} }`);
check('a goal in a system in reach: the jump there is the mission\'s row', mJump[0].group === 'mission' && mJump[0].kind === 'jump' && mJump[0].id === far.id && mJump.filter(r => r.id === far.id).length === 1);
const mFar = rowsOf(`{ system: 'nowhere-yet', name: 'Far Dock, Nowhere', ly: 99 }`);
check('a goal in a system out of reach: a greyed row that sends you to the galaxy map', mFar[0].group === 'mission' && !mFar[0].ok && J(`navpanelHow(${JSON.stringify(mFar[0])})`) === 'no' && /galaxy map/.test(J(`navpanelHint(${JSON.stringify(mFar[0])}, false)`)));

console.log('the lines: headings, and a window that follows the chosen row');
const lines = (list, sel, max) => J(`navpanelLines(${JSON.stringify(list)}, ${sel}, ${max})`);
const all = lines(rows, 0, 99), heads = all.lines.filter(l => l.head).map(l => l.head);
check('a heading before the first row of each group, each once', heads.length === new Set(rows.map(r => r.group)).size && new Set(heads).size === heads.length && all.lines[0].head, heads.join(' | '));
check('every row is there, in order, with its place in the list', (l => l.length === rows.length && l.every((x, i) => x.i === i && x.row.id === rows[i].id))(all.lines.filter(l => l.row)) && all.above === 0 && all.below === 0);
const many = Array.from({ length: 30 }, (_, i) => ({ kind: 'body', group: i < 10 ? 'stations' : i < 20 ? 'bodies' : 'gates', id: 'b' + i, name: 'B' + i, type: 'station', dist: i }));
const ok = [0, 1, 7, 9, 10, 15, 22, 29].every(sel => { const v = lines(many, sel, 13); return v.lines.length === 13 && v.lines.some(l => l.row && l.i === sel) && v.above + v.below + v.lines.filter(l => l.row).length === 30; });
check('30 rows in a 13 line window: always 13 lines, the chosen row always in view, the rest counted above and below', ok);
check('at the top nothing is above, at the bottom nothing below', lines(many, 0, 13).above === 0 && lines(many, 29, 13).below === 0 && lines(many, 0, 13).below > 0);
check('no rows, no lines', lines([], 0, 13).lines.length === 0);

console.log('where it sits: under the HUD\'s left side, and only as many lines as fit');
const P = J('({ x: NAVPANEL.x, y: NAVPANEL.y, max: NAVPANEL.max, min: NAVPANEL.min, bottom: NAVPANEL.bottom, row: NAVPANEL.row })');
check('with nothing above it, it starts at its own top and shows all its lines', J('navpanelTop([])') === P.y && J(`navpanelFit(${P.y})`) === P.max);
check('the mission checklist open (a tall zone from the top left): the panel starts under it', J(`navpanelTop([{ x0: 0, y0: 0, x1: 360, y1: 330 }])`) === 336);
check('a toast or a panel elsewhere on the screen does not move it', J(`navpanelTop([{ x0: 290, y0: 80, x1: 990, y1: 400 }, { x0: 1050, y0: 0, x1: 1280, y1: 250 }, { x0: 0, y0: 500, x1: 400, y1: 700 }])`) === P.y);
check('pushed down, it shows fewer lines and never passes its bottom', [200, 336, 420].every(top => { const f = J(`navpanelFit(${top})`); return f <= P.max && (top + 90 + f * P.row <= P.bottom || f === P.min); }) && J('navpanelFit(336)') < P.max);
check('it never shows fewer than its least', J('navpanelFit(9999)') === P.min);

console.log('what Enter would do');
const near = { kind: 'body', id: 'x', name: 'X', type: 'station', r: 0, dist: 100 }, mid = Object.assign({}, near, { dist: 2000 }), long = Object.assign({}, near, { dist: 2000 + J('AUTO.cruiseLeg') });
check('a body you are at: nothing to do', J(`navpanelHow(${JSON.stringify(near)})`) === 'here' && /there/.test(J(`navpanelHint(${JSON.stringify(near)}, true)`)));
check('a short leg is the autopilot\'s, a long one cruises in the middle (the autopilot\'s own limit)', J(`navpanelHow(${JSON.stringify(mid)})`) === 'autopilot' && J(`navpanelHow(${JSON.stringify(long)})`) === 'cruise');
check('a place goes on the FIRST Enter (card space-game-hunt-pirates), picked or not; a jump keeps its two steps', /go: autopilot$/.test(J(`navpanelHint(${JSON.stringify(mid)}, false)`)) && /go: autopilot$/.test(J(`navpanelHint(${JSON.stringify(mid)}, true)`)) && /cruise/.test(J(`navpanelHint(${JSON.stringify(long)}, false)`)) && /set as destination/.test(J(`navpanelHint(${JSON.stringify({ kind: 'jump', ok: true, cost: 3, ly: 4 })}, false)`)));
check('a jump says the fuel it burns', /jump/.test(J(`navpanelHint(${JSON.stringify({ kind: 'jump', ok: true, cost: 3.25, ly: 4 })}, true)`)) && /3\.3 fuel|3\.2 fuel/.test(J(`navpanelHint(${JSON.stringify({ kind: 'jump', ok: true, cost: 3.25, ly: 4 })}, true)`)));
check('distances read as km for a body and ly for a jump', / km$/.test(J(`navpanelDist(${JSON.stringify(mid)})`)) && J(`navpanelDist({ kind: 'jump', ly: 4.26 })`) === '4.3 ly');
check('the controls table and the help page name the panel on N', J(`CONTROLS.some(g => g.rows.some(r => r.k.includes('N') && /^Places/.test(r.t)))`) && J(`HELP.Space.some(l => /^N X   places/.test(l))`));

// a window of the list never ends on a heading with none of its rows (card space-game-wrapup-hunt-l3: level 3's map list showed "CACHES AND RELIC" and nothing under it)
{
  const rows = [{ group: 'a', name: 'goal' }].concat([1, 2, 3, 4, 5].map(i => ({ group: 'b', name: 'place' + i })), [1, 2, 3].map(i => ({ group: 'c', name: 'find' + i })));
  const G = JSON.stringify([['a', 'GOAL'], ['b', 'PLACES'], ['c', 'FINDS']]), w = max => J(`navpanelLines(${JSON.stringify(rows)}, 0, ${max}, ${G})`);
  const a9 = w(9), a10 = w(10), a8 = w(8);
  check('a window that would end on the heading of the next group (9 lines: GOAL, goal, PLACES, five places, FINDS) drops that heading: it ends on a row', a9.lines.length === 8 && !!a9.lines[a9.lines.length - 1].row && a9.lines.filter(l => l.head).length === 2, JSON.stringify(a9.lines.map(l => l.head || l.row.name)));
  check('a window that has a row under the heading keeps it (10 lines), and one that ends on a row (8) is as it was', a10.lines.length === 10 && a10.lines[8].head === 'FINDS' && a10.lines[9].row.name === 'find1' && a8.lines.length === 8 && a8.lines[7].row.name === 'place5');
  check('the count of rows below is still right when the heading is dropped (the three finds are below)', a9.below === 3, String(a9.below));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);
