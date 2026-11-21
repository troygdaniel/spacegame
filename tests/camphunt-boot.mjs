// not in the smoke: one mission of the Campaign flown by hand as a player, in the real game (one Chrome, muted, through the test lock; card space-game-night-hunt-l2-l3)
// It boots the game with a save that stands at the mission, opens the ready room with K, reads the briefing (three screens), launches, and flies with the keys a player uses
// (the panels Q E C, the map on Tab, the pace on P, W A D and Space held), then lets the autopilot carry the rest and writes down what the game says: the HUD line, the goal, the toasts.
//   node tests/camphunt-boot.mjs --level 2 --mission 1 [--secs 90] [--fight | --quickwin | --lose | --dock | --retreat | --panels | --replay]      the mission number is the one on the board (1 to 3)
// --replay: the mission before the next one is picked in the ready room as a REPLAY (A, then R), briefed, flown (use --quickwin with it) and its debrief and the saved progress are read: the progress must not move
// --panels: every row of the FLEET, SHIP and SYSTEMS panels pressed once in the flight, the stance page, the missile, the map's whole-system view: what each one says (the toasts are written down at the end)
// --retreat: the wing is gone and the hull is at 30 percent: the HUD says where to retreat, E then Shift+5 burns there, E then 6 docks, the dock mends the hull (ore), Esc and the flight goes on
// --dock: after the burn, E then 6 at the outpost of the mission (the ready room opens over the paused battle: its rows and words), then Esc and the flight goes on
// --lose: the cruiser is destroyed after the burn, with the wing out: the lost card, Enter (the mission again, from its brief), the pause card on Esc and its keys page on H, R from the pause
// --quickwin: the win is forced after the first seconds of flight (the score of the moment), to walk the cards that follow a mission quickly: the debrief, the level won card, the pick or the refit, the next level's room
// Without --fight the walk stops after the first 25 seconds of flight (keys, panels, map: well under five minutes); with it the mission is flown to its debrief and the ready room.
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
const VK = { KeyQ: 81, KeyE: 69, KeyC: 67, KeyP: 80, KeyW: 87, KeyA: 65, KeyD: 68, KeyS: 83, KeyK: 75, KeyL: 76, KeyM: 77, KeyZ: 90, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Enter: 13, Escape: 27, Tab: 9, Space: 32, ShiftLeft: 16, Equal: 187, Minus: 189 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, S = `game.scene.getScene('Campaign')`;
  const kd = (code, mods = 0) => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Space' ? ' ' : code.replace(/^(Key|Digit)/, '').toLowerCase(), modifiers: mods });
  const key = async (code, wait = 50, mods = 0) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code, mods))); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code, mods))); await t.run(wait); };
  const hold = async (code, ms) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); await t.run(ms); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); await t.run(50); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `hunt-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture hunt-' + LEVEL + MISSION + '-' + name); };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.map.filter(o => o.text).map(o => o.text)) : Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);
  const hud = () => j(`(() => { const s = ${S}; const out = []; if (s.hud) Object.keys(s.hud).forEach(k => { const o = s.hud[k]; if (o && o.text && o.visible !== false) out.push(k + '=' + String(o.text).replace(/\\n/g, ' / ')); }); return out; })()`);
  const card = () => j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`);
  const state = () => j(`({ mode: ${S}.mode, result: ${S}.camp.result, t: Math.round(${S}.camp.t / 1000), clock: Math.round(campMissionClock(${S}.camp)), obj: campObjective(${S}.camp), hull: Math.round(${S}.camp.carrier.hp), shield: Math.round(${S}.camp.shield), aliens: campAliens(${S}.camp).length, wing: campWing(${S}.camp).length, x: Math.round(${S}.camp.carrier.x), y: Math.round(${S}.camp.carrier.y) })`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let l = 1; l <= LEVEL; l++) for (let m = 1; m <= 3; m++) if (l < LEVEL || m < MISSION) results[l + '.' + m] = res;
  const techs = LEVEL === 1 ? [] : LEVEL === 2 ? ['shield'] : ['shield', 'plating'];
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: LEVEL, mission: MISSION - 1, techs, ore: 60, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  await key('KeyK');
  check('K on the title opens the ready room', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`));
  await t.run(900); note('board: ' + (await shown()).join(' | ').slice(0, 600)); await snap('1-board');
  if (REPLAY) { await key('KeyA'); await key('KeyR'); } else await key('Enter');
  await t.run(700);
  for (let s = 0; s < 3; s++) {
    const b = await shown(); note('briefing screen ' + (s + 1) + ': ' + b.join(' | ').slice(0, 900)); await snap('2-brief-' + (s + 1));
    if (s < 2) { await key('Enter'); await t.run(500); }
  }
  await key('Enter');
  const warp = await settle(`game.scene.isActive('CampWarp')`, 30);
  note('warp cinematic for this start: ' + warp);
  if (warp) { await t.run(1500); await snap('3-warp'); await key('Enter'); }
  check('the Campaign scene starts on the mission', await settle(`game.scene.isActive('Campaign') && ${S}.camp`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { note('mode ' + await j(`${S}.mode`) + ': ' + await card()); await snap('4-card-' + i); await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');
  await t.ev(`(() => { window.__toasts = []; const t0 = toast; toast = function (sc, text) { try { window.__toasts.push(Math.round((sc.camp ? sc.camp.t : 0) / 1000) + 's  ' + String(text).replace(/\\n/g, ' / ')); } catch (e) { /* the log only */ } return t0.apply(this, arguments); }; return 1; })()`); // what the game tells the player, in order
  await t.run(900); await snap('5-flight'); note('HUD: ' + (await hud()).join(' | ').slice(0, 700)); note('state: ' + JSON.stringify(await state()));

  // keys a player uses
  const x0 = await j(`${S}.camp.carrier.x`), y0 = await j(`${S}.camp.carrier.y`), r0 = await j(`${S}.camp.carrier.rot`);
  await hold('KeyW', 1500); const x1 = await j(`${S}.camp.carrier.x`), y1 = await j(`${S}.camp.carrier.y`);
  check('W thrusts the cruiser', Math.hypot(x1 - x0, y1 - y0) > 5, 'moved ' + Math.round(Math.hypot(x1 - x0, y1 - y0)) + ' px');
  await hold('KeyD', 600); check('D turns it', Math.abs((await j(`${S}.camp.carrier.rot`)) - r0) > 0.05);
  await hold('KeyA', 600);
  await key('Tab'); await t.run(500); await snap('6-map'); note('map open: ' + await j(`!!(${S}.map && ${S}.map.open) || !!${S}.mapOpen`)); await key('Tab'); await t.run(300);
  for (const [k, name] of [['KeyQ', 'fleet'], ['KeyE', 'ship'], ['KeyC', 'systems']]) { await key(k); await t.run(500); await snap('7-panel-' + name); await key('Escape'); await t.run(200); }
  await key('KeyP'); await t.run(300); note('P: pace now ' + await j(`${S}.pace !== undefined ? ${S}.pace : (typeof G !== 'undefined' && G.pace)`)); await snap('8-pace'); await key('KeyP');
  // the autopilot: E then Shift+5, the burn to the mission's place
  await key('KeyE'); await key('Digit5', 50, 8); await t.run(1500);
  note('after E, Shift+5: nav ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 160)) + ' state ' + JSON.stringify(await state()));
  await t.run(9000); const st1 = await state(); note('9 s later: ' + JSON.stringify(st1)); await snap('9-arrived'); note('HUD: ' + (await hud()).join(' | ').slice(0, 700));

  if (PANELS) {
    let mark = 0; const say = async what => { await t.run(300); const all = await j('window.__toasts'); note(what + ' -> ' + (all.slice(mark).join(' || ') || '(no toast)')); mark = all.length; };
    for (const [k, d, what] of [['KeyQ', 'Digit1', 'Q 1 launch'], ['KeyQ', 'Digit2', 'Q 2 attack'], ['KeyQ', 'Digit3', 'Q 3 escort (no convoy here)'], ['KeyQ', 'Digit4', 'Q 4 guard'], ['KeyQ', 'Digit5', 'Q 5 recall'],
      ['KeyE', 'Digit1', 'E 1 mine'], ['KeyE', 'Digit2', 'E 2 recharge shields'], ['KeyE', 'Digit3', 'E 3 build a fighter (not docked)'], ['KeyE', 'Digit4', 'E 4 build an escort'], ['KeyE', 'Digit6', 'E 6 dock (away from it)'],
      ['KeyC', 'Digit1', 'C 1 weapons pip'], ['KeyC', 'Digit2', 'C 2 shields pip'], ['KeyC', 'Digit3', 'C 3 engines pip'], ['KeyC', 'Digit5', 'C 5 emergency shields'], ['KeyC', 'Digit4', 'C 4 balance']]) {
      mark = await j('window.__toasts.length'); await key(k); await key(d); await say(what); await t.run(1200);
    }
    mark = await j('window.__toasts.length'); await key('KeyQ'); await key('ArrowRight'); await t.run(400); await snap('11-stances'); await key('Digit2'); await say('Q, Right, 2 (stance orbit)'); await t.run(600);
    mark = await j('window.__toasts.length'); await key('KeyF'); await say('F missile (nothing big in reach)'); 
    await key('Tab'); await t.run(400); await key('KeyZ'); await t.run(600); await snap('12-map-whole'); await key('KeyZ'); await t.run(300); await key('Equal'); await key('Equal'); await t.run(400); await snap('13-map-zoom'); await key('Digit0'); await key('Tab'); await t.run(300);
    note('mode after the map: ' + await j(`${S}.mode`));
  }
  if (RETREAT) {
    await t.ev(`(() => { const C = ${S}.camp; C.ships.filter(u => u.team === 'earth' && u.kind !== 'carrier').forEach(u => { u.hp = 0; }); C.bay.fighters = 0; C.bay.escorts = 0; C.carrier.hp = Math.round(C.carrier.maxHp * 0.3); return 1; })()`); await t.run(900);
    note('HUD at 30 percent, no wing: ' + (await hud()).filter(x => /^(post|obj|arrow|bay|hull)=/.test(x)).join(' | ')); await snap('11-low');
    await key('KeyE'); await key('Digit5', 50, 8); await t.run(1500); note('nav now: ' + await j(`JSON.stringify(${S}.camp.nav || null)`).then(v => String(v).slice(0, 200)));
    for (let i = 0; i < 12 && (await j(`!!(${S}.camp.nav && ${S}.camp.nav.on)`)); i++) await t.run(2000);
    note('after the burn: ' + JSON.stringify(await state()) + ' | ' + (await hud()).filter(x => /^(post|obj|arrow)=/.test(x)).join(' | ')); await snap('12-there');
    await key('KeyE'); await key('Digit6'); await settle(`game.scene.isActive('CampHub')`, 30); await t.run(900);
    note('docked: ' + (await shown()).join(' | ').slice(0, 900)); await snap('13-docked-low');
    await key('Digit2'); await t.run(700); note('repair page: ' + (await shown()).join(' | ').slice(0, 600)); await snap('13b-repair-page');
    await key('KeyR'); await t.run(900); note('after R on the repair page: ' + (await shown()).join(' | ').slice(0, 500) + ' | hull ' + await j(`Math.round(${S}.camp.carrier.hp)`) + ' ore ' + await j(`Math.floor(${S}.camp.ore)`)); await snap('14-mended');
    await key('Escape'); await t.run(900); note('after Esc: mode ' + await j(`${S}.mode`) + ' docked ' + await j(`${S}.docked`) + ' hull ' + await j(`Math.round(${S}.camp.carrier.hp)`));
  }
  if (DOCK) {
    note('outposts: ' + await j(`campOutposts(${S}.camp.level).map(o => o.id + ' ' + o.name + ' ' + Math.round(campDist(${S}.camp.carrier, o))).join(' | ')`));
    await t.ev(`(() => { const C = ${S}.camp, o = campOutposts(C.level).slice().sort((a, b) => campDist(C.carrier, a) - campDist(C.carrier, b))[0]; C.carrier.x = o.x + (o.r || 60) + 120; C.carrier.y = o.y; C.carrier.vx = 0; C.carrier.vy = 0; return 1; })()`); await t.run(600); // the cruiser beside the nearest outpost (the arrival circle is 300 km wide: the relay is 250 km off)
    await key('KeyE'); await t.run(500); await snap('11-ship-panel'); note('E panel dock row: ' + await j(`(typeof campPanelRows === 'function' ? campPanelRows(${S}.camp, 'ship') : []).filter(r => r.id === 'dock' || r.n === 6).map(r => JSON.stringify(r)).join(' ')`).then(v => String(v).slice(0, 300)));
    await key('Digit6'); await settle(`game.scene.isActive('CampHub')`, 30); await t.run(900);
    note('docked: ' + (await shown()).join(' | ').slice(0, 800)); await snap('12-docked');
    await key('Escape'); await t.run(900);
    note('after Esc: Campaign ' + await j(`game.scene.isActive('Campaign')`) + ' hub ' + await j(`game.scene.isActive('CampHub')`) + ' mode ' + await j(`${S}.mode`) + ' docked ' + await j(`${S}.docked`));
    await t.run(1200); await snap('13-undocked'); note('HUD: ' + (await hud()).join(' | ').slice(0, 400));
  }
  if (LOSE) {
    await key('KeyQ'); await key('Digit1'); await t.run(2500);
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
    await key('KeyQ'); await key('Digit1'); await t.run(800); // the wing out
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
        if (s % 10 === 5) { await key('KeyQ'); await key('Digit2'); }
        await t.run(5000);
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
