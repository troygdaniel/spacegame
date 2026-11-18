// smoke: the radar's orrery: the star at the centre, a circle per body, every system of the data inside the rim, the switch to the close view (plain Node, no Chrome)
// The radar's far view (card space-game-radar-orrery, src/hud.js hudOrreryModel / hudRadarMode). What it draws is worked out by a function with
// no drawing in it, from the system's data alone, so it is checked here in plain Node (tests/nodegame.mjs). Nothing is pinned to a distance of
// today's data: the checks hold for every system as it stands, and for the same system spread out three times.
// Run: node tests/hudradar.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const R = 84;

console.log('A. every system of the data');
const all = J(`Object.keys(SYSTEMS).map(id => { const sys = SYSTEMS[id], b0 = sys.bodies[0] || { x: 0, y: 0 }, m = hudOrreryModel(sys, { x: b0.x + 300, y: b0.y }, ${R});
  return { id, star: m.star, hasStar: !!sys.star, c: m.c, sc: m.sc, far: m.far, rings: m.rings, n: m.bodies.length,
    shown: sys.bodies.filter(b => HUD_ORRERY.types.includes(b.type)).length, maxR: Math.max(0, ...m.bodies.map(b => b.d * m.sc)), finite: [m.c.x, m.c.y, m.sc, m.far].every(Number.isFinite) }; })`);
check('there are systems to check', all.length >= 2, all.map(a => a.id).join(' '));
check('every system: finite numbers, a positive scale', all.every(a => a.finite && a.sc > 0), JSON.stringify(all.filter(a => !a.finite || !(a.sc > 0)).map(a => a.id)));
check('every system: every body sits inside the rim', all.every(a => a.maxR <= R - 8 + 1e-6), all.map(a => a.id + ' ' + a.maxR.toFixed(1)).join(', '));
check('every system: stations, planets, gates, belts and scenery are all there; salvage sites are not', all.every(a => a.n === a.shown));
check('every system: no more circles than bodies, each inside the rim, none on top of another', all.every(a => a.rings.length <= a.n && a.rings.every(r => r > 4 && r <= R - 8 + 1e-6) && a.rings.every((r, i) => a.rings.every((q, j) => i === j || Math.abs(q - r) >= 2.5))));
check('a system with a star in its data: the star is the centre', all.filter(a => a.hasStar).every(a => a.star && J(`SYSTEMS['${a.id}'].star.x`) === a.c.x && J(`SYSTEMS['${a.id}'].star.y`) === a.c.y));
const nostar = all.filter(a => !a.hasStar);
check('a system with no star in its data: the middle of the system is the centre, marked as no star', nostar.every(a => !a.star && a.c.x === J(`SYSTEMS['${a.id}'].size / 2`)), nostar.map(a => a.id).join(' ') || 'none today');

console.log('B. nothing is pinned to today\'s distances');
const x3 = J(`(() => { const sys = SYSTEMS.halcyon, me = { x: sys.bodies[0].x, y: sys.bodies[0].y }, a = hudOrreryModel(sys, me, ${R});
  const big = { name: sys.name, size: sys.size * 3, star: sys.star && { type: sys.star.type, x: sys.star.x * 3, y: sys.star.y * 3 }, bodies: sys.bodies.map(b => Object.assign({}, b, { x: b.x * 3, y: b.y * 3 })) };
  const b = hudOrreryModel(big, { x: me.x * 3, y: me.y * 3 }, ${R});
  return { far: [a.far, b.far], sc: [a.sc, b.sc], rings: [a.rings, b.rings] }; })()`);
check('the same system three times as wide: three times the reach, a third of the scale, the same picture', Math.abs(x3.far[1] / x3.far[0] - 3) < 1e-9 && Math.abs(x3.sc[0] / x3.sc[1] - 3) < 1e-9 && x3.rings[0].length === x3.rings[1].length && x3.rings[0].every((r, i) => Math.abs(r - x3.rings[1][i]) < 1e-6));
const out = J(`(() => { const sys = SYSTEMS.halcyon, m = hudOrreryModel(sys, { x: sys.size * 4, y: sys.size / 2 }, ${R}); return { you: Math.hypot(sys.size * 4 - m.c.x, sys.size / 2 - m.c.y) * m.sc }; })()`);
check('you, far outside every orbit: the scale opens so you are still on the plate', out.you <= R - 8 + 1e-6, out.you.toFixed(1));

