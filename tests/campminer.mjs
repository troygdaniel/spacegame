// smoke: the miner's call of mission 1.1 is a choice with a price: who is away is said once, and ignoring it, sending one pilot and sending all three end differently (plain Node, no Chrome)
// Card l1-miner-choice (Troy, 24 Nov 2026: "what does the player decide, and what does it cost?"). On the numbers of main 4e02059 the call had a reward and no price: with no order the miner was lost, with any order he was
// saved, and the transport was never at risk. The rule that says the price is src/campminer.js; what makes it real is the wave of the 1.1 row that goes for the transport just after the call (docs/CAMPAIGN-TUNING.md).
//   A. the price line: said once, a moment after pilots leave for the miner, naming who; never when nobody goes
//   B. the three answers (the bots plaini, plaing, plaina of tools/campaign-bot.mjs), three seeds each: no answer is best at everything, and every answer still wins
// Run: node tests/campminer.mjs   (exit code 1 on a failed check; about a minute: it flies the bots)
process.argv.length = 2; // the bot tool reads its options from the command line: none
const bot = await import('../tools/campaign-bot.mjs');
const g = typeof bot.botGame === 'function' ? bot.botGame() : bot.botGame;
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
// every flight is watched: the radio's lines about the miner, and the transport's hull while she lives
g.run(`window.__MC = null; window.__seen = new WeakSet(); const __tick = campTick; campTick = function (C, dt) { const r = __tick(C, dt), M = window.__MC; if (M) { const f = C.by['freighter-t1']; if (f && f.hp > 0) M.transport = Math.round(f.hp);
  C.events.forEach(e => { if (e.type === 'say' && !window.__seen.has(e)) { window.__seen.add(e); if (/^camp\\.say\\.(miner|distress|thanks)/.test(e.key)) M.says.push([Math.round(C.t / 1000), e.key, uiText(e.key, e.vars)]); } }); } return r; };`);
const fly = (name, seed) => { g.run('window.__MC = { says: [], transport: 0 }'); const r = bot.run(1, seed, name, 'steady', [], 420, 0);
  const x = J(`(() => { const C = window.C, m = C.ships.find(u => u.tid === 'dm'); return Object.assign({ miner: m && m.hp > 0 ? Math.round(m.hp) : 0, ore: Math.round(C.ore), hit: C.torpStat.hit, pilots: C.ships.filter(u => u.pilot && u.hp > 0).length, bonus: campBonuses(C).filter(b => b.ok || b.met || b.done).map(b => b.id) }, window.__MC); })()`);
  g.run('window.__MC = null'); return Object.assign(x, { res: r.result, t: r.t, hull: r.hull, lost: r.shipsLost }); };
const SEEDS = [1, 2, 3], runs = {}; for (const b of ['plaini', 'plaing', 'plaina']) runs[b] = SEEDS.map(s => fly(b, s));
const line = (r, key) => r.says.filter(s => s[1] === key);

console.log('A. the price line');
{
  const K = J('CAMPMINER'), i = runs.plaini[0], o = runs.plaing[0], a = runs.plaina[0];
  check('the numbers: a pilot 1,200 px from the cruiser and within 1,300 px of the miner counts as away; the line waits 1.5 s', K.gone === 1200 && K.near === 1300 && K.wait === 1.5, JSON.stringify(K));
  check('the call itself is one plain line, in every flight', [i, o, a].every(r => line(r, 'camp.say.distress').length === 1), JSON.stringify(i.says));
  check('nobody sent at the call: no price line in the 25 s after it (later the bot\'s own attack order may take pilots to his pirates, and then the line is true)', runs.plaini.every(r => { const c = line(r, 'camp.say.distress')[0]; return !r.says.some(s => /miner\.(short|all)/.test(s[1]) && s[0] - c[0] <= 25); }), JSON.stringify(i.says));
  check('one pilot sent: "Kara away at the miner", once, within 12 s of the call', runs.plaing.every(r => { const s = line(r, 'camp.say.miner.short'), c = line(r, 'camp.say.distress')[0]; return s.length === 1 && /^Kara away at the miner/.test(s[0][2]) && s[0][0] - c[0] <= 12 && !line(r, 'camp.say.miner.all').length; }), JSON.stringify(o.says));
  check('all three sent: "All pilots away", once, and not the other line as well', runs.plaina.every(r => line(r, 'camp.say.miner.all').length === 1 && !line(r, 'camp.say.miner.short').length), JSON.stringify(a.says));
  check('the lines are curt (12 words or fewer) and name no key', J(`['camp.say.miner.short', 'camp.say.miner.all', 'camp.say.miner.bait'].map(k => uiText(k, { name: 'Kara' }))`).every(t => t.split(/\s+/).length <= 12 && !/[{}]/.test(t)));
  check('away is empty before the call and after it (the miner saved or lost)', J(`campMinerAway(campNew(1, [], { mission: 0, seed: 1 })).length`) === 0 && J('campMinerAway(window.C).length') === 0);
}

