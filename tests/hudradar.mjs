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

console.log('F. the minimap is centred on the ship (card space-game-minimap-ship-centred)');
const near = J(`HUD_MAP.near`), slow = J(`HUD_MAP.slow`), fast = J(`HUD_MAP.fast`);
// the scale follows the speed
check('stopped or slow: the near view', Math.abs(J(`hudMapRange(0, 90000)`) - near) < 1e-6 && Math.abs(J(`hudMapRange(${slow}, 90000)`) - near) < 1e-6);
check('at cruise speed: the far view for this system', Math.abs(J(`hudMapRange(${fast}, 90000)`) - 90000) < 1e-6 && Math.abs(J(`hudMapRange(8000, 90000)`) - 90000) < 1e-6);
const sweep = J(`(() => { const out = []; for (let v = 0; v <= ${fast} + 500; v += 50) out.push(hudMapRange(v, 90000)); return out; })()`);
check('between them it only ever opens as the speed rises, and never leaves the two ends', sweep.every((r, i) => (!i || r >= sweep[i - 1] - 1e-9) && r >= near - 1e-6 && r <= 90000 + 1e-6));
check('a small system, or none: never tighter than the near view, and nothing not a number', [J(`hudMapRange(9000, 500)`), J(`hudMapRange(9000)`), J(`hudMapRange(undefined, 90000)`)].every(r => Math.abs(r - near) < 1e-6));
// eased, so it never jumps
const ease = J(`(() => { let r = ${near}, max = 0, out = []; for (let i = 0; i < 600; i++) { const n = hudMapEase(r, 90000, 16.67); max = Math.max(max, n / r); r = n; if (i === 59 || i === 599) out.push(r); } return { max, at1s: out[0], at10s: out[1] }; })()`);
check('a jump in speed: the range moves under 8 percent a frame, is on its way after a second and there after ten, never past it', ease.max < 1.08 && ease.at1s > near * 2 && ease.at1s < 90000 && Math.abs(ease.at10s - 90000) < 10 && ease.at10s <= 90000 + 1e-6, JSON.stringify(ease));
check('the first frame takes the wanted range at once; a frame of no time moves nothing', J(`hudMapEase(undefined, 5000, 16)`) === 5000 && Math.abs(J(`hudMapEase(3000, 9000, 0)`) - 3000) < 1e-6);
// the far view: the sun and most of the rings
const farv = J(`(() => { const sys = SYSTEMS.halcyon, b0 = sys.bodies[0], me = { x: b0.x, y: b0.y }, m = hudOrreryModel(sys, me, ${R}); return { far: hudMapFar(m, me), sun: Math.hypot(me.x - m.c.x, me.y - m.c.y), star: m.star, ring: Math.max(...m.bodies.map(b => b.d)) }; })()`);
check('the far view from the home station: the sun is on the plate when the system has one', !farv.star || farv.far >= farv.sun, JSON.stringify(farv));
check('a system with no star: the far view is from its widest ring alone, never under the near view', J(`hudMapFar({ star: false, c: { x: 0, y: 0 }, bodies: [{ d: 20000 }] }, { x: 5e6, y: 0 })`) === 20000 * J(`HUD_MAP.farK`) && J(`hudMapFar({ star: false, c: { x: 0, y: 0 }, bodies: [] }, { x: 0, y: 0 })`) === near);
// where a thing is on the plate, and the rim marker when it is off it
let q = J(`hudMapPoint(1200, 0, 2400, ${R})`);
check('a thing half the range east of you: half way to the rim, east, on the plate', !q.out && Math.abs(q.x - R / 2) < 1e-9 && Math.abs(q.y) < 1e-9 && q.dist === 1200);
q = J(`hudMapPoint(0, -9000, 2400, ${R})`);
check('a thing far to the north: a marker on the rim at the top (north is up), with its true distance', q.out && Math.abs(q.x) < 1e-6 && Math.abs(q.y + (R - J(`HUD_MAP.edge`))) < 1e-6 && q.dist === 9000 && Math.abs(q.a + Math.PI / 2) < 1e-9, JSON.stringify(q));
q = J(`hudMapPoint(-30000, 30000, 2400, ${R})`);
check('south-west: the marker is on the rim to the lower left, pointing the same way', q.out && q.x < 0 && q.y > 0 && Math.abs(Math.hypot(q.x, q.y) - (R - J(`HUD_MAP.edge`))) < 1e-6 && Math.abs(q.a - 3 * Math.PI / 4) < 1e-9);
check('the heading does not come into it: the map never turns (no rotation argument at all)', J(`hudMapPoint.length`) === 4);
check('exactly on you: the centre, no marker, nothing not a number', J(`(() => { const p = hudMapPoint(0, 0, 2400, ${R}); return !p.out && p.x === 0 && p.y === 0 && p.dist === 0; })()`));
// the rings: true circles round the sun, clipped to the plate
check('the sun at the centre, a ring inside the plate: all of it', J(`hudMapArc(0, 0, 40, ${R})`).full === true);
check('a ring far bigger than the plate, the sun at the centre: none of it crosses', J(`hudMapArc(0, 0, 500, ${R})`) === null);
check('a ring wholly off to one side: none of it', J(`hudMapArc(400, 0, 50, ${R})`) === null);
const arc = J(`hudMapArc(1000, 0, 1000, ${R})`);
check('you are on a ring whose sun is far to the east: a short arc through the centre, on the side facing you (west of the sun)', !!arc && !arc.full && Math.abs(Math.cos((arc.a0 + arc.a1) / 2) + 1) < 1e-9 && arc.a1 - arc.a0 > 0 && arc.a1 - arc.a0 < 0.4, JSON.stringify(arc));
const ends = J(`(() => { const a = hudMapArc(1000, 0, 1000, ${R}); return [a.a0, a.a1, (a.a0 + a.a1) / 2].map(t => Math.hypot(1000 + Math.cos(t) * 1000, Math.sin(t) * 1000)); })()`);
check('that arc ends exactly on the rim and its middle passes through you', Math.abs(ends[0] - R) < 1e-6 && Math.abs(ends[1] - R) < 1e-6 && ends[2] < 1e-6, ends.map(x => x.toFixed(3)).join(' '));
const many = J(`(() => { let bad = 0, n = 0; for (let sx = -300; sx <= 300; sx += 37) for (let sy = -300; sy <= 300; sy += 41) for (const r of [5, 60, 130, 290, 700]) { const a = hudMapArc(sx, sy, r, ${R}); n++;
  for (let i = 0; i < 72; i++) { const t = i * Math.PI / 36, inside = Math.hypot(sx + Math.cos(t) * r, sy + Math.sin(t) * r) < ${R} - 1e-6;
    const on = !a ? false : a.full ? true : (() => { const mid = (a.a0 + a.a1) / 2, half = (a.a1 - a.a0) / 2, d = Math.atan2(Math.sin(t - mid), Math.cos(t - mid)); return Math.abs(d) < half - 1e-9; })();
    if (inside && !on) bad++; } } return { bad, n }; })()`);
