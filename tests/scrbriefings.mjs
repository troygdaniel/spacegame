// smoke: the other eight missions' four moments in the one-page briefing (piece f of the new screens): the approved words, each moment true against its mission row, numbers that come from the row, positions the map shows (plain Node, no Chrome)
// Card space-game-screens-f-briefings (Troy approved the words on 25 Nov 2026, report section 4 with 2.3's fourth moment "Aliens arrive fast"). Words and data only: a row of CAMPWALKS (src/data_briefwalk.js) with `moments` for each of 1.2, 1.3, 2.1, 2.2,
// 2.3, 3.1, 3.2 and 3.3, and scr.bf.<level>.<mission>.m1 to m4 (content/text/scrbriefings.md). Where a moment is and the numbers in its words are worked out from the mission's own row (src/scrbrief.js scrMomentWhere, scrMomentVars).
//   A. the words: the approved ones, one to four words each, shown and never said; no voiced line changes
//   B. four moments for each of the eight, in order, each of a known kind, each somewhere the mission has, no two on one spot
//   C. true against the row: the numbers (14 seconds, 7 s, the guards, the towers, the waves, the caches) are the row's own and follow it when it changes; 1.2's Works, 2.1's west, 2.3's fast aliens
//   D. the map shows them: the one page's view is fitted to all four; the page's model has four tiles and the word count stays near the mock's
//   E. nothing else moves: the three-screen briefing, the stepped walk of 1.1 and the moments of 1.1 are as they were
// Run: node tests/scrbriefings.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const EIGHT = [[1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]];
const WORDS = { // what Troy approved
  '1.2': ['Mine the rocks', 'Raids come', 'Torpedo boats', 'Dock when clear'], '1.3': ['Haulers leave', 'Pirates keep coming', 'Torpedo boat', 'Something else'],
  '2.1': ['Find two caches', 'Anyone can collect', 'Aliens from west', 'Kill them all'], '2.2': ['Seven guards', 'Reinforcements', 'Missiles help', 'Clear them all'],
  '2.3': ['Enter the ring', 'Hold 20 seconds', 'Keep aliens off', 'Aliens arrive fast'], '3.1': ['Fly to each ring', 'Scan takes 7 s', 'Aliens answer', 'Kill every alien'],
  '3.2': ['Four towers', 'Wing leads', 'Reinforcements', 'Tough towers'], '3.3': ['Eight towers', 'Two waves', 'Wing leads', 'Last battle']
};
const at = (l, i) => l + '.' + (i + 1);

console.log('A. the words');
{
  const md = src('content/text/scrbriefings.md'), keys = [...md.matchAll(/^\| (scr\.bf\.[\w.]+) \| (.*) \|$/gm)].map(m => m[1]);
  check('the file has 32 keys, four for each of the eight missions, none twice', keys.length === 32 && new Set(keys).size === 32 && EIGHT.every(([l, i]) => [1, 2, 3, 4].every(k => keys.indexOf('scr.bf.' + at(l, i) + '.m' + k) >= 0)));
  check('every key reads from the table and is shown, never said (the scr. rule of the voice pack); the description fits its limit (the content check)', keys.every(k => J(`uiText(${JSON.stringify(k)})`) !== k && J(`VOICEPACK_FAMILIES.some(r => r.re.test(${JSON.stringify(k)}) && r.why && !r.spoken)`) === true) && md.split('\n')[3].length <= 600);
  check('the words each moment shows are the approved ones, to the letter, for all eight', EIGHT.every(([l, i]) => J(`campBriefMoments(${l}, ${i}).map(m => m.text)`).join('|') === WORDS[at(l, i)].join('|')), EIGHT.filter(([l, i]) => J(`campBriefMoments(${l}, ${i}).map(m => m.text)`).join('|') !== WORDS[at(l, i)].join('|')).map(([l, i]) => at(l, i) + ' ' + J(`campBriefMoments(${l}, ${i}).map(m => m.text)`).join('/')).join(' ; '));
  check('one to four words each (the pattern of the mock: "Reinforcements" is one), none a sentence', EIGHT.every(([l, i]) => J(`campBriefMoments(${l}, ${i}).every(m => m.text.split(' ').length >= 1 && m.text.split(' ').length <= 4 && !/[.!?]$/.test(m.text))`)));
  check('no voiced line changes: the spoken families are the two goal lines of piece b and nothing new here (every key of this file is shown only)', !/spoken/.test(src('content/text/scrbriefings.md')));
}

