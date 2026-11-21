// smoke: the big briefing in the ready room (plain Node, no Chrome; tests/campbrief-boot.mjs is the real game)
// Card space-game-campaign-briefing (the model src/campbrief.js, the drawing src/campbriefdraw.js, the board's keys src/camphub.js, the scene src/camphubscene.js, the words content/text/campbrief.md).
//   A. what is on the map: for every one of the nine missions, where you start, the mission's place, its objective points (scan points, convoy lanes, pods, guards, towers, the relic, where the mothership comes in), no hidden place
//   B. the route: distance and the flight on regular speed and on Fast, from the map's own numbers (campNavEta)
//   C. the walkthrough is DATA: 3 to 6 curt lines (12 words at most) per mission, in the content file; the numbers in them are the mission's own (cross-checked); no spoilers; a mission with none shows a plain line
//   D. the enemies to expect and the readiness (wing, rank, stance, missiles, ore, shield) with a warning for what is off
//   E. the screen: opens at once when a mission is picked on the board (and for a replay), takes the keys (Enter or L launch, Esc back, Left and Right page, M zooms), launches the mission it shows, reads one line, never opens in a dock's room
// Run: node tests/campbrief.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { BRIEF_STAND } from './briefstand.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const srcOf = f => readFileSync(ROOT + '/' + f, 'utf8');
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(BRIEF_STAND);
g.run(`localStorage.removeItem(CAMP.store);`);
const MISSIONS = [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]];
const FOCUS = ['scan', 'convoy', 'mother', 'cache', 'guards', 'relic', 'scan', 'tower', 'tower'];

// ---- A. the map ----
check('every one of the nine missions has a row and layers; a mission that does not exist has none', MISSIONS.every(([l, i]) => J(`campBriefLayers(${l}, ${i}) !== null`)) && J('campBriefLayers(9, 0)') === null && J('campBriefLayers(1, 3)') === null && J('campBriefLayers(1, -1)') === null);
check('the mission\'s place is what it sends you to: the first scan point, the haulers\' lane, where the mothership comes in, the pod nearest to you, the middle of the guards, the relic, the towers', MISSIONS.every(([l, i], k) => J(`campBriefLayers(${l}, ${i}).focus.kind`) === FOCUS[k]), MISSIONS.map(([l, i]) => J(`campBriefLayers(${l}, ${i}).focus.kind`)).join());
check('the objective points are the mission\'s own: 3 scan points in 1.1 and 3.1 (with their rings), 3 pods in 2.1, 7 guards in 2.2, one relic in 2.3, a tower ring in 3.2 and 3.3, the haulers\' lane Deimos to Phobos in 1.2 (three haulers, one lane), the mothership in 1.3', J('campBriefLayers(1, 0).scan.length') === 3 && J('campBriefLayers(3, 0).scan.length') === 3 && J('campBriefLayers(1, 0).scan[0].r') === 320 && J('campBriefLayers(3, 0).scan[0].r') === 420
  && J('campBriefLayers(2, 0).caches.length') === 3 && J('campBriefLayers(2, 1).guards.length') === 7 && J('campBriefLayers(2, 2).relic !== null') && J('campBriefLayers(3, 1).towers.length') === 1 && J('campBriefLayers(3, 2).towers[0].n') === 8
  && J('campBriefLayers(1, 1).convoys.length') === 1 && J('campBriefLayers(1, 1).convoys[0].from') === 'deimos' && J('campBriefLayers(1, 1).convoys[0].to') === 'phobos' && J('campBriefLayers(1, 2).mother !== null'));
