// not in the smoke: a pilot's call for orders in the real game (one Chrome, muted, through the test lock; card space-game-order-calls)
// It boots the Campaign at a mission, brings the battle into play, and makes a call happen (a wounded fighter with a raider on him, the mission clock put past the first 20 s): the call on its own amber plate low in the middle (a small list: card one-list-keys),
// Up, Down and Enter that answer it (the highlight starts on the pilot's own pick; the digits answer nothing), the answer on the radio line, the fleet list opened while the call waits (the list has the keys, the call still waits), a call with the Tab map open (it waits until the map is closed), and a call that nobody answers (the pilot's own pick after 8 s).
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
const VK = { KeyE: 69, KeyK: 75, KeyL: 76, KeyQ: 81, KeyP: 80, Digit1: 49, Digit2: 50, Digit3: 51, Enter: 13, Escape: 27, Tab: 9, ArrowUp: 38, ArrowDown: 40 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), S = `game.scene.getScene('Campaign')`;
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase(), modifiers: 0 });
  const key = async (code, wait = 60) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); await t.run(60); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `calls-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const radio = () => j(`${S}.hud.chat ? { text: ${S}.hud.chat.text, alpha: ${S}.hud.chat.alpha } : null`);
  const view = () => j(`campCallView(${S}.camp)`);
  const plate = () => j(`(() => { const s = ${S}, ui = s.callUi; return ui && ui.on ? { head: ui.head.text, texts: [ui.call.text].concat(ui.rows.map(r => r.text)), foot: ui.foot.text, sel: campCallSel(s), hi: ui.hi.visible, keys: campCallHasKeys(s), list: campPanelOpen(s.pn) } : null; })()`); // the plate as it is drawn (src/camporderdraw.js)
  // the call is answered like a list: the highlight starts on the pilot's own pick (view.def - 1), Down moves it (round at the end), Enter answers. The row of a pick is read from the call, not written here
  const answer = async pick => { const downs = await j(`(() => { const v = campCallView(${S}.camp), at = v ? v.rows.findIndex(r => r.pick === ${JSON.stringify(pick)}) : -1; return at < 0 ? -1 : (at - campCallSel(${S}) + v.rows.length) % v.rows.length; })()`); if (downs < 0) return false; for (let i = 0; i < downs; i++) await key('ArrowDown'); await key('Enter'); return true; };

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
  // a state in which a pilot would call: 60 s of the mission gone, a wounded fighter with a raider on him, a few shots from the cruiser (hit and burning, CAMP_CALLS.wound, but not yet under CAMP.repair.below: under that he flies home to be mended by himself and the pilots do not call about him)
  const make = `(() => { const C = ${S}.camp, c = C.carrier; if (C.arrivedAt == null) C.arrivedAt = C.t - 60000; C.call = null; const f = campSpawn(C, 'fighter', c.x + 260, c.y - 120); f.order = { type: 'guard', at: { kind: 'carrier' } }; f.hp = f.maxHp * (CAMP_CALLS.wound + CAMP.repair.below) / 2; const r = campSpawn(C, 'raider', c.x + 520, c.y - 120); r.goal = ''; C.shield = campShieldMax(C); return f.id; })()`;
  const fid = await t.ev(make); await t.run(300);
  const v1 = await view(); check('a wounded fighter with a raider on him makes the pilot call (the plate is up)', !!v1 && v1.id === 'wounded', JSON.stringify(v1 && { id: v1.id, left: Math.round(v1.left * 10) / 10 }));
  const shapes = await plate();
  note('the plate: ' + JSON.stringify(shapes)); check('the call is on its own plate in the middle, with no Q or P list open: PILOT CALL, the callsign and the line, three rows with no digit before them', !!shapes && shapes.list === '' && shapes.head === 'PILOT CALL' && /Wingman hit and burning/.test(shapes.texts[0]) && /^Cover him/.test(shapes.texts[1]) && /^Bring him home/.test(shapes.texts[2]) && /^Keep fighting/.test(shapes.texts[3]));
  check('the highlight starts on the pilot\'s own pick (the one row marked "no answer"), and the plate names its keys: Up Down, Enter', !!shapes && shapes.sel === v1.def - 1 && shapes.hi === true && shapes.keys === true && shapes.texts.slice(1).map(x => /\(no answer\)$/.test(x)).join() === [0, 1, 2].map(i => i === v1.def - 1).join() && /^Up Down pick {3}Enter answer$/.test(shapes.foot), JSON.stringify(shapes && [shapes.sel, v1.def, shapes.foot]));
  await snap('1-plate');
  // the fleet list while the call waits: the list has the arrows and Enter, the call waits (dimmed) and says so; an order given in the list is the list's
  const st0 = await j(`${S}.camp.stance`), want = st0 === 'orbit' ? 'hold' : 'orbit', wantAt = await j(`campPanelList(${S}.camp, 'fleet').findIndex(r => r.id === ${JSON.stringify(want)})`);
  await key('KeyQ'); await t.run(300); const dim = await plate(); await snap('2-list-with-call');
  check('Q while the call waits opens the fleet list: the list has the keys, the plate has no highlight and says to close the list', !!dim && dim.list === 'fleet' && dim.keys === false && dim.hi === false && dim.foot === 'Close the list or the map to answer', JSON.stringify(dim && [dim.list, dim.keys, dim.hi, dim.foot]));
  for (let i = 0; i < wantAt; i++) await key('ArrowDown'); await key('Enter'); await t.run(300);
  check('Down and Enter in the open list are the list\'s (a stance row is picked and given at once, the list closes), and the call still waits with the highlight where it was', wantAt >= 0 && (await j(`campCallOpen(${S}.camp)`)) === true && (await j(`${S}.camp.stance`)) === want && (await j(`campPanelOpen(${S}.pn)`)) === '' && (await j(`campCallSel(${S})`)) === v1.def - 1);
  await key('Digit2'); await t.run(300);
  check('a digit answers nothing: the call still waits', (await j(`campCallOpen(${S}.camp)`)) === true && (await j(`${S}.camp.call.log.length`)) === 0);
  const gave = await answer('home'); await t.run(400);
  const after = await j(`({ open: campCallOpen(${S}.camp), order: ${S}.camp.by[${JSON.stringify(String(fid))}] && ${S}.camp.by[${JSON.stringify(String(fid))}].order, log: ${S}.camp.call.log })`);
  check('Down to "Bring him home" and Enter answer it: the call is closed, the fighter is ordered to recall', gave === true && after.open === false && after.log[0].way === 'key' && after.order && after.order.type === 'recall' && after.log.length === 1 && after.log[0].pick === 'home', JSON.stringify(after));
  const rd = await radio(); note('radio: ' + JSON.stringify(rd)); check('the radio line is the pilot\'s answer, with his callsign', !!rd && /^[A-Z]+: Copy\. He is heading home\.$/.test(rd.text), JSON.stringify(rd));
  await snap('3-answered');
  check('the plate is gone after the answer, and no list is on the screen', (await plate()) === null && (await j(`campPanelOpen(${S}.pn)`)) === '' && (await j(`${S}.pnl.title.visible`)) === false);
  // a call with the Tab map open: the map has the arrows and Enter, so the call waits until the map is closed
  await t.ev(`(() => { const C = ${S}.camp; C.call.next = 0; C.call.last = {}; C.t += 30000; })()`);
  await t.ev(make.replace('C.call = null;', '')); await t.run(300);
  await key('Tab'); await t.run(500); const over = await view(); await snap('4-over-map');
  const overPlate = await plate();
  check('a call that comes with the map open is waiting: its plate says to close the map, and it does not have the keys (the map has the arrows and Enter)', !!over && (await j(`!!${S}.mp`)) === true && !!overPlate && overPlate.keys === false && overPlate.foot === 'Close the list or the map to answer', JSON.stringify(overPlate && [overPlate.keys, overPlate.foot]));
  await key('Digit3'); await t.run(300); check('3 does not answer it (no digit answers a call)', (await j(`campCallOpen(${S}.camp)`)) === true);
  await key('Tab'); await t.run(300);
  const lastPick = over ? over.rows[over.rows.length - 1].pick : '', gave3 = (await j(`!${S}.mp && campCallHasKeys(${S})`)) === true && await answer(lastPick); await t.run(300);
  const lg3 = await j(`${S}.camp.call.log.slice(-1)[0]`);
  check('with the map closed the call has the keys again: Up or Down to its last row and Enter answer it', gave3 === true && (await j(`campCallOpen(${S}.camp)`)) === false && !!lg3 && lg3.way === 'key', JSON.stringify(lg3));
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
