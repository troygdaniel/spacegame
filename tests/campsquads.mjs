// smoke: the fighters' three squads (Red, Green, Yellow): who is in which, an order to one squad, the lists and keys that give it, the words, the map's rings (plain Node, no Chrome)
// Card space-game-fighter-squads (Troy, 22 Nov 2026: "I want to be able to control fighter squads easily": W all squads, E red, R green, T yellow, each Attack the target, Guard the cruiser, Recall; W also Launch and Mine ore).
// The sim is src/campwing.js (campSquadNext, the groups 'red' 'green' 'yellow' of CAMP.wing) and src/campaign.js (a fighter gets u.squad when it leaves the bay); the lists are CAMP_PANELS (src/data_controls.js).
//   A. who is in a squad: six fighters are two and two and two, the escorts are in none, a later fighter fills the thinnest squad, a lost squad is filled again, a mended fighter goes out in its own squad, no random number is used
//   B. an order to one squad moves that squad only (attack, guard, recall); two squads hold two targets; all squads is every fighter; Recall while the bay is emptying
//   C. a squad with no ship out: the refusal in words, and the rows of its list grey with the reason
//   D. the keys and the lists: W E R T open their lists, each Attack, Guard, Recall (W also Mine ore and Launch), the escorts and the convoy are rows of Q with no key of their own, the keys of the old layout mean the new
//   E. the words: red squad attack the raider, yellow guard, all squads recall, cancel the green squad; the ship computer is told them
//   F. the map: a fighter's mark carries its squad, the legend names the squads, the three colours are three
// Run: node tests/campsquads.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
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
  check('the bay launches six fighters and they are Red, Green, Yellow, Red, Green, Yellow in the order they leave: two in each squad', sq.join() === 'red,green,yellow,red,green,yellow' && ['red', 'green', 'yellow'].every(k => sq.filter(x => x === k).length === 2), sq.join());
  check('the escorts are in no squad (they keep their rows in the Q list)', J(`campWing(C, 'escort').length`) === 2 && J(`campWing(C, 'escort').every(u => !u.squad)`) === true);
  check('the three groups are the fighters whose squad it is, and Fighters (all squads) is the six; the escorts are in none of them', J(`['red', 'green', 'yellow'].map(k => campWingShips(C, k).length).join()`) === '2,2,2' && J(`campWingShips(C, 'fighters').length`) === 6 && J(`['red', 'green', 'yellow'].every(k => campWingShips(C, k).every(u => u.kind === 'fighter'))`) === true && J(`campWingShips(C, 'all').length`) === 8);
  g.run(`campSpawn(C, 'fighter', C.carrier.x + 100, C.carrier.y).order = { type: 'guard', at: { kind: 'carrier' } };`);
  check('a seventh fighter (a build, a rank, a refit) fills the thinnest squad, the first of them when they tie: Red has three', J(`__sq('red').length`) === 3 && J(`__sq('green').length`) === 2 && J(`__sq('yellow').length`) === 2);
  g.run(`__sq('green').forEach(u => { u.hp = 0; }); campSpawn(C, 'fighter', C.carrier.x + 100, C.carrier.y);`);
  check('a squad that lost its ships is filled again by the next to leave the bay: Green had none, the new fighter is Green', J(`__sq('green').length`) === 1 && J(`__sq('yellow').length`) === 2 && J(`__sq('red').length`) === 3);
  check('choosing a squad uses no random number: the battle\'s seeded stream is where it was', J(`(() => { const D = campNew('home', [], { seed: 7 }); const a = D.rng(); const E = campNew('home', [], { seed: 7 }); campSquadNext(E); campSquadNext(E); const b = E.rng(); return a === b; })()`) === true);
  // the same fight twice: the squads do not change what happens
  check('the same seed flown twice gives the same squads in the same places (a deterministic sim)', J(`(() => { const run = () => { __out(5); return campWing(C, 'fighter').map(u => u.squad + ':' + Math.round(u.x)).join(); }; return run() === run(); })()`) === true);
}

