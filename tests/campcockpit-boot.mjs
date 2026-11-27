// not in the smoke: flying a pilot's fighter in the real game, with the default address (one Chrome, muted, through the test lock; card space-game-cockpit-default-on)
// The cockpit is ON for every player (CAMP.flags.cockpit true, ?cockpit=0 is only the tests' way back). This boots mission 1.1 with NO address switch (a boot is run with what a player has) and, with real key events, checks what only a browser shows:
//   A  the switch is on with no ?cockpit in the address; the page HUD's bottom key row names C (Cockpit, then Hand back while it is flown) and the H keys page has its line (Pilot's stick: take, give back)
//   B  the first hostiles seen light the C chip (the teaching note) where it stands in the key row
//   C  TAKING THE STICK, the glide (card space-game-b7-camera-lead-stick): C moves the camera from the cruiser to the fighter over about 0.4 s (eased, the view closing in to the cockpit's 3 times), the pale ring shrinks onto the fighter and goes, the CRUISER AUTO pill fades in
//   D  THE AUTO-TARGET (card space-game-fly-fighter-aim-help): a hostile crossing ahead and off the nose: the guns track it (a mint ring on the screen at the lead point), Space held sends the shots along the lead point and not along the nose
//   E  C again hands it back: the camera glides back to the cruiser and the view goes out, the pill fades, no ring is left, the aim is gone
//   F  the game logged no error
// It is not part of the smoke (Chrome is slow and shares one lock): the gate's chrome-batch.sh runs it with the other boots when a landing flips a default.   node tests/campcockpit-boot.mjs
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyK: 75, KeyL: 76, Enter: 13, KeyC: 67, Space: 32, KeyH: 72 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), S = `game.scene.getScene('Campaign')`;
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Space' ? ' ' : code === 'Enter' ? 'Enter' : code.replace(/^Key/, '').toLowerCase() });
  const keyDown = code => t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code)));
  const keyUp = code => t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code)));
  const key = async (code, wait = 60) => { await keyDown(code); await t.run(wait); await keyUp(code); await t.run(wait); };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const keyRow = () => j(`(document.querySelector('.ph-first') || { innerText: '' }).innerText`);
  const view = () => j(`(() => { const c = ${S}.cameras.main, C = ${S}.camp, f = C.cockpit ? C.by[C.cockpit.id] : null, X = ${S}.camX, m = campCamMid(c); return { z: c.zoom, glide: !!(X && X.glide), ring: !!(X && X.ring), pill: X ? X.tagA : 0, toFighter: f ? Math.hypot(m.x - f.x, m.y - f.y) : null, toCruiser: Math.hypot(m.x - C.carrier.x, m.y - C.carrier.y) }; })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: 1, mission: 0, techs: [], ore: 60, bonus: { fighters: 0, escorts: 0 }, results: {} }))})`);
  await key('KeyK'); await settle(`game.scene.isActive('CampHub') && game.scene.getScene('CampHub').player`); await t.run(900);
  await key('KeyL'); await t.run(400); await key('KeyL'); // (the first L opens the briefing, the second launches)
  if (await settle(`game.scene.isActive('CampWarp')`, 30)) { await t.run(1500); await key('Enter'); }
  check('the Campaign scene starts on the mission', await settle(`game.scene.isActive('Campaign') && ${S}.camp`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');
  await t.ev(`(() => { const C = ${S}.camp; C.god = true; while (C.t < 12000) campTick(C, 0.1); return 1; })()`); await t.run(600); // the pilots are out beside the cruiser

  console.log('A. on by default');
  check('no ?cockpit in the address, and the switch is on: CAMP.flags.cockpit and campCockpitOn() are true', !/cockpit/i.test(await j('location.search')) && (await j('CAMP.flags.cockpit')) === true && (await j('campCockpitOn()')) === true, await j('location.search'));
  const row0 = await keyRow();
  check('the bottom key row names C: "C" then "Cockpit"', /(^|\n)C\nCOCKPIT/i.test(row0), JSON.stringify(row0));
  await key('KeyH'); await t.run(500);
  check('the H keys page has the line for C: "Pilot\'s stick: take, give back"', (await j(`campKeysIsOpen(${S})`)) === true && (await j(`/Pilot.s stick: take, give back/i.test(document.body.innerText)`)) === true);
  await key('KeyH'); await t.run(400);
  check('H closes the page', (await j(`campKeysIsOpen(${S})`)) === false);

  console.log('B. the first hostiles light the C chip');
  await t.ev(`(() => { const C = ${S}.camp, c = C.carrier, u = campSpawn(C, 'raider', c.x + 1400, c.y - 200); u.vx = 0; u.vy = 0; u.hp = u.maxHp = 1e6; u.hold = true; window.__raider = u; window.campSeen = () => true; return 1; })()`); await t.run(700);
  const lit = await j(`[...document.querySelectorAll('.ph-first .ph-fc.lit')].map(e => e.innerText.replace(/\\n/g, ' '))`);
  check('at the first hostiles seen a chip of the row is lit with a note, and C is one of them (the teaching row of src/campteach.js)', lit.some(s => /^C\b/.test(s) && s.length > 10), JSON.stringify(lit));
  await t.ev(`(() => { const u = window.__raider; u.hp = 0; ${S}.camp.ships = ${S}.camp.ships.filter(x => x !== u); delete ${S}.camp.by[u.id]; return 1; })()`); await t.run(200);

  console.log('C. taking the stick: the glide');
  const v0 = await view();
  check('before the take the view is the cruiser\'s: no glide, no ring, no pill, the view out', !v0.glide && !v0.ring && v0.pill === 0 && v0.z < 0.5, JSON.stringify(v0));
  await key('KeyC', 40);
  check('C took the stick of a pilot (Wedge)', (await j(`!!${S}.camp.cockpit`)) === true && (await j(`${S}.camp.by[${S}.camp.cockpit.id].squad`)) === 'red');
  const g1 = await view(); await t.run(100); const g2 = await view(); await t.run(100); const g3 = await view();
  check('a glide is on: the camera is on its way (the distance to the fighter shrinks at each look) and the ring is shrinking onto the fighter', g1.glide && g2.glide && g1.toFighter > g2.toFighter && g2.toFighter > g3.toFighter && g1.ring, JSON.stringify([g1, g2, g3]));
  check('and the view closes in as it goes (the zoom grows toward the cockpit\'s 3 times)', g3.z > g1.z && g3.z > v0.z, JSON.stringify([v0.z, g1.z, g3.z]));
  await t.run(600); const g4 = await view();
  check('about 0.8 s on the glide is over and the camera follows the fighter (within 40 px of it), the ring is gone, the view is close (over 0.9)', !g4.glide && g4.toFighter < 40 && !g4.ring && g4.z > 0.9, JSON.stringify(g4));
  check('the CRUISER AUTO pill is up (it fades in over 0.3 s)', g4.pill > 0.99, g4.pill);
  check('the key row now says Hand back for C', /(^|\n)C\nHAND BACK/i.test(await keyRow()), JSON.stringify(await keyRow()));

  console.log('D. the auto-target');
  await t.ev(`(() => { const C = ${S}.camp, f = C.by[C.cockpit.id]; f.vx = 0; f.vy = 0; f.rot = 0; const u = campSpawn(C, 'raider', f.x + 520, f.y - 40); u.vx = 0; u.vy = 110; u.hp = u.maxHp = 1e6; u.hold = true; window.__u = u; window.__f = f; window.campSeen = () => true; return 1; })()`); await t.run(250);
  const A = await j(`(() => { const a = ${S}.camp.cockpit.aim; return a && { id: a.id, steer: a.steer, rot: a.rot }; })()`);
  check('the guns track the crossing raider (the aim is set, it steers, and its angle is not the nose\'s)', A && A.id === (await j('__u.id')) && A.steer === true && Math.abs(A.rot) > 0.1, JSON.stringify(A));
  const ring = await j(`(() => { const g = ${S}.hud.aimMark; return { visible: !!(g && g.visible), commands: g && g.commandBuffer ? g.commandBuffer.length : 0 }; })()`);
  check('a mint ring is on the screen at the lead point (the graphics is visible and has something drawn)', ring.visible && ring.commands > 0, JSON.stringify(ring));
  await keyDown('Space'); await t.run(500);
  const sh = await j(`${S}.camp.bullets.filter(b => b.team === 'earth' && b.from === __f.id).map(b => b.rot)`);
  await keyUp('Space'); await t.run(100);
  check('Space held (a real key): shots are in the air, and they leave along the lead point, off the nose (every one more than 0.1 rad from the nose at 0)', sh.length >= 2 && sh.every(r => Math.abs(r) > 0.1), JSON.stringify(sh));
  check('the shots lead the raider: it moves toward +y, so they point to +y of the nose (a positive angle), not at where it is now', sh.length >= 2 && sh.every(r => r > 0), JSON.stringify(sh));
  await t.ev(`(() => { const u = window.__u; u.hp = 0; ${S}.camp.ships = ${S}.camp.ships.filter(x => x !== u); delete ${S}.camp.by[u.id]; return 1; })()`); await t.run(300);
  check('with nothing in the cone the ring is gone', (await j(`!${S}.camp.cockpit.aim && !(${S}.hud.aimMark && ${S}.hud.aimMark.visible)`)) === true);

  console.log('E. handing it back');
  await key('KeyC', 40);
  check('C again hands the stick back', (await j(`${S}.camp.cockpit`)) === null);
  const h1 = await view(); await t.run(100); const h2 = await view();
  check('the camera glides back to the cruiser (the distance to it shrinks) and the view goes out', h1.glide && h1.toCruiser > h2.toCruiser && h2.z < h1.z, JSON.stringify([h1, h2]));
  await t.run(900); const h3 = await view();
  check('about a second on the camera is on the cruiser (within 40 px), the view is out again, no ring, the pill is gone', !h3.glide && h3.toCruiser < 40 && h3.z < 0.5 && !h3.ring && h3.pill === 0, JSON.stringify(h3));
  check('the key row says Cockpit again', /(^|\n)C\nCOCKPIT/i.test(await keyRow()), JSON.stringify(await keyRow()));

  console.log('F. no error');
  const errs = (await j(`window.__errors || []`)).concat(t.errors || []);
  check('the game logged no error', errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nCOCKPIT BOOT PASS'), 0));
