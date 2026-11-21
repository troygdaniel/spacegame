// smoke: the title starts a mode only on a deliberate choice, not on any key (plain Node, no Chrome)
// Card space-game-title-any-key (Troy, 21 Nov 2026: pretty much any key started Long Haul, Alt+Tab did it). A mode starts only on its own key (Long Haul keeps ENTER, the Campaign keeps K), or the arrows to move the
// highlight and Enter to do the highlighted one, or a click on its panel. A modifier key does nothing, a key held with Alt, Ctrl, Meta or Shift does nothing, nothing is taken in the first 600 ms after the window gets focus back.
//   A. the pure rule titleKeyAct: the choices, the arrows, every other key, the modifiers, the held-with-a-modifier keys, the focus grace, a repeat
//   B. the scene through its real create(): Enter, the arrows then Enter, K, the Alt+Tab and Cmd+Tab sequences, the window's focus, the click on the sky, the highlight
//   C. the words and the tables: the key table, the Long Haul line, the reset line say Enter, not "any key"
// Run: node tests/titlekeys.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 160) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const act = (S, e, now) => J(`titleKeyAct(${JSON.stringify(S)}, ${JSON.stringify(Object.assign({ repeat: false }, e))}, ${now == null ? 100000 : now})`);
const idle = { sel: 0, focusAt: -1e9 };

// ---- A. the pure rule
console.log('A. the rule');
check('the table: a grace of 600 ms, Enter and the keypad Enter, the four arrows, and the keys the title always had (H V C S O K)', J('TITLE_KEYS.grace') === 600 && J('TITLE_KEYS.enter').join() === 'Enter,NumpadEnter' && J('TITLE_KEYS.prev.concat(TITLE_KEYS.next)').length === 4 && ['KeyH', 'KeyV', 'KeyC', 'KeyS', 'KeyO', 'KeyK'].every(k => J(`TITLE_KEYS.other.${k}`)));
check('Enter with Long Haul lit starts Long Haul; the keypad Enter too', act(idle, { code: 'Enter' }).act === 'long' && act(idle, { code: 'NumpadEnter' }).act === 'long');
check('Enter with the Campaign lit opens the Campaign', act({ sel: 1, focusAt: -1e9 }, { code: 'Enter' }).act === 'campaign');
check('K opens the Campaign whichever is lit', act(idle, { code: 'KeyK' }).act === 'campaign' && act({ sel: 1, focusAt: -1e9 }, { code: 'KeyK' }).act === 'campaign');
check('H V C S O do what they did (the Campaign\'s key page, the ship voice, the chat keys, Settings, Mods)', ['KeyH:help', 'KeyV:voice', 'KeyC:chat', 'KeyS:settings', 'KeyO:mods'].every(p => act(idle, { code: p.split(':')[0] }).act === p.split(':')[1]));
check('the arrows move the highlight: Down and Right to the next, Up and Left to the previous, round (two choices: Long Haul, the Campaign)', act(idle, { code: 'ArrowDown' }).sel === 1 && act(idle, { code: 'ArrowRight' }).sel === 1 && act({ sel: 1, focusAt: -1e9 }, { code: 'ArrowUp' }).sel === 0 && act({ sel: 1, focusAt: -1e9 }, { code: 'ArrowLeft' }).sel === 0 && act(idle, { code: 'ArrowUp' }).sel === 1 && act({ sel: 1, focusAt: -1e9 }, { code: 'ArrowDown' }).sel === 0 && act(idle, { code: 'ArrowDown' }).act === 'move');
const others = ['KeyZ', 'KeyG', 'KeyE', 'KeyW', 'KeyA', 'KeyD', 'KeyL', 'Space', 'Digit1', 'Numpad5', 'Escape', 'Backspace', 'Backquote', 'Tab', 'KeyM', 'F5', 'CapsLock', 'ContextMenu'];
check('every other key does nothing (' + others.length + ' of them, M too: the sound keeps M, and Space and Esc no longer start anything)', others.every(c => act(idle, { code: c }).act === ''));
check('a modifier key does nothing: Alt, Meta, Ctrl, Shift, Tab (as the browser sends them, with their own flag set)', [['AltLeft', { altKey: true }], ['AltRight', { altKey: true }], ['MetaLeft', { metaKey: true }], ['MetaRight', { metaKey: true }], ['OSLeft', { metaKey: true }], ['ControlLeft', { ctrlKey: true }], ['ShiftLeft', { shiftKey: true }], ['ShiftRight', { shiftKey: true }], ['Tab', {}]].every(([c, f]) => act(idle, Object.assign({ code: c }, f)).act === ''));
check('a key held with a modifier does nothing: Cmd+K, Ctrl+K, Alt+Enter, Shift+Enter, Ctrl+S, Alt+ArrowDown, Cmd+H', [['KeyK', 'metaKey'], ['KeyK', 'ctrlKey'], ['Enter', 'altKey'], ['Enter', 'shiftKey'], ['KeyS', 'ctrlKey'], ['ArrowDown', 'altKey'], ['KeyH', 'metaKey'], ['NumpadEnter', 'metaKey']].every(([c, f]) => act(idle, { code: c, [f]: true }).act === '' && act(idle, { code: c, [f]: true }).sel === 0));
check('the Alt+Tab keys in the order a window sees them: Alt down, Tab down (Alt held): nothing starts', act(idle, { code: 'AltLeft', altKey: true }).act === '' && act(idle, { code: 'Tab', altKey: true }).act === '');
check('and Cmd+Tab on a Mac: Meta down, Tab down (Meta held): nothing starts', act(idle, { code: 'MetaLeft', metaKey: true }).act === '' && act(idle, { code: 'Tab', metaKey: true }).act === '');
check('a key held down (a repeat) does nothing, Enter included', act(idle, { code: 'Enter', repeat: true }).act === '' && act(idle, { code: 'KeyK', repeat: true }).act === '');
check('nothing is taken in the first 600 ms after the window gets focus back: Enter at 100, 599 ms is nothing; at 600 ms it is a choice', act({ sel: 0, focusAt: 99900 }, { code: 'Enter' }).act === '' && act({ sel: 0, focusAt: 99401 }, { code: 'Enter' }).act === '' && act({ sel: 0, focusAt: 99400 }, { code: 'Enter' }).act === 'long' && act({ sel: 0, focusAt: 99900 }, { code: 'KeyK' }).act === '' && act({ sel: 0, focusAt: 99900 }, { code: 'ArrowDown' }).act === '');
check('a missing event or a missing focus time is safe', J('titleKeyAct({ sel: 0 }, null, 5).act') === '' && J('titleKeyAct({ sel: 0 }, { code: "Enter" }, 5).act') === 'long');
check('the rule is pure: it does not change the state it is given', (() => { const S = { sel: 0, focusAt: -1e9 }; g.run(`window.__S = ${JSON.stringify(S)}; titleKeyAct(__S, { code: 'ArrowDown' }, 1e6);`); return JSON.stringify(J('__S')) === JSON.stringify(S); })());

