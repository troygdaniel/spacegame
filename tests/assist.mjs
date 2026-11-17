// smoke: flight assist: the mode table, assistSet, Approach and Keep at range flown in the flight model, the keys that give the stick back (plain Node, no Chrome)
// The flight assist (card space-game-assist-core, src/assist.js): Z switches it on, 1 Approach and 2 Keep at range fly the ship about a target.
// The planner and the flight model are pure functions, so the flights below run in plain Node (tests/nodegame.mjs): a stand-in scene holds the
// ship, this file moves it by its velocity each frame as Phaser would, and assistFrame / assistDrive do the rest exactly as in the game.
// Checks: the interface other cards build on (ASSIST_MODES, assistMode, assistSet, assistState, assistOn), the refusals, the keys, then the
// flights: turn first, burn, brake in time, stop at the range, never faster than the ship flies; Keep at range from outside, from inside and
// beside a moving ship.
// Run: node tests/assist.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame({ replace: { 'src/assist_orbit.js': '' } }); // the core alone: the modes another file adds (Orbit, Match speed) have their own test
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// the stand-in scene and the frame loop, inside the game's context
g.run(`
  var __toasts = [];
  toast = (s, msg) => { __toasts.push(msg); };
  sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __s = null;
  function __scene(x, y, rot) {
    const body = { velocity: { x: 0, y: 0 }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const s = __s = { add: __P, input: __P, events: __P, time: { now: 0 }, k: {}, cr: { target: null }, ship: { x, y, rotation: rot || 0, body }, lockUntil: 0 };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s);
    s.as.k = {}; [ASSIST.key].concat(Object.values(ASSIST_MODES).map(m => m.key)).forEach(n => { s.as.k[n] = {}; });
    __toasts = [];
    return s;
  }
  function __press(n) { __s.as.k[n]._justDown = true; __frames(1); }
  // fly frames of 16.67 ms: the assist's frame and drive, then the ship (and a moving target) move by their velocity as Phaser moves them
  function __frames(count, tgt) {
    const s = __s, dt = 1000 / 60, log = { frames: 0, maxV: 0, minD: 1e9, burnAt: -1, brakeAt: -1, offLineBurn: 0, ended: false };
    for (let i = 0; i < count; i++) {
      s.time.now += dt;
      const r = assistFrame(s, s.time.now, dt, '', '');
      if (r === 'assist') {
        const t = s.as.target, before = Math.atan2(t.y - s.ship.y, t.x - s.ship.x);
        assistDrive(s, dt);
        const c = s.as.cmd;
        if (c && c.burn && log.burnAt < 0) log.burnAt = i;
        if (c && c.brake && log.brakeAt < 0) log.brakeAt = i;
        if (c && c.burn && c.face !== null && Math.abs(assistWrap(c.face - s.ship.rotation)) > ASSIST.align + 0.01) log.offLineBurn++;
      } else { const k = Math.pow(0.55, dt / 1000); s.ship.body.velocity.x *= k; s.ship.body.velocity.y *= k; } // hand flight, hands off: it coasts
      const v = s.ship.body.velocity; s.ship.x += v.x * dt / 1000; s.ship.y += v.y * dt / 1000;
      if (tgt && tgt.body) { tgt.x += tgt.body.velocity.x * dt / 1000; tgt.y += tgt.body.velocity.y * dt / 1000; }
      const tt = tgt || s.as.target;
      log.frames++; log.maxV = Math.max(log.maxV, Math.hypot(v.x, v.y));
      if (tt) log.minD = Math.min(log.minD, Math.hypot(tt.x - s.ship.x, tt.y - s.ship.y));
      if (tgt && !s.as.mode) { log.ended = true; break; }
    }
    const v = s.ship.body.velocity;
    log.v = Math.hypot(v.x, v.y); log.mode = s.as.mode; log.rot = s.ship.rotation; log.x = s.ship.x; log.y = s.ship.y;
    if (tgt) { log.d = Math.hypot(tgt.x - s.ship.x, tgt.y - s.ship.y); log.rel = tgt.body ? Math.hypot(v.x - tgt.body.velocity.x, v.y - tgt.body.velocity.y) : log.v; }
    return log;
  }
`);

