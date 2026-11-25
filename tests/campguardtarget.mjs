// smoke: Guard the target: the order key sends the squads to the ship or outpost picked as the friendly; the squad guards it in formation, the end is said (plain Node, no Chrome)
// Card space-game-guard-the-target (Troy, 22 Nov 2026: "a Guard the target along with Guard the cruiser, so I can assign a squad to do that"), whose rows in the squads' lists are gone (card space-game-delete-off-lists): the order is the key W (src/camptarget.js campSelOrder), with a friendly picked with [. src/camppick.js (the candidates), src/campwing.js (campWingGuardStep: the order ends when the ship is lost or safe, and the radio says so), content/text/campguard.md.

//   B. the selected friend: the ships you protect (nearest the cruiser first), then an outpost held on the map; W sends all three squads to guard the one picked, a pilot picked alone takes the order alone, with none picked they guard the cruiser
//   C. the order: the squad guards that ship in formation beside it, the other squads keep their orders, two squads can guard two ships; a hostile selected does not stop it
//   D. the end: the ship lost or safe: the group goes back to guarding the cruiser, and the radio says so once for the group; another order ends it too
//   E. the words
// Run: node tests/campguardtarget.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  CAMP.levels[1].missions.push({ id: 'gt', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30], rocks: [], objectives: [{ type: 'hold', secs: 100000 }], bonus: [], convoys: [], waves: [], traffic: [] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__ev = [];
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; } };
  window.__hauler = (id, name, dx, dy, tox, toy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + tox, y: C.carrier.y + toy }; f.cname = name; f.named = true; return f; };
  // a battle in the test mission of level 1 (outposts: Occator Works, the Lunar Base, Earth) and one in level 3 (no outpost), the wing out, six fighters in three squads
  window.__l1 = () => { window.C = campNew(1, [], { seed: 5, god: false, mission: __M }); C.arrivedAt = 0; campOrder(C, 'launch'); __run(8); return C; };
  window.__l3 = () => { window.C = campNew(3, [], { seed: 5, god: false }); C.arrivedAt = 0; C.L.waves = []; C.waves = []; campOrder(C, 'launch'); __run(8); return C; };
  window.__pn = () => { window.PP = campPanelNew(); return PP; };
  window.__k = (c, t) => campPanelKey(PP, C, c, t || 0);
  window.__ko = () => campPanelKey(PP, C, 'Enter', 0); // the order key is W (card space-game-keys4-onekey)
`);


// ---- B. the selected friend ----
console.log('B. the selected friend');
g.run('__l3()');
g.run(`window.__t = __hauler('t1', 'Transport', 500, 0, 9000, 0);`);
check('W with the ship picked as the friendly (who is All pilots) sends all three squads to guard it; with a pilot picked as who and no friendly, that pilot alone guards the cruiser; with none picked, all guard the cruiser (cards space-game-bracket-select-orders, space-game-keys-select, space-game-keys2-orders, space-game-keys4-onekey: W is the one order key: a friendly picked, guard it; none picked, form up on the cruiser)', (() => { g.run(`campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn(); C.sel = 'all'; C.fsel = '';`); const ids = J(`campSelList(C).map(e => e.id).join()`), fr = J(`campFriList(C).map(e => e.id).join()`); g.run(`C.fsel = 'freighter-t1';`); const a = J(`__ko()`), allAt = J(`campWing(C, 'fighter').every(u => u.order.type === 'guard' && u.order.at.id === 'freighter-t1')`); g.run(`C.sel = 'pilot:green'; C.fsel = '';`); const b = J(`__ko()`), green = J(`campWingShips(C, 'green').every(u => u.order.at.kind === 'carrier')`) && J(`campWingShips(C, 'red').every(u => u.order.at.id === 'freighter-t1')`); g.run(`C.sel = 'all'; C.fsel = '';`); const c = J(`__ko()`), none = J(`campWing(C, 'fighter').every(u => u.order.at.kind === 'carrier')`); return ids === 'all,pilot:red,pilot:green,pilot:yellow' && fr === 'freighter-t1' && a.ran && a.ok && allAt && b.ok && green && c.ok && none; })());
g.run('__l1()');
g.run(`window.__t = __hauler('t1', 'Transport', 500, 0, 9000, 0);`);
check('the outposts are no stop of [ (the friendly cycle is the ships you protect; a click on an outpost on the map holds it): in a level with outposts the friendlies are the transport alone, and an outpost is held by campFriHold', J(`campFriList(C).map(e => e.id).join()`) === 'freighter-t1' && J(`campOutposts(C.level).length`) >= 2 && (g.run(`campFriHold(C, 'place:luna'); C.fsel = ''`), true));
check('an outpost picked as the friendly is guarded: W sends all three squads to hold it', (() => { const post = J(`campFriPlace(C, 'place:luna')`); g.run(`campFriHold(C, '${post.id}'); campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn(); C.sel = 'all';`); const r = J(`__ko()`); return r.ran && r.ok && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard' && u.order.at.id === '${post.id.replace('place:', '')}')`); })());

