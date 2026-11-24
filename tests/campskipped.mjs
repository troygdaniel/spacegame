// smoke: a mission skipped by an old save can be picked and flown from the ready room; the old save is told once; Start the campaign over asks first (plain Node, no Chrome)
// Card space-game-replay-reselect-bug (src/camphub.js, src/camphubscene.js, src/campaignscene.js, content/text/campskipped.md). Troy's save sat on level 3 with every earlier mission SKIPPED (the missions had changed under an older save), and the
// Missions cursor only stood on the missions done and the next one, so he could not fly 1.1 to 2.3 at all.
//   A. the board: the missions before the next one with no result are skipped; the cursor reaches them (Up, Down, W, S), Enter and R pick one and open its briefing, the target is that mission as a replay with skipped true
//   B. flying one: the Campaign scene takes it as a replay (no story, nothing moves), its first win is kept as its result with the level and the mission to fly next where they were, the debrief is a debrief as any other
//   C. the old save: said once, in plain words, never again; a save with every mission flown says nothing
//   D. Start the campaign over: the last row of the list; Enter asks, a second Enter does it, any other key takes the question back; what is erased and what is kept; R does nothing there
//   E. the words: the key line says Launch flies it, the new keys exist and say what they should
// Run: node tests/campskipped.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const OLD = { level: 3, mission: 0, techs: ['shield'], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }; // Troy's save: level 3, nothing flown
g.run(`localStorage.removeItem(CAMP.store); localStorage.removeItem(CAMP.store + '.oldsave');`);
const load = save => g.run(`localStorage.setItem(CAMP.store, JSON.stringify(${JSON.stringify(save)})); var P = campProgressLoad(); var HH = campHubNew(P); HH.row = 0; HH.open = 'board';`);
const K = c => J(`campHubKey(HH, P, ${JSON.stringify(c)}, { hub: HH })`);
const tag = r => r.level + '.' + r.n;

// ---- A. the board ----
load(OLD);
check('the save is level 3 with nothing flown: the board says 6 missions skipped, 3.1 next, the rest later', J('campHubBoard(P).filter(r => !r.head).map(r => tag(r) + r.state[0]).join()'.replace('tag(r)', '(r.level + "." + r.n)')) === '1.1p,1.2p,1.3p,2.1p,2.2p,2.3p,3.1n,3.2l,3.3l');
check('the cursor can stand on all seven: the six skipped and the next (before, only the missions done and the next one)', J('campHubSelectable(P).length') === 7 && J('campHubFlyable(P).length') === 6);
check('it starts on the next mission (3.1); Up moves onto the skipped ones one by one, to 1.1, and nothing is picked by moving', (() => { const out = [J('HH.cur')]; for (let i = 0; i < 6; i++) { K('ArrowUp'); out.push(J('HH.cur')); } return out.join() === '6,5,4,3,2,1,0' && J('HH.pick') === null; })());
check('Enter on 1.1 (skipped) picks it, says so with its title, and opens its briefing', (() => { const r = K('Enter'); return r.used && r.action === 'brief' && r.say.key === 'camp.hub.skipped.set' && r.say.vars.n === 1 && J('HH.pick') !== null && J('HH.pick.level') === 1 && J('HH.pick.i') === 0; })());
check('the target is 1.1 as a replay that is skipped: Launch and the briefing fly it, and the launch data says replay', J('campHubTarget(P, HH)') && J('campHubTarget(P, HH).level') === 1 && J('campHubTarget(P, HH).i') === 0 && J('campHubTarget(P, HH).replay') === true && J('campHubTarget(P, HH).skipped') === true && J('campHubLaunch(P, HH).replay') === true && J('campHubLaunch(P, HH).mission') === 0 && J('campHubLaunch(P, HH).level') === 1);
check('R does the same on 2.3 (a skipped mission of the level before the last), and Down and S go back down to the next mission, where Enter drops the pick', (() => { g.run('HH.cur = 5'); const r = K('KeyR'); const ok = r.action === 'brief' && J('campHubTarget(P, HH).level') === 2 && J('campHubTarget(P, HH).i') === 2; K('KeyS'); const e = K('Enter'); return ok && J('HH.cur') === 6 && e.action === 'brief' && J('HH.pick') === null && J('campHubTarget(P, HH).replay') === false && J('campHubTarget(P, HH).level') === 3; })());
check('a mission of an earlier level is reached the same way, and a mission not reached yet (3.2) cannot be picked: the cursor never stands on it', J('campHubSelectable(P).some(r => r.level === 1)') === true && J('campHubSelectable(P).some(r => r.level === 3 && r.n === 2)') === false);
check('a mission that is skipped and then flown shows as done, with its score (the board reads results)', (() => { load(OLD); g.run(`P.results['1.1'] = { score: 700, bonuses: [], t: 100, hull: 400, lost: 0, tries: 1 };`); return J('campHubBoard(P).find(r => !r.head && r.level === 1 && r.n === 1).state') === 'done' && J('campHubSelectable(P).length') === 7; })());

