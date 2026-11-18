// smoke: the ship working: the turn, burn and brake phases are read from the ship's own turn rate and acceleration (plain Node, no Chrome)
// The phase reading of src/feel.js (card space-game-burn-feel): feelBurnRead looks at how the heading and the velocity of the player's ship
// changed since the last frame and says how hard it is turning, burning its main engine and braking. The puffs, the engine glow, the braking
// jets and the sounds (src/audio.js) all follow these three numbers, so this is where "it shows the right thing" is decided.
// Checks: a turn alone, either way; a burn that builds instead of snapping on, slower on Heavy than Classic; coasting is nothing; a hard
// stop is a braking burn and a coast is not; at top speed the engine stays lit on the command alone; Heavy is stronger; a hitch of a frame
// is not a manoeuvre; the puff pool never grows; and a whole order of the flight assist (src/assist.js), flown in its own flight model,
// reads turn, then burn, then brake, with no word from the assist about what it is doing.
// Run: node tests/burnfeel.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// fly(frames of 16.67 ms, step, h): step(i, me) changes me = { rot, vx, vy, ... } for the frame; returns the levels after each frame
g.run(`
  const __C = HANDLING.classic, __H = HANDLING.heavy;
  function __fly(frames, step, h, me, b) {
    const dt = 1000 / 60; b = b || feelBurnNew(); me = me || { rot: 0, vx: 0, vy: 0 };
    const log = [];
    feelBurnRead(b, me, dt, h); // the first frame only remembers where the ship is
    for (let i = 0; i < frames; i++) { step(i, me, dt / 1000); feelBurnRead(b, me, dt, h); log.push({ turn: b.turn, engine: b.engine, brake: b.brake, phase: b.phase }); }
    return { log, b, me, last: log[log.length - 1] };
  }
  const __coast = (me, dts, keep) => { const k = Math.pow(keep, dts); me.vx *= k; me.vy *= k; };
`);

// ---- turning ----
let r = J(`__fly(30, (i, me, dts) => { me.rot += 2.5 * dts; }, __C).last`);
check('turning right at 2.5 rad/s, engine off: a full turn to the right, no engine, no brake, phase "turn"', r.turn > 0.9 && r.engine === 0 && r.brake === 0 && r.phase === 'turn', JSON.stringify(r));
r = J(`__fly(30, (i, me, dts) => { me.rot -= 1.2 * dts; }, __C).last`);
check('turning left at 1.2 rad/s: the other sign, and less of it', r.turn < -0.3 && r.turn > -0.6 && r.phase === 'turn', JSON.stringify(r));
r = J(`__fly(30, (i, me, dts) => { me.rot += 0.15 * dts; }, __C).last`);
check('a slow drift of the nose (0.15 rad/s) is not a turn', r.turn === 0 && r.phase === 'coast', JSON.stringify(r));
r = J(`__fly(40, (i, me, dts) => { me.rot = 3.1 + i * 2.5 * dts; }, __C).log.map(x => x.turn)`);
check('a turn through the wrap of the heading (pi to -pi) stays one steady turn', Math.min(...r.slice(8)) > 0.9, 'least ' + Math.min(...r.slice(8)).toFixed(2));
r = J(`(() => { const f = __fly(30, (i, me, dts) => { me.rot += 2.5 * dts; }, __C); return __fly(20, () => {}, __C, f.me, f.b).last; })()`);
check('the turn ends: the puffs stop within a third of a second', r.turn === 0 && r.phase === 'coast', JSON.stringify(r));

// ---- the main engine builds ----
const burn = h => J(`__fly(90, (i, me, dts) => { me.vx += 720 * dts; }, ${h}).log.map(x => x.engine)`);
const c = burn('__C'), hv = burn('__H');
check('a burn from rest: the engine is not full the frame it lights (it builds)', c[0] > 0 && c[0] < 0.15 && c[5] < 0.5, `frame 1: ${c[0].toFixed(2)}, frame 6: ${c[5].toFixed(2)}`);
check('Classic: full after about 0.3 s', c[14] < 1 && c[20] === 1, `frame 15: ${c[14].toFixed(2)}, frame 21: ${c[20].toFixed(2)}`);
check('it only ever grows while the burn goes on', c.every((x, i) => i === 0 || x >= c[i - 1]) && hv.every((x, i) => i === 0 || x >= hv[i - 1]));
check('Heavy builds more slowly: half way where Classic is full, full after about 0.85 s', hv[20] < 0.5 && hv[45] < 1 && hv[55] === 1, `frame 21: ${hv[20].toFixed(2)}, frame 46: ${hv[45].toFixed(2)}`);
r = J(`(() => { const f = __fly(40, (i, me, dts) => { me.vx += 720 * dts; }, __C); return __fly(15, (i, me, dts) => __coast(me, dts, 0.55), __C, f.me, f.b).log.map(x => x.engine); })()`);
check('the key let go: the glow dies away over a fifth of a second, not in one frame', r[0] < 1 && r[0] > 0.8 && r[14] === 0, `${r[0].toFixed(2)} then ${r[14]}`);
r = J(`__fly(30, (i, me, dts) => { me.vx += 150 * dts; }, __C).last`);
check('a gentle push (150 px/s2) is a small burn, not a full one', r.engine > 0.1 && r.engine < 0.4 && r.phase === 'burn', JSON.stringify(r));
r = J(`__fly(40, (i, me, dts) => { me.rot = Math.PI / 2; me.vy += 720 * dts; }, __C).last`);
check('the push is read along the nose, whichever way it points', r.engine === 1, JSON.stringify(r));
r = J(`__fly(40, (i, me, dts) => { me.vy += 720 * dts; }, __C).last`);
check('a push across the nose (something else moved the ship) is not the main engine', r.engine === 0, JSON.stringify(r));

