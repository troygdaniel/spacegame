// smoke: the dock's ready room (plain Node, no Chrome): the rows a dock opens the room with, their keys and pages, the Fabricator at a refit, and the Campaign scene's side of docking
// Card space-game-campaign-outposts (src/campdock.js registers the rows in the registries of src/camphub.js and src/camphubscene.js; src/campaignscene.js openDock and undock; tests/campoutpost.mjs has the rules).
//   A. the rows: build, repair, refit (upgrade), board, undock, with their notes and the dock's own foot lines
//   B. the keys: F and E build through the order (so the rules are the order's), R mends the hull, U fits the Fabricator (the battle and the progress both have it), Backspace and the other keys are not the dock's
//   C. the room on a stand-in scene: its title, the pages, the pilot's stops, the way out (onLaunch, onLeave) and that nothing else starts
//   D. the Fabricator at the between-missions refit: U buys it with the progress's ore, once
//   E. the Campaign scene: the event "docked" opens the room over the paused battle; undocking frees the carrier and resumes; the map's Tab does nothing while docked
// Run: node tests/campdock.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { BRIEF_STAND } from './briefstand.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run(BRIEF_STAND);
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const O = J('CAMP.outpost');

g.run(`
  window.N = (lv, techs) => { window.C = campNew(lv, techs || [], { seed: 1 }); C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__rec = { go: [], sfx: [], texts: [], tweens: [], door: 0, out: [] };
  go = (s, key, data) => { __rec.go.push({ key, data }); }; sfx = name => { __rec.sfx.push(name); };
  interiorBuild = s => { s.in = { door: {} }; }; interiorTick = () => {}; interiorLaunch = s => { __rec.door++; };
  campShipTexture = () => 'camp-cruiser'; label = (s, x, y, t) => ({ t, x, y });
  window.__obj = () => { const o = { x: 0, y: 0, t: '', color: '', vis: true, rot: 0, handlers: {}, setText(v) { o.t = v; return o; }, setColor(c) { o.color = c; return o; }, setVisible(v) { o.vis = v; return o; }, setY(v) { o.y = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setRotation(r) { o.rot = r; return o; },
    setBackgroundColor() { return o; }, setAngle() { return o; }, setScale() { return o; }, setDepth() { return o; }, setOrigin() { return o; }, setPadding() { return o; }, setStrokeStyle() { return o; }, setInteractive() { return o; }, setAlpha() { return o; }, on(ev, fn) { o.handlers[ev] = fn; return o; }, destroy() {} }; return o; };
  window.__room = d => {
    __rec.go.length = 0; __rec.sfx.length = 0; __rec.texts.length = 0; __rec.tweens.length = 0; __rec.door = 0; __rec.out.length = 0;
    const s = Object.create(CampHub.prototype);
    s.add = { rectangle: (x, y) => { const o = __obj(); o.x = x; o.y = y; return o; }, text: (x, y, t) => { const o = __obj(); o.x = x; o.y = y; o.t = t; __rec.texts.push(o); return o; }, image: (x, y, k) => { const o = __obj(); o.x = x; o.y = y; return o; } };
    s.cameras = { main: { fadeIn() {}, fadeOut() {} } }; s.tweens = { add: cfg => { __rec.tweens.push(cfg); return { stop() {} }; } }; s.time = { now: 1000 };
    s.input = { keyboard: { on: (e, fn) => { s.kb = fn; }, off() {} } }; s.events = { once() {} };
    if (window.__briefStand) __briefStand(s);
    s.init(d || {}); s.create(); return s;
  };
  window.__shown = s => __rec.texts.filter(o => o.vis && o.t !== '').map(o => o.t);
  window.__key = (s, code) => s.onKey({ code, repeat: false });
  localStorage.removeItem(CAMP.store);
`);
const shown = (v = 'S') => J(`__shown(${v})`);
const has = (re, v) => shown(v).some(t => re.test(t));

