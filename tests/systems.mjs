// The eight star systems (card space-game-u-b5-systems-8, docs/UNIVERSE.md 4.2): authored in src/data_systems.js, drawn and flown by the Space scene.
//   Part 1 runs the data in a plain Node context (no browser, so it does not care how busy the Mac is): the design table (places, danger, traffic), the jump distances
//   and which ship reaches which system, the layout rules, every dock (pump, yard, parts), every pirate table.
//   Part 2 runs the real page once, with the game clock stepped by hand: the shipped markdown (content/systems, content/stations) says the same as the code field by
//   field; every system is built by the Space scene without an error, with the sky, the bodies, the traffic and the pirates its data asks for; you can dock at each
//   station, and the dock is where the pump, the yard and the fleet look; Halcyon is the Halcyon it always was.
// Run: node tests/systems.mjs   (exit code 1 on a failed check; one Chrome, closed at the end)
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { launch, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = f => readFileSync(join(ROOT, 'src', f + '.js'), 'utf8');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };

// the table of docs/UNIVERSE.md 4.2: id, name, kind, ly, danger, traffic, has a station, pump price (0: none)
const DESIGN = [
  ['halcyon', 'Halcyon', 'home', [20, 22], 1, 2, true, 8],
  ['kestrel', 'Kestrel', 'outpost', [25.5, 19], 1, 1, true, 7],
  ['meridian', 'Meridian', 'trade', [29, 24.5], 1, 3, true, 9],
  ['brass', 'Brass Reach', 'mining', [14, 26.5], 2, 1, true, 6],
  ['hollow', 'The Hollow', 'wild', [13.5, 17.5], 2, 0, false, 0],
  ['lethe', 'Lethe', 'graveyard', [7.5, 30], 2, 0, false, 0],
  ['ember', 'Ember', 'volcanic', [34, 31], 3, 1, true, 6],
  ['roost', "Reaver's Roost", 'nest', [37, 15], 5, 0, true, 15]
];
const IDS = DESIGN.map(d => d[0]);

function world() { // the real scripts in the order index.html loads them
  const ctx = vm.createContext({ window: { addEventListener() {} }, console: { table() {}, log() {} } });
  for (const f of ['common', 'data_systems', 'universe', 'data_ships', 'data_parts', 'fleet']) vm.runInContext(src(f), ctx, { filename: f + '.js' });
  vm.runInContext('G.lastDock = homeDock();', ctx);
  const run = code => vm.runInContext(code, ctx);
  return { run, j: code => JSON.parse(run(`JSON.stringify(${code})`)) };
}

// ================= Part 1: the data =================
console.log('the design table');
{
  const w = world();
  check('eight systems, Halcyon first', w.j('Object.keys(SYSTEMS)').join() === IDS.join());
  DESIGN.forEach(([id, name, kind, ly, danger, traffic, hasStation]) => {
    const s = w.j(`SYSTEMS.${id}`), st = s.bodies.filter(b => b.type === 'station');
    check(`${id}: ${name}, ${kind}, at ${ly.join(', ')} ly, danger ${danger}, traffic ${traffic}, 36000 px`,
      s.name === name && s.kind === kind && s.ly.join() === ly.join() && s.danger === danger && s.traffic === traffic && s.size === 36000, JSON.stringify([s.name, s.kind, s.ly, s.danger, s.traffic, s.size]));
    check(`${id}: ${hasStation ? 'one station' : 'no station'}`, st.length === (hasStation ? 1 : 0));
  });
  check('an id of the game that nothing else knows still falls back to Halcyon', w.run(`sysDef('nowhere') === SYSTEMS.halcyon`));
}