// ---- the interface ----
const modes = J(`Object.values(ASSIST_MODES).map(m => ({ id: m.id, label: m.label, key: m.key, cap: m.cap, plan: typeof m.plan, range: typeof m.range }))`);
check('the mode table has Approach on 1 and Keep at range on 2, each with a plan', modes.length === 2 && modes[0].id === 'approach' && modes[0].cap === '1' && modes[0].key === 'ONE' && modes[1].id === 'keep' && modes[1].cap === '2' && modes[1].label === 'Keep at range' && modes.every(m => m.plan === 'function'), JSON.stringify(modes));
check('the functions other cards call are there', J(`[typeof assistSet, typeof assistMode, typeof assistState, typeof assistOn, typeof assistSeek, typeof assistStep, typeof assistSetup, typeof assistFrame, typeof assistDrive].every(t => t === 'function')`));
check('assistSet takes (mode, target, range)', J(`assistSet.length`) === 3);

g.run(`__scene(0, 0, 0); ASSIST.on = false;`);
check('with no scene order and the assist off, the state says so and lists the command keys', (() => { const st = J(`assistState()`); return st.on === false && st.mode === '' && st.keys.length === 2 && st.keys[0].cap === '1' && st.keys[0].label === 'Approach'; })(), JSON.stringify(J(`assistState()`)));
check('off: assistSet refuses', J(`assistSet('approach', { x: 1000, y: 0 })`) === false && J(`__s.as.mode`) === '');
g.run(`__press(ASSIST.key)`);
check('Z switches the assist on and says the command keys', J(`ASSIST.on`) === true && J(`__toasts`).some(m => /Flight assist on.*1 Approach.*2 Keep at range/.test(m)), JSON.stringify(J(`__toasts`)));
check('on, with no order: it does not hold the ship', J(`assistFrame(__s, 1, 16, '', '')`) === '');
check('no target: refused, and it says how to pick one', J(`assistSet('approach')`) === false && J(`__toasts`).some(m => /No target/.test(m)));
check('an unknown mode is refused', J(`assistSet('warp', { x: 1, y: 1 })`) === false);
check('a bare point is a target: the order is taken', J(`assistSet('approach', { x: 3000, y: 0 })`) === true && J(`__s.as.mode`) === 'approach' && J(`__s.as.range`) === 0);
const st1 = J(`assistState()`);
check('the state for a HUD: mode, label, name, range, distance, closing speed', st1.on && st1.mode === 'approach' && st1.label === 'Approach' && st1.name === 'the point' && Math.round(st1.dist) === 3000 && st1.closing === 0, JSON.stringify(st1));
check("assistSet('') ends the order", J(`assistSet('')`) === true && J(`__s.as.mode`) === '');
check('the default ranges: a station 260 px (the dock range), a ship 150, Keep at range 500, and a given range wins', J(`(() => { const r = []; assistSet('approach', { type: 'station', name: 'Halcyon Station', x: 5000, y: 0 }); r.push(__s.as.range); assistSet('approach', { x: 5000, y: 0, body: { velocity: { x: 0, y: 0 } } }); r.push(__s.as.range); assistSet('keep', { x: 5000, y: 0 }); r.push(__s.as.range); assistSet('keep', { x: 5000, y: 0 }, 900); r.push(__s.as.range); assistSet(''); return r; })()`).join() === '260,150,500,900');
check('with no target given it takes the nav target (the N list)', J(`(() => { __s.cr.target = { id: 'b', name: 'Tern', type: 'planet', x: 9000, y: 0, r: 300 }; const ok = assistSet('approach'); const r = [ok, __s.as.target.name, __s.as.range]; assistSet(''); __s.cr.target = null; return r; })()`).join() === 'true,Tern,400');
check('docked, dead, cruising, charging a jump or under the launch lock: refused', J(`(() => { const s = __s, r = []; ['dead', 'leaving', 'jmp', 'cruising'].forEach(f => { s[f] = true; r.push(assistSet('approach', { x: 9, y: 9 })); s[f] = false; }); s.lockUntil = s.time.now + 500; r.push(assistSet('approach', { x: 9, y: 9 })); s.lockUntil = 0; return r; })()`).every(x => x === false));
check('a mode added from another file joins the table and takes orders', J(`(() => { assistMode('orbit', { label: 'Orbit', key: 'THREE', cap: '3', range: 400, plan: () => ({ face: 1, burn: false, status: 'orbit' }) }); const bound = !!__s.as.k.THREE; __s.as.k.THREE = {}; const ok = assistSet('orbit', { x: 2000, y: 0 }); __frames(3); const r = [ok, __s.as.mode, __s.as.range, assistState().status, assistState().keys.length, bound]; assistSet(''); delete ASSIST_MODES.orbit; return r; })()`).join() === 'true,orbit,400,orbit,3,true');

