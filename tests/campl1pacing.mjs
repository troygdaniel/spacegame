// smoke: missions 1.2 and 1.3 are a sequence of beats: what comes, when, that nothing alien is seen before first contact, that the beats are a minute apart at most, and that the choices at the torpedo boats change the outcome (plain Node, no Chrome)
// Card l1-pacing (Troy: "lots of flying, not much happens"; "the waiting, and the fights not being interactive"). 1.2 was three raids at 70, 170 and 270 s and 1.3 two raids and a long quiet road: the plain bot met
// no hostile for 149 of 297 s and 148 of 292 s. They are five and six beats now (the rows: CAMP.levels[1].missions[1] and [2] in src/campaign.js; the timelines and the numbers: docs/CAMPAIGN-TUNING.md).
//   A. the rows: the waves of each mission, in order, with what makes each a question (two sides, torpedo boats, the last hauler, the pirates that run at the contact); the story beats that must stay
//   B. the flight: the plain bot wins both in about five minutes, the idle player wins neither, the beats come when the rows say, no gap between two beats is longer than 75 s, and less of the mission is empty than before
//   C. the choices: at the torpedo boats of 1.2 and at the torpedo boat of 1.3, doing nothing, tucking in and sending squads end differently, and each costs something
//   D. the hints of src/campl1beats.js: each shows once, at its beat, with keys from the key table; the words are curt
// Run: node tests/campl1pacing.mjs   (exit code 1 on a failed check; about a minute: it flies the bots)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.argv.length = 2; // the bot tool reads its options from the command line: none
const bot = await import('../tools/campaign-bot.mjs');
const g = typeof bot.botGame === 'function' ? bot.botGame() : bot.botGame;
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };

