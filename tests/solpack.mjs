// smoke: the Sol pack (mods/sol): it builds with no problem, every body can be flown to, the scale is the one the doc says, and with the pack off the game is as it shipped (plain Node, no Chrome)
// Card space-game-sol-system-pack. Our own solar system as content files: the Sun, eight planets, their moons, the belt, seven docks with our own
// names, two gates. mods/sol/_make.mjs makes the files from one table; docs/SOL.md has the scale and what is invented.
// Run: node tests/solpack.mjs   (exit code 1 on a failed check)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { buildMods } from '../tools/build-content.mjs';
import { files, layout, docTables, DOC_START, DOC_END, SCALE, SUN_BODIES, MOONS, DOCKS, ringOf } from '../mods/sol/_make.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 800) + ')' : ''}`); } };
const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

// ---- the files are what the one table makes ----
const made = files(), stale = Object.keys(made).filter(rel => !existsSync(new URL('../' + rel, import.meta.url)) || read(rel) !== made[rel]);
check('every file of the pack is what mods/sol/_make.mjs makes (run it after a change)', stale.length === 0, stale.join());
const doc = read('docs/SOL.md'), i = doc.indexOf(DOC_START), j = doc.indexOf(DOC_END);
check('the tables of docs/SOL.md are the ones the same table makes', i > 0 && j > i && doc.slice(i, j + DOC_END.length) === docTables());

// ---- it builds: no problem, no warning ----
const built = buildMods({ write: false }), sol = built.packs.find(p => p.name === 'sol');
check('the build finds the pack sol', !!sol, built.packs.map(p => p.name).join());
check('no problem and no warning in it', sol && sol.errors.length === 0, sol ? JSON.stringify(sol.errors.slice(0, 3)) : '');
check('it is one system and its one live dock', sol && sol.entries.map(e => e.type + ':' + e.id).sort().join() === 'station:sol-imbrium-dock,system:sol');
check('mods.generated.js is current: it has the pack', !built.changed, 'run node tools/build-content.mjs');

// ---- the pack off: the game is as it shipped ----
const FIX = JSON.parse(read('tests/fixtures/systems-code-rows.json'));
const off = nodeGame();
const J = (g, e) => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
check('with no pack switched on there is no Sol: the eight systems, in their order', J(off, `Object.keys(SYSTEMS)`).join() === FIX.order.join() && J(off, `modsOnList()`).length === 0);
check('the galaxy map has no Sol either, and Halcyon is as it was', !J(off, `galaxySystems().map(s => s.id)`).includes('sol') && J(off, `SYSTEMS.halcyon.bodies.length`) === FIX.systems.halcyon.bodies.length);

// ---- the pack on ----
const store = new Map([['longhaul.mods.on', JSON.stringify(['sol'])]]);
const g = nodeGame({ store });
const S = J(g, `SYSTEMS.sol || null`);
check('switched on, Sol is a system the game flies, after the eight', !!S && J(g, `Object.keys(SYSTEMS)`).join() === FIX.order.concat('sol').join(), J(g, `JSON.stringify(CONTENT_ERRORS.slice(0, 2))`));
check('the eight are untouched by it', FIX.order.every(id => J(g, `SYSTEMS['${id}'].bodies.length`) === FIX.systems[id].bodies.length));
const rows = layout().rows;
check('it has every body of the table: ' + rows.length, S && S.bodies.length === rows.length && S.bodies.map(b => b.id).join() === rows.map(r => r.id).join());
check('the Sun is a G star in the middle, a body you can fly to', J(g, `(() => { const s = sysStar('sol'); return [s.name, s.star, s.x === SYSTEMS.sol.size / 2, s.y === SYSTEMS.sol.size / 2]; })()`).join() === 'Sol Sun,G,true,true');
check('it is on the galaxy map with a pump, and the starter Wren can jump there and back from Halcyon', J(g, `(() => { const m = galaxySystems().find(s => s.id === 'sol'), w = newShip('wren'); return [!!m, m && m.pump, jumpReach('halcyon', 'sol', shipStat('range', w), shipStat('tank', w), shipStat('fuelPerLy', w)).ok]; })()`).join() === 'true,8,true');

