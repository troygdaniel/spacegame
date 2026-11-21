// smoke: the Campaign's ranks: six, from the scores of the missions flown, a promotion line, and a bigger wing at each rank (plain Node, no Chrome)
// Card space-game-campaign-ranks (src/campranks.js; CAMP.ranks and the wing in src/campaign.js; the scene's debrief in src/campaignscene.js). The ranks are data. The points are the best
// scores of the missions flown, added up; nothing is saved for the rank (it is read from the results, which are saved by the missions card); each rank gives extra fighters and escorts to
// the bay and lifts the wing limit; the debrief says the promotion; the hub (5-GEN's ready room) reads campRankStatus.
//   A. the table and the words
//   B. the points and the rank
//   C. campRankStatus: what the hub reads
//   D. the wing: the bay and the limit at each rank
//   E. the promotion: at the debrief, in the scene, in the save
//   F. balance: the missions stay a fight at the top rank
// Run: node tests/campranks.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a pilot's state with results adding up to `pts`, in the shape of the missions card (P.results: { '<level>.<mission>': { score, bonuses, t, hull, lost, tries } })
g.run(`
  window.__P = (pts, extra) => { const P = campProgressNew(); const per = Math.ceil(pts / 3) || 0; if (pts > 0) { ['1.1', '1.2', '1.3'].forEach((k, i) => { P.results[k] = { score: i < 2 ? per : pts - 2 * per, bonuses: [], t: 100, hull: 500, lost: 0, tries: 1 }; }); } return Object.assign(P, extra || {}); };
`);

// ---------- A. the table and the words ----------
console.log('A. the table and the words');
{
  const R = J('CAMP.ranks');
  check('six ranks, in the table: cadet, ensign, lieutenant, commander, captain, commodore', R.map(r => r.id).join() === 'cadet,ensign,lieutenant,commander,captain,commodore', R.map(r => r.id).join());
  check('the first is held from 0 points and gives nothing; each one needs more points than the last', R[0].at === 0 && R[0].fighters === 0 && R[0].escorts === 0 && R.every((r, i) => i === 0 || r.at > R[i - 1].at), R.map(r => r.at).join());
  check('and gives at least what the last gave, fighters and escorts, and more of one of them: a rank is always worth having', R.every((r, i) => i === 0 || (r.fighters >= R[i - 1].fighters && r.escorts >= R[i - 1].escorts && r.fighters + r.escorts > R[i - 1].fighters + R[i - 1].escorts)), R.map(r => r.fighters + '/' + r.escorts).join(' '));
  check('every line of the table has a comment, and the table is in the one CAMP, near the top, before any code', (() => { const s = src('src/campaign.js'), i = s.indexOf('  ranks: ['), j = s.indexOf('  beamHum: {'); return i > 0 && j > i && s.slice(i, j).split('\n').filter(l => l.trim()).every(l => l.includes('//') || l.trim() === '],'); })());
  const md = src('content/text/campaign-ranks.md'), keys = R.map(r => 'camp.rank.' + r.id).concat(R.slice(1).map(r => 'camp.rank.' + r.id + '.promo'), ['camp.ui.promoted', 'camp.ui.rank', 'camp.ui.ranktop']);
  check('every rank has a name and (but the first) a promotion line, and the debrief and hub lines are there, in content/text/campaign-ranks.md and in the game', keys.every(k => md.includes('| ' + k + ' |') && J(`uiText('${k}')`) !== k), keys.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k).join());
  check('the names are plain: Cadet, Ensign, Lieutenant, Commander, Captain, Commodore', ['cadet', 'ensign', 'lieutenant', 'commander', 'captain', 'commodore'].map(k => J(`uiText('camp.rank.${k}')`)).join() === 'Cadet,Ensign,Lieutenant,Commander,Captain,Commodore');
  check('the file is loaded by the page and not ui.md (which is at its 200 rows)', /src\/campranks\.js/.test(src('index.html')) && !/camp\.rank\./.test(src('content/text/ui.md')));
}

