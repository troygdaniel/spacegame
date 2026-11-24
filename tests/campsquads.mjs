// smoke: the fighters' three squads (Red, Green, Yellow): who is in which, an order to one squad, the lists and keys that give it, the words, the squad ring and the map's coloured dots that show only for a squad in focus (plain Node, no Chrome)
// Card space-game-fighter-squads (Troy, 22 Nov 2026: "I want to be able to control fighter squads easily": W all squads, E red, R green, T yellow, each Attack the target, Guard the cruiser, Recall; W also Launch and Mine ore).
// The sim is src/campwing.js (campSquadNext, the groups 'red' 'green' 'yellow' of CAMP.wing) and src/campaign.js (a fighter gets u.squad when it leaves the bay); the lists are CAMP_PANELS (src/data_controls.js).
//   A. who is in a squad: six fighters are two and two and two, the escorts are in none, a later fighter fills the thinnest squad, a lost squad is filled again, a mended fighter goes out in its own squad, no random number is used
//   B. an order to one squad moves that squad only (attack, guard, recall); two squads hold two targets; all squads is every fighter; Recall while the bay is emptying
//   C. a squad with no ship out: the refusal in words, and the rows of its list grey with the reason
//   D. the keys and the lists: W E R T open their lists, each Attack, Guard, Recall (W also Mine ore and Launch), the escorts and the convoy are rows of Q with no key of their own, the keys of the old layout mean the new
//   E. the words: red squad attack the raider, yellow guard, all squads recall, cancel the green squad; the ship computer is told them
//   F. the map: the mark of a squad in focus carries its squad (the others are plain), the legend names the squads in focus, the three colours are three
//   G. the ring: no tint on the fighters; a ring for the squad in focus (the Q row, the open list), kept 8 s after an order, let go on another squad, X or the time
//   H. launching through the lists
// Run: node tests/campsquads.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about the lists and the keys as they were, with the power list, so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
g.run('campFleetListSet(true)'); // this suite is about the lists' code, Q's pop-up included: it is switched off in the game (CAMP_FLEET_LIST, card space-game-q-selects-all) and on here; tests/campselect.mjs has the game's own state
g.run('campShipListSet(true)'); // and the ship list too: it is switched off in the game (CAMP_SHIP_LIST, card space-game-p-opens-power: P opens power) and on here; tests/campselect.mjs has the game's own state
const R3 = x => x, R2 = x => x; // the order of a squad, as __ord writes it: one pilot flies each squad now (card space-game-three-pilots), so a squad's orders are one
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__new = (seed) => { window.C = campNew('home', [], { seed: seed || 1, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); C.motherSpawn = 1e12; return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__out = seed => { __new(seed); campOrder(C, 'launch'); __run(8); return C; };
  window.__sq = k => campWing(C, 'fighter').filter(u => u.squad === k);
  window.__ord = k => __sq(k).map(u => u.order && u.order.type + ':' + (u.order.target || '')).join(',');
  window.__foe = (dx, dy) => { const u = campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7; return u; };
`);

console.log('A. who is in a squad');
{
  g.run('__out(1)');
  const sq = J(`campWing(C, 'fighter').map(u => u.squad)`);
  check('the bay launches three fighters, the pilots, and they are Red, Green, Yellow in the order they leave: Wedge, Kara, Apollo', sq.join() === 'red,green,yellow' && J(`campWing(C, 'fighter').map(u => u.pilot).join()`) === 'wedge,kara,apollo', sq.join());
  check('there is no escort ship (card space-game-cut-escorts): every ship of the wing is a fighter and has a squad', J(`campWing(C, 'escort').length`) === 0 && J(`campWing(C).length`) === 3 && J(`campWing(C).every(u => u.kind === 'fighter' && !!u.squad)`) === true);
  check('the three groups are the fighters whose squad it is, and Fighters (all squads) is the three', J(`['red', 'green', 'yellow'].map(k => campWingShips(C, k).length).join()`) === '1,1,1' && J(`campWingShips(C, 'fighters').length`) === 3 && J(`['red', 'green', 'yellow'].every(k => campWingShips(C, k).every(u => u.kind === 'fighter'))`) === true && J(`campWingShips(C, 'all').length`) === 3);
  g.run(`campSpawn(C, 'fighter', C.carrier.x + 100, C.carrier.y).order = { type: 'guard', at: { kind: 'carrier' } };`);
  check('a fourth fighter (a test makes one: nothing in the game does) fills the thinnest squad, the first of them when they tie: Red has two', J(`__sq('red').length`) === 2 && J(`__sq('green').length`) === 1 && J(`__sq('yellow').length`) === 1);
  g.run(`__sq('green').forEach(u => { u.hp = 0; }); campSpawn(C, 'fighter', C.carrier.x + 100, C.carrier.y);`);
  check('a squad that lost its ships is filled again by the next to leave the bay: Green had none, the new fighter is Green', J(`__sq('green').length`) === 1 && J(`__sq('yellow').length`) === 1 && J(`__sq('red').length`) === 2);
  check('choosing a squad uses no random number: the battle\'s seeded stream is where it was', J(`(() => { const D = campNew('home', [], { seed: 7 }); const a = D.rng(); const E = campNew('home', [], { seed: 7 }); campSquadNext(E); campSquadNext(E); const b = E.rng(); return a === b; })()`) === true);
  // the same fight twice: the squads do not change what happens
  check('the same seed flown twice gives the same squads in the same places (a deterministic sim)', J(`(() => { const run = () => { __out(5); return campWing(C, 'fighter').map(u => u.squad + ':' + Math.round(u.x)).join(); }; return run() === run(); })()`) === true);
}

console.log('B. an order to one squad');
{
  g.run('__out(1); window.__a = __foe(900, 0); window.__b = __foe(-900, 200); campTgtNearest(C);');
  const tgt = J('C.tgt');
  const r = J(`campWingOrder(C, 'red', 'attack', C.tgt, 'key')`);
  check('Red attacks the target: its fighter is on the attack order, the target\'s id in it, and the answer names the pilot ("Wedge, attack ...")', r.ok && r.n === 1 && J('__ord("red")') === 'attack:' + tgt && /Wedge/.test(r.say), r.say + ' ' + J('__ord("red")'));
  check('the other squads are left on the order they had (guarding the cruiser)', J('__ord("green")') === 'guard:' && J('__ord("yellow")') === 'guard:');
  const other = J('__b.id');
  g.run(`campWingOrder(C, 'green', 'attack', '${other}', 'key');`);
  check('two squads hold two targets at once: Red on the first, Green on the second, Yellow on guard', J('__ord("red")') === R3('attack:' + tgt) && J('__ord("green")') === R3('attack:' + other) && J('__ord("yellow")') === R2('guard:'));
  g.run(`campWingOrder(C, 'yellow', 'guard', null, 'key');`);
  g.run(`campWingOrder(C, 'red', 'recall', null, 'key');`);
  check('Recall to Red sends Red home and nobody else', J('__ord("red")') === R3('recall:') && J('__ord("green")') === R3('attack:' + other) && J('__ord("yellow")') === R2('guard:'));
  g.run(`campWingOrder(C, 'red', 'guard', null, 'key');`);
  check('Guard the cruiser puts a squad back on the cruiser (a recalled squad too), the others as they were', J('__ord("red")') === R3('guard:') && J('__ord("green")').startsWith('attack:'));
  const all = J(`campWingOrder(C, 'fighters', 'attack', C.tgt, 'key')`);
  check('All squads (the group Fighters) is every fighter, all three pilots', all.ok && all.n === 3 && ['red', 'green', 'yellow'].every(k => J(`__ord('${k}')`).split(',').every(x => x === 'attack:' + tgt)));
  const ev = J(`C.events.length`);
  g.run(`C.events.length = 0; campWingOrder(C, 'yellow', 'guard', null, 'click');`);
  check('the play log reads the squad: a wingorder event with the group yellow, the verb, the count and how it was given', J(`C.events.filter(e => e.type === 'wingorder').map(e => [e.group, e.verb, e.n, e.how].join(':')).join()`) === 'yellow:guard:1:click');
  // a Recall while the bay is still emptying: the other squads' waiting ships stay in the queue
  g.run('__new(2); campOrder(C, "launch"); __run(1.0);');
  const q0 = J('C.launchQ.length');
  const rr = J(`campWingOrder(C, 'red', 'recall', null, 'key')`);
  check('Recall to a squad while the bay is still emptying does not take the other squads\' waiting ships back into the bay: the queue is as long as it was', q0 > 0 && rr.ok && J('C.launchQ.length') === q0, q0 + ' ' + J('C.launchQ.length'));
}

console.log('C. a squad with no ship out');
{
  g.run('__new(1); C.bay.fighters = 0;'); // the bay empty too: a pilot in the bay takes an order by launching (card space-game-keys-orders)
  const fresh = J(`campWingOrder(C, 'yellow', 'attack', null, 'key')`);
  check('with no ship out and none in the bay every squad refuses in words: "No ships of that squad are out."', fresh.ok === false && fresh.code === 'nosquad' && fresh.say === 'No ships of that squad are out.', JSON.stringify(fresh));
  g.run('C.bay.fighters = 3; campOrder(C, "launch"); __run(1.3);');
  check('while the wing is still leaving the bay a squad with none out yet says it is still launching', ['red', 'green', 'yellow'].some(k => J(`campWingShips(C, '${k}').length`) === 0 ? J(`campWingOrder(C, '${k}', 'guard', null, 'key').code`) === 'launching' : true));
  g.run('__out(1); __sq("yellow").forEach(u => { u.hp = 0; });');
  const lost = J(`campWingOrder(C, 'yellow', 'recall', null, 'key')`);
  check('a squad that has lost all its ships refuses the same way and the others are not affected', lost.ok === false && lost.code === 'nosquad' && J(`campWingOrder(C, 'red', 'guard', null, 'key').ok`) === true);
  check('a squad with no ship out is no one to pick: A D step All pilots and the pilots that have a ship out (red, green) and let a lost one go back to All pilots (cards space-game-bracket-select-orders, space-game-keys-select: the squads\' own lists are gone)', J(`campSelList(C).filter(e => e.kind === 'pilot').map(e => e.squad).join()`) === 'red,green' && J(`campSelList(C)[0].id`) === 'all' && J(`(() => { C.sel = 'pilot:yellow'; const back = campSelNow(C).id === 'all' && C.sel === 'all'; return back; })()`) === true);
  check('the refusal and the two short words are in the table (CAMP_PANELS.why and shortWhy) and the line is in the content', J('CAMP_PANELS.why.nosquad') === 'no ships in the squad' && J('CAMP_PANELS.shortWhy.nosquad') === 'none out' && /\| camp\.no\.nosquad \| /.test(src('content/text/campsquads.md')) && J(`uiText('camp.no.nosquad')`) === 'No ships of that squad are out.');
}

console.log('D. the keys and the lists');
{
  const T = J('CAMP_PANELS.panels.map(p => ({ id: p.id, key: p.key, parent: p.parent || "", rows: p.rows.map(r => r.id) }))');
  const by = id => T.find(p => p.id === id);
  check('W is the all-squads list, a part of the fleet list, and the convoy has no key of its own; the squads have no lists of their own now (E G R are the order keys: card space-game-keys-orders)', by('squads').key === 'W' && by('squads').parent === 'fleet' && by('convoy').key === '' && by('convoy').parent === 'fleet' && !by('red') && !by('green') && !by('yellow') && J(`['KeyE', 'KeyG', 'KeyR'].map((c, i) => campKeyIs(['attack', 'guard', 'recall'][i], c)).join()`) === 'true,true,true');
  check('the all-squads list starts with Launch the wing (so Q, Enter, Enter launches everything): Launch, Attack, Escort, Guard, Guard the target, Recall, Mine; it opens on its first row that can be given (start: usable)', by('squads').rows.join() === 'launch,attack,escort,fguard,fguardt,frecall,fmine' && J(`campPanelDef('squads').start`) === 'usable');
  check('the Q list is the parts of the wing and nothing else, so nothing is listed twice: All squads first, then the convoy, every row a part that opens its list; Launch, Guard, Mine and Recall are not in it (they are in All squads)', by('fleet').rows.join() === 'gsquads,gconvoy' && J(`campPanelDef('fleet').rows.every(r => r.open)`) === true && J(`campPanelDef('fleet').rows[0].open`) === 'squads' && J('CAMP_PANELS.show') >= 2);
  g.run('__out(1); window.__PP = campPanelNew();');
  const key = c => J(`(() => { const r = campPanelKey(__PP, C, '${c}', 0); return { used: r.used, ran: r.ran, ok: r.ok, row: r.row, fleet: r.fleet, open: r.open, say: r.say }; })()`);
  g.run('window.__a = __foe(900, 0); campTgtNearest(C);');
  const tg = J('C.tgt');
  const s1 = (key('KeyD'), J('C.sel')), s2 = (key('KeyD'), J('C.sel')), s3 = (key('KeyD'), J('C.sel')), s4 = (key('KeyA'), J('C.sel'));
  check('D picks who in turn from All pilots (the default): the pilots red, green, yellow, and A goes back one; none of them is an order and none opens a list', s1 === 'pilot:red' && s2 === 'pilot:green' && s3 === 'pilot:yellow' && s4 === 'pilot:green' && J('campPanelOpen(__PP)') === '' && J('C.orders.attack | 0') === 0);
  const e0 = key('KeyE');
  check('E with the green pilot picked: the green squad attacks the picked target (a fleet order) and only the green squad', e0.ran && e0.ok && e0.row === 'attack' && e0.open === '' && e0.fleet === true && J('__ord("green")') === R3('attack:' + tg) && J('__ord("red")').startsWith('guard') && J('__ord("yellow")').startsWith('guard'), JSON.stringify(e0));
  g.run(`C.sel = ''; campPanelKey(__PP, C, 'KeyD', 0);`);
  const r0 = key('KeyE');
  g.run(`C.sel = ''; campPanelKey(__PP, C, 'KeyD', 0); campPanelKey(__PP, C, 'KeyD', 0); campPanelKey(__PP, C, 'KeyD', 0);`);
  const t0 = key('KeyE');
  check('E with the red pilot picked, then the yellow one: each goes at the target alone, so all three are on it', r0.ok && t0.ok && J('__ord("red")') === R3('attack:' + tg) && J('__ord("yellow")') === R2('attack:' + tg) && J('__ord("green")') === R3('attack:' + tg));
  g.run(`C.sel = 'pilot:red';`);
  const e2 = key('KeyR');
  check('R with the red pilot picked is Recall for Red: Red flies home, the others stay on their attack', e2.ran && e2.ok && e2.row === 'recall' && J('__ord("red")') === R3('recall:') && J('__ord("green")').startsWith('attack') && J('__ord("yellow")').startsWith('attack'));
  g.run(`campPanelKey(__PP, C, 'KeyX', 0);`);
  const rg = key('KeyG');
  check('X lets the enemy and the friendly go and puts who back on All pilots; G with none picked is Guard the cruiser for all three squads, the recalled one too', J('C.sel') === 'all' && J('C.fsel') === '' && J('C.tgt') === '' && rg.ran && rg.ok && rg.row === 'guard' && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard')`));
  g.run(`campPanelClose(__PP); campPanelKey(__PP, C, 'KeyW', 0);`);
  const w = J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyW', 0); for (let k = 0; k < 10 && campPanelList(C, 'squads')[__PP.at].id !== 'fguard'; k++) campPanelKey(__PP, C, 'ArrowDown', 0); const r = campPanelKey(__PP, C, 'Enter', 0); return { open: campPanelOpen(__PP), row: r.row, ok: r.ok, ran: r.ran, fleet: r.fleet }; })()`);
  check('W, Down to Guard the cruiser, Enter is Guard the cruiser for all squads (the list is still the way to the wide orders): every fighter', w.ran && w.ok && w.row === 'fguard' && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard')`), JSON.stringify(w));
  const m = J(`(() => { C.rocks = []; C.pickups.push({ id: 'p1', kind: 'rock', x: C.carrier.x + 500, y: C.carrier.y, ore: 20, born: 0 }); return 1; })()`);
  const mine = J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyW', 0); for (let k = 0; k < 10 && campPanelList(C, 'squads')[__PP.at].id !== 'fmine'; k++) campPanelKey(__PP, C, 'ArrowDown', 0); const r = campPanelKey(__PP, C, 'Enter', 0); return { row: r.row }; })()`);
  check('W, Mine ore: all the fighters go mining', mine.row === 'fmine' && J(`campWing(C, 'fighter').every(u => u.order.type === 'mine')`));
  // the convoy through Q (it has no key of its own)
  const esc = J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyQ', 0); const i = campPanelList(C, 'fleet').findIndex(r => r.id === 'gconvoy'); for (let k = 0; k < i; k++) campPanelKey(__PP, C, 'ArrowDown', 0); const o = campPanelKey(__PP, C, 'Enter', 0); const l = campPanelKey(__PP, C, 'ArrowLeft', 0); return { i, open: o.open, back: l.open, at: __PP.at }; })()`);
  check('a part with no key is reached through the Q list: Q, Down to Convoy, Enter opens it at its first row; Left goes back onto the Convoy row', esc.i >= 1 && esc.open === 'convoy' && esc.back === 'fleet' && esc.at === esc.i, JSON.stringify(esc));
  g.run('campPanelClose(__PP);');
  const old = ['KeyE', 'KeyR', 'KeyT'].map(c => J(`(() => { campPanelClose(__PP); return campPanelKey(__PP, C, '${c}', 0).open; })()`)).join();
  check('E, R and T open no list any more: they give an order (or are refused in words) and the panel stays shut', old === ',,', old);
  check('the key line, the H page and the hints say the keys (Q Fleet  W All with the old switches on), read from the table: the three order keys are direct keys, in the texts as {keyattack} {keyguard} {keyrecall} who as {keywlast} {keywnext} and the friendlies\' as {keyflast} {keyfnext}', J('campPanelKeyLine()') === 'Q Fleet  W All    P Ship  O Power  I Autopilot  U Dock' && J('campPanelKeyRows().slice(0, 2).map(r => r.k[0]).join("")') === 'QW' && J(`campKeyVar('squadskey')`) === 'W' && J(`['keyattack', 'keyguard', 'keyrecall', 'keywlast', 'keywnext', 'keyflast', 'keyfnext', 'keylast', 'keynext'].map(campKeyVar).join('')`) === 'EGRADOP[]');
}

