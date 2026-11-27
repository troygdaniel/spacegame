// smoke: 2.2's guard that runs to call the second group (card space-game-fighter-job-22; BRIEF 8 proposal C): with six guards dead the last one runs away from the cruiser and calls the group when it is 2,400 px off; a ship of yours that kills it first stops the call for good (plain Node, no Chrome)
// src/campaign.js campRunner, the row's `runner: { after, far, rush }`, the third wave row's `on: { runner: true }` (campWaveOn), and 'wave:all' counting a group whose call was never made as gone.
// Run: node tests/campfighterrunner.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`window.T = {}; T.make = (mi, seed) => { const C = campNew(2, ['shield'], { seed, mission: mi }); C.arrivedAt = C.arrivedAt == null ? 0 : C.arrivedAt; return C; };
  T.step = (C, secs) => { for (let i = 0; i < 30 * secs && !C.result; i++) { C.input.thrust = 0; C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); } };
  T.park = C => { C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'carrier') { u.x = -9000; u.y = -9000; u.vx = 0; u.vy = 0; u.hp = Math.max(u.hp, 1e6); } }); C.carrier.hp = 1e6; }; // (the pilots are put away; the cruiser stays at the place, so a guard that runs runs away from it)
  T.six = seed => { const C = T.make(1, seed); T.park(C); { const P = campMissionPlace(C); C.carrier.x = P.x; C.carrier.y = P.y; C.carrier.vx = 0; C.carrier.vy = 0; } C.ships.filter(u => u.guard).slice(0, 6).forEach(u => { u.hp = 0; }); return C; };
  T.waves = C => C.waves.map(w => w.started ? 1 : 0).join('');`);

const rr = J(`(() => { const C = T.make(1, 2); return { r: C.L.runner, third: C.L.waves[2].on, waves: C.L.waves.length }; })()`);
check('2.2\'s row: six dead guards make the last one run, 2,400 px from the cruiser at three times its speed; the second group is on { runner: true }', rr.r && rr.r.after === 6 && rr.r.far === 2400 && rr.r.rush === 3 && rr.third.runner === true && rr.waves === 3, JSON.stringify(rr));

const a = J(`(() => { const C = T.six(3); T.step(C, 0.2); const R = C.runner, u = R && R.id ? C.by[R.id] : null; const out = { chosen: !!u && u.runner === true && u.hold === false && u.guard === true, waves: T.waves(C) }; const d0 = u ? campDist(u, C.carrier) : 0;
  for (let i = 0; i < 30 * 3; i++) campStep(C, 1 / 30); out.grew = u ? campDist(u, C.carrier) > d0 + 200 : false; out.calledEarly = R.called;
  for (let i = 0; i < 30 * 20 && !R.called; i++) campStep(C, 1 / 30); out.called = R.called; out.far = u ? Math.round(campDist(u, C.carrier)) : 0; campStep(C, 1 / 30); out.waves2 = T.waves(C); out.ordinary = u ? u.runner !== true : null; return out; })()`);
check('with six guards dead the last one runs (a runner, awake, still a guard); the second group is not called yet, and the runner flies away from the cruiser', a.chosen && a.waves.slice(2) === '0' && a.grew === true, JSON.stringify(a));
check('left alone it makes its call within 23 s at 2,400 px or more from the cruiser, the second group comes (the third wave row), and the runner is an ordinary guard again', a.called === true && a.far >= 2400 && a.waves2.slice(2) === '1' && a.ordinary === true, JSON.stringify(a));

const b = J(`(() => { const C = T.six(3); T.step(C, 0.2); const R = C.runner, u = C.by[R.id]; T.step(C, 0.5); u.hp = 0; T.step(C, 90); const out = { off: R.off, called: R.called, waves: T.waves(C) };
  C.ships.forEach(v => { if (v.team === 'alien' && v.hp > 0) v.hp = 0; }); T.step(C, 1); out.end = C.result || null; return out; })()`);
check('a ship of yours that kills the runner first stops the call for good: 90 s later the second group has not come; with the other aliens dead the mission is won (a group that never came is not waited for)', b.off === true && b.called === false && b.waves.slice(2) === '0' && b.end === 'won', JSON.stringify(b));

const c = J(`(() => { const C = T.make(1, 5); T.park(C); { const P = campMissionPlace(C); C.carrier.x = P.x; C.carrier.y = P.y; } C.ships.filter(u => u.guard).forEach(u => { u.hp = 0; }); T.step(C, 1); const out = { off: !!(C.runner && C.runner.off), waves: T.waves(C) }; C.ships.forEach(v => { if (v.team === 'alien' && v.hp > 0) v.hp = 0; }); T.step(C, 1); out.end = C.result || null; return out; })()`);
check('all seven guards dead at once, before one could run: no call is made, and the mission is won once the called groups are dead', c.off === true && c.waves.slice(2) === '0' && c.end === 'won', JSON.stringify(c));

const d = J(`(() => { const C = T.make(1, 2); T.park(C); C.carrier.x = -9000; C.carrier.y = -9000; T.step(C, 120); return { runner: !!C.runner && !!C.runner.id, waves: T.waves(C) }; })()`);
check('with no guard dead (the cruiser far away) nobody runs and nothing comes by the clock (120 s)', d.runner === false && d.waves === '000', JSON.stringify(d));

// card space-game-b12-c6-22-runner-stake (BRIEF 12 chunk 6; Troy, 27 Nov 2026: yes): only the fighter the player flies can stop the runner
const e = J(`(() => { const C = T.six(3); T.step(C, 0.2); const R = C.runner, u = C.by[R.id], reach = campReach(C); u.x = C.carrier.x + 220; u.y = C.carrier.y; u.vx = 0; u.vy = 0; const out = { foes: campFoes(C).indexOf(u) >= 0, all: campAliens(C).indexOf(u) >= 0, targeted: 0, near: 0, hp0: u.hp };
  const p0 = { x: u.x, y: u.y }; let p1 = null;
  for (let i = 0; i < 30 * 2 && !R.called; i++) { campStep(C, 1 / 30); if (i === 15) p1 = { x: u.x, y: u.y }; if (campDist(u, C.carrier) < reach) out.near++; if (C.turrets.some(t => t.target === u.id)) out.targeted++; }
  out.moved = Math.round(Math.hypot(u.x - p1.x, u.y - p1.y)); out.hp1 = u.hp; return out; })()`);
check('while it runs the cruiser\'s turrets do not pick it (campFoes leaves it out, campAliens keeps it) although it is inside their reach for a time: they never aim at it, and a ship that is in the fight has not hurt it', e.foes === false && e.all === true && e.near > 0 && e.targeted === 0 && e.hp1 === e.hp0, JSON.stringify(e));
check('it runs at its own three times the pace even with the cruiser at its heels (the fight pace does not slow it): at least 250 px a second', e.moved >= 250, JSON.stringify(e));

const f = J(`(() => { const C = T.six(3); T.step(C, 0.2); const R = C.runner, u = C.by[R.id]; const hp0 = u.hp; campHurt(C, u, 999, C.carrier.id); campHurt(C, u, 999, 'fighter-1'); campHurt(C, u, 999, ''); const out = { glanced: u.hp === hp0, off1: R.off };
  C.cockpit = { id: 'fighter-77' }; campHurt(C, u, 999, 'fighter-77'); C.cockpit = null; out.dead = u.hp <= 0; T.step(C, 0.2); out.off = R.off; out.called = R.called; return out; })()`);
check('a hit from the cruiser, a pilot or nobody does nothing to it; a hit from the fighter the player flies kills it, and the call is stopped', f.glanced === true && f.off1 === false && f.dead === true && f.off === true && f.called === false, JSON.stringify(f));

const g2 = J(`(() => { const C = T.six(3); T.step(C, 0.2); const R = C.runner; for (let i = 0; i < 30 * 12 && !R.called && !C.result; i++) { campStep(C, 1 / 30); C.carrier.hp = 1e6; } campStep(C, 1 / 30); const out = { called: R.called, off: R.off, waves: T.waves(C), rush: C.by[R.id].rushK };
  return out; })()`);
check('with nobody to stop it (the cruiser alone, the pilots away) it gets away within 12 s, makes its call, the group comes, and it is an ordinary guard again at its own speed', g2.called === true && g2.off === false && g2.waves.slice(2) === '1' && g2.rush === 1, JSON.stringify(g2));

const h = J(`(() => { const C = T.six(3); T.step(C, 0.2); const R = C.runner, u = C.by[R.id]; let held = 0; for (let i = 0; i < 30 * 30 && !R.called && !C.result; i++) { u.x = C.carrier.x + 500; u.y = C.carrier.y; u.vx = 0; u.vy = 0; campStep(C, 1 / 30); C.carrier.hp = 1e6; held = i; } campStep(C, 1 / 30); return { called: R.called, secs: Math.round(held / 30), within: C.L.runner.within, waves: T.waves(C) }; })()`);
check('a cruiser that keeps pace with it (held 500 px off, as the plain bot\'s does at Calm) does not keep the call from being made: after 20 s of running the group comes', h.within === 20 && h.called === true && h.secs >= 19 && h.secs <= 21 && h.waves.slice(2) === '1', JSON.stringify(h));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP FIGHTER RUNNER OK (${n} checks)`);
process.exit(failed ? 1 : 0);
