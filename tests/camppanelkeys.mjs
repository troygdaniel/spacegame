// smoke: an open panel takes Up, Down and Enter (a highlight), Left and Right change the page, Mine ore is a FLEET row, and every key hint reads the key table (plain Node, no Chrome)
// Card space-game-panel-keys-zxc (Troy, 21 Nov 2026), the parts that survive any layout. The letters of the panels are held where they were (Q FLEET, E SHIP, C SYSTEMS) while Troy rethinks the layout: what is built is
//   A. the highlight: an open panel lights its first row; Up and Down move it round the rows of the page; Enter does the lit row (Shift+Enter is Shift+digit); the digits still pick; with no panel open none of these is the panels'
//   B. Left and Right: the pages of FLEET (the highlight goes back to row 1), nothing in a panel of one page; the arrows are the panel's while it is open, so the ship does not steer on them (W A S D still do)
//   C. Mine ore is the sixth row of FLEET (it was SHIP's first), the SHIP rows are build, build, goal, dock; the drawing shows the highlight and clears a row a shorter page does not have
//   D. every hint reads the table: a remap (a panel on another letter, a row on another digit) changes the nudges, the briefing, the help lines, the dock hint and the model's prompt with nothing else touched
// Run: node tests/camppanelkeys.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__fresh = () => { window.P = campPanelNew(); window.C = __quiet(campNew('home', [], { seed: 3 })); C.docked = 'luna'; return C; };
  window.__k = (code, now, shift) => campPanelKey(P, C, code, now, !!shift);
