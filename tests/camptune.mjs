// smoke: the tuning panel's override layer: numbers and switches changed live, kept in the browser, copied out; the bots and the tests never see them
// Card space-game-tuning-panel (Troy, 22 Nov 2026). The rules are src/camptune.js (pure), the drawing and the clipboard src/camptunedraw.js, the keys N and the scene hooks src/campaignscene.js and src/camphubscene.js.
//   A. the table: every row has its words, a default inside its range on its step, and a place in the CAMP table; the key N is the table's and no other key of the Campaign's is
//   B. the overrides: a value goes into the live table, clamped and rounded to its step; the default is no override; a row of pips keeps the shape of its curve; reset one, reset all; the defaults never move
//   C. the browser's storage: written at every change, read once by a scene; a node game, a bot and a test never read it; a driven browser (navigator.webdriver) neither reads nor writes it; a bad file does no harm
//   D. Copy my settings: only the changed rows, one line each, read back by campTuneParse (the tool's); nothing changed is an empty block
//   E. the panel: Up and Down skip the headings and go round, Left and Right change (Shift: ten steps), Backspace resets the row, Enter flips a switch / copies / resets everything, N and Esc close, every key is the panel's;
//      the scene opens it with N in flight (the battle waits: mode 'pause') and closes it back to 'play'; the ready room opens it at its top level
//   F. the switches: each is off in the sim as if the system were not there, and the plain bot still wins with it off
//   G. a tuned run: the level moves on and the score is not kept (a zero score is the best of nothing)
// Run: node tests/camptune.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { run as botRun, techsFor, botGame } from '../tools/campaign-bot.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map(), g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const CAMP0 = g.run('JSON.stringify([CAMP, CAMP_CALLS])'); // the tables as shipped, to prove nothing moves

console.log('A. the table');
const rows = J('CAMP_TUNE.rows.map(r => ({ id: r.id, kind: r.kind || "num", group: r.group, when: r.when, min: r.min, max: r.max, step: r.step, d: campTuneDefault(r.id), slot: !!campTuneSlot(r) }))');
check('there are rows, with unique ids, each in a group the panel lists', rows.length >= 6 && new Set(rows.map(r => r.id)).size === rows.length && rows.every(r => J(`CAMP_TUNE.groups.indexOf("${r.group}") >= 0`)));
check('every row has a place in the CAMP table (or CAMP_CALLS, or the flags)', rows.every(r => r.slot));
check('every number\'s default is a number inside its range, on its step; every switch\'s default is true or false', rows.every(r => r.kind === 'flag' ? typeof r.d === 'boolean' : typeof r.d === 'number' && r.d >= r.min && r.d <= r.max && Math.abs(r.d / r.step - Math.round(r.d / r.step)) < 1e-9), JSON.stringify(rows.filter(r => r.kind !== 'flag' && !(r.d >= r.min && r.d <= r.max))));
check('every row says when it is felt: now, next mission or next call', rows.every(r => ['now', 'next', 'call'].indexOf(r.when) >= 0));
check('every row, every group and every "when" has its words (none is a missing key)', J('CAMP_TUNE.rows.every(r => !/^camp\\./.test(campTuneLabel(r)) && !/^camp\\./.test(campTuneWhen(r))) && CAMP_TUNE.groups.every(x => !/^camp\\./.test(uiText("camp.ui.tune.group." + x)))'));
check('N is the table\'s tuning key, and no other direct key, list key or debug key of the Campaign is KeyN', J('CAMP_KEYS.tune.codes.join()') === 'KeyN' && J('Object.keys(CAMP_KEYS).filter(k => k !== "tune" && CAMP_KEYS[k].codes.indexOf("KeyN") >= 0).length') === 0 && J('CAMP_PANELS.panels.filter(p => p.code === "KeyN").length') === 0 && J('CAMP_DEBUG.keys.filter(k => k.code === "KeyN").length') === 0);
check('the H page lists N (the Campaign\'s page and the ready room\'s)', J('controlsGroup("campaign").rows.some(r => r.k.join() === "N")') && J('controlsGroup("readyroom").rows.some(r => r.k.join() === "N")'));

