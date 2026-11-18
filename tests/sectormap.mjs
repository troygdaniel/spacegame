// smoke: sector map rules: the local view, names that never overlap or leave the frame, a legend of what is on the map, the ring starts on the objective (plain Node)
// The Tab sector map (card space-game-critic-map, src/map.js). The blind critic's picture 08 had KEPLER-4B, HALCYON STATION, KESTREL OUTPOST and
// YOU on top of each other in one corner of an empty grid, a name running out of the frame, an Enter line about Halcyon under an objective of
// Kepler-4b, and a legend of things not on the map. The rules that fix it are pure functions, tested here with the real Halcyon system:
//   mapView        the square of the system the map shows      mapPlace       where each name goes
//   mapLegendRows  the legend rows for what is drawn
// The drawing itself is checked on the page by tests/outpostmap.mjs and tests/cruise.mjs.
// Run: node tests/sectormap.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const WS = J('sysDef().size'), B = J('sysBodies().map(b => ({ id: b.id, type: b.type, name: b.name, x: b.x, y: b.y, r: b.r || 0 }))');
const body = id => B.find(b => b.id === id);
const view = (pts, whole) => J(`mapView(${JSON.stringify(pts)}, ${WS}, ${!!whole})`);

console.log('the view');
{
  const ship = { x: body('halcyon-station').x + 120, y: body('halcyon-station').y }, kep = body('kepler-4b');
  const v = view([ship, kep]);
  const MIN = J('sysAt(9000)'); // the smallest local view: 9000 px of the data, spread out with the system (src/data_systems.js SYSTEM_SCALE)
  check('at launch with Kepler-4b as the objective the view is local: a quarter of the system across', v.size === MIN && WS === J('sysAt(36000)') && MIN * 4 === WS, JSON.stringify(v));
  check('it holds the ship and the objective, each well inside', [ship, kep].every(p => p.x > v.x + v.size * 0.1 && p.x < v.x + v.size * 0.9 && p.y >= v.y && p.y < v.y + v.size * 0.9), JSON.stringify(v));
  check('it never leaves the system', v.x >= 0 && v.y >= 0 && v.x + v.size <= WS && v.y + v.size <= WS);
  const px = p => [(p.x - v.x) * 560 / v.size, (p.y - v.y) * 560 / v.size];
  const st = px(body('halcyon-station')), pl = px(kep), op = px(body('kestrel-outpost'));
  const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  check('station, planet and outpost are now over 100 px from each other on the map (before: 46 and 42)', far(st, pl) > 100 && far(st, op) > 100 && far(pl, op) > 100, [far(st, pl), far(st, op), far(pl, op)].map(Math.round).join());
  check('Z: the whole system', JSON.stringify(view([ship, kep], true)) === JSON.stringify({ x: 0, y: 0, size: WS }));
  check('an objective across the system (Tern) makes it the whole system by itself', view([ship, body('tern')]).size === WS);
  const mid = view([ship, body('kepler-4c')]);
  check('one in between (Kepler-4c) gets a view in between that holds both', mid.size > MIN && mid.size < WS && [ship, body('kepler-4c')].every(p => p.x >= mid.x && p.x <= mid.x + mid.size && p.y >= mid.y && p.y <= mid.y + mid.size), JSON.stringify(mid));
  check('a ship in a corner: the view stops at the edge of the system', JSON.stringify(view([{ x: 100, y: WS - 100 }])) === JSON.stringify({ x: 0, y: WS - MIN, size: MIN }));
  check('nothing to hold (or a broken point): the whole system', view([]).size === WS && view([null, { x: NaN, y: 1 }]).size === WS);
}