// ---- C. the order ----
console.log('C. the order');
g.run('__l3()');
g.run(`window.__t = __hauler('t1', 'Transport', 500, 0, 3000, 0); window.__h = __hauler('h2', 'Hauler 2', 400, 500, 3000, 500);`);
g.run(`campWingOrder(C, 'red', 'guard', __t.id, 'key'); campWingOrder(C, 'green', 'guard', __h.id, 'key'); __run(14);`);
const near = (s, id) => J(`campWingShips(C, '${s}').map(u => Math.round(Math.hypot(u.x - C.by['${id}'].x, u.y - C.by['${id}'].y)))`);
check('two squads guard two ships: after 14 s each is beside its own ship (inside 350 px of it; the guarded ship has moved 200 px or more on its road) and the third squad stays by the cruiser', near('red', 'freighter-t1').every(d => d < 350) && near('green', 'freighter-h2').every(d => d < 350) && J(`campWingShips(C, 'yellow').every(u => Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) < 600)`) && J('__t.x - (C.carrier.x + 500)') > 150, JSON.stringify([near('red', 'freighter-t1'), near('green', 'freighter-h2')]));
g.run(`window.__fx = campSpawn(C, 'raider', __t.x + 500, __t.y + 100); __fx.hp = 400; __fx.maxHp = 400; __run(25);`);
check('a raider that comes at the guarded ship is met by that squad (it is hurt or dead inside 25 s) and the squad is back beside the ship afterwards', (J('__fx.hp') < 400 || J('__fx.hp') <= 0) && (J('__fx.hp') <= 0 ? near('red', 'freighter-t1').every(d => d < 600) : true), J('__fx.hp'));

// ---- D. the end ----
console.log('D. the end');
const said = k => J(`__ev.filter(e => e.type === 'say' && e.key === '${k}').map(e => e.vars.group + '|' + e.vars.name)`);
g.run('__l3(); window.__t = __hauler("t1", "Transport", 500, 0, 9000, 0); window.__h = __hauler("h2", "Hauler 2", 400, 500, 9000, 500); campWingOrder(C, "red", "guard", __t.id, "key"); campWingOrder(C, "green", "guard", __h.id, "key"); __run(3);');
g.run('__ev.length = 0; __t.hp = 0; __run(0.1);');
check('the guarded ship is lost: the red squad goes back to guarding the cruiser, the green squad still guards its own ship, and the radio says it ONCE for the squad (two ships): "Red squad, Transport convoy is lost. Back to the cruiser."', J(`campWingShips(C, 'red').every(u => u.order.at.kind === 'carrier')`) && J(`campWingShips(C, 'green').every(u => u.order.at.id === 'freighter-h2')`) && JSON.stringify(said('camp.say.wing.guardlost')) === '["Wedge|Transport convoy"]' && J(`uiText('camp.say.wing.guardlost', { group: 'Wedge', name: 'Transport convoy' })`) === 'Wedge, Transport convoy is lost. Back to the cruiser.', JSON.stringify(said('camp.say.wing.guardlost')));
g.run('__ev.length = 0; __h.hp = 0; __h.arrived = true; __run(0.1);');
check('the guarded ship arrives (safe): the green squad goes back to the cruiser and the radio says "safe", not "lost"', J(`campWingShips(C, 'green').every(u => u.order.at.kind === 'carrier')`) && JSON.stringify(said('camp.say.wing.guardsafe')) === '["Kara|Hauler 2 convoy"]' && said('camp.say.wing.guardlost').length === 0);
g.run('__l3(); window.__t = __hauler("t1", "Transport", 500, 0, 9000, 0); campWingOrder(C, "red", "guard", __t.id, "key"); campWingOrder(C, "red", "attack", null, "key"); __ev.length = 0; __t.hp = 0; __run(0.1);');
check('another order ends the guard: the red squad attacks, the ship\'s loss afterwards says nothing and changes nothing (the squad is not guarding it)', J(`campWingShips(C, 'red').every(u => u.order.type === 'attack')`) && said('camp.say.wing.guardlost').length === 0);
g.run('__l3(); window.__t = __hauler("t1", "Transport", 500, 0, 9000, 0); campWingOrder(C, "all", "guard", __t.id, "key"); __ev.length = 0; __t.hp = 0; __run(0.1);');
check('the whole wing (W list) can guard a ship too, and its end is said once: once, under the group the order was given to (not once for each squad)', J(`campWingShips(C, 'all').every(u => u.order.at.kind === 'carrier')`) && JSON.stringify(said('camp.say.wing.guardlost')) === '["All ships|Transport convoy"]', JSON.stringify(said('camp.say.wing.guardlost')));

// ---- E. the words ----
console.log('E. the words');
check('the words are short enough to say (about 12 words)', ['camp.say.wing.guardlost', 'camp.say.wing.guardsafe'].every(k => J(`uiText('${k}', { group: 'The wing', name: 'Transport convoy' })`).split(/\s+/).length <= 12));
check('the guard step is called every tick (campTick)', /campWingGuardStep\(C\)/.test(src('src/campaign.js')));

console.log(failed ? `\nCAMP GUARD TARGET FAIL (${failed} of ${n})` : `\nCAMP GUARD TARGET PASS (${n} checks)`); process.exit(failed ? 1 : 0);