console.log('B. four moments each');
{
  const kinds = ['mute', 'help', 'threat', 'goal'];
  check('four for each of the eight, numbered 1 to 4 in order', EIGHT.every(([l, i]) => J(`campBriefMoments(${l}, ${i}).map(m => m.n).join()`) === '1,2,3,4'));
  check('each of a known kind (grey news, amber a call or what helps, pink a danger, gold what you are there for), and every mission has a danger and a goal or news to read', EIGHT.every(([l, i]) => { const k = J(`campBriefMoments(${l}, ${i}).map(m => m.kind)`); return k.every(x => kinds.indexOf(x) >= 0) && k.indexOf('threat') >= 0; }));
  check('each at a real point of the world (a number, not far off the level), and no two within 100 px of each other', EIGHT.every(([l, i]) => { const m = J(`campBriefMoments(${l}, ${i})`); return m.every(x => Number.isFinite(x.at.x) && Number.isFinite(x.at.y) && Math.abs(x.at.x) < 60000 && Math.abs(x.at.y) < 60000) && m.every((a, p) => m.every((b, q) => p >= q || Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y) > 100)); }));
  check('a moment that cannot be placed is left out, not drawn nowhere: a row naming a wave the mission lacks drops that moment (and the rest keep their words)', (() => { g.run(`window.__m = CAMPWALKS['3.1'].moments; CAMPWALKS['3.1'].moments = [{ key: 'm1', kind: 'goal', at: { scan: 0 } }, { key: 'm2', kind: 'goal', at: { wave: 9 } }, { key: 'm3', kind: 'goal', at: { scan: 7 } }];`); const r = J('campBriefMoments(3, 0).map(m => m.text)'); g.run(`CAMPWALKS['3.1'].moments = __m;`); return r.join('|') === 'Fly to each ring'; })());
}

