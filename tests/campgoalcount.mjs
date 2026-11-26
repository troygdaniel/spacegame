// smoke: every goal kind's count in the goal line and the goal panel, in scripted missions on the real sim (plain Node, no Chrome): transports arrived, haulers home, ore mined, ore sold, destroy, hold, scan, caches, relic, and the meter
// Card space-game-12-sell-goal-count (Troy, playing 1.2 on 25 Nov 2026: "it had the ore, i sold it, ended the mission, just didnt have the right number (0/160)"). What the HUD writes is campObjective(C) (the words of content/text) and the page HUD's goal panel
// (campPageHudGoal: a label, a value "0 / 160", a meter share). The count of the objective is campObjectives(C)[i]: got (the rule's: done = got >= need) and shown (what the HUD writes). For the sale (a `cashin` goal) the rule counts the ore SOLD
// (campSell), and a dock sells the whole store at once and the mission ends with that sale, so a count of sold ore alone sat at 0 for the player the whole time he carried ore. Now the goal shows the ore sold plus the ore in the store (capped at the
// target), which does not fall when the ore is sold; the rule still wins the mission on the ore sold alone. Every other kind shows its own count.
//   A  1.1: the transport (0 of 1, then arrived: the mission is won)
//   B  1.3: the haulers (0 of 3, need 1; then home: 1, 2, and won)
//   C  1.2: the ore mined (0, 120, 450 of 450), the attackers (no count), the sale: the ore aboard counts; sold in parts the number never falls; the rule wins only on the ore sold
//   D  2.1: the caches picked up (0, 1, 2 of 2); 3.1: the scan points scanned (0, 1, 2, 3 of 3); a hold (seconds of the clock); the relic, the mothership, the towers, the guards and `clear` (a goal with no count: no number, no meter)
//   E  shown is got for every kind but the sale; the goal panel reads shown (value and meter), and the objective words read shown
// Run: node tests/campgoalcount.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__mk = (lv, mi, o) => { const C = campNew(lv, [], Object.assign({ seed: 3, mission: mi }, o || {})); C.god = true; return C; };
  window.__run = (C, secs) => { for (let i = 0; i < Math.round(secs * 30) && !C.result; i++) campStep(C, 1 / 30); };
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); };
  window.__goal = C => { const p = campPageHudGoal(C); return { text: campObjective(C), label: p && p.label, value: p && p.value, frac: p && p.frac }; };
  window.__first = C => campObjectives(C).find(o => !o.done) || null;