// ---- B. flying one: the Campaign scene ----
g.run(`
  window.__went = []; window.__cards = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {};
  window.__mk = (d, store) => { localStorage.setItem(CAMP.store, JSON.stringify(store)); const f = Object.create(Campaign.prototype);
    f.time = { delayedCall: (ms, fn) => fn() }; f.scene = { start: (k, dd) => __went.push({ key: k, data: dd }) };
    f.showCard = (title, lines, hint, tall) => { __cards.push({ title, lines, hint, tall }); f.card = true; f.panel = true; }; f.hideCard = () => { f.card = null; f.panel = false; }; f.say = () => {};
    f.init(d); f.camp = f.makeCamp(); return f; };
`);
g.run(`var F = __mk({ level: 1, mission: 0, via: 'hub', replay: true }, ${JSON.stringify(OLD)});`);
check('the Campaign scene takes a skipped mission as a replay (it has no result: before, only a mission with a result was)', J('F.replay') === true && J('F.level') === 1 && J('F.mi') === 0);
g.run(`var F2 = __mk({ level: 3, mission: 0, via: 'hub', replay: true }, ${JSON.stringify(OLD)});`);
check('the next mission is still no replay (it is the story\'s mission, flown for the first time)', J('F2.replay') === false);
g.run(`var F3 = __mk({ level: 3, mission: 1, via: 'hub', replay: true }, ${JSON.stringify(OLD)});`);
check('and a mission not reached yet is no replay either', J('F3.replay') === false);
g.run(`__cards.length = 0; F.camp.score = { score: 1500, base: 1000, bonuses: [], bonus: 0, hull: 500, lost: 0 }; campEnd(F.camp, 'won', 'test'); F.camp.score.score = 1500; F.missionWon();`);
const sv = JSON.parse(g.run(`localStorage.getItem(CAMP.store)`));
check('its first win is kept as its result (1.1: 1500), and the progress is where it was: level 3, mission 1 (the next), no story or pick came up', sv.results['1.1'] && sv.results['1.1'].score === 1500 && sv.level === 3 && sv.mission === 0 && !sv.levelDone, JSON.stringify(sv).slice(0, 300));
check('the debrief is a debrief as any other (not titled REPLAY, no "your best was"), and the ready room reads 1.1 as flown', (() => { const c = J('__cards[__cards.length - 1]'); return c && !/REPLAY/.test(c.title) && !c.lines.some(l => /your best was/.test(l)); })() && J(`(() => { const P2 = campProgressLoad(); return campHubBoard(P2).find(r => !r.head && r.level === 1 && r.n === 1).state; })()`) === 'done');

