// smoke: a body can go round another body (a moon round its planet): the parent column, the row the game flies, sysOrbit round the parent, the mistakes it catches, the Sol pack (plain Node, no Chrome)
// Card space-game-bodies-orbit-a-body. A row of a system file's Bodies table may name a `parent`, the id of another row: its orbit and angle are then
// measured from that body and not the sun. The game keeps `parent` on the body, and sysOrbit (src/universe.js) gives the ring round the parent, so a
// moon can turn with its planet when bodies move. Follows tests/orbitfields.mjs (orbit and angle round the sun).
// Run: node tests/orbitparent.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { layout, MOONS, DOCKS } from '../mods/sol/_make.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 800) + ')' : ''}`); } };
const g = nodeGame({ boot: false });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

const file = (table, star = true, size = 36000) => `---\ntype: system\nname: Moon Test\nkind: wild\nly: [22, 20]\nsize: ${size}\ndanger: 0\ntraffic: 0\nseed: 1\n${star ? 'starType: G\nstarX: 18000\nstarY: 18000\n' : ''}---\nA test.\n\n## Bodies\n${table}\n`;
const load = (table, star, size) => J(`(() => { const r = ContentLib.loadAll([{ path: 'content/systems/moon-test.md', text: ${JSON.stringify(file(table, star, size))} }]), e = r.entries[0];
  const W = { system: {}, station: {}, poi: {} }; if (e) W.system[e.id] = e.data;
  const row = e ? sysRowFrom(e.id, W) : null;
  return { rows: e ? e.data.bodies || [] : [], bodies: row ? row.bodies : [], errors: r.errors.filter(x => x.level === 'error').map(ContentLib.formatError), warns: r.errors.filter(x => x.level !== 'error').map(ContentLib.formatError) }; })()`);
const HEAD = '| id | type | name | x | y | orbit | angle | parent | r | kind | seed |\n|---|---|---|---|---|---|---|---|---|---|---|';
const P = (id, place) => `| ${id} | planet | ${id} | ${place} | 100 | rock | 7 |`; // place: x | y | orbit | angle | parent
const at = (r, id) => { const b = r.bodies.find(x => x.id === id); return b ? [b.x, b.y] : null; };
const ids = r => r.bodies.map(b => b.id).join();

console.log('A. a moon: orbit and angle measured from its parent');
let r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('moon', ' | | 900 | 0 | planet'), P('dock', ' | | 300 | 180 | moon'), P('early', ' | | 500 | 270 | late'), P('late', '9000 | 9000 | | |')].join('\n'));
check('the loader takes the rows with no error', r.errors.length === 0 && r.rows.length === 5, r.errors.join(' | '));
check('the planet is 6000 east of the sun; its moon 900 north of the PLANET, not of the sun', JSON.stringify(at(r, 'planet')) === '[24000,18000]' && JSON.stringify(at(r, 'moon')) === '[24000,17100]', JSON.stringify([at(r, 'planet'), at(r, 'moon')]));
check('a parent may have a parent: the dock is 300 south of the moon', JSON.stringify(at(r, 'dock')) === '[24000,17400]');
check('the order of the rows does not matter, and a parent written by x and y works: a row above its parent is placed from it', JSON.stringify(at(r, 'early')) === '[8500,9000]');
check('the row the game flies keeps the parent, and has no orbit or angle key', r.bodies.find(b => b.id === 'moon').parent === 'planet' && r.bodies.find(b => b.id === 'planet').parent === undefined && r.bodies.every(b => b.orbit === undefined && b.angle === undefined && Number.isInteger(b.x) && Number.isInteger(b.y)));
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('moon', '25000 | 18000 | | | planet')].join('\n'));
check('a row with x, y and a parent is at its x and y and still belongs to the parent, with no complaint', r.errors.length === 0 && r.warns.length === 0 && JSON.stringify(at(r, 'moon')) === '[25000,18000]' && r.bodies[1].parent === 'planet', r.warns.join(' | '));
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('moon', ' | | 900 | 0 | planet')].join('\n'), false, 40000);
check('a system with no sun: the planet goes round the middle, the moon round the planet', r.errors.length === 0 && JSON.stringify(at(r, 'planet')) === '[26000,20000]' && JSON.stringify(at(r, 'moon')) === '[26000,19100]');

