// not in the smoke: the playtest round 4 walk (docs/PLAYTEST4.md), run by hand: about 5 minutes
// Playtest round 4 (card space-game-playtest-4): the new flight, played in the real game in headless Chrome the way tests/playtest3.mjs
// walks the loop. One Chrome at a time (tests/lock.mjs), --mute-audio, the game clock stepped by hand so every number is exact whatever
// the load. It flies each order of the flight assist and measures it (seconds, top speed, how close, how often the engine cuts in and out,
// how far past the mark), clicks with a real mouse event, flies Classic and Heavy by hand on the same course, fights raiders with the
// assist holding the range, and flies beside the MULE. A step never stops the walk: what it saw is written down and the next one runs.
// A step for a part that is not in the tree it runs against (Orbit, Match speed, the HUD panel, the lounge keys) says "not here" and passes.
// The result is printed and saved to tests/out/playtest4.json; the human reading is docs/PLAYTEST4.md.
// Run: node tests/playtest4.mjs            against this checkout
//      PT4_ROOT=~/dev/spacegame-playtest-4-mix node tests/playtest4.mjs      against another tree (a scratch branch that merges the flight cards)
import { launch, sleep, OUT, ROOT } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const GAME = process.env.PT4_ROOT ? resolve(process.env.PT4_ROOT.replace(/^~/, homedir())) : ROOT;
const SP = "game.scene.getScene('Space')";
const results = [];
let t = null, errSeen = 0;
const VK = { A: [65, 'KeyA', 'a'], D: [68, 'KeyD', 'd'], S: [83, 'KeyS', 's'], W: [87, 'KeyW', 'w'], Z: [90, 'KeyZ', 'z'], C: [67, 'KeyC', 'c'], P: [80, 'KeyP', 'p'], L: [76, 'KeyL', 'l'], N: [78, 'KeyN', 'n'],
  1: [49, 'Digit1', '1'], 2: [50, 'Digit2', '2'], 3: [51, 'Digit3', '3'], 4: [52, 'Digit4', '4'], SPACE: [32, 'Space', ' '], ENTER: [13, 'Enter', 'Enter'] };
const kev = (name, type) => { const [code, key, ch] = VK[name]; return t.send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch }); };
const E = x => t.ev(x);
const JE = async x => JSON.parse(await t.ev(`JSON.stringify(${x})`));
const tick = async n => { for (let left = n; left > 0; left -= 60) await E(`(() => { __recTick(${Math.min(60, left)}); return 1; })()`); };
const skey = async name => { await kev(name, 'keyDown'); await tick(3); await kev(name, 'keyUp'); await tick(3); };
const hold = (name, down) => kev(name, down ? 'keyDown' : 'keyUp');
const has = name => E(`typeof ${name} !== 'undefined'`);
const said = () => JE('window.__toasts.slice(-6)');
const r1 = v => Math.round(v * 10) / 10;

async function step(name, fn) {
  const r = { step: name, ok: true, detail: '', errors: [] };
  try { const d = await fn(); if (typeof d === 'string') r.detail = d; else if (d && typeof d === 'object') { r.data = d; r.detail = JSON.stringify(d); } }
  catch (e) { r.ok = false; r.detail = 'threw: ' + e.message; }
  try { await t.shot('pt4-' + name); await t.shot('pt4-' + name); } catch (e) { r.detail += ' (no screenshot)'; }
  r.errors = t.errors.slice(errSeen); errSeen = t.errors.length;
  results.push(r);
  console.log(`  ${r.ok && !r.errors.length ? 'ok  ' : 'LOOK'} ${name}  ${r.detail}${r.errors.length ? '  ERRORS: ' + r.errors.join(' | ').slice(0, 300) : ''}`);
  return r;
}

