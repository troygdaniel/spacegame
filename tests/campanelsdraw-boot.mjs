// not in the smoke: a boot of the Campaign's order lists (the fleet list Q at the left with its part W, the ship list P at the right with its parts O I U; a part's key opens it directly; nothing is drawn until one is opened) with a real keyboard, run by hand (one Chrome, muted, through the test lock; cards one-list-keys and list-shortcuts). The game switches these lists off (Q: card space-game-q-selects-all; P and its parts: space-game-p-opens-power, keys2-select; W and the rest: keys-orders, keys2-cruiser; the S cruiser list is the game's own now) and the walk switches the old ones on in the page, as the node suites do; the stance lists, the squads' own lists and the Escorts row are gone (cards space-game-fighter-squads, squad-tint, bracket-select-orders). Keys of the key rounds that this walk meets: Q W pick WHO and O P the friendlies (the old lists shadow them while they are on), [ ] and the backslash the enemy, A D are free, E the one order, S the view back on the cruiser, X clears; the pilots start OUT beside the cruiser, so Launch is a greyed row
// The rules are tests/campanels.mjs, tests/campanelsdraw.mjs, tests/campanelsui.mjs, tests/camptarget.mjs and tests/camppanelkeys.mjs (plain Node). This boots the Campaign once and the title once and does what Troy does: no list on the screen at the
// first frame (nothing; the target is the target display's now), Q and the highlight, the key caps on the rows that open a part, W and Enter launch the wing, P the ship list, W straight to the all-squads list, Left back to the fleet list, O and a pip of power
// (the list stays open), a refused order leaves the list open, ] X the hostile target (a hostile is put in reach: the first
// minute of 1.1 has none), the strip, H and the page of every key, and H on the title. The list a row is in is read from campKeyVia in the page and its place there from campPanelList, never a letter or a number written here; the words are read from the game (uiText, the key table).
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
const VK = { Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit7: 55, Digit8: 56, Digit9: 57, KeyH: 72, KeyA: 65, KeyD: 68, KeyS: 83, KeyX: 88, KeyQ: 81, KeyP: 80, KeyE: 69, KeyR: 82, KeyW: 87, KeyU: 85, KeyI: 73, KeyO: 79, KeyF: 70, KeyG: 71, KeyT: 84, KeyY: 89, KeyJ: 74, BracketRight: 221, BracketLeft: 219, Escape: 27, Enter: 13, Tab: 9, ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Slash: 191, Period: 190 };
const press = async (t, code, wait = 40) => { // a real key: down, a few frames, up (the game clock is stepped, so "fast" is in game milliseconds)
  const key = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Slash' ? '/' : code === 'Period' ? '.' : code === 'BracketRight' ? ']' : code === 'BracketLeft' ? '[' : code, k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key };
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait);
};
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'hands-' + name + '.png'), Buffer.from(r.data, 'base64')); } }; // twice: the first capture of a Phaser frame can be the one before it

