// smoke: the fixes of the overnight bug hunt on Levels 2 and 3 (card space-game-night-hunt-l2-l3, docs/night/hunt-l2-l3.md), each pinned (plain Node, no Chrome)
// Run: node tests/camphunt.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// ---- 1. the Fast burn to a mission's place does not decloak an anomaly (2.1: the wreck lay on the route) ----
// A mission that starts away from its place is flown there on the autopilot, the wing still in the bay: the burn ends at the edge of the arrival circle (CAMP.mission.arrive) and the
// cruiser runs a little on. A cloaked cache on that line was decloaked with the wing aboard, its guards on the carrier in the first seconds, and the find bonus (+250) came free.
// Levels 1 is not here: its missions are being rewritten (cards space-game-l1-*).
const routes = [];
for (const lv of [2, 3]) for (let m = 0; m < J(`campMissions(${lv}).length`); m++) routes.push(J(`(() => { const C = campNew(${lv}, [], { seed: 1, mission: ${m} }), p = campMissionPlace(C), c = C.carrier; let ax = c.x, ay = c.y;
  if (C.arrivedAt == null && p) { const d = Math.hypot(p.x - c.x, p.y - c.y), k = (d - CAMP.mission.arrive) / d; ax = c.x + (p.x - c.x) * k; ay = c.y + (p.y - c.y) * k; }
  return { lv: ${lv}, m: ${m} + 1, rows: C.anoms.map(a => { const vx = ax - c.x, vy = ay - c.y, L2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((a.x - c.x) * vx + (a.y - c.y) * vy) / L2));
    return [a.id, Math.round(Math.hypot(a.x - (c.x + u * vx), a.y - (c.y + u * vy))), Math.round(Math.hypot(a.x - ax, a.y - ay))]; }) }; })()`));
const visit = J('CAMP.anomaly.visit'), need = visit + 400; // the cruiser runs on past the arrival point and turns: 400 px of margin on top of the visit circle
check('six missions of levels 2 and 3 were checked, three anomalies each', routes.length === 6 && routes.every(r => r.rows.length === 3));
const near = routes.map(r => ({ at: r.lv + '.' + r.m, rows: r.rows.filter(x => x[1] < need || x[2] < need) })).filter(r => r.rows.length);
check('no anomaly lies within ' + need + ' px of the route from a mission\'s start to the edge of its arrival circle, nor of the arrival point (the burn must not decloak one: it was the wreck in mission 2.1, 293 px from the point)', near.length === 0, JSON.stringify(near));
check('the wreck is still the one to find in mission 2.1 (its bonus), and the player still notices it on the way: inside the sense range of the route', J(`campMissionRow(2, 0).bonus.some(b => b.anomaly === 'wreck')`) && routes[0].rows.find(x => x[0] === 'wreck')[1] < J('CAMP.anomaly.sense'));

// ---- 2. the map and the briefing give one time for the trip to a mission's place ----
// The briefing counts the flight to the edge of the arrival circle ("Route 579 km: 15 s regular, 7 s on Fast"), because the mission begins there and the autopilot lets go;
// the Tab map counted to the middle of the place ("568 km, about 30 s") and its Fly, Fast and Scout buttons the same. campNavFlight is the one rule for the map now.
g.run(`window.C = campNew(2, ['shield'], { seed: 1, mission: 0 }); window.row = campNavRows(C).find(r => r.id === 'place:alpha-cen-b'); window.T = campTravel(2, 0);`);
check('mission 2.1 starts away from its place: the map has the place as a row, and the briefing a trip of about 7 s on Fast', J('!!row && !!T && T.secs >= 5 && T.secs <= 9 && C.arrivedAt === null'), J('[T && T.secs, row && row.dist]'));
check('the map\'s Fast time to the place is the briefing\'s (within a second), its regular time too: not the double it was (30 s against 15 s)',
  J('Math.abs(campNavEta(C, campNavFlight(C, row, row.dist), true) - T.secs) <= 1') && J('Math.abs(campNavEta(C, campNavFlight(C, row, row.dist), false) - campNavEta(null, T.dist, false)) <= 1'),
  J('[campNavEta(C, campNavFlight(C, row, row.dist), true), T.secs, campNavEta(C, campNavFlight(C, row, row.dist), false), campNavEta(null, T.dist, false)]'));