// the page side: a recorder that samples every stepped frame, and the helpers every step uses
const PAGE = `(() => {
  const s = () => game.scene.getScene('Space');
  window.__toasts = []; const orig = toast; toast = (sc, msg, c) => { window.__toasts.push(msg); return orig(sc, msg, c); };
  const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0);
  window.__T = null; window.__rec = null;
  window.__recStart = T => { window.__T = T || null; const sc = s();
    window.__rec = { f: 0, maxV: 0, minD: 1e9, maxD: 0, sumD: 0, burnOn: 0, burnFrames: 0, brakeFrames: 0, lastBurn: false, flips: 0, lastSign: 0, lastRot: sc.ship.rotation, endF: -1, hull0: G.hull, shots: 0, turned: 0 }; };
  window.__recTick = n => { for (let i = 0; i < n; i++) { tick(1); const sc = s(), r = window.__rec; if (!r || !sc || !sc.ship || !sc.ship.body) continue;
    r.f++; const v = sc.ship.body.speed; r.maxV = Math.max(r.maxV, v);
    const T = typeof window.__T === 'function' ? window.__T() : window.__T;
    if (T) { const d = Math.hypot(T.x - sc.ship.x, T.y - sc.ship.y); r.minD = Math.min(r.minD, d); r.maxD = Math.max(r.maxD, d); r.sumD += d; r.d = d; }
    const a = sc.as, burn = !!(a && a.mode && a.cmd && a.cmd.burn); if (burn && !r.lastBurn) r.burnOn++; if (burn) r.burnFrames++; if (a && a.mode && a.cmd && a.cmd.brake) r.brakeFrames++; r.lastBurn = burn;
    const dr = Math.atan2(Math.sin(sc.ship.rotation - r.lastRot), Math.cos(sc.ship.rotation - r.lastRot)), sg = Math.abs(dr) < 1e-5 ? 0 : Math.sign(dr);
    if (sg && r.lastSign && sg !== r.lastSign) r.flips++; if (sg) r.lastSign = sg; r.turned += Math.abs(dr); r.lastRot = sc.ship.rotation;
    if (r.endF < 0 && a && !a.mode && r.hadMode) r.endF = r.f; if (a && a.mode) r.hadMode = true; r.v = v; } };
  window.__recEnd = () => { const r = window.__rec, sc = s(); return { secs: Math.round(r.f / 6) / 10, endSecs: r.endF < 0 ? null : Math.round(r.endF / 6) / 10, maxV: Math.round(r.maxV), v: Math.round(r.v), d: r.d === undefined ? null : Math.round(r.d),
    minD: r.minD > 1e8 ? null : Math.round(r.minD), maxD: Math.round(r.maxD), meanD: r.f ? Math.round(r.sumD / r.f) : null, engineStarts: r.burnOn, burnPct: Math.round(100 * r.burnFrames / Math.max(1, r.f)), brakePct: Math.round(100 * r.brakeFrames / Math.max(1, r.f)),
    noseFlips: r.flips, turnedRad: Math.round(r.turned * 10) / 10, hullLost: Math.round(r.hull0 - G.hull), mode: sc.as ? sc.as.mode : '', status: sc.as && sc.as.cmd ? sc.as.cmd.status : '' }; };
  window.__park = (x, y, rot) => { const sc = s(); sc.enemies.getChildren().slice().forEach(d => d.destroy()); sc.eb.getChildren().forEach(b => b.disableBody(true, true));
    if (sc.cr.active) cruiseEnd(sc, 'quiet'); if (sc.ap && sc.ap.on) autopilotEnd(sc, 'quiet'); if (typeof assistSet === 'function') assistSet(''); sc.cr.target = null; if (sc.cm) { sc.cm.pick = null; sc.cm.point = null; }
    sc.ship.setPosition(x, y); sc.ship.setVelocity(0, 0); sc.ship.rotation = rot || 0; sc.ship.body.setAcceleration(0, 0); sc.cameras.main.centerOn(x, y);
    (sc.toasts || []).forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); sc.toasts = []; window.__toasts = []; G.hull = G.maxHull; sc.ironUntil = 0; sc.lockUntil = 0; sc.calmUntil = sc.time.now + 3600000; return 1; };
  // where a world point is on the page, for a real mouse event
  window.__client = (wx, wy) => { const sc = s(), cam = sc.cameras.main, r = game.canvas.getBoundingClientRect(); const px = (wx - cam.worldView.x) * cam.zoom, py = (wy - cam.worldView.y) * cam.zoom;
    return { x: r.left + px * r.width / game.config.width, y: r.top + py * r.height / game.config.height, on: px >= 0 && py >= 0 && px <= game.config.width && py <= game.config.height }; };
  window.__canvasClient = (px, py) => { const r = game.canvas.getBoundingClientRect(); return { x: r.left + px * r.width / game.config.width, y: r.top + py * r.height / game.config.height }; };
  return 1; })()`;

