// smoke: the mission board only lets you take a call your ship can fly to and come back from; the rest say what would reach them (plain Node, no Chrome)
// Card space-game-bug-runs-out-of-jump-range. Five runs on the boards are 8.2 or 12.4 light years and the Wren, the ship you start in, jumps 8:
// a new player could take a job he could not do. missionReach (src/missions.js) asks jumpReach (src/jump.js): is there a chain of jumps, each
// inside the ship's range, there and back, with fuel enough between pumps. Checked here over every posted call and every ship model.
// Run: node tests/callreach.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  G.patrolsDone = 1; // the bounty is on Halcyon's board
  var __rec = (model, parts) => Object.assign(newShip(model), { parts: Object.assign({ engine: 0, shields: 0, weapons: 0, tank: 0, cargo: 0, aim: 0 }, parts || {}) });
  var __ly = (a, b) => Math.hypot(SYSTEMS[a].ly[0] - SYSTEMS[b].ly[0], SYSTEMS[a].ly[1] - SYSTEMS[b].ly[1]);
  var __goal = m => (m.carry ? callSystemOf(m.to) : (m.system || 'halcyon'));
  var __boards = () => Object.keys(SYSTEMS).flatMap(id => SYSTEMS[id].bodies.filter(b => b.type === 'station').map(b => b.id)).filter(st => missionsOffered(st).length);
