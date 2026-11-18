// smoke: gun lock: B locks a pirate, the lock builds, the cannons fire at it in range and in arc at the hand rate; assist off = nothing (plain Node, no Chrome)
// The gun lock (card space-game-gun-lock, src/gunlock.js): with the flight assist on, B locks a pirate and the cannons engage it by themselves.
// The rules are pure functions (gunlockTime, gunlockRange, gunlockNext, gunlockSolve) and the frame (gunlockFrame) only needs a scene that
// holds a ship, a list of pirates, a clock and a shoot(): a stand-in below, so all of it runs in plain Node (tests/nodegame.mjs).
// Checks: who B picks and in what order, the lock time with and without the Autotarget part, range and arc, the lead, one fire clock shared
// with Space (the rate and the damage of a shot by hand), what drops the lock, and that nothing happens with the assist off.
// Run: node tests/gunlock.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// the stand-in scene: a ship at the origin with its nose along +x, pirates where the test puts them, shots counted
g.run(`
  var __toasts = [], __shots = [];
  toast = (s, msg) => { __toasts.push(msg); };
  sfx = () => {}; feelShot = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __s = null;
  function __pirate(x, y, vx, vy, key) { return { x, y, active: true, def: { key: key || 'raider' }, body: { velocity: { x: vx || 0, y: vy || 0 } } }; }
  function __scene(pirates) {
    const s = __s = { add: __P, input: __P, events: __P, time: { now: 1000 }, cr: { navOpen: false }, as: { mode: '', target: null }, lockUntil: 0, nextFire: 0,
      ship: { x: 0, y: 0, rotation: 0 }, enemies: { getChildren: () => pirates }, pb: {},
      shoot(group, x, y, rot, speed, time) { const b = { x, y, rot, speed, time }; __shots.push(b); return b; } };
    __toasts = []; __shots = []; ASSIST.on = true; ASSIST.s = s;
    gunlockSetup(s); GUNLOCK.g = null; GUNLOCK.read = null; GUNLOCK.k = {};
    return s;
  }
  function __press() { GUNLOCK.k._justDown = true; }
  function __run(ms) { for (let t = 0; t < ms; t += 16) { __s.time.now += 16; gunlockFrame(__s, __s.time.now); } }
  function __part(tier) { G.fleet[G.active].parts.aim = tier; }
`);

console.log('the rules');
{
  check('the lock builds in 1.4 s, 0.9 s with the Autotarget part, 0.6 s from the tier that leads', J('[gunlockTime(0, 0), gunlockTime(450, 0), gunlockTime(650, 1)]').join() === '1400,900,600');
  check('the guns reach 600 px, or as far as the part when that is further, never past a shot\'s flight', J('[gunlockRange(0), gunlockRange(450), gunlockRange(650), gunlockRange(850), gunlockRange(5000)]').join() === '600,600,650,825,825' && J('SHOT_SPEED * SHOT_LIFE / 1000') > 825);
  const pick = (cur, prefer) => J(`(() => { const L = [{ x: 300, y: 0, id: 'near' }, { x: 0, y: 700, id: 'mid' }, { x: -1000, y: 0, id: 'far' }, { x: 2000, y: 0, id: 'out' }]; const f = id => L.find(t => t.id === id) || null; const r = gunlockNext(L, { x: 0, y: 0 }, f('${cur}'), f('${prefer}')); return r ? r.id : 'none'; })()`);
  check('no lock yet: the nearest pirate', pick('', '') === 'near');
  check('no lock yet and the assist order is about a pirate in reach: that one', pick('', 'mid') === 'mid');
  check('an order about a pirate out of reach does not count: the nearest', pick('', 'out') === 'near');
  check('B again: the next one further out, then the next', pick('near', '') === 'mid' && pick('mid', '') === 'far');
  check('after the furthest in reach: none (the lock is dropped); the one beyond reach is never picked', pick('far', '') === 'none');
  check('nothing in reach: none', J(`gunlockNext([{ x: 5000, y: 0 }], { x: 0, y: 0 }, null, null)`) === null);
  const sol = (me, t, r) => J(`gunlockSolve(${JSON.stringify(me)}, ${JSON.stringify(t)}, ${r})`);
  const ahead = sol({ x: 0, y: 0, rot: 0 }, { x: 400, y: 0, vx: 0, vy: 0 }, 600);
  check('dead ahead and in range: fire along the nose', ahead.fire && Math.abs(ahead.rot) < 1e-6 && ahead.why === '');
  check('past the range: no shot, why: range', sol({ x: 0, y: 0, rot: 0 }, { x: 700, y: 0 }, 600).why === 'range' && !sol({ x: 0, y: 0, rot: 0 }, { x: 700, y: 0 }, 600).fire);
  check('behind the ship: no shot, why: arc', sol({ x: 0, y: 0, rot: 0 }, { x: -400, y: 0 }, 600).why === 'arc');
  check('40 degrees off the nose is inside the arc, 60 is not', sol({ x: 0, y: 0, rot: 0 }, { x: 400 * Math.cos(0.7), y: 400 * Math.sin(0.7) }, 600).fire && !sol({ x: 0, y: 0, rot: 0 }, { x: 400 * Math.cos(1.05), y: 400 * Math.sin(1.05) }, 600).fire);
  const lead = sol({ x: 0, y: 0, rot: 0 }, { x: 400, y: 0, vx: 0, vy: 300 }, 600);
  check('a crossing target is led: the shot is aimed ahead of it, where it will be', lead.fire && lead.rot > 0.25 && lead.rot < 0.4, lead.rot);
  // fly the led shot: it must pass within a raider's body (10 px) of the target
  const miss = J(`(() => { const s = gunlockSolve({ x: 0, y: 0, rot: 0 }, { x: 400, y: 0, vx: 0, vy: 300 }, 600); let best = 1e9; for (let t = 0; t < 0.9; t += 0.002) best = Math.min(best, Math.hypot(24 + Math.cos(s.rot) * SHOT_SPEED * t - 400, Math.sin(s.rot) * SHOT_SPEED * t - 300 * t)); return best; })()`);
  check('and that shot meets it (within 10 px)', miss < 10, miss);
}

