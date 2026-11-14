// The fleet: buy, sell, switch, rename, transfer (card space-game-u-d3-fleet-logic, docs/UNIVERSE.md 6.3 and 7).
//   Part 1 runs src/fleet.js with its data files in a plain Node context (no browser, so it does not care how busy the Mac is):
//   the yard, every price, buying, switching, selling, renaming, transferring, and that a refused call changes nothing.
//   Part 2 runs the real page once (#space): the fleet survives snapshot and applySave, and dying costs the insurance fee,
//   rebuilds the ship you fly to its own hull cap and leaves the parked ships alone.
// Run: node tests/fleet.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { launch } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = f => readFileSync(join(ROOT, 'src', f + '.js'), 'utf8');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (!cond) { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const ORE_PRICE = Number(/ORE_PRICE = (\d+)/.exec(src('asteroids'))[1]); // the dock price the game really uses

// two more systems with stations (only Halcyon is authored yet), so there is somewhere to send a ship and a yard that sells more
const MORE_SYSTEMS = `
SYSTEMS.kestrel = { id: 'kestrel', name: 'Kestrel', ly: [25.5, 19], bodies: [
  { id: 'kestrel-outpost', type: 'station', name: 'Kestrel Outpost', x: 3000, y: 3000, dock: { yard: ['ox', 'wren', 'nope', 'talon'] } },
  { id: 'kestrel-pad', type: 'station', name: 'Kestrel Pad', x: 5000, y: 5000, dock: {} } ] };
SYSTEMS.meridian = { id: 'meridian', name: 'Meridian', ly: [29, 24.5], bodies: [
  { id: 'meridian-exchange', type: 'station', name: 'Meridian Exchange', x: 3000, y: 3000, dock: { yard: ['kite', 'ox', 'talon', 'pathfinder', 'bastion'] } } ] };`;

// a fresh game: the real scripts in the order index.html loads them, G is the real G
function world() {
  const ctx = vm.createContext({ window: { addEventListener() {} }, console: { table() {}, log() {} } });
  for (const f of ['common', 'data_systems', 'universe', 'data_ships', 'data_parts', 'fleet']) vm.runInContext(src(f), ctx, { filename: f + '.js' });
  vm.runInContext(`const ORE_PRICE = ${ORE_PRICE}; G.lastDock = homeDock();` + MORE_SYSTEMS, ctx); // meta.js sets lastDock in the page
  const run = code => vm.runInContext(code, ctx);
  return { run, j: code => JSON.parse(run(`JSON.stringify(${code})`)) };
}
const HOME = 'halcyon-station', KESTREL = 'kestrel-outpost', MERIDIAN = 'meridian-exchange';

// a refused call answers { ok: false, why, msg } and changes nothing at all
function refused(w, label, call, why, msgHas) {
  const sig = () => w.run('JSON.stringify([G.fleet, G.active, G.credits, G.lastDock, G.mission])');
  const before = sig(), r = w.j(call);
  check(`${label}: refused as '${why}'`, r.ok === false && r.why === why, JSON.stringify(r));
  check(`${label}: it says why in words`, typeof r.msg === 'string' && r.msg.length > 3 && (!msgHas || r.msg.includes(msgHas)), r.msg);
  check(`${label}: nothing changed`, sig() === before);
}

// ================= Part 1: the rules =================
console.log('start, the yard');
{
  const w = world();
  check('a new game is one Wren, active, parked at the station', w.j('[G.fleet.length, G.active, G.fleet[0].model, G.fleet[0].uid, G.fleet[0].at]').join() === `1,0,wren,1,${HOME}`);
  check('Halcyon has no dock data yet: it sells the Kite (the fallback)', w.j(`stationYard('${HOME}')`).join() === 'kite');
  check('a yard never sells the free starter or a model we do not know', w.j(`stationYard('${KESTREL}')`).join() === 'ox,talon');
  check('a station whose dock has no yard sells nothing', w.j(`stationYard('kestrel-pad')`).length === 0);
  check('a station that does not exist sells nothing (nor does an Object.prototype name)', w.j(`stationYard('nowhere').concat(stationYard('constructor'))`).length === 0);
  check('Meridian sells all five ships that cost something', w.j(`stationYard('${MERIDIAN}')`).join() === 'kite,ox,talon,pathfinder,bastion');
  check('six ships at most (SHIPREC.max)', w.run('SHIPREC.max') === 6);
}

