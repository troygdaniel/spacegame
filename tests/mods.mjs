// Mod packs (card space-game-m7-mod-packs, docs/MODDING.md 13): mods/<pack>/ laid over content/, each pack checked on its own, the example
// pack, and the Mods screen with its folder picker. Two parts:
//   A. no browser: the build writes each pack separately and its problems name the pack; the committed mods.generated.js is current
//   B. headless Chrome: packs are OFF until turned on; the screen turns one on and off; a pack is laid over the core in name order, a later
//      name wins; a picked folder (the same parser, no Node) is read, kept in the browser and applied after a restart; a tampered or
//      hostile pack is refused, field by field, and the game still starts
// Run: node tests/mods.mjs        (one Chrome at a time; about 60 seconds)
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { buildMods, readPacks, build } from '../tools/build-content.mjs';
import { launch, sleep } from './cdp.mjs';
import { copyGame, ROOT } from './gamecopy.mjs';
const C = createRequire(import.meta.url)('../src/content.js');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const tmp = [];
const mk = (dir, rel, text) => { const f = join(dir, rel); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, text); };

// ---------- A. the build ----------
console.log('A. the build writes each pack on its own');
{
  const core = build({ write: false }).result.entries;
  const committed = (() => { const box = {}; new Function('MODS', readFileSync(join(ROOT, 'mods.generated.js'), 'utf8').replace(/^var MODS =/m, 'MODS.v =') + ';')(box); return box.v; })();
  const ex = committed.packs.find(p => p.name === 'example');
  check('the committed mods.generated.js has the example pack', !!ex);
  const fresh = buildMods({ dir: join(ROOT, 'mods'), write: false, coreEntries: core });
  const exNow = fresh.packs.find(p => p.name === 'example');
  check('the example pack in it is what a build of mods/example makes now (run node tools/build-content.mjs)', !!exNow && JSON.stringify(exNow) === JSON.stringify(ex));
  check('the example pack has no problems, two files and a label', !!ex && ex.errors.length === 0 && ex.files === 2 && ex.title === 'Example pack' && ex.entries.map(e => e.type + ':' + e.id).join() === 'mission:rescue,npc:juno', ex && JSON.stringify(ex.errors));
  check('its files are named by their pack: mods/example/...', !!ex && ex.entries.every(e => e.path.startsWith('mods/example/')));
  check('git keeps mods/example and ignores the other folders of mods/', spawnSync('git', ['check-ignore', '-q', 'mods/example/_pack.md'], { cwd: ROOT }).status === 1 && spawnSync('git', ['check-ignore', '-q', 'mods/my-own-pack/missions/x.md'], { cwd: ROOT }).status === 0);

  const dir = mkdtempSync(join(tmpdir(), 'longhaul-mods-')); tmp.push(dir);
  mk(dir, 'a-good/_pack.md', '---\ntitle: Good pack\nauthor: me\nabout: one call\nbogus: ignored\n---\nlabel body');
  mk(dir, 'a-good/missions/escort.md', '---\ntype: mission\nkind: escort\ntitle: Escort\nreward: 700\n---\nShe pays {reward} cr.\n');
  mk(dir, 'b-bad/missions/rescue.md', '---\ntype: mission\nkind: rescue\ntitle: Rescue\nrewrd: 600\n---\n'); // a typo: reward is missing, so the file is skipped
  mk(dir, 'b-bad/npcs/moss.md', '---\ntype: npc\nname: MOSS\ncolour: cyan\n---\n## Lines\n- Hello.\n'); // an unknown field: ignored, the file is kept
  mk(dir, 'b-bad/npcs/dex.md', '---\ntype: npc\nname: DEX\nstation: no-such-station\n---\n## Lines\n- Hi.\n'); // a reference to nothing: a warning
  mk(dir, 'b-bad/npcs/ida.md', '---\ntype: npc\nname: IDA\nstation: halcyon-station\n---\n## Lines\n- Hi.\n'); // a reference to something the game defines: fine
  mk(dir, 'Bad Name/missions/escort.md', '---\ntype: mission\nkind: escort\ntitle: Escort\nreward: 1\n---\n'); // not a pack name
  mk(dir, '_scratch/missions/escort.md', '---\ntype: mission\nkind: escort\ntitle: Escort\nreward: 1\n---\n'); // starts with _: not a pack
  mk(dir, '.hidden/missions/escort.md', 'x');
  mk(dir, 'README.md', 'a file in mods/ is not a pack');
  const b = buildMods({ dir, out: join(dir, 'mods.generated.js'), write: true, coreEntries: core });
  check('only the folders with a pack name are packs: a-good and b-bad', b.packs.map(p => p.name).join() === 'a-good,b-bad', b.packs.map(p => p.name).join());
  check('a folder with a bad name is one problem that names it, not a pack', b.errors.length === 1 && b.errors[0].path === 'mods/Bad Name' && /not a pack name/.test(b.errors[0].message), JSON.stringify(b.errors));
  const good = b.packs[0], bad = b.packs[1];
  check('the good pack has no problems and its label is read (title, author, about; the unknown key is ignored)', good.errors.length === 0 && good.title === 'Good pack' && good.author === 'me' && good.about === 'one call' && good.files === 1, JSON.stringify(good.errors));
  const msgs = bad.errors.map(e => C.formatError(e));
  check('every problem of the bad pack names the pack and the file', bad.errors.length >= 3 && bad.errors.every(e => e.path.startsWith('mods/b-bad/')), msgs.join(' | '));
  check('the typo is named with a hint and the file skipped', msgs.some(m => /mods\/b-bad\/missions\/rescue\.md, line 5: unknown field "rewrd"\. Did you mean "reward"/.test(m)) && msgs.some(m => /mods\/b-bad\/missions\/rescue\.md: reward is required but missing\. Skipped the file/.test(m)), msgs.join(' | '));
  check('an unknown field is ignored and a reference to nothing is a warning', msgs.some(m => /moss\.md, line 4: unknown field "colour"\. Did you mean "color"/.test(m)) && msgs.some(m => /^\(warning\) mods\/b-bad\/npcs\/dex\.md.*no-such-station/.test(m)), msgs.join(' | '));
  check('a reference to a station the game defines is not a problem', !msgs.some(m => /ida\.md/.test(m)), msgs.join(' | '));
  check('the bad pack does not touch the good one: the good pack is the same without it', JSON.stringify(buildMods({ dir: (() => { const d = mkdtempSync(join(tmpdir(), 'longhaul-mods-')); tmp.push(d); mk(d, 'a-good/_pack.md', readFileSync(join(dir, 'a-good/_pack.md'), 'utf8')); mk(d, 'a-good/missions/escort.md', readFileSync(join(dir, 'a-good/missions/escort.md'), 'utf8')); return d; })(), write: false, coreEntries: core }).packs[0]) === JSON.stringify(good));
  check('the same input gives the same text, and the file is written', buildMods({ dir, out: join(dir, 'mods.generated.js'), write: false, coreEntries: core }).text === b.text && existsSync(join(dir, 'mods.generated.js')) && !buildMods({ dir, out: join(dir, 'mods.generated.js'), write: true, coreEntries: core }).changed);
  const lim = mkdtempSync(join(tmpdir(), 'longhaul-mods-')); tmp.push(lim);
  for (let i = 0; i < C.LIMITS.packs + 2; i++) mk(lim, 'p' + String(i).padStart(2, '0') + '/missions/escort.md', '---\ntype: mission\nkind: escort\ntitle: Escort\nreward: 1\n---\n');
  const many = readPacks(lim);
  check('at most ' + C.LIMITS.packs + ' packs; the rest are one problem each, by name', many.packs.length === C.LIMITS.packs && many.errors.length === 2 && /more than 12 packs/.test(many.errors[0].message), many.packs.length + ' ' + JSON.stringify(many.errors));
  check('a pack name is lower-case letters, digits and dashes, starting with a letter', C.packName('example') && C.packName('my-pack-2') && !C.packName('My') && !C.packName('2pack') && !C.packName('a_b') && !C.packName('__proto__') && !C.packName('a'.repeat(41)) && !C.packName(null));

  // the CLI: --check passes now, and a build into another place (what the content tests do) leaves mods.generated.js alone
  const cli = a => spawnSync(process.execPath, [join(ROOT, 'tools/build-content.mjs'), ...a], { cwd: ROOT, encoding: 'utf8' });
  const r1 = cli(['--check']);
  check('node tools/build-content.mjs --check passes: both generated files are current', r1.status === 0 && /pack example: 2 files, 2 entries, 0 problems/.test(r1.stdout) && /mods\.generated\.js is up to date/.test(r1.stdout), r1.stdout + r1.stderr);
  const before = readFileSync(join(ROOT, 'mods.generated.js'), 'utf8'), o = mkdtempSync(join(tmpdir(), 'longhaul-mods-')); tmp.push(o);
  const r2 = cli(['--dir', 'content', '--out', join(o, 'c.js')]);
  check('a build with --out leaves the packs alone', r2.status === 0 && !/mods:/.test(r2.stdout) && readFileSync(join(ROOT, 'mods.generated.js'), 'utf8') === before, r2.stdout + r2.stderr);
  const r3 = cli(['--dir', 'content', '--out', join(o, 'c.js'), '--mods', dir, '--mods-out', join(o, 'm.js'), '--strict']);
  check('with --mods it builds those packs into --mods-out, and --strict fails on a problem in a pack', /pack b-bad:/.test(r3.stdout) && existsSync(join(o, 'm.js')) && r3.status === 1, r3.stdout + r3.stderr);
}

