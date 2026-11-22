// smoke: the Campaign's two hands: the FLEET panel (left) and the SHIP panel (right), always on, one key one order; the table, the live state of every row, the keys, the pages (plain Node, no Chrome)
// Cards space-game-campaign-keys-help and space-game-two-hands-keys (Troy, 21 Nov 2026). The table is CAMP_PANELS and CAMP_KEYS (src/data_controls.js), the logic src/camppanel.js. Plain data and functions; the drawing and the scene's keys are tests/campanelsdraw.mjs.
//   A. the table: two panels, every row a key and an order the game has (or the autopilot, the blink, a cycle), every refusal has its few words
//   B. the live state of each row: what it will do, or why it cannot, in the cases a player meets
//   C. the keys: a row's key does it at once, the page key turns the page, A D S X are the target's, a digit means what the page says, the letter rows work on every page
//   D. the pages: a later page goes back to the first after CAMP_PANELS.back ms or a pick
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
  window.__row = (C, panel, id) => [0, 1, 2].map(pg => campPanelRows(C, panel, pg).find(r => r.id === id)).find(Boolean) || null;
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now);
`);

console.log('A. the table');
{
  const T = J('CAMP_PANELS');
  check('two panels: FLEET at the left (page key Q), SHIP at the right (page key P), each with the code of its page key; no SYSTEMS panel', T.panels.length === 2 && T.panels[0].id === 'fleet' && T.panels[0].side === 'left' && T.panels[0].key === 'Q' && T.panels[0].code === 'KeyQ' && T.panels[1].id === 'ship' && T.panels[1].side === 'right' && T.panels[1].key === 'P' && T.panels[1].code === 'KeyP');
  check('FLEET has seven rows (launch, attack, escort, guard on 1 2 3 4, mine on W, stance on E, convoy on R) and SHIP eleven (goal 7, target 8, burn 9, dock 0, shields J, engines K, weapons L, balance ;, emergency U, missile Enter, blink I), each with a key cap, a code, a label and a line for the help page',
    T.panels[0].rows.map(r => r.id + ':' + r.k).join() === 'launch:1,attack:2,escort:3,guard:4,mine:W,stance:E,convoy:R' && T.panels[1].rows.map(r => r.id + ':' + r.k).join() === 'goal:7,target:8,burn:9,dock:0,shields:J,engines:K,weapons:L,balance:;,emergency:U,missile:Enter,blink:I'
    && T.panels.every(p => p.rows.every((r, i) => r.n === i + 1 && r.k && r.code && r.label && r.help)));
  check('FLEET has two more pages (the stances on 1 to 5, the convoy orders on 1 to 4) and SHIP one more (BUILD: a fighter on 7, an escort on 8)', T.panels[0].page2.rows.map(r => r.id).join() === 'free,orbit,keep,match,hold' && T.panels[0].page3.rows.map(r => r.id).join() === 'ctuck,chold,crun,ccarry' && T.panels[1].page2.rows.map(r => r.id + ':' + r.k).join() === 'buildf:7,builde:8' && T.pages === 3);
  check('no two rows that are live together share a key: the first pages of the two panels, and each later page with the letter rows of its panel', (() => { const live = p => [p.rows, p.page2 && p.page2.rows, p.page3 && p.page3.rows].filter(Boolean).map((l, i) => (i ? l.concat(p.rows.filter(r => !/^Digit\d$/.test(r.code))) : l).map(r => r.code)); const all = [...live(T.panels[0]), ...live(T.panels[1])].map(c => c); const firsts = [...T.panels[0].rows, ...T.panels[1].rows].map(r => r.code); return new Set(firsts).size === firsts.length && live(T.panels[0]).every(l => new Set(l).size === l.length) && live(T.panels[1]).every(l => new Set(l).size === l.length); })());
  check('the keys that are not rows (CAMP_KEYS): the arrows fly, Space fires, Tab the map, A D S X the target, - = and Backspace the zoom, / and . the strip and the voice, H, M, Esc; and none of them is a code of a row', (() => { const K = J('CAMP_KEYS'), rows = new Set([...T.panels.flatMap(p => [p.rows, p.page2 && p.page2.rows, p.page3 && p.page3.rows].filter(Boolean).flat().map(r => r.code))]); return K.fly.codes.length === 4 && K.fire.codes[0] === 'Space' && K.map.codes[0] === 'Tab' && K.next.codes[0] === 'KeyD' && K.last.codes[0] === 'KeyA' && K.near.codes[0] === 'KeyS' && K.clear.codes[0] === 'KeyX' && K.zoomreset.codes[0] === 'Backspace' && K.strip.codes[0] === 'Slash' && K.voice.codes[0] === 'Period' && Object.values(K).every(k => !k.codes.some(c => rows.has(c) && c !== 'KeyH')); })());
  check('there is no hold-back: a row lights for 160 ms when its key is pressed, and a later page goes back after 6 s', T.anim.flash === 160 && T.back === 6000 && !('delay' in T));
  g.run(`window.__C = __quiet(campNew('home', [], { seed: 1 }));`);
  check('every order the table names is one the game knows (campOrder never answers "what")', J(`CAMP_PANELS.panels.flatMap(p => [p.rows, p.page2 && p.page2.rows, p.page3 && p.page3.rows].filter(Boolean).flat()).filter(r => r.order).every(r => campCheck(__C, r.order, r.arg || '').code !== 'what')`));
  const codes = J(`(() => { const out = new Set(); for (const lvl of [1, 2]) { const C = __quiet(campNew(lvl, [], { seed: 1 })); for (let k = 0; k < 6; k++) { CAMP_PANELS.panels.flatMap(p => [p.rows, p.page2 && p.page2.rows, p.page3 && p.page3.rows].filter(Boolean).flat()).filter(r => r.order).forEach(r => { const q = campCheck(C, r.order, r.arg || ''); if (!q.ok) out.add(q.code); }); __run(C, 4); } } return [...out]; })()`);
  check('every refusal the rows meet has its few words in the table', codes.length >= 5 && codes.every(c => J(`!!CAMP_PANELS.why['${c}']`)), codes.join());
  check('the table is the one source: the settings and help rows are made from it (campPanelKeyRows: a line for each row of each panel, then the page key of each)', J('campPanelKeyRows().length') === 7 + 1 + 11 + 1 && J('campPanelKeyRows().every(r => r.k.length === 1 && r.t && r.sub)') && J('campPanelKeyRows()[0].k[0]') === '1' && J('campPanelKeyRows()[7].k[0]') === 'Q');
  check('the key line says the panels\' page keys from the table: Q Fleet   P Ship', J('campPanelKeyLine()') === 'Q Fleet   P Ship');
  check('the hints read the table: {keylaunch} {keymine} {keydock} {keyemergency} are the rows\' keys, {fleetkey} the page key, {keymap} {keyzoomreset} the others\'', J(`['keylaunch', 'keymine', 'keydock', 'keyemergency', 'fleetkey', 'shipkey', 'keymap', 'keyzoomreset', 'keynext'].map(campKeyVar).join('')`) === '1W0UQPTabBackspaceD');
}

console.log('B. the live state of each row');
{
  g.run(`window.C1 = __quiet(campNew('home', [], { seed: 1 })); C1.docked = 'luna';`); // docked: the build rows can be built (undocked they say "Dock at an outpost to build.": tests/campoutpost.mjs)
  const R = id => J(`__row(C1, '${id.split('.')[0]}', '${id.split('.')[1]}')`);
  check('fresh battle, fleet: launch is ready and says what is in the bay; the rest wait for a wing', R('fleet.launch').ok && /6 fighters, 2 escorts/.test(R('fleet.launch').state) && ['attack', 'escort', 'guard'].every(r => !R('fleet.' + r).ok));
  check('and say why in a few words: no fighters out, no escorts out, no ships out', R('fleet.attack').state === 'no fighters out' && R('fleet.escort').state === 'no escorts out' && R('fleet.guard').state === 'no ships out');
  check('fleet panel, fresh: mine cannot (no ships out: the whole wing mines), and on the ship panel a fighter can be built (30 ore, 25 needed) with its cost and time, an escort cannot (needs 45 ore)', R('fleet.mine').state === 'no ships out' && R('ship.buildf').ok && R('ship.buildf').state === '25 ore, 6 s' && !R('ship.builde').ok && R('ship.builde').state === 'needs 45 ore');
  g.run(`window.__dk = (() => { const real = campOutpostNear, was = C1.docked; C1.docked = ''; try { campOutpostNear = () => null; const off = campPanelRows(C1, 'ship').find(r => r.id === 'dock'); campOutpostNear = () => ({ o: { name: 'Occator Works', id: 'ceres' }, d: 10 }); const on = campPanelRows(C1, 'ship').find(r => r.id === 'dock'); return { off: [off.ok, off.short], on: [on.ok, on.short, on.state] }; } finally { campOutpostNear = real; C1.docked = was; } })();`); // the dock row names the outpost in range (wrap-up: it had no word when it could be done)
  check('the dock row of the SHIP panel names the outpost in range in its short line, and has nothing to say out of range', J('__dk.on[0]') === true && J('__dk.on[1]') === 'Occator Works' && J('__dk.on[2]') === 'dock at Occator Works' && J('__dk.off[1]') !== 'Occator Works', JSON.stringify(J('__dk')));
  check('the fly row names the objective and how far: level 1 starts with Earth', R('ship.goal').ok && /^Earth  \d+ km$/.test(R('ship.goal').state), R('ship.goal').state);
  g.run(`campOrder(C1, 'launch'); __run(C1, 1);`);
  check('launching: launch says "still launching" and the others say "no fighters out" until the first one is out', !R('fleet.launch').ok && R('fleet.launch').state === 'still launching');
  g.run(`__run(C1, 6);`);
  check('wing out: the launch row becomes Recall and says how many are out; attack and guard are ready with the count; escort has no convoy yet', R('fleet.launch').tag === 'Recall' && R('fleet.launch').ok && R('fleet.launch').state === '8 ships out' && R('fleet.attack').ok && R('fleet.attack').state === '6 fighters out' && R('fleet.guard').ok && R('fleet.guard').state === '8 ships out' && !R('fleet.escort').ok && R('fleet.escort').state === 'no convoy to escort');
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
  check('1 launches the wing at once: no panel to open, the wing is in the queue, and the answer is in words', (() => { const r = k('Digit1', 1000); return r.used && r.ran && r.ok && r.row === 'launch' && r.fleet && J('C3.launchQ.length') === 8 && r.say.length > 0; })());
  g.run(`__run(C3, 8);`);
  check('1 again, with the whole wing out, is Recall: the toggle (the row says Recall too)', (() => { const was = J(`__row(C3, 'fleet', 'launch').tag`); const r = k('Digit1', 2000); return was === 'Recall' && r.ran && r.ok && J('C3.orders.recall') === 1; })());
  check('2 (attack), 4 (guard) and W (mine) are one key each: fighters are out, so they run', (() => { g.run(`__run(C3, 4); C3.pickups.push({ id: 'p1', kind: 'rock', x: 500, y: 0, ore: 20, born: 0 });`); return ['Digit2', 'Digit4', 'KeyW'].every((c, i) => { const r = k(c, 3000 + i); return r.used && r.ran && r.fleet && r.row === ['attack', 'guard', 'mine'][i]; }); })());
  check('a key that cannot be done says why in words and the panel does not change (3: the escorts)', (() => { g.run(`window.C3b = __quiet(campNew('home', [], { seed: 1 })); window.P3b = campPanelNew();`); const r = J(`__key(P3b, C3b, 'Digit3', 3100)`); return r.used && r.ran && !r.ok && /escort/i.test(r.say) && J('P3b.page.fleet') === 0; })());
  check('the numeric keypad does the same as the digit row: Numpad1 launches, Numpad7 is the goal', (() => { g.run(`window.C3c = __quiet(campNew('home', [], { seed: 1 })); window.P3c = campPanelNew();`); const a = J(`__key(P3c, C3c, 'Numpad1', 0)`), b = J(`__key(P3c, C3c, 'Numpad7', 0)`); return a.row === 'launch' && a.ran && b.row === 'goal' && b.ran; })());
  check('Q turns the FLEET page (1/3 to 2/3 to 3/3 and round); P turns the SHIP page (two pages); neither is an order', (() => { g.run(`window.P4 = campPanelNew();`); const a = J(`__key(P4, C3c, 'KeyQ', 0)`), p1 = J('P4.page.fleet'); J(`__key(P4, C3c, 'KeyQ', 10)`); const p2 = J('P4.page.fleet'); J(`__key(P4, C3c, 'KeyQ', 20)`); const p3 = J('P4.page.fleet'); const b = J(`__key(P4, C3c, 'KeyP', 30)`), s1 = J('P4.page.ship'); J(`__key(P4, C3c, 'KeyP', 40)`); return a.used && !a.ran && a.fleet && p1 === 1 && p2 === 2 && p3 === 0 && b.used && !b.ran && !b.fleet && s1 === 1 && J('P4.page.ship') === 0; })());
  check('on the stances page a digit picks the stance (4 is match speed) and the panel goes back to its first page', (() => { g.run(`window.P5 = campPanelNew(); window.C5b = __quiet(campNew('home', [], { seed: 1 })); campOrder(C5b, 'launch'); __run(C5b, 8);`); J(`__key(P5, C5b, 'KeyQ', 0)`); const r = J(`__key(P5, C5b, 'Digit4', 10)`); return r.ran && r.ok && r.row === 'match' && J('C5b.stance') === 'match' && J('P5.page.fleet') === 0; })());
  check('on the convoy page 1 is Tuck in (no convoy yet: refused in words); on BUILD 7 builds a fighter (docked) and 8 an escort; the page goes back after each', (() => { g.run(`window.P6 = campPanelNew(); window.C6b = __quiet(campNew('home', [], { seed: 1 })); C6b.docked = 'luna'; C6b.ore = 200;`); J(`__key(P6, C6b, 'KeyQ', 0)`); J(`__key(P6, C6b, 'KeyQ', 1)`); const t = J(`__key(P6, C6b, 'Digit1', 2)`); J(`__key(P6, C6b, 'KeyP', 10)`); const a = J(`__key(P6, C6b, 'Digit7', 20)`), back = J('P6.page.ship'); J(`__key(P6, C6b, 'KeyP', 30)`); const c = J(`__key(P6, C6b, 'Digit8', 40)`); return t.row === 'ctuck' && !t.ok && a.row === 'buildf' && a.ok && back === 0 && c.row === 'builde' && c.ok && J('C6b.build.queue.length') === 2; })());
  check('the letter rows work on every page: E steps the stance (once it has rested) from the stances page and the page goes on being the stances page', (() => { g.run(`window.P7 = campPanelNew(); window.C7b = __quiet(campNew('home', [], { seed: 1 }));`); J(`__key(P7, C7b, 'KeyQ', 0)`); const was = J('C7b.stance'), r = J(`__key(P7, C7b, 'KeyE', 10)`), early = J('C7b.stance'); g.run(`campPanelSettle(P7, C7b, 10 + CAMP_PANELS.settle)`); return was === 'free' && r.row === 'stance' && r.used && !r.ran && early === 'free' && J('C7b.stance') === 'orbit' && J('P7.page.fleet') === 1; })());
  check('E steps through free, orbit, keep, match, hold and round to free (each press rested 0.7 s)', (() => { g.run(`window.P8 = campPanelNew(); window.C8b = __quiet(campNew('home', [], { seed: 1 }));`); const st = []; for (let i = 0; i < 6; i++) { J(`__key(P8, C8b, 'KeyE', ${i * 1000})`); g.run(`campPanelSettle(P8, C8b, ${i * 1000 + 700})`); st.push(J('C8b.stance')); } return st.join() === 'orbit,keep,match,hold,free,orbit'; })());
  check('A, D and S pick the target and X clears it: the keys of the target, one target for everything (src/camptarget.js); none is an order', (() => { g.run(`window.P9 = campPanelNew(); window.C9 = __quiet(campNew('home', [], { seed: 1 })); campSpawn(C9, 'raider', C9.carrier.x + 900, C9.carrier.y); campSpawn(C9, 'raider', C9.carrier.x + 400, C9.carrier.y);`); const d = J(`__key(P9, C9, 'KeyD', 0)`), t1 = J('C9.tgt'); const d2 = J(`__key(P9, C9, 'KeyD', 1)`), t2 = J('C9.tgt'); const a = J(`__key(P9, C9, 'KeyA', 2)`), t3 = J('C9.tgt'); const s = J(`__key(P9, C9, 'KeyS', 3)`); const x = J(`__key(P9, C9, 'KeyX', 4)`); return d.used && !d.ran && d.fleet && t1 !== t2 && t3 === t1 && s.used && x.used && J('C9.tgt') === ''; })());
  check('a key that is none of these (F, B, Z, N, C) is not the panels\': the scene goes on to the next reader', ['KeyF', 'KeyB', 'KeyZ', 'KeyN', 'KeyC'].every(c => { const r = k(c, 7000); return !r.used && !r.ran; }));
}

console.log('C2. the cycling keys wait for the key to rest');
{
  g.run(`window.C9 = __quiet(campNew('home', [], { seed: 1 })); window.P9 = campPanelNew();`);
  check('E is the choice on the panel row at once, and no order is given: the stance is as it was, the row says "> Orbit" in the panel\'s colour, and the key answer says what is pending', (() => { const r = J(`__key(P9, C9, 'KeyE', 1000)`), row = J(`campPanelRows(C9, 'fleet', 0, P9).find(x => x.id === 'stance')`); return r.used && r.fleet && !r.ran && r.pending === 'orbit' && J('C9.stance') === 'free' && J('C9.orders.stance') === 0 && row.state === '> Orbit' && row.marked === true; })());
  check('passing through: E, E, E within 0.7 s each (Orbit, Keep distance, Match speed) gives ONE order after the last press, Match speed, and none to the ones passed', (() => { g.run(`__key(P9, C9, 'KeyE', 1300); __key(P9, C9, 'KeyE', 1600);`); const mid = J('campPanelSettle(P9, C9, 2000)'); const early = J('C9.stance') === 'free' && J('C9.orders.stance') === 0 && J('P9.pend.id') === 'match' && mid.ran === false; const late = J('campPanelSettle(P9, C9, 2300)'); return early && late.ran && late.ok && late.row === 'stance' && J('C9.stance') === 'match' && J('C9.orders.stance') === 1 && J('P9.pend') === null; })());
  g.run(`window.C10 = __quiet(campNew('home', [], { seed: 1 })); window.P10 = campPanelNew();`); // (R with a convoy: tests/campconvoy.mjs)
  check('a choice the game would refuse is refused at once, in words, and nothing waits: R with no escorted ship', (() => { const r = J(`__key(P10, C10, 'KeyR', 5000)`); return r.ran && !r.ok && /escorted|convoy/i.test(r.say) && J('P10.pend') === null; })());
  check('cycled round to where it was, nothing is given: E five times (free to free) and rest: no order, no toast', (() => { g.run(`window.P11 = campPanelNew(); window.C11 = __quiet(campNew('home', [], { seed: 1 })); for (let i = 0; i < 5; i++) __key(P11, C11, 'KeyE', 100 + i * 100);`); const r = J('campPanelSettle(P11, C11, 5000)'); return !r.ran && J('C11.orders.stance') === 0 && J('P11.pend') === null; })());
  check('a stance picked by its digit on its page settles the waiting choice (the digit is explicit); a click on the row steps at once (a click is a decision)', (() => { g.run(`window.P12 = campPanelNew(); window.C12 = __quiet(campNew('home', [], { seed: 1 })); __key(P12, C12, 'KeyE', 0); __key(P12, C12, 'KeyQ', 10);`); const r = J(`__key(P12, C12, 'Digit4', 20)`); const a = r.ran && J('C12.stance') === 'match' && J('P12.pend') === null; g.run(`window.C13 = __quiet(campNew('home', [], { seed: 1 })); campPanelRun(C13, CAMP_PANELS.panels[0].rows[5], 'click');`); return a && J('C13.stance') === 'orbit'; })());
  check('the time is CAMP_PANELS.settle (700 ms), a table number', J('CAMP_PANELS.settle') === 700);
}

console.log('D. the pages go back');
{
  g.run(`window.C4 = __quiet(campNew('home', [], { seed: 1 })); window.P4 = campPanelNew(); __key(P4, C4, 'KeyQ', 10000);`);
  check('the panel is on its stances page, and 5 s later still is', J('P4.page.fleet') === 1 && (g.run(`campPanelTick(P4, 15000)`), J('P4.page.fleet') === 1));
  check('6 s after it was turned it goes back to its first page (the next key finds it there: a digit is a launch again)', (g.run(`campPanelTick(P4, 16000)`), J('P4.page.fleet') === 0) && J(`__key(P4, C4, 'Digit1', 20000).row`) === 'launch');
  check('turning it again restarts the time: Q at 10 s, Q at 14 s (stances, convoy), still on the convoy page at 19 s', (() => { g.run(`P4.page.fleet = 0; __key(P4, C4, 'KeyQ', 30000); __key(P4, C4, 'KeyQ', 34000); campPanelTick(P4, 39000);`); return J('P4.page.fleet') === 2; })());
}

console.log('E. what a pick does');
{
  g.run(`window.C5 = __quiet(campNew('home', [], { seed: 1 })); C5.docked = 'luna'; window.__how = []; window.__co0 = campOrder; campOrder = function (C, name, arg, how) { __how.push([name, arg, how]); return __co0.apply(null, arguments); };`);
  g.run(`campPanelRun(C5, CAMP_PANELS.panels[0].rows[0], 'key'); campPanelRun(C5, CAMP_PANELS.panels[1].page2.rows[0], 'click'); campPanelRun(C5, CAMP_PANELS.panels[1].page2.rows[1], 'key');`);
  check('a row is campOrder with the row\'s words and how it was given (key or click): the play log reads it', J('__how.map(h => h.join(":")).join(" ")') === 'launch::key build:fighter:click build:escort:key', J('__how.map(h => h.join(":")).join(" ")'));
  g.run(`campOrder = __co0;`);
  check('build a fighter spends 25 ore and queues it; the escort row is refused with 5 ore left, in words', J('C5.ore') === 5 && J('C5.build.queue.length') === 1 && J(`campPanelRun(C5, CAMP_PANELS.panels[1].page2.rows[1], 'key').ok`) === false);
  g.run(`window.C6 = __quiet(campNew('home', [], { seed: 1 })); window.__r6 = campPanelRun(C6, CAMP_PANELS.panels[1].rows[0], 'key');`);
  check('fly to the objective is the autopilot: C.nav is set on the goal (Earth), and it says so', J('__r6.ok') === true && J('C6.nav && C6.nav.id') === 'place:earth' && J('C6.nav.fast') === false);
  check('the panel row and the strip do the same thing: the same order, the same answer', J(`(() => { const a = __quiet(campNew('home', [], { seed: 5 })), b = __quiet(campNew('home', [], { seed: 5 })); const x = campPanelRun(a, CAMP_PANELS.panels[0].rows[0], 'key'), y = campOrder(b, 'launch', '', 'strip'); return x.ok === y.ok && x.say === y.say && a.launchQ.length === b.launchQ.length; })()`));
  check('a finished battle takes no pick: the answer says it is over', (g.run(`window.C7 = campNew('home', [], { seed: 1 }); C7.result = 'won';`), J(`campPanelRun(C7, CAMP_PANELS.panels[0].rows[0], 'key').ok`) === false && J(`__row(C7, 'fleet', 'launch').state`) === 'the battle is over'));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PANELS FAIL (${failed} of ${n})` : `\nCAMPAIGN PANELS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