console.log('A. the rows');
{
  const M = J(`[1, 2].map(i => { const L = CAMP.levels[1].missions[i]; return { id: L.id, hp: L.hpScale, dmg: L.dmgScale, obj: L.objectives, cues: L.cues || [], convoys: (L.convoys || []).map(c => [c.id, c.at, c.speed]), waves: L.waves.map(w => ({ at: w.at, on: w.on || null, early: w.early, needClear: !!w.needClear, from: w.from || null, along: w.along || '', ships: w.ships, prey: w.prey || '', breakOn: w.breakOn || '', secret: !!w.secret, goal: w.goal || '', say: w.say })) }; })`);
  const [mine, haul] = M, pirate = J('Object.keys(CAMP.pirate.kinds).concat(Object.keys(CAMP.torpedo.boats).filter(k => CAMP.torpedo.boats[k].faction === "pirate"))'), side = (a, b) => a[0] * b[0] + a[1] * b[1];
  check('1.2 is five waves at 40, 100, 112, 175 and 240 s (it was three, at 70, 170 and 270): a probe, a raid, a second group, torpedo boats, the heavy raid', mine.id === 'mine' && mine.waves.map(w => w.at).join() === '40,100,112,175,240', mine.waves.map(w => w.at).join());
  check('the probe is three skiffs; the raid and the second group come twelve seconds apart from OPPOSITE sides of Ceres (the squads must be split); every wave hunts the miners', JSON.stringify(mine.waves[0].ships) === '{"skiff":3}' && mine.waves[2].at - mine.waves[1].at === 12 && side(mine.waves[1].from, mine.waves[2].from) < 0 && mine.waves.every(w => w.prey === 'miners'), JSON.stringify([mine.waves[1].from, mine.waves[2].from]));
  check('the fourth wave is two torpedo boats with two skiffs, for the miners; the fifth is the heavy raid (3 skiffs, 3 cutters, 2 brutes), which waits until the others are dead', mine.waves[3].ships.tboat === 2 && mine.waves[3].ships.skiff === 2 && JSON.stringify(mine.waves[4].ships) === '{"skiff":3,"cutter":3,"brute":2}' && mine.waves[4].needClear && !mine.waves.slice(0, 4).some(w => w.needClear));
  check('raids are seen coming: each starts 4,300 px or more from Ceres (they were 3,200 px out)', mine.waves.every(w => Math.hypot(w.from[0], w.from[1]) >= 4300), mine.waves.map(w => Math.round(Math.hypot(w.from[0], w.from[1]))).join());
  check('the story of 1.2 stays: mine 450 ore, beat the LAST raid, sell 160 at the Works; every ship in it is a pirate', mine.obj.map(o => o.type + ':' + (o.n || o.what)).join() === 'ore:450,kill:wave:4,cashin:160' && mine.waves.every(w => Object.keys(w.ships).every(k => pirate.indexOf(k) >= 0)), JSON.stringify(mine.obj));
  check('1.3 is six waves along the road, at 8, 24, 40, 56 and 72 percent of it and then on the cue of first contact (it was two raids, at 16 and 34 percent, then the contact at 52)', haul.id === 'haulers' && haul.waves.slice(0, 5).map(w => w.on.lane).join() === '0.08,0.24,0.4,0.56,0.72' && haul.waves[5].on.cue === 'contact' && haul.cues[0].on.lane === 0.82, JSON.stringify(haul.waves.map(w => w.on)));
  check('the second is ONE torpedo boat with two skiffs (two boats cost a slow player a hauler more than the mission did before); the third and the fifth come at the LAST hauler (along h3)', JSON.stringify(haul.waves[1].ships) === '{"tboat":1,"skiff":2}' && haul.waves[2].along === 'h3' && haul.waves[4].along === 'h3' && !haul.waves[0].along && !haul.waves[3].along);
  check('the haulers are as they were: three, twelve seconds apart, at 62', JSON.stringify(haul.convoys) === '[["h1",4,62],["h2",16,62],["h3",28,62]]', JSON.stringify(haul.convoys));
  check('the story of 1.3 stays: no alien before the contact (the five waves before it are pirates), the pirates that raid break off on that cue, and the contact wave is the same eight ships, secret, on the cruiser', haul.waves.slice(0, 5).every(w => !w.secret && Object.keys(w.ships).every(k => pirate.indexOf(k) >= 0)) && [0, 2, 3, 4].every(i => haul.waves[i].breakOn === 'contact') && JSON.stringify(haul.waves[5].ships) === '{"raider":4,"drone":2,"gunship":2}' && haul.waves[5].secret && haul.waves[5].goal === 'carrier' && haul.obj.map(o => o.type + ':' + (o.n || o.what)).join() === 'deliver:1,kill:wave:5');
  check('the pirates are tougher and hit softer, so a fight lasts longer and costs no more: 1.2 hit points x2.0 (1.4) and damage x1.35 (1.8); 1.3 x2.9 (2.2) and x1.55 (2.1)', mine.hp === 2 && mine.dmg === 1.35 && haul.hp === 2.9 && haul.dmg === 1.55, JSON.stringify([mine.hp, mine.dmg, haul.hp, haul.dmg]));
  check('missions 1.1, 2.x and 3.x are not touched: their waves are as many as they were', J('[CAMP.levels[1].missions[0].waves.length].concat([2, 3].map(l => CAMP.levels[l].missions.map(m => (m.waves || []).length).join("/")))').join(' ') === J('"2 " + [2, 3].map(l => CAMP.levels[l].missions.map(m => (m.waves || []).length).join("/")).join(" ")'));
}

// the flight, watched: when each wave came and went, and what was alive
g.run(`(() => { const step0 = campStep; window.__TL = null; campStep = function (C, dt) { const r = step0.apply(null, arguments); const T = window.__TL; if (T && C.arrivedAt != null) { const s = campMissionClock(C);
  C.waves.forEach((st, i) => { if (st && st.started && T.from[i] == null) { T.from[i] = Math.round(s); T.kinds[i] = C.ships.filter(u => u.team === 'alien' && u.wave === i).map(u => u.kind).sort().join(); } });
  if (T.firstAlien == null && C.ships.some(u => u.team === 'alien' && u.hp > 0 && ['raider', 'drone', 'gunship'].indexOf(u.kind) >= 0)) T.firstAlien = Math.round(s);
  if (C.cues && C.cues.contact != null && T.contact == null) { T.contact = Math.round(s); T.running = C.ships.filter(u => u.team === 'alien' && u.hp > 0 && u.running).length; }
  T.neutrals = C.neutralsLost; T.sold = C.sold; T.hit = C.torpStat ? C.torpStat.hit : 0; T.lostH = (C.L.convoys || []).length - campConvoys(C).length - C.delivered; } return r; }; })()`);
