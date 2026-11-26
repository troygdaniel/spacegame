// smoke: the keys page (H) in the new look of the screens: three groups, a chip and two or three words a row, every chip the key table's, the mock's words, near the mock's word count, behind the switch (plain Node, no Chrome)
// Card space-game-screens-e-keys-settings (landing E; src/scrkeys.js, src/campkeys.js, content/text/scrkeys.md). The mock is docs/screens-mock.html (section "Keys page (H)": three groups; 62 words and numbers against today's 360).
//   A. the model: the three groups and their rows, the words of the mock, the chip of each row
//   B. the chips are the key table's: each is an entry of CAMP_KEYS (or a list's key), and when the table moves a key the page follows; a key the table has not has no row
//   C. the word budget: the page shows about what the mock shows, far fewer than today's
//   D. the page on a scene: with the switch on it is a panel of the host (the title, the three groups, the chips, the close chip) and a veil; H or Esc closes it and the host goes; with the switch off, or no page to draw on, today's page is the one made
//   E. the ready room's page: the same panel, with the table's own groups and words
// Run: node tests/scrkeys.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { SCR_DOM } from './scrdomstand.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame({ screens: 'table' });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(SCR_DOM);
g.run(`CAMP.flags.screens = true;`);

console.log('A. the model');
const M = J('scrKeysModel()');
check('three groups, in the mock\'s order: Fly and fire, Fleet, Cruiser', M.groups.map(x => x.title).join('|') === 'Fly and fire|Fleet|Cruiser' && M.groups.map(x => x.id).join() === 'fly,fleet,cruiser');
check('five, six and four rows', M.groups.map(x => x.rows.length).join() === '5,6,5'); // (the cruiser's group has the boost row: card space-game-batch-922-small-fixes)
const rows = x => x.rows.map(r => r.chips.map(c => c.k).join(' ') + '=' + r.t);
check('Fly and fire: Arrows Fly, Space Turrets, Z Missile, R Build a missile, - = Zoom', rows(M.groups[0]).join('|') === 'Arrows=Fly|Space=Turrets|Z=Missile|R=Build a missile|- ==Zoom', rows(M.groups[0]).join('|'));
check('Fleet: W, E, ], \\, Enter and F, with the mock\'s words', rows(M.groups[1]).join('|') === 'W=Who, then 1 to 4|E=Friendly, then a digit|]=Next enemy|\\=Nearest threat|Enter=Attack, guard or form up|F=Look at it', rows(M.groups[1]).join('|'));
check('Cruiser: the list key, Tab, Esc, N and Shift (the boost)', rows(M.groups[2]).join('|') === 'Q=List, then 1 to 7|Tab=Map|Esc=Back, then pause|N=Tuning|Shift=Boost', rows(M.groups[2]).join('|'));
check('the heading is Keys and the close chip is H (the key table\'s help key), with the word Close', M.title === 'Keys' && M.close && M.close.k === J('CAMP_KEYS.help.k') && M.closeWord === 'Close', JSON.stringify(M.close));

console.log('B. the chips are the table\'s');
check('every chip of the page is one the table has (an entry of CAMP_KEYS, or a list\'s key), with that cap', M.groups.every(x => x.rows.every(r => r.chips.every(c => J(`scrKeysChipOk(${JSON.stringify(c)})`)))));
check('a chip that is not the table\'s is refused (a letter typed in a screen would be)', J(`scrKeysChipOk({ id: 'missile', k: 'B' })`) === false && J(`scrKeysChipOk({ id: 'nope', k: 'X' })`) === false && J(`scrKeysChipOk(null)`) === false);
g.run(`window.__was = { missile: CAMP_KEYS.missile.k, focus: CAMP_KEYS.focus.k }; CAMP_KEYS.missile.k = 'B'; CAMP_KEYS.focus.k = '';`);
const M2 = J('scrKeysModel()');
check('the table moves a key and the page follows: Missile is B now; a key the table has not (F) has no row', rows(M2.groups[0])[2] === 'B=Missile' && M2.groups[1].rows.length === 5 && !rows(M2.groups[1]).some(r => /Look at it/.test(r)));
g.run(`CAMP_KEYS.missile.k = __was.missile; CAMP_KEYS.focus.k = __was.focus;`);
check('the words are all in the content table: none of the page\'s words is a key name left over', M.groups.every(x => !/^scr\./.test(x.title) && x.rows.every(r => !/^scr\./.test(r.t))) && !/^scr\./.test(M.title));
const md = readFileSync(ROOT + '/content/text/scrkeys.md', 'utf8');
check('content/text/scrkeys.md has every word of the page and holds no key name', [...md.matchAll(/^\| (scr\.keys\.[\w.]+) \| (.*) \|$/gm)].length === 21 && !/Space bar|Arrow keys/.test(md));

console.log('C. the word budget');
const shown = m => [m.title, m.closeWord, m.close ? m.close.k : ''].concat(m.groups.flatMap(x => [x.title].concat(x.rows.flatMap(r => r.chips.map(c => c.k).concat([r.t])))));
const words = J(`scrWords(${JSON.stringify(shown(M))})`), mock = J('SCR_BUDGET.keys.mock'), today = J('SCR_BUDGET.keys.today');
check('the page shows ' + words + ' words and numbers: within the budget (the mock\'s ' + mock + ', a quarter and six more: ' + J(`scrWordsMax('keys')`) + ') and far under today\'s ' + today, words <= J(`scrWordsMax('keys')`) && words < today / 3, words);
check('no row is longer than five words', M.groups.every(x => x.rows.every(r => J(`scrWords(${JSON.stringify(r.t)})`) <= 5)));

