// smoke: the page HUD (card space-game-page-hud): behind a switch that is off by default; the model of the cruiser and pilots panel (meters with a number only below full, rings coloured by hull, digits lit by the pick); every key chip from the key table; written at most 10 times a second and only what changed
// Troy, 24 Nov 2026: "rebuild the Campaign's flight HUD as page elements over the game canvas, in the look of the agent board" (docs/hud-mock.html); landing 1 of 3: the cruiser panel and the pilots. The canvas HUD is kept and its tests are not touched.
//   A  the switch: CAMP.flags.pagehud is false; a row of the N panel; the address flag; what the canvas leaves out while it is on (and nothing while it is off)
//   B  the model: the ship panel (the key, the label, shield and hull with a number only below full and for a few seconds after), the pilots (initial, digit, ring share and colour, dim when not out, the digits lit by the pick), what they do and who
//   C  every key chip is the key table's: change a key there and the model follows; no letter of a key is written in the code
//   D  the view on a stand-in page: the elements are made once, written only when a value changed, at most 10 times a second; the panel sits over the canvas, the font size is a share of its width; the rows' places move under the panel; switching off takes it away
//   E  the rules: no web font, two weights, no image files, the script and the style are in the page
// Run: node tests/camppagehud.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; C.t = 1000; return C; };
  window.__out = () => { __new(); campOrder(C, 'launch'); for (let i = 0; i < 240 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; return C; }; // the three pilots out beside the cruiser
`);

console.log('A. the switch');
check('CAMP.flags.pagehud is false: the canvas HUD is what the game shows', J('CAMP.flags.pagehud') === false && J('campPageHudOn()') === false);
check('it has a row on the N panel, in the systems group, with words', J(`campTuneRow('pagehud').kind`) === 'flag' && J(`campTuneRow('pagehud').flag`) === 'pagehud' && J(`campTuneRow('pagehud').group`) === 'systems' && J(`uiText('camp.ui.tune.row.pagehud')`) === 'Page HUD (the new look)');
check('the address flag: ?pagehud, =1, =on, =true, =yes are on; no flag, =0 and =off are not', ['?campaign=1&pagehud', '?pagehud=1', '?x=1&pagehud=on', '#pagehud=true', '?pagehud=yes'].every(s => J(`campPageHudAddr(${JSON.stringify(s)})`) === true) && ['', '?campaign=1', '?pagehud=0', '?pagehud=off', '?pagehudx=1'].every(s => J(`campPageHudAddr(${JSON.stringify(s)})`) === false));
check('off: the canvas leaves nothing out', ['status', 'cruiser', 'fleet', 'hostiles', 'friendlies'].every(id => J(`campPageHudHides(${JSON.stringify(id)})`) === false));
g.run(`CAMP.flags.pagehud = true;`);
check('on: the canvas leaves out the shield and hull plate and the Q CRUISER and W rows (landing 1), and keeps what is not the page HUD\'s (the lists, the other corners\' details, the map)', ['status', 'cruiser', 'fleet'].every(id => J(`campPageHudHides(${JSON.stringify(id)})`) === true) && ['list', 'map', 'radio'].every(id => J(`campPageHudHides(${JSON.stringify(id)})`) === false));
check('the corners say so: every row is hidden while the page HUD is on (their details are not: they open under the panels)', ['cruiser', 'fleet', 'hostiles', 'friendlies'].every(id => J(`campCornerNow(__new(), ${JSON.stringify(id)}).rowHidden`) === true));
g.run(`CAMP.flags.pagehud = false;`);

console.log('B. the model');
g.run(`__out();`);
const M = J('campPageModel(C)');
check('the ship panel: the key chip, the label, a shield and a hull meter at full with no number', M.ship.label === 'CRUISER' && M.ship.shield.frac === 1 && M.ship.hull.frac === 1 && M.ship.shield.show === false && M.ship.hull.show === false, JSON.stringify(M.ship));
g.run(`C.shield = campShieldMax(C) * 0.5; C.t = 2000;`);
const hurt = J('campPageModel(C).ship.shield');
check('below full the number shows (the shield at half), the hull still has none', hurt.frac > 0.49 && hurt.frac < 0.51 && hurt.show === true && hurt.n === J('Math.round(C.shield)') && J('campPageModel(C).ship.hull.show') === false, JSON.stringify(hurt));
g.run(`C.shield = campShieldMax(C); C.t = 2000 + 1000;`);
check('full again: the number stays a few seconds after (CAMP_PAGEHUD.num)', J('campPageModel(C).ship.shield.show') === true);
g.run(`C.t = 2000 + 5000;`);
check('and then goes', J('campPageModel(C).ship.shield.show') === false);
g.run(`C.carrier.hp = C.carrier.maxHp * 0.4; C.t = 9000;`);
check('the hull: the same rule', J('campPageModel(C).ship.hull.show') === true && Math.abs(J('campPageModel(C).ship.hull.frac') - 0.4) < 1e-6);
g.run(`C.carrier.hp = C.carrier.maxHp;`);
const P = J('campPageModel(C).pilots');
check('three pilots, in the fleet pick\'s order: their initials (the names are Wedge, Kara, Apollo) and digits 1 2 3', P.items.length === 3 && P.items.map(p => p.initial).join('') === 'WKA' && P.items.map(p => p.digit).join('') === '123' && P.items.map(p => p.name).join() === 'Wedge,Kara,Apollo', JSON.stringify(P.items));
check('all out and whole: every ring is full, the good colour, lit (on)', P.items.every(p => p.frac === 1 && p.color === 'good' && p.on === true));
g.run(`window.__pu = campSelList(C).filter(e => e.kind === 'pilot').map(e => e.unit); __pu[0].hp = __pu[0].maxHp * 0.5; __pu[1].hp = __pu[1].maxHp * 0.2;`);
const P2 = J('campPageModel(C).pilots.items');
check('a ring is the hull: half is the warning colour (under 60 percent), a fifth the hostile colour (under 30)', P2[0].color === 'warn' && Math.abs(P2[0].frac - 0.5) < 1e-6 && P2[1].color === 'foe' && P2[2].color === 'good');
g.run(`__pu[2].hp = 0; __pu[2].gone = true; campWingDocked(C, 'yellow').length;`);
check('a pilot who is not out is dim (on false) and his ring is empty', J('campPageModel(C).pilots.items[2].on') === false && J('campPageModel(C).pilots.items[2].frac') === 0);
g.run(`__out(); C.sel = 'all';`);
check('All pilots picked lights every digit (card space-game-w4-all-lit), and the words say so', J('campPageModel(C).pilots.items.every(p => p.pick)') === true && J('campPageModel(C).pilots.who') === 'All pilots');
g.run(`C.sel = 'pilot:green';`);
check('one pilot picked: only his digit is lit, and the line names him', J('campPageModel(C).pilots.items.map(p => p.pick).join()') === 'false,true,false' && J('campPageModel(C).pilots.who') === 'Kara');
check('what they are doing is a short line, from the same words the target display uses (capitalised)', /^[A-Z]/.test(J('campPageModel(C).pilots.doing')) && J('campPageModel(C).pilots.doing.length') < 40, J('campPageModel(C).pilots.doing'));
check('no cruiser: no model (the page HUD draws nothing)', J('campPageModel(null)') === null);

console.log('C. the key chips are the table\'s');
check('the chips are the cruiser\'s key (the zoom reset) and the fleet pick\'s (who), as the corners read them', M.ship.key === J(`campCornerCap('zoomreset')`) && P.key === J(`campCornerCap('who')`) && M.ship.key !== '' && P.key !== '');
g.run(`window.__k = [CAMP_KEYS.zoomreset.k, CAMP_KEYS.who.k]; CAMP_KEYS.zoomreset.k = 'Z'; CAMP_KEYS.who.k = 'V';`);
const moved = J('[campPageModel(C).ship.key, campPageModel(C).pilots.key]');
g.run(`CAMP_KEYS.zoomreset.k = __k[0]; CAMP_KEYS.who.k = __k[1];`);
check('a key moved in the table moves on the chip', moved.join() === 'Z,V');
const code = src('src/camppagehud.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('no letter of a key is written in the HUD\'s code (no quoted single capital letter, no chip text in the CSS)', !/['"][A-Z]['"]/.test(code) && !/(^|[;{\s])content\s*:/.test(src('src/camppagehud.css')));

console.log('D. the view');
g.run(`
  window.__writes = 0; window.__els = [];
  const mk = tag => { const e = { tag, children: [], parentNode: null, _cls: '', _text: '', _inner: '', style: new Proxy({ setProperty(k, v) { __writes++; this[k] = v; } }, { set(o, k, v) { if (k !== 'setProperty') __writes++; o[k] = v; return true; } }) };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { __writes++; e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { __writes++; e._text = v; } }); Object.defineProperty(e, 'innerHTML', { get() { return e._inner; }, set(v) { e._inner = v; } });
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.insertBefore = (c, ref) => { c.parentNode = e; const i = e.children.indexOf(ref); e.children.splice(i < 0 ? e.children.length : i, 0, c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    e.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720, bottom: 150 }); __els.push(e); return e; };
  window.document = { createElement: mk, body: mk('body') };
  window.__scene = () => ({ camp: C, mode: 'play', mp: null, game: { canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) } }, events: { once() {} } });