check('a row that is not the mission\'s place is flown to where it is (the distance is unchanged), and so is the place once the cruiser has arrived', J('campNavFlight(C, { id: "cache:0" }, 4000) === 4000 && campNavFlight(C, { id: "goal", of: "place:proxima" }, 4000) === 4000')
  && (g.run('C.arrivedAt = 0'), J('campNavFlight(C, row, 4000) === 4000')));
check('and the goal row (which stands for the place: its `of` is the place\'s id) is shortened the same way, to nothing when the edge of the circle is already reached',
  (g.run('C.arrivedAt = null'), J('campNavFlight(C, { id: "goal", of: "place:alpha-cen-b" }, 5000) === 2000 && campNavFlight(C, row, 2500) === 0')));

// ---- 3. a mission lost is called a mission lost; the mission card of a retry does not say "of 3" ----
// The lost card said "LEVEL 2 LOST" when a MISSION was lost (the level goes on: Enter flies the mission again), while the win says "MISSION COMPLETE: <title>". The card a retry shows before the flight said
// "MISSION 2 OF 3", the label Troy asked the briefing to drop (card space-game-briefing-walkthrough); the board's and the HUD's pages keep "of 3".
g.run(`window.__sc = (level, mi) => { const f = Object.create(Campaign.prototype); f.level = level; f.camp = campNew(level, [], { seed: 1, mission: mi }); f.P = campProgressNew(); f.card = null; f.hideCard = () => {}; f.say = () => {}; f.showCard = (title, lines, hint) => { f.card = { title, lines, hint }; }; return f; }`);
check('a lost mission\'s card is MISSION LOST: and the mission\'s title, for the missions of levels 2 and 3 (the old-style rows with no objectives keep LEVEL n LOST)',
  J('(() => { const out = []; [[2, 1], [2, 2], [3, 0]].forEach(([l, m]) => { const f = __sc(l, m); f.showLost("carrier"); out.push(f.card.title); }); return out; })()').join('|') === 'MISSION LOST: The guards|MISSION LOST: The relic|MISSION LOST: Approach'
  && J('(() => { const f = __sc(2, 0); f.camp.L = Object.assign({}, f.camp.L, { objectives: null }); f.showLost("carrier"); return f.card.title; })()') === 'LEVEL 2 LOST');
check('its hint still says what Enter does: fly the mission again', J('(() => { const f = __sc(2, 1); f.showLost("carrier"); return f.card.hint; })()') === 'Enter  fly the mission again     T  title');
check('the card of a mission shown before a retry\'s flight reads MISSION 2: The guards (no "OF 3"), its words and bonuses still under it',
  J('(() => { const f = __sc(2, 1); f.showBrief(); return [f.card.title, f.card.lines.length > 2]; })()').join('|') === 'MISSION 2: The guards|true');

// ---- 5. the two waves of mission 2.2 do not say the same line ----
check('mission 2.2\'s second wave has a line of its own ("A third group, from the other side."), not the first one\'s again; both resolve to words',
  J('(() => { const w = campMissionRow(2, 1).waves; return [w.length, w[0].say !== w[1].say, uiText(w[0].say), uiText(w[1].say)]; })()').join('|') === '2|true|A second group, coming in from the far side.|A third group, from the other side.');

