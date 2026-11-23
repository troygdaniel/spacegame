// smoke: X in the N list clears the destination AND stops the autopilot that was flying to it (plain Node, no Chrome)
// Card space-game-lh-autopilot-cleared-dest. Since 568fb255 (18 Nov 2026) Enter on a place of the N list flies there at once, so the destination is
// also an autopilot trip. X cleared only the destination (cr.target): the autopilot kept its own copy (ap.target), kept flying, kept the Dock or Land
// order and, on a long leg, handed the cleared target back to cruise. Clearing the destination has to give the stick back, with one line that says so.
// Run: node tests/navclear.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  var __toasts = [], __cruised = 0, __Lpressed = 0;
  toast = (s, msg) => { __toasts.push(String(msg)); }; sfx = () => {}; beep = () => {}; startCruiseHum = () => {}; stopCruiseHum = () => {}; cruiseFlash = () => {};
  cruiseEngage = s => { __cruised++; s.cruising = true; s.cr.active = true; };   // the cruise itself is src/cruise.js's (tests/cruise.mjs): here only whether it is asked for
  navpanelDraw = () => {};                                                         // the panel's picture is not under test
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  Phaser = { Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Angle: { Wrap: __wrap, Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1), RotateTo: (cur, tgt, step) => { const d = __wrap(tgt - cur); return Math.abs(d) <= step ? tgt : cur + Math.sign(d) * step; } } },
    Input: { Keyboard: { JustDown: k => { const d = !!(k && k._justDown); if (k) k._justDown = false; return d; } } } };
  var __game = { scene: { isActive: () => false, getScenes: () => [__cur], getScene: () => null, run: () => {} } };
  var __cur = null;
  function __space(x, y) {
    const body = { velocity: { x: 0, y: 0 }, get speed() { return Math.hypot(body.velocity.x, body.velocity.y); }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const s = __cur = { scene: { key: 'Space', pause() {} }, game: __game, add: __P, input: { keyboard: __P, activePointer: { isDown: false } }, events: __P, cameras: __P, tweens: __P, time: { now: 1000 }, k: { L: { _justDown: false } },
      ship: { x, y, rotation: 0, body }, lockUntil: 0, dead: false, leaving: false, jmp: null, cruising: false, canLand: true, nextFire: 0, enemies: { getChildren: () => [] }, cm: {},
      cr: { target: null, active: false, list: [], sel: 0, speed: 0, nudge: 0, cancel: false, endWhy: '', navOpen: false } };
    ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'SHIFT', 'Q', 'E'].forEach(n => { s.k[n] = { isDown: false }; });
    autopilotSetup(s); s.ap.k = { P: {} }; s.ap.read = { setVisible() { return this; }, setText() { return this; } };
    navpanelSetup(s);
    __toasts = []; __cruised = 0; G.deep = null;
    return s;
  }
  function __world() {
    G.deep = null; G.system = 'halcyon'; G.lastDock = 'halcyon-station'; G.fleet = [newShip('kite')]; G.active = 0; G.credits = 2580; G.fleet[0].fuel = 30;
    G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; G.mission = 'none'; G.missionId = null; G.missionProgress = 0; shipSync(G.fleet[0]);
  }
  // the N list open with the keys on it, then one frame of it with the keys given
  function __nlist(s, keys) { s.cr.navOpen = true; s.np.keys = true; s.cr.list = navpanelRows(cruiseKnown(s), navpanelJumps(s), null); s.cr.sel = 0; return navpanelFrame(s, s.time.now, keys); }
  // the game's own frame order for the flight: the autopilot's frame, then its drive; the ship moves by what the drive set
  function __fly(s, ms) {
    for (let t = 0; t < ms; t += 16) {
      s.time.now += 16; autopilotFrame(s, s.time.now, 16, ''); autopilotDrive(s, 16);
      s.ship.x += s.ship.body.velocity.x * 0.016; s.ship.y += s.ship.body.velocity.y * 0.016;
      if (s.k.L._justDown) { __Lpressed++; s.k.L._justDown = false; }
    }
  }
