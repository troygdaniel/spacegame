// smoke: the page HUD (card space-game-page-hud): behind a switch that is off by default; the model of the cruiser and pilots panel (meters with a number only below full, rings coloured by hull, digits lit by the pick); every key chip from the key table; written at most 10 times a second and only what changed
// Troy, 24 Nov 2026: "rebuild the Campaign's flight HUD as page elements over the game canvas, in the look of the agent board" (docs/hud-mock.html); landing 1 of 3: the cruiser panel and the pilots. The canvas HUD is kept and its tests are not touched.
//   A  the switch: CAMP.flags.pagehud is false; a row of the N panel; the address flag; what the canvas leaves out while it is on (and nothing while it is off)
//   B  the model: the ship panel (the key, the label, shield and hull with a number only below full and for a few seconds after), the pilots (initial, digit, ring share and colour, dim when not out, the digits lit by the pick), what they do and who
//   C  every key chip is the key table's: change a key there and the model follows; no letter of a key is written in the code
//   D  the view on a stand-in page: the elements are made once, written only when a value changed, at most 10 times a second; the panel sits over the canvas, the font size is a share of its width; the rows' places move under the panel; switching off takes it away
//   H  round 2 (card space-game-page-hud-2): words on the meters, the pick's outline and lit digit (dim only for rest), W then a digit closes the menu, no Red 1 to 3, no radio contact sentence while it is on
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
check('what they are doing is ONE word, the verb of the same words the target display uses (capitalised: "Guarding", "Mining"), as the mock has it', /^[A-Z][a-z]+$/.test(J('campPageModel(C).pilots.doing')), J('campPageModel(C).pilots.doing'));
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
check('a friendly picked: its name, its hull and how far (the E chip is on the pilots row now, always: card space-game-page-hud-2), and the Enter chip with Guard from the key table and the order model', fr && fr.key === undefined && fr.label === undefined && fr.enter.key === J(`campCornerCap('order')`) && fr.enter.word === 'Guard' && J('campPageModel(C).pilots.ekey') === J(`campCornerCap('friendlies')`) && fr.name === J('campTdispName(WD.unit)') && fr.frac > 0 && fr.frac <= 1 && /km$/.test(fr.km), JSON.stringify(fr));
g.run(`window.__pl = Object.values(campPlaces(C.level)).find(p => !p.hidden); window.__pv = { x: __pl.x - W / 2, y: __pl.y - (__pl.r || 60) - 36 - H / 2, zoom: 1 };`);
const pls = J('campPageModel(C, __pv).places');
check('a place in view gets ONE pill (its name, with its outpost after a dot), at the place\'s screen place', pls.length >= 1 && pls[0].name.indexOf(J('String(__pl.name)')) === 0 && Math.abs(pls[0].x - J('W') / 2) < 1 && Math.abs(pls[0].y - J('H') / 2) < 1, JSON.stringify(pls));
check('far out (under the far marks\' zoom) the page draws no place pills: the canvas\'s marks have the names', J('campPageModel(C, { x: __pv.x, y: __pv.y, zoom: CAMPZOOM.view.markZ / 2 }).places.length') === 0 && J('campPageModel(C).places.length') === 0);
g.run(`CAMP.flags.pagehud = true; window.S4 = __scene(); S4.hud = { keys: { visible: true, setVisible(v) { this.visible = v; } }, obj: { visible: true, setVisible(v) { this.visible = v; } }, wave: { visible: true, setVisible(v) { this.visible = v; } } }; S4.keysBack = { visible: true, setVisible(v) { this.visible = v; } }; S4.placeLabels = [{ visible: true, active: true, setVisible(v) { this.visible = v; } }]; S4.cameras = { main: { scrollX: __view.x, scrollY: __view.y, zoom: 1 } }; S4.cornerDy = { friendlies: 40 }; campPageHudSync(S4, 0);`);
check('the panels are drawn: hostiles (display on), the friendlies, the edge pill, and the bottom key line, its strip and the world\'s place labels are hidden', J('S4.pageHud.foes.el.style.display') === '' && J('S4.pageHud.friend.el.style.display') === '' && J('S4.pageHud.edge.el.style.display') === '' && J('S4.hud.keys.visible') === false && J('S4.keysBack.visible') === false && J('S4.placeLabels[0].visible') === false && J('S4.hud.obj.visible') === false && J('S4.hud.wave.visible') === false);
check('the hostiles panel says what, where and how far; the friend panel its name; the edge pill the count', J('S4.pageHud.foes.key._text') === J(`campCornerCap('hostiles')`) && /km$/.test(J('S4.pageHud.foes.sub._text')) && J('S4.pageHud.friend.name._text') === J('campTdispName(WD.unit)') && /^2 /.test(J('S4.pageHud.edge.text._text')));
check('the friend\'s details are INSIDE the ship panel, under the pilots (no panel of their own); the edge pill is at the edge of the canvas', J('S4.pageHud.friend.el.parentNode === S4.pageHud.ship.el') === true && !J('S4.pageHud.friend.el.style.top') && parseInt(J('S4.pageHud.edge.el.style.left')) > 1000, J('[S4.pageHud.friend.el.style.top, S4.pageHud.edge.el.style.left]'));
check('the canvas rows keep their place under the panels: the details of FRIENDLIES open under the ship panel (the friend\'s details are in it), those of HOSTILES under the hostiles panel (here the stand-in panels all end at 130)', J('CAMP_CORNER_SHIFT.bl') === J('130 + CAMP.corner.stack - CAMP.corner.at.bl.y') && J('CAMP_CORNER_SHIFT.tr') === J('130 - CAMP.corner.title.h - CAMP.corner.at.tr.y'));
g.run(`C.fsel = ''; RA.hp = 0; RB.hp = 0; RA.gone = RB.gone = true; campPageHudSync(S4, 300);`);
check('no hostile and no friendly: both panels and the edge pill are not drawn (display none)', J('S4.pageHud.foes.el.style.display') === 'none' && J('S4.pageHud.friend.el.style.display') === 'none' && J('S4.pageHud.edge.el.style.display') === 'none');
g.run(`CAMP.flags.pagehud = false; campPageHudSync(S4, 600);`);
check('off: the key line, its strip and the place labels are back', J('S4.hud.keys.visible') === true && J('S4.keysBack.visible') === true && J('S4.placeLabels[0].visible') === true && J('S4.hud.obj.visible') === true && J('S4.hud.wave.visible') === true);
check('the scene files: the hostile arrows are left out of the sight scene, the labels drawPlace makes are kept (placeLabels), and the corners\' slide is stored for the friend panel', /campPageHudHides\('sight'\) \? \[\]/.test(src('src/campsightscene.js')) && /placeLabels/.test(src('src/campaignscene.js')) && /s\.cornerDy\[d\.id\] = dy/.test(src('src/campcornerscene.js')));

