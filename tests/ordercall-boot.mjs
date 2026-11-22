// not in the smoke: a pilot's call for orders in the real game (one Chrome, muted, through the test lock; card space-game-order-calls)
// It boots the Campaign at a mission, brings the battle into play, and makes a call happen (a wounded fighter with a raider on him, the mission clock put past the first 20 s): the call in the FLEET panel (it takes the rows' place, card space-game-two-hands-keys),
// the digit key that answers it, the answer on the radio line, a letter key of the panel while the call waits (the panel's, the call still waits), a call that nobody answers (the pilot's own pick after 8 s), and a call with the Tab map open (the digits still answer).
//   node tests/ordercall-boot.mjs [--level 2] [--mission 2]        pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/calls-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUNT_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const LEVEL = Number(arg('level', 2)), MISSION = Number(arg('mission', 2));
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const note = s => console.log('  note ' + s);
const VK = { KeyE: 69, KeyK: 75, KeyL: 76, Digit1: 49, Digit2: 50, Digit3: 51, Enter: 13, Escape: 27, Tab: 9 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), S = `game.scene.getScene('Campaign')`;
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase(), modifiers: 0 });
  const key = async (code, wait = 60) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); await t.run(60); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `calls-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const radio = () => j(`${S}.hud.chat ? { text: ${S}.hud.chat.text, alpha: ${S}.hud.chat.alpha } : null`);
  const view = () => j(`campCallView(${S}.camp)`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let l = 1; l <= LEVEL; l++) for (let m = 1; m <= 3; m++) if (l < LEVEL || m < MISSION) results[l + '.' + m] = res;
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: LEVEL, mission: MISSION - 1, techs: LEVEL === 1 ? [] : ['shield'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  await key('KeyK'); await settle(`game.scene.isActive('CampHub') && game.scene.getScene('CampHub').player`); await t.run(900);
  await key('KeyL'); // L launches the next mission from the ready room (it is four rows now, Enter opens an overlay: card space-game-ready-room-simple)
  if (await settle(`game.scene.isActive('CampWarp')`, 30)) { await t.run(1500); await key('Enter'); }
  check('the Campaign scene starts on the mission', await settle(`game.scene.isActive('Campaign') && ${S}.camp`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');
  // a state in which a pilot would call: 60 s of the mission gone, a wounded fighter with a raider on him, a few shots from the cruiser
  const make = `(() => { const C = ${S}.camp, c = C.carrier; if (C.arrivedAt == null) C.arrivedAt = C.t - 60000; C.call = null; const f = campSpawn(C, 'fighter', c.x + 260, c.y - 120); f.order = { type: 'guard', at: { kind: 'carrier' } }; f.hp = f.maxHp * 0.25; const r = campSpawn(C, 'raider', c.x + 520, c.y - 120); r.goal = ''; C.shield = campShieldMax(C); return f.id; })()`;
  const fid = await t.ev(make); await t.run(300);
  const v1 = await view(); check('a wounded fighter with a raider on him makes the pilot call (the plate is up)', !!v1 && v1.id === 'wounded', JSON.stringify(v1 && { id: v1.id, left: Math.round(v1.left * 10) / 10 }));
  const shapes = await j(`(() => { const O = ${S}.pnl.p.fleet; return O.callHead && O.callHead.visible ? { head: O.callHead.text, texts: [O.callLine.text].concat(O.callRows.filter(r => r.visible).map(r => r.text)), rowsHidden: O.rows.every(r => !r.name.visible) } : null; })()`);
  note('FLEET panel: ' + JSON.stringify(shapes)); check('the FLEET panel shows the call in place of its rows: the callsign and the line, three rows', !!shapes && shapes.rowsHidden && /Wingman hit and burning/.test(shapes.texts[0]) && /^1  Cover him/.test(shapes.texts[1]) && /^2  Bring him home/.test(shapes.texts[2]) && /^3  Keep fighting/.test(shapes.texts[3]));
  await snap('1-plate');
  await snap('2-panel-with-call'); const st0 = await j(`${S}.camp.stance`); await key('KeyE'); await t.run(300);
  check('a letter key of the panel while the call waits is the panel\'s (E, the next stance), and the call still waits', (await j(`campCallOpen(${S}.camp)`)) === true && (await j(`${S}.camp.stance`)) !== st0);
  await key('Digit2'); await t.run(400);
  const after = await j(`({ open: campCallOpen(${S}.camp), order: ${S}.camp.by[${JSON.stringify(String(fid))}] && ${S}.camp.by[${JSON.stringify(String(fid))}].order, log: ${S}.camp.call.log })`);
  check('2 answers "Bring him home": the call is closed, the fighter is ordered to recall', after.open === false && after.order && after.order.type === 'recall' && after.log.length === 1 && after.log[0].pick === 'home', JSON.stringify(after));
  const rd = await radio(); note('radio: ' + JSON.stringify(rd)); check('the radio line is the pilot\'s answer, with his callsign', !!rd && /^[A-Z]+: Copy\. He is heading home\.$/.test(rd.text), JSON.stringify(rd));
  await snap('3-answered');
  check('the call is gone from the FLEET panel after the answer (the rows are back)', (await j(`${S}.pnl.p.fleet.callHead.visible`)) === false && (await j(`${S}.pnl.p.fleet.rows[0].name.visible`)) === true);
  // a call with the Tab map open, answered with the keypad's digit is not needed: the plate is over the map
  await t.ev(`(() => { const C = ${S}.camp; C.call.next = 0; C.call.last = {}; C.t += 30000; })()`);
  await t.ev(make.replace('C.call = null;', '')); await t.run(300);
  await key('Tab'); await t.run(500); const over = await view(); await snap('4-over-map');
  check('a call that comes with the map open is waiting (the panels are off while the map is up, so it has no plate: 1 2 3 still answer it)', !!over && (await j(`!!${S}.mp`)) === true);
  await key('Digit3'); await t.run(300); check('3 answers it with the map open', (await j(`campCallOpen(${S}.camp)`)) === false);
  await key('Tab'); await t.run(300);
  // nobody answers: the pilot takes the cautious pick after 8 s
  await t.ev(`(() => { const C = ${S}.camp; C.call.next = 0; C.call.last = {}; C.t += 30000; })()`);
  await t.ev(make.replace('C.call = null;', '')); await t.run(400);
  const w1 = await view(); await t.run(5000); const w2 = await view(); await snap('5-waiting');
  await t.run(4500); const w3 = await view(); const lg = await j(`${S}.camp.call.log.slice(-1)[0]`);
  check('a call nobody answers runs down 8 s and the pilot picks (how: late)', !!w1 && !!w2 && w2.left < w1.left - 3 && w3 === null && lg && lg.way === 'late', JSON.stringify([w1 && w1.left, w2 && w2.left, w3, lg]));
  const rd2 = await radio(); note('radio after the late pick: ' + JSON.stringify(rd2));
  const errs = await j(`window.__errors || []`); check('the game logged no error', !errs || errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nORDER CALL WALK PASS'), 0));
