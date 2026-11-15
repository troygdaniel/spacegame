// not in the smoke: the F1 scripted playthrough (docs/PLAYTEST.md round 4), run by hand: about 4 minutes
// Card space-game-u-f1-qa, docs/UNIVERSE.md 10.2: one scripted run the way a new player goes: new game, fuel up, launch, cruise, jump to
// Kestrel and back, dock, buy a ship, save and reload; the frame cost in a 36000 px system (Halcyon and Kestrel, in flight and in cruise)
// against the docs/PERF.md baseline. Headless Chrome, one at a time (tests/lock.mjs), --mute-audio; the flight runs on the stepped clock
// (game time, deterministic), the station on the real one. Every step saves tests/out/pt4-<step>.png; the numbers go to
// tests/out/playthrough.json and are printed as a table at the end. Nothing is asserted; a failed step is written down and the run goes on.
// Run: node tests/playthrough.mjs
import { launch, sleep, OUT } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ST = "game.scene.getScene('Station')", SP = "game.scene.getScene('Space')", SH = "game.scene.getScene('Ship')", GL = "game.scene.getScene('Galaxy')";
const results = [], timings = {};
let t = null, errSeen = 0, gameMs = 0;
const VK = {
  C: [67, 'KeyC', 'c'], D: [68, 'KeyD', 'd'], E: [69, 'KeyE', 'e'], G: [71, 'KeyG', 'g'], L: [76, 'KeyL', 'l'], N: [78, 'KeyN', 'n'], Y: [89, 'KeyY', 'y'],
  1: [49, 'Digit1', '1'], 2: [50, 'Digit2', '2'], ENTER: [13, 'Enter', 'Enter'], ESC: [27, 'Escape', 'Escape'], TAB: [9, 'Tab', 'Tab'], SPACE: [32, 'Space', ' ']
};
const kev = (name, type) => { const [code, key, ch] = VK[name]; return t.send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch }); };
const tap = async (name, hold = 90) => { await kev(name, 'keyDown'); await sleep(hold); await kev(name, 'keyUp'); }; // real clock
const run = async ms => { await t.run(ms); gameMs += ms; }; // stepped clock, counted
const skey = async (name) => { await kev(name, 'keyDown'); await run(50); await kev(name, 'keyUp'); await run(100); };
const active = (scene, ms = 20000) => t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, ms, scene + ' active');
const panels = () => t.ev(`game.scene.getScenes(true).map(s => s.scene.key).join('+')`);
const toasts = scene => t.ev(`${scene}.children.list.filter(o => o.text && o.depth === 300).map(o => o.text).join(' | ').slice(0, 200)`);
const walkTo = async (x, y) => { await t.ev(`(() => { const s = ${ST}; s.player.setPosition(${x}, ${y}); s.player.setVelocity(0, 0); return 1; })()`); await sleep(350); };
const fleet = () => t.ev(`JSON.stringify(G.fleet.map(r => [r.model, r.name, r.at, Math.round(r.fuel * 10) / 10, r.hull]))`);
// the frame cost, measured inside the page: 300 whole steps (update and render, software GL here) and 300 Space updates alone (the game's own JavaScript)
const frameCost = async () => JSON.parse(await t.ev(`(() => { const s = ${SP}; let a = performance.now(); for (let i = 0; i < 300; i++) game.step(performance.now(), 16.67); const step = (performance.now() - a) / 300;
  a = performance.now(); for (let i = 0; i < 300; i++) s.update(s.time.now, 16.67); const upd = (performance.now() - a) / 300;
  return JSON.stringify({ stepMs: Math.round(step * 100) / 100, updateMs: Math.round(upd * 1000) / 1000, objects: s.children.list.length, enemies: s.enemies ? s.enemies.countActive() : -1 }); })()`));
