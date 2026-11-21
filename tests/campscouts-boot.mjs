// not in the smoke: the Campaign's scout-escorts in a real boot, one picture, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-scouts)
// The rules are in tests/campscouts.mjs (plain Node). This boots level 1, launches the wing, opens the Tab map, sets Vesta with a click and presses the new third button (Scout) with a real mouse click: the
// map shows the three buttons beside the place and, once the scout is out, its sensor circle; the HUD says "SCOUTS 1"; the scout reads, reports and lands, and the count goes. Pictures: the map and the HUD.
//   node tests/campscouts-boot.mjs
// The pictures go to the folder in SCOUTS_SHOTS (default ~/dev/spacegame-night/shots/scouts-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.SCOUTS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const shot = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'scouts-' + name + '.png'), Buffer.from(r.data, 'base64')); } }; // twice: the second has drawn
  const key = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
  async function clickAt(gx, gy) { // a real click: the game's own coordinates (1280 x 720) to the page's
    const p = await j(`(() => { const r = game.canvas.getBoundingClientRect(); return { x: r.left + ${gx} * r.width / 1280, y: r.top + ${gy} * r.height / 720 }; })()`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    await t.run(150);
  }
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(300); } // the intro card, and the missions' briefing
  check('the battle is on', (await j(`${SC}.mode`)) === 'play');
  await t.ev(`(() => { campOrder(${SC}.camp, 'launch', '', 'key'); return 1; })()`); await t.run(9000);
  check('the wing is out (the escorts too)', await j(`campWing(${SC}.camp, 'escort').length >= 1`));
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(400);
  check('Tab opens the map', await j(`!!${SC}.mp`));
  const vesta = await j(`(() => { const s = ${SC}, mp = s.mp, r = mp.rows.find(r => r.id === 'place:vesta'), p = campMapPoint(mp.fit, CAMPMAP.frame, r.x, r.y); return { x: p.x, y: p.y }; })()`);
  await clickAt(vesta.x, vesta.y); await t.run(300);
  const st = await j(`({ set: ${SC}.mp.setId, fly: ${SC}.mp.btnFly.visible, fast: ${SC}.mp.btnFast.visible, scout: ${SC}.mp.btnScout.visible, text: ${SC}.mp.btnScout.text })`);
  check('a click on Vesta sets it: the three buttons are by it (Fly, Fast, Scout)', st.set === 'place:vesta' && st.fly && st.fast && st.scout && /SCOUT/.test(st.text), JSON.stringify(st));
  const b = await j(`({ x: ${SC}.mp.btnScout.x + 12, y: ${SC}.mp.btnScout.y + 8 })`);
  await clickAt(b.x, b.y); await t.run(500);
  check('a click on Scout sends the nearest free escort: one scout out, with its place', await j(`campScoutsOut(${SC}.camp) === 1 && campScouts(${SC}.camp)[0].scout.name === 'Vesta'`));
  await t.run(2500);
  check('its sensor circle is on the map', await j(`campSensors(${SC}.camp).length === 1`));
  await shot('1-map');
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(300);
  check('the HUD counts it: SCOUTS 1', await j(`${SC}.hud.scouts.text`) === 'SCOUTS 1', await j(`${SC}.hud.scouts.text`));
  await shot('2-hud');
  await t.run(30000);
  check('the scout read its place, reported and landed: no scout out, the HUD count is gone, the escort is back in the bay', await j(`campScoutsOut(${SC}.camp) === 0 && ${SC}.hud.scouts.text === '' && ${SC}.camp.bay.escorts >= 1`), await j(`JSON.stringify([campScoutsOut(${SC}.camp), ${SC}.hud.scouts.text, ${SC}.camp.bay.escorts])`));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP SCOUTS BOOT FAIL (${bad})` : 'CAMP SCOUTS BOOT PASS');
process.exit(bad ? 1 : 0);