// ---- the keys ----
g.run(`__scene(0, 0, 0); __s.cr.target = { id: 'b', name: 'Tern', type: 'planet', x: 9000, y: 0, r: 300 };`);
g.run(`__press('ONE')`);
check('1 gives Approach on the nav target', J(`__s.as.mode`) === 'approach' && J(`__toasts`).some(m => /^Approach: Tern at 40 km/.test(m)), JSON.stringify(J(`__toasts`)));
g.run(`__press('TWO')`);
check('2 changes the order to Keep at range', J(`__s.as.mode`) === 'keep' && J(`__s.as.range`) === 500);
check('the nav target dropped while the order flies (the game does that near the body): 1 keeps the target of the order', J(`(() => { const t = __s.as.target; __s.cr.target = null; __press('ONE'); const r = [__s.as.mode, __s.as.target === t, __toasts.some(m => /No target/.test(m))]; __press('TWO'); return r.concat([__s.as.mode, __s.as.target === t]); })()`).join() === 'approach,true,false,keep,true');
check('a new nav target picked while the order flies: the next key takes it', J(`(() => { __s.cr.target = { id: 'c', name: 'Kepler-4c', type: 'planet', x: -9000, y: 0, r: 200 }; __press('ONE'); const r = [__s.as.mode, __s.as.target.name]; __press('TWO'); return r.concat([__s.as.mode, __s.as.target.name]); })()`).join() === 'approach,Kepler-4c,keep,Kepler-4c');
g.run(`__press('TWO')`);
check('the same key again ends the order: you have the stick', J(`__s.as.mode`) === '' && J(`__toasts`).some(m => /You have the stick/.test(m)));
for (const key of ['W', 'A', 'S', 'D', 'UP', 'LEFT', 'SHIFT', 'Q', 'E']) {
  g.run(`__press('ONE'); __frames(5); __s.k.${key}.isDown = true; __frames(1); __s.k.${key}.isDown = false;`);
  check(`${key} hands the stick back`, J(`__s.as.mode`) === '');
}
g.run(`__s.k.W.isDown = true; __press('ONE'); __frames(10);`);
check('a W already held when the order comes does not cancel it', J(`__s.as.mode`) === 'approach');
g.run(`__s.k.W.isDown = false; __frames(2); __s.k.W.isDown = true; __frames(1); __s.k.W.isDown = false;`);
check('let go and pressed again, it does', J(`__s.as.mode`) === '');
g.run(`__press('ONE'); __frames(3);`);
check('the nav list open: the keys are its own', J(`(() => { __s.as.k.TWO._justDown = true; assistFrame(__s, __s.time.now, 16, 'nav', ''); return __s.as.mode; })()`) === 'approach');
check('cruise or the autopilot taking the ship ends the order quietly', J(`(() => { const n = __toasts.length; const r = assistFrame(__s, __s.time.now, 16, 'cruise', ''); const a = __s.as.mode; assistSet('approach'); const r2 = assistFrame(__s, __s.time.now, 16, '', 'auto'); return [r, a, r2, __s.as.mode, __toasts.length - n]; })()`).join() === ',,,,1');
check('a target ship that is destroyed: target lost', J(`(() => { const t = { x: 4000, y: 0, active: true, body: { velocity: { x: 0, y: 0 } } }; assistSet('keep', t); __frames(5); t.active = false; __frames(1); return [__s.as.mode, __toasts.some(m => /Target lost/.test(m))]; })()`).join() === ',true');
g.run(`__press('ONE'); __press(ASSIST.key);`);
check('Z again switches the assist off and ends the order', J(`ASSIST.on`) === false && J(`__s.as.mode`) === '' && J(`__toasts`).some(m => /Flight assist off/.test(m)));
check('off: the command keys do nothing', J(`(() => { __press('ONE'); return __s.as.mode; })()`) === '');

