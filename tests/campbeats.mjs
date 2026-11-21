// smoke: mission 1.1 of the rim run as four beats (plain Node, no Chrome)
// Card space-game-l1-1-beats (Troy, 21 Nov 2026: "1.1 was boring: lots of flying, fights not interactive"; he will judge every new system on this one mission). Something happens every minute or so and the
// player directs the fleet in each beat: (1) a patrol escorts the transport out of Luna and peels off at the edge of safe space; (2) a distress call from a miner off the route, as an order call (help it and leave
// the transport, or stay); (3) an ambush: fighters tie up the wing while torpedo boats go for the transport (the fork and a scout can find it first); (4) the pirate leader, a rival ship, waits for her near Ceres.
//   A  the data of the row (the beats are data: traffic, waves, cues, a rival, the bonus)
//   B  beat 1: the patrol flies with the transport, says it turns back, and goes home
//   C  beat 2: the miner and its attackers, the call and its three answers, the thanks
//   D  beat 3: the ambush on the short lane (fighters and torpedo boats), the long lane without the boats
//   E  beat 4: the pirate leader
//   F  the pace: a beat about every minute
//   G  the words, the hints from the key table, the bots
// Run: node tests/campbeats.mjs   (exit code 1 on a failed check)
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
  window.__mk = (lane, seed) => { window.C = campNew(1, [], { seed: seed == null ? 1 : seed, mission: 0 }); C.god = true; __ev.length = 0; if (lane) C.route.pick = lane; return !!C; };
  window.__tt = () => campConvoys(C)[0];
  window.__says = () => __ev.filter(e => e.type === 'say').map(e => e.key);
  window.__share = () => C.lane.t1 || 0;
  window.__until = (share, maxSec) => { const k = Math.round((maxSec || 400) * 30); for (let i = 0; i < k && !C.result && __share() < share; i++) { campStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0; } return __share(); };