console.log('D. the page on a scene');
g.run(`
  window.__veils = []; window.__calls = 0;
  window.__keysScene = () => { const s = __canvasScene(); s.add = { rectangle: () => { const o = { destroyed: false, setScrollFactor() { return o; }, setDepth() { return o; }, setInteractive() { return o; }, destroy() { o.destroyed = true; } }; __veils.push(o); return o; } }; return s; };
  window.S = __keysScene();
`);
check('with the switch on the page opens (true) as a panel of the host: s.ck is the open page, one veil, the panel in the root', J('campKeysOpen(S)') === true && J('campKeysIsOpen(S)') === true && J('__veils.length') === 1 && J('!!S.ck.scr') && J('S.scrHost.root.children.length') === 1);
const txt = J('__texts(S.scrHost.root)');
check('it reads: Keys, the H chip and Close, then the three groups with their chips and words', txt[0] === 'Keys' && txt[1] === 'H' && txt[2] === 'Close' && txt.includes('Fly and fire') && txt.includes('Look at it') && txt.includes('List, then 1 to 7') && txt.includes('Arrows') && txt.includes('- ='), txt.join('|'));
check('what a person reads is the model\'s words, nothing more', J(`scrWords(__texts(S.scrHost.root))`) === words, J(`scrWords(__texts(S.scrHost.root))`));
check('three columns of a group each, a heading in gold; the chips are elements of the table\'s role (the cap)', J(`__find(S.scrHost.root, e => / sc-gold/.test(e._cls)).length`) === 3 && J(`__find(S.scrHost.root, e => /(^| )sc-k( |$)/.test(e._cls)).length`) === 1 + 16);
check('nothing is focusable and nothing takes a click: only div, span and body were made, no handler on the page', J('__tags.every(t => ["div", "span", "body"].indexOf(t) >= 0)') && J(`__find(S.scrHost.root, e => Object.keys(e.listeners).length).length`) === 0, J('[...new Set(__tags)]').join());
check('a second open while it is open does nothing; every key is the page\'s; H closes it: the panel is off the page, the veil destroyed, the host dropped', J('campKeysOpen(S)') === false && J(`campKeysKey(S, 'KeyQ')`) === true && J('campKeysIsOpen(S)') === true && J(`campKeysKey(S, 'KeyH')`) === true && J('campKeysIsOpen(S)') === false && J('__veils[0].destroyed') === true && J('document.body.children.length') === 0 && J('S.scrHost') === null);
g.run(`window.S = __keysScene(); campKeysOpen(S);`);
check('Esc closes it too', J(`campKeysKey(S, 'Escape')`) === true && J('campKeysIsOpen(S)') === false && J('document.body.children.length') === 0);
g.run(`CAMP.flags.screens = false; window.__spy = scrKeysOpen; window.scrKeysOpenCalls = 0; scrKeysOpen = (...a) => { scrKeysOpenCalls++; return __spy(...a); }; window.S = __keysScene(); try { campKeysOpen(S); } catch (e) { /* the stand-in has no text objects: today's page needs them */ }`);
check('with the switch off the new page is not asked for: today\'s page is the one made', J('scrKeysOpenCalls') === 0 && J('!!(S.ck && S.ck.scr)') === false && J('document.body.children.length') === 0);
g.run(`scrKeysOpen = __spy; CAMP.flags.screens = true; window.S3 = { add: S.add, events: { once() {} } };`); // a scene with no canvas: nowhere to put a panel
check('with the switch on but no canvas (a stand-in, a page with no document) the host is not made and the page of today is tried', J(`scrKeysOpen(S3)`) === false && J('document.body.children.length') === 0);

console.log('E. the ready room\'s page');
const R = J(`scrKeysModel(CAMPKEYS.room)`);
check('it has the table\'s own groups (The ready room, The briefing) with the table\'s words and caps, as chips one cap each', R.groups.length === 2 && R.groups[0].title === 'THE READY ROOM' && R.groups[1].title === 'THE BRIEFING' && R.groups.every(x => x.rows.every(r => r.chips.length > 0 && r.t.length > 0)) && J(`campKeysPage(CAMPKEYS.room).every((grp, i) => grp.rows.every((r, j) => r.caps.join() === scrKeysModel(CAMPKEYS.room).groups[i].rows[j].chips.map(c => c.k).join() && r.t === scrKeysModel(CAMPKEYS.room).groups[i].rows[j].t))`));
g.run(`window.S4 = __keysScene(); campKeysOpen(S4, CAMPKEYS.room);`);
check('opened for the room it is the same panel in two columns, with the room\'s heading', J('!!S4.ck.scr') && J(`/two/.test(S4.ck.scr.children[1]._cls)`) && J('__texts(S4.scrHost.root)[0]') === J(`uiText('camp.keys.roomtitle')`));
g.run(`campKeysClose(S4);`);

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SCR KEYS FAIL (${failed} of ${n})` : `SCR KEYS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
