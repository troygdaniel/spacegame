// smoke: autopilot: P flies the ship to a body at local speed, stops at the dock, any key cancels, a hostile or a hit stops it, the Tab map picks
// Autopilot for local transit (src/autopilot.js, docs/UNIVERSE.md 2.2). Run: node tests/autopilot.mjs
// The game clock is stepped by hand (cdp.mjs clock()), so the speeds and distances below are exact whatever the load on the Mac.
// Checks: a short hop from the station to Kepler-4b (cruise refuses it: too close to the mass) arrives slow enough to land; a hop to the
// station ends on the dock prompt; a held flight key, a hostile ahead and a hit each end it with their line; a long leg cruises in the
// middle and the autopilot finishes the last mile; P in the nav list; the Tab map's picker (W S, Enter); gates are in the list.
// Saves tests/out/autopilot-*.png.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')";
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500); await t.ev('G.guideDone = true');
  await t.clock();
  await t.ev(`(() => { const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0); return 1; })()`);
  await t.ev(`(() => { window.__toasts = []; const orig = toast; toast = (s, msg, c) => { window.__toasts.push(msg); return orig(s, msg, c); }; })()`);
  const E = x => t.ev(x);
  const tick = async n => { for (let left = n; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); };
  const said = () => E('JSON.stringify(window.__toasts)').then(JSON.parse);
  const snap = async name => { await t.shot(name); return t.shot(name); };
  // a quiet sky, the ship parked and still, the autopilot and cruise off, the toast list empty
  const park = (x, y) => E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.eb.getChildren().forEach(b => b.disableBody(true, true));
    if (s.cr.active) cruiseEnd(s, 'quiet'); if (s.ap.on) autopilotEnd(s, 'quiet'); s.cr.target = null; s.ship.setPosition(${x}, ${y}); s.ship.setVelocity(0, 0); s.ship.rotation = 0; s.ship.body.setAcceleration(0, 0);
    s.cameras.main.centerOn(${x}, ${y}); (s.toasts || []).forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); s.toasts = []; window.__toasts = []; G.hull = G.maxHull; s.ironUntil = 0; s.lockUntil = 0;
    ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'SHIFT', 'Q', 'E'].forEach(n => { if (s.k[n]) s.k[n].isDown = false; }); })()`);
  // target() also keeps the body's spot in window.__T: the autopilot and cruise both drop their target on arrival, and the samples still need the distance
  const target = name => E(`(() => { const s = ${SP}, b = cruiseKnown(s).find(b => b.name === '${name}'); cruisePick(s, b); window.__T = { x: b.x, y: b.y }; return b.dist; })()`);
  const pressP = async () => { await E(`${SP}.ap.k.P._justDown = true`); await tick(1); };
  const state = () => E(`(() => { const s = ${SP}, a = s.ap, t = window.__T; return JSON.stringify({ on: a.on, stage: a.stage, cruising: s.cruising, v: Math.round(s.ship.body.speed), d: t ? Math.round(Math.hypot(t.x - s.ship.x, t.y - s.ship.y)) : -1, prompt: s.prompt.text || '', read: a.read.visible ? a.read.text : '' }); })()`).then(JSON.parse);
  // fly until the autopilot lets go (or the frames run out), sampling every 6 frames
  const fly = async (maxFrames = 1500, stopWhen = r => !r.on) => {
    const log = []; let i = 0;
    for (; i < maxFrames; i += 6) { await tick(6); const r = await state(); log.push(r); if (stopWhen(r)) break; }
    return { log, frames: i + 6, seconds: (i + 6) * 16.67 / 1000, end: log[log.length - 1], maxV: Math.max(...log.map(r => r.v)) };
  };
  const stationAt = JSON.parse(await E(`JSON.stringify((() => { const b = sysBody('station'); return [b.x, b.y]; })())`));
  const planet = JSON.parse(await E(`JSON.stringify((() => { const b = sysBody('planet'); return { x: b.x, y: b.y, r: b.r, name: b.name }; })())`));

  // ---- the list ----
  const known = JSON.parse(await E(`JSON.stringify(cruiseKnown(${SP}).map(b => [b.name, b.type]))`));
  check('the nav list has the gate now, typed GATE', known.some(k => k[1] === 'gate') && (await E(`CRUISE_TYPES.gate`)) === 'GATE', known.map(k => k[0]).join(', '));
  check('P with no target says so and does nothing', await (async () => { await park(9000, 9000); await pressP(); const s = await state(); return !s.on && (await said()).some(m => /No destination/.test(m)); })());

  // ---- the short hop cruise refuses: from the station's doorstep to Kepler-4b ----
  await park(stationAt[0] + 600, stationAt[1]); const d0 = await target(planet.name);
  await E(`${SP}.cr.k.C._justDown = true`); await tick(1);
  check('C refuses the hop: too close to the mass', !(await E(`${SP}.cruising`)) && (await said()).some(m => /Too close to the mass/.test(m)));
  await pressP();
  let s0 = await state();
  check('P takes the ship: autopilot on, the local stage, the readout up', s0.on && s0.stage === 'local' && (await said()).some(m => /Autopilot to Kepler-4b/.test(m)), JSON.stringify(s0));
  await tick(40); s0 = await state();
  check('it turns onto the planet and runs up to local top speed (480 for the Wren)', s0.v > 300 && s0.v <= 490 && /^AUTOPILOT  KEPLER-4B/.test(s0.read), JSON.stringify(s0));
  if (!(await snap('autopilot-flying'))) check('screenshot of the autopilot flying', false);
  const hop = await fly(900);
  check('it arrives: autopilot off, within the land range, under the land speed limit', !hop.end.on && hop.end.d < planet.r + 150 && hop.end.d > planet.r + 40 && hop.end.v <= 170, `ended ${hop.end.d} px out at ${hop.end.v} px/s after ${hop.seconds.toFixed(1)} s`);
  check('it never went faster than the ship can fly', hop.maxV <= 490, 'max ' + hop.maxV);
  check('the arrival line says what to press', (await said()).some(m => /Kepler-4b: press L to land/.test(m)), JSON.stringify(await said()));
  await tick(3);
  check('the land prompt is on: L lands', /Land/.test((await state()).prompt), (await state()).prompt);
  check('the hop takes about as long as the distance says (4 to 12 s for 2500 px)', hop.seconds > 4 && hop.seconds < 13, hop.seconds.toFixed(1) + ' s for ' + Math.round(d0) + ' px');
  if (!(await snap('autopilot-arrived'))) check('screenshot after arrival', false);

  // ---- to the station: it ends on the dock prompt ----
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP();
  const dock = await fly(900);
  check('to the station: stops inside 320 px under 150 px/s and the dock prompt is on', !dock.end.on && dock.end.d < 320 && dock.end.d > 200 && dock.end.v < 150, `ended ${dock.end.d} px out at ${dock.end.v} px/s`);
  await tick(3);
  check('the prompt says L docks, the toast too', /Dock/.test((await state()).prompt) && (await said()).some(m => /Halcyon Station: press L to dock/.test(m)), (await state()).prompt);

  // ---- any key takes the stick back ----
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP(); await tick(30);
  await E(`${SP}.k.W.isDown = true`); await tick(2); await E(`${SP}.k.W.isDown = false`);
  check('a held W cancels: autopilot off and it says so', !(await state()).on && (await said()).some(m => /^Autopilot off/.test(m)));
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP(); await tick(30);
  await E(`${SP}.k.LEFT.isDown = true`); await tick(2); await E(`${SP}.k.LEFT.isDown = false`);
  check('an arrow key cancels too', !(await state()).on);
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP(); await tick(30);
  await pressP();
  check('P again cancels', !(await state()).on);
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP(); await tick(5);
  check('a key in the first quarter second does not count (the hand that pressed P)', (await state()).on);
  const after = await fly(900);
  check('and the ship still gets there', !after.end.on && after.end.d < 320);

  // ---- danger ----
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP(); await tick(20);
  await E(`(() => { const s = ${SP}; spawnPirate(s, s.ship.x - 900, s.ship.y + 300, 'raider'); })()`); await tick(2);
  check('a hostile within 1100 px stops it: contact', !(await state()).on && (await said()).some(m => /Contact: autopilot off/.test(m)), JSON.stringify(await said()));
  await park(9000, 9000); await target('Kepler-4c'); await E(`(() => { const s = ${SP}; spawnPirate(s, s.ship.x + 2000, s.ship.y, 'raider'); })()`); await pressP();
  const contact = await fly(300);
  check('a hostile ahead of the cruise part drops the cruise and the autopilot with it', !contact.end.on && !(await E(`${SP}.cruising`)) && (await said()).some(m => /Contact ahead/.test(m)), JSON.stringify(await said()));
  await park(stationAt[0] + 3000, stationAt[1] + 400); await target('Halcyon Station'); await pressP(); await tick(20);
  await E(`(() => { const s = ${SP}; s.hurt(5, s.ship.x + 100, s.ship.y); })()`); await tick(2);
  check('a hit stops it: hit', !(await state()).on && (await said()).some(m => /Hit: autopilot off/.test(m)), JSON.stringify(await said()));

  // ---- a long leg: it cruises the middle and finishes the last mile ----
  await park(stationAt[0] + 600, stationAt[1]); const far = await target('Tern'); await pressP();
  const toCruise = await fly(600, r => r.cruising || !r.on);
  check('from the doorstep of the station to Tern: it flies clear of the mass, then engages cruise', toCruise.end.on && toCruise.end.cruising && toCruise.end.stage === 'cruise', JSON.stringify(toCruise.end));
  const cruised = await fly(1500, r => !r.cruising || !r.on);
  check('cruise drops out 900 px short and the autopilot takes the stick back', cruised.end.on && cruised.end.stage === 'local' && cruised.end.d < 1100 && cruised.end.d > 700, JSON.stringify(cruised.end));
  const last = await fly(600), ternR = await E(`cruiseKnown(${SP}).find(b => b.name === 'Tern').r`);
  check('the last mile ends 100 px off the rim of Tern (a planet), slow', !last.end.on && last.end.d < ternR + 150 && last.end.d > ternR + 40 && last.end.v <= 120, `ended ${last.end.d} px out (radius ${ternR}) at ${last.end.v} px/s; the leg was ${Math.round(far)} px`);
  check('Tern is announced and the autopilot is off', (await said()).some(m => /Tern ahead. Autopilot off/.test(m)));
  // S during the cruise part ends both
  await park(stationAt[0] + 600, stationAt[1]); await target('Tern'); await pressP(); await fly(600, r => r.cruising || !r.on); await tick(30);
  await E(`${SP}.k.S.isDown = true`); await tick(40); await E(`${SP}.k.S.isDown = false`);
  check('S during the cruise part cancels the cruise and the autopilot with it', !(await state()).on && !(await E(`${SP}.cruising`)) && (await said()).some(m => /Cruise cancelled/.test(m)));

  // ---- P in the nav list ----
  await park(9000, 9000);
  await E(`(() => { const s = ${SP}; cruiseNavOpen(s); cruiseNavDraw(s); })()`); await tick(2);
  await E(`${SP}.cr.k.S._justDown = true`); await tick(2);
  const row = await E(`${SP}.cr.list[${SP}.cr.sel].name`);
  await pressP(); await tick(1);
  check('P on a row of the nav list closes it and flies there', !(await E(`${SP}.cr.navOpen`)) && (await state()).on && (await E(`${SP}.ap.target.name`)) === row, row);

  // ---- the Tab map picks nothing: it rings the destination (card space-game-one-way-to-target) ----
  await park(9000, 9000);
  const dest = await E(`(() => { const b = cruiseKnown(${SP})[1]; cruisePick(${SP}, b); return b.name; })()`);
  await E(`game.scene.start('Overlay', { from: 'Space', mode: 'map' })`); await tick(4);
  const OV = "game.scene.getScene('Overlay')";
  const map0 = JSON.parse(await E(`JSON.stringify({ pick: ${OV}.pick === undefined, foot: ${OV}.footer.text, line: ${OV}.tPick.text })`));
  check('the map has no picker, and names the destination with its distance', map0.pick && !/Enter|W S/.test(map0.foot) && map0.line.startsWith('Destination: ' + dest) && / km$/.test(map0.line), JSON.stringify(map0));
  await E(`(() => { const e = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 }); window.dispatchEvent(e); return 1; })()`); await tick(3);
  check('Enter on the map flies nowhere', !(await state()).on && (await E(`${SP}.cr.target.name`)) === dest);
  await E(`(() => { game.scene.stop('Overlay'); game.scene.resume('Space'); })()`);
  await E(`game.scene.start('Overlay', { from: 'Station', mode: 'map' })`); await tick(3);
  check('over the station the map names no destination', (await E(`${OV}.tPick.text`)) === '' && !/autopilot/.test(await E(`${OV}.footer.text`)));
  await E(`(() => { game.scene.stop('Overlay'); game.scene.resume('Space'); })()`);

  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
console.log(bad ? 'AUTOPILOT FAIL' : 'AUTOPILOT PASS');
process.exitCode = bad ? 1 : 0;