// ---------- B. the points and the rank ----------
console.log('B. the points and the rank');
{
  check('no results, no points: a cadet', J('campPoints(campProgressNew())') === 0 && J('campRank(campProgressNew()).id') === 'cadet' && J('campRank(campProgressNew()).i') === 0);
  check('the points are the best scores of the missions flown, added up', J(`campPoints(__P(0, { results: { '1.1': { score: 1200 }, '1.2': { score: 1500 }, '2.1': { score: 900 } } }))`) === 3600);
  check('junk in the results is not points (no score, a string, a negative), and nothing throws on a state with none', J(`campPoints({ results: { a: null, b: { score: 'x' }, c: { score: -50 }, d: { score: 700 } } })`) === 700 && J('campPoints({})') === 0 && J('campPoints(null)') === 0);
  const at = [[0, 0], [999, 0], [1000, 1], [3499, 1], [3500, 2], [6499, 2], [6500, 3], [9999, 3], [10000, 4], [13999, 4], [14000, 5], [99999, 5]];
  check('a rank is held from its points, and not before (one under is still the rank below)', at.every(([p, i]) => J(`campRankAt(${p})`) === i), at.filter(([p, i]) => J(`campRankAt(${p})`) !== i).join(' | '));
  check('the rank of a pilot: its index, id, name, points, the points it is held from and its extras', JSON.stringify(J('campRank(__P(4200))')) === JSON.stringify({ i: 2, id: 'lieutenant', name: 'Lieutenant', points: 4200, at: 3500, fighters: 2, escorts: 1 }), JSON.stringify(J('campRank(__P(4200))')));
  check('a mission flown again with a worse score does not lower it: the result keeps its best (the missions card), so the rank only goes up', (() => {
    g.run(`window.__Q = __P(0); __Q.results['1.1'] = { score: 1800, bonuses: [], t: 90, hull: 500, lost: 0, tries: 1 }; window.__r0 = campRank(__Q).i;
      campMissionDone(__Q, 1, 0, { score: 1000, bonuses: [], t: 200, hullLeft: 300, shipsLost: 3 }); window.__r1 = campRank(__Q).i; window.__p1 = campPoints(__Q);
      campMissionDone(__Q, 1, 0, { score: 2000, bonuses: [], t: 80, hullLeft: 500, shipsLost: 0 }); window.__p2 = campPoints(__Q)`);
    return J('__p1') === 1800 && J('__p2') === 2000 && J('__r1') >= J('__r0');
  })());
}

// ---------- C. what the hub reads ----------
console.log('C. campRankStatus: what the hub reads');
{
  const s = J('campRankStatus(__P(4000))');
  check('the shape 5-GEN\'s ready room reads: { name, n, of, points, next, nextName, wing: { fighters, escorts } }', Object.keys(s).sort().join() === 'next,nextName,n,name,of,points,wing'.split(',').sort().join() && Object.keys(s.wing).sort().join() === 'escorts,fighters', Object.keys(s).join());
  check('a lieutenant with 4,000 points: rank 3 of 6, the commander is at 6,500, and the wing is the bay (6 and 2) and the rank\'s extras (2 and 1)', s.name === 'Lieutenant' && s.n === 3 && s.of === 6 && s.points === 4000 && s.next === 6500 && s.nextName === 'Commander' && s.wing.fighters === 8 && s.wing.escorts === 3, JSON.stringify(s));
  const top = J('campRankStatus(__P(20000))');
  check('at the top there is no next: next is null, nextName is empty, and the wing has all the extras (5 and 3)', top.n === 6 && top.next === null && top.nextName === '' && top.wing.fighters === 11 && top.wing.escorts === 5, JSON.stringify(top));
  const w = J(`campRankStatus(__P(4000, { techs: ['bay2'], bonus: { fighters: 2, escorts: 1 } })).wing`);
  check('the wing counts everything the next mission starts with: the second-bay tech (four fighters), the extras of the refit, and the rank', w.fighters === 6 + 4 + 2 + 2 && w.escorts === 2 + 1 + 1, JSON.stringify(w));
  check('with no results at all it is a cadet with the plain bay: a new pilot', J('campRankStatus(campProgressNew()).n') === 1 && J('campRankStatus(campProgressNew()).wing.fighters') === 6 && J('campRankStatus(campProgressNew()).wing.escorts') === 2);
  // the two cards together (the hub, src/camphub.js, reads this status): the room shows the real rank, its next rank, the score and the wing the next mission starts with
  const hk = J('(() => { const P = __P(4000); return { r: campHubRank(P), note: CAMP_HUB.note.rank(P) }; })()');
  check('the ready room reads the real ranks: ranked, Lieutenant 3 of 6, 4,000 points, the commander next at 6,500, and its wing note and rank row say the rank', hk.r.ranked === true && hk.r.name === 'Lieutenant' && hk.r.n === 3 && hk.r.of === 6 && hk.r.points === 4000 && hk.r.next === 6500 && hk.r.nextName === 'Commander' && hk.r.wing.fighters === 8 && hk.r.wing.escorts === 3 && hk.note === 'Lieutenant', JSON.stringify(hk));
  check('and a new pilot in the room is a Cadet with the plain wing (6 and 2) and the next rank at 1,000', J('campHubRank(campProgressNew()).name') === 'Cadet' && J('campHubRank(campProgressNew()).next') === 1000 && J('campHubRank(campProgressNew()).wing.fighters') === 6);
}

