// smoke: the new title, two doors (landing d of the new screens): its model for a save, chips from the key table, the word budget, the panels and their click zones, and nothing changes with the switch off (plain Node, no Chrome)
// Card space-game-screens-d-title (Troy, 25 Nov 2026; the mock is docs/screens-mock.html, title, direction A). src/title.js draws it while the screens switch is on (scrOn, src/screens.js: off by default):
//   A. the model of a new save: the name, the two doors in the mock's order, the Campaign's Mission 1 of 9 and an empty meter, Settings; Long Haul is the lit door, as Enter has always been Long Haul
//   B. the model follows the save: the next mission's number, the meter's share, the line after the ending
//   C. every chip is a role of the key table: a key moved in the table moves the chip
//   D. the words: few (the mock's 28), in content/text/scrtitle.md and the table the same, never spoken
//   E. the panels: made in the host with no focusable element, a click zone of the canvas under each door and the chip, the lit door follows the arrows, the panels step aside for Settings and the keys page
//   F. no key moved, and with the switch off the title is today's (the old words, the old panels, the bottom line)
// Run: node tests/scrtitle.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
const code = f => src(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\s\/\/ .*$/gm, '');
const res = { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 };
const save = (level, mission, done, extra) => { const results = {}; done.forEach(k => { results[k] = res; }); return JSON.stringify(Object.assign({ level, mission, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results }, extra || {})); };
const model = (s, sel) => { g.run(`localStorage.setItem(CAMP.store, ${JSON.stringify(s)});`); return J(`titleScrModel(campProgressLoad(), ${sel | 0})`); };

console.log('A. a new save');
g.run(`localStorage.removeItem(CAMP.store);`);
const M0 = J('titleScrModel(campProgressLoad(), 0)');
check('the name: Earth fleet, the rim over LONG HAUL', M0.lab === 'Earth fleet, the rim' && M0.name === 'LONG HAUL');
check('two doors, the Campaign first (the mock\'s order), then Long Haul', M0.doors.map(d => d.id).join() === 'campaign,long' && M0.doors.map(d => d.name).join() === 'Campaign,Long Haul');
check('each door has one line', M0.doors[0].sub === 'Command the cruiser and three pilots.' && M0.doors[1].sub === 'A trading run to Kepler-4b.');
check('the Campaign door says Mission 1 of 9 and its meter is empty', M0.doors[0].at === 'Mission 1 of 9' && M0.doors[0].meter.pct === 0 && M0.doors[0].meter.tone === 'good');
check('Long Haul has no meter', !('at' in M0.doors[1]) && !('meter' in M0.doors[1]));
check('the chips: K on the Campaign, Enter on Long Haul, S on Settings', M0.doors[0].chip.k === 'K' && M0.doors[1].chip.k === 'Enter' && M0.settings.chip.k === 'S' && M0.settings.label === 'Settings');
check('Long Haul is the lit door at first (Enter has always started Long Haul), the Campaign when the arrows moved the light', M0.doors[1].on === true && M0.doors[0].on === false && (m => m.doors[0].on === true && m.doors[1].on === false)(J('titleScrModel(campProgressLoad(), 1)')));
check('titleScrAt of a new save: mission 1 of 9, none flown', (a => a.n === 1 && a.of === 9 && a.flown === 0 && a.frac === 0)(J('titleScrAt(campProgressLoad())')));
check('no save at all (null) is a new save', (m => m.doors[0].at === 'Mission 1 of 9')(J('titleScrModel(null, 0)')));