console.log('prices');
{
  const w = world();
  check('a Wren part costs what the shop says (section 7): shields 300 / 500, weapons 400 / 600, engine 350 / 550',
    w.run(`[fleetPartPrice('shields', 1, 'wren'), fleetPartPrice('shields', 2, 'wren'), fleetPartPrice('weapons', 1, 'wren'), fleetPartPrice('weapons', 2, 'wren'), fleetPartPrice('engine', 1, 'wren'), fleetPartPrice('engine', 2, 'wren')].join()`) === '300,500,400,600,350,550');
  check('tier 3 and the two new slots are in the table (1100, 1000, 1200, 900, 900)', w.run(`[fleetPartPrice('engine', 3, 'wren'), fleetPartPrice('shields', 3, 'wren'), fleetPartPrice('weapons', 3, 'wren'), fleetPartPrice('tank', 3, 'wren'), fleetPartPrice('cargo', 3, 'wren')].join()`) === '1100,1000,1200,900,900');
  check('the model scales it: a Kite engine tier 1 costs 280, tier 2 440; a Bastion cargo tier 3 costs 1620', w.run(`[fleetPartPrice('engine', 1, 'kite'), fleetPartPrice('engine', 2, 'kite'), fleetPartPrice('cargo', 3, 'bastion')].join()`) === '280,440,1620');
  check('a part is priced at list: a station\'s own multiplier (the pirate nest\'s 1.25) is not in the sale value', w.run(`fleetPartPrice('weapons', 2, 'wren') === 600 && partPrice('weapons', 2, 'wren', { partMult: 1.25 }) === 750`));
  check('no price for tier 0, tier 4 or a slot that does not exist', w.run(`[fleetPartPrice('engine', 0, 'wren'), fleetPartPrice('engine', 4, 'wren'), fleetPartPrice('wings', 1, 'wren')].join()`) === '0,0,0');
  check('what is fitted counts every tier up to the one in the slot: Wren shields 2 is 800', w.run(`fleetPartsValue({ model: 'wren', parts: { shields: 2 } })`) === 800);
  check('Kite engine 2 and shields 1 are 280 + 440 + 240 = 960', w.run(`fleetPartsValue({ model: 'kite', parts: { engine: 2, shields: 1 } })`) === 960);
  const sell = (model, parts, ore) => w.j(`fleetSellValue({ model: '${model}', ore: ${ore || 0}, parts: ${JSON.stringify(parts)} })`);
  check('a bare Wren fetches nothing (its base price is 0)', sell('wren', {}).total === 0);
  check('a Wren with shields 2 fetches 50% of 800 = 400', sell('wren', { shields: 2 }).total === 400);
  check('a bare Kite fetches 60% of 4500 = 2700', sell('kite', {}).total === 2700);
  check('a Kite with engine 2, shields 1 and 3 ore fetches 2700 + 480 + 3 ore at the dock price', (v => v.ship === 2700 && v.parts === 480 && v.ore === 3 * ORE_PRICE && v.total === 2700 + 480 + 3 * ORE_PRICE)(sell('kite', { engine: 2, shields: 1 }, 3)));
  check('a bare Bastion fetches 14400', sell('bastion', {}).total === 14400);
  const ly = (a, b) => w.run(`fleetLy('${a}', '${b}')`);
  check('Halcyon to Kestrel is 6.265 ly, to Meridian 9.341 ly, Kestrel to Meridian 6.519 ly', Math.abs(ly(HOME, KESTREL) - Math.hypot(5.5, 3)) < 1e-9 && Math.abs(ly(HOME, MERIDIAN) - Math.hypot(9, 2.5)) < 1e-9 && Math.abs(ly(KESTREL, MERIDIAN) - Math.hypot(3.5, 5.5)) < 1e-9);
  const cost = (a, b) => w.run(`fleetTransferCost('${a}', '${b}')`);
  check('a transfer costs 100 plus 25 a light year, rounded: 257, 334, 263', [cost(HOME, KESTREL), cost(HOME, MERIDIAN), cost(KESTREL, MERIDIAN)].join() === '257,334,263');
  check('two stations in one system: just the 100', cost(KESTREL, 'kestrel-pad') === 100);
  check('no price to or from a place that is not a station', cost(HOME, 'nowhere') === null && cost('nowhere', HOME) === null);
}

