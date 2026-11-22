// not in the smoke: the zoom out in the real game (one Chrome, muted, through the test lock; card space-game-zoom-out-more)
// It boots a mission, launches the wing and zooms the FLIGHT view out with the - key (the camera goes to 0.2, twice the Long Haul's 0.4; the small ships keep a size you can see), with a fight and the
// convoy in it, and times the same stretch of the battle at zoom 1 and at 0.2; then opens the Tab map and zooms it out with - and the wheel until the whole system fits, a picture on the way.
//   node tests/zoomout-boot.mjs [--level 1] [--mission 1]        pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/zoom-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUNT_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const LEVEL = Number(arg('level', 1)), MISSION = Number(arg('mission', 1));
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const note = s => console.log('  note ' + s);
const VK = { KeyK: 75, KeyL: 76, Backspace: 8, Digit1: 49, Minus: 189, Equal: 187, Enter: 13, Escape: 27, Tab: 9 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), S = `game.scene.getScene('Campaign')`;
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Minus' ? '-' : code === 'Equal' ? '=' : code === 'Backspace' ? 'Backspace' : code.replace(/^(Key|Digit)/, '').toLowerCase(), modifiers: 0 });
  const key = async (code, wait = 60) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); await t.run(60); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `zoom-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const wheel = async (dy, n) => { for (let i = 0; i < n; i++) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 360, deltaX: 0, deltaY: dy }); await t.run(80); } };

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
  // a fight: the wing out, raiders and skiffs about, the convoy flying
  await t.ev(`(() => { const C = ${S}.camp, c = C.carrier; if (C.arrivedAt == null) C.arrivedAt = C.t - 5000; C.orders.launch = 1; C.bay.fighters = 4; for (let i = 0; i < 6; i++) campSpawn(C, i < 3 ? 'skiff' : 'raider', c.x + 700 + i * 120, c.y + (i % 2 ? 260 : -260)); for (let i = 0; i < 4; i++) { const f = campSpawn(C, 'fighter', c.x + 80 + i * 30, c.y + (i % 2 ? 60 : -60)); f.order = { type: 'attack', target: '' }; } C.shield = campShieldMax(C); C.god = true; })()`);
  await t.run(600);
  const ms = async n => { const t0 = Date.now(); await t.run(n); return Date.now() - t0; };
  const w1 = await ms(2000), z1 = await j('CAMZOOM.want'); await snap('1-flight-zoom1');
  // - presses: the camera goes out in steps of 1.2 to 0.2 and stops there
  let zs = [1]; for (let i = 0; i < 12; i++) { await key('Minus', 40); zs.push(await j('CAMZOOM.want')); }
  note('zoom after each press of -: ' + zs.map(z => +z.toFixed(3)).join(' '));
  check('- zooms the flight view out in steps and stops at 0.2 (twice as far as the Long Haul\'s 0.4)', zs[zs.length - 1] === 0.2 && zs.every((z, i) => !i || z <= zs[i - 1]) && zs.filter(z => z === 0.2).length >= 2);
  await t.run(900); const cz = await j(`${S}.cameras.main.zoom`); check('the camera arrives at 0.2', Math.abs(cz - 0.2) < 0.005, String(cz));
  const w2 = await ms(2000); await snap('2-flight-zoom02');
  note('2 s of the battle took ' + w1 + ' ms at zoom 1 and ' + w2 + ' ms at 0.2 (virtual time stepped by hand: frames cost the same unless drawing does)');
  check('the far-out view costs no more than twice the frames of the near one', w2 <= Math.max(2 * w1, w1 + 1500), w1 + ' -> ' + w2);
  const sz = await j(`(() => { const out = {}; Object.keys(${S}.sp).forEach(id => { const u = ${S}.camp.by[id]; if (!u) return; const sp = ${S}.sp[id]; out[u.kind] = Math.round(sp.displayWidth * ${S}.cameras.main.zoom * 10) / 10; }); return out; })()`);
  note('drawn width on the screen by kind at zoom 0.2: ' + JSON.stringify(sz)); check('every ship is drawn at least 9 px across on the screen at 0.2 (the least is 10)', Object.values(sz).length > 3 && Object.values(sz).every(v => v >= 9), JSON.stringify(sz));
  const fps = await j(`Math.round(game.loop.actualFps || 0)`); note('actualFps (as the loop sees it, stepped clock): ' + fps);
  await key('Backspace', 40); await t.run(1200); check('Backspace puts the view back to 1', Math.abs((await j(`${S}.cameras.main.zoom`)) - 1) < 0.01);
  // the Tab map: - and the wheel out to the whole system
  await key('Tab'); await t.run(700); const m0 = await j(`({ z: ${S}.mp.z, zMin: ${S}.mp.zMin, whole: ${S}.mp.whole })`); note('map opened: ' + JSON.stringify(m0)); await snap('3-map-open');
  let mz = []; for (let i = 0; i < 6; i++) { await key('Minus', 40); mz.push(+(await j(`${S}.mp.zWant`)).toFixed(3)); } await t.run(1200); await snap('4-map-6-presses');
  note('map zoom targets after 6 presses: ' + mz.join(' '));
  for (let i = 0; i < 12; i++) await key('Minus', 40); await t.run(1500);
  const mf = await j(`({ z: ${S}.mp.z, zWant: ${S}.mp.zWant, zMin: ${S}.mp.zMin, whole: ${S}.mp.whole, across: ${S}.mp.across.text })`); note('map at the end of the presses: ' + JSON.stringify(mf)); await snap('5-map-whole');
  const nm = await j(`${S}.mp.nameObjs.filter(o => o.world).map(o => (o.drop ? '-' : '') + o.text + (o.visible ? '' : '(hidden)'))`); note('names at the far end (- is left out): ' + nm.join(', '));
  check('- takes the map all the way out to the whole system (the limit the map gives), and the far bodies are on', Math.abs(mf.z - mf.zMin) < 1e-4 && mf.whole === true && /^SYSTEM/.test(mf.across), JSON.stringify(mf));
  const places = await j(`(() => { const mp = ${S}.mp, F = CAMPMAP.frame; return campMapMarks(${S}.camp, true).filter(m => m.type === 'place').map(m => campMapPoint(mp.fit, F, m.x, m.y)).filter(p => p.x < F.x || p.x > F.x + F.w || p.y < F.y || p.y > F.y + F.h).length; })()`);
  check('every body of the system is inside the frame at the far end', places === 0, places + ' outside');
  await wheel(-100, 8); await t.run(1200); const mw = await j(`${S}.mp.zWant`); note('after 8 wheel notches in: zoom ' + mw.toFixed(3)); check('the wheel zooms the map back in', mw > mf.zMin * 2, String(mw)); await snap('6-map-wheel-in');
  await wheel(100, 30); await t.run(1500); check('the wheel out goes to the same end and no further', Math.abs((await j(`${S}.mp.zWant`)) - mf.zMin) < 1e-6);
  await key('Backspace', 40); await t.run(1200); check('Backspace on the map is the level fitted again (zoom 1) and the far bodies go', (await j(`${S}.mp.z`)) === 1 && (await j(`${S}.mp.whole`)) === false);
  await key('Tab'); await t.run(300);
  const errs = await j(`window.__errors || []`); check('the game logged no error', !errs || errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nZOOM OUT WALK PASS'), 0));
