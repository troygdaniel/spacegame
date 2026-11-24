// smoke: mission 1.1 is one road: no fork, no lane rows, no T key, no lane scouting hints; the route system stays in the code, dormant (plain Node, no Chrome)
// Card space-game-cut-lane-fork (Troy, 22 Nov 2026: "remove picking a lane, not feeling it"). Mission 1.1 used to fork at a fifth of the way (a short lane with the ambush, a long quiet one with a cache): the
// transport held there for the player's word, a scout could read the lanes, T took one on the Tab map. Now the transport flies the road and the ambush with the torpedo boats happens on it, at the same place
// and the same time as it did on the short lane. The route system (src/camproute.js, tests/camproute.mjs with its own fixture mission) is untouched: a mission row that says `route:` still gets a fork.
//   A  the data: 1.1's row has no route, no wave carries a lane, the ambush is a plain wave (4 skiffs, 2 torpedo boats), the briefing counts the same ships as before
//   B  the sim: no C.route, the transport never holds, nothing says "fork", the ambush comes at the same share of the road (0.52), the distress call and the leader as before
//   C  the Tab map and the words: no lane rows, no lane marks, V says the mission has no scouting, "take the long lane" is the ship's "no fork on this road"
//   D  the hints: the lane hints are gone, the others (fast, tuck, run) still come in 1.1 without a route
//   E  the words and the keys: the briefing's walkthrough and notes, the help page and the README do not mention a fork, a lane or a T
// Run: node tests/campnofork.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };

g.run(`
  window.__ev = [];
  window.__mk = seed => { window.C = campNew(1, [], { seed: seed == null ? 1 : seed, mission: 0 }); C.god = true; __ev.length = 0; return !!C; };
  window.__go = (s, fn) => { const k = Math.round(s * 30); for (let i = 0; i < k && !C.result; i++) { campStep(C, 1 / 30); __ev.push(...C.events.map(e => Object.assign({ t: C.t }, e))); C.events.length = 0; if (fn) fn(i); } };
  window.__tt = () => campConvoys(C)[0];
`);

// ---- A. the data ----
console.log('A. the data');
const row = J('(() => { const r = campMissionRow(1, 0); return { route: r.route === undefined ? "none" : r.route, lanes: (r.waves || []).filter(w => w.lane).length, waves: (r.waves || []).map(w => ({ on: w.on, ships: w.ships, ambush: !!w.ambush, say: w.say, lane: w.lane })) }; })()');
check('A  1.1\'s row has no route', row.route === 'none' || row.route === null, JSON.stringify(row.route));
check('A  no wave of the row belongs to a lane', row.lanes === 0, JSON.stringify(row.waves));
const amb = row.waves.find(w => w.ambush);
check('A  the ambush is a plain wave of the row: 4 skiffs and 2 torpedo boats at 0.52 of the road, with its own line', !!amb && amb.ships.skiff === 4 && amb.ships.tboat === 2 && amb.on.lane === 0.52 && amb.say === 'camp.say.rimambush', JSON.stringify(amb));
check('A  the row has the miner\'s skiffs and the ambush, in that order, and after them the group that goes for the transport after the call (card l1-miner-choice: it had two waves) (the long lane\'s two raids went with the lane)', row.waves.length === 3 && row.waves[0].on.lane === 0.31 && row.waves[1].ambush && row.waves[2].on.lane === 0.34, JSON.stringify(row.waves));
const en = J('campBriefEnemies(1, 0)'), sk = en.list.find(e => e.kind === 'skiff'), tb = en.list.find(e => e.kind === 'tboat');
check('A  the briefing counts what 1.1 sends: 10 skiffs and 5 torpedo boats (8 and 2 before card l1-miner-choice) (as it did for the default lane)', sk && sk.n === 10 && tb && tb.n === 5, en.line);
check('A  the route system is still in the code: a row with a route still gets its lanes (campRouteRow)', J('(() => { const r = campRouteRow({ route: { lanes: [{ id: "a", hides: { waves: [{ ships: { skiff: 1 } }] } }] }, waves: [] }); return r.waves.length === 1 && r.waves[0].lane === "a"; })()') === true);