// ---- 6. a convoy with a name of its own (the rim run's Transport and Haulers) arrives and is lost as a ship ----
// "The convoy has reached Transport." and "The convoy to Hauler 2 is lost." read as if Transport and Hauler 2 were places (the lines name the place a convoy flies to: Mars). The rim's convoys are ships:
// "Transport has arrived." and "Hauler 2 is lost." A convoy with no name of its own keeps the old lines.
g.run(`window.__cv = (level, mission) => { const C = campNew(level, [], { seed: 1, mission }); for (let i = 0; i < 30 * 70 && !C.ships.some(u => u.kind === 'freighter'); i++) campStep(C, 1 / 30); return C; }; window.__says = C => C.events.filter(e => e.type === 'say').map(e => uiText(e.key, e.vars));`);
check('the transport of the rim run is a named convoy: its arrival reads "Transport has arrived." (not "The convoy has reached Transport.")',
  (g.run(`window.C6 = __cv(1, 0); window.F6 = C6.ships.find(u => u.kind === 'freighter'); C6.events.length = 0; F6.x = F6.dest.x; F6.y = F6.dest.y; campStep(C6, 1 / 30);`), J('F6.named === true && F6.cname === "Transport" && __says(C6).includes("Transport has arrived.") && !__says(C6).some(t => /convoy has reached/.test(t))')), J('__says(C6)'));
check('and its loss reads "Transport is lost." (not "The convoy to Transport is lost."); the lost mission is the debrief\'s business, as before',
  (g.run(`window.C7 = __cv(1, 0); window.F7 = C7.ships.find(u => u.kind === 'freighter'); C7.events.length = 0; campHurt(C7, F7, 99999, 'skiff-1');`), J('__says(C7).includes("Transport is lost.") && !__says(C7).some(t => /convoy to/.test(t))')), J('__says(C7)'));
check('the haulers of 1.3 the same: "Hauler 1 has arrived."', (g.run(`window.C8 = __cv(1, 2); window.F8 = C8.ships.find(u => u.kind === 'freighter'); C8.events.length = 0; F8.x = F8.dest.x; F8.y = F8.dest.y; campStep(C8, 1 / 30);`), J('F8.cname === "Hauler 1" && __says(C8).includes("Hauler 1 has arrived.")')), J('__says(C8)'));
check('a convoy with no name of its own (the Mars convoy of the Earth defence level, `home`, kept as data) keeps the lines of the place: "The convoy has reached Mars." and "The convoy to Mars is lost."',
  (g.run(`window.C9 = __cv('home'); window.F9 = C9.ships.find(u => u.kind === 'freighter'); C9.events.length = 0; F9.x = F9.dest.x; F9.y = F9.dest.y; campStep(C9, 1 / 30); window.S9 = __says(C9); window.C10 = __cv('home'); window.F10 = C10.ships.find(u => u.kind === 'freighter'); C10.events.length = 0; campHurt(C10, F10, 99999, 'raider-1');`),
    J('F9.named === false && S9.includes("The convoy has reached " + F9.cname + ".") && __says(C10).includes("The convoy to " + F10.cname + " is lost.")')), J('[S9, __says(C10)]'));
check('the radio calls the arrival like the old one ("Convoy is through."), the voice pack lists the new lines for the named convoys only (and the old ones for the places), 0 unclassified',
  J(`(() => { const E = VOICEPACK_EXPAND; const named = E['camp.say.shiparrived']().map(x => x.name), lost = E['camp.say.shiplost']().map(x => x.name), placed = E['camp.say.delivered']().map(x => x.name); return named.includes('Transport') && named.includes('Hauler 1') && named.length === 4 && lost.length === 4 && !placed.includes('Transport') && !placed.includes('Hauler 1') && CHATTER.says['camp.say.shiparrived'] === 'convoy'; })()`));

// ---- 7. the keys box of the rim run's mining mission lists the key that wins it ----
// 1.2 asks for ore as its goal (objective type 'ore', then 'cashin' at the Works): the keys box listed fly, fire, wing, map, attack, shield and zoom, without E then 1 (the wing mines) or E then 5 (dock to sell).
// A pilot who never sends the wing cannot win it (the sim's carrier-only and never-orders bots time out).
const k12 = J('campBriefKeys(1, 1).map(k => k.id)');
check('mission 1.2 lists E 1 (mine) and E 5 (dock) among its keys, zoom stays last and the box stays at 8 keys or fewer', k12.includes('mine') && k12.includes('dock') && k12[k12.length - 1] === 'zoom' && k12.length <= J('CAMPBRIEF.keysMax'), k12.join());
check('and the rim\'s other missions still list the keys they need: the escort (Q 3) in 1.1 and 1.3, and every mission ends with the zoom keys; the missions of levels 2 and 3 are as they were',
  ['campBriefKeys(1, 0)', 'campBriefKeys(1, 2)'].every(e => J(e + '.some(k => k.id === "escort")')) && [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]].every(([l, m]) => J(`campBriefKeys(${l}, ${m}).pop().id`) === 'zoom')
  && J('campBriefKeys(2, 1).map(k => k.id).join()') === 'fly,fire,wing,map,attack,missile,shield,zoom' && J('campBriefKeys(3, 0).map(k => k.id).join()') === 'fly,fire,wing,map,attack,zoom');

