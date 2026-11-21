// not in the smoke: one mission of the Campaign flown by hand as a player, in the real game (one Chrome, muted, through the test lock; card space-game-night-hunt-l2-l3)
// It boots the game with a save that stands at the mission, opens the ready room with K, reads the briefing (three screens), launches, and flies with the keys a player uses
// (the panels Q E C, the map on Tab, the pace on P, W A D and Space held), then lets the autopilot carry the rest and writes down what the game says: the HUD line, the goal, the toasts.
//   node tests/camphunt-boot.mjs --level 2 --mission 1 [--secs 90] [--fight]      the mission number is the one on the board (1 to 3)
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
const LEVEL = Number(arg('level', 2)), MISSION = Number(arg('mission', 1)), SECS = Number(arg('secs', 90)), FIGHT = process.argv.includes('--fight');
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
  await key('Enter'); await t.run(700);
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

  if (FIGHT) {
    await key('KeyQ'); await key('Digit1'); await t.run(800); // the wing out
    const drive = async secs => {
      for (let s = 0; s < secs; s += 5) {
        await t.ev(`(() => { const C = ${S}.camp; if (C.result) return 0; const g = campNavGoal(C); if (g) { const row = campNavRows(C).find(r => r.id === 'goal') || g; if (!C.nav || !C.nav.on) campNavGo(C, row); } ${S}.k.SPACE = { isDown: campAliens(C).some(u => Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) < 700) }; return 1; })()`);
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