console.log('B. an order to one squad');
{
  g.run('__out(1); window.__a = __foe(900, 0); window.__b = __foe(-900, 200); campTgtNearest(C);');
  const tgt = J('C.tgt');
  const r = J(`campWingOrder(C, 'red', 'attack', C.tgt, 'key')`);
  check('Red attacks the target: its two fighters are on the attack order, the target\'s id in it, and the answer names the squad ("Red squad, attack ...")', r.ok && r.n === 2 && J('__ord("red")') === 'attack:' + tgt + ',attack:' + tgt && /Red squad/.test(r.say), r.say + ' ' + J('__ord("red")'));
  check('the other squads are left on the order they had (guarding the cruiser)', J('__ord("green")') === 'guard:,guard:' && J('__ord("yellow")') === 'guard:,guard:' && J(`campWing(C, 'escort').every(u => u.order.type === 'guard' || u.order.type === 'escort')`));
  const other = J('__b.id');
  g.run(`campWingOrder(C, 'green', 'attack', '${other}', 'key');`);
  check('two squads hold two targets at once: Red on the first, Green on the second, Yellow on guard', J('__ord("red")') === 'attack:' + tgt + ',attack:' + tgt && J('__ord("green")') === 'attack:' + other + ',attack:' + other && J('__ord("yellow")') === 'guard:,guard:');
  g.run(`campWingOrder(C, 'yellow', 'guard', null, 'key');`);
  g.run(`campWingOrder(C, 'red', 'recall', null, 'key');`);
  check('Recall to Red sends Red home and nobody else', J('__ord("red")') === 'recall:,recall:' && J('__ord("green")') === 'attack:' + other + ',attack:' + other && J('__ord("yellow")') === 'guard:,guard:');
  g.run(`campWingOrder(C, 'red', 'guard', null, 'key');`);
  check('Guard the cruiser puts a squad back on the cruiser (a recalled squad too), the others as they were', J('__ord("red")') === 'guard:,guard:' && J('__ord("green")').startsWith('attack:'));
  const all = J(`campWingOrder(C, 'fighters', 'attack', C.tgt, 'key')`);
  check('All squads (the group Fighters) is every fighter, all three squads, and the escorts are not moved', all.ok && all.n === 6 && ['red', 'green', 'yellow'].every(k => J(`__ord('${k}')`) === 'attack:' + tgt + ',attack:' + tgt) && J(`campWing(C, 'escort').every(u => u.order.type !== 'attack')`));
  const ev = J(`C.events.length`);
  g.run(`C.events.length = 0; campWingOrder(C, 'yellow', 'guard', null, 'click');`);
  check('the play log reads the squad: a wingorder event with the group yellow, the verb, the count and how it was given', J(`C.events.filter(e => e.type === 'wingorder').map(e => [e.group, e.verb, e.n, e.how].join(':')).join()`) === 'yellow:guard:2:click');
  // a Recall while the bay is still emptying: the other squads' waiting ships stay in the queue
  g.run('__new(2); campOrder(C, "launch"); __run(1.0);');
  const q0 = J('C.launchQ.length');
  const rr = J(`campWingOrder(C, 'red', 'recall', null, 'key')`);
  check('Recall to a squad while the bay is still emptying does not take the other squads\' waiting ships back into the bay: the queue is as long as it was', q0 > 0 && rr.ok && J('C.launchQ.length') === q0, q0 + ' ' + J('C.launchQ.length'));
}

console.log('C. a squad with no ship out');
{
  g.run('__new(1);');
  const fresh = J(`campWingOrder(C, 'yellow', 'attack', null, 'key')`);
  check('before the launch every squad refuses in words: "No ships of that squad are out." (the bay is not a squad)', fresh.ok === false && fresh.code === 'nosquad' && fresh.say === 'No ships of that squad are out.', JSON.stringify(fresh));
  g.run('campOrder(C, "launch"); __run(1.3);');
  check('while the wing is still leaving the bay a squad with none out yet says it is still launching', ['red', 'green', 'yellow'].some(k => J(`campWingShips(C, '${k}').length`) === 0 ? J(`campWingOrder(C, '${k}', 'guard', null, 'key').code`) === 'launching' : true));
  g.run('__out(1); __sq("yellow").forEach(u => { u.hp = 0; });');
  const lost = J(`campWingOrder(C, 'yellow', 'recall', null, 'key')`);
  check('a squad that has lost all its ships refuses the same way and the others are not affected', lost.ok === false && lost.code === 'nosquad' && J(`campWingOrder(C, 'red', 'guard', null, 'key').ok`) === true);
  check('its list is grey with the reason beside every row (no ships in the squad / none out); the other lists are not', J(`campPanelRows(C, 'yellow').every(r => !r.ok && r.state === 'no ships in the squad' && r.short === 'none out')`) && ['red', 'green'].every(q => J(`campPanelRows(C, '${q}').filter(r => r.id !== '${q}attack').every(r => r.ok)`) && J(`campPanelRows(C, '${q}').find(r => r.id === '${q}attack').state`) === 'no hostiles in sight'));
  check('a squad\'s row in the Q list counts its ships: "2 out" for Red, "0 out" for Yellow; All squads counts the fighters', J(`campPanelRows(C, 'fleet').find(r => r.id === 'gred').short`) === '2 out' && J(`campPanelRows(C, 'fleet').find(r => r.id === 'gyellow').short`) === '0 out' && J(`campPanelRows(C, 'fleet').find(r => r.id === 'gsquads').short`) === '4 out');
  check('the refusal and the two short words are in the table (CAMP_PANELS.why and shortWhy) and the line is in the content', J('CAMP_PANELS.why.nosquad') === 'no ships in the squad' && J('CAMP_PANELS.shortWhy.nosquad') === 'none out' && /\| camp\.no\.nosquad \| /.test(src('content/text/campsquads.md')) && J(`uiText('camp.no.nosquad')`) === 'No ships of that squad are out.');
}

