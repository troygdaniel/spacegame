// not in the smoke: a boot of the target pick, run by hand (one Chrome, muted, through the test lock; card space-game-order-target-pick)
// The rules are tests/camppick.mjs (plain Node). This boots the real game once, in mission 1.1 with the wing out (three pilots), and plays the keys as a player does: three hostiles are put in the battle, W opens the all-squads list
// (not on Attack: it is grey while no hostile is picked, and Enter on it refuses), ] picks the nearest hostile and W opens on Attack, named after it; Enter sends all three pilots at it at once (card space-game-w-uses-selection: no sub-list);
// Mine ore with several rock fields still opens the target sub-list (no order yet), Down moves the highlight, Esc goes back; then the keys of card space-game-bracket-select-orders: X clears, ] picks the nearest hostile, E sends the pilots
// at it with no list opened, the who key (read from the key table: W since card space-game-keys3-select, D before it) picks a pilot and E sends that pilot alone. Q (the fleet list, switched on here) then All squads then Esc, Esc goes back through the lists one by one.
// The old lists are switched ON for the list parts (campFleetListSet(true): Q the fleet list, W the all-squads list) and OFF for the part about the game's own keys (X, ], E, who), where Q and W pick who. (Not run by 1-GEN: no Chrome while Troy plays.)
// Pictures go to the folder in PICK_SHOTS (default ~/dev/spacegame-night/shots/pick-*.png), never into the repository.
//   node tests/camppick-boot.mjs
// Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.PICK_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyQ: 81, KeyE: 69, KeyW: 87, KeyD: 68, KeyA: 65, KeyX: 88, BracketRight: 221, Enter: 13, Escape: 27, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };

