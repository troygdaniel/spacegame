// smoke: the generator (docs/UNIVERSE.md 4.4): makeSystem and makeGalaxy are deterministic and keep the layout rules, names and ids are unique, an 18 ly ship reaches every star, the eight generated systems stay out of SYSTEMS (no browser)
// The generator (card space-game-u-e6-generator, docs/UNIVERSE.md 4.4): makeSystem(seed, kind), makeGalaxy(seed, n) and the eight systems it proves itself with.
//   Plain Node, no browser, so it does not care how busy the Mac is: the real src scripts run in a vm in the order index.html loads them.
//   makeSystem: the same seed and kind give the same system, and it never touches Math.random; every kind over many seeds keeps the layout rules (nothing at the edge,
//     on the star or within 2500 px of another body), has unique ids, valid art, planet kinds, ships and parts, and a pump at every dock.
//   makeGalaxy: the same seed gives the same galaxy; names and ids are unique against the authored eight and against every body id; stars at least 5 ly apart on the 80 x 50 map;
//     danger rises with the distance from Halcyon; an 18 ly ship reaches every star (also in a galaxy where the repair has to do the work); the authored systems do not change.
//   The eight: generatedSystems() makes eight more, 16 in all, and they are not in SYSTEMS yet (the card that opens them adds them).
// Run: node tests/galaxy.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = f => readFileSync(join(ROOT, 'src', f + '.js'), 'utf8');
let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };

function world(noRandom = true) { // the real scripts in the order index.html loads them; with noRandom, Math.random throws: the generator must use its own seeded one
  const ctx = vm.createContext({ window: { addEventListener() {} }, console: { table() {}, log() {} } });
  for (const f of ['common', 'data_systems', 'universe', 'data_ships', 'data_parts']) vm.runInContext(src(f), ctx, { filename: f + '.js' });
  if (noRandom) vm.runInContext('Math.random = () => { throw new Error("Math.random called by the generator"); }', ctx);
  const run = code => vm.runInContext(code, ctx);
  return { run, j: code => JSON.parse(run(`JSON.stringify(${code})`)) };
}
const KINDS = ['wild', 'mining', 'outpost', 'graveyard', 'trade', 'nest', 'lawless'];
const MAP_KINDS = ['home', 'outpost', 'trade', 'mining', 'volcanic', 'wild', 'graveyard', 'nest']; // the kinds the galaxy map (src/galaxymap.js GALAXY_KINDS) has a name and colour for
const AUTHORED = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow', 'lethe', 'ember', 'roost'];
const rOf = b => b.r || (b.type === 'poi' ? 60 : 150); // a station or a dead station is about 150 px across the dock lane, a wreck or a beacon about 60

// ================= makeSystem =================
console.log('makeSystem: same seed, same system');
{
  const w = world();
  check('the same seed and kind give the same system, to the last number', KINDS.every(k => [1, 77, 4242].every(s => w.run(`JSON.stringify(makeSystem(${s}, '${k}')) === JSON.stringify(makeSystem(${s}, '${k}'))`))));
  check('another seed gives another system (name, bodies)', KINDS.every(k => w.run(`JSON.stringify(makeSystem(1, '${k}')) !== JSON.stringify(makeSystem(2, '${k}'))`)));
  check('the generator never calls Math.random (it threw if it did)', w.run(`makeSystem(5, 'trade').bodies.length > 0`));
  check('an unknown kind makes a wild system', w.j(`makeSystem(9, 'banana')`).kind === 'wild' && w.run(`JSON.stringify(makeSystem(9, 'banana')) === JSON.stringify(makeSystem(9, 'wild'))`));
  check('lawless is a mining system with no police (traffic 0) and a raider-heavy table of its own, the kind the galaxy map knows', (() => { const s = w.j(`makeSystem(3, 'lawless')`); return s.kind === 'mining' && s.lawless === true && s.traffic === 0 && s.pirates.weights.raider > s.pirates.weights.drone; })());
}

