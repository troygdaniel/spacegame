// smoke: the Campaign's anomalies, cloaked enemy caches: the table, noticing, the decloak, the guards, the reward once, the bonus, the save, the refit's extra choice, the haze (plain Node, no Chrome)
// Card space-game-campaign-anomalies (src/campanomaly.js, src/campanomalydraw.js; the table CAMP.levels[n].anomalies and CAMP.anomaly in src/campaign.js; the nav list, the map and the radar; the scene's refit).
// Off the missions' routes there are spots where space looks warped: a cloaked cache of the aliens, weapons and tech, with cloaked guards. Noticed from afar (a mark, "Anomaly"), visited for two seconds it
// decloaks, the guards come out, and when they are dead the reward is given once: ore, a heavier weapon, a tech item for the Earth refit. What was looted is saved and stays looted.
//   A. the table            B. noticing: the range, the marks, the list, the words        C. the decloak: the visit, the guards
//   D. the reward, once     E. the bonus objective and the score                           F. the save, the old loot, the refit's extra choice
//   G. the autopilot flies to one                  H. the haze: what is drawn, where, how strongly
// Run: node tests/campanomaly.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = (level, mission, found, techs) => { window.C = campNew(level, techs || [], { seed: 5, mission: mission || 0, god: true, found: found || [] }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12; C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); } };
  window.__A = id => C.anoms.find(a => a.id === id);
  window.__at = (id, d) => { const a = __A(id), c = C.carrier; c.x = a.x - d; c.y = a.y; c.vx = 0; c.vy = 0; };
  window.__kill = id => { __A(id).ids.forEach(i => { if (C.by[i]) C.by[i].hp = 0; }); };
  window.__evs = () => C.events.splice(0).map(e => e.type + (e.stage ? ':' + e.stage : ''));
