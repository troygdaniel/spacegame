// smoke: the W list's Attack and Guard rows act on the selected hostile and friend, named in the row, with no second list (plain Node, no Chrome)
// Card space-game-w-uses-selection (Troy, 23 Nov 2026: "in W (All squads), Guard the target should use the target I already selected"). src/data_controls.js (the rows: `sel`), src/camppanel.js (the row's name, state and run),
// src/camptarget.js (campSelOrder: the same rule as E R T), content/text/campwsel.md (the words).
//   A. the table: Attack and Guard the target carry `sel` ('hostile', 'friend') and no `pick`; Launch, Escort, Guard the cruiser, Recall and Mine are as they were
//   B. Attack: no hostile selected: grey with a hint (the keys come from the table), Enter refuses in words and picks nothing; one selected: the row names it, Enter sends the squads at it at once (no list, even with several hostiles about)
//   C. a selected pilot takes the order alone, as E does
//   D. Guard: no friend, a pilot or all three selected: grey with a hint; a ship you protect selected: the row names it, Enter sends the squads to guard it at once (no list, even with two to choose from)
//   E. the rest of the list is as it was: Escort still opens its sub-list; the pick sub-list is still there for it
//   F. the words: the helps and the hints say pick first
// Run: node tests/campwuseselect.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const sec = (name, fn) => { console.log(name); try { fn(); } catch (e) { check(name + ': ran without a throw', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  CAMP.levels[1].missions.push({ id: 'gt', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30], rocks: [], objectives: [{ type: 'hold', secs: 100000 }], bonus: [], convoys: [], waves: [], traffic: [] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__hauler = (id, name, dx, dy, tox, toy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + tox, y: C.carrier.y + toy }; f.cname = name; f.named = true; return f; };
  window.__raider = (dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__l1 = () => { window.C = campNew(1, [], { seed: 5, god: false, mission: __M }); C.arrivedAt = 0; campOrder(C, 'launch'); __run(8); return C; };
  window.__pn = () => { window.PP = campPanelNew(); return PP; };
  window.__k = (c, t) => campPanelKey(PP, C, c, t || 0);
  window.__w = id => { __pn(); __k('KeyW'); const rows = campPanelList(C, 'squads'), want = rows.findIndex(r => r.id === id); for (let k = 0, d = ((want - PP.at) % rows.length + rows.length) % rows.length; k < d; k++) __k('ArrowDown'); };
  window.__row = id => campPanelRows(C, 'squads').find(r => r.id === id);
  window.__orders = () => campWing(C, 'fighter').map(u => u.order);
`);
const row = id => J(`__row('${id}')`);

sec('A. the table', () => {
  g.run('__l1()');
  check('Attack and Guard the target carry `sel` (hostile, friend) and no `pick`; their table words stay Attack the target and Guard the target (the hints read them)',
    J(`['attack:hostile', 'fguardt:friend'].every(s => { const [id, k] = s.split(':'), r = campKeyRow(id); return r.sel === k && !r.pick; })`) && J(`campKeyRow('attack').label === 'Attack the target' && campKeyRow('fguardt').label === 'Guard the target'`));
  check('the list has the rows it had, and Escort the convoy and Mine ore still pick (escort, field)', J(`campPanelList(C, 'squads').map(r => r.id).join()`) === 'launch,attack,escort,fguard,fguardt,frecall,fmine' && J(`campKeyRow('escort').pick === 'escort' && campKeyRow('fmine').pick === 'field'`));
  check('the helps say the selection: "All squads attack the selected hostile", "All squads guard the selected friend"', J(`campKeyRow('attack').help`) === 'All squads attack the selected hostile' && J(`campKeyRow('fguardt').help`) === 'All squads guard the selected friend');
});

sec('B. Attack with and without a selected hostile', () => {
  g.run('__l1(); window.__a = __raider(1500, 400); window.__b = __raider(-900, 700); window.__c = __raider(300, -1800); C.tgt = ""; C.sel = "";');
  const r0 = row('attack');
  check('nothing selected, three hostiles about: the row is grey, still called Attack the target, and says to pick with [ ] or S (short: pick one)', r0.ok === false && r0.label === 'Attack the target' && r0.state === 'pick one with [ ] or S' && r0.short === 'pick one', JSON.stringify(r0));
  g.run('__w("attack")');
  const o = J(`__k('Enter')`);
  check('Enter on the grey row refuses in words, opens no sub-list, picks no hostile for the player and leaves the squads as they were', o.ran && !o.ok && /No hostile selected/.test(o.say) && J('PP.pick') === null && J('PP.open') === 'squads' && J(`C.tgt`) === '' && J(`__orders().every(x => x.type === 'guard')`), JSON.stringify(o));
  g.run('C.tgt = __b.id;');
  const nm = J('campTgtName(C)'), r1 = row('attack');
  check('a hostile selected: the row names it ("Attack ' + nm + '"), is ready, and says who goes and how far', r1.ok === true && r1.label === 'Attack ' + nm && /^all squads, \d+ km$/.test(r1.state) && /^\d+ km$/.test(r1.short), JSON.stringify(r1));
  g.run('__w("attack")');
  const o2 = J(`__k('Enter')`);
  check('Enter sends all three squads at the selected hostile at once: no sub-list (three hostiles about), the list closes, the target stays', o2.ran && o2.ok && J('PP.pick') === null && J('PP.open') === '' && J('C.tgt') === J('__b.id') && J(`__orders().every(x => x.type === 'attack' && x.target === __b.id)`), JSON.stringify(o2));
});

sec('C. a selected pilot takes the order alone', () => {
  g.run('__l1(); window.__a = __raider(1500, 400); window.__b = __raider(-900, 700); C.tgt = __b.id; C.sel = "pilot:green";');
  const r = row('attack');
  check('a pilot selected: the row says who goes (Kara), not all squads', r.ok && /^Kara, \d+ km$/.test(r.state), JSON.stringify(r));
  g.run('__w("attack")');
  const o = J(`__k('Enter')`);
  check('Enter: Kara alone attacks the hostile; Wedge and Apollo keep guarding the cruiser', o.ran && o.ok && J(`campWingShips(C, 'green').every(u => u.order.type === 'attack' && u.order.target === __b.id)`) && J(`['red', 'yellow'].every(s => campWingShips(C, s).every(u => u.order.type === 'guard'))`), JSON.stringify(o));
});

sec('D. Guard with and without a selected friend', () => {
  g.run('__l1(); window.__t = __hauler("t1", "Transport", 500, 0, 9000, 0); window.__h = __hauler("h2", "Hauler 2", -600, 200, -9000, 200); C.tgt = ""; C.sel = "";');
  const r0 = row('fguardt');
  check('nothing selected, two ships to guard: the row is grey, still called Guard the target, and says to pick with A or D', r0.ok === false && r0.label === 'Guard the target' && r0.state === 'pick a ship with A or D' && r0.short === 'pick one', JSON.stringify(r0));
  g.run('__w("fguardt")');
  const o = J(`__k('Enter')`);
  check('Enter on the grey row refuses in words, opens no sub-list and gives no order (the squads still guard the cruiser)', o.ran && !o.ok && /No ship selected to guard/.test(o.say) && J('PP.pick') === null && J('PP.open') === 'squads' && J(`__orders().every(x => x.type === 'guard' && x.at.kind === 'carrier')`), JSON.stringify(o));
  g.run('C.sel = "pilot:red";');
  check('a pilot selected: nothing to guard in that (a pilot is not a ship to guard): grey, the same hint', row('fguardt').ok === false && row('fguardt').state === 'pick a ship with A or D');
  g.run('C.sel = "all";');
  check('all three pilots selected: grey as well', row('fguardt').ok === false);
  g.run('C.sel = "freighter-h2";');
  const r1 = row('fguardt');
  check('a ship you protect selected: the row names it ("Guard Hauler 2 convoy"), is ready, and says who goes and how far', r1.ok === true && /^Guard Hauler 2/.test(r1.label) && /^all squads, \d+ km$/.test(r1.state) && /^\d+ km$/.test(r1.short), JSON.stringify(r1));
  g.run('__w("fguardt")');
  const o2 = J(`__k('Enter')`);
  check('Enter sends all three squads to guard it at once: no sub-list (two ships to choose from), the list closes, the orders are guards at that ship', o2.ran && o2.ok && J('PP.pick') === null && J('PP.open') === '' && J(`__orders().every(x => x.type === 'guard' && x.at.id === 'freighter-h2')`), JSON.stringify(o2));
  g.run('__l1(); window.__t = __hauler("t1", "Transport", 500, 0, 9000, 0);');
  check('with no ship to guard at all the row is grey with the hint to pick (the outposts cannot be selected, so they are not offered)', row('fguardt').ok === false && J(`campSelList(C).every(e => e.kind === 'pilot' || e.kind === 'ward')`));
});

sec('E. the rest of the list is as it was', () => {
  g.run('__l1(); window.__t = __hauler("t1", "Transport", 500, 0, 9000, 0); window.__h = __hauler("h2", "Hauler 2", -600, 200, -9000, 200); C.tgt = ""; C.sel = "";');
  g.run('__w("escort")');
  const o = J(`__k('Enter')`);
  check('Escort the convoy with two ships to choose from still opens its sub-list (no order yet)', !o.ran && !!J('PP.pick') && J('PP.pick.kind') === 'escort' && J('PP.open') === 'squads', JSON.stringify(o));
  g.run('__k("Escape")');
  check('Esc goes back to the list, and Launch the wing, Guard the cruiser and Recall are rows with no selection words', J('PP.pick') === null && ['launch', 'fguard', 'frecall'].every(id => !J(`campKeyRow('${id}').sel`)));
  check('Guard the cruiser is ready with nothing selected (it needs no selection)', row('fguard').ok === true && row('fguard').label === 'Guard the cruiser');
});

sec('F. the words', () => {
  const t = k => J(`uiText('${k}')`);
  check('the hints that sent the player to the W row tell them to pick first: the nudge, the lose tip, the 1.1 walk step and the 1.2 hint say S (the nearest hostile) before W',
    /\bS\b/.test(t('camp.nudge.attack')) && /\bS\b/.test(t('camp.lose.tip.earth')) && /\bS\b/.test(t('camp.bf.1.1.s3')) && /\bS\b/.test(t('camp.hint.l1p.contact')), [t('camp.nudge.attack'), t('camp.lose.tip.earth'), t('camp.bf.1.1.s3'), t('camp.hint.l1p.contact')].join(' | '));
  check('the two row names and the two refusals are content (a key of the table is filled in), no braces left', ['camp.w.attack', 'camp.w.guard', 'camp.no.nohostile', 'camp.no.nofriend', 'camp.w.nohostile.state', 'camp.w.nofriend.state'].every(k => { const s = J(`uiText('${k}', { name: 'X' })`); return s && !/\{/.test(s) && s !== k; }));
});

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nAll ${n} checks passed.`);
process.exit(failed ? 1 : 0);