// ---- coasting and braking ----
r = J(`__fly(60, (i, me, dts) => __coast(me, dts, 0.55), __C, { rot: 0, vx: 480, vy: 0 }).log`);
check('coasting at 480 px/s on Classic: no engine, no brake, phase "coast" the whole second', r.every(x => x.engine === 0 && x.brake === 0 && x.phase === 'coast'));
r = J(`__fly(60, (i, me, dts) => __coast(me, dts, 0.78), __H, { rot: 0, vx: 480, vy: 0 }).log`);
check('and on Heavy, which drifts longer', r.every(x => x.engine === 0 && x.brake === 0));
r = J(`__fly(30, (i, me, dts) => __coast(me, dts, 0.12), __C, { rot: 0, vx: 480, vy: 0 }).log`);
check('a hard stop from 480 px/s (the brake takes 88% a second): a full braking burn within a few frames, phase "brake"', r[10].brake === 1 && r[10].phase === 'brake' && r[10].engine === 0, JSON.stringify(r[10]));
check('it comes on over a few frames, not in one', r[0].brake > 0 && r[0].brake < 0.3, r[0].brake.toFixed(2));
r = J(`__fly(240, (i, me, dts) => __coast(me, dts, 0.12), __C, { rot: 0, vx: 480, vy: 0 }).last`);
check('the ship has stopped: the braking burn is out', r.brake === 0 && r.phase === 'coast', JSON.stringify(r));
r = J(`__fly(30, (i, me, dts) => __coast(me, dts, 0.3), __H, { rot: 0, vx: 300, vy: 0, brake: true }).last`);
check('Heavy brakes more softly (it keeps 30% a second): with the brake commanded it is still a braking burn', r.brake > 0.5 && r.phase === 'brake', JSON.stringify(r));
r = J(`__fly(30, (i, me, dts) => __coast(me, dts, 0.12), __C, { rot: 2, vx: 0, vy: -400 }).last`);
check('braking is read from the speed, not the heading: a ship sliding sideways brakes too, and its engine stays dark', r.brake > 0.8 && r.engine === 0 && r.phase === 'brake', JSON.stringify(r));
r = J(`__fly(30, (i, me, dts) => {}, __C, { rot: 0, vx: 20, vy: 0, brake: true }).last`);
check('the brake held on a ship that is all but still: nothing to burn against', r.brake === 0, JSON.stringify(r));

// ---- the command hints ----
r = J(`__fly(40, (i, me, dts) => {}, __C, { rot: 0, vx: 480, vy: 0, burn: true }).last`);
check('at top speed the engine cannot push the ship any faster: commanded on, it stays lit (0.75)', r.engine === 0.75 && r.phase === 'burn', JSON.stringify(r));
r = J(`__fly(40, (i, me, dts) => {}, __C, { rot: 0, vx: 800, vy: 0, burn: true, boost: true }).last`);
check('on the boost it is full', r.engine === 1, JSON.stringify(r));
r = J(`__fly(30, (i, me, dts) => { me.vx += 720 * dts; }, __C, { rot: 0, vx: 0, vy: 0, brake: true }).last`);
check('burning and "braking" at once (the nav list holds the brake while the autopilot burns): the engine wins, no braking jets', r.engine === 1 && r.brake === 0, JSON.stringify(r));

// ---- Heavy is stronger; a hitch is not a manoeuvre; the pool ----
check('Heavy shows more than Classic: strength 1.4 against 1', J(`[__fly(2, () => {}, __C).b.strength, __fly(2, () => {}, __H).b.strength]`).join() === '1,1.4');
r = J(`(() => { const b = feelBurnNew(), me = { rot: 0, vx: 0, vy: 0 }; feelBurnRead(b, me, 16, __C); me.rot = 2; me.vx = 400; feelBurnRead(b, me, 900, __C); return [b.turn, b.engine, b.brake, b.phase]; })()`);
check('a frame of 900 ms (a tab switch, a scene start) is not read as a turn or a burn', r.join() === '0,0,0,coast', r.join());
r = J(`(() => { const b = feelBurnNew(); feelBurnRead(b, { rot: 1, vx: 300, vy: 0 }, 16, __C); feelBurnRest(b); feelBurnRead(b, { rot: -2, vx: -300, vy: 0 }, 16, __C); return [b.turn, b.engine, b.brake]; })()`);
check('after a rest (a dock, a cruise) the first frame starts fresh', r.join() === '0,0,0', r.join());
r = J(`(() => { const b = feelBurnNew(), seen = new Set(); for (let i = 0; i < 500; i++) seen.add(feelPuff(b, i * 10, i, i, 1, 1, 3, 0xffffff)); return [b.pool.length, seen.size, BURN.puffs, b.pool[b.next ? b.next - 1 : BURN.puffs - 1].x]; })()`);
check('500 puffs use the same 32 objects over and over: the pool does not grow', r[0] === 32 && r[1] === 32 && r[2] === 32 && r[3] === 499, r.join());

