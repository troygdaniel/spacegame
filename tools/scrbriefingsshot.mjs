// not in the smoke: the one-page briefing of the other eight missions, as pictures (card space-game-screens-f-briefings)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, a window of 1578 by 1000 px, the address ?screens=1. For each mission asked for (BRIEFS="1.2,2.3,3.3", default all eight) a campaign in progress that makes it the next
// mission is put in the save, the title's K opens the ready room and L opens the briefing; the picture is taken. Pictures go OUTSIDE the repository: ~/dev/spacegame-night/screens/ (SCREENS_SHOTS=<folder> for another), named <TAG>-brief-<level>-<mission>.png (TAG default f).
// Exit code 1 when a picture could not be taken, the game logged an error, or a briefing did not show its four moments.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('../tests/cdp.mjs');
const OUT = process.env.SCREENS_SHOTS || join(homedir(), 'dev/spacegame-night/screens'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'f';
const BRIEFS = (process.env.BRIEFS || '1.2,1.3,2.1,2.2,2.3,3.1,3.2,3.3').split(',').map(x => x.split('.').map(Number));
const HUB = `game.scene.getScene('CampHub')`;
const VK = { KeyK: 75, KeyL: 76, Escape: 27 };
let bad = 0;
for (const [level, mission] of BRIEFS) {
  const t = await launch('?screens=1', ROOT);
  try {
    const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1578, height: 1000, deviceScaleFactor: 1, mobile: false });
    await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
    await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: ${level}, mission: ${mission - 1}, techs: [], ore: 0, credits: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }))`);
    await key('KeyK');
    let up = false; for (let i = 0; i < 40 && !up; i++) { up = await j(`!!(game.scene.isActive('CampHub') && ${HUB}.player && ${HUB}.scrHubOn === true)`); if (!up) { await sleep(60); await t.run(100); } }
    await t.run(900); await key('KeyL'); await t.run(600);
    const got = await j(`(() => { const s = ${HUB}; return { one: !!(s.bf && s.bf.one), moments: s.bf ? s.bf.moments.map(m => m.text) : [], z: s.bf && s.bf.z }; })()`);
    if (!got.one || got.moments.length !== 4) { bad++; console.log('  FAIL', level + '.' + mission, 'the page did not show four moments:', JSON.stringify(got)); } else console.log('  ok  ', level + '.' + mission, got.moments.join(' | '));
    for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-brief-${level}-${mission}.png`), Buffer.from(r.data, 'base64')); await t.run(34); }
    const errs = Array.isArray(t.errors) ? t.errors : []; if (errs.length) { bad++; console.log('  FAIL the game logged', errs.length, 'errors:', JSON.stringify(errs.slice(0, 2))); }
  } finally { await t.close(); }
}
console.log(bad ? `FAIL: ${bad}` : `PICTURES PASS (${OUT})`);
process.exit(bad ? 1 : 0);
