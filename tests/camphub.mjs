// smoke: the Campaign hub's model, the ready room between missions (plain Node, no Chrome)
// Card space-game-campaign-hub (src/camphub.js; the room itself is src/camphubscene.js, tests/camphubscene.mjs). The model is the rows, what each shows, and the keys.
//   A. the keys: a digit picks a row, W S move (and wrap), Enter goes on and on Launch launches, L launches, Esc and T leave, nothing else is the hub's
//   B. the mission to fly next, and the board: every level and mission, who is done, next, passed or later, the scores, and the window that holds the next one
//   C. the briefing: the title, the kind, the words, the objectives, the bonus objectives, the best score
//   D. the refit: the ore, the tech, the wing; ore buys extra ships (the prices, the most), a purchase can be given back; the keys F, E and Backspace on that row only
//   E. the rank: the ranks card's campRankStatus when it is there (and a stub that fails is not the room's trouble), else the plain score and wing
//   F. the strings and the file
// Run: node tests/camphub.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const levels = J('Object.keys(CAMP.levels).map(Number).filter(Number.isInteger)').sort();
const missions = J('campHubAll()');

// ---- A. the keys ----
g.run(`var hubP = campProgressNew(); var hubH = campHubNew(hubP);`);
const key = (code) => J(`campHubKey(hubH, hubP, ${JSON.stringify(code)})`);
const row = () => J('CAMP_HUB.rows[hubH.row]');
check('the hub has five rows: Missions, Briefing, Refit, Rank, Launch, and starts on the board', J('CAMP_HUB.rows').join() === 'board,brief,refit,rank,launch' && row() === 'board');
check('a digit 1 to 5 picks its row and the keypad digits do too', ['Digit3', 'Numpad4', 'Digit1', 'Digit5'].every((c, i) => { const r = key(c); return r.used && r.moved && row() === ['refit', 'rank', 'board', 'launch'][i]; }));
check('6 to 9 and 0 pick nothing: the row stays and nothing is done', ['Digit6', 'Digit9', 'Digit0'].every(c => { g.run('hubH.row = 2'); const r = key(c); return !r.used && !r.moved && row() === 'refit' && r.action === ''; }));
check('W and S (and the arrows) move the row, and wrap round the ends', (() => { g.run('hubH.row = 0'); key('KeyW'); const a = row(); key('KeyS'); const b = row(); key('ArrowDown'); const c = row(); key('ArrowUp'); key('ArrowUp'); return a === 'launch' && b === 'board' && c === 'brief' && row() === 'launch'; })());
check('Enter goes to the next row, one after the other, to Launch', (() => { g.run('hubH.row = 0'); const seen = [row()]; for (let i = 0; i < 4; i++) { const r = key('Enter'); seen.push(row()); if (r.action) return false; } return seen.join() === 'board,brief,refit,rank,launch'; })());
check('Enter on Launch launches (and does not move the row); NumpadEnter is Enter', key('Enter').action === 'launch' && row() === 'launch' && key('NumpadEnter').action === 'launch');
check('L launches from any row', [0, 1, 2, 3, 4].every(i => { g.run(`hubH.row = ${i}`); return key('KeyL').action === 'launch'; }));
check('Esc and T leave for the title; the progress is saved already, so nothing else happens', key('Escape').action === 'title' && key('KeyT').action === 'title');
check('any other key is not the hub\'s (W S, the digits, Enter, L, T, Esc, F, E and Backspace on the refit row are)', ['KeyQ', 'Space', 'Tab', 'KeyM', 'KeyZ', 'F1'].every(c => { g.run('hubH.row = 1'); const r = key(c); return !r.used && r.action === '' && row() === 'brief'; }));
check('F, E and Backspace are the refit row\'s only: on any other row they do nothing', ['board', 'brief', 'rank', 'launch'].every(id => { g.run(`hubH.row = CAMP_HUB.rows.indexOf('${id}'); hubP.ore = 100; hubP.bonus = { fighters: 0, escorts: 0 }`); const r = ['KeyF', 'KeyE', 'Backspace'].map(c => key(c)); return r.every(x => !x.used && !x.changed) && J('hubP.ore') === 100 && J('hubP.bonus.fighters') === 0; }));

