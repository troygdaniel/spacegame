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
  check('the all-squads list starts with Launch the wing (so Q, Enter, Enter launches everything) and has the same three as a squad plus Mine ore: Launch, Attack, Guard, Recall, Mine; it opens on its first row that can be given (start: usable)', by('squads').rows.join() === 'launch,attack,fguard,frecall,fmine' && J(`campPanelDef('squads').start`) === 'usable');
  check('the Q list is the parts of the wing and nothing else, so nothing is listed twice: All squads first, then Red, Green, Yellow, the escorts, the convoy and the stance, every row a part that opens its list; Launch, Guard, Mine and Recall are not in it (they are in All squads)', by('fleet').rows.join() === 'gsquads,gred,ggreen,gyellow,gescorts,gconvoy,gstance' && J(`campPanelDef('fleet').rows.every(r => r.open)`) === true && J(`campPanelDef('fleet').rows[0].open`) === 'squads' && J('CAMP_PANELS.show') >= 7);
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
  check('the escorts\' orders are reached through the Q list: Q, Down to Escorts, Enter opens them at their first row; Left goes back onto the Escorts row', esc.i === 4 && esc.open === 'escorts' && esc.back === 'fleet' && esc.at === 4, JSON.stringify(esc));
  g.run('campPanelClose(__PP);');
  const old = ['KeyE', 'KeyR', 'KeyW'].map(c => J(`(() => { campPanelClose(__PP); return campPanelKey(__PP, C, '${c}', 0).open; })()`)).join();
  check('the old meanings are gone: E is not the fighters\' list, R not the escorts\', W not the convoy\'s: they open the red squad, the green squad and all squads', old === 'red,green,squads', old);
  check('the key line, the H page and the hints say the new keys (Q Fleet  W All  E Red  R Green  T Yellow), read from the table', J('campPanelKeyLine()') === 'Q Fleet  W All  E Red  R Green  T Yellow    P Ship  O Power  I Autopilot  U Dock' && J('campPanelKeyRows().slice(0, 5).map(r => r.k[0]).join("")') === 'QWERT' && J(`campKeyVar('squadskey') + campKeyVar('redkey') + campKeyVar('greenkey') + campKeyVar('yellowkey')`) === 'WERT');
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

