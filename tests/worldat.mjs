// worldAt(systemId): one system the cards that jump, draw and dock can ask for (card space-game-systems-schema-gaps, docs/MODDING.md 6.3 and 6.4).
// The real game's scripts in plain Node (tests/nodegame.mjs: no Chrome, no Phaser; a game copy per case). What it pins:
//   A. the shipped pack: worldAt gives the game's own Halcyon row; the row built from Halcyon's files alone says the same thing as the code's row (so every field
//      the code has has a home in the files); every field of the eight systems and six stations ends up in the row worldAt gives; the docks drive the code's
//      own part functions; and the code's eight rows (card u-b5) are what worldAt gives for every system (tests/systems.mjs pins them against their files).
//   B. a pack full of wrong files: the game boots, the bad rows are left out, worldAt never throws and never gives a half-made row.
// Run: node tests/worldat.mjs     (one game per case, a second or two)
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { build } from '../tools/build-content.mjs';
import { nodeGame } from './nodegame.mjs'; // the game's scripts in plain Node: worldAt and the tables need no scene, so no Chrome
import { copyGame, ROOT } from './gamecopy.mjs';

const C = createRequire(import.meta.url)('../src/content.js');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const tmp = [];

// a deep comparison that ignores the order of keys (and nothing else): the paths where a and b differ
function diff(a, b, path = '') {
  if (a === b) return [];
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return [path + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)];
  const out = [];
  if (Array.isArray(a)) { if (a.length !== b.length) out.push(path + ': ' + a.length + ' items vs ' + b.length); a.forEach((x, i) => out.push(...diff(x, b[i], path + '[' + i + ']'))); return out; }
  new Set(Object.keys(a).concat(Object.keys(b))).forEach(k => out.push(...diff(a[k], b[k], path + '.' + k)));
  return out;
}