// ---------- D. the wing ----------
console.log('D. the wing: the bay and the limit');
{
  g.run(`window.__rankC = (rank, techs, bonus) => { window.C = campNew(1, techs || [], { seed: 1, rank, bonus }); return C; }`);
  const R = J('CAMP.ranks'), rows = R.map((r, i) => { g.run(`__rankC(${i})`); return { i, f: J('C.bay.fighters'), e: J('C.bay.escorts'), capf: J('C.cap.fighters'), cape: J('C.cap.escorts'), rank: J('C.rank') }; });
  check('a battle starts with the rank\'s wing in the bay: 6 and 2 and the extras of each rank, and says its rank', rows.every(x => x.f === 6 + R[x.i].fighters && x.e === 2 + R[x.i].escorts && x.rank === x.i), JSON.stringify(rows.map(x => x.f + '/' + x.e)));
  check('and the wing limit goes up with it: 14 and 6 (the workshop\'s) and the rank\'s extras', rows.every(x => x.capf === 14 + R[x.i].fighters && x.cape === 6 + R[x.i].escorts), JSON.stringify(rows.map(x => x.capf + '/' + x.cape)));
  check('no rank given is a cadet: the old bay, as every battle before the ranks (a battle of a test, an address)', (g.run('window.C = campNew(1, [], { seed: 1 })'), J('C.bay.fighters') === 6 && J('C.bay.escorts') === 2 && J('C.rank') === 0));
  check('a rank out of range is held to the table (below 0 the cadet, over the last the commodore)', (g.run('__rankC(-4)'), J('C.rank') === 0) && (g.run('__rankC(99)'), J('C.rank') === 5 && J('C.bay.fighters') === 11));
  check('the second-bay tech and the extras of the refit add to the rank\'s, and all three together are in the bay', (g.run(`__rankC(2, ['bay2'], { fighters: 2, escorts: 1 })`), J('C.bay.fighters') === 6 + 4 + 2 + 2 && J('C.bay.escorts') === 2 + 1 + 1));
  g.run('__rankC(2)'); g.run('C.waves.forEach(w => { w.started = true; }); campOrder(C, "launch")');
  check('Launch puts the whole wing out: the bay of the rank, one ship every 0.6 s', J('C.launchQ.length') === 11, J('C.launchQ.length'));
  // ships are built docked at an outpost (card space-game-campaign-outposts: campCanBuild), so the carrier of these checks is docked
  const build = rank => { g.run(`__rankC(${rank}); C.docked = true; C.waves.forEach(w => { w.started = true; }); C.ore = 200; window.__ok = 0; for (let i = 0; i < 40; i++) { C.ore = 200; const r = campOrder(C, 'build', 'a fighter'); if (r.ok) __ok++; else { window.__code = r.code; break; } }`); return { ok: J('__ok'), code: J('__code'), total: J('C.bay.fighters + C.build.queue.length') }; };
  const b0 = build(0), b5 = build(5);
  check('the workshop builds up to the limit of the rank, and then says the wing is full: a cadet to 14 fighters, a commodore to 19', b0.total === 14 && b5.total === 19 && b0.code === 'buildfull' && b5.code === 'buildfull', JSON.stringify([b0, b5]));
  const e5 = (g.run(`__rankC(5); C.docked = true; C.ore = 200; window.__eok = 0; for (let i = 0; i < 40; i++) { C.ore = 200; const r = campOrder(C, 'build', 'an escort'); if (r.ok) __eok++; else break; }`), J('C.bay.escorts + C.build.queue.length'));
  check('and the escorts the same way: a commodore to 6 plus its 3', e5 === 9, e5);
}

