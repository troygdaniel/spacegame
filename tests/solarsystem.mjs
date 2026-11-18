// smoke: the star is a real body: at the centre of every system, in the nav list and the nav panel, a cruise and autopilot destination; every body has its orbit (plain Node, no Chrome)
// Card space-game-real-solar-system, slice 1 (src/universe.js sysStar, sysOrbit; src/cruise.js; src/navpanel.js). Troy: the sun should be a
// destination and the rest should orbit it. The star is made from the system's star row, bodies stand still for now, and each has the ring
// it is on (radius and angle from the star) so motion can be switched on later.
// Run: node tests/solarsystem.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

const ids = J(`Object.keys(SYSTEMS)`);
check('there are systems to check', ids.length >= 8, ids.join());
for (const id of ids) {
  const r = J(`(() => { const d = SYSTEMS['${id}'], st = sysStar('${id}'), all = sysBodies(undefined, '${id}');
    return { has: !!st, star: st, row: d.star, size: d.size, first: all[0] && all[0].type, stars: all.filter(b => b.type === 'star').length, n: all.length, data: d.bodies.length,
      inData: d.bodies.some(b => b.type === 'star'), byType: sysBodies('star', '${id}').length, station: (sysBody('station', '${id}') || {}).type || null }; })()`);
  check(`${id}: one star body, at the place the data gives, in the list of bodies and not written into the data`, r.has && r.stars === 1 && r.byType === 1 && r.first === 'star' && r.n === r.data + 1 && !r.inData && r.star.x === r.row.x && r.star.y === r.row.y && r.star.type === 'star', JSON.stringify(r).slice(0, 300));
  check(`${id}: the star has a name, a size and its type, and sits inside the system`, /Sun$/.test(r.star.name) && r.star.r >= 600 && r.star.r <= 1200 && r.star.star === r.row.type && r.star.x > 0 && r.star.x < r.size && r.star.y > 0 && r.star.y < r.size, JSON.stringify(r.star));
  check(`${id}: the other lookups are as they were (the first station is still a station)`, r.station === null || r.station === 'station');
  const orb = J(`sysBodies(undefined, '${id}').map(b => { const o = sysOrbit(b, '${id}'), back = sysOrbitAt(b, 0, '${id}'); return { type: b.type, r: o.r, a: o.a, dx: Math.abs(back.x - b.x), dy: Math.abs(back.y - b.y), br: b.r || 0 }; })`);
  check(`${id}: every body has an orbit: a radius and an angle from the star that give its place back`, orb.every(o => Number.isFinite(o.r) && Number.isFinite(o.a) && o.dx < 1e-6 && o.dy < 1e-6) && orb[0].r === 0);
  const inside = orb.filter(o => o.type !== 'star' && o.type !== 'poi' && o.r < J(`sysStar('${id}').r`) + o.br);
  check(`${id}: no station, planet, belt or gate lies inside the star`, inside.length === 0, JSON.stringify(inside));
}
check('Halcyon has its sun in the middle of the system: Halcyon Sun, a yellow star', J(`(() => { const s = sysStar('halcyon'); return [s.name, s.x === sysAt(18000), s.y === sysAt(18000), s.x === SYSTEMS.halcyon.size / 2, s.star, s.r]; })()`).join() === 'Halcyon Sun,true,true,true,G,900');
check('a later angle keeps a body on its ring: a quarter turn of the station is as far from the star', J(`(() => { const b = sysBody('station', 'halcyon'), c = sysStar('halcyon'), p = sysOrbitAt(b, Math.PI / 2, 'halcyon'); return Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - sysOrbit(b, 'halcyon').r) < 1e-6 && Math.hypot(p.x - b.x, p.y - b.y) > 1000; })()`));
check('deep space (a pull-out) has no star', J(`(() => { G.deep = { from: 'halcyon' }; const r = [sysStar(), sysBodies('star').length]; G.deep = null; return r; })()`).join() === ',0');

// ---- a destination: the nav list, the nav panel, cruise ----
g.run(`G.system = 'halcyon'; var __s = { ship: { x: sysBody('station').x + 250, y: sysBody('station').y }, cr: { target: null } };`);
const known = J(`cruiseKnown(__s).map(b => [b.name, b.type, Math.round(b.r), Math.round(b.dist)])`);
const sun = known.find(k => k[1] === 'star');
check('the nav list has the star, with its radius and its distance', !!sun && sun[0] === 'Halcyon Sun' && sun[2] === 900 && sun[3] > 15000, JSON.stringify(sun));
check('it is typed STAR', J(`CRUISE_TYPES.star`) === 'STAR');
check('picking it makes it the nav target, as any body', J(`(() => { toast = () => {}; sfx = () => {}; cruisePick(__s, cruiseKnown(__s).find(b => b.type === 'star')); return [__s.cr.target.name, __s.cr.target.type, __s.cr.target.r]; })()`).join() === 'Halcyon Sun,star,900');
check('a cruise to the star ends 900 px off its rim; to a planet 900 px from its centre, as before', J(`[cruiseStop({ type: 'star', r: 900 }), cruiseStop({ type: 'planet', r: 440 }), cruiseStop({ type: 'station', r: 0 }), cruiseStop(null)]`).join() === '1800,900,900,900');
check('the autopilot stops outside the star too (its rim and 350 px)', J(`autopilotStop({ type: 'star', r: 900 })`) === 1250);
check('the flight assist takes the same stop for Approach', J(`assistStopAt({ type: 'star', r: 900, x: 0, y: 0 })`) === 1250);
const rows = J(`navpanelRows(cruiseKnown(__s), [], null).map(r => [r.group, r.name, r.type])`);
const sunRow = rows.find(r => r[2] === 'star');
check('the nav panel has a row for the star, with the planets and belts', !!sunRow && sunRow[0] === 'bodies' && sunRow[1] === 'Halcyon Sun', JSON.stringify(rows.filter(r => r[0] === 'bodies')));
check('that group says so in its heading', J(`NAVPANEL.groups.find(g => g[0] === 'bodies')[1]`) === 'SUN, PLANETS AND BELTS');
check('every other system lists its star too', ids.every(id => J(`(() => { G.system = '${id}'; const k = cruiseKnown({ ship: { x: 0, y: 0 } }); G.system = 'halcyon'; return k.filter(b => b.type === 'star').length; })()`) === 1));
check('the Overview list would show it as a body named STAR', J(`overviewRows(cruiseKnown(__s).map(b => ({ id: b.id, name: b.name, kind: b.type, x: b.x, y: b.y })), { x: 0, y: 0 }).find(r => r.kind === 'star').label`) === 'STAR');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SOLARSYSTEM FAIL (${failed} of ${n})` : `SOLARSYSTEM PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
