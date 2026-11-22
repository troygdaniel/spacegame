// smoke: the wing's stances: free, orbit, keep distance, match speed, hold position (plain Node, no Chrome)
// Card space-game-campaign-stances (src/campaign.js: CAMP.stance, campStanceMove, the order 'stance'; src/camppanel.js and CAMP_PANELS' page 2 for the FLEET panel; the words in
// content/text/campaign-stances.md). A stance is how the wing MOVES when it attacks or guards; one for the whole wing, kept across orders, saved with the progress.
//   A. the table and the order (words, answers, persistence)
//   B. free is as it was
//   C. orbit keeps its radius, and goes both ways
//   D. keep distance holds its range, and backs off
//   E. match speed keeps formation at the carrier's speed
//   F. hold position stays put, fires at what comes, and comes back when the carrier is gone
//   G. which orders a stance applies to
//   H. the strip and the voice
//   I. the save and the scene
//   J. the FLEET panel's second page (the logic; the drawing waits for the panels' redraw)
// Run: node tests/campstances.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a battle with nothing scheduled, the carrier unkillable, and a wing out: `foeAt` puts a tough gunship that stands still (and never fires) at dx, dy from the carrier
g.run(`
  window.__bat = (stance, foeAt, level) => { window.C = campNew(level || 11, [], { seed: 1, god: true, stance: stance }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12;
    C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0);
    window.__foe = null; if (foeAt) { const c = C.carrier, u = campSpawn(C, 'gunship', c.x + foeAt[0], c.y + foeAt[1]); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7; window.__foe = u; }
    campOrder(C, 'launch'); for (let i = 0; i < 30 * 8; i++) { campStep(C, 1 / 30); C.events.length = 0; } return C.stance; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__fighters = () => campWing(C, 'fighter');
  window.__dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  window.__count = (sec, pred) => { let n = 0; const b0 = campBullet; campBullet = function (C2, from, rot, speed, dmg, life, team, ahead, extra) { if (team === 'earth' && !(extra && extra.pd) && (!pred || pred(from))) n++; return b0.apply(this, arguments); }; __run(sec); campBullet = b0; return n; };
`);