check('you start where the battle starts the carrier (the place and its offset: Ceres + 130, 30 in the belt)', J('campBriefLayers(1, 0).start.x') === J('campPlaces(1).ceres.x') + 130 && J('campBriefLayers(1, 0).start.y') === J('campPlaces(1).ceres.y') + 30 && J('campBriefLayers(2, 0).start.x') === J('campPlaces(2).arrival.x'));
check('no hidden place is on the map (the warp point at Alpha Centauri is not drawn), and the places have names, a star and the far worlds are marked', MISSIONS.every(([l, i]) => J(`campBriefLayers(${l}, ${i}).places.every(p => p.name.length > 0 && Number.isFinite(p.x) && Number.isFinite(p.y))`)) && !J('campBriefLayers(2, 0).places.some(p => p.id === "arrival")') && J('campBriefLayers(1, 0).places.some(p => p.star)'));
check('the map\'s area holds the start, the place and every objective point (with their rings), and is never tighter than the least extent; the whole system is the Tab map\'s own whole-level area', MISSIONS.every(([l, i]) => {
  const Y = J(`campBriefLayers(${l}, ${i})`), b = J(`campBriefBounds(campBriefLayers(${l}, ${i}), false)`), pts = [Y.start, Y.focus].concat(Y.scan, Y.caches, Y.guards, Y.convoys.flatMap(c => [c.a, c.b]), Y.towers, Y.relic ? [Y.relic] : [], Y.mother ? [Y.mother] : []);
  return pts.every(p => p.x >= b.x0 - 1 && p.x <= b.x1 + 1 && p.y >= b.y0 - 1 && p.y <= b.y1 + 1) && b.x1 - b.x0 >= J('CAMPBRIEF.minExtent') - 1 && b.y1 - b.y0 >= J('CAMPBRIEF.minExtent') - 1;
}) && MISSIONS.every(([l, i]) => J(`JSON.stringify(campBriefBounds(campBriefLayers(${l}, ${i}), true)) === JSON.stringify(campMapBounds(${l}, true))`)));

// ---- B. the route ----
check('the route is the straight flight from where you start to the mission\'s place: the distance in km (10 px a km, as the map says it) and the flight on regular speed and on Fast from the map\'s own campNavEta; Fast is the shorter', MISSIONS.every(([l, i]) => {
  const R = J(`campBriefRoute(campBriefLayers(${l}, ${i}))`), Y = J(`campBriefLayers(${l}, ${i})`), px = Math.hypot(Y.focus.x - Y.start.x, Y.focus.y - Y.start.y);
  return Math.abs(R.px - px) < 1e-6 && R.km === Math.round(px / 10) && R.regular === J(`campNavEta(null, ${px}, false)`) && R.fast === J(`campNavEta(null, ${px}, true)`) && R.fast <= R.regular && R.regular > 0 && R.near === false;
}));
check('belt survey: 102 km, 5 s regular, 2 s on Fast to the first scan point; the haulers\' lane starts 3344 km out (they are at Mars: card space-game-campaign-mission-places)', J('campBriefRoute(campBriefLayers(1, 0)).km') === 102 && J('campBriefRoute(campBriefLayers(1, 0)).regular') === 5 && J('campBriefRoute(campBriefLayers(1, 0)).fast') === 2 && J('campBriefRoute(campBriefLayers(1, 1)).km') === 3344);
check('a mission whose place is where you start (nothing to fly) says so: near, no times', (() => { g.run(`var Yn = campBriefLayers(1, 0); Yn.focus = { x: Yn.start.x + 40, y: Yn.start.y, kind: 'start', label: '' };`); return J('campBriefRoute(Yn).near') === true && J('campBriefRoute(Yn).regular') === 0 && J('campBriefRoute(Yn).fast') === 0; })());

