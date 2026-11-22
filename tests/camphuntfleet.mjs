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

if (failed) { console.log(`\nHUNT FLEET: ${failed} FAILED`); process.exit(1); }
console.log('\nHUNT FLEET: all passed');
