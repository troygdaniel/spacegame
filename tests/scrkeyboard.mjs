// smoke: the keys page's keyboard picture: the layout, which keys light and in which group's colour, from the key table; no words added (plain Node, no Chrome)
// Troy, 27 Nov 2026: a keyboard on the keys page, the mapped keys lit, so where the keys are is seen at a glance (docs/screens-flow.html step 8; src/scrkeyboard.js, hooked in src/scrkeys.js).
//   A. the layout: five rows of 15 key units, the arrow cluster, every code once
//   B. the flight's page: each key the rows name is lit in its group's colour (fly blue, fleet gold, cruiser good), nothing else is; both Shifts and the four arrows light
//   C. the table moves a key and the picture follows
//   D. the ready room: the page of one screen has the picture (a role's first code only: the arrow, not its WASD twin); the four-screen page and a page with the tune kit's group have none
//   E. the model's words do not change: the caps are attributes, drawn by the style
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';
let n = 0, failed = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame({ screens: 'table' });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const lit = m => J(`(() => { const M = ${m}, o = {}; if (!M.board) return null; M.board.rows.concat(M.board.arrows).forEach(r => r.forEach(k => { if (k.tone) o[k.code] = k.tone; })); return o; })()`);

console.log('A. the layout');
check('five rows, each 15 key units wide; the arrows are two rows of three', J('SCRKB.rows.length') === 5 && J('SCRKB.rows.map(r => r.reduce((a, k) => a + k[2], 0))').every(w => w === 15) && J('SCRKB.arrows.map(r => r.length)').join() === '3,3');
check('every code is on the board once, and the keys the game uses are all there', (() => { const codes = J(`SCRKB.rows.concat(SCRKB.arrows).reduce((l, r) => l.concat(r.map(k => k[0])), []).filter(Boolean)`); return new Set(codes).size === codes.length && ['Escape', 'Tab', 'Space', 'Enter', 'Backspace', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyZ', 'KeyC', 'BracketRight', 'Backslash', 'Minus', 'Equal'].every(c => codes.indexOf(c) >= 0); })());

console.log('B. the flight\'s page');
const F = lit('scrKeysModel()');
check('the page has the picture and each group its colour', !!F && J('scrKeysModel().groups.map(x => x.id + ":" + x.tone)').join() === 'fly:blue,fleet:gold,cruiser:good');
check('fly and fire: the four arrows, Space, both Shifts, Z, R, - and = are blue', ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyZ', 'KeyR', 'Minus', 'Equal'].every(c => F[c] === 'blue'), JSON.stringify(F));
check('the fleet: W, E, ], \\, Enter and F are gold; the cruiser: Q, Tab and Esc are green', ['KeyW', 'KeyE', 'BracketRight', 'Backslash', 'Enter', 'KeyF'].every(c => F[c] === 'gold') && ['KeyQ', 'Tab', 'Escape'].every(c => F[c] === 'good'), JSON.stringify(F));
check('every lit key is a key a row of the page names (a code of the table), and a key no row names is dark', (() => { const want = J(`scrKeysModel().groups.reduce((l, x) => l.concat(x.codes), [])`); return Object.keys(F).every(c => want.indexOf(c) >= 0) && want.every(c => F[c]) && !F.KeyA && !F.KeyP && !F.Digit1 && J('scrKeysModel().board.lit') === Object.keys(F).length; })());

console.log('C. the table moves a key');
g.run(`window.__was = CAMP_KEYS.missile; CAMP_KEYS.missile = { k: 'V', codes: ['KeyV'] };`);
const F2 = lit('scrKeysModel()');
check('the missile on V: V is lit, Z is not', F2.KeyV === 'blue' && !F2.KeyZ);
g.run(`CAMP_KEYS.missile = __was;`);

console.log('D. the ready room');
const B = lit(`scrKeysModel(CAMPKEYS.room, 'brief')`);
check('the briefing\'s page: Left, Right, Enter, L, -, =, Q, M and Esc are lit, and the arrows\' WASD twins are not', !!B && ['ArrowLeft', 'ArrowRight', 'Enter', 'KeyL', 'Minus', 'Equal', 'KeyQ', 'KeyM', 'Escape'].every(c => B[c] === 'blue') && !B.KeyA && !B.KeyD && !B.ArrowUp, JSON.stringify(B));
check('the four-screen page has no picture (no room), and neither has a page with a fourth group', J(`scrKeysModel(CAMPKEYS.room).board`) === null && J(`scrKeyboardModel([]).lit`) === 0 && J('SCRKB.maxGroups') === 3);

console.log('E. no words');
const src = readFileSync(join(ROOT, 'src/scrkeyboard.js'), 'utf8'), css = readFileSync(join(ROOT, 'src/scrset.css'), 'utf8');
check('a cap is an attribute the style draws (attr(data-cap)), never text: the page\'s words are the rows\' words', /setAttribute\('data-cap'/.test(src) && !/set\(e, 'text'/.test(src) && /\.sc-kk::after\{content:attr\(data-cap\)\}/.test(css));
check('the picture takes no key and no click', !/addEventListener|keydown|pointerdown/.test(src));
check('index.html loads it before the keys page', (h => h.indexOf('src/scrkeyboard.js') > 0 && h.indexOf('src/scrkeyboard.js') < h.indexOf('src/scrkeys.js'))(readFileSync(join(ROOT, 'index.html'), 'utf8')));

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SCR KEYBOARD FAIL (${failed} of ${n})` : `SCR KEYBOARD PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
