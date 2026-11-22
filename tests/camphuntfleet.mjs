// smoke: the fixes of the hunt on the new Level 1 flown start to finish (card space-game-hunt-l1-fleet, docs/night/hunt-l1-fleet.md), each pinned (plain Node, no Chrome)
// Run: node tests/camphuntfleet.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// ---- 1. the map's V and T act on the row that is marked in the list, not on the place a trip is flying to ----
// 1.1's fork: the HUD says AUTOPILOT Transport convoy, the toast says "Pick a lane on the map, press T." A player who follows the transport opens the map with that trip on: its place is SET
// (the convoy) and the list starts on it. W or S moves the mark to a lane; V and T went to the set place all the same: V said "This mission has no scouting." (the convoy cannot be scouted),
// T did nothing, and the transport waited out the whole fork wait ("No word. Taking the short lane.").
g.run(`window.__mapkeys = (sel, set) => { const seen = { scout: null, take: null }, o = [campMapScout, campMapTake];
  window.campMapScout = (s, row) => { seen.scout = row.id; return true; }; window.campMapTake = (s, row) => { seen.take = row.id; return true; };
  const mp = { rows: [{ id: 'goal', kind: 'convoy', group: 'goal' }, { id: 'convoy:freighter-t1', kind: 'convoy', group: 'convoys' }, { id: 'lane:short', kind: 'lane', group: 'route' }, { id: 'lane:long', kind: 'lane', group: 'route' }], selId: sel, setId: set, flewId: set, userSel: true };
  const s = { mp, camp: {} }, r = { v: campMapKey(s, 'KeyV'), t: campMapKey(s, 'KeyT') };
  window.campMapScout = o[0]; window.campMapTake = o[1]; return Object.assign(seen, r); };`);
const a = J(`__mapkeys('lane:long', 'convoy:freighter-t1')`);
check('V with a trip set to the convoy and the mark on the long lane scouts the long lane', a.scout === 'lane:long', JSON.stringify(a));
check('T with a trip set to the convoy and the mark on the long lane takes the long lane', a.take === 'lane:long' && a.t === true, JSON.stringify(a));
const b = J(`__mapkeys('convoy:freighter-t1', 'convoy:freighter-t1')`);
check('with the mark on the convoy itself V scouts it (the map says it cannot) and T is not the map\'s (it is not a lane)', b.scout === 'convoy:freighter-t1' && b.take === null && b.t === false, JSON.stringify(b));
const c = J(`__mapkeys('lane:short', '')`);
check('with nothing set the mark is what V and T act on, as before', c.scout === 'lane:short' && c.take === 'lane:short', JSON.stringify(c));

// ---- 2. a toast that came after a long one does not show the tail of it ----
// A message that wraps on two lines used to be remembered by its LAST LINE: a toast within 1.5 s of it was "paired" with that fragment, and the box showed the fragment on top. 1.1's own hints
// were cut: "The leader blocks the way. Send the transport past it: Q, CONVOY, 3 is Run for it." then "Pirate leader ahead. Heavy ship." showed "Q, CONVOY, 3 is Run for it." over the second line.
g.run(`window.__toastShows = (first, second) => { const shown = [], mk = () => new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : mk()), apply: () => mk() });
  const s = { time: { now: 1000 }, add: { text: (x, y, txt) => { shown.push(txt); return mk(); }, rectangle: () => mk() }, tweens: { add: () => {} }, toasts: [] };
  toast(s, first); s.time.now = 1300; toast(s, second); return shown; };`);
const t1 = J(`__toastShows('The leader blocks the way. Send the transport past it: Q, CONVOY, 3 is Run for it.', 'Pirate leader ahead. Heavy ship.')`);
check('a short toast after a two-line one stands alone (the tail of the long one is not on top of it)', t1.length === 2 && t1[1] === 'Pirate leader ahead. Heavy ship.', JSON.stringify(t1));
const t2 = J(`__toastShows('Fighters, attack.', 'Missile away.')`);
check('two short toasts a moment apart still share the box, the first on top', t2.length === 2 && t2[1] === 'Fighters, attack.\nMissile away.', JSON.stringify(t2));
const t3 = J(`(() => { const shown = [], mk = () => new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : mk()), apply: () => mk() }); const s = { time: { now: 1000 }, add: { text: (x, y, txt) => { shown.push(txt); return mk(); }, rectangle: () => mk() }, tweens: { add: () => {} }, toasts: [] };
  toast(s, 'Fighters, attack.'); s.time.now = 1200; toast(s, 'Missile away.'); s.time.now = 1400; toast(s, 'Power to shields.'); return shown; })()`);
check('three short toasts in a row: the box holds the last two, as before', t3[2] === 'Missile away.\nPower to shields.', JSON.stringify(t3));

