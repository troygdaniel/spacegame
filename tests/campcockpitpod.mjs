// smoke: the pod (plain Node, no Chrome): the fighter he flies, shot down, loses no pilot: it ejects, the pilot mends 20 s, C waits, nothing is charged; the pilots the AI flies keep today's rule
// Card space-game-chunk5-pod-eject (Troy, 26 Nov 2026; brief 8 proposal B and decision 4). Behind CAMP.flags.cockpit; CAMP.cockpit.pod switches it (off: today's death).
//   A. the eject: no kill, no ship lost, the stick goes back to the cruiser (the view follows), the fighter leaves the board and goes in the repair list, the events say it
//   B. C waits for his pilot for 20 s, says so in words, then works again; the pilot is back whole, as himself, in his squad
//   C. nothing is charged: the lost-ship count, the kills and the score
//   D. the table switch: off, it is today's death (the pilot is lost for the mission)
//   E. the AI's pilots (the ones he is not flying) keep today's rule: shot down, lost for the mission (the 20 s mend is only for a hurt one that landed)
//   F. the ring of the page HUD refills over the 20 s and is the fighter's hull again when he is out
//   G. the scene: one white frame, the line, a pod flying to the cruiser
// Run: node tests/campcockpitpod.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
g.run(`
  window.__mk = () => { CAMP.flags.cockpit = true; CAMP.flags.pagehud = true; CAMP.cockpit.pod = true; const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.t = 1000; campStep(C, 2); C.ships.forEach(u => { if (u.team === 'alien' || u.team === 'neutral') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.events.length = 0; window.__ev = []; window.P = campPanelNew(); return C; };
  window.__run = secs => { for (let i = 0; i < Math.round(secs * 30); i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; } };
  window.__shoot = u => { campHurt(C, u, 1e6, 'x'); C.events.forEach(e => __ev.push(e)); C.events.length = 0; };
`);

console.log('A. the eject');
{
  g.run(`__mk(); campCockpitTake(C); window.__id = C.cockpit.id; window.__u = C.by[__id]; window.__lost0 = C.lostShips; window.__k0 = C.kills; __shoot(__u);`);
  check('shot down in the fighter he flies: no kill, no ship lost, the stick is back with the cruiser (the eye), no cockpit', J('C.lostShips') === J('__lost0') && J('C.kills') === J('__k0') && J('C.cockpit') === null && J('campEye(C) === C.carrier') === true);
  check('the events: the kill effect (a boom, marked pod), the pod itself with the pilot\'s name and the seconds, and the stick given back for "pod"', J(`__ev.some(e => e.type === 'boom' && e.pod === true && e.id === __id)`) && J(`__ev.find(e => e.type === 'pod').name`) === 'Wedge' && J(`__ev.find(e => e.type === 'pod').s`) === 20 && J(`__ev.some(e => e.type === 'cockpit' && e.stage === 'give' && e.why === 'pod')`), JSON.stringify(J('__ev.map(e => e.type + (e.stage ? ":" + e.stage : ""))')));
  g.run(`__run(0.1);`);
  check('the fighter is off the board (as a landed one is), and his pilot is in the repair list for 20 s, in his own squad, with the order he had', J('C.by[__id]') === null && J(`C.ships.every(u => u.id !== __id)`) && J('C.repairs.length') === 1 && J('C.repairs[0].squad') === 'red' && J('C.repairs[0].pod') === true && near(J('C.repairs[0].until - C.t'), 20000 - 100, 150), JSON.stringify(J('C.repairs')));
}

console.log('B. C waits, then works again');
{
  g.run(`campCockpitGive(C, 'hand'); __mk(); campCockpitTake(C); __shoot(C.by[C.cockpit.id]); window.__r = campPanelKey(P, C, 'KeyC', 100);`);
  check('C is refused for his pilot while he mends, and says so: Your pilot is mending: 20 s.', J('__r.used') === true && J('__r.ok') === false && J('__r.say') === 'Your pilot is mending: 20 s.' && J('C.cockpit') === null, JSON.stringify(J('__r')));
  g.run(`__run(10); window.__r = campPanelKey(P, C, 'KeyC', 200);`);
  check('halfway, still refused (10 s left), the take itself too', J('__r.say') === 'Your pilot is mending: 10 s.' && J('campCockpitTake(C)') === false && J('campCockpitPodWait(C)') === 10);
  g.run(`__run(10.5);`);
  const red = J(`C.ships.filter(u => u.kind === 'fighter' && u.squad === 'red').map(u => [u.id, u.hp, u.maxHp])`);
  check('after 20 s he is out again: a red fighter, whole, as Wedge (his pilot, his squad)', red.length === 1 && red[0][1] === red[0][2] && red[0][1] > 0 && J('C.repairs.length') === 0 && J(`campSelLabel(CAMP_SELPILOT + 'red')`) === 'Wedge', JSON.stringify(red));
  g.run(`window.__r = campPanelKey(P, C, 'KeyC', 300);`);
  check('and C works again: it takes him (Wedge)', J('__r.ran') === true && J('__r.ok') === true && J('!!C.cockpit') === true && J(`C.by[C.cockpit.id].squad`) === 'red', JSON.stringify(J('__r')));
}

