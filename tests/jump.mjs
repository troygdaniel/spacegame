// smoke: the jump: G, the 4 s charge and its cancels, the tunnel, arrival in an empty Kestrel, the fuel ranger
// The jump (card space-game-u-b4-jump, src/jump.js, docs/UNIVERSE.md 2.3 and 3): G opens the galaxy map over the flight, Enter charges for 4 s, the fuel
// goes when the charge completes, the Hyper tunnel plays, and the ship comes out of it in the other system at the edge facing the star it came from.
// Run: node tests/jump.mjs. The game clock is stepped by hand (16.67 ms a frame, cdp.mjs clock()), so every time below is exact whatever the load.
// Checks: the empty Kestrel flies; G opens and closes the map (and reads only, docked); the three ways out of a charge (S, Esc, a hit); the two locks;
// a jump that is out of range or short of fuel never charges; the whole trip (fuel burned at the end of the charge, the tunnel, the entry point,
// the speed, the calm, G.system, G.known, G.jumps) there and back; an escort that is left behind fails; the fuel ranger; the Tab map in an empty system.
// Saves tests/out/jump-*.png.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')", GL = "game.scene.getScene('Galaxy')";
let bad = 0, n = 0;
const check = (name, ok, extra = '') => { n++; console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500); await t.ev('(() => { G.guideDone = true; G.endingSeen = true; return 1; })()');
  // the pull-out roll (src/pullout.js, card u-e2) is 3% a jump and left to chance, so a trip in this test would now and then end in deep space: the dice are loaded to never pull out here (tests/pullout.mjs plays the pull-out)
  await t.ev('(() => { PULL.rnd = () => 0.99; return 1; })()');
  // card u-b5 authored Kestrel (an outpost, two planets, a belt, a beacon: tests/systems.mjs flies it and docks at it). This test is about the jump, and its second half about a system
  // with nothing in it, so Kestrel is emptied here (a copy; the page is closed at the end) and Brass Reach is taken out for the "no route" check below.
  await t.ev('(() => { window.__realKestrel = SYSTEMS.kestrel; SYSTEMS.kestrel = Object.assign({}, SYSTEMS.kestrel, { bodies: [] }); window.__realBrass = SYSTEMS.brass; return 1; })()');
  await t.clock();
  await t.ev(`(() => { const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0); performance.now = () => __t; return 1; })()`); // tweens and the fuel ranger time themselves on the stepped clock
  await t.ev(`(() => { window.__toasts = []; const orig = toast; toast = (s, msg, c) => { window.__toasts.push(msg); return orig(s, msg, c); }; })()`);
  const E = x => t.ev(/;/.test(x) && !/^\(\(\) =>/.test(x) ? `(() => { ${x}; return 1; })()` : x); // t.ev wants one expression: a few statements joined with ; are put in a function
  const tick = async f => { for (let left = f; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); }; // short calls: a busy Mac can take seconds a frame
  const secs = s => tick(Math.round(s * 1000 / 16.67));
  const said = () => E('JSON.stringify(window.__toasts)').then(JSON.parse);
  const clearSaid = () => E('window.__toasts = []');
  const park = (x, y) => E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.eb.getChildren().forEach(b => b.disableBody(true, true));
    if (s.jmp) jumpCancel(s); if (s.cr.active) cruiseEnd(s, 'quiet'); s.cr.target = null; s.ship.setPosition(${x}, ${y}); s.ship.setVelocity(0, 0); s.ship.rotation = 0; s.ship.body.setAcceleration(0, 0);
    s.cameras.main.centerOn(${x}, ${y}); G.hull = G.maxHull; s.ironUntil = 0; s.launchAt = -1e6; window.__toasts = []; return 1; })()`);
  const key = (code, extra = '') => E(`window.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', ${extra} }))`);
  const until = async (cond, frames, what) => { for (let i = 0; i < frames; i += 20) { if (await E(cond)) return true; await tick(20); } check('waited for ' + what, false); return false; };
  // the map ignores keys for its first 200 ms (galaxymap.js onKey): open it, step 15 frames (250 ms), then use it
  const gopen = async () => { await key('KeyG'); await tick(15); };
  const gclose = async (code = 'KeyG') => { await key(code); await tick(18); }; // 300 ms: the same keypress must not reopen it (jump.js JUMPST)
  const openMap = async to => { await gopen(); if (to) await E(`${GL}.sel = '${to}'`); };
  const snap = async name => { await t.shot(name); return t.shot(name); }; // a screenshot shows the frame composited at the previous capture: take two, keep the second

  // ---- 0. the empty Kestrel, and what the arrival code says ----
  console.log('the data: Kestrel is a system with nothing in it; the entry point faces the star you came from');
  check('SYSTEMS.kestrel exists: 36000 px, no bodies, on the galaxy map at [25.5, 19]', await E(`SYSTEMS.kestrel && SYSTEMS.kestrel.size === 36000 && SYSTEMS.kestrel.bodies.length === 0 && SYSTEMS.kestrel.ly.join() === '25.5,19'`));
  const pts = JSON.parse(await E(`JSON.stringify({ k: arrivalPoint('kestrel', 'halcyon'), h: arrivalPoint('halcyon', 'kestrel'), none: arrivalPoint('kestrel', null), bad: arrivalPoint('nowhere', 'halcyon') })`));
  check('from Halcyon (west and south of it) you appear at the west edge of Kestrel, heading for the middle', pts.k.x === 500 && pts.k.y > 18000 && Math.abs(pts.k.rot) < 1, JSON.stringify(pts.k));
  check('and back: from Kestrel you appear at the east edge of Halcyon, heading west', pts.h.x === 35500 && pts.h.y < 18000 && Math.abs(Math.abs(pts.h.rot) - Math.PI) < 1, JSON.stringify(pts.h));
  check('no origin, or a system the game does not have: no entry point', pts.none === null && pts.bad === null);
  check('enterSystem refuses a system that has no data and changes nothing', await E(`(() => { const j = G.jumps; const r = enterSystem('nowhere', 'halcyon'); return r === false && G.system === 'halcyon' && G.jumps === j && !G.known.includes('nowhere'); })()`));

  // ---- 1. G opens and closes the galaxy map ----
  console.log('G: the galaxy map over the flight');
  await park(15000, 15000);
  await gopen();
  check('G in space opens the galaxy map and the flight waits underneath', await E(`game.scene.isActive('Galaxy') && game.scene.isPaused('Space')`));
  check('the new game knows Halcyon and Kestrel', (await E('G.known.join()')) === 'halcyon,kestrel');
  check('the map can jump from here: it was handed an onJump', await E(`typeof ${GL}.onJump === 'function'`));
  await snap('jump-map');
  await gclose();
  check('G again closes it, and does not open it again in the same keypress', await E(`!game.scene.isActive('Galaxy') && !game.scene.isPaused('Space') && game.scene.isActive('Space')`));
  await gopen(); await gclose('Escape');
  check('Esc closes it too, and the pause menu stays shut', await E(`!game.scene.isActive('Galaxy') && !game.scene.isActive('Pause') && game.scene.isActive('Space')`), await E(`JSON.stringify([game.scene.isActive('Galaxy'), game.scene.isActive('Pause'), game.scene.isActive('Space'), game.scene.isPaused('Space')])`));

  // ---- 2. the charge, and the three ways out of it ----
  console.log('the charge: a ring for 4 s; S, Esc and a hit cancel it');
  await E(`activeShip().fuel = 40`);
  await openMap('kestrel');
  await E(`${GL}.go()`); await tick(2);
  check('Enter on Kestrel closes the map, gives the flight back and starts the charge', await E(`!game.scene.isActive('Galaxy') && game.scene.isActive('Space') && !!${SP}.jmp && ${SP}.jmp.to === 'kestrel'`));
  const j0 = JSON.parse(await E(`JSON.stringify({ to: ${SP}.jmp.to, ly: +${SP}.jmp.ly.toFixed(2), cost: ${SP}.jmp.cost, name: ${SP}.jmp.name })`));
  check('it knows where, how far and what it costs: Kestrel, 6.26 ly, 6.3 units', j0.to === 'kestrel' && j0.ly === 6.26 && j0.cost === 6.3 && j0.name === 'Kestrel', JSON.stringify(j0));
  await secs(2);
  const mid = JSON.parse(await E(`JSON.stringify({ t: Math.round(${SP}.jmp.t / 100) / 10, fuel: activeShip().fuel, zoom: +${SP}.cameras.main.zoom.toFixed(3), label: ${SP}.jmp.label.text })`));
  check('after 2 s the ring is half full, the camera has crept in, and the fuel is still there', mid.t >= 1.9 && mid.t <= 2.1 && mid.fuel === 40 && mid.zoom > 1.01 && /KESTREL/.test(mid.label), JSON.stringify(mid));
  await snap('jump-charge');
  await E(`${SP}.k.S.isDown = true`); await tick(2); await E(`${SP}.k.S.isDown = false`);
  check('S cancels: no ring, nothing burned, and it says so', await E(`!${SP}.jmp && activeShip().fuel === 40`) && (await said()).some(m => /Jump cancelled: you braked/.test(m)), JSON.stringify(await said()));
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2); await secs(1);
  await key('Escape'); await tick(2);
  check('Esc cancels the charge, and opens no pause menu', await E(`!${SP}.jmp && !game.scene.isActive('Pause') && game.scene.isActive('Space') && activeShip().fuel === 40`), await E(`JSON.stringify([!!${SP}.jmp, game.scene.isActive('Pause'), game.scene.isActive('Space'), activeShip().fuel])`));
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2); await secs(1);
  await E(`${SP}.hurt(5, ${SP}.ship.x + 40, ${SP}.ship.y)`); await tick(1);
  check('a hit cancels it', await E(`!${SP}.jmp && activeShip().fuel === 40`) && (await said()).some(m => /the ship was hit/.test(m)), JSON.stringify(await said()));
  await park(15000, 15000);

  // ---- 3. the locks and the refusals ----
  console.log('locks: too close to a station or planet, a hostile near, out of range, short of fuel');
  await park(4000 + 1500, 4000); await clearSaid();
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2);
  check('1500 px from Halcyon Station: no charge, and the toast says fly clear of it', await E(`!${SP}.jmp`) && (await said()).some(m => /Too close to the mass: fly clear of Halcyon Station/.test(m)), JSON.stringify(await said()));
  await park(15000, 15000);
  await E(`(() => { const s = ${SP}; spawnPirate(s, s.ship.x + 1000, s.ship.y, 'raider'); return 1; })()`);
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2);
  check('a raider 1000 px away: no charge, "Hostiles near"', await E(`!${SP}.jmp`) && (await said()).some(m => /Hostiles near/.test(m)), JSON.stringify(await said()));
  await park(15000, 15000);
  await E(`(() => { const s = ${SP}; spawnPirate(s, s.ship.x + 1700, s.ship.y, 'raider'); return 1; })()`);
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2);
  check('a raider 1700 px away is far enough: the charge starts', await E(`!!${SP}.jmp`));
  await park(15000, 15000);
  await E(`activeShip().fuel = 6`);
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2);
  check('6 units of fuel for a 6.3 unit jump: the map refuses, no charge', await E(`!${SP}.jmp && game.scene.isActive('Galaxy')`), await E(`JSON.stringify([!!${SP}.jmp, game.scene.isActive('Galaxy'), activeShip().fuel])`));
  await gclose();
  await E(`activeShip().fuel = 40; G.known = ['halcyon', 'kestrel', 'ember']`);
  await openMap('ember'); await E(`${GL}.go()`); await tick(2);
  check('Ember is 16 ly away, beyond the Wren\'s 8 ly: no charge', await E(`!${SP}.jmp`));
  await gclose();
  await E(`G.known = ['halcyon', 'kestrel', 'meridian']; activeShip().fuel = 40`);
  await openMap('meridian'); await E(`${GL}.go()`); await tick(2);
  check('Meridian is 9.8 ly away: out of range too', await E(`!${SP}.jmp`));
  await gclose();
  await E(`G.known = ['halcyon', 'kestrel', 'brass']; delete SYSTEMS.brass`); // a system the galaxy map knows (its stub) and the game has no data for
  await openMap('brass'); await E(`${GL}.go()`); await tick(2);
  check('a system that is in range but has no data (Brass Reach, taken out for this check): no charge, and the toast says there is no route', await E(`!${SP}.jmp`) && (await said()).some(m => /No route|not charted/.test(m)), JSON.stringify(await said()));
  await E(`SYSTEMS.brass = window.__realBrass`);
  await E(`G.known = ['halcyon', 'kestrel']`);
  await park(15000, 15000);

  // ---- 4. the whole trip ----
  console.log('the trip: charge, burn, tunnel, arrival in Kestrel');
  await E(`(() => { G.credits = 500; activeShip().fuel = 40; G.mission = 'accepted'; G.missionId = 'escort'; G.jumps = 0; return 1; })()`);
  await openMap('kestrel'); await E(`${GL}.go()`); await tick(2);
  await secs(3.9);
  check('at 3.9 s of 4 the ring is not full: still charging, nothing burned', await E(`!!${SP}.jmp && activeShip().fuel === 40 && game.scene.isActive('Space')`));
  await secs(0.2);
  check('at 4 s the charge completes: the fuel is burned NOW (40 - 6.3 = 33.7), before the tunnel is even up', await E(`!${SP}.jmp && activeShip().fuel === 33.7`), JSON.stringify(await E(`[!!${SP}.jmp, activeShip().fuel]`)));
  await until(`game.scene.isActive('Hyper')`, 120, 'the Hyper scene (the screen fades out first)');
  check('then the Hyper scene starts', await E(`game.scene.isActive('Hyper') && !game.scene.isActive('Space')`));
  const hy = JSON.parse(await E(`JSON.stringify({ dest: game.scene.getScene('Hyper').dest, ly: +game.scene.getScene('Hyper').ly.toFixed(2), fuel: game.scene.getScene('Hyper').fuel, tank: game.scene.getScene('Hyper').tank, dur: +game.scene.getScene('Hyper').dur.toFixed(1), demo: !!game.scene.getScene('Hyper').d.demo, sys: G.system, jumps: G.jumps })`));
  check('the tunnel is told: KESTREL, 6.26 ly, 6.3 units burned of a tank of 40, about 10 s, not the demo', hy.dest === 'KESTREL' && hy.ly === 6.26 && hy.fuel === 6.3 && hy.tank === 40 && hy.dur > 9.5 && hy.dur < 10.5 && hy.demo === false, JSON.stringify(hy));
  check('the system has not changed yet, and no jump is counted until you arrive', hy.sys === 'halcyon' && hy.jumps === 0);
  check('leaving the system lost the escort: the call is failed', (await E('G.mission')) === 'failed');
  await secs(4);
  await snap('jump-tunnel');
  await until(`game.scene.isActive('Space') && !game.scene.isActive('Hyper')`, 1200, 'the Space scene after the tunnel');
  await tick(4);
  const arr = JSON.parse(await E(`JSON.stringify({ sys: G.system, known: G.known, jumps: G.jumps, x: Math.round(${SP}.ship.x), y: Math.round(${SP}.ship.y), v: Math.round(${SP}.ship.body.speed), rot: +${SP}.ship.rotation.toFixed(2), ws: ${SP}.WS, calm: ${SP}.calmUntil, arrival: G.arrival })`));
  check('G.system is Kestrel, it is known, one jump is counted, the arrival record is used up', arr.sys === 'kestrel' && arr.known.includes('kestrel') && arr.jumps === 1 && arr.arrival === null, JSON.stringify(arr));
  check('the ship is at the west edge of the 36000 px system, a little over 500 px in', arr.ws === 36000 && arr.x >= 500 && arr.x < 900 && arr.y > 25000, JSON.stringify([arr.x, arr.y]));
  check('it came out flying toward the middle at about 500 px/s', arr.v > 380 && arr.v < 520 && arr.rot < 0 && arr.rot > -1, JSON.stringify([arr.v, arr.rot]));
  check('the pirates are held off: a calm of 3 s, then the first wave ramps as usual', arr.calm > 0 && await E(`pirateCap(${SP}, ${SP}.time.now) === 0`));
  check('no console errors so far (an empty system is flown by the same scene)', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));
  await snap('jump-kestrel');
  await secs(3.5);
  check('3 s later the cap is 1 (the first wave) and nothing has spawned out of the calm', await E(`pirateCap(${SP}, ${SP}.time.now) === 1`));

  // ---- 5. in the empty system ----
  console.log('Kestrel: nothing to dock at or land on, the map and the HUD cope, the ranger comes');
  check('no station, no planet: the scene keeps stand-ins far outside the world', await E(`${SP}.station.nowhere === true && ${SP}.planet.nowhere === true`));
  check('there is nothing to point at: the objective is null', await E(`missionTarget(${SP}) === null`));
  await key('Tab'); await tick(4);
  check('the Tab sector map opens in an empty system, with the Galaxy button', await E(`game.scene.isActive('Overlay') && game.scene.getScene('Overlay').galaxyBtn.visible`));
  await snap('jump-kestrel-map');
  await key('Tab'); await tick(4);
  check('and closes again', await E(`!game.scene.isActive('Overlay') && game.scene.isActive('Space')`));
  check('no console errors with the map open', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));
  // the ranger: Kestrel has no pump
  await park(18000, 18000);
  await E(`(() => { G.credits = 500; activeShip().fuel = 4; return 1; })()`); await tick(3);
  check('with 4 units and no pump the screen offers the ranger: F, 10 units, 240 cr, 45 s', await E(`${SP}.rangerTxt.text`) === 'F  CALL THE FUEL RANGER  (10 UNITS, 240 CR, 45 S)', await E(`${SP}.rangerTxt.text`));
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  check('F calls it: 45 s away', await E(`FUELST.rangerAt > 0 && /ARRIVES IN 4[45] S/.test(${SP}.rangerTxt.text)`), await E(`${SP}.rangerTxt.text`));
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  check('F again says it is already on the way', (await said()).some(m => /already on the way/.test(m)));
  await secs(44); check('44 s later it has not come', await E(`activeShip().fuel === 4`));
  await secs(1.5);
  check('at 45 s it comes: +10 units (14), -240 cr (260), and the line goes', await E(`activeShip().fuel === 14 && G.credits === 260 && ${SP}.rangerTxt.text === ''`), await E(`[activeShip().fuel, G.credits, ${SP}.rangerTxt.text]`));
  check('a message said so', (await said()).some(m => /fuel ranger is here: \+10 units, -240 cr/.test(m)), JSON.stringify(await said()));
  await E(`activeShip().fuel = 8`); await tick(2);
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  check('with 8 units left the ranger is still allowed (under 10), with 40 it would not be', await E(`FUELST.rangerAt > 0`));
  await E(`FUELST.rangerAt = 0; activeShip().fuel = 40`); await tick(2);
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  check('a full tank: "you still hold 40 units", no call', await E(`FUELST.rangerAt === 0`) && (await said()).some(m => /still hold 40 units/.test(m)), JSON.stringify(await said()));

  // a heavy ship (playtest 3): a Bastion burns 2 units a ly, so Kestrel to Halcyon costs 12.5 and the ranger must bring that, not 10
  await E(`FUELST.rangerAt = 0; activeShip().model = 'bastion'; activeShip().fuel = 0; G.credits = 500`); await tick(3);
  check('a Bastion with an empty tank is offered 12.5 units for 300 cr, not 10', await E(`${SP}.rangerTxt.text`) === 'F  CALL THE FUEL RANGER  (12.5 UNITS, 300 CR, 45 S)', await E(`${SP}.rangerTxt.text`));
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  await secs(46);
  check('at 45 s it comes: +12.5 units, -300 cr, and the line goes', await E(`activeShip().fuel === 12.5 && G.credits === 200 && ${SP}.rangerTxt.text === ''`), await E(`[activeShip().fuel, G.credits, ${SP}.rangerTxt.text]`));
  check('a message said so', (await said()).some(m => /fuel ranger is here: \+12\.5 units, -300 cr/.test(m)), JSON.stringify(await said()));
  check('the Bastion can now jump home: jumpCheck Kestrel to Halcyon is ok at 12.5', await E(`(() => { const j = jumpCheck('kestrel', 'halcyon'); return j.ok && j.cost === 12.5; })()`));
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  check('F again does not call a second ranger: it holds all the way home', await E(`FUELST.rangerAt === 0`));
  await E(`activeShip().model = 'wren'; activeShip().fuel = 40; G.credits = 260`); await tick(2);

  // ---- 6. and back ----
  console.log('the way back: Halcyon, at the east edge, with a second jump counted');
  await park(18000, 18000);
  await E(`(() => { activeShip().fuel = 40; G.mission = 'none'; G.missionId = null; return 1; })()`);
  await openMap('halcyon'); await E(`${GL}.go()`); await tick(2);
  check('G in Kestrel offers Halcyon, 6.3 ly away', await E(`!!${SP}.jmp && ${SP}.jmp.to === 'halcyon'`));
  await secs(4.2);
  check('the fuel is burned at the end of the charge here too', await E(`activeShip().fuel === 33.7`));
  await until(`game.scene.isActive('Hyper')`, 120, 'the Hyper scene');
  await until(`game.scene.isActive('Space') && !game.scene.isActive('Hyper')`, 1200, 'the Space scene after the tunnel');
  await tick(4);
  const back = JSON.parse(await E(`JSON.stringify({ sys: G.system, jumps: G.jumps, x: Math.round(${SP}.ship.x), y: Math.round(${SP}.ship.y), ws: ${SP}.WS, drones: ${SP}.enemies.countActive(), st: !!${SP}.station.nowhere })`));
  check('back in Halcyon: jump 2, the east edge, the station and the planet are real again', back.sys === 'halcyon' && back.jumps === 2 && back.x > 35000 && back.ws === 36000 && back.st === false, JSON.stringify(back));
  check('Halcyon\'s own pirates are where they always were, none near the arrival point 30000 px away', await E(`${SP}.enemies.countActive() >= 9 && ${SP}.enemies.getChildren().every(e => Math.hypot(e.x - ${SP}.ship.x, e.y - ${SP}.ship.y) > 3000)`), await E(`${SP}.enemies.countActive()`));
  check('no console errors on the way back', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));

  // ---- 7. docked: read only ----
  console.log('docked: the map reads, it does not jump');
  await E(`(() => { game.scene.stop('Space'); game.scene.start('Station', { arrive: false }); return 1; })()`);
  await until(`game.scene.isActive('Station')`, 300, 'the Station scene'); await tick(10);
  await gopen();
  check('G in the station opens the map', await E(`game.scene.isActive('Galaxy') && game.scene.isPaused('Station')`));
  check('with no onJump: Enter has nothing to start, and the card says to launch first', await E(`${GL}.onJump === null || ${GL}.onJump === undefined`));
  await E(`${GL}.sel = 'kestrel'; ${GL}.go()`); await tick(3);
  check('Enter in the station map jumps nowhere', await E(`game.scene.isActive('Galaxy') && !game.scene.isActive('Hyper')`));
  await snap('jump-map-docked');
  await gclose();
  check('G closes it and the station is running again', await E(`!game.scene.isActive('Galaxy') && game.scene.isActive('Station') && !game.scene.isPaused('Station')`));
  check('no console errors in the station', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));
} catch (e) { console.error('  FAIL ' + (e && e.stack || e)); bad++; } finally { await t.close(); }

console.log(bad ? `\nJUMP FAIL (${bad} of ${n} checks)` : `\nJUMP PASS (${n} checks)`);
process.exitCode = bad ? 1 : 0;