const click = async (pos, release = true) => {
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos.x, y: pos.y, button: 'none', buttons: 0 }); await tick(2);
  await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', buttons: 1, clickCount: 1 }); await tick(3);
  if (release) { await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', buttons: 0, clickCount: 1 }); await tick(2); }
};
const clickWorld = async (wx, wy) => { const pos = await JE(`__client(${wx}, ${wy})`); await click(pos); return pos; };
// fly the order that is set until it ends or the frames run out
const flyOrder = async (maxFrames, untilEnd = true) => { for (let f = 0; f < maxFrames; f += 60) { await tick(60); if (untilEnd && !(await E(`${SP}.as.mode`))) break; } return JE('__recEnd()'); };
const assistOnNow = async () => { if (!(await E('ASSIST.on'))) await skey('Z'); return E('ASSIST.on'); };

async function open(hash) {
  t = await launch(hash, GAME); errSeen = 0;
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500); await E('G.guideDone = true');
  await t.clock(); await E(PAGE); await E('__recStart(null)');
}

const FAR = [20000, 30000]; // empty space in Halcyon, far from every body
console.log('playtest 4 against ' + GAME);

// ================= 1. the assist and the mouse, in open space and at the station =================
await open('#space');
try {
  const st = await JE(`(() => { const b = sysBody('station'); return { x: b.x, y: b.y, name: b.name }; })()`);
  const planet = await JE(`(() => { const b = sysBody('planet'); return { x: b.x, y: b.y, r: b.r, name: b.name }; })()`);
  const parts = { assist: await has('assistSet'), click: await has('clickmoveClick'), handling: await has('handlingSet'), orbit: await E(`typeof ASSIST_MODES !== 'undefined' && !!ASSIST_MODES.orbit`), match: await E(`typeof ASSIST_MODES !== 'undefined' && !!ASSIST_MODES.match`), hud: await has('assistHud') };
  await step('parts', async () => parts);
  if (!parts.assist) throw new Error('this tree has no flight assist: nothing to play');

  await step('z-on', async () => { await E(`__park(${FAR[0]}, ${FAR[1]})`); await skey('Z'); await tick(20); return { on: await E('ASSIST.on'), toast: (await said()).pop(), readout: await E(`${SP}.as.read.visible ? ${SP}.as.read.text : '(hidden)'`), modes: await JE('assistState().keys.map(k => k.cap + " " + k.label)') }; });
  await step('one-with-no-target', async () => { await skey('1'); return { mode: await E(`${SP}.as.mode`), toast: (await said()).pop() }; });

  // Approach the station from 3000 px, nose pointing away from it
  await step('approach-station-3000', async () => { await E(`__park(${st.x + 3000}, ${st.y}, 0)`); await assistOnNow(); await E(`cruisePick(${SP}, cruiseKnown(${SP}).find(b => b.type === 'station'))`); await E(`__recStart({ x: ${st.x}, y: ${st.y} })`);
    await skey('1'); const r = await flyOrder(60 * 40); await tick(30);
    r.dockPrompt = await E(`${SP}.prompt.text`); r.toast = (await said()).pop(); return r; });
  await step('dock-after-approach', async () => { await skey('L'); await tick(90); return { scenes: await E(`game.scene.getScenes(true).map(s => s.scene.key).join('+')`), leaving: await E(`!!${SP}.leaving`), toast: (await said()).pop() }; });
  // if L docked, come back out
  if (!(await E(`game.scene.isActive('Space')`))) { await t.close(); await open('#space'); }

  await step('approach-planet-2500', async () => { await E(`__park(${planet.x + planet.r + 2500}, ${planet.y}, Math.PI / 2)`); await assistOnNow(); await E(`cruisePick(${SP}, cruiseKnown(${SP}).find(b => b.type === 'planet'))`); await E(`__recStart({ x: ${planet.x}, y: ${planet.y} })`);
    await skey('1'); const r = await flyOrder(60 * 40); await tick(30); r.edge = r.d - planet.r; r.landPrompt = await E(`${SP}.prompt.text`); return r; });

  // Approach when already moving fast sideways: does it kill the drift or swing wide
  await step('approach-point-with-drift', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await E(`${SP}.ship.setVelocity(0, 400)`); await E(`__recStart({ x: ${FAR[0] + 1500}, y: ${FAR[1]} })`);
    await E(`assistSet('approach', { x: ${FAR[0] + 1500}, y: ${FAR[1]} }, 0)`); const r = await flyOrder(60 * 40); r.driftY = Math.round((await E(`${SP}.ship.y`)) - FAR[1]); return r; });

  // Keep at range on a still target, from outside and from inside
  for (const [name, start] of [['keep-from-outside-2000', 2000], ['keep-from-inside-150', 150]]) {
    await step(name, async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await E(`__recStart({ x: ${FAR[0] + start}, y: ${FAR[1]} })`);
      await E(`assistSet('keep', { x: ${FAR[0] + start}, y: ${FAR[1]}, name: 'the buoy' })`); await flyOrder(60 * 15, false);
      const settle = await JE('__recEnd()'); await E(`__recStart(window.__T)`); await tick(60 * 10); const hold = await JE('__recEnd()');
      return { range: await E(`${SP}.as.range`), settle: { maxV: settle.maxV, minD: settle.minD, engineStarts: settle.engineStarts, noseFlips: settle.noseFlips }, hold10s: { minD: hold.minD, maxD: hold.maxD, v: hold.v, engineStarts: hold.engineStarts, burnPct: hold.burnPct, brakePct: hold.brakePct, noseFlips: hold.noseFlips, status: hold.status } }; });
  }

  // Keep at range on a real raider that fights back, Space held: 25 s
  await step('keep-on-raider-fight', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow();
    await E(`(() => { const s = ${SP}; window.__foe = spawnPirate(s, s.ship.x + 700, s.ship.y - 200, 'raider'); window.__kills = 0; const k = s.killDrone; s.killDrone = function (e) { window.__kills++; return k.apply(s, arguments); }; return 1; })()`);
    await E(`__recStart(() => (window.__foe && window.__foe.active ? window.__foe : null))`);
    const took = await E(`assistSet('keep', window.__foe)`); await hold('SPACE', true); const r = await flyOrder(60 * 25); await hold('SPACE', false); await tick(5);
    return { took, firstKillSecs: r.endSecs, kills: await E('window.__kills'), secs: r.secs, hullLost: r.hullLost, minD: r.minD, maxD: r.maxD, meanD: r.meanD, engineStarts: r.engineStarts, noseFlips: r.noseFlips, endMode: r.mode, toast: (await said()).pop() }; });
  // the same fight by hand is not scripted: a script cannot fly like a person. Two raiders with the assist, to see if it copes
  await step('keep-on-two-raiders', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow();
    await E(`(() => { const s = ${SP}; window.__foe = spawnPirate(s, s.ship.x + 700, s.ship.y - 200, 'raider'); window.__foe2 = spawnPirate(s, s.ship.x - 600, s.ship.y + 300, 'raider'); window.__kills = 0; return 1; })()`);
    await E(`__recStart(() => (window.__foe && window.__foe.active ? window.__foe : null))`);
    await E(`assistSet('keep', window.__foe)`); await hold('SPACE', true); const r = await flyOrder(60 * 30); await hold('SPACE', false); await tick(5);
    return { kills: await E('window.__kills'), secs: r.secs, hullLost: r.hullLost, endMode: r.mode, dead: await E(`!!${SP}.dead`), toast: (await said()).pop() }; });
  if (!(await E(`game.scene.isActive('Space')`)) || (await E(`!!${SP}.dead`))) { await t.close(); await open('#space'); }

  // Orbit and Match speed (card space-game-assist-orbit-match), when they are in the tree
  await step('orbit-buoy', async () => { if (!parts.orbit) return 'not here yet';
    await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await E(`__recStart({ x: ${FAR[0] + 1500}, y: ${FAR[1]} })`);
    const took = await E(`assistSet('orbit', { x: ${FAR[0] + 1500}, y: ${FAR[1]}, name: 'the buoy' })`); await flyOrder(60 * 20, false); await E(`__recStart(window.__T)`); await tick(60 * 20); const r = await JE('__recEnd()');
    return { took, range: await E(`${SP}.as.range`), over20s: { minD: r.minD, maxD: r.maxD, meanD: r.meanD, v: r.v, maxV: r.maxV, turnedRad: r.turnedRad, engineStarts: r.engineStarts, burnPct: r.burnPct, noseFlips: r.noseFlips, status: r.status } }; });
  await step('match-speed-moving-ship', async () => { if (!parts.match) return 'not here yet';
    await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow();
    await E(`(() => { const s = ${SP}; const e = window.__foe = s.physics.add.sprite(s.ship.x + 600, s.ship.y + 200, 'freighter'); e.setVelocity(140, -60); e.name = 'the hauler'; return 1; })()`);
    await E(`__recStart(() => window.__foe)`); const took = await E(`assistSet('match', window.__foe)`); await flyOrder(60 * 15, false);
    const r = await JE('__recEnd()'); const rel = await JE(`(() => { const s = ${SP}, v = s.ship.body.velocity; return Math.round(Math.hypot(v.x - 140, v.y + 60)); })()`); await E('window.__foe.destroy()');
    return { took, relSpeedAfter15s: rel, d: r.d, engineStarts: r.engineStarts, noseFlips: r.noseFlips, status: r.status, mode: r.mode }; });

  // ---- the mouse ----
  if (parts.click) {
    await step('click-off-is-a-shot', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); if (await E('ASSIST.on')) await skey('Z'); const n0 = await E(`${SP}.pb.countActive(true)`); await clickWorld(FAR[0] + 300, FAR[1] - 100); return { order: await E(`${SP}.as.mode`), bullets: (await E(`${SP}.pb.countActive(true)`)) - n0 }; });
    for (const [name, dx, dy] of [['click-near-200', 200, 0], ['click-ahead-500', 500, -150], ['click-behind-400', -400, 0]]) {
      await step(name, async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await tick(10); await E(`__recStart({ x: ${FAR[0] + dx}, y: ${FAR[1] + dy} })`);
        const n0 = await E(`${SP}.pb.countActive(true)`); const pos = await clickWorld(FAR[0] + dx, FAR[1] + dy); const mode = await E(`${SP}.as.mode`), bullets = (await E(`${SP}.pb.countActive(true)`)) - n0;
        const r = await flyOrder(60 * 20); return { onScreen: pos.on, order: mode, bullets, secs: r.endSecs, maxV: r.maxV, endD: r.d, v: r.v, engineStarts: r.engineStarts, noseFlips: r.noseFlips, brakePct: r.brakePct }; });
    }
    await step('click-again-mid-flight', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await tick(10); await clickWorld(FAR[0] + 500, FAR[1]); await tick(45);
      const at = await JE(`({ x: ${SP}.ship.x, y: ${SP}.ship.y })`); const T = { x: Math.round(at.x), y: Math.round(at.y - 300) }; await E(`__recStart({ x: ${T.x}, y: ${T.y} })`); await clickWorld(T.x, T.y);
      const r = await flyOrder(60 * 20); return { secs: r.endSecs, endD: r.d, v: r.v, maxD: r.maxD, engineStarts: r.engineStarts, noseFlips: r.noseFlips }; });
    await step('click-held-button', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await tick(10); const n0 = await E(`${SP}.pb.countActive(true)`);
      const pos = await JE(`__client(${FAR[0] + 400}, ${FAR[1]})`); await click(pos, false); await tick(90); const held = (await E(`${SP}.pb.countActive(true)`)) - n0;
      await hold('SPACE', true); await tick(30); await hold('SPACE', false); const withSpace = (await E(`${SP}.pb.countActive(true)`)) - n0;
      await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', buttons: 0, clickCount: 1 }); await tick(5);
      return { bulletsWhileHeld: held, bulletsWithSpaceWhileHeld: withSpace, note: 'the button held after an order: does Space still fire?' }; });
    await step('click-on-hud-panel', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await tick(10);
      const out = {}; for (const [what, px, py] of [['mission panel', 180, 230], ['radar', 1105, 100], ['hull gauge', 140, 70], ['key line at the bottom', 400, 600]]) { await E(`assistSet('')`); await click(await JE(`__canvasClient(${px}, ${py})`)); out[what] = (await E(`${SP}.as.mode`)) || 'no order'; }
      return out; });
    await step('click-station', async () => { await E(`__park(${st.x + 500}, ${st.y + 100}, 0)`); await assistOnNow(); await tick(10); const pos = await clickWorld(st.x, st.y);
      const r = { onScreen: pos.on, navTarget: await E(`${SP}.cr.target ? ${SP}.cr.target.name : ''`), order: await E(`${SP}.as.mode`), toast: (await said()).pop() }; await skey('1'); r.afterOne = await E(`${SP}.as.mode + ' ' + (${SP}.as.target ? ${SP}.as.target.name : '')`); return r; });
    await step('click-ship-then-keys', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await tick(10);
      await E(`(() => { const s = ${SP}; window.__foe = spawnPirate(s, s.ship.x + 350, s.ship.y - 120, 'drone'); return 1; })()`); await tick(2);
      const f = await JE(`({ x: window.__foe.x, y: window.__foe.y })`); await clickWorld(f.x, f.y);
      const r = { picked: await E(`${SP}.cm.pick === window.__foe`), toast: (await said()).pop() }; await skey('2'); r.afterTwo = await E(`${SP}.as.mode + ' ' + (${SP}.as.target === window.__foe ? 'on the drone' : 'on something else')`);
      await skey('1'); r.afterOne = await E(`${SP}.as.mode`); return r; });
    await step('click-miss-beside-ship', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await tick(10);
      await E(`(() => { const s = ${SP}; window.__foe = spawnPirate(s, s.ship.x + 350, s.ship.y - 120, 'raider'); return 1; })()`); await tick(2);
      const out = {}; for (const off of [20, 40, 60]) { await E(`(assistSet(''), ${SP}.cm.pick = null, 1)`); const f = await JE(`({ x: window.__foe.x, y: window.__foe.y })`); await clickWorld(f.x + off, f.y); out[off + ' px off'] = (await E(`!!${SP}.cm.pick`)) ? 'picked the ship' : 'flew to the point'; }
      return out; });
  } else await step('click', async () => 'not here yet');

  // ---- the assist against the other pilots of the ship ----
  await step('assist-then-P-autopilot', async () => { await E(`__park(${st.x + 2500}, ${st.y}, 0)`); await assistOnNow(); await E(`cruisePick(${SP}, cruiseKnown(${SP}).find(b => b.type === 'station'))`); await skey('1'); await tick(30); await skey('P'); await tick(10);
    return { assist: (await E(`${SP}.as.mode`)) || 'ended', autopilot: await E(`${SP}.ap.on`), toasts: (await said()).slice(-2) }; });
  await step('P-then-assist', async () => { await tick(30); await skey('1'); await tick(10); return { assist: (await E(`${SP}.as.mode`)) || 'none', autopilot: await E(`${SP}.ap.on`), toasts: (await said()).slice(-2) }; });
  await step('hit-while-assist-flies', async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await E(`assistSet('approach', { x: ${FAR[0] + 3000}, y: ${FAR[1]} }, 0)`); await tick(60); await E(`${SP}.hurt(10, ${SP}.ship.x, ${SP}.ship.y + 30)`); await tick(10);
    return { stillFlying: (await E(`${SP}.as.mode`)) === 'approach', hull: await E('G.hull') }; });
  await step('z-off-mid-order', async () => { await skey('Z'); await tick(5); return { on: await E('ASSIST.on'), mode: (await E(`${SP}.as.mode`)) || 'ended', toast: (await said()).pop() }; });

  // ---- Classic against Heavy, by hand, the same course ----
  if (parts.handling) {
    for (const id of ['classic', 'heavy']) {
      await step('hand-' + id, async () => { await E(`handlingSet('${id}')`); await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); if (await E('ASSIST.on')) await skey('Z'); await tick(5);
        const out = { id: await E('handlingNow().id') }; await E('__recStart(null)');
        await hold('W', true); const sp = {}; let f = 0; for (const mark of [30, 60, 120, 180, 300]) { await tick(mark - f); f = mark; sp[(mark / 60) + ' s'] = Math.round(await E(`${SP}.ship.body.speed`)); } out.speedHoldingW = sp;
        await hold('W', false); const x0 = await E(`${SP}.ship.x`); let c = 0; while (c < 900 && (await E(`${SP}.ship.body.speed`)) > 20) { await tick(15); c += 15; } out.coastToRest = { secs: r1(c / 60), px: Math.round((await E(`${SP}.ship.x`)) - x0) };
        await hold('W', true); await tick(240); await hold('W', false); await hold('S', true); const x1 = await E(`${SP}.ship.x`); c = 0; while (c < 900 && (await E(`${SP}.ship.body.speed`)) > 20) { await tick(5); c += 5; } await hold('S', false); out.brakeToRest = { secs: r1(c / 60), px: Math.round((await E(`${SP}.ship.x`)) - x1) };
        await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await hold('D', true); c = 0; while (c < 600 && Math.abs(await E(`${SP}.ship.rotation`)) < Math.PI - 0.1 && (await E(`${SP}.ship.rotation`)) >= 0) { await tick(3); c += 3; } await hold('D', false); out.turn180Secs = r1(c / 60);
        const rot0 = await E(`${SP}.ship.rotation`); await tick(40); out.turnAfterLetGoDeg = Math.round(Math.abs(Math.atan2(Math.sin((await E(`${SP}.ship.rotation`)) - rot0), Math.cos((await E(`${SP}.ship.rotation`)) - rot0))) * 180 / Math.PI);
        await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await hold('D', true); await tick(6); await hold('D', false); await tick(40); out.tapDDeg = r1(Math.abs(await E(`${SP}.ship.rotation`)) * 180 / Math.PI);
        return out; });
      await step('assist-approach-under-' + id, async () => { await E(`__park(${FAR[0]}, ${FAR[1]}, Math.PI)`); await assistOnNow(); await E(`__recStart({ x: ${FAR[0] + 2000}, y: ${FAR[1]} })`); await E(`assistSet('approach', { x: ${FAR[0] + 2000}, y: ${FAR[1]} }, 0)`);
        const r = await flyOrder(60 * 40); return { handling: await E('handlingNow().id'), secs: r.endSecs, maxV: r.maxV, endD: r.d, engineStarts: r.engineStarts, note: 'the same seconds under both feels means the assist flies its own model' }; });
    }
    await E(`handlingSet('classic')`);
  } else await step('handling', async () => 'not here yet');

  await step('hud-panel', async () => { if (!parts.hud) return 'not here yet'; await E(`__park(${FAR[0]}, ${FAR[1]}, 0)`); await assistOnNow(); await E(`assistSet('keep', { x: ${FAR[0] + 900}, y: ${FAR[1]}, name: 'the buoy' })`); await tick(120); return { state: await JE('assistState()'), ownReadout: await E('ASSIST.readout') }; });
} catch (e) { console.log('  LOOK section 1 stopped: ' + e.message); results.push({ step: 'section-1', ok: false, detail: 'stopped: ' + e.message, errors: [] }); }
finally { if (t) await t.close(); }

