// smoke: Dock and Land as orders: the autopilot takes the ship all the way in, phase by phase (plain Node, no Chrome)
// Card space-game-dock-by-command (Troy: control like EVE, you give an order and the ship carries it out; travel used to stop outside and he
// flew the last stretch and pressed L). The real src/autopilot.js, src/cruise.js and src/navpanel.js rules on a stand-in scene, flown frame by
// frame. The dock and land code of src/space.js is stood in for by its own conditions (inside 320 px of the station under 150 px/s, inside
// r + 150 of the planet under 170 px/s, and L pressed); cruise's long middle is stood in for by its result (900 px short, "arrived").
//   the phases of a Dock order: clear the mass, cruise, the local approach, final (in the zone and slow: L is pressed for you), docked
//   Land the same on the planet you can land on; the plain order still stops outside and says "press L"
//   any flight key, P, a hit or a hostile hands the stick back on every phase, and no stray L is left behind
//   an order on a place that cannot take it is the plain order; the panel's bottom line says dock or land, and P for only flying there
// Run: node tests/dockorder.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); if (!cond) failed++; };
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
  // fly frames as Space.update does: the autopilot's frame, its drive, the ship moves, then the dock and land check of src/space.js.
  // opts.key: { at: 'stage', name: 'W' } holds a flight key once that stage is reached. Returns the stages in order and how it ended.
  function __fly(maxFrames, opts) {
    const s = __s, dt = 1000 / 60, o = opts || {}, st = sysBody('station'), pl = sysBody('planet');
    const log = { frames: 0, stages: [], docked: false, landed: false, on: true, fastest: 0, endSpeed: 0, endDist: 0, says: [] };
    const push = v => { if (v && log.stages[log.stages.length - 1] !== v) log.stages.push(v); };
    s.ap.read = { setVisible() { return this; }, setText(t) { const w = t.replace(/ [0-9.,]+ km$/, ' N km'); if (log.says[log.says.length - 1] !== w) log.says.push(w); return this; } };
    for (let i = 0; i < maxFrames; i++) {
      s.time.now += dt; log.frames++;
      const r = autopilotFrame(s, s.time.now, dt, s.cruising ? 'cruise' : '');
      push(s.ap.stage);
      if (s.cruising) { // cruise's long middle, by its result: it drops out 900 px short of the body and says it arrived
        const t = s.ap.target, a = Math.atan2(s.ship.y - t.y, s.ship.x - t.x), d = (t.r || 0) + 900;
        s.ship.x = t.x + Math.cos(a) * d; s.ship.y = t.y + Math.sin(a) * d; s.ship.rotation = a + Math.PI;
        s.ship.body.setVelocity(Math.cos(s.ship.rotation) * 300, Math.sin(s.ship.rotation) * 300);
        s.cruising = false; s.cr.active = false; s.cr.endWhy = 'arrived'; log.cruised = (log.cruised || 0) + 1; continue;
      }
      if (!s.ap.on) { log.on = false; break; }
      if (o.key && s.ap.stage === o.key.at) s.k[o.key.name].isDown = true;
      if (r === 'auto') autopilotDrive(s, dt);
      s.ship.x += s.ship.body.velocity.x * dt / 1000; s.ship.y += s.ship.body.velocity.y * dt / 1000;
      const spd = s.ship.body.speed, dS = Math.hypot(s.ship.x - st.x, s.ship.y - st.y), dP = Math.hypot(s.ship.x - pl.x, s.ship.y - pl.y), JD = Phaser.Input.Keyboard.JustDown;
      if (s.ap.stage === 'final') log.fastest = Math.max(log.fastest, spd);
      if (!o.noDock) { // src/space.js, "dock / land"
        if (dS < 320) { if (spd < 150 && JD(s.k.L)) { s.leaving = true; log.docked = true; log.endSpeed = spd; log.endDist = dS; } }
        else if (s.canLand && dP < pl.r + 150) { if (spd < 170 && JD(s.k.L)) { s.leaving = true; log.landed = true; log.endSpeed = spd; log.endDist = dP - pl.r; } }
      }
      if (s.leaving) { autopilotFrame(s, s.time.now, dt, ''); log.on = s.ap.on; break; }
    }
    log.seconds = +(log.frames / 60).toFixed(1); log.L = !!s.k.L._justDown; log.order = s.ap.order;
    return log;
  }
  function __start(x, y) { const s = __scene(x, y, 0); s.k.L = { isDown: false }; s.canLand = true; return s; }