async function runUntil(expr, maxMs, slice = 1000) { let ran = 0; while (ran < maxMs && !(await t.ev(expr))) { await run(slice); ran += slice; } return ran; }
async function step(name, fn, note = '') {
  const r = { step: name, note, ok: true, detail: '', errors: [], wallMs: 0 };
  const w0 = Date.now();
  try { const d = await fn(); if (typeof d === 'string') r.detail = d; else if (d && typeof d === 'object') Object.assign(r, d); } catch (e) { r.ok = false; r.detail = 'threw: ' + e.message; }
  r.wallMs = Date.now() - w0;
  try { await t.shot('pt4-' + name); } catch (e) { r.detail += ' (no screenshot)'; }
  r.errors = t.errors.slice(errSeen); errSeen = t.errors.length;
  results.push(r);
  console.log(`  ${r.ok && !r.errors.length ? 'ok  ' : 'LOOK'} ${name}  ${r.detail}  [${(r.wallMs / 1000).toFixed(1)} s wall]${r.errors.length ? '  ERRORS: ' + r.errors.join(' | ') : ''}`);
}
async function reload() { await t.send('Page.navigate', { url: 'file://' + (await t.ev('location.pathname')) }); await sleep(1500); await active('Title', 30000); await sleep(900); }
const jumpTo = async (sel) => { // G, Tab until sel is selected, Enter; returns game ms of charge and of tunnel
  await skey('G'); await sleep(300); await run(200);
  for (let i = 0; i < 10 && (await t.ev(`${GL}.sel`)) !== sel; i++) { await skey('TAB'); await sleep(150); }
  const picked = await t.ev(`${GL}.sel`);
  await skey('ENTER'); await sleep(300); await run(200);
  if (!(await t.ev(`!!${SP}.jmp`))) return { picked, charge: -1, tunnel: -1, why: await toasts(SP) };
  const charge = 350 + await runUntil("game.scene.isActive('Hyper')", 8000, 100);
  await sleep(200);
  let tunnel = 0; for (let i = 0; i < 40 && !(await t.ev("game.scene.isActive('Space')")); i++) { await run(1000); tunnel += 1000; await sleep(40); }
  await run(500);
  return { picked, charge, tunnel };
};