// ---- B. what is next, the board ----
check('a new campaign flies level 1, mission 1', J('campHubNext(campProgressNew())').level === 1 && J('campHubNext(campProgressNew())').i === 0);
check('the save says which is next: level 2 mission 2 is that; a level or a mission that does not exist is the first of what does', (() => {
  const a = J('(() => { const p = campProgressNew(); p.level = 2; p.mission = 1; return campHubNext(p); })()'), b = J('(() => { const p = campProgressNew(); p.level = 9; p.mission = 5; return campHubNext(p); })()'), c = J('(() => { const p = campProgressNew(); p.level = 2; p.mission = 8; return campHubNext(p); })()');
  return a.level === 2 && a.i === 1 && b.level === 1 && b.i === 0 && c.level === 2 && c.i === 0;
})());
g.run(`var hubP1 = campProgressNew(); hubP1.results = { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 120, hull: 500, lost: 0, tries: 2 }, '1.2': { score: 640, bonuses: [], t: 100, hull: 300, lost: 1, tries: 1 } }; hubP1.level = 1; hubP1.mission = 2;`);
const board = J('campHubBoard(hubP1)');
check('the board is every level\'s heading and its missions, in order: ' + levels.length + ' levels, ' + missions + ' missions', board.length === levels.length + missions && board.filter(r => r.head).length === levels.length && board[0].head && board[0].level === 1 && board[0].name === J('CAMP.levels[1].name'));
const ms = board.filter(r => !r.head);
check('after two missions the first two are done with their scores, the third is next, the later ones later', ms[0].state === 'done' && ms[0].score === 900 && ms[1].state === 'done' && ms[1].score === 640 && ms[2].state === 'next' && ms.slice(3).every(r => r.state === 'later'), JSON.stringify(ms.map(r => r.state)));
check('a done mission says how many bonus objectives were met of how many it has, and how many tries it took', ms[0].bonus === 2 && ms[0].of === J('campMissions(1)[0].bonus.length') && ms[0].tries === 2 && ms[1].bonus === 0);
check('a mission the save is past that has no result (skipped by an address) is "passed"; the titles are the mission\'s own words', (() => { const rows = J('(() => { const p = campProgressNew(); p.level = 2; p.mission = 0; return campHubBoard(p).filter(r => !r.head); })()'); return rows[0].state === 'passed' && rows[2].state === 'passed' && rows[3].state === 'next'; })() && ms[0].title === 'Belt survey' && ms[1].title === 'Ore haulers');
check('the board of a new campaign has the first mission next and every other later', J('campHubBoard(campProgressNew()).filter(r => !r.head).map(r => r.state)').join() === ['next'].concat(Array(missions - 1).fill('later')).join());
const long = Array.from({ length: 30 }, (_, i) => ({ head: i % 4 === 0, state: i === 20 ? 'next' : 'later', n: i }));
const win = J(`campHubBoardView(${JSON.stringify(long)}, 12)`), win2 = J(`campHubBoardView(${JSON.stringify(long.slice(0, 9))}, 12)`), win3 = J(`campHubBoardView(${JSON.stringify(long.map((r, i) => Object.assign({}, r, { state: i === 0 ? 'next' : 'later' })))}, 12)`), win4 = J(`campHubBoardView(${JSON.stringify(long.map((r, i) => Object.assign({}, r, { state: i === 29 ? 'next' : 'later' })))}, 12)`);
check('a board longer than the lines it has is a window of them that holds the next mission (middle, top and bottom), and a short one is shown whole', win.length === 12 && win.some(r => r.state === 'next') && win2.length === 9 && win3.length === 12 && win3[0].state === 'next' && win4.length === 12 && win4[11].state === 'next');