`);
g.run(`__out(); CAMP.flags.pagehud = true; window.S = __scene(); window.__r1 = campPageHudSync(S, 0);`);
check('on: the page HUD is made, once, and put on the page (a root with the ship panel in it)', J('__r1') === true && J('!!S.pageHud') && J('document.body.children.length') === 1 && J('document.body.children[0].children.some(c => c._cls.indexOf("ph-ship") >= 0)'));
check('it sits over the canvas, the same size, and its font size is a share of the canvas width (1.12 percent of 1280)', J('S.pageHud.root.style.left') === '10px' && J('S.pageHud.root.style.top') === '20px' && J('S.pageHud.root.style.width') === '1280px' && J('S.pageHud.root.style.fontSize') === '14.34px');
check('the panel shows the key chips, the label, three rings with their initials and digits, the doing and who lines', J('S.pageHud.ship.key._text') === J(`campCornerCap('zoomreset')`) && J('S.pageHud.ship.label._text') === 'CRUISER' && J('S.pageHud.ship.pilots.length') === 3 && J('S.pageHud.ship.pilots.map(p => p.letter._text).join("")') === 'WKA' && J('S.pageHud.ship.pilots.map(p => p.digit._text).join("")') === '123' && J('S.pageHud.ship.pkey._text') === J(`campCornerCap('who')`) && J('S.pageHud.ship.who._text') === 'All pilots');
check('the meters: full widths and no numbers', J('S.pageHud.ship.shield.fill.style.width') === '100%' && J('S.pageHud.ship.hull.fill.style.width') === '100%' && J('S.pageHud.ship.shield.num._text') === '' && J('S.pageHud.ship.hull.num._text') === '');
g.run(`window.__w0 = __writes; window.__r2 = campPageHudSync(S, 50);`);
check('10 a second at most: a call 50 ms later writes nothing at all', J('__writes') === J('__w0') && J('__r2') === true);
g.run(`__w0 = __writes; campPageHudSync(S, 100);`);
check('and a call a tenth of a second later writes nothing either when nothing changed (only an element whose value changed is written)', J('__writes') === J('__w0'), J('__writes - __w0'));
g.run(`C.shield = campShieldMax(C) * 0.5; __w0 = __writes; campPageHudSync(S, 200);`);
check('the shield falls to half: its bar and its number are written, and nothing else (two writes)', J('__writes - __w0') === 2 && J('S.pageHud.ship.shield.num._text') === String(J('Math.round(C.shield)')) && /^50/.test(J('S.pageHud.ship.shield.fill.style.width')), J('__writes - __w0'));
g.run(`C.sel = 'pilot:red'; __w0 = __writes; campPageHudSync(S, 300);`);
check('the pick moves to one pilot: the three digits\' classes and the who line are written, no ring', J('__writes - __w0') <= 4 && J('S.pageHud.ship.who._text') === 'Wedge', J('__writes - __w0'));
check('the rows of the canvas move down under the panel: the Q CRUISER row\'s place and the FRIENDLIES row\'s (the panel\'s bottom is 150 on the page and the canvas starts 20 px down: 130 on the canvas)', J('CAMP_CORNER_SHIFT.tl') === J('130 - CAMP.corner.title.h - CAMP.corner.at.tl.y') && J('CAMP_CORNER_SHIFT.bl') === J('130 + CAMP.corner.stack - CAMP.corner.at.bl.y') && J(`campCornerGeom('tl', 0, 0).title.y + campCornerGeom('tl', 0, 0).title.h`) === 130);
g.run(`CAMP.flags.pagehud = false; window.__r3 = campPageHudSync(S, 400);`);
check('off: the page HUD is taken away and the rows are where they were', J('__r3') === false && J('S.pageHud') === null && J('document.body.children.length') === 0 && J('CAMP_CORNER_SHIFT.tl') === 0 && J('CAMP_CORNER_SHIFT.bl') === 0);
g.run(`CAMP.flags.pagehud = true; window.S2 = __scene(); campPageHudSync(S2, 0); S2.mode = 'won'; window.__r4 = campPageHudSync(S2, 200);`);
check('a card over the battle (the debrief) or the map takes it away too', J('__r4') === false && J('S2.pageHud') === null);
g.run(`CAMP.flags.pagehud = false;`);
check('no page, no scene: nothing happens', J('campPageHudSync(null, 0)') === false && J('campPageHudSync({}, 0)') === false);

console.log('F. the goal and the stock (landing 2)');
g.run(`CAMP.flags.pagehud = true;`);
check('on: the canvas also leaves out the goal and wave lines and the ore and missiles block (landing 2)', ['goal', 'stock'].every(id => J(`campPageHudHides(${JSON.stringify(id)})`) === true));
g.run(`CAMP.flags.pagehud = false;`);
check('off: they are the canvas\'s (goal, stock)', J(`campPageHudHides('goal')`) === false && J(`campPageHudHides('stock')`) === false);
g.run(`__out();`);
const goal0 = J('campPageModel(C).goal');
check('a mission\'s goal is a label and a value: "Transport arrived: 0 of 1." is the label "Transport arrived", the value "0 / 1", and a meter at 0', goal0.label === 'Transport arrived' && goal0.value === '0 / 1' && goal0.frac === 0, JSON.stringify(goal0));
g.run(`C.L.objectives = [{ type: 'ore', n: 450 }, { type: 'cashin', n: 100 }]; C.oreBest = 120;`);
const goal1 = J('campPageModel(C).goal');
check('mine ore: "Mine ore: 120 of 450." is the label "Mine ore", the value "120 / 450", a meter at 120 over 450 in the ore colour', goal1.label === 'Mine ore' && goal1.value === '120 / 450' && Math.abs(goal1.frac - 120 / 450) < 1e-9 && goal1.tone === 'ore', JSON.stringify(goal1));
g.run(`C.oreBest = 450;`);
check('the second objective shows only when it is the next thing to do (the first is done): "Sell your ore at the Works"', J('campPageModel(C).goal.label') === 'Sell your ore at the Works' && J('campPageModel(C).goal.frac') === 0);
g.run(`C.L.objectives = [{ type: 'kill', what: 'mother' }];`);
check('a goal with no count has no meter (the frac is null) and no value: "Destroy the mothership."', J('campPageModel(C).goal.label') === 'Destroy the mothership' && J('campPageModel(C).goal.value') === '' && J('campPageModel(C).goal.frac') === null);
g.run(`C.L.objectives = null; C.L.win = 'none'; C.L.place = null;`);
check('a level with no goal line has no goal panel (null)', J('campPageModel(C).goal') === null);
g.run(`__out(); C.ore = CAMP.ore.cap / 4;`);
const st = J('campPageModel(C).stock');
check('the stock: the ore as a share of what the store holds (a quarter), the missiles as a count of the rack with the reload key\'s chip from the key table', Math.abs(st.ore.frac - 0.25) < 1e-9 && st.missiles.n === J('campCruiserStatus(C).missiles.n') && st.missiles.cap === J('campCruiserStatus(C).missiles.cap') && st.missiles.cap >= 1 && st.missiles.key === J(`CAMP_KEYS.reload.k`) && st.missiles.key !== '', JSON.stringify(st));
g.run(`window.__rk = CAMP_KEYS.reload.k; CAMP_KEYS.reload.k = 'Z';`); const rk = J('campPageModel(C).stock.missiles.key'); g.run(`CAMP_KEYS.reload.k = __rk;`);
check('the reload chip follows the table', rk === 'Z');
g.run(`CAMP.flags.pagehud = true; window.S3 = __scene(); S3.hudBack = { alpha: 0.4, setAlpha(v) { this.alpha = v; } }; campPageHudSync(S3, 0);`);
check('the page HUD has a goal panel and a stock panel with their words and pips (one for each missile of the rack, the full ones lit), and the goal\'s meter', J('S3.pageHud.goal.label._text') === 'Transport arrived' && J('S3.pageHud.goal.value._text') === '0 / 1' && J('S3.pageHud.stock.pips.length') === J('campCruiserStatus(C).missiles.cap') && J('S3.pageHud.stock.pips.filter(p => /\\bon\\b/.test(p._cls)).length') === J('campCruiserStatus(C).missiles.n') && J('S3.pageHud.stock.key._text') === J('CAMP_KEYS.reload.k') && J('S3.pageHud.stock.oreFill.style.width') === '25%');
g.run(`C.L.objectives = null; C.L.win = 'none'; C.L.place = null; campPageHudSync(S3, 200);`);
check('no goal: the goal panel is not drawn (display none) and no toast waits for it', J('S3.pageHud.goal.el.style.display') === 'none' && J('S3.pageHudStack') === 0);
g.run(`__out(); S3.camp = C; campPageHudSync(S3, 400);`);
check('with a goal the toasts start under its panel (it ends at 130 canvas px here), the HOSTILES row\'s place is under the stock panel (so its details open under it), and the canvas column\'s dim plate is not drawn', J('S3.pageHudStack') === 130 && J('CAMP_CORNER_SHIFT.tr') === J('130 - CAMP.corner.title.h - CAMP.corner.at.tr.y') && J('S3.hudBack.alpha') === 0);
check('hudStackBottom (the scene\'s, where everything at the top centre ends and a toast starts under): the page goal panel counts, and the old rule stands without it', J('Campaign.prototype.hudStackBottom.call({ hud: {}, pageHudStack: 130 }, 60)') === 130 && J('Campaign.prototype.hudStackBottom.call({ hud: {}, pageHudStack: 0 }, 60)') === 60 && J('Campaign.prototype.hudStackBottom.call({ hud: {} }, 60)') === 60);
g.run(`CAMP.flags.pagehud = false; campPageHudSync(S3, 600);`);
check('off: the plate is back (its alpha as it was), the toast has no page panel to start under, the rows are where they were', J('S3.hudBack.alpha') === 0.4 && J('S3.pageHudStack') === 0 && J('CAMP_CORNER_SHIFT.tr') === 0 && J('CAMP_CORNER_SHIFT.tl') === 0);

console.log('G. the hostiles, the friendlies and the pills in space (landing 3)');
g.run(`CAMP.flags.pagehud = true;`);
check('on: the canvas also leaves out the rows of the HOSTILES and FRIENDLIES corners, the edge arrows of the hostiles, the labels of the places and the bottom key line', ['hostiles', 'friendlies', 'sight', 'places', 'keys'].every(id => J(`campPageHudHides(${JSON.stringify(id)})`) === true));
g.run(`CAMP.flags.pagehud = false;`);
g.run(`__out(); C.ships = C.ships.filter(u => u.team !== 'alien');`);
check('no hostile seen: no hostiles panel (null), no edge pill; no friendly picked: no friendlies panel', J('campPageModel(C).foes') === null && J('campPageModel(C, { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2, zoom: 1 }).edge') === null && (g.run(`C.fsel = '';`), J('campPageModel(C).friend') === null));
g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 200); window.RB = campSpawn(C, 'raider', C.carrier.x + 950, C.carrier.y + 150);`);
const foes = J('campPageModel(C).foes');
check('a hostile seen: the panel has the hostiles key (the table\'s), the label, what it is (the sight\'s own words), a compass point and how far', foes && foes.key === J(`campCornerCap('hostiles')`) && foes.label === 'HOSTILES' && /Raider|hostile/i.test(foes.what) && /^(north|south|east|west)/.test(foes.dir) && /km$/.test(foes.km), JSON.stringify(foes));
g.run(`window.__view = { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2, zoom: 1 }; RA.x = C.carrier.x + 2600; RA.y = C.carrier.y; RB.x = C.carrier.x + 2650; RB.y = C.carrier.y;`);
const edge = J('campPageModel(C, __view).edge');
check('hostiles off the screen: one pill at the edge with the count and how far, and an arrow angle', edge && edge.n === 2 && /km$/.test(edge.km) && Math.abs(edge.angle) < 0.3 && edge.x > J('W') * 0.8, JSON.stringify(edge));
g.run(`window.WD = campFriList(C).find(e => e.kind === 'ward'); C.fsel = WD.id;`);
const fr = J('campPageModel(C).friend');
check('a friendly picked: its name, its hull and how far, with the friendlies key from the table', fr && fr.key === J(`campCornerCap('friendlies')`) && fr.label === 'FRIENDLIES' && fr.name === J('campTdispName(WD.unit)') && fr.frac > 0 && fr.frac <= 1 && /km$/.test(fr.km), JSON.stringify(fr));
g.run(`window.__pl = Object.values(campPlaces(C.level)).find(p => !p.hidden); window.__pv = { x: __pl.x - W / 2, y: __pl.y - (__pl.r || 60) - 36 - H / 2, zoom: 1 };`);
const pls = J('campPageModel(C, __pv).places');
check('a place in view gets ONE pill (its name, with its outpost after a dot), at the place\'s screen place', pls.length >= 1 && pls[0].name.indexOf(J('String(__pl.name)')) === 0 && Math.abs(pls[0].x - J('W') / 2) < 1 && Math.abs(pls[0].y - J('H') / 2) < 1, JSON.stringify(pls));
check('far out (under the far marks\' zoom) the page draws no place pills: the canvas\'s marks have the names', J('campPageModel(C, { x: __pv.x, y: __pv.y, zoom: CAMPZOOM.view.markZ / 2 }).places.length') === 0 && J('campPageModel(C).places.length') === 0);
g.run(`CAMP.flags.pagehud = true; window.S4 = __scene(); S4.hud = { keys: { visible: true, setVisible(v) { this.visible = v; } }, obj: { visible: true, setVisible(v) { this.visible = v; } }, wave: { visible: true, setVisible(v) { this.visible = v; } } }; S4.keysBack = { visible: true, setVisible(v) { this.visible = v; } }; S4.placeLabels = [{ visible: true, active: true, setVisible(v) { this.visible = v; } }]; S4.cameras = { main: { scrollX: __view.x, scrollY: __view.y, zoom: 1 } }; S4.cornerDy = { friendlies: 40 }; campPageHudSync(S4, 0);`);
check('the panels are drawn: hostiles (display on), the friendlies, the edge pill, and the bottom key line, its strip and the world\'s place labels are hidden', J('S4.pageHud.foes.el.style.display') === '' && J('S4.pageHud.friend.el.style.display') === '' && J('S4.pageHud.edge.el.style.display') === '' && J('S4.hud.keys.visible') === false && J('S4.keysBack.visible') === false && J('S4.placeLabels[0].visible') === false && J('S4.hud.obj.visible') === false && J('S4.hud.wave.visible') === false);
check('the hostiles panel says what, where and how far; the friend panel its name; the edge pill the count', J('S4.pageHud.foes.key._text') === J(`campCornerCap('hostiles')`) && /km$/.test(J('S4.pageHud.foes.sub._text')) && J('S4.pageHud.friend.name._text') === J('campTdispName(WD.unit)') && /^2 /.test(J('S4.pageHud.edge.text._text')));
check('the friend panel sits under the ship panel and slides down with the Q list (40 px here); the edge pill is at the edge of the canvas', J('S4.pageHud.friend.el.style.top') === J(`Math.round((130 + 40 + CAMP.corner.stack) * 1 * 10) / 10 + 'px'`) && parseInt(J('S4.pageHud.edge.el.style.left')) > 1000, J('[S4.pageHud.friend.el.style.top, S4.pageHud.edge.el.style.left]'));
check('the canvas rows keep their place under the panels: the details of FRIENDLIES open under the friend panel, those of HOSTILES under the hostiles panel (here the stand-in panels all end at 130)', J('CAMP_CORNER_SHIFT.bl') === J('130 - CAMP.corner.title.h - CAMP.corner.at.bl.y - 40') && J('CAMP_CORNER_SHIFT.tr') === J('130 - CAMP.corner.title.h - CAMP.corner.at.tr.y'));
g.run(`C.fsel = ''; RA.hp = 0; RB.hp = 0; RA.gone = RB.gone = true; campPageHudSync(S4, 300);`);
check('no hostile and no friendly: both panels and the edge pill are not drawn (display none)', J('S4.pageHud.foes.el.style.display') === 'none' && J('S4.pageHud.friend.el.style.display') === 'none' && J('S4.pageHud.edge.el.style.display') === 'none');
g.run(`CAMP.flags.pagehud = false; campPageHudSync(S4, 600);`);
check('off: the key line, its strip and the place labels are back', J('S4.hud.keys.visible') === true && J('S4.keysBack.visible') === true && J('S4.placeLabels[0].visible') === true && J('S4.hud.obj.visible') === true && J('S4.hud.wave.visible') === true);
check('the scene files: the hostile arrows are left out of the sight scene, the labels drawPlace makes are kept (placeLabels), and the corners\' slide is stored for the friend panel', /campPageHudHides\('sight'\) \? \[\]/.test(src('src/campsightscene.js')) && /placeLabels/.test(src('src/campaignscene.js')) && /s\.cornerDy\[d\.id\] = dy/.test(src('src/campcornerscene.js')));