console.log('C. true against the row');
{
  const row = (l, i, f) => g.run(`(() => { const r = campMissionRow(${l}, ${i}); ${f} })()`);
  const words = (l, i) => J(`campBriefMoments(${l}, ${i}).map(m => m.text)`);
  g.run(`window.__rows = (l, i) => CAMP.levels[l].missions[i];`);
  check('2.3: "Hold 20 seconds" (14 until card space-game-23-waves-on-entry) is the relic\'s own hold, and follows it (25 gives "Hold 25 seconds")', words(2, 2)[1] === 'Hold ' + J('campMissionRow(2, 2).relic.hold') + ' seconds' && (g.run(`window.__h = __rows(2, 2).relic.hold; __rows(2, 2).relic.hold = 25;`), words(2, 2)[1] === 'Hold 25 seconds' && (g.run(`__rows(2, 2).relic.hold = __h;`), true)));
  check('3.1: "Scan takes 7 s" is the scan point\'s own seconds (9 gives "Scan takes 9 s"), and there are three rings to fly to', words(3, 0)[1] === 'Scan takes ' + J('campMissionRow(3, 0).objectives[0].points[0].secs') + ' s' && J('campMissionRow(3, 0).objectives[0].points.length') === 3 && (g.run(`window.__p = __rows(3, 0).objectives[0].points[0].secs; __rows(3, 0).objectives[0].points[0].secs = 9;`), words(3, 0)[1] === 'Scan takes 9 s' && (g.run(`__rows(3, 0).objectives[0].points[0].secs = __p;`), true)));
  check('2.2: "Seven guards" counts the guards of the row, and follows it', J('campMissionRow(2, 1).guards.length') === 7 && words(2, 1)[0] === 'Seven guards' && (g.run(`window.__g = __rows(2, 1).guards; __rows(2, 1).guards = __g.slice(0, 5);`), words(2, 1)[0] === 'Five guards' && (g.run(`__rows(2, 1).guards = __g;`), true)));
  check('3.2 and 3.3: "Four towers", "Eight towers" are the towers of the row; 3.3\'s "Two waves" are its two waves', words(3, 1)[0] === 'Four towers' && words(3, 2)[0] === 'Eight towers' && words(3, 2)[1] === 'Two waves' && J('campMissionRow(3, 2).waves.filter(w => !w.optional).length') === 2 && J('campMissionRow(3, 1).towers[0].n') === 4 && J('campMissionRow(3, 2).towers[0].n') === 8);
  check('2.1: "Find two caches" is the objective\'s two (the system has three: the mission asks for two)', J('campMissionRow(2, 0).objectives[0].n') === 2 && words(2, 0)[0] === 'Find two caches');
  check('2.1: "Aliens from west": the first wave comes from the west of where the cruiser starts', (() => { const m = J('campBriefMoments(2, 0)'), s = J('campPlaces(2).arrival'); return m[2].at.x < s.x; })());
  check('2.3: "Aliens arrive fast": the first wave comes as the cruiser enters the ring, from about 1,100 px (on the ring in under 8 s: tests/camprelicwaves.mjs), with no number in the words (Troy\'s call)', J('campMissionRow(2, 2).waves[0].on.held') === 0 && J('Math.hypot.apply(null, campMissionRow(2, 2).waves[0].ring)') < 1300 && !/\d/.test(words(2, 2)[3]));
  check('2.2: "Reinforcements" is the first wave, called by the fourth dead guard (18 seconds in until card space-game-b7-level2), its first group from the north-east; "Missiles help" sits beside the guards', J('campMissionRow(2, 1).waves[0].on.guardsDead') === 4 && (() => { const m = J('campBriefMoments(2, 1)'); return m[1].at.x > m[0].at.x && m[1].at.y < m[0].at.y; })());
  check('1.2: "Torpedo boats" is where the row\'s torpedo-boat wave comes from, and "Dock when clear" keeps the fact that the Works keeps its doors shut while a pirate is near (the line the old briefing says is still in the table)', (() => { const m = J('campBriefMoments(1, 1)'), w = J('campMissionRow(1, 1).waves.find(w => w.ships.tboat).from'); return m[2].at.x === w[0] && m[2].at.y === w[1] && words(1, 1)[3] === 'Dock when clear' && /doors shut while a pirate is near/.test(J(`uiText('camp.bf.1.2.w4')`)); })());
  check('1.2: "Mine the rocks" is where the rock fields are (the middle of the four), and "Raids come" is the first wave\'s side', (() => { const m = J('campBriefMoments(1, 1)'), r = J('campMissionRow(1, 1).rocks'); const cx = r.reduce((a, q) => a + q.at[0], 0) / r.length, cy = r.reduce((a, q) => a + q.at[1], 0) / r.length; return Math.hypot(m[0].at.x - cx, m[0].at.y - cy) < 1 && J('campMissionRow(1, 1).waves[0].from')[0] === m[1].at.x; })());
  check('1.3: the moments lie along the haulers\' road from Ceres to Earth, nearer Ceres first (the haulers leave, the pirates, the torpedo boat), and "Something else" names nothing: no ship in the words', (() => { const m = J('campBriefMoments(1, 2)'), a = J('campPlaces(1).ceres'), d = p => Math.hypot(p.x - a.x, p.y - a.y); return d(m[0].at) < d(m[2].at) && d(m[2].at) < d(m[3].at) && !/raider|alien|drone|gunship|mother/i.test(words(1, 2).join(' ')); })());
  check('no spoiler: no moment of any of the eight names the cloaked caches, anomalies or the ending', EIGHT.every(([l, i]) => !/anomal|cloak|reveal|secret|outpost|home world|truth/i.test(words(l, i).join(' '))));
}

