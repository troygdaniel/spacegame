// smoke: the Campaign hub's model, the ready room between missions (plain Node, no Chrome)
// Card space-game-campaign-hub (src/camphub.js; the room itself is src/camphubscene.js, tests/camphubscene.mjs). The model is the rows, what each shows, and the keys.
//   A. the keys: a digit picks a row, W S move (and wrap), Enter or Right opens Missions, Refit and Rank as overlays (Left or Esc closes), on Launch launches, L launches, Esc (none open) and T leave, nothing else is the hub's
//   B. the mission to fly next, and the board: every level and mission, who is done, next, passed or later, the scores, and the window that holds the next one
//   C. the briefing: the title, the kind, the words, the objectives, the bonus objectives, the best score
//   D. the refit: the ore, the tech, the wing; ore buys extra ships (the prices, the most), a purchase can be given back; the keys F, E and Backspace in its overlay only, Up Down and Enter on its choices (each with what it changes, in numbers)
//   E. the rank: the ranks card's campRankStatus when it is there (and a stub that fails is not the room's trouble), else the plain score and wing
//   F. the strings and the file
// Run: node tests/camphub.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame(); belt(g, 1); // the old Level 1, the belt, as level 1: this suite was written for it and pins its missions (card space-game-l1-rim-missions)
// the hub alone: the ranks card (src/campranks.js) is merged with it in the game, but these checks are about the room's own plain behaviour and its stand-ins, so the real campRankStatus is set aside (the two together are tests/campranks.mjs)
g.run('window.campRankStatus = undefined');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const levels = J('Object.keys(CAMP.levels).map(Number).filter(Number.isInteger)').sort();
const missions = J('campHubAll()');

