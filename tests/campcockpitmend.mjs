// smoke: the cruiser SLOWLY MENDS the fighter you fly while it is within 700 px of her (card space-game-b12-c8-cruiser-mends-slow; BRIEF 12 chunk 8; Troy, 27 Nov 2026): 2.5 percent of the hull a second, free, off at 0, the N panel's slider, a thin pale-blue tether
// The rule is src/campcockpitmend.js (campCockpitMendRate, campCockpitMendNear, campCockpitMendTick, campCockpitMendSync), called every tick by campCockpitStep (src/campcockpit.js); its number is CAMP.cockpit.mend, its range CAMP.mend.range (700).
//   A  the table and the N panel: the row, its range 0 to 10 in steps of 0.5, its words; it reads and writes the table
//   B  the mend: the pace (a whole hull in 40 s, 2.5 percent a second, on the scaled hull), the range edge (700 in, 701 out), full stops it, free of ore, never over the top, the rate scales it, 0 is off
//   C  who it is for: only the fighter he flies; handed back, lost, or the cruiser lost: no mend; the other ships and the cruiser's own mends are untouched
//   D  inside the real step: campStep with the stick taken mends the fighter beside the cruiser and not the one far from her; the hull handed back keeps the mended share (the hpK ratio both ways)
//   E  the tell: the scene's thin pale-blue tether from the cruiser to the fighter while it mends, still under reduced motion, hidden when it does not
// Run: node tests/campcockpitmend.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const near = (a, b, e) => Math.abs(a - b) <= e;
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`{
  window.__reset = () => { Object.assign(CAMP.cockpit, { hpK: 2, mend: 2.5, turrets: 'off' }); CAMP.mend.range = 700; };
  // a flown fighter alone: the aliens of the mission removed, the cruiser parked d px to its left, the fighter hurt to the share given of its (doubled) hull
  window.__mk = (d, share) => { __reset(); const C = window.C = campNew(1, [], { seed: 3 }); CAMP.flags.cockpit = true; for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.bullets.length = 0;
    const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); f.x = 0; f.y = 0; f.vx = 0; f.vy = 0; f.rot = 0; f.hp = f.maxHp * (share === undefined ? 0.4 : share);
    C.carrier.x = -(d === undefined ? 300 : d); C.carrier.y = 0; C.carrier.vx = 0; C.carrier.vy = 0; window.__f = f; return C; };
  window.__mt = (secs) => { for (let i = 0; i < secs * 30; i++) campCockpitMendTick(C, 1 / 30); };
}`);

console.log('A. the table and the N panel');
{
  g.run(`__reset();`);
  check('the cruiser mends the flown fighter 2.5 percent of its hull a second, within the ordinary mend range of 700 px', J('[CAMP.cockpit.mend, CAMP.mend.range]').join() === '2.5,700');
  const row = J('campTuneRow("cockpitmend")');
  check('the N panel has the row: the group of the flown fighter, CAMP.cockpit.mend, 0 to 10 in steps of 0.5, felt at once', row && row.group === 'cockpit' && row.path === 'cockpit.mend' && row.min === 0 && row.max === 10 && row.step === 0.5 && row.when === 'now', JSON.stringify(row));
  g.run(`campTuneSet('cockpitmend', 4);`);
  check('the slider writes the table (4), clamps to 10 and to 0, and resets to 2.5', J('CAMP.cockpit.mend') === 4 && (g.run(`campTuneSet('cockpitmend', 99);`), J('CAMP.cockpit.mend')) === 10 && (g.run(`campTuneSet('cockpitmend', -5);`), J('CAMP.cockpit.mend')) === 0 && (g.run(`campTuneReset('cockpitmend');`), J('CAMP.cockpit.mend')) === 2.5);
  check('the row has its words (the panel shows them)', J('uiText("camp.ui.tune.row.cockpitmend")').indexOf('Cruiser mends') === 0, J('uiText("camp.ui.tune.row.cockpitmend")'));
  g.run(`campTuneResetAll();`);
}

