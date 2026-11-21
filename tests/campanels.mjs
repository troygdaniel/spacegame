// smoke: the Campaign's keyboard panels: key 1 opens the FLEET panel, key 2 the SHIP panel, a digit picks a row, the live state of every row, no digit does an order on its own (plain Node, no Chrome)
// Card space-game-campaign-keys-help (Troy, 20 Nov 2026). The table is CAMP_PANELS (src/data_controls.js), the logic src/camppanel.js. Plain data and functions; the drawing and the scene's keys are tests/campanelsdraw.mjs.
//   A. the table: two panels of five rows numbered 1 to 5, key 3 reserved, every row an order the game has (or the autopilot), every refusal has its few words
//   B. the live state of each row: what it will do, or why it cannot, in the cases a player meets
//   C. the keys: 1 or 2 opens a panel, a digit picks a row and closes it, Esc and any other key close it, a digit with no panel does nothing, key 3 and 4 to 9 are nobody's
//   D. fast typing: 1 then 3 within 250 ms never draws the panel; slowly, it is drawn after 250 ms
//   E. what a pick does: the same as the strip's order (the same campOrder), the costs, the autopilot to the objective, the play log's "how"
// Run: node tests/campanels.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__row = (C, panel, id) => campPanelRows(C, panel).find(r => r.id === id);
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now);
`);

console.log('A. the table');
{
  const T = J('CAMP_PANELS');
  check('three panels: Q FLEET at the left, E SHIP at the right (the letters are the table\'s: card space-game-panel-keys-zxc), and SYSTEMS on the letter C (card space-game-campaign-systems), each with the code of its key', T.panels.length === 3 && T.panels[0].key === 'Q' && T.panels[0].code === 'KeyQ' && T.panels[0].side === 'left' && T.panels[0].title === 'FLEET' && T.panels[1].key === 'E' && T.panels[1].code === 'KeyE' && T.panels[1].side === 'right' && T.panels[1].title === 'SHIP' && T.panels[2].key === 'C' && T.panels[2].code === 'KeyC' && T.panels[2].id === 'systems' && T.panels[2].rows.length === 5);
  check('the fleet panel has six rows (Mine ore is its sixth), the ship panel four and the systems panel five, numbered from 1, each with a label and a line for the help page', T.panels[0].rows.map(r => r.n).join() === '1,2,3,4,5,6' && T.panels[1].rows.map(r => r.n).join() === '1,2,3,4' && T.panels[2].rows.map(r => r.n).join() === '1,2,3,4,5' && T.panels.every(p => p.rows.every(r => r.label && r.help && r.id))); // the SHIP panel's last row is Dock (card space-game-campaign-outposts), its fifth since card space-game-shield-auto took the recharge row out
  check('the fleet rows are launch, attack, escort, guard, recall, mine (the wing mines, so it is a fleet order: card space-game-panel-keys-zxc); the ship rows build a fighter, build an escort, fly to the objective, dock (no recharge: the shield mends by itself)', T.panels[0].rows.map(r => r.order).join() === 'launch,attack,escort,guard,recall,mine' && T.panels[1].rows.map(r => r.order || r.fly).join() === 'build,build,objective,dock' && T.panels[1].rows[0].arg === 'fighter' && T.panels[1].rows[1].arg === 'escort');
  check('no digit opens a panel: the digits only pick a row of an open one', !T.panels.some(p => /^\d$/.test(p.key)) && ['Digit1', 'Digit2', 'Digit3'].every(c => J(`campPanelKey(campPanelNew(), campNew('home', [], { seed: 1 }), '${c}', 0).opened`) === ''));
  check('there is no hold-back: a panel is drawn at once (delay 0); its list drops in in 120 ms, a picked row flashes for 160 ms and the list goes in 100', T.delay === 0 && T.anim.fadeIn === 120 && T.anim.flash === 160 && T.anim.fadeOut === 100);
  g.run(`window.__C = __quiet(campNew('home', [], { seed: 1 }));`);
  check('every order the table names is one the game knows (campOrder never answers "what")', J(`CAMP_PANELS.panels.flatMap(p => p.rows).filter(r => r.order).every(r => campCheck(__C, r.order, r.arg || '').code !== 'what')`));
  const codes = J(`(() => { const out = new Set(); for (const lvl of [1, 2]) { const C = __quiet(campNew(lvl, [], { seed: 1 })); for (let k = 0; k < 6; k++) { CAMP_PANELS.panels.flatMap(p => p.rows).filter(r => r.order).forEach(r => { const q = campCheck(C, r.order, r.arg || ''); if (!q.ok) out.add(q.code); }); if (k === 0) campOrder(C, 'launch'); if (k === 1) __run(C, 5); if (k === 2) { C.ore = 0; } if (k === 3) { C.shield = 150; } } } return [...out]; })()`);
  check('every refusal the rows meet has its few words in the table', codes.length >= 5 && codes.every(c => J(`!!CAMP_PANELS.why['${c}']`)), codes.join());
  check('the table is the one source: the settings and help rows are made from it (campPanelKeyRows: 19 rows: each panel\'s own key, then the panel key and a digit for each row (the burn is in row 3\'s line: Shift), the dock row, the FLEET panel\'s flip line (Q, the arrows: its second page is the stances), and SYSTEMS on C)', J(`campPanelKeyRows().length`) === 19 && J(`campPanelKeyRows()[0].k.join()`) === 'Q' && J(`campPanelKeyRows()[3].k.join()`) === 'Q,3' && J(`campPanelKeyRows()[7].k.join()`) === 'Q,\u2190,\u2192' && J(`campPanelKeyRows()[8].k.join()`) === 'E' && J(`campPanelKeyRows()[10].k.join()`) === 'E,2' && J(`campPanelKeyRows()[13].k.join()`) === 'C' && J(`campPanelKeyRows()[16].k.join()`) === 'C,3');
  check('the key line says the panels from the table: Q Fleet   E Ship   C Systems', J('campPanelKeyLine()') === 'Q Fleet   E Ship   C Systems');
}

console.log('B. the live state of each row');
{
  g.run(`window.C1 = __quiet(campNew('home', [], { seed: 1 })); C1.docked = 'luna';`); // docked: the build rows can be built (undocked they say "Dock at an outpost to build.": tests/campoutpost.mjs)
  const R = id => J(`__row(C1, '${id.split('.')[0]}', '${id.split('.')[1]}')`);
  check('fresh battle, fleet: launch is ready and says what is in the bay; the rest wait for a wing', R('fleet.launch').ok && /6 fighters, 2 escorts/.test(R('fleet.launch').state) && ['attack', 'escort', 'guard', 'recall'].every(r => !R('fleet.' + r).ok));
  check('and say why in a few words: no fighters out, no escorts out, no ships out', R('fleet.attack').state === 'no fighters out' && R('fleet.escort').state === 'no escorts out' && R('fleet.guard').state === 'no ships out' && R('fleet.recall').state === 'no ships out');
  check('fleet panel, fresh: mine cannot (no ships out: the whole wing mines), and on the ship panel a fighter can be built (30 ore, 25 needed) with its cost and time, an escort cannot (needs 45 ore)', R('fleet.mine').state === 'no ships out' && R('ship.buildf').ok && R('ship.buildf').state === '25 ore, 6 s' && !R('ship.builde').ok && R('ship.builde').state === 'needs 45 ore');
  g.run(`window.__dk = (() => { const real = campOutpostNear, was = C1.docked; C1.docked = ''; try { campOutpostNear = () => null; const off = campPanelRows(C1, 'ship').find(r => r.id === 'dock'); campOutpostNear = () => ({ o: { name: 'Occator Works', id: 'ceres' }, d: 10 }); const on = campPanelRows(C1, 'ship').find(r => r.id === 'dock'); return { off: [off.ok, off.short], on: [on.ok, on.short, on.state] }; } finally { campOutpostNear = real; C1.docked = was; } })();`); // the dock row names the outpost in range (wrap-up: it had no word when it could be done)
  check('the dock row of the SHIP panel names the outpost in range in its short line, and has nothing to say out of range', J('__dk.on[0]') === true && J('__dk.on[1]') === 'Occator Works' && J('__dk.on[2]') === 'dock at Occator Works' && J('__dk.off[1]') !== 'Occator Works', JSON.stringify(J('__dk')));
  check('the fly row names the objective and how far: level 1 starts with Earth', R('ship.goal').ok && /^Earth  \d+ km$/.test(R('ship.goal').state), R('ship.goal').state);
  g.run(`campOrder(C1, 'launch'); __run(C1, 1);`);
  check('launching: launch says "still launching" and the others say "no fighters out" until the first one is out', !R('fleet.launch').ok && R('fleet.launch').state === 'still launching');
  g.run(`__run(C1, 6);`);
  check('wing out: launch says all of it is out; attack, guard, recall are ready with the count; escort has no convoy yet', R('fleet.launch').state === 'all of it is out' && R('fleet.attack').ok && R('fleet.attack').state === '6 fighters out' && R('fleet.guard').ok && R('fleet.guard').state === '8 ships out' && R('fleet.recall').ok && !R('fleet.escort').ok && R('fleet.escort').state === 'no convoy to escort');
  g.run(`__run(C1, 6);`);
  check('with the Mars convoy flying, escort is ready and names it', R('fleet.escort').ok && R('fleet.escort').state === 'Mars convoy', R('fleet.escort').state);
  g.run(`C1.pickups.length = 0; C1.rocks.length = 0;`);
  check('mine with no rock and no ore in reach says so', !R('fleet.mine').ok && R('fleet.mine').state === 'no ore in reach');
  g.run(`C1.pickups.push({ id: 'p1', kind: 'rock', x: 500, y: 0, ore: 20, born: 0 });`);
  check('with ore lying about, mine is ready and counts the ships, the rocks and the ore', R('fleet.mine').ok && /^8 ships, 0 rocks, 1 ore$/.test(R('fleet.mine').state), R('fleet.mine').state);
  check('there is no recharge row (card space-game-shield-auto): a shield down is not a row to pick, and the old order says the shield mends by itself', (g.run(`C1.shield = 30;`), !J(`campPanelRows(C1, 'ship').some(r => r.id === 'recharge')`)) && J(`campCheck(C1, 'recharge', '').code`) === 'shieldauto');
  g.run(`campOrder(C1, 'recall'); C1.ore = 200; for (let i = 0; i < 12; i++) campOrder(C1, 'build', 'fighter');`);
  check('building more than the bay holds says so', !R('ship.buildf').ok && R('ship.buildf').state === 'no room in the bay', R('ship.buildf').state);
  g.run(`window.C2 = __quiet(campNew(2, [], { seed: 1 }));`);
  check('level 2 starts with the trip: the objective row names the place of the mission (Alpha Centauri B) and its distance', J(`__row(C2, 'ship', 'goal').ok`) && /^Alpha Centauri B  \d+ km$/.test(J(`__row(C2, 'ship', 'goal').state`)), J(`__row(C2, 'ship', 'goal').state`));
  g.run(`C2.arrivedAt = 0;`); // the cruiser is at the place (card space-game-campaign-mission-places)
  check('level 2 has no Earth: the objective row names the first cache', J(`__row(C2, 'ship', 'goal').ok`) && /^Resource cache 1  \d+ km$|cache/i.test(J(`__row(C2, 'ship', 'goal').state`)), J(`__row(C2, 'ship', 'goal').state`));
  check('the head lines: the bay and the ships out; the ore and the shield', /^bay \d+\+\d+   out \d+$/.test(J(`campPanelHead(C1, 'fleet')`)) && /^ore \d+   shield \d+$/.test(J(`campPanelHead(C1, 'ship')`)));
}

g.run(`window.C8 = __quiet(campNew(11, [], { seed: 1 })); campOrder(C8, 'launch'); __run(C8, 8);`);
check('the belt (the old level 1, fixture 11) has no convoy: escort is ready and says the escorts stay by the carrier; mine counts the ships and the rocks', J(`__row(C8, 'fleet', 'escort').ok`) && J(`__row(C8, 'fleet', 'escort').state`) === 'stay by the carrier' && /^8 ships, \d+ rocks, \d+ ore$/.test(J(`__row(C8, 'fleet', 'mine').state`)), J(`__row(C8, 'fleet', 'escort').state`));

console.log('C. the keys');
{
  g.run(`window.C3 = __quiet(campNew('home', [], { seed: 1 })); window.P = campPanelNew();`);
  const k = (code, now) => J(`__key(P, C3, '${code}', ${now})`);
  check('Q opens the FLEET panel and nothing else happens: no launch', (() => { const r = k('KeyQ', 1000); return r.used && r.opened === 'fleet' && J('P.open') === 'fleet' && J('C3.launchQ.length') === 0 && J('C3.orders.launch') === 0; })());
  check('Q again closes it', (() => { const r = k('KeyQ', 1200); return r.used && r.closed && J('P.open') === '' && J('P.closed.id') === 'fleet'; })());
  g.run(`__key(P, C3, 'KeyQ', 1300);`);
  check('Esc closes it, and Esc is its own (the scene does not also pause)', (() => { const r = k('Escape', 1500); return r.used && r.closed && J('P.open') === ''; })());
  check('Esc with no panel open is not the panels\': the scene pauses as it always did', (() => { const r = k('Escape', 1600); return !r.used && !r.closed; })());
  check('E opens the SHIP panel', (() => { const r = k('KeyE', 2000); return r.used && r.opened === 'ship' && J('P.open') === 'ship'; })());
  check('Q with SHIP open switches: FLEET opens and SHIP is what closed (its list is to fade out, the other\'s to come in); E with FLEET open switches back; E again closes', (() => { const a = k('KeyQ', 2100), b = J('[P.open, P.closed.id]'); const c = k('KeyE', 2200), d = J('[P.open, P.closed.id]'); const e = k('KeyE', 2300); return a.used && a.opened === 'fleet' && b.join() === 'fleet,ship' && c.opened === 'ship' && d.join() === 'ship,fleet' && e.closed && J('P.open') === ''; })());
  check('another key (W) closes the panel and is not used: it goes on being itself', (() => { g.run(`__key(P, C3, 'KeyQ', 2400)`); const r = k('KeyW', 2500); return !r.used && r.closed && J('P.open') === ''; })());
  g.run(`P.open = ''; __key(P, C3, 'KeyQ', 3000);`);
  check('with FLEET open, Digit1 is row 1: it launches the wing and the panel closes (it cannot also close the panel: Esc and Q do)', (() => { const r = k('Digit1', 3100); return r.used && r.ran && r.ok && r.row === 'launch' && r.closed && J('P.open') === '' && J('C3.launchQ.length') === 8; })());
  g.run(`__run(C3, 8); __key(P, C3, 'KeyQ', 4000);`);
  check('a pick that cannot be done says why in words, and still closes the panel', (() => { const r = k('Digit1', 4100); return r.used && r.ran && !r.ok && /out/i.test(r.say) && J('P.open') === ''; })());
  g.run(`__key(P, C3, 'KeyQ', 5000);`);
  check('a digit that is not a row of the open panel (7, 8, 9, 0: FLEET has six rows) does nothing and the panel stays', ['Digit7', 'Digit8', 'Digit9', 'Digit0'].every(c => { const r = k(c, 5050); return r.used && !r.ran && J('P.open') === 'fleet'; }));
  g.run(`P.open = '';`);
  check('digits 1 to 9 with no panel open do nothing at all: no order, no panel, not even a closing (the digits only pick rows of an open panel)', ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].every(c => { const r = k(c, 6000); return r.used && !r.opened && !r.ran && J('P.open') === ''; }) && J('C3.orders.mine + C3.orders.build + C3.orders.guard + C3.orders.recall + C3.orders.escort') === 0);
  check('the numeric keypad does the same as the digit row: Numpad1 with FLEET open is row 1; with none open it does nothing; its + - and 0 are not the panels\'', (() => { const P2 = 'campPanelNew()'; const none = J(`__key(${P2}, C3, 'Numpad1', 7000).opened`) === ''; g.run(`window.P7 = campPanelNew(); __key(P7, campNew('home', [], { seed: 2 }), 'KeyQ', 7000);`); const r = J(`__key(P7, campNew('home', [], { seed: 2 }), 'Numpad1', 7100)`); return none && r.ran && r.row === 'launch'; })());
  check('a key that is not a digit or Q or E (a letter, Enter) with no panel is not the panels\'', (() => { const r = k('KeyF', 7100); return !r.used && !r.closed; })());
  check('B (the warp blink since Q went to the panels) is not the panels\' key, and neither is N', ['KeyB', 'KeyN'].every(c => { const r = k(c, 7200); return !r.used && !r.opened && !r.closed; }));
}

console.log('D. a fast pick: the list has not dropped in yet (it takes 120 ms)');
{
  g.run(`window.C4 = __quiet(campNew('home', [], { seed: 1 })); window.P4 = campPanelNew(); __run(C4, 0.1);`);
  g.run(`__key(P4, C4, 'KeyQ', 10000);`);
  check('the panel is drawn at once (no hold-back), the list at nothing at 0 ms, half in at 60, all in at 120', J(`campPanelShown(P4, 10000)`) === true && J(`campPanelView(P4, 'fleet', 10000).list`) === 0 && J(`campPanelView(P4, 'fleet', 10060).list`) === 0.5 && J(`campPanelView(P4, 'fleet', 10120).list`) === 1 && J(`campPanelView(P4, 'ship', 10060).list`) === 0);
  check('Q then 3 typed within 100 ms: the escort order ran, the list was not all in, so the TAB pulses and no row flashes, and the list goes from where it was', (() => { g.run(`P4.open = ''; __key(P4, C4, 'KeyQ', 20000);`); const r = J(`__key(P4, C4, 'Digit3', 20060)`); const v = J(`campPanelView(P4, 'fleet', 20100)`); return r.ran && r.row === 'escort' && J('P4.open') === '' && J('P4.flash.shown') === false && v.flash === null && v.pulse > 0.3 && v.list > 0 && v.list < 0.5 && J('P4.closed.from') === 0.5; })());
  check('the pulse is once, 240 ms: nothing before the pick, a peak at 120 ms in, gone at 240', (() => { const at = t => J(`campPanelView(P4, 'fleet', ${20060 + t}).pulse`); return J(`campPanelView(P4, 'fleet', 20059).pulse`) === 0 && at(0) < 0.01 && at(120) > 0.99 && at(240) < 0.01 && at(300) === 0; })());
  check('Q then 1 typed fast is "launch": the wing is in the queue', (() => { g.run(`P4.open = ''; __key(P4, C4, 'KeyQ', 30000);`); const r = J(`__key(P4, C4, 'Digit1', 30050)`); return r.ran && r.row === 'launch' && J('C4.launchQ.length') === 8; })());
  check('a slower typist, 150 ms after Q, picks with the list all in: the row is to flash (shown), no pulse, and the list stays for the flash and goes after', (() => { g.run(`P4.open = ''; __key(P4, C4, 'KeyQ', 40000);`); const r = J(`__key(P4, C4, 'Digit4', 40150)`); const v0 = J(`campPanelView(P4, 'fleet', 40150)`), v1 = J(`campPanelView(P4, 'fleet', 40150 + 160 + 50)`), v2 = J(`campPanelView(P4, 'fleet', 40150 + 160 + 100)`); return r.ran && r.row === 'guard' && J('P4.flash.shown') === true && v0.list === 1 && v0.pulse === 0 && v1.list === 0.5 && v2.list === 0; })());
  check('and the pick works whether or not the list had dropped in (the order does not wait for the drawing)', J(`(() => { const P = campPanelNew(), C = __quiet(campNew('home', [], { seed: 3 })); campPanelKey(P, C, 'KeyQ', 0); campPanelKey(P, C, 'Digit1', 0); return C.launchQ.length === 8; })()`));
}

console.log('E. what a pick does');
{
  g.run(`window.C5 = __quiet(campNew('home', [], { seed: 1 })); C5.docked = 'luna'; window.__how = []; window.__co0 = campOrder; campOrder = function (C, name, arg, how) { __how.push([name, arg, how]); return __co0.apply(null, arguments); };`);
  g.run(`campPanelRun(C5, CAMP_PANELS.panels[0].rows[0], 'key'); campPanelRun(C5, CAMP_PANELS.panels[1].rows[0], 'click'); campPanelRun(C5, CAMP_PANELS.panels[1].rows[1], 'key');`);
  check('a row is campOrder with the row\'s words and how it was given (key or click): the play log reads it', J('__how.map(h => h.join(":")).join(" ")') === 'launch::key build:fighter:click build:escort:key', J('__how.map(h => h.join(":")).join(" ")'));
  g.run(`campOrder = __co0;`);
  check('build a fighter spends 25 ore and queues it; the escort row is refused with 5 ore left, in words', J('C5.ore') === 5 && J('C5.build.queue.length') === 1 && J(`campPanelRun(C5, CAMP_PANELS.panels[1].rows[1], 'key').ok`) === false);
  g.run(`window.C6 = __quiet(campNew('home', [], { seed: 1 })); window.__r6 = campPanelRun(C6, CAMP_PANELS.panels[1].rows[2], 'key');`);
  check('fly to the objective is the autopilot: C.nav is set on the goal (Earth), and it says so', J('__r6.ok') === true && J('C6.nav && C6.nav.id') === 'place:earth' && J('C6.nav.fast') === false);
  check('the panel row and the strip do the same thing: the same order, the same answer', J(`(() => { const a = __quiet(campNew('home', [], { seed: 5 })), b = __quiet(campNew('home', [], { seed: 5 })); const x = campPanelRun(a, CAMP_PANELS.panels[0].rows[0], 'key'), y = campOrder(b, 'launch', '', 'strip'); return x.ok === y.ok && x.say === y.say && a.launchQ.length === b.launchQ.length; })()`));
  check('a finished battle takes no pick: the answer says it is over', (g.run(`window.C7 = campNew('home', [], { seed: 1 }); C7.result = 'won';`), J(`campPanelRun(C7, CAMP_PANELS.panels[0].rows[0], 'key').ok`) === false && J(`__row(C7, 'fleet', 'launch').state`) === 'the battle is over'));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PANELS FAIL (${failed} of ${n})` : `\nCAMPAIGN PANELS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
