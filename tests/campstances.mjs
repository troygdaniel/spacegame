// smoke: the wing's stances: free, orbit, keep distance, match speed, hold position; each is a plain row of the stance list, a part of the fleet list with no key of its own (Q, the Stance row, Enter; then Up and Down, Enter) (plain Node, no Chrome)
// Card space-game-campaign-stances (src/campaign.js: CAMP.stance, campStanceMove, the order 'stance'; src/camppanel.js and the five rows of CAMP_PANELS' stance list; the words in
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
//   J. the stance list (cards one-list-keys and list-shortcuts, 22 and 23 Nov 2026: the stances are a PART of the fleet list, the only part with no shortcut key: Q, Down to the Stance row, Enter or Right opens it, Left goes
//      back onto that row; nothing cycles, nothing settles, there are no pages and no digits): one row per stance, the one in force marked and named on the Stance row; picking a row gives that stance at once and closes the list
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

// ---------- J. the stance list ----------
console.log('J. the stance list: a part of the fleet list, one row for each stance');
{
  // press through to a row as the player does: the key of the list it is in (campKeyVia; from a closed list, so the highlight is on the top row), or, for a list with no key (the stance list), its parent's key, Down to the part's row
  // and Enter; then Down to the row, Enter. null when the row is not in this mission's list
  g.run(`window.__open = (P, C, list, now) => { const def = campPanelDef(list); campPanelClose(P); if (def.code) return campPanelKey(P, C, def.code, now); const i = campPanelList(C, def.parent).findIndex(r => r.open === list); if (i < 0 || !__open(P, C, def.parent, now)) return null; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); };
    window.__pick = (P, C, rowId, now) => { const via = campKeyVia(rowId), i = via ? campPanelList(C, via.id).findIndex(r => r.id === rowId) : -1; if (i < 0 || !__open(P, C, via.id, now)) return null; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); };`);
  g.run('window.C = campNew(11, [], { seed: 1, stance: "orbit" }); window.__PP = campPanelNew(); window.__FL = campPanelDef("fleet"); window.__SL = campPanelDef("stance"); window.__ST = __SL.rows;');
  const d = J('__ST.map(r => r.id + ":" + r.arg + ":" + r.name)');
  check('the stance list has five rows, one for each choice: free, orbit, keep distance, match speed, hold position, each the order "stance" with its own word (name) and a label in plain words (the list\'s heading says STANCE, so no row says "Stance:" again)', d.join() === 'free:free:Free,orbit:orbit:Orbit,keep:keep distance:Keep distance,match:match speed:Match speed,hold:hold position:Hold position' && J('__ST.map(r => r.label).join("|")') === 'Fight freely|Orbit the target|Keep distance|Match my speed|Hold position' && J('__ST.every(r => r.order === "stance")') && J('__ST.length') === 5 && J('CAMP_PANELS.panels.flatMap(p => p.rows).filter(r => r.order === "stance").length') === 5 && J('CAMP_PANELS.panels.flatMap(p => p.rows).filter(r => r.name).length') === 5 && J('__SL.title') === 'STANCE');
  check('it is a part of the fleet list, at the left, with NO key of its own (key and code are empty): the last row of the fleet list, "Stance", opens it, and a hint that asks for its key gets Q', J('__SL.parent') === 'fleet' && J('__SL.side') === 'left' && J('__SL.key') === '' && J('__SL.code') === '' && J('__FL.rows[__FL.rows.length - 1].id') === 'gstance' && J('__FL.rows[__FL.rows.length - 1].open') === 'stance' && J('__FL.rows[__FL.rows.length - 1].label') === 'Stance' && J('__FL.rows.filter(r => r.open === "stance").length') === 1 && J(`campKeyVar('stancekey')`) === 'Q' && J(`campKeyVar('viamatch')`) === 'Q' && J(`campKeyOpens('stance')`) === 'Q' && J(`campKeyVia('hold').id`) === 'stance');
  check('the Escort row is the order "escort" (the first row of the escorts\' list, R); it shares the code with the stance: Escort with no convoy is Guard at the carrier, and under MATCH SPEED that is the formation', J(`campKeyVia('escort').id`) === 'escorts' && J(`campPanelDef('escorts').rows[0].id`) === 'escort' && J(`campPanelDef('escorts').rows[0].label`) === 'Escort the convoy' && J(`campPanelDef('escorts').rows[0].order`) === 'escort' && J(`campPanelDef('escorts').key`) === 'R');
  check('there are no pages (no page2, page3, pages, back or settle in the table, and no page function): a part is a list of its own, no row has a key, a number or a cycle of its own, and in the belt (no convoy) the convoy\'s row is left out of the fleet list: seven rows, the stance\'s the last', J('["page2", "page3"].every(k => !(k in __FL) && !(k in __SL))') && J('["pages", "back", "settle"].every(k => !(k in CAMP_PANELS))') && J('[typeof campPanelPages, typeof campPanelSettle, typeof campPanelTick, typeof campPanelDigit, typeof campPanelCycleKey].every(t => t === "undefined")') && J('__FL.rows.concat(__SL.rows).every(r => !("k" in r) && !("n" in r) && !("code" in r) && !("key" in r) && !("cycle" in r) && !("tag" in r))') && J(`campPanelList(C, 'fleet').map(r => r.id).join()`) === 'launch,gfighters,gescorts,guard,mine,recall,gstance' && J(`campPanelList(C, 'stance').map(r => r.id).join()`) === 'free,orbit,keep,match,hold', J(`campPanelList(C, 'fleet').map(r => r.id).join()`));
  check('Q opens the fleet list on its top row and the next Q closes it; P opens the ship list (its own key) and only one list is open at a time: P with the fleet list open closes it', J(`campPanelKey(__PP, C, 'KeyQ', 0).open`) === 'fleet' && J('__PP.at') === 0 && J(`campPanelKey(__PP, C, 'KeyQ', 0).open`) === '' && J(`campPanelKey(__PP, C, 'KeyQ', 0).open`) === 'fleet' && J(`campPanelKey(__PP, C, 'KeyP', 0).open`) === 'ship' && J('campPanelOpen(__PP)') === 'ship' && J(`campPanelKey(__PP, C, 'KeyP', 0).open`) === '');
  g.run(`campPanelKey(__PP, C, 'KeyQ', 0); window.__gi = campPanelList(C, 'fleet').findIndex(r => r.open === 'stance'); for (let k = 0; k < __gi; k++) campPanelKey(__PP, C, 'ArrowDown', 0); window.__gr = campPanelView(__PP, C).rows[__gi]; window.__o1 = campPanelKey(__PP, C, 'Enter', 0); window.__v1 = campPanelView(__PP, C);`);
  check('Q, Down to "Stance" (which names the stance in force: Orbit), Enter opens the stance list at its top row: no order is given by that Enter, and the list\'s view has no key and names the fleet list as its parent', J('__gi') === 6 && J('__gr.id') === 'gstance' && J('__gr.more') === true && J('__gr.key') === '' && J('__gr.ok') === true && J('__gr.short') === 'Orbit' && J('__o1.used') === true && J('__o1.ran') === false && J('__o1.open') === 'stance' && J('C.orders.stance') === 0 && J('C.stance') === 'orbit' && J('__PP.at') === 0 && J('__v1.id') === 'stance' && J('__v1.key') === '' && J('__v1.parent') === 'fleet' && J('__v1.title') === 'STANCE' && J('__v1.side') === 'left' && J('__v1.total') === 5 && J('__v1.rows.length') === 5);
  check('Right on the Stance row opens it too; Left in it goes back to the fleet list with the highlight on the Stance row; Esc in it closes everything', (() => { g.run(`campPanelKey(__PP, C, 'ArrowDown', 0); window.__l1 = campPanelKey(__PP, C, 'ArrowLeft', 0); window.__l1at = __PP.at; window.__r1 = campPanelKey(__PP, C, 'ArrowRight', 0); window.__r1at = __PP.at; window.__e1 = campPanelKey(__PP, C, 'Escape', 0);`); return J('__l1.open') === 'fleet' && J('__l1at') === J('__gi') && J('__r1.open') === 'stance' && J('__r1.ran') === false && J('__r1at') === 0 && J('__e1.used') === true && J('__e1.open') === '' && J('campPanelOpen(__PP)') === '' && J('C.orders.stance') === 0; })());
  const rows = J(`campPanelRows(C, 'stance')`);
  check('the stance rows with their live state: the one in force (orbit) is marked, the others are not, each can be chosen, and its state says "in force"', rows.length === 5 && rows.map(r => r.id).join() === 'free,orbit,keep,match,hold' && rows.filter(r => r.marked).map(r => r.id).join() === 'orbit' && rows.every(r => r.ok && r.key === '' && r.more === false) && rows.find(r => r.id === 'orbit').state === 'in force' && rows.filter(r => r.id !== 'orbit').every(r => r.state === '' && r.short === ''), JSON.stringify(rows.map(r => [r.id, r.marked])));
  check('the rows of the fleet list are the wing\'s orders and its parts (launch, fighters, escorts, guard, mine, recall, stance), none of them marked: Launch and Recall are two rows (no toggle), the launch row says the bay, and the stance in force has its word for the HUD and for the Stance row (campPanelStanceName: "Orbit")', J(`campPanelRows(C, 'fleet').map(r => r.id).join()`) === 'launch,gfighters,gescorts,guard,mine,recall,gstance' && J(`campPanelRows(C, 'fleet').every(r => !r.marked)`) && J('campPanelStanceName(C)') === 'Orbit' && J(`campPanelRows(C, 'fleet').find(r => r.id === 'gstance').state`) === 'Orbit' && /^\d+ fighters, \d+ escorts$/.test(J(`campPanelRows(C, 'fleet').find(r => r.id === 'launch').state`)) && /^\d+ in bay$/.test(J(`campPanelRows(C, 'fleet').find(r => r.id === 'launch').short`)));
  g.run(`window.__d4 = campPanelKey(__PP, C, 'Digit4', 0); window.__st0 = C.stance; window.__k = __pick(__PP, C, 'match', 0)`);
  check('Q, Down to "Stance", Enter, Down to "Match my speed", Enter picks that stance: it is set at once, the answer is in words, it is a fleet order, and the list closes; a digit picks nothing (4 was match speed)', J('__d4.used') === false && J('__d4.ran') === false && J('__st0') === 'orbit' && J('__k.ran') === true && J('__k.ok') === true && J('__k.row') === 'match' && J('__k.fleet') === true && J('C.stance') === 'match' && J('__k.open') === '' && J('campPanelOpen(__PP)') === '' && J('__k.say') === 'Wing, match speed and form on me.' && J('C.orders.stance') === 1, J('__k.say'));
  g.run(`campPanelClose(__PP); window.__k2 = campPanelKey(__PP, C, 'KeyE', 100); window.__st1 = C.stance; window.__e2 = campPanelOpen(__PP); window.__k3 = __pick(__PP, C, 'hold', 100)`);
  check('nothing cycles and nothing settles: E is the fighters\' list now (it opens that list; the old stance key does not touch the stance); the row "Hold position" gives hold position the moment Enter is pressed, and the answer is in words', J('__k2.used') === true && J('__k2.ran') === false && J('__e2') === 'fighters' && J('__st1') === 'match' && J('__k3.ran') === true && J('__k3.ok') === true && J('C.stance') === 'hold' && J('campPanelOpen(__PP)') === '' && J('__k3.say').length > 0 && J(`campPanelRows(C, 'stance').filter(r => r.marked).map(r => r.id).join()`) === 'hold', J('__k3.say'));
  check('no key of the keyboard goes straight to the stance list (every letter and digit, from closed): the only way in is its row of the fleet list', J(`(() => { const P = campPanelNew(), C2 = campNew(11, [], { seed: 1 }); return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => 'Key' + c).concat('0123456789'.split('').map(c => 'Digit' + c)).every(c => { campPanelClose(P); return campPanelKey(P, C2, c, 0).open !== 'stance'; }) && C2.stance === 'free'; })()`));
  g.run(`__open(__PP, C, 'stance', 1000); campPanelKey(__PP, C, 'ArrowDown', 1000); campPanelKey(__PP, C, 'ArrowDown', 1000); window.__at2 = __PP.at; __open(__PP, C, 'stance', 1200); window.__at0 = __PP.at; campPanelKey(__PP, C, 'ArrowUp', 1300); window.__vw = campPanelView(__PP, C); window.__atUp = __PP.at; campPanelKey(__PP, C, 'ArrowDown', 1400); window.__atRound = __PP.at;`);
  check('a list that is opened again always starts at its top row (the highlight is not remembered); Up from the top goes round to the last row, the stance "hold position" (all five rows show: the list is shorter than the 9 a list shows, so nothing scrolls), and Down from it goes round to the top', J('__at2') === 2 && J('__at0') === 0 && J('__atUp') === 4 && J(`campPanelList(C, 'stance')[__atUp].id`) === 'hold' && J('CAMP_PANELS.show') === 9 && J('__vw.total') === 5 && J('__vw.first') === 0 && J('__vw.above') === 0 && J('__vw.below') === 0 && J('__vw.rows[__vw.at].id') === 'hold' && J('__atRound') === 0, JSON.stringify(J('[__at2, __at0, __atUp, __vw.first, __vw.at, __atRound]')));
  g.run('campPanelClose(__PP)');
  check('the stance in force has its own word for the HUD: "Orbit", "Keep distance", and "Free" when the battle has none (the lists\' titles are just FLEET ORDERS, STANCE and SHIP ORDERS)', (g.run('C.stance = "orbit"'), J('campPanelStanceName(C)') === 'Orbit') && (g.run('C.stance = "keep"'), J('campPanelStanceName(C)') === 'Keep distance') && (g.run('C.stance = ""'), J('campPanelStanceName(C)') === 'Free') && J('__FL.title') === 'FLEET ORDERS' && J('__SL.title') === 'STANCE' && J('CAMP_PANELS.panels.find(p => p.id === "ship").title') === 'SHIP ORDERS' && (g.run('C.stance = "orbit"'), true));
  check('the H page lists the fleet list\'s key: one "Fleet orders ..." line in the lists\' group with the key Q, at most 36 characters (the column of the H page); the stance list has no key and so no line, and the five stances are rows of it, not on the keys page', J('campPanelKeyRows().filter(r => /^Fleet orders/.test(r.t)).length') === 1 && J('campPanelKeyRows().filter(r => /^Fleet orders/.test(r.t)).every(r => r.t.length <= 36 && r.sub === "THE ORDER LISTS")') && J('campPanelKeyRows().every(r => r.t.length <= 36)') && J(`campPanelKeyRows().find(r => /^Fleet orders/.test(r.t)).k.join()`) === 'Q' && J('campPanelKeyRows().filter(r => /free|orbit|stance/i.test(r.t)).length') === 0, J('campPanelKeyRows().map(r => r.t)'));
  check('and it has no page key and no stance key (there is nothing to turn and nothing to cycle): no line says "next page", and E is the fighters\' list, not the stance', J('campPanelKeyRows().filter(r => /next page|page/i.test(r.t)).length') === 0 && J('campPanelKeyRows().filter(r => r.k.indexOf("E") >= 0).map(r => r.t).join()') === J('campPanelKeyRows()[2].t') && /^Fighters/.test(J('campPanelKeyRows()[2].t')) && J('campPanelKeyRows().map(r => r.k.join(" ")).join("|")') === 'Q|W|E|R|P|O|I|U|Up Down|Enter|Left Right|Esc');
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPSTANCES FAIL (${failed} of ${n})` : `\nCAMPSTANCES PASS (${n})`);
process.exitCode = failed ? 1 : 0;