console.log('D. the map shows them, and the page');
{
  g.run(`window.__PR = campProgressNew(); window.__kinds = (n, k) => { const out = []; (function w(x) { if (!x) return; if (x.k === k) out.push(x); (x.kids || []).forEach(w); })(n); return out; };`);
  check('the one page\'s view is fitted to the route and all four moments: every one is inside the map\'s frame, for all eight (and for 1.1)', EIGHT.concat([[1, 0]]).every(([l, i]) => J(`(() => { const Y = campBriefLayers(${l}, ${i}), m = campBriefMoments(${l}, ${i}); Y.moments = m; const F = SCRBRIEF.frame, v = campBriefView(Y, 0, 1, undefined, undefined, F); return m.every(x => { const q = campMapPoint(v.fit, F, x.at.x, x.at.y); return q.x >= F.x && q.x <= F.x + F.w && q.y >= F.y && q.y <= F.y + F.h; }); })()`)));
  check('without moments the bounds are what they were (the three screens): a layer with no moments gives the same area', EIGHT.every(([l, i]) => J(`(() => { const Y = campBriefLayers(${l}, ${i}), a = campBriefBounds(Y, 0); Y.moments = []; return JSON.stringify(campBriefBounds(Y, 0)) === JSON.stringify(a); })()`)));
  check('the page\'s model has four tiles with a ring each, the heading, the bonus pills of the mission\'s own row, and stays within the word budget, for all eight', EIGHT.every(([l, i]) => { g.run(`window.__bm = scrBriefModel(__PR, { t: { level: ${l}, i: ${i}, replay: false, skipped: false }, brief: campHubBrief(__PR, ${l}, ${i}), moments: campBriefMoments(${l}, ${i}) });`); return J('__kinds(__bm, "tile").length') === 4 && J('__kinds(__bm, "ring").filter(r => /^[1-4]$/.test(String(r.text))).length') >= 4 && J('scrNodeWords(__bm)') <= J(`scrWordsMax('brief')`) && J('__kinds(__bm, "pill").length') === J(`campMissionRow(${l}, ${i}).bonus.length`); }));
  check('every bonus pill reads in the short words with no placeholder left (Under 1:40, No ships lost, Find the cloaked cache ...)', EIGHT.every(([l, i]) => J(`campMissionRow(${l}, ${i}).bonus.every(b => !/[{}]|undefined|NaN/.test(scrBonusText(b)))`)));
  g.run(`window.__texts = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'text') out.push(x.text); (x.kids || []).forEach(w); })(n); return out; };`);
  check('the goal line under the title is the mission\'s own: the new words for 1.2 ("Mine Ceres, sell the ore."), the old b1 for the other seven (Troy: only 1.1 and 1.2 change their words)', EIGHT.every(([l, i]) => { g.run(`window.__bm = scrBriefModel(__PR, { t: { level: ${l}, i: ${i}, replay: false, skipped: false }, brief: campHubBrief(__PR, ${l}, ${i}), moments: [] });`); return J('__texts(__bm)[2]') === (at(l, i) === '1.2' ? 'Mine Ceres, sell the ore.' : J(`uiText('camp.m.${l}.${i + 1}.b1')`)); }));
}

console.log('E. nothing else moves');
{
  check('only 1.1 has a stepped walk (the three-screen briefing keeps the other eight when the switch is off): campWalkData answers null for them', J('campWalkData(1, 0).steps.length') === 6 && EIGHT.every(([l, i]) => J(`campWalkData(${l}, ${i})`) === null));
  check('1.1\'s four moments are unchanged: Patrol leaves, A miner may call, Ambush likely, Pirate leader', J('campBriefMoments(1, 0).map(m => m.text)').join('|') === 'Patrol leaves|A miner may call|Ambush likely|Pirate leader');
  check('the old words of the eight are all still there for the screens of today (camp.bf.<level>.<mission>.w1 and the b1 and b2 lines)', EIGHT.every(([l, i]) => J(`uiText('camp.bf.${l}.${i + 1}.w1')`) !== 'camp.bf.' + l + '.' + (i + 1) + '.w1' && J(`uiText('camp.m.${l}.${i + 1}.b1')`) !== 'camp.m.' + l + '.' + (i + 1) + '.b1'));
  check('the old camp.m.1.2.b1 keeps its words and recording (Troy\'s new line is scr.m.1.2.goal, piece b)', J(`uiText('camp.m.1.2.b1')`) === 'Mine ore at Ceres and sell it at the Works.');
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