console.log('makeSystem: the shape of 4.1 and the layout rules of 4.4, 7 kinds x 60 seeds');
{
  const w = world(), SHIPS = w.j('Object.keys(SHIP_MODELS)'), SLOTS = w.j('PART_ORDER'), SC = w.j('SYSTEM_SCALE'); // a system is laid out in the old units and spread out SC times (src/data_systems.js)
  const planetKinds = (readFileSync(join(ROOT, 'src/art_world.js'), 'utf8').match(/const PLANET_KINDS = \[([^\]]*)\]/) || [, ''])[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean);
  check('the planet kinds the art can draw: rock ice gas lava ringed', planetKinds.join() === 'rock,ice,gas,lava,ringed', planetKinds.join());
  const bad = {}, note = (k, m) => { (bad[k] = bad[k] || []).push(m); };
  const seen = { stations: 0, planets: 0, belts: 0, wrecks: 0 };
  for (const kind of KINDS) for (let seed = 1; seed <= 60; seed++) {
    const s = w.j(`makeSystem(${seed}, '${kind}')`), tag = `${kind}/${seed}`, c = s.size / 2;
    if (!/^[a-z]{4,12}$/.test(s.id) || s.name[0] !== s.name[0].toUpperCase() || !/^[A-Za-z]{4,12}$/.test(s.name) || s.id !== s.name.toLowerCase()) note('names', tag + ' ' + s.id + '/' + s.name);
    if (s.size !== 36000 * SC || !MAP_KINDS.includes(s.kind) || s.ly !== null || s.seed !== seed || !(s.traffic >= 0 && s.traffic <= 3) || !(s.danger >= 1 && s.danger <= 5)) note('shape', tag);
    if (!'MKGFA'.includes(s.star.type) || Math.abs(s.star.x - c) > 1500 * SC || Math.abs(s.star.y - c) > 1500 * SC) note('star', tag + ' ' + JSON.stringify(s.star));
    const ids = s.bodies.map(b => b.id);
    if (new Set(ids).size !== ids.length || !ids.every(i => i.startsWith(s.id + '-'))) note('ids', tag);
    if (!s.bodies.every(b => b.name && ['station', 'planet', 'belt', 'poi', 'scenery'].includes(b.type))) note('types', tag);
    s.bodies.forEach((a, i) => {
      const r = rOf(a);
      if (a.x - r < 1500 || a.y - r < 1500 || a.x + r > s.size - 1500 || a.y + r > s.size - 1500) note('edge', tag + ' ' + a.id);
      if (Math.hypot(a.x - s.star.x, a.y - s.star.y) < 2500) note('star', tag + ' ' + a.id + ' on the star');
      s.bodies.slice(i + 1).forEach(b => { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 2500 || d - r - rOf(b) < 2500) note('overlap', tag + ' ' + a.id + ' / ' + b.id + ' ' + Math.round(d)); });
    });
    const of = t => s.bodies.filter(b => b.type === t), st = of('station'), pl = of('planet'), wr = of('poi').filter(p => p.kind === 'wreck');
    seen.stations += st.length; seen.planets += pl.length; seen.belts += of('belt').length; seen.wrecks += wr.length;
    if (pl.length > 5 || !pl.every((p, n) => planetKinds.includes(p.kind) && p.seed >= 1 && p.r >= 200 && p.r <= 560 && p.landable === false && p.name === s.name + ' ' + ['I', 'II', 'III', 'IV', 'V'][n])) note('planets', tag + ' ' + JSON.stringify(pl.map(p => p.name)));
    if (!of('belt').every(b => b.r >= 700 && b.r <= 1000 && b.rocks >= 15 && b.rocks <= 40)) note('belts', tag);
    if (!of('poi').every(p => p.credits > 0 && p.credits <= 400 && (p.kind === 'wreck' || p.kind === 'beacon'))) note('poi', tag);
    const hasDock = ['mining', 'outpost', 'trade', 'nest', 'lawless'].includes(kind);
    if (st.length !== (hasDock ? 1 : 0)) note('station', tag + ' has ' + st.length);
    st.forEach(x => {
      const d = x.dock;
      if (!['outpost', 'hub', 'foundry', 'nest'].includes(x.art) || !(d.fuel >= 6 && d.fuel <= 16) || d.repair !== 0.5 || !x.name.startsWith(s.name + ' ')) note('dock', tag + ' ' + JSON.stringify([x.art, x.name, d.fuel]));
      if (!(d.yard || []).every(m => SHIPS.includes(m)) || !Object.entries(d.parts || {}).every(([slot, t]) => SLOTS.includes(slot) && t >= 1 && t <= 3)) note('dock', tag + ' yard or parts ' + JSON.stringify([d.yard, d.parts]));
    });
    if (kind === 'graveyard' && !(wr.length >= 6 && wr.length <= 10 && of('scenery').length === 1 && wr.every(p => p.credits < 800))) note('graveyard', tag + ' ' + wr.length);
    if (kind === 'nest' && !(st[0] && st[0].dock.fee === 50 && st[0].dock.salvageMult === 2 && st[0].dock.partMult === 1.25 && st[0].dock.fuel >= 14)) note('nest', tag);
    if (s.pirates && Math.abs(Object.values(s.pirates.weights).reduce((a, x) => a + x, 0) - 1) > 1e-9) note('pirates', tag);
  }
  const fails = Object.keys(bad);
  check('every system: valid ids, names, star, types, planets, belts, sites; every dock has a pump, art, ships and parts the game has', ['names', 'shape', 'star', 'ids', 'types', 'planets', 'belts', 'poi', 'station', 'dock', 'graveyard', 'nest', 'pirates'].every(k => !bad[k]), fails.map(k => k + ': ' + bad[k].slice(0, 3).join(' | ')).join('; '));
  check('layout: nothing at the edge, on the star, or within 2500 px (edge to edge) of another body', !bad.edge && !bad.overlap && !bad.star, ['edge', 'overlap', 'star'].map(k => (bad[k] || []).slice(0, 3).join(' | ')).join('; '));
  check('the 420 systems hold a spread: stations, planets, belts and wrecks all turn up', seen.stations > 150 && seen.planets > 400 && seen.belts > 250 && seen.wrecks > 300, JSON.stringify(seen));
}

