// smoke: ship models and shipStat: the table pinned to the design, the Wren flies as before
// Ship models and shipStat (card space-game-u-a3-ship-models, docs/UNIVERSE.md 6.1 and 8.1). Pins two things:
//   1. the model table in src/data_ships.js against the numbers in the design doc (an independent copy below)
//   2. the Wren, which has to fly exactly as it always did: top speed 480, thrust 720 (600 while the launch lock holds, 1500
//      boosting), boost 800/1000/1150 by booster tier, turn 0.0036 rad/ms, hull 100 + 20 per plating tier.
// Part 1 needs no browser; part 2 runs the real Space scene with the game clock stepped by hand. Run: node tests/shipmodels.mjs
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { launch } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };

console.log('the model table against docs/UNIVERSE.md 6.1 and 7');
// id: [name, role, hull, speed, boost, accel, turn, tank, fuelPerLy, range, cargo, guns, sensor, price, partMult]
const DOC = {
  wren: ['Wren', 'starter, balanced', 100, 480, 800, 720, 1.0, 40, 1.0, 8, 10, 1, 1.0, 0, 1],
  kite: ['Kite', 'fast courier', 70, 580, 950, 900, 1.25, 30, 0.6, 14, 4, 1, 1.0, 4500, 0.8],
  ox: ['Ox', 'cargo hauler', 170, 360, 560, 520, 0.6, 70, 1.6, 8, 40, 1, 1.0, 6500, 1.2],
  talon: ['Talon', 'fighter', 130, 520, 880, 880, 1.35, 28, 1.2, 9, 3, 2, 1.0, 8500, 1.1],
  pathfinder: ['Pathfinder', 'explorer', 90, 440, 700, 700, 1.0, 90, 0.7, 18, 8, 1, 1.6, 11000, 1.1],
  bastion: ['Bastion', 'heavy', 320, 300, 480, 480, 0.5, 60, 2.0, 7, 20, 3, 1.0, 24000, 1.8]
};
const FIELDS = ['name', 'role', 'hull', 'speed', 'boost', 'accel', 'turn', 'tank', 'fuelPerLy', 'range', 'cargo', 'guns', 'sensor', 'price', 'partMult'];
const MODELS = vm.runInNewContext(readFileSync(join(ROOT, 'src/data_ships.js'), 'utf8') + '\n;SHIP_MODELS');
check('exactly the six models, in the doc order', Object.keys(MODELS).join() === Object.keys(DOC).join(), Object.keys(MODELS).join());
for (const [id, row] of Object.entries(DOC)) {
  const m = MODELS[id] || {};
  FIELDS.forEach((f, i) => check(`${id}.${f} is ${row[i]}`, m[f] === row[i], String(m[f])));
  check(`${id} has its id, a texture key and side player`, m.id === id && typeof m.art === 'string' && m.art && m.side === 'player');
  const slots = ['engine', 'shields', 'weapons', 'tank', 'cargo'];
  check(`${id} has a max tier of 1 to 3 for every slot`, slots.every(s => Number.isInteger(m.maxTier && m.maxTier[s]) && m.maxTier[s] >= 1 && m.maxTier[s] <= 3), JSON.stringify(m.maxTier));
}
check('the Wren uses today\'s texture "ship"', MODELS.wren.art === 'ship');
check('a courier cannot fit tier 3 weapons and a hauler can fit tier 3 cargo (section 7)', MODELS.kite.maxTier.weapons < 3 && MODELS.ox.maxTier.cargo === 3);

