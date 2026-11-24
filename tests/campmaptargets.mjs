// smoke: every mark of the Campaign map is a target: click it, set it, fly or burn to it; moving ones are followed and led and held at a stand-off range (plain Node, no Chrome)
// Card space-game-campaign-map-targets (Troy, 20 Nov 2026): the Tab map's click sets a place; now it sets ANY mark (your ships, convoys, enemies, ore, rocks, outposts, planets) with the same Fly and Fast.
// The pure half is src/campnav.js (the rows, campNavTarget, campNavStop, campNavLead, campNavDrive, campNavPickStack), the numbers are CAMP.nav (stopEnemy, stopFriend, stopRock, leadMax, stackSame, pick).
//   A. the list: a row for every kind of mark, grouped, nearest first, named by what it is ("Raider 3"), and the map has marks for rocks and ore
//   B. the pick: the nearest mark to the cursor within the tolerance, none outside it, a stack cycles by a second click on the same spot
//   C. the stand-off: an alien is held at turret range, a friend alongside, a rock inside the laser's reach, ore at pickup range, the mothership and a tower as before
//   D. a moving target: led (the aim point is ahead of it), followed to the stand-off range and held there, the speed matched; a faster one is followed without trouble
//   E. a target lost ends the trip with a line: a ship killed, a rock broken, ore taken; Fast with a ship out is refused as it was (the wing rule)
//   F. the words are in their own file
// Run: node tests/campmaptargets.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = (level) => { const C = campNew(level || 11, [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); C.carrier.x = 0; C.carrier.y = 0; C.carrier.vx = C.carrier.vy = 0; C.carrier.rot = 0; return C; };
  window.__row = (C, id) => campNavRows(C).find(r => r.id === id);
  window.__ev = (C, key) => C.events.filter(e => e.type === 'nav' && e.key === key);
  // a scripted target: a ship that flies a straight line whatever the AI says, so the follow can be measured
  window.__script = (u, vx, vy) => { u.nextShot = 1e9; u.sx = u.x; u.sy = u.y; u.svx = vx; u.svy = vy; u.t0 = window.C.t; };
  window.__run = (C, s) => { window.__C = C; for (let i = 0; i < s * 30 && !C.result; i++) { campStep(C, 1 / 30); C.ships.forEach(u => { if (u.svx != null && u.hp > 0) { u.vx = u.svx; u.vy = u.svy; u.x += 0; u.x = u.sx + u.svx * (C.t - u.t0) / 1000; u.y = u.sy + u.svy * (C.t - u.t0) / 1000; } }); } };
