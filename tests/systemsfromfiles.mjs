// smoke: the star systems the game flies are built from content/systems, content/stations and content/poi: the eight are as they were in code, a new file adds one (plain Node, no Chrome)
// Card space-game-systems-from-markdown. src/data_systems.js used to hold the eight systems as rows of code and a changed number in a file moved
// nothing. Now SYSTEMS is made from the entries of content.generated.js (sysRowsFrom). tests/fixtures/systems-code-rows.json is the eight rows as
// the code wrote them on 17 Nov 2026, taken before they were deleted: the built rows are held to it here, field by field.
// Run: node tests/systemsfromfiles.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 900) + ')' : ''}`); } };
const FIX = JSON.parse(readFileSync(new URL('./fixtures/systems-code-rows.json', import.meta.url), 'utf8'));
const g = nodeGame({ boot: false }); // the scripts loaded, nothing applied yet: SYSTEMS as the page has it before Boot
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
// every place two values differ, as lines; `extra` names the keys the built rows may have that the old code rows did not
const EXTRA = new Set(['description', 'about', 'seed']);
const diff = (built, old, p = '') => {
  if (built === old) return [];
  if (typeof built !== typeof old || built === null || old === null || typeof built !== 'object') return [p + ': ' + JSON.stringify(built) + ' built, ' + JSON.stringify(old) + ' in code'];
  const out = [];
  new Set([...Object.keys(built), ...Object.keys(old)]).forEach(k => { if (old[k] === undefined && EXTRA.has(k)) return; out.push(...diff(built[k], old[k], p + '.' + k)); });
  return out;
};

check('the fixture is the eight systems of 17 Nov, spread 3 times', FIX.order.join() === 'halcyon,kestrel,meridian,brass,hollow,lethe,ember,roost' && FIX.scale === 3 && FIX.systems.halcyon.bodies.length === 14);
const built = J(`(() => { const rows = sysRowsFrom(CONTENT); Object.keys(rows).forEach(id => sysScale(rows[id])); return rows; })()`);
check('the files build the same eight, in the same order', Object.keys(built).join() === FIX.order.join(), Object.keys(built).join());
let total = 0;
for (const id of FIX.order) {
  // dock.runs came after the fixture (card space-game-routes-from-files: the runs a dock posts were a list in src/missions.js, not part of a row): it is
  // checked against that list in tests/routesfromfiles.mjs and left out of this comparison
  const row = JSON.parse(JSON.stringify(built[id])); row.bodies.forEach(b => { if (b.dock) delete b.dock.runs; });
  const d = diff(row, FIX.systems[id]); total += d.length;
  check(`${id}: built from its files it is the row the code had, field by field (${FIX.systems[id].bodies.length} bodies)`, d.length === 0, d.slice(0, 6).join(' | '));
}
check('what the built rows have beyond the old code rows is only the words and the seed: a description for each system, about on each dock', FIX.order.every(id => typeof built[id].description === 'string') && FIX.order.every(id => built[id].bodies.filter(b => b.type === 'station').every(b => b.about && typeof b.about.welcome === 'string')));
check('the home dock leaves its repair and ore prices to the game\'s constants, as the code row did', (() => { const d = built.halcyon.bodies[0].dock; return d.repair === undefined && d.ore === undefined && d.fuel === 8; })());

// ---- the game flies what the files say ----
const live = J(`SYSTEMS`);
let liveDiff = 0; FIX.order.forEach(id => { live[id].bodies.forEach(b => { if (b.dock) delete b.dock.runs; }); liveDiff += diff(live[id], FIX.systems[id]).length; }); // dock.runs: see above
check('SYSTEMS, the table the game reads, is those rows', Object.keys(live).join() === FIX.order.join() && liveDiff === 0, liveDiff + ' differences');
check('SYSTEMS is made from the files, not written in code: src/data_systems.js has no body rows left', !/type: 'station', art:/.test(readFileSync(new URL('../src/data_systems.js', import.meta.url), 'utf8')) && J(`typeof SYSTEMS_FROM === 'string' ? SYSTEMS_FROM : ''`) === 'content');

// a changed number in a file moves the game: the same scripts with one field of one entry changed
const moved = (() => {
  const text = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
  const g2 = nodeGame({ boot: false, replace: { 'content.generated.js': text.replace('"id":"kepler-4b","type":"planet","name":"Kepler-4b","x":6200', '"id":"kepler-4b","type":"planet","name":"Kepler-4b","x":7000') } });
  return JSON.parse(g2.run(`JSON.stringify({ x: SYSTEMS.halcyon.bodies.find(b => b.id === 'kepler-4b').x, at: sysAt(7000), was: sysAt(6200) })`));
})();
check('change Kepler-4b from x 6200 to 7000 in the built content and the game\'s planet is there', moved.x === moved.at && moved.x !== moved.was, JSON.stringify(moved));

