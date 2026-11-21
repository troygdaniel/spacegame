// not in the smoke: a boot of the Campaign with the fork in 1.1's road, run by hand (one Chrome, muted, through the test lock; card space-game-scout-route)
// The rules are in tests/camproute.mjs (plain Node). This boots the rim run once and does what Troy does: opens the Tab map, sees the two lanes in the list and on the map, clicks the long lane's mark
// (it is set, with Fly, Fast, Scout and Take beside it), presses Take, and sees the lane chosen (a firm line, the button marked ON, the convoy's road). One picture of the lanes, one with the choice made.
//   node tests/camproute-boot.mjs        pictures go to CAMPROUTE_SHOTS (default ~/dev/spacegame-night/shots/camproute-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.CAMPROUTE_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
async function clickAt(t, gx, gy) {
  const p = JSON.parse(await t.ev(`(() => { const r = game.canvas.getBoundingClientRect(); return JSON.stringify({ x: r.left + ${gx} * r.width / 1280, y: r.top + ${gy} * r.height / 720 }); })()`));
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await t.run(100);
}
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'camproute-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); } // the story card, and a briefing after it
  check('the flight has started, on the rim run, with a fork in its road', (await j(`${SC}.mode`)) === 'play' && (await j(`!!${SC}.camp.route && ${SC}.camp.L.mid === 'escort'`)));
  await t.run(6000);
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(600);
  check('Tab opens the map', await j(`!!${SC}.mp`));
  check('the map has the two lanes as marks, and its list has them as rows of a group of their own (ROUTE)', (await j(`campMapMarks(${SC}.camp).filter(m => m.type === 'lane').length`)) === 2 && (await j(`${SC}.mp.rows.filter(r => r.group === 'routes').length`)) === 2);
  await snap(t, 'lanes');
  const at = await j(`(() => { const mp = ${SC}.mp, L = ${SC}.camp.route.geo.lanes.long.mid, p = campMapPoint(mp.fit, CAMPMAP.frame, L.x, L.y); return { x: p.x, y: p.y }; })()`);
  await clickAt(t, at.x, at.y); await t.run(300);
  let st = await j(`({ set: ${SC}.mp.setId, fly: ${SC}.mp.btnFly.visible, scout: ${SC}.mp.btnScout.visible, take: ${SC}.mp.btnTake.visible, text: ${SC}.mp.btnTake.text })`);
  check('a click on the long lane\'s mark SETS it: Fly, Fast, Scout and Take beside it, nothing chosen yet', st.set === 'lane:long' && st.fly && st.scout && st.take && !/ON/.test(st.text) && (await j(`${SC}.camp.route.lane`)) === null, JSON.stringify(st));
  const b = await j(`({ x: ${SC}.mp.btnTake.x + 12, y: ${SC}.mp.btnTake.y + 8 })`);
  await clickAt(t, b.x, b.y); await t.run(300);
  check('the Take button picks it: the lane is the long one, the button says ON, the radio line is in the toast', (await j(`${SC}.camp.route.lane`)) === 'long' && (await j(`/ON/.test(${SC}.mp.btnTake.text)`)));
  await t.run(400);
  await snap(t, 'chosen');
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(100); // the map closes, the flight goes on
  await t.run(70000);
  check('the transport reached the fork and went on by the long lane without stopping, and the route is passed', (await j(`${SC}.camp.route.passed`)) === true && (await j(`${SC}.camp.route.lane`)) === 'long');
  check('the page stayed quiet', (t.errors || []).length === 0, JSON.stringify((t.errors || []).slice(0, 3)));
} finally { await t.close(); }
console.log(bad ? `\n${bad} checks failed` : '\nCAMPROUTE BOOT PASS');
process.exit(bad ? 1 : 0);
