// smoke: the ready room and its screens in the new look (piece c of the new screens): the models of the next-mission card, the refit, the rank and the mission pick, chips from the key table, word counts near the mock's, the drawing on a stand-in page, the mouse on the tiles, and no change with the switch off (plain Node, no Chrome)
// Card space-game-screens-c-hub (Troy, 25 Nov 2026; the mock is docs/screens-mock.html, direction A for the ready room). Landing F built the host; piece a the cards; this piece draws the ready room's screens with them:
//   A. the words: scr.hub.* are in the file and the table, shown and never said
//   B. the ready room: the station and level, Esc Title, the next mission with its goal line and the L Briefing chip, three rows with one number each and a digit chip, the pilots as three rings
//   C. the refit: credits and ore pills, the fighter row with the wing as a meter and what is missing, the tech fitted, Enter Buy, Backspace Undo, Left Back
//   D. the rank: a ring, the name, the points to the next, six tiles with the ships each adds, the one held lit
//   E. the mission pick: nine tiles (lit, Next, dim, dashed when skipped), the bar with the goal line and the mission's own bonus count, no Start over row
//   F. every chip of every screen is an entry of the key table, and the word counts stay near the mock's
//   G. the keys are the hub's own: with the switch on the cursor never stands on a Start over row (it lives on Settings), with it off it does
//   HB. the scene: the switch off draws nothing new; on, the canvas glass is hidden, the hangar dimmed and the panels drawn; a tile takes the mouse; a page in front hides the panels; off again brings the glass back
// Run: node tests/scrhub.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
g.run(`
  window.__fresh = () => { window.PR = campProgressNew(); window.HB = campHubNew(PR, {}); return PR; };
  window.__flown = () => { __fresh(); PR.level = 2; PR.mission = 0; PR.techs = ['shield']; PR.ore = 100; PR.credits = 60; PR.bonus = { fighters: 1, escorts: 0 };
    PR.results = { '1.1': { score: 4280, bonuses: ['swift', 'hull', 'miner'], t: 306, hull: 600, lost: 0, tries: 1 }, '1.3': { score: 3100, bonuses: ['delivered'], t: 400, hull: 400, lost: 1, tries: 1 } }; HB = campHubNew(PR, {}); return PR; };
  window.__texts = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'text') out.push(x.text); (x.kids || []).forEach(w); })(n); return out; };
  window.__chips = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'chip') out.push(x.id + ':' + x.cap); (x.kids || []).forEach(w); })(n); return out; };
  window.__kinds = (n, k) => { const out = []; (function w(x) { if (!x) return; if (x.k === k) out.push(x); (x.kids || []).forEach(w); })(n); return out; };
  __fresh();
`);
const texts = e => J(`__texts(${e})`), chips = e => J(`__chips(${e})`), kinds = (e, k) => J(`__kinds(${e}, ${JSON.stringify(k)})`);

