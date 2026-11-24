// smoke: the Campaign's missile launcher and its turrets: Enter (while no order list is open), homing, the magazine and its slow reload, big damage to big ships, the order by strip and voice (plain Node, no Chrome)
// Card space-game-campaign-missiles (docs/CAMPAIGN.md "The weapons"). The rules are in src/campaign.js (CAMP.missile, campFire, campMissiles, campMissileAdd, the order 'missiles');
// the scene only draws them, so they are tested here on the numbers, and the scene's own decisions (the Enter key, the count, the turret ring) on a stand-in for the scene.
//   A. the table and the words
//   B. firing: a target in reach, none, the mothership named, out of range, the pause between launches, an empty magazine
//   C. flying: it homes, it kills a gunship in one, it takes the mothership down in six, little to the small ships, it goes off on big ships only, a new target, no fuel
//   D. the magazine: slow reload up to the full, never past it, and the ore code can add to it (up to the most it holds)
//   E. the words: "fire missiles", "missiles at the mothership"; the ship computer's act and what it tells the model
//   F. Space and the missile: Space only makes the turrets fire (it never launches a missile), the order only launches missiles; the turrets are in tests/campaign.mjs B
//   G. the scene: Enter fires (a direct key of CAMP_KEYS, not a row of a list: cards one-list-keys and list-shortcuts), but only while no list is open (Q W E R, P O I U): in an open list Enter gives the highlighted order, or on a part's row opens that part's list; the count on the HUD, the key line and the pause card
//   H. nothing else moved: no order, no missile; the same seed flies the same; tower rings fall to missiles
// Run: node tests/campmissiles.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('campFleetListSet(true)'); // this suite is about the lists' code, Q's pop-up included: it is switched off in the game (CAMP_FLEET_LIST, card space-game-q-selects-all) and on here; tests/campselect.mjs has the game's own state
g.run('campShipListSet(true)'); // and the ship list too: it is switched off in the game (CAMP_SHIP_LIST, card space-game-p-opens-power: P opens power) and on here; tests/campselect.mjs has the game's own state
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// helpers: a battle with nothing scheduled (no waves, no convoys), the carrier unkillable, a still alien that does not shoot, and a clock
g.run(`
  window.__m = (level, seed) => { window.C = campNew(level || 1, [], { seed: seed == null ? 1 : seed, god: true }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12; return !!C; };
  window.__foe = (kind, dx, dy, hp) => { const c = C.carrier, u = campSpawn(C, kind, c.x + dx, c.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; if (hp) u.hp = u.maxHp = hp; return u.id; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) campStep(C, 1 / 30); };
  window.__hp = id => C.by[id] ? Math.round(C.by[id].hp * 10) / 10 : 0;
  window.__ev = type => C.events.filter(e => e.type === type).length;
  window.__fire = arg => { const r = campOrder(C, 'missiles', arg || '', 'key'); return { ok: r.ok, code: r.code, say: r.say }; };
`);

// ---------- A. the table and the words ----------
console.log('A. the table and the words');
{
  const m = J('CAMP.missile');
  check('the launcher is in the one table, CAMP.missile: a magazine of 6, a slow reload, big damage to big ships and little to the others', m.magazine === 6 && m.reload >= 10000 && m.big >= 100 && m.small <= 20 && m.big > m.small * 5, JSON.stringify(m));
  check('every number the card names is there: magazine, reload, damage, speed, turn rate (and the lock, fuel, fuze and blast)', ['magazine', 'max', 'reload', 'delay', 'lock', 'speed', 'accel', 'turn', 'life', 'fuze', 'blast', 'big', 'small', 'launch'].every(k => typeof m[k] === 'number'));
  check('the big ships are the mothership, the towers, the gunships and the rival pirate leader (card space-game-rival-duel: the answer to a rival that runs)', m.bigKinds.slice().sort().join() === 'gunship,mother,pirateleader,tower');
  check('every line of the table has a comment', (() => { const s = src('src/campaign.js'), i = s.indexOf('  missile: {'), j = s.indexOf('  bay: {'); return s.slice(i, j).split('\n').slice(1, -2).every(l => l.includes('//')); })());
  g.run('__m(1)');
  check('a new battle: six missiles in the magazine as a plain number (C.missiles), none in the air, the launcher ready', J('C.missiles') === 6 && J('C.rockets.length') === 0 && J('C.nextRocket') === 0 && J('C.orders.missiles') === 0);
  const keys = ['camp.say.missiles', 'camp.say.missilesmother', 'camp.no.nomissiles', 'camp.no.missilewait', 'camp.no.nobig', 'camp.no.range', 'camp.ui.pausehelp'], md = src('content/text/ui.md');
  check('every word the launcher says is in content/text/ui.md and the game has it: a translation is a text edit', keys.every(k => md.includes('| ' + k + ' |') && J(`uiText('${k}')`) !== k), keys.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k).join());
  check('the words are the table\'s own: the answers are plain lines', J(`uiText('camp.say.missiles')`) === 'Missile away.' && J(`uiText('camp.no.nobig')`) === 'No big ship in missile range, pilot.' && J(`uiText('camp.cruiser.missiles')`) === 'MISSILES'); // (the count's words are the status block's since card space-game-missiles-cost-ore: tests/campmissilecost.mjs)
}