console.log('E. the words');
{
  g.run('__out(1); window.__a = __foe(900, 0);');
  const say = t => J(`campIntent(${JSON.stringify(t)})`);
  const w1 = say('red squad attack the raider');
  check('"red squad attack the raider" is the wing order for the red squad: the order, the group, the verb and the target the words name', w1 && w1.act === 'fleet_wing' && /^red attack /.test(w1.arg), JSON.stringify(w1));
  const t1 = J(`campWingText(C, 'red squad attack the raider', true)`), t2 = J(`campWingText(C, 'red squad attack the raider')`);
  check('and it is done: a dry run says yes and does nothing, the real one orders only the red squad at the raider', t1.ok && t2.ok && t2.group === 'red' && t2.verb === 'attack' && J('__ord("red")').startsWith('attack:') && J('__ord("green")').startsWith('guard'), JSON.stringify(t2));
  g.run(`campWingText(C, 'yellow guard');`);
  check('"yellow guard" (a squad by its colour alone, no word "squad") and "green squad, recall" are understood', J('__ord("yellow")').startsWith('guard') && (g.run(`campWingText(C, 'green squad recall');`), J('__ord("green")').startsWith('recall')));
  g.run(`campWingText(C, 'all squads attack the raider');`);
  check('"all squads attack the raider" is every fighter: the three squads all on the attack', ['red', 'green', 'yellow'].every(k => J(`__ord('${k}')`).startsWith('attack:')));
  g.run(`campWingText(C, 'all squads recall');`);
  check('"all squads recall" brings every fighter home, "cancel the red squad" is a plain Guard for Red', ['red', 'green', 'yellow'].every(k => J(`__ord('${k}')`).startsWith('recall')) && (g.run(`campWingText(C, 'cancel the red squad');`), J('__ord("red")').startsWith('guard')));
  const bad = J(`campWingText(C, 'purple squad attack')`);
  check('a squad that does not exist is no group: it says so in words (the words of the old group unchanged: "fighters attack" still works; the escorts group is gone)', bad.ok === false && J(`campWingText(C, 'fighters attack the raider', true).ok`) === true && !J(`campWingText(C, 'escorts guard', true).ok`));
  check('the ship computer is told the squads in its list of actions and in the lists as they are (the game\'s: Q the cruiser list; E G R are the order keys)', /one squad of the fighters: red, green or yellow/.test(src('src/shipcomputer.js')) && /Q opens the cruiser list/.test(J('shipcompSystem({ scene: { key: "Campaign" }, camp: C })') || '') && /E sends the fighters at the target, G guards the friend/.test(J('shipcompSystem({ scene: { key: "Campaign" }, camp: C })') || ''));
}

