// not in the smoke: one mission of the Campaign flown by hand as a player, in the real game (one Chrome, muted, through the test lock; card space-game-night-hunt-l2-l3)
// It boots the game with a save that stands at the mission, opens the ready room with K, reads the briefing (three screens), launches, and flies with the keys a player uses
// (the order lists, cards one-list-keys and list-shortcuts: Q opens the fleet list and W E R its parts (convoy, fighters, escorts), P the ship list and O I U its parts (autopilot, power, dock); Down to a row and Enter gives it; the target keys A D S X, the power keys J K L ;, Enter a missile, the arrows to fly, the map on Tab, Space held), then lets the autopilot carry the rest and writes down what the game says: the HUD line, the goal, the toasts.
//   node tests/camphunt-boot.mjs --level 2 --mission 1 [--secs 90] [--fight | --quickwin | --lose | --dock | --retreat | --panels | --replay]      the mission number is the one on the board (1 to 3)
// --replay: the mission before the next one is picked in the ready room as a REPLAY (Enter, Up, then R), briefed, flown (use --quickwin with it) and its debrief and the saved progress are read: the progress must not move
// --panels: every order row of every list given once in the flight (the key of the list the row is in, Down to the row, Enter), the stance rows, the target keys, the power keys, the missile, the map zoomed out to the whole system: what each one says (the toasts are written down at the end)
// --retreat: the wing is gone and the hull is at 30 percent: the HUD says where to retreat, the autopilot list's fast burn goes there, the dock list's dock row docks, the dock mends the hull (ore), Esc and the flight goes on
// --dock: after the burn, the dock list's dock row at the outpost of the mission (the ready room opens over the paused battle: its rows and words), then Esc and the flight goes on
// --lose: the cruiser is destroyed after the burn, with the wing out: the lost card, Enter (the mission again, from its brief), the pause card on Esc and its keys page on H, R from the pause
// --quickwin: the win is forced after the first seconds of flight (the score of the moment), to walk the cards that follow a mission quickly: the debrief, the level won card, the pick or the refit, the next level's room
// Without --fight the walk stops after the first 25 seconds of flight (keys, lists, map: well under five minutes); with it the mission is flown to its debrief and the ready room.
// Pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/hunt-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUNT_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const LEVEL = Number(arg('level', 2)), MISSION = Number(arg('mission', 1)), SECS = Number(arg('secs', 90)), FIGHT = process.argv.includes('--fight'), QUICK = process.argv.includes('--quickwin'), LOSE = process.argv.includes('--lose'), DOCK = process.argv.includes('--dock'), RETREAT = process.argv.includes('--retreat'), PANELS = process.argv.includes('--panels'), REPLAY = process.argv.includes('--replay');
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const note = s => console.log('  note ' + s);
const VK = { KeyQ: 81, KeyE: 69, KeyR: 82, KeyT: 84, KeyP: 80, KeyW: 87, KeyO: 79, KeyF: 70, KeyG: 71, KeyA: 65, KeyD: 68, KeyS: 83, KeyX: 88, KeyI: 73, KeyU: 85, KeyJ: 74, KeyK: 75, KeyL: 76, KeyM: 77, Comma: 188, Period: 190, Backslash: 220, BracketLeft: 219, BracketRight: 221, Backspace: 8, Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57, Enter: 13, Escape: 27, Tab: 9, Space: 32, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, ShiftLeft: 16, Equal: 187, Minus: 189 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, S = `game.scene.getScene('Campaign')`;
  const kd = (code, mods = 0) => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Space' ? ' ' : code === 'Semicolon' ? ';' : /^(Enter|Backspace|Arrow)/.test(code) ? code : code.replace(/^(Key|Digit)/, '').toLowerCase(), modifiers: mods });
  const key = async (code, wait = 50, mods = 0) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code, mods))); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code, mods))); await t.run(wait); };
  const hold = async (code, ms) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); await t.run(ms); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); await t.run(50); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `hunt-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture hunt-' + LEVEL + MISSION + '-' + name); };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.map.filter(o => o.text).map(o => o.text)) : Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);
  const hud = () => j(`(() => { const s = ${S}; const out = []; if (s.hud) Object.keys(s.hud).forEach(k => { const o = s.hud[k]; if (o && o.text && o.visible !== false) out.push(k + '=' + String(o.text).replace(/\\n/g, ' / ')); }); return out; })()`);
  const card = () => j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`);
  const state = () => j(`({ mode: ${S}.mode, result: ${S}.camp.result, t: Math.round(${S}.camp.t / 1000), clock: Math.round(campMissionClock(${S}.camp)), obj: campObjective(${S}.camp), hull: Math.round(${S}.camp.carrier.hp), shield: Math.round(${S}.camp.shield), aliens: campAliens(${S}.camp).length, wing: campWing(${S}.camp).length, x: Math.round(${S}.camp.carrier.x), y: Math.round(${S}.camp.carrier.y) })`);

  // an order is given through the list its row is in (cards one-list-keys and list-shortcuts): that list's own key (Q W E R, P O I U), Down to the row, Enter; a list with no key of its own (the stances) is opened from its parent:
  // the parent's key, Down to the part's row, Enter. The list is read from the key table (campKeyVia) and the row's place from the list of THIS mission in the page, never a letter or a number written here
  // listWay(row): { list, keys: [[the key to press, how many Downs after it], ...] }, or null when the row is not in this mission's list;   listGo(row): the list open with the highlight on the row (not given);   listOrder(row): and Enter
  const listWay = row => j(`(() => { const C = ${S}.camp, id = ${JSON.stringify(row)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
    if (p.code) return { list: p.id, keys: [[p.code, at]] };
    const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? { list: p.id, keys: [[up.code, pat], ['Enter', at]] } : null; })()`);
  const listGo = async row => {
    if ((await j(`${S}.mode`)) !== 'play') return false; // a card has the keys: Enter would be the card's
    const way = await listWay(row); if (!way) return false; // the row is not in this mission's list
    for (let n = 0; n < 6 && (await j(`campPanelOpen(${S}.pn)`)); n++) await key('Escape'); // Esc goes back ONE step (a target sub-list to its list, a list a row opened to Q or P; a list its own key opened closes): pressed until every list is closed (it pauses only when none is open)
    for (const [code, downs] of way.keys) { await key(code); const cur = await j(`${S}.pn.at`), n = await j(`(() => { const o = campPanelOpen(${S}.pn); return o ? campPanelList(${S}.camp, o).length : 0; })()`); for (let i = 0, d = n ? ((downs - cur) % n + n) % n : 0; i < d; i++) await key('ArrowDown'); } // a list can open with its highlight on its first usable row (start: 'usable', All squads): Down only the difference
    return true;
  };
  const listOrder = async row => {
    if (!(await listGo(row))) return false; await key('Enter');
    if (await j(`!!${S}.pn.pick`)) await key('Enter'); // a row that needs a target (Attack, Escort, Mine ore) with several to choose from opens a target sub-list (src/camppick.js): Enter takes the highlighted one, the nearest; one candidate is taken at once, none: as it always was
    for (let n = 0; n < 6 && (await j(`campPanelOpen(${S}.pn)`)); n++) await key('Escape'); // an order that is refused leaves the list open, and so does a power row: Esc until it is closed, the keys go back to the ship
    return true;
  };
  const listRows = () => j(`${S}.pnl.rows.filter(r => r.name.visible).map(r => r.name.text + (r.suffix.text ? ' [' + r.suffix.text + ']' : ''))`); // the rows of the open list as they are drawn (src/campanelsdraw.js)
  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let l = 1; l <= LEVEL; l++) for (let m = 1; m <= 3; m++) if (l < LEVEL || m < MISSION) results[l + '.' + m] = res;
  const techs = LEVEL === 1 ? [] : LEVEL === 2 ? ['shield'] : ['shield', 'plating'];
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: LEVEL, mission: MISSION - 1, techs, ore: 60, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  await key('KeyK');
  check('K on the title opens the ready room', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`));
  await t.run(900); note('board: ' + (await shown()).join(' | ').slice(0, 600)); await snap('1-board');
  if (REPLAY) { await key('Enter'); await t.run(500); await key('ArrowUp'); await key('KeyR'); } else await key('Enter'); // the board's overlay (Enter), the mission before the next (Up), R picks it as a replay and opens its briefing (card space-game-ready-room-simple)
  await t.run(700);
  for (let s = 0; s < 3; s++) {
    const b = await shown(); note('briefing screen ' + (s + 1) + ': ' + b.join(' | ').slice(0, 900)); await snap('2-brief-' + (s + 1));
    if (s < 2) { await key('Enter'); await t.run(500); }
  }
  await key('KeyL'); // L launches from any screen of the briefing (Enter goes on to the next one: the ready room is four rows and an overlay now, card space-game-ready-room-simple)
  const warp = await settle(`game.scene.isActive('CampWarp')`, 30);
  note('warp cinematic for this start: ' + warp);
  if (warp) { await t.run(1500); await snap('3-warp'); await key('Enter'); }
  check('the Campaign scene starts on the mission', await settle(`game.scene.isActive('Campaign') && ${S}.camp`, 200)); // (the fade out of the room and in to the flight takes a few seconds of the stepped clock)
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { note('mode ' + await j(`${S}.mode`) + ': ' + await card()); await snap('4-card-' + i); await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');
  await t.ev(`(() => { window.__toasts = []; const t0 = toast; toast = function (sc, text) { try { window.__toasts.push(Math.round((sc.camp ? sc.camp.t : 0) / 1000) + 's  ' + String(text).replace(/\\n/g, ' / ')); } catch (e) { /* the log only */ } return t0.apply(this, arguments); }; return 1; })()`); // what the game tells the player, in order
  await t.run(900); await snap('5-flight'); note('HUD: ' + (await hud()).join(' | ').slice(0, 700)); note('state: ' + JSON.stringify(await state()));

  // keys a player uses
  const x0 = await j(`${S}.camp.carrier.x`), y0 = await j(`${S}.camp.carrier.y`), r0 = await j(`${S}.camp.carrier.rot`);
  await hold('ArrowUp', 1500); const x1 = await j(`${S}.camp.carrier.x`), y1 = await j(`${S}.camp.carrier.y`); // the arrows fly (no letter does: A D S X are the target's keys)
  check('Up thrusts the cruiser', Math.hypot(x1 - x0, y1 - y0) > 5, 'moved ' + Math.round(Math.hypot(x1 - x0, y1 - y0)) + ' px');
  await hold('ArrowRight', 600); check('Right turns it', Math.abs((await j(`${S}.camp.carrier.rot`)) - r0) > 0.05);
  await hold('ArrowLeft', 600);
  await key('Tab'); await t.run(500); await snap('6-map'); note('map open: ' + await j(`!!(${S}.map && ${S}.map.open) || !!${S}.mapOpen`)); await key('Tab'); await t.run(300);
  check('no list is on the screen until its key is pressed (nothing at all: no target is picked, so the corner is empty)', (await j(`campPanelOpen(${S}.pn)`)) === '' && (await j(`!${S}.pnl.title.visible && ${S}.pnl.rows.every(r => !r.name.visible)`)) === true); await snap('7-no-list');
  const keyed = await j(`CAMP_PANELS.panels.filter(p => p.code).map(p => [p.code, p.id, p.key + '   ' + p.title, p.parent || ''])`), pinned = { squads: 'W   ALL SQUADS', power: 'P   POWER' }; // (Q picks all three pilots and E R T are order keys, no lists; P opens the power list since card space-game-p-opens-power)
  check('the key table has four lists with a key of their own: W All squads, P power, O autopilot, U dock', keyed.map(x => x[0]).join() === 'KeyW,KeyP,KeyO,KeyU' && keyed.every(x => VK[x[0]]), keyed.map(x => x[0]).join());
  for (const [k, id, title, parent] of keyed) { // each list: its key opens it directly at the first row (from no list), Up goes round to the last row (a long list scrolls), its key closes it
    await key(k); await t.run(500); await snap('7-list-' + id); const head = await j(`${S}.pnl.title.text`), n = await j(`campPanelList(${S}.camp, ${JSON.stringify(id)}).length`); note(id + ' list: ' + head + ' / ' + (await listRows()).join(' | '));
    check(k.slice(3) + ' opens the ' + id + ' list at its first row, headed ' + title, (await j(`campPanelOpen(${S}.pn)`)) === id && head === title && (!pinned[id] || head === pinned[id]) && (await j(`${S}.pn.at`)) === 0 && (await j(`${S}.pnl.keys.text`)) === (await j(`uiText(${JSON.stringify(parent ? 'camp.ui.listkeysub' : 'camp.ui.listkeys')}, { key: ${JSON.stringify(k.slice(3))} })`)), head + ' / ' + (await j(`${S}.pnl.keys.text`)));
    await key('ArrowUp'); await t.run(500); await snap('7-list-' + id + '-end'); note(id + ' list, the end: ' + (await listRows()).join(' | '));
    check('Up from the first row goes round to the last (' + n + ' rows)', (await j(`${S}.pn.at`)) === n - 1 && (await j(`${S}.pn.top`)) === Math.max(0, n - (await j('CAMP_PANELS.show'))));
    await key(k); await t.run(300); check(k.slice(3) + ' again closes it', (await j(`campPanelOpen(${S}.pn)`)) === '');
  }
  // the autopilot: the autopilot list's "Fast burn to the goal" (O, Down to it, Enter; its "Fly to the goal" flies there at regular speed)
  await listOrder('burn'); await t.run(1500);
  note('after the fast burn row: nav ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 160)) + ' state ' + JSON.stringify(await state()));
  await t.run(9000); const st1 = await state(); note('9 s later: ' + JSON.stringify(st1)); await snap('9-arrived'); note('HUD: ' + (await hud()).join(' | ').slice(0, 700));

  if (PANELS) {
    let mark = 0; const say = async what => { await t.run(300); const all = await j('window.__toasts'); note(what + ' -> ' + (all.slice(mark).join(' || ') || '(no toast)')); mark = all.length; };
    // every order row of the lists, once (a row that is not in this mission's list is written down as left out), and the direct keys between them: the fleet's rows (launch, attack, escort, guard, recall, mine, a convoy order, a stance), the target's keys (S D A X),
    // the ship's rows (fly to the target, the two build rows, dock, the emergency shields, the blink), the power keys (J K L ;). A list of [what to do, what it is]: a string is a direct key, [row] is an order given through the list it is in
    const via = async row => { const w = await listWay(row); return w ? w.keys.map(k => k[0].replace(/^Key/, '') + (k[1] ? ', Down x ' + k[1] : '')).join(', ') + ', Enter' : '(no way)'; }; // the keys of an order as they were pressed
    const done = [];
    for (const [act, what] of [[['launch'], 'launch'], [['attack'], 'attack (the fighters)'], [['escort'], 'escort (the convoy)'], [['guard'], 'guard'], [['recall'], 'recall (the wing is out)'], [['mine'], 'mine'], [['keep'], 'stance: keep distance'], [['ctuck'], 'convoy: tuck in'],
      ['Backslash', '\\ nearest threat'], ['BracketRight', '] next enemy'], ['BracketLeft', '[ last enemy'], ['KeyW', 'W next who'], ['KeyQ', 'Q last who'], ['KeyP', 'P next friendly'], ['KeyO', 'O last friendly'], [['target'], 'fly to the target'], [['burntarget'], 'fast burn to the target'], ['KeyX', 'X clear the target'],
      [['buildf'], 'build a fighter'], [['builde'], 'build an escort'], [['dock'], 'dock (away from it)'],
      ['KeyJ', 'J shields pip'], ['KeyK', 'K engines pip'], ['KeyL', 'L weapons pip'], [['emergency'], 'emergency shields'], [['balance'], 'balance (a row of the power list: the semicolon is gone)'], [['blink'], 'blink'],
      ['Digit1', '1 (no key of the flight)'], ['KeyF', 'F (no key of the flight)'], ['KeyG', 'G (no key of the flight)']]) {
      mark = await j('window.__toasts.length');
      if (typeof act === 'string') { await key(act); await say(what); }
      else { done.push(act[0]); const keys = await via(act[0]), gave = await listOrder(act[0]); await say(keys + ': ' + what + (gave ? '' : ' (the row is left out of this mission\'s list)')); }
      await t.run(1200);
    }
    check('a digit and a letter that is no key of the table (1 F G) opened no list', (await j(`campPanelOpen(${S}.pn)`)) === '');
    for (const id of await j(`CAMP_PANELS.panels.map(p => p.id)`)) for (const r of await j(`campPanelList(${S}.camp, ${JSON.stringify(id)}).map(r => ({ id: r.id, label: r.label, open: r.open || '', stay: !!r.stay }))`)) { // the rows not given above (the other stances and convoy orders, each part's own orders, the power rows), but for the two that fly to the goal: they were given before. A row that opens a part gives no order: its part's rows are given
      if (r.open || done.indexOf(r.id) >= 0 || r.id === 'goal' || r.id === 'burn') continue;
      mark = await j('window.__toasts.length'); const keys = await via(r.id); await listOrder(r.id); await say(keys + ': ' + r.label + ' (the ' + id + ' list)'); await t.run(600);
    }
    // the shortcut keys (card list-shortcuts): E opens the red squad's list from no list, Left goes back to the fleet list onto the Red squad row, Enter on it opens the part again; O, Enter is a pip to the shields and the power list stays open
    await key('KeyE'); await t.run(300); const eOpen = await j(`campPanelOpen(${S}.pn)`); await key('ArrowLeft'); await t.run(300);
    check('E opens the red squad list directly; Left goes back to the fleet list with the highlight on the Red squad row; Enter on that row opens the list again', eOpen === 'red' && (await j(`campPanelOpen(${S}.pn)`)) === 'fleet' && (await j(`${S}.pn.at`)) === (await j(`campPanelList(${S}.camp, 'fleet').findIndex(r => r.open === 'red')`)) && (await key('Enter'), await t.run(300), await j(`campPanelOpen(${S}.pn)`)) === 'red' && (await j(`${S}.pn.at`)) === 0, eOpen);
    await key('KeyP'); await t.run(200); const pOpen = await j(`campPanelOpen(${S}.pn)`); await key('Escape'); await j(`campOrder(${S}.camp, 'balance', '', 'key')`); await t.run(200); const pw0 = await j(`${S}.camp.power.p`); await key('KeyP'); for (let i = 0, n = await j(`campPanelList(${S}.camp, 'power').findIndex(r => r.id === 'shields')`); i < n; i++) await key('ArrowDown'); await key('Enter'); await t.run(300); const pw1 = await j(`${S}.camp.power.p`);
    check('P from the red squad list closes it and opens the ship list (one list at a time); I opens the power list directly; Enter on the shields row gives a pip and leaves the list open', pOpen === 'ship' && (await j(`campPanelOpen(${S}.pn)`)) === 'power' && pw1[1] === pw0[1] + 1, JSON.stringify([pw0, pw1])); await snap('11-power'); await key('Escape'); await j(`campOrder(${S}.camp, 'balance', '', 'key')`); await t.run(200);
    await listGo('free'); await t.run(400); await snap('11-stances'); note('the stance list (Q, Down to the Stance row, Enter): ' + (await j(`${S}.pnl.title.text`)) + ' / ' + (await listRows()).join(' | ')); await key('Escape'); note('Esc from the stance list goes back to the fleet list (it came from a row of Q): ' + await j(`campPanelOpen(${S}.pn)`)); await key('Escape'); // the stances are a part of the fleet list with no key of its own: the first Esc goes back to Q, the second closes it
    mark = await j('window.__toasts.length'); const orbitKeys = await via('orbit'); await listOrder('orbit'); await say(orbitKeys + ' (the stance list, "' + (await j(`campKeyRow('orbit').label`)) + '")'); await t.run(600);
    check('the stance rows are plain rows of the stance list: the one picked is in force at once, and no list is left open', (await j(`${S}.camp.stance`)) === 'orbit' && (await j(`campPanelOpen(${S}.pn)`)) === '');
    mark = await j('window.__toasts.length'); await key('Enter'); await say('Enter missile, with no list open (nothing big in reach)');
    await key('Tab'); await t.run(400); for (let i = 0; i < 8; i++) await key('Minus', 30); await t.run(900); await snap('12-map-whole'); for (let i = 0; i < 8; i++) await key('Equal', 30); await t.run(400); await snap('13-map-zoom'); await key('Backspace'); await key('Tab'); await t.run(300); // - zooms the map out to the whole system, Backspace fits the level again
    note('mode after the map: ' + await j(`${S}.mode`));
  }
  if (RETREAT) {
    await t.ev(`(() => { const C = ${S}.camp; C.ships.filter(u => u.team === 'earth' && u.kind !== 'carrier').forEach(u => { u.hp = 0; }); C.bay.fighters = 0; C.bay.escorts = 0; C.carrier.hp = Math.round(C.carrier.maxHp * 0.3); return 1; })()`); await t.run(900);
    note('HUD at 30 percent, no wing: ' + (await hud()).filter(x => /^(post|obj|arrow|bay|hull)=/.test(x)).join(' | ')); await snap('11-low');
    await listOrder('burn'); await t.run(1500); note('nav now: ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 200)));
    for (let i = 0; i < 12 && (await j(`!!(${S}.camp.nav && ${S}.camp.nav.on)`)); i++) await t.run(2000);
    note('after the burn: ' + JSON.stringify(await state()) + ' | ' + (await hud()).filter(x => /^(post|obj|arrow)=/.test(x)).join(' | ')); await snap('12-there');
    await listOrder('dock'); await settle(`game.scene.isActive('CampHub')`, 30); await t.run(900);
    note('docked: ' + (await shown()).join(' | ').slice(0, 900)); await snap('13-docked-low');
    await key('Digit2'); await t.run(700); note('repair page: ' + (await shown()).join(' | ').slice(0, 600)); await snap('13b-repair-page');
    await key('KeyR'); await t.run(900); note('after R on the repair page: ' + (await shown()).join(' | ').slice(0, 500) + ' | hull ' + await j(`Math.round(${S}.camp.carrier.hp)`) + ' ore ' + await j(`Math.floor(${S}.camp.ore)`)); await snap('14-mended');
    await key('Escape'); await t.run(900); note('after Esc: mode ' + await j(`${S}.mode`) + ' docked ' + await j(`${S}.docked`) + ' hull ' + await j(`Math.round(${S}.camp.carrier.hp)`));
  }
  if (DOCK) {
    note('outposts: ' + await j(`campOutposts(${S}.camp.level).map(o => o.id + ' ' + o.name + ' ' + Math.round(campDist(${S}.camp.carrier, o))).join(' | ')`));
    await t.ev(`(() => { const C = ${S}.camp, o = campOutposts(C.level).slice().sort((a, b) => campDist(C.carrier, a) - campDist(C.carrier, b))[0]; C.carrier.x = o.x + (o.r || 60) + 120; C.carrier.y = o.y; C.carrier.vx = 0; C.carrier.vy = 0; return 1; })()`); await t.run(600); // the cruiser beside the nearest outpost (the arrival circle is 300 km wide: the relay is 250 km off)
    await t.run(500); await listGo('dock'); await t.run(400); await snap('11-dock-list'); await key('Escape'); note('dock list dock row: ' + await j(`(typeof campPanelRows === 'function' ? campPanelRows(${S}.camp, (campKeyVia('dock') || {}).id) : []).filter(r => r.id === 'dock').map(r => JSON.stringify(r)).join(' ')`).then(v => String(v).slice(0, 300)));
    await listOrder('dock'); await settle(`game.scene.isActive('CampHub')`, 30); await t.run(900);
    note('docked: ' + (await shown()).join(' | ').slice(0, 800)); await snap('12-docked');
    await key('Escape'); await t.run(900);
    note('after Esc: Campaign ' + await j(`game.scene.isActive('Campaign')`) + ' hub ' + await j(`game.scene.isActive('CampHub')`) + ' mode ' + await j(`${S}.mode`) + ' docked ' + await j(`${S}.docked`));
    await t.run(1200); await snap('13-undocked'); note('HUD: ' + (await hud()).join(' | ').slice(0, 400));
  }
  if (LOSE) {
    await listOrder('launch'); await t.run(2500);
    await t.ev(`(() => { const C = ${S}.camp; campHurt(C, C.carrier, 99999, 'alien-0'); return 1; })()`);
    await settle(`${S}.mode === 'lost'`, 60); note('lost card: ' + await card()); await snap('11-lost');
    await key('Enter'); await t.run(1500);
    note('after Enter on the lost card: scene ' + await j(`['CampHub', 'Campaign', 'Title', 'CampWarp'].filter(k => game.scene.isActive(k)).join()`) + ' mode ' + await j(`${S}.mode`) + ' via ' + await j(`${S}.via`));
    for (let i = 0; i < 3 && (await j(`${S}.mode`)) !== 'play'; i++) { note('card: ' + await card()); await snap('12-retry-' + i); await key('Enter'); await t.run(900); }
    check('the mission is flown again, in play, with the wing in the bay and the hull whole', (await j(`${S}.mode`)) === 'play' && (await state()).hull === (await j(`${S}.camp.carrier.maxHp`)), JSON.stringify(await state()));
    await t.run(900); note('HUD after the retry: ' + (await hud()).join(' | ').slice(0, 500));
    await key('Escape'); await t.run(500); note('pause: ' + await j(`['Pause', 'Campaign'].filter(k => game.scene.isActive(k)).join()`) + ' | ' + await j(`(game.scene.getScene('Pause').children ? game.scene.getScene('Pause').children.list.filter(o => o.text).map(o => o.text) : [])`).then(v => String(v).slice(0, 600))); await snap('13-pause');
    await key('KeyH'); await t.run(500); await snap('14-keys-page'); await key('Escape'); await t.run(300); await key('Escape'); await t.run(300);
    note('after Esc Esc: ' + await j(`['Pause', 'Campaign', 'Title'].filter(k => game.scene.isActive(k)).join()`) + ' mode ' + await j(`${S}.mode`));
  }
  if (QUICK) {
    await t.ev(`(() => { const C = ${S}.camp; C.result = 'won'; C.why = 'quick'; C.score = campScore(C); ${S}.missionWon(); return 1; })()`);
    await settle(`${S}.mode === 'debrief'`, 60); note('debrief: ' + await card()); await snap('11-debrief');
    for (let i = 0; i < 8 && (await j(`game.scene.isActive('Campaign')`)); i++) {
      const m = await j(`${S}.mode`); note('Enter on mode ' + m + ' (' + (await card()).slice(0, 300) + ')'); await snap('12-card-' + i);
      if (m === 'pick') await key('Digit1'); else if (m === 'refit') { await key('Digit1'); await t.run(300); await key('Enter'); } else await key('Enter'); // the refit: the tech is marked with its digit, Enter takes it
      await t.run(1200);
    }
    const sv = await j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`); note('save: ' + JSON.stringify({ level: sv.level, mission: sv.mission, techs: sv.techs, ore: sv.ore, bonus: sv.bonus, revealed: sv.revealed, results: Object.keys(sv.results || {}).join() }));
    const where = await j(`['CampHub', 'Campaign', 'Title', 'CampWarp'].filter(k => game.scene.isActive(k)).join()`); note('then the scene is ' + where);
    if (where === 'CampHub') { await t.run(900); note('hub board: ' + (await shown()).join(' | ').slice(0, 700)); await snap('13-hub-next'); await key('Enter'); await t.run(700); note('next briefing: ' + (await shown()).slice(0, 12).join(' | ').slice(0, 500)); await snap('14-next-brief'); }
  }
  if (FIGHT) {
    await listOrder('launch'); await t.run(800); // the wing out
    const drive = async secs => {
      for (let s = 0; s < secs; s += 5) {
        await t.ev(`(() => { const C = ${S}.camp; if (C.result) return 0; const g = campNavGoal(C); if (g) { const row = campNavRows(C).find(r => r.id === 'goal') || g; if (!C.nav || !C.nav.on) campNavGo(C, row); } ${S}.k.SPACE = { isDown: campAliens(C).some(u => Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) < 700) }; return 1; })()`);
        if (!drive.mapped && (await j(`campAliens(${S}.camp).length`)) > 0) { // the first raid is on: the Tab map in a fight (its list, its legend, its marks) and the ship computer's view of it
          drive.mapped = true; await key('Tab'); await t.run(500); await snap('9-map-in-raid');
          note('map rows in the raid: ' + await j(`campNavRows(${S}.camp).map(r => r.group + ':' + r.name).join(' | ')`).then(v => String(v).slice(0, 700)));
          note('map legend: ' + await j(`(${S}.mp && ${S}.mp.legend ? [].concat(${S}.mp.legend).filter(o => o && o.text).map(o => o.text).join(' | ') : (${S}.mp ? Object.keys(${S}.mp).join() : 'no map'))`).then(v => String(v).slice(0, 500)));
          note('ship computer is told: ' + await j(`campSummary(${S}.camp)`).then(v => String(v).slice(0, 700)));
          await key('Tab'); await t.run(300);
        }
        if (s % 10 === 5) await listOrder('attack'); // attack
        await t.run(5000);
        if ((s + 5) % 20 === 0) await snap('fight-' + (s + 5)); // a picture every 20 s of the fight: the pirates, the neutral miners, the wing
        if (s % 15 === 10) { const q = await state(); note('t+' + (s + 5) + ': ' + JSON.stringify(q) + ' | HUD ' + (await hud()).filter(x => /goal|obj|toast|say/i.test(x)).join(' | ').slice(0, 300)); }
        if (await j(`${S}.camp.result || ${S}.mode !== 'play'`)) break;
      }
    };
    await drive(SECS); await settle(`${S}.mode === 'debrief' || ${S}.mode === 'lost'`, 60); await snap('10-after');
    note('TOASTS: ' + (await j('window.__toasts')).join(' || '));
    const st = await state(); note('state: ' + JSON.stringify(st));
    check('the mission was won by play (the debrief is up)', st.mode === 'debrief', JSON.stringify(st));
    if (st.mode === 'debrief') {
      note('debrief: ' + await card()); await snap('11-debrief');
      await key('Enter'); await t.run(1500);
      const where = await j(`['CampHub', 'Campaign', 'Title'].filter(k => game.scene.isActive(k)).join()`);
      note('after the debrief Enter: scene ' + where + (where === 'Campaign' ? ' mode ' + await j(`${S}.mode`) : ''));
      if (where === 'Campaign') { for (let i = 0; i < 4 && (await j(`game.scene.isActive('Campaign')`)) && (await j(`${S}.mode`)) !== 'end'; i++) { note('mode ' + await j(`${S}.mode`) + ': ' + await card()); await snap('12-card-' + i); await key('Enter'); await t.run(1200); } }
      const sv = await j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`); note('save: ' + JSON.stringify({ level: sv.level, mission: sv.mission, revealed: sv.revealed, results: Object.keys(sv.results || {}).join(), found: sv.found }));
      if (await j(`game.scene.isActive('CampHub')`)) { await t.run(800); note('hub board now: ' + (await shown()).join(' | ').slice(0, 500)); await snap('13-back'); }
    }
  }
  if (!FIGHT) note('TOASTS: ' + (await j('window.__toasts')).join(' || '));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nHUNT WALK ${LEVEL}.${MISSION} FAIL (${bad})` : `\nHUNT WALK ${LEVEL}.${MISSION} DONE`);
process.exit(bad ? 1 : 0);