// ---- C. the briefing ----
const b1 = J('campHubBrief(campProgressNew(), 1, 0)'), b2 = J('campHubBrief(hubP1, 1, 0)'), b3 = J('campHubBrief(hubP1, 1, 1)');
check('the briefing of belt mission 1: its title, "RECON", the two lines of words, the par', b1.title === 'Belt survey' && b1.kindText === 'RECON' && b1.n === 1 && b1.of === 3 && b1.lines.length === 2 && b1.lines[0] === 'Scan three rock fields.' && b1.par === 150, JSON.stringify(b1));
check('its objectives are in plain words from the HUD\'s own strings, with nothing done yet: scan three, destroy the attackers', b1.objectives.length === 2 && b1.objectives[0] === 'Scan the points: 0 of 3.' && b1.objectives[1] === 'Destroy the attackers.', b1.objectives.join(' | '));
check('its bonus objectives each say what they earn and what they ask: finish in 150 seconds, lose no ships, mine 60 ore', b1.bonus.length === 3 && b1.bonus.every(b => b.points === J('CAMP.score.bonus')) && b1.bonus[0].text === 'Finish in 150 seconds' && b1.bonus[1].text === 'Lose no ships' && b1.bonus[2].text === 'Mine 60 ore', JSON.stringify(b1.bonus));
check('a mission not flown has no best; one flown has its best score and its tries; the escort mission (kind escort) asks for deliveries', b1.best === 0 && b1.tries === 0 && b2.best === 900 && b2.tries === 2 && b3.kindText === 'ESCORT' && /Haulers delivered: 0 of 2/.test(b3.objectives[0]), b3.objectives.join());
check('every mission of every level has a briefing with a title, a kind word, at least one objective and no leftover key as a word', levels.every(lv => J(`campMissions(${lv}).map((m, i) => campHubBrief(campProgressNew(), ${lv}, i))`).every(b => b && b.title && !/^camp\./.test(b.title) && !/^camp\./.test(b.kindText) && b.objectives.length >= 1 && b.objectives.every(o => !/^camp\./.test(o)) && b.bonus.every(x => !/^camp\./.test(x.text)))));
check('a level or a mission that is not there has no briefing', J('campHubBrief(campProgressNew(), 9, 0)') === null);

// ---- D. the refit ----
const r0 = J('campHubRefit(campProgressNew())');
check('a new campaign: no ore, no tech, the bay\'s own wing (6 fighters and 2 escorts), and the table\'s prices and most', r0.ore === 0 && r0.techs.length === 0 && r0.wing.fighters === J('CAMP.bay.fighters') && r0.wing.escorts === J('CAMP.bay.escorts') && r0.fc === J('CAMP.build.fighterCost') && r0.ec === J('CAMP.build.escortCost') && r0.most === J('CAMP.refit.most'));
check('the tech taken is listed with its words, and the second bay adds its fighters to the wing', (() => { const r = J('(() => { const p = campProgressNew(); p.techs = ["shield", "bay2"]; return campHubRefit(p); })()'); return r.techs.length === 2 && r.techs[0].name === 'Shield grid' && r.wing.fighters === J('CAMP.bay.fighters + CAMP.tech.bay2.fighters'); })());
g.run(`var hubP2 = campProgressNew(); hubP2.ore = 100; var hubH2 = campHubNew(hubP2); hubH2.row = 2;`);
const k2 = code => J(`campHubKey(hubH2, hubP2, ${JSON.stringify(code)})`);
check('F on the Refit row buys a fighter: the price comes out of the ore, the extra is in the wing, the change is flagged to be saved', (() => { const r = k2('KeyF'); return r.used && r.changed && r.ok && J('hubP2.ore') === 75 && J('hubP2.bonus.fighters') === 1 && J('campHubRefit(hubP2).wing.fighters') === 7 && r.say.key === 'camp.hub.boughtf'; })());
check('E buys an escort at its price', (() => { const r = k2('KeyE'); return r.changed && J('hubP2.ore') === 30 && J('hubP2.bonus.escorts') === 1 && J('campHubRefit(hubP2).wing.escorts') === 3; })());
check('too little ore buys nothing and says what is needed: 45 for an escort with 30', (() => { const r = k2('KeyE'); return !r.changed && !r.ok && J('hubP2.ore') === 30 && J('hubP2.bonus.escorts') === 1 && r.say.key === 'camp.hub.noore' && r.say.vars.need === 45 && r.say.vars.have === 30; })());
check('at most CAMP.refit.most extra of each: the fourth fighter is refused whatever the ore', (() => { g.run('hubP2.ore = 500; hubP2.bonus.fighters = 3'); const r = k2('KeyF'); return !r.changed && r.say.key === 'camp.hub.most' && J('hubP2.ore') === 500 && J('hubP2.bonus.fighters') === 3; })());
check('Backspace gives back the one bought last, at its full price; with none bought there is nothing to give back', (() => { g.run('hubP2.ore = 100; hubP2.bonus = { fighters: 1, escorts: 1 }; hubH2.last = "escorts"'); const a = k2('Backspace'), o = J('hubP2.ore'), b = k2('Backspace'), o2 = J('hubP2.ore'), c = k2('Backspace'), d = k2('Backspace'); return a.changed && o === 145 && J('hubP2.bonus.escorts') === 0 && b.changed && o2 === 170 && J('hubP2.bonus.fighters') === 0 && !c.changed && c.say.key === 'camp.hub.nothing' && !d.changed; })());
check('a refund never takes the store past the cap', (() => { g.run('hubP2.ore = CAMP.ore.cap; hubP2.bonus = { fighters: 1, escorts: 0 }; hubH2.last = "fighters"'); k2('Backspace'); return J('hubP2.ore') === J('CAMP.ore.cap'); })());
check('a purchase is the progress\'s: it survives the save (ore and bonus), so quitting at the hub keeps it', (() => { g.run(`localStorage.removeItem(CAMP.store); var hubP3 = campProgressNew(); hubP3.ore = 80; campHubBuy(hubP3, 'fighters'); campHubBuy(hubP3, 'escorts'); campProgressSave(hubP3);`); const L = J('campProgressLoad()'); return L.ore === 10 && L.bonus.fighters === 1 && L.bonus.escorts === 1; })());