// ---- A. the rows ----
check('a dock\'s room has five rows in this order: build, repair, refit, the mission board, undock', J('CAMP_DOCK.rows').join() === 'build,repair,upgrade,board,undock');
g.run(`N('home'); C.ore = 100; C.docked = 'luna'; var P = campProgressNew(); var ctx = { dock: 'luna', camp: C, P, station: { name: 'Lunar base' } };`);
const rows = J('campHubRows(P, CAMP_DOCK.rows, ctx)');
check('every row of a dock is a known row with its words and a live note: BUILD (the ore), REPAIR (the hull in percent), REFIT (the Fabricator offered), MISSIONS (flown), UNDOCK (the station)', rows.length === 5 && rows.map(r => r.name).join() === 'BUILD,REPAIR,REFIT,MISSIONS,UNDOCK' && rows[0].note === 'ore 100' && rows[1].note === 'hull 100 percent' && rows[2].note === '120 ore for the Fabricator' && rows[3].note === '0 of 9 flown' && rows[4].note === 'Lunar base', JSON.stringify(rows));
check('a row\'s note without the battle (the room opened as the hall) is empty, not an error', J(`campHubRows(P, ['build', 'repair', 'upgrade'])`).every(r => typeof r.note === 'string'));
check('the foot line: in a dock a row says what its Enter really does (the repair bay, the refit, the board, the undock row, UNDOCK); in the hall the old words', J(`['build', 'repair', 'upgrade', 'board', 'undock'].map(r => campHubFoot(r, ctx))`).join('|') === 'Enter  the repair bay|Enter  the refit|Enter  the mission board|Enter  to the undock row|Enter  UNDOCK' && J(`campHubFoot('board')`) === 'Enter  the briefing' && J(`campHubFoot('launch', ctx)`) === 'Enter  LAUNCH');
check('L is the way out of a dock (UNDOCK is the row whose Enter is an action) and of the hall; with neither row L does nothing', (() => { g.run(`var H1 = campHubNew(P, { rows: CAMP_DOCK.rows }); var H2 = campHubNew(P, { rows: ['build', 'repair'] });`); return J(`campHubKey(H1, P, 'KeyL', ctx).action`) === 'undock' && !J(`campHubKey(H2, P, 'KeyL', ctx).used`); })());
check('Enter goes on through the rows and on UNDOCK it undocks; Esc and T leave (the dock\'s onLeave)', (() => { g.run(`H1.row = 0`); const seen = []; for (let i = 0; i < 4; i++) { J(`campHubKey(H1, P, 'Enter', ctx)`); seen.push(J('CAMP_DOCK.rows[H1.row]')); } return seen.join() === 'repair,upgrade,board,undock' && J(`campHubKey(H1, P, 'Enter', ctx).action`) === 'undock' && J(`campHubKey(H1, P, 'Escape', ctx).action`) === 'title'; })());

// ---- B. the keys ----
g.run(`N('home'); C.ore = 100; C.docked = 'luna'; P = campProgressNew(); P.ore = 100; ctx = { dock: 'luna', camp: C, P, station: { name: 'Lunar base' } }; H1 = campHubNew(P, { rows: CAMP_DOCK.rows, at: 'build' });`);
const K = c => J(`campHubKey(H1, P, ${JSON.stringify(c)}, ctx)`);
const at = id => g.run(`H1.row = CAMP_DOCK.rows.indexOf('${id}')`);
check('F on BUILD builds a fighter through the order: the answer is the order\'s words, the ore and the queue are the battle\'s', (() => { const r = K('KeyF'); return r.used && r.ok && r.say.text === 'Building 1 fighter.' && J('C.ore') === 75 && J('C.build.queue.length') === 1; })());
check('E builds an escort; with too little ore the order\'s own refusal is the answer and nothing is spent', (() => { const a = K('KeyE'); g.run('C.ore = 10'); const b = K('KeyE'); return a.ok && J('C.build.queue.length') === 2 && !b.ok && /^Not enough ore: 45 needed, 10 in the store\.$/.test(b.say.text) && J('C.ore') === 10; })());
check('the rules are the order\'s: the same keys in a room that is not docked are refused with the dock words (the room is not what lets you build, the dock is)', (() => { g.run('C.docked = ""; C.ore = 100'); const r = K('KeyF'); g.run(`C.docked = 'luna'`); return !r.ok && r.say.text === 'Dock at an outpost to build.' && J('C.ore') === 100; })());
g.run(`C.ore = 100; C.carrier.hp = C.carrier.maxHp * 0.5;`); at('repair');
check('R on REPAIR mends the hull for ore (the order): the hull is whole, ore went, the answer says points and ore; F there is not the dock\'s', (() => { const f = K('KeyF'); const r = K('KeyR'); return !f.used && r.used && r.ok && /^Hull mended: \d+ points for \d+ ore\.$/.test(r.say.text) && J('C.carrier.hp') === J('C.carrier.maxHp') && J('C.ore') < 100; })());
check('a sound hull: R says so', K('KeyR').say.text === 'The hull is sound, pilot.');
g.run(`C.ore = 200; P.techs = []; C.techs = [];`); at('upgrade');
check('U on REFIT fits the Fabricator: the cost out of the battle\'s ore, the tech in the battle (it builds anywhere now) and in the progress (it keeps), flagged to be saved', (() => { const r = K('KeyU'); return r.used && r.ok && r.changed && r.say.key === 'camp.hub.upgrade.bought' && J('C.ore') === 200 - O.fabricator && J('campHas(C, "fabricator")') && J('P.techs.includes("fabricator")') && (g.run('C.docked = ""'), J('campCanBuild(C)') === true); })());
g.run(`C.docked = 'luna'`);
check('a second U says there is nothing to do (one Fabricator); without the ore it says what is needed and fits nothing', (() => { const a = K('KeyU'); g.run('N("home"); C.docked = "luna"; C.ore = 50; P = campProgressNew(); ctx = { dock: "luna", camp: C, P }; H1 = campHubNew(P, { rows: CAMP_DOCK.rows, at: "upgrade" })'); const b = K('KeyU'); return !a.ok && !a.changed && !b.ok && b.say.key === 'camp.hub.upgrade.no' && b.say.vars.need === O.fabricator && b.say.vars.have === 50 && J('P.techs.length') === 0 && J('C.ore') === 50; })());
check('keys that are not the row\'s: F on REFIT, U on BUILD, R on UNDOCK do nothing', (() => { at('upgrade'); const a = K('KeyF'); at('build'); const b = K('KeyU'); at('undock'); const c = K('KeyR'); return !a.used && !b.used && !c.used; })());