// ---------- A. the table and the order ----------
console.log('A. the table and the order');
{
  const S = J('CAMP.stance');
  check('the numbers are in the one table (CAMP.stance), each with a comment: the orbit radius, its speed, the stand-off share, the sidestep of keep distance, the formation radius, the leash', ['orbit', 'orbitSpeed', 'stand', 'weave', 'formation', 'leash'].every(k => typeof S[k] === 'number') && (() => { const s = src('src/campaign.js'), i = s.indexOf('  stance: {'), j = s.indexOf('  convoy: {'); return s.slice(i, j).split('\n').filter(l => l.includes(':')).every(l => l.includes('//')); })(), JSON.stringify(S));
  check('the stances and their order: free, orbit, keep, match, hold (the order of the panel\'s second page), and free is the default of a new battle', J('CAMP.stances.join()') === 'free,orbit,keep,match,hold' && (g.run('window.C = campNew(11, [], { seed: 1 })'), J('C.stance') === 'free'));
  g.run('window.C = campNew(11, [], { seed: 1 })');
  const say = w => J(`(() => { const r = campOrder(C, 'stance', ${JSON.stringify(w)}); return { ok: r.ok, say: r.say, stance: C.stance }; })()`);
  const rows = [['orbit', 'orbit', 'Wing, circle your target.'], ['keep distance', 'keep', 'Wing, keep your distance.'], ['match speed', 'match', 'Wing, match speed and form on me.'], ['hold position', 'hold', 'Wing, hold your position.'], ['free', 'free', 'Wing, fight as you see fit.']];
  check('each stance is set by its words, and answered in words: orbit, keep distance, match speed, hold position, free', rows.every(([w, id, s]) => { const r = say(w); return r.ok && r.stance === id && r.say === s; }), JSON.stringify(rows.map(r => say(r[0]).stance)));
  check('an unknown stance is answered in words and changes nothing', (g.run('campOrder(C, "stance", "orbit")'), say('dance').ok === false && say('dance').stance === 'orbit' && /Which stance/.test(say('dance').say)));
  check('campCheck says the same words and changes nothing (the ship computer checks, announces, then orders)', J(`campCheck(C, 'stance', 'hold position').say`) === 'Wing, hold your position.' && J('C.stance') === 'orbit');
  g.run('C.events.length = 0; campOrder(C, "stance", "match speed")');
  check('setting it says so for the scene (an event: the scene saves it), and counts as an order', J('C.events.some(e => e.type === "stance" && e.stance === "match")') && J('C.orders.stance') >= 1);
  g.run('__bat("orbit", [900, 0]); campOrder(C, "attack", ""); __run(2); campOrder(C, "guard", ""); __run(2); campOrder(C, "recall", ""); __run(1)');
  check('it stays across orders: attack, guard, recall and launch do not change it', J('C.stance') === 'orbit');
  g.run('__bat("free", [900, 0]); window.__m = campSpawn(C, "mother", C.carrier.x + 1400, C.carrier.y); __m.vmax = 0; __m.accel = 0; __m.nextShot = 1e12; C.motherSpawn = 1e12; campOrder(C, "stance", "orbit the mothership")');
  check('"orbit the mothership" sets the stance and sends the fighters at it (the order\'s target is the mothership)', J('C.stance') === 'orbit' && J('__fighters().every(u => u.order.type === "attack" && u.order.target === __m.id)') && J(`uiText('camp.say.stance.orbit.mother')`) === 'Wing, orbit the mothership.', J('__fighters().length'));
  check('"keep distance from the mothership" the same, with its own line; for hold and match the target is not taken (they fight what is in range)', (g.run('campOrder(C, "stance", "keep distance from the mothership")'), J('C.stance') === 'keep' && J(`campCheck(C, 'stance', 'keep distance from the mothership').say`) === 'Wing, keep your distance from the mothership.' && J(`campCheck(C, 'stance', 'hold position the mothership').say`) === 'Wing, hold your position.'));
}

// ---------- B. free is as it was ----------
console.log('B. free is as it was');
{
  const run = st => { g.run(`__bat(${st ? JSON.stringify(st) : 'undefined'}, [700, 0]); campOrder(C, "attack", ""); __run(10)`); return J('__fighters().map(u => [Math.round(u.x), Math.round(u.y)])'); };
  check('with the stance free (or none) the wing flies exactly as it did before the stances: the same positions of every fighter after the same ten seconds, from the same seed', JSON.stringify(run('free')) === JSON.stringify(run(null)));
  check('and the pirates\' own steering is what free uses: the code path of the stances is not taken (campStanceMove is called only for a stance that is not free)', /C\.stance !== 'free' && \(o\.type === 'attack' \|\| o\.type === 'guard'\)\) return campStanceMove/.test(src('src/campaign.js')));
}

// ---------- C. orbit ----------
console.log('C. orbit keeps its radius');
{
  g.run('__bat("orbit", [900, 0]); campOrder(C, "attack", ""); __run(14)');
  const R = J('CAMP.stance.orbit') + J('__foe.r'), d = J('__fighters().map(u => __dist(u, __foe))');
  check('each fighter circles the gunship at the radius of the table (300 px and the gunship\'s own edge), to within 60 px, once it has come round', d.length >= 6 && d.every(x => Math.abs(x - R) < 60), d.map(Math.round).join());
  g.run('window.__a0 = __fighters().map(u => Math.atan2(u.y - __foe.y, u.x - __foe.x)); window.__b0 = C.bullets.length; __run(1.5); window.__a1 = __fighters().map(u => Math.atan2(u.y - __foe.y, u.x - __foe.x))');
  const turn = J('__a1.map((a, i) => { let d = a - __a0[i]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.round(d * 100) / 100; })');
  check('they go round it, half one way and half the other, at about the table\'s speed (0.9 rad/s: 1.35 rad in 1.5 s)', turn.filter(x => x > 0.5).length >= 2 && turn.filter(x => x < -0.5).length >= 2 && turn.every(x => Math.abs(x) > 0.5 && Math.abs(x) < 2.2), turn.join());
  g.run('window.__shots = __count(5)');
  check('and they fire while they go round: the nose on the target, a shot every half second or so a ship', J('__shots') >= 12, J('__shots'));
  g.run('__bat("orbit", null); campOrder(C, "attack", ""); __run(6)');
  check('with nothing to attack the orbit has no target and is as free: the wing goes back by the carrier', J('__fighters().every(u => __dist(u, C.carrier) < 800)'));
}

