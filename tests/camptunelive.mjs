// smoke: the live sliders of the cruiser's feel (the strip over the running battle): a real slider for each of the five numbers, each felt at once, with its default, a reset and the five numbers as text
// Card space-game-cruiser-feel-sliders (Troy, 26 Nov 2026: "give him live sliders on the N tuning panel for the cruiser's top speed, thrust, turn, boost speed and the mission's start zoom, taking effect
// at once, with defaults shown, a reset, and the five values shown as text"). The rules are src/camptune.js (tests/camptune.mjs section J has them and the flight); this is the strip, src/camptunedraw.js
// (campTuneLiveOpen), with a stand-in page: elements that keep their class, their text, their listeners; the real look is looked at in Chrome by hand.
//   A. the strip: five sliders from the rows' own ranges, each with its name, its value, its default; the line of five numbers; Reset and Close
//   B. a slider moved: the number is in the table at once and the strip shows it (changed, with the default beside it); the line follows
//   C. the start zoom: the flight's view is wanted at the new start zoom now
//   D. Reset puts the five back; Close takes the strip out of the page; N closes it in the scene; the scene's end does too
//   E. the keyboard goes back to the ship the moment a slider lets go; a slider with the focus does not pass its keys on
//   F. from the N panel in a flight: the Live sliders row closes the panel, the battle runs, the strip is up; in the ready room there is no such row
//   G. nothing leaves the page: the strip's code does not touch the clipboard, the network or any storage itself; the rules are em and pale blue, never amber
// Run: node tests/camptunelive.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, failed = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run('CAMP.bay.startOut = false;');

// the stand-in page: elements with a class, a text, children, listeners, and the few properties a slider has
g.run(`
  window.__mkdoc = () => {
    const mk = tag => { const e = { tag, children: [], parentNode: null, className: '', textContent: '', type: '', min: '', max: '', step: '', value: '', blurred: 0, L: {} };
      e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; };
      e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
      e.addEventListener = (t, f) => { (e.L[t] = e.L[t] || []).push(f); };
      e.fire = (t, ev) => (e.L[t] || []).forEach(f => f(ev || {}));
      e.blur = () => { e.blurred++; };
      return e; };
    window.document = { createElement: mk, body: mk('body') };
    window.__all = el => [el].concat(...el.children.map(c => __all(c)));
    window.__by = cls => __all(document.body).filter(e => new RegExp('(^| )' + cls + '( |$)').test(e.className));
    return document;
  };
  window.__sc = () => { const C = campNew(1, [], { seed: 1 }), ev = {}; return { mode: 'play', leaving: false, mp: null, camp: C, add: Phaser, pn: campPanelNew(), time: { now: 0 }, openTune: Campaign.prototype.openTune, closeTune: Campaign.prototype.closeTune, events: { once: (n, f) => { ev[n] = f; } }, __ev: ev }; };
`);

console.log('A. the strip');
g.run('campTuneResetAll(); __mkdoc(); window.S = __sc(); window.__ok = campTuneLiveOpen(S);');
check('it opens in a flight (a page and a scene with a battle), and not twice', J('__ok') === true && J('campTuneLiveOpen(S)') === false && J('campTuneLiveIsOpen(S)') === true && J('__by("ct-live").length') === 1);
const rows = J('__by("ct-r").map(r => ({ n: r.children[0].children[0].textContent, v: r.children[0].children[1].textContent, t: r.children[1].type, min: r.children[1].min, max: r.children[1].max, step: r.children[1].step, val: r.children[1].value, d: r.children[2].textContent, cls: r.className }))');
check('five rows: Cruiser top speed, Cruiser thrust, Cruiser turn rate, Boost top speed, Start zoom', rows.map(r => r.n).join() === 'Cruiser top speed,Cruiser thrust,Cruiser turn rate,Boost top speed,Start zoom', rows.map(r => r.n).join());
check('each is a real slider (type range) from its row\'s own range and step', rows.every(r => r.t === 'range') && rows[0].min === '60' && rows[0].max === '600' && rows[0].step === '10' && rows[1].min === '170' && rows[1].max === '900' && rows[2].max === '4' && rows[3].min === '210' && rows[3].max === '1000' && rows[4].min === '0.2' && rows[4].max === '1' && rows[4].step === '0.005', JSON.stringify(rows));
check('each shows its value and today\'s default: 210 px/s, 340, 2.2 rad/s, 330 px/s, 0.335', rows.map(r => r.v).join() === '210 px/s,340 px/s a second,2.2 rad/s,330 px/s,0.335 x' && rows.map(r => r.d).join() === 'default 210 px/s,default 340 px/s a second,default 2.2 rad/s,default 330 px/s,default 0.335 x', rows.map(r => r.v + '|' + r.d).join('  '));
check('the five numbers are written out as text under them (so they can be read back)', J('S.tl.line.textContent') === 'Top speed 210 px/s · Thrust 340 · Turn 2.2 rad/s · Boost 330 px/s · Start zoom 0.335' && J('__by("ct-l").length') === 1, J('S.tl.line.textContent'));
check('a Reset button and a Close button, with their words', J('__by("ct-b").map(b => b.textContent).join()') === 'Reset to defaults,Close' && J('__by("ct-h")[0].textContent') === 'Cruiser feel, live');

