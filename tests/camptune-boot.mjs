// not in the smoke: a boot of the tuning panel, run by hand (one Chrome, muted, through the test lock; card space-game-tuning-panel)
// The rules are tests/camptune.mjs (plain Node). This boots the real game twice. In the Campaign (level 1, mission 1): N opens the panel and the battle waits (the battle's clock does not move), Down and Left and Right change
// the cruiser's top speed and the turret damage with real key events (Shift: ten steps), a number that differs from its default shows amber with its default beside it, Backspace puts one back, Enter flips the pilot calls
// switch, Enter on Reset everything puts all back, Esc closes and the battle goes on; the TUNED mark with its count is on the screen while any override is on and gone when none is; this Chrome is driven (navigator.webdriver),
// so nothing is read from or written to localStorage; no text runs over the next column. Then in the ready room (K from the title, with a game in progress): N opens the same panel at the top of the room and Esc closes it.
//   node tests/camptune-boot.mjs
// Pictures go to the folder in TUNE_SHOTS (default ~/dev/spacegame-night/shots/tune-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.TUNE_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyN: 78, KeyK: 75, Enter: 13, Escape: 27, Backspace: 8, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };

async function key(t, code, extra = {}, wait = 40) { // a real key: down, a few frames, up (the game clock is stepped, so waits are game milliseconds)
  const k = Object.assign({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: /^(Enter|Backspace|Arrow|Escape)/.test(code) ? code : code.replace(/^Key/, '').toLowerCase() }, extra);
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait);
}
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'tune-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture tune-' + name); };

