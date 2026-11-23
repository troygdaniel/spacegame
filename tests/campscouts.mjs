// smoke: the Campaign's scout-escorts: a Scout order, sensor circles, recon, fetch, fragile, left behind on Fast, missions that allow it (plain Node, no Chrome)
// Card space-game-campaign-scouts (Troy: could the escorts be scouts/escorts, so in missions they can do recon work, escort, get caches). The design lines are docs/CAMPAIGN.md "Scout-escorts"; everything is
// one table, CAMP.scout, in src/campaign.js, and an escort whose order is { type: 'scout' } with its state in u.scout. Checks:
//   A  the table
//   B  the Scout order: one free escort that is out goes to a place; why it is refused (no escort out, none free, no such place, a mission without scouting); a dry check changes nothing
//   C  the trip: out, reading at its place, the report, home, landed in the bay; the sensor circle while it is out
//   D  recon: a scout fills a recon point faster and from farther than the wing, if the mission allows recon
//   E  fetch: it takes ore and a cache by touching them and the take counts when it is back aboard; lost, it drops them; if the mission allows fetch
//   F  fragile: it takes damage 2.5 times over while out
//   G  left behind on Fast: beyond the leash when the carrier is on a Fast burn, it is lost
//   H  the other orders: a scout out is not taken from its task by Guard or Attack; Recall brings it home with its load
//   I  the anomaly hook: a cloaked anomaly inside the read range is read, not uncovered (the table is 6-GEN's card)
//   J  the words, the strip and the voice, the radio; the HUD, the radar and the map's third button (source)
//   K  nothing changes unless a Scout order is given: the pinned battles of tests/campsystems.mjs (taken from main b721fe3) end in the same state
// Run: node tests/campscouts.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame(); belt(g); // the old Level 1, the asteroid belt, as a fixture level numbered 11 (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };
const sec = (name, fn) => { try { fn(); } catch (e) { check(name + ' ran without an error', false, e && e.message); } };
const words = s => String(s).replace(/\{[^}]*\}/g, 'N').split(/\s+/).filter(Boolean).length;
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
g.run(`
  window.__ev = [];
  window.__go = (sec, fn) => { const n = Math.round(sec * 30); for (let i = 0; i < n && !C.result; i++) { if (fn) fn(i); campStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0; } };
  window.__mk = (level, mission) => { window.C = campNew(level || 1, [], { seed: 5, mission: mission | 0 }); C.god = true; __ev.length = 0; return true; };
  window.__esc = (dx, dy) => { const u = campSpawn(C, 'escort', C.carrier.x + (dx || 0), C.carrier.y + (dy || 0)); u.order = { type: 'guard', at: { kind: 'carrier' } }; u.vx = u.vy = 0; return u; };
  window.__vesta = () => campPlaces(C.level).vesta;
`);
const SAYS = () => J("__ev.filter(e => e.type === 'say').map(e => e.key)");

sec('A', () => {
  const S = J('CAMP.scout');
  check('A  CAMP.scout is the one table: sensors, read range, scan reach and rate, pickup, carry, station, fragile, leash, default tasks', S && ['sense', 'read', 'scanReach', 'scanRate', 'pickup', 'carry', 'station', 'fragile', 'leash', 'tasks'].every(k => S[k] !== undefined), JSON.stringify(S));
  check('A  the figures: 2,600 px sensors, 1,400 px read, 260 px more scan reach, 2.5 times the scan speed, 90 px pickup, 60 ore, 6 s on station, x2.5 damage, a 5,200 px leash, all three tasks', !!S && S.sense === 2600 && S.read === 1400 && S.scanReach === 260 && S.scanRate === 2.5 && S.pickup === 90 && S.carry === 60 && S.station === 6 && S.fragile === 2.5 && S.leash === 5200 && JSON.stringify(S.tasks) === '["recon","escort","fetch"]', JSON.stringify(S));
  check('A  the read range is inside the sensor circle, and a scout flies at the escort\'s own speed (faster than the carrier)', !!S && S.read < S.sense && J('CAMP.escort.speed') > J('CAMP.carrier.speed'));
});