console.log('the Wren in the real game');
const t = await launch('#space');
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 30000, 'Space active');
  const SP = "game.scene.getScene('Space')";
  const stat = (name, rec) => t.ev(`shipStat(${JSON.stringify(name)}${rec ? ', ' + rec : ''})`);

  const want = { vmax: 480, speed: 480, boost: 800, accel: 720, turn: 1, hull: 100, tank: 40, fuelPerLy: 1, range: 8, hold: 10, cargo: 10, guns: 1, sensor: 1, price: 0 };
  for (const [k, v] of Object.entries(want)) check(`shipStat('${k}') is ${v}`, (await stat(k)) === v, String(await stat(k)));
  check('the hold equals ORE_CAP, the number the cargo hold always had', (await t.ev('shipStat("hold") === ORE_CAP')) === true);
  check('an unknown stat is undefined', (await t.ev('shipStat("banana") === undefined')) === true);
  check('an unknown model flies as the Wren', (await t.ev('shipStat("vmax", { model: "nope", parts: {} })')) === 480);
  check('a name from Object.prototype is not a model', (await t.ev('modelKnown("constructor") === false && modelKnown("__proto__") === false && modelKnown("wren") === true')) === true);
  check('newShip("kite") is a Kite with its hull and tank', (await t.ev('(() => { const r = newShip("kite"); return r.name === "Kite" && r.model === "kite" && r.hull === 70 && r.maxHull === 70 && r.fuel === 30; })()')) === true);
  check('newShip() is still the Wren: hull 100, tank 40', (await t.ev('(() => { const r = newShip(); return r.name === "Wren" && r.hull === 100 && r.fuel === 40 && r.uid === 1; })()')) === true);
  check('shipMaxTier answers from the model', (await t.ev('shipMaxTier("kite", "weapons") === 2 && shipMaxTier("ox", "cargo") === 3 && shipMaxTier("nope", "engine") === 3')) === true);

  console.log('booster and plating tiers');
  const tiers = async (key, vals, name) => {
    for (let i = 0; i < vals.length; i++) {
      await t.ev(`G.upgrades.${key} = ${i}`);
      check(`${key} tier ${i}: shipStat('${name}') is ${vals[i]}`, (await stat(name)) === vals[i], String(await stat(name)));
    }
    await t.ev(`G.upgrades.${key} = 0`);
  };
  await tiers('booster', [800, 1000, 1150], 'boost');
  check('boostMax() (shop.js) answers the same as shipStat("boost")', (await t.ev('(() => { G.upgrades.booster = 2; const ok = boostMax() === 1150 && boostMax() === shipStat("boost"); G.upgrades.booster = 0; return ok; })()')) === true);
  await tiers('armor', [100, 100, 100], 'hull'); // card u-d1: shields are points of their own, no part adds hull any more
  check('shipSync() sets the hull cap from the model (shields add none) and trims a hull above it', (await t.ev('(() => { G.upgrades.armor = 2; shipSync(); const a = G.maxHull; G.upgrades.armor = 0; G.hull = 140; shipSync(); const b = [G.maxHull, G.hull]; return a === 100 && b[0] === 100 && b[1] === 100; })()')) === true);
  check('the exact multiples: 720 x 5/6 is 600 and 720 x 25/12 is 1500', (await t.ev('shipStat("accel") * 5 / 6 === 600 && shipStat("accel") * 25 / 12 === 1500')) === true);

  console.log('flying: the numbers space.js really uses');
  await t.clock();
  await t.ev("(() => { const d0 = Date.now(), p0 = __t; performance.now = () => __t; Date.now = () => d0 + (__t - p0); return 1; })()");
  await t.ev(`(() => { ${SP}.enemies.clear(true, true); ${SP}.pirateOff = true; return 1; })()`);
  // The scene ran in real time while the tiers above were being set. Its top speed (boostCap, src/boost.js) follows a higher number up at once and falls back to the model's at BOOST.fall, so right after the stepped clock starts it
  // can still be on its way down (557 was seen, one run in four or five: card space-game-shipmodels-flake). Let it settle in stepped time, as the game does, then check: it must reach 480 and stay (a game that never got there fails).
  for (let i = 0; i < 40 && (await t.ev(`${SP}.ship.body.maxSpeed`)) !== 480; i++) await t.run(100);
  { const v = await t.ev(`${SP}.ship.body.maxSpeed`); check('the ship starts with max speed 480', v === 480, String(v)); }
  await t.run(1500); // past the launch lock (1.3 s)
  check('and still 480 when not boosting', (await t.ev(`${SP}.ship.body.maxSpeed`)) === 480);
  // thrust: W held. The key goes through DevTools so the real Phaser key handling reads it
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
  await t.run(200);
  const acc = await t.ev(`Math.round(Math.hypot(${SP}.ship.body.acceleration.x, ${SP}.ship.body.acceleration.y))`);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
  check('W gives thrust 720', acc === 720, String(acc));
  // turn: A held for 18 frames of 16.67 ms; the rate is 0.0036 rad per ms
  await t.ev(`(() => { ${SP}.ship.rotation = 0; ${SP}.k.A.isDown = true; return 1; })()`);
  await t.run(300);
  const rot = await t.ev(`${SP}.ship.rotation`);
  await t.ev(`(() => { ${SP}.k.A.isDown = false; return 1; })()`);
  const expect = -0.0036 * 16.67 * 18;
  check('A turns the ship at 0.0036 rad/ms (18 frames: ' + expect.toFixed(3) + ' rad)', Math.abs(rot - expect) < 0.011, rot.toFixed(4));
  // the Heavy feel (src/handling.js, card space-game-ship-weight): the same keys, the same frames, a ship with mass
  console.log('flying: the Heavy feel');
  check('the ship flies Classic until Heavy is picked: drag 0.55', (await t.ev('handlingNow().id')) === 'classic' && (await t.ev(`${SP}.ship.body.drag.x`)) === 0.55);
  await t.ev(`(() => { handlingSet('heavy'); ${SP}.ship.rotation = 0; ${SP}.hTurn = 0; ${SP}.hThrust = 0; ${SP}.k.A.isDown = true; return 1; })()`);
  await t.run(300);
  const hrot = await t.ev(`${SP}.ship.rotation`);
  check('Heavy: A for the same 18 frames turns it well under half as far, the turn is still building', hrot < -0.05 && hrot > expect * 0.5, hrot.toFixed(4));
  await t.run(400);
  const r1 = await t.ev(`${SP}.ship.rotation`); await t.run(100); const r2 = await t.ev(`${SP}.ship.rotation`);
  check('once built it turns at 0.85 of the Classic rate', Math.abs((r2 - r1) - -0.0036 * 0.85 * 16.67 * 6) < 0.012, (r2 - r1).toFixed(4));
  await t.ev(`(() => { ${SP}.k.A.isDown = false; return 1; })()`);
  const r3 = await t.ev(`${SP}.ship.rotation`); await t.run(100); const r4 = await t.ev(`${SP}.ship.rotation`); await t.run(400); const r5 = await t.ev(`${SP}.ship.rotation`); await t.run(100); const r6 = await t.ev(`${SP}.ship.rotation`);
  check('key up: it keeps turning a little, then holds its heading', r4 < r3 - 0.005 && r6 === r5, [r3, r4, r5, r6].map(x => x.toFixed(3)).join(' '));
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
  await t.run(200);
  const hacc = await t.ev(`Math.round(Math.hypot(${SP}.ship.body.acceleration.x, ${SP}.ship.body.acceleration.y))`);
  await t.run(1000);
  const hfull = await t.ev(`Math.round(Math.hypot(${SP}.ship.body.acceleration.x, ${SP}.ship.body.acceleration.y))`);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
  check('Heavy: W for 200 ms is a fraction of the thrust (the ramp)', hacc > 0 && hacc < 100, String(hacc));
  check('and 360 once it has ramped: half the Wren\'s 720', hfull === 360, String(hfull));
  check('Heavy drag 0.78 while coasting, top speed still 480', (await t.ev(`${SP}.ship.body.drag.x`)) === 0.78 && (await t.ev(`${SP}.ship.body.maxSpeed`)) === 480);
  await t.ev("handlingSet('classic')");
  await t.run(50);
  check('back to Classic: drag 0.55 again', (await t.ev(`${SP}.ship.body.drag.x`)) === 0.55);
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); failed++; } finally { await t.close(); }

console.log(failed ? `\nSHIP MODELS FAIL (${failed} of ${n} checks)` : `\nSHIP MODELS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