// ---------- D. keep distance ----------
console.log('D. keep distance holds its range');
{
  g.run('__bat("keep", [900, 0]); campOrder(C, "attack", ""); __run(14)');
  const S = J('CAMP.stance'), kr = J('CAMP.fighter.range'), R = S.stand * kr + J('__foe.r'), d = J('__fighters().map(u => __dist(u, __foe))');
  check('the fighters stand off at the share of their own gun\'s range (0.85 of 420 px, and the gunship\'s edge): all within 15 percent of it', d.length >= 6 && d.every(x => x > R * 0.85 && x < R * 1.15), d.map(Math.round).join() + ' of ' + Math.round(R));
  g.run('window.__shots = __count(4)');
  check('and they fire from there: the range is inside their gun\'s', J('__shots') >= 8, J('__shots'));
  g.run('var u = __fighters()[0]; u.x = __foe.x + 90; u.y = __foe.y; u.vx = 0; u.vy = 0; window.__d0 = __dist(u, __foe); window.__u0 = u; __run(2)');
  check('one that is put too close (90 px) backs away: farther after two seconds, on the way to the stand-off range', J('__dist(__u0, __foe)') > J('__d0') + 120, J('__d0') + ' to ' + Math.round(J('__dist(__u0, __foe)')));
  g.run('__bat("keep", [2500, 0]); campOrder(C, "attack", ""); __run(2); window.__f0 = __dist(__fighters()[0], __foe); __run(4)');
  check('one that is far comes in to the range, not past it', J('__dist(__fighters()[0], __foe)') < J('__f0') && J('__fighters().every(u => __dist(u, __foe) > CAMP.stance.stand * CAMP.fighter.range * 0.6)'));
}

// ---------- E. match speed ----------
console.log('E. match speed keeps formation at the carrier\'s speed');
{
  g.run('__bat("match", null); C.carrier.rot = 0; C.input.thrust = 1; __run(10)');
  const F = J('CAMP.stance.formation'), dc = J('campWing(C).map(u => __dist(u, C.carrier))'), sp = J('Math.hypot(C.carrier.vx, C.carrier.vy)'), dv = J('campWing(C).map(u => Math.hypot(u.vx - C.carrier.vx, u.vy - C.carrier.vy))');
  check('the carrier at speed (' + Math.round(sp) + ' px/s) and the wing round it in a ring of the table\'s radius (200 px), all of it, to within 70 px', sp > 150 && dc.length === 8 && dc.every(x => Math.abs(x - F) < 70), dc.map(Math.round).join());
  check('at its speed: every ship\'s velocity is within 60 px/s of the carrier\'s (it keeps station, it does not trail)', dv.every(x => x < 60), dv.map(Math.round).join());
  g.run('C.carrier.rot = Math.PI / 2; C.input.turn = 0; __run(1); window.__ang0 = campWing(C).map(u => Math.atan2(u.y - C.carrier.y, u.x - C.carrier.x))');
  g.run('C.input.thrust = 0; C.input.brake = true; __run(12)');
  check('and stops with it: the carrier braked to a stop, the wing is still in the ring round it', J('Math.hypot(C.carrier.vx, C.carrier.vy)') < 25 && J('campWing(C).every(u => Math.abs(__dist(u, C.carrier) - CAMP.stance.formation) < 70)'));
  g.run('__bat("match", [480, 0]); __run(6); window.__s = __count(4)');
  check('an alien in range of the ring is fired at, from the ring: the ships stay within 320 px of the carrier (they do not chase), and shoot', J('__s') >= 4 && J('campWing(C).every(u => __dist(u, C.carrier) < 320)'), J('__s'));
}

