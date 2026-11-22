// smoke: the two hands in the scene (the arrows fly and W A S D do not, a key is an order, A D S X pick the target), the drawing of both panels, and every key hint reads the key table: a remap is one change in it (plain Node, no Chrome)
// Cards space-game-panel-keys-zxc and space-game-two-hands-keys (Troy, 21 Nov 2026). The keys of the table are CAMP_PANELS and CAMP_KEYS (src/data_controls.js); the rules are tests/campanels.mjs and tests/camptarget.mjs.
//   A. the scene: the arrows fly, W A S D do not (they are the fleet's and the target's), the map's keys, command time after a fleet key
//   B. the drawing: both panels are on from the first frame with a key on every row; the page, the target line, the call in place of the rows; a row lights when its key is pressed
//   C. every hint reads the table: a remap (a panel on another letter, a row on another key) changes the nudges, the briefing, the help lines, the dock hint and the model's prompt with nothing else
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
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn(), now: 0 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'repair'].forEach(k => { h[k] = { text: '', setText(t) { h[k].text = t; return h[k]; } }; }); f.hud = h;
    f.k = {}; ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'].forEach(k => { f.k[k] = { isDown: false }; });
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
  toast = () => {}; shipcompSay = () => true; window.F = __fake(1); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.update(0, 33);
`);

// ---- A. the scene
console.log('A. the scene');
check('the arrows fly: Left turns, Up is thrust, Down is the brake (and there is no panel to open to stop them)', (() => { g.run("F.k.LEFT.isDown = true; F.k.UP.isDown = true; F.update(0, 33);"); const a = [J('F.camp.input.turn'), J('F.camp.input.thrust')]; g.run("F.k.LEFT.isDown = false; F.k.UP.isDown = false; F.k.DOWN.isDown = true; F.update(0, 33);"); const b = J('F.camp.input.brake'); g.run("F.k.DOWN.isDown = false; F.k.RIGHT.isDown = true; F.update(0, 33);"); const c = J('F.camp.input.turn'); g.run("F.k.RIGHT.isDown = false; F.update(0, 33);"); return a.join() === '-1,1' && b === true && c === 1; })());
check('W A S D do not fly: A does not turn, W is no thrust, S is no brake (they are the fleet\'s and the target\'s keys)', (() => { g.run("F.k.A.isDown = true; F.k.W.isDown = true; F.k.S.isDown = true; F.k.D.isDown = true; F.update(0, 33);"); const a = [J('F.camp.input.turn'), J('F.camp.input.thrust'), J('F.camp.input.brake')]; g.run("F.k.A.isDown = F.k.W.isDown = F.k.S.isDown = F.k.D.isDown = false; F.update(0, 33);"); return a.join() === '0,0,false'; })());
check('1 launches the wing at once from the scene, with an answer; and Q turns the FLEET page without launching anything', (() => { g.run("F.onKey({ code: 'Digit1' });"); const a = J('F.camp.launchQ.length') + J('F.camp.launched'); g.run("F.onKey({ code: 'KeyQ' });"); return a >= 8 && J('F.pn.page.fleet') === 1; })());
g.run("F.pn.page.fleet = 0;");
check('a fleet key slows the battle for CAMP.slow.after ms (command time): the scene is slowed after 1, and not after a SHIP key (J)', (() => { g.run("F.time.now = 5000; F.slowUntil = 0; F.onKey({ code: 'KeyJ' });"); const ship = J('F.slowUntil'); g.run("F.onKey({ code: 'Digit4' });"); return ship === 0 && J('F.slowUntil') === 5000 + J('CAMP.slow.after') && J('campSlowScale(F)') === J('CAMP.slow.scale'); })());
check('and it is over again CAMP.slow.after ms later', (() => { g.run("F.time.now = 5000 + CAMP.slow.after + 1;"); return J('campSlowScale(F)') === 1; })());
check('a key the table does not know goes on to the next reader: F, B, Z, C, N and 0 on its own (dock) are not the panels\' F or B', (() => { const before = J('Object.values(F.camp.orders).reduce((a, b) => a + b, 0)'); g.run("['KeyF', 'KeyB', 'KeyZ', 'KeyC', 'KeyN'].forEach(c => F.onKey({ code: c }));"); return J('Object.values(F.camp.orders).reduce((a, b) => a + b, 0)') === before; })());
check('the pace key is gone (P turns the SHIP panel\'s page, it does not change the pace), and the scene gives the sim the fixed pace: Normal', (() => { g.run("F.onKey({ code: 'KeyP' });"); const pg = J('F.pn.page.ship'); g.run("F.onKey({ code: 'KeyP' });"); return pg === 1 && J('F.makeCamp().pace') === J("campPaceMult('normal')") && !('key' in J('CAMP.pace')); })());

// ---- B. the drawing
console.log('B. the drawing');
g.run(`
  window.__all = [];
  window.__mk = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, vis: true, alpha: 1, log: [] };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : (...a) => { tg.log.push([k].concat(a)); return px; }) });
    o.setText = v => { o.t = v; return px; }; o.setVisible = v => { o.vis = v; return px; }; o.setAlpha = v => { o.alpha = v; return px; }; o.setColor = v => { o.color = v; return px; };
    o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.clear = () => { o.log.length = 0; return px; }; __all.push(o); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), mode: 'play', time: { now: 0 }, add: { rectangle: (x, y) => __mk('rect', x, y), graphics: () => __mk('g'), text: (x, y, t) => __mk('text', x, y, t), container: () => __mk('box') },
      input: { on() {}, off() {} }, events: { once() {} } }; s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
  window.S = __scene(); campPanelsInstall(S); S.camp.docked = 'luna';
  window.__paint = now => { S.time.now = now; campPanelsPaint(S, now); };
  __paint(0);
