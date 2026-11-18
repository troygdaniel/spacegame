// smoke: travel near a mass: with a target set, C and P inside a station's or planet's mass limit fly the ship clear and then cruise or fly on, instead of refusing
// Card space-game-bug-travel-refuses-near-mass (Troy, 17 Nov 2026: beside Kepler-4b with a target set, C answered "Too close to the mass: fly clear of
// Kepler-4b" and the ship sat still; to him that was travel not working). Plain Node (tests/nodegame.mjs), no browser: the real src/cruise.js and
// src/autopilot.js on a stand-in scene, flown frame by frame.
//   C inside a mass limit: no refusal; one line says "Clearing <mass>, then cruising to <target>"; the ship flies out the short way, leaning to the
//     target's side, never deeper into the limit, and cruise engages the moment it is clear.
//   P the same, then the autopilot's own leg (which cruises the long middle); a short hop inside the limit is flown as before.
//   Any flight key, P again, a hit or a hostile close by still takes the stick back. Outside a limit C and P are as they were.
//   The refusal stays where the autopilot cannot take the ship (a jump charging).
// Run: node tests/travelclear.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); if (!cond) failed++; };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  var __said = [];
  toast = (s, msg) => { __said.push(msg); };
  sfx = () => {}; startCruiseHum = () => {}; stopCruiseHum = () => {}; cruiseFlash = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  Phaser = { Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Angle: { Wrap: __wrap, Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    RotateTo: (cur, tgt, step) => { const d = __wrap(tgt - cur); return Math.abs(d) <= step ? tgt : cur + Math.sign(d) * step; } }, Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } },
    Input: { Keyboard: { JustDown: k => { const d = !!(k && k._justDown); if (k) k._justDown = false; return d; } } } };
  var __s = null;
  // a ship at (x, y) in Halcyon with nothing around but the system's own bodies
  function __scene(x, y, rot) {
    const body = { velocity: { x: 0, y: 0 }, get speed() { return Math.hypot(body.velocity.x, body.velocity.y); }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const foes = [];
    const s = __s = { add: __P, input: __P, events: __P, cameras: __P, time: { now: 1000 }, k: {}, ship: { x, y, rotation: rot || 0, body }, lockUntil: 0, dead: false, leaving: false, jmp: null, cruising: false,
      enemies: { getChildren: () => foes }, foes, cr: { target: null, active: false, list: [], sel: 0, speed: 0, nudge: 0, cancel: false, endWhy: '' } };
    ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'SHIFT', 'Q', 'E'].forEach(n => { s.k[n] = { isDown: false }; });
    autopilotSetup(s); s.ap.k = { P: {} }; s.ap.read = { setVisible() { return this; }, setText() { return this; } };
    G.system = 'halcyon'; G.deep = null; G.hull = G.maxHull; __said = [];
    return s;
  }
  function __target(id) { const b = sysBodies().find(b => b.id === id); __s.cr.target = { id: b.id, name: b.name || 'Drifting survey rig', type: b.type, x: b.x, y: b.y, r: b.r || 0 }; return __s.cr.target; }
  // fly frames of 16.67 ms as Space.update does: the autopilot's frame, its drive, then the ship moves by its velocity. Stops when cruise takes over or the autopilot lets go.
  function __fly(maxFrames, mass) {
    const s = __s, dt = 1000 / 60, log = { frames: 0, minMass: 1e9, deeper: 0, stages: [], cruising: false, on: true, exit: null };
    let last = mass ? Math.hypot(s.ship.x - mass.x, s.ship.y - mass.y) : 0;
    for (let i = 0; i < maxFrames; i++) {
      s.time.now += dt; log.frames++;
      const r = autopilotFrame(s, s.time.now, dt, s.cruising ? 'cruise' : '');
      if (log.stages[log.stages.length - 1] !== s.ap.stage) log.stages.push(s.ap.stage);
      if (s.cruising) { log.cruising = true; break; }
      if (!s.ap.on) { log.on = false; break; }
      if (r === 'auto') autopilotDrive(s, dt);
      s.ship.x += s.ship.body.velocity.x * dt / 1000; s.ship.y += s.ship.body.velocity.y * dt / 1000;
      if (mass) { const d = Math.hypot(s.ship.x - mass.x, s.ship.y - mass.y); if (d < last - 0.01) log.deeper++; last = d; log.minMass = Math.min(log.minMass, d); if (!log.exit && d >= CRUISE.lockMass) log.exit = { x: s.ship.x, y: s.ship.y, frame: i }; }
    }
    log.seconds = +(log.frames / 60).toFixed(1); log.rot = s.ship.rotation; log.x = s.ship.x; log.y = s.ship.y;
    return log;
  }
