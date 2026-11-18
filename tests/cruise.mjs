// smoke: cruise: the N nav list, C cruise, a 36000 px Halcyon: speed profile, locks, cancel, nudge, frame cost
// Cruise: in-system fast travel (src/cruise.js, docs/UNIVERSE.md 2.2). Run: node tests/cruise.mjs
// The game clock is stepped by hand (16.67 ms a frame, see cdp.mjs clock()), so the speeds, times and distances below are exact
// whatever the load on the Mac. Checks: Halcyon is 36000 px with its old cluster where it was; the nav list; the three locks;
// the speed profile (8000 px/s, stops about 900 px out under 150 px/s, never inside a planet); S cancels; A and D nudge; a pirate
// ahead ends it; rocks and bullets do not touch a cruising ship; the look; the Tab map; the frame cost. Saves tests/out/cruise-*.png.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')";
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500); await t.ev('G.guideDone = true');
  await t.clock();
  await t.ev(`(() => { const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0); return 1; })()`); // Phaser's tweens time themselves with Date.now: follow the stepped clock or the flash never fades
  await t.ev(`(() => { window.__toasts = []; const orig = toast; toast = (s, msg, c) => { window.__toasts.push(msg); return orig(s, msg, c); }; })()`);
  const E = x => t.ev(x);
  const tick = async n => { for (let left = n; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); }; // short calls: a busy Mac can take seconds a frame, and one DevTools call times out
  // a quiet sky and a ship parked where the test says, in the units the data is written in (sysAt spreads it out, src/data_systems.js SYSTEM_SCALE); the toast list starts empty
  const park = (x, y) => E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.eb.getChildren().forEach(b => b.disableBody(true, true));
    if (s.cr.active) cruiseEnd(s, 'quiet'); if (s.ap && s.ap.on) autopilotEnd(s, 'quiet'); s.cr.target = null; s.ship.setPosition(sysAt(${x}), sysAt(${y})); s.ship.setVelocity(0, 0); s.ship.rotation = 0; s.ship.body.setAcceleration(0, 0);
    s.cameras.main.centerOn(sysAt(${x}), sysAt(${y})); (s.toasts || []).forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); s.toasts = []; window.__toasts = []; G.hull = G.maxHull; s.ironUntil = 0; })()`);
  const target = name => E(`(() => { const s = ${SP}, b = cruiseKnown(s).find(b => b.name === '${name}'); cruisePick(s, b); return b.dist; })()`);
  const snap = async name => { await t.shot(name); return t.shot(name); }; // a screenshot shows the frame composited at the previous capture: take two, keep the second
  const said = () => E('JSON.stringify(window.__toasts)').then(JSON.parse);
  // fly a cruise to its end, sampling every 6 frames: speed, distance to the target, the heading
  const fly = async (maxFrames = 900) => {
    const log = []; let i = 0;
    for (; i < maxFrames; i += 6) {
      await tick(6);
      const r = JSON.parse(await E(`(() => { const s = ${SP}, t = s.cr.target; return JSON.stringify({ on: s.cruising, v: Math.round(s.ship.body.speed), d: t ? Math.round(Math.hypot(t.x - s.ship.x, t.y - s.ship.y)) : -1, z: +s.cameras.main.zoom.toFixed(3), x: Math.round(s.ship.x), y: Math.round(s.ship.y), bh: s.cr.brInfo ? s.cr.brInfo.half : 0 }); })()`));
      log.push(r); if (!r.on) break;
    }
    return { log, frames: i + 6, seconds: (i + 6) * 16.67 / 1000, end: log[log.length - 1] };
  };

  // ---- the world ----
  check('Halcyon is 36000 px in the data, times SYSTEM_SCALE in the game: physics world and camera bounds', await E(`SYSTEM_SCALE === 3 && ${SP}.WS === sysAt(36000) && ${SP}.physics.world.bounds.width === sysAt(36000) && ${SP}.cameras.main.getBounds().width === sysAt(36000)`));
  check('the old cluster keeps its shape, spread out by SYSTEM_SCALE: station, Kepler-4b, belt, outpost, a wreck', await E(`(() => { const p = id => sysBodies().find(b => b.id === id); return [['halcyon-station', 4000, 4000], ['kepler-4b', 6200, 2000], ['kepler-belt', 5500, 1300], ['kestrel-outpost', 2000, 5800], ['wreck-se', 6900, 6500]].every(([id, x, y]) => p(id).x === sysAt(x) && p(id).y === sysAt(y)) && p('kepler-4b').r === 316 && p('kepler-belt').r === 700; })()`));
  check('the far bodies are drawn: Kepler-4c and Tern from planetTexture, the dead station from stationLookFx',
    await E(`game.textures.exists('planet-rock-3') && game.textures.exists('planet-gas-2') && game.textures.exists('sl-derelict')`));

  // ---- the nav list ----
  const known = JSON.parse(await E(`JSON.stringify(cruiseKnown(${SP}).map(b => [b.name, b.type, Math.round(b.dist)]))`));
  check('the nav list knows 10 bodies at the start: the star, stations, planets, belts, scenery, the gate', known.length === 10 && known.some(k => k[1] === 'gate') && known.some(k => k[1] === 'star' && k[0] === 'Halcyon Sun'), known.map(k => k[0]).join(', '));
  check('the nav list is sorted nearest first', known.every((k, i) => !i || known[i - 1][2] <= k[2]));
  check('a salvage site is not on the list until you find it, then it is', await E(`(() => { const s = ${SP}, n0 = cruiseKnown(s).length; G.poi['wreck-nw'] = 1; const n1 = cruiseKnown(s).length; delete G.poi['wreck-nw']; return n1 === n0 + 1; })()`));
  check('cruiseEta: a 90000 px leg (the old 30000, spread out) takes about 13.5 s, twice the 6.5 s it was and not three times; a 3000 px leg about 2 s', await E('Math.abs(cruiseEta(sysAt(30000)) - 13.5) < 0.9 && cruiseEta(3000) > 1.2 && cruiseEta(3000) < 3'), await E('cruiseEta(sysAt(30000)).toFixed(2) + " / " + cruiseEta(3000).toFixed(2)'));
  await park(9000, 9000);
  await E(`(() => { const s = ${SP}; cruiseNavOpen(s); cruiseNavDraw(s); })()`); await tick(2);
  check('the navigation panel (src/navpanel.js) is up with the keys on it, a row per body and one chosen', await E(`(() => { const s = ${SP}, c = s.cr; return c.ui.box.visible && c.navOpen && s.np.keys && c.list.filter(r => r.kind === 'body').length === cruiseKnown(s).length && !!c.list[c.sel] && s.np.hl.visible; })()`));
  if (!(await t.shot('cruise-nav'))) check('screenshot of the nav list', false);
  // keys: S moves down, Enter makes the row the destination (the panel stays: Enter again would go there) and the objective arrow follows
  const sel0 = await E(`${SP}.cr.sel`);
  await E(`(() => { const k = ${SP}.cr.k; k.S._justDown = true; })()`); // JustDown reads this flag
  await tick(2);
  check('S moves the selection down a row', (await E(`${SP}.cr.sel`)) === sel0 + 1);
  const picked = await E(`${SP}.cr.list[${SP}.cr.sel].name`);
  await E(`${SP}.cr.k.ENTER._justDown = true`); await tick(2);
  check('Enter makes the chosen body the target; the panel stays up for the second Enter', await E(`(() => { const c = ${SP}.cr; return c.navOpen && c.ui.box.visible && !!c.target && c.target.name === ${JSON.stringify(picked)}; })()`), picked);
  check('the amber objective arrow points at the nav target, the radar arrow stays on the mission',
    await E(`(() => { const s = ${SP}; return hudObjective(s, 'Space').name === ${JSON.stringify(picked.toUpperCase())} && hudObjective(s, 'Space', true).name !== undefined && s.cr.target !== null; })()`));
  await E(`(() => { const s = ${SP}; cruiseNavOpen(s); cruiseNavDraw(s); })()`); await tick(2);
  await E(`${SP}.cr.k.X._justDown = true`); await tick(2);
  check('X in the nav list clears the target', (await E(`${SP}.cr.target`)) === null);
  await E(`(() => { cruiseNavClose(${SP}); })()`);

  // ---- the locks ----
  await park(9000, 9000); await E(`${SP}.cr.k.C._justDown = true`); await tick(2);
  check('C with no target says so and does not engage', !(await E(`${SP}.cruising`)) && (await said()).some(m => /No destination/.test(m)));
  await park(9000, 9000); await target('Kepler-4c'); await park(9000, 9000);
  await E(`(() => { const s = ${SP}; cruisePick(s, cruiseKnown(s).find(b => b.name === 'Kepler-4c')); s.ship.setPosition(s.station.x + 1800, s.station.y); cruiseEngage(s); })()`);
  check('inside 2500 px of the station: no cruise yet, the ship flies itself clear first and says so (tests/travelclear.mjs flies it out)', !(await E(`${SP}.cruising`)) && (await E(`${SP}.ap.on && ${SP}.ap.stage === 'clear'`)) && (await said()).some(m => /^Clearing Halcyon Station, then cruising to Kepler-4c/.test(m)) && !(await said()).some(m => /Too close to the mass/.test(m)), JSON.stringify(await said()));
  await park(9000, 9000);
  await E(`(() => { const s = ${SP}; cruisePick(s, cruiseKnown(s).find(b => b.name === 'Kepler-4c')); spawnPirate(s, s.ship.x + 1200, s.ship.y, 'drone'); cruiseEngage(s); })()`);
  check('a hostile within 1500 px: cruise is locked', !(await E(`${SP}.cruising`)) && (await said()).some(m => /Hostiles near/.test(m)), JSON.stringify(await said()));
  await park(9000, 9000);
  await E(`(() => { const s = ${SP}; cruisePick(s, cruiseKnown(s).find(b => b.name === 'Slag Belt')); const b = s.cr.target; s.ship.setPosition(b.x, b.y - 2000); cruiseEngage(s); })()`);
  check('a target 1100 px away is just flown to', !(await E(`${SP}.cruising`)) && (await said()).some(m => /is close: fly there/.test(m)));

  // ---- a clean cruise: Kepler-4c, 12700 px away ----
  await park(9000, 9000); const dist = await target('Kepler-4c'); const eta = await E(`cruiseEta(${dist})`);
  await E(`${SP}.cr.k.C._justDown = true`); await tick(1);
  check('C engages cruise toward the target', await E(`${SP}.cruising === true`));
  let mid = null; const samples = [];
  for (let i = 0; i < 8; i++) { await tick(18); const r = JSON.parse(await E(`(() => { const s = ${SP}, c = s.cr; return JSON.stringify({ on: s.cruising, v: Math.round(s.ship.body.speed), z: +s.cameras.main.zoom.toFixed(3), vig: +c.vig.alpha.toFixed(2), streaks: c.fx.commandBuffer.length, read: c.read.visible ? c.read.text : '', lbl: s._hud.t.g2 ? 1 : 0 }); })()`)); samples.push(r); if (r.v > 5000 && !mid) mid = r; }
  const top = await E('CRUISE.top');
  check('it speeds up to 8000 px/s and no further', top === 8000 && samples.some(r => r.v >= top - 200) && samples.every(r => r.v <= top + 1), samples.map(r => r.v).join(' '));
  check('the look at speed: zoom 0.85, the cyan vignette, speed streaks, the CRUISE readout', mid && mid.z <= 0.87 && mid.vig > 0.3 && mid.streaks > 50 && /^CRUISE  KEPLER-4C/.test(mid.read), JSON.stringify(mid));
  if (mid && !(await t.shot('cruise-flying'))) check('screenshot of cruise', false);
  // the target's bracket corners: none while it is far, then wide amber corners that tighten onto it as the ship closes in
  let brFrames = 0, br = null;
  check('no brackets while the target is far away', (await E(`${SP}.cr.brInfo`)) === null);
  for (let i = 0; i < 500 && !br; i += 3) { await tick(3); brFrames += 3; br = JSON.parse(await E(`JSON.stringify(${SP}.cr.brInfo)`)); if (!(await E(`${SP}.cruising`))) break; }
  check('the target gets bracket corners as it comes into view, wide at first (150 px or more)', !!br && br.half >= 150, JSON.stringify(br));
  if (br && !(await snap('cruise-brackets'))) check('screenshot of the brackets', false);
  const run = await fly(); const end = run.end;
  const hs = JSON.parse(await E(`JSON.stringify([5000, 3000, 1500, 1000, 700].map(d => Math.round(cruiseBracketHalf({ r: 220 }, d, 1))))`));
  check('the brackets tighten onto the body as the ship closes in, and are never under 150 px', hs.every((h, i) => !i || h <= hs[i - 1]) && hs[0] > hs[hs.length - 1] + 100 && hs[hs.length - 1] >= 150, hs.join(' '));
  check('a small outpost still gets brackets of 150 px or more', await E(`cruiseBracketHalf({ r: 0 }, 900, 0.85) >= 150 && cruiseBracketHalf({ r: 0 }, 900, 0.85) < 200`));
  // the drop-out: a soft white flash under the HUD that fades in under half a second
  const fl = JSON.parse(await E(`(() => { const f = ${SP}.cr.flash; return JSON.stringify(f && f.active ? { a: +(f.alpha * f.fillAlpha).toFixed(2), d: f.depth, hud: ${SP}._hud.g.depth } : null); })()`));
  check('drop-out: a soft white flash, under the HUD, about 0.45 and fading', !!fl && fl.a > 0.2 && fl.a <= 0.45 && fl.d < fl.hud, JSON.stringify(fl));
  if (!(await snap('cruise-dropout'))) check('screenshot of the drop-out flash', false);
  await tick(40);
  check('the flash is gone within half a second', await E(`!${SP}.cr.flash.active`));
  // after the drop-out the target stays marked while it is on screen, and clears when you arrive (500 px from its rim)
  await E(`(() => { const s = ${SP}, t = s.cr.target; s.ship.setPosition(t.x - (t.r + 600), t.y); s.ship.setVelocity(0, 0); s.cameras.main.centerOn(s.ship.x, s.ship.y); })()`); await tick(3);
  check('after the drop-out the brackets stay on the target while it is on screen', await E(`${SP}.cr.brInfo !== null && ${SP}.cr.brInfo.half >= 150`), await E(`JSON.stringify(${SP}.cr.brInfo)`));
  if (!(await snap('cruise-brackets-coast'))) check('screenshot of the brackets after the drop-out', false);
  await E(`(() => { const s = ${SP}, t = s.cr.target; s.ship.setPosition(t.x - (t.r + 300), t.y); s.cameras.main.centerOn(s.ship.x, s.ship.y); })()`); await tick(3);
  check('arriving clears the target and its brackets', await E(`${SP}.cr.target === null && ${SP}.cr.brInfo === null`));
  check('it drops out about 900 px from the target', end && !end.on && end.d > 850 && end.d < 1000, 'ended ' + (end && end.d) + ' px out');
  check('it arrives under 150 px/s and does not fly through the body', end && end.v <= 150 && run.log.every(r => r.d > 700), 'v ' + (end && end.v));
  check('the whole leg takes about as long as cruiseEta says', Math.abs((18 * 8 + brFrames) * 16.67 / 1000 + run.seconds - eta) < 1.6, `${((18 * 8 + brFrames) * 16.67 / 1000 + run.seconds).toFixed(1)} s against ${eta.toFixed(1)} s`);
  await tick(20);
  check('the camera zoom comes back to 1 and the vignette fades', await E(`${SP}.cameras.main.zoom === 1 && ${SP}.cr.vig.visible === false`));
  check('arrival is announced and the ship flies on locally', (await said()).some(m => /Cruise ended/.test(m)) && (await E(`${SP}.ship.body.maxSpeed <= 1200`)));
  if (!(await t.shot('cruise-arrived'))) check('screenshot after arrival', false);

  // ---- a big planet: the speed limit stops you short of it ----
  await park(10000, 20000); await target('Tern'); await E(`${SP}.cr.k.C._justDown = true`); await tick(1);
  const big = await fly(1200);
  check('cruise to Tern (a gas giant, radius 440) stops outside it', !big.end.on && big.end.d > 850 && big.log.every(r => r.d > 440 + 200), 'ended ' + big.end.d + ' px out');

  // ---- cancel and nudge ----
  await park(9000, 9000); await target('Kepler-4c'); await E(`${SP}.cr.k.C._justDown = true`); await tick(40);
  await E(`${SP}.k.S.isDown = true`); await tick(30); await E(`${SP}.k.S.isDown = false`);
  check('S cancels: cruise ends at local speed and says so', await E(`!${SP}.cruising && ${SP}.ship.body.speed <= 600`) && (await said()).some(m => /Cruise cancelled/.test(m)), 'v ' + await E(`Math.round(${SP}.ship.body.speed)`));
  await park(9000, 9000); await target('Kepler-4c'); await E(`${SP}.cr.k.C._justDown = true`); await tick(30);
  await E(`${SP}.k.D.isDown = true`); await tick(24); const nudged = await E(`${SP}.cr.nudge`); await E(`${SP}.k.D.isDown = false`);
  check('D nudges the heading, and it is limited', nudged > 0.1 && nudged <= 0.5001, 'nudge ' + nudged.toFixed(2));
  await tick(90);
  check('the nudge fades and cruise still arrives', !(await E(`${SP}.cruising`)) || (await fly(900)).end.d < 1100);

  // ---- trouble ----
  await park(9000, 9000); await target('Kepler-4c'); await E(`${SP}.cr.k.C._justDown = true`); await tick(30);
  await E(`(() => { const s = ${SP}, r = s.ship.rotation; spawnPirate(s, s.ship.x + Math.cos(r) * 700, s.ship.y + Math.sin(r) * 700, 'raider'); })()`); await tick(6);
  check('a pirate dead ahead ends cruise: contact ahead', await E(`!${SP}.cruising`) && (await said()).some(m => /Contact ahead/.test(m)), 'v ' + await E(`Math.round(${SP}.ship.body.speed)`));
  // rocks and bullets: through the Slag Belt at full speed
  // start 9000 px short of the belt's middle, on the line through it to Tern (the belt is as big as it was, so the old parking spot would miss it now)
  await park(9000, 22000); await target('Tern');
  const belt = JSON.parse(await E(`(() => { const s = ${SP}, b = sysBodies('belt').find(b => b.id === 'slag-belt'), t = s.cr.target, a = Math.atan2(t.y - b.y, t.x - b.x); s.ship.setPosition(b.x - Math.cos(a) * 9000, b.y - Math.sin(a) * 9000); s.cameras.main.centerOn(s.ship.x, s.ship.y); return JSON.stringify({ x: b.x }); })()`));
  await E(`${SP}.cr.k.C._justDown = true`); await tick(1);
  const before = await E(`${SP}.ast.rocks.countActive()`);
  let minV = 1e9, passed = false;
  for (let i = 0; i < 60; i++) { await tick(6); const r = JSON.parse(await E(`JSON.stringify({ x: ${SP}.ship.x, v: ${SP}.ship.body.speed, on: ${SP}.cruising })`)); if (r.x > belt.x - 1000 && r.x < belt.x + 1000) { passed = true; minV = Math.min(minV, r.v); } if (!r.on) break; }
  check('cruising through the Slag Belt: no rock slows the ship and none breaks', passed && minV > 3500 && (await E(`${SP}.ast.rocks.countActive()`)) === before && (await E(`${SP}.ast.bumpAt`)) === 0, `slowest ${Math.round(minV)} px/s`);
  await park(9000, 9000); await target('Kepler-4c'); await E(`${SP}.cr.k.C._justDown = true`); await tick(40);
  const hull0 = await E('G.hull'); await E(`(() => { const s = ${SP}, b = s.eb.get(s.ship.x, s.ship.y); b.enableBody(true, s.ship.x, s.ship.y, true, true); b.dmg = 20; b.born = s.time.now; })()`); await tick(4);
  check('an enemy bullet on a cruising ship does nothing', (await E('G.hull')) === hull0 && await E(`${SP}.cruising`));
  check('no pirates spawn during cruise', await E(`(() => { const s = ${SP}; return s.enemies.countActive() === 0; })()`));

  // ---- the Tab map knows the far bodies ----
  await park(9000, 9000);
  await E(`game.scene.start('Overlay', { from: 'Space', mode: 'map' })`); await tick(4);
  // the map opens on the local view (card space-game-critic-map): the far bodies are on the whole-system view, which Z shows
  const mapLocal = JSON.parse(await E(`JSON.stringify({ size: game.scene.getScene('Overlay').view.size, far: game.scene.getScene('Overlay').far.filter(f => f.lb.visible).map(f => f.b.name) })`));
  check('the Tab map opens on a local view: smaller than the system, the far bodies not on it', mapLocal.size < await E('sysAt(36000)') && !mapLocal.far.includes('Tern'), JSON.stringify(mapLocal));
  await E(`(() => { game.scene.getScene('Overlay').pk.Z._justDown = true; return 1; })()`); await tick(30);
  const mp = JSON.parse(await E(`JSON.stringify({ far: game.scene.getScene('Overlay').far.map(f => f.b.name), shown: game.scene.getScene('Overlay').far.every(f => f.lb.visible) && game.scene.getScene('Overlay').view.size === sysAt(36000) })`));
  check('the Tab map has the grid of the whole system and labels Kepler-4c, Slag Belt, Tern, the dead station', mp.far.length === 5 && ['Kepler-4c', 'Slag Belt', 'Tern', 'Dead station'].every(n => mp.far.includes(n)) && mp.shown, mp.far.join(', '));
  await tick(2); if (!(await t.shot('cruise-map'))) check('screenshot of the map', false);
  await E(`(() => { game.scene.stop('Overlay'); game.scene.resume('Space'); })()`);

  // ---- frame cost: the same 60 steps parked, flying locally, and cruising ----
  await park(9000, 9000);
  const cost = async setup => { await setup(); const t0 = Date.now(); await tick(60); return (Date.now() - t0) / 60; };
  const idle = await cost(() => park(9000, 9000));
  const local = await cost(async () => { await park(9000, 9000); await E(`${SP}.k.W.isDown = true`); });
  await E(`${SP}.k.W.isDown = false`);
  const cruise = await cost(async () => { await park(9000, 9000); await target('Tern'); await E(`${SP}.cr.k.C._justDown = true`); await tick(1); });
  console.log(`  info  frame cost in headless software GL: parked ${idle.toFixed(1)} ms, local flight ${local.toFixed(1)} ms, cruise ${cruise.toFixed(1)} ms`);
  check('cruise costs no more than twice a parked frame (world 108000 px, zoom 0.85, streaks)', cruise < Math.max(2 * idle, idle + 25), `${cruise.toFixed(1)} against ${idle.toFixed(1)} ms`);
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
console.log(bad ? 'CRUISE FAIL' : 'CRUISE PASS');
process.exitCode = bad ? 1 : 0;