`);
check('both panels are drawn from the first frame (no key opens them): FLEET\'s seven rows and SHIP\'s eleven, each with its key', J(`S.pnl.p.fleet.rows.slice(0, 7).map(r => r.key.t + ' ' + r.name.t).join()`) === '1 Launch / recall,2 Attack,3 Escort,4 Guard,W Mine ore,E Stance,R Convoy' && J(`S.pnl.p.ship.rows.map(r => r.key.t).join('')`) === '7890JKL;UEnterI' && J(`S.pnl.p.fleet.rows[0].name.vis && S.pnl.p.ship.rows[10].name.vis`) === true);
check('the heading says the page key and the page: "Q   1/3" and "P   1/2"', J(`S.pnl.p.fleet.pageKey.t`) === 'Q   1/3' && J(`S.pnl.p.ship.pageKey.t`) === 'P   1/2');
g.run(`campPanelKey(S.pn, S.camp, 'KeyQ', 1000); __paint(1000);`);
check('Q turns FLEET to its stances: the heading says STANCES 2/3, five rows with 1 to 5, the sixth line is not drawn, and the one in force says so', J(`S.pnl.p.fleet.title.t`) === 'STANCES' && J(`S.pnl.p.fleet.pageKey.t`) === 'Q   2/3' && J(`S.pnl.p.fleet.rows.map(r => r.name.vis ? r.name.t : '').join()`) === 'Free,Orbit,Keep distance,Match speed,Hold position,,' && J(`S.pnl.p.fleet.rows[0].suffix.t`) === 'in force' && J(`S.pnl.p.fleet.rows[0].key.t`) === '1');
g.run(`campPanelTick(S.pn, 1000 + CAMP_PANELS.back); __paint(8000);`);
check('6 s later the panel is back on its orders', J(`S.pnl.p.fleet.title.t`) === 'FLEET' && J(`S.pnl.p.fleet.rows[0].name.vis`) === true);
g.run(`campPanelKey(S.pn, S.camp, 'KeyP', 9000); __paint(9000);`);
check('P turns SHIP to BUILD: two rows, 7 and 8, a fighter and an escort with their costs', J(`S.pnl.p.ship.title.t`) === 'BUILD' && J(`S.pnl.p.ship.rows.map(r => r.name.vis ? r.key.t + ' ' + r.name.t : '').join()`).startsWith('7 New fighter,8 New escort,'));
g.run(`campPanelsClose(S); __paint(9100);`);
check('a card, the map or the end puts both panels back on their first page', J(`S.pn.page.fleet`) === 0 && J(`S.pn.page.ship`) === 0 && J(`S.pnl.p.ship.title.t`) === 'SHIP');
g.run(`campSpawn(S.camp, 'raider', S.camp.carrier.x + 700, S.camp.carrier.y); campPanelKey(S.pn, S.camp, 'KeyD', 9200); __paint(9200 + 300);`);
check('D picks the target and the FLEET panel names it with its distance, with the key that lets it go', /^TARGET  Raider \d+  \d+(\.\d)? km$/.test(J(`S.pnl.p.fleet.foot.t`)) && J(`S.pnl.p.fleet.footKeys.t`) === 'X clear', J(`S.pnl.p.fleet.foot.t`));
g.run(`campPanelKey(S.pn, S.camp, 'KeyX', 9600); __paint(9600 + 300);`);
check('X clears it: "TARGET  none" and the three keys that pick', J(`S.pnl.p.fleet.foot.t`) === 'TARGET  none' && J(`S.pnl.p.fleet.footKeys.t`) === 'A D S  X clear');
check('the panels are not drawn behind a card, the pause, the map or the page of keys', (() => { g.run(`S.mode = 'pause'; __paint(10000);`); const a = J(`S.pnl.p.fleet.rows[0].name.vis || S.pnl.p.ship.rows[0].name.vis`); g.run(`S.mode = 'play'; S.mp = {}; __paint(10100);`); const b = J(`S.pnl.p.fleet.rows[0].name.vis`); g.run(`S.mp = null; __paint(10200);`); return a === false && b === false && J(`S.pnl.p.fleet.rows[0].name.vis`) === true; })());
check('a row lights for 160 ms when its key is pressed: P.lit holds the time, and the flash is drawn (a white wash on the row) only while it lasts', (() => { g.run(`campPanelKey(S.pn, S.camp, 'Digit2', 11000); __paint(11040);`); const on = J(`S.pnl.p.fleet.g.log.filter(l => l[0] === 'fillStyle' && l[1] === 0xffffff).length`); g.run(`__paint(11400);`); const off = J(`S.pnl.p.fleet.g.log.filter(l => l[0] === 'fillStyle' && l[1] === 0xffffff).length`); return J('S.pn.lit.attack') === 11000 && on > 0 && off === 0; })());

// ---- C. every hint reads the table
console.log('C. the hints read the table');
const says = () => J(`({ nudge: uiText('camp.nudge.launch'), nudge2: uiText('camp.nudge.attack'), goal: uiText('camp.help.goalbay', { goal: 'G' }), keys: uiText('camp.help.keys'), dock: uiText('camp.hud.dockhint', { name: 'Luna' }), retreat: uiText('camp.say.retreatnear', { name: 'Luna' }), bfWing: uiText('camp.bf.key.wing'), bfMine: uiText('camp.bf.key.mine'), bfDock: uiText('camp.bf.key.dock'), bfShield: uiText('camp.bf.key.shield'), n3: uiText('camp.bf.1.1.n3'), w1: uiText('camp.bf.1.2.w1'), line: uiText('camp.ui.keys'), tuck: uiText('camp.hint.tuck') })`);
const before = says();
check('as the table stands the hints say the rows\' keys: "Press 1 to launch the wing", "0  dock at Luna", "W: the wing mines ore", "U: emergency shields", and the key line names the arrows, Space, Enter, Tab, - = and H', before.nudge === 'Press 1 to launch the wing.' && before.nudge2 === 'Press 2 to send the fighters at the enemy.' && before.dock === '0  dock at Luna' && before.retreat === 'Hull low, no ships. Luna is in range: press 0.' && before.bfWing === '1: launch the wing, or bring it home' && before.bfMine === 'W: the wing mines ore' && before.bfDock === '0: dock to build, mend and sell' && before.bfShield === 'U: emergency shields' && before.line === 'Arrows fly   Space turrets   Enter missile   Tab Map   - = Zoom   H Keys' && /press R until/.test(before.tuck), JSON.stringify(before));
// the remap: Launch on G, Dock on 5, Emergency on O, the FLEET page key on Z, the map's zoom reset on Delete, the missile on M: one change in the table
g.run(`window.__tab0 = JSON.stringify([CAMP_PANELS, CAMP_KEYS]);
  const fl = CAMP_PANELS.panels[0], sh = CAMP_PANELS.panels[1]; fl.key = 'Z'; fl.code = 'KeyZ';
  Object.assign(fl.rows.find(r => r.id === 'launch'), { k: 'G', code: 'KeyG' }); Object.assign(sh.rows.find(r => r.id === 'dock'), { k: '5', code: 'Digit5' }); Object.assign(sh.rows.find(r => r.id === 'emergency'), { k: 'O', code: 'KeyO' });
  Object.assign(sh.rows.find(r => r.id === 'missile'), { k: 'M', code: 'KeyM' }); CAMP_KEYS.fly.k = 'Cursor';`);
const after = says();
check('after the remap every hint says the new keys: Press G to launch, 5 to dock, O for emergency shields, the key line says M missile and Cursor fly', after.nudge === 'Press G to launch the wing.' && after.goal === 'Your goal: G Press G to launch the wing.' && after.dock === '5  dock at Luna' && after.retreat === 'Hull low, no ships. Luna is in range: press 5.' && after.bfWing === 'G: launch the wing, or bring it home' && after.bfDock === '5: dock to build, mend and sell' && after.bfShield === 'O: emergency shields' && after.line === 'Cursor fly   Space turrets   M missile   Tab Map   - = Zoom   H Keys', JSON.stringify(after));
check('the briefing\'s key boxes follow (campBriefKeys reads the table when asked): launch is G, dock 5, the shields O, the missile M', J('CAMPBRIEF_KEYS.wing.join()') === 'G' && J('CAMPBRIEF_KEYS.dock.join()') === '5' && J('CAMPBRIEF_KEYS.shield.join()') === 'O' && J('CAMPBRIEF_KEYS.missile.join()') === 'M' && J('CAMPBRIEF_KEYS.fly.join()') === 'Cursor' && J('campBriefKeys(1, 0).find(k => k.id === "wing").k.join()') === 'G');
check('the key line, the H page rows and the page keys follow too', J('campPanelKeyLine()') === 'Z Fleet   P Ship' && J('campPanelKeyRows()[0].k.join()') === 'G' && J('campPanelKeyRows().some(r => r.k[0] === "O")') === true && J('campPanelKeyRows()[7].k[0]') === 'Z');
check('the keys do what the hints say: G launches the wing, Z turns the FLEET page; 1 and Q do nothing now (1 is not a row of FLEET page 1 any more: it is the stance digit only on a later page)', (() => { g.run('window.P = campPanelNew(); window.C = __quiet(campNew("home", [], { seed: 3 }));'); const one = J("campPanelKey(P, C, 'Digit1', 100, false)"), q = J("campPanelKey(P, C, 'KeyQ', 110, false)"), gg = J("campPanelKey(P, C, 'KeyG', 200, false)"), z = J("campPanelKey(P, C, 'KeyZ', 300, false)"); return !one.ran && !q.used && gg.row === 'launch' && gg.ran && J('C.launchQ.length') === 8 && z.used && J('P.page.fleet') === 1; })());
g.run(`(() => { const t = JSON.parse(__tab0); Object.keys(CAMP_PANELS).forEach(k => delete CAMP_PANELS[k]); Object.assign(CAMP_PANELS, t[0]); Object.keys(CAMP_KEYS).forEach(k => delete CAMP_KEYS[k]); Object.assign(CAMP_KEYS, t[1]); })();`);
check('the table is put back as it was, and the hints say the rows\' keys again', JSON.stringify(says()) === JSON.stringify(before));
// no text hard-codes a key of the panels any more
const keyed = J(`Object.keys(UI_TEXT).filter(k => /^camp\\./.test(k) && /\\bPress [QEWRJKLUIP0-9]\\b|\\b[QEP] (?:then|opens)\\b|\\(F\\)|W A S D/.test(UI_TEXT[k])).map(k => k + ': ' + UI_TEXT[k])`);
check('no line of the Campaign\'s text names a key of the panels as a letter any more: they are all placeholders ({keylaunch}, {keydock} ...) the table fills', keyed.length === 0, keyed.join(' | '));
check('the same in the content files (content/text: the briefing, the outpost words, the help, nudge and lose lines) and in the game\'s own defaults (src/contenttables.js)', ['content/text/campbrief.md', 'content/text/campoutpost.md', 'content/text/ux-help.md', 'content/text/ux-nudge.md', 'content/text/ux-lose.md', 'content/text/campbeats.md', 'src/contenttables.js'].every(f => !/\b[QEC] (?:then|opens)\b|Press [QEC],|W A S D|\(F\)/.test(src(f).replace(/'camp\.ui\.pace[^\n]*|camp\.keys\.pace[^\n]*/g, ''))));
check('an unknown placeholder is left as it was ({nothing} stays, a name the table does not know says nothing)', J("uiText('camp.say.built', { kind: 'x' })") === 'A new x is in the bay.' && J("contentFill('a {fleetkey} {nowhere} {keyzzz}')") === 'a Q {nowhere} {keyzzz}');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `PANEL KEYS FAIL (${failed} of ${n})` : `PANEL KEYS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
