// smoke: what flying missions 1.2 and 1.3 by hand found (card space-game-hunt-l1-pacing): the radio names a fighter a torpedo boat arms on in words, and the last raid of 1.2 is not called the third (plain Node, no Chrome)
// Missions 1.2 and 1.3 were rebuilt as beats (card l1-pacing) and then flown by hand in the real game (tests/huntl1pacing-boot.mjs; what was seen: docs/night/hunt-l1-pacing.md). Each bug found there is pinned here.
//   A. the torpedo boats of 1.2 and the wing on a Mine order: a boat goes for a mining fighter (the rule stands), and the radio says "our fighter", not the kind id
//   C. a beat's hint (the line with the keys) waits a few seconds after the beat's radio line: the screen has one message box, and the hint was replaced on the frame it was put up
//   D. Enter just after a call closed by itself (its ship gone, its time out) is swallowed for a moment: it was the call's, and it fired a missile
//   B. the words: the radio never names a ship by a bare kind id ("fighter"), and the heavy raid of 1.2, the fifth wave, is not announced as "a third raid"
// Run: node tests/camphuntpacing.mjs   (exit code 1 on a failed check)
process.argv.length = 2; // the bot tool reads its options from the command line: none
const bot = await import('../tools/campaign-bot.mjs');
const g = typeof bot.botGame === 'function' ? bot.botGame() : bot.botGame;
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };

console.log('A. torpedo boats and the wing that mines');
{
  // 1.2 with every fighter on Mine ore and the two miners gone: the boats of the fourth wave go for the mining fighters (your own ships on a Mine order are mining ships to a pirate: src/camppirates.js campPreyKind,
  // pinned in tests/camptorpedo.mjs; whether they should be is a question for Troy: docs/night/hunt-l1-pacing.md). What the radio says about it must be words.
  const r = J(`(() => { const out = [];
    for (const seed of [1, 2]) { const C = campNew(1, [], { seed, mission: 1 }); const seen = {}, said = []; let mined = false, cut = false;
      for (let i = 0; i < 235 * 30 && !C.result; i++) { campStep(C, 1 / 30); const s = campMissionClock(C);
        if (i === 30) campOrder(C, 'launch');
        if (s >= 8 && !mined) { mined = campWingOrder(C, 'fighters', 'mine', '').ok; }
        if (s >= 170 && !cut) { cut = true; C.ships.forEach(u => { if (u.kind === 'miner') u.hp = 0; }); } // the miners are gone before the boats come: the only "mining ships" left are your own fighters
        campTorpedoBoats(C).forEach(b => { const t = C.by[b.tgt]; if (t) seen[t.kind] = 1; });
        C.events.forEach(e => { const t = e.type === 'torpedo' && (e.stage === 'arming' || e.stage === 'launch') && C.by[e.target]; if (t) said.push(uiText(campTorpKey(t, e.stage === 'arming' ? 'camp.say.torp.arm' : 'camp.say.torp.fire'), { name: campTorpName(t) })); }); // the line the radio says for it (campTorpSay)
        C.events.length = 0; }
      out.push({ seed, mined, seen: Object.keys(seen), said }); }
    return out; })()`);
  check('the flights are the case: the wing was on Mine ore, a boat went for a fighter and the radio said so', r.every(x => x.mined && x.seen.indexOf('fighter') >= 0 && x.said.length > 0), JSON.stringify(r));
  check('the radio names the fighter in words ("our fighter"), never by its bare kind id (it said "Torpedo boat arming on fighter.")', r.every(x => x.said.every(s => !/\b(on|at) (fighter|escort|miner|carrier)\b/.test(s))) && r.some(x => x.said.some(s => /our fighter/.test(s))), JSON.stringify(r.map(x => x.said)));
}

