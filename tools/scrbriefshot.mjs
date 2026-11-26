// not in the smoke: the one-page briefing and the radio openers in the new look, as pictures (card space-game-screens-b-briefing; the mock is docs/screens-mock.html)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, a window of 1578 by 1000 px, the address ?screens=1. A fresh campaign is put in the save, the title's K opens the ready room, L opens the briefing of the
// next mission (mission 1.1) and the picture is taken; the map is zoomed and put back; L again launches, the story card must not come up, and the radio's opening lines are watched coming one by one. Pictures go OUTSIDE the repository:
// ~/dev/spacegame-night/screens/ (SCREENS_SHOTS=<folder> for another), named <TAG>-brief-<name>.png (TAG default b).
//   node tools/scrbriefshot.mjs
// Exit code 1 when a picture could not be taken, the game logged an error, the briefing was not the new one, or the opening lines did not come in order.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('../tests/cdp.mjs');
const OUT = process.env.SCREENS_SHOTS || join(homedir(), 'dev/spacegame-night/screens'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'b';
const HUB = `game.scene.getScene('CampHub')`, CS = `game.scene.getScene('Campaign')`;
const VK = { KeyK: 75, KeyL: 76, Enter: 13, Escape: 27, ArrowLeft: 37, Equal: 187, Minus: 189 };
let bad = 0;
const t = await launch('?screens=1', ROOT);
const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-brief-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture', name); };
const ok = (name, cond, extra = '') => { console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) bad++; };
await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 0, techs: [], ore: 0, credits: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }))`);
await key('KeyK');
let up = false; for (let i = 0; i < 40 && !up; i++) { up = await j(`!!(game.scene.isActive('CampHub') && ${HUB}.player && ${HUB}.scrHubOn === true)`); if (!up) { await sleep(60); await t.run(100); } }
ok('the ready room is up in the new look', up); await t.run(900);
await key('KeyL'); await t.run(500);
const got = await j(`(() => { const s = ${HUB}, r = document.querySelector('.sc-root'); return { open: campBriefIsOpen(s), one: !!(s.bf && s.bf.one), moments: s.bf ? s.bf.moments.length : -1, words: r && r.innerText ? r.innerText.split(/\\s+/).filter(Boolean).length : 0, panels: document.querySelectorAll('.sc-root > .sc-scr').length }; })()`);
ok('L opens the one-page briefing: four moments, the panels of the page (the ready room\'s own screen waits)', got.open && got.one && got.moments === 4, JSON.stringify(got));
await snap('page');
await key('Equal'); await key('Equal'); await t.run(300); await snap('zoomed');
await key('Equal'); // (a second look at the zoom)
ok('the map zooms with the + key as before', (await j(`${HUB}.bf.z`)) > 1);
await key('Escape'); await t.run(300);
ok('Esc takes the page away and leaves the ready room', !(await j(`campBriefIsOpen(${HUB})`)) && (await j(`document.querySelectorAll('.sc-root > .sc-scr').length`)) === 1);
await key('KeyL'); await t.run(400); await key('ArrowLeft'); await t.run(300);
ok('Left (the Back chip) takes it away too', !(await j(`campBriefIsOpen(${HUB})`)));
await key('KeyL'); await t.run(400); await key('KeyL');
let fly = false; for (let i = 0; i < 60 && !fly; i++) { fly = await j(`!!(game.scene.isActive('Campaign') && ${CS}.camp)`); if (!fly) { await sleep(60); await t.run(100); } }
ok('L in the briefing launches the flight, and no story card comes up (the mode is play from the start)', fly && (await j(`${CS}.mode`)) === 'play', await j(`${CS}.mode`));
const said = []; await t.ev(`(() => { window.__said = []; const s = ${CS}, f = s.radioShow.bind(s); s.radioShow = lines => { lines.forEach(l => window.__said.push([Math.round(s.time.now), l.text])); return f(lines); }; return 1; })()`);
for (let k = 0; k < 20; k++) { await t.run(1000); }
const story = await j(`campStory(1, 'before', false)`), all = await j(`window.__said`), lines = all.filter(l => story.indexOf(l[1]) >= 0); // (the flight's own radio lines come in between: only the story's are held to the spacing)
ok('the level\'s opening lines come on the radio, all of them, in order, about five seconds apart (the radio\'s hold of a kept line: ' + lines.length + ' of ' + story.length + ' said)', lines.length === story.length && lines.every((l, i) => l[1] === story[i] && (i === 0 || (l[0] - lines[i - 1][0] >= 3500 && l[0] - lines[i - 1][0] <= 6500))), JSON.stringify(all));
await snap('flight');
const errs = Array.isArray(t.errors) ? t.errors : []; if (errs.length) { bad++; console.log('  FAIL the game logged', errs.length, 'errors:', JSON.stringify(errs.slice(0, 3))); }
await t.close();
console.log(bad ? `FAIL: ${bad}` : `PICTURES PASS (${OUT})`);
process.exit(bad ? 1 : 0);
