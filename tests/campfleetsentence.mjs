// smoke: the fleet half of the row at 78 reads W and the pilots with their digits (W 1 Wedge 2 Kara 3 Apollo 4 All, or W 1 2 3 4 where the names do not fit), the picked one lit; the order sentence is gone from the row (card space-game-keys6-layout)
// Troy, 24 Nov 2026: "Left corner, top down: line 1 SHIELD and HULL bars; line 2 Q CRUISER and W with the pilots on ONE row (W 1 Wedge 2 Kara 3 Apollo 4 All; if too tight at 320 px show W 1 2 3 4 and the names when W is pressed); line 3 E FRIENDLIES. No new chips (Troy said no chips except reload)."
// It replaces the one-line sentence of card space-game-fleet-sentence (who, the order chip, the order and the target): the order key is Enter now and has no chip on the row.
//   A  the line: the W chip from the table, then each stop of the fleet pick as "digit name" (1 Wedge, 2 Kara, 3 Apollo, 4 All), the picked one lit (white), the others dim, a pilot who is lost darker; .alt is the digits alone
//   B  the layout takes the long form when it fits the half of the row and the short one (.alt) when it does not; the chip and the words stand left to right inside the half
//   C  the scene draws it: the chip W and the words, no title and no selection, and the lit digit follows the pick
// Run: node tests/campfleetsentence.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.C = campNew(1, [], { seed: 5, mission: 0 }); C.t = 1000; window.LINE = () => campFleetLine(C);`);

console.log('A. the line');
check('the first segment is the W chip (the table\'s who key) and the rest are words: three stops (card space-game-keys8-e-digit item 5: no digit 4), "digit name"', J('LINE()[0].key') === 'who' && J('campCornerCap("who")') === 'W' && J('LINE().slice(1).map(s => s.text).join("|")') === '1 Wedge|2 Kara|3 Apollo', JSON.stringify(J('LINE()')));
check('the default pick is All pilots: all three digits (1 2 3) are lit white (cards space-game-w4-all-lit and space-game-keys8-e-digit: there is no 4)', [1, 2, 3].every(i => J(`LINE()[${i}].ink`) === '#ffffff') && [1, 2, 3].every(i => J(`LINE().alt[${i}].ink`) === '#ffffff'));
g.run(`C.sel = 'pilot:green';`);
check('Kara picked: 2 is lit and 3 is dim', J('LINE()[2].ink') === '#ffffff' && J('LINE()[3].ink') === '#8fa6b8' && J('LINE()[1].ink') === '#8fa6b8');
check('.alt is the same stops as digits alone, with the chip, and the same lit one', J('LINE().alt.map(s => s.key || s.text).join("|")') === 'who|1|2|3' && J('LINE().alt[2].ink') === '#ffffff');
g.run(`C.sel = 'all'; C.ships.filter(u => u.pilot === 'apollo').forEach(u => { u.hp = 0; u.gone = true; }); C.bay.fighters = 0;`);
check('a pilot who is lost (nothing out, none in the bay) is still a stop and keeps his darker look with All pilots picked: 3 is dark, 1 2 are lit', J('LINE().slice(1).length') === 3 && J('LINE()[3].ink') === '#4d5f70' && [1, 2].every(i => J(`LINE()[${i}].ink`) === '#ffffff'), JSON.stringify(J('LINE()')));
check('the words are content: "All" is camp.corner.allshort, the rest are the pilots\' names; no order, no target, no second chip', J(`uiText('camp.corner.allshort')`) === 'All' && J('LINE().filter(s => s.key).length') === 1 && !J('LINE().some(s => s.key === "order")'));

console.log('B. the layout');
const T0 = J(`campCornerGeom('tl', 0, 0, 0, campCornerNow(C, 'fleet').span).title`);
check('the half of the row is x 118 and 202 wide (CAMP.corner.split 114 + the gap 4)', T0.x === 18 + 114 + 4 && T0.w === 320 - 114 - 4, JSON.stringify(T0));
const lay = w => J(`campCornerLineLayout(LINE(), ${JSON.stringify(T0)}, (t, s) => t.length * ${w})`);
const wide = lay(4.5), tight = lay(10);
check('with very narrow letters (4.5 px; real ones at 13 px are about 7, so at 320 px the names never fit: the half is 202 px) the names fit the half: three words with their names, the chip and the words left to right inside the frame', wide.chips.length === 1 && wide.words.map(w => w.text).join('|') === '1 Wedge|2 Kara|3 Apollo' && wide.words.every((w, i) => i === 0 ? w.x > wide.chips[0].x : w.x > wide.words[i - 1].x) && wide.words[2].x + '3 Apollo'.length * 4.5 <= T0.x + T0.w - 8, JSON.stringify(wide));
check('with wide letters (10 px) they do not: the short form, 1 2 3, and it fits', tight.words.map(w => w.text).join('|') === '1|2|3' && tight.words[2].x + 10 <= T0.x + T0.w - 8, JSON.stringify(tight));

console.log('C. the scene');
g.run(`
  const mkG = () => { const o = { log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
  const mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, alpha: 1, style: { color: '#ffffff' }, width: 7 }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; o.width = String(v).length * 7; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setAlpha = v => { o.alpha = v; return o; }; return o; };
  window.S = { camp: C, pn: campPanelNew(), mode: 'play', hud: {}, add: { graphics: mkG, text: mkT } };
  C.sel = 'pilot:red'; campCornerSync(S, 0);
`);
const V = 'S.hud.corner.fleet';
check('the chip W and three words are drawn; no title word, no selection (the row is a line)', J(`${V}.chips[0].text`) === 'W' && J(`${V}.words.filter(w => w.vis).length`) === 3 && !J(`${V}.title.vis`) && !J(`${V}.sel.vis`));
check('the words stand left to right and the picked one (Wedge: 1) is the lit white, the others dim', J(`${V}.words[0].x`) < J(`${V}.words[1].x`) && J(`${V}.words[0].style.color`) === '#ffffff' && J(`${V}.words[1].style.color`) === '#8fa6b8');
g.run(`C.sel = 'pilot:green'; campCornerSync(S, 0);`);
check('the lit one follows the pick: Kara (2)', J(`${V}.words[1].style.color`) === '#ffffff' && J(`${V}.words[0].style.color`) === '#8fa6b8');

console.log(failed ? `\nFLEET ROW FAIL: ${failed} of ${n} checks failed` : `\nFLEET ROW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
