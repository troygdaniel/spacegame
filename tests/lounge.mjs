// smoke: lounge quick go: number keys 1-6 stand you at the bar, missions, fuel, shop, repair and ship at each of the six docks (plain Node, no Chrome)
// Quick go (card space-game-lounge-quick-go): loungeStops() in src/station.js numbers the spots a station has and says where you stand at each;
// Station.quickGo(n) puts the player there unless a terminal, the shop, the pump or a chat owns the keys. Checked for every dock: the keys run
// 1..n with no gap, each standing point is clear of every solid box of the hall, and E there reaches the spot the key names (it is the nearest one).
// The hall's boxes are copied here from station.js, shop.js, fuel.js and interior.js: a desk that moves there must move here, and this test says so.
// Run: node tests/lounge.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

const DOCKS = [['halcyon-station', 'halcyon'], ['kestrel-outpost', 'kestrel'], ['meridian-exchange', 'meridian'], ['brass-smelter', 'brass'], ['ember-foundry', 'ember'], ['roost-dock', 'roost']];
const ORDER = ['bar', 'missions', 'pump', 'shop', 'repair', 'ship'];
const R = 9, REACH = 90; // the pilot's body (station.js setCircle(9)) and how far E reaches (update(): nearD = 90)

// the scene's spots and solid boxes for the dock you are at, built the way Station.create() builds them
const hall = (station, system) => J(`(() => {
  G.system = '${system}'; G.lastDock = '${station}';
  const look = stationLook(), t = look.terminals, spots = [], solids = [];
  const box = (x, y, w, h) => solids.push([x, y, w, h]);
  box(0, 0, W, IN_NORTH); box(0, H - IN_SOUTH, W, IN_SOUTH); box(0, 0, 20, H); box(W - 20, 0, 20, H);
  box(860, IN_NORTH, 20, 280 - IN_NORTH); box(860, 440, 20, 260 - (IN_SOUTH - 20)); box(20, 420, 380, 20); box(520, 420, 340, 20);
  [[500, 100], [540, 100], [760, 320]].forEach(([x, y]) => box(x - 20, y - 20, 40, 40));
  if (t.missions) { spots.push({ x: 200, y: 200, key: 'missions' }); box(150, 178, 100, 44); }
  if (t.repair) { spots.push({ x: 640, y: 200, key: 'repair' }); box(590, 178, 100, 44); }
  spots.push({ x: 1090, y: 360, key: 'ship' });
  if (t.bar) { box(90, 596, 330, 26); box(598, 498, 44, 44); box(178, 478, 44, 44); box(790, 444, 52, 26); }
  else IN_HALL.forEach(([x, y, w, h]) => box(x, y, w, h));
  NPCS.forEach((p, i) => { if (npcHere(p)) { spots.push({ x: p.x, y: p.y, key: 'npc' + i, npc: i }); box(p.x - 14, p.y - 14, 28, 28); } });
  if (t.shop) { spots.push({ x: 1000, y: 170, key: 'shop' }); box(950, 148, 100, 44); }
  if (t.pump) { spots.push({ x: PUMP.x, y: PUMP.y, key: 'pump' }); box(PUMP.x - PUMP.w / 2, PUMP.y - 22, PUMP.w, PUMP.h); }
  [[1170, 56, 84, 40], [1170, 100, 84, 40], [1180, 144, 70, 34], [978, 558, 44, 44], [898, 636, 70, 28], [1190, 600, 34, 34], [1226, 604, 34, 34], [1208, 566, 34, 34]].forEach(a => box(...a));
  [[44, 462], [836, 650], [832, 560]].forEach(([x, y]) => box(x - 13, y - 13, 26, 26));
  return { terminals: t, spots, solids, stops: loungeStops(spots, look), tenders: spots.filter(sp => sp.npc !== undefined && NPCS[sp.npc].role === 'bartender').map(sp => sp.key) };
})()`);
const hits = (st, [x, y, w, h]) => { const dx = st.x - Math.max(x, Math.min(st.x, x + w)), dy = st.y - Math.max(y, Math.min(st.y, y + h)); return dx * dx + dy * dy < R * R; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

for (const [station, system] of DOCKS) {
  console.log(station);
  const h = hall(station, system), keys = h.stops.map(s => s.key);
  const want = ORDER.filter(k => k === 'ship' || h.terminals[k]);
  check('a stop for every spot the dock has, in the order bar, missions, fuel, shop, repair, ship', JSON.stringify(keys) === JSON.stringify(want), keys.join(' ') + ' / ' + want.join(' '));
  check('the keys run 1..' + keys.length + ' with no gap', h.stops.every((s, i) => s.n === String(i + 1)), h.stops.map(s => s.n).join(''));
  for (const st of h.stops) {
    const bad = h.solids.find(b => hits(st, b));
    check(`${st.n} ${st.key}: you stand on open floor`, !bad, bad && `${st.x},${st.y} is in ${bad}`);
    const near = h.spots.map(sp => ({ sp, d: dist(st, sp) })).filter(o => o.d < REACH).sort((a, b) => a.d - b.d)[0];
    const ok = near && (st.key === 'bar' ? (h.tenders.length ? h.tenders.includes(near.sp.key) : true) : near.sp.key === st.key);
    if (st.key === 'bar' && !h.tenders.length) check(`${st.n} bar: nobody tends it now, you stand at the counter`, st.y < 596 && st.y > 440);
    else check(`${st.n} ${st.key}: E there reaches it (it is the nearest spot, within ${REACH})`, ok, near ? near.sp.key + ' at ' + near.d.toFixed(0) : 'nothing in reach');
    const t = st.key === 'bar' ? null : h.spots.find(sp => sp.key === st.key);
    if (t) check(`${st.n} ${st.key}: you face it`, Math.abs(Math.atan2(t.y - st.y, t.x - st.x) - st.face) < 1e-9);
    check(`${st.n} ${st.key}: its key cap is on the screen and off every desk`, st.cx > 30 && st.cx < 1250 && st.cy > 60 && st.cy < 660 && !h.solids.slice(8).some(([x, y, w, hh]) => st.cx > x && st.cx < x + w && st.cy > y && st.cy < y + hh && hh === 44 && w === 100), st.cx + ',' + st.cy);
  }
}

console.log('quickGo: the jump itself, and when the keys belong to something else');
const go = (flags, key) => J(`(() => {
  G.system = 'halcyon'; G.lastDock = 'halcyon-station';
  const moved = [], s = Object.assign({ look: stationLook(), talk: null, spots: [{ x: 200, y: 200, key: 'missions' }, { x: 640, y: 200, key: 'repair' }, { x: 1090, y: 360, key: 'ship' }],
    player: { rotation: 0, body: { reset: (x, y) => moved.push([x, y]) } } }, ${JSON.stringify(flags)});
  const r = Station.prototype.quickGo.call(s, '${key}');
  return { r, moved };
})()`);
const free = go({}, '3'); // bar, missions, repair, ship: 3 is the repair bay
check('3 puts you in front of the repair bay', free.r === true && JSON.stringify(free.moved) === '[[640,244]]', JSON.stringify(free));
check('a key past the last stop does nothing', go({}, '9').r === false && go({}, '9').moved.length === 0);
for (const f of ['panel', 'shopOpen', 'pumpOpen', 'leaving', 'chat']) { const o = go({ [f]: true }, '2'); check(`no jump while ${f} is set`, o.r === false && o.moved.length === 0, JSON.stringify(o)); }

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed} of ${n} checks passed`);
process.exit(failed ? 1 : 0);