async function key(t, code, extra = {}, wait = 40) { // a real key: down, a few frames, up (the game clock is stepped, so waits are game milliseconds)
  const k = Object.assign({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: /^(Enter|Arrow|Escape)/.test(code) ? code : code.replace(/^Key/, '').toLowerCase() }, extra);
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait);
}
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'pick-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture pick-' + name); };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  await t.ev('(() => { campFleetListSet(true); return 1; })()'); // the Q walk at the end is about the fleet list, which the game switches off (CAMP_FLEET_LIST: card space-game-q-selects-all); on here, as the node suites do
  for (let i = 0; i < 8 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key(t, 'Enter', {}, 40); await t.run(300); }
  check('the battle is on (mission 1.1)', (await j(`${SC}.mode`)) === 'play');
  await t.ev(`campOrder(${SC}.camp, 'launch')`); await t.run(9000); // the wing leaves the bay
  await t.ev(`(() => { const C = ${SC}.camp; C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; })()`);
  check('the wing is out (three pilots) and no hostile is about', (await j(`campWing(${SC}.camp, 'fighter').length`)) === 3 && (await j(`campAliens(${SC}.camp).length`)) === 0);
  const zoomNow = () => j(`${SC}.cameras.main.zoom`), want = () => j('CAMZOOM.want');
  await t.run(2500);
  const z0 = await zoomNow();
  await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; campSpawn(C, 'raider', c.x + 700, c.y - 200); campSpawn(C, 'skiff', c.x + 1500, c.y + 600); campSpawn(C, 'raider', c.x - 3300, c.y + 400); })()`);
  await t.run(300);
  await key(t, 'KeyW'); await t.run(300);
  const rowOf = id => j(`campPanelRows(${SC}.camp, 'squads').find(r => r.id === '${id}')`), toRow = async id => { // W's list moved to a row: the Down presses a player makes
    const n = await j(`campPanelList(${SC}.camp, 'squads').length`), want = await j(`campPanelList(${SC}.camp, 'squads').findIndex(r => r.id === '${id}')`), at = await j(`${SC}.pn.at`);
    for (let k = 0, d = ((want - at) % n + n) % n; k < d; k++) { await key(t, 'ArrowDown'); await t.run(120); }
  };
  const a0 = await rowOf('attack');
  check('with no hostile picked W opens the all-squads list on its first row that can be given, not on Attack (Launch is out, Attack is grey until a hostile is picked: "pick one with [ ] or S")', (await j(`${SC}.pn.open`)) === 'squads' && (await j(`campPanelList(${SC}.camp, 'squads')[${SC}.pn.at].id`)) !== 'attack' && a0.ok === false && /pick one/.test(a0.state) && a0.label === 'Attack the target');
  await toRow('attack'); await key(t, 'Enter'); await t.run(300);
  check('Enter on the grey Attack row refuses in words: no sub-list, no order, no target picked for the player, the list stays open', (await j(`${SC}.pn.open`)) === 'squads' && (await j(`${SC}.pn.pick`)) === null && (await j(`${SC}.camp.orders.attack | 0`)) === 0 && (await j(`${SC}.camp.tgt`)) === '');
  await key(t, 'KeyW'); await t.run(200);
  await key(t, 'BracketRight', { key: ']' }); await t.run(300);
  const near0 = await j(`${SC}.camp.tgt`);
  await key(t, 'KeyW'); await t.run(300);
  check('with a hostile picked ( ] ) W opens on Attack, and the row names it: "Attack <name>" (card space-game-w-uses-selection)', !!near0 && (await j(`${SC}.pn.open`)) === 'squads' && (await j(`campPanelList(${SC}.camp, 'squads')[${SC}.pn.at].id`)) === 'attack' && (await rowOf('attack')).label === 'Attack ' + (await j(`campTgtName(${SC}.camp)`)), (await rowOf('attack')).label);
  await t.ev(`${SC}.camp.god = true`); // (the hostiles cannot end the battle while the keys are pressed)
  await key(t, 'Enter'); await t.run(900);
  check('Enter sends all three pilots at that hostile at once: no sub-list, the list closes, it stays THE target, and the view is never zoomed IN by it (it may zoom out to show the target: card space-game-select-zooms-out)', (await j(`${SC}.camp.tgt`)) === near0 && (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.pn.pick`)) === null && (await j(`campWing(${SC}.camp, 'fighter').every(u => u.order && u.order.type === 'attack' && u.order.target === '${near0}')`)) && (await zoomNow()) <= z0 + 0.01);
  await snap(t, '1-attack-from-w');
  const nf = await j(`campPickItems(${SC}.camp, 'field').length`);
  if (nf >= 2) { // Mine ore (and Escort the convoy) still pick from a sub-list: the rock fields of the mission
    await key(t, 'KeyW'); await t.run(300); await toRow('fmine'); await key(t, 'Enter'); await t.run(600);
    check('Mine ore with several rock fields opens the sub-list of them: no order yet, the list it came from is still the open one', (await j(`${SC}.pn.open`)) === 'squads' && !!(await j(`${SC}.pn.pick`)) && (await j(`campPickSync(${SC}.camp, ${SC}.pn.pick).length`)) === nf);
    check('the sub-list is drawn: WHICH ROCKS TO MINE heads it, a row for each field, its foot names Esc back, and a bracket layer is made for the highlighted one', /^W +WHICH ROCKS TO MINE$/.test(await j(`${SC}.pnl.title.text`)) && (await j(`${SC}.pnl.rows.filter(r => r.name.visible).length`)) === nf && /Esc back/.test(await j(`${SC}.pnl.keys.text`)) && !!(await j(`!!${SC}.pickG`)));
    await snap(t, '2-mine-sub-list');
    await key(t, 'ArrowDown'); await t.run(300);
    check('Down moves the highlight to the next field', (await j(`${SC}.pn.pick.at`)) === 1);
    await key(t, 'Escape'); await t.run(900);
    check('Esc goes back to the all-squads list (the sub-list is gone, the list is still open)', (await j(`${SC}.pn.open`)) === 'squads' && (await j(`${SC}.pn.pick`)) === null);
    await key(t, 'Escape'); await t.run(300);
  } else console.log('  skip   the Mine ore sub-list (this mission has one rock field)');
  await t.ev('(() => { campFleetListSet(false); return 1; })()'); // the game's own keys from here: no fleet list and no all-squads list, so the who keys are free
  const WHO = await j(`campKeyCodes('who')[0] || ''`), WHOCAP = await j(`CAMP_KEYS.who.k`); // the next who: read from the key table, never a letter written here
  await key(t, 'KeyX'); await t.run(300);
  check('X lets the target go and puts who back on All pilots: no enemy, no friendly, no list open', (await j(`${SC}.camp.tgt`)) === '' && (await j(`${SC}.camp.fsel || ''`)) === '' && (await j(`${SC}.camp.sel`)) === 'all' && (await j(`${SC}.pn.open`)) === '', JSON.stringify(await j(`[${SC}.camp.tgt, ${SC}.camp.fsel, ${SC}.camp.sel]`)));
  await t.ev(`campWingOrder(${SC}.camp, 'fighters', 'guard', null, 'key')`); await t.run(300);
  const near = await j(`campTgtList(${SC}.camp)[0].id`); // the nearest hostile now (the hostiles hardly move in the 300 ms of the pick)
  await key(t, 'BracketRight', { key: ']' }); await t.run(300);
  check('] picks the nearest hostile (the target), opens no list, and the bracket layer is there', (await j(`${SC}.camp.tgt`)) === near && (await j(`${SC}.pn.open`)) === '' && !!(await j(`!!${SC}.tgtG`)));
  await snap(t, '4-bracket-picked');
  await key(t, 'KeyW'); await t.run(300);
  check('W sends all three pilots at it, with no list opened (an order key, not a list)', (await j(`campWing(${SC}.camp, 'fighter').every(u => u.order && u.order.type === 'attack' && u.order.target === '${near}')`)) && (await j(`${SC}.pn.open`)) === '');
  await t.ev(`campWingOrder(${SC}.camp, 'fighters', 'guard', null, 'key')`); await t.run(300);
  // (the three pilots flew at the first target and it is gone by now: pick the nearest hostile again, and the checks below use that one)
  await key(t, 'BracketRight', { key: ']' }); await t.run(300);
  const near2 = await j(`${SC}.camp.tgt`);
  check('the key table has a key for the next who, and this boot can press it', !!WHO && !!VK[WHO], WHO);
  await key(t, WHO); await t.run(300);
  check(WHOCAP + ' picks a pilot as who (the first, Red); the hostile is still the target', !!near2 && (await j(`${SC}.camp.sel`)) === 'pilot:red' && (await j(`${SC}.camp.tgt`)) === near2, JSON.stringify(await j(`[${SC}.camp.sel, ${SC}.camp.tgt]`)));
  await key(t, 'KeyW'); await t.run(300);
  check('W with a pilot picked sends that pilot alone: Red attacks, the others stay on guard', (await j(`campWing(${SC}.camp, 'fighter').filter(u => u.squad === 'red').every(u => u.order && u.order.type === 'attack' && u.order.target === '${near2}')`)) && (await j(`campWing(${SC}.camp, 'fighter').filter(u => u.squad !== 'red').every(u => !(u.order && u.order.type === 'attack'))`)));
  await key(t, 'KeyX'); await t.run(300);
  await t.ev('(() => { campFleetListSet(true); return 1; })()'); // the old lists again, for the walk back through them
  await key(t, 'KeyQ'); await t.run(200);
  check('Q (the fleet list is switched on in this page) opens it on All squads and picks nobody (who stays All pilots)', (await j(`${SC}.pn.open`)) === 'fleet' && (await j(`campPanelList(${SC}.camp, 'fleet')[${SC}.pn.at].open`)) === 'squads' && (await j(`${SC}.camp.sel`)) === 'all');
  await key(t, 'Enter'); await t.run(300);
  check('Q, Enter on All squads: the all-squads list opens, reached by a row (its foot says Esc back)', (await j(`${SC}.pn.open`)) === 'squads' && (await j(`${SC}.pn.trail.join()`)) === 'fleet');
  await key(t, 'Escape'); await t.run(300);
  check('Esc: back to Q on the All squads row', (await j(`${SC}.pn.open`)) === 'fleet' && (await j(`campPanelList(${SC}.camp, 'fleet')[${SC}.pn.at].open`)) === 'squads');
  await snap(t, '5-back-to-q');
  await key(t, 'Escape'); await t.run(200);
  check('the next Esc closes Q; the one after (nothing open) pauses the game', (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.mode`)) === 'play');
  await key(t, 'Escape'); await t.run(300);
  check('and pauses', (await j(`${SC}.mode`)) === 'pause'); await key(t, 'Escape'); await t.run(300);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nTARGET PICK BOOT FAIL (${bad})` : '\nTARGET PICK BOOT PASS');
process.exit(bad ? 1 : 0);