sec('B', () => {
  g.run('__mk(11, 0)');
  let r = J("campOrder(C, 'scout', 'vesta', 'key')");
  check('B  with no escort out the order is refused: "No escorts are out. Launch first."', r.ok === false && r.code === 'noescorts', JSON.stringify(r));
  g.run('window.__e1 = __esc(0, 80).id');
  r = J("campCheck(C, 'scout', 'vesta')");
  check('B  a dry check says it would go and changes nothing', r.ok === true && J('C.by[__e1].order.type') === 'guard' && J('C.orders.scout | 0') === 0, JSON.stringify(r));
  r = J("campOrder(C, 'scout', 'vesta', 'key')");
  check('B  with an escort out it goes: "Scout 1 is going to Vesta."', r.ok === true && r.say === 'Scout 1 is going to Vesta.', JSON.stringify(r));
  check('B  that escort is a scout: its order is scout, with its number, its place and its phase out', J('C.by[__e1].order.type') === 'scout' && J('C.by[__e1].scout.phase') === 'out' && J('C.by[__e1].scout.n') === 1 && J('C.by[__e1].scout.name') === 'Vesta' && close(J('C.by[__e1].scout.x'), J('__vesta().x')), JSON.stringify(J('C.by[__e1].scout')));
  check('B  the order is counted, and the count of scouts out is one', J('C.orders.scout') === 1 && J('campScoutsOut(C)') === 1);
  r = J("campOrder(C, 'scout', 'pallas', 'key')");
  check('B  with the only escort out already scouting, another order is refused: "No escort is free to scout."', r.ok === false && r.code === 'scoutsbusy', JSON.stringify(r));
  g.run('window.__e2 = __esc(40, 80).id');
  r = J("campOrder(C, 'scout', 'pallas', 'key')");
  check('B  a second escort is a second scout (numbered 2), at another place', r.ok === true && J('C.by[__e2].scout.n') === 2 && J('C.by[__e2].scout.name') === 'Pallas' && J('campScoutsOut(C)') === 2, JSON.stringify(r));
  g.run('__mk(11, 0); __esc(0, 80)');
  r = J("campOrder(C, 'scout', 'nowhere at all', 'key')");
  check('B  a place that is not on the map is refused in plain words', r.ok === false && r.code === 'noscoutplace' && /place/i.test(r.say), JSON.stringify(r));
  g.run("C.L.scouts = ['escort']");
  r = J("campOrder(C, 'scout', 'vesta', 'key')");
  check('B  a mission whose data allows neither recon nor fetch refuses: "This mission has no scouting."', r.ok === false && r.code === 'noscout', JSON.stringify(r));
  g.run("C.L.scouts = ['fetch']"); check('B  fetch alone is enough to send one', J("campCheck(C, 'scout', 'vesta')").ok === true);
  g.run("C.L.scouts = ['recon']"); check('B  and so is recon alone', J("campCheck(C, 'scout', 'vesta')").ok === true);
  g.run("delete C.L.scouts"); check('B  a mission that says nothing allows all three', J('campScoutTasks(C).join()') === 'recon,escort,fetch');
  check('B  the data of the missions says it: at least one mission row names its tasks (data, not code)', J("[1, 2, 3].some(l => (CAMP.levels[l].missions || []).some(m => Array.isArray(m.scouts)))"));
  g.run("__mk(11, 0); C.bay.escorts = 2; campOrder(C, 'launch', '', 'key'); __go(8)");
  r = J("campOrder(C, 'scout', 'vesta', 'key')");
  check('B  an escort launched from the bay can be sent (the real path: launch, then scout)', r.ok === true, JSON.stringify(r));
});

