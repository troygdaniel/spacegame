// smoke: flight assist, part 2: Orbit (3) and Match speed (4) join the mode table and are flown in the flight model (plain Node, no Chrome)
// The two orders src/assist_orbit.js adds to the flight assist of src/assist.js (card space-game-assist-orbit-match).
// As tests/assist.mjs does: a stand-in scene holds the ship, this file moves it (and a moving target) by its velocity each frame as Phaser
// would, and assistFrame / assistDrive of the core do the rest exactly as in the game. The plans are pure, so no browser is needed.
// Checks: the two modes in the table with their keys and default ranges; Orbit comes in to the circle and goes round and round at the range,
// the way the ship was already going, from outside, from inside, round a moving ship; Match speed ends abeam of a moving ship on the ship's
// own side, same speed, same heading, follows a change of course, and holds off a target that stands still; the keys.
// Run: node tests/assistorbit.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// the stand-in scene and the frame loop, inside the game's context (the shape of tests/assist.mjs, with what an orbit needs measured)
g.run(`
  var __toasts = [];
  toast = (s, msg) => { __toasts.push(msg); };
  sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __s = null;
  function __scene(x, y, rot, vx, vy) {
    const body = { velocity: { x: vx || 0, y: vy || 0 }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const s = __s = { add: __P, input: __P, events: __P, time: { now: 0 }, k: {}, cr: { target: null }, ship: { x, y, rotation: rot || 0, body }, lockUntil: 0 };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s);
    s.as.k = {}; [ASSIST.key].concat(Object.values(ASSIST_MODES).map(m => m.key)).forEach(n => { s.as.k[n] = {}; });
    ASSIST.on = true; __toasts = [];
    return s;
  }
  function __press(n) { __s.as.k[n]._justDown = true; __frames(1); }
  const __ship = (x, y, vx, vy) => ({ x, y, active: true, body: { velocity: { x: vx, y: vy } } });
  // fly seconds of 60 frames. Measured over the last "tail" seconds: the nearest and farthest the ship was from the target, the fastest it went
  // relative to it; over the whole flight: the angle it swept round the target (rad, signed), the top speed, burns with the nose off the line
  function __frames(count, tgt, tail) {
    const s = __s, dt = 1000 / 60, log = { frames: 0, maxV: 0, offLineBurn: 0, sweep: 0, back: 0, lo: 1e9, hi: 0, relHi: 0, status: '', starts: 0, flips: 0 }; let wasOn = false, lastTurn = 0;
    const from = count - Math.round((tail || 0) * 60);
    let last = tgt ? Math.atan2(s.ship.y - tgt.y, s.ship.x - tgt.x) : 0;
    for (let i = 0; i < count; i++) {
      s.time.now += dt; const rot0 = s.ship.rotation;
      if (assistFrame(s, s.time.now, dt, '', '') === 'assist') {
        assistDrive(s, dt);
        const c = s.as.cmd;
        const on = !!(c && c.burn); if (on && !wasOn) log.starts++; wasOn = on; // starts: how often the engine lights
        const turn = Math.sign(assistWrap(s.ship.rotation - rot0)); if (turn) { if (lastTurn && turn !== lastTurn) log.flips++; lastTurn = turn; } // flips: how often the nose changes the way it turns
        if (c && c.burn && c.face !== null && Math.abs(assistWrap(c.face - s.ship.rotation)) > ASSIST.align + 0.01) log.offLineBurn++;
      } else { const k = Math.pow(0.55, dt / 1000); s.ship.body.velocity.x *= k; s.ship.body.velocity.y *= k; }
      const v = s.ship.body.velocity; s.ship.x += v.x * dt / 1000; s.ship.y += v.y * dt / 1000;
      if (tgt && tgt.body) { tgt.x += tgt.body.velocity.x * dt / 1000; tgt.y += tgt.body.velocity.y * dt / 1000; }
      log.frames++; log.maxV = Math.max(log.maxV, Math.hypot(v.x, v.y));
      if (tgt) {
        const tv = tgt.body ? tgt.body.velocity : { x: 0, y: 0 }, d = Math.hypot(tgt.x - s.ship.x, tgt.y - s.ship.y), ang = Math.atan2(s.ship.y - tgt.y, s.ship.x - tgt.x);
        const step = assistWrap(ang - last); last = ang; log.sweep += step;
        if (i >= from) { log.lo = Math.min(log.lo, d); log.hi = Math.max(log.hi, d); log.relHi = Math.max(log.relHi, Math.hypot(v.x - tv.x, v.y - tv.y)); if (step * log.sweep < 0) log.back++; }
      }
    }
    const v = s.ship.body.velocity;
    log.mode = s.as.mode; log.rot = s.ship.rotation; log.status = (s.as.cmd && s.as.cmd.status) || '';
    if (tgt) {
      const tv = tgt.body ? tgt.body.velocity : { x: 0, y: 0 }, sp = Math.hypot(tv.x, tv.y), dx = s.ship.x - tgt.x, dy = s.ship.y - tgt.y;
      log.d = Math.hypot(dx, dy); log.rel = Math.hypot(v.x - tv.x, v.y - tv.y);
      if (sp > 1) { log.along = (dx * tv.x + dy * tv.y) / sp; log.side = (tv.x * dy - tv.y * dx) / sp; log.heading = Math.atan2(tv.y, tv.x); }
    }
    return log;
  }
`);