// ---- A. the keys ----
g.run(`var hubP = campProgressNew(); var hubH = campHubNew(hubP);`);
const key = (code) => J(`campHubKey(hubH, hubP, ${JSON.stringify(code)})`);
const row = () => J('CAMP_HUB.rows[hubH.row]');
const opened = () => J('hubH.open');
check('the hub has four rows: Missions, Refit, Rank, Launch (the Briefing row is gone: Enter on a mission opens its briefing), and starts on the board', J('CAMP_HUB.rows').join() === 'board,refit,rank,launch' && row() === 'board' && opened() === '');
check('a digit 1 to 4 picks its row and the keypad digits do too', ['Digit3', 'Numpad2', 'Digit1', 'Digit4'].every((c, i) => { const r = key(c); return r.used && r.moved && row() === ['rank', 'refit', 'board', 'launch'][i]; }));
check('5 to 9 and 0 pick nothing: the row stays and nothing is done', ['Digit5', 'Digit9', 'Digit0'].every(c => { g.run('hubH.row = 1'); const r = key(c); return !r.used && !r.moved && row() === 'refit' && r.action === ''; }));
check('W and S (and the arrows) move the row, and wrap round the ends', (() => { g.run('hubH.row = 0'); key('KeyW'); const a = row(); key('KeyS'); const b = row(); key('ArrowDown'); const c = row(); key('ArrowUp'); key('ArrowUp'); return a === 'launch' && b === 'board' && c === 'refit' && row() === 'launch'; })());
check('Enter or Right on Missions, Refit and Rank OPENS the row as an overlay (the row stays, nothing is launched, nothing else moves); Enter on Launch launches and does not move the row; NumpadEnter is Enter', (() => {
  const ok = ['board', 'refit', 'rank'].every(id => ['Enter', 'ArrowRight', 'KeyD', 'NumpadEnter'].every(c => { g.run(`hubH.row = CAMP_HUB.rows.indexOf('${id}'); hubH.open = ''`); const r = key(c); const o = opened() === id && row() === id && r.used && r.action === ''; g.run(`hubH.open = ''`); return o; }));
  g.run(`hubH.row = 3; hubH.open = ''`); return ok && key('Enter').action === 'launch' && row() === 'launch' && key('NumpadEnter').action === 'launch' && key('ArrowRight').action === '' && opened() === '';
})());
check('Left (A) in the menu does nothing (it is already the main menu); L launches from any row, in or out of an overlay', (() => { g.run(`hubH.row = 1; hubH.open = ''`); const a = key('ArrowLeft'), b = key('KeyA'); const ok = !a.used && !b.used && row() === 'refit'; return ok && [0, 1, 2, 3].every(i => { g.run(`hubH.row = ${i}; hubH.open = ''`); const x = key('KeyL').action === 'launch'; g.run(`hubH.row = ${i}; hubH.open = CAMP_HUB.rows[${i}]`); return x && key('KeyL').action === 'launch'; }); })());
check('Esc closes an overlay that is open; with none open Esc and T leave for the title (T does from inside an overlay too); the progress is saved already, so nothing else happens', (() => { g.run(`hubH.row = 0; hubH.open = 'board'`); const a = key('Escape'); const closed = opened() === '' && a.action === '' && a.used; const b = key('Escape'), c = key('KeyT'); g.run(`hubH.open = 'board'`); const d = key('KeyT'); g.run(`hubH.open = ''`); return closed && b.action === 'title' && c.action === 'title' && d.action === 'title'; })());
check('Left (or A) closes the overlay too, and a digit picks that row and closes it', (() => { g.run(`hubH.row = 1; hubH.open = 'refit'`); key('ArrowLeft'); const a = opened() === '' && row() === 'refit'; g.run(`hubH.open = 'refit'`); key('KeyA'); const b = opened() === ''; g.run(`hubH.open = 'refit'`); key('Digit3'); return a && b && opened() === '' && row() === 'rank'; })());
check('any other key is not the hub\'s (W S, the digits, Enter, L, T, Esc and the open overlay\'s own are)', ['KeyQ', 'Space', 'Tab', 'KeyM', 'KeyZ', 'F1', 'KeyF', 'KeyE', 'KeyX'].every(c => { g.run('hubH.row = 1; hubH.open = ""'); const r = key(c); return !r.used && r.action === '' && row() === 'refit' && opened() === ''; }));
check('F, E, U, Backspace, R and X are the open overlay\'s only: with it closed, or on another row, they do nothing', ['board', 'refit', 'rank', 'launch'].every(id => { g.run(`hubH.row = CAMP_HUB.rows.indexOf('${id}'); hubH.open = ''; hubP.ore = 100; hubP.bonus = { fighters: 0, escorts: 0 }; hubP.techs = []`); const r = ['KeyF', 'KeyE', 'Backspace', 'KeyU', 'KeyR', 'KeyX'].map(c => key(c)); const none = r.every(x => !x.used && !x.changed && x.action === '') && J('hubP.ore') === 100 && J('hubP.bonus.fighters') === 0; g.run(`hubH.open = '${id === 'board' || id === 'rank' ? id : 'rank'}'`); const r2 = ['KeyF', 'KeyE', 'Backspace', 'KeyU'].map(c => key(c)); g.run(`hubH.open = ''`); return none && r2.every(x => !x.changed) && J('hubP.ore') === 100; }));

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
check('its bonus objectives each say what they earn and what they ask: find the cloaked cache (card space-game-campaign-anomalies), finish in 150 seconds, lose no ships, mine 60 ore', b1.bonus.length === 4 && b1.bonus.every(b => b.points === J('CAMP.score.bonus')) && b1.bonus[0].text === 'Find the cloaked cache' && b1.bonus[1].text === 'Finish in 150 seconds' && b1.bonus[2].text === 'Lose no ships' && b1.bonus[3].text === 'Mine 60 ore', JSON.stringify(b1.bonus));
check('a mission not flown has no best; one flown has its best score and its tries; the escort mission (kind escort) asks for deliveries', b1.best === 0 && b1.tries === 0 && b2.best === 900 && b2.tries === 2 && b3.kindText === 'ESCORT' && /Haulers delivered: 0 of 2/.test(b3.objectives[0]), b3.objectives.join());
check('every mission of every level has a briefing with a title, a kind word, at least one objective and no leftover key as a word', levels.every(lv => J(`campMissions(${lv}).map((m, i) => campHubBrief(campProgressNew(), ${lv}, i))`).every(b => b && b.title && !/^camp\./.test(b.title) && !/^camp\./.test(b.kindText) && b.objectives.length >= 1 && b.objectives.every(o => !/^camp\./.test(o)) && b.bonus.every(x => !/^camp\./.test(x.text)))));
check('a level or a mission that is not there has no briefing', J('campHubBrief(campProgressNew(), 9, 0)') === null);

