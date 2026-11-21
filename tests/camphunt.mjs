// smoke: the fixes of the overnight bug hunt on Levels 2 and 3 (card space-game-night-hunt-l2-l3, docs/night/hunt-l2-l3.md), each pinned (plain Node, no Chrome)
// Run: node tests/camphunt.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// ---- 1. the Fast burn to a mission's place does not decloak an anomaly (2.1: the wreck lay on the route) ----
// A mission that starts away from its place is flown there on the autopilot, the wing still in the bay: the burn ends at the edge of the arrival circle (CAMP.mission.arrive) and the
// cruiser runs a little on. A cloaked cache on that line was decloaked with the wing aboard, its guards on the carrier in the first seconds, and the find bonus (+250) came free.
// Levels 1 is not here: its missions are being rewritten (cards space-game-l1-*).
const routes = [];
for (const lv of [2, 3]) for (let m = 0; m < J(`campMissions(${lv}).length`); m++) routes.push(J(`(() => { const C = campNew(${lv}, [], { seed: 1, mission: ${m} }), p = campMissionPlace(C), c = C.carrier; let ax = c.x, ay = c.y;
  if (C.arrivedAt == null && p) { const d = Math.hypot(p.x - c.x, p.y - c.y), k = (d - CAMP.mission.arrive) / d; ax = c.x + (p.x - c.x) * k; ay = c.y + (p.y - c.y) * k; }
  return { lv: ${lv}, m: ${m} + 1, rows: C.anoms.map(a => { const vx = ax - c.x, vy = ay - c.y, L2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((a.x - c.x) * vx + (a.y - c.y) * vy) / L2));
    return [a.id, Math.round(Math.hypot(a.x - (c.x + u * vx), a.y - (c.y + u * vy))), Math.round(Math.hypot(a.x - ax, a.y - ay))]; }) }; })()`));
const visit = J('CAMP.anomaly.visit'), need = visit + 400; // the cruiser runs on past the arrival point and turns: 400 px of margin on top of the visit circle
check('six missions of levels 2 and 3 were checked, three anomalies each', routes.length === 6 && routes.every(r => r.rows.length === 3));
const near = routes.map(r => ({ at: r.lv + '.' + r.m, rows: r.rows.filter(x => x[1] < need || x[2] < need) })).filter(r => r.rows.length);
check('no anomaly lies within ' + need + ' px of the route from a mission\'s start to the edge of its arrival circle, nor of the arrival point (the burn must not decloak one: it was the wreck in mission 2.1, 293 px from the point)', near.length === 0, JSON.stringify(near));
check('the wreck is still the one to find in mission 2.1 (its bonus), and the player still notices it on the way: inside the sense range of the route', J(`campMissionRow(2, 0).bonus.some(b => b.anomaly === 'wreck')`) && routes[0].rows.find(x => x[0] === 'wreck')[1] < J('CAMP.anomaly.sense'));

// ---- 2. the map and the briefing give one time for the trip to a mission's place ----
// The briefing counts the flight to the edge of the arrival circle ("Route 579 km: 15 s regular, 7 s on Fast"), because the mission begins there and the autopilot lets go;
// the Tab map counted to the middle of the place ("568 km, about 30 s") and its Fly, Fast and Scout buttons the same. campNavFlight is the one rule for the map now.
g.run(`window.C = campNew(2, ['shield'], { seed: 1, mission: 0 }); window.row = campNavRows(C).find(r => r.id === 'place:alpha-cen-b'); window.T = campTravel(2, 0);`);
check('mission 2.1 starts away from its place: the map has the place as a row, and the briefing a trip of about 7 s on Fast', J('!!row && !!T && T.secs >= 5 && T.secs <= 9 && C.arrivedAt === null'), J('[T && T.secs, row && row.dist]'));
check('the map\'s Fast time to the place is the briefing\'s (within a second), its regular time too: not the double it was (30 s against 15 s)',
  J('Math.abs(campNavEta(C, campNavFlight(C, row, row.dist), true) - T.secs) <= 1') && J('Math.abs(campNavEta(C, campNavFlight(C, row, row.dist), false) - campNavEta(null, T.dist, false)) <= 1'),
  J('[campNavEta(C, campNavFlight(C, row, row.dist), true), T.secs, campNavEta(C, campNavFlight(C, row, row.dist), false), campNavEta(null, T.dist, false)]'));
check('a row that is not the mission\'s place is flown to where it is (the distance is unchanged), and so is the place once the cruiser has arrived', J('campNavFlight(C, { id: "cache:0" }, 4000) === 4000 && campNavFlight(C, { id: "goal", of: "place:proxima" }, 4000) === 4000')
  && (g.run('C.arrivedAt = 0'), J('campNavFlight(C, row, 4000) === 4000')));
check('and the goal row (which stands for the place: its `of` is the place\'s id) is shortened the same way, to nothing when the edge of the circle is already reached',
  (g.run('C.arrivedAt = null'), J('campNavFlight(C, { id: "goal", of: "place:alpha-cen-b" }, 5000) === 2000 && campNavFlight(C, row, 2500) === 0')));

process.exit(failed ? 1 : (console.log('\nHUNT FIXES PASS'), 0));