// ---- C. the walkthrough ----
const words = t => t.trim().split(/\s+/).length;
const walk = (l, i) => J(`campBriefWalk(${l}, ${i}).steps`);
check('each of the nine missions has a walkthrough from the content file: 3 to 6 steps, each curt (12 words at most), none empty', MISSIONS.every(([l, i]) => { const s = walk(l, i); return J(`campBriefWalk(${l}, ${i}).data`) === true && s.length >= 3 && s.length <= 6 && s.every(t => t.length > 0 && words(t) <= 12); }), MISSIONS.map(([l, i]) => walk(l, i).length).join());
check('the walkthrough lines are the content file\'s keys camp.bf.<level>.<mission>.w<n>, in order (the voice pack records these keys), and nothing else', MISSIONS.every(([l, i]) => walk(l, i).every((t, k) => t === J(`uiText('camp.bf.${l}.${i + 1}.w${k + 1}')`))));
// the numbers in the lines are the mission's own: a change to the data without the words fails here
const must = (l, i) => { const L = J(`campMissionRow(${l}, ${i})`), out = []; const sc = (L.objectives.find(o => o.type === 'scan') || {}).points; if (sc) out.push(sc.length, sc[0].secs); const dv = L.objectives.find(o => o.type === 'deliver'); if (dv) out.push(L.convoys.length, dv.n, L.convoys[1].at - L.convoys[0].at); const ca = L.objectives.find(o => o.type === 'caches'); if (ca) out.push(ca.n, L.caches.length); if (L.guards) out.push(L.guards.length); if (L.relic) out.push(L.relic.hold); (L.towers || []).forEach(t => out.push(t.n)); return out; };
const may = (l, i) => { const L = J(`campMissionRow(${l}, ${i})`); return must(l, i).concat([1, L.waves.length], L.waves.map(w => w.at).filter(Boolean)); };
check('the numbers in each walkthrough are the mission\'s own, from its data: every one it needs is there (scan points and seconds, haulers and the gap, pods, guards, the hold, towers) and every number in it is one the data has (those and when the waves come)', MISSIONS.every(([l, i]) => { const nums = (walk(l, i).join(' ').match(/\d+/g) || []).map(Number); return must(l, i).every(v => nums.includes(v)) && nums.every(v => may(l, i).includes(v)); }), MISSIONS.map(([l, i]) => must(l, i).join('/') + ' vs ' + (walk(l, i).join(' ').match(/\d+/g) || []).join('/')).join(' | '));
check('no spoilers: the lines say nothing of the cloaked caches, anomalies or the reveal, and name no place or ship that the mission does not show', MISSIONS.every(([l, i]) => !/anomal|cloak|reveal|secret|hidden|veil|vault|nest|core|truth|earth is|traitor/i.test(walk(l, i).join(' '))));
check('a mission with no walkthrough in the file shows one plain line and says it is not data: no steps are invented', (() => { g.run(`var __save = UI_TEXT['camp.bf.1.1.w1']; delete UI_TEXT['camp.bf.1.1.w1'];`); const w = J('campBriefWalk(1, 0)'); g.run(`UI_TEXT['camp.bf.1.1.w1'] = __save;`); return w.data === false && w.steps.length === 1 && w.steps[0] === J(`uiText('camp.bf.nowalk')`) && /no walkthrough/i.test(w.steps[0]); })());
check('a mission with more than the most (6) lines is cut at six, and a long walkthrough is paged: five a page, Left and Right clamp', (() => { g.run(`window.__ks = []; for (let k = 1; k <= 8; k++) { const key = 'camp.bf.2.1.w' + k; if (!(key in UI_TEXT)) { UI_TEXT[key] = 'extra line ' + k; __ks.push(key); } }`); const w = J('campBriefWalk(2, 0).steps.length'); g.run('__ks.forEach(k => delete UI_TEXT[k]);'); const p = J('campBriefPage([1,2,3,4,5,6,7,8,9,10,11,12], 0)'), q = J('campBriefPage([1,2,3,4,5,6,7,8,9,10,11,12], 2)'), z = J('campBriefPage([1,2,3], 9)'), m = J('campBriefPage([1,2,3], -4)'); return w === 6 && p.pages === 3 && p.items.length === 5 && q.items.join() === '11,12' && z.page === 0 && z.pages === 1 && m.page === 0; })());