sec('C', () => {
  g.run('__mk(11, 0); window.__e1 = __esc(0, 80).id; campOrder(C, "scout", "vesta", "key"); window.__bay = C.bay.escorts; __go(1)');
  const c1 = J('campSensors(C)');
  check('C  while a scout is out there is a sensor circle round it: 2,600 px, at the scout', c1.length === 1 && c1[0].r === 2600 && close(c1[0].x, J('C.by[__e1].x'), 1) && close(c1[0].y, J('C.by[__e1].y'), 1), JSON.stringify(c1));
  g.run('__go(400, () => { if (C.by[__e1] && C.by[__e1].scout && C.by[__e1].scout.phase === "station") window.__sawStation = true; })');
  check('C  it flew out, read its place (phase station), and its trip ended: it is back in the bay, one escort more', J('!!window.__sawStation') === true && J('C.by[__e1] === undefined || C.by[__e1].hp <= 0') && J('C.bay.escorts') === J('__bay') + 1, J('C.bay.escorts') + ' ' + J('__bay'));
  const says = SAYS();
  check('C  it reported ("Scout 1, nothing at Vesta."), and said it was back aboard', says.includes('camp.say.scoutnothing') && says.includes('camp.say.scouthome'), JSON.stringify(says));
  check('C  with no scout out there is no sensor circle', J('campSensors(C).length') === 0 && J('campScoutsOut(C)') === 0);
  g.run('__mk(11, 0); window.__e1 = __esc(0, 80).id; campOrder(C, "scout", "vesta", "key"); __go(3)');
  check('C  it flies at its own speed: after 3 s it is nearer Vesta than the carrier is (the carrier has not moved)', J('Math.hypot(C.by[__e1].x - __vesta().x, C.by[__e1].y - __vesta().y)') < J('Math.hypot(C.carrier.x - __vesta().x, C.carrier.y - __vesta().y)'));
});