console.log('H. round 2 (card space-game-page-hud-2, Troy, 25 Nov 2026)');
g.run(`CAMP.flags.pagehud = false; __out();`);
const M2 = J('campPageModel(C)');
check('1 the meters have words: Shields and Hull on the cruiser panel, Ore and Missiles on the stock panel (Troy\'s own ask: the only new words)', M2.ship.shield.word === 'Shields' && M2.ship.hull.word === 'Hull' && M2.stock.ore.word === 'Ore' && M2.stock.missiles.word === 'Missiles', JSON.stringify([M2.ship.shield.word, M2.ship.hull.word, M2.stock.ore.word, M2.stock.missiles.word]));
check('1 the four words are text keys of the corner family (a voicepack rule covers them) and are in the table', ['shield', 'hull', 'ore', 'missiles'].every(k => J(`uiText('camp.corner.m.${k}')`) !== `camp.corner.m.${k}`) && J(`voicePackFamily('camp.corner.m.ore')`) !== undefined);
g.run(`CAMP.flags.pagehud = true; window.S = __scene(); campPageHudSync(S, 5000);`);
const R2 = J(`(() => { const R = S.pageHud; return { sh: R.ship.shield.lab._text, hu: R.ship.hull.lab._text, or: R.stock.oreLab._text, mi: R.stock.missLab._text, cls: R.ship.shield.lab._cls }; })()`);
check('1 the view writes each word beside its icon, in the label style (small and muted: ph-lab)', R2.sh === 'Shields' && R2.hu === 'Hull' && R2.or === 'Ore' && R2.mi === 'Missiles' && /ph-lab/.test(R2.cls), JSON.stringify(R2));
// 2 the pick
g.run(`C.sel = 'pilot:green';`);
const PK1 = J('campPageModel(C).pilots.items.map(p => [p.pick, p.on])');
check('2 one pilot picked: only that pilot is picked, and the others are NOT dimmed for it (dim is resting: they are all out)', PK1.map(x => x[0]).join() === 'false,true,false' && PK1.every(x => x[1] === true), JSON.stringify(PK1));
g.run(`C.sel = 'all';`);
check('2 all pilots picked: all three have the pick', J('campPageModel(C).pilots.items.map(p => p.pick)').join() === 'true,true,true');
g.run(`C.sel = 'pilot:red'; window.__u = campSelList(C).find(e => e.id === 'pilot:red').unit; __u.hp = 0;`);
const PK2 = J('campPageModel(C).pilots.items.map(p => [p.pick, p.on])');
check('2 DIM keeps its one meaning: a pilot at rest or hurt away (hull gone, in the bay) is dim whether picked or not', PK2[0][1] === false && PK2[1][1] === true && PK2[2][1] === true, JSON.stringify(PK2));
g.run(`__u.hp = __u.maxhp || 100; C.sel = 'pilot:green'; campPageHudSync(S, 9000);`);
const V2 = J(`S.pageHud.ship.pilots.map(p => [p.el._cls, p.halo._cls])`);
check('2 the view marks the picked pilot (class pick: the bright outline and the lit digit) and no other', /pick/.test(V2[1][0]) && !/pick/.test(V2[0][0]) && !/pick/.test(V2[2][0]), JSON.stringify(V2));
const css2 = src('src/camppagehud.css');
check('2 the style: the outline is a halo that shows with .pick and is never dimmed; only a pilot not .on is dim; no rule dims a pilot for being unpicked', /\.ph-pilot\.pick \.ph-halo\s*\{\s*display:\s*block/.test(css2) && /\.ph-pilot:not\(\.on\) \.ph-ring/.test(css2) && !/\.ph-pilot:not\(\.pick\)/.test(css2) && !/\.ph-pilot\s*\{[^}]*opacity/.test(css2) && /\.ph-pilot\.pick small\s*\{[^}]*opacity:\s*1/.test(css2));
// 3 W then a digit
g.run(`__new(); window.P = campPanelNew(); campCornerKey(C, 'KeyW'); window.__w1 = campPanelKey(P, C, 'KeyW', 100); window.__w2 = campPanelKey(P, C, 'KeyW', 150);`);
check('3 W opens the menu and its details; tapping W again steps who and keeps both open', J('__w1.open') === 'fleet' && J('__w2.open') === 'fleet' && J('campCornerNow(C, "fleet").open') > 0 && J('C.sel') === 'pilot:red');
g.run(`window.__d = campPanelKey(P, C, 'Digit3', 200); window.__shut = __d.ok && !__d.open && __d.fleet && __d.digit === 3 && /^who/.test(String(__d.row || ''));`);
check('3 a digit takes the pick and closes the list; the scene\'s test for that is true for a who row only', J('__shut') === true && J('C.sel') === 'pilot:yellow' && J('campPanelOpen(P)') === '');
g.run(`campCornerShut(C, 'fleet');`);
const N3 = J('campCornerNow(C, "fleet")');
check('3 the scene shuts the corner\'s details at once; the title row, the key chips and the selection stay', N3.open === 0 && N3.items.length === 0 && N3.title === 'FLEET' && N3.selection === 'Apollo' && N3.chips.length > 0, JSON.stringify([N3.open, N3.title, N3.selection]));
g.run(`campCornerKey(C, 'KeyW');`);
check('3 W opens the details again', J('campCornerNow(C, "fleet").open') > 0);
g.run(`window.P = campPanelNew(); campPanelKey(P, C, 'KeyQ', 300); window.__q = campPanelKey(P, C, 'Digit1', 350);`);
check('3 a digit in the Q list is no who row: the scene shuts nothing for it', !/^who/.test(String(J('__q.row') || '')));
const sc3 = src('src/campaignscene.js');
check('3 the scene makes the call after the keys of the lists, once, for a digit on a who row', (sc3.match(/campCornerShut\(C, 'fleet'\)/g) || []).length === 1 && /pr\.ok && !pr\.open && pr\.fleet && pr\.digit && \/\^who\/\.test\(String\(pr\.row \|\| ''\)\)/.test(sc3) && !/campKeyDigit/.test(sc3));
// 5 no Red 1, 2, 3
g.run(`__new();`);
const nm = J(`({ pilots: CAMP.pilots.map(p => [p.name, !!p.call]), rows: campPanelRows(C, 'fleet').map(r => r.label), sel: campSelLabel('pilot:green'), corner: campCornerNow(C, 'fleet').items.map(i => i.name || i.label), fleetText: campCornerNow(C, 'fleet').selection })`);
check('5 no Red 1, Red 2, Red 3: the pilots have names and no call signs, and the fleet pick\'s rows and the corner say the names (names stay in the W menu)', nm.pilots.every(p => !p[1]) && nm.rows.slice(0, 3).join() === 'Wedge,Kara,Apollo' && nm.sel === 'Kara' && !/Red [123]/.test(JSON.stringify(nm)), JSON.stringify(nm));
const tx = ['src/shipcomputer.js', 'src/data_controls.js', 'src/campaign.js', 'src/camptarget.js'].map(f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\/\/.*$/, '')).join('\n')).join('\n') + src('README.md') + src('content/text/campcorner.md').replace(/^[^|\n]*$/gm, '');
check('5 no Red 1, 2 or 3 in the code\'s words, the README or the content table (the squads are still called Red, Green and Yellow)', !/Red [123]/.test(tx) && !/Red [123]/.test(J(`JSON.stringify(Object.values(UI_TEXT))`)));
// 6 the radio's contact sentence
const say = () => J(`C.events.filter(e => e.type === 'say' && e.key === 'camp.say.sight').length`);
const sight = on => { g.run(`CAMP.flags.pagehud = ${on}; __new(); C.ships = C.ships.filter(u => u.team !== 'alien'); C.carrier.x = 0; C.carrier.y = 0; for (let i = 0; i < 3; i++) { const u = campSpawn(C, 'raider', 8000 + i * 80, 0); u.vx = u.vy = 0; } C.events.length = 0; C.t = 100000; campSightStep(C); C.t += CAMP.sensor.delay + 10; campSightStep(C);`); return { said: say(), at: J('C.sight.saidAt'), foes: J('campPageModel(C).foes') }; };
const off6 = sight(false), on6 = sight(true);
check('6 with the page HUD off the radio calls the contact as it did: "Contact, east: 3 hostiles, 8 km."', off6.said === 1 && off6.at > 0);
check('6 with the page HUD on the radio says no contact sentence (the hostiles panel says it), and the time between calls still runs', on6.said === 0 && on6.at > 0, JSON.stringify(on6));
check('7 the hostiles panel keeps the game\'s own rule: hostiles far from a scout or escort are "3 hostiles", not a type', /^3 hostiles$/.test(on6.foes && on6.foes.what), JSON.stringify(on6.foes));
g.run(`CAMP.flags.pagehud = false;`);
check('6 the contact sentence is a hide of the page HUD (contact) and nothing else changed in the list', J('CAMP_PAGEHUD.hides.includes("contact")') === true && J('campPageHudHides("contact")') === false);