// ---- the table ----
const modes = J(`Object.values(ASSIST_MODES).map(m => ({ id: m.id, label: m.label, key: m.key, cap: m.cap, plan: typeof m.plan }))`);
check('the mode table: Approach 1, Keep at range 2, then Orbit on 3 and Match speed on 4, each with a plan', modes.map(m => m.id + ':' + m.key + ':' + m.cap).join() === 'approach:ONE:1,keep:TWO:2,orbit:THREE:3,match:FOUR:4' && modes[2].label === 'Orbit' && modes[3].label === 'Match speed' && modes.every(m => m.plan === 'function'), JSON.stringify(modes));
g.run(`__scene(0, 0, 0); ASSIST.on = false; __press(ASSIST.key);`);
check('Z on: the key line names all four orders', J(`__toasts`).some(m => /1 Approach.*2 Keep at range.*3 Orbit.*4 Match speed/.test(m)), JSON.stringify(J(`__toasts`)));
check('the state for a HUD lists four command keys', J(`assistState().keys.map(k => k.cap + k.label)`).join() === '1Approach,2Keep at range,3Orbit,4Match speed');
check('default ranges: Orbit 460 px round a station (outside the dock prompt), 600 round a planet of 300, 400 round a ship or a point; Match speed 200; a given range wins',
  J(`(() => { const r = []; [['orbit', { type: 'station', name: 'Halcyon Station', x: 5000, y: 0 }], ['orbit', { type: 'planet', name: 'Tern', r: 300, x: 5000, y: 0 }], ['orbit', __ship(5000, 0, 0, 0)], ['orbit', { x: 5000, y: 0 }], ['match', __ship(5000, 0, 50, 0)]].forEach(([m, t]) => { assistSet(m, t); r.push(__s.as.range); }); assistSet('orbit', { x: 5000, y: 0 }, 750); r.push(__s.as.range); assistSet('match', { x: 5000, y: 0 }, 90); r.push(__s.as.range); assistSet(''); return r; })()`).join() === '460,600,400,400,200,750,90');

// ---- the keys ----
g.run(`__scene(0, 0, 0); __s.cr.target = { id: 'b', name: 'Tern', type: 'planet', x: 9000, y: 0, r: 300 }; __press('THREE');`);
check('3 gives Orbit on the nav target, and says the distance', J(`__s.as.mode`) === 'orbit' && J(`__toasts`).some(m => /^Orbit: Tern at 60 km/.test(m)), JSON.stringify(J(`__toasts`)));
g.run(`__press('FOUR')`);
check('4 changes the order to Match speed', J(`__s.as.mode`) === 'match' && J(`__s.as.range`) === 200);
g.run(`__press('FOUR')`);
check('the same key again ends it: you have the stick', J(`__s.as.mode`) === '' && J(`__toasts`).some(m => /You have the stick/.test(m)));
g.run(`__press('THREE'); __frames(30); __s.k.A.isDown = true; __frames(1); __s.k.A.isDown = false;`);
check('a flight key takes the stick back from an orbit', J(`__s.as.mode`) === '');

