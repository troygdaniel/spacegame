// smoke: the flown fighter's AUTO-TARGET (card space-game-fly-fighter-aim-help; Troy, 26 Nov 2026 evening): the gun finds a hostile within the cone and in reach and sends each shot along the lead point to it, a helped shot does aimK of the damage, the cone 0 is the gun of before, the cone is an N-panel row, and the ace bot gets the same help a human would (plain Node, no Chrome)
// The rule is src/campcockpitaim.js (campCockpitLead, campCockpitAimPick, campCockpitAim), called every tick by campCockpitStep (src/campcockpit.js); its numbers are CAMP.cockpit aimCone (20 degrees), aimReach, aimAhead, aimK (0.32), aimOn, aimMark.
//   A  the table and the N panel's rows: the cone slider 0 to 30 degrees, the price row; they read and write the table
//   B  the lead: where a moving ship and the shot meet (a shot flown to the end meets it), the fighter's own speed counts, too far or no root: where the ship is
//   C  the pick: in the cone and in reach; the picked target first, then the one the guns hold, else the nearest; nothing outside the cone, out of reach, dead or unseen; the cone 0 looks (aimMark) but sends nothing
//   D  the shot: along the lead point when helped, at aimK of the damage; straight and at the plain damage with the cone 0, outside the cone or with nothing in it; the pilots' guns and the cruiser's turrets are as they were
//   E  a run: a crossing target the nose is 14 degrees behind: helped shots hit, the same with the cone 0 do not
//   F  the ace bot: it gets the same help (its hit rate goes up at least twice) and the damage it deals a second of fire stays near what it was (the table's aimK)
// Run: node tests/campcockpitaim.mjs   (exit code 1 on a failed check)
import { run, techsFor, botGame } from '../tools/campaign-bot.mjs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const near = (a, b, e) => Math.abs(a - b) <= e;
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`{
  window.__reset = () => { Object.assign(CAMP.cockpit, { hpK: 2, damageK: 0.5, rateK: 3, turrets: 'auto', aimCone: 20, aimReach: 0.85, aimAhead: 1, aimK: 0.32, aimOn: 4, aimMark: 30 }); };
  // a flown fighter alone with the hostiles it is given: the others of the wing are put far away, the aliens of the mission removed, the cruiser's turrets off
  window.__mk = () => { __reset(); const C = window.C = campNew(1, [], { seed: 3 }); CAMP.flags.cockpit = true; CAMP.cockpit.turrets = 'off'; for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.by = {}; C.ships.forEach(u => { C.by[u.id] = u; }); C.waves.forEach(w => { w.started = true; });
    const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); campCockpitTake(C, f.id); f.x = 0; f.y = 0; f.vx = 0; f.vy = 0; f.rot = 0; C.carrier.x = -9000; C.carrier.y = 0; window.__f = f; return C; };
  window.__foe = (x, y, vx, vy, kind) => { const u = campSpawn(C, kind || 'raider', x, y); u.vx = vx || 0; u.vy = vy || 0; u.hp = u.maxHp = 1e6; u.hold = true; u.run = null; return u; }; // (parked in place: it does not steer; hold keeps the AI off it)
  window.__sees = () => { window.__seen0 = typeof campSeen === 'function' ? campSeen : null; campSeen = () => true; };
  window.__tick = (n) => { for (let i = 0; i < n; i++) campStep(C, 1 / 30); };
  window.__shots = () => C.bullets.filter(b => b.team === 'earth' && b.from === __f.id);
}`);

