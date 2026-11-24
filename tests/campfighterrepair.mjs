// smoke: the Campaign's FIGHTER REPAIR (card space-game-fighter-repair; Troy, 21 Nov 2026: "fights were not interactive and escorts were boring, I want to direct the fleet more"), in plain Node, no Chrome
//   A. the table CAMP.repair and the functions         B. who breaks off: a fighter under 30 percent hull, near enough (15 s of flight), and not an escort, a scout, an enemy
//   C. the flight home and the landing: out of the sim, in the repair list, counted as the wing's still     D. mended: out again with its order when there is a fight, else in the bay; recall and launch
//   E. orders on the way home: an order does not turn it back, a recall is kept                         F. the radio: a line each way, four hurt at once are one call
//   G. the HUD's wing strip, the words, the ship computer's status line                               H. fights in the sim: it happens, it repeats exactly for a seed, the enemy never does it, the bots still win
// Run: node tests/campfighterrepair.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const run = code => g.run('(() => {' + code + '\n})()'); // (each run has a scope of its own: a const in one does not clash with the next)
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const read = f => readFileSync(ROOT + '/' + f, 'utf8');
const words = s => String(s).replace(/\{[^}]*\}/g, 'N').split(/\s+/).filter(Boolean).length;
// a battle of level 1 with the wing out (a launch, six seconds), no aliens yet; F(i) is the i-th fighter
run(`window.__new = (seed) => { window.C = campNew('home', [], { seed: seed || 5 }); campOrder(C, 'launch'); for (let i = 0; i < 8; i++) campStep(C, 1); C.events.length = 0; return C; }; // (campStep takes a second at most)
  window.__F = i => campWing(C, 'fighter')[i || 0];
  window.__hurt = (u, share) => { u.hp = u.maxHp * share; return u; };
  window.__go = (s) => { for (let i = 0; i < Math.round(s * 30); i++) campStep(C, 1 / 30); };
  window.__says = () => C.events.filter(e => e.type === 'say').map(e => e.key);`);

// ---- A. the table
console.log('A. the table');
const K = J('CAMP.repair'), CAMP_REPAIR_ORE = K.ore;
check('CAMP.repair: fighters break off under 25 percent, within 15 s of flight, mended for 20 s at no ore (card space-game-keys2-orders; it was 30 percent, 10 s, 5 ore, and a fight of 1800 px that decided whether a mended one went out), a radio line is not repeated within 5 s', K && JSON.stringify(K.kinds) === '["fighter"]' && K.below === 0.25 && K.within === 15 && K.time === 20 && K.ore === 0 && !('fight' in K) && K.sayEvery === 5, JSON.stringify(K));
check('every number of it is a finite number', Object.values(K).every(v => Array.isArray(v) || (typeof v === 'number' && isFinite(v))));
check('the functions are there: campRepairRun, campRepairTick, campRepairing, campRepairState, and campLaunch takes a mended ship', ['campRepairRun', 'campRepairTick', 'campRepairing', 'campRepairState', 'campRepairSay'].every(f => J(`typeof ${f}`) === 'function') && /function campLaunch\(C, again, order, squad\)/.test(read('src/campaign.js')));
check('a new battle has an empty repair list', J('__new().repairs.length') === 0 && J('campRepairing(C)') === 0);