// ---------- B. firing ----------
console.log('B. firing');
{
  g.run('__m(1)');
  const none = J(`__fire('')`);
  check('no big ship in reach: refused in words, and no missile is spent', none.ok === false && none.code === 'nobig' && none.say === 'No big ship in missile range, pilot.' && J('C.missiles') === 6 && J('C.rockets.length') === 0);
  g.run(`window.__r1 = __foe('raider', 300, 0); window.__d1 = __foe('drone', 500, 0)`);
  check('a raider or a drone in reach is not a target: the missile is for big ships', J(`__fire('').code`) === 'nobig' && J('C.missiles') === 6);
  g.run(`window.__far = __foe('gunship', 2600, 0)`);
  check('a gunship 2,600 px off is beyond the lock (2,400 px): refused', J(`__fire('').code`) === 'nobig' && J('C.missiles') === 6);
  g.run('C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); window.__gun = __foe("gunship", 1500, 0, 5000)');
  const ok = J(`__fire('')`);
  check('a gunship in reach: "Missile away.", the magazine is five, one missile in the air, an event for the sound', ok.ok && ok.say === 'Missile away.' && J('C.missiles') === 5 && J('C.rockets.length') === 1 && J('C.rockets[0].target') === J('__gun') && J(`__ev('missile')`) === 1 && J('C.orders.missiles') === 1);
  const wait = J(`__fire('')`);
  check('pressed again at once: the launcher is still cycling (700 ms), nothing is spent', wait.ok === false && wait.code === 'missilewait' && J('C.missiles') === 5);
  g.run('__run(0.8)');
  check('0.8 s later it fires again', J(`__fire('').ok`) === true && J('C.missiles') === 4 && J('C.rockets.length') === 2);
  check('campCheck answers the same words and changes nothing (the ship computer checks, announces, then orders)', (() => { g.run('__run(0.8)'); const a = J(`campCheck(C, 'missiles', '')`); return a.ok && a.say === 'Missile away.' && J('C.missiles') === 4 && J('C.rockets.length') === 2; })());
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 5000); C.missiles = 0');
  const empty = J(`__fire('')`);
  check('an empty magazine: refused in words that say which key builds more, for ore', empty.ok === false && empty.code === 'nomissiles' && /R builds more, for ore/.test(empty.say) && J('C.rockets.length') === 0);
  g.run('__m(1)');
  check('the mothership named before it has come: "The mothership has not come yet."', J(`__fire('the mothership')`).code === 'nomother' && J('C.missiles') === 6);
  g.run('window.__mo = __foe("mother", 3000, 0)');
  check('the mothership named and out of reach (3,000 px): "out of missile range", nothing spent', J(`__fire('the mothership').code`) === 'range' && J('C.missiles') === 6);
  g.run('C.by[__mo].x = C.carrier.x + 1800; __foe("gunship", 400, 300, 5000)');
  const mo = J(`__fire('the mothership')`);
  check('in reach, named: the missile goes for the mothership even with a gunship nearer, and the line says so', mo.ok && mo.code === 'missilesmother' && mo.say === 'Missile away, at the mothership.' && J('C.rockets[0].target') === J('__mo'));
  g.run('__m(1); window.__mo = __foe("mother", 1800, 0); window.__gn = __foe("gunship", 400, 300, 5000)');
  check('not named: the mothership still comes first if it is in reach, else the nearest big ship', J(`__fire('')`).code === 'missilesmother' && J('C.rockets[0].target') === J('__mo') && (g.run('C.by[__mo].hp = 0; C.ships = C.ships.filter(u => u.hp > 0); C.rockets.length = 0; C.nextRocket = 0'), J(`__fire('').code`) === 'missiles' && J('C.rockets[0].target') === J('__gn')));
}