console.log('B locks, the lock builds, the guns fire');
{
  g.run(`__part(0); __scene([__pirate(400, 0), __pirate(0, 800, 0, 0, 'gunship')]); __press(); __run(16);`);
  let st = J('gunlockState()');
  check('B: a lock starts on the nearest pirate, not locked yet', st.on && st.name === 'RAIDER' && !st.locked && st.locking < 0.1, JSON.stringify(st));
  g.run('__run(1300)');
  check('1.3 s in: still building, and no shot has left', !J('gunlockState().locked') && J('gunlockState().locking') > 0.9 && J('__shots.length') === 0);
  g.run('__run(200)');
  check('1.5 s in: locked, and the guns have fired by themselves', J('gunlockState().locked') && J('gunlockState().firing') && J('__shots.length') >= 1);
  g.run('__shots = []; __s.nextFire = __s.time.now; __run(3000)');
  const shots = J('__shots.length'), delay = J('fireDelay()');
  check('in 3 s it fires what a held Space would: one shot per fire delay, no more', Math.abs(shots - 3000 / delay) <= 1.5, `${shots} shots, delay ${delay}`);
  check('each shot carries the weapons part\'s damage and the hand shot\'s speed', J(`__shots.every(b => b.dmg === shipStat('damage') && b.speed === SHOT_SPEED)`));
  check('each is aimed at the target', J('__shots.every(b => Math.abs(b.rot) < 0.01)'));
  g.run('__shots = []; __s.nextFire = __s.time.now + 100000; __run(500)');
  check('a shot fired by hand moves the same clock: while it waits, the lock does not fire', J('__shots.length') === 0);
  g.run('__s.nextFire = 0; __shots = []; __s.ship.rotation = Math.PI; __run(300)');
  check('the ship turns away: the lock holds, the guns stop, the state says arc', J('gunlockState().locked') && !J('gunlockState().firing') && J('gunlockState().why') === 'arc' && J('__shots.length') === 0);
  g.run('__s.ship.rotation = 0; __s.lockUntil = __s.time.now + 100000; __run(300)');
  check('no shot during the launch lock', J('__shots.length') === 0);
  g.run('__s.lockUntil = 0; __press(); __run(16)');
  st = J('gunlockState()');
  check('B again: the lock moves to the gunship and builds from nothing', st.name === 'GUNSHIP' && !st.locked, JSON.stringify(st));
  g.run('__shots = []; __s.ship.rotation = Math.PI / 2; __run(2000)');
  check('locked on it at 800 px: out of range, so no shot', J('gunlockState().locked') && J('gunlockState().why') === 'range' && J('__shots.length') === 0);
  g.run('__press(); __run(16)');
  check('B after the furthest: the lock is dropped, and it says so', !J('gunlockState().on') && J('__toasts.includes("Lock dropped.")'));
}

console.log('the Autotarget part makes the lock faster and longer');
{
  g.run(`__part(3); __scene([__pirate(800, 0)]); __press(); __run(700);`);
  check('tier 3: locked inside 0.7 s and firing at 800 px', J('gunlockState().locked') && J('__shots.length') >= 1, J('JSON.stringify([shipStat("aimRange"), shipStat("aimLead")])'));
  g.run(`__part(0); __scene([__pirate(800, 0)]); __press(); __run(2000);`);
  check('no part: locked after 1.4 s but 800 px is out of range', J('gunlockState().locked') && J('__shots.length') === 0 && J('gunlockState().why') === 'range');
}

