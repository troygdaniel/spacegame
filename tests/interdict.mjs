// smoke: interdiction in cruise (forced roll, the gates, the cooldown) and the pirate tables per system
// Interdiction in cruise (docs/UNIVERSE.md 5.1) and the pirate tables per system (5.3). Run: node tests/interdict.mjs
// The roll is forced with CRUISE.rnd (src/cruise.js) and the game clock is stepped by hand, so the checks are exact: a cruising second rolls
// 0.004 x danger; it never happens within 4000 px of a station, twice within 90 s of flying, or before two jumps; when it fires cruise
// drops to 150 px/s, the INTERDICTED banner and siren come up and two or three pirates appear 900 px ahead. Saves tests/out/interdict-*.png.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')";
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500); await t.ev('G.guideDone = true');
  await t.clock();
  await t.ev(`(() => { window.__toasts = []; const orig = toast; toast = (s, msg, c) => { window.__toasts.push(msg); return orig(s, msg, c); }; })()`);
  const E = x => t.ev(x);
  const S = code => E(`(() => { ${code} })()`); // several statements
  const tick = async n => { for (let left = n; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); };
  const said = () => E('JSON.stringify(window.__toasts)').then(JSON.parse);
  const park = (x, y) => E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.eb.getChildren().forEach(b => b.disableBody(true, true));
    if (s.cr.active) cruiseEnd(s, 'quiet'); s.cr.target = null; s.ship.setPosition(sysAt(${x}), sysAt(${y})); // in the units the data is written in (src/data_systems.js SYSTEM_SCALE)
    s.ship.setVelocity(0, 0); s.ship.rotation = 0; s.ship.body.setAcceleration(0, 0);
    s.cameras.main.centerOn(${x}, ${y}); (s.toasts || []).forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); s.toasts = []; window.__toasts = []; G.hull = G.maxHull; s.ironUntil = 0; })()`);
  const go = name => E(`(() => { const s = ${SP}; cruisePick(s, cruiseKnown(s).find(b => b.name === '${name}')); cruiseEngage(s); return s.cruising; })()`);

  // ---- the pirate tables ----
  const tab = JSON.parse(await E(`JSON.stringify({ halcyon: pirateTable(SYSTEMS.halcyon), byDanger: [1, 2, 3, 4, 5].map(d => pirateTable({ danger: d })) })`));
  check('Halcyon keeps what it always had: 8 pirates, one every 15 s, weights .25 raider .35 drone .4 gunship', tab.halcyon.max === 8 && tab.halcyon.every === 15000 && tab.halcyon.weights.raider === 0.25 && tab.halcyon.weights.drone === 0.35 && tab.halcyon.weights.gunship === 0.4, JSON.stringify(tab.halcyon));
  check('the table from danger 1 to 5: 3, 5, 8, 10, 12 pirates', tab.byDanger.map(x => x.max).join() === '3,5,8,10,12', tab.byDanger.map(x => x.max).join());
  check('the spawn interval falls from 15 s to 7 s', tab.byDanger.map(x => x.every / 1000).join() === '15,13,11,9,7');
  check('every table\'s weights add up to 1 and gunships grow with danger', tab.byDanger.every(x => Math.abs(x.weights.raider + x.weights.drone + x.weights.gunship - 1) < 1e-9) && tab.byDanger.every((x, i) => !i || x.weights.gunship > tab.byDanger[i - 1].weights.gunship));
  check('a system can set its own table in data (pirates: { max, every, weights })', await E(`pirateTable({ danger: 3, pirates: { max: 20 } }).max === 20 && pirateTable({ danger: 3, pirates: { max: 20 } }).every === 11000`));
  check('pickPirateType follows the weights: gunship, then raider, then drone', await E(`(() => { const w = pirateTable(SYSTEMS.halcyon).weights; return [pickPirateType(w, 0.1), pickPirateType(w, 0.5), pickPirateType(w, 0.9)].join() === 'gunship,raider,drone'; })()`));
  check('the timed spawner uses the table (a 15 s repeating timer on the Space clock)', await E(`${SP}.time._active.some(e => e.loop && e.delay === pirateTable().every)`));

  // ---- the roll and its gates ----
  check('a cruising second at danger 3 rolls 0.012', await E('Math.abs(cruiseInterdictChance(3, 1000) - 0.012) < 1e-9'));
  const leg = await E(`(() => { const p = cruiseInterdictChance(3, 16.67); return 1 - Math.pow(1 - p, Math.round(6.5 / 0.01667)); })()`);
  check('a 6.5 s leg at danger 3 is interdicted about 8% of the time', leg > 0.06 && leg < 0.09, (leg * 100).toFixed(1) + '%');
  await park(9000, 9000); await E('G.interdictCool = 0');
  await E('G.jumps = 0'); const calm0 = await E(`cruiseInterdictOk(${SP})`);
  await E('G.jumps = 1'); const calm1 = await E(`cruiseInterdictOk(${SP})`);
  await E('G.jumps = 2'); const calm2 = await E(`cruiseInterdictOk(${SP})`);
  check('never in the first two jumps of a game: not at 0 or 1 jumps, yes at 2', !calm0 && !calm1 && calm2);
  await E('G.interdictCool = 30'); const cool = await E(`cruiseInterdictOk(${SP})`); await E('G.interdictCool = 0');
  check('not while the cooldown runs', !cool);
  await E(`${SP}.ship.setPosition(${SP}.station.x + 3900, ${SP}.station.y)`); const near = await E(`cruiseInterdictOk(${SP})`);
  await E(`${SP}.ship.setPosition(${SP}.station.x + 4100, ${SP}.station.y)`); const far = await E(`cruiseInterdictOk(${SP})`);
  check('never within 4000 px of a station (3900 no, 4100 yes)', !near && far);
  await E('G.interdictCool = 90'); await tick(60); const left = await E('G.interdictCool');
  check('the cooldown counts down while you fly (60 frames = 1 s)', left > 88.9 && left < 89.1, left.toFixed(2));
  await E('G.interdictCool = 0');

  // ---- no roll, no interdiction ----
  await park(9000, 9000); await S('G.jumps = 2; G.interdictCool = 0; CRUISE.rnd = () => 0.999');
  check('cruise starts', await go('Kepler-4c')); await tick(90);
  check('with a roll that never hits, cruise is not interrupted', await E(`${SP}.cruising`));

  // ---- a forced roll ----
  await park(9000, 9000); await S('G.jumps = 2; G.interdictCool = 0; CRUISE.rnd = () => 0.999');
  check('cruise starts', await go('Kepler-4c')); await tick(60);
  const v0 = await E(`Math.round(${SP}.ship.body.speed)`);
  await E('CRUISE.rnd = () => 0'); await tick(2); // the roll falls: the next cruising frame is interdicted
  const o = JSON.parse(await E(`(() => { const s = ${SP}, sh = s.ship, e = s.enemies.getChildren().filter(d => d.active), hx = Math.cos(sh.rotation), hy = Math.sin(sh.rotation);
    return JSON.stringify({ cruising: s.cruising, v: Math.round(sh.body.speed), n: e.length, ambush: e.every(d => d.ambush), calm: e.map(d => d.calm), types: e.map(d => d.def.key),
      dist: e.map(d => Math.round(Math.hypot(d.x - sh.x, d.y - sh.y))), ahead: e.map(d => +(((d.x - sh.x) * hx + (d.y - sh.y) * hy) / Math.hypot(d.x - sh.x, d.y - sh.y)).toFixed(2)),
      cool: G.interdictCool, until: s._hud.interdictUntil - s.time.now, warn: (s.cr.warnUntil || 0) - s.time.now }); })()`));
  check('it was going fast before: ' + v0 + ' px/s', v0 > 3000);
  check('interdiction: cruise is over and the ship is at 150 px/s or less', !o.cruising && o.v <= 150, 'v ' + o.v);
  check('two or three pirates appear', o.n >= 2 && o.n <= 3, String(o.n));
  check('they appear about 900 px ahead (a line across your path) and are in front of you', o.dist.every(d => d > 750 && d < 1000) && o.ahead.every(a => a > 0.9), o.dist.join(' ') + ' / ' + o.ahead.join(' '));
  check('they are of the system\'s types and are not held back by the launch grace', o.ambush && o.types.every(k => ['raider', 'drone', 'gunship'].includes(k)) && o.calm.every(c => c === false), o.types.join());
  check('the cooldown starts at 90 s', o.cool > 89 && o.cool <= 90, o.cool.toFixed(1));
  check('the warning window is 1.2 s and the HUD banner is up for 2.5 s', o.warn > 1000 && o.warn <= 1200 && o.until > 2000 && o.until <= 2500);
  check('the toast says so', (await said()).some(m => /Interdicted/.test(m)));
  check('the siren sound exists', await E(`typeof SFX.siren === 'function' && (sfx('siren'), true)`));
  await tick(6);
  check('the INTERDICTED banner is drawn on the HUD', await E(`Object.values(${SP}._hud.t).some(x => x.visible && x.text === 'INTERDICTED')`));
  if (!(await t.shot('interdict-banner'))) check('screenshot of the banner', false);
  await tick(20);
  check('the pirates come for you (they are close and shooting range)', await E(`${SP}.enemies.getChildren().some(d => d.active && Math.hypot(d.x - ${SP}.ship.x, d.y - ${SP}.ship.y) < 900)`));

  // ---- not twice: the cooldown holds, then a forced roll fires again ----
  await park(9000, 9000); await S('G.jumps = 2; CRUISE.rnd = () => 0');
  check('cruise starts again on the cooldown', await go('Kepler-4c')); await tick(40);
  check('a forced roll does nothing while the cooldown runs', await E(`${SP}.cruising`));
  await E('G.interdictCool = 0.05'); await tick(8);
  check('once the cooldown is over the next roll fires', await E(`!${SP}.cruising && ${SP}.enemies.countActive() >= 2`));

  // ---- near a station: starting 3500 px from Halcyon, it fires only once you are 4000 px clear ----
  await park(9000, 9000); await E(`${SP}.ship.setPosition(${SP}.station.x, ${SP}.station.y + 3500)`); await S('G.jumps = 2; G.interdictCool = 0; CRUISE.rnd = () => 0');
  check('cruise starts south of the station', await go('Slag Belt')); await tick(10);
  const early = await E(`({ on: ${SP}.cruising, d: Math.round(Math.hypot(${SP}.ship.x - ${SP}.station.x, ${SP}.ship.y - ${SP}.station.y)) })`);
  check('inside 4000 px of the station a forced roll does nothing', early.on && early.d < 4000, early.d + ' px out');
  await tick(60);
  check('4000 px clear of the station the forced roll fires', await E(`!${SP}.cruising && ${SP}.enemies.countActive() >= 2 && Math.hypot(${SP}.ship.x - ${SP}.station.x, ${SP}.ship.y - ${SP}.station.y) >= 4000`));

  // ---- the first two jumps ----
  await park(9000, 9000); await S('G.jumps = 1; G.interdictCool = 0; CRUISE.rnd = () => 0');
  check('cruise starts', await go('Kepler-4c')); await tick(60);
  check('with one jump made nothing happens however the roll falls', await E(`${SP}.cruising && ${SP}.enemies.countActive() === 0`));
  await S('CRUISE.rnd = Math.random; G.jumps = 0; G.interdictCool = 0');
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
console.log(bad ? 'INTERDICT FAIL' : 'INTERDICT PASS');
process.exitCode = bad ? 1 : 0;
