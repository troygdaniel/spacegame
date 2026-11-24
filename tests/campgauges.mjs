// smoke: the Campaign's three gauges and the turrets' charge; the power keys J K L (no balance key) (plain Node, no Chrome)
// Card space-game-systems-gauges (Troy, 21 Nov 2026). The code is src/camphud.js (the gauges), src/campaign.js (CAMP.tank, C.charge, campLaserSpend / campLaserStep, the turrets that pay for a shot) and the scene's
// wiring (src/campaignscene.js). What is tested:
//   A. the turrets' charge: full at the start, a shot spends it, it mends by the weapons' pips, a starved weapon system fires as fast as it mends, the computer says so once
//   B. the direct keys J K L: a pip to the shields, the engines, the weapons (the dials' order), and only in flight; the semicolon's balance key (card space-game-power-balance-key) is gone (card space-game-keys-select): Balance is the strip's order
//      and the keys mean the same whether a list is open or not (the power list is deleted: card space-game-delete-off-lists)
//   C. the numbers of the three dials (shields, speed, lasers) and the hull bar, and the bars' pips
//   D. where things are: nothing under the toast band, nothing on another thing, the lines of text start under the gauges and stay above where the cruiser list opens (the left, under the lines)
//   E. the bars' animation: easing, a flash when the pips change
//   F. drawing, with a recording stand-in for Phaser's Graphics, and the scene's wiring (the W S E pips and the old hull and shield texts are gone)
// Run: node tests/campgauges.mjs   (exit code 1 on a failed check)
import { readFileSync, existsSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about them (the list, J K L, the bars, the pip orders), so it switches them on. The game as it is now: tests/powerremoved.mjs
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

// a battle with one alien that cannot die or shoot, 300 px ahead of the carrier (inside the turrets' reach), the waves held back: the shots the turrets fire are counted
g.run(`
  window.__fight = (pips, charge) => { window.C = campNew(1, [], { seed: 1 }); C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; C.power.p = pips.slice(); C.power.base = pips.slice(); C.charge = charge; C.chargeLow = charge < CAMP.tank.max * CAMP.tank.low;
    const u = campSpawn(C, 'gunship', C.carrier.x + 300, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e9; C.shield = 1e9; C.input.fire = true; window.__shots = 0; window.__says = []; };
  window.__run = sec => { for (let t = 0; t < sec; t += 0.05) { campStep(C, 0.05); C.events.forEach(e => { if (e.type === 'turret') __shots++; if (e.type === 'say') __says.push(e.key); }); C.events.length = 0; } };
`);

console.log('A. the turrets\' charge');
{
  const k = J('CAMP.tank');
  check('the table: a tank of 100, a shot costs 1, a refill rate for each of 0 to 4 pips and every pip mends faster', k.max === 100 && k.cost === 1 && k.refill.length === 5 && k.refill.every((v, i) => i === 0 || v > k.refill[i - 1]), JSON.stringify(k));
  check('a battle starts with a full tank, and the computer has not said it is low', J('(() => { const C = campNew(1, [], { seed: 1 }); return [C.charge, C.chargeLow]; })()').join() === '100,false');
  g.run('__fight([2, 2, 2], 100); __run(1)');
  const s1 = g.run('__shots'), c1 = J('C.charge');
  check('a second of steady fire at the default 2 / 2 / 2 is about 11 shots, and the tank is that many down plus 8 mended', s1 >= 9 && s1 <= 14 && Math.abs(c1 - (100 - s1 + 8)) < 2.5, [s1, c1].join());
  g.run('__fight([2, 2, 2], 0); __run(5)');
  const s2 = g.run('__shots');
  check('an empty tank at 2 pips: the turrets fire as fast as it mends, 8 a second (40 shots in 5 s, where a full tank gives 57)', s2 >= 34 && s2 <= 46, s2);
  g.run('__fight([0, 3, 3], 0); __run(5)');
  const s0 = g.run('__shots');
  check('starved weapons (0 pips) fire about 2 shots a second from an empty tank', s0 >= 6 && s0 <= 14, s0);
  g.run('__fight([4, 1, 1], 0); __run(5)');
  const s4 = g.run('__shots');
  check('and 4 pips about 14 a second, so more pips are more fire whatever the tank holds', s4 >= 62 && s4 <= 78 && s4 > s2 && s2 > s0, [s0, s2, s4].join());
  g.run('__fight([2, 2, 2], 0); C.input.fire = false; __run(5)');
  check('with the trigger up nothing is spent, and the tank mends at the rate of the pips: 40 in 5 s at 2 pips', Math.abs(J('C.charge') - 40) < 1 && g.run('__shots') === 0, J('C.charge'));
  g.run('__fight([2, 2, 2], 90); C.input.fire = false; __run(5)');
  check('the tank never holds more than 100', J('C.charge') === 100);
  check('the rate is the pips of the weapons: campLaserRate follows C.power.p[0], and the emergency (1 pip) slows it', J('(() => { const C = campNew(1, [], { seed: 1 }); const a = campLaserRate(C); C.power.p = [4, 1, 1]; const b = campLaserRate(C); C.power.p = [0, 3, 3]; return [a, b, campLaserRate(C)]; })()').join() === '8,14,2');
  g.run('__fight([0, 3, 3], 100); __run(40)');
  const say = g.run('__says.filter(k => k === "camp.say.lasersdry").length');
  check('a tank that runs low says so once (not on every shot)', say === 1, say);
  check('the words are in the game: the line is "Lasers are running dry."', J('uiText("camp.say.lasersdry")') === 'Lasers are running dry.');
  g.run('__fight([2, 2, 2], 100); C.input.fire = false; C.charge = 5; C.chargeLow = true; __run(1)');
  const lowAt1 = J('C.chargeLow'); g.run('__run(5)');
  check('it says so again only after the tank has mended past twice the mark: still flagged at 13 (a second), flag put back at 53 (six seconds)', lowAt1 === true && J('C.chargeLow') === false && J('C.charge') > 40, J('[C.chargeLow, C.charge]'));
  g.run('window.C = campNew(1, [], { seed: 1, mission: 1 }); C.waves.forEach(w => { w.started = true; }); C.input.fire = true; const r = C.rocks.find(x => x.hp > 0); C.carrier.x = r.x - 220; C.carrier.y = r.y; C.carrier.vx = 0; C.carrier.vy = 0; C.shield = 1e9; C.charge = 50; window.__r = r; window.__hp = r.hp;');
  g.run('for (let t = 0; t < 1; t += 0.05) campStep(C, 0.05)');
  check('a laser on a rock (mining) spends charge too: the rock is hurt and the tank is down', J('__r.hp < __hp') && J('C.charge') < 50 + 8 - 5, J('[__r.hp, __hp, C.charge]'));
}

console.log('B. the direct keys J K L');
{
  const r = J(`(() => { const C = campNew(1, [], { seed: 1 }); const a = campPowerKey(C, 'KeyJ'), pa = C.power.p.slice(); const b = campPowerKey(C, 'KeyK'), pb = C.power.p.slice(); const c = campPowerKey(C, 'KeyL'), pc = C.power.p.slice(); const x = campPowerKey(C, 'KeyG'); return { a, pa, b, pb, c, pc, x }; })()`);
  check('J gives the shields a pip (from the system with the most: weapons, on a tie with the engines), the voice says "Power to shields."', r.a.used && r.a.ok && r.pa.join() === '1,3,2' && r.a.say === 'Power to shields.', JSON.stringify(r.a) + r.pa);
  check('K gives the engines one, from the shields (3 is the most): "Power to engines."', r.b.ok && r.pb.join() === '1,2,3' && r.b.say === 'Power to engines.', JSON.stringify(r.b) + r.pb);
  check('L gives the weapons one, from the engines (3 is the most), back to 2 / 2 / 2: "Power to weapons."', r.c.ok && r.pc.join() === '2,2,2' && r.c.say === 'Power to weapons.', JSON.stringify(r.c) + r.pc);
  check('a key that is not one of the three is not used', r.x.used === false);
  const full = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.power.p = [4, 1, 1]; C.power.base = [4, 1, 1]; const a = campPowerKey(C, 'KeyL'); return { a, p: C.power.p }; })()`);
  check('a system at full power says so and nothing moves: "That system is at full power."', full.a.used && !full.a.ok && full.a.say === 'That system is at full power.' && full.p.join() === '4,1,1', JSON.stringify(full));
  const em = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.ore = 100; C.shield = 10; const o = campOrder(C, 'emergency', '', 'key'); return { o, k: campPowerKey(C, 'KeyJ') }; })()`);
  check('Emergency shields no longer holds the power (card space-game-keys2-cruiser: it fills the shield for ore and is done): the order is taken and J still moves a pip', em.o.ok && em.k.used && em.k.ok, JSON.stringify(em));
  const sc = src('src/campaignscene.js');
  check('the scene reads them as direct keys (campPanelKey, with no Shift passed), in flight only, and never while a word is typed into the strip; the codes are CAMP_KEYS\' (shields J, engines K, weapons L, each with its system; there is no balance key and no key on the semicolon)', /pr = !typing && typeof campPanelKey === 'function' \? campPanelKey\(this\.pn, C, c, now\) :/.test(sc) && J(`['shields', 'engines', 'weapons'].map(id => CAMP_KEYS[id].codes.join('+') + ':' + CAMP_KEYS[id].sys + ':' + CAMP_KEYS[id].k).join()`) === 'KeyJ:shields:J,KeyK:engines:K,KeyL:weapons:L' && J(`['KeyJ', 'KeyK', 'KeyL'].map(c => ['shields', 'engines', 'weapons'].find(id => campKeyIs(id, c))).join()`) === 'shields,engines,weapons' && J(`'balance' in CAMP_KEYS`) === false && J(`Object.keys(CAMP_KEYS).some(id => campKeyIs(id, 'Semicolon'))`) === false);
  check('and the table names them in the dials\' order: CAMP_GAUGE.keys is J shields, K engines, L weapons, free of every other key the Campaign binds', J('Object.entries(CAMP_GAUGE.keys).map(e => e.join(":")).join()') === 'KeyJ:shields,KeyK:engines,KeyL:weapons');
  check('the H page names each (and Settings, which is built from the same table): under POWER in the CAMPAIGN group, J K L on one line and nothing on the semicolon (no balance row), and the caps are CAMP_KEYS\'', J(`controlsGroup('campaign').rows.filter(r => r.sub === 'POWER').map(r => r.k.join(' ')).join('|')`) === 'J K L' && J(`controlsGroup('campaign').rows.filter(r => r.sub === 'POWER').map(r => r.k.join(' ')).join('|')`) === J(`['shields', 'engines', 'weapons'].map(id => CAMP_KEYS[id].k).join(' ')`) && J(`controlsGroup('campaign').rows.find(r => r.k.join() === 'J,K,L').t`) === 'Power to shields, engines, weapons', J(`controlsGroup('campaign').rows.filter(r => r.sub === 'POWER')`));
}