console.log('what drops the lock');
{
  g.run(`__scene([__pirate(400, 0)]); __press(); __run(1600); __s.enemies.getChildren()[0].active = false; __run(32);`);
  check('the target is destroyed: no lock, no toast of its own', !J('gunlockState().on') && J('gunlockTarget()') === null && J('__toasts.length') === 0, J('__toasts'));
  g.run(`__scene([__pirate(400, 0)]); __press(); __run(1600); __s.enemies.getChildren()[0].x = 1600; __run(32);`);
  check('the target gets past 1500 px: Lock lost', !J('gunlockState().on') && J('__toasts.includes("Lock lost: too far.")'));
  g.run(`__scene([__pirate(400, 0)]); __press(); __run(1600); ASSIST.on = false; __shots = []; __s.nextFire = 0; __run(500);`);
  check('the assist is switched off: the lock is gone and the guns are quiet', !J('gunlockState().on') && J('__shots.length') === 0);
  for (const flag of ['dead', 'leaving', 'cruising', 'jmp']) {
    g.run(`__scene([__pirate(400, 0)]); __press(); __run(1600); __s.${flag} = true; __shots = []; __s.nextFire = 0; __run(200);`);
    check(`s.${flag}: the lock is gone and the guns are quiet`, !J('gunlockState().on') && J('__shots.length') === 0);
  }
}

console.log('assist off: nothing changes');
{
  g.run(`__scene([__pirate(400, 0)]); ASSIST.on = false; __press(); __run(3000);`);
  check('B does nothing: no lock, no shot, no toast', !J('gunlockState().on') && J('__shots.length') === 0 && J('__toasts.length') === 0);
  check('gunlockSet refuses too', J('gunlockSet(__s.enemies.getChildren()[0])') === false);
  g.run(`__scene([]); __press(); __run(16);`);
  check('assist on with nobody about: B says there is nothing to lock', J('__toasts.includes("Nothing to lock in reach.")'));
  g.run(`__scene([__pirate(400, 0)]); __s.cr.navOpen = true; __press(); __run(16);`);
  check('the nav list has the keyboard: B is not read', !J('gunlockState().on'));
}

console.log('the order\'s target, and the interface');
{
  g.run(`__scene([__pirate(300, 0), __pirate(0, 500, 0, 0, 'drone')]); __s.as.mode = 'keep'; __s.as.target = __s.enemies.getChildren()[1]; __press(); __run(16);`);
  check('an assist order about the drone: B locks the drone, not the nearer raider', J('gunlockState().name') === 'DRONE');
  check('gunlockSet(pirate) locks it, gunlockSet(null) drops it', J('gunlockSet(__s.enemies.getChildren()[0])') === true && J('gunlockState().name') === 'RAIDER' && J('gunlockSet(null)') === true && !J('gunlockState().on'));
  check('the state with no lock is all zeros', JSON.stringify(J('gunlockState()')) === JSON.stringify({ on: false, name: '', locking: 0, locked: false, firing: false, why: '', dist: 0 }));
  const html = (await import('node:fs')).readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  check('index.html loads src/gunlock.js after the assist and the autotarget, before space.js', html.indexOf('src/gunlock.js') > html.indexOf('src/autotarget.js') && html.indexOf('src/gunlock.js') > html.indexOf('src/assist.js') && html.indexOf('src/gunlock.js') < html.indexOf('src/space.js'));
}

console.log('the line under the target (card space-game-assist-overview-overlap: it floated in mid-screen)');
{
  const line = (st, hint) => J(`gunlockLine(${JSON.stringify(st)}, ${hint ? '{}' : 'null'})`);
  check('no lock and nobody in reach: no line at all', line({ on: false }, false) === null);
  check('no lock, a pirate in reach: a short hint for under that pirate, with the key', line({ on: false }, true).text === J('GUNLOCK.key') + ' lock');
  check('building: LOCKING and the percent', line({ on: true, locked: false, locking: 0.4 }, false).text === 'LOCKING 40%');
  check('locked: FIRING, OUT OF RANGE or OUT OF ARC', [line({ on: true, locked: true, firing: true }).text, line({ on: true, locked: true, why: 'range' }).text, line({ on: true, locked: true, why: 'arc' }).text].join('|') === 'LOCKED  FIRING|LOCKED  OUT OF RANGE|LOCKED  OUT OF ARC');
  check('the readout is made at no fixed place on the screen: gunlockRead puts it under its pirate every frame', !/W \/ 2, 178/.test(J('gunlockSetup.toString()')) && /camzoomScreen\(s, t\.x, t\.y\)/.test(J('gunlockRead.toString()')));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
