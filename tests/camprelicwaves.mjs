// smoke: mission 2.3's waves come on what the player does (entering the ring, 5 s held, 10 s held), each from near the relic, and its aliens hold the ring: a fast ship cannot draw them off and win (plain Node, no Chrome)
// Card space-game-23-waves-on-entry (Troy, 26 Nov 2026; the cloud's brief 7, decision 2). Before it the waves came at 3, 24 and 42 s of the mission's clock and flew at the cruiser: a flown fighter drew the first wave
// 2 km off the ring and the mission was won in 16 s with the cruiser untouched (docs/night/cockpit-sweep.md). Now (src/campaign.js):
//   - a wave row's `on: { held: n }` (campWaveOn): it comes when the relic has been held n seconds at best; 0 is the cruiser's first time inside the ring. Nothing comes for the clock.
//   - a wave row's `ring: [dx, dy]`: it comes out of the dark that far from the relic (about 1,100 px), so it is on the ring in a few seconds.
//   - goal 'relic' (campRelicAlien): the wave flies to the relic and fights only what is within the relic row's `leash` of the relic; with nothing of yours there, or drawn outside it, it goes back to the ring.
//   - the hold's own rule is as it was: it counts while the CRUISER is in the ring and no alien is within `clear` px of the RELIC.
// Run: node tests/camprelicwaves.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// the helpers of the page: a new mission 2.3, a step with the cruiser flown at a point (or left alone), and a fighter flown by hand far away
g.run(`
  globalThis.T = {};
  T.make = seed => campNew(2, ['shield'], { seed, mission: 2 });
  T.fly = (C, x, y) => { const c = C.carrier, dx = x - c.x, dy = y - c.y; if (Math.hypot(dx, dy) > 60) { c.rot = Math.atan2(dy, dx); C.input.thrust = 1; C.input.brake = false; } else { C.input.thrust = 0; C.input.brake = true; } C.input.fire = true; };
  T.near = C => Math.round(Math.min(99999, ...campAliens(C).map(u => campDist(u, C.relic))));
  T.started = C => C.waves.map(w => w.started ? 1 : 0).join('');
`);

// ---- the row ----
const row = J(`(() => { const C = T.make(1), L = C.L; return { relic: L.relic, waves: L.waves.map(w => ({ on: w.on, at: w.at == null ? null : w.at, ring: w.ring, goal: w.goal, d: Math.round(Math.hypot(w.ring[0], w.ring[1])) })), win: L.win }; })()`);
check('2.3 is the relic mission, three waves', row.win === 'relic' && row.waves.length === 3, JSON.stringify(row));
check('its waves come on the hold: on entering, at 5 s held, at 10 s held; none has a second of the clock', row.waves.map(w => w.on && w.on.held).join() === '0,5,10' && row.waves.every(w => w.at === null), JSON.stringify(row.waves));
check('each comes out of the dark 1,000 to 1,300 px from the relic (outside the clear radius and the leash, a few seconds from the ring) and is sent at the relic', row.waves.every(w => w.d >= 1000 && w.d <= 1300 && w.d > row.relic.leash && w.goal === 'relic'), JSON.stringify(row.waves));
check('the hold is longer than the last wave\'s mark, and the leash is wider than the clear radius (an alien that fights at the leash\'s edge still stops the hold when it goes back)', row.relic.hold > 10 && row.relic.leash > row.relic.clear && row.relic.stand < row.relic.clear, JSON.stringify(row.relic));

// ---- nothing comes for the clock ----
const idle = J(`(() => { const C = T.make(2); for (let i = 0; i < 30 * 90 && !C.result; i++) campStep(C, 1 / 30); return { started: T.started(C), aliens: campAliens(C).length, result: C.result || null, entered: C.relic.entered }; })()`);
check('a cruiser that never enters the ring meets no wave in 90 s (and has not won)', idle.started === '000' && idle.aliens === 0 && idle.result === null && idle.entered === false, JSON.stringify(idle));

// ---- the waves follow the hold ----
const flow = J(`(() => { const C = T.make(5), R = C.relic, at = [null, null, null], best = [null, null, null]; let i = 0;
  for (; i < 30 * 200 && !C.result; i++) { T.fly(C, R.x, R.y); campStep(C, 1 / 30); C.waves.forEach((w, k) => { if (w.started && at[k] == null) { at[k] = +(i / 30).toFixed(1); best[k] = +R.best.toFixed(2); } }); }
  return { at, best, result: C.result, secs: Math.round(i / 30), kills: C.kills, hull: Math.round(C.carrier.hp) }; })()`);
check('flown onto the ring: the first wave comes as the cruiser enters', flow.at[0] != null && flow.best[0] < 0.2, JSON.stringify(flow));
check('the second comes when the relic has been held 5 s, the third at 10 s', flow.best[1] >= 5 && flow.best[1] < 5.2 && flow.best[2] >= 10 && flow.best[2] < 10.2 && flow.at[0] < flow.at[1] && flow.at[1] < flow.at[2], JSON.stringify(flow));
check('the mission is won, after all three waves, in 60 to 130 s', flow.result === 'won' && flow.secs >= 60 && flow.secs <= 130, JSON.stringify(flow));

