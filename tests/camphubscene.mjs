// smoke: the Campaign hub's scene, the ready room, on a recording stand-in (plain Node, no Chrome; tests/camphub.mjs is the model, tests/camphub-boot.mjs the real room)
// Card space-game-campaign-hub (src/camphubscene.js). The scene is built with Phaser stand-ins that record what is put on the glass; the hall itself (src/interior.js) is Long Haul's and is stubbed here.
//   A. create: the title, the level, the five rows with their notes, the first row chosen, the foot, the key line; the page of the board
//   B. the keys on the scene: a digit picks a row and the page changes, the pilot walks to that desk, W S, Enter goes on
//   C. the refit: F buys, the ore and the save change, the answer shows, Backspace gives back, a refusal says why
//   D. the rank page with and without the ranks card; the briefing page; the launch page
//   E. launch (L, Enter on Launch, a second click on the Launch row) starts the Campaign scene with via 'hub' and rolls the door up; Esc leaves for the title
//   F. the Campaign scene's side: a mission launched from the hub goes straight to the flight; a debrief and a level's end go back to the hub; the title opens the hub
// Run: node tests/camphubscene.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`
  window.__rec = { go: [], sfx: [], texts: [], tweens: [], door: 0, built: 0 };
  go = (s, key, data) => { __rec.go.push({ key, data }); };
  sfx = name => { __rec.sfx.push(name); };
  interiorBuild = s => { __rec.built++; s.in = { door: {} }; };
  interiorTick = () => {}; interiorLaunch = s => { __rec.door++; };
  campShipTexture = () => 'camp-cruiser'; label = (s, x, y, t) => ({ t, x, y });
  window.__obj = () => { const o = { x: 0, y: 0, t: '', color: '', bg: '', vis: true, rot: 0, handlers: {},
    setText(v) { o.t = v; return o; }, setColor(c) { o.color = c; return o; }, setVisible(v) { o.vis = v; return o; }, setY(v) { o.y = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setRotation(r) { o.rot = r; return o; },
    setBackgroundColor(c) { o.bg = c; return o; }, setAngle() { return o; }, setScale() { return o; }, setDepth() { return o; }, setOrigin() { return o; }, setPadding() { return o; }, setStrokeStyle() { return o; }, setInteractive() { return o; }, setAlpha() { return o; },
    on(ev, fn) { o.handlers[ev] = fn; return o; }, destroy() {} }; return o; };
  window.__scene = d => {
    __rec.go.length = 0; __rec.sfx.length = 0; __rec.texts.length = 0; __rec.tweens.length = 0; __rec.door = 0;
    const s = Object.create(CampHub.prototype);
    s.add = { rectangle: (x, y) => { const o = __obj(); o.x = x; o.y = y; return o; }, text: (x, y, t) => { const o = __obj(); o.x = x; o.y = y; o.t = t; __rec.texts.push(o); return o; }, image: (x, y, k) => { const o = __obj(); o.x = x; o.y = y; o.key = k; return o; } };
    s.cameras = { main: { fadeIn() {}, fadeOut() {} } }; s.tweens = { add: cfg => { __rec.tweens.push(cfg); return { stop() { cfg.stopped = true; } }; } }; s.time = { now: 1000 };
    s.input = { keyboard: { on: (e, fn) => { s.kb = fn; }, off() {} } }; s.events = { once() {} };
    s.init(d || {}); s.create(); return s;
  };
  window.__shown = s => __rec.texts.filter(o => o.vis && o.t !== '').map(o => o.t);
  window.__key = (s, code) => s.onKey({ code, repeat: false });
  localStorage.removeItem(CAMP.store);
`);
const shown = () => J('__shown(S)');
const has = (re) => shown().some(t => re.test(t));
const rec = () => J('__rec');

// ---- A. create ----
g.run(`var S = __scene();`);
check('the room is built: the hall (src/interior.js) once, with the look of this level\'s station, and no error', J('__rec.built') === 1 && J('S.look.name') === 'Occator Works' && J('S.look.terminals.bar') === false && J('S.look.terminals.repair') === true && J('S.look.accentCss') === '#6dff9c' && g.errors.length === 0, g.errors.join(' | '));
check('the glass has its title and the level: READY ROOM - OCCATOR WORKS, LEVEL 1 - The belt', has(/^READY ROOM {2}- {2}OCCATOR WORKS$/) && has(/^LEVEL 1 {2}- {2}The belt$/), shown().join(' | '));
check('the five rows have their names, and their notes say what is in them (a new campaign: 0 of 9 flown, the first mission, 0 ore, no points, mission 1)', ['MISSIONS', 'BRIEFING', 'REFIT', 'RANK', 'LAUNCH'].every(x => has(new RegExp('^' + x + '$'))) && has(/^0 of 9 flown$/) && has(/^Belt survey$/) && has(/^0 ore$/) && has(/^0 points$/) && has(/^mission 1$/), shown().join(' | '));
check('the first row is chosen, the amber line says what Enter does there, and the key line names the keys', J('S.hub.row') === 0 && has(/^Enter {2}the briefing$/) && has(/^1 to 5 pick {3}W S move {3}Enter next {3}L launch {3}Esc title$/));
check('the board page: the level\'s heading, its three missions with the first one NEXT, and the later levels\' missions below, greyed', has(/^LEVEL 1 {2}- {2}The belt$/) && has(/\[>\] 1 {2}Belt survey {2}\(RECON\)/) && has(/\[ \] 2 {2}Ore haulers {2}\(ESCORT\)/) && has(/^NEXT$/) && has(/^LEVEL 2 {2}- {2}Alpha Centauri$/));
check('the pilot stands at the mission desk (200, 246) and the cruiser is on the pad', J('S.player.x') === 200 && J('S.player.y') === 246);

// ---- B. the keys ----
g.run(`__key(S, 'Digit2');`);
check('2 picks the briefing: the page is the briefing of belt mission 1 (its words, its objectives, its bonus), the foot says what Enter does there', J('S.hub.row') === 1 && has(/^MISSION 1 OF 3 {2}- {2}Belt survey$/) && has(/^RECON {3}par 150 s$/) && has(/^Scan three rock fields\.$/) && has(/^- Scan the points: 0 of 3\.$/) && has(/^\+250 {2}Finish in 150 seconds$/) && has(/^Not flown yet\.$/) && has(/^Enter {2}the refit$/), shown().join(' | '));
check('the pilot walks to the desk of the row: a tween to its stop with a duration of at least the shortest walk, and the stride poses are asked for while it goes', (() => { const t = J('__rec.tweens.pop()'); return t && t.x === 236 && t.y === 246 && t.duration >= 260 && J('S.player.body.speed') === 100; })() && J('__rec.sfx').includes('tick'));
g.run(`__rec.tweens.length = 0; __key(S, 'KeyS');`);
check('S moves down a row (the refit: the pilot goes to the repair bay at (640, 246)), the old walk is stopped', J('S.hub.row') === 2 && (() => { const t = J('__rec.tweens.pop()'); return t && t.x === 640 && t.y === 246; })() && has(/^REFIT$/));
g.run(`__key(S, 'Enter');`);
check('Enter goes to the next row: the rank page, with the plain score (no ranks card here)', J('S.hub.row') === 3 && has(/^Score so far: 0 points$/) && has(/^No rank yet\. Fly a mission\.$/) && has(/^Missions flown: 0 of 9$/) && has(/^Wing: 6 fighters, 2 escorts$/), shown().join(' | '));
g.run(`window.campRankStatus = P => ({ name: 'Pilot Officer', n: 2, of: 6, points: 1200, next: 2500, nextName: 'Flying Officer', wing: { fighters: 7, escorts: 3 } }); __key(S, 'Digit4');`);
check('with the ranks card the rank page shows its rank, the next one, and its wing (what the next mission starts with)', has(/^Rank: Pilot Officer {2}\(2 of 6\)$/) && has(/^Next rank Flying Officer at 2500 points$/) && has(/^Wing: 7 fighters, 3 escorts$/) && has(/^Pilot Officer$/), shown().join(' | '));
g.run(`delete window.campRankStatus; __key(S, 'Digit5');`);
check('5 picks Launch: its page names the mission and what launching does; the foot says Enter launches; the pilot goes to the pad', J('S.hub.row') === 4 && has(/^NEXT: MISSION 1 OF 3 {2}- {2}Belt survey$/) && has(/^Level 1 begins with this mission: The belt\.$/) && has(/^Enter or L launches the cruiser\.$/) && has(/^Enter {2}LAUNCH$/) && (() => { const t = J('__rec.tweens.pop()'); return t && t.x === 1028 && t.y === 394; })(), shown().join(' | '));
check('a key that is not the hub\'s does nothing (Q, Tab, Space, 7)', ['KeyQ', 'Tab', 'Space', 'Digit7'].every(c => { const row = J('S.hub.row'), k = J('__rec.sfx.length'); g.run(`__key(S, ${JSON.stringify(c)})`); return J('S.hub.row') === row && J('__rec.sfx.length') === k && J('__rec.go.length') === 0; }));
check('a key held down (repeat) is not a second press', (() => { g.run(`S.hub.row = 0; S.onKey({ code: 'KeyS', repeat: true })`); return J('S.hub.row') === 0; })());

// ---- C. the refit ----
g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 1, techs: ['shield'], ore: 100, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 120, hull: 500, lost: 0, tries: 2 } } })); var S = __scene(); __key(S, 'Digit3');`);
const saved = () => JSON.parse(g.run(`localStorage.getItem(CAMP.store)`));
check('the refit page: the ore (100), the tech taken with its words, the wing (6, 2), nothing bought, the keys and their prices', has(/^Ore in the store: 100$/) && has(/^Shield grid {2}- {2}/) && has(/^Wing for the next mission: 6 fighters, 2 escorts$/) && has(/^Bought here: 0 fighters, 0 escorts \(at most 3 of each\)$/) && has(/^F {2}fighter 25 ore {5}E {2}escort 45 ore {5}Backspace {2}give one back$/), shown().join(' | '));
g.run(`__key(S, 'KeyF');`);
check('F buys a fighter: the ore is 75 on the page and in the save at once, the wing is 7, the answer is shown and a chime is sounded', has(/^Ore in the store: 75$/) && has(/^Wing for the next mission: 7 fighters, 2 escorts$/) && has(/^A fighter joins the wing\. 75 ore left\.$/) && saved().ore === 75 && saved().bonus.fighters === 1 && J('__rec.sfx').includes('chime'), shown().join(' | '));
g.run(`__key(S, 'KeyE'); __key(S, 'KeyE');`);
check('E buys an escort (45); the second does not: 30 ore left, and the answer says what is needed, with the refusal\'s sound', saved().ore === 30 && saved().bonus.escorts === 1 && has(/^Not enough ore: 45 needed, 30 in the store\.$/) && J('__rec.sfx').includes('empty'), shown().join(' | '));
g.run(`__key(S, 'Backspace');`);
check('Backspace gives back the last one bought (the escort) at its price: 75 ore, the save agrees', saved().ore === 75 && saved().bonus.escorts === 0 && saved().bonus.fighters === 1 && has(/^An escort given back\. 75 ore\.$/), shown().join(' | '));
check('nothing else in the save moved: the level, the mission, the tech and the result are as they were', saved().level === 1 && saved().mission === 1 && saved().techs[0] === 'shield' && saved().results['1.1'].score === 900);
check('the answer fades from the page after a few seconds (the scene repaints once when it is over)', (() => { g.run(`S.time.now = 1000 + 3300; S.update(S.time.now);`); return !has(/^An escort given back/); })());
g.run(`__key(S, 'Digit4'); __key(S, 'KeyF');`);
check('F on another row buys nothing (the keys of the refit are the refit\'s)', saved().ore === 75 && saved().bonus.fighters === 1);

