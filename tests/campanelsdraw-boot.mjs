// not in the smoke: a boot of the Campaign's keyboard panels with a real keyboard and a real mouse, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-keys-help)
// The rules are tests/campanels.mjs and tests/campanelsdraw.mjs (plain Node). This boots the Campaign once and the title once and does what Troy does: 1 then 1 fast (no flash, the wing launches), 1 slowly (the panel
// comes up after 250 ms, with its live words), a click on a row, 2 and the SHIP panel, Esc, H and the page of every key, B and N doing nothing, and H on the title's Campaign panel.
//   node tests/campanelsdraw-boot.mjs         pictures go to the folder in KEYS_SHOTS (default ~/dev/spacegame-night/shots/keys-*.png), never into the repository
// Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.KEYS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, KeyH: 72, KeyB: 66, KeyN: 78, Escape: 27, Enter: 13 };
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
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
    for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await press(t, 'Enter'); await t.run(300); } // the story card, and on a tree with missions a briefing after it: Enter until the flight
    check('the flight has started (past the story card and any briefing)', (await j(`${SC}.mode`)) === 'play');
    await t.ev(`(() => { window.__shown = false; const p0 = campPanelsPaint; campPanelsPaint = (s, now) => { p0(s, now); if (s.pnl && s.pnl.objs.length) window.__shown = true; }; return 1; })()`);
    await press(t, 'Digit1', 20); await press(t, 'Digit1', 20); await t.run(200);
    check('1 then 1 typed fast: the wing is launching and the panel was never drawn', (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`)) >= 8 && (await j('window.__shown')) === false, JSON.stringify(await j(`[${SC}.camp.launchQ.length, ${SC}.camp.launched, window.__shown]`)));
    await t.run(6000);
    await press(t, 'Digit1', 20); await t.run(100);
    check('1 alone, 100 ms later: still not drawn', (await j(`${SC}.pnl.objs.length`)) === 0 && (await j(`${SC}.pn.open`)) === 'fleet');
    await t.run(300);
    const words = await j(`${SC}.pnl.rows.map(r => r.name.text + ': ' + r.state.text)`);
    check('after 250 ms the FLEET panel is up with its live words: launch says all out, attack six fighters, escort stays by the carrier (the belt has no convoy)', (await j(`${SC}.pnl.objs.length`)) > 10 && words.length === 5 && /Launch: all of it is out/.test(words[0]) && /Attack: 6 fighters out/.test(words[1]), words.join(' | '));
    await snap(t, 'fleet');
    await clickAt(t, 150, 238 + 58 + 46 * 1 + 10); await t.run(200); // row 2: attack
    check('a click on row 2 (attack) does it and closes the panel', (await j(`${SC}.camp.orders.attack`)) === 1 && (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.pnl.objs.length`)) === 0);
    await press(t, 'Digit2', 20); await t.run(400);
    const ship = await j(`${SC}.pnl.rows.map(r => r.name.text + ': ' + r.state.text)`);
    check('2 opens the SHIP panel at the right: mine, shields, what a ship costs (or the ore it needs: the belt starts with none) and the objective row', ship.length === 5 && /^Mine ore: \d+ ships, \d+ rocks/.test(ship[0]) && /^Build a fighter: (25 ore, 6 s|needs 25 ore)$/.test(ship[2]) && /^Fly to the objective: /.test(ship[4]), ship.join(' | '));
    await snap(t, 'ship');
    await press(t, 'Escape'); await t.run(100);
    check('Esc closes the panel and does not pause', (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.mode`)) === 'play');
    const before = await j(`[Object.values(${SC}.camp.orders).reduce((a, b) => a + b, 0), ${SC}.camp.nav, ${SC}.mode]`);
    await press(t, 'KeyB'); await press(t, 'KeyN'); await t.run(200);
    check('B and N do nothing in the Campaign', JSON.stringify(await j(`[Object.values(${SC}.camp.orders).reduce((a, b) => a + b, 0), ${SC}.camp.nav, ${SC}.mode]`)) === JSON.stringify(before));
    await press(t, 'KeyH'); await t.run(200);
    check('H opens the page of every key and the battle waits', (await j(`${SC}.ck && ${SC}.ck.open`)) === true && (await j(`${SC}.mode`)) === 'pause');
    await snap(t, 'page');
    await press(t, 'KeyH'); await t.run(100);
    check('H again closes it and the battle goes on', (await j(`${SC}.ck`)) === null && (await j(`${SC}.mode`)) === 'play');
    check('the bottom key line says the panels and H', (await j(`${SC}.hud.keys.text`)) === '' || /1 Fleet   2 Ship   Tab Map(   \+ - Zoom)?   H Keys$/.test(await j(`${SC}.hud.keys.text`)), await j(`${SC}.hud.keys.text`));
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