sec('D', () => {
  g.run('__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; window.__P0 = C.scan[0]; __P0.t = 0;');
  const r = J('__P0.r');
  g.run(`window.__sc = (dx, tasks) => { const u = __esc(0, 0); u.x = __P0.x + dx; u.y = __P0.y; u.vx = u.vy = 0; u.order = { type: 'scout' }; u.scout = { n: 1, name: 'P', x: u.x, y: u.y, phase: 'station', at: C.t, carry: { ore: 0, caches: 0 } }; if (tasks) C.L.scouts = tasks; return u; }`);
  g.run(`window.__u = __sc(${r} + 150); __go(2)`);
  check('D  a scout 150 px outside a recon point\'s radius (inside the scan reach) fills it 2.5 times as fast: 2 s of a scout is 5 s of scan', close(J('__P0.t'), 5, 0.3), J('__P0.t'));
  g.run('__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; window.__P0 = C.scan[0]; __P0.t = 0;'); g.run(`window.__u = __sc(${r} - 50); __go(2)`);
  check('D  inside the point\'s own radius it is still 2.5 times as fast', close(J('__P0.t'), 5, 0.3), J('__P0.t'));
  g.run('__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; window.__P0 = C.scan[0]; __P0.t = 0; window.__u = __esc(0, 0); __u.x = __P0.x + 10; __u.y = __P0.y; __go(1)');
  check('D  an ordinary escort at the same place fills it at the wing\'s rate: 1 s of 1 s', close(J('__P0.t'), 1, 0.1), J('__P0.t'));
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; window.__P0 = C.scan[0]; __P0.t = 0; window.__u = __sc(${r} + 700); __go(2)`);
  check('D  a scout farther than the point\'s radius plus the scan reach (260 px) scans nothing', J('__P0.t') === 0, J('__P0.t'));
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; window.__P0 = C.scan[0]; __P0.t = 0; window.__u = __sc(${r} + 150, ['escort', 'fetch']); __go(2)`);
  check('D  a mission that does not allow recon gives the scout no speed-up (and no reach)', J('__P0.t') === 0, J('__P0.t'));
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; window.__P0 = C.scan[0]; window.__u = __sc(${r} - 50); __go(${J('__P0.secs')} / 2.5 + 1)`);
  check('D  a point of 8 s is scanned (counted for the mission) in about 3.2 s by a scout', J('__P0.got') === true && J('C.scan.filter(p => p.got).length') >= 1);
});

sec('E', () => {
  const scoutAt = 'window.__u = __esc(0, 0); __u.x = 0; __u.y = 0; __u.order = { type: "scout" }; __u.scout = { n: 1, name: "X", x: 5000, y: 0, phase: "out", at: C.t, carry: { ore: 0, caches: 0 } };';
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; ${scoutAt} C.pickups.push({ id: "chunk-t", kind: "chunk", x: 40, y: 0, ore: 20, born: C.t }); window.__ore0 = C.ore; __go(0.2)`);
  check('E  a scout out takes an ore chunk by touching it (within 90 px) into its hold, and the store does not change yet', J('C.pickups.length') === 0 && J('__u.scout.carry.ore') === 20 && J('C.ore') === J('__ore0'), JSON.stringify(J('__u.scout.carry')));
  g.run('C.pickups.push({ id: "chunk-u", kind: "chunk", x: __u.x + 30, y: __u.y, ore: 80, born: C.t }); __go(0.2)');
  check('E  it holds at most 60 ore: the rest stays where it lay', J('__u.scout.carry.ore') === 60 && J('C.pickups.length') === 1 && J('C.pickups[0].ore') === 40, JSON.stringify(J('C.pickups')));
  check('E  a full hold sends it home by itself', J('__u.scout.phase') === 'home');
  g.run('C.carrier.x = __u.x - 100; C.carrier.y = __u.y; __go(3)');
  check('E  landed in the bay: the 60 ore are in the store now (not before)', J('C.ore') === J('__ore0') + 60 && J('C.by[__u.id] === undefined || C.by[__u.id].hp <= 0'), J('C.ore') + ' ' + J('__ore0'));
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; C.caches.push({ x: 0, y: 0, got: false }); window.__k = C.caches[C.caches.length - 1]; window.__c0 = C.cachesGot; ${scoutAt.replace('__u.x = 0;', '__u.x = 20;')} __go(0.2)`);
  check('E  a scout takes a cache by touching it, and it is not gathered yet (the mission does not count it)', J('__u.scout.carry.caches') === 1 && J('__k.got') === false && J('C.cachesGot') === J('__c0'), JSON.stringify(J('__u.scout.carry')));
  g.run('C.carrier.x = __u.x + 60; C.carrier.y = __u.y; __u.scout.phase = "home"; __go(3)');
  check('E  back aboard, the cache is gathered and counted', J('__k.got') === true && J('C.cachesGot') === J('__c0') + 1);
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; C.caches.push({ x: 0, y: 0, got: false }); window.__k = C.caches[C.caches.length - 1]; ${scoutAt.replace('__u.x = 0;', '__u.x = 20;').replace('ore: 0', 'ore: 15')} __go(0.2); C.god = false; campHurt(C, __u, 9999, "alien-1"); __go(0.2)`);
  check('E  a scout lost with a cache drops it: the cache is back where it was (not gathered, free to take again) and its ore lies where it died', J('__k.got') === false && J('C.pickups.some(p => p.ore === 15)') === true && J('C.cachesGot') === 0, JSON.stringify(J('C.pickups')));
  g.run('__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; C.caches.push({ x: 0, y: 0, got: false }); window.__k = C.caches[C.caches.length - 1]; window.__u = __esc(0, 0); __u.x = 20; __u.y = 0; __go(0.2)');
  check('E  an ordinary escort still picks a cache up at once, as before (only a scout carries it home)', J('__k.got') === true && J('C.cachesGot') === 1);
  g.run(`__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; ${scoutAt} C.L.scouts = ["recon"]; C.pickups.push({ id: "chunk-t", kind: "chunk", x: 40, y: 0, ore: 20, born: C.t }); __go(0.2)`);
  check('E  a mission that does not allow fetch: the scout carries nothing and the ore stays', J('__u.scout.carry.ore') === 0 && J('C.pickups.length') === 1, JSON.stringify(J('C.pickups')));
});