// a new file adds a system, with no code change
const added = (() => {
  const text = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
  const sol = { type: 'system', id: 'sol', path: 'content/systems/sol.md', data: { name: 'Sol', kind: 'wild', ly: [22, 20], size: 36000, danger: 0, traffic: 0, seed: 1, starType: 'G', starX: 18000, starY: 18000, description: 'Home.',
    bodies: [{ id: 'earth', type: 'planet', name: 'Earth', x: 21000, y: 18000, r: 300, landable: false, kind: 'rock', seed: 3 }, { id: 'sol-dock', type: 'station', name: 'High Earth', x: 21500, y: 18400, art: 'outpost' }] } };
  const dock = { type: 'station', id: 'sol-dock', path: 'content/stations/sol-dock.md', data: { name: 'High Earth', system: 'sol', fuel: 5, missions: [] } };
  const withSol = text.replace('  entries: [\n', '  entries: [\n  ' + JSON.stringify(sol) + ',\n  ' + JSON.stringify(dock) + ',\n');
  if (withSol === text) return { failed: 'could not add the entries to the built content' };
  const g2 = nodeGame({ replace: { 'content.generated.js': withSol } }); // booted: the content is applied too
  return JSON.parse(g2.run(`JSON.stringify({ ids: Object.keys(SYSTEMS), earth: (SYSTEMS.sol || { bodies: [] }).bodies.map(b => [b.id, b.type, b.x]), star: sysStar('sol') && sysStar('sol').name,
    onMap: galaxySystems().filter(s => s.id === 'sol').map(s => [s.name, s.ly, s.pump, s.station])[0] || null, dock: (fleetStation('sol-dock') || {}).system || null, reach: jumpReach('halcyon', 'sol', 8, 40, 1).ok, errors: g2Errors() })`.replace('g2Errors()', '[]')));
})();
check('a file for a new system "sol" adds it after the eight, with its bodies spread like the rest', !added.failed && added.ids.join() === FIX.order.concat('sol').join() && added.earth.length === 2 && added.earth[0][2] === 63000, JSON.stringify(added).slice(0, 400));
check('the new system has its sun, a star on the galaxy map, its dock and pump, and a jump from Halcyon reaches it', added.star === 'Sol Sun' && added.onMap && added.onMap[0] === 'Sol' && added.onMap[2] === 5 && added.onMap[3] === true && added.dock === 'sol' && added.reach === true, JSON.stringify(added).slice(0, 400));

// ---- the template is a system that flies: copy it, build, and it is in the game ----
const fromTemplate = (() => {
  const C = g.run('ContentLib'), tpl = readFileSync(new URL('../content/_templates/system.md', import.meta.url), 'utf8');
  const made = C.loadAll([{ path: 'content/systems/example-reach.md', text: tpl }, { path: 'content/stations/example-smelter.md', text: '---\ntype: station\nname: Example Smelter\nsystem: example-reach\nfuel: 6\n---\n' }], {});
  const text = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
  const g2 = nodeGame({ replace: { 'content.generated.js': text.replace('  entries: [\n', '  entries: [\n' + made.entries.map(e => '  ' + JSON.stringify(e)).join(',\n') + ',\n') } });
  return Object.assign({ problems: made.errors.length }, JSON.parse(g2.run(`JSON.stringify({ has: !!SYSTEMS['example-reach'], bodies: (SYSTEMS['example-reach'] || { bodies: [] }).bodies.map(b => b.type), pump: ((SYSTEMS['example-reach'] || { bodies: [{}] }).bodies[0].dock || {}).fuel, pirates: (SYSTEMS['example-reach'] || {}).pirates, sun: sysStar('example-reach') && sysStar('example-reach').star, errs: CONTENT_ERRORS.length })`)));
})();
check('content/_templates/system.md has no mistake in it and, copied to a file, is a system the game flies: seven bodies (one a moon of the planet), a dock with a pump, its own pirates, a K sun', fromTemplate.problems === 0 && fromTemplate.has && fromTemplate.bodies.join() === 'station,planet,planet,belt,poi,scenery,gate' && fromTemplate.pump === 6 && fromTemplate.pirates && fromTemplate.pirates.max === 8 && fromTemplate.sun === 'K', JSON.stringify(fromTemplate));
check('the template explains every field of the system schema in a line of its own', (() => { const tpl = readFileSync(new URL('../content/_templates/system.md', import.meta.url), 'utf8'); return Object.keys(g.run('ContentLib').SCHEMA.system.fields || {}).filter(f => f !== 'type' && !new RegExp('^# ' + f.replace(/[XY]$/, '') + '[^\\n]*:', 'm').test(tpl) && !new RegExp('^# [^\\n]*' + f, 'm').test(tpl)); })().length === 0);

// ---- a bad file never leaves the game without a system ----
const broken = (() => {
  const text = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
  const noHome = text.split('\n').filter(l => !l.includes('"type":"system","id":"halcyon"') && !l.includes('"type":"system","id":"roost"')).join('\n'); // as if the build had refused those two files
  const g2 = nodeGame({ replace: { 'content.generated.js': noHome } });
  return JSON.parse(g2.run(`JSON.stringify({ ids: Object.keys(SYSTEMS), kept: SYSTEMS_KEPT, home: SYSTEMS.halcyon.bodies.length, roost: SYSTEMS.roost.bodies.length, station: (sysBody('station', 'halcyon') || {}).id })`));
})();
check('two system files refused by the build: the game starts, those two fly as shipped (the sealed copy), the other six from their files, in the usual order', broken.ids.join() === FIX.order.join() && broken.kept.join() === 'halcyon,roost' && broken.home === 14 && broken.roost === FIX.systems.roost.bodies.length && broken.station === 'halcyon-station', JSON.stringify(broken));
check('nothing is kept from the sealed copy when every file is good', J(`SYSTEMS_KEPT`).length === 0);
check('the sealed copy is the systems, docks and sites of the shipped content, and nothing else', J(`(() => { const types = {}; SYSTEMS_CORE.entries.forEach(e => { types[e.type] = (types[e.type] || 0) + 1; }); const same = JSON.stringify(sysRowsFrom(SYSTEMS_CORE)) === JSON.stringify(sysRowsFrom(CONTENT)); return [Object.keys(types).sort().join(), types.system, same]; })()`).join() === 'poi,station,system,8,true');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SYSTEMSFROMFILES FAIL (${failed} of ${n})` : `SYSTEMSFROMFILES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