// every body can be flown to: inside the square of the system, clear of the Sun and of every other body, and in the nav list
const B = J(g, `(() => { G.system = 'sol'; const sun = sysStar('sol'), size = SYSTEMS.sol.size, known = cruiseKnown({ ship: { x: sun.x, y: sun.y } }).map(b => b.id); G.system = 'halcyon';
  return { size, sun: { x: sun.x, y: sun.y, r: sun.r }, known, bodies: SYSTEMS.sol.bodies.map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, r: b.r || 0 })) }; })()`);
const rad = b => (b.type === 'belt' ? b.r : Math.max(b.r, b.type === 'station' || b.type === 'scenery' ? 200 : 0)); // a dock is about 200 px across
check('every body is inside the system', B.bodies.every(b => b.x > 2000 && b.y > 2000 && b.x < B.size - 2000 && b.y < B.size - 2000), B.bodies.filter(b => !(b.x > 2000 && b.y > 2000 && b.x < B.size - 2000 && b.y < B.size - 2000)).map(b => b.id).join());
check('none is in or close to the Sun (5,000 px clear of its rim)', B.bodies.every(b => Math.hypot(b.x - B.sun.x, b.y - B.sun.y) > B.sun.r + rad(b) + 5000));
const close = []; B.bodies.forEach((a, k) => B.bodies.slice(k + 1).forEach(b => { const gap = Math.hypot(a.x - b.x, a.y - b.y) - rad(a) - rad(b); if (gap < 600) close.push(a.id + ' and ' + b.id + ': ' + Math.round(gap) + ' px'); }));
check('no two bodies touch: at least 600 px of clear space between any two', close.length === 0, close.slice(0, 6).join(' | '));
check('every body is in the nav list, so cruise and the autopilot fly to it', B.bodies.every(b => B.known.includes(b.id)) && B.known.includes('sol-star'), B.bodies.filter(b => !B.known.includes(b.id)).map(b => b.id).join());
check('a cruise or the autopilot stops outside each one', J(g, `SYSTEMS.sol.bodies.every(b => autopilotStop(b) > (b.r || 0))`));
check('one dock is live (the game opens the first station of a system): Imbrium Dock, with a pump, a yard and a parts shop', (() => { const st = S.bodies.filter(b => b.type === 'station'); return st.length === 1 && st[0].name === 'Imbrium Dock' && st[0].dock.fuel === 8 && st[0].dock.yard.join() === 'kite,ox' && st[0].dock.parts.engine === 2; })());

check('its board posts a courier and a haul home to Halcyon Station, and the starter Wren can fly both', J(g, `missionsOffered('sol-imbrium-dock').map(m => [m.id, missionReach(m, 'sol-imbrium-dock', newShip('wren')).ok, m.reward > 0].join(':'))`).join() === 'courier-sol-halcyon:true:true,haul-sol-halcyon:true:true');
check('the boards of the shipped docks are as they were with the pack on', J(g, `missionsOffered('halcyon-station').map(m => m.id)`).join() === J(off, `missionsOffered('halcyon-station').map(m => m.id)`).join() && J(g, `MISSIONS.length`) === J(off, `MISSIONS.length`) + 2);