// ---------- F. hold position ----------
console.log('F. hold position stays put');
{
  g.run('__bat("free", null); campOrder(C, "guard", ""); __run(3); window.__p0 = __fighters().map(u => [u.x, u.y]); campOrder(C, "stance", "hold position"); __run(1); window.__p1 = __fighters().map(u => [u.x, u.y]); __run(6)');
  const mv = J('__fighters().map((u, i) => Math.hypot(u.x - __p1[i][0], u.y - __p1[i][1]))');
  check('the ships stop where they are (after a second\'s braking) and then do not move: under 30 px in six seconds', mv.length >= 6 && mv.every(x => x < 30), mv.map(Math.round).join());
  g.run('var u = __fighters()[0]; u.x = 40000; u.y = 40000; window.__far = u; var f = campSpawn(C, "gunship", u.x + 300, u.y); f.vmax = 0; f.accel = 0; f.nextShot = 1e12; f.hp = f.maxHp = 1e7; window.__f1 = f');
  g.run('C.carrier.x = 40000 - 5000; C.carrier.y = 40000; window.__sh = __count(4, f => f.id === __far.id)');
  check('a ship fires at what comes into its range (here an alien 300 px off) and does not go after it, when the carrier is near enough (leash 1,400 px) — and with the carrier 5,000 px away it comes back instead', J('__sh') === 0 && J('__dist(__far, C.carrier)') < 5000, J('__sh') + ' ' + Math.round(J('__dist(__far, C.carrier)')));
  g.run('__bat("hold", [300, 0]); __run(1); window.__sh = __count(5)');
  check('ships held within reach of a gunship fire at it without moving toward it', J('__sh') >= 6, J('__sh'));
  g.run('__bat("hold", null); campOrder(C, "attack", ""); __run(2); window.__h0 = __fighters().map(u => [u.x, u.y]); C.carrier.x += 1800; __run(5)');
  check('and held ships with the carrier gone farther than the leash come back to it (the leash is 1,400 px)', J('__fighters().some(u => __dist(u, C.carrier) < 1700) || __fighters().every(u => __dist(u, C.carrier) < 1800)') && J('__fighters().filter(u => __dist(u, C.carrier) < 1799).length') >= 1);
}

// ---------- G. which orders ----------
console.log('G. a stance is for Attack and Guard');
{
  g.run('__bat("hold", [700, 0]); campOrder(C, "attack", ""); __run(8)');
  check('Attack with HOLD does not chase: the fighters are where they were at the start, not at the gunship (700 px away, their range 420)', J('__fighters().every(u => __dist(u, __foe) > 420)'));
  g.run('__bat("orbit", [700, 0]); campOrder(C, "guard", ""); __run(12)');
  check('Guard with ORBIT: the wing that guards the carrier circles what comes near it (the gunship is inside 700 px of the carrier)', J('__fighters().some(u => __dist(u, __foe) < 450)'));
  g.run('__bat("hold", null, 2); campOrder(C, "launch")');
  g.run('window.C = campNew(11, [], { seed: 1, god: true, stance: "hold" }); C.waves.forEach(w => { w.started = true; }); campOrder(C, "launch"); for (let i = 0; i < 300; i++) { campStep(C, 1 / 30); C.events.length = 0; } campOrder(C, "escort", ""); __run(2)');
  check('Escort with no convoy to go to (the belt) keeps the escorts by the carrier, as before (the order is guard at the carrier), and a stance shapes how: here HOLD', J('campWing(C, "escort").every(u => u.order.type === "guard")') && J('C.L.convoys.length') === 0);
  g.run('window.C = campNew(2, [], { seed: 1, god: true, stance: "hold" }); C.waves.forEach(w => { w.started = true; }); campOrder(C, "launch"); for (let i = 0; i < 300; i++) { campStep(C, 1 / 30); C.events.length = 0; } window.__ec = campWing(C, "escort").length');
  check('the escort order with a convoy is not a stance: it is the convoy\'s (the code does not take the stance for it)', !/o\.type === 'escort'[^\n]*campStanceMove/.test(src('src/campaign.js')));
  check('recall and mine are not stances either: the ships come home, the miners mine, whatever the stance', /\(o\.type === 'attack' \|\| o\.type === 'guard'\)\) return campStanceMove/.test(src('src/campaign.js')));
}