`);

// ---- A. 1.1 ----
console.log('A. 1.1: the transport');
{
  g.run(`window.C = __mk(1, 0); window.__g0 = __goal(C);`);
  check('at the start: "Transport arrived: 0 of 1." (the panel "0 / 1", an empty meter)', J('__g0.text') === 'Transport arrived: 0 of 1.' && J('__g0.label') === 'Transport arrived' && J('__g0.value') === '0 / 1' && J('__g0.frac') === 0, JSON.stringify(J('__g0')));
  g.run(`__quiet(C); for (let i = 0; i < 30 * 70 && !C.ships.some(u => u.kind === 'freighter'); i++) { campStep(C, 1 / 30); __quiet(C); } window.__g1 = __goal(C); const f = C.ships.find(u => u.kind === 'freighter'); f.x = f.dest.x; f.y = f.dest.y; campStep(C, 1 / 30); window.__g2 = __goal(C);`);
  check('with the transport under way the count is the same; when she arrives it is met, the mission is won', J('__g1.value') === '0 / 1' && J('C.delivered') === 1 && J('__g2.text') === 'Objectives met.' && J('C.result') === 'won', JSON.stringify(J('[__g1, __g2]')));
}

// ---- B. 1.3 ----
console.log('B. 1.3: the haulers');
{
  g.run(`window.C = __mk(1, 2); __quiet(C); for (let i = 0; i < 30 * 70 && !C.ships.some(u => u.kind === 'freighter'); i++) { campStep(C, 1 / 30); __quiet(C); } window.__h0 = __goal(C);
    window.__arrive = () => { for (let i = 0; i < 30 * 70 && !C.ships.some(u => u.kind === 'freighter' && u.hp > 0); i++) { campStep(C, 1 / 30); __quiet(C); } const f = C.ships.filter(u => u.kind === 'freighter' && u.hp > 0).sort((a, b) => a.id < b.id ? -1 : 1)[0]; if (f) { f.x = f.dest.x; f.y = f.dest.y; } campStep(C, 1 / 30); __quiet(C); return __goal(C); }; window.__h1 = __arrive();`);
  check('three haulers fly and one must arrive: "Haulers delivered: 0 of 3, need 1." (the panel "0 / 3, need 1"); the first home: "Haulers home: 1. Still flying: 2."', J('__h0.text') === 'Haulers delivered: 0 of 3, need 1.' && J('__h0.value') === '0 / 3, need 1' && J('__h1.text') === 'Haulers home: 1. Still flying: 2.' && J('C.delivered') === 1, JSON.stringify(J('[__h0, __h1]')));
  g.run(`window.__h2 = __arrive();`);
  check('the second home: "Haulers home: 2. Still flying: 1."', J('__h2.text') === 'Haulers home: 2. Still flying: 1.' && J('C.delivered') === 2, JSON.stringify(J('__h2')));
}

// ---- C. 1.2 ----
console.log('C. 1.2: the ore mined, the attackers, the sale');
{
  g.run(`window.C = __mk(1, 1); __quiet(C); window.__m0 = __goal(C); C.ore = 120; campStep(C, 1 / 30); window.__m1 = __goal(C); C.ore = 450; campStep(C, 1 / 30); window.__m2 = __goal(C);`);
  check('the ore mined: "Mine ore: 0 of 450.", 120 of 450 with 120 in the store (the panel "120 / 450", a quarter of the meter), then met at 450 and the goal moves on to the attackers', J('__m0.value') === '0 / 450' && J('__m1.text') === 'Mine ore: 120 of 450.' && J('__m1.value') === '120 / 450' && Math.abs(J('__m1.frac') - 120 / 450) < 1e-9 && J('__m2.text') === 'Destroy the attackers.' && J('__m2.value') === '' && J('__m2.frac') === null, JSON.stringify(J('[__m0, __m1, __m2]')));
  g.run(`C.waves.forEach(w => { w.started = true; }); __quiet(C); campStep(C, 1 / 30); window.__s0 = __goal(C);`);
  check('the attackers beaten, the goal is the sale: the 450 ore aboard shows as 160 of 160 (the target caps it) in the line and the panel, the meter full: Troy\'s picture read 0 / 160 here', J('__s0.text') === 'Sell your ore at the Works: 160 of 160.' && J('__s0.value') === '160 / 160' && J('__s0.frac') === 1, JSON.stringify(J('__s0')));
  check('but the rule is on the ore SOLD: nothing is sold, so the goal is not met and the mission is not won while the ore is carried (got 0, shown 160, done false)', J('__first(C).type') === 'cashin' && J('__first(C).got') === 0 && J('__first(C).shown') === 160 && J('__first(C).done') === false && J('C.result') === null, JSON.stringify(J('__first(C)')));
  g.run(`C.ore = 60; C.carrier.x = campPlaces(1).ceres.x + 70; C.carrier.y = campPlaces(1).ceres.y - 60; campStep(C, 1 / 30); window.__p0 = __goal(C); window.__d1 = campDock(C, 'ceres'); window.__p1 = __goal(C);`);
  check('60 ore aboard: "60 of 160"; docked and sold, the number does not move or fall (60 of 160, sold 60, the store empty): the ore went from the store to the sold count', J('__p0.value') === '60 / 160' && J('__d1.ok') === true && J('C.sold') === 60 && J('C.ore') === 0 && J('__p1.value') === '60 / 160' && J('__p1.text') === 'Sell your ore at the Works: 60 of 160.' && J('__first(C).got') === 60, JSON.stringify(J('[__p0, __p1]')));
  g.run(`campUndock(C); C.ore = 40; campStep(C, 1 / 30); window.__p2 = __goal(C); campDock(C, 'ceres'); window.__p3 = __goal(C); campUndock(C); C.ore = 120; campStep(C, 1 / 30); window.__p4 = __goal(C);`);
  check('40 more mined: "100 of 160" (60 sold and 40 aboard); sold: still 100; 120 more aboard: capped at 160 of 160 (not met until it is sold)', J('__p2.value') === '100 / 160' && J('__p3.value') === '100 / 160' && J('C.sold') === 100 && J('__p4.value') === '160 / 160' && J('C.result') === null, JSON.stringify(J('[__p2, __p3, __p4]')));
  g.run(`campDock(C, 'ceres'); campStep(C, 1 / 30); window.__p5 = __goal(C);`);
  check('the last sale takes the sold ore to 220 (over the 160): the goal is met and the mission is won, the line says "Objectives met."', J('C.sold') === 220 && J('__p5.text') === 'Objectives met.' && J('C.result') === 'won', JSON.stringify(J('[__p5, C.sold]')));
}

// ---- D. the other kinds ----
console.log('D. caches, scan points, hold, the goals with no count');
{
  g.run(`window.C = __mk(2, 0); C.arrivedAt = 0; __quiet(C); window.__c0 = __goal(C); window.__take = i => { const k = C.caches[i]; C.carrier.x = k.x; C.carrier.y = k.y; campStep(C, 1 / 30); __quiet(C); return __goal(C); }; window.__c1 = __take(0); window.__c2 = __take(1);`);
  check('2.1 the caches: "Gather resources: 0 of 2." then 1 of 2 (the panel "1 / 2", half the meter), then 2 of 2 and the goal moves on to the attackers', J('__c0.text') === 'Gather resources: 0 of 2.' && J('__c1.text') === 'Gather resources: 1 of 2.' && J('__c1.value') === '1 / 2' && J('__c1.frac') === 0.5 && J('C.cachesGot') === 2 && J('__c2.text') === 'Destroy the attackers.', JSON.stringify(J('[__c0, __c1, __c2]')));
  g.run(`window.C = __mk(3, 0); C.arrivedAt = 0; __quiet(C); window.__sc0 = __goal(C); window.__scan = i => { const q = C.scan[i]; C.carrier.x = q.x; C.carrier.y = q.y; for (let k = 0; k < Math.round((q.secs + 1.5) * 30); k++) { campStep(C, 1 / 30); __quiet(C); C.carrier.x = q.x; C.carrier.y = q.y; } return __goal(C); }; window.__sc1 = __scan(0); window.__sc2 = __scan(1); window.__sc3 = __scan(2);`);
  check('3.1 the scan points: "Scan the points: 0 of 3." then 1, 2 and 3 of 3 as each is scanned (7 s in its ring), the goal then moves on', J('__sc0.text') === 'Scan the points: 0 of 3.' && J('__sc0.value') === '0 / 3' && J('__sc1.text') === 'Scan the points: 1 of 3.' && J('__sc2.text') === 'Scan the points: 2 of 3.' && J('C.scan.every(p => p.got)') && J('campObjectives(C)[0].done') === true && !/^Scan the points/.test(J('__sc3.text')), JSON.stringify(J('[__sc0, __sc1, __sc2, __sc3]')));
  g.run(`window.C = __mk(1, 1); __quiet(C); C.L.objectives = [{ type: 'hold', secs: 20 }]; C.waves.forEach(w => { w.started = true; }); window.__ho0 = __goal(C); __run(C, 10); __quiet(C); window.__ho1 = __goal(C); __run(C, 11); window.__ho2 = __goal(C);`);
  check('a hold: "Hold the works: 0 of 20 seconds." then the seconds of the mission clock (10 of 20, the panel "10 / 20 seconds", half the meter), then met', J('__ho0.text') === 'Hold the works: 0 of 20 seconds.' && J('__ho0.value') === '0 / 20 seconds' && /^Hold the works: (9|10) of 20 seconds\.$/.test(J('__ho1.text')) && /^(9|10) \/ 20 seconds$/.test(J('__ho1.value')) && Math.abs(J('__ho1.frac') - 0.5) < 0.06 && J('__ho2.text') === 'Objectives met.', JSON.stringify(J('[__ho0, __ho1, __ho2]')));
  const noCount = types => J(`(() => { const out = []; ${JSON.stringify(types)}.forEach(t => { const C = __mk(1, 1); C.arrivedAt = 0; C.L.objectives = [t]; const a = __goal(C), o = campObjectives(C)[0]; out.push({ t: t.type + (t.what ? ':' + t.what : ''), text: a.text, value: a.value, frac: a.frac, done: o.done, shown: o.shown, got: o.got }); }); return out; })()`);
  const nc = noCount([{ type: 'relic' }, { type: 'kill', what: 'mother' }, { type: 'kill', what: 'towers' }, { type: 'kill', what: 'guards' }, { type: 'clear' }]);
  check('the goals with no count (the relic, the mothership, the towers, the guards, survive): the words, no number and no meter; none is met at the start', nc.length === 5 && nc.every(x => x.value === '' && x.frac === null && x.done === false && x.shown === x.got) && nc.map(x => x.text).join('|') === 'Hold the ring at the relic.|Destroy the mothership.|Destroy the towers.|Destroy the guards.|Survive the attack.', JSON.stringify(nc));
  g.run(`window.C = __mk(2, 2); C.arrivedAt = 0; C.flags.relic = true; window.__rl = __goal(C);`);
  check('the relic held: met', J('__rl.text') === 'Objectives met.' && J('campObjectives(C)[0].done') === true);
}

// ---- E. shown and got ----
console.log('E. shown is got for every kind but the sale; the panel and the words read shown');
{
  const all = J(`(() => { const out = []; [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]].forEach(([lv, mi]) => { const C = __mk(lv, mi); C.ore = 30; C.oreBest = 30; C.sold = 20; C.delivered = 1; C.cachesGot = 1; campObjectives(C).forEach(o => out.push([lv + '.' + (mi + 1), o.type, o.got, o.shown])); }); return out; })()`);
  check('with some of everything done, shown equals got for every objective but the sale (the sale: 20 sold and 30 aboard is 50, got is 20)', all.length >= 12 && all.every(([m, t, got, shown]) => t === 'cashin' ? (got === 20 && shown === 50) : shown === got), JSON.stringify(all.filter(x => x[1] === 'cashin' || x[2] !== x[3])));
  const hud = src('src/camppagehud.js'), cm = src('src/campaign.js');
  check('the goal panel\'s meter reads shown, and the objective\'s words read shown (the rule\'s got is not used for what is written)', /frac: need \? Math\.max\(0, Math\.min\(1, o\.shown \/ need\)\) : null/.test(hud) && /\{ got: o\.shown, need: o\.need, total: C\.L\.convoys\.length, secs: o\.need \}/.test(cm) && /done: got >= need/.test(cm));
  check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