// ---- D. enemies and readiness ----
check('the enemies are what the mission\'s waves, guards and towers add up to, in words: the belt\'s mothership is 8 raiders, 7 drones, 5 gunships and the mothership; the guards of Alpha Centauri are 7 guards, 4 raiders, 7 drones, 3 gunships (the difficulty pass: two waves); the inner ring is 8 towers and the aliens of its two waves', J('campBriefEnemies(1, 2).line') === 'Expect 8 raiders, 7 drones, 5 gunships, the mothership.' && J('campBriefEnemies(2, 1).line') === 'Expect 4 raiders, 7 drones, 3 gunships, 7 guards.' && J('campBriefEnemies(3, 2).line') === 'Expect 3 raiders, 3 drones, 4 gunships, 8 defence towers.' && J('campBriefEnemies(1, 0).total') === 7);
check('one of a kind is singular: "1 raider"; a mission with nothing listed says so', (() => { g.run(`window.__cmr = campMissionRow; campMissionRow = (l, i) => Object.assign({}, __cmr(l, i), { waves: [{ from: [0, 0], at: 1, ships: { raider: 1 } }], guards: [], towers: [] });`); const a = J('campBriefEnemies(1, 0).line'); g.run(`campMissionRow = (l, i) => Object.assign({}, __cmr(l, i), { waves: [], guards: [], towers: [] });`); const b = J('campBriefEnemies(1, 0).line'); g.run('campMissionRow = __cmr;'); return a === 'Expect 1 raider.' && b === 'No aliens are listed for this mission.'; })());
g.run(`var P = campProgressNew(); P.level = 1; P.mission = 2; P.ore = 60; P.techs = []; P.bonus = { fighters: 0, escorts: 0 };`);
const R0 = J('campBriefReady(P, 1, 2)');
check('readiness lists the bay (the rank\'s wing), the rank, the stance, the missiles and the ore, and the shield; nothing is off in a normal room, so no warning', R0.lines.length === 5 && /^Bay: \d+ fighters, \d+ escorts$/.test(R0.lines[0]) && /^Rank: /.test(R0.lines[1]) && R0.lines[2] === 'Stance: Free' && R0.lines[3] === 'Missiles ' + J('CAMP.missile.magazine') + '    Ore 60' && R0.lines[4] === 'Shield: full' && R0.warnings.length === 0, JSON.stringify(R0));
check('the bay is the rank\'s wing and the extras: it follows campRankWing', R0.wing.fighters === J('campRankWing(P).fighters') && R0.wing.escorts === J('campRankWing(P).escorts'));
g.run(`P.stance = 'hold'; P.ore = 0;`);
const R1 = J('campBriefReady(P, 1, 2)');
check('the Hold stance is the warning (the wing will not attack on its own) and the stance reads its name; no ore is not a warning (a new game has none)', R1.lines[2] === 'Stance: Hold' && R1.warnings.length === 1 && /^Stance is Hold: the wing will not attack on its own\.$/.test(R1.warnings[0]) && J('campBriefReady(P, 1, 0).lines[3]') === 'Missiles ' + J('CAMP.missile.magazine') + '    Ore 0', JSON.stringify(R1.warnings));
g.run(`P.stance = 'weird'; P.ore = 99;`);
check('a stance the save does not know reads as Free (junk in the save is not shown)', J('campBriefReady(P, 1, 2).lines[2]') === 'Stance: Free');

