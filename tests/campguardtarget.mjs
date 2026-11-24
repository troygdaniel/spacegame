// smoke: Guard the target, a row beside Guard the cruiser in every squad list (plain Node, no Chrome)
// Card space-game-guard-the-target (Troy, 22 Nov 2026: "a Guard the target along with Guard the cruiser, so I can assign a squad to do that"). src/data_controls.js (the rows), src/camppick.js (the candidates), src/camppanel.js (the row's
// run and state), src/campwing.js (campWingGuardStep: the order ends when the ship is lost or safe, and the radio says so), content/text/campguard.md.
//   A. the table: W, E, R and T each have Guard the target right after Guard the cruiser (a wing row of the verb guard, pick: 'guard'); the escorts' list is as it was
//   B. the candidates: the ships you protect (nearest the cruiser first), then the outposts; with one the order is given at once, with several the sub-list opens (Esc goes back); none: the row is grey with its reason and Enter refuses in words
//   C. the order: the squad guards that ship in formation beside it, the other squads keep their orders, two squads can guard two ships; a hostile selected does not stop it
//   D. the end: the ship lost or safe: the group goes back to guarding the cruiser, and the radio says so once for the group; another order ends it too
//   E. the words
// Run: node tests/campguardtarget.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run('campFleetListSet(true); // this suite is about the all-squads list (W): it is switched off in the game with the old fleet switch (card space-game-keys-orders; CAMP_FLEET_LIST) and on here');
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
`);
const lens = id => J(`campPanelList(C, '${id}').map(r => r.id).join()`);
// the way to Guard the target a player has now (card space-game-bracket-select-orders: the squads' own lists are gone): W, Down to the row
const toGuardT = () => g.run(`(() => { __pn(); __k('KeyW'); const rows = campPanelList(C, 'squads'), want = rows.findIndex(r => r.id === 'fguardt'); for (let k = 0, d = ((want - PP.at) % rows.length + rows.length) % rows.length; k < d; k++) __k('ArrowDown'); })()`);

// ---- A. the table ----
console.log('A. the table');
g.run('__l1()');
check('the all-squads list has Guard the target right after Guard the cruiser, as a wing row of the verb guard that acts on the selected friend (sel: friend, no pick: card space-game-w-uses-selection): W all squads', J(`['squads:fguard:fguardt:fighters'].every(s => { const [l, a, b, grp] = s.split(':'), ids = campPanelDef(l).rows.map(r => r.id), r = campKeyRow(b); return ids.indexOf(b) === ids.indexOf(a) + 1 && r.label === 'Guard the target' && r.sel === 'friend' && !r.pick && r.wing[0] === grp && r.wing[1] === 'guard' && campKeyRow(a).label === 'Guard the cruiser'; })`));
check('the list is one row longer (7), every row id is still its own in the whole table, and Escort the convoy is still a row of the all-squads list (it is the same flight beside a convoy ship; it stays: the bots, the briefings and 1.1\'s hints use it)', lens('squads') === 'launch,attack,escort,fguard,fguardt,frecall,fmine' && J(`new Set(CAMP_PANELS.panels.flatMap(p => p.rows.map(r => r.id))).size === CAMP_PANELS.panels.flatMap(p => p.rows).length`) && J(`campKeyRow('escort').pick === 'escort'`));

// ---- B. the selected friend and the row ----
console.log('B. the selected friend');
g.run('__l3()');
check('a level with no ship to guard and no outpost (nothing to pick): the row is grey with the hint ("pick a friendly with O or P", short "pick one") in the all-squads list; the other rows are as they were', J(`campFriList(C).length`) === 0 && J(`['fguardt'].every(id => { const l = campKeyVia(id).id, r = campPanelRows(C, l).find(x => x.id === id); return r && r.ok === false && r.state === 'pick a friendly with O or P' && r.short === 'pick one'; })`) && J(`campPanelRows(C, 'squads').find(r => r.id === 'fguard').ok`) === true);
check('Enter on the grey row refuses in words and changes nothing: the squads still guard the cruiser (never a guard of the cruiser given by a side door)', (() => { toGuardT(); const r = J(`__k('Enter')`); return J('PP.open') === 'squads' && J(`campPanelList(C, 'squads')[PP.at].id`) === 'fguardt' && r.ran && !r.ok && /No ship selected to guard/.test(r.say) && J(`campWing(C, 'fighter').every(u => u.order.at.kind === 'carrier')`) && J('C.orders.guard | 0') === 0; })());
g.run(`window.__t = __hauler('t1', 'Transport', 500, 0, 9000, 0);`);
check('one ship to guard (the transport) but none selected: the row is still grey, and Enter refuses; the ship is the friendly , and . step through (no pilot is in that list)', J(`campFriList(C).map(e => e.id).join()`) === 'freighter-t1' && (() => { toGuardT(); const row = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt')`), r = J(`__k('Enter')`); return !row.ok && r.ran && !r.ok && J('PP.pick') === null && J(`campWing(C, 'fighter').every(u => u.order.at.kind === 'carrier')`); })());
check('the transport selected (P steps the friendlies: the ships you protect, then the outposts): the row names it ("Guard Transport", the name P shows), is ready, and Enter gives the order at once, with no list: "Fighters, guard Transport convoy."', (() => { g.run(`__pn(); C.fsel = 'freighter-t1';`); toGuardT(); const row = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt')`), r = J(`__k('Enter')`); return row.ok && row.label === 'Guard Transport' && r.ran && r.ok && /guard Transport convoy/.test(r.say) && J('PP.open') === '' && J('PP.pick') === null && J('C.fsel') === 'freighter-t1' && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard' && u.order.at.id === 'freighter-t1')`); })());
check('E with the ship picked as the friendly (who is All pilots) sends all three squads to guard it; with a pilot picked as who and no friendly, that pilot alone guards the cruiser; with none picked, all guard the cruiser (cards space-game-bracket-select-orders, space-game-keys-select, space-game-keys2-orders: E is the one order key: a friendly picked, guard it; none picked, form up on the cruiser)', (() => { g.run(`campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn(); C.sel = 'all'; C.fsel = '';`); const ids = J(`campSelList(C).map(e => e.id).join()`), fr = J(`campFriList(C).map(e => e.id).join()`); g.run(`C.fsel = 'freighter-t1';`); const a = J(`__k('KeyE')`), allAt = J(`campWing(C, 'fighter').every(u => u.order.type === 'guard' && u.order.at.id === 'freighter-t1')`); g.run(`C.sel = 'pilot:green'; C.fsel = '';`); const b = J(`__k('KeyE')`), green = J(`campWingShips(C, 'green').every(u => u.order.at.kind === 'carrier')`) && J(`campWingShips(C, 'red').every(u => u.order.at.id === 'freighter-t1')`); g.run(`C.sel = 'all'; C.fsel = '';`); const c = J(`__k('KeyE')`), none = J(`campWing(C, 'fighter').every(u => u.order.at.kind === 'carrier')`); return ids === 'all,pilot:red,pilot:green,pilot:yellow' && fr === 'freighter-t1' && a.ran && a.ok && allAt && b.ok && green && c.ok && none; })());
g.run(`window.__h = __hauler('h2', 'Hauler 2', -600, 200, -9000, 200);`);
check('two ships to guard: no sub-list any more (card space-game-w-uses-selection): the one picked as the friendly is the one guarded, whichever of the two it is; who is a pilot or All pilots does not change the row (a pilot takes the order alone), and with no friendly it is grey', (() => {
  g.run(`campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn(); C.sel = 'all'; C.fsel = 'freighter-h2';`); toGuardT(); const o = J(`__k('Enter')`);
  const h2 = o.ran && o.ok && /guard Hauler 2 convoy/.test(o.say) && J('PP.open') === '' && J('PP.pick') === null && J(`campWing(C, 'fighter').every(u => u.order.at.id === 'freighter-h2')`);
  g.run(`campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn(); C.fsel = 'freighter-t1';`); toGuardT(); const o2 = J(`__k('Enter')`);
  const t1 = o2.ran && o2.ok && J(`campWing(C, 'fighter').every(u => u.order.at.id === 'freighter-t1')`);
  g.run(`C.sel = 'pilot:red';`); const gp = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt').ok`) === true; g.run(`C.sel = 'all'; C.fsel = '';`); const ga = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt').ok`) === false;
  return h2 && t1 && gp && ga;
})());
check('with a friendly and an enemy both set in C (the keys never do: one target is held, but the rules still read each field): the squads are sent to the ship picked with O or P, and the enemy field is left alone', (() => { g.run(`window.__al = campSpawn(C, 'raider', C.carrier.x + 1500, C.carrier.y + 400); C.tgt = __al.id; C.fsel = 'freighter-t1'; campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn();`); const row = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt')`); toGuardT(); g.run('__k("Enter");'); return row.ok && J('PP.pick') === null && J('C.tgt') === J('__al.id') && J(`campWing(C, 'fighter').every(u => u.order.at.id === 'freighter-t1')`); })());
g.run('__l1()');
g.run(`window.__t = __hauler('t1', 'Transport', 500, 0, 9000, 0);`);
check('the outposts are no stop of O and P (card space-game-keys3-select: the friendly cycle is the ships you protect; a click on an outpost on the map holds it): in a level with outposts the friendlies are the transport alone, an outpost is held by campFriHold, and with none picked the row is grey', J(`campFriList(C).map(e => e.id).join()`) === 'freighter-t1' && J(`campOutposts(C.level).length`) >= 2 && (() => { g.run(`C.fsel = ''; __pn();`); const grey = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt').ok`) === false; g.run(`campFriHold(C, 'place:luna'); C.fsel = ''`); return grey; })());
check('an outpost picked as the friendly is guarded: the row names it and Enter sends all three squads to hold it', (() => { const post = J(`campFriPlace(C, 'place:luna')`); g.run(`campFriHold(C, '${post.id}'); campWingOrder(C, 'fighters', 'guard', null, 'key'); __pn();`); const row = J(`campPanelRows(C, 'squads').find(r => r.id === 'fguardt')`); toGuardT(); const r = J(`__k('Enter')`); return row.ok && row.label === 'Guard ' + post.name && r.ran && r.ok && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard' && u.order.at.id === '${post.id.replace('place:', '')}')`); })());

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
check('the words are short enough to say (about 12 words) and the refusal and the row\'s name are there', ['camp.say.wing.guardlost', 'camp.say.wing.guardsafe', 'camp.no.noguard'].every(k => J(`uiText('${k}', { group: 'The wing', name: 'Transport convoy' })`).split(/\s+/).length <= 12) && J(`uiText('camp.w.guard', { name: 'Transport convoy' })`) === 'Guard Transport convoy');
check('the guard step is called every tick (campTick) and the sel kind is documented in the table\'s header', /campWingGuardStep\(C\)/.test(src('src/campaign.js')) && /sel: 'hostile' \| 'friend' makes it a row that acts on what is SELECTED/.test(src('src/data_controls.js')));

console.log(failed ? `\nCAMP GUARD TARGET FAIL (${failed} of ${n})` : `\nCAMP GUARD TARGET PASS (${n} checks)`); process.exit(failed ? 1 : 0);
