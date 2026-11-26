// smoke: the new screens' foundation (landing F): the switch (off by default, ?screens=, Settings row), the screens group of the key table, key chips read from the table, the word budget, the panel host (plain Node, no Chrome)
// Card space-game-screens-f-foundation (Troy, 25 Nov 2026; the mock is docs/screens-mock.html). Landing F builds what every new screen shares and changes NO screen:
//   A. the switch: CAMP.flags.screens is false in the table; ?screens=1 turns it on, ?screens=0 off whatever the flag says; scrSet keeps the choice in the browser and scrLoad reads it back
//   B. the key table's screens group (CAMP_SCREEN_KEYS in src/data_controls.js): well formed, every code is in the code of one of its files, and nothing reads it to decide what a key does
//   C. the chips are the table's: a role's cap is the table's cap, a key moved in the table moves the chip, an unknown role has no chip, and every chip every screen's keys make is an entry of the table
//   D. the word budget: the counter, the mock's counts, the most a screen's words may be
//   E. the host: one root over the canvas rectangle at the menus' em, pointer-events none, auto on a tile with a handler only, nothing focusable, the diff-writer writes only what changed
//   F. the style: only .sc- selectors, the mock's tokens, no image, font or request
//   G. the Settings row, the new words and their voicepack rule, and: nothing draws from any of it yet (no screen changes)
// Run: node tests/screens.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');

console.log('A. the switch');
check('the table\'s flag is false: the new screens are off for every player', J('CAMP.flags.screens') === false);
check('scrOn is false with no address and the flag off', J('scrOn()') === false);
check('the address ?screens=1 turns it on, a bare ?screens, =on and =true too', ['?screens=1', '?x=1&screens', '?screens=on', '?SCREENS=TRUE'].every(a => J(`scrAddrOn(${JSON.stringify(a)})`) === true));
check('?screens=0, =off and =false are off; no word of it is neither', ['?screens=0', '?screens=off', '?a=b&screens=false'].every(a => J(`scrAddrOff(${JSON.stringify(a)})`) === true) && J(`scrAddrOn('?pagehud=1')`) === false && J(`scrAddrOff('')`) === false && J(`scrAddrVal('?screens=maybe')`) === 'maybe');
check('another switch\'s name is not mine (?screensx, ?myscreens)', J(`scrAddrVal('?screensx=1&myscreens=1')`) === null);
g.run(`CAMP.flags.screens = true;`);
check('the flag on: scrOn is true', J('scrOn()') === true);
g.run(`window.location = { search: '?screens=0' }; SCR.memo.s = null;`);
check('?screens=0 in the page\'s address wins over the flag (the tests\' way back)', J('scrOn()') === false);
g.run(`CAMP.flags.screens = false; window.location = { search: '?screens=1' }; SCR.memo.s = null;`);
check('?screens=1 in the page\'s address turns it on with the flag off', J('scrOn()') === true);
g.run(`window.location = { search: '' }; SCR.memo.s = null; CAMP.flags.screens = false;`);
check('the address is read again when it changes (and only then)', J('scrOn()') === false && J('SCR.memo.s') === '');
check('scrSet(true) puts the flag on and the browser remembers it', J('scrSet(true)') === true && J('CAMP.flags.screens') === true && J(`localStorage.getItem(SCR.store)`) === '1');
g.run(`CAMP.flags.screens = false;`);
check('scrLoad reads it back at the start of the page', J('scrLoad()') === true && J('CAMP.flags.screens') === true);
check('scrSet(false) puts it off and remembers that', J('scrSet(false)') === false && J('CAMP.flags.screens') === false && J(`localStorage.getItem(SCR.store)`) === '0' && J('scrLoad()') === false);
{
  const h = nodeGame({ screens: 'table' });
  check('nodeGame({ screens: \'table\' }) keeps the table\'s own value (the test harness forces it off otherwise, as for ?shiplook=0)', h.run('CAMP.flags.screens') === false);
  const k = nodeGame({ store: new Map([['longhaul.screens', '1']]) });
  check('a stored "1" does not leak into a test: the harness makes the game with the flag off', k.run('CAMP.flags.screens') === false);
  const k2 = nodeGame({ store: new Map([['longhaul.screens', '1']]), screens: 'table' });
  check('and a page whose memory says 1 starts with it on', k2.run('CAMP.flags.screens') === true);
}

