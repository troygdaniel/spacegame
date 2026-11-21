// not in the smoke: a boot of the Campaign's keyboard panels with a real keyboard and a real mouse, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-keys-help)
// The rules are tests/campanels.mjs, tests/campanelsdraw.mjs and tests/campanelsui.mjs (plain Node). This boots the Campaign once and the title once and does what Troy does: the two tabs, a digit with no panel (nothing), Q then 1 fast (the tab pulses, the wing
// launches), Q alone (the list drops in), a click on a row (it flashes, then a tab again), E and the SHIP list, Q with it open (switch), Esc, N doing nothing, H and the page of every key, and H on the title's Campaign panel.
//   node tests/campanelsdraw-boot.mjs         pictures go to the folder in KEYS_SHOTS (default ~/dev/spacegame-night/shots/keys-*.png), never into the repository
// Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
// the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots): this boot was written for it and pins its missions and words; the rim run is checked in tests/camprim.mjs. The address started the Campaign scene on the rim run, so it starts again.
const belt = async t => { await t.ev(beltSource(1)); await t.ev(`(() => { game.scene.stop('Campaign'); game.scene.start('Campaign', { level: 1, techs: [], via: 'address' }); return 1; })()`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.KEYS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit5: 53, KeyH: 72, KeyB: 66, KeyN: 78, KeyQ: 81, KeyE: 69, Escape: 27, Enter: 13 };
const press = async (t, code, wait = 40) => { // a real key: down, a few frames, up (the game clock is stepped, so "fast" is in game milliseconds)
  const key = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code.slice(3).toLowerCase() : code, k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key };
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait);
};
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'keys-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture keys-' + name + '.png'); };
const clickAt = async (t, gx, gy) => {
  const p = JSON.parse(await t.ev(`(() => { const r = game.canvas.getBoundingClientRect(); return JSON.stringify({ x: r.left + ${gx} * r.width / 1280, y: r.top + ${gy} * r.height / 720 }); })()`));
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await t.run(100);
};

