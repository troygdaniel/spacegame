// not in the smoke: the four fixes of card space-game-screens-batch-fixes, as pictures (muted, through the test lock, 1578 by 1000, ?screens=1; pictures go OUTSIDE the repository: ~/dev/spacegame-night/screens/, <TAG>-fix-<name>.png, TAG default x)
//   node tools/scrfixshot.mjs    1 the keys page opened with H from the pause card (it must show), 6 the lost and won cards with no canvas world names under the veil, 7 the ready room with no hangar words behind the panels, 2 the briefing's map in the panel look
// Exit code 1 when the keys page is not shown, a world name or hangar word is still visible under a screen, or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('../tests/cdp.mjs');
const OUT = process.env.SCREENS_SHOTS || join(homedir(), 'dev/spacegame-night/screens'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'x';
const VK = { KeyH: 72, KeyK: 75, KeyL: 76, Escape: 27 };
let bad = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) bad++; };
const mk = async url => { const t = await launch(url, ROOT); await t.send('Emulation.setDeviceMetricsOverride', { width: 1578, height: 1000, deviceScaleFactor: 1, mobile: false });
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-fix-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture', name); };
  return { t, j, key, snap }; };
{ // the flight: the pause card and the H page, the lost and the won cards
  const { t, j, key, snap } = await mk('?campaign=1&screens=1'), CS = `game.scene.getScene('Campaign')`;
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${CS}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${CS}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); }
  await t.run(600);
  await t.ev(`(() => { ${CS}.showPause(); return 1; })()`); await t.run(300); await key('KeyH'); await t.run(400);
  const k = await j(`(() => { const r = document.querySelector('.sc-root'); const el = document.querySelector('.sc-keys'); return { open: campKeysIsOpen(${CS}), root: r && getComputedStyle(r).display, keys: !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 100 }; })()`);
  ok('1: H on the pause card shows the keys page (a panel, not an empty dark screen)', k.open && k.root !== 'none' && k.keys, JSON.stringify(k)); await snap('1-keys');
  await key('KeyH'); await t.run(300);
  const names = `(() => { const s = ${CS}; return (s.placeLabels || []).filter(o => o.active !== false && o.visible).length; })()`;
  await t.ev(`(() => { ${CS}.showLost('convoy'); return 1; })()`); await t.run(400);
  ok('6: the lost card has no canvas world name under it', (await j(names)) === 0); await snap('6-lost');
  await t.ev(`(() => { ${CS}.mdone = false; ${CS}.showDebrief(campScore(${CS}.camp)); return 1; })()`); await t.run(400);
  ok('6: the won card has none either', (await j(names)) === 0); await snap('6-won');
  await t.ev(`(() => { ${CS}.hideCard(); ${CS}.mode = 'play'; return 1; })()`); await t.run(300);
  ok('and the names are given back when the card goes', (await j(`(() => { const s = ${CS}; return (s.placeLabels || []).some(o => o.active !== false && o.visible); })()`)));
  const errs = Array.isArray(t.errors) ? t.errors : []; if (errs.length) { bad++; console.log('  FAIL the game logged', errs.length, 'errors:', JSON.stringify(errs.slice(0, 2))); }
  await t.close();
}
{ // the ready room and the briefing
  const { t, j, key, snap } = await mk('?screens=1'), HUB = `game.scene.getScene('CampHub')`;
  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 0, techs: [], ore: 0, credits: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }))`);
  await key('KeyK'); let up = false; for (let i = 0; i < 40 && !up; i++) { up = await j(`!!(game.scene.isActive('CampHub') && ${HUB}.player && ${HUB}.scrHubOn === true)`); if (!up) { await sleep(60); await t.run(100); } }
  await t.run(900);
  const words = `(() => { const s = ${HUB}; return s.children.list.filter(o => o.type === 'Text' && o.depth < 79 && o.visible && o.text).map(o => o.text); })()`;
  ok('7: no hangar word is visible behind the ready room panels', (await j(words)).length === 0, JSON.stringify(await j(words))); await snap('7-hub');
  await key('KeyL'); await t.run(600);
  ok('2: the briefing is the one page, in the panel look (a thin frame, the page\'s typeface on the map)', await j(`!!(${HUB}.bf && ${HUB}.bf.one)`) && await j(`${HUB}.bf.map.every(o => !o.style || !/monospace/.test(o.style.fontFamily || ''))`)); await snap('2-brief');
  await key('KeyH'); await t.run(400);
  ok('and H over the briefing shows the keys page, with the briefing\'s panels waiting under it', await j(`(() => { const el = document.querySelector('.sc-keys'); return !!el && getComputedStyle(el).display !== 'none' && ${HUB}.bf.el.style.display === 'none'; })()`)); await snap('1-keys-over-brief');
  const errs = Array.isArray(t.errors) ? t.errors : []; if (errs.length) { bad++; console.log('  FAIL the game logged', errs.length, 'errors:', JSON.stringify(errs.slice(0, 2))); }
  await t.close();
}
console.log(bad ? `FAIL: ${bad}` : `PICTURES PASS (${OUT})`);
process.exit(bad ? 1 : 0);
