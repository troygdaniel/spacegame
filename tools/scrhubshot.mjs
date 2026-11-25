// not in the smoke: the ready room and its screens in the new look, as pictures (card space-game-screens-c-hub; the mock is docs/screens-mock.html)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, a window of 1578 by 1000 px like the mock's stage, the address ?screens=1. A campaign in progress is put in the save (level 2 next, the
// first mission and the third flown, the second SKIPPED, a tech fitted, 60 credits and 100 ore), the title's K opens the ready room, and each screen is opened with the keys Troy uses. Pictures go OUTSIDE the repository:
// ~/dev/spacegame-night/screens/ (SCREENS_SHOTS=<folder> for another), named <TAG>-hub-<screen>.png (TAG default c).
//   node tools/scrhubshot.mjs        the ready room, the missions pick (the cursor on the skipped mission, then on the next one), the refit (a fighter bought), the rank
// Exit code 1 when a picture could not be taken, the game logged an error, or a screen was not the new one.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('../tests/cdp.mjs');
const OUT = process.env.SCREENS_SHOTS || join(homedir(), 'dev/spacegame-night/screens'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'c';
const HUB = `game.scene.getScene('CampHub')`;
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, KeyK: 75, KeyF: 70, KeyL: 76, Enter: 13, Backspace: 8, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
let bad = 0;
const t = await launch('?screens=1', ROOT);
const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-hub-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture', name); };
const screen = async (name, id) => {
  await t.run(250);
  const got = await j(`(() => { const s = ${HUB}, r = document.querySelector('.sc-root'); return { id: s.scrHub && s.scrHub.id, on: s.scrHubOn === true, words: r && r.innerText ? r.innerText.split(/\\s+/).filter(Boolean).length : 0, tiles: document.querySelectorAll('.sc-tile').length }; })()`);
  if (got.id !== id || !got.on) { bad++; console.log('  FAIL', name, 'expected the', id, 'screen, got', JSON.stringify(got)); } else console.log('  ok  ', name, got.words + ' words and numbers, ' + got.tiles + ' tiles');
  await snap(name);
};
await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 2, mission: 0, techs: ['shield'], ore: 100, credits: 60, bonus: { fighters: 1, escorts: 0 }, results: { '1.1': { score: 4280, bonuses: ['swift', 'hull', 'miner'], t: 306, hull: 600, lost: 0, tries: 1 }, '1.3': { score: 3100, bonuses: ['delivered'], t: 400, hull: 400, lost: 1, tries: 1 } } }))`);
await key('KeyK');
let up = false; for (let i = 0; i < 40 && !up; i++) { up = await j(`!!(game.scene.isActive('CampHub') && ${HUB}.player && ${HUB}.scrHubOn === true)`); if (!up) { await sleep(60); await t.run(100); } }
if (!up) { console.log('  FAIL the ready room did not come up in the new look'); bad++; }
await t.run(900);
await screen('ready', 'ready');
await key('Enter'); await t.run(300); await screen('pick', 'pick');
await key('ArrowUp'); await key('ArrowUp'); await t.run(200); await screen('pick-skipped', 'pick');
await key('ArrowLeft'); await key('Digit2'); await t.run(200); await screen('ready-refit-row', 'ready');
await key('Enter'); await t.run(300); await screen('refit', 'refit');
await key('Enter'); await t.run(300); await screen('refit-bought', 'refit');
await key('ArrowLeft'); await key('Digit3'); await key('Enter'); await t.run(300); await screen('rank', 'rank');
const errs = Array.isArray(t.errors) ? t.errors : []; if (errs.length) { bad++; console.log('  FAIL the game logged', errs.length, 'errors:', JSON.stringify(errs.slice(0, 3))); }
await t.close();
console.log(bad ? `FAIL: ${bad}` : `PICTURES PASS (${OUT})`);
process.exit(bad ? 1 : 0);