// ---- D. the board and the briefing of a campaign in progress ----
g.run(`var S2 = __scene(); S2.hub.row = 0; S2.paint();`);
check('the board: mission 1 is done with its score and its bonus count, mission 2 is next', (() => { const t = J('__shown(S2)'); return t.some(x => /\[x\] 1 {2}Belt survey/.test(x)) && t.some(x => /^900 pts {2}2 of 3 bonus$/.test(x)) && t.some(x => /\[>\] 2 {2}Ore haulers/.test(x)); })());
g.run(`__key(S2, 'Digit2');`);
check('the briefing is that of the NEXT mission (the haulers), its objectives from the HUD\'s strings, and an escort mission\'s bonus: deliver every hauler', (() => { const t = J('__shown(S2)'); return t.some(x => /^MISSION 2 OF 3 {2}- {2}Ore haulers$/.test(x)) && t.some(x => /^ESCORT {3}par 120 s$/.test(x)) && t.some(x => /^- Haulers delivered: 0 of 2\.$/.test(x)) && t.some(x => /^\+250 {2}Deliver every hauler$/.test(x)); })());
g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 2, mission: 0, techs: ['shield'], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} })); var S3 = __scene();`);
check('level 2 has its own station: Proxima Gate, the colour of its trim, and the title and level on the glass say so', J('S3.look.name') === 'Proxima Gate' && J('S3.look.accentCss') === '#38e1ff' && J('__shown(S3)').some(t => /^READY ROOM {2}- {2}PROXIMA GATE$/.test(t)) && J('__shown(S3)').some(t => /^LEVEL 2 {2}- {2}Alpha Centauri$/.test(t)));

// ---- E. launch and leave ----
g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 2, techs: [], ore: 40, bonus: { fighters: 0, escorts: 0 }, results: {} })); var S4 = __scene(); __key(S4, 'KeyL');`);
check('L launches from any row: the bay door rolls up and the Campaign scene starts on level 1, mission 3 (index 2), via the hub', J('__rec.door') === 1 && J('__rec.go').length === 1 && J('__rec.go[0].key') === 'Campaign' && J('__rec.go[0].data.level') === 1 && J('__rec.go[0].data.mission') === 2 && J('__rec.go[0].data.via') === 'hub' && J('__rec.sfx').includes('dock'), JSON.stringify(rec().go));
g.run(`var S5 = __scene(); __key(S5, 'Digit5'); __key(S5, 'Enter');`);
check('Enter on the Launch row launches (and from any row only goes on)', J('__rec.go').length === 1 && J('__rec.go[0].data.mission') === 2 && (() => { g.run(`var S6 = __scene(); __key(S6, 'Enter');`); return J('__rec.go').length === 0 && J('S6.hub.row') === 1; })());
g.run(`var S7 = __scene(); S7.rowT[1].hit.handlers.pointerdown();`);
check('a click on a row picks it (the page changes); a second click on the Launch row launches, a click on another row twice does not', J('S7.hub.row') === 1 && J('__rec.go').length === 0 && (() => { g.run(`S7.rowT[4].hit.handlers.pointerdown();`); const picked = J('S7.hub.row') === 4 && J('__rec.go').length === 0; g.run(`S7.rowT[4].hit.handlers.pointerdown();`); return picked && J('__rec.go').length === 1 && J('__rec.go[0].key') === 'Campaign'; })());
g.run(`var S8 = __scene(); __key(S8, 'Escape');`);
check('Esc leaves for the title (T too); nothing is lost: every change was saved when it was made', J('__rec.go.length') === 1 && J('__rec.go[0].key') === 'Title' && (() => { g.run(`var S9 = __scene(); __key(S9, 'KeyT');`); return J('__rec.go[0].key') === 'Title'; })());
g.run(`var S10 = __scene(); S10.leaving = true; __key(S10, 'KeyL');`);
check('once the scene is leaving no key does anything', J('__rec.go.length') === 0 && J('__rec.door') === 0);

