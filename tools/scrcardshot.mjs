// not in the smoke: the cards of the Campaign scene in the new look, as pictures (card space-game-screens-a-cards; the mock is docs/screens-mock.html)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, a window of 1578 by 1000 px like the mock's stage, the address ?campaign=1&screens=1. Each card is made by the scene's own show function in a state the
// mission 1.1 gives (no key, no rule, no number is changed); the picture goes OUTSIDE the repository: ~/dev/spacegame-night/screens/ (SCREENS_SHOTS=<folder> for another), named <TAG>-<card>.png (TAG default a).
//   node tools/scrcardshot.mjs       the pause, the won card (the debrief), the lost card, the level won card, the Earth refit (empty and with a pick), the plain tech pick (level 2) and the end card
// Exit code 1 when a picture could not be taken, the game logged an error, or a card was not the new one.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('../tests/cdp.mjs');
const OUT = process.env.SCREENS_SHOTS || join(homedir(), 'dev/spacegame-night/screens'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'a';
const SC = `game.scene.getScene('Campaign')`;
let bad = 0;
const t = await launch('?campaign=1&screens=1', ROOT);
const j = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
await t.send('Emulation.setDeviceMetricsOverride', { width: 1578, height: 1000, deviceScaleFactor: 1, mobile: false });
const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture', name); };
const card = async (name, expr, id) => {
  await t.ev(`(() => { ${expr}; return 1; })()`); await t.run(250);
  const got = await j(`(() => { const s = ${SC}; return { id: s.scrCard && s.scrCard.id, panels: document.querySelectorAll('.sc-root > .sc-p').length, words: (document.querySelector('.sc-root') || {}).innerText ? document.querySelector('.sc-root').innerText.split(/\\s+/).filter(Boolean).length : 0 }; })()`);
  if (got.id !== id || got.panels !== 1) { bad++; console.log('  FAIL', name, 'expected the', id, 'card, got', JSON.stringify(got)); } else console.log('  ok  ', name, got.words + ' words and numbers on the screen');
  await snap(name);
};
await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); }
await t.run(600);
await t.ev(`(() => { const C = ${SC}.camp; C.god = true; C.t = 306000; return 1; })()`);
await card('pause', `${SC}.showPause()`, 'pause');
await card('won', `${SC}.mdone = false; ${SC}.showDebrief(campScore(${SC}.camp))`, 'won');
await card('lost', `${SC}.showLost('convoy')`, 'lost');
await card('levelwon', `${SC}.camp.delivered = 3; ${SC}.showWon()`, 'lvlwon');
await card('refit', `${SC}.P.techs = []; ${SC}.showRefit(); ${SC}.refit.w = { ore: 0, credits: 100 }; ${SC}.paintRefit()`, 'earthrefit');
await card('refit-pick', `${SC}.refitKey('Digit1'); ${SC}.refitKey('Digit4')`, 'earthrefit');
await card('pick', `${SC}.level = 2; ${SC}.showPick()`, 'tech');
await card('end', `${SC}.showEnd()`, 'end');
const errs = Array.isArray(t.errors) ? t.errors : []; if (errs.length) { bad++; console.log('  FAIL the game logged', errs.length, 'errors:', JSON.stringify(errs.slice(0, 3))); }
await t.close();
console.log(bad ? `FAIL: ${bad}` : `PICTURES PASS (${OUT})`);
process.exit(bad ? 1 : 0);