console.log('A. the words');
{
  const md = src('content/text/scrhub.md'), keys = [...md.matchAll(/^\| (scr\.hub\.[\w.]+) \| (.*) \|$/gm)].map(m => m[1]);
  check('the file has the ready room\'s keys, none twice, under 200 rows', keys.length >= 35 && keys.length <= 200 && new Set(keys).size === keys.length, keys.length);
  check('every key reads from the table, and is shown and never said (the scr. rule of the voice pack)', keys.every(k => J(`uiText(${JSON.stringify(k)})`) !== k && J(`VOICEPACK_FAMILIES.some(r => r.re.test(${JSON.stringify(k)}) && r.why && !r.spoken)`) === true));
  check('the old words stay for the screens of today (camp.hub.row.board, camp.hub.restart.row, camp.hub.oldsave)', ['camp.hub.row.board', 'camp.hub.restart.row', 'camp.hub.oldsave', 'camp.room.desc.board'].every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
}

console.log('B. the ready room');
{
  g.run(`__fresh(); window.__rm = scrReadyModel(PR, HB, { station: 'Lunar Base' });`);
  check('the top bar: the station, a dot, the level (Level 1, The rim run), and Esc with Title', texts('__rm').slice(0, 4).join('|') === 'Lunar Base|\u00b7|Level 1, ' + J('CAMP.levels[1].name') + '|Title' && chips('__rm')[0] === 'close:Esc');
  check('the card: Next, mission 1 of 9, the mission\'s name large, its goal line (the briefing\'s own first line), and the L Briefing chip', texts('__rm').indexOf('Next \u00b7 mission 1 of 9') > 0 && texts('__rm').indexOf('Rim escort') > 0 && texts('__rm').indexOf(J('scrGoalLine(1, 0)')) > 0 && chips('__rm').indexOf('launch:L') > 0 && texts('__rm').indexOf('Briefing') > 0);
  check('three rows, each a digit chip, a name and one number: 1 Missions 0 of 9, 2 Refit 0 credits, 3 Rank Cadet', chips('__rm').filter(c => /^d\d:/.test(c)).join() === 'd1:1,d2:2,d3:3' && ['Missions', '0 of 9', 'Refit', '0 credits', 'Rank', 'Cadet'].every(t => texts('__rm').indexOf(t) > 0));
  check('the first row is the lit one (the hub\'s own cursor), the others are flat; every row is a click target (a click id)', kinds('__rm', 'tile').map(t => !!t.on).join() === 'true,false,false' && kinds('__rm', 'tile').every(t => t.flat && /^row:\d$/.test(t.click)));
  const tiles0 = kinds('__rm', 'tile'), pickChips = t => { const out = []; (function w(x) { if (!x) return; if (x.k === 'chip' && x.id === 'pick') out.push(x); (x.kids || []).forEach(w); })(t); return out; };
  check('with a row chosen its key is IN the lit tile: ONE Enter chip, inside the picked row\'s tile, after its number (the card\'s hub-polish: a lone Enter OPEN chip after Rank read as a fourth button), and no Open word, no loose chip in the row', chips('__rm').filter(c => c === 'pick:Enter').length === 1 && tiles0.map(t => pickChips(t).length).join() === '1,0,0' && texts('__rm').indexOf('Open') < 0 && texts('__rm').indexOf('Launch') < 0 && (() => { const row = kinds('__rm', 'row').find(r => (r.kids || []).some(k => k.k === 'tile')); return !!row && row.kids.every(k => k.k === 'tile'); })());
  check('every chip of the row is as wide as its words and never shrinks (fit: the Missions chip\'s "8 of 9" ran past its border), and the row wraps rather than overflow the card', tiles0.every(t => t.fit === true) && (() => { const row = kinds('__rm', 'row').find(r => (r.kids || []).some(k => k.k === 'tile')); return !!row && row.wrap === true; })() && /n\.fit \? '0 0 auto' : ''/.test(src('src/scrcardsdraw.js')));
  check('three pilots as full rings with their digits, Pilots ready and their names', kinds('__rm', 'ring').map(r => r.v + ':' + r.text).join() === '100:1,100:2,100:3' && texts('__rm').indexOf('Pilots ready') > 0 && texts('__rm').indexOf('Wedge, Kara, Apollo') > 0);
  g.run(`HB.row = 3; window.__rm2 = scrReadyModel(PR, HB, { station: 'x' });`);
  check('with the Launch row chosen (4 or Down) Enter launches: the card says so (Enter Launch) and no row is lit', chips('__rm2').indexOf('pick:Enter') > 0 && texts('__rm2').indexOf('Launch') > 0 && texts('__rm2').indexOf('Open') < 0 && kinds('__rm2', 'tile').every(t => !t.on));
  g.run(`__flown(); window.__rm3 = scrReadyModel(PR, HB, { station: 'Proxima Gate', oldNote: true, msg: { text: 'Replay: Mine and defend. X: back.', ok: true } });`);
  check('a campaign in progress: the next mission is 2.1, mission 4 of 9, with 2 of 9 flown, 60 credits, and the rank the score earned', texts('__rm3').indexOf('Next \u00b7 mission 4 of 9') > 0 && texts('__rm3').indexOf('Resources') > 0 && texts('__rm3').indexOf('2 of 9') > 0 && texts('__rm3').indexOf('60 credits') > 0 && texts('__rm3').indexOf(J('campHubRank(PR).name')) > 0 && texts('__rm3').indexOf('Level 2, ' + J('CAMP.levels[2].name')) > 0);
  check('the older save is told in a line (the dashed tile, not the [-] mark), and the last answer of a key in another', texts('__rm3').some(t => /dashed tile/.test(t)) && !texts('__rm3').some(t => /\[-\]/.test(t)) && texts('__rm3').indexOf('Replay: Mine and defend. X: back.') > 0);
  g.run(`HB.pick = { level: 1, i: 0 }; window.__rm4 = scrReadyModel(PR, HB, {}); HB.pick = { level: 1, i: 1 }; window.__rm5 = scrReadyModel(PR, HB, {});`);
  check('a mission picked to fly again is the card: Replay, mission 1 of 9, Rim escort; a skipped one says Skipped', texts('__rm4').indexOf('Replay \u00b7 mission 1 of 9') > 0 && texts('__rm4').indexOf('Rim escort') > 0 && texts('__rm5').indexOf('Skipped \u00b7 mission 2 of 9') > 0);
}

console.log('C. the refit');
{
  g.run(`__fresh(); window.__fm = scrHubRefitModel(PR, HB, {});`);
  check('Refit, credits and ore as pills with their numbers in gold, no tech yet', texts('__fm')[0] === 'Refit' && kinds('__fm', 'pill').filter(p => p.lead).map(p => p.lead + ' ' + p.text).join('|') === '0 credits|0 ore' && texts('__fm').indexOf('No tech fitted yet.') > 0);
  check('the fighter row: Wing 8 as a blue meter to 9, the cost from the table (25) and what is missing (Need 25 more)', texts('__fm').indexOf('Wing 8') > 0 && texts('__fm').indexOf('9') > 0 && kinds('__fm', 'meter')[0].tone === 'blue' && Math.abs(kinds('__fm', 'meter')[0].pct - J('Math.round(1000 * 8 / scrWingCap()) / 10')) < 0.2 && texts('__fm').indexOf('25') > 0 && texts('__fm').indexOf('Need 25 more') > 0);
  check('the chips: Enter Buy, Backspace Undo, Left Back', chips('__fm').join() === 'pick:Enter,giveback:Backspace,left:Left' && ['Buy', 'Undo', 'Back'].every(t => texts('__fm').indexOf(t) > 0));
  g.run(`PR.credits = 30; window.__fm2 = scrHubRefitModel(PR, HB, {});`);
  check('with the credits it says Can buy; the row is lit', texts('__fm2').indexOf('Can buy') > 0 && kinds('__fm2', 'tile')[0].on === true);
  g.run(`PR.bonus = { fighters: 3 }; window.__fm3 = scrHubRefitModel(PR, HB, {});`);
  check('three bought (the most): No more, and a pill saying 3 bought; the wing is 11 now', texts('__fm3').indexOf('No more') > 0 && kinds('__fm3', 'pill').some(p => p.text === '3 bought') && texts('__fm3').indexOf('Wing 11') > 0);
  g.run(`PR.bonus = { fighters: 0 }; PR.techs = ['shield', 'beam']; window.__fm4 = scrHubRefitModel(PR, HB, { msg: { text: 'A fighter joins the wing.', ok: true } });`);
  check('the tech fitted are tiles with their numbers (the shield\'s 60% meter, the beam\'s pills), the notice of a key under the row', kinds('__fm4', 'tile').length === 3 && texts('__fm4').indexOf('Shield grid') > 0 && texts('__fm4').indexOf('Beam turrets') > 0 && kinds('__fm4', 'meter').length === 2 && kinds('__fm4', 'pill').some(p => p.text === 'Damage x2') && texts('__fm4').indexOf('A fighter joins the wing.') > 0 && texts('__fm4').indexOf('No tech fitted yet.') < 0);
}

console.log('D. the rank');
{
  g.run(`__fresh(); window.__km = scrHubRankModel(PR);`);
  check('Cadet at the start: a ring at nothing with the number 1, Rank 1 of 6, 1,000 points to Ensign', kinds('__km', 'ring')[0].text === '1' && kinds('__km', 'ring')[0].v === 0 && texts('__km').indexOf('Rank 1 of 6') >= 0 && texts('__km').indexOf('Cadet') > 0 && texts('__km').indexOf('1,000 points to Ensign') > 0);
  check('six tiles: each rank with the ships it adds (+0 +1 +3 +4 +6 +8), the one held lit', kinds('__km', 'tile').length === 6 && texts('__km').filter(t => /^\+\d$/.test(t)).join() === '+0,+1,+3,+4,+6,+8' && kinds('__km', 'tile').map(t => !!t.on).join() === 'true,false,false,false,false,false');
  check('the line under them and the Left Back chip', texts('__km').indexOf('The number is wing strength.') > 0 && chips('__km').join() === 'left:Left' && texts('__km').indexOf('Back') > 0);
  g.run(`__flown(); window.__km2 = scrHubRankModel(PR);`);
  check('with 7,380 points: Commander (4 of 6), the ring part way to Captain, the fourth tile lit, the points to the next', kinds('__km2', 'ring')[0].text === '4' && kinds('__km2', 'ring')[0].v > 0 && kinds('__km2', 'ring')[0].v < 100 && kinds('__km2', 'tile').map(t => !!t.on).join() === 'false,false,false,true,false,false' && texts('__km2').some(t => /points to Captain/.test(t)));
  g.run(`PR.results['1.2'] = { score: 20000, bonuses: [], t: 1, hull: 1, lost: 0, tries: 1 }; window.__km3 = scrHubRankModel(PR);`);
  check('at the top rank the ring is full and it says The highest rank', kinds('__km3', 'ring')[0].v === 100 && texts('__km3').indexOf('The highest rank') > 0);
}

console.log('E. the mission pick');
{
  g.run(`__fresh(); window.__pm = scrHubPickModel(PR, HB, {});`);
  const tiles = kinds('__pm', 'tile');
  check('Missions, the chips Up Down Choose, Enter Briefing, Left Back (from the key table)', texts('__pm')[0] === 'Missions' && chips('__pm').join() === 'up:Up,down:Down,pick:Enter,left:Left' && ['Choose', 'Briefing', 'Back'].every(t => texts('__pm').indexOf(t) > 0));
  check('nine tiles in three rows, a row to a level with its name (1 · The rim run ...)', tiles.length === 9 && kinds('__pm', 'row').filter(r => (r.kids || []).filter(k => k.k === 'tile').length === 3).length === 3 && texts('__pm').indexOf('1 \u00b7 ' + J('CAMP.levels[1].name')) > 0 && texts('__pm').indexOf('3 \u00b7 ' + J('CAMP.levels[3].name')) > 0);
  check('the next mission is lit and says Next; every other one is dim; nothing is dashed; the kind is under each name', tiles[0].on === true && texts('__pm').indexOf('Next') > 0 && tiles.slice(1).every(t => t.dim && !t.on && !t.dash) && texts('__pm').indexOf('Escort') < 0 && texts('__pm').filter(t => /^(Escort|Recon|Attack|Defend)$/i.test(t)).length === 9);
  check('only the next mission can be clicked (a click id: its place among the missions the cursor can stand on); the dim ones are not targets', tiles.filter(t => t.click !== undefined).map(t => t.click).join() === '0');
  check('the bar: the chosen mission\'s name and goal line, 5 bonuses, +250 each (the table\'s), Par 6:40', texts('__pm').slice(-5).join('|') === 'Rim escort|' + J('scrGoalLine(1, 0)') + '|5 bonuses|+250 each|Par 6:40' || (texts('__pm').indexOf('5 bonuses') > 0 && texts('__pm').indexOf('Par 6:40') > 0 && kinds('__pm', 'pill').some(p => p.text === '+250 each')));
  g.run(`__flown(); window.__pm2 = scrHubPickModel(PR, HB, {});`);
  const t2 = kinds('__pm2', 'tile');
  check('a campaign in progress: the two flown missions show their score in gold, the skipped one is dashed and says Skipped, the next one says Next', texts('__pm2').indexOf('4,280') > 0 && texts('__pm2').indexOf('3,100') > 0 && t2[1].dash === true && t2[0].dash !== true && texts('__pm2').indexOf('Skipped') > 0 && t2[3].on === true && texts('__pm2').indexOf('Next') > 0);
  check('the three that can be stood on, and the skipped one, take a click; the later ones do not', t2.filter(t => t.click !== undefined).map(t => t.click).join() === '0,1,2,3' && t2[4].click === undefined);
  g.run(`HB.cur = 0; window.__pm3 = scrHubPickModel(PR, HB, {});`);
  check('the cursor on a mission flown: its tile is lit and the bar counts its bonuses against the mission\'s own (3 of 5 bonuses)', kinds('__pm3', 'tile')[0].on === true && texts('__pm3').indexOf('3 of 5 bonuses') > 0);
  g.run(`HB.cur = 1; window.__pm4 = scrHubPickModel(PR, HB, {});`);
  check('on the skipped one the bar has 4 bonuses (1.2\'s own), not 5', texts('__pm4').indexOf('4 bonuses') > 0 && texts('__pm4').indexOf('Par 5:00') > 0);
  g.run(`HB.cur = 2; window.__pm5 = scrHubPickModel(PR, HB, {});`);
  check('1.3 has 3 bonuses (its own), and a mission with a single one says 1 bonus', texts('__pm5').indexOf('3 of 3 bonuses') > 0 || texts('__pm5').indexOf('1 of 3 bonuses') > 0 || texts('__pm5').some(t => /of 3 bonuses/.test(t)));
  g.run(`HB.cur = 0; HB.pick = { level: 1, i: 2 }; window.__pm6 = scrHubPickModel(PR, HB, { msg: { text: 'Replay: Haulers home. X: back.', ok: true } });`);
  check('the mission picked to fly again carries Replay (and the answer of the key sits above the bar)', texts('__pm6').indexOf('Replay') > 0 && texts('__pm6').indexOf('Replay: Haulers home. X: back.') > 0);
  check('there is no Start over row: no word of it in the screen (it lives on Settings > Reset)', !texts('__pm2').some(t => /over|restart|campaign again/i.test(t)));
}

console.log('F. the chips and the word counts');
{
  const models = { ready: '(__fresh(), scrReadyModel(PR, HB, { station: "Lunar Base" }))', refit: '(__fresh(), scrHubRefitModel(PR, HB, {}))', rank: '(__fresh(), scrHubRankModel(PR))', pick: '(__fresh(), scrHubPickModel(PR, HB, {}))' };
  const bad = [];
  for (const k of Object.keys(models)) {
    for (const c of chips(models[k])) { const i = c.indexOf(':'); if (!J(`scrChipInTable({ id: ${JSON.stringify(c.slice(0, i))}, k: ${JSON.stringify(c.slice(i + 1))} })`)) bad.push(k + ':' + c); }
    const w = J(`scrNodeWords(${models[k]})`), mock = J(`SCR_BUDGET.${k}.mock`), today = J(`SCR_BUDGET.${k}.today`);
    check(k + ': ' + w + ' words and numbers, the mock\'s ' + mock + ' (at most ' + J(`scrWordsMax('${k}')`) + '), today\'s ' + today + ': within the budget and far under today', w <= J(`scrWordsMax('${k}')`) && w < today / 1.5, w);
  }
  check('every chip of every screen is an entry of the key table', bad.length === 0, bad.join(' '));
  g.run(`window.__k = CAMP_KEYS.pause.k; CAMP_KEYS.pause.k = 'Q';`);
  check('a key moved in the table moves the chip (Esc on the top bar)', chips('scrReadyModel((__fresh(), PR), HB, {})')[0] === 'close:Q');
  g.run(`CAMP_KEYS.pause.k = __k;`);
  check('no key cap is written in the code of the models or the drawing', !/['"][A-Z]['"]/.test(code('src/scrhub.js') + code('src/scrhubdraw.js')) && !/['"](Enter|Esc|Backspace)['"]/.test(code('src/scrhub.js')));
}

console.log('G. the keys are the hub\'s own');
{
  g.run(`CAMP.flags.screens = false; __flown(); HB.open = 'board'; window.__len0 = CAMP_HUB.over.board.len(PR); window.__n = campHubSelectable(PR).length;`);
  check('OFF: the missions list has the Start over row after the missions (as always)', J('__len0') === J('__n') + 1);
  g.run(`CAMP.flags.screens = true; window.__len1 = CAMP_HUB.over.board.len(PR); HB.cur = __n - 1; window.__r = campHubKey(HB, PR, 'ArrowDown', {});`);
  check('ON: the list ends at the last mission; Down from it goes round to the first, never to a Start over row', J('__len1') === J('__n') && J('HB.cur') === 0);
  g.run(`HB.cur = 0; campHubKey(HB, PR, 'ArrowUp', {});`);
  check('ON: Up from the first goes round to the last mission', J('HB.cur') === J('__n') - 1);
  g.run(`CAMP.flags.screens = false;`);
  check('the other keys are untouched: campHubKey, the digits, Enter, L, T, Esc are not read by the new look (nothing in src/scrhub.js or src/scrhubdraw.js reads a key code)', !/\b(Key[A-Z]|Digit\d|ArrowUp|ArrowDown|Enter|Escape|keydown)\b/.test(code('src/scrhub.js') + code('src/scrhubdraw.js')));
}

console.log('H. the scene');
g.run(`
  window.__tags = []; window.__rects = [];
  const mk = tag => { __tags.push(tag); const e = { tag, children: [], parentNode: null, _cls: '', _text: '', listeners: {}, style: new Proxy({ setProperty(k, v) { this[k] = v; } }, { set(o, k, v) { o[k] = v; return true; } }) };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } });
    e.attrs = {}; e.setAttribute = (k, v) => { e.attrs[k] = String(v); }; e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } }); return e; };
  window.document = { createElement: mk, body: mk('body') };
  window.__obj = depth => { const o = { depth, visible: true, setVisible(v) { o.visible = v; return o; }, setDepth() { return o; } }; return o; };
  window.__scene = (extra) => { const rect = () => { const r = __obj(79); r.setDepth = d => { r.depth = d; return r; }; __rects.push(r); return r; };
    const s = Object.assign({ d: {}, P: PR, hub: HB, look: { name: 'Lunar Base' }, msg: null, time: { now: 0 }, oldNote: false, calls: [], handlers: {}, scrHost: null, scrHub: null, scrHubOn: false, scrVeil: null,
      children: { list: [__obj(5), __obj(80), __obj(84), __obj(88), __obj(90), __obj(95)] }, add: { rectangle: () => rect() }, game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } },
      events: { once(nm, f) { s.handlers[nm] = f; }, on() {} }, click(k) { s.calls.push('row:' + k); }, clickMission(c) { s.calls.push('mission:' + c); }, modalUp() { return false; } }, extra || {}); return s; };
`);
{
  g.run(`__flown(); CAMP.flags.screens = false; window.S = __scene({ P: PR, hub: HB }); window.__off = campHubNewLook(S);`);
  check('OFF: the room is the canvas\'s (false), nothing is made, nothing is hidden, no veil, no host', J('__off') === false && J('document.body.children.length') === 0 && J('S.children.list.every(o => o.visible)') && J('S.scrVeil') === null && J('S.scrHubOn') === false);
  g.run(`CAMP.flags.screens = true; window.__on = campHubNewLook(S);`);
  check('ON: the panels are drawn (true): the host is on the page with the ready room in it', J('__on') === true && J('document.body.children.length') === 1 && J('S.scrHost.root.children.length') === 1 && J('S.scrHub.id') === 'ready' && J('S.scrHubOn') === true);
  check('the canvas glass (objects at depth 80 to 90) is hidden; the hangar (depth 5) and what is above (95) stay; the hangar is dimmed by a veil at depth 79', J('S.children.list.map(o => o.visible).join()') === 'true,false,false,false,false,true' && J('S.scrVeil !== null && S.scrVeil.visible') === true);
  check('nothing is focusable: only div, span, i and b were made, and the host drops with the scene (shutdown)', J('__tags.every(t => ["div", "span", "i", "b", "body"].indexOf(t) >= 0)') && J('typeof S.handlers.shutdown') === 'function');
  g.run(`campHubNewLook(S);`);
  check('painted again (a key): ONE screen on the page, the old one replaced', J('S.scrHost.root.children.length') === 1);
  g.run(`__flown(); S.P = PR; S.hub = HB; HB.open = 'board'; campHubNewLook(S);`);
  check('the pick screen, with a tile that takes the mouse: a click on the next mission calls clickMission with its place; a click on a row of the room calls click', J('S.scrHub.id') === 'pick' && (() => { const tl = []; const w = x => { if (/sc-tile/.test(x._cls) && / act/.test(x._cls)) tl.push(x); x.children.forEach(w); }; return true; })() && (g.run(`window.__tiles = []; (function w(x) { if (/ act/.test(x._cls || '')) __tiles.push(x); x.children.forEach(w); })(S.scrHost.root)`), J('__tiles.length') === 4) && (g.run(`__tiles[3].listeners.click[0]({})`), J('S.calls.join()') === 'mission:3'));
  g.run(`HB.open = ''; campHubNewLook(S); window.__rows = []; (function w(x) { if (/ act/.test(x._cls || '')) __rows.push(x); x.children.forEach(w); })(S.scrHost.root); __rows[1].listeners.click[0]({});`);
  check('on the ready room the three rows are click targets: the second calls click(1)', J('__rows.length') === 3 && J('S.calls.join()') === 'mission:3,row:1');
  g.run(`HB.open = 'refit'; campHubNewLook(S); window.__a = S.scrHub.id; HB.open = 'rank'; campHubNewLook(S); window.__b = S.scrHub.id;`);
  check('the refit and the rank are their own screens', J('__a') === 'refit' && J('__b') === 'rank');
  g.run(`S.modalUp = () => true; scrHubSync(S, S.modalUp());`);
  check('a page of the room\'s own in front (the H page, the tuning panel) hides the room\'s SCREEN and the briefing hides it too, and they come back when it is gone; the host stays (the keys page of the new look is a panel in it)', J('S.scrHub.el.style.display') === 'none' && J('S.scrHost.root.style.display') !== 'none' && (g.run(`S.modalUp = () => false; scrHubSync(S, false, false);`), J('S.scrHub.el.style.display') === '') && (g.run(`scrHubSync(S, false, true);`), J('S.scrHub.el.style.display') === 'none') && (g.run(`scrHubSync(S, false, false);`), J('S.scrHub.el.style.display') === ''));
  g.run(`CAMP.flags.screens = false; window.__off2 = campHubNewLook(S);`);
  check('the switch off in the middle of the room brings the canvas glass back and takes the panels away (the next paint is the old one)', J('__off2') === false && J('S.children.list.map(o => o.visible).join()') === 'true,true,true,true,true,true' && J('S.scrVeil.visible') === false && J('S.scrHub') === null && J('S.scrHost.root.children.length') === 0);
  g.run(`CAMP.flags.screens = true; window.S2 = __scene({ d: { dock: 'x' } }); window.__dock = campHubNewLook(S2);`);
  check('a dock\'s room (an outpost\'s) is never the new look: it has its own rows', J('__dock') === false && J('S2.scrHost') === null);
  g.run(`CAMP.flags.screens = true; window.SN = __scene({ children: { list: [Object.assign(__obj(5), { type: 'Text' }), Object.assign(__obj(-45), { type: 'Text' }), __obj(5), Object.assign(__obj(88), { type: 'Text' })] } }); campHubNewLook(SN);`);
  check('the hangar\'s own words (canvas Text under the panels: MISSIONS, HANGAR 1, BAY 01, the YOU tag) are hidden with the new look; a picture (not text) stays; the glass is hidden as before', J('SN.children.list.map(o => o.visible).join()') === 'false,false,true,false');
  g.run(`window.__late = Object.assign(__obj(5), { type: 'Text' }); SN.children.list.push(__late); SN.hub = HB; SN.scrHubOn = true; SN.update = CampHub.prototype.update; SN.d = {}; try { campHubNewLook(SN); } catch (e) {} campHubHideNames(SN);`);
  check('a word made later (the YOU tag is made at the first tick) is hidden by the next look', J('__late.visible') === false);
  g.run(`CAMP.flags.screens = false; campHubNewLook(SN);`);
  check('the switch off gives the words back', J('SN.children.list.filter(o => o.type === "Text" && o.depth < 79).every(o => o.visible)') === true);
  g.run(`CAMP.flags.screens = true;`);
  g.run(`window.S3 = __scene({ game: {} }); window.__nopage = campHubNewLook(S3);`);
  check('no canvas to draw on: the old room (false)', J('__nopage') === false && J('S3.scrHubOn') === false);
  check('a stand-in scene that answers any property with a function is left alone with the switch off', (g.run(`CAMP.flags.screens = false; window.__px = new Proxy({}, { get: () => function () { return {}; } });`), J('campHubNewLook(__px)') === false));
  g.run(`CAMP.flags.screens = false;`);
}
{
  const cs = code('src/camphubscene.js'), ch = code('src/camphub.js');
  check('the scene asks for the new look in one place (paint) and one sync in update; the only use of the switch in the pure hub is the length of the missions list', (cs.match(/campHubNewLook\(this\)/g) || []).length === 1 && (cs.match(/scrHubSync\(this/g) || []).length === 1 && (ch.match(/\bscrOn\(/g) || []).length === 1);
  check('no key, rule, price or save of the hub changed: campHubKey, the refit\'s buy and give back and the saves are read, not written, by the new look (nothing in src/scrhub.js assigns to the progress or the hub state)', !/\b(PR|HB)\.[a-z]+\s*(=|\+=|-=|\+\+|--)[^=]/.test(code('src/scrhub.js')) && !/campProgressSave|campHubBuy|campHubGiveBack|campHubStartOver/.test(code('src/scrhub.js') + code('src/scrhubdraw.js')));
}

console.log('I. the polish (card space-game-screens-hub-polish: pictures only)');
{
  g.run(`__fresh(); window.__pk = scrHubPickModel(PR, HB, {}); window.__rd = scrReadyModel(PR, HB, { station: 'x' });`);
  const grid = kinds('__pk', 'card').find(c => c.id === 'pick.grid'), top = kinds('__pk', 'card').find(c => c.id === 'pick.top');
  check('the mission pick\'s nine tiles sit on a DARK PANEL of their own (a card, not bare: the hangar\'s crates, ship and YOU marker fought the words); the title row over it stays bare', !!grid && grid.deep === true && !grid.bare && !!top && top.bare === true && kinds('__pk', 'tile').length === 9 && /n\.deep \? ' sc-deep' : ''/.test(src('src/scrcardsdraw.js')));
  const css = src('src/scrhub.css');
  check('the deep panel is darker and blurs and dims what is behind it, more than a plain panel (alpha .9 against .72, a brightness of .55); no image, no web font', /\.sc-root \.sc-p\.sc-deep\{background:rgba\(4,9,17,\.9\);backdrop-filter:blur\(10px\) brightness\(\.55\)/.test(css) && /--sc-panel:rgba\(14,22,36,\.72\)/.test(src('src/screens.css')) && !/url\(|@font-face/.test(css));
  g.run(`CAMP.flags.screens = true; window.__scp = scrHubPaint; scrHubPaint = () => true; scrHubModel = () => ({});
    const mkO = (depth, vis = true) => { const o = { depth, visible: vis, alpha: null, type: 'Rect', setVisible(v) { o.visible = v; return o; }, setDepth(d) { o.depth = d; return o; }, setAlpha(a) { o.alpha = a; o.alphaCalls = (o.alphaCalls || 0) + 1; return o; } }; return o; };
    window.__vk = [mkO(10), mkO(85)]; window.__vs = { children: { list: __vk }, add: { rectangle: (x, y, w, h, c, a) => { const o = mkO(0, true); o.alpha = a; o.fill = c; __vk.push(o); return o; } }, events: { once() {} }, P: { credits: 0 }, hub: { open: '' }, look: { name: 'x' }, d: {}, time: { now: 0 }, msg: null, scrNamesHidden: [] };
    window.__va = []; for (const open of ['', 'board', 'board', 'refit', 'rank', 'board', '']) { __vs.hub.open = open; campHubNewLook(__vs); __va.push(__vs.scrVeil.alpha); }`);
  check('the veil over the hangar is .78 in the ready room, refit and rank, and .9 behind the mission pick (the table CAMP_HUBS.veil), set when the room changes and not every frame', J('CAMP_HUBS.veil.room') === 0.78 && J('CAMP_HUBS.veil.pick') === 0.9 && J('__va.join()') === '0.78,0.9,0.9,0.78,0.78,0.9,0.78' && J('__vs.scrVeil.alphaCalls') === 5, J('__va.join()') + ' ' + J('__vs.scrVeil.alphaCalls')); // (five changes of seven looks: the first sets it, then only a change of room)
  g.run(`scrHubPaint = __scp; CAMP.flags.screens = false;`);
  check('the lone Enter OPEN chip is gone: the card\'s keys are the Briefing chip (L) and the lit tile\'s own Enter; the word Open is not drawn and its content key is unused by the model', texts('__rd').indexOf('Open') < 0 && !/scr\.hub\.open/.test(code('src/scrhub.js')));
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