console.log('buying');
{
  const w = world();
  w.run(`G.credits = 10000; G.hull = 73; G.ore = 4; G.upgrades.armor = 1;`); // the Wren has some history
  refused(w, 'a model that does not exist', `fleetBuy('banana')`, 'model');
  refused(w, 'a model this yard does not sell', `fleetBuy('ox')`, 'yard', 'Ox');
  refused(w, 'the free starter is never for sale', `fleetBuy('wren')`, 'yard');
  w.run('G.credits = 4499');
  refused(w, 'one credit short of a Kite', `fleetBuy('kite')`, 'credits', 'Need 1 more');
  w.run('G.credits = 10000');
  const r = w.j(`fleetBuy('kite')`);
  check('buying a Kite works and charges 4500', r.ok === true && r.price === 4500 && w.run('G.credits') === 5500, JSON.stringify(r).slice(0, 120));
  const k = w.j('G.fleet[1]');
  check('the Kite is a new record: uid 2, named Kite, parked here', k.uid === 2 && k.name === 'Kite' && k.model === 'kite' && k.at === HOME);
  check('it comes rebuilt full: hull 70 of 70, tank 30, no ore, no parts', k.hull === 70 && k.maxHull === 70 && k.fuel === 30 && k.ore === 0 && Object.values(k.parts).every(t => t === 0), JSON.stringify(k));
  check('you fly it: G reads the Kite (hull 70, max hull 70, no ore, top speed 580)', w.j('[G.active, G.hull, G.maxHull, G.ore, shipStat("vmax")]').join() === '1,70,70,0,580');
  const old = w.j('G.fleet[0]');
  check('the old Wren is not touched: stays parked here with its hull 73, 4 ore and shields 1', old.at === HOME && old.hull === 73 && old.ore === 4 && old.parts.shields === 1 && old.model === 'wren', JSON.stringify(old));
  const r2 = w.j(`fleetBuy('kite', false)`);
  check('fly = false leaves you in the ship you had', r2.ok === true && r2.flying === false && w.run('G.active') === 1 && w.run('G.fleet.length') === 3);
  check('a second Kite is named Kite 2, with the next uid', w.j('[G.fleet[2].name, G.fleet[2].uid]').join() === 'Kite 2,3');
  w.run('G.credits = 100000');
  check('Kite 3 and Kite 4 follow', (w.run(`fleetBuy('kite', false)`), w.run(`fleetBuy('kite', false)`), w.j('G.fleet.map(r => r.name)').join()) === 'Wren,Kite,Kite 2,Kite 3,Kite 4');
  check('six ships make a full hangar', (w.run(`fleetBuy('kite', false)`), w.run('G.fleet.length')) === 6);
  const credits = w.run('G.credits');
  refused(w, 'a seventh ship', `fleetBuy('kite')`, 'full', '6 ships');
  check('and no credits were taken', w.run('G.credits') === credits);
  check('every uid is different', new Set(w.j('G.fleet.map(r => r.uid)')).size === 6);
  w.run('fleetSell(5)');
  check('after a sale there is room again, with a uid nobody has', w.run(`fleetBuy('kite', false).ok`) === true && w.run('G.fleet.length') === 6 && w.j('G.fleet.map(r => r.uid)').join() === '1,2,3,4,6,7');
}