console.log('B. the overrides');
check('before anything is asked nothing is overridden and the live table is the shipped one', J('campTuneCount()') === 0 && J('campTuneActive()') === false && g.run('JSON.stringify([CAMP, CAMP_CALLS])') === CAMP0);
check('a set value is in the live table at once and is the row\'s value; the default stays what it was', J('[campTuneSet("cruiserspeed", 300), CAMP.carrier.speed, campTuneValue("cruiserspeed"), campTuneDefault("cruiserspeed"), campTuneCount(), campTuneChanged("cruiserspeed")]').join() === '300,300,300,210,1,true');
check('a value is rounded to the row\'s step and held inside its range (min and max)', J('[campTuneSet("cruiserspeed", 304), campTuneSet("cruiserspeed", 9999), campTuneSet("cruiserspeed", -5), campTuneSet("shieldmend", 4.3), campTuneSet("orerock", "abc")]').join() === '300,600,60,4.5,20', J('[campTuneSet("cruiserspeed", 304), campTuneSet("cruiserspeed", 9999), campTuneSet("cruiserspeed", -5), campTuneSet("shieldmend", 4.3), campTuneSet("orerock", "abc")]').join());
check('a value that is the default is no override (the count falls)', J('[campTuneSet("cruiserspeed", 210), campTuneChanged("cruiserspeed"), campTuneCount()]').join() === '210,false,1');
check('a row of pips (the shield\'s mend rate) is the value at 2 pips, and every pip scales with it: the curve keeps its shape', J('CAMP.power.shields.regen').join() === '0,2.25,4.5,9,15' && J('campTuneDefault("shieldmend")') === 3);
check('stepping: Right is one step, Shift ten, Left back; a switch flips', J('[campTuneStep("turretdamage", 1), campTuneStep("turretdamage", 1, true), campTuneStep("turretdamage", -1), campTuneStep("calls", 1), CAMP.flags.calls]').join() === '5,15,14,false,false');
check('reset puts one row back (a pip row\'s whole array too); reset all puts everything back; the live tables are the shipped ones, byte for byte', J('[campTuneReset("shieldmend"), CAMP.power.shields.regen.join(), campTuneResetAll(), campTuneCount()]').join() === '3,0,1.5,3,6,10,0,0' && g.run('JSON.stringify([CAMP, CAMP_CALLS])') === CAMP0);
check('a row\'s snapshot is taken once: a later change of the table by a pack is not a "default" that moves under an override', J('(() => { campTuneSet("orerock", 50); const d = campTuneDefault("orerock"); campTuneResetAll(); return d; })()') === 20);
check('apply and restore: restore puts every row back to the default, apply puts the overrides in again', J('(() => { campTuneSet("cruiserspeed", 400); campTuneRestore(); const a = CAMP.carrier.speed; campTuneApply(); const b = CAMP.carrier.speed; campTuneResetAll(); return [a, b, CAMP.carrier.speed].join(); })()') === '210,400,210');
check('an unknown id, or one of another kind, changes nothing', J('[campTuneSet("nosuchrow", 5), campTuneStep("nosuchrow", 1), campTuneReset("nosuchrow"), campTuneCount()]').join() === ',,,0' || J('[campTuneSet("nosuchrow", 5), campTuneCount()]').join() === ',0');