`);

const planet = J(`sysBodies().find(b => b.id === 'kepler-4b')`), rig = J(`sysBodies().find(b => b.id === 'wreck-se')`), LOCK = J('CRUISE.lockMass');
const refused = () => J('__said').some(m => /Too close to the mass/.test(m));
// where Troy was: beside Kepler-4b, well inside its mass limit, on the side away from the rig
const away = Math.atan2(planet.y - rig.y, planet.x - rig.x), farSide = { x: planet.x + Math.cos(away) * 900, y: planet.y + Math.sin(away) * 900 };
const nearSide = { x: planet.x - Math.cos(away) * 900, y: planet.y - Math.sin(away) * 900 };

console.log('C beside Kepler-4b with the survey rig as the target (the picture)');
{
  g.run(`__scene(${nearSide.x}, ${nearSide.y}, 0); __target('wreck-se'); cruiseEngage(__s);`);
  check('the game does not refuse', !refused(), JSON.stringify(J('__said')));
  check('one line says what it will do: Clearing Kepler-4b, then cruising to the target', J('__said').some(m => /^Clearing Kepler-4b, then cruising to /.test(m)), JSON.stringify(J('__said')));
  check('the ship is flying itself, not cruising yet', J('__s.ap.on === true && __s.ap.stage === "clear" && __s.cruising === false'));
  const log = J(`__fly(1200, ${JSON.stringify(planet)})`);
  check('it flies clear of the mass limit and cruise engages by itself', log.cruising && log.exit !== null, JSON.stringify({ s: log.seconds, stages: log.stages }));
  check('it never flies deeper into the limit on the way out', log.deeper === 0 && log.minMass >= 899, 'frames deeper: ' + log.deeper);
  const direct = (LOCK - 900) / J(`shipStat('vmax')`);
  check(`it is quick about it: ${log.seconds} s (the straight way out at top speed is ${direct.toFixed(1)} s)`, log.seconds < direct + 4);
  check('the autopilot has let go: it is a plain cruise to the rig now', J('__s.ap.on === false && __s.cr.active === true && __s.cr.target.id === "wreck-se"') && J('__said').some(m => /^Cruise to /.test(m)), JSON.stringify(J('__said')));
  check('still no refusal anywhere', !refused());
}

console.log('the target on the other side of the planet');
{
  g.run(`__scene(${farSide.x}, ${farSide.y}, 0); __target('wreck-se'); cruiseEngage(__s);`);
  const log = J(`__fly(1200, ${JSON.stringify(planet)})`);
  check('it still gets out and cruises', log.cruising && !refused(), JSON.stringify(log.stages));
  check('by the short way: outward, never back through the planet', log.deeper === 0);
  const direct = (LOCK - 900) / J(`shipStat('vmax')`);
  check(`in about the time the straight way out takes (${log.seconds} s against ${direct.toFixed(1)} s)`, log.seconds < direct + 4);
}

console.log('the heading out, as numbers');
{
  const A = (sx, sy, tx, ty) => J(`autopilotClearAngle(${sx}, ${sy}, 0, 0, ${tx}, ${ty})`);
  check('target on our side of the mass: straight at the target', Math.abs(A(1000, 0, 9000, 0)) < 1e-9 && Math.abs(A(1000, 0, 9000, 3000) - Math.atan2(3000, 8000)) < 1e-9);
  check('target dead behind the mass: straight out, away from the mass', Math.abs(A(1000, 0, -9000, 0)) < 1e-9);
  const up = A(1000, 0, -9000, 4000), down = A(1000, 0, -9000, -4000);
  check('target behind and to one side: outward, leaning to the target\'s side', up > 0.05 && up < Math.PI / 2 && down < -0.05 && down > -Math.PI / 2, up.toFixed(2) + ' / ' + down.toFixed(2));
  check('every such heading has an outward part: it never points into the mass', [[1000, 0, -9000, 4000], [0, 800, 500, -9000], [-600, -600, 9000, 9000], [300, 0, -200, 50]].every(([sx, sy, tx, ty]) => { const a = A(sx, sy, tx, ty); return Math.cos(a) * sx + Math.sin(a) * sy > 0; }));
  check('at the very middle of a mass: toward the target', Math.abs(A(0, 0, 0, 5000) - Math.PI / 2) < 1e-9);
}

console.log('P in the same spot');
{
  g.run(`__scene(${nearSide.x}, ${nearSide.y}, 0); __target('wreck-se'); __s.ap.k.P._justDown = true;`);
  const log = J(`__fly(1200, ${JSON.stringify(planet)})`);
  check('P says Clearing Kepler-4b, then on to the target', J('__said').some(m => /^Clearing Kepler-4b, then on to /.test(m)) && !refused(), JSON.stringify(J('__said')));
  check('it clears the limit, then the autopilot cruises the long middle', log.cruising && log.stages.includes('clear') && J('__s.ap.on === true && __s.ap.stage === "cruise"'), JSON.stringify(log.stages));
  g.run(`__scene(${planet.x + 700}, ${planet.y}, 0); __s.cr.target = { id: 'x', name: 'A spot nearby', type: 'poi', x: ${planet.x + 2200}, y: ${planet.y}, r: 0 }; __s.ap.k.P._justDown = true; __fly(2)`);
  check('a short hop inside the limit is just flown, as before', J('__s.ap.on === true && __s.ap.stage === "local"') && J('__said').some(m => /^Autopilot to A spot nearby/.test(m)), JSON.stringify(J('__said')));
}

console.log('taking the stick back while it clears');
{
  const start = `__scene(${nearSide.x}, ${nearSide.y}, 0); __target('wreck-se'); cruiseEngage(__s); __fly(30);`;
  g.run(start + ` __s.k.W.isDown = true;`); let log = J('__fly(5)');
  check('a flight key: autopilot off, no cruise', !log.on && !log.cruising && J('__said').some(m => /^Autopilot off/.test(m)), JSON.stringify(J('__said')));
  g.run(start + ` __s.ap.k.P._justDown = true;`); log = J('__fly(5)');
  check('P again: autopilot off', !log.on && !log.cruising);
  g.run(start + ` G.hull -= 5;`); log = J('__fly(5)');
  check('a hit: autopilot off', !log.on && J('__said').some(m => /^Hit: autopilot off/.test(m)));
  g.run(start + ` __s.foes.push({ active: true, x: __s.ship.x + 600, y: __s.ship.y });`); log = J('__fly(5)');
  check('a hostile 600 px off: autopilot off', !log.on && J('__said').some(m => /^Contact: autopilot off/.test(m)));
}

console.log('what did not change');
{
  g.run(`__scene(${planet.x + LOCK + 400}, ${planet.y}, 0); __target('wreck-se'); cruiseEngage(__s);`);
  check('outside every mass limit C cruises at once, with no clearing line', J('__s.cruising === true && __s.ap.on === false') && !J('__said').some(m => /^Clearing/.test(m)), JSON.stringify(J('__said')));
  g.run(`__scene(${nearSide.x}, ${nearSide.y}, 0); cruiseEngage(__s);`);
  check('C with no target still says so', J('__said').some(m => /^No destination/.test(m)) && J('__s.ap.on === false'));
  g.run(`__scene(${nearSide.x}, ${nearSide.y}, 0); __target('wreck-se'); __s.jmp = { charging: true }; cruiseEngage(__s);`);
  check('where the autopilot cannot take the ship (a jump charging) the refusal stays', refused() && J('__s.ap.on === false && __s.cruising === false'), JSON.stringify(J('__said')));
  g.run(`__scene(${nearSide.x}, ${nearSide.y}, 0); __target('wreck-se'); __s.foes.push({ active: true, x: __s.ship.x + 900, y: __s.ship.y }); cruiseEngage(__s); __fly(3)`);
  check('a hostile close by still stops it, and says why', J('__s.cruising === false && __s.ap.on === false') && J('__said').some(m => /Contact|Hostiles/.test(m)), JSON.stringify(J('__said')));
}
check('the game was quiet', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