sec('F', () => {
  g.run('__mk(11, 0); C.god = false; window.__a = __esc(0, 0); window.__b = __esc(100, 0); __b.order = { type: "scout" }; __b.scout = { n: 1, name: "X", x: 5000, y: 0, phase: "out", at: C.t, carry: { ore: 0, caches: 0 } }; window.__ha = __a.hp; window.__hb = __b.hp; campHurt(C, __a, 10, "raider-1"); campHurt(C, __b, 10, "raider-1")');
  check('F  an escort at the carrier\'s side takes 10 damage as 10; a scout out takes the same hit as 25 (x2.5: fragile)', close(J('__ha - __a.hp'), 10) && close(J('__hb - __b.hp'), 25), J('__ha - __a.hp') + ' ' + J('__hb - __b.hp'));
  g.run('__b.order = { type: "guard", at: { kind: "carrier" } }; delete __b.scout; __b.hp = __hb; campHurt(C, __b, 10, "raider-1")');
  check('F  once it is no longer a scout it is not fragile', close(J('__hb - __b.hp'), 10));
  g.run('__mk(11, 0); C.god = false; window.__b = __esc(100, 0); __b.order = { type: "scout" }; __b.scout = { n: 1, name: "X", x: 5000, y: 0, phase: "out", at: C.t, carry: { ore: 0, caches: 0 } }; window.__l0 = C.lostShips; campHurt(C, __b, 9999, "raider-1"); __go(0.1)');
  check('F  a scout that is destroyed is a ship lost (the "clean" bonus counts it)', J('C.lostShips') === J('__l0') + 1 && J('C.by[__b.id] === undefined'));
});

sec('G', () => {
  // main's board-before-fast rule (card space-game-campaign-fast-board) refuses a burn while a ship is out, so a normal Fast never leaves a scout behind; the leash is the safety net when a burn is on anyway (set by hand here)
  const setup = (dx, fast) => g.run(`__mk(11, 0); window.__u = __esc(0, 0); __u.x = C.carrier.x + ${dx}; __u.y = C.carrier.y; __u.order = { type: "scout" }; __u.scout = { n: 1, name: "X", x: __u.x, y: __u.y, phase: "station", at: C.t, carry: { ore: 0, caches: 0 } }; window.__l0 = C.lostShips; __ev.length = 0; ${fast ? "campNavGo(C, campNavFind(C, 'pallas').row, false); C.nav.fast = true; C.nav.burn = 2;" : ''} ${fast ? 'campScoutsStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0;' : '__go(0.3)'}`); // (campTick itself switches a burn off when a ship is out: the leash is called directly)
  g.run(`__mk(11, 0); window.__u = __esc(0, 0); __u.order = { type: "scout" }; __u.scout = { n: 1, name: "X", x: 0, y: 0, phase: "station", at: C.t, carry: { ore: 0, caches: 0 } }; campNavGo(C, campNavFind(C, 'pallas').row, true)`);
  check('G  main\'s rule: a Fast burn is refused while a scout is out (it stays a regular trip), so a scout is not left behind by a normal Fast', J('C.nav.fast') === false);
  setup(6500, true);
  check('G  a scout 6,500 px behind (past the 5,200 px leash) when the carrier is on a Fast burn is left behind: lost, with a line', J('C.by[__u.id] === undefined || C.by[__u.id].hp === 0') && J('C.lostShips') === J('__l0') + 1 && SAYS().includes('camp.say.scoutleft'), JSON.stringify([J('C.lostShips'), J('__l0'), SAYS()]));
  setup(3000, true);
  check('G  a scout inside the leash (3,000 px) is not', J('C.by[__u.id] !== undefined && C.by[__u.id].hp > 0'));
  setup(6500, false);
  check('G  with no Fast burn a scout may be as far as it likes', J('C.by[__u.id] !== undefined && C.by[__u.id].hp > 0'));
  g.run('__mk(11, 0); window.__f = campSpawn(C, "fighter", C.carrier.x + 6500, C.carrier.y); __f.order = { type: "guard", at: { kind: "carrier" } }; campNavGo(C, campNavFind(C, "pallas").row, true); __go(0.3)');
  check('G  only scouts are left behind: a fighter far away on the same burn is not touched by this rule', J('C.by[__f.id] !== undefined && C.by[__f.id].hp > 0'));
});

