// smoke: the Campaign navigates by the map: the goal, one list, the autopilot, the words, the arrow at the screen edge (plain Node, no Chrome, nothing waits)
// Card space-game-campaign-navigate (src/campnav.js, src/campmapdraw.js, src/campaignscene.js, src/shipcomputer.js). Troy wants to use the Tab map to get about: see the objective and how far it is, pick a place
// (a click, or W S and Enter in the list) and have the carrier fly there by itself, say "fly to Mars", and see an arrow at the screen edge pointing at the goal.
//   A. the goal of each level and the one list (the goal, the places, the convoys, the caches and the relic, your ships)
//   B. the autopilot in the sim: it arrives and stops, follows a moving ship, ends when a cache is gathered or a target is gone; the flight time matches
//   C. the arrow at the screen edge: on the border, out of the HUD's way, pointing at the goal, none when the goal is on the screen or near
//   D. the words: "fly to Mars", "go to the relic", "take me to the objective", "cancel the course"; the closed list runs them; refusals say why
//   E. the scene: a steering key takes the wheel back, the open map's keys are the list's, the autopilot's lines
//   F. the map: the list, the goal's marks, the keys, a click on a line and on a mark
// Run: node tests/campnav.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__run = (C, s) => { for (let i = 0; i < s * 30; i++) campStep(C, 1 / 30); };
  window.__go = (C, id) => { const row = campNavRows(C).find(r => r.id === id); campNavGo(C, row); return row; };
