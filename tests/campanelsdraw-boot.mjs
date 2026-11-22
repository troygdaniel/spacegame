// not in the smoke: a boot of the Campaign's two lists (Q opens ONE list of fleet orders at the left, P ONE list of ship orders at the right; nothing is drawn until one is opened) with a real keyboard, run by hand (one Chrome, muted, through the test lock; card one-list-keys)
// The rules are tests/campanels.mjs, tests/campanelsdraw.mjs, tests/campanelsui.mjs, tests/camptarget.mjs and tests/camppanelkeys.mjs (plain Node). This boots the Campaign once and the title once and does what Troy does: no list on the screen at the
// first frame (only the target's line under the radar), Q and the highlight, Down and Enter launch the wing, the stances are plain rows, P the ship list, a refused order leaves the list open, A D S X the target (a hostile is put in reach: the first
// minute of 1.1 has none), a pilot's call answered with Up, Down and Enter, the strip, H and the page of every key, and H on the title. A row's place in its list is read from campPanelList in the page, never a number written here.
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
const VK = { Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit7: 55, Digit8: 56, Digit9: 57, KeyH: 72, KeyA: 65, KeyD: 68, KeyS: 83, KeyX: 88, KeyQ: 81, KeyP: 80, KeyE: 69, KeyR: 82, KeyW: 87, KeyU: 85, KeyJ: 74, Escape: 27, Enter: 13, Tab: 9, ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Slash: 191, Period: 190 };
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
    const P = `${SC}.pn`, PL = `${SC}.pnl`, HI = `${PL}.rows[${P}.at - ${P}.top]`; // the list's state, its objects, and the objects of the highlighted row (src/campanelsdraw.js)
    const isOpen = () => j(`campPanelOpen(${P})`);
    const listCode = id => j(`CAMP_PANELS.panels.find(p => p.id === ${JSON.stringify(id)}).code`);
    const listAt = (id, row) => j(`campPanelList(${SC}.camp, ${JSON.stringify(id)}).findIndex(r => r.id === ${JSON.stringify(row)})`);
    const goTo = async (id, row) => { // the list's key (Q or P), then Down to the row: its place is read from the list of THIS mission
      const at = await listAt(id, row); if (at < 0) return false;
      if (await isOpen()) await press(t, 'Escape', 20); // Esc closes an open list (it pauses only when none is open)
      await press(t, await listCode(id), 20); for (let i = 0; i < at; i++) await press(t, 'ArrowDown', 20);
      await t.run(300); return true;
    };
    const order = async (id, row) => { if (!(await goTo(id, row))) return false; await press(t, 'Enter', 20); await t.run(300); return true; };
    const shownRows = () => j(`${PL}.rows.filter(r => r.name.visible).map(r => r.name.text)`);
    const fits = () => j(`${PL}.rows.filter(r => r.name.visible).every(r => 14 + r.name.width + 8 + r.suffix.width + 12 <= CAMPPANELS_LOOK.box.w)`);
    check('nothing is drawn until Q or P is pressed: no list is open, no heading and no row is on the screen', (await isOpen()) === '' && (await j(`!${PL}.title.visible && ${PL}.rows.every(r => !r.name.visible && !r.suffix.visible) && !${PL}.keys.visible`)) === true);
    check('the target\'s line is on the screen under the radar with no list open: TARGET  none', (await j(`${PL}.tgt.visible`)) === true && (await j(`${PL}.tgt.text`)) === 'TARGET  none' && (await j(`${PL}.tgtKeys.visible`)) === true);
    await snap(t, 'start');
    // flight: the arrows turn and thrust the cruiser; A, W and the other letters do not, and a digit is no key at all
    const rot0 = await j(`${SC}.camp.carrier.rot`), stance0 = await j(`${SC}.camp.stance`);
    await press(t, 'KeyA', 400); await press(t, 'KeyW', 400); await press(t, 'KeyD', 400); await press(t, 'KeyS', 400);
    check('W A S D do not fly the cruiser: no turn, no thrust (A and D picked no target: none is near)', Math.abs((await j(`${SC}.camp.carrier.rot`)) - rot0) < 1e-6 && (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) < 1);
    await press(t, 'Digit1', 20); await press(t, 'Digit2', 20); await press(t, 'KeyE', 20); await press(t, 'KeyR', 20); await press(t, 'KeyU', 20); await t.run(300);
    check('a digit or an old order letter (1 2 E R U) does nothing in flight: nothing launched, no list opened, the stance as it was', (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`)) === 0 && (await isOpen()) === '' && (await j(`${SC}.camp.stance`)) === stance0);
    await press(t, 'ArrowRight', 500);
    check('the Right arrow turns the cruiser', (await j(`${SC}.camp.carrier.rot`)) - rot0 > 0.05);
    await press(t, 'ArrowUp', 500);
    check('the Up arrow thrusts it', (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) > 1);
    // Q: the one list of fleet orders, at its first row
    await press(t, 'KeyQ', 20); await t.run(300);
    const fleetLabels = await j(`campPanelRows(${SC}.camp, 'fleet').map(r => r.label)`), show = await j('CAMP_PANELS.show');
    check('Q opens the list of fleet orders at its first row, headed with its key', (await isOpen()) === 'fleet' && (await j(`${P}.at`)) === 0 && (await j(`${P}.top`)) === 0 && (await j(`${PL}.title.visible && ${PL}.title.text`)) === 'Q   FLEET ORDERS' && (await j(`${PL}.count.text`)) === '1 / ' + fleetLabels.length);
    check('its rows are the fleet orders of this mission in the table\'s order, as many as fit (' + show + '), and the first is Attack the target', JSON.stringify(await shownRows()) === JSON.stringify(fleetLabels.slice(0, show)) && fleetLabels[0] === 'Attack the target', JSON.stringify(await shownRows()));
    check('no row has a key of its own: a row is its words and its state', (await j(`${PL}.rows.every(r => Object.keys(r).join() === 'name,suffix')`)) === true && (await j(`CAMP_PANELS.panels.every(p => p.rows.every(r => !('k' in r) && !('code' in r)))`)) === true);
    check('the rows fit the list as the browser draws them (the words and the state side by side with room to spare)', (await fits()) === true);
    check('the foot names the list\'s keys', /^Up Down move {3}Enter order {3}Q or Esc close$/.test(await j(`${PL}.keys.text`)), await j(`${PL}.keys.text`));
    await snap(t, 'fleet-list');
    const rot1 = await j(`${SC}.camp.carrier.rot`);
    await press(t, 'ArrowRight', 500);
    check('while a list is open the ship coasts: the Right arrow does not turn it', Math.abs((await j(`${SC}.camp.carrier.rot`)) - rot1) < 1e-6);
    await press(t, 'ArrowDown', 20); await t.run(200);
    check('Down moves the highlight to the second row', (await j(`${P}.at`)) === 1 && (await j(`${PL}.count.text`)) === '2 / ' + fleetLabels.length);
    await press(t, 'ArrowUp', 20); await press(t, 'ArrowUp', 20); await t.run(200);
    check('Up from the first row goes round to the last, and the list scrolls to keep it on the screen', (await j(`${P}.at`)) === fleetLabels.length - 1 && (await j(`${P}.top`)) === Math.max(0, fleetLabels.length - show) && (await j(`${HI}.name.text`)) === fleetLabels[fleetLabels.length - 1]);
    await press(t, 'Escape', 20); await t.run(200);
    check('Esc closes the list and does not pause the battle', (await isOpen()) === '' && (await j(`${SC}.mode`)) === 'play' && (await j(`${PL}.title.visible`)) === false);
    check('Q, Down to "Launch the wing", Enter: the wing launches and the list closes', (await order('fleet', 'launch')) === true && (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`)) >= 1 && (await isOpen()) === '');
    await t.run(6000);
    // the stances are plain rows, one for each: picking one gives it at once (no cycling, nothing to wait for)
    check('the stance rows are plain rows: Q, Down to "Stance: orbit the target", Enter gives Orbit at once and the list closes', (await order('fleet', 'orbit')) === true && (await j(`${SC}.camp.stance`)) === 'orbit' && (await isOpen()) === '');
    await goTo('fleet', 'orbit');
    check('opened again with the highlight on that row, the row is marked as the one in force', (await j(`${HI}.name.text`)) === 'Stance: orbit the target' && (await j(`${HI}.suffix.text`)) === 'in force', await j(`${HI}.name.text + ' | ' + ${HI}.suffix.text`));
    await snap(t, 'stances');
    check('Q, Down to "Stance: match my speed", Enter: Match speed, and Keep distance was never ordered on the way', (await order('fleet', 'match')) === true && (await j(`${SC}.camp.stance`)) === 'match');
    // P: the one list of ship orders; only one list is open at a time
    await press(t, 'KeyQ', 20); await press(t, 'KeyP', 20); await t.run(300);
    const shipLabels = await j(`campPanelRows(${SC}.camp, 'ship').map(r => r.label)`);
    check('P with the fleet list open closes it and opens the ship list: one list at a time', (await isOpen()) === 'ship' && (await j(`${P}.at`)) === 0 && (await j(`${PL}.title.text`)) === 'P   SHIP ORDERS');
    check('its rows are the ship orders of this mission, and they fit', JSON.stringify(await shownRows()) === JSON.stringify(shipLabels.slice(0, show)) && (await fits()) === true, JSON.stringify(await shownRows()));
    await snap(t, 'ship-list');
    await press(t, 'KeyP', 20); await t.run(200);
    check('P again closes it', (await isOpen()) === '' && (await j(`${PL}.title.visible`)) === false);
    await press(t, 'KeyX', 20); await t.run(100); // no target: "Fly to the target" cannot be done
    if ((await j(`(campPanelRows(${SC}.camp, 'ship').find(r => r.id === 'target') || { ok: true }).ok`)) === false) {
      const why = await j(`campPanelRows(${SC}.camp, 'ship').find(r => r.id === 'target').state`);
      check('an order that is refused leaves the list open and says why at its foot ("Fly to the target" with no target)', (await order('ship', 'target')) === true && (await isOpen()) === 'ship' && (await j(`${PL}.more.text`)).toLowerCase() === String(why).toLowerCase() && !(await j(`${SC}.camp.nav`)), await j(`${PL}.more.text`));
      await press(t, 'Escape', 20); await t.run(200);
    } else console.log('  note the refused-order check was skipped: a target was picked by the game');
    // a hostile put in reach: D picks it with no list open, the bracket is drawn, the target's line names it
    const spawned = await j(`(() => { const C = ${SC}.camp, c = C.carrier, u = campSpawn(C, 'raider', c.x + 500, c.y - 200); return !!u; })()`).catch(() => false);
    if (spawned) {
      await press(t, 'KeyD', 20); await t.run(300);
      check('D picks the hostile as the target with no list open, and the line under the radar names it', !!(await j(`${SC}.camp.tgt`)) && (await isOpen()) === '' && /^TARGET {2}.+ {2}\d+ km$/.test(await j(`${PL}.tgt.text`)), await j(`${PL}.tgt.text`));
      await snap(t, 'target');
      await press(t, 'KeyX', 20); await t.run(300);
      check('X clears it, and the line says none', (await j(`${SC}.camp.tgt`)) === '' && (await j(`${PL}.tgt.text`)) === 'TARGET  none');
    }
    // a pilot's call: a small list in the middle, answered with Up, Down and Enter (the digits answer nothing)
    await t.ev(`(() => { campCallStart(${SC}.camp, 'cruiser', {}); return 1; })()`); await t.run(500);
    const UI = `${SC}.callUi`, def = await j(`campCallView(${SC}.camp).def`);
    check('a pilot\'s call is its own plate in the middle: PILOT CALL, the pilot\'s line and three rows that fit, and no Q or P list opens for it', (await j(`${UI}.on && ${UI}.head.text === 'PILOT CALL' && ${UI}.rows.filter(r => r.visible).length === 3 && ${UI}.rows.every(r => CAMPCALL_UI.pad + 4 + r.width <= CAMPCALL_UI.w - CAMPCALL_UI.pad)`)) === true && (await isOpen()) === '');
    check('its highlight starts on the pilot\'s own pick (the row marked "no answer"), and the call has the arrows and Enter', (await j(`campCallSel(${SC})`)) === def - 1 && (await j(`campCallHasKeys(${SC})`)) === true && (await j(`${UI}.hi.visible`)) === true);
    await snap(t, 'call');
    await press(t, 'Digit1', 20); await press(t, 'Digit2', 20); await press(t, 'Digit3', 20); await t.run(300);
    check('1 2 3 answer nothing: the call still waits', (await j(`campCallOpen(${SC}.camp)`)) === true);
    await press(t, 'KeyQ', 20); await t.run(300);
    check('with a list open the call waits, dimmed, and says to close the list: the list has the keys', (await isOpen()) === 'fleet' && (await j(`campCallHasKeys(${SC})`)) === false && (await j(`${UI}.foot.text`)) === 'Close the list or the map to answer' && (await j(`${UI}.hi.visible`)) === false);
    await press(t, 'Escape', 20); await t.run(200);
    const missiles0 = await j(`${SC}.camp.missiles`);
    await press(t, 'ArrowDown', 20); await t.run(200);
    check('Down moves the call\'s highlight to the next answer (round at the end)', (await isOpen()) === '' && (await j(`campCallSel(${SC})`)) === def % 3 && (await j(`campCallOpen(${SC}.camp)`)) === true);
    await press(t, 'Enter', 20); await t.run(300);
    check('Enter answers the call with the highlighted row, fires no missile, and the plate is gone', (await j(`${SC}.camp.call.open`)) === null && (await j(`${SC}.camp.call.log[${SC}.camp.call.log.length - 1].way`)) === 'key' && (await j(`${SC}.camp.missiles`)) >= missiles0 && (await j(`${UI}.on`)) === false);
    // the strip: the slash opens it (the chat key is stubbed: the strip needs one), the keys typed in it are not the game's, Esc closes it and does not pause; the period is the voice key of the scene
    await t.ev(`(() => { shipcompAvailable = () => true; return 1; })()`);
    await press(t, 'Slash', 40); await t.run(300);
    check('/ opens the command strip: its input has the focus', (await j(`document.activeElement && document.activeElement.tagName`)) === 'INPUT');
    await press(t, 'KeyD', 40); await press(t, 'KeyQ', 40); await t.run(100);
    check('the keys typed in the strip are the strip\'s, not the game\'s: D picks no target and Q opens no list', (await j(`${SC}.camp.tgt`)) === '' && (await isOpen()) === '');
    await press(t, 'Escape', 40); await t.run(300);
    check('Esc closes the strip and does not pause the battle', (await j(`document.activeElement && document.activeElement.tagName`)) !== 'INPUT' && (await j(`${SC}.mode`)) === 'play');
    check('the voice key of the Campaign is the period: the listener follows the scene', (await j(`(() => { listenKeysSync(game); return [LISTEN.code, LISTEN.cap].join(); })()`)) === 'Period,.');
    await press(t, 'KeyQ', 20); await t.run(200); await press(t, 'KeyH'); await t.run(200);
    check('H opens the page of every key, the battle waits, and the open list is closed', (await j(`${SC}.ck && ${SC}.ck.open`)) === true && (await j(`${SC}.mode`)) === 'pause' && (await isOpen()) === '');
    await snap(t, 'page');
    await press(t, 'KeyH'); await t.run(100);
    check('H again closes it and the battle goes on, with no list on the screen', (await j(`${SC}.ck`)) === null && (await j(`${SC}.mode`)) === 'play' && (await j(`${PL}.title.visible`)) === false);
    check('the bottom key line names the two lists\' keys, the arrows, Space, Enter, Tab and H', /^Q Fleet orders {3}P Ship orders {3}Arrows fly {3}Space turrets {3}Enter missile {3}Tab Map {3}H Keys$/.test(await j(`${SC}.hud.keys.text`)), await j(`${SC}.hud.keys.text`));
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
console.log(bad ? `\nCAMPAIGN TWO LISTS BOOT FAIL (${bad})` : '\nCAMPAIGN TWO LISTS BOOT PASS');
process.exit(bad ? 1 : 0);
