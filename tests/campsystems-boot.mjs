// not in the smoke: the Campaign's ship systems in a real fight, one picture, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-systems)
// The rules are in tests/campsystems.mjs (plain Node). This boots level 1, moves pips with J K L (direct keys: they work with no list open and open none: card one-list-keys), fires the emergency shields through the ship list (P, Down to its row, Enter), and takes pictures of the HUD gauges (their power bars) and of the open ship list
// (the draw is Phaser's: the list on a fight's background, the three gauges with a bar of power segments beside each). It also looks at what the screen holds: no list until P, the emergency's row in it, the pips are the sim's, the saved
// setting is kept, the emergency is not.
//   node tests/campsystems-boot.mjs
// The pictures go to the folder in SYSTEMS_SHOTS (default ~/dev/spacegame-night/shots/systems-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.SYSTEMS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const shot = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'systems-' + name + '.png'), Buffer.from(r.data, 'base64')); } }; // twice: the second has drawn
  const key = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
  // an order is given through its list (card one-list-keys): the list's key (Q the fleet's, P the ship's), Down to the row, Enter. The row's place is read from the list of THIS mission in the page, never a number written here
  const listOrder = async (id, row) => {
    if ((await j(`${SC}.mode`)) !== 'play') return false; // a card has the keys: Enter would be the card's
    const at = await j(`campPanelList(${SC}.camp, ${JSON.stringify(id)}).findIndex(r => r.id === ${JSON.stringify(row)})`); if (at < 0) return false; // the row is not in this mission's list
    if (await j(`campPanelOpen(${SC}.pn)`)) await key('Escape'); // an open list is closed first (Esc pauses only when none is open)
    await key(await j(`CAMP_PANELS.panels.find(p => p.id === ${JSON.stringify(id)}).code`)); for (let i = 0; i < at; i++) await key('ArrowDown'); await key('Enter');
    if (await j(`campPanelOpen(${SC}.pn)`)) await key('Escape'); // an order that is refused leaves the list open: it is closed, the keys go back to the ship
    return true;
  };
  const hi = `${SC}.pnl.rows[${SC}.pn.at - ${SC}.pn.top]`; // the objects of the highlighted row of the open list (src/campanelsdraw.js)
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(300); } // the intro card, and the missions' briefing after it
  check('the battle is on (the cards are out of the way)', (await j(`${SC}.mode`)) === 'play', await j(`${SC}.mode`));
  check('a new battle starts at 2 / 2 / 2 with the three gauges and their power bars on the HUD (SHIELDS, SPEED, LASERS: card space-game-systems-gauges replaced the W S E pips)', await j(`JSON.stringify(${SC}.camp.power.p) === '[2,2,2]' && !!${SC}.hud.gauges && ${SC}.hud.gauges.l.map(t => t.text).join() === 'SHIELDS,SPEED,LASERS' && JSON.stringify(${SC}.gaugeAnim.shown) === '[2,2,2]'`));
  await t.run(500);
  check('no list is on the screen at the start, and the power keys are direct keys of the key table, not rows of a list: J shields, K engines, L weapons, ; balance', await j(`campPanelOpen(${SC}.pn) === '' && !${SC}.pnl.title.visible && ${SC}.pnl.rows.every(r => !r.name.visible) && ['shields', 'engines', 'weapons', 'balance'].map(id => CAMP_KEYS[id].k).join() === 'J,K,L,;' && !campPanelList(${SC}.camp, 'ship').some(r => r.order === 'power' || r.order === 'balance')`), await j(`['shields', 'engines', 'weapons', 'balance'].map(id => CAMP_KEYS[id].k)`));
  await key('KeyP'); await t.run(300);
  check('P opens the ship list, and the emergency shields are a row of it', await j(`campPanelOpen(${SC}.pn) === 'ship' && ${SC}.pnl.title.text === 'P   SHIP ORDERS' && ${SC}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text).indexOf('Emergency shields') === campPanelList(${SC}.camp, 'ship').findIndex(r => r.id === 'emergency')`), await j(`${SC}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text)`));
  await shot('1-list'); await key('KeyP'); await t.run(200);
  await key('KeyJ'); await t.run(300);
  check('J is "power to shields": 1 / 3 / 2, the pips follow on the HUD, and no list opens for it', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]' && campPanelOpen(${SC}.pn) === '' && !${SC}.pnl.title.visible`));
  check('the setting is saved at once (the next level starts from it)', await j(`JSON.stringify(campPowerLoad()) === '[1,3,2]'`));
  await key('KeyU'); await t.run(200);
  check('U is no order any more: the pips are as they were', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]'`));
  const gave = await listOrder('ship', 'emergency'); await t.run(300);
  check('P, Down to "Emergency shields", Enter: the order is given and the list closes', gave === true && await j(`campPanelOpen(${SC}.pn) === ''`));
  check('emergency shields: 1 / 4 / 1 for ten seconds, the setting still 1 / 3 / 2 and the HUD shields row white', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,4,1]' && JSON.stringify(${SC}.camp.power.base) === '[1,3,2]'`));
  await t.run(1500); await shot('2-emergency');
  await t.run(9500);
  check('after ten seconds the pips are back to the setting', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]'`));
  await t.run(500);
  const eAt = await j(`campPanelList(${SC}.camp, 'ship').findIndex(r => r.id === 'emergency')`);
  await key('KeyP'); for (let i = 0; i < eAt; i++) await key('ArrowDown'); await t.run(400); // the list open, the highlight on the emergency's row (not given: no Enter)
  check('the list says the emergency is cooling down (its row is grey and says N s) and the saved setting never held the emergency', await j(`${hi}.name.text === 'Emergency shields' && /^[0-9]+ s$/.test(${hi}.suffix.text) && campPanelRows(${SC}.camp, 'ship')[${eAt}].ok === false && JSON.stringify(campPowerLoad()) === '[1,3,2]'`), await j(`${hi}.name.text + ' | ' + ${hi}.suffix.text`));
  await shot('3-cooling');
  await key('Enter'); await t.run(300);
  check('Enter on the cooling row is refused: the list stays open and the pips do not move', await j(`campPanelOpen(${SC}.pn) === 'ship' && JSON.stringify(${SC}.camp.power.p) === '[1,3,2]'`));
  await key('Escape'); await t.run(200);
  check('Esc closes the list and does not pause the battle', await j(`campPanelOpen(${SC}.pn) === '' && ${SC}.mode === 'play'`));
  await key('KeyH'); await t.run(400);
  check('H opens the page of every key (it lists the two lists and the power keys)', await j(`!!${SC}.ck && ${SC}.ck.open === true`));
  await shot('4-keys'); await key('KeyH'); await t.run(200);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP SYSTEMS BOOT FAIL (${bad})` : 'CAMP SYSTEMS BOOT PASS');
process.exit(bad ? 1 : 0);