// ---- E. the rank ----
const rk0 = J('campHubRank(hubP1)');
check('without the ranks card: no rank, the score so far (900 + 640) and the missions flown of all, and the plain wing', typeof J('typeof campRankStatus') === 'string' && !rk0.ranked && rk0.name === '' && rk0.points === 1540 && rk0.total === 1540 && rk0.flown === 2 && rk0.all === missions && rk0.wing.fighters === 6);
g.run(`window.campRankStatus = hubP => ({ name: 'Flight Lieutenant', n: 3, of: 6, points: 2100, next: 3000, nextName: 'Squadron Leader', wing: { fighters: 9, escorts: 4 } });`);
const rk1 = J('campHubRank(hubP1)');
check('with it: its rank, its points, the next rank and its wing (the wing is what the next mission starts with, the rank\'s extras in it)', rk1.ranked && rk1.name === 'Flight Lieutenant' && rk1.n === 3 && rk1.of === 6 && rk1.points === 2100 && rk1.next === 3000 && rk1.nextName === 'Squadron Leader' && rk1.wing.fighters === 9 && rk1.wing.escorts === 4 && J('campHubRefit(hubP1).wing.fighters') === 9);
g.run(`window.campRankStatus = hubP => ({ name: 'Ace', n: 6, of: 6, points: 9000, next: null, nextName: '', wing: { fighters: 12, escorts: 5 } });`);
const rk2 = J('campHubRank(hubP1)');
check('the top rank has no next', rk2.ranked && rk2.next === null && rk2.nextName === '');
g.run(`window.campRankStatus = hubP => { throw new Error('ranks card broke'); };`);
check('a ranks card that throws is not the room\'s trouble: the plain score and wing again', (() => { const r = J('campHubRank(hubP1)'); return !r.ranked && r.points === 1540 && r.wing.fighters === 6; })());
g.run(`window.campRankStatus = hubP => ({ name: '', wing: { fighters: 'many' } });`);
check('a ranks card with nothing usable in it is ignored the same way', (() => { const r = J('campHubRank(hubP1)'); return !r.ranked && r.wing.fighters === 6; })());
g.run(`delete window.campRankStatus;`);