console.log('B. the mend');
{
  g.run(`__mk(300, 0.4); window.__h0 = __f.hp; window.__ore0 = C.ore; __mt(10);`);
  const gain = J('(__f.hp - __h0) / __f.maxHp');
  check('ten seconds beside the cruiser give 25 percent of the hull (2.5 a second of the doubled 72 points)', near(gain, 0.25, 0.002), gain);
  check('it is free: the cruiser\'s ore is not touched', J('C.ore === __ore0'));
  g.run(`__mk(300, 0.0001); window.__t = 0; while (__f.hp < __f.maxHp - 0.01 && __t < 120) { campCockpitMendTick(C, 1 / 30); __t += 1 / 30; }`);
  check('a hull from nothing is whole in 40 seconds (most of a minute: a trip back, not a heal in a fight)', near(J('__t'), 40, 0.1), J('__t'));
  g.run(`__mt(5);`);
  check('and it never goes over the top', J('__f.hp') <= J('__f.maxHp') + 1e-9 && J('__f.hp') >= J('__f.maxHp') - 0.011);
  check('a whole hull is not being mended (the tell is off)', J('C.cockpit.mending') === 0);
  g.run(`__mk(700, 0.4); window.__h0 = __f.hp; __mt(2);`);
  check('at 700 px, the range, it mends', J('__f.hp > __h0'));
  g.run(`__mk(701, 0.4); window.__h0 = __f.hp; __mt(2);`);
  check('at 701 px it does not, and the tell is off', J('__f.hp === __h0') && J('C.cockpit.mending') === 0);
  g.run(`__mk(300, 0.4); CAMP.mend.range = 250; window.__h0 = __f.hp; __mt(2);`);
  check('the range is the ordinary mend range (CAMP.mend.range): at 250 the fighter 300 px away is out', J('__f.hp === __h0'));
  g.run(`__mk(300, 0.4); CAMP.cockpit.mend = 5; window.__h0 = __f.hp; __mt(10);`);
  check('the slider scales it: at 5 percent ten seconds give half the hull', near(J('(__f.hp - __h0) / __f.maxHp'), 0.5, 0.004));
  g.run(`__mk(300, 0.4); CAMP.cockpit.mend = 0; window.__h0 = __f.hp; __mt(10);`);
  check('at 0 it is off: the hull is as it was and nothing is mending', J('__f.hp === __h0') && J('C.cockpit.mending') === 0);
  g.run(`__mk(300, 0.4); CAMP.cockpit.hpK = 1; campCockpitGive(C, 'hand'); campCockpitTake(C, __f.id); __f.hp = __f.maxHp * 0.4; window.__h0 = __f.hp; __mt(10);`);
  check('the share is of the hull he flies, whatever hpK is: at hpK 1 it is the same 25 percent in ten seconds', near(J('(__f.hp - __h0) / __f.maxHp'), 0.25, 0.002));
}

console.log('C. who it is for');
{
  g.run(`__mk(300, 0.4); window.__o = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.id !== __f.id && u.hp > 0); __o.hp = __o.maxHp * 0.4; window.__oh = __o.hp; window.__c0 = C.carrier.hp = C.carrier.maxHp * 0.5; __mt(10);`);
  check('only the fighter he flies is mended: another pilot\'s fighter, hurt beside it, is not, and the cruiser\'s own hull is not', J('__o.hp === __oh') && J('C.carrier.hp === __c0'));
  g.run(`__mk(300, 0.4); campCockpitGive(C, 'hand'); window.__h0 = __f.hp; __mt(10);`);
  check('handed back (no stick held) it does nothing', J('__f.hp === __h0') && J('C.cockpit') === null);
  g.run(`__mk(300, 0.4); C.carrier.hp = 0; window.__h0 = __f.hp; __mt(5);`);
  check('with the cruiser lost there is nothing to mend him', J('__f.hp === __h0') && J('C.cockpit.mending') === 0);
  g.run(`__mk(300, 0.4); C.result = 'lost'; window.__h0 = __f.hp; __mt(5);`);
  check('after the mission has ended it does nothing', J('__f.hp === __h0'));
  g.run(`__mk(300, 0.4); (C.mends = C.mends || []); window.__n = C.mends.length; __mt(5);`);
  check('it is no ordered mend: C.mends is not touched (the Q list\'s mends, their ore and their words are as they were)', J('C.mends.length === __n'));
}

console.log('D. inside the real step');
{
  g.run(`__mk(300, 0.4); window.__h0 = __f.hp; for (let i = 0; i < 90; i++) campStep(C, 1 / 30);`);
  const gain = J('(__f.hp - __h0) / __f.maxHp');
  check('campStep with the stick taken, three seconds beside the cruiser: the hull climbs by 7.5 percent', near(gain, 0.075, 0.01), gain);
  g.run(`__mk(1500, 0.4); window.__h0 = __f.hp; for (let i = 0; i < 90; i++) campStep(C, 1 / 30);`);
  check('the same fighter 1500 px from her is not mended', J('__f.hp <= __h0 + 1e-9'));
  g.run(`__mk(300, 0.5); window.__sh = __f.hp / __f.maxHp; for (let i = 0; i < 300; i++) campStep(C, 1 / 30); window.__half = __f.hp / __f.maxHp; campCockpitGive(C, 'hand');`);
  const back = J('__f.hp / __f.maxHp');
  check('handed back, the pilot keeps the share it was mended to (taking and giving still do not heal or hurt)', J('__half') > J('__sh') + 0.2 && near(back, J('__half'), 0.001), JSON.stringify([J('__sh'), J('__half'), back]));
}

