// not in the smoke: the Campaign's ship systems in a real fight, one picture, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-systems)
// The rules are in tests/campsystems.mjs (plain Node). This boots level 1, moves pips through the power list (I, a part of the ship list: card list-shortcuts; a power row leaves the list open) and with J K L (direct keys: they work with no list open and open none: card one-list-keys), fires the emergency shields through the power list (I, Down to its row, Enter), and takes pictures of the HUD gauges (their power bars) and of the open power list
// (the draw is Phaser's: the list on a fight's background, the three gauges with a bar of power segments beside each). It also looks at what the screen holds: no list until its key, the power rows and the emergency's row in the power list, the pips are the sim's, the saved
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
  // an order is given through the list its row is in (cards one-list-keys and list-shortcuts): that list's own key (Q W E R, P O I U), Down to the row, Enter; a list with no key of its own (the stances) is opened from its parent:
  // the parent's key, Down to the part's row, Enter. The list is read from the key table (campKeyVia) and the row's place from the list of THIS mission in the page, never a letter or a number written here
  // listWay(row): { list, keys: [[the key to press, how many Downs after it], ...] }, or null when the row is not in this mission's list;   listGo(row): the list open with the highlight on the row (not given);   listOrder(row): and Enter
  const listWay = row => j(`(() => { const C = ${SC}.camp, id = ${JSON.stringify(row)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
    if (p.code) return { list: p.id, keys: [[p.code, at]] };
    const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? { list: p.id, keys: [[up.code, pat], ['Enter', at]] } : null; })()`);
  const listGo = async row => {
    if ((await j(`${SC}.mode`)) !== 'play') return false; // a card has the keys: Enter would be the card's
    const way = await listWay(row); if (!way) return false; // the row is not in this mission's list
    if (await j(`campPanelOpen(${SC}.pn)`)) await key('Escape'); // an open list is closed first (Esc pauses only when none is open)
    for (const [code, downs] of way.keys) { await key(code); for (let i = 0; i < downs; i++) await key('ArrowDown'); }
    return true;
  };
  const listOrder = async row => {
    if (!(await listGo(row))) return false; await key('Enter');
    if (await j(`campPanelOpen(${SC}.pn)`)) await key('Escape'); // an order that is refused leaves the list open, and so does a power row: it is closed, the keys go back to the ship
    return true;
  };
  const hi = `${SC}.pnl.rows[${SC}.pn.at - ${SC}.pn.top]`; // the objects of the highlighted row of the open list (src/campanelsdraw.js)
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(300); } // the intro card, and the missions' briefing after it
  check('the battle is on (the cards are out of the way)', (await j(`${SC}.mode`)) === 'play', await j(`${SC}.mode`));
  check('a new battle starts at 2 / 2 / 2 with the three gauges and their power bars on the HUD (SHIELDS, SPEED, LASERS: card space-game-systems-gauges replaced the W S E pips)', await j(`JSON.stringify(${SC}.camp.power.p) === '[2,2,2]' && !!${SC}.hud.gauges && ${SC}.hud.gauges.l.map(t => t.text).join() === 'SHIELDS,SPEED,LASERS' && JSON.stringify(${SC}.gaugeAnim.shown) === '[2,2,2]'`));
  await t.run(500);
  check('no list is on the screen at the start; the power keys are direct keys of the key table (J shields, K engines, L weapons, ; balance) and rows of the power list too, which stay open when given', await j(`campPanelOpen(${SC}.pn) === '' && !${SC}.pnl.title.visible && ${SC}.pnl.rows.every(r => !r.name.visible) && ['shields', 'engines', 'weapons', 'balance'].map(id => CAMP_KEYS[id].k).join() === 'J,K,L,;' && ['shields', 'engines', 'weapons', 'balance'].every(id => campKeyVia(id).id === 'power' && campKeyRow(id).stay === 1) && campKeyVia('emergency').id === 'power' && !campKeyRow('emergency').stay && !campPanelList(${SC}.camp, 'ship').some(r => r.order === 'power' || r.order === 'balance')`), await j(`['shields', 'engines', 'weapons', 'balance'].map(id => CAMP_KEYS[id].k)`));
  await key('KeyP'); await t.run(300);
  const pwAt = await j(`campPanelList(${SC}.camp, 'ship').findIndex(r => r.open === 'power')`);
  check('P opens the ship list, and Power is a row of it that shows its key (I) and the pips now', await j(`campPanelOpen(${SC}.pn) === 'ship' && ${SC}.pnl.title.text === 'P   SHIP ORDERS' && ${pwAt} >= 0 && ${SC}.pnl.rows[${pwAt}].name.text === campKeyRow('gpower').label + '  >' && ${SC}.pnl.rows[${pwAt}].cap.visible && ${SC}.pnl.rows[${pwAt}].cap.text === campKeyList('power').key && campKeyList('power').key === 'I' && ${SC}.pnl.rows[${pwAt}].suffix.text === '2 / 2 / 2'`), await j(`${SC}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text + ' | ' + r.suffix.text)`));
  for (let i = 0; i < pwAt; i++) await key('ArrowDown'); await key('Enter'); await t.run(300);
  check('Enter on the Power row opens the power list (no order: the pips are as they were), and the emergency shields are a row of it', await j(`campPanelOpen(${SC}.pn) === 'power' && ${SC}.pn.at === 0 && ${SC}.pnl.title.text === 'I   POWER' && JSON.stringify(${SC}.camp.power.p) === '[2,2,2]' && ${SC}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text).indexOf('Emergency shields') === campPanelList(${SC}.camp, 'power').findIndex(r => r.id === 'emergency') && campPanelList(${SC}.camp, 'power').findIndex(r => r.id === 'emergency') >= 0 && ${SC}.pnl.keys.text === uiText('camp.ui.listkeysub', { key: 'I' })`), await j(`${SC}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text)`));
  await shot('1-list'); await key('ArrowLeft'); await t.run(200);
  check('Left goes back to the ship list, the highlight on the Power row', await j(`campPanelOpen(${SC}.pn) === 'ship' && ${SC}.pn.at === ${pwAt}`));
  await key('Escape'); await t.run(200);
  // the power list by its own key: I, Down to the shields' row, Enter gives a pip and the list stays open (to give it again); Balance puts it back
  const sAt = await j(`campPanelList(${SC}.camp, 'power').findIndex(r => r.id === 'shields')`), bAt = await j(`campPanelList(${SC}.camp, 'power').findIndex(r => r.id === 'balance')`);
  await key('KeyI'); for (let i = 0; i < sAt; i++) await key('ArrowDown'); await key('Enter'); await t.run(300);
  check('I, Enter on "Shields: one more pip": 1 / 3 / 2, and the power list stays open with the highlight on that row, which says the pips now and its direct key (J)', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]' && campPanelOpen(${SC}.pn) === 'power' && ${SC}.pn.at === ${sAt} && ${hi}.name.text === campKeyRow('shields').label && ${hi}.suffix.text === campPanelRows(${SC}.camp, 'power')[${sAt}].short && /^J /.test(${hi}.suffix.text) && / 3 pips$/.test(${hi}.suffix.text)`), await j(`JSON.stringify(${SC}.camp.power.p) + ' | ' + ${hi}.name.text + ' | ' + ${hi}.suffix.text`));
  for (let i = sAt; i < bAt; i++) await key('ArrowDown'); await key('Enter'); await t.run(300);
  check('Down to "Balance the power", Enter: 2 / 2 / 2 again, the list still open; I again closes it', await j(`JSON.stringify(${SC}.camp.power.p) === '[2,2,2]' && campPanelOpen(${SC}.pn) === 'power'`) && (await key('KeyI'), await t.run(200), await j(`campPanelOpen(${SC}.pn) === '' && !${SC}.pnl.title.visible`)));
  await key('KeyJ'); await t.run(300);
  check('J is "power to shields": 1 / 3 / 2, the pips follow on the HUD, and no list opens for it', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]' && campPanelOpen(${SC}.pn) === '' && !${SC}.pnl.title.visible`));
  check('the setting is saved at once (the next level starts from it)', await j(`JSON.stringify(campPowerLoad()) === '[1,3,2]'`));
  await key('KeyU'); await t.run(200);
  check('U is no power order (it opens the dock list): the pips are as they were', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]' && campPanelOpen(${SC}.pn) === 'yard'`));
  await key('KeyU'); await t.run(200);
  const gave = await listOrder('emergency'); await t.run(300);
  check('I, Down to "Emergency shields", Enter: the order is given and the list closes (the emergency is no row that stays)', gave === true && (await listWay('emergency')).list === 'power' && await j(`campPanelOpen(${SC}.pn) === ''`));
  check('emergency shields: 1 / 4 / 1 for ten seconds, the setting still 1 / 3 / 2 and the HUD shields row white', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,4,1]' && JSON.stringify(${SC}.camp.power.base) === '[1,3,2]'`));
  await t.run(1500); await shot('2-emergency');
  await t.run(9500);
  check('after ten seconds the pips are back to the setting', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]'`));
  await t.run(500);
  const eAt = await j(`campPanelList(${SC}.camp, 'power').findIndex(r => r.id === 'emergency')`);
  await key('KeyI'); for (let i = 0; i < eAt; i++) await key('ArrowDown'); await t.run(400); // the list open, the highlight on the emergency's row (not given: no Enter)
  check('the list says the emergency is cooling down (its row is grey and says N s) and the saved setting never held the emergency', await j(`${hi}.name.text === 'Emergency shields' && /^[0-9]+ s$/.test(${hi}.suffix.text) && campPanelRows(${SC}.camp, 'power')[${eAt}].ok === false && JSON.stringify(campPowerLoad()) === '[1,3,2]'`), await j(`${hi}.name.text + ' | ' + ${hi}.suffix.text`));
  await shot('3-cooling');
  await key('Enter'); await t.run(300);
  check('Enter on the cooling row is refused: the list stays open and the pips do not move', await j(`campPanelOpen(${SC}.pn) === 'power' && JSON.stringify(${SC}.camp.power.p) === '[1,3,2]'`));
  await key('Escape'); await t.run(200);
  check('Esc closes the list and does not pause the battle', await j(`campPanelOpen(${SC}.pn) === '' && ${SC}.mode === 'play'`));
  await key('KeyH'); await t.run(400);
  check('H opens the page of every key (it lists the order lists and the power keys)', await j(`!!${SC}.ck && ${SC}.ck.open === true`));
  await shot('4-keys'); await key('KeyH'); await t.run(200);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP SYSTEMS BOOT FAIL (${bad})` : 'CAMP SYSTEMS BOOT PASS');
process.exit(bad ? 1 : 0);
