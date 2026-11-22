// smoke: a fork in an escort's road: lanes as mission data, a scout that reads what each lane hides, the player's pick (plain Node, no Chrome)
// Card space-game-scout-route (Troy, 21 Nov 2026: fights were not interactive and escorts were boring; he wants to direct the fleet more): on an escort mission the road forks. A scout sent ahead finds
// what waits on each lane (an ambush on the short one, a quiet long one, sometimes a cache); the player picks the lane on the Tab map, by the words or by an order call. Unscouted, the ambush is a surprise.
// The shape (docs/CAMPAIGN.md "Scouting the route"): a mission row's  route: { fork, join, wait, pick, lanes: [{ id, name, bend, hides: { waves: [...], caches: [...] } }] }.
//   A  the data: the lanes' hidden waves are laid into the row's waves with the lane's name on them; a lane's length and its middle
//   B  the convoy: flies to the fork, holds there for the player's word, takes the default lane when none comes, never holds on a mission with no route
//   C  the pick: the order, the words, the dry check, who may pick when; the share of the road is the same on every lane
//   D  what a lane hides: its waves come only to a convoy on that lane; the other lane's never come; the wave counter does not count them
//   E  the scout: the lanes are rows of the Tab map; a scout flies to a lane, reads it, and says what is there (ambush, quiet, a cache)
//   F  the words, the strip and the voice, the map's lane marks (source)
//   G  the real data: no mission has a fork now (1.1's was cut: card space-game-cut-lane-fork); the briefing counts 1.1's raids
// Run: node tests/camproute.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };
const sec = (name, fn) => { try { fn(); } catch (e) { check(name + ' ran without an error', false, e && e.message); } };

g.run(`
  window.__ev = [];
  window.__go = (s, fn) => { const k = Math.round(s * 30); for (let i = 0; i < k && !C.result; i++) { if (fn) fn(i); campStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0; } };
  var __pl = campPlaces(1);
  CAMP.levels.rr = { name: 'Route test', start: 'luna', startAt: [130, 30], earth: false, startOre: 0, places: __pl, rocks: [], convoys: [], waves: [],
    outposts: { luna: { name: 'Lunar Base' }, ceres: { name: 'Occator Works', market: { rate: 3 } } },
    missions: [
      { id: 'fork', kind: 'escort', place: 'luna', dock: 'ceres',
        convoys: [{ id: 't1', name: 'Transport', at: 2, from: 'luna', to: 'ceres', speed: 100 }],
        objectives: [{ type: 'deliver', n: 1 }],
        route: { fork: 0.2, join: 0.8, wait: 20, pick: 'short', lanes: [
          { id: 'short', name: 'Short lane', bend: 0, hides: { waves: [{ on: { lane: 0.5 }, ahead: 1500, ships: { skiff: 3 }, goal: 'convoy:t1', ambush: true, say: 'camp.say.raid' }] } },
          { id: 'long', name: 'Long lane', bend: -3000, hides: { caches: [{ at: 0.5, ore: 40 }] } } ] },
        waves: [{ on: { lane: 0.9 }, ahead: 1500, ships: { skiff: 1 }, goal: 'convoy:t1', say: 'camp.say.raid2' }] },
      { id: 'plain', kind: 'escort', place: 'luna', dock: 'ceres',
        convoys: [{ id: 't1', name: 'Transport', at: 2, from: 'luna', to: 'ceres', speed: 100 }],
        objectives: [{ type: 'deliver', n: 1 }], waves: [] }
    ] };
  window.__mk = (i, seed) => { window.C = campNew('rr', [], { seed: seed == null ? 1 : seed, mission: i | 0 }); C.god = true; __ev.length = 0; return !!C; };
  window.__esc = (dx, dy) => { const u = campSpawn(C, 'escort', C.carrier.x + (dx || 0), C.carrier.y + (dy || 0)); u.order = { type: 'guard', at: { kind: 'carrier' } }; u.vx = u.vy = 0; return u; };
  window.__tt = () => campConvoys(C)[0];
  window.__Fpt = () => { const g = campRouteGeo(C); return g.fork; };
`);
const SAYS = () => J("__ev.filter(e => e.type === 'say').map(e => e.key)");

