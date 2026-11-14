// Pirates fair at launch (card space-game-pirate-balance, Troy's playtest 2026-11-13: he died right after undocking).
//   1. for the first 20 s after undocking no pirate engages the ship and none fires, even with one dropped next to you
//   2. after the grace only one pirate at a time comes at you (the first-wave cap), the rest hold off
//   3. the station-side pirates and the timed spawner keep well out of the Halcyon police zone
//   4. a hit gives brief invulnerability: two hits inside 450 ms cost hull once
// The game clock is stepped by hand (cdp.mjs clock/run), so the timings are exact.
import { launch } from './cdp.mjs';
const S = `game.scene.getScene('Space')`;
let fails = 0;
const check = (name, ok, info = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${info ? '  (' + info + ')' : ''}`); if (!ok) fails++; };
const t = await launch('#space');
const go = async ms => { for (let left = ms; left > 0; left -= 500) await t.run(Math.min(500, left)); }; // half-second slices: a loaded Mac renders slowly
try {
  await t.waitFor('window.game && game.scene.isActive("Space")', 15000, 'Space scene');
  await t.clock();
  await t.run(100);
  // playtest 2 found the grace never started on the first launch of a session: the scene clock is 0 in create(), so launchAt was 0
  check('launchAt is set from the first frame, not from create (it is not 0)', (await t.ev(`${S}.launchAt`)) > 0 && Math.abs((await t.ev(`${S}.time.now - ${S}.launchAt`))) < 5000, 'launchAt ' + await t.ev(`${S}.launchAt`) + ' now ' + await t.ev(`${S}.time.now`));
  // the scene was created in real time before the stepped clock took over (seconds, on a busy Mac): restart the grace now
  await t.ev(`(() => { const s = ${S}; s.launchAt = s.time.now; s.graceOver = false; return 1; })()`);
  const hull0 = await t.ev('G.hull');

  console.log('1. launch grace');
  const near = await t.ev(`(() => { const s = ${S}; let nd = 1e9; s.enemies.getChildren().forEach(d => nd = Math.min(nd, Phaser.Math.Distance.Between(d.x, d.y, s.station.x, s.station.y))); return Math.round(nd); })()`);
  check('every pirate starts over 2000 px from Halcyon (police zone is 900, engage range 1000)', near > 2000, 'nearest ' + near);
  // park the ship in empty space (the police would shoot a pirate next to Halcyon) and drop a raider right beside it:
  // it must sit still and not fire for the whole grace
  await t.ev(`(() => { const s = ${S}; s.ship.setPosition(1500, 6500); s.ship.body.setVelocity(0, 0); const r = spawnPirate(s, 1800, 6500, 'raider'); r.rotation = Math.PI; r.nextShot = 0; return 1; })()`);
  await go(19000);
  const grace = await t.ev(`(() => { const s = ${S}; return { calm: s.enemies.getChildren().every(d => !d.active || d.calm === true || Phaser.Math.Distance.Between(d.x, d.y, s.ship.x, s.ship.y) >= d.def.engage), shots: s.eb.countActive(), hull: G.hull, n: s.enemies.countActive(), cap: pirateCap(s, s.time.now) }; })()`);
  check('19 s in: every pirate in engage range is holding off', grace.calm, 'pirates ' + grace.n);
  check('19 s in: no pirate bullet in flight', grace.shots === 0, 'bullets ' + grace.shots);
  check('19 s in: no hull lost', grace.hull === hull0, 'hull ' + grace.hull);
  check('19 s in: the cap is still 0, which keeps the 15 s spawner quiet', grace.cap === 0, 'cap ' + grace.cap);

  console.log('2. first wave: one at a time');
  await t.ev(`(() => { const s = ${S}; for (let i = 0; i < 2; i++) spawnPirate(s, 1200, 6500 + (i ? 200 : -200), 'drone'); return 1; })()`);
  await go(2000); // grace ends at 20 s; three pirates now sit inside engage range
  const wave = await t.ev(`(() => { const s = ${S}; const close = s.enemies.getChildren().filter(d => Phaser.Math.Distance.Between(d.x, d.y, s.ship.x, s.ship.y) < 900); return { close: close.length, engaged: close.filter(d => !d.calm).length, over: s.graceOver }; })()`);
  check('grace is over (toast shown)', wave.over);
  check('three pirates in range, exactly one engaged', wave.close >= 3 && wave.engaged === 1, `close ${wave.close}, engaged ${wave.engaged}`);
  check('the cap is 1 now and 2 after 40 s, then open', await t.ev(`pirateCap(${S}, ${S}.launchAt + 20000 + 1000) === 1 && pirateCap(${S}, ${S}.launchAt + 20000 + 41000) === 2 && pirateCap(${S}, ${S}.launchAt + 20000 + 81000) === Infinity`));

  console.log('3. spawns keep out of the station zone');
  check('spawn distance 1600 is past engage range 1000, keep-out 1800 is past the police zone', await t.ev('SPAWN_DIST > 1000 && SPAWN_KEEP_OUT > 900'));

  console.log('4. hit invulnerability');
  await t.ev(`(() => { const s = ${S}; s.enemies.clear(true, true); s.eb.getChildren().forEach(b => b.disableBody(true, true)); G.hull = G.maxHull; s.ironUntil = 0; return 1; })()`);
  await t.ev(`(() => { const s = ${S}; s.hurt(10, s.ship.x + 40, s.ship.y); s.hurt(10, s.ship.x + 40, s.ship.y); return 1; })()`);
  await t.run(200);
  await t.ev(`(() => { const s = ${S}; s.hurt(10, s.ship.x + 40, s.ship.y); return 1; })()`);
  const twice = await t.ev('G.maxHull - G.hull');
  check('three hits inside 450 ms cost hull once', twice === 10, 'lost ' + twice);
  await t.run(500);
  await t.ev(`(() => { const s = ${S}; s.hurt(10, s.ship.x + 40, s.ship.y); return 1; })()`);
  check('a hit after the window lands again', (await t.ev('G.maxHull - G.hull')) === 20, 'lost ' + await t.ev('G.maxHull - G.hull'));
  check('shield flash lasts as long as the invulnerability', await t.ev('SHIPS.shieldMs === HIT_IRON'));
  await t.shot('launch-grace');
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally {
  await t.close();
}
console.log(fails ? `tests/launch.mjs: ${fails} FAILED` : 'tests/launch.mjs: PASS');
process.exit(fails ? 1 : 0);
