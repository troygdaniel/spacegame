// smoke: autotarget: the sixth part: its table, prices and stock, the save and the R switch, the aim and the lead, the reticle, in flight
// The autotarget (card space-game-cannon-autotarget, src/autotarget.js, PARTS.aim in src/data_parts.js).
//   Part 1 runs the game's scripts in plain Node (tests/nodegame.mjs): the table, shipStat, prices and which station sells which tier, what each hull
//   can fit, the save and a reload (the part and the R switch), the lead mathematics, and aimPick and aimAngle on a made-up scene.
//   Part 2 opens the real page once (#space) and flies: the guns turn to the nearest raider in reach, a farther one is left alone, the shot leads a
//   moving one from tier 2, the reticle sits on the target, R switches it off and on (and does nothing with no part), and a part bought in the shop
//   with key 6 is fitted.
// Run: node tests/autotarget.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { launch } from './cdp.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  (' + detail + ')' : '')); if (!cond) failed++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------------ part 1: Node
console.log('A. the table, the numbers, the prices');
const store = new Map();
let g = nodeGame({ store });
const J = async (x, game = g) => JSON.parse(await game.ev(`JSON.stringify(${x})`));
check('six slots in shop order, the autotarget last', (await J('PART_ORDER')).join() === 'shields,weapons,engine,tank,cargo,aim');
const P = await J('PARTS.aim');
check('three tiers with names, prices 500, 800, 1400, the HUD word AIM', P.tiers.join() === 'AUTOTARGET,AUTOTARGET II,AUTOTARGET III' && P.prices.join() === '500,800,1400' && P.short === 'AIM');
check('the reach grows 450, 650, 850 px and no tier reaches past a shot (950 px/s for 900 ms)', P.range.join() === '0,450,650,850' && P.range[3] <= 950 * 0.9);
check('only tiers 2 and 3 lead a moving target', P.lead.join() === '0,0,1,1');
const stat = async tier => J(`(() => { G.fleet[G.active].parts.aim = ${tier}; return [shipStat('aimRange'), shipStat('aimLead')]; })()`);
check('shipStat gives the reach and the lead of the fitted tier (0 and 0 with none)', (await stat(0)).join() === '0,0' && (await stat(1)).join() === '450,0' && (await stat(2)).join() === '650,1' && (await stat(3)).join() === '850,1');
check('the first tier costs 500 at list price, and a ship scales it like any part', await g.ev(`partPrice('aim', 1, 'wren', {}) === 500 && partPrice('aim', 3, 'wren', {}) === 1400 && partPrice('aim', 1, 'bastion', {}) === Math.round(500 * shipModel('bastion').partMult / 10) * 10`));

console.log('B. who sells it, and who can fit it');
const caps = await J(`(() => { const out = {}; Object.values(SYSTEMS).forEach(s => s.bodies.filter(b => b.type === 'station').forEach(b => { out[b.id] = partStockCap('aim', b.dock || {}); })); return out; })()`);
check('Halcyon sells tiers 1 and 2 (the default), Meridian, Ember and the Roost sell tier 3', caps['halcyon-station'] === 2 && caps['meridian-exchange'] === 3 && caps['ember-foundry'] === 3 && caps['roost-dock'] === 3, JSON.stringify(caps));
check('Kestrel and Brass Reach, which sell only some parts, do not sell it', caps['kestrel-outpost'] === 0 && caps['brass-smelter'] === 0, JSON.stringify(caps));
check('every hull fits as many tiers of it as of the weapons (the Kite 2, the Talon 3)', await g.ev(`Object.keys(SHIP_MODELS).every(m => shipMaxTier(m, 'aim') === shipMaxTier(m, 'weapons')) && shipMaxTier('kite', 'aim') === 2 && shipMaxTier('talon', 'aim') === 3`));
check('what a ship\'s fitted parts are worth (and so half of it at sale) counts the autotarget\'s tiers: 500 and 800', await g.ev(`(() => { const r = G.fleet[G.active]; Object.keys(r.parts).forEach(k => { r.parts[k] = 0; }); const a = fleetPartsValue(r); r.parts.aim = 2; return fleetPartsValue(r) - a === 500 + 800; })()`));