const fly = (mission, seed, name) => { g.run('window.__TL = { from: {}, kinds: {} }'); const r = bot.run(1, seed, name, 'steady', [], 420, mission); const T = J('window.__TL'); g.run('window.__TL = null'); return Object.assign({ res: r.result, t: r.t, lost: r.shipsLost, quiet: r.idle, hull: r.hull }, T); };

console.log('B. the flight');
const seeds = [1, 2, 3];
{
  const mine = seeds.map(s => fly(1, s, 'plain')), haul = seeds.map(s => fly(2, s, 'plain'));
  const gaps = r => { const at = Object.keys(r.from).map(i => r.from[i]).sort((a, b) => a - b); return [at[0]].concat(at.slice(1).map((x, i) => x - at[i])); };
  check('1.2: the plain bot wins every seed in four to five and three quarter minutes (240 to 345 s; it was 297 s, and 330 was the limit until card space-game-slower-fights: at half-speed fights seed 2 wins at 332 s), with the ore sold and no fighter lost on most', mine.every(r => r.res === 'won' && r.t >= 240 && r.t <= 345 && r.sold >= 160) && mine.filter(r => r.lost === 0).length >= 2, JSON.stringify(mine.map(r => [r.res, r.t, r.lost, r.sold])));
  check('1.2: the beats come when the row says: 40, 100, 112, 175 s and the heavy raid at 230 to 240 s (55 s after the boats, once they are dead)', mine.every(r => [0, 1, 2, 3].map(i => r.from[i]).join() === '40,100,112,175' && r.from[4] >= 229 && r.from[4] <= 241), JSON.stringify(mine.map(r => r.from)));
  check('1.2: from the start, and from one beat to the next, never more than 75 s', mine.every(r => Math.max(...gaps(r)) <= 75), JSON.stringify(mine.map(gaps)));
  check('1.3: the plain bot wins every seed in about five minutes (280 to 320 s; it was 292 s) with the haulers\' hulls whole on most seeds (528 of 600 on seed 1 since card space-game-cut-escorts: no escort ship rides with them)', haul.every(r => r.res === 'won' && r.t >= 280 && r.t <= 320 && r.hull >= 500) && haul.filter(r => r.hull === 600).length >= 2, JSON.stringify(haul.map(r => [r.res, r.t, r.hull])));
  check('1.3: six beats, the first within 30 s, never more than 60 s from one to the next', haul.every(r => Object.keys(r.from).length === 6 && gaps(r)[0] <= 30 && Math.max(...gaps(r)) <= 60), JSON.stringify(haul.map(gaps)));
  check('1.3: no alien is in the game until first contact: the first raider, drone or gunship appears with the contact cue, which is past 200 s (it was at about 140 s, with a minute and a half of empty road after the fight)', haul.every(r => r.contact >= 200 && r.firstAlien >= r.contact && r.firstAlien - r.contact <= 2 && r.kinds[5] === 'drone,drone,gunship,gunship,raider,raider,raider,raider'), JSON.stringify(haul.map(r => [r.contact, r.firstAlien, r.kinds[5]])));
  check('1.3: first contact lands on a wing that has just fought: the last pirate raid came 20 to 45 s before it', haul.every(r => r.contact - r.from[4] >= 15 && r.contact - r.from[4] <= 45), JSON.stringify(haul.map(r => r.contact - r.from[4])));
  check('less of each mission is empty than before: with no hostile alive the plain bot flies 125 s or less of 1.2 (it was 149) and 120 s or less of 1.3 (it was 148), on the median of three seeds (it was 120 and 115 before the wing flew in formation: 121 and 116 now)', [mine, haul].map(rs => rs.map(r => r.quiet).sort((a, b) => a - b)[1]).every((q, i) => q <= [125, 120][i]), JSON.stringify([mine.map(r => r.quiet), haul.map(r => r.quiet)]));
  const idle = [fly(1, 1, 'idle'), fly(2, 1, 'idle')];
  check('a player who gives no order wins neither', idle.every(r => r.res !== 'won'), JSON.stringify(idle.map(r => r.res)));
}