`);

const st = J(`sysBody('station')`), pl = J(`sysBody('planet')`), LOCK = J('CRUISE.lockMass');
const said = re => J('__said').some(m => re.test(m));
const row = b => JSON.stringify({ kind: 'body', id: b.id, name: b.name, type: b.type, x: b.x, y: b.y, r: b.r || 0 });

console.log('which places take an order');
{
  const o = (b, canLand) => J(`autopilotOrder(${JSON.stringify(b)}, sysBody('station'), sysBody('planet'), ${canLand})`);
  check('the system\'s station takes Dock', o({ id: st.id, type: 'station' }, true) === 'dock');
  check('the planet you can land on takes Land; with no landing there it takes nothing', o({ id: pl.id, type: 'planet' }, true) === 'land' && o({ id: pl.id, type: 'planet' }, false) === '');
  const others = J(`sysBodies().filter(b => b.id !== '${st.id}' && b.id !== '${pl.id}').map(b => autopilotOrder(b, sysBody('station'), sysBody('planet'), true))`);
  check('nothing else does: outposts, belts, the gate, wrecks are places you only reach', others.length > 3 && others.every(v => v === ''), others.join());
  check('a system with no station or planet gives no order', J(`autopilotOrder({ id: 'x', type: 'station' }, null, null, true)`) === '' && J(`autopilotOrder(null, null, null, true)`) === '');
}

console.log('the one quiet line');
{
  const say = (o, stage) => J(`autopilotSay('${o}', '${stage}', 'Halcyon Station', 'Kepler-4b', '12')`);
  check('a Dock order says what it is doing in each phase', say('dock', 'clear') === 'DOCKING AT  HALCYON STATION   clearing Kepler-4b' && say('dock', 'local') === 'DOCKING AT  HALCYON STATION   12 km' && say('dock', 'final') === 'DOCKING AT  HALCYON STATION   going in');
  check('a Land order the same', J(`autopilotSay('land', 'final', 'Kepler-4b', '', '')`) === 'LANDING ON  KEPLER-4B   going down' && /^LANDING ON  KEPLER-4B   3 km$/.test(J(`autopilotSay('land', 'local', 'Kepler-4b', '', '3')`)));
  check('the plain order reads as it did', say('', 'local') === 'AUTOPILOT  HALCYON STATION   12 km' && say('', 'clear') === 'CLEARING  KEPLER-4B');
}

console.log('Dock, from beside the planet: every phase, no hands');
{
  const a = Math.atan2(pl.y - st.y, pl.x - st.x), from = { x: pl.x + Math.cos(a) * 900, y: pl.y + Math.sin(a) * 900 }; // the far side of the planet from the station
  check('the planet is far enough from the station for a cruise leg (else this picture is not the long one)', Math.hypot(pl.x - st.x, pl.y - st.y) > LOCK + J('AUTO.cruiseLeg'));
  g.run(`__start(${from.x}, ${from.y})`);
  const went = J(`autopilotGo(__s, ${row(st)}, 'dock')`);
  check('the order is taken, and one line says the whole plan', went === true && said(/^Clearing Kepler-4b, then docking at Halcyon Station/), JSON.stringify(J('__said')));
  const log = J(`__fly(4000)`);
  check('the phases in order: clear the mass, cruise, the local approach, final', log.stages.join() === 'clear,local,cruise,local,final' || log.stages.join() === 'clear,cruise,local,final', log.stages.join());
  check('it docks by itself', log.docked && !log.landed && log.on === false, JSON.stringify({ s: log.seconds, stages: log.stages }));
  check(`inside the dock zone and under docking speed when it goes in (${Math.round(log.endDist)} px, ${Math.round(log.endSpeed)} px/s)`, log.endDist < 320 && log.endSpeed < 150);
  check('the readout said each phase', log.says.join(' | ') === 'DOCKING AT  HALCYON STATION   clearing Kepler-4b | DOCKING AT  HALCYON STATION   N km | DOCKING AT  HALCYON STATION   going in' || (log.says[0] === 'DOCKING AT  HALCYON STATION   clearing Kepler-4b' && log.says.includes('DOCKING AT  HALCYON STATION   N km')), log.says.join(' | '));
  check('it never says "press L", and leaves no order or stray L behind', !said(/press L/) && log.order === '' && log.L === false, JSON.stringify(J('__said')));
}

console.log('Land, from beside the station');
{
  g.run(`__start(${st.x + 400}, ${st.y})`);
  check('the order is taken', J(`autopilotGo(__s, ${row(pl)}, 'land')`) === true && said(/landing on Kepler-4b|Landing on Kepler-4b/), JSON.stringify(J('__said')));
  const log = J(`__fly(4000)`);
  check('it clears the station, cruises, comes in and lands by itself', log.landed && !log.docked && log.stages[log.stages.length - 1] === 'final' && log.cruised === 1, JSON.stringify({ stages: log.stages, cruised: log.cruised }));
  check(`inside the landing zone and under landing speed (${Math.round(log.endDist)} px off the ground, ${Math.round(log.endSpeed)} px/s)`, log.endDist < 150 && log.endSpeed < 170);
}

console.log('a short hop, and being there already');
{
  g.run(`__start(${st.x + 1200}, ${st.y})`);
  g.run(`autopilotGo(__s, ${row(st)}, 'dock')`);
  let log = J(`__fly(2000)`);
  check('1200 px out: no clearing, no cruise, straight in and docked', log.docked && log.stages.join() === 'local,final' && !log.cruised, log.stages.join());
  g.run(`__start(${st.x + 280}, ${st.y})`);
  check('at the dock already the plain order has nothing to do', J(`autopilotGo(__s, ${row(st)})`) === false && said(/you are there/));
  check('the Dock order still docks from there', J(`autopilotGo(__s, ${row(st)}, 'dock')`) === true && J(`__fly(600)`).docked === true);
}

console.log('the plain order is as it was');
{
  g.run(`__start(${st.x + 1200}, ${st.y})`);
  g.run(`autopilotGo(__s, ${row(st)})`);
  const log = J(`__fly(2000)`);
  check('it stops outside and says press L; it does not dock', !log.docked && log.on === false && !log.stages.includes('final') && said(/Halcyon Station: press L to dock\./), JSON.stringify(J('__said')));
  g.run(`__start(${st.x + 1200}, ${st.y})`);
  const out = J(`sysBodies().find(b => b.type !== 'station' && b.type !== 'planet')`);
  check('an order on a place that cannot take it is the plain order', J(`(() => { autopilotGo(__s, ${row(out)}, 'dock'); return __s.ap.order; })()`) === '');
}

console.log('the stick comes back');
{
  for (const [at, key] of [['local', 'W'], ['final', 'S']]) {
    g.run(`__start(${st.x + 1200}, ${st.y}); autopilotGo(__s, ${row(st)}, 'dock');`);
    const log = J(`__fly(2000, { key: { at: '${at}', name: '${key}' }${at === 'final' ? ', noDock: true' : ''} })`);
    check(`${key} during ${at}: autopilot off, no dock, no stray L`, !log.docked && log.on === false && log.L === false && log.order === '' && said(/^Autopilot off\./), JSON.stringify({ stages: log.stages, L: log.L }));
  }
  g.run(`__start(${st.x + 1200}, ${st.y}); autopilotGo(__s, ${row(st)}, 'dock'); __s.foes.push({ active: true, x: ${st.x + 900}, y: ${st.y} });`);
  check('a hostile close by: contact, autopilot off, no dock', J(`__fly(600)`).docked === false && said(/^Contact: autopilot off/));
  g.run(`__start(${st.x + 1200}, ${st.y}); autopilotGo(__s, ${row(st)}, 'dock');`);
  const log = J(`__fly(2000, { noDock: true })`);
  check('a dock that does not take: after a moment it says press L and lets go, with no L left pressed', log.on === false && log.L === false && said(/press L to dock/) && log.stages[log.stages.length - 1] === 'final', JSON.stringify(J('__said')));
}

console.log('the navigation panel gives the order');
{
  const far = { kind: 'body', id: st.id, type: 'station', name: st.name, x: 0, y: 0, r: 0, dist: 5000 }, at = Object.assign({}, far, { dist: 280 });
  const hint = (r, dest, o) => J(`navpanelHint(${JSON.stringify(r)}, ${dest}, '${o}')`);
  check('the station as the destination: Enter docks, P only flies there', hint(far, true, 'dock') === 'Enter  dock   P  fly there only');
  check('the planet: Enter lands', hint(far, true, 'land') === 'Enter  land   P  fly there only');
  check('not the destination yet: a place goes on the first Enter (card space-game-hunt-pirates), so the hint is the same', hint(far, false, 'dock') === 'Enter  dock   P  fly there only');
  check('at the dock already: Enter docks; a place with no order says you are there', hint(at, true, 'dock') === 'Enter  dock' && hint(at, true, '') === 'You are there.');
  check('a place with no order goes as before', /go: autopilot/.test(hint(far, true, '')));
  g.run(`__start(${st.x + 1200}, ${st.y})`);
  check('the panel asks the same rule which order a row takes', J(`[navpanelOrder(__s, ${row(st)}), navpanelOrder(__s, ${row(pl)}), navpanelOrder(__s, { kind: 'jump', id: 'kestrel' }), (__s.canLand = false, navpanelOrder(__s, ${row(pl)}))]`).join() === 'dock,land,,');
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