// ---------- C. flying ----------
console.log('C. flying');
{
  g.run('__m(1); window.__gun = __foe("gunship", -900, 0)'); // behind the carrier: the missile leaves the nose and has to turn
  g.run(`__fire(''); __run(0.1)`);
  const lv = J('C.rockets[0]');
  check('it leaves the tube slowly (the launch speed) in the way the nose points, then gets up to speed', lv && lv.sp > 100 && lv.sp < 250 && Math.abs(lv.rot) < 0.5, JSON.stringify(lv && { sp: lv.sp, rot: lv.rot }));
  g.run('__run(4)');
  check('a gunship behind the carrier is still hit: the missile turns round, it homes', J('__hp(__gun)') === 0 && J('C.rockets.length') === 0 && J(`__ev('mboom')`) === 1 && J('C.kills') === 1);
  g.run('__m(1); window.__gun = __foe("gunship", 1200, 0); window.__rd = __foe("raider", 1100, 40); window.__mid = __foe("drone", 600, 0)');
  g.run('C.by[__rd].hp = C.by[__rd].maxHp = 200; C.by[__mid].hp = C.by[__mid].maxHp = 200'); // tough, so what hurts them shows
  g.run(`__fire(''); __run(4)`);
  check('a gunship (80 hit points) dies to one missile', J('__hp(__gun)') === 0);
  check('a raider near the bang loses only the small damage (10), not the big one (120)', J('__hp(__rd)') === 190, J('__hp(__rd)'));
  check('a drone on the way, 600 px short of the target, is not touched: the fuze goes off on big ships only', J('__hp(__mid)') === 200 && J(`__ev('mboom')`) === 1);
  g.run('__m(1); window.__gun = __foe("gunship", 1200, 0, 3000); window.__e = campSpawn(C, "fighter", C.carrier.x + 1000, C.carrier.y + 30).id; /* 200 px short of the gunship: on a strafing run in, shooting (50 px off it, the fighter would be peeling away, which does not shoot: card space-game-fighter-flight) */ C.by[__e].vmax = 0; C.by[__e].accel = 0');
  g.run(`__fire(''); __run(4)`);
  check('the ships of Earth near the bang are not hurt (the pilot, which was shooting too, keeps its full hull: 36 times its strength)', J('__hp(__e)') === J('C.by[__e].maxHp') && J('C.by[__e].maxHp') === 36 * J('C.by[__e].str') && J('__hp(__gun)') <= 2880, J('__hp(__gun)'));
  g.run('__m(1); window.__mo = __foe("mother", 1500, 0)');
  g.run(`for (let i = 0; i < 6; i++) { __fire('the mothership'); __run(1); } __run(6)`);
  check('six missiles take most of the mothership\'s hit points (6 times the big damage) and not all: the missiles do most of it, the guns finish it', (() => { const left = J('CAMP.mother.hp') - 6 * J('CAMP.missile.big'); return left > 0 && left < J('CAMP.mother.hp') * 0.3 && J('__hp(__mo)') === left && J('C.missiles') === 0 && J('C.rockets.length') === 0 && J(`__ev('mboom')`) === 6; })(), J('__hp(__mo)'));
  check('and the seventh is refused: the magazine is empty', J(`__fire('the mothership').code`) === 'nomissiles');
  g.run('__m(1); window.__a = __foe("gunship", 1500, 0, 80); window.__b = __foe("gunship", 1500, 300, 80)');
  g.run(`__fire(''); __run(0.3); C.by[__a].hp = 0`); // another gun kills the target in flight
  g.run('__run(4)');
  check('the target dies on the way: the missile takes the nearest other big ship and kills it', J('__hp(__b)') === 0 && J('C.rockets.length') === 0 && J(`__ev('mfizzle')`) === 0);
  g.run('__m(1); window.__a = __foe("gunship", 1500, 0, 80)');
  g.run(`__fire(''); __run(0.3); C.by[__a].hp = 0; __run(9)`);
  check('no big ship left: it flies on and its fuel runs out (7 s), no bang and no damage to anyone', J('C.rockets.length') === 0 && J(`__ev('mfizzle')`) === 1 && J(`__ev('mboom')`) === 0);
}