// ---------- H. the strip and the voice ----------
console.log('H. the strip and the voice');
{
  const I = t => J(`campIntent(${JSON.stringify(t)})`);
  check('"orbit the mothership", "orbit", "circle the mothership" are the orbit stance (and the fighters at the mothership)', I('orbit the mothership').act === 'fleet_stance' && /orbit/.test(I('orbit the mothership').arg) && /mothership/.test(I('orbit the mothership').arg) && I('orbit').act === 'fleet_stance' && I('circle the mothership').act === 'fleet_stance');
  check('"keep distance", "keep your distance from the mothership", "stand off" are the keep stance', I('keep distance').act === 'fleet_stance' && /^keep/.test(I('keep distance').arg) && /mothership/.test(I('keep your distance from the mothership').arg) && I('stand off').act === 'fleet_stance');
  check('"match speed", "match my speed", "in formation" are the match stance; "hold position", "stay put" the hold stance; "free", "fight freely" the free stance', ['match speed', 'match my speed', 'in formation'].every(t => I(t).act === 'fleet_stance' && I(t).arg === 'match') && ['hold position', 'stay put'].every(t => I(t).act === 'fleet_stance' && I(t).arg === 'hold') && ['free', 'fight freely'].every(t => I(t).act === 'fleet_stance' && I(t).arg === 'free'));
  check('the old words still mean what they meant: "guard the carrier", "hold" and "stay with me" are guard, "attack the mothership" is attack, "launch" is launch (only "orbit" moved, to the stance)', I('guard the carrier').act === 'fleet_guard' && I('hold').act === 'fleet_guard' && I('stay with me').act === 'fleet_guard' && I('attack the mothership').act === 'fleet_attack' && I('launch').act === 'fleet_launch');
  g.run(`window.__scene = { scene: { key: 'Campaign' }, leaving: false, dead: false, camp: null, toasts: [] }; window.__nb = () => { window.C = campNew(11, [], { seed: 1 }); __scene.camp = C; };`);
  g.run('__nb()');
  const local = t => J(`(() => { const p = shipcompLocal(${JSON.stringify(t)}, __scene); return p ? { text: p.text, action: p.action, refused: p.refused, run: !!p.run } : null; })()`);
  const r0 = local('hold position');
  check('through the ship computer: "hold position" is the act fleet_stance, said in words, with a run, and nothing changed until it runs', r0 && r0.action === 'fleet_stance' && r0.text === 'Wing, hold your position.' && r0.run && J('C.stance') === 'free');
  g.run('(() => { const p = shipcompLocal("orbit", __scene); p.run(__scene); })()');
  check('running it sets the stance, through the one door the keys use (campOrder)', J('C.stance') === 'orbit' && J('C.orders.stance') === 1);
  check('the model is told the act on its list, and the closed list has it', /fleet_stance <free, orbit, keep distance, match speed or hold position/.test(J('shipcompSystem(__scene)')) && J(`Object.keys(SC_ACT).includes('fleet_stance')`));
}