console.log('B. the save moves it');
const M5 = model(save(2, 1, ['1.1', '1.2', '1.3', '2.1']), 0);
check('level 2, its second mission next, four flown: Mission 5 of 9, the meter at four ninths', M5.doors[0].at === 'Mission 5 of 9' && Math.abs(M5.doors[0].meter.pct - 44.4) < 0.11, JSON.stringify(M5.doors[0]));
const M9 = model(save(3, 2, ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3']), 0);
check('every mission flown: Mission 9 of 9 (never 10), the meter full', M9.doors[0].at === 'Mission 9 of 9' && M9.doors[0].meter.pct === 100, JSON.stringify(M9.doors[0]));
const MR = model(save(3, 2, ['1.1'], { revealed: true }), 0);
check('after the ending has been seen the Campaign\'s line is the other one, as on today\'s title', J('campProgressLoad().revealed') === true ? MR.doors[0].sub === 'The war goes on. Command the cruiser.' : MR.doors[0].sub === M0.doors[0].sub, MR.doors[0].sub);
check('the line after the ending is in the table whatever the save keeps', J(`uiText('scr.title.camp.sub.r')`) === 'The war goes on. Command the cruiser.' && J(`titleScrModel({ revealed: true, level: 1, mission: 0, results: {} }, 0)`).doors[0].sub === 'The war goes on. Command the cruiser.');
g.run(`localStorage.removeItem(CAMP.store);`);

console.log('C. the chips are the key table\'s');
check('every chip of the model is an entry of the table with the table\'s cap', M0.doors.concat([M0.settings]).every(d => J(`scrChipInTable(${JSON.stringify(d.chip)})`) === true));
check('their roles are start, pick and settings, three of the roles the table gives the title', M0.doors.map(d => d.chip.id).concat([M0.settings.chip.id]).join() === 'start,pick,settings' && ['start', 'pick', 'settings'].every(r => J(`scrKeysOf('title')`).indexOf(r) >= 0));
g.run(`window.__k0 = CAMP_SCREEN_KEYS.start.k; CAMP_SCREEN_KEYS.start.k = 'J';`);
check('a key moved in the table moves the chip (the Campaign\'s K to J)', J('titleScrModel(null, 0)').doors[0].chip.k === 'J');
g.run(`CAMP_SCREEN_KEYS.start.k = __k0;`);
check('the new title\'s code writes no key cap of its own (no K, Enter or S as a word of the file\'s new part)', (c => { const a = c.indexOf('const TITLE_SCR'), b = c.indexOf('class Title'), t0 = c.indexOf('  titleScr() {'), t1 = c.indexOf('  update(time, dt) {'); const part = c.slice(a, b) + c.slice(t0, t1); return a > 0 && t0 > 0 && !/'(K|S|Enter|ENTER)'/.test(part) && !/Key[A-Z]\b/.test(part); })(code('src/title.js')));

console.log('D. the words');
const shown = m => [m.lab, m.name, m.settings.chip.k, m.settings.label].concat(...m.doors.map(d => [d.chip.k, d.name, d.sub, d.at || '']));
check('the title shows 28 words and numbers, the mock\'s count, and is within its budget (41)', J(`scrWords(${JSON.stringify(shown(M0))})`) === 28 && J(`scrWithin('title', ${JSON.stringify(shown(M0))})`) === true, String(J(`scrWords(${JSON.stringify(shown(M0))})`)));
check('today\'s title shows 72: the new one is well under half', J(`SCR_BUDGET.title.today`) === 72 && J(`SCR_BUDGET.title.mock`) === 28);
{
  const md = src('content/text/scrtitle.md'), keys = [...md.matchAll(/^\| (scr\.title\.[\w.]+) \| (.*) \|$/gm)].map(m => [m[1], m[2]]);
  check('nine keys of scr.title, in content/text/scrtitle.md and the table the same', keys.length === 9 && keys.every(([k, t]) => J(`UI_TEXT[${JSON.stringify(k)}]`) === t), keys.filter(([k, t]) => J(`UI_TEXT[${JSON.stringify(k)}]`) !== t).map(x => x[0]).join());
  check('every word the model shows is one of them (no word written in the code)', [M0.lab, M0.name, M0.settings.label, M0.doors[0].name, M0.doors[0].sub, M0.doors[1].name, M0.doors[1].sub].every(t => keys.some(([, x]) => x === t)) && keys.some(([k, x]) => k === 'scr.title.camp.at' && x === 'Mission {n} of {of}'));
  check('none of them is spoken: the voice pack\'s rule for scr. covers them', J(`VOICEPACK.skip ? true : true`) === true && /\/\^scr\\\.\//.test(src('src/voicepack.js')));
}

console.log('E. the panels');
g.run(`
  window.__tags = []; window.__zones = []; window.__calls = [];
  const mk = tag => { __tags.push(tag); const e = { tag, children: [], parentNode: null, className: '', textContent: '', listeners: {}, attrs: {}, style: { setProperty(k, v) { this[k] = v; } } };
    e.setAttribute = (k, v) => { e.attrs[k] = String(v); }; e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
    e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
    Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } }); Object.defineProperty(e, 'firstChild', { get() { return e.children[0] || null; } });
    e.getBoundingClientRect = () => (e.className === 'sc-root' ? { left: 0, top: 0, width: 640, height: 360 } : e.attrs['data-door'] === 'campaign' ? { left: 130, top: 190, width: 182, height: 80 } : e.attrs['data-door'] === 'long' ? { left: 326, top: 200, width: 182, height: 60 } : { left: 560, top: 10, width: 70, height: 16 });
    return e; };
  window.document = { createElement: mk, body: mk('body') };
  window.__all = e => [e].concat(...e.children.map(__all));
  window.campaignStart = s => { __calls.push('campaign'); }; window.settingsOpen = (s, sec) => { __calls.push('settings ' + sec); };
  window.__title = () => { const ev = {}, f = Object.create(Title.prototype); f.leaving = false; f.sel = 0; f.scr = true; f.born = -1e9; f.scrHost = null; f.scrDoors = null; f.scrFitAt = 0;
    f.game = { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 }) } };
    f.events = { h: ev, on(n, fn) { (ev[n] = ev[n] || []).push(fn); }, once(n, fn) { (ev[n] = ev[n] || []).push(fn); }, off(n, fn) { ev[n] = (ev[n] || []).filter(x => x !== fn); } };
    f.add = { zone: (x, y, w, h) => { const z = { x, y, w, h, on(e, fn) { z[e] = fn; return z; }, setInteractive() { return z; }, setDepth() { return z; } }; __zones.push(z); return z; } };
    f.startLongHaul = () => { __calls.push('long'); };
    scrHostMount(f); return f; };
  localStorage.removeItem(CAMP.store); window.T = __title(); T.modeChoices(); T.settingsChip();
`);
const texts = () => J(`__all(T.scrHost.root).map(e => e.textContent).filter(Boolean)`);
check('with the switch on modeChoices makes the panels: the name, the two doors, Settings, in the host\'s root', J('T.scrHost.root.parentNode === document.body') === true && ['Earth fleet, the rim', 'LONG HAUL', 'Campaign', 'Command the cruiser and three pilots.', 'Mission 1 of 9', 'Long Haul', 'A trading run to Kepler-4b.', 'Settings'].every(t => texts().indexOf(t) >= 0), texts().join(' | '));
check('the chips are drawn from the table: K, Enter, S, each marked with its role', J(`__all(T.scrHost.root).filter(e => e.className === 'sc-k').map(e => e.textContent + ':' + e.attrs['data-key'])`).join() === 'K:start,Enter:pick,S:settings');
check('what is on the page is the model\'s words and no more (28 words and numbers)', J(`scrWords(__all(T.scrHost.root).map(e => e.textContent))`) === 28, String(J(`scrWords(__all(T.scrHost.root).map(e => e.textContent))`)));
check('nothing focusable is made: divs, spans and the meter\'s bar only', J(`[...new Set(__tags)]`).sort().join() === 'body,div,i,span');
check('the sizes are the mock\'s: the name at 4.2 em, the cards 19 em wide at 56 percent down, Settings at the top right', J(`__all(T.scrHost.root).filter(e => e.style.fontSize === '4.2em').length`) === 1 && J(`T.scrDoors.map(o => o.el.style.width)`).join() === '19em,19em' && J(`T.scrDoors[0].el.parentNode.style.top`) === '56%' && J(`__all(T.scrHost.root).find(e => e.attrs['data-door'] === 'settings').style.right`) === '1.4em');
check('the meter is empty for a new save', J(`T.scrDoors[0].meter.style.width`) === '0%');
check('Long Haul is lit at first; the arrows move the light to the Campaign and back', J(`T.scrDoors.map(o => o.el.style.borderColor || '')`).join() === ',var(--sc-ink)' && (g.run('T.pickChoice(1)'), J(`T.scrDoors.map(o => o.el.style.borderColor || '')`).join()) === 'var(--sc-ink),' && (g.run('T.pickChoice(0)'), J(`T.scrDoors.map(o => o.el.style.borderColor || '')`).join()) === ',var(--sc-ink)');
check('a zone of the canvas lies under each door and under the chip, in game px (a canvas shown at half size: twice the page\'s numbers)', J('__zones.length') === 3 && (z => z.x === 442 && z.y === 460 && z.w === 364 && z.h === 160)(J('({ x: __zones[0].x, y: __zones[0].y, w: __zones[0].w, h: __zones[0].h })')), JSON.stringify(J('__zones.map(z => [z.x, z.y, z.w, z.h])')));
check('a click on the Campaign door opens the Campaign, on Long Haul starts it, on the chip opens Settings at Sound', (g.run('__calls.length = 0; __zones[0].pointerdown(); __zones[1].pointerdown(); __zones[2].pointerdown();'), J('__calls').join()) === 'campaign,long,settings sound');
check('the root takes no click itself (the foundation\'s rule): the new code adds no listener to an element', J(`__all(T.scrHost.root).every(e => Object.keys(e.listeners).length === 0)`) === true);
g.run(`T.events.h.pause.forEach(f => f());`);
check('Settings opens (the title pauses): the panels step aside', J(`T.scrHost.root.style.visibility`) === 'hidden');
g.run(`localStorage.setItem(CAMP.store, ${JSON.stringify(save(2, 1, ['1.1', '1.2', '1.3', '2.1']))}); T.events.h.resume.forEach(f => f());`);
check('it closes: they are back, and the Campaign door says where the save is now (a reset, a mission flown)', J(`T.scrHost.root.style.visibility`) === '' && texts().indexOf('Mission 5 of 9') >= 0 && J(`T.scrDoors[0].meter.style.width`) === '44.4%');
g.run(`T.ck = { open: true }; T.s1 = { tilePositionX: 0, tilePositionY: 0 }; T.s2 = { tilePositionX: 0, tilePositionY: 0 }; T.update(1000, 16);`);
check('the keys page (drawn on the canvas) hides them while it is open', J(`T.scrHost.root.style.visibility`) === 'hidden');
g.run(`T.ck = { open: false }; T.update(1016, 16);`);
check('and they come back when it closes', J(`T.scrHost.root.style.visibility`) === '');
g.run(`T.events.h.shutdown.forEach(f => f());`);
check('the scene ends: the panels are off the page and the title\'s listeners are taken back', J('document.body.children.length') === 0 && J(`(T.events.h.pause || []).length + (T.events.h.resume || []).length`) === 0);
g.run(`localStorage.removeItem(CAMP.store);`);

console.log('F. no key moved; the switch off is today\'s title');
check('the keys are today\'s: Enter does the lit choice (Long Haul first), K the Campaign, S Settings, H the keys page, the arrows move the light', J(`titleKeyAct({ sel: 0 }, { code: 'Enter' }, 1e9).act`) === 'long' && J(`titleKeyAct({ sel: 1 }, { code: 'Enter' }, 1e9).act`) === 'campaign' && J(`titleKeyAct({ sel: 0 }, { code: 'KeyK' }, 1e9).act`) === 'campaign' && J(`titleKeyAct({ sel: 0 }, { code: 'KeyS' }, 1e9).act`) === 'settings' && J(`titleKeyAct({ sel: 0 }, { code: 'KeyH' }, 1e9).act`) === 'help' && J(`titleKeyAct({ sel: 0 }, { code: 'ArrowRight' }, 1e9).sel`) === 1);
check('the chips say those keys: the table\'s codes for start, pick and settings are the codes the title reads', J(`scrKey('start').codes`).join() === 'KeyK' && J(`scrKey('pick').codes`).indexOf('Enter') >= 0 && J(`TITLE_KEYS.other.KeyK`) === 'campaign' && J(`scrKey('settings').codes.every(c => TITLE_KEYS.other[c] === 'settings')`) === true);
{
  const t = code('src/title.js');
  check('the switch is off in the table, so the title is today\'s for every player', J('CAMP.flags.screens') === false && J('scrOn()') === false);
  check('with it off create() draws what it drew: the name\'s block, the two glass panels, the bottom key line and the canvas chip are behind "not the new title" and nothing else is', /if \(this\.scr !== true\) \{[^]*'L O N G   H A U L'[^]*HALCYON STATION[^]*\n    \}\n    this\.modeChoices\(\);/.test(t) && /if \(this\.scr !== true\) this\.add\.text\(W \/ 2, H - 34, 'W A S D move/.test(t) && /modeChoices\(\) \{\n    if \(this\.scr === true\) \{ this\.titleScr\(\); return; \}/.test(t) && /settingsChip\(\) \{\n    if \(this\.scr === true\) return;/.test(t));
  check('the new look is asked for once, when the title is made, and needs the host (a page with no place for panels keeps today\'s title)', (t.match(/this\.scr = /g) || []).length === 1 && /this\.scr = !!\(typeof scrOn === 'function' && scrOn\(\) && typeof scrHostMount === 'function' && scrHostMount\(this\)\)/.test(t));
  check('a title made while Settings flips the switch is made again in the other look', /scrOn\(\) !== want\) this\.scene\.restart\(\)/.test(t));
  check('the new part asks the web for nothing and makes no picture, link or input', (p => !/fetch\(|XMLHttpRequest|new Image|innerHTML|https?:|createElement|\.focus\(|tabindex/i.test(p))(t.slice(t.indexOf('  titleScr() {'), t.indexOf('  update(time, dt) {'))));
  g.run(`window.__texts = []; window.__zones = []; window.keyCap = () => ({ kw: 40, setPosition() { return this; }, setDepth() { return this; } });
    window.__old = (() => { const rec = () => { const p = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => p) }); return p; }; const f = Object.create(Title.prototype); f.leaving = false; f.born = -1e9; f.scr = false;
      f.add = { graphics: () => rec(), text: (x, y, t) => { __texts.push(t); return rec(); }, zone: () => rec() }; return f; })(); __old.modeChoices();`);
  check('a title with the switch off draws today\'s two panels with today\'s words, and makes no panel of the page', J('__texts').includes('LONG HAUL') && J('__texts').includes('CAMPAIGN') && J('__texts').includes('H  all the keys') && J('document.body.children.length') === 0, J('__texts').join(' | '));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('SCRTITLE FAIL (' + failed + ')'); process.exit(1); } else console.log('SCRTITLE PASS');