sec('A', () => {
  console.log('A. the data');
  const row = J('campMissionRow("rr", 0)');
  check('A  the row keeps its route: two lanes, a fork at 0.2 and a join at 0.8, a wait of 20 s, the short lane the default', !!row.route && row.route.lanes.length === 2 && row.route.fork === 0.2 && row.route.join === 0.8 && row.route.wait === 20 && row.route.pick === 'short');
  check('A  the lanes\' hidden waves are laid into the row\'s waves after the plain ones, each with the name of its lane: [the plain wave, the short lane\'s ambush]', row.waves.length === 2 && row.waves[0].lane === undefined && row.waves[1].lane === 'short' && row.waves[1].ships.skiff === 3, JSON.stringify(row.waves.map(w => w.lane)));
  check('A  a mission with no route has no lanes and its row is as it was', J('campMissionRow("rr", 1).route') === undefined || J('campMissionRow("rr", 1).route') === null);
  g.run('__mk(0)');
  const G = J('(() => { const g = campRouteGeo(C); return { short: g.lanes.short.len, long: g.lanes.long.len, road: g.len, midShort: g.lanes.short.mid, midLong: g.lanes.long.mid, a: g.a, b: g.b, fork: g.fork, join: g.join }; })()');
  const roadLen = Math.hypot(G.b.x - G.a.x, G.b.y - G.a.y);
  check('A  the fork is 20 percent of the way along the straight road and the join 80 percent', Math.abs(Math.hypot(G.fork.x - G.a.x, G.fork.y - G.a.y) / roadLen - 0.2) < 0.01 && Math.abs(Math.hypot(G.join.x - G.a.x, G.join.y - G.a.y) / roadLen - 0.8) < 0.01, JSON.stringify(G.fork));
  check('A  the short lane is the straight part of the road (60 percent of it); the long lane bends 3,000 px off it and is longer', Math.abs(G.short - 0.6 * roadLen) < 5 && G.long > G.short + 1500, G.short + ' ' + G.long);
  const off = (p) => { const dx = G.b.x - G.a.x, dy = G.b.y - G.a.y, L = Math.hypot(dx, dy); return Math.abs(((p.x - G.a.x) * dy - (p.y - G.a.y) * dx) / L); };
  check('A  the short lane\'s middle is on the road; the long lane\'s middle is 3,000 px off it', off(G.midShort) < 5 && Math.abs(off(G.midLong) - 3000) < 5);
  check('A  the long lane\'s cache lies on the long lane: one cache in the battle, worth 40 ore, at the lane\'s middle', J('C.caches.length') === 1 && J('C.caches[0].ore') === 40 && Math.hypot(J('C.caches[0].x') - G.midLong.x, J('C.caches[0].y') - G.midLong.y) < 20);
});