// ---- E. the screen ----
g.run(`
  window.__rec = { go: [], sfx: [], texts: [] };
  go = (s, key, data) => { __rec.go.push({ key, data }); }; sfx = name => { __rec.sfx.push(name); };
  interiorBuild = s => { s.in = { door: {} }; }; interiorTick = () => {}; interiorLaunch = s => {};
  campShipTexture = () => 'camp-cruiser'; label = (s, x, y, t) => ({ t, x, y });
  window.__said = []; shipcompSay = t => { __said.push(t); };
  window.__obj = () => { const o = { x: 0, y: 0, t: '', vis: true, handlers: {}, setText(v) { o.t = v; return o; }, setColor() { return o; }, setVisible(v) { o.vis = v; return o; }, setY() { return o; }, setPosition() { return o; }, setRotation() { return o; }, setBackgroundColor() { return o; }, setAngle() { return o; }, setScale() { return o; }, setDepth() { return o; }, setOrigin() { return o; }, setPadding() { return o; }, setStrokeStyle() { return o; }, setInteractive() { return o; }, setAlpha() { return o; }, on(ev, fn) { o.handlers[ev] = fn; return o; }, destroy() {} }; return o; };
  window.__room = d => { __rec.go.length = 0; __rec.sfx.length = 0; __rec.texts.length = 0; __said.length = 0; const s = Object.create(CampHub.prototype);
    s.add = { rectangle: () => __obj(), text: (x, y, t) => { const o = __obj(); o.t = t; __rec.texts.push(o); return o; }, image: () => __obj() };
    s.cameras = { main: { fadeIn() {}, fadeOut() {} } }; s.tweens = { add: c => ({ stop() {} }) }; s.time = { now: 1000 }; s.input = { keyboard: { on() {}, off() {} } }; s.events = { once() {} }; __briefStand(s); s.init(d || {}); s.create(); return s; };
  window.__shown = s => __rec.texts.filter(o => o.vis && o.t !== '').map(o => o.t);
  window.__key = (s, code) => s.onKey({ code, repeat: false });
  localStorage.setItem(CAMP.store, JSON.stringify({ level: 1, mission: 2, techs: ['shield'], ore: 40, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 100, hull: 500, lost: 0, tries: 2 }, '1.2': { score: 640, bonuses: [], t: 90, hull: 300, lost: 1, tries: 1 } } }));
`);
const shown = s => J(`__shown(${s})`), has = (s, re) => shown(s).some(t => re.test(t));
g.run(`var S = __room();`);
check('before a mission is picked there is no briefing on the glass', J('campBriefIsOpen(S)') === false && J('S.bf') === null && J('campBriefKey(S, "Escape")') === false);
g.run(`__key(S, 'Enter');`);
check('Enter on the board (the cursor is on the next mission) opens the briefing AT ONCE, with no step between: it is up, nothing has launched, the room has not moved', J('campBriefIsOpen(S)') === true && J('__rec.go.length') === 0 && J('S.hub.row') === 0);
check('it says which mission, of what kind with its par, then the goals (primary), the bonus with its points, the walkthrough, the enemies, the readiness', has('S', /^MISSION 3 OF 3 {2}- {2}The mothership$/) && has('S', /^ATTACK {3}par 150 s$/) && has('S', /^GOALS$/) && has('S', /^- Destroy the mothership\.?$/) && has('S', /^BONUS$/) && has('S', /^\+250 {2}Finish in 150 seconds$/) && has('S', /^WALKTHROUGH$/) && has('S', /^1\. 3 waves come, at 5, 40 and 80 seconds\.$/) && has('S', /^ENEMIES$/) && has('S', /^Expect 8 raiders, 7 drones, 5 gunships, the mothership\.$/) && has('S', /^READINESS$/) && has('S', /^Bay: \d+ fighters, \d+ escorts$/) && has('S', /^Missiles \d+ {4}Ore 40$/), shown('S').join(' | '));
check('the route is on the screen with the distance and both times (it is the same as campBriefRoute says: 2325 km, 122 s regular, 38 s on Fast: Europa), and the map\'s labels are there: YOU and MISSION MOTHERSHIP, and the places by name', has('S', /^Route 2325 km: 122 s regular, 38 s on Fast\.$/) && has('S', /^YOU$/) && has('S', /^MISSION {2}MOTHERSHIP$/) && has('S', /^CERES$/) && has('S', /^VESTA$/), shown('S').filter(t => /Route|YOU|MISSION|CERES|VESTA/.test(t)).join(' | '));
check('the map is drawn: the glass, the grid, rings and belts and the marks went to a graphics object (not nothing), and the keys line is the last of the page', J('__graphics.length') >= 2 && J('__graphics.some(x => x.calls.length > 40)') && has('S', /^Enter or L launch {4}Esc back to the board {4}M: the whole system$/), J('__graphics.map(x => x.calls.length)'));
check('the ship reads the first step of the walkthrough once, as one short line (the voice\'s own settings decide if it is heard)', J('__said.length') === 1 && J('__said[0]') === '3 waves come, at 5, 40 and 80 seconds.');
g.run(`__key(S, 'KeyW'); __key(S, 'Digit4'); __key(S, 'KeyA'); __key(S, 'KeyX'); __key(S, 'KeyR'); __key(S, 'Backspace'); __key(S, 'Tab'); __key(S, 'Space');`);
check('the briefing takes every other key (nothing under it moves): the row, the cursor, the pick, the board and the launch stay as they were, and it is still up', J('campBriefIsOpen(S)') === true && J('S.hub.row') === 0 && J('S.hub.cur') === 2 && J('S.hub.pick') === null && J('__rec.go.length') === 0 && J('__said.length') === 1);
g.run(`__key(S, 'Escape');`);
check('Esc takes it away to the board (nothing launched, and the title is not left for); the board is as it was, the cursor still on the next mission', J('campBriefIsOpen(S)') === false && J('S.bf') === null && J('__rec.go.length') === 0 && J('S.hub.row') === 0 && has('S', /^> \[>\] 3 {2}The mothership/));
g.run(`__key(S, 'Enter'); __key(S, 'Enter');`);
check('Enter on the board opens it again, and Enter in it launches the mission it shows: the Campaign, level 1, mission 3 (index 2), via the hub, not a replay; the briefing is gone', J('__rec.go.length') === 1 && J('__rec.go[0].key') === 'Campaign' && J('__rec.go[0].data.level') === 1 && J('__rec.go[0].data.mission') === 2 && J('__rec.go[0].data.via') === 'hub' && J('__rec.go[0].data.replay') === false && J('campBriefIsOpen(S)') === false, JSON.stringify(J('__rec.go')));
g.run(`var S2 = __room(); __key(S2, 'KeyR'); __key(S2, 'KeyL');`);
check('R opens it too (the next mission has nothing to pick) and L launches it', J('__rec.go.length') === 1 && J('__rec.go[0].data.mission') === 2 && J('campBriefIsOpen(S2)') === false);
g.run(`var S3 = __room(); __key(S3, 'KeyA'); __key(S3, 'KeyR');`);
check('A moves to the second mission and R picks it as a replay AND opens its briefing, headed REPLAY, with its own goals and walkthrough (the haulers\') and the ship reading the first step of that one', J('campBriefIsOpen(S3)') === true && J('S3.hub.pick.i') === 1 && has('S3', /^REPLAY {2}- {2}MISSION 2 OF 3 {2}- {2}Ore haulers$/) && has('S3', /^1\. 3 haulers leave Vesta for Ceres, 15 seconds apart\.$/) && J('__said[0]') === '3 haulers leave Vesta for Ceres, 15 seconds apart.');
g.run(`__key(S3, 'Enter');`);
check('Enter launches the replay: mission 2 (index 1), replay true', J('__rec.go.length') === 1 && J('__rec.go[0].data.mission') === 1 && J('__rec.go[0].data.replay') === true && J('campBriefIsOpen(S3)') === false);
// M and the arrows
g.run(`var S4 = __room(); __key(S4, 'Enter'); var __g = S4.bf.g, __n0 = __g.calls.length; __key(S4, 'KeyM');`);
check('M zooms the map to the whole system and back: the map is drawn again each time, the keys line says what M will do next, and M does not reach the sound\'s mute', J('S4.bf.whole') === true && J('S4.bf.g.calls.length') > J('__n0') && has('S4', /M: the mission area$/) && (() => { g.run(`__key(S4, 'KeyM');`); return J('S4.bf.whole') === false && has('S4', /M: the whole system$/); })() && J('campBriefHoldsM({ scene: { getScenes: () => [S4] } })') === true && J('campBriefHoldsM({ scene: { getScenes: () => [] } })') === false && J('campBriefHoldsM(null)') === false);
check('the map in each zoom is the right one: the mission area is the objects\' own bounds, the whole system is the Tab map\'s whole-level bounds (the scale is smaller)', (() => { const Y = 'S4.bf.Y'; const a = J(`campMapFit(campBriefBounds(${Y}, false), CAMPBRIEF.frame, CAMPBRIEF.pad).s`), b = J(`campMapFit(campBriefBounds(${Y}, true), CAMPBRIEF.frame, 0.06).s`); return a > b && b > 0; })());
g.run(`window.__ks = []; for (let k = 4; k <= 6; k++) { const key = 'camp.bf.1.3.w' + k; UI_TEXT[key] = 'Extra step ' + k + ' of the walkthrough.'; __ks.push(key); } var S5 = __room(); __key(S5, 'Enter');`);
check('a walkthrough of six steps is on two pages: the first five and the heading says 1 OF 2; the ship reads only the first step', has('S5', /^WALKTHROUGH {2}1 OF 2$/) && has('S5', /^5\. Extra step 5 of the walkthrough\.$/) && has('S5', /^4\. Extra step 4 of the walkthrough\.$/) && !has('S5', /^6\./) && J('__said.length') === 1);
g.run(`__key(S5, 'ArrowRight');`);
check('Right shows the second page (step 6, heading 2 OF 2), Right again stays, Left goes back; nothing is read again and nothing launches', has('S5', /^WALKTHROUGH {2}2 OF 2$/) && has('S5', /^6\. Extra step 6 of the walkthrough\.$/) && !has('S5', /^1\. 3 waves/) && (() => { g.run(`__key(S5, 'ArrowRight');`); const stay = J('S5.bf.page') === 1; g.run(`__key(S5, 'ArrowLeft');`); return stay && J('S5.bf.page') === 0 && has('S5', /^WALKTHROUGH {2}1 OF 2$/); })() && J('__said.length') === 1 && J('__rec.go.length') === 0);
g.run(`__ks.forEach(k => delete UI_TEXT[k]); var S6 = __room(); __key(S6, 'Enter'); __key(S6, 'ArrowRight');`);
check('a short walkthrough has no pages: the heading is WALKTHROUGH alone and the arrows do nothing', has('S6', /^WALKTHROUGH$/) && J('S6.bf.page') === 0 && has('S6', /^1\. 3 waves come/));
// a mission with no walkthrough data
g.run(`window.__sv = UI_TEXT['camp.bf.1.3.w1']; ['1', '2', '3'].forEach(k => { window['__s' + k] = UI_TEXT['camp.bf.1.3.w' + k]; delete UI_TEXT['camp.bf.1.3.w' + k]; }); var S7 = __room(); __key(S7, 'Enter');`);
check('a mission with no walkthrough shows the plain line (and the rest of the briefing is there): nothing is invented and the ship reads nothing', has('S7', /^1\. No walkthrough for this mission\. Read the goals and the map\.$/) && has('S7', /^GOALS$/) && has('S7', /^READINESS$/) && J('__said.length') === 0 && J('campBriefIsOpen(S7)') === true);
g.run(`['1', '2', '3'].forEach(k => { UI_TEXT['camp.bf.1.3.w' + k] = window['__s' + k]; });`);
// all nine open and close clean
g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 3, mission: 2, techs: [], ore: 90, bonus: { fighters: 0, escorts: 0 }, results: ${JSON.stringify(Object.fromEntries(MISSIONS.map(([l, i]) => [l + '.' + (i + 1), { score: 500, bonuses: [], t: 90, hull: 300, lost: 0, tries: 1 }])))} }));`);
check('every one of the nine missions opens its briefing as a replay and closes clean (every object taken from the glass); the briefing of each names its own mission', MISSIONS.every(([l, i]) => { g.run(`var Sx = __room(); Sx.hub.pick = { level: ${l}, i: ${i} }; __said.length = 0; var okx = campBriefOpen(Sx); var objsx = Sx.bf ? Sx.bf.objs.concat(Sx.bf.map, Sx.bf.text) : []; var namex = Sx.bf ? Sx.bf.brief.title : ''; var hasx = __shown(Sx).some(t => t.indexOf(namex) >= 0); campBriefClose(Sx);`); return J('okx') === true && J('hasx') === true && J('campBriefIsOpen(Sx)') === false && J('objsx.length') > 20 && J('objsx.every(o => o.gone === true || typeof o.destroy === "function")') && J('__said.length') === 1; }));
check('closing a briefing that is not open does nothing, and opening one twice does not draw it twice', (() => { g.run(`var Sy = __room(); var c0 = campBriefClose(Sy); Sy.hub.pick = { level: 1, i: 0 }; var o1 = campBriefOpen(Sy), o2 = campBriefOpen(Sy);`); return J('c0') === false && J('o1') === true && J('o2') === false; })());
// the keys and the words
const rr = J('controlsGroup("readyroom").rows.filter(r => r.sub === "THE BRIEFING")');
check('the key table lists the briefing\'s keys (Enter and L, Esc, Left and Right, M) in the ready room\'s group, each a line of 36 letters at most', rr.length === 4 && rr.some(r => r.k.includes('Enter') && r.k.includes('L')) && rr.some(r => r.k.includes('Esc')) && rr.some(r => r.k.includes('Left') && r.k.includes('Right')) && rr.some(r => r.k.includes('M')) && J('controlsGroup("readyroom").rows.every(r => r.t.length <= 36)'), JSON.stringify(rr.map(r => r.t.length)));
check('and the ready room\'s H page has them (it is the table\'s own group)', J('campKeysPage(CAMPKEYS.room)') !== null && JSON.stringify(J('campKeysPage(CAMPKEYS.room)')).includes('page the walkthrough'));
check('the pure half has no Phaser in it (it is plain Node), and every string it uses is in the content file', !/this\.add|Phaser|scene\./.test(srcOf('src/campbrief.js').replace(/\/\/.*$/gm, '')) && (() => { const ks = [...new Set([...srcOf('src/campbrief.js').matchAll(/uiText\('(camp\.bf\.[a-z.]+)'/g)].map(m => m[1]))]; return ks.length > 10 && ks.every(k => J(`${JSON.stringify(k)} in UI_TEXT`) === true || /\.$/.test(k)); })());
check('no error in the game scripts', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nCAMPAIGN BRIEFING FAIL (${failed} of ${n})` : `\nCAMPAIGN BRIEFING PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
