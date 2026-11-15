// smoke: the pull-out: the roll, the collapse, deep space, the way back into the tunnel, dying, a nest's entry pirates
// The pull-out (card space-game-u-e2-pullout, src/pullout.js, docs/UNIVERSE.md 5.2): some jumps are cut short. The tunnel flickers, an alarm sounds, the rings
// collapse at 40 to 70% of the way, and the ship is dropped into deep space with three to five pirates. Win and the tunnel resumes for the time that was
// left; lose and the insurance flow wakes you at the last station. The fuel was spent when the jump went.
// Run: node tests/pullout.mjs. The game clock is stepped by hand (16.67 ms a frame, cdp.mjs clock()), so every time below is exact whatever the load.
// Checks: the chance (2% + 1% x the higher danger), where it falls (40 to 70%), the ambush size by danger, deep space as a system (empty, dark, no timed
// pirates), the whole trip through a forced pull-out (tunnel, flicker, collapse, hand-over, pirates, the drive is spent, no dock, no cruise, no ranger,
// clear, the tunnel resumes with the time that was left, the arrival), dying in deep space and in Kestrel, the #pullout demo, a nest's entry pirates.
// Saves tests/out/pullout-*.png.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')", HY = "game.scene.getScene('Hyper')", GL = "game.scene.getScene('Galaxy')";
let bad = 0, n = 0;
const check = (name, ok, extra = '') => { n++; console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500); await t.ev('(() => { G.guideDone = true; G.endingSeen = true; return 1; })()');
  await t.clock();
  await t.ev(`(() => { const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0); performance.now = () => __t; return 1; })()`); // tweens and the fuel ranger time themselves on the stepped clock
  await t.ev(`(() => { window.__toasts = []; const orig = toast; toast = (s, msg, c) => { window.__toasts.push(msg); return orig(s, msg, c); }; })()`);
  const E = x => t.ev(/;/.test(x) && !/^\(\(\) =>/.test(x) ? `(() => { ${x}; return 1; })()` : x);
  const tick = async f => { for (let left = f; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); };
  const secs = s => tick(Math.round(s * 1000 / 16.67));
  const said = () => E('JSON.stringify(window.__toasts)').then(JSON.parse);
  const clearSaid = () => E('window.__toasts = []');
  const key = (code, extra = '') => E(`window.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', ${extra} }))`);
  const until = async (cond, frames, what) => { for (let i = 0; i < frames; i += 20) { if (await E(cond)) return true; await tick(20); } check('waited for ' + what, false); return false; };
  const snap = async name => { await t.shot(name); return t.shot(name); };
  const untilNew = async cond => { for (let i = 0; i < 1500 && !(await E(cond)); i += 2) await E('tick(2)'); }; // a hand-over starts the next Space UNDER the flash: look at it the moment it starts, not when the tunnel scene is gone
  // the dice: the next values come from the list, then the real ones
  const dice = (...v) => E(`(() => { const q = ${JSON.stringify(v)}, real = Math.random; PULL.rnd = () => q.length ? q.shift() : real(); return 1; })()`);
  const park = (x, y) => E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.eb.getChildren().forEach(b => b.disableBody(true, true));
    if (s.jmp) jumpCancel(s); if (s.cr.active) cruiseEnd(s, 'quiet'); s.cr.target = null; s.ship.setPosition(${x}, ${y}); s.ship.setVelocity(0, 0); s.ship.rotation = 0; s.ship.body.setAcceleration(0, 0);
    s.cameras.main.centerOn(${x}, ${y}); G.hull = G.maxHull; s.ironUntil = 0; s.launchAt = -1e6; window.__toasts = []; return 1; })()`);
  const killAll = () => E(`(() => { const s = ${SP}; s.enemies.getChildren().filter(e => e.active).forEach(e => s.killDrone(e)); return 1; })()`);
  const startSpace = d => E(`(() => { game.scene.stop('Space'); game.scene.start('Space', ${JSON.stringify(d)}); return 1; })()`);

  // ---- 0. the numbers ----
  console.log('the roll: 2% + 1% x the higher danger, at 40 to 70% of the tunnel; the ambush is 3 to 5 pirates by danger');
  const nums = JSON.parse(await E(`JSON.stringify({
    base: PULL.base, per: PULL.perDanger,
    q: [pullChance('halcyon', 'kestrel'), pullChance('kestrel', 'halcyon'), pullChance('nowhere', 'kestrel')],
    sizes: [1, 2, 3, 4, 5].map(pullPirates), at: PULL.at })`));
  check('the chance between Halcyon and Kestrel (danger 1 each) is 3%, either way, and a system the game lacks counts as danger 1', nums.q.every(v => Math.abs(v - 0.03) < 1e-9), JSON.stringify(nums.q));
  check('a system of danger 5 makes it 7% (the design\'s 2 to 7%)', await E(`(() => { SYSTEMS.t5 = { danger: 5 }; const v = pullChance('halcyon', 't5'); delete SYSTEMS.t5; return Math.abs(v - 0.07) < 1e-9; })()`));
  check('the ambush is 3 pirates at danger 1 and 2, 4 at 3 and 4, 5 at 5', nums.sizes.join() === '3,3,4,4,5', nums.sizes.join());
  await dice(0.5);
  check('a roll of 0.5 is a clean tunnel: null', (await E(`JSON.stringify(pullRoll('halcyon', 'kestrel'))`)) === 'null');
  await dice(0.029, 0);
  check('a roll under 3% fires, and a second 0 puts it at the early end of the window: 40%', await E(`(() => { const r = pullRoll('halcyon', 'kestrel'); return r && Math.abs(r.at - 0.4) < 1e-9 && r.danger === 1; })()`));
  await dice(0.01, 0.9999);
  check('a second roll near 1 puts it at the late end: just under 70%', await E(`(() => { const r = pullRoll('halcyon', 'kestrel'); return r && r.at > 0.699 && r.at <= 0.7; })()`));
  await dice(0.03);
  check('exactly 3% does not fire (the roll must be under the chance)', (await E(`JSON.stringify(pullRoll('halcyon', 'kestrel'))`)) === 'null');
  const stat = JSON.parse(await E(`(() => { let s = 1234567; PULL.rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; let hit = 0, lo = 1, hi = 0; for (let i = 0; i < 40000; i++) { const r = pullRoll('halcyon', 'kestrel'); if (r) { hit++; lo = Math.min(lo, r.at); hi = Math.max(hi, r.at); } } PULL.rnd = Math.random; return JSON.stringify({ hit, lo, hi }); })()`));
  check('40000 rolls: about 3% fire (1200 +- 150), and every one of them falls between 40 and 70%', stat.hit > 1050 && stat.hit < 1350 && stat.lo >= 0.4 && stat.hi <= 0.7, JSON.stringify(stat));
  await dice();

  // ---- 1. deep space as a system ----
  console.log('deep space: an empty system definition while G.deep is set, and never otherwise');
  check('with no pull-out the current system is the real one', await E(`sysDef().id === 'halcyon' && sysBodies().length > 10`));
  const ds = JSON.parse(await E(`(() => { G.deep = { danger: 3 }; const d = sysDef(), table = pirateTable(); const r = { id: d.id, name: d.name, size: d.size, bodies: d.bodies.length, danger: d.danger, traffic: d.traffic, max: table.max, st: sysBody('station'), pl: sysBody('planet'), belts: sysBodies('belt').length, real: sysDef('halcyon').id }; G.deep = null; return JSON.stringify(r); })()`));
  check('deep space: "Deep space", 16000 px, no bodies at all (no station, planet or belt), no traffic, the pull-out\'s danger',
    ds.id === 'deep' && ds.name === 'Deep space' && ds.size === 16000 && ds.bodies === 0 && ds.st === null && ds.pl === null && ds.belts === 0 && ds.traffic === 0 && ds.danger === 3, JSON.stringify(ds));
  check('its timed spawner is switched off (max 0): the only pirates are the ones placed by hand', ds.max === 0);
  check('asking for a system by its id still gets the real one while deep space is up', ds.real === 'halcyon');
  check('G.deep is clear again', await E(`G.deep === null`));
  check('dockSystem finds the system a station is in', await E(`dockSystem('halcyon-station') === 'halcyon' && dockSystem('nowhere-station') === null`));

  // ---- 2. a forced pull-out, jump to Kestrel ----
  console.log('the trip: charge, burn, tunnel, flicker, alarm, collapse, deep space, pirates');
  await park(15000, 15000);
  await E(`(() => { G.credits = 500; activeShip().fuel = 40; G.mission = 'none'; G.missionId = null; G.jumps = 0; G.known = ['halcyon', 'kestrel']; G.hull = G.maxHull; return 1; })()`);
  await dice(0.01, 0.5); // fires, and at 55%
  await key('KeyG'); await tick(15);
  await E(`${GL}.sel = 'kestrel'; ${GL}.go()`); await tick(2);
  check('Enter on Kestrel starts the charge as always', await E(`!!${SP}.jmp && ${SP}.jmp.to === 'kestrel'`));
  await secs(4.2);
  check('at the end of the charge the fuel is burned (33.7) and the roll has been taken', await E(`activeShip().fuel === 33.7`));
  await until(`game.scene.isActive('Hyper')`, 120, 'the Hyper scene');
  const hy = JSON.parse(await E(`JSON.stringify({ at: +${HY}.pull.at.toFixed(3), danger: ${HY}.pull.danger, dur: +${HY}.dur.toFixed(2), pulled: ${HY}.pulled, frac0: ${HY}.frac0 })`));
  check('the tunnel was told: pulled out at 55%, danger 1, 10 s long, not yet', hy.at === 0.55 && hy.danger === 1 && hy.dur > 9.5 && hy.dur < 10.5 && hy.pulled === false && hy.frac0 === 0, JSON.stringify(hy));
  await secs(4.8);
  check('at 48% it is still running clean', await E(`!${HY}.pulled`) );
  await secs(1.0);
  check('past 55% the pull-out has begun: the tunnel flickers', await E(`${HY}.pulled === true && ${HY}.pullT > 0`), await E(`[${HY}.pulled, ${HY}.t, ${HY}.dur]`));
  await secs(0.3);
  check('its colour has gone red and the alarm text is up', await E(`${HY}.tint !== hyperTint(${HY}.ly) && ${HY}.h.t.alarm && ${HY}.h.t.alarm.text.indexOf('PULLED OUT') > 0`));
  await snap('pullout-flicker');
  await secs(1.0);
  check('then the rings collapse (0 to 1 over 0.9 s) and the hum is gone', await E(`${HY}.coll > 0 && ${HY}.hum === null`), await E(`[${HY}.coll, !!${HY}.hum]`));
  await snap('pullout-collapse');
  await untilNew(`game.scene.isActive('Space') && !!G.deep`);
  await tick(4);
  check('deep space starts UNDER a red flash: the tunnel scene is still up and flashing with its tunnel hidden, and Space has no black fade-in of its own', await E(`game.scene.isActive('Hyper') && ${HY}.handed === true && ${HY}.cameras.main.flashEffect.isRunning && ${HY}.children.list.every(o => !o.visible) && ${SP}.seamless === true && !${SP}.cameras.main.fadeEffect.isRunning`), await E(`JSON.stringify([game.scene.isActive('Hyper'), ${HY}.handed, ${HY}.cameras.main.flashEffect.isRunning, ${SP}.seamless, ${SP}.cameras.main.fadeEffect.isRunning])`));
  const dp = JSON.parse(await E(`JSON.stringify({ sys: G.system, deep: !!G.deep, name: sysDef().name, jumps: G.jumps, known: G.known, fuel: activeShip().fuel, ws: ${SP}.WS, left: +G.deep.left.toFixed(2), at: G.deep.at, dest: G.deep.dest,
    x: Math.round(${SP}.ship.x), y: Math.round(${SP}.ship.y), pirates: ${SP}.enemies.countActive(), amb: ${SP}.enemies.getChildren().every(e => e.ambush), st: ${SP}.station.nowhere === true, pl: ${SP}.planet.nowhere === true })`));
  check('deep space: still Halcyon on the books (G.system), the system is "Deep space", no jump counted, the known list is what the open map charted and no more (Kestrel is not added), the fuel stays burned', dp.sys === 'halcyon' && dp.deep && dp.name === 'Deep space' && dp.jumps === 0 && dp.known.join() === 'halcyon,kestrel,brass,hollow' && dp.fuel === 33.7, JSON.stringify(dp));
  check('a 16000 px world with the ship in the middle, no station and no planet', dp.ws === 16000 && Math.abs(dp.x - 8000) < 100 && Math.abs(dp.y - 8000) < 100 && dp.st && dp.pl, JSON.stringify([dp.ws, dp.x, dp.y]));
  check('three pirates (danger 1), every one engaged from the start (ambush)', dp.pirates === 3 && dp.amb, JSON.stringify([dp.pirates, dp.amb]));
  check('the record keeps the time left of the tunnel: 45% of 10 s, about 4.5 s, from 55%, bound for KESTREL', dp.left > 4.3 && dp.left < 4.7 && dp.at === 0.55 && dp.dest === 'KESTREL', JSON.stringify([dp.left, dp.at, dp.dest]));
  check('they are 1100 to 1500 px away (plus a little for the arc), all of them ahead', await E(`${SP}.enemies.getChildren().every(e => { const d = Math.hypot(e.x - ${SP}.ship.x, e.y - ${SP}.ship.y); return d > 1000 && d < 1650; })`));
  check('a message says they are here', (await said()).some(m => /Pulled out of hyperspace: 3 pirates/.test(m)), JSON.stringify(await said()));
  check('the dark tint is up over the stars, and the sun, giant and moon are not drawn', await E(`${SP}.children.list.some(o => o.depth === -7 && o.fillColor === 0x14000a) && !${SP}.children.list.some(o => o.depth === -6.5 || o.depth === -6 || o.depth === -5.5)`));
  check('no launch lock and no patrol-cover notice in deep space', await E(`${SP}.lockUntil <= ${SP}.time.now && ${SP}.graceOver === true`));
  await snap('pullout-deep');
  await until(`!game.scene.isActive('Hyper')`, 120, 'the red flash to end');
  check('then the tunnel scene is gone and deep space runs on', await E(`!game.scene.isActive('Hyper') && game.scene.isActive('Space') && !!G.deep`));

  console.log('deep space has no way out but through the pirates');
  await E(`G.hull = 1e6`); // the three are shooting at a ship that cannot die in this part of the test
  await clearSaid();
  await key('KeyG'); await tick(15);
  check('G: no galaxy map, "the jump drive is spent"', await E(`!game.scene.isActive('Galaxy') && !${SP}.jmp`) && (await said()).some(m => /jump drive is spent/.test(m)), JSON.stringify(await said()));
  await E(`${SP}.cr.k.C._justDown = true`); await tick(3);
  check('C: no cruise', await E(`!${SP}.cruising && !${SP}.cr.active`));
  await E(`${SP}.cr.k.N._justDown = true`); await tick(3);
  check('N: no nav list', await E(`!${SP}.cr.navOpen`));
  await E(`(() => { activeShip().fuel = 3; return 1; })()`); await tick(3);
  check('with 3 units in the tank the ranger is not offered (it cannot find you here)', await E(`${SP}.rangerTxt.text`) === '');
  await E(`${SP}.jk.F._justDown = true`); await tick(2);
  check('and F does nothing', await E(`FUELST.rangerAt === 0`));
  check('nothing to dock at or land on: the prompt is empty', await E(`${SP}.prompt.text`) === '');
  check('the timed spawner adds nothing: 12 s later there are still no more than the three', await (async () => { await secs(12); return E(`${SP}.enemies.countActive() <= 3`); })());
  check('no console errors in deep space', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));

  console.log('win: the last pirate down, the tunnel re-forms for the time that was left');
  await E(`(() => { activeShip().fuel = 33.7; return 1; })()`);
  await E(`(() => { const s = ${SP}, list = s.enemies.getChildren().filter(e => e.active); s.killDrone(list[0]); s.killDrone(list[1]); return 1; })()`); await tick(5);
  check('two of three down: no countdown yet', await E(`${SP}.deep.won === false`));
  await clearSaid();
  await E(`(() => { const s = ${SP}, list = s.enemies.getChildren().filter(e => e.active); s.killDrone(list[0]); return 1; })()`); await tick(3);
  check('the third: "Clear", the tunnel re-forms in 4 s', await E(`${SP}.deep.won === true`) && (await said()).some(m => /Clear\. The tunnel re-forms in 4 s/.test(m)), JSON.stringify(await said()));
  await secs(3.5);
  check('3.5 s later it has not gone yet: time to pick up the salvage', await E(`game.scene.isActive('Space') && !game.scene.isActive('Hyper')`));
  await secs(0.8);
  await until(`game.scene.isActive('Hyper')`, 120, 'the tunnel again');
  check('the tunnel re-forms over the paused deep space: no cut, the flight is kept as a picture', await E(`game.scene.isPaused('Space') && ${HY}.under === 'Space' && ${HY}.mix < 1 && !${HY}.cameras.main.fadeEffect.isRunning`), await E(`JSON.stringify([game.scene.isPaused('Space'), ${HY}.under, ${HY}.mix])`));
  const rs = JSON.parse(await E(`JSON.stringify({ dest: ${HY}.dest, dur: +${HY}.dur.toFixed(2), frac0: ${HY}.frac0, pull: ${HY}.pull, fuel: ${HY}.fuel, demo: !!${HY}.d.demo, deep: G.deep })`));
  check('the resumed tunnel: KESTREL again, the 4.5 s that were left, starting at 55%, with no second pull-out, 6.3 units burned', rs.dest === 'KESTREL' && rs.dur > 4.3 && rs.dur < 4.7 && rs.frac0 === 0.55 && rs.pull === null && rs.fuel === 6.3 && rs.demo === false, JSON.stringify(rs));
  check('deep space is gone (G.deep clear) the moment the Space scene let go', rs.deep === null);
  await secs(2);
  check('its progress line starts at 55% and runs to the end (a little over 55% after 2 s of 4.5)', await E(`(() => { const f = Phaser.Math.Clamp(${HY}.frac0 + (1 - ${HY}.frac0) * ${HY}.t / ${HY}.dur, 0, 1); return f > 0.7 && f < 0.85; })()`));
  await snap('pullout-resumed');
  await untilNew(`game.scene.isActive('Space') && G.system === 'kestrel'`);
  await tick(4);
  const arr = JSON.parse(await E(`JSON.stringify({ sys: G.system, jumps: G.jumps, known: G.known, deep: G.deep, ws: ${SP}.WS, x: Math.round(${SP}.ship.x), fuel: activeShip().fuel, pirates: ${SP}.enemies.countActive() })`));
  check('then the ordinary arrival: Kestrel, one jump, known, the west edge of a 36000 px system, the fuel never refunded', arr.sys === 'kestrel' && arr.jumps === 1 && arr.known.includes('kestrel') && arr.deep === null && arr.ws === 36000 && arr.x < 900 && arr.fuel === 33.7, JSON.stringify(arr));
  check('no pirates were left waiting', arr.pirates === 0);
  check('no console errors on the way through', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));

  // ---- 3. losing: the usual insurance flow ----
  console.log('lose: the ship is destroyed in deep space, and you wake at the last station you docked at');
  await E(`(() => { G.credits = 1000; G.system = 'kestrel'; G.lastDock = homeDock(); return 1; })()`); // jumping from Kestrel: the system on the books is Kestrel, the station you docked at is Halcyon's
  await startSpace({ from: 'pullout', deep: { danger: 3, at: 0.5, left: 5, dest: 'HALCYON', ly: 6.3, fuel: 6.3, tank: 40, demo: false, next: 'Space', nextData: { from: 'jump', to: 'halcyon', origin: 'kestrel' } } });
  await until(`game.scene.isActive('Space') && !!G.deep`, 200, 'deep space again'); await tick(4);
  check('danger 3: four pirates', await E(`${SP}.enemies.countActive() === 4`), await E(`${SP}.enemies.countActive()`));
  await E(`(() => { G.hull = G.maxHull; ${SP}.ironUntil = 0; ${SP}.sh.pts = 0; ${SP}.hurt(500, ${SP}.ship.x + 40, ${SP}.ship.y); return 1; })()`); await tick(3);
  check('destroyed: the usual message, 20% of the credits as the fee', await E(`${SP}.dead === true && G.credits === 800`) && (await said()).some(m => /Ship destroyed\. Insurance fee -200 cr/.test(m)), JSON.stringify(await E(`[G.credits, ${SP}.dead]`)) + JSON.stringify(await said()));
  await secs(2.6);
  await until(`game.scene.isActive('Station')`, 300, 'the Station scene');
  check('you wake in the Halcyon station, and the system on the books is Halcyon again (it was Kestrel)', await E(`G.system === 'halcyon' && G.deep === null && game.scene.isActive('Station')`), await E(`[G.system, G.deep]`));
  check('and the next launch is an ordinary one from Halcyon', await E(`(() => { game.scene.stop('Station'); game.scene.start('Space', { from: 'station' }); return 1; })()`) && await until(`game.scene.isActive('Space')`, 200, 'Space') && await E(`${SP}.station.nowhere !== true && ${SP}.WS === 36000`));

  console.log('and dying in plain Kestrel (no pull-out) wakes you at Halcyon too');
  await E(`(() => { G.credits = 1000; return 1; })()`);
  await startSpace({ from: 'jump', to: 'kestrel', origin: 'halcyon' });
  await until(`game.scene.isActive('Space') && G.system === 'kestrel'`, 200, 'Kestrel'); await tick(4);
  await E(`(() => { G.hull = G.maxHull; ${SP}.ironUntil = 0; ${SP}.sh.pts = 0; ${SP}.hurt(500, ${SP}.ship.x + 40, ${SP}.ship.y); return 1; })()`); await tick(3);
  await secs(2.6);
  await until(`game.scene.isActive('Station')`, 300, 'the Station scene');
  check('dead in Kestrel: the station is Halcyon\'s and so is G.system', await E(`G.system === 'halcyon'`), await E(`G.system`));

  // ---- 4. a nest has pirates waiting at the entry point ----
  console.log('nests: pirates waiting where you come out of the tunnel (made up here until the Roost has its data)');
  await E(`(() => { SYSTEMS.testnest = { id: 'testnest', name: 'Test Nest', kind: 'nest', ly: [24, 19], size: 36000, danger: 5, traffic: 0, bodies: [] };
    SYSTEMS.testentry = { id: 'testentry', name: 'Test Entry', kind: 'outpost', ly: [24, 19], size: 36000, danger: 1, traffic: 0, entry: 2, bodies: [] }; G.system = 'halcyon'; return 1; })()`);
  await startSpace({ from: 'jump', to: 'testnest', origin: 'halcyon' });
  await until(`game.scene.isActive('Space') && G.system === 'testnest'`, 200, 'the nest'); await tick(4);
  const ne = JSON.parse(await E(`JSON.stringify({ n: ${SP}.enemies.countActive(), amb: ${SP}.enemies.getChildren().every(e => e.ambush), d: ${SP}.enemies.getChildren().map(e => Math.round(Math.hypot(e.x - ${SP}.ship.x, e.y - ${SP}.ship.y))), max: pirateTable().max })`));
  check('a nest of danger 5: three pirates are waiting, engaged at once, 1000 to 1700 px from the entry point', ne.n === 3 && ne.amb && ne.d.every(v => v > 800 && v < 1800), JSON.stringify(ne));
  check('the nest\'s own timed table is the danger-5 one (12 at most): the waiting ones are extra to it', ne.max === 12);
  await startSpace({ from: 'jump', to: 'testentry', origin: 'halcyon' });
  await until(`game.scene.isActive('Space') && G.system === 'testentry'`, 200, 'the entry system'); await tick(4);
  check('a system with entry: 2 has two waiting', await E(`${SP}.enemies.countActive() === 2`));
  await startSpace({ from: 'jump', to: 'kestrel', origin: 'halcyon' });
  await until(`game.scene.isActive('Space') && G.system === 'kestrel'`, 200, 'Kestrel'); await tick(4);
  check('Kestrel has none waiting, and a station launch never does', await E(`${SP}.enemies.countActive() === 0`));
  await E(`(() => { delete SYSTEMS.testnest; delete SYSTEMS.testentry; G.known = G.known.filter(k => k !== 'testnest' && k !== 'testentry'); G.system = 'halcyon'; return 1; })()`);

  // ---- 5. the demo: #pullout ----
  console.log('the #pullout demo: the same path with a pull at 50%, danger 3, then back to the Title');
  const pd = JSON.parse(await E(`JSON.stringify(pulloutDemo())`));
  check('the demo is a 6.3 ly tunnel with a pull-out at 50% and danger 3', pd.demo === true && pd.pull.at === 0.5 && pd.pull.danger === 3 && pd.ly === 6.3, JSON.stringify(pd));
  await E(`(() => { game.scene.stop('Space'); game.scene.start('Hyper', pulloutDemo()); return 1; })()`);
  await until(`game.scene.isActive('Hyper')`, 100, 'the demo tunnel');
  await secs(6);
  await untilNew(`game.scene.isActive('Space') && !!G.deep`);
  await tick(4);
  check('the demo drops into deep space with four pirates (danger 3)', await E(`!!G.deep && ${SP}.enemies.countActive() === 4 && G.deep.demo === true`));
  await killAll(); await tick(3); await secs(4.5);
  await until(`game.scene.isActive('Hyper')`, 120, 'the demo tunnel again');
  check('clearing them resumes the demo tunnel, flagged as a demo (it will end at the Title)', await E(`${HY}.d.demo === true && ${HY}.frac0 === 0.5 && ${HY}.pull === null`));
  await secs(5.5);
  await until(`game.scene.isActive('Title')`, 300, 'the Title screen');
  check('and the demo ends on the Title, with no game effect on G', await E(`game.scene.isActive('Title') && G.deep === null`));
  check('the flight that was paused under the demo tunnel went with it: nothing is left paused over the Title', await E(`!game.scene.isPaused('Space') && !game.scene.isActive('Space') && !game.scene.isActive('Hyper')`));
  check('no console errors in the demo', t.errors.length === 0, t.errors.join(' | ').slice(0, 400));
} catch (e) { console.error('  FAIL ' + (e && e.stack || e)); bad++; } finally { await t.close(); }

console.log(bad ? `\nPULLOUT FAIL (${bad} of ${n} checks)` : `\nPULLOUT PASS (${n} checks)`);
process.exitCode = bad ? 1 : 0;