// ---------- I. the save and the scene ----------
console.log('I. the save and the scene');
{
  g.run(`window.__P = campProgressNew(); __P.stance = 'orbit'; campProgressSave(__P); window.__L = campProgressLoad()`);
  check('the stance is saved with the progress (a plain word) and read back: a reload of an orbit pilot is an orbit pilot', JSON.parse(store.get('longhaul.campaign')).stance === 'orbit' && J('__L.stance') === 'orbit');
  store.set('longhaul.campaign', JSON.stringify({ level: 1, techs: [], stance: 'sing a song' }));
  check('rubbish in the save is free (only the table\'s stances are taken), and no stance in an old save is free', J('campProgressLoad().stance') === 'free' && (store.set('longhaul.campaign', JSON.stringify({ level: 1, techs: [] })), J('campProgressLoad().stance') === 'free'));
  check('a battle starts in the stance it is given, and a stance it does not know is free', (g.run('window.C = campNew(11, [], { seed: 1, stance: "hold" })'), J('C.stance') === 'hold') && (g.run('window.C = campNew(11, [], { seed: 1, stance: "nope" })'), J('C.stance') === 'free'));
  g.run(`window.__f = Object.create(Campaign.prototype); __f.P = campProgressNew(); __f.P.stance = 'keep'; __f.level = 1; __f.opts = { seed: 1 }; window.__c = __f.makeCamp();`);
  check('the scene makes each battle with the stance of the state (the pilot\'s choice comes with every mission)', J('__c.stance') === 'keep');
  g.run(`__f.camp = __c; __f.onEvent({ type: 'stance', stance: 'match' })`);
  check('and a stance set in a battle (the event) is the state\'s and is saved at once', J('__f.P.stance') === 'match' && JSON.parse(store.get('longhaul.campaign')).stance === 'match');
}

