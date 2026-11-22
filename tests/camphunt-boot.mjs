// not in the smoke: one mission of the Campaign flown by hand as a player, in the real game (one Chrome, muted, through the test lock; card space-game-night-hunt-l2-l3)
// It boots the game with a save that stands at the mission, opens the ready room with K, reads the briefing (three screens), launches, and flies with the keys a player uses
// (one list per hand, card one-list-keys: Q opens the fleet orders and P the ship orders, Down to a row and Enter gives it; the target keys A D S X, the power keys J K L ;, Enter a missile, the arrows to fly, the map on Tab, Space held), then lets the autopilot carry the rest and writes down what the game says: the HUD line, the goal, the toasts.
//   node tests/camphunt-boot.mjs --level 2 --mission 1 [--secs 90] [--fight | --quickwin | --lose | --dock | --retreat | --panels | --replay]      the mission number is the one on the board (1 to 3)
// --replay: the mission before the next one is picked in the ready room as a REPLAY (Enter, Up, then R), briefed, flown (use --quickwin with it) and its debrief and the saved progress are read: the progress must not move
// --panels: every row of the fleet list and the ship list given once in the flight (Q or P, Down to the row, Enter), the stance rows, the target keys, the power keys, the missile, the map zoomed out to the whole system: what each one says (the toasts are written down at the end)
// --retreat: the wing is gone and the hull is at 30 percent: the HUD says where to retreat, the ship list's fast burn goes there, its dock row docks, the dock mends the hull (ore), Esc and the flight goes on
// --dock: after the burn, the ship list's dock row at the outpost of the mission (the ready room opens over the paused battle: its rows and words), then Esc and the flight goes on
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
const VK = { KeyQ: 81, KeyE: 69, KeyR: 82, KeyP: 80, KeyW: 87, KeyA: 65, KeyD: 68, KeyS: 83, KeyX: 88, KeyI: 73, KeyU: 85, KeyJ: 74, KeyK: 75, KeyL: 76, KeyM: 77, Semicolon: 186, Backspace: 8, Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57, Enter: 13, Escape: 27, Tab: 9, Space: 32, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, ShiftLeft: 16, Equal: 187, Minus: 189 };

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

  // an order is given through its list (card one-list-keys): the list's key (Q the fleet's, P the ship's), Down to the row, Enter. The row's place is read from the list of THIS mission in the page, never a number written here
  const listOrder = async (id, row) => {
    if ((await j(`${S}.mode`)) !== 'play') return false; // a card has the keys: Enter would be the card's
    const at = await j(`campPanelList(${S}.camp, ${JSON.stringify(id)}).findIndex(r => r.id === ${JSON.stringify(row)})`); if (at < 0) return false; // the row is not in this mission's list
    if (await j(`campPanelOpen(${S}.pn)`)) await key('Escape'); // an open list is closed first (Esc pauses only when none is open)
    await key(await j(`CAMP_PANELS.panels.find(p => p.id === ${JSON.stringify(id)}).code`)); for (let i = 0; i < at; i++) await key('ArrowDown'); await key('Enter');
    if (await j(`campPanelOpen(${S}.pn)`)) await key('Escape'); // an order that is refused leaves the list open: it is closed, the keys go back to the ship
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
  check('no list is on the screen until its key is pressed: only the target\'s line under the radar', (await j(`campPanelOpen(${S}.pn)`)) === '' && (await j(`!${S}.pnl.title.visible && ${S}.pnl.rows.every(r => !r.name.visible) && ${S}.pnl.tgt.visible`)) === true, await j(`${S}.pnl.tgt.text`)); await snap('7-no-list');
  for (const [k, id, title] of [['KeyQ', 'fleet', 'Q   FLEET ORDERS'], ['KeyP', 'ship', 'P   SHIP ORDERS']]) { // each list: its key opens it at the first row, Up goes round to the last row (a long list scrolls), its key closes it
    await key(k); await t.run(500); await snap('7-list-' + id); const head = await j(`${S}.pnl.title.text`), n = await j(`campPanelList(${S}.camp, ${JSON.stringify(id)}).length`); note(id + ' list: ' + head + ' / ' + (await listRows()).join(' | '));
    check(k.slice(3) + ' opens the one list of ' + id + ' orders at its first row', (await j(`campPanelOpen(${S}.pn)`)) === id && head === title && (await j(`${S}.pn.at`)) === 0);
    await key('ArrowUp'); await t.run(500); await snap('7-list-' + id + '-end'); note(id + ' list, the end: ' + (await listRows()).join(' | '));
    check('Up from the first row goes round to the last (' + n + ' rows)', (await j(`${S}.pn.at`)) === n - 1 && (await j(`${S}.pn.top`)) === Math.max(0, n - (await j('CAMP_PANELS.show'))));
    await key(k); await t.run(300); check(k.slice(3) + ' again closes it', (await j(`campPanelOpen(${S}.pn)`)) === '');
  }
  // the autopilot: the ship list's "Fast burn to the goal" (its "Fly to the goal" flies there at regular speed)
  await listOrder('ship', 'burn'); await t.run(1500);
  note('after the fast burn row: nav ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 160)) + ' state ' + JSON.stringify(await state()));
  await t.run(9000); const st1 = await state(); note('9 s later: ' + JSON.stringify(st1)); await snap('9-arrived'); note('HUD: ' + (await hud()).join(' | ').slice(0, 700));

  if (PANELS) {
    let mark = 0; const say = async what => { await t.run(300); const all = await j('window.__toasts'); note(what + ' -> ' + (all.slice(mark).join(' || ') || '(no toast)')); mark = all.length; };
    // every row of the two lists, once (a row that is not in this mission's list is written down as left out), and the direct keys between them: the fleet's rows (launch, attack, escort, guard, recall, mine, a convoy order, a stance), the target's keys (S D A X),
    // the ship's rows (fly to the target, the two build rows, dock, the emergency shields, the blink), the power keys (J K L ;). A list of [what to do, what it is]: a string is a direct key, [list, row] is an order given through its list
    const done = [];
    for (const [act, what] of [[['fleet', 'launch'], 'launch'], [['fleet', 'attack'], 'attack'], [['fleet', 'escort'], 'escort'], [['fleet', 'guard'], 'guard'], [['fleet', 'recall'], 'recall (the wing is out)'], [['fleet', 'mine'], 'mine'], [['fleet', 'keep'], 'stance: keep distance'], [['fleet', 'ctuck'], 'convoy: tuck in'],
      ['KeyS', 'S nearest threat'], ['KeyD', 'D next target'], ['KeyA', 'A last target'], [['ship', 'target'], 'fly to the target'], [['ship', 'burntarget'], 'fast burn to the target'], ['KeyX', 'X clear the target'],
      [['ship', 'buildf'], 'build a fighter'], [['ship', 'builde'], 'build an escort'], [['ship', 'dock'], 'dock (away from it)'],
      ['KeyJ', 'J shields pip'], ['KeyK', 'K engines pip'], ['KeyL', 'L weapons pip'], [['ship', 'emergency'], 'emergency shields'], ['Semicolon', '; balance'], [['ship', 'blink'], 'blink'],
      ['Digit1', '1 (no key of the flight any more)'], ['KeyE', 'E (no key of the flight any more)'], ['KeyU', 'U (no key of the flight any more)']]) {
      mark = await j('window.__toasts.length');
      if (typeof act === 'string') { await key(act); await say(what); }
      else { done.push(act[1]); const gave = await listOrder(act[0], act[1]); await say((act[0] === 'fleet' ? 'Q' : 'P') + ', Down to the row, Enter: ' + what + (gave ? '' : ' (the row is left out of this mission\'s list)')); }
      await t.run(1200);
    }
    for (const id of ['fleet', 'ship']) for (const r of await j(`campPanelList(${S}.camp, ${JSON.stringify(id)}).map(r => ({ id: r.id, label: r.label }))`)) { // the rows not given above (the other stances and convoy orders), but for the two that fly to the goal: they were given before
      if (done.indexOf(r.id) >= 0 || r.id === 'goal' || r.id === 'burn') continue;
      mark = await j('window.__toasts.length'); await listOrder(id, r.id); await say((id === 'fleet' ? 'Q' : 'P') + ', Down to the row, Enter: ' + r.label); await t.run(600);
    }
    await key('KeyQ'); await key('ArrowUp'); await t.run(400); await snap('11-stances'); note('the end of the fleet list (the stances): ' + (await listRows()).join(' | ')); await key('Escape'); // Up from the first row goes round to the last: the stance rows are on the screen; Esc closes the list
    mark = await j('window.__toasts.length'); await listOrder('fleet', 'orbit'); await say('Q, Down to "Stance: orbit the target", Enter'); await t.run(600);
    check('the stance rows are plain rows: the one picked is in force at once, and no list is left open', (await j(`${S}.camp.stance`)) === 'orbit' && (await j(`campPanelOpen(${S}.pn)`)) === '');
    mark = await j('window.__toasts.length'); await key('Enter'); await say('Enter missile, with no list open (nothing big in reach)');
    await key('Tab'); await t.run(400); for (let i = 0; i < 8; i++) await key('Minus', 30); await t.run(900); await snap('12-map-whole'); for (let i = 0; i < 8; i++) await key('Equal', 30); await t.run(400); await snap('13-map-zoom'); await key('Backspace'); await key('Tab'); await t.run(300); // - zooms the map out to the whole system, Backspace fits the level again
    note('mode after the map: ' + await j(`${S}.mode`));
  }
  if (RETREAT) {
    await t.ev(`(() => { const C = ${S}.camp; C.ships.filter(u => u.team === 'earth' && u.kind !== 'carrier').forEach(u => { u.hp = 0; }); C.bay.fighters = 0; C.bay.escorts = 0; C.carrier.hp = Math.round(C.carrier.maxHp * 0.3); return 1; })()`); await t.run(900);
    note('HUD at 30 percent, no wing: ' + (await hud()).filter(x => /^(post|obj|arrow|bay|hull)=/.test(x)).join(' | ')); await snap('11-low');
    await listOrder('ship', 'burn'); await t.run(1500); note('nav now: ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 200)));
    for (let i = 0; i < 12 && (await j(`!!(${S}.camp.nav && ${S}.camp.nav.on)`)); i++) await t.run(2000);
    note('after the burn: ' + JSON.stringify(await state()) + ' | ' + (await hud()).filter(x => /^(post|obj|arrow)=/.test(x)).join(' | ')); await snap('12-there');
    await listOrder('ship', 'dock'); await settle(`game.scene.isActive('CampHub')`, 30); await t.run(900);
    note('docked: ' + (await shown()).join(' | ').slice(0, 900)); await snap('13-docked-low');
    await key('Digit2'); await t.run(700); note('repair page: ' + (await shown()).join(' | ').slice(0, 600)); await snap('13b-repair-page');
    await key('KeyR'); await t.run(900); note('after R on the repair page: ' + (await shown()).join(' | ').slice(0, 500) + ' | hull ' + await j(`Math.round(${S}.camp.carrier.hp)`) + ' ore ' + await j(`Math.floor(${S}.camp.ore)`)); await snap('14-mended');
    await key('Escape'); await t.run(900); note('after Esc: mode ' + await j(`${S}.mode`) + ' docked ' + await j(`${S}.docked`) + ' hull ' + await j(`Math.round(${S}.camp.carrier.hp)`));
  }
  if (DOCK) {
    note('outposts: ' + await j(`campOutposts(${S}.camp.level).map(o => o.id + ' ' + o.name + ' ' + Math.round(campDist(${S}.camp.carrier, o))).join(' | ')`));
    await t.ev(`(() => { const C = ${S}.camp, o = campOutposts(C.level).slice().sort((a, b) => campDist(C.carrier, a) - campDist(C.carrier, b))[0]; C.carrier.x = o.x + (o.r || 60) + 120; C.carrier.y = o.y; C.carrier.vx = 0; C.carrier.vy = 0; return 1; })()`); await t.run(600); // the cruiser beside the nearest outpost (the arrival circle is 300 km wide: the relay is 250 km off)
    await t.run(500); await key('KeyP'); await t.run(400); await snap('11-ship-list'); await key('KeyP'); note('ship list dock row: ' + await j(`(typeof campPanelRows === 'function' ? campPanelRows(${S}.camp, 'ship') : []).filter(r => r.id === 'dock').map(r => JSON.stringify(r)).join(' ')`).then(v => String(v).slice(0, 300)));
    await listOrder('ship', 'dock'); await settle(`game.scene.isActive('CampHub')`, 30); await t.run(900);
    note('docked: ' + (await shown()).join(' | ').slice(0, 800)); await snap('12-docked');
    await key('Escape'); await t.run(900);
    note('after Esc: Campaign ' + await j(`game.scene.isActive('Campaign')`) + ' hub ' + await j(`game.scene.isActive('CampHub')`) + ' mode ' + await j(`${S}.mode`) + ' docked ' + await j(`${S}.docked`));
    await t.run(1200); await snap('13-undocked'); note('HUD: ' + (await hud()).join(' | ').slice(0, 400));
  }
  if (LOSE) {
    await listOrder('fleet', 'launch'); await t.run(2500);
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
    await listOrder('fleet', 'launch'); await t.run(800); // the wing out
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
        if (s % 10 === 5) await listOrder('fleet', 'attack'); // attack
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