console.log('C. the choices');
g.run(`
  window.__alive = (C, i) => C.ships.filter(u => u.team === 'alien' && u.hp > 0 && u.wave === i);
  window.__play = (mission, seed, until, policy) => { const C = campNew(1, [], { seed, mission }); const st = {}; let before = null;
    for (let i = 0; i < until * 30 && !C.result; i++) { campStep(C, 1 / 30); const s = campMissionClock(C); policy(C, s, st); C.events.length = 0; if (st.beat && !before) before = { neutrals: C.neutralsLost, haulers: campConvoys(C).length, shield: Math.round(C.shield) }; }
    return { before, neutrals: C.neutralsLost, haulers: campConvoys(C).length, launched: C.torpStat.launched, hit: C.torpStat.hit, shield: Math.round(C.shield), boats: C.ships.filter(u => u.hp > 0 && u.kind === 'tboat').length, hull: Math.round(campConvoys(C).reduce((a, u) => a + u.hp / u.maxHp, 0) * 100) }; };
  // the same flight up to the beat: launch, the Red and Green squads (six fighters, as the six fighters of the old wing) attack what is nearest every 5 s and the Yellow squad (two, the old escorts) stays; in 1.3 the cruiser flies with the convoy on the autopilot
  window.__pre = (C, s, st, until, fly) => { if (!st.l && s >= 1) { st.l = 1; campOrder(C, 'launch'); } if (fly && s >= 6 && !C.nav && Math.round(s * 30) % 30 === 0) { const r = campNavCheck(C, 'the objective'); if (r.ok) campNavDo(C, r, 'key'); }
    if (s < until) { if (s >= 12 && Math.round(s * 30) % 150 === 0) ['red', 'green'].forEach(k => campWingOrder(C, k, 'attack', null, 'bot')); return true; } if (!st.beat) { st.beat = 1; campOrder(C, 'guard', ''); } return false; };
`);
{
  // 1.2, beat 3: the torpedo boats come at 175 s. Up to 172 s the three flights are the same
  const run = (seed, what) => J(`__play(1, ${seed}, 232, (C, s, st) => { if (__pre(C, s, st, 172, false)) return; ${what} })`);
  const rows = [1, 2].map(seed => ({ nothing: run(seed, ''), tuck: run(seed, `if (!st.t) { st.t = 1; campOrder(C, 'convoy', 'tuck in'); }`), squad: run(seed, `if (Math.round(s * 30) % 60 === 0) { const b = __alive(C, 3).find(u => u.kind === 'tboat'); if (b) campWingOrder(C, 'red', 'attack', b.id); }`) }));
  check('1.2, the torpedo boats: both miners are alive when the boats come, whatever is chosen after', rows.every(r => ['nothing', 'tuck', 'squad'].every(k => r[k].before.neutrals === 0)), JSON.stringify(rows.map(r => r.nothing.before)));
  check('do NOTHING and the boats sink no miner on either seed, and their torpedoes hit nothing on seed 1 and once on seed 2 (nothing on either before card space-game-repair-with-ore: a landed fighter\'s mend costs ore now, twice the time with none, so the guard is a little thinner when the store has run dry; NOTE for Troy): the eight fighters (no escort ship since card space-game-cut-escorts) guard beside the cruiser and the miners and kill the boats first (both seeds lost a miner before the cut, REPORTED to Troy: the choice of 1.2\'s beat 3 has lost its bite for a player who does nothing)', rows.every(r => r.nothing.neutrals === 0) && rows.map(r => r.nothing.hit).join() === '0,1', JSON.stringify(rows.map(r => [r.nothing.neutrals, r.nothing.hit])));
  check('TUCK the miners in and none is lost: the torpedoes hit once on each seed, the cruiser\'s shield on seed 1 (77) and, since card space-game-repair-with-ore, something else on seed 2 (the shield stays 150: the mends cost ore)', rows.every(r => r.tuck.neutrals === 0 && r.tuck.hit >= 1) && rows[0].tuck.shield < 150, JSON.stringify(rows.map(r => [r.tuck.neutrals, r.tuck.hit, r.tuck.shield])));
  check('send RED at the boats: no more torpedoes are fired than when the miners were only tucked in, and fewer on a seed (a boat that is dead fires no more); it costs a squad that is not on the skiffs, and on seed 2 the miners are lost (2) where doing nothing loses none: the squad is not where they are', rows.every(r => r.squad.launched <= r.tuck.launched) && rows.some(r => r.squad.launched < r.tuck.launched), JSON.stringify(rows.map(r => [r.squad.neutrals, r.squad.launched, r.tuck.launched])));
}
{
  // 1.3, beat 2: the torpedo boat comes at 24 percent of the road (about 66 s). Up to 62 s the flights are the same
  const run = (seed, what) => J(`__play(2, ${seed}, 125, (C, s, st) => { if (__pre(C, s, st, 62, true)) return; ${what} })`);
  const rows = [1, 2, 3].map(seed => ({ nothing: run(seed, ''), tuck: run(seed, `if (!st.t) { st.t = 1; campOrder(C, 'convoy', 'tuck in'); }`), squads: run(seed, `if (Math.round(s * 30) % 60 === 0) { const b = __alive(C, 1).find(u => u.kind === 'tboat'); if (b) campWingOrder(C, 'fighters', 'attack', b.id); }`) }));
  console.log('     ' + JSON.stringify(rows.map(r => ['nothing', 'tuck', 'squads'].map(k => [r[k].haulers, r[k].launched, r[k].hit, r[k].boats, r[k].hull, r[k].shield]))));
  check('1.3, the torpedo boat: all three haulers are flying when it comes', rows.every(r => r.nothing.before.haulers === 3 && r.tuck.before.haulers === 3 && r.squads.before.haulers === 3));
  check('do NOTHING and its torpedoes find the haulers: a hit on every seed (two on two seeds of three, one on seed 2 since the cut), and the convoy\'s hulls are the worst of the three ways (within 12 points of the squads\' on a seed: 194 against 183, 199 against 198, where the guarding wing flies in formation beside the cruiser and meets the skiffs there)', rows.every(r => r.nothing.hit >= 1 && r.nothing.hull <= r.tuck.hull && r.nothing.hull <= r.squads.hull + 12), JSON.stringify(rows.map(r => [r.nothing.hit, r.nothing.hull, r.tuck.hull, r.squads.hull])));
  check('TUCK in and the haulers keep 20 points of hull or more that they lose otherwise, on every seed: the torpedoes and the skiffs meet the cruiser\'s shield', rows.every(r => r.tuck.haulers === 3 && r.tuck.hull - r.nothing.hull >= 20 && r.tuck.shield < 150), JSON.stringify(rows.map(r => [r.tuck.hull - r.nothing.hull, r.tuck.shield])));
  check('send ALL SQUADS at the boat and it never fires more than when it is left alone, and on a seed fewer (a boat that is dead fires no more; on two of three before the wing flew in formation)', rows.every(r => r.squads.launched <= r.nothing.launched) && rows.filter(r => r.squads.launched < r.nothing.launched).length >= 1, JSON.stringify(rows.map(r => [r.squads.launched, r.nothing.launched])));
}
{
  // the whole mission, two ways: the bot that uses the convoy orders against the bot that does not
  const plain = seeds.map(s => fly(2, s, 'plain')), tuck = seeds.map(s => fly(2, s, 'tuck'));
  check('1.3 flown with the convoy orders loses no hauler on any seed, and takes longer for it (tucked haulers fly at the cruiser\'s side): the cost of safety is time', tuck.every(r => r.res === 'won' && r.lostH === 0) && tuck.reduce((a, r) => a + r.t, 0) > plain.reduce((a, r) => a + r.t, 0), JSON.stringify([plain.map(r => [r.t, r.lostH]), tuck.map(r => [r.t, r.lostH])]));
}