// ---- 3. 1.1 has one Transport: its goal does not say "Haulers" ----
// The HUD line, the briefing's goal (and the ship computer's summary, which reads the HUD line) said "Haulers delivered: 0 of 1." in a mission of one Transport that the rest of the game
// calls "the transport" ("Transport is under way.", "Transport has arrived."). A deliver row may say `word: 'transport'`; 1.3's three haulers keep the old words.
const g11 = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 0 }); campStep(C, 1 / 30); return { hud: campObjective(C), brief: campHubBrief(campProgressNew(), 1, 0).objectives, sum: campSummary(C) }; })()`);
check('1.1: the HUD goal says "Transport delivered: 0 of 1."', g11.hud === 'Transport delivered: 0 of 1.', g11.hud);
check('1.1: the briefing\'s goal says the same, and the ship computer is told it', g11.brief.length === 1 && g11.brief[0] === 'Transport delivered: 0 of 1.' && g11.sum.indexOf('Goal: Transport delivered: 0 of 1.') >= 0, JSON.stringify([g11.brief, g11.sum.slice(0, 120)]));
const g13 = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 2 }); campStep(C, 1 / 30); return { hud: campObjective(C), brief: campHubBrief(campProgressNew(), 1, 2).objectives }; })()`);
check('1.3: the three haulers keep "Haulers delivered"', /^Haulers delivered: 0 of 1\.$/.test(g13.hud) && g13.brief[0] === 'Haulers delivered: 0 of 1.', JSON.stringify(g13));

const l11 = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 0 }); return campLoseLines(C, 'convoy'); })()`), l13 = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 2 }); return campLoseLines(C, 'convoy'); })()`);
check('1.1: the lost card says the transport is lost; 1.3 says the haulers', l11[0] === 'The transport is lost.' && l13[0] === 'The haulers are lost.', JSON.stringify([l11[0], l13[0]]));
check('the tip of a lost convoy is still there (1.1 shares the convoy tip until a transport tip is written: camp.lose.tip.convoy.transport)', l11.length === 3 && l11[2] === l13[2], JSON.stringify(l11));

// ---- 4. 1.1 does have scouting: V on a row that is not a lane says what scouts can read, not "This mission has no scouting." ----
const sc = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 0 }); campOrder(C, 'launch'); for (let i = 0; i < 600; i++) campStep(C, 1 / 30);
  const row = k => campNavRows(C).find(r => r.kind === k), say = r => r.say || r.code, out = {};
  out.convoy = say(campScoutDo(C, row('convoy'), true)); out.lane = say(campScoutDo(C, row('lane'), true)); C.route.passed = true; out.past = say(campScoutDo(C, row('convoy'), true));
  const D = campNew(1, [], { seed: 1, mission: 2 }); campOrder(D, 'launch'); for (let i = 0; i < 600; i++) campStep(D, 1 / 30); out.none = say(campScoutDo(D, campNavRows(D).find(r => r.kind === 'convoy') || { x: 0, y: 0 }, true)); return out; })()`);
check('1.1, V on the transport: "Scouts only read the lanes here, pilot."', sc.convoy === 'Scouts only read the lanes here, pilot.', JSON.stringify(sc));
check('1.1, V on a lane is allowed (the scout goes)', /Scout \d is going to Short lane/.test(sc.lane), JSON.stringify(sc));
check('1.1, the fork behind: "The fork is behind us. Nothing to scout."; 1.3 (no fork, no scouting) keeps "This mission has no scouting."', sc.past === 'The fork is behind us. Nothing to scout.' && sc.none === 'This mission has no scouting.', JSON.stringify(sc));

// ---- 5. the briefing counts every pirate 1.1 sends: the leader brings two skiffs ----
// "Expect 6 pirate skiffs, 2 pirate torpedo boats, the pirate leader": the flight met 8 skiffs (the distress call's 2, the ambush's 4 and the 2 that come with the leader).
const en = J(`campBriefEnemies(1, 0)`), seen = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 0 }), L = C.L, k = {}; (L.waves || []).forEach(w => { if (w.lane && w.lane !== 'short') return; Object.keys(w.ships || {}).forEach(s => { k[s] = (k[s] || 0) + w.ships[s]; }); });
  (L.rivals || []).forEach(r => Object.keys(r.escorts || {}).forEach(s => { k[s] = (k[s] || 0) + r.escorts[s]; })); return k; })()`);
const sk = en.list.find(e => e.kind === 'skiff'), tb = en.list.find(e => e.kind === 'tboat');
check('1.1\'s briefing says 8 skiffs and 2 torpedo boats (the distress call, the ambush and the leader\'s two)', sk && sk.n === 8 && tb && tb.n === 2 && /8 pirate skiffs/.test(en.line), en.line);
check('and that is what the mission\'s rows send down the default lane (the count is read from them)', seen.skiff === 8 && seen.tboat === 2, JSON.stringify(seen));

// ---- 6. the briefing's mining goal starts from the ore you carry, as the HUD does ----
// 1.2's HUD says "Mine ore: 60 of 190." from the first second (the store holds what the ready room's pocket held); the briefing said "0 of 190." whatever you carried.
const ob = J(`(() => { const P = campProgressNew(); P.ore = 60; const a = campHubBrief(P, 1, 1).objectives[0]; P.ore = 142; const b = campHubBrief(P, 1, 1).objectives[0]; P.ore = 400; const c = campHubBrief(P, 1, 1).objectives[0];
  const C = campNew(1, [], { seed: 1, mission: 1, ore: 60 }); campStep(C, 1 / 30); return [a, b, c, campObjective(C)]; })()`);
check('1.2: the briefing says "Mine ore: 60 of 190." for 60 ore carried, 142 for 142, and never more than the goal; the HUD says the same at the start', ob[0] === 'Mine ore: 60 of 190.' && ob[1] === 'Mine ore: 142 of 190.' && ob[2] === 'Mine ore: 190 of 190.' && ob[3] === 'Mine ore: 60 of 190.', JSON.stringify(ob));

if (failed) { console.log(`\nHUNT FLEET: ${failed} FAILED`); process.exit(1); }
console.log('\nHUNT FLEET: all passed');