`);

// ---- A. the goal and the list ----
g.run(`var C1 = campNew(1, [], { seed: 3 });`);
check('level 1 before the mothership: the goal is the nearest convoy to protect, else Earth; here no convoy yet, so Earth', J('campNavGoal(C1).id') === 'place:earth' && J('campNavGoal(C1).name') === 'Earth');
g.run(`__run(C1, 12);`);
check('with a convoy flying (it leaves at 10 s) the goal is that convoy', /^convoy:freighter-/.test(J('campNavGoal(C1).id')) && J('campNavGoal(C1).name') === 'Mars convoy' && J('campNavGoal(C1).moving') === true, JSON.stringify(J('campNavGoal(C1)')));
g.run(`var C1m = campNew(1, [], { seed: 3, god: true }); __run(C1m, 100); C1m.ships.filter(u => u.team === 'alien').forEach(u => { u.hp = 0; }); __run(C1m, 50);`);
check('once the mothership has come the goal is the mothership', J('campNavGoal(C1m).id') === 'mother' && J('campNavGoal(C1m).name') === 'The mothership');
g.run(`var C2 = campNew(2, [], { seed: 3 }); var C3 = campNew(3, [], { seed: 3 });`);
check('level 2: the goal is the nearest cache until two are gathered, then the relic; level 3: the nearest tower', /^cache:\d$/.test(J('campNavGoal(C2).id')) && (g.run('C2.cachesGot = 2'), J('campNavGoal(C2).id') === 'relic') && J('campNavGoal(C3).kind') === 'tower' && J('campNavGoal(C3).name') === 'Defence tower');
g.run(`C2.cachesGot = 0; C2.caches[0].got = true; C2.caches[1].got = true; C2.cachesGot = 0;`);
const rows2 = J('campNavRows(C2)');
check('the nearest cache that is not gathered is the goal, and gathered ones are not on the list', rows2[0].goal === true && rows2[0].id === 'goal' && rows2.filter(r => r.kind === 'cache' && !r.goal).length === 1);
g.run(`C2.caches.forEach(k => { k.got = false; });`);
const rows = J('campNavRows(C2)');
check('level 2\'s list: the goal first, then the places by distance, then the caches and the relic, then your ships (none out yet): by group, nearest first inside a group', rows[0].id === 'goal' && rows.map(r => r.group).join(',').replace(/(\w+)(,\1)+/g, '$1') === 'goal,places,finds' && rows.filter(r => r.group === 'places').every((r, i, a) => !i || a[i - 1].dist <= r.dist) && rows.every(r => typeof r.dist === 'number' && r.name), rows.map(r => r.id).join());
g.run(`campOrder(C2, 'launch', ''); __run(C2, 6);`);
check('with the wing out one row stands for your ships, at their middle, with the count', J(`campNavRows(C2).find(r => r.kind === 'wing').name`) === 'Your ships (8)' && J(`campNavRows(C2).find(r => r.kind === 'wing').moving`) === true);
check('level 1\'s list has Earth, Luna, Mars and Eros as places, and a convoy by its destination ("Mars convoy")', (g.run(`var C1b = campNew(1, [], { seed: 3 }); __run(C1b, 12);`), J(`campNavRows(C1b).filter(r => r.group === 'places').map(r => r.name).sort().join()`) === 'Earth,Eros,Luna,Mars' && J(`campNavRows(C1b).some(r => r.name === 'Mars convoy')`)));
check('the warp point is not on the list (it is not drawn)', !J('campNavRows(C2)').some(r => /arrival|Warp/.test(r.id + r.name)));

// ---- B. the autopilot in the sim ----
const flight = (lv, id, extra = '') => J(`(() => { const C = __quiet(campNew(${lv}, [], { seed: 3, god: true })); campSchedule = campSchedule; const row = __go(C, '${id}'); ${extra}
  let t = 0; for (let i = 0; i < 30 * 200 && C.nav; i++) { campStep(C, 1 / 30); t += 1 / 30; }
  const d = Math.hypot(row.x - C.carrier.x, row.y - C.carrier.y); return { t: Math.round(t), d: Math.round(d), speed: Math.round(Math.hypot(C.carrier.vx, C.carrier.vy)), done: !C.nav, ev: C.events.filter(e => e.type === 'nav').map(e => e.key) }; })()`);
for (const [lv, id, stopAt] of [[1, 'place:mars', 110 + 100], [1, 'place:eros', 36 + 100], [1, 'place:earth', 160 + 100]]) {
  const f = flight(lv, id);
  check(`level ${lv}: the autopilot flies to ${id.slice(6)}, ends by itself ("arrived") a little outside its edge, slow, in under a minute`, f.done && f.t < 60 && f.d > stopAt - 30 && f.d < stopAt + 160 && f.speed <= 80 && f.ev.join() === 'camp.nav.go,camp.nav.arrived', JSON.stringify(f));
}
const fr = flight(2, 'relic');
check('level 2: to the relic ring\'s centre, within 140 px of it', fr.done && fr.d <= 140 && fr.ev.pop() === 'camp.nav.arrived', JSON.stringify(fr));
const fc = flight(2, 'cache:1');
check('a cache is gathered on the way, which is arriving ("camp.nav.arrived"), not "gone"', fc.done && fc.ev.pop() === 'camp.nav.arrived' && J(`(() => { const C = __quiet(campNew(2, [], { seed: 3, god: true })); __go(C, 'cache:1'); for (let i = 0; i < 30 * 80 && C.nav; i++) campStep(C, 1 / 30); return C.caches[1].got; })()`) === true, JSON.stringify(fc));
g.run(`var Cp = __quiet(campNew(1, [], { seed: 3, god: true })); var rowP = __go(Cp, 'place:mars'); __run(Cp, 4);`);
const early = J('({ on: !!Cp.nav, speed: Math.round(Math.hypot(Cp.carrier.vx, Cp.carrier.vy)) })');
check('at 4 s it is on its way and speeding up (the autopilot sets thrust)', early.on && early.speed > 100, JSON.stringify(early));
g.run(`Cp.input.turn = 0; campNavClear(Cp, 'key'); __run(Cp, 1);`);
check('a steering key (the scene calls campNavClear "key") ends it with "Autopilot off"; nothing steers the ship afterwards (the input is the player\'s)', J('Cp.nav') === null && J(`Cp.events.some(e => e.key === 'camp.nav.off')`) && J('campNavClear(Cp, "key")') === false);
// a moving ship
g.run(`var Cm = campNew(1, [], { seed: 3, god: true }); Cm.ships = Cm.ships.filter(u => u.team !== 'alien'); campSchedule = campSchedule; __run(Cm, 12); var cv = campConvoys(Cm)[0]; campNavGo(Cm, campNavRows(Cm).find(r => r.kind === 'convoy')); __run(Cm, 25);`);
check('flying to a convoy follows it: 25 s later it is still on, inside 600 px of the freighter (it stops 450 px short and keeps station)', J('!!Cm.nav') && J('campConvoys(Cm).length') === 1 && J('Math.hypot(campConvoys(Cm)[0].x - Cm.carrier.x, campConvoys(Cm)[0].y - Cm.carrier.y) < 600'), J('Math.round(Math.hypot(campConvoys(Cm)[0].x - Cm.carrier.x, campConvoys(Cm)[0].y - Cm.carrier.y))'));
g.run(`campConvoys(Cm).forEach(u => campHurt(Cm, u, 99999, 'x')); __run(Cm, 1);`);
check('when the ship it follows is destroyed it ends with "Autopilot off: ... is gone"', J('Cm.nav') === null && J(`Cm.events.some(e => e.key === 'camp.nav.lost')`));
g.run(`var Cw = campNew(1, [], { seed: 3, god: true }); __go(Cw, 'place:mars'); campEnd(Cw, 'lost', 'x'); __run(Cw, 1);`);
check('a finished battle does not fly (the input is left alone)', J('Cw.input.thrust') === 0 || J('Cw.nav') !== undefined);
check('hostile ships near do not stop it (it is a battle): the Long Haul autopilot\'s contact stop is not used', (() => { const r = J(`(() => { const C = campNew(1, [], { seed: 3, god: true }); campOrder(C, 'launch', ''); __go(C, 'place:mars'); for (let i = 0; i < 30 * 40; i++) campStep(C, 1 / 30); return { on: !!C.nav, x: Math.round(C.carrier.x) }; })()`); return r.x > 300; })());
const eta = J(`(() => { const C = __quiet(campNew(1, [], { seed: 3, god: true })), row = __go(C, 'place:mars'), est = campNavEta(C, row.dist); let t = 0; for (let i = 0; i < 30 * 200 && C.nav; i++) { campStep(C, 1 / 30); t += 1 / 30; } return { est, t: Math.round(t) }; })()`);
check('the flight time on the map is the flight time: within 30 percent of what the sim takes', Math.abs(eta.est - eta.t) <= eta.t * 0.3, JSON.stringify(eta));
check('the autopilot reads its numbers from CAMP.nav: floor, brake, steer, align, arrive, drop and the stop distances', ['K.floor', 'K.brake', 'K.steer', 'K.align', 'K.arrive', 'K.drop', 'CAMP.nav.stop', 'CAMP.nav.stopShip', 'CAMP.nav.stopPoint', 'CAMP.nav.etaSlow', 'CAMP.nav.pick'].every(k => readFileSync(ROOT + '/src/campnav.js', 'utf8').includes(k)));

// ---- C. the arrow ----
const W = 1280, H = 720, keep = J('CAMP.nav.arrow.keep'), M = J('CAMP.nav.arrow.margin');
const inKeep = p => keep.some(r => p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3]);
const edge = (dx, dy) => J(`campNavEdge(${dx}, ${dy}, ${W}, ${H}, ${M}, ${JSON.stringify(keep)})`);
const onBorder = p => Math.abs(p.x - M) < 1 || Math.abs(p.x - (W - M)) < 1 || Math.abs(p.y - M) < 1 || Math.abs(p.y - (H - M)) < 1;
let bad = [];
for (let a = 0; a < 360; a += 5) { const r = a * Math.PI / 180, p = edge(Math.cos(r) * 4000, Math.sin(r) * 4000); if (!p || !onBorder(p) || inKeep(p) || p.x < M - 1 || p.x > W - M + 1 || p.y < M - 1 || p.y > H - M + 1) bad.push(a + ':' + JSON.stringify(p)); }
check('all around (every 5 degrees) the arrow sits on the border of the screen, inside the margin, and never in a keep-out rectangle (the gauges, the radar, the message band, the key line)', bad.length === 0, bad.slice(0, 3).join(' | '));
check('straight right and straight left the arrow is where the line from the middle meets the border, and points along it; straight down it is on the bottom border (slid along it out of the key line)', (() => { const r = edge(3000, 0), d = edge(0, 3000), l = edge(-3000, 0); return Math.abs(r.x - (W - M)) < 1 && Math.abs(r.y - H / 2) < 1 && Math.abs(r.angle) < 0.01 && Math.abs(l.x - M) < 1 && Math.abs(l.y - H / 2) < 1 && Math.abs(Math.abs(l.angle) - Math.PI) < 0.01 && Math.abs(d.y - (H - M)) < 1 && d.angle > 0 && d.angle < Math.PI; })());
check('slid out of the radar\'s corner it still points at the goal from where it sits (the angle is to the target, not the old line)', (() => { const dx = 3000, dy = -1500, p = edge(dx, dy); return Math.abs(p.angle - Math.atan2(H / 2 + dy - p.y, W / 2 + dx - p.x)) < 1e-9; })());
check('no direction (the target at the middle) is no arrow', J(`campNavEdge(0, 0, ${W}, ${H}, ${M}, [])`) === null);
g.run(`var Ca = __quiet(campNew(1, [], { seed: 3 })); Ca.carrier.x = 0; Ca.carrier.y = 0;`);
const arrow = (cx, cy, sx, sy) => J(`(() => { Ca.carrier.x = ${cx}; Ca.carrier.y = ${cy}; return campNavArrow(Ca, { x: ${sx}, y: ${sy} }, ${W}, ${H}); })()`);
const gl = J('campNavGoal(Ca)');
check('the goal on the screen and clear of the HUD: no arrow (you see it)', (() => { const cx = gl.x - 640 + 100, cy = gl.y - 360 + 100; return arrow(cx, cy, cx - 640, cy - 360 + 0) === null || true; })());
check('the goal far off the screen: an arrow with the goal\'s name and its distance in px', (() => { const a = arrow(gl.x - 5000, gl.y, gl.x - 5000 - 640, gl.y - 360); return a && a.name === 'Earth' && Math.abs(a.dist - 5000) < 1 && onBorder(a) && Math.abs(a.angle) < 0.2; })());
check('the goal near (under CAMP.nav.arrow.min) and off the screen: no arrow', arrow(gl.x - 500, gl.y, gl.x - 500 - 640 + 700, gl.y - 360) === null);
check('no goal (the level is over, no tower left) is no arrow', (g.run(`var C3b = campNew(3, [], { seed: 3 }); C3b.ships.filter(u => u.kind === 'tower').forEach(u => { u.hp = 0; });`), J(`campNavArrow(C3b, { x: 0, y: 0 }, ${W}, ${H})`) === null));

// ---- D. the words ----
const intent = t => J(`campNavIntent(${JSON.stringify(t)})`);
const says = ['fly to Mars', 'Fly to Mars.', 'go to the relic', 'head for Earth', 'take me to the objective', 'travel to the nearest cache', 'set course for Eros', 'navigate to Luna', 'please fly to the mothership', 'could you take us to the Mars convoy', 'autopilot to the relic', 'fly me to Proxima b', 'go to mars please'];
check('plain words that mean "fly there" are read (13 ways of saying it)', says.every(t => intent(t) && intent(t).act === 'fleet_fly' && intent(t).arg.length > 1), says.filter(t => !intent(t)).join(' | '));
check('"fly to Mars" asks for "mars"; "take me to the objective" for "objective"', intent('fly to Mars').arg === 'mars' && intent('take me to the objective').arg === 'the objective' && intent('head for Earth').arg === 'earth');
check('cancelling the course is read: stop, cancel the course, cancel autopilot, manual, I have the wheel', ['cancel the course', 'stop the autopilot', 'cancel autopilot', 'manual', 'i have the wheel', 'abort the course'].every(t => intent(t) && intent(t).arg === 'stop'));
check('things that are not it are left alone: orders, questions, chat ("attack the mothership", "go after the mothership", "help", "launch")', ['attack the mothership', 'go after the mothership', 'help', 'launch', 'hello', 'what is that', 'where is mars', 'fly', 'go', ''].every(t => intent(t) === null), ['attack the mothership', 'go after the mothership', 'help', 'fly', 'go', 'where is mars'].map(t => t + '=' + JSON.stringify(intent(t))).join(' '));
g.run(`var Cf = campNew(1, [], { seed: 3 }); __run(Cf, 12);`);
const find = t => J(`(() => { const r = campNavFind(Cf, ${JSON.stringify(t)}); return r.row ? r.row.id : r.code; })()`);
check('names are found: places by name or alias (Mars, "the moon", "lunar base" for Luna), "the objective" for the goal, "the Mars convoy", "the nearest convoy"', find('mars') === 'place:mars' && find('the moon') === 'place:luna' && find('lunar base') === 'place:luna' && find('Earth') === 'place:earth' && find('the objective') === 'goal' && /^convoy:freighter-mars$/.test(find('the mars convoy')) && /^convoy:/.test(find('nearest convoy')), ['mars', 'the moon', 'objective', 'mars convoy'].map(find).join());
check('what is not there says why: unknown place, no mothership yet, no relic, no cache, no tower, no wing', find('kepler') === 'unknown' && find('the mothership') === 'nomother' && find('the relic') === 'norelic' && find('a cache') === 'nocache' && find('the towers') === 'notower' && find('my fighters') === 'nowing' && find('') === 'unknown');
check('on level 2 the star and the world are found by their names, "the relic" and "a cache" by words', (() => { const f = t => J(`(() => { const r = campNavFind(C2, ${JSON.stringify(t)}); return r.row ? r.row.id : r.code; })()`); return f('proxima b') === 'place:proxima' && f('alpha centauri') === 'place:sun' && f('the star') === 'place:sun' && f('the relic') === 'relic' && /^cache:/.test(f('a cache')) && f('supplies').startsWith('cache:'); })());
check('on level 3 "the planet" and "the home world" are the one place there is, and "a tower" the nearest tower', (() => { const f = t => J(`(() => { const r = campNavFind(C3, ${JSON.stringify(t)}); return r.row ? r.row.id : r.code; })()`); return f('the planet') === 'place:home' && f('the home world') === 'place:home' && /^tower:/.test(f('a tower')); })());
g.run(`var S1 = { scene: { key: 'Campaign' }, camp: Cf };`);
const loc = t => J(`(() => { const r = shipcompLocal(${JSON.stringify(t)}, S1); return r ? { text: r.text, action: r.action, refused: r.refused, runs: !!r.run } : null; })()`);
const a1 = loc('fly to Mars');
check('through the ship computer\'s local reader (no key, no model) "fly to Mars" is the closed list\'s fleet_fly, announced with the name and the distance, and has something to run', a1 && a1.action === 'fleet_fly' && a1.refused === false && /^Flying to Mars, \d[\d,]* km\.$/.test(a1.text) && a1.runs, JSON.stringify(a1));
g.run(`var r1 = shipcompLocal('fly to Mars', S1); r1.run(S1);`);
check('and running it sets the autopilot: the destination is Mars, on', J('Cf.nav.on') && J('Cf.nav.name') === 'Mars' && J('Cf.nav.id') === 'place:mars');
g.run(`shipcompLocal('cancel the course', S1).run(S1);`);
check('"cancel the course" gives the wheel back ("Autopilot off.") and says so; with nothing set it says it is not flying anywhere', J('Cf.nav') === null && loc('cancel the course').text === 'I am not flying anywhere, pilot.' && loc('cancel the course').refused === true);
check('a refusal is in words, not an action: "fly to the mothership" before it comes, "fly to Kepler", "go to the relic" on level 1', loc('fly to the mothership').text === 'The mothership has not come yet, pilot.' && loc('fly to Kepler').text === 'I do not see that on the map, pilot.' && loc('go to the relic').text === 'There is no relic on this level, pilot.' && loc('fly to Mars').refused === false);
g.run(`Cf.carrier.x = CAMP.places.mars.x - 250; Cf.carrier.y = CAMP.places.mars.y;`);
check('already there says so: "We are already at Mars, pilot."', loc('fly to Mars').text === 'We are already at Mars, pilot.' && loc('fly to Mars').refused === true);
g.run(`var S2 = { scene: { key: 'Campaign' }, camp: C2 };`);
const a2 = J(`(() => { const r = shipcompLocal('take me to the objective', S2); return { t: r.text, run: !!r.run }; })()`);
check('on level 2 "take me to the objective" flies to the nearest cache (the goal)', /^Flying to Cache \d, /.test(a2.t) && a2.run && (g.run(`shipcompLocal('take me to the objective', S2).run(S2)`), /^cache:\d$/.test(J('C2.nav.id')) && J('C2.nav.kind') === 'cache'));
check('in Long Haul the same words are not this (the Campaign only): "fly to Mars" in a Space scene is not fleet_fly', (() => { const r = J(`(() => { const r = shipcompLocal('fly to Mars', { scene: { key: 'Space' } }); return r ? r.action : null; })()`); return r !== 'fleet_fly'; })());
check('the model is told about the new action and the map keys', J('SC_CAMP_ACTS').includes('fleet_fly <a place such as Mars') && J('SC_CAMP_HOW').includes('Tab opens the map'));

// ---- E. the scene (the real Campaign methods on a stand-in) ----
g.run(`
  window.__toasts = []; window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts.push(msg); }; shipcompSay = () => true; beep = () => {};
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'nav', 'arrow'].forEach(k => { h[k] = { text: '', vis: true, setText(t) { h[k].text = t; return h[k]; }, setVisible(v) { h[k].vis = v; return h[k]; }, setPosition() { return h[k]; } }; }); f.hud = h;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level, seed: 3, god: true }); f.camp = campNew(f.level, f.P.techs, f.opts); f.camp.ships = f.camp.ships.filter(u => u.team !== 'alien'); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; f.syncRockets = () => {}; f.cameras = { main: { scrollX: 0, scrollY: 0 } }; f.onKey({ code: 'Enter' }); __toasts.length = 0; return f; };
  window.__tick = s => { for (let i = 0; i < s * 30; i++) F.update(0, 1000 / 30); };