console.log('distances and what reaches what');
{
  const w = world();
  const ly = (a, b) => w.j(`Math.hypot(SYSTEMS.${a}.ly[0] - SYSTEMS.${b}.ly[0], SYSTEMS.${a}.ly[1] - SYSTEMS.${b}.ly[1])`);
  const near = (a, b, v) => Math.abs(ly(a, b) - v) < 0.06;
  check('the distances of the design table: 6.3, 9.3, 7.5, 7.9 from Halcyon; Kestrel to Meridian 6.5; Brass to Lethe 7.4; Meridian to Ember 8.2',
    near('halcyon', 'kestrel', 6.3) && near('halcyon', 'meridian', 9.3) && near('halcyon', 'brass', 7.5) && near('halcyon', 'hollow', 7.9) && near('kestrel', 'meridian', 6.5) && near('brass', 'lethe', 7.4) && near('meridian', 'ember', 8.2));
  check('the Roost: 12.2 from Kestrel, 12.4 from Meridian', near('kestrel', 'roost', 12.2) && near('meridian', 'roost', 12.4));
  // every system a ship can get to from Halcyon, hop by hop, each hop within its range (the design counts hops: a tank is bought at every pump on the way)
  const reach = (model, tiers) => w.j(`(() => {
    const rec = newShip('${model}'); rec.parts.engine = ${tiers}; const range = shipStat('range', rec), seen = ['halcyon'];
    for (let i = 0; i < seen.length; i++) Object.keys(SYSTEMS).forEach(id => { if (!seen.includes(id) && Math.hypot(SYSTEMS[id].ly[0] - SYSTEMS[seen[i]].ly[0], SYSTEMS[id].ly[1] - SYSTEMS[seen[i]].ly[1]) <= range + 1e-9) seen.push(id); });
    return { range, seen };
  })()`);
  const starter = reach('wren', 0);
  check('the starter (8 ly) reaches six of the eight: Halcyon, Kestrel, Meridian, Brass Reach, the Hollow and Lethe', starter.range === 8 && starter.seen.length === 6 && ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow', 'lethe'].every(i => starter.seen.includes(i)), JSON.stringify(starter));
  check('Ember and the Roost are out of its reach', !starter.seen.includes('ember') && !starter.seen.includes('roost'));
  check('one engine tier (+1 ly) and the starter reaches Ember', reach('wren', 1).seen.includes('ember') && !reach('wren', 1).seen.includes('roost'), JSON.stringify(reach('wren', 1)));
  const roost = ['wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion'].filter(m => reach(m, 0).seen.includes('roost'));
  check('only the courier (kite) and the explorer (pathfinder) reach the Roost', roost.join() === 'kite,pathfinder', roost.join());
  check('the heavy (7 ly) reaches only Halcyon, Kestrel and Meridian', reach('bastion', 0).seen.join() === 'halcyon,kestrel,meridian', reach('bastion', 0).seen.join());
  check('no system is cut off: the explorer reaches all eight', reach('pathfinder', 0).seen.length === 8);
}

console.log('the layout rules (docs/UNIVERSE.md 4.4): nothing at the edge, on the star or within 2500 px of another body');
{
  const w = world();
  IDS.filter(id => id !== 'halcyon').forEach(id => {
    const s = w.j(`SYSTEMS.${id}`), bad = [], sx = s.star.x, sy = s.star.y;
    s.bodies.forEach((a, i) => {
      if (a.x < 1500 || a.y < 1500 || a.x > s.size - 1500 || a.y > s.size - 1500) bad.push(a.id + ' at the edge');
      if (Math.hypot(a.x - sx, a.y - sy) < 2500) bad.push(a.id + ' on the star');
      s.bodies.slice(i + 1).forEach(b => { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 2500 || d - (a.r || 0) - (b.r || 0) < 1200) bad.push(a.id + ' / ' + b.id + ' ' + Math.round(d)); });
    });
    check(`${id}: ${s.bodies.length} bodies, all clear of each other, the star and the edge`, bad.length === 0, bad.join('; '));
    check(`${id}: ids are unique and every body has a name or is a station (named by its file)`, new Set(s.bodies.map(b => b.id)).size === s.bodies.length && s.bodies.every(b => b.name));
  });
}

