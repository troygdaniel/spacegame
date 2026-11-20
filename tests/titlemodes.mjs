// smoke: the title offers Long Haul or the Campaign, and the Long Haul pause menu has a Title row that saves first (plain Node, no Chrome)
// Card space-game-title-modes. (1) The title (src/title.js) shows two choices, each a key and a click: Long Haul (Enter, or any other key as before) and the Campaign (K, as before);
// the words are in content/text/title.md. (2) The Long Haul pause menu (src/meta.js) gains a Title row, which saves and goes back to the title (the Campaign's pause card already had
// T title). From the title either game starts again; ?campaign=N and every other key of the title are as they were.
//   A. the words: in the file, in the table, short enough for the panels
//   B. the pause menu: the Title row, where it sits, what it does (saves first, stops the flight, starts the Title), nothing else of it moved
//   C. the title: the two choices, their keys and clicks, the keys of before, the address
//   D. the four paths: title to Long Haul and back, title to the Campaign and back
// Run: node tests/titlemodes.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ---------- A. the words ----------
console.log('A. the words');
{
  const keys = ['title.long.key', 'title.long.name', 'title.long.sub', 'title.camp.key', 'title.camp.name', 'title.camp.sub', 'title.pause'], md = src('content/text/title.md');
  check('every word is in content/text/title.md (a file of its own: ui.md is at its 200 rows) and the game says it, not the key', keys.every(k => md.includes('| ' + k + ' |') && J(`uiText('${k}')`) !== k), keys.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k).join());
  check('the keys shown on the choices are Enter and K', J(`uiText('title.long.key')`) === 'ENTER' && J(`uiText('title.camp.key')`) === 'K');
  check('the names are LONG HAUL and CAMPAIGN, and a line says what each is (two lines of a panel at most: 85 characters)', J(`uiText('title.long.name')`) === 'LONG HAUL' && J(`uiText('title.camp.name')`) === 'CAMPAIGN' && J(`uiText('title.long.sub')`).length <= 85 && J(`uiText('title.camp.sub')`).length <= 85, [J(`uiText('title.long.sub')`).length, J(`uiText('title.camp.sub')`).length].join());
  check('Long Haul\'s line says any other key starts it too (that still does)', /Any other key starts it too/.test(J(`uiText('title.long.sub')`)));
  check('ui.md is within its 200 rows (it was 199 on main, so these words could not go there) and the words are a file of their own that the content merge reads', (md0 => md0.split('\n').filter(l => /^\| [a-z]/.test(l)).length)(src('content/text/ui.md')) <= 200 && /^type: text/m.test(src('content/text/title.md')));
}