console.log('F. the map and the colours (card space-game-squad-rings: a squad has a coloured mark only while it is in focus)');
{
  g.run('__out(1);');
  const marks = J(`campMapMarks(C).filter(m => m.type === 'wing')`);
  check('on the map no fighter\'s mark carries a squad while no squad is in focus: three plain wing marks (the pilots)', marks.length === 3 && marks.every(m => !m.squad));
  const red = J(`campMapMarks(C, false, ['red']).filter(m => m.type === 'wing')`);
  check('Red in focus: the mark of Wedge carries the squad, no other mark does (the other squads stay plain)', red.length === 3 && red.filter(m => m.squad).length === 1 && red.every(m => !m.squad || m.squad === 'red'));
  const all = J(`campMapMarks(C, false, ['red', 'green', 'yellow']).filter(m => m.type === 'wing')`);
  check('all three in focus: the three pilots\' marks carry their squad, one each', all.filter(m => m.squad).length === 3 && ['red', 'green', 'yellow'].map(k => all.filter(m => m.squad === k).length).join() === '1,1,1');
  const lg0 = J('campMapLegend(C)');
  check('with no squad in focus the legend has the wing\'s row and no squad rows (the dots are all one colour)', lg0.map(r => r.type).join() === 'carrier,wing', JSON.stringify(lg0));
  const lg = J(`campMapLegend(C, campMapMarks(C, false, ['red', 'green', 'yellow']))`);
  check('the legend has a row for each squad in focus that has ships, under the wing\'s own row: "Wedge", "Kara", "Apollo" in the squads\' colours', lg.map(r => r.type).join() === 'carrier,wing,red,green,yellow' && lg.slice(2).map(r => r.text).join() === 'Wedge,Kara,Apollo' && lg.slice(2).every((r, i) => r.color === J('CAMP.wing.squadColor')[['red', 'green', 'yellow'][i]]), JSON.stringify(lg));
  check('one squad in focus: one row, that squad\'s', J(`campMapLegend(C, campMapMarks(C, false, ['green'])).map(r => r.type).join()`) === 'carrier,wing,green');
  const col = J('CAMP.wing.squadColor'), v = Object.values(col);
  check('the three colours are three (red, green, yellow), none of them the escorts\' own mint, so a squad\'s dot can be told from a plain one', v.length === 3 && new Set(v).size === 3 && !v.includes(J('CAMPMAP.color.wing')) && col.red > 0xe00000 && (col.green & 0xff00) > (col.green & 0xff0000) / 256 && (col.yellow >> 16) > 0xe0 && ((col.yellow >> 8) & 0xff) > 0xc0);
  const mapdraw = src('src/campmapdraw.js'), wingLine = mapdraw.split('\n').find(l => /m\.type === 'wing'/.test(l) && /squadColor/.test(l)) || '';
  check('the map draws the dot of a squad in focus FILLED in its colour with a white spark in the middle (any other fighter and an escort a plain mint dot); no ring round it (the red and the yellow are near the aliens\' and the pirates\' flat dots, so the spark tells ours)', /fillStyle\(sc \|\| m\.color, 1\)\.fillCircle/.test(wingLine) && /fillStyle\(0xffffff[^)]*\)\.fillCircle\(p\.x, p\.y, 1\)/.test(wingLine) && !/strokeCircle|lineStyle/.test(wingLine) && /m\.squad && CAMP\.wing\.squadColor\[m\.squad\]/.test(wingLine));
  check('the open map asks which squads are in focus (campSquadsShown) and gives them to the marks', /campMapMarks\(C, mp\.whole, typeof campSquadsShown === 'function' \? campSquadsShown\(s\.pn, C,/.test(mapdraw));
}

console.log('G. the square marks: the fighters are all one colour, the friend\'s square marks the squad in focus (cards space-game-squad-rings, space-game-friendly-display)');
{
  g.run(`
    window.__gfx = () => { const r = { calls: [], clear() { r.calls = []; return r; }, setDepth() { return r; }, lineStyle(w, c, a) { r.calls.push({ t: 'line', w, c, a }); return r; }, lineBetween(x1, y1, x2, y2) { r.calls.push({ t: 'seg', x1, y1, x2, y2 }); return r; } }; return r; };
    window.__stand = (open, zoom, pn, now) => ({ camp: C, sp: {}, squadG: __gfx(), cameras: { main: { zoom: zoom || 1 } }, time: { now: now || 0 }, pn: Object.assign({ open: open || '', at: 0, top: 0, lit: {}, trail: [], pick: null, seen: null, ring: null }, pn || {}) });
    window.__circles = (open, zoom, pn, now) => { const sc = __stand(open, zoom, pn, now); Campaign.prototype.squadMarks.call(sc); const out = []; let cur = null; sc.squadG.calls.forEach(c => { if (c.t === 'line') { cur = { col: c.c, w: c.w, xs: [], ys: [] }; out.push(cur); } else { cur.xs.push(c.x1); cur.ys.push(c.y1); } }); return out.map(m => { const n = m.xs.length, cx = m.xs.reduce((a, b) => a + b, 0) / n, cy = m.ys.reduce((a, b) => a + b, 0) / n; return { col: m.col, w: m.w, x: cx, y: cy, h: Math.abs(m.xs[0] - cx), segs: n }; }); }; // one entry per marked ship: its colour, line width, centre, half size and how many strokes (the square's four corners are eight)
    window.__shown = (P, t) => campSquadsShown(P, C, t).join('+');
    window.__k = (P, code, t) => campPanelKey(P, C, code, t);
    window.__keepP = () => { const P = campPanelNew(); __k(P, 'KeyW', 1000); const rows = campPanelList(C, 'squads'), want = rows.findIndex(r => r.id === 'fguard'); for (let k = 0, d = ((want - P.at) % rows.length + rows.length) % rows.length; k < d; k++) __k(P, 'ArrowDown', 1000); const r = __k(P, 'Enter', 1000); return { P, r }; }; // W, Down to Guard the cruiser, Enter: an order of all three squads
    window.__selc = sq => { C.sel = 'pilot:' + sq; const r = __circles(''); C.sel = ''; return r; }; // the marks with the pilot of a squad picked (A D) and no list open: the pilot has its bracket from campTgtPaint, not a second square
  `);
  g.run('__out(1);');
  const COL = J('CAMP.wing.squadColor'), scene = src('src/campaignscene.js');
  check('no tint: the fighters are all drawn in their own look (the scene has no squadTint, and sync() sets no tint by squad)', J(`Object.prototype.hasOwnProperty.call(Campaign.prototype, 'squadTint')`) === false && !/squadTint/.test(scene) && !/setTint\(c\)/.test(scene.split('\n').filter(l => /squad/i.test(l)).join('\n')));
  check('campSquadsLit: a squad\'s id is its own squad (a pilot\'s ring); the all-squads list (W) is all three; the fleet list (Q), the escorts, the convoy, the stance and the other side\'s lists, and none open, are nobody', J(`['red', 'green', 'yellow'].map(k => campSquadsLit(k).join('+')).join()`) === 'red,green,yellow' && J(`campSquadsLit('squads').join()`) === 'red,green,yellow' && J(`['', 'fleet', 'escorts', 'convoy', 'stance', 'ship', 'autopilot', 'power', 'dock', 'nope', null, undefined].map(k => campSquadsLit(k).length).join()`) === '0,0,0,0,0,0,0,0,0,0,0,0');
  check('the squads have no list of their own now (a pilot is picked with A D: card space-game-bracket-select-orders), and the all-squads list is \'squads\' (the helper reads the list ids)', J(`CAMP.wing.squads.every(k => !campPanelDef(k))`) === true && J(`!!campPanelDef('squads') && campPanelDef('squads').key`) === 'W');
  const foc = J(`(() => { const P = campPanelNew(), f = (open, at) => { P.open = open; P.at = at | 0; return campSquadsFocus(P, C).join('+'); }; const q = campPanelList(C, 'fleet').map(r => r.id); const out = [f(''), f('squads'), f('fleet', 0), f('fleet', 1), f('escorts'), f('convoy'), f('stance'), f('ship'), f('power')].join('|'); C.sel = 'pilot:green'; const sel = [f(''), f('ship'), f('fleet', 1), f('squads'), f('fleet', 0)].join('|'); C.sel = ''; return { q, out, sel }; })()`);
  check('in focus: the open list\'s squads (W all three); in the Q list the squad whose row the highlight is on (All squads: all three; Convoy: nobody); the other lists and none open: nobody; with a pilot picked (A D) it is that pilot\'s squad whenever no squad\'s list is the focus (no list, the ship list, the Convoy row), and the all-squads list wins while it is open', foc.q.join() === 'gsquads,gconvoy' && foc.out === ['', 'red+green+yellow', 'red+green+yellow', '', '', '', '', '', ''].join('|') && foc.sel === 'green|green|green|red+green+yellow|red+green+yellow', JSON.stringify(foc));
  check('no list open, nothing kept: no mark at all in normal flight (the graphics are cleared and nothing is stroked)', J(`__circles('').length`) === 0 && J(`(() => { const sc = __stand(''); Campaign.prototype.squadMarks.call(sc); return sc.squadG.calls.length; })()`) === 0);
  const qs = J(`['escorts', 'convoy', 'stance', 'ship', 'autopilot', 'power', 'dock'].map(k => __circles(k).length).join()`);
  check('the lists that are no squad\'s open: no mark', qs === '0,0,0,0,0,0,0', qs);
  const q0 = J(`__circles('fleet', 1, { at: 0 })`), q1 = J(`__circles('fleet', 1, { at: 1 })`);
  check('Q open, the highlight on All squads: all three pilots get the square, all in the friend\'s one colour (not a colour of their own squad), at the pilots\' places', q0.length === 3 && q0.every(c => c.col === J('CAMPTGT.friend') && c.segs === 8) && JSON.stringify(q0.map(c => [Math.round(c.x), Math.round(c.y)]).sort()) === JSON.stringify(J(`campWing(C, 'fighter').map(u => [Math.round(u.x), Math.round(u.y)])`).sort()), JSON.stringify(q0));
  check('Q open, the highlight on Convoy: no mark', q1.length === 0);
  const red = J(`__selc('red')`);
  check('a pilot picked (D, no list open): no square from the squads, whatever its squad: the pilot has the bracket campTgtPaint draws (a pilot is never marked twice)', red.length === 0 && ['green', 'yellow'].every(k => J(`__selc('${k}')`).length === 0));
  check('but the other squads in focus are marked: the all-squads list open (W) with the red pilot picked marks Kara and Apollo only', J(`(() => { C.sel = 'pilot:red'; const r = __circles('squads'); C.sel = ''; return r.length; })()`) === 2);
  const all2 = J(`__circles('squads')`);
  check('W open: all three pilots get the square, all in the friend\'s colour', all2.length === 3 && all2.every(c => c.col === J('CAMPTGT.friend')));
  check('the square is the target\'s own (its half size is the ship\'s radius and room, never under half CAMPTGT.minScreen on the screen), and its line is 2 px on the screen', [1, 0.5, 0.1, 0.02].every(z => J(`__circles('squads', ${z})`).every(c => c.h * z >= J('CAMPTGT.minScreen') / 2 - 1e-9 && Math.abs(c.w * z - 2) < 1e-9 && Math.abs(c.h - Math.max((J(`campWing(C, 'fighter')[0].r`) || 20) + J('CAMPTGT.pad'), J('CAMPTGT.minScreen') / 2 / z)) < 1e-9)));
  check('the square is drawn by the target\'s own function (campTgtCorners, src/camptargetdraw.js: eight short strokes, no circle at all), once per marked fighter, in CAMPTGT.friend', J(`(() => { const sc = __stand('squads', 1); Campaign.prototype.squadMarks.call(sc); return sc.squadG.calls.filter(k => k.t === 'seg').length === 24 && sc.squadG.calls.filter(k => k.t === 'line').length === 3; })()`) === true && /campTgtCorners\(sg, u, CAMPTGT\.friend/.test(scene) && !/campRing\(sg/.test(scene) && !/squadCircle/.test(scene));
  check('the kept marks are drawn the same way: a squad in P.ring is marked until its time is up, then not, and the state is let go', J(`__circles('', 1, { ring: { sq: ['green'], until: 5000 } }, 100).map(c => c.col).join()`) === String(J('CAMPTGT.friend')) && J(`__circles('', 1, { ring: { sq: ['green'], until: 5000 } }, 5000).length`) === 0 && J(`(() => { const sc = __stand('', 1, { ring: { sq: ['green'], until: 5000 } }, 6000); Campaign.prototype.squadMarks.call(sc); return sc.pn.ring; })()`) === null);
  check('a squad with no ship out has no mark to draw (nothing, not an error), and its pilot is no friend to pick', J(`(() => { campWing(C, 'fighter').filter(u => u.squad === 'red').forEach(u => { u.hp = 0; }); C.sel = 'pilot:red'; const n = __circles('').length; C.sel = ''; return n; })()`) === 0 && J(`__circles('squads').length`) === 2);
  check('closing the list takes the marks away: the next frame with nothing open draws none (the graphics are cleared every frame)', J(`(() => { const sc = __stand('squads'); Campaign.prototype.squadMarks.call(sc); const a = sc.squadG.calls.length; sc.pn.open = ''; Campaign.prototype.squadMarks.call(sc); return a > 0 && sc.squadG.calls.length === 0; })()`) === true);
  check('a scene made without the squad graphics, or a stand-in without a panel, draws nothing and logs nothing', J(`(() => { const sc = __stand('squads'); delete sc.squadG; Campaign.prototype.squadMarks.call(sc); const sd = __stand('squads'); delete sd.pn; Campaign.prototype.squadMarks.call(sd); return sd.squadG.calls.length; })()`) === 0);
  g.run('__out(1);');
  // the kept ring, through the keys
  const kp = J(`(() => { const { P, r } = __keepP(), a = __shown(P, 1000); const o = { ok: r.ok, row: r.row, closed: campPanelOpen(P) === '', a, b: __shown(P, 1001), c: __shown(P, 8999), d: __shown(P, 9000), e: __shown(P, 9001), keep: CAMP.wing.ringKeep }; return o; })()`);
  check('an order from the all-squads list (W, Down to Guard the cruiser, Enter) closes the list and the squads KEEP their rings: on right after, still on a moment before CAMP.wing.ringKeep (8 s) is up, off at 8 s and after', kp.ok && kp.row === 'fguard' && kp.closed && kp.a === 'red+green+yellow' && kp.b === 'red+green+yellow' && kp.c === 'red+green+yellow' && kp.d === '' && kp.e === '' && kp.keep === 8000, JSON.stringify(kp));
  check('another squad in focus takes the ring over: after the order, D picks the red pilot: red only; X clears the selection and the kept ring: nothing (the ring does not come back)', J(`(() => { const { P } = __keepP(); __k(P, 'KeyD', 2000); const a = __shown(P, 2000); __k(P, 'KeyX', 2100); return [a, __shown(P, 2200)].join('|'); })()`) === 'red|');
  check('X (clear both selections) lets the kept ring go at once', J(`(() => { const { P } = __keepP(); const a = __shown(P, 2000); __k(P, 'KeyX', 2100); return [a, __shown(P, 2100)].join('|'); })()`) === 'red+green+yellow|');
  check('Esc out of the list with no order given keeps nothing, and a refused order keeps nothing (Attack with nothing in sight is refused)', J(`(() => { const P = campPanelNew(); __k(P, 'KeyW', 1000); __k(P, 'Escape', 1100); const a = __shown(P, 1200); const Q = campPanelNew(); const r = __k(Q, 'KeyE', 1000); return [a, r.ran, r.ok, __shown(Q, 1200)].join('|'); })()`) === '|true|false|');
  check('W, Enter on its first row that can be given keeps all three rings; an order from a list that is no squad\'s (the power list) neither gives nor takes a ring: a kept red ring is still there after it', J(`(() => { const P = campPanelNew(); __k(P, 'KeyW', 1000); const r = __k(P, 'Enter', 1000); const a = __shown(P, 1001); const Q = __keepP().P; campPanelGo(Q, C, 'power'); const e = __k(Q, 'Enter', 2000); return [r.ok, a, e.ran && e.ok, __shown(Q, 2001)].join('|'); })()`) === 'true|red+green+yellow|true|red+green+yellow');
  g.run(`__foe(900, 0); __foe(-900, 200);`);
  g.run(`campTgtNearest(C);`); // (W opens on Attack once a hostile is picked: it is grey while none is, card space-game-w-uses-selection)
  const sub = J(`(() => { const P = campPanelNew(); __k(P, 'KeyW', 1000); const o = __k(P, 'Enter', 1000); return [o.ran && o.ok, !!P.pick, campPanelOpen(P) === '', __shown(P, 1001), __shown(P, 8999), __shown(P, 9000)].join('|'); })()`);
  g.run(`campTgtClear(C);`);
  check('Attack with several hostiles about and one picked gives the order at once (no sub-list: card space-game-w-uses-selection): all three rings stay for the same 8 s (counted from the order)', sub === 'true|false|true|red+green+yellow|red+green+yellow|', sub);
  check('sync() draws the marks once a frame from the squads in focus and the scene\'s clock, and the click path keeps the marks too', /this\.squadMarks\(\);/.test(scene) && /campSquadsShown\(this\.pn, C, \(this\.time && this\.time\.now\) \|\| 0\)/.test(scene) && /campSquadsKeep\(P, def\.id, now\)/.test(src('src/campanelsdraw.js')) && /campSquadsFree\(P\)/.test(src('src/camppanel.js')) && !/u\.squad && col\[u\.squad\]\) \{ const sp/.test(scene));
  check('the card\'s docs say it: the ring only for a squad in focus, kept 8 s, one colour for the fighters (PROJECT_STATUS.md, docs/CAMPAIGN.md)', (l => /\bring\b/.test(l) && /8 seconds/.test(l) && /all drawn alike/.test(l) && /in focus/.test(l))(src('docs/CAMPAIGN.md').split('\n').find(l => /What a squad looks like/.test(l)) || '') && (l => /\bring\b/.test(l) && /in focus/.test(l) && /8 s/.test(l))(src('PROJECT_STATUS.md').split('\n').find(l => /Fighter squads/.test(l)) || ''));
}

console.log('H. launching through the lists (card space-game-squad-tint: Launch is the first row of All squads)');
{
  g.run('__new(1); campPanelClose(__PP);');
  const a = J(`(() => { const q = campPanelKey(__PP, C, 'KeyQ', 0), at0 = __PP.at, id0 = campPanelList(C, 'fleet')[__PP.at].id, n0 = C.orders.launch, e1 = campPanelKey(__PP, C, 'Enter', 0), open1 = campPanelOpen(__PP), id1 = campPanelList(C, open1)[__PP.at].id, n1 = C.orders.launch, e2 = campPanelKey(__PP, C, 'Enter', 0); return { qopen: q.open, at0, id0, n0, ran1: e1.ran, open1, id1, n1, ran2: e2.ran, ok2: e2.ok, row2: e2.row, closed: campPanelOpen(__PP) === '', n2: C.orders.launch }; })()`);
  check('Q opens the fleet list on All squads (its first row); Enter opens All squads on Launch the wing and launches nothing yet; the second Enter launches everything and the list closes', a.qopen === 'fleet' && a.at0 === 0 && a.id0 === 'gsquads' && a.n0 === 0 && a.ran1 === false && a.open1 === 'squads' && a.id1 === 'launch' && a.n1 === 0 && a.ran2 === true && a.ok2 === true && a.row2 === 'launch' && a.closed && a.n2 === 1, JSON.stringify(a));
  g.run('__new(1); campPanelClose(__PP);');
  const w = J(`(() => { const o = campPanelKey(__PP, C, 'KeyW', 0), id = campPanelList(C, 'squads')[__PP.at].id, e = campPanelKey(__PP, C, 'Enter', 0); return { open: o.open, id, ran: e.ran, ok: e.ok, row: e.row, n: C.orders.launch, closed: campPanelOpen(__PP) === '' }; })()`);
  check('W, Enter launches too (W opens All squads on Launch the wing)', w.open === 'squads' && w.id === 'launch' && w.ran && w.ok && w.row === 'launch' && w.n === 1 && w.closed, JSON.stringify(w));
  g.run('__run(8); campPanelClose(__PP); campSpawn(C, "raider", C.carrier.x + 900, C.carrier.y); campTgtNearest(C);'); // (a hostile picked to attack: with none picked Attack is grey and All squads opens on Escort or Guard)
  const out = J(`(() => { const R = campPanelRowState(C, campPanelDef('squads').rows[0]); const o = campPanelKey(__PP, C, 'KeyW', 0), id = campPanelList(C, 'squads')[__PP.at].id; return { ok: R.ok, state: R.state, short: R.short, open: o.open, at: __PP.at, id }; })()`);
  check('with the wing out Launch is greyed ("all of it is out") and All squads opens on Attack the target, its first row that can be given', out.ok === false && out.state === 'all of it is out' && out.short === 'all out' && out.open === 'squads' && out.at === 1 && out.id === 'attack', JSON.stringify(out));
  const back = J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyQ', 0); campPanelKey(__PP, C, 'Enter', 0); const l = campPanelKey(__PP, C, 'ArrowLeft', 0); return { open: l.open, at: __PP.at }; })()`);
  check('Left from All squads goes back to Q on the All squads row, and the other lists still open on their first row (a squad\'s list with the wing out starts on Attack, its first)', back.open === 'fleet' && back.at === 0 && J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyE', 0); return __PP.at; })()`) === 0 && J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyP', 0); return __PP.at; })()`) === 0, JSON.stringify(back));
  g.run('campPanelClose(__PP); campOrder(C, "recall"); __run(10);');
  check('after a Recall the bay has ships again: Launch can be given and All squads opens on it once more', J(`(() => { campPanelKey(__PP, C, 'KeyW', 0); const id = campPanelList(C, 'squads')[__PP.at].id; campPanelClose(__PP); return id; })()`) === 'launch');
}

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nFIGHTER SQUADS FAIL (${failed} of ${n})` : `\nFIGHTER SQUADS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
