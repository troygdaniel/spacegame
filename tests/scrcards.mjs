// smoke: the Campaign scene's cards in the new look (piece a of the new screens): the models of the pause, mission won, mission lost, level won, Earth refit, tech pick and end cards, the short bonus lines, chips from the key table, word counts near the mock's, the drawing on a stand-in page, and no change with the switch off (plain Node, no Chrome)
// Card space-game-screens-a-cards (Troy, 25 Nov 2026; the mock is docs/screens-mock.html, the plan is the scope report on card space-game-screens-scope). Landing F built the host, the chips and the switch; this piece draws the cards of src/campaignscene.js with them:
//   A. the words: scr.card.*, scr.tech.* and scr.b.* are in the file and the table, shown and never said, and every old key that is spoken is untouched
//   B. the short bonus lines: every bonus of every mission reads short and true ("Under 6:40", "No ships lost", "Lose 2 ships at most"), a singular where it is one
//   C. the pause card: Paused, the goal as a label, a meter and a value, five chips (Restart only in a mission) from the key table, the debug line
//   D. the mission won card (the debrief): score, tick pills for the bonuses, Time Hull Ships lost (Haulers lost when it cost), the rank ring, the replay's best, a tuned run, the chip word
//   E. the mission lost card: the cause, two pills, the tip cut into words and key chips, the chips Again and Title; what is SAID is the old lines
//   F. the level won card: the level, the caption (the first closing line), four numbers, the chip word by what comes next
//   G. the Earth refit and the tech pick: a tile a technology with its digit chip and its numbers as a meter or pills, the fighter row, the chosen tile, the confirm chip
//   H. the end card: the three lines, the star, the chip
//   I. the word counts stay near the mock's (scrWithin) and every chip of every card is an entry of the key table
//   J. the drawing on a stand-in page: one panel in the host, the veil, nothing focusable, taken away by hideCard, hidden under another scene and the H page
//   K. the scene: with the switch OFF each card is drawn as it always was (showCard with its old words); ON, the new card is drawn instead and the old one is not; the spoken lines are the same
// Run: node tests/scrcards.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
g.run(`
  window.__new = (lvl, mi) => { const C = window.C = campNew(lvl || 1, [], { seed: 5, mission: mi || 0 }); C.t = 61000; return C; };
  window.__P = () => ({ results: {}, techs: [], bonus: {}, found: [], ore: 0, credits: 0, level: 1, revealed: false });
  window.__texts = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'text') out.push(x.text); (x.kids || []).forEach(w); })(n); return out; };
  window.__chips = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'chip') out.push(x.id + ':' + x.cap); (x.kids || []).forEach(w); })(n); return out; };
  window.__kinds = (n, k) => { const out = []; (function w(x) { if (!x) return; if (x.k === k) out.push(x); (x.kids || []).forEach(w); })(n); return out; };
  __new();
`);
const texts = e => J(`__texts(${e})`), chips = e => J(`__chips(${e})`), kinds = (e, k) => J(`__kinds(${e}, ${JSON.stringify(k)})`);