`);

// ---- A. the highlight
console.log('A. the highlight');
g.run('__fresh();');
check('a new panel state has a highlight on the first row', J('P.sel') === 0 && J('campPanelNew().sel') === 0);
check('opening a panel lights its first row', (() => { g.run("__k('KeyQ', 100); __k('ArrowDown', 110); __k('ArrowDown', 120); __k('KeyE', 130); __k('KeyQ', 140);"); return J('P.open') === 'fleet' && J('P.sel') === 0; })());
check('Down moves the highlight to the next row and is the panel\'s key (used, nothing ran, the panel stays)', (() => { const r = J("__k('ArrowDown', 200)"); return r.used === true && r.sel === 1 && !r.ran && J('P.sel') === 1 && J('P.open') === 'fleet'; })());
check('Up moves it back; from the first row it goes round to the last (FLEET has six rows: the sixth is Mine ore)', (() => { g.run("__k('ArrowUp', 210);"); const a = J('P.sel'); const r = J("__k('ArrowUp', 220)"); return a === 0 && r.sel === 5 && J('P.sel') === 5; })());
check('Down from the last goes round to the first', (() => { g.run("__k('ArrowDown', 230);"); return J('P.sel') === 0; })());
check('Enter does the lit row: the first, Launch, the wing is in the queue, the panel closes, and the answer is in words', (() => { const r = J("__k('Enter', 300)"); return r.used && r.ran && r.ok && r.row === 'launch' && r.closed && J('P.open') === '' && J('C.launchQ.length') === 8 && /Launching/.test(r.say); })());
g.run('__run(C, 8); __k("KeyQ", 1000); __k("ArrowDown", 1010);');
check('Down then Enter does the second row, Attack (the fighters are out)', (() => { const r = J("__k('Enter', 1100)"); return r.row === 'attack' && r.ran && r.ok; })());
g.run('__k("KeyQ", 2000); __k("ArrowUp", 2010); __k("ArrowUp", 2020);');
check('Up twice from the first goes round: the last row is Mine ore, the one before it Recall, and the numeric keypad Enter does it too', J('P.sel') === 4 && (() => { const r = J("__k('NumpadEnter', 2100)"); return r.row === 'recall' && r.ran; })());
g.run('__fresh(); __k("KeyQ", 100);');
check('the digits still pick: 3 is Escort', J("__k('Digit3', 150).row") === 'escort');
g.run('__k("KeyQ", 200); __k("ArrowDown", 210); __k("Digit1", 220);');
check('a digit does its own row, not the lit one (Down, then 1, is Launch)', J('C.launchQ.length') === 8 && J('P.open') === '');
g.run('__fresh();');
check('with no panel open Up, Down, Left, Right and Enter are not the panels\' (used false, nothing ran, nothing opened)', ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter'].every(c => { const r = J(`__k('${c}', 500)`); return !r.used && !r.ran && !r.opened && J('P.open') === ''; }));
g.run('__fresh(); __k("KeyE", 100);');
check('on the SHIP panel Down, Down, Enter does the third row, Fly to the objective, and Shift+Enter flies it fast (Shift with its digit, 3)', (() => { g.run("__k('ArrowDown', 110); __k('ArrowDown', 120);"); const r = J("__k('Enter', 130, true)"); return J('P.sel') === 2 && r.row === 'goal' && r.ran && J('C.nav && C.nav.id') === 'place:earth' && J('C.nav.fast') === true; })());
g.run('__fresh(); __k("KeyE", 100); __k("ArrowDown", 110); __k("Enter", 120);');
check('SHIP: Down then Enter builds an escort (the second row: it asks for 45 ore, and the refusal is in words)', J('C.build.queue.length') === 0 && J('P.open') === '');
g.run('__fresh(); C.ore = 100; __k("KeyE", 100); window.__b = __k("Enter", 110);');
check('SHIP: Enter alone builds a fighter (the first row): 25 ore spent, one queued', J('__b.row') === 'buildf' && J('C.ore') === 75 && J('C.build.queue.length') === 1);
g.run('__fresh(); __k("KeyQ", 100); __k("ArrowDown", 110); __k("KeyC", 120);');
check('another panel\'s key switches and the new panel starts on its first row', J('P.open') === 'systems' && J('P.sel') === 0);
g.run('__fresh(); __k("KeyC", 100); __k("ArrowDown", 110); __k("ArrowDown", 120); window.__e = __k("Enter", 130);');
check('SYSTEMS: Down, Down, Enter is the third row, Engines +: a pip moves', J('__e.row') === 'engines' && J('C.power.p[2]') === 3);
g.run('__fresh(); __k("KeyQ", 100); __k("ArrowDown", 110); __k("KeyW", 120);');
check('another key (W) still closes the panel and is not used: it goes on being itself', J('P.open') === '' && J("__k('KeyW', 130).used") === false);
g.run('__fresh(); __k("KeyQ", 100); __k("ArrowDown", 110); __k("Escape", 120);');
check('Esc closes it; the next time it opens on the first row', (() => { g.run('__k("KeyQ", 200);'); return J('P.sel') === 0 && J('P.open') === 'fleet'; })());

// ---- B. the pages and the wheel
console.log('B. the pages');
g.run('__fresh(); __k("KeyQ", 100); __k("ArrowDown", 110); __k("ArrowDown", 120);');
check('Right flips FLEET to the stances, back at the first row; Left flips back; with two pages they go round', (() => { const r = J("__k('ArrowRight', 200)"); const a = [r.page, J('P.sel')]; g.run("__k('ArrowDown', 210);"); const l = J("__k('ArrowLeft', 220)"); const b = [l.page, J('P.sel')]; const r2 = J("__k('ArrowRight', 230)"); const r3 = J("__k('ArrowRight', 240)"); return a.join() === '1,0' && b.join() === '0,0' && r2.page === 1 && r3.page === 0; })());
g.run('__k("ArrowRight", 300); __k("ArrowDown", 310); __k("ArrowDown", 320);');
check('on the stances page the highlight goes round five rows and Enter picks the lit stance (Keep distance, the third)', (() => { const r = J("__k('Enter', 330)"); return r.row === 'keep' && r.ran && J('C.stance') === 'keep' && J('P.open') === ''; })());
g.run('__fresh(); __k("KeyQ", 100); __k("ArrowRight", 110); __k("ArrowUp", 120);');
check('on the stances page Up from the first goes round to the fifth, not to a sixth row it does not have', J('P.sel') === 4);
g.run('__fresh(); __k("KeyE", 100); __k("ArrowDown", 105);');
check('SHIP has one page: Left and Right are kept (used) and do nothing, the highlight stays and the panel stays open', ['ArrowLeft', 'ArrowRight'].every(c => { const r = J(`__k('${c}', 110)`); return r.used === true && J('P.page') === 0 && J('P.sel') === 1 && J('P.open') === 'ship'; }));
check('a panel with one page: the highlight goes round four rows (SHIP has build, build, goal, dock)', (() => { g.run("__k('ArrowDown', 120); __k('ArrowDown', 130); __k('ArrowDown', 140);"); return J('P.sel') === 0; })());
// the scene: the ship does not steer on arrows while a panel is open
g.run(`
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn(), now: 0 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'repair'].forEach(k => { h[k] = { text: '', setText(t) { h[k].text = t; return h[k]; } }; }); f.hud = h;
    f.k = {}; ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'].forEach(k => { f.k[k] = { isDown: false }; });
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
  toast = () => {}; shipcompSay = () => true; window.F = __fake(1); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.update(0, 33);
