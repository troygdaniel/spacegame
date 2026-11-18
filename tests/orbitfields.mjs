// smoke: a body can be placed by its orbit (how far from the sun) and an angle instead of x and y: the loader, the row the game flies, the mistakes it catches (plain Node, no Chrome)
// Card space-game-orbit-fields-in-files. A row of a system file's Bodies table gives x and y, or leaves both empty and gives `orbit` (units from the
// sun, or from the middle of a system with no sun) and `angle` (degrees clockwise from north: 0 north, 90 east). The game still reads only x and y:
// sysPlace (src/data_systems.js) turns the orbit into them when the row is made, and bodyPlace (src/content.js) is the same sum for the build's check.
// Run: node tests/orbitfields.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame({ boot: false });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// a system file with this Bodies table (and, when star is false, no sun), read by the loader and made into the row the game flies
const file = (table, star = true, size = 36000) => `---\ntype: system\nname: Orbit Test\nkind: wild\nly: [22, 20]\nsize: ${size}\ndanger: 0\ntraffic: 0\nseed: 1\n${star ? 'starType: G\nstarX: 18000\nstarY: 18000\n' : ''}---\nA test.\n\n## Bodies\n${table}\n`;
const load = (table, star, size) => {
  const text = file(table, star, size);
  return J(`(() => { const r = ContentLib.loadAll([{ path: 'content/systems/orbit-test.md', text: ${JSON.stringify(text)} }]), e = r.entries[0];
    const W = { system: {}, station: {}, poi: {} }; if (e) W.system[e.id] = e.data;
    const row = e ? sysRowFrom(e.id, W) : null;
    return { rows: e ? e.data.bodies || [] : [], bodies: row ? row.bodies : [], errors: r.errors.filter(x => x.level === 'error').map(ContentLib.formatError), warns: r.errors.filter(x => x.level !== 'error').map(ContentLib.formatError) }; })()`);
};
const P = (id, extra) => `| ${id} | planet | ${id} | ${extra} | 300 | rock | 7 |`;
const HEAD = '| id | type | name | x | y | orbit | angle | r | kind | seed |\n|---|---|---|---|---|---|---|---|---|---|';
const at = (r, id) => { const b = r.bodies.find(x => x.id === id); return b ? [b.x, b.y] : null; };

console.log('A. a row with an orbit and no x and y');
let r = load([HEAD, P('east', ' | | 6000 | 90'), P('north', ' | | 6000 | 0'), P('south', ' | | 6000 | 180'), P('west', ' | | 6000 | 270'), P('noangle', ' | | 4000 |'), P('ne', ' | | 5000 | 45'), P('minus', ' | | 6000 | -90')].join('\n'));
check('the loader takes all seven rows with no error', r.errors.length === 0 && r.rows.length === 7, r.errors.join(' | '));
check('the file\'s row keeps what was written: orbit and angle, no x and y', r.rows[0].orbit === 6000 && r.rows[0].angle === 90 && r.rows[0].x === undefined && r.rows[0].y === undefined);
check('90 is east of the sun, 0 north (up on the map), 180 south, 270 west', JSON.stringify([at(r, 'east'), at(r, 'north'), at(r, 'south'), at(r, 'west')]) === '[[24000,18000],[18000,12000],[18000,24000],[12000,18000]]', JSON.stringify([at(r, 'east'), at(r, 'north'), at(r, 'south'), at(r, 'west')]));
check('no angle is 0 (north); 45 is north-east; -90 is the same as 270', JSON.stringify(at(r, 'noangle')) === '[18000,14000]' && at(r, 'ne')[0] === 18000 + Math.round(5000 * Math.SQRT1_2) && at(r, 'ne')[1] === 18000 - Math.round(5000 * Math.SQRT1_2) && JSON.stringify(at(r, 'minus')) === JSON.stringify(at(r, 'west')), JSON.stringify([at(r, 'noangle'), at(r, 'ne'), at(r, 'minus')]));
check('the row the game flies has x and y and no orbit or angle key: nothing else in the game needs to know', r.bodies.every(b => Number.isInteger(b.x) && Number.isInteger(b.y) && b.orbit === undefined && b.angle === undefined));
check('every body is its orbit from the sun, to the unit', r.bodies.every(b => { const w = r.rows.find(x => x.id === b.id); return Math.abs(Math.hypot(b.x - 18000, b.y - 18000) - w.orbit) <= 1; }));
const game = J(`(() => { const f = { starX: 18000, starY: 18000, size: 36000 }, def = { id: 'orbit-test', size: 36000, star: { type: 'G', x: 18000, y: 18000 }, bodies: [Object.assign({ id: 'p', type: 'planet' }, sysPlace({ orbit: 6000, angle: 90 }, f))] };
  SYSTEMS['orbit-test'] = sysScale(def) || def; const o = sysOrbit(SYSTEMS['orbit-test'].bodies[0], 'orbit-test'); delete SYSTEMS['orbit-test']; return { r: o.r, a: o.a, scale: SYSTEM_SCALE }; })()`);
check('in the game the ring the minimap draws is that orbit, spread like every other distance, and the body sits east of the sun', Math.abs(game.r - 6000 * game.scale) <= game.scale && Math.abs(game.a) < 1e-3, JSON.stringify(game));

