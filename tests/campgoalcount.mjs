// smoke: every goal kind's count in the goal line and the goal panel, in scripted missions on the real sim (plain Node, no Chrome): transports arrived, haulers home, ore mined, ore sold, destroy, hold, scan, caches, relic, and the meter
// Card space-game-12-sell-goal-count (Troy, playing 1.2 on 25 Nov 2026: "it had the ore, i sold it, ended the mission, just didnt have the right number (0/160)"). What the HUD writes is campObjective(C) (the words of content/text) and the page HUD's goal panel
// (campPageHudGoal: a label, a value "0 / 160", a meter share and, for a sale, the ore aboard as a faint share after it). The count of the objective is campObjectives(C)[i]: got (the rule's: done = got >= need) and aboard (the ore in the store toward a sale; 0 for every other goal).
// (campSell), and a dock sells the whole store at once and the mission ends with that sale, so a count of sold ore alone sat at 0 for the player the whole time he carried ore. Now the goal shows the ore sold plus the ore in the store (capped at the
// target), which does not fall when the ore is sold; the rule still wins the mission on the ore sold alone. Every other kind shows its own count.
//   A  1.1: the transport (0 of 1, then arrived: the mission is won)
//   B  1.3: the haulers (0 of 3, need 1; then home: 1, 2, and won)
//   C  1.2: the ore mined (0, 120, 450 of 450), the attackers (no count), the sale: the ore aboard counts; sold in parts the number never falls; the rule wins only on the ore sold
//   D  2.1: the caches picked up (0, 1, 2 of 2); 3.1: the scan points scanned (0, 1, 2, 3 of 3); a hold (seconds of the clock); the relic, the mothership, the towers, the guards and `clear` (a goal with no count: no number, no meter)
//   E  every other kind has no ore aboard and no faint fill; the objective's words read got (the ore SOLD), the meter's faint fill reads aboard
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
  window.__goal = C => { const p = campPageHudGoal(C); return { text: campObjective(C), label: p && p.label, value: p && p.value, frac: p && p.frac, ghost: p && p.ghost }; };
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
  check('the ore mined: "Mine ore: 0 of 450.", 120 of 450 with 120 in the store (the panel "120 / 450", a quarter of the meter, no faint fill), then met at 450 and the goal moves on to the attackers', J('__m0.value') === '0 / 450' && J('__m1.text') === 'Mine ore: 120 of 450.' && J('__m1.value') === '120 / 450' && Math.abs(J('__m1.frac') - 120 / 450) < 1e-9 && J('__m1.ghost') === null && J('__m2.text') === 'Destroy the attackers.' && J('__m2.value') === '' && J('__m2.frac') === null && J('__m2.ghost') === null, JSON.stringify(J('[__m0, __m1, __m2]')));
  g.run(`C.waves.forEach(w => { w.started = true; }); __quiet(C); campStep(C, 1 / 30); window.__s0 = __goal(C);`);
  check('the attackers beaten, the goal is the sale with 450 ore aboard and none sold (Troy, 26 Nov 2026: never full before the sale): the number is the ore SOLD, "0 / 160", the solid meter empty, the faint fill full (the ore aboard, capped at the target)', J('__s0.text') === 'Sell your ore at the Works: 0 of 160.' && J('__s0.value') === '0 / 160' && J('__s0.frac') === 0 && J('__s0.ghost') === 1, JSON.stringify(J('__s0')));
  check('and the rule is on the ore SOLD: nothing is sold, so the goal is not met and the mission is not won while the ore is carried (got 0, aboard 450, done false)', J('__first(C).type') === 'cashin' && J('__first(C).got') === 0 && J('__first(C).aboard') === 450 && J('__first(C).done') === false && J('C.result') === null, JSON.stringify(J('__first(C)')));
  g.run(`C.ore = 60; C.carrier.x = campPlaces(1).ceres.x + 70; C.carrier.y = campPlaces(1).ceres.y - 60; campStep(C, 1 / 30); window.__p0 = __goal(C); window.__d1 = campDock(C, 'ceres'); window.__p1 = __goal(C);`);
  check('60 ore aboard: "0 / 160", the solid meter empty, the faint fill 60 of 160; docked and sold: "60 / 160", the solid meter 60 of 160, no faint fill (the store is empty): the ore went from the faint fill to the solid', J('__p0.value') === '0 / 160' && J('__p0.frac') === 0 && Math.abs(J('__p0.ghost') - 60 / 160) < 1e-9 && J('__d1.ok') === true && J('C.sold') === 60 && J('C.ore') === 0 && J('__p1.value') === '60 / 160' && Math.abs(J('__p1.frac') - 60 / 160) < 1e-9 && J('__p1.ghost') === null && J('__p1.text') === 'Sell your ore at the Works: 60 of 160.' && J('__first(C).got') === 60, JSON.stringify(J('[__p0, __p1]')));
  g.run(`campUndock(C); C.ore = 40; campStep(C, 1 / 30); window.__p2 = __goal(C); campDock(C, 'ceres'); window.__p3 = __goal(C); campUndock(C); C.ore = 120; campStep(C, 1 / 30); window.__p4 = __goal(C);`);
  check('40 more mined: still "60 / 160", the faint fill reaches 100 of 160 (60 sold and 40 aboard: progress moves while mining); sold: "100 / 160", the solid fill there, no faint one; 120 more aboard: "100 / 160" and the faint fill capped at the full meter, the goal not met until it is sold', J('__p2.value') === '60 / 160' && Math.abs(J('__p2.ghost') - 100 / 160) < 1e-9 && J('__p3.value') === '100 / 160' && Math.abs(J('__p3.frac') - 100 / 160) < 1e-9 && J('__p3.ghost') === null && J('C.sold') === 100 && J('__p4.value') === '100 / 160' && J('__p4.ghost') === 1 && J('C.result') === null, JSON.stringify(J('[__p2, __p3, __p4]')));
  g.run(`campDock(C, 'ceres'); campStep(C, 1 / 30); window.__p5 = __goal(C);`);
  check('the last sale takes the sold ore to 220 (over the 160): the goal is met and the mission is won, the line says "Objectives met."', J('C.sold') === 220 && J('__p5.text') === 'Objectives met.' && J('C.result') === 'won', JSON.stringify(J('[__p5, C.sold]')));
}

