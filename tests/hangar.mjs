// The hangar terminal in the Ship bay (src/hangar.js, card space-game-u-d4-hangar-ui; docs/UNIVERSE.md 6.3): the panel with FLEET, YARD and
// CONTROLS, what the stage and the status panel show for the ship you select, and the amber button (LAUNCH, BOARD, MOVE HERE, BUY).
// Real key presses over DevTools, real time. The fleet rules themselves are tests/fleet.mjs; this checks what the screen does with them.
// Run: node tests/hangar.mjs   (exit code 1 on any failure). One Chrome, closed at the end.
import { launch, sleep } from './cdp.mjs';

const SH = "game.scene.getScene('Ship')", ST = "game.scene.getScene('Station')";
const t = await launch('#station');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const KEYS = { A: [65, 'KeyA', 'a'], D: [68, 'KeyD', 'd'], F: [70, 'KeyF', 'f'], Y: [89, 'KeyY', 'y'], C: [67, 'KeyC', 'c'], R: [82, 'KeyR', 'r'], S: [83, 'KeyS', 's'], E: [69, 'KeyE', 'e'],
  ENTER: [13, 'Enter', 'Enter'], ESC: [27, 'Escape', 'Escape'], SPACE: [32, 'Space', ' '], LEFT: [37, 'ArrowLeft', 'ArrowLeft'], RIGHT: [39, 'ArrowRight', 'ArrowRight'] };
