// smoke: the page HUD (card space-game-page-hud): behind a switch that is off by default; the model of the cruiser and pilots panel (meters with a number only below full, rings coloured by hull, digits lit by the pick); every key chip from the key table; written at most 10 times a second and only what changed
// Troy, 24 Nov 2026: "rebuild the Campaign's flight HUD as page elements over the game canvas, in the look of the agent board" (docs/hud-mock.html); landing 1 of 3: the cruiser panel and the pilots. The canvas HUD is kept and its tests are not touched.
//   A  the switch: CAMP.flags.pagehud is false; a row of the N panel; the address flag; what the canvas leaves out while it is on (and nothing while it is off)
//   B  the model: the ship panel (the key, the label, shield and hull with a number only below full and for a few seconds after), the pilots (initial, digit, ring share and colour, dim when not out, the digits lit by the pick), what they do and who
//   C  every key chip is the key table's: change a key there and the model follows; no letter of a key is written in the code
//   D  the view on a stand-in page: the elements are made once, written only when a value changed, at most 10 times a second; the panel sits over the canvas, the font size is a share of its width; the rows' places move under the panel; switching off takes it away
//   H  round 2 (card space-game-page-hud-2): words on the meters, the pick's outline and lit digit (dim only for rest), W then a digit closes the menu, no Red 1 to 3, no radio contact sentence while it is on
//   J  a full card hides the panels (card space-game-page-hud-hide-on-cards)
//   K  the first-minute chips of mission 1.1 (card space-game-page-hud-first-minute-chips)
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
check('the ship panel: the key chip and a shield and a hull meter at full, each with its word and no percentage (the CRUISER label is gone: option D of docs/hud-mock-2.html)', M.ship.label === undefined && M.ship.key !== '' && M.ship.shield.word === 'Shields' && M.ship.hull.word === 'Hull' && M.ship.shield.frac === 1 && M.ship.hull.frac === 1 && M.ship.shield.show === false && M.ship.hull.show === false, JSON.stringify(M.ship));
g.run(`C.shield = campShieldMax(C) * 0.5; C.t = 2000;`);
const hurt = J('campPageModel(C).ship.shield');
check('below full the percentage shows (the shield at half: 50), the hull still has none', hurt.frac > 0.49 && hurt.frac < 0.51 && hurt.show === true && hurt.pct === 50 && J('campPageModel(C).ship.hull.show') === false, JSON.stringify(hurt));
g.run(`C.shield = campShieldMax(C); C.t = 2000 + 1000;`);
check('full again: the percentage goes at once (it shows ONLY below 100: card space-game-page-hud-3), and a hair under full is 99, never 100', J('campPageModel(C).ship.shield.show') === false && (g.run(`C.shield = campShieldMax(C) * 0.996;`), J('campPageModel(C).ship.shield.pct') === 99 && J('campPageModel(C).ship.shield.show') === true) && (g.run(`C.shield = campShieldMax(C);`), true));
g.run(`C.carrier.hp = C.carrier.maxHp * 0.4; C.t = 9000;`);
check('the hull: the same rule', J('campPageModel(C).ship.hull.show') === true && J('campPageModel(C).ship.hull.pct') === 40 && Math.abs(J('campPageModel(C).ship.hull.frac') - 0.4) < 1e-6);
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
check('All pilots picked outlines every ring and lights every digit (card space-game-w4-all-lit)', J('campPageModel(C).pilots.items.every(p => p.pick)') === true);
g.run(`C.sel = 'pilot:green';`);
check('one pilot picked: only his ring is outlined and his digit lit', J('campPageModel(C).pilots.items.map(p => p.pick).join()') === 'false,true,false');
check('the pilots\' row has no words of what they do: option D is chips and rings (no Guarding, no name line)', J('campPageModel(C).pilots.doing') === null && J('campPageModel(C).pilots.who') === null);
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
check('the left panel shows the three chips from the table (Q, W, E), three pilot rings with their digits inside, and no word of what they do (option D)', J('S.pageHud.ship.key._text') === J(`campCornerCap('zoomreset')`) && J('S.pageHud.fleet.pkey._text') === J(`campCornerCap('who')`) && J('S.pageHud.fleet.ekey._text') === J(`campCornerCap('friendlies')`) && J('S.pageHud.fleet.pilots.length') === 3 && J('S.pageHud.fleet.pilots.map(p => p.text._text).join("")') === '123' && J('S.pageHud.fleet.pilots.every(p => p.under._text === "")') === true);
check('the meters: full widths, their words, and no percentage', J('S.pageHud.ship.shield.fill.style.width') === '100%' && J('S.pageHud.ship.hull.fill.style.width') === '100%' && J('S.pageHud.ship.shield.pct._text') === '' && J('S.pageHud.ship.hull.pct._text') === '' && J('S.pageHud.ship.shield.word._text') === 'Shields');
g.run(`window.__w0 = __writes; window.__r2 = campPageHudSync(S, 50);`);
check('10 a second at most: a call 50 ms later writes nothing at all', J('__writes') === J('__w0') && J('__r2') === true);
g.run(`__w0 = __writes; campPageHudSync(S, 100);`);
check('and a call a tenth of a second later writes nothing either when nothing changed (only an element whose value changed is written)', J('__writes') === J('__w0'), J('__writes - __w0'));
g.run(`C.shield = campShieldMax(C) * 0.5; __w0 = __writes; campPageHudSync(S, 200);`);
check('the shield falls to half: its bar and its percentage are written, and nothing else (two writes)', J('__writes - __w0') === 2 && J('S.pageHud.ship.shield.pct._text') === '50%' && /^50/.test(J('S.pageHud.ship.shield.fill.style.width')), J('__writes - __w0'));
g.run(`C.sel = 'pilot:red'; __w0 = __writes; campPageHudSync(S, 300);`);
check('the pick moves to one pilot: two classes are written (the others lose the outline), no ring', J('__writes - __w0') <= 4 && /pick/.test(J('S.pageHud.fleet.pilots[0].el._cls')) && !/pick/.test(J('S.pageHud.fleet.pilots[1].el._cls')), J('__writes - __w0'));
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
check('no hostile seen: no hostiles panel (null), no edge pill; no friendly picked: no Enter hint in the fleet row', J('campPageModel(C).foes') === null && J('campPageModel(C, { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2, zoom: 1 }).edge') === null && (g.run(`C.fsel = '';`), J('campPageModel(C).friends.enter') === null && J('campPageModel(C).friends.items.every(x => !x.pick)') === true));
g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 200); window.RB = campSpawn(C, 'raider', C.carrier.x + 950, C.carrier.y + 150);`);
const foes = J('campPageModel(C).foes');
check('a hostile seen: the panel has the hostiles key (the table\'s), the label, what it is (the sight\'s own words), a compass point and how far', foes && foes.key === J(`campCornerCap('hostiles')`) && foes.label === 'HOSTILES' && /Raider|hostile/i.test(foes.what) && /^(north|south|east|west)/.test(foes.dir) && /km$/.test(foes.km), JSON.stringify(foes));
g.run(`window.__view = { x: C.carrier.x - W / 2, y: C.carrier.y - H / 2, zoom: 1 }; RA.x = C.carrier.x + 2600; RA.y = C.carrier.y; RB.x = C.carrier.x + 2650; RB.y = C.carrier.y;`);
const edge = J('campPageModel(C, __view).edge');
check('hostiles off the screen: one pill at the edge with the count and how far, and an arrow angle', edge && edge.n === 2 && /km$/.test(edge.km) && Math.abs(edge.angle) < 0.3 && edge.x > J('W') * 0.8, JSON.stringify(edge));
g.run(`window.WD = campFriList(C).find(e => e.kind === 'ward'); C.fsel = WD.id;`);
const fr = J('campPageModel(C).friends');
check('a friendly picked: its ring is picked in the E group (the number, the name and the hull from 2-GEN\'s numbered list), the E chip is the table\'s, and the Enter chip with Guard comes from the key table and the order model (card space-game-page-hud-3)', fr && fr.items.length >= 1 && fr.items.filter(x => x.pick).length === 1 && fr.items.find(x => x.pick).id === J('WD.id') && fr.items.find(x => x.pick).name === J('campFriNumbered(C).find(e => e.picked).name') && fr.key === J(`campCornerCap('friendlies')`) && fr.enter.key === J(`campCornerCap('order')`) && fr.enter.word === 'Guard' && fr.items.find(x => x.pick).frac > 0, JSON.stringify(fr));
g.run(`window.__pl = Object.values(campPlaces(C.level)).find(p => !p.hidden); window.__pv = { x: __pl.x - W / 2, y: __pl.y - (__pl.r || 60) - 36 - H / 2, zoom: 1 };`);
const pls = J('campPageModel(C, __pv).places');
check('a place in view gets ONE pill (its name, with its outpost after a dot), at the place\'s screen place', pls.length >= 1 && pls[0].name.indexOf(J('String(__pl.name)')) === 0 && Math.abs(pls[0].x - J('W') / 2) < 1 && Math.abs(pls[0].y - J('H') / 2) < 1, JSON.stringify(pls));
check('far out (under the far marks\' zoom) the page draws no place pills: the canvas\'s marks have the names', J('campPageModel(C, { x: __pv.x, y: __pv.y, zoom: CAMPZOOM.view.markZ / 2 }).places.length') === 0 && J('campPageModel(C).places.length') === 0);
g.run(`CAMP.flags.pagehud = true; window.S4 = __scene(); S4.hud = { keys: { visible: true, setVisible(v) { this.visible = v; } }, obj: { visible: true, setVisible(v) { this.visible = v; } }, wave: { visible: true, setVisible(v) { this.visible = v; } } }; S4.keysBack = { visible: true, setVisible(v) { this.visible = v; } }; S4.placeLabels = [{ visible: true, active: true, setVisible(v) { this.visible = v; } }]; S4.cameras = { main: { scrollX: __view.x, scrollY: __view.y, zoom: 1 } }; S4.cornerDy = { friendlies: 40 }; campPageHudSync(S4, 0);`);
check('the panels are drawn: hostiles (display on), the Enter hint of the picked friendly, the edge pill, and the bottom key line, its strip and the world\'s place labels are hidden', J('S4.pageHud.foes.el.style.display') === '' && J('S4.pageHud.fleet.ent.el._ph.display') === '' && J('S4.pageHud.edge.el.style.display') === '' && J('S4.hud.keys.visible') === false && J('S4.keysBack.visible') === false && J('S4.placeLabels[0].visible') === false && J('S4.hud.obj.visible') === false && J('S4.hud.wave.visible') === false);
check('the hostiles panel says what, where and how far; the edge pill the count', J('S4.pageHud.foes.key._text') === J(`campCornerCap('hostiles')`) && /km$/.test(J('S4.pageHud.foes.sub._text')) && /^2 /.test(J('S4.pageHud.edge.text._text')));
check('the ships you protect are small rings in the left panel (no panel of their own, no details box); the edge pill is at the edge of the canvas', J('S4.pageHud.fleet.ships.length') >= 1 && J('S4.pageHud.fleet.ships.some(g => /pick/.test(g.el._cls))') === true && J('S4.pageHud.fleet.ships[0].el.parentNode === S4.pageHud.fleet.sBox') === true && J('S4.pageHud.friend') === null && parseInt(J('S4.pageHud.edge.el.style.left')) > 1000);
check('the canvas rows keep their place under the panels: the details of FRIENDLIES (the canvas draws none while the page HUD is on: the rings replace the box) would open under the ship panel, those of HOSTILES under the hostiles panel (here the stand-in panels all end at 130)', J('CAMP_CORNER_SHIFT.bl') === J('130 + CAMP.corner.stack - CAMP.corner.at.bl.y') && J('CAMP_CORNER_SHIFT.tr') === J('130 - CAMP.corner.title.h - CAMP.corner.at.tr.y'));
g.run(`C.fsel = ''; RA.hp = 0; RB.hp = 0; RA.gone = RB.gone = true; campPageHudSync(S4, 300);`);
check('no hostile and no friendly picked: the hostiles panel, the Enter hint and the edge pill are not drawn (display none)', J('S4.pageHud.foes.el.style.display') === 'none' && J('S4.pageHud.fleet.ent.el._ph.display') === 'none' && J('S4.pageHud.edge.el.style.display') === 'none');
g.run(`CAMP.flags.pagehud = false; campPageHudSync(S4, 600);`);
check('off: the key line, its strip and the place labels are back', J('S4.hud.keys.visible') === true && J('S4.keysBack.visible') === true && J('S4.placeLabels[0].visible') === true && J('S4.hud.obj.visible') === true && J('S4.hud.wave.visible') === true);
check('the scene files: the hostile arrows are left out of the sight scene, the labels drawPlace makes are kept (placeLabels), and the corners\' slide is stored', /campPageHudHides\('sight'\) \? \[\]/.test(src('src/campsightscene.js')) && /placeLabels/.test(src('src/campaignscene.js')) && /s\.cornerDy\[d\.id\] = dy/.test(src('src/campcornerscene.js')));

console.log('H. round 2 (card space-game-page-hud-2, Troy, 25 Nov 2026)');
g.run(`CAMP.flags.pagehud = false; __out();`);
const M2 = J('campPageModel(C)');
check('1 the meters have words: Shields and Hull on the cruiser panel, Ore and Missiles on the stock panel (Troy\'s own ask: the only new words)', M2.ship.shield.word === 'Shields' && M2.ship.hull.word === 'Hull' && M2.stock.ore.word === 'Ore' && M2.stock.missiles.word === 'Missiles', JSON.stringify([M2.ship.shield.word, M2.ship.hull.word, M2.stock.ore.word, M2.stock.missiles.word]));
check('1 the four words are text keys of the corner family (a voicepack rule covers them) and are in the table', ['shield', 'hull', 'ore', 'missiles'].every(k => J(`uiText('camp.corner.m.${k}')`) !== `camp.corner.m.${k}`) && J(`voicePackFamily('camp.corner.m.ore')`) !== undefined);
g.run(`CAMP.flags.pagehud = true; window.S = __scene(); campPageHudSync(S, 5000);`);
const R2 = J(`(() => { const R = S.pageHud; return { sh: R.ship.shield.word._text, hu: R.ship.hull.word._text, or: R.stock.oreLab._text, mi: R.stock.missLab._text, cls: R.ship.shield.word.parentNode._cls }; })()`);
check('1 the view writes each word: Shields and Hull over their meters (the label style: small and muted), Ore and Missiles beside their icons', R2.sh === 'Shields' && R2.hu === 'Hull' && R2.or === 'Ore' && R2.mi === 'Missiles' && /ph-lab/.test(R2.cls), JSON.stringify(R2));
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
const V2 = J(`S.pageHud.fleet.pilots.map(p => p.el._cls)`);
check('2 the view marks the picked pilot (class pick: the bright outline and the lit digit) and no other', /pick/.test(V2[1]) && !/pick/.test(V2[0]) && !/pick/.test(V2[2]) && V2.every(c => !/dim|dead/.test(c)), JSON.stringify(V2));
const css2 = src('src/camppagehud.css');
check('2 the style: the outline is on the ring\'s wrapper (.ph-rw, so a dim ring does not dim it) and shows with .pick; only .dim dims a ring; no rule dims a ring for being unpicked', /\.ph-g\.pick \.ph-rw\s*\{[^}]*box-shadow/.test(css2) && /\.ph-g\.dim \.ph-ring\s*\{\s*opacity/.test(css2) && !/\.ph-g:not\(\.pick\)/.test(css2) && /\.ph-g\.pick small\s*\{[^}]*color:\s*#fff/.test(css2));

// 3 W then a digit
g.run(`__new(); window.P = campPanelNew(); campCornerKey(C, 'KeyW'); window.__w1 = campPanelKey(P, C, 'KeyW', 100); window.__w2 = campPanelKey(P, C, 'KeyW', 150);`);
check('3 W opens the menu; tapping W again steps who and keeps it open (the canvas details box of W is not drawn while the page HUD is on: the grown rings carry the digits and names, card space-game-page-hud-canvas-leftovers)', J('__w1.open') === 'fleet' && J('__w2.open') === 'fleet' && J('campCornerNow(C, "fleet").open') === 0 && J('C.sel') === 'pilot:red');
g.run(`window.__d = campPanelKey(P, C, 'Digit3', 200); window.__shut = __d.ok && !__d.open && __d.fleet && __d.digit === 3 && /^who/.test(String(__d.row || ''));`);
check('3 a digit takes the pick and closes the list; the scene\'s test for that is true for a who row only', J('__shut') === true && J('C.sel') === 'pilot:yellow' && J('campPanelOpen(P)') === '');
g.run(`campCornerShut(C, 'fleet');`);
const N3 = J('campCornerNow(C, "fleet")');
check('3 the scene shuts the corner\'s details at once; the title row, the key chips and the selection stay', N3.open === 0 && N3.items.length === 0 && N3.title === 'FLEET' && N3.selection === 'Apollo' && N3.chips.length > 0, JSON.stringify([N3.open, N3.title, N3.selection]));
g.run(`campCornerKey(C, 'KeyW');`);
check('3 W opens the details again (the switch off: the canvas box is drawn as it was; the switch on: not)', (g.run(`CAMP.flags.pagehud = false; campCornerKey(C, 'KeyW');`), J('campCornerNow(C, "fleet").open') > 0) && (g.run(`CAMP.flags.pagehud = true;`), J('campCornerNow(C, "fleet").open') === 0));
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

// the card space-game-page-hud-3, option D of docs/hud-mock-2.html: the left panel in two thin rows, the rings of the pilots and of the ships you protect
console.log('I. option D (card space-game-page-hud-3, Troy, 25 Nov 2026)');
g.run(`CAMP.flags.pagehud = true; CAMP.flags.pagedigit = true; __out(); C.ships = C.ships.filter(u => u.team !== 'alien'); C.fsel = ''; C.tgt = ''; window.P = campPanelNew(); campTcornerLook(P, 0); window.S = __scene(); campPageHudSync(S, 20000);`);
const D1 = J(`(() => { const R = S.pageHud, kids = x => x.children.map(c => c._cls.split(' ')[0]); return { top: kids(R.ship.el), row1: kids(R.ship.el.children[0]), row2: kids(R.fleet.el), cruiser: R.ship.el.children.length, label: R.ship.label }; })()`);
check('8 option D: the left panel is two thin rows with a hairline between: row 1 the Q chip with the Shields and Hull meters side by side (each a word and a track); row 2 the W chip, the pilots\' rings, a divider, the E chip, the ships\' rings, and the Enter hint at its end', D1.top.join() === 'ph-row,ph-hr,ph-row' && D1.row1.join() === 'ph-k,ph-m,ph-m' && D1.row2.join() === 'ph-k,ph-grp,ph-sep,ph-k,ph-grp,ph-g' && D1.label === undefined, JSON.stringify(D1));
check('8 the style: the rows and the rings are the mock\'s (the small ring 1.55em, the open one 2.4em; the digit and the name only while open; a divider between the groups)', /\.ph-g\s*\{[^}]*--s:\s*1\.55em/.test(css2) && /\.ph-g\.open\s*\{[^}]*--s:\s*2\.4em/.test(css2) && /\.ph-g:not\(\.open\) small\s*\{\s*display:\s*none/.test(css2) && /\.ph-sep\s*\{[^}]*width:\s*1px/.test(css2) && /\.ph-ship\s*\{[^}]*flex-direction:\s*column/.test(css2));
const ring0 = J(`(() => { const R = S.pageHud; return { pil: R.fleet.pilots.map(g => [g.el._cls, g.text._text, g.under._text]), pbox: R.fleet.pBox._cls, ships: R.fleet.ships.length, sbox: R.fleet.sBox._cls, e: R.fleet.ekey._text, w: R.fleet.pkey._text }; })()`);
check('9 at rest: three small pilot rings with their digits inside (Troy: the key is always on the screen) and nothing under them, the W and E chips from the table; the rings are not open', ring0.pil.map(x => x[1]).join('') === '123' && ring0.pil.every(x => x[2] === '' && !/open/.test(x[0])) && !/open/.test(ring0.pbox) && !/open/.test(ring0.sbox) && ring0.w === J(`campCornerCap('who')`) && ring0.e === J(`campCornerCap('friendlies')`) && ring0.e !== ring0.w);
check('9 the chips follow the key table: a key moved there moves the chip', (g.run(`window.__k = CAMP_KEYS.friendlies.k; CAMP_KEYS.friendlies.k = 'Y'; campPageHudSync(S, 20500);`), J('S.pageHud.fleet.ekey._text')) === 'Y' && (g.run(`CAMP_KEYS.friendlies.k = __k; campPageHudSync(S, 21000);`), J('S.pageHud.fleet.ekey._text')) === J(`campCornerCap('friendlies')`));
// W open
g.run(`campTcornerLook(P, 22000); campPanelKey(P, C, 'KeyW', 22000); campPageHudSync(S, 22200);`);
const wopen = J(`(() => { const R = S.pageHud; return { m: campPageModel(C).pilots.open, e: campPageModel(C).friends.open, pbox: R.fleet.pBox._cls, sbox: R.fleet.sBox._cls, under: R.fleet.pilots.map(g => g.under._text), cls: R.fleet.pilots.map(g => g.el._cls) }; })()`);
check('9 W open: the pilots\' rings grow in place (the group is open) and each shows its name under it, the digit being inside; the first tap of W picks all, so all three are outlined; the ships\' rings stay small', wopen.m === true && wopen.e === false && /open/.test(wopen.pbox) && !/open/.test(wopen.sbox) && wopen.under.join() === 'Wedge,Kara,Apollo' && wopen.cls.every(c => /open/.test(c)), JSON.stringify(wopen));
g.run(`campPanelKey(P, C, 'KeyW', 22300); campPageHudSync(S, 22500);`);
check('9 tapping W again steps who and keeps it open: the pick moves (one outlined ring)', J('campPageModel(C).pilots.open') === true && J('S.pageHud.fleet.pilots.filter(g => /pick/.test(g.el._cls)).length') === 1);
g.run(`window.__d = campPanelKey(P, C, 'Digit2', 22600); campPageHudSync(S, 22800);`);
check('9 W then a digit picks and closes the menu: the rings are small again, the picked one outlined', J('campPageModel(C).pilots.open') === false && !/open/.test(J('S.pageHud.fleet.pBox._cls')) && J('S.pageHud.fleet.pilots.map(g => /pick/.test(g.el._cls)).join()') === 'false,true,false');
// E open
g.run(`campPanelClose(P); campPanelKey(P, C, 'KeyE', 23000); campPageHudSync(S, 23200);`);
const eopen = J(`(() => { const R = S.pageHud, M = campPageModel(C); return { e: M.friends.open, w: M.pilots.open, n: M.friends.items.length, under: R.fleet.ships.map(g => g.under._text), sbox: R.fleet.sBox._cls, pbox: R.fleet.pBox._cls, ent: R.fleet.ent.el._ph.display, enter: M.friends.enter }; })()`);
check('9 E open: the ships\' rings grow in place with their digit and name under them, the pilots stay small, and the Enter chip with Guard is at the end of the row (E picks the first ship at once)', eopen.e === true && eopen.w === false && eopen.n >= 1 && /open/.test(eopen.sbox) && !/open/.test(eopen.pbox) && eopen.under[0] === J('campFriNumbered(C)[0].name') && eopen.ent === '' && eopen.enter && eopen.enter.word === 'Guard', JSON.stringify(eopen));
check('9 the ring\'s inside is ONE switch: the digit now (Troy, 25 Nov), the initial with the flag pagedigit off (then "1 Wedge" is under the ring while it is open)', J('S.pageHud.fleet.pilots.map(g => g.text._text).join("")') === '123' && (g.run(`CAMP.flags.pagedigit = false; campPageHudSync(S, 24500);`), J('S.pageHud.fleet.pilots.map(g => g.text._text).join("")')) === 'WKA' && J('campPageModel(C).pilots.items.map(p => p.under).join()') === '1 Wedge,2 Kara,3 Apollo' && (g.run(`CAMP.flags.pagedigit = true; campPageHudSync(S, 24800);`), J('S.pageHud.fleet.pilots.map(g => g.text._text).join("")')) === '123');
check('9 a row of the N panel flips it (a flag with words)', J(`campTuneRow('pagedigit').kind`) === 'flag' && J(`campTuneRow('pagedigit').flag`) === 'pagedigit' && J(`uiText('camp.ui.tune.row.pagedigit')`) === 'Page HUD: digits in the rings' && J('CAMP.flags.pagedigit') === true);
g.run(`campPanelClose(P);`);
// the hull percentage
g.run(`C.carrier.hp = C.carrier.maxHp * 0.82; campPageHudSync(S, 25000);`);
check('8 the percentage shows beside the word ONLY below 100 (the hull at 82), and goes at once at full', J('S.pageHud.ship.hull.pct._text') === '82%' && J('S.pageHud.ship.shield.pct._text') === '' && (g.run(`C.carrier.hp = C.carrier.maxHp; campPageHudSync(S, 25500);`), J('S.pageHud.ship.hull.pct._text')) === '');
// dark and dim
g.run(`window.__sh = campFriNumbered(C)[0]; window.__shu = __sh.unit; __shu.hp = 0; window.__pu1 = campSelList(C).find(e => e.id === 'pilot:red').unit; __pu1.hp = 0; campPageHudSync(S, 26000);`);
const dk = J(`(() => { const R = S.pageHud; return { ship: R.fleet.ships[0].el._cls, num: campFriNumbered(C)[0].number, alive: campFriNumbered(C)[0].alive, pil: R.fleet.pilots[0].el._cls }; })()`);
check('9 a ship you protect that is lost is a dark ring and keeps its number; a pilot at rest is dim (never dark): the two meanings stay apart', /dead/.test(dk.ship) && dk.alive === false && dk.num === 1 && /dim/.test(dk.pil) && !/dead/.test(dk.pil), JSON.stringify(dk));
g.run(`__pu1.hp = __pu1.maxHp; __shu.hp = __shu.maxHp || 100;`);
// 10 the Enter hint
g.run(`C.fsel = ''; C.tgt = ''; campPageHudSync(S, 27000);`);
check('10 nothing picked: no Enter hint on the hostiles panel or at the end of the fleet row', J('campPageModel(C).foes') === null && J('campPageModel(C).friends.enter') === null && J('S.pageHud.fleet.ent.el._ph.display') === 'none' && J('campPageHudEnter(C, "attack")') === null && J('campPageHudEnter(C, "guard")') === null);
g.run(`window.RA = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 200); campTgtNearest(C); campPageHudSync(S, 28000);`);
const en1 = J('campPageModel(C).foes.enter');
check('10 a hostile picked: the hostiles panel shows the Enter chip (the key table\'s) with the word Attack (the order model\'s verb)', en1 && en1.key === J(`campCornerCap('order')`) && en1.key !== '' && en1.word === 'Attack' && J('S.pageHud.foes.ent.key._text') === en1.key && J('S.pageHud.foes.ent.word._text') === 'Attack' && J('S.pageHud.foes.ent.el._ph.display') === '' && J('S.pageHud.fleet.ent.el._ph.display') === 'none');
g.run(`C.tgt = ''; campPageHudSync(S, 29000);`);
check('10 the hostile let go (nothing picked): the hint is gone from the panel', J('campPageModel(C).foes.enter') === null && J('S.pageHud.foes.ent.el._ph.display') === 'none');
g.run(`campFriJump(C, 1, 'key'); campPageHudSync(S, 30000);`);
const en2 = J('campPageModel(C).friends.enter');
check('10 a friendly picked (E then 1): its ring is outlined and the Enter chip with Guard sits at the end of the fleet row (it stays after the pick closes), and the hostiles panel has none', en2 && en2.word === 'Guard' && en2.key === J(`campCornerCap('order')`) && J('S.pageHud.fleet.ent.word._text') === 'Guard' && J('S.pageHud.fleet.ent.el._ph.display') === '' && J('S.pageHud.fleet.ships.filter(g => /pick/.test(g.el._cls)).length') === 1 && J('campPageModel(C).foes.enter') === null);
check('10 the chip is the key table\'s: Enter moved there moves the chip', (g.run(`window.__k = CAMP_KEYS.order.k; CAMP_KEYS.order.k = 'Z';`), J('campPageModel(C).friends.enter.key')) === 'Z' && (g.run(`CAMP_KEYS.order.k = __k;`), J('campPageModel(C).friends.enter.key')) === J(`campCornerCap('order')`));
const pj = src('src/camppagehud.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('10 the word and the chip are not written in the HUD: the verb is what campSelOrder says (a dry run, no order is given), the words are text keys', /campSelOrder\(C, 'engage', 'key', true\)/.test(pj) && !/['"](Attack|Guard|Enter)['"]/.test(pj) && J(`uiText('camp.corner.enter.attack')`) === 'Attack' && J(`uiText('camp.corner.enter.guard')`) === 'Guard');
// the canvas box of the friendlies
g.run(`CAMP.flags.pagehud = false; campCornerKey(C, 'KeyE'); window.__off = campCornerNow(C, 'friendlies');`);
const offBox = J('__off.open'), offItems = J('__off.items.length');
g.run(`CAMP.flags.pagehud = true; window.__on = campCornerNow(C, 'friendlies'); window.__ow = (campCornerKey(C, 'KeyW'), campCornerNow(C, 'fleet'));`);
check('4 the canvas friend details box (the ship\'s picture) is hidden while the page HUD is on (the rings replace it), drawn as it was with the switch off; the W box is hidden too (card space-game-page-hud-canvas-leftovers) and so is the hostiles\' (card space-game-page-hud-target-details: its details are in the page panel)', offBox > 0 && offItems > 0 && J('__on.open') === 0 && J('__on.items.length') === 0 && J('__ow.open') === 0 && J('__ow.items.length') === 0 && J('campCornerBoxHidden(campCornerDef("friendlies"))') === true && J('campCornerBoxHidden(campCornerDef("fleet"))') === true && J('campCornerBoxHidden(campCornerDef("hostiles"))') === true);
g.run(`CAMP.flags.pagehud = false; C.fsel = ''; C.tgt = ''; CAMP.flags.pagedigit = true;`);
check('the canvas HUD is as it was with the switch off: no page HUD element, the corners show their rows again', J('(() => { campPageHudSync(S, 40000); return !S.pageHud && campCornerNow(C, "fleet").rowHidden === false; })()') === true);

console.log('L. the canvas leftovers (card space-game-page-hud-canvas-leftovers)');
g.run(`CAMP.flags.pagehud = true; CAMP.flags.pagedigit = true; __out(); C.ships = C.ships.filter(u => u.team !== 'alien'); C.fsel = ''; C.tgt = ''; window.PL = campPanelNew(); campTcornerLook(PL, 0); window.RL = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 200); campTgtNearest(C); campPanelKey(PL, C, 'KeyW', 100); campCornerKey(C, 'KeyW'); campTcornerLook(PL, 100);`);
check('L W is open with the page HUD on: the canvas W box draws nothing (its rows were the pilots\' digits, names and hull bars), and the page rings of the pilots are grown (digit, name, ring share) instead', J('campCornerPanelId()') === 'fleet' && J('campCornerNow(C, "fleet").open') === 0 && J('campCornerNow(C, "fleet").items.length') === 0 && J('campPageModel(C).pilots.open') === true && J('campPageModel(C).pilots.items.map(x => x.digit + " " + x.name).join()') === '1 Wedge,2 Kara,3 Apollo' && J('campPageModel(C).pilots.items.every(x => x.frac > 0 && x.color)') === true);
check('L the canvas box of the HOSTILES is hidden too (card space-game-page-hud-target-details moved the picked ship\'s hull, shield and what it does into the page hostiles panel, section M; canvas-leftovers had kept it until then)', J('campCornerNow(C, "hostiles").open') === 0 && J('campCornerBoxHidden(campCornerDef("hostiles"))') === true && J('campPageModel(C).foes.target !== null && campPageModel(C).foes.target.hull.word === "Hull"') === true);
check('L the hide list has the boxes: the friendlies\', the W pick\'s and the hostiles\' (box:friendlies, box:fleet, box:hostiles)', J('CAMP_PAGEHUD.hides.filter(x => /^box:/.test(x)).join()') === 'box:friendlies,box:fleet,box:hostiles');
g.run(`CAMP.flags.pagehud = false; campCornerKey(C, 'KeyW');`);
check('L the switch off: the canvas W box is drawn as it was (three rows), the hostiles\' too', J('campCornerNow(C, "fleet").open') > 0 && J('campCornerNow(C, "fleet").items.length') === 3 && J('campCornerNow(C, "hostiles").open') > 0);
g.run(`CAMP.flags.pagehud = true; campPanelClose(PL); campCornerShut(C, 'fleet'); campCornerKey(C, 'KeyE');`);
check('L the W box\'s room is not given to anything else: the friendlies\' box stays hidden, the FLEET row (title, chips, the pilots\' line) is hidden by the page HUD as before', J('campCornerNow(C, "friendlies").open') === 0 && J('campCornerNow(C, "fleet").rowHidden') === true);
g.run(`CAMP.flags.pagehud = false; C.tgt = ''; C.fsel = '';`);

console.log('J. a full card hides the panels (card space-game-page-hud-hide-on-cards)');
g.run(`
  window.__sceneH = () => { const h = {}; return Object.assign(__scene(), { events: { once() {}, on(n, f) { (h[n] = h[n] || []).push(f); }, emit(n) { (h[n] || []).forEach(f => f()); } } }); };
  CAMP.flags.pagehud = true; CAMP.flags.pagedigit = true; __out(); window.SC = __sceneH(); window.__r0 = campPageHudSync(SC, 0); window.__r1 = campPageHudSync(SC, 200);