// ---- D. the refit ----
const r0 = J('campHubRefit(campProgressNew())');
check('a new campaign: no ore, no tech, the wing\'s own strength (8 fighters\' worth, in three pilots), and the table\'s price and most', r0.ore === 0 && r0.techs.length === 0 && r0.wing.fighters === J('CAMP.pilotStrength') && r0.wing.escorts === undefined && r0.fc === J('CAMP.refit.fighterCost') && r0.ec === undefined && r0.most === J('CAMP.refit.most'));
check('the tech taken is listed with its words, and the second bay adds its fighters to the wing', (() => { const r = J('(() => { const p = campProgressNew(); p.techs = ["shield", "bay2"]; return campHubRefit(p); })()'); return r.techs.length === 2 && r.techs[0].name === 'Shield grid' && r.wing.fighters === J('CAMP.pilotStrength + CAMP.tech.bay2.fighters'); })());
g.run(`var hubP2 = campProgressNew(); hubP2.ore = 100; var hubH2 = campHubNew(hubP2); hubH2.row = 1; hubH2.open = 'refit';`); // the refit overlay is open: its keys are its own
const k2 = code => J(`campHubKey(hubH2, hubP2, ${JSON.stringify(code)})`);
check('F on the Refit row buys a fighter: the price comes out of the ore, the extra is in the wing, the change is flagged to be saved', (() => { const r = k2('KeyF'); return r.used && r.changed && r.ok && J('hubP2.ore') === 75 && J('hubP2.bonus.fighters') === 1 && J('campHubRefit(hubP2).wing.fighters') === 9 && r.say.key === 'camp.hub.boughtf'; })());
check('E buys nothing: there is no escort to buy', (() => { const r = k2('KeyE'); return !r.used && !r.changed && J('hubP2.ore') === 75 && J('hubP2.bonus.escorts') === null; })());
check('too little ore buys nothing and says what is needed: 25 for a fighter with 10', (() => { g.run('hubP2.ore = 10'); const r = k2('KeyF'); return !r.changed && !r.ok && J('hubP2.ore') === 10 && J('hubP2.bonus.fighters') === 1 && r.say.key === 'camp.hub.noore' && r.say.vars.need === 25 && r.say.vars.have === 10; })());
check('at most CAMP.refit.most extra of each: the fourth fighter is refused whatever the ore', (() => { g.run('hubP2.ore = 500; hubP2.bonus.fighters = 3'); const r = k2('KeyF'); return !r.changed && r.say.key === 'camp.hub.most' && J('hubP2.ore') === 500 && J('hubP2.bonus.fighters') === 3; })());
check('Backspace gives back the one bought last, at its full price; with none bought there is nothing to give back', (() => { g.run('hubP2.ore = 100; hubP2.bonus = { fighters: 2 }; hubH2.last = "fighters"'); const a = k2('Backspace'), o = J('hubP2.ore'), b = k2('Backspace'), o2 = J('hubP2.ore'), c = k2('Backspace'), d = k2('Backspace'); return a.changed && o === 125 && J('hubP2.bonus.fighters') === 0 && b.changed && o2 === 150 && !c.changed && c.say.key === 'camp.hub.nothing' && !d.changed; })());
check('a refund never takes the store past the cap', (() => { g.run('hubP2.ore = CAMP.ore.cap; hubP2.bonus = { fighters: 1, escorts: 0 }; hubH2.last = "fighters"'); k2('Backspace'); return J('hubP2.ore') === J('CAMP.ore.cap'); })());
check('a purchase is the progress\'s: it survives the save (ore and bonus), so quitting at the hub keeps it', (() => { g.run(`localStorage.removeItem(CAMP.store); var hubP3 = campProgressNew(); hubP3.ore = 80; campHubBuy(hubP3, 'fighters'); campHubBuy(hubP3, 'fighters'); campProgressSave(hubP3);`); const L = J('campProgressLoad()'); return L.ore === 30 && L.bonus.fighters === 2 && L.bonus.escorts === undefined; })());