// ---- E2. the room is data: a dock opens it with its own rows, station and ways out ----
g.run(`
  CAMP_HUB.note.build = P => 'build ' + (P.ore | 0); CAMP_HUB.rowKey.build = (H, P, code, res) => { if (code !== 'KeyB') return null; res.used = true; res.say = { key: 'camp.hub.boughtf', vars: { ore: 7 } }; return res; };
  UI_TEXT['camp.hub.row.build'] = 'BUILD'; UI_TEXT['camp.hub.foot.build'] = 'B  build a ship'; CAMP_HUBS.page.build = s => { s.line(0, 0, 'THE BUILD PAGE', '#6dff9c'); s.line(1, 0, 'ore ' + (s.P.ore | 0), '#ffd37a'); };
  CAMP_HUBS.stops.build = [500, 250];
  window.__dock = { out: [] };
  localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 0, techs: [], ore: 60, bonus: { fighters: 0, escorts: 0 }, results: {} }));
  var D = __scene({ rows: ['build', 'refit', 'launch'], at: 'build', station: { name: 'Ceres Dock', accent: '#ffb454', art: 'foundry' }, onLaunch: s => __dock.out.push('launch'), onLeave: s => __dock.out.push('leave') });
`);
const dshown = () => J('__shown(D)');
check('a dock\'s room: its station name on the glass and in the hall\'s look, its colour, three rows numbered 1 to 3 with the registered one first and chosen', dshown().some(x => /^READY ROOM {2}- {2}CERES DOCK$/.test(x)) && J('D.look.name') === 'Ceres Dock' && J('D.look.accentCss') === '#ffb454' && J('D.rowT.length') === 3 && J('D.hub.row') === 0 && dshown().includes('BUILD') && dshown().includes('build 60'), dshown().join(' | '));
check('the registered row\'s page is drawn, its foot is its own words, the pilot stands at its own stop', dshown().includes('THE BUILD PAGE') && dshown().includes('ore 60') && dshown().includes('B  build a ship') && J('D.player.x') === 500 && J('D.player.y') === 250);
g.run(`__key(D, 'KeyB');`);
check('its own key is its row\'s: the answer it gives is shown (the refit page is not showing: the row said it)', J('D.msg.text') === 'A fighter joins the wing. 7 ore left.');
g.run(`__key(D, 'Digit2'); __key(D, 'KeyF');`);
check('the refit row works in a dock\'s room as it does in the hall: F buys, the save changes', JSON.parse(g.run('localStorage.getItem(CAMP.store)')).bonus.fighters === 1 && JSON.parse(g.run('localStorage.getItem(CAMP.store)')).ore === 35);
g.run(`__key(D, 'Digit3'); __key(D, 'Enter'); __key(D, 'KeyL');`);
check('Launch in a dock\'s room is the dock\'s (onLaunch), twice here, with the door rolled up and no Campaign scene started', J('__dock.out').join() === 'launch,launch' && J('__rec.door') === 2 && J('__rec.go.length') === 0);
g.run(`__dock.out.length = 0; __key(D, 'Escape'); __key(D, 'KeyT');`);
check('Esc and T are the dock\'s onLeave, not the title', J('__dock.out').join() === 'leave,leave' && J('__rec.go.length') === 0);
g.run(`var D2 = __scene({ rows: ['board'], station: { name: 'X', accent: 'not a colour' } });`);
check('a room of one row and a colour that is not one still stand: the level\'s own colour is used, S and Enter wrap on the one row, L does nothing without a Launch row', J('D2.look.accentCss') === '#6dff9c' && J('D2.rowT.length') === 1 && (() => { g.run(`__key(D2, 'KeyS'); __key(D2, 'Enter'); __key(D2, 'KeyL');`); return J('D2.hub.row') === 0 && J('__rec.go.length') === 0 && J('__rec.door') === 0; })());
g.run(`var D3 = __scene({ rows: ['board', 'brief', 'refit', 'rank', 'launch', 'build'] });`);
check('six rows fit the glass: each row is closer than five rows\' (the height of the list is shared) and the sixth has its stop', J('D3.rowT.length') === 6 && J('D3.rowH') < 34 && J('D3.rowH') * 6 <= 170);
g.run(`delete CAMP_HUB.note.build; delete CAMP_HUB.rowKey.build; delete UI_TEXT['camp.hub.row.build']; delete UI_TEXT['camp.hub.foot.build']; delete CAMP_HUBS.page.build; delete CAMP_HUBS.stops.build;`);

