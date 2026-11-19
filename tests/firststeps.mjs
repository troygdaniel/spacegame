// smoke: the next steps after the first-run guide (card space-game-first-ten-minutes): a one-line hint for a jump and for trade, from what the player has and has not done, said once, with an off switch (plain Node, no Chrome)
// Troy played 13 minutes and never jumped or traded. src/guide.js now has a short ladder after the rescue guide and the travel line: dock (flight time with no dock),
// jump (the map looked at, no jump made), ore (never sold any), and in the station the shop and the courier and haul calls (two docks, nothing traded). hintLadder
// runs here with stand-in scenes, like tests/guidetips.mjs; the counting of docks and sales (hintsWatch), the save and the words are held too.
// Run: node tests/firststeps.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  const __rows = [{ key: 'bar', n: '1' }, { key: 'missions', n: '2' }, { key: 'pump', n: '3' }, { key: 'shop', n: '4' }, { key: 'repair', n: '5' }, { key: 'ship', n: '6' }];
  function __space(o) { return Object.assign({ scene: { key: 'Space' } }, o || {}); }
  function __station(o) { return Object.assign({ scene: { key: 'Station' }, menu: { rows: __rows } }, o || {}); }
  // a new game, a given point of play: the counters the steps read
  function __set(o) { guideReset(); Object.assign(G.hints, o.hints || {}); G.stats.missions = o.missions || 0; G.stats.time = o.time || 0; G.jumps = o.jumps || 0; G.ore = o.ore || 0; G.deep = null; }