// ---- E. the rank ----
const rk0 = J('campHubRank(hubP1)');
check('without the ranks card: no rank, the score so far (900 + 640) and the missions flown of all, and the plain wing', typeof J('typeof campRankStatus') === 'string' && !rk0.ranked && rk0.name === '' && rk0.points === 1540 && rk0.total === 1540 && rk0.flown === 2 && rk0.all === missions && rk0.wing.fighters === 8);
g.run(`window.campRankStatus = hubP => ({ name: 'Flight Lieutenant', n: 3, of: 6, points: 2100, next: 3000, nextName: 'Squadron Leader', wing: { fighters: 9, escorts: 4 } });`);
const rk1 = J('campHubRank(hubP1)');
check('with it: its rank, its points, the next rank and its wing (the wing is what the next mission starts with, the rank\'s extras in it)', rk1.ranked && rk1.name === 'Flight Lieutenant' && rk1.n === 3 && rk1.of === 6 && rk1.points === 2100 && rk1.next === 3000 && rk1.nextName === 'Squadron Leader' && rk1.wing.fighters === 9 && J('campHubRefit(hubP1).wing.fighters') === 9);
g.run(`window.campRankStatus = hubP => ({ name: 'Ace', n: 6, of: 6, points: 9000, next: null, nextName: '', wing: { fighters: 12, escorts: 5 } });`);
const rk2 = J('campHubRank(hubP1)');
check('the top rank has no next', rk2.ranked && rk2.next === null && rk2.nextName === '');
g.run(`window.campRankStatus = hubP => { throw new Error('ranks card broke'); };`);
check('a ranks card that throws is not the room\'s trouble: the plain score and wing again', (() => { const r = J('campHubRank(hubP1)'); return !r.ranked && r.points === 1540 && r.wing.fighters === 8; })());
g.run(`window.campRankStatus = hubP => ({ name: '', wing: { fighters: 'many' } });`);
check('a ranks card with nothing usable in it is ignored the same way', (() => { const r = J('campHubRank(hubP1)'); return !r.ranked && r.wing.fighters === 8; })());
g.run(`window.campRankStatus = undefined;`);