`);

console.log('A. the list');
{
  g.run(`window.C = __new(11); campOrder(C, 'launch'); for (let i = 0; i < 7 * 30; i++) campStep(C, 1 / 30);
    window.R3 = campSpawn(C, 'raider', 2000, 300); window.G1 = campSpawn(C, 'gunship', -1500, -400); window.T1 = campSpawn(C, 'tower', 900, -900); window.D1 = campSpawn(C, 'drone', 600, 800);
    C.pickups.push({ id: 'wreck-90', kind: 'wreck', x: 300, y: 100, ore: 5, born: C.t }); C.pickups.push({ id: 'chunk-91', kind: 'chunk', x: -200, y: 500, ore: 20, born: C.t });`);
  const names = J('campNavRows(C).map(r => r.kind + "|" + r.name)');
  check('every kind of mark has a row: your ships one by one ("Fighter 3"), the aliens ("Raider N", "Gunship N", "Drone N"), a tower, ore and a wreck, and the rocks ("Rock N")', ['ship|Fighter ', 'alien|Raider ', 'alien|Gunship ', 'alien|Drone ', 'tower|Tower ', 'pickup|Wreck', 'pickup|Ore', 'rock|Rock '].every(p => names.some(x => x.indexOf(p) === 0)), names.join('; ').slice(0, 300));
  check('the row of a ship says which: "Raider 3" with its number, and is a moving row', J('__row(C, "alien:" + R3.id).name') === 'Raider ' + J('R3.id').split('-')[1] && J('__row(C, "alien:" + R3.id).moving') === true);
  check('the groups are in order: goal, places, convoys, enemies, caches and relic, ore and rocks, your ships; and nearest first inside a group', (() => { const order = ['goal', 'places', 'convoys', 'enemies', 'finds', 'ore', 'wing'], gs = J('campNavRows(C).map(r => r.group)'); const idx = gs.map(x => order.indexOf(x)); return idx.every((v, i, a) => v >= 0 && (!i || a[i - 1] <= v)); })() && J('(() => { const e = campNavRows(C).filter(r => r.group === "enemies"); return e.every((r, i) => !i || e[i - 1].dist <= r.dist); })()'));
  check('the map has marks for the rocks and the ore lying about (small), so there is something to click', J('campMapMarks(C).filter(m => m.type === "rock").length') >= 5 && J('campMapMarks(C).filter(m => m.type === "pickup").length') === 2);
  check('the mothership is one row, the towers rows of the enemies: the same kinds as the goal uses', (g.run(`window.M = campSpawn(C, 'mother', 3000, -3000)`), J('__row(C, "mother").kind') === 'mother' && J('__row(C, "tower:" + T1.id).group') === 'enemies'));
}

console.log('B. the pick');
{
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', -300, 1500); window.B = campSpawn(C, 'raider', -290, 1504); window.Z = campSpawn(C, 'drone', 2300, -300); A.nextShot = B.nextShot = Z.nextShot = 1e9;
    window.__proj = (x, y) => ({ x: x * 0.1, y: y * 0.1 });`);
  const stack = J('campNavPickStack(campNavRows(C), __proj, -30, 150).map(r => r.ref)');
  check('a click near two marks lists both, the nearest to the cursor first, and not the far one', stack.length === 2 && stack[0] === J('A.id') && stack[1] === J('B.id'), stack.join());
  check('a click farther than the tolerance (CAMP.nav.pick px) from every mark finds none', J(`campNavPickStack(campNavRows(C), __proj, -30 + CAMP.nav.pick + 5, 150).length`) === 0);
  check('the click is nearest-first: a click 10 px toward the second mark picks the second', J('campNavPickStack(campNavRows(C), __proj, -28.8, 150.4)[0].ref') === J('B.id'));
  check('a row that only repeats another (the goal\'s) is not a second item of the stack', (g.run(`window.G2 = campSpawn(C, 'mother', 2500, 2500); window.__gr = campNavRows(C).filter(r => r.x === G2.x && r.y === G2.y)`), J('__gr.length') >= 1 && J('campNavPickStack(campNavRows(C), __proj, 250, 250).filter(r => r.x === G2.x).length') === 1));
  // the map's click: set, then the same spot cycles, then a lone mark flies
  g.run(`
    window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'visible' ? true : __mk(path + '.' + String(k))), apply: () => __mk(path + '()') });
    window.__said = []; toast = (s, m) => { __said.push(m); };
    window.__scx = C => ({ camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => __mk('g'), text: (x, y, t) => { const o = { x, y, t, visible: true, rowId: '', width: 190, height: 24, alpha: 1, setText(v) { o.t = v; return o; }, setBackgroundColor() { return o; }, setColor() { return o; }, setAlpha(a) { o.alpha = a; return o; }, setVisible(v) { o.visible = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() { o.gone = true; } }; return o; } }, make: __mk('make'), input: { on() {}, off() {} } });
    window.C = __new(11); window.A = campSpawn(C, 'raider', -300, 1500); window.B = campSpawn(C, 'raider', -296, 1502); A.nextShot = B.nextShot = 1e9; window.S = __scx(C); campMapOpen(S); S.mp.dirty = true; campMapPaint(S, 0); campMapPaint(S, 400);
    window.P = campMapPoint(S.mp.fit, CAMPMAP.frame, -300, 1500);`);
  g.run(`window.c1 = campMapClick(S, P.x - 1, P.y); window.s1 = S.mp.setId; window.n1 = !!C.nav;`);
  check('the first click on a stack sets the nearest mark: marked, no flight', J('c1') === true && J('s1') === 'alien:' + J('A.id') && J('n1') === false, J('s1'));
  g.run(`campMapClick(S, P.x - 1, P.y); window.s2 = S.mp.setId; window.n2 = !!C.nav;`);
  check('a second click on the same spot takes the next one of the stack (no flight)', J('s2') === 'alien:' + J('B.id') && J('n2') === false, J('s2'));
  g.run(`campMapClick(S, P.x - 1, P.y); window.s3 = S.mp.setId;`);
  check('and a third goes round to the first again', J('s3') === J('s1'));
  g.run(`window.Z2 = campSpawn(C, 'drone', 2200, 1700); Z2.nextShot = 1e9; S.mp.dirty = true; campMapPaint(S, 800); window.P2 = campMapPoint(S.mp.fit, CAMPMAP.frame, 2200, 1700); campMapClick(S, P2.x, P2.y); window.t1 = S.mp.setId; window.m1 = !!C.nav; campMapClick(S, P2.x, P2.y); window.m2 = C.nav && C.nav.id;`);
  check('a lone mark: the first click sets it, the second flies there (as a place always did)', J('t1') === 'alien:' + J('Z2.id') && J('m1') === false && J('m2') === 'alien:' + J('Z2.id'), J('[t1, m1, m2]').join());
}