// 8, 9, 10 (the second note of the card, Troy, 25 Nov 2026)
g.run(`CAMP.flags.pagehud = true; __out(); C.ships = C.ships.filter(u => u.team !== 'alien'); C.fsel = ''; C.tgt = ''; window.S = __scene(); campPageHudSync(S, 20000);`);
check('8 Shields and Hull sit side by side on ONE row: both meters are in the same row (ph-meters), each a half with its icon, its word and its meter', J(`(() => { const R = S.pageHud, row = x => x.fill.parentNode.parentNode.parentNode; return row(R.ship.shield) === row(R.ship.hull) && /ph-meters/.test(row(R.ship.shield)._cls) && R.ship.shield.fill.parentNode.parentNode !== R.ship.hull.fill.parentNode.parentNode && R.ship.shield.lab._text === 'Shields' && R.ship.hull.lab._text === 'Hull'; })()`) === true && /\.ph-meters\s*\{[^}]*display:\s*flex/.test(css2) && /\.ph-half\s*\{[^}]*flex:\s*1/.test(css2));
const rest = J(`(() => { const R = S.pageHud; return { e: R.ship.ekey._text, eShown: R.ship.ekey.parentNode === R.ship.plBox, friendIn: R.friend.el.parentNode === R.ship.el, friendOn: R.friend.el._ph.display !== 'none', rows: R.ship.el.children.map(c => c._cls), foesOn: R.foes.el._ph.display !== 'none' }; })()`);
check('9 at rest the left panel is two rows under its title: the meters, then the pilots with the W chip first and the E chip at the end, always shown; no friendlies panel (the friend\'s block is hidden)', rest.e === J(`campCornerCap('friendlies')`) && rest.e !== '' && rest.eShown && rest.friendIn && !rest.friendOn && rest.rows.map(c => c.split(' ')[0]).join() === 'ph-row,ph-meters,ph-pilots,ph-friend', JSON.stringify(rest));
check('9 the E chip is the key table\'s: a key moved there moves the chip', (g.run(`window.__k = CAMP_KEYS.friendlies.k; CAMP_KEYS.friendlies.k = 'Y'; campPageHudSync(S, 20500);`), J('S.pageHud.ship.ekey._text')) === 'Y' && (g.run(`CAMP_KEYS.friendlies.k = __k; campPageHudSync(S, 21000);`), J('S.pageHud.ship.ekey._text')) === J(`campCornerCap('friendlies')`));
check('10 nothing picked: no Enter hint on the hostiles panel or in the friend\'s block', J('campPageModel(C).foes') === null && J('campPageModel(C).friend') === null && J('campPageHudEnter(C, "attack")') === null && J('campPageHudEnter(C, "guard")') === null);
g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 200); campTgtNearest(C); campPageHudSync(S, 22000);`);
const en1 = J('campPageModel(C).foes.enter');
check('10 a hostile picked: the hostiles panel shows the Enter chip (the key table\'s) with the word Attack (the order model\'s verb)', en1 && en1.key === J(`campCornerCap('order')`) && en1.key !== '' && en1.word === 'Attack' && J('S.pageHud.foes.ent.key._text') === en1.key && J('S.pageHud.foes.ent.word._text') === 'Attack' && J('S.pageHud.foes.ent.el._ph.display') === '');
g.run(`C.tgt = ''; campPageHudSync(S, 23000);`);
check('10 the hostile let go (nothing picked): the hint is gone from the panel', J('campPageModel(C).foes.enter') === null && J('S.pageHud.foes.ent.el._ph.display') === 'none');
g.run(`window.WD = campFriList(C).find(e => e.kind === 'ward'); C.fsel = WD.id; campPageHudSync(S, 24000);`);
const en2 = J('campPageModel(C).friend.enter');
check('10 a friendly picked: its details (under the pilots) show the Enter chip with the word Guard, and the hostiles panel has none', en2 && en2.word === 'Guard' && en2.key === J(`campCornerCap('order')`) && J('S.pageHud.friend.ent.word._text') === 'Guard' && J('S.pageHud.friend.el._ph.display') === '' && J('campPageModel(C).foes.enter') === null);
check('10 the chip is the key table\'s: Enter moved there moves the chip', (g.run(`window.__k = CAMP_KEYS.order.k; CAMP_KEYS.order.k = 'Z';`), J('campPageModel(C).friend.enter.key')) === 'Z' && (g.run(`CAMP_KEYS.order.k = __k;`), J('campPageModel(C).friend.enter.key')) === J(`campCornerCap('order')`));
const pj = src('src/camppagehud.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('10 the word and the chip are not written in the HUD: the verb is what campSelOrder says (a dry run, no order is given), the words are text keys', /campSelOrder\(C, 'engage', 'key', true\)/.test(pj) && !/['"](Attack|Guard|Enter)['"]/.test(pj) && J(`uiText('camp.corner.enter.attack')`) === 'Attack' && J(`uiText('camp.corner.enter.guard')`) === 'Guard');
g.run(`CAMP.flags.pagehud = false; C.fsel = ''; C.tgt = '';`);
check('the canvas HUD is as it was with the switch off: no page HUD element, the corners show their rows again', J('(() => { campPageHudSync(S, 30000); return !S.pageHud && campCornerNow(C, "fleet").rowHidden === false; })()') === true);

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
