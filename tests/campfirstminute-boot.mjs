// not in the smoke: 3.1's first minute in the real game (card space-game-b14-c20-31-first-minute; one Chrome, muted, through the test lock; the rule is pinned in plain Node by tests/campl3waves.mjs)
// 3.1 booted from a save, the cloud's test: Q then 1 (the cruiser flies to Kolga), then hands off.
//   A  the cruiser arrives at Kolga about 12 s in (the radio says so)
//   B  the first wave comes on arrival, not when a ring is entered: within two seconds of arriving the wave is started, a hostile is in sight, and the HOSTILES panel is lit with raiders on the page (it first lit at 72 s before)
//   C  the game logged no error
//   A picture just after arrival is saved (FM_SHOTS, default ~/dev/spacegame-night/shots/firstminute-arrival.png), never into the repository.   node tests/campfirstminute-boot.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.FM_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit4: 52, KeyK: 75, KeyL: 76, KeyQ: 81, Enter: 13 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, S = `game.scene.getScene('Campaign')`;
  const key = async (code, wait = 50) => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait); };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.ev(`(() => { const d0 = Date.now(), t0 = window.__t; Date.now = () => d0 + (window.__t - t0); return 1; })()`); await t.run(900);
  const done = { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 };
  const progress = { level: 3, mission: 0, techs: ['shield', 'plating'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': done, '1.2': done, '1.3': done, '2.1': done, '2.2': done, '2.3': done } };
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify(progress))})`);
  await key('KeyK'); await settle(`game.scene.isActive('CampHub') && ${HUB}.player`); await t.run(900);
  await key('Digit4'); await settle(`Math.abs(${HUB}.player.x - 1028) < 4 && Math.abs(${HUB}.player.y - 394) < 4`, 80); await t.run(300);
  await key('KeyL'); await t.run(400); await key('KeyL');
  if (await settle(`game.scene.isActive('CampWarp')`, 30)) { await t.run(1200); await key('Enter'); }
  check('the Campaign scene starts on 3.1 (the approach, three scan rings)', await settle(`game.scene.isActive('Campaign') && ${S}.camp && ${S}.camp.scan && ${S}.camp.scan.length === 3`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');

  console.log('A. Q then 1, hands off: the cruiser arrives at Kolga');
  await key('KeyQ', 80); await t.run(300); await key('Digit1', 80);
  let arrived = null; for (let i = 0; i < 80 && arrived == null; i++) { await t.run(500); arrived = await j(`${S}.camp.arrivedAt`); }
  check('the cruiser arrives (arrivedAt is set) about 12 s into the mission', arrived != null && arrived >= 6000 && arrived <= 30000, String(arrived));
  console.log('B. the first answer comes on arrival');
  await t.run(1200);
  const w = await j(`(() => { const C = ${S}.camp; const m = typeof campPageHudFoes === 'function' ? campPageHudFoes(C) : null; return { started: C.waves[0].started, scan0: C.scan[0].began, aliens: C.ships.filter(u => u.team === 'alien' && u.hp > 0).length, panel: m ? { label: m.label, what: m.what, scout: !!m.scout } : null, since: +((C.t - C.arrivedAt) / 1000).toFixed(1) }; })()`);
  check('1.2 s after arriving the first wave is started and no ring has been entered', w.started === true && w.scan0 === false && w.aliens >= 2, JSON.stringify(w));
  check('the HOSTILES panel is lit with the real hostiles (not a scouted guess): raiders', !!w.panel && w.panel.scout === false && /Raider/i.test(w.panel.what), JSON.stringify(w.panel));
  check('the page shows it: the word HOSTILES and raiders are on the HUD', (await j(`/hostiles/i.test(document.body.innerText) && /raider/i.test(document.body.innerText)`)) === true, JSON.stringify(await j(`document.body.innerText.slice(0, 200)`)));
  try { const p = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); writeFileSync(join(OUT, 'firstminute-arrival.png'), Buffer.from(p.data, 'base64')); } catch (e) { console.log('  (picture skipped: ' + e.message + ')'); }

  console.log('C. no error');
  const errs = (await j(`window.__errors || []`)).concat(t.errors || []);
  check('the game logged no error', errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nFIRST MINUTE BOOT PASS'), 0));