// ---- the scale ----
const at = layout().at, spread = J(g, `SYSTEM_SCALE`);
check('a ring is 70,000 x the square root of the real distance in AU, and the game spreads it 3 times', SCALE.K === 70000 && SCALE.power === 0.5 && spread === SCALE.spread && SUN_BODIES.every(b => at[b.id].orbit === Math.round(70000 * Math.sqrt(b.au))) && ringOf(1) === 70000);
check('in space each body is on that ring: its distance from the Sun is the ring times 3 (to a px or two of rounding)', SUN_BODIES.every(b => { const q = S.bodies.find(x => x.id === b.id); return Math.abs(Math.hypot(q.x - B.sun.x, q.y - B.sun.y) - at[b.id].orbit * spread) <= 3; }));
const planets = ['sol-mercury', 'sol-venus', 'sol-earth', 'sol-mars', 'sol-jupiter', 'sol-saturn', 'sol-uranus', 'sol-neptune', 'sol-pluto'];
check('the planets keep their order outward, and the gaps grow: inner close, outer far', planets.every((id, k) => !k || at[id].orbit > at[planets[k - 1]].orbit) && at['sol-mars'].orbit - at['sol-earth'].orbit < at['sol-saturn'].orbit - at['sol-jupiter'].orbit && at['sol-saturn'].orbit - at['sol-jupiter'].orbit < at['sol-neptune'].orbit - at['sol-uranus'].orbit);
check('Eros is where it really is: between Earth and Mars, not in the belt', at['sol-eros'].orbit > at['sol-earth'].orbit && at['sol-eros'].orbit < at['sol-mars'].orbit);
check('the belt is between Mars and Jupiter; the trojans share Jupiter\'s ring 60 degrees either side of it', ['sol-vesta', 'sol-ceres', 'sol-pallas', 'sol-belt-inner', 'sol-belt-ceres', 'sol-belt-outer'].every(id => at[id].orbit > at['sol-mars'].orbit && at[id].orbit < at['sol-jupiter'].orbit) && at['sol-greeks'].orbit === at['sol-jupiter'].orbit && [at['sol-greeks'].angle, at['sol-trojans'].angle].every(a => Math.abs(Math.abs(((a - at['sol-jupiter'].angle + 540) % 360) - 180) - 60) < 0.01));
check('every moon is nearer to its own planet than to anything else that goes round the Sun, and each planet\'s moons keep their real order outward', MOONS.every(m => { const q = S.bodies.find(x => x.id === m.id), d = id => { const p = S.bodies.find(x => x.id === id); return Math.hypot(p.x - q.x, p.y - q.y); }; return SUN_BODIES.every(b => b.id === m.of || d(b.id) > d(m.of)); }) && MOONS.every(m => MOONS.filter(o => o.of === m.of && o.km < m.km).every(o => o.off < m.off)));
const eN = (at['sol-neptune'].orbit - at['sol-earth'].orbit) * spread, top = J(g, `CRUISE.top`);
check('Earth to Neptune at its shortest is about 941,000 px, a cruise of two minutes (card space-game-sol-needs-bigger-systems: it was 26 s), and the doc says so', eN > 900000 && eN < 980000 && eN / top > 110 && eN / top < 125 && /Earth to Neptune \| 941,600 \| about 2 minutes/.test(doc) && J(g, `cruiseEta(${Math.round(eN)})`) > 115 && J(g, `cruiseEta(${Math.round(eN)})`) < 125, Math.round(eN) + ' px, ' + (eN / top).toFixed(1) + ' s at top speed');
check('the system is as wide as a file may be: 1,000,000 units', J(g, `SYSTEMS.sol.size`) === 1000000 * spread && SCALE.size === 1000000);

// ---- our own names ----
const names = DOCKS.map(d => d.name).concat(SUN_BODIES.filter(b => b.invented).map(b => b.name));
const TAKEN = /tycho|medina|anderson|thoth|lovell|ceres station|eros station|ganymede station|phoebe station|pallas station|hygiea|londres|mariner valley|innis|laconia|ilus|behemoth|rocinante|canterbury|donnager|deep space nine|babylon|citadel|serenity|enterprise|nostromo|sevastopol|arcadia|omega station|jameson|coriolis/i;
check('seven docks and two gates, none with a name from a book, a show or a game (a list of the well-known ones)', DOCKS.length === 7 && names.length === 9 && names.every(x => !TAKEN.test(x)), names.join(', '));
check('each dock is named after a real feature of the body it is beside, and the doc says which', DOCKS.every(d => d.after && doc.includes(d.name) && doc.includes(d.after)));
check('the six docks the game cannot open yet are scenery in the system and their dock files wait in a folder the build skips', (() => { const later = readdirSync(new URL('../mods/sol/_stations-later/', import.meta.url)).filter(f => f.endsWith('.md')).sort(); return later.length === 6 && S.bodies.filter(b => b.type === 'scenery').length === 6 && later.join() === DOCKS.slice(1).map(d => d.id + '.md').sort().join(); })());
check('the doc lists every body, says what is invented, and names the three cards', SUN_BODIES.concat(MOONS).every(b => doc.includes('| ' + b.name + ' |')) && /What is real and what is invented/.test(doc) && ['space-game-bodies-orbit-a-body', 'space-game-more-than-one-dock', 'space-game-sol-needs-bigger-systems'].every(c => doc.includes(c)));

check('no errors in the game scripts', g.errors.length === 0 && off.errors.length === 0, g.errors.concat(off.errors).join(' | '));
console.log(failed ? `SOLPACK FAIL (${failed} of ${n})` : `SOLPACK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
