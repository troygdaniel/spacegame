// not in the smoke: a boot of the Campaign's two hands (the FLEET panel at the left, the SHIP panel at the right, both always on the screen) with a real keyboard, run by hand (one Chrome, muted, through the test lock; card space-game-two-hands-keys)
// The rules are tests/campanels.mjs, tests/campanelsdraw.mjs, tests/campanelsui.mjs, tests/camptarget.mjs and tests/camppanelkeys.mjs (plain Node). This boots the Campaign once and the title once and does what Troy does: both panels on the screen from the
// first frame with a key on every row, 1 launches the wing, A D S pick a target (a hostile is put in reach: the first minute of 1.1 has none), the bracket round it, Q turns the FLEET page, P the SHIP page, H and the page of every key, and H on the title.
//   node tests/campanelsdraw-boot.mjs         pictures go to the folder in KEYS_SHOTS (default ~/dev/spacegame-night/shots/hands-*.png), never into the repository
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
const VK = { Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit7: 55, Digit8: 56, Digit9: 57, KeyH: 72, KeyA: 65, KeyD: 68, KeyS: 83, KeyX: 88, KeyQ: 81, KeyP: 80, KeyE: 69, KeyR: 82, KeyW: 87, KeyJ: 74, Escape: 27, Enter: 13, Tab: 9, ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Slash: 191, Period: 190 };
const press = async (t, code, wait = 40) => { // a real key: down, a few frames, up (the game clock is stepped, so "fast" is in game milliseconds)
  const key = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Slash' ? '/' : code === 'Period' ? '.' : code, k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key };
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait);
};
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'hands-' + name + '.png'), Buffer.from(r.data, 'base64')); } }; // twice: the first capture of a Phaser frame can be the one before it