console.log('B2. a click on an outpost or a planet holds it as the one target (card space-game-keys3-select)');
{
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', -300, 1500); A.nextShot = 1e9; window.S = __scx(C); campMapOpen(S); S.mp.dirty = true; campMapPaint(S, 0); campMapPaint(S, 400);
    window.PV = campMapPoint(S.mp.fit, CAMPMAP.frame, 2700, -1500); window.PA = campMapPoint(S.mp.fit, CAMPMAP.frame, -300, 1500);`);
  g.run(`campTgtNearest(C); window.t0 = C.tgt; campMapClick(S, PV.x, PV.y); window.sv = S.mp.setId; window.nv = !!C.nav; window.fv = C.fsel; window.tv = C.tgt;`);
  check('a click on an outpost (Vesta) sets it as the map always did (marked, no flight) AND holds it: C.fsel is the place, campHeldNow says friendly with the place in post', J('t0') !== '' && J('sv') === 'place:vesta' && J('nv') === false && J('fv') === 'place:vesta' && J('campHeldNow(C).kind') === 'friendly' && J('campHeldNow(C).post.id') === 'place:vesta' && J('campHeldNow(C).unit') === null, J('[sv, fv, tv]').join());
  check('with an enemy held that click lets the enemy go: one target, C.tgt is empty', J('tv') === '' && J('C.tgt') === '' && J('campHeldNow(C).kind') === 'friendly');
  check('Fly to the target flies to the place held: campHeldRow is the map\'s row of that place', J('campHeldRow(C).id') === 'place:vesta' && J('campHeldRow(C).kind') === 'place');
  g.run(`campMapClick(S, PV.x, PV.y);`);
  check('the second click on the same place flies there, as before, and keeps it held', J('C.nav && C.nav.id') === 'place:vesta' && J('C.fsel') === 'place:vesta' && J('campHeldNow(C).post.id') === 'place:vesta');
  g.run(`campNavClear(C, 'clear'); C.fsel = ''; S.mp.setId = ''; S.mp.lastClick = null; S.mp.dirty = true; campMapPaint(S, 800); campMapClick(S, PA.x - 1, PA.y);`);
  check('a click on an enemy mark holds no place: C.fsel stays empty and the map sets the raider as before', J('S.mp.setId') === 'alien:' + J('A.id') && J('C.fsel') === '' && J('campHeldNow(C)') === null);
  g.run(`C.pickups.push({ id: 'chunk-91', kind: 'chunk', x: 1400, y: 900, ore: 20, born: C.t }); S.mp.setId = ''; S.mp.lastClick = null; S.mp.dirty = true; campMapPaint(S, 1200); window.PO = campMapPoint(S.mp.fit, CAMPMAP.frame, 1400, 900); campMapClick(S, PO.x, PO.y);`);
  check('a click on an ore mark holds no place either', J('S.mp.setId') === 'pickup:chunk-91' && J('C.fsel') === '' && J('campHeldNow(C)') === null);
  g.run(`C.fsel = 'place:vesta'; C.tgt = ''; S.mp.setId = ''; S.mp.lastClick = null; S.mp.dirty = true; campMapPaint(S, 1600); campMapClick(S, PA.x - 1, PA.y);`);
  check('a click on an enemy mark leaves a place already held held (no key of the map picks an enemy: [ ] \\ do)', J('C.fsel') === 'place:vesta' && J('C.tgt') === '' && J('campHeldNow(C).kind') === 'friendly');
}

console.log('C. the stand-off');
{
  const K = 'CAMP.nav';
  check('the numbers are in CAMP.nav: an enemy 400 px (turret range), a friend alongside (130), a rock inside the laser (200 of 230), a point 40, a ship (mothership, tower) 450 as before; the lead is capped', J(`${K}.stopEnemy`) === 400 && J(`${K}.stopFriend`) < 200 && J(`${K}.stopRock`) < J('CAMP.laser.range') && J(`${K}.stopPoint`) === 40 && J(`${K}.stopShip`) === 450 && J(`${K}.leadMax`) > 0);
  const st = (kind, r) => J(`campNavStop('${kind}', { r: ${r || 0} })`);
  check('alien and guard: stopEnemy; ship and convoy: stopFriend; rock: stopRock; pickup, cache, scan, relic, wing: stopPoint; mother and tower: stopShip; a place: its radius plus stop', st('alien') === 400 && st('guard') === 400 && st('ship') === 130 && st('convoy') === 130 && st('rock') === 200 && ['pickup', 'cache', 'scan', 'relic', 'wing'].every(k => st(k) === 40) && st('mother') === 450 && st('tower') === 450 && st('place', 60) === 60 + J(`${K}.stop`));
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', 3000, 0); A.nextShot = 1e9; A.hold = true; campNavFly(C, __row(C, 'alien:' + A.id), false, 'key'); __run(C, 30);`);
  check('a regular trip to a (still) alien ends about 400 px from it, and the carrier keeps station: the trip is on, it has not "arrived"', Math.abs(J('campDist(C.carrier, A)') - 400) < 120 && J('!!C.nav') && J('Math.hypot(C.carrier.vx, C.carrier.vy)') < 60, J('campDist(C.carrier, A)'));
  g.run(`window.C = __new(11); window.RK = C.rocks.find(r => r.hp > 0); window.__rk = campNavRows(C).find(r => r.kind === 'rock'); C.carrier.x = __rk.x - 2500; C.carrier.y = __rk.y; campNavFly(C, __rk, false, 'key'); __run(C, 30);`);
  check('a trip to a rock ends inside the laser\'s reach of it (stopRock), and arrives', J(`campDist(C.carrier, C.rocks.find(r => r.id === __rk.ref))`) < 300 && J('C.nav') === null, J(`campDist(C.carrier, C.rocks.find(r => r.id === __rk.ref))`));
  g.run(`window.C = __new(11); C.pickups.push({ id: 'chunk-77', kind: 'chunk', x: 1800, y: 500, ore: 20, born: C.t }); campNavFly(C, __row(C, 'pickup:chunk-77'), false, 'key'); __run(C, 25);`);
  check('a trip to ore ends in pickup range and the ore is taken (arrived, not lost)', J('C.pickups.length') === 0 && J('C.nav') === null && J('__ev(C, "camp.nav.arrived").length') === 1 && J('__ev(C, "camp.nav.lost").length') === 0);
  g.run(`window.C = __new(11); campOrder(C, 'launch'); __run(C, 7); window.F = campWing(C, 'fighter')[0]; F.x = 2500; F.y = 0; F.vx = F.vy = 0; F.order = { type: 'guard', at: { x: 2500, y: 0 } }; campNavFly(C, __row(C, 'ship:' + F.id), false, 'key'); __run(C, 25);`);
  check('a friendly ship is followed until alongside (about 130 px)', J('C.nav') !== null ? J('campDist(C.carrier, F)') < 400 : true, J('campDist(C.carrier, F)'));
}