// ---- Orbit, flown ----
const vmax = J(`shipStat('vmax')`), TAU = Math.PI * 2;
const orbit = (scene, tgt, range, secs, tail = 10) => { g.run(`__scene(${scene});`); return J(`(() => { const t = ${tgt}; assistSet('orbit', t${range ? ', ' + range : ''}); return __frames(${secs * 60}, t, ${tail}); })()`); };
let f = orbit('0, 0, 0', '{ x: 2000, y: 0 }', 400, 30);
check('Orbit 400 px from 2000 px out: it comes in and stays on the circle (within 40 px of it for the last 10 s)', f.lo >= 360 && f.hi <= 440, `between ${f.lo.toFixed(0)} and ${f.hi.toFixed(0)} px`);
check('it goes round and round: more than two laps in 30 s, never turning back', Math.abs(f.sweep) > 2 * TAU && f.back === 0, `${(Math.abs(f.sweep) / TAU).toFixed(1)} laps`);
check('the order has no end: still Orbit, and the HUD word is "orbit"', f.mode === 'orbit' && f.status === 'orbit', f.mode + ' / ' + f.status);
check('it never flies faster than the ship can, and never burns with the nose off the line', f.maxV <= vmax + 0.01 && f.offLineBurn === 0, `max ${f.maxV.toFixed(0)} of ${vmax}, ${f.offLineBurn} frames`);
const vo = J(`assistOrbitSpeed(400, assistStats())`);
check('on the circle it holds the orbit speed (within 15%), well under the top speed', f.relHi <= vo * 1.15 && f.relHi >= vo * 0.85 && vo < vmax * 0.7, `${f.relHi.toFixed(0)} px/s for ${vo.toFixed(0)}`);
const up = orbit('0, 0, 0, 0, -220', '{ x: 1200, y: 0 }', 400, 20), down = orbit('0, 0, 0, 0, 220', '{ x: 1200, y: 0 }', 400, 20);
check('it goes round the way the ship was already drifting: one way for a drift up, the other for a drift down', up.sweep * down.sweep < 0 && Math.abs(up.sweep) > TAU && Math.abs(down.sweep) > TAU && up.back === 0 && down.back === 0, `${up.sweep.toFixed(1)} and ${down.sweep.toFixed(1)} rad`);
const noseUp = orbit('0, 0, -1.2', '{ x: 500, y: 0 }', 400, 15, 5), noseDown = orbit('0, 0, 1.2', '{ x: 500, y: 0 }', 400, 15, 5);
check('standing still, it goes the way the nose points', noseUp.sweep * noseDown.sweep < 0 && Math.abs(noseUp.sweep) > Math.PI && Math.abs(noseDown.sweep) > Math.PI, `${noseUp.sweep.toFixed(1)} and ${noseDown.sweep.toFixed(1)} rad`);
f = orbit('0, 0, 1', '{ x: 40, y: 0 }', 250, 20);
check('from inside the circle (40 px from the target, order 250): it backs out to it and orbits', f.lo >= 210 && f.hi <= 290 && Math.abs(f.sweep) > TAU && f.status === 'orbit', `between ${f.lo.toFixed(0)} and ${f.hi.toFixed(0)} px, ${(Math.abs(f.sweep) / TAU).toFixed(1)} laps`);
f = orbit('0, 0, 0', '{ x: 600, y: 0 }', 10, 15, 5);
check('an order tighter than the ship can fly: the smallest circle (80 px), not a spin on the spot', f.lo >= 50 && f.hi <= 120 && Math.abs(f.sweep) > TAU, `between ${f.lo.toFixed(0)} and ${f.hi.toFixed(0)} px`);
f = orbit('0, 0, 0', '__ship(1500, 0, 80, 50)', 900, 40);
check('round a moving ship at 900 px: it stays on the circle while the ship flies on (within 60 px), a lap and more', f.lo >= 840 && f.hi <= 960 && Math.abs(f.sweep) > TAU && f.mode === 'orbit', `between ${f.lo.toFixed(0)} and ${f.hi.toFixed(0)} px, ${(Math.abs(f.sweep) / TAU).toFixed(1)} laps`);
f = orbit('0, 0, 0', "{ type: 'station', name: 'Halcyon Station', x: 2500, y: -800 }", 0, 30);
check('round a station with no range given: it circles outside the dock prompt (320 px), near 460', f.lo > 330 && f.lo >= 420 && f.hi <= 500, `between ${f.lo.toFixed(0)} and ${f.hi.toFixed(0)} px`);
check('a target ship that is destroyed in mid-orbit: target lost, the stick is yours', J(`(() => { __scene(0, 0, 0); const t = __ship(900, 0, 0, 0); assistSet('orbit', t); __frames(300, t); t.active = false; __frames(1, t); return [__s.as.mode, __toasts.some(m => /Target lost/.test(m))]; })()`).join() === ',true');