console.log('what each system has');
{
  const w = world(), S = id => w.j(`SYSTEMS.${id}`), of = (s, type) => s.bodies.filter(b => b.type === type);
  const k = S('kestrel'), m = S('meridian'), b = S('brass'), h = S('hollow'), l = S('lethe'), e = S('ember'), r = S('roost');
  check('Kestrel: a ringed gas giant, a quiet outpost, no yard', of(k, 'planet')[0].kind === 'ringed' && of(k, 'station')[0].art === 'outpost' && !of(k, 'station')[0].dock.yard);
  check('Meridian: the hub look, a shipyard that sells all six, parts to tier 3 in all five slots, ore 26, fuel 9',
    of(m, 'station')[0].art === 'hub' && of(m, 'station')[0].dock.yard.length === 6 && Object.keys(of(m, 'station')[0].dock.parts).length === 5 && Object.values(of(m, 'station')[0].dock.parts).every(t => t === 3) && of(m, 'station')[0].dock.ore === 26 && of(m, 'station')[0].dock.fuel === 9);
  check('Brass Reach: three belts, a foundry that pays 30 for ore, cargo and tank parts, sells the hauler',
    of(b, 'belt').length === 3 && of(b, 'station')[0].art === 'foundry' && of(b, 'station')[0].dock.ore === 30 && Object.keys(of(b, 'station')[0].dock.parts).sort().join() === 'cargo,tank' && of(b, 'station')[0].dock.yard.join() === 'ox');
  check('the Hollow: one ice world to land on, a beacon, nothing to buy', of(h, 'planet').length === 1 && of(h, 'planet')[0].kind === 'ice' && of(h, 'planet')[0].landable === true && of(h, 'poi').some(p => p.kind === 'beacon') && of(h, 'station').length === 0);
  check('Lethe: fourteen wrecks, one that pays 800, no station', of(l, 'poi').filter(p => p.kind === 'wreck').length === 14 && of(l, 'poi').filter(p => p.credits === 800).length === 1 && of(l, 'station').length === 0);
  check('Ember: a lava world, two belts, weapons parts to tier 3, sells the fighter (talon), ore 28',
    of(e, 'planet')[0].kind === 'lava' && of(e, 'belt').length === 2 && of(e, 'station')[0].dock.parts.weapons === 3 && of(e, 'station')[0].dock.yard.join() === 'talon' && of(e, 'station')[0].dock.ore === 28);
  const rd = of(r, 'station')[0].dock;
  check('the Roost: the nest look, fuel 15, a 50 cr fee, salvage at double, shield and weapon parts at x1.25, the heavy (bastion)', of(r, 'station')[0].art === 'nest' && rd.fuel === 15 && rd.fee === 50 && rd.salvageMult === 2 && rd.partMult === 1.25 && Object.keys(rd.parts).sort().join() === 'shields,weapons' && rd.yard.join() === 'bastion');
  check('Halcyon is untouched: station, planet, belt, five sites, the outpost, the gate and the far bodies of cruise (14 bodies)', S('halcyon').bodies.length === 14 && S('halcyon').bodies[0].dock.fuel === 8);
  const stations = IDS.flatMap(id => of(S(id), 'station'));
  check('every dock with a pump has a price, every yard names ships the game has, every part slot and tier is one the game has',
    stations.every(st => st.dock.fuel > 0 && (st.dock.yard || []).every(m => w.run(`!!SHIP_MODELS['${m}']`)) && Object.entries(st.dock.parts || {}).every(([slot, t]) => w.run(`['engine','shields','weapons','tank','cargo'].includes('${slot}')`) && t >= 1 && t <= 3)));
  check('the pump rule of the fuel card: the systems with no pump are the Hollow and Lethe', IDS.filter(id => w.run(`!SYSTEMS['${id}'].bodies.some(b => b.type === 'station' && b.dock && b.dock.fuel > 0)`)).join() === 'hollow,lethe');
  check('a station has its art from a look the game can draw', stations.every(st => ['station', 'outpost', 'hub', 'foundry', 'nest', 'derelict'].includes(st.art)));
}