console.log('B. a slider moved');
g.run('window.__slide = (i, v) => { const inp = __by("ct-s")[i]; inp.value = String(v); inp.fire("input"); };');
g.run('__slide(0, 400)');
check('top speed to 400: the table has it at once (the flight reads it every frame), it shows 400 px/s, changed, the default beside it', J('CAMP.carrier.speed') === 400 && J('campTuneValue("cruiserspeed")') === 400 && J('__by("ct-v")[0].textContent') === '400 px/s' && /chg/.test(J('__by("ct-r")[0].className')) && J('__by("ct-d")[0].textContent') === 'default 210 px/s');
g.run('__slide(1, 700); __slide(2, 3.5); __slide(3, 800)');
check('thrust 700, turn 3.5, boost 800: all in the table, the boost as a multiple of the top speed that holds it (800 / 400 = 2)', J('CAMP.carrier.accel') === 700 && J('CAMP.carrier.turn') === 3.5 && J('CAMP.boost.speed') === 2 && J('campTuneValue("boostspeed")') === 800);
check('the line of five numbers follows: 400, 700, 3.5, 800 and the start zoom as it was', J('S.tl.line.textContent') === 'Top speed 400 px/s · Thrust 700 · Turn 3.5 rad/s · Boost 800 px/s · Start zoom 0.335', J('S.tl.line.textContent'));
g.run('__slide(0, 700)');
check('a number out of range is put in range (700 is 600) and the slider says so', J('CAMP.carrier.speed') === 600 && J('__by("ct-s")[0].value') === '600');
g.run('__slide(3, 330)');
check('a boost at what reads as the default is the default: no override and the table\'s own multiple back', J('campTuneChanged("boostspeed")') === false);

console.log('C. the start zoom');
g.run('CAMZOOM.want = 1; __slide(4, 0.5)');
check('the start zoom slider moves the flight\'s view to it now (the scene is in a flight): the zoom wanted is 0.5', J('campZoomDefault()') === 0.5 && J('CAMZOOM.want') === 0.5 && J('__by("ct-v")[4].textContent') === '0.500 x');
g.run('CAMZOOM.want = 1; __slide(0, 500)');
check('another slider does not touch the view (the player\'s own zoom stays)', J('CAMZOOM.want') === 1);

console.log('D. Reset and Close');
g.run('__by("ct-b")[0].fire("click")');
check('Reset puts the five back: the table is as shipped, nothing is an override, the sliders and the line are the defaults', J('campTuneCount()') === 0 && J('CAMP.carrier.speed') === 210 && J('CAMP.carrier.accel') === 340 && J('CAMP.carrier.turn') === 2.2 && J('CAMP.boost.speed') === 1.57 && J('CAMPZOOM.view.startOver') === 0 && J('__by("ct-s").map(s => s.value).join()') === '210,340,2.2,330,0.335' && J('S.tl.line.textContent') === 'Top speed 210 px/s · Thrust 340 · Turn 2.2 rad/s · Boost 330 px/s · Start zoom 0.335', [J('campTuneCount()'), J('CAMP.carrier.speed'), J('CAMP.carrier.accel'), J('CAMP.carrier.turn'), J('CAMP.boost.speed'), J('CAMPZOOM.view.startOver'), J('__by("ct-s").map(s => s.value).join()'), J('S.tl.line.textContent')].join(' | '));
check('and the view is at the shipped start zoom again (Reset moved it back: the start zoom row changed)', J('campZoomDefault() > 0.334 && campZoomDefault() < 0.336') && J('CAMZOOM.want') === J('campZoomDefault()'));
check('no row is marked changed after it', J('__by("ct-r").every(r => !/chg/.test(r.className))'));
g.run('__by("ct-b")[1].fire("click")');
check('Close takes the strip out of the page', J('campTuneLiveIsOpen(S)') === false && J('__by("ct-live").length') === 0 && J('S.tl') === null);
g.run('campTuneLiveOpen(S); S.mode = "play"; Campaign.prototype.onKey.call(S, { code: "KeyN", repeat: false })');
check('N in the scene closes the strip when it is up (and opens no panel)', J('campTuneLiveIsOpen(S)') === false && J('campTuneIsOpen(S)') === false && J('S.mode') === 'play');
g.run('campTuneLiveOpen(S); S.__ev.shutdown()');
check('the end of the scene takes the strip with it', J('campTuneLiveIsOpen(S)') === false && J('__by("ct-live").length') === 0);