console.log('C. the browser\'s storage');
check('a change is written to localStorage under the store\'s key, only the changed rows', (() => { g.run('campTuneSet("cruiserspeed", 280); campTuneSet("calls", false)'); const v = JSON.parse(store.get('longhaul.campaign.tuning')); return v.v === 1 && v.over.cruiserspeed === 280 && v.over.calls === false && Object.keys(v.over).length === 2; })());
const g2 = nodeGame({ store }); // the page reloaded: the same storage
check('a reloaded page, a node game or a bot has the shipped numbers until a scene reads the file: a test never sees an override', g2.run('CAMP.carrier.speed') === 210 && g2.run('CAMP.flags.calls') === true && g2.run('campTuneCount()') === 0);
check('a scene reads it once: the overrides go into the live table (and into the model), a second read changes nothing', g2.run('campTuneLoadOnce()') === 2 && g2.run('CAMP.carrier.speed') === 280 && g2.run('CAMP.flags.calls') === false && g2.run('campTuneLoadOnce()') === 2 && g2.run('campTuneActive()') === true);
check('reset all removes the file', (() => { g2.run('campTuneResetAll()'); return !store.has('longhaul.campaign.tuning') && g2.run('CAMP.carrier.speed') === 210; })());
const s3 = new Map([['longhaul.campaign.tuning', JSON.stringify({ v: 1, over: { cruiserspeed: 99999, nosuchrow: 4, orerock: 'x', turretdamage: 4, calls: false } })]]), g3 = nodeGame({ store: s3 });
check('a file with an unknown id, a value out of range, a value that is no number or one that is the default: the first is dropped, the second clamped, the rest ignored', g3.run('campTuneLoadOnce()') === 2 && g3.run('CAMP.carrier.speed') === 600 && g3.run('CAMP.flags.calls') === false && g3.run('CAMP.ore.rock') === 20 && g3.run('CAMP.carrier.pd') === 4);
const s4 = new Map([['longhaul.campaign.tuning', '{not json']]), g4 = nodeGame({ store: s4 });
check('a corrupt file does no harm (nothing is overridden, nothing throws)', g4.run('campTuneLoadOnce()') === 0 && g4.run('CAMP.carrier.speed') === 210);
const s5 = new Map([['longhaul.campaign.tuning', JSON.stringify({ v: 1, over: { cruiserspeed: 280 } })]]), g5 = nodeGame({ store: s5 });
g5.run('window.navigator = { webdriver: true }');
check('a browser a program drives (navigator.webdriver) reads no overrides and writes none: a boot script runs on the defaults', g5.run('campTuneLoadOnce()') === 0 && g5.run('CAMP.carrier.speed') === 210 && (g5.run('campTuneSet("orerock", 40)'), JSON.parse(s5.get('longhaul.campaign.tuning')).over.orerock === undefined) && g5.run('CAMP.ore.rock') === 40, 'the change in the session itself still works');