{
  const b = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.power.p = [1, 3, 2]; C.power.base = [1, 3, 2]; const r = campOrder(C, 'balance', '', 'key'); const after = C.power.p.slice(), base = C.power.base.slice(); const again = campOrder(C, 'balance', '', 'key'); const o = C.orders.balance; const key = campPowerKey(C, 'Semicolon'); return { r, after, base, again, o, key }; })()`);
  check('the balance order (the power list\'s row, the strip) puts the power back to 2 / 2 / 2 at once (and the setting that is kept), the voice says "Power balanced."; the semicolon is no key now: campPowerKey answers nothing for it', b.r.ok && b.after.join() === '2,2,2' && b.base.join() === '2,2,2' && b.r.say === 'Power balanced.' && b.key.used === false && b.key.ran === false, JSON.stringify(b));
  check('the balance when the power is even already is not an error: the same words, and nothing moves', b.again.ok && b.again.say === 'Power balanced.' && b.o === 2, JSON.stringify(b.again));
  const e = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.ore = 100; C.shield = 10; campOrder(C, 'emergency', '', 'key'); const r = campOrder(C, 'balance', '', 'key'); return { r, p: C.power.p }; })()`);
  check('after Emergency shields the balance is not refused (the emergency holds nothing now)', e.r.ok && e.p.join() === '2,2,2', JSON.stringify(e));
  check('the scene flashes the three bars on a balance, even when nothing moved', /pr\.row === 'balance' && this\.gaugeAnim\) this\.gaugeAnim\.flash = this\.gaugeAnim\.flash\.map\(\(\) => 1\)/.test(src('src/campaignscene.js')));
  check('the H page has no row for the balance (its key is gone), CAMP_KEYS has no balance entry, a hint that names {keybalance} says nothing, and no list has a Balance row (the power list is deleted; Balance is the strip\'s order)', !J(`controlsGroup('campaign').rows.some(r => /2 \\/ 2 \\/ 2/.test(r.t) || r.k.join() === ';')`) && J(`CAMP_KEYS.balance`) === null && J(`campKeyVar('keybalance')`) === '' && J(`CAMP_PANELS.panels.filter(p => p.rows.some(r => r.id === 'balance')).length`) === 0 && J(`campKeyRow('balance')`) === null);
}