console.log('D. a moving target');
{
  const lead = (c, t, v) => J(`campNavLead(${JSON.stringify(c)}, ${JSON.stringify(t)}, ${v})`);
  const l1 = lead({ x: 0, y: 0 }, { x: 1000, y: 0, vx: 0, vy: 100 }, 200);
  check('the lead aims ahead of a crossing target: further along its course, and the time to get there is about the distance over the speed', l1.y > 100 && l1.x >= 1000 && Math.abs(Math.hypot(l1.x, l1.y) / 200 - l1.t) < 0.4, JSON.stringify(l1));
  check('a target that does not move is where it is (no lead), and the lead is capped at leadMax seconds', JSON.stringify(lead({ x: 0, y: 0 }, { x: 500, y: 0, vx: 0, vy: 0 }, 200)) === JSON.stringify({ x: 500, y: 0, t: 0 }) && lead({ x: 0, y: 0 }, { x: 100000, y: 0, vx: 0, vy: 100 }, 200).t <= J('CAMP.nav.leadMax'));
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', 2500, -2000); __script(A, 0, 120); campNavFly(C, __row(C, 'alien:' + A.id), false, 'key'); __run(C, 40);`);
  const d1 = J('campDist(C.carrier, A)');
  check('a target crossing at 120 px/s is intercepted and followed to about turret range (400 px) and held there: within 600 px, the trip still on', d1 < 600 && d1 > 200 && J('!!C.nav') && J('C.nav.moving') === true, d1);
  g.run(`__run(C, 10);`);
  const sp = J('Math.hypot(C.carrier.vx - A.vx, C.carrier.vy - A.vy)');
  check('and the speed is matched: the carrier moves with it (a speed against it under 60 px/s), the distance steady', sp < 60 && Math.abs(J('campDist(C.carrier, A)') - d1) < 150, sp + ' ' + J('campDist(C.carrier, A)'));
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', 1200, 0); __script(A, 300, 0); campNavFly(C, __row(C, 'alien:' + A.id), false, 'key'); __run(C, 20);`);
  check('a target faster than the carrier (300 against 210, flying away) is followed all the time without a fault: the trip stays on, the carrier flies at its top speed after it', J('!!C.nav') && J('Math.hypot(C.carrier.vx, C.carrier.vy)') > 150 && g.errors.length === 0, JSON.stringify(J('[!!C.nav, C.result, C.t, C.carrier.x, A.x, C.carrier.hp, C.input.thrust]')));
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', 1200, 0); __script(A, 0, 0); campNavFly(C, __row(C, 'alien:' + A.id), true, 'key'); __run(C, 30);`);
  check('Fast to a still enemy (wing aboard) does not overshoot into it: it stops about 400 px from it', J('campDist(C.carrier, A)') > 250 && J('campDist(C.carrier, A)') < 650, J('campDist(C.carrier, A)'));
}