// ---------- E. the promotion ----------
console.log('E. the promotion: the debrief, the scene, the save');
{
  const sc0 = src('src/campaignscene.js');
  check('campRankPromoted says when a mission took the pilot up: from the rank it was to the rank it is, and nothing when it did not', JSON.stringify(J('campRankPromoted(0, __P(1000))')) === '{"from":0,"to":1}' && J('campRankPromoted(0, __P(999))') === null && J('campRankPromoted(1, __P(1500))') === null && JSON.stringify(J('campRankPromoted(0, __P(7000))')) === '{"from":0,"to":3}' && J('campRankPromoted(3, __P(100))') === null);
  g.run(`window.__PP = __P(1200); __PP.promo = { from: 0, to: 1 }`);
  const line = J('campRankLine(__PP, {})');
  check('the debrief line of a promotion: PROMOTED, the new rank, the bay it brings, and the rank\'s own line under it', /^PROMOTED: Ensign\. The bay holds 7 fighters and 2 escorts\.\nCommand has noticed the way you fly\.$/.test(line), line);
  g.run(`window.__PP = __P(4200)`);
  check('with no promotion it says the rank, the points (with a comma) and what the next one needs', J('campRankLine(__PP, {})') === 'Rank: Lieutenant   4,200 points   next: Commander at 6,500', J('campRankLine(__PP, {})'));
  check('at the top it says so', J('campRankLine(__P(15500), {})') === 'Rank: Commodore   15,500 points   the highest rank', J('campRankLine(__P(15500), {})'));
  // the scene, on a stand-in: a mission won sets the promotion, the debrief is handed the state, the next battle starts with the rank's wing
  g.run(`
    window.__sc = (pts) => { const f = Object.create(Campaign.prototype); f.level = 1; f.mi = 0; f.P = __P(pts); f.opts = { seed: 1 }; f.shown = []; f.showDebrief = function (sc) { this.shown.push(sc.score); }; f.showWon = function () { this.shown.push('won'); };
      f.camp = { L: { objectives: [{ type: 'clear' }] }, score: { score: 1100, bonuses: [], t: 100, hullLeft: 500, shipsLost: 0 }, ore: 5 }; return f; };
    window.__f = __sc(0); Campaign.prototype.missionWon.call(__f);
  `);
  check('a mission won at the scene: the result is kept, and the promotion is on the state for the debrief (a cadet who scores 1,100 is an ensign)', J('__f.P.results["1.1"].score') === 1100 && JSON.stringify(J('__f.P.promo')) === '{"from":0,"to":1}' && J('__f.shown[0]') === 1100, JSON.stringify(J('__f.P.promo')));
  // the win must be in the SAVE the moment it is won: a trailing comment once swallowed this.P.ore and campProgressSave in missionWon, and the ready room (src/camphub.js), which reads the save, found no result (card space-game-campaign-ranks, found at the first boot of the bundle)
  const won = JSON.parse(store.get('longhaul.campaign') || 'null');
  check('the win is SAVED at once: the result of mission 1 (score 1,100, one try) is in the save, and the ore of the battle (5) is carried; a save without the result is the bug that broke the hub', won && won.results && won.results['1.1'] && won.results['1.1'].score === 1100 && won.results['1.1'].tries === 1 && won.ore === 5 && won.mission === 1 && !('promo' in won), JSON.stringify(won));
  check('and the scene line that does it is plain code, not the tail of a comment: this.P.ore and campProgressSave each start a statement of missionWon', (() => { const m = /missionWon\(\) \{[\s\S]*?\n  \}\n/.exec(sc0)[0].split('\n'); return m.some(l => /^\s*this\.P\.ore = Math\.floor\(C\.ore\);/.test(l)) && m.some(l => /^\s*campProgressSave\(this\.P\);/.test(l)); })());
  g.run(`window.__f2 = __sc(1500); __f2.camp.score.score = 100; Campaign.prototype.missionWon.call(__f2)`);
  check('one that does not cross a rank sets none (an ensign who scores 100 more stays an ensign)', J('__f2.P.promo') === null && J('__f2.P.results["1.1"].score') >= 100);
  g.run(`window.__f3 = __sc(4200); window.__c3 = __f3.makeCamp()`);
  check('the next battle is made with the rank of the state (4,200 points: a lieutenant, 8 and 3 in the bay), and the promotion of the last debrief is cleared', J('__c3.rank') === 2 && J('__c3.bay.fighters') === 8 && J('__c3.bay.escorts') === 3 && J('__f3.P.promo') === null, JSON.stringify([J('__c3.rank'), J('__c3.bay.fighters')]));
  g.run(`window.__SV = __P(5000); campProgressSave(__SV); window.__LD = campProgressLoad()`);
  const saved = JSON.parse(store.get('longhaul.campaign'));
  check('nothing new is saved for the rank: the save has no rank and no promotion, and the rank comes back from the results (a reload of 5,000 points is a lieutenant)', !('rank' in saved) && !('promo' in saved) && J('campRank(__LD).i') === 2 && J('campPoints(__LD)') === 5000, Object.keys(saved).join());
  const sc = src('src/campaignscene.js');
  check('the missions card\'s hook is what shows the line: the debrief calls campRankLine(P, score) and the scene has no rank words of its own', /campRankLine\(this\.P, sc\)/.test(sc) && !/PROMOTED|Lieutenant|Commander/.test(sc));
}