// ---------- B. the game ----------
const KEYCODE = { KeyO: 79, KeyF: 70, KeyR: 82, Digit1: 49, Digit2: 50, Digit3: 51, Escape: 27, KeyP: 80 };
const keyEv = (t, code) => (async () => { for (const type of ['keyDown', 'keyUp']) { await t.send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: KEYCODE[code], nativeVirtualKeyCode: KEYCODE[code], code, key: code.replace(/^Key|^Digit/, '').toLowerCase() }); await sleep(type === 'keyDown' ? 120 : 200); } })();
const title = (t, why = 'Title') => t.waitFor("!!(window.game && game.scene.isActive('Title') && CONTENT_STATE)", 25000, why).then(() => sleep(700));
const reload = async (t, root) => { await t.send('Page.navigate', { url: 'file://' + root + '/index.html' }); await sleep(300); await title(t); };
const world = t => t.ev(`JSON.stringify({ rescue: MISSIONS.find(m => m.id === 'rescue').reward, escort: MISSIONS.find(m => m.id === 'escort').reward, juno: NPCS.find(n => n.id === 'juno').lines[0].slice(0, 30), modded: CONTENT_STATE.modded, packs: (CONTENT_STATE.packs || []).map(p => p.name + (p.on ? '+' : '-') + p.applied), errors: CONTENT_ERRORS.map(e => e.path + ' | ' + e.message) })`).then(JSON.parse);
const setLS = (t, k, v) => t.ev(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))})`);
// ev() hands back plain values only: a promise (the picker is async) is awaited here
const evp = async (t, expr) => { const r = await t.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval failed: ' + expr + ' -> ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result.value; };
const getLS = (t, k) => t.ev(`localStorage.getItem(${JSON.stringify(k)})`);

console.log('B1. the real game: off by default, the screen, the picker');
{
  const t = await launch('', ROOT);
  try {
    await title(t);
    let w = await world(t);
    check('the example pack is listed and OFF: the game is the shipped game (Rescue 500, JUNO as shipped, not modded, no problems)', w.packs.join() === 'example-0' && w.rescue === 500 && !/^This line comes from/.test(w.juno) && !w.modded && w.errors.length === 0, JSON.stringify(w));
    check('no Mods screen yet, no packs on', !(await t.ev("game.scene.isActive('ModsSetup')")) && (await getLS(t, 'longhaul.mods.on')) === null);

    // the screen: O opens it, 1 turns the first pack on, the screen says a restart is needed and the setting is kept
    await keyEv(t, 'KeyO'); await sleep(500);
    check('O on the Title screen opens the Mods screen', await t.ev("game.scene.isActive('ModsSetup')"));
    check('it lists the example pack, off, and the restart button is dim', await t.ev("(() => { const s = game.scene.getScene('ModsSetup'); return s.shown.length === 1 && s.shown[0].name === 'example' && s.restartBtn.bg.alpha < 0.5; })()"));
    check('the real folder picker is in the page: an input with webkitdirectory', await t.ev("(() => { const i = document.querySelector('input[data-mods-picker]'); return !!i && i.type === 'file' && i.hasAttribute('webkitdirectory'); })()"));
    await keyEv(t, 'Digit1'); await sleep(300);
    check('1 turns the pack on: it is kept, the screen asks for a restart', (await getLS(t, 'longhaul.mods.on')) === '["example"]' && await t.ev("(() => { const s = game.scene.getScene('ModsSetup'); return /Restart/.test(s.status.text) && s.restartBtn.bg.alpha === 1; })()"));
    check('the running game has not changed (a pack is applied when the game starts)', (await world(t)).rescue === 500);
    await t.shot('mods-screen');
    await keyEv(t, 'Escape'); await sleep(500);
    check('Esc closes the screen and the Title is back', !(await t.ev("game.scene.isActive('ModsSetup')")) && await t.ev("game.scene.isActive('Title')"));
    check('the screen took its picker out of the page', await t.ev("!document.querySelector('input[data-mods-picker]')"));

    await reload(t, ROOT);
    w = await world(t);
    check('after a restart the pack is laid over the core: Rescue pays 650 and JUNO says the pack\'s line', w.packs.join() === 'example+2' && w.rescue === 650 && /^This line comes from/.test(w.juno), JSON.stringify(w));
    check('the Title says MODDED, with no problems', w.modded && w.errors.length === 0 && await t.ev('!!contentTitleUi && !!game.scene.getScene("Title").contentUi.tag'));
    await keyEv(t, 'KeyP'); await sleep(500);
    check('the Content section of Settings says which packs are on', await t.ev("(() => { if (!game.scene.isActive('Settings')) return false; const pt = []; const walk = o => { if (o.type === 'Text') pt.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('Settings').children.list.forEach(walk); return pt.some(x => /packs on: example/.test(x)); })()")); // P opens Settings at Content (src/settings.js); Esc closes it
    await keyEv(t, 'Escape'); await sleep(400);

    // turn it off again in the screen and restart: back to the shipped game
    await keyEv(t, 'KeyO'); await sleep(500); await keyEv(t, 'Digit1'); await sleep(300); await keyEv(t, 'Escape'); await sleep(400);
    await reload(t, ROOT);
    w = await world(t);
    check('turned off and restarted: the shipped game again', w.rescue === 500 && !w.modded && w.packs.join() === 'example-0', JSON.stringify(w));

    // a picked folder: File objects as an <input webkitdirectory> hands them over (webkitRelativePath says where each lies)
    const makeFiles = `(() => {
      const f = (rel, text, size) => { const x = new File([text], rel.split('/').pop()); Object.defineProperty(x, 'webkitRelativePath', { value: rel }); if (size) Object.defineProperty(x, 'size', { value: size }); return x; };
      window.__files = [
        f('My Pack/_pack.md', '---\\ntitle: Picked pack\\nabout: made in the browser\\n---\\n'),
        f('My Pack/missions/escort.md', '---\\ntype: mission\\nkind: escort\\ntitle: Escort\\nreward: 999\\n---\\nShe pays {reward} cr.\\n'),
        f('My Pack/npcs/moss.md', '---\\ntype: npc\\nname: MOSS\\ncolour: cyan\\n---\\n## Lines\\n- A line from a picked pack.\\n'),
        f('My Pack/missions/big.md', 'x', 40000),
        f('My Pack/_notes.md', 'not content'), f('My Pack/.hidden/x.md', 'x'), f('My Pack/readme.txt', 'x')
      ];
      return 1; })()`;
    await t.ev(makeFiles);
    const r = JSON.parse(await evp(t, "modsPickFiles(window.__files).then(r => JSON.stringify(r))"));
    check('picking reads the folder: the name is made from the folder\'s ("My Pack" is my-pack), 2 files read, 2 problems, turned on', r.ok && r.name === 'my-pack' && /2 files, 2 problems/.test(r.message) && (await getLS(t, 'longhaul.mods.on')) === '["my-pack"]', JSON.stringify(r));
    const kept = JSON.parse(await getLS(t, 'longhaul.mods.picked'));
    check('the pack is kept in this browser: entries, label and its problems named by pack', kept.length === 1 && kept[0].name === 'my-pack' && kept[0].title === 'Picked pack' && kept[0].entries.length === 2 && kept[0].errors.some(e => e.path === 'mods/my-pack/missions/big.md' && /40 KB but the limit is 32 KB/.test(e.message)) && kept[0].errors.some(e => e.path === 'mods/my-pack/npcs/moss.md' && /unknown field "colour"/.test(e.message)), JSON.stringify(kept[0] && kept[0].errors));
    check('files that are not content never reach the pack (_notes.md, .hidden/, readme.txt)', kept[0].entries.every(e => /^mods\/my-pack\/(missions\/escort|npcs\/moss)\.md$/.test(e.path)));
    await reload(t, ROOT);
    w = await world(t);
    check('after a restart the picked pack is applied: Escort pays 999 and the problems of the pack are listed, each naming it', w.escort === 999 && w.modded && w.packs.join() === 'example-0,my-pack+2' && w.errors.length === 2 && w.errors.every(e => e.startsWith('mods/my-pack/')), JSON.stringify(w));
    await keyEv(t, 'KeyO'); await sleep(500);
    check('the screen lists both packs, the picked one on and marked as picked here', await t.ev("(() => { const s = game.scene.getScene('ModsSetup'); return s.shown.map(p => p.name + ':' + p.source).join() === 'example:built,my-pack:picked' && s.rowObjs.some(o => o.text && /picked here/.test(o.text)); })()"));
    await t.shot('mods-screen-picked');
    // the real <input> element: a change event with files hands them to the same reader
    await t.ev(makeFiles);
    await t.ev(`(() => { const dt = new DataTransfer(); window.__files.slice(0, 2).forEach(x => dt.items.add(x)); const i = document.querySelector('input[data-mods-picker]'); i.files = dt.files; i.dispatchEvent(new Event('change')); return 1; })()`);
    await sleep(600);
    check('a change event on the input reads the folder too (the screen says what it found)', await t.ev("/^Picked \"my-pack\": 1 file, no problems\. It is on: restart to apply\.$/.test(game.scene.getScene('ModsSetup').status.text)"), await t.ev("game.scene.getScene('ModsSetup').status.text"));
    // remove it
    await t.ev("(() => { const s = game.scene.getScene('ModsSetup'); modsRemovePicked('my-pack'); s.refresh(); return 1; })()");
    check('remove forgets the pack and turns it off', (await getLS(t, 'longhaul.mods.picked')) === '[]' && (await getLS(t, 'longhaul.mods.on')) === '[]');
    await keyEv(t, 'Escape'); await sleep(300);
    await reload(t, ROOT);
    w = await world(t);
    check('after a restart: the shipped game again', w.escort === 400 && !w.modded && w.errors.length === 0, JSON.stringify(w));

    // things a picker must refuse, with a message and nothing kept
    const refuse = async (label, expr, re) => { const x = JSON.parse(await evp(t, `${expr}.then(r => JSON.stringify(r))`)); check(label, !x.ok && re.test(x.message) && (await getLS(t, 'longhaul.mods.picked')) === '[]', JSON.stringify(x)); };
    await refuse('an empty pick is refused', 'modsPickFiles([])', /no files/);
    await refuse('a folder with no .md files is refused', `modsPickFiles([Object.assign(new File(['x'], 'a.txt'), {})])`, /cannot be a pack name|no .md files/);
    await t.ev(`window.__f2 = (rel, text) => { const x = new File([text], rel.split('/').pop()); Object.defineProperty(x, 'webkitRelativePath', { value: rel }); return x; }`);
    await refuse('a folder name that cannot be a pack name is refused, with the rule', `modsPickFiles([__f2('123/missions/a.md', 'x')])`, /cannot be a pack name.*lower-case letters/);
    await refuse('a folder with only non-content files is refused', `modsPickFiles([__f2('okay/readme.txt', 'x'), __f2('okay/_x.md', 'x')])`, /no .md files/);
    check('no JS errors so far', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

console.log('B2. layers: later names win, a bad pack names itself, packs that are off cost nothing');
{
  const dir = mkdtempSync(join(tmpdir(), 'longhaul-modsB-')); tmp.push(dir);
  mk(dir, 'aaa-first/missions/escort.md', '---\ntype: mission\nkind: escort\ntitle: Escort\nreward: 700\n---\n');
  mk(dir, 'bbb-bad/missions/rescue.md', '---\ntype: mission\nkind: rescue\ntitle: Rescue\nrewrd: 600\n---\n');
  mk(dir, 'bbb-bad/npcs/juno.md', '---\ntype: npc\nname: JUNO\n---\n## Lines\n- A line from the bad pack, which is still read.\n');
  mk(dir, 'ccc-later/missions/escort.md', '---\ntype: mission\nkind: escort\ntitle: Escort\nreward: 900\n---\n');
  mk(dir, 'ddd-off/missions/rescue.md', '---\ntype: mission\nkind: rescue\ntitle: Rescue\nreward: 5\n---\n');
  const core = build({ write: false }).result.entries, built = buildMods({ dir, write: false, coreEntries: core });
  const game = copyGame('mods'); tmp.push(game);
  writeFileSync(join(game, 'mods.generated.js'), built.text);
  writeFileSync(join(game, 'content.generated.js'), readFileSync(join(ROOT, 'content.generated.js'), 'utf8'));
  const t = await launch('', game);
  try {
    await title(t);
    let w = await world(t);
    check('four packs, all off: the shipped game, no problem listed (the problems of a pack that is off are only counted on the screen)', w.packs.join() === 'aaa-first-0,bbb-bad-0,ccc-later-0,ddd-off-0' && w.escort === 400 && w.rescue === 500 && !w.modded && w.errors.length === 0, JSON.stringify(w));
    await setLS(t, 'longhaul.mods.on', ['ccc-later', 'aaa-first', 'bbb-bad']); // the order of this list does not matter: the pack names do
    await reload(t, game);
    w = await world(t);
    check('later names win: aaa says Escort 700, ccc-later says 900, so 900', w.escort === 900 && w.packs.join() === 'aaa-first+1,bbb-bad+1,ccc-later+1,ddd-off-0', JSON.stringify(w));
    check('a pack that is off changes nothing (ddd-off says Rescue 5; the bad pack\'s Rescue file was skipped, so 500)', w.rescue === 500);
    check('the bad pack is still read: its good file (JUNO) is applied', /A line from the bad pack/.test(w.juno));
    check('its problems are listed, each naming the pack, and only its problems', w.errors.length >= 2 && w.errors.every(e => e.startsWith('mods/bbb-bad/')) && w.errors.some(e => /unknown field "rewrd"/.test(e)) && w.errors.some(e => /reward is required but missing/.test(e)), JSON.stringify(w.errors));
    const chip = await t.ev(`(() => { const ui = game.scene.getScene('Title').contentUi; return !!ui.chip && !!ui.tag; })()`);
    check('the Title shows both the problems chip and the MODDED tag', chip);
    await keyEv(t, 'KeyO'); await sleep(500);
    check('the screen shows the bad pack with its problem count', await t.ev("(() => { const s = game.scene.getScene('ModsSetup'); return s.rowObjs.some(o => o.text && /2 problems/.test(o.text)) && s.rowObjs.some(o => o.text && /4 packs|ddd-off/.test(o.text)); })()"));
    await t.shot('mods-screen-layers');
    await keyEv(t, 'Escape'); await sleep(300);
    // drop the later pack: the earlier one shows through
    await setLS(t, 'longhaul.mods.on', ['aaa-first']);
    await reload(t, game);
    w = await world(t);
    check('only aaa-first on: Escort 700, no problems', w.escort === 700 && w.errors.length === 0 && w.packs.join() === 'aaa-first+1,bbb-bad-0,ccc-later-0,ddd-off-0', JSON.stringify(w));
    check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

console.log('B3. a tampered or hostile pack in the browser\'s storage is refused, and the game starts');
{
  const t = await launch('', ROOT);
  try {
    await title(t);
    // the on list is junk and the picked list holds a pack whose entries are wrong in every way a hand edit can be
    await setLS(t, 'longhaul.mods.on', ['__proto__', 'constructor', 5, null, 'evil', 'Not A Name', 'x'.repeat(60)]);
    await setLS(t, 'longhaul.mods.picked', [
      { name: 'evil', title: 'T'.repeat(500), files: 'many', hash: 12, errors: 'nope', entries: [
        { type: 'mission', id: 'rescue', path: 'mods/evil/missions/rescue.md', data: { kind: 'rescue', title: 'Rescue', reward: 'free' } },
        { type: 'mission', id: 'escort', path: 'mods/evil/missions/escort.md', data: { kind: 'escort', title: 'Escort', reward: 9e99 } },
        { type: 'npc', id: '__proto__', path: 'mods/evil/npcs/p.md', data: { name: 'x', lines: ['y'] } },
        { type: 'npc', id: 'juno', path: 'mods/evil/npcs/juno.md', data: { name: 'JUNO', lines: ['<script>alert(1)</script>'.repeat(40)] } },
        { type: 'ship', id: 'raider', path: 'mods/evil/ships/raider.md', data: { name: 'Raider', hp: -5 } },
        { type: 'nonsense', id: 'a', data: {} }, 7, null, 'text', { type: 'mission' }
      ] },
      { name: '__proto__', entries: [] }, 'not a pack', { name: 'Bad Name', entries: [] }, { name: 'noentries' }
    ]);
    await reload(t, ROOT);
    const w = await world(t);
    check('the game started on the Title screen', true);
    check('the junk in the on list is dropped and the one valid name (evil) is on; the other bad entries of the picked list are dropped (with the example pack, off, that makes two)', w.packs.join() === 'evil+2,example-0', w.packs.join());
    check('nothing wrong was taken: Rescue 500, Escort 400, the Raider\'s hp is not negative', w.rescue === 500 && w.escort === 400 && await t.ev('PIRATES.raider.hp > 0'), JSON.stringify(w));
    check('what was refused is listed, each naming the pack', w.errors.length >= 4 && w.errors.every(e => /^mods\/evil/.test(e)), JSON.stringify(w.errors));
    check('JUNO\'s line, hostile text and all, is only ever drawn as text (it is a line of her list, not HTML)', await t.ev("NPCS.find(n => n.id === 'juno').lines.every(l => typeof l === 'string' && l.length <= 240)"));
    check('Object.prototype was not touched', await t.ev("({}).name === undefined && ({}).lines === undefined && Object.keys(Object.prototype).length === 0"));
    check('the screen still opens, and shows only well-formed packs', await (async () => { await keyEv(t, 'KeyO'); await sleep(500); const ok = await t.ev("(() => { const s = game.scene.getScene('ModsSetup'); return !!s && s.shown.map(p => p.name).join() === 'evil,example'; })()"); return ok; })());
    check('a 40-character title is the limit of what a stored title can show', await t.ev("modsAvailable().every(p => p.title.length <= 40 && p.about.length <= 200)"));
    // storage that is not JSON at all
    await setLS(t, 'longhaul.mods.on', '{{{not json'); await setLS(t, 'longhaul.mods.picked', '[[[');
    await reload(t, ROOT);
    const w2 = await world(t);
    check('storage that is not JSON: the shipped game, the example pack off', w2.rescue === 500 && !w2.modded && w2.packs.join() === 'example-0' && w2.errors.length === 0, JSON.stringify(w2));
    check('no JS errors or uncaught exceptions', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

console.log('B4. a pack can add new things, as content/ can: shared limits, a later pack changes a row an earlier one added, a bad new file adds nothing');
{
  const dir = mkdtempSync(join(tmpdir(), 'longhaul-modsB4-')); tmp.push(dir);
  mk(dir, 'aaa-add/missions/convoy.md', '---\ntype: mission\nkind: patrol\ntitle: Convoy patrol\nreward: 800\ncount: 3\n---\n');
  mk(dir, 'aaa-add/npcs/ada.md', '---\ntype: npc\nname: ADA\ncolor: green\n---\n## Lines\n- A line from a pack.\n');
  mk(dir, 'aaa-add/ships/mule.md', '---\ntype: ship\nname: Mule\nart: ox\ncargo: 30\nprice: 7000\n---\n');
  mk(dir, 'aaa-add/voice/quips.md', '---\ntype: voice\nevent: hull-low\n---\n## Lines\n- Hull is low, from a pack.\n');
  mk(dir, 'bbb-later/missions/convoy.md', '---\ntype: mission\nkind: patrol\ntitle: Convoy patrol\nreward: 900\n---\n');
  for (const i of [1, 2, 3, 4]) mk(dir, `ccc-many/missions/extra-${i}.md`, `---\ntype: mission\nkind: rescue\ntitle: Extra ${i}\nreward: ${100 + i}\n---\n`);
  mk(dir, 'ddd-bad/npcs/nolines.md', '---\ntype: npc\nname: NOBODY\n---\n');
  mk(dir, 'ddd-bad/parts/engine-4.md', '---\ntype: part\nslot: engine\ntier: 4\nname: Fourth\n---\n');
  const core = build({ write: false }).result.entries, built = buildMods({ dir, write: false, coreEntries: core });
  const game = copyGame('modsadd'); tmp.push(game);
  writeFileSync(join(game, 'mods.generated.js'), built.text);
  writeFileSync(join(game, 'content.generated.js'), readFileSync(join(ROOT, 'content.generated.js'), 'utf8'));
  const added = t => t.ev(`JSON.stringify({ calls: MISSIONS.filter(m => m.added).map(m => m.id + ':' + m.reward), convoy: (MISSIONS.find(m => m.id === 'convoy') || {}).reward, ada: !!NPCS.find(n => n.id === 'ada'), nobody: NPCS.some(n => /nobody/i.test(n.name || n.id)), mule: SHIP_MODELS.mule ? SHIP_MODELS.mule.price + ':' + SHIP_MODELS.mule.art : '', quips: VOICE_ADDED.has('quips'), errors: CONTENT_ERRORS.map(e => e.path + ' | ' + e.message) })`).then(JSON.parse);
  const t = await launch('', game);
  try {
    await title(t);
    let a = await added(t);
    check('all off: nothing was added, the shipped board', a.calls.length === 0 && !a.ada && !a.mule && !a.quips && a.errors.length === 0, JSON.stringify(a));
    await setLS(t, 'longhaul.mods.on', ['aaa-add']);
    await reload(t, game);
    a = await added(t);
    check('one pack on: its call, character, ship and voice file are in the game', a.convoy === 800 && a.ada && a.mule === '7000:ox' && a.quips && a.errors.length === 0, JSON.stringify(a));
    check('the new ship is for sale at Halcyon and the new call is on the board', await t.ev("(fleetStation('halcyon-station').body.dock.yard || []).includes('mule') && MISSIONS.some(m => m.id === 'convoy' && m.added)"), 'yard/board');
    await setLS(t, 'longhaul.mods.on', ['aaa-add', 'bbb-later']);
    await reload(t, game);
    a = await added(t);
    check('a later pack that names the same id changes the row the first one added (reward 900), and adds no second call', a.convoy === 900 && a.calls.filter(c => /^convoy:/.test(c)).length === 1, JSON.stringify(a));
    await setLS(t, 'longhaul.mods.on', ['aaa-add', 'ccc-many']);
    await reload(t, game);
    a = await added(t);
    check('the limit of four calls is shared by every pack: convoy and three extras are in, the fourth extra is refused', a.calls.length === 4 && a.errors.length === 1 && /^mods\/ccc-many\/missions\/extra-4\.md/.test(a.errors[0]) && /at most 4 calls/.test(a.errors[0]) && /Skipped the file/.test(a.errors[0]), JSON.stringify(a));
    await setLS(t, 'longhaul.mods.on', ['ddd-bad']);
    await reload(t, game);
    a = await added(t);
    check('a bad new file adds nothing and a part nobody can add (a fourth tier) is refused, both naming the pack', !a.nobody && a.errors.length >= 2 && a.errors.every(e => /^mods\/ddd-bad\//.test(e)) && a.errors.some(e => /npcs\/nolines\.md/.test(e) && /Skipped the file/.test(e)) && a.errors.some(e => /parts\/engine-4\.md/.test(e) && /Skipped the file/.test(e)), JSON.stringify(a.errors));
    // a picked folder adds too
    await setLS(t, 'longhaul.mods.on', []);
    await t.ev(`(() => { const f = (rel, text) => { const x = new File([text], rel.split('/').pop()); Object.defineProperty(x, 'webkitRelativePath', { value: rel }); return x; };
      window.__files = [f('mine/npcs/ada.md', '---\\ntype: npc\\nname: ADA\\n---\\n## Lines\\n- A picked line.\\n')]; return 1; })()`);
    const r = JSON.parse(await evp(t, 'modsPickFiles(window.__files).then(r => JSON.stringify(r))'));
    await reload(t, game);
    a = await added(t);
    check('a picked folder with a new character adds it after a restart', r.ok && a.ada && a.errors.length === 0, JSON.stringify([r, a]));
    check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

tmp.forEach(d => rmSync(d, { recursive: true, force: true }));
console.log(failed ? `\nMODS FAIL (${failed} of ${n})` : `\nMODS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