console.log('E. the rules');
const css = src('src/camppagehud.css'), html = src('index.html'), scene = src('src/campaignscene.js');
check('the typeface is the system one, no web font, and only the weights 400 and 600', /font-family: system-ui, -apple-system, "Segoe UI", sans-serif/.test(css) && !/@font-face|fonts\.googleapis|url\(/.test(css) && (css.match(/font-weight:\s*(\d+)/g) || []).every(w => /\b(400|600)\b/.test(w)));
check('every size in the CSS is em or a ratio (no px but the borders\' 1px and the root\'s fallback)', (css.match(/\d+(\.\d+)?px/g) || []).every(p => p === '1px' || p === '14px' || p === '6px') );
check('the style and the script are in the page (the script after the cruiser HUD\'s), and the scene calls the sync before the corners', /<link rel="stylesheet" href="src\/camppagehud\.css">/.test(html) && html.indexOf('src/camppagehud.js') > html.indexOf('src/campcruiserhud.js') && scene.indexOf('campPageHudSync(this') > 0 && scene.indexOf('campPageHudSync(this') < scene.indexOf('campCornerSync(this'));
check('one new file for the code and one for the style, and campaignscene.js grew by one line (the sync call): the stack at the top centre includes the goal panel, so a toast starts under it; the goal and wave lines and the rest are hidden by the page HUD\'s own sync, so the scene\'s lines are as they were', !/camppagehud/.test(src('src/camptdispscene.js')) && (scene.match(/^.*campPageHudSync.*$/gm) || []).length === 1 && (scene.match(/^.*campPageHudHides.*$/gm) || []).length === 0 && /pageHudStack/.test(scene) && /toastTop\(\) \{ return this\.hudStack \? Math\.ceil\(this\.hudStack \+ CAMP\.hud\.toastGap\) : TOAST\.top; \}/.test(scene));
check('no image files, no libraries: no img tag, no data: URL, no script src in the HUD code', !/<img|data:image|createElement\(['"]script/.test(src('src/camppagehud.js')));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nPAGE HUD FAIL: ${failed} of ${n} checks failed` : `\nPAGE HUD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