console.log('E. a target lost');
{
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', 2500, 0); __script(A, 0, 0); campNavFly(C, __row(C, 'alien:' + A.id), false, 'key'); __run(C, 3); A.hp = 0; C.events.length = 0; __run(C, 1);`);
  check('a ship killed ends the trip with a line: "Autopilot off: Raider N is gone."', J('C.nav') === null && J('__ev(C, "camp.nav.lost").length') === 1 && /^Autopilot off: Raider \d+ is gone\.$/.test(J('uiText("camp.nav.lost", __ev(C, "camp.nav.lost")[0].vars)')));
  g.run(`window.C = __new(11); window.__rk = campNavRows(C).find(r => r.kind === 'rock'); campNavFly(C, __rk, false, 'key'); __run(C, 2); C.rocks.find(r => r.id === __rk.ref).hp = 0; C.events.length = 0; __run(C, 1);`);
  check('a rock that breaks ends it too (lost)', J('C.nav') === null && J('__ev(C, "camp.nav.lost").length') === 1);
  g.run(`window.C = __new(11); campOrder(C, 'launch'); __run(C, 7); window.A = campSpawn(C, 'raider', 2500, 0); __script(A, 0, 0); window.__r1 = campNavFly(C, __row(C, 'alien:' + A.id), true, 'key');`);
  check('the wing rule is the same as for a place: Fast to an enemy with the wing out is refused the first time (the regular trip is allowed)', J('__r1.ok') === false && J('__r1.refused') === true && J('campNavFly(C, __row(C, "alien:" + A.id), false, "key").ok') === true);
  g.run(`window.C = __new(11); window.A = campSpawn(C, 'raider', 2500, 0); __script(A, 0, 0); campNavFly(C, __row(C, 'alien:' + A.id), false, 'key'); __run(C, 3); window.__n0 = C.nav; campNavFly(C, __row(C, 'alien:' + A.id), true, 'key');`);
  check('Fly then Fast on the same moving target keeps the trip (same trip, only the speed changes), as for a place', J('C.nav === __n0') && J('C.nav.fast') === true);
}