sec('B', () => {
  console.log('B. the convoy and the fork');
  g.run('__mk(0)');
  check('B  nothing is chosen at the start: no lane, the route is not passed', J('C.route.lane') === null && J('C.route.passed') === false && J('campRouteHolding(C)') === null);
  g.run('__go(6)');
  check('B  the convoy has left and the radio says the road forks (once)', J('campConvoys(C).length') === 1 && J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.fork').length") === 1);
  const F = J('campRouteGeo(C).fork');
  g.run('__go(34)');
  const d1 = Math.hypot(J('__tt().x') - F.x, J('__tt().y') - F.y);
  check('B  by 40 s she has reached the fork and stopped there (within 100 px of it, almost no speed)', d1 < 100 && Math.hypot(J('__tt().vx'), J('__tt().vy')) < 20, d1);
  const H = J('campRouteHolding(C)');
  check('B  while she holds the mission says so: campRouteHolding gives the two lanes and the seconds left of the wait (about 20 at the start)', !!H && H.lanes.length === 2 && H.left > 0 && H.left <= 20 && H.lanes.map(l => l.id).join() === 'short,long', JSON.stringify(H));
  check('B  the radio asks which lane once: camp.say.forkhold', J("__ev.filter(e => e.type === 'say' && e.key === 'camp.say.forkhold').length") === 1);
  g.run('__go(10)');
  const d2 = Math.hypot(J('__tt().x') - F.x, J('__tt().y') - F.y);
  check('B  ten seconds later she is still there and still holding, nothing chosen', d2 < 100 && J('C.route.lane') === null && J('campRouteHolding(C).left') < 12 && J('campRouteHolding(C).left') > 0);
  g.run('__go(14)');
  check('B  after the wait the default lane is taken for her ("Short lane"): chosen, event lane with auto, the radio says it', J('C.route.lane') === 'short' && J("__ev.some(e => e.type === 'lane' && e.lane === 'short' && e.auto === true)") && J("__ev.some(e => e.type === 'say' && e.key === 'camp.say.laneauto')"));
  g.run('__go(8)');
  check('B  and she goes on: past the fork, the route is passed, no more holding', J('C.route.passed') === true && J('campRouteHolding(C)') === null && Math.hypot(J('__tt().x') - F.x, J('__tt().y') - F.y) > 300);
  g.run('__mk(0); __go(45)');
  check('B  under fire she does not sit still: with a pirate inside 1,400 px of the holding convoy she takes the default lane at once, and the radio says so', (g.run('campSpawn(C, "skiff", __tt().x + 600, __tt().y + 200); C.events.length = 0; __ev.length = 0; __go(0.2)'), J('C.route.lane') === 'short' && J("__ev.some(e => e.type === 'lane' && e.panic === true)") && J("__ev.some(e => e.type === 'say' && e.key === 'camp.say.lanepanic')")));
  g.run('__mk(1); __go(60)');
  check('B  a mission with no route: the convoy never holds, flies the straight road (60 s: past 5,000 px) and there is no route state', J('C.route') === null && J('__tt().x') !== undefined && Math.hypot(J('__tt().x') - J('__tt().from.x'), J('__tt().y') - J('__tt().from.y')) > 5000);
});

sec('C', () => {
  console.log('C. the pick');
  g.run('__mk(0)');
  check('C  the dry check says yes to "long" and changes nothing', J('campCheck(C, "lane", "long").ok') === true && J('C.route.lane') === null);
  check('C  the words work: "the long lane", "short", "Short lane" all find a lane; nonsense is refused with its own words', J('campCheck(C, "lane", "the long lane").ok') && J('campCheck(C, "lane", "short").ok') && J('campCheck(C, "lane", "Short lane").ok') && J('campCheck(C, "lane", "purple").ok') === false && J('campCheck(C, "lane", "purple").code') === 'lanewhat');
  g.run('__go(8)');
  const r = J('campOrder(C, "lane", "long", "key")');
  check('C  the order picks the lane before the convoy is at the fork: ok, said ("Taking the long lane"), the route says long, event lane (not auto)', r.ok === true && J('C.route.lane') === 'long' && /long/i.test(r.say) && J("C.events.some(e => e.type === 'lane' && e.lane === 'long' && !e.auto)") === true);
  const r2 = J('campOrder(C, "lane", "short")');
  check('C  a pick can be changed until she has passed the fork (she is not there yet): now short', r2.ok === true && J('C.route.lane') === 'short');
  g.run('campOrder(C, "lane", "long"); __go(60)');
  check('C  she flies on to the fork without stopping (a lane is chosen) and passes it', J('C.route.passed') === true && J('campRouteHolding(C)') === null);
  const r3 = J('campOrder(C, "lane", "short")');
  check('C  once she has passed the fork the pick is locked: refused, code lanelocked, and the lane stays long', r3.ok === false && r3.code === 'lanelocked' && J('C.route.lane') === 'long');
  g.run('__mk(1)');
  const r4 = J('campOrder(C, "lane", "long")');
  check('C  a mission with no route refuses it: code nolane', r4.ok === false && r4.code === 'nolane');
  g.run('__mk(0); __go(6); campOrder(C, "lane", "long"); __go(200)');
  const prog = J('C.lane.t1'), ev = J("__ev.filter(e => e.type === 'arrive').length");
  check('C  the long lane is flown to the end: the transport arrives and the mission is won, and the share of the road reads 1', J('C.result') === 'won' && prog === 1 && ev === 1, J('C.result') + ' ' + prog);
  g.run('__mk(0); __go(6); campOrder(C, "lane", "long")');
  const sh = [];
  g.run('window.__sh = []; __go(180, i => { const f = campConvoys(C)[0]; if (f && i % 30 === 0) __sh.push([Math.round(f.x), Math.round(f.y), +(C.lane.t1 || 0).toFixed(3)]); })');
  const s = J('__sh');
  const share = i => s[i] ? s[i][2] : 0;
  check('C  the share of the road climbs steadily on the long lane (never back) and is 0.2 at the fork whichever lane', s.every((p, i) => i === 0 || p[2] >= s[i - 1][2]) && J('C.route.passed') === true);
  g.run('__mk(0); __go(6); campOrder(C, "lane", "short"); __go(60)');
  const t60 = J('C.lane.t1');
  g.run('__mk(0); __go(6); campOrder(C, "lane", "long"); __go(60)');
  const t60b = J('C.lane.t1');
  check('C  both lanes are one share at the same moment before the lanes part (the fork at 0.2): 60 s in, a convoy on either lane is not behind by more than a little', t60 > 0.2 && t60b > 0.2 && Math.abs(t60 - t60b) < 0.06, t60 + ' ' + t60b);
});

sec('D', () => {
  console.log('D. what a lane hides');
  g.run('__mk(0); __go(6); campOrder(C, "lane", "short"); __go(80)');
  check('D  on the short lane the ambush comes by the share of the road: three pirates, ahead of her, with the alarm', J('C.waves[1].started') === true && J('campAliens(C).length') >= 3 && J("__ev.some(e => e.type === 'alarm')"));
  g.run('__mk(0); __go(6); campOrder(C, "lane", "long"); __go(110)');
  check('D  on the long lane the short lane\'s ambush never comes: no pirate, wave 2 never started, no alarm', J('C.waves[1].started') === false && J('campAliens(C).length') === 0 && !J("__ev.some(e => e.type === 'alarm')"));
  g.run('__mk(0); __go(6); campOrder(C, "lane", "long"); __go(120)');
  const w1 = J('campWaveCount(C)');
  check('D  the wave counter counts what can come: on the long lane 1 wave of 1 (the ambush of the other lane is left out); on the short lane 1 of 2', w1.total === 1 && (g.run('__mk(0); __go(6); campOrder(C, "lane", "short")'), J('campWaveCount(C).total') === 2));
  g.run('__mk(0); __go(6); campOrder(C, "lane", "long"); __go(215)');
  check('D  the plain wave after the join comes on every lane (the share 0.9): a skiff on the long lane too, and she still gets through when she is escorted', J('C.waves[0].started') === true);
  g.run('__mk(0)');
  check('D  before any pick the counter counts the default lane (short): 2 waves', J('campWaveCount(C).total') === 2);
});

sec('C2', () => {
  console.log('C2. the convoy orders on the route (card space-game-convoy-orders)');
  g.run('__mk(0); campOrder(C, "lane", "long"); __go(20)');
  const x0 = J('({ x: __tt().x, y: __tt().y })');
  g.run('campOrder(C, "convoy", "hold here"); __go(3)');
  const x1 = J('({ x: __tt().x, y: __tt().y })');
  g.run('__go(6)');
  const x2 = J('({ x: __tt().x, y: __tt().y })');
  check('C2 Hold here stops her on the lane: after the brake she does not move (6 s later within 5 px)', Math.hypot(x2.x - x1.x, x2.y - x1.y) < 5 && Math.hypot(x1.x - x0.x, x1.y - x0.y) > 20, JSON.stringify([x0, x1, x2]));
  g.run('campOrder(C, "convoy", "carry on"); __go(6)');
  const x3 = J('({ x: __tt().x, y: __tt().y })');
  check('C2 Carry on: she flies on along her road again', Math.hypot(x3.x - x2.x, x3.y - x2.y) > 150);
  g.run('campOrder(C, "convoy", "run for it"); __go(8)');
  check('C2 Run for it: she flies faster than her own speed (52 px/s), on the same road', J('Math.hypot(__tt().vx, __tt().vy)') > 52 * 1.3, J('Math.hypot(__tt().vx, __tt().vy)'));
  g.run('__mk(0); __go(42)');
  check('C2 at the fork with no lane chosen she holds; Run for it does not wait for a word: the default lane, said, and she goes on', !!J('campRouteHolding(C)') && (g.run('campOrder(C, "convoy", "run for it"); __go(3)'), J('C.route.lane') === 'short' && J('Math.hypot(__tt().vx, __tt().vy)') > 52));
});

sec('E', () => {
  console.log('E. the scout');
  g.run('__mk(0)');
  const rows = J('campNavRows(C).filter(r => r.kind === "lane").map(r => ({ id: r.id, group: r.group, name: r.name, x: Math.round(r.x), y: Math.round(r.y), lane: r.lane }))');
  const G = J('(() => { const g = campRouteGeo(C); return { s: g.lanes.short.mid, l: g.lanes.long.mid }; })()');
  check('E  the lanes are two rows of the Tab map\'s list, in a group of their own, named for the lane, at the lane\'s middle', rows.length === 2 && rows.every(r => r.group === 'routes') && rows[0].id === 'lane:short' && rows[1].id === 'lane:long' && Math.abs(rows[0].x - G.s.x) < 2 && Math.abs(rows[1].y - Math.round(G.l.y)) < 2 && /Short lane/.test(rows[0].name), JSON.stringify(rows));
  check('E  the Scout order is allowed on a route mission whose row allows only "escort" tasks (the lanes are for scouting): a dry check on a lane with an escort out says yes', (g.run('__esc()'), J('campCheck(C, "scout", campNavRows(C).find(r => r.id === "lane:short")).ok')) === true);
  check('E  and "scout the long lane" finds the lane by its words', J('campCheck(C, "scout", "long lane").ok') === true && J('campCheck(C, "scout", "the short lane").ok') === true);
  g.run('campOrder(C, "scout", campNavRows(C).find(r => r.id === "lane:short")); __go(52)');
  check('E  the scout flew out, read, and said what is on the short lane: "ambush, 3 pirates"', J("__ev.some(e => e.type === 'say' && e.key === 'camp.say.lanefound')") && J("__ev.filter(e => e.type === 'laneread').length") === 1);
  const K = J('C.route.known');
  check('E  what it read is kept (C.route.known.short): three skiffs ahead, no cache; the long lane is still unread', !!K.short && K.short.ships.skiff === 3 && K.short.caches === 0 && !K.long, JSON.stringify(K));
  g.run('__mk(0); __esc(); campOrder(C, "scout", campNavRows(C).find(r => r.id === "lane:long")); __go(60)');
  const K2 = J('C.route.known');
  check('E  the long lane read: quiet, with a cache of 40 ore; the radio said so ("quiet")', !!K2.long && K2.long.caches === 1 && Object.keys(K2.long.ships).length === 0 && J("__ev.some(e => e.type === 'say' && e.key === 'camp.say.lanefound')"), JSON.stringify(K2));
  g.run('__mk(0); __esc(); campOrder(C, "scout", campNavRows(C).find(r => r.id === "lane:long")); __go(90)');
  check('E  the scout carries the cache home: when it lands the 40 ore are in the store and the cache is counted (it may fetch on a lane)', J('C.ore') >= 40 && J('C.cachesGot') === 1, J('C.ore') + ' ' + J('C.cachesGot'));
  g.run('__mk(0); __esc(); __go(1)');
  check('E  a lane row stays in the list until she has passed the fork, then it goes (nothing to scout)', J('campNavRows(C).filter(r => r.kind === "lane").length') === 2 && (g.run('campOrder(C, "lane", "long"); __go(80)'), J('campNavRows(C).filter(r => r.kind === "lane").length') === 0));
});

sec('F', () => {
  console.log('F. the words and the map');
  const src = read('src/campaign.js'), sc = read('src/shipcomputer.js'), md = read('src/campmapdraw.js'), mp = read('src/campmap.js'), bot = read('tools/campaign-bot.mjs');
  const intent = t => J(`campIntent(${JSON.stringify(t)})`);
  check('F  the voice: "take the long lane" is the act fleet_lane with the lane as its word; "use the short route", "go by the short lane" too', JSON.stringify(intent('take the long lane')) === '{"act":"fleet_lane","arg":"long"}' && JSON.stringify(intent('go by the short lane')) === '{"act":"fleet_lane","arg":"short"}' && JSON.stringify(intent('long lane')) === '{"act":"fleet_lane","arg":"long"}', JSON.stringify([intent('take the long lane'), intent('go by the short lane'), intent('long lane')]));
  check('F  a question about lanes is not an order ("what is the long lane")', !/fleet_lane/.test(JSON.stringify(intent('what is the long lane'))));
  check('F  "scout the long lane" and "send a scout to the short route" are scout orders (a lane is a place to scout)', JSON.stringify(intent('scout the long lane')) === '{"act":"fleet_scout","arg":"long lane"}' && JSON.stringify(intent('send a scout to the short route')) === '{"act":"fleet_scout","arg":"short route"}');
  check('F  the computer\'s closed list has fleet_lane and runs it (scFleet)', /fleet_lane/.test(sc) && /fleet_lane: \(s, arg\) => scFleet\(s, 'lane', arg\)/.test(sc));
  check('F  the map draws the lanes: campMapMarks gives each lane a mark with its points, the chosen one flagged; the Take button is in campmapdraw (a click; the key T was taken out of the map with the fork of 1.1: card space-game-cut-lane-fork)', /campRouteMarks/.test(mp) && /type: 'lane'/.test(read('src/camproute.js')) && /m\.type === 'lane'/.test(md) && /btnTake/.test(md) && !/code === 'KeyT'/.test(md));
  check('F  the bot answers the fork: it picks a lane (campaign-bot says lane)', /'lane'/.test(bot));
  g.run('__mk(0); campOrder(C, "lane", "long")');
  const marks = J('campMapMarks(C).filter(m => m.type === "lane").map(m => ({ id: m.id, chosen: !!m.chosen, n: m.pts.length }))');
  check('F  the map has two lane marks while the lanes can still be chosen; the long one is the chosen', marks.length === 2 && marks.find(m => m.id === 'long').chosen === true && marks.find(m => m.id === 'short').chosen === false, JSON.stringify(marks));
});

sec('G', () => {
  console.log('G. the real data: 1.1 of the rim run has no fork any more (card space-game-cut-lane-fork, Troy 22 Nov 2026: "remove picking a lane"); the system stays here, dormant, and the fixture above is what keeps it tested');
  const row = J('campMissionRow(1, 0)');
  check('G  no mission of the game has a route in its row (the system is dormant: a row that writes one still gets its fork, A to F above)', !row.route && [0, 1, 2].every(i => [1, 2, 3].every(lv => !J(`campMissionRow(${lv}, ${i}).route`))));
  g.run('window.C = campNew(1, [], { seed: 1, mission: 0 }); C.god = true; __ev.length = 0; __go(75)');
  check('G  1.1 has no C.route, its transport has no route to fly, and nothing says the road forks', J('C.route') === null && J('campConvoys(C).every(c => !c.rt)') && !J("__ev.some(e => e.type === 'fork' || (e.type === 'say' && /fork/.test(e.key)))") && J('campRouteHolding(C)') === null);
  check('G  the briefing counts what 1.1 sends (8 skiffs: the distress call\'s 2, the ambush\'s 4 and the leader\'s 2; 2 torpedo boats and the pirate leader)', (() => { const e = J('campBriefEnemies(1, 0).list'); const n = k => (e.find(x => x.kind === k) || { n: 0 }).n; return n('skiff') === 2 + 4 + 2 && n('tboat') === 2 && n('pirateleader') === 1; })(), JSON.stringify(J('campBriefEnemies(1, 0).list')));
});

console.log(failed ? `\n${failed} of ${n} checks failed` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