const wall0 = Date.now();
t = await launch('');
try {
  await active('Title', 30000); await sleep(800);
  await step('new-game', async () => { await tap('SPACE'); await active('Station', 20000); await sleep(1200); await t.ev('(G.endingSeen = true, 1)'); /* the run hands itself credits later; the Ending card (2000 earned) is not under test and would cover the station */ return 'credits ' + await t.ev('G.credits') + ', fleet ' + await fleet() + ', system ' + await t.ev('G.system') + ', fuel ' + await t.ev('fuelHave()') + '/' + await t.ev('fuelTank()'); });
  await step('fuel-up', async () => {
    await t.ev('(activeShip().fuel = 10, G.credits = 500, 1)'); // as after a first trip and a first rescue: 10 units left, 500 credits
    await walkTo(785, 170); const prompt = await t.ev(`${ST}.prompt.text`); await tap('E'); await sleep(600);
    const q = await t.ev('JSON.stringify(pumpQuote(G.lastDock))'); await tap('2'); await sleep(600); // 1 is half a tank, 2 fills it
    timings.fillCost = 500 - await t.ev('G.credits');
    const r = 'prompt "' + prompt + '"; quote ' + q + '; after 2 (fill): fuel ' + await t.ev('fuelHave()') + '/' + await t.ev('fuelTank()') + ', paid ' + timings.fillCost + ', toast: ' + await toasts(ST);
    await tap('ESC'); await sleep(400); return r;
  });
  await step('launch', async () => { await walkTo(1090, 440); await sleep(200); await tap('E'); await active('Ship', 15000); await sleep(800); await tap('ENTER'); await active('Space', 15000); await sleep(600); await t.clock(); await run(3000); return 'in Space: ship ' + await t.ev('activeShip().model') + ' at ' + Math.round(await t.ev(`${SP}.ship.x`)) + ',' + Math.round(await t.ev(`${SP}.ship.y`)) + ', system size ' + await t.ev('sysDef().size') + ', grace cap ' + await t.ev(`pirateCap(${SP}, ${SP}.time.now)`); });
  await step('frame-cost-halcyon', async () => { const c = await frameCost(); timings.frameHalcyon = c; return JSON.stringify(c); }, 'docs/PERF.md: Space JS 0.6 ms a frame, a whole software-GL frame about 38 ms, on a busy Mac');
  await step('cruise', async () => {
    // out in the middle of the system, as after a fight or a pickup: the nearest body is thousands of px away, so the cruise has somewhere to go
    await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(16000, 16000); s.ship.body.setVelocity(0, 0); s.enemies.clear(true, true); s.eb.getChildren().forEach(b => b.disableBody(true, true)); return 1; })()`); await run(300);
    await skey('N'); await run(300); const rows = await t.ev(`${SP}.cr.list.length`); await skey('ENTER'); await run(300);
    const target = await t.ev(`${SP}.cr.target ? ${SP}.cr.target.name : 'none'`), d0 = await t.ev(`${SP}.cr.target ? Math.round(Math.hypot(${SP}.cr.target.x - ${SP}.ship.x, ${SP}.cr.target.y - ${SP}.ship.y)) : 0`);
    await skey('C'); await run(500);
    let ran = 0, vmax = 0; while (ran < 120000 && await t.ev(`${SP}.cr.active`)) { await run(1000); ran += 1000; vmax = Math.max(vmax, Math.round(await t.ev(`${SP}.ship.body.speed`))); if (ran === 1000) timings.frameCruise = await frameCost(); }
    const d1 = await t.ev(`${SP}.cr.target ? Math.round(Math.hypot(${SP}.cr.target.x - ${SP}.ship.x, ${SP}.cr.target.y - ${SP}.ship.y)) : 0`);
    timings.cruiseMs = ran; timings.cruiseVmax = vmax;
    return 'nav rows ' + rows + ', target ' + target + ' at ' + d0 + ' px; cruise ended after ' + ran + ' ms of game time, top speed ' + vmax + ' px/s, ' + d1 + ' px from the target; in cruise ' + JSON.stringify(timings.frameCruise) + '; toast: ' + await toasts(SP);
  });
  await step('jump-to-kestrel', async () => {
    await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.station.x + 3200, s.station.y + 200); s.ship.body.setVelocity(0, 0); s.enemies.clear(true, true); s.eb.getChildren().forEach(b => b.disableBody(true, true)); return 1; })()`); await run(300);
    const f0 = await t.ev('fuelHave()'); const j = await jumpTo('kestrel'); timings.jumpOut = j;
    return 'picked ' + j.picked + '; charge ' + j.charge + ' ms, tunnel ' + j.tunnel + ' ms (game time); fuel ' + f0 + ' -> ' + await t.ev('fuelHave()') + '; now in ' + await t.ev('G.system') + ' at ' + Math.round(await t.ev(`${SP}.ship.x`)) + ',' + Math.round(await t.ev(`${SP}.ship.y`)) + (j.why ? '; no charge: ' + j.why : '') + '; toast: ' + await toasts(SP);
  });
  await step('frame-cost-kestrel', async () => { await run(3000); const c = await frameCost(); timings.frameKestrel = c; return JSON.stringify(c) + ', bodies ' + await t.ev('sysBodies().length'); });
  await step('jump-home', async () => {
    await t.ev(`(() => { const s = ${SP}; activeShip().fuel = Math.max(fuelHave(), 12); s.enemies.clear(true, true); s.eb.getChildren().forEach(b => b.disableBody(true, true)); return 1; })()`); await run(200);
    const j = await jumpTo('halcyon'); timings.jumpHome = j;
    return 'picked ' + j.picked + '; charge ' + j.charge + ' ms, tunnel ' + j.tunnel + ' ms; now in ' + await t.ev('G.system') + ', jumps ' + await t.ev('G.jumps') + ', fuel ' + await t.ev('fuelHave()') + (j.why ? '; no charge: ' + j.why : '');
  });
  await step('dock', async () => { await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.station.x + 200, s.station.y); s.ship.body.setVelocity(0, 0); s.enemies.clear(true, true); return 1; })()`); await run(400); const p = await t.ev(`${SP}.prompt.text`); await skey('L'); await run(2500); await sleep(500); await active('Station', 15000); await sleep(1500); return 'prompt "' + p + '"; dock ' + await t.ev('G.lastDock') + ', credits ' + await t.ev('G.credits') + ', hull ' + await t.ev('G.hull'); });
  await step('buy-ship', async () => {
    // the page is on the stepped clock since the launch, so the station after docking moves only when frames are stepped: skey and run, not tap and sleep
    await t.ev('(G.credits = 5000, 1)'); // nine rescues' worth: the Kite
    await walkTo(1090, 440); await run(600); await sleep(300); const prompt = await t.ev(`${ST}.prompt.text`);
    await skey('E'); await runUntil("game.scene.isActive('Ship')", 4000, 200); let how = 'stepped E';
    if (!(await t.ev("game.scene.isActive('Ship')"))) { await tap('E'); await sleep(1500); await runUntil("game.scene.isActive('Ship')", 3000, 200); how = 'real-clock E'; }
    if (!(await t.ev("game.scene.isActive('Ship')"))) return 'the Ship bay did not open after E (prompt "' + prompt + '", scenes ' + await panels() + ', player at ' + Math.round(await t.ev(`${ST}.player.x`)) + ',' + Math.round(await t.ev(`${ST}.player.y`)) + ')';
    await run(800); await sleep(300);
    await skey('Y'); await run(500); await t.ev(`(${SH}.hangarApply(), 1)`); await run(200); const c0 = await t.ev('G.credits');
    await skey('ENTER'); await run(400); await skey('ENTER'); await run(700);
    const bought = 'prompt "' + prompt + '" (' + how + '); credits ' + c0 + ' -> ' + await t.ev('G.credits') + ', fleet ' + await fleet() + ', tab ' + await t.ev(`${SH}.tab`);
    // board the new ship: the FLEET tab selects the one just bought, Enter boards it; if the selection sits on the old ship, D moves it and Enter boards
    await skey('ENTER'); await run(700);
    if ((await t.ev('activeShip().model')) !== 'kite') { await skey('D'); await run(300); await skey('ENTER'); await run(700); }
    const r = bought + '; boarding: flying ' + await t.ev('activeShip().model') + ' (' + await t.ev('activeShip().name') + ')';
    await skey('ESC'); await runUntil("game.scene.isActive('Station')", 8000, 200); await run(800); return r;
  });
  await step('save-reload', async () => {
    await t.ev('(G.endingSeen = true, saveGame(true), 1)'); const before = await t.ev('JSON.stringify(snapshot())');
    const w = Date.now(); await reload(); await tap('SPACE'); await active('Station', 20000); await sleep(1200); timings.reloadWallMs = Date.now() - w;
    const after = await t.ev('JSON.stringify(snapshot())');
    return (before === after ? 'the save survives the reload byte for byte (' + before.length + ' chars)' : 'RELOAD CHANGED THE SAVE: ' + before.slice(0, 200) + ' / ' + after.slice(0, 200)) + '; flying ' + await t.ev('activeShip().name') + ', fleet ' + await fleet() + ', system ' + await t.ev('G.system') + ', jumps ' + await t.ev('G.jumps') + ', credits ' + await t.ev('G.credits') + '; reload took ' + timings.reloadWallMs + ' ms wall';
  });
} finally {
  await t.close();
}
timings.wallMs = Date.now() - wall0; timings.gameMs = gameMs;
const look = results.filter(r => !r.ok || r.errors.length);
console.log(`\nplaythrough: ${results.length} steps, ${look.length} to look at: ${look.map(r => r.step).join(', ') || 'none'}; ${(timings.wallMs / 1000).toFixed(0)} s wall, ${(gameMs / 1000).toFixed(0)} s of stepped flight`);
console.log('\n| What | Measured |\n|---|---|');
console.log(`| Fill from 10 to 40 units at Halcyon | ${timings.fillCost} cr |`);
console.log(`| Frame in Halcyon space (whole step / Space.update) | ${timings.frameHalcyon ? timings.frameHalcyon.stepMs + ' ms / ' + timings.frameHalcyon.updateMs + ' ms, ' + timings.frameHalcyon.objects + ' objects' : '-'} |`);
console.log(`| Frame in cruise | ${timings.frameCruise ? timings.frameCruise.stepMs + ' ms / ' + timings.frameCruise.updateMs + ' ms' : '-'} |`);
console.log(`| Frame in Kestrel space | ${timings.frameKestrel ? timings.frameKestrel.stepMs + ' ms / ' + timings.frameKestrel.updateMs + ' ms, ' + timings.frameKestrel.objects + ' objects' : '-'} |`);
console.log(`| Cruise to the first nav target | ${timings.cruiseMs} ms of game time, top speed ${timings.cruiseVmax} px/s |`);
console.log(`| Jump out: charge, tunnel | ${timings.jumpOut ? timings.jumpOut.charge + ' ms, ' + timings.jumpOut.tunnel + ' ms' : '-'} |`);
console.log(`| Jump home: charge, tunnel | ${timings.jumpHome ? timings.jumpHome.charge + ' ms, ' + timings.jumpHome.tunnel + ' ms' : '-'} |`);
console.log(`| Reload to the station | ${timings.reloadWallMs} ms wall |`);
writeFileSync(join(OUT, 'playthrough.json'), JSON.stringify({ when: new Date().toISOString(), timings, results }, null, 1));
process.exitCode = 0;