// ---- the rows and the launch ----
const rows = J('campHubRows(hubP1)');
check('the rows say what they hold: how many missions are flown, the next mission\'s title, the ore, the points, which mission', rows.map(r => r.id).join() === 'board,brief,refit,rank,launch' && rows.map(r => r.n).join() === '1,2,3,4,5' && rows[0].note === `2 of ${missions} flown` && rows[1].note === 'The mothership' && /ore$/.test(rows[2].note) && rows[3].note === '1540 points' && rows[4].note === 'mission 3', JSON.stringify(rows));
check('every row has a name and a line saying what Enter does there; the key line names the keys', rows.every(r => r.name && !/^camp\./.test(r.name) && J(`campHubFoot('${r.id}')`) && !/^camp\./.test(J(`campHubFoot('${r.id}')`))) && /1 to 5/.test(J('campHubKeyLine()')) && /Esc/.test(J('campHubKeyLine()')));
check('Launch starts the Campaign scene on the next mission, from the hub: level, mission and via', (() => { const l = J('campHubLaunch(hubP1)'), l0 = J('campHubLaunch(campProgressNew())'); return l.level === 1 && l.mission === 2 && l.via === 'hub' && l0.level === 1 && l0.mission === 0 && l0.via === 'hub'; })());
check('each level has a station of its own to stand in: a name and an accent colour, and an unknown level is the first one', levels.every(lv => { const s = J(`campHubStation(${lv})`); return s.name && /^#[0-9a-f]{6}$/i.test(s.accent) && s.art; }) && J('campHubStation(1)').name === 'Occator Works' && J('campHubStation(77)').name === 'Occator Works');

// ---- G. the rows are data: a dock (card space-game-campaign-outposts) opens the room with its own rows ----
const ids = J(`campHubNew(hubP, { rows: ['board', 'nope', 'refit', 'refit', 'launch'], at: 'refit' })`);
check('a room opened with a list of rows has those rows, the ones the table knows, each once, in order, and stands on the one asked for', ids.rows.join() === 'board,refit,launch' && ids.row === 1);
check('no rows, or none that are known, is the five; an unknown row to stand on is the first', J(`campHubNew(hubP, { rows: [] }).rows`).join() === 'board,brief,refit,rank,launch' && J(`campHubNew(hubP, { rows: ['x', 'y'] }).rows.length`) === 5 && J(`campHubNew(hubP, { rows: ['board', 'launch'], at: 'refit' }).row`) === 0 && J('campHubNew(hubP).rows.length') === 5);
check('the rows of a room are numbered 1 to n with their words and notes', (() => { const r = J(`campHubRows(hubP1, ['launch', 'board'])`); return r.length === 2 && r[0].id === 'launch' && r[0].n === 1 && r[1].id === 'board' && r[1].n === 2 && r[1].note === `2 of ${missions} flown`; })());
g.run(`var hubR = campHubNew(hubP, { rows: ['board', 'refit', 'launch'] });`);
const hubKR = c => J(`campHubKey(hubR, hubP, ${JSON.stringify(c)})`);
check('the digits and W S follow the rows there are (three here): 4 and 5 pick nothing, S wraps, F and E work on the refit row wherever it stands', (() => { const a = hubKR('Digit4'), b = hubKR('Digit5'); g.run('hubR.row = 2'); hubKR('KeyS'); const w = J('hubR.row'); g.run(`hubR.row = 1; hubP.ore = 100; hubP.bonus = { fighters: 0, escorts: 0 }`); const f = hubKR('KeyF'); return !a.used && !b.used && w === 0 && f.changed && J('hubP.ore') === 75; })());
check('L launches when the room has a Launch row and does nothing when it has none; Enter on the last row of a room with no action wraps to the first', (() => { g.run(`hubR.row = 0`); const l = hubKR('KeyL'); g.run(`var hubD = campHubNew(hubP, { rows: ['board', 'refit'] }); hubD.row = 1;`); const l2 = J(`campHubKey(hubD, hubP, 'KeyL')`), e = J(`campHubKey(hubD, hubP, 'Enter')`); return l.action === 'launch' && !l2.used && l2.action === '' && e.moved && e.action === '' && J('hubD.row') === 0; })());
g.run(`CAMP_HUB.note.build = P => 'build ' + (P.ore | 0); CAMP_HUB.act.undock = 'undock'; CAMP_HUB.note.undock = P => ''; CAMP_HUB.rowKey.build = (H, P, code, res) => { if (code !== 'KeyB') return null; res.used = true; res.changed = true; res.say = { key: 'camp.hub.boughtf', vars: { ore: 1 } }; return res; };`);
check('a row a dock registers is a row: it is known, has its note, its own keys, and its own Enter action (undock); the five are untouched', (() => { const h = J(`campHubNew(hubP, { rows: ['build', 'refit', 'undock'], at: 'build' })`); g.run(`var hubB = campHubNew(hubP, { rows: ['build', 'refit', 'undock'] });`); const r = J(`campHubRows(hubP, hubB.rows)`), b = J(`campHubKey(hubB, hubP, 'KeyB')`); g.run('hubB.row = 2'); const u = J(`campHubKey(hubB, hubP, 'Enter')`); g.run('hubB.row = 1'); const nb = J(`campHubKey(hubB, hubP, 'KeyB')`); return h.rows.join() === 'build,refit,undock' && h.row === 0 && r[0].note.startsWith('build ') && b.used && b.changed && u.action === 'undock' && !nb.used && J('campHubNew(hubP).rows.length') === 5; })());
check('a note that throws is not the room\'s trouble: the row has an empty note', (() => { g.run(`CAMP_HUB.note.bad = P => { throw new Error('x'); }`); const r = J(`campHubRows(hubP, ['bad', 'board'])`); return r.length === 2 && r[0].note === '' && r[1].id === 'board'; })());
g.run(`delete CAMP_HUB.note.build; delete CAMP_HUB.note.undock; delete CAMP_HUB.note.bad; delete CAMP_HUB.act.undock; delete CAMP_HUB.rowKey.build;`);

// ---- F. the strings and the file ----
const keys = [...new Set((readFileSync(ROOT + '/src/camphub.js', 'utf8').match(/camp\.hub\.[a-z.]+/g) || []))].filter(k => !/\.$/.test(k));
const missing = keys.filter(k => !J(`Object.prototype.hasOwnProperty.call(UI_TEXT, ${JSON.stringify(k)})`));
check('every string key the model names is a UI_TEXT default (the dynamic ones, row, note, foot and kind, are checked by their ids)', missing.length === 0, missing.join());
const dyn = [['camp.hub.row.', ['board', 'brief', 'refit', 'rank', 'launch']], ['camp.hub.foot.', ['board', 'brief', 'refit', 'rank', 'launch']], ['camp.hub.kind.', ['recon', 'escort', 'attack', 'defend', 'waves']]];
check('and the dynamic ones: a row name, a foot and a kind word for each id (every kind the missions use is there)', dyn.every(([p, ids]) => ids.every(id => J(`Object.prototype.hasOwnProperty.call(UI_TEXT, '${p}${id}')`))) && levels.every(lv => J(`campMissions(${lv}).every(m => Object.prototype.hasOwnProperty.call(UI_TEXT, 'camp.hub.kind.' + (m.kind || 'waves')))`)));
const src = readFileSync(ROOT + '/src/camphub.js', 'utf8'), pure = src.replace(/\/\/.*$/gm, '');
check('src/camphub.js is the pure half: nothing of Phaser, the page, the clock or Math.random', !/\b(Phaser|document|window|localStorage|setTimeout|Math\.random|performance|Date)\b/.test(pure));
check('it is loaded once, after campaign.js and the strings', (() => { const h = readFileSync(ROOT + '/index.html', 'utf8'); return (h.match(/src\/camphub\.js/g) || []).length === 1 && h.indexOf('src/campaign.js') < h.indexOf('src/camphub.js') && h.indexOf('src/contenttables.js') < h.indexOf('src/camphub.js'); })());
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN HUB FAIL (${failed} of ${n})` : `CAMPAIGN HUB PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