console.log('E. the tell (the scene half, with a graphics that writes down what it is told)');
{
  g.run(`window.__mkScene = (zoom) => { const calls = []; const gr = { visible: true, active: true, scene: true, clear() { calls.push(['clear']); return gr; }, setVisible(v) { gr.visible = v; calls.push(['vis', v]); return gr; }, setDepth(d) { gr.depth = d; return gr; }, lineStyle(w, c, a) { calls.push(['line', w, c, a]); return gr; }, lineBetween(x1, y1, x2, y2) { calls.push(['between', x1, y1, x2, y2]); return gr; } };
    const sc = { camp: C, cameras: { main: { zoom } }, hud: {}, mode: 'play', mp: false, add: { graphics() { sc.made = (sc.made || 0) + 1; return gr; } } }; window.__calls = calls; window.__gr = gr; return sc; };`);
  g.run(`__mk(300, 0.4); __mt(1); window.__S = __mkScene(1); campCockpitMendSync(__S);`);
  const calls = J('__calls'), line = calls.find(c => c[0] === 'line'), bt = calls.find(c => c[0] === 'between');
  check('while it mends one line is drawn from the cruiser to the fighter', bt && near(bt[1], -300, 1e-6) && near(bt[2], 0, 1e-6) && near(bt[3], J('__f.x'), 1e-6) && near(bt[4], J('__f.y'), 1e-6), JSON.stringify(calls));
  check('thin (1.5 px on the screen) and quiet (alpha under 0.7)', line && near(line[1], 1.5, 1e-9) && line[3] > 0.2 && line[3] < 0.7, JSON.stringify(line));
  const col = line[2], r = (col >> 16) & 255, gg = (col >> 8) & 255, b = col & 255;
  check('pale blue: blue the highest, green over red, never gold, amber, pink or the mint of the fire', b >= gg && gg > r && b > 200 && r > 100, col.toString(16));
  check('under the ships (depth 3: the ships are 4 and 5)', J('__gr.depth') === 3);
  g.run(`window.__S = __mkScene(0.5); campCockpitMendSync(__S);`);
  const far = J('__calls'), fl = far.find(c => c[0] === 'line');
  check('zoomed out to 0.5 the line is the same width on the screen: twice the world width', fl && near(fl[1], 3, 1e-9), JSON.stringify(fl));
  g.run(`__mk(300, 0.4); __mt(1); window.__S = __mkScene(1); campCockpitMendSync(__S); campCockpitMendSync(__S);`);
  check('one graphics is made for the scene, and used again every frame', J('__S.made') === 1);
  g.run(`__mk(300, 1); __mt(1); window.__S = __mkScene(1); campCockpitMendSync(__S);`);
  check('a whole hull draws nothing, and does not even make a graphics', !J('__calls').some(c => c[0] === 'between') && J('__S.made') === null);
  g.run(`__mk(300, 0.4); __mt(1); window.__S = __mkScene(1); campCockpitMendSync(__S); C.cockpit.mending = 0; __calls.length = 0; campCockpitMendSync(__S);`);
  check('when the mend stops (out of range, full, off) the same scene hides the line the next frame (cleared, not drawn)', J('__gr.visible') === false && !J('__calls').some(c => c[0] === 'between') && J('__calls').some(c => c[0] === 'clear'), JSON.stringify(J('__calls')));
  g.run(`__mk(300, 0.4); __mt(1); window.__S = __mkScene(1); __S.mode = 'brief'; campCockpitMendSync(__S);`);
  check('outside the flight (a briefing) nothing is drawn', !J('__calls').some(c => c[0] === 'between'));
  g.run(`__mk(300, 0.4); __mt(1); campCockpitGive(C, 'hand'); window.__S = __mkScene(1); campCockpitMendSync(__S);`);
  check('on the cruiser (no stick) nothing is drawn', !J('__calls').some(c => c[0] === 'between'));
}

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} passed`);
process.exit(failed ? 1 : 0);