// ---- the rows and the launch ----
const rows = J('campHubRows(hubP1)');
check('the rows say what they hold: how many missions are flown, the next mission\'s title, the ore, the points, which mission', rows.map(r => r.id).join() === 'board,refit,rank,launch' && rows.map(r => r.n).join() === '1,2,3,4' && rows[0].note === `2 of ${missions} flown` && /ore$/.test(rows[1].note) && rows[2].note === '1540 points' && rows[3].note === 'mission 3', JSON.stringify(rows));
check('every row has a name and a line saying what Enter does there; the key line names the keys', rows.every(r => r.name && !/^camp\./.test(r.name) && J(`campHubFoot('${r.id}')`) && !/^camp\./.test(J(`campHubFoot('${r.id}')`))) && /1 to 4/.test(J('campHubKeyLine()')) && /Esc/.test(J('campHubKeyLine()')));
check('Launch starts the Campaign scene on the next mission, from the hub: level, mission and via', (() => { const l = J('campHubLaunch(hubP1)'), l0 = J('campHubLaunch(campProgressNew())'); return l.level === 1 && l.mission === 2 && l.via === 'hub' && l0.level === 1 && l0.mission === 0 && l0.via === 'hub'; })());
check('each level has a station of its own to stand in: a name and an accent colour, and an unknown level is the first one', levels.every(lv => { const s = J(`campHubStation(${lv})`); return s.name && /^#[0-9a-f]{6}$/i.test(s.accent) && s.art; }) && J('campHubStation(1)').name === 'Occator Works' && J('campHubStation(77)').name === 'Occator Works');

// ---- G. the rows are data: a dock (card space-game-campaign-outposts) opens the room with its own rows ----
const ids = J(`campHubNew(hubP, { rows: ['board', 'nope', 'refit', 'refit', 'launch'], at: 'refit' })`);
check('a room opened with a list of rows has those rows, the ones the table knows, each once, in order, and stands on the one asked for', ids.rows.join() === 'board,refit,launch' && ids.row === 1);
check('no rows, or none that are known, is the four; an unknown row to stand on is the first', J(`campHubNew(hubP, { rows: [] }).rows`).join() === 'board,refit,rank,launch' && J(`campHubNew(hubP, { rows: ['x', 'y'] }).rows.length`) === 4 && J(`campHubNew(hubP, { rows: ['board', 'launch'], at: 'refit' }).row`) === 0 && J('campHubNew(hubP).rows.length') === 4);
check('the rows of a room are numbered 1 to n with their words and notes', (() => { const r = J(`campHubRows(hubP1, ['launch', 'board'])`); return r.length === 2 && r[0].id === 'launch' && r[0].n === 1 && r[1].id === 'board' && r[1].n === 2 && r[1].note === `2 of ${missions} flown`; })());
g.run(`var hubR = campHubNew(hubP, { rows: ['board', 'refit', 'launch'] });`);
const hubKR = c => J(`campHubKey(hubR, hubP, ${JSON.stringify(c)})`);
check('the digits and W S follow the rows there are (three here): 4 and 5 pick nothing, S wraps, F and E work in the refit overlay wherever its row stands', (() => { const a = hubKR('Digit4'), b = hubKR('Digit5'); g.run('hubR.row = 2'); hubKR('KeyS'); const w = J('hubR.row'); g.run(`hubR.row = 1; hubP.ore = 100; hubP.bonus = { fighters: 0, escorts: 0 }; hubR.open = ''`); const f0 = hubKR('KeyF'); g.run(`hubR.open = 'refit'`); const f = hubKR('KeyF'); return !a.used && !b.used && w === 0 && !f0.changed && f.changed && J('hubP.ore') === 75; })());
check('L launches when the room has a Launch row and does nothing when it has none; Enter on the last row of a dock room with no action wraps to the first', (() => { g.run(`hubR.row = 0`); const l = hubKR('KeyL'); g.run(`var hubD = campHubNew(hubP, { rows: ['board', 'refit'] }); hubD.row = 1;`); const l2 = J(`campHubKey(hubD, hubP, 'KeyL')`), e = J(`campHubKey(hubD, hubP, 'Enter', { dock: 'x' })`); return l.action === 'launch' && !l2.used && l2.action === '' && e.moved && e.action === '' && J('hubD.row') === 0; })());
g.run(`CAMP_HUB.note.build = P => 'build ' + (P.ore | 0); CAMP_HUB.act.undock = 'undock'; CAMP_HUB.note.undock = P => ''; CAMP_HUB.rowKey.build = (H, P, code, res) => { if (code !== 'KeyB') return null; res.used = true; res.changed = true; res.say = { key: 'camp.hub.boughtf', vars: { ore: 1 } }; return res; };`);
check('a row a dock registers is a row: it is known, has its note, its own keys, and its own Enter action (undock); the four are untouched', (() => { const h = J(`campHubNew(hubP, { rows: ['build', 'refit', 'undock'], at: 'build' })`); g.run(`var hubB = campHubNew(hubP, { rows: ['build', 'refit', 'undock'] });`); const r = J(`campHubRows(hubP, hubB.rows)`), b = J(`campHubKey(hubB, hubP, 'KeyB')`); g.run('hubB.row = 2'); const u = J(`campHubKey(hubB, hubP, 'Enter')`); g.run('hubB.row = 1'); const nb = J(`campHubKey(hubB, hubP, 'KeyB')`); return h.rows.join() === 'build,refit,undock' && h.row === 0 && r[0].note.startsWith('build ') && b.used && b.changed && u.action === 'undock' && !nb.used && J('campHubNew(hubP).rows.length') === 4; })());
check('a note that throws is not the room\'s trouble: the row has an empty note', (() => { g.run(`CAMP_HUB.note.bad = P => { throw new Error('x'); }`); const r = J(`campHubRows(hubP, ['bad', 'board'])`); return r.length === 2 && r[0].note === '' && r[1].id === 'board'; })());
g.run(`delete CAMP_HUB.note.build; delete CAMP_HUB.note.undock; delete CAMP_HUB.note.bad; delete CAMP_HUB.act.undock; delete CAMP_HUB.rowKey.build;`);

// ---- H. the overlays (card space-game-ready-room-simple): the same pattern on every row that opens ----
g.run(`var hubH4 = campHubNew(hubP1); hubH4.row = 0; hubH4.open = 'board'; hubP1.ore = 0;`);
const k4 = code => J(`campHubKey(hubH4, hubP1, ${JSON.stringify(code)})`);
check('the missions overlay: the cursor starts on the next mission; Up and Down move it over the missions done and the next one and the last row, Start the campaign over (wrapping), W and S too; nothing is picked by moving', (() => { const a = J('hubH4.cur'); k4('ArrowUp'); const b = J('hubH4.cur'); k4('KeyW'); const c = J('hubH4.cur'); k4('ArrowUp'); const d = J('hubH4.cur'); k4('ArrowDown'); k4('KeyS'); k4('ArrowDown'); return a === 2 && b === 1 && c === 0 && d === 3 && J('hubH4.cur') === 2 && J('hubH4.pick') === null && J('hubH4.open') === 'board'; })());
check('Enter (or Right, or R) on a mission done picks it as the replay and asks for its briefing at once, with the answer; on the next mission it picks nothing; X goes back to the next', (() => {
  g.run('hubH4.cur = 1'); const a = k4('Enter'); const p = J('hubH4.pick'); const ok1 = a.action === 'brief' && p && p.level === 1 && p.i === 1 && a.say.key === 'camp.hub.replay.set';
  const x = k4('KeyX'); const ok2 = J('hubH4.pick') === null && x.say.key === 'camp.hub.replay.cleared' && x.action === '';
  g.run('hubH4.cur = 0'); const r = k4('KeyR'), rt = k4('ArrowRight'); g.run('hubH4.cur = 2'); const n = k4('Enter');
  return ok1 && ok2 && r.action === 'brief' && rt.action === 'brief' && n.action === 'brief' && J('hubH4.pick') === null && J('hubH4.open') === 'board';
})());
check('Left and Esc close the missions overlay without doing anything else; with nothing done the cursor has only the next mission and the Start over row, and Enter on the mission opens its briefing', (() => { k4('ArrowLeft'); const a = J('hubH4.open') === ''; g.run(`hubH4.open = 'board'`); const e = k4('Escape'); const b = J('hubH4.open') === '' && e.action === ''; g.run(`var hubPn = campProgressNew(), hubHn = campHubNew(hubPn); hubHn.open = 'board'`); J(`campHubKey(hubHn, hubPn, 'ArrowDown')`); const onRow = J('hubHn.cur') === 1; J(`campHubKey(hubHn, hubPn, 'ArrowDown')`); const r = J(`campHubKey(hubHn, hubPn, 'Enter')`); return a && b && onRow && J('hubHn.cur') === 0 && r.action === 'brief' && J('hubHn.pick') === null; })());
check('in a dock\'s room (ctx.dock) nothing opens: Enter on the board goes on to the next row as ever, and Right does nothing', (() => { const D = { dock: 'ceres' }; g.run(`var hubHd = campHubNew(hubP1, { rows: ['board', 'refit', 'rank'] })`); const a = J(`campHubKey(hubHd, hubP1, 'ArrowRight', ${JSON.stringify(D)})`), b = J(`campHubKey(hubHd, hubP1, 'Enter', ${JSON.stringify(D)})`); return !a.used && b.moved && b.action === '' && J('hubHd.row') === 1 && J('hubHd.open') === ''; })());
g.run(`var hubP5 = campProgressNew(); hubP5.ore = 100; hubP5.techs = ['shield']; var hubH5 = campHubNew(hubP5); hubH5.row = 1; hubH5.open = 'refit';`);
const k5 = code => J(`campHubKey(hubH5, hubP5, ${JSON.stringify(code)})`);
const it5 = () => J('campHubRefitItems(hubP5)');
check('the refit\'s choices say what they change with the numbers, what they cost and what you have, and whether you can: a fighter 8 to 9 for 25 ore (the only choice: nothing is fitted any more)', (() => { const it = it5(); return it.length === 1 && it[0].name === 'Fighter' && it[0].change === 'Wing strength: 8 to 9 fighters' && it[0].cost === 25 && it[0].ok && it[0].status === 'You can buy it.' && /^You have 0 credits and 100 ore\. Bought here: 0 of 3\.$/.test(it[0].have); })());
check('Up and Down stay on the one choice (wrapping); Enter buys a fighter (card space-game-repair-with-ore: no Fabricator)', (() => {
  const a = J('hubH5.sel'); k5('ArrowDown'); const b = J('hubH5.sel'); k5('ArrowUp'); const c = J('hubH5.sel');
  g.run('hubH5.sel = 0'); const f = k5('Enter'); const ok1 = f.changed && J('hubP5.ore') === 75 && J('hubP5.bonus.fighters') === 1 && f.say.key === 'camp.hub.boughtf' && J('campHubRefitItems(hubP5)')[0].change === 'Wing strength: 9 to 10 fighters';
  return a === 0 && b === 0 && c === 0 && ok1 && J('hubH5.open') === 'refit';
})());
check('the fighter stops at the most (3) with the reason on its line', (() => {
  g.run('hubP5.ore = 100; hubP5.bonus.fighters = 3'); const f = it5()[0];
  return !f.ok && f.status === 'No more: 3 of 3 bought.';
})());
check('F and Backspace still work inside the refit overlay (at once, without moving the choice), and the refit page data lists the tech fitted with its numbers', (() => { g.run('hubP5.ore = 100; hubP5.bonus = { fighters: 0 }; hubP5.techs = ["shield", "plating"]; hubH5.sel = 0'); const a = k5('KeyF'), b = k5('Backspace'); const r = J('campHubRefit(hubP5)'); return a.changed && b.changed && J('hubP5.ore') === 100 && J('hubH5.sel') === 0 && r.techs.length === 2 && r.techs[0].change === 'Damage the carrier takes: 100 to 60 percent' && r.techs[1].change === 'Carrier hull: 600 to 900' && r.items.length === 1; })());
const techIds = J('Object.keys(CAMP.tech)');
check('every tech says what it changes, in words with numbers and no leftover key or brace: ' + techIds.join(' '), techIds.every(id => { const t = J(`campHubTechChange(${JSON.stringify(id)})`); return t && !/^camp\./.test(t) && !/[{}]/.test(t) && /\d/.test(t); }) && J('campHubTechChange("nope")') === '' && J('campHubTechChange("bay2")') === 'Wing strength: 8 to 12 fighters');
check('the rank has its ladder: every rank, the points it is held from and the ships it adds; the one held is marked when the ranks card says which', (() => { const none = J('campHubRank(hubP1).ladder'); g.run(`window.campRankStatus = hubP => ({ name: 'Flight Lieutenant', n: 3, of: 6, points: 2100, next: 3000, nextName: 'Squadron Leader', wing: { fighters: 9, escorts: 4 } });`); const l = J('campHubRank(hubP1).ladder'); g.run('window.campRankStatus = undefined'); return none.length === J('CAMP.ranks.length') && none.every(x => x.name && !/^camp\./.test(x.name) && Number.isFinite(x.at)) && none.every(x => !x.here) && l.filter(x => x.here).length === 1 && l[2].here; })());
const room = [...new Set([...readFileSync(ROOT + '/src/camphub.js', 'utf8').matchAll(/camp\.room\.[a-z.]+/g), ...readFileSync(ROOT + '/src/camphubscene.js', 'utf8').matchAll(/camp\.room\.[a-z.]+/g)].map(m => m[0]))].filter(k => !/\.$/.test(k));
const roomMissing = room.filter(k => !J(`Object.prototype.hasOwnProperty.call(UI_TEXT, ${JSON.stringify(k)})`));
check('every camp.room string the model and the scene name is a UI_TEXT default, and so are the dynamic ones: a description and a hint for each row, a choice and its change for each ship, the tech words for each tech', roomMissing.length === 0 && ['board', 'refit', 'rank', 'launch'].every(id => J(`UI_TEXT.hasOwnProperty('camp.room.desc.${id}')`)) && ['board', 'refit', 'rank'].every(id => J(`UI_TEXT.hasOwnProperty('camp.room.hint.${id}')`)) && ['fighters'].every(w => J(`UI_TEXT.hasOwnProperty('camp.room.item.${w}') && UI_TEXT.hasOwnProperty('camp.room.change.${w}')`)) && techIds.every(id => J(`UI_TEXT.hasOwnProperty('camp.room.tech.${id}')`)), roomMissing.join());

// ---- F. the strings and the file ----
const keys = [...new Set((readFileSync(ROOT + '/src/camphub.js', 'utf8').match(/camp\.hub\.[a-z.]+/g) || []))].filter(k => !/\.$/.test(k));
const missing = keys.filter(k => !J(`Object.prototype.hasOwnProperty.call(UI_TEXT, ${JSON.stringify(k)})`));
check('every string key the model names is a UI_TEXT default (the dynamic ones, row, note, foot and kind, are checked by their ids)', missing.length === 0, missing.join());
const dyn = [['camp.hub.row.', ['board', 'refit', 'rank', 'launch']], ['camp.hub.foot.', ['board', 'refit', 'rank', 'launch']], ['camp.hub.kind.', ['recon', 'escort', 'attack', 'defend', 'waves']]];
check('and the dynamic ones: a row name, a foot and a kind word for each id (every kind the missions use is there)', dyn.every(([p, ids]) => ids.every(id => J(`Object.prototype.hasOwnProperty.call(UI_TEXT, '${p}${id}')`))) && levels.every(lv => J(`campMissions(${lv}).every(m => Object.prototype.hasOwnProperty.call(UI_TEXT, 'camp.hub.kind.' + (m.kind || 'waves')))`)));
const src = readFileSync(ROOT + '/src/camphub.js', 'utf8'), pure = src.replace(/\/\/.*$/gm, '');
check('src/camphub.js is the pure half: nothing of Phaser, the page, the clock or Math.random', !/\b(Phaser|document|window|localStorage|setTimeout|Math\.random|performance|Date)\b/.test(pure));
check('it is loaded once, after campaign.js and the strings', (() => { const h = readFileSync(ROOT + '/index.html', 'utf8'); return (h.match(/src\/camphub\.js/g) || []).length === 1 && h.indexOf('src/campaign.js') < h.indexOf('src/camphub.js') && h.indexOf('src/contenttables.js') < h.indexOf('src/camphub.js'); })());
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN HUB FAIL (${failed} of ${n})` : `CAMPAIGN HUB PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