console.log('C. the numbers of the dials');
{
  const d0 = J(`(() => { const C = campNew(1, [], { seed: 1 }); return { d: campGauges(C), h: campHullBar(C), max: campShieldMax(C) }; })()`);
  check('three dials in the order of the card: shields, speed, lasers, with their words and the keys of their bars (J, K, L)', d0.d.map(x => x.id + x.key).join() === 'shieldsJ,speedK,lasersL' && d0.d.map(x => x.label).join() === 'SHIELDS,SPEED,LASERS', JSON.stringify(d0.d.map(x => [x.id, x.label])));
  check('at the start: the shield is full (150), the ship is at rest, the tank is full, and each bar has its 2 pips', d0.d[0].frac === 1 && d0.d[0].big === '150' && d0.d[1].big === '0' && d0.d[2].frac === 1 && d0.d[2].big === '100' && d0.d.every(x => x.pips === 2), JSON.stringify(d0.d));
  check('the hull is the thin bar under the shields: HULL 600, full, green', d0.h.n === 600 && d0.h.frac === 1 && d0.h.label === 'HULL' && d0.h.warn === false);
  const d1 = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.power.p = [1, 4, 1]; C.power.base = [1, 4, 1]; C.shield = 75; C.charge = 15; C.carrier.vx = 105; C.carrier.vy = 0; C.carrier.hp = 120; const a = campGauges(C), h = campHullBar(C); C.power.p = [1, 1, 4]; const b = campGauges(C); return { a, h, b, shMax: campShieldMax(C) }; })()`);
  check('the pips of each bar are the system\'s: shields the second pip count, speed the third, lasers the first (1 / 4 / 1 then 1 / 1 / 4)', d1.a.map(x => x.pips).join() === '4,1,1' && d1.b.map(x => x.pips).join() === '1,4,1', JSON.stringify([d1.a.map(x => x.pips), d1.b.map(x => x.pips)]));
  check('the shield dial is its share of the cap at the pips now (75 of 225 at 4 pips), the laser dial the tank (15 per cent, and warns), the hull bar warns under 30 per cent', Math.abs(d1.a[0].frac - 75 / 225) < 1e-9 && d1.a[2].frac === 0.15 && d1.a[2].warn === true && d1.h.warn === true && d1.h.n === 120, JSON.stringify([d1.a[0], d1.a[2], d1.h]));
  check('the speed dial: the number is the speed; the mark is the top speed at the engines\' power, and it moves with it (0.88 of the scale at 1 pip: 1 / 1.25 x 0.88; 4 pips the whole scale)', d1.a[1].big === '105' && Math.abs(d1.a[1].tick - 0.88 / 1.25) < 1e-9 && Math.abs(d1.b[1].tick - 1.12 / 1.25 * 0 - d1.b[1].tick) < 1e-9 && Math.abs(d1.b[1].tick - 1.25 / 1.25) < 1e-9, JSON.stringify([d1.a[1], d1.b[1]]));
  const em = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.ore = 100; C.shield = 10; campOrder(C, 'emergency', '', 'key'); return campGauges(C)[0].color; })()`);
  check('after Emergency shields the shield dial keeps its own colour (the white of the old four-pip emergency is gone)', em !== 0xffffff, em);
  const fast = J(`(() => { const C = campNew(1, [], { seed: 1 }); C.carrier.vx = 400; return campGauges(C)[1]; })()`);
  check('a burn faster than the top speed turns the speed dial amber and fills it to the end', fast.color === 0xffb454 && fast.frac === 1, JSON.stringify(fast));
}