// ---------- D. the magazine ----------
console.log('D. the magazine');
{
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 90000); __fire(""); __run(0.8); __fire(""); __run(0.8); __fire("")');
  check('three fired: three left', J('C.missiles') === 3);
  g.run('window.__o0 = C.ore; __run(60)');
  check('nothing reloads for free (card space-game-missiles-cost-ore): after a minute of play there is still no missile back, none is building and no ore is spent', J('C.missiles') === 3 && J('C.reloadAt') === 0 && J('C.ore') >= J('__o0'), J('C.missiles'));
  g.run('C.ore = 100; campOrder(C, "reload", "", "key"); campOrder(C, "reload", "", "key"); campOrder(C, "reload", "", "key"); __run(16)');
  check('three presses of R with ore queue three (card space-game-missile-queue: one a press), built one every 15 s: one comes back', J('C.missiles') === 4, J('C.missiles'));
  g.run('__run(15)');
  check('and the next 15 s another', J('C.missiles') === 5);
  g.run('__run(15)');
  check('the rack stops at the full magazine (6) and never goes past it', J('C.missiles') === 6 && J('C.reloadAt') === 0 && J('C.queued') === 0);
  g.run('__fire("")');
  check('a full magazine that fires one starts no build (it builds only at zero, or on R)', J('C.missiles') === 5 && J('C.reloadAt') === 0);
  check('the ore code adds with campMissileAdd: it says how many went in, up to the most the magazine holds (12)', J('campMissileAdd(C, 3)') === 3 && J('C.missiles') === 8 && J('campMissileAdd(C, 10)') === 4 && J('C.missiles') === 12 && J('campMissileAdd(C, 5)') === 0);
  g.run('__run(40)');
  check('more than the full is kept (nothing is built past 6, none taken away)', J('C.missiles') === 12);
  g.run('__m(1); C.missiles = 0; campMissileAdd(C, 2); window.__gun = __foe("gunship", 1500, 0, 90000)');
  check('an empty magazine refilled by ore fires again', J(`__fire('').ok`) === true && J('C.missiles') === 1);
}

// ---------- E. the words ----------
console.log('E. the words, the strip and the voice');
{
  const I = t => J(`campIntent(${JSON.stringify(t)})`);
  check('"fire missiles" is the order, with nothing named', I('fire missiles') && I('fire missiles').act === 'fleet_missiles' && I('fire missiles').arg === '');
  check('"missiles at the mothership", "fire the missiles at the mothership" name the mothership', I('missiles at the mothership').arg === 'mothership' && I('fire the missiles at the mothership').act === 'fleet_missiles' && /mothership/.test(I('fire the missiles at the mothership').arg));
  check('"launch missiles" is the launcher, not the bay: a bare "launch" is still the bay', I('launch missiles').act === 'fleet_missiles' && I('launch').act === 'fleet_launch' && I('launch the fighters').act === 'fleet_launch');
  check('"attack the mothership" is still the fighters', I('attack the mothership').act === 'fleet_attack');
  check('"attack the mothership with missiles" is the launcher', I('attack the mothership with missiles').act === 'fleet_missiles');
  check('"shoot a rocket", "send a torpedo at the mothership" (other words for it) work', I('shoot a rocket').act === 'fleet_missiles' && I('send a torpedo at the mothership').act === 'fleet_missiles');
  check('nothing else is taken for it: a question or a chat is left to the model', I('how do I jump') === null && I('hello') === null);
  g.run(`window.__scene = { scene: { key: 'Campaign' }, leaving: false, dead: false, camp: null, toasts: [] }; window.__nb = () => { __m(1); __scene.camp = C; };`);
  g.run('__nb(); window.__gun = __foe("gunship", 1500, 0, 5000)');
  const local = t => J(`(() => { const p = shipcompLocal(${JSON.stringify(t)}, __scene); return p ? { text: p.text, action: p.action, refused: p.refused, run: !!p.run } : null; })()`);
  const r0 = local('fire missiles');
  check('the strip or the voice: "fire missiles" is the fleet_missiles act, said in words, with a run, and nothing fired yet', r0 && r0.action === 'fleet_missiles' && r0.text === 'Missile away.' && r0.run && J('C.missiles') === 6);
  g.run('(() => { const p = shipcompLocal("fire missiles", __scene); p.run(__scene); })()');
  check('running it fires one, through the one door the key uses (campOrder)', J('C.missiles') === 5 && J('C.rockets.length') === 1 && J('C.orders.missiles') === 1);
  g.run('__nb()');
  check('with no big ship in reach the same words are refused in words and nothing is spent', (() => { const r = local('fire missiles'); return r && r.refused && r.text === 'No big ship in missile range, pilot.' && J('C.missiles') === 6; })());
  check('a fleet act outside the Campaign is still refused (the fleet is only yours there)', J(`shipcompPlan('SAY: ok\\nDO: fleet_missiles', { scene: { key: 'Space' } })`).refused === true);
  check('the model path: a reply "DO: fleet_missiles the mothership" is read and checked against the live battle', (() => { g.run('__nb(); window.__gun = __foe("mother", 1500, 0)'); const p = J(`(() => { const p = shipcompPlan('SAY: Firing.\\nDO: fleet_missiles the mothership', __scene); return { action: p.action, arg: p.arg, refused: p.refused, text: p.text }; })()`); return p.action === 'fleet_missiles' && !p.refused && p.text === 'Missile away, at the mothership.'; })());
  const sys = J('shipcompSystem(__scene)');
  check('the model is told in a battle: the key (Enter, a direct key, while no list is open), what it does, and the act on its list', /fleet_missiles/.test(sys) && /Enter fires a missile at the target/.test(sys) && /Q opens|Q /.test(sys) && !/SHIP panel|FLEET panel/.test(sys) && /holds Space to make its eight turrets fire/.test(sys) && /pick an enemy/.test(sys) && !/main gun/.test(sys));
  check('the state it is told says how many are left', /Missiles in the magazine: 6 of 6/.test(J('campSummary(C)')));
}