console.log('C. systems with little or nothing in them');
let m = J(`hudOrreryModel({ name: 'Deep space', size: 20000, bodies: [] }, { x: 3000, y: 9000 }, ${R})`);
check('no star, no bodies (deep space): the middle is the centre, no circles, you on the plate', m.c.x === 10000 && m.rings.length === 0 && m.bodies.length === 0 && !m.star && Math.hypot(3000 - m.c.x, 9000 - m.c.y) * m.sc <= R - 8 + 1e-6);
m = J(`hudOrreryModel({ bodies: [] }, { x: 3000, y: 9000 }, ${R})`);
check('no star, no size, no bodies: you are the centre and the scale is the floor', m.c.x === 3000 && m.c.y === 9000 && m.far === J(`HUD_ORRERY.floor`) && Number.isFinite(m.sc));
m = J(`hudOrreryModel(undefined, { x: 1, y: 2 }, ${R})`);
check('no system at all: still a picture, nothing thrown', m.bodies.length === 0 && Number.isFinite(m.sc));
m = J(`hudOrreryModel({ bodies: [{ type: 'planet', x: 100, y: 100 }, { type: 'planet', x: 5100, y: 100 }, { type: 'planet', x: 'x', y: 0 }, { type: 'poi', x: 9, y: 9 }, null] }, { x: 100, y: 100 }, ${R})`);
check('no star and no size: the middle of the bodies; a body with a bad place, a salvage site and a hole in the list are left out', m.c.x === 2600 && m.c.y === 100 && m.bodies.length === 2 && m.rings.length === 1, JSON.stringify(m.rings));
m = J(`hudOrreryModel({ star: { x: 0, y: 0 }, bodies: [{ type: 'station', x: 1000, y: 0 }, { type: 'planet', x: 0, y: 1010 }, { type: 'gate', x: 5000, y: 0 }] }, { x: 0, y: 0 }, ${R})`);
check('two bodies at nearly the same distance share one circle', m.bodies.length === 3 && m.rings.length === 2, JSON.stringify(m.rings));

console.log('D. in space it is always the system; hostiles are dots on it');
const mode = J(`(() => { const h = {}, out = []; out.push(hudRadarMode(h, Infinity, 0)); out.push(hudRadarMode(h, 2000, 100)); out.push(hudRadarMode(h, 100, 200)); out.push(hudRadarMode(h, 100, 99000)); out.push(hudRadarMode(h, Infinity, 99001)); return out; })()`);
check('nothing near, a hostile far off, a hostile beside you, a long fight, after it: always the system (card space-game-real-solar-system)', mode.every(x => x === 'sys') && mode.length === 5, mode.join());
const foes = J(`(() => { const sys = SYSTEMS.halcyon, me = { x: sys.bodies[0].x + 300, y: sys.bodies[0].y }, m = hudOrreryModel(sys, me, ${R});
  const list = [{ x: me.x + 900, y: me.y, active: true }, { x: me.x, y: me.y - 900, active: true, wanted: true }, { x: sys.size * 5, y: sys.star.y, active: true }, { x: 1, y: 1, active: false }, null, { x: 'a', y: 2, active: true }];
  const f = hudOrreryFoes(m, list, ${R}), you = { x: (me.x - m.c.x) * m.sc, y: (me.y - m.c.y) * m.sc };
  return { n: f.length, f, you, sc: m.sc }; })()`);
check('each live hostile is a dot; one that is gone, a hole in the list and one with a bad place are left out', foes.n === 3, JSON.stringify(foes.f));
check('a hostile 900 px east of you is drawn east of your mark, at the map\'s scale', Math.abs((foes.f[0].x - foes.you.x) - 900 * foes.sc) < 1e-6 && Math.abs(foes.f[0].y - foes.you.y) < 1e-6 && foes.f[0].x > foes.you.x, JSON.stringify([foes.f[0], foes.you]));
check('a wanted one is marked (amber), north of you', foes.f[1].wanted === true && foes.f[1].y < foes.you.y && foes.f[0].wanted === false);
check('a hostile outside the system is held on the rim, not drawn off the plate', Math.abs(Math.hypot(foes.f[2].x, foes.f[2].y) - (R - 4)) < 1e-6);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nHUDRADAR FAIL (${failed} of ${n})` : `\nHUDRADAR PASS (${n})`);
process.exitCode = failed ? 1 : 0;