const press = async (k, hold = 90) => { // the harness's own table has few keys, so this sends the key itself
  const [vk, code, key] = KEYS[k];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key }); await sleep(hold);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key }); await sleep(260);
};
const texts = () => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SH}.children.list.forEach(walk); return out.join('|'); })()`);
const shown = () => t.ev(`(() => { const out = []; const walk = o => { if (o.visible === false) return; if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SH}.children.list.forEach(walk); return out.join('|'); })()`);
const active = k => t.ev(`game.scene.isActive('${k}')`);
const S = e => t.ev(`(() => { const s = ${SH}; with (s) { return (${e}); } })()`); // an expression in the Ship scene's own names
const boardShip = async () => { await t.ev(`${ST}.player.setPosition(1090, 360)`); await sleep(250); await press('E', 200); await t.waitFor("game.scene.isActive('Ship')", 10000, 'ship bay'); await sleep(700); };
const credits = () => t.ev('G.credits');

// a second and a third station (only Halcyon is authored), so a ship can be parked away from here
const MORE = `(() => { SYSTEMS.kestrel = { id: 'kestrel', name: 'Kestrel', ly: [25.5, 19], bodies: [{ id: 'kestrel-outpost', type: 'station', name: 'Kestrel Outpost', x: 3000, y: 3000, dock: { yard: ['ox'] } }] }; return 1; })()`;

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await sleep(600);
  await t.ev("(() => { G.mission = 'none'; G.missionId = null; G.credits = 10000; G.endingSeen = true; G.hull = G.maxHull; return 1; })()"); // endingSeen: earning 2000 credits would open the ending card over the bay
  await t.ev(MORE);

  console.log('A. one ship: the bay opens on the controls, the tabs are there');
  await boardShip();
  const a1 = await texts();
  ['FLEET', 'YARD', 'CONTROLS', 'Thrust', 'Dock or land', 'SHIP STATUS', 'LAUNCH', 'IN FLIGHT'].forEach(w => check('shows ' + w, a1.includes(w)));
  check('the controls tab is open and the berths are hidden', await S('tab') === 'keys' && await t.ev(`${SH}.keysBox.visible && !${SH}.slotBox.visible`));
  check('the stage shows the Wren you fly (the ship texture)', await S("shipImg.texture.key") === 'ship' && await S("view.rec === activeShip()"));
  await t.shot('hangar-1-controls');

  console.log('B. the yard: a Kite for sale');
  await press('Y');
  check('Y opens the yard', await S('tab') === 'yard' && await S("view.kind") === 'yard' && await S("view.model") === 'kite');
  const b1 = await shown();
  check('the status panel is FOR SALE with bars', b1.includes('FOR SALE') && b1.includes('TOP SPEED') && b1.includes('JUMP RANGE') && b1.includes('amber tick: your Wren'), b1.slice(0, 160));
  check('the stage draws the Kite, bare, as wide as the Wren at 5x', await S("shipImg.texture.key") === 'shipview-kite-000'
    && Math.abs(await S("shipImg.scaleX") - 5 * 56 / 60) < 0.01);
  check('the callouts say what the hull can fit (shields up to tier 2) and the title names the ship', b1.includes('UP TO TIER 2') && b1.includes('KITE  -  FAST COURIER'));
  check('the amber button says BUY with the price', b1.includes('BUY') && b1.includes('KITE  -  4,500 CR'));
  check('the hint under it says Buy', await S("hintVerb") === 'Buy');
  await t.shot('hangar-2-yard');

  console.log('C. buying takes a second Enter, never a double tap, and never changes the ship you fly');
  const c0 = await credits();
  await press('ENTER');
  check('the first Enter only arms it', await S("armed && armed.kind") === 'buy' && await credits() === c0 && await t.ev('G.fleet.length') === 1);
  check('the button says to press again', (await shown()).includes('ENTER AGAIN TO CONFIRM'));
  await t.ev(`${SH}.hangarDisarm()`);
  await t.ev(`(() => { ${SH}.primary(); ${SH}.primary(); return 1; })()`); // two presses in the same instant
  check('a double tap does not buy: it only arms', await t.ev('G.fleet.length') === 1 && await S("armed && armed.kind") === 'buy');
  await press('ESC');
  check('Esc disarms it and stays in the bay', await S('armed') === null && await active('Ship') && await t.ev('G.fleet.length') === 1);
  await press('ENTER'); await sleep(450); await press('SPACE');
  check('Space never confirms a purchase', await t.ev('G.fleet.length') === 1);
  await press('ENTER');
  check('the second Enter buys the Kite', await t.ev('G.fleet.length') === 2 && await credits() === c0 - 4500);
  check('you still fly the Wren; the Kite is parked here', await t.ev("G.active === 0 && G.fleet[1].model === 'kite' && G.fleet[1].at === G.lastDock && G.fleet[1].parts.engine === 0"));
  check('the screen goes to the fleet with the new ship selected, and says so', await S('tab') === 'fleet' && await S("view.rec.model") === 'kite' && (await shown()).includes('Bought Kite'));
  check('the button now says BOARD and the stage shows the Kite parked here', (await shown()).includes('BOARD') && (await shown()).includes('PARKED HERE, NOT FLYING') && await S("hintVerb") === 'Board');
  check('the status panel is the Kite\'s (PARKED SHIP, 70 hull)', (await shown()).includes('PARKED SHIP') && (await shown()).includes('70 / 70'));
  await t.shot('hangar-3-bought');

  console.log('D. the fleet: choose, board, launch only what you fly');
  await press('A');
  check('A selects the Wren: LAUNCH again', await S("view.rec.model") === 'wren' && await S("hintVerb") === 'Launch' && await S("shipImg.texture.key") === 'ship');
  await press('RIGHT');
  check('the right arrow selects the Kite', await S("view.rec.model") === 'kite');
  await t.ev(`${SH}.ignoreUntil = 0`);
  await press('ENTER');
  check('Enter boards it: the Kite is the active ship and the bay did not launch', await t.ev('G.active === 1 && G.fleet[G.active].model === "kite"') && await active('Ship') && !(await active('Space')));
  check('the hull you read is the Kite\'s, the Wren stays parked here', await t.ev('G.maxHull === 70 && G.fleet[0].at === G.lastDock'));
  check('the stage is the ship texture again and the button says LAUNCH', await S("shipImg.texture.key") === 'ship' && await S("hintVerb") === 'Launch' && (await shown()).includes('SHIP STATUS'));
  check('the Kite wears the flag', (await texts()).includes('FLYING'));
  await t.shot('hangar-4-boarded');

  console.log('E. selling takes a second S; you cannot sell the ship you fly');
  await press('S');
  check('S on the ship you fly says so and sells nothing', (await shown()).includes('You are flying Kite') && await t.ev('G.fleet.length') === 2);
  await press('A');
  check('the Wren is selected (it is parked here)', await S("view.rec.model") === 'wren');
  const e0 = await credits();
  await press('S');
  check('the first S arms the sale and the chip asks', await S("armed && armed.kind") === 'sell' && (await shown()).includes('Sure?') && await credits() === e0);
  await sleep(500); await press('S');
  check('the second S sells the free Wren: it is gone and pays nothing', await t.ev('G.fleet.length') === 1 && await credits() === e0);
  check('the fleet is the Kite again and it is selected', await t.ev('G.fleet[0].model') === 'kite' && await S("view.rec === activeShip()"));
  // the Wren was the free starter, so it sold for nothing; a Talon with a part fitted fetches real money
  await t.ev("(() => { G.fleet.push(Object.assign(newShip('talon', G.lastDock), { uid: 5, name: 'Old Talon' })); G.fleet[1].parts.weapons = 1; return 1; })()");
  await t.ev(`${SH}.hangarRefresh()`); await press('F'); await press('RIGHT');
  check('a Talon with rapid fire is selected, parked here', await S("view.rec.name") === 'Old Talon');
  const sellTotal = await t.ev('fleetSellValue(G.fleet[1]).total');
  check('its sale value is 60% of 8500 plus 50% of the 440 the Talon\'s rapid fire costs', sellTotal === 5100 + 220, 'total ' + sellTotal);
  const e1 = await credits();
  await press('S'); await sleep(500); await press('S');
  check('selling pays it into your credits and the ship is gone', await credits() === e1 + sellTotal && await t.ev('G.fleet.length') === 1 && (await shown()).includes('Sold Old Talon'));
  await t.shot('hangar-5-sold');

  console.log('F. renaming: a real text box');
  await t.ev("(() => { G.fleet.push(Object.assign(newShip('ox', G.lastDock), { uid: 6, name: 'Work Ox' })); return 1; })()");
  await t.ev(`${SH}.hangarRefresh()`); await press('D');
  check('the Ox is selected', await S("view.rec.name") === 'Work Ox');
  await press('R');
  check('R opens a text box with the name and the bay stops reading keys', await t.ev("!!document.querySelector('input') && document.querySelector('input').value === 'Work Ox'") && await S('typing') === true);
  await t.ev("(() => { const el = document.querySelector('input'); el.value = '  Old\\u0007 Faithful  '; return 1; })()");
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter' }); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter' }); await sleep(300);
  check('Enter saves it, cleaned, and the box is gone', await t.ev("G.fleet[1].name") === 'Old Faithful' && await t.ev("!document.querySelector('input')") && await S('typing') === false);
  check('typing did not launch, leave or open the pause menu', await active('Ship') && !(await active('Space')) && !(await active('Pause')));
  await press('R'); await t.ev("(() => { document.querySelector('input').value = 'Nope'; return 1; })()");
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }); await sleep(300);
  check('Esc in the box cancels: the name is kept, the bay stays', await t.ev("G.fleet[1].name") === 'Old Faithful' && await active('Ship') && await t.ev("!document.querySelector('input')"));
  await t.shot('hangar-6-renamed');

  console.log('G. a ship parked at another station: MOVE HERE');
  await t.ev("(() => { G.fleet[1].at = 'kestrel-outpost'; return 1; })()");
  await t.ev(`${SH}.hangarRefresh()`);
  const g1 = await shown();
  check('the card, the stage and the button say it is at Kestrel', g1.includes('KESTREL') && g1.includes('PARKED AT KESTREL') && g1.includes('MOVE HERE'));
  check('the price is 100 plus 25 a light year, with the distance', g1.includes('257 CR') && g1.includes('LY'), g1.slice(g1.indexOf('MOVE HERE'), g1.indexOf('MOVE HERE') + 60));
  await press('S');
  check('S says to move it here first and sells nothing', (await shown()).includes('Move it here to sell it') && await t.ev('G.fleet.length') === 2);
  await t.ev("G.credits = 100"); await t.ev(`${SH}.hangarRefresh()`);
  check('with 100 credits the button says how many are missing', (await shown()).includes('NEED 157 MORE CR'));
  await press('ENTER');
  check('Enter refuses and says why, nothing moved', (await shown()).includes('Need 157 more credits') && await t.ev("G.fleet[1].at") === 'kestrel-outpost' && await credits() === 100);
  await t.ev("G.credits = 5000"); await t.ev(`${SH}.hangarRefresh()`);
  await press('ENTER');
  check('with the credits Enter moves it here for 257', await t.ev("G.fleet[1].at === G.lastDock") && await credits() === 5000 - 257);
  check('and the button is BOARD now', await S("hintVerb") === 'Board');

  console.log('H. the yard when the hangar is full, and a yard with a different list');
  await t.ev("(() => { while (G.fleet.length < 6) G.fleet.push(Object.assign(newShip('ox', G.lastDock), { uid: fleetNextUid(), name: 'Ox ' + G.fleet.length })); return 1; })()");
  await press('Y');
  check('HANGAR FULL on the button and the reason in words', (await shown()).includes('HANGAR FULL') && (await shown()).includes('holds 6 ships'));
  await press('ENTER'); await sleep(450); await press('ENTER');
  check('Enter buys nothing', await t.ev('G.fleet.length') === 6 && await S('armed') === null);
  await press('F');
  check('six cards and no empty berth, six / six on the tag', (await texts()).includes('6 / 6 BERTHS') && !(await shown()).includes('EMPTY BERTH'));
  await t.shot('hangar-7-full');

  console.log('I. leaving: Esc, launch from the controls tab');
  await t.ev("(() => { G.fleet.length = 1; G.active = 0; G.fleet[0].at = G.lastDock; G.credits = 1234; return 1; })()");
  await t.ev(`${SH}.scene.restart()`); await sleep(1500);
  check('a restarted bay opens on the tab you left (fleet)', await S('tab') === 'fleet' && (await shown()).includes('EMPTY BERTH'));
  await press('C');
  check('C shows the controls again', await S('tab') === 'keys' && (await shown()).includes('Boost with thrust'));
  await t.ev(`${SH}.ignoreUntil = 0`);
  await press('ENTER');
  await t.waitFor("game.scene.isActive('Space')", 10000, 'space');
  check('Enter launches the ship you fly', await active('Space') && !(await active('Ship')));
  check('the name box does not outlive the scene', await t.ev("!document.querySelector('input')"));
  check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
  if (t.errors.length) console.log('  page errors: ' + t.errors.join(' | '));
} finally {
  await t.close();
}
console.log(fails ? `HANGAR FAIL (${fails})` : 'HANGAR PASS');
process.exit(fails ? 1 : 0);