// ---- B. the sim ----
console.log('B. the sim');
g.run('__mk(1)');
check('B  C.route is null (the road has no fork)', J('C.route') === null);
g.run(`window.__probe = { held: 0, moved: 0, leftAt: null, ambushAt: null, ambushShare: null, ambushShips: null, distressAt: null, leaderAt: null };`);
g.run(`__go(240, () => { const P = __probe, t = __tt(); if (t && P.leftAt == null) P.leftAt = C.t;
  if (t && t.hp > 0) { t.hp = t.maxHp || t.hp; const sp = Math.hypot(t.vx || 0, t.vy || 0); if (sp < 1) P.held++; else P.moved++; } // (the transport is kept whole: the question is the road, not the fight)
  if (C.waves[1] && C.waves[1].started && P.ambushAt == null) { P.ambushAt = C.t; P.ambushShare = campLane(C, 't1'); const k = {}; C.ships.filter(u => u.team === 'alien' && u.hp > 0).forEach(u => { k[u.kind] = (k[u.kind] || 0) + 1; }); P.ambushShips = k; }
  if (C.waves[0] && C.waves[0].started && P.distressAt == null) P.distressAt = C.t;
  if (campRivalOf(C, 'leader') && P.leaderAt == null) P.leaderAt = C.t; })`);
const P = J('__probe'), evs = J('__ev');
check('B  the transport leaves at 4 s and never stands still while she is alive (no hold at a fork)', P.leftAt != null && P.leftAt <= 5000 && P.held === 0 && P.moved > 1000, JSON.stringify(P));
check('B  no event says the road forks or holds (no fork event, no lane pick, no "forks" line)', !evs.some(e => e.type === 'fork' || e.type === 'lane' || (e.type === 'say' && /^camp\.say\.(fork|forkhold|lanepick|laneauto|lanepanic|lanefound)$/.test(e.key))), JSON.stringify(evs.filter(e => e.type === 'fork' || e.type === 'lane' || (e.type === 'say' && /fork|lane/.test(e.key))).slice(0, 4)));
check('B  the ambush with the torpedo boats comes at 0.52 of the road (as on the short lane), with its line', P.ambushAt != null && P.ambushShare >= 0.52 && P.ambushShare < 0.56 && evs.some(e => e.type === 'say' && e.key === 'camp.say.rimambush'), JSON.stringify({ at: P.ambushAt, share: P.ambushShare }));
check('B  the miner\'s distress comes first (0.31 of the road), then the ambush, then the leader (0.75)', P.distressAt != null && P.distressAt < P.ambushAt && P.leaderAt != null && P.ambushAt < P.leaderAt, JSON.stringify(P));
check('B  the ambush put 4 skiffs and 2 torpedo boats into the sky (with the 2 skiffs of the distress call still about)', P.ambushShips && (P.ambushShips.skiff || 0) >= 4 && (P.ambushShips.tboat || 0) === 2, JSON.stringify(P.ambushShips));
// the road's length and the speed say when she should arrive: no waiting added
const road = J('(() => { const pl = campPlaces(1), a = pl.luna, b = pl.ceres; return Math.hypot(b.x - a.x, b.y - a.y); })()');
check('B  with no word from the player the transport does not wait: her flight is the road at her speed (54 px a second) and no more', J('(() => { const c = CAMP.levels[1].missions[0].convoys[0]; return c.speed === 54; })()') === true && road / 54 < 400, road);