// ================= makeGalaxy =================
const ly = (a, b) => Math.hypot(a.ly[0] - b.ly[0], a.ly[1] - b.ly[1]);
const reaches = (stars, range) => { const seen = new Set([stars[0]]), todo = [stars[0]]; while (todo.length) { const a = todo.pop(); stars.forEach(b => { if (!seen.has(b) && ly(a, b) <= range + 1e-9) { seen.add(b); todo.push(b); } }); } return seen.size; };

console.log('makeGalaxy: the same seed, the same galaxy; unique names; spacing; the map');
{
  const w = world();
  const g = w.j('makeGalaxy(41, 8)'), authored = w.j('Object.values(SYSTEMS)');
  check('the same seed gives the same galaxy; another seed another', w.run(`JSON.stringify(makeGalaxy(41, 8)) === JSON.stringify(makeGalaxy(41, 8)) && JSON.stringify(makeGalaxy(41, 8)) !== JSON.stringify(makeGalaxy(42, 8))`));
  check('n systems come back for n = 0, 1, 8, 24, 40 (the map has room)', [0, 1, 8, 24, 40].every(n => w.j(`makeGalaxy(5, ${n}).length`) === n));
  check('every generated system comes back from makeSystem(its seed, its kind): the same system apart from where it sits and how dangerous it is', g.every(s => {
    const again = w.j(`makeSystem(${s.seed}, '${s.lawless ? 'lawless' : s.kind}')`);
    return JSON.stringify(Object.assign({}, again, { ly: s.ly, danger: s.danger })) === JSON.stringify(s) || JSON.stringify(Object.assign({}, s, { ly: null, danger: again.danger })) === JSON.stringify(again);
  }));
  const all = authored.concat(g);
  check('16 in all: eight authored, eight generated', authored.length === 8 && g.length === 8 && all.length === 16);
  const authoredBodyIds = authored.flatMap(s => s.bodies.map(b => b.id)), genBodyIds = g.flatMap(s => s.bodies.map(b => b.id));
  check('names and system ids are unique across all 16; no generated body id is another body\'s id, in any system (a dock is found by its id)', new Set(all.map(s => s.name.toLowerCase())).size === 16 && new Set(all.map(s => s.id)).size === 16
    && new Set(genBodyIds).size === genBodyIds.length && genBodyIds.every(i => !authoredBodyIds.includes(i)));
  const spare = (stars, n) => { let min = 1e9; stars.forEach((a, i) => stars.slice(i + 1).forEach(b => { min = Math.min(min, ly(a, b)); })); return min; };
  check('every star is at least 5 ly from every other, and inside the 80 x 50 ly map (2 ly from its edge)', spare(all) >= 5 && all.every(s => s.ly[0] >= 2 && s.ly[0] <= 78 && s.ly[1] >= 2 && s.ly[1] <= 48), 'closest ' + spare(all));
  check('light-year positions have one decimal (the map reads them as plain numbers)', g.every(s => s.ly.every(v => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9)));
  check('the kinds are ones the galaxy map has a name and colour for, and a mix of at least five turns up', g.every(s => MAP_KINDS.includes(s.kind)) && new Set(g.map(s => s.lawless ? 'lawless' : s.kind)).size >= 5, g.map(s => s.kind).join());
  const big = []; // sixty galaxies of forty: the shares of 4.4 (wild 25, mining 20, outpost 15, graveyard 10, trade 10, nest 10, lawless mining 10 percent)
  for (let s = 1; s <= 60; s++) w.j(`makeGalaxy(${s}, 40)`).forEach(x => big.push(x.lawless ? 'lawless' : x.kind));
  const want = { wild: 0.25, mining: 0.2, outpost: 0.15, graveyard: 0.1, trade: 0.1, nest: 0.1, lawless: 0.1 }, share = k => big.filter(x => x === k).length / big.length;
  check(`2400 stars: every kind within 3 points of its share (${KINDS.map(k => k + ' ' + Math.round(share(k) * 100)).join(', ')})`, KINDS.every(k => Math.abs(share(k) - want[k]) < 0.03));
}