// ---------- B. the pause menu ----------
console.log('B. the pause menu');
{
  const rows = J('PAUSE_ROWS');
  check('the rows: resume, restart, volume, sound, settings, journal, then Title, and New game still last (the one that erases the save is at the far end)', rows.join() === 'resume,restart,volume,sound,settings,journal,title,new', rows.join());
  g.run(`
    window.__seq = []; window.__save0 = saveGame; saveGame = function () { __seq.push('save'); return __save0.apply(this, arguments); };
    window.__pause = (from) => { const f = Object.create(Pause.prototype); f.from = from || 'Space'; f.confirmNew = false; f.scene = { stop: k => __seq.push('stop ' + k), start: (k, d) => __seq.push('start ' + k), get: () => null, resume: k => __seq.push('resume ' + k) }; return f; };
  `);
  check('the row says what it is: the title screen, saved', J(`__pause().rowText('title')`) === J(`uiText('title.pause')`) && /Title screen/.test(J(`__pause().rowText('title')`)));
  g.run(`__seq.length = 0; G.mission = 'none'; __p = __pause('Space'); __p.activate(PAUSE_ROWS.indexOf('title'))`);
  check('Title: the game is saved first, then the flight scene stops, then the Title starts', J('__seq').join('|') === 'save|stop Space|start Title', J('__seq').join('|'));
  g.run(`__seq.length = 0; G.mission = 'rescued'; __p = __pause('Space'); __p.activate(PAUSE_ROWS.indexOf('title'))`);
  check('a colonist aboard stays behind, the call is still open (as Restart from station does), and that is saved', J('G.mission') === 'accepted' && J('__seq').join('|') === 'save|stop Space|start Title');
  g.run(`__seq.length = 0; G.credits = 777; __pause('Station').activate(PAUSE_ROWS.indexOf('title'))`);
  const saved = [...store.entries()].filter(([k]) => /save/.test(k)).map(([, v]) => v).join('');
  check('what is saved is the game as it stood (the credits are in the save), from the station too', /777/.test(saved) && J('__seq').join('|') === 'save|stop Station|start Title');
  g.run(`__seq.length = 0; __pause().activate(PAUSE_ROWS.indexOf('restart')); `);
  check('Restart from station still saves and goes to the station; Resume still resumes', J('__seq').join('|') === 'save|stop Space|start Station' && (g.run(`__seq.length = 0; __pause().activate(PAUSE_ROWS.indexOf('resume'))`), J('__seq').some(s => /resume Space/.test(s))));
  g.run(`__seq.length = 0; __p = __pause(); __p.activate(PAUSE_ROWS.indexOf('new'))`);
  check('New game still needs a second select before it erases anything (the new Title row did not take its place)', J('__p.confirmNew') === true && !J('__seq').some(s => /start/.test(s)));
  g.run('saveGame = __save0');
  const sc = src('src/meta.js');
  check('the panel grows with its rows (the height is 120 plus 40 a row, 484 for eight, well inside the screen)', /h: 120 \+ n \* 40 \+ 44/.test(sc) && 120 + 8 * 40 + 44 < 720);
}