// ---- under the flight assist: its own flight model, and nothing asked of it ----
// an Approach of src/assist.js from 3000 px with the nose the wrong way: it turns, burns, coasts at top speed, brakes and stops. Only the
// ship's heading and velocity go to the reader: no hints at all.
r = J(`(() => {
  const st = { turn: shipStat('turn'), accel: shipStat('accel'), vmax: shipStat('vmax') }, dt = 1000 / 60, tgt = { x: 3000, y: 0, vx: 0, vy: 0, moving: false };
  let me = { x: 0, y: 0, rot: Math.PI, vx: 0, vy: 0, burning: false }; const a = { mode: 'approach', target: tgt, range: 200, since: 0 }, b = feelBurnNew(), b2 = feelBurnNew();
  const first = {}, seen = [], sum = { turnWhileCmdTurn: 0, cmdBurn: 0, burnSeen: 0, slowBurn: 0, slowSeen: 0, hintSeen: 0, cmdBrake: 0, brakeSeen: 0, falseBrake: 0, frames: 0 }; let lastBrake = -99;
  feelBurnRead(b, me, dt, __C);
  for (let i = 0; i < 1500; i++) {
    const cmd = ASSIST_MODES.approach.plan(a, me, tgt, st); if (cmd.done) break;
    const was = me.rot; me = assistStep(me, cmd, st, dt);
    feelBurnRead(b, { rot: me.rot, vx: me.vx, vy: me.vy }, dt, __C);
    feelBurnRead(b2, { rot: me.rot, vx: me.vx, vy: me.vy, burn: !!cmd.burn, brake: !!cmd.brake }, dt, __C); // what the game does: the two commands as hints
    sum.frames++;
    if (first[b.phase] === undefined) { first[b.phase] = i; seen.push(b.phase); }
    if (cmd.burn) { sum.cmdBurn++; if (b.engine > 0.1) sum.burnSeen++; if (b2.engine > 0.1) sum.hintSeen++; if (Math.hypot(me.vx, me.vy) < st.vmax * 0.9) { sum.slowBurn++; if (b.engine > 0.1) sum.slowSeen++; } }
    if (cmd.brake) lastBrake = i;
    if (cmd.brake && Math.hypot(me.vx, me.vy) > 60) { sum.cmdBrake++; if (b.brake > 0.15) sum.brakeSeen++; } // under 60 px/s there is nothing left to burn against
    if (i - lastBrake > 15 && b.brake > 0.15) sum.falseBrake++; // 15 frames: the jets fading after the brake came off
  }
  return { first, seen, sum, end: { engine: b.engine, brake: b.brake, speed: Math.hypot(me.vx, me.vy) } };
})()`);
check('an Approach of the flight assist reads turn first, then burn, then brake', r.first.turn < r.first.burn && r.first.burn < r.first.brake, JSON.stringify(r.first));
check('it turns before it burns: the first frames are a turn with the engine off', r.first.turn <= 2 && r.first.burn > 20, JSON.stringify(r.first));
check('with no hint from the assist, the engine shows while the burn speeds the ship up (under 90% of its top speed)', r.sum.slowBurn > 30 && r.sum.slowSeen >= r.sum.slowBurn * 0.9, `${r.sum.slowSeen} of ${r.sum.slowBurn} burn frames`);
check('at top speed there is no push left to see: the command as a hint keeps the engine lit for the whole burn', r.sum.burnSeen < r.sum.cmdBurn * 0.5 && r.sum.hintSeen >= r.sum.cmdBurn * 0.95, `${r.sum.burnSeen} of ${r.sum.cmdBurn} without the hint, ${r.sum.hintSeen} with it`);
check('and the braking burn shows on nearly every frame it brakes at speed', r.sum.cmdBrake > 20 && r.sum.brakeSeen >= r.sum.cmdBrake * 0.9, `${r.sum.brakeSeen} of ${r.sum.cmdBrake} brake frames`);
check('it never shows a braking burn while the assist coasts or burns', r.sum.falseBrake === 0, r.sum.falseBrake + ' frames');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `BURN FEEL FAIL (${failed} of ${n})` : `BURN FEEL PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