console.log('B. in the game: the ring round the parent');
const game = J(`(() => { const f = { starX: 18000, starY: 18000, size: 36000 }, rows = [{ id: 'planet', type: 'planet', orbit: 6000, angle: 90 }, { id: 'moon', type: 'planet', orbit: 900, angle: 0, parent: 'planet' }, { id: 'dock', type: 'scenery', orbit: 300, angle: 90, parent: 'moon' }];
  const W = { system: { t: Object.assign({ name: 'T', kind: 'wild', bodies: rows }, f, { starType: 'G' }) }, station: {}, poi: {} };
  const def = sysRowFrom('t', W); sysScale(def); SYSTEMS.t = def;
  const body = id => def.bodies.find(b => b.id === id), o = id => { const q = sysOrbit(body(id), 't'); return { r: q.r, a: q.a }; };
  const out = { scale: SYSTEM_SCALE, planet: o('planet'), moon: o('moon'), dock: o('dock'), par: (sysParent(body('moon'), 't') || {}).id, none: sysParent(body('planet'), 't'),
    turned: sysOrbitAt(body('moon'), Math.PI / 2, 't'), planetAt: [body('planet').x, body('planet').y], rings: hudMapRings(hudOrreryModel(def, { x: 0, y: 0 }, 84)).length, modelParent: hudOrreryModel(def, { x: 0, y: 0 }, 84).bodies.map(b => b.parent || '') };
  const orphan = { id: 'x', type: 'planet', x: 100, y: 100, parent: 'gone' }; out.orphan = sysOrbit(orphan, 't').r > 1000;
  delete SYSTEMS.t; return out; })()`);
check('sysOrbit of the planet is its ring round the sun; of the moon, its ring round the PLANET (900 spread 3 times), due north', Math.abs(game.planet.r - 6000 * game.scale) < 2 && Math.abs(game.moon.r - 900 * game.scale) < 2 && Math.abs(game.moon.a + Math.PI / 2) < 1e-3, JSON.stringify(game.moon));
check('and of the dock, its ring round the moon', Math.abs(game.dock.r - 300 * game.scale) < 2 && Math.abs(game.dock.a) < 1e-2);
check('sysParent names the planet for the moon and nothing for the planet', game.par === 'planet' && game.none === null);
check('a quarter turn later the moon is still on its ring round the planet: 900 x 3 east of it', Math.abs(game.turned.x - (game.planetAt[0] + 900 * game.scale)) < 2 && Math.abs(game.turned.y - game.planetAt[1]) < 2, JSON.stringify(game.turned));
check('a body whose parent is not there (a pack took it away) falls back to the ring round the sun: nothing thrown', game.orphan === true);
check('the minimap draws one ring round the sun, the planet\'s: the moon and its dock have none', game.rings === 1 && game.modelParent.join() === ',planet,moon', JSON.stringify(game.modelParent));