console.log('D. where things are');
{
  const Z = J('campHudGeom()'), T = J('TOAST'), W = J('W'), tab = J('CAMPPANELS_LOOK'), keep = J('CAMP.nav.arrow.keep'), box = J('campTdispBox()'); // box: the target display's (the radar's old place)
  const band = { x0: W / 2 - (T.w + 2 * T.pad) / 2, x1: W / 2 + (T.w + 2 * T.pad) / 2, y0: T.top, y1: T.bottom };
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const boxes = Z.cells.flatMap((c, i) => [{ id: 'dial' + i, ...c.dial }, { id: 'bar' + i, ...c.bar }]).concat([{ id: 'hull', ...Z.hull }]);
  check('three cells, each with a dial and a bar beside it, level with the dial\'s middle', Z.cells.length === 3 && Z.cells.every(c => c.bar.x0 > c.dial.x1 && Math.abs((c.bar.y0 + c.bar.y1) / 2 - c.cy) <= 1), JSON.stringify(Z.cells[0]));
  check('no box is on another (dials, bars, the hull bar)', boxes.every((a, i) => boxes.every((b, j) => i === j || !hit(a, b))), JSON.stringify(boxes));
  check('the widest toast (from the band\'s top) touches none of them, and the left edge of the gauges (at the top RIGHT, card space-game-power-presets) is right of the toast band', boxes.every(b => !hit(band, b)) && Math.min(...boxes.map(b => b.x0)) > band.x1, JSON.stringify([band, Math.min(...boxes.map(b => b.x0))]));
  check('the hull bar is under the shield dial and its bar, and starts where the dial does', Z.hull.y0 >= Z.cells[0].dial.y1 && Z.hull.x0 === Z.cells[0].dial.x0 && Z.hull.x1 === Z.cells[0].bar.x1, JSON.stringify(Z.hull));
  check('the whole block is at the top right, above the target display (which is at the bottom right now), and every box is on the screen, the block\'s right edge 8 px from the screen\'s', boxes.every(b => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= box.y) && Z.block.x1 === W - J('CAMP.hud.right') && box.y + box.h < J('H') - 40 && box.x + box.w <= W, JSON.stringify([box, Z.block]));
  const f0 = J(`campHudFlow([{ id: 'a', show: true }, { id: 'b', show: false }, { id: 'c', show: true, h: 12 }, { id: 'd', show: true }])`);
  check('a line with nothing to say gives its place back: b is skipped, the next goes where it would have gone, a line with a bar under it takes 12 px more', f0.ys.a === J('CAMP.hud.text.y') && f0.ys.b === undefined && f0.ys.c === f0.ys.a + J('CAMP.hud.text.pitch') && f0.ys.d === f0.ys.c + J('CAMP.hud.text.pitch') + 12, JSON.stringify(f0));
  check('the lines are a column at the TOP CENTRE (card space-game-layout-hud: they were at the top left, which is the cruiser\'s corner now): the first at y 6, each centred on x 640 (the screen\'s middle), and the dim plate under them is centred and 560 wide, so it stays between the two corners (x 360 to 920)', f0.ys.a === 6 && J('CAMP.hud.text.x') === W / 2 && J('CAMP.hud.plate.w') === 560 && J('CAMP.hud.text.x') - J('CAMP.hud.plate.w') / 2 >= 360 && J('CAMP.hud.text.x') + J('CAMP.hud.plate.w') / 2 <= 920, JSON.stringify([f0.ys.a, J('CAMP.hud.text')]));
  const typ = J(`campHudFlow(['wave', 'obj', 'earth', 'repair', 'post'].map(id => ({ id, show: true, h: id === 'earth' ? 12 : 0 })))`), calm = J(`campHudFlow(['wave', 'obj', 'earth'].map(id => ({ id, show: true, h: id === 'earth' ? 12 : 0 })))`), pitch = J('CAMP.hud.text.pitch');
  check('the wave, the goal and Earth with its bar (the lines of an Earth mission) end above the toast band; with the repair line and the outpost hint as well the column reaches into the band (a toast over them is drawn over the lines: pinned here, picture check owed)', calm.bottom - pitch + 17 <= T.top && typ.bottom - pitch + 17 > T.top, JSON.stringify([calm.bottom, typ.bottom, T.top]));
  check('the arrow\'s keep-out rectangles cover the top centre column (the middle one) and the corners at its sides', keep.some(r => r[0] <= 360 && r[2] >= 920 && r[1] <= 0 && r[3] >= calm.bottom) && keep.some(r => r[0] <= 0 && r[1] <= 0 && r[2] >= 358 && r[3] >= 100), JSON.stringify(keep));
  check('the arrow\'s keep-out rectangles cover the gauges at the top right (the whole block) and the target display at the bottom right', keep.some(r => r[2] >= W && r[0] <= Z.block.x0 && r[1] <= 0 && r[3] >= Z.block.y1) && keep.some(r => r[2] >= W && r[0] <= box.x && r[1] <= box.y && r[3] >= box.y + box.h), JSON.stringify(keep));
  check('no literal pip table is left: CAMP.hud has no pips', J('CAMP.hud.pips') === null);
}