async function campaign() {
  console.log('the Campaign');
  const t = await launch('?campaign=1', ROOT);
  try {
    const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await belt(t); await t.clock(); await t.run(700);
    await press(t, 'Enter'); await t.run(300); await press(t, 'Enter'); await t.run(300); // the story card, then the briefing
    check('the three tabs are on the screen from the start: Q FLEET and C SYSTEMS at the left, E SHIP at the right, no list', (await j(`Object.keys(${SC}.pnl.p).join()`)) === 'fleet,ship,systems' && (await j(`${SC}.pnl.p.fleet.cap.visible && ${SC}.pnl.p.ship.cap.visible && ${SC}.pnl.p.systems.cap.visible && ${SC}.pnl.p.fleet.rows.every(r => !r.name.visible)`)) === true);
    await snap(t, 'tabs');
    await press(t, 'Digit1', 20); await t.run(300);
    check('a digit with no panel open does nothing: no order, no panel', (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched + (${SC}.pn.open ? 1 : 0)`)) === 0);
    await press(t, 'KeyQ', 20); await press(t, 'Digit1', 20); await t.run(300);
    check('Q then 1 typed fast: the wing is launching, no row flashed, and the TAB pulsed', (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`)) >= 8 && (await j(`${SC}.pn.flash && ${SC}.pn.flash.shown`)) === false);
    await t.run(6000);
    await press(t, 'KeyQ', 20); await t.run(400);
    const words = await j(`${SC}.pnl.p.fleet.rows.map(r => r.name.text + ': ' + r.suffix.text)`);
    check('Q alone: at once the FLEET tab lights and its list drops in, one line a row: launch all out, attack the fighters out, escort stay close (the belt has no convoy)', (await j(`${SC}.pn.open`)) === 'fleet' && words.length === 5 && /^Launch: all out$/.test(words[0]) && /^Attack: \d+ out$/.test(words[1]) && /^Escort: stay close$/.test(words[2]), words.join(' | '));
    check('and every row of the FLEET list too', (await j(`${SC}.pnl.p.fleet.rows.every(r => 30 + r.name.width + r.suffix.width + 10 <= CAMPPANELS_LOOK.list.w)`)) === true);
    await snap(t, 'fleet');
    await clickAt(t, 150, 238 + 28 + 6 + 27 * 1 + 12); await t.run(60); // row 2: attack
    check('a click on row 2 (attack) does it, closes the panel in the state and flashes the row', (await j(`${SC}.camp.orders.attack`)) === 1 && (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.pn.flash && ${SC}.pn.flash.row`)) === 'attack');
    await snap(t, 'flash');
    await t.run(400);
    check('and then it is a tab again: the list is gone', (await j(`${SC}.pnl.p.fleet.rows.every(r => !r.name.visible)`)) === true);
    await press(t, 'KeyE', 20); await t.run(400);
    const ship = await j(`${SC}.pnl.p.ship.rows.map(r => r.name.text + ': ' + r.suffix.text)`);
    check('E opens the SHIP list at the right: mine, what a ship costs (or the ore it needs, or "dock first": ships are built docked, and the belt starts with no ore) the objective row and the dock row', ship.length === 5 && /^Mine ore: \d+ ships$/.test(ship[0]) && /^New fighter: (25 ore|needs 25 ore|dock first)$/.test(ship[1]) && /^Fly to goal: /.test(ship[3]), ship.join(' | '));
    check('every row of the open SHIP list fits its column as the browser draws it: the name, its word and the digit side by side with room to spare (the critic saw two of them run together)', (await j(`${SC}.pnl.p.ship.rows.every(r => 30 + r.name.width + r.suffix.width + 10 <= CAMPPANELS_LOOK.list.w)`)) === true, await j(`${SC}.pnl.p.ship.rows.map(r => Math.round(30 + r.name.width + r.suffix.width + 10)).join(' ') + ' of ' + CAMPPANELS_LOOK.list.w`));
    await snap(t, 'ship');
    await press(t, 'KeyQ', 20); await t.run(60); await snap(t, 'crossfade');
    check('Q with SHIP open switches to FLEET', (await j(`${SC}.pn.open`)) === 'fleet' && (await j(`${SC}.pn.closed.id`)) === 'ship');
    await t.run(300); await press(t, 'KeyQ', 20); await t.run(300);
    check('Q again closes it', (await j(`${SC}.pn.open`)) === '');
    await press(t, 'KeyE', 20); await t.run(300); await press(t, 'Escape'); await t.run(300);
    check('Esc closes the panel and does not pause', (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.mode`)) === 'play');
    const before = await j(`[Object.values(${SC}.camp.orders).reduce((a, b) => a + b, 0), ${SC}.camp.nav, ${SC}.mode]`);
    await press(t, 'KeyN'); await t.run(200);
    check('N does nothing in the Campaign (B is the warp blink, which needs the tech)', JSON.stringify(await j(`[Object.values(${SC}.camp.orders).reduce((a, b) => a + b, 0), ${SC}.camp.nav, ${SC}.mode]`)) === JSON.stringify(before));
    await press(t, 'KeyH'); await t.run(200);
    check('H opens the page of every key and the battle waits', (await j(`${SC}.ck && ${SC}.ck.open`)) === true && (await j(`${SC}.mode`)) === 'pause');
    await snap(t, 'page');
    await press(t, 'KeyH'); await t.run(100);
    check('H again closes it and the battle goes on', (await j(`${SC}.ck`)) === null && (await j(`${SC}.mode`)) === 'play');
    check('the bottom key line says the panels and H, and has a backing strip', /Q Fleet   E Ship   C Systems   Tab Map   (\+ - Zoom   )?H Keys$/.test(await j(`${SC}.hud.keys.text`)) && (await j(`!!${SC}.keysBack && ${SC}.keysBack.width >= 1280`)) === true, await j(`${SC}.hud.keys.text`));
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

async function title() {
  console.log('the title');
  const t = await launch('', ROOT);
  try {
    const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 15000, 'the Title scene'); await t.clock(); await t.run(1500);
    await press(t, 'KeyH'); await t.run(200);
    check('H on the title opens the Campaign\'s page of every key and does not start a game', (await j(`campKeysIsOpen(game.scene.getScene('Title'))`)) === true && (await j(`game.scene.isActive('Title')`)) === true);
    await snap(t, 'title-page');
    await press(t, 'Digit1'); await t.run(200);
    check('with the page open another key does not start a game either; Esc closes it', (await j(`game.scene.isActive('Title')`)) === true && (await (async () => { await press(t, 'Escape'); await t.run(100); return j(`campKeysIsOpen(game.scene.getScene('Title'))`); })()) === false);
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

try { await campaign(); await title(); } catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
console.log(bad ? `\nCAMPAIGN PANELS BOOT FAIL (${bad})` : '\nCAMPAIGN PANELS BOOT PASS');
process.exit(bad ? 1 : 0);
