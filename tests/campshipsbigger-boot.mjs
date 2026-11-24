// not in the smoke: a look at the Campaign's ships at three zooms, run by hand (one Chrome, muted, through the test lock; card space-game-ships-bigger)
// The rule is tests/campshipsbigger.mjs (plain Node). This boots the real game once (level 1) and reads what the scene DRAWS: at the default zoom (0.335) the cruiser's hull is 52 px long on the screen and a fighter's 16 (3.25 times: card space-game-ships-bigger-proportions) (the hull: CAMP.size.len times the zoom times how many times the picture is drawn up); zoomed all the way out
// they are the same (they do not shrink); zoomed in to 1.6 they are their own size (the pictures 110 and 26 wide, a little over the hulls), nothing held up. A picture is taken at each (twice: the first capture after a step can be a frame behind).
//   node tests/campshipsbigger-boot.mjs
// Pictures go to the folder in SHIPS_SHOTS (default ~/dev/spacegame-night/shots/ships-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.SHIPS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'ships-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(60); } };
const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 8 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter' }); await t.run(40); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter' }); await t.run(340); }
  check('the battle is on', (await j(`${SC}.mode`)) === 'play');
  await t.run(1500);
  // how long a ship's picture is on the screen, along its length (px): the sprite's own display width times the camera's zoom
  const onScreen = kind => j(`(() => { const s = ${SC}, z = s.cameras.main.zoom, u = s.camp.ships.find(q => q.kind === '${kind}' && q.hp > 0), sp = u && s.sp[u.id]; return u && sp ? { z, len: CAMP.size['${kind}'].len * z * (sp._k || 1), own: sp.displayWidth / (sp._k || 1), k: sp._k || 1 } : null; })()`);
  const at = async (zoom, name) => { await t.ev(`(() => { CAMZOOM.want = ${zoom}; return 1; })()`); await t.run(2200); const c = await onScreen('carrier'), f = await onScreen('fighter'); await snap(t, name); return { c, f }; };
  const d = await at(0.335, 'default');
  check('at the default zoom the cruiser is about 52 px long on the screen (it was 33) and a fighter about 16 (it was 7), the cruiser at least 3 times a fighter', d.c && d.f && Math.abs(d.c.len - 52) < 1.5 && Math.abs(d.f.len - 16) < 1 && d.c.len >= 3 * d.f.len, JSON.stringify(d));
  const far = await at(0.0001, 'far');
  check('zoomed all the way out they are the same: 52 and 16 (they do not shrink)', far.c && far.f && Math.abs(far.c.len - 52) < 1.5 && Math.abs(far.f.len - 16) < 1 && far.c.len >= 3 * far.f.len && far.c.z < 0.2, JSON.stringify(far));
  const near = await at(1.6, 'close');
  check('zoomed in to 1.6 they are their own size, nothing held up: the pictures 110 and 26 wide', near.c && near.f && Math.abs(near.c.own - 110) < 1 && Math.abs(near.f.own - 26) < 1 && near.c.k === 1 && near.f.k === 1, JSON.stringify(near));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the look stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nSHIPS LOOK FAIL (${bad})` : '\nSHIPS LOOK PASS');
process.exit(bad ? 1 : 0);