`);

// ---- the words ----
const ui = readFileSync(new URL('../content/text/ui.md', import.meta.url), 'utf8'), src = readFileSync(new URL('../src/contenttables.js', import.meta.url), 'utf8');
const IDS = ['dock', 'jump', 'ore', 'shop', 'calls'];
const row = id => (ui.match(new RegExp('^\\| hint\\.' + id + ' \\| (.*) \\|$', 'm')) || [])[1];
const dflt = id => (src.match(new RegExp("'hint\\." + id + "': '((?:[^'\\\\]|\\\\.)*)'")) || [])[1];
check('every step has its line in content/text/ui.md and the same words as the default in src/contenttables.js', IDS.every(id => row(id) && row(id) === dflt(id)), IDS.map(id => id + ':' + !!row(id) + '/' + (row(id) === dflt(id))).join(' '));
const said = J(`({ dock: uiText('hint.dock'), jump: uiText('hint.jump'), ore: uiText('hint.ore'), shop: uiText('hint.shop', { shop: '4' }), calls: uiText('hint.calls', { missions: '2' }) })`);
check('each line is one line with its key: L to dock, G and Enter to jump, L for the ore, the row number for the shop and for the calls', /press L to dock/.test(said.dock) && /G opens the map/.test(said.jump) && /press Enter/.test(said.jump) && /\(L\)/.test(said.ore) && /press 4/.test(said.shop) && /press 2/.test(said.calls) && !/[{}]/.test(Object.values(said).join('')), JSON.stringify(said));
check('the station lines fit the one row on the south wall (72 characters), the flight lines a sentence of a hundred', said.shop.length <= 72 && said.calls.length <= 72 && said.dock.length <= 100 && said.jump.length <= 110 && said.ore.length <= 100, [said.shop.length, said.calls.length, said.dock.length, said.jump.length, said.ore.length].join(' '));
check('trade is what this game has: ore, parts, courier and haul calls, and no buying low and selling high', /ore/.test(said.ore) && /parts/.test(said.shop) && /courier and haul/i.test(said.calls) && !/(buy low|sell high|commodity)/i.test(Object.values(said).join(' ')));
const tips = J(`({ space: SCENE_TIPS.Space, station: SCENE_TIPS.Station })`);
check('the H page tells the same: the space tip names G, Enter and the ore, the station tip the shop and the courier and haul calls', /G opens the galaxy map/.test(tips.space) && /Enter to jump/.test(tips.space) && /ore sells/.test(tips.space) && /SHOP sells parts/.test(tips.station) && /courier and haul/.test(tips.station), JSON.stringify(tips).slice(0, 300));

// ---- dock: flight time with no dock ----
g.run(`__set({ time: 179000 })`);
check('no dock yet, under 3 minutes of play: nothing', J(`hintLadder(__space())`) === '');
g.run(`G.stats.time = 180000`);
let t = J(`hintLadder(__space())`);
check('3 minutes with no dock: the dock line, once it is up it is marked said', t === said.dock && J(`G.hints.seen.dock`) === 1 && J(`LADDER.id`) === 'dock', t);
g.run(`G.stats.time = 180000 + 13000`);
check('13 s later it is still up', J(`hintLadder(__space())`) === said.dock);
g.run(`G.stats.time = 180000 + 14000`);
check('after 14 s it goes, and does not come back', J(`hintLadder(__space())`) === '' && J(`LADDER.id`) === '');
g.run(`G.stats.time = 400000`);
check('not again, later in the same flight or in the next', J(`hintLadder(__space())`) === '');

// ---- one step per scene visit ----
g.run(`__set({ time: 180000, missions: 1, hints: { map: 1, docks: 0 } }); var __v = __space();`);
check('two steps hold at once (dock and jump): the first is said', J(`hintLadder(__v)`) === said.dock);
g.run(`G.stats.time += 14001`);
check('then nothing more in this visit: the jump line waits for the next', J(`hintLadder(__v)`) === '' && J(`G.hints.seen.jump`) === null);
check('in the next visit (a new scene) the jump line comes', J(`hintLadder(__space())`) === said.jump && J(`G.hints.seen.jump`) === 1);

// ---- the other tests of the steps ----
g.run(`__set({ time: 180000, hints: { docks: 1 } })`);
check('a dock made: no dock line', J(`hintLadder(__space())`) === '');
g.run(`__set({ missions: 1, hints: { docks: 1, map: 0 } })`);
check('jump: the map not opened is the travel line\'s (it says G opens the map), not this one', J(`hintLadder(__space())`) !== said.jump);
g.run(`__set({ missions: 1, hints: { docks: 1, map: 1 } })`);
check('jump: the map was opened, a call is paid, no jump made: the jump line', J(`hintLadder(__space())`) === said.jump);
g.run(`__set({ missions: 1, jumps: 1, hints: { docks: 1, map: 1 } })`);
check('jump: a jump made ends it for good', J(`hintLadder(__space())`) !== said.jump);
g.run(`__set({ missions: 0, hints: { docks: 1, map: 1 } })`);
check('jump: before the first call is paid the first-run guide has the player; no jump line', J(`hintLadder(__space())`) !== said.jump);
g.run(`__set({ missions: 1, jumps: 1, hints: { docks: 1, map: 1 } })`);
check('ore: a call paid, a dock made, nothing sold, no ore in the hold: the ore line', J(`hintLadder(__space())`) === said.ore);
g.run(`__set({ missions: 1, jumps: 1, ore: 3, hints: { docks: 1, map: 1 } })`);
check('ore: with ore in the hold there is nothing to teach', J(`hintLadder(__space())`) === '');
g.run(`__set({ missions: 1, jumps: 1, hints: { docks: 1, map: 1, sold: 1 } })`);
check('ore: ore sold once ends it', J(`hintLadder(__space())`) === '');

// ---- the station: the shop and the calls, from the second dock, until something is traded ----
g.run(`__set({ missions: 1, hints: { docks: 1 } })`);
check('station: one dock is not enough', J(`hintLadder(__station())`) === '');
g.run(`__set({ missions: 1, hints: { docks: 2 } })`);
check('station, second dock, nothing traded: the shop line, with the number of its row', J(`hintLadder(__station())`) === said.shop);
g.run(`G.stats.time += 14001; hintLadder(__station())`);
check('the next visit: the calls line, with the number of its row', J(`hintLadder(__station())`) === said.calls);
g.run(`__set({ missions: 1, hints: { docks: 2 } })`);
check('a panel, a chat or the shop open: nothing starts behind it', J(`hintLadder(__station({ panel: {} }))`) === '' && J(`hintLadder(__station({ talk: {} }))`) === '' && J(`hintLadder(__station({ shopOpen: true }))`) === '' && J(`LADDER.id`) === '');
g.run(`__set({ missions: 1, hints: { docks: 2 } }); var __rows0 = __rows.slice(); __rows.splice(3, 1)`);
check('a station with no shop row does not say the shop line', J(`hintLadder(__station())`) === said.calls, J(`hintLadder(__station())`));
g.run(`__rows.length = 0; __rows0.forEach(r => __rows.push(r)); __set({ missions: 1, hints: { docks: 2, sold: 1 } })`);
check('ore sold counts as a trade: no shop line, no calls line', J(`hintLadder(__station())`) === '');
g.run(`__set({ missions: 1, hints: { docks: 2 } }); G.upgrades = { armor: 1 }`);
check('a part bought counts too: no shop line (the calls line is still there to say)', J(`hintParts()`) === true && J(`hintLadder(__station())`) === said.calls);
g.run(`guideReset()`);

// ---- the off switch and the deep space, a panel the scene has ----
g.run(`__set({ time: 180000 }); G.hints.off = true`);
check('tips off: nothing', J(`hintLadder(__space())`) === '');
g.run(`__set({ time: 180000 }); G.deep = { danger: 1 }`);
check('deep space, a dead ship, a cruise, a jump charging: nothing', J(`hintLadder(__space())`) === '' && (g.run(`G.deep = null`), J(`hintLadder(__space({ dead: true }))`) === '' && J(`hintLadder(__space({ cruising: true }))`) === '' && J(`hintLadder(__space({ jmp: {} }))`) === ''));

// ---- what the player has done, counted from the frames ----
g.run(`__set({}); hintKey = null; hintOre = 0`);
g.run(`hintsWatch(__station())`);
check('the first Station frame of a loaded game is not a dock', J(`G.hints.docks`) === 0);
g.run(`G.ore = 5; hintsWatch(__space()); hintsWatch(__space()); G.ore = 0; hintsWatch(__station()); hintsWatch(__station())`);
check('flight with ore, then the Station with the hold empty: one dock, one sale (and not counted again on the next Station frames)', J(`G.hints.docks`) === 1 && J(`G.hints.sold`) === 1, J(`G.hints`));
g.run(`hintsWatch(__space()); hintsWatch(__station())`);
check('flight with an empty hold, then the Station: a second dock, no second sale', J(`G.hints.docks`) === 2 && J(`G.hints.sold`) === 1);
g.run(`G.ore = 4; hintsWatch(__space()); hintsWatch(__station()); G.ore = 0`);
check('a dock with the hold still full (nothing was bought from it) is a dock and not a sale', J(`G.hints.docks`) === 3 && J(`G.hints.sold`) === 1);
g.run(`hintsWatch({ scene: { key: 'Surface' } }); hintsWatch(__station())`);
check('the Surface then the Station is not a dock', J(`G.hints.docks`) === 3);

// ---- the map ----
g.run(`__set({}); TRAVEL.off = false`);
g.run(`guideMapOpened()`);
check('opening the galaxy map ends the travel line and is remembered for the jump step', J(`TRAVEL.off`) === true && J(`G.hints.map`) === 1);
check('src/galaxymap.js calls it', /guideMapOpened\(\)/.test(readFileSync(new URL('../src/galaxymap.js', import.meta.url), 'utf8')));

// ---- H: the page opens until a step is up, then H hides the steps ----
const mapSrc = readFileSync(new URL('../src/map.js', import.meta.url), 'utf8');
check('src/map.js: while a next step is up H hides tips (the page does not open over it), as for the first-run tips', /LADDER\.id/.test(mapSrc.split('\n').find(l => /LADDER/.test(l) && /'help'/.test(l)) || ''));
const guideSrc = readFileSync(new URL('../src/guide.js', import.meta.url), 'utf8');
check('src/guide.js: H with a step up sets G.hints.off and says so', /hDown && LADDER\.id[^\n]*G\.hints\.off = true/.test(guideSrc));

// ---- the save ----
g.run(`__set({ missions: 2, hints: { docks: 3, sold: 1, map: 1, off: true } }); G.hints.seen = { dock: 1, jump: 1 }`);
const snap = J(`guideSnapshot().hints`);
check('the save keeps what was done and said: tips off, steps said, docks, sales, the map', snap.off === true && snap.seen.dock === 1 && snap.seen.jump === 1 && snap.docks === 3 && snap.sold === 1 && snap.map === 1, JSON.stringify(snap));
g.run(`var __save = JSON.parse(JSON.stringify(guideSnapshot())); guideReset()`);
check('a new game starts the steps over', J(`G.hints.off === false && G.hints.docks === 0 && Object.keys(G.hints.seen).length === 0`));
g.run(`guideRestore(__save)`);
check('a load puts them back', J(`G.hints`).docks === 3 && J(`G.hints`).off === true && J(`G.hints.seen.jump`) === 1 && J(`G.hints.map`) === 1);
g.run(`guideRestore({ stats: { missions: 2 }, credits: 900, guideDone: true })`);
check('a save from before the steps with a call paid: docked at least twice, nothing said, tips on', J(`G.hints`).docks === 2 && J(`G.hints`).off === false && Object.keys(J(`G.hints.seen`)).length === 0);
g.run(`guideRestore({ stats: { missions: 0 }, credits: 0 })`);
check('a save from before the steps with nothing done: no docks', J(`G.hints.docks`) === 0);
g.run(`guideRestore({ hints: { docks: -4, sold: 'x', seen: { dock: 1, nonsense: 1, jump: 0 } } })`);
check('a damaged hints record is made safe: counts to 0, only known steps kept, a step marked 0 is not said', J(`G.hints`).docks === 0 && J(`G.hints`).sold === 0 && Object.keys(J(`G.hints.seen`)).join() === 'dock', JSON.stringify(J(`G.hints`)));
g.run(`guideReset()`);

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `FIRST STEPS FAIL (${failed} of ${n})` : `FIRST STEPS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