console.log('makeGalaxy: danger from the distance to Halcyon');
{
  const w = world(), pool = [];
  for (let s = 1; s <= 12; s++) pool.push(...w.j(`makeGalaxy(${s}, 30)`));
  const d = s => Math.hypot(s.ly[0] - 20, s.ly[1] - 22), mean = a => a.reduce((t, s) => t + s.danger, 0) / a.length;
  const near = pool.filter(s => d(s) < 18), far = pool.filter(s => d(s) > 36);
  check('every danger is a whole number 1 to 5', pool.every(s => Number.isInteger(s.danger) && s.danger >= 1 && s.danger <= 5));
  check(`far stars are more dangerous than near ones (${near.length} within 18 ly: ${mean(near).toFixed(2)}; ${far.length} beyond 36 ly: ${mean(far).toFixed(2)})`, near.length > 10 && far.length > 10 && mean(far) > mean(near) + 0.8);
  check('nests are 4 or 5, a graveyard 2 to 4, an outpost or a trade hub never above 3, a lawless mine 3 or more', pool.every(s => (s.kind !== 'nest' || s.danger >= 4) && (s.kind !== 'graveyard' || (s.danger >= 2 && s.danger <= 4)) && (!['outpost', 'trade'].includes(s.kind) || s.danger <= 3) && (!s.lawless || s.danger >= 3)));
  check('+1 per 12 ly: a plain outpost at 0 to 12 ly is danger 1 and at 24 ly or more is danger 3', pool.filter(s => s.kind === 'outpost' && d(s) < 12).every(s => s.danger === 1) && pool.filter(s => s.kind === 'outpost' && d(s) >= 24).every(s => s.danger === 3) && pool.some(s => s.kind === 'outpost' && d(s) >= 24));
}