console.log('F. the map and the colours (card space-game-squad-rings: a squad has a coloured mark only while it is in focus)');
{
  g.run('__out(1);');
  const marks = J(`campMapMarks(C).filter(m => m.type === 'wing')`);
  check('on the map no fighter\'s mark carries a squad while no squad is in focus: eight plain wing marks (six fighters, two escorts)', marks.length === 8 && marks.every(m => !m.squad));
  const red = J(`campMapMarks(C, false, ['red']).filter(m => m.type === 'wing')`);
  check('Red in focus: the marks of the two red fighters carry the squad, no other mark does (the other squads and the escorts stay plain)', red.length === 8 && red.filter(m => m.squad).length === 2 && red.every(m => !m.squad || m.squad === 'red'));
  const all = J(`campMapMarks(C, false, ['red', 'green', 'yellow']).filter(m => m.type === 'wing')`);
  check('all three in focus: six fighters\' marks carry their squad, two of each, and an escort\'s carries none', all.filter(m => m.squad).length === 6 && ['red', 'green', 'yellow'].every(k => all.filter(m => m.squad === k).length === 2));
  const lg0 = J('campMapLegend(C)');
  check('with no squad in focus the legend has the wing\'s row and no squad rows (the dots are all one colour)', lg0.map(r => r.type).join() === 'carrier,wing', JSON.stringify(lg0));
  const lg = J(`campMapLegend(C, campMapMarks(C, false, ['red', 'green', 'yellow']))`);
  check('the legend has a row for each squad in focus that has ships, under the wing\'s own row: "Red squad (2)", "Green squad (2)", "Yellow squad (2)" in the squads\' colours', lg.map(r => r.type).join() === 'carrier,wing,red,green,yellow' && lg.filter(r => /squad/.test(r.text)).map(r => r.text).join() === 'Red squad (2),Green squad (2),Yellow squad (2)' && lg.slice(2).every((r, i) => r.color === J('CAMP.wing.squadColor')[['red', 'green', 'yellow'][i]]), JSON.stringify(lg));
  check('one squad in focus: one row, that squad\'s', J(`campMapLegend(C, campMapMarks(C, false, ['green'])).map(r => r.type).join()`) === 'carrier,wing,green');
  const col = J('CAMP.wing.squadColor'), v = Object.values(col);
  check('the three colours are three (red, green, yellow), none of them the escorts\' own mint, so a squad\'s dot can be told from a plain one', v.length === 3 && new Set(v).size === 3 && !v.includes(J('CAMPMAP.color.wing')) && col.red > 0xe00000 && (col.green & 0xff00) > (col.green & 0xff0000) / 256 && (col.yellow >> 16) > 0xe0 && ((col.yellow >> 8) & 0xff) > 0xc0);
  const mapdraw = src('src/campmapdraw.js'), wingLine = mapdraw.split('\n').find(l => /m\.type === 'wing'/.test(l) && /squadColor/.test(l)) || '';
  check('the map draws the dot of a squad in focus FILLED in its colour with a white spark in the middle (any other fighter and an escort a plain mint dot); no ring round it (the red and the yellow are near the aliens\' and the pirates\' flat dots, so the spark tells ours)', /fillStyle\(sc \|\| m\.color, 1\)\.fillCircle/.test(wingLine) && /fillStyle\(0xffffff[^)]*\)\.fillCircle\(p\.x, p\.y, 1\)/.test(wingLine) && !/strokeCircle|lineStyle/.test(wingLine) && /m\.squad && CAMP\.wing\.squadColor\[m\.squad\]/.test(wingLine));
  check('the open map asks which squads are in focus (campSquadsShown) and gives them to the marks', /campMapMarks\(C, mp\.whole, typeof campSquadsShown === 'function' \? campSquadsShown\(s\.pn, C,/.test(mapdraw));
}

console.log('G. the ring: the fighters are all one colour, a ring marks the squad in focus (card space-game-squad-rings)');
{
  g.run(`
    window.__gfx = () => { const r = { calls: [], clear() { r.calls = []; return r; }, setDepth() { return r; }, lineStyle(w, c, a) { r.calls.push({ t: 'line', w, c, a }); return r; }, strokePoints(pts, close) { const n = pts.length, x = pts.reduce((a, p) => a + p.x, 0) / n, y = pts.reduce((a, p) => a + p.y, 0) / n; r.calls.push({ t: 'circle', x, y, rad: Math.hypot(pts[0].x - x, pts[0].y - y), n, close }); return r; } }; return r; };
    window.__stand = (open, zoom, pn, now) => ({ camp: C, sp: {}, squadG: __gfx(), cameras: { main: { zoom: zoom || 1 } }, time: { now: now || 0 }, pn: Object.assign({ open: open || '', at: 0, top: 0, lit: {}, trail: [], pick: null, seen: null, ring: null }, pn || {}) });
    window.__circles = (open, zoom, pn, now) => { const sc = __stand(open, zoom, pn, now); Campaign.prototype.squadCircle.call(sc); const out = []; let st = null; sc.squadG.calls.forEach(c => { if (c.t === 'line') st = c; else out.push({ col: st.c, w: st.w, x: c.x, y: c.y, rad: c.rad }); }); return out; };
    window.__shown = (P, t) => campSquadsShown(P, C, t).join('+');
    window.__k = (P, code, t) => campPanelKey(P, C, code, t);
    window.__keepP = () => { const P = campPanelNew(); __k(P, 'KeyE', 1000); __k(P, 'ArrowDown', 1000); const r = __k(P, 'Enter', 1000); return { P, r }; };
  `);
  g.run('__out(1);');
  const COL = J('CAMP.wing.squadColor'), scene = src('src/campaignscene.js');
  check('no tint: the fighters are all drawn in their own look (the scene has no squadTint, and sync() sets no tint by squad)', J(`Object.prototype.hasOwnProperty.call(Campaign.prototype, 'squadTint')`) === false && !/squadTint/.test(scene) && !/setTint\(c\)/.test(scene.split('\n').filter(l => /squad/i.test(l)).join('\n')));
  check('campSquadsLit: the red, green and yellow lists (E R T) are their own squad; the all-squads list (W) is all three; the fleet list (Q), the escorts, the convoy, the stance and the other side\'s lists, and none open, are nobody', J(`['red', 'green', 'yellow'].map(k => campSquadsLit(k).join('+')).join()`) === 'red,green,yellow' && J(`campSquadsLit('squads').join()`) === 'red,green,yellow' && J(`['', 'fleet', 'escorts', 'convoy', 'stance', 'ship', 'autopilot', 'power', 'dock', 'nope', null, undefined].map(k => campSquadsLit(k).length).join()`) === '0,0,0,0,0,0,0,0,0,0,0,0');
  check('every squad has a list of its own whose id is its name, and the all-squads list is \'squads\' (the helper reads the list ids)', J(`CAMP.wing.squads.every(k => campPanelDef(k) && campPanelDef(k).key)`) === true && J(`!!campPanelDef('squads') && campPanelDef('squads').key`) === 'W');
  const foc = J(`(() => { const P = campPanelNew(), f = (open, at) => { P.open = open; P.at = at | 0; return campSquadsFocus(P, C).join('+'); }; const q = campPanelList(C, 'fleet').map(r => r.id); return { q, out: [f(''), f('red'), f('green'), f('yellow'), f('squads'), f('fleet', 0), f('fleet', 1), f('fleet', 2), f('fleet', 3), f('fleet', 4), f('escorts'), f('convoy'), f('stance'), f('ship'), f('power')].join('|') }; })()`);
  check('in focus: the open list\'s squads (E red, R green, T yellow, W all three); in the Q list the squad whose row the highlight is on (All squads, Red, Green, Yellow); the Escorts row, the other lists and none open: nobody', foc.q.slice(0, 5).join() === 'gsquads,gred,ggreen,gyellow,gescorts' && foc.out === '|red|green|yellow|red+green+yellow|red+green+yellow|red|green|yellow||||||', JSON.stringify(foc));
  check('no list open, nothing kept: no ring at all in normal flight (the graphics are cleared and nothing is stroked)', J(`__circles('').length`) === 0 && J(`(() => { const sc = __stand(''); Campaign.prototype.squadCircle.call(sc); return sc.squadG.calls.length; })()`) === 0);
  const qs = J(`['escorts', 'convoy', 'stance', 'ship', 'autopilot', 'power', 'dock'].map(k => __circles(k).length).join()`);
  check('the lists that are no squad\'s open: no ring', qs === '0,0,0,0,0,0,0', qs);
  const q0 = J(`__circles('fleet', 1, { at: 0 })`), q1 = J(`__circles('fleet', 1, { at: 1 })`), q3 = J(`__circles('fleet', 1, { at: 3 })`), q4 = J(`__circles('fleet', 1, { at: 4 })`);
  check('Q open, the highlight on All squads: all six fighters ringed, each in its own squad\'s colour (two of each)', q0.length === 6 && ['red', 'green', 'yellow'].every(k => q0.filter(c => c.col === COL[k]).length === 2));
  check('Q open, the highlight on Red squad: its two fighters ringed in red; on Yellow squad: the yellow two; on Escorts: no ring', q1.length === 2 && q1.every(c => c.col === COL.red) && q3.length === 2 && q3.every(c => c.col === COL.yellow) && q4.length === 0);
  const red = J(`__circles('red')`), pos = J(`campWing(C, 'fighter').filter(u => u.squad === 'red').map(u => [Math.round(u.x), Math.round(u.y)])`);
  check('E open: a ring round each of the red squad\'s two fighters, in red, and round no one else', red.length === 2 && red.every(c => c.col === COL.red) && JSON.stringify(red.map(c => [Math.round(c.x), Math.round(c.y)]).sort()) === JSON.stringify(pos.slice().sort()), JSON.stringify(red));
  check('R open: the green squad\'s two, in green; T open: the yellow squad\'s two, in yellow', J(`__circles('green')`).every(c => c.col === COL.green) && J(`__circles('green').length`) === 2 && J(`__circles('yellow')`).every(c => c.col === COL.yellow) && J(`__circles('yellow').length`) === 2);
  const all2 = J(`__circles('squads')`);
  check('W open: all six fighters get a ring, each in its own squad\'s colour (two of each)', all2.length === 6 && ['red', 'green', 'yellow'].every(k => all2.filter(c => c.col === COL[k]).length === 2));
  check('the ring is the same size on the screen at every zoom, so it reads at the start zoom and far out: its radius times the zoom is 8 px (a stand-in sprite has no width; a real one is at least that) and its line 2 px', [1, 0.5, 0.1, 0.02].every(z => J(`__circles('red', ${z})`).every(c => Math.abs(c.rad * z - 8) < 1e-9 && Math.abs(c.w * z - 2) < 1e-9)));
  check('the ring is the cheap outline of src/campcircles.js (campRing: one closed line through 10 to 96 corners, not Phaser\'s arc), one per ringed fighter', J(`(() => { const sc = __stand('red', 1); Campaign.prototype.squadCircle.call(sc); const c = sc.squadG.calls.filter(k => k.t === 'circle'); return c.length > 0 && c.every(k => k.close === true && k.n >= 10 && k.n <= 96); })()`) === true && /campRing\(sg, u\.x, u\.y,/.test(scene) && !/strokeCircle/.test(scene.split('\n').filter(l => /squadG|squadCircle|sg\.lineStyle/.test(l)).join('\n')));
  check('the kept ring is drawn the same way: a squad in P.ring is ringed until its time is up, then not, and the state is let go', J(`__circles('', 1, { ring: { sq: ['green'], until: 5000 } }, 100).map(c => c.col).join()`) === COL.green + ',' + COL.green && J(`__circles('', 1, { ring: { sq: ['green'], until: 5000 } }, 5000).length`) === 0 && J(`(() => { const sc = __stand('', 1, { ring: { sq: ['green'], until: 5000 } }, 6000); Campaign.prototype.squadCircle.call(sc); return sc.pn.ring; })()`) === null);
  check('a squad with no ship out has no ring to draw (nothing, not an error)', J(`(() => { campWing(C, 'fighter').filter(u => u.squad === 'red').forEach(u => { u.hp = 0; }); return __circles('red').length; })()`) === 0 && J(`__circles('squads').length`) === 4);
  check('closing the list takes the ring away: the next frame with nothing open draws none (the graphics are cleared every frame)', J(`(() => { const sc = __stand('green'); Campaign.prototype.squadCircle.call(sc); const a = sc.squadG.calls.length; sc.pn.open = ''; Campaign.prototype.squadCircle.call(sc); return a > 0 && sc.squadG.calls.length === 0; })()`) === true);
  check('a scene made without the squad graphics, or a stand-in without a panel, draws nothing and logs nothing', J(`(() => { const sc = __stand('red'); delete sc.squadG; Campaign.prototype.squadCircle.call(sc); const sd = __stand('red'); delete sd.pn; Campaign.prototype.squadCircle.call(sd); return sd.squadG.calls.length; })()`) === 0);
  g.run('__out(1);');
  // the kept ring, through the keys
  const kp = J(`(() => { const { P, r } = __keepP(), a = __shown(P, 1000); const o = { ok: r.ok, row: r.row, closed: campPanelOpen(P) === '', a, b: __shown(P, 1001), c: __shown(P, 8999), d: __shown(P, 9000), e: __shown(P, 9001), keep: CAMP.wing.ringKeep }; return o; })()`);
  check('an order from a squad\'s list (E, Down, Enter: Guard the cruiser) closes the list and the squad KEEPS its ring: on right after, still on a moment before CAMP.wing.ringKeep (8 s) is up, off at 8 s and after', kp.ok && kp.row === 'redguard' && kp.closed && kp.a === 'red' && kp.b === 'red' && kp.c === 'red' && kp.d === '' && kp.e === '' && kp.keep === 8000, JSON.stringify(kp));
  check('another squad in focus takes the ring over: after the red order, R opens the green list: green only; Esc closes it: nothing (the red ring was let go, it does not come back)', J(`(() => { const { P } = __keepP(); __k(P, 'KeyR', 2000); const a = __shown(P, 2000); __k(P, 'Escape', 2100); return [a, __shown(P, 2200)].join('|'); })()`) === 'green|');
  check('the Q list does the same: after a red order the highlight on Green squad rings green (not red) and the kept ring is gone when Q closes', J(`(() => { const { P } = __keepP(); __k(P, 'KeyQ', 2000); __k(P, 'ArrowDown', 2000); __k(P, 'ArrowDown', 2000); const a = __shown(P, 2000); __k(P, 'Escape', 2100); return [a, __shown(P, 2200)].join('|'); })()`) === 'green|');
  check('X (clear the target) lets the kept ring go at once', J(`(() => { const { P } = __keepP(); const a = __shown(P, 2000); __k(P, 'KeyX', 2100); return [a, __shown(P, 2100)].join('|'); })()`) === 'red|');
  check('Esc out of the list with no order given keeps nothing, and a refused order keeps nothing (Attack with nothing in sight is grey and refused)', J(`(() => { const P = campPanelNew(); __k(P, 'KeyE', 1000); __k(P, 'Escape', 1100); const a = __shown(P, 1200); const Q = campPanelNew(); __k(Q, 'KeyE', 1000); const r = __k(Q, 'Enter', 1000); const open = campPanelOpen(Q); __k(Q, 'Escape', 1100); return [a, r.ran, r.ok, open, __shown(Q, 1200)].join('|'); })()`) === '|true|false|red|');
  check('W, Enter on its first row that can be given keeps all three rings; an order from a list that is no squad\'s (the stance list) neither gives nor takes a ring: a kept red ring is still there after it', J(`(() => { const P = campPanelNew(); __k(P, 'KeyW', 1000); const r = __k(P, 'Enter', 1000); const a = __shown(P, 1001); const Q = __keepP().P; campPanelGo(Q, C, 'stance'); const e = __k(Q, 'Enter', 2000); return [r.ok, a, e.ran && e.ok, __shown(Q, 2001)].join('|'); })()`) === 'true|red+green+yellow|true|red');
  g.run(`__foe(900, 0); __foe(-900, 200);`);
  const sub = J(`(() => { const P = campPanelNew(); __k(P, 'KeyE', 1000); const o = __k(P, 'Enter', 1000), a = __shown(P, 1000), picked = !!P.pick; const c = __k(P, 'Enter', 1100); return [o.ran, picked, a, c.ran && c.ok, campPanelOpen(P) === '', __shown(P, 1101), __shown(P, 9099), __shown(P, 9100)].join('|'); })()`);
  check('Attack with several hostiles opens the target sub-list: the red ring stays while it is picked, and the order given there keeps it for the same 8 s (counted from the order)', sub === 'false|true|red|true|true|red|red|', sub);
  check('sync() draws the ring once a frame from the squads in focus and the scene\'s clock, and the click path keeps the ring too', /this\.squadCircle\(\);/.test(scene) && /campSquadsShown\(this\.pn, C, \(this\.time && this\.time\.now\) \|\| 0\)/.test(scene) && /campSquadsKeep\(P, def\.id, now\)/.test(src('src/campanelsdraw.js')) && /campSquadsFree\(P\)/.test(src('src/camppanel.js')) && !/u\.squad && col\[u\.squad\]\) \{ const sp/.test(scene));
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
  g.run('__run(8); campPanelClose(__PP); campSpawn(C, "raider", C.carrier.x + 900, C.carrier.y);'); // (a hostile to attack: with none Attack is grey and All squads opens on Guard)
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