console.log('switching');
{
  const w = world();
  w.run(`G.credits = 99999; G.mission = 'accepted'; G.missionId = 'rescue'; G.hull = 73; G.ore = 4; G.upgrades.armor = 2; fleetBuy('kite');`); // flying the Kite, the Wren parked
  w.run(`G.hull = 50; G.ore = 3; G.fleet[1].fuel = 11; G.fleet[1].parts.engine = 2;`);
  const credits = w.run('G.credits');
  const r = w.j('fleetSwitch(1)');
  check('switching to the Wren parked here works', r.ok === true && w.run('G.active') === 0);
  check('G now reads the Wren: hull 73 of 140 (two plating tiers), 4 ore, armor 2, top speed 480', w.j('[G.hull, G.maxHull, G.ore, G.upgrades.armor, shipStat("vmax")]').join() === '73,140,4,2,480');
  const kite = w.j('G.fleet[1]');
  check('the Kite kept its own hull 50, 3 ore, fuel 11 and engine 2', kite.hull === 50 && kite.ore === 3 && kite.fuel === 11 && kite.parts.engine === 2 && kite.at === HOME, JSON.stringify(kite));
  check('cargo never moves: the Wren\'s 4 ore are still the Wren\'s and the Kite\'s 3 still the Kite\'s', w.run('G.fleet[0].ore') === 4 && w.run('G.fleet[1].ore') === 3);
  check('the mission and the credits stay with you', w.run('G.mission') === 'accepted' && w.run("G.missionId") === 'rescue' && w.run('G.credits') === credits);
  w.run('fleetSwitch(2)');
  check('and back: hull 50 of 70, 3 ore, no plating, the engine tier shows through G.upgrades.booster', w.j('[G.hull, G.maxHull, G.ore, G.upgrades.armor, G.upgrades.booster]').join() === '50,70,3,0,2');
  w.run('G.fleet[0].hull = 90; G.hull = 70;');
  w.run('G.fleet[1].hull = 140'); // a hull above the cap (an old save, a part sold) is cut down when you switch to it
  w.run('fleetSwitch(1)'); w.run('fleetSwitch(2)');
  check('a hull above the ship\'s cap is cut down on switching (the Kite holds 70)', w.run('G.hull') === 70);
  refused(w, 'switching to the ship you fly', 'fleetSwitch(2)', 'active', 'Kite');
  refused(w, 'a ship that does not exist', 'fleetSwitch(99)', 'gone');
  w.run(`G.fleet[0].at = '${KESTREL}'`);
  refused(w, 'a ship parked at another station', 'fleetSwitch(1)', 'there', 'Kestrel Outpost');
  check('the ones parked here are listed by fleetAt, the others are not', w.j(`fleetAt('${HOME}').map(r => r.uid)`).join() === '2' && w.j(`fleetAt('${KESTREL}').map(r => r.uid)`).join() === '1');
  w.run(`G.lastDock = '${KESTREL}'`);
  check('the ship you fly is wherever you dock: now at Kestrel, with the Wren', w.j(`fleetAt('${KESTREL}').map(r => r.uid)`).join() === '1,2' && w.run('G.fleet[1].at') === KESTREL);
  check('so the Wren can be switched to there, and the Kite is left parked at Kestrel', (w.run('fleetSwitch(1)'), w.run('G.active') === 0 && w.run('G.fleet[1].at') === KESTREL));
}