// ---- C. the Tab map and the words ----
console.log('C. the Tab map and the words');
g.run('__mk(1)'); g.run('__go(8)');
const rows = J('campNavRows(C).map(r => ({ id: r.id, kind: r.kind, group: r.group }))');
check('C  the Tab map\'s list has no lane row and no "routes" group', !rows.some(r => r.kind === 'lane' || r.group === 'routes' || /^lane:/.test(r.id)), JSON.stringify(rows));
check('C  the map draws no lane mark', J('campMapMarks(C).filter(m => m.type === "lane").length') === 0);
const sc = J('(() => { const r = campOrder(C, "scout", campNavRows(C).find(x => x.kind === "convoy") || { x: 0, y: 0 }, "map"); return { ok: r.ok, say: r.say || r.code }; })()');
check('C  there is no Scout order at all any more (the scout-escort was cut: card space-game-cut-escorts), so the transport cannot be scouted either', sc.ok === false, JSON.stringify(sc));
const tk = J('(() => { const r = campOrder(C, "lane", "long", "typed"); return { ok: r.ok, say: r.say || r.code }; })()');
check('C  "take the long lane" is the ship\'s "there is no fork on this road"', tk.ok === false && /no fork/i.test(tk.say), JSON.stringify(tk));

// ---- D. the hints ----
console.log('D. the hints');
const src = read('src/campbeats.js');
check('D  the beat hints are the fast, tuck and run hints: the scout and take hints are gone', !/id: 'b-scout'/.test(src) && !/id: 'b-take'/.test(src) && /id: 'b-fast'/.test(src) && /id: 'b-tuck'/.test(src) && /id: 'b-run'/.test(src));
check('D  the hint lines "pick a lane" and "waits at the fork" are gone from the words', J('typeof UI_TEXT["camp.hint.scout"]') === 'undefined' && J('typeof UI_TEXT["camp.hint.take"]') === 'undefined');
g.run('__mk(1)'); g.run('__go(56)');
const hint = J('(() => { try { return campBeatNudge(C, {}) || ""; } catch (e) { return "THROWS " + e.message; } })()');
check('D  the fast-burn hint still comes in 1.1 with no route (the transport is far ahead on a quiet road), and names no lane', /Fast/.test(hint) && !/lane|fork|scout/i.test(hint), hint);
g.run('__mk(1)'); g.run('__go(20)');
check('D  no hint asks for a scout or a lane while the transport is on her way (nothing throws with no route)', J('(() => { try { const s = {}; const h = campBeatNudge(C, s); return !h || !/lane|fork|scout/i.test(h); } catch (e) { return false; } })()') === true);

// ---- E. the words and the keys ----
console.log('E. the words and the keys');
const walk = J('campBriefWalk(1, 0).steps'), notes = J('[0, 1, 2].map(i => campBriefNote(1, 0, i))');
check('E  the briefing\'s walkthrough of 1.1 does not mention a fork, a lane or a scout', walk.length >= 4 && !walk.some(s => /fork|\blanes?\b|scout/i.test(s)), JSON.stringify(walk));
check('E  it still says the transport, the torpedo boats, the leader and the miner\'s call', /transport/i.test(walk[0]) && walk.some(s => /torpedo/i.test(s)) && walk.some(s => /leader/i.test(s)) && walk.some(s => /miner/i.test(s)), JSON.stringify(walk));
check('E  the ship\'s notes of the briefing\'s three screens do not mention a fork, a lane or a scout, and none is empty', notes.every(n => n && !/fork|\blanes?\b|scout/i.test(n)), JSON.stringify(notes));
const ctl = read('src/data_controls.js'), readme = read('README.md'), status = read('PROJECT_STATUS.md');
check('E  the help page\'s map rows say neither that V scouts nor that T takes a lane', !/T takes a lane/.test(ctl) && !/takes a lane/.test(readme) && !/V scouts/.test(ctl) && !/V.{0,3}scouts/.test(readme), '');
check('E  the README\'s description of mission 1.1 has no fork in it', !/fork in the road/i.test(readme), '');
check('E  PROJECT_STATUS.md says there is no fork in 1.1', /no fork|one road/i.test(status), '');
check('E  the map has no T key hint left: the Tab map\'s help rows name V and X but not a take', !/\bT\b.*take|take.*\bT\b/i.test(g.run(`(CONTROLS.find(c => c.id === 'campaign') || { rows: [] }).rows.map(r => r.k.join(' ') + ' ' + r.t).join('\\n')`)));

if (failed) { console.log(`\nNO FORK: ${failed} FAILED`); process.exit(1); }
console.log('\nNO FORK: all passed');
