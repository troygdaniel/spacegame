// node: Settings > Controls draws every row of every group on the panel (card space-game-settings-controls-overflow)
// FLIGHT has 22 rows and the body has room for eleven one under another (they were drawn 38 px apart, so the last ten ran off the panel). A group of
// more than eleven rows is now set in columns. This is plain Node: it runs the layout function (settingsControlsLayout, src/settings.js) on every
// group of the one table (src/data_controls.js) and the real draw_controls on a stand-in scene that records where each key cap and each line goes.
// A row added to the table later that does not fit (a text too long for its column) fails here, with its name, before the screen is ever opened.
// Run: node tests/controlsfit.mjs   (exit code 1 on any failure)
import { nodeGame } from './nodegame.mjs';
const g = nodeGame();
let failed = 0;
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

const BW = g.run('(() => { const w = SETTINGS.w, railW = SETTINGS.railW, bx = -w / 2 + railW + 24; return w / 2 - 24 - bx; })()'); // the body's width, as create() makes it
const BY_EDGE = g.run('SETTINGS_CONTROLS.edge'); // the lowest a row may reach, in px under the body's top: the note "Left and right change the group." is at 500
console.log('the layout of every group');
const names = g.run('CONTROLS.map(c => c.id)');
check('there are groups to test, and FLIGHT is the long one', names.length >= 4 && g.run('controlsGroup("flight").rows.length') > 11, names.join(' '));
for (const id of names) {
  const L = g.run(`settingsControlsLayout(controlsGroup(${JSON.stringify(id)}).rows, ${BW})`), rows = g.run(`controlsGroup(${JSON.stringify(id)}).rows.length`);
  check(`${id}: all ${rows} rows are placed, and the layout says it fits`, L.items.length === rows && L.fits, L.why);
  const lowest = Math.max(...L.items.map(it => it.y + it.h / 2)), highest = Math.min(...L.items.map(it => it.y - it.h / 2));
  check(`${id}: every row is between the heading and the note (top ${Math.round(highest)}, bottom ${Math.round(lowest)} of ${BY_EDGE})`, highest >= 90 && lowest <= BY_EDGE);
  let clash = '';
  for (let c = 0; c < L.cols; c++) {
    const col = L.items.filter(it => it.col === c).sort((a, b) => a.y - b.y);
    col.forEach((it, j) => { if (j && it.y - col[j - 1].y < Math.max(it.h, col[j - 1].h) + 2) clash = `rows ${col[j - 1].i} and ${it.i} touch`; });
  }
  check(`${id}: no two rows of a column touch`, !clash, clash);
  const wide = L.items.find(it => it.x + it.wrap > BW + 0.5 || it.caps.some(k => k.x + k.w / 2 > it.x));
  check(`${id}: the words start after the key caps and end inside the body`, !wide, wide ? 'row ' + wide.i : '');
  const colEnds = [...Array(L.cols).keys()].map(c => Math.max(...L.items.filter(it => it.col === c).map(it => it.x + it.wrap)));
  check(`${id}: a column's words stop before the next column's key caps`, colEnds.every((e, c) => c === L.cols - 1 || e <= Math.min(...L.items.filter(it => it.col === c + 1).flatMap(it => it.caps.map(k => k.x - k.w / 2)))));
}
const fl = g.run(`settingsControlsLayout(controlsGroup("flight").rows, ${BW})`), st = g.run(`settingsControlsLayout(controlsGroup("station").rows, ${BW})`);
check('FLIGHT: 22 rows in two columns of eleven; STATION: 11 rows in one', fl.cols === 2 && st.cols === 1 && fl.items.filter(it => it.col === 0).length === 11, `${fl.cols} and ${st.cols}`);
check('a short group keeps the old look: the words 200 px in, the larger size', g.run(`settingsControlsLayout(controlsGroup("ship").rows, ${BW}).items.every(it => it.x === 200)`) && g.run(`settingsControlsLayout(controlsGroup("ship").rows, ${BW}).size`) === 15);
check('the longest line of FLIGHT (the ship computer, 53 letters) wraps to two lines, and the others stay on one', fl.items.filter(it => it.lines === 2).length >= 1 && fl.items.every(it => it.lines <= 2), fl.items.filter(it => it.lines > 1).map(it => it.i).join(','));

console.log('a row that cannot fit is reported, not drawn off the panel');
const long = g.run(`(() => { const rows = []; for (let i = 0; i < 40; i++) rows.push({ k: ['Q'], t: 'Row ' + i + ': words enough to need a wide column' }); return settingsControlsLayout(rows, ${BW}); })()`);
check('forty rows: fits is false and says which row', long.fits === false && /does not fit/.test(long.why), long.why);
const one = g.run(`settingsControlsLayout([{ k: ['W'], t: 'x'.repeat(80) + ' and ' + 'y'.repeat(80) + ' and ' + 'z'.repeat(80) }], ${BW})`);
check('a text of three lines in one row is reported', one.fits === false, one.why);
const none = g.run(`settingsControlsLayout([], ${BW})`);
check('no rows: an empty layout', none.items.length === 0 && none.fits);

console.log('the real draw_controls, on a stand-in scene');
const drawn = g.run(`(() => {
  const out = {};
  for (const grp of CONTROLS) {
    const rec = { caps: [], txt: [] }, P = new Proxy(function () {}, { get: (_, k) => (k === 'width' ? 20 : P), apply: () => P });
    const fake = {
      bx: -304, by: -262, bw: ${BW}, ctab: grp.id, slots: {}, body: { add: c => rec.caps.push(c) },
      add: { text: (x, y, s) => { const t = { width: String(s).length * 7.8, setOrigin: () => t }; return t; }, graphics: () => P, container: () => { const c = { setPosition(x, y) { c.px = x; c.py = y; return c; } }; return c; } },
      button: () => ({ mark: () => ({}) }),
      txt: (x, y, s, size, color, o) => { rec.txt.push({ x, y, s, size, wrap: o && o.style && o.style.wordWrap ? o.style.wordWrap.width : 0 }); return {}; }
    };
    Settings.prototype.draw_controls.call(fake);
    out[grp.id] = { caps: rec.caps.map(c => [c.px, c.py]), txt: rec.txt, keys: grp.rows.reduce((n, r) => n + r.k.length, 0), rows: grp.rows.length };
  }
  return JSON.parse(JSON.stringify(out));
})()`);
for (const id of names) {
  const d = drawn[id], lines = d.txt.filter(t => t.size === 15 || t.size === 13), foot = d.txt.find(t => /change the group/.test(t.s));
  const top = -262, rowsDrawn = lines.filter(t => t.y >= top + 90 && t.y < top + 499);
  check(`${id}: ${d.keys} key caps and ${d.rows} lines drawn`, d.caps.length === d.keys && rowsDrawn.length === d.rows, `${d.caps.length} caps, ${rowsDrawn.length} lines`);
  check(`${id}: no key cap and no line below the panel's note (y under ${top + BY_EDGE})`, d.caps.every(c => c[1] <= top + BY_EDGE) && rowsDrawn.every(t => t.y <= top + BY_EDGE) && !!foot && foot.y > Math.max(...rowsDrawn.map(t => t.y)));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));
console.log(failed ? `\nCONTROLSFIT FAIL (${failed})` : '\nCONTROLSFIT PASS');
process.exit(failed ? 1 : 0);
