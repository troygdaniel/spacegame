// not in the smoke: a boot of the Campaign's outposts, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-outposts)
// The rules are in tests/campoutpost.mjs and tests/campdock.mjs (plain Node). This boots the belt (level 1: the cruiser starts by Occator Works) and does what Troy does: opens the ship list (P) and its dock list (U, card list-shortcuts) undocked, docks
// through it (U, Down to the dock row, Enter), builds a fighter in the ready room, undocks with L, flies away hurt and alone to see the retreat line and the map's stations, and fits the Fabricator.
//   node tests/campoutpost-boot.mjs
// Pictures go to the folder in OUTPOST_SHOTS (default ~/dev/spacegame-night/shots/outpost-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
// the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots): this boot was written for it and pins its missions and words; the rim run is checked in tests/camprim.mjs. The address started the Campaign scene on the rim run, so it starts again.
const belt = async t => { await t.ev(beltSource(1)); await t.ev(`(() => { game.scene.stop('Campaign'); game.scene.start('Campaign', { level: 1, techs: [], via: 'address' }); return 1; })()`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.OUTPOST_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, KeyE: 69, KeyF: 70, KeyL: 76, KeyP: 80, KeyQ: 81, KeyU: 85, KeyR: 82, KeyW: 87, KeyO: 79, KeyI: 73, Enter: 13, Tab: 9, Minus: 189, Escape: 27, ArrowDown: 40 };

const t = await launch('?campaign=1', ROOT);
try {
  const SCN = `game.scene.getScene('Campaign')`, HUB = `game.scene.getScene('CampHub')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Minus' ? '-' : code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(300); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'outpost-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture outpost-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  // an order is given through the list its row is in (cards one-list-keys and list-shortcuts): that list's own key (Q W E R, P O I U), Down to the row, Enter; a list with no key of its own (the stances) is opened from its parent:
  // the parent's key, Down to the part's row, Enter. The list is read from the key table (campKeyVia) and the row's place from the list of THIS mission in the page, never a letter or a number written here
  // listWay(row): { list, keys: [[the key to press, how many Downs after it], ...] }, or null when the row is not in this mission's list;   listGo(row): the list open with the highlight on the row (not given);   listOrder(row): and Enter
  const listWay = row => j(`(() => { const C = ${SCN}.camp, id = ${JSON.stringify(row)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
    if (p.code) return { list: p.id, keys: [[p.code, at]] };
    const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? { list: p.id, keys: [[up.code, pat], ['Enter', at]] } : null; })()`);
  const listGo = async row => {
    if ((await j(`${SCN}.mode`)) !== 'play') return false; // a card has the keys: Enter would be the card's
    const way = await listWay(row); if (!way) return false; // the row is not in this mission's list
    if (await j(`campPanelOpen(${SCN}.pn)`)) await key('Escape'); // an open list is closed first (Esc pauses only when none is open)
    for (const [code, downs] of way.keys) { await key(code); for (let i = 0; i < downs; i++) await key('ArrowDown'); }
    return true;
  };
  const listOrder = async row => {
    if (!(await listGo(row))) return false; await key('Enter');
    if (await j(`campPanelOpen(${SCN}.pn)`)) await key('Escape'); // an order that is refused leaves the list open, and so does a power row: it is closed, the keys go back to the ship
    return true;
  };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 30000, 'the Campaign scene'); await belt(t); await t.clock(); await t.run(800);
  await key('Enter'); await key('Enter'); await settle(`${SCN}.mode === 'play'`); await t.ev(`(() => { const C = ${SCN}.camp; C.ships = C.ships.filter(u => u.team !== 'alien'); C.waves.forEach(w => { w.started = true; }); return 1; })()`);
  check('the belt starts at Occator Works: the carrier is in range of that outpost, and its dock is in reach', await j(`campOutpostNear(${SCN}.camp) && campOutpostNear(${SCN}.camp).o.name === 'Occator Works'`));
  await t.run(300); await snap('1-start-in-range');
  await t.ev(`(() => { ${SCN}.camp.ore = 100; return 1; })()`); await t.run(500);
  const drawn = () => j(`${SCN}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text + ' | ' + r.suffix.text)`); // the rows of the open list as they are drawn: the words, and the word or two of state (src/campanelsdraw.js)
  const before = await drawn(), tgtLine = await j(`${SCN}.pnl.tgt.visible`);
  await key('KeyP'); await t.run(300); const shipRows = await drawn(), title = await j(`${SCN}.pnl.title.text`), yardAt = await j(`campPanelList(${SCN}.camp, 'ship').findIndex(r => r.open === 'yard')`), yardCap = yardAt >= 0 ? await j(`${SCN}.pnl.rows[${yardAt}].cap.visible && ${SCN}.pnl.rows[${yardAt}].cap.text`) : ''; await snap('2-ship-list-undocked'); await key('KeyP'); // P opens the ship list, P again closes it
  check('no list is drawn until its key is pressed (only the target\'s line under the radar), then P opens the ship list, and its "Dock and build" row shows the key of that part (U)', before.length === 0 && tgtLine === true && title === 'P   SHIP ORDERS' && (await j(`campPanelOpen(${SCN}.pn)`)) === '' && yardAt >= 0 && yardCap === (await j(`campKeyList('yard').key`)) && yardCap === 'U' && shipRows[yardAt].startsWith((await j(`campKeyRow('gyard').label`)) + '  >'), before.join(' | ') + ' // ' + title + ' // ' + shipRows.join(' // '));
  await key('KeyU'); await t.run(300); const yardRows = await drawn(), yardTitle = await j(`${SCN}.pnl.title.text`), yardOpen = await j(`campPanelOpen(${SCN}.pn)`); await snap('2-dock-list-undocked'); await key('KeyU'); // U opens the dock list directly, U again closes it
  const dockRow = yardRows.find(x => /^Dock at the outpost \|/.test(x)) || '';
  check('U opens the dock list directly, and U again closes it', yardOpen === 'yard' && yardTitle === (await j(`(() => { const p = campKeyList('yard'); return p.key + '   ' + p.title; })()`)) && (await j(`campPanelOpen(${SCN}.pn)`)) === '', yardTitle);
  check('the dock list undocked: the build rows are left out of it here (in a level with outposts ships are built docked), and the dock row is ready and names the outpost ("Occator Works")', yardRows.length > 0 && !yardRows.some(x => /^Build /.test(x)) && (await j(`campPanelList(${SCN}.camp, 'yard').every(r => r.when !== 'aboard')`)) === true && (await j(`campKeyVia('dock').id`)) === 'yard' && /\| Occator Works$/.test(dockRow), yardRows.join(' // '));
  await listOrder('dock'); // U, Down to "Dock at the outpost", Enter
  check('the dock row docks: the Campaign scene is paused and the ready room opens as that outpost', await settle(`game.scene.isActive('CampHub') && ${HUB}.hub && ${HUB}.look && ${HUB}.look.name === 'Occator Works'`) && await j(`${SCN}.scene.isPaused() && ${SCN}.docked === true && ${SCN}.camp.docked === 'ceres'`));
  await t.run(1200); await snap('3-dock-room-build');
  check('the room has the dock\'s five rows, BUILD first, the ore of the battle on its page', (await shown()).some(x => /^BUILD {2}- {2}OCCATOR WORKS$/.test(x)) && (await shown()).some(x => /^Ore in the store: 100$/.test(x)), (await shown()).join(' | '));
  await key('KeyF'); await key('KeyF'); await t.run(300); await snap('4-dock-room-built');
  check('F, F: two fighters are queued (50 ore), the page says so', await j(`${SCN}.camp.build.queue.length === 2 && ${SCN}.camp.ore === 50`) && (await shown()).some(x => /2 in the yard$/.test(x)), (await shown()).join(' | '));
  await t.ev(`(() => { ${SCN}.camp.carrier.hp = ${SCN}.camp.carrier.maxHp * 0.4; return 1; })()`); await key('Digit2'); await key('KeyR'); await t.run(300); await snap('5-dock-room-repair');
  check('REPAIR: R mends the hull for ore, the battle\'s hull is whole', await j(`${SCN}.camp.carrier.hp === ${SCN}.camp.carrier.maxHp && ${SCN}.camp.ore < 50`));
  await t.ev(`(() => { ${SCN}.camp.ore = 400; return 1; })()`); await key('Digit3'); await key('KeyU'); await t.run(300); await snap('6-dock-room-fabricator'); // 400: the Fabricator costs 300 since card space-game-ore-bay-bigger (the store holds 500)
  check('REFIT: U fits the Fabricator: the battle and the progress both have it', await j(`campHas(${SCN}.camp, 'fabricator') && ${SCN}.P.techs.includes('fabricator')`) && await j(`JSON.parse(localStorage.getItem('longhaul.campaign')).techs.includes('fabricator')`));
  await key('Digit5'); await t.run(1400); await snap('7-dock-room-undock');
  await key('KeyL');
  check('L undocks: the room is gone, the battle runs again, the carrier is free', await settle(`!game.scene.isActive('CampHub') && game.scene.isActive('Campaign') && !${SCN}.scene.isPaused() && ${SCN}.camp.docked === '' && ${SCN}.docked === false`));
  // away from every outpost: the Fabricator builds anywhere; the retreat line when hurt and alone
  await t.ev(`(() => { const C = ${SCN}.camp; C.carrier.x = 3000; C.carrier.y = 3000; C.carrier.vx = 0; C.carrier.vy = 0; C.ore = 100; return 1; })()`); await t.run(600);
  check('with the Fabricator, far from every outpost, Build a fighter is allowed (the answer is the order\'s)', await j(`campCheck(${SCN}.camp, 'build', 'fighter').ok`));
  await t.ev(`(() => { const C = ${SCN}.camp; C.techs = C.techs.filter(x => x !== 'fabricator'); C.bay.fighters = 0; C.bay.escorts = 0; C.build.queue.length = 0; C.launchQ.length = 0; C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'carrier') u.hp = 0; }); C.carrier.hp = C.carrier.maxHp * 0.2; return 1; })()`); await t.run(1200);
  const hudLine = await j(`${SCN}.hud.post.text`);
  check('hurt and alone, far from an outpost: the HUD says "Retreat to <place>: N s on Fast."', /^Retreat to [A-Za-z ]+: \d+ s on Fast\.$/.test(hudLine), hudLine);
  check('the ship says it too (a toast and the voice line) and the goal of the map is that place', await j(`campNavGoal(${SCN}.camp) && campNavGoal(${SCN}.camp).id === 'place:' + campRetreat(${SCN}.camp).o.id`));
  await snap('8-retreat-hud');
  await key('Tab'); await t.run(400); for (let i = 0; i < 8; i++) { await key('Minus'); } await t.run(600); await snap('9-map-whole-outposts'); // - zooms the map out to the whole system
  check('the map marks the outposts (a frame round the place); the list says the goal first', await j(`campMapMarks(${SCN}.camp, true).filter(m => m.outpost).map(m => m.id).sort().join()`) === 'ceres,earth,mars,vesta');
  await key('Tab');
  await key('KeyP'); await t.run(500); await snap('10-ship-list-hurt'); await key('KeyU'); await t.run(500); await snap('10-dock-list-hurt'); await key('KeyU'); // P the ship list, U from it the dock list, U again closes it
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN OUTPOST BOOT FAIL (${bad})` : '\nCAMPAIGN OUTPOST BOOT PASS');
process.exit(bad ? 1 : 0);