// ---- B. the scene
console.log('B. the scene');
g.run(`
  window.__calls = []; window.__go0 = go; go = (s, key, data) => { __calls.push('go ' + key); };
  window.__cuiu0 = contentTitleUi; contentTitleUi = () => ({ handleKey: () => false });
  window.__opened = []; window.__fns = {}; ['voiceOpenSetup', 'chatOpenSetup', 'modsOpenSetup', 'settingsOpen', 'campKeysToggle'].forEach(k => { __fns[k] = window[k]; window[k] = () => { __opened.push(k); }; });
  window.__keyCap0 = keyCap; keyCap = () => ({ kw: 40, setPosition() { return this; }, setDepth() { return this; } });
  window.__wl = {}; window.__dl = {}; window.__sets = []; window.__gcalls = []; window.__inputOn = [];
  window.__pw0 = { add: window.addEventListener, rm: window.removeEventListener }; window.addEventListener = (ev, fn) => { __wl[ev] = fn; }; window.removeEventListener = () => {};
  window.__newTitle = () => { __calls.length = 0; __opened.length = 0; __gcalls.length = 0; __inputOn.length = 0; __wl = {};
    const rec = () => { const p = new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : k === Symbol.toPrimitive ? () => 0 : p), apply: () => p, construct: () => p }); return p; };
    const gr = () => { const r = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => { __gcalls.push([k].concat(a)); return r; }) }); return r; };
    const f = Object.create(Title.prototype); f.add = rec(); f.add = new Proxy(rec(), { get: (t, k) => k === 'graphics' ? gr : (k === 'zone' ? () => { const z = { setInteractive() { return z; }, setDepth() { return z; }, on() { return z; } }; return z; } : rec()[k]) });
    f.tweens = rec(); f.time = rec(); f.cameras = rec(); f.scene = { start: (k) => __calls.push('scene.start ' + k) };
    f.input = { keyboard: { on: (ev, fn) => { if (ev === 'keydown') f.__key = fn; } }, on: (ev, fn) => { __inputOn.push(ev); } };
    Title.prototype.create.call(f); f.born = -1e9; return f; };
`);
const made = J('(() => { try { window.T = __newTitle(); return typeof T.__key; } catch (e) { return String(e.stack || e); } })()');
check('the whole create() of the title runs (a typo anywhere would stop here)', made === 'function', made);
const key = (code, flags) => g.run(`__calls.length = 0; T.__key(Object.assign({ code: ${JSON.stringify(code)}, repeat: false }, ${JSON.stringify(flags || {})}))`);
key('Enter'); check('Enter starts Long Haul (the first highlighted choice)', J('__calls').join() === 'go Station');
key('KeyK'); check('K opens the Campaign (its ready room)', /go CampHub|go Campaign/.test(J('__calls').join()), J('__calls').join());
g.run('T = __newTitle();'); key('ArrowDown'); check('Down moves the highlight to the Campaign and starts nothing', J('T.sel') === 1 && J('__calls.length') === 0);
key('Enter'); check('then Enter opens the Campaign', /go CampHub|go Campaign/.test(J('__calls').join()), J('__calls').join());
g.run('T = __newTitle();'); key('ArrowDown'); key('ArrowUp'); key('Enter'); check('Down, Up, Enter is Long Haul again', J('T.sel') === 0 && J('__calls').join() === 'go Station');
g.run('T = __newTitle();');
['KeyZ', 'KeyG', 'Space', 'Digit1', 'Escape', 'Tab', 'KeyM', 'Backquote', 'KeyE'].forEach(c => key(c));
check('Z, G, Space, 1, Esc, Tab, M, ` and E start nothing', J('__calls.length') === 0);
key('AltLeft', { altKey: true }); key('Tab', { altKey: true }); key('MetaLeft', { metaKey: true }); key('Tab', { metaKey: true }); key('ControlLeft', { ctrlKey: true }); key('ShiftLeft', { shiftKey: true });
check('the Alt+Tab, Cmd+Tab, Ctrl and Shift keys start nothing', J('__calls.length') === 0);
key('Enter', { altKey: true }); key('KeyK', { metaKey: true }); key('Enter', { ctrlKey: true }); key('Enter', { shiftKey: true });
check('Alt+Enter, Cmd+K, Ctrl+Enter and Shift+Enter start nothing', J('__calls.length') === 0);
g.run('T = __newTitle(); __opened.length = 0;'); ['KeyV', 'KeyC', 'KeyS', 'KeyO', 'KeyH'].forEach(c => key(c));
check('V, C, S, O and H open what they opened (the voice, the chat keys, Settings, Mods, the key page)', J('__opened').join() === 'voiceOpenSetup,chatOpenSetup,settingsOpen,modsOpenSetup,campKeysToggle', J('__opened').join());
g.run('T = __newTitle();');
check('the scene listens for the window\'s focus', typeof J('typeof __wl.focus') === 'string' && J('typeof __wl.focus') === 'function', J('Object.keys(__wl)'));
g.run('__wl.focus();'); key('Enter'); check('right after the window gets its focus back Enter starts nothing (the end of an Alt+Tab)', J('__calls.length') === 0);
g.run('T.focusAt = performance.now() - 700;'); key('Enter'); check('and 700 ms later it is a choice again', J('__calls.join()') === 'go Station' || J('__calls').join() === 'go Station');
g.run('T = __newTitle();');
check('a click on the empty sky starts nothing: the scene no longer listens to a click anywhere (only the panels\' zones and the chips do)', !J('__inputOn').includes('pointerdown') && !/this\.input\.on\('pointerdown'/.test(src('src/title.js')), J('__inputOn'));
check('the highlight is drawn: a frame round Long Haul at first, round the Campaign after Down (the left edge of each panel less the frame)', (() => { const first = J('__gcalls.filter(c => c[0] === "strokeRoundedRect").pop()'); key('ArrowDown'); const second = J('__gcalls.filter(c => c[0] === "strokeRoundedRect").pop()'); return first && second && first[1] < second[1] && second[1] > 640 - 0 && first[1] + 380 + 10 < second[1] + 20; })(), JSON.stringify(J('__gcalls.filter(c => c[0] === "strokeRoundedRect")')));

// ---- C. the words and the tables
console.log('C. the words');
const rows = J('CONTROLS.find(g => g.id === "title").rows');
check('the key table\'s TITLE group says Enter starts the game, the arrows pick, K opens the Campaign, and no longer "Any key"', rows.some(r => r.k.join() === 'Enter') && rows.some(r => r.k.join() === 'Up,Down') && rows.some(r => r.k.join() === 'K') && !rows.some(r => r.k.join() === 'Any key') && rows.some(r => r.k.join() === 'S'), JSON.stringify(rows.map(r => r.k.join())));
check('the Long Haul panel\'s line and the reset line say Enter, not any key', /Enter starts it/.test(J(`uiText('title.long.sub')`)) && /Press Enter on the title screen/.test(src('src/settings.js')) && !/Press any key on the title/.test(src('src/settings.js')));
check('the key line at the foot names the arrows and still ends with K Campaign', /Up Down choose    K Campaign'/.test(src('src/title.js')));
check('the file and the game table agree on the Long Haul line', /Enter starts it; the arrows pick/.test(src('content/text/title.md')) && /Enter starts it; the arrows pick/.test(src('src/contenttables.js')));
g.run(`go = __go0; keyCap = __keyCap0; contentTitleUi = __cuiu0; Object.keys(__fns).forEach(k => { window[k] = __fns[k]; }); window.addEventListener = __pw0.add; window.removeEventListener = __pw0.rm;`);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `TITLE KEYS FAIL (${failed} of ${n})` : `TITLE KEYS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