console.log('D. the hints and the words');
{
  g.run(`(() => { const step0 = campStep; window.__H = null; campStep = function (C, dt) { const r = step0.apply(null, arguments); if (window.__H) { const t = campNudge(C, window.__shown); if (t) window.__H.push([Math.round(campMissionClock(C)), t]); } return r; }; })()`);
  const hints = (mission, name) => { g.run('window.__H = []; window.__shown = {}'); bot.run(1, 1, name, 'steady', [], 420, mission); const h = J('window.__H'); g.run('window.__H = null'); return h; };
  const a = hints(1, 'guard'), b = hints(2, 'guard'), find = (h, re) => h.filter(x => re.test(x[1]));
  check('1.2, a player whose wing only guards is told once, 4 s after the second group comes (112 s; the hint waits for the radio line: CAMPL1HINT_WAIT), to give each squad a side, with the squads\' keys from the key table', find(a, /Two groups/).length === 1 && find(a, /Two groups/)[0][0] === 116 && find(a, /Two groups/)[0][1] === `Two groups, two sides. One squad each: ${J(`campKeyVar('viaredattack')`)} red, ${J(`campKeyVar('viagreenattack')`)} green.`, JSON.stringify(a));
  check('and once, 4 s after the torpedo boats come (175 s), to tuck the miners in, naming the list and the row from the table', find(a, /Torpedo boats! Tuck the miners in/).length === 1 && find(a, /Torpedo boats!/)[0][0] === 179 && find(a, /Torpedo boats!/)[0][1].indexOf(J(`campKeyVar('viactuck')`) + ', "' + J(`campKeyVar('rowctuck')`) + '"') > 0, JSON.stringify(a));
  check('1.3: once at the torpedo boat, once when the last hauler is raided, once at first contact (after 200 s), in that order; no hint has a brace left', ['A torpedo boat!', 'The last hauler is alone', 'Not pirates'].every(w => b.filter(x => x[1].indexOf(w) === 0).length === 1) && b.findIndex(x => /torpedo boat/.test(x[1])) < b.findIndex(x => /last hauler/.test(x[1])) && b.findIndex(x => /last hauler/.test(x[1])) < b.findIndex(x => /Not pirates/.test(x[1])) && b.find(x => /Not pirates/.test(x[1]))[0] >= 200 && a.concat(b).every(x => !/[{}]/.test(x[1])) && b.find(x => /Not pirates/.test(x[1]))[1] === `Not pirates. All squads on them: ${J(`campKeyVar('viaattack')`)}, "${J(`campKeyVar('rowattack')`)}".` /* the row is named: "key, Enter" is only true of a list's first row, and Launch is first in All squads now */, JSON.stringify(b));
  check('a hint is for its own mission only: 1.1 shows none of these, and a mission of another level asks nothing of this file', J(`(() => { const C = campNew(1, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; const D = campNew(2, [], { seed: 1, mission: 0 }); D.arrivedAt = 0; return [campL1Nudge(C, {}), campL1Nudge(D, {}), campL1Nudge(null, {})]; })()`).every(x => x === null));
  const keys = ['camp.say.l1p.west', 'camp.say.l1p.second', 'camp.say.l1p.boats', 'camp.say.l1p.haulboats', 'camp.say.l1p.rear', 'camp.say.l1p.again', 'camp.hint.l1p.split', 'camp.hint.l1p.boats', 'camp.hint.l1p.mend', 'camp.hint.l1p.haulboats', 'camp.hint.l1p.rear', 'camp.hint.l1p.contact', 'camp.bf.1.2.w5', 'camp.bf.1.3.w5'];
  const md = readFileSync(join(ROOT, 'content/text/campl1pacing.md'), 'utf8'), words = k => J(`uiText(${JSON.stringify(k)})`).split(/\s+/).length;
  check('the new words are in a file of their own (content/text/campl1pacing.md) and in the game\'s table, and every wave of 1.2 and 1.3 says a line that exists', keys.every(k => md.indexOf('| ' + k + ' |') >= 0 && J(`uiText(${JSON.stringify(k)})`) !== k) && J('[1, 2].flatMap(i => CAMP.levels[1].missions[i].waves.map(w => w.say))').every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
  check('the ship\'s lines are curt: no radio line of the new beats is over 12 words, and no hint over 14', keys.filter(k => /say/.test(k)).every(k => words(k) <= 12) && keys.filter(k => /hint/.test(k)).every(k => words(k) <= 14), keys.map(k => words(k)).join());
  check('no alien is named before it is met: no word of the new lines says alien, raider, drone or gunship', keys.every(k => !/alien|raider|drone|gunship/i.test(J(`uiText(${JSON.stringify(k)})`))));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nL1 PACING FAIL (${failed} of ${n})` : `\nL1 PACING PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