console.log('C. the save');
await g.ev(`(() => { G.fleet[G.active].parts.aim = 2; G.aimOff = true; saveGame(); return 1; })()`);
const g2 = nodeGame({ store });   // the same storage: the page reloaded
check('a reload keeps the part and the switch', (await J('[G.fleet[G.active].parts.aim, G.aimOff]', g2)).join() === '2,true');
const old = new Map(); old.set('longhaul.save.v2', JSON.stringify({ v: 2, credits: 5, fleet: [{ uid: 1, model: 'wren', name: 'Wren', at: 'halcyon-station', hull: 100, fuel: 40, ore: 0, parts: { engine: 1, shields: 0, weapons: 2, tank: 0, cargo: 0 } }], active: 0 }));
const g3 = nodeGame({ store: old });
check('a save from before the part loads with none fitted and the switch on', (await J('[G.fleet[G.active].parts.aim, G.aimOff, G.fleet[G.active].parts.weapons]', g3)).join() === '0,false,2');
check('a Kite cannot load a tier 3 (its hull fits 2)', await (async () => { const s2 = new Map(); s2.set('longhaul.save.v2', JSON.stringify({ v: 2, fleet: [{ uid: 1, model: 'kite', name: 'K', at: 'halcyon-station', hull: 70, fuel: 30, ore: 0, parts: { aim: 3 } }], active: 0 })); return (await J('G.fleet[G.active].parts.aim', nodeGame({ store: s2 }))) === 2; })());

console.log('D. the lead mathematics');
const lead = (px, py, vx, vy) => g.ev(`(() => { const r = aimLeadPoint(${px}, ${py}, ${vx}, ${vy}); return r ? [r.x, r.y] : null; })()`);
const still = await lead(300, 0, 0, 0);
check('a target standing still: aim at it', still && near(still[0], 300, 1e-6) && near(still[1], 0, 1e-6), JSON.stringify(still));
const mv = await lead(400, 0, 0, 200);   // 400 px ahead, moving sideways at 200 px/s
const tHit = mv && Math.hypot(mv[0], mv[1]) / 950;
check('a moving target: the shot and the target reach the same point at the same time', mv && near(mv[0], 400, 1e-6) && near(mv[1], 200 * tHit, 0.5) && tHit > 0 && tHit < 0.9, JSON.stringify(mv));
check('a target that runs away faster than a shot, or is out of a shot\'s life: no lead (the caller aims at it)', (await lead(300, 0, 1200, 0)) === null && (await lead(1000, 0, 0, 0)) === null);

console.log('E. the pick and the angle on a made-up scene');
const scene = `(() => { const mk = (x, y, vx = 0, vy = 0, active = true) => ({ x, y, active, body: { velocity: { x: vx, y: vy } } });
  window.__s = { enemies: { getChildren: () => [mk(700, 0), mk(0, 300), mk(500, 0), mk(100, 100, 0, 0, false)] } }; window.__ship = { x: 0, y: 0, rotation: 0.3 }; return 1; })()`;
await g.ev(scene);
const pick = tier => g.ev(`(() => { G.aimOff = false; G.fleet[G.active].parts.aim = ${tier}; const d = aimPick(__s, __ship); return d ? d.x + ',' + d.y : 'none'; })()`);
check('no part: no target, and the guns fire along the nose', (await pick(0)) === 'none' && await g.ev(`aimAngle(__s, __ship) === 0.3`));
check('tier 1 (450 px): the one at 300 px, not the farther ones, not the dead one', (await pick(1)) === '0,300');
check('tier 3 (850 px): still the nearest, not the first in the list', (await pick(3)) === '0,300');
check('switched off: no target and the nose again', await g.ev(`(() => { G.fleet[G.active].parts.aim = 3; G.aimOff = true; const ok = aimPick(__s, __ship) === null && aimAngle(__s, __ship) === 0.3; G.aimOff = false; return ok; })()`));
check('tier 1 aims straight at it (it stands at 300 px below, so a little under 90 degrees from the nose)', await g.ev(`(() => { G.fleet[G.active].parts.aim = 1; const a = aimAngle(__s, __ship), mx = Math.cos(0.3) * 24, my = Math.sin(0.3) * 24; return Math.abs(a - Math.atan2(300 - my, 0 - mx)) < 1e-9; })()`));
check('tier 2 aims ahead of one that moves, tier 1 at where it is', await g.ev(`(() => {
  window.__s = { enemies: { getChildren: () => [{ x: 0, y: 300, active: true, body: { velocity: { x: 250, y: 0 } } }] } };
  G.fleet[G.active].parts.aim = 1; const a1 = aimAngle(__s, __ship); G.fleet[G.active].parts.aim = 2; const a2 = aimAngle(__s, __ship);
  return a2 < a1 - 0.05 && a2 > 0; })()`));