console.log('A. the words');
{
  const md = src('content/text/scrcards.md'), keys = [...md.matchAll(/^\| (scr\.[\w.]+) \| (.*) \|$/gm)].map(m => m[1]);
  check('the file has the keys of the cards, the technologies and the bonus lines, none twice, none over 200 rows', keys.length >= 60 && keys.length <= 200 && new Set(keys).size === keys.length && keys.every(k => /^scr\.(card|tech|b)\./.test(k)), keys.length);
  check('every key reads from the table (a missing one would read as its own name)', keys.every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
  check('they are shown, never said: the scr. rule of the voice pack (src/voicepack.js) has no spoken family', keys.every(k => J(`VOICEPACK_FAMILIES.some(r => r.re.test(${JSON.stringify(k)}) && r.why && !r.spoken)`) === true));
  check('the old words are still there for the screens of today (camp.b.*, camp.ui.pausetitle, camp.ui.won, camp.win.result)', ['camp.b.time', 'camp.b.nolost', 'camp.b.noneutrals', 'camp.ui.pausetitle', 'camp.ui.won', 'camp.win.resultconv', 'camp.ui.debrief'].every(k => J(`uiText(${JSON.stringify(k)})`) !== k) && J(`uiText('camp.b.noneutrals')`) === 'Lose no miners');
}

console.log('B. the short bonus lines');
{
  const bonuses = J(`(() => { const out = []; campHubLevels().forEach(l => campMissions(l).forEach((m, i) => (m.bonus || []).forEach(b => out.push({ at: l + '.' + (i + 1), type: b.type, n: b.n, pct: b.pct, secs: b.secs, short: scrBonusText(b), old: campHubBonusText(b) })))); return out; })()`);
  check('every bonus of every mission reads in the new form: no unresolved key, no placeholder left, never longer than the old words', bonuses.length >= 25 && bonuses.every(b => !/^scr\./.test(b.short) && !/[{}]/.test(b.short) && b.short.split(/\s+/).length <= 5 && b.short.length <= b.old.length + 6), bonuses.filter(b => /^scr\./.test(b.short) || /[{}]/.test(b.short)).map(b => b.at + ' ' + b.short).join(' | '));
  const at = (m, t) => (bonuses.find(b => b.at === m && b.type === t) || {}).short;
  check('mission 1.1: Under 6:40, Hull over 60%, No miner lost, Leader killed, No torpedo hits (Troy\'s calls)', [at('1.1', 'time'), at('1.1', 'hull'), at('1.1', 'neutrals'), at('1.1', 'rival'), at('1.1', 'torpedoes')].join('|') === 'Under 6:40|Hull over 60%|No miner lost|Leader killed|No torpedo hits', [at('1.1', 'time'), at('1.1', 'hull'), at('1.1', 'neutrals'), at('1.1', 'rival'), at('1.1', 'torpedoes')].join('|'));
  check('the other lines: No ships lost, Lose 2 ships at most (3.3), Find the cloaked cache keeps its words, Deliver every hauler, Sell 400 ore', bonuses.some(b => b.short === 'No ships lost') && at('3.3', 'lost') === 'Lose 2 ships at most' && bonuses.filter(b => b.type === 'anomaly').every(b => b.short === 'Find the cloaked cache') && at('1.3', 'delivered') === 'Deliver every hauler' && /^Sell \d+ ore$/.test(at('1.2', 'sold')), JSON.stringify(bonuses.filter(b => ['lost', 'sold'].indexOf(b.type) >= 0).map(b => b.at + ' ' + b.short)));
  check('one of something is singular: Lose 1 ship at most (2.2)', at('2.2', 'lost') === 'Lose 1 ship at most', at('2.2', 'lost'));
  check('the time is minutes and seconds from the row\'s own seconds, so it cannot go stale (400 s is 6:40, 100 s is 1:40)', J(`scrBonusText({ type: 'time', secs: 400 })`) === 'Under 6:40' && J(`scrBonusText({ type: 'time', secs: 100 })`) === 'Under 1:40');
}

console.log('C. the pause card');
{
  g.run(`__new(); window.__pm = scrPauseModel(C, { mission: true, debug: '' });`);
  check('Paused, then the goal: a gold label, a meter and a value (the HUD\'s own goal model: Transport arrived 0 / 1)', texts('__pm')[0] === 'Paused' && texts('__pm').indexOf('Transport arrived') === 1 && texts('__pm').indexOf('0 / 1') > 1 && kinds('__pm', 'meter').length === 1 && kinds('__pm', 'meter')[0].pct === 0);
  check('six chips from the key table: Esc Resume, Backspace Restart, H Keys, S Settings, K Ready room, T Title (K: card space-game-b13-a3-a9-pause-settings)', chips('__pm').join() === 'close:Esc,restart:Backspace,help:H,settings:S,hub:K,title:T' && ['Resume', 'Restart', 'Keys', 'Settings', 'Ready room', 'Title'].every(w => texts('__pm').indexOf(w) >= 0));
  check('a level with no mission rows has no Restart (the key restarts a mission only)', (g.run(`window.__pm2 = scrPauseModel(C, { mission: false })`), chips('__pm2').join() === 'close:Esc,help:H,settings:S,hub:K,title:T' && texts('__pm2').indexOf('Restart') < 0));
  check('the debug line (the tuning kit\'s) is kept, small, when there is one', (g.run(`window.__pm3 = scrPauseModel(C, { mission: true, debug: 'N tune' })`), texts('__pm3').indexOf('N tune') > 0));
  g.run(`window.__k = CAMP_KEYS.help.k; CAMP_KEYS.help.k = 'Z';`);
  check('a key moved in the table moves the chip', chips('scrPauseModel(C, { mission: true })').indexOf('help:Z') >= 0);
  g.run(`CAMP_KEYS.help.k = __k;`);
  check('the paragraph of keys, the map line and the panels line of today are not on the card (the H page is one key away), and no word of them is in the model', !texts('__pm').some(t => /Tab|Hold Space|homing missile|picks who/.test(t)));
}

console.log('D. the mission won card (the debrief)');
{
  g.run(`__new(); window.__sc = campScore(C); window.__PP = __P(); window.__wm = scrWonModel(C, __PP, { sc: __sc, title: 'Rim escort', mdone: false });`);
  check('the head: Mission complete, the mission\'s name, the score large (with its comma)', texts('__wm').slice(0, 3).join('|') === 'Mission complete|Rim escort|' + J(`scrNum(__sc.score)`) && kinds('__wm', 'text').find(t => t.cls === 't1').tone === 'gold');
  const pills = kinds('__wm', 'pill');
  check('a pill for each bonus of the mission, ticked when met and dashed when not (the score gives each one its own answer)', pills.length === J('__sc.bonuses.length') && pills.every((p, i) => p.ok === J(`!!__sc.bonuses[${i}].ok`)) && pills.map(p => p.text).join('|') === 'Under 6:40|Hull over 60%|No miner lost|Leader killed|No torpedo hits');
  check('no +250 on each line (a tick is worth that, said once on the mission pick)', !texts('__wm').concat(pills.map(p => p.text)).some(t => /\+\s?\d/.test(t)));
  check('Time, Hull and Ships lost as numbers (the hull a percentage of the cruiser\'s own)', J('__kinds(__wm, "stat").map(s => s.label + "=" + s.value).join()') === 'Time=1:01,Hull=100%,Ships lost=0');
  g.run(`C.carrier.hp = C.carrier.maxHp * 0.5; C.lost = 2; window.__sc2 = campScore(C); window.__wm2 = scrWonModel(C, __PP, { sc: __sc2, title: 'x' });`);
  check('half the hull is 50%, and haulers lost (a score penalty) get a number of their own, only when there were some', J('__kinds(__wm2, "stat").map(s => s.label + "=" + s.value).join()') === 'Time=1:01,Hull=50%,Ships lost=0,Haulers lost=2');
  const ring = kinds('__wm', 'ring')[0];
  check('the rank is a gold ring (the way to the next rank, the rank\'s number inside) and its name; Rank, not Promoted, when nothing was earned', ring && ring.tone === 'gold' && ring.text === '1' && texts('__wm').indexOf('Rank') > 0 && texts('__wm').indexOf('Cadet') > 0 && texts('__wm').indexOf('Promoted') < 0);
  g.run(`__PP.promo = { from: 0, to: 1 }; window.__wm3 = scrWonModel(C, __PP, { sc: __sc, title: 'x' });`);
  check('after a promotion it says Promoted', texts('__wm3').indexOf('Promoted') > 0 && texts('__wm3').indexOf('Rank') < 0);
  check('the chip: Enter, Ready room; at the end of a level it says Continue (the level card follows)', chips('__wm').join() === 'pick:Enter' && texts('__wm').indexOf('Ready room') > 0 && (g.run(`window.__wm4 = scrWonModel(C, __P(), { sc: __sc, title: 'x', mdone: true })`), texts('__wm4').indexOf('Continue') > 0 && texts('__wm4').indexOf('Ready room') < 0));
  g.run(`window.__wm5 = scrWonModel(C, __P(), { sc: __sc, title: 'x', replay: { first: false, improved: true, best: 4500 } });`);
  check('a replay says Replay, its best, and New best when it is one (the old card said both in sentences)', texts('__wm5')[0] === 'Replay' && kinds('__wm5', 'pill').some(p => p.text === 'Best 4,500') && kinds('__wm5', 'pill').some(p => p.text === 'New best' && p.ok === true));
  g.run(`window.__wm6 = scrWonModel(C, __P(), { sc: __sc, title: 'x', replay: { first: false, improved: false, best: 4500 } });`);
  check('a replay that did not beat the best has the best and no New best', kinds('__wm6', 'pill').some(p => p.text === 'Best 4,500') && !kinds('__wm6', 'pill').some(p => p.text === 'New best'));
  g.run(`window.__wm7 = scrWonModel(C, __P(), { sc: __sc, title: 'x', tuned: true });`);
  check('a tuned run says its score and rank are not kept, and shows no rank ring', kinds('__wm7', 'pill').some(p => p.text === 'Tuned run: not kept') && kinds('__wm7', 'ring').length === 0);
}

console.log('E. the mission lost card');
{
  g.run(`__new(); window.__lm = scrLostModel(C, 'convoy');`);
  check('the head: Mission lost in the hostile colour, then the cause as the old card says it (campLoseLines)', texts('__lm')[0] === 'Mission lost' && kinds('__lm', 'text')[0].tone === 'pink' && texts('__lm')[1] === J(`campLoseLines(C, 'convoy')[0]`) && texts('__lm')[1] === 'The transport is lost.');
  check('two pills: how long it lasted and the kills (the wave count is gone: an escort has no waves on the HUD)', kinds('__lm', 'pill').map(p => p.text).join('|') === '1:01|0 kills' && !texts('__lm').some(t => /wave/i.test(t)));
  check('the tip is a tile: Next time, then words and the two keys as chips from the key table (E then Enter)', texts('__lm').indexOf('Next time') > 0 && chips('__lm').indexOf('tipfriendlies:E') >= 0 && chips('__lm').indexOf('tiporder:Enter') > chips('__lm').indexOf('tipfriendlies:E') && texts('__lm').indexOf('Guard the transport: pick it') > 0 && texts('__lm').indexOf('then') > 0);
  check('the chips of the card: Enter Again, Esc Ready room (docs/screens-flow.html step 4: re-pinned, it had two) and T Title', chips('__lm').slice(-3).join() === 'pick:Enter,close:Esc,title:T' && texts('__lm').indexOf('Again') > 0 && texts('__lm').indexOf('Ready room') > texts('__lm').indexOf('Again'));
  check('what is SAID is the old lines, unchanged: the filled tip still names the real keys', J(`campLoseLines(C, 'convoy')[2]`) === 'Guard the transport: pick it (E), then Enter.' && J(`campLoseLines(C, 'convoy', scrTipFill())[2].indexOf('\\u0001') > 0`) === true);
  check('a reason with no tip (the debug key\'s) has no tile', (g.run(`window.__lm2 = scrLostModel(C, 'debug')`), kinds('__lm2', 'tile').length === 0 && texts('__lm2')[0] === 'Mission lost'));
  check('the tower tip names the missile key and the wing as one sentence with its chip', (g.run(`window.__lm3 = scrLostModel(C, 'carrier')`), true) && J(`scrTipSegments('Fire missiles (\\u0001missile\\u0001) at the towers. Send the wing at them.')`).map(s => s.text || '[' + s.chip + ']').join('|') === 'Fire missiles|[missile]|at the towers. Send the wing at them');
  check('a level that is not a mission list row says Level N lost', (g.run(`window.__lm4 = scrLostModel(C, 'carrier', { mission: false, level: 2 })`), texts('__lm4')[0] === 'Level 2 lost'));
  check('one kill is singular', (g.run(`C.kills = 1; window.__lm5 = scrLostModel(C, 'convoy'); C.kills = 0;`), kinds('__lm5', 'pill').map(p => p.text).join('|') === '1:01|1 kill'));
}

console.log('F. the level won card');
{
  g.run(`__new(); C.delivered = 1; window.__lw = scrLevelWonModel(C, __P(), 1, false);`);
  check('Level 1 won, the level\'s name large, the first closing line as the caption', texts('__lw').slice(0, 3).join('|') === 'Level 1 won|' + J('CAMP.levels[1].name') + '|' + J(`campStory(1, 'after', false)[0]`) && kinds('__lw', 'text')[0].tone === 'ok');
  check('four numbers: Time, Hull, Haulers home (this level has a convoy), Ships lost', J('__kinds(__lw, "stat").map(s => s.label + "=" + s.value).join()') === 'Time=1:01,Hull=100%,Haulers home=1 / 1,Ships lost=0');
  check('the one chip: Enter, Earth refit (level 1 has the refit)', chips('__lw').join() === 'pick:Enter' && texts('__lw').indexOf('Earth refit') > 0);
  g.run(`window.__lw2 = scrLevelWonModel(__new(2), __P(), 2, false);`);
  check('a level with no convoy has three numbers; level 2 has a pick, so the chip says Technology', J('__kinds(__lw2, "stat").map(s => s.label).join()') === 'Time,Hull,Ships lost' && texts('__lw2').indexOf('Technology') > 0);
  g.run(`window.__lw3 = scrLevelWonModel(__new(3), __P(), 3, true);`);
  check('a card brought back from the save has no battle to count: no numbers', kinds('__lw3', 'stat').length === 0 && texts('__lw3')[0] === 'Level 3 won');
  check('the closing lines are still SPOKEN: the story is not touched (three lines for level 1), and the card shows only the first', J(`campStory(1, 'after', false).length`) === 3 && !texts('__lw').some(t => /recalls the cruiser/.test(t)));
}

console.log('G. the Earth refit and the tech pick');
{
  g.run(`window.__ch = campTechChoices(1, { found: [], techs: [] }); window.__rm = scrRefitModel({ choices: __ch, pick: null, f: 0, w: { ore: 0, credits: 100 }, P: __P() });`);
  check('level 1 offers the shield grid and the beam turrets, each a tile with its digit chip (1, 2), its name and its numbers', J('__ch').join() === 'shield,beam' && chips('__rm').slice(0, 2).join() === 'd1:1,d2:2' && texts('__rm').indexOf('Shield grid') > 0 && texts('__rm').indexOf('Beam turrets') > 0);
  check('the shield grid is a meter and a number: Damage taken, 60% (from the same numbers the ready room says in words)', texts('__rm').indexOf('Damage taken') > 0 && kinds('__rm', 'meter')[0].pct === 60 && texts('__rm').indexOf('60%') > 0);
  check('the beam turrets are three pills: Damage x2, Reach 500 to 750, Shots pass through', ['Damage x2', 'Reach 500 to 750', 'Shots pass through'].every(t => kinds('__rm', 'pill').some(p => p.text === t)));
  check('credits and ore are two pills with their numbers in gold, and the heading says Choose one technology', kinds('__rm', 'pill').filter(p => p.lead).map(p => p.lead + ' ' + p.text).join('|') === '100 credits|0 ore' && texts('__rm').indexOf('Choose one technology') > 0);
  check('the fighter row has its chip (4), its words and its cost from the table (25, credits then ore), and nothing is bought: no pill', chips('__rm').indexOf('d4:4') > 0 && texts('__rm').indexOf('One more fighter') > 0 && texts('__rm').indexOf('25') > 0 && texts('__rm').indexOf('credits, then ore') > 0 && !kinds('__rm', 'pill').some(p => /bought/.test(p.text)) && !kinds('__rm', 'tile').slice(-1)[0].dim);
  check('the first technology is LIT when the card opens (card space-game-refit-card-stuck): the bright outline is on tile 1, and the keys are on the card: Left Right Choose, Enter Take (no Continue chip waiting for a pick)', kinds('__rm', 'tile').map(t => !!t.on).join() === 'true,false,false' && chips('__rm').slice(-3).join() === 'left:Left,right:Right,pick:Enter' && texts('__rm').indexOf('Choose') > 0 && texts('__rm').indexOf('Take') > 0 && texts('__rm').indexOf('Continue') < 0);
  g.run(`window.__rm2 = scrRefitModel({ choices: __ch, cur: 1, f: 2, w: { ore: 0, credits: 10 }, P: __P() });`);
  check('the light moves with the arrows: tile 2 is lit, still Enter Take; fighters bought show as a pill; with 10 credits the fighter row is dim (cannot afford one)', kinds('__rm2', 'tile').filter(t => t.on).length === 1 && kinds('__rm2', 'tile')[1].on === true && chips('__rm2').indexOf('pick:Enter') > 0 && texts('__rm2').indexOf('Take') > 0 && kinds('__rm2', 'pill').some(p => p.text === '2 bought') && kinds('__rm2', 'tile').slice(-1)[0].dim === true);
  g.run(`window.__rm2f = scrRefitModel({ choices: __ch, cur: 2, f: 0, w: { ore: 0, credits: 100 }, P: __P() });`);
  check('with the light on the fighter row (Down) that row is lit and Enter says Buy', kinds('__rm2f', 'tile').slice(-1)[0].on === true && kinds('__rm2f', 'tile').slice(0, -1).every(t => !t.on) && texts('__rm2f').indexOf('Buy') > 0 && texts('__rm2f').indexOf('Take') < 0);
  g.run(`window.__rm3 = scrRefitModel({ choices: ['shield', 'beam', 'lens', 'blink'], pick: null, f: 0, w: { ore: 50, credits: 0 }, P: __P() });`);
  check('what was looted from a cloaked cache is chosen with 6 7 8 (the keys the refit has today: refitKey), so the third and fourth tiles say 6 and 7', chips('__rm3').slice(0, 4).join() === 'd1:1,d2:2,d3:3,d6:6' || chips('__rm3').slice(0, 4).join() === 'd1:1,d2:2,d6:6,d7:7', chips('__rm3').join());
  check('every technology of the game has numbers to show: a meter or pills, each as the table gives them', J(`Object.keys(CAMP.tech).every(id => scrTechNodes(id, __P()).length > 0 || id === 'blink' && !CAMP_BLINK.on)`) === true);
  g.run(`window.__pk = scrPickModel({ choices: ['shield', 'beam', 'lens'], P: __P() });`);
  check('the plain pick: Choose a technology, the tiles with 1 2 3, the first lit, no fighter row, and the keys on the card (Left Right Choose, Enter Take: a digit takes one at once)', texts('__pk')[0] === 'Choose a technology' && chips('__pk').join() === 'd1:1,d2:2,d3:3,left:Left,right:Right,pick:Enter' && kinds('__pk', 'tile').map(t => !!t.on).join() === 'true,false,false' && !texts('__pk').some(t => /fighter|Continue/.test(t)) && texts('__pk').indexOf('Take') > 0);
}

console.log('H. the end card');
{
  g.run(`window.__em = scrEndModel(['This is not their home. It is an outpost.', 'The war is not over.', 'Their data points to Kepler.'], 'Kepler 9');`);
  check('the three lines large and centred, the star by its name in capitals, a lab over them, and the Enter chip with Title', texts('__em').filter(t => /outpost|war is not over\.|Kepler\.$/.test(t)).length === 3 && kinds('__em', 'star')[0].text === 'KEPLER 9' && texts('__em')[0] === 'The war is not over' && chips('__em').join() === 'pick:Enter' && texts('__em').indexOf('Title') > 0 && J('__em.ctr') === true);
  check('the old words are the lines: campEnding gives them, spoken as before (not changed by this piece)', J('campEnding().length') === 3);
}

console.log('I. the word counts and the chips');
{
  const models = { pause: 'scrPauseModel(__new(), { mission: true })', won: 'scrWonModel(__new(), __P(), { sc: campScore(C), title: "Rim escort", mdone: false })', lost: 'scrLostModel(__new(), "convoy")', lvlwon: 'scrLevelWonModel(__new(), __P(), 1, false)', earthrefit: 'scrRefitModel({ choices: __ch, pick: null, f: 0, w: { ore: 0, credits: 100 }, P: __P() })' };
  for (const k of Object.keys(models)) {
    const w = J(`scrNodeWords(${models[k]})`), mock = J(`SCR_BUDGET.${k}.mock`), today = J(`SCR_BUDGET.${k}.today`);
    check(k + ': ' + w + ' words and numbers, the mock\'s ' + mock + ' (at most ' + J(`scrWordsMax('${k}')`) + '), today\'s ' + today + ': within the budget and far under today', J(`scrWithin('${k}', { n: 1 })`) === true && w <= J(`scrWordsMax('${k}')`) && w < today * 0.8, w);
  }
  const bad = [];
  for (const k of Object.keys(models)) for (const c of chips(models[k])) { const [id, cap] = [c.slice(0, c.indexOf(':')), c.slice(c.indexOf(':') + 1)]; if (!J(`scrChipInTable({ id: ${JSON.stringify(id)}, k: ${JSON.stringify(cap)} })`)) bad.push(k + ':' + c); }
  check('every chip of every card is an entry of the key table (scrChipInTable)', bad.length === 0, bad.join(' '));
  check('no card has a key cap written in the code: no quoted single capital, no chip text in the models', !/['"][A-Z]['"]/.test(code('src/scrcards.js') + code('src/scrcardsdraw.js')) && !/['"](Enter|Esc|Backspace)['"]/.test(code('src/scrcards.js')));
}

console.log('J. the drawing on a stand-in page');
g.run(`
  window.__writes = 0; window.__tags = []; window.__attrs = []; window.__rects = [];
  const mk = tag => { __tags.push(tag); const e = { tag, children: [], parentNode: null, _cls: '', _text: '', listeners: {}, style: new Proxy({ setProperty(k, v) { __writes++; this[k] = v; } }, { set(o, k, v) { if (k !== 'setProperty') __writes++; o[k] = v; return true; } }) };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { __writes++; e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { __writes++; e._text = v; } });
    e.attrs = {}; e.setAttribute = (k, v) => { __attrs.push(k); e.attrs[k] = String(v); }; e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } }); return e; };
  window.document = { createElement: mk, body: mk('body') };
  window.__scene = (extra) => { const ch = { setScrollFactor() { return ch; }, setDepth() { return ch; }, destroy() { ch.gone = true; } };
    const s = Object.assign({ mode: '', camp: C, P: __P(), level: 1, mi: 0, calls: [], said: null, scrHost: null, scrCard: null, scrCardEvents: false, scrCovered: false, card: null, panel: false, handlers: {},
      hideCard() { if (this.card) this.card.forEach(x => x.destroy()); this.card = null; this.panel = false; }, cardPrep() { this.hideCard(); }, showCard(...a) { this.calls.push(a); }, say(l) { this.said = l; },
      bonusText: Campaign.prototype.bonusText, game: { canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) } },
      events: { on(nm, f) { s.handlers[nm] = f; }, once(nm, f) { s.handlers['once.' + nm] = f; } }, add: { rectangle: (...a) => { ch.args = a; __rects.push(ch); return ch; } } }, extra || {}); return s; };
`);
{
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene(); window.__ok = scrCardShow(S, scrPauseModel(C, { mission: true }), 0.72);`);
  check('a card is one panel in the host: the root is on the page, and the card is in it, with the model\'s width, top and em gap', J('__ok') === true && J('document.body.children.length') === 1 && J('S.scrHost.root.children.length') === 1 && J('S.scrHost.root.children[0].style.width') === '30em' && J('S.scrHost.root.children[0].style.top') === '30%' && /sc-p/.test(J('S.scrHost.root.children[0]._cls')));
  check('the scene\'s own card list holds the veil and the panel\'s handle, and says a card is up (what hideCard and the keys read)', J('S.card.length') === 2 && J('S.panel') === true && J('__rects.length') === 1 && J('__rects[0].args[5]') === 0.72);
  check('the texts, chips and the meter are in it: Paused, six chips with the table\'s caps, the goal meter', J(`(function f(e) { let t = []; (function w(x) { if (x._text) t.push(x._text); x.children.forEach(w); })(e); return t; })(S.scrHost.root).indexOf('Paused') >= 0`) && J(`(function f(e) { let t = 0; (function w(x) { if (x.attrs && x.attrs['data-key']) t++; x.children.forEach(w); })(e); return t; })(S.scrHost.root)`) === 6);
  check('nothing is focusable and nothing takes a click: only div, span, i and b were made, no tabindex, no handler on any element', J('__tags.every(t => ["div", "span", "i", "b", "body"].indexOf(t) >= 0)') && J('__attrs.indexOf("tabindex") < 0') && J(`(function f(e) { let t = 0; (function w(x) { t += Object.keys(x.listeners || {}).length; x.children.forEach(w); })(e); return t; })(S.scrHost.root)`) === 0);
  g.run(`S.hideCard();`);
  check('hideCard takes the card off the page (and the veil with it); the empty host stays, drawing nothing', J('S.scrHost.root.children.length') === 0 && J('__rects[0].gone') === true && J('S.card') === null && J('S.scrCard') === null);
  g.run(`scrCardShow(S, scrPauseModel(C, { mission: true }));`);
  check('Settings opening over the pause card (the scene is paused) hides it at once and resume shows it again', (g.run(`S.handlers.pause()`), J('S.scrHost.root.style.display') === 'none') && (g.run(`S.handlers.resume()`), J('S.scrHost.root.style.display') === ''));
  g.run(`S.ck = { open: true }; scrCardSync(S);`);
  check('the H page over the card hides the CARD only (the keys page of the new look is a panel in the same host: card space-game-screens-batch-fixes), and when it closes the card is back', J('S.scrCard.el.style.display') === 'none' && J('S.scrHost.root.style.display') === '' && (g.run(`S.ck.open = false; scrCardSync(S)`), J('S.scrCard.el.style.display') === ''));
  g.run(`S.placeLabels = [{ active: true, visible: true, setVisible(v) { this.visible = v; return this; } }]; scrCardSync(S);`);
  check('the flight\'s canvas world names (EARTH ...) are hidden while a card is up, and come back with the hideCard', J('S.placeLabels[0].visible') === false && (g.run(`S.hideCard()`), J('S.placeLabels[0].visible') === true));
  g.run(`scrCardShow(S, scrPauseModel(C, { mission: true }));`);
  g.run(`S.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 }); scrCardSync(S);`);
  check('a resized window moves the host with it (the em halves)', J('S.scrHost.root.style.width') === '640px' && J('S.scrHost.root.style.fontSize') === '9.6px');
  g.run(`S.handlers['once.shutdown']();`);
  check('the scene ending takes the host off the page', J('document.body.children.length') === 0);
  check('no page, no canvas: no card is drawn (the scene draws the old one)', J(`scrCardShow({}, scrPauseModel(C, {}))`) === false && J(`scrCardShow(__scene({ game: {} }), scrPauseModel(C, {}))`) === false && J('scrCardSync({})') === false);
  check('a stand-in scene that answers any property does not count as a card (the per-frame sync is a no-op for it)', J('scrCardSync(new Proxy(function () {}, { get: () => function () {} }))') === false);
  g.run(`CAMP.flags.screens = false;`);
}

console.log('K. the scene: the switch off draws the old cards, on draws the new, the same words are spoken');
{
  const proto = 'Campaign.prototype';
  const run = (fn, extra, flag, arg) => { g.run(`__new(); CAMP.flags.screens = ${flag}; window.S = __scene(Object.assign({ tuned: false, mdone: false, replay: false, hub: {} }, ${JSON.stringify(extra || {})})); ${proto}.${fn}.call(S${arg ? ', ' + JSON.stringify(arg) : ''});`); };
  run('showPause', {}, false);
  check('OFF: the pause is the old card (showCard with PAUSED and its lines), nothing of the new look is made', J('S.calls.length') === 1 && J('S.calls[0][0]') === 'PAUSED' && J('S.calls[0][4]') === true && J('document.body.children.length') === 0 && J('S.scrHost') === null);
  run('showPause', {}, true);
  check('ON: the new pause card is drawn and the old one is not (showCard is never called)', J('S.calls.length') === 0 && J('S.scrCard !== null && S.scrCard.id') === 'pause' && J('S.mode') === 'pause');
  run('showLost', {}, false, 'convoy');
  check('OFF: the lost card is the old one', J('S.calls.length') === 1 && /MISSION LOST/.test(J('S.calls[0][0]')) && J('S.calls[0][1].length') === 3);
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ level: 1 }); Campaign.prototype.showLost.call(S, 'convoy');`);
  check('ON: the new lost card is drawn, and the voice says the cause and the tip as before (the numbers line is for reading)', J('S.calls.length') === 0 && J('S.scrCard.id') === 'lost' && J('S.said').join('|') === J(`[campLoseLines(C, 'convoy')[0], campLoseLines(C, 'convoy')[2]]`).join('|'));
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ level: 1, mi: 0, mdone: false, tuned: false, replay: false }); window.__scoreSaid = uiText('camp.ui.score', { score: campScore(C).score }); Campaign.prototype.showDebrief.call(S, campScore(C));`);
  check('ON: the debrief is the new won card, the mode is debrief, and the score is said as before', J('S.calls.length') === 0 && J('S.scrCard.id') === 'won' && J('S.mode') === 'debrief' && J('S.said').join() === J('__scoreSaid'));
  g.run(`__new(); CAMP.flags.screens = false; window.S = __scene({ level: 1, mi: 0, mdone: false, tuned: false, replay: false, nextMission() {} }); Campaign.prototype.showDebrief.call(S, campScore(C));`);
  check('OFF: the debrief is the old card, with the old title and its lines, and the mode is debrief', J('S.calls.length') === 1 && /MISSION COMPLETE/.test(J('S.calls[0][0]')) && J('S.mode') === 'debrief');
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ level: 1 }); Campaign.prototype.showWon.call(S);`);
  check('ON: the level won card; the three closing lines are said (camp.l1.after.1 to .3), unchanged', J('S.scrCard.id') === 'lvlwon' && J('S.said').join('|') === J(`campStory(1, 'after', false)`).join('|') && J('S.mode') === 'won');
  g.run(`__new(); CAMP.flags.screens = false; window.S = __scene({ level: 1 }); Campaign.prototype.showWon.call(S);`);
  check('OFF: the level won card is the old one, with the result line added', J('S.calls.length') === 1 && J('S.calls[0][0]') === 'LEVEL 1 WON' && /Won in/.test(J('S.calls[0][1]').join(' ')));
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ level: 1, choices: ['shield', 'beam'], refit: { pick: null, f: 0, w: { ore: 0, credits: 50 } } }); Campaign.prototype.paintRefit.call(S);`);
  check('ON: the refit is the new panel; the keys are refitKey\'s, as ever: 1 picks, 4 buys, Enter goes on', J('S.calls.length') === 0 && J('S.scrCard.id') === 'earthrefit');
  g.run(`S.refit = { pick: null, f: 0, w: { ore: 0, credits: 50 } }; S.refitKey = Campaign.prototype.refitKey; S.next = () => {}; S.paintRefit = Campaign.prototype.paintRefit; S.refitKey('Digit1'); S.refitKey('Digit4');`);
  check('a key repaints the card in place: one panel at a time (the old one is gone), the pick lit, a fighter bought, credits spent', J('S.scrHost.root.children.length') === 1 && J('S.refit.pick') === 'shield' && J('S.refit.f') === 1 && J('S.refit.w.credits') === 25);
  g.run(`__new(); CAMP.flags.screens = false; window.S = __scene({ level: 1, choices: ['shield', 'beam'], refit: { pick: null, f: 0, w: { ore: 0, credits: 50 } } }); Campaign.prototype.paintRefit.call(S);`);
  check('OFF: the refit is the old card (EARTH REFIT)', J('S.calls.length') === 1 && J('S.calls[0][0]') === 'EARTH REFIT');
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ level: 2, P: Object.assign(__P(), { level: 2 }) }); Campaign.prototype.showPick.call(S);`);
  check('ON: the plain tech pick is the new panel too (level 2)', J('S.calls.length') === 0 && J('S.scrCard.id') === 'tech' && J('S.mode') === 'pick');
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ level: 3 }); Campaign.prototype.showEnd.call(S);`);
  check('ON: the end card: the three lines are said as before, and no canvas star is drawn (the card has its own)', J('S.scrCard.id') === 'end' && J('S.said.length') === 3 && J('S.mode') === 'end' && J('S.calls.length') === 0);
  g.run(`__new(); CAMP.flags.screens = true; window.S = __scene({ game: {} }); Campaign.prototype.showPause.call(S);`);
  check('a scene with no canvas to draw on falls back to the old card (the scene is whole), and draws nothing new', J('S.calls.length') === 1 && J('S.calls[0][0]') === 'PAUSED' && J('S.scrCard === null'));
  g.run(`CAMP.flags.screens = false;`);
}
{
  const cs = code('src/campaignscene.js');
  check('every use of the new look in the scene is behind campNewCard (scrOn): no other call of the models or the drawing', (cs.match(/scr(Pause|Won|Lost|LevelWon|Refit|Pick|End)Model/g) || []).length === 7 && (cs.match(/campNewCard\(this, /g) || []).length === 7 && (cs.match(/scrCardShow\(/g) || []).length === 1);
  check('no key, rule, number or sound of the scene changed: the key handler and the keys of the cards are as they were (refitKey, pickKey, 4 buys a fighter, the mode checks of onKey); the arrows and Enter are added by card space-game-refit-card-stuck', /refitKey\(c\)/.test(cs) && /c === 'Digit4'\) \{ if \(!buy\(\)\)/.test(cs) && /this\.mode === 'pause'/.test(cs) && /this\.mode === 'lost'/.test(cs));
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