console.log('selling');
{
  const w = world();
  w.run(`G.credits = 50000; G.upgrades.armor = 1; fleetBuy('kite'); G.fleet[1].parts.engine = 2; G.fleet[1].parts.shields = 1; G.fleet[1].ore = 3;`); // the Wren has plating 1; flying the Kite
  refused(w, 'the ship you fly', 'fleetSell(2)', 'active', 'Switch');
  refused(w, 'a ship that does not exist', 'fleetSell(77)', 'gone');
  w.run(`fleetBuy('kite', false); fleetSwitch(1); G.fleet[1].at = '${KESTREL}'; G.fleet[2].at = '${KESTREL}'`);
  refused(w, 'a ship parked at another station', 'fleetSell(2)', 'there', 'Kestrel Outpost');
  w.run(`G.fleet[1].at = '${HOME}'`);
  const credits = w.run('G.credits'), want = 2700 + 480 + 3 * ORE_PRICE;
  const r = w.j('fleetSell(2)');
  check('selling the parked Kite pays 60% of its price, 50% of its parts and its ore', r.ok === true && r.got === want && r.value.total === want && w.run('G.credits') === credits + want, JSON.stringify(r.value));
  check('the ship is gone from the fleet', w.run('G.fleet.length') === 2 && w.run('fleetShip(2)') === null);
  check('you are still flying the Wren', w.run('G.fleet[G.active].model') === 'wren' && w.run('G.upgrades.armor') === 1);
  // the one you fly keeps its place in the list when a ship before it goes
  w.run(`G.credits = 99999; fleetBuy('kite', false); fleetBuy('kite', false); fleetSwitch(4);`); // fleet: Wren, uid 3 (at Kestrel), uid 4, uid 5; flying 4
  const flying = w.run('G.fleet[G.active].uid');
  w.run(`G.fleet[0].at = '${HOME}'; G.fleet[1].at = '${HOME}'; fleetSell(1)`);
  check('selling a ship in front of the one you fly keeps you in the same ship', w.run('G.fleet[G.active].uid') === flying && w.run('G.fleet.length') === 3);
  w.run('fleetSell(5)');
  check('selling one behind it does too, and you can never sell your way down to no ship', w.run('G.fleet[G.active].uid') === flying && w.run('G.fleet.length') === 2);
  w.run(`G.fleet[0].at = '${HOME}'`);
  w.run('fleetSell(3)');
  refused(w, 'your last ship is the one you fly', `fleetSell(${flying})`, 'active');
  check('one ship is left and it is the one you fly', w.run('G.fleet.length') === 1 && w.run('G.active') === 0);
}

console.log('renaming');
{
  const w = world();
  w.run(`G.credits = 99999; fleetBuy('kite', false);`);
  const nm = (u, s) => w.j(`fleetRename(${u}, ${JSON.stringify(s)})`);
  check('a name is trimmed and its spaces collapsed', nm(1, '  Old   Faithful  ').name === 'Old Faithful' && w.run('G.fleet[0].name') === 'Old Faithful');
  check('control characters become spaces', nm(1, 'Bell\u0007ow\nLine\tTab').name === 'Bell ow Line Tab');
  check('24 characters at most', nm(1, 'x'.repeat(40)).name.length === 24);
  refused(w, 'an empty name', `fleetRename(1, '')`, 'name');
  refused(w, 'a name of spaces', `fleetRename(1, '   \\t ')`, 'name');
  refused(w, 'no name at all', 'fleetRename(1)', 'name');
  refused(w, 'a ship that does not exist', `fleetRename(9, 'Ghost')`, 'gone');
  w.run(`G.fleet[1].at = '${MERIDIAN}'`);
  check('a ship parked far away can be renamed (a name is not a place)', nm(2, 'Far Kite').ok === true && w.run('G.fleet[1].name') === 'Far Kite');
  check('the active ship can be renamed and the uid does not change', nm(1, 'Wren Mk 2').ok === true && w.run('G.fleet[0].uid') === 1);
  check('an Object.prototype word is just text', nm(1, 'constructor').name === 'constructor');
}