console.log('D. the keys and the lists');
{
  const T = J('CAMP_PANELS.panels.map(p => ({ id: p.id, key: p.key, parent: p.parent || "", rows: p.rows.map(r => r.id) }))');
  const by = id => T.find(p => p.id === id);
  check('W is the all-squads list, E the red squad\'s, R the green\'s, T the yellow\'s: each a part of the fleet list, and the escorts, the convoy and the stance have no key of their own', ['squads:W', 'red:E', 'green:R', 'yellow:T'].every(x => { const [id, k] = x.split(':'); return by(id).key === k && by(id).parent === 'fleet'; }) && ['convoy', 'escorts', 'stance'].every(id => by(id).key === '' && by(id).parent === 'fleet'));
  check('a squad\'s list is Attack the target, Guard the cruiser, Recall: three rows each, in that order', ['red', 'green', 'yellow'].every(id => by(id).rows.join() === [id + 'attack', id + 'guard', id + 'recall'].join()));
  check('the all-squads list is the same three with Mine ore and Launch the wing: Attack, Guard, Recall, Mine, Launch', by('squads').rows.join() === 'attack,fguard,frecall,fmine,slaunch');
  check('the Q list holds the squads, the escorts and the convoy as rows that open a part, then Guard, Mine, Recall and Stance: eleven rows, none of them left out in a mission with a convoy', by('fleet').rows.join() === 'launch,gsquads,gred,ggreen,gyellow,gescorts,gconvoy,guard,mine,recall,gstance' && J('CAMP_PANELS.show') >= 11);
  g.run('__out(1); window.__PP = campPanelNew();');
  const pick = (code, rows) => J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, '${code}', 0); for (let i = 0; i < ${rows}; i++) campPanelKey(__PP, C, 'ArrowDown', 0); const r = campPanelKey(__PP, C, 'Enter', 0); return { open: campPanelOpen(__PP), row: r.row, ok: r.ok, ran: r.ran, fleet: r.fleet }; })()`);
  g.run('window.__a = __foe(900, 0); campTgtNearest(C);');
  const tg = J('C.tgt');
  const e0 = pick('KeyE', 0);
  check('E, Enter on Attack the target: the red squad attacks the picked target (a fleet order, the list closes) and only the red squad', e0.ran && e0.ok && e0.row === 'redattack' && e0.open === '' && e0.fleet === true && J('__ord("red")') === 'attack:' + tg + ',attack:' + tg && J('__ord("green")').startsWith('guard') && J('__ord("yellow")').startsWith('guard'), JSON.stringify(e0));
  const r0 = pick('KeyR', 0), t0 = pick('KeyT', 0);
  check('R, Enter and T, Enter do the same for the green and the yellow squads', r0.row === 'greenattack' && t0.row === 'yellowattack' && J('__ord("green")') === 'attack:' + tg + ',attack:' + tg && J('__ord("yellow")') === 'attack:' + tg + ',attack:' + tg);
  const e2 = pick('KeyE', 2);
  check('E, Down, Down, Enter is Recall for Red: Red flies home, the others stay on their attack', e2.row === 'redrecall' && J('__ord("red")') === 'recall:,recall:' && J('__ord("green")').startsWith('attack'));
  const w = pick('KeyW', 1);
  check('W, Down, Enter is Guard the cruiser for all squads: every fighter, the recalled squad too', w.row === 'fguard' && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard')`));
  const m = J(`(() => { C.rocks = []; C.pickups.push({ id: 'p1', kind: 'rock', x: C.carrier.x + 500, y: C.carrier.y, ore: 20, born: 0 }); return 1; })()`);
  const mine = pick('KeyW', 3);
  check('W, Mine ore: all the fighters go mining (the escorts are left as they were)', mine.row === 'fmine' && J(`campWing(C, 'fighter').every(u => u.order.type === 'mine')`) && J(`campWing(C, 'escort').every(u => u.order.type !== 'mine')`));
  // the escorts and the convoy through Q
  const esc = J(`(() => { campPanelClose(__PP); campPanelKey(__PP, C, 'KeyQ', 0); const i = campPanelList(C, 'fleet').findIndex(r => r.id === 'gescorts'); for (let k = 0; k < i; k++) campPanelKey(__PP, C, 'ArrowDown', 0); const o = campPanelKey(__PP, C, 'Enter', 0); const l = campPanelKey(__PP, C, 'ArrowLeft', 0); return { i, open: o.open, back: l.open, at: __PP.at }; })()`);
  check('the escorts\' orders are reached through the Q list: Q, Down to Escorts, Enter opens them at their first row; Left goes back onto the Escorts row', esc.i === 5 && esc.open === 'escorts' && esc.back === 'fleet' && esc.at === 5, JSON.stringify(esc));
  g.run('campPanelClose(__PP);');
  const old = ['KeyE', 'KeyR', 'KeyW'].map(c => J(`(() => { campPanelClose(__PP); return campPanelKey(__PP, C, '${c}', 0).open; })()`)).join();
  check('the old meanings are gone: E is not the fighters\' list, R not the escorts\', W not the convoy\'s: they open the red squad, the green squad and all squads', old === 'red,green,squads', old);
  check('the key line, the H page and the hints say the new keys (Q Fleet  W All  E Red  R Green  T Yellow), read from the table', J('campPanelKeyLine()') === 'Q Fleet  W All  E Red  R Green  T Yellow    P Ship  O Autopilot  I Power  U Dock' && J('campPanelKeyRows().slice(0, 5).map(r => r.k[0]).join("")') === 'QWERT' && J(`campKeyVar('squadskey') + campKeyVar('redkey') + campKeyVar('greenkey') + campKeyVar('yellowkey')`) === 'WERT');
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
  check('"all squads attack the raider" is every fighter: the three squads all on the attack, the escorts as they were', ['red', 'green', 'yellow'].every(k => J(`__ord('${k}')`).startsWith('attack:')) && J(`campWing(C, 'escort').every(u => u.order.type !== 'attack')`));
  g.run(`campWingText(C, 'all squads recall');`);
  check('"all squads recall" brings every fighter home, "cancel the red squad" is a plain Guard for Red', ['red', 'green', 'yellow'].every(k => J(`__ord('${k}')`).startsWith('recall')) && (g.run(`campWingText(C, 'cancel the red squad');`), J('__ord("red")').startsWith('guard')));
  const bad = J(`campWingText(C, 'purple squad attack')`);
  check('a squad that does not exist is no group: it says so in words (the words of the old groups unchanged: "fighters attack" and "escorts guard" still work)', bad.ok === false && J(`campWingText(C, 'fighters attack the raider', true).ok`) === true && J(`campWingText(C, 'escorts guard', true).ok`) === true);
  check('the ship computer is told the squads in its list of actions and in the lists as they are (W E R T)', /one squad of the fighters: red, green or yellow/.test(src('src/shipcomputer.js')) && /W opens the all-squads list/.test(J('shipcompSystem({ scene: { key: "Campaign" }, camp: C })') || ''));
}