`);
check('J in the battle the panels are up and shown (nothing hidden)', J('__r0') === true && J('__r1') === true && J('SC.pageHud.root.style.display || ""') === '' && J('campPageHudCovered(SC)') === false);
g.run(`SC.mode = 'pause'; window.__rp = campPageHudSync(SC, 400);`);
check('J the pause card (the mode pause): the panels are hidden, not taken away (built once, kept)', J('__rp') === false && J('SC.pageHud.root.style.display') === 'none' && J('SC.pageHud !== null') === true);
g.run(`SC.mode = 'play'; window.__rb = campPageHudSync(SC, 600);`);
check('J the card closes: the panels come back as they were (same elements), shown', J('__rb') === true && J('SC.pageHud.root.style.display') === '');
g.run(`SC.mode = 'play'; SC.ck = { open: true, objs: [] }; window.__rh = campPageHudSync(SC, 800);`);
check('J the H page, open from the battle: hidden', J('__rh') === false && J('SC.pageHud.root.style.display') === 'none' && J('campPageHudCovered(SC)') === true);
g.run(`SC.ck = null; campPageHudSync(SC, 1000);`);
check('J the H page closes: shown again', J('SC.pageHud.root.style.display') === '' && J('campPageHudCovered(SC)') === false);
g.run(`SC.events.emit('pause'); window.__held = SC.pageHudHeld;`);
check('J Settings (or the ready room) pauses the whole scene, so no frame runs: the scene\'s pause event hides the panels at once', J('__held') === true && J('SC.pageHud.root.style.display') === 'none' && J('campPageHudCovered(SC)') === true);
g.run(`window.__rs = campPageHudSync(SC, 1200);`);
check('J a frame that still comes while it is held does not show them', J('__rs') === false && J('SC.pageHud.root.style.display') === 'none');
g.run(`SC.events.emit('resume'); window.__rr = campPageHudSync(SC, 1400);`);
check('J the scene resumes: the first frame after shows them again, same elements', J('__rr') === true && J('SC.pageHud.root.style.display') === '' && J('SC.pageHudHeld') === false);
g.run(`SC.events.emit('pause'); campPageHudDrop(SC);`);
check('J a drop (the scene ends while it is held) clears the hold: the next battle is not hidden by it', J('SC.pageHudHeld') === false && J('SC.pageHud') === null);
g.run(`window.S7 = __sceneH(); campPageHudSync(S7, 0); S7.mode = 'end'; window.__re = campPageHudSync(S7, 200);`);
check('J the end card (and every result card) takes the panels away, as it did: the mode is not the battle\'s', J('__re') === false && J('S7.pageHud') === null);
check('J every card has the screen to itself: the won, lost, debrief, refit, pick, intro and brief cards and the ending take the panels away at the next frame (the sync has no early return in the scene\'s update), the battle and the pause card are the only modes that keep them', ['won', 'lost', 'debrief', 'refit', 'pick', 'intro', 'brief', 'end'].every(m => (g.run(`window.SM = __sceneH(); campPageHudSync(SM, 0); SM.mode = ${JSON.stringify(m)}; window.__rm = campPageHudSync(SM, 200);`), J('__rm') === false && J('SM.pageHud') === null)));
const upd = src('src/campaignscene.js').split('\n').slice(src('src/campaignscene.js').split('\n').findIndex(l => /^  update\(time, dt\) \{/.test(l))).join('\n'), body = upd.slice(0, upd.indexOf('campPageHudSync(this'));
check('J the sync is called every frame of the scene, in every mode: no return in the update before it', /campPageHudSync\(this/.test(upd) && !/\breturn\b/.test(body));
g.run(`CAMP.flags.pagehud = false; window.S8 = __sceneH(); S8.mode = 'pause'; S8.events.emit('pause'); window.__rf = campPageHudSync(S8, 0);`);
check('J the switch off: unchanged, nothing is made', J('__rf') === false && !J('S8.pageHud'));
g.run(`CAMP.flags.pagehud = true; window.S9 = __sceneH(); campPageHudSync(S9, 0); S9.mode = 'pause'; campPageHudSync(S9, 200); S9.mode = 'play'; campPageHudSync(S9, 400); campPageHudDrop(S9); campPageHudSync(S9, 600); window.__ev = S9.pageHudEv;`);
check('J the pause and resume listeners are put on once for a scene, however many times the panels are built and dropped', J('__ev') === true);
g.run(`CAMP.flags.pagehud = false;`);
const scene2 = src('src/campaignscene.js'), pj2 = src('src/camppagehud.js');
check('J the scene is not touched: Phaser\'s own pause and resume events do it (a stand-in scene without events is hidden by the mode and the H page alone)', !/campPageHudCover/.test(scene2) && /s\.events\.on\('pause'/.test(pj2) && /s\.events\.on\('resume'/.test(pj2));
console.log('K. the first-minute chips of mission 1.1 (card space-game-page-hud-first-minute-chips)');
g.run(`CAMP.flags.pagehud = true; CAMP.flags.hints = true; window.__m = (level, mission, t) => { const C = window.C = campNew(level, [], { seed: 5, mission }); C.god = true; C.t = t; return C; };`);
const fm = (level, mission, t) => J(`campPageHudFirst(__m(${level}, ${mission}, ${t}))`);
const k0 = fm(1, 0, 0);
check('K mission 1.1 at its start: three chips in the key table\'s order (fly, fire, missile), each with its cap from the table and a word that is a text key', k0 && k0.items.map(x => x.id).join() === 'fly,fire,missile' && k0.items.every(x => x.key === J(`campCornerCap(${JSON.stringify(x.id)})`) && x.word === J(`uiText('camp.corner.chip.' + ${JSON.stringify(x.id)})`) && x.word.length > 0 && x.word !== 'camp.corner.chip.' + x.id) && k0.a === 1, JSON.stringify(k0));
check('K the caps are Arrows, Space and M, the words Fly, Fire and Missile (today\'s table and texts)', k0.items.map(x => x.key + ' ' + x.word).join(' | ') === 'Arrows Fly | Space Fire | M Missile', JSON.stringify(k0.items));
check('K it stays for 60 s of the mission clock (59.9 s still shows), fades over the last 3 s, and is gone at 60 s', fm(1, 0, 59900) !== null && fm(1, 0, 56000).a === 1 && fm(1, 0, 58500).a === 0.5 && fm(1, 0, 59000).a < 0.34 && fm(1, 0, 60000) === null && fm(1, 0, 90000) === null && fm(1, 0, 400000) === null);
check('K mission 1.1 only: not 1.2, not 1.3, not level 2', fm(1, 1, 0) === null && fm(1, 2, 0) === null && fm(2, 0, 0) === null);
check('K not when the hints are switched off (the tuning panel), not once the battle has a result', (g.run(`CAMP.flags.hints = false;`), fm(1, 0, 0)) === null && (g.run(`CAMP.flags.hints = true;`), J(`(() => { const C = __m(1, 0, 1000); C.result = { won: true }; return campPageHudFirst(C); })()`)) === null);
check('K the model carries it as `first` (null when it is not the time)', J(`campPageModel(__m(1, 0, 1000)).first.items.length`) === 3 && J(`campPageModel(__m(1, 0, 61000)).first`) === null && J(`campPageModel(__m(1, 1, 1000)).first`) === null);
check('K a key moved in the table moves the chip; a key with no cap leaves its chip out', (g.run(`window.__f = CAMP_KEYS.fire.k; CAMP_KEYS.fire.k = 'Y';`), J(`campPageHudFirst(__m(1, 0, 0)).items[1].key`)) === 'Y' && (g.run(`CAMP_KEYS.fire.k = '';`), J(`campPageHudFirst(__m(1, 0, 0)).items.map(x => x.id).join()`)) === 'fly,missile' && (g.run(`CAMP_KEYS.fire.k = __f;`), J(`campPageHudFirst(__m(1, 0, 0)).items.length`)) === 3);
g.run(`__m(1, 0, 1000); window.SK = __scene(); window.__rk = campPageHudSync(SK, 0);`);
const F1 = J(`(() => { const F = SK.pageHud.first; return { display: F.el.style.display || '', n: F.items.length, keys: F.items.map(x => x.key._text), words: F.items.map(x => x.word._text), op: F.el.style.opacity }; })()`);
check('K the view: the row is shown with three pairs, the caps and the words written, dim', J('__rk') === true && F1.display === '' && F1.n === 3 && F1.keys.join() === 'Arrows,Space,M' && F1.words.join() === 'Fly,Fire,Missile' && +F1.op > 0.7 && +F1.op < 0.73, JSON.stringify(F1));
g.run(`window.__w0 = __writes; campPageHudSync(SK, 200);`);
check('K the same frame again writes nothing (only what changed)', J('__writes') === J('__w0'));
g.run(`C.t = 61000; campPageHudSync(SK, 400);`);
check('K after the minute the row is gone for the rest of the mission (display none), the pairs kept', J('SK.pageHud.first.el.style.display') === 'none' && J('SK.pageHud.first.items.length') === 3);
g.run(`__m(1, 1, 1000); window.SL = __scene(); campPageHudSync(SL, 0);`);
check('K mission 1.2: the row is built hidden and never shows', J('SL.pageHud.first.el.style.display') === 'none' && J('SL.pageHud.first.items.length') === 0);
g.run(`CAMP.flags.pagehud = false; __m(1, 0, 1000); window.SM2 = __scene(); window.__ro = campPageHudSync(SM2, 0);`);
check('K the page HUD off: unchanged, no element', J('__ro') === false && !J('SM2.pageHud'));
const cssK = src('src/camppagehud.css'), pjK = src('src/camppagehud.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('K the words and the caps are not written in the HUD code (the key table and the text keys), and the style is plain: dim, no image, no web font', !/['"](Arrows|Space|Fly|Fire|Missile)['"]/.test(pjK) && /\.ph-first \{[^}]*opacity: \.72/.test(cssK) && !/url\(|@font-face/.test(cssK) && /camp\.corner\.chip\.fly\b/.test(src('content/text/campcorner.md')) && /camp\.corner\.chip\.missile\b/.test(src('src/contenttables.js')));
g.run(`CAMP.flags.pagehud = false;`);

console.log('M. the picked target\'s details in the page hostiles panel (card space-game-page-hud-target-details)');
g.run(`CAMP.flags.pagehud = true; __out(); C.ships = C.ships.filter(u => u.team !== 'alien'); C.fsel = ''; C.tgt = ''; window.PM = campPanelNew(); campTcornerLook(PM, 0); window.RM = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y + 200); campTgtNearest(C); window.SMT = __scene(); campPageHudSync(SMT, 0);`);
const tg0 = J('campPageModel(C).foes.target');
check('M a hostile picked: the foes panel carries its hull (a meter with the word Hull, no percentage at full), no shield (the words say so) and what it is doing, first letter up', tg0 && tg0.hull.word === 'Hull' && tg0.hull.frac === 1 && tg0.hull.show === false && tg0.shield === null && tg0.noshield === 'no shield' && /^Attacking /.test(tg0.doing), JSON.stringify(tg0));
g.run(`RM.hp = RM.maxHp * 0.5;`);
const tg1 = J('campPageModel(C).foes.target.hull');
check('M the hull share is the ship\'s (half: 50, shown below 100, as the cruiser\'s meters do)', tg1.frac > 0.49 && tg1.frac < 0.51 && tg1.pct === 50 && tg1.show === true, JSON.stringify(tg1));
g.run(`RM.rival = { sh: 30, shMax: 60, ph: 'stalk' };`);
const tg2 = J('campPageModel(C).foes.target');
check('M a ship that has a shield (the rival): a Shields meter in the same look, and the doing is what the canvas box said', tg2.shield && tg2.shield.word === 'Shields' && tg2.shield.pct === 50 && tg2.noshield === '' && tg2.doing === J('(() => { const d = campTdispDoing(C, RM); return d.charAt(0).toUpperCase() + d.slice(1); })()'), JSON.stringify(tg2));
g.run(`delete RM.rival; campPageHudSync(SMT, 400);`);
const vw = J(`(() => { const T = SMT.pageHud.foes.tg; return { show: T.el.style.display || '', hull: T.hull.word._text + '|' + T.hull.pct._text, shieldHidden: T.shield.el.style.display, none: T.none.style.display + '|' + T.none._text, act: T.act._text }; })()`);
check('M the view: the target block shows its hull word and percentage, the shield meter is hidden, the "no shield" word and the action are written', vw.show === '' && vw.hull === 'Hull|50%' && vw.shieldHidden === 'none' && vw.none === '|no shield' && /^Attacking /.test(vw.act), JSON.stringify(vw));
g.run(`window.__w0 = __writes; campPageHudSync(SMT, 600);`);
check('M the same frame again writes nothing (only what changed, at most 10 a second)', J('__writes') === J('__w0'));
check('M the Enter chip with Attack is as it was', J('campPageModel(C).foes.enter.word') === 'Attack' && J('SMT.pageHud.foes.ent.word._text') === 'Attack');
g.run(`C.tgt = ''; campPageHudSync(SMT, 800);`);
check('M nothing picked: the panel is its short form (the target block hidden, the model has none)', J('campPageModel(C).foes.target') === null && J('SMT.pageHud.foes.tg.el.style.display') === 'none');
g.run(`campTgtNearest(C); RM.hp = 0;`);
check('M a target that is gone has no details', J('campPageModel(C).foes === null || campPageModel(C).foes.target === null') === true);
g.run(`RM.hp = RM.maxHp; window.__sg = campSightGroups; campSightGroups = () => []; campTgtNearest(C);`);
check('M a picked ship that nothing groups (always seen) is its own group: the panel is there with its details', J('campPageModel(C).foes !== null && campPageModel(C).foes.target !== null && campPageModel(C).foes.target.id === RM.id'));
g.run(`campSightGroups = __sg; C.tgt = '';`);
g.run(`CAMP.flags.pagehud = false; campCornerKey(C, 'BracketRight'); campTgtNearest(C); window.__offH = campCornerNow(C, 'hostiles').open; CAMP.flags.pagehud = true; window.__onH = campCornerNow(C, 'hostiles').open;`);
check('M the canvas hostile box: drawn as it was with the switch off, hidden while the page HUD is on (its details are in the panel)', J('__offH') > 0 && J('__onH') === 0 && J('CAMP_PAGEHUD.hides.indexOf("box:hostiles")') >= 0);
check('M the cruiser\'s own two meters are as they were (the same word, percentage and fill as the target\'s: one helper)', J('campPageModel(C).ship.shield.word') === 'Shields' && J('campPageModel(C).ship.hull.word') === 'Hull' && /campPageHudPaintMeter\(S\[id\], M\.ship\[id\]\)/.test(src('src/camppagehud.js')) && /campPageHudPaintMeter\(T\.hull, tm\.hull\)/.test(src('src/camppagehud.js')));
const cssM = src('src/camppagehud.css');
check('M the style: the target block is inside the foes panel, plain (no image, no web font, sizes in em)', /\.ph-tg \{/.test(cssM) && /\.ph-act \{/.test(cssM) && !/url\(|@font-face/.test(cssM));
g.run(`CAMP.flags.pagehud = false;`);

console.log('N. the missile build shows its progress (card space-game-page-hud-reload-progress)');
g.run(`CAMP.flags.pagehud = true; __out(); C.ships = C.ships.filter(u => u.team !== 'alien'); C.ore = 400; C.missiles = 3; C.queued = 0; C.reloadAt = 0; window.SN = __scene(); campPageHudSync(SN, 0);`);
const mk0 = J('campPageModel(C).stock.missiles');
check('N at rest (none building, none queued): progress 0, no queue; the pips are as they were (three on, no pip building)', mk0.progress === 0 && mk0.queued === 0 && mk0.building === false && J(`SN.pageHud.stock.pips.map(p => p._cls).join()`).indexOf('build') < 0 && J('SN.pageHud.stock.queue.style.display') === 'none' && J('SN.pageHud.stock.queue._text') === '');
g.run(`window.__r1 = campReloadDo(C); window.__r2 = campReloadDo(C); window.__r3 = campReloadDo(C); campPageHudSync(SN, 200);`);
const mk1 = J('campPageModel(C).stock.missiles');
check('N three presses of R: the first build starts at once, two wait behind it; the model says building, a progress near 0 and queued 2 (R itself is as it was: the same words and the same ore)', mk1.building === true && mk1.progress >= 0 && mk1.progress < 0.05 && mk1.queued === 2 && J('__r1.ok') === true && J('__r3.ok') === true && J('C.ore') === 380, JSON.stringify(mk1));
const v1 = J(`(() => { const T = SN.pageHud.stock; return { cls: T.pips.map(p => p._cls), q: T.queue._text, qd: T.queue.style.display }; })()`);
check('N the view: the next empty pip (the fourth) is the one building, the others solid or empty; "+2" is written to the right of the pips', v1.cls.map(c => /build/.test(c) ? 'b' : /on/.test(c) ? 'o' : '.').join('') === 'ooob..' && v1.q === '+2' && v1.qd === '', JSON.stringify(v1));
g.run(`C.reloadAt = C.t + campReload(C) * 0.5; campPageHudSync(SN, 400);`);
check('N halfway through the build time (campReload, which is CAMP.missile.reload: nothing typed in the HUD): the progress is half and the pip\'s fill is 50%', Math.abs(J('campPageModel(C).stock.missiles.progress') - 0.5) < 0.01 && J('SN.pageHud.stock.pips[3].el ? 1 : 0') >= 0 && J('SN.pageHud.stock.pips[3].style.getPropertyValue ? SN.pageHud.stock.pips[3].style.getPropertyValue("--p") : SN.pageHud.stock.pips[3].style["--p"]') === '50%');
g.run(`window.__t0 = campPageModel(C).stock.missiles.progress; C.t += campReload(C) * 0.3; window.__t1 = campPageModel(C).stock.missiles.progress;`);
check('N the fill only grows as the build goes on, and the percentage is whole (the pip\'s write changes about once for each percent)', J('__t1') > J('__t0') && Math.abs(J('__t1') - 0.8) < 0.01);
g.run(`C.t = C.reloadAt; campMissileStep(C); campPageHudSync(SN, 600);`);
const mk2 = J('campPageModel(C).stock.missiles'), v2 = J(`(() => { const T = SN.pageHud.stock; return { cls: T.pips.map(p => p._cls), q: T.queue._text }; })()`);
check('N the build lands: the fourth pip is solid, the next build has started (the next pip is building from 0), and the +N counted down to +1', mk2.n === 4 && mk2.queued === 1 && mk2.building === true && mk2.progress < 0.05 && v2.cls.map(c => /build/.test(c) ? 'b' : /on/.test(c) ? 'o' : '.').join('') === 'oooob.' && v2.q === '+1', JSON.stringify([mk2, v2]));
g.run(`C.t = C.reloadAt; campMissileStep(C); C.t = C.reloadAt; campMissileStep(C); campPageHudSync(SN, 800);`);
const mk3 = J('campPageModel(C).stock.missiles'), v3 = J(`(() => { const T = SN.pageHud.stock; return { cls: T.pips.map(p => p._cls), q: T.queue._text, qd: T.queue.style.display }; })()`);
check('N the queue is done: the rack is full (six solid), no pip is building, and +N is hidden at zero', mk3.n === 6 && mk3.queued === 0 && mk3.building === false && mk3.progress === 0 && v3.cls.every(c => /on/.test(c) && !/build/.test(c)) && v3.q === '' && v3.qd === 'none', JSON.stringify([mk3, v3]));
g.run(`window.__w0 = __writes; campPageHudSync(SN, 850);`);
check('N the same frame again writes nothing (only what changed, at most 10 a second)', J('__writes') === J('__w0'));
g.run(`CAMP.flags.pagehud = false; C.missiles = 3; C.queued = 0; C.reloadAt = 0; window.__rN = campPageHudSync(SN, 2000);`);
check('N the page HUD off: no element, the canvas status line (+n on its missiles line) is the rule it was', J('__rN') === false && !J('SN.pageHud') && J('campCruiserMissileLine(campCruiserStatus(C))') === 'MISSILES  3/6');
const cssN = src('src/camppagehud.css'), pjN = src('src/camppagehud.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('N the style and the script: the build pip is a plain gradient on --p (no image, no web font), the time is read from campReload (no number typed), no new text key', /\.ph-pip\.build \{[^}]*linear-gradient[^}]*var\(--p/.test(cssN) && /\.ph-q \{/.test(cssN) && !/url\(|@font-face/.test(cssN) && /campReload\(C\)/.test(pjN) && !/\b(10000|15000)\b/.test(pjN));
g.run(`CAMP.flags.pagehud = false;`);

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