check('the plain-Node part ran without errors', g.errors.length === 0, g.errors.join(' | '));
g.close?.(); g2.close?.(); g3.close?.();

// ------------------------------------------------------------------ part 2: Chrome
const t = await launch('#space');
const SP = "game.scene.getScene('Space')", ST = "game.scene.getScene('Station')";
const JC = async x => JSON.parse(await t.ev(`JSON.stringify(${x})`));
const fresh = async (aim, extra = {}) => {   // a new Space scene with this tier fitted, nothing in it, the raiders' own moves switched off, past the launch lock
  await t.ev(`(() => { Object.assign(G.fleet[G.active].parts, { shields: 0, weapons: 0, engine: 0, tank: 0, cargo: 0 }, ${JSON.stringify(Object.assign({ aim }, extra))}); G.aimOff = false; G.fleet[G.active].hull = G.fleet[G.active].maxHull; window.pirateAI = () => {}; ${SP}.scene.restart({ from: 'station' }); return 1; })()`);
  await t.waitFor(`${SP}.sys.isActive() && !!${SP}.sh && !!${SP}.ship`, 15000, 'space restarted');
  await t.ev(`(() => { const s = ${SP}; s.enemies.clear(true, true); s.ironUntil = 0; s.ship.rotation = 0; s.ship.body.setVelocity(0, 0); return 1; })()`);
  await t.run(1700);
};
const raider = (dx, dy, vx = 0, vy = 0) => t.ev(`(() => { const s = ${SP}, e = spawnPirate(s, s.ship.x + ${dx}, s.ship.y + ${dy}, 'drone'); e.body.setVelocity(${vx}, ${vy}); e.body.setAcceleration(0, 0); e.name = 'target'; return 1; })()`);
const fireFor = async ms => {
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 32, code: 'Space', key: ' ' });
  await t.run(ms);
  const ang = await JC(`${SP}.pb.getChildren().filter(b => b.active).map(b => Math.atan2(b.body.velocity.y, b.body.velocity.x))`);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 32, code: 'Space', key: ' ' });
  return ang;
};
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 20000, 'space active');
  await new Promise(r => setTimeout(r, 600)); await t.clock(); await t.run(1500);

  console.log('F. the guns turn to the raider in reach');
  await fresh(1); await raider(24, 300);   // straight below the nose of the ship, which points right (the shot leaves 24 px ahead of the ship)
  const aimed = await fireFor(100);
  check('with the part, the shots leave toward the raider (about 90 degrees), not along the nose', aimed.length > 0 && aimed.every(a => near(a, Math.PI / 2, 0.08)), aimed.join());
  await t.run(900);
  check('and they hit it', await t.ev(`(() => { const e = ${SP}.enemies.getChildren().find(x => x.name === 'target'); return !e || e.hp < e.def.hp; })()`));
  await fresh(0); await raider(24, 300);
  const plain = await fireFor(100);
  check('with no part, the shots go along the nose (0 degrees) and miss it', plain.length > 0 && plain.every(a => near(a, 0, 0.01)), plain.join());
  await fresh(1); await raider(0, 700);
  const far = await fireFor(100);
  check('a raider beyond the reach (700 px, tier 1 reaches 450) is left alone: the nose again, no reticle', far.length > 0 && far.every(a => near(a, 0, 0.01)) && (await t.ev(`${SP}.aimTarget === null`)), far.join());

  console.log('G. the lead');
  await fresh(1); await raider(24, 300, 220, 0);
  const direct = (await fireFor(60))[0];
  await fresh(2); await raider(24, 300, 220, 0);
  const led = (await fireFor(60))[0];
  check('a raider moving sideways: tier 1 aims at where it is (90 degrees), tier 2 aims ahead of it (less than that)', near(direct, Math.PI / 2, 0.08) && led < direct - 0.08 && led > 0.3, direct + ' and ' + led);
  await t.run(1200);
  check('and the led shots hit it', await t.ev(`(() => { const e = ${SP}.enemies.getChildren().find(x => x.name === 'target'); return !e || e.hp < e.def.hp; })()`));

  console.log('H. the reticle and the R switch');
  await fresh(2); await raider(24, 300); await t.run(100);
  const ret = async () => JC(`({ target: !!${SP}.aimTarget, drawn: ${SP}.aimG ? ${SP}.aimG.commandBuffer.length : -1, shown: !!${SP}.aimG && !!${SP}.aimG.scene && ${SP}.children.exists(${SP}.aimG), off: G.aimOff })`);
  let r = await ret();
  check('a raider in reach has a reticle on it, on a layer that is in this scene (the scene was started again: the old layer is gone)', r.target && r.drawn > 0 && r.shown && !r.off, JSON.stringify(r));
  await t.shot('autotarget-reticle');
  await t.key('R'); await t.run(100); r = await ret();
  check('R switches it off: no target, nothing drawn, G.aimOff true', !r.target && r.drawn === 0 && r.off, JSON.stringify(r));
  const offShots = await fireFor(100);
  check('and the guns fire along the nose again', offShots.length > 0 && offShots.every(a => near(a, 0, 0.01)), offShots.join());
  await t.key('R'); await t.run(100); r = await ret();
  check('R again switches it on', r.target && r.drawn > 0 && r.shown && !r.off, JSON.stringify(r));
  await fresh(0); await raider(0, 300); await t.key('R'); await t.run(100);
  check('with no part fitted R does nothing (the switch stays on, nothing is drawn)', await t.ev(`G.aimOff === false && ${SP}.aimTarget === null`));
  check('the HUD says AIM as its sixth chip', await t.ev(`(() => { const h = ${SP}._hud; const x = h && h.t && h.t.up5; return !!x && x.text === 'AIM'; })()`));

  console.log('I. buying it in the shop');
  await t.ev(`(() => { Object.keys(G.fleet[G.active].parts).forEach(k => { G.fleet[G.active].parts[k] = 0; }); G.endingSeen = true; /* 2000 credits would not open the ending card, but parts.mjs sets it too */ G.credits = 2000; ${SP}.scene.start('Station', { arrive: false }); return 1; })()`);
  await t.run(1500);   // the clock is stepped by hand: nothing happens unless frames run
  check('the station is up', await t.ev("game.scene.isActive('Station')"), t.errors.join(' | ').slice(0, 300));
  await t.ev(`(() => { openShop(${ST}); return 1; })()`); await t.run(500);
  const txt = await t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${ST}.shopBox.list.forEach(walk); return out.join('|'); })()`);
  check('the shop has six cards and the sixth is the AUTOTARGET at 500', txt.includes('AUTOTARGET') && txt.includes('500 cr'), txt.slice(0, 200));
  await t.key('6'); await t.run(300);
  check('key 6 buys it: tier 1 fitted, 500 credits paid', (await JC('[G.fleet[G.active].parts.aim, G.credits]')).join() === '1,1500');
  await t.shot('autotarget-shop');
  check('the page logged no errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { check('the test itself ran', false, (e && e.stack) || String(e)); }
finally { await t.close(); }
console.log(failed ? `AUTOTARGET FAIL (${failed} of ${n})` : `AUTOTARGET PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