console.log('B. the words');
{
  const names = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 1 }); for (let i = 0; i < 60; i++) campStep(C, 1 / 30); campOrder(C, 'launch'); for (let i = 0; i < 300; i++) campStep(C, 1 / 30);
    return C.ships.filter(u => u.hp > 0 && (u.team === 'earth' || u.team === 'neutral')).map(u => [u.kind, campTorpName(u)]); })()`);
  check('every ship of yours and every neutral has a name in words for the torpedo lines', names.length >= 5 && names.every(([k, nm]) => nm && nm !== k), JSON.stringify(names.filter(([k, nm]) => nm === k)));
  const mine = J(`CAMP.levels[1].missions[1].waves.map(w => uiText(w.say))`);
  check('1.2 has five waves and the heavy raid is the last', mine.length === 5, String(mine.length));
  check('the heavy raid, the fifth wave, is not announced as a third raid (it was the third of three before card l1-pacing)', !/third/i.test(mine[4]) && /heav/i.test(mine[4]), mine[4]);
  check('no line of 1.2 counts the raids wrongly: "second" is only said of the second group', mine.every((s, i) => !/\b(third|fourth|fifth)\b/i.test(s) && (i === 2 || !/second/i.test(s))), JSON.stringify(mine));
  check('the lines are curt: 12 words at most', mine.every(s => s.split(/\s+/).length <= 12), JSON.stringify(mine));
}
console.log('C. a hint is not put up in the same breath as the radio line of its beat');
{
  // The screen has ONE message box (toast, src/common.js): a new message takes the place of the one that is up. The hint of a beat ("Two groups, two sides. One squad each: E red, R green.") was due on the very step its wave
  // came, and the wave's own radio line ("A second group, north-east. Split the squads.") was put up after it on the same frame: the hint, the line with the KEYS in it, was never on the screen (seen flying 1.2: the picture at 113 s).
  g.run(`(() => { const step0 = campStep; window.__H = null; campStep = function (C, dt) { const r = step0.apply(null, arguments); if (window.__H) { const t = campNudge(C, window.__shown); if (t) window.__H.push([campMissionClock(C), t, C.waves.map(w => (w && w.started ? w.at : null))]); } return r; }; })()`);
  const hints = (mission, name) => { g.run('window.__H = []; window.__shown = {}'); bot.run(1, 1, name, 'steady', [], 420, mission); const h = J('window.__H'); g.run('window.__H = null'); return h; };
  const a = hints(1, 'guard'), b = hints(2, 'guard'), wait = J('CAMPL1HINT_WAIT');
  const gap = (h, re, wave) => { const x = h.find(x => re.test(x[1])); return x ? x[0] - x[2][wave] : null; };
  const gaps = [gap(a, /Two groups/, 2), gap(a, /Torpedo boats!/, 3), gap(b, /A torpedo boat!/, 1), gap(b, /last hauler/, 2), gap(b, /Not pirates/, 5)];
  check('the wait is a few seconds: long enough for the radio line and the sensors\' "Contact" line (2 s after a wave) to be read, short enough to be of use', wait >= 3 && wait <= 6, String(wait));
  check('each hint of a beat comes that long after its wave\'s own line, not on the same step (1.2: two groups, the boats; 1.3: the boat, the last hauler, first contact)', gaps.every(d => d != null && d >= wait && d < wait + 1.5), JSON.stringify(gaps));
}
console.log('D. Enter meant for a pilot\'s call does not fire a missile when the call has just closed by itself');
{
  // Enter answers a call, and with no call and no list open Enter fires a missile. A call closes by itself when the ship it is about is gone (a runner that got away) or its 8 s run out. Flying 1.3, the "running" call
  // closed in the instant between Up and Enter, and the Enter fired one of the six missiles at nothing worth one ("Missile away."). For a moment after a call closes by itself, Enter is still the call's and does nothing.
  const r = J(`(() => { const C = campNew(1, [], { seed: 1, mission: 2 }); for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.call = C.call || campCallsNew(C); const s = { camp: C, mode: 'play', mp: null, pn: null };
    const open = left => { C.call.open = { id: 'running', ctx: { ids: ['nobody-1'] }, pilot: 0, at: C.t, left, total: 8, def: 1, held: null }; };
    const out = {}; out.before = campCallKey(s, 'Enter'); // no call yet: Enter is not the call's (it is the missile's)
    open(8); out.has = campCallHasKeys(s); campCallsTick(C, 1 / 30); out.gone = !campCallOpen(C); out.atOnce = campCallKey(s, 'Enter'); out.arrow = campCallKey(s, 'ArrowDown');
    C.t += CAMP_CALLS.grace * 1000 - 50; out.stillIn = campCallKey(s, 'Enter'); C.t += 100; out.after = campCallKey(s, 'Enter');
    const u = C.ships.find(x => x.hp > 0 && x.team === 'earth'); C.call.open = { id: 'running', ctx: { ids: [u.id] }, pilot: 0, at: C.t, left: 0.01, total: 8, def: 1, held: null }; campCallsTick(C, 1 / 30); out.lateGone = !campCallOpen(C); out.late = campCallKey(s, 'Enter');
    C.t += 5000; C.call.open = { id: 'running', ctx: { ids: [u.id] }, pilot: 0, at: C.t, left: 8, total: 8, def: 1, held: null }; out.answered = campCallKey(s, 'Enter'); out.closed = !campCallOpen(C); out.own = campCallKey(s, 'Enter'); // the player's own answer closes it: the next Enter is his, at once
    out.grace = CAMP_CALLS.grace; return out; })()`);
  check('the case: with no call Enter is not the call\'s; a call about a ship that is gone closes by itself', r.before === false && r.has === true && r.gone === true, JSON.stringify(r));
  check('Enter in the moment after it closed is swallowed (no missile), and so for the whole grace; an arrow is not (the ship steers)', r.atOnce === true && r.stillIn === true && r.arrow === false, JSON.stringify(r));
  check('after the grace (under a second) Enter is the missile\'s again', r.after === false && r.grace > 0.3 && r.grace < 1, JSON.stringify(r));
  check('a call that ran out of time is the same: Enter just after it is swallowed', r.lateGone === true && r.late === true, JSON.stringify(r));
  check('a call the player answered himself leaves no grace: his next Enter is a missile', r.answered === true && r.closed === true && r.own === false, JSON.stringify(r));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nHUNT L1 PACING FAIL (${failed} of ${n})` : `\nHUNT L1 PACING PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