console.log('pirates');
{
  const w = world();
  ['brass', 'lethe', 'ember'].forEach(id => {
    const p = w.j(`SYSTEMS.${id}.pirates`), sum = Object.values(p.weights).reduce((a, x) => a + x, 0);
    check(`${id}: its own table, weights adding to 1`, p.max > 0 && p.every >= 1000 && Math.abs(sum - 1) < 1e-9, JSON.stringify(p));
  });
  const top = id => { const w2 = w.j(`SYSTEMS.${id}.pirates.weights`); return Object.keys(w2).sort((a, b) => w2[b] - w2[a])[0]; };
  check('Brass Reach is hunted by raiders, Lethe is picked over by drones, Ember has gunships and raiders', top('brass') === 'raider' && top('lethe') === 'drone' && ['raider', 'gunship'].includes(top('ember')));
  check('the other four systems take their table from the danger (enemies.js)', ['kestrel', 'meridian', 'hollow', 'roost'].every(id => w.run(`SYSTEMS.${id}.pirates === undefined`)));
}

// ================= Part 2: the page =================
const SP = "game.scene.getScene('Space')";
const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500);
  await t.ev('(() => { G.guideDone = true; G.endingSeen = true; G.mission = "none"; return 1; })()'); // #space starts with a call under way; the board checks below want an empty hand
  await t.clock();
  await t.ev(`(() => { const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0); performance.now = () => __t; return 1; })()`); // tweens time themselves on the stepped clock, so a dock takes the same frames at any load
  const E = x => t.ev(/;/.test(x) && !/^\(\(\) =>/.test(x) ? `(() => { ${x}; return 1; })()` : x);
  const J = async x => JSON.parse(await t.ev(`JSON.stringify(${x})`));
  const tick = async f => { for (let left = f; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); };
  // arrive in a system the way a jump does: the Space scene restarts with where it is going and where it came from
  const arrive = async (to, from) => {
    await E(`${SP}.scene.restart({ from: 'jump', to: '${to}', origin: ${from ? "'" + from + "'" : 'null'} })`);
    await tick(40);
    for (let i = 0; i < 6 && !(await E(`G.system === '${to}' && game.scene.isActive('Space') && !!${SP}.ship && !!${SP}.tr`)); i++) await tick(20);
    await E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; G.hull = G.maxHull; return 1; })()`);
  };

  console.log('the shipped files say what the code says');
  check('worldAt gives the code row for every one of the eight', await E(`worldIds().length === 8 && worldIds().every(i => worldAt(i) === SYSTEMS[i])`));
  const ign = (a, b, path = '') => { // the paths where a and b differ: key order does not matter
    if (a === b) return [];
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return [path + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)];
    const out = [];
    if (Array.isArray(a)) { if (a.length !== b.length) out.push(path + ': ' + a.length + ' items vs ' + b.length); a.forEach((x, i) => out.push(...ign(x, b[i], path + '[' + i + ']'))); return out; }
    new Set(Object.keys(a).concat(Object.keys(b))).forEach(k => out.push(...ign(a[k], b[k], path + '.' + k)));
    return out;
  };
  for (const id of IDS.filter(i => i !== 'halcyon')) {
    const files = await J(`worldFromFiles('${id}')`), code = await J(`SYSTEMS.${id}`);
    delete files.description; files.bodies.forEach(b => { delete b.about; }); // the words are the Station scene's: the files only
    const d = ign(code, files);
    check(`${id}: the files and the code row are the same system (${code.bodies.length} bodies)`, d.length === 0, d.join(' | '));
  }
  check('the station files do not move Halcyon\'s prices (repair 0.5, ore 20)', await E(`REPAIR_PRICE === 0.5 && ORE_PRICE === 20`));
  check('a station file reads back its own dock prices (Brass Smelter ore 30, Meridian Exchange repair 0.5)', await E(`CONTENT_TABLES.station.get('brass-smelter', 'ore') === 30 && CONTENT_TABLES.station.get('meridian-exchange', 'repair') === 0.5 && CONTENT_TABLES.station.get('halcyon-station', 'ore') === 20`));

  console.log('every system is built, drawn and flown');
  const TINT = { M: 0xff9a80, K: 0xffbf85, G: 0xfff0c8, F: 0xe4eeff, A: 0xa8c8ff };
  for (const [id, name, , , danger, traffic, hasStation] of DESIGN) {
    await arrive(id, id === 'halcyon' ? 'kestrel' : 'halcyon');
    const d = await J(`(() => { const s = ${SP}, sys = sysDef(), pl = sysBody('planet'), belts = sysBodies('belt'), sites = sysBodies('poi'), pt = pirateTable(sys);
      const far = s.children.list.filter(o => o.texture && ['sun', 'giant', 'moon'].concat(Object.keys(STAR_TYPES).map(k => 'star-' + k)).includes(o.texture.key)).map(o => o.texture.key);
      return { sys: G.system, ws: s.WS, nowhere: !!s.station.nowhere, planetNowhere: !!s.planet.nowhere, planetKey: s.planet.texture && s.planet.texture.key, planetScale: s.planet.scaleX, canLand: s.canLand,
        tint: s.bgLayers.map(l => l.tintTopLeft), far, rocks: s.ast.rocks.getChildren().length, want: belts.reduce((a, b) => a + b.rocks, 0), sites: sites.length,
        police: s.tr.police.length, civCap: s.tr.cap, trafficOff: !!s.tr.off, pt, shipOk: s.ship.x > 0 && s.ship.x < s.WS && s.ship.y > 0 && s.ship.y < s.WS, arrive: G.system === sys.id }; })()`);
    check(`${id}: you arrive in ${name}, a 36000 px world`, d.sys === id && d.ws === 36000 && d.shipOk);
    check(`${id}: ${hasStation ? 'the station is there' : 'no station: nothing to dock at'}`, d.nowhere === !hasStation);
    const pl = await J(`sysBody('planet')`);
    check(`${id}: the planet is drawn from its kind and seed${id === 'halcyon' ? ' (Kepler-4b keeps its own picture)' : ''}`, !d.planetNowhere && (id === 'halcyon' ? d.planetKey === 'planet' : d.planetKey === 'planet-' + pl.kind + '-' + pl.seed && Math.abs(d.planetScale - pl.r / (pl.kind === 'ringed' ? 206 : 300)) < 1e-6), JSON.stringify([d.planetKey, pl]));
    check(`${id}: you can land only on Kepler-4b`, d.canLand === (id === 'halcyon'));
    if (id === 'halcyon') check('Halcyon: the sky is the old one (the orange sun, the giant and the moon, no tint)', d.far.sort().join() === 'giant,moon,sun' && d.tint.every(c => c === 0xffffff), JSON.stringify([d.far, d.tint]));
    else {
      const star = await J(`sysDef().star.type`);
      check(`${id}: the sky takes its star (${star}): its sun in the sky, its tint on the star layers, no giant or moon`, d.far.join() === 'star-' + star && d.tint.every(c => (c & 0xffffff) === TINT[star]), JSON.stringify([d.far, d.tint.map(c => c.toString(16))]));
    }
    check(`${id}: the belts are rocks (${d.rocks} of ${d.want}) and the sites are there (${d.sites})`, d.rocks >= Math.floor(d.want * 0.8) && d.rocks <= d.want && d.sites === await E(`sysBodies('poi').length`));
    check(`${id}: traffic ${traffic} means ${traffic === 0 || !hasStation ? 'an empty sky' : Math.min(2, traffic) + ' police and room for ' + traffic + ' civilians'}`, traffic === 0 || !hasStation ? d.trafficOff : !d.trafficOff && d.police === Math.min(2, traffic) && d.civCap === traffic, JSON.stringify([d.police, d.civCap, d.trafficOff]));
    check(`${id}: the pirate table is the system's (danger ${danger}): ${d.pt.max} at most, one every ${d.pt.every / 1000} s`, d.pt.max > 0 && d.pt.every > 0 && Math.abs(Object.values(d.pt.weights).reduce((a, x) => a + x, 0) - 1) < 1e-9);
    await tick(240); // four seconds of flight: nothing throws
  }
  const base = await J(`pirateTable(SYSTEMS.kestrel)`), nest = await J(`pirateTable(SYSTEMS.roost)`), hal = await J(`pirateTable(SYSTEMS.halcyon)`);
  check('the table follows the danger: 3 at Kestrel, 12 at the Roost, Halcyon as it always was (8, every 15 s)', base.max === 3 && nest.max === 12 && nest.every < base.every && hal.max === 8 && hal.every === 15000, JSON.stringify([base, nest, hal]));

  console.log('docking: the pump, the yard and the fleet look at the station you dock at');
  for (const [id, , , , , , hasStation, pump] of DESIGN.filter(d => d[6])) {
    await arrive(id, id === 'halcyon' ? 'kestrel' : 'halcyon');
    const st = await J(`sysBody('station')`);
    await E(`(() => { const s = ${SP}; s.ship.setPosition(${st.x} - 290, ${st.y}); s.ship.setVelocity(0, 0); s.ship.body.setAcceleration(0, 0); s.ship.rotation = 0; s.cameras.main.centerOn(${st.x}, ${st.y}); s.launchAt = -1e6; return 1; })()`);
    await tick(6);
    check(`${id}: the prompt says Dock at ${st.name}`, (await E(`${SP}.prompt.text`)).includes('Dock at ' + st.name), await E(`${SP}.prompt.text`));
    await t.key('L'); await t.run(2500);
    await t.waitFor(`game.scene.isActive('Station')`, 8000, 'Station active');
    check(`${id}: docked: lastDock is ${st.id} and the active ship is parked there`, await E(`G.lastDock === '${st.id}' && activeShip().at === '${st.id}'`));
    const dk = await J(`(() => { const s = game.scene.getScene('Station'); return { pump: s.spots.some(p => p.key === 'pump'), price: fuelPrice(G.lastDock), yard: stationYard(G.lastDock), at: fleetAt().length }; })()`);
    check(`${id}: the pump is there at ${pump} cr a unit, the yard sells ${st.dock.yard ? st.dock.yard.filter(m => m !== 'wren').join(', ') : 'nothing'} (the free Wren is never sold)`, dk.pump === (pump > 0) && dk.price === (pump > 0 ? pump : null) && JSON.stringify(dk.yard) === JSON.stringify((st.dock.yard || []).filter(m => m !== 'wren')), JSON.stringify(dk));
    await E(`game.scene.getScene('Station').openPanel()`); await tick(5);
    const board = await J(`(() => { const s = game.scene.getScene('Station'); return { title: s.ui.titleText.text, objs: s.boardObjs.length, text: s.boardObjs.filter(o => o.text).map(o => o.text).join('|') }; })()`);
    if (id === 'halcyon') check('Halcyon posts calls, as before (offer cards)', board.title === 'MISSION BOARD  -  HALCYON STATION' && board.objs > 2, JSON.stringify(board));
    else check(`${id}: the board says there are no calls here yet`, board.title === 'MISSION BOARD  -  ' + st.name.toUpperCase() && board.text.includes('No calls are posted at ' + st.name), JSON.stringify(board));
    await E(`game.scene.getScene('Station').closePanel()`);
    await E(`(() => { game.scene.stop('Station'); game.scene.start('Space', { from: 'station' }); return 1; })()`); await tick(60);
    check(`${id}: launching puts you beside the station, in ${id}`, await E(`(() => { const s = ${SP}, d = Math.hypot(s.ship.x - s.station.x, s.ship.y - s.station.y); return G.system === '${id}' && d < 600; })()`));
    await tick(120);
  }

  console.log('the Hollow and Lethe have no pump and nothing to dock at');
  for (const id of ['hollow', 'lethe']) {
    await arrive(id, 'halcyon');
    check(`${id}: no station, no pump (the fuel ranger of the fuel card is the way home)`, await E(`!!${SP}.station.nowhere && !fuelSystemHasPump('${id}')`));
    await tick(120);
  }
  check('no console errors in the whole run', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