// ================= 2. the escort: fly beside the MULE with the assist =================
await open('#escort');
try {
  await step('escort-start', async () => { await tick(60 * 3); return { mule: await E(`!!(${SP}.mx && ${SP}.mx.freighter)`), muleSpeed: await E(`${SP}.mx && ${SP}.mx.freighter && ${SP}.mx.freighter.body ? Math.round(${SP}.mx.freighter.body.speed) : null`), d: await E(`Math.round(Math.hypot(${SP}.mx.freighter.x - ${SP}.ship.x, ${SP}.mx.freighter.y - ${SP}.ship.y))`) }; });
  if (await has('assistSet')) {
    await step('escort-keep-on-mule-30s', async () => { await assistOnNow(); await E(`${SP}.calmUntil = ${SP}.time.now + 3600000; ${SP}.enemies.getChildren().slice().forEach(d => d.destroy())`);
      await E(`__recStart(() => ${SP}.mx.freighter)`); const took = await E(`assistSet('keep', ${SP}.mx.freighter, 250)`); const said1 = (await said()).pop(); await flyOrder(60 * 10, false); await E(`__recStart(() => ${SP}.mx.freighter)`); await tick(60 * 20); const r = await JE('__recEnd()');
      return { took, said: said1, over20s: { minD: r.minD, maxD: r.maxD, meanD: r.meanD, v: r.v, engineStarts: r.engineStarts, burnPct: r.burnPct, brakePct: r.brakePct, noseFlips: r.noseFlips, status: r.status, mode: r.mode } }; });
    if (await has('clickmoveClick')) await step('escort-click-mule', async () => { await E(`assistSet('')`); await tick(5); const f = await JE(`({ x: ${SP}.mx.freighter.x, y: ${SP}.mx.freighter.y })`); const pos = await clickWorld(f.x, f.y); return { onScreen: pos.on, picked: await E(`${SP}.cm.pick === ${SP}.mx.freighter`), toast: (await said()).pop() }; });
    await step('escort-with-pirates-keep-and-fire', async () => { await E(`${SP}.calmUntil = 0`); await E(`(() => { const s = ${SP}, f = s.mx.freighter; spawnPirate(s, f.x + 500, f.y - 300, 'raider'); spawnPirate(s, f.x - 450, f.y + 350, 'raider'); return 1; })()`);
      await E(`__recStart(() => ${SP}.mx.freighter)`); await E(`assistSet('keep', ${SP}.mx.freighter, 250)`); await hold('SPACE', true); await tick(60 * 25); await hold('SPACE', false); const r = await JE('__recEnd()');
      return { hullLost: r.hullLost, muleHull: await E(`${SP}.mx.freighterHp !== undefined ? ${SP}.mx.freighterHp : (${SP}.mx.freighter.hp !== undefined ? ${SP}.mx.freighter.hp : null)`), pirateLeft: await E(`${SP}.enemies.countActive(true)`), minD: r.minD, maxD: r.maxD, mode: r.mode, note: 'the assist holds the MULE; the guns point where the nose points, so do they ever bear on a pirate?' }; });
  }
} catch (e) { console.log('  LOOK section 2 stopped: ' + e.message); results.push({ step: 'section-2', ok: false, detail: 'stopped: ' + e.message, errors: [] }); }
finally { if (t) await t.close(); }

writeFileSync(join(OUT, 'playtest4.json'), JSON.stringify({ game: GAME, at: new Date().toISOString(), results }, null, 1));
const look = results.filter(r => !r.ok || r.errors.length);
console.log(`\nplaytest 4: ${results.length} steps, ${look.length} to look at (${look.map(r => r.step).join(', ') || 'none'}); tests/out/playtest4.json`);
process.exit(0);