console.log('C. nothing is charged');
{
  g.run(`__mk(); campCockpitTake(C); __shoot(C.by[C.cockpit.id]); __run(1);`);
  check('the lost-ship count is 0 and the score charges no ship lost (the speed part moves with the clock: only the loss lines are pinned)', J('C.lostShips') === 0 && J('campScore(C).lost') === 0 && J('campScore(C).haulerLost || 0') === 0, JSON.stringify(J('campScore(C)')));
}

console.log('D. the switch');
{
  g.run(`__mk(); CAMP.cockpit.pod = false; campCockpitTake(C); window.__id = C.cockpit.id; __shoot(C.by[__id]); __run(0.1);`);
  check('off: today\'s death: a ship lost, the stick back, no pod event, nothing in the repair list, and C is free at once (it takes another pilot)', J('C.lostShips') === 1 && J('C.cockpit') === null && J(`__ev.some(e => e.type === 'pod')`) === false && J('(C.repairs || []).length') === 0 && J('(C.podUntil || 0)') === 0 && J('campCockpitTake(C)') === true);
  g.run(`CAMP.cockpit.pod = true;`);
}

console.log('E. the pilots the AI flies');
{
  g.run(`__mk(); window.__w = C.by['fighter-6']; __shoot(__w); __run(0.1);`);
  check('a fighter shot down while he is in the cruiser is lost for the mission, as today (a ship lost, no mend, no pod): the 20 s is only for a hurt one that lands', J('C.lostShips') === 1 && J('(C.repairs || []).length') === 0 && J(`__ev.some(e => e.type === 'pod')`) === false && J(`campWing(C, 'fighter').every(u => u.squad !== 'green')`) === true);
}

console.log('F. the ring');
{
  g.run(`__mk(); campCockpitTake(C); __shoot(C.by[C.cockpit.id]); __run(10);`);
  const ring = () => J(`(() => { const m = campPageModel(C); return m.pilots.items[0]; })()`);
  const r1 = ring();
  g.run(`__run(5);`);
  const r2 = ring();
  check('Wedge\'s ring is the mend: dim (not out), filling in the hull\'s own green (never the hostile pink of a low ring), about half at 10 s and three quarters at 15 s', r1.on === false && r1.color === 'good' && r2.color === 'good' && near(J('campRepairProgress(C, "red")'), 15 / 20, 0.03) && r2.frac > r1.frac && near(r1.frac, 0.5, 0.05), JSON.stringify([r1, r2]));
  g.run(`__run(5.5);`);
  const r3 = ring();
  check('out again: the ring is the fighter\'s hull (whole)', r3.on === true && near(r3.frac, 1, 1e-9), JSON.stringify(r3));
  check('a squad with nobody in the bay has no progress (-1)', J('campRepairProgress(C, "green")') === -1);
}

console.log('G. the scene');
{
  g.run(`__mk(); window.__rec = []; toast = (s, msg) => { __rec.push(['toast', msg]); }; window.__sc = Object.create(Campaign.prototype); __sc.camp = C; __sc.cameras = { main: { flash(...a) { __rec.push(['flash', a.join()]); } } }; window.__gfx = { calls: 0, destroyed: false, setDepth() { return this; }, clear() { return this; }, fillStyle() { return this; }, lineStyle() { return this; }, fillRoundedRect() { this.calls++; return this; }, strokeRoundedRect() { return this; }, destroy() { this.destroyed = true; } }; __sc.add = { graphics: () => __gfx }; __sc.tweens = { add(o) { __rec.push(['tween', o.duration]); window.__tw = o; } }; __sc.podShow({ type: 'pod', x: C.carrier.x + 800, y: C.carrier.y, name: 'Wedge', s: 20 });`);
  check('one white frame, the line "Wedge ejected. Back in 20 s.", and a pod tween of 1.6 s to the cruiser', J(`__rec.some(r => r[0] === 'flash' && r[1].startsWith('70,255,255,255'))`) && J(`__rec.some(r => r[0] === 'toast' && r[1] === 'Wedge ejected. Back in 20 s.')`) && J(`__rec.some(r => r[0] === 'tween' && r[1] === 1600)`) && J('__gfx.calls') >= 1, JSON.stringify(J('__rec')));
  g.run(`__tw.onUpdate(); __tw.onComplete();`);
  check('the pod is drawn each frame and gone when it arrives', J('__gfx.calls') >= 2 && J('__gfx.destroyed') === true);
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