console.log('E. the keyboard');
g.run('campTuneLiveOpen(S); window.__st = 0; __by("ct-s")[0].fire("keydown", { stopPropagation() { __st++; } }); __by("ct-s")[0].fire("change"); __by("ct-s")[1].fire("pointerup");');
check('a slider with the focus keeps its keys to itself (stopPropagation), and lets go the moment it is released (blur on change and on pointerup), so the arrow keys fly again', J('__st') === 1 && J('__by("ct-s")[0].blurred') === 1 && J('__by("ct-s")[1].blurred') === 1);
check('the strip does not pause the battle: opening it leaves the scene\'s mode alone', J('S.mode') === 'play');
g.run('campTuneLiveClose(S)');

console.log('F. from the N panel');
g.run('campTuneResetAll(); __mkdoc(); window.S = __sc(); Campaign.prototype.onKey.call(S, { code: "KeyN", repeat: false });');
check('N in a flight opens the panel, the battle waits, and the panel has the Live sliders row third', J('campTuneIsOpen(S)') === true && J('S.mode') === 'pause' && J('campTuneItems(S.tp.model).map(i => i.kind).slice(0, 3).join()') === 'copy,reset,live');
g.run('Campaign.prototype.onKey.call(S, { code: "ArrowDown", repeat: false }); Campaign.prototype.onKey.call(S, { code: "ArrowDown", repeat: false }); Campaign.prototype.onKey.call(S, { code: "Enter", repeat: false });');
check('Enter on it: the panel closes, the battle runs again (mode play) and the strip is up over it', J('campTuneIsOpen(S)') === false && J('S.mode') === 'play' && J('campTuneLiveIsOpen(S)') === true && J('__by("ct-live").length') === 1);
g.run('campTuneLiveClose(S); __mkdoc(); window.RR = { leaving: false, hub: { open: "" }, P: {}, d: {}, add: Phaser, paint() {}, apply() {} }; campTuneOpen(RR);');
check('in the ready room (no battle) the panel has no Live sliders row', J('campTuneIsOpen(RR)') === true && J('campTuneItems(RR.tp.model).every(i => i.kind !== "live")') === true);
g.run('campTuneClose(RR)');

console.log('G. nothing leaves the page, and the look');
const draw = readFileSync(ROOT + '/src/camptunedraw.js', 'utf8'), live = draw.slice(draw.indexOf('// ---------- the live strip'));
check('the strip\'s code does not use the clipboard, the network or storage (the overrides are kept by the table\'s own save, as every override is)', !/clipboard|fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|WebSocket/.test(live.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.split('// ')[0]).join('\n')));
const css = readFileSync(ROOT + '/src/camppagehud.css', 'utf8'), rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({ sel: m[1].replace(/\/\*.*?\*\//gs, '').trim(), body: m[2] })).filter(r => /\.ct-/.test(r.sel));
check('the strip\'s rules (' + rules.length + ') are in em, a ratio or a 1px border, and hold no amber (a hue of 28 to 52 degrees) and none of the HUD\'s amber variables', rules.length >= 10 && rules.every(r => (r.body.match(/\d+(\.\d+)?px/g) || []).every(p => p === '1px')) && !/--ph-warn|--ph-ore|#ffc857|#ffb454|#e9b872|#ffd37a/i.test(rules.map(r => r.body).join('')));
check('the words are the content table\'s: the strip\'s title, its two buttons, the line', ['camp.ui.tune.live.title', 'camp.ui.tune.live.reset', 'camp.ui.tune.live.close', 'camp.ui.tune.feel.line'].every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
check('a quiet game: nothing in this test wrote to the console as an error', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