// ---- 8. the goals of the mining mission read their numbers in the briefing and on the board ----
check('1.2\'s goals say what they ask: "Mine ore: 0 of 190." and "Sell your ore at the Works: 0 of 160." (the numbers of the rim tune, card space-game-l1-rim-tune)" (they said "0 of 1"), the HUD\'s own words with the objective\'s own n',
  J('campHubBrief(campProgressNew(), 1, 1).objectives').join('|') === 'Mine ore: 0 of 190.|Destroy the attackers.|Sell your ore at the Works: 0 of 160.' && J('campHubBrief(campProgressNew(), 2, 0).objectives[0]') === 'Gather resources: 0 of 2.');

// ---- 9. the map's "Flying:" header is one line (it wrapped over the first row of the list for "Transport convoy") ----
g.run(`window.__fit = str => { const t = { size: 14, str: '', setFontSize(z) { t.size = z; return t; }, setText(x) { t.str = x; return t; }, getWrappedText(x) { return Array(Math.ceil(String(x).length * 0.6 * t.size / 250)).fill('l'); } }; campMapFitOne(t, str); return { size: t.size, str: t.str, lines: t.getWrappedText(t.str).length }; };`);
check('a short header keeps its 14 px; "Flying: Transport convoy  13 km" (31 letters) steps down to 12 px and stays one line; a very long name is cut with an ellipsis and fits',
  J('__fit("Flying: Luna  3 km").size') === 14 && J('__fit("Flying: Transport convoy  13 km").size') === 12 && J('__fit("Flying: Transport convoy  13 km").lines') === 1
  && (() => { const r = J('__fit("Flying: The Alpha Centauri B relay outpost on Proxima  1,234 km")'); return r.lines === 1 && /\u2026$/.test(r.str); })());
check('and a text object with no wrapping to ask (the tests\' stand-in) is just set', J(`(() => { const t = { setFontSize() { return t; }, setText(x) { t.s = x; return t; } }; campMapFitOne(t, 'abc'); return t.s; })()`) === 'abc');

// ---- 10. no alien is named before the first contact: the ship computer is not told of aliens that are not there ----
// The summary the ship computer answers from said "Aliens alive: 0." and "(F fires one at the mothership ...)" in the rim run's first missions, where there are pirates and no mothership.
g.run(`window.__sum = (level, mission, t) => { const C = campNew(level, [], { seed: 1, mission }); for (let i = 0; i < 30 * t; i++) campStep(C, 1 / 30); return [C, campSummary(C)]; };`);
check('1.1 in a raid: "Pirates alive: n." and nothing about aliens or a mothership', (g.run(`window.S1 = __sum(1, 0, 142)[1];`), J('/Pirates alive: \\d+\\./.test(S1) && !/alien|mothership/i.test(S1)')), J('S1'));
check('1.2 the same (pirates after the miners): the summary says pirates, not aliens', (g.run(`window.C2s = campNew(1, [], { seed: 1, mission: 1 }); for (let i = 0; i < 30 * 400 && !campAliens(C2s).length; i++) campStep(C2s, 1 / 30); window.S2 = campSummary(C2s);`), J('/Pirates alive/.test(S2) && !/alien|mothership/i.test(S2)')), J('S2'));
check('1.3 before the contact: no aliens named; once the contact cue has fired and its wave is out the count is there, "Aliens alive: n." next to the pirates',
  (g.run(`window.R3 = __sum(1, 2, 40); window.S3a = R3[1]; campCue(R3[0], 'contact'); for (let i = 0; i < 90; i++) campStep(R3[0], 1 / 30); window.S3b = campSummary(R3[0]);`), J('!/alien|mothership/i.test(S3a) && R3[0].alienSeen === true && /Aliens alive: [1-9]\\d*\\./.test(S3b)')), J('[S3a, S3b]'));