async function campaign() {
  console.log('the Campaign');
  const t = await launch('?campaign=1', ROOT);
  try {
    const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  await t.ev(`(() => { campFleetListSet(true); campShipListSet(true); campPowerSet(true); ${SC}.hud.keys.setText(campKeyLine()); return 1; })()`); // these walks are about the order lists: Q and P open them, which the game switches off (CAMP_FLEET_LIST, CAMP_SHIP_LIST: cards space-game-q-selects-all and space-game-p-opens-power; the squads list, the autopilot, power and dock keys went with the key rounds); on here, as the node suites do (with them on, P and O open the ship and power lists before they pick friendlies, Q and W open the fleet and all-squads lists before they pick who, and S has no list: it only puts the view on the cruiser; the power is switched on too, campPowerSet, card space-game-power-removed: the power list is off without it, and this walk gives a pip of power from it)
    for (let i = 0; i < 8 && (await j(`${SC}.mode`)) !== 'play'; i++) { await press(t, 'Enter'); await t.run(300); } // the story card, then the briefing: Enter until the battle is on
    check('the battle is on', (await j(`${SC}.mode`)) === 'play');
    await t.run(400);
    const P = `${SC}.pn`, PL = `${SC}.pnl`, HI = `${PL}.rows[${P}.at - ${P}.top]`; // the list's state, its objects, and the objects of the highlighted row (src/campanelsdraw.js)
    const isOpen = () => j(`campPanelOpen(${P})`);
    const listCode = id => j(`CAMP_PANELS.panels.find(p => p.id === ${JSON.stringify(id)}).code`);
    const listAt = (id, row) => j(`campPanelList(${SC}.camp, ${JSON.stringify(id)}).findIndex(r => r.id === ${JSON.stringify(row)})`);
    // the way to a row (card list-shortcuts): the list it is in (campKeyVia) is opened by its own key; a list with no key (the convoy) through its parent: the parent's key, Down to the part's row, Enter. Then Down to the row.
    // keys: [[the key to press, how many Downs after it], ...]; null when the row is not in this mission's list
    const wayTo = row => j(`(() => { const C = ${SC}.camp, id = ${JSON.stringify(row)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
      if (p.code) return { list: p.id, keys: [[p.code, at]] };
      const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? { list: p.id, keys: [[up.code, pat], ['Enter', at]] } : null; })()`);
    const goTo = async row => { // the list open with the highlight on the row (not given): every place is read from the lists of THIS mission
      const way = await wayTo(row); if (!way) return false;
      for (let n = 0; n < 6 && (await isOpen()); n++) await press(t, 'Escape', 20); // Esc goes back ONE step (a target sub-list to its list, a list a row opened to Q or P; a list its own key opened closes): pressed until every list is closed (it pauses only when none is open)
      for (const [code, downs] of way.keys) { await press(t, code, 20); const cur = await j(`${P}.at`), n = await j(`campPanelList(${SC}.camp, ${P}.open).length`); for (let i = 0, d = ((downs - cur) % n + n) % n; i < d; i++) await press(t, 'ArrowDown', 20); } // (All squads opens on its first row that can be given, so the Downs count from where the highlight is)
      await t.run(300); return (await isOpen()) === way.list;
    };
    const order = async row => { if (!(await goTo(row))) return false; await press(t, 'Enter', 20); await t.run(300); if (await j(`!!${P}.pick`)) { await press(t, 'Enter', 20); await t.run(300); } return true; }; // a row that needs a target with several to choose from opens a target sub-list (src/camppick.js): Enter takes the highlighted one
    const firstGiven = () => j(`campPanelRows(${SC}.camp, 'squads').findIndex(r => r.ok)`); // where All squads opens (start: 'usable'): its first row that can be given now: Attack the target with a hostile to attack, Guard the cruiser with none (Attack is grey)
    const shownRows = () => j(`${PL}.rows.filter(r => r.name.visible).map(r => r.name.text)`);
    const drawnAs = id => j(`campPanelRows(${SC}.camp, ${JSON.stringify(id)}).map(r => r.label + (r.more ? '  >' : ''))`); // a row as it is drawn: its words, and an arrow when it opens a part
    const shownCaps = () => j(`${PL}.rows.filter(r => r.name.visible).map(r => r.cap.visible ? r.cap.text : '')`);
    const rowLabel = row => j(`campKeyRow(${JSON.stringify(row)}).label`);
    const launchedNow = () => j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`); // the pilots start out beside the cruiser (card space-game-keys-orders): three are launched before the first key, so a check compares with this, never with zero
    let wing0 = 0;
    const foot = (text, k) => j(`uiText(${JSON.stringify(text)}, { key: ${JSON.stringify(k)} })`); // the foot's key line as the game says it
    const fits = () => j(`(() => { const K = CAMPPANELS_LOOK, rows = ${PL}.rows.filter(r => r.name.visible), cap = rows.some(r => r.cap.visible) ? K.cap.w + K.cap.gap : 0; return rows.every(r => 14 + cap + r.name.width + 8 + r.suffix.width + 12 <= K.box.w); })()`);
    check('nothing is drawn until a list\'s key is pressed: no list is open, no heading and no row is on the screen', (await isOpen()) === '' && (await j(`!${PL}.title.visible && ${PL}.rows.every(r => !r.name.visible && !r.suffix.visible && !r.cap.visible) && !${PL}.keys.visible`)) === true);
    check('with no list open and nothing picked the right corners show no picture (HOSTILES and FRIENDLIES are titles only: the radar and the target\'s line are gone)', (await j(`(!${SC}.hud.tcorner || (!${SC}.hud.tcorner.hostiles.pic.visible && !${SC}.hud.tcorner.friendlies.pic.visible))`)) === true);
    await snap(t, 'start');
    // flight: the arrows turn and thrust the cruiser; A, W and the other letters do not (A is no key now, W is the all-squads list's key here), and a digit is no key at all
    const rot0 = await j(`${SC}.camp.carrier.rot`); wing0 = await launchedNow();
    await press(t, 'KeyA', 400); await press(t, 'KeyW', 400);
    const wOpen = await isOpen(), wTitle = await j(`${PL}.title.visible && ${PL}.title.text`);
    await press(t, 'KeyW', 400); const wShut = await isOpen();
    await press(t, 'KeyD', 400); await press(t, 'KeyS', 400);
    check('W A S D do not fly the cruiser: no turn, no thrust (A and D are free keys now, and S resets the view: none of them moves the ship)', Math.abs((await j(`${SC}.camp.carrier.rot`)) - rot0) < 1e-6 && (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) < 1);
    check('W is the all-squads list\'s key: it opens that list directly (headed W   ALL SQUADS), and W again closes it', wOpen === 'squads' && wTitle === (await j(`(() => { const p = campKeyList('squads'); return p.key + '   ' + p.title; })()`)) && wTitle === 'W   ALL SQUADS' && wShut === '', wOpen + ' | ' + wTitle + ' | ' + wShut);
    await press(t, 'Digit1', 20); await press(t, 'Digit2', 20); await press(t, 'KeyG', 20); await press(t, 'KeyZ', 20); await press(t, 'KeyY', 20); await press(t, 'KeyV', 20); await t.run(300);
    check('a digit or a letter that is no key of the table (1 2 G Z Y V) does nothing in flight: nothing launched (the pilots were out already), no list opened', (await launchedNow()) === wing0 && (await isOpen()) === '');
    await press(t, 'ArrowRight', 500);
    check('the Right arrow turns the cruiser', (await j(`${SC}.camp.carrier.rot`)) - rot0 > 0.05);
    await press(t, 'ArrowUp', 500);
    check('the Up arrow thrusts it', (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) > 1);
    // Q: the fleet list, at its first row: the whole wing's orders and a row for each of its parts
    await press(t, 'KeyQ', 20); await t.run(300);
    const fleetLabels = await drawnAs('fleet'), show = await j('CAMP_PANELS.show'), fleetRows = await j(`campPanelRows(${SC}.camp, 'fleet').map(r => ({ id: r.id, key: r.key, more: r.more }))`);
    check('Q opens the list of fleet orders at its first row, headed with its key', (await isOpen()) === 'fleet' && (await j(`${P}.at`)) === 0 && (await j(`${P}.top`)) === 0 && (await j(`${PL}.title.visible && ${PL}.title.text`)) === 'Q   FLEET ORDERS' && (await j(`${PL}.count.text`)) === '1 / ' + fleetLabels.length);
    check('its rows are the fleet rows of this mission in the table\'s order: two in level 1 (All squads and Convoy: the parts of the wing and nothing else), the first is All squads, and every row opens a part so ends in an arrow', JSON.stringify(await shownRows()) === JSON.stringify(fleetLabels.slice(0, show)) && /^gsquads(,gconvoy)?$/.test(fleetRows.map(r => r.id).join()) && fleetLabels[0] === (await rowLabel('gsquads')) + '  >' && fleetRows.every((r, i) => r.more === /  >$/.test(fleetLabels[i])), JSON.stringify(await shownRows()));
    const caps = await shownCaps(), capOf = id => caps[fleetRows.findIndex(r => r.id === id)];
    check('the All squads row shows the key that opens that part in a cap (W); the Convoy row, a part with no key, has none', JSON.stringify(caps) === JSON.stringify(fleetRows.slice(0, show).map(r => r.key)) && capOf('gsquads') === 'W' && (capOf('gconvoy') === undefined || capOf('gconvoy') === '') && caps.filter(c => c).length === 1, JSON.stringify(caps));
    check('no row has a key of its own to give its order: a row is its words, its state and (a part\'s row) the cap of the part\'s key', (await j(`${PL}.rows.every(r => Object.keys(r).join() === 'cap,name,suffix')`)) === true && (await j(`CAMP_PANELS.panels.every(p => p.rows.every(r => !('k' in r) && !('code' in r)))`)) === true);
    check('the rows fit the list as the browser draws them (the cap, the words and the state side by side with room to spare)', (await fits()) === true);
    check('the foot names a top list\'s keys (camp.ui.listkeys)', (await j(`${PL}.keys.text`)) === (await foot('camp.ui.listkeys', 'Q')) && /Enter/.test(await j(`${PL}.keys.text`)) && !/\{/.test(await j(`${PL}.keys.text`)), await j(`${PL}.keys.text`));
    await snap(t, 'fleet-list');
    const rot1 = await j(`${SC}.camp.carrier.rot`);
    await press(t, 'ArrowRight', 500);
    check('while a list is open the ship coasts: the Right arrow does not turn it', Math.abs((await j(`${SC}.camp.carrier.rot`)) - rot1) < 1e-6);
    await press(t, 'ArrowLeft', 20); await t.run(200); // (Right on the All squads row opened that part; Left goes back to Q, on the same row)
    await press(t, 'ArrowDown', 20); await t.run(200);
    check('Down moves the highlight to the second row (round to the first when the list has one)', (await j(`${P}.at`)) === 1 % fleetLabels.length && (await j(`${PL}.count.text`)) === ((1 % fleetLabels.length) + 1) + ' / ' + fleetLabels.length);
    await press(t, 'ArrowUp', 20); await press(t, 'ArrowUp', 20); await t.run(200);
    check('Up from the first row goes round to the last, and the list scrolls to keep it on the screen', (await j(`${P}.at`)) === fleetLabels.length - 1 && (await j(`${P}.top`)) === Math.max(0, fleetLabels.length - show) && (await j(`${HI}.name.text`)) === fleetLabels[fleetLabels.length - 1]);
    await press(t, 'Escape', 20); await t.run(200);
    check('Esc closes the list and does not pause the battle', (await isOpen()) === '' && (await j(`${SC}.mode`)) === 'play' && (await j(`${PL}.title.visible`)) === false);
    // the pilots start out beside the cruiser (card space-game-keys-orders), so the top row of the all-squads list is greyed from the first second: Enter on it is refused, launches nothing and leaves the list open (the row itself stays for a bay that has ships)
    const launchRow = await j(`campPanelRows(${SC}.camp, 'squads').find(r => r.id === 'launch')`), launched1 = await launchedNow();
    check('W, Enter on "Launch the wing" (the top of the all-squads list) with the wing already out: the row is grey, Enter refuses, nothing launches and the list stays open', (await wayTo('launch')).list === 'squads' && !!launchRow && launchRow.ok === false && (await goTo('launch')) === true && (await press(t, 'Enter', 20), await t.run(300), await launchedNow()) === launched1 && (await isOpen()) === 'squads', JSON.stringify(launchRow));
    await press(t, 'Escape', 20); await t.run(200);
    // P: the ship list; only one list is open at a time
    await press(t, 'KeyQ', 20); await press(t, 'KeyP', 20); await t.run(300);
    const shipLabels = await drawnAs('ship');
    check('P with the fleet list open closes it and opens the ship list: one list at a time', (await isOpen()) === 'ship' && (await j(`${P}.at`)) === 0 && (await j(`${PL}.title.text`)) === 'P   SHIP ORDERS');
    check('its rows are the ship rows of this mission (Power, Autopilot, Dock and repair, each with its key O I U in a cap), and they fit', JSON.stringify(await shownRows()) === JSON.stringify(shipLabels.slice(0, show)) && (await shownCaps()).slice(0, 3).join() === (await j(`['power', 'nav', 'yard'].map(id => campKeyList(id).key).join()`)) && (await shownCaps()).slice(0, 3).join() === 'O,I,U' && (await fits()) === true, JSON.stringify(await shownRows()) + ' ' + JSON.stringify(await shownCaps()));
    await snap(t, 'ship-list');
    await press(t, 'KeyP', 20); await t.run(200);
    check('P again closes it', (await isOpen()) === '' && (await j(`${PL}.title.visible`)) === false);
    // the shortcut keys (card list-shortcuts): a part's key opens its list directly, from no list and from any other; Left goes back to the list it is a part of, onto that part's row; Enter on that row opens it again
    const launched0 = await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`), fAt = await listAt('fleet', 'gsquads'), fighterLabels = await drawnAs('squads');
    await press(t, 'KeyW', 20); await t.run(300);
    check('W with no list open opens the all-squads list directly, at its first row that can be given (Launch is greyed, the wing is out: Attack the target), headed with its key', (await isOpen()) === 'squads' && (await j(`${P}.at`)) === (await firstGiven()) && (await j(`${PL}.title.text`)) === 'W   ALL SQUADS' && JSON.stringify(await shownRows()) === JSON.stringify(fighterLabels) && (await j(`${PL}.count.text`)) === ((await firstGiven()) + 1) + ' / ' + fighterLabels.length, (await isOpen()) + ' | ' + (await j(`${PL}.title.text`)) + ' | ' + JSON.stringify(await shownRows()));
    check('a part\'s list has no caps, and its foot is camp.ui.listkeysub (it names Left, the way back)', (await shownCaps()).every(c => c === '') && (await j(`${PL}.keys.text`)) === (await foot('camp.ui.listkeysub', 'W')) && (await j(`${PL}.keys.text`)) !== (await foot('camp.ui.listkeys', 'W')) && (await fits()) === true, await j(`${PL}.keys.text`));
    await snap(t, 'fighters-list');
    await press(t, 'ArrowLeft', 20); await t.run(300);
    check('Left goes back to the fleet list with the highlight on the All squads row, and gives no order', fAt >= 0 && (await isOpen()) === 'fleet' && (await j(`${P}.at`)) === fAt && (await j(`${HI}.name.text`)) === (await rowLabel('gsquads')) + '  >' && (await j(`${HI}.cap.text`)) === 'W' && (await j(`${PL}.title.text`)) === 'Q   FLEET ORDERS', (await isOpen()) + ' at ' + (await j(`${P}.at`)));
    await press(t, 'ArrowLeft', 20); await t.run(200);
    check('Left in a top list does nothing: the fleet list stays, the highlight where it was', (await isOpen()) === 'fleet' && (await j(`${P}.at`)) === fAt);
    await press(t, 'Enter', 20); await t.run(300);
    check('Enter on the All squads row opens the all-squads list again, on Attack the target (its first row that can be given, the wing being out): no order is given and no missile fired', (await isOpen()) === 'squads' && (await j(`${P}.at`)) === (await firstGiven()) && (await j(`${PL}.title.text`)) === 'W   ALL SQUADS' && (await j(`${SC}.camp.launchQ.length + ${SC}.camp.launched`)) === launched0);
    await press(t, 'Escape', 20); await t.run(200);
    check('Esc in the all-squads list, which a row of Q opened, goes back to the fleet list (the highlight on the All squads row), not out of the lists and not to the ship; the battle is not paused', (await isOpen()) === 'fleet' && (await j(`${P}.at`)) === fAt && (await j(`${PL}.title.text`)) === 'Q   FLEET ORDERS' && (await j(`${SC}.mode`)) === 'play', (await isOpen()) + ' at ' + (await j(`${P}.at`)));
    await press(t, 'Enter', 20); await t.run(300);
    await press(t, 'ArrowLeft', 20); await press(t, 'ArrowRight', 20); await t.run(300);
    check('Left, then Right on the All squads row: Right opens the part too, on the same row', (await isOpen()) === 'squads' && (await j(`${P}.at`)) === (await firstGiven()));
    await press(t, 'KeyP', 20); await press(t, 'KeyW', 20); await t.run(300);
    check('W from another list (the ship list, at the other side) closes it and opens the all-squads list: one list at a time', (await isOpen()) === 'squads' && (await j(`${P}.at`)) === (await firstGiven()) && (await j(`${PL}.title.text`)) === 'W   ALL SQUADS');
    await press(t, 'Escape', 20); await t.run(200);
    check('Esc in a list its own key opened (W) closes it: that is the end, it does not drop into Q or P, and the battle is not paused', (await isOpen()) === '' && (await j(`${PL}.title.visible`)) === false && (await j(`${SC}.mode`)) === 'play');
    await press(t, 'KeyQ', 20); await press(t, 'ArrowDown', 20); await press(t, 'KeyW', 20); await t.run(300);
    check('W from the fleet list opens the all-squads list on its first row that can be given (wherever the highlight was), and W again closes everything', (await isOpen()) === 'squads' && (await j(`${P}.at`)) === (await firstGiven()) && (await press(t, 'KeyW', 20), await t.run(200), await isOpen()) === '' && (await j(`${PL}.title.visible`)) === false);
    // Attack the target acts on the hostile that is PICKED ([ ] S; card space-game-w-uses-selection: no sub-list any more): with hostiles about and none picked the row is grey and Enter on it refuses; ] picks the nearest one and the row names it; Enter gives the order at it
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; campSpawn(C, 'raider', c.x + 520, c.y - 200); campSpawn(C, 'raider', c.x + 900, c.y + 330); return 1; })()`); await press(t, 'KeyX', 20); await t.run(300);
    check('no target is picked, and no target picture is shown', (await j(`${SC}.camp.tgt`)) === '' && (await isOpen()) === '' && (await j(`(!${SC}.hud.tcorner || (!${SC}.hud.tcorner.hostiles.pic.visible && !${SC}.hud.tcorner.friendlies.pic.visible))`)) === true);
    const attackRow = () => j(`campPanelRows(${SC}.camp, 'squads').find(r => r.id === 'attack')`);
    if ((await goTo('attack')) === true) {
      const a0 = await attackRow(), o0 = await j(`${SC}.camp.orders.attack | 0`);
      await press(t, 'Enter', 20); await t.run(400);
      check('Enter on the grey Attack row (hostiles about, none picked) refuses: no sub-list, no order, the target is still none, the list stays open', !!a0 && a0.ok === false && a0.label === 'Attack the target' && (await j(`${P}.pick`)) === null && (await j(`${SC}.camp.tgt`)) === '' && (await j(`${SC}.camp.orders.attack | 0`)) === o0 && (await isOpen()) === 'squads', JSON.stringify(a0));
      await snap(t, 'pick-list');
      await press(t, 'KeyW', 20); await t.run(200); await press(t, 'BracketRight', 20); await t.run(400); const near = await j(`${SC}.camp.tgt`);
      await press(t, 'KeyW', 20); await t.run(300);
      const a1 = await attackRow();
      check('] picks the nearest hostile (the flight view reveals it) and W opens on Attack, the row naming it: "Attack <name>"', near !== '' && !!a1 && a1.ok === true && a1.label === 'Attack ' + (await j(`campTgtName(${SC}.camp)`)) && (await isOpen()) === 'squads' && (await j(`campPanelList(${SC}.camp, 'squads')[${P}.at].id`)) === 'attack', a1 && a1.label);
      await snap(t, 'pick-list-second');
      await press(t, 'Escape', 20); await t.run(300);
      check('Esc closes the list (the one W opened) and gives no order: the picked hostile is still the target', (await isOpen()) === '' && (await j(`${SC}.camp.tgt`)) === near && (await j(`${SC}.camp.orders.attack | 0`)) === o0 && (await j(`${SC}.mode`)) === 'play');
      await press(t, 'KeyW', 20); await t.run(300); await press(t, 'Enter', 20); await t.run(400);
      check('W, Enter on "Attack <name>" gives the order at it at once: it stays the target, and the lists are closed', (await j(`${SC}.camp.tgt`)) === near && (await isOpen()) === '' && (await j(`${P}.pick`)) === null && (await j(`${SC}.camp.orders.attack | 0`)) > o0, await j(`${SC}.camp.tgt`));
      await press(t, 'KeyX', 20); await t.run(200);
    } else console.log('  note the Attack row check was skipped: the Attack row is not in this mission\'s list');
    // O: the power list (campPowerSet(true) above); a power row leaves the list open (a pip more, and more)
    const pw0 = await j(`${SC}.camp.power.p`), sAt = await listAt('power', 'shields');
    await press(t, 'KeyO', 20); for (let i = 0; i < sAt; i++) await press(t, 'ArrowDown', 20); await t.run(300);
    check('O opens the power list directly, at the right, headed with its key, the highlight on "Shields: one more pip"', (await isOpen()) === 'power' && (await j(`${PL}.title.text`)) === 'O   POWER' && (await j(`${HI}.name.text`)) === (await rowLabel('shields')) && JSON.stringify(await shownRows()) === JSON.stringify(await drawnAs('power')) && (await j(`${PL}.keys.text`)) === (await foot('camp.ui.listkeysub', 'O')) && (await fits()) === true, (await j(`${PL}.title.text`)) + ' | ' + JSON.stringify(await shownRows()));
    await snap(t, 'power-list');
    await press(t, 'Enter', 20); await t.run(300);
    const pw1 = await j(`${SC}.camp.power.p`);
    check('O, Enter: the shields get one more pip (' + JSON.stringify(pw0) + ' to ' + JSON.stringify(pw1) + ') and the list stays open on that row, to give it again', pw1[1] === pw0[1] + 1 && pw1[0] + pw1[1] + pw1[2] === pw0[0] + pw0[1] + pw0[2] && (await isOpen()) === 'power' && (await j(`${P}.at`)) === sAt && (await j(`${HI}.name.text`)) === (await rowLabel('shields')));
    const bAt = await listAt('power', 'balance'); for (let i = sAt; i < bAt; i++) await press(t, 'ArrowDown', 20); await press(t, 'Enter', 20); await t.run(300);
    check('Down to "Balance the power", Enter: the pips are as they were and the list is still open; Esc closes it', JSON.stringify(await j(`${SC}.camp.power.p`)) === JSON.stringify(pw0) && (await isOpen()) === 'power' && (await press(t, 'Escape', 20), await t.run(200), await isOpen()) === '' && (await j(`${SC}.mode`)) === 'play', JSON.stringify(await j(`${SC}.camp.power.p`)));
    await press(t, 'KeyX', 20); await t.run(100); // no target: "Fly to the target" cannot be done
    if ((await j(`(campPanelRows(${SC}.camp, 'nav').find(r => r.id === 'target') || { ok: true }).ok`)) === false) {
      const why = await j(`campPanelRows(${SC}.camp, 'nav').find(r => r.id === 'target').state`);
      check('an order that is refused leaves the list open and says why at its foot (I, Down to "Fly to the target", Enter with no target)', (await order('target')) === true && (await isOpen()) === 'nav' && (await j(`${PL}.more.text`)).toLowerCase() === String(why).toLowerCase() && !(await j(`${SC}.camp.nav`)), await j(`${PL}.more.text`));
      await press(t, 'Escape', 20); await t.run(200);
    } else console.log('  note the refused-order check was skipped: a target was picked by the game');
    // a hostile put in reach: ] picks it with no list open (Q W step WHO, O and P the friendlies: with the old lists on they open lists), the bracket is drawn, the target's line names it
    const spawned = await j(`(() => { const C = ${SC}.camp, c = C.carrier, u = campSpawn(C, 'raider', c.x + 500, c.y - 200); return !!u; })()`).catch(() => false);
    if (spawned) {
      await press(t, 'BracketRight', 20); await t.run(300);
      check('] picks the hostile as the target with no list open, and ] HOSTILES at the top right shows it: its name beside the title, its picture in the details', !!(await j(`${SC}.camp.tgt`)) && (await isOpen()) === '' && (await j(`${SC}.hud.corner.hostiles.sel.visible`)) === true && (await j(`${SC}.hud.tcorner.hostiles.pic.visible`)) === true, await j(`${SC}.hud.corner.hostiles.sel.text`));
      await snap(t, 'target');
      await press(t, 'KeyX', 20); await t.run(300);
      check('X clears it, and the picture is gone (the title stays)', (await j(`${SC}.camp.tgt`)) === '' && (await j(`${SC}.hud.tcorner.hostiles.pic.visible`)) === false);
    }
    // the strip: the slash opens it (the chat key is stubbed: the strip needs one), the keys typed in it are not the game's, Esc closes it and does not pause; hold to speak has no key (CAMP_VOICE is off)
    await t.ev(`(() => { shipcompAvailable = () => true; return 1; })()`);
    await press(t, 'Slash', 40); await t.run(300);
    check('/ opens the command strip: its input has the focus', (await j(`document.activeElement && document.activeElement.tagName`)) === 'INPUT');
    await press(t, 'KeyW', 40); await press(t, 'KeyQ', 40); await t.run(100);
    check('the keys typed in the strip are the strip\'s, not the game\'s: W picks no pilot and opens no list, no target is picked, and Q opens no list', (await j(`${SC}.camp.tgt`)) === '' && (await j(`${SC}.camp.sel`)) === 'all' && (await isOpen()) === '');
    await press(t, 'Escape', 40); await t.run(300);
    check('Esc closes the strip and does not pause the battle', (await j(`document.activeElement && document.activeElement.tagName`)) !== 'INPUT' && (await j(`${SC}.mode`)) === 'play');
    check('hold to speak is off in the Campaign (CAMP_VOICE, card space-game-keys-select): the listener has no key there and follows the scene', (await j(`(() => { listenKeysSync(game); return [LISTEN.code === undefined, LISTEN.cap].join(); })()`)) === 'true,');
    await press(t, 'KeyQ', 20); await t.run(200); await press(t, 'KeyH'); await t.run(200);
    check('H opens the page of every key, the battle waits, and the open list is closed', (await j(`${SC}.ck && ${SC}.ck.open`)) === true && (await j(`${SC}.mode`)) === 'pause' && (await isOpen()) === '');
    await snap(t, 'page');
    await press(t, 'KeyH'); await t.run(100);
    check('H again closes it and the battle goes on, with no list on the screen', (await j(`${SC}.ck`)) === null && (await j(`${SC}.mode`)) === 'play' && (await j(`${PL}.title.visible`)) === false);
    check('the bottom key line names every list\'s key (Q W, P O I U: the rest are gone), then the arrows, Space, Enter, Tab and H', (await j(`${SC}.hud.keys.text`)) === (await j(`campKeyLine()`)) && (await j(`${SC}.hud.keys.text`)).startsWith(await j(`campPanelKeyLine()`)) && (await j(`CAMP_PANELS.panels.filter(p => p.key).every(p => ${SC}.hud.keys.text.indexOf(p.key + ' ' + p.tab) >= 0)`)) === true && (await j(`CAMP_PANELS.panels.filter(p => p.key).map(p => p.key).join('')`)) === 'QWPOIU' && (await j(`['fly', 'fire', 'missile', 'map', 'help'].every(k => ${SC}.hud.keys.text.indexOf(CAMP_KEYS[k].k) >= 0)`)) === true && !/\{/.test(await j(`${SC}.hud.keys.text`)), await j(`${SC}.hud.keys.text`));
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
console.log(bad ? `\nCAMPAIGN ORDER LISTS BOOT FAIL (${bad})` : '\nCAMPAIGN ORDER LISTS BOOT PASS');
process.exit(bad ? 1 : 0);