check('over a grid of suns and ring sizes: every point of a ring that is inside the plate is on the arc that is drawn', many.bad === 0 && many.n > 1000, JSON.stringify(many));
check('rings: one per distance from the sun, near-equal ones share, none without a star', JSON.stringify(J(`hudMapRings({ star: true, bodies: [{ d: 1000 }, { d: 1010 }, { d: 5000 }, { d: 0 }] })`)) === '[1000,5000]' && J(`hudMapRings({ star: false, bodies: [{ d: 1000 }] })`).length === 0);
check('the distance on a marker is short: 86, 1,240, 12k', J(`hudMapDist(860)`) === '86' && J(`hudMapDist(12400)`) === '1,240' && J(`hudMapDist(120000)`) === '12k');

console.log('G. the drawing runs: hudRadar on a stand-in pen (no Chrome), in the states a flight goes through');
g.run(`
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  function __radar(o) { // o: { x, y, speed, rot, nav, obj, foes, frames, deep, warm: frames parked before the speed is given }
    const keep = G.deep; if (o.deep) G.deep = { danger: 1 };
    try {
      const sys = sysDef(), h = { s: { add: __P }, g: __P, t: {}, seen: {}, zones: [], now: 0, lock: null };
      const s = { ship: { x: o.x, y: o.y, rotation: o.rot || 0, body: { speed: o.speed || 0 } }, enemies: { getChildren: () => o.foes || [] }, cr: { target: o.nav || null }, _hb: [] };
      let now = 1000; for (let i = 0; i < (o.frames || 1); i++) { h.seen = {}; s.ship.body.speed = i < (o.warm || 0) ? 0 : o.speed || 0; hudRadar(h, s, 'Space', o.obj || null, now); now += 16.67; }
      return { range: h.mapRange, mode: h.radarMode, texts: Object.keys(h.seen).sort(), near: h.near === Infinity ? -1 : h.near, star: !!sys.star };
    } finally { G.deep = keep; }
  }
`);
const st0 = J(`(() => { const b = sysBody('station'); return { x: b.x, y: b.y }; })()`), sun = J(`(() => { const m = hudOrreryModel(sysDef(), { x: 0, y: 0 }, ${R}); return { x: m.c.x, y: m.c.y, star: m.star }; })()`);
let d1 = J(`__radar({ x: ${st0.x + 300}, y: ${st0.y}, speed: 0 })`);
check('parked beside the station: it draws, the range is the near view, the label and the count are there', d1.mode === 'sys' && Math.abs(d1.range - near) < 1e-6 && d1.texts.includes('rl') && d1.texts.includes('rt'), JSON.stringify(d1));
check('parked far from the sun: the sun is a marker on the rim with its distance (when the system has a star)', !sun.star || Math.hypot(st0.x + 300 - sun.x, st0.y - sun.y) < near || d1.texts.includes('rm0'), d1.texts.join(' '));
d1 = J(`__radar({ x: ${st0.x + 300}, y: ${st0.y}, speed: 0, nav: { x: ${st0.x + 60000}, y: ${st0.y - 40000}, name: 'far' }, obj: { x: ${st0.x - 50000}, y: ${st0.y + 9000} } })`);
check('a destination and a job far off the plate: each gets its own rim marker', d1.texts.includes('rm1') && d1.texts.includes('rm2'), d1.texts.join(' '));
d1 = J(`__radar({ x: ${st0.x + 300}, y: ${st0.y}, speed: 0, nav: { x: ${st0.x + 500}, y: ${st0.y} }, obj: { x: ${st0.x}, y: ${st0.y + 400} } })`);
check('the same two close by: on the plate, so no rim marker for them', !d1.texts.includes('rm1') && !d1.texts.includes('rm2'), d1.texts.join(' '));
const cruise = J(`__radar({ x: ${st0.x + 300}, y: ${st0.y}, speed: 8000, warm: 5, frames: 905 })`), first = J(`__radar({ x: ${st0.x + 300}, y: ${st0.y}, speed: 8000, warm: 5, frames: 7 })`);
check('at cruise speed the view opens over the frames: from parked, a little wider two frames after the speed comes, far wider after fifteen seconds', first.range > near && first.range < near * 1.2 && cruise.range > near * 2, first.range.toFixed(0) + ' -> ' + cruise.range.toFixed(0));
check('and in cruise the sun is on the plate, not on the rim (when the system has a star)', !sun.star || !cruise.texts.includes('rm0'), cruise.texts.join(' '));
d1 = J(`__radar({ x: ${st0.x}, y: ${st0.y}, speed: 200, foes: [{ x: ${st0.x + 400}, y: ${st0.y}, active: true }, { x: ${st0.x + 90000}, y: ${st0.y}, active: true }, { x: ${st0.x}, y: ${st0.y - 300}, active: false }] })`);
check('pirates near and far: it draws, and the nearest live one is what the line under it counts from', d1.near === 400, JSON.stringify(d1));
d1 = J(`__radar({ deep: true, x: 5000, y: 5000, speed: 3000, frames: 60, nav: { x: 900000, y: 5000 } })`);
check('deep space (no star, no bodies): it draws, no sun marker, the destination still has its rim marker, the range is a number', !d1.star && !d1.texts.includes('rm0') && d1.texts.includes('rm1') && Number.isFinite(d1.range) && d1.range >= near - 1e-6, JSON.stringify(d1));
d1 = J(`__radar({ x: ${sun.x}, y: ${sun.y}, speed: 0 })`);
check('sitting exactly on the sun: it draws, nothing not a number', Number.isFinite(d1.range), JSON.stringify(d1));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nHUDRADAR FAIL (${failed} of ${n})` : `\nHUDRADAR PASS (${n})`);
process.exitCode = failed ? 1 : 0;