console.log('transfer');
{
  const w = world();
  w.run(`G.credits = 10000; fleetBuy('kite', false);`); // Wren flying, the Kite parked here
  const c0 = w.run('G.credits');
  const r = w.j(`fleetTransfer(2, '${KESTREL}')`);
  check('sending the Kite to Kestrel costs 257 (100 + 25 x 6.265 ly)', r.ok === true && r.cost === 257 && Math.abs(r.ly - Math.hypot(5.5, 3)) < 1e-9 && w.run('G.credits') === c0 - 257, JSON.stringify(r));
  check('it is waiting there at once and no longer here', w.run('G.fleet[1].at') === KESTREL && w.j(`fleetAt('${HOME}').length`) === 1);
  refused(w, 'switching to it from here', 'fleetSwitch(2)', 'there', 'Kestrel Outpost');
  refused(w, 'sending it where it already is', `fleetTransfer(2, '${KESTREL}')`, 'same', 'Kestrel Outpost');
  refused(w, 'the ship you fly', `fleetTransfer(1, '${KESTREL}')`, 'active');
  refused(w, 'a station that does not exist', `fleetTransfer(2, 'nowhere')`, 'station');
  refused(w, 'a ship that does not exist', `fleetTransfer(9, '${KESTREL}')`, 'gone');
  w.run('G.credits = 100');
  refused(w, 'not enough credits (Kestrel to Meridian costs 263 and you have 100)', `fleetTransfer(2, '${MERIDIAN}')`, 'credits', 'Need 163 more');
  w.run('G.credits = 10000');
  // pull it to where you are: dock at Meridian, ask for the Kite
  w.run(`G.lastDock = '${MERIDIAN}'`);
  const c1 = w.run('G.credits'), p = w.j('fleetTransfer(2)');
  check('with no station named it comes to you: Kestrel to Meridian costs 263', p.ok === true && p.cost === 263 && w.run('G.credits') === c1 - 263 && w.run('G.fleet[1].at') === MERIDIAN, JSON.stringify(p));
  check('the Wren you flew in is parked at Meridian with it', w.j(`fleetAt('${MERIDIAN}').map(r => r.uid)`).join() === '1,2');
  check('and you can fly the Kite out of there', w.run('fleetSwitch(2).ok') === true && w.run('G.fleet[G.active].model') === 'kite');
  w.run(`G.fleet[0].at = 'kestrel-outpost'`);
  check('a transfer inside one system costs only the 100', w.run(`fleetTransfer(1, 'kestrel-pad').cost`) === 100);
  w.run(`G.fleet[0].at = 'a-station-from-a-later-build'`);
  refused(w, 'a ship parked at a station this build does not know', `fleetTransfer(1, '${MERIDIAN}')`, 'station');
}

console.log('every refusal has the same shape; fleetList');
{
  const w = world();
  const rs = w.j(`[fleetBuy('x'), fleetSwitch(0), fleetSell(0), fleetRename(0, 'a'), fleetTransfer(0, 'x')]`);
  check('five refusals, each { ok: false, why, msg }', rs.every(r => r.ok === false && typeof r.why === 'string' && typeof r.msg === 'string' && Object.keys(r).sort().join() === 'msg,ok,why'));
  w.run(`G.credits = 9000; fleetBuy('kite', false)`);
  const rows = w.j('fleetList()');
  check('fleetList() gives a row per ship, the ship you fly marked', rows.length === 2 && rows[0].flying === '*' && rows[1].flying === '' && rows[1].name === 'Kite' && rows[1].parts === '00000' && rows[1].hull === '70/70');
}