// ---- D. the other kinds ----
console.log('D. caches, scan points, hold, the goals with no count');
{
  g.run(`window.C = __mk(2, 0); C.arrivedAt = 0; __quiet(C); window.__c0 = __goal(C); window.__take = i => { const k = C.caches[i]; C.carrier.x = k.x; C.carrier.y = k.y; campStep(C, 1 / 30); return __goal(C); }; /* (no __quiet after a cache: the first cache taken calls the attackers, card space-game-b7-level2, and the goal moves on to them only while they live) */ window.__c1 = __take(0); window.__c2 = __take(1);`);
  check('2.1 the caches: "Gather resources: 0 of 2." then 1 of 2 (the panel "1 / 2", half the meter), then 2 of 2 and the goal moves on to the attackers', J('__c0.text') === 'Gather resources: 0 of 2.' && J('__c1.text') === 'Gather resources: 1 of 2.' && J('__c1.value') === '1 / 2' && J('__c1.frac') === 0.5 && J('C.cachesGot') === 2 && J('__c2.text') === 'Destroy the attackers.', JSON.stringify(J('[__c0, __c1, __c2]')));
  g.run(`window.C = __mk(3, 0); C.arrivedAt = 0; __quiet(C); window.__sc0 = __goal(C); window.__scan = i => { const q = C.scan[i]; C.carrier.x = q.x; C.carrier.y = q.y; for (let k = 0; k < Math.round((q.secs + 1.5) * 30); k++) { campStep(C, 1 / 30); __quiet(C); C.carrier.x = q.x; C.carrier.y = q.y; } return __goal(C); }; window.__sc1 = __scan(0); window.__sc2 = __scan(1); window.__sc3 = __scan(2);`);
  check('3.1 the scan points: "Scan the points: 0 of 3." then 1, 2 and 3 of 3 as each is scanned (7 s in its ring), the goal then moves on', J('__sc0.text') === 'Scan the points: 0 of 3.' && J('__sc0.value') === '0 / 3' && J('__sc1.text') === 'Scan the points: 1 of 3.' && J('__sc2.text') === 'Scan the points: 2 of 3.' && J('C.scan.every(p => p.got)') && J('campObjectives(C)[0].done') === true && !/^Scan the points/.test(J('__sc3.text')), JSON.stringify(J('[__sc0, __sc1, __sc2, __sc3]')));
  g.run(`window.C = __mk(1, 1); __quiet(C); C.L.objectives = [{ type: 'hold', secs: 20 }]; C.waves.forEach(w => { w.started = true; }); window.__ho0 = __goal(C); __run(C, 10); __quiet(C); window.__ho1 = __goal(C); __run(C, 11); window.__ho2 = __goal(C);`);
  check('a hold: "Hold the works: 0 of 20 seconds." then the seconds of the mission clock (10 of 20, the panel "10 / 20 seconds", half the meter), then met', J('__ho0.text') === 'Hold the works: 0 of 20 seconds.' && J('__ho0.value') === '0 / 20 seconds' && /^Hold the works: (9|10) of 20 seconds\.$/.test(J('__ho1.text')) && /^(9|10) \/ 20 seconds$/.test(J('__ho1.value')) && Math.abs(J('__ho1.frac') - 0.5) < 0.06 && J('__ho2.text') === 'Objectives met.', JSON.stringify(J('[__ho0, __ho1, __ho2]')));
  const noCount = types => J(`(() => { const out = []; ${JSON.stringify(types)}.forEach(t => { const C = __mk(1, 1); C.arrivedAt = 0; C.L.objectives = [t]; const a = __goal(C), o = campObjectives(C)[0]; out.push({ t: t.type + (t.what ? ':' + t.what : ''), text: a.text, value: a.value, frac: a.frac, done: o.done, aboard: o.aboard, got: o.got }); }); return out; })()`);
  const nc = noCount([{ type: 'relic' }, { type: 'kill', what: 'mother' }, { type: 'kill', what: 'towers' }, { type: 'kill', what: 'guards' }, { type: 'clear' }]);
  check('the goals with no count (the relic, the mothership, the towers, the guards, survive): the words, no number and no meter; none is met at the start', nc.length === 5 && nc.every(x => x.value === '' && x.frac === null && x.done === false && x.aboard === 0) && nc.map(x => x.text).join('|') === 'Hold the ring at the relic.|Destroy the mothership.|Destroy the towers.|Destroy the guards.|Survive the attack.', JSON.stringify(nc));
  g.run(`window.C = __mk(2, 2); C.arrivedAt = 0; C.flags.relic = true; window.__rl = __goal(C);`);
  check('the relic held: met', J('__rl.text') === 'Objectives met.' && J('campObjectives(C)[0].done') === true);
}