console.log('B. the key table\'s screens group');
const T = J('CAMP_SCREEN_KEYS'), ids = Object.keys(T), SCREENS = J('SCR.screens');
check('the group has the roles the screens\' chips need (Enter, arrows, digits, Esc, T, H, S, L, Backspace, K, R, X, F, zoom)', ['pick', 'up', 'down', 'left', 'right', 'digit', 'close', 'title', 'help', 'settings', 'launch', 'restart', 'start', 'open', 'clear', 'buy', 'giveback', 'zoomin', 'zoomout', 'zoomreset'].every(i => ids.indexOf(i) >= 0), ids.join());
check('a role is either a cap with its codes, or the entry of CAMP_KEYS it is', ids.every(i => { const e = T[i]; return e.same ? typeof J('CAMP_KEYS')[e.same] === 'object' && e.k === undefined : typeof e.k === 'string' && e.k && Array.isArray(e.codes) && e.codes.length > 0 && e.codes.every(c => typeof c === 'string' && /^[A-Z][A-Za-z0-9]+$/.test(c)); }));
check('every role names the screens that take it, from the list of screens, and the files whose code names it', ids.every(i => Array.isArray(T[i].on) && T[i].on.length > 0 && T[i].on.every(s => SCREENS.indexOf(s) >= 0) && Array.isArray(T[i].src) && T[i].src.length > 0 && T[i].src.every(f => existsSync(join(ROOT, f)))));
check('every screen of the list has at least one key (a screen with none has no chip to draw)', SCREENS.every(s => ids.some(i => T[i].on.indexOf(s) >= 0)), SCREENS.filter(s => !ids.some(i => T[i].on.indexOf(s) >= 0)).join());
{ // every code of a role is in the code of one of its files (a key that moves in the code and not in the table fails here); the digits are read by the hub as a pattern
  const miss = [];
  for (const i of ids) {
    const e = T[i], text = e.src.map(f => src(f)).join('\n'), codes = e.same ? J('CAMP_KEYS')[e.same].codes : e.codes;
    if (i === 'digit') { if (!/Digit\|Numpad|\(\?:Digit\|Numpad\)|Digit\$\{|'Digit'|Digit\d/.test(text)) miss.push('digit:pattern'); continue; }
    for (const c of codes) if (text.indexOf("'" + c + "'") < 0 && text.indexOf('"' + c + '"') < 0 && !new RegExp('[{,]\\s*' + c + '\\s*:').test(text) && !(e.same && new RegExp("campKey(Is|Codes)\\(\\s*'" + e.same + "'|CAMP_KEYS\\." + e.same + "\\b|CAMP_KEYS\\['" + e.same + "'\\]|campKeyIs\\('" + e.same + "'|keys: \\[[^\\]]*'" + e.same + "'").test(text))) miss.push(i + ':' + c);
  }
  check('every code of a role is in the code of one of its files, or the file asks the key table for the role', miss.length === 0, miss.join(' '));
}
check('no key does anything new: nothing but src/screens.js reads the group (the scenes keep their own codes until a piece of the new screens moves one)', readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js') && !['data_controls.js', 'screens.js'].includes(f)).every(f => !/CAMP_SCREEN_KEYS/.test(src('src/' + f))));
check('the roles that are an entry of CAMP_KEYS say so by id and are not copied (Enter, Esc, H, S, L, Backspace, the zoom keys follow the table when a key moves there)', ['pick', 'close', 'help', 'settings', 'launch', 'restart', 'zoomin', 'zoomout', 'zoomreset'].every(i => !!T[i].same));
check('the other roles\' codes are not a key CAMP_KEYS gives to something else in flight but T, K, R, X, F, Backspace, arrows and digits of the menus (no flight key is taken)', (() => { const flight = J('Object.keys(CAMP_KEYS).map(id => [id, CAMP_KEYS[id].codes])'), own = ['T', 'K', 'R', 'X', 'F']; return ids.filter(i => !T[i].same && own.indexOf(T[i].k) >= 0).every(i => T[i].codes.every(c => !flight.some(([id, cs]) => cs.indexOf(c) >= 0 && ['reload', 'focus', 'who', 'order', 'hostiles', 'friendlies', 'fly'].indexOf(id) < 0 || false))); })());

console.log('C. the chips are the table\'s');
check('a chip is { id, k } with the table\'s cap', J(`scrChip('pick')`).k === J('CAMP_KEYS.pick.k') && J(`scrChip('title')`).k === 'T' && J(`scrChip('digit')`).k === '1 to 9');
check('a role of CAMP_KEYS follows the table: Esc, H, S, L and Backspace are the table\'s caps', ['close:pause', 'help:help', 'settings:settings', 'launch:ready', 'restart:restart'].every(p => { const [r, id] = p.split(':'); return J(`scrChip('${r}').k`) === J(`CAMP_KEYS.${id}.k`); }));
g.run(`window.__k = CAMP_KEYS.help.k; CAMP_KEYS.help.k = 'Z';`);
check('a key moved in the table moves the chip', J(`scrChip('help').k`) === 'Z' && J(`scrKey('help').k`) === 'Z');
g.run(`CAMP_KEYS.help.k = __k;`);
check('an unknown role has no chip and is dropped from a list; a role of a key with no cap now has none', J(`scrChip('nope')`) === null && J(`scrChips(['pick', 'nope', 'help']).map(c => c.id).join()`) === 'pick,help');
check('scrKey gives the codes too, a copy (a screen cannot change the table through it)', (() => { g.run(`scrKey('up').codes.push('KeyZ')`); return J(`CAMP_SCREEN_KEYS.up.codes.length`) === 2; })());
{
  const bad = [];
  for (const s of SCREENS) for (const id of J(`scrKeysOf(${JSON.stringify(s)})`)) { const c = J(`scrChip(${JSON.stringify(id)})`); if (!c || !J(`scrChipInTable(${JSON.stringify(c)})`)) bad.push(s + ':' + id); }
  check('every chip every screen\'s keys make is an entry of the table (scrChipInTable)', bad.length === 0, bad.join(' '));
}
check('a chip not in the table is caught: a made-up cap, a made-up role, a changed cap', J(`scrChipInTable({ id: 'pick', k: 'Enter' })`) === true && J(`scrChipInTable({ id: 'pick', k: 'Return' })`) === false && J(`scrChipInTable({ id: 'zzz', k: 'Z' })`) === false && J(`scrChipInTable(null)`) === false);

console.log('D. the word budget');
check('scrWords counts what the white space cuts: a text, a list, an object, a number; a tag is not a word', J(`scrWords('Two doors')`) === 2 && J(`scrWords(['a b', 'c'])`) === 3 && J(`scrWords({ t: 'x y z', n: 5 })`) === 4 && J(`scrWords('<b>Hull</b> 40%')`) === 2 && J(`scrWords(null)`) === 0 && J(`scrWords('')`) === 0 && J(`scrWords('  spaced   out  ')`) === 2);
const B = J('SCR_BUDGET');
check('the budget has every section of the mock (twelve, and the level-won card, the Earth refit and the six other Settings tabs of its second round), today\'s counts add to 2,840 (the mock\'s own table: 1,801 and 1,039)', Object.keys(B).length === 20 && Object.keys(B).reduce((a, k) => a + B[k].today, 0) === 2840);
check('every new count is far under today\'s, and the story card, which goes, has none', Object.keys(B).every(k => B[k].mock < B[k].today) && B.story.mock === 0 && Object.keys(B).reduce((a, k) => a + B[k].mock, 0) < 800);
check('the most a screen may show is the mock\'s count plus a slack (a quarter and six): title 41, keys 83', J(`scrWordsMax('title')`) === 41 && J(`scrWordsMax('keys')`) === 84 && J(`scrWordsMax('nope')`) === null);
check('scrWithin says whether a model fits', J(`scrWithin('pause', 'Paused ' + 'x '.repeat(10))`) === true && J(`scrWithin('pause', 'x '.repeat(60))`) === false);

console.log('E. the panel host');
g.run(`
  window.__writes = 0; window.__tags = []; window.__attrs = [];
  const mk = tag => { __tags.push(tag); const e = { tag, children: [], parentNode: null, _cls: '', _text: '', listeners: {}, style: new Proxy({ setProperty(k, v) { __writes++; this[k] = v; } }, { set(o, k, v) { if (k !== 'setProperty') __writes++; o[k] = v; return true; } }) };
    Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { __writes++; e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { __writes++; e._text = v; } });
    e.attrs = {}; e.setAttribute = (k, v) => { __attrs.push(k); e.attrs[k] = String(v); }; e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } });
    return e; };
  window.document = { createElement: mk, body: mk('body') };
  window.__scene = () => ({ game: { canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) } }, events: { once(n, f) { (this.fns = this.fns || {})[n] = f; } } });
`);
check('scrHostBox: the root is the canvas rectangle and its em is 1.5 percent of the width (19.2 px at 1280), k the share of the game\'s width', J(`scrHostBox({ left: 10.4, top: 20, width: 1280, height: 720 }, 1280)`).em === 19.2 && J(`scrHostBox({ left: 10.4, top: 20, width: 640, height: 360 }, 1280)`).k === 0.5 && J(`scrHostBox({ left: 10.4, top: 20, width: 640, height: 360 }, 1280)`).left === 10 && J(`scrHostBox(null, 1280)`).width === 0);
check('the flight HUD\'s em is smaller: the menus read at 1.5 percent, the HUD at 1.12 (the same canvas)', J('SCRHOST.em') === 0.015 && J('CAMP_PAGEHUD.em') === 0.0112);
g.run(`window.S = __scene(); window.R = scrHostMount(S);`);
check('mount makes the root once and puts it on the page: aria-hidden, class sc-root, in the body', J('!!R') && J('document.body.children.length') === 1 && J('R.root.className') === 'sc-root' && J(`R.root.attrs['aria-hidden']`) === 'true');
check('it sits over the canvas rectangle at the menus\' em', J('R.root.style.left') === '10px' && J('R.root.style.top') === '20px' && J('R.root.style.width') === '1280px' && J('R.root.style.height') === '720px' && J('R.root.style.fontSize') === '19.2px');
g.run(`window.__w0 = __writes; scrHostMount(S);`);
check('mount again: the same host, and not one write when nothing moved', J('scrHostMount(S) === R') && J('__writes') === J('__w0') && J('document.body.children.length') === 1);
g.run(`S.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 }); __w0 = __writes; scrHostMount(S);`);
check('the canvas is resized: the root follows, the em halves (9.6 px), and only what moved is written', J('R.root.style.width') === '640px' && J('R.root.style.fontSize') === '9.6px' && J('__writes - __w0') >= 4 && J('__writes - __w0') <= 5, J('__writes - __w0'));
g.run(`window.__e = scrHostEl(R, 'div', 'sc-p'); __w0 = __writes; scrHostSet(__e, 'text', 'Paused'); scrHostSet(__e, 'text', 'Paused'); scrHostSet(__e, 'cls', 'sc-p sc-dim'); scrHostSet(__e, 'cls', 'sc-p sc-dim');`);
check('the diff-writer (the page HUD\'s own) writes a value once: two sets of the same text and the same class are two writes', J('__writes - __w0') === 2 && J('__e._text') === 'Paused' && J('__e.parentNode === R.root'));
g.run(`window.__chip = scrHostChip(R, __e, scrChip('pick')); window.__ring = scrHostRing(R, __e, scrRing(0.5, { text: 'W' })); window.__met = scrHostMeter(R, __e, scrMeter(0.2)); window.__pill = scrHostPill(R, __e, scrPill('Shield', true));`);
check('a chip carries the table\'s cap and its role; a ring its share and tone; a meter its width and tone; a pill its tick and word', J('__chip._text') === J('CAMP_KEYS.pick.k') && J(`__chip.attrs['data-key']`) === 'pick' && J(`__ring.style['--v']`) === '50' && J(`__ring.style['--c']`) === 'var(--sc-warn)' && J('__ring.children[0]._text') === 'W' && J('__met.children[0].style.width') === '20%' && J(`__met.children[0].style.background`) === 'var(--sc-foe)' && J('__pill.children[0]._text') === '✓' && J('__pill.children[1]._text') === 'Shield');
g.run(`window.__clicks = []; window.__t1 = scrHostTile(R, __e, { id: 'm2', on: true, onClick: (id) => __clicks.push(id) }); window.__t2 = scrHostTile(R, __e, { id: 'm3', dim: true });`);
check('a tile with a handler is a click target (class act); a tile without one is not; the click calls it with the id', / act/.test(J('__t1._cls')) && !/ act/.test(J('__t2._cls')) && /on/.test(J('__t1._cls')) && /lock/.test(J('__t2._cls')) && (() => { g.run(`__t1.listeners.click[0]({})`); return J('__clicks.join()') === 'm2'; })());
check('nothing is focusable: only div, span, i, b and small were made (no button, input, a, select), and no tabindex was set', J('__tags.every(t => ["div", "span", "i", "b", "small", "body"].indexOf(t) >= 0)') && J('__attrs.indexOf("tabindex") < 0'), J('[...new Set(__tags)]').join());
check('a press on a tile never takes focus or selects text: mousedown is prevented', (() => { g.run(`window.__pd = 0; __t1.listeners.mousedown[0]({ preventDefault() { __pd++; } })`); return J('__pd') === 1; })());
check('the scene ending takes the host off the page (shutdown and destroy)', J('typeof S.events.fns.shutdown') === 'function' && (() => { g.run(`S.events.fns.shutdown()`); return J('document.body.children.length') === 0 && J('S.scrHost') === null; })());
g.run(`window.S2 = __scene(); scrHostMount(S2);`);
check('scrHostDrop takes it off once, and a scene with none says no', J('scrHostDrop(S2)') === true && J('document.body.children.length') === 0 && J('scrHostDrop(S2)') === false && J('scrHostDrop(null)') === false);
check('no scene, no canvas, no page: nothing is made', J('scrHostMount(null)') === null && J('scrHostMount({})') === null && J('scrHostMount({ game: { canvas: {} } })') === null);
{
  const host = code('src/scrhost.js');
  check('the host reuses the page HUD\'s element maker and diff-writer, and has no focus call, no tabindex, no button or input, no image, no request', /campPageHudEl\(/.test(host) && /campPageHudSet\(/.test(host) && !/\.focus\(|tabindex|createElement\(\s*['"](button|input|a|select|textarea|img|script)|new Image|fetch\(|XMLHttpRequest|innerHTML|data:image/i.test(host));
  check('no letter of a key is written in the host\'s or the helpers\' code: a quoted single capital, or a key name as a chip text', !/['"][A-Z]['"]/.test(host) && !/['"][A-Z]['"]/.test(code('src/screens.js')) && !/['"](Enter|Esc|Backspace|Space)['"]/.test(host + code('src/screens.js')));
}

console.log('F. the style');
{
  const css = src('src/screens.css'), body = css.replace(/\/\*[\s\S]*?\*\//g, ''), sel = body.split('}').map(r => r.split('{')[0].trim()).filter(Boolean);
  check('every selector is inside .sc-root or a .sc- class (no bare element, no id, nothing of the page\'s own is touched)', sel.every(s => s.split(',').every(p => /^\.sc-/.test(p.trim()))), sel.filter(s => s.split(',').some(p => !/^\.sc-/.test(p.trim()))).join(' | '));
  check('the root takes no click; only .act takes one', /\.sc-root\{[^}]*pointer-events:none/.test(body) && /\.sc-root \*\{[^}]*pointer-events:none/.test(body) && /\.sc-root \.act\{[^}]*pointer-events:auto/.test(body));
  check('the root is fixed over the page above the flight HUD (z 6, the HUD is 5) and below Settings\' inputs (20), and clips what runs out', /position:fixed/.test(body) && /z-index:6/.test(body) && J('SCRHOST.z') === 6 && /camppagehud\.css/.test(src('index.html')) && /\.ph-root\s*\{[^}]*z-index:\s*5/.test(src('src/camppagehud.css')) && /overflow:hidden/.test(body));
  check('no image, no web font, no import, no request: no url(, @import, @font-face or http in the style', !/url\(|@import|@font-face|https?:/i.test(body));
  const mock = src('docs/screens-mock.html'), root = /:root\{([^}]*)\}/.exec(mock)[1], tok = {}; root.split(';').forEach(d => { const m = /^--([a-z]+):(.*)$/.exec(d.trim()); if (m) tok[m[1]] = m[2].trim(); });
  const mine = {}; /\.sc-root\{([^}]*)\}/.exec(body)[1].split(';').forEach(d => { const m = /^--sc-([a-z]+):(.*)$/.exec(d.trim()); if (m) mine[m[1]] = m[2].trim(); });
  const same = Object.keys(mine).filter(k => k in tok), diff = same.filter(k => mine[k] !== tok[k]);
  check('the tokens are the mock\'s (the same value for every token the mock has: bg, ink, mute, line, panel, good, mine, blue, amber, foe, alien, gold, text)', same.length >= 12 && diff.length === 0, diff.map(k => k + ' ' + mine[k] + ' vs ' + tok[k]).join(' | '));
  check('the one token the mock has no name for (warn) is the amber the HUD\'s warning is', mine.warn === tok.amber);
  check('the pieces the mock draws are here: chip, label, titles, meter, ring, pill, tile, panel', ['sc-k', 'sc-lab', 'sc-t1', 'sc-t2', 'sc-t3', 'sc-m', 'sc-ring', 'sc-pill', 'sc-tile', 'sc-p'].every(c => body.indexOf('.' + c + '{') >= 0 || body.indexOf('.' + c + ',') >= 0 || body.indexOf('.' + c + '>') >= 0 || body.indexOf('.' + c + '.') >= 0));
  check('index.html loads the style once and the two scripts once, after the page HUD\'s and the data they use (data_controls.js, campaign.js, camppagehud.js)', (src('index.html').match(/screens\.css/g) || []).length === 1 && (src('index.html').match(/src\/screens\.js/g) || []).length === 1 && (src('index.html').match(/src\/scrhost\.js/g) || []).length === 1 && ['src/data_controls.js', 'src/campaign.js', 'src/camppagehud.js'].every(f => src('index.html').indexOf(f) < src('index.html').indexOf('src/screens.js')) && src('index.html').indexOf('src/screens.js') < src('index.html').indexOf('src/scrhost.js'));
}

console.log('G. the Settings row, the words and the rule; no screen changes');
check('the new words are in the table and the file the same, six keys of scr.set', (() => { const md = src('content/text/screens.md'), keys = [...md.matchAll(/^\| (scr\.[\w.]+) \| (.*) \|$/gm)].map(m => m[1]); return keys.length === 6 && keys.every(k => J(`uiText('${k}')`) !== k); })());
check('the voicepack says scr. is shown, never said', J(`VOICEPACK_FAMILIES.some(r => r.re.test('scr.set.row') && r.why && !r.spoken)`) === true);
check('the Settings row is in CONTENT: a button that flips the switch, Enter does it too, and the row reads the switch', /scrOn\(\)/.test(src('src/settings.js')) && /screensToggle\(\)/.test(src('src/settings.js')) && /this\.section === 'content'\) this\.screensToggle/.test(src('src/settings.js')));
{
  g.run(`
    window.__btn = () => { const b = { text: '', on: false, edge: 0, set(s) { b.text = s; return b; }, color() { return b; }, mark(o) { b.on = !!o; return b; }, draw() {} }; return b; };
    window.__said = []; window.__row = { slots: { scrOn: __btn() }, say(m) { __said.push(m); } };
    CAMP.flags.screens = false; localStorage.removeItem(SCR.store);
    Settings.prototype.screensToggle.call(__row);
  `);
  check('the first press turns them ON: the flag, the memory, the button and the line say so', J('CAMP.flags.screens') === true && J('localStorage.getItem(SCR.store)') === '1' && J('__row.slots.scrOn.text') === 'New screens: ON' && J('__row.slots.scrOn.on') === true && J('__said[0]') === 'New screens ON.');
  g.run(`Settings.prototype.screensToggle.call(__row);`);
  check('the second turns them OFF again', J('CAMP.flags.screens') === false && J('localStorage.getItem(SCR.store)') === '0' && J('__row.slots.scrOn.text') === 'New screens: OFF' && J('__said[1]') === 'New screens OFF: the screens are as they were.');
}
// the pieces of the new screens that have landed, each behind the switch (one name a piece: the first piece's files are the Campaign scene's cards, card space-game-screens-a-cards; the ready room's are card space-game-screens-c-hub; a later piece adds its own names here)
const PIECES = ['campaignscene.js', 'scrcards.js', 'scrcardsdraw.js', 'camphub.js', 'camphubscene.js', 'scrhub.js', 'scrhubdraw.js', 'campbriefdraw.js', 'scrbrief.js', 'scrbriefdraw.js'];
{ // nothing but the helpers, the host, the Settings row and the pieces names the new pieces' functions (each piece's own suite holds it to the switch: tests/scrcards.mjs)
  const own = ['screens.js', 'scrhost.js', 'settings.js'].concat(PIECES), used = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js') && own.indexOf(f) < 0 && /\b(scr(On|Set|Load|Key|Chip|Chips|Words|Ring|Meter|Pill|Host\w*)|SCR_BUDGET|SCRHOST)\b/.test(code('src/' + f)));
  check('no unlisted file names any of them: only the helpers, the host, the Settings row and the pieces', used.length === 0, used.join());
  const st = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js') && ['scrhost.js'].concat(PIECES).indexOf(f) < 0 && /scrHostMount\(/.test(code('src/' + f)));
  check('and nothing but a piece mounts the host', st.length === 0, st.join());
}
check('scrOn is called from the Settings row and the pieces alone', (() => { const c = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js') && /\bscrOn\(/.test(code('src/' + f))); return c.indexOf('settings.js') >= 0 && c.every(f => f === 'settings.js' || PIECES.indexOf(f) >= 0); })());

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
