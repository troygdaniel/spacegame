// Fuel (card space-game-u-b1-fuel, docs/UNIVERSE.md section 3): the tank per ship, the price of a jump, the pump terminal in the
// station, the HUD chip and the fuel ranger. Nothing spends fuel in the game yet, so the numbers are checked directly in the page
// and the terminal is driven with real key presses. Saves tests/out/fuel-*.png. Run: node tests/fuel.mjs
import { launch, sleep } from './cdp.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const ST = "game.scene.getScene('Station')";

const t = await launch('#station');
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 30000, 'Station active');
  // t.ev wraps an expression: a few statements joined with ; are put in a function here
  const ev = e => t.ev(/;/.test(e) && !/^\(\(\) =>/.test(e) ? `(() => { ${e}; return 1; })()` : e), is = async (e, v, name) => { const r = await ev(e); check(name, r === v, `${e} -> ${JSON.stringify(r)}`); };
  await ev('G.endingSeen = true; G.guideDone = true'); // the test hands out credits: without this the "you made it" card (2000 credits earned) would open on top of the station
  // a scratch system, so the rules for other systems can be tried before they exist
  await ev("(() => { SYSTEMS.zz = { id: 'zz', name: 'ZZ', ly: [26.3, 22], size: 36000, bodies: [] }; SYSTEMS.far = { id: 'far', name: 'Far', ly: [29, 22], size: 36000, bodies: [] }; return 1; })()");

  console.log('the tank');
  await is('fuelTank()', 40, 'the Wren holds 40 units');
  await is('fuelHave()', 40, 'a new ship has a full tank');
  await is('fuelFrac()', 1, 'full is 1');
  await is('fuelState()', 'ok', 'full is ok');
  await is("(() => { const r = newShip('kite'); return [fuelTank(r), fuelHave(r)].join(); })()", '30,30', 'a Kite holds 30 and starts full');
  await is("(() => { const r = newShip('pathfinder'); return fuelTank(r); })()", 90, 'a Pathfinder holds 90');
  const state = async fuel => { await ev(`activeShip().fuel = ${fuel}`); return ev('fuelState()'); };
  check('over a quarter is ok (10.1 of 40)', (await state(10.1)) === 'ok');
  check('exactly a quarter is still ok (10 of 40)', (await state(10)) === 'ok');
  check('just under a quarter is low (9.9)', (await state(9.9)) === 'low');
  check('under a tenth is crit (3.9)', (await state(3.9)) === 'crit');
  check('exactly a tenth is low (4)', (await state(4)) === 'low');
  check('empty is crit', (await state(0)) === 'crit');
  await is('(() => { activeShip().fuel = 99; return fuelHave(); })()', 40, 'fuel above the tank reads as the tank');
  await is('(() => { activeShip().fuel = -5; return fuelHave(); })()', 0, 'fuel below zero reads as zero');
  await ev('activeShip().fuel = 40');

  console.log('what a jump costs');
  await is("fuelPrice('halcyon-station')", 8, 'Halcyon sells fuel at 8 a unit');
  await is("fuelPrice('nowhere')", null, 'an unknown station has no pump');
  await is("fuelSystemHasPump('halcyon') && !fuelSystemHasPump('zz') && !fuelSystemHasPump('nope')", true, 'pumps by system');
  await is("distLy('halcyon', 'halcyon')", 0, 'no distance to yourself');
  await is("distLy('halcyon', 'nope')", null, 'an unknown system has no distance');
  await is("jumpCost('halcyon', 'nope')", null, 'and no cost');
  await is("jumpCost('halcyon', 'zz')", 6.3, 'Halcyon to a star 6.3 ly away costs 6.3 units for the Wren (section 3)');
  await is("jumpCost('halcyon', 'zz', newShip('kite'))", 3.8, 'a Kite burns 0.6 a ly: 3.8');
  await is("jumpCost('halcyon', 'zz', newShip('bastion'))", 12.6, 'a Bastion burns 2.0 a ly: 12.6');
  const chk = (to, extra = '') => ev(`(() => { ${extra}; const c = jumpCheck('halcyon', '${to}'); return [c.ok, c.why, c.cost, c.have, c.short].join(); })()`);
  check('a jump you can pay for is ok', (await chk('zz', 'activeShip().fuel = 40')) === 'true,,6.3,40,0');
  check('with too little fuel it says how many units short', (await chk('zz', 'activeShip().fuel = 3')) === 'false,fuel,6.3,3,3.3');
  check('too far for the jump range (8 ly) is "range", whatever the fuel', (await chk('far', 'activeShip().fuel = 40')) === 'false,range,9,40,0');
  check('an unknown system is "unknown"', (await chk('nope', 'activeShip().fuel = 40')).startsWith('false,unknown'));
  await ev('activeShip().fuel = 40');

  console.log('the pump: prices and what it sells');
  await ev('G.credits = 1000; activeShip().fuel = 0;');
  const q = JSON.parse(await ev("JSON.stringify(pumpQuote('halcyon-station'))"));
  check('an empty Wren: half is 20 units for 160 cr, a full tank 40 units for 320 cr', q.price === 8 && q.tank === 40 && q.room === 40 && q.half.units === 20 && q.half.cost === 160 && q.full.units === 40 && q.full.cost === 320, JSON.stringify(q));
  const q2 = JSON.parse(await ev("(() => { activeShip().fuel = 12.5; return JSON.stringify(pumpQuote('halcyon-station')); })()"));
  check('with 12.5 in the tank: half is 20, full is 27.5 units for 220 cr', q2.half.units === 20 && q2.half.cost === 160 && q2.full.units === 27.5 && q2.full.cost === 220, JSON.stringify(q2));
  const q3 = JSON.parse(await ev("(() => { activeShip().fuel = 30; return JSON.stringify(pumpQuote('halcyon-station')); })()"));
  check('with 30 in the tank, half is only the 10 that fit', q3.half.units === 10 && q3.half.cost === 80 && q3.full.units === 10, JSON.stringify(q3));
  await is("pumpQuote('nowhere')", null, 'no quote where there is no pump');

  console.log('the pump: buying');
  const buy = (mode, fuel, credits) => ev(`(() => { G.credits = ${credits}; activeShip().fuel = ${fuel}; const r = pumpBuy('${mode}', 'halcyon-station'); return JSON.stringify([r.ok, r.why, r.units, r.cost, r.partial || false, G.credits, activeShip().fuel]); })()`);
  check('half a tank from empty: +20 for 160', (await buy('half', 0, 1000)) === '[true,null,20,160,false,840,20]');
  check('a full tank from 20: +20 for 160', (await buy('full', 20, 840)) === '[true,null,20,160,false,680,40]');
  check('a full tank again: "full", nothing paid', (await buy('full', 40, 680)) === '[false,"full",0,0,false,680,40]');
  check('with 50 cr you get what 50 cr pay for: 6.2 units', (await buy('full', 0, 50)) === '[true,null,6.2,50,true,0,6.2]');
  check('with 0 cr: "broke", nothing changes', (await buy('full', 5, 0)) === '[false,"broke",0,0,false,0,5]');
  check('a fractional room is paid with whole credits rounded up: 27.5 units is 220', (await buy('full', 12.5, 1000)) === '[true,null,27.5,220,false,780,40]');
  await is("(() => { G.credits = 999; const r = pumpBuy('full', 'nowhere'); return r.why + ',' + G.credits; })()", 'nopump,999', 'no pump, no sale, no charge');
  await is("(() => { G.credits = 400; activeShip().fuel = 10; pumpBuy('half', 'halcyon-station'); return JSON.stringify(snapshot().fleet[0].fuel); })()", '30', 'the new fuel is in the save');

  console.log('the fuel ranger');
  await ev('G.credits = 1000; activeShip().fuel = 3; FUELST.rangerAt = 0;');
  await is("rangerCall(1000).why", 'pump', 'no ranger at a system with a pump');
  await ev("G.system = 'zz'");
  await is("(() => { activeShip().fuel = 12; return rangerCall(1000).why; })()", 'enough', 'not with 10 units or more in the tank');
  const call = JSON.parse(await ev("(() => { activeShip().fuel = 3; return JSON.stringify(rangerCall(1000)); })()"));
  check('stranded with 3: the ranger is called, 45 s, 10 units, 240 cr (3 x 8 = 24 a unit)', call.ok && call.eta === 45000 && call.units === 10 && call.cost === 240, JSON.stringify(call));
  await is('rangerCall(2000).why', 'called', 'a second call says one is on the way');
  await is('rangerTick(45999) === null', true, 'not there at 44.999 s');
  const arr = JSON.parse(await ev("JSON.stringify(rangerTick(46000))"));
  check('at 45 s it arrives: +10 units, -240 cr', arr && arr.units === 10 && arr.cost === 240, JSON.stringify(arr));
  await is('[activeShip().fuel, G.credits].join()', '13,760', 'the tank and the credits changed');
  await is('FUELST.rangerAt', 0, 'and nobody is on the way any more');
  await is('rangerTick(99999999) === null', true, 'a later tick does nothing');
  await ev('G.credits = 100; activeShip().fuel = 3; rangerCall(0);');
  await is('(() => { const r = rangerTick(45000); return [r.units, r.cost, G.credits, activeShip().fuel].join(); })()', '10,100,0,13', 'with 100 cr it costs all 100, never more');
  await ev('G.credits = 0; activeShip().fuel = 0; rangerCall(0);');
  await is('(() => { const r = rangerTick(45000); return [r.units, r.cost, G.credits, activeShip().fuel].join(); })()', '10,0,0,10', 'with 0 cr it still comes and brings 10 units: nobody is stranded');
  await ev('G.credits = 500; activeShip().fuel = 35; FUELST.rangerAt = 0;');
  await is("(() => { G.system = 'zz'; activeShip().fuel = 9; const r = rangerCall(0); FUELST.rangerAt = 0; return r.units; })()", 10, 'a ranger fills up to 10 or what fits');
  await ev("(() => { G.system = 'halcyon'; FUELST.rangerAt = 0; return 1; })()");

  console.log('the terminal in the station');
  await ev('(() => { G.credits = 500; activeShip().fuel = 10; return 1; })()');
  await t.clock();
  await ev("(() => { const d0 = Date.now(), p0 = __t; performance.now = () => __t; Date.now = () => d0 + (__t - p0); return 1; })()");
  const spot = JSON.parse(await ev(`JSON.stringify(${ST}.spots.find(s => s.key === 'pump') || null)`));
  check('Halcyon Station has a FUEL PUMP spot', spot && spot.text === 'FUEL PUMP', JSON.stringify(spot));
  await ev(`(() => { ${ST}.player.setPosition(${spot.x}, ${spot.y + 50}); return 1; })()`);
  await t.run(300);
  await is(`${ST}.prompt.text`, 'E  Buy fuel', 'beside the pump the prompt says E Buy fuel');
  await t.shot('fuel-station-pump');
  await t.key('E'); await t.run(300);
  await is(`${ST}.pumpOpen && ${ST}.panel`, true, 'E opens the pump panel (and the pause menu knows a panel is open)');
  await t.shot('fuel-panel');
  await t.key('1'); await t.run(300);
  await is('[activeShip().fuel, G.credits].join()', '30,340', 'key 1 buys half a tank: +20 units for 160 cr');
  await t.key('2'); await t.run(300);
  await is('[activeShip().fuel, G.credits].join()', '40,260', 'key 2 fills the tank: the last 10 units for 80 cr');
  await t.key('2'); await t.run(300);
  await is('[activeShip().fuel, G.credits].join()', '40,260', 'key 2 on a full tank buys nothing');
  await ev('G.credits = 30; activeShip().fuel = 0;'); await t.key('2'); await t.run(300);
  await is('[activeShip().fuel, G.credits].join()', '3.7,0', 'with 30 cr, key 2 buys the 3.7 units that 30 cr pay for');
  await t.shot('fuel-panel-short');
  await t.key('ESC'); await t.run(300);
  await is(`!${ST}.pumpOpen && !${ST}.panel`, true, 'Esc closes the panel');
  await is(`${ST}.pumpBox.visible`, false, 'and hides it');
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));

  console.log('the chip on the HUD strip');
  for (const [fuel, name] of [[40, 'full'], [8, 'low'], [2, 'crit']]) {
    await ev(`activeShip().fuel = ${fuel}`); await t.run(300);
    await is(`!!${ST}.children.list.find(o => o.type === 'Text' && o.text === 'FUEL' && o.visible)`, true, `the FUEL label is on the strip (${name})`);
    await t.shot('fuel-hud-' + name);
  }
  check('no console errors after the chip', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); failed++; } finally { await t.close(); }

console.log(failed ? `\nFUEL FAIL (${failed} of ${n} checks)` : `\nFUEL PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