sec('H', () => {
  g.run('__mk(11, 0); window.__e = __esc(0, 80).id; window.__f = campSpawn(C, "fighter", C.carrier.x + 50, C.carrier.y + 50).id; C.by[__f].order = { type: "guard", at: { kind: "carrier" } }; campOrder(C, "scout", "vesta", "key"); campOrder(C, "guard", "", "key"); campOrder(C, "attack", "", "key")');
  check('H  Guard and Attack do not take a scout from its task (it keeps its order), and they still work on the fighters', J('C.by[__e].order.type') === 'scout' && J('C.by[__f].order.type') === 'attack');
  g.run('C.by[__e].scout.carry.ore = 25; C.carrier.x = C.by[__e].x + 30; C.carrier.y = C.by[__e].y; window.__ore0 = C.ore; campOrder(C, "recall", "", "key"); __go(3)');
  check('H  Recall brings a scout home with what it carries: 25 ore in the store when it lands', J('C.ore') === J('__ore0') + 25 && J('C.by[__e] === undefined || C.by[__e].hp <= 0'), J('C.ore') + ' ' + J('__ore0'));
  g.run('__mk(11, 0); window.__e = __esc(0, 80).id; campOrder(C, "scout", "vesta", "key"); campOrder(C, "escort", "", "key")');
  check('H  the convoy order (Escort) does not take a scout out of its task either', J('C.by[__e].order.type') === 'scout');
});