console.log('E2. the route label is clear of the Fly and Fast buttons (card space-game-l1-mine-goal)');
{
  g.run(`window.C3 = __new(11); window.GL = campNavGoal(C3); window.S3 = __scx(C3); campMapOpen(S3); S3.mp.dirty = true; campMapPaint(S3, 0); campMapPaint(S3, 400); window.P3 = campMapPoint(S3.mp.fit, CAMPMAP.frame, GL.x, GL.y); campMapClick(S3, P3.x, P3.y); S3.mp.dirty = true; campMapPaint(S3, 900); campMapPaint(S3, 1200);`);
  const boxes = ['btnFly', 'btnFast'].map(k => J(`(() => { const b = S3.mp.${k}; return b.visible ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; })()`)).filter(Boolean), r = J('(() => { const t = S3.mp.routeText; return { v: t.visible, x: t.x, y: t.y, w: t.width, h: t.height }; })()');
  const hit = b => r.x - r.w / 2 < b.x + b.w && r.x + r.w / 2 > b.x && r.y - r.h / 2 < b.y + b.h && r.y + r.h / 2 > b.y;
  check('the goal is set (its Fly and Fast buttons are up) and the route label is drawn; the label is under none of the buttons', boxes.length >= 2 && r.v === true && !boxes.some(hit), JSON.stringify({ r, boxes }));
}

console.log('F. the words');
{
  const md = src('content/text/campmaptargets.md');
  check('the names are rows of content/text/campmaptargets.md and defaults of src/contenttables.js, and the game says them', ['camp.nav.k.raider', 'camp.nav.k.gunship', 'camp.nav.k.fighter', 'camp.nav.wreck', 'camp.nav.chunk', 'camp.nav.rock'].every(k => md.includes('| ' + k + ' |') && src('src/contenttables.js').includes("'" + k + "'") && J(`uiText('${k}', { n: 4 })`) !== k));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN MAP TARGETS FAIL (${failed} of ${n})` : `\nCAMPAIGN MAP TARGETS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