`);
const station = J(`(() => { const b = sysBody('station'); return { id: b.id, name: b.name, x: b.x, y: b.y }; })()`);
const rowOf = id => J(`(() => { const s = __cur; return s.cr.list.findIndex(r => r.id === ${JSON.stringify(id)} && r.kind === 'body'); })()`);
// a trip: the ship `away` px from the station, the N list picked on the station's row (Enter: it docks), the list opened again
const trip = away => { g.run(`__world(); __space(${station.x + away}, ${station.y}); __cur.cr.list = navpanelRows(cruiseKnown(__cur), navpanelJumps(__cur), null)`); g.run(`navpanelClick(__cur, ${rowOf(station.id)})`); };

const X = { x: true };   // the one frame of the list with X pressed (cruiseFrame hands navpanelFrame what it read: { n, x, enter, up, down })

console.log('the trip: Enter on the station flies there');
trip(1500);
check('Enter on a place: the autopilot has the ship, the destination is the row, the dock order is on', J('__cur.ap.on') === true && J('__cur.cr.target.id') === station.id && J('__cur.ap.order') === 'dock', J('[__cur.ap.on, __toasts]'));

console.log('X in the list: the destination is cleared and the autopilot lets go');
g.run(`__fly(__cur, 3000)`); // it first turns onto the station (the ship starts pointing the other way), then runs up
const v0 = J('Math.round(__cur.ship.body.speed)');
check('it is flying (speed up, nearer the station)', v0 > 0 && J(`Math.hypot(__cur.ship.x - ${station.x}, __cur.ship.y - ${station.y})`) < 1500, v0);
g.run(`__toasts = []; __nlist(__cur, ${JSON.stringify(X)})`);
check('the destination is gone', J('__cur.cr.target') === null);
check('the autopilot is off, with no target and no order left', J('__cur.ap.on') === false && J('__cur.ap.target') === null && J('__cur.ap.order') === '' && J('__cur.ap.stage') === '', J('[__cur.ap.on, __cur.ap.stage, __cur.ap.order]'));
check('one line says both: the destination is cleared and the autopilot is off', J('__toasts.length') === 1 && /Destination cleared/.test(J('__toasts[0]')) && /Autopilot off/.test(J('__toasts[0]')), J('__toasts'));
const v1 = J('__cur.ship.body.speed');
g.run(`__fly(__cur, 20000)`);
check('and it stays off: 20 s later the autopilot has not taken the ship again, no cruise was asked for, the destination did not come back', J('__cur.ap.on') === false && J('__cur.cr.target') === null && J('__cruised') === 0, J('[__cur.ap.on, __cur.cr.target, __cruised]'));
check('nothing drives the ship any more: its speed is what it was when X was pressed, not the autopilot\'s braking run to a stop beside the station', v1 > 0 && J('__cur.ship.body.speed') === v1, J('__cur.ship.body.speed') + ' vs ' + v1);

console.log('the same trip left alone arrives, so the test above is not passing by a ship that never moved');
trip(1500); g.run(`__fly(__cur, 60000)`);
check('without X the autopilot flies there, stops and lets go by itself (its own "Autopilot off" line)', J('__cur.ap.on') === false && J(`Math.hypot(__cur.ship.x - ${station.x}, __cur.ship.y - ${station.y})`) < 400, J('[__cur.ap.on, __toasts]'));

console.log('X when no autopilot is flying: just the destination, and only that line');
g.run(`__world(); __space(${station.x + 1500}, ${station.y}); __cur.cr.list = navpanelRows(cruiseKnown(__cur), navpanelJumps(__cur), null); cruisePick(__cur, __cur.cr.list.find(r => r.id === ${JSON.stringify(station.id)}), true); __toasts = []`);
check('a destination that is only set (C, the Tab map): the autopilot is not on', J('__cur.ap.on') === false && J('__cur.cr.target.id') === station.id);
g.run(`__nlist(__cur, ${JSON.stringify(X)})`);
check('X clears it and says "Destination cleared." and nothing about the autopilot', J('__cur.cr.target') === null && J('__toasts.length') === 1 && J('__toasts[0]') === 'Destination cleared.', J('__toasts'));
g.run(`__toasts = []; __nlist(__cur, ${JSON.stringify(X)})`);
check('X again with nothing to clear does no harm', J('__cur.cr.target') === null && J('__cur.ap.on') === false);

console.log('X with the autopilot flying but the destination already dropped (cruise drops it near a body; the autopilot keeps its own)');
trip(1500); g.run(`__fly(__cur, 300); __cur.cr.target = null; __toasts = []; __nlist(__cur, ${JSON.stringify(X)})`);
check('the autopilot is off all the same', J('__cur.ap.on') === false && J('__cur.ap.target') === null && /Autopilot off/.test(J('__toasts[0]')), J('__toasts'));

console.log('X while the autopilot is flying clear of a mass on a long leg (the leg that would hand the cleared target back to cruise)');
const far = J(`(() => { const s = __space(${station.x + 900}, ${station.y}); s.cr.list = navpanelRows(cruiseKnown(s), navpanelJumps(s), null); const r = s.cr.list.filter(r => r.kind === 'body').sort((a, b) => b.dist - a.dist)[0]; return { id: r.id, dist: r.dist, inMass: !!autopilotMass(s) }; })()`);
check('a far body exists and the ship starts inside the station\'s mass limit', far.dist - 400 > J('AUTO.cruiseLeg') && far.inMass === true, JSON.stringify(far));
g.run(`__world(); __space(${station.x + 900}, ${station.y}); __cur.cr.list = navpanelRows(cruiseKnown(__cur), navpanelJumps(__cur), null)`);
g.run(`navpanelClick(__cur, ${rowOf(far.id)})`);
check('Enter there: the autopilot flies clear of the mass first', J('__cur.ap.on') === true && J('__cur.ap.stage') === 'clear', J('[__cur.ap.on, __cur.ap.stage, __toasts]'));
g.run(`__fly(__cur, 400); __nlist(__cur, ${JSON.stringify(X)})`);
check('X: off, and the destination is gone', J('__cur.ap.on') === false && J('__cur.cr.target') === null);
g.run(`__fly(__cur, 60000)`);
check('and it stays that way: the flight out of the mass does not end in a cruise to the cleared place', J('__cruised') === 0 && J('__cur.cruising') === false && J('__cur.cr.target') === null && J('__cur.ap.on') === false, J('[__cruised, __cur.cruising, __cur.cr.target, __cur.ap.on]'));

console.log('X while the autopilot has the Dock order in the last stage: it stops pressing L');
trip(450); g.run(`__Lpressed = 0; for (let i = 0; i < 400 && __cur.ap.stage !== 'final'; i++) __fly(__cur, 16)`);
check('the dock order reaches its last stage (the autopilot presses the ship\'s own L)', J('__cur.ap.stage') === 'final', J('[__cur.ap.stage, __cur.ap.on]'));
g.run(`__fly(__cur, 100); __Lpressed = 0; __nlist(__cur, ${JSON.stringify(X)}); __fly(__cur, 3000)`);
check('X there: no L is pressed again, the autopilot is off and the dock order is gone', J('__Lpressed') === 0 && J('__cur.ap.on') === false && J('__cur.ap.order') === '' && J('__cur.k.L._justDown') === false, J('[__Lpressed, __cur.ap.on, __cur.ap.order]'));

console.log(failed ? `\n${failed} of ${n} FAILED` : `\npassed: ${n}`);
process.exit(failed ? 1 : 0);