// ---------- F. Space and F ----------
console.log('F. Space and F: the turrets and the missiles do not share a key');
{
  g.run('__m(1); window.__a = __foe("gunship", 300, 0, 9000); window.__far = __foe("gunship", 1500, 0, 90000); C.input.fire = true; __run(2)');
  check('Space held: the turrets fire at the gunship in reach (300 px), and not one missile leaves: Space never launches', J('__hp(__a)') < 9000 && J('C.missiles') === 6 && J('C.rockets.length') === 0 && J('C.orders.missiles') === 0, J('__hp(__a)'));
  g.run('__m(1); window.__a = __foe("gunship", 300, 0, 9000); window.__far = __foe("gunship", 1500, 0, 90000); __run(2)');
  check('Space up: the turrets do not fire on their own (the gunship is whole) and no missile leaves by itself', J('__hp(__a)') === 9000 && J('C.bullets.filter(b => b.pd).length') === 0 && J('C.missiles') === 6);
  g.run('__m(1); window.__far = __foe("gunship", 1500, 0, 90000); window.__a = __foe("gunship", 700, 0, 9000); C.input.fire = true; __run(2)');
  check('a gunship 700 px off is beyond the turrets (500 px to the edge, and the gunship is small): Space held fires nothing at it', J('__hp(__a)') === 9000 && J('C.turrets.every(t => !t.target)'));
  g.run('__m(1); window.__far = __foe("gunship", 1500, 0, 90000); window.__a = __foe("gunship", 300, 0, 9000); __run(0.1); C.input.fire = false; var __before = C.missiles; ');
  check('F is the only key for missiles: the order launches one (and Space held at the same time does not make a second)', (g.run('C.input.fire = true; __fire("")'), J('C.missiles') === 5 && J('C.orders.missiles') === 1 && (g.run('__run(0.5)'), J('C.missiles') === 5)));
  check('the reach is about three and a half carrier lengths: the carrier is drawn 90 px long at 1.56 (140 px), and a turret reaches 500 px, more than two lengths', J('CAMP.carrier.pdRange') === 500 && J('CAMP.carrier.pdRange') >= 2 * 90 * J('CAMP_LOOK.carrier.scale'));
  check('the turrets take no ammunition: nothing of theirs is counted in the magazine, and there is no second gun input', !('gun' in J('CAMP.carrier')) && J('Object.keys(C.input).sort().join()') === 'blink,brake,fire,thrust,turn');
}