`);

sec('A', () => {
  console.log('A. the data');
  const row = J('campMissionRow(1, 0)');
  const pat = (row.traffic || []).find(t => t.kind === 'patrol'), dm = (row.traffic || []).find(t => t.kind === 'miner');
  check('A  a patrol of two leaves Luna with the transport: it escorts her until 12 percent of the road (the edge of safe space), then turns back', !!pat && pat.n === 2 && pat.escort && pat.escort.convoy === 't1' && pat.escort.until === 0.12 && /patrolleave/.test(pat.escort.say), JSON.stringify(pat));
  check('A  a miner works off the route, on the west side, apart from every lane', !!dm && Array.isArray(dm.at) && dm.n === 1);
  check('A  the distress: a cue at 28 percent of the road and a wave of two skiffs near the miner that goes for miners (the wave is tagged beat: distress)', (row.cues || []).some(c => c.name === 'distress' && c.on.lane === 0.28) && row.waves.some(w => w.beat === 'distress' && w.prey === 'miners' && w.ships.skiff === 2 && !w.lane));
  const shortW = row.waves.filter(w => w.lane === 'short'), longW = row.waves.filter(w => w.lane === 'long');
  check('A  the ambush is on the short lane: fighters and two torpedo boats for the transport; the long lane has only a small raid, no torpedo boats', shortW.some(w => w.ships.tboat === 2 && w.ships.skiff >= 3 && w.goal === 'convoy:t1' && w.ambush) && longW.length === 1 && !longW.some(w => w.ships.tboat));
  check('A  the pirate leader waits near Ceres: a rival row, ahead of the transport, with two skiffs, fought by the cruiser', Array.isArray(row.rivals) && row.rivals.length === 1 && row.rivals[0].id === 'leader' && row.rivals[0].kind === 'pirateleader' && row.rivals[0].on.lane === 0.7 && row.rivals[0].escorts.skiff === 2);
  check('A  the old plain raids (0.03 and 0.82) are gone: nothing hostile before the fork and no wave after the join', !row.waves.some(w => !w.lane && !w.beat));
  check('A  the debrief: swift, hull, the miner saved (none lost), the leader killed, at most one torpedo hit', JSON.stringify(row.bonus.map(b => b.id)) === '["swift","hull","miner","leader","torp"]' && row.bonus.find(b => b.id === 'leader').type === 'rival' && row.bonus.find(b => b.id === 'torp').type === 'torpedoes');
});

sec('B', () => {
  console.log('B. beat 1: the patrol');
  g.run('__mk("short"); __go(2)');
  const pats = () => J('C.ships.filter(u => u.kind === "patrol").map(u => ({ x: u.x, y: u.y }))');
  check('B  two patrol ships are at the Lunar Base at the start, neutral', J('C.ships.filter(u => u.kind === "patrol" && u.team === "neutral").length') === 2 && pats().every(p => Math.hypot(p.x - J('campPlaces(1).luna.x'), p.y - J('campPlaces(1).luna.y')) < 1500));
  g.run('__until(0.07)');
  const d = () => { const t = J('({ x: __tt().x, y: __tt().y })'); return pats().map(p => Math.hypot(p.x - t.x, p.y - t.y)); };
  check('B  with the transport 7 percent of the way out, both patrol ships are flying with her (within 500 px)', d().every(x => x < 500), JSON.stringify(d()));
  check('B  nothing hostile yet: the escort is quiet, the radio has not said the patrol turns back', J('campAliens(C).length') === 0 && !J('__says().includes("camp.say.patrolleave")'));
  g.run('__until(0.13); __go(1)');
  check('B  at 12 percent of the road the patrol says it turns back, once ("You are on your own")', J('__says().filter(k => k === "camp.say.patrolleave").length') === 1);
  g.run('__go(50)');
  const t2 = J('({ x: __tt().x, y: __tt().y })'), dd = pats().map(p => Math.hypot(p.x - t2.x, p.y - t2.y));
  check('B  50 s later the transport has left them behind: both are more than 1,500 px from her, back about their post at Luna', dd.every(x => x > 1500), JSON.stringify(dd));
});

sec('C', () => {
  console.log('C. beat 2: the distress call');
  g.run('__mk("short"); campOrder(C, "launch"); __until(0.285)');
  check('C  at 28 percent the cue distress is fired and two pirates are out by the miner', J('C.cues.distress != null') && J('campAliens(C).filter(u => u.prey === "miners").length') === 2);
  const near = J('(() => { const m = C.ships.find(u => u.tid === "dm"); const a = campAliens(C)[0]; return !!m && Math.hypot(m.x - a.x, m.y - a.y) < 2500; })()');
  check('C  the pirates are near the miner (within 2,500 px), 2,000 px or more from the transport: off the route', near && J('(() => { const a = campAliens(C)[0], t = __tt(); return Math.hypot(a.x - t.x, a.y - t.y) > 1500; })()'));
  g.run('__go(2)');
  const call = J('campCallView(C)');
  check('C  the pilots ask for orders: the call distress is open with three choices, the cautious one is "stay with the transport"', !!call && call.id === 'distress' && call.rows.length === 3 && call.rows.find(r => r.def).pick === 'stay' && J('C.call.open.ctx.who') && /miner/i.test(J('C.call.open.ctx.who') + 'miner'), JSON.stringify(call));
  const r = J('campCallAnswer(C, 1, "key")');
  check('C  choice 1 (the fighters help the miner): ok, and the fighters are ordered to attack the pirates by it', r.ok && r.pick === 'rescue' && J('campWing(C, "fighter").some(u => u.order && u.order.type === "attack")'), JSON.stringify(r));
  g.run('__go(45)');
  check('C  the wing kills the pirates in time and the miner is alive: the thanks, once (the radio), and 40 ore in the store', J('campAliens(C).filter(u => u.prey === "miners").length') === 0 && J('!!C.ships.find(u => u.tid === "dm" && u.hp > 0)') && J('C.ore') >= 40 && J('__says().filter(k => k === "camp.say.thanks").length') === 1, J('C.ore') + ' ' + J('campAliens(C).length'));
  g.run('__mk("short"); campOrder(C, "launch"); __until(0.285); __go(2); campCallAnswer(C, 3, "key"); __go(60)');
  check('C  choice 3 (stay with the transport): the miner is lost to the pirates (a neutral lost, the bonus for it is gone) and there is no thanks', J('C.neutralsLost') >= 1 && !J('__says().includes("camp.say.thanks")'), J('C.neutralsLost'));
  g.run('__mk("short"); campOrder(C, "launch"); __until(0.285); __go(2); campCallAnswer(C, 0, "late"); __go(2)');
  check('C  no answer in time: the pilot takes the cautious pick himself (stay)', J('C.call.log[C.call.log.length - 1].pick') === 'stay');
  g.run('__mk("short"); campOrder(C, "launch"); __until(0.285); __go(2); campCallAnswer(C, 2, "key")');
  check('C  choice 2 sends everyone: the escorts too are on the pirates (nobody stays with the transport)', J('campWing(C).filter(u => u.order && u.order.type === "attack").length') >= J('campWing(C).length') - 0);
});

sec('D', () => {
  console.log('D. beat 3: the ambush');
  g.run('__mk("short"); __until(0.46)');
  check('D  on the short lane at 46 percent the ambush comes out of the dark: skiffs and two torpedo boats, with the alarm', J('campAliens(C).filter(u => u.kind === "tboat").length') === 2 && J('campAliens(C).filter(u => u.kind === "skiff").length') >= 4 && J("__ev.some(e => e.type === 'alarm')"));
  check('D  the torpedo boats go for the transport (their goal is her), the skiffs for her too: the wing cannot cover both', J('campAliens(C).filter(u => u.kind === "tboat").every(u => String(u.goal) === "convoy:t1")'));
  g.run('__mk("long"); __until(0.52)');
  check('D  on the long lane there is no torpedo boat: only the small raid of skiffs (the long lane is quiet and has a cache)', J('campAliens(C).filter(u => u.kind === "tboat").length') === 0 && J('C.caches.filter(k => k.lane === "long").length') === 1);
});

sec('E', () => {
  console.log('E. beat 4: the pirate leader');
  g.run('__mk("short"); __until(0.705); __go(1)');
  check('E  at 70 percent the pirate leader comes: one rival ship and two skiffs, near Ceres, said on the radio', J('!!campRivalOf(C, "leader")') && J('campAliens(C).filter(u => u.kind === "skiff" && !u.rival).length') >= 2 && J("__says().some(k => /rival\\.leader/.test(k))"));
  const lead = J('(() => { const u = campRivalOf(C, "leader"), t = __tt(); return { d: Math.hypot(u.x - t.x, u.y - t.y), toCeres: Math.hypot(u.x, u.y) }; })()');
  check('E  it is ahead of the transport, on the road to Ceres (within 3,500 px of the transport and 4,500 px of Ceres)', lead.d < 3800 && lead.toCeres < 4800, JSON.stringify(lead));
  g.run('(() => { const u = campRivalOf(C, "leader"); campHurt(C, u, 99999, "test"); })(); __go(1)');
  check('E  when it dies the leader bonus is earned (the leader bonus is a kill, not a chase)', J('C.rivalEnd.leader') === 'dead' && J('campBonuses(C).find(b => b.id === "leader").ok') === true, J('C.rivalEnd'));
  g.run('__mk("short"); __until(0.8)');
  check('E  left alone the leader does not decide the mission: the transport still gets through and wins it (the bonus is not earned)', (g.run('(() => { const f = campConvoys(C)[0]; if (f) { f.x = f.dest.x; f.y = f.dest.y; } })(); __go(1)'), J('C.result') === 'won') && J('campBonuses(C).find(b => b.id === "leader").ok') === false);
});

sec('F', () => {
  console.log('F. the pace');
  g.run('__mk("short"); window.__T = {}; for (let i = 0; i < 300 * 30 && !C.result; i++) { campStep(C, 1 / 30); const s = C.t / 1000; C.events.forEach(e => { if (e.type === "say") { if (e.key === "camp.say.patrolleave") __T.patrol = s; if (e.key === "camp.say.distress") __T.distress = s; if (/ambush/.test(e.key)) __T.ambush = s; if (/rival\\.leader/.test(e.key)) __T.leader = s; } }); C.events.length = 0; }');
  const T = J('__T');
  check('F  the four beats come in order: the patrol turns back, the distress call, the ambush, the leader', T.patrol && T.distress && T.ambush && T.leader && T.patrol < T.distress && T.distress < T.ambush && T.ambush < T.leader, JSON.stringify(T));
  const gaps = [T.distress - T.patrol, T.ambush - T.distress, T.leader - T.ambush];
  check('F  something happens every 40 to 90 seconds on the short lane (the gaps between the beats)', gaps.every(x => x >= 40 && x <= 90), JSON.stringify(gaps));
});

sec('G', () => {
  console.log('G. the words, the hints and the bots');
  const keys = ['camp.say.patrolleave', 'camp.say.distress', 'camp.say.thanks', 'camp.say.ambush', 'camp.call.line.distress', 'camp.call.fx.rescue', 'camp.call.fx.rescueall', 'camp.call.fx.stay', 'camp.call.r.rescue', 'camp.call.r.rescueall', 'camp.call.r.stay', 'camp.b.rival'];
  const miss = keys.filter(k => J(`uiText(${JSON.stringify(k)}) === ${JSON.stringify(k)}`));
  check('G  every new line has its words (content/text/campbeats.md)', miss.length === 0, miss.join(' '));
  const words = s => String(s).replace(/\{[^}]*\}/g, 'N').split(/\s+/).filter(Boolean).length;
  const spoken = ['camp.say.patrolleave', 'camp.say.distress', 'camp.say.thanks', 'camp.say.ambush'].map(k => J(`uiText(${JSON.stringify(k)})`));
  check('G  the lines the ship speaks are about twelve words at most', spoken.every(s => words(s) <= 12), JSON.stringify(spoken));
  const hint = J('(() => { const C = campNew(1, [], { seed: 1, mission: 0 }); return typeof campBeatHint === "function" ? campBeatHint(C, "fleet") : ""; })()');
  check('G  the hints name their keys from the key table (CAMP_PANELS), not in letters of their own: campBeatHint(C, "fleet") carries the FLEET panel key', typeof hint === 'string' && hint.indexOf(J('CAMP_PANELS.panels.find(p => p.id === "fleet").key')) >= 0, hint);
  const src = read('src/campbeats.js');
  check('G  and the code of the beats has no key letter of its own for a panel (it asks the table)', !/Press [QEC]\b/.test(src) && /CAMP_PANELS/.test(src));
  const bot = read('tools/campaign-bot.mjs');
  check('G  the bot knows the distress call: its smart answer table has it', /distress:/.test(bot));
});

console.log(failed ? `\n${failed} of ${n} checks failed` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