async function flight() {
  console.log('the Campaign');
  const t = await launch('?campaign=1', ROOT);
  try {
    const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
    for (let i = 0; i < 8 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key(t, 'Enter', {}, 40); await t.run(300); }
    check('the battle is on, nothing overridden, no TUNED mark', (await j(`${SC}.mode`)) === 'play' && (await j('campTuneCount()')) === 0 && !(await j(`!!(${SC}.tuneMark && ${SC}.tuneMark.text)`)));
    check('this Chrome is driven (navigator.webdriver is true): the panel will neither read nor keep overrides', (await j('navigator.webdriver')) === true);
    await t.run(600);
    const t0 = await j(`${SC}.camp.t`);
    await key(t, 'KeyN'); await t.run(300);
    check('N opens the panel: the scene is in its pause mode and the TUNING heading is on the screen', (await j(`campTuneIsOpen(${SC})`)) === true && (await j(`${SC}.mode`)) === 'pause' && (await j(`${SC}.tp.objs.some(o => o.text === 'TUNING')`)));
    await t.run(800);
    check('the battle waits while it is open: its clock has not moved', (await j(`${SC}.camp.t`)) === t0, `${t0} -> ${await j(`${SC}.camp.t`)}`);
    await snap(t, '1-open');
    const rows = () => j(`${SC}.tp.lines.filter(l => l.name.text).map(l => [l.name.text, l.val.text, l.def.text, l.when.text, l.val.style.color])`);
    await key(t, 'ArrowDown'); await key(t, 'ArrowDown'); // past the two top rows and the heading: the cruiser's top speed
    await key(t, 'ArrowRight'); await key(t, 'ArrowRight', { modifiers: 8 }); // one step and ten (Shift)
    check('Right and Shift+Right change the cruiser\'s top speed: 210 + 10 + 100 = 320 px/s, in the live table too', (await j('CAMP.carrier.speed')) === 320 && (await j('campTuneValue("cruiserspeed")')) === 320);
    const r1 = await rows(), sp = r1.find(r => r[0] === 'Cruiser top speed');
    check('its row reads 320 px/s in amber with "default 210 px/s" beside it, and says it is felt next mission', !!sp && sp[1] === '320 px/s' && sp[2] === 'default 210 px/s' && sp[3] === 'next mission' && /ffb454/i.test(sp[4]), JSON.stringify(sp));
    await key(t, 'ArrowDown'); await key(t, 'ArrowDown'); await key(t, 'ArrowRight'); await key(t, 'ArrowRight');
    check('the turret damage goes from 4 to 6 (felt at once) and the count of changes is two', (await j('CAMP.carrier.pd')) === 6 && (await j('campTuneCount()')) === 2 && (await rows()).some(r => r[0] === 'Turret damage a shot' && r[1] === '6' && r[3] === 'at once'));
    await snap(t, '2-changed');
    check('every line fits: no name runs into its value, no default into its tag, nothing leaves the panel', await j(`(() => { const L = CAMPTUNE_LOOK, P = L.panel, T = ${SC}.tp; return T.lines.every(l => !l.name.text || (l.name.x + l.name.width < l.val.x - l.val.width - 14 && (!l.def.text || l.def.x + l.def.width < l.when.x - l.when.width - 8) && l.when.x <= P.x + P.w - 10)); })()`));
    await key(t, 'Backspace');
    check('Backspace puts the highlighted row (the turret damage) back to its default', (await j('CAMP.carrier.pd')) === 4 && (await j('campTuneCount()')) === 1);
    for (let i = 0; i < 30 && (await j(`campTuneItems()[${SC}.tp.model.cur].kind === 'row' ? campTuneItems()[${SC}.tp.model.cur].row.id : ''`)) !== 'calls'; i++) await key(t, 'ArrowDown');
    await key(t, 'Enter');
    check('Enter on the pilot calls switch turns it OFF (the live flag too)', (await j('CAMP.flags.calls')) === false && (await rows()).some(r => r[0] === 'Pilots call for orders' && r[1] === 'OFF' && r[2] === 'default ON'));
    await snap(t, '3-switch');
    await key(t, 'Escape'); await t.run(900);
    check('Esc closes the panel and the battle goes on: mode play, its clock moves again', (await j(`campTuneIsOpen(${SC})`)) === false && (await j(`${SC}.mode`)) === 'play' && (await j(`${SC}.camp.t`)) > t0);
    check('the TUNED mark is on the screen with the count: TUNED 2', (await j(`${SC}.tuneMark && ${SC}.tuneMark.text`)) === 'TUNED 2');
    check('the run is a tuned one (the scene saw an override in a frame of battle): its score will not be kept', (await j(`${SC}.tuned`)) === true);
    await snap(t, '4-tuned-mark');
    check('nothing was written to localStorage by this driven Chrome', (await j(`localStorage.getItem(CAMP_TUNE.store)`)) === null);
    await key(t, 'KeyN'); await t.run(200);
    for (let i = 0; i < 40 && (await j(`campTuneItems()[${SC}.tp.model.cur].kind`)) !== 'reset'; i++) await key(t, 'ArrowDown');
    await key(t, 'Enter'); await t.run(200);
    check('Reset everything puts every row back: no override, the table is the shipped one, the TUNED mark goes', (await j('campTuneCount()')) === 0 && (await j('CAMP.carrier.speed')) === 210 && (await j('CAMP.flags.calls')) === true);
    await key(t, 'Escape'); await t.run(300);
    check('the mark is gone with the overrides', !(await j(`!!(${SC}.tuneMark && ${SC}.tuneMark.text)`)));
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
  finally { await t.close(); }
}

async function room() {
  console.log('the ready room');
  const t = await launch('', ROOT);
  try {
    const HUB = `game.scene.getScene('CampHub')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
    await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 1, techs: [], ore: 40, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 900, bonuses: [], t: 100, hull: 500, lost: 0, tries: 1 } } }))`);
    await key(t, 'KeyK');
    for (let i = 0; i < 40 && !(await j(`game.scene.isActive('CampHub') && !!${HUB}.player`)); i++) { await sleep(60); await t.run(100); }
    check('K opens the ready room', await j(`game.scene.isActive('CampHub')`));
    await t.run(900);
    await key(t, 'KeyN'); await t.run(300);
    check('N opens the tuning panel in the ready room', (await j(`campTuneIsOpen(${HUB})`)) === true && (await j(`${HUB}.tp.objs.some(o => o.text === 'TUNING')`)));
    await key(t, 'ArrowDown'); await key(t, 'ArrowDown'); await key(t, 'ArrowRight'); await t.run(200);
    check('a change made here is in the table (Right on the first row: the cruiser\'s top speed, 220)', (await j('CAMP.carrier.speed')) === 220 && (await j(`${HUB}.tp.model.cur`)) === 3);
    await snap(t, '5-ready-room');
    await key(t, 'Backspace'); await key(t, 'Escape'); await t.run(300);
    check('Esc closes it and the room is the room again (the title did not open)', (await j(`campTuneIsOpen(${HUB})`)) === false && (await j(`game.scene.isActive('CampHub')`)) === true && (await j('campTuneCount()')) === 0);
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
  finally { await t.close(); }
}

await flight(); await room();
console.log(bad ? `\nTUNING PANEL BOOT FAIL (${bad})` : '\nTUNING PANEL BOOT PASS');
process.exit(bad ? 1 : 0);