// ---- C. the old save is told once ----
g.run(`localStorage.removeItem(CAMP.store + '.oldsave');`); load(OLD);
check('an old save (missions before the next with no result) says so the first time the ready room is met', J('campHubOldSave(P)') === true && J('campHubOldNote(P)') === true);
check('...and never again', J('campHubOldNote(P)') === false && J('campHubOldNote(P)') === false);
g.run(`localStorage.removeItem(CAMP.store + '.oldsave');`); load({ level: 1, mission: 0, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} });
check('a new save says nothing (every mission before the next is flown: there are none), and a save with all missions before the next flown says nothing', J('campHubOldSave(P)') === false && J('campHubOldNote(P)') === false);
const R = (s) => ({ score: s, bonuses: [], t: 100, hull: 400, lost: 0, tries: 1 });
load({ level: 2, mission: 0, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': R(900), '1.2': R(800), '1.3': R(700) } });
check('...also with the save partly flown: only a mission with no result before the next counts as skipped', J('campHubOldSave(P)') === false);
load({ level: 2, mission: 0, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': R(900), '1.3': R(700) } });
check('one skipped among the flown is enough (1.2)', J('campHubOldSave(P)') === true && J('campHubBoard(P).filter(r => !r.head && r.state === "passed").map(r => r.level + "." + r.n).join()') === '1.2');
check('the ready room paints the note under the sentence in amber, only while there is one (the scene reads campHubOldNote once, in create, and not in a dock)', /this\.oldNote = !this\.d\.dock && campHubOldNote\(this\.P\)/.test(src('src/camphubscene.js')) && /this\.oldNote && campHubOldSave\(P\)/.test(src('src/camphubscene.js')) && /camp\.hub\.oldsave/.test(src('src/camphubscene.js')));
check('the flag is a key of its own beside the save, never a key of the save', /CAMP\.store \+ '\.oldsave'/.test(src('src/camphubscene.js')) && !/oldsave/.test(src('src/campaign.js')) && !/localStorage\./.test(src('src/camphub.js')));

// ---- D. Start the campaign over ----
const FLOWN = { level: 2, mission: 1, levelDone: 0, techs: ['shield', 'bay2'], found: [], ore: 77, bonus: { fighters: 1, escorts: 1 }, revealed: true, results: { '1.1': R(900), '1.2': R(800), '1.3': R(700), '2.1': R(650) } };
load(FLOWN);
check('the list has one row more than the missions it can reach: Start the campaign over, last; Up from the first mission wraps onto it, Down from it goes to the first', (() => { const len = J('campHubSelectable(P).length'); g.run('HH.cur = 0'); K('ArrowUp'); const onRow = J('HH.cur') === len; K('ArrowDown'); return len === 5 && onRow && J('HH.cur') === 0; })());
check('Enter on it ASKS: nothing changes in the save, the answer is the question, and the board is as it was', (() => { g.run(`HH.cur = campHubOverRow(P);`); const r = K('Enter'); return r.used && !r.changed && r.ok === false && r.say.key === 'camp.hub.restart.ask' && J('HH.ask') === true && J('P.level') === 2 && J('Object.keys(P.results).length') === 4 && !r.action; })());
check('any key but Enter takes the question back: Down, then Enter on the first mission, and a later Enter on the row asks again (it does not do it)', (() => { K('ArrowDown'); const a = J('HH.ask') === false; g.run(`HH.cur = campHubOverRow(P);`); const r = K('Enter'); return a && r.say.key === 'camp.hub.restart.ask' && J('HH.ask') === true && J('Object.keys(P.results).length') === 4; })());
check('R on the row does nothing (no briefing there), and it does not take the question back for Enter to do it by mistake', (() => { const r = K('KeyR'); return r.used && !r.action && !r.changed && J('Object.keys(P.results).length') === 4 && J('HH.ask') === false; })());
check('Esc closes the list and the question with it', (() => { g.run(`HH.cur = campHubOverRow(P);`); K('Enter'); const asked = J('HH.ask') === true; K('Escape'); return asked && J('HH.ask') === false && J('HH.open') === ''; })());
check('the second Enter does it: level 1, mission 0, nothing flown, no techs, no ore, no extra ships, no pick; the cursor is on 1.1 (next); the answer says it, the scene saves (changed)', (() => { g.run(`HH.open = 'board'; HH.cur = campHubOverRow(P);`); K('Enter'); const r = K('Enter'); return r.used && r.changed && r.say.key === 'camp.hub.restart.done' && J('P.level') === 1 && J('P.mission') === 0 && J('P.levelDone') === 0 && J('Object.keys(P.results).length') === 0 && J('P.techs.length') === 0 && J('P.ore') === 0 && J('P.bonus.fighters') === 0 && J('P.bonus.escorts') === null && J('HH.pick') === null && J('HH.ask') === false && J('campHubSelectable(P)[HH.cur].level + "." + campHubSelectable(P)[HH.cur].n') === '1.1' && J('campHubBoard(P).filter(r => !r.head && r.state === "next").length') === 1; })());
check('what is kept: the ending seen (the story\'s spoiler stays seen); what was saved before is saved over by the scene (changed true)', J('P.revealed') === true);
g.run(`campProgressSave(P); var P3 = campProgressLoad();`);
check('and the save on disk is the new campaign: level 1, mission 0, no results', J('P3.level') === 1 && J('P3.mission') === 0 && J('Object.keys(P3.results).length') === 0);
check('a campaign just begun has one mission to reach (the next) and the row: the list is 2 long', J('campHubSelectable(P).length') === 1 && J('CAMP_HUB.over.board.len(P)') === 2);

// ---- E. the words ----
check('the key line of the list says how to fly one again: Enter opens its briefing, then Launch flies it', /Enter( or click again)?\s+open its briefing, then Launch flies it/.test(J(`uiText('camp.room.hint.board')`)) && J(`uiText('camp.room.hint.board')`).length < 125, J(`uiText('camp.room.hint.board')`));
check('the old save\'s note says what happened and what to do, in plain words', /older version/.test(J(`uiText('camp.hub.oldsave')`)) && /skipped/.test(J(`uiText('camp.hub.oldsave')`)) && /fly it/.test(J(`uiText('camp.hub.oldsave')`)));
check('the question says what goes and how to answer; the row and its description are there', /Enter again: yes/.test(J(`uiText('camp.hub.restart.ask')`)) && /Any other key: no/.test(J(`uiText('camp.hub.restart.ask')`)) && J(`uiText('camp.hub.restart.row')`) === 'Start the campaign over' && /mission 1/.test(J(`uiText('camp.hub.restart.desc')`)) && J(`uiText('camp.hub.legend')`).indexOf('[-] skipped') > 0);
check('the briefing is headed as a mission, not a REPLAY, for a skipped one (the scene\'s head reads t.skipped)', /bf\.t\.replay === true && bf\.t\.skipped !== true/.test(src('src/campbriefdraw.js')));

console.log(failed ? `\nCAMP SKIPPED FAIL (${failed} of ${n})` : `\nCAMP SKIPPED PASS (${n} checks)`); process.exit(failed ? 1 : 0);