`);

// ---------- A. the table ----------
console.log('A. the table');
{
  const K = J('CAMP.anomaly');
  check('the numbers are one table, CAMP.anomaly, each with a comment: the range that notices, the visit range and seconds, the autopilot stop, the haze, the size, the guards\' ring, the beat, the ore in a chunk', ['sense', 'visit', 'hold', 'stop', 'haze', 'size', 'ring', 'done', 'chunk'].every(k => typeof K[k] === 'number') && (() => { const s = src('src/campaign.js'), i = s.indexOf('  anomaly: {'), j = s.indexOf('  tech: {'); return s.slice(i, j).split('\n').filter(l => l.includes(':')).every(l => l.includes('//')); })(), JSON.stringify(K));
  check('the autopilot stops inside the visit range (so a Fast trip there decloaks it), and the haze is seen from farther than the visit and nearer than the notice range', K.stop < K.visit && K.visit < K.haze && K.haze < K.sense, JSON.stringify([K.stop, K.visit, K.haze, K.sense]));
  const rows = [1, 2, 3].map(l => J(`campAnomalyRows(${l})`));
  check('every level has two or three anomalies at least (the belt five, with two far ones round Mars and Jupiter), ids unique in the level, a key "<level>.<id>", every row a place and a size', rows.every((r, i) => r.length >= 3 && new Set(r.map(a => a.id)).size === r.length && r.every(a => a.key === (i + 1) + '.' + a.id && Number.isFinite(a.x) && Number.isFinite(a.y) && a.r > 0)) && rows[0].length === 5, rows.map(r => r.length).join());
  const far = rows[0].filter(a => ['marsdust', 'io'].includes(a.id));
  check('the far ones of the belt are where Mars and Jupiter are (a place and an offset: 20,000 px and more from where the cruiser starts), the near ones are in the belt (under 5,000 px)', far.length === 2 && far.every(a => Math.hypot(a.x, a.y) > 20000) && rows[0].filter(a => !['marsdust', 'io'].includes(a.id)).every(a => Math.hypot(a.x, a.y) < 5000), JSON.stringify(rows[0].map(a => [a.id, Math.round(Math.hypot(a.x, a.y))])));
  check('each hides something (weapons or tech: the words exist), has guards of kinds the pirates have, and a reward (ore at least)', [1, 2, 3].every(l => J(`CAMP.levels[${l}].anomalies.every(a => ['weapons', 'tech'].includes(a.hides) && Object.keys(a.guards).length && Object.keys(a.guards).every(k => !!PIRATES[k]) && a.reward.ore > 0)`)));
  check('the tech items looted are techs in the table, offered after "find" (not after a level), and each is in some anomaly\'s reward', J(`['overdrive', 'lens'].every(t => CAMP.tech[t] && CAMP.tech[t].after === 'find' && [1, 2, 3].some(l => CAMP.levels[l].anomalies.some(a => a.reward.tech === t)))`));
  check('the bonus objectives of the missions name an anomaly of their level that exists ({ type: "anomaly", anomaly: id }), one in each mission of each level', [1, 2, 3].every(l => J(`campMissions(${l}).every(m => m.bonus.some(b => b.type === 'anomaly' && CAMP.levels[${l}].anomalies.some(a => a.id === b.anomaly)))`)));
  check('and every anomaly asked for by a mission is a different one (nine missions, nine bonus finds, and the two far ones are only for the sake of the loot)', J(`(() => { const ids = []; [1, 2, 3].forEach(l => campMissions(l).forEach(m => m.bonus.filter(b => b.type === 'anomaly').forEach(b => ids.push(l + '.' + b.anomaly)))); return new Set(ids).size === ids.length && ids.length === 9; })()`));
  g.run('__new(1)');
  check('a new battle: every anomaly hidden, not noticed, nothing found; the magazine, the turrets and the bay as they were', J('C.anoms.length') === 5 && J('C.anoms.every(a => a.state === "hidden" && !a.sensed && a.hold === 0)') && J('C.found.length') === 0 && J('C.magazine') === J('CAMP.missile.magazine') && J('C.turretMul') === 1);
  g.run('window.__r1 = campNew(1, [], { seed: 5 }).rng(); window.__r2 = (() => { const q = campNew(1, [], { seed: 5, found: ["1.veil"] }); return q.rng(); })()');
  check('and the table is not in the dice: the fights fly the same with it (the random stream is not touched by making the anomalies)', J('__r1 === __r2'));
}

// ---------- B. noticing ----------
console.log('B. noticing');
{
  g.run('__new(1)'); const S = J('CAMP.anomaly.sense');
  g.run(`__at('veil', ${S + 100}); __run(0.2)`);
  check('beyond the notice range (' + S + ' px) it is not noticed: no mark, no event, no line', J('__A("veil").sensed') === false && J('campAnomMarks(C).length') === 0 && J('__evs().filter(e => /anomaly|say/.test(e)).length') === 0);
  g.run(`__at('veil', ${S - 100}); __run(0.2)`);
  const ev = J('C.events.map(e => e.type + ":" + (e.stage || e.key || ""))');
  check('inside it, it is noticed: the event, the ship\'s line ("Odd readings ahead"), and once only', J('__A("veil").sensed') === true && ev.includes('anomaly:sense') && ev.includes('say:camp.say.anom.sense') && (g.run('C.events.length = 0; __run(1)'), J('C.events.filter(e => e.stage === "sense").length') === 0));
  const mk = J('campAnomMarks(C)');
  check('the mark for the radar and the map: one, at the spot, unlabelled "Anomaly" (not "cache", no name of what it hides), not shown (not decloaked)', mk.length === 1 && mk[0].id === 'veil' && mk[0].name === 'Anomaly' && mk[0].shown === false && !/cache|weapon|tech/i.test(mk[0].name));
  const mm = J('campMapMarks(C, false).filter(m => m.type === "anomaly")'), lg = J('campMapLegend(C).filter(r => r.type === "anomaly")');
  check('the Tab map has it as a mark of its own (violet, not gold like a cache), and a row in the legend', mm.length === 1 && mm[0].color !== J('CAMPMAP.color.cache') && lg.length === 1 && /^Anomalies/.test(lg[0].text), JSON.stringify(lg));
  const rows = J('campNavRows(C).filter(r => r.kind === "anomaly")');
  check('the nav list has it, "Anomaly", in the group of the finds, with its distance', rows.length === 1 && rows[0].name === 'Anomaly' && rows[0].group === 'finds' && Math.abs(rows[0].dist - (S - 100)) < 5, JSON.stringify(rows));
  check('the words find it: "the anomaly", "that shimmer", "the cloaked cache" are the nearest one that is noticed; none noticed says so in words', J('campNavFind(C, "the anomaly").row.id') === 'anom:veil' && J('campNavFind(C, "the shimmer").row.id') === 'anom:veil' && (g.run('__new(1)'), J('campNavFind(C, "the anomaly").code') === 'noanomaly' && J('campNavCheck(C, "the anomaly").say') === 'No anomaly is noticed yet.'));
  g.run('__new(1)'); g.run(`C.techs = ['lens']; __at('veil', ${S * 1.8}); __run(0.2)`);
  check('the lens tech doubles the notice range: noticed at 1.8 times the range', J('__A("veil").sensed') === true);
  g.run('__new(1)'); g.run(`__at('lee', 100); __run(0.2)`);
  check('the ship computer\'s picture of the battle says what is noticed and how to open it', /Anomalies noticed: 1 .*nearest is \d+ km away.*hold still for 2 seconds/.test(J('campAnomLine(C)')) && (g.run('__new(1)'), J('campAnomLine(C)') === ''));
}

// ---------- C. the decloak ----------
console.log('C. the decloak');
{
  g.run('__new(1)'); const K = J('CAMP.anomaly');
  g.run(`__at('veil', ${K.visit + 60}); __run(4)`);
  check('outside the visit range, however long, it stays cloaked', J('__A("veil").state') === 'hidden' && J('__A("veil").hold') === 0);
  g.run(`__at('veil', ${K.visit - 60}); __run(1.4)`);
  check('inside it the visit counts up (the ring fills) and the cloak holds under two seconds', J('__A("veil").state') === 'hidden' && J('__A("veil").hold') > 1.2);
  g.run(`__at('veil', ${K.visit + 100}); __run(0.7)`);
  check('leaving counts it back down (it is not kept: a pass through the range is not a visit)', J('__A("veil").hold') < 0.8 && J('__A("veil").hold') >= 0);
  g.run(`__at('veil', 50); C.events.length = 0; __run(2.2)`);
  const evs = J('C.events.map(e => e.type + ":" + (e.stage || e.key || ""))');
  check('two seconds inside the range decloak it: the event, the ship says it, and the state is revealed', J('__A("veil").state') === 'revealed' && evs.includes('anomaly:reveal') && evs.includes('say:camp.say.anom.reveal'), evs.join());
  check('its guards come out: the table\'s (two raiders for the veil), of the right kinds, on a ring round the cache, flagged and set against the carrier', J('__A("veil").ids.length') === 2 && J('__A("veil").ids.every(i => C.by[i] && C.by[i].kind === "raider" && C.by[i].team === "alien" && C.by[i].anom === "veil" && C.by[i].goal === "carrier")') && J('__A("veil").ids.every(i => Math.abs(Math.hypot(C.by[i].x - __A("veil").x, C.by[i].y - __A("veil").y) - CAMP.anomaly.ring) < 150)'));
  g.run('__new(1)'); g.run(`__at('shade', 0); __run(2.2)`);
  check('the guards are what the table says (shade: three raiders and a gunship)', J('__A("shade").ids.map(i => C.by[i].kind).sort().join()') === 'gunship,raider,raider,raider');
  g.run(`__run(1)`); const rv = J('campAnomMarks(C)');
  check('decloaked, the mark turns into the cache: shown, named "Alien cache", in the nav list under that name; it is still a place to fly to', rv.length === 1 && rv[0].shown === true && rv[0].name === 'Alien cache' && J('campNavRows(C).filter(r => r.kind === "anomaly").map(r => r.name).join()') === 'Alien cache' && J('campNavTarget(C, campNavRows(C).find(r => r.kind === "anomaly")).x') === J('__A("shade").x'));
  check('and a cache decloaked is not decloaked twice: staying there does not bring more guards', (g.run('__run(3)'), J('C.ships.filter(u => u.anom === "shade").length') === 4));
  check('the ship that decloaks it is the carrier\'s: a fighter of the wing at the spot with the carrier far away does not decloak it', (() => { g.run('__new(1)'); g.run(`var a = __A('veil'); C.carrier.x = a.x + 3000; C.carrier.y = a.y; var f = campSpawn(C, 'fighter', a.x, a.y); f.order = { type: 'guard' }; f.x = a.x; f.y = a.y; __run(3)`); return J('__A("veil").state') === 'hidden'; })());
}

// ---------- D. the reward, once ----------
console.log('D. the reward, once');
{
  g.run('__new(1)'); g.run(`__at('veil', 0); __run(2.2)`);
  const m0 = J('C.missiles'), mag0 = J('C.magazine');
  g.run('__run(2)');
  check('with the guards alive there is no reward: nothing looted, the cache still revealed', J('__A("veil").state') === 'revealed' && J('C.found.length') === 0 && J('C.anomsFound') === 0);
  g.run('__at("veil", 3000); C.events.length = 0; __kill("veil"); __run(0.2)'); // the carrier is off, so the chunks of the reward lie there
  check('a beat after the last guard dies (CAMP.anomaly.done ms) and not before', J('__A("veil").state') === 'revealed' && (g.run('__run(1)'), J('__A("veil").state') === 'done'));
  const done = J('C.events.find(e => e.type === "anomaly" && e.stage === "done")');
  check('the reward event says what it was (the veil: 60 ore, 2 missiles), once, with the key to save', done && done.key === '1.veil' && done.reward.ore === 60 && done.reward.missiles === 2 && done.reward.turret === 0 && done.reward.tech === '', JSON.stringify(done));
  check('the ore is chunks lying on the cache for any ship to pick up (60 ore: three chunks of 25), and the carrier picks them up', J('C.pickups.filter(p => p.kind === "chunk").length') === 3 && J('C.pickups.filter(p => p.kind === "chunk").reduce((a, p) => a + p.ore, 0)') === 75 && (g.run('var o0 = C.ore; __at("veil", 20); __run(2); window.__o = C.ore - o0'), J('__o') === 75 && J('C.pickups.filter(p => p.kind === "chunk").length') === 0));
  check('the weapons: the magazine holds two more (to ' + (mag0 + 2) + '), the missiles in it two more at once', J('C.magazine') === mag0 + 2 && J('C.missiles') === Math.min(J('C.magazine'), m0 + 2), [J('C.magazine'), J('C.missiles'), m0].join());
  g.run('C.events.length = 0; __run(20)');
  check('and once: the keys, the count and the magazine do not move again, and the state stays done', J('C.found.join()') === '1.veil' && J('C.anomsFound') === 1 && J('C.magazine') === mag0 + 2 && J('__A("veil").state') === 'done' && J('C.events.filter(e => e.stage === "done").length') === 0);
  check('what it says: "The cache is ours: 2 more missiles in the magazine, 60 ore."', J('uiText("camp.say.anom.done", { list: [uiText("camp.anom.got.missiles", { n: 2 }), uiText("camp.anom.got.ore", { n: 60 })].join(", ") })') === 'The cache is ours: 2 more missiles in the magazine, 60 ore.');
  g.run('__new(1)'); g.run(`__at('lee', 0); __run(2.2); __kill('lee'); __run(1)`);
  check('a heavier turret (the lee: 15 percent): the turrets\' damage times 1.15 from then on', Math.abs(J('C.turretMul') - 1.15) < 1e-9);
    const dmg = want => { g.run('__new(1)'); g.run(`(() => { C.turretMul = ${want}; const c = C.carrier, u = campSpawn(C, 'gunship', c.x + 300, c.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7; window.__u = u; C.input.fire = true; __run(4); })()`); return J('1e7 - __u.hp'); };
  const d1 = dmg(1), d2 = dmg(1.5);
  check('and it is in the turrets: the same four seconds with 1.5 times the damage do about 1.5 times the damage to a still gunship', d1 > 0 && Math.abs(d2 / d1 - 1.5) < 0.2, [d1, d2].join());
}

// ---------- E. the bonus objective and the score ----------
console.log('E. the bonus objective and the score');
{
  g.run('__new(1, 0)');
  const b0 = J('campBonuses(C).find(b => b.type === "anomaly")'), s0 = J('campScore(C).bonus');
  check('mission 1 of the belt asks for the veil as a bonus ("Find the cloaked cache"): not met while it is hidden, no points', b0 && b0.anomaly === 'veil' && b0.ok === false && b0.points === 0 && J('uiText("camp.b.anomaly")') === 'Find the cloaked cache');
  g.run(`__at('veil', 0); __run(2.2)`);
  const b1 = J('campBonuses(C).find(b => b.type === "anomaly")'), s1 = J('campScore(C).bonus');
  check('met when the cloak is down (the visit is the find): the points of a bonus (CAMP.score.bonus) and the bonus total of the score is that much more', b1.ok === true && b1.points === J('CAMP.score.bonus') && s1 - s0 === J('CAMP.score.bonus'), [s0, s1].join());
  check('another mission\'s anomaly does not count: the lee (mission 2) found does not meet the veil\'s', (() => { g.run('__new(1, 0)'); g.run(`__at('lee', 0); __run(2.2)`); return J('campBonuses(C).find(b => b.type === "anomaly").ok') === false; })());
  check('what was looted in an earlier flight counts (it was found): with the veil in the saved list the bonus is met from the start', (g.run('__new(1, 0, ["1.veil"])'), J('campBonuses(C).find(b => b.type === "anomaly").ok') === true));
  check('the debrief names it in words, as the other bonuses, and the result keeps its id (the ranks add up the score)', (g.run('__new(1, 0)'), g.run(`__at('veil', 0); __run(2.2)`), J('campScore(C).bonuses.filter(b => b.ok).map(b => b.id).includes("find")') && J('campMissionDone({ level: 1, mission: 0, techs: [], found: [], results: {}, ore: 0, bonus: {} }, 1, 0, campScore(C)).levelDone') === false));
}

// ---------- F. the save, the old loot, the refit ----------
console.log('F. the save, the old loot, the refit');
{
  g.run(`window.__P = campProgressNew(); __P.found = ['1.veil', '2.echo']; campProgressSave(__P); window.__L = campProgressLoad()`);
  check('the keys looted are saved with the progress and read back', JSON.parse(store.get('longhaul.campaign')).found.join() === '1.veil,2.echo' && J('__L.found.join()') === '1.veil,2.echo');
  store.set('longhaul.campaign', JSON.stringify({ level: 1, found: ['1.veil', 'x', 7, '1.veil', '9.' + 'a'.repeat(40), '<script>', '2.ghost'] }));
  check('rubbish in the save is left out (only "<level>.<id>" words, once each)', J('campProgressLoad().found.join()') === '1.veil,2.ghost');
  g.run('__new(1, 0, ["1.veil", "1.lee"])');
  check('a looted anomaly is old when the next battle begins: not shown, not noticed, no mark, no guards, no second reward', J('__A("veil").state') === 'old' && J('__A("lee").state') === 'old' && J('campAnomMarks(C).length') === 0 && (g.run(`__at('veil', 0); __run(4)`), J('C.ships.filter(u => u.anom).length') === 0 && J('C.events.filter(e => e.type === "anomaly").length') === 0));
  check('and its weapons stay with the pilot: the magazine two more, filled at the start, the turrets 15 percent heavier', (g.run('__new(1, 0, ["1.veil", "1.lee"])'), J('C.magazine') === J('CAMP.missile.magazine') + 2 && J('C.missiles') === J('CAMP.missile.magazine') + 2 && Math.abs(J('C.turretMul') - 1.15) < 1e-9));
  check('the magazine never passes CAMP.missile.max, however much is looted', (g.run('__new(1, 0, ["1.veil", "1.shade", "1.marsdust", "2.wreck", "2.echo", "3.nest", "3.core"])'), J('C.magazine') === J('CAMP.missile.max') && J('C.missiles') <= J('CAMP.missile.max')));
  check('the reload fills the magazine to the bigger number (not to the old one)', (g.run('__new(1, 0, ["1.veil"])'), g.run('C.missiles = 1; C.reloadAt = 0; __run(120)'), J('C.missiles') === J('C.magazine')));
  // the tech items
  g.run(`window.__P = campProgressNew(); __P.found = ['1.shade'];`);
  check('the Earth refit offers what was looted as one more choice after the level\'s three (the shade holds Overdrive)', J('campTechChoices(1, __P).join()') === 'shield,beam,blink,overdrive' && J('campTechChoices(1).join()') === 'shield,beam,blink');
  check('and not again once it is picked, and a tech looted in the belt is still offered at a later pick (nothing is lost by passing it by)', (g.run(`campPick(__P, 'overdrive')`), J('campTechChoices(1, __P).join()') === 'shield,beam,blink') && J('campTechChoices(2, { found: ["1.io"], techs: [] }).join()') === 'plating,bay2,repair,lens');
  g.run(`window.__sc = () => { const F = Object.create(Campaign.prototype); F.P = campProgressNew(); F.P.found = ['1.shade', '1.io']; F.level = 1; F.camp = { ore: 100 }; F.card = []; F.showCard = (t, lines, foot) => { F.card = lines; }; F.hideCard = () => {}; F.next = ore => { F.went = ore; }; return F; }`);
  g.run('window.__F = __sc(); __F.showRefit()');
  check('the refit screen lists the loot after the three, numbered 6 and 7 (4 and 5 buy ships and keep their keys)', J('__F.choices.join()') === 'shield,beam,blink,overdrive,lens' && J('__F.card.filter(l => /^[0-9]   /.test(l)).map(l => l[0]).join("")') === '12367' && /^6   Overdrive/.test(J('__F.card.find(l => /^6 /.test(l))')), J('__F.card.join(" | ")'));
  g.run(`__F.refitKey('Digit6')`);
  check('6 chooses it (shown chosen), 4 still buys a fighter, 5 an escort', J('__F.refit.pick') === 'overdrive' && (g.run(`__F.refit.ore = 100; __F.refit.f = 0; __F.refitKey('Digit4'); __F.refitKey('Digit5')`), J('__F.refit.f') === 1 && J('__F.refit.e') === 1));
  g.run(`__F.refitKey('Enter')`);
  check('Enter keeps it: the pilot has the tech (the scene\'s next() saves the progress) and the next battle is flown with it', J('__F.P.techs.includes("overdrive")'));
  g.run(`window.__C2 = campNew(1, ['overdrive'], { seed: 1 }); __C2.carrier.rot = 0; __C2.input.thrust = 1; for (let i = 0; i < 600; i++) campStep(__C2, 1 / 30); window.__C3 = campNew(1, [], { seed: 1 }); __C3.carrier.rot = 0; __C3.input.thrust = 1; for (let i = 0; i < 600; i++) campStep(__C3, 1 / 30);`);
  check('Overdrive works: the carrier\'s top speed is a quarter higher', Math.abs(J('Math.hypot(__C2.carrier.vx, __C2.carrier.vy) / Math.hypot(__C3.carrier.vx, __C3.carrier.vy)') - J('CAMP.tech.overdrive.speed')) < 0.03);
  g.run('window.__F = __sc(); __F.P.found = ["1.shade"]; __F.level = 2; __F.showPick(); __F.onKey && 0');
  check('the plain pick of the later levels offers it too, as the fourth (key 4: nothing else uses the key there)', J('__F.choices.join()') === 'plating,bay2,repair,overdrive' && /^4   Overdrive/.test(J('__F.card.find(l => /^4 /.test(l))')));
  // the scene saves what is looted at once
  g.run(`window.__S = Object.create(Campaign.prototype); __S.P = campProgressNew(); __S.boom = { explode() {} }; __S.cameras = { main: { flash() {}, shake() {} } }; __S.onEvent({ type: 'anomaly', stage: 'done', key: '1.veil', x: 0, y: 0 }); __S.onEvent({ type: 'anomaly', stage: 'done', key: '1.veil', x: 0, y: 0 })`);
  check('the scene keeps what is looted in the progress and saves it the moment it is looted (once in the list)', J('__S.P.found.join()') === '1.veil' && JSON.parse(store.get('longhaul.campaign')).found.join() === '1.veil');
  g.run('window.C = campNew(1, [], { seed: 1 }); window.__q = Object.create(Campaign.prototype); __q.P = campProgressNew(); __q.P.found = ["1.veil"]; __q.level = 1; __q.opts = { seed: 1 }; window.__qc = __q.makeCamp()');
  check('and passes it into the next battle (the scene\'s makeCamp): the veil is old there', J('__qc.anoms.find(a => a.id === "veil").state') === 'old' && J('__qc.magazine') === J('CAMP.missile.magazine') + 2);
}

// ---------- G. the autopilot ----------
console.log('G. the autopilot flies to one');
{
  g.run('__new(1)'); g.run(`var a = __A('veil'); C.carrier.x = a.x - 2000; C.carrier.y = a.y; __run(0.2)`);
  g.run(`window.__row = campNavRows(C).find(r => r.kind === 'anomaly'); campNavGo(C, __row, true); __run(40)`);
  check('"Fast" to the anomaly flies there, stops inside the visit range, and the cloak drops (the stop distance is the table\'s)', J('__A("veil").state') === 'revealed' && J('campDist(C.carrier, __A("veil"))') < J('CAMP.anomaly.visit'), J('__A("veil").state') + ' ' + Math.round(J('campDist(C.carrier, __A("veil"))')));
  check('the voice\'s words run it: "fly to the anomaly" (the dry check says the distance)', (g.run('__new(1)'), g.run(`var a = __A('veil'); C.carrier.x = a.x - 2000; C.carrier.y = a.y; __run(0.2)`), /anomaly|Anomaly/.test(J('campNavCheck(C, "the anomaly").say')) && J('campNavIntent("go to the anomaly").act') === 'fleet_fly'));
}

// ---------- H. the haze ----------
console.log('H. the haze');
{
  g.run('__new(1)');
  g.run(`window.__rec = () => { const calls = []; const gr = new Proxy({}, { get: (t, k) => k === 'calls' ? calls : (...a) => { calls.push([k, a]); return gr; } }); return gr; }`);
  g.run(`window.__view = (x, y) => ({ x: x - 600, y: y - 400, width: 1200, height: 800 })`);
  const K = J('CAMP.anomaly');
  g.run(`var a = __A('veil'); window.__far = (() => { C.carrier.x = a.x - ${K.haze + 300}; C.carrier.y = a.y; return campAnomHaze(C, a, null); })()`);
  check('beyond the haze range (1,500 px) nothing is drawn', J('__far') === null);
  g.run(`var a = __A('veil'); C.carrier.x = a.x - 1200; C.carrier.y = a.y; window.__h1 = campAnomHaze(C, a, __view(a.x - 400, a.y)); window.__h2 = (() => { C.carrier.x = a.x - 300; return campAnomHaze(C, a, __view(a.x - 300, a.y)); })()`);
  check('inside it, it is drawn, and stronger the nearer the carrier is (a faint haze from afar, full strength close)', J('__h1') && J('__h2') && J('__h2.strength') > J('__h1.strength') && J('__h1.strength') >= 0.35 && J('__h2.strength') <= 1, [J('__h1.strength'), J('__h2.strength')].join());
  check('and not when it is off the screen (the view is what the camera shows: a cheap cull), whatever the range', (g.run(`var a = __A('veil'); C.carrier.x = a.x - 1000; C.carrier.y = a.y; window.__off = campAnomHaze(C, a, { x: a.x + 5000, y: a.y, width: 1200, height: 800 })`), J('__off') === null));
  g.run(`var a = __A('veil'); C.carrier.x = a.x - 400; C.carrier.y = a.y; window.__gr = __rec(); campAnomDraw(__gr, C, __view(a.x - 400, a.y), 12345)`);
  const calls = J('__gr.calls'), alphas = calls.filter(c => c[0] === 'lineStyle').map(c => c[1][2]).concat(calls.filter(c => c[0] === 'fillStyle').map(c => c[1][1]));
  check('the haze is drawn with rings, arcs, a lens and doubled stars: a few dozen calls, and every one faint (alpha at most 0.55: it is subtle)', calls.length > 40 && calls.length < 400 && alphas.length > 30 && Math.max(...alphas) <= 0.55, calls.length + ' calls, max alpha ' + Math.max(...alphas));
  check('it moves: the same anomaly at another time is drawn differently (the ripples go outward)', (g.run(`var a = __A('veil'); window.__gr2 = __rec(); campAnomDraw(__gr2, C, __view(a.x - 400, a.y), 14000)`), JSON.stringify(J('__gr.calls')) !== JSON.stringify(J('__gr2.calls'))));
  check('a ring fills while the carrier holds in the visit range (the progress is drawn: an arc at the visit radius)', (g.run(`var a = __A('veil'); a.hold = 1; window.__gr3 = __rec(); campAnomDraw(__gr3, C, __view(a.x - 400, a.y), 1000)`), J('__gr3.calls.filter(c => c[0] === "arc" && c[1][2] === CAMP.anomaly.visit).length') === 1 && (g.run(`__A('veil').hold = 0`), true)));
  g.run(`var a = __A('veil'); a.state = 'revealed'; window.__gr4 = __rec(); campAnomDraw(__gr4, C, __view(a.x - 400, a.y), 1000)`);
  check('decloaked, the haze is gone and the cache is drawn (a ring, crates, a dish: gold)', J('__gr4.calls.filter(c => c[0] === "fillRect").length') === 8 && J('__gr4.calls.some(c => c[0] === "strokeCircle")') && J('campAnomHaze(C, __A("veil"), null).shown') === true);
  check('looted, there is nothing to draw (the chunks are the pickups\' own), and an old one never was', (g.run(`__A('veil').state = 'done'; window.__gr5 = __rec(); campAnomDraw(__gr5, C, __view(__A('veil').x, __A('veil').y), 1000)`), J('__gr5.calls.length') === 0 && (g.run('__new(1, 0, ["1.veil"])'), g.run(`window.__gr6 = __rec(); campAnomDraw(__gr6, C, __view(__A('veil').x, __A('veil').y), 1000)`), J('__gr6.calls.length') === 0)));
  const scn = src('src/campaignscene.js');
  check('the scene draws it into a layer of its own, cleared every frame (below the ships, above the stars), from the camera\'s own view', /this\.anomG = this\.add\.graphics\(\)\.setDepth\(1\.5\)/.test(scn) && /this\.anomG\.clear\(\); campAnomDraw\(this\.anomG, C, this\.cameras\.main\.worldView/.test(scn));
  check('no shader, no texture of its own: the haze is drawn with the graphics\' own calls (the scene needs no new asset)', !/postFX|setPipeline|createShader|addDisplacement/.test(src('src/campanomalydraw.js')));
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPANOMALY FAIL (${failed} of ${n})` : `\nCAMPANOMALY PASS (${n})`);
process.exitCode = failed ? 1 : 0;