// ---- the wave reaches the ring and stops the hold ----
const reach = J(`(() => { const C = T.make(7), R = C.relic; let t0 = null, tIn = null, holdAtIn = null, i = 0;
  for (; i < 30 * 40; i++) { T.fly(C, R.x, R.y); C.input.fire = false; campStep(C, 1 / 30); if (C.waves[0].started && t0 == null) t0 = i / 30; if (t0 != null && tIn == null && T.near(C) <= C.L.relic.clear) { tIn = i / 30; holdAtIn = R.hold; break; } }
  for (let k = 0; k < 30 * 3; k++) { T.fly(C, R.x, R.y); C.input.fire = false; campStep(C, 1 / 30); }
  return { t0, tIn, took: tIn == null ? null : +(tIn - t0).toFixed(1), holdAtIn, holdAfter: R.hold, near: T.near(C) }; })()`);
check('the first wave is inside the clear radius within 8 s of coming', reach.took != null && reach.took <= 8, JSON.stringify(reach));
check('and the hold falls while it is there', reach.holdAfter < reach.holdAtIn || reach.holdAfter === 0, JSON.stringify(reach));

// ---- a fast ship cannot draw the wave off the ring ----
// the kite of the sweep: the cruiser sits on the ring and does not fire; a fighter of yours shoots at the wave from 700 px and then runs 2,500 px away, again and again (it is moved by hand: faster than any alien, and never hit)
const kite = J(`(() => { const C = T.make(9), R = C.relic, c = C.carrier; c.x = R.x; c.y = R.y; c.vx = 0; c.vy = 0;
  let f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0); const fid = f.id; let far = 0, maxFar = 0, off = 0, on = 0, i = 0;
  for (; i < 30 * 60 && !C.result; i++) {
    c.x = R.x; c.y = R.y; c.vx = 0; c.vy = 0; c.hp = c.def ? c.hp : c.hp; C.input.thrust = 0; C.input.fire = false;
    C.ships.forEach(u => { if (u.team === 'earth' && u !== c && u.id !== fid) { u.x = R.x - 6000; u.y = R.y - 6000; u.vx = 0; u.vy = 0; u.hp = 1e6; } }); // the other pilots are out of it
    f = C.by[fid]; const ph = (i / 30) % 6, a = (i / 30) * 0.4; // 2 s beside the wave, 4 s running away
    if (f) { f.hp = 1e6; const d = ph < 2 ? 700 : 700 + (ph - 2) * 900; f.x = R.x + Math.cos(a) * d; f.y = R.y + Math.sin(a) * d; f.vx = 0; f.vy = 0;
      if (ph < 2) campAliens(C).forEach(u => { u.hitBy = fid; u.distractedUntil = C.t + 4000; }); } // every alien has just been hit by it
    campStep(C, 1 / 30);
    if (C.waves[0].started && campAliens(C).length) { const dmax = Math.max(...campAliens(C).map(u => campDist(u, R))); if (i / 30 > 12) { maxFar = Math.max(maxFar, dmax); if (T.near(C) > C.L.relic.clear) off++; else on++; } }
  }
  return { result: C.result || null, secs: Math.round(i / 30), maxFar: Math.round(maxFar), off, on, hold: +R.hold.toFixed(1), best: +R.best.toFixed(1), aliens: campAliens(C).length, started: T.started(C), leash: C.L.relic.leash }; })()`);
check('the kite: a fighter that hits the wave and runs 2,500 px off does not win the mission in 60 s', kite.result !== 'won', JSON.stringify(kite));
check('the wave is not drawn off: once it has come no alien of it goes farther than the leash and 500 px from the relic', kite.aliens > 0 && kite.maxFar <= kite.leash + 500, JSON.stringify(kite));
check('and one of them is inside the clear radius nearly all the time (the hold cannot run): under a tenth of the steps are clear', kite.on > 0 && kite.off <= (kite.on + kite.off) * 0.1, JSON.stringify(kite));
check('so the relic has not been held 5 s and the second wave has not come', kite.best < 5 && kite.started === '100', JSON.stringify(kite));

// ---- the mission can still be lost ----
const lose = J(`(() => { const C = T.make(3), R = C.relic, c = C.carrier; let i = 0; C.ships.forEach(u => { if (u.team === 'earth' && u !== c) u.hp = 0; });
  for (; i < 30 * 400 && !C.result; i++) { const dx = R.x - c.x, dy = R.y - c.y; if (Math.hypot(dx, dy) > 60) { c.rot = Math.atan2(dy, dx); C.input.thrust = 1; } else C.input.thrust = 0; C.input.fire = false; campStep(C, 1 / 30); }
  return { result: C.result || null, secs: Math.round(i / 30), hull: Math.round(c.hp), aliens: campAliens(C).length }; })()`);
check('a cruiser that sits on the ring alone and never fires does not win (it is lost, or the aliens are still on the ring after 400 s)', lose.result !== 'won', JSON.stringify(lose));

// ---- the other relic rows are as they were ----
const old = J(`(() => { const C = T.make(4), R = C.relic; return { hasOn: typeof campWaveOn === 'function', t: campWaveOn(C, { t: 0 }), held: campWaveOn(C, { held: 0 }), entered: R.entered, best: R.best }; })()`);
check('a new mission: not entered, nothing held, the held rule is false and the clock rule is as it was', old.entered === false && old.best === 0 && old.held === false && old.t === true, JSON.stringify(old));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP RELIC WAVES OK (${n} checks)`);
process.exit(failed ? 1 : 0);
