// smoke: Enter, Enter, Enter flies with the briefing seen (card space-game-b13-a1-a2-enter-flow, BRIEF 13 A1 and A2): the ready room opens on the next-mission card and Enter there opens its briefing; the won card's Enter goes to the next briefing and Esc to the ready room (plain Node, no Chrome)
// Troy, 27 Nov 2026: yes to A1 and A2 of docs/screens-flow.html. Before: the room opened on Missions (Enter went to the grid; the card, reached with Up, launched with no briefing) and the won card's Enter went to the ready room.
//   A. the row the hall opens on: the next-mission card in the new look (CAMP_HUB.openOn); a dock's room, a room that is handed rows and the old look open as they did; a row asked for wins
//   B. Enter on that card opens the briefing (the action 'ready', as L does); a dock's Launch and the old look still launch; Enter on Missions, Refit and Rank still opens them; L is unchanged
//   C. the card says so: the one chip is Enter Briefing while it is lit, L Briefing while a row below is lit
//   D. the won card (the debrief): Enter goes to the next mission's briefing, Esc to the ready room; the level's last mission goes on to the level card either way; the old look's Enter goes to the ready room as ever
//   E. the room: the scene data { brief: true } opens the briefing once the new look's panels are up, once, and a room without it does not; the key table lists Esc on the won card, no key moves
// Run: node tests/screnterflow.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {};
  window.__texts = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'text') out.push(x.text); (x.kids || []).forEach(w); })(n); return out; };
  window.__chips = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'chip') out.push(x.id + ':' + x.cap); (x.kids || []).forEach(w); })(n); return out; };
  window.__on = v => { CAMP.flags.screens = v; };
  window.__fresh = () => { __on(true); window.PR = campProgressNew(); window.HB = campHubNew(PR, { at: campHubOpenRow({}) }); return PR; };