`);
const models = J(`Object.keys(SHIP_MODELS)`), boards = J(`__boards()`);
check('there are boards and ships to check', boards.length >= 5 && models.length >= 6, boards.join() + ' / ' + models.join());

// ---- the five runs that started this, in the Wren ----
const wren = id => J(`(() => { const m = MISSIONS.find(m => m.id === '${id}'), st = m.carry ? m.from : 'halcyon-station'; const r = missionReach(m, st, __rec('wren')); return { ok: r.ok, why: r.why || '', line: r.line || '', need: r.need || null, ly: m.ly || null }; })()`);
for (const id of ['courier-meridian-ember', 'haul-meridian-ember', 'courier-ember-meridian', 'haul-ember-meridian', 'courier-meridian-roost']) {
  const r = wren(id);
  check(`${id}: a Wren cannot fly it, and the board says why and what would`, r.ok === false && r.why === 'range' && r.line.length > 10 && r.line.length <= 90 && !!r.need, JSON.stringify(r));
}
check('the bounty at the Roost: not in a Wren either', wren('bounty').ok === false && wren('bounty').why === 'range');
for (const id of ['rescue', 'escort', 'patrol', 'courier-halcyon-kestrel', 'courier-halcyon-brass', 'haul-halcyon-brass', 'survey-hollow']) check(`${id}: a Wren can fly it`, wren(id).ok === true, JSON.stringify(wren(id)));

// ---- what it says would reach it is true: fit that part or fly that ship, and the same call is reachable ----
const hints = J(`(() => { const out = []; __boards().forEach(st => missionsOffered(st).forEach(m => Object.keys(SHIP_MODELS).forEach(model => {
  const rec = __rec(model), r = missionReach(m, st, rec); if (r.ok) return;
  const n = r.need, with_ = !n ? null : n.kind === 'part' ? __rec(model, { [n.part]: n.tier }) : __rec(n.model);
  out.push({ id: m.id, st, model, why: r.why, line: r.line, need: n, fixed: with_ ? missionReach(m, st, with_).ok : null }); }))); return out; })()`);
check('some calls are out of reach of some ships (or this test checks nothing)', hints.length >= 5, hints.length + ' pairs');
check('every one of them names a part or a ship, and with it the call is reachable', hints.every(h => h.need && h.fixed === true), JSON.stringify(hints.filter(h => !(h.need && h.fixed === true)).slice(0, 3)));
check('the line is one short line and names the thing', hints.every(h => h.line && h.line.length <= 90 && !/undefined|null|NaN/.test(h.line) && (h.need.kind === 'part' ? /ENGINE|TANK/i.test(h.line) : h.line.includes(h.need.name))), JSON.stringify(hints.slice(0, 2).map(h => h.line)));
check('a part of the ship you fly is named before another ship, when a part is enough', J(`(() => { const m = MISSIONS.find(m => m.id === 'courier-meridian-ember'); return missionReach(m, 'meridian-exchange', __rec('wren')).need; })()`).kind === 'part', JSON.stringify(wren('courier-meridian-ember').need));
check('and a ship when no part of yours is enough (the Roost from Meridian is 12.4 ly: a Wren with the best engine jumps 11)', wren('courier-meridian-roost').need.kind === 'ship', JSON.stringify(wren('courier-meridian-roost').need));

// ---- against a sum of its own: a call one jump away is reachable exactly when the jump is inside the range and the tank holds the fuel ----
const direct = J(`(() => { const out = []; __boards().forEach(st => missionsOffered(st).forEach(m => Object.keys(SHIP_MODELS).forEach(model => {
  const rec = __rec(model), from = callSystemOf(st), to = __goal(m); if (from === to) { out.push({ id: m.id, model, same: true, ok: missionReach(m, st, rec).ok }); return; }
  const ly = __ly(from, to), range = shipStat('range', rec), tank = shipStat('tank', rec), per = shipStat('fuelPerLy', rec), pump = fuelSystemHasPump(to);
  const oneJump = ly <= range && ly * per * (pump ? 1 : 2) <= tank; // no pump there: the fuel home comes along
  out.push({ id: m.id, model, ly, oneJump, ok: missionReach(m, st, rec).ok }); }))); return out; })()`);
check('a call in the system the board is in is always reachable', direct.filter(d => d.same).every(d => d.ok) && direct.some(d => d.same));
check('a call one jump inside the range, with the fuel for it, is reachable', direct.filter(d => d.oneJump).every(d => d.ok) && direct.some(d => d.oneJump), JSON.stringify(direct.filter(d => d.oneJump && !d.ok).slice(0, 3)));
check('no ship is offered a jump longer than every chain of jumps it can make: what is reachable has a route of legs inside its range', J(`(() => __boards().every(st => missionsOffered(st).every(m => Object.keys(SHIP_MODELS).every(model => { const rec = __rec(model), r = missionReach(m, st, rec); if (!r.ok || !r.hops || !r.hops.length) return true; let here = callSystemOf(st); return r.hops.every(h => { const ok = __ly(here, h) <= shipStat('range', rec) + 1e-9; here = h; return ok; }); }))))()`));
check('the Pathfinder (18 ly) reaches every posted call', J(`__boards().every(st => missionsOffered(st).every(m => missionReach(m, st, __rec('pathfinder')).ok))`));

// ---- the pure check under it: chains of jumps and fuel between pumps ----
const R = (from, to, range, tank, per) => J(`jumpReach('${from}', '${to}', ${range}, ${tank}, ${per})`);
check('jumpReach: the same system needs no jump', R('halcyon', 'halcyon', 1, 1, 1).ok === true && R('halcyon', 'halcyon', 1, 1, 1).hops.length === 0);
check('jumpReach: Halcyon to Kestrel in one jump with range 8', R('halcyon', 'kestrel', 8, 40, 1).ok && R('halcyon', 'kestrel', 8, 40, 1).hops.join() === 'kestrel');
check('jumpReach: Halcyon to Lethe needs two jumps with range 8, by Brass Reach', R('halcyon', 'lethe', 8, 40, 1).ok && R('halcyon', 'lethe', 8, 40, 1).hops.join() === 'brass,lethe', JSON.stringify(R('halcyon', 'lethe', 8, 40, 1)));
check('jumpReach: with range 5 nothing leaves Halcyon: range', R('halcyon', 'kestrel', 5, 40, 1).ok === false && R('halcyon', 'kestrel', 5, 40, 1).why === 'range');
check('jumpReach: the range is there but the tank is not: fuel', R('halcyon', 'kestrel', 8, 5, 1).ok === false && R('halcyon', 'kestrel', 8, 5, 1).why === 'fuel');
check('jumpReach: the Hollow has no pump, so the fuel home comes along: a tank for one way is not enough, a tank for both is', R('halcyon', 'hollow', 8, 10, 1).ok === false && R('halcyon', 'hollow', 8, 10, 1).why === 'fuel' && R('halcyon', 'hollow', 8, 16, 1).ok === true, JSON.stringify([R('halcyon', 'hollow', 8, 10, 1), R('halcyon', 'hollow', 8, 16, 1)]));
check('jumpReach: a system that does not exist is out of reach, not an error', R('halcyon', 'nowhere', 8, 40, 1).ok === false);

// ---- the board ----
g.run(`G.fleet = [__rec('wren')]; G.active = 0; G.lastDock = 'meridian-exchange'; G.system = 'meridian';`);
const board = J(`missionsBoard('meridian-exchange').map(r => ({ id: r.m.id, ok: r.reach.ok, line: r.reach.line || '' }))`);
check('Meridian\'s board in a Wren: every posted call is on it, the three it cannot fly are marked', board.length === J(`missionsOffered('meridian-exchange').length`) && board.filter(r => !r.ok).map(r => r.id).sort().join() === 'courier-meridian-ember,courier-meridian-roost,haul-meridian-ember', JSON.stringify(board));
check('a marked call cannot be accepted; the others can', J(`[missionCanAccept(MISSIONS.find(m => m.id === 'courier-meridian-ember'), 'meridian-exchange'), missionCanAccept(MISSIONS.find(m => m.id === 'courier-meridian-kestrel'), 'meridian-exchange')]`).join() === 'false,true');
g.run(`G.fleet = [__rec('kite')]; G.active = 0;`);
check('the same board in a Kite (14 ly): everything can be taken', J(`missionsBoard('meridian-exchange').every(r => r.reach.ok)`));
check('what the board posts is as it was: missionsOffered still lists every posted call', J(`missionsOffered('meridian-exchange').map(m => m.id)`).join() === 'courier-meridian-kestrel,courier-meridian-ember,courier-meridian-roost,haul-meridian-ember,salvage-lethe,survey-hollow');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CALLREACH FAIL (${failed} of ${n})` : `CALLREACH PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