console.log('the names');
{
  const frame = { x: 100, y: 100, w: 560, h: 560 };
  const place = items => J(`mapPlace(${JSON.stringify(items)}, ${JSON.stringify(frame)})`);
  const boxes = (items, at) => items.map((it, i) => ({ t: it.t, x: at[i].x, y: at[i].y, w: it.w, h: it.h }));
  const touching = bs => { const out = []; bs.forEach((a, i) => bs.slice(i + 1).forEach(b => { if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) out.push(a.t + '/' + b.t); })); return out; };
  const inside = bs => bs.every(b => b.x - b.w / 2 >= frame.x && b.x + b.w / 2 <= frame.x + frame.w && b.y - b.h / 2 >= frame.y && b.y + b.h / 2 <= frame.y + frame.h);
  // picture 08 as it was: the whole system on 560 px, the four marks of the home cluster
  const old = [{ t: 'YOU', x: 164, y: 162, r: 12, w: 24, h: 15, side: 'below' }, { t: 'KEPLER-4B', x: 196, y: 131, r: 13, w: 72, h: 15 }, { t: 'HALCYON STATION', x: 162, y: 162, r: 11, w: 120, h: 15 }, { t: 'KESTREL OUTPOST', x: 131, y: 190, r: 10, w: 120, h: 15 }];
  const a = boxes(old, place(old));
  check('the four marks of picture 08, as close as they were: no two names touch', touching(a).length === 0, touching(a).join(' ') + ' ' + JSON.stringify(a));
  check('and KESTREL OUTPOST (60 px of it was outside) is inside the frame, like the rest', inside(a), JSON.stringify(a));
  const alone = place([{ t: 'A', x: 300, y: 300, r: 10, w: 60, h: 15 }, { t: 'B', x: 400, y: 400, r: 10, w: 60, h: 15, side: 'below' }]);
  check('a mark with room keeps its name where it was: above it, or below when asked', alone[0].x === 300 && alone[0].y < 290 && alone[1].x === 400 && alone[1].y > 410, JSON.stringify(alone));
  const edge = [{ t: 'TOP LEFT', x: 102, y: 102, r: 8, w: 90, h: 15 }, { t: 'BOTTOM RIGHT', x: 658, y: 658, r: 8, w: 110, h: 15, side: 'below' }, { t: 'RIGHT', x: 655, y: 300, r: 8, w: 80, h: 15 }];
  const e = boxes(edge, place(edge));
  check('marks on the edge and in the corners: the names stay inside', inside(e), JSON.stringify(e));
  const pile = []; for (let i = 0; i < 8; i++) pile.push({ t: 'N' + i, x: 300 + (i % 3) * 14, y: 300 + (i / 3 | 0) * 14, r: 6, w: 70, h: 14 });
  const p = boxes(pile, place(pile));
  check('eight marks in a 40 px heap: still inside the frame, and the first five names are clear of each other', inside(p) && touching(p.slice(0, 5)).length === 0, touching(p).join(' '));
  check('a name does not sit on another mark', (() => { const it = [{ t: 'A', x: 300, y: 300, r: 10, w: 80, h: 15 }, { t: 'B', x: 300, y: 278, r: 10, w: 80, h: 15 }]; const at = place(it); return Math.abs(at[0].y - 278) >= 10 + 7 || Math.abs(at[0].x - 300) >= 10 + 40; })());
}

console.log('the legend');
{
  const rows = on => J(`mapLegendRows(${JSON.stringify(on)})`);
  const kinds = on => rows(on).map(r => r[1]).join();
  check('nothing but you: one row', kinds({}) === 'ship');
  check('the home view at launch: you, the station and the outpost by name, planet, belt, objective', JSON.stringify(rows({ station: 'Halcyon Station', outpost: 'Kestrel Outpost', planet: true, belt: true, objective: true })) === JSON.stringify([['you', 'ship'], ['Halcyon Station', 'station'], ['Kestrel Outpost', 'outpost'], ['planet', 'planet'], ['asteroid belt', 'belt'], ['objective', 'target']]));
  check('no pirate seen, no site found: no row for them (picture 08 listed three)', !/live|stale|wanted|poi/.test(kinds({ station: 'S', planet: true })));
  check('a wreck on the map gets its row (Dead station had none)', kinds({ wreck: true }) === 'ship,wreck');
  check('everything at once is 11 rows, and they end above the footer', rows({ station: 'S', outpost: 'O', planet: 1, belt: 1, wreck: 1, objective: 1, live: 1, stale: 1, wanted: 1, poi: 1 }).length === 11 && J('MAP_LEG_MAX') === 11 && J('MAP_LEG_Y + 10 * mapLegStep(11) + 20') < 638);
  check('up to nine rows keep the old spacing', J('mapLegStep(9)') === J('MAP_LEG_STEP') && J('mapLegStep(1)') === J('MAP_LEG_STEP'));
}

console.log('the map picks nothing');
check('the picker rule is gone (a place is picked in the navigation panel)', J("typeof mapPickStart") === 'undefined');

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