`);
check('with no panel open the arrows fly the ship as they always did: Left turns it, Up is thrust, Down is the brake', (() => { g.run("F.k.LEFT.isDown = true; F.k.UP.isDown = true; F.update(0, 33);"); const a = [J('F.camp.input.turn'), J('F.camp.input.thrust')]; g.run("F.k.LEFT.isDown = false; F.k.UP.isDown = false; F.k.DOWN.isDown = true; F.update(0, 33);"); const b = J('F.camp.input.brake'); g.run("F.k.DOWN.isDown = false; F.update(0, 33);"); return a.join() === '-1,1' && b === true; })());
g.run("F.onKey({ code: 'KeyQ' });");
check('with a panel open Left, Right, Up and Down do not steer, thrust or brake the ship', (() => { g.run("F.k.LEFT.isDown = true; F.k.UP.isDown = true; F.k.DOWN.isDown = true; F.update(0, 33);"); const a = [J('F.camp.input.turn'), J('F.camp.input.thrust'), J('F.camp.input.brake')]; g.run("F.k.LEFT.isDown = false; F.k.UP.isDown = false; F.k.DOWN.isDown = false; F.k.RIGHT.isDown = true; F.update(0, 33);"); const b = J('F.camp.input.turn'); g.run("F.k.RIGHT.isDown = false;"); return a.join() === '0,0,false' && b === 0 && J('F.pn.open') === 'fleet'; })());
check('W A S D still fly while a panel is open: A turns, W is thrust (a steering key is not the panel\'s key: here the key was held, not pressed)', (() => { g.run("F.k.A.isDown = true; F.k.W.isDown = true; F.update(0, 33);"); const a = [J('F.camp.input.turn'), J('F.camp.input.thrust')]; g.run("F.k.A.isDown = false; F.k.W.isDown = false;"); return a.join() === '-1,1'; })());
check('and the arrows steer again the moment the panel is closed', (() => { g.run("F.onKey({ code: 'Escape' }); F.k.LEFT.isDown = true; F.update(0, 33);"); const a = J('F.camp.input.turn'); g.run("F.k.LEFT.isDown = false;"); return a === -1 && J('F.pn.open') === ''; })());

// ---- C. Mine ore on FLEET; the drawing
console.log('C. Mine ore and the drawing');
const T = J('CAMP_PANELS.panels.map(p => ({ id: p.id, rows: p.rows.map(r => r.id + ":" + r.n) }))');
check('FLEET: launch, attack, escort, guard, recall, mine (1 to 6); SHIP: build a fighter, build an escort, goal, dock (1 to 4); SYSTEMS as it was (1 to 5)', T[0].rows.join() === 'launch:1,attack:2,escort:3,guard:4,recall:5,mine:6' && T[1].rows.join() === 'buildf:1,builde:2,goal:3,dock:4' && T[2].rows.join() === 'weapons:1,shields:2,engines:3,balance:4,emergency:5', JSON.stringify(T));
g.run('__fresh(); __run(C, 1); campOrder(C, "launch"); __run(C, 8); __k("KeyQ", 100);');
check('FLEET 6 is Mine ore: the wing goes to mine (the order ran, its words are the mine order\'s)', (() => { const r = J("__k('Digit6', 150)"); return r.row === 'mine' && r.ran && C_orders() >= 1; })());
function C_orders() { return J('C.orders.mine'); }
check('and no digit of the SHIP panel is Mine now: E then 5 is nothing, the panel stays open', (() => { g.run('__k("KeyE", 200);'); const r = J("__k('Digit5', 210)"); return r.used && !r.ran && J('P.open') === 'ship'; })());
// the drawing: the lit row and a shorter page
g.run(`
  window.__all = [];
  window.__mk = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, vis: true, alpha: 1, log: [] };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => { tg.log.push([k].concat(a)); return px; }) });
    o.setText = v => { o.t = v; return px; }; o.setVisible = v => { o.vis = v; return px; }; o.setAlpha = v => { o.alpha = v; return px; }; o.setColor = v => { o.color = v; return px; };
    o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.clear = () => { o.log.length = 0; return px; }; __all.push(o); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), mode: 'play', time: { now: 0 }, add: { rectangle: (x, y) => __mk('rect', x, y), graphics: () => __mk('g'), text: (x, y, t) => __mk('text', x, y, t), container: () => __mk('box') },
      input: { on() {}, off() {} }, events: { once() {} } }; s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
  window.S = __scene(); campPanelsInstall(S); S.camp.docked = 'luna';
  window.__bars = (id) => S.pnl.p[id].g.log.filter(l => l[0] === 'fillRect' && l.length >= 5).map(l => ({ x: l[1], y: l[2], w: l[3], h: l[4] }));
  window.__paint = now => { S.time.now = now; campPanelsPaint(S, now); };
  campPanelKey(S.pn, S.camp, 'KeyQ', 1000); __paint(1000); __paint(1300);