check('a level with aliens from the start (the guards of 2.2) reports them, and its F note says what F fires at', (g.run(`window.S4 = __sum(2, 1, 2)[1];`), J('/Aliens alive: \\d+\\./.test(S4) && /F fires one at the nearest big ship/.test(S4)')), J('S4'));

// ---- 11. the haulers' goal counts the haulers home while the mission waits for the rest ----
// 1.3 needs one hauler home ("deliver 1") and ends when none is still on the way; the HUD said "Haulers delivered: 0 of 1." with two of them home.
check('1.3: "Haulers delivered: 0 of 1." until one is home, then "Haulers home: 1. Still flying: 2." and after the second "Haulers home: 2. Still flying: 1."; 1.1\'s single transport still ends the mission when she arrives',
  (g.run(`window.C11 = __cv(1, 2); for (let i = 0; i < 30 * 30; i++) campStep(C11, 1 / 30); window.H0 = campObjective(C11); window.__arrive = C => { const f = C.ships.filter(u => u.kind === 'freighter' && u.hp > 0).sort((a, b) => a.id < b.id ? -1 : 1)[0]; f.x = f.dest.x; f.y = f.dest.y; campStep(C, 1 / 30); return campObjective(C); }; window.H1 = __arrive(C11); window.H2 = __arrive(C11);`),
    J('H0 === "Haulers delivered: 0 of 1." && H1 === "Haulers home: 1. Still flying: 2." && H2 === "Haulers home: 2. Still flying: 1."')) && (g.run(`window.C12 = __cv(1, 0); campStep(C12, 1 / 30); const f = C12.ships.find(u => u.kind === 'freighter'); f.x = f.dest.x; f.y = f.dest.y; campStep(C12, 1 / 30);`), J('C12.result === "won"')), J('[H0, H1, H2]'));

// ---- 12. no string key is defined twice (my camp.say.arrived took the mission arrival line's key: the second definition wins, silently) ----
const ROOT12 = join(dirname(fileURLToPath(import.meta.url)), '..');
const seen12 = new Map(), dup12 = [];
const tally = (key, where) => { if (seen12.has(key) && seen12.get(key) === where && where === 'src/contenttables.js') dup12.push(key + ' twice in ' + where); else if (seen12.has(key) && seen12.get(key) !== where && where !== 'src/contenttables.js' && seen12.get(key) !== 'src/contenttables.js') dup12.push(key + ' in ' + seen12.get(key) + ' and ' + where); seen12.set(key, where); };
for (const m of readFileSync(join(ROOT12, 'src/contenttables.js'), 'utf8').matchAll(/^\s*'([^']+)':/gm)) tally(m[1], 'src/contenttables.js');
const mdkeys = new Map(); for (const f of readdirSync(join(ROOT12, 'content/text')).filter(x => x.endsWith('.md'))) for (const m of readFileSync(join(ROOT12, 'content/text', f), 'utf8').matchAll(/^\|\s*([A-Za-z0-9_.]+)\s*\|/gm)) { if (m[1] === 'key') continue; if (mdkeys.has(m[1]) && mdkeys.get(m[1]) !== f) dup12.push(m[1] + ' in ' + mdkeys.get(m[1]) + ' and ' + f); mdkeys.set(m[1], f); }
check('no string key is defined twice: not in the default table (src/contenttables.js) and not in two files of content/text', dup12.length === 0, dup12.join('; '));