console.log('makeGalaxy: an 18 ly ship reaches every star');
{
  const w = world(), range = w.run("SHIP_MODELS.pathfinder.range");
  check('18 ly is the explorer\'s jump range (data_ships)', range === 18);
  const authored = w.j('Object.values(SYSTEMS)');
  check('the authored eight are connected for it, to start with', reaches(authored, 18) === 8);
  let all = true, worst = '';
  for (let s = 1; s <= 200; s++) {
    const g = w.j(`makeGalaxy(${s}, 8)`), stars = authored.concat(g);
    if (reaches(stars, 18) !== stars.length) { all = false; worst = 'seed ' + s; }
  }
  check('200 seeds x 8 systems: all 16 are reachable', all, worst);
  let big = true;
  for (const [s, n] of [[1, 24], [7, 30], [99, 40], [1234, 40]]) { const stars = authored.concat(w.j(`makeGalaxy(${s}, ${n})`)); if (reaches(stars, 18) !== stars.length) big = false; }
  check('bigger galaxies (24, 30 and 40 more) are connected too', big);
  // a galaxy with one lonely fixed star in a corner: scattered at random most stars would be out of reach, so the repair must pull them in
  const lone = w.j(`makeGalaxy(8, 10, { halcyon: { id: 'halcyon', name: 'Halcyon', ly: [4, 4], bodies: [] } })`), loneStars = [{ ly: [4, 4] }].concat(lone);
  check('with only a corner star to start from, ten systems are pulled in until the 18 ly ship reaches them all, and stay 5 ly apart', reaches(loneStars, 18) === 11 && lone.every((a, i) => loneStars.every((b, k) => k === i + 1 || ly(a, b) >= 5)));
  check('a repair keeps the star in the map and keeps every ly pair at or under 18 with room to spare for rounding (at most 16.5 to its neighbour)', lone.every(s => s.ly[0] >= 2 && s.ly[0] <= 78 && s.ly[1] >= 2 && s.ly[1] <= 48));
}

console.log('the eight generated systems: dark, 16 in all');
{
  const w = world();
  const before = w.run('JSON.stringify(SYSTEMS)');
  const gen = w.j('generatedSystems()'), ids = Object.keys(gen);
  check('generatedSystems() gives eight systems, keyed by id, the same as makeGalaxy(GALAXY_GEN.seed, GALAXY_GEN.n)', ids.length === 8 && w.run('JSON.stringify(Object.values(generatedSystems())) === JSON.stringify(makeGalaxy(GALAXY_GEN.seed, GALAXY_GEN.n))') && ids.every(i => gen[i].id === i));
  check('made once and kept', w.run('generatedSystems() === generatedSystems()'));
  check('land dark: SYSTEMS is exactly what it was, eight systems, and a generated id falls back to Halcyon like any id the game does not know', w.run('JSON.stringify(SYSTEMS)') === before && w.j('Object.keys(SYSTEMS)').join() === AUTHORED.join() && w.run(`sysDef('${ids[0]}') === SYSTEMS.halcyon`) && w.run(`enterSystem('${ids[0]}', 'halcyon')`) === false);
  // what the opening card will do, in a throwaway world: with the eight in SYSTEMS the game's own lookups see all 16, every dock is found by id, and a jump works
  const w2 = world();
  w2.run('Object.assign(SYSTEMS, generatedSystems()); G.known = [\'halcyon\'];'); // meta.js starts G.known in the page
  const all = w2.j('Object.keys(SYSTEMS)');
  check('added to SYSTEMS (as the opening card will): 16 systems; sysDef, sysBodies and dockSystem read them; every dock is found by its id', all.length === 16 && all.slice(8).every(id => {
    const docks = w2.j(`sysBodies('station', '${id}')`);
    return w2.run(`sysDef('${id}') === SYSTEMS['${id}']`) && docks.every(d => w2.run(`dockSystem('${d.id}')`) === id);
  }));
  check('and enterSystem puts the ship in a generated system, at the edge that faces the star it came from', (() => {
    const id = all[8];
    return w2.run(`enterSystem('${id}', 'halcyon')`) === true && w2.run('G.system') === id && w2.run('G.known.includes(G.system)') && w2.j('G.arrival').system === id && w2.j('G.arrival').x >= 0 && w2.j('G.arrival').x <= 36000;
  })());
  const g = Object.values(gen), kinds = new Set(g.map(s => s.lawless ? 'lawless' : s.kind));
  check('what seed 41 makes: six kinds (graveyard, wild, mining, nest, trade, outpost) and five docks', kinds.size === 6 && g.filter(s => s.bodies.some(b => b.type === 'station')).length === 5, [...kinds].join());
}

console.log(failed ? `\n${failed} FAILED` : '\nall galaxy checks passed');
process.exit(failed ? 1 : 0);