// ---- Approach, flown ----
const vmax = J(`shipStat('vmax')`);
g.run(`__scene(0, 0, Math.PI); ASSIST.on = true;`); // the nose points away from the target
let f = J(`(() => { const t = { x: 3000, y: 0 }; assistSet('approach', t, 200); return __frames(1500, t); })()`);
check('Approach from 3000 px, nose the wrong way: it turns first (no burn for the first frames)', f.burnAt > 20, 'first burn at frame ' + f.burnAt);
check('the engine never burns with the nose off the line', f.offLineBurn === 0, f.offLineBurn + ' frames');
check('it runs up to the top speed of the ship and never past it', f.maxV > vmax * 0.95 && f.maxV <= vmax + 0.01, `max ${f.maxV.toFixed(1)} of ${vmax}`);
check('it brakes before it gets there', f.brakeAt > f.burnAt, 'brake at frame ' + f.brakeAt);
check('it stops at the range: within 20 px of 200, under 15 px/s, and the order ends', f.ended && Math.abs(f.d - 200) <= 20 && f.v <= 15, `ended ${f.d.toFixed(1)} px out at ${f.v.toFixed(1)} px/s after ${(f.frames / 60).toFixed(1)} s`);
check('it never went inside the range', f.minD >= 180, 'nearest ' + f.minD.toFixed(1));
check('the trip takes about what the distance says (7 to 14 s)', f.frames / 60 > 7 && f.frames / 60 < 14, (f.frames / 60).toFixed(1) + ' s');
check('it says so', J(`__toasts`).some(m => /Approach done: the point/.test(m)), JSON.stringify(J(`__toasts`)));
g.run(`__scene(0, 0, 0); __s.ship.body.velocity.y = 400;`); // drifting sideways at speed
f = J(`(() => { const t = { x: 2500, y: 0 }; assistSet('approach', t); return __frames(1500, t); })()`);
check('Approach to a bare point from a fast sideways drift ends on the point', f.ended && f.d <= 20 && f.v <= 15, `ended ${f.d.toFixed(1)} px off at ${f.v.toFixed(1)} px/s after ${(f.frames / 60).toFixed(1)} s`);
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { type: 'station', name: 'Halcyon Station', x: -1500, y: 1500 }; assistSet('approach', t); return __frames(1500, t); })()`);
check('Approach to a station stops in the dock range, slow enough to dock', f.ended && f.d < 320 && f.d > 230 && f.v < 150, `ended ${f.d.toFixed(1)} px out at ${f.v.toFixed(1)} px/s`);
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { x: 100, y: 0, body: { velocity: { x: 0, y: 0 } } }; assistSet('approach', t); return __frames(200, t); })()`);
check('already nearer than the range: Approach does not back off, it is done', f.ended && Math.abs(f.d - 100) < 5, `at ${f.d.toFixed(1)} px`);
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { x: 1500, y: 0, active: true, body: { velocity: { x: 0, y: 120 } } }; assistSet('approach', t); return __frames(1200, t); })()`);
check('Approach on a moving ship keeps following it: still on, near its 150 px', !f.ended && f.mode === 'approach' && f.d > 100 && f.d < 260, `at ${f.d.toFixed(1)} px, relative ${f.rel.toFixed(1)} px/s`);

// ---- Keep at range, flown ----
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { x: 2500, y: 0 }; assistSet('keep', t); return __frames(900, t); })()`);
check('Keep at range from 2500 px out: it comes in and holds 500 px, still, and stays on', !f.ended && f.mode === 'keep' && Math.abs(f.d - 500) <= 25 && f.v <= 15, `at ${f.d.toFixed(1)} px, ${f.v.toFixed(1)} px/s`);
check('it never came inside the range on the way in', f.minD >= 475, 'nearest ' + f.minD.toFixed(1));
check('holding, the nose is on the target', Math.abs(f.rot) < 0.1, 'heading ' + f.rot.toFixed(2));
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { x: 120, y: 0 }; assistSet('keep', t, 600); return __frames(900, t); })()`);
check('Keep at range from inside: it backs off to the range and holds', f.mode === 'keep' && Math.abs(f.d - 600) <= 25 && f.v <= 15, `at ${f.d.toFixed(1)} px, ${f.v.toFixed(1)} px/s`);
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { x: 1500, y: 0, active: true, body: { velocity: { x: 90, y: 60 } } }; assistSet('keep', t, 400); return __frames(1500, t); })()`);
check('Keep at range on a moving ship: it stays with it, near 400 px', f.mode === 'keep' && f.d > 300 && f.d < 500, `at ${f.d.toFixed(1)} px, relative ${f.rel.toFixed(1)} px/s`);
g.run(`__scene(0, 0, 0);`);
f = J(`(() => { const t = { x: 2500, y: 0 }; assistSet('keep', t); __frames(120, t); __s.k.S.isDown = true; __frames(1, t); __s.k.S.isDown = false; const v0 = Math.hypot(__s.ship.body.velocity.x, __s.ship.body.velocity.y); const r = __frames(120, t); r.v0 = v0; return r; })()`);
check('the stick handed back mid-flight: the order is off and the ship coasts on its own speed', f.mode === '' && f.v0 > 200 && f.v < f.v0, `${f.v0.toFixed(0)} px/s then ${f.v.toFixed(0)}`);

// the one-line readout keeps clear of the toasts (card space-game-critic-assist-readout): they stack down from y 96 and are drawn over it
const T = (y, h, active = true) => `{ y: ${y}, h: ${h}, t: { active: ${active} } }`;
check('readout: no toast, or one toast at the top: it sits on its own line', J(`assistReadY()`) === 156 && J(`assistReadY([])`) === 156 && J(`assistReadY([${T(96, 39)}])`) === 156);
check('readout: a second toast reaches its line: it moves just under that toast', J(`assistReadY([${T(96, 39)}, ${T(153, 62)}])`) === 202, J(`assistReadY([${T(96, 39)}, ${T(153, 62)}])`));
check('readout: three toasts: under the lowest, and still on the screen', J(`assistReadY([${T(96, 39)}, ${T(153, 62)}, ${T(209, 39)}])`) === 247 && J(`assistReadY([${T(96, 39)}, ${T(153, 62)}, ${T(209, 39)}]) < H - 150`));
check('readout: a toast that has gone no longer pushes it', J(`assistReadY([${T(96, 39)}, ${T(153, 62, false)}])`) === 156);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `ASSIST FAIL (${failed} of ${n})` : `ASSIST PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