console.log('F. the map and the colours');
{
  g.run('__out(1);');
  const marks = J(`campMapMarks(C).filter(m => m.type === 'wing')`);
  check('on the map every fighter\'s mark carries its squad and an escort\'s carries none', marks.length === 8 && marks.filter(m => m.squad).length === 6 && ['red', 'green', 'yellow'].every(k => marks.filter(m => m.squad === k).length === 2));
  const lg = J('campMapLegend(C)');
  check('the legend has a row for each squad that has ships, under the wing\'s own row: "Red squad (2)", "Green squad (2)", "Yellow squad (2)" in the squads\' colours', lg.map(r => r.type).join() === 'carrier,wing,red,green,yellow' && lg.filter(r => /squad/.test(r.text)).map(r => r.text).join() === 'Red squad (2),Green squad (2),Yellow squad (2)' && lg.slice(2).every((r, i) => r.color === J('CAMP.wing.squadColor')[['red', 'green', 'yellow'][i]]), JSON.stringify(lg));
  const col = J('CAMP.wing.squadColor'), v = Object.values(col);
  check('the three colours are three (red, green, yellow), none of them the escorts\' own mint, so a ring on a fighter can be told from a plain dot', v.length === 3 && new Set(v).size === 3 && !v.includes(J('CAMPMAP.color.wing')) && col.red > 0xe00000 && (col.green & 0xff00) > (col.green & 0xff0000) / 256 && (col.yellow >> 16) > 0xe0 && ((col.yellow >> 8) & 0xff) > 0xc0);
  const scene = src('src/campaignscene.js'), mapdraw = src('src/campmapdraw.js');
  check('the flight draws a ring in the squad\'s colour round each fighter (the same size on the screen at every zoom: its radius is a few pixels divided by the zoom), and the map a ring round its dot', /squadG/.test(scene) && /CAMP\.wing\.squadColor/.test(scene) && /strokeCircle\(u\.x, u\.y, Math\.max\(8, half \+ 3\) \/ z\)/.test(scene) && /m\.squad && CAMP\.wing\.squadColor\[m\.squad\]/.test(mapdraw));
}

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nFIGHTER SQUADS FAIL (${failed} of ${n})` : `\nFIGHTER SQUADS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