console.log('E. the bars\' animation');
{
  const a = J(`(() => { const A = campGaugeAnimNew([2, 2, 2]); const out = [JSON.stringify(A)]; campGaugeAnim(A, [4, 2, 2], 0); const flash0 = A.flash[0]; campGaugeAnim(A, [4, 2, 2], 100); const mid = A.shown[0]; for (let i = 0; i < 10; i++) campGaugeAnim(A, [4, 2, 2], 50); const end = A.shown[0]; const fl = A.flash[0]; campGaugeAnim(A, [1, 2, 2], 40); const down = A.shown[0]; return { flash0, mid, end, fl, down, still: A.shown[1], seg: [campBarSeg(2.4, 0), campBarSeg(2.4, 2), campBarSeg(2.4, 3)] }; })()`);
  check('a change of pips starts a flash at once; the lit share then eases to the new pips and never past them', a.flash0 === 1 && a.mid > 2 && a.mid < 3.2 && a.end === 4, JSON.stringify(a));
  check('the flash runs out by itself (0.28 s), and a bar that did not change does not move', a.fl === 0 && a.still === 2);
  check('going down eases down too, and a segment is lit by its share: 2.4 lights two segments and 0.4 of the third', a.down < 4 && a.seg[0] === 1 && Math.abs(a.seg[1] - 0.4) < 1e-9 && a.seg[2] === 0, JSON.stringify(a));
}