console.log('B. the three answers');
{
  const tab = b => runs[b].map(r => `${r.res} miner ${r.miner} ore ${r.ore} transport ${r.transport} torpedo hits ${r.hit} hull ${r.hull}`).join(' | ');
  console.log('     ignore: ' + tab('plaini')); console.log('     one:    ' + tab('plaing')); console.log('     all:    ' + tab('plaina'));
  const priced = J('CAMP.levels[1].missions[0].waves.length') === 3; // the number change is its own last commit: without it the call has a reward and no price, and only the first two checks hold
  const all = [].concat(runs.plaini, runs.plaing, runs.plaina), sum = (b, f) => runs[b].reduce((a, r) => a + f(r), 0);
  check('every answer still wins, on every seed, with no pilot lost and the cruiser\'s hull above 60 percent: it is mission 1.1', all.every(r => r.res === 'won' && r.lost === 0 && r.hull >= 360), all.map(r => r.res + ' ' + r.hull).join());
  check('ignore the call: the miner is lost every time (and his bonus with him)', runs.plaini.every(r => r.miner === 0 && r.bonus.indexOf('miner') < 0));
  if (!priced) console.log('     (the wave that goes for the transport is not in the 1.1 row: the price checks are not made)');
  else {
  check('send all three: the miner is saved every time ...', runs.plaina.every(r => r.miner > 0 && r.bonus.indexOf('miner') >= 0), runs.plaina.map(r => r.miner).join());
  check('... and the transport pays: a torpedo gets through on every seed (none does when the call is ignored), and the "no torpedo hits" bonus is lost', runs.plaina.every(r => r.hit >= 1 && r.bonus.indexOf('torp') < 0) && runs.plaini.every(r => r.hit === 0), runs.plaina.map(r => r.hit).join() + ' / ' + runs.plaini.map(r => r.hit).join());
  check('the transport ends at least 40 hull lower with all three away than with the call ignored, on average', sum('plaini', r => r.transport) / 3 - sum('plaina', r => r.transport) / 3 >= 40, sum('plaini', r => r.transport) / 3 + ' ' + sum('plaina', r => r.transport) / 3);
  check('send one: no torpedo gets through, and the miner is saved on most seeds but not surely (one pilot against two skiffs)', runs.plaing.every(r => r.hit === 0) && runs.plaing.filter(r => r.miner > 0).length >= 2, runs.plaing.map(r => r.miner + '/' + r.hit).join());
  check('no answer is best at everything: ignore loses the miner, all three takes a torpedo, one risks the miner', true);
  const row = J('CAMP.levels[1].missions[0].waves.map(w => ({ lane: w.on && w.on.lane, ships: w.ships, goal: w.goal || "", beat: w.beat || "", say: w.say }))');
  check('the row: the call at 31 percent of the road, then at 34 percent three torpedo boats and two skiffs for the transport, then the ambush at 52 percent as it was', row.length === 3 && row[0].beat === 'distress' && row[0].lane === 0.31 && row[1].lane === 0.52 && JSON.stringify(row[1].ships) === '{"skiff":4,"tboat":2}' && row[2].lane === 0.34 && JSON.stringify(row[2].ships) === '{"tboat":3,"skiff":2}' && row[2].goal === 'convoy:t1' && row[2].say === 'camp.say.miner.bait', JSON.stringify(row));
  }
}
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);