// ---- E. ore aboard is the sale's alone ----
console.log('E. ore aboard is the sale\'s alone; the words read the ore sold, the meter\'s faint fill the ore aboard');
{
  const all = J(`(() => { const out = []; [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]].forEach(([lv, mi]) => { const C = __mk(lv, mi); C.ore = 30; C.oreBest = 30; C.sold = 20; C.delivered = 1; C.cachesGot = 1; campObjectives(C).forEach(o => out.push([lv + '.' + (mi + 1), o.type, o.got, o.aboard])); }); return out; })()`);
  check('with some of everything done, only the sale has ore aboard (30 in the store, 20 sold: got 20, aboard 30); every other goal has none', all.length >= 12 && all.every(([m, t, got, aboard]) => t === 'cashin' ? (got === 20 && aboard === 30) : aboard === 0), JSON.stringify(all.filter(x => x[1] === 'cashin' || x[3] !== 0)));
  const gh = J(`(() => { const out = []; [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]].forEach(([lv, mi]) => { const C = __mk(lv, mi); C.ore = 30; C.oreBest = 30; C.arrivedAt = 0; const p = campPageHudGoal(C); out.push([lv + '.' + (mi + 1), p && p.ghost]); }); return out; })()`);
  check('no goal panel but the sale\'s has a faint fill (ghost null)', gh.every(([m, g1]) => g1 === null), JSON.stringify(gh));
  const hud = src('src/camppagehud.js'), cm = src('src/campaign.js'), css = src('src/camppagehud.css');
  check('the objective\'s words read got (the ore sold), the goal panel\'s meter reads got and its faint fill got plus aboard (capped at the target): the DOM has the ghost before the solid fill, shown only for a sale, in the ore colour behind it', /frac: need \? clamp\(o\.got \/ need\) : null, ghost: need && o\.aboard > 0 \? clamp\(\(o\.got \+ o\.aboard\) \/ need\) : null/.test(hud) && /\{ got: o\.got, need: o\.need, total: C\.L\.convoys\.length, secs: o\.need \}/.test(cm) && /done: got >= need/.test(cm) && /R\.goal\.ghost = campPageHudEl\(doc, 'i', 'ph-fill ph-ghost', R\.goal\.meter\); R\.goal\.fill = campPageHudEl/.test(hud) && /set\(G\.ghost, 'display', M\.goal\.ghost == null \? 'none' : ''\)/.test(hud) && /\.ph-fill\.ph-ghost \{ position: absolute; left: 0; top: 0; background: var\(--ph-ore\); opacity: \.32; \}/.test(css) && !/shown/.test(cm.slice(cm.indexOf('function campObjectives'), cm.indexOf('function campObjectives') + 2600)));
  check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
}


console.log(`\n${n - failed}/${n} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