// ---- C. the room on a stand-in scene ----
g.run(`N('home'); C.ore = 100; C.docked = 'luna'; window.PR = campProgressNew(); window.D = { dock: 'luna', camp: C, P: PR, rows: CAMP_DOCK.rows.slice(), at: 'build', station: { name: 'Lunar base' }, onLaunch: s => __rec.out.push('undock'), onLeave: s => __rec.out.push('leave') }; var S = __room(D);`);
check('the room made its own state before the hall is built: the walls list (the hall adds its props to it) and the answer slot', J('Array.isArray(S.walls) && S.msg === null'));
check('the room opens as a dock: "READY ROOM - LUNAR BASE", the five rows, BUILD chosen, the progress is the one handed in (not loaded again)', has(/^READY ROOM {2}- {2}LUNAR BASE$/) && ['BUILD', 'REPAIR', 'REFIT', 'MISSIONS', 'UNDOCK'].every(x => has(new RegExp('^' + x + '$'))) && J('S.hub.row') === 0 && J('S.P === PR') && J('S.rowT.length') === 5, shown().join(' | '));
check('the build page: the station, the ore, the wing (bay and out, and the yard), the keys and the prices, the foot of a dock', has(/^BUILD {2}- {2}LUNAR BASE$/) && has(/^Ore in the store: 100$/) && has(/^Wing: 6 fighters, 2 escorts \(bay and out\); 0 in the yard$/) && has(/^F {2}fighter 25 ore {5}E {2}escort 45 ore$/) && has(/^Enter {2}the repair bay$/), shown().join(' | '));
g.run(`__key(S, 'KeyF');`);
check('F in the room: a fighter is queued (the yard count follows), the order\'s words are on the page, a chime sounds', has(/^Building 1 fighter\.$/) && has(/in the yard$/) && has(/7 fighters/) === false && J('C.build.queue.length') === 1 && J('__rec.sfx').includes('chime') && has(/; 1 in the yard$/), shown().join(' | '));
g.run(`__key(S, 'Digit2');`);
check('2: the repair page and the pilot at the repair bay: the hull of the carrier, the cost of mending it or that it is sound', has(/^REPAIR$/) && has(/^Hull: \d+ of \d+$/) && has(/^The hull is sound\.$/) && J('__rec.tweens.pop().x') === 640);
g.run(`C.carrier.hp = 100; __key(S, 'Digit2');`);
check('with a hurt hull the page offers it with the price: "R  mend the hull: N ore"', has(/^R {2}mend the hull: \d+ ore$/), shown().join(' | '));
g.run(`__key(S, 'Digit3');`);
check('3: the refit page: the ore, the tech (none yet), and the Fabricator offered with its price', has(/^REFIT$/) && has(/^Tech: none yet\.$/) && has(/^U {2}Fabricator, 120 ore: build ships anywhere, not only docked$/), shown().join(' | '));
g.run(`C.ore = 150; __key(S, 'KeyU');`);
check('U there fits it: the page says so and the progress was told to save (the room saves it)', has(/^Fabricator fitted: this ship builds anywhere\.$/) && has(/^Tech: Fabricator$/) && J('PR.techs.includes("fabricator")') && JSON.parse(g.run('localStorage.getItem(CAMP.store)')).techs.includes('fabricator'), shown().join(' | '));
g.run(`__key(S, 'Digit4');`);
check('4: the mission board is the same page as in the hall (the progress\'s results)', has(/LEVEL 1/) && has(/\[>\] 1/), shown().join(' | '));
g.run(`__key(S, 'Digit5');`);
check('5: UNDOCK: the page says the battle goes on where it was left, the pilot is at the pad, the foot says UNDOCK', has(/^UNDOCK$/) && has(/^Docked at Lunar base\.$/) && has(/^Enter or L undocks\. The battle goes on where you left it\.$/) && has(/^Enter {2}UNDOCK$/) && J('S.player.x') === 1028 && J('S.player.y') === 394 && J('CAMP_HUBS.stops.undock.join()') === '1028,394'); // (the shipyard and the way out are both at the pad: a stand-in pilot does not walk, so it is there already)
g.run(`__key(S, 'Enter');`);
check('Enter on UNDOCK is the dock\'s onLaunch (the door rolls up), not the Campaign scene: nothing else starts', J('__rec.out').join() === 'undock' && J('__rec.door') === 1 && J('__rec.go.length') === 0);
g.run(`__rec.out.length = 0; __rec.door = 0; __key(S, 'KeyL'); __key(S, 'Escape'); __key(S, 'KeyT');`);
check('L undocks from any row, Esc and T are the dock\'s onLeave', J('__rec.out').join() === 'undock,leave,leave' && J('__rec.go.length') === 0);
check('a click on a row picks it, a second click on UNDOCK undocks', (() => { g.run(`var S2 = __room(D); S2.rowT[4].hit.handlers.pointerdown();`); const a = J('S2.hub.row') === 4 && J('__rec.out.length') === 0; g.run(`S2.rowT[4].hit.handlers.pointerdown();`); return a && J('__rec.out').join() === 'undock'; })());