console.log('A. the table and the N panel');
{
  g.run(`__reset();`);
  check('the cone is 20 degrees, the price aimK 0.32, the reach 0.85 of a shot\'s flight, the lead 1, the lit nose 4 degrees, the marker looks 30 degrees when the cone is 0', J('[CAMP.cockpit.aimCone, CAMP.cockpit.aimK, CAMP.cockpit.aimReach, CAMP.cockpit.aimAhead, CAMP.cockpit.aimOn, CAMP.cockpit.aimMark]').join() === '20,0.32,0.85,1,4,30');
  check('the gun\'s own numbers are as they were: damageK 0.5, rateK 3 (the price is on top of them, not instead)', J('[CAMP.cockpit.damageK, CAMP.cockpit.rateK]').join() === '0.5,3');
  const row = J('campTuneRow("cockpitaim")'), rowk = J('campTuneRow("cockpitaimk")');
  check('the N panel has the cone row: the group of the flown fighter, CAMP.cockpit.aimCone, 0 to 30 in steps of 1, in degrees, felt at once', row && row.group === 'cockpit' && row.path === 'cockpit.aimCone' && row.min === 0 && row.max === 30 && row.step === 1 && row.unit === 'deg' && row.when === 'now', JSON.stringify(row));
  check('and the price row: CAMP.cockpit.aimK, times', rowk && rowk.group === 'cockpit' && rowk.path === 'cockpit.aimK' && rowk.unit === 'x' && rowk.when === 'now', JSON.stringify(rowk));
  g.run(`campTuneSet('cockpitaim', 12);`);
  check('the slider writes the table (12), clamps to 30 and to 0, and resets to 20', J('CAMP.cockpit.aimCone') === 12 && (g.run(`campTuneSet('cockpitaim', 99);`), J('CAMP.cockpit.aimCone')) === 30 && (g.run(`campTuneSet('cockpitaim', -5);`), J('CAMP.cockpit.aimCone')) === 0 && (g.run(`campTuneReset('cockpitaim');`), J('CAMP.cockpit.aimCone')) === 20);
  check('both rows have their words (the panel shows them)', J('uiText("camp.ui.tune.row.cockpitaim")').indexOf('Auto-target') === 0 && J('uiText("camp.ui.tune.row.cockpitaimk")').indexOf('Auto-target') === 0);
  g.run(`campTuneResetAll();`);
}

console.log('B. the lead');
{
  g.run(`__mk(); __sees();`);
  const stat = J('(() => { const u = __foe(600, 0, 0, 0); const L = campCockpitLead(C, __f, u); return [L.rot, L.t, L.x, L.y]; })()');
  check('a ship at rest: the shot goes where it is (angle 0) and the lead point is the ship\'s own place', near(stat[0], 0, 1e-9) && stat[2] === 600 && stat[3] === 0, JSON.stringify(stat));
  g.run(`__mk(); __sees(); window.__u = __foe(600, 0, 0, 300);`);
  const L = J('campCockpitLead(C, __f, __u)');
  check('a ship crossing at 300 px/s: the angle is toward where it will be, not where it is (it moves +y, so the angle is above 0)', L.rot > 0.2 && L.rot < 0.9 && L.t > 0.3 && L.t < 1.5, JSON.stringify(L));
  // fly a real shot along it: at the time of the meeting the shot and the ship are in the same place (to a few px)
  const meet = J(`(() => { const b = campBullet(C, __f, campCockpitLead(C, __f, __u).rot, CAMP.fighter.bullet * C.shot, 1, 1400, 'earth', 0); const t = campCockpitLead(C, __f, __u).t; return { bx: b.x + b.vx * t, by: b.y + b.vy * t, ux: __u.x + __u.vx * t, uy: __u.y + __u.vy * t, t }; })()`);
  check('the shot and the ship meet: after the time the lead names they are within 2 px of each other', Math.hypot(meet.bx - meet.ux, meet.by - meet.uy) < 2, JSON.stringify(meet));
  g.run(`__mk(); __sees(); window.__u = __foe(600, 0, 0, 300); __f.vx = 0; __f.vy = 240;`);
  const own = J(`(() => { const L = campCockpitLead(C, __f, __u); const b = campBullet(C, __f, L.rot, CAMP.fighter.bullet * C.shot, 1, 1400, 'earth', 0); return { d: Math.hypot(b.x + b.vx * L.t - (__u.x + __u.vx * L.t), b.y + b.vy * L.t - (__u.y + __u.vy * L.t)), rot: L.rot }; })()`);
  check('the fighter\'s own speed counts (a shot keeps campDrift of it): moving, the shot still meets the ship', own.d < 2, JSON.stringify(own));
  g.run(`__mk(); __sees(); window.__u = __foe(600, 0, 0, 300); CAMP.cockpit.aimAhead = 0;`);
  check('aimAhead 0 is no lead: the angle to where it is now, though it crosses at 300 px/s', near(J('campCockpitLead(C, __f, __u).rot'), 0, 1e-9) && J('campCockpitLead(C, __f, __u).t') === 0);
  g.run(`__mk(); __sees(); window.__u = __foe(600, 0, 0, 900);`);
  check('a ship crossing faster than the shot (900 against 700) cannot be met: the angle to where it is, no time', near(J('campCockpitLead(C, __f, __u).rot'), 0, 1e-9) && J('campCockpitLead(C, __f, __u).t') === 0, J('campCockpitLead(C, __f, __u)'));
  g.run(`__mk(); __sees(); window.__u = __foe(600, 0, 2000, 0);`);
  check('a ship running away along the line far faster than the shot: the angle to where it is', near(J('campCockpitLead(C, __f, __u).rot'), 0, 1e-9) && J('campCockpitLead(C, __f, __u).t') === 0);
}