`);

console.log('A. the row the hall opens on');
{
  g.run(`__on(true);`);
  check('the table names it: the next-mission card (launch)', J('CAMP_HUB.openOn') === 'launch' && J('CAMP_HUB.rows.indexOf(CAMP_HUB.openOn)') === 3);
  check('the hall in the new look opens on it', J('campHubOpenRow({})') === 'launch' && J('campHubOpenRow(undefined)') === 'launch' && J('campHubNew(campProgressNew(), { at: campHubOpenRow({}) }).row') === 3);
  check('a row asked for wins (a dock opens on its repair row), and a room handed rows or a dock keeps the first', J(`campHubOpenRow({ at: 'refit' })`) === 'refit' && J(`campHubOpenRow({ dock: 'luna', rows: ['repair', 'launch'], at: 'repair' })`) === 'repair' && J(`campHubOpenRow({ dock: 'luna' })`) === '' && J(`campHubOpenRow({ rows: ['board', 'launch'] })`) === '' && J(`campHubNew(campProgressNew(), { rows: ['board', 'launch'], at: campHubOpenRow({ rows: ['board', 'launch'] }) }).row`) === 0);
  g.run(`__on(false);`);
  check('the old look (?screens=0, the tests\' switch) opens on the first row as it did', J('campHubOpenRow({})') === '' && J('campHubNew(campProgressNew(), { at: campHubOpenRow({}) }).row') === 0);
  g.run(`__on(true);`);
}

console.log('B. Enter on the card');
{
  g.run(`__fresh();`);
  check('opened there, Enter opens the briefing: the action is ready, the one L has (the briefing\'s own Enter or L flies it)', J(`campHubKey(HB, PR, 'Enter', {}).action`) === 'ready' && J(`campHubKey(HB, PR, 'KeyL', {}).action`) === 'ready');
  g.run(`__fresh(); HB.row = 0;`);
  check('on Missions Enter still opens the grid, on Refit and Rank their pages: nothing else moved', J(`(() => { const out = []; [0, 1, 2].forEach(r => { HB.row = r; HB.open = ''; const k = campHubKey(HB, PR, 'Enter', {}); out.push(HB.open + ':' + k.action); }); return out.join(); })()`) === 'board:,refit:,rank:');
  g.run(`__fresh();`);
  check('with a room\'s own launch (a dock, or an onLaunch) Enter on Launch still launches or undocks, as it did', J(`campHubKey(HB, PR, 'Enter', { dock: 'luna' }).action`) === 'launch' && J(`campHubKey(HB, PR, 'Enter', { onLaunch() {} }).action`) === 'launch');
  g.run(`__on(false); window.HB = campHubNew(PR, {}); HB.row = 3;`);
  check('the old look: Enter on the Launch row launches, as it did', J(`campHubKey(HB, PR, 'Enter', {}).action`) === 'launch' && J(`campHubKey(HB, PR, 'KeyL', {}).action`) === 'ready');
  g.run(`__fresh();`);
  check('Up and Down still move between the card and the chips (the new look\'s arrows only choose), Down from the card lands on Missions', J(`(() => { campHubKey(HB, PR, 'ArrowDown', {}); const a = HB.row; campHubKey(HB, PR, 'ArrowUp', {}); return [a, HB.row].join(); })()`) === '0,3');
}

console.log('C. the card says so');
{
  g.run(`__fresh(); window.__lit = scrReadyModel(PR, HB, { station: 'Occator Works' }); HB.row = 0; window.__unlit = scrReadyModel(PR, HB, { station: 'Occator Works' });`);
  const lit = J('__chips(__lit)'), unlit = J('__chips(__unlit)');
  check('lit on the card: one chip for it, Enter, and the word Briefing; no L chip, no Launch', lit.indexOf('pick:Enter') >= 0 && !lit.some(c => c.indexOf('launch:') === 0) && J('__texts(__lit)').indexOf('Briefing') >= 0 && J('__texts(__lit)').indexOf('Launch') < 0, JSON.stringify(lit));
  check('with a row below lit, the card keeps L Briefing (L works from anywhere)', unlit.some(c => c.indexOf('launch:') === 0) && J('__texts(__unlit)').indexOf('Briefing') >= 0, JSON.stringify(unlit));
  check('both chips are the key table\'s', J(`scrChipInTable(scrChip('pick'))`) === true && J(`scrChipInTable(scrChip('launch'))`) === true);
}

console.log('D. the won card');
{
  g.run(`
    window.__fakeScene = (mdone, on) => { __on(on); const f = Object.create(Campaign.prototype); f.mode = 'debrief'; f.mdone = mdone; f.leaving = false; f.camp = campNew(1, [], { seed: 3 }); f.hideCard = () => {}; f.showWon = () => { window.__shown = (window.__shown | 0) + 1; }; f.input = document; return f; };
    window.__press = (f, code) => { __went.length = 0; window.__shown = 0; f.onKey({ code, repeat: false }); return { went: __went.slice(), shown: window.__shown }; };
  `);
  let r = J(`__press(__fakeScene(false, true), 'Enter')`);
  check('Enter on the won card goes to the ready room with the next mission\'s briefing to open: CampHub { brief: true }', r.went.length === 1 && r.went[0].key === 'CampHub' && r.went[0].data.brief === true, JSON.stringify(r));
  r = J(`__press(__fakeScene(false, true), 'Escape')`);
  check('Esc goes to the ready room, no briefing: CampHub with nothing asked', r.went.length === 1 && r.went[0].key === 'CampHub' && r.went[0].data.brief === undefined, JSON.stringify(r));
  r = J(`__press(__fakeScene(true, true), 'Enter')`); const r2 = J(`__press(__fakeScene(true, true), 'Escape')`);
  check('the last mission of a level goes on to the level card by either key (no ready room yet)', r.went.length === 0 && r.shown === 1 && r2.went.length === 0 && r2.shown === 1, JSON.stringify([r, r2]));
  r = J(`__press(__fakeScene(false, false), 'Enter')`);
  check('the old look: Enter goes to the ready room as it did (no briefing opened), and Esc does nothing', r.went.length === 1 && r.went[0].key === 'CampHub' && r.went[0].data.brief === undefined && J(`__press(__fakeScene(false, false), 'Escape').went.length`) === 0, JSON.stringify(r));
  g.run(`__on(true);`);
  r = J(`__press(__fakeScene(false, true), 'KeyT')`);
  check('no other key moves on: T does nothing here', r.went.length === 0 && r.shown === 0, JSON.stringify(r));
}

console.log('E. the room and the key table');
{
  g.run(`
    window.__calls = []; window.__open = 0; campBriefOpen = s => { __open++; return true; };
    interiorTick = () => {}; fillSync = () => {};
    window.__room = (brief, on) => { const s = Object.create(CampHub.prototype); s.d = brief ? { brief: true } : {}; s.leaving = false; s.openBrief = s.d.brief === true; s.scrHubOn = on; s.msg = null; s.P = campProgressNew(); s.hub = campHubNew(s.P, {}); return s; };
  `);
  g.run(`window.__open = 0; { const s = __room(true, false); s.update(100); window.__o1 = __open; s.scrHubOn = true; s.update(200); window.__o2 = __open; s.update(300); window.__o3 = __open; }`);
  check('{ brief: true } waits for the new look\'s panels, opens the briefing once they are up, and only once', J('[__o1, __o2, __o3]').join() === '0,1,1', J('[__o1, __o2, __o3]'));
  g.run(`window.__open = 0; { const s = __room(false, true); s.update(100); s.update(200); window.__o4 = __open; }`);
  check('a room opened without it (Esc from the won card, the title, a debrief) opens nothing', J('__o4') === 0);
  g.run(`window.__open = 0; { const s = __room(true, true); s.leaving = true; s.update(100); window.__o5 = __open; }`);
  check('a room already leaving does not open it', J('__o5') === 0);
  check('the key table lists Esc on the won card (the chip is the table\'s) and Enter on it was already there; no key moved', J(`scrKeysOf('won').indexOf('close') >= 0 && scrKeysOf('won').indexOf('pick') >= 0`) === true && J(`CAMP_SCREEN_KEYS.close.on.indexOf('won') >= 0`) === true && J(`[campKeyIs('ready', 'KeyL'), CAMP_KEYS.ready.codes.join()]`).join() === 'true,KeyL');
}

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} passed`);
process.exit(failed ? 1 : 0);