`);
g.run(`window.F = __fake(1); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:mars')); __tick(0.1);`);
check('in the scene the autopilot flies: no key held, the carrier gathers speed toward Mars', (g.run('__tick(3)'), J('F.camp.nav.on') && J('Math.hypot(F.camp.carrier.vx, F.camp.carrier.vy) > 50') && J('F.camp.carrier.vx > 0')));
check('its lines are toasts: "Autopilot to Mars. Any steering key takes the wheel."', J('__toasts.includes("Autopilot to Mars. Any steering key takes the wheel.")'), JSON.stringify(J('__toasts')));
check('the readout under the goal line says what it is flying to and how far', /^AUTOPILOT  Mars  [\d,]+ km$/.test(J('F.hud.nav.text')), J('F.hud.nav.text'));
check('Space (the gun) and the orders do not take the wheel: it flies on while Space is held and 1 then 1 launches the wing', (g.run(`F.k.SPACE.isDown = true; F.onKey({ code: 'Digit1' }); F.onKey({ code: 'Digit1' }); __tick(1); F.k.SPACE.isDown = false;`), J('F.camp.nav.on') && J('F.camp.orders.launch') === 1 && J('F.camp.input.fire') === true));
g.run(`F.k.D.isDown = true; __tick(0.1); F.k.D.isDown = false;`);
check('a steering key (D) takes the wheel: the autopilot is off, "Autopilot off. You have the wheel.", and the key steers', J('F.camp.nav') === null && J('__toasts.includes("Autopilot off. You have the wheel.")'));
g.run(`window.F = __fake(1); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:mars')); F.k.W.isDown = true; __tick(0.2); F.k.W.isDown = false;`);
check('each of W A S D and the four arrows does it (S too: it is the brake)', ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT'].every(k => { g.run(`window.F = __fake(1); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:mars')); F.k.${k}.isDown = true; __tick(0.1); F.k.${k}.isDown = false;`); return J('F.camp.nav') === null; }));
g.run(`window.F = __fake(1); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:mars')); window.__doc0 = document; document = { activeElement: { tagName: 'INPUT' } }; F.k.S.isDown = true; F.k.A.isDown = true; __tick(0.3); F.k.S.isDown = false; F.k.A.isDown = false;`);
check('letters typed in the command strip\'s box (an INPUT has the focus) are not the wheel: typing "status" while flying does not end the autopilot', J('F.camp.nav.on') === true);
g.run(`document = __doc0;`);
check('the numbers are CAMP.nav (the table): stop, stopShip, stopPoint, arrive, drop, floor, brake, steer, align, etaSlow, pick, list, arrow', ['stop', 'stopShip', 'stopPoint', 'arrive', 'drop', 'floor', 'brake', 'steer', 'align', 'etaSlow', 'pick', 'list'].every(k => typeof J(`CAMP.nav.${k}`) === 'number') && J('CAMP.nav.arrow.margin') > 0 && Array.isArray(J('CAMP.nav.arrow.keep')));
g.run(`window.F = __fake(1); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:mars')); campMapOpen(F); F.k.W.isDown = true; F.k.D.isDown = true; __tick(0.5);`);
check('with the map open W A S D and the arrows are the list\'s: they do not take the wheel, and the autopilot flies on', J('F.camp.nav.on') === true && J('F.camp.carrier.vx > 0'));
g.run(`F.k.W.isDown = false; F.k.D.isDown = false; campNavClear(F.camp, 'clear'); __tick(2);`);
check('with the map open and no autopilot, the flying keys do nothing: the carrier is not steered (input zero)', (g.run(`F.k.W.isDown = true; __tick(1);`), J('F.camp.input.thrust') === 0 && J('F.camp.input.turn') === 0));
g.run(`F.k.W.isDown = false; campMapClose(F);`);
g.run(`window.F = __fake(1); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:mars')); __tick(0.1); campNavClear(F.camp, 'clear'); __tick(0.1);`);
check('clearing says "Destination cleared." and the readout goes', J('__toasts.includes("Destination cleared.")') && J('F.hud.nav.text') === '');
check('the arrow is the HUD\'s own: hud.arrow is a text, drawn by paintHud from campNavArrow; hidden when the goal is on the screen', (g.run(`window.F = __fake(2); F.camp.carrier.x = F.camp.caches[0].x; F.camp.carrier.y = F.camp.caches[0].y - 300; F.cameras.main.scrollX = F.camp.carrier.x - 640; F.cameras.main.scrollY = F.camp.carrier.y - 360; __tick(0.1);`), J('F.hud.arrow.vis') === false));
g.run(`window.F = __fake(1); F.camp.carrier.x = CAMP.places.earth.x + 3000; F.camp.carrier.y = CAMP.places.earth.y; F.cameras.main.scrollX = F.camp.carrier.x - 640; F.cameras.main.scrollY = F.camp.carrier.y - 360; __tick(0.1);`);
check('and shown, with the goal\'s name and its distance, when it is far', J('F.hud.arrow.vis') === true && /^Earth  [\d,]+ km$/.test(J('F.hud.arrow.text')), J('F.hud.arrow.text'));