// ---------- C. the title ----------
console.log('C. the title');
{
  g.run(`
    window.__calls = []; window.__go0 = go; go = (s, key, data) => { __calls.push('go ' + key + (data && data.level ? ' ' + data.level : '')); };
    window.__caps = []; window.__keyCap0 = keyCap; keyCap = (s, key, color) => { __caps.push(key); return { kw: 40, setPosition() { return this; }, setDepth() { return this; } }; };
    window.__texts = []; window.__zones = [];
    window.__scene = (born) => { const rec = () => { const p = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : (...a) => p) }); return p; };
      const f = Object.create(Title.prototype); f.leaving = false; f.born = born == null ? -1e9 : born;
      f.add = { graphics: () => rec(), text: (x, y, t) => { __texts.push(t); return rec(); }, zone: () => { const z = { h: {}, setInteractive() { return z; }, setDepth() { return z; }, on(ev, fn) { z.h[ev] = fn; return z; } }; __zones.push(z); return z; } };
      return f; };
  `);
  g.run('__calls.length = 0; __caps.length = 0; __texts.length = 0; __zones.length = 0; window.T = __scene(); T.modeChoices()');
  check('two choices are drawn, with the key caps ENTER and K and their names and lines', J('__caps').join() === 'ENTER,K' && J('__texts').includes('LONG HAUL') && J('__texts').includes('CAMPAIGN') && J('__zones.length') === 2 && J('__texts').length === 4, J('__texts').join(' | '));
  g.run('__zones[0].h.pointerdown()');
  check('a click on the Long Haul panel starts Long Haul from the station', J('__calls').join() === 'go Station');
  g.run('__calls.length = 0; __zones[1].h.pointerdown()');
  check('a click on the Campaign panel opens the Campaign, in its ready room (campaignStart: the hub, which flies the mission the save says is next)', /go Camp(Hub|aign)/.test(J('__calls').join()), J('__calls').join());
  g.run('__calls.length = 0; window.T2 = __scene(performance.now()); T2.startLongHaul()');
  check('the half second after the title appears nothing starts (as before: a key that was already down must not skip the title)', J('__calls.length') === 0);
  g.run('__calls.length = 0; window.T3 = __scene(); T3.leaving = true; T3.startLongHaul()');
  check('and nothing starts twice (once the scene is leaving)', J('__calls.length') === 0);
  // the keys of the title, through the real create()
  g.run(`
    window.__keys = null; window.__opened = []; window.__fns = {}; ['voiceOpenSetup', 'chatOpenSetup', 'modsOpenSetup', 'settingsOpen'].forEach(k => { __fns[k] = window[k]; window[k] = () => { __opened.push(k); }; });
    window.__cuiu0 = contentTitleUi; contentTitleUi = () => ({ handleKey: () => false });
    window.__created = (() => { const rec = () => { const p = new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : k === Symbol.toPrimitive ? () => 0 : p), apply: () => p, construct: () => p }); return p; };
      const f = Object.create(Title.prototype); f.add = rec(); f.tweens = rec(); f.time = rec(); f.cameras = rec(); f.scene = { start: (k, d) => __calls.push('scene.start ' + k) };
      f.input = { keyboard: { on: (ev, fn) => { if (ev === 'keydown') __keys = fn; } }, on() {} };
      try { Title.prototype.create.call(f); return f; } catch (e) { return String(e.stack || e); } })();
  `);
  check('the whole create() of the title runs with the choices in it (a typo anywhere would stop here)', typeof J('typeof __created') === 'string' && J('typeof __created') === 'object' && J('typeof __keys') === 'function', J('typeof __created === "string" ? __created : "ok"'));
  g.run('__created.born = -1e9; __calls.length = 0; __keys({ code: "KeyK", repeat: false })');
  check('K opens the Campaign, as it did: in its ready room now', /go CampHub/.test(J('__calls').join()), J('__calls').join());
  g.run('__calls.length = 0; __keys({ code: "Enter", repeat: false })');
  check('Enter starts Long Haul', J('__calls').join() === 'go Station');
  g.run('__calls.length = 0; __keys({ code: "KeyZ", repeat: false })');
  check('so does any other key, as it did ("press any key" is still true)', J('__calls').join() === 'go Station');
  g.run('__calls.length = 0; __opened.length = 0; ["KeyV", "KeyC", "KeyS", "KeyO", "KeyM"].forEach(c => __keys({ code: c, repeat: false }))');
  check('V, C, S, O open what they opened, and M (mute) starts nothing: the other keys of the title are as they were', J('__opened').join() === 'voiceOpenSetup,chatOpenSetup,settingsOpen,modsOpenSetup' && J('__calls.length') === 0, J('__opened').join());
  g.run('__calls.length = 0; __keys({ code: "KeyK", repeat: true })');
  check('a key held down (a repeat) does nothing', J('__calls.length') === 0);
  g.run('contentTitleUi = __cuiu0; Object.keys(__fns).forEach(k => { window[k] = __fns[k]; })');
  const t = src('src/title.js');
  check('the address is untouched: ?campaign=N is still read in create() and opens the Campaign once per page', /campAddrPlanPage\(\)/.test(t) && /CAMP_ADDR\.used = true/.test(t) && /via: 'address'/.test(t));
  check('the key line at the foot still ends with K Campaign, the settings chip is still made, and PRESS ANY KEY is gone (the choices say it)', /K Campaign'/.test(t) && /this\.settingsChip\(\)/.test(t) && !/PRESS ANY KEY/.test(t));
}

// ---------- D. the four paths ----------
console.log('D. title to either game and back');
{
  g.run(`__calls.length = 0; window.C1 = Object.create(Campaign.prototype); C1.mode = 'pause'; C1.leaving = false; C1.camp = campNew(1, [], { seed: 1 }); C1.onKey({ code: 'KeyT' })`);
  check('the Campaign: its pause card\'s T goes back to the title', J('__calls').join() === 'go Title', J('__calls').join());
  check('and its pause card says so (T title)', /T  title/.test(J(`uiText('camp.ui.paused')`)));
  check('Long Haul\'s save and the Campaign\'s save are apart: leaving the Campaign for the title touches no Long Haul number (credits stay)', (g.run('G.credits = 1234'), g.run(`campProgressSave({ level: 2, techs: [] })`), J('G.credits') === 1234));
  g.run('go = __go0; keyCap = __keyCap0');
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nTITLEMODES FAIL (${failed} of ${n})` : `\nTITLEMODES PASS (${n})`);
process.exitCode = failed ? 1 : 0;
