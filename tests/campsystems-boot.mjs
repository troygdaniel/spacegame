// not in the smoke: the Campaign's ship systems in a real fight, one picture, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-systems)
// The rules are in the plain Node suites (tests/campcruiser.mjs for the emergency shields). This boots level 1 and looks at what is left of the ship's systems in the game: the cruiser's status at the top left (SHIELD, HULL, ORE: card space-game-layout-cruiser; the three round gauges are gone), no power list and no ship list (O and P are
// free keys: card space-game-keys4-onekey), and Emergency shields as a row of the cruiser list (S, Down to its row, Enter: card space-game-keys2-cruiser): the shield fills at once for ore, the row cools down and refuses meanwhile.
// The power keys (J K L) are pressed only while the key table still has them (card space-game-power-removed takes them out). Pictures: the open cruiser list, the HUD after the emergency, the cooling row, the H page.
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
    for (let n = 0; n < 6 && (await j(`campPanelOpen(${SC}.pn)`)); n++) await key('Escape'); // Esc goes back ONE step (a target sub-list to its list, a list a row opened to Q or P; a list its own key opened closes): pressed until every list is closed (it pauses only when none is open)
    for (const [code, downs] of way.keys) { await key(code); const cur = await j(`${SC}.pn.at`), n = await j(`(() => { const o = campPanelOpen(${SC}.pn); return o ? campPanelList(${SC}.camp, o).length : 0; })()`); for (let i = 0, d = n ? ((downs - cur) % n + n) % n : 0; i < d; i++) await key('ArrowDown'); } // a list can open with its highlight on its first usable row (start: 'usable', All squads): Down only the difference
    return true;
  };
  const listOrder = async row => {
    if (!(await listGo(row))) return false; await key('Enter');
    if (await j(`!!${SC}.pn.pick`)) await key('Enter'); // a row that needs a target (Attack, Escort, Mine ore) with several to choose from opens a target sub-list (src/camppick.js): Enter takes the highlighted one, the nearest; one candidate is taken at once, none: as it always was
    for (let n = 0; n < 6 && (await j(`campPanelOpen(${SC}.pn)`)); n++) await key('Escape'); // an order that is refused leaves the list open, and so does a power row: Esc until it is closed, the keys go back to the ship
    return true;
  };
  const hi = `${SC}.pnl.rows[${SC}.pn.at - ${SC}.pn.top]`; // the objects of the highlighted row of the open list (src/campanelsdraw.js)
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(300); } // the intro card, and the missions' briefing after it
  check('the battle is on (the cards are out of the way)', (await j(`${SC}.mode`)) === 'play', await j(`${SC}.mode`));
  // What is left of the ship's systems in the game (cards space-game-keys2-select, space-game-keys2-cruiser, space-game-power-removed): no power list and no ship list (O and P are free keys), the cruiser's status at the top left (SHIELD and HULL bars and the ORE line, src/campcruiserhud.js: the round gauges went with card space-game-layout-hud),
  // and Emergency shields as a row of the cruiser list (S): the shield is filled at once for ore, and the row cools down. The power keys (J K L) are pressed only while the key table still has them.
  await t.run(200); const CR = await j(`(() => { const H = ${SC}.hud; return H.crShieldL ? { l: [H.crShieldL.text, H.crHullL.text], n: [H.crShieldN.text, H.crHullN.text], ore: H.crOre.text, vis: H.crShieldL.visible && H.crOre.visible, want: [uiText('camp.cruiser.shield'), uiText('camp.cruiser.hull'), uiText('camp.cruiser.ore')], gauges: !!H.gauges } : null; })()`);
  check('the cruiser\'s status is at the top left (SHIELD and HULL with their numbers, the ORE line) and the round gauges are gone', !!CR && CR.vis && CR.l.join() === CR.want.slice(0, 2).join() && CR.n.every(s => /^\d+$/.test(s)) && CR.ore.indexOf(CR.want[2]) === 0 && !CR.gauges, JSON.stringify(CR));
  await t.run(500);
  check('no list is on the screen at the start, and Emergency shields is a row of the cruiser list, which has a key of its own', await j(`campPanelOpen(${SC}.pn) === '' && !${SC}.pnl.title.visible && ${SC}.pnl.rows.every(r => !r.name.visible) && campKeyVia('emergency').id === 'cruiser' && !!campKeyList('cruiser').code && !campKeyRow('emergency').stay`), JSON.stringify(await j(`[campKeyVia('emergency').id, campKeyList('cruiser').key]`)));
  const PK = await j(`['shields', 'engines', 'weapons'].map(id => campKeyCodes(id)[0] || '')`);
  if (PK[0]) { // the power keys are still in the key table: J gives the shields a pip with no list opened
    const p0 = await j(`${SC}.camp.power.p.slice()`); await key(PK[0]); await t.run(300); const p1 = await j(`${SC}.camp.power.p.slice()`);
    check('the shields\' power key gives the shields a pip and opens no list', p1[1] === p0[1] + 1 && (await j(`campPanelOpen(${SC}.pn)`)) === '', JSON.stringify([p0, p1]));
    await t.ev(`(() => { campOrder(${SC}.camp, 'balance', '', 'key'); return 1; })()`); await t.run(200);
  } else console.log('  note   the key table has no power keys (card space-game-power-removed): the shield and hull bars are plain readouts');
  check('O and P open no list (they are free keys; the power list and the ship list have no key in the game)', (await key('KeyO'), await t.run(150), await j(`campPanelOpen(${SC}.pn)`)) === '' && (await key('KeyP'), await t.run(150), await j(`campPanelOpen(${SC}.pn)`)) === '');
  // the emergency: the shield is knocked down and there is ore to pay with
  const E = await j(`({ ore: CAMP.emergency.ore, cool: CAMP.emergency.cooldown, max: campShieldMax(${SC}.camp) })`);
  await t.ev(`(() => { const C = ${SC}.camp; C.god = true; C.shield = campShieldMax(C) * 0.25; C.ore = ${E.ore} + 30; return 1; })()`); await t.run(100);
  const way = await listWay('emergency'), went = await listGo('emergency'); await t.run(200);
  check('the cruiser list\'s key, Down to "Emergency shields": the list is open with the highlight on that row, which says what it costs', went === true && way.list === 'cruiser' && await j(`campPanelOpen(${SC}.pn) === 'cruiser' && ${hi}.name.text === campKeyRow('emergency').label`), JSON.stringify(way) + ' | ' + await j(`${hi}.name.text + ' | ' + ${hi}.suffix.text`));
  await shot('1-list');
  const ore0 = await j(`Math.floor(${SC}.camp.ore)`); await key('Enter'); await t.run(300);
  check('Enter: the shield is full at once, the ore is paid (' + E.ore + ') and the list closes (the emergency is no row that stays)', await j(`${SC}.camp.shield >= campShieldMax(${SC}.camp) - 1 && Math.floor(${SC}.camp.ore) === ${ore0} - ${E.ore} && campPanelOpen(${SC}.pn) === '' && (${SC}.camp.orders.emergency | 0) === 1`), JSON.stringify(await j(`[Math.round(${SC}.camp.shield), Math.round(campShieldMax(${SC}.camp)), Math.floor(${SC}.camp.ore), campPanelOpen(${SC}.pn)]`)));
  await t.run(1200); await shot('2-emergency');
  await t.ev(`(() => { const C = ${SC}.camp; C.shield = campShieldMax(C) * 0.25; return 1; })()`); await t.run(100);
  const eAt = await j(`campPanelList(${SC}.camp, 'cruiser').findIndex(r => r.id === 'emergency')`);
  await listGo('emergency'); await t.run(300); // the list open again, the highlight on the emergency's row (not given: no Enter)
  check('the list says the emergency is cooling down (its row cannot be given and says N s)', await j(`${hi}.name.text === campKeyRow('emergency').label && /[0-9]+ s/.test(${hi}.suffix.text) && campPanelRows(${SC}.camp, 'cruiser')[${eAt}].ok === false`), await j(`${hi}.name.text + ' | ' + ${hi}.suffix.text`));
  await shot('3-cooling');
  const sh0 = await j(`Math.round(${SC}.camp.shield)`), ore1 = await j(`Math.floor(${SC}.camp.ore)`); await key('Enter'); await t.run(200);
  check('Enter on the cooling row is refused: the list stays open, no ore is paid and it was given once only', await j(`campPanelOpen(${SC}.pn) === 'cruiser' && Math.floor(${SC}.camp.ore) === ${ore1} && (${SC}.camp.orders.emergency | 0) === 1`), JSON.stringify(await j(`[campPanelOpen(${SC}.pn), Math.floor(${SC}.camp.ore), ${SC}.camp.orders.emergency]`)) + ' shield before ' + sh0);
  await key('Escape'); await t.run(200);
  check('Esc closes the list and does not pause the battle', await j(`campPanelOpen(${SC}.pn) === '' && ${SC}.mode === 'play'`));
  await key('KeyH'); await t.run(400);
  check('H opens the page of every key', await j(`!!${SC}.ck && ${SC}.ck.open === true`));
  await shot('4-keys'); await key('KeyH'); await t.run(200);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP SYSTEMS BOOT FAIL (${bad})` : 'CAMP SYSTEMS BOOT PASS');
process.exit(bad ? 1 : 0);