// ================= Part 2: the real page =================
console.log('the real page: save and load, and dying');
const t = await launch('#space');
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Space') && typeof applySave === 'function')", 30000, 'Space active');
  const SP = "game.scene.getScene('Space')";
  const ev = x => t.ev(x);
  const json = x => ev(`JSON.stringify(${x})`).then(JSON.parse);
  check('the real files agree with the test world: the Kite is the only ship Halcyon sells', (await json(`stationYard('halcyon-station')`)).join() === 'kite');
  check('and the dock price of ore is the one the test used', (await ev('ORE_PRICE')) === ORE_PRICE);

  // a three-ship fleet in the real game: the snapshot and applySave round trip, with no storage and no clock
  await ev(`(() => { ${MORE_SYSTEMS}\n return 1; })()`);
  const rt = await json(`(() => {
    newGameState(); G.credits = 90000; G.hull = 61; G.ore = 2; G.upgrades.armor = 1;
    fleetBuy('kite'); G.hull = 40; G.ore = 5; G.fleet[1].parts.engine = 2; G.fleet[1].fuel = 12.5; fleetRename(2, 'Quick Kite');
    fleetBuy('ox', false); // not sold at Halcyon: refused
    G.fleet.push(Object.assign(newShip('ox', '${KESTREL}'), { uid: 3, name: 'Far Ox', hull: 150 }));
    fleetSync();
    const before = JSON.stringify(snapshot());
    const s = JSON.parse(before);
    newGameState(); applySave(s);
    const after = JSON.stringify(snapshot());
    return { same: before === after, n: G.fleet.length, active: G.active, uids: G.fleet.map(r => r.uid), names: G.fleet.map(r => r.name), at: G.fleet.map(r => r.at),
      hull: G.hull, ore: G.ore, fuel: G.fleet[1].fuel, engine: G.fleet[1].parts.engine, ox: G.fleet[2].hull, saved: s.fleet.map(r => r.model) };
  })()`);
  check('a three-ship fleet survives snapshot and applySave, byte for byte', rt.same === true);
  check('the three ships, their names and places are the same, and the Kite (the one you fly) is where you wake',
    rt.n === 3 && rt.active === 1 && rt.uids.join() === '1,2,3' && rt.names.join() === 'Wren,Quick Kite,Far Ox' && rt.at.join() === 'halcyon-station,halcyon-station,kestrel-outpost', JSON.stringify(rt));
  check('each ship came back with its own hull, ore, fuel and parts', rt.hull === 40 && rt.ore === 5 && rt.fuel === 12.5 && rt.engine === 2 && rt.ox === 150, JSON.stringify(rt));
  check('the model of each ship is saved by id', rt.saved.join() === 'wren,kite,ox');
  const wake = await json(`(() => { newGameState(); const s = JSON.parse(JSON.stringify(snapshot())); G.fleet[0].at = 'kestrel-outpost'; const s2 = JSON.parse(JSON.stringify(snapshot())); newGameState(); applySave(s2); return [G.fleet[G.active].at, G.lastDock]; })()`);
  check('you always wake with your ship docked at lastDock, even if the file says it was elsewhere', wake.join() === 'halcyon-station,halcyon-station', wake.join());

  // dying: the insurance flow stays, the ship you fly is rebuilt to ITS hull cap, the parked ships are untouched
  const dead = await json(`(() => {
    const sp = ${SP};
    newGameState(); G.credits = 10000; fleetBuy('kite'); G.credits = 2000; G.hull = 30;                       // Kite flying, Wren parked
    G.fleet[0].hull = 55; G.fleet[0].ore = 2; G.fleet[0].parts.shields = 2; G.fleet[0].fuel = 9;
    const parked = JSON.stringify(G.fleet[0]);
    sp.die();
    const a = { credits: G.credits, hull: G.hull, max: G.maxHull, n: G.fleet.length, kite: G.fleet[G.active].model, parked: JSON.stringify(G.fleet[0]) === parked };
    G.credits = 30; G.hull = 5;                                                          // too poor to pay: rebuilt at half hull
    sp.die();
    return { a, b: { credits: G.credits, hull: G.hull } };
  })()`);
  check('dying costs the 20% insurance fee (2000 to 1600)', dead.a.credits === 1600, JSON.stringify(dead.a));
  check('the Kite is rebuilt to its own hull cap, 70, not the Wren\'s 100 or 140', dead.a.hull === 70 && dead.a.max === 70, JSON.stringify(dead.a));
  check('no ship is lost and the parked Wren is exactly as it was', dead.a.n === 2 && dead.a.kite === 'kite' && dead.a.parked === true);
  check('too poor to pay: you pay what you have and the Kite is rebuilt at half hull (35)', dead.b.credits === 0 && dead.b.hull === 35, JSON.stringify(dead.b));
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); failed++; } finally { await t.close(); }

console.log(failed ? `\nFLEET FAIL (${failed} of ${n} checks)` : `\nFLEET PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