console.log('F. drawing and the scene');
{
  check('the dials, the hull bar, the ore line and their drawing are gone (card space-game-layout-hud): no campGaugesPaint, campGaugesMake, campGaugesVisible or campDialDraw, and src/campgaugecache.js does not exist; the power list\'s rows still draw a bar of segments (campBarDraw) from campGaugeAnim', ['campGaugesPaint', 'campGaugesMake', 'campGaugesVisible', 'campDialDraw', 'campGaugeCacheBox'].every(f => J(`typeof ${f}`) === 'undefined') && J('typeof campBarDraw') === 'function' && J('typeof campGaugeAnim') === 'function' && !existsSync(ROOT + '/src/campgaugecache.js'));
  const sc = src('src/campaignscene.js'), paint = J(`Campaign.prototype.paintHud.toString()`);
  check('paintHud does not draw the gauges and the lines flow at the top centre (flowHud); the W S E pips, the hull and shield texts and the fixed hull and shield bars are gone', !/campGaugesPaint/.test(paint) && /this\.flowHud\(bar\)/.test(paint) && !/hud\.hull|hud\.shield|hud\.pw|hud\.ps|hud\.pe|CAMP\.hud\.pips|hud\.ore/.test(sc) && !/bar\(252, 36/.test(paint) && !/bar\(24, 36/.test(paint));
  check('the scene makes no gauge texts, and keeps the bars\' animation for the power list\'s rows', !/campGaugesMake|campGaugesVisible|hud\.gauges/.test(sc) && /this\.gaugeAnim = campGaugeAnimNew\(this\.camp\.power\.p\)/.test(sc));
  check('index.html loads src/camphud.js once', src('index.html').split('src/camphud.js').length === 2);
  const fl = J(`(() => { const mk = (t) => { const o = { text: t, y: -1, setY(v) { o.y = v; return o; } }; return o; }; const sc = { camp: { earth: null }, hud: { earth: mk(''), wave: mk('WAVE'), obj: mk('GOAL'), repair: mk(''), post: mk('') }, hudBack: { setSize(w, h) { sc.plate = [w, h]; return sc; } } }; Campaign.prototype.flowHud.call(sc, () => {}); return { ys: Object.keys(sc.hud).map(k => [k, sc.hud[k].y]), plate: sc.plate }; })()`);
  const ys = Object.fromEntries(fl.ys);
  check('flowHud stacks the lines that have words: wave, goal one under another from the top of the lines, the empty ones left where they were, and the plate follows', ys.wave === J('CAMP.hud.text.y') && ys.obj === ys.wave + J('CAMP.hud.text.pitch') && ys.earth === -1 && ys.repair === -1 && ys.post === -1 && fl.plate[0] === J('CAMP.hud.plate.w') && fl.plate[1] >= J('CAMP.hud.plate.min'), JSON.stringify(fl));
}

console.log('\nthe game made ' + (g.errors.length ? 'errors: ' + g.errors.join(' | ') : 'no errors'));
check('the game made no error', g.errors.length === 0);
console.log(failed ? `\nCAMPGAUGES FAIL (${failed} of ${n})` : `\nCAMPGAUGES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