// ---- F. the Campaign scene's side ----
g.run(`window.__camp = via => { const c = Object.create(Campaign.prototype); c.via = via; c.mode = 'intro'; c.shown = []; c.hideCard = () => { c.hidden = true; }; c.showBrief = () => { c.shown.push('brief'); c.mode = 'brief'; }; c.P = campProgressLoad(); c.level = 1; c.mi = 0; return c; };`);
check('a mission launched from the hub is not briefed twice: after the level\'s story (or at once, for a later mission) it goes straight to the flight', (() => { g.run(`var c1 = __camp('hub'); c1.afterIntro();`); const a = J('c1.mode') === 'play' && J('c1.shown').length === 0; g.run(`var c2 = __camp('menu'); c2.afterIntro();`); const b = J('c2.mode') === 'brief' && J('c2.shown').length === 1; g.run(`var c3 = __camp('hub'); c3.mi = 1; c3.showIntro();`); return a && b && J('c3.mode') === 'play' && J('c3.shown').length === 0; })());
check('a debrief goes back to the ready room (the progress was saved at the win), and so does the end of a level, a story and a pick or a refit', (() => {
  g.run(`__rec.go.length = 0; var c4 = __camp('hub'); c4.nextMission();`); const a = J('__rec.go[0].key') === 'CampHub';
  g.run(`__rec.go.length = 0; var c5 = __camp('hub'); c5.level = 1; c5.camp = { ore: 12 }; c5.next(12);`); const b = J('__rec.go[0].key') === 'CampHub' && JSON.parse(g.run(`localStorage.getItem(CAMP.store)`)).level === 2;
  return a && b; })());