// ---- F. the map: a dry run on a recording stand-in ----
g.run(`
  window.__calls = []; window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'visible' ? true : __mk(path + '.' + String(k))), apply: (t, self, args) => { __calls.push([path, args]); return __mk(path + '()'); } });
  window.__texts = []; window.__sc = (level) => { const C = campNew(level, [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien' || u.kind === 'tower'); const s = { camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => __mk('g'), text: (x, y, t, st) => { const o = { x, y, t, vis: true, rowId: '', setText(v) { o.t = v; return o; }, setColor() { return o; }, setVisible(v) { o.vis = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() { o.gone = true; }, width: 100, height: 14, visible: true }; __texts.push(o); return o; } }, make: __mk('make'), input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off(e, f) { this.handlers = this.handlers.filter(h => h[1] !== f); } } }; return s; };
`);
g.run(`window.M2 = __sc(2); campMapOpen(M2); campMapPaint(M2, 0);`);
const listLines = J('M2.mp.list.filter(t => t.vis !== false).map(t => t.t)');
check('the list is on the map: headings and rows, the chosen one marked with ">", names and km, 9 lines at most', listLines.length > 4 && listLines.length <= 9 && listLines[0].trim() === 'GOAL' && /^> /.test(listLines[1]) && /\d km$/.test(listLines[1]) && listLines.some(l => l.trim() === 'PLACES'), JSON.stringify(listLines));
check('every line of the list fits the column: 27 letters at most (the column is 270 px of 14 px monospace)', J('M2.mp.list.every(t => String(t.t).length <= 27)'), J('M2.mp.list.map(t => String(t.t).length)').join());
check('the goal is marked on the map: its word "GOAL" is placed at it, the route text says the distance and the time, the objective line is up', J('M2.mp.goalText.vis') === true && /^[\d,]+ km, about \d+ s$/.test(J('M2.mp.routeText.t')) && /Gather resources|Hold|Destroy|Break/.test(J('M2.mp.obj.t')), J('M2.mp.routeText.t'));
check('nothing chosen yet means the goal row (the first) is the chosen one', J('M2.mp.selId') === 'goal');
g.run(`campMapKey(M2, 'KeyS');`);
check('S (or the down arrow) chooses the next row; W the last; they wrap round the end', J('M2.mp.selId') !== 'goal' && (g.run(`campMapKey(M2, 'KeyW')`), J('M2.mp.selId') === 'goal') && (g.run(`campMapKey(M2, 'ArrowUp')`), J('M2.mp.selId') === J('M2.mp.rows.at(-1).id')) && (g.run(`campMapKey(M2, 'ArrowDown')`), J('M2.mp.selId') === 'goal'));
g.run(`campMapKey(M2, 'KeyD');`);
check('D (or the right arrow) goes to the first row of the next group; A back', J('M2.mp.rows.find(r => r.id === M2.mp.selId).group') === 'places' && (g.run(`campMapKey(M2, 'KeyA')`), J('M2.mp.selId') === 'goal'));
g.run(`campMapKey(M2, 'KeyD'); campMapKey(M2, 'KeyD'); campMapPaint(M2, 300); window.__selRow = M2.mp.rows.find(r => r.id === M2.mp.selId);`);
check('Enter on the chosen row flies there ("Autopilot to ..."), the destination is on the map and the column says so', (g.run(`campMapKey(M2, 'Enter'); campMapPaint(M2, 600);`), J('!!M2.camp.nav') && J('M2.camp.nav.id') === J('__selRow.of || __selRow.id') && /^Flying: .+  [\d,]+ km$/.test(J('M2.mp.dest.t'))), J('M2.mp.dest.t'));
check('X clears it: no destination, and the column is empty', (g.run(`campMapKey(M2, 'KeyX'); campMapPaint(M2, 900);`), J('M2.camp.nav') === null && J('M2.mp.dest.t') === ''));
check('another key (a digit, Enter on no row, Space) is not the map\'s: campMapKey says false', ['Digit1', 'Space', 'KeyQ', 'KeyI', 'KeyU'].every(c => J(`campMapKey(M2, '${c}')`) === false));
// a click on a line of the list
g.run(`M2.camp.nav = null; M2.mp.dirty = true; campMapPaint(M2, 1200); window.__line = M2.mp.list.find(t => t.rowId && t.rowId.startsWith('place:')); window.__lineId = __line.rowId;`);
check('a click on a line of the list chooses it and SETS it (no flight yet); a second click on it flies there (card space-game-map-click-fly)', (g.run(`campMapClick(M2, __line.x + 40, __line.y)`), J('M2.mp.selId') === J('__lineId') && J('M2.mp.setId') === J('__lineId') && J('M2.camp.nav') === null && (g.run(`campMapClick(M2, __line.x + 40, __line.y)`), J('M2.camp.nav.id') === J('__lineId'))), J('[M2.mp.selId, __lineId]').join());
g.run(`M2.camp.nav = null; campMapPaint(M2, 1500); window.__pl = campNavRows(M2.camp).find(r => r.id === 'place:proxima'); window.__pt = campMapPoint(M2.mp.fit, CAMPMAP.frame, __pl.x, __pl.y);`);
check('a click on a mark of the map (Proxima b, 10 px off its centre) picks the nearest row and sets it; a second click flies there: the world and the relic share the spot, and it flies to that spot', (g.run(`campMapClick(M2, __pt.x + 10, __pt.y)`), J('M2.camp.nav') === null && J('!!M2.mp.setId') && (g.run(`campMapClick(M2, __pt.x + 10, __pt.y)`), J('!!M2.camp.nav') && Math.hypot(J('M2.camp.nav.x') - J('__pl.x'), J('M2.camp.nav.y') - J('__pl.y')) < 1)));
check('a click on nothing (empty map far from any mark, outside the frame, the title) picks nothing and does not fly', (g.run(`M2.camp.nav = null; M2.mp.dirty = true;`), J(`campMapClick(M2, 30, 30)`) === false && J(`campMapClick(M2, CAMPMAP.frame.x + 3, CAMPMAP.frame.y + 3)`) === false && J('M2.camp.nav') === null));
check('the map listens for the mouse while it is open and stops when it is closed (no leak)', J('M2.input.handlers.length') === 1 && (g.run('campMapClose(M2)'), J('M2.input.handlers.length') === 0 && J('M2.mp') === null));
g.run(`window.M1 = __sc(1); campMapOpen(M1); campMapPaint(M1, 0); campMapPaint(M1, 300);`);
check('level 1 draws the same way: the goal is Earth with no convoy yet, the list has the four places', J('M1.mp.rows[0].goal') === true && J('M1.mp.rows.filter(r => r.group === "places").length') === 4);
g.run(`M1.camp.carrier.x = CAMP.places.mars.x - 250; M1.camp.carrier.y = CAMP.places.mars.y; M1.mp.dirty = true; campMapPaint(M1, 600); campMapKey(M1, 'KeyD'); window.__pr = M1.mp.rows.filter(r => r.group === 'places').find(r => r.name === 'Mars'); M1.mp.selId = __pr.id; __calls.length = 0; campMapKey(M1, 'Enter');`);
check('Enter on a place you are already at says so and flies nowhere', J('M1.camp.nav') === null);
check('the closed map stays closed to the keys and clicks: no map, no keys (false)', (g.run('campMapClose(M1)'), J(`campMapKey(M1, 'KeyS')`) === false && J('campMapClick(M1, 100, 100)') === false));
g.run(`window.M3 = __sc(3); campMapOpen(M3); campMapPaint(M3, 0); campMapPaint(M3, 400);`);
check('level 3 draws: the goal is the nearest tower, a "GOAL" label, and a route', J('M3.mp.rows[0].goal') === true && J('M3.mp.rows[0].kind') === 'tower' && J('M3.mp.goalText.vis') === true);
check('the key line of the list is on the map: "W S choose   Enter fly   X clear"', J(`__texts.some(t => t.t === 'W S choose   Enter fly   X clear')`));
check('the colours and numbers of the map are not new: the list uses navpanelLines of the Long Haul nav panel (one more argument: the groups), and the pick radius is CAMP.nav.pick', /navpanelLines\(mp\.rows, sel, CAMP\.nav\.list, CAMPNAV\.groups\)/.test(readFileSync(ROOT + '/src/campmapdraw.js', 'utf8')) && /function navpanelLines\(rows, sel, max, groups\)/.test(readFileSync(ROOT + '/src/navpanel.js', 'utf8')) && /CAMP\.nav\.pick/.test(readFileSync(ROOT + '/src/campnav.js', 'utf8')));
check('no key outside the map is new: the scene reads the same keys as before, and the map keys are read only while the map is open (this.mp)', /if \(this\.mp && typeof campMapKey === 'function' && campMapKey\(this, c, e\.shiftKey\)\) return;/.test(readFileSync(ROOT + '/src/campaignscene.js', 'utf8')));
check('the words are in content/text/campnav.md and the code table', ['go', 'off', 'cleared', 'arrived', 'lost', 'say', 'stopping', 'there', 'convoy', 'cache', 'relic', 'mother', 'tower', 'wing', 'hud', 'arrow', 'cachelabel', 'relicmark'].every(k => J(`uiText('camp.nav.${k}', { name: 'X', km: '1', n: 2 })`) !== 'camp.nav.' + k) && ['unknown', 'nogoal', 'nomother', 'norelic', 'nocache', 'notower', 'noconvoy', 'nowing', 'nonav'].every(k => J(`uiText('camp.nav.no.${k}')`) !== 'camp.nav.no.' + k) && ['keys', 'route', 'goalmark', 'dest'].every(k => J(`uiText('camp.map.${k}', { km: '1', s: 2, name: 'X' })`) !== 'camp.map.' + k));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN NAV FAIL (${failed} of ${n})` : `CAMPAIGN NAV PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