// ---- D. the Fabricator at the between-missions refit ----
g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 1, techs: ['shield'], ore: 150, bonus: { fighters: 0, escorts: 0 }, results: {} })); var S3 = __room({}); __key(S3, 'Digit3');`);
check('the hall\'s refit page offers it (U, its price) and does not offer it twice', has(/^U {2}Fabricator, 120 ore: build ships anywhere, not only docked$/, 'S3'), shown('S3').join(' | '));
g.run(`__key(S3, 'KeyU');`);
check('U buys it with the progress\'s ore (150 - 120 = 30), once, and the save has it', (() => { const sv = JSON.parse(g.run('localStorage.getItem(CAMP.store)')); return sv.ore === 30 && sv.techs.includes('fabricator') && sv.techs.includes('shield') && has(/^Fabricator fitted: this ship builds anywhere\.$/, 'S3') && has(/^Fabricator fitted\. 30 ore left\.$/, 'S3'); })(), shown('S3').join(' | '));
g.run(`__key(S3, 'KeyU');`);
check('a second U buys nothing, and with too little ore: "Not enough ore for the Fabricator"', (() => { const sv = JSON.parse(g.run('localStorage.getItem(CAMP.store)')); g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 1, techs: [], ore: 50, bonus: { fighters: 0, escorts: 0 }, results: {} })); var S4 = __room({}); __key(S4, 'Digit3'); __key(S4, 'KeyU');`); return sv.ore === 30 && has(/^Not enough ore for the Fabricator: 120 needed, 50 in the store\.$/, 'S4') && JSON.parse(g.run('localStorage.getItem(CAMP.store)')).techs.length === 0; })());
check('the next battle starts with it: the progress\'s techs are the battle\'s, and then it builds anywhere', (() => { g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 1, techs: ['fabricator'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results: {} })); var PL = campProgressLoad(); var CB = campNew('home', PL.techs, { seed: 1 }); CB.ore = 100;`); return J('campHas(CB, "fabricator")') && J(`campOrder(CB, 'build', 'fighter').ok`); })());

// ---- E. the Campaign scene ----
g.run(`
  window.__camp = () => { const c = Object.create(Campaign.prototype); N('home'); c.camp = C; c.P = campProgressNew(); c.mp = null; c.pn = { open: 'ship' }; c.docked = false; c.mode = 'play'; c.leaving = false; c.panel = false; c.log = [];
    c.scene = { pause: () => c.log.push('pause'), resume: () => c.log.push('resume'), launch: (k, d) => { c.log.push('launch ' + k); c.launched = d; } }; return c; };
  window.toast = (s, msg) => { (window.__toasts = window.__toasts || []).push(msg); };
`);
g.run(`var SC = __camp(); SC.camp.docked = 'luna'; SC.onEvent({ type: 'docked', id: 'luna', name: 'Lunar base' });`);
check('the event "docked" opens the room over the paused battle: the scene is paused, then CampHub is launched with the dock\'s rows, the outpost\'s name, the battle and the scene\'s own progress', J('SC.log.join()') === 'pause,launch CampHub' && J('SC.docked') === true && J('SC.launched.dock') === 'luna' && J('SC.launched.rows.join()') === 'build,repair,upgrade,board,undock' && J('SC.launched.at') === 'build' && J('SC.launched.station.name') === 'Lunar base' && J('SC.launched.camp === SC.camp') && J('SC.launched.P === SC.P') && J('SC.pn.open') === '');
g.run(`SC.log.length = 0; SC.onEvent({ type: 'docked', id: 'luna', name: 'Lunar base' });`);
check('a second "docked" event while docked does nothing (the room is not opened twice); an outpost the level does not have does nothing', J('SC.log.length') === 0 && (g.run(`var SC2 = __camp(); SC2.onEvent({ type: 'docked', id: 'narnia' })`), J('SC2.log.length') === 0 && J('SC2.docked') === false));
g.run(`var hubStub = { scene: { stop: () => SC.log.push('hub stop') } }; window.__toasts = []; SC.launched.onLaunch(hubStub);`);
check('undocking (the room\'s onLaunch): the carrier is free, the room stops, the battle resumes, the ship says so', J('SC.camp.docked') === '' && J('SC.docked') === false && J('SC.log.join()') === 'hub stop,resume' && J('__toasts').includes('Undocked. Good hunting, pilot.') && J('SC.camp.events.some(e => e.type === "undocked")'));
g.run(`var SC3 = __camp(); SC3.camp.docked = 'luna'; SC3.onEvent({ type: 'docked', id: 'luna' }); SC3.log.length = 0; SC3.launched.onLeave({ scene: { stop: () => SC3.log.push('hub stop') } });`);
check('Esc and T in the room (onLeave) undock the same way', J('SC3.log.join()') === 'hub stop,resume' && J('SC3.docked') === false && J('SC3.camp.docked') === '');
check('while docked, Tab does not open the map over the paused scene (the map\'s window listener asks)', (() => { const a = src('src/campmapdraw.js'); return /!s\.panel && !s\.docked\) campMapOpen\(s\)/.test(a); })());
const sc = src('src/campaignscene.js');
check('docking is the SHIP panel\'s dock row, the fourth since card space-game-panel-keys-zxc moved Mine ore to FLEET (it runs the order "dock"; the panel keys are the table\'s), and the HUD line below the goal is the retreat or the dock hint', J("CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.n === 4).order") === 'dock' && /this\.hud\.post\.setText\(rt \? rt\.line/.test(sc) && /post: t\(24, \d+/.test(sc));
const dock = src('src/campdock.js').replace(/\/\/.*$/gm, '');
check('src/campdock.js is the registry half: it draws only through the scene\'s line() and touches nothing of the page or the clock', !/\b(document|window|localStorage|setTimeout|Math\.random|performance|Date)\b/.test(dock));
check('it is loaded once, after camphubscene.js (which has CAMP_HUBS)', (() => { const h = src('index.html'); return (h.match(/src\/campdock\.js/g) || []).length === 1 && h.indexOf('src/camphubscene.js') < h.indexOf('src/campdock.js') && h.indexOf('src/campdock.js') < h.indexOf('src/main.js'); })());
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN DOCK FAIL (${failed} of ${n})` : `CAMPAIGN DOCK PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
