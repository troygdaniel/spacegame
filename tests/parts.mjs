// smoke: ship parts: shields, weapons, engine, tank, cargo: the tables, every effect, the shop's five cards, the save
// The five ship parts (src/data_parts.js, docs/UNIVERSE.md section 7): shields, weapons, engine, tank, cargo, tiers 1 to 3.
//   A. the tables and prices     B. every effect through shipStat     C. shields in flight (points, hull, recharge, the HUD ring)
//   D. weapons (shot rate, damage)  E. engine and cargo in flight     F. the shop (five cards, price, fit, stock, credits)     G. saves
// One headless Chrome, game clock stepped by hand in space. Run: node tests/parts.mjs   (exit code 1 on any failure)
import { launch, sleep } from './cdp.mjs';

const t = await launch('#space');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const J = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
const SP = "game.scene.getScene('Space')", ST = "game.scene.getScene('Station')";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const setParts = p => t.ev(`(() => { Object.assign(G.fleet[G.active].parts, ${JSON.stringify(p)}); return 1; })()`);
// a fresh Space scene with these parts, enemies and traffic gone so nothing else hurts or interrupts, past the launch lock
const fresh = async p => {
  await setParts(Object.assign({ shields: 0, weapons: 0, engine: 0, tank: 0, cargo: 0 }, p));
  await t.ev(`(() => { G.fleet[G.active].hull = G.fleet[G.active].maxHull; ${SP}.scene.restart({ from: 'station' }); return 1; })()`);
  await t.waitFor(`${SP}.sys.isActive() && !!${SP}.sh && !!${SP}.ship`, 15000, 'space restarted');
  await t.ev(`(() => { const s = ${SP}; s.enemies.clear(true, true); s.ironUntil = 0; return 1; })()`);
  await t.run(1700);
};

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 20000, 'space active');
  await sleep(600); await t.clock(); await t.run(1500);

  console.log('A. the tables');
  check('five slots in shop order: shields, weapons, engine, tank, cargo', same(await J('PART_ORDER'), ['shields', 'weapons', 'engine', 'tank', 'cargo']));
  const tables = await J(`PART_ORDER.map(k => { const P = PARTS[k]; return { k, name: P.name, short: P.short, prices: P.prices, t: P.tiers.length, d: P.descs.length, b: P.brief.length, ok: P.descs.every(x => x.length > 5 && x.length <= 40) && P.brief.every(x => x.length <= 24) }; })`);
  check('every slot has a name, three letters, three prices going up, three tier names, descriptions and short forms',
    tables.every(x => x.name && x.short.length === 3 && x.prices.length === 3 && x.prices[0] < x.prices[1] && x.prices[1] < x.prices[2] && x.t === 3 && x.d === 3 && x.b === 3 && x.ok), JSON.stringify(tables.map(x => x.k + x.prices)));
  check("the old three keep their old prices: shields 300/500, weapons 400/600, engine 350/550 (the shop's keys 1 to 3 did not move)", same(await J('[PARTS.shields.prices.slice(0, 2), PARTS.weapons.prices.slice(0, 2), PARTS.engine.prices.slice(0, 2)]'), [[300, 500], [400, 600], [350, 550]]));
  check('the plan\'s prices for tank and cargo: 250 / 450 / 900', same(await J('[PARTS.tank.prices, PARTS.cargo.prices]'), [[250, 450, 900], [250, 450, 900]]));
  const pr = await J(`[partPrice('shields', 1, 'wren', {}), partPrice('shields', 1, 'kite', {}), partPrice('shields', 1, 'bastion', {}), partPrice('shields', 1, 'wren', { partMult: 1.25 }), partPrice('engine', 3, 'ox', {})]`);
  check('price = list x the ship\'s partMult x the station\'s, to ten credits (Wren 300, Kite 240, Bastion 540, nest 380, Ox engine III 1320)', same(pr, [300, 240, 540, 380, 1320]), pr.join());
  const cap = await J(`[partStockCap('shields', {}), partStockCap('shields', { shop: 3 }), partStockCap('weapons', { shop: 2, parts: { weapons: 3 } }), partStockCap('tank', { shop: 2, parts: { weapons: 3 } }), partStockCap('cargo', { shop: 0 })]`);
  check('a station sells tier 2 unless its dock says shop, and a slot can override it', same(cap, [2, 3, 3, 2, 0]), cap.join());

  console.log('B. every effect through shipStat (Wren)');
  const eff = async (key, tiers, name, vals) => {
    const got = [];
    for (const tier of tiers) got.push(await t.ev(`(() => { const r = newShip('wren'); r.parts.${key} = ${tier}; return shipStat('${name}', r); })()`));
    check(`${key} tiers 0 to 3 -> ${name}: ${vals.join(', ')}`, same(got, vals), got.join(', '));
  };
  await eff('engine', [0, 1, 2, 3], 'vmax', [480, 518, 557, 600]);
  await eff('engine', [0, 1, 2, 3], 'boost', [800, 1000, 1150, 1300]);
  await eff('engine', [0, 1, 2, 3], 'range', [8, 9, 10, 11]);
  await eff('engine', [0, 1, 2, 3], 'boostTank', [100, 130, 165, 200]);
  await eff('engine', [0, 1, 2, 3], 'boostRegen', [17, 24, 32, 40]);
  await eff('shields', [0, 1, 2, 3], 'shieldMax', [0, 25, 50, 85]);
  await eff('shields', [0, 1, 2, 3], 'shieldRegen', [0, 6, 8, 11]);
  await eff('shields', [0, 1, 2, 3], 'shieldDelay', [0, 4000, 3500, 3000]);
  await eff('shields', [0, 1, 2, 3], 'hull', [100, 100, 100, 100]);
  await eff('weapons', [0, 1, 2, 3], 'fireDelay', [160, 100, 70, 50]);
  await eff('weapons', [0, 1, 2, 3], 'damage', [15, 15, 15, 20]);
  await eff('tank', [0, 1, 2, 3], 'tank', [40, 50, 60, 80]);
  await eff('cargo', [0, 1, 2, 3], 'hold', [10, 14, 18, 24]);
  const kite = await J(`(() => { const r = newShip('kite'); r.parts.engine = 2; r.parts.tank = 2; r.parts.cargo = 1; return [shipStat('vmax', r), shipStat('boost', r), shipStat('range', r), shipStat('tank', r), shipStat('hold', r)]; })()`);
  check('on a Kite the same parts act on the Kite\'s own numbers: 580 x 1.16, 950 + 350, 14 + 2 ly, 30 x 1.5 fuel, 4 + 4 ore', same(kite, [673, 1300, 16, 45, 8]), kite.join());
  check('the shop\'s helpers read the parts: fireDelay(), boostMax(), boostEnergy()', await t.ev(`(() => { Object.assign(G.fleet[G.active].parts, { weapons: 2, engine: 3 }); const ok = fireDelay() === 70 && boostMax() === 1300 && boostEnergy().max === 200 && boostEnergy().regen === 40; Object.assign(G.fleet[G.active].parts, { weapons: 0, engine: 0 }); return ok; })()`));

  console.log('C. shields in flight');
  await fresh({ shields: 2 });
  check('the Space scene starts with the shield full: 50 of 50, recharge 8 a second after 3.5 s', same(await J(`[${SP}.sh.max, ${SP}.sh.pts, ${SP}.sh.regen, ${SP}.sh.delay]`), [50, 50, 8, 3500]));
  await t.ev(`(() => { ${SP}.hurt(20, ${SP}.ship.x + 40, ${SP}.ship.y); return 1; })()`);
  check('a hit of 20 comes off the shield, the hull is untouched', same(await J('[' + SP + '.sh.pts, G.hull]'), [30, 100]));
  await t.ev(`(() => { ${SP}.ironUntil = 0; ${SP}.hurt(40, ${SP}.ship.x + 40, ${SP}.ship.y); return 1; })()`);
  check('a hit of 40 takes the last 30 from the shield and 10 from the hull', same(await J('[' + SP + '.sh.pts, G.hull]'), [0, 90]));
  check('the shield records that it went down (the SHIELDS DOWN banner reads it)', await t.ev(`${SP}.sh.down > -1e8 && ${SP}.time.now - ${SP}.sh.down < 500`));
  await t.run(3000);
  check('3 s after the last hit it has not started to recharge (the pause is 3.5 s)', (await t.ev(`${SP}.sh.pts`)) === 0);
  await t.run(1500);
  const part = await t.ev(`${SP}.sh.pts`);
  check('after the pause it recharges at about 8 points a second', part > 2 && part < 12, 'pts ' + part.toFixed(1));
  await t.ev(`(() => { ${SP}.ironUntil = 0; ${SP}.hurt(5, ${SP}.ship.x + 40, ${SP}.ship.y); return 1; })()`);
  const after = await t.ev(`${SP}.sh.pts`);
  await t.run(2500);
  check('a new hit stops the recharge again', (await t.ev(`${SP}.sh.pts`)) <= after + 0.01, String(after));
  await t.run(12000);
  check('left alone it comes back to full and stops there', same(await J('[' + SP + '.sh.pts, ' + SP + '.sh.max]'), [50, 50]));
  check('no shield part: no shield at all, the hull takes the hit', await (async () => { await fresh({ shields: 0 }); await t.ev(`(() => { ${SP}.hurt(10, ${SP}.ship.x + 40, ${SP}.ship.y); return 1; })()`); return same(await J('[' + SP + '.sh.max, G.hull]'), [0, 90]); })());
  await fresh({ shields: 3 }); await t.run(500);
  check('the HUD ring and the banner run without errors', t.errors.length === 0, t.errors.join(' | '));
  await t.shot('parts-shield-hud');

  console.log('D. weapons');
  const shots = async tier => {
    await fresh({ weapons: tier });
    await t.ev(`(() => { const s = ${SP}; window.__shots = 0; delete s.shoot; /* a restarted scene keeps its own wrappers: start from the class method */ const orig = s.shoot; s.shoot = function (g, ...a) { const b = orig.call(this, g, ...a); if (g === this.pb && b) { window.__shots++; } return b; }; return 1; })()`);
    await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 32, code: 'Space', key: ' ' });
    await t.run(1000);
    const dmg = await J(`${SP}.pb.getChildren().filter(b => b.active).map(b => b.dmg)`);
    await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 32, code: 'Space', key: ' ' });
    return { n: await t.ev('window.__shots'), dmg };
  };
  const w0 = await shots(0), w3 = await shots(3);
  check('holding fire for a second: tier 0 shoots about 7 times (160 ms), tier 3 about 21 times (50 ms)', w0.n >= 6 && w0.n <= 8 && w3.n >= 19 && w3.n <= 23, w0.n + ' and ' + w3.n);
  check('shots carry the damage: 15 at tier 0, 20 at tier 3', w0.dmg.length > 0 && w0.dmg.every(d => d === 15) && w3.dmg.length > 0 && w3.dmg.every(d => d === 20), w0.dmg.join() + ' | ' + w3.dmg.slice(0, 3).join());
  await fresh({ weapons: 3 });
  const hp = await t.ev(`(() => { const s = ${SP}, e = spawnPirate(s, s.ship.x + 300, s.ship.y, 'drone'); e.body.setVelocity(0, 0); e.body.setAcceleration(0, 0); const b = s.shoot(s.pb, e.x, e.y, 0, 0, s.time.now); b.dmg = 20; window.__e = e; return e.hp; })()`);
  await t.run(100);
  check('a tier 3 shot takes 20 off a drone (30 hp -> 10), not a fixed 15', (await t.ev('window.__e.hp')) === hp - 20, 'was ' + hp);

  console.log('E. engine and cargo in flight');
  await fresh({ engine: 3 });
  check('engine III: the boost ring is 200 and the top speed is 600', same(await J(`[${SP}.enMax, ${SP}.vmax]`), [200, 600]));
  await fresh({ engine: 0 });
  check('engine 0: 100 and 480', same(await J(`[${SP}.enMax, ${SP}.vmax]`), [100, 480]));
  const ore = async tier => {
    await fresh({ cargo: tier });
    return t.ev(`(() => { const s = ${SP}; G.ore = 10; dropOre(s, s.ship.x + 40, s.ship.y); return 1; })()`).then(() => t.run(1500)).then(() => t.ev('G.ore'));
  };
  check('a full Wren hold (10) turns the ore away, a hold with cargo I (14) takes it', (await ore(0)) === 10 && (await ore(1)) === 11);
  check('the HUD hold bar and the warning use the ship\'s hold, not 10', await t.ev(`(() => { Object.assign(G.fleet[G.active].parts, { cargo: 2 }); G.ore = 14; const full = (G.ore | 0) >= holdCap(); G.ore = 18; const full2 = (G.ore | 0) >= holdCap(); return !full && full2 && holdCap() === 18; })()`));
  await t.ev("(() => { G.ore = 0; return 1; })()");

  console.log('F. the shop');
  await setParts({ shields: 0, weapons: 0, engine: 0, tank: 0, cargo: 0 });
  await t.ev(`(() => { G.endingSeen = true; /* 5000 credits earned would open the ending card (guide.js) */ G.credits = 5000; ${SP}.scene.start('Station', { arrive: false }); return 1; })()`);
  await t.run(1500); // the clock is stepped by hand: nothing happens unless frames run
  check('the station is up', await t.ev("game.scene.isActive('Station')"), (await t.ev("game.scene.getScenes(true).map(s => s.scene.key).join()")) + ' | ' + t.errors.join(' | ').slice(0, 400));
  await t.ev(`(() => { openShop(${ST}); return 1; })()`); await t.run(500);
  const txt = async () => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${ST}.shopBox.list.forEach(walk); out.push('MSG ' + ${ST}.shopMsgText.text); return out.join('|'); })()`);
  let s = await txt();
  check('five cards: SHIELDS, RAPID FIRE, ENGINE, FUEL TANK, CARGO HOLD, with list prices 300, 400, 350, 250, 250', ['SHIELDS', 'RAPID FIRE', 'ENGINE', 'FUEL TANK', 'CARGO HOLD', '300 cr', '400 cr', '350 cr', '250 cr'].every(w => s.includes(w)), s.slice(0, 120));
  check('the shop says which ship the parts are for', s.includes('Pick a part for your Wren'));
  await t.shot('parts-shop');
  await t.key('1'); await t.run(400);
  check('key 1 buys SHIELDS I for 300 and the hull stays 100', same(await J('[G.credits, G.fleet[G.active].parts.shields, G.maxHull]'), [4700, 1, 100]), (await txt()).split('MSG ')[1]);
  await t.key('5'); await t.run(300); await t.key('5'); await t.run(300);
  check('key 5 twice buys CARGO HOLD I then II (250 + 450), the hold is 18', same(await J('[G.credits, G.fleet[G.active].parts.cargo, holdCap()]'), [4000, 2, 18]));
  await t.key('5'); await t.run(400);
  s = await txt();
  check('tier III is not sold at Halcyon: nothing bought, and the card says so', same(await J('[G.credits, G.fleet[G.active].parts.cargo]'), [4000, 2]) && s.includes('NOT SOLD HERE') && s.includes('does not sell'), s.split('MSG ')[1]);
  await t.ev(`(() => { sysBodies('station', 'halcyon')[0].dock = { shop: 3 }; refreshShop(${ST}); return 1; })()`); await t.run(300);
  await t.key('5'); await t.run(400);
  check('a station whose dock says shop: 3 sells it: CARGO III for 900, the hold is 24', same(await J('[G.credits, G.fleet[G.active].parts.cargo, holdCap()]'), [3100, 3, 24]));
  await t.key('5'); await t.run(300);
  check('a maxed slot says so and costs nothing', same(await J('[G.credits, G.fleet[G.active].parts.cargo]'), [3100, 3]) && (await txt()).includes('MAXED'));
  await t.ev("(() => { delete sysBodies('station', 'halcyon')[0].dock; return 1; })()");
  await t.ev(`(() => { G.fleet[G.active].model = 'kite'; Object.assign(G.fleet[G.active].parts, { weapons: 2 }); refreshShop(${ST}); return 1; })()`); await t.run(300);
  s = await txt();
  check('a Kite takes weapons only to tier II: the card says FULL FIT', s.includes('FULL FIT') && s.includes('a Kite takes no more'));
  await t.key('2'); await t.run(300);
  check('and the shop refuses: nothing bought', same(await J('[G.credits, G.fleet[G.active].parts.weapons]'), [3100, 2]) && (await txt()).includes('cannot take a bigger'));
  await t.key('1'); await t.run(300);
  check('the Kite pays its own prices: SHIELDS II for 500 x 0.8 = 400 (shields I was bought on the Wren)', same(await J('[G.credits, G.fleet[G.active].parts.shields]'), [2700, 2]));
  await t.ev(`(() => { G.fleet[G.active].model = 'wren'; G.credits = 100; refreshShop(${ST}); return 1; })()`); await t.run(300);
  await t.key('3'); await t.run(300);
  check('too poor: the shop says how many more credits and buys nothing', (await txt()).includes('Need 250 more') && (await J('[G.credits, G.fleet[G.active].parts.engine]')).join() === '100,0');
  await t.key('ESC'); await t.run(500);

  console.log('G. the HUD and the save');
  await t.ev(`(() => { Object.assign(G.fleet[G.active].parts, { shields: 1, weapons: 0, engine: 2, tank: 3, cargo: 0 }); return 1; })()`);
  await t.run(400);
  const chips = await J(`PART_ORDER.map((k, i) => { const h = ${ST}._hud; const x = h && h.t['up' + i]; return x ? [x.text, Math.round(x.x), x.visible] : null; })`);
  check('the HUD strip has five chips, in order, three letters each, left to right', chips.every(Boolean) && chips.map(c => c[0]).join() === 'SHD,WPN,ENG,TNK,CRG' && chips.every((c, i) => i === 0 || c[1] > chips[i - 1][1]) && chips[4][1] + 44 <= 840, JSON.stringify(chips));
  const rec = await J(`(() => { G.fleet[G.active].model = 'wren'; const snap = snapshot(); const r = shipFromSave({ model: 'wren', parts: { shields: 9, weapons: 2, engine: 3, tank: 3, cargo: 3 }, ore: 99 }, 'halcyon-station'); const k = shipFromSave({ model: 'kite', parts: { weapons: 3, cargo: 3, engine: 3 }, ore: 99 }, 'halcyon-station'); return { saved: snap.fleet[0].parts, wren: [r.parts.shields, r.ore, r.maxHull], kite: [k.parts.weapons, k.parts.cargo, k.parts.engine, k.ore] }; })()`);
  check('the save keeps all five slots', same(rec.saved, { engine: 2, shields: 1, weapons: 0, tank: 3, cargo: 0 }) || (rec.saved.tank === 3 && rec.saved.engine === 2 && rec.saved.shields === 1), JSON.stringify(rec.saved));
  check('a loaded Wren: shields 9 comes down to 3, 99 ore to the hold (10 with no cargo part... 24 with cargo 3), the hull is the model\'s 100', rec.wren[0] === 3 && rec.wren[1] === 24 && rec.wren[2] === 100, rec.wren.join());
  check('a loaded Kite is held to what a Kite can fit: weapons 2, cargo 1, engine 3, ore up to 8', rec.kite[0] === 2 && rec.kite[1] === 1 && rec.kite[2] === 3 && rec.kite[3] === 8, rec.kite.join());
  check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally {
  await t.close();
}
console.log(fails ? `PARTS FAIL (${fails})` : 'PARTS PASS');
process.exit(fails ? 1 : 0);