// ---- 13. the rim's briefing draws pirates for pirate raids and keeps the first contact a surprise ----
check('1.3\'s ENEMIES line lists the pirates and says "and unknown ships" (the contact wave is secret: 2 raiders and a drone are not named); 1.1 and 1.2 list only pirates; levels 2 and 3 list all of theirs',
  /^Expect \d+ pirate skiffs?, \d+ pirate cutters?(, \d+ pirate brutes?)?, and unknown ships\.$/.test(J('campBriefEnemies(1, 2).line')) && J('campBriefEnemies(1, 2).unknown') === true && !/raider|drone/.test(J('campBriefEnemies(1, 2).line'))
  && J('campBriefEnemies(1, 0).unknown') === false && /pirate skiff/.test(J('campBriefEnemies(1, 0).line')) && /raider/.test(J('campBriefEnemies(2, 0).line')) && /gunship/.test(J('campBriefEnemies(3, 1).line') + J('campBriefEnemies(2, 1).line')), J('campBriefEnemies(1, 2).line'));
check('the goal "Destroy the attackers." is drawn with skiffs and a cutter on the rim (1.1 to 1.3: the contact wave included, the picture does not give it away), and with the aliens\' raiders and drone on level 2',
  [0, 1, 2].every(m => J(`campBriefSteps(null, 1, ${m}).goals.filter(x => x.kind === 'kill.wave').every(x => x.pic === 'kill.wave.pirate' && x.parts.some(p => p.look === 'skiff') && !x.parts.some(p => p.look === 'raider' || p.look === 'drone'))`)) && J(`campBriefSteps(null, 2, 0).goals.filter(x => x.kind === 'kill.wave').every(x => x.pic === 'kill.wave' && x.parts.some(p => p.look === 'raider'))`));

// ---- 14. nothing a new player reads before the first contact (1.3) names the aliens (card space-game-title-subline; docs/night/hunt-l1-rim.md open C) ----
// Level 1 is a pirate run until 1.3's contact: "Earth's fleet against the aliens" on the title, "Fighters attack the aliens" on the H page, "mothership" on the pause card and in Settings gave the surprise away.
const ALIEN = /alien|mothership|invader/i;
check('the title\'s Campaign line says "Earth\'s fleet on the rim" (and no alien); after the reveal it may say the war goes on', /^Earth's fleet on the rim: fly the carrier, command the wing\. Three levels\.$/.test(J("uiText('title.camp.sub')")) && /war/.test(J("uiText('title.camp.sub.r')")));
const words14 = [];
const walk14 = (where, x) => { if (typeof x === 'string') words14.push([where, x]); else if (Array.isArray(x)) x.forEach(v => walk14(where, v)); else if (x && typeof x === 'object') Object.values(x).forEach(v => walk14(where, v)); };
walk14('title', J("['title.camp.name', 'title.camp.sub', 'title.camp.keys', 'title.long.name', 'title.long.sub', 'title.pause'].map(k => uiText(k))"));
walk14('the title\'s H page', J('campKeysPage()'));
walk14('the ready room\'s H page', J('campKeysPage(CAMPKEYS.room)'));
g.run('window.P14 = campProgressNew();');
walk14('the ready room board', J('campHubBoard(P14)'));
for (let i = 0; i < 3; i++) walk14('the ready room, briefing 1.' + (i + 1), J(`campHubBrief(P14, 1, ${i})`));
walk14('Settings, the pace note', J("uiText('camp.pace.fine')"));
walk14('the pause card', J("uiText('camp.ui.pausehelp')"));
walk14('the fleet panel', J("controlsGroup('panels').rows"));
walk14('what the ship computer answers from', J('SC_CAMP_HOW'));
const hit14 = words14.filter(([, t]) => ALIEN.test(t));
check('the title, its H page, the ready room of Level 1 (the board and the three briefings, the H page there), Settings\' pace note, the pause card, the fleet panel and the ship computer\'s brief name no alien, no mothership: ' + words14.length + ' strings read', words14.length > 150 && hit14.length === 0, hit14.map(([w, t]) => w + ': ' + t.slice(0, 80)).join(' | '));
check('the sweep would catch the old words (a mutation check on the pattern)', ['Earth\'s fleet against the aliens: fly', 'Fighters attack the aliens', 'F fires a homing missile at the mothership or the nearest big ship.'].every(t => ALIEN.test(t)));

process.exit(failed ? 1 : (console.log('\nHUNT FIXES PASS'), 0));