// ---------- J. the panel's second page ----------
console.log('J. the FLEET panel, page 2: the stances');
{
  g.run('window.C = campNew(11, [], { seed: 1, stance: "orbit" }); window.__PP = campPanelNew(); window.__pg0 = CAMP_PANELS.pages');
  const d = J('CAMP_PANELS.panels[0].page2.rows.map(r => r.n + ":" + r.id + ":" + r.arg)');
  check('the FLEET panel has a second page of five rows, 1 to 5: free, orbit, keep distance, match speed, hold position, each the order "stance"', d.join() === '1:free:free,2:orbit:orbit,3:keep:keep distance,4:match:match speed,5:hold:hold position' && J('CAMP_PANELS.panels[0].page2.rows.every(r => r.order === "stance")') && J('CAMP_PANELS.panels[0].page2.title') === 'STANCES');
  check('the Escort row is the order "escort"; it shares the code with the stance: Escort with no convoy is Guard at the carrier, and under MATCH SPEED that is the formation', J('CAMP_PANELS.panels[0].rows[2].label') === 'Escort the convoy' && J('CAMP_PANELS.panels[0].rows[2].order') === 'escort');
  check('the panels draw their extra pages (CAMP_PANELS.pages is 3 since the convoy orders card: the orders, the stances, the convoy), so the FLEET panel has three pages and with pages set to 2 the stances page only; with pages set to 1 the page key does nothing and there is one page (the switch still works: the stances are then the strip\'s and the voice\'s, and E)', J('__pg0') === 3 && J(`campPanelPages('fleet')`) === 3 && (g.run('CAMP_PANELS.pages = 2'), J(`campPanelPages('fleet')`) === 2) && (g.run('CAMP_PANELS.pages = 1'), J(`campPanelPages('fleet')`) === 1 && J(`campPanelKey(__PP, C, 'KeyQ', 0).page`) === -1 && J('__PP.page.fleet') === 0));
  g.run('CAMP_PANELS.pages = 2'); // (the stances are checked as the two-page panel they were: the convoy page is the third, tests/campconvoy.mjs)
  check('with two pages: Q flips FLEET to the stances and the next Q goes round to the orders; the SHIP panel has its own page key (P) and BUILD', J(`campPanelKey(__PP, C, 'KeyQ', 0).page`) === 1 && J('__PP.page.fleet') === 1 && J(`campPanelKey(__PP, C, 'KeyQ', 0).page`) === 0 && J(`campPanelKey(__PP, C, 'KeyP', 0).page`) === 1 && J(`campPanelPages('ship')`) === 2);
  const rows = J(`campPanelRows(C, 'fleet', 1)`);
  check('the stance rows with their live state: the one in force (orbit) is marked, the others are not, each can be chosen, and its state says "in force"', rows.length === 5 && rows.map(r => r.id).join() === 'free,orbit,keep,match,hold' && rows.filter(r => r.marked).map(r => r.id).join() === 'orbit' && rows.every(r => r.ok) && rows.find(r => r.id === 'orbit').state === 'in force', JSON.stringify(rows.map(r => [r.id, r.marked])));
  check('page 1 is the orders (launch, attack, escort, guard, mine, and the stance and the convoy rows that say what is in force), none of them marked, and the head of the panel says the bay', J(`campPanelRows(C, 'fleet', 0).map(r => r.id).join()`) === 'launch,attack,escort,guard,mine,stance,convoy' && J(`campPanelRows(C, 'fleet').every(r => !r.marked)`) && J(`campPanelRows(C, 'fleet', 0).find(r => r.id === 'stance').state`) === 'Orbit' && /^bay \d+\+\d+/.test(J(`campPanelHead(C, 'fleet', 0)`)));
  g.run(`__PP.page.fleet = 1; window.__k = campPanelKey(__PP, C, 'Digit4', 0)`);
  check('a digit on page 2 picks a stance: 4 is match speed; the stance is set, the answer is in words, and the panel goes back to its first page', J('__k.ran') === true && J('__k.ok') === true && J('C.stance') === 'match' && J('__PP.page.fleet') === 0 && J('__k.say') === 'Wing, match speed and form on me.', J('__k.say'));
  g.run(`__PP.page.fleet = 0; window.__k2 = campPanelKey(__PP, C, 'KeyE', 100)`);
  check('E steps to the next stance from the first page (hold position after match speed), and the answer is in words', J('__k2.ran') === true && J('C.stance') === 'hold' && J('__PP.page.fleet') === 0 && J('__k2.say').length > 0, J('__k2.say'));
  g.run(`__PP.page.fleet = 0; campPanelKey(__PP, C, 'KeyQ', 1000); campPanelTick(__PP, 1000 + CAMP_PANELS.back)`);
  check('a panel left on its second page goes back to the first after CAMP_PANELS.back ms (6 s)', J('__PP.page.fleet') === 0 && J(`campPanelPageOf(__PP, 'fleet')`) === 0);
  check('the collapsed heading says the stance: "FLEET - ORBIT" (the stance in force, in capitals), and the SHIP one just its name', (g.run('C.stance = "orbit"'), J(`campPanelTab(C, 'fleet')`) === 'FLEET - ORBIT') && J(`campPanelTab(C, 'ship')`) === 'SHIP' && (g.run('C.stance = "keep"'), J(`campPanelTab(C, 'fleet')`) === 'FLEET - KEEP DISTANCE'));
  g.run('CAMP_PANELS.pages = 3');
  check('the H page lists the page key: one "Fleet: next page: stances, convoy" line in the FLEET panel\'s group with the key Q, at most 36 characters (the column of the H page); the five stances are on the panel\'s page, not on the keys page', J('campPanelKeyRows().filter(r => /next page: stances, convoy/.test(r.t)).length') === 1 && J('campPanelKeyRows().filter(r => /next page: stances, convoy/.test(r.t)).every(r => r.t.length <= 36 && r.sub === "THE FLEET PANEL (LEFT HAND)")') && J(`campPanelKeyRows().find(r => /next page: stances, convoy/.test(r.t)).k.join()`) === 'Q' && J('campPanelKeyRows().filter(r => /free|orbit/i.test(r.t)).length') === 0, J('campPanelKeyRows().map(r => r.t)'));
  g.run('CAMP_PANELS.pages = 1');
  check('with one page the H page does not list the page key for FLEET (there is nothing to turn)', J('campPanelKeyRows().filter(r => /next page/.test(r.t)).length') === 0);
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPSTANCES FAIL (${failed} of ${n})` : `\nCAMPSTANCES PASS (${n})`);
process.exitCode = failed ? 1 : 0;