sec('I', () => {
  // the anomalies card's model (src/campanomaly.js): C.anoms rows { id, x, y, state: 'hidden' | 'revealed' | 'done' | 'old', sensed, hides, hold }
  g.run('__mk(11, 0); C.carrier.x = -90000; C.carrier.y = -90000; C.anoms = [{ id: "an1", x: 1000, y: 0, r: 220, state: "hidden", sensed: false, hold: 0, hides: "weapons store", ids: [] }, { id: "an2", x: 9000, y: 0, r: 220, state: "hidden", sensed: false, hold: 0, hides: "tech lab", ids: [] }, { id: "an3", x: 500, y: 0, r: 220, state: "old", sensed: false, hold: 0, hides: "wreck", ids: [] }]; window.__u = __esc(0, 0); __u.x = 0; __u.y = 0; __u.order = { type: "scout" }; __u.scout = { n: 1, name: "X", x: 100, y: 0, phase: "station", at: C.t, carry: { ore: 0, caches: 0 } }; __ev.length = 0; __go(0.3)');
  check('I  a scout reads a hidden anomaly inside its read range (1,400 px): it is noticed (a mark on the map and the radar) and named, and still hidden (only a visit by the carrier decloaks it)', J('C.anoms[0].read') === true && J('C.anoms[0].sensed') === true && J('C.anoms[0].state') === 'hidden' && J('C.anoms[1].read | 0') === 0 && J('C.anoms[1].sensed') === false, JSON.stringify(J('C.anoms')));
  check('I  one far (9,000 px) and one already looted ("old") are not read', J('!C.anoms[1].read') && J('!C.anoms[2].read'));
  check('I  the reading is said once: "Anomaly: likely weapons store.", and the anomalies card\'s own sense event is made (stage sense)', J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.anomalyread').length") === 1 && J("__ev.find(e => e.key === 'camp.say.anomalyread').vars.likely") === 'weapons store' && J("__ev.some(e => e.type === 'anomaly' && e.stage === 'sense' && e.id === 'an1')"));
  check('I  the map and the radar show it, named "Anomaly: likely weapons store" (campAnomMarks)', J("campAnomMarks(C).map(m => m.name).join('|')") === 'Anomaly: likely weapons store', J("campAnomMarks(C).map(m => m.name).join('|')"));
  check('I  the scout\'s report names it: "Scout 1, X: likely weapons store."', J('__u.scout.found.join()') === 'weapons store');
  g.run('C.carrier.x = 1000; C.carrier.y = 0; __ev.length = 0; __go(0.2)');
  check('I  the carrier arriving does not repeat the sense line (the anomaly was noticed already)', J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.anom.sense').length") === 0);
  g.run('__mk(11, 0); C.anoms = [{ id: "an1", x: 1000, y: 0, r: 220, state: "hidden", sensed: false, hold: 0, hides: "wreck", ids: [] }]; window.__u = __esc(0, 0); __u.x = 0; __u.y = 0; __go(0.3)');
  check('I  an ordinary escort reads nothing; and a Campaign with no anomalies is not touched', J('C.anoms[0].read | 0') === 0 && (g.run('__mk(11, 0); __go(0.3)'), J('C.anoms.length') >= 0));
});

sec('J', () => {
  const file = read('content/text/campaign-scouts.md');
  const rows = file.split('\n').map(l => /^\|\s*([\w.]+)\s*\|\s*(.*?)\s*\|\s*$/.exec(l)).filter(m => m && m[1] !== 'key' && !/^-+$/.test(m[1])).map(m => [m[1], m[2]]);
  check('J  the words are in content/text/campaign-scouts.md (a file of their own), equal to the code table, 12 words or fewer', rows.length >= 10 && rows.every(([k, t]) => J(`UI_TEXT[${JSON.stringify(k)}]`) === t && words(t) <= 12), rows.length);
  const intent = t => J(`campIntent(${JSON.stringify(t)})`);
  check('J  the strip and the voice: "scout Vesta", "send a scout to the relic", "scout the anomaly" (the words of the wing orders, src/campwing.js, may take them as the escorts\' scout order: the same order, card space-game-campaign-wing-targets)', /^\{"act":"fleet_(scout|wing)","arg":"(escorts )?vesta"\}$/.test(JSON.stringify(intent('scout vesta'))) && /fleet_(scout|wing)/.test(JSON.stringify(intent('send a scout to the relic'))) && /relic/.test(JSON.stringify(intent('send a scout to the relic'))) && /anomaly/.test(JSON.stringify(intent('scout the anomaly'))), JSON.stringify([intent('scout vesta'), intent('send a scout to the relic')]));
  check('J  a question about scouts is not an order ("what do scouts do")', !/fleet_scout/.test(JSON.stringify(intent('what do scouts do'))));
  const sc = read('src/shipcomputer.js');
  check('J  the computer\'s closed list has fleet_scout and runs it (scFleet)', /fleet_scout/.test(sc) && /fleet_scout: \(s, arg\) => scFleet\(s, 'scout', arg\)/.test(sc));
  check('J  the radio calls the scouts ("scouts" call, lines of their own)', J('!!CHATTER.events.scouts') && J('CHATTER.says["camp.say.scoutnothing"]') === 'scouts' && J("uiText('camp.chat.scouts.1')") !== 'camp.chat.scouts.1');
  const scene = read('src/campaignscene.js'), map = read('src/campmapdraw.js');
  check('J  the HUD counts the scouts out ("SCOUTS n")', /campScoutsOut\(C\)/.test(scene) && /hud\.scouts/.test(scene));
  check('J  the Tab map has a third button beside Fly and Fast (Scout, key V) and draws the sensor circles', /btnScout/.test(map) && /KeyV/.test(map) && /campMapScout/.test(map) && /campSensors\(/.test(map));
  check('J  no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
});

sec('K', () => {
  // re-pinned by card space-game-fighter-dogfights (21 Nov 2026): the wing's fighters and the raiders now dogfight, so this seeded fight ends in another state than main b721fe3's. What the pin proves is unchanged: an explicit default is the same battle, and nothing else moves it. Level 3 is taken again by card space-game-fighter-repair (a fighter under 30 percent hull lands and is mended, so the wing kills the eight sooner: 40 turret shots where there were 98); level 1 is unchanged.
  const GOLD = {"l1":{"t":120000,"x":-9809.020067,"y":2569.733087,"vx":0.014763,"vy":0.012298,"rot":3.292307,"hp":600,"shield":150,"kills":8,"missiles":5,"reloadAt":134967,"shots":22,"blinkAt":50033.333333334114,"aliens":0,"ships":9,"turretAt":[120390.166,120478.758,120566.542,120655.123,120040.933,120131.702,120228.194,120303.698]},"l3":{"t":120000,"x":-16939.020067,"y":6039.733087,"vx":0.014763,"vy":0.012298,"rot":3.292307,"hp":600,"shield":150,"kills":8,"missiles":5,"reloadAt":134967,"shots":99,"blinkAt":50033.333333334114,"aliens":0,"ships":4,"turretAt":[120390.166,120478.758,120566.542,120655.123,120040.933,120131.702,120228.194,120303.698]}};
  const run = lvl => J(`(() => {
    const C = campNew(${lvl}, ['blink'], { seed: 7 }); let shots = 0;
    for (let i = 0; i < 30 * 120 && !C.result; i++) {
      const s = i / 30;
      C.input.thrust = (s % 20 < 12) ? 1 : 0; C.input.turn = Math.sin(s / 3) * 0.6; C.input.fire = s > 8; C.input.brake = (s % 20 > 17);
      if (i === 10) { for (let k = 0; k < 8; k++) { const ang = k / 8 * 6.283, u = campSpawn(C, ['raider', 'drone', 'gunship', 'raider'][k % 4], C.carrier.x + Math.cos(ang) * 700, C.carrier.y + Math.sin(ang) * 700); if (u) u.goal = 'carrier'; } }
      if (i === 30) campOrder(C, 'launch', '', 'key'); if (i === 60 * 30 / 2) campOrder(C, 'attack', '', 'key'); if (i % 600 === 599) campFire(C, campNearest(campAliens(C), C.carrier)); if (i === 1500) C.input.blink = true;
      campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'turret') shots++; }); C.events.length = 0;
    }
    const c = C.carrier; return { t: Math.round(C.t), x: +c.x.toFixed(6), y: +c.y.toFixed(6), vx: +c.vx.toFixed(6), vy: +c.vy.toFixed(6), rot: +c.rot.toFixed(6), hp: +c.hp.toFixed(4), shield: +C.shield.toFixed(4), kills: C.kills, missiles: C.missiles, reloadAt: Math.round(C.reloadAt), shots, blinkAt: C.blinkAt, aliens: campAliens(C).length, ships: C.ships.length, turretAt: C.turrets.map(t => +t.at.toFixed(3)) };
  })()`);
  [11, 3].forEach(l => { const a = run(l); check(`K  level ${l === 11 ? '1 (the old belt, fixture 11)' : l}: with no Scout order given a 120 s battle ends in the very pinned state (tests/campsystems.mjs, re-pinned by the dogfights card and the shield-auto card)`, JSON.stringify(a) === JSON.stringify(GOLD['l' + (l === 11 ? 1 : l)]), JSON.stringify(a)); });
});
console.log(failed ? `CAMP SCOUTS FAIL (${failed} of ${n})` : `CAMP SCOUTS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