console.log('D. Copy my settings');
g.run('campTuneResetAll()');
check('nothing changed is an empty block', g.run('campTuneText()') === '');
g.run('campTuneSet("cruiserspeed", 280); campTuneSet("shieldmend", 6); campTuneSet("calls", false)');
const text = g.run('campTuneText()');
check('the block starts with its head, and has one line a changed row, in the table\'s order, each with its words and its default', text.split('\n')[0] === 'LONG HAUL TUNING v1' && text.split('\n').filter(Boolean).length === 4 && /^cruiserspeed = 280 +# Cruiser top speed, default 210$/m.test(text) && /^shieldmend = 6 +# Shield mend rate, default 3$/m.test(text) && /^calls = off +# Pilots call for orders, default on$/m.test(text), text);
const back = J(`campTuneParse(${JSON.stringify(text)})`);
check('the parse gives the rows back: ids and values, the switch as a boolean, no line left over', back.rows.map(r => r.id + '=' + r.value).join() === 'cruiserspeed=280,shieldmend=6,calls=false' && back.bad.length === 0);
check('a line that is not understood (an unknown id, a switch given a number, a number given on/off) is listed, not guessed', J('campTuneParse("cruiserspeed = on\\ncalls = 5\\nnosuch = 4\\norerock = 25")').bad.length === 3 && J('campTuneParse("cruiserspeed = on\\ncalls = 5\\nnosuch = 4\\norerock = 25")').rows.map(r => r.id).join() === 'orerock');
g.run('campTuneResetAll()');

console.log('E. the panel');
const press = (sc, code, extra) => g.run(`Campaign.prototype.onKey.call(window.__sc, ${JSON.stringify(Object.assign({ code, repeat: false }, extra || {}))})`);
const mk = () => g.run(`(() => { const C = campNew(1, [], { seed: 1 }); window.__sc = { mode: 'play', leaving: false, mp: null, camp: C, add: Phaser, pn: campPanelNew(), time: { now: 0 }, openTune: Campaign.prototype.openTune, closeTune: Campaign.prototype.closeTune }; return 1; })()`);
const sc = e => J(`window.__sc.${e}`);
g.run('window.navigator = { clipboard: { writeText: t => { window.__clip = t; return Promise.resolve(); } } }'); // a clipboard that keeps what it is given
mk();
check('N in flight opens the panel and the battle waits: the scene is in its pause mode', (press(null, 'KeyN'), sc('mode') === 'pause' && J('campTuneIsOpen(window.__sc)') === true));
const items = J('campTuneItems().map(i => i.kind === "row" ? i.row.id : i.kind === "head" ? "#" + i.group : i.kind)');
check('the list: Copy my settings, Reset everything, then each group\'s heading and its rows (a group with no rows has no heading)', items[0] === 'copy' && items[1] === 'reset' && items[2] === '#ship' && items.indexOf('cruiserspeed') === 3 && !items.some(x => x === '#wing' || x === '#foes'), items.join());
check('the highlight starts on the first row, Down skips a heading, and Up from the top goes round to the last row', sc('tp.model.cur') === 0 && (press(null, 'ArrowDown'), press(null, 'ArrowDown'), sc('tp.model.cur') === 3) && (press(null, 'ArrowUp'), press(null, 'ArrowUp'), press(null, 'ArrowUp'), items[sc('tp.model.cur')] === items[items.length - 1]));
mk(); press(null, 'KeyN'); press(null, 'ArrowDown'); press(null, 'ArrowDown');
check('Right on a number is one step, Shift+Right is ten, Left goes back; the live table follows', (press(null, 'ArrowRight'), J('CAMP.carrier.speed') === 220) && (press(null, 'ArrowRight', { shiftKey: true }), J('CAMP.carrier.speed') === 320) && (press(null, 'ArrowLeft'), J('CAMP.carrier.speed') === 310) && J('campTuneCount()') === 1);
check('Backspace puts the highlighted row back to its default', (press(null, 'Backspace'), J('CAMP.carrier.speed') === 210 && J('campTuneCount()') === 0));
check('a held arrow keeps going (the number runs); any other held key is the panel\'s and does nothing', (press(null, 'ArrowRight', { repeat: true }), press(null, 'ArrowRight', { repeat: true }), J('CAMP.carrier.speed') === 230) && (press(null, 'KeyQ', { repeat: true }), J('CAMP.carrier.speed') === 230));
check('every key is the panel\'s while it is open: a list key, Space and Tab open nothing and fire nothing', (press(null, 'KeyQ'), press(null, 'KeyP'), press(null, 'Space'), press(null, 'Tab'), sc('mode') === 'pause' && J('campPanelOpen(window.__sc.pn)') === '' && J('campTuneIsOpen(window.__sc)')));
// the switch row, and the two top rows
for (let i = 0; i < 20 && J('campTuneItems()[window.__sc.tp.model.cur].kind === "row" ? campTuneItems()[window.__sc.tp.model.cur].row.id : ""') !== 'calls'; i++) press(null, 'ArrowDown');
check('Enter on a switch flips it, and Right too', (press(null, 'Enter'), J('CAMP.flags.calls') === false) && (press(null, 'ArrowRight'), J('CAMP.flags.calls') === true));
check('Enter on Copy my settings gives the block (the clipboard is the browser\'s: asked, never needed) and says so; Enter on Reset everything puts every row back', (() => { g.run('campTuneSet("orerock", 50); campTuneSet("calls", false)'); const text2 = g.run('campTuneText()'); for (let i = 0; i < 40 && sc('tp.model.cur') !== 0; i++) press(null, 'ArrowUp'); press(null, 'Enter'); const said = sc('tp.model.msg'); press(null, 'ArrowDown'); press(null, 'Enter'); return said === 'copied' && g.run('window.__clip') === text2 && J('campTuneCount()') === 0 && sc('tp.model.msg') === 'reset'; })());
check('with nothing changed, Copy says nothing is changed', (() => { for (let i = 0; i < 40 && sc('tp.model.cur') !== 0; i++) press(null, 'ArrowUp'); press(null, 'Enter'); return sc('tp.model.msg') === 'nothing'; })());
check('Esc closes the panel and the battle goes on (mode play)', (press(null, 'Escape'), sc('mode') === 'play' && J('campTuneIsOpen(window.__sc)') === false));
check('N closes it too; with the panel closed N opens it again', (press(null, 'KeyN'), sc('mode') === 'pause') && (press(null, 'KeyN'), sc('mode') === 'play'));
check('N in a mode that is not play (a card, the pause) opens nothing', (() => { g.run('window.__sc.mode = "debrief"'); press(null, 'KeyN'); const r = J('campTuneIsOpen(window.__sc)') === false && sc('mode') === 'debrief'; g.run('window.__sc.mode = "play"'); return r; })());
check('N while a word is typed into the strip opens nothing', (() => { g.run('window.document = { activeElement: { tagName: "INPUT" } }'); press(null, 'KeyN'); const r = J('campTuneIsOpen(window.__sc)') === false; g.run('window.document = Phaser'); return r; })());
check('the open map and the open lists close when the panel opens', (() => { mk(); g.run('window.__sc.pn.open = "fleet"'); press(null, 'KeyN'); const r = J('campPanelOpen(window.__sc.pn)') === '' && J('campTuneIsOpen(window.__sc)') === true; press(null, 'Escape'); return r; })());
check('the highlight is always on screen: a list longer than the window scrolls with it (the model keeps top and cur so cur is in the window)', (() => { const M = J('(() => { const P = campTunePanelNew(), seen = []; for (let i = 0; i < 60; i++) { campTunePanelKey(P, "ArrowDown", false); seen.push(P.cur >= P.top && P.cur < P.top + CAMP_TUNE_VIEW.show); } return seen.every(Boolean); })()'); return M === true; })());
// the ready room
check('the ready room opens it at its top level with N, closes it with N, and not over an open row', (() => {
  g.run(`window.__hub = { leaving: false, hub: { open: '' }, P: {}, d: {}, add: Phaser, paint() {}, apply() {} }`);
  g.run(`CampHub.prototype.onKey.call(window.__hub, { code: 'KeyN', repeat: false })`); const a = J('campTuneIsOpen(window.__hub)');
  g.run(`CampHub.prototype.onKey.call(window.__hub, { code: 'KeyN', repeat: false })`); const b = J('campTuneIsOpen(window.__hub)');
  g.run(`window.__hub.hub.open = 'board'; CampHub.prototype.onKey.call(window.__hub, { code: 'KeyN', repeat: false })`); const c = J('campTuneIsOpen(window.__hub)');
  return a === true && b === false && c === false; })());
check('the TUNED mark: made once an override is on, with the count; empty when none is', (() => { g.run('campTuneResetAll(); window.__m = { add: Phaser }; campTuneMark(__m)'); const none = J('!window.__m.tuneMark'); g.run('campTuneSet("cruiserspeed", 280); campTuneMark(__m)'); const on = J('window.__m.tuneMarkN') === 1; g.run('campTuneResetAll(); campTuneMark(__m)'); return none && on && J('window.__m.tuneMarkN') === 0; })());

console.log('F. the switches');
g.run('campTuneResetAll()');
const techs = techsFor(1);
check('the pilots\' calls: a scripted call opens with the switch on, is refused with it off, and an open call is dropped when it goes off', J(`(() => {
  const C = campNew(1, [], { seed: 2 }); const a = campCallStart(C, 'distress', { who: 'x', ids: [] }); C.call.open = null;
  campTuneSet('calls', false); const b = campCallStart(C, 'distress', { who: 'x', ids: [] });
  campTuneSet('calls', true); campCallStart(C, 'distress', { who: 'x', ids: [] }); const open1 = campCallOpen(C);
  campTuneSet('calls', false); C.events.length = 0; campCallsTick(C, 0.1); const gone = !campCallOpen(C) && C.events.some(e => e.type === 'call' && e.stage === 'gone');
  campTuneResetAll(); return [a, b, open1, gone].join(); })()`) === 'true,false,true,true');
check('with the pilots\' calls off, no call ever opens in a whole mission flown by a bot that never answers (and it is the same battle on)', J(`(() => {
  const fly = on => { campTuneSet('calls', on); const C = campNew(1, [], { seed: 5 }); let opened = 0; for (let i = 0; i < 30 * 200 && !C.result; i++) { campStep(C, 1 / 30); if (campCallOpen(C)) { opened++; campCallAnswer(C, 0, 'bot'); } C.events.length = 0; } campTuneResetAll(); return opened; };
  return [fly(true) >= 0, fly(false)].join(); })()`) === 'true,0');
for (const mi of [0, 1, 2]) {
  botGame.run('campTuneSet("calls", false)');
  const r = botRun(1, 3, 'plain', 'steady', techs, 420, mi);
  botGame.run('campTuneResetAll()');
  check(`the plain bot still wins mission 1.${mi + 1} with the pilots' calls off`, r.result === 'won', JSON.stringify({ result: r.result, why: r.why, t: r.t }));
}
check('the bots\' own game never carries an override out of a test (it is back to the shipped numbers)', botGame.run('campTuneCount()') === 0 && botGame.run('CAMP.flags.calls') === true);

console.log('G. a tuned run keeps no score');
check('the rule: a tuned run is not kept (campTuneKeepScore), an untuned one is', J('[campTuneKeepScore(true), campTuneKeepScore(false)]').join() === 'false,true');
check('a mission won with a zero score moves the level on and leaves the best score (and so the rank) where it was', J(`(() => {
  const P = { level: 1, mission: 0, levelDone: 0, techs: [], found: [], ore: 0, bonus: {}, results: {} }, score = { score: 1500, bonuses: [{ id: 'a', ok: true }], t: 200, hullLeft: 500, shipsLost: 0 }, none = { score: 0, bonuses: [], t: 200, hullLeft: 500, shipsLost: 0 };
  campMissionDone(P, 1, 0, score); const best = P.results[campResultKey(1, 0)].score;
  P.level = 1; P.mission = 0; campMissionDone(P, 1, 0, none); const after = P.results[campResultKey(1, 0)].score, moved = P.mission === 1;
  const Q = { level: 1, mission: 0, levelDone: 0, techs: [], found: [], ore: 0, bonus: {}, results: {} }; campMissionDone(Q, 1, 0, none);
  return [best, after, moved, Q.results[campResultKey(1, 0)].score, Q.mission].join(); })()`) === '1500,1500,true,0,1');
check('the scene reads the flag in its debrief: the source says a tuned run is zeroed for the save and shows its own line', (() => { const s = String(g.run('Campaign.prototype.missionWon')); return /this\.tuned === true/.test(s) && /score: 0/.test(s) && /campMissionDone\(this\.P, this\.level, this\.mi, sc\)/.test(s) && /campReplayDone\(this\.P, this\.level, this\.mi, sc\)/.test(s) && /camp\.ui\.tune\.notkept/.test(String(g.run('Campaign.prototype.showDebrief'))); })());
check('the scene sets the flag in a frame of battle with an override on, and clears it at every new mission (create)', (() => { const u = String(g.run('Campaign.prototype.update')), c = String(g.run('Campaign.prototype.create')); return /this\.mode === 'play' && this\.tuned === false && .*campTuneActive\(\)\) this\.tuned = true/.test(u) && /this\.tuned = false/.test(c) && /campTuneLoadOnce\(\)/.test(c) && c.indexOf('campTuneLoadOnce') < c.indexOf('this.makeCamp()'); })());

check('a quiet game: nothing in this test wrote to the console as an error', g.errors.length === 0 && g2.errors.length === 0, g.errors.concat(g2.errors).join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