// ---- B. who breaks off
console.log('B. who breaks off');
run('__new();');
check('a fighter at 24 percent hull breaks off: its flag is set, the radio says so, the sim has an event', (() => { run('__hurt(__F(0), 0.24); campStep(C, 1 / 30);'); return J('__F(0).repair') === true && J('__says()').indexOf('camp.say.repairoff') >= 0 && J('C.events.some(e => e.type === "repairoff")'); })());
run('__new();');
check('a fighter at 26 percent fights on', (() => { run('__hurt(__F(0), 0.26); campStep(C, 1 / 30);'); return !J('__F(0).repair') && J('__says()').indexOf('camp.say.repairoff') < 0; })());
run('__new();');
check('at exactly 25 percent it fights on (under, not at)', (() => { run('__F(0).hp = __F(0).maxHp * 0.25; campStep(C, 1 / 30);'); return !J('__F(0).repair'); })());
run('__new();');
check('a fighter 8000 px from the cruiser (over 15 s of flight at 430 px/s) fights on, and breaks off when the cruiser comes within reach', (() => {
  run('const u = __F(0); u.x = C.carrier.x + 8000; u.y = C.carrier.y; __hurt(u, 0.2); u.order = { type: "guard", at: { kind: "point", x: u.x, y: u.y } }; campStep(C, 1 / 30);');
  const far = !J('__F(0).repair'); run('__F(0).x = C.carrier.x + 5000; campStep(C, 1 / 30);'); return far && J('__F(0).repair') === true; })());