console.log('B. x and y still work, and win');
r = load([HEAD, P('xy', '21000 | 18000 | |'), P('both', '21000 | 18000 | 6000 | 90'), P('orb', ' | | 3000 | 90')].join('\n'));
check('a row with x and y is where it says, as before', r.errors.length === 0 && JSON.stringify(at(r, 'xy')) === '[21000,18000]');
check('a row with both is at its x and y, and the build says the orbit is ignored', JSON.stringify(at(r, 'both')) === '[21000,18000]' && r.warns.some(w => /both/.test(w) && /ignored/.test(w)), r.warns.join(' | '));
check('the two ways mix in one table', JSON.stringify(at(r, 'orb')) === '[21000,18000]');
r = load(['| id | type | name | orbit | angle | r | kind | seed |\n|---|---|---|---|---|---|---|---|', '| only | planet | only | 6000 | 90 | 300 | rock | 7 |'].join('\n'));
check('a table with no x and y columns at all is a table (it used to be refused)', r.errors.length === 0 && JSON.stringify(at(r, 'only')) === '[24000,18000]', r.errors.join(' | '));
const shipped = J(`Object.keys(SYSTEMS).map(id => SYSTEMS[id].bodies.filter(b => !Number.isFinite(b.x) || !Number.isFinite(b.y)).length).reduce((a, b) => a + b, 0)`);
check('every body of the shipped systems still has its place (they are all written with x and y)', shipped === 0);

console.log('C. a system with no sun: the orbit is round its middle');
r = load([HEAD, P('east', ' | | 6000 | 90')].join('\n'), false, 40000);
check('no sun, size 40000: 6000 east of the middle', r.errors.length === 0 && JSON.stringify(at(r, 'east')) === '[26000,20000]', JSON.stringify(at(r, 'east')));

console.log('D. the mistakes it catches, in words');
r = load([HEAD, P('nowhere', ' | | |'), P('ok', '21000 | 18000 | |')].join('\n'));
check('neither x and y nor an orbit: the row is ignored and the message says both ways', r.bodies.length === 1 && r.errors.some(e => /x and y, or an orbit/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('half', '21000 | | |'), P('half2', ' | 9000 | 6000 | 90'), P('ok', '21000 | 18000 | |')].join('\n'));
check('x without y (or y without x): the row is ignored, even with an orbit beside it', r.bodies.length === 1 && r.errors.filter(e => /but no/.test(e)).length === 2, r.errors.join(' | '));
r = load([HEAD, P('far', ' | | 30000 | 90'), P('ok', ' | | 6000 | 90')].join('\n'));
check('an orbit that puts the body outside the system: ignored, and the message says where it would be', r.bodies.length === 1 && r.bodies[0].id === 'ok' && r.errors.some(e => /far/.test(e) && /48000/.test(e) && /outside the system/.test(e)), r.errors.join(' | '));
r = load([HEAD, P('bad', ' | | lots | 90'), P('bad2', ' | | 6000 | 900'), P('ok', ' | | 6000 | 90')].join('\n'));
check('an orbit that is not a number, or an angle past 360, is said', r.errors.length >= 2 && r.errors.some(e => /orbit/.test(e)) && r.errors.some(e => /angle/.test(e)), r.errors.join(' | '));
check('angle with x and y and no orbit is only a note', (() => { const q = load([HEAD, P('a', '21000 | 18000 | | 45')].join('\n')); return q.errors.length === 0 && q.bodies.length === 1 && q.warns.some(w => /angle is ignored/.test(w)); })());

console.log('E. the two sums agree, and the template shows it');
const agree = J(`(() => { let bad = 0, n = 0; const fs = [{ starX: 18000, starY: 18000, size: 36000 }, { size: 40000 }, {}, undefined];
  for (const f of fs) for (let orbit = 0; orbit <= 15000; orbit += 2500) for (let angle = -360; angle <= 360; angle += 15) { n++; const a = sysPlace({ orbit, angle }, f), b = ContentLib.bodyPlace({ orbit, angle }, f); if (!a || !b || a.x !== b.x || a.y !== b.y) bad++; }
  return { bad, n, none: sysPlace({}, fs[0]) === null && ContentLib.bodyPlace({}, fs[0]) === null }; })()`);
check('the build\'s check and the game place a body at the same spot, over 1,300 orbits and angles', agree.bad === 0 && agree.n > 1300 && agree.none, JSON.stringify(agree));
const tpl = readFileSync(new URL('../content/_templates/system.md', import.meta.url), 'utf8');
const t = J(`(() => { const r = ContentLib.loadAll([{ path: 'content/systems/example-reach.md', text: ${JSON.stringify(tpl)} }]), e = r.entries[0], W = { system: {}, station: {}, poi: {} }; W.system[e.id] = e.data;
  return { bodies: sysRowFrom(e.id, W).bodies.map(b => [b.id, b.x, b.y]), rows: e.data.bodies.length, errors: r.errors.filter(x => x.level === 'error').map(ContentLib.formatError) }; })()`);
check('the template (content/_templates/system.md) loads with no error and places its orbit rows', t.errors.length === 0 && t.rows === 7 && t.bodies.every(b => Number.isInteger(b[1]) && Number.isInteger(b[2])) && JSON.stringify(t.bodies.find(b => b[0] === 'belt-a')) === '["belt-a",12000,18000]', JSON.stringify(t).slice(0, 500));
check('the template says how: orbit, angle, 0 north, 90 east', /# orbit /.test(tpl) && /# angle /.test(tpl) && /0 north, 90 east/.test(tpl));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nORBITFIELDS FAIL (${failed} of ${n})` : `\nORBITFIELDS PASS (${n})`);
process.exitCode = failed ? 1 : 0;