// ---------- F. balance ----------
console.log('F. balance: a higher rank is an easier fight and never a walk');
{
  // the sensible player of tests/campaign.mjs on the last mission of the belt (the mothership), seeds 1 to 3, at the lowest and the highest rank; the idle one does nothing
  g.run(`
    window.__fly = (rank, seed, idle, mission) => { window.C = campNew(1, [], { seed, rank, mission: mission == null ? 2 : mission }); C.arrivedAt = 0;
      for (let i = 0; i < 400 * 30 && !C.result; i++) { const s = i / 30, c = C.carrier;
        if (!idle) { if (s > 1 && s < 1.05) campOrder(C, 'launch'); if (s > 12 && Math.round(s * 30) % 150 === 0) campOrder(C, 'attack', C.ships.some(u => u.kind === 'mother') ? 'mothership' : '');
          const a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
          if (a) { const w = Math.atan2(a.y - c.y, a.x - c.x), d = Math.atan2(Math.sin(w - c.rot), Math.cos(w - c.rot)); C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = campDist(a, c) > 380 ? 1 : 0; C.input.fire = campDist(a, c) < 520; if (campDist(a, c) < 2400 && a.kind === 'mother' && Math.round(s * 30) % 60 === 0) campOrder(C, 'missiles', 'the mothership'); }
          else { C.input.thrust = 0; C.input.fire = false; C.input.turn = 0; } }
        campStep(C, 1 / 30); C.events.length = 0; }
      return { r: C.result, why: C.why, t: Math.round(C.t / 1000), lost: C.lostShips, hull: Math.round(C.carrier.hp) }; };
  `);
  const runs = [1, 2, 3].map(sd => ({ lo: J(`__fly(0, ${sd}, false)`), hi: J(`__fly(5, ${sd}, false)`) })), idle = [J(`__fly(0, 1, true)`), J(`__fly(5, 1, true)`)];
  check('doing nothing loses at every rank: a rank is a bigger wing to command, not a free win', idle.every(r => r.r === 'lost'), JSON.stringify(idle));
  check('the sensible player wins the mothership mission at the lowest rank and at the highest', runs.every(x => x.lo.r === 'won' && x.hi.r === 'won'), JSON.stringify(runs.map(x => [x.lo.r + x.lo.t, x.hi.r + x.hi.t])));
  check('and the highest rank is not a walk: it never wins in under a minute, and it does not take longer than the cadet on average (a bigger wing is a faster kill)', runs.every(x => x.hi.t >= 60) && runs.reduce((s, x) => s + x.hi.t, 0) <= runs.reduce((s, x) => s + x.lo.t, 0) + 30, JSON.stringify(runs.map(x => [x.lo.t, x.hi.t])));
  g.run('window.__done = 1');
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPRANKS FAIL (${failed} of ${n})` : `\nCAMPRANKS PASS (${n})`);
process.exitCode = failed ? 1 : 0;