console.log('C. the pick');
{
  g.run(`__mk(); __sees(); window.__a = __foe(500, 0, 0, 0); window.__b = __foe(300, 40, 0, 0); window.__c = __foe(700, -10, 0, 0);`);
  check('three hostiles in the cone: the nearest (b, 300 px) is tracked', J('campCockpitAim(C).id') === J('__b.id'));
  g.run(`campTgtHold(C, __c.id);`);
  check('the one the ] key picked (c, the farthest) is tracked while it is in the cone and in reach', J('campCockpitAim(C).id') === J('__c.id'), J('[C.tgt, campCockpitAim(C).id]'));
  g.run(`campTgtClear(C); C.cockpit.aim = null; campCockpitAim(C); window.__held = C.cockpit.aim.id; __b.x = 800; __b.y = 0;`);
  check('with nothing picked the nearest is tracked (b) and the guns HOLD it while it stays in the cone and in reach, though a (500 px) is now nearer', J('__held') === J('__b.id') && J('campCockpitAim(C).id') === J('__b.id') && J('campDist(__f, __a) < campDist(__f, __b)') === true, J('[__held, campCockpitAim(C).id]'));
  g.run(`__b.y = 900;`);
  check('and when it leaves the cone they take the nearest again (a)', J('campCockpitAim(C).id') === J('__a.id'));
  g.run(`__mk(); __sees(); window.__a = __foe(500, 400, 0, 0);`);
  check('a hostile 39 degrees off the nose is outside the 20 degrees: nothing tracked', J('campCockpitAim(C)') === null);
  g.run(`__mk(); __sees(); window.__a = __foe(500, 170, 0, 0);`);
  check('one 18.8 degrees off is inside it', J('campCockpitAim(C) && campCockpitAim(C).id') === J('__a.id'));
  g.run(`CAMP.cockpit.aimCone = 15;`);
  check('the slider narrows it: the same hostile at 18.8 degrees is outside a 15 degree cone', J('campCockpitAim(C)') === null);
  g.run(`__mk(); __sees(); window.__a = __foe(CAMP.fighter.bullet * 1.4 * 0.85 + 100, 0, 0, 0);`);
  check('out of reach (past 0.85 of the shot\'s flight, about 833 px at the pace of 1) nothing is tracked', J('campCockpitAim(C)') === null && J('campCockpitAimReach(C)') > 700 && J('campCockpitAimReach(C)') < 1000, J('campCockpitAimReach(C)'));
  g.run(`__mk(); __sees(); window.__a = __foe(400, 0, 0, 0); __a.hp = 0;`);
  check('a dead hostile is not tracked', J('campCockpitAim(C)') === null);
  g.run(`__mk(); __sees(); campSeen = () => false; window.__a = __foe(400, 0, 0, 0);`);
  check('a hostile the sensors have not seen is not tracked (the guns do not know it)', J('campCockpitAim(C)') === null);
  g.run(`__mk(); __sees(); window.__a = __foe(400, 0, 0, 0); window.__e = campSpawn(C, 'skiff', 300, 0); __e.team = 'earth';`);
  check('a ship of your own side is never tracked', J('campCockpitAim(C).id') === J('__a.id'));
  g.run(`__mk(); __sees(); CAMP.cockpit.aimCone = 0; window.__a = __foe(400, 100, 0, 0);`);
  const mark = J('(() => { const A = campCockpitAim(C); return A && { id: A.id, steer: A.steer }; })()');
  check('the cone 0: the marker still looks (aimMark 30 degrees: a hostile 14 degrees off) but nothing steers', mark && mark.id === J('__a.id') && mark.steer === false, JSON.stringify(mark));
  g.run(`__mk(); __sees(); window.__a = __foe(400, 0, 0, 0);`);
  check('no stick, no aim: C.cockpit is null and the rule answers null', (g.run(`campCockpitGive(C, 'hand');`), J('campCockpitAim(C)')) === null);
}