// ---------- G. the scene ----------
console.log('G. the scene (on a stand-in)');
{
  g.run(`
    window.__toasts = []; toast = (s, msg) => { __toasts.push(msg); };
    window.__rec = () => { const log = []; const p = new Proxy({}, { get: (t, k) => (k === 'log' ? log : (...a) => { log.push([k, ...a]); return p; }) }); return p; };
    window.__txt = () => ({ text: '', color: '', setColor(c) { this.color = c; return this; }, setText(t) { this.text = t; return this; } });
    window.__fake = () => { const f = Object.create(Campaign.prototype); f.add = __rec(); f.tweens = { add() {} }; f.cameras = document; f.input = document; f.textures = document; f.boom = { explode() {} };
      f.hud = {}; f.msp = {}; f.reachG = __rec(); f.mountG = __rec(); f.mode = 'play'; f.leaving = false; f.mp = null; f.camp = C; return f; };
  `);
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 90000); window.F = __fake(); F.syncRockets(33)');
  check('the HUD count is not a text of the scene any more (it is the status block\'s fourth line: tests/campmissilecost.mjs): the scene has none', J('typeof F.hud.missiles') === 'undefined');
  g.run('F.onKey({ code: "Enter" }); F.syncRockets(33)');
  check('Enter fires a missile through the order (campOrder) and says it', J('C.missiles') === 5 && J('C.orders.missiles') === 1 && J('__toasts.length') === 1 && J('__toasts[0]') === 'Missile away.');
  check('the count goes down by one (it is the status block\'s line now: MISSILES 5/6)', J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  5/6', J('campCruiserMissileLine(campCruiserStatus(C))'));
  g.run('__run(0.2); F.syncRockets(33)');
  check('the missile in the air has a sprite (a body and a flame), and it goes when the missile does', J('Object.keys(F.msp).length') === 1 && (g.run('__run(5); F.syncRockets(33)'), J('Object.keys(F.msp).length') === 0));
  g.run('F.onKey({ code: "Enter" }); F.onKey({ code: "Enter" })');
  check('an Enter with the launcher still cycling is answered in words, not ignored', J('__toasts[__toasts.length - 1]') === 'The launcher is still cycling.');
  g.run('C.missiles = 0; F.syncRockets(33)');
  check('an empty magazine reads 0/6 in the block (the line turns red there: tests/campmissilecost.mjs)', J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  0/6');
  g.run('__m(1); window.F = __fake(); window.__a = __foe("gunship", 300, 0, 9000); __run(0.1); F.syncRockets(33)');
  const log = J('F.reachG.log'), ring = log.find(l => l[0] === 'strokeCircle');
  check('the turrets\' reach is drawn as a ring round the carrier at the reach (500 px)', ring && ring[3] === 500 && Math.abs(ring[1] - J('C.carrier.x')) < 1 && Math.abs(ring[2] - J('C.carrier.y')) < 1, JSON.stringify(ring));
  const mlog = J('F.mountG.log');
  check('eight turrets are drawn (a base and a dot each), and each that has an alien in reach has a barrel toward it, though Space is up and none has fired', mlog.filter(l => l[0] === 'fillCircle').length === 16 && mlog.filter(l => l[0] === 'lineBetween').length === 8 && !mlog.some(l => l[0] === 'fillStyle' && l[1] === 0xffffff), JSON.stringify([mlog.filter(l => l[0] === 'fillCircle').length, mlog.filter(l => l[0] === 'lineBetween').length]));
  g.run('F.mountG.log.length = 0; C.input.fire = true; __run(0.2); F.syncRockets(33)');
  check('Space held: the turrets that fire flash white (a bright dot and a longer barrel)', J('F.mountG.log').some(l => l[0] === 'fillStyle' && l[1] === 0xffffff));
  g.run('F.mountG.log.length = 0; __m(1); F.camp = C; F.syncRockets(33)');
  check('nothing in reach: the mounts are drawn plain, with no aiming barrel: no amber line, at most the eight steel stubs along the heading (CAMP_MOUNT.stub, card space-game-campaign-look; none if that commit is reverted)', [0, 8].includes(J('F.mountG.log').filter(l => l[0] === 'lineBetween').length) && J('F.mountG.log').filter(l => l[0] === 'lineStyle').every(l => l[2] === J('CAMP_MOUNT.stub[1]')) && J('F.mountG.log').filter(l => l[0] === 'fillCircle').length === 16);
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 90000); F.camp = C; F.mode = "play"; F.onKey({ code: "Space" })');
  check('the scene: a Space key press launches nothing (Space is read as held, into the sim\'s fire input, every frame)', J('C.missiles') === 6 && J('C.rockets.length') === 0);
  g.run('F.onKey({ code: "Enter" })');
  check('and Enter launches one', J('C.missiles') === 5 && J('C.rockets.length') === 1);
  // Enter belongs to an open list (cards one-list-keys, list-shortcuts): it gives the highlighted order, or opens the part the highlight is on, and fires nothing; with the list closed it is the missile again
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 90000); F.camp = C; F.mode = "play"; F.pn = campPanelNew(); __toasts.length = 0; F.onKey({ code: "KeyP" }); window.__p0 = [campPanelOpen(F.pn), campPanelView(F.pn, C).rows[0].id, campPanelView(F.pn, C).rows[0].more]; F.onKey({ code: "Enter" }); window.__p1 = [C.missiles, C.rockets.length, C.orders.missiles, campPanelOpen(F.pn), !!(C.nav && C.nav.on), __toasts.length];');
  check('with the ship list open (P) Enter is the list\'s: on a part\'s row (Power, the top one) it opens that part\'s list; no missile is launched and no order is given', J('__p0').join() === 'ship,gpower,true' && J('__p1').join() === '6,0,0,power,false,0', JSON.stringify([J('__p0'), J('__p1')]));
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 90000); F.camp = C; F.mode = "play"; F.pn = campPanelNew(); __toasts.length = 0; F.onKey({ code: campKeyVia("goal").code }); window.__e0 = campPanelOpen(F.pn); window.__er = campPanelView(F.pn, C).rows[0].id; F.onKey({ code: "Enter" }); window.__e1 = [C.missiles, C.rockets.length, C.orders.missiles, campPanelOpen(F.pn), !!(C.nav && C.nav.on) || __toasts.length > 0];');
  check('with the autopilot list open (I, the part\'s own key) Enter is the list\'s: it gives the highlighted row (Fly to the goal) and no missile is launched', J('campKeyVia("goal").key') === 'I' && J('__e0') === 'nav' && J('__er') === 'goal' && J('__e1.slice(0, 3)').join() === '6,0,0' && J('__e1[4]') === true, JSON.stringify(J('__e1')));
  g.run('campPanelsClose(F); F.onKey({ code: "KeyQ" }); F.onKey({ code: "Escape" }); window.__e2 = [campPanelOpen(F.pn), F.mode, C.missiles]; F.onKey({ code: "Enter" });');
  check('Esc closes an open list (it does not pause), and with no list open Enter is the missile again', J('__e2').join() === ',play,6' && J('C.missiles') === 5 && J('C.rockets.length') === 1 && J('C.orders.missiles') === 1, JSON.stringify(J('__e2')));
  g.run('__m(1); window.__gun = __foe("gunship", 1500, 0, 90000); F.camp = C; F.pn = campPanelNew(); F.onKey({ code: "NumpadEnter" }); window.__e3 = C.missiles; F.onKey({ code: "KeyF" }); F.onKey({ code: "Digit6" });');
  check('the keypad\'s Enter is the same key (CAMP_KEYS.missile); F and a digit launch nothing', J('__e3') === 5 && J('C.missiles') === 5 && J('C.rockets.length') === 1);
  g.run('window.G2 = __fake(); G2.msp = null; G2.hud = {}; G2.syncRockets(33)');
  check('the scene makes its rockets\' sprites the first time (a scene made before this card, a test stand-in): msp is an object, there is no count text', J('typeof G2.msp') === 'object' && J('typeof G2.hud.missiles') === 'undefined');
  const sc = src('src/campaignscene.js'), md = src('content/text/ui.md');
  check('the scene has no word and no number of the launcher in it: it reads uiText and CAMP', !/MISSILES|Missile away|next in/.test(sc) && /uiText\('camp\.ui\.pausehelp'\)/.test(sc) && /CAMP\.missile/.test(sc));
  check('the key line names Space for the turrets and Enter for the missile, the pause card says so too (a line of its own, with the key from the table), and nothing says gun', /Space turrets/.test(J(`uiText('camp.ui.keys')`)) && /Enter missile/.test(J(`uiText('camp.ui.keys')`)) && !/gun/i.test(J(`uiText('camp.ui.keys')`)) && /camp\.ui\.pausehelp \| Hold Space: the turrets fire at ships close by\. \{keymissile\} fires a homing missile/.test(md));
  check('in the scene the missile is the direct key Enter (CAMP_KEYS.missile; a hint names it with {keymissile}), not a row of either list (what has a direct key is not listed), and Space is not: no line gives a missile to Space', J(`CAMP_KEYS.missile.codes.join()`) === 'Enter,NumpadEnter' && J(`CAMP_KEYS.missile.k`) === 'Enter' && J(`campKeyVar('keymissile')`) === 'Enter' && J(`campKeyIs('missile', 'Enter') && !campKeyIs('missile', 'Space')`) && J(`CAMP_PANELS.panels.every(p => p.rows.every(r => r.id !== 'missile' && r.order !== 'missiles' && !('code' in r)))`) && J(`(() => { const C = campNew(1, [], { seed: 1 }), P = campPanelNew(); return campPanelKey(P, C, 'Enter', 0).row; })()`) === 'missile' && !/SPACE[^\n]*campOrder\(C, 'missiles'|Space[^\n]*campOrder\(C, 'missiles'/.test(sc));
  check('the turrets\' shots are the Earth side\'s green like the pilots\' (no amber tint on a pd shot; card space-game-fleet-lasers-green: tests/campgreenshots.mjs)', !/b\.pd\) im\.setTint\(0xffd37a\)/.test(sc) && /b\.beam\) im\.setTint\(0x7fe9ff\); else im\.clearTint\(\)/.test(sc));
}