async function campaign() {
  console.log('the Campaign');
  const t = await launch('?campaign=1', ROOT);
  try {
    const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
    for (let i = 0; i < 8 && (await j(`${SC}.mode`)) !== 'play'; i++) { await press(t, 'Enter'); await t.run(300); } // the story card, then the briefing: Enter until the battle is on
    check('the battle is on', (await j(`${SC}.mode`)) === 'play');
    await t.run(400);
    check('both panels are on the screen from the first frame: FLEET at the left, SHIP at the right, with their rows', (await j(`Object.keys(${SC}.pnl.p).join()`)) === 'fleet,ship' && (await j(`${SC}.pnl.p.fleet.rows[0].name.visible && ${SC}.pnl.p.ship.rows[0].name.visible`)) === true);
    check('FLEET shows launch or recall, attack, escort, guard, mine, stance and convoy, each with its key', JSON.stringify(await j(`${SC}.pnl.p.fleet.rows.slice(0, 7).map(r => r.key.text + ' ' + r.name.text)`)) === JSON.stringify(['1 Launch / recall', '2 Attack', '3 Escort', '4 Guard', 'W Mine ore', 'E Stance', 'R Convoy']));
    check('SHIP shows 7 8 9 0, J K L ;, U, Enter and I, each with its key', JSON.stringify(await j(`${SC}.pnl.p.ship.rows.map(r => r.key.text)`)) === JSON.stringify(['7', '8', '9', '0', 'J', 'K', 'L', ';', 'U', 'Enter', 'I']));
    check('the rows of both panels fit their column as the browser draws them (the key, the name and its word side by side with room to spare)', (await j(`[${SC}.pnl.p.fleet, ${SC}.pnl.p.ship].every(O => O.rows.filter(r => r.name.visible).every(r => 8 + CAMPPANELS_LOOK.cap.w + 8 + r.name.width + 8 + r.suffix.width + 10 <= CAMPPANELS_LOOK.box.w))`)) === true);
    await snap(t, 'start');
    // flight: the arrows turn and thrust the cruiser; A, W and the other letters are the fleet's and do not
    const rot0 = await j(`${SC}.camp.carrier.rot`);
    await press(t, 'KeyA', 400); await press(t, 'KeyW', 400); await press(t, 'KeyD', 400); await press(t, 'KeyS', 400);
    check('W A S D do not fly the cruiser: no turn, no thrust (A and D picked no target: none is near)', Math.abs((await j(`${SC}.camp.carrier.rot`)) - rot0) < 1e-6 && (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) < 1);
    await press(t, 'ArrowRight', 500);
    check('the Right arrow turns the cruiser', (await j(`${SC}.camp.carrier.rot`)) - rot0 > 0.05);
    await press(t, 'ArrowUp', 500);
    check('the Up arrow thrusts it', (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) > 1);
    await press(t, 'Digit1', 20); await t.run(300);
    check('1 launches the wing', (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`)) >= 1);
    await t.run(6000);
    await press(t, 'KeyQ', 20); await t.run(300);
    check('Q turns the FLEET panel to its stances page: five rows', (await j(`${SC}.pn.page.fleet`)) === 1 && (await j(`${SC}.pnl.p.fleet.title.text`)) === 'STANCES');
    await snap(t, 'stances');
    await press(t, 'Digit2', 20); await t.run(200);
    check('2 on the stances page picks Orbit and the panel goes back to its first page', (await j(`${SC}.camp.stance`)) === 'orbit' && (await j(`${SC}.pn.page.fleet`)) === 0);
    await press(t, 'KeyE', 20); await press(t, 'KeyE', 20); await t.run(100);
    check('E twice in a row passes through Keep distance: the row says "> Match speed" and no order is given yet', (await j(`${SC}.camp.stance`)) === 'orbit' && /^> Match/.test(await j(`${SC}.pnl.p.fleet.rows[5].suffix.text`)));
    await snap(t, 'pending');
    await t.run(1000);
    check('0.7 s after the last press the order is given: Match speed (Keep distance was never ordered), and the row says it', (await j(`${SC}.camp.stance`)) === 'match' && (await j(`${SC}.pnl.p.fleet.rows[5].suffix.text`)) === 'Match speed');
    await press(t, 'KeyP', 20); await t.run(300);
    check('P turns the SHIP panel to BUILD', (await j(`${SC}.pn.page.ship`)) === 1 && (await j(`${SC}.pnl.p.ship.title.text`)) === 'BUILD');
    await snap(t, 'build');
    await press(t, 'KeyP', 20); await t.run(200);
    // a hostile put in reach: A, D and S pick it, the bracket is drawn, the FLEET panel names it
    const spawned = await j(`(() => { const C = ${SC}.camp, c = C.carrier, u = campSpawn(C, 'raider', c.x + 500, c.y - 200); return !!u; })()`).catch(() => false);
    if (spawned) {
      await press(t, 'KeyD', 20); await t.run(300);
      check('D picks the nearest hostile as the target, and the FLEET panel names it', !!(await j(`${SC}.camp.tgt`)) && /TARGET  /.test(await j(`${SC}.pnl.p.fleet.foot.text`)));
      await snap(t, 'target');
      await press(t, 'KeyX', 20); await t.run(100);
      check('X clears it', (await j(`${SC}.camp.tgt`)) === '');
    }
    await t.ev(`(() => { campCallStart(${SC}.camp, 'cruiser', {}); return 1; })()`); await t.run(500);
    check('a pilot\'s call takes the place of the FLEET rows: PILOT CALL, the pilot\'s line and 1 2 3; 1 answers it and does not launch anything', (await j(`${SC}.pnl.p.fleet.callHead.visible && ${SC}.pnl.p.fleet.callRows.filter(r => r.visible).length === 3 && !${SC}.pnl.p.fleet.rows[0].name.visible && ${SC}.pnl.p.fleet.callRows.every(r => 12 + r.width <= CAMPPANELS_LOOK.box.w - 8)`)) === true);
    await snap(t, 'call');
    await press(t, 'Digit1', 20); await t.run(300);
    check('the call is answered and the rows are back', (await j(`${SC}.camp.call.open`)) === null && (await j(`${SC}.pnl.p.fleet.rows[0].name.visible`)) === true);
    // the strip: the slash opens it (the chat key is stubbed: the strip needs one), the keys typed in it are not the fleet's, Esc closes it and does not pause; the period is the voice key of the scene
    await t.ev(`(() => { shipcompAvailable = () => true; return 1; })()`);
    await press(t, 'Slash', 40); await t.run(300);
    check('/ opens the command strip: its input has the focus', (await j(`document.activeElement && document.activeElement.tagName`)) === 'INPUT');
    await press(t, 'KeyD', 40); await press(t, 'Digit1', 40); await t.run(100);
    check('the keys typed in the strip are the strip\'s, not the fleet\'s: D picks no target and 1 launches nothing more', (await j(`${SC}.camp.tgt`)) === '');
    await press(t, 'Escape', 40); await t.run(300);
    check('Esc closes the strip and does not pause the battle', (await j(`document.activeElement && document.activeElement.tagName`)) !== 'INPUT' && (await j(`${SC}.mode`)) === 'play');
    check('the voice key of the Campaign is the period (U is the SHIP panel\'s emergency shields there): the listener follows the scene', (await j(`(() => { listenKeysSync(game); return [LISTEN.code, LISTEN.cap].join(); })()`)) === 'Period,.');
    await press(t, 'KeyH'); await t.run(200);
    check('H opens the page of every key and the battle waits', (await j(`${SC}.ck && ${SC}.ck.open`)) === true && (await j(`${SC}.mode`)) === 'pause');
    await snap(t, 'page');
    await press(t, 'KeyH'); await t.run(100);
    check('H again closes it and the battle goes on', (await j(`${SC}.ck`)) === null && (await j(`${SC}.mode`)) === 'play');
    check('the bottom key line names the arrows, Space, Enter, Tab, the zoom keys and H', /^Arrows fly   Space turrets   Enter missile   Tab Map   - = Zoom   H Keys$/.test(await j(`${SC}.hud.keys.text`)));
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
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

try { await campaign(); await title(); } catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
console.log(bad ? `\nCAMPAIGN TWO HANDS BOOT FAIL (${bad})` : '\nCAMPAIGN TWO HANDS BOOT PASS');
process.exit(bad ? 1 : 0);