const sc = src('src/campaignscene.js'), ti = src('src/title.js');
check('the Campaign scene still starts a lost mission again by itself (via retry); it goes to the hub in exactly four places: after a debrief, at the end of a level, the title\'s choice, and the dock\'s room over the paused battle (card space-game-campaign-outposts)', /via: 'retry'/.test(sc) && (sc.replace(/\/\/.*$/gm, '').match(/'CampHub'/g) || []).length === 4);
check('the title\'s Campaign choice and K go to the hub (campaignStart); the address ?campaign=N still opens the battle', /function campaignStart\(s, level\) \{[^]*?if \(!level\) \{ go\(s, 'CampHub'\)/.test(sc) && /campAddrPlanPage/.test(ti) && /'Campaign', \{ level: plan\.level/.test(ti));
check('the scene is in the game\'s list, its script is loaded once, after camphub.js and the cruiser art, and before main.js', (() => { const m = src('src/main.js'), h = src('index.html'); return /CampWarp, CampHub\]/.test(m) && (h.match(/src\/camphubscene\.js/g) || []).length === 1 && h.indexOf('src/camphub.js') < h.indexOf('src/camphubscene.js') && h.indexOf('src/campcruiser.js') < h.indexOf('src/camphubscene.js') && h.indexOf('src/camphubscene.js') < h.indexOf('src/main.js'); })());
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN HUB SCENE FAIL (${failed} of ${n})` : `CAMPAIGN HUB SCENE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