// ---------- H. nothing else moved ----------
console.log('H. nothing else moved');
{
  const play = (seed, withMissiles) => J(`(() => {
    window.C = campNew(1, [], { seed: ${seed} }); const out = [];
    for (let i = 0; i < 100 * 30 && !C.result; i++) { const s = i / 30; if (s > 1 && s < 1.04) campOrder(C, 'launch'); ${withMissiles ? `if (i % 90 === 0) campOrder(C, 'missiles', 'the mothership');` : ''} campStep(C, 1 / 30); C.events.length = 0; }
    return { t: Math.round(C.t), kills: C.kills, missiles: C.missiles, hull: Math.round(C.carrier.hp), shield: Math.round(C.earth.shield), result: C.result, orders: C.orders.missiles };
  })()`);
  const a = play(3, false), b = play(3, false), c = play(3, true), d = play(3, true);
  check('with no missile order a battle is what it was: the magazine stays full and nothing is in the air', a.missiles === 6 && a.orders === 0);
  check('the same seed flies the same, with or without missiles (they take no number from the game\'s dice)', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(c) === JSON.stringify(d), JSON.stringify([a, c]));
  g.run('__m(3)');
  const tw = J(`C.ships.filter(u => u.kind === 'tower').length`);
  g.run('(() => { const t = C.ships.find(u => u.kind === "tower"); window.__tw = t.id; C.carrier.x = t.x - Math.cos(t.rot) * 700; C.carrier.y = t.y - Math.sin(t.rot) * 700; C.carrier.rot = t.rot; C.ships.forEach(u => { if (u.kind === "tower") u.nextShot = 1e12; }); })()');
  g.run(`__fire(''); __run(0.8); __fire(''); __run(4)`);
  check('level 3: a tower (160 hit points) takes two missiles (120 each) and falls, and the others stand', tw === 12 && J('__hp(__tw)') === 0 && J(`C.ships.filter(u => u.kind === 'tower').length`) === 11 && J('C.kills') === 1, J('__hp(__tw)'));
  check('the turrets\' numbers: 4 a shot every 700 ms out to 500 px, eight of them; the carrier\'s hit circle is 25 px (CAMP.size, card space-game-campaign-look)', J('CAMP.carrier.pd') === 4 && J('CAMP.carrier.pdDelay') === 700 && J('CAMP.carrier.pdRange') === 500 && J('CAMP.carrier.mounts.length') === 8 && J('CAMP.size.carrier.hit') === 25);
  const doc = src('docs/CAMPAIGN.md'), tune = src('docs/CAMPAIGN-TUNING.md');
  check('the docs say it: the weapons in CAMPAIGN.md, the numbers in CAMPAIGN-TUNING.md', /missile/i.test(doc) && /F\b/.test(doc) && /missile\./.test(tune) && /camp\.ui\.pausehelp|pause/i.test(doc + tune));
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPMISSILES FAIL (${failed} of ${n})` : `\nCAMPMISSILES PASS (${n})`);
process.exitCode = failed ? 1 : 0;