console.log('D. the shot');
{
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 300); C.cockpit.input.fire = true; __tick(1);`);
  const s = J('(() => { const b = __shots()[0]; const L = campCockpitLead(C, __f, __a); return b && { rot: b.rot, dmg: b.dmg, lead: L.rot, nose: __f.rot }; })()');
  check('the nose is straight and the hostile crosses: the first shot leaves along the lead point (not along the nose)', s && s.nose === 0 && s.rot > 0.15 && near(s.rot, s.lead, 0.03), JSON.stringify(s));
  const F = J('CAMP.fighter.damage'), str = J('__f.str || 1');
  check('and its damage is the pilot\'s times damageK times aimK: 8 * 0.5 * 0.32 = 1.28 (times his strength)', near(s.dmg, F * 0.5 * 0.32 * str, 1e-9), s.dmg);
  g.run(`__mk(); __sees(); CAMP.cockpit.aimCone = 0; window.__a = __foe(600, 0, 0, 300); C.cockpit.input.fire = true; __tick(1);`);
  const s0 = J('(() => { const b = __shots()[0]; return b && { rot: b.rot, dmg: b.dmg }; })()');
  check('the cone 0 is the gun of before: straight along the nose and the plain damage (8 * 0.5)', s0 && near(s0.rot, 0, 1e-9) && near(s0.dmg, F * 0.5 * str, 1e-9), JSON.stringify(s0));
  g.run(`__mk(); __sees(); window.__a = __foe(500, 400, 0, 0); C.cockpit.input.fire = true; __tick(1);`);
  const so = J('(() => { const b = __shots()[0]; return b && { rot: b.rot, dmg: b.dmg }; })()');
  check('a hostile outside the cone: the shot goes straight, at the plain damage', so && near(so.rot, 0, 1e-9) && near(so.dmg, F * 0.5 * str, 1e-9), JSON.stringify(so));
  g.run(`__mk(); __sees(); C.cockpit.input.fire = true; __tick(1);`);
  const sn = J('(() => { const b = __shots()[0]; return b && { rot: b.rot, dmg: b.dmg }; })()');
  check('nothing in the cone: straight, plain damage', sn && near(sn.rot, 0, 1e-9) && near(sn.dmg, F * 0.5 * str, 1e-9), JSON.stringify(sn));
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 300); C.cockpit.input.fire = false; __tick(2);`);
  check('no Space, no shot, though the help has found the hostile (the marker is there)', J('__shots().length') === 0 && J('C.cockpit.aim && C.cockpit.aim.id') === J('__a.id'));
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 100); __a.hold = true; __tick(1);`);
  check('the nose off the lead point (it is about 8 degrees ahead of the ship): the marker is dim; turned onto it (within 4 degrees) it is lit', J('C.cockpit.aim.on') === false && (g.run(`__f.rot = C.cockpit.aim.rot; __tick(1);`), J('C.cockpit.aim && C.cockpit.aim.on')) === true, J('C.cockpit.aim'));
  // the others are as they were
  g.run(`__mk(); __sees(); window.__a = __foe(300, 0, 0, 0); const p = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && !u.cockpit && u.hp > 0); window.__p = p; p.x = 100; p.y = 100; p.rot = 0; C.cockpit.input.fire = true; __tick(30);`);
  const pb = J(`C.bullets.filter(b => b.team === 'earth' && b.from === __p.id).map(b => b.dmg)`);
  check('a pilot\'s own gun is as it was: its shots (if it fired) are the plain 8 times its strength, not the help\'s', pb.every(d => near(d, F * (J('__p.str || 1')), 1e-9)), JSON.stringify(pb));
  check('the cruiser\'s turrets are not the auto-target\'s: campLead (the turrets\') is the function it was and the cruiser\'s shot speed is still read there', J(`campLead.toString().indexOf('pdSpeed') > 0`) === true);
}

console.log('E. a run: the help lands shots a human\'s aim misses');
{
  // damage dealt with aimK 1 (so it counts hits, not the price); the hostile is parked or on a line, and takes no part in the fight but the shots
  const fire = (cone, setup, step) => {
    g.run(`__mk(); __sees(); CAMP.cockpit.aimCone = ${cone}; CAMP.cockpit.aimK = 1; ${setup} C.cockpit.input.fire = true; for (let i = 0; i < 120; i++) { ${step} campStep(C, 1 / 30); } CAMP.cockpit.aimK = 0.3;`);
    return J('1e6 - __a.hp');
  };
  const still = 'window.__a = __foe(520, 0, 0, 0); __a.r = 14;', still_step = '__f.rot = 0.25; __a.x = 520; __a.y = 0; __a.vx = 0; __a.vy = 0;';
  const dOn = fire(20, still, still_step), dOff = fire(0, still, still_step);
  check('a target that sits 14 degrees off the nose: the shots with the cone 0 go past it (no damage), the helped shots go to it (damage)', dOff === 0 && dOn > 0, JSON.stringify([dOn, dOff]));
  const cross = 'window.__a = __foe(520, -200, 0, 250); __a.r = 14;', cross_step = '__a.vx = 0; __a.vy = 250; __a.x = 520; if (__a.y > 200) __a.y = -200; __f.rot = Math.atan2(__a.y - __f.y, __a.x - __f.x);';
  const cOn = fire(20, cross, cross_step), cOff = fire(0, cross, cross_step);
  check('a target crossing at 250 px/s with the nose held on where it is (a human who does not lead): the helped shots land at least three times the damage of the cone 0', cOn > 0 && cOn >= cOff * 3, JSON.stringify([cOn, cOff]));
}

console.log('G. the lead marker (the scene half, with a graphics that writes down what it is told)');
{
  g.run(`window.__mkScene = (zoom) => { const calls = []; const gr = { visible: true, active: true, scene: true, clear() { calls.push(['clear']); return gr; }, setVisible(v) { gr.visible = v; calls.push(['vis', v]); return gr; }, setDepth(d) { gr.depth = d; return gr; }, lineStyle(w, c, a) { calls.push(['line', w, c, a]); return gr; }, strokeCircle(x, y, r) { calls.push(['ring', x, y, r]); return gr; }, fillStyle(c, a) { calls.push(['fill', c, a]); return gr; }, fillCircle(x, y, r) { calls.push(['dot', x, y, r]); return gr; } };
    const sc = { camp: C, cameras: { main: { zoom } }, hud: {}, mode: 'play', mp: false, add: { graphics() { sc.made = (sc.made || 0) + 1; return gr; } } }; window.__calls = calls; window.__gr = gr; return sc; };`);
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 100); __tick(1); window.__S = __mkScene(1); campCockpitAimSync(__S);`);
  const A = J('C.cockpit.aim'), calls = J('__calls');
  const ring = calls.find(c => c[0] === 'ring'), line = calls.find(c => c[0] === 'line');
  check('a ring is drawn at the lead point of the hostile the guns track (not at the ship): its centre is C.cockpit.aim.x, .y, ahead of the ship along its way', ring && near(ring[1], A.x, 1e-6) && near(ring[2], A.y, 1e-6) && A.y > 0 && A.x > 600 - 1, JSON.stringify([ring, A.x, A.y]));
  check('thin (1.5 px on the screen), 10 px across the radius at zoom 1, dim while the nose is off the lead point', line && near(line[1], 1.5, 1e-9) && near(ring[3], 10, 1e-9) && near(line[3], 0.6, 1e-9) && !calls.some(c => c[0] === 'dot'), JSON.stringify(calls));
  const col = line[2], r = (col >> 16) & 255, gg = (col >> 8) & 255, b = col & 255;
  check('in the mint of the player\'s fire: green over red, blue well up, never gold, amber or pink', gg > r && gg > 200 && b > 140 && b < gg, col.toString(16));
  g.run(`__f.rot = C.cockpit.aim.rot; __tick(1); window.__S = __mkScene(1); campCockpitAimSync(__S);`);
  const lit = J('__calls'), ll = lit.find(c => c[0] === 'line');
  check('with the nose on the lead point the ring is bright (alpha 1) and has a dot in it', ll && ll[3] === 1 && lit.some(c => c[0] === 'dot'), JSON.stringify(lit));
  g.run(`window.__S = __mkScene(0.5); campCockpitAimSync(__S);`);
  const far = J('__calls'), fr = far.find(c => c[0] === 'ring'), fl = far.find(c => c[0] === 'line');
  check('zoomed out to 0.5 the ring is the same size on the screen: twice the world radius and line', fr && near(fr[3], 20, 1e-9) && near(fl[1], 3, 1e-9), JSON.stringify(far));
  check('it sits over the ships and under nothing of the HUD: depth 9 (the ships 4 and 5, the wing tag 6, the target\'s square 8)', J('__gr.depth') === 9);
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 100); __tick(1); window.__S = __mkScene(1); campCockpitAimSync(__S); __a.hp = 0; __tick(1); __calls.length = 0; campCockpitAimSync(__S);`);
  check('the hostile dies: nothing is in the cone, and the same scene hides the ring the next frame (cleared, not drawn)', J('C.cockpit.aim') === null && J('__gr.visible') === false && !J('__calls').some(c => c[0] === 'ring') && J('__calls').some(c => c[0] === 'clear'), JSON.stringify(J('__calls')));
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 100); __tick(1); window.__S = __mkScene(1); __S.mode = 'brief'; campCockpitAimSync(__S);`);
  check('outside the flight (a briefing) nothing is drawn', !J('__calls').some(c => c[0] === 'ring'));
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 100); __tick(1); campCockpitGive(C, 'hand'); window.__S = __mkScene(1); campCockpitAimSync(__S);`);
  check('on the cruiser (no stick) nothing is drawn', !J('__calls').some(c => c[0] === 'ring'));
  g.run(`__mk(); __sees(); window.__a = __foe(600, 0, 0, 100); __tick(1); window.__S = __mkScene(1); campCockpitAimSync(__S); campCockpitAimSync(__S);`);
  check('one graphics is made for the scene, and used again every frame', J('__S.made') === 1);
}

console.log('F. the ace bot');
{
  const techs = techsFor(2), seeds = [1, 2, 3, 4, 5, 6];
  const gun = cone => {
    botGame.run(`CAMP.cockpit.aimCone = ${cone};`);
    const rs = seeds.map(s => run(2, s, 'ace', 'steady', techs, 120, 0)), T = { shots: 0, hits: 0, dmg: 0, fire: 0 };
    rs.forEach(r => { T.shots += r.cockShots; T.hits += r.cockHits; T.dmg += r.cockDmg; T.fire += r.cockFire; });
    botGame.run(`CAMP.cockpit.aimCone = 20;`);
    return { hit: T.hits / Math.max(1, T.shots), dpf: T.dmg / Math.max(1, T.fire), won: rs.filter(r => r.result === 'won').length, shots: T.shots };
  };
  const a0 = gun(0), a20 = gun(20);
  check('the bot reports its gun (shots, hits, damage, seconds of fire): it fired and hit in both runs', a0.shots > 200 && a20.shots > 200 && a0.hit > 0 && a20.hit > 0, JSON.stringify([a0, a20]));
  check('the ace gets the same help a human would: its hit rate with the cone 20 is at least twice what it is with the cone 0', a20.hit >= a0.hit * 2, JSON.stringify([a0.hit, a20.hit]));
  check('and the price holds its damage for a second of fire near what it was (within 35 percent here, 6 seeds of one mission; the 32-seed table of every mission is in PROJECT_STATUS.md)', a20.dpf >= a0.dpf * 0.65 && a20.dpf <= a0.dpf * 1.35, JSON.stringify([a0.dpf, a20.dpf]));
  check('the ace still wins what it won', a20.won >= a0.won, JSON.stringify([a0.won, a20.won]));
  g.run('__reset();');
check('the table is as it was after the runs (the cone is 20 in the bot\'s game and in this one, aimK 0.32)', J('CAMP.cockpit.aimCone') === 20 && botGame.run('CAMP.cockpit.aimCone') === 20 && botGame.run('CAMP.cockpit.aimK') === 0.32, botGame.run('CAMP.cockpit.aimCone'));
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('COCKPIT AIM FAIL (' + failed + ')'); process.exit(1); } else console.log('COCKPIT AIM PASS');