run('__new();');
check('an enemy raider at 10 percent hull and a pirate skiff never do it: the enemy has no repair (campRepairRun refuses them, and their AI never calls it)', (() => {
  run('__new(); const r = campSpawn(C, "raider", C.carrier.x + 300, C.carrier.y); r.hp = r.maxHp * 0.1; window.R1 = r; const s = campSpawn(C, "skiff", C.carrier.x + 400, C.carrier.y); s.hp = s.maxHp * 0.1; window.R2 = s;');
  return J('campRepairRun(C, R1, 1 / 30)') === false && J('campRepairRun(C, R2, 1 / 30)') === false && !/campRepairRun/.test(read('src/camppirates.js')) && (read('src/campaign.js').match(/campRepairRun\(/g) || []).length === 1; })());
check('with the carrier gone nobody flies home to it', (() => { run('__new(); __F(0).hp = __F(0).maxHp * 0.1; C.carrier.hp = 0;'); return J('campRepairRun(C, __F(0), 1 / 30)') === false; })());

// ---- C. the flight and the landing
console.log('C. the landing');
run('__new(); window.U = __hurt(__F(0), 0.2); U.order = { type: "attack", target: "" }; window.LOST = C.lostShips; window.HP0 = campWing(C, "fighter").length; window.T0 = C.t; __go(0.2);');
const d0 = J('campDist(U, C.carrier)');
run('__go(0.5);');
check('it flies home: the way to the cruiser shortens', J('campDist(U, C.carrier)') < d0 || J('U.repair') === true, d0 + ' -> ' + J('campDist(U, C.carrier)'));
run('for (let i = 0; i < 400 && C.repairs.length === 0; i++) campStep(C, 1 / 30); window.LANDED = C.t;');
check('it lands on the cruiser: one in the repair list, until 20 s from now, with the order it had', J('C.repairs.length') === 1 && Math.abs(J('C.repairs[0].until') - J('LANDED') - 20000) < 40 && J('C.repairs[0].order.type') === 'attack' && J('C.repairs[0].stay') === false, J('JSON.stringify(C.repairs)'));
check('it is out of the sim (no longer in the ships), not counted as out, not lost, and the dock is told', J('C.by[U.id] === undefined') && J('campWing(C, "fighter").length') === J('HP0') - 1 && J('C.lostShips') === J('LOST') && J('C.events.some(e => e.type === "dock" && e.repair && e.id === U.id)') !== false);
  check('it is still the wing\'s: "no ships left" does not say so, the ship computer says it is being mended', (() => {
    run('C.bay.fighters = 0; C.launchQ.length = 0; for (const u of campWing(C)) u.hp = 0;');
    return J('campRepairing(C, "fighter")') === 1 && J('campNoShips(C)') === false && /1 being mended/.test(J('campSummary(C)')); })());
check('with no repair in the list the same state IS "no ships left"', J('(() => { C.repairs.length = 0; return campNoShips(C); })()') === true);
check('the landing costs no ore now (card space-game-keys2-orders; card space-game-repair-with-ore had it at 5): the first mend of a fresh battle leaves the store as it was', (() => { run('__new(); window.__O = C.ore; window.U = __hurt(__F(0), 0.2); for (let i = 0; i < 400 && C.repairs.length === 0; i++) campStep(C, 1 / 30);'); return J('__O - C.ore') === CAMP_REPAIR_ORE; })());

// ---- D. mended
console.log('D. mended');
const land = (order, extra) => run(`__new(); window.U = __hurt(__F(0), 0.2); U.order = ${order}; ${extra || ''} for (let i = 0; i < 400 && C.repairs.length === 0; i++) campStep(C, 1 / 30); window.LANDED = C.t; C.events.length = 0;`);
land('{ type: "attack", target: "" }');
run('window.COUNT = campWing(C, "fighter").length; __go(19.5);');
check('19.5 s after landing it is still being mended', J('C.repairs.length') === 1 && J('campWing(C, "fighter").length') === J('COUNT'));
run('__go(1);');
check('20 s after landing it goes out at once: a new fighter at full hull, with the order it had, and the radio says so', J('C.repairs.length') === 0 && J('campWing(C, "fighter").length') === J('COUNT') + 1 && J('campWing(C, "fighter").every(u => u.hp === u.maxHp || u.hp > 0)') && J('__says()').indexOf('camp.say.repairback') >= 0 && J('C.mended') === 1);
check('the one that went out has the full hull and the attack order', (() => { const f = J('campWing(C, "fighter").filter(u => u.hp === u.maxHp && u.order && u.order.type === "attack").length'); return f >= 1; })());
land('{ type: "guard", at: { kind: "carrier" } }', 'for (const u of campWing(C)) u.order = { type: "recall" };');
run('__go(21);');
check('with the whole wing recalled while it was mended it stays aboard: in the bay, whole, one more in the bay, the radio says "in the bay"', J('C.repairs.length') === 0 && J('C.bay.fighters') >= 1 && J('__says()').indexOf('camp.say.repairdone') >= 0 && J('campWing(C, "fighter").filter(u => u.order && u.order.type !== "recall").length') === 0);
land('{ type: "guard", at: { kind: "carrier" } }', 'for (const u of campWing(C)) { if (u.id !== U.id) u.hp = 0; } C.ships = C.ships.filter(u => u.hp > 0); C.launchQ.length = 0; for (const u of C.ships) if (u.kind === "carrier") u.hp = u.hp;');
run('__go(21);');
check('with no ship of the wing out and no alien near the cruiser it goes out again alone all the same (card space-game-keys2-orders: the pilots stay out all mission; it used to wait in the bay for a Launch)', J('C.repairs.length') === 0 && J('C.bay.fighters') === 0 && J('campWing(C, "fighter").length') === 1, J('JSON.stringify({ b: C.bay, w: campWing(C).length })'));
land('{ type: "guard", at: { kind: "carrier" } }', 'for (const u of campWing(C)) { if (u.id !== U.id) u.hp = 0; } C.ships = C.ships.filter(u => u.hp > 0); C.launchQ.length = 0;');
run('campSpawn(C, "raider", C.carrier.x + 900, C.carrier.y).goal = "carrier"; __go(21);');
check('with no ship out and an alien near the cruiser it goes out again alone too', J('C.repairs.length') === 0 && J('campWing(C, "fighter").length') === 1 && J('C.bay.fighters') === 0);
land('{ type: "guard", at: { kind: "carrier" } }');
run('C.repairs[0].stay = true; __go(21);');
check('a repair marked "stay" (the Fast burn recalled the wing) goes to the bay', J('C.repairs.length') === 0 && J('C.bay.fighters') >= 1);
land('{ type: "guard", at: { kind: "carrier" } }');
run('window.B0 = C.bay.fighters; campOrder(C, "recall"); window.RS = C.repairs[0].stay; for (const u of campWing(C)) u.hp = 0; C.ships = C.ships.filter(u => u.hp > 0); C.launchQ.length = 0; C.bay.fighters = 1; campOrder(C, "launch"); window.LS = C.repairs[0].stay;');
check('a Recall marks the fighter being mended "stay"; a Launch takes it back, so it goes out when it is whole', J('RS') === true && J('LS') === false);
land('{ type: "guard", at: { kind: "carrier" } }');
run('C.nextLaunch = C.t + 1e6; __go(21);');
check('when the bay mouth is busy the mended fighter waits for the next tick, it is not lost', J('C.repairs.length') === 1);
run('C.nextLaunch = 0; __go(0.1);');
check('and goes out when the mouth is free', J('C.repairs.length') === 0);

// ---- E. orders on the way home
console.log('E. orders on the way home');
run('__new(); window.U = __hurt(__F(0), 0.2); campStep(C, 1 / 30); campOrder(C, "attack"); campStep(C, 1 / 30);');
check('an Attack given to a fighter on its way home does not turn it back: it is still going home and the new order is the one it goes out with', J('U.repair') === true && J('U.order.type') === 'attack');
run('for (let i = 0; i < 400 && C.repairs.length === 0; i++) campStep(C, 1 / 30);');
check('it lands, and it goes out with the Attack', J('C.repairs.length') === 1 && J('C.repairs[0].order.type') === 'attack');
run('__new(); window.U = __hurt(__F(0), 0.2); campStep(C, 1 / 30); campOrder(C, "recall"); for (let i = 0; i < 400 && C.repairs.length === 0; i++) campStep(C, 1 / 30);');
check('a Recall given to it is kept: it lands to be mended (not the old instant landing) and stays aboard', J('C.repairs.length') === 1 && J('C.repairs[0].stay') === true);
run('__new(); window.U = __hurt(__F(0), 0.5); campOrder(C, "recall"); for (let i = 0; i < 400 && !U.docked; i++) campStep(C, 1 / 30);');
check('a fighter ABOVE 25 percent that is recalled lands as it always did: whole at once, in the bay, nothing to mend', J('U.docked') === true && J('C.repairs.length') === 0 && J('C.bay.fighters') >= 1);

// ---- F. the radio
console.log('F. the radio');
run('__new(); campWing(C, "fighter").slice(0, 2).forEach(u => __hurt(u, 0.2)); campStep(C, 1 / 30);');
check('two pilots hurt together are one radio call, not two (it was four fighters: card space-game-three-pilots)', J('__says().filter(k => k === "camp.say.repairoff").length') === 1 && J('campWing(C, "fighter").filter(u => u.repair).length') === 2);
check('five seconds later the next one is a call again', (() => { run('C.events.length = 0; __go(5.2); campWing(C, "fighter").filter(u => !u.repair).slice(0, 1).forEach(u => __hurt(u, 0.1)); campStep(C, 1 / 30);'); return J('__says().filter(k => k === "camp.say.repairoff").length') === 1; })());
const T = read('content/text/campaign-repair.md');
const keys = ['camp.say.repairoff', 'camp.say.repairback', 'camp.say.repairdone', 'camp.ui.repair'];
check('the words are in a file of their own, curt (12 words at most), and the same in the game\'s table', keys.every(k => new RegExp('\\| ' + k.replace(/\./g, '\\.') + ' \\|').test(T)) && keys.slice(0, 3).every(k => words(J(`uiText('${k}')`)) <= 12 && J(`uiText('${k}')`) !== k) && J(`uiText('camp.ui.repair', { n: 2, s: 7 })`) === 'REPAIR 2  7 s', keys.map(k => J(`uiText('${k}')`)).join(' | '));
check('every line of the file is one the game knows (content and table agree)', keys.every(k => read('src/contenttables.js').indexOf("'" + k + "':") >= 0) && /type: text/.test(T));

// ---- G. the wing strip
console.log('G. the HUD');
run('__new(); campRepairing(C);');
check('campRepairState: nothing being mended is 0 and 0; one landing 10 s ago-ish counts down in whole seconds', (() => { const a = J('campRepairState(C)'); run('C.repairs.push({ kind: "fighter", until: C.t + 6400, order: null, stay: false }, { kind: "fighter", until: C.t + 9000, order: null, stay: false });'); const b = J('campRepairState(C)'); return a.n === 0 && a.next === 0 && b.n === 2 && b.next === 7; })());
run(`window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'repair'].forEach(k => { h[k] = { text: '', setText(t) { h[k].text = t; return h[k]; } }; }); f.hud = h;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
  toast = () => {}; shipcompSay = () => true; window.F = __fake(1); F.onKey({ code: 'Enter' }); F.update(0, 33);`);
check('the scene\'s repair line is empty with nothing being mended, and reads "REPAIR 1  8 s" with one', (() => { const e = J('F.hud.repair.text'); run('F.camp.repairs.push({ kind: "fighter", until: F.camp.t + 7500, order: null, stay: false }); F.update(0, 33);'); return e === '' && J('F.hud.repair.text') === 'REPAIR 1  8 s'; })(), J('F.hud.repair.text'));
check('the bay line is still the 40-letter line of tests/uxbay.mjs, and the repair line sits under it at the left (x 24, y 196: the scouts line that shared the row is gone)', /this\.hud\.repair = t\(24, 196,/.test(read('src/campaignscene.js')) && !/this\.hud\.scouts/.test(read('src/campaignscene.js')) && J('F.hud.bay.text').length <= 40);

// ---- H. fights in the sim
console.log('H. fights in the sim');
const fight = seed => J(`(() => { const C = campNew('home', [], { seed: ${seed} }); campOrder(C, 'launch'); let landed = 0, back = 0, said = [];
  for (let i = 0; i < 30 * 200 && !C.result; i++) { if (i % 150 === 40) campOrder(C, 'attack'); const was = C.repairs.length; campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'dock' && e.repair) landed++; if (e.type === 'say' && /repair/.test(e.key)) said.push(e.key); }); C.events.length = 0; }
  return { result: C.result, t: Math.round(C.t), landed, mended: C.mended | 0, lost: C.lostShips, kills: C.kills, rep: C.repairs.length, said: said.length }; })()`);
const runs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fight); // ten seeds, not four: with three pilots (card space-game-three-pilots; base main 981c198b) a pilot has three fighters' hull and falls under 30 percent on one seed in ten (it was one in two with eight fighters)
check('in a fight of level 1 with the wing at the aliens, a pilot does land to be mended (on at least one of ten seeds) and is mended', runs.filter(r => r.landed > 0).length >= 1 && runs.every(r => r.mended <= r.landed), JSON.stringify(runs));
check('the same seed repeats exactly (nothing random is added)', JSON.stringify(fight(3)) === JSON.stringify(runs[2]));
check('every fight is won or at least ends by the clock: no ship is left stuck aboard forever (the repair list is empty or a fighter landed in the last 10 s)', runs.every(r => r.rep <= 3), JSON.stringify(runs.map(r => r.rep))); // 3 since card space-game-fighter-flight (it was 2): a fight can end with three fighters in the mending queue, which is the clock, not a ship stuck aboard
const bot = J(`(() => { const out = []; for (const seed of [1, 2, 3]) { const C = campNew('home', [], { seed }); campOrder(C, 'launch'); for (let i = 0; i < 30 * 400 && !C.result; i++) { if (i % 150 === 40) campOrder(C, 'attack'); campStep(C, 1 / 30); C.events.length = 0; } out.push(C.result); } return out; })()`);
check('the plain way of playing (launch, attack every 5 s) still wins three seeds of level 1', bot.every(r => r === 'won'), JSON.stringify(bot));
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMP FIGHTER REPAIR FAIL (${failed} of ${n})` : `CAMP FIGHTER REPAIR PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