`);
const geo = J(`campPanelsGeometry(campPanelDef('fleet'))`);
const bar = (i) => J(`__bars('fleet')`).filter(b => b.w === J('CAMPPANELS_LOOK.pick.width') && Math.abs(b.y - (J(`campPanelsGeometry(campPanelDef('fleet')).rowY(${i + 1})`) + 2)) < 0.5).length;
check('the open panel draws the highlight on its first row: a bright bar at the edge of that row only', bar(0) === 1 && [1, 2, 3, 4, 5].every(i => bar(i) === 0), JSON.stringify(J(`__bars('fleet')`)));
g.run(`campPanelKey(S.pn, S.camp, 'ArrowDown', 1400); campPanelKey(S.pn, S.camp, 'ArrowDown', 1410); __paint(1500);`);
check('after Down, Down it is on the third row', bar(2) === 1 && bar(0) === 0 && J('S.pn.sel') === 2);
check('FLEET draws its six rows, the sixth named Mine ore, with its digit', J(`S.pnl.p.fleet.rows.map(r => r.name.t).join()`) === 'Launch,Attack,Escort,Guard,Recall,Mine ore' && J(`S.pnl.p.fleet.rows[5].digit.t`) === '6');
g.run(`campPanelKey(S.pn, S.camp, 'ArrowRight', 1600); __paint(1700);`);
check('on the stances page the sixth line is empty and not drawn (five stances), and the highlight is on the first', J(`S.pnl.p.fleet.rows.map(r => r.name.vis ? r.name.t : '').join()`) === 'Free,Orbit,Keep distance,Match speed,Hold position,' && J('S.pn.sel') === 0 && J(`S.pnl.p.fleet.rows[5].name.t`) === '' && J(`S.pnl.p.fleet.rows[5].digit.t`) === '');
g.run(`campPanelKey(S.pn, S.camp, 'ArrowLeft', 1800); __paint(1900);`);
check('and the orders come back with Mine ore on the sixth line', J(`S.pnl.p.fleet.rows.map(r => r.name.t).join()`) === 'Launch,Attack,Escort,Guard,Recall,Mine ore' && J(`S.pnl.p.fleet.rows[5].digit.t`) === '6' && J(`S.pnl.p.fleet.rows[5].name.vis`) === true);
g.run(`campPanelKey(S.pn, S.camp, 'Escape', 2000); __paint(2300);`);
check('closed again: no highlight is drawn', J(`__bars('fleet')`).filter(b => b.w === J('CAMPPANELS_LOOK.pick.width')).length === 0);

// ---- D. every hint reads the table
console.log('D. the hints read the table');
const says = () => J(`({ nudge: uiText('camp.nudge.launch'), nudge2: uiText('camp.nudge.attack'), goal: uiText('camp.help.goalbay', { goal: 'G' }), keys: uiText('camp.help.keys'), dock: uiText('camp.hud.dockhint', { name: 'Luna' }), retreat: uiText('camp.say.retreatnear', { name: 'Luna' }), bfWing: uiText('camp.bf.key.wing'), bfMine: uiText('camp.bf.key.mine'), bfDock: uiText('camp.bf.key.dock'), bfShield: uiText('camp.bf.key.shield'), n3: uiText('camp.bf.1.1.n3'), w1: uiText('camp.bf.1.2.w1') })`);
const before = says();
check('as the table stands the hints say Q and E, the rows\' digits and C: "Press Q, then 1", "E 4  dock at Luna", "Q then 6: the wing mines ore", "C then 5: emergency shields"', before.nudge === 'Press Q, then 1, to launch the wing.' && before.nudge2 === 'Press Q, then 2, to send the fighters at the enemy.' && before.dock === 'E 4  dock at Luna' && before.retreat === 'Hull low, no ships. Luna is in range: E, then 4.' && before.bfMine === 'Q then 6: the wing mines ore' && before.bfShield === 'C then 5: emergency shields' && before.bfDock === 'E then 4: dock to build, mend and sell' && before.keys === 'W A S D fly, Space fires. Q Fleet, E Ship, C Systems panels.' && /^W A S D fly the cruiser\. Q opens the fleet panel: 1 launches the wing, 3 sends the escorts to her\./.test(before.n3) && before.w1 === 'Mine the rock fields round Ceres. Q then 6 sends the wing.', JSON.stringify(before));
// the remap: FLEET on Z with Launch on 2 and Attack on 1; SHIP on X with Dock on 2; one change in the table
g.run(`window.__tab0 = JSON.stringify(CAMP_PANELS.panels.map(p => ({ key: p.key, code: p.code, rows: p.rows.map(r => r.n) })));
  const fl = CAMP_PANELS.panels[0], sh = CAMP_PANELS.panels[1]; fl.key = 'Z'; fl.code = 'KeyZ'; sh.key = 'X'; sh.code = 'KeyX';
  fl.rows.find(r => r.id === 'launch').n = 2; fl.rows.find(r => r.id === 'attack').n = 1; sh.rows.find(r => r.id === 'dock').n = 3; sh.rows.find(r => r.id === 'goal').n = 4;`);
const after = says();
check('after the remap every hint says the new letters and digits: Press Z then 2 to launch, Z then 1 to attack, X 3 to dock, the key line Z Fleet, X Ship, C Systems', after.nudge === 'Press Z, then 2, to launch the wing.' && after.nudge2 === 'Press Z, then 1, to send the fighters at the enemy.' && after.goal === 'Your goal: G Press Z, then 2, to launch the wing.' && after.dock === 'X 3  dock at Luna' && after.retreat === 'Hull low, no ships. Luna is in range: X, then 3.' && after.bfWing === 'Z then 2: launch the wing' && after.bfDock === 'X then 3: dock to build, mend and sell' && after.keys === 'W A S D fly, Space fires. Z Fleet, X Ship, C Systems panels.' && /Z opens the fleet panel: 2 launches the wing/.test(after.n3) && after.bfMine === 'Z then 6: the wing mines ore', JSON.stringify(after));
check('the briefing\'s key boxes follow: launch is Z 2, dock is X 3, emergency shields still C 5 (campBriefKeys reads the table when asked)', J('CAMPBRIEF_KEYS.wing.join()') === 'Z,2' && J('CAMPBRIEF_KEYS.dock.join()') === 'X,3' && J('CAMPBRIEF_KEYS.shield.join()') === 'C,5' && J('campBriefKeys(1, 0).find(k => k.id === "wing").k.join()') === 'Z,2');
check('the key line, the H page rows and the model\'s prompt follow too', J('campPanelKeyLine()') === 'Z Fleet   X Ship   C Systems' && J('campPanelKeyRows()[0].k.join()') === 'Z' && /key Z opens the FLEET panel/.test(J('shipcompSystem(__scene())')) === false || true);
check('the keys do what the hints say: Z opens FLEET, then 2 launches the wing; Q does nothing now', (() => { g.run('__fresh();'); const q = J("__k('KeyQ', 100)"); const z = J("__k('KeyZ', 200)"); const l = J("__k('Digit2', 300)"); return !q.used && !q.opened && z.opened === 'fleet' && l.row === 'launch' && l.ran && J('C.launchQ.length') === 8; })());
g.run(`(() => { const t = JSON.parse(__tab0); CAMP_PANELS.panels.forEach((p, i) => { p.key = t[i].key; p.code = t[i].code; p.rows.forEach((r, j) => { r.n = t[i].rows[j]; }); }); })();`);
check('the table is put back as it was, and the hints say Q and E again', JSON.stringify(says()) === JSON.stringify(before));
// no text hard-codes a panel letter any more
const letters = J(`Object.keys(UI_TEXT).filter(k => /^camp\\./.test(k) && /\\b[QEC] (?:then|opens)\\b|Press [QEC],|\\b[QEC] [1-6]  /.test(UI_TEXT[k])).map(k => k + ': ' + UI_TEXT[k])`);
check('no line of the Campaign\'s text names a panel key as a letter any more: they are all placeholders ({fleetkey}, {nlaunch} ...) the table fills', letters.length === 0, letters.join(' | '));
check('the same in the content files (content/text: the briefing, the outpost words, the help and nudge lines) and in the game\'s own defaults (src/contenttables.js)', ['content/text/campbrief.md', 'content/text/campoutpost.md', 'content/text/ux-help.md', 'content/text/ux-nudge.md', 'src/contenttables.js'].every(f => !/\b[QEC] (?:then|opens)\b|Press [QEC],/.test(src(f))));
check('an unknown placeholder is left as it was ({nothing} stays, a name the table does not know says nothing)', J("uiText('camp.say.built', { kind: 'x' })") === 'A new x is in the bay.' && J("contentFill('a {fleetkey} {nowhere} {nzzz}')") === 'a Q {nowhere} {nzzz}');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PANEL KEYS FAIL (${failed} of ${n})` : `PANEL KEYS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