// ---- Match speed, flown ----
const match = (scene, tgt, range, secs, after = '') => { g.run(`__scene(${scene});`); return J(`(() => { const t = ${tgt}; assistSet('match', t${range ? ', ' + range : ''}); ${after} return __frames(${secs * 60}, t, 5); })()`); };
f = match('0, 0, 0', '__ship(1500, 300, 150, 60)', 0, 25);
check('Match speed on a ship flying past: it ends at the same speed (under 20 px/s between them for the last 5 s)', f.relHi <= 20 && f.mode === 'match', `${f.relHi.toFixed(1)} px/s`);
check('alongside: 200 px off (within 30), abeam of it (not ahead, not astern)', Math.abs(f.d - 200) <= 30 && Math.abs(f.along) <= 40, `${f.d.toFixed(0)} px off, ${f.along.toFixed(0)} px along its track`);
check('the same heading as the target, and the HUD word is "matched"', Math.abs(Math.atan2(Math.sin(f.rot - f.heading), Math.cos(f.rot - f.heading))) < 0.15 && f.status === 'matched', `nose ${f.rot.toFixed(2)}, target ${f.heading.toFixed(2)}, ${f.status}`);
check('it never burned with the nose off the line and never flew faster than the ship can', f.offLineBurn === 0 && f.maxV <= vmax + 0.01, `max ${f.maxV.toFixed(0)}`);
const left = match('0, -900, 0', '__ship(800, 0, 160, 0)', 0, 25), right = match('0, 900, 0', '__ship(800, 0, 160, 0)', 0, 25);
check('it takes the side it is already on: from the left it ends on the left, from the right on the right', left.side < -150 && right.side > 150 && left.relHi <= 20 && right.relHi <= 20, `${left.side.toFixed(0)} and ${right.side.toFixed(0)} px`);
f = match('0, 0, 0', '__ship(1500, 300, 150, 60)', 320, 25);
check('a given range is the distance it keeps: 320 px', Math.abs(f.d - 320) <= 30 && f.relHi <= 20, `${f.d.toFixed(0)} px`);
f = match('0, 0, 0', '__ship(1200, 300, 150, 60)', 0, 20, `__frames(1200, t, 5); t.body.velocity.x = -40; t.body.velocity.y = 170;`);
check('the target changes course: 20 s later it is matched again, alongside, on the new heading', f.relHi <= 20 && Math.abs(f.d - 200) <= 30 && Math.abs(f.along) <= 40 && Math.abs(Math.atan2(Math.sin(f.rot - f.heading), Math.cos(f.rot - f.heading))) < 0.15, `${f.relHi.toFixed(1)} px/s, ${f.d.toFixed(0)} px off, ${f.along.toFixed(0)} along`);
f = match('0, 0, 0, 0, 300', '{ x: 1500, y: 0 }', 0, 15);
check('a target that stands still: it stops 200 px off it and holds, still on', Math.abs(f.d - 200) <= 30 && f.relHi <= 20 && f.mode === 'match' && f.status === 'matched', `${f.d.toFixed(0)} px, ${f.relHi.toFixed(1)} px/s, ${f.status}`);
f = match('0, 0, 0', `__ship(600, 0, ${vmax + 150}, 0)`, 0, 10);
check('a target faster than the ship: it chases and does not say matched', f.mode === 'match' && f.status !== 'matched' && f.maxV <= vmax + 0.01, f.status);
check('S hands the stick back from Match speed', J(`(() => { __scene(0, 0, 0); const t = __ship(900, 0, 100, 0); assistSet('match', t); __frames(120, t); __s.k.S.isDown = true; __frames(1, t); return __s.as.mode; })()`) === '');

// ---- the engine and the nose are steady (playtest 4: Orbit round a still buoy lit the engine 312 times in 20 s and reversed the nose 558 times; Match speed 113 starts) ----
g.run(`__scene(0, 0, 0)`);
f = J(`(() => { const t = { x: 900, y: 0 }; assistSet('orbit', t, 400); return __frames(1200, t, 8); })()`);
check('Orbit round a still buoy, 20 s: 20 engine starts and 20 nose reversals or fewer, and it is on the circle', f.starts <= 20 && f.flips <= 20 && f.lo > 320 && f.hi < 480, `${f.starts} starts, ${f.flips} reversals, ${f.lo.toFixed(0)} to ${f.hi.toFixed(0)} px`);
g.run(`__scene(0, 0, 0)`);
f = J(`(() => { const t = __ship(900, 0, 120, 60); assistSet('orbit', t, 400); return __frames(1200, t, 8); })()`);
check('Orbit round a ship that moves, 20 s: 20 starts and 20 reversals or fewer, near the circle', f.starts <= 20 && f.flips <= 20 && f.lo > 250 && f.hi < 560, `${f.starts} starts, ${f.flips} reversals, ${f.lo.toFixed(0)} to ${f.hi.toFixed(0)} px`);
g.run(`__scene(0, 0, 0)`);
f = J(`(() => { const t = __ship(600, 300, 152, 0); assistSet('match', t); return __frames(1200, t, 5); })()`);
check('Match speed beside a ship on a straight line at 152 px/s, 20 s: 20 starts and 20 reversals or fewer, matched', f.starts <= 20 && f.flips <= 20 && f.rel < 20, `${f.starts} starts, ${f.flips} reversals, relative ${f.rel.toFixed(1)} px/s, status ${f.status}`);

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `ASSIST ORBIT FAIL (${failed} of ${n})` : `ASSIST ORBIT PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