console.log('C. the mistakes it catches, in words');
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('lost', ' | | 900 | 0 | nobody')].join('\n'));
check('a parent that is not in the table: the row is ignored and the message names it', ids(r) === 'planet' && r.errors.some(e => /lost/.test(e) && /nobody/.test(e) && /not a body of this system/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('self', ' | | 900 | 0 | self')].join('\n'));
check('a body that goes round itself: ignored', ids(r) === 'planet' && r.errors.some(e => /goes round itself/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('a', ' | | 900 | 0 | b'), P('b', ' | | 900 | 0 | c'), P('c', ' | | 900 | 0 | a')].join('\n'));
check('three bodies that go round each other in a circle: all three ignored, the planet stays', ids(r) === 'planet' && r.errors.filter(e => /goes round/.test(e)).length >= 3, r.errors.join(' | '));
r = load([HEAD, P('planet', ' | | 30000 | 90 |'), P('moon', ' | | 900 | 0 | planet'), P('dock', ' | | 300 | 0 | moon'), P('ok', ' | | 3000 | 0 |')].join('\n'));
check('a planet outside the system takes its moon and the moon\'s dock with it (they would be out there too), a line for each', ids(r) === 'ok' && ['planet', 'moon', 'dock'].every(id => r.errors.some(e => e.includes('"' + id + '"') && /outside the system/.test(e))), r.errors.join(' | '));
r = load([HEAD, '| planet | planet | planet | | | 6000 | 90 | | 100 | nonsense | 7 |', P('moon', ' | | 900 | 0 | planet'), P('ok', ' | | 3000 | 0 |')].join('\n'));
check('a planet refused for another reason (a kind the game does not have) takes its moon with it: the moon\'s line says its parent is not there', ids(r) === 'ok' && r.errors.some(e => /"moon"/.test(e) && /not a body of this system \(or its row was ignored\)/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('planet', ' | | 17500 | 90 |'), P('moon', ' | | 900 | 90 | planet')].join('\n'));
check('a moon whose orbit lands outside the system: ignored, the message says round what and where', ids(r) === 'planet' && r.errors.some(e => /moon/.test(e) && /round "?planet"?/.test(e) && /36400/.test(e) && /outside the system/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('moon', ' | | | | planet')].join('\n'));
check('a parent with no orbit and no x and y: the row says where it is in neither way', ids(r) === 'planet' && r.errors.some(e => /neither way/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('planet', ' | | 6000 | 90 |'), P('moon', ' | | 900 | 0 | Not An Id')].join('\n'));
check('a parent that is not an id is said', r.errors.some(e => /parent/.test(e)), r.errors.join(' | '));
const deep = ['planet', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'];
r = load([HEAD].concat(deep.map((id, i) => P(id, i ? ` | | 100 | 90 | ${deep[i - 1]}` : ' | | 6000 | 90 |'))).join('\n'));
check('a chain more than 8 parents deep is refused from where it gets too deep; the shallow rows stay', r.bodies.length >= 8 && r.bodies.length < deep.length && r.errors.some(e => /8 parents deep/.test(e)), ids(r));

console.log('D. the two sums agree');
const agree = J(`(() => { let bad = 0, n = 0; const f = { starX: 18000, starY: 18000, size: 36000 };
  for (let orbit = 500; orbit <= 6000; orbit += 1100) for (let angle = 0; angle < 360; angle += 20) for (let m = 100; m <= 900; m += 400) for (let ma = 0; ma < 360; ma += 45) { n++;
    const rows = [{ id: 'p', orbit, angle }, { id: 'm', orbit: m, angle: ma, parent: 'p' }, { id: 'd', orbit: 60, angle: ma + 10 > 360 ? 0 : ma + 10, parent: 'm' }];
    for (const row of rows) { const a = sysPlace(row, f, rows), b = ContentLib.bodyPlace(row, f, rows); if (!a || !b || a.x !== b.x || a.y !== b.y) bad++; } }
  const loop = [{ id: 'a', orbit: 1, parent: 'b' }, { id: 'b', orbit: 1, parent: 'a' }];
  return { bad, n, loop: sysPlace(loop[0], f, loop) === null && ContentLib.bodyPlace(loop[0], f, loop) === null, gone: sysPlace({ id: 'x', orbit: 5, parent: 'nobody' }, f, []) === null }; })()`);
check('the build\'s check and the game place a planet, its moon and the moon\'s dock at the same spots, over 2,500 cases', agree.bad === 0 && agree.n > 2500, JSON.stringify(agree));
check('a circle or a missing parent gives no place in either, and neither hangs', agree.loop && agree.gone);

console.log('E. the Sol pack writes its moons and docks this way');
const { rows, at: where } = layout();
const moonRows = rows.filter(x => MOONS.some(m => m.id === x.id)), dockRows = rows.filter(x => DOCKS.some(d => d.id === x.id));
check('every moon and every dock of Sol is a row with orbit, angle and parent, and no x and y', moonRows.length === MOONS.length && dockRows.length === DOCKS.length && moonRows.concat(dockRows).every(x => x.x === undefined && x.y === undefined && x.orbit > 0 && typeof x.parent === 'string'), moonRows.length + ' moons, ' + dockRows.length + ' docks');
const solText = readFileSync(new URL('../mods/sol/systems/sol.md', import.meta.url), 'utf8');
const sol = J(`(() => { const r = ContentLib.loadAll([{ path: 'content/systems/sol.md', text: ${JSON.stringify(solText)} }], { known: () => true }), e = r.entries[0], W = { system: {}, station: {}, poi: {} }; W.system[e.id] = e.data;
  return { bodies: sysRowFrom(e.id, W).bodies.map(b => [b.id, b.x, b.y, b.parent || '']), errors: r.errors.filter(x => x.level === 'error').map(ContentLib.formatError) }; })()`);
const off = sol.bodies.filter(b => where[b[0]] && (b[1] !== where[b[0]].x || b[2] !== where[b[0]].y));
check('the file as written loads with no error, and the game puts every body exactly where mods/sol/_make.mjs works it out on its own', sol.errors.length === 0 && sol.bodies.length === rows.length && off.length === 0, sol.errors.concat(off.map(String)).join(' | '));
check('Luna goes round Earth, and Imbrium Dock round Luna', (sol.bodies.find(b => b[0] === 'sol-luna') || [])[3] === 'sol-earth' && (sol.bodies.find(b => b[0] === 'sol-imbrium-dock') || [])[3] === 'sol-luna');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nORBITPARENT FAIL (${failed} of ${n})` : `\nORBITPARENT PASS (${n})`);
process.exitCode = failed ? 1 : 0;