async function open(root, fn) {
  const t = nodeGame({ root });
  try {
    const ev = async e => JSON.parse(await t.ev(`JSON.stringify((${e}))`));
    await fn(t, ev);
    check('no console errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

try {
  // ---------- A: the shipped pack ----------
  console.log('A: the shipped systems and stations');
  await open(ROOT, async (t, ev) => {
    const ids = await ev(`worldIds()`);
    check('eight systems: Halcyon first, then the seven the files add', ids.length === 8 && ids[0] === 'halcyon' && ['kestrel', 'meridian', 'brass', 'hollow', 'lethe', 'ember', 'roost'].every(i => ids.includes(i)), ids.join());
    check('worldAt knows every one of them and nothing else', (await ev(`worldIds().every(i => !!worldAt(i))`)) && (await ev(`[undefined, null, 5, '', 'nowhere', '__proto__', 'constructor', 'toString', 'hasOwnProperty'].every(i => worldAt(i) === null)`)));
    check('Halcyon: worldAt gives the code\'s own row, so nothing about the game changes', await ev(`worldAt('halcyon') === SYSTEMS.halcyon`));
    check('the code has all eight systems (card u-b5 authored the seven): the files add no system to SYSTEMS', JSON.stringify(await ev(`Object.keys(SYSTEMS)`)) === '["halcyon","kestrel","meridian","brass","hollow","lethe","ember","roost"]');
    check('Kestrel: worldAt gives the code row (five bodies), and the row the files alone make is a different object', (await ev(`worldAt('kestrel') === SYSTEMS.kestrel && worldAt('kestrel').bodies.length === 5 && worldFromFiles('kestrel') !== SYSTEMS.kestrel && worldFromFiles('kestrel').bodies.length === 5`)));
    check('a made row is cached, and worldFromFiles of a system with no file is null', (await ev(`worldAt('kestrel') === worldAt('kestrel')`)) && (await ev(`worldFromFiles('nowhere') === null && worldFromFiles(7) === null`)));

    // Halcyon from its files alone against the code's row. What the files have beyond the code's row is named here and nowhere else:
    // seed, star, description, a station's words (about) and the two prices the code keeps in constants (repair, ore: checked against them).
    const fromFiles = await ev(`worldFromFiles('halcyon')`), code = await ev(`SYSTEMS.halcyon`), consts = await ev(`({ repair: REPAIR_PRICE, ore: ORE_PRICE })`);
    check('Halcyon\'s files make a row with the extras: seed 4001, a G star, a description, the station\'s words and prices', fromFiles && fromFiles.seed === 4001 && fromFiles.star && fromFiles.star.type === 'G' && typeof fromFiles.description === 'string' && fromFiles.bodies[0].about && fromFiles.bodies[0].about.welcome && fromFiles.bodies[0].dock.repair === consts.repair && fromFiles.bodies[0].dock.ore === consts.ore, JSON.stringify(fromFiles && fromFiles.bodies[0]));
    const same = JSON.parse(JSON.stringify(fromFiles));
    delete same.seed; delete same.star; delete same.description;
    same.bodies.forEach(b => { delete b.about; if (b.dock) { delete b.dock.repair; delete b.dock.ore; } });
    const d = diff(same, code);
    check('Halcyon from its files alone is the code\'s row: ids, types, names, places, sizes, kinds, seeds, payouts, notes, labels, the dock and the pirate table', d.length === 0, d.join(' | '));

    // every field of every system and station file has a home in the row worldAt gives
    const SH = JSON.parse(JSON.stringify({ system: C.SCHEMA.system, station: C.SCHEMA.station }));
    const HOME = { // the schema's fields, sections and columns that tests/worldat.mjs follows into the row below. A new one that is not here fails the test: give it a home first.
      system: ['name', 'kind', 'ly', 'size', 'danger', 'traffic', 'seed', 'starType', 'starX', 'starY', 'pirateMax', 'pirateEvery', 'bodies', 'pirates'],
      bodies: ['id', 'type', 'name', 'x', 'y', 'art', 'r', 'rocks', 'landable', 'kind', 'seed', 'look', 'labelDy', 'credits', 'hull', 'guard', 'note'],
      station: ['name', 'system', 'accent', 'fuel', 'repair', 'ore', 'yard', 'partMult', 'fee', 'salvageMult', 'parts', 'welcome', 'shop', 'services', 'bar']
    };
    const sch = { system: Object.keys(SH.system.fields).concat(Object.keys(SH.system.sections)), bodies: Object.keys(SH.system.sections.bodies.cols), station: Object.keys(SH.station.fields).concat(Object.keys(SH.station.sections)) };
    check('every field, section and column of the system and station schema has a home that this test follows', Object.keys(HOME).every(k => sch[k].every(f => HOME[k].includes(f)) && HOME[k].every(f => sch[k].includes(f))), JSON.stringify(sch));

    const entries = await ev(`CONTENT.entries.map(e => ({ type: e.type, id: e.id, data: e.data }))`);
    const bySys = entries.filter(e => e.type === 'system'), stations = entries.filter(e => e.type === 'station'), sites = Object.fromEntries(entries.filter(e => e.type === 'poi').map(e => [e.id, e.data]));
    check('the pack has the eight systems and six stations the draft made', bySys.length === 8 && stations.length === 6, bySys.length + ' and ' + stations.length);
    const worlds = await ev(`Object.fromEntries(worldIds().map(i => [i, i === 'halcyon' ? worldAt(i) : worldFromFiles(i)]))`); // the row the files make: the code rows keep the numbers only, the words stay in the files
    const lost = [];
    for (const en of bySys) {
      const f = en.data, w = worlds[en.id];
      if (en.id === 'halcyon') continue; // the code's row stands in for it; its files were compared above
      ['name', 'kind', 'ly', 'size', 'danger', 'traffic', 'seed'].forEach(k => { if (f[k] !== undefined && JSON.stringify(w[k]) !== JSON.stringify(f[k])) lost.push(en.id + '.' + k); });
      if (f.starType !== undefined && (!w.star || w.star.type !== f.starType || w.star.x !== f.starX || w.star.y !== f.starY)) lost.push(en.id + '.star');
      if (f.pirateMax !== undefined && (!w.pirates || w.pirates.max !== f.pirateMax)) lost.push(en.id + '.pirateMax');
      if (f.pirateEvery !== undefined && (!w.pirates || w.pirates.every !== f.pirateEvery)) lost.push(en.id + '.pirateEvery');
      (f.pirates || []).forEach(r => { if (!w.pirates || !w.pirates.weights || w.pirates.weights[r.kind] !== r.weight) lost.push(en.id + '.pirates.' + r.kind); });
      if (f.description !== undefined && w.description !== f.description) lost.push(en.id + '.description');
      if ((f.bodies || []).length !== w.bodies.length) lost.push(en.id + ' bodies ' + (f.bodies || []).length + ' vs ' + w.bodies.length);
      (f.bodies || []).forEach((row, i) => {
        const b = w.bodies[i] || {}, own = row.type === 'poi' ? sites[row.id] : null;
        Object.keys(row).forEach(k => { if (!(own && ['name', 'credits', 'hull', 'guard', 'note'].includes(k)) && JSON.stringify(b[k]) !== JSON.stringify(row[k])) lost.push(en.id + '.' + row.id + '.' + k); });
        if (row.type === 'station') {
          const st = (stations.find(s => s.id === row.id) || {}).data;
          if (!st) { lost.push(row.id + ' has no station file'); return; }
          if (b.name !== st.name) lost.push(row.id + '.name');
          const dk = b.dock || {};
          ['fuel', 'repair', 'ore', 'partMult', 'fee', 'salvageMult'].forEach(k => { if (st[k] !== undefined && dk[k] !== st[k]) lost.push(row.id + '.dock.' + k); });
          if (st.yard !== undefined && JSON.stringify(dk.yard) !== JSON.stringify(st.yard)) lost.push(row.id + '.dock.yard');
          if (st.parts !== undefined && (dk.shop !== 0 || !st.parts.every(p => dk.parts && dk.parts[p.slot] === p.tier))) lost.push(row.id + '.dock.parts');
          ['accent', 'welcome', 'services', 'bar', 'shop'].forEach(k => { if (st[k] !== undefined && JSON.stringify((b.about || {})[k]) !== JSON.stringify(st[k])) lost.push(row.id + '.about.' + k); });
        }
      });
    }
    check('seven systems: every front-matter field, every cell of every body row, every dock number and every word of the station files is in the row worldAt gives', lost.length === 0, lost.join(' | '));
    const hs = worlds.halcyon.bodies.find(b => b.id === 'halcyon-station');
    check('Halcyon\'s station file is kept whole too (accent, welcome, services, bar) and the code row keeps its dock {fuel 8, yard [kite]}', (await ev(`CONTENT_WORLD.station['halcyon-station'].accent`)) === '#38e1ff' && JSON.stringify(hs.dock) === '{"fuel":8,"yard":["kite"]}', JSON.stringify(hs.dock));

    // the numbers the design gave each place
    const dock = (sys, id) => (worlds[sys].bodies.find(b => b.id === id) || {}).dock || {};
    const r = dock('roost', 'roost-dock'), k = dock('kestrel', 'kestrel-outpost'), m = dock('meridian', 'meridian-exchange'), br = dock('brass', 'brass-smelter'), em = dock('ember', 'ember-foundry');
    check('the Roost: fee 50, fuel 15, parts x1.25 and only shields and weapons (to tier 3), salvage at double, the Bastion', r.fee === 50 && r.fuel === 15 && r.partMult === 1.25 && r.salvageMult === 2 && JSON.stringify(r.parts) === '{"shields":3,"weapons":3}' && r.shop === 0 && JSON.stringify(r.yard) === '["bastion"]', JSON.stringify(r));
    check('Kestrel sells engine and tank to tier 1 and no ships; Brass cargo and tank to tier 3 and the Ox; Ember weapons to tier 3 and the Talon', JSON.stringify(k.parts) === '{"engine":1,"tank":1}' && k.yard === undefined && JSON.stringify(br.parts) === '{"cargo":3,"tank":3}' && JSON.stringify(br.yard) === '["ox"]' && JSON.stringify(em.parts) === '{"weapons":3}' && JSON.stringify(em.yard) === '["talon"]', JSON.stringify([k, br, em]));
    check('Meridian sells all five slots to tier 3 and all six ships', ['shields', 'weapons', 'engine', 'tank', 'cargo'].every(s => m.parts && m.parts[s] === 3) && m.yard.length === 6 && ['wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion'].every(s => m.yard.includes(s)), JSON.stringify(m));
    check('the Hollow has no station and no pump; Lethe is fourteen wrecks round a dead world', worlds.hollow.bodies.every(b => b.type !== 'station') && worlds.lethe.bodies.filter(b => b.kind === 'wreck').length === 14 && worlds.lethe.bodies.find(b => b.credits === 800), '');
    // the docks speak the code's own language: src/data_parts.js reads shop, parts and partMult from a dock
    const caps = await ev(`(() => { const out = {}; ['roost-dock@roost', 'kestrel-outpost@kestrel', 'meridian-exchange@meridian'].forEach(s => { const [id, sys] = s.split('@'), dk = worldAt(sys).bodies.find(b => b.id === id).dock; out[sys] = ['shields', 'weapons', 'engine', 'tank', 'cargo'].map(sl => partStockCap(sl, dk)); }); out.halcyon = ['shields', 'weapons', 'engine', 'tank', 'cargo'].map(sl => partStockCap(sl, worldAt('halcyon').bodies[0].dock)); out.price = [partPrice('shields', 1, 'wren', worldAt('roost').bodies.find(b => b.id === 'roost-dock').dock), partPrice('shields', 1, 'wren', worldAt('halcyon').bodies[0].dock)]; return out; })()`);
    check('partStockCap reads them: the Roost sells shields and weapons to 3, Kestrel engine and tank to 1, Meridian everything to 3, Halcyon everything to 2', JSON.stringify(caps.roost) === '[3,3,0,0,0]' && JSON.stringify(caps.kestrel) === '[0,0,1,1,0]' && JSON.stringify(caps.meridian) === '[3,3,3,3,3]' && JSON.stringify(caps.halcyon) === '[2,2,2,2,2]', JSON.stringify(caps));
    check('partPrice reads partMult: a Roost part costs 1.25 times a Halcyon one, to ten credits', caps.price[0] === Math.round(caps.price[1] * 1.25 / 10) * 10 || Math.abs(caps.price[0] / caps.price[1] - 1.25) < 0.1, JSON.stringify(caps.price));
  });

  // ---------- B: wrong files ----------
  console.log('B: a pack with wrong systems and stations');
  const pack = mkdtempSync(join(tmpdir(), `longhaul-world-pack-${process.pid}-`)); tmp.push(pack);
  const put = (rel, text) => { const f = join(pack, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); };
  const HEAD = '| id | type | name | x | y | art | r | rocks | landable | kind | seed | look | labelDy | credits |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  put('systems/odd.md', '---\ntype: system\nname: Odd\nkind: wild\nly: [3, 4]\nsize: 36000\npirateMax: 0\n---\nA system with some good rows and some bad ones.\n\n## Bodies\n' + HEAD +
    '| odd-dock | station | Odd Dock | 100 | 100 | hub | | | | | | | | |\n| odd-nokind | planet | No Kind | 200 | 200 | | 300 | | no | | | | | |\n| odd-rock | planet | Odd Rock | 300 | 300 | | 300 | | no | rock | 5 | | | |\n' +
    '| odd-rock | planet | Same id | 400 | 400 | | 300 | | no | ice | 1 | | | |\n| odd-belt | belt | | 500 | 500 | | 400 | | | | | | | |\n| odd-ring | scenery | Ring | 600 | 600 | | | | | | | derelict | -240 | |\n| odd-sign | scenery | Sign | 700 | 700 | banana | | | | | | | | |\n');
  put('stations/odd-dock.md', '---\ntype: station\nname: Odd Dock\nsystem: odd\nfuel: 999\nyard: [kite, ghost-ship]\npartMult: 1.5\n---\n\n## Parts\n| slot | tier |\n|---|---|\n| shields | 2 |\n| armor | 2 |\n');
  put('stations/lost-dock.md', '---\ntype: station\nname: Lost Dock\nsystem: nowhere\n---\n');
  const g = copyGame('world'); tmp.push(g);
  const made = build({ dir: pack, prefix: 'content/', out: join(g, 'content.generated.js'), write: true, core: C.hashOf('[]') });
  check('the build reports the wrong rows and files (and still writes a file)', made.result.errors.length >= 6, String(made.result.errors.length));
  await open(g, async (t, ev) => {
    const w = await ev(`worldAt('odd')`);
    check('the system is made from its good rows only: the dock, one rock, the belt is refused (no rocks), the ring stays', w && w.name === 'Odd' && JSON.stringify(w.bodies.map(b => b.id)) === '["odd-dock","odd-rock","odd-ring"]', JSON.stringify(w && w.bodies.map(b => b.id)));
    check('the first rock stays (the second with the same id is dropped), the ring keeps its look and label', w.bodies[1].name === 'Odd Rock' && w.bodies[1].kind === 'rock' && w.bodies[1].seed === 5 && w.bodies[2].look === 'derelict' && w.bodies[2].labelDy === -240, JSON.stringify(w.bodies));
    check('pirateMax 0 is refused, so the system has no pirate table of its own', w.pirates === undefined, JSON.stringify(w.pirates));
    const dock = w.bodies[0].dock;
    check('the dock keeps what was good: a price factor, shields to tier 2 (the armor row is refused), no pump price (999 is refused)', dock && dock.partMult === 1.5 && JSON.stringify(dock.parts) === '{"shields":2}' && dock.fuel === undefined, JSON.stringify(dock));
    check('the yard is kept as written; the ship nobody has is a warning on the Title chip, and fleet.js never sells an id it does not know', JSON.stringify(dock.yard) === '["kite","ghost-ship"]' && (await ev(`CONTENT_ERRORS.some(e => /ghost-ship/.test(e.message))`)), JSON.stringify(dock.yard));
    check('a station for a system nobody has is kept and placed nowhere; worldAt for it is null', (await ev(`CONTENT_WORLD.station['lost-dock'].name`)) === 'Lost Dock' && (await ev(`worldAt('nowhere') === null`)));
    check('the game is at Title with the code\'s rows untouched', (await ev(`worldAt('halcyon') === SYSTEMS.halcyon && Object.keys(SYSTEMS).join() === 'halcyon,kestrel,meridian,brass,hollow,lethe,ember,roost' && SYSTEMS.kestrel.bodies.length === 5`)));
    check('the problems are listed for the Title chip', (await ev(`CONTENT_ERRORS.length`)) >= 6);
  });
} catch (e) { check('the world test ran: ' + e.message, false); } finally {
  tmp.forEach(d => rmSync(d, { recursive: true, force: true }));
}
console.log(failed ? `\nWORLDAT FAIL: ${failed} of ${n} checks failed` : `\nWORLDAT PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;
